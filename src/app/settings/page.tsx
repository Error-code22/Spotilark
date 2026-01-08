'use client';

import { SpotilarkLayout } from "@/components/spotilark-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/context/SettingsContext";
import { ChevronRight, Music2, Settings, Share2, HardDrive, Palette, Type, PaintBucket, Home, Volume2, Users, HardDriveUpload } from "lucide-react";
import Link from "next/link";
import Equalizer from "@/components/Equalizer";
import { Input } from "@/components/ui/input";
import { ThemeSelector } from "@/components/ThemeSelector";
import { useState, useEffect } from "react";
import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { clearLyricsCache, getLyricsCacheSize } from "@/lib/lrclib";
// import { check } from '@tauri-apps/plugin-updater';
// import { message as tauriMessage, ask } from '@tauri-apps/plugin-dialog';
// import { relaunch } from '@tauri-apps/plugin-process';

const SettingRow = ({ title, description, control }: { title: string; description?: string; control: React.ReactNode }) => (
  <div className="flex items-center justify-between py-4">
    <div className="flex flex-col gap-1.5">
      <h4 className="font-semibold">{title}</h4>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    {control}
  </div>
);

// Define settings categories
type SettingsCategory =
  | 'appearance'
  | 'playback'
  | 'audio'
  | 'social'
  | 'other';

const SettingsPage = () => {
  const [isClearCacheDialogOpen, setIsClearCacheDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isLegalDialogOpen, setIsLegalDialogOpen] = useState(false);
  const [isLanguageDialogOpen, setIsLanguageDialogOpen] = useState(false);
  const [lyricsCacheSize, setLyricsCacheSize] = useState<string>("0 B");

  useEffect(() => {
    if (isClearCacheDialogOpen) {
      const size = getLyricsCacheSize();
      if (size === 0) {
        setLyricsCacheSize("0 B");
      } else {
        const i = Math.floor(Math.log(size) / Math.log(1024));
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        setLyricsCacheSize(`${(size / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`);
      }
    }
  }, [isClearCacheDialogOpen]);
  const {
    crossfade,
    setCrossfade,
    crossfadeDuration,
    setCrossfadeDuration,
    gaplessPlayback,
    setGaplessPlayback,
    automix,
    setAutomix,
    audioNormalization,
    setAudioNormalization,
    shareListeningActivity,
    setShareListeningActivity,
    showRecentlyPlayed,
    setShowRecentlyPlayed,
    theme,
    setTheme,
    fontColor,
    setFontColor,
    backgroundColor,
    setBackgroundColor,
    fontStyle,
    setFontStyle,
    fontSize,
    setFontSize,
    streamingQuality,
    setStreamingQuality,
    downloadQuality,
    setDownloadQuality,
    playbackSpeed,
    setPlaybackSpeed,
    clearCache,
  } = useSettings();

  // Storage usage state
  const [storageUsage, setStorageUsage] = useState<string>("Calculating...");

  React.useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(estimate => {
        const used = (estimate.usage || 0) / (1024 * 1024);
        setStorageUsage(`${used.toFixed(2)} MB`);
      });
    } else {
      setStorageUsage("Unknown");
    }
  }, []);

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('appearance');

  // Define category configuration
  const categories = [
    {
      id: 'appearance',
      title: 'Appearance',
      icon: Palette,
      description: 'Customize the look and feel of the app',
    },
    {
      id: 'playback',
      title: 'Playback',
      icon: Music2,
      description: 'Customize your listening experience',
    },
    {
      id: 'audio',
      title: 'Audio Quality & Storage',
      icon: HardDrive,
      description: 'Manage streaming, downloads, and storage',
    },
    {
      id: 'social',
      title: 'Social',
      icon: Share2,
      description: 'Connect with friends and share your activity',
    },
    {
      id: 'other',
      title: 'Other Options',
      icon: Settings,
      description: 'Additional application settings',
    },
  ];

  // Render content based on active category
  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'appearance':
        return (
          <div className="space-y-6">
            <ThemeSelector />

            <div className="pt-4 border-t">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Type className="h-5 w-5 text-primary" />
                Typography
              </h3>

              <SettingRow
                title="Font Family"
                description="Choose your preferred font style."
                control={
                  <Select value={fontStyle} onValueChange={setFontStyle}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter (Sans-serif)</SelectItem>
                      <SelectItem value="Serif">Serif (Classic)</SelectItem>
                      <SelectItem value="Mono">Monospace (Coding)</SelectItem>
                      <SelectItem value="OpenDyslexic">OpenDyslexic (Accessibility)</SelectItem>
                      <SelectItem value="Comic">Comic Sans (Playful)</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />

              <SettingRow
                title="Font Size"
                description="Adjust text size for better readability."
                control={
                  <Select value={fontSize} onValueChange={setFontSize}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small (85%)</SelectItem>
                      <SelectItem value="medium">Medium (100%)</SelectItem>
                      <SelectItem value="large">Large (120%)</SelectItem>
                      <SelectItem value="extra-large">Extra Large (150%)</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
            </div>
          </div>
        );
      case 'playback':
        return (
          <div className="space-y-6">
            <SettingRow title="Crossfade" description="Allow songs to fade into each other." control={<Switch checked={crossfade} onCheckedChange={setCrossfade} />} />
            <SettingRow title="Crossfade Duration" control={
              <div className="flex items-center gap-4 opacity-90">
                <span>{crossfadeDuration}s</span>
                <Slider value={[crossfadeDuration]} onValueChange={(value) => setCrossfadeDuration(value[0])} max={12} step={1} className="w-32" disabled={!crossfade} />
                <span>12s</span>
              </div>
            } />
            <SettingRow title="Gapless Playback" description="Play tracks without silence between them." control={<Switch checked={gaplessPlayback} onCheckedChange={setGaplessPlayback} />} />
            <SettingRow title="Automix" description="Allow smooth transitions between songs." control={<Switch checked={automix} onCheckedChange={setAutomix} />} />
            <SettingRow title="Audio Normalization" description="Set a consistent volume level for all tracks." control={<Switch checked={audioNormalization} onCheckedChange={setAudioNormalization} />} />
            <SettingRow title="Playback Speed" control={
              <Select value={playbackSpeed.toString()} onValueChange={(v) => setPlaybackSpeed(parseFloat(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="1">1x (Normal)</SelectItem>
                  <SelectItem value="1.5">1.5x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                </SelectContent>
              </Select>
            } />
            <Equalizer />
          </div>
        );
      case 'audio':
        return (
          <div className="space-y-6">
            <SettingRow title="Streaming Quality" control={
              <Select value={streamingQuality} onValueChange={setStreamingQuality}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="very-high">Very High</SelectItem>
                </SelectContent>
              </Select>
            } />
            <SettingRow title="Download Quality" control={
              <Select value={downloadQuality} onValueChange={setDownloadQuality}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            } />
            <SettingRow title="Storage Location" description={`Used: ${storageUsage} (Internal Browser Storage)`} control={
              <Button variant="ghost" className="gap-2" disabled>
                <>
                  <span>Managed by Browser</span>
                  <HardDrive className="h-4 w-4" />
                </>
              </Button>
            } />
          </div>
        );
      case 'social':
        return (
          <div className="space-y-6">
            <SettingRow title="Share My Listening Activity" description="Show what you're listening to on your profile." control={<Switch checked={shareListeningActivity} onCheckedChange={setShareListeningActivity} />} />
            <SettingRow title="Show My Recently Played Artists" description="Display your recent artists on your public profile." control={<Switch checked={showRecentlyPlayed} onCheckedChange={setShowRecentlyPlayed} />} />
            <SettingRow title="Connect with Friends" description="Find and follow friends from your contacts." control={<Button variant="ghost" asChild><Link href="/profile">Connect</Link></Button>} />
          </div>
        );
      case 'other':
        return (
          <div className="space-y-6">
            <SettingRow title="Clear Cache" description="Manage storage and clear temporary files." control={<Button variant="ghost" onClick={() => setIsClearCacheDialogOpen(true)}>Manage</Button>} />
            <SettingRow title="Language" description="Choose the application language." control={
              <Button variant="ghost" className="gap-2" onClick={() => setIsLanguageDialogOpen(true)}>
                <>
                  <span>English</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              </Button>
            } />
            <SettingRow title="About Spotilark" description="View version info, credits, and project details." control={
              <Button variant="ghost" className="gap-2" onClick={() => setIsAboutDialogOpen(true)}>
                <>
                  <span>View</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              </Button>
            } />
            <SettingRow title="Legal & Privacy" description="Terms of Service, Privacy Policy, and Licensing." control={
              <Button variant="ghost" className="gap-2" onClick={() => setIsLegalDialogOpen(true)}>
                <>
                  <span>View</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              </Button>
            } />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <SpotilarkLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b md:p-8">
          <h1 className="text-2xl font-bold md:text-4xl">Settings</h1>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden flex-col">
          {/* Grid Navigation - 2x2 style like Lark Player */}
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-2 gap-3 md:gap-4 max-w-lg mx-auto md:max-w-2xl">
              {categories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <button
                    key={category.id}
                    className={`flex flex-col items-center justify-center p-4 md:p-6 rounded-2xl transition-all duration-200 ${activeCategory === category.id
                      ? 'bg-primary/10 border-2 border-primary shadow-lg'
                      : 'bg-card hover:bg-muted border border-border'
                      }`}
                    onClick={() => setActiveCategory(category.id as SettingsCategory)}
                  >
                    <IconComponent className={`h-8 w-8 mb-2 ${activeCategory === category.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-bold ${activeCategory === category.id ? 'text-primary' : 'text-foreground'}`}>
                      {category.title}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1 text-center line-clamp-1 hidden md:block">
                      {category.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>


          {/* Settings Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8">
            <div className="max-w-3xl w-full overflow-hidden">

              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  {(() => {
                    const IconComponent = categories.find(cat => cat.id === activeCategory)?.icon || Palette;
                    return <IconComponent className="h-6 w-6 text-primary" />;
                  })()}
                </div>
                <div>
                  <h2 className="text-xl font-bold md:text-2xl">{categories.find(cat => cat.id === activeCategory)?.title}</h2>
                  <p className="text-muted-foreground hidden md:block">{categories.find(cat => cat.id === activeCategory)?.description}</p>
                </div>
              </div>

              <div className="bg-card rounded-xl p-4 md:p-6 shadow-sm border">
                {renderCategoryContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
      <AlertDialog open={isClearCacheDialogOpen} onOpenChange={setIsClearCacheDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Manage Storage</AlertDialogTitle>
            <AlertDialogDescription>
              Review and clear your application data.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h4 className="font-medium">Lyrics Cache</h4>
                <p className="text-sm text-muted-foreground">{lyricsCacheSize} used</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                clearLyricsCache();
                setLyricsCacheSize("0 B");
              }}>Clear</Button>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-destructive/10 border-destructive/20">
              <div>
                <h4 className="font-medium text-destructive">Factory Reset</h4>
                <p className="text-sm text-muted-foreground">Clears settings, queues, music cache, and reloads.</p>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearCache} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Reset Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Language Dialog */}
      <Dialog open={isLanguageDialogOpen} onOpenChange={setIsLanguageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Language</DialogTitle>
            <DialogDescription>
              Choose your preferred language for the application interface.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            {['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese'].map((lang) => (
              <Button
                key={lang}
                variant={lang === 'English' ? 'secondary' : 'ghost'}
                className="justify-start font-normal h-12 text-base"
                onClick={() => setIsLanguageDialogOpen(false)}
              >
                {lang}
                {lang === 'English' && <span className="ml-auto text-xs text-primary font-bold uppercase tracking-wider">Default</span>}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* About Dialog */}
      <Dialog open={isAboutDialogOpen} onOpenChange={setIsAboutDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4">
              <Music2 className="h-12 w-12 text-primary" />
            </div>
            <DialogTitle className="text-center text-2xl font-bold">Spotilark</DialogTitle>
            <DialogDescription className="text-center">
              Version 0.1.0 Beta (2025)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground italic">
                "Fly with your music, anywhere."
              </p>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-bold mb-2 uppercase tracking-widest text-muted-foreground/50">Credits</h4>
              <ul className="text-sm space-y-1">
                <li className="flex justify-between"><span>Design</span> <span className="font-mono text-xs">Antigravity AI</span></li>
                <li className="flex justify-between"><span>Engine</span> <span className="font-mono text-xs">Next.js + Supabase</span></li>
                <li className="flex justify-between"><span>Assets</span> <span className="font-mono text-xs">Cloudinary + Lucide</span></li>
              </ul>
            </div>

            <div className="bg-muted p-3 rounded-lg text-[10px] text-muted-foreground font-mono leading-relaxed">
              Spotilark is an independent cloud-synced player emphasizing accessibility and offline freedom. Built with passion for music lovers.
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={async () => {
                alert('Update checks are only available in the standalone desktop app.');
                /* 
                if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) {
                  await alert('Update checks are only available in the desktop app.');
                  return;
                }
                try {
                  const update = await check();
                  if (update) {
                    const shouldInstall = await ask(
                      `A new version (${update.version}) is available. Install now?`,
                      { title: 'Update Available', kind: 'info' }
                    );
                    if (shouldInstall) {
                      await update.downloadAndInstall();
                      await tauriMessage('Restarting to apply update...');
                      await relaunch();
                    }
                  } else {
                    await tauriMessage('You are on the latest version!', { title: 'Up to Date', kind: 'info' });
                  }
                } catch (e) {
                  console.error(e);
                  await tauriMessage('Failed to check for updates.', { title: 'Error', kind: 'error' });
                }
                */
              }}
            >
              Check for Updates
            </Button>
            <Button onClick={() => setIsAboutDialogOpen(false)} className="flex-1">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Legal Dialog */}
      <Dialog open={isLegalDialogOpen} onOpenChange={setIsLegalDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Legal & Privacy</DialogTitle>
            <DialogDescription>
              Important information about your rights and data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <section className="space-y-2">
              <h4 className="font-bold text-sm">Terms of Service</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                By using Spotilark, you agree to our terms. Spotilark provides a platform for managing and playing your music library across devices.
              </p>
              <Button variant="link" className="p-0 h-auto text-xs text-primary">Read Full Terms</Button>
            </section>

            <section className="space-y-2 border-t pt-4">
              <h4 className="font-bold text-sm">Privacy Policy</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your privacy is core to Spotilark. We use Supabase for secure authentication and Cloudinary for media. Your data is yours.
              </p>
              <Button variant="link" className="p-0 h-auto text-xs text-primary">Read Privacy Policy</Button>
            </section>

            <section className="space-y-2 border-t pt-4">
              <h4 className="font-bold text-sm">Open Source & Licensing</h4>
              <p className="text-[10px] text-muted-foreground font-mono leading-tight">
                © 2025 Spotilark Team. Not affiliated with Spotify AB. All trademarks are property of their respective owners. This application uses various open-source libraries including Next.js, Shadcn UI, and Lucide Icons.
              </p>
            </section>
          </div>

          <Button onClick={() => setIsLegalDialogOpen(false)} className="w-full">
            I Understand
          </Button>
        </DialogContent>
      </Dialog>
    </SpotilarkLayout>
  );
};

export default SettingsPage;
