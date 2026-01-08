import { Lyric } from "./data";
import { fetchLyricsFromLRCLIB } from "./lrclib";

/**
 * Unified lyrics fetching utility.
 * Uses LRCLIB for synced lyrics only. Genius fallback disabled as it provides unsynced lyrics.
 */
export async function fetchLyrics(
    title: string,
    artist: string,
    trackId: string,
    duration?: number
): Promise<Lyric[] | null> {
    try {
        // Try LRCLIB for synced lyrics
        const syncedLyrics = await fetchLyricsFromLRCLIB(title, artist, duration);
        if (syncedLyrics && syncedLyrics.length > 0) {
            return syncedLyrics;
        }

        // No synced lyrics found
        console.log(`[Lyrics] No synced lyrics found for: ${title}`);
        return null;
    } catch (error) {
        console.error("Error in fetchLyrics:", error);
        return null;
    }
}
