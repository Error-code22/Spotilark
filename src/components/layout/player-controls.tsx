"use client";

import Image from "next/image";
import { usePlayer } from "@/context/PlayerContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatTime, cn } from "@/lib/utils";
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  Mic2,
  Laptop2,
  VolumeX,
  Volume1,
  Maximize2,
  BarChart2,
  Heart,
  Shuffle,
  Repeat,
  Repeat1
} from "lucide-react";
import { MarqueeText } from "@/components/ui/marquee-text";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { UndoDotIcon } from "./UndoDotIcon";
import { RedoDotIcon } from "./RedoDotIcon";


export const PlayerControls = () => {
  const {
    isPlaying,
    togglePlayPause,
    toggleNowPlaying,
    playNext,
    playPrev,
    currentTime,
    duration,
    handleSeek,
    volume,
    handleVolumeChange,
    currentTrack,
    toggleLyricsView,
    isLyricsViewOpen,

    seekBy,
    isShuffled,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    isTrackLiked,
    toggleLikeTrack
  } = usePlayer();

  /*
   * Plan for Player Controls:
   * 1.  **Center Controls**: Play/Pause/Skip in the center (Desktop only).
   * 2.  **Shrink Progress Bar**: Not full width, cleaner look.
   * 3.  **Volume Control**: Vertical slider on click/hover.
   * 4.  **Lyrics Mode**: Full screen view with 3/4 lyrics and 1/4 now playing info.
   * 5.  **Responsive Icons**: Lyrics and Devices icons on Desktop, hidden on Mobile.
   * 6.  **Mobile Bar**: Ultra-minimal with Track Info, Play/Pause button, and top progress line.
   * 7.  **Desktop Track Info**: Expand available space for song titles on desktop to prevent compression.
   * 8.  **Player Separation**: Separate components for Mobile and Desktop player bars for easier updates.
   * 9.  **Seek Controls**: Add +/- 10s buttons to both player bars.
   * 10. **Now Playing Icon**: Add a new icon next to Lyrics on desktop.
   */

  const [isVolumeHovered, setIsVolumeHovered] = useState(false);

  // Calculate volume icon based on level
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  // Render components separately to avoid cross-contamination of layout fixes
  return (
    <>
      <div className="md:hidden">
        <MobilePlayer
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          togglePlayPause={togglePlayPause}
          toggleNowPlaying={toggleNowPlaying}
          playNext={playNext}
          playPrev={playPrev}
          currentTime={currentTime}
          duration={duration}
          handleSeek={handleSeek}
          seekBy={seekBy}
          VolumeIcon={VolumeIcon}
          volume={volume}
          handleVolumeChange={handleVolumeChange}
        />
      </div>
      <div className="hidden md:block">
        <DesktopPlayer
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          togglePlayPause={togglePlayPause}
          toggleNowPlaying={toggleNowPlaying}
          playNext={playNext}
          playPrev={playPrev}
          currentTime={currentTime}
          duration={duration}
          handleSeek={handleSeek}
          seekBy={seekBy}
          VolumeIcon={VolumeIcon}
          volume={volume}
          handleVolumeChange={handleVolumeChange}
          isLyricsViewOpen={isLyricsViewOpen}
          toggleLyricsView={toggleLyricsView}
          setIsVolumeHovered={setIsVolumeHovered}
          isShuffled={isShuffled}
          toggleShuffle={toggleShuffle}
          repeatMode={repeatMode}
          toggleRepeat={toggleRepeat}
          isTrackLiked={isTrackLiked}
          toggleLikeTrack={toggleLikeTrack}
        />
      </div>
    </>
  );
};

const MobilePlayer = ({
  currentTrack, isPlaying, togglePlayPause, toggleNowPlaying,
  playNext, playPrev, currentTime, duration, handleSeek, seekBy,
  VolumeIcon, volume, handleVolumeChange
}: any) => {
  const [swipeDirection, setSwipeDirection] = useState(0);

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 70;
    if (info.offset.x < -threshold) {
      setSwipeDirection(1); // Next
      playNext();
    } else if (info.offset.x > threshold) {
      setSwipeDirection(-1); // Prev
      playPrev();
    }
  };

  // Variants for sliding animation
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : direction < 0 ? -100 : 0,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -100 : direction < 0 ? 100 : 0,
      opacity: 0
    })
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[calc(92px+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] bg-background/95 backdrop-blur-2xl border-t border-border z-40 px-4 flex flex-col justify-center gap-1.5 group select-none overflow-hidden">
      {/* TOP ROW: Info + Buttons */}
      <div className="flex items-center justify-between w-full h-16">
        {/* LEFT: Track Info Area (Draggable & Clickable) */}
        <div
          className="flex-1 min-w-0 h-full relative"
          onClick={() => currentTrack && toggleNowPlaying()}
        >
          <AnimatePresence initial={false} mode="popLayout" custom={swipeDirection}>
            <motion.div
              key={currentTrack?.id || 'empty'}
              custom={swipeDirection}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.4}
              onDragEnd={handleDragEnd}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-4 w-full h-full cursor-grab active:cursor-grabbing"
            >
              {currentTrack ? (
                <>
                  <div className="relative h-14 w-14 rounded-lg overflow-hidden flex-shrink-0 shadow-2xl pointer-events-none">
                    <Image
                      src={currentTrack.cover || '/SL.png'}
                      alt={currentTrack.album || 'Album Cover'}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0 flex-col gap-0.5 flex justify-center flex-1 pr-2 pointer-events-none">
                    <MarqueeText
                      text={currentTrack.title}
                      className="font-black text-sm text-foreground italic tracking-tighter"
                    />
                    <div className="text-[11px] font-bold text-primary/60 uppercase tracking-[0.1em] truncate">
                      {currentTrack.artist}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 opacity-50">
                  <div className="h-14 w-14 bg-muted rounded-lg animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* RIGHT: Compact Controls */}
        <div className="flex items-center gap-1 ml-2 z-10" onClick={(e) => e.stopPropagation()}>
          <DevicesPopover>
            <Button variant="ghost" size="icon" className="text-muted-foreground/50 hover:text-foreground h-10 w-10 md:hidden active:scale-90 transition-all" title="Devices">
              <Laptop2 className="h-5 w-5" />
            </Button>
          </DevicesPopover>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-11 w-11 active:scale-90 transition-all" onClick={playPrev} disabled={!currentTrack}>
            <SkipBack className="h-6 w-6 fill-current" />
          </Button>
          <Button variant="ghost" size="icon" className="text-foreground h-14 w-14 hover:bg-transparent active:scale-90 transition-all" onClick={togglePlayPause} disabled={!currentTrack}>
            {isPlaying ? <Pause className="h-10 w-10 fill-current" /> : <Play className="h-10 w-10 fill-current ml-0.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-11 w-11 active:scale-90 transition-all" onClick={playNext} disabled={!currentTrack}>
            <SkipForward className="h-6 w-6 fill-current" />
          </Button>
        </div>
      </div>

      {/* BOTTOM ROW: The specific progress line starting after the image */}
      <div className="flex items-center w-full px-1 pb-2.5">
        <div className="w-14 flex-shrink-0" />
        <div className="w-4 flex-shrink-0" />
        <div className="flex-1 h-1.5 bg-foreground/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out rounded-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
            style={{ width: `${(currentTime / (duration || 100)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};


const DesktopPlayer = ({
  currentTrack, isPlaying, togglePlayPause, toggleNowPlaying,
  playNext, playPrev, currentTime, duration, handleSeek, seekBy,
  VolumeIcon, volume, handleVolumeChange, isLyricsViewOpen, toggleLyricsView, setIsVolumeHovered,
  isShuffled, toggleShuffle, repeatMode, toggleRepeat, isTrackLiked, toggleLikeTrack
}: any) => (
  <div className="fixed bottom-0 left-0 right-0 h-[88px] bg-background/90 backdrop-blur-xl border-t border-border z-40 px-4 flex items-center justify-between group select-none">
    {/* LEFT: Track Info (Clickable) */}
    <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={currentTrack ? toggleNowPlaying : undefined}>
      {currentTrack ? (
        <>
          <div className="relative h-14 w-14 rounded-md overflow-hidden flex-shrink-0 group/cover shadow-lg">
            <Image
              src={currentTrack.cover || '/SL.png'}
              alt={currentTrack.album || 'Album Cover'}
              fill
              className="object-cover transition-transform duration-500 group-hover/cover:scale-110"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/0 group-hover/cover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover/cover:opacity-100">
              <Maximize2 className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="min-w-0 flex-col gap-0.5 flex justify-center flex-1">
            <MarqueeText
              text={currentTrack.title}
              className="font-semibold text-sm text-foreground/90 hover:underline"
            />
            <div className="text-xs text-muted-foreground truncate hover:text-foreground transition-colors">
              {currentTrack.artist}
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-3 opacity-50">
          <div className="h-14 w-14 bg-muted rounded-md animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
          </div>
        </div>
      )}
    </div>



    {/* NEW CONTROLS: Like, Shuffle, Repeat */}
    <div className="flex items-center gap-2 px-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => { e.stopPropagation(); currentTrack && toggleLikeTrack(currentTrack); }}
        disabled={!currentTrack}
        className={cn("h-8 w-8 hover:bg-transparent transition-transform hover:scale-110", currentTrack && isTrackLiked(currentTrack.id) ? "text-primary fill-primary" : "text-muted-foreground hover:text-foreground")}
      >
        <Heart className={cn("h-5 w-5", currentTrack && isTrackLiked(currentTrack.id) && "fill-current")} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => { e.stopPropagation(); toggleShuffle(); }}
        className={cn("h-8 w-8 hover:bg-transparent transition-colors", isShuffled ? "text-primary" : "text-muted-foreground hover:text-foreground")}
      >
        <Shuffle className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => { e.stopPropagation(); toggleRepeat(); }}
        className={cn("h-8 w-8 hover:bg-transparent transition-colors", repeatMode !== 'off' ? "text-primary" : "text-muted-foreground hover:text-foreground")}
      >
        {repeatMode === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
      </Button>
    </div>

    {/* CENTER: Playback Controls & Slider */}
    <div className="flex flex-col items-center justify-center gap-1 w-[420px] shrink-0 px-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="text-muted-foreground/40 hover:text-foreground h-7 w-7 transition-colors" onClick={(e) => { e.stopPropagation(); seekBy(-10); }}>
          <UndoDotIcon className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8" onClick={(e) => { e.stopPropagation(); playPrev(); }} disabled={!currentTrack}>
          <SkipBack className="h-5 w-5 fill-current" />
        </Button>
        <Button size="icon" className="h-10 w-10 bg-primary text-primary-foreground hover:scale-105 transition-all rounded-full shadow-md" onClick={(e) => { e.stopPropagation(); togglePlayPause(); }} disabled={!currentTrack}>
          {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-0.5" />}
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8" onClick={(e) => { e.stopPropagation(); playNext(); }} disabled={!currentTrack}>
          <SkipForward className="h-5 w-5 fill-current" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground/40 hover:text-foreground h-7 w-7 transition-colors" onClick={(e) => { e.stopPropagation(); seekBy(10); }}>
          <RedoDotIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 w-full group/seek">
        <span className="text-[10px] text-muted-foreground font-mono tabular-nums w-8 text-right underline decoration-foreground/0 group-hover/seek:decoration-foreground/20 transition-all">
          {formatTime(currentTime)}
        </span>
        <div className="relative flex-1 h-3 flex items-center">
          <Slider value={[currentTime]} max={duration || 100} onValueChange={(val) => handleSeek(val[0])} className="w-full cursor-pointer" />
        </div>
        <span className="text-[10px] text-muted-foreground font-mono tabular-nums w-8 text-left underline decoration-foreground/0 group-hover/seek:decoration-foreground/20 transition-all">
          {formatTime(duration)}
        </span>
      </div>
    </div>

    {/* RIGHT: Tools & Volume */}
    <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground transition-colors h-8 w-8" title="Now Playing" onClick={(e) => { e.stopPropagation(); toggleNowPlaying(); }}>
        <BarChart2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className={cn("text-muted-foreground hover:text-foreground transition-colors h-8 w-8", isLyricsViewOpen && "text-primary")} onClick={(e) => { e.stopPropagation(); toggleLyricsView(); }} title="Lyrics">
        <Mic2 className="h-4 w-4" />
      </Button>
      <DevicesPopover>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground transition-colors h-8 w-8" title="Connect to a device">
          <Laptop2 className="h-4 w-4" />
        </Button>
      </DevicesPopover>

      <Popover>
        <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center group/vol" onMouseEnter={() => setIsVolumeHovered(true)} onMouseLeave={() => setIsVolumeHovered(false)}>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8">
              <VolumeIcon className="h-5 w-5" />
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent side="top" align="center" className="w-10 h-32 p-3 bg-card border border-border flex items-center justify-center rounded-xl mb-2 shadow-xl">
          <Slider orientation="vertical" value={[volume]} max={1} step={0.01} onValueChange={(val) => handleVolumeChange(val[0])} className="h-full cursor-pointer py-2" />
        </PopoverContent>
      </Popover>
    </div>
  </div >
);

const DevicesPopover = ({ children }: { children: React.ReactNode }) => {
  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      <PopoverContent side="top" align="center" className="w-[280px] p-4 bg-card border border-border rounded-xl mb-2 shadow-2xl">
        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Laptop2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm">Current Device</p>
              <p className="text-xs text-muted-foreground">Local Playback</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2">Available Devices</p>
            <div className="p-3 bg-muted/30 rounded-lg border border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <p className="text-sm font-medium">This Device</p>
              </div>
              <p className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">ACTIVE</p>
            </div>
          </div>

          <div className="p-3 bg-accent/50 rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-center gap-2">
            <BarChart2 className="h-5 w-5 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground font-medium">Remote Control Coming Soon</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
