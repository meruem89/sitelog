import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.blocksandloops.sitelog',
  appName: 'SiteLog',
  webDir: 'public',
  server: {
    url: 'https://sitelog-m3og.vercel.app',
    cleartext: true
  }
};

export default config;