'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { LightTheme, DarkTheme, ThemeSettings } from '@/lib/types';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  lightTheme: LightTheme;
  setLightTheme: (theme: LightTheme) => void;
  darkTheme: DarkTheme;
  setDarkTheme: (theme: DarkTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [lightTheme, setLightThemeState] = useState<LightTheme>('theme-light-classic-white');
  const [darkTheme, setDarkThemeState] = useState<DarkTheme>('theme-dark-midnight-blue');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const supabase = createClient();

  const saveThemeSettings = useCallback(async (settings: Partial<ThemeSettings>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // In a real implementation, you would store this in your user profile table
      // For now, we'll just use localStorage
      localStorage.setItem('user-theme-settings', JSON.stringify({
        mode: theme,
        lightTheme: lightTheme,
        darkTheme: darkTheme,
        ...settings,
      }));
    }
  }, [supabase, theme, lightTheme, darkTheme]);

  useEffect(() => {
    const applyStoredThemes = () => {
      const storedTheme = localStorage.getItem('theme-mode') as Theme | null;
      const storedLightTheme = localStorage.getItem('theme-light') as LightTheme | null;
      const storedDarkTheme = localStorage.getItem('theme-dark') as DarkTheme | null;
      const storedUserSettings = localStorage.getItem('user-theme-settings');

      if (storedUserSettings) {
        try {
          const settings: ThemeSettings = JSON.parse(storedUserSettings);
          setThemeState(settings.mode);
          setLightThemeState(settings.lightTheme);
          setDarkThemeState(settings.darkTheme);
        } catch (e) {
          // Fallback to individual theme settings if user settings are corrupted
          if (storedTheme) setThemeState(storedTheme);
          if (storedLightTheme) setLightThemeState(storedLightTheme);
          if (storedDarkTheme) setDarkThemeState(storedDarkTheme);
        }
      } else {
        // Fallback to individual theme settings
        if (storedTheme) setThemeState(storedTheme);
        if (storedLightTheme) setLightThemeState(storedLightTheme);
        if (storedDarkTheme) setDarkThemeState(storedDarkTheme);
      }
    };

    applyStoredThemes();
    setIsInitialLoad(false);
  }, []);

  useEffect(() => {
    if (isInitialLoad) return;

    const body = window.document.body;
    
    // Remove existing theme classes
    body.classList.remove('light', 'dark');
    body.classList.forEach(className => {
      if (className.startsWith('theme-')) {
        body.classList.remove(className);
      }
    });

    // Apply theme class
    body.classList.add(theme);

    // Apply specific theme variant
    if (theme === 'light') {
      body.classList.add(lightTheme);
    } else {
      body.classList.add(darkTheme);
    }

    // Update localStorage
    localStorage.setItem('theme-mode', theme);
    localStorage.setItem('theme-light', lightTheme);
    localStorage.setItem('theme-dark', darkTheme);

    // Save to user profile if logged in
    saveThemeSettings({
      mode: theme,
      lightTheme: lightTheme,
      darkTheme: darkTheme,
    });
  }, [theme, lightTheme, darkTheme, isInitialLoad, saveThemeSettings]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setLightTheme = (newTheme: LightTheme) => {
    setLightThemeState(newTheme);
  };

  const setDarkTheme = (newTheme: DarkTheme) => {
    setDarkThemeState(newTheme);
  };

  const value = {
    theme,
    setTheme,
    lightTheme,
    setLightTheme,
    darkTheme,
    setDarkTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}