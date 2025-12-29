import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserBadges, checkAndAwardBadges } from '@/lib/badge-system';

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

        // Check for new badges
        await checkAndAwardBadges(user.id);

        // Get all badges
        const badges = await getUserBadges(user.id);
        return NextResponse.json({ badges });
    } catch (error: any) {
        console.error('Error in badges API:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
