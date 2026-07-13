import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const authClient = await createServerClient();
        let { data: { user }, error: authError } = await authClient.auth.getUser();

        if (authError || !user) {
            const { data: { session } } = await authClient.auth.getSession();
            user = session?.user || null;
        }

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log(`[ClearTracks] Clearing all tracks for user: ${user.id}`);

        // Delete all tracks belonging to this user
        const { data, error } = await adminClient
            .from('tracks')
            .delete()
            .eq('user_id', user.id)
            .select();

        if (error) {
            console.error('[ClearTracks] Delete error:', error);
            // Try with created_by column as fallback
            const { data: data2, error: error2 } = await adminClient
                .from('tracks')
                .delete()
                .eq('created_by', user.id)
                .select();

            if (error2) {
                console.error('[ClearTracks] Fallback delete also failed:', error2);
                return NextResponse.json({ error: error2.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, deleted: data2?.length || 0 });
        }

        return NextResponse.json({ success: true, deleted: data?.length || 0 });
    } catch (error: any) {
        console.error('[ClearTracks] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
