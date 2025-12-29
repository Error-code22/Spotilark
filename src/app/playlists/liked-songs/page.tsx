'use client';

import { useState, useEffect } from 'react';
import { SpotilarkLayout } from "@/components/spotilark-layout";
import Image from 'next/image';
import { Play, Pause } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { useUser } from '@/hooks/useUser';

import type { Track } from '@/lib/data';

export default function LikedSongsPage() {
  const { user } = useUser();
  const { currentTrack, isPlaying, playTrack, unifiedLibrary } = usePlayer();
  const [likedSongs, setLikedSongs] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load liked songs from localStorage and match with available tracks
    const loadLikedSongs = () => {
      try {
        const likedTrackIds = JSON.parse(localStorage.getItem('likedSongs') || '[]');

        // Find the tracks in the unified library that match the liked IDs
        const likedTracks = unifiedLibrary.filter(track =>
          likedTrackIds.includes(track.id)
        );

        setLikedSongs(likedTracks);
      } catch (err) {
        console.error('Error loading liked songs:', err);
        setLikedSongs([]);
      } finally {
        setLoading(false);
      }
    };

    loadLikedSongs();
  }, [unifiedLibrary]);

  if (loading) {
    return (
      <SpotilarkLayout>
        <div className="flex-1 p-8 overflow-y-auto pb-24">
          <h1 className="text-4xl font-bold mb-8">Liked Songs</h1>
          <p>Loading liked songs...</p>
        </div>
      </SpotilarkLayout>
    );
  }

  if (!user) {
    return (
      <SpotilarkLayout>
        <div className="flex-1 p-8 overflow-y-auto pb-24">
          <h1 className="text-4xl font-bold mb-8">Liked Songs</h1>
          <p>Please sign in to view your liked songs.</p>
        </div>
      </SpotilarkLayout>
    );
  }

  return (
    <SpotilarkLayout>
      <div className="flex-1 p-8 overflow-y-auto pb-24">
        <h1 className="text-4xl font-bold mb-8">Liked Songs ({likedSongs.length})</h1>

        {likedSongs.length > 0 ? (
          <div className="space-y-2">
            {likedSongs.map((track) => (
              <div
                key={track.id}
                className={`flex items-center gap-4 p-3 rounded-md hover:bg-accent transition-colors ${currentTrack?.id === track.id ? 'bg-primary/10' : ''}`}
              >
                <div className="relative w-10 h-10 flex-shrink-0">
                  <Image
                    src={track.cover || 'https://placehold.co/40x40.png?text=♪'}
                    alt={track.title || 'Track Cover'}
                    fill
                    className="object-cover rounded-md"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${currentTrack?.id === track.id ? 'text-primary' : ''}`}>
                    {track.title}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {track.artist || 'Unknown Artist'} • {track.album || 'Unknown Album'}
                  </p>
                </div>
                <button
                  onClick={() => playTrack(track)}
                  className="p-2 rounded-full hover:bg-accent"
                >
                  {currentTrack?.id === track.id && isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </button>
                <span className="text-sm text-muted-foreground">
                  {track.duration ? new Date(track.duration * 1000).toISOString().substring(14, 19) : '0:00'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">You haven't liked any songs yet.</p>
        )}
      </div>
    </SpotilarkLayout>
  );
}
