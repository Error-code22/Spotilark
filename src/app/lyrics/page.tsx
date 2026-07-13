"use client";

import { SpotilarkLayout } from "@/components/spotilark-layout";
import { usePlayer } from "@/context/PlayerContext";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";
import { Music2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Lyric } from "@/lib/data";

function parseLrcInput(input: string): Lyric[] {
  const lines = input.split("\n");
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
  const result: Lyric[] = [];

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3].padEnd(3, "0").substring(0, 3), 10);
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = line.replace(timeRegex, "").trim();
      if (text) {
        result.push({ time, text });
      }
    }
  }
  return result;
}

function parsePlainText(input: string): Lyric[] {
  const lines = input.split("\n").filter((line) => line.trim().length > 0);
  const estimatedDurationPerLine = 4;
  return lines.map((line, index) => ({
    time: index * estimatedDurationPerLine,
    text: line.trim(),
  }));
}

function isLrcFormat(input: string): boolean {
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
  return input.split("\n").some((line) => timeRegex.test(line));
}

const LyricsPageContent = () => {
  const { currentTrack, currentTime, updateTrackLyrics } = usePlayer();
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lyricsInput, setLyricsInput] = useState("");
  const [parsedLyrics, setParsedLyrics] = useState<Lyric[] | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!currentTrack || !currentTrack.lyrics) return;
    const newIndex = currentTrack.lyrics.findLastIndex(
      (lyric) => lyric.time <= currentTime
    );
    if (newIndex !== activeLyricIndex) {
      setActiveLyricIndex(newIndex);
      const activeElement = lyricsContainerRef.current?.children[
        newIndex
      ] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentTime, currentTrack, activeLyricIndex]);

  useEffect(() => {
    if (dialogOpen && currentTrack?.lyrics) {
      const lrcText = currentTrack.lyrics
        .map((l) => {
          const mins = Math.floor(l.time / 60)
            .toString()
            .padStart(2, "0");
          const secs = Math.floor(l.time % 60)
            .toString()
            .padStart(2, "0");
          const ms = Math.floor((l.time % 1) * 100)
            .toString()
            .padStart(2, "0");
          return `[${mins}:${secs}.${ms}]${l.text}`;
        })
        .join("\n");
      setLyricsInput(lrcText);
      setParsedLyrics(null);
    } else if (dialogOpen) {
      setLyricsInput("");
      setParsedLyrics(null);
    }
  }, [dialogOpen, currentTrack]);

  const handleParse = () => {
    if (!lyricsInput.trim()) {
      setParsedLyrics(null);
      return;
    }
    if (isLrcFormat(lyricsInput)) {
      const parsed = parseLrcInput(lyricsInput);
      setParsedLyrics(parsed);
      toast({ title: "Parsed LRC format", description: `Found ${parsed.length} timed lyrics.` });
    } else {
      const parsed = parsePlainText(lyricsInput);
      setParsedLyrics(parsed);
      toast({ title: "Parsed plain text", description: `Found ${parsed.length} lines.` });
    }
  };

  const handleSave = () => {
    if (!parsedLyrics || !currentTrack) return;
    if (parsedLyrics.length === 0) {
      toast({ title: "No lyrics to save", variant: "destructive" });
      return;
    }

    if (currentTrack.id.startsWith("yt-")) {
      const cacheKey = `spotilark_custom_lyrics_${currentTrack.id}`;
      localStorage.setItem(cacheKey, JSON.stringify(parsedLyrics));
      updateTrackLyrics(currentTrack.id, parsedLyrics);
      toast({ title: "Lyrics saved", description: "Lyrics saved to cloud storage." });
    } else if (currentTrack.storage_type === "cloud") {
      const cacheKey = `spotilark_custom_lyrics_${currentTrack.id}`;
      localStorage.setItem(cacheKey, JSON.stringify(parsedLyrics));
      updateTrackLyrics(currentTrack.id, parsedLyrics);
      toast({ title: "Lyrics saved", description: "Lyrics saved to cloud storage." });
    } else {
      const cacheKey = `spotilark_custom_lyrics_${currentTrack.id}`;
      localStorage.setItem(cacheKey, JSON.stringify(parsedLyrics));
      updateTrackLyrics(currentTrack.id, parsedLyrics);
      toast({ title: "Lyrics saved locally" });
    }

    setDialogOpen(false);
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      {currentTrack ? (
        <>
          <div className="absolute inset-0 z-0">
            <Image
              src={currentTrack.cover || "https://placehold.co/256x256.png?text=Cover"}
              alt={currentTrack.album || "Album Cover"}
              fill
              className="object-cover blur-3xl scale-125 opacity-30"
              data-ai-hint={currentTrack.coverHint}
            />
            <div className="absolute inset-0 bg-background/50"></div>
          </div>
          <div className="relative z-10 flex flex-col h-full text-center p-8">
            <div className="mb-8 flex items-center justify-center gap-4">
              <h1 className="text-5xl font-bold">{currentTrack.title}</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDialogOpen(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-2xl text-muted-foreground mt-2 mb-4">{currentTrack.artist}</p>
            <ScrollArea className="flex-1">
              <div ref={lyricsContainerRef} className="space-y-6">
                {currentTrack.lyrics &&
                  currentTrack.lyrics.map((line, index) => (
                    <p
                      key={index}
                      className={cn(
                        "text-2xl text-muted-foreground transition-all duration-300",
                        activeLyricIndex === index &&
                          "text-foreground font-bold text-4xl"
                      )}
                    >
                      {line.text}
                    </p>
                  ))}
              </div>
            </ScrollArea>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
          <Music2 className="h-24 w-24" />
          <h2 className="text-2xl font-semibold">No song is playing</h2>
          <p>Play a song to see its lyrics here.</p>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add/Edit Lyrics</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={lyricsInput}
              onChange={(e) => setLyricsInput(e.target.value)}
              placeholder={"Paste lyrics as plain text (one line per row) or LRC format (with timestamps like [00:15.00])"}
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              Paste lyrics as plain text (one line per row) or LRC format (with timestamps like [00:15.00]).
            </p>
            {parsedLyrics && (
              <p className="text-sm text-green-500">
                Parsed {parsedLyrics.length} lyric lines.
              </p>
            )}
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleParse}>
              Parse
            </Button>
            <Button onClick={handleSave} disabled={!parsedLyrics}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function LyricsPage() {
  return (
    <SpotilarkLayout>
      <LyricsPageContent />
    </SpotilarkLayout>
  );
}
