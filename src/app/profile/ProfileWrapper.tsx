'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { usePlayer } from '@/context/PlayerContext';
import { SpotilarkLayout } from '@/components/spotilark-layout';
import { useSettings } from '@/context/SettingsContext';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Headphones, ListMusic, Music, Pencil, User, Tag, Flame, BarChart, History, Download, Album, Palette, Image as ImageIcon, Share2, LogOut, Cloud, Heart, Settings, Users } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';
import { FriendsSection } from '@/components/profile/FriendsSection';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function ProfilePageWrapper() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const { likedTrackIds, currentTrack } = usePlayer();
  const { showRecentlyPlayed } = useSettings();

  const { user: authUser, isLoading: userLoading } = useUser();
  const [userStats, setUserStats] = useState<any>(null);
  const [userCollections, setUserCollections] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [deleteStep, setDeleteStep] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (!authUser && !userLoading) {
        router.push('/login');
      } else if (authUser) {
        setUser(authUser);
      }
      setLoading(false);
    };

    checkAuth();
  }, [authUser, userLoading, router]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (authUser) {
        setLoadingStats(true);
        setLoadingCollections(true);

        try {
          const { data: statsData, error: statsError } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', authUser.id)
            .maybeSingle();

          if (statsError) {
            console.error('Error fetching user stats:', statsError);
          } else {
            setUserStats(statsData || {
              total_minutes_listened: 0,
              songs_played: 0,
              top_artist: 'No data',
              top_genre: 'No data',
              listening_streak: 0
            });
          }

          const { data: playlists, error: playlistsError } = await supabase
            .from('playlists')
            .select('*')
            .eq('user_id', authUser.id);

          if (playlistsError) {
            console.error('Error fetching playlists:', playlistsError);
          } else {
            const collectionsData = [
              {
                name: "Playlists",
                icon: ListMusic,
                count: playlists?.length || 0,
                cover: playlists?.[0]?.cover || '/SL.png'
              },
              {
                name: "Liked Songs",
                icon: Heart,
                count: likedTrackIds.size,
                cover: '/SL.png'
              }
            ];
            setUserCollections(collectionsData);
          }

          // Fetch mood tags and badges via API
          const moodRes = await fetch('/api/profile/mood-tags');
          if (moodRes.ok) {
            const moodData = await moodRes.json();
            setMoodTags(moodData.tags || []);
          }

          const badgesRes = await fetch('/api/profile/badges');
          if (badgesRes.ok) {
            const badgesData = await badgesRes.json();
            setBadges(badgesData.badges || []);
          }

        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setLoadingStats(false);
          setLoadingCollections(false);
        }
      }
    };

    fetchUserData();
  }, [authUser, supabase, likedTrackIds.size, refreshTrigger]);

  if (loading || userLoading) {
    return (
      <SpotilarkLayout>
        <div className='flex-1 p-8 overflow-y-auto pb-24'>
          <p>Loading...</p>
        </div>
      </SpotilarkLayout>
    );
  }

  if (!authUser) {
    return (
      <SpotilarkLayout>
        <div className='flex-1 p-8 overflow-y-auto pb-24'>
          <p>Redirecting to login...</p>
        </div>
      </SpotilarkLayout>
    );
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleShareProfile = async () => {
    const profileUrl = `${window.location.origin}/profile/${authUser.user_metadata?.username || authUser.id}`;
    const shareText = `Check out my SpotiLark profile! @${authUser.user_metadata?.username || 'user'}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My SpotiLark Profile',
          text: shareText,
          url: profileUrl
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') console.error('Error sharing:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(profileUrl);
        alert('Profile link copied to clipboard!');
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' });
      if (res.ok) {
        await supabase.auth.signOut();
        router.push('/login');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete account');
      }
    } catch (e) {
      console.error(e);
      alert('Network error deleting account');
    } finally {
      setIsDeleting(false);
      setDeleteStep(0);
    }
  };

  const handleExportData = async () => {
    try {
      const { data: tracks } = await supabase.from('tracks').select('*').eq('user_id', authUser.id);
      const { data: playlists } = await supabase.from('playlists').select('*').eq('user_id', authUser.id);

      const exportData = {
        profile: {
          username: authUser.user_metadata?.username,
          bio: authUser.user_metadata?.bio,
          email: authUser.email,
          joined: authUser.created_at
        },
        tracks: tracks || [],
        playlists: playlists || [],
        stats: userStats,
        exported_at: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spotilark_data_${authUser.user_metadata?.username || 'user'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
      alert('Failed to export data');
    }
  };

  return (
    <SpotilarkLayout>
      <div className='flex-1 p-8 overflow-y-auto pb-24'>
        <div className='p-4 md:p-6 flex flex-row items-center gap-4 md:gap-6'>
          <Avatar className='h-20 w-20 md:h-32 md:w-32 shrink-0'>
            <AvatarImage src={authUser.user_metadata?.avatar_url} alt={authUser.user_metadata?.name || 'User'} />
            <AvatarFallback>{authUser.user_metadata?.name ? authUser.user_metadata?.name.charAt(0) : 'U'}</AvatarFallback>
          </Avatar>
          <div className='flex-1 text-left'>
            <div className='flex items-center gap-2 flex-wrap'>
              <h1 className='text-xl md:text-3xl font-bold leading-tight'>{authUser.user_metadata?.name || authUser.email}</h1>
              <Button variant='ghost' size='icon' className='rounded-full h-8 w-8' onClick={() => setEditDialogOpen(true)}>
                <Pencil className='h-3.5 w-3.5' />
              </Button>
            </div>
            <p className='text-muted-foreground text-xs md:text-sm'>@{authUser.user_metadata?.username || 'username'}</p>
            {authUser.user_metadata?.bio && (
              <p className='text-muted-foreground mt-1 text-xs md:text-base line-clamp-2 md:line-clamp-none max-w-md'>{authUser.user_metadata.bio}</p>
            )}
            <p className='text-muted-foreground mt-0.5 text-xs md:text-sm'>
              Joined {new Date(authUser.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <h2 className='text-2xl font-bold mt-8 mb-4'>Listening Stats</h2>
        {loadingStats ? (
          <div className='grid gap-4 grid-cols-2 mb-8'>
            {[...Array(4)].map((_, i) => (
              <div key={i} className='p-4 rounded-lg border'>
                <div className='flex flex-row items-center justify-between space-y-0 pb-2 bg-muted h-20 animate-pulse rounded' />
              </div>
            ))}
          </div>
        ) : (
          <div className='grid gap-4 grid-cols-2 mb-8'>
            <div className='p-4 rounded-lg border'>
              <div className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <p className='text-sm font-medium'>Total Minutes Listened</p>
                <Headphones className='h-4 w-4 text-muted-foreground' />
              </div>
              <div className='text-2xl font-bold'>{userStats?.total_minutes_listened ? Math.floor(userStats.total_minutes_listened / 60) + ' hrs' : '0 hrs'}</div>
            </div>
            <div className='p-4 rounded-lg border'>
              <div className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <p className='text-sm font-medium'>Songs Played</p>
                <Music className='h-4 w-4 text-muted-foreground' />
              </div>
              <div className='text-2xl font-bold'>{userStats?.songs_played || 0}</div>
            </div>
            <div className='p-4 rounded-lg border'>
              <div className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <p className='text-sm font-medium'>Top Artist</p>
                <User className='h-4 w-4 text-muted-foreground' />
              </div>
              <div className='text-2xl font-bold truncate' title={userStats?.top_artist}>{showRecentlyPlayed ? (userStats?.top_artist || 'None') : 'Hidden'}</div>
            </div>
            <div className='p-4 rounded-lg border'>
              <div className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <p className='text-sm font-medium'>Top Genre</p>
                <Tag className='h-4 w-4 text-muted-foreground' />
              </div>
              <div className='text-2xl font-bold truncate' title={userStats?.top_genre}>{showRecentlyPlayed ? (userStats?.top_genre || 'None') : 'Hidden'}</div>
            </div>
          </div>
        )}

        <h2 className='text-2xl font-bold mt-8 mb-4'>Collections & Lists</h2>
        {loadingCollections ? (
          <div className='flex overflow-x-auto gap-4 p-2 -mx-2'>
            {[...Array(2)].map((_, i) => (
              <div key={i} className='min-w-[160px] w-[160px] p-4 rounded-lg border flex flex-col items-center animate-pulse'>
                <div className='w-24 h-24 bg-muted rounded-md mb-2' />
                <div className='h-4 w-20 bg-muted rounded mb-1' />
                <div className='h-3 w-12 bg-muted rounded' />
              </div>
            ))}
          </div>
        ) : (
          <div className='flex overflow-x-auto gap-4 p-2 -mx-2'>
            {userCollections.map((collection) => {
              const IconComponent = collection.icon;
              return (
                <div key={collection.name} className='min-w-[160px] w-[160px] p-4 rounded-lg border flex flex-col items-center hover:bg-accent/50 transition-colors cursor-pointer'>
                  <div className='w-24 h-24 rounded-md mb-2 bg-primary/10 flex items-center justify-center'>
                    <IconComponent className='h-12 w-12 text-primary' />
                  </div>
                  <p className='text-sm font-medium text-center'>{collection.name}</p>
                  <p className='text-xs text-muted-foreground mt-1'>{collection.count} items</p>
                </div>
              );
            })}
          </div>
        )}

        <h2 className='text-2xl font-bold mt-8 mb-4'>Customization & Personality</h2>
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8'>
          <div className='p-4 rounded-lg border'>
            <h3 className='text-lg font-bold mb-2'>Profile Theme</h3>
            <div className='flex items-center gap-2'>
              <Palette className='h-5 w-5 text-muted-foreground' />
              <p>Accent Color: <span className='font-semibold'>Blue</span></p>
            </div>
          </div>
          <div className='md:col-span-1 p-4 rounded-lg border'>
            <h3 className='text-lg font-bold mb-2'>Mood Tags</h3>
            <div className='flex flex-wrap gap-2'>
              {moodTags.length > 0 ? moodTags.map((tag) => (
                <span key={tag} className='bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium'>{tag}</span>
              )) : <p className='text-xs text-muted-foreground'>Listen more to get tags!</p>}
            </div>
          </div>
          <div className='md:col-span-2 lg:col-span-1 p-4 rounded-lg border'>
            <h3 className='text-lg font-bold mb-2'>Badges & Achievements</h3>
            <div className='flex flex-wrap gap-2'>
              {badges.length > 0 ? badges.map((badge: any) => (
                <div key={badge.type} className='flex items-center gap-2 bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-sm font-medium' title={badge.description}>
                  <span>{badge.icon}</span>
                  <span>{badge.name}</span>
                </div>
              )) : <p className='text-xs text-muted-foreground'>Listen more to earn badges!</p>}
            </div>
          </div>

          <div className='md:col-span-3 p-4 rounded-lg border bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='text-lg font-bold mb-1 flex items-center gap-2'>
                  <Flame className='h-5 w-5 text-orange-500' />
                  Spotilark Wrapped
                </h3>
                <p className='text-sm text-muted-foreground'>Your musical journey, summarized. Coming soon!</p>
              </div>
              <Button variant='outline' size='sm' className='border-purple-500 text-purple-500 hover:bg-purple-500/10' disabled>
                Notify Me
              </Button>
            </div>
          </div>
        </div>

        <h2 className='text-2xl font-bold mt-8 mb-4'>Friends & Social</h2>
        <FriendsSection />

        <h2 className='text-2xl font-bold mt-8 mb-4'>Functional Shortcuts</h2>
        <div className='grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-3 mb-8'>
          <div className='p-4 rounded-lg border'>
            <h3 className='text-lg font-bold mb-2'>Share Profile</h3>
            <Button variant='ghost' className='w-full' onClick={handleShareProfile}>
              <Share2 className='h-4 w-4 mr-2' /> Share Profile
            </Button>
          </div>
          <div className='p-4 rounded-lg border'>
            <h3 className='text-lg font-bold mb-2'>Account Settings</h3>
            <Button variant='ghost' className='w-full' onClick={() => router.push('/settings')}>
              <Settings className='h-4 w-4 mr-2' /> Settings
            </Button>
          </div>
          <div className='p-4 rounded-lg border'>
            <h3 className='text-lg font-bold mb-2'>Data Portability</h3>
            <Button variant='ghost' className='w-full' onClick={handleExportData}>
              <Download className='h-4 w-4 mr-2' /> Download Data (JSON)
            </Button>
          </div>
          <div className='p-4 rounded-lg border'>
            <h3 className='text-lg font-bold mb-2'>Logout</h3>
            <Button variant='ghost' className='w-full text-red-500 hover:bg-red-500/10' onClick={handleLogout}>
              <LogOut className='h-4 w-4 mr-2' /> Logout
            </Button>
          </div>
          <div className='col-span-2 lg:col-span-1 p-4 rounded-lg border border-red-500/20'>
            <h3 className='text-lg font-bold mb-2 text-red-500'>Danger Zone</h3>
            <Button
              variant='outline'
              className='w-full border-red-500 text-red-500 hover:bg-red-500/10'
              onClick={() => setDeleteStep(1)}
            >
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      <EditProfileDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        currentUser={authUser}
        onProfileUpdated={() => {
          setRefreshTrigger(prev => prev + 1);
          window.location.reload();
        }}
      />

      <AlertDialog open={deleteStep > 0} onOpenChange={(open) => !open && setDeleteStep(0)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteStep === 1 ? "Are you sure?" : "Final warning: This is permanent!"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteStep === 1
                ? "This action cannot be undone. All your tracks, playlists, and profile data will be permanently removed."
                : "Are you absolutely 100% sure? You will lose ALL access to your Spotilark account and data forever."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={(e) => {
                e.preventDefault();
                if (deleteStep === 1) setDeleteStep(2);
                else handleDeleteAccount();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : (deleteStep === 1 ? "Continue" : "Delete My Account")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SpotilarkLayout>
  );
}