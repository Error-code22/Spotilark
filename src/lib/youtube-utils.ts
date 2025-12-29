import { PIPED_INSTANCES, INVIDIOUS_INSTANCES, shuffle, getStealthHeaders } from "./network-instances";
import ytdl from "@distube/ytdl-core";

export interface ResolvedStreams {
    audioUrl: string | null;
    videoUrl: string | null;
}

/**
 * Parallel Racing: Fires multiple requests at once and takes the first successful one.
 */
async function raceInstances(urls: string[], timeoutMs: number = 15000): Promise<any | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const requests = urls.map(async (url) => {
        try {
            console.log(`[YoutubeUtils] Trying: ${url}`);
            const res = await fetch(url, {
                headers: getStealthHeaders(url),
                signal: controller.signal
            });
            if (!res.ok) {
                console.log(`[YoutubeUtils] Failed ${url}: Status ${res.status}`);
                throw new Error(`Status ${res.status}`);
            }
            const data = await res.json();
            // Basic validation that it's video data
            if (data && (data.audioStreams || data.adaptiveFormats || data.title)) {
                controller.abort(); // Cancel other pending requests
                console.log(`[YoutubeUtils] SUCCESS: ${url}`);
                return { data, winner: url };
            }
            console.log(`[YoutubeUtils] Invalid response from ${url}`);
            throw new Error("Invalid response format");
        } catch (e: any) {
            console.log(`[YoutubeUtils] Error from ${url}: ${e.message}`);
            throw e;
        }
    });

    try {
        // Promise.any returns the first fulfilled promise
        const result = await Promise.any(requests);
        clearTimeout(timeout);
        return result;
    } catch (e) {
        console.error(`[YoutubeUtils] ALL INSTANCES FAILED`);
        clearTimeout(timeout);
        return null;
    }
}

export async function resolveYouTubeStreams(videoId: string, quality: string = 'high'): Promise<ResolvedStreams> {
    const streams: ResolvedStreams = { audioUrl: null, videoUrl: null };
    console.log(`[YoutubeUtils] RACING streams for ID: ${videoId} (Quality: ${quality})`);

    const pipedPool = shuffle(PIPED_INSTANCES);
    const invidPool = shuffle(INVIDIOUS_INSTANCES);

    // Filter Logic based on quality
    const sortBitrate = (a: any, b: any) => {
        const rateA = a.bitrate || parseInt(a.bitrate) || 0;
        const rateB = b.bitrate || parseInt(b.bitrate) || 0;
        return quality === 'low' ? rateA - rateB : rateB - rateA;
    };

    // --- 1. Race Piped Instances ---
    const pipedWinner = await raceInstances(
        pipedPool.slice(0, 10).map(instance => `${instance}/streams/${videoId}`),
        15000
    );

    if (pipedWinner) {
        const { data, winner } = pipedWinner;
        console.log(`[YoutubeUtils] Piped Race Winner: ${winner}`);
        const audioStreams = [...(data.audioStreams || [])].sort(sortBitrate);
        streams.audioUrl = audioStreams[0]?.url || null;

        const videoStreams = [...(data.videoStreams || [])].sort(sortBitrate);
        streams.videoUrl = videoStreams[0]?.url || null;
        if (streams.audioUrl || streams.videoUrl) return streams;
    }

    // --- 2. Fallback: Race Invidious ---
    const invidWinner = await raceInstances(
        invidPool.map(instance => `${instance}/api/v1/videos/${videoId}`),
        15000
    );

    if (invidWinner) {
        const { data } = invidWinner;
        const formats = data.adaptiveFormats || [];
        const audioFormats = formats.filter((f: any) => f.type.startsWith('audio/')).sort(sortBitrate);
        streams.audioUrl = audioFormats[0]?.url || null;

        const videoFormats = formats.filter((f: any) => f.type.startsWith('video/')).sort(sortBitrate);
        streams.videoUrl = videoFormats[0]?.url || null;
        if (streams.audioUrl || streams.videoUrl) return streams;
    }

    // --- 3. FINAL FALLBACK: ytdl-core ---
    try {
        const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly').sort((a, b) => {
            const bitA = a.audioBitrate || 0;
            const bitB = b.audioBitrate || 0;
            return quality === 'low' ? bitA - bitB : bitB - bitA;
        });
        if (audioFormats.length > 0) streams.audioUrl = audioFormats[0].url;

        const videoFormats = ytdl.filterFormats(info.formats, 'videoonly').sort((a, b) => {
            const bitA = a.bitrate || 0;
            const bitB = b.bitrate || 0;
            return quality === 'low' ? bitA - bitB : bitB - bitA;
        });
        if (videoFormats.length > 0) streams.videoUrl = videoFormats[0].url;

        if (streams.audioUrl || streams.videoUrl) return streams;
    } catch (e: any) {
        console.error(`[YoutubeUtils] ytdl-core FAILED: ${e.message}`);
    }

    return streams;
}

// Keep backward compatibility
export async function resolveYouTubeStream(videoId: string, quality: string = 'high'): Promise<string | null> {
    const res = await resolveYouTubeStreams(videoId, quality);
    return res.audioUrl;
}
