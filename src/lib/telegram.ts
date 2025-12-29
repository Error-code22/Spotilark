import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;
const channelId = process.env.TELEGRAM_CHANNEL_ID;

if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not defined in .env.local');
}
// Remove initial token and channelId checks as they will be lazy-loaded

if (!process.env.TELEGRAM_CHANNEL_ID) {
    throw new Error('TELEGRAM_CHANNEL_ID is not defined in .env.local');
}

// Singleton pattern to avoid multiple bot instances in dev
let bot: TelegramBot | null = null;

declare global {
    var __telegramBot: TelegramBot | undefined;
}

export function getTelegramBot(): TelegramBot {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        throw new Error('TELEGRAM_BOT_TOKEN is not defined in .env.local');
    }

    if (bot) return bot;

    if (process.env.NODE_ENV === 'production') {
        bot = new TelegramBot(token, { polling: false });
    } else {
        // In development, use global to preserve instance across hot reloads
        if (!global.__telegramBot) {
            global.__telegramBot = new TelegramBot(token, { polling: false });
        }
        bot = global.__telegramBot;
    }

    return bot;
}

export const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '';

/**
 * Helper to get a refreshable stream URL for a file.
 * Returns the full HTTPS URL that expires in ~1 hour.
 */
export async function getTelegramFileLink(fileId: string): Promise<string> {
    const botInstance = getTelegramBot();
    try {
        const fileLink = await botInstance.getFileLink(fileId);
        return fileLink;
    } catch (error) {
        console.error('Error fetching Telegram file link:', error);
        throw error;
    }
}
