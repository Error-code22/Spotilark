import React, { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { usePlayer } from "@/context/PlayerContext";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Lock, Music2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Lyric } from "@/lib/data";

import { fetchLyricsFromLRCLIB } from "@/lib/lrclib";

export const RightPanel = () => {
  const { currentTrack, currentTime, updateTrackLyrics } = usePlayer();
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false);
  const [lyricsError, setLyricsError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentTrack || !currentTrack.lyrics) return;
    const newIndex = currentTrack.lyrics.findLastIndex(
      (lyric) => lyric.time <= currentTime
    );
    if (newIndex !== activeLyricIndex) {
      setActiveLyricIndex(newIndex);
      const activeElement = lyricsContainerRef.current?.children[
        newIndex
      ] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentTime, currentTrack, activeLyricIndex]);

  const fetchLyrics = useCallback(async () => {
    if (!currentTrack || isFetchingLyrics) return;

    setIsFetchingLyrics(true);
    setLyricsError(null);

    try {
      const lyrics = await fetchLyricsFromLRCLIB(
        currentTrack.title,
        currentTrack.artist || "",
        currentTrack.duration || undefined
      );

      if (lyrics) {
        updateTrackLyrics(currentTrack.id, lyrics);
      } else {
        throw new Error("No lyrics found on LRCLIB.");
      }

    } catch (error: any) {
      // Quietly handle the error - just shows "No lyrics available" in UI
      setLyricsError(null);
    } finally {
      setIsFetchingLyrics(false);
    }
  }, [currentTrack, isFetchingLyrics, updateTrackLyrics]);


  if (!currentTrack) {
    return (
      <aside className="w-80 flex-shrink-0 bg-background p-4 flex flex-col items-center justify-center border-l">
        <div className="text-center text-muted-foreground">
          <Music2 className="h-16 w-16 mx-auto mb-4" />
          <p>Select a song to see details</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 flex-shrink-0 bg-background p-4 flex flex-col gap-6 border-l">
      <Card className="shadow-lg border-none bg-card rounded-lg overflow-hidden">
        <CardContent className="p-0">
          <div className="relative h-48 w-full">
            <Image
              src={currentTrack.cover || '/SL.png'}
              alt={currentTrack.album || 'Album Cover'}
              fill
              className="object-cover"
              data-ai-hint={currentTrack.coverHint}
            />
            <div className="absolute bottom-2 left-2 bg-black/50 p-2 rounded-full">
              <Lock className="text-white h-4 w-4" />
            </div>
          </div>
          <div className="p-4">
            <h3 className="text-lg font-semibold">
              {currentTrack.title}
            </h3>
          </div>
        </CardContent>
      </Card>
      <div className="flex-1 flex flex-col min-h-0 bg-card p-4 rounded-lg">
        <h3 className="text-lg font-bold mb-2 px-2">Lyrics</h3>
        <ScrollArea className="flex-1">
          <div ref={lyricsContainerRef} className="space-y-4 p-2">
            {currentTrack.lyrics && currentTrack.lyrics.length > 0 ? (
              currentTrack.lyrics.map((line, index) => (
                <p
                  key={index}
                  className={cn(
                    "text-muted-foreground transition-all duration-300",
                    activeLyricIndex === index &&
                    "text-foreground font-bold text-lg"
                  )}
                >
                  {line.text}
                </p>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                {isFetchingLyrics ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : lyricsError ? (
                  <p className="text-red-500 text-sm text-center">{lyricsError}</p>
                ) : (
                  <>
                    <p className="text-muted-foreground italic mb-2">No lyrics available</p>
                    <Button
                      onClick={fetchLyrics}
                      size="sm"
                      disabled={isFetchingLyrics || !currentTrack.artist || !currentTrack.title}
                    >
                      Fetch Lyrics
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
};
