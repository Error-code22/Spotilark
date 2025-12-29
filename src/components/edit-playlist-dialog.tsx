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
import { Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface EditPlaylistDialogProps {
  playlist: {
    id: string;
    name: string;
    description?: string;
    cover?: string;
  };
}

export const EditPlaylistDialog = ({ playlist }: EditPlaylistDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState(playlist.name);
  const [newPlaylistCover, setNewPlaylistCover] = useState(playlist.cover || '');
  const [file, setFile] = useState<File | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setNewPlaylistCover(URL.createObjectURL(e.target.files[0])); // Show preview
    }
  };

  const handleSave = async () => {
    if (!newPlaylistName.trim()) return;

    let coverUrl = newPlaylistCover;

    if (file) {
      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'spotilark_unsigned'); // Replace with your Cloudinary upload preset

      const response = await fetch('https://api.cloudinary.com/v1_1/dbqicdela/image/upload', { // Replace YOUR_CLOUD_NAME
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.secure_url) {
        coverUrl = data.secure_url;
      } else {
        console.error('Cloudinary upload failed:', data);
        return;
      }
    }

    const { error } = await supabase
      .from('playlists')
      .update({ name: newPlaylistName.trim(), cover: coverUrl })
      .eq('id', playlist.id);

    if (error) {
      console.error('Error updating playlist:', error);
    } else {
      setIsOpen(false);
      router.refresh();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Playlist</DialogTitle>
          <DialogDescription>
            Make changes to your playlist here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cover" className="text-right">
              Cover Image
            </Label>
            <Input
              id="cover"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="col-span-3"
            />
          </div>
          {newPlaylistCover && (
            <div className="col-span-full flex justify-center">
              <Image src={newPlaylistCover} alt="Playlist Cover Preview" width={150} height={150} className="rounded-md" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
