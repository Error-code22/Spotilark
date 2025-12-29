"use client";
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Flux Equalizer Component
 * A sleek, modern equalizer with vertical sliders and preset buttons
 */

type EQBand = {
  id: string;
  freq: number;
  label: string;
  type: BiquadFilterType;
  gain: number;
};

type Preset = {
  name: string;
  gains: Record<string, number>;
};

const DEFAULT_BANDS: EQBand[] = [
  { id: "31", freq: 31, label: "31", type: "lowshelf", gain: 0 },
  { id: "63", freq: 63, label: "63", type: "peaking", gain: 0 },
  { id: "125", freq: 125, label: "125", type: "peaking", gain: 0 },
  { id: "250", freq: 250, label: "250", type: "peaking", gain: 0 },
  { id: "500", freq: 500, label: "500", type: "peaking", gain: 0 },
  { id: "1k", freq: 1000, label: "1K", type: "peaking", gain: 0 },
  { id: "2k", freq: 2000, label: "2K", type: "peaking", gain: 0 },
  { id: "4k", freq: 4000, label: "4K", type: "peaking", gain: 0 },
  { id: "8k", freq: 8000, label: "8K", type: "peaking", gain: 0 },
  { id: "16k", freq: 16000, label: "16K", type: "highshelf", gain: 0 },
];

const PRESETS: Preset[] = [
  { name: "Flat", gains: { "31": 0, "63": 0, "125": 0, "250": 0, "500": 0, "1k": 0, "2k": 0, "4k": 0, "8k": 0, "16k": 0 } },
  { name: "Deep Bass", gains: { "31": 8, "63": 6, "125": 4, "250": 2, "500": 0, "1k": 0, "2k": 0, "4k": 0, "8k": 0, "16k": 0 } },
  { name: "Vivid Vocal", gains: { "31": -2, "63": -1, "125": 0, "250": 2, "500": 4, "1k": 5, "2k": 4, "4k": 3, "8k": 2, "16k": 1 } },
  { name: "Rock", gains: { "31": 5, "63": 4, "125": 2, "250": 0, "500": -1, "1k": 0, "2k": 2, "4k": 4, "8k": 5, "16k": 4 } },
  { name: "Pop", gains: { "31": -1, "63": 0, "125": 2, "250": 3, "500": 4, "1k": 3, "2k": 2, "4k": 3, "8k": 2, "16k": 0 } },
  { name: "Treble Boost", gains: { "31": -2, "63": -1, "125": 0, "250": 0, "500": 0, "1k": 2, "2k": 3, "4k": 5, "8k": 6, "16k": 7 } },
];

export default function FluxEqualizer({ audioId = "spotilark-audio" }: { audioId?: string }) {
  const [enabled, setEnabled] = useState(false);
  const [bands, setBands] = useState<Record<string, number>>(() =>
    DEFAULT_BANDS.reduce((acc, b) => ({ ...acc, [b.id]: b.gain }), {})
  );
  const [activePreset, setActivePreset] = useState("Flat");
  const [audioReady, setAudioReady] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<Record<string, BiquadFilterNode>>({});

  // Initialize audio context and filters
  useEffect(() => {
    const audioEl = document.getElementById(audioId) as HTMLAudioElement | null;
    if (!audioEl) {
      setAudioReady(false);
      return;
    }

    // Check if already connected
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;

    let audioCtx: AudioContext;
    let source: MediaElementAudioSourceNode;

    // Reuse existing Context and Source if available
    if ((audioEl as any)._audioContext && (audioEl as any)._mediaElementSource) {
      audioCtx = (audioEl as any)._audioContext;
      source = (audioEl as any)._mediaElementSource;

      // Resume context if it was suspended (browsers auto-suspend audio contexts sometimes)
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    } else {
      audioCtx = new AudioContextCtor();
      source = audioCtx.createMediaElementSource(audioEl);

      (audioEl as any)._audioContext = audioCtx;
      (audioEl as any)._mediaElementSource = source;
    }

    audioCtxRef.current = audioCtx;
    sourceRef.current = source;

    // Create filter chain
    const filters: Record<string, BiquadFilterNode> = {};
    for (const b of DEFAULT_BANDS) {
      const f = audioCtx.createBiquadFilter();
      f.type = b.type;
      f.frequency.value = b.freq;
      f.Q.value = 1.0;
      f.gain.value = enabled ? (bands[b.id] ?? 0) : 0;
      filters[b.id] = f;
    }
    filtersRef.current = filters;

    // Connect: source -> filters chain -> destination
    let node: AudioNode = source;
    // IMPORTANT: Disconnect source from previous destination (which might be the context destination directly)
    // before connecting to new filters
    try { source.disconnect(); } catch { }

    Object.values(filters).forEach((f) => {
      node.connect(f);
      node = f;
    });
    node.connect(audioCtx.destination);

    setAudioReady(true);

    return () => {
      try {
        // Disconnect filters chain
        Object.values(filters).forEach((f) => f.disconnect());

        // Reconnect source directly to destination so music keeps playing
        if (source && audioCtx) {
          try {
            source.disconnect();
            source.connect(audioCtx.destination);
          } catch { }
        }

        // We do NOT close the AudioContext anymore because we want to reuse it
        // audioCtx.close(); 
      } catch (e) {
        console.error("Cleanup error", e);
      }
      audioCtxRef.current = null;
    };
  }, [audioId]); // Re-run if enabled/bands change? No, better to use separate effects for params.



  // Update filter gains when bands change or enabled toggles
  useEffect(() => {
    for (const id of Object.keys(bands)) {
      const f = filtersRef.current[id];
      if (f) {
        f.gain.value = enabled ? bands[id] : 0;
      }
    }
  }, [bands, enabled]);

  const handleSliderChange = (id: string, value: number) => {
    setBands((prev) => ({ ...prev, [id]: value }));
    setActivePreset("Custom");
  };

  const applyPreset = (preset: Preset) => {
    setBands(preset.gains);
    setActivePreset(preset.name);
  };

  // Convert gain (-12 to +12) to percentage (0 to 100)
  const gainToPercent = (gain: number) => ((gain + 12) / 24) * 100;

  return (
    <div className="w-full max-w-md mx-auto p-6 rounded-3xl bg-gradient-to-br from-card/90 to-card/50 border border-white/10 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-light tracking-widest text-primary uppercase">Equalizer</h2>
        <button
          onClick={() => setEnabled(!enabled)}
          className={cn(
            "w-12 h-6 rounded-full transition-all duration-300 relative",
            enabled ? "bg-primary" : "bg-muted"
          )}
        >
          <span
            className={cn(
              "absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg transition-all duration-300",
              enabled ? "left-7" : "left-1"
            )}
          />
        </button>
      </div>

      {!audioReady && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-700 dark:text-amber-400 text-center">
          🎵 Play a song to use the equalizer
        </div>
      )}

      {/* Slider Grid */}
      <div className="flex justify-between items-end h-48 mb-6 px-1">
        {DEFAULT_BANDS.map((band) => (
          <div key={band.id} className="flex flex-col items-center gap-2">
            {/* Vertical Slider Track */}
            <div
              className="w-3 h-36 bg-white/5 rounded-full relative border border-white/10 cursor-pointer group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickY = e.clientY - rect.top;
                const percent = 1 - clickY / rect.height;
                const gain = Math.round((percent * 24 - 12) * 2) / 2; // -12 to +12, step 0.5
                handleSliderChange(band.id, Math.max(-12, Math.min(12, gain)));
              }}
            >
              {/* Fill */}
              <div
                className={cn(
                  "absolute bottom-0 w-full rounded-full transition-all duration-200",
                  enabled ? "bg-primary shadow-[0_0_12px_var(--primary)]" : "bg-muted-foreground/30"
                )}
                style={{ height: `${gainToPercent(bands[band.id])}%` }}
              />
              {/* Dot indicator */}
              <div
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full transition-all duration-200",
                  enabled ? "bg-white shadow-lg" : "bg-muted-foreground/50"
                )}
                style={{ bottom: `calc(${gainToPercent(bands[band.id])}% - 4px)` }}
              />
            </div>
            {/* Frequency Label */}
            <span className="text-[10px] text-muted-foreground/60">{band.label}</span>
          </div>
        ))}
      </div>

      {/* dB indicator */}
      <div className="flex justify-between text-[9px] text-muted-foreground/40 mb-6 px-2">
        <span>-12 dB</span>
        <span>0</span>
        <span>+12 dB</span>
      </div>

      {/* Preset Grid */}
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => applyPreset(preset)}
            className={cn(
              "py-3 px-2 rounded-xl text-xs font-medium transition-all duration-200 border",
              activePreset === preset.name
                ? "bg-primary text-primary-foreground border-primary shadow-[0_0_15px_var(--primary)]"
                : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            )}
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
}