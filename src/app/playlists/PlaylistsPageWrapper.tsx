'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { usePlayer } from '@/context/PlayerContext';
import { SpotilarkLayout } from '@/components/spotilark-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart } from 'lucide-react';
import { CreatePlaylistDialog } from '@/components/create-playlist-dialog';
import { EditPlaylistDialog } from '@/components/edit-playlist-dialog';
import Image from 'next/image';
import Link from 'next/link';

interface Track {
  album: string;
  cover: string;
  id: string;
  title: string;
  artist: string;
}

interface Playlist {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  cover?: string;
  tracks?: Track[];
}

export default function PlaylistsPageWrapper() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, isLoading: userLoading } = useUser();
  const { likedTrackIds } = usePlayer();

  const fetchPlaylistsData = async () => {
    try {
      // Don't set loading to true on refresh to avoid flicker, only on initial load if needed
      if (playlists.length === 0) setLoading(true);
      setError(null);

      const supabase = createClient();

      // Fetch user's tracks
      const { data: tracks, error: tracksError } = await supabase
        .from('tracks')
        .select('album, cover, id, title, artist')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (tracksError) {
        throw new Error(tracksError.message);
      }

      // Fetch user's playlists
      const { data: userPlaylists, error: playlistsError } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (playlistsError) {
        throw new Error(playlistsError.message);
      }

      // Create the special "Playing" playlist with all user's tracks
      const playingPlaylist: Playlist = {
        id: 'playing',
        title: 'Playing',
        description: 'All your uploaded music',
        cover: 'https://placehold.co/300x300/1DB954/ffffff.png?text=Playing&font=montserrat', // Custom text cover
        tracks: tracks || [],
      };

      // Combine the "Playing" playlist with user's playlists
      const allPlaylists = [playingPlaylist, ...(userPlaylists || [])];
      setPlaylists(allPlaylists);
    } catch (err: any) {
      console.error('Error fetching playlists:', err);
      setError(err.message || 'Error loading playlists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchPlaylistsData();
  }, [user]);

  if (userLoading) {
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
          <p>Please sign in to view your playlists.</p>
        </div>
      </SpotilarkLayout>
    );
  }

  if (error) {
    return (
      <SpotilarkLayout>
        <div className="flex-1 p-8 overflow-y-auto pb-24">
          <p>Error: {error}</p>
        </div>
      </SpotilarkLayout>
    );
  }

  if (loading) {
    return (
      <SpotilarkLayout>
        <div className="flex-1 p-8 overflow-y-auto pb-24">
          <p>Loading playlists...</p>
        </div>
      </SpotilarkLayout>
    );
  }

  return (
    <SpotilarkLayout>
      <div className="flex-1 p-8 overflow-y-auto pb-24">
        <h1 className="text-4xl font-bold mb-8">Playlists</h1>

        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Your Library</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <Link href="/playlists/liked-songs">
              <Card className="hover:bg-accent transition-colors h-full flex flex-col justify-between">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Liked Songs</CardTitle>
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{likedTrackIds.size} songs</div>
                  <p className="text-xs text-muted-foreground">
                    Your favorite tracks
                  </p>
                </CardContent>
              </Card>
            </Link>
            <CreatePlaylistDialog onPlaylistCreated={fetchPlaylistsData} />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">All Playlists</h2>
          <p className="mt-2 text-muted-foreground">Your curated collections of music.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-8">
            {playlists.map((playlist) => (
              <Card key={playlist.id} className="hover:bg-accent transition-colors block group">
                <Link href={`/playlist?id=${playlist.id}`}>
                  <CardHeader className="p-0">
                    <div className="relative aspect-square w-full rounded-t-lg overflow-hidden">
                      <Image
                        src={playlist.cover || 'https://placehold.co/300x300.png?text=Playlist'}
                        alt={playlist.name || playlist.title || 'Playlist'}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg truncate">{playlist.name || playlist.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{playlist.description || 'No description'}</p>
                  </CardContent>
                </Link>
                {playlist.id !== 'playing' && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <EditPlaylistDialog playlist={{
                      id: playlist.id,
                      name: playlist.name || playlist.title || '',
                      description: playlist.description || '',
                      cover: playlist.cover || '',
                    }} />
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </SpotilarkLayout>
  );
}