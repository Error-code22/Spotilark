import { PIPED_INSTANCES, INVIDIOUS_INSTANCES, COBALT_INSTANCES, shuffle, getStealthHeaders } from "./network-instances";
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
async function raceInstances(urls: string[], timeoutMs: number = 10000): Promise<any | null> {
    const controller = new AbortController();

    // Per-request timeout to avoid one slow instance hanging the race
    const fetchWithTimeout = async (url: string) => {
        const innerController = new AbortController();
        const id = setTimeout(() => innerController.abort(), 7000); // 7s per request

        try {
            console.log(`[YoutubeUtils] Trying: ${url}`);
            let data;

            if (Capacitor.isNativePlatform()) {
                const response = await CapacitorHttp.get({
                    url: url,
                    headers: getStealthHeaders(url)
                });

                if (response.status !== 200) throw new Error(`Status ${response.status}`);
                data = response.data;
            } else {
                const res = await fetch(url, {
                    headers: getStealthHeaders(url),
                    signal: innerController.signal
                });
                if (!res.ok) throw new Error(`Status ${res.status}`);
                data = await res.json();
            }

            if (data && (data.audioStreams || data.adaptiveFormats || data.title)) {
                clearTimeout(id);
                // We don't abort the global controller here yet, Promise.any will handle it
                return { data, winner: url };
            }
            throw new Error("Invalid response format");
        } catch (e: any) {
            clearTimeout(id);
            // Silent error for the race, but log it
            if (e.name === 'AbortError') {
                console.log(`[YoutubeUtils] Timeout from ${url}`);
            } else {
                console.log(`[YoutubeUtils] Error from ${url}: ${e.message}`);
            }
            throw e;
        }
    };

    const requests = urls.map(url => fetchWithTimeout(url));

    try {
        // Promise.any returns the first FULFILLED promise.
        // If all reject, it throws an AggregateError.
        const result = await Promise.any(requests);
        return result;
    } catch (e) {
        console.error(`[YoutubeUtils] ALL INSTANCES FAILED (or timed out)`);
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

export async function resolveYouTubeStreams(videoId: string, quality: string = 'low'): Promise<ResolvedStreams> {
    const streams: ResolvedStreams = { audioUrl: null, videoUrl: null };
    console.log(`[YoutubeUtils] RESOLVING streams for ID: ${videoId} (Quality: ${quality})`);

    const sortBitrate = (a: any, b: any) => {
        const rateA = a.bitrate || parseInt(a.bitrate) || 0;
        const rateB = b.bitrate || parseInt(b.bitrate) || 0;
        return quality === 'low' ? rateA - rateB : rateB - rateA;
    };

    // --- 1. PRIMARY: Race Piped Instances ---
    // Piped is generally more reliable for server-side fetches as they proxy the streams
    console.log(`[YoutubeUtils] Primary attempt: Piped racing...`);
    const pipedPool = shuffle(PIPED_INSTANCES);
    const pipedWinner = await raceInstances(
        pipedPool.slice(0, 10).map(instance => `${instance}/api/v1/videos/${videoId}`),
        7000
    );

    if (pipedWinner) {
        const { data, winner } = pipedWinner;
        console.log(`[YoutubeUtils] Piped Race Winner: ${winner}`);
        const audioFormats = (data.audioStreams || []).sort(sortBitrate);
        streams.audioUrl = audioFormats[0]?.url || null;

        const videoFormats = (data.videoStreams || []).sort(sortBitrate);
        streams.videoUrl = videoFormats[0]?.url || null;
        if (streams.audioUrl || streams.videoUrl) {
            console.log(`[YoutubeUtils] ✓ Piped resolution SUCCESS`);
            return streams;
        }
    }

    // --- 2. FALLBACK: ytdl-core (Server-side ONLY) ---
    if (typeof window === "undefined" && ytdl) {
        try {
            console.log(`[YoutubeUtils] Fallback: ytdl-core...`);
            const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`, {
                requestOptions: YT_REQUEST_OPTS
            });

            const audioFormats = ytdl.filterFormats(info.formats, 'audioonly').sort((a: any, b: any) => {
                const bitA = a.audioBitrate || 0;
                const bitB = b.audioBitrate || 0;
                return quality === 'low' ? bitA - bitB : bitB - bitA;
            });
            if (audioFormats.length > 0) streams.audioUrl = audioFormats[0].url;

            const videoFormats = ytdl.filterFormats(info.formats, 'videoonly').sort((a: any, b: any) => {
                const bitA = a.bitrate || 0;
                const bitB = b.bitrate || 0;
                return quality === 'low' ? bitA - bitB : bitB - bitA;
            });
            if (videoFormats.length > 0) streams.videoUrl = videoFormats[0].url;

            if (streams.audioUrl || streams.videoUrl) {
                console.log(`[YoutubeUtils] ✓ ytdl-core SUCCESS`);
                return streams;
            }
        } catch (e: any) {
            console.log(`[YoutubeUtils] ytdl-core fallback failed: ${e.message}`);
        }
    }

    // --- 3. FALLBACK: Race Invidious ---
    console.log(`[YoutubeUtils] Falling back to Invidious racing...`);
    const invidPool = shuffle(INVIDIOUS_INSTANCES);
    const invidWinner = await raceInstances(
        invidPool.slice(0, 6).map(instance => `${instance}/api/v1/videos/${videoId}`),
        7000
    );

    if (invidWinner) {
        const { data } = invidWinner;
        const formats = data.adaptiveFormats || [];
        const audioFormats = formats.filter((f: any) => f.type.startsWith('audio/')).sort(sortBitrate);
        streams.audioUrl = audioFormats[0]?.url || null;

        const videoFormats = formats.filter((f: any) => f.type.startsWith('video/')).sort(sortBitrate);
        streams.videoUrl = videoFormats[0]?.url || null;
        if (streams.audioUrl || streams.videoUrl) {
            console.log(`[YoutubeUtils] ✓ Invidious resolution SUCCESS`);
            return streams;
        }
    }

    // --- 4. FINAL FALLBACK: Cobalt API ---
    console.log(`[YoutubeUtils] Falling back to Cobalt API...`);
    const cobaltPool = shuffle(COBALT_INSTANCES);
    for (const instance of cobaltPool.slice(0, 3)) {
        try {
            const cobaltRequest = {
                url: `https://www.youtube.com/watch?v=${videoId}`,
                downloadMode: "audio",
                filenameStyle: "basic",
                audioFormat: "mp3"
            };

            let response;
            if (Capacitor.isNativePlatform()) {
                response = await CapacitorHttp.post({
                    url: `${instance}/`,
                    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                    data: cobaltRequest
                });
                if (response.status === 200 && response.data?.url) {
                    streams.audioUrl = response.data.url;
                    console.log(`[YoutubeUtils] ✓ Cobalt SUCCESS: ${instance}`);
                    return streams;
                }
            } else {
                const res = await fetch(`${instance}/`, {
                    method: 'POST',
                    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                    body: JSON.stringify(cobaltRequest)
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.url) {
                        streams.audioUrl = data.url;
                        console.log(`[YoutubeUtils] ✓ Cobalt SUCCESS: ${instance}`);
                        return streams;
                    }
                }
            }
        } catch (e: any) {
            console.log(`[YoutubeUtils] Cobalt error: ${e.message}`);
        }
    }

    return streams;
}


// Keep backward compatibility
export async function resolveYouTubeStream(videoId: string, quality: string = 'low'): Promise<string | null> {
    const res = await resolveYouTubeStreams(videoId, quality);
    return res.audioUrl;
}
