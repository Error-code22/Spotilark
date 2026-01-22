'use client';

import { usePlayer } from "@/context/PlayerContext";
import { useDevices } from "@/context/DeviceContext";
import { Button } from "../ui/button";
import { X, ChevronLeft, Play, Pause, SkipBack, SkipForward, ListMusic, MoreVertical, Heart, Shuffle, Repeat, Repeat1, MessageSquareQuote, SlidersHorizontal, Headphones, Music, Laptop2, Search, Trash2 } from "lucide-react";
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
    rightTrack,
    setRightTrack,
    isRightPlaying,
    toggleRightPlayPause,
    rightCurrentTime,
    rightDuration,
    handleRightSeek,
    playTrack,
    trackQueue,
    currentTrackIndex,
    play,
    volume,
    handleVolumeChange,
    unifiedLibrary,
  } = usePlayer();
  const { devices, currentDevice, activePlayerDevice, transferPlayback, sendCommand, setIsDevicesMenuOpen } = useDevices();

  // Remote Control Logic
  const isRemoteMode = activePlayerDevice && activePlayerDevice.id !== currentDevice?.id;
  const displayTrack = isRemoteMode ? activePlayerDevice.current_track_json : currentTrack;
  const displayIsPlaying = isRemoteMode ? activePlayerDevice.is_playing : isPlaying;
  const displayCurrentTime = isRemoteMode ? activePlayerDevice.position_ms / 1000 : currentTime;
  const displayVolume = isRemoteMode ? activePlayerDevice.volume : volume;

  // Wrapped Controls for Remote Support
  const handlePlayPause = () => {
    if (isRemoteMode) {
      sendCommand(activePlayerDevice!.id, { type: 'PLAY_PAUSE', value: !displayIsPlaying });
    } else {
      togglePlayPause();
    }
  };

  const handleSeekRemote = (val: number) => {
    if (isRemoteMode) {
      sendCommand(activePlayerDevice!.id, { type: 'SEEK', value: val * 1000 });
    } else {
      handleSeek(val);
    }
  };

  const handleSkipRemote = (dir: 'next' | 'prev') => {
    if (isRemoteMode) {
      sendCommand(activePlayerDevice!.id, { type: 'SKIP', value: dir });
    } else {
      dir === 'next' ? playNext() : playPrev();
    }
  };

  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState(false);
  const [isSecondaryMenuOpen, setIsSecondaryMenuOpen] = useState(false);
  const [isSplitAudioOpen, setIsSplitAudioOpen] = useState(false);
  const [rightTrackSearch, setRightTrackSearch] = useState("");
  const [isSelectingRightTrack, setIsSelectingRightTrack] = useState(false);
  const [leftTrackSearch, setLeftTrackSearch] = useState("");
  const [isSelectingLeftTrack, setIsSelectingLeftTrack] = useState(false);
  const [isDevicesOpen, setIsDevicesOpen] = useState(false);
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
    if (isDevicesOpen) setIsDevicesOpen(false);
  };

  const toggleDevices = () => {
    setIsDevicesOpen(!isDevicesOpen);
    if (isQueueOpen) setIsQueueOpen(false);
    if (isLyricsOpen) setIsLyricsOpen(false);
    if (isSettingsMenuOpen) setIsSettingsMenuOpen(false);
    if (isEqualizerOpen) setIsEqualizerOpen(false);
    if (isSplitAudioOpen) setIsSplitAudioOpen(false);
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
        } else if (isDevicesOpen) {
          toggleDevices();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isQueueOpen, toggleQueue, isLyricsOpen, toggleLyrics, isSettingsMenuOpen, toggleSettingsMenu, isEqualizerOpen, toggleEqualizer, isSplitAudioOpen, toggleSplitAudioMenu, isDevicesOpen, toggleDevices]);

  // Sync menu state to DeviceProvider for heartbeats
  useEffect(() => {
    setIsDevicesMenuOpen(isDevicesOpen || isNowPlayingOpen);
  }, [isDevicesOpen, isNowPlayingOpen, setIsDevicesMenuOpen]);

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
              src={displayTrack?.cover || '/SL.png'}
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
                src={displayTrack?.cover || '/SL.png'}
                alt={displayTrack?.album || 'Album Cover'}
                fill
                className="object-cover"
                unoptimized
              />
            </div>

            {/* Typography Refinement */}
            <div className="text-center space-y-1 w-full px-4 mt-4">
              <h2 className="text-2xl font-black line-clamp-2 tracking-tighter text-foreground/95 drop-shadow-sm uppercase italic leading-tight">
                {displayTrack?.title || 'No track playing'}
              </h2>
              <p className="text-primary italic font-semibold tracking-[0.2em] text-xs opacity-80">
                {displayTrack?.artist || 'N/A'}
              </p>
            </div>

            {/* Secondary Controls Horizontal bar with Menu toggle - Above Slider */}
            <div className="flex items-center justify-between w-full px-4 mt-6 relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => displayTrack && toggleLikeTrack(displayTrack)}
                className="h-10 w-10 rounded-full hover:bg-white/10 transition-colors"
              >
                <Heart
                  className={cn(
                    "h-6 w-6 transition-all duration-300",
                    displayTrack && isTrackLiked(displayTrack.id) ? 'fill-red-500 text-red-500 scale-110' : 'text-muted-foreground/60'
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
                        onClick={() => { toggleDevices(); toggleSecondaryMenu(); }}
                        className={cn("h-10 w-10 rounded-xl hover:bg-white/10 transition-colors", isDevicesOpen ? 'text-primary' : 'text-muted-foreground/60')}
                        title="Devices"
                      >
                        <Laptop2 className="h-5 w-5" />
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
                value={[displayCurrentTime]}
                max={duration}
                onValueChange={(value) => handleSeekRemote(value[0])}
                className="w-full"
              />
              <div className="flex justify-between text-[11px] font-black tracking-widest text-muted-foreground/50 uppercase">
                <span>{formatTime(displayCurrentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>


            {/* Lark-Style Control Grouping (shifted up) */}
            <div className="flex items-center justify-between w-full px-4 mb-2">
              <Button variant="ghost" size="icon" onClick={() => isRemoteMode ? sendCommand(activePlayerDevice.id, { type: 'SEEK', value: (displayCurrentTime - 10) * 1000 }) : seekBy(-10)} className="h-12 w-12 rounded-full hover:bg-white/5 active:scale-95 transition-transform">
                <UndoDotIcon className="h-7 w-7" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleSkipRemote('prev')} className="h-12 w-12 rounded-full hover:bg-white/5 active:scale-95 transition-transform">
                <SkipBack className="h-8 w-8 fill-current text-foreground/90" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handlePlayPause} className="h-20 w-20 rounded-full hover:bg-white/5 active:scale-90 transition-transform flex items-center justify-center">
                {displayIsPlaying ? <Pause className="h-10 w-10 fill-current text-foreground" /> : <Play className="h-10 w-10 fill-current ml-1 text-foreground" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleSkipRemote('next')} className="h-12 w-12 rounded-full hover:bg-white/5 active:scale-95 transition-transform">
                <SkipForward className="h-8 w-8 fill-current text-foreground/90" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => isRemoteMode ? sendCommand(activePlayerDevice.id, { type: 'SEEK', value: (displayCurrentTime + 10) * 1000 }) : seekBy(10)} className="h-12 w-12 rounded-full hover:bg-white/5 active:scale-95 transition-transform">
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
            <h3 className="text-lg font-black italic uppercase tracking-tighter">Queue</h3>
            <Button variant="ghost" size="icon" onClick={toggleQueue} className="rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
            {/* CURRENTLY PLAYING */}
            {currentTrack && currentTrackIndex !== null && (
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Now Playing</span>
                <div className="flex items-center gap-4 p-3 rounded-2xl bg-primary/10 border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-lg border border-white/10 shrink-0">
                    <Image src={currentTrack.cover || '/SL.png'} alt={currentTrack.title} fill className="object-cover" unoptimized />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate text-sm">{currentTrack.title}</p>
                    <p className="text-xs text-primary/70 truncate font-semibold uppercase tracking-wider">{currentTrack.artist}</p>
                  </div>
                  <div className="animate-pulse">
                    <Music className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </div>
            )}

            {/* UP NEXT */}
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Up Next</span>
              <div className="space-y-1">
                {trackQueue.length > 0 && currentTrackIndex !== null && trackQueue.length > currentTrackIndex + 1 ? (
                  trackQueue.slice(currentTrackIndex + 1).map((track, idx) => (
                    <div
                      key={`${track.id}-${idx}`}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                      onClick={() => play(currentTrackIndex + 1 + idx)}
                    >
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/5 shrink-0">
                        <Image src={track.cover || '/SL.png'} alt={track.title} fill className="object-cover" unoptimized />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate text-[13px] group-hover:text-primary transition-colors">{track.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate font-medium">{track.artist}</p>
                      </div>
                    </div>
                  ))
                ) : currentTrackIndex === null && trackQueue.length > 0 ? (
                  // If no track is playing but queue exists, show first track as "Ready to Play"
                  <div
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                    onClick={() => play(0)}
                  >
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/5 shrink-0">
                      <Image src={trackQueue[0].cover || '/SL.png'} alt={trackQueue[0].title} fill className="object-cover" unoptimized />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate text-[13px] group-hover:text-primary transition-colors">{trackQueue[0].title}</p>
                      <p className="text-[11px] text-muted-foreground truncate font-medium">{trackQueue[0].artist}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic p-2">No more tracks in queue.</p>
                )}
              </div>
            </div>
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
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
        >
          <div className="relative bg-background/80 rounded-[32px] md:rounded-[40px] shadow-2xl p-5 md:p-8 max-w-2xl w-full flex flex-col gap-6 md:gap-8 border border-white/10 backdrop-blur-3xl overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32" />

            <div className="flex justify-between items-center relative z-10 gap-2">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-primary/20 rounded-xl md:rounded-2xl text-primary">
                  <Headphones className="h-5 w-5 md:h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg md:text-2xl font-black tracking-tighter uppercase italic leading-none">Split Audio</h3>
                  <p className="text-[8px] md:text-[10px] text-muted-foreground font-bold tracking-widest uppercase opacity-60">Dual Channel</p>
                </div>
              </div>

              <div className="flex items-center gap-3 md:gap-6">
                <div className="flex items-center gap-2 md:gap-3 pr-2 md:pr-4 border-r border-white/10">
                  <div className={cn("w-8 h-5 md:w-10 md:h-6 rounded-full relative cursor-pointer transition-all duration-300 border border-white/10", splitAudioEnabled ? "bg-primary" : "bg-muted/20")}
                    onClick={() => setSplitAudioEnabled(!splitAudioEnabled)}>
                    <div className={cn("absolute top-0.5 w-3.5 h-3.5 md:top-1 md:w-4 md:h-4 bg-white rounded-full shadow-lg transition-all duration-300", splitAudioEnabled ? "left-4 md:left-5" : "left-0.5 md:left-1")} />
                  </div>
                  <div className="hidden lg:block">
                    <span className="text-[10px] font-black uppercase tracking-widest block leading-none">Split Mode</span>
                    <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-tighter opacity-60">
                      {splitAudioEnabled ? "PANNING ACTIVE" : "STEREO"}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={toggleSplitAudioMenu} className="rounded-full hover:bg-white/10 h-8 w-8 md:h-10 md:w-10">
                  <X className="h-5 w-5 md:h-6 w-6" />
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 relative z-10">
              {/* LEFT EAR (CURRENT TRACK) */}
              <div className="flex flex-col gap-3 md:gap-4 p-4 md:p-6 rounded-3xl md:rounded-[32px] bg-white/5 border border-white/10 group relative overflow-hidden">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-primary/60">Left Ear</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsSelectingLeftTrack(!isSelectingLeftTrack)}
                      className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground transition-colors"
                    >
                      <Search className="h-3 w-3" />
                    </button>
                    {!isSelectingLeftTrack && (
                      <div className="px-1.5 py-0.5 md:px-2 md:py-1 rounded-full bg-primary/20 text-[7px] md:text-[8px] font-black uppercase tracking-tighter text-primary">Main Track</div>
                    )}
                  </div>
                </div>

                {isSelectingLeftTrack ? (
                  <div className="h-full flex flex-col gap-2 md:gap-3 min-h-[140px] md:min-h-[160px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Change main track..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 md:py-2 text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-primary/50"
                        value={leftTrackSearch}
                        onChange={(e) => setLeftTrackSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[150px] md:max-h-[180px] space-y-1 pr-1 custom-scrollbar">
                      {unifiedLibrary
                        .filter(t => t.title.toLowerCase().includes(leftTrackSearch.toLowerCase()) || (t.artist?.toLowerCase() || "").includes(leftTrackSearch.toLowerCase()))
                        .slice(0, 10)
                        .map(track => (
                          <div
                            key={track.id}
                            onClick={() => { playTrack(track); setIsSelectingLeftTrack(false); }}
                            className="flex items-center gap-2 md:gap-3 p-1.5 md:p-2 rounded-xl h-10 md:h-12 bg-white/5 hover:bg-white/10 cursor-pointer transition-all border border-transparent hover:border-primary/30 group/item active:scale-95"
                          >
                            <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg overflow-hidden relative border border-white/10">
                              <Image src={track.cover || "/spotilark-without-text-white.png"} alt="" fill className="object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] md:text-[10px] font-black truncate leading-tight">{track.title}</p>
                              <p className="text-[7px] md:text-[8px] font-bold text-muted-foreground truncate uppercase tracking-tighter">{track.artist || 'Unknown'}</p>
                            </div>
                          </div>
                        ))
                      }
                      {unifiedLibrary.filter(t => t.title.toLowerCase().includes(leftTrackSearch.toLowerCase())).length === 0 && (
                        <p className="text-center py-4 text-[10px] font-bold opacity-30 uppercase">No results found</p>
                      )}
                    </div>
                  </div>
                ) : displayTrack ? (
                  <>
                    <div className="flex gap-3 md:gap-4 items-center">
                      <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl overflow-hidden shadow-lg border border-white/10">
                        <Image
                          src={displayTrack.cover || "/spotilark-without-text-white.png"}
                          alt={displayTrack.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs md:text-sm truncate">{displayTrack.title}</h4>
                        <p className="text-[10px] md:text-xs text-muted-foreground truncate">{displayTrack.artist || 'Unknown Artist'}</p>
                      </div>
                    </div>

                    <div className="space-y-2 md:space-y-3">
                      <div className="flex items-center justify-between gap-3 md:gap-4">
                        <span className="text-[9px] md:text-[10px] font-mono opacity-40">{formatTime(currentTime)}</span>
                        <Slider
                          value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
                          max={100}
                          className="flex-1"
                          onValueChange={(vals) => handleSeek(vals[0])}
                        />
                        <span className="text-[9px] md:text-[10px] font-mono opacity-40">{formatTime(duration)}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePlayPause}
                        className="w-full rounded-xl md:rounded-2xl bg-white/5 hover:bg-white/10 font-bold text-[9px] md:text-[10px] uppercase tracking-widest h-8 md:h-10"
                      >
                        {displayIsPlaying ? <Pause className="h-3 w-3 mr-2" /> : <Play className="h-3 w-3 mr-2" />}
                        {displayIsPlaying ? "Pause Left" : "Play Left"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="h-12 md:h-16 flex items-center justify-center border-2 border-dashed border-white/10 rounded-xl md:rounded-2xl">
                    <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase opacity-40">No Track Loaded</p>
                  </div>
                )}
              </div>

              {/* RIGHT EAR (PICKER) */}
              <div className="flex flex-col gap-3 md:gap-4 p-4 md:p-6 rounded-3xl md:rounded-[32px] bg-white/5 border border-white/10 relative overflow-hidden group">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-emerald-500/60">Right Ear</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsSelectingRightTrack(!isSelectingRightTrack)}
                      className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground transition-colors"
                    >
                      <Search className="h-3 w-3" />
                    </button>
                    {rightTrack && (
                      <button
                        onClick={() => { setRightTrack(null); setIsSelectingRightTrack(false); }}
                        className="p-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {isSelectingRightTrack ? (
                  <div className="h-full flex flex-col gap-2 md:gap-3 min-h-[140px] md:min-h-[160px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search songs..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 md:py-2 text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                        value={rightTrackSearch}
                        onChange={(e) => setRightTrackSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[150px] md:max-h-[180px] space-y-1 pr-1 custom-scrollbar">
                      {unifiedLibrary
                        .filter(t => t.title.toLowerCase().includes(rightTrackSearch.toLowerCase()) || (t.artist?.toLowerCase() || "").includes(rightTrackSearch.toLowerCase()))
                        .slice(0, 10)
                        .map(track => (
                          <div
                            key={track.id}
                            onClick={() => { setRightTrack(track); setIsSelectingRightTrack(false); }}
                            className="flex items-center gap-2 md:gap-3 p-1.5 md:p-2 rounded-xl h-10 md:h-12 bg-white/5 hover:bg-white/10 cursor-pointer transition-all border border-transparent hover:border-emerald-500/30 group/item active:scale-95"
                          >
                            <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg overflow-hidden relative border border-white/10">
                              <Image src={track.cover || "/spotilark-without-text-white.png"} alt="" fill className="object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] md:text-[10px] font-black truncate leading-tight">{track.title}</p>
                              <p className="text-[7px] md:text-[8px] font-bold text-muted-foreground truncate uppercase tracking-tighter">{track.artist || 'Unknown'}</p>
                            </div>
                          </div>
                        ))
                      }
                      {unifiedLibrary.filter(t => t.title.toLowerCase().includes(rightTrackSearch.toLowerCase())).length === 0 && (
                        <p className="text-center py-4 text-[10px] font-bold opacity-30 uppercase">No results found</p>
                      )}
                    </div>
                  </div>
                ) : rightTrack ? (
                  <>
                    <div className="flex gap-3 md:gap-4 items-center">
                      <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl overflow-hidden shadow-lg border border-white/10">
                        <Image
                          src={rightTrack.cover || "/spotilark-without-text-white.png"}
                          alt={rightTrack.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs md:text-sm truncate">{rightTrack.title}</h4>
                        <p className="text-[10px] md:text-xs text-muted-foreground truncate">{rightTrack.artist || 'Unknown'}</p>
                      </div>
                    </div>
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex items-center justify-between gap-3 md:gap-4">
                        <span className="text-[9px] md:text-[10px] font-mono opacity-40">{formatTime(rightCurrentTime)}</span>
                        <Slider
                          value={[rightDuration > 0 ? (rightCurrentTime / rightDuration) * 100 : 0]}
                          max={100}
                          className="flex-1 right-slider"
                          onValueChange={(vals) => handleRightSeek(vals[0])}
                        />
                        <span className="text-[9px] md:text-[10px] font-mono opacity-40">{formatTime(rightDuration)}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleRightPlayPause}
                        className="w-full rounded-xl md:rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-bold text-[9px] md:text-[10px] uppercase tracking-widest border border-emerald-500/20 h-8 md:h-10"
                      >
                        {isRightPlaying ? <Pause className="h-3 w-3 mr-2" /> : <Play className="h-3 w-3 mr-2" />}
                        {isRightPlaying ? "Pause Right" : "Play Right"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div
                    onClick={() => setIsSelectingRightTrack(true)}
                    className="h-full min-h-[140px] md:min-h-[160px] flex flex-col items-center justify-center gap-3 md:gap-4 bg-white/5 border-2 border-dashed border-white/10 rounded-xl md:rounded-2xl cursor-pointer hover:bg-white/10 transition-all group"
                  >
                    <div className="p-3 md:p-4 bg-white/5 rounded-full group-hover:scale-110 transition-transform">
                      <Music className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground opacity-20" />
                    </div>
                    <p className="text-[8px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Select Right Ear Track</p>
                  </div>
                )}
              </div>
            </div>

            <div className="relative z-10 px-4">
              <p className="text-[9px] text-muted-foreground font-medium italic text-center opacity-40">
                Tip: Audio only panner triggers when both ears have tracks assigned. {splitAudioEnabled ? "Tracks are currently panned Hard Left/Right." : "Enabled Split Mode to isolate channels."}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Devices Modal */}
      {isDevicesOpen && (
        <motion.div
          key="devicesModal"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="relative bg-background rounded-2xl shadow-2xl p-6 max-w-md w-full flex flex-col gap-6 border border-white/10 backdrop-blur-3xl">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                <Laptop2 className="h-6 w-6 text-primary" />
                Connect to Device
              </h3>
              <Button variant="ghost" size="icon" onClick={toggleDevices} className="rounded-full hover:bg-white/5">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              {devices.map((device) => (
                <div
                  key={device.id}
                  onClick={() => device.id !== currentDevice?.id && transferPlayback(device.id)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group",
                    device.id === currentDevice?.id
                      ? "bg-primary/10 border-primary/20"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-3 w-3 rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]",
                      device.is_active ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                    )} />
                    <div>
                      <p className="font-bold text-sm flex items-center gap-2">
                        {device.name}
                        {device.id === currentDevice?.id && <span className="text-[10px] text-primary/60">(This Device)</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                        {device.is_active ? "Active Playing" : "Sleep Mode"}
                      </p>
                    </div>
                  </div>
                  {device.is_active && (
                    <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                      Current
                    </div>
                  )}
                </div>
              ))}

              {devices.length === 0 && (
                <div className="p-6 bg-white/5 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center gap-3">
                  <div className="p-3 bg-white/5 rounded-full">
                    <Music className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-muted-foreground">Looking for devices...</p>
                    <p className="text-[10px] text-muted-foreground/40 font-medium px-4">
                      Open Spotilark on another device to see it here.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              <p className="text-[9px] text-center text-muted-foreground/30 uppercase font-black tracking-[0.2em]">
                Remote Sync Engine v1.4
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {(isQueueOpen || isLyricsOpen || isSettingsMenuOpen || isEqualizerOpen || isSplitAudioOpen || isDevicesOpen) && (
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
            if (isDevicesOpen) toggleDevices();
          }}
        />
      )}
    </AnimatePresence>
  );
};