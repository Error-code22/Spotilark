"use client";

import { usePlayer } from "@/context/PlayerContext";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";
import { Music2 } from "lucide-react";

export const TrackTile = ({ track, index }: { track: any; index: number }) => {
  const { play, currentTrackIndex, isPlaying } = usePlayer();

  return (
    <div
      onClick={() => play(index)}
      className={cn(
        "flex items-center p-2 rounded-md cursor-pointer",
        currentTrackIndex === index && "bg-primary/10"
      )}
    >
      <div className="flex items-center justify-center w-10 h-10 mr-4">
        {currentTrackIndex === index && isPlaying ? (
          <div className="flex gap-0.5 items-end h-4">
            <span className="w-1 h-full bg-primary animate-[wave_0.8s_ease-in-out_-0.4s_infinite_alternate]"></span>
            <span className="w-1 h-2/3 bg-primary animate-[wave_0.8s_ease-in-out_-0.2s_infinite_alternate]"></span>
            <span className="w-1 h-full bg-primary animate-[wave_0.8s_ease-in-out_0s_infinite_alternate]"></span>
            <span className="w-1 h-2/3 bg-primary animate-[wave_0.8s_ease-in-out_-0.2s_infinite_alternate]"></span>
            <span className="w-1 h-full bg-primary animate-[wave_0.8s_ease-in-out_-0.4s_infinite_alternate]"></span>
          </div>
        ) : (
          <Music2 className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-grow">
        <div className={cn("font-medium", currentTrackIndex === index && "text-primary")}>
          {track.title}
        </div>
        <div className="text-sm text-muted-foreground">{track.artist}</div>
      </div>
      <div className="text-sm text-muted-foreground hidden md:block">{track.album}</div>
      <div className="text-sm text-muted-foreground font-mono ml-auto">
        {formatTime(track.duration || 0)}
      </div>
       <style jsx>{`
        @keyframes wave {
          from {
            height: 25%;
          }
          to {
            height: 100%;
          }
        }
      `}</style>
    </div>
  );
};
