import { Lyric } from "./data";
import { fetchLyricsFromLRCLIB } from "./lrclib";

/**
 * Unified lyrics fetching utility.
 * Tries LRCLIB first for synced lyrics, then falls back to Genius for plain text.
 */
export async function fetchLyrics(
    title: string,
    artist: string,
    trackId: string,
    duration?: number
): Promise<Lyric[] | null> {
    try {
        // 1. Try LRCLIB for synced lyrics
        const syncedLyrics = await fetchLyricsFromLRCLIB(title, artist, duration);
        if (syncedLyrics && syncedLyrics.length > 0) {
            return syncedLyrics;
        }

        // 2. Fallback to Genius API
        console.log(`[Lyrics] LRCLIB missed, falling back to Genius for: ${title}`);
        const params = new URLSearchParams({ title, artist });
        const response = await fetch(`/api/get-lyrics?${params.toString()}`);

        if (response.ok) {
            const data = await response.json();
            if (data.lyrics) {
                return parsePlainTextLyrics(data.lyrics);
            }
        }

        return null;
    } catch (error) {
        console.error("Error in unified fetchLyrics:", error);
        return null;
    }
}

/**
 * Converts plain text lyrics into a Lyric[] format.
 * Since Genius doesn't provide timestamps, we assign incremental 1s offsets
 * just so they are displayed correctly in the lyrics view.
 */
function parsePlainTextLyrics(text: string): Lyric[] {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    return lines.map((line, index) => ({
        time: index * 1, // 1 second intervals just for structure
        text: line.trim()
    }));
}
