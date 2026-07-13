"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePlayer } from "@/context/PlayerContext";
import { getCachedTrack } from "@/lib/cache-utils";
import type { Track } from "@/lib/data";
import { Loader2, ImagePlus } from "lucide-react";

interface TagEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: Track | null;
}

interface TagFields {
  title: string;
  artist: string;
  album: string;
  albumArtist: string;
  trackNumber: string;
  year: string;
  genre: string;
}

export function TagEditor({ open, onOpenChange, track }: TagEditorProps) {
  const { toast } = useToast();
  const { localLibrary } = usePlayer();
  const [tags, setTags] = useState<TagFields>({
    title: "",
    artist: "",
    album: "",
    albumArtist: "",
    trackNumber: "",
    year: "",
    genre: "",
  });
  const [coverArt, setCoverArt] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsmediatagsRef = useRef<any>(null);

  const isLocal = track?.storage_type === "local";
  const isCloud = track?.storage_type === "cloud";

  useEffect(() => {
    import("jsmediatags").then((mod) => {
      jsmediatagsRef.current = mod;
    });
  }, []);

  const readTagsFromFile = useCallback(async (track: Track) => {
    if (!jsmediatagsRef.current) return;

    const cachedBlob = await getCachedTrack(track.id);
    if (!cachedBlob) return;

    return new Promise<void>((resolve) => {
      jsmediatagsRef.current.read(cachedBlob, {
        onSuccess: (tag: any) => {
          const t = tag.tags;
          setTags({
            title: t.title || track.title || "",
            artist: t.artist || track.artist || "",
            album: t.album || track.album || "",
            albumArtist: t.albumArtist || "",
            trackNumber: t.track ? String(t.track) : "",
            year: t.year || "",
            genre: t.genre || (track as any).genre || "",
          });
          if (t.picture) {
            const { data, format } = t.picture;
            const byteArray = new Uint8Array(data);
            const blob = new Blob([byteArray], { type: format });
            setCoverArt(URL.createObjectURL(blob));
          } else if (track.cover && track.cover !== "/spotilark-without-text-white.png") {
            setCoverArt(track.cover);
          } else {
            setCoverArt(null);
          }
          resolve();
        },
        onError: () => {
          setTags({
            title: track.title || "",
            artist: track.artist || "",
            album: track.album || "",
            albumArtist: "",
            trackNumber: "",
            year: "",
            genre: (track as any).genre || "",
          });
          setCoverArt(track.cover && track.cover !== "/spotilark-without-text-white.png" ? track.cover : null);
          resolve();
        },
      });
    });
  }, []);

  useEffect(() => {
    if (open && track) {
      setLoading(true);
      setCoverFile(null);
      setCoverArt(null);

      if (isLocal) {
        readTagsFromFile(track).finally(() => setLoading(false));
      } else {
        setTags({
          title: track.title || "",
          artist: track.artist || "",
          album: track.album || "",
          albumArtist: "",
          trackNumber: "",
          year: "",
          genre: (track as any).genre || "",
        });
        setCoverArt(track.cover && track.cover !== "/spotilark-without-text-white.png" ? track.cover : null);
        setLoading(false);
      }
    }
  }, [open, track, isLocal, readTagsFromFile]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    const url = URL.createObjectURL(file);
    setCoverArt(url);
  };

  const buildTagsPayload = (newTags: TagFields, picture?: any) => {
    const payload: any = {
      title: newTags.title,
      artist: newTags.artist,
      album: newTags.album,
      albumArtist: newTags.albumArtist,
      genre: newTags.genre,
    };
    if (newTags.trackNumber) {
      payload.track = newTags.trackNumber;
    }
    if (newTags.year) {
      payload.year = newTags.year;
    }
    if (picture) {
      payload.picture = picture;
    }
    return payload;
  };

  const writeTagsToLocal = async (track: Track, newTags: TagFields, coverFile?: File | null): Promise<boolean> => {
    if (!jsmediatagsRef.current) return false;

    const cachedBlob = await getCachedTrack(track.id);
    if (!cachedBlob) return false;

    let pictureData: any = undefined;
    if (coverFile) {
      pictureData = await new Promise<any>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const arrayBuffer = reader.result as ArrayBuffer;
          const uint8 = new Uint8Array(arrayBuffer);
          resolve({
            format: coverFile.type || "image/jpeg",
            data: Array.from(uint8),
          });
        };
        reader.onerror = () => resolve(undefined);
        reader.readAsArrayBuffer(coverFile);
      });
    } else if (coverArt && coverArt.startsWith("blob:")) {
      const response = await fetch(coverArt);
      const blob = await response.blob();
      pictureData = await new Promise<any>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const arrayBuffer = reader.result as ArrayBuffer;
          const uint8 = new Uint8Array(arrayBuffer);
          resolve({
            format: blob.type || "image/jpeg",
            data: Array.from(uint8),
          });
        };
        reader.onerror = () => resolve(undefined);
        reader.readAsArrayBuffer(blob);
      });
    }

    const tagsPayload = buildTagsPayload(newTags, pictureData);

    const writeResult = await new Promise<boolean>((resolve) => {
      try {
        jsmediatagsRef.current.write(tagsPayload, {
          onSuccess: () => resolve(true),
          onError: () => resolve(false),
        }, cachedBlob);
      } catch {
        resolve(false);
      }
    });

    return writeResult;
  };

  const handleSave = async () => {
    if (!track) return;
    setSaving(true);

    try {
      if (isLocal) {
        await writeTagsToLocal(track, tags, coverFile);

        const updatedLibrary = localLibrary.map((t) => {
          if (t.id !== track.id) return t;
          const updated = { ...t };
          updated.title = tags.title;
          updated.artist = tags.artist;
          updated.album = tags.album;
          if (tags.genre) (updated as any).genre = tags.genre;
          if (coverArt && coverArt !== track.cover) {
            updated.cover = coverArt;
          }
          return updated;
        });
        localStorage.setItem("spotilark-local-library", JSON.stringify(updatedLibrary));

        toast({
          title: "Tags saved",
          description: "File tags updated successfully.",
        });
      } else if (isCloud) {
        const response = await fetch(`/api/rename-track/${track.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: tags.title,
            artist: tags.artist,
            album: tags.album,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update track.");
        }

        toast({
          title: "Tags saved",
          description: "Track metadata updated successfully.",
        });
      }
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error.message || "An error occurred while saving tags.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!track) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Tags
            {isLocal && <Badge variant="secondary" className="text-xs">Local</Badge>}
            {isCloud && <Badge variant="default" className="text-xs">Cloud</Badge>}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[60vh] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="flex gap-4">
                <div className="relative group">
                  <div className="w-28 h-28 rounded-lg overflow-hidden bg-muted border flex items-center justify-center">
                    {coverArt ? (
                      <Image
                        src={coverArt}
                        alt="Cover art"
                        width={112}
                        height={112}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <ImagePlus className="h-8 w-8 text-muted-foreground/40" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg cursor-pointer"
                  >
                    <span className="text-white text-xs font-medium">Change</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverChange}
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="tag-title" className="text-xs">Title</Label>
                    <Input
                      id="tag-title"
                      value={tags.title}
                      onChange={(e) => setTags({ ...tags, title: e.target.value })}
                      placeholder="Track title"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tag-artist" className="text-xs">Artist</Label>
                    <Input
                      id="tag-artist"
                      value={tags.artist}
                      onChange={(e) => setTags({ ...tags, artist: e.target.value })}
                      placeholder="Artist name"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tag-album" className="text-xs">Album</Label>
                <Input
                  id="tag-album"
                  value={tags.album}
                  onChange={(e) => setTags({ ...tags, album: e.target.value })}
                  placeholder="Album name"
                />
              </div>

              {isLocal && (
                <div className="space-y-1.5">
                  <Label htmlFor="tag-album-artist" className="text-xs">Album Artist</Label>
                  <Input
                    id="tag-album-artist"
                    value={tags.albumArtist}
                    onChange={(e) => setTags({ ...tags, albumArtist: e.target.value })}
                    placeholder="Album artist"
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tag-track" className="text-xs">Track #</Label>
                  <Input
                    id="tag-track"
                    type="number"
                    min="0"
                    value={tags.trackNumber}
                    onChange={(e) => setTags({ ...tags, trackNumber: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tag-year" className="text-xs">Year</Label>
                  <Input
                    id="tag-year"
                    type="number"
                    min="0"
                    value={tags.year}
                    onChange={(e) => setTags({ ...tags, year: e.target.value })}
                    placeholder="2024"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tag-genre" className="text-xs">Genre</Label>
                  <Input
                    id="tag-genre"
                    value={tags.genre}
                    onChange={(e) => setTags({ ...tags, genre: e.target.value })}
                    placeholder="Genre"
                  />
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-row justify-end gap-2 pt-2 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Tags
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
