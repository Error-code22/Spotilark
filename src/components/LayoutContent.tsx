'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { fontStyle, fontSize } = useSettings();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Register Service Worker for PWA
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[SW] Registration successful with scope: ', registration.scope);
        })
        .catch((err) => {
          console.log('[SW] Registration failed: ', err);
        });
    }
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
      'Comic': '"Comic Sans MS", "Comic Sans", cursive',
    };

    const root = document.documentElement;
    const body = document.body;

    const selectedFont = fontFamilyMap[fontStyle] || fontFamilyMap['Inter'];
    root.style.fontFamily = selectedFont;
    body.style.fontFamily = selectedFont;
    root.style.setProperty('--font-caveat', selectedFont);

    const selectedSize = fontSizeMap[fontSize] || fontSizeMap['medium'];
    root.style.fontSize = selectedSize;

  }, [isMounted, fontStyle, fontSize]);

  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
