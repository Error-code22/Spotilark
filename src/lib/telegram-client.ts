/**
 * Telegram client updated for PWA (Browser Context).
 * Uses a proxy API route to bypass CORS.
 */

export async function resolveTelegramLink(fileId: string): Promise<string | null> {
    try {
        console.log(`[TelegramClient] Resolving file link via proxy: ${fileId}`);

        // Simply return the proxy URL - the <audio> tag handles range-fetch natively
        return `/api/telegram?fileId=${encodeURIComponent(fileId)}`;
    } catch (error) {
        console.error('[TelegramClient] Error resolving telegram link:', error);
        return null;
    }
}
