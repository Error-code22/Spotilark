import { createClient } from "./supabase/client";
import type { Track } from "./data";

export async function updatePresence(userId: string, track: Track | null, isPlaying: boolean, shareActivity: boolean) {
    if (!shareActivity) return;

    const supabase = createClient();

    // Update the user's presence/status
    const { error } = await supabase
        .from('user_profiles')
        .update({
            last_played_json: track,
            is_online: isPlaying,
            updated_at: new Date().toISOString()
        })
        .eq('id', userId);

    if (error) {
        console.error("Presence update failed:", error);
    }
}
