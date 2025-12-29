'use client';

import { useTheme } from '@/context/ThemeContext';
import type { LightTheme, DarkTheme } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const lightThemes: { value: LightTheme; label: string }[] = [
    { value: 'theme-light-classic-white', label: 'Classic White' },
    { value: 'theme-light-soft-gray', label: 'Soft Gray' },
    { value: 'theme-light-warm-beige', label: 'Warm Beige' },
    { value: 'theme-light-pastel-sky', label: 'Pastel Sky' },
    { value: 'theme-light-minty-fresh', label: 'Minty Fresh' },
];

const darkThemes: { value: DarkTheme; label: string }[] = [
    { value: 'theme-dark-classic-dark', label: 'Classic Dark' },
    { value: 'theme-dark-slate-gray', label: 'Slate Gray' },
    { value: 'theme-dark-midnight-blue', label: 'Midnight Blue' },
    { value: 'theme-dark-coffee-dark', label: 'Coffee Dark' },
    { value: 'theme-dark-forest-night', label: 'Forest Night' },
];

export function ThemeSelector() {
  const { theme: currentMode, setTheme, lightTheme, setLightTheme, darkTheme, setDarkTheme } = useTheme();

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="font-medium">Color Mode</h3>
        <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
          <Label htmlFor="dark-mode-switch">Enable Dark Mode</Label>
          <Switch
            id="dark-mode-switch"
            checked={currentMode === 'dark'}
            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium">Light Theme</h3>
        <Select 
          onValueChange={(value: LightTheme) => setLightTheme(value)} 
          value={lightTheme} 
          disabled={currentMode === 'dark'}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a light theme" />
          </SelectTrigger>
          <SelectContent>
            {lightThemes.map(theme => (
              <SelectItem key={theme.value} value={theme.value}>{theme.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium">Dark Theme</h3>
        <Select 
          onValueChange={(value: DarkTheme) => setDarkTheme(value)} 
          value={darkTheme} 
          disabled={currentMode === 'light'}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a dark theme" />
          </SelectTrigger>
          <SelectContent>
            {darkThemes.map(theme => (
              <SelectItem key={theme.value} value={theme.value}>{theme.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}