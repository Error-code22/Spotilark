'use client';

import { ReactNode } from 'react';
import AppProviders from '@/components/AppProviders';
import { ThemeProvider } from '@/context/ThemeContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AppProviders>
        {children}
      </AppProviders>
    </ThemeProvider>
  );
}