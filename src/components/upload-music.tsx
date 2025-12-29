'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloud, FileMusic, CheckCircle, XCircle, FolderOpen } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';

interface UploadedFile {
  name: string;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  publicUrl?: string;
  errorMessage?: string;
  artist?: string;
  album?: string;
}

export function UploadMusic() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [playlistName, setPlaylistName] = useState('');
  const { refetchTracks } = usePlayer();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, [supabase.auth]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const uploadFile = useCallback(async (file: File, albumName: string | null = null) => {
    if (!userId) {
      setUploadedFiles(prev =>
        prev.map(f =>
          f.name === file.name
            ? { ...f, status: 'error', errorMessage: 'User not logged in' }
            : f
        )
      );
      return;
    }

    // Attempt to extract artist and title from filename (e.g., "Artist - Title.mp3")
    const fileNameWithoutExt = file.name.split('.').slice(0, -1).join('.');
    const parts = fileNameWithoutExt.split(' - ');
    let title = fileNameWithoutExt;
    let artist = 'Unknown Artist';

    if (parts.length >= 2) {
      artist = parts[0];
      title = parts.slice(1).join(' - ');
    }

    try {
      // First, upload the file to Cloudinary using the upload-track API
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('resource_type', 'video'); // For audio files

      const uploadResponse = await fetch('/api/upload-track', {
        method: 'POST',
        body: uploadFormData,
      });

      const uploadResult = await uploadResponse.json();

      if (uploadResult.success && uploadResult.data) {
        // If upload to Cloudinary was successful, save track metadata to Supabase
        const metadataResponse = await fetch('/api/save-track-metadata', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: title,
            artist: artist,
            album: albumName || 'Unknown Album',
            genre: 'Unknown', // Could extract from file metadata, but for now using 'Unknown'
            audioUrl: uploadResult.data.secure_url, // URL from Cloudinary
            cover: null, // No cover image provided with the upload
            duration: 0, // Duration will be determined when the track is played
          }),
        });

        const metadataResult = await metadataResponse.json();

        if (metadataResult.success) {
          setUploadedFiles(prev =>
            prev.map(f =>
              f.name === file.name
                ? { ...f, status: 'success', publicUrl: uploadResult.data.secure_url, artist: artist, album: albumName || 'Unknown Album' }
                : f
            )
          );
          // Add a small delay before refetching to ensure database consistency
          setTimeout(() => {
            refetchTracks();
          }, 500);
        } else {
          // Log the specific error for debugging
          console.error("Metadata save error:", metadataResult.error);
          setUploadedFiles(prev =>
            prev.map(f =>
              f.name === file.name
                ? { ...f, status: 'error', errorMessage: `Failed to save track metadata: ${metadataResult.error || 'Unknown error'}` }
                : f
            )
          );
        }
      } else {
        setUploadedFiles(prev =>
          prev.map(f =>
            f.name === file.name
              ? { ...f, status: 'error', errorMessage: uploadResult.error || 'Upload failed' }
              : f
          )
        );
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadedFiles(prev =>
        prev.map(f =>
          f.name === file.name
            ? { ...f, status: 'error', errorMessage: `Upload failed: ${error.message || 'Network error'}` }
            : f
        )
      );
    }
  }, [userId]);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const newFiles: UploadedFile[] = files.map(file => ({
      name: file.name,
      status: 'uploading',
      progress: 0,
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);

    files.forEach(file => uploadFile(file));
  }, [uploadFile]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles: UploadedFile[] = files.map(file => ({
      name: file.name,
      status: 'uploading',
      progress: 0,
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);

    files.forEach(file => uploadFile(file));
  }, [uploadFile]);

  const handleFolderSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Determine album name from the first file's parent directory
    const firstFileRelativePath = files[0].webkitRelativePath || files[0].name;
    const albumName = firstFileRelativePath.split('/').length > 1 
      ? firstFileRelativePath.split('/')[firstFileRelativePath.split('/').length - 2] 
      : null; // If only file name, no album name from path

    const newFiles: UploadedFile[] = files.map(file => ({
      name: file.name,
      status: 'uploading',
      progress: 0,
      album: albumName || 'Unknown Album',
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);

    files.forEach(file => uploadFile(file, albumName));
  }, [uploadFile]);

  return (
    <div className="p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Music Files</CardTitle>
          <CardDescription>Drag and drop your audio files here, or click to select them.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            id="dropzone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('fileInput')?.click()}
            className={`flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors
              ${isDragOver ? 'border-primary bg-accent' : 'border-gray-300 dark:border-gray-700'}`}
          >
            <UploadCloud className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold text-muted-foreground">Drag & Drop or Click to Browse</p>
            <input
              id="fileInput"
              type="file"
              multiple
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          <div className="mt-4 text-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('folderInput')?.click()}
            >
              <FolderOpen className="h-5 w-5 mr-2" /> Select Folder
            </Button>
            <input
              id="folderInput"
              type="file"
              // @ts-ignore
              webkitdirectory="true"
              mozdirectory="true"
              onChange={handleFolderSelect}
              className="hidden"
            />
          </div>
          <div className="mt-4">
            <Label htmlFor="playlistName">Playlist Name (optional, for folder uploads)</Label>
            <Input
              id="playlistName"
              type="text"
              placeholder="e.g., My Awesome Playlist"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {uploadedFiles.map((file, index) => (
                <li key={index} className="flex items-center gap-3">
                  {file.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {file.status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                  {file.status === 'uploading' && <FileMusic className="h-5 w-5 text-blue-500 animate-pulse" />}
                  <div className="flex-1">
                    <p className="font-medium">{file.name}</p>
                    {file.artist && <p className="text-sm text-muted-foreground">{file.artist}</p>}
                    {file.album && <p className="text-sm text-muted-foreground">{file.album}</p>}
                    {file.status === 'uploading' && (
                      <Progress value={file.progress} className="w-full h-2 mt-1" />
                    )}
                    {file.status === 'error' && (
                      <p className="text-red-500 text-sm">Error: {file.errorMessage || 'Unknown error'}</p>
                    )}
                    {file.status === 'success' && file.publicUrl && (
                      <audio controls src={file.publicUrl} className="w-full mt-2"></audio>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
