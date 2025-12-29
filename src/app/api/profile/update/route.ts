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

        const { username, bio, avatar_url } = await req.json();

        // 1. Update User Metadata (Supabase Auth)
        const { error: metadataError } = await supabase.auth.updateUser({
            data: {
                username: username?.trim(),
                bio: bio?.trim(),
                avatar_url: avatar_url
            }
        });

        if (metadataError) {
            console.error('Error updating metadata:', metadataError);
            return NextResponse.json({ error: 'Failed to update user metadata', message: metadataError.message }, { status: 500 });
        }

        // 2. Update user_profiles table
        const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert({
                id: user.id,
                username: username?.trim(),
                bio: bio?.trim(),
                profile_picture_url: avatar_url,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'id'
            });

        if (profileError) {
            console.error('Error updating user_profiles:', profileError);
            // We don't necessarily want to fail the whole request if the table update fails but metadata succeeded,
            // but in this app, the table is important for social features.
            return NextResponse.json({ error: 'Failed to update profile record', message: profileError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, user: { id: user.id, username, bio, avatar_url } });

    } catch (error: any) {
        console.error('Unexpected error in profile update:', error);
        return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 });
    }
}
