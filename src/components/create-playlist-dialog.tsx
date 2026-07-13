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
import { Textarea } from '@/components/ui/textarea';
import { Plus, Image as ImageIcon, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export const CreatePlaylistDialog = ({ onPlaylistCreated }: { onPlaylistCreated?: () => void }) => {
  const [playlistName, setPlaylistName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('resource_type', 'image');

      const response = await fetch('/api/upload-track', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const result = await response.json();
      setCoverUrl(result.data.secure_url);
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!playlistName.trim()) return;

    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error('User not logged in');
        return;
      }

      const { data, error } = await supabase
        .from('playlists')
        .insert({
          name: playlistName.trim(),
          description: description.trim(),
          cover: coverUrl,
          user_id: user.id
        })
        .select();

      if (error) {
        console.error('Error creating playlist:', error);
      } else {
        console.log('Playlist created:', data);
        setPlaylistName('');
        setDescription('');
        setCoverUrl('');
        setIsOpen(false);
        router.refresh();
        if (onPlaylistCreated) {
          onPlaylistCreated();
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setIsSaving(false);
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
            Give your new playlist a name, description and cover image.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-32 h-32 rounded-md overflow-hidden bg-muted group">
              {coverUrl ? (
                <Image
                  src={coverUrl}
                  alt="Playlist Cover"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-12 w-12" />
                </div>
              )}
              <label
                htmlFor="playlist-cover"
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
              >
                {isUploading ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : (
                  <span className="text-white text-xs font-medium">Upload Cover</span>
                )}
              </label>
            </div>
            <input
              id="playlist-cover"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isUploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              placeholder="My Awesome Playlist"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about this playlist..."
              className="resize-none h-24"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving || isUploading || !playlistName.trim()}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Playlist'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
