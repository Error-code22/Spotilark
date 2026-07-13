'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { SpotilarkLayout } from '@/components/spotilark-layout';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { AddSongsToPlaylistDialog } from '@/components/add-songs-to-playlist-dialog';
import { EditPlaylistDialog } from '@/components/edit-playlist-dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

interface Track {
  id: string;
  title: string;
  artist: string;
  cover?: string;
  [key: string]: any;
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  cover?: string;
  songs?: Track[];
  [key: string]: any;
}

export default function PlaylistDetailsPageWrapper() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracksInPlaylist, setTracksInPlaylist] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, isLoading: userLoading } = useUser();

  const fetchPlaylistData = async () => {
    if (!user || !id) return;
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      let playlistData: Playlist | null = null;
      let tracksData: Track[] = [];

      if (id === 'playing') {
        const { data: tracks, error } = await supabase
          .from('tracks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        playlistData = {
          id: 'playing',
          name: 'Playing',
          description: 'All your uploaded music',
          cover: tracks?.[0]?.cover || 'https://placehold.co/300x300.png?text=Playing',
          songs: tracks || [],
        };
        tracksData = tracks || [];
      } else {
        const { data, error } = await supabase
          .from('playlists')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

        if (error) throw new Error(error.message);
        playlistData = data;

        if (data) {
          const { data: psData, error: psError } = await supabase
            .from('playlist_songs')
            .select('track_id')
            .eq('playlist_id', id);

          if (!psError && psData && psData.length > 0) {
            const trackIds = psData.map((item: any) => item.track_id);
            const { data: tData, error: tError } = await supabase
              .from('tracks')
              .select('*')
              .in('id', trackIds);
            if (!tError) tracksData = tData || [];
          }
        }
      }

      if (playlistData) {
        setPlaylist(playlistData);
        setTracksInPlaylist(tracksData);
      } else {
        setError('Playlist not found');
      }
    } catch (err: any) {
      console.error('Error fetching playlist:', err);
      setError(err.message || 'Error loading playlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylistData();
  }, [user, id]);

  if (userLoading || loading) {
    return (
      <SpotilarkLayout>
        <div className="flex-1 p-8 overflow-y-auto pb-24">
          <p>Loading...</p>
        </div>
      </SpotilarkLayout>
    );
  }

  if (!user) {
    return (
      <SpotilarkLayout>
        <div className="flex-1 p-8 overflow-y-auto pb-24">
          <p>Please sign in to view this playlist.</p>
        </div>
      </SpotilarkLayout>
    );
  }

  if (error || !playlist) {
    return (
      <SpotilarkLayout>
        <div className="flex-1 p-8 overflow-y-auto pb-24">
          <p>Playlist not found.</p>
        </div>
      </SpotilarkLayout>
    );
  }

  const existingSongIds = tracksInPlaylist.map(track => track.id);

  return (
    <SpotilarkLayout>
      <div className="flex-1 p-8 overflow-y-auto pb-24">
        <div className="mb-4">
          <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary gap-2" onClick={() => router.back()}>
            <ChevronLeft className="h-6 w-6" />
            Back
          </Button>
        </div>
        <div className="flex items-center gap-6 mb-8">
          <div className="relative w-48 h-48 flex-shrink-0 rounded-md overflow-hidden shadow-lg">
            <Image
              src={playlist.cover || 'https://placehold.co/300x300.png?text=Playlist'}
              alt={playlist.name || 'Playlist Cover'}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-sm font-medium text-muted-foreground">Playlist</h2>
                <h1 className="text-5xl font-bold mt-2 truncate">{playlist.name}</h1>
              </div>
              {playlist.id !== 'playing' && (
                <EditPlaylistDialog
                  playlist={playlist}
                  onPlaylistUpdated={fetchPlaylistData}
                />
              )}
            </div>
            <p className="text-muted-foreground mt-4 line-clamp-2">{playlist.description}</p>
            <p className="text-sm text-muted-foreground mt-2">{tracksInPlaylist.length} songs</p>
          </div>
        </div>

        {/* Add Songs Button */}
        {playlist.id !== 'playing' && (
          <div className="mb-8">
            <AddSongsToPlaylistDialog playlistId={playlist.id} existingSongIds={existingSongIds} />
          </div>
        )}

        {/* Song list will go here */}
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Songs in this Playlist</h2>
          {tracksInPlaylist.length > 0 ? (
            <ul>
              {tracksInPlaylist.map((track) => (
                <li key={track.id} className="flex items-center justify-between py-2 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Image
                      src={track.cover || 'https://placehold.co/50x50.png?text=Track'}
                      alt={track.title || 'Track Cover'}
                      width={50}
                      height={50}
                      className="rounded-md"
                    />
                    <div>
                      <p className="font-medium">{track.title}</p>
                      <p className="text-sm text-muted-foreground">{track.artist}</p>
                    </div>
                  </div>
                  {/* Add play/remove buttons here later */}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No songs in this playlist yet.</p>
          )}
        </div>
      </div>
    </SpotilarkLayout>
  );
}