import { NextRequest, NextResponse } from "next/server";
import { resolveYouTubeStream } from "@/lib/youtube-utils";

export async function GET(req: NextRequest) {
    const videoId = req.nextUrl.searchParams.get("v");
    const quality = req.nextUrl.searchParams.get("q") || "high";

    if (!videoId) {
        return NextResponse.json({ error: "Video ID is required" }, { status: 400 });
    }

    try {
        console.log(`[YoutubeStreamAPI] Resolving stream for: ${videoId} (Quality: ${quality})`);
        const audioUrl = await resolveYouTubeStream(videoId, quality);

        if (!audioUrl) {
            console.error(`[YoutubeStreamAPI] Resolution FAILED for: ${videoId}`);
            return NextResponse.json({
                error: "YouTube resolution failed",
                details: "All proxy instances returned errors. YouTube might be blocking requests.",
                videoId
            }, { status: 503 });
        }

        console.log(`[YoutubeStreamAPI] Resolution SUCCESS: Proxied stream starting for ${videoId}...`);

        // --- Proxy the Stream ---
        const range = req.headers.get('range');
        const proxyHeaders = new Headers();
        if (range) proxyHeaders.set('Range', range);

        // Stealth headers for the final stream fetch
        proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        proxyHeaders.set('Referer', 'https://www.youtube.com/');

        const audioResponse = await fetch(audioUrl, {
            headers: proxyHeaders,
            cache: 'no-store'
        });

        if (!audioResponse.ok && audioResponse.status !== 206) {
            console.error(`[YoutubeStreamAPI] Source stream fetch FAILED: ${audioResponse.status} for ${audioUrl}`);
            throw new Error(`Source Error: ${audioResponse.status}`);
        }

        const headers = new Headers();
        headers.set('Content-Type', audioResponse.headers.get('Content-Type') || 'audio/mpeg');
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Accept-Ranges', 'bytes');
        headers.set('X-Content-Type-Options', 'nosniff');

        const contentRange = audioResponse.headers.get('Content-Range');
        const contentLength = audioResponse.headers.get('Content-Length');
        if (contentRange) headers.set('Content-Range', contentRange);
        if (contentLength) headers.set('Content-Length', contentLength);

        return new NextResponse(audioResponse.body, {
            status: audioResponse.status,
            headers,
        });

    } catch (error: any) {
        console.error("[YoutubeStreamAPI] INTERNAL ERROR:", error);
        return NextResponse.json({ error: "Failed to resolve stream", message: error.message }, { status: 500 });
    }
}
