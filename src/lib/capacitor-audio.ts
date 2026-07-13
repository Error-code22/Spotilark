import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

type MediaControlHandler = () => void;

let pauseHandlers: MediaControlHandler[] = [];
let nextHandlers: MediaControlHandler[] = [];
let prevHandlers: MediaControlHandler[] = [];
let appStateListener: any = null;

export function initCapacitorAudio() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {});
      navigator.mediaSession.setActionHandler('pause', () => {});
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        nextHandlers.forEach(h => h());
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        prevHandlers.forEach(h => h());
      });
    }
  } catch (e) {
    console.warn('[CapacitorAudio] MediaSession API setup failed:', e);
  }

  try {
    appStateListener = App.addListener('appStateChange', async (state: any) => {
      if (!state.isActive) {
        try {
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
          }
        } catch (e) {}
      }
    });
  } catch (e) {
    console.warn('[CapacitorAudio] appStateChange listener failed:', e);
  }
}

export function onMediaControlPause(handler: MediaControlHandler) {
  pauseHandlers.push(handler);
  return () => {
    pauseHandlers = pauseHandlers.filter(h => h !== handler);
  };
}

export function onMediaControlNext(handler: MediaControlHandler) {
  nextHandlers.push(handler);
  return () => {
    nextHandlers = nextHandlers.filter(h => h !== handler);
  };
}

export function onMediaControlPrev(handler: MediaControlHandler) {
  prevHandlers.push(handler);
  return () => {
    prevHandlers = prevHandlers.filter(h => h !== handler);
  };
}

export function updateMediaNotification(info: {
  title: string;
  artist: string;
  artwork?: string;
  duration?: number;
  isPlaying: boolean;
  currentTime?: number;
}) {
  if (!Capacitor.isNativePlatform()) return;
  if (!('mediaSession' in navigator)) return;

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: info.title,
      artist: info.artist || 'Unknown Artist',
      album: '',
      artwork: info.artwork
        ? [{ src: info.artwork, sizes: '512x512', type: 'image/jpeg' }]
        : [],
    });

    navigator.mediaSession.playbackState = info.isPlaying ? 'playing' : 'paused';
  } catch (e) {
    console.warn('[CapacitorAudio] updateMediaNotification failed:', e);
  }
}

export function setCapacitorAudioPlaying(isPlaying: boolean) {
  if (!Capacitor.isNativePlatform()) return;
  if (!('mediaSession' in navigator)) return;

  try {
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  } catch (e) {}
}

export function destroyCapacitorAudio() {
  if (appStateListener) {
    appStateListener.remove();
    appStateListener = null;
  }
  pauseHandlers = [];
  nextHandlers = [];
  prevHandlers = [];

  try {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
    }
  } catch (e) {}
}
