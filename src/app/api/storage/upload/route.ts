import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
            return NextResponse.json(
                { error: 'Telegram credentials not configured' },
                { status: 500 }
            );
        }

        console.log(`Uploading ${file.name} to Telegram Channel ${TELEGRAM_CHANNEL_ID}...`);

        // Use direct Telegram Bot API with fetch for better reliability
        const telegramFormData = new FormData();
        telegramFormData.append('chat_id', TELEGRAM_CHANNEL_ID);
        telegramFormData.append('audio', file, file.name);

        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendAudio`;

        const response = await fetch(telegramUrl, {
            method: 'POST',
            body: telegramFormData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Telegram API error:', errorText);
            throw new Error(`Telegram API returned ${response.status}: ${errorText}`);
        }

        const result = await response.json();

        if (!result.ok) {
            throw new Error(result.description || 'Telegram API returned ok: false');
        }

        const message = result.result;
        const telegramFile = message.audio || message.voice || message.document;

        if (!telegramFile) {
            throw new Error('Telegram did not return file metadata.');
        }

        const fileId = telegramFile.file_id;
        const fileUniqueId = telegramFile.file_unique_id;

        if (!fileId) {
            throw new Error('Could not retrieve file_id from Telegram response.');
        }

        console.log('Upload successful. File ID:', fileId);

        return NextResponse.json({
            success: true,
            file_id: fileId,
            file_unique_id: fileUniqueId,
            duration: telegramFile.duration || 0,
            size: telegramFile.file_size || file.size,
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
