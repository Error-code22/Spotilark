"use client";

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { SpotilarkLayout } from "@/components/spotilark-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Folder, HardDrive, Cloud, Music, Play, ChevronLeft, Globe, ArrowRight, Monitor, Download } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';

import { usePlayer } from '@/context/PlayerContext';
import { Track } from '@/lib/data';
import { cn } from '@/lib/utils';

const DynamicMusicUploadForm = dynamic(() => import("@/components/MusicUploadForm"), { ssr: false });

type View = 'dashboard' | 'local' | 'cloud' | 'stream';

export default function FoldersPage() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [activeTab, setActiveTab] = useState('browse');
  const internalStorageInputRef = useRef<HTMLInputElement>(null);

  const { playTrack, localLibrary, setLocalLibrary, cloudLibrary, unifiedLibrary } = usePlayer();

  const [localStats, setLocalStats] = useState({ totalDuration: 0, artistCount: 0 });
  const [isScanning, setIsScanning] = useState(false);
  const jsmediatagsRef = useRef<any>(null);

  // Derived libraries
  const streamLibrary = unifiedLibrary.filter(t => t.storage_type === 'stream');

  useEffect(() => {
    import('jsmediatags').then(module => {
      jsmediatagsRef.current = module;
    }).catch(error => console.error("Failed to load jsmediatags:", error));

    if (localLibrary.length > 0) {
      const uniqueArtists = new Set(localLibrary.map(t => t.artist)).size;
      setLocalStats({
        totalDuration: localLibrary.length * 210,
        artistCount: uniqueArtists
      });
    }
  }, [localLibrary]);

  const handleInternalStorageSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);
    const scannedTracks: Track[] = [];
    const audioFiles = Array.from(files).filter(file => file.type.startsWith('audio/'));

    for (const file of audioFiles) {
      const fileId = `${file.name}-${file.size}-${file.lastModified}`;
      let metadata: any = {
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Unknown Artist',
        album: 'Unknown Album'
      };

      if (jsmediatagsRef.current) {
        await new Promise<void>((resolve) => {
          jsmediatagsRef.current.read(file, {
            onSuccess: (tag: any) => {
              metadata.title = tag.tags.title || metadata.title;
              metadata.artist = tag.tags.artist || metadata.artist;
              metadata.album = tag.tags.album || metadata.album;
              if (tag.tags.picture) {
                const { data, format } = tag.tags.picture;
                const byteArray = new Uint8Array(data);
                const blob = new Blob([byteArray], { type: format });
                metadata.cover = URL.createObjectURL(blob);
              }
              resolve();
            },
            onError: () => resolve()
          });
        });
      }

      const localTrack: Track = {
        id: `local-${fileId}`,
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        source_url: URL.createObjectURL(file),
        duration: 0,
        cover: metadata.cover || '/SL.png',
        created_at: new Date().toISOString(),
        created_by: 'local-user',
        storage_type: 'local'
      };
      scannedTracks.push(localTrack);
    }
    setLocalLibrary((prev: Track[]) => [...prev, ...scannedTracks]);
    setIsScanning(false);
    setActiveView('local');
  };

  const renderDashboard = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Library Sources</h2>
          <p className="text-muted-foreground font-medium">Categorized view of all your music</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* LOCAL MUSIC FOLDER */}
        <SourceFolder
          icon={Monitor}
          title="Local Music"
          description={`${localLibrary.length} tracks found on this device`}
          color="amber"
          count={localLibrary.length}
          onClick={() => setActiveView('local')}
        />

        {/* CLOUD STORAGE FOLDER */}
        <SourceFolder
          icon={Cloud}
          title="Your Clouds"
          description={`${cloudLibrary.length} tracks uploaded to storage`}
          color="blue"
          count={cloudLibrary.length}
          onClick={() => setActiveView('cloud')}
        />

        {/* STREAMING FOLDER */}
        <SourceFolder
          icon={Globe}
          title="Downloads & Cache"
          description={`${streamLibrary.length} tracks cached from search`}
          color="emerald"
          count={streamLibrary.length}
          onClick={() => setActiveView('stream')}
        />

        {/* EXTERNAL SOURCE (Placeholder for things like Google Drive) */}
        <Link href="/folders/add-cloud-service" className="lg:mt-0">
          <Card className="h-full bg-muted/20 border-2 border-dashed border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all rounded-3xl group cursor-pointer">
            <CardContent className="h-full p-8 flex flex-col items-center justify-center text-center gap-4">
              <div className="p-4 rounded-2xl bg-background/50 text-muted-foreground group-hover:text-primary transition-colors">
                <Folder className="h-8 w-8" />
              </div>
              <div>
                <p className="font-bold">Add External Source</p>
                <p className="text-xs text-muted-foreground">Google Drive, Dropbox, etc.</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* RECENT ACTIVITY / STATS */}
      <div className="mt-12 p-8 rounded-3xl bg-primary/5 border border-primary/10">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-primary/10 rounded-xl">
            <HardDrive className="text-primary h-6 w-6" />
          </div>
          <h3 className="text-xl font-black">Storage Health</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <StatBox label="Total Library" value={unifiedLibrary.length} suffix="Tracks" />
          <StatBox label="Offline Ready" value={localLibrary.length + streamLibrary.length} suffix="Tracks" />
          <StatBox label="Artists" value={new Set(unifiedLibrary.map(t => t.artist)).size} suffix="Found" />
        </div>
      </div>
    </div>
  );

  const renderFileView = (type: View, title: string, tracks: Track[], emptyMsg: string, icon: any) => (
    <div className="animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveView('dashboard')}
            className="rounded-full hover:bg-primary/10"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-black tracking-tight">{title}</h2>
              <span className="px-3 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{tracks.length}</span>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              Folders <ChevronLeft className="h-3 w-3 rotate-180" /> {title}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {type === 'local' && (
            <Button
              onClick={() => internalStorageInputRef.current?.click()}
              className="rounded-full font-bold gap-2"
            >
              <Download className="h-4 w-4" />
              Scan More
            </Button>
          )}
          {tracks.length > 0 && (
            <Button
              onClick={() => playTrack(tracks[0])}
              variant="outline"
              className="rounded-full font-bold gap-2 border-primary/20"
            >
              <Play className="h-4 w-4 fill-primary text-primary" />
              Play All
            </Button>
          )}
        </div>
      </div>

      {tracks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tracks.map((track) => (
            <Card key={track.id} className="bg-card/40 border-none shadow-sm hover:bg-primary/5 transition-all group rounded-2xl overflow-hidden active:scale-[0.98]">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-primary/10 border border-primary/5 group-hover:shadow-lg transition-all duration-300">
                  <Image
                    src={track.cover || '/SL.png'}
                    alt={track.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer" onClick={() => playTrack(track)}>
                    <Play className="h-6 w-6 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate text-[15px]">{track.title}</p>
                  <p className="text-xs text-muted-foreground truncate font-medium">{track.artist}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => playTrack(track)}
                  className="rounded-full mt-auto mb-auto md:flex hidden opacity-0 group-hover:opacity-100"
                >
                  <ArrowRight className="h-4 w-4 text-primary" />
                </Button>
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
          <div className="max-w-xs space-y-2">
            <p className="font-black text-xl text-foreground/80">{emptyMsg}</p>
            <p className="text-sm font-medium">This category currently has no tracks in your library.</p>
          </div>
          {type === 'local' && (
            <Button
              onClick={() => internalStorageInputRef.current?.click()}
              className="rounded-full px-8 font-bold"
            >
              Select Local Folder
            </Button>
          )}
          {type === 'cloud' && (
            <Button
              onClick={() => setActiveTab('upload')}
              className="rounded-full px-8 font-bold"
            >
              Upload Music
            </Button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <SpotilarkLayout>
      <div className="flex-1 p-6 md:p-12 overflow-y-auto pb-48 scrollbar-hide">
        <input
          type="file"
          {...({ webkitdirectory: "true", directory: "true" } as any)}
          multiple
          ref={internalStorageInputRef}
          onChange={handleInternalStorageSelection}
          className="hidden"
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex w-fit mb-12 p-1 bg-muted/30 rounded-2xl">
            <TabsTrigger
              value="browse"
              className="px-8 py-3 text-sm font-bold rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all"
            >
              Source Browser
            </TabsTrigger>
            <TabsTrigger
              value="upload"
              className="px-8 py-3 text-sm font-bold rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xl transition-all"
            >
              Cloud Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse">
            {activeView === 'dashboard' && renderDashboard()}
            {activeView === 'local' && renderFileView('local', 'Local Music', localLibrary, 'No local files scanned yet.', Monitor)}
            {activeView === 'cloud' && renderFileView('cloud', 'Your Clouds', cloudLibrary, 'No cloud uploads found.', Cloud)}
            {activeView === 'stream' && renderFileView('stream', 'Downloads & Cache', streamLibrary, 'No cached tracks found.', Globe)}
          </TabsContent>

          <TabsContent value="upload">
            <div className="max-w-4xl mx-auto">
              <DynamicMusicUploadForm />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SpotilarkLayout>
  );
}

function SourceFolder({ icon: Icon, title, description, color, count, onClick }: any) {
  const colors = {
    amber: "bg-amber-500/10 text-amber-500",
    blue: "bg-blue-500/10 text-blue-500",
    emerald: "bg-emerald-500/10 text-emerald-500"
  };

  return (
    <Card
      onClick={onClick}
      className="group relative overflow-hidden bg-card/40 border-none shadow-sm hover:shadow-2xl hover:-translate-y-2 hover:bg-primary/5 transition-all duration-500 cursor-pointer rounded-[40px] active:scale-[0.98]"
    >
      <CardContent className="p-6 md:p-8 flex flex-col gap-6 md:gap-8 h-full">
        <div className="flex justify-between items-start">
          <div className={cn("p-4 md:p-5 rounded-3xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6", colors[color as keyof typeof colors])}>
            <Icon className="h-8 w-8 md:h-10 md:w-10" />
          </div>
          <div className="bg-background/80 backdrop-blur-md border border-border/50 px-3 py-1 md:px-4 md:py-1.5 rounded-full shadow-sm">
            <span className="text-[10px] md:text-xs font-black tracking-widest">{count} FILES</span>
          </div>
        </div>
        <div>
          <h3 className="text-xl md:text-2xl font-black mb-1 group-hover:text-primary transition-colors">{title}</h3>
          <p className="text-sm font-medium text-muted-foreground opacity-80 line-clamp-2 md:line-clamp-none">{description}</p>
        </div>
        <div className="mt-auto pt-4 flex items-center text-primary font-bold text-sm gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0">
          Open Folder <ArrowRight className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatBox({ label, value, suffix }: any) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-black tracking-tighter text-foreground decoration-primary/20 underline underline-offset-8">{value}</span>
        <span className="text-xs font-bold text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}