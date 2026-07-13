import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase env vars not configured');
    return require("@supabase/supabase-js").createClient(url, key);
}

export async function POST(req: NextRequest) {
    try {
        const supabase = getSupabase();
        const formData = await req.formData();
        const file = formData.get("cookies") as File | null;
        const userId = formData.get("userId") as string || "default";

        if (!file) {
            return NextResponse.json({ error: "No cookies file provided" }, { status: 400 });
        }

        const text = await file.text();

        if (!text.includes("# Netscape HTTP Cookie File") && !text.includes("#HttpOnly_") && !text.includes("\tTRUE\t")) {
            return NextResponse.json({
                error: "Invalid cookies file. Please export using 'Get cookies.txt LOCALLY' browser extension."
            }, { status: 400 });
        }

        const lineCount = text.split("\n").filter(l => l.trim() && !l.startsWith("#")).length;

        const { error } = await supabase
            .from('youtube_cookies')
            .upsert({
                user_id: userId,
                cookie_content: text,
                entry_count: lineCount,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) {
            console.error("[YouTube Cookies] Supabase error:", error);
            return NextResponse.json({ error: "Failed to save cookies to database" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `YouTube cookies saved (${lineCount} entries)`,
            hasCookies: true,
            entryCount: lineCount,
        });
    } catch (error: any) {
        console.error("[YouTube Cookies] Upload error:", error);
        return NextResponse.json({ error: "Failed to save cookies" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const supabase = getSupabase();
        const userId = req.nextUrl.searchParams.get("userId") || "default";

        const { data, error } = await supabase
            .from('youtube_cookies')
            .select('entry_count')
            .eq('user_id', userId)
            .single();

        if (error || !data) {
            return NextResponse.json({ hasCookies: false });
        }

        return NextResponse.json({ hasCookies: true, entryCount: data.entry_count });
    } catch {
        return NextResponse.json({ hasCookies: false });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const supabase = getSupabase();
        const userId = req.nextUrl.searchParams.get("userId") || "default";

        const { error } = await supabase
            .from('youtube_cookies')
            .delete()
            .eq('user_id', userId);

        if (error) {
            return NextResponse.json({ error: "Failed to delete cookies" }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Cookies deleted" });
    } catch {
        return NextResponse.json({ error: "Failed to delete cookies" }, { status: 500 });
    }
}
