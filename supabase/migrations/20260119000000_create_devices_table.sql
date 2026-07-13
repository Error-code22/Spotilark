-- Create the devices table for cross-device synchronization
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'web', 'desktop', 'mobile'
    is_active BOOLEAN DEFAULT false,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Playback State
    current_track_json JSONB, -- Full track metadata
    position_ms INTEGER DEFAULT 0,
    is_playing BOOLEAN DEFAULT false,
    volume FLOAT DEFAULT 0.5,
    queue_ids TEXT[], -- Array of track IDs in the current queue
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    -- Removed strict UNIQUE(user_id, name, type) to allow re-registration if device ID changes
);

-- Enable RLS
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own devices" ON devices
    FOR ALL USING (auth.uid() = user_id);

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_devices_updated_at
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();
