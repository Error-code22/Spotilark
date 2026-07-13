"use client";

import type { Track, Lyric } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useSettings } from "./SettingsContext";
import { fetchLyrics } from "@/lib/lyrics";
import { getCachedTrack, cacheTrack, saveCoversBatch, getCover, saveLocalLibrary, loadLocalLibrary } from "@/lib/cache-utils";
import {
  storeAudioBlob, loadAudioBlob, deleteAudioFile,
  saveTrackMetadata, loadTrackMetadata, deleteTrackMetadata,
  saveCover as saveCoverNative, loadCover as loadCoverNative, saveCoversBatch as saveCoversBatchNative,
  clearAllStorage
} from "@/lib/storage-service";
import { resolveYouTubeStream } from "@/lib/youtube-utils";
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { useDevices } from "./DeviceContext";
import {
  initCapacitorAudio,
  updateMediaNotification,
  onMediaControlPause,
  onMediaControlNext,
  onMediaControlPrev,
  setCapacitorAudioPlaying,
  destroyCapacitorAudio,
} from "@/lib/capacitor-audio";
import dynamic from "next/dynamic";

const PlayerAudio = dynamic(() => import("@/components/PlayerAudio"), {
  ssr: false,
});

type RepeatMode = "off" | "all" | "one";

interface PlayerContextType {
  isPlaying: boolean;
  isNowPlayingOpen: boolean;
  currentTrack: Track | null;
  currentTrackIndex: number | null;
  currentTime: number;
  duration: number;
  volume: number;
  isShuffled: boolean;
  repeatMode: RepeatMode;
  play: (index: number) => Promise<void>;
  togglePlayPause: () => void;
  toggleNowPlaying: () => void;
  playNext: () => void;
  playPrev: () => void;
  handleSeek: (value: number) => void;
  seekBy: (amount: number) => void;
  handleVolumeChange: (value: number) => void;
  trackQueue: Track[];
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  refetchTracks: () => void;
  isTrackLiked: (trackId: string) => boolean;
  toggleLikeTrack: (track: Track) => Promise<void>;
  likedTrackIds: Set<string>;
  playTrack: (track: Track) => void;
  playTrackFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  updateTrackLyrics: (trackId: string, lyrics: Lyric[]) => void;
  splitAudioEnabled: boolean;
  setSplitAudioEnabled: (enabled: boolean) => void;
  rightAudioUrl: string;
  setRightAudioUrl: (url: string) => void;
  rightTrack: Track | null;
  setRightTrack: (track: Track | null) => void;
  isRightPlaying: boolean;
  toggleRightPlayPause: () => void;
  rightCurrentTime: number;
  rightDuration: number;
  handleRightSeek: (value: number) => void;
  isLyricsViewOpen: boolean;
  toggleLyricsView: () => void;
  localLibrary: Track[];
  addLocalTracks: (tracks: Track[], files?: File[]) => Promise<void>;
  removeLocalTracks: (trackIds: string[]) => Promise<void>;
  cloudLibrary: Track[];
  unifiedLibrary: Track[];
  sleepTimerEnd: number | null;
  sleepTimerRemaining: number | null;
  setSleepTimer: (minutes: number | null) => void;
  recentlyPlayed: Track[];
  playCounts: Record<string, number>;
  getPlayCount: (trackId: string) => number;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode; tracks: Track[]; refetch: () => void; }> = ({
  children,
  tracks,
  refetch,
}) => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("%c Spotilark Playback Fix V1.8 (Tauri HTTP) Active ", "background: #222; color: #bada55; font-size: 16px;");
    }
  }, []);
  const [cloudLibrary, setCloudLibrary] = useState<Track[]>([]);
  const [localLibrary, setLocalLibrary] = useState<Track[]>([]);
  const [trackQueue, setTrackQueue] = useState<Track[]>([]);
  const [isLyricsViewOpen, setIsLyricsViewOpen] = useState(false);

  // Load local library from platform storage
  useEffect(() => {
    (async () => {
      const isNative = Capacitor.isNativePlatform();

      // Load metadata from platform storage
      let saved = await loadTrackMetadata();

      // Fallback: migrate from localStorage (web only)
      if (!isNative && (!saved || saved.length === 0)) {
        const lsData = localStorage.getItem('spotilark-local-library');
        if (lsData) {
          try {
            saved = JSON.parse(lsData);
            await saveTrackMetadata(saved);
            localStorage.removeItem('spotilark-local-library');
            console.log('[Player] Migrated local library to platform storage');
          } catch {}
        }
      }

      if (saved && saved.length > 0) {
        const cleaned = saved.map((track: any) => ({
          ...track,
          source_url: track.source_url?.startsWith('blob:') ? '' : (track.source_url || ''),
          coverPath: track.coverPath || '',
          sourcePath: track.sourcePath || '',
          cover: track.cover && track.cover.startsWith('blob:')
            ? '/spotilark-without-text-white.png'
            : track.cover || '/spotilark-without-text-white.png',
        }));
        setLocalLibrary(cleaned);

        // Restore covers in batch to avoid React state batching race conditions
        (async () => {
          console.log(`[Player] Starting batch cover restoration for ${cleaned.length} tracks...`);
          const restorePromises = cleaned.map(async (track: any) => {
            const needsRestore = !track.cover ||
              track.cover === '/spotilark-without-text-white.png' ||
              track.cover.endsWith('...');
            if (needsRestore) {
              console.log(`[Player] Restoring cover for track: ${track.title} (ID: ${track.id})`);
              try {
                const realCover = await loadCoverNative(track.id, track.coverPath);
                console.log(`[Player] Loaded cover for ${track.title}: ${realCover ? realCover.substring(0, 100) + '...' : 'NULL'}`);
                if (realCover) {
                  return { id: track.id, cover: realCover };
                }
              } catch (err) {
                console.error(`[Player] Failed to load cover for ${track.title}:`, err);
              }
            }
            return null;
          });

          const restoredCovers = await Promise.all(restorePromises);
          const coverMap = new Map<string, string>();
          restoredCovers.forEach(item => {
            if (item) {
              coverMap.set(item.id, item.cover);
            }
          });

          console.log(`[Player] Successfully restored ${coverMap.size} cover images.`);

          if (coverMap.size > 0) {
            setLocalLibrary(prev => {
              const updated = prev.map(t => {
                const newCover = coverMap.get(t.id);
                return newCover ? { ...t, cover: newCover } : t;
              });
              console.log(`[Player] Updated local library state with restored covers.`);
              return updated;
            });
          }
        })();
      }
    })();
  }, []);

  const addLocalTracks = useCallback(async (newTracks: Track[], files?: File[]) => {
    const isNative = Capacitor.isNativePlatform();

    // 0. Deduplicate — skip tracks that already exist (by filename + size)
    const existingIds = new Set(localLibrary.map(t => t.id));
    const filteredTracks: Track[] = [];
    const filteredFiles: File[] = [];
    for (let i = 0; i < newTracks.length; i++) {
      const track = newTracks[i];
      const file = files?.[i];
      if (file) {
        const dedupeKey = `${file.name}-${file.size}`;
        const isDuplicate = localLibrary.some(t => {
          const tDedupeKey = (t as any).dedupeKey;
          return tDedupeKey === dedupeKey;
        });
        if (isDuplicate) {
          console.log(`[Player] Skipping duplicate: ${file.name}`);
          continue;
        }
        (track as any).dedupeKey = dedupeKey;
      }
      if (!existingIds.has(track.id)) {
        filteredTracks.push(track);
        if (file) filteredFiles.push(file);
      }
    }

    if (filteredTracks.length === 0) {
      console.log(`[Player] All tracks are duplicates, nothing to add`);
      return;
    }

    // 1. Store audio blobs
    const sourcePaths: Record<string, string> = {};
    if (filteredFiles.length > 0) {
      console.log(`[Player] Storing ${filteredFiles.length} audio files...`);
      for (let i = 0; i < filteredFiles.length; i++) {
        const file = filteredFiles[i];
        const track = filteredTracks[i];
        if (track && file) {
          const originalPath = (file as any).path || undefined;
          const path = await storeAudioBlob(track.id, file, originalPath);
          sourcePaths[track.id] = path;
        }
      }
    }

    // 2. Save covers to separate storage
    const coverMap: Record<string, string> = {};
    filteredTracks.forEach(track => {
      if (track.cover && track.cover.startsWith('data:')) {
        coverMap[track.id] = track.cover;
      }
    });
    if (Object.keys(coverMap).length > 0) {
      await saveCoversBatchNative(coverMap);
    }

    const tracksWithStableCovers = filteredTracks.map(track => ({
      ...track,
      cover: track.cover && track.cover.startsWith('blob:')
        ? '/spotilark-without-text-white.png'
        : track.cover || '/spotilark-without-text-white.png'
    }));

    setLocalLibrary(prev => {
      const updated = [...prev, ...tracksWithStableCovers];
      const unique = Array.from(new Map(updated.map(t => [t.id, t])).values());

      // Build a lookup of existing persisted data to preserve it for tracks not in this batch
      const prevMetaMap = new Map<string, any>();
      for (const t of prev) {
        prevMetaMap.set(t.id, {
          sourcePath: (t as any).sourcePath || '',
          source_url: t.source_url || '',
          coverPath: (t as any).coverPath || '',
        });
      }

      // Build metadata for storage — preserve existing data for tracks not in this upload batch
      const metadata = unique.map(t => {
        const existing = prevMetaMap.get(t.id);
        const hasStoredCover = !!coverMap[t.id];
        return {
          ...t,
          sourcePath: sourcePaths[t.id] || (existing?.sourcePath || ''),
          coverPath: hasStoredCover ? `covers/${t.id}.jpg` : (existing?.coverPath || (t as any).coverPath || ''),
          source_url: sourcePaths[t.id] ? (t.source_url || '') : (existing?.source_url || t.source_url || ''),
          cover: t.cover || '/spotilark-without-text-white.png',
          extra: {}
        };
      });

      // Save to platform storage
      saveTrackMetadata(metadata).catch(e => console.error('[Player] Failed to save metadata:', e));

      // Also try localStorage as web backup
      if (!isNative) {
        try { localStorage.setItem('spotilark-local-library', JSON.stringify(metadata)); } catch {}
      }

      return unique;
    });
  }, []);

  const removeLocalTracks = useCallback(async (trackIds: string[]) => {
    const idSet = new Set(trackIds);
    const isNative = Capacitor.isNativePlatform();

    setLocalLibrary(prev => {
      const remaining = prev.filter(t => !idSet.has(t.id));

      const metadata = remaining.map(t => ({
        ...t,
        sourcePath: (t as any).sourcePath || '',
        source_url: t.source_url || '',
        coverPath: (t as any).coverPath || '',
        cover: t.cover || '/spotilark-without-text-white.png',
        extra: {}
      }));

      saveTrackMetadata(metadata).catch(e => console.error('[Player] Failed to save metadata:', e));

      if (!isNative) {
        try { localStorage.setItem('spotilark-local-library', JSON.stringify(metadata)); } catch {}
      }

      return remaining;
    });

    for (const trackId of trackIds) {
      try { await deleteTrackMetadata(trackId); } catch {}
      try { await deleteAudioFile(trackId); } catch {}
    }
  }, []);

  // Derive Unified Library
  const [unifiedLibrary, setUnifiedLibrary] = useState<Track[]>([]);

  useEffect(() => {
    // Label tracks correctly without overwriting valid storage_type
    const cloudWithLegacy = tracks.map(t => {
      let type = t.storage_type;
      if (!type) {
        const isYoutube = (typeof t.id === 'string' && t.id.startsWith('yt-')) ||
          (t.source_url && t.source_url.includes('stream/youtube')) ||
          (t.source_url && t.source_url.includes('youtube.com'));
        type = isYoutube ? 'stream' : 'cloud';
      }
      return { ...t, storage_type: type as any };
    });
    setCloudLibrary(cloudWithLegacy);
  }, [tracks]);

  useEffect(() => {
    // Combine Local and Cloud into Unified
    const combined = [...localLibrary.map(t => ({ ...t, storage_type: 'local' as const })), ...cloudLibrary];

    // Sort by created_at descending if available, or just combined
    const sorted = combined.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setUnifiedLibrary(sorted);

    // Only initialize trackQueue if it's empty (don't overwrite user-modified queue)
    setTrackQueue(prev => {
      if (prev.length === 0) return sorted;
      return prev;
    });
  }, [localLibrary, cloudLibrary]);

  const toggleLyricsView = useCallback(() => {
    setIsLyricsViewOpen(prev => !prev);
  }, []);

  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(
    null // Start with no track selected
  );

  const currentTrack =
    currentTrackIndex !== null ? trackQueue[currentTrackIndex] : null;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(new Set());
  const [sleepTimerEnd, setSleepTimerEnd] = useState<number | null>(null);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});

  const { crossfade, crossfadeDuration, playbackSpeed, streamingQuality, normalizeAudio } = useSettings();
  const { currentDevice, activePlayerDevice, registerDevice, activateDevice, updatePlaybackState, sendCommand } = useDevices();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) registerDevice();
    });
  }, [registerDevice]);

  // Handle Playback Takeover: If we start playing locally, we must become the Active device
  useEffect(() => {
    if (isPlaying && currentDevice && !currentDevice.is_active) {
      console.log("[Player] Local playback started. Seizing Active role...");
      activateDevice();
    }
  }, [isPlaying, currentDevice?.is_active, activateDevice]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);

  // Stats Tracking Refs
  const playTimeRef = useRef<number>(0);
  const totalMinutesRecordedRef = useRef<number>(0);
  const songPlayRecordedRef = useRef<string | null>(null); // trackId of currently recorded song
  const lastTickRef = useRef<number>(Date.now());

  // Refs for stable comparison in remote sync effect
  const isPlayingRef = useRef(isPlaying);
  const volumeRef = useRef(volume);
  const currentTrackRef = useRef(currentTrack);
  const currentTimeRef = useRef(currentTime);
  const trackQueueRef = useRef(trackQueue);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { trackQueueRef.current = trackQueue; }, [trackQueue]);

  // Initialize Web Audio API for Normalization
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initAudioContext = () => {
      if (!audioCtxRef.current && audioRef.current) {
        const audioEl = audioRef.current;
        const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;

        let ctx: AudioContext;
        let source: MediaElementAudioSourceNode;

        // Reuse if already exists on element (e.g. created by Equalizer)
        if ((audioEl as any)._audioContext && (audioEl as any)._mediaElementSource) {
          ctx = (audioEl as any)._audioContext;
          source = (audioEl as any)._mediaElementSource;
        } else {
          ctx = new AudioContextCtor();
          source = ctx.createMediaElementSource(audioEl);

          // Attach to element for reuse
          (audioEl as any)._audioContext = ctx;
          (audioEl as any)._mediaElementSource = source;
        }

        audioCtxRef.current = ctx;
        sourceNodeRef.current = source;

        // Connect directly to destination
        source.connect(ctx.destination);
      }
    };

    // Initialize on first user interaction or when needed
    document.addEventListener('click', initAudioContext, { once: true });
    return () => document.removeEventListener('click', initAudioContext);
  }, []);


  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = playbackSpeed;
      audio.defaultPlaybackRate = playbackSpeed;
    }
    const nextAudio = nextAudioRef.current;
    if (nextAudio) {
      nextAudio.playbackRate = playbackSpeed;
      nextAudio.defaultPlaybackRate = playbackSpeed;
    }
  }, [playbackSpeed, currentTrack]);

  const handleSeek = useCallback((value: number) => {
    // Remote Control Logic
    if (activePlayerDevice && !currentDevice?.is_active) {
      sendCommand(activePlayerDevice.id, { type: 'SEEK', value: Math.floor(value * 1000) });
      return;
    }

    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setCurrentTime(value);
    }
  }, [activePlayerDevice, currentDevice?.is_active, sendCommand]);

  const seekBy = useCallback((amount: number) => {
    if (audioRef.current && duration > 0) {
      const newTime = audioRef.current.currentTime + amount;
      const clampedTime = Math.max(0, Math.min(newTime, duration));
      audioRef.current.currentTime = clampedTime;
      setCurrentTime(clampedTime);
    }
  }, [duration]);

  const handleVolumeChange = useCallback((value: number) => {
    // Remote Control Logic
    if (activePlayerDevice && !currentDevice?.is_active) {
      sendCommand(activePlayerDevice.id, { type: 'VOLUME', value });
      return;
    }
    setVolume(value);
  }, [activePlayerDevice, currentDevice?.is_active, sendCommand]);

  const toggleShuffle = useCallback(() => {
    setIsShuffled(prev => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const toggleNowPlaying = useCallback(() => {
    setIsNowPlayingOpen(prev => !prev);
  }, []);

  const setSleepTimer = useCallback((minutes: number | null) => {
    if (minutes === null) {
      setSleepTimerEnd(null);
      setSleepTimerRemaining(null);
    } else {
      setSleepTimerEnd(Date.now() + minutes * 60 * 1000);
    }
  }, []);

  const play = useCallback(async (index: number) => {
    if (index >= 0 && index < trackQueue.length) {
      // Remote Control Logic
      if (activePlayerDevice && !currentDevice?.is_active) {
        console.log(`[RemoteControl] Casting track to: ${activePlayerDevice.name}`);
        const track = trackQueue[index];
        await sendCommand(activePlayerDevice.id, { type: 'SET_TRACK', value: track });
        await sendCommand(activePlayerDevice.id, { type: 'PLAY_PAUSE', value: true });
        return;
      }

      // Automix/Crossfade Transition
      if (isPlaying && (crossfade || crossfade) && audioRef.current && !audioRef.current.paused) {
        const audio = audioRef.current;
        const fadeOutDuration = crossfadeDuration;

        // Start fading out the current song
        const startVol = audio.volume;
        const fadeInterval = 50; // ms
        const steps = (fadeOutDuration * 1000) / fadeInterval;
        let currentStep = 0;

        const fadeOut = setInterval(() => {
          currentStep++;
          const progress = currentStep / steps;
          audio.volume = Math.max(0, startVol * (1 - progress));

          if (currentStep >= steps) clearInterval(fadeOut);
        }, fadeInterval);
      }

      // Reset tracking for new song
      playTimeRef.current = 0;

      setRecentlyPlayed(prev => {
        const track = trackQueue[index];
        const filtered = prev.filter(t => t.id !== track.id);
        return [track, ...filtered].slice(0, 50);
      });

      setCurrentTrackIndex(index);
      setIsPlaying(true);
    }
  }, [trackQueue.length, isPlaying, crossfade, crossfade, crossfadeDuration, activePlayerDevice, currentDevice?.is_active, sendCommand]);

  const playTrack = useCallback(async (track: Track) => {
    // Remote Control Logic
    if (activePlayerDevice && !currentDevice?.is_active) {
      console.log(`[RemoteControl] Casting track to: ${activePlayerDevice.name}`);
      await sendCommand(activePlayerDevice.id, { type: 'SET_TRACK', value: track });
      await sendCommand(activePlayerDevice.id, { type: 'PLAY_PAUSE', value: true });
      return;
    }

    setRecentlyPlayed(prev => {
      const filtered = prev.filter(t => t.id !== track.id);
      return [track, ...filtered].slice(0, 50);
    });

    // Find the index of this track in the current queue
    const trackIndex = trackQueue.findIndex(t => t.id === track.id);

    if (trackIndex !== -1) {
      // If the track exists in the current queue, play it by index
      setCurrentTrackIndex(trackIndex);
      setIsPlaying(true);
    } else {
      // Add track to queue and play it in one batch
      const newQueue = [...trackQueue, track];
      setTrackQueue(newQueue);
      setCurrentTrackIndex(newQueue.length - 1);
      setIsPlaying(true);
    }
  }, [trackQueue, activePlayerDevice, currentDevice?.is_active, sendCommand]);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    setTrackQueue(prev => {
      const newQueue = [...prev];
      const [moved] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, moved);
      // Adjust currentTrackIndex if needed
      if (currentTrackIndex !== null) {
        if (fromIndex === currentTrackIndex) {
          setCurrentTrackIndex(toIndex);
        } else if (fromIndex < currentTrackIndex && toIndex >= currentTrackIndex) {
          setCurrentTrackIndex(currentTrackIndex - 1);
        } else if (fromIndex > currentTrackIndex && toIndex <= currentTrackIndex) {
          setCurrentTrackIndex(currentTrackIndex + 1);
        }
      }
      return newQueue;
    });
  }, [currentTrackIndex]);

  const playNext = useCallback(() => {
    if (trackQueue.length === 0) return;
    if (currentTrackIndex === null) return;

    if (repeatMode === 'one') {
      handleSeek(0);
      return;
    }

    if (isShuffled) {
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * trackQueue.length);
      } while (trackQueue.length > 1 && randomIndex === currentTrackIndex);
      play(randomIndex);
      return;
    }

    const nextIndex = (currentTrackIndex + 1);
    if (nextIndex < trackQueue.length) {
      play(nextIndex);
    } else if (repeatMode === 'all') {
      play(0);
    } else {
      // Stop playing if at the end of the queue and not repeating all
      setIsPlaying(false);
      setCurrentTrackIndex(null);
    }

  }, [currentTrackIndex, trackQueue.length, play, repeatMode, isShuffled, handleSeek]);

  const playPrev = useCallback(() => {
    // Remote Control Logic
    if (activePlayerDevice && !currentDevice?.is_active) {
      sendCommand(activePlayerDevice.id, { type: 'SKIP', value: 'prev' });
      return;
    }

    if (trackQueue.length === 0) return;
    if (currentTrackIndex !== null) {
      const prevIndex =
        (currentTrackIndex - 1 + trackQueue.length) % trackQueue.length;
      play(prevIndex);
    }
  }, [currentTrackIndex, trackQueue.length, play, activePlayerDevice, currentDevice?.is_active, sendCommand]);

  const togglePlayPause = useCallback(() => {
    // Remote Control Logic
    if (activePlayerDevice && !currentDevice?.is_active) {
      sendCommand(activePlayerDevice.id, { type: 'PLAY_PAUSE', value: !isPlaying });
      return;
    }

    if (currentTrackIndex === null && trackQueue.length > 0) {
      play(0);
    } else if (currentTrack) {
      const newPlaying = !isPlaying;
      setIsPlaying(newPlaying);
      // Directly control audio element for immediate response
      const audioEl = document.querySelector('audio');
      if (audioEl) {
        if (newPlaying) {
          audioEl.play().catch(() => {});
        } else {
          audioEl.pause();
        }
      }
    }
  }, [currentTrackIndex, trackQueue.length, play, currentTrack, activePlayerDevice, currentDevice?.is_active, sendCommand, isPlaying]);

  /*
   * Keyboard Shortcuts
   * Space: Toggle Play/Pause
   * N: Next Track
   * P: Previous Track
   * M: Mute
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contentEditable element
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'KeyN') {
        playNext();
      } else if (e.code === 'KeyP') {
        playPrev();
      } else if (e.code === 'KeyM') {
        setVolume((prev) => (prev > 0 ? 0 : 0.5));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekBy(-10);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekBy(10);
      } else if (e.code === 'KeyS') {
        toggleShuffle();
      } else if (e.code === 'KeyR') {
        toggleRepeat();
      } else if (e.code === 'KeyL') {
        toggleLyricsView();
      } else if (e.code === 'KeyQ') {
        // Toggle queue — handled by event
        window.dispatchEvent(new CustomEvent('spotilark-toggle-queue'));
      } else if (e.code === 'KeyF') {
        window.dispatchEvent(new CustomEvent('spotilark-toggle-nowplaying'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, playNext, playPrev, seekBy, toggleShuffle, toggleRepeat, toggleLyricsView]);

  useEffect(() => {
    // In a real app, you would load the track queue from local storage here.
    if (trackQueue.length > 0 && currentTrackIndex === null) {
      // Don't auto-play, just set the first track
      setCurrentTrackIndex(0);
    }
  }, [trackQueue, currentTrackIndex]);

  // Load the liked tracks from localStorage when tracks are available
  useEffect(() => {
    const loadLikedTracks = () => {
      try {
        const likedSongs = JSON.parse(localStorage.getItem('likedSongs') || '[]');
        const likedIds = new Set<string>(likedSongs);
        setLikedTrackIds(likedIds);
      } catch (err) {
        console.error('Error loading liked tracks from localStorage:', err);
        setLikedTrackIds(new Set());
      }
    };

    loadLikedTracks();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedVolume = localStorage.getItem("spotilark-volume");
      const audio = audioRef.current;

      if (audio) {
        if (savedVolume) {
          setVolume(parseFloat(savedVolume));
          audio.volume = parseFloat(savedVolume);
        }

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleLoadedMetadata = () => setDuration(audio.duration);
        const handleEnded = () => playNext();

        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("loadedmetadata", handleLoadedMetadata);
        audio.addEventListener("ended", handleEnded);

        return () => {
          audio.removeEventListener("timeupdate", handleTimeUpdate);
          audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
          audio.removeEventListener("ended", handleEnded);
        };
      }
    }
  }, []);

  // Sync state with DeviceContext for the active player
  useEffect(() => {
    if (!currentDevice?.is_active) return;

    const syncToCloud = async () => {
      await updatePlaybackState({
        current_track_json: currentTrack,
        is_playing: isPlaying,
        position_ms: Math.floor(currentTime * 1000),
        volume: volume,
        queue_ids: trackQueue.map(t => t.id)
      });
    };

    // Throttled sync for position, immediate for play/track changes
    const timer = setTimeout(syncToCloud, isPlaying ? 5000 : 1000);
    return () => clearTimeout(timer);
  }, [currentTrack?.id, isPlaying, volume, Math.floor(currentTime / 5), trackQueue.length]);

  // Listen for Remote Commands (when we are the active player) OR State Mirroring (when we are the controller)
  useEffect(() => {
    if (!currentDevice || !user) return;

    const supabase = createClient();
    const sub = supabase.channel(`device_sync_${currentDevice.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'devices',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const updatedDevice = payload.new as any;

        // 1. BEHAVIOR AS ACTIVE PLAYER: Listen for incoming commands
        if (currentDevice.is_active && updatedDevice.id === currentDevice.id) {
          // Check if track changed remotely (e.g. from a "Play This" command)
          if (updatedDevice.current_track_json?.id && updatedDevice.current_track_json.id !== currentTrackRef.current?.id) {
            playTrack(updatedDevice.current_track_json);
          }

          // Check if play/pause changed remotely
          if (updatedDevice.is_playing !== isPlayingRef.current) {
            setIsPlaying(updatedDevice.is_playing);
          }

          // Check if volume changed remotely
          if (updatedDevice.volume !== volumeRef.current) {
            setVolume(updatedDevice.volume);
          }

          // Check for specific commands in metadata (SKIP/SEEK)
          if (updatedDevice.current_track_json?._command) {
            const cmd = updatedDevice.current_track_json._command;
            if (cmd.type === 'SKIP') {
              if (cmd.value === 'next') playNext();
              else playPrev();
              updatePlaybackState({ current_track_json: { ...updatedDevice.current_track_json, _command: null } });
            }
            if (cmd.type === 'SEEK') {
              handleSeek(cmd.value / 1000);
              updatePlaybackState({ current_track_json: { ...updatedDevice.current_track_json, _command: null } });
            }
          }
        }

        // 2. BEHAVIOR AS CONTROLLER: Mirror the Active Player's state
        if (!currentDevice.is_active && updatedDevice.is_active) {
          console.log(`[RemoteSync] Mirroring Active Player: ${updatedDevice.name}`);
          if (updatedDevice.current_track_json?.id !== currentTrackRef.current?.id) {
            // Update local currentTrack without triggering local playback
            const trackIndex = trackQueueRef.current.findIndex(t => t.id === updatedDevice.current_track_json.id);
            if (trackIndex !== -1) setCurrentTrackIndex(trackIndex);
            else {
              // If track not in current queue, we'd need to fetch it or just use the JSON
              // For now, let's just use the JSON to keep the UI in sync
              setTrackQueue([updatedDevice.current_track_json]);
              setCurrentTrackIndex(0);
            }
          }
          if (updatedDevice.is_playing !== isPlayingRef.current) setIsPlaying(updatedDevice.is_playing);
          if (updatedDevice.volume !== volumeRef.current) setVolume(updatedDevice.volume);

          // Sync position if it's significantly different (> 5s)
          const remotePos = updatedDevice.position_ms / 1000;
          if (Math.abs(currentTimeRef.current - remotePos) > 5) {
            setCurrentTime(remotePos);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [currentDevice?.id, currentDevice?.is_active, user, playNext, playPrev, updatePlaybackState, handleSeek]);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Audio normalization — analyze loudness and adjust gain
  const audioContextRef = useRef<AudioContext | null>(null);
  const normalizationGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !normalizeAudio) return;

    const handleCanPlay = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();

        // Only create new nodes if not already connected
        if (!normalizationGainRef.current) {
          const source = ctx.createMediaElementSource(audio);
          const gain = ctx.createGain();
          source.connect(gain);
          gain.connect(ctx.destination);
          normalizationGainRef.current = gain;
        }

        // Analyze a short sample to measure loudness
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        const tempSource = ctx.createMediaElementSource(audio);
        tempSource.connect(analyser);
        analyser.connect(ctx.destination);

        // Wait a bit for audio to load, then measure
        setTimeout(() => {
          try {
            const dataArray = new Float32Array(analyser.fftSize);
            analyser.getFloatTimeDomainData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i] * dataArray[i];
            }
            const rms = Math.sqrt(sum / dataArray.length);
            // Target RMS ~0.1 (comfortable listening level)
            const targetRMS = 0.1;
            const gainValue = Math.min(2, Math.max(0.1, targetRMS / (rms || 0.1)));
            if (normalizationGainRef.current) {
              normalizationGainRef.current.gain.setValueAtTime(gainValue, ctx.currentTime);
            }
            console.log(`[Player] Normalization: RMS=${rms.toFixed(3)}, Gain=${gainValue.toFixed(2)}`);
          } catch {}
          // Disconnect temp source to avoid double playback
          try { tempSource.disconnect(); analyser.disconnect(); } catch {}
        }, 500);
      } catch (e) {
        console.warn('[Player] Normalization failed:', e);
      }
    };

    audio.addEventListener('canplay', handleCanPlay);
    return () => audio.removeEventListener('canplay', handleCanPlay);
  }, [currentTrack?.id, normalizeAudio]);

  // Sync playback state
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const cacheTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const syncPlayback = async () => {
      try {
        if (currentTrack) {
          // Clear any pending cache timer when track changes
          if (cacheTimerRef.current) {
            clearTimeout(cacheTimerRef.current);
            cacheTimerRef.current = null;
          }

          let audioSrc = currentTrack.source_url || '';
          let isPlayingSnippet = false;
          const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

          console.log(`[Player] Track: ${currentTrack.title} | Storage: ${currentTrack.storage_type} | ID: ${currentTrack.id} | source_url: ${currentTrack.source_url?.substring(0, 50)} | sourcePath: ${(currentTrack as any).sourcePath} | isElectron: ${isElectron}`);

          // ========================================
          // LOCAL TRACKS: Simple path — load from filesystem or IndexedDB
          // ========================================
          if (currentTrack.storage_type === 'local') {
            const sourcePath = (currentTrack as any).sourcePath || '';

            // Electron: play directly from file path using local-audio:// protocol
            if (isElectron && sourcePath && !sourcePath.startsWith('idb://')) {
              console.log(`[Player] Electron local-audio: ${sourcePath.substring(0, 80)}`);
              audioSrc = `local-audio://${encodeURIComponent(sourcePath)}`;
            } else if (isElectron && currentTrack.source_url && !currentTrack.source_url.startsWith('blob:') && !currentTrack.source_url.startsWith('idb://')) {
              // Fallback: source_url has a raw file path, convert to local-audio://
              console.log(`[Player] Electron fallback source_url: ${currentTrack.source_url.substring(0, 80)}`);
              audioSrc = `local-audio://${encodeURIComponent(currentTrack.source_url)}`;
            } else {
              console.log(`[Player] Local track fallback (Web/Mobile): cachedBlob path`);
              // Web/Mobile: load blob from IndexedDB/filesystem
              const cachedBlob = await getCachedTrack(currentTrack.id);
              if (cachedBlob) {
                if ((audio as any)._lastTrackId === currentTrack.id && (audio as any)._lastBlobUrl) {
                  audioSrc = (audio as any)._lastBlobUrl;
                } else {
                  if ((audio as any)._lastBlobUrl) URL.revokeObjectURL((audio as any)._lastBlobUrl);
                  audioSrc = URL.createObjectURL(cachedBlob);
                  (audio as any)._lastBlobUrl = audioSrc;
                  (audio as any)._lastTrackId = currentTrack.id;
                }
              } else {
                console.warn(`[Player] Local track not found in storage: ${currentTrack.title}`);
                // Auto-skip missing local tracks
                setTimeout(() => playNext(), 500);
                return;
              }
            }

            if (audio.src !== audioSrc) {
              audio.src = audioSrc;
              audio.load();
              (audio as any)._lastSetId = currentTrack.id;
            }
            if (isPlaying) {
              audio.play().catch(() => {});
            }
            return;
          }

          // ========================================
          // CLOUD / STREAM TRACKS: Full URL resolution
          // ========================================

          // 0. CHECK FOR INTRO SNIPPET
          const initialCachedBlob = await getCachedTrack(currentTrack.id);
          if (!initialCachedBlob && (currentTrack as any).snippet_data) {
            console.log(`[Player] Using 15s INTRO SNIPPET for instant start: ${currentTrack.title}`);
            audioSrc = (currentTrack as any).snippet_data;
            isPlayingSnippet = true;

            if (!streamCacheRef.current.has(currentTrack.id)) {
              (async () => {
                try {
                  const fullRes = await fetch(currentTrack.source_url || '');
                  if (fullRes.ok) {
                    const blob = await fullRes.blob();
                    if (blob.size > 1000) {
                      const blobUrl = URL.createObjectURL(blob);
                      streamCacheRef.current.set(currentTrack.id, blobUrl);
                    }
                  }
                } catch (e) {
                  console.error(`[Player] Pre-fetch failed:`, e);
                }
              })();
            }
          }

          // Handle YouTube stream resolution
          const isYouTube = currentTrack.storage_type === 'stream' ||
            (currentTrack.source_url && (currentTrack.source_url.includes('youtube.com') || currentTrack.source_url.includes('youtu.be')));

          let youTubeVideoId = '';
          if (typeof currentTrack.id === 'string' && currentTrack.id.startsWith('yt-')) {
            youTubeVideoId = currentTrack.id.replace('yt-', '');
          } else if (currentTrack.source_url) {
            try {
              const url = new URL(currentTrack.source_url, window.location.href);
              youTubeVideoId = url.searchParams.get('v') || '';
            } catch (e) {
              const match = currentTrack.source_url.match(/[?&]v=([^&]+)/);
              if (match) youTubeVideoId = match[1];
            }
          }

          if (isYouTube && !isPlayingSnippet) {
            if (youTubeVideoId) {
              audioSrc = `/api/stream/youtube?v=${youTubeVideoId}`;
            }
          }

          // 1. Check if track is cached
          const sourcePath = (currentTrack as any).sourcePath || '';
          const cachedBlob = await loadAudioBlob(currentTrack.id, sourcePath || audioSrc);

          if (cachedBlob) {
            if ((audio as any)._lastTrackId === currentTrack.id && (audio as any)._lastBlobUrl) {
              audioSrc = (audio as any)._lastBlobUrl;
            } else {
              if ((audio as any)._lastBlobUrl) URL.revokeObjectURL((audio as any)._lastBlobUrl);
              audioSrc = URL.createObjectURL(cachedBlob);
              (audio as any)._lastBlobUrl = audioSrc;
              (audio as any)._lastTrackId = currentTrack.id;
            }
          } else if (!audioSrc || audioSrc === '') {
            console.warn(`[Player] No audio data for ${currentTrack.title} — skipping`);
            return;
          } else {
            // If not cached, clear blob cache
            if ((audio as any)._lastBlobUrl) {
              URL.revokeObjectURL((audio as any)._lastBlobUrl);
              (audio as any)._lastBlobUrl = null;
              (audio as any)._lastTrackId = null;
            }

            // SMART STREAMING: Delay heavy caching by 20 seconds
            const cacheDelay = Capacitor.isNativePlatform() ? 20000 : 30000; // 20s on Native, 30s on Web

            if (currentTrack.storage_type !== 'stream' || Capacitor.isNativePlatform()) {
              cacheTimerRef.current = setTimeout(async () => {
                try {
                  const doubleCheck = await getCachedTrack(currentTrack.id);
                  if (doubleCheck) return;

                  console.log(`[Player] Smart Cache starting for: ${currentTrack.title}`);
                  let finalUrl = currentTrack.source_url;

                  // Skip caching for local tracks with no valid source URL
                  if (currentTrack.storage_type === 'local' && (!finalUrl || finalUrl.startsWith('blob:') || finalUrl.startsWith('idb://'))) {
                    console.log(`[Player] Local track has no fetchable URL, skipping smart cache: ${currentTrack.title}`);
                    return;
                  }

                  if (streamCacheRef.current.has(currentTrack.id)) {
                    finalUrl = streamCacheRef.current.get(currentTrack.id)!;
                  } else {
                    // For YouTube streams, use the proxy URL
                    if (currentTrack.storage_type === 'stream') {
                      const trackId = typeof currentTrack.id === 'string' && currentTrack.id.startsWith('yt-') ?
                        currentTrack.id.replace('yt-', '') : null;
                      if (trackId) {
                        finalUrl = `/api/stream/youtube?v=${trackId}`;
                      }
                    }
                  }

                  if (!finalUrl) return;

                  let blob: Blob | null = null;

                  if (Capacitor.isNativePlatform()) {
                    const options = { url: finalUrl, responseType: 'blob' as const };
                    const response = await CapacitorHttp.get(options);
                    if (response.status === 200) {
                      const data = response.data;
                      if (typeof data === 'string') {
                        const base64Response = await fetch(`data:audio/mp3;base64,${data}`);
                        blob = await base64Response.blob();
                      }
                    }
                  } else {
                    const response = await fetch(finalUrl);
                    if (response.ok) {
                      const contentType = response.headers.get('Content-Type');
                      if (contentType && !contentType.includes('text/html')) {
                        blob = await response.blob();
                      }
                    }
                  }

                  if (blob) {
                    await cacheTrack(currentTrack.id, blob);
                    console.log(`Track ${currentTrack.title} cached successfully. Clearing snippet to save storage...`);

                    // User requested: Remove snippet from DB after local cache is successful
                    if ((currentTrack as any).snippet_data || (currentTrack as any).snippet_url) {
                      fetch('/api/save-track-metadata', {
                        method: 'POST', // Re-using same API to update/clear snippet
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          title: currentTrack.title,
                          artist: currentTrack.artist,
                          audioUrl: currentTrack.source_url,
                          updateOnly: true, // Hint to API to update existing
                          clearSnippet: true,
                          trackId: currentTrack.id
                        })
                      }).catch(e => console.error("Failed to clear snippet storage:", e));
                    }

                    if ((audio as any)._lastSetId === currentTrack.id && !audio.paused) {
                      console.log(`[Player] Switching to local cache for: ${currentTrack.title}`);
                      const newUrl = URL.createObjectURL(blob);
                      const curTime = audio.currentTime;
                      const wasPlaying = !audio.paused;

                      const handleMetadata = () => {
                        audio.currentTime = curTime;
                        if (wasPlaying) audio.play().catch(() => { });
                        audio.removeEventListener('loadedmetadata', handleMetadata);
                      };

                      audio.addEventListener('loadedmetadata', handleMetadata);
                      audio.src = newUrl;
                      (audio as any)._lastBlobUrl = newUrl;
                    }
                  }
                } catch (e) {
                  console.error("Smart caching failed:", e);
                }
              }, cacheDelay);
            }
          }

          const currentAudioSrc = audio.src;
          let absoluteSrc = audioSrc;
          if (!audioSrc.startsWith('blob:')) {
            try {
              absoluteSrc = new URL(audioSrc, window.location.href).href;
            } catch {
              // Fallback for native local file paths or invalid URL formats
              absoluteSrc = audioSrc;
            }
          }

          const needsUpdate = (audio as any)._lastSetId !== currentTrack.id ||
            (currentAudioSrc !== absoluteSrc && currentAudioSrc !== audioSrc);

          if (needsUpdate) {
            console.log(`[Player] Setting Source: ${currentTrack.title} -> ${audioSrc.substring(0, 50)}...`);
            audio.src = audioSrc;
            audio.load(); // Explicitly load the new source
            (audio as any)._lastSetId = currentTrack.id;
            (audio as any)._isPlayingSnippet = isPlayingSnippet;
            audio.playbackRate = playbackSpeed;
            setDuration(currentTrack.duration || 0);

            // Handle transition from snippet to full stream at 15s mark
            const handleSnippetTransition = () => {
              if ((audio as any)._isPlayingSnippet && audio.currentTime >= 14.5) {
                console.log(`[Player] Transitioning from Snippet to Full Stream for ${currentTrack.title}`);
                const fullUrl = streamCacheRef.current.get(currentTrack.id) || currentTrack.source_url;

                const currentTime = audio.currentTime;
                (audio as any)._isPlayingSnippet = false;
                audio.src = fullUrl;
                audio.currentTime = currentTime;
                audio.play();
              }
            };
            audio.removeEventListener('timeupdate', (audio as any)._snippetHandler);
            (audio as any)._snippetHandler = handleSnippetTransition;
            audio.addEventListener('timeupdate', handleSnippetTransition);

            audio.onerror = (e) => {
              // Ignore errors if track ended normally or is paused
              if (audio.ended || audio.paused) return;
              const error = audio.error;
              let message = "Unknown error";
              if (error) {
                switch (error.code) {
                  case error.MEDIA_ERR_ABORTED: message = "Playback aborted"; break;
                  case error.MEDIA_ERR_NETWORK: message = "Network error"; break;
                  case error.MEDIA_ERR_DECODE: message = "Decode error"; break;
                  case error.MEDIA_ERR_SRC_NOT_SUPPORTED: message = "Source not supported"; break;
                }
              }
              console.error(`[Player] Playback Error [${currentTrack.title}]: ${message}`, error);

              // Don't fallback to a URL that already failed
              const lastErrorUrl = (audio as any)._lastErrorUrl;
              if (lastErrorUrl === audio.src) {
                console.log(`[Player] Same URL already failed, not retrying`);
                return;
              }
              (audio as any)._lastErrorUrl = audio.src;

              // For YouTube streams, try resolving fresh and playing the CDN URL directly
              if (isYouTube && youTubeVideoId && !isPlayingSnippet) {
                console.log(`[Player] Attempting direct CDN resolve for ${currentTrack.title}...`);
                fetch(`/api/stream/youtube?v=${youTubeVideoId}`)
                  .then(async (res) => {
                    if (!res.ok) {
                      const errData = await res.json().catch(() => ({}));
                      throw new Error(errData.error || `HTTP ${res.status}`);
                    }
                    const blob = await res.blob();
                    if (blob.size < 1000) throw new Error("Response too small, likely an error");
                    const blobUrl = URL.createObjectURL(blob);
                    streamCacheRef.current.set(currentTrack.id, blobUrl);
                    audio.src = blobUrl;
                    audio.load();
                    if (isPlaying) audio.play();
                  })
                  .catch((fetchErr) => {
                    console.error(`[Player] Direct resolve also failed:`, fetchErr);
                  });
              }

              // For local tracks with missing files, auto-skip to next
              if (currentTrack.storage_type === 'local') {
                console.log(`[Player] Local track failed, skipping: ${currentTrack.title}`);
                setTimeout(() => playNext(), 500);
              }
            };

            if (crossfade && isPlaying) {
              audio.volume = 0;
            } else {
              audio.volume = volume;
            }
          }

          if (isPlaying && (currentDevice?.is_active || !currentDevice)) {
            console.log(`[Player] Calling audio.play() for: ${currentTrack.title}. Muted: ${audio.muted}, Volume: ${audio.volume}, ReadyState: ${audio.readyState}`);
            if (playPromiseRef.current) {
              await playPromiseRef.current;
            }
            playPromiseRef.current = audio.play();
            await playPromiseRef.current;
            playPromiseRef.current = null;

            // Animate Fade In
            if (crossfade && audio.volume < volume) {
              const fadeTime = (crossfadeDuration * 1000) / 2;
              const steps = 20;
              const stepTime = fadeTime / steps;
              const targetVol = volume;

              for (let i = 0; i < steps; i++) {
                // Check if still playing same track
                if (audio.src !== absoluteSrc || audio.paused) break;

                await new Promise(r => setTimeout(r, stepTime));
                const progress = (i + 1) / steps;
                audio.volume = Math.min(targetVol, targetVol * progress);
              }
            }
          } else {
            console.log(`[Player] Pausing audio. isPlaying: ${isPlaying}, DeviceActive: ${currentDevice?.is_active}`);
            if (playPromiseRef.current) {
              await playPromiseRef.current;
              playPromiseRef.current = null;
            }
            audio.pause();
          }
        } else {
          audio.pause();
          if (audio.src.startsWith('blob:')) {
            URL.revokeObjectURL(audio.src);
          }
          audio.src = '';
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error("Audio playback error:", error);
        }
      }
    };

    syncPlayback();
  }, [currentTrack, isPlaying, currentDevice?.is_active]);

  // Gapless playback: preload next track when current is near end
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    const handleTimeUpdate = () => {
      if (!audio.duration || audio.duration < 10) return;
      const remaining = audio.duration - audio.currentTime;
      if (remaining < 5 && !(audio as any)._preloaded) {
        (audio as any)._preloaded = true;
        const nextIndex = (currentTrackIndex ?? -1) + 1;
        if (nextIndex < trackQueue.length) {
          const nextTrack = trackQueue[nextIndex];
          const preloadAudio = new Audio();
          if (nextTrack.storage_type === 'local') {
            const sp = (nextTrack as any).sourcePath || '';
            if (sp && !sp.startsWith('idb://')) {
              preloadAudio.src = `local-audio://${encodeURIComponent(sp)}`;
            }
          } else if (nextTrack.source_url) {
            preloadAudio.src = nextTrack.source_url;
          }
          preloadAudio.preload = 'auto';
          preloadAudio.load();
          console.log(`[Player] Preloading next track: ${nextTrack.title}`);
        }
      }
    };

    const handleEnded = () => {
      (audio as any)._preloaded = false;
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack, currentTrackIndex, trackQueue]);

  // Listening Stats Tick Logic
  useEffect(() => {
    if (!isPlaying || !currentTrack) {
      lastTickRef.current = Date.now();
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      if (delta > 0 && delta < 5) { // Prevent jumps if tab was backgrounded
        playTimeRef.current += delta;
      }

      // 1. Record Song Play (after 30s)
      if (playTimeRef.current >= 30 && songPlayRecordedRef.current !== currentTrack.id) {
        songPlayRecordedRef.current = currentTrack.id;
        fetch('/api/profile/record-play', {
          method: 'POST',
          body: JSON.stringify({ type: 'record_song_play', track: currentTrack })
        }).catch(e => console.error("Stats error:", e));
      }

      // 2. Increment Minutes (every 60s of aggregate play)
      const minutesToRecord = Math.floor(playTimeRef.current / 60) - totalMinutesRecordedRef.current;
      if (minutesToRecord >= 1) {
        totalMinutesRecordedRef.current += minutesToRecord;
        fetch('/api/profile/record-play', {
          method: 'POST',
          body: JSON.stringify({ type: 'increment_minutes', minutes: minutesToRecord })
        }).catch(e => console.error("Stats error:", e));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, currentTrack?.id]);

  // Reset minute recording for each track to avoid leakage? 
  // Actually, we should probably track aggregate total minutes across tracks too.
  // But let's keep it simple: reset minute count per track so we don't double count if user skips.
  useEffect(() => {
    totalMinutesRecordedRef.current = 0;
    // Don't reset playTimeRef here as it's handled in play() and next()
  }, [currentTrack?.id]);

  // Track Stream URL Cache (Pre-fetching)
  const streamCacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!currentTrack || currentTrackIndex === null || trackQueue.length === 0) return;

    const prefetchNext = async () => {
      const nextIndex = (currentTrackIndex + 1) % trackQueue.length;
      const nextTrack = trackQueue[nextIndex];

      if (nextTrack && !streamCacheRef.current.has(nextTrack.id)) {
        // Prefetch YouTube
        if (nextTrack.storage_type === 'stream') {
          try {
            console.log(`[Player] Pre-fetching YouTube for: ${nextTrack.title}`);
            const trackId = typeof nextTrack.id === 'string' && nextTrack.id.startsWith('yt-') ?
              nextTrack.id.replace('yt-', '') :
              (nextTrack.source_url ? new URL(nextTrack.source_url, window.location.href).searchParams.get('v') : null);

            if (trackId) {
              // For YouTube, we don't resolve client-side anymore.
              // We just set the proxy URL in the cache so it's ready to go.
              const proxyUrl = `/api/stream/youtube?v=${trackId}`;
              streamCacheRef.current.set(nextTrack.id, proxyUrl);
              console.log(`[Player] Pre-fetch SUCCESS (YouTube Proxy Set)`);
            }
          } catch (e) {
            console.error("YouTube prefetch failed", e);
          }
        }
      }
    };

    // Prefetch after 5s of playing the current song
    const timer = setTimeout(prefetchNext, 5000);
    return () => clearTimeout(timer);
  }, [currentTrack, currentTrackIndex, trackQueue]);



  // Function to check if a track is liked
  const isTrackLiked = useCallback((trackId: string): boolean => {
    return likedTrackIds.has(trackId);
  }, [likedTrackIds]);

  const getPlayCount = useCallback((trackId: string): number => {
    return playCounts[trackId] || 0;
  }, [playCounts]);

  // Function to toggle like status of a track using localStorage
  const toggleLikeTrack = async (track: Track) => {
    if (!track || !track.id) return;

    const trackId = track.id;
    const isCurrentlyLiked = likedTrackIds.has(trackId);

    if (isCurrentlyLiked) {
      try {
        const likedSongs = JSON.parse(localStorage.getItem('likedSongs') || '[]');
        const updatedLikedSongs = likedSongs.filter((id: string) => id !== trackId);
        localStorage.setItem('likedSongs', JSON.stringify(updatedLikedSongs));

        setLikedTrackIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(trackId);
          return newSet;
        });
      } catch (err) {
        console.error('Error removing track from liked songs:', err);
      }
    } else {
      try {
        const likedSongs = JSON.parse(localStorage.getItem('likedSongs') || '[]');
        if (!likedSongs.includes(trackId)) {
          const updatedLikedSongs = [...likedSongs, trackId];
          localStorage.setItem('likedSongs', JSON.stringify(updatedLikedSongs));
        }

        setLikedTrackIds(prev => {
          const newSet = new Set(prev);
          newSet.add(trackId);
          return newSet;
        });
      } catch (err) {
        console.error('Error adding track to liked songs:', err);
      }
    }
  };

  const updateTrackLyrics = useCallback((trackId: string, newLyrics: Lyric[]) => {
    setTrackQueue(prevQueue => {
      return prevQueue.map(track =>
        track.id === trackId ? { ...track, lyrics: newLyrics } : track
      );
    });
  }, []);

  // Fetch lyrics for current track if missing
  useEffect(() => {
    const currentT = currentTrackIndex !== null ? trackQueue[currentTrackIndex] : null;

    const getLyrics = async () => {
      if (currentT && (!currentT.lyrics || currentT.lyrics.length === 0)) {
        const fetchedLyrics = await fetchLyrics(
          currentT.title,
          currentT.artist || "",
          currentT.id,
          currentT.duration || undefined
        );

        if (fetchedLyrics) {
          updateTrackLyrics(currentT.id, fetchedLyrics);
        }
      }
    };

    getLyrics();
  }, [currentTrackIndex, trackQueue, updateTrackLyrics]);

  const [splitAudioEnabled, setSplitAudioEnabled] = useState(false);
  const [rightAudioUrl, setRightAudioUrl] = useState<string>("");
  const [rightTrack, setRightTrack] = useState<Track | null>(null);
  const [isRightPlaying, setIsRightPlaying] = useState(false);
  const [rightCurrentTime, setRightCurrentTime] = useState(0);
  const [rightDuration, setRightDuration] = useState(0);
  const rightAudioRef = useRef<HTMLAudioElement | null>(null);

  const toggleRightPlayPause = useCallback(() => {
    const rightAudio = rightAudioRef.current;
    if (!rightAudio || !rightTrack) return;

    if (isRightPlaying) {
      rightAudio.pause();
      setIsRightPlaying(false);
    } else {
      rightAudio.play().catch(e => console.error("Right audio play error", e));
      setIsRightPlaying(true);
    }
  }, [rightTrack, isRightPlaying]);

  const handleRightSeek = useCallback((value: number) => {
    const rightAudio = rightAudioRef.current;
    if (rightAudio && rightDuration) {
      rightAudio.currentTime = (value / 100) * rightDuration;
    }
  }, [rightDuration]);

  // Split Audio Web Audio API Graph
  useEffect(() => {
    if (!splitAudioEnabled) return;

    const leftAudio = audioRef.current;
    const rightAudio = rightAudioRef.current;

    if (!leftAudio || !rightAudio) return;

    // --- Web Audio API Setup ---
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    let audioCtx: AudioContext;
    let leftSource: MediaElementAudioSourceNode;
    let rightSource: MediaElementAudioSourceNode;

    // 1. Initialize Context & Left Source (Main Track)
    if ((leftAudio as any)._audioContext) {
      audioCtx = (leftAudio as any)._audioContext;
    } else {
      audioCtx = new AudioContextCtor();
      (leftAudio as any)._audioContext = audioCtx;
    }

    if ((leftAudio as any)._mediaElementSource) {
      leftSource = (leftAudio as any)._mediaElementSource;
    } else {
      leftSource = audioCtx.createMediaElementSource(leftAudio);
      (leftAudio as any)._mediaElementSource = leftSource;
    }

    // 2. Initialize Right Source (Secondary Track)
    // Note: We reuse the SAME AudioContext
    if ((rightAudio as any)._mediaElementSource) {
      rightSource = (rightAudio as any)._mediaElementSource;
    } else {
      // Ensure rightAudio is associated with the same context if possible, 
      // but createMediaElementSource requires the element to play.
      rightSource = audioCtx.createMediaElementSource(rightAudio);
      (rightAudio as any)._mediaElementSource = rightSource;
    }

    // 3. Create Panners
    const leftPanner = audioCtx.createStereoPanner();
    const rightPanner = audioCtx.createStereoPanner();

    // Only pan if we actually have a secondary track set, otherwise maintain stereo for main
    if (rightTrack) {
      leftPanner.pan.value = -1; // Hard Left
      rightPanner.pan.value = 1; // Hard Right
    } else {
      leftPanner.pan.value = 0; // Center (Normal Stereo)
      rightPanner.pan.value = 0;
    }

    // 4. Connect Graph
    try { leftSource.disconnect(); } catch (e) { }
    try { rightSource.disconnect(); } catch (e) { }

    leftSource.connect(leftPanner).connect(audioCtx.destination);
    rightSource.connect(rightPanner).connect(audioCtx.destination);

    // Resume context if suspended
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // Cleanup when Split Mode is disabled or component unmounts
    return () => {
      try {
        leftSource.disconnect();
        leftPanner.disconnect();

        rightSource.disconnect();
        rightPanner.disconnect();

        // Reconnect Left (Main) to Destination (Normal Stereo)
        // or let Equalizer reconnect it if it's active (Equalizer has its own effect)
        // But to be safe, we reconnect to destination. 
        // If Equalizer is active, it might need a toggle to reconnect itself, 
        // but simple connect here restores sound.
        leftSource.connect(audioCtx.destination);
      } catch (e) {
        console.error("Split Audio Cleanup Error:", e);
      }
    };
  }, [splitAudioEnabled, rightTrack]);

  // Handle Right Audio Resolution
  useEffect(() => {
    const resolveRightTrack = async () => {
      if (!splitAudioEnabled || !rightTrack) {
        setRightAudioUrl("");
        return;
      }

      let audioSrc = rightTrack.source_url || "";

      // YouTube
      if (rightTrack.storage_type === 'stream') {
        const trackId = typeof rightTrack.id === 'string' && rightTrack.id.startsWith('yt-')
          ? rightTrack.id.replace('yt-', '')
          : null;
        if (trackId) {
          audioSrc = `/api/stream/youtube?v=${trackId}`;
        }
      }

      setRightAudioUrl(audioSrc);
    };

    resolveRightTrack();
  }, [splitAudioEnabled, rightTrack?.id, streamingQuality]);

  // Handle Right Audio Playback Sync
  useEffect(() => {
    const rightAudio = rightAudioRef.current;
    if (splitAudioEnabled && rightAudio && rightAudioUrl) {
      rightAudio.src = rightAudioUrl;
      if (isRightPlaying) {
        rightAudio.play().catch(e => console.error("Right audio play error", e));
      } else {
        rightAudio.pause();
      }
    } else if (rightAudio) {
      rightAudio.pause();
      rightAudio.src = "";
    }
  }, [splitAudioEnabled, rightAudioUrl, isRightPlaying]);

  useEffect(() => {
    const saved = localStorage.getItem('spotilark-recently-played');
    if (saved) {
      try {
        setRecentlyPlayed(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('spotilark-play-counts');
    if (saved) {
      try {
        setPlayCounts(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (recentlyPlayed.length > 0) {
      localStorage.setItem('spotilark-recently-played', JSON.stringify(recentlyPlayed));
    }
  }, [recentlyPlayed]);

  useEffect(() => {
    if (Object.keys(playCounts).length > 0) {
      localStorage.setItem('spotilark-play-counts', JSON.stringify(playCounts));
    }
  }, [playCounts]);

  useEffect(() => {
    if (sleepTimerEnd === null) {
      setSleepTimerRemaining(null);
      return;
    }
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((sleepTimerEnd - Date.now()) / 1000));
      setSleepTimerRemaining(remaining);
      if (remaining <= 0) {
        setSleepTimerEnd(null);
        setSleepTimerRemaining(null);
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEnd]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    initCapacitorAudio();

    const removePauseListener = onMediaControlPause(() => {
      setIsPlaying(prev => !prev);
    });
    const removeNextListener = onMediaControlNext(() => {
      playNext();
    });
    const removePrevListener = onMediaControlPrev(() => {
      playPrev();
    });

    return () => {
      removePauseListener();
      removeNextListener();
      removePrevListener();
      destroyCapacitorAudio();
    };
  }, [playNext, playPrev]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (currentTrack) {
      updateMediaNotification({
        title: currentTrack.title,
        artist: currentTrack.artist || 'Unknown Artist',
        artwork: currentTrack.cover || '',
        duration: currentTrack.duration || 0,
        isPlaying,
        currentTime,
      });
    }
  }, [currentTrack?.id, isPlaying, currentTime]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    setCapacitorAudioPlaying(isPlaying);
  }, [isPlaying]);


  const value = {
    isPlaying,
    isNowPlayingOpen,
    currentTrack,
    currentTrackIndex,
    currentTime,
    duration,
    volume,
    play,
    togglePlayPause,
    toggleNowPlaying,
    playNext,
    playPrev,
    handleSeek,
    seekBy,
    handleVolumeChange,
    trackQueue,
    isShuffled,
    repeatMode,
    toggleShuffle,
    toggleRepeat,
    refetchTracks: refetch,
    isTrackLiked,
    toggleLikeTrack,
    likedTrackIds,
    playTrack,
    playTrackFromQueue: play,
    reorderQueue,
    updateTrackLyrics,
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
    isLyricsViewOpen,
    toggleLyricsView,
    localLibrary,
    addLocalTracks,
    removeLocalTracks,
    cloudLibrary,
    unifiedLibrary,
    sleepTimerEnd,
    sleepTimerRemaining,
    setSleepTimer,
    recentlyPlayed,
    playCounts,
    getPlayCount,
  };

  // Watchdog: If playing but stuck at 0:00 for too long
  useEffect(() => {
    if (!isPlaying || !currentTrack) return;

    const timeout = setTimeout(() => {
      const audio = audioRef.current;
      if (audio && isPlaying && audio.currentTime === 0 && audio.readyState < 3) {
        console.warn(`[Player] Watchdog: Playback stuck for ${currentTrack.title}. ReadyState: ${audio.readyState}. Retrying load...`);
        audio.load();
        audio.play().catch(e => console.error("[Player] Watchdog retry failed:", e));
      }
    }, 7000); // 7 seconds (generous for slow networks)

    return () => clearTimeout(timeout);
  }, [isPlaying, currentTrack?.id, currentTime === 0]);

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <PlayerAudio
        audioRef={audioRef}
        nextAudioRef={nextAudioRef}
        rightAudioRef={rightAudioRef}
        onTimeUpdate={(e) => {
          const audio = e.currentTarget;
          setCurrentTime(audio.currentTime);

          // Automix / Crossfade Transition Trigger
          if (isPlaying && (crossfade || crossfade) && duration > 0 && currentTrackIndex !== null) {
            const timeLeft = duration - audio.currentTime;
            // Trigger next song when timeLeft matches crossfadeDuration
            if (timeLeft <= crossfadeDuration && timeLeft > 0 && (audio as any)._transitionTriggered !== currentTrackIndex) {
              (audio as any)._transitionTriggered = currentTrackIndex;
              console.log(`[Player] Triggering ${crossfade ? 'Automix' : 'Crossfade'} transition...`);
              playNext();
            }
          }
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => {
          const audio = audioRef.current;
          if (audio && (audio as any)._transitionTriggered !== currentTrackIndex) {
            if (currentTrack) {
              setPlayCounts(prev => ({
                ...prev,
                [currentTrack.id]: (prev[currentTrack.id] || 0) + 1,
              }));
            }
            playNext();
          }
        }}
        onRightTimeUpdate={(e) => setRightCurrentTime(e.currentTarget.currentTime)}
        onRightLoadedMetadata={(e) => setRightDuration(e.currentTarget.duration)}
        onRightEnded={() => setIsRightPlaying(false)}
      />
    </PlayerContext.Provider>
  );

};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
};