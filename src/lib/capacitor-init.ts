import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import type { Track } from './data';

type PlayTrackCallback = (track: Track) => void;
type NavigateCallback = (path: string) => void;
type FindTrackCallback = (id: string) => Track | undefined;

export function initCapacitor(
  playTrack: PlayTrackCallback,
  navigate: NavigateCallback,
  findTrack: FindTrackCallback
) {
  if (!Capacitor.isNativePlatform()) return;

  hideSplashScreen();
  setupDeepLinkListener(playTrack, navigate, findTrack);
}

async function hideSplashScreen() {
  try {
    await SplashScreen.hide();
  } catch (e) {
    console.warn('[CapacitorInit] SplashScreen.hide failed:', e);
  }
}

function setupDeepLinkListener(
  playTrack: PlayTrackCallback,
  navigate: NavigateCallback,
  findTrack: FindTrackCallback
) {
  try {
    App.addListener('appUrlOpen', (event) => {
      const url = event.url;
      handleDeepLink(url, playTrack, navigate, findTrack);
    });
  } catch (e) {
    console.warn('[CapacitorInit] appUrlOpen listener failed:', e);
  }
}

function handleDeepLink(
  url: string,
  playTrack: PlayTrackCallback,
  navigate: NavigateCallback,
  findTrack: FindTrackCallback
) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;

    const trackMatch = path.match(/^\/track\/(.+)$/);
    if (trackMatch) {
      const trackId = trackMatch[1];
      const track = findTrack(trackId);
      if (track) {
        playTrack(track);
      }
      return;
    }

    const playlistMatch = path.match(/^\/playlist\/(.+)$/);
    if (playlistMatch) {
      const playlistId = playlistMatch[1];
      navigate(`/playlists/${playlistId}`);
      return;
    }
  } catch (e) {
    console.warn('[CapacitorInit] Failed to handle deep link:', url, e);
  }
}
