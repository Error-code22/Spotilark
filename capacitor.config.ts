import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.spotilark.app',
  appName: 'Spotilark',
  webDir: 'out',
  server: {
    // For local dev, uncomment and set to your machine's IP:
    // url: 'http://YOUR_IP:9002',
    // cleartext: true,
    allowNavigation: ['*'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: true,
      spinnerColor: '#ffffff',
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
} as CapacitorConfig & { customScheme: string };

Object.assign(config, { customScheme: 'spotilark' });

export default config;
