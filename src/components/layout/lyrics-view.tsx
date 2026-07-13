"use client";

import { usePlayer } from "@/context/PlayerContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, Music2 } from "lucide-react";
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
    } = usePlayer();
    const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
    const lyricsContainerRef = useRef<HTMLDivElement>(null);
    const [isFetching, setIsFetching] = useState(false);

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
                className="fixed inset-0 z-50 text-white flex flex-col overflow-hidden"
            >
                {/* Blurred Cover Background */}
                <div className="absolute inset-0 z-0">
                    <Image
                        src={currentTrack?.cover || '/spotilark-without-text-white.png'}
                        alt="Background"
                        fill
                        className="object-cover blur-[80px] scale-150"
                        unoptimized
                    />
                    <div className="absolute inset-0 bg-black/60" />
                </div>

                {/* Header */}
                <div className="relative z-10 flex items-center p-4 pt-12">
                    <Button variant="ghost" size="icon" onClick={toggleLyricsView} className="rounded-full hover:bg-white/10 h-10 w-10 text-white">
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                </div>

                {/* Full Lyrics */}
                <div className="relative z-10 flex-1 overflow-hidden px-8 pb-24">
                    <ScrollArea className="h-full">
                        <div className="flex flex-col items-center gap-5 py-[40vh]">
                            {currentTrack?.lyrics && currentTrack.lyrics.length > 0 ? (
                                currentTrack.lyrics.map((line, index) => (
                                    <p
                                        key={index}
                                        id={`lyric-line-${index}`}
                                        className={cn(
                                            "text-4xl font-bold transition-all duration-500 text-center",
                                            activeLyricIndex === index
                                                ? "text-white scale-105"
                                                : "text-white/30"
                                        )}
                                    >
                                        {line.text}
                                    </p>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center opacity-60 h-[40vh]">
                                    <Music2 className="h-20 w-20 mb-4 text-white/40" />
                                    <p className="text-2xl font-medium text-white/60">No lyrics available</p>
                                </div>
                            )}

                            <div className="mt-12 pt-8 border-t border-white/10 opacity-30 hover:opacity-100 transition-opacity">
                                <p className="text-sm font-medium">Lyrics provided by LRCLIB</p>
                            </div>
                        </div>
                    </ScrollArea>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
