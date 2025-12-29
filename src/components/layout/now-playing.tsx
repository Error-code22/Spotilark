'use client';

import { usePlayer } from "@/context/PlayerContext";
import { Button } from "../ui/button";
import { X, ChevronLeft, Play, Pause, SkipBack, SkipForward, ListMusic, MoreVertical, Heart, Shuffle, Repeat, Repeat1, MessageSquareQuote, SlidersHorizontal, Headphones } from "lucide-react";
import Image from "next/image";
import { Slider } from "../ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from 'react';
import { formatTime, cn } from "@/lib/utils";
import { DialogTitle } from "@/components/ui/dialog";
import { RedoDotIcon } from './RedoDotIcon';
import { UndoDotIcon } from './UndoDotIcon';
import Equalizer from "../Equalizer";

export const NowPlaying = () => {
  const {
    currentTrack,
    isNowPlayingOpen,
    toggleNowPlaying,
    currentTime,
    duration,
    handleSeek,
    isPlaying,
    togglePlayPause,
    playNext,
    playPrev,
    isShuffled,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    seekBy,
    isTrackLiked,
    toggleLikeTrack,
    splitAudioEnabled,
    setSplitAudioEnabled,
    rightAudioUrl,
    setRightAudioUrl,
  } = usePlayer();
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState(false);
  const [isSecondaryMenuOpen, setIsSecondaryMenuOpen] = useState(false);
  const [isSplitAudioOpen, setIsSplitAudioOpen] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  const toggleQueue = () => {
    setIsQueueOpen(!isQueueOpen);
    if (isLyricsOpen) setIsLyricsOpen(false); // Close lyrics if queue opens
    if (isSettingsMenuOpen) setIsSettingsMenuOpen(false); // Close settings if queue opens
    if (isEqualizerOpen) setIsEqualizerOpen(false); // Close equalizer if queue opens
  };

  const toggleLyrics = () => {
    setIsLyricsOpen(!isLyricsOpen);
    if (isQueueOpen) setIsQueueOpen(false); // Close queue if lyrics opens
    if (isSettingsMenuOpen) setIsSettingsMenuOpen(false); // Close lyrics if settings opens
    if (isEqualizerOpen) setIsEqualizerOpen(false); // Close equalizer if lyrics opens
  };

  const toggleSettingsMenu = () => {
    setIsSettingsMenuOpen(!isSettingsMenuOpen);
    if (isQueueOpen) setIsQueueOpen(false); // Close queue if settings opens
    if (isLyricsOpen) setIsLyricsOpen(false); // Close lyrics if settings opens
    if (isEqualizerOpen) setIsEqualizerOpen(false); // Close settings if equalizer opens
  };

  const toggleEqualizer = () => {
    setIsEqualizerOpen(!isEqualizerOpen);
    if (isQueueOpen) setIsQueueOpen(false); // Close queue if equalizer opens
    if (isLyricsOpen) setIsLyricsOpen(false); // Close lyrics if equalizer opens
    if (isSettingsMenuOpen) setIsSettingsMenuOpen(false); // Close settings if equalizer opens
    if (isSplitAudioOpen) setIsSplitAudioOpen(false);
  };

  const toggleSplitAudioMenu = () => {
    setIsSplitAudioOpen(!isSplitAudioOpen);
    if (isQueueOpen) setIsQueueOpen(false);
    if (isLyricsOpen) setIsLyricsOpen(false);
    if (isSettingsMenuOpen) setIsSettingsMenuOpen(false);
    if (isEqualizerOpen) setIsEqualizerOpen(false);
  };

  const playNextSong = () => {
    playNext();
  };

  const playPreviousSong = () => {
    playPrev();
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isQueueOpen) {
          toggleQueue();
        } else if (isLyricsOpen) {
          toggleLyrics();
        } else if (isSettingsMenuOpen) {
          toggleSettingsMenu();
        } else if (isEqualizerOpen) {
          toggleEqualizer();
        } else if (isSplitAudioOpen) {
          toggleSplitAudioMenu();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isQueueOpen, toggleQueue, isLyricsOpen, toggleLyrics, isSettingsMenuOpen, toggleSettingsMenu, isEqualizerOpen, toggleEqualizer, isSplitAudioOpen, toggleSplitAudioMenu]);

  const toggleSecondaryMenu = () => setIsSecondaryMenuOpen(!isSecondaryMenuOpen);

  return (
    <AnimatePresence>
      {isNowPlayingOpen && (
        <motion.div
          key="nowPlayingMain"
          ref={playerRef}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-between pt-12 pb-[calc(48px+env(safe-area-inset-bottom,0px))] overflow-hidden"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 150 && Math.abs(info.offset.x) < 100) {
              toggleNowPlaying();
            } else if (info.offset.x < -100) { // Dragged left
              if (playerRef.current && info.point.y < playerRef.current.clientHeight / 2) {
                toggleLyrics();
              } else if (playerRef.current) {
                playNextSong();
              }
            } else if (info.offset.x > 100) { // Dragged right
              playPreviousSong();
            }
          }}
        >
          {/* Blurred Background Decoration */}
          <div className="absolute inset-0 z-0">
            <Image
              src={currentTrack?.cover || '/SL.png'}
              alt="Background Blur"
              fill
              className="object-cover opacity-20 blur-[100px] scale-150"
              unoptimized
            />
            <div className="absolute inset-0 bg-background/40 backdrop-blur-[40px]" />
          </div>

          <div className="absolute top-4 left-4 z-10">
            <Button variant="ghost" size="icon" onClick={toggleNowPlaying} className="rounded-full hover:bg-white/10">
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </div>
          <div className="absolute top-4 right-4 flex gap-2 z-30">
            <Button variant="ghost" size="icon" onClick={toggleSettingsMenu} className="rounded-full hover:bg-white/10">
              <MoreVertical className="h-6 w-6" />
            </Button>
            {isSettingsMenuOpen && (
              <motion.div
                key="settingsMenuDropdown"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.1 }}
                className="absolute top-12 right-0 bg-popover/80 backdrop-blur-md text-popover-foreground rounded-2xl shadow-2xl p-2 z-50 flex flex-col items-start min-w-[180px] border border-white/10 space-y-1"
              >
                <Button variant="ghost" className="w-full justify-start rounded-xl py-2 px-3 text-sm" onClick={() => console.log('Rename')}>Rename</Button>
                <Button variant="ghost" className="w-full justify-start rounded-xl py-2 px-3 text-sm" onClick={() => console.log('Share')}>Share</Button>
                <Button variant="ghost" className="w-full justify-start rounded-xl py-2 px-3 text-sm" onClick={() => console.log('Open Location')}>Open Location</Button>
                <Button variant="ghost" className="w-full justify-start rounded-xl py-2 px-3 text-sm" onClick={() => console.log('Add to playlist')}>Add to playlist</Button>
                <Button variant="ghost" className="w-full justify-start rounded-xl py-2 px-3 text-sm" onClick={() => console.log('Add to queue')}>Add to queue</Button>
                <Button variant="ghost" className="w-full justify-start rounded-xl py-2 px-3 text-sm" onClick={() => console.log('Rate song')}>Rate song</Button>
                <Button variant="ghost" className="w-full justify-start rounded-xl py-2 px-3 text-sm" onClick={() => console.log('Add tag')}>Add tag</Button>
                <Button variant="ghost" className="w-full justify-start rounded-xl py-2 px-3 text-sm" onClick={() => console.log('Speed')}>Speed</Button>
                <Button variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-500/10 rounded-xl py-2 px-3 text-sm" onClick={() => console.log('Delete Song')}>Delete</Button>
              </motion.div>
            )}
          </div>
          <div className="flex flex-col items-center z-10 w-full max-w-lg mt-2">
            {/* Curved Thumbnail */}
            <div className="relative w-56 h-56 rounded-3xl overflow-hidden shadow-2xl border-2 border-white/5 bg-card/40">
              <Image
                src={currentTrack?.cover || '/SL.png'}
                alt={currentTrack?.album || 'Album Cover'}
                fill
                className="object-cover"
                unoptimized
              />
            </div>

            {/* Typography Refinement */}
            <div className="text-center space-y-1 w-full px-4 mt-4">
              <h2 className="text-2xl font-black line-clamp-2 tracking-tighter text-foreground/95 drop-shadow-sm uppercase italic leading-tight">
                {currentTrack?.title || 'No track playing'}
              </h2>
              <p className="text-primary italic font-semibold tracking-[0.2em] text-xs opacity-80">
                {currentTrack?.artist || 'N/A'}
              </p>
            </div>

            {/* Secondary Controls Horizontal bar with Menu toggle - Above Slider */}
            <div className="flex items-center justify-between w-full px-4 mt-6 relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => currentTrack && toggleLikeTrack(currentTrack)}
                className="h-10 w-10 rounded-full hover:bg-white/10 transition-colors"
              >
                <Heart
                  className={cn(
                    "h-6 w-6 transition-all duration-300",
                    currentTrack && isTrackLiked(currentTrack.id) ? 'fill-red-500 text-red-500 scale-110' : 'text-muted-foreground/60'
                  )}
                />
              </Button>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSecondaryMenu}
                  className={cn("h-10 w-10 rounded-full hover:bg-white/10 transition-colors", isSecondaryMenuOpen ? 'bg-white/10 text-primary' : 'text-muted-foreground/60')}
                >
                  <MoreVertical className="h-6 w-6" />
                </Button>
                <AnimatePresence>
                  {isSecondaryMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute bottom-12 right-0 flex flex-row gap-2.5 p-2 rounded-2xl bg-card/80 backdrop-blur-2xl border border-white/10 shadow-2xl z-20 overflow-hidden"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { toggleShuffle(); toggleSecondaryMenu(); }}
                        className={cn("h-10 w-10 rounded-xl hover:bg-white/10 transition-colors", isShuffled ? 'text-primary' : 'text-muted-foreground/60')}
                      >
                        <Shuffle className={cn("h-5 w-5", isShuffled ? 'fill-current' : '')} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { toggleRepeat(); toggleSecondaryMenu(); }}
                        className={cn("h-10 w-10 rounded-xl hover:bg-white/10 transition-colors", repeatMode !== 'off' ? 'text-primary' : 'text-muted-foreground/60')}
                      >
                        {repeatMode === 'one' ? (
                          <Repeat1 className="h-5 w-5 fill-current" />
                        ) : (
                          <Repeat className={cn("h-5 w-5", repeatMode !== 'off' ? 'fill-current' : '')} />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { toggleLyrics(); toggleSecondaryMenu(); }}
                        className={cn("h-10 w-10 rounded-xl hover:bg-white/10 transition-colors", isLyricsOpen ? 'text-primary' : 'text-muted-foreground/60')}
                      >
                        <MessageSquareQuote className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { toggleEqualizer(); toggleSecondaryMenu(); }}
                        className={cn("h-10 w-10 rounded-xl hover:bg-white/10 transition-colors", isEqualizerOpen ? 'text-primary' : 'text-muted-foreground/60')}
                      >
                        <SlidersHorizontal className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { toggleSplitAudioMenu(); toggleSecondaryMenu(); }}
                        className={cn("h-10 w-10 rounded-xl hover:bg-white/10 transition-colors", isSplitAudioOpen || splitAudioEnabled ? 'text-primary' : 'text-muted-foreground/60')}
                        title="Split Audio"
                      >
                        <Headphones className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { toggleQueue(); toggleSecondaryMenu(); }}
                        className="h-10 w-10 rounded-xl hover:bg-white/10 text-muted-foreground/60 transition-colors"
                      >
                        <ListMusic className="h-5 w-5" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Slider/Time */}
            <div className="w-full max-w-xs mx-auto px-4 space-y-2 mt-4">
              <Slider
                value={[currentTime]}
                max={duration}
                onValueChange={(value) => handleSeek(value[0])}
                className="w-full"
              />
              <div className="flex justify-between text-[11px] font-black tracking-widest text-muted-foreground/50 uppercase">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>


            {/* Lark-Style Control Grouping (shifted up) */}
            <div className="flex items-center justify-between w-full px-4 mb-2">
              <Button variant="ghost" size="icon" onClick={() => seekBy(-10)} className="h-12 w-12 rounded-full hover:bg-white/5 active:scale-95 transition-transform">
                <UndoDotIcon className="h-7 w-7" />
              </Button>
              <Button variant="ghost" size="icon" onClick={playPrev} className="h-12 w-12 rounded-full hover:bg-white/5 active:scale-95 transition-transform">
                <SkipBack className="h-8 w-8 fill-current text-foreground/90" />
              </Button>
              <Button variant="ghost" size="icon" onClick={togglePlayPause} className="h-20 w-20 rounded-full hover:bg-white/5 active:scale-90 transition-transform flex items-center justify-center">
                {isPlaying ? <Pause className="h-10 w-10 fill-current text-foreground" /> : <Play className="h-10 w-10 fill-current ml-1 text-foreground" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={playNext} className="h-12 w-12 rounded-full hover:bg-white/5 active:scale-95 transition-transform">
                <SkipForward className="h-8 w-8 fill-current text-foreground/90" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => seekBy(10)} className="h-12 w-12 rounded-full hover:bg-white/5 active:scale-95 transition-transform">
                <RedoDotIcon className="h-7 w-7" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {isQueueOpen && (
        <motion.div
          key="queuePanel"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-y-0 right-0 w-80 bg-background z-50 shadow-lg flex flex-col"
        >
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-bold">Up Next</h3>
            <Button variant="ghost" size="icon" onClick={toggleQueue}>
              <X />
            </Button>
          </div>
          <div className="p-4 overflow-y-auto">
            {/* Placeholder for queue items */}
            <p className="text-muted-foreground">Queue is empty.</p>
          </div>
        </motion.div>
      )}

      {isLyricsOpen && (
        <motion.div
          key="lyricsPanel"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-y-0 right-0 w-80 bg-background z-50 shadow-lg flex flex-col"
        >
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-bold">Lyrics</h3>
            <Button variant="ghost" size="icon" onClick={toggleLyrics}>
              <X />
            </Button>
          </div>
          <div className="p-4 overflow-y-auto">
            {/* Placeholder for lyrics content */}
            <p className="text-muted-foreground">Lyrics will appear here.</p>
          </div>
        </motion.div>
      )}


      {isEqualizerOpen && (
        <motion.div
          key="equalizerModal"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="relative bg-background rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Equalizer</h3>
            <Button variant="ghost" size="icon" onClick={toggleEqualizer} className="absolute top-2 right-2">
              <X />
            </Button>
            <Equalizer />
          </div>
        </motion.div>
      )}

      {/* Split Audio Modal */}
      {isSplitAudioOpen && (
        <motion.div
          key="splitAudioModal"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="relative bg-background rounded-lg shadow-lg p-6 max-w-md w-full flex flex-col gap-4 border border-white/10">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Headphones className="h-5 w-5" />
                Split Audio
              </h3>
              <Button variant="ghost" size="icon" onClick={toggleSplitAudioMenu}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Play two different tracks simultaneously. Left ear plays the current track, right ear plays the URL below.
            </p>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="font-medium">Enable Split Audio</span>
              <div
                className={cn("w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300", splitAudioEnabled ? "bg-primary" : "bg-muted")}
                onClick={() => setSplitAudioEnabled(!splitAudioEnabled)}
              >
                <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300", splitAudioEnabled ? "left-7" : "left-1")} />
              </div>
            </div>

            {splitAudioEnabled && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Right Ear Audio URL</label>
                <input
                  type="text"
                  placeholder="Paste MP3/Audio URL here..."
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={rightAudioUrl}
                  onChange={(e) => setRightAudioUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground italic">
                  Note: Direct audio file URLs work best (e.g. mp3). Cross-origin restrictions may apply.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {(isQueueOpen || isLyricsOpen || isSettingsMenuOpen || isEqualizerOpen || isSplitAudioOpen) && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => {
            if (isQueueOpen) toggleQueue();
            if (isLyricsOpen) toggleLyrics();
            if (isSettingsMenuOpen) toggleSettingsMenu();
            if (isEqualizerOpen) toggleEqualizer();
            if (isSplitAudioOpen) toggleSplitAudioMenu();
          }}
        />
      )}
    </AnimatePresence>
  );
};