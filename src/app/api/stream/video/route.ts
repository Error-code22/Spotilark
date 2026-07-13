import { NextRequest } from "next/server";
import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { createHash } from "crypto";
import { spawn } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { YTDLP_PATH } from "@/lib/binary-paths";

export const dynamic = 'force-dynamic';

const videoCacheDir = join(tmpdir(), "spotilark-videos");
const COOKIE_PATH = join(tmpdir(), "spotilark-cookies", "youtube-main.txt");

function ensureCacheDirSync() {
    if (!existsSync(videoCacheDir)) mkdirSync(videoCacheDir, { recursive: true });
}

function getCachedPath(videoId: string): string {
    const hash = createHash("md5").update(videoId).digest("hex");
    return join(videoCacheDir, `${hash}.mp4`);
}

async function findCachedFile(videoId: string): Promise<string | null> {
    const files = await readdir(videoCacheDir).catch(() => []);
    const hash = createHash("md5").update(videoId).digest("hex");
    const match = files.find(f => f.startsWith(hash) && f.endsWith('.mp4'));
    return match ? join(videoCacheDir, match) : null;
}

function getCookieArgs(): string[] {
    try {
        if (existsSync(COOKIE_PATH)) return ['--cookies', COOKIE_PATH];
    } catch {}
    return [];
}

export async function GET(req: NextRequest) {
    const ip = getClientIp(req);
    const { allowed, retryAfter } = checkRateLimit(ip);
    if (!allowed) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a few minutes." }), {
            status: 429,
            headers: { "Retry-After": String(retryAfter), "Content-Type": "application/json" },
        });
    }

    const videoId = req.nextUrl.searchParams.get("id") || req.nextUrl.searchParams.get("v");
    const quality = parseInt(req.nextUrl.searchParams.get("quality") || "480", 10);

    if (!videoId) {
        return new Response(JSON.stringify({ error: "Video ID is required" }), { status: 400 });
    }

    ensureCacheDirSync();
    console.log(`[Video] Request for: ${videoId} at ${quality}p`);

    try {
        // 1. Check cache
        const cachedPath = await findCachedFile(videoId);
        if (cachedPath) {
            console.log(`[Video] Cache HIT: ${videoId}`);
            const buffer = await readFile(cachedPath);
            const totalSize = buffer.length;
            const range = req.headers.get("range");

            if (range) {
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
                const chunk = buffer.subarray(start, end + 1);
                return new Response(chunk, {
                    status: 206,
                    headers: {
                        "Content-Range": `bytes ${start}-${end}/${totalSize}`,
                        "Accept-Ranges": "bytes",
                        "Content-Length": String(chunk.length),
                        "Content-Type": "video/mp4",
                        "Cache-Control": "public, max-age=86400",
                    },
                });
            }
            return new Response(buffer, {
                headers: {
                    "Content-Type": "video/mp4",
                    "Content-Length": String(totalSize),
                    "Accept-Ranges": "bytes",
                },
            });
        }

        // 2. Stream directly from yt-dlp (Splayer pattern — spawn + pipe)
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        const args = [
            '-f', `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]/best`,
            '--extractor-args', 'youtube:player_client=web',
            '--merge-output-format', 'mp4',
            '--no-playlist', '--no-warnings', '--no-check-certificates',
            '-o', '-',
            ...getCookieArgs(),
            url,
        ];

        console.log(`[Video] Spawning yt-dlp for ${videoId}...`);
        const proc = spawn(YTDLP_PATH, args, { stdio: ['pipe', 'pipe', 'pipe'] });

        let stderrOutput = '';
        proc.stderr.on('data', (chunk: Buffer) => {
            stderrOutput += chunk.toString();
        });

        proc.on('error', (err) => {
            console.error(`[Video] yt-dlp process error: ${err.message}`);
        });

        let controllerClosed = false;

        const readable = new ReadableStream({
            start(controller) {
                proc.stdout.on('data', (chunk: Buffer) => {
                    controller.enqueue(new Uint8Array(chunk));
                });
                proc.stdout.on('end', () => {
                    if (!controllerClosed) {
                        controllerClosed = true;
                        controller.close();
                    }
                });
                proc.stdout.on('error', (err: Error) => {
                    if (!controllerClosed) {
                        controllerClosed = true;
                        controller.error(err);
                    }
                });
            },
            cancel() {
                controllerClosed = true;
                proc.kill('SIGTERM');
            }
        });

        const response = new Response(readable, {
            status: 200,
            headers: {
                'Content-Type': 'video/mp4',
                'Cache-Control': 'no-cache',
            },
        });

        proc.on('close', (code) => {
            if (code !== 0) {
                console.error(`[Video] yt-dlp exited with code ${code}: ${stderrOutput.slice(0, 500)}`);
            } else {
                console.log(`[Video] yt-dlp completed for ${videoId}`);
                backgroundCache(videoId, quality);
            }
        });

        return response;
    } catch (error: any) {
        console.error("[Video] Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

function backgroundCache(videoId: string, quality: number) {
    const cachedPath = getCachedPath(videoId);
    if (existsSync(cachedPath)) return;

    const args = [
        '-f', `best[height<=${quality}][ext=mp4]/best[height<=${quality}][ext=webm]/best[ext=mp4]/best`,
        '--no-playlist', '--no-warnings', '--no-check-certificates',
        '-o', `${cachedPath}.%(ext)s`,
        ...getCookieArgs(),
        `https://www.youtube.com/watch?v=${videoId}`,
    ];
    console.log(`[Video] Background caching ${videoId}...`);
    const proc = spawn(YTDLP_PATH, args, { stdio: 'ignore', detached: true });
    proc.unref();
    proc.on('close', async (code) => {
        if (code === 0) {
            console.log(`[Video] Background cache done: ${videoId}`);
        }
    });
}
