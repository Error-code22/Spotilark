-- Add video_url column to the tracks table to support MP4 playback in the future
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Update the existing tracks (optional, but good for consistency)
-- COMMENT: No data migration needed as this is a new feature
