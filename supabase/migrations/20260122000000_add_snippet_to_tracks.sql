
-- Migration to add snippet support for instant playback
ALTER TABLE public.tracks 
ADD COLUMN IF NOT EXISTS snippet_url TEXT,
ADD COLUMN IF NOT EXISTS snippet_data TEXT;

-- Add a comment to explain the columns
COMMENT ON COLUMN public.tracks.snippet_url IS 'URL to a 15-second intro snippet (optional)';
COMMENT ON COLUMN public.tracks.snippet_data IS 'Base64 encoded 15-second intro snippet for instant playback';
