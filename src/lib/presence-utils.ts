import { createClient } from '@/lib/supabase/client';
import type { Track } from '@/lib/data';

export async function updatePresence(
  userId: string,
  currentTrack: Track | null,
  isPlaying: boolean,
  shareListening: boolean
): Promise<void> {
  if (!shareListening || !currentTrack) return;

  try {
    const supabase = createClient();
    await supabase
      .from('user_presence')
      .upsert(
        {
          user_id: userId,
          current_track: currentTrack.title,
          current_artist: currentTrack.artist,
          is_playing: isPlaying,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
  } catch (err) {
    console.error('[Presence] Failed to update:', err);
  }
}
