import { access } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const cookieDir = join(tmpdir(), "spotilark-cookies");

export async function getYouTubeCookiePath(): Promise<string | null> {
    const paths = [
        join(cookieDir, "youtube-default.txt"),
        join(cookieDir, "youtube-main.txt"),
    ];

    for (const p of paths) {
        try {
            await access(p);
            return p;
        } catch {}
    }
    return null;
}

export async function getYtDlpCookieArgs(): Promise<Record<string, any>> {
    const cookiePath = await getYouTubeCookiePath();
    if (cookiePath) {
        console.log(`[YouTube] Using authenticated cookies from ${cookiePath}`);
        return { cookies: cookiePath };
    }
    return {};
}
