import { createClient } from '@/lib/supabase/server';

interface Badge {
    type: string;
    name: string;
    description: string;
    icon: string;
}

const AVAILABLE_BADGES: Badge[] = [
    {
        type: 'early_adopter',
        name: 'Early Adopter',
        description: 'One of the first users of SpotiLark',
        icon: '🌟'
    },
    {
        type: 'music_hoarder',
        name: 'Music Hoarder',
        description: 'Has 500+ tracks in library',
        icon: '📚'
    },
    {
        type: 'social_butterfly',
        name: 'Social Butterfly',
        description: 'Has 10+ friends',
        icon: '🦋'
    },
    {
        type: 'night_owl',
        name: 'Night Owl',
        description: 'Most listening happens after midnight',
        icon: '🦉'
    },
    {
        type: 'playlist_curator',
        name: 'Playlist Curator',
        description: 'Created 20+ playlists',
        icon: '🎨'
    },
    {
        type: 'music_explorer',
        name: 'Music Explorer',
        description: 'Listens to diverse genres',
        icon: '🧭'
    }
];

/**
 * Check and award badges to a user based on their activity
 */
export async function checkAndAwardBadges(userId: string): Promise<Badge[]> {
    const supabase = await createClient();
    const earnedBadges: Badge[] = [];

    try {
        // Get user's track count
        const { count: trackCount } = await supabase
            .from('tracks')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        // Get user's friends count
        const { count: friendsCount } = await supabase
            .from('friends')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'accepted');

        // Get user's playlists count
        const { count: playlistsCount } = await supabase
            .from('playlists')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        // Check badge conditions
        if (trackCount && trackCount >= 500) {
            earnedBadges.push(AVAILABLE_BADGES.find(b => b.type === 'music_hoarder')!);
        }

        if (friendsCount && friendsCount >= 10) {
            earnedBadges.push(AVAILABLE_BADGES.find(b => b.type === 'social_butterfly')!);
        }

        if (playlistsCount && playlistsCount >= 20) {
            earnedBadges.push(AVAILABLE_BADGES.find(b => b.type === 'playlist_curator')!);
        }

        // Award early adopter to all users (for now)
        earnedBadges.push(AVAILABLE_BADGES.find(b => b.type === 'early_adopter')!);
        earnedBadges.push(AVAILABLE_BADGES.find(b => b.type === 'music_explorer')!);

        // Save badges to database
        for (const badge of earnedBadges) {
            await supabase
                .from('user_badges')
                .upsert({
                    user_id: userId,
                    badge_type: badge.type
                }, {
                    onConflict: 'user_id,badge_type'
                });
        }

        return earnedBadges;
    } catch (error) {
        console.error('Error checking badges:', error);
        return [];
    }
}

/**
 * Get user's earned badges
 */
export async function getUserBadges(userId: string): Promise<Badge[]> {
    const supabase = await createClient();

    try {
        const { data: userBadges } = await supabase
            .from('user_badges')
            .select('badge_type')
            .eq('user_id', userId);

        if (!userBadges) return [];

        return userBadges
            .map(ub => AVAILABLE_BADGES.find(b => b.type === ub.badge_type))
            .filter(Boolean) as Badge[];
    } catch (error) {
        console.error('Error fetching badges:', error);
        return [];
    }
}
