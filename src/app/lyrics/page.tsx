"use client";

import { SpotilarkLayout } from "@/components/spotilark-layout";
import { usePlayer } from "@/context/PlayerContext";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";
import { Music2 } from "lucide-react";

const LyricsPageContent = () => {
  const { currentTrack, currentTime } = usePlayer();
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);

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

  return (
    <div className="relative h-full w-full overflow-hidden">
      {currentTrack ? (
        <>
          <div className="absolute inset-0 z-0">
            <Image
              src={currentTrack.cover || 'https://placehold.co/256x256.png?text=Cover'}
              alt={currentTrack.album || 'Album Cover'}
              fill
              className="object-cover blur-3xl scale-125 opacity-30"
              data-ai-hint={currentTrack.coverHint}
            />
            <div className="absolute inset-0 bg-background/50"></div>
          </div>
          <div className="relative z-10 flex flex-col h-full text-center p-8">
            <div className="mb-8">
              <h1 className="text-5xl font-bold">{currentTrack.title}</h1>
              <p className="text-2xl text-muted-foreground mt-2">{currentTrack.artist}</p>
            </div>
            <ScrollArea className="flex-1">
              <div ref={lyricsContainerRef} className="space-y-6">
                {currentTrack.lyrics && currentTrack.lyrics.map((line, index) => (
                  <p
                    key={index}
                    className={cn(
                      "text-2xl text-muted-foreground transition-all duration-300",
                      activeLyricIndex === index &&
                        "text-foreground font-bold text-4xl"
                    )}
                  >
                    {line.text}
                  </p>
                ))}
              </div>
            </ScrollArea>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
          <Music2 className="h-24 w-24" />
          <h2 className="text-2xl font-semibold">No song is playing</h2>
          <p>Play a song to see its lyrics here.</p>
        </div>
      )}
    </div>
  );
}

export default function LyricsPage() {
  return (
    <SpotilarkLayout>
      <LyricsPageContent />
    </SpotilarkLayout>
  );
}
