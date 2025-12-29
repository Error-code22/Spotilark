import { createClient } from '@/lib/supabase/server';

interface MoodTag {
    tag: string;
    confidence: number;
}

/**
 * Analyze user's listening habits and generate mood tags
 */
export async function analyzeMoodTags(userId: string): Promise<MoodTag[]> {
    const supabase = await createClient();
    const tags: MoodTag[] = [];

    try {
        // Get user's tracks
        const { data: tracks } = await supabase
            .from('tracks')
            .select('*')
            .eq('user_id', userId)
            .limit(100);

        if (!tracks || tracks.length === 0) {
            return [{ tag: 'Getting Started', confidence: 1.0 }];
        }

        // Analyze genres/artists
        const genres = new Set(tracks.map(t => t.album).filter(Boolean));
        const artists = new Set(tracks.map(t => t.artist).filter(Boolean));

        // Generate tags based on library size and diversity
        if (tracks.length > 100) {
            tags.push({ tag: 'Active Listener', confidence: 0.9 });
        }

        if (artists.size > 50) {
            tags.push({ tag: 'Diverse Tastes', confidence: 0.85 });
        }

        if (tracks.length > 20 && tracks.length < 50) {
            tags.push({ tag: 'Curated Collection', confidence: 0.8 });
        }

        // Default tags
        if (tags.length === 0) {
            tags.push({ tag: 'Music Lover', confidence: 0.7 });
        }

        // Save tags to database
        for (const tag of tags) {
            await supabase
                .from('user_mood_tags')
                .upsert({
                    user_id: userId,
                    tag: tag.tag,
                    confidence: tag.confidence,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,tag'
                });
        }

        return tags;
    } catch (error) {
        console.error('Error analyzing mood tags:', error);
        return [{ tag: 'Music Enthusiast', confidence: 0.5 }];
    }
}

/**
 * Get user's mood tags
 */
export async function getUserMoodTags(userId: string): Promise<string[]> {
    const supabase = await createClient();

    try {
        const { data: moodTags } = await supabase
            .from('user_mood_tags')
            .select('tag')
            .eq('user_id', userId)
            .order('confidence', { ascending: false });

        if (!moodTags || moodTags.length === 0) {
            // Generate them if they don't exist
            const generated = await analyzeMoodTags(userId);
            return generated.map(t => t.tag);
        }

        return moodTags.map(mt => mt.tag);
    } catch (error) {
        console.error('Error fetching mood tags:', error);
        return ['Music Lover'];
    }
}
