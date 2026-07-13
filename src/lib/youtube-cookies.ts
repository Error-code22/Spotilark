import { writeFile, access, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const cookieDir = join(tmpdir(), "spotilark-cookies");
const COOKIE_FILE = join(cookieDir, "youtube-cookies.txt");

let cachedCookies: { content: string; expires: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function ensureCookieDir() {
    await mkdir(cookieDir, { recursive: true });
}

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return require("@supabase/supabase-js").createClient(url, key);
}

export async function getYouTubeCookiePath(): Promise<string | null> {
    try {
        if (cachedCookies && cachedCookies.expires > Date.now()) {
            try { await access(COOKIE_FILE); return COOKIE_FILE; } catch {}
        }

        const supabase = getSupabase();
        if (!supabase) return null;

        const { data, error } = await supabase
            .from('youtube_cookies')
            .select('cookie_content')
            .eq('user_id', 'default')
            .single();

        if (error || !data?.cookie_content) {
            const legacyPath = join(cookieDir, "youtube-default.txt");
            try { await access(legacyPath); return legacyPath; } catch {}
            return null;
        }

        await ensureCookieDir();
        await writeFile(COOKIE_FILE, data.cookie_content, "utf-8");

        cachedCookies = { content: data.cookie_content, expires: Date.now() + CACHE_TTL };

        console.log(`[YouTube] Loaded cookies from Supabase`);
        return COOKIE_FILE;
    } catch (e: any) {
        console.log(`[YouTube] Failed to load cookies: ${e.message}`);
        return null;
    }
}

export async function getYtDlpCookieArgs(): Promise<Record<string, any>> {
    const cookiePath = await getYouTubeCookiePath();
    if (cookiePath) {
        console.log(`[YouTube] Using authenticated cookies`);
        return { cookies: cookiePath };
    }
    return {};
}
