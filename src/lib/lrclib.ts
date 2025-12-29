
import { Lyric } from "./data";

const LRCLIB_API_URL = "https://lrclib.net/api";

interface LrcLibResponse {
    id: number;
    trackName: string;
    artistName: string;
    albumName: string;
    duration: number;
    instrumental: boolean;
    plainLyrics: string;
    syncedLyrics: string; // The LRC string
}

const CACHE_KEY = "spotilark_lyrics_cache";

interface CachedLyrics {
    [key: string]: {
        lyrics: Lyric[];
        timestamp: number;
    };
}

function getCache(): CachedLyrics {
    if (typeof window === "undefined") return {};
    try {
        const item = localStorage.getItem(CACHE_KEY);
        return item ? JSON.parse(item) : {};
    } catch {
        return {};
    }
}

function saveToCache(key: string, lyrics: Lyric[]) {
    if (typeof window === "undefined") return;
    try {
        const cache = getCache();
        cache[key] = {
            lyrics,
            timestamp: Date.now(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.error("Failed to save lyrics to cache", e);
    }
}

export function getLyricsCacheSize(): number {
    if (typeof window === "undefined") return 0;
    const item = localStorage.getItem(CACHE_KEY);
    return item ? item.length : 0;
}

export function clearLyricsCache() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(CACHE_KEY);
}

export async function fetchLyricsFromLRCLIB(
    title: string,
    artist: string,
    duration?: number
): Promise<Lyric[] | null> {
    const cacheKey = `${title}-${artist}`.toLowerCase();

    // 1. Check Cache
    const cache = getCache();
    if (cache[cacheKey]) {
        console.log("Lyrics found in cache");
        return cache[cacheKey].lyrics;
    }

    try {
        const params = new URLSearchParams({
            track_name: title,
            artist_name: artist,
        });
        if (duration) {
            params.append("duration", duration.toString());
        }

        const response = await fetch(`${LRCLIB_API_URL}/get?${params.toString()}`);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`LRCLIB API Error: ${response.status}`);
        }

        const data: LrcLibResponse = await response.json();

        if (data.syncedLyrics) {
            const parsed = parseLrc(data.syncedLyrics);
            // 2. Save to Cache
            saveToCache(cacheKey, parsed);
            return parsed;
        }

        // If only plain lyrics are available, we can return them as a single chunk or separate lines with 0/approximate time
        // But for now, let's prioritize synced.
        return null;
    } catch (error) {
        console.error("Failed to fetch lyrics from LRCLIB:", error);
        return null;
    }
}

function parseLrc(lrc: string): Lyric[] {
    const lines = lrc.split("\n");
    const result: Lyric[] = [];

    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    for (const line of lines) {
        const match = timeRegex.exec(line);
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const milliseconds = parseInt(match[3].padEnd(3, '0').substring(0, 3), 10); // Handle 2 or 3 digit ms
            const time = minutes * 60 + seconds + milliseconds / 1000;
            const text = line.replace(timeRegex, "").trim();

            if (text) {
                result.push({ time, text });
            }
        }
    }

    return result;
}
