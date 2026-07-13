"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Music, Video, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    track: {
        remoteId: string;
        title: string;
        artist?: string;
        album?: string;
        cover?: string;
    };
}

export function ImportDialog({ open, onOpenChange, track }: ImportDialogProps) {
    const [importing, setImporting] = useState(false);
    const [done, setDone] = useState(false);
    const { toast } = useToast();

    const handleImport = async (format: "audio" | "video") => {
        setImporting(true);
        try {
            const res = await fetch("/api/library/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    videoId: track.remoteId,
                    title: track.title,
                    artist: track.artist,
                    album: track.album,
                    cover: track.cover,
                }),
            });

            const data = await res.json();

            if (data.success) {
                setDone(true);
                toast({
                    title: "Imported!",
                    description: `${track.title} has been added to your library.`,
                });
                setTimeout(() => {
                    setDone(false);
                    onOpenChange(false);
                }, 1500);
            } else {
                throw new Error(data.error || "Import failed");
            }
        } catch (err: any) {
            toast({
                title: "Import Failed",
                description: err.message || "Could not import track",
                variant: "destructive",
            });
        } finally {
            setImporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Import to Library</DialogTitle>
                    <DialogDescription className="truncate">{track.title} — {track.artist}</DialogDescription>
                </DialogHeader>

                {done ? (
                    <div className="flex flex-col items-center py-6 gap-3">
                        <CheckCircle2 className="h-12 w-12 text-green-500" />
                        <p className="font-semibold">Imported Successfully</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <Button
                            variant="outline"
                            className="flex flex-col gap-2 h-auto py-6 hover:bg-primary/10 hover:border-primary/30"
                            onClick={() => handleImport("audio")}
                            disabled={importing}
                        >
                            {importing ? (
                                <Loader2 className="h-8 w-8 animate-spin" />
                            ) : (
                                <Music className="h-8 w-8 text-primary" />
                            )}
                            <span className="font-semibold">MP3 Audio</span>
                            <span className="text-[10px] text-muted-foreground">Music only</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="flex flex-col gap-2 h-auto py-6 hover:bg-primary/10 hover:border-primary/30"
                            onClick={() => handleImport("video")}
                            disabled={importing}
                        >
                            {importing ? (
                                <Loader2 className="h-8 w-8 animate-spin" />
                            ) : (
                                <Video className="h-8 w-8 text-primary" />
                            )}
                            <span className="font-semibold">MP4 Video</span>
                            <span className="text-[10px] text-muted-foreground">Audio + Video</span>
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
