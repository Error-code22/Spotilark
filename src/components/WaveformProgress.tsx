'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn, formatTime } from '@/lib/utils';

const N_BARS = 180;
const BAR_GAP = 1;

const waveCache = new Map<string, Float32Array>();

function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

function generateSyntheticBars(trackId: string): Float32Array {
  const rng = seededRandom(hashString(trackId));
  const bars = new Float32Array(N_BARS);
  for (let i = 0; i < N_BARS; i++) {
    const envelope = Math.sin((i / N_BARS) * Math.PI);
    const rawHeight = 0.15 + rng() * 0.85;
    bars[i] = Math.max(0.1, Math.min(1, rawHeight * 0.6 + envelope * 0.4));
  }
  return bars;
}

async function decodeWaveform(url: string, trackId: string): Promise<Float32Array> {
  if (waveCache.has(trackId)) return waveCache.get(trackId)!;

  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const ctx = new AudioContext();
  const audio = await ctx.decodeAudioData(buf);
  await ctx.close();

  const raw = audio.getChannelData(0);
  const chunk = Math.floor(raw.length / N_BARS);
  const bars = new Float32Array(N_BARS);
  for (let i = 0; i < N_BARS; i++) {
    let sum = 0;
    const start = i * chunk;
    for (let j = 0; j < chunk; j++) sum += Math.abs(raw[start + j]);
    bars[i] = sum / chunk;
  }
  const max = Math.max(...bars, 0.001);
  for (let i = 0; i < N_BARS; i++) bars[i] /= max;

  waveCache.set(trackId, bars);
  return bars;
}

interface WaveformProgressProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  className?: string;
  trackUrl?: string;
  trackId?: string;
  isLocal?: boolean;
}

export default function WaveformProgress({ currentTime, duration, onSeek, className, trackUrl, trackId, isLocal }: WaveformProgressProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bars, setBars] = useState<Float32Array | null>(null);
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    setBars(null);
    if (!trackId) return;

    if (waveCache.has(trackId)) {
      setBars(waveCache.get(trackId)!);
      return;
    }

    if (!trackUrl) {
      setBars(generateSyntheticBars(trackId));
      return;
    }

    if (isLocal && trackUrl.startsWith('blob:')) {
      let cancelled = false;
      decodeWaveform(trackUrl, trackId)
        .then((b) => { if (!cancelled) setBars(b); })
        .catch(() => {
          if (!cancelled) setBars(generateSyntheticBars(trackId));
        });
      return () => { cancelled = true; };
    }

    setBars(generateSyntheticBars(trackId));
  }, [trackUrl, trackId, isLocal]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const style = getComputedStyle(document.documentElement);
    const primary = style.getPropertyValue('--primary').trim() || '24.6 95% 53.1%';
    const muted = style.getPropertyValue('--muted-foreground').trim() || '0 0% 63.9%';

    const W = canvas.width;
    const H = canvas.height;
    if (W === 0 || H === 0) return;
    ctx.clearRect(0, 0, W, H);

    const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
    const hover = hoverRatio;

    if (!bars) {
      const barH = Math.max(4, H * 0.12);
      const y = (H - barH) / 2;
      ctx.fillStyle = `hsl(${primary} / 0.3)`;
      ctx.fillRect(0, y, W * progress, barH);
      ctx.fillStyle = `hsl(${muted} / 0.15)`;
      ctx.fillRect(W * progress, y, W * (1 - progress), barH);
      return;
    }

    const barW = (W - (N_BARS - 1) * BAR_GAP) / N_BARS;
    const playedX = W * progress;
    const hoverX = hover !== null ? W * hover : null;

    for (let i = 0; i < N_BARS; i++) {
      const x = i * (barW + BAR_GAP);
      const amp = bars[i];
      const barH = Math.max(2, amp * (H - 4));
      const y = (H - barH) / 2;

      const barMid = x + barW / 2;
      const played = barMid < playedX;
      const hovered = hoverX !== null && barMid < hoverX;

      if (played) {
        ctx.fillStyle = `hsl(${primary} / 0.95)`;
      } else if (hovered) {
        ctx.fillStyle = `hsl(${primary} / 0.45)`;
      } else {
        ctx.fillStyle = `hsl(${muted} / 0.2)`;
      }

      ctx.fillRect(x, y, Math.max(1, barW), barH);
    }

    if (progress > 0) {
      ctx.fillStyle = `hsl(${primary} / 0.9)`;
      ctx.fillRect(playedX - 1, 0, 2, H);
    }
  }, [bars, currentTime, duration, hoverRatio]);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setSize = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (w > 0 && h > 0) {
        canvas.width = w * devicePixelRatio;
        canvas.height = h * devicePixelRatio;
        draw();
      }
    };

    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  const ratioFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };

  return (
    <div className={cn('w-full select-none flex items-center gap-2 min-w-0', className)}>
      <span className="text-[10px] font-mono tabular-nums text-muted-foreground/60 w-10 text-right shrink-0">{formatTime(currentTime)}</span>
      <div className="flex-1 min-w-0 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-9 cursor-pointer"
          style={{ imageRendering: 'pixelated' }}
          onClick={(e) => { if (duration > 0) onSeek(ratioFromEvent(e) * duration); }}
          onMouseMove={(e) => setHoverRatio(ratioFromEvent(e))}
          onMouseLeave={() => setHoverRatio(null)}
        />
      </div>
      <span className="text-[10px] font-mono tabular-nums text-muted-foreground/60 w-10 shrink-0">{formatTime(duration)}</span>
    </div>
  );
}
