import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        // Get current user with fallback for mobile resilience
        let { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            const { data: { session } } = await supabase.auth.getSession();
            user = session?.user || null;
        }

        if (!user) {
            console.error('RECORD PLAY: Unauthorized');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { type, minutes, track } = await req.json();

        if (type === 'increment_minutes') {
            // Increment total_minutes_listened
            // We use maybeSingle() because user_stats might not exist yet
            const { data: stats } = await supabase
                .from('user_stats')
                .select('total_minutes_listened')
                .eq('user_id', user.id)
                .maybeSingle();

            const currentMinutes = stats?.total_minutes_listened || 0;

            await supabase
                .from('user_stats')
                .upsert({
                    user_id: user.id,
                    total_minutes_listened: Number(currentMinutes) + (minutes || 1),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

        } else if (type === 'record_song_play' && track) {
            // Increment songs_played and update top stats
            const { data: stats } = await supabase
                .from('user_stats')
                .select('songs_played')
                .eq('user_id', user.id)
                .maybeSingle();

            const currentSongs = stats?.songs_played || 0;

            await supabase
                .from('user_stats')
                .upsert({
                    user_id: user.id,
                    songs_played: Number(currentSongs) + 1,
                    top_artist: track.artist || 'Unknown',
                    top_genre: track.genre || 'Unknown',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error recording play:', error);
        return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 });
    }
}
