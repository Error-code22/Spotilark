import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { videoId, title, artist, album, cover } = await req.json();

        const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const authClient = await createServerClient();
        let { data: { user }, error: authError } = await authClient.auth.getUser();
        if (authError || !user) {
            const { data: { session } } = await authClient.auth.getSession();
            user = session?.user || null;
        }

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!videoId) {
            return NextResponse.json({ error: "Video ID is required" }, { status: 400 });
        }

        console.log(`[Import] Starting import for: ${title} (${videoId})`);

        // Store YouTube stream URL directly (no download needed)
        const audioStreamUrl = `/api/stream/youtube?v=${videoId}&redirect=true`;
        const finalCoverUrl = cover || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

        console.log(`[Import] Inserting DB record...`);
        const trackRecord: any = {
            user_id: user.id,
            created_by: user.id,
            title: title || 'Unknown Title',
            artist: artist || 'Unknown Artist',
            album: album || 'YouTube',
            genre: 'Imported',
            source_url: audioStreamUrl,
            cover: finalCoverUrl,
            duration: 0,
            lyrics: null
        };

        const { data, error } = await authClient.from('tracks').insert([trackRecord]).select().single();

        if (error) {
            console.error('[Import] Auth insert failed:', JSON.stringify(error, null, 2));
            const { data: adminData, error: adminError } = await adminClient.from('tracks').insert([trackRecord]).select().single();
            if (adminError) throw adminError;
            return NextResponse.json({ success: true, track: adminData });
        }

        return NextResponse.json({ success: true, track: data });

    } catch (error: any) {
        console.error("[Import] Error:", error);
        return NextResponse.json({ error: error.message || "Failed to import", details: error.stack }, { status: 500 });
    }
}
