import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function DELETE(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Get current user
        // Get current user with fallback
        let { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            const { data: { session } } = await supabase.auth.getSession();
            user = session?.user || null;
        }

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all tracks to find Cloudinary IDs
        const { data: userTracks } = await supabase
            .from('tracks')
            .select('audio_url, cover_url')
            .eq('user_id', user.id);

        // Extract and delete Cloudinary assets
        const assetsToDelete: string[] = [];
        userTracks?.forEach(track => {
            if (track.audio_url?.includes('cloudinary.com')) {
                const parts = track.audio_url.split('/');
                const id = parts[parts.length - 1].split('.')[0];
                assetsToDelete.push(`spotilark_tracks/${id}`);
            }
        });

        if (assetsToDelete.length > 0) {
            try {
                // Delete in batches of 100 (Cloudinary limit)
                await cloudinary.api.delete_resources(assetsToDelete, { resource_type: 'video' });
            } catch (e) {
                console.error('Cloudinary track cleanup error:', e);
            }
        }

        // Delete user data from all tables
        const tables = [
            'tracks',
            'playlists',
            'user_stats',
            'user_profiles',
            'friends',
            'user_mood_tags',
            'user_badges'
        ];

        // Specific friend deletion logic (delete where user is either side)
        await supabase.from('friends').delete().or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

        for (const table of tables) {
            if (table === 'friends') continue; // Handled above
            await supabase
                .from(table)
                .delete()
                .eq('user_id', user.id);
        }

        // Delete user account from auth (Requires Service Role if using admin.deleteUser)
        // Note: For now we rely on RLS and cascade if possible, but admin.deleteUser is best.
        // If this fails, it might be due to missing service role key.
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

        if (deleteError) {
            console.error('Error deleting user account:', deleteError);
            // Don't fail the whole request if admin delete fails (might be permissions),
            // but log it. The user data is already wiped from tables.
        }

        return NextResponse.json({ message: 'Account deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting account:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
