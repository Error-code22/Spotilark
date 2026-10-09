import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Share = {
  id: string;
  user_id: string | null;
  title: string;
  artist: string | null;
  cover_url: string | null;
  stream_url: string;
  stream_kind: string;
  source_track_id: string | null;
  duration_ms: number | null;
  created_at: string;
};

async function fetchShare(id: string): Promise<Share | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('shares')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) return null;
    return (data as Share | null) ?? null;
  } catch {
    return null;
  }
}

function youtubeIdFromUrl(url: string): string | null {
  const fromQuery = /[?&]v=([^&#]+)/.exec(url);
  if (fromQuery) return fromQuery[1];
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1) || null;
    }
  } catch {
    return null;
  }
  return null;
}

function resolveCover(share: Share): string | null {
  if (share.cover_url) return share.cover_url;
  if (share.stream_kind === 'yt') {
    const id = youtubeIdFromUrl(share.stream_url);
    if (id) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  }
  return null;
}

function formatDuration(durationMs: number | null): string | null {
  if (!durationMs || durationMs <= 0) return null;
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const share = await fetchShare(id);
  if (!share) notFound();

  const title = `${share.title} — ${share.artist ?? 'Unknown Artist'}`;
  const description = `Listen to ${share.title} on Spotilark`;
  const cover = resolveCover(share);
  const isAudio = share.stream_kind === 'audio';

  return {
    title,
    description,
    metadataBase: new URL('https://spotilark.vercel.app'),
    openGraph: isAudio
      ? {
          title,
          description,
          type: 'music.song',
          ...(cover ? { images: [cover] } : {}),
          audio: [share.stream_url],
        }
      : {
          title,
          description,
          type: 'video.other',
          ...(cover ? { images: [cover] } : {}),
        },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(cover ? { images: [cover] } : {}),
    },
  };
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const share = await fetchShare(id);
  if (!share) notFound();

  const duration = formatDuration(share.duration_ms);
  const cover = resolveCover(share);

  return (
    <div className='dark min-h-screen bg-background text-foreground'>
      <div className='flex min-h-screen flex-col items-center justify-center p-4'>
        <div className='w-full max-w-xl rounded-2xl border bg-card p-6 shadow-2xl'>
          {cover && (
            <img
              src={cover}
              alt={`${share.title} cover art`}
              className='mx-auto mb-6 aspect-square w-full max-w-xs rounded-xl object-cover shadow-lg'
            />
          )}
          <div className='text-center'>
            <h1 className='text-2xl font-bold leading-tight'>{share.title}</h1>
            <p className='mt-1 text-muted-foreground'>{share.artist ?? 'Unknown Artist'}</p>
            {duration && <p className='mt-1 text-xs text-muted-foreground'>{duration}</p>}
          </div>
          <div className='mt-6'>
            {share.stream_kind === 'video' ? (
              <video
                controls
                src={share.stream_url}
                poster={share.cover_url ?? undefined}
                className='w-full rounded-xl bg-black'
              />
            ) : share.stream_kind === 'yt' ? (
              <a
                href={share.stream_url}
                target='_blank'
                rel='noopener noreferrer'
                className='flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-3 text-lg font-semibold text-white transition-colors hover:bg-red-700'
              >
                ▶ Watch on YouTube
              </a>
            ) : (
              <audio
                controls
                src={share.stream_url}
                autoPlay={false}
                preload='metadata'
                className='w-full'
              />
            )}
          </div>
          <div className='mt-6 flex flex-col gap-3'>
            {share.source_track_id && (
              <a
                href={`spotilark://track/${share.source_track_id}`}
                className='block w-full rounded-lg bg-primary py-3 text-center font-semibold text-primary-foreground transition-colors hover:bg-primary/90'
              >
                Open in Spotilark
              </a>
            )}
            <p className='text-center text-sm text-muted-foreground'>
              <a
                href='https://spotilark.vercel.app'
                className='underline transition-colors hover:text-foreground'
              >
                Get Spotilark
              </a>
            </p>
          </div>
        </div>
        <footer className='mt-6 text-center text-xs text-muted-foreground'>
          Spotilark — your music, your way
        </footer>
      </div>
    </div>
  );
}
