import { PIPED_INSTANCES, INVIDIOUS_INSTANCES, shuffle, getStealthHeaders } from "./network-instances";
let ytdl: any;
if (typeof window === "undefined") {
    ytdl = require("@distube/ytdl-core");
}

export interface ResolvedStreams {
    audioUrl: string | null;
    videoUrl: string | null;
}

import { Capacitor } from "@capacitor/core";
import { CapacitorHttp } from "@capacitor/core";

/**
 * Parallel Racing: Fires multiple requests at once and takes the first successful one.
 */
async function raceInstances(urls: string[], timeoutMs: number = 15000): Promise<any | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const requests = urls.map(async (url) => {
        try {
            console.log(`[YoutubeUtils] Trying: ${url}`);
            
            let data;
            
            if (Capacitor.isNativePlatform()) {
                // Native: Use CapacitorHttp to bypass CORS
                const response = await CapacitorHttp.get({
                    url: url,
                    headers: getStealthHeaders(url)
                });
                
                if (response.status !== 200) {
                     console.log(`[YoutubeUtils] Failed ${url}: Status ${response.status}`);
                     throw new Error(`Status ${response.status}`);
                }
                data = response.data;
            } else {
                // Web: Use standard Fetch
                const res = await fetch(url, {
                    headers: getStealthHeaders(url),
                    signal: controller.signal
                });
                if (!res.ok) {
                    console.log(`[YoutubeUtils] Failed ${url}: Status ${res.status}`);
                    throw new Error(`Status ${res.status}`);
                }
                data = await res.json();
            }

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

// Custom request options for ytdl-core to bypass bot detection
const YT_REQUEST_OPTS = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'CONSENT=PENDING+999;' // Basic cookie to bypass some consent screens
    }
};

export async function resolveYouTubeStreams(videoId: string, quality: string = 'high'): Promise<ResolvedStreams> {
    const streams: ResolvedStreams = { audioUrl: null, videoUrl: null };
    console.log(`[YoutubeUtils] RESOLVING streams for ID: ${videoId} (Quality: ${quality})`);

    // --- 1. PRIMARY: ytdl-core (Server-side ONLY) ---
    if (typeof window === "undefined" && ytdl) {
        try {
            console.log(`[YoutubeUtils] Attempting ytdl-core first...`);
            const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`, {
                requestOptions: YT_REQUEST_OPTS
            });

        console.log(`[YoutubeUtils] ytdl-core info fetched successfully for: ${info.videoDetails.title}`);

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

        if (streams.audioUrl || streams.videoUrl) {
            console.log(`[YoutubeUtils] ytdl-core SUCCESS`);
            return streams;
        }
        } catch (e: any) {
            console.error(`[YoutubeUtils] ytdl-core primary attempt failed: ${e.message}`);
        }
    } else {
        console.log(`[YoutubeUtils] Skipping ytdl-core (Client-side environment)`);
    }

    // --- 2. FALLBACK: Race Piped Instances (Aggressive 5s timeout) ---
    console.log(`[YoutubeUtils] Falling back to Piped racing...`);
    const pipedPool = shuffle(PIPED_INSTANCES);
    const pipedWinner = await raceInstances(
        pipedPool.slice(0, 5).map(instance => `${instance}/streams/${videoId}`),
        5000
    );

    const sortBitrate = (a: any, b: any) => {
        const rateA = a.bitrate || parseInt(a.bitrate) || 0;
        const rateB = b.bitrate || parseInt(b.bitrate) || 0;
        return quality === 'low' ? rateA - rateB : rateB - rateA;
    };

    if (pipedWinner) {
        const { data, winner } = pipedWinner;
        console.log(`[YoutubeUtils] Piped Race Winner: ${winner}`);
        const audioStreams = [...(data.audioStreams || [])].sort(sortBitrate);
        streams.audioUrl = audioStreams[0]?.url || null;

        const videoStreams = [...(data.videoStreams || [])].sort(sortBitrate);
        streams.videoUrl = videoStreams[0]?.url || null;
        if (streams.audioUrl || streams.videoUrl) return streams;
    }

    // --- 3. FALLBACK: Race Invidious (Aggressive 5s timeout) ---
    console.log(`[YoutubeUtils] Falling back to Invidious racing...`);
    const invidPool = shuffle(INVIDIOUS_INSTANCES);
    const invidWinner = await raceInstances(
        invidPool.slice(0, 3).map(instance => `${instance}/api/v1/videos/${videoId}`),
        5000
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

    return streams;
}

// Keep backward compatibility
export async function resolveYouTubeStream(videoId: string, quality: string = 'high'): Promise<string | null> {
    const res = await resolveYouTubeStreams(videoId, quality);
    return res.audioUrl;
}
