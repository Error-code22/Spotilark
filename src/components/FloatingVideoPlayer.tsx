'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import X from 'lucide-react/icons/x';
import Maximize from 'lucide-react/icons/maximize-2';
import Minimize from 'lucide-react/icons/minimize-2';
import Play from 'lucide-react/icons/play';
import Pause from 'lucide-react/icons/pause';
import Volume2 from 'lucide-react/icons/volume-2';
import VolumeX from 'lucide-react/icons/volume-x';
import { Button } from '@/components/ui/button';

interface FloatingVideoPlayerProps {
  videoSrc: string;
  onClose: () => void;
}

export function FloatingVideoPlayer({ videoSrc, onClose }: FloatingVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isPlaying, currentTime, togglePlayPause } = usePlayer();

  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Sync play/pause with main player
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) v.play().catch(() => {});
    else v.pause();
  }, [isPlaying]);

  // Sync seek position (correct drift > 0.75s)
  useEffect(() => {
    const v = videoRef.current;
    if (!v || v.readyState < 2) return;
    if (Math.abs(v.currentTime - currentTime) > 0.75) {
      v.currentTime = currentTime;
    }
  }, [currentTime]);

  // Track video progress
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTimeUpdate = () => {
      setVideoProgress(v.currentTime);
      setVideoDuration(v.duration || 0);
    };
    v.addEventListener('timeupdate', onTimeUpdate);
    return () => v.removeEventListener('timeupdate', onTimeUpdate);
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    const rect = containerRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.current.y)),
      });
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const touch = e.touches[0];
    setIsDragging(true);
    const rect = containerRef.current.getBoundingClientRect();
    dragOffset.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 100, touch.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 100, touch.clientY - dragOffset.current.y)),
      });
    };
    const handleTouchEnd = () => setIsDragging(false);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  // Mini player
  if (isMinimized) {
    return (
      <div
        ref={containerRef}
        className="fixed z-[60] cursor-move active:cursor-grabbing"
        style={{ left: position.x, top: position.y }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="w-48 sm:w-64 rounded-xl overflow-hidden shadow-2xl border border-border bg-card">
          <div className="flex items-center justify-between px-2 py-1 bg-card/80">
            <span className="text-xs font-bold text-foreground truncate">Video</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 min-w-0" onClick={() => setIsMinimized(false)}>
                <Maximize className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 min-w-0" onClick={onClose}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <video ref={videoRef} src={videoSrc} playsInline muted className="w-full h-28 sm:h-36 object-cover" />
        </div>
      </div>
    );
  }

  // Full player
  const progressPercent = videoDuration > 0 ? (videoProgress / videoDuration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="fixed z-[60] cursor-move active:cursor-grabbing"
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className="w-[calc(100vw-2rem)] sm:w-[480px] max-w-[480px] rounded-2xl overflow-hidden shadow-2xl border border-border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-card/80 backdrop-blur-md">
          <span className="text-xs font-bold text-foreground">Now Playing (Video)</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9 min-w-0" onClick={() => setIsMinimized(true)}>
              <Minimize className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 min-w-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Video */}
        <video ref={videoRef} src={videoSrc} playsInline className="w-full aspect-video object-contain bg-black" />

        {/* Controls */}
        <div className="px-3 py-2 bg-card/80 backdrop-blur-md">
          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden mb-2">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-10 w-10 min-w-0" onClick={togglePlayPause}>
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 min-w-0" onClick={toggleMute}>
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {formatTime(videoProgress)} / {formatTime(videoDuration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
