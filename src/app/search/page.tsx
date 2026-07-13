"use client";

import { useState, useEffect } from "react";
import { SpotilarkLayout } from "@/components/spotilark-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Music2, CloudDownload, FolderPlus, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/context/PlayerContext";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { YouTubeAuth } from "@/components/YouTubeAuth";
import { ImportDialog } from "@/components/ImportDialog";

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTracks, setFilteredTracks] = useState<any[]>([]);
  const [remoteResults, setRemoteResults] = useState<any[]>([]);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showYouTubeAuth, setShowYouTubeAuth] = useState(false);
  const [importTrack, setImportTrack] = useState<any>(null);
  const [streamFormatTrack, setStreamFormatTrack] = useState<any>(null);
  const { trackQueue, playTrack, refetchTracks } = usePlayer();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('spotilark-search-history');
    if (saved) {
      try { setSearchHistory(JSON.parse(saved)); } catch {}
    }
  }, []);

  const saveToHistory = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    setSearchHistory(prev => {
      const updated = [trimmed, ...prev.filter(q => q !== trimmed)].slice(0, 20);
      localStorage.setItem('spotilark-search-history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('spotilark-search-history');
  };

  // Fuzzy match: checks if all characters of query appear in order in the target
  const fuzzyMatch = (target: string, query: string): boolean => {
    const t = target.toLowerCase();
    const q = query.toLowerCase();
    if (t.includes(q)) return true;
    let qi = 0;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
      if (t[ti] === q[qi]) qi++;
    }
    return qi === q.length;
  };

  // Filter local tracks
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTracks([]);
      return;
    }
    const query = searchQuery.toLowerCase().trim();
    const results = trackQueue.filter(track =>
      fuzzyMatch(track.title, query) ||
      (track.artist && fuzzyMatch(track.artist, query)) ||
      (track.album && fuzzyMatch(track.album, query))
    );
    setFilteredTracks(results);
  }, [searchQuery, trackQueue]);

  // Fetch remote tracks (Debounced)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setRemoteResults([]);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingRemote(true);
      setSearchError(null);
      saveToHistory(searchQuery);
      try {
        const res = await fetch(`/api/search/remote?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setRemoteResults(data);
        } else {
          setSearchError("Failed to fetch global results.");
        }
      } catch (err) {
        setSearchError("Connection error.");
      } finally {
        setIsSearchingRemote(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleImport = (e: React.MouseEvent, track: any) => {
    e.stopPropagation();
    setImportTrack(track);
  };

  const handleStreamFormat = (_e: any, track: any) => {
    setStreamFormatTrack(track);
  };

  const handleStreamAs = (format: 'audio' | 'video') => {
    const track = streamFormatTrack;
    if (!track) return;
    setStreamFormatTrack(null);

    // Extract raw video ID (remove yt- prefix if present)
    const videoId = track.id?.replace('yt-', '') || track.remoteId || track.id;

    if (format === 'audio') {
      playTrack({
        id: `yt-${videoId}`,
        title: track.title,
        artist: track.artist || track.channel || 'YouTube',
        album: 'YouTube',
        cover: track.cover || track.thumbnail || null,
        source_url: `/api/stream/youtube?v=${videoId}`,
        storage_type: 'stream',
        duration: track.duration || 0,
        created_at: new Date().toISOString(),
        created_by: 'search',
      });
    } else {
      playTrack({
        id: `video-${videoId}`,
        title: track.title,
        artist: track.artist || track.channel || 'YouTube',
        album: 'YouTube',
        cover: track.cover || track.thumbnail || null,
        source_url: `/api/stream/video?id=${videoId}&quality=480`,
        storage_type: 'local',
        hasVideo: true,
        videoUrl: `/api/stream/video?id=${videoId}&quality=480`,
        duration: track.duration || 0,
        created_at: new Date().toISOString(),
        created_by: 'search',
      });
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setFilteredTracks([]);
    setRemoteResults([]);
    setSearchError(null);
  };

  return (
    <SpotilarkLayout>
      <div className="flex-1 p-4 md:p-8 overflow-y-auto pb-24">
        <div className="max-w-5xl mx-auto">

          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-3xl font-black tracking-tight">Search</h1>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => setShowYouTubeAuth(true)}
              title="YouTube Authentication"
            >
              <Shield className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative mb-10">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground h-6 w-6" />
            <Input
              type="text"
              placeholder="Search for any song, artist, or album..."
              className="pl-14 h-16 text-lg rounded-full bg-card border-2 shadow-sm focus-visible:ring-primary focus-visible:border-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => !searchQuery && setShowHistory(true)}
              onBlur={() => setTimeout(() => setShowHistory(false), 200)}
              autoFocus
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full hover:bg-accent"
                onClick={clearSearch}
              >
                <X className="h-5 w-5" />
              </Button>
            )}

            {!searchQuery && showHistory && searchHistory.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-card border rounded-2xl shadow-lg z-20 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent</span>
                  <Button variant="ghost" size="sm" className="text-xs h-6" onClick={clearHistory}>Clear</Button>
                </div>
                {searchHistory.map((q, i) => (
                  <button
                    key={i}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors flex items-center gap-3"
                    onMouseDown={() => { setSearchQuery(q); setShowHistory(false); }}
                  >
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{q}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {searchQuery ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* LOCAL LIBRARY */}
              <section>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-6 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Your Library
                </h2>
                {filteredTracks.length > 0 ? (
                  <div className="space-y-1">
                    {filteredTracks.map((track) => (
                      <div
                        key={track.id}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent group transition-all cursor-pointer"
                        onClick={() => playTrack(track)}
                      >
                        <div className="w-12 h-12 rounded-lg bg-muted relative overflow-hidden flex-shrink-0 shadow-md">
                          {track.cover ? (
                            <Image src={track.cover} alt={track.title} fill className="object-cover" unoptimized />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Music2 className="h-6 w-6 text-muted-foreground" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{track.title}</h3>
                          <p className="text-xs text-muted-foreground truncate font-medium">{track.artist}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-muted/20 border border-dashed border-border text-center group">
                    <p className="text-sm text-muted-foreground italic mb-4">No local matches</p>
                    <div className="pt-4 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-3">Want to add your own music?</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full gap-2 hover:bg-primary/10 hover:text-primary transition-all font-bold"
                        onClick={() => router.push('/folders')}
                      >
                        <FolderPlus className="h-4 w-4" />
                        Go to Uploads
                      </Button>
                    </div>
                  </div>
                )}
              </section>

              {/* GLOBAL SEARCH */}
              <section>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-6 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Global Streaming
                </h2>

                {isSearchingRemote ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-muted/10 rounded-2xl border border-dashed text-muted-foreground">
                    <div className="h-8 w-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-sm font-medium animate-pulse">Scanning the globe...</p>
                  </div>
                ) : searchError ? (
                  <div className="p-8 rounded-2xl bg-destructive/5 border border-destructive/20 text-center">
                    <p className="text-sm text-destructive font-medium mb-1">Search Error</p>
                    <p className="text-xs text-muted-foreground">{searchError}</p>
                  </div>
                ) : remoteResults.length > 0 ? (
                  <div className="space-y-1">
                    {remoteResults.map((track) => (
                      <div
                        key={track.id}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent group transition-all cursor-pointer"
                        onClick={() => handleStreamFormat(new MouseEvent('click'), track)}
                      >
                        <div className="w-12 h-12 rounded-lg bg-muted relative overflow-hidden flex-shrink-0 shadow-md">
                          {track.cover ? (
                            <Image src={track.cover} alt={track.title} fill className="object-cover" unoptimized />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Music2 className="h-6 w-6 text-muted-foreground" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{track.title}</h3>
                          <p className="text-xs text-muted-foreground truncate font-medium">{track.artist}</p>
                        </div>

                        {/* IMPORT BUTTON */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full hover:bg-primary/20 hover:text-primary transition-all flex-shrink-0"
                          onClick={(e) => handleImport(e, track)}
                        >
                          <CloudDownload className="h-5 w-5 opacity-40 group-hover:opacity-100" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : searchQuery.length >= 3 ? (
                  <div className="p-12 rounded-2xl bg-muted/20 border border-dashed border-border text-center">
                    <p className="text-sm text-muted-foreground italic">No global results found for this search.</p>
                  </div>
                ) : (
                  <div className="p-12 rounded-2xl bg-muted/10 border border-dashed border-border text-center">
                    <Music2 className="h-10 w-10 mx-auto mb-4 opacity-10" />
                    <p className="text-sm text-muted-foreground italic">Type to explore millions of songs</p>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="text-center py-32 text-muted-foreground">
              <div className="relative inline-block mb-8">
                <Search className="h-24 w-24 opacity-5" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1 h-1 bg-primary rounded-full animate-ping" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground/80 mb-2">Music everywhere</p>
              <p className="text-base max-w-sm mx-auto opacity-60">Search for tracks in your library or stream millions from around the world instantly.</p>
            </div>
          )}
        </div>
      </div>
      <YouTubeAuth open={showYouTubeAuth} onOpenChange={setShowYouTubeAuth} />
      {importTrack && (
        <ImportDialog
          open={!!importTrack}
          onOpenChange={(open) => { if (!open) setImportTrack(null); }}
          track={importTrack}
        />
      )}
      {streamFormatTrack && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setStreamFormatTrack(null)}>
          <div className="bg-card/95 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 w-[340px]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black tracking-tight mb-1">Stream Track</h3>
            <p className="text-xs text-muted-foreground mb-5 line-clamp-1">{streamFormatTrack.title}</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleStreamAs('audio')}
                className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all cursor-pointer"
              >
                <Music2 className="h-8 w-8 text-primary" />
                <span className="text-sm font-bold">MP3</span>
                <span className="text-[10px] text-muted-foreground">Audio only</span>
              </button>
              <button
                onClick={() => handleStreamAs('video')}
                className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all cursor-pointer"
              >
                <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m10 9 5 3-5 3z"/></svg>
                <span className="text-sm font-bold">MP4</span>
                <span className="text-[10px] text-muted-foreground">Video + Audio</span>
              </button>
            </div>
            <Button variant="ghost" className="w-full mt-4" onClick={() => setStreamFormatTrack(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </SpotilarkLayout>
  );
}