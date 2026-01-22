'use client';

import { ReactNode, useState, useEffect, useCallback } from 'react';
import { PlayerProvider } from '@/context/PlayerContext';
import { Track } from '@/lib/data';
import { createClient } from '@/lib/supabase/client';
import { UploadProvider } from '@/context/UploadContext';
import { DeviceProvider } from '@/context/DeviceContext';

interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  const [tracks, setTracks] = useState<Track[]>([]);

  const fetchTracks = useCallback(async () => {
    try {
      const supabase = createClient();

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setTracks([]);
        return;
      }

      const { data, error, status } = await supabase
        .from("tracks")
        .select("*")
        .eq('user_id', user.id);

      if (error && (status === 401 || status === 403)) {
        setTracks([]);
        return;
      }

      if (error) {
        if (error.code === '42P01') {
          setTracks([]);
          return;
        } else {
          setTracks([]);
          return;
        }
      }

      const mappedData = data?.map(track => ({
        ...track,
        source_url: track.source_url || track.audio_url || track.source || '',
        created_by: track.user_id || ''
      })) || [];

      setTracks(mappedData);
    } catch (error: any) {
      setTracks([]);
    }
  }, []);

  useEffect(() => {
    fetchTracks();

    const supabase = createClient();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        fetchTracks();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchTracks]);

  return (
    <DeviceProvider>
      <PlayerProvider tracks={tracks} refetch={fetchTracks}>
        <UploadProvider>
          {children}
        </UploadProvider>
      </PlayerProvider>
    </DeviceProvider>
  );
}