"use client";

import Image from "next/image";
import { usePlayer } from "@/context/PlayerContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export const QueueList = () => {
  const { play, trackQueue, currentTrackIndex } = usePlayer();
  return (
    <div className="bg-card p-2 rounded-lg border">
      <h3 className="p-2 font-semibold">Queue</h3>
      <ScrollArea className="h-48">
        <div className="space-y-1 pr-2">
          {trackQueue.map((track, index) => (
            <div
              key={track.id}
              onClick={() => play(index)}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-accent",
                currentTrackIndex === index && "bg-accent"
              )}
              role="button"
              tabIndex={0}
            >
              <div className="relative h-10 w-10 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                <Image
                  src={track.cover || 'https://placehold.co/50x50.png?text=Cover'}
                  alt={track.album || 'Album Cover'}
                  fill
                  className="object-cover"
                  data-ai-hint={track.coverHint}
                />
              </div>
              <div className="flex-1 truncate">
                <p className="font-semibold text-sm truncate">{track.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {track.artist}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
