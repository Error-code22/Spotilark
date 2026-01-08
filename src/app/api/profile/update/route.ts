import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Get current user with fallback
        let { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            const { data: { session } } = await supabase.auth.getSession();
            user = session?.user || null;
        }

        if (!user) {
            console.error('PROFILE UPDATE: Unauthorized');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { username, bio, avatar_seed, avatar_rolls_remaining, avatar_last_refresh } = await req.json();
        const trimmedUsername = username?.trim();

        // 1. Check if username is already taken by another user
        if (trimmedUsername) {
            const { data: existingUser, error: checkError } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('username', trimmedUsername)
                .neq('id', user.id)
                .maybeSingle();

            if (existingUser) {
                return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
            }
        }

        // 2. Update User Metadata (Supabase Auth) - username, bio, avatar seed, and roll data
        const { error: metadataError } = await supabase.auth.updateUser({
            data: {
                username: trimmedUsername,
                bio: bio?.trim(),
                avatar_seed: avatar_seed || user.id,
                avatar_rolls_remaining: avatar_rolls_remaining !== undefined ? avatar_rolls_remaining : 11,
                avatar_last_refresh: avatar_last_refresh || new Date().toISOString()
            }
        });

        if (metadataError) {
            console.error('Error updating metadata:', metadataError);
            return NextResponse.json({ error: 'Failed to update user metadata', message: metadataError.message }, { status: 500 });
        }

        console.log('[Profile Update] SUCCESS - Profile updated for user:', user.id);

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: trimmedUsername,
                bio,
                avatar_seed,
                avatar_rolls_remaining,
                avatar_last_refresh
            }
        });

    } catch (error: any) {
        console.error('Unexpected error in profile update:', error);
        return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 });
    }
}
