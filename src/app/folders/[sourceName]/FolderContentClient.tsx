'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Track {
  id: string;
  title: string;
  artist: string | null;
  source_url: string;
  duration: number | null;
}

export default function FolderContentClient({ sourceName }: { sourceName: string }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchTracks = async () => {
      if (sourceName === 'uploaded-music') {
        const { data, error } = await supabase.from('tracks').select('*');
        if (error) {
          console.error('Error fetching uploaded music:', error);
          setError(error.message);
        } else {
          setTracks(data || []);
        }
      } else {
        // Handle other sources or mock data for now
        setTracks([]);
      }
      setLoading(false);
    };

    fetchTracks();
  }, [sourceName, supabase]);

  return (
    <div className='flex-1 p-8 overflow-y-auto pb-24'>
      <h1 className='text-4xl font-bold mb-8'>{sourceName.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}</h1>

      {loading && <p>Loading music...</p>}
      {error && <p className='text-red-500'>Error: {error}</p>}

      {!loading && !error && tracks.length === 0 && (
        <p className='text-muted-foreground'>No music found in this folder.</p>
      )}

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {tracks.map((track) => (
          <Card key={track.id}>
            <CardHeader>
              <CardTitle>{track.title}</CardTitle>
              {track.artist && <p className='text-muted-foreground'>{track.artist}</p>}
            </CardHeader>
            <CardContent>
              <audio controls src={track.source_url} className='w-full'></audio>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}