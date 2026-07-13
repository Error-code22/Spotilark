import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { YTDLP_PATH } from "@/lib/binary-paths";

export const dynamic = 'force-dynamic';

interface VideoResult {
    id: string;
    title: string;
    thumbnail: string;
    duration: string;
    channel: string;
}

export async function GET(req: NextRequest) {
    const query = req.nextUrl.searchParams.get("q");

    if (!query) {
        return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }

    try {
        console.log(`[VideoSearch] Searching for: ${query}`);
        const output = execSync(`"${YTDLP_PATH}" "ytsearch10:${query}" --flat-playlist --dump-json --no-warnings`, {
            timeout: 30000,
            stdio: "pipe",
            encoding: "utf-8",
        });

        const lines = output.trim().split("\n").filter(Boolean);
        const results: VideoResult[] = [];

        for (const line of lines) {
            try {
                const data = JSON.parse(line);
                results.push({
                    id: data.id || data.url || "",
                    title: data.title || "Unknown",
                    thumbnail: data.thumbnail || data.thumbnails?.[0]?.url || "",
                    duration: (() => {
                        const secs = data.duration || 0;
                        const m = Math.floor(secs / 60);
                        const s = Math.floor(secs % 60);
                        return `${m}:${s.toString().padStart(2, '0')}`;
                    })(),
                    channel: data.channel || data.uploader || "Unknown",
                });
            } catch {
                // Skip malformed lines
            }
        }

        return NextResponse.json({ results });
    } catch (error: any) {
        console.error("[VideoSearch] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
