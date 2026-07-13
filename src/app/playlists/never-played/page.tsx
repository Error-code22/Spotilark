'use client';

import { usePlayer } from '@/context/PlayerContext';
import { SpotilarkLayout } from '@/components/spotilark-layout';
import { TrackList } from '@/components/layout/track-list';
import { Music, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

export default function NeverPlayedPage() {
  const { unifiedLibrary, playCounts } = usePlayer();
  const router = useRouter();

  const unplayedTracks = useMemo(() => {
    return unifiedLibrary.filter(t => !playCounts[t.id]);
  }, [unifiedLibrary, playCounts]);

  return (
    <SpotilarkLayout>
      <div className="flex-1 p-4 md:p-6 overflow-y-auto pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Music className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-black tracking-tight">Never Played</h1>
              <p className="text-sm text-muted-foreground">{unplayedTracks.length} tracks</p>
            </div>
          </div>
          <TrackList overrideTracks={unplayedTracks} />
        </div>
      </div>
    </SpotilarkLayout>
  );
}
