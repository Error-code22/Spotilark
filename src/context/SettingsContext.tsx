"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useTheme } from './ThemeContext';
import { clearMusicCache } from "@/lib/cache-utils";

type SettingsContextType = {
  crossfade: boolean;
  setCrossfade: (v: boolean) => void;
  crossfadeDuration: number;
  setCrossfadeDuration: (v: number) => void;
  gaplessPlayback: boolean;
  setGaplessPlayback: (v: boolean) => void;
  automix: boolean;
  setAutomix: (v: boolean) => void;
  audioNormalization: boolean;
  setAudioNormalization: (v: boolean) => void;
  shareListeningActivity: boolean;
  setShareListeningActivity: (v: boolean) => void;
  showRecentlyPlayed: boolean;
  setShowRecentlyPlayed: (v: boolean) => void;
  theme: string;
  setTheme: (v: string) => void;
  fontColor: string;
  setFontColor: (v: string) => void;
  backgroundColor: string;
  setBackgroundColor: (v: string) => void;
  fontStyle: string;
  setFontStyle: (v: string) => void;
  fontSize: string;
  setFontSize: (v: string) => void;
  streamingQuality: string;
  setStreamingQuality: (v: string) => void;
  downloadQuality: string;
  setDownloadQuality: (v: string) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (v: number) => void;
  clearCache: () => Promise<void>;
};

const defaultSettings: SettingsContextType = {
  crossfade: false,
  setCrossfade: () => { },
  crossfadeDuration: 5,
  setCrossfadeDuration: () => { },
  gaplessPlayback: false,
  setGaplessPlayback: () => { },
  automix: false,
  setAutomix: () => { },
  audioNormalization: true,
  setAudioNormalization: () => { },
  shareListeningActivity: false,
  setShareListeningActivity: () => { },
  showRecentlyPlayed: true,
  setShowRecentlyPlayed: () => { },
  theme: "system",
  setTheme: () => { },
  fontColor: "#000000",
  setFontColor: () => { },
  backgroundColor: "#ffffff",
  setBackgroundColor: () => { },
  fontStyle: "Inter",
  setFontStyle: () => { },
  fontSize: "medium",
  setFontSize: () => { },
  streamingQuality: "high",
  setStreamingQuality: () => { },
  downloadQuality: "high",
  setDownloadQuality: () => { },
  playbackSpeed: 1,
  setPlaybackSpeed: () => { },
  clearCache: async () => { },
};

const SettingsContext = createContext<SettingsContextType>(defaultSettings);
export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<Record<string, any>>(() => {
    // Initialize with default values on the server
    if (typeof window === "undefined") {
      return {};
    }

    // On the client, try to load from localStorage
    const saved = localStorage.getItem("spotilark-settings");
    return saved ? JSON.parse(saved) : {};
  });

  const { setTheme: setNewTheme } = useTheme();
  const [isThemeSynced, setIsThemeSynced] = useState(false);

  const setSetting = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    // Only save to localStorage on the client side
    if (typeof window !== "undefined") {
      localStorage.setItem("spotilark-settings", JSON.stringify(settings));
    }
  }, [settings]);

  // Sync theme setting with new theme context
  useEffect(() => {
    if (!isThemeSynced && settings.theme) {
      // Convert old theme setting to new system
      if (settings.theme === 'dark') {
        setNewTheme('dark');
      } else {
        setNewTheme('light');
      }
      setIsThemeSynced(true);
    }
  }, [settings.theme, setNewTheme, isThemeSynced]);

  const value: SettingsContextType = {
    crossfade: settings.crossfade ?? false,
    setCrossfade: (v) => setSetting("crossfade", v),
    crossfadeDuration: settings.crossfadeDuration ?? 5,
    setCrossfadeDuration: (v) => setSetting("crossfadeDuration", v),
    gaplessPlayback: settings.gaplessPlayback ?? false,
    setGaplessPlayback: (v) => setSetting("gaplessPlayback", v),
    automix: settings.automix ?? false,
    setAutomix: (v) => setSetting("automix", v),
    audioNormalization: settings.audioNormalization ?? true,
    setAudioNormalization: (v) => setSetting("audioNormalization", v),
    shareListeningActivity: settings.shareListeningActivity ?? false,
    setShareListeningActivity: (v) => setSetting("shareListeningActivity", v),
    showRecentlyPlayed: settings.showRecentlyPlayed ?? true,
    setShowRecentlyPlayed: (v) => setSetting("showRecentlyPlayed", v),
    theme: settings.theme ?? "system",
    setTheme: (v) => {
      setSetting("theme", v);
      // Also update the new theme context
      if (v === 'dark') {
        setNewTheme('dark');
      } else {
        setNewTheme('light');
      }
    },
    fontColor: settings.fontColor ?? "#000000",
    setFontColor: (v) => setSetting("fontColor", v),
    backgroundColor: settings.backgroundColor ?? "#ffffff",
    setBackgroundColor: (v) => setSetting("backgroundColor", v),
    fontStyle: settings.fontStyle ?? "Inter",
    setFontStyle: (v) => setSetting("fontStyle", v),
    fontSize: settings.fontSize ?? "medium",
    setFontSize: (v) => setSetting("fontSize", v),
    streamingQuality: settings.streamingQuality ?? "high",
    setStreamingQuality: (v) => setSetting("streamingQuality", v),
    downloadQuality: settings.downloadQuality ?? "high",
    setDownloadQuality: (v) => setSetting("downloadQuality", v),
    playbackSpeed: settings.playbackSpeed ?? 1,
    setPlaybackSpeed: (v) => setSetting("playbackSpeed", v),
    clearCache: async () => {
      try {
        localStorage.removeItem("spotilark-settings");
        localStorage.removeItem("spotilark-volume");
        localStorage.removeItem("likedSongs");
        localStorage.removeItem("spotilark-queue");
        localStorage.removeItem("spotilark_lyrics_cache");

        await clearMusicCache();

        const dbs = await window.indexedDB.databases();
        dbs.forEach(db => {
          if (db.name === 'MusicDB' || db.name?.includes('spotilark')) {
            window.indexedDB.deleteDatabase(db.name!);
          }
        });

        window.location.reload();
      } catch (error) {
        console.error("Failed to clear cache", error);
      }
    }
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};