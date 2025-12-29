import { NextRequest, NextResponse } from "next/server";
import { resolveYouTubeStreams } from "@/lib/youtube-utils";
import { getTelegramBot, TELEGRAM_CHANNEL_ID } from "@/lib/telegram";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const { videoId, title, artist, album, cover } = await req.json();

        // Get user for ownership
        const authClient = await createServerClient();
        // Get current user with fallback
        let { data: { user }, error: authError } = await authClient.auth.getUser();

        if (authError || !user) {
            const { data: { session } } = await authClient.auth.getSession();
            user = session?.user || null;
        }

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!videoId) {
            return NextResponse.json({ error: "Video ID is required" }, { status: 400 });
        }

        console.log(`Starting triple-format import for: ${title}`);

        // 1. Resolve Streams
        const streams = await resolveYouTubeStreams(videoId);
        if (!streams.audioUrl && !streams.videoUrl) {
            throw new Error("Could not resolve any streams (Audio or Video) for import");
        }

        const telegramBot = getTelegramBot();
        let audioFileId = null;
        let videoFileId = null;
        let coverFileId = null;

        // --- 2. Import Cover (Thumbnail) for 100% Permanence ---
        if (cover) {
            try {
                console.log("Downloading thumbnail...");
                const coverRes = await fetch(cover);
                if (coverRes.ok) {
                    const coverBuffer = Buffer.from(await coverRes.arrayBuffer());
                    const coverMsg = await telegramBot.sendPhoto(TELEGRAM_CHANNEL_ID, coverBuffer, {
                        caption: `[COVER] ${title}`
                    });
                    // photos is an array, we want the highest resolution one
                    const photo = coverMsg.photo?.sort((a: any, b: any) => b.file_size - a.file_size)[0];
                    coverFileId = photo?.file_id;
                    console.log("Thumbnail uploaded to Telegram.");
                }
            } catch (e) {
                console.warn("Failed to capture cover art, falling back to URL.");
            }
        }

        // --- 3. Import Audio ---
        if (streams.audioUrl) {
            console.log("Downloading audio stream...");
            const audioResponse = await fetch(streams.audioUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            if (audioResponse.ok) {
                const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
                const audioFilename = `${title.replace(/[^\w\s]/gi, '')}.mp3`;

                console.log("Uploading audio to Telegram...");
                const audioMsg = await telegramBot.sendAudio(TELEGRAM_CHANNEL_ID, audioBuffer, {
                    caption: `[AUDIO] ${title} - ${artist}`,
                    title: title,
                    performer: artist
                }, { filename: audioFilename, contentType: 'audio/mpeg' });

                audioFileId = audioMsg.audio?.file_id;
            }
        }

        // --- 4. Import Video ---
        if (streams.videoUrl) {
            console.log("Downloading video stream...");
            const videoResponse = await fetch(streams.videoUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            if (videoResponse.ok) {
                const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
                const videoFilename = `${title.replace(/[^\w\s]/gi, '')}.mp4`;

                console.log("Uploading video to Telegram...");
                const videoMsg = await telegramBot.sendVideo(TELEGRAM_CHANNEL_ID, videoBuffer, {
                    caption: `[VIDEO] ${title} - ${artist}`
                }, { filename: videoFilename, contentType: 'video/mp4' });

                videoFileId = videoMsg.video?.file_id;
            }
        }

        // 5. Finalize URLs
        const audioStreamUrl = audioFileId ? `/api/storage/stream?file_id=${audioFileId}` : null;
        const videoStreamUrl = videoFileId ? `/api/storage/stream?file_id=${videoFileId}` : null;
        // Use the Telegram photo stream if available, otherwise fallback to the provided cover URL
        const finalCoverUrl = coverFileId ? `/api/storage/stream?file_id=${coverFileId}` : cover;

        const { data, error } = await adminClient.from('tracks').insert({
            title,
            artist: artist || 'Unknown Artist',
            album: album || 'YouTube',
            genre: 'Imported',
            source_url: audioStreamUrl,
            video_url: videoStreamUrl,
            cover: finalCoverUrl,
            duration: 0,
            user_id: user.id
        }).select().single();

        if (error) {
            // Fallback if video_url column is missing
            if (error.message.includes("column \"video_url\" of relation \"tracks\" does not exist")) {
                const { data: fbData, error: fbError } = await adminClient.from('tracks').insert({
                    title,
                    artist: artist || 'Unknown Artist',
                    album: album || 'YouTube',
                    genre: 'Imported',
                    source_url: audioStreamUrl,
                    cover: finalCoverUrl,
                    user_id: user.id
                }).select().single();
                if (fbError) throw fbError;
                return NextResponse.json({ success: true, track: fbData });
            }
            throw error;
        }

        return NextResponse.json({
            success: true,
            track: data
        });

    } catch (error: any) {
        console.error("Triple Import Error:", error);
        return NextResponse.json({
            error: error.message || "Failed to import track",
            details: error.stack
        }, { status: 500 });
    }
}
