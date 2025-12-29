import { NextRequest, NextResponse } from 'next/server';
import { getTelegramFileLink } from '@/lib/telegram';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const fileId = searchParams.get('file_id');
    const range = req.headers.get('range');

    if (!fileId) {
        return NextResponse.json({ error: 'Missing file_id' }, { status: 400 });
    }

    try {
        const directLink = await getTelegramFileLink(fileId);

        // Prepare headers to forward to Telegram
        const telegramHeaders = new Headers();
        if (range) {
            telegramHeaders.set('Range', range);
        }

        const response = await fetch(directLink, {
            headers: telegramHeaders,
        });

        if (!response.ok && response.status !== 206) {
            throw new Error(`Telegram fetch failed: ${response.status} ${response.statusText}`);
        }

        const headers = new Headers();
        headers.set('Content-Type', response.headers.get('Content-Type') || 'audio/mpeg');
        headers.set('Cache-Control', 'public, max-age=3600');
        headers.set('Access-Control-Allow-Origin', '*');

        // Forward critical range headers
        const contentRange = response.headers.get('Content-Range');
        const contentLength = response.headers.get('Content-Length');

        if (contentRange) headers.set('Content-Range', contentRange);
        if (contentLength) headers.set('Content-Length', contentLength);

        // Also forward Accept-Ranges to tell the browser seeking is supported
        headers.set('Accept-Ranges', 'bytes');

        return new NextResponse(response.body, {
            status: response.status, // Will be 206 if range was used, 200 otherwise
            headers,
        });

    } catch (error: any) {
        console.error('Stream Proxy Error:', error);
        return NextResponse.json({ error: 'Failed to stream file' }, { status: 500 });
    }
}
