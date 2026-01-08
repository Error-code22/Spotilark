/**
 * Telegram client updated for PWA (Browser Context).
 * Uses a proxy API route to bypass CORS.
 */

export async function resolveTelegramLink(fileId: string): Promise<string | null> {
    try {
        console.log(`[TelegramClient] Resolving file link via proxy: ${fileId}`);

        // Call our internal proxy API instead of Telegram directly
        const response = await fetch(`/api/telegram?fileId=${fileId}`);

        if (!response.ok) {
            throw new Error(`Proxy API returned ${response.status}`);
        }

        // Get the audio file as a blob
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        console.log('[TelegramClient] ✓ Resolution SUCCESS (Proxy used)');
        return blobUrl;
    } catch (error) {
        console.error('[TelegramClient] Error resolving telegram link:', error);
        return null;
    }
}
