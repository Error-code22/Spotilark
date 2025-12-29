import { NextRequest, NextResponse } from 'next/server';
import { getTelegramBot, TELEGRAM_CHANNEL_ID } from '@/lib/telegram';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Convert File to Buffer for node-telegram-bot-api
        const buffer = Buffer.from(await file.arrayBuffer());

        // Telegram API requires a filename in the options for Buffers
        const fileOptions = {
            filename: file.name,
            contentType: file.type || 'audio/mpeg',
        };

        console.log(`Uploading ${file.name} to Telegram Channel ${TELEGRAM_CHANNEL_ID}...`);

        // Initialize bot on demand
        const telegramBot = getTelegramBot();

        // Send file to the private channel
        const message = await telegramBot.sendAudio(TELEGRAM_CHANNEL_ID, buffer, {}, fileOptions);

        if (!message.audio && !message.voice && !message.document) {
            throw new Error('Telegram did not return file metadata.');
        }

        // Extract file_id (prefer audio, fallback to document)
        const telegramFile = message.audio || message.voice || message.document;
        const fileId = telegramFile?.file_id;
        const fileUniqueId = telegramFile?.file_unique_id;

        if (!fileId) {
            throw new Error('Could not retrieve file_id from Telegram response.');
        }

        console.log('Upload successful. File ID:', fileId);

        return NextResponse.json({
            success: true,
            file_id: fileId,
            file_unique_id: fileUniqueId,
            duration: telegramFile?.duration || 0,
            size: telegramFile?.file_size || file.size,
            name: file.name,
            // IMPORTANT: We do NOT return a direct URL here because it expires.
            // The frontend must use /api/storage/stream?file_id=...
        });

    } catch (error: any) {
        console.error('Telegram Upload Error:', error);
        // Return detailed error for debugging
        return NextResponse.json(
            {
                error: error.message || 'Failed to upload to Telegram',
                details: error.stack,
                env_check: {
                    has_token: !!process.env.TELEGRAM_BOT_TOKEN,
                    has_channel: !!process.env.TELEGRAM_CHANNEL_ID
                }
            },
            { status: 500 }
        );
    }
}
