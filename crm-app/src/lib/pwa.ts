import { registerSW } from 'virtual:pwa-register';

declare global {
  interface Window {
    Capacitor?: { isNativePlatform?: () => boolean };
  }
}

/** True inside the Capacitor-wrapped Android app, where a cached service worker would only fight the native shell. */
export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();
}

type Listener = () => void;
const listeners = new Set<Listener>();
let updateAvailable = false;
let reloadSW: (() => Promise<void>) | undefined;

export function onPwaUpdate(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function isPwaUpdateAvailable(): boolean {
  return updateAvailable;
}

export function applyPwaUpdate(): void {
  void reloadSW?.();
}

/** Registers the production service worker. Skipped entirely in dev and inside the native Android shell. */
export function setupServiceWorker(): void {
  if (isNativeApp() || !('serviceWorker' in navigator)) return;
  reloadSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateAvailable = true;
      listeners.forEach((l) => l());
    },
  });
}
