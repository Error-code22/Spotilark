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
import { getCachedTrack, cacheTrack } from "@/lib/cache-utils";
import { updatePresence } from "@/lib/presence-utils";
import { resolveYouTubeStream } from "@/lib/youtube-utils";
import { resolveTelegramLink } from "@/lib/telegram-client";

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
  updateTrackLyrics: (trackId: string, lyrics: Lyric[]) => void;
  splitAudioEnabled: boolean;
  setSplitAudioEnabled: (enabled: boolean) => void;
  rightAudioUrl: string;
  setRightAudioUrl: (url: string) => void;
  isLyricsViewOpen: boolean;
  toggleLyricsView: () => void;
  localLibrary: Track[];
  addLocalTracks: (tracks: Track[], files?: File[]) => Promise<void>;
  cloudLibrary: Track[];
  unifiedLibrary: Track[];
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode; tracks: Track[]; refetch: () => void; }> = ({
  children,
  tracks,
  refetch,
}) => {
  useEffect(() => {
    console.log("%c Spotilark Playback Fix V1.8 (Tauri HTTP) Active ", "background: #222; color: #bada55; font-size: 16px;");
  }, []);
  const [cloudLibrary, setCloudLibrary] = useState<Track[]>([]);
  const [localLibrary, setLocalLibrary] = useState<Track[]>([]);
  const [trackQueue, setTrackQueue] = useState<Track[]>([]);
  const [isLyricsViewOpen, setIsLyricsViewOpen] = useState(false);

  // Load local library from storage
  useEffect(() => {
    const saved = localStorage.getItem('spotilark-local-library');
    if (saved) {
      try {
        setLocalLibrary(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load local library", e);
      }
    }
  }, []);

  const addLocalTracks = useCallback(async (newTracks: Track[], files?: File[]) => {
    // 1. Immediately cache blood for files if provided
    if (files && files.length > 0) {
      console.log(`[Player] Caching ${files.length} local files...`);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const track = newTracks[i];
        if (track && file) {
          await cacheTrack(track.id, file);
        }
      }
    }

    setLocalLibrary(prev => {
      const updated = [...prev, ...newTracks];
      // Filter out potential duplicates based on ID
      const unique = Array.from(new Map(updated.map(t => [t.id, t])).values());
      localStorage.setItem('spotilark-local-library', JSON.stringify(unique));
      return unique;
    });
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

    // Update trackQueue if it was empty or matching previous tracks
    setTrackQueue(prev => {
      // If queue is empty, default to unified
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

  const { crossfade, crossfadeDuration, playbackSpeed, audioNormalization, automix, gaplessPlayback, streamingQuality, downloadQuality, shareListeningActivity } = useSettings();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

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

        const compressor = ctx.createDynamicsCompressor();
        // Standard settings for audio normalization
        compressor.threshold.value = -24;
        compressor.knee.value = 30;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;
        compressorNodeRef.current = compressor;

        // Initial connection
        if (audioNormalization) {
          source.connect(compressor).connect(ctx.destination);
        } else {
          source.connect(ctx.destination);
        }
      }
    };

    // Initialize on first user interaction or when needed
    document.addEventListener('click', initAudioContext, { once: true });
    return () => document.removeEventListener('click', initAudioContext);
  }, [audioNormalization]);


  // Handle Normalization Toggle
  useEffect(() => {
    if (audioCtxRef.current && sourceNodeRef.current && compressorNodeRef.current) {
      const source = sourceNodeRef.current;
      const compressor = compressorNodeRef.current;
      const ctx = audioCtxRef.current;

      try {
        source.disconnect();
        compressor.disconnect();

        if (audioNormalization) {
          source.connect(compressor).connect(ctx.destination);
        } else {
          source.connect(ctx.destination);
        }
      } catch (e) {
        console.error("Error toggling normalization:", e);
      }
    }
  }, [audioNormalization]);


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

  // Heartbeat presence when settings or track changes
  useEffect(() => {
    if (user && shareListeningActivity) {
      updatePresence(user.id, currentTrack, isPlaying, shareListeningActivity);
    }
  }, [user, currentTrack, isPlaying, shareListeningActivity]);

  const play = useCallback(async (index: number) => {
    if (index >= 0 && index < trackQueue.length) {
      // Automix/Crossfade Transition
      if (isPlaying && (crossfade || automix) && audioRef.current && !audioRef.current.paused) {
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

        }, fadeInterval);
      }

      // Reset tracking for new song
      playTimeRef.current = 0;

      setCurrentTrackIndex(index);
      setIsPlaying(true);
    }
  }, [trackQueue.length, isPlaying, crossfade, automix, crossfadeDuration]);

  const playTrack = (track: Track) => {
    // Find the index of this track in the current queue
    const trackIndex = trackQueue.findIndex(t => t.id === track.id);

    if (trackIndex !== -1) {
      // If the track exists in the current queue, play it by index
      setCurrentTrackIndex(trackIndex);
      setIsPlaying(true);
    } else {
      // If the track doesn't exist in the queue, temporarily add it and play
      // We'll set the queue to include just this track as the only item
      setTrackQueue([track]);
      setCurrentTrackIndex(0);
      setIsPlaying(true);
    }
  };

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

  }, [currentTrackIndex, trackQueue.length, play, repeatMode, isShuffled]);

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
      // Use the ref which is now attached to the rendered element
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

        // Cleanup function
        return () => {
          audio.removeEventListener("timeupdate", handleTimeUpdate);
          audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
          audio.removeEventListener("ended", handleEnded);
        };
      }
    }
  }, []); // Empty dependency array ensures this runs only once

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

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
          console.log(`[Player] Track: ${currentTrack.title} | Storage: ${currentTrack.storage_type} | ID: ${currentTrack.id}`);
          console.log(`[Player] Initial Source:`, audioSrc);

          // Handle YouTube stream resolution
          if (currentTrack.storage_type === 'stream') {
            let trackId = '';
            if (typeof currentTrack.id === 'string' && currentTrack.id.startsWith('yt-')) {
              trackId = currentTrack.id.replace('yt-', '');
            } else if (currentTrack.source_url && currentTrack.source_url.includes('v=')) {
              // Extract from /api/stream/youtube?v=... or similar
              try {
                const url = new URL(currentTrack.source_url, window.location.href);
                trackId = url.searchParams.get('v') || '';
              } catch (e) {
                // Fallback extraction
                const match = currentTrack.source_url.match(/[?&]v=([^&]+)/);
                if (match) trackId = match[1];
              }
            }

            if (trackId) {
              // Check if we already have a resolved URL in cache
              if (streamCacheRef.current.has(currentTrack.id)) {
                audioSrc = streamCacheRef.current.get(currentTrack.id)!;
                console.log(`[Player] Using cached stream URL for: ${currentTrack.title}`);
              } else {
                // Resolve it now
                try {
                  console.log(`[Player] Resolving stream for ID: ${trackId} (${currentTrack.title})`);
                  const resolvedUrl = await resolveYouTubeStream(trackId, streamingQuality);
                  if (resolvedUrl) {
                    audioSrc = resolvedUrl;
                    streamCacheRef.current.set(currentTrack.id, resolvedUrl);
                    console.log(`[Player] Resolution SUCCESS for: ${currentTrack.title}`);
                  } else {
                    throw new Error("Could not resolve stream");
                  }
                } catch (e) {
                  console.error("Stream resolution failed at play time", e);
                }
              }
            }
          }

          // Handle Telegram (Cloud) stream resolution
          if (currentTrack.storage_type === 'cloud' && currentTrack.source_url && currentTrack.source_url.includes('storage/stream')) {
            // Extract file_id from /api/storage/stream?file_id=...
            let fileId = '';
            try {
              const url = new URL(currentTrack.source_url, window.location.href);
              fileId = url.searchParams.get('file_id') || '';
            } catch (e) {
              const match = currentTrack.source_url.match(/[?&]file_id=([^&]+)/);
              if (match) fileId = match[1];
            }

            if (fileId) {
              if (streamCacheRef.current.has(currentTrack.id)) {
                audioSrc = streamCacheRef.current.get(currentTrack.id)!;
                console.log(`[Player] Using cached Telegram URL for: ${currentTrack.title}`);
              } else {
                try {
                  console.log(`[Player] Resolving Telegram file: ${currentTrack.title}`);
                  const resolvedUrl = await resolveTelegramLink(fileId);
                  if (resolvedUrl) {
                    audioSrc = resolvedUrl;
                    streamCacheRef.current.set(currentTrack.id, resolvedUrl);
                    console.log(`[Player] Telegram Resolution SUCCESS`);
                  }
                } catch (e) {
                  console.error("Telegram resolution failed", e);
                }
              }
            }
          }

          // Presence Update
          if (user && shareListeningActivity) {
            updatePresence(user.id, currentTrack, isPlaying, shareListeningActivity);
          }

          // 1. Check if track is cached
          const cachedBlob = await getCachedTrack(currentTrack.id);
          if (cachedBlob) {
            // We use a simple ref-based cache for Blob URLs to prevent infinite reloading
            if ((audio as any)._lastTrackId === currentTrack.id && (audio as any)._lastBlobUrl) {
              audioSrc = (audio as any)._lastBlobUrl;
            } else {
              // Revoke old blob URL if we had one
              if ((audio as any)._lastBlobUrl) URL.revokeObjectURL((audio as any)._lastBlobUrl);

              audioSrc = URL.createObjectURL(cachedBlob);
              (audio as any)._lastBlobUrl = audioSrc;
              (audio as any)._lastTrackId = currentTrack.id;
            }
          } else {
            // 2. If not cached, clear blob cache for this audio element
            if ((audio as any)._lastBlobUrl) {
              URL.revokeObjectURL((audio as any)._lastBlobUrl);
              (audio as any)._lastBlobUrl = null;
              (audio as any)._lastTrackId = null;
            }

            // Background download timer - ONLY for non-stream tracks to save bandwidth
            if (currentTrack.storage_type !== 'stream') {
              cacheTimerRef.current = setTimeout(async () => {
                try {
                  // Re-check if still playing and not already cached
                  const doubleCheck = await getCachedTrack(currentTrack.id);
                  if (doubleCheck) return;

                  console.log(`[Player] Background caching: ${currentTrack.title}`);
                  let finalUrl = currentTrack.source_url;

                  // Use resolved URLs for caching
                  if (streamCacheRef.current.has(currentTrack.id)) {
                    finalUrl = streamCacheRef.current.get(currentTrack.id)!;
                  } else {
                    if (currentTrack.storage_type === 'stream') {
                      const trackId = typeof currentTrack.id === 'string' && currentTrack.id.startsWith('yt-') ?
                        currentTrack.id.replace('yt-', '') : null;
                      if (trackId) {
                        const resolved = await resolveYouTubeStream(trackId, streamingQuality);
                        if (resolved) finalUrl = resolved;
                      }
                    } else if (currentTrack.storage_type === 'cloud' && currentTrack.source_url?.includes('storage/stream')) {
                      const match = currentTrack.source_url.match(/[?&]file_id=([^&]+)/);
                      if (match) {
                        const resolved = await resolveTelegramLink(match[1]);
                        if (resolved) finalUrl = resolved;
                      }
                    }
                  }

                  if (!finalUrl) return;

                  const response = await fetch(finalUrl);
                  if (response.ok) {
                    const contentType = response.headers.get('Content-Type');
                    if (contentType && contentType.includes('text/html')) {
                      console.warn(`[Player] Cacher received HTML for ${currentTrack.title}. Skipping.`);
                      return;
                    }

                    const blob = await response.blob();
                    await cacheTrack(currentTrack.id, blob);
                    console.log(`Track ${currentTrack.title} cached successfully!`);
                  }
                } catch (e) {
                  console.error("Background caching failed:", e);
                }
              }, 15000); // Increased to 15s to allow initial buffer to settle
            }
          }

          // Normalize and check if we actually need to update the src.
          // For blobs, the browser sometimes prepends the origin.
          let absoluteSrc = '';
          try {
            absoluteSrc = new URL(audioSrc, window.location.href).href;
          } catch (e) {
            absoluteSrc = audioSrc;
          }

          const currentAudioSrc = audio.src;
          const needsUpdate = (audio as any)._lastSetId !== currentTrack.id ||
            (currentAudioSrc !== absoluteSrc && currentAudioSrc !== audioSrc);

          if (needsUpdate) {
            console.log(`[Player] Updating Audio Source:`, audioSrc);
            audio.src = audioSrc;
            (audio as any)._lastSetId = currentTrack.id;
            audio.playbackRate = playbackSpeed;
            setDuration(currentTrack.duration || 0);

            if (crossfade && isPlaying) {
              audio.volume = 0;
            } else {
              audio.volume = volume;
            }

            // Re-bind error handler for more details
            audio.onerror = (e) => {
              console.error(`[Player] Playback Error for ${currentTrack.title}:`, audio.error);
            };
          }

          if (isPlaying) {
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
  }, [currentTrack, isPlaying]);

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
              const resolvedUrl = await resolveYouTubeStream(trackId, streamingQuality);
              if (resolvedUrl) {
                streamCacheRef.current.set(nextTrack.id, resolvedUrl);
                console.log(`[Player] Pre-fetch SUCCESS (YouTube)`);
              }
            }
          } catch (e) {
            console.error("YouTube prefetch failed", e);
          }
        }
        // Prefetch Telegram
        else if (nextTrack.storage_type === 'cloud' && nextTrack.source_url && nextTrack.source_url.includes('storage/stream')) {
          try {
            console.log(`[Player] Pre-fetching Telegram for: ${nextTrack.title}`);
            const url = new URL(nextTrack.source_url, window.location.href);
            const fileId = url.searchParams.get('file_id');
            if (fileId) {
              const resolvedUrl = await resolveTelegramLink(fileId);
              if (resolvedUrl) {
                streamCacheRef.current.set(nextTrack.id, resolvedUrl);
                console.log(`[Player] Pre-fetch SUCCESS (Telegram)`);
              }
            }
          } catch (e) {
            console.error("Telegram prefetch failed", e);
          }
        }
      }
    };

    // Prefetch after 5s of playing the current song
    const timer = setTimeout(prefetchNext, 5000);
    return () => clearTimeout(timer);
  }, [currentTrack, currentTrackIndex, trackQueue]);

  const togglePlayPause = useCallback(() => {
    if (currentTrackIndex === null && trackQueue.length > 0) {
      play(0);
    } else if (currentTrack) {
      setIsPlaying((prev) => !prev);
    }
  }, [currentTrackIndex, trackQueue.length, play, currentTrack]);

  const playPrev = useCallback(() => {
    if (trackQueue.length === 0) return;
    if (currentTrackIndex !== null) {
      const prevIndex =
        (currentTrackIndex - 1 + trackQueue.length) % trackQueue.length;
      play(prevIndex);
    }
  }, [currentTrackIndex, trackQueue.length, play]);

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
        e.preventDefault(); // Prevent scrolling
        togglePlayPause();
      } else if (e.code === 'KeyN') {
        playNext();
      } else if (e.code === 'KeyP') {
        playPrev();
      } else if (e.code === 'KeyM') {
        setVolume((prev) => (prev > 0 ? 0 : 0.5)); // Mute or restore to 50%
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, playNext, playPrev]);

  const handleSeek = (value: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const seekBy = (amount: number) => {
    if (audioRef.current && duration > 0) {
      const newTime = audioRef.current.currentTime + amount;
      const clampedTime = Math.max(0, Math.min(newTime, duration));
      audioRef.current.currentTime = clampedTime;
      setCurrentTime(clampedTime);
    }
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
  };

  const toggleShuffle = () => {
    setIsShuffled(prev => !prev);
  };

  const toggleRepeat = () => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const toggleNowPlaying = () => {
    setIsNowPlayingOpen(prev => !prev);
  };

  // Function to check if a track is liked
  const isTrackLiked = useCallback((trackId: string): boolean => {
    return likedTrackIds.has(trackId);
  }, [likedTrackIds]);

  // Function to toggle like status of a track using localStorage
  const toggleLikeTrack = async (track: Track) => {
    if (!track || !track.id) return;

    const trackId = track.id;
    const isCurrentlyLiked = likedTrackIds.has(trackId);

    if (isCurrentlyLiked) {
      // Remove from liked tracks
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
      // Add to liked tracks
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
  const rightAudioRef = useRef<HTMLAudioElement | null>(null);

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
    leftPanner.pan.value = -1; // Hard Left

    const rightPanner = audioCtx.createStereoPanner();
    rightPanner.pan.value = 1; // Hard Right

    // 4. Connect Graph
    // Disconnect existing connections to be safe (might break Equalizer temporarily, considered acceptable for this mode)
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
  }, [splitAudioEnabled]);

  // Handle Right Audio Playback Sync (Basic)
  useEffect(() => {
    const rightAudio = rightAudioRef.current;
    if (splitAudioEnabled && rightAudio && rightAudioUrl) {
      rightAudio.src = rightAudioUrl;
      if (isPlaying) {
        rightAudio.play().catch(e => console.error("Right audio play error", e));
      } else {
        rightAudio.pause();
      }
    } else if (rightAudio) {
      rightAudio.pause();
      rightAudio.src = "";
    }
  }, [splitAudioEnabled, rightAudioUrl, isPlaying]);


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
    updateTrackLyrics,
    splitAudioEnabled,
    setSplitAudioEnabled,
    rightAudioUrl,
    setRightAudioUrl,
    isLyricsViewOpen,
    toggleLyricsView,
    localLibrary,
    addLocalTracks,
    cloudLibrary,
    unifiedLibrary,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* 
        We use React props for event handling to ensure we always have
        access to the latest state/functions (like playNext) without
        stale closure issues common with manual addEventListener in useEffect.
      */}
      <audio
        ref={audioRef}
        id="spotilark-audio"
        crossOrigin="anonymous"
        className="hidden"
        onTimeUpdate={(e) => {
          const audio = e.currentTarget;
          setCurrentTime(audio.currentTime);

          // Automix / Crossfade Transition Trigger
          if (isPlaying && (automix || crossfade) && duration > 0 && currentTrackIndex !== null) {
            const timeLeft = duration - audio.currentTime;
            // Trigger next song when timeLeft matches crossfadeDuration
            if (timeLeft <= crossfadeDuration && timeLeft > 0 && (audio as any)._transitionTriggered !== currentTrackIndex) {
              (audio as any)._transitionTriggered = currentTrackIndex;
              console.log(`[Player] Triggering ${automix ? 'Automix' : 'Crossfade'} transition...`);
              playNext();
            }
          }
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => {
          // Only call playNext if transition wasn't already triggered
          const audio = audioRef.current;
          if (audio && (audio as any)._transitionTriggered !== currentTrackIndex) {
            playNext();
          }
        }}
      />
      {/* Hidden audio for gapless pre-buffering */}
      <audio
        ref={nextAudioRef}
        id="spotilark-audio-next"
        crossOrigin="anonymous"
        className="hidden"
      />
      <audio
        ref={rightAudioRef}
        id="spotilark-audio-right"
        crossOrigin="anonymous"
        className="hidden"
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