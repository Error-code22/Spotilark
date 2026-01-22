
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const token = process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;

    if (!fileId || !token) {
        return NextResponse.json({ error: 'Missing fileId or token' }, { status: 400 });
    }

    try {
        console.log(`[Telegram API Proxy] Getting file path for: ${fileId.substring(0, 10)}...`);
        // 1. Get file path
        const getFileUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
        const getFileResponse = await fetch(getFileUrl);
        const getFileData = await getFileResponse.json();

        if (!getFileData.ok || !getFileData.result?.file_path) {
            console.error('[Telegram API Proxy] getFile failed:', getFileData);
            return NextResponse.json({ error: 'Failed to get file path', detail: getFileData }, { status: 500 });
        }

        const filePath = getFileData.result.file_path;
        console.log(`[Telegram API Proxy] Success! File path: ${filePath}`);
        const directLink = `https://api.telegram.org/file/bot${token}/${filePath}`;

        // 2. Fetch the actual file with range support
        const range = request.headers.get('range');
        const telegramHeaders = new Headers();
        if (range) {
            telegramHeaders.set('Range', range);
        }

        const fileResponse = await fetch(directLink, {
            headers: telegramHeaders,
        });

        if (!fileResponse.ok && fileResponse.status !== 206) {
            console.error('[Telegram API Proxy] file fetch failed:', fileResponse.status, fileResponse.statusText);
            return NextResponse.json({ error: 'Failed to fetch file content' }, { status: 500 });
        }

        // 3. Pipe the stream back to the client
        const headers = new Headers();
        headers.set('Content-Type', fileResponse.headers.get('Content-Type') || 'audio/mpeg');
        headers.set('Cache-Control', 'public, max-age=3600');
        headers.set('Accept-Ranges', 'bytes');

        const contentRange = fileResponse.headers.get('Content-Range');
        const contentLength = fileResponse.headers.get('Content-Length');

        if (contentRange) headers.set('Content-Range', contentRange);
        if (contentLength) headers.set('Content-Length', contentLength);

        return new NextResponse(fileResponse.body, {
            status: fileResponse.status,
            headers,
        });
    } catch (error) {
        console.error('[Telegram API Proxy] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
