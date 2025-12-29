// spotilark-web/src/app/api/auth/google-drive/callback/route.ts
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server'; // Import Supabase server client

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google-drive/callback';

const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
);

export async function GET(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const supabase = await createClient(); // Initialize Supabase client

    if (!code) {
        return NextResponse.json({ error: 'Authorization code not found' }, { status: 400 });
    }

    try {
        // Get current user with fallback
        let { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            const { data: { session } } = await supabase.auth.getSession();
            user = session?.user || null;
        }

        if (!user) {
            console.error('GOOGLE DRIVE CALLBACK: Unauthorized');
            return NextResponse.redirect(new URL('/settings?error=unauthorized', request.url));
        }

        const { tokens } = await oauth2Client.getToken(code);
        // Do NOT store access_token directly, it's short-lived. Use refresh_token.
        const refreshToken = tokens.refresh_token;

        if (!refreshToken) {
            throw new Error('Refresh token not received.');
        }

        // Store refresh token securely in Supabase
        const { error: dbError } = await supabase
            .from('user_cloud_accounts')
            .upsert(
                {
                    user_id: user.id,
                    service_provider: 'google-drive',
                    refresh_token: refreshToken,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id, service_provider' } // Upsert based on user_id and service_provider
            );

        if (dbError) {
            console.error('Error storing refresh token in Supabase:', dbError);
            throw new Error('Failed to store cloud account credentials.');
        }

        console.log('Google Drive refresh token stored successfully for user:', user.id);

        // Redirect to a page indicating successful connection
        return NextResponse.redirect(new URL('/folders?cloudConnected=true', request.url));
    } catch (error: any) {
        console.error('Error in Google Drive OAuth callback:', error.message);
        return NextResponse.json({ error: `Failed to connect to Google Drive: ${error.message}` }, { status: 500 });
    }
}

