import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.spotilark.app',
  appName: 'spotilark',
  webDir: 'out',
  server: {
    url: 'http://192.168.2.12:9002',
    cleartext: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
