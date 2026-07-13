'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { Music, ChevronDown, ChevronUp, X } from 'lucide-react';
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

const ACCEPTED_TYPES = '.mp3,.m4a,.flac,.wav,.ogg,.aac,.opus,audio/mpeg,audio/mp3,audio/x-m4a,audio/flac,audio/wav,audio/ogg,audio/aac,audio/opus';

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
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
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

                setCoverPreview(fileId, imageUrl);
                const coverFile = new File([blob], `cover_${fileId}.${format.split('/')[1]}`, { type: format });
                setCoverFile(fileId, coverFile);
                setIsExtractingMetadata(false);
                resolve({ metadata, coverFile });
              } else {
                setIsExtractingMetadata(false);
                resolve({ metadata, coverFile: null });
              }
            },
            onError: () => {
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

      for (const file of audioFiles) {
        try {
          await extractMetadataFromFile(file);
        } catch (error) {
          console.error(`Failed to extract metadata for ${file.name}:`, error);
        }
      }

      if (audioFiles.length === 1) {
        const fileId = `${audioFiles[0].name}-${audioFiles[0].size}-${audioFiles[0].lastModified}`;
        setExpandedFiles(new Set([fileId]));
      }
    }
  }, [addFiles, extractMetadataFromFile]);

  const handleAudioFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleAudioFilesSelection(event.target.files);
    }
  };

  const handleCoverFileChange = (fileId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCoverFile(fileId, file);
      setCoverPreview(fileId, URL.createObjectURL(file));
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

  const toggleExpanded = (fileId: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

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

  const activeFiles = selectedAudioFiles.filter(file => {
    const fileId = `${file.name}-${file.size}-${file.lastModified}`;
    const status = uploadStatuses[fileId];
    return status && status !== 'idle' && status !== 'success' && status !== 'error';
  });

  const completedCount = selectedAudioFiles.filter(file => {
    const fileId = `${file.name}-${file.size}-${file.lastModified}`;
    return uploadStatuses[fileId] === 'success';
  }).length;

  const failedCount = selectedAudioFiles.filter(file => {
    const fileId = `${file.name}-${file.size}-${file.lastModified}`;
    return uploadStatuses[fileId] === 'error';
  }).length;

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h2 className="text-xl font-bold">Upload New Track(s)</h2>

      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragging ? 'border-primary bg-primary/10' : 'border-gray-300 dark:border-gray-700 hover:border-primary/50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            "p-4 rounded-2xl transition-colors",
            isDragging ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <Music className="h-8 w-8" />
          </div>
          <div>
            <p className="font-semibold text-sm">
              {isDragging ? 'Drop your files here' : 'Drag & drop audio files here'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              MP3, M4A, FLAC, WAV, OGG, AAC, OPUS
            </p>
          </div>
          <Input
            id="audio-file"
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleAudioFileChange}
            className="hidden"
            multiple
          />
          <Label htmlFor="audio-file" className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer text-sm font-medium hover:bg-primary/90 transition-colors">
            Select Audio File(s)
          </Label>
        </div>
      </div>

      {selectedAudioFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Queue</h3>
              <span className="text-xs text-muted-foreground">
                {completedCount}/{selectedAudioFiles.length} completed
                {failedCount > 0 && <span className="text-red-500 ml-1">({failedCount} failed)</span>}
              </span>
            </div>
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
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Uploading {activeFiles.length} of {selectedAudioFiles.length} files...
              </p>
            </div>
          )}

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
            {selectedAudioFiles.map((file, index) => {
              const fileId = `${file.name}-${file.size}-${file.lastModified}`;
              const status = uploadStatuses[fileId];
              const isExpanded = expandedFiles.has(fileId);
              const metadata = tracksMetadata[fileId];
              const isUploading = overallUploadStatus === 'uploading';
              const isEditable = !isUploading || status === 'idle';

              return (
                <div key={index} className="rounded-2xl bg-muted/30 border border-white/5 group hover:bg-primary/5 transition-colors overflow-hidden">
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer"
                    onClick={() => isEditable && toggleExpanded(fileId)}
                  >
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
                        <p className="font-bold text-[13px] truncate">{metadata?.title || file.name}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                          {metadata?.artist && metadata.artist !== 'Unknown Artist' ? `${metadata.artist} · ` : ''}
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
                      {!isUploading && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(fileId); }}
                          className="p-1 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {isEditable && (
                        <div className="text-muted-foreground">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      )}
                    </div>
                  </div>

                  {isExpanded && isEditable && (
                    <div className="px-3 pb-3 pt-0 space-y-3 border-t border-white/5">
                      <div className="flex gap-3 mt-3">
                        {coverPreviewUrls[fileId] && (
                          <div className="shrink-0">
                            <Image
                              src={coverPreviewUrls[fileId] || ''}
                              alt="Cover"
                              width={80}
                              height={80}
                              className="rounded-xl object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 space-y-2">
                          <div className="grid gap-1.5">
                            <Label htmlFor={`title-${fileId}`} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Title</Label>
                            <Input
                              id={`title-${fileId}`}
                              value={metadata?.title || ''}
                              onChange={(e) => updateMetadata(fileId, { title: e.target.value })}
                              placeholder="Song Title"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor={`artist-${fileId}`} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Artist</Label>
                            <Input
                              id={`artist-${fileId}`}
                              value={metadata?.artist || ''}
                              onChange={(e) => updateMetadata(fileId, { artist: e.target.value })}
                              placeholder="Artist Name"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor={`album-${fileId}`} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Album</Label>
                            <Input
                              id={`album-${fileId}`}
                              value={metadata?.album || ''}
                              onChange={(e) => updateMetadata(fileId, { album: e.target.value })}
                              placeholder="Album Name"
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor={`cover-${fileId}`} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Album Cover</Label>
                        <Input
                          id={`cover-${fileId}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleCoverFileChange(fileId, e)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
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
