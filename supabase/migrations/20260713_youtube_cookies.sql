-- Create youtube_cookies table for persistent cookie storage
CREATE TABLE IF NOT EXISTS youtube_cookies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default',
  cookie_content TEXT NOT NULL,
  entry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS but allow all operations for now
ALTER TABLE youtube_cookies ENABLE ROW LEVEL SECURITY;

-- Allow all operations (simplified for now)
CREATE POLICY "Allow all operations" ON youtube_cookies
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create unique index on user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_youtube_cookies_user_id ON youtube_cookies(user_id);
