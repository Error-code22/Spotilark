import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { trackIds, playlistId } = await request.json();

    if (!trackIds || !Array.isArray(trackIds) || trackIds.length === 0 || !playlistId) {
      return NextResponse.json({ error: 'Track IDs and Playlist ID are required.' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get the current user
    // Get current user with fallback
    let { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const { data: { session } } = await supabase.auth.getSession();
      user = session?.user || null;
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify that the playlist belongs to the user
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('id')
      .eq('id', playlistId)
      .eq('user_id', user.id)
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json({ error: 'Playlist not found or you do not have permission to add tracks to it.' }, { status: 404 });
    }

    // Prepare the data to insert
    const playlistSongsData = trackIds.map((trackId: string) => ({
      playlist_id: playlistId,
      track_id: trackId,
    }));

    // Insert the tracks into the playlist
    const { error: insertError } = await supabase
      .from('playlist_songs')
      .insert(playlistSongsData)
      .select();

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      // Handle duplicate entry error gracefully
      if (insertError.code === '23505') { // PostgreSQL unique violation error code
        // This means some tracks were already in the playlist, which is fine
        // We'll continue and just return success
      } else {
        return NextResponse.json({ error: insertError.message || 'Failed to add tracks to playlist.' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: `${trackIds.length} track(s) added to playlist successfully.` });
  } catch (error: any) {
    console.error('Add tracks to playlist error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred while adding tracks to playlist.' }, { status: 500 });
  }
}