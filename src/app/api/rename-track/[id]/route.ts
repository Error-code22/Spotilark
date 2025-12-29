import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: trackId } = await params;
    const { title, artist, album } = await request.json();

    if (!trackId) {
      return NextResponse.json({ error: 'Track ID is required.' }, { status: 400 });
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

    // Update the track metadata in the database
    const { data, error } = await supabase
      .from('tracks')
      .update({
        title: title?.trim() || undefined,
        artist: artist?.trim() || undefined,
        album: album?.trim() || undefined,
      })
      .eq('id', trackId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ error: error.message || 'Failed to update track metadata.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, message: 'Track updated successfully.' });
  } catch (error: any) {
    console.error('Rename track error:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred while renaming the track.' }, { status: 500 });
  }
}