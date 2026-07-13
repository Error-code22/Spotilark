import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
import { readdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { spawn, execFile } from "child_process";
import { promisify } from "util";
import { existsSync, mkdirSync } from "fs";
import { YTDLP_PATH, FFMPEG_PATH } from "@/lib/binary-paths";

export const dynamic = 'force-dynamic';

const execFileAsync = promisify(execFile);
const COOKIE_PATH = join(homedir(), "AppData", "Local", "Temp", "spotilark-cookies", "youtube-main.txt");

const downloadDir = join(homedir(), "Music", "Spotilark-Music");

function ensureDownloadDir() {
    if (!existsSync(downloadDir)) mkdirSync(downloadDir, { recursive: true });
}

function getCookieArgs(): string[] {
    try {
        if (existsSync(COOKIE_PATH)) return ['--cookies', COOKIE_PATH];
    } catch {}
    return [];
}

interface DownloadTask {
    id: string;
    url: string;
    format: "audio" | "video";
    status: "queued" | "downloading" | "uploading" | "completed" | "failed";
    progress: number;
    title?: string;
    thumbnail?: string;
    error?: string;
    trackId?: string;
}

const downloadTasks = new Map<string, DownloadTask>();

export async function POST(req: NextRequest) {
    try {
        const { url, format = "audio" } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        const videoIdMatch = url.match(
            /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
        );
        if (!videoIdMatch) {
            return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
        }

        const taskId = `dl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const task: DownloadTask = { id: taskId, url, format, status: "queued", progress: 0 };
        downloadTasks.set(taskId, task);

        processDownload(taskId).catch((err) => {
            console.error(`[Download] Task ${taskId} failed:`, err);
            const t = downloadTasks.get(taskId);
            if (t) { t.status = "failed"; t.error = err.message || "Download failed"; }
        });

        return NextResponse.json({ taskId, status: "queued" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to start download" }, { status: 500 });
    }
}

async function processDownload(taskId: string) {
    const task = downloadTasks.get(taskId);
    if (!task) return;

    ensureDownloadDir();
    task.status = "downloading";
    task.progress = 5;

    const isAudio = task.format === "audio";
    const videoIdMatch = task.url.match(/(?:watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    const videoId = videoIdMatch?.[1] || "unknown";
    const outputPath = join(downloadDir, `${videoId}`);

    // Step 1: Get metadata
    try {
        const cookieArgs = getCookieArgs();
        const metaResult = await execFileAsync(YTDLP_PATH, [
            '--dump-json', '--skip-download', '--no-warnings', '--no-check-certificates',
            ...cookieArgs, task.url
        ], { timeout: 30000, maxBuffer: 10 * 1024 * 1024 });

        const metadata = JSON.parse(metaResult.stdout);
        task.title = metadata.title || "Untitled";
        task.thumbnail = metadata.thumbnail || null;
        task.progress = 15;
    } catch (e: any) {
        console.error(`[Download] Metadata fetch failed: ${e.message?.slice(0, 200)}`);
        task.title = "Untitled";
    }

    // Step 2: Download
    const cookieArgs = getCookieArgs();
    let ytdlpArgs: string[];

    if (isAudio) {
        ytdlpArgs = [
            '-x', '--audio-format', 'mp3', '--audio-quality', '0',
            '--embed-thumbnail',
            '--extractor-args', 'youtube:player_client=web',
            '--ffmpeg-location', FFMPEG_PATH,
            '-o', `${outputPath}.%(ext)s`,
            '--no-playlist', '--no-warnings', '--no-check-certificates',
            '--newline',
            ...cookieArgs,
            task.url,
        ];
    } else {
        ytdlpArgs = [
            '-f', 'bestvideo[height<=720]+bestaudio/best[height<=720]/best',
            '--merge-output-format', 'mp4',
            '--extractor-args', 'youtube:player_client=web',
            '--embed-thumbnail',
            '--ffmpeg-location', FFMPEG_PATH,
            '-o', `${outputPath}.%(ext)s`,
            '--no-playlist', '--no-warnings', '--no-check-certificates',
            '--newline',
            ...cookieArgs,
            task.url,
        ];
    }

    console.log(`[Download] Starting ${isAudio ? 'audio' : 'video'} download for ${videoId}...`);

    await new Promise<void>((resolve, reject) => {
        const proc = spawn(YTDLP_PATH, ytdlpArgs, { stdio: ['pipe', 'pipe', 'pipe'] });

        proc.stdout.on('data', (data: Buffer) => {
            const line = data.toString();
            const pctMatch = line.match(/(\d+\.?\d*)%/);
            if (pctMatch) {
                const pct = parseFloat(pctMatch[1]);
                task.progress = Math.min(15 + Math.floor(pct * 0.7), 85);
            }
        });

        let stderrData = '';
        proc.stderr.on('data', (data: Buffer) => { stderrData += data.toString(); });

        proc.on('close', (code) => {
            if (code === 0) {
                task.progress = 85;
                resolve();
            } else {
                console.error(`[Download] yt-dlp exited ${code}: ${stderrData.slice(0, 500)}`);
                reject(new Error(`yt-dlp failed (exit ${code}): ${stderrData.slice(0, 200)}`));
            }
        });

        proc.on('error', (err) => {
            console.error(`[Download] spawn error: ${err.message}`);
            reject(new Error(`yt-dlp spawn failed: ${err.message}`));
        });
    });

    // Step 3: Find downloaded file
    const ext = isAudio ? "mp3" : "mp4";
    let filePath = `${outputPath}.${ext}`;

    if (!existsSync(filePath)) {
        const files = await readdir(downloadDir).catch(() => []);
        const match = files.find(f => f.startsWith(videoId) && (f.endsWith('.mp3') || f.endsWith('.m4a') || f.endsWith('.webm') || f.endsWith('.mp4')));
        if (match) {
            filePath = join(downloadDir, match);
        } else {
            throw new Error("Download completed but output file not found");
        }
    }

    console.log(`[Download] File ready: ${filePath}`);
    task.status = "completed";
    task.progress = 100;
}

export async function GET(req: NextRequest) {
    const taskId = req.nextUrl.searchParams.get("taskId");

    if (taskId) {
        const task = downloadTasks.get(taskId);
        if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
        return NextResponse.json(task);
    }

    const tasks = Array.from(downloadTasks.values()).sort(
        (a, b) => new Date(b.id.split("-")[1]).getTime() - new Date(a.id.split("-")[1]).getTime()
    );
    return NextResponse.json({ tasks });
}
