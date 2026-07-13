'use client';

import { SpotilarkLayout } from "@/components/spotilark-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/context/SettingsContext";
import { Music, Palette, Trash2, Copy } from "lucide-react";
import { ThemeSelector } from "@/components/ThemeSelector";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SettingRow = ({ title, description, control }: { title: string; description?: string; control: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
    <div className="flex flex-col gap-1.5">
      <h4 className="font-semibold">{title}</h4>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    {control}
  </div>
);

const SettingsPage = () => {
  const {
    crossfade,
    setCrossfade,
    crossfadeDuration,
    setCrossfadeDuration,
    playbackSpeed,
    setPlaybackSpeed,
    streamingQuality,
    setStreamingQuality,
    continuousPlayback,
    setContinuousPlayback,
    fontStyle,
    setFontStyle,
    fontSize,
    setFontSize,
    normalizeAudio,
    setNormalizeAudio,
    clearCache,
  } = useSettings();

  const [keepLyrics, setKeepLyrics] = useState(true);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [duplicates, setDuplicates] = useState<{ key: string; tracks: any[] }[]>([]);

  return (
    <SpotilarkLayout>
      <div className="flex-1 p-4 md:p-6 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold">Settings</h1>

          {/* Playback */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Playback
              </CardTitle>
              <CardDescription>Control how music plays</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <SettingRow
                title="Crossfade"
                description="Smooth transitions between tracks"
                control={
                  <Switch
                    checked={crossfade}
                    onCheckedChange={setCrossfade}
                  />
                }
              />
              {crossfade && (
                <SettingRow
                  title="Crossfade Duration"
                  description={`${crossfadeDuration} seconds`}
                  control={
                    <Slider
                      value={[crossfadeDuration]}
                      onValueChange={(v) => setCrossfadeDuration(v[0])}
                      min={1}
                      max={10}
                      step={1}
                      className="w-32"
                    />
                  }
                />
              )}
              <SettingRow
                title="Continuous Playback"
                description="Auto-advance to next track"
                control={
                  <Switch
                    checked={continuousPlayback}
                    onCheckedChange={setContinuousPlayback}
                  />
                }
              />
              <SettingRow
                title="Normalize Audio"
                description="Balance volume across tracks"
                control={
                  <Switch
                    checked={normalizeAudio}
                    onCheckedChange={setNormalizeAudio}
                  />
                }
              />
              <SettingRow
                title="Playback Speed"
                description={`${playbackSpeed}x`}
                control={
                  <Select
                    value={String(playbackSpeed)}
                    onValueChange={(v) => setPlaybackSpeed(Number(v))}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">0.5x</SelectItem>
                      <SelectItem value="0.75">0.75x</SelectItem>
                      <SelectItem value="1">1x</SelectItem>
                      <SelectItem value="1.25">1.25x</SelectItem>
                      <SelectItem value="1.5">1.5x</SelectItem>
                      <SelectItem value="2">2x</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
            </CardContent>
          </Card>

          {/* Streaming */}
          <Card>
            <CardHeader>
              <CardTitle>Streaming</CardTitle>
              <CardDescription>YouTube streaming quality</CardDescription>
            </CardHeader>
            <CardContent>
              <SettingRow
                title="Quality"
                description="Lower = faster loading"
                control={
                  <Select
                    value={streamingQuality}
                    onValueChange={setStreamingQuality}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>Themes, wallpaper, and fonts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <ThemeSelector />
              <SettingRow
                title="Font Style"
                description="Choose your preferred font"
                control={
                  <Select value={fontStyle} onValueChange={setFontStyle}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Serif">Serif</SelectItem>
                      <SelectItem value="Mono">Mono</SelectItem>
                      <SelectItem value="Comic">Comic</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
              <SettingRow
                title="Font Size"
                description="Adjust text size"
                control={
                  <Select value={fontSize} onValueChange={setFontSize}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                      <SelectItem value="extra-large">Extra Large</SelectItem>
                    </SelectContent>
                  </Select>
                }
              />
            </CardContent>
          </Card>

          {/* Cache */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Storage
              </CardTitle>
              <CardDescription>Manage cached data</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Clear Cache
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Cache</AlertDialogTitle>
                    <AlertDialogDescription>
                      Select what to clear. Your cloud library in Supabase is always safe.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-3 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Local Audio Files</p>
                        <p className="text-xs text-muted-foreground">Stored MP3s and videos in browser storage</p>
                      </div>
                      <Switch checked disabled />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Search History</p>
                        <p className="text-xs text-muted-foreground">Previous search queries</p>
                      </div>
                      <Switch checked disabled />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Play Queue & History</p>
                        <p className="text-xs text-muted-foreground">Current queue, recently played, play counts</p>
                      </div>
                      <Switch checked disabled />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Wallpaper & View Settings</p>
                        <p className="text-xs text-muted-foreground">Custom wallpaper and view mode preferences</p>
                      </div>
                      <Switch checked disabled />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Lyrics Cache</p>
                        <p className="text-xs text-muted-foreground">Keep fetched lyrics for faster loading</p>
                      </div>
                      <Switch checked={keepLyrics} onCheckedChange={setKeepLyrics} />
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => clearCache(keepLyrics)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Clear Selected
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
          {/* Duplicate Finder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Copy className="h-5 w-5" />
                Duplicate Finder
              </CardTitle>
              <CardDescription>Find and remove duplicate tracks</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Scans your library for tracks with the same title and artist.
              </p>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  const { unifiedLibrary, removeLocalTracks } = require('@/context/PlayerContext').usePlayer.getState();
                  const groups = new Map<string, any[]>();
                  for (const track of unifiedLibrary) {
                    const key = `${(track.title || '').toLowerCase().trim()}|${(track.artist || '').toLowerCase().trim()}`;
                    if (!groups.has(key)) groups.set(key, []);
                    groups.get(key)!.push(track);
                  }
                  const dupes = Array.from(groups.entries())
                    .filter(([, tracks]) => tracks.length > 1)
                    .map(([key, tracks]) => ({ key, tracks }));
                  setDuplicates(dupes);
                  if (dupes.length === 0) {
                    alert('No duplicates found!');
                  }
                }}
              >
                <Copy className="h-4 w-4" />
                Find Duplicates
              </Button>
              {duplicates.length > 0 && (
                <div className="mt-4 space-y-3 max-h-60 overflow-y-auto">
                  {duplicates.map(({ key, tracks }, i) => (
                    <div key={i} className="p-3 rounded-xl bg-muted/50 border">
                      <p className="font-medium text-sm">{tracks[0].title} — {tracks[0].artist}</p>
                      <p className="text-xs text-muted-foreground mb-2">{tracks.length} copies</p>
                      <div className="flex flex-wrap gap-1">
                        {tracks.map((t: any, j: number) => (
                          <Button
                            key={t.id}
                            variant={j === 0 ? "default" : "outline"}
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => {
                              if (j > 0) {
                                const { removeLocalTracks } = require('@/context/PlayerContext').usePlayer.getState();
                                removeLocalTracks([t.id]);
                                setDuplicates(prev => {
                                  const updated = prev.map(d => ({
                                    ...d,
                                    tracks: d.tracks.filter((tt: any) => tt.id !== t.id)
                                  })).filter(d => d.tracks.length > 1);
                                  return updated;
                                });
                              }
                            }}
                          >
                            {j === 0 ? 'Keep' : 'Remove'}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SpotilarkLayout>
  );
};

export default SettingsPage;
