import { NextRequest } from "next/server";
import { access, readdir, readFile, writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { createHash } from "crypto";
import { execFile, spawn } from "child_process";
import { promisify } from "util";
import { existsSync, mkdirSync } from "fs";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { YTDLP_PATH, FFMPEG_PATH } from "@/lib/binary-paths";

const execFileAsync = promisify(execFile);
const streamCacheDir = join(tmpdir(), "spotilark-streams");
const COOKIE_PATH = join(tmpdir(), "spotilark-cookies", "youtube-main.txt");

function ensureCacheDirSync() {
    if (!existsSync(streamCacheDir)) mkdirSync(streamCacheDir, { recursive: true });
}

function getCachedPath(videoId: string): string {
    const hash = createHash('md5').update(videoId).digest('hex');
    return join(streamCacheDir, `${hash}`);
}

function getMimeForExt(ext: string): string {
    return { '.webm': 'audio/webm', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg' }[ext] || 'audio/mpeg';
}

async function findCachedFile(videoId: string): Promise<{ path: string; mime: string } | null> {
    const files = await readdir(streamCacheDir).catch(() => []);
    const hash = createHash('md5').update(videoId).digest('hex');
    for (const ext of ['.webm', '.mp3', '.m4a', '.ogg']) {
        const match = files.find(f => f.startsWith(hash) && f.endsWith(ext));
        if (match) return { path: join(streamCacheDir, match), mime: getMimeForExt(ext) };
    }
    return null;
}

function getCookieArgs(): string[] {
    try {
        if (existsSync(COOKIE_PATH)) return ['--cookies', COOKIE_PATH];
    } catch {}
    return [];
}

async function resolveStreamUrl(videoId: string): Promise<string | null> {
    const args = [
        '-f', 'bestaudio[ext=m4a]/bestaudio[acodec*=mp4a]/bestaudio',
        '--extractor-args', 'youtube:player_client=web',
        '--get-url', '--no-playlist', '--no-warnings', '--no-check-certificates',
        ...getCookieArgs(),
        `https://www.youtube.com/watch?v=${videoId}`,
    ];
    try {
        console.log(`[Stream] Running yt-dlp for ${videoId}...`);
        const { stdout, stderr } = await execFileAsync(YTDLP_PATH, args, { timeout: 30000, maxBuffer: 10 * 1024 * 1024 });
        const url = stdout.trim();
        if (!url) {
            console.error(`[Stream] yt-dlp returned empty URL for ${videoId}`);
            return null;
        }
        console.log(`[Stream] yt-dlp resolved URL for ${videoId} (${url.length} chars)`);
        return url;
    } catch (e: any) {
        const errMsg = e.stderr?.toString()?.slice(0, 300) || e.message?.slice(0, 300);
        console.error(`[Stream] yt-dlp FAILED for ${videoId}:`, errMsg);
        return null;
    }
}

function backgroundCache(videoId: string) {
    const outputPath = join(streamCacheDir, `dl-${videoId}`);
    const args = [
        '-x', '--audio-format', 'mp3', '--audio-quality', '5',
        '--ffmpeg-location', FFMPEG_PATH,
        '--no-playlist', '--no-warnings', '--no-check-certificates',
        '-o', `${outputPath}.%(ext)s`,
        ...getCookieArgs(),
        `https://www.youtube.com/watch?v=${videoId}`,
    ];
    console.log(`[Stream] Background caching ${videoId}...`);
    const proc = spawn(YTDLP_PATH, args, { stdio: 'ignore', detached: true });
    proc.unref();
    proc.on('close', async (code) => {
        if (code === 0) {
            try {
                const files = await readdir(streamCacheDir);
                const dlFile = files.find(f => f.startsWith(`dl-${videoId}`) && !f.endsWith('.part'));
                if (dlFile) {
                    const ext = dlFile.substring(dlFile.lastIndexOf('.'));
                    const buffer = await readFile(join(streamCacheDir, dlFile));
                    await writeFile(getCachedPath(videoId) + ext, buffer);
                    await unlink(join(streamCacheDir, dlFile));
                    console.log(`[Stream] Background cache done: ${videoId} (${buffer.length} bytes)`);
                }
            } catch (e: any) {
                console.error(`[Stream] Background cache rename failed: ${e.message}`);
            }
        }
    });
}

export async function GET(req: NextRequest) {
    const ip = getClientIp(req);
    const { allowed, retryAfter } = checkRateLimit(ip);
    if (!allowed) {
        console.log(`[Stream] Rate limited for ${ip}, retry in ${retryAfter}s`);
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a few minutes." }), {
            status: 429,
            headers: { "Retry-After": String(retryAfter), "Content-Type": "application/json" },
        });
    }

    const videoId = req.nextUrl.searchParams.get("v");
    if (!videoId) {
        return new Response(JSON.stringify({ error: "Video ID is required" }), { status: 400 });
    }

    ensureCacheDirSync();
    console.log(`[Stream] Request for video: ${videoId}`);

    try {
        // 1. Check cache
        const cached = await findCachedFile(videoId);
        if (cached) {
            console.log(`[Stream] Cache HIT: ${videoId} (${cached.mime})`);
            const buffer = await readFile(cached.path);
            return new Response(buffer, {
                headers: { 'Content-Type': cached.mime, 'Cache-Control': 'public, max-age=86400', 'Accept-Ranges': 'bytes' },
            });
        }

        // 2. Resolve CDN URL and proxy it
        console.log(`[Stream] Resolving stream URL for ${videoId}...`);
        const cdnUrl = await resolveStreamUrl(videoId);

        if (!cdnUrl) {
            console.error(`[Stream] Failed to resolve URL for ${videoId}`);
            return new Response(JSON.stringify({ error: "Could not resolve stream URL" }), { status: 503 });
        }

        console.log(`[Stream] CDN URL resolved, proxying...`);
        const audioResponse = await fetch(cdnUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.youtube.com/',
            },
        });

        if (!audioResponse.ok) {
            console.error(`[Stream] CDN fetch failed: ${audioResponse.status} ${audioResponse.statusText}`);
            return new Response(JSON.stringify({ error: `CDN fetch failed: ${audioResponse.status}` }), { status: 502 });
        }

        if (!audioResponse.body) {
            console.error(`[Stream] CDN response has no body`);
            return new Response(JSON.stringify({ error: "Empty response from CDN" }), { status: 502 });
        }

        const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg';
        console.log(`[Stream] Proxying ${contentType} for ${videoId}`);

        // Cache in background (non-blocking)
        backgroundCache(videoId);

        return new Response(audioResponse.body, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error: any) {
        console.error("[Stream] Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
