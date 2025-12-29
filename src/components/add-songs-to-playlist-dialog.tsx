'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

interface AddSongsToPlaylistDialogProps {
  playlistId: string;
  existingSongIds: string[];
}

export const AddSongsToPlaylistDialog = ({ playlistId, existingSongIds }: AddSongsToPlaylistDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [allSongs, setAllSongs] = useState<any[]>([]);
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>(existingSongIds);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      const fetchAllSongs = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('tracks')
          .select('id, title, artist')
          .eq('user_id', user.id)
          .order('title', { ascending: true });

        if (error) {
          console.error('Error fetching all songs:', error);
        } else {
          setAllSongs(data || []);
        }
      };
      fetchAllSongs();
    }
  }, [isOpen, supabase]);

  const handleCheckboxChange = (songId: string, isChecked: boolean) => {
    setSelectedSongIds((prev) =>
      isChecked ? [...prev, songId] : prev.filter((id) => id !== songId)
    );
  };

  const handleSave = async () => {
    try {
      // First, remove existing songs from the playlist
      if (existingSongIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('playlist_songs')
          .delete()
          .eq('playlist_id', playlistId);

        if (deleteError) {
          console.error('Error removing existing playlist songs:', deleteError);
          return;
        }
      }

      // Then add the selected songs to the playlist
      if (selectedSongIds.length > 0) {
        const playlistSongsToInsert = selectedSongIds.map((trackId) => ({
          playlist_id: playlistId,
          track_id: trackId
        }));

        const { error: insertError } = await supabase
          .from('playlist_songs')
          .insert(playlistSongsToInsert);

        if (insertError) {
          console.error('Error adding songs to playlist:', insertError);
          return;
        }
      }

      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating playlist:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Plus className="mr-2 h-4 w-4" /> Add Songs
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Songs to Playlist</DialogTitle>
          <DialogDescription>
            Select songs from your library to add to this playlist.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <ScrollArea className="h-[300px] w-full rounded-md border p-4">
            {allSongs.length > 0 ? (
              allSongs.map((song) => (
                <div key={song.id} className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id={song.id}
                    checked={selectedSongIds.includes(song.id)}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange(song.id, checked as boolean)
                    }
                  />
                  <Label htmlFor={song.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {song.title} - {song.artist}
                  </Label>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No songs found in your library.</p>
            )}
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
