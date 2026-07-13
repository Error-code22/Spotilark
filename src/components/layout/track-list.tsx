"use client";

import Image from "next/image";
import { usePlayer } from "@/context/PlayerContext";
import { useSettings } from "@/context/SettingsContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";
import { Music2, Trash2, MoreVertical, Edit, FolderPlus, Share2, Play, Pause, Upload, PlusCircle, Cloud, Monitor, Globe, Youtube, List, LayoutGrid, LayoutList, ListChecks, X, Mic, Tag, Download } from "lucide-react";
import { TagEditor } from "@/components/TagEditor";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "../ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import type { Track } from "@/lib/data";

export const TrackList = ({ overrideTracks }: { overrideTracks?: Track[] } = {}) => {
  const { toast } = useToast();
  const { play, playTrack, trackQueue, currentTrackIndex, currentTrack, isPlaying, refetchTracks, togglePlayPause, unifiedLibrary, removeLocalTracks } = usePlayer();
  const router = useRouter();

  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [viewMode, setViewMode] = useState<'small' | 'medium' | 'large'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('spotilark-view-mode') as 'small' | 'medium' | 'large') || 'medium';
    }
    return 'medium';
  });
  const [groupBy, setGroupBy] = useState<'none' | 'album' | 'artist'>('none');
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [playlistSearch, setPlaylistSearch] = useState("");
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [playlistDialogStep, setPlaylistDialogStep] = useState<"select" | "create">("select");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [tagEditorTrack, setTagEditorTrack] = useState<Track | null>(null);
  const [contextMenu, setContextMenu] = useState<{ track: Track; x: number; y: number } | null>(null);

  useEffect(() => {
    localStorage.setItem('spotilark-view-mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    refetchTracks();
  }, [refetchTracks]);

  const handleLongPressStart = (trackId: string) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }

    const timer = setTimeout(() => {
      if (!isMultiSelectMode) {
        setIsMultiSelectMode(true);
        setSelectedTrackIds(new Set([trackId]));
      } else {
        setSelectedTrackIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(trackId)) {
            newSet.delete(trackId);
          } else {
            newSet.add(trackId);
          }
          return newSet;
        });
      }
    }, 500);

    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleSelectTrack = (trackId: string) => {
    if (isMultiSelectMode) {
      setSelectedTrackIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(trackId)) {
          newSet.delete(trackId);
        } else {
          newSet.add(trackId);
        }
        return newSet;
      });
    } else {
      const trackIndex = trackQueue.findIndex(track => track.id === trackId);
      if (trackIndex !== -1) {
        play(trackIndex);
      } else {
        const track = unifiedLibrary.find(t => t.id === trackId);
        if (track) playTrack(track);
      }
    }
  };

  const handleCancelSelection = () => {
    setSelectedTrackIds(new Set());
    setIsMultiSelectMode(false);
  };

  const filteredTracks = overrideTracks || unifiedLibrary;

  const groupedTracks = useMemo(() => {
    if (groupBy === 'none') return null;
    const groups = new Map<string, Track[]>();
    for (const track of filteredTracks) {
      const key = groupBy === 'album' ? (track.album || 'Unknown Album') : (track.artist || 'Unknown Artist');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(track);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredTracks, groupBy]);

  const allSelected = filteredTracks.length > 0 && filteredTracks.every(t => selectedTrackIds.has(t.id));

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedTrackIds(new Set());
    } else {
      setSelectedTrackIds(new Set(filteredTracks.map(t => t.id)));
    }
  };

  const handleDeleteConfirmed = async () => {
    if (selectedTrackIds.size === 0) return;

    try {
      const idsArray = Array.from(selectedTrackIds);

      // Separate local tracks from cloud tracks
      const localIds = idsArray.filter(id => {
        const track = unifiedLibrary.find(t => t.id === id);
        return track?.storage_type === 'local';
      });
      const cloudIds = idsArray.filter(id => !localIds.includes(id));

      // Delete local tracks from local storage
      if (localIds.length > 0) {
        await removeLocalTracks(localIds);
      }

      // Delete cloud tracks via API
      for (const trackId of cloudIds) {
        const response = await fetch(`/api/delete-track/${trackId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to delete track ${trackId}.`);
        }
      }

      toast({
        title: "Tracks deleted",
        description: `${idsArray.length} track(s) deleted successfully.`,
      });
      refetchTracks();
      handleCancelSelection();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error.message || 'An error occurred while deleting the tracks.',
      });
    }
    setShowDeleteDialog(false);
  };

  const handleRenameTrack = async () => {
    if (selectedTrackIds.size !== 1) {
      toast({
        variant: "destructive",
        title: "Select one track",
        description: "Please select only one track to rename.",
      });
      return;
    }

    const trackId = Array.from(selectedTrackIds)[0];
    const track = unifiedLibrary.find(t => t.id === trackId);
    if (!track) return;

    const newTitle = prompt('Enter new title:', track.title);
    if (newTitle === null) return;

    if (newTitle.trim() === '') {
      toast({
        variant: "destructive",
        title: "Invalid title",
        description: "Title cannot be empty.",
      });
      return;
    }

    try {
      const response = await fetch(`/api/rename-track/${trackId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTitle,
          artist: track.artist,
          album: track.album,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rename track.');
      }

      toast({
        title: "Track renamed",
        description: "The track has been renamed successfully.",
      });
      refetchTracks();
      handleCancelSelection();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Rename failed",
        description: error.message || 'An error occurred while renaming the track.',
      });
    }
  };

  const handleOpenPlaylistDialog = async () => {
    if (selectedTrackIds.size === 0) return;

    setLoadingPlaylists(true);
    setShowPlaylistDialog(true);
    setPlaylistDialogStep("select");
    setPlaylistSearch("");
    setNewPlaylistName("");

    try {
      const supabase = await import('@/lib/supabase/client').then(mod => mod.createClient());
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          variant: "destructive",
          title: "Login required",
          description: "You must be logged in to add tracks to a playlist.",
        });
        setShowPlaylistDialog(false);
        return;
      }

      const { data: playlists, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Error fetching playlists: " + error.message,
        });
        setShowPlaylistDialog(false);
        return;
      }

      setUserPlaylists(playlists || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      setShowPlaylistDialog(false);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (selectedTrackIds.size === 0) return;

    try {
      const response = await fetch('/api/add-to-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackIds: Array.from(selectedTrackIds),
          playlistId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add tracks to playlist.');
      }

      toast({
        title: "Added to Playlist",
        description: `${selectedTrackIds.size} track(s) added to playlist successfully!`,
      });
      setShowPlaylistDialog(false);
      handleCancelSelection();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: error.message || 'An error occurred while adding tracks to playlist.',
      });
    }
  };

  const handleCreateAndAddToPlaylist = async () => {
    if (selectedTrackIds.size === 0 || !newPlaylistName.trim()) return;

    try {
      const supabase = await import('@/lib/supabase/client').then(mod => mod.createClient());
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          variant: "destructive",
          title: "Login required",
          description: "You must be logged in.",
        });
        return;
      }

      const { data: newPlaylist, error: createError } = await supabase
        .from('playlists')
        .insert([{ name: newPlaylistName.trim(), user_id: user.id }])
        .select()
        .single();

      if (createError) {
        toast({
          variant: "destructive",
          title: "Creation Error",
          description: "Error creating playlist: " + createError.message,
        });
        return;
      }

      await handleAddToPlaylist(newPlaylist.id);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleShareTrack = async () => {
    if (selectedTrackIds.size === 0) return;

    const selectedTrackObjects = unifiedLibrary.filter(track => selectedTrackIds.has(track.id));

    if (navigator.share) {
      try {
        if (selectedTrackIds.size === 1) {
          const track = selectedTrackObjects[0];
          await navigator.share({
            title: `Check out this song: ${track.title}`,
            text: `I'm listening to "${track.title}" by ${track.artist} on Spotilark`,
            url: window.location.href,
          });
        } else {
          const trackList = selectedTrackObjects.map(track => `"${track.title}" by ${track.artist}`).join('\n');
          await navigator.share({
            title: `Check out these ${selectedTrackIds.size} songs`,
            text: `I'm sharing these tracks from Spotilark:\n\n${trackList}`,
            url: window.location.href,
          });
        }
      } catch (error) {
        console.log('Error sharing:', error);
        await copyTracksToClipboard(selectedTrackObjects);
      }
    } else {
      await copyTracksToClipboard(selectedTrackObjects);
    }
  };

  const copyTracksToClipboard = async (tracks: any[]) => {
    try {
      const trackList = tracks.map(track => `"${track.title}" by ${track.artist}`).join('\n');
      const shareText = `I'm sharing these tracks from Spotilark:\n\n${trackList}\n\nShared from: ${window.location.href}`;

      await navigator.clipboard.writeText(shareText);
      toast({
        title: "Copied to clipboard",
        description: "Track links copied to clipboard.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Failed to copy tracks to clipboard.",
      });
    }
  };

  const filteredPlaylists = userPlaylists.filter(p =>
    p.name.toLowerCase().includes(playlistSearch.toLowerCase())
  );

  const handleOpenTagEditor = (track: Track) => {
    setTagEditorTrack(track);
    setShowTagEditor(true);
    handleCancelSelection();
    setContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent, track: Track) => {
    e.preventDefault();
    const menuWidth = 180;
    const menuHeight = 120;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight);
    setContextMenu({ track, x: Math.max(0, x), y: Math.max(0, y) });
  };

  useEffect(() => {
    const close = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener("click", close);
      window.addEventListener("contextmenu", close);
      return () => {
        window.removeEventListener("click", close);
        window.removeEventListener("contextmenu", close);
      };
    }
  }, [contextMenu]);

  const exportM3U = (tracks: Track[], filename: string) => {
    let m3u = '#EXTM3U\n';
    for (const track of tracks) {
      const duration = Math.floor(track.duration || 0);
      const path = (track as any).sourcePath || track.source_url || track.title;
      m3u += `#EXTINF:${duration},${track.artist || 'Unknown'} - ${track.title}\n`;
      m3u += `${path}\n`;
    }
    const blob = new Blob([m3u], { type: 'audio/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.m3u`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:px-6 md:pt-2 pb-24">
        <div className="flex items-center justify-between mb-2 gap-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Music2 className="h-5 w-5" />
            Library
          </h2>
          {unifiedLibrary.length > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant={isMultiSelectMode ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  if (isMultiSelectMode) {
                    handleCancelSelection();
                  } else {
                    setIsMultiSelectMode(true);
                  }
                }}
                title={isMultiSelectMode ? "Exit select mode" : "Select tracks"}
              >
                <ListChecks className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'small' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('small')}
                title="Small view"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'medium' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('medium')}
                title="Medium view"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'large' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('large')}
                title="Large view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              {filteredTracks.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => exportM3U(filteredTracks, 'spotilark-library')}
                  title="Export as M3U"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              <div className="h-4 w-px bg-border mx-1" />
              <Button
                variant={groupBy === 'none' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setGroupBy('none')}
                title="All tracks"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={groupBy === 'album' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setGroupBy('album')}
                title="Group by album"
              >
                <Music2 className="h-4 w-4" />
              </Button>
              <Button
                variant={groupBy === 'artist' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setGroupBy('artist')}
                title="Group by artist"
              >
                <Mic className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {filteredTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 group hover:scale-110 transition-transform duration-500">
              <Music2 className="w-12 h-12 text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold mb-2 tracking-tight">Your library is empty</h2>
            <p className="text-muted-foreground mb-8 max-w-xs mx-auto text-[15px] leading-relaxed">
              Start building your collection by uploading your favorite tracks or importing them from YouTube.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              <Button
                onClick={() => router.push('/folders')}
                className="rounded-full gap-2 font-bold py-6 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95"
              >
                <Upload className="w-5 h-5" />
                Upload Music
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/search')}
                className="rounded-full gap-2 font-bold py-6 text-base hover:bg-muted/50 transition-all active:scale-95 border-2"
              >
                <PlusCircle className="w-5 h-5" />
                Search Global
              </Button>
            </div>
          </div>
        ) : viewMode === 'large' ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {filteredTracks.map((track) => {
              const index = trackQueue.findIndex(t => t.id === track.id);
              return (
                <div
                  key={track.id}
                  className={cn(
                    "group cursor-pointer rounded-2xl overflow-hidden bg-card border transition-all duration-200 active:scale-95",
                    currentTrackIndex === index && !isMultiSelectMode && "border-primary/50 ring-1 ring-primary/20",
                    selectedTrackIds.has(track.id) && "border-primary bg-primary/10"
                  )}
                  onClick={() => {
                    if (isMultiSelectMode) {
                      handleSelectTrack(track.id);
                    } else {
                      handleSelectTrack(track.id);
                    }
                  }}
                  onContextMenu={(e) => handleContextMenu(e, track)}
                >
                  <div className="relative aspect-square overflow-hidden">
                    <Image
                      src={track.cover || '/spotilark-without-text-white.png'}
                      alt={track.album || 'Album Cover'}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized
                    />
                    {currentTrackIndex === index && isPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
                        <div className="flex gap-[3px] items-center h-5">
                          <span className="w-[3px] h-full bg-white rounded-full animate-[wave_0.8s_ease-in-out_-0.4s_infinite_alternate]"></span>
                          <span className="w-[3px] h-2/3 bg-white rounded-full animate-[wave_0.8s_ease-in-out_-0.2s_infinite_alternate]"></span>
                          <span className="w-[3px] h-full bg-white rounded-full animate-[wave_0.8s_ease-in-out_0s_infinite_alternate]"></span>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      {currentTrackIndex === index && isPlaying ? (
                        <Pause className="w-8 h-8 text-white fill-white" />
                      ) : (
                        <Play className="w-8 h-8 text-white fill-white pl-0.5" />
                      )}
                    </div>
                    {isMultiSelectMode && (
                      <div className="absolute top-2 left-2">
                        <Checkbox
                          checked={selectedTrackIds.has(track.id)}
                          onCheckedChange={() => handleSelectTrack(track.id)}
                          className="bg-white/80"
                        />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className={cn(
                      "font-bold truncate text-xs",
                      currentTrackIndex === index && !isMultiSelectMode ? "text-primary" : "text-foreground"
                    )}>
                      {track.title}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                      {track.storage_type === 'local' && <Monitor className="h-3 w-3 text-amber-500 shrink-0" />}
                      {track.storage_type === 'cloud' && <Cloud className="h-3 w-3 text-blue-500 shrink-0" />}
                      {(track.storage_type === 'stream' || track.id?.startsWith('yt-')) && <Youtube className="h-3 w-3 text-red-500 shrink-0" />}
                      {track.artist}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : groupedTracks ? (
          <div className="space-y-6">
            {groupedTracks.map(([groupName, tracks]: [string, Track[]]) => (
              <div key={groupName}>
                <div className="flex items-center gap-2 mb-3">
                  {groupBy === 'album' ? <Music2 className="h-4 w-4 text-primary" /> : <Mic className="h-4 w-4 text-primary" />}
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">{groupName}</h3>
                  <span className="text-xs text-muted-foreground/50">({tracks.length})</span>
                </div>
                <div className="space-y-1">
                  {tracks.map((track: Track) => {
                    const index = trackQueue.findIndex(t => t.id === track.id);
                    return (
                      <div
                        key={track.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all hover:bg-primary/5 active:scale-[0.98]",
                          currentTrackIndex === index && "bg-primary/10"
                        )}
                        onClick={() => {
                          if (isMultiSelectMode) {
                            handleSelectTrack(track.id);
                          } else {
                            handleSelectTrack(track.id);
                          }
                        }}
                      >
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                          <Image src={track.cover || '/spotilark-without-text-white.png'} alt="" fill className="object-cover" unoptimized />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("font-medium text-sm truncate", currentTrackIndex === index && "text-primary")}>{track.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{track.duration ? formatTime(track.duration) : ''}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Table>
            {viewMode !== 'small' && (
              <TableHeader className="hidden md:table-header-group sticky top-0 bg-background z-10">
                <TableRow className="hover:bg-transparent border-b">
                  {isMultiSelectMode ? (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                  ) : (
                    <TableHead className="w-14"></TableHead>
                  )}
                  <TableHead className="font-semibold">Title</TableHead>
                  <TableHead className="font-semibold text-right w-32">Date Added</TableHead>
                  <TableHead className="font-semibold text-right w-20">Duration</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
            )}
            <TableBody>
              {filteredTracks.map((track) => {
                const index = trackQueue.findIndex(t => t.id === track.id);

  return (
                <TableRow
                  key={track.id}
                  className={cn(
                    currentTrackIndex === index && !isMultiSelectMode && "bg-primary/5 border-l-4 border-l-primary",
                    selectedTrackIds.has(track.id) && "bg-primary/20",
                    isMultiSelectMode && "cursor-pointer"
                  )}
                  onTouchStart={() => handleLongPressStart(track.id)}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={() => handleLongPressStart(track.id)}
                  onMouseUp={handleTouchEnd}
                  onMouseLeave={handleTouchEnd}
                  onContextMenu={(e) => handleContextMenu(e, track)}
                  onClick={() => {
                    if (isMultiSelectMode) {
                      handleSelectTrack(track.id);
                    }
                  }}
                >
                  <TableCell className={cn(viewMode === 'small' ? 'w-8 p-1.5' : 'w-12 p-2')}>
                    {isMultiSelectMode ? (
                      <Checkbox
                        checked={selectedTrackIds.has(track.id)}
                        onCheckedChange={() => handleSelectTrack(track.id)}
                      />
                    ) : viewMode === 'small' ? (
                      <div
                        className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentTrackIndex === index) {
                            togglePlayPause();
                          } else {
                            handleSelectTrack(track.id);
                          }
                        }}
                      >
                        {currentTrackIndex === index && isPlaying ? (
                          <Pause className="w-3.5 h-3.5 text-primary fill-primary" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-primary fill-primary pl-0.5" />
                        )}
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "relative w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center bg-card border flex-shrink-0 shadow-sm group",
                          currentTrackIndex === index && "border-primary/50"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentTrackIndex === index) {
                            togglePlayPause();
                          } else {
                            handleSelectTrack(track.id);
                          }
                        }}
                      >
                        <Image
                          src={track.cover || '/spotilark-without-text-white.png'}
                          alt={track.album || 'Album Cover'}
                          width={44}
                          height={44}
                          className={cn(
                            "rounded-xl w-full h-full object-cover transition-transform duration-500",
                            currentTrackIndex === index && isPlaying && "scale-110"
                          )}
                          unoptimized
                        />

                        {currentTrackIndex === index && isPlaying && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] transition-all duration-300">
                            <div className="flex gap-[3px] items-center justify-center h-4 w-6">
                              <span className="w-[3px] h-full bg-white rounded-full animate-[wave_0.8s_ease-in-out_-0.4s_infinite_alternate] shadow-sm"></span>
                              <span className="w-[3px] h-2/3 bg-white rounded-full animate-[wave_0.8s_ease-in-out_-0.2s_infinite_alternate] shadow-sm"></span>
                              <span className="w-[3px] h-full bg-white rounded-full animate-[wave_0.8s_ease-in-out_0s_infinite_alternate] shadow-sm"></span>
                            </div>
                          </div>
                        )}

                        <div className={cn(
                          "absolute inset-0 z-20 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                        )}>
                          {currentTrackIndex === index && isPlaying ? (
                            <Pause className="w-5 h-5 text-white fill-white" />
                          ) : (
                            <Play className="w-5 h-5 text-white fill-white pl-0.5" />
                          )}
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="cursor-pointer max-w-[200px] md:max-w-md p-2" onClick={() => !isMultiSelectMode && handleSelectTrack(track.id)}>
                    <div className={cn(
                      "font-bold truncate tracking-tight transition-colors duration-300 flex items-center gap-1.5",
                      viewMode === 'small' ? 'text-[13px]' : 'text-[15px]',
                      currentTrackIndex === index && !isMultiSelectMode ? "text-primary" : "text-foreground",
                      selectedTrackIds.has(track.id) && "text-primary"
                    )}>
                      {track.title}
                    </div>
                    <div className={cn(
                      "text-muted-foreground truncate font-medium flex items-center gap-1.5 opacity-70",
                      viewMode === 'small' ? 'text-[10px]' : 'text-[12px]',
                      selectedTrackIds.has(track.id) && "text-primary/70"
                    )}>
                      {track.storage_type === 'local' && <Monitor className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                      {track.storage_type === 'cloud' && <Cloud className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                      {(track.storage_type === 'stream' || track.id?.startsWith('yt-')) && <Youtube className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                      {track.artist} <span className="text-[10px] opacity-40">•</span> {track.album}
                    </div>
                  </TableCell>
                  {viewMode !== 'small' && (
                    <TableCell className="hidden md:table-cell text-right text-sm text-muted-foreground p-2 w-32">
                      {track.created_at ? new Date(track.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }) : 'Unknown'}
                    </TableCell>
                  )}
                  {viewMode !== 'small' && (
                    <TableCell className="hidden md:table-cell text-right text-sm text-muted-foreground p-2 w-20">
                      {track.duration ? formatTime(track.duration) : '--:--'}
                    </TableCell>
                  )}
                  <TableCell className="w-8 p-2"></TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {isMultiSelectMode && selectedTrackIds.size > 0 && (
        <div className="fixed bottom-[72px] md:bottom-[88px] left-0 right-0 z-50">
          <div className="bg-background/80 backdrop-blur-lg border-t border-border shadow-lg">
            <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground whitespace-nowrap">
                {selectedTrackIds.size} selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="gap-1.5"
                >
                  <ListChecks className="h-4 w-4" />
                  <span className="hidden sm:inline">{allSelected ? 'Deselect All' : 'Select All'}</span>
                </Button>
                {selectedTrackIds.size === 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const track = unifiedLibrary.find(t => t.id === Array.from(selectedTrackIds)[0]);
                      if (track) handleOpenTagEditor(track);
                    }}
                    className="gap-1.5"
                  >
                    <Tag className="h-4 w-4" />
                    <span className="hidden sm:inline">Edit Tags</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenPlaylistDialog}
                  className="gap-1.5"
                >
                  <FolderPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add to Playlist</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareTrack}
                  className="gap-1.5"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelSelection}
                  className="gap-1.5"
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Cancel</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedTrackIds.size} track(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected tracks will be permanently removed from your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirmed} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showPlaylistDialog} onOpenChange={setShowPlaylistDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {playlistDialogStep === "select" ? "Add to Playlist" : "Create New Playlist"}
            </DialogTitle>
            <DialogDescription>
              {playlistDialogStep === "select"
                ? `Select a playlist to add ${selectedTrackIds.size} track(s) to.`
                : "Enter a name for your new playlist."}
            </DialogDescription>
          </DialogHeader>

          {playlistDialogStep === "select" && (
            <>
              <input
                type="text"
                placeholder="Search playlists..."
                value={playlistSearch}
                onChange={(e) => setPlaylistSearch(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="max-h-60 overflow-y-auto space-y-1">
                {loadingPlaylists ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">Loading playlists...</div>
                ) : filteredPlaylists.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">No playlists found</div>
                ) : (
                  filteredPlaylists.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => handleAddToPlaylist(playlist.id)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
                    >
                      {playlist.name}
                    </button>
                  ))
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setPlaylistDialogStep("create")}
                className="w-full"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Create New Playlist
              </Button>
            </>
          )}

          {playlistDialogStep === "create" && (
            <>
              <input
                type="text"
                placeholder="Playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPlaylistName.trim()) {
                    handleCreateAndAddToPlaylist();
                  }
                }}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost" onClick={() => setPlaylistDialogStep("select")}>Back</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button onClick={handleCreateAndAddToPlaylist} disabled={!newPlaylistName.trim()}>Create & Add</Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {contextMenu && (
        <div
          className="fixed z-[60] min-w-[160px] bg-popover border border-border rounded-md shadow-lg p-1 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => handleOpenTagEditor(contextMenu.track)}
          >
            <Tag className="h-4 w-4" />
            Edit Tags
          </button>
          <button
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => {
              setContextMenu(null);
              setSelectedTrackIds(new Set([contextMenu.track.id]));
            }}
          >
            <ListChecks className="h-4 w-4" />
            Select
          </button>
        </div>
      )}

      <TagEditor
        open={showTagEditor}
        onOpenChange={setShowTagEditor}
        track={tagEditorTrack}
      />

      <style jsx>{`
        @keyframes wave {
          from {
            height: 0.25rem;
          }
          to {
            height: 100%;
          }
        }
      `}</style>
    </ScrollArea>
  );
};
