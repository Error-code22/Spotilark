"use client";

import { useState, useEffect } from "react";
import { SpotilarkLayout } from "@/components/spotilark-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Music2, CloudDownload, CheckCircle2, FolderPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/context/PlayerContext";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTracks, setFilteredTracks] = useState<any[]>([]);
  const [remoteResults, setRemoteResults] = useState<any[]>([]);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const { trackQueue, playTrack, refetchTracks } = usePlayer();
  const { toast } = useToast();
  const router = useRouter();

  // Filter local tracks
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTracks([]);
      return;
    }
    const query = searchQuery.toLowerCase().trim();
    const results = trackQueue.filter(track =>
      track.title.toLowerCase().includes(query) ||
      (track.artist && track.artist.toLowerCase().includes(query)) ||
      (track.album && track.album.toLowerCase().includes(query))
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

  const handleImport = async (e: React.MouseEvent, track: any) => {
    e.stopPropagation();
    const videoId = track.remoteId;

    setImportingIds(prev => new Set(prev).add(videoId));

    try {
      const res = await fetch('/api/library/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          title: track.title,
          artist: track.artist,
          album: track.album,
          cover: track.cover
        })
      });

      if (res.ok) {
        setImportedIds(prev => new Set(prev).add(videoId));
        toast({
          title: "Import Successful",
          description: `"${track.title}" has been saved to your library.`
        });
        refetchTracks();
      } else {
        const data = await res.json();
        toast({
          title: "Import Failed",
          description: data.error || "Could not save track.",
          variant: "destructive"
        });
      }
    } catch (err) {
      toast({
        title: "Connection Error",
        description: "Library import failed.",
        variant: "destructive"
      });
    } finally {
      setImportingIds(prev => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
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
      <div className="flex-1 p-8 overflow-y-auto pb-24">
        <div className="max-w-5xl mx-auto">

          <div className="relative mb-10">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground h-6 w-6" />
            <Input
              type="text"
              placeholder="Search for any song, artist, or album..."
              className="pl-14 h-16 text-lg rounded-full bg-card border-2 shadow-sm focus-visible:ring-primary focus-visible:border-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

                        {/* IMPORT BUTTON */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full hover:bg-primary/20 hover:text-primary transition-all flex-shrink-0"
                          onClick={(e) => handleImport(e, track)}
                          disabled={importingIds.has(track.remoteId) || importedIds.has(track.remoteId)}
                        >
                          {importingIds.has(track.remoteId) ? (
                            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : importedIds.has(track.remoteId) ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <CloudDownload className="h-5 w-5 opacity-40 group-hover:opacity-100" />
                          )}
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
    </SpotilarkLayout>
  );
}