import { writeFile, access, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { createClient } from "@supabase/supabase-js";

const cookieDir = join(tmpdir(), "spotilark-cookies");
const COOKIE_FILE = join(cookieDir, "youtube-cookies.txt");

// Cache to avoid hitting Supabase on every request
let cachedCookies: { content: string; expires: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function ensureCookieDir() {
    await mkdir(cookieDir, { recursive: true });
}

export async function getYouTubeCookiePath(): Promise<string | null> {
    try {
        // Check if cached cookies are still valid
        if (cachedCookies && cachedCookies.expires > Date.now()) {
            try {
                await access(COOKIE_FILE);
                return COOKIE_FILE;
            } catch {}
        }

        // Fetch from Supabase
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data, error } = await supabase
            .from('youtube_cookies')
            .select('cookie_content')
            .eq('user_id', 'default')
            .single();

        if (error || !data?.cookie_content) {
            // Check legacy filesystem location
            const legacyPath = join(cookieDir, "youtube-default.txt");
            try {
                await access(legacyPath);
                return legacyPath;
            } catch {}
            return null;
        }

        // Write to temp file for yt-dlp
        await ensureCookieDir();
        await writeFile(COOKIE_FILE, data.cookie_content, "utf-8");

        // Cache it
        cachedCookies = {
            content: data.cookie_content,
            expires: Date.now() + CACHE_TTL
        };

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
        console.log(`[YouTube] Using authenticated cookies from ${cookiePath}`);
        return { cookies: cookiePath };
    }
    return {};
}
