import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isValidFriendCode } from '@/lib/friend-code';

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
            console.error('ADD FRIEND: Unauthorized', authError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { friend_code } = await req.json();

        if (!friend_code || !isValidFriendCode(friend_code)) {
            return NextResponse.json({ error: 'Invalid friend code format' }, { status: 400 });
        }

        // Find user with this friend code
        const { data: friendProfile, error: findError } = await supabase
            .from('user_profiles')
            .select('id, username')
            .eq('friend_code', friend_code)
            .single();

        if (findError || !friendProfile) {
            return NextResponse.json({ error: 'Friend code not found' }, { status: 404 });
        }

        // Check if trying to add yourself
        if (friendProfile.id === user.id) {
            return NextResponse.json({ error: 'Cannot add yourself as a friend' }, { status: 400 });
        }

        // Check if already friends or request exists
        const { data: existing } = await supabase
            .from('friends')
            .select('*')
            .or(`and(user_id.eq.${user.id},friend_id.eq.${friendProfile.id}),and(user_id.eq.${friendProfile.id},friend_id.eq.${user.id})`)
            .single();

        if (existing) {
            return NextResponse.json({
                error: existing.status === 'accepted' ? 'Already friends' : 'Friend request already sent'
            }, { status: 400 });
        }

        // Create friend request
        const { error: insertError } = await supabase
            .from('friends')
            .insert({
                user_id: user.id,
                friend_id: friendProfile.id,
                status: 'pending'
            });

        if (insertError) {
            console.error('Error creating friend request:', insertError);
            return NextResponse.json({ error: 'Failed to send friend request' }, { status: 500 });
        }

        return NextResponse.json({
            message: 'Friend request sent successfully',
            friend: {
                id: friendProfile.id,
                username: friendProfile.username
            }
        });
    } catch (error: any) {
        console.error('Error adding friend:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
