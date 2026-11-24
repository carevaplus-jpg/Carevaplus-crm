import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.carevaplus.crm',
  appName: 'Careva+ CRM',
  webDir: 'dist',
  backgroundColor: '#0B1220',
  android: {
    backgroundColor: '#0B1220',
    // Edge-to-edge is enforced from Android 15 (targetSdk 35+) regardless of this flag —
    // the app draws behind system bars and src/lib/native.ts pads content via safe-area insets.
    initialFocus: false,
  },
  plugins: {
    // We hide the splash ourselves once the store has hydrated (src/lib/native.ts), so the
    // app never shows a blank frame between the native splash and the first real screen.
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: '#0B1220',
      androidScaleType: 'CENTER_CROP',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
