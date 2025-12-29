// spotilark-web/src/app/api/cloud/[service]/files/route.ts
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google-drive/callback';

const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
);

export async function GET(request: Request, { params }: { params: Promise<{ service: string }> }) {
    const { service } = await params;
    const supabase = await createClient();

    // Get current user with fallback
    let { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        const { data: { session } } = await supabase.auth.getSession();
        user = session?.user || null;
    }

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (service === 'google-drive') {
        try {
            // Retrieve refresh token from Supabase
            const { data, error } = await supabase
                .from('user_cloud_accounts')
                .select('refresh_token')
                .eq('user_id', user.id)
                .eq('service_provider', 'google-drive')
                .single();

            if (error || !data?.refresh_token) {
                return NextResponse.json({ error: 'Google Drive not connected or refresh token missing' }, { status: 404 });
            }

            oauth2Client.setCredentials({ refresh_token: data.refresh_token });
            const { token } = await oauth2Client.getAccessToken();

            if (!token) {
                return NextResponse.json({ error: 'Failed to obtain Google Drive access token' }, { status: 500 });
            }

            oauth2Client.setCredentials({ access_token: token });

            const drive = google.drive({ version: 'v3', auth: oauth2Client });

            const response = await drive.files.list({
                q: "mimeType contains 'audio/'", // Filter for audio files
                fields: 'nextPageToken, files(id, name, mimeType, webContentLink)',
                pageSize: 100, // Adjust as needed
            });

            const files = response.data.files?.map(file => ({
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                // The webContentLink for audio files often requires authentication
                // We'll need a separate endpoint to proxy the actual stream
                webContentLink: file.webContentLink, // This might not be directly streamable without auth
            }));

            return NextResponse.json(files);

        } catch (error: any) {
            console.error('Error listing Google Drive files:', error.message);
            return NextResponse.json({ error: `Failed to list Google Drive files: ${error.message}` }, { status: 500 });
        }
    } else {
        return NextResponse.json({ error: 'Unsupported cloud service' }, { status: 400 });
    }
}
