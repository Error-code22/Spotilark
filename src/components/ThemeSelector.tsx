'use client';

import { useTheme } from '@/context/ThemeContext';
import type { LightTheme, DarkTheme } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const lightThemes: { value: LightTheme; label: string }[] = [
    { value: 'theme-light-classic-white', label: 'Classic White' },
    { value: 'theme-light-soft-gray', label: 'Soft Gray' },
    { value: 'theme-light-warm-beige', label: 'Warm Beige' },
    { value: 'theme-light-pastel-sky', label: 'Pastel Sky' },
];

const darkThemes: { value: DarkTheme; label: string }[] = [
    { value: 'theme-dark-classic-dark', label: 'Classic Dark' },
    { value: 'theme-dark-midnight-blue', label: 'Midnight Blue' },
    { value: 'theme-dark-deep-purple', label: 'Deep Purple' },
    { value: 'theme-dark-obsidian', label: 'Obsidian' },
];

export function ThemeSelector() {
  const { theme: currentMode, setTheme, lightTheme, setLightTheme, darkTheme, setDarkTheme, wallpaper, setWallpaper } = useTheme();

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

      <div className="space-y-4">
        <h3 className="font-medium">NowPlaying Wallpaper</h3>
        <div className="space-y-3">
          {wallpaper && (
            <div className="relative w-full h-32 rounded-lg overflow-hidden border border-white/10">
              <img src={wallpaper} alt="Wallpaper preview" className="w-full h-full object-cover" />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => setWallpaper(null)}
              >
                Clear Wallpaper
              </Button>
            </div>
          )}
          <div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="wallpaper-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setWallpaper(reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <Label
              htmlFor="wallpaper-input"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
            >
              {wallpaper ? 'Change Wallpaper' : 'Set Custom Wallpaper'}
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
