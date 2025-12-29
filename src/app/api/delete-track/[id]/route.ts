import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { v2 as cloudinary } from 'cloudinary';

const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: trackId } = await params;
        console.log(`[DeleteTrack] Deleting track ID: ${trackId}`);

        if (!trackId) {
            return NextResponse.json({ error: 'Track ID is required.' }, { status: 400 });
        }

        const authClient = await createServerClient();

        // Get current user with fallback
        let { data: { user }, error: authError } = await authClient.auth.getUser();

        if (authError || !user) {
            const { data: { session } } = await authClient.auth.getSession();
            user = session?.user || null;
        }

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.log(`[DeleteTrack] Current user ID: ${user?.id}`);

        // DEBUG: Log first 5 track IDs in DB to see what we are dealing with
        try {
            const { data: sample } = await adminClient.from('tracks').select('id').limit(5);
            console.log(`[DeleteTrack] Sample IDs in DB: ${sample?.map(s => s.id).join(', ')}`);
        } catch (e) {
            console.warn(`[DeleteTrack] Could not fetch sample IDs.`);
        }

        // 1. Primary Attempt (Strict UUID lookup)
        let { data: track, error: fetchError } = await adminClient
            .from('tracks')
            .select('id, source_url, video_url, cover, user_id, title')
            .eq('id', trackId.trim())
            .maybeSingle();

        // 2. Fallback Attempt (Loose lookup)
        if (!track) {
            const { data: fallbackTrack } = await adminClient
                .from('tracks')
                .select('id, source_url, video_url, cover, user_id, title')
                .eq('id', trackId)
                .maybeSingle();

            if (fallbackTrack) {
                track = fallbackTrack;
            }
        }

        if (!track) {
            return NextResponse.json({ error: 'Track not found in database.' }, { status: 404 });
        }

        // Permission Check
        if (track.user_id && track.user_id !== user.id) {
            return NextResponse.json({ error: 'You do not have permission to delete this track.' }, { status: 403 });
        }

        console.log(`[DeleteTrack] Proceeding to delete files and record for: ${track.title}`);

        // Delete files from Cloudinary
        // Note: Telegram files are currently retained in the channel as a backup
        if (track.source_url && track.source_url.includes('cloudinary')) {
            const publicId = track.source_url.split('/').slice(-1)[0].split('.')[0];
            await cloudinary.uploader.destroy(`spotilark_tracks/${publicId}`, { resource_type: 'video' });
        }

        if (track.video_url && track.video_url.includes('cloudinary')) {
            const publicId = track.video_url.split('/').slice(-1)[0].split('.')[0];
            await cloudinary.uploader.destroy(`spotilark_tracks/${publicId}`, { resource_type: 'video' });
        }

        if (track.cover && track.cover.includes('cloudinary')) {
            const publicId = track.cover.split('/').slice(-1)[0].split('.')[0];
            await cloudinary.uploader.destroy(`spotilark_tracks/${publicId}`, { resource_type: 'image' });
        }

        // Delete the track using Admin Client
        const { error: deleteError } = await adminClient
            .from('tracks')
            .delete()
            .eq('id', trackId);

        if (deleteError) {
            console.error('Supabase delete error:', deleteError);
            return NextResponse.json({ error: deleteError.message || 'Failed to delete track from database.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Track deleted successfully.' });
    } catch (error: any) {
        console.error('Delete track error:', error);
        return NextResponse.json({ error: error.message || 'An unexpected error occurred while deleting the track.' }, { status: 500 });
    }
}
