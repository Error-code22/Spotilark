import { NextRequest, NextResponse } from "next/server";
import { PIPED_INSTANCES, INVIDIOUS_INSTANCES, shuffle, getStealthHeaders } from "@/lib/network-instances";
import yts from 'yt-search';

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
async function raceSearchDeep(urls: string[], timeoutMs: number = 10000): Promise<any | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const requests = urls.map(async (url, index) => {
        try {
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

    console.log(`[SearchRemote] DEEP SEARCH for: ${query}`);

    try {
        // --- 1. Primary: yt-search (Scraper) ---
        try {
            console.log(`[SearchRemote] Attempting yt-search scraper...`);
            const r = await yts(query);
            const videos = r.videos || [];

            if (videos.length > 0) {
                console.log(`[SearchRemote] Scraper SUCCESS: found ${videos.length} results`);
                const tracks = videos.map(v => ({
                    id: `yt-${v.videoId}`,
                    remoteId: v.videoId,
                    title: v.title,
                    artist: v.author.name,
                    album: "YouTube",
                    cover: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
                    duration: v.seconds,
                    source: 'youtube',
                    storage_type: 'stream',
                    source_url: `/api/stream/youtube?v=${v.videoId}`
                }));
                return NextResponse.json(tracks.slice(0, 30));
            }
        } catch (scraperError: any) {
            console.error(`[SearchRemote] Scraper FAILED: ${scraperError.message}`);
        }

        // --- 2. Fallback: Piped (Batch of 8) ---
        console.log(`[SearchRemote] Scraper failed or empty. Falling back to Piped racing...`);
        const pipedPool = shuffle(PIPED_INSTANCES);
        const pipedResult = await raceSearchDeep(
            pipedPool.slice(0, 8).map(instance => `${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`)
        );

        if (pipedResult) {
            const { items, winner } = pipedResult;
            console.log(`[SearchRemote] Piped Winner: ${winner}`);
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
                    storage_type: 'stream',
                    source_url: vid ? `/api/stream/youtube?v=${vid}` : null
                };
            }).filter((t: any) => t.remoteId && t.title);

            if (tracks.length > 0) return NextResponse.json(tracks.slice(0, 20));
        }

        // --- 3. Final Fallback: Invidious ---
        console.log(`[SearchRemote] Piped failed. Racing Invidious...`);
        const invidPool = shuffle(INVIDIOUS_INSTANCES);
        const invidResult = await raceSearchDeep(
            invidPool.map(instance => `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`)
        );

        if (invidResult) {
            const { items, winner } = invidResult;
            console.log(`[SearchRemote] Invidious Winner: ${winner}`);
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
                storage_type: 'stream',
                source_url: `/api/stream/youtube?v=${item.videoId}`
            })).filter((t: any) => t.remoteId && t.title);

            if (tracks.length > 0) return NextResponse.json(tracks.slice(0, 20));
        }

        return NextResponse.json({
            error: "All search methods exhausted. YouTube search is currently restricted.",
            suggestion: "Try again in a few minutes or use local library uploads."
        }, { status: 503 });

    } catch (error: any) {
        console.error("Remote Search Error:", error);
        return NextResponse.json({ error: "Remote search failed" }, { status: 500 });
    }
}
