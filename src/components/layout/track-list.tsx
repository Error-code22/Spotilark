"use client";

import Image from "next/image";
import { usePlayer } from "@/context/PlayerContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";
import { Music2, Trash2, MoreVertical, Edit, FolderPlus, Share2, Play, Pause, Upload, PlusCircle, Cloud, Monitor, Globe } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";

export const TrackList = () => {
  const { toast } = useToast();
  const { play, trackQueue, currentTrackIndex, isPlaying, refetchTracks, togglePlayPause } = usePlayer();
  const router = useRouter();

  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);

  useEffect(() => {
    // Refresh tracks when the TrackList component mounts (i.e., when navigating to home page)
    refetchTracks();
  }, [refetchTracks]);

  // Handle long press for selection
  const handleLongPressStart = (trackId: string) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }

    const timer = setTimeout(() => {
      // If not already in selection mode, enter it and select this track
      if (!isSelectionMode) {
        setIsSelectionMode(true);
        setSelectedTracks(new Set([trackId]));
        setShowSelectionToolbar(true);
      } else {
        // If already in selection mode, toggle this track
        setSelectedTracks(prev => {
          const newSet = new Set(prev);
          if (newSet.has(trackId)) {
            newSet.delete(trackId);
          } else {
            newSet.add(trackId);
          }
          return newSet;
        });
      }
    }, 500); // 500ms for long press

    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleSelectTrack = (trackId: string) => {
    if (isSelectionMode) {
      // Toggle selection when clicking in selection mode
      setSelectedTracks(prev => {
        const newSet = new Set(prev);
        if (newSet.has(trackId)) {
          newSet.delete(trackId);
        } else {
          newSet.add(trackId);
        }
        return newSet;
      });
    } else {
      // If not in selection mode, start playing the track
      const trackIndex = trackQueue.findIndex(track => track.id === trackId);
      if (trackIndex !== -1) {
        play(trackIndex);
      }
    }
  };

  const handleCancelSelection = () => {
    setSelectedTracks(new Set());
    setIsSelectionMode(false);
    setShowSelectionToolbar(false);
  };

  const handleDeleteSelected = async () => {
    if (selectedTracks.size === 0) return;

    if (window.confirm(`Are you sure you want to delete ${selectedTracks.size} track(s)?`)) {
      try {
        for (const trackId of selectedTracks) {
          const response = await fetch(`/api/delete-track/${trackId}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to delete track ${trackId}.`);
          }
        }

        alert(`${selectedTracks.size} track(s) deleted successfully!`);
        refetchTracks();
        handleCancelSelection();
      } catch (error: any) {
        alert(error.message || 'An error occurred while deleting the tracks.');
      }
    }
  };

  const handleRenameTrack = async () => {
    if (selectedTracks.size !== 1) {
      alert('Please select only one track to rename');
      return;
    }

    const trackId = Array.from(selectedTracks)[0];
    const track = trackQueue.find(t => t.id === trackId);
    if (!track) return;

    const newTitle = prompt('Enter new title:', track.title);
    if (newTitle === null) return; // User cancelled

    if (newTitle.trim() === '') {
      alert('Title cannot be empty');
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
      refetchTracks(); // Refresh the track list
      handleCancelSelection();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Rename failed",
        description: error.message || 'An error occurred while renaming the track.',
      });
    }
  };

  const handleAddToPlaylist = async () => {
    if (selectedTracks.size === 0) return;

    // Fetch user's playlists
    const supabase = await import('@/lib/supabase/client').then(mod => mod.createClient());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        variant: "destructive",
        title: "Login required",
        description: "You must be logged in to add tracks to a playlist",
      });
      return;
    }

    const { data: playlists, error: playlistsError } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (playlistsError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error fetching playlists: " + playlistsError.message,
      });
      return;
    }

    // Create a simple prompt for playlist selection
    let playlistOptions = 'Select a playlist:\n\n';
    playlists?.forEach((playlist, index) => {
      playlistOptions += `${index + 1}. ${playlist.name}\n`;
    });
    playlistOptions += `\n${playlists?.length + 1}. Create New Playlist\n\nEnter the number of your choice:`;

    const choice = prompt(playlistOptions);
    if (choice === null) return; // User cancelled

    let playlistId: string | null = null;
    const choiceNum = parseInt(choice);

    if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > (playlists?.length || 0) + 1) {
      toast({
        variant: "destructive",
        title: "Invalid Selection",
        description: "Please enter a valid number from the list.",
      });
      return;
    }

    if (choiceNum <= (playlists?.length || 0)) {
      // User selected an existing playlist
      playlistId = playlists![choiceNum - 1].id;
    } else {
      // User wants to create a new playlist
      const newPlaylistName = prompt('Enter new playlist name:');
      if (!newPlaylistName || newPlaylistName.trim() === '') {
        toast({
          variant: "destructive",
          title: "Invalid Name",
          description: "Playlist name cannot be empty.",
        });
        return;
      }

      // Create the new playlist
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

      playlistId = newPlaylist.id;
    }

    // Add selected tracks to the chosen playlist
    try {
      const response = await fetch('/api/add-to-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackIds: Array.from(selectedTracks),
          playlistId: playlistId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add tracks to playlist.');
      }

      toast({
        title: "Added to Playlist",
        description: `${selectedTracks.size} track(s) added to playlist successfully!`,
      });
      handleCancelSelection();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: error.message || 'An error occurred while adding tracks to playlist.',
      });
    }
  };

  const handleShareTrack = async () => {
    if (selectedTracks.size === 0) return;

    // Get the selected tracks
    const selectedTrackObjects = trackQueue.filter(track => selectedTracks.has(track.id));

    if (navigator.share) {
      // Use Web Share API if available
      try {
        if (selectedTracks.size === 1) {
          // Share a single track
          const track = selectedTrackObjects[0];
          await navigator.share({
            title: `Check out this song: ${track.title}`,
            text: `I'm listening to "${track.title}" by ${track.artist} on Spotilark`,
            url: window.location.href,
          });
        } else {
          // Share multiple tracks
          const trackList = selectedTrackObjects.map(track => `"${track.title}" by ${track.artist}`).join('\n');
          await navigator.share({
            title: `Check out these ${selectedTracks.size} songs`,
            text: `I'm sharing these tracks from Spotilark:\n\n${trackList}`,
            url: window.location.href,
          });
        }
      } catch (error) {
        // User cancelled the share or an error occurred
        console.log('Error sharing:', error);
        // Fallback to copying to clipboard
        await copyTracksToClipboard(selectedTrackObjects);
      }
    } else {
      // Fallback to copying to clipboard
      await copyTracksToClipboard(selectedTrackObjects);
    }
  };

  const copyTracksToClipboard = async (tracks: any[]) => {
    try {
      const trackList = tracks.map(track => `"${track.title}" by ${track.artist}`).join('\n');
      const shareText = `I'm sharing these tracks from Spotilark:\n\n${trackList}\n\nShared from: ${window.location.href}`;

      await navigator.clipboard.writeText(shareText);
      alert('Tracks copied to clipboard! You can now share them.');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy tracks to clipboard. Please try again.');
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6">
        {/* Selection toolbar - shown when tracks are selected */}
        {showSelectionToolbar && (
          <div className="fixed top-0 left-0 right-0 bg-primary text-primary-foreground p-4 z-50 flex items-center justify-between shadow-lg">
            <span className="font-medium">{selectedTracks.size} selected</span>
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                size="icon"
                onClick={handleDeleteSelected}
                title="Delete selected tracks"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleRenameTrack}
                title="Rename selected tracks"
                disabled={selectedTracks.size !== 1} // Only allow rename for single track
              >
                <Edit className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleAddToPlaylist}
                title="Add to playlist"
              >
                <FolderPlus className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleShareTrack}
                title="Share selected tracks"
              >
                <Share2 className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleCancelSelection}
                title="Cancel selection"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        <div className="border-b border-border mb-4 md:hidden"></div>

        {trackQueue.length === 0 ? (
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
        ) : (
          <Table>
            <TableHeader className="hidden md:table-header-group sticky top-0 bg-background z-10">
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="w-12"></TableHead>
                <TableHead className="font-semibold">Title</TableHead>
                <TableHead className="font-semibold text-right w-32">Date Added</TableHead>
                <TableHead className="font-semibold text-right w-20">Duration</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trackQueue.map((track, index) => (
                <TableRow
                  key={track.id}
                  className={cn(
                    currentTrackIndex === index && !isSelectionMode && "bg-primary/5 border-l-4 border-l-primary",
                    selectedTracks.has(track.id) && "bg-primary/20",
                    isSelectionMode && "cursor-pointer"
                  )}
                  onTouchStart={() => handleLongPressStart(track.id)}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={() => handleLongPressStart(track.id)}
                  onMouseUp={handleTouchEnd}
                  onMouseLeave={handleTouchEnd}
                  onClick={() => {
                    if (isSelectionMode) {
                      handleSelectTrack(track.id);
                    }
                  }}
                >
                  <TableCell className="cursor-pointer w-12 p-2">
                    <div
                      className={cn(
                        "relative w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center bg-card border flex-shrink-0 shadow-sm group",
                        currentTrackIndex === index && !isSelectionMode && "border-primary/50",
                        selectedTracks.has(track.id) && "border-primary"
                      )}
                      onClick={(e) => {
                        if (!isSelectionMode) {
                          e.stopPropagation();
                          // If clicking the current track, toggle play/pause
                          if (currentTrackIndex === index) {
                            togglePlayPause();
                          } else {
                            // Otherwise play the new track
                            handleSelectTrack(track.id);
                          }
                        }
                      }}
                    >
                      {selectedTracks.has(track.id) ? (
                        <div className="absolute inset-0 z-10 bg-primary/40 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                            <span className="text-primary-foreground text-xs font-bold">
                              {Array.from(selectedTracks).indexOf(track.id) + 1}
                            </span>
                          </div>
                        </div>
                      ) : null}

                      <Image
                        src={track.cover || '/SL.png'}
                        alt={track.album || 'Album Cover'}
                        width={44}
                        height={44}
                        className={cn(
                          "rounded-xl w-full h-full object-cover transition-transform duration-500",
                          currentTrackIndex === index && isPlaying && "scale-110"
                        )}
                        unoptimized
                      />

                      {currentTrackIndex === index && isPlaying && !isSelectionMode && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] transition-all duration-300">
                          <div className="flex gap-[3px] items-center justify-center h-4 w-6">
                            <span className="w-[3px] h-full bg-white rounded-full animate-[wave_0.8s_ease-in-out_-0.4s_infinite_alternate] shadow-sm"></span>
                            <span className="w-[3px] h-2/3 bg-white rounded-full animate-[wave_0.8s_ease-in-out_-0.2s_infinite_alternate] shadow-sm"></span>
                            <span className="w-[3px] h-full bg-white rounded-full animate-[wave_0.8s_ease-in-out_0s_infinite_alternate] shadow-sm"></span>
                          </div>
                        </div>
                      )}

                      {/* Hover Play/Pause Overlay */}
                      {!isSelectionMode && (
                        <div className={cn(
                          "absolute inset-0 z-20 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                          // Make sure it's visible if we are hovering
                        )}>
                          {currentTrackIndex === index && isPlaying ? (
                            <Pause className="w-5 h-5 text-white fill-white" />
                          ) : (
                            <Play className="w-5 h-5 text-white fill-white pl-0.5" />
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="cursor-pointer max-w-[200px] md:max-w-md p-2">
                    <div className={cn(
                      "font-bold truncate text-[15px] tracking-tight transition-colors duration-300",
                      currentTrackIndex === index && !isSelectionMode ? "text-primary" : "text-foreground",
                      selectedTracks.has(track.id) && "text-primary"
                    )}>
                      {track.title}
                    </div>
                    <div className={cn(
                      "text-[12px] text-muted-foreground truncate font-medium flex items-center gap-1.5 opacity-70",
                      selectedTracks.has(track.id) && "text-primary/70"
                    )}>
                      {track.storage_type === 'cloud' && <Cloud className="h-3.5 w-3.5 text-primary animate-pulse-slow" />}
                      {track.storage_type === 'local' && <Monitor className="h-3.5 w-3.5 text-amber-500" />}
                      {track.storage_type === 'stream' && <Globe className="h-3.5 w-3.5 text-blue-400" />}
                      {track.artist} <span className="text-[10px] opacity-40">•</span> {track.album}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right text-sm text-muted-foreground p-2 w-32">
                    {track.created_at ? new Date(track.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : 'Unknown'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right text-sm text-muted-foreground p-2 w-20">
                    {track.duration ? formatTime(track.duration) : '--:--'}
                  </TableCell>
                  <TableCell className="w-8 p-2">
                    {isSelectionMode && selectedTracks.has(track.id) && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
                        <span className="text-primary-foreground text-xs font-bold">
                          {Array.from(selectedTracks).indexOf(track.id) + 1}
                        </span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
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