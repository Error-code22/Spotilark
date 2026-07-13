import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, unlink, access } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

export const dynamic = 'force-dynamic';

const cookieDir = join(tmpdir(), "spotilark-cookies");

async function ensureCookieDir() {
    const { mkdir } = await import("fs/promises");
    await mkdir(cookieDir, { recursive: true });
}

function getCookiePath(userId?: string): string {
    const id = userId || "default";
    return join(cookieDir, `youtube-${id}.txt`);
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("cookies") as File | null;
        const userId = formData.get("userId") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No cookies file provided" }, { status: 400 });
        }

        const text = await file.text();

        // Validate it looks like a cookies.txt file
        if (!text.includes("# Netscape HTTP Cookie File") && !text.includes("#HttpOnly_") && !text.includes("\tTRUE\t")) {
            return NextResponse.json({
                error: "Invalid cookies file. Please export using 'Get cookies.txt LOCALLY' browser extension."
            }, { status: 400 });
        }

        await ensureCookieDir();
        const cookiePath = getCookiePath(userId || undefined);
        await writeFile(cookiePath, text, "utf-8");

        const lineCount = text.split("\n").filter(l => l.trim() && !l.startsWith("#")).length;

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
        const userId = req.nextUrl.searchParams.get("userId");
        const cookiePath = getCookiePath(userId || undefined);

        try {
            await access(cookiePath);
            const content = await readFile(cookiePath, "utf-8");
            const lineCount = content.split("\n").filter(l => l.trim() && !l.startsWith("#")).length;
            return NextResponse.json({ hasCookies: true, entryCount: lineCount });
        } catch {
            return NextResponse.json({ hasCookies: false });
        }
    } catch (error: any) {
        return NextResponse.json({ hasCookies: false });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const userId = req.nextUrl.searchParams.get("userId");
        const cookiePath = getCookiePath(userId || undefined);

        try {
            await unlink(cookiePath);
        } catch {}

        return NextResponse.json({ success: true, message: "Cookies deleted" });
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to delete cookies" }, { status: 500 });
    }
}
