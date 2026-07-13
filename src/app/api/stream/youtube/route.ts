import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
import { resolveYouTubeStream } from "@/lib/youtube-utils";

export async function GET(req: NextRequest) {
    const videoId = req.nextUrl.searchParams.get("v");
    const quality = req.nextUrl.searchParams.get("q") || "low";
    const redirect = req.nextUrl.searchParams.get("redirect") === "true";

    if (!videoId) {
        return NextResponse.json({ error: "Video ID is required" }, { status: 400 });
    }

    try {
        console.log(`[Stream] Resolving: ${videoId} (Quality: ${quality}, Redirect: ${redirect})`);
        const audioUrl = await resolveYouTubeStream(videoId, quality);

        if (!audioUrl) {
            console.error(`[Stream] Resolution FAILED: ${videoId}`);
            return NextResponse.json({
                error: "YouTube resolution failed",
                details: "All proxy instances returned errors.",
                videoId
            }, { status: 503 });
        }

        // Return CDN URL as JSON (client plays directly)
        if (redirect) {
            console.log(`[Stream] Returning CDN URL for ${videoId}`);
            return NextResponse.json({ url: audioUrl });
        }

        // Proxy mode: Stream through server (fallback for compatibility)
        console.log(`[Stream] Proxying stream for ${videoId}`);
        const range = req.headers.get('range');
        const proxyHeaders = new Headers();
        if (range) proxyHeaders.set('Range', range);
        proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        proxyHeaders.set('Referer', 'https://www.youtube.com/');

        const audioResponse = await fetch(audioUrl, {
            headers: proxyHeaders,
            cache: 'no-store'
        });

        if (!audioResponse.ok && audioResponse.status !== 206) {
            throw new Error(`Source Error: ${audioResponse.status}`);
        }

        const headers = new Headers();
        headers.set('Content-Type', audioResponse.headers.get('Content-Type') || 'audio/mpeg');
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Accept-Ranges', 'bytes');

        const contentRange = audioResponse.headers.get('Content-Range');
        const contentLength = audioResponse.headers.get('Content-Length');
        if (contentRange) headers.set('Content-Range', contentRange);
        if (contentLength) headers.set('Content-Length', contentLength);

        return new NextResponse(audioResponse.body, {
            status: audioResponse.status,
            headers,
        });

    } catch (error: any) {
        console.error("[Stream] ERROR:", error);
        return NextResponse.json({ error: "Failed to resolve stream", message: error.message }, { status: 500 });
    }
}
