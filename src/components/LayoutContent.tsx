'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';

import { TauriUpdater } from "./TauriUpdater";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { fontStyle, fontSize } = useSettings();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const fontSizeMap: Record<string, string> = {
      'small': '85%',
      'medium': '100%',
      'large': '120%',
      'extra-large': '150%',
    };

    const fontFamilyMap: Record<string, string> = {
      'Inter': 'Inter, sans-serif',
      'Serif': 'Georgia, serif',
      'Mono': 'monospace',
      'OpenDyslexic': 'OpenDyslexic, sans-serif',
      'Comic': '"Comic Sans MS", "Comic Sans", cursive',
    };

    const root = document.documentElement;
    const body = document.body;

    // Apply Font Family
    const selectedFont = fontFamilyMap[fontStyle] || fontFamilyMap['Inter'];

    // Set direct styles
    root.style.fontFamily = selectedFont;
    body.style.fontFamily = selectedFont;

    // IMPORTANT: Override the Tailwind variable used globally
    root.style.setProperty('--font-caveat', selectedFont);

    // Apply Font Size (Root scaling)
    const selectedSize = fontSizeMap[fontSize] || fontSizeMap['medium'];
    root.style.fontSize = selectedSize;

  }, [isMounted, fontStyle, fontSize]);

  return (
    <div className="min-h-screen">
      <TauriUpdater />
      {children}
    </div>
  );
}