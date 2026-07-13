"use client";
import { createContext, useContext, useEffect, useState } from "react";

type SettingsContextType = {
  crossfade: boolean;
  setCrossfade: (v: boolean) => void;
  crossfadeDuration: number;
  setCrossfadeDuration: (v: number) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (v: number) => void;
  streamingQuality: string;
  setStreamingQuality: (v: string) => void;
  continuousPlayback: boolean;
  setContinuousPlayback: (v: boolean) => void;
  fontStyle: string;
  setFontStyle: (v: string) => void;
  fontSize: string;
  setFontSize: (v: string) => void;
  playVideoAsAudio: boolean;
  setPlayVideoAsAudio: (v: boolean) => void;
  normalizeAudio: boolean;
  setNormalizeAudio: (v: boolean) => void;
  showRecentlyPlayed: boolean;
  setShowRecentlyPlayed: (v: boolean) => void;
  audioNormalization: boolean;
  setAudioNormalization: (v: boolean) => void;
  automix: boolean;
  setAutomix: (v: boolean) => void;
  gaplessPlayback: boolean;
  setGaplessPlayback: (v: boolean) => void;
  downloadQuality: string;
  setDownloadQuality: (v: string) => void;
  shareListeningActivity: boolean;
  setShareListeningActivity: (v: boolean) => void;
  clearCache: (keepLyrics?: boolean) => Promise<void>;
};

const defaultSettings: SettingsContextType = {
  crossfade: false,
  setCrossfade: () => { },
  crossfadeDuration: 3,
  setCrossfadeDuration: () => { },
  playbackSpeed: 1,
  setPlaybackSpeed: () => { },
  streamingQuality: "low",
  setStreamingQuality: () => { },
  continuousPlayback: true,
  setContinuousPlayback: () => { },
  fontStyle: "Inter",
  setFontStyle: () => { },
  fontSize: "medium",
  setFontSize: () => { },
  playVideoAsAudio: false,
  setPlayVideoAsAudio: () => { },
  normalizeAudio: true,
  setNormalizeAudio: () => { },
  showRecentlyPlayed: true,
  setShowRecentlyPlayed: () => { },
  audioNormalization: true,
  setAudioNormalization: () => { },
  automix: false,
  setAutomix: () => { },
  gaplessPlayback: false,
  setGaplessPlayback: () => { },
  downloadQuality: "high",
  setDownloadQuality: () => { },
  shareListeningActivity: false,
  setShareListeningActivity: () => { },
  clearCache: async () => { },
};

const SettingsContext = createContext<SettingsContextType>(defaultSettings);
export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<Record<string, any>>(() => {
    if (typeof window === "undefined") return {};
    const saved = localStorage.getItem("spotilark-settings");
    return saved ? JSON.parse(saved) : {};
  });

  const setSetting = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("spotilark-settings", JSON.stringify(settings));
    }
  }, [settings]);

  const value: SettingsContextType = {
    crossfade: settings.crossfade ?? false,
    setCrossfade: (v) => setSetting("crossfade", v),
    crossfadeDuration: settings.crossfadeDuration ?? 3,
    setCrossfadeDuration: (v) => setSetting("crossfadeDuration", v),
    playbackSpeed: settings.playbackSpeed ?? 1,
    setPlaybackSpeed: (v) => setSetting("playbackSpeed", v),
    streamingQuality: settings.streamingQuality ?? "low",
    setStreamingQuality: (v) => setSetting("streamingQuality", v),
    continuousPlayback: settings.continuousPlayback ?? true,
    setContinuousPlayback: (v) => setSetting("continuousPlayback", v),
    fontStyle: settings.fontStyle ?? "Inter",
    setFontStyle: (v) => setSetting("fontStyle", v),
    fontSize: settings.fontSize ?? "medium",
    setFontSize: (v) => setSetting("fontSize", v),
    playVideoAsAudio: settings.playVideoAsAudio ?? false,
    setPlayVideoAsAudio: (v) => setSetting("playVideoAsAudio", v),
    normalizeAudio: settings.normalizeAudio ?? true,
    setNormalizeAudio: (v) => setSetting("normalizeAudio", v),
    showRecentlyPlayed: settings.showRecentlyPlayed ?? true,
    setShowRecentlyPlayed: (v) => setSetting("showRecentlyPlayed", v),
    audioNormalization: settings.audioNormalization ?? true,
    setAudioNormalization: (v) => setSetting("audioNormalization", v),
    automix: settings.automix ?? false,
    setAutomix: (v) => setSetting("automix", v),
    gaplessPlayback: settings.gaplessPlayback ?? false,
    setGaplessPlayback: (v) => setSetting("gaplessPlayback", v),
    downloadQuality: settings.downloadQuality ?? "high",
    setDownloadQuality: (v) => setSetting("downloadQuality", v),
    shareListeningActivity: settings.shareListeningActivity ?? false,
    setShareListeningActivity: (v) => setSetting("shareListeningActivity", v),
    clearCache: async (keepLyrics?: boolean) => {
      try {
        const { clearAllStorage } = await import("@/lib/storage-service");
        await clearAllStorage();

        const keysToRemove = [
          "spotilark-settings", "spotilark-volume", "likedSongs",
          "spotilark-queue",
          "spotilark-local-library", "spotilark-search-history",
          "spotilark-view-mode", "spotilark-wallpaper",
          "spotilark-sleep-timer", "spotilark-recently-played",
          "spotilark-play-counts",
        ];

        if (!keepLyrics) {
          keysToRemove.push("spotilark_lyrics_cache");
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));

        try {
          const dbs = await window.indexedDB.databases();
          dbs.forEach(db => {
            if (db.name) window.indexedDB.deleteDatabase(db.name);
          });
        } catch {}

        window.location.reload();
      } catch (error) {
        console.error("Failed to clear cache", error);
      }
    },
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
