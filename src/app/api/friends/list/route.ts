import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
            console.error('LIST FRIENDS: Unauthorized', authError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all friends (accepted requests)
        const { data: friends, error } = await supabase
            .from('friends')
            .select(`
        id,
        status,
        created_at,
        friend:user_profiles!friends_friend_id_fkey(id, username, profile_picture_url)
      `)
            .eq('user_id', user.id)
            .eq('status', 'accepted');

        if (error) {
            console.error('Error fetching friends:', error);
            return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 });
        }

        return NextResponse.json({ friends: friends || [] });
    } catch (error: any) {
        console.error('Error in friends list:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
