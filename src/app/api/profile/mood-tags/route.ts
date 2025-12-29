import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserMoodTags } from '@/lib/mood-analyzer';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        // Get current user with fallback
        let { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            const { data: { session } } = await supabase.auth.getSession();
            user = session?.user || null;
        }

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tags = await getUserMoodTags(user.id);
        return NextResponse.json({ tags });
    } catch (error: any) {
        console.error('Error in mood-tags API:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
