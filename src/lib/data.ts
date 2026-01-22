
export interface Track {
  id: string; // UUID
  created_at: string; // timestamp with time zone
  title: string;
  artist: string | null;
  album: string | null;
  cover: string | null; // URL to cover image
  coverHint?: string; // Optional hint for AI image generation
  source_url: string; // URL to music file
  snippet_url?: string; // URL to a 15-second intro snippet
  snippet_data?: string; // Base64 encoded intro snippet for instant playback
  duration: number | null;
  created_by: string; // UUID of the uploader
  storage_type?: 'local' | 'cloud' | 'stream'; // Track origin for categorization
  lyrics?: Lyric[]; // Optional array of lyrics
}

export interface Lyric {
  time: number; // Time in seconds
  text: string; // Lyric text
}
