import { NextRequest, NextResponse } from "next/server";
import { PIPED_INSTANCES, INVIDIOUS_INSTANCES, shuffle, getStealthHeaders } from "@/lib/network-instances";

// Helper for robust Video ID extraction
function extractVideoId(url: string): string | null {
    if (!url) return null;
    try {
        if (url.includes('v=')) {
            const parts = url.split('v=')[1];
            return parts.split('&')[0];
        }
        if (url.includes('vi/')) return url.split('vi/')[1].split('/')[0];
        if (url.includes('be/')) return url.split('be/')[1].split('?')[0];
        return url.split('/').pop()?.split('?')[0] || null;
    } catch (e) {
        return null;
    }
}

/**
 * Deep Racing: Fires more requests with alternating headers.
 */
async function raceSearchDeep(urls: string[], timeoutMs: number = 15000): Promise<any | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const requests = urls.map(async (url, index) => {
        try {
            // Alternate headers to find what the server likes
            const headerType = index % 2 === 0 ? 'mobile' : 'desktop';
            const res = await fetch(url, {
                headers: getStealthHeaders(url, headerType),
                signal: controller.signal
            });
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();

            const items = data.items || (Array.isArray(data) ? data : null);
            if (items && items.length > 0) {
                controller.abort();
                return { items, winner: url, type: headerType };
            }
            throw new Error("No items");
        } catch (e) {
            throw e;
        }
    });

    try {
        const result = await Promise.any(requests);
        clearTimeout(timeout);
        return result;
    } catch (e) {
        clearTimeout(timeout);
        return null;
    }
}

export async function GET(req: NextRequest) {
    const query = req.nextUrl.searchParams.get("q");

    if (!query) {
        return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    console.log(`[SearchRemote] DEEP RACING global search for: ${query}`);
    const pipedPool = shuffle(PIPED_INSTANCES);
    const invidPool = shuffle(INVIDIOUS_INSTANCES);

    try {
        // --- 1. Deep Race Piped (Batch of 12 for better coverage) ---
        const pipedResult = await raceSearchDeep(
            pipedPool.slice(0, 12).map(instance => `${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`)
        );

        if (pipedResult) {
            const { items, winner, type } = pipedResult;
            console.log(`[SearchRemote] Piped Winner: ${winner} (${type})`);
            const tracks = items.map((item: any) => {
                const vid = extractVideoId(item.url);
                return {
                    id: `yt-${vid}`,
                    remoteId: vid,
                    title: item.title,
                    artist: item.uploaderName || "Unknown Artist",
                    album: "YouTube",
                    cover: item.thumbnail || (vid ? `https://i.ytimg.com/vi/${vid}/mqdefault.jpg` : null),
                    source: 'youtube',
                    source_url: vid ? `/api/stream/youtube?v=${vid}` : null
                };
            }).filter((t: any) => t.remoteId && t.title);

            if (tracks.length > 0) return NextResponse.json(tracks.slice(0, 20));
        }

        // --- 2. Fallback: Deep Race Invidious (All 6 instances) ---
        console.log(`[SearchRemote] Piped deep race failed. Racing Invidious...`);
        const invidResult = await raceSearchDeep(
            invidPool.map(instance => `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`)
        );

        if (invidResult) {
            const { items, winner, type } = invidResult;
            console.log(`[SearchRemote] Invidious Winner: ${winner} (${type})`);
            const tracks = items.map((item: any) => ({
                id: `yt-${item.videoId}`,
                remoteId: item.videoId,
                title: item.title,
                artist: item.author,
                album: "YouTube",
                cover: item.videoThumbnails?.find((t: any) => t.quality === "medium")?.url ||
                    item.videoThumbnails?.[0]?.url ||
                    `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`,
                source: 'youtube',
                source_url: `/api/stream/youtube?v=${item.videoId}`
            })).filter((t: any) => t.remoteId && t.title);

            if (tracks.length > 0) return NextResponse.json(tracks.slice(0, 20));
        }

        // Note: Direct YouTube search fallback is not implemented due to reliability issues
        // with available libraries in Next.js server environment. Users can:
        // 1. Try searching again (instances rotate randomly)
        // 2. Use local library uploads instead
        // 3. Wait for Piped/Invidious instances to recover

        console.log(`[SearchRemote] All search methods exhausted for query: ${query}`);
        return NextResponse.json({
            error: "YouTube search is temporarily unavailable due to proxy limitations. Please try again later or use local uploads.",
            suggestion: "Upload tracks directly to your library for reliable playback"
        }, { status: 503 });

    } catch (error: any) {
        console.error("Remote Search Error:", error);
        return NextResponse.json({ error: "Remote search failed" }, { status: 500 });
    }
}
