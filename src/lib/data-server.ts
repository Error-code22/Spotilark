import { createClient } from "./supabase/server";
import { cookies } from "next/headers";

export interface Track {
  id: string; // UUID
  created_at: string; // timestamp with time zone
  title: string;
  artist: string | null;
  album: string | null;
  cover: string | null; // URL to cover image
  coverHint?: string; // Optional hint for AI image generation
  source_url: string; // URL to music file
  duration: number | null;
  created_by: string; // UUID of the uploader
  lyrics?: Lyric[]; // Optional array of lyrics
}

export interface Lyric {
  time: number; // Time in seconds
  text: string; // Lyric text
}

export async function getTracks(): Promise<Track[]> {
  try {
    const supabase = createClient();
    const { data, error, status } = await supabase
      .from("tracks")
      .select("*");

    // If there's an authentication error (status 401/403), return empty array
    if (error && (status === 401 || status === 403)) {
      console.warn("Authentication required for tracks, returning empty list:", error?.message || error);
      return [];
    }

    if (error) {
      console.error("Error fetching tracks:", error?.message || error);
      return [];
    }

    // Map audio_url to source_url if it exists but source_url doesn't
    const mappedData = data?.map(track => ({
      ...track,
      source_url: track.source_url || track.audio_url || track.source || '',
      created_by: track.user_id || '' // Map user_id to created_by for the interface
    })) || [];

    return mappedData;
  } catch (error: any) {
    console.error("Error fetching tracks:", error?.message || error);
    return [];
  }
}