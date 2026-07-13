'use client';

import { useState, useEffect } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { createClient } from '@/lib/supabase/client';
import { UserPlus, Music } from 'lucide-react';

interface Friend {
  id: string;
  name: string;
  avatar_url: string | null;
  is_online: boolean;
  current_track: string | null;
}

export function FriendsSection() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentTrack, isPlaying } = usePlayer();

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('friends')
          .select('*')
          .eq('user_id', user.id);

        if (data) setFriends(data);
      } catch (err) {
        console.error('Failed to load friends:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg animate-pulse">
            <div className="h-10 w-10 bg-muted rounded-full" />
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-3 bg-muted rounded w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No friends yet. Connect with other listeners!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {friends.map((friend) => (
        <div
          key={friend.id}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {friend.avatar_url ? (
                <img src={friend.avatar_url} alt={friend.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-bold">{friend.name[0]}</span>
              )}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${friend.is_online ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{friend.name}</p>
            {friend.is_online && friend.current_track ? (
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <Music className="h-3 w-3" />
                {friend.current_track}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {friend.is_online ? 'Online' : 'Offline'}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
