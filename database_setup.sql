-- This script sets up the necessary tables for the Spotilark application.
-- Please run this script in your Supabase project's SQL editor.

-- 1. Create the 'playlists' table
CREATE TABLE IF NOT EXISTS playlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    cover TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for playlists
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for playlists
CREATE POLICY "Users can view their own playlists" ON playlists
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own playlists" ON playlists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists" ON playlists
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists" ON playlists
    FOR DELETE USING (auth.uid() = user_id);


-- 2. Create the 'tracks' table
CREATE TABLE IF NOT EXISTS tracks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    title TEXT NOT NULL,
    artist TEXT,
    album TEXT,
    cover TEXT,
    source_url TEXT NOT NULL,
    duration INTEGER,
    lyrics JSONB,
    genre TEXT
);

-- Enable Row Level Security for tracks
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tracks
CREATE POLICY "Users can view their own tracks" ON tracks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracks" ON tracks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracks" ON tracks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracks" ON tracks
    FOR DELETE USING (auth.uid() = user_id);


-- 3. Create the 'playlist_songs' join table and related functions
-- (Content from playlist_songs_migration.sql)

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

-- 4. Create the 'user_cloud_accounts' table
CREATE TABLE IF NOT EXISTS user_cloud_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    service_provider TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, service_provider) -- Ensure only one account per service per user
);

-- Enable Row Level Security for user_cloud_accounts
ALTER TABLE user_cloud_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_cloud_accounts
CREATE POLICY "Users can view their own cloud accounts" ON user_cloud_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cloud accounts" ON user_cloud_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cloud accounts" ON user_cloud_accounts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cloud accounts" ON user_cloud_accounts
    FOR DELETE USING (auth.uid() = user_id);