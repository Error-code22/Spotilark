export type LightTheme =
  | 'theme-light-classic-white'
  | 'theme-light-soft-gray'
  | 'theme-light-warm-beige'
  | 'theme-light-pastel-sky';

export type DarkTheme =
  | 'theme-dark-classic-dark'
  | 'theme-dark-midnight-blue'
  | 'theme-dark-deep-purple'
  | 'theme-dark-obsidian';

export interface ThemeSettings {
  mode: 'light' | 'dark';
  lightTheme: LightTheme;
  darkTheme: DarkTheme;
}

export interface User {
  id: string;
  email?: string;
  themeSettings?: ThemeSettings;
}
