"use client";

import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { SpotilarkLayout } from "@/components/spotilark-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Folder from 'lucide-react/icons/folder';
import HardDrive from 'lucide-react/icons/hard-drive';
import Cloud from 'lucide-react/icons/cloud';
import Music from 'lucide-react/icons/music';
import Play from 'lucide-react/icons/play';
import ChevronLeft from 'lucide-react/icons/chevron-left';
import ChevronRight from 'lucide-react/icons/chevron-right';
import Globe from 'lucide-react/icons/globe';
import ArrowRight from 'lucide-react/icons/arrow-right';
import Monitor from 'lucide-react/icons/monitor';
import Download from 'lucide-react/icons/download';
import FolderArchive from 'lucide-react/icons/folder-archive';
import Database from 'lucide-react/icons/database';
import Trash2 from 'lucide-react/icons/trash-2';
import Plus from 'lucide-react/icons/plus';
import ListMusic from 'lucide-react/icons/list-music';
import Music2 from 'lucide-react/icons/music-2';
import Video from 'lucide-react/icons/video';
import Link from "next/link";
import { usePlayer } from '@/context/PlayerContext';
import { Track } from '@/lib/data';
import { cn } from '@/lib/utils';
import { openDB, clearMusicCache } from '@/lib/cache-utils';
import { scanNativeFolders } from '@/lib/file-scanner';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type View = 'dashboard' | 'local' | 'cloud' | 'stream' | 'folder-detail';

interface ScannedFolder {
  name: string;
  tracks: Track[];
}

export default function FoldersPage() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const internalStorageInputRef = useRef<HTMLInputElement>(null);
  const songsInputRef = useRef<HTMLInputElement>(null);
  const videosInputRef = useRef<HTMLInputElement>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { playTrack, localLibrary, addLocalTracks, cloudLibrary, unifiedLibrary, refetchTracks } = usePlayer();
  const { toast } = useToast();

  const [isScanning, setIsScanning] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageTotal, setStorageTotal] = useState(0);
  const [offlineCachedCount, setOfflineCachedCount] = useState(0);
  const [cacheSize, setCacheSize] = useState(0);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const jsmediatagsRef = useRef<any>(null);
  const [scannedFolders, setScannedFolders] = useState<ScannedFolder[]>([]);
  const [isNative, setIsNative] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const streamLibrary = unifiedLibrary.filter(t => t.storage_type === 'stream');

  // Group local tracks by album (folder name)
  const folderGroups = useMemo(() => {
    const groups: Record<string, Track[]> = {};
    localLibrary.forEach(track => {
      const folder = track.album || 'Unknown Folder';
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(track);
    });
    return groups;
  }, [localLibrary]);

  const folderNames = Object.keys(folderGroups).sort();

  useEffect(() => {
    import('jsmediatags').then(module => {
      jsmediatagsRef.current = module;
    }).catch(error => console.error("Failed to load jsmediatags:", error));
  }, []);

  useEffect(() => {
    const fetchStorageInfo = async () => {
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate();
          setStorageUsed(estimate.usage || 0);
          setStorageTotal(estimate.quota || 0);
        }
      } catch (e) {
        console.error('Failed to get storage info:', e);
      }
    };
    fetchStorageInfo();
  }, []);

  useEffect(() => {
    const fetchCacheInfo = async () => {
      try {
        const db = await openDB();
        const transaction = db.transaction("tracks", "readonly");
        const store = transaction.objectStore("tracks");

        const countRequest = store.count();
        countRequest.onsuccess = () => {
          setOfflineCachedCount(countRequest.result);
        };

        let totalSize = 0;
        const allRequest = store.getAll();
        allRequest.onsuccess = () => {
          const entries = allRequest.result;
          entries.forEach((entry: any) => {
            if (entry.blob) {
              totalSize += entry.blob.size;
            }
          });
          setCacheSize(totalSize);
        };
      } catch (e) {
        console.error('Failed to get cache info:', e);
      }
    };
    fetchCacheInfo();
  }, []);

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      await clearMusicCache();
      setOfflineCachedCount(0);
      setCacheSize(0);
    } catch (e) {
      console.error('Failed to clear cache:', e);
    }
    setIsClearingCache(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processFiles = async (files: FileList | File[], folderName?: string) => {
    setIsScanning(true);
    const scannedTracks: Track[] = [];
    const audioFiles = Array.from(files).filter(file => file.type.startsWith('audio/'));

    for (const file of audioFiles) {
      const fileId = `${file.name}-${file.size}-${file.lastModified}`;
      let metadata: any = {
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Unknown Artist',
        album: folderName || 'Unknown Folder'
      };

      // Extract folder name from webkitRelativePath if available
      if ((file as any).webkitRelativePath) {
        const parts = (file as any).webkitRelativePath.split('/');
        if (parts.length > 1) {
          metadata.album = parts.slice(0, -1).join('/') || parts[0];
        }
      }

      if (jsmediatagsRef.current) {
        await new Promise<void>((resolve) => {
          jsmediatagsRef.current.read(file, {
            onSuccess: (tag: any) => {
              metadata.title = tag.tags.title || metadata.title;
              metadata.artist = tag.tags.artist || metadata.artist;
              // Keep folder name as album, don't overwrite with tag album
              if (tag.tags.picture) {
                metadata.rawPicture = tag.tags.picture;
              }
              resolve();
            },
            onError: () => resolve()
          });
        });
      }

      let trackDuration = 0;
      try {
        trackDuration = await new Promise<number>((resolve) => {
          const audio = new Audio();
          audio.preload = 'metadata';
          audio.onloadedmetadata = () => {
            resolve(audio.duration || 0);
            audio.src = '';
          };
          audio.onerror = () => resolve(0);
          audio.src = URL.createObjectURL(file);
          setTimeout(() => resolve(0), 5000);
        });
      } catch {
        trackDuration = 0;
      }

      let coverUrl = '/spotilark-without-text-white.png';
      if (metadata.rawPicture) {
        try {
          const { data, format } = metadata.rawPicture;
          const byteArray = new Uint8Array(data);
          const blob = new Blob([byteArray], { type: format });
          coverUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve('/spotilark-without-text-white.png');
            reader.readAsDataURL(blob);
          });
        } catch {
          coverUrl = '/spotilark-without-text-white.png';
        }
      }

      const localTrack: Track = {
        id: `local-${fileId}`,
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        source_url: URL.createObjectURL(file),
        duration: trackDuration,
        cover: coverUrl,
        created_at: new Date().toISOString(),
        created_by: 'local-user',
        storage_type: 'local'
      };
      scannedTracks.push(localTrack);
    }
    await addLocalTracks(scannedTracks, audioFiles);
    setIsScanning(false);
    setActiveView('local');
  };

  const handleInternalStorageSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files);
    event.target.value = '';
  };

  const handleSongsSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files, 'Imported Songs');
    event.target.value = '';
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      const url = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        const dur = video.duration || 0;
        URL.revokeObjectURL(url);
        resolve(dur);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
      video.src = url;
      setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve(0);
      }, 3000);
    });
  };

  const extractVideoCover = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadeddata = () => {
        video.currentTime = Math.min(1, video.duration * 0.1);
      };
      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const vw = video.videoWidth || 320;
          const vh = video.videoHeight || 180;
          const size = Math.min(vw, vh);
          const x = (vw - size) / 2;
          const y = (vh - size) / 2;
          ctx.drawImage(video, x, y, size, size, 0, 0, 64, 64);
          resolve(canvas.toDataURL("image/jpeg", 0.4));
        } else {
          resolve('/spotilark-without-text-white.png');
        }
      };
      video.onerror = () => resolve('/spotilark-without-text-white.png');
      const url = URL.createObjectURL(file);
      video.src = url;
      setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve('/spotilark-without-text-white.png');
      }, 3000);
    });
  };

  const handleVideosSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const videoFiles = Array.from(files).filter(f => f.type.startsWith('video/'));
    const tracks: Track[] = [];
    for (const file of videoFiles) {
      const cover = await extractVideoCover(file);
      const duration = await getVideoDuration(file);
      const videoUrl = URL.createObjectURL(file);
      tracks.push({
        id: `local-video-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        artist: "Local Video",
        album: "Imported Videos",
        source_url: videoUrl,
        duration: duration || null,
        cover,
        created_at: new Date().toISOString(),
        created_by: "local-user",
        storage_type: "local",
        hasVideo: true,
        videoUrl,
      });
    }
    await addLocalTracks(tracks, videoFiles);
    event.target.value = '';
  };

  const handleNativeScan = async () => {
    setIsScanning(true);
    try {
      const results = await scanNativeFolders();
      const allTracks: Track[] = [];
      const folders: ScannedFolder[] = [];

      for (const result of results) {
        allTracks.push(...result.tracks);
        folders.push({ name: result.folderName, tracks: result.tracks });
      }

      if (allTracks.length > 0) {
        await addLocalTracks(allTracks);
        setScannedFolders(folders);
      }
    } catch (error) {
      console.error("Native scan failed:", error);
    }
    setIsScanning(false);
    setActiveView('local');
  };

  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

  const handleElectronScan = async () => {
    const api = (window as any).electronAPI;
    if (!api) return;

    const folderPath = await api.selectFolder();
    if (!folderPath) return;

    setIsScanning(true);
    try {
      const files: Array<{ path: string; name: string; size: number; modified: string }> = await api.scanFolder(folderPath);
      if (files.length === 0) {
        toast({ title: "No audio files found", description: "The selected folder contains no supported audio files.", variant: "destructive" });
        setIsScanning(false);
        return;
      }

      const scannedTracks: Track[] = files.map((file: any) => {
        const title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const folderName = folderPath.split(/[\\/]/).pop() || 'Unknown Folder';
        return {
          id: `electron-${Buffer.from(file.path).toString('base64').replace(/[/+=]/g, '').slice(0, 20)}`,
          title,
          artist: 'Unknown Artist',
          album: folderName,
          source_url: `local-audio://${encodeURIComponent(file.path)}`,
          duration: null,
          cover: '/spotilark-without-text-white.png',
          created_at: new Date().toISOString(),
          created_by: 'electron-scan',
          storage_type: 'local',
          sourcePath: file.path,
        } as Track;
      });

      await addLocalTracks(scannedTracks);
      toast({ title: "Scan Complete", description: `Found ${scannedTracks.length} audio files in ${folderPath}` });

      api.startFolderWatch(folderPath);
      api.onFolderWatchEvent((event: any) => {
        console.log(`[Folder Watch] ${event.type}: ${event.path}`);
      });
    } catch (error) {
      console.error("Electron scan failed:", error);
      toast({ title: "Scan Failed", description: "Failed to scan the selected folder.", variant: "destructive" });
    }
    setIsScanning(false);
    setActiveView('local');
  };

  const convertFolderToPlaylist = (folderName: string, tracks: Track[]) => {
    // Store as a playlist in localStorage
    const playlists = JSON.parse(localStorage.getItem('spotilark-playlists') || '[]');
    const newPlaylist = {
      id: `playlist-${Date.now()}`,
      name: folderName,
      tracks: tracks.map(t => t.id),
      created_at: new Date().toISOString(),
    };
    playlists.push(newPlaylist);
    localStorage.setItem('spotilark-playlists', JSON.stringify(playlists));
    toast({
      title: "Playlist Created",
      description: `"${folderName}" has been added to your playlists.`,
    });
  };

  const StatBox = ({ label, value, suffix }: { label: string; value: number; suffix: string }) => (
    <div className="text-center">
      <p className="text-3xl font-black tracking-tighter">{value}</p>
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">{label} <span className="text-primary">{suffix}</span></p>
    </div>
  );

  // Hidden inputs
  const hiddenInputs = (
    <>
      <input
        ref={internalStorageInputRef}
        type="file"
        className="hidden"
        onChange={handleInternalStorageSelection}
        {...({ webkitdirectory: "" } as any)}
        multiple
        accept="audio/*"
      />
      <input
        ref={songsInputRef}
        type="file"
        className="hidden"
        onChange={handleSongsSelection}
        multiple
        accept="audio/*"
      />
      <input
        ref={videosInputRef}
        type="file"
        className="hidden"
        onChange={handleVideosSelection}
        multiple
        accept="video/*"
      />
    </>
  );

  if (activeView === 'folder-detail' && selectedFolder) {
    const tracks = folderGroups[selectedFolder] || [];
    return (
      <SpotilarkLayout>
        <div className="flex-1 p-4 md:p-6 overflow-y-auto pb-24">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => { setActiveView('local'); setSelectedFolder(null); }} className="rounded-full hover:bg-primary/10">
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <div className="flex-1">
                  <h2 className="text-2xl font-black tracking-tight">{selectedFolder}</h2>
                  <p className="text-sm text-muted-foreground">{tracks.length} tracks</p>
                </div>
              </div>
              <div className="flex gap-2 ml-8 sm:ml-0">
                <Button onClick={() => convertFolderToPlaylist(selectedFolder, tracks)} variant="outline" className="rounded-full font-bold gap-2">
                  <ListMusic className="h-4 w-4" />
                  Convert to Playlist
                </Button>
                <Button onClick={() => tracks.length > 0 && playTrack(tracks[0])} className="rounded-full font-bold gap-2">
                  <Play className="h-4 w-4 fill-current" />
                  Play All
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tracks.map((track) => (
                <Card key={track.id} className="bg-card/40 border-none shadow-sm hover:bg-primary/5 transition-all group rounded-2xl overflow-hidden active:scale-[0.98] cursor-pointer" onClick={() => playTrack(track)}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-primary/10 border border-primary/5 group-hover:shadow-lg transition-all duration-300">
                      <Image src={track.cover || '/spotilark-without-text-white.png'} alt={track.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" unoptimized />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play className="h-6 w-6 text-white fill-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate text-[15px]">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate font-medium">{track.artist}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </SpotilarkLayout>
    );
  }

  const renderDashboard = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-12 p-4 sm:p-8 rounded-[24px] sm:rounded-[40px] bg-card/40 border-none shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-primary/10 transition-colors" />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <HardDrive className="text-primary h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-black italic uppercase tracking-tighter">Storage</h3>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Device & Cache Overview</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-background/60 border-none shadow-sm rounded-2xl">
              <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10">
                    <HardDrive className="h-5 w-5 text-amber-500" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Internal Storage</span>
                </div>
                <div>
                  <span className="text-2xl font-black tracking-tighter">{formatBytes(storageUsed)}</span>
                  <span className="text-xs font-bold text-muted-foreground ml-1">/ {formatBytes(storageTotal)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/60 border-none shadow-sm rounded-2xl">
              <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10">
                    <Cloud className="h-5 w-5 text-blue-500" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Cloud Tracks</span>
                </div>
                <div>
                  <span className="text-2xl font-black tracking-tighter">{cloudLibrary.length}</span>
                  <span className="text-xs font-bold text-muted-foreground ml-1">tracks</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/60 border-none shadow-sm rounded-2xl">
              <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-green-500/10">
                    <FolderArchive className="h-5 w-5 text-green-500" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Local Files</span>
                </div>
                <div>
                  <span className="text-2xl font-black tracking-tighter">{localLibrary.length}</span>
                  <span className="text-xs font-bold text-muted-foreground ml-1">tracks</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/60 border-none shadow-sm rounded-2xl">
              <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10">
                    <Database className="h-5 w-5 text-purple-500" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Music Cache</span>
                </div>
                <div>
                  <span className="text-2xl font-black tracking-tighter">{offlineCachedCount}</span>
                  <span className="text-xs font-bold text-muted-foreground ml-1">cached</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {isElectron ? (
          <DashboardCard
            icon={<Folder className="h-6 w-6" />}
            title="Scan Folder"
            description="Scan a folder on your PC"
            count={0}
            color="amber"
            onClick={handleElectronScan}
          />
        ) : (
          <DashboardCard
            icon={<Folder className="h-6 w-6" />}
            title="Import Folder"
            description="Add a folder of songs"
            count={0}
            color="amber"
            onClick={() => internalStorageInputRef.current?.click()}
          />
        )}
        <DashboardCard
          icon={<Music className="h-6 w-6" />}
          title="Add Songs/Videos"
          description="Add individual tracks or videos"
          count={0}
          color="blue"
          onClick={() => setShowAddDialog(true)}
        />
        <DashboardCard
          icon={<Monitor className="h-6 w-6" />}
          title="Local Library"
          description={`${folderNames.length} folders`}
          count={localLibrary.length}
          color="green"
          onClick={() => setActiveView('local')}
        />
        <DashboardCard
          icon={<Cloud className="h-6 w-6" />}
          title="Cloud Library"
          description="Imported from YouTube"
          count={cloudLibrary.length}
          color="emerald"
          onClick={() => setActiveView('cloud')}
        />
      </div>

      {/* Folder Groups */}
      {folderNames.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black tracking-tight">Your Folders</h3>
            <span className="text-sm text-muted-foreground">{folderNames.length} folders</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {folderNames.map((name) => {
              const tracks = folderGroups[name];
              const cover = tracks[0]?.cover || '/spotilark-without-text-white.png';
              return (
                <Card
                  key={name}
                  className="bg-card/40 border-none shadow-sm hover:bg-primary/5 transition-all group rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98]"
                  onClick={() => { setSelectedFolder(name); setActiveView('folder-detail'); }}
                >
                  <div className="relative h-32 w-full">
                    <Image src={cover} alt={name} fill className="object-cover" unoptimized />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-white font-bold truncate">{name}</p>
                      <p className="text-white/70 text-xs">{tracks.length} tracks</p>
                    </div>
                  </div>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={(e) => { e.stopPropagation(); playTrack(tracks[0]); }}>
                        <Play className="h-4 w-4 fill-primary text-primary" />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs gap-1 text-muted-foreground"
                      onClick={(e) => { e.stopPropagation(); convertFolderToPlaylist(name, tracks); }}
                    >
                      <ListMusic className="h-3 w-3" />
                      Playlist
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Cloud Storage Health */}
      <div className="p-4 sm:p-8 rounded-[24px] sm:rounded-[40px] bg-card/40 border-none shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-primary/10 transition-colors" />

        <div className="flex flex-col gap-8 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <HardDrive className="text-primary h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-black italic uppercase tracking-tighter">Cloud Storage Health</h3>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Global Infrastructure Scale</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div className="flex flex-baseline gap-2">
                <span className="text-4xl font-black tracking-tighter">{(cloudLibrary.length * 5 / 1024).toFixed(2)}</span>
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">GB Used</span>
              </div>
              <span className="text-xs font-black text-muted-foreground/40">LIMIT: 50.00 GB</span>
            </div>

            <div className="h-3 w-full bg-primary/5 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-primary/40 via-primary to-primary/80 rounded-full transition-all duration-1000 shadow-[0_0_15px_var(--primary)]"
                style={{ width: `${Math.min(100, (cloudLibrary.length * 5 / (50 * 1024)) * 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">
              <span>0 GB</span>
              <span>25 GB</span>
              <span>50 GB</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-4 border-t border-white/5">
            <StatBox label="Total Library" value={unifiedLibrary.length} suffix="Tracks" />
            <StatBox label="Offline Ready" value={localLibrary.length + streamLibrary.length} suffix="Tracks" />
            <StatBox label="Artists" value={new Set(unifiedLibrary.map(t => t.artist)).size} suffix="Found" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderFileView = (type: View, title: string, tracks: Track[], emptyMsg: string, icon: any) => (
    <div className="animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setActiveView('dashboard')} className="rounded-full hover:bg-primary/10">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-black tracking-tight">{title}</h2>
              <span className="px-3 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{tracks.length}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {type === 'local' && (
            <>
              {isElectron ? (
                <Button onClick={handleElectronScan} variant="outline" className="rounded-full font-bold gap-2">
                  <Folder className="h-4 w-4" />
                  Scan Folder
                </Button>
              ) : (
                <Button onClick={() => internalStorageInputRef.current?.click()} variant="outline" className="rounded-full font-bold gap-2">
                  <Folder className="h-4 w-4" />
                  Add Folder
                </Button>
              )}
              <Button onClick={() => setShowAddDialog(true)} className="rounded-full font-bold gap-2">
                <Plus className="h-4 w-4" />
                Add Songs/Videos
              </Button>
            </>
          )}
          {tracks.length > 0 && (
            <Button onClick={() => playTrack(tracks[0])} variant="outline" className="rounded-full font-bold gap-2 border-primary/20">
              <Play className="h-4 w-4 fill-primary text-primary" />
              Play All
            </Button>
          )}
        </div>
      </div>

      {tracks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tracks.map((track) => (
            <Card key={track.id} className="bg-card/40 border-none shadow-sm hover:bg-primary/5 transition-all group rounded-2xl overflow-hidden active:scale-[0.98] cursor-pointer" onClick={() => playTrack(track)}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-primary/10 border border-primary/5 group-hover:shadow-lg transition-all duration-300">
                  <Image src={track.cover || '/spotilark-without-text-white.png'} alt={track.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" unoptimized />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Play className="h-6 w-6 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate text-[15px]">{track.title}</p>
                  <p className="text-xs text-muted-foreground truncate font-medium">{track.artist}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 text-muted-foreground border-2 border-dashed rounded-[40px] bg-muted/20 flex flex-col items-center gap-6">
          <div className="p-6 rounded-full bg-background/50">
            {icon === Monitor && <Monitor className="h-12 w-12 opacity-20" />}
            {icon === Cloud && <Cloud className="h-12 w-12 opacity-20" />}
            {icon === Globe && <Globe className="h-12 w-12 opacity-20" />}
          </div>
          <p className="font-black text-xl text-foreground/80">{emptyMsg}</p>
          {type === 'local' && (
            <div className="flex gap-3">
              <Button onClick={() => internalStorageInputRef.current?.click()} className="rounded-full px-6 font-bold gap-2">
                <Folder className="h-4 w-4" />
                Import Folder
              </Button>
              <Button onClick={() => setShowAddDialog(true)} variant="outline" className="rounded-full px-6 font-bold gap-2">
                <Plus className="h-4 w-4" />
                Add Songs/Videos
              </Button>
            </div>
          )}
          {type === 'cloud' && (
            <Link href="/upload">
              <Button className="rounded-full px-8 font-bold">Go to Upload</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );

  const DashboardCard = ({ icon, title, description, count, color, onClick }: {
    icon: React.ReactNode; title: string; description: string; count: number; color: string; onClick: () => void;
  }) => (
    <Card
      className="bg-card/40 border-none shadow-sm hover:bg-primary/5 transition-all cursor-pointer active:scale-[0.98] rounded-2xl"
      onClick={onClick}
    >
      <CardContent className="p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className={`p-2.5 rounded-xl bg-${color}-500/10`}>
            <div className={`text-${color}-500`}>{icon}</div>
          </div>
          {count > 0 && <span className="text-xl font-black">{count}</span>}
        </div>
        <div>
          <p className="font-bold">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <SpotilarkLayout>
      <div className="flex-1 p-4 md:p-6 overflow-y-auto pb-24">
        <div className="max-w-5xl mx-auto">
          {hiddenInputs}
          {activeView === 'dashboard' && renderDashboard()}
          {activeView === 'local' && renderFileView('local', 'Local Library', localLibrary, 'No local files yet.', Monitor)}
          {activeView === 'cloud' && renderFileView('cloud', 'Cloud Library', cloudLibrary, 'No cloud tracks imported.', Cloud)}
          {activeView === 'stream' && renderFileView('stream', 'Stream Library', streamLibrary, 'No streaming tracks.', Globe)}
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add to Library</DialogTitle>
            <DialogDescription>What would you like to add?</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 rounded-2xl"
              onClick={() => {
                songsInputRef.current?.click();
                setShowAddDialog(false);
              }}
            >
              <Music className="h-8 w-8 text-primary" />
              <span className="font-bold">Songs</span>
              <span className="text-xs text-muted-foreground">MP3, FLAC, WAV...</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 rounded-2xl"
              onClick={() => {
                videosInputRef.current?.click();
                setShowAddDialog(false);
              }}
            >
              <Video className="h-8 w-8 text-primary" />
              <span className="font-bold">Videos</span>
              <span className="text-xs text-muted-foreground">MP4, WebM, MOV...</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SpotilarkLayout>
  );
}
