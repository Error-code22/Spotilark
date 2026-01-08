"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { usePlayer } from './PlayerContext';
import { createClient } from '@/lib/supabase/client';

interface TrackMetadata {
    title: string;
    artist: string;
    album: string;
    genre: string;
    duration: number;
}

interface UploadContextType {
    selectedAudioFiles: File[];
    tracksMetadata: Record<string, Partial<TrackMetadata>>;
    uploadStatuses: Record<string, 'idle' | 'preparing' | 'uploading_cover' | 'uploading_audio' | 'finalizing' | 'success' | 'error'>;
    uploadProgress: Record<string, number>;
    overallUploadStatus: 'idle' | 'uploading' | 'success' | 'error';
    isExtractingMetadata: boolean;
    addFiles: (files: File[]) => void;
    removeFile: (fileId: string) => void;
    updateMetadata: (fileId: string, metadata: Partial<TrackMetadata>) => void;
    startUpload: () => Promise<void>;
    clearUploads: () => void;
    setCoverPreview: (fileId: string, url: string) => void;
    setCoverFile: (fileId: string, file: File) => void;
    coverPreviewUrls: Record<string, string | null>;
    selectedCoverFiles: Record<string, File | null>;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const UploadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { toast } = useToast();
    const { refetchTracks } = usePlayer();

    const [selectedAudioFiles, setSelectedAudioFiles] = useState<File[]>([]);
    const [tracksMetadata, setTracksMetadata] = useState<Record<string, Partial<TrackMetadata>>>({});
    const [uploadStatuses, setUploadStatuses] = useState<Record<string, 'idle' | 'preparing' | 'uploading_cover' | 'uploading_audio' | 'finalizing' | 'success' | 'error'>>({});
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [overallUploadStatus, setOverallUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [isExtractingMetadata, setIsExtractingMetadata] = useState(false);
    const [coverPreviewUrls, setCoverPreviewUrls] = useState<Record<string, string | null>>({});
    const [selectedCoverFiles, setSelectedCoverFiles] = useState<Record<string, File | null>>({});

    const addFiles = useCallback((files: File[]) => {
        const newFiles = [...selectedAudioFiles, ...files];
        if (newFiles.length > 200) {
            toast({
                variant: "destructive",
                title: "Too Many Files",
                description: "Maximum 200 files allowed at once.",
            });
            return;
        }

        setSelectedAudioFiles(newFiles);

        setUploadStatuses(prev => {
            const next = { ...prev };
            files.forEach(file => {
                const fileId = `${file.name}-${file.size}-${file.lastModified}`;
                if (!next[fileId]) next[fileId] = 'idle';
            });
            return next;
        });

        setUploadProgress(prev => {
            const next = { ...prev };
            files.forEach(file => {
                const fileId = `${file.name}-${file.size}-${file.lastModified}`;
                if (next[fileId] === undefined) next[fileId] = 0;
            });
            return next;
        });

        setTracksMetadata(prev => {
            const next = { ...prev };
            files.forEach(file => {
                const fileId = `${file.name}-${file.size}-${file.lastModified}`;
                if (!next[fileId]) next[fileId] = { title: file.name.replace(/\.[^/.]+$/, "") };
            });
            return next;
        });
    }, [selectedAudioFiles, toast]);

    const removeFile = useCallback((fileId: string) => {
        setSelectedAudioFiles(prev => prev.filter(f => `${f.name}-${f.size}-${f.lastModified}` !== fileId));
    }, []);

    const updateMetadata = useCallback((fileId: string, metadata: Partial<TrackMetadata>) => {
        setTracksMetadata(prev => ({
            ...prev,
            [fileId]: { ...prev[fileId], ...metadata }
        }));
    }, []);

    const setCoverPreview = useCallback((fileId: string, url: string) => {
        setCoverPreviewUrls(prev => ({ ...prev, [fileId]: url }));
    }, []);

    const setCoverFile = useCallback((fileId: string, file: File) => {
        setSelectedCoverFiles(prev => ({ ...prev, [fileId]: file }));
    }, []);

    const clearUploads = useCallback(() => {
        setSelectedAudioFiles([]);
        setUploadStatuses({});
        setUploadProgress({});
        setTracksMetadata({});
        setOverallUploadStatus('idle');
        setCoverPreviewUrls({});
        setSelectedCoverFiles({});
    }, []);

    // Use a ref to store current state for the async upload process
    const stateRef = useRef({ tracksMetadata, selectedCoverFiles });
    useEffect(() => {
        stateRef.current = { tracksMetadata, selectedCoverFiles };
    }, [tracksMetadata, selectedCoverFiles]);

    const startUpload = async () => {
        if (selectedAudioFiles.length === 0) return;

        setOverallUploadStatus('uploading');
        let totalSuccessful = 0;

        const supabase = createClient();

        const refreshSession = async () => {
            try {
                await supabase.auth.getSession();
            } catch (e) {
                console.warn('Session refresh failed:', e);
            }
        };

        const uploadAudioToTelegram = async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch('/api/storage/upload', { method: 'POST', body: formData });

            let errorMessage = 'Telegram upload failed';
            try {
                const data = await response.json();
                if (response.ok) return `/api/storage/stream?file_id=${data.file_id}`;
                errorMessage = data.error || data.message || errorMessage;
            } catch (jsonErr) {
                errorMessage = `Server error (${response.status}): ${response.statusText}`;
            }

            throw new Error(errorMessage);
        };

        const uploadToCloudinary = async (file: File, type: 'video' | 'image') => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('resource_type', type);
            const response = await fetch('/api/upload-track', { method: 'POST', body: formData });

            if (!response.ok) {
                try {
                    const errData = await response.json();
                    throw new Error(errData.error || errData.message || 'Cloudinary upload failed');
                } catch (e) {
                    throw new Error(`Cloudinary server error: ${response.status}`);
                }
            }

            const data = await response.json();
            return data.data.secure_url;
        };

        const processFile = async (file: File) => {
            const fileId = `${file.name}-${file.size}-${file.lastModified}`;

            // Skip if already success
            if (uploadStatuses[fileId] === 'success') return true;

            try {
                // Ensure session is active before starting each file
                await refreshSession();

                setUploadStatuses(prev => ({ ...prev, [fileId]: 'preparing' }));
                setUploadProgress(prev => ({ ...prev, [fileId]: 5 }));

                const metadata = stateRef.current.tracksMetadata[fileId] || {};
                const coverFile = stateRef.current.selectedCoverFiles[fileId];

                console.log(`[Upload] Processing ${file.name}, has cover: ${!!coverFile}`);

                let coverUrl = null;
                if (coverFile) {
                    setUploadStatuses(prev => ({ ...prev, [fileId]: 'uploading_cover' }));
                    setUploadProgress(prev => ({ ...prev, [fileId]: 10 }));
                    console.log(`[Upload] Uploading cover for ${file.name}...`);
                    coverUrl = await uploadToCloudinary(coverFile, 'image');
                    console.log(`[Upload] Cover uploaded successfully: ${coverUrl}`);
                }

                setUploadStatuses(prev => ({ ...prev, [fileId]: 'uploading_audio' }));
                setUploadProgress(prev => ({ ...prev, [fileId]: 30 }));
                const audioUrl = await uploadAudioToTelegram(file);

                setUploadStatuses(prev => ({ ...prev, [fileId]: 'finalizing' }));
                setUploadProgress(prev => ({ ...prev, [fileId]: 85 }));

                console.log(`[Upload] Saving metadata for ${file.name}:`, {
                    title: metadata.title || file.name.replace(/\.[^/.]+$/, ""),
                    artist: metadata.artist || 'Unknown Artist',
                    album: metadata.album || 'Unknown Album',
                    cover: coverUrl
                });

                const saveResponse = await fetch('/api/save-track-metadata', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: metadata.title || file.name.replace(/\.[^/.]+$/, ""),
                        artist: metadata.artist || 'Unknown Artist',
                        album: metadata.album || 'Unknown Album',
                        genre: metadata.genre || 'Unknown Genre',
                        audioUrl,
                        cover: coverUrl,
                        duration: metadata.duration || 0,
                    }),
                });

                if (!saveResponse.ok) {
                    let saveError = 'Failed to save metadata';
                    try {
                        const errData = await saveResponse.json();
                        saveError = errData.error || errData.message || saveError;
                    } catch (e) {
                        saveError = `Metadata save server error: ${saveResponse.status}`;
                    }
                    throw new Error(saveError);
                }

                setUploadStatuses(prev => ({ ...prev, [fileId]: 'success' }));
                setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
                return true;
            } catch (err: any) {
                console.error(`Upload error for ${file.name}:`, err);
                setUploadStatuses(prev => ({ ...prev, [fileId]: 'error' }));
                toast({
                    variant: "destructive",
                    title: "Upload Failed",
                    description: `${file.name}: ${err.message || 'Unknown error'}`
                });
                return false;
            }
        };

        // SEQUENTIAL PROCESSING for stability
        for (const file of selectedAudioFiles) {
            const success = await processFile(file);
            if (success) {
                totalSuccessful++;
                refetchTracks(); // Refetch as we go so they appear in library instantly
            }
        }

        if (totalSuccessful > 0) {
            refetchTracks();
        }

        if (totalSuccessful === selectedAudioFiles.length) {
            setOverallUploadStatus('success');
            toast({ title: "Upload Complete" });
        } else {
            setOverallUploadStatus('error');
        }
    };

    return (
        <UploadContext.Provider value={{
            selectedAudioFiles, tracksMetadata, uploadStatuses, uploadProgress,
            overallUploadStatus, isExtractingMetadata, addFiles, removeFile,
            updateMetadata, startUpload, clearUploads, coverPreviewUrls,
            selectedCoverFiles, setCoverPreview, setCoverFile
        }}>
            {children}
        </UploadContext.Provider>
    );
};

export const useUpload = () => {
    const context = useContext(UploadContext);
    if (context === undefined) throw new Error('useUpload must be used within UploadProvider');
    return context;
};
