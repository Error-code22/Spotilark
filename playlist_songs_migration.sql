-- Create the playlist_songs table to establish the many-to-many relationship between playlists and tracks

-- Create the playlist_songs table
CREATE TABLE IF NOT EXISTS playlist_songs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(playlist_id, track_id)  -- Prevent duplicate tracks in the same playlist
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist_id ON playlist_songs(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_track_id ON playlist_songs(track_id);

-- Enable Row Level Security
ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view playlist songs for their own playlists
CREATE POLICY "Users can view playlist songs for their own playlists" ON playlist_songs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM playlists 
            WHERE playlists.id = playlist_songs.playlist_id 
            AND playlists.user_id = auth.uid()
        )
    );

-- Users can manage playlist songs for their own playlists
CREATE POLICY "Users can manage playlist songs for their own playlists" ON playlist_songs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM playlists 
            WHERE playlists.id = playlist_songs.playlist_id 
            AND playlists.user_id = auth.uid()
        )
    );

-- Create a helper function to add songs to a playlist
CREATE OR REPLACE FUNCTION add_track_to_playlist(playlist_uuid UUID, track_uuid UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO playlist_songs(playlist_id, track_id)
    VALUES(playlist_uuid, track_uuid)
    ON CONFLICT (playlist_id, track_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create a helper function to remove songs from a playlist
CREATE OR REPLACE FUNCTION remove_track_from_playlist(playlist_uuid UUID, track_uuid UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM playlist_songs
    WHERE playlist_id = playlist_uuid AND track_id = track_uuid;
END;
$$ LANGUAGE plpgsql;