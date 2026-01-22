
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

        // 2. Fetch the actual file
        const fileResponse = await fetch(directLink);
        if (!fileResponse.ok) {
            return NextResponse.json({ error: 'Failed to fetch file content' }, { status: 500 });
        }

        // 3. Pipe the stream back to the client
        const blob = await fileResponse.blob();

        // We return the blob directly with correct content type
        return new NextResponse(blob, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error) {
        console.error('[Telegram API Proxy] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
