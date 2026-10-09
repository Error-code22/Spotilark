"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Folder, Music, Loader2, Scan, CheckCircle2 } from "lucide-react";
import { detectMusicFolders, type MusicFolder } from "@/lib/music-scanner";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface MusicScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFoldersFound?: (folders: MusicFolder[]) => void;
}

export function MusicScanner({ open, onOpenChange, onFoldersFound }: MusicScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [folders, setFolders] = useState<MusicFolder[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  const handleScan = async () => {
    setScanning(true);
    setFolders([]);
    try {
      const found = await detectMusicFolders();
      setFolders(found);
      if (found.length === 0) {
        toast({
          title: "No music found",
          description: "No audio files detected on your device.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Scan failed",
        description: err.message || "Could not scan for music files.",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const toggleFolder = (path: string) => {
    setSelectedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleImport = () => {
    onFoldersFound?.(folders.filter(f => selectedFolders.has(f.path)));
    setDone(true);
    setTimeout(() => {
      setDone(false);
      onOpenChange(false);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-primary" />
            Scan for Music
          </DialogTitle>
          <DialogDescription>
            Find audio files stored on your device.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="font-semibold">Music added to library!</p>
          </div>
        ) : folders.length === 0 ? (
          <div className="flex flex-col items-center py-6 gap-4">
            {scanning ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Scanning device storage...</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Music className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  We'll scan common folders like Music, Download, and messaging app audio folders.
                </p>
                <Button onClick={handleScan} className="rounded-full gap-2">
                  <Scan className="h-4 w-4" />
                  Start Scanning
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Found {folders.length} folder{folders.length !== 1 ? 's' : ''} with music:
            </p>
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {folders.map(folder => (
                <div
                  key={folder.path}
                  onClick={() => toggleFolder(folder.path)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                    selectedFolders.has(folder.path)
                      ? "bg-primary/10 border-primary/30"
                      : "bg-card border-border hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "h-4 w-4 rounded border-2 flex items-center justify-center transition-all",
                    selectedFolders.has(folder.path) ? "bg-primary border-primary" : "border-muted-foreground/30"
                  )}>
                    {selectedFolders.has(folder.path) && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <Folder className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{folder.name}</p>
                    <p className="text-xs text-muted-foreground">{folder.fileCount} audio files</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => { setFolders([]); setSelectedFolders(new Set()); }}
                className="flex-1"
              >
                Rescan
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedFolders.size === 0}
                className="flex-1"
              >
                Import ({selectedFolders.size})
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
