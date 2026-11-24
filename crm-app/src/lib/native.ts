import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNativeApp } from './pwa';

let wired = false;

/** One-time native-shell setup: status bar, hardware back button, no pinch-zoom. Safe to call on web (no-ops). */
export function setupNativeShell(): void {
  if (!isNativeApp() || wired) return;
  wired = true;

  void StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
  void StatusBar.setStyle({ style: Style.Dark }).catch(() => {});

  // The app, unlike the web/PWA build, isn't meant to pinch-zoom.
  const viewport = document.querySelector('meta[name="viewport"]');
  viewport?.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else void App.exitApp();
  });
}

/** Reveals the app behind the native splash screen — call once the first real screen is ready to paint. */
export function hideNativeSplash(): void {
  if (!isNativeApp()) return;
  void SplashScreen.hide().catch(() => {});
}

export function haptic(style: ImpactStyle = ImpactStyle.Light): void {
  if (!isNativeApp()) return;
  void Haptics.impact({ style }).catch(() => {});
}

export function hapticNotification(type: NotificationType = NotificationType.Success): void {
  if (!isNativeApp()) return;
  void Haptics.notification({ type }).catch(() => {});
}

export { ImpactStyle, NotificationType };
