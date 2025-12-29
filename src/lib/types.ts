export type LightTheme =
  | 'theme-light-classic-white'
  | 'theme-light-soft-gray'
  | 'theme-light-warm-beige'
  | 'theme-light-pastel-sky'
  | 'theme-light-minty-fresh';

export type DarkTheme =
  | 'theme-dark-classic-dark'
  | 'theme-dark-slate-gray'
  | 'theme-dark-midnight-blue'
  | 'theme-dark-coffee-dark'
  | 'theme-dark-forest-night';

export interface ThemeSettings {
  mode: 'light' | 'dark';
  lightTheme: LightTheme;
  darkTheme: DarkTheme;
}

// Ensure your User type includes this optional field
export interface User {
  id: string;
  email?: string;
  // ... other user fields
  themeSettings?: ThemeSettings;
}