import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.blocksandloops.sitelog',
  appName: 'SiteLog',
  webDir: 'public',
  server: {
    url: 'https://your-actual-live-vercel-url.vercel.app',
    cleartext: true
  }
};

export default config;