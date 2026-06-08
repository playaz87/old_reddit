import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ajsoftware.oldreddit',
  appName: 'Old Reddit',
  webDir: 'dist',
  android: {
    // Reddit is fully https; no need to allow mixed content.
    allowMixedContent: false,
  },
};

export default config;
