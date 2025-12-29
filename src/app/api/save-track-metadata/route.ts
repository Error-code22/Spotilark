import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { title, artist, album, genre, audioUrl, videoUrl, cover, duration } = await request.json();

    if (!title || !artist || !audioUrl) {
      return NextResponse.json({ error: 'Missing required track metadata.' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get the current user session
    // Get current user with fallback
    let { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const { data: { session } } = await supabase.auth.getSession();
      user = session?.user || null;
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate that all required fields are present
    const trimmedTitle = title.trim();
    const trimmedArtist = artist.trim();
    const trimmedAudioUrl = audioUrl.trim();
    const trimmedVideoUrl = videoUrl?.trim() || null;

    if (!trimmedTitle || !trimmedArtist || !trimmedAudioUrl) {
      return NextResponse.json({ error: 'Title, artist, and audio URL are required and cannot be empty.' }, { status: 400 });
    }

    // Validate URL format (allow absolute URLs or relative API paths)
    if (!trimmedAudioUrl.startsWith('/api/')) {
      try {
        new URL(trimmedAudioUrl);
      } catch (urlError) {
        return NextResponse.json({ error: 'Invalid audio URL format.' }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from('tracks')
      .insert([
        {
          user_id: user.id,
          title: trimmedTitle,
          artist: trimmedArtist,
          album: album?.trim() || 'Unknown Album',
          genre: genre?.trim() || 'Unknown Genre',
          source_url: trimmedAudioUrl, // Using source_url to match the database schema
          video_url: trimmedVideoUrl,
          cover: cover || null,
          duration: Math.round(duration) || 0,
          lyrics: null,
        },
      ])
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      // Handle duplicate entry error
      if (error.code === '23505') { // PostgreSQL unique violation error code
        // Try to find the existing track
        const { data: existingData, error: existingError } = await supabase
          .from('tracks')
          .select('*')
          .eq('user_id', user.id)
          .eq('source_url', trimmedAudioUrl)
          .single();

        if (!existingError && existingData) {
          return NextResponse.json({ success: true, data: existingData, message: 'Track already exists' });
        }
      }
      return NextResponse.json({ error: error.message || 'Failed to save track metadata.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: any) {
    console.error('Save track metadata error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred while saving track metadata.' }, { status: 500 });
  }
}
