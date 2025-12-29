"use client";

import { usePlayer } from "@/context/PlayerContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Mic2, Music2, Play, Pause, SkipBack, SkipForward } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { fetchLyrics } from "@/lib/lyrics";

export const LyricsView = () => {
    const {
        currentTrack,
        currentTime,
        isLyricsViewOpen,
        toggleLyricsView,
        updateTrackLyrics,
        isPlaying,
        togglePlayPause,
        playNext,
        playPrev
    } = usePlayer();
    const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
    const lyricsContainerRef = useRef<HTMLDivElement>(null);
    const [isFetching, setIsFetching] = useState(false);

    // Auto-scroll to active lyric
    useEffect(() => {
        if (!currentTrack?.lyrics || !isLyricsViewOpen) return;

        const newIndex = currentTrack.lyrics.findLastIndex(
            (lyric) => lyric.time <= currentTime
        );

        if (newIndex !== activeLyricIndex) {
            setActiveLyricIndex(newIndex);
            const activeElement = document.getElementById(`lyric-line-${newIndex}`);
            if (activeElement) {
                activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }
    }, [currentTime, currentTrack, activeLyricIndex, isLyricsViewOpen]);

    // Fetch lyrics if missing
    useEffect(() => {
        if (isLyricsViewOpen && currentTrack && !currentTrack.lyrics && !isFetching) {
            setIsFetching(true);
            fetchLyrics(currentTrack.title, currentTrack.artist || "", currentTrack.id, currentTrack.duration ?? undefined)
                .then(lyrics => {
                    if (lyrics) updateTrackLyrics(currentTrack.id, lyrics);
                })
                .finally(() => setIsFetching(false));
        }
    }, [isLyricsViewOpen, currentTrack]);

    if (!isLyricsViewOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-[60] bg-background text-foreground flex flex-col overflow-hidden"
            >
                {/* Background Blur */}
                <div className="absolute inset-0 z-0">
                    <Image
                        src={currentTrack?.cover || '/SL.png'}
                        alt="Background"
                        fill
                        className="object-cover opacity-30 blur-[100px] scale-110"
                        unoptimized
                    />
                    <div className="absolute inset-0 bg-black/60" />
                </div>

                {/* Header */}
                <div className="relative z-10 flex items-center justify-between pt-14 p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-full">
                            <Mic2 className="h-6 w-6 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold tracking-tight">Lyrics Mode</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={toggleLyricsView} className="rounded-full hover:bg-white/10 h-10 w-10">
                        <X className="h-6 w-6" />
                    </Button>
                </div>

                {/* Content Grid */}
                <div className="relative z-10 flex-1 grid grid-cols-4 gap-8 px-8 pb-24 h-full">

                    {/* LYRICS COL (3/4) */}
                    <div className="col-span-3 h-full overflow-hidden mask-linear-fade">
                        <ScrollArea className="h-full pr-4">
                            <div className="flex flex-col gap-6 py-[50vh]">
                                {currentTrack?.lyrics && currentTrack.lyrics.length > 0 ? (
                                    currentTrack.lyrics.map((line, index) => (
                                        <p
                                            key={index}
                                            id={`lyric-line-${index}`}
                                            className={cn(
                                                "text-4xl font-bold transition-all duration-500 origin-left cursor-pointer hover:text-white/80",
                                                activeLyricIndex === index
                                                    ? "text-white scale-100 opacity-100"
                                                    : "text-muted-foreground/40 scale-95 blur-[1px]"
                                            )}
                                        >
                                            {line.text}
                                        </p>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center opacity-50 h-[20vh]">
                                        <Music2 className="h-20 w-20 mb-4" />
                                        <p className="text-2xl font-medium">No lyrics available</p>
                                    </div>
                                )}

                                {/* Lyrics Credit */}
                                <div className="mt-12 pt-8 border-t border-white/10 opacity-30 hover:opacity-100 transition-opacity">
                                    <p className="text-sm font-medium">Lyrics provided by LRCLIB • Supporting the community</p>
                                </div>
                            </div>
                        </ScrollArea>
                    </div>

                    {/* NOW PLAYING INFO COL (1/4) */}
                    <div className="col-span-1 h-full flex flex-col justify-center items-center">
                        <div className="w-full aspect-square relative rounded-2xl overflow-hidden shadow-2xl mb-8 border border-white/10">
                            <Image
                                src={currentTrack?.cover || '/SL.png'}
                                alt={currentTrack?.title || 'Cover'}
                                fill
                                className="object-cover"
                                unoptimized
                            />
                        </div>
                        <div className="text-center space-y-2">
                            <h1 className="text-2xl font-black uppercase leading-tight tracking-tight">
                                {currentTrack?.title || 'No Track'}
                            </h1>
                            <p className="text-lg text-primary font-medium">
                                {currentTrack?.artist}
                            </p>
                        </div>

                        {/* Playback Controls */}
                        <div className="mt-8 flex items-center gap-6">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={playPrev}
                                className="h-12 w-12 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all outline-none"
                            >
                                <SkipBack className="h-8 w-8 fill-current" />
                            </Button>

                            <Button
                                size="icon"
                                onClick={togglePlayPause}
                                className="h-16 w-16 rounded-full bg-white text-black hover:bg-white/90 hover:scale-105 transition-all shadow-xl flex items-center justify-center outline-none"
                            >
                                {isPlaying ? (
                                    <Pause className="h-8 w-8 fill-current" />
                                ) : (
                                    <Play className="h-8 w-8 fill-current ml-1" />
                                )}
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={playNext}
                                className="h-12 w-12 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all outline-none"
                            >
                                <SkipForward className="h-8 w-8 fill-current" />
                            </Button>
                        </div>
                    </div>

                </div>
            </motion.div>
        </AnimatePresence>
    );
};
