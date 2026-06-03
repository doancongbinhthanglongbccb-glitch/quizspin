import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.quizspin.app',
  appName: 'QuizSpin',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    usesPermission: ['android.permission.WAKE_LOCK'],
  },
};

export default config;
