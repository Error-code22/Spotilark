'use client';

import { ReactNode, useState, useEffect, useCallback } from 'react';
import { PlayerProvider } from '@/context/PlayerContext';
import { Track } from '@/lib/data';
import { createClient } from '@/lib/supabase/client';

interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  const [tracks, setTracks] = useState<Track[]>([]);

  const fetchTracks = useCallback(async () => {
    try {
      const supabase = createClient();
      
      // Get current user to filter tracks
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        // No authenticated user is normal when not logged in
        setTracks([]);
        return;
      }

      // Fetch tracks for the current user only
      const { data, error, status } = await supabase
        .from("tracks")
        .select("*")
        .eq('user_id', user.id);  // Filter by the logged-in user

      // If there's an authentication error (status 401/403), return empty array
      if (error && (status === 401 || status === 403)) {
        console.warn("Authentication required for tracks, returning empty list:", error?.message || error);
        setTracks([]);
        return;
      }

      if (error) {
        // Handle the case where the table doesn't exist (likely during development)
        if (error.code === '42P01') { // 42P01 is the PostgreSQL error code for "undefined table"
          console.warn('tracks table does not exist. Returning empty tracks list.');
          setTracks([]);
          return;
        } else {
          console.error("Error fetching tracks:", error?.message || error);
          setTracks([]);
          return;
        }
      }

      // Map audio_url to source_url if it exists but source_url doesn't
      const mappedData = data?.map(track => ({
        ...track,
        source_url: track.source_url || track.audio_url || track.source || '',
        created_by: track.user_id || '' // Map user_id to created_by for the interface
      })) || [];

      setTracks(mappedData);
    } catch (error: any) {
      console.error("Error fetching tracks:", error?.message || error);
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
    <PlayerProvider tracks={tracks} refetch={fetchTracks}>
      {children}
    </PlayerProvider>
  );
}