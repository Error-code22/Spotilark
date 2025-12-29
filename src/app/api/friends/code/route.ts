import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateFriendCode } from '@/lib/friend-code';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Get current user
        let { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            // Fallback to getSession for better mobile reliability
            const { data: { session } } = await supabase.auth.getSession();
            user = session?.user || null;
        }

        if (!user) {
            console.error('POST FRIEND CODE: Unauthorized', authError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get username from metadata, or use a default from email
        const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user';

        // Check if user already has a friend code
        const { data: existingProfile } = await supabase
            .from('user_profiles')
            .select('friend_code')
            .eq('id', user.id)
            .single();

        if (existingProfile?.friend_code) {
            return NextResponse.json({ friend_code: existingProfile.friend_code });
        }

        // Generate a unique friend code
        let friendCode = generateFriendCode();
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 10) {
            const { data: existing } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('friend_code', friendCode)
                .single();

            if (!existing) {
                isUnique = true;
            } else {
                friendCode = generateFriendCode();
                attempts++;
            }
        }

        if (!isUnique) {
            return NextResponse.json({ error: 'Failed to generate unique code' }, { status: 500 });
        }

        // Update/Create user profile with friend code and username
        console.log('Attempting upsert for user:', user.id, 'with username:', username);
        const { error: updateError } = await supabase
            .from('user_profiles')
            .upsert({
                id: user.id,
                username: username,
                friend_code: friendCode,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'id'
            });

        if (updateError) {
            console.error('DATABASE ERROR updating friend code:', updateError);
            return NextResponse.json({
                error: 'Failed to save friend code',
                message: updateError.message,
                details: updateError.details,
                hint: updateError.hint
            }, { status: 500 });
        }

        return NextResponse.json({ friend_code: friendCode });
    } catch (error: any) {
        console.error('UNEXPECTED ERROR generating friend code:', error);
        return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Get current user
        let { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            // Fallback to getSession for better mobile reliability
            const { data: { session } } = await supabase.auth.getSession();
            user = session?.user || null;
        }

        if (!user) {
            console.error('GET FRIEND CODE: Unauthorized', authError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's friend code
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('friend_code')
            .eq('id', user.id)
            .maybeSingle(); // Better than .single() to avoid 406

        if (error) {
            console.error('DATABASE ERROR fetching friend code:', error);
            return NextResponse.json({
                error: 'Database error',
                message: error.message,
                details: error.details
            }, { status: 500 });
        }

        if (!profile?.friend_code) {
            // Generate one if it doesn't exist
            return POST(req);
        }

        return NextResponse.json({ friend_code: profile.friend_code });
    } catch (error: any) {
        console.error('UNEXPECTED ERROR fetching friend code:', error);
        return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 });
    }
}
