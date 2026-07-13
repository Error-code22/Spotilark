"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { SpotilarkLayout } from "@/components/spotilark-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import Search from "lucide-react/icons/search";
import Play from "lucide-react/icons/play";
import Pause from "lucide-react/icons/pause";
import Youtube from "lucide-react/icons/youtube";
import FolderArchive from "lucide-react/icons/folder-archive";
import X from "lucide-react/icons/x";
import Loader2 from "lucide-react/icons/loader-2";
import Upload from "lucide-react/icons/upload";
import List from "lucide-react/icons/list";
import LayoutList from "lucide-react/icons/layout-list";
import LayoutGrid from "lucide-react/icons/layout-grid";
import Clock from "lucide-react/icons/clock";
import Trash2 from "lucide-react/icons/trash-2";
import SortAsc from "lucide-react/icons/arrow-up-narrow-wide";
import Filter from "lucide-react/icons/filter";
import Share2 from "lucide-react/icons/share-2";
import FolderOpen from "lucide-react/icons/folder-open";
import Download from "lucide-react/icons/download";
import Music from "lucide-react/icons/music";
import Video from "lucide-react/icons/video";
import { usePlayer } from "@/context/PlayerContext";
import { useSettings } from "@/context/SettingsContext";
import { Switch } from "@/components/ui/switch";
import { Track } from "@/lib/data";
import { cn, formatTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

type Tab = "youtube" | "local";
type ViewMode = "small" | "medium" | "large";

interface YouTubeResult {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  channel: string;
}

export default function VideoPage() {
  const [activeTab, setActiveTab] = useState<Tab>("youtube");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("spotilark-video-view") as ViewMode) || "medium";
    }
    return "medium";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [youtubeResults, setYoutubeResults] = useState<YouTubeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeResult | null>(null);
  const [selectedQuality, setSelectedQuality] = useState(720);
  const [playingVideo, setPlayingVideo] = useState<{ src: string; title: string; cover: string } | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "name" | "duration">("date");
  const [downloadingVideo, setDownloadingVideo] = useState<string | null>(null);
  const [downloadPopoverId, setDownloadPopoverId] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const popUpVideoRef = useRef<HTMLVideoElement>(null);

  const { playTrack, currentTrack, isPlaying, currentTime, volume, handleSeek, unifiedLibrary, addLocalTracks } = usePlayer();
  const { toast } = useToast();
  const { playVideoAsAudio, setPlayVideoAsAudio } = useSettings();

  const handleDownload = async (result: YouTubeResult, format: "audio" | "video") => {
    const videoUrl = `https://www.youtube.com/watch?v=${result.id}`;
    setDownloadPopoverId(null);
    setDownloadingVideo(result.id);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl, format }),
      });
      if (res.ok) {
        toast({ title: "Download started", description: `${result.title} (${format === "audio" ? "MP3" : "MP4"})` });
      } else {
        const data = await res.json();
        toast({ title: "Download failed", description: data.error || "Unknown error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Download failed", description: "Could not start download", variant: "destructive" });
    }
    setDownloadingVideo(null);
  };

  useEffect(() => {
    localStorage.setItem("spotilark-video-view", viewMode);
  }, [viewMode]);

  const localVideoTracks = useMemo(() => {
    const videos = unifiedLibrary.filter((t) => t.hasVideo === true);
    return videos.sort((a, b) => {
      if (sortBy === "name") return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "duration") return (b.duration || 0) - (a.duration || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [unifiedLibrary, sortBy]);

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      const url = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        const dur = video.duration || 0;
        URL.revokeObjectURL(url);
        resolve(dur);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
      video.src = url;
      setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve(0);
      }, 3000);
    });
  };

  const extractVideoCover = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadeddata = () => {
        video.currentTime = Math.min(1, video.duration * 0.1);
      };
      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const vw = video.videoWidth || 320;
          const vh = video.videoHeight || 180;
          const size = Math.min(vw, vh);
          const x = (vw - size) / 2;
          const y = (vh - size) / 2;
          ctx.drawImage(video, x, y, size, size, 0, 0, 64, 64);
          resolve(canvas.toDataURL("image/jpeg", 0.4));
        } else {
          resolve("/spotilark-without-text-white.png");
        }
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => resolve("/spotilark-without-text-white.png");
      video.src = URL.createObjectURL(file);
    });
  };

  const processVideoFiles = async (files: File[]) => {
    const tracks: Track[] = [];
    for (const file of files) {
      const cover = await extractVideoCover(file);
      const duration = await getVideoDuration(file);
      const videoUrl = URL.createObjectURL(file);
      tracks.push({
        id: `local-video-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        artist: file.webkitRelativePath?.split("/").slice(0, -1).join("/ ") || "Local Video",
        album: file.webkitRelativePath?.split("/").slice(0, -1).join("/") || null,
        source_url: videoUrl,
        duration: duration || null,
        cover,
        created_at: new Date().toISOString(),
        created_by: "local-user",
        storage_type: "local",
        hasVideo: true,
        videoUrl,
      });
    }
    await addLocalTracks(tracks, files);
  };

  const handleYouTubeSearch = async () => {
    if (!searchQuery.trim()) return;

    const urlMatch = searchQuery.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (urlMatch) {
      const videoId = urlMatch[1];
      openVideoPopup(
        `/api/stream/video?id=${videoId}&quality=${selectedQuality}`,
        "YouTube Video",
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      );
      setSearchQuery("");
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/video/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setYoutubeResults(data.results || []);
      }
    } catch (err) {
      console.error("YouTube search failed:", err);
    }
    setIsSearching(false);
  };

  const playYouTubeResult = (result: YouTubeResult, quality: number = 720) => {
    const src = `/api/stream/video?id=${result.id}&quality=${quality}`;
    setPlayingVideo({
      src,
      title: result.title,
      cover: result.thumbnail,
    });
    setSelectedVideo(null);
    // If same video is playing in main player, sync position after dialog opens
    setTimeout(() => {
      if (popUpVideoRef.current && currentTrack?.videoUrl === src) {
        popUpVideoRef.current.currentTime = currentTime;
      }
    }, 300);
  };

  const openVideoPopup = (src: string, title: string, cover: string) => {
    setPlayingVideo({ src, title, cover });
    // If same video is playing in main player, sync position after dialog opens
    setTimeout(() => {
      if (popUpVideoRef.current && currentTrack?.videoUrl === src) {
        popUpVideoRef.current.currentTime = currentTime;
      }
    }, 300);
  };

  const isCurrentTrack = useCallback((trackId: string) => currentTrack?.id === trackId, [currentTrack]);

  const toggleSort = useCallback(() => {
    setSortBy((prev) => (prev === "date" ? "name" : prev === "name" ? "duration" : "date"));
  }, []);

  const ViewToggle = useMemo(() => (
    <div className="flex gap-1">
      <Button variant={viewMode === "small" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("small")} title="List view">
        <List className="h-4 w-4" />
      </Button>
      <Button variant={viewMode === "medium" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("medium")} title="Details view">
        <LayoutList className="h-4 w-4" />
      </Button>
      <Button variant={viewMode === "large" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("large")} title="Grid view">
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  ), [viewMode]);

  const LocalActionButtons = useMemo(() => (
    <div className="flex gap-1.5 sm:gap-2 flex-wrap animate-in fade-in slide-in-from-left-2 duration-300">
      <Button variant="outline" size="sm" className="rounded-full gap-1.5 text-xs font-semibold" onClick={toggleSort}>
        <SortAsc className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Sort:</span> {sortBy === "date" ? "Date" : sortBy === "name" ? "Name" : "Duration"}
      </Button>
      <Button variant="outline" size="sm" className="rounded-full gap-1.5 text-xs font-semibold">
        <Filter className="h-3.5 w-3.5" />
        Filter
      </Button>
      <Button variant="outline" size="sm" className="rounded-full gap-1.5 text-xs font-semibold">
        <Share2 className="h-3.5 w-3.5" />
        Share
      </Button>
    </div>
  ), [sortBy, toggleSort]);

  return (
    <SpotilarkLayout>
      <div className="flex-1 p-4 md:p-6 overflow-y-auto pb-24">
        <div className="max-w-6xl mx-auto">
          {/* Tabs + View Toggle + Action Buttons */}
          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <div className="flex gap-2">
              <Button variant={activeTab === "youtube" ? "default" : "outline"} className="rounded-full font-bold gap-2" onClick={() => setActiveTab("youtube")}>
                <Youtube className="h-4 w-4" />
                YouTube
              </Button>
              <Button variant={activeTab === "local" ? "default" : "outline"} className="rounded-full font-bold gap-2" onClick={() => setActiveTab("local")}>
                <FolderArchive className="h-4 w-4" />
                Local
              </Button>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Play videos as audio</span>
              <Switch checked={playVideoAsAudio} onCheckedChange={setPlayVideoAsAudio} />
            </div>
          </div>

          {/* YouTube Tab */}
          {activeTab === "youtube" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-card/40 border-none shadow-sm rounded-2xl mb-6">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Input placeholder="Search YouTube or paste a URL..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleYouTubeSearch()} className="rounded-full bg-background/60 border-none" />
                    <Button onClick={handleYouTubeSearch} disabled={isSearching || !searchQuery.trim()} className="rounded-full font-bold gap-2 px-6">
                      {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      Search
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {youtubeResults.length > 0 ? (
                viewMode === "large" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {youtubeResults.map((result) => (
                      <Card key={result.id} className="bg-card/40 border-none shadow-sm hover:bg-primary/5 transition-all group rounded-2xl overflow-hidden active:scale-[0.98] cursor-pointer" onClick={() => setSelectedVideo(result)}>
                        <div className="relative aspect-video w-full">
                          <Image src={result.thumbnail} alt={result.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <div className="p-3 rounded-full bg-primary/90"><Play className="h-6 w-6 text-white fill-white" /></div>
                          </div>
                          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-xs font-bold">{result.duration}</div>
                        </div>
                        <CardContent className="p-3">
                          <p className="font-bold truncate text-sm">{result.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{result.channel}</p>
                          <div className="mt-2">
                            <Popover open={downloadPopoverId === result.id} onOpenChange={(open) => setDownloadPopoverId(open ? result.id : null)}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="rounded-full gap-1.5 text-xs" onClick={(e) => e.stopPropagation()}>
                                  {downloadingVideo === result.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                                  Download
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-2" align="start" onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-2">
                                  <Button size="sm" className="rounded-full gap-1" onClick={() => handleDownload(result, "audio")}>
                                    <Music className="h-3 w-3" /> MP3
                                  </Button>
                                  <Button size="sm" variant="outline" className="rounded-full gap-1" onClick={() => handleDownload(result, "video")}>
                                    <Video className="h-3 w-3" /> MP4
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : viewMode === "medium" ? (
                  <div className="space-y-2">
                    {youtubeResults.map((result) => (
                      <div key={result.id} className="flex items-center gap-3 sm:gap-4 p-3 rounded-2xl hover:bg-primary/5 transition-all cursor-pointer group" onClick={() => setSelectedVideo(result)}>
                        <div className="relative w-28 sm:w-40 aspect-video rounded-xl overflow-hidden shrink-0">
                          <Image src={result.thumbnail} alt={result.title} fill className="object-cover" unoptimized />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Play className="h-5 w-5 text-white fill-white" />
                          </div>
                          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold">{result.duration}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate text-sm">{result.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{result.channel}</p>
                        </div>
                        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Popover open={downloadPopoverId === result.id} onOpenChange={(open) => setDownloadPopoverId(open ? result.id : null)}>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                {downloadingVideo === result.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2" align="end">
                              <div className="flex gap-2">
                                <Button size="sm" className="rounded-full gap-1" onClick={() => handleDownload(result, "audio")}>
                                  <Music className="h-3 w-3" /> MP3
                                </Button>
                                <Button size="sm" variant="outline" className="rounded-full gap-1" onClick={() => handleDownload(result, "video")}>
                                  <Video className="h-3 w-3" /> MP4
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {youtubeResults.map((result) => (
                      <div key={result.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-primary/5 transition-all cursor-pointer group" onClick={() => setSelectedVideo(result)}>
                        <div className="w-6 text-center text-xs text-muted-foreground font-mono"><Play className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity mx-auto" /></div>
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                          <Image src={result.thumbnail} alt={result.title} fill className="object-cover" unoptimized />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-sm">{result.title}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{result.duration}</span>
                        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Popover open={downloadPopoverId === result.id} onOpenChange={(open) => setDownloadPopoverId(open ? result.id : null)}>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                {downloadingVideo === result.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2" align="end">
                              <div className="flex gap-2">
                                <Button size="sm" className="rounded-full gap-1 text-xs" onClick={() => handleDownload(result, "audio")}>
                                  <Music className="h-3 w-3" /> MP3
                                </Button>
                                <Button size="sm" variant="outline" className="rounded-full gap-1 text-xs" onClick={() => handleDownload(result, "video")}>
                                  <Video className="h-3 w-3" /> MP4
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="text-center py-24 text-muted-foreground border-2 border-dashed rounded-[40px] bg-muted/20 flex flex-col items-center gap-6">
                  <div className="p-6 rounded-full bg-background/50"><Youtube className="h-12 w-12 opacity-20" /></div>
                  <p className="font-black text-xl text-foreground/80">{isSearching ? "Searching..." : "Search for videos above"}</p>
                </div>
              )}
            </div>
          )}

          {/* Local Tab */}
          {activeTab === "local" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold">Local Videos ({localVideoTracks.length})</h2>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => folderInputRef.current?.click()} className="rounded-full gap-2 font-bold">
                    <FolderOpen className="h-4 w-4" />
                    Import Folder
                  </Button>
                  <Button onClick={() => videoInputRef.current?.click()} className="rounded-full gap-2 font-bold">
                    <Upload className="h-4 w-4" />
                    Import Videos
                  </Button>
                </div>
              </div>

              {/* Single file input */}
              <input ref={videoInputRef} type="file" accept="video/*,.mp4,.m4v,.mov,.mkv,.webm" multiple className="hidden" onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                if (!files.length) return;
                await processVideoFiles(files);
                e.target.value = "";
              }} />

              {/* Folder input */}
              <input ref={folderInputRef} type="file" accept="video/*,.mp4,.m4v,.mov,.mkv,.webm" {...{webkitdirectory: ""}} multiple className="hidden" onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                if (!files.length) return;
                await processVideoFiles(files);
                e.target.value = "";
              }} />

              {localVideoTracks.length > 0 ? (
                viewMode === "large" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {localVideoTracks.map((track) => (
                      <Card key={track.id} className={cn("bg-card/40 border-none shadow-sm hover:bg-primary/5 transition-all group rounded-2xl overflow-hidden active:scale-[0.98] cursor-pointer")} onClick={() => openVideoPopup(track.videoUrl || track.source_url, track.title, track.cover || "/spotilark-without-text-white.png")}>
                        <div className="relative aspect-video w-full">
                          <Image src={track.cover || "/spotilark-without-text-white.png"} alt={track.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <div className="p-3 rounded-full bg-primary/90">
                              {isCurrentTrack(track.id) && isPlaying ? <Pause className="h-6 w-6 text-white fill-white" /> : <Play className="h-6 w-6 text-white fill-white" />}
                            </div>
                          </div>
                          {track.duration ? <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-xs font-bold">{formatTime(track.duration)}</div> : null}
                        </div>
                        <CardContent className="p-3">
                          <p className="font-bold truncate text-sm">{track.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : viewMode === "medium" ? (
                  <div className="space-y-2">
                    {localVideoTracks.map((track) => (
                      <div key={track.id} className={cn("flex items-center gap-4 p-3 rounded-2xl hover:bg-primary/5 transition-all cursor-pointer group")} onClick={() => openVideoPopup(track.videoUrl || track.source_url, track.title, track.cover || "/spotilark-without-text-white.png")}>
                        <div className="relative w-40 aspect-video rounded-xl overflow-hidden shrink-0">
                          <Image src={track.cover || "/spotilark-without-text-white.png"} alt={track.title} fill className="object-cover" unoptimized />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            {isCurrentTrack(track.id) && isPlaying ? <Pause className="h-5 w-5 text-white fill-white" /> : <Play className="h-5 w-5 text-white fill-white" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("font-bold truncate text-sm", isCurrentTrack(track.id) && "text-primary")}>{track.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{track.duration ? formatTime(track.duration) : "--:--"}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); }}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {localVideoTracks.map((track) => (
                      <div key={track.id} className={cn("flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-primary/5 transition-all cursor-pointer group")} onClick={() => openVideoPopup(track.videoUrl || track.source_url, track.title, track.cover || "/spotilark-without-text-white.png")}>
                        <div className="w-6 text-center text-xs text-muted-foreground font-mono">
                          {isCurrentTrack(track.id) && isPlaying ? <Pause className="h-3 w-3 text-primary mx-auto" /> : <span className="opacity-0 group-hover:opacity-100 transition-opacity"><Play className="h-3 w-3 mx-auto" /></span>}
                        </div>
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                          <Image src={track.cover || "/spotilark-without-text-white.png"} alt={track.title} fill className="object-cover" unoptimized />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("font-semibold truncate text-sm", isCurrentTrack(track.id) && "text-primary")}>{track.title}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1"><Clock className="h-3 w-3" />{track.duration ? formatTime(track.duration) : "--:--"}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="text-center py-24 text-muted-foreground border-2 border-dashed rounded-[40px] bg-muted/20 flex flex-col items-center gap-6">
                  <div className="p-6 rounded-full bg-background/50"><FolderArchive className="h-12 w-12 opacity-20" /></div>
                  <p className="font-black text-xl text-foreground/80">No local videos yet</p>
                  <p className="text-sm text-muted-foreground">Import video files or folders to see them here</p>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => folderInputRef.current?.click()} className="rounded-full gap-2 font-bold">
                      <FolderOpen className="h-4 w-4" />
                      Import Folder
                    </Button>
                    <Button onClick={() => videoInputRef.current?.click()} className="rounded-full gap-2 font-bold">
                      <Upload className="h-4 w-4" />
                      Import Videos
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!selectedVideo} onOpenChange={(open) => { if (!open) setSelectedVideo(null); }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-black">Select Quality</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground truncate">{selectedVideo?.title}</p>
          <div className="grid grid-cols-2 gap-3 py-2">
            {[360, 480, 720, 1080].map((q) => (
              <Button key={q} variant={selectedQuality === q ? "default" : "outline"} className="rounded-full font-bold" onClick={() => setSelectedQuality(q)}>
                {q}p
              </Button>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setSelectedVideo(null)}>Cancel</Button>
            <Button className="rounded-full font-bold" onClick={() => { if (selectedVideo) playYouTubeResult(selectedVideo, selectedQuality); }}>
              <Play className="h-4 w-4 fill-current" />
              Play
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {playingVideo && (
        <Dialog open={!!playingVideo} onOpenChange={(open) => { if (!open) setPlayingVideo(null); }}>
          <DialogContent className="max-w-4xl p-0 bg-black border-none rounded-2xl overflow-hidden">
            <DialogTitle className="sr-only">{playingVideo.title}</DialogTitle>
            <div className="relative aspect-video w-full">
              <video
                ref={popUpVideoRef}
                src={playingVideo.src}
                controls
                autoPlay
                className="w-full h-full object-contain"
                onError={() => {
                  if (playingVideo.src.includes("/api/stream/")) {
                    toast({ title: "Video Error", description: "Failed to load video. Check if yt-dlp is installed.", variant: "destructive" });
                  }
                }}
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <p className="font-bold text-white truncate">{playingVideo.title}</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full gap-2 text-white border border-white/20 hover:bg-white/10"
                  onClick={() => {
                    const resumeTime = popUpVideoRef.current?.currentTime || 0;
                    // Extract video ID from the stream URL to use audio stream
                    const videoIdMatch = playingVideo.src.match(/[?&]id=([^&]+)/);
                    const videoId = videoIdMatch?.[1] || '';
                    const track: Track = {
                      id: `video-${Date.now()}`,
                      title: playingVideo.title,
                      artist: "Video",
                      album: null,
                      source_url: videoId ? `/api/stream/youtube?v=${videoId}&redirect=true` : playingVideo.src,
                      duration: null,
                      cover: playingVideo.cover,
                      created_at: new Date().toISOString(),
                      created_by: "video-player",
                      storage_type: "stream",
                      hasVideo: true,
                      videoUrl: playingVideo.src,
                    };
                    playTrack(track);
                    setPlayingVideo(null);
                    setTimeout(() => handleSeek(resumeTime), 500);
                  }}
                >
                  <Play className="h-4 w-4 fill-current" />
                  Play in Player
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setPlayingVideo(null)} className="text-white">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </SpotilarkLayout>
  );
}
