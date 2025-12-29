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

interface TrackMetadata {
  title: string;
  artist: string;
  album: string;
  genre: string;
  duration: number;
}

export default function MusicUploadForm() {
  const { toast } = useToast();
  const [tracksMetadata, setTracksMetadata] = useState<Record<string, Partial<TrackMetadata>>>({});
  const [selectedAudioFiles, setSelectedAudioFiles] = useState<File[]>([]);
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, 'idle' | 'uploading' | 'success' | 'error'>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [cloudinaryUrls, setCloudinaryUrls] = useState<Record<string, { audio: string | null, cover: string | null }>>({});
  const [selectedCoverFiles, setSelectedCoverFiles] = useState<Record<string, File | null>>({});
  const [coverPreviewUrls, setCoverPreviewUrls] = useState<Record<string, string | null>>({});
  const [overallUploadStatus, setOverallUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
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
        setTracksMetadata(prev => ({ ...prev, [fileId]: { ...prev[fileId], duration: audio.duration } }));
        URL.revokeObjectURL(audio.src);

        if (jsmediatagsRef.current) {
          jsmediatagsRef.current.read(file, {
            onSuccess: (tag: any) => {
              metadata.title = tag.tags.title || metadata.title;
              metadata.artist = tag.tags.artist || metadata.artist;
              metadata.album = tag.tags.album || metadata.album;
              metadata.genre = tag.tags.genre || metadata.genre;

              setTracksMetadata(prev => ({
                ...prev, [fileId]: {
                  ...prev[fileId],
                  title: metadata.title,
                  artist: metadata.artist,
                  album: metadata.album,
                  genre: metadata.genre,
                }
              }));

              if (tag.tags.picture) {
                const { data, format } = tag.tags.picture;
                const byteArray = new Uint8Array(data);
                const blob = new Blob([byteArray], { type: format });
                const imageUrl = URL.createObjectURL(blob);

                setCoverPreviewUrls(prev => ({ ...prev, [fileId]: imageUrl }));
                const coverFile = new File([blob], `cover_${fileId}.${format.split('/')[1]}`, { type: format });
                setSelectedCoverFiles(prev => ({ ...prev, [fileId]: coverFile }));
                setIsExtractingMetadata(false);
                resolve({ metadata, coverFile });
              } else {
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
  }, []);

  const MAX_FILES_LIMIT = 200;

  const handleAudioFilesSelection = useCallback((files: FileList) => {
    const audioFiles = Array.from(files).filter(file => file.type.startsWith('audio/'));

    if (audioFiles.length > MAX_FILES_LIMIT) {
      toast({
        variant: "destructive",
        title: "Too Many Files",
        description: `Please upload a maximum of ${MAX_FILES_LIMIT} tracks at a time. (You selected: ${audioFiles.length})`,
      });
      return;
    }

    if (audioFiles.length > 0) {
      setSelectedAudioFiles(audioFiles);
      const initialStatuses: Record<string, 'idle' | 'uploading' | 'success' | 'error'> = {};
      const initialProgress: Record<string, number> = {};
      const initialUrls: Record<string, { audio: string | null, cover: string | null }> = {};
      const initialMetadata: Record<string, Partial<TrackMetadata>> = {};
      const initialCoverPreviews: Record<string, string | null> = {};
      const initialCoverFiles: Record<string, File | null> = {};

      audioFiles.forEach((file) => {
        const fileId = `${file.name}-${file.size}-${file.lastModified}`;
        initialStatuses[fileId] = 'idle';
        initialProgress[fileId] = 0;
        initialUrls[fileId] = { audio: null, cover: null };
        initialMetadata[fileId] = {};
        initialCoverPreviews[fileId] = null;
        initialCoverFiles[fileId] = null;
        // Optimization: Don't extract all at once to prevent freezing. 
        // We do it lazily during upload now.
      });

      setUploadStatuses(initialStatuses);
      setUploadProgress(initialProgress);
      setCloudinaryUrls(initialUrls);
      setTracksMetadata(initialMetadata);
      setCoverPreviewUrls(initialCoverPreviews);
      setSelectedCoverFiles(initialCoverFiles);
      setOverallUploadStatus('idle');
      setInvalidFiles([]);
    }
  }, []);

  const handleAudioFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleAudioFilesSelection(event.target.files);
    }
  };

  const handleCoverFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedAudioFiles.length > 0) {
      const firstFileId = `${selectedAudioFiles[0].name}-${selectedAudioFiles[0].size}-${selectedAudioFiles[0].lastModified}`;
      setSelectedCoverFiles(prev => ({ ...prev, [firstFileId]: file }));
      setCoverPreviewUrls(prev => ({ ...prev, [firstFileId]: URL.createObjectURL(file) }));
    }
  };

  const uploadFileToCloudinary = async (file: File, resourceType: 'video' | 'image') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('resource_type', resourceType);

    const response = await fetch('/api/upload-track', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed.');
    }

    const data = await response.json();
    return data.data.secure_url;
  };

  const uploadAudioToTelegram = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/storage/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Telegram upload failed.');
    }

    const data = await response.json();
    // Return the "Virtual URL" for streaming
    return `/api/storage/stream?file_id=${data.file_id}`;
  };

  const { refetchTracks } = usePlayer();

  const handleUpload = async () => {
    const validFiles = selectedAudioFiles.filter(file => !invalidFiles.includes(`${file.name}-${file.size}-${file.lastModified}`));

    if (validFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "No Valid Files",
        description: "No valid audio files to upload. The selected files may be corrupted.",
      });
      return;
    }

    if (invalidFiles.length > 0) {
      const invalidFileNames = invalidFiles.map(id => id.split('-').slice(0, -2).join('-'));
      toast({
        variant: "destructive",
        title: "Skipping Invalid Files",
        description: `The following files match known corruption patterns and will be skipped: ${invalidFileNames.slice(0, 3).join(', ')}${invalidFileNames.length > 3 ? ` and ${invalidFileNames.length - 3} others` : ''}.`,
      });
    }

    setOverallUploadStatus('uploading');

    // SAFE QUEUE: Upload in chunks of 3 to prevent crashes and rate limits
    const CHUNK_SIZE = 3;
    const processUpload = async (file: File) => {
      const fileId = `${file.name}-${file.size}-${file.lastModified}`;

      try {
        setUploadStatuses(prev => ({ ...prev, [fileId]: 'uploading' }));
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

        // Step 1: Extract Metadata (Lazy Load)
        let finalMetadata = tracksMetadata[fileId] || {};
        let currentCoverFile = selectedCoverFiles[fileId];

        if (!finalMetadata.title) {
          const result = await extractMetadataFromFile(file);
          finalMetadata = result.metadata;
          currentCoverFile = result.coverFile;
        }

        let uploadedAudioUrl: string | null = null;
        let uploadedCoverUrl: string | null = null;

        if (currentCoverFile) {
          setUploadProgress(prev => ({ ...prev, [fileId]: 20 }));
          uploadedCoverUrl = await uploadFileToCloudinary(currentCoverFile, 'image');
          setCloudinaryUrls(prev => ({ ...prev, [fileId]: { ...prev[fileId], cover: uploadedCoverUrl } }));
          setUploadProgress(prev => ({ ...prev, [fileId]: 40 }));
        }

        setUploadProgress(prev => ({ ...prev, [fileId]: 60 }));
        uploadedAudioUrl = await uploadAudioToTelegram(file);

        setCloudinaryUrls(prev => ({ ...prev, [fileId]: { ...prev[fileId], audio: uploadedAudioUrl } }));
        setUploadProgress(prev => ({ ...prev, [fileId]: 80 }));

        const saveResponse = await fetch('/api/save-track-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: finalMetadata.title || file.name.replace(/\.[^/.]+$/, ""),
            artist: finalMetadata.artist || 'Unknown Artist',
            album: finalMetadata.album || 'Unknown Album',
            genre: finalMetadata.genre || 'Unknown Genre',
            audioUrl: uploadedAudioUrl,
            cover: uploadedCoverUrl,
            duration: finalMetadata.duration || 0,
          }),
        });

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json();
          throw new Error(errorData.error || 'Failed to save track metadata to Supabase.');
        }

        setUploadStatuses(prev => ({ ...prev, [fileId]: 'success' }));
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
        return { success: true, fileId };
      } catch (error: any) {
        setUploadStatuses(prev => ({ ...prev, [fileId]: 'error' }));
        console.error(`Upload error for file ${file.name}:`, error);
        return { success: false, fileId };
      }
    };

    let totalSuccessful = 0;
    for (let i = 0; i < validFiles.length; i += CHUNK_SIZE) {
      const chunk = validFiles.slice(i, i + CHUNK_SIZE);
      console.log(`[UploadQueue] Processing chunk ${i / CHUNK_SIZE + 1} of ${Math.ceil(validFiles.length / CHUNK_SIZE)}`);

      const results = await Promise.all(chunk.map(file => processUpload(file)));
      totalSuccessful += results.filter(r => r.success).length;
    }

    if (totalSuccessful === validFiles.length) {
      setOverallUploadStatus('success');
      toast({
        title: "Upload Complete",
        description: "All tracks uploaded and metadata saved successfully!",
        duration: 3000,
      });
      // Refresh to update track list
      setTimeout(() => {
        refetchTracks();
        setOverallUploadStatus('idle');
        setSelectedAudioFiles([]);
      }, 1500);
    } else if (totalSuccessful > 0) {
      setOverallUploadStatus('error');
      toast({
        variant: "destructive",
        title: "Partial Success",
        description: `${totalSuccessful} out of ${validFiles.length} tracks were uploaded successfully. Check statuses below.`,
      });
    } else {
      setOverallUploadStatus('error');
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "All track uploads failed. Please check your connection and try again.",
      });
    }

    if (totalSuccessful > 0) {
      refetchTracks();
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
        <div className="space-y-2">
          <h3 className="font-medium">Selected Files:</h3>
          {selectedAudioFiles.map((file, index) => {
            const fileId = `${file.name}-${file.size}-${file.lastModified}`;
            return (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate max-w-xs">{file.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {uploadStatuses[fileId] && (
                    <span className={`text-xs px-2 py-1 rounded-full ${uploadStatuses[fileId] === 'success' ? 'bg-green-100 text-green-800' :
                      uploadStatuses[fileId] === 'error' ? 'bg-red-100 text-red-800' :
                        uploadStatuses[fileId] === 'uploading' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                      }`}>
                      {uploadStatuses[fileId]}
                    </span>
                  )}
                  {uploadStatuses[fileId] === 'uploading' && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(uploadProgress[fileId] || 0)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
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
            <Input id="title" value={tracksMetadata[Object.keys(tracksMetadata)[0]].title || ''} onChange={(e) => {
              const fileId = Object.keys(tracksMetadata)[0];
              setTracksMetadata(prev => ({ ...prev, [fileId]: { ...prev[fileId], title: e.target.value } }));
            }} placeholder="Song Title" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="artist">Artist</Label>
            <Input id="artist" value={tracksMetadata[Object.keys(tracksMetadata)[0]].artist || ''} onChange={(e) => {
              const fileId = Object.keys(tracksMetadata)[0];
              setTracksMetadata(prev => ({ ...prev, [fileId]: { ...prev[fileId], artist: e.target.value } }));
            }} placeholder="Artist Name" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="album">Album</Label>
            <Input id="album" value={tracksMetadata[Object.keys(tracksMetadata)[0]].album || ''} onChange={(e) => {
              const fileId = Object.keys(tracksMetadata)[0];
              setTracksMetadata(prev => ({ ...prev, [fileId]: { ...prev[fileId], album: e.target.value } }));
            }} placeholder="Album Name" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="genre">Genre</Label>
            <Input id="genre" value={tracksMetadata[Object.keys(tracksMetadata)[0]].genre || ''} onChange={(e) => {
              const fileId = Object.keys(tracksMetadata)[0];
              setTracksMetadata(prev => ({ ...prev, [fileId]: { ...prev[fileId], genre: e.target.value } }));
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

      <Button
        onClick={handleUpload}
        disabled={selectedAudioFiles.length === 0 || overallUploadStatus === 'uploading' || isExtractingMetadata}
      >
        {isExtractingMetadata ? 'Extracting metadata...' : overallUploadStatus === 'uploading' ? 'Uploading...' : `Upload ${selectedAudioFiles.length} Track(s)`}
      </Button>

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
            return uploadStatuses[fileId] === 'uploading';
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
