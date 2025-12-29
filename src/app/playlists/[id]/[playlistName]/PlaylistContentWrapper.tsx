'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { SpotilarkLayout } from '@/components/spotilark-layout';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Track } from '@/lib/data';
import { useParams } from 'next/navigation';

export default function PlaylistContentPageWrapper() {
  const params = useParams();
  const { id, playlistName } = params as { id: string; playlistName: string };
  const decodedPlaylistName = decodeURIComponent(playlistName);
  
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user, isLoading: userLoading } = useUser();

  useEffect(() => {
    if (!user) return;

    const fetchPlaylistTracks = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const supabase = createClient();

        // Fetch songs in the playlist using the playlist ID
        // First get the playlist_song relationships
        const { data: playlistSongsData, error: playlistSongsError } = await supabase
          .from('playlist_songs')
          .select('track_id')
          .eq('playlist_id', id);
        
        if (playlistSongsError) {
          throw new Error(playlistSongsError.message);
        }
        
        const trackIds = playlistSongsData.map((item: any) => item.track_id);
        
        // Then get the actual track data
        let trackQuery = supabase.from('tracks').select('*');
        if (trackIds.length > 0) {
          trackQuery = trackQuery.in('id', trackIds);
        } else {
          // If no tracks in the playlist, return empty array
          setTracks([]);
          return;
        }
        
        const { data: tracksData, error: tracksError } = await trackQuery;
        
        if (tracksError) {
          throw new Error(tracksError.message);
        }

        setTracks(tracksData || []);
      } catch (err: any) {
        console.error('Error fetching playlist tracks:', err);
        setError(err.message || 'Error loading playlist tracks');
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylistTracks();
  }, [user, decodedPlaylistName]);

  if (userLoading || loading) {
    return (
      <SpotilarkLayout>
        <div className="flex-1 p-8 overflow-y-auto pb-24">
          <h1 className="text-4xl font-bold mb-8">{decodedPlaylistName}</h1>
          <p>Loading...</p>
        </div>
      </SpotilarkLayout>
    );
  }

  if (!user) {
    return (
      <SpotilarkLayout>
        <div className="flex-1 p-8 overflow-y-auto pb-24">
          <h1 className="text-4xl font-bold mb-8">{decodedPlaylistName}</h1>
          <p>Please sign in to view this playlist.</p>
        </div>
      </SpotilarkLayout>
    );
  }

  if (error) {
    return (
      <SpotilarkLayout>
        <div className="flex-1 p-8 overflow-y-auto pb-24">
          <h1 className="text-4xl font-bold mb-8">{decodedPlaylistName}</h1>
          <p className="text-red-500">Error loading playlist tracks.</p>
        </div>
      </SpotilarkLayout>
    );
  }

  return (
    <SpotilarkLayout>
      <div className="flex-1 p-8 overflow-y-auto pb-24">
        <h1 className="text-4xl font-bold mb-8">{decodedPlaylistName}</h1>

        {tracks && tracks.length === 0 ? (
          <p className="text-muted-foreground">No tracks found in this playlist.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tracks?.map((track) => (
              <Card key={track.id}>
                <CardHeader>
                  <CardTitle>{track.title}</CardTitle>
                  {track.artist && <p className="text-muted-foreground">{track.artist}</p>}
                </CardHeader>
                <CardContent>
                  {track.cover && (
                    <div className="relative w-full aspect-square mb-4">
                      <Image src={track.cover} alt={track.title} fill className="object-cover rounded-md" />
                    </div>
                  )}
                  <audio controls src={track.source_url} className="w-full"></audio>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SpotilarkLayout>
  );
}