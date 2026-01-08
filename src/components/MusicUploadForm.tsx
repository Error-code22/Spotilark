'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';
import { usePlayer } from '@/context/PlayerContext';
import { Music } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useUpload } from '@/context/UploadContext';
import { cn } from '@/lib/utils';

interface TrackMetadata {
  title: string;
  artist: string;
  album: string;
  genre: string;
  duration: number;
}

export default function MusicUploadForm() {
  const { toast } = useToast();
  const {
    selectedAudioFiles, tracksMetadata, uploadStatuses, uploadProgress,
    overallUploadStatus, isExtractingMetadata: isExtractedMetaGlobal,
    addFiles, removeFile, updateMetadata, startUpload, clearUploads,
    coverPreviewUrls, selectedCoverFiles, setCoverPreview, setCoverFile
  } = useUpload();

  const [isDragging, setIsDragging] = useState(false);
  const [isExtractingMetadata, setIsExtractingMetadata] = useState(false);
  const [invalidFiles, setInvalidFiles] = useState<string[]>([]);
  const jsmediatagsRef = useRef<any>(null);

  useEffect(() => {
    import('jsmediatags').then(module => {
      jsmediatagsRef.current = module;
    }).catch(error => {
      console.error("Failed to load jsmediatags:", error);
    });
  }, []);

  const extractMetadataFromFile = useCallback((file: File): Promise<{ metadata: Partial<TrackMetadata>, coverFile: File | null }> => {
    setIsExtractingMetadata(true);
    const fileId = `${file.name}-${file.size}-${file.lastModified}`;

    return new Promise((resolve) => {
      let metadata: Partial<TrackMetadata> = {
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        genre: 'Unknown Genre',
        duration: 0
      };

      const audio = new Audio();
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        metadata.duration = audio.duration;
        updateMetadata(fileId, { ...metadata, duration: audio.duration });
        URL.revokeObjectURL(audio.src);

        if (jsmediatagsRef.current) {
          jsmediatagsRef.current.read(file, {
            onSuccess: (tag: any) => {
              metadata.title = tag.tags.title || metadata.title;
              metadata.artist = tag.tags.artist || metadata.artist;
              metadata.album = tag.tags.album || metadata.album;
              metadata.genre = tag.tags.genre || metadata.genre;

              console.log(`[Metadata] Extracted for ${file.name}:`, {
                title: metadata.title,
                artist: metadata.artist,
                album: metadata.album,
                hasPicture: !!tag.tags.picture
              });

              updateMetadata(fileId, {
                title: metadata.title,
                artist: metadata.artist,
                album: metadata.album,
                genre: metadata.genre,
                duration: metadata.duration
              });

              if (tag.tags.picture) {
                const { data, format } = tag.tags.picture;
                const byteArray = new Uint8Array(data);
                const blob = new Blob([byteArray], { type: format });
                const imageUrl = URL.createObjectURL(blob);

                console.log(`[Cover Art] Extracted for ${file.name}, format: ${format}, size: ${blob.size} bytes`);

                setCoverPreview(fileId, imageUrl);
                const coverFile = new File([blob], `cover_${fileId}.${format.split('/')[1]}`, { type: format });
                setCoverFile(fileId, coverFile);
                console.log(`[Cover Art] Cover file created and set for ${fileId}`);
                setIsExtractingMetadata(false);
                resolve({ metadata, coverFile });
              } else {
                console.log(`[Cover Art] No embedded cover art found for ${file.name}`);
                setIsExtractingMetadata(false);
                resolve({ metadata, coverFile: null });
              }
            },
            onError: (error: any) => {
              console.error('Error reading tags:', error);
              setIsExtractingMetadata(false);
              resolve({ metadata, coverFile: null });
            }
          });
        } else {
          setIsExtractingMetadata(false);
          resolve({ metadata, coverFile: null });
        }
      };
      audio.onerror = () => {
        setIsExtractingMetadata(false);
        resolve({ metadata, coverFile: null });
      };
      audio.src = URL.createObjectURL(file);
    });
  }, [updateMetadata, setCoverPreview, setCoverFile]);

  const handleAudioFilesSelection = useCallback(async (files: FileList) => {
    const audioFiles = Array.from(files).filter(file => file.type.startsWith('audio/'));
    if (audioFiles.length > 0) {
      addFiles(audioFiles);

      // Extract metadata from each file
      console.log(`[Upload] Starting metadata extraction for ${audioFiles.length} file(s)...`);
      for (const file of audioFiles) {
        try {
          await extractMetadataFromFile(file);
        } catch (error) {
          console.error(`[Upload] Failed to extract metadata for ${file.name}:`, error);
        }
      }
      console.log(`[Upload] Metadata extraction complete for all files`);

      setInvalidFiles([]);
    }
  }, [addFiles, extractMetadataFromFile]);

  const handleAudioFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleAudioFilesSelection(event.target.files);
    }
  };

  const handleCoverFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedAudioFiles.length > 0) {
      const firstFileId = `${selectedAudioFiles[0].name}-${selectedAudioFiles[0].size}-${selectedAudioFiles[0].lastModified}`;
      setCoverFile(firstFileId, file);
      setCoverPreview(firstFileId, URL.createObjectURL(file));
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files) {
      handleAudioFilesSelection(event.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h2 className="text-xl font-bold">Upload New Track(s)</h2>

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-primary bg-primary/10' : 'border-gray-300 dark:border-gray-700'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p className="text-muted-foreground">Drag & drop your audio file(s) here, or click to select.</p>
        <Input
          id="audio-file"
          type="file"
          accept="audio/*"
          onChange={handleAudioFileChange}
          className="mt-2 hidden"
          multiple
        />
        <Label htmlFor="audio-file" className="mt-2 inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer">
          Select Audio File(s)
        </Label>
      </div>

      {selectedAudioFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Queue</h3>
            {Object.values(uploadStatuses).includes('success') && overallUploadStatus !== 'uploading' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const successfulIds = Object.entries(uploadStatuses)
                    .filter(([_, status]) => status === 'success')
                    .map(([id]) => id);

                  successfulIds.forEach(id => removeFile(id));
                }}
                className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10"
              >
                Clear Successful
              </Button>
            )}
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
            {selectedAudioFiles.map((file, index) => {
              const fileId = `${file.name}-${file.size}-${file.lastModified}`;
              const status = uploadStatuses[fileId];

              const getStatusLabel = (s: string) => {
                switch (s) {
                  case 'preparing': return 'Checking Session...';
                  case 'uploading_cover': return 'Sending Artwork...';
                  case 'uploading_audio': return 'Syncing to Cloud...';
                  case 'finalizing': return 'Saving Record...';
                  case 'success': return 'Complete';
                  case 'error': return 'Failed';
                  case 'idle': return 'Pending';
                  default: return s;
                }
              };

              return (
                <div key={index} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-white/5 group hover:bg-primary/5 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "p-2 rounded-xl shrink-0",
                      status === 'success' ? "bg-green-500/10 text-green-500" :
                        status === 'error' ? "bg-red-500/10 text-red-500" :
                          status && status !== 'idle' ? "bg-primary/10 text-primary animate-pulse" :
                            "bg-muted text-muted-foreground"
                    )}>
                      <Music className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[13px] truncate">{file.name}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                        {getStatusLabel(status || 'idle')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {status && status !== 'idle' && status !== 'success' && status !== 'error' && (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-black text-primary">{Math.round(uploadProgress[fileId] || 0)}%</span>
                        <div className="w-12 h-1 bg-primary/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${uploadProgress[fileId] || 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {status === 'success' && <div className="p-1 rounded-full bg-green-500 text-white"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></div>}
                    {status === 'error' && <div className="p-1 rounded-full bg-red-500 text-white"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedAudioFiles.length > 1 ? (
        <div className="text-sm text-muted-foreground p-4 border rounded-lg">
          <p>You are uploading multiple files. The metadata (title, artist, etc.) will be extracted from each file individually.</p>
          <p>To edit metadata before uploading, please upload files one at a time.</p>
        </div>
      ) : selectedAudioFiles.length === 1 && tracksMetadata[Object.keys(tracksMetadata)[0]] && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={tracksMetadata[Object.keys(tracksMetadata)[0]]?.title || ''} onChange={(e) => {
              const fileId = `${selectedAudioFiles[0].name}-${selectedAudioFiles[0].size}-${selectedAudioFiles[0].lastModified}`;
              updateMetadata(fileId, { title: e.target.value });
            }} placeholder="Song Title" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="artist">Artist</Label>
            <Input id="artist" value={tracksMetadata[Object.keys(tracksMetadata)[0]]?.artist || ''} onChange={(e) => {
              const fileId = `${selectedAudioFiles[0].name}-${selectedAudioFiles[0].size}-${selectedAudioFiles[0].lastModified}`;
              updateMetadata(fileId, { artist: e.target.value });
            }} placeholder="Artist Name" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="album">Album</Label>
            <Input id="album" value={tracksMetadata[Object.keys(tracksMetadata)[0]]?.album || ''} onChange={(e) => {
              const fileId = `${selectedAudioFiles[0].name}-${selectedAudioFiles[0].size}-${selectedAudioFiles[0].lastModified}`;
              updateMetadata(fileId, { album: e.target.value });
            }} placeholder="Album Name" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="genre">Genre</Label>
            <Input id="genre" value={tracksMetadata[Object.keys(tracksMetadata)[0]]?.genre || ''} onChange={(e) => {
              const fileId = `${selectedAudioFiles[0].name}-${selectedAudioFiles[0].size}-${selectedAudioFiles[0].lastModified}`;
              updateMetadata(fileId, { genre: e.target.value });
            }} placeholder="e.g., Pop, Rock, Electronic" />
          </div>
          <div>
            <Label htmlFor="cover-file">Album Cover</Label>
            <Input
              id="cover-file"
              type="file"
              accept="image/*"
              onChange={handleCoverFileChange}
              className="mt-2"
            />
            {coverPreviewUrls[Object.keys(coverPreviewUrls)[0]] && (
              <div className="mt-4">
                <Image src={coverPreviewUrls[Object.keys(coverPreviewUrls)[0]] || ''} alt="Album Cover Preview" width={100} height={100} className="rounded-md" />
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex gap-2">
        <Button
          onClick={startUpload}
          disabled={selectedAudioFiles.length === 0 || overallUploadStatus === 'uploading' || isExtractingMetadata}
          className="flex-1"
        >
          {isExtractingMetadata ? 'Extracting metadata...' : overallUploadStatus === 'uploading' ? 'Uploading...' : `Upload ${selectedAudioFiles.length} Track(s)`}
        </Button>
        {selectedAudioFiles.length > 0 && overallUploadStatus !== 'uploading' && (
          <Button variant="outline" onClick={clearUploads}>
            Clear
          </Button>
        )}
      </div>

      {overallUploadStatus === 'uploading' && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-300"
              style={{
                width: `${selectedAudioFiles.length > 0 ?
                  (selectedAudioFiles.reduce((acc, file) => {
                    const fileId = `${file.name}-${file.size}-${file.lastModified}`;
                    return acc + (uploadProgress[fileId] || 0);
                  }, 0) / selectedAudioFiles.length) : 0}%`
              }}
            ></div>
          </div>
          <p className="text-sm text-muted-foreground">Uploading {selectedAudioFiles.filter(file => {
            const fileId = `${file.name}-${file.size}-${file.lastModified}`;
            const status = uploadStatuses[fileId];
            return status && status !== 'idle' && status !== 'success' && status !== 'error';
          }).length} of {selectedAudioFiles.length} files...</p>
        </div>
      )}

      {overallUploadStatus === 'success' && (
        <div className="text-sm text-green-500">
          All tracks uploaded successfully!
        </div>
      )}

      {overallUploadStatus === 'error' && (
        <div className="text-sm text-red-500">
          Some uploads failed. Check individual file statuses above.
        </div>
      )}
    </div>
  );
}
