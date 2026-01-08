'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export const CreatePlaylistDialog = ({ onPlaylistCreated }: { onPlaylistCreated?: () => void }) => {
  const [playlistName, setPlaylistName] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!playlistName.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('User not logged in');
      return;
    }

    const { data, error } = await supabase
      .from('playlists')
      .insert({ name: playlistName.trim(), user_id: user.id })
      .select();

    if (error) {
      console.error('Error creating playlist:', error);
    } else {
      console.log('Playlist created:', data);
      setPlaylistName('');
      setIsOpen(false);
      router.refresh();
      if (onPlaylistCreated) {
        onPlaylistCreated();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-full flex flex-col justify-center items-center border-2 border-dashed">
          <Plus className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-muted-foreground">Add New Playlist</p>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Playlist</DialogTitle>
          <DialogDescription>
            Give your new playlist a name. You can add an image later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit}>Create Playlist</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
