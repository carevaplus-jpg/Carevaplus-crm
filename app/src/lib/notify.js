import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import { App as CapApp } from "@capacitor/app";

/* ------------------------------------------------------------------
 * Notifications
 *  - in-app banner (iOS style, top of screen) + sound + vibration
 *  - when the app is in the background: a real phone notification
 *    (Android: local notification; browser: Notification API)
 *  - when the app is closed: Firebase push, sent by the `push` edge
 *    function (enabled once android/app/google-services.json exists)
 *  "go" is where tapping a notification takes the user, e.g. "chat",
 *  "alerts", "messages:S101".
 * ------------------------------------------------------------------ */
export const NATIVE = Capacitor.isNativePlatform();
export const FCM_ENABLED = import.meta.env.VITE_FCM === "1";

const listeners = new Set();
export const onBanner = (f) => (listeners.add(f), () => listeners.delete(f));
let foreground = true;

export function go(target) {
  if (target) window.dispatchEvent(new CustomEvent("careva:go", { detail: target }));
}

export function notify({ id, title, body, tone = "msg", go: target }) {
  const n = { id: id || Math.random().toString(36).slice(2), title, body, tone, go: target, at: Date.now() };
  const hidden = document.hidden || !foreground;
  if (!hidden) {
    listeners.forEach((f) => f(n));
    chime(tone);
    try { navigator.vibrate?.(tone === "sos" ? [300, 120, 300, 120, 600] : [40, 60, 40]); } catch {}
    return;
  }
  if (NATIVE) {
    LocalNotifications.schedule({
      notifications: [{ id: (Date.now() % 2147483000) | 0, title, body, channelId: tone === "sos" ? "careva-sos" : "careva", extra: { go: target }, smallIcon: "ic_stat_careva" }],
    }).catch(() => {});
  } else if ("Notification" in window && Notification.permission === "granted") {
    try { const w = new Notification(title, { body, tag: n.id, icon: "/icon-192.png", requireInteraction: tone === "sos" }); w.onclick = () => { window.focus(); go(target); w.close(); }; } catch {}
  }
}

/* soft two-tone chime (or a siren-like triple for SOS) made with WebAudio — no audio files needed */
let ctx;
export function chime(tone = "msg") {
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    const notes = tone === "sos" ? [880, 660, 880, 660, 880] : tone === "alert" ? [740, 988] : [988, 1319];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * (tone === "sos" ? 0.22 : 0.13);
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(tone === "sos" ? 0.35 : 0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.4);
    });
  } catch {}
}

/** Ask for permission, create Android channels, register for push. Safe to call more than once. */
let inited = false;
export async function initNotifications(registerToken) {
  if (inited) return; inited = true;
  document.addEventListener("visibilitychange", () => { foreground = !document.hidden; });
  if (!NATIVE) {
    if ("Notification" in window && Notification.permission === "default") {
      const ask = () => { Notification.requestPermission().catch(() => {}); window.removeEventListener("pointerdown", ask); };
      window.addEventListener("pointerdown", ask, { once: true }); // browsers need a user gesture
    }
    return;
  }
  CapApp.addListener("appStateChange", ({ isActive }) => { foreground = isActive; });
  try {
    await LocalNotifications.requestPermissions();
    await LocalNotifications.createChannel({ id: "careva", name: "Messages & updates", importance: 5, visibility: 1, vibration: true, sound: "default" });
    await LocalNotifications.createChannel({ id: "careva-sos", name: "SOS emergencies", importance: 5, visibility: 1, vibration: true, sound: "default" });
    LocalNotifications.addListener("localNotificationActionPerformed", (a) => go(a.notification?.extra?.go));
  } catch {}
  if (!FCM_ENABLED) return;
  try {
    const p = await PushNotifications.requestPermissions();
    if (p.receive !== "granted") return;
    await PushNotifications.createChannel({ id: "careva", name: "Messages & updates", importance: 5, visibility: 1, vibration: true });
    await PushNotifications.createChannel({ id: "careva-sos", name: "SOS emergencies", importance: 5, visibility: 1, vibration: true });
    PushNotifications.addListener("registration", (t) => registerToken(t.value).catch(() => {}));
    PushNotifications.addListener("pushNotificationActionPerformed", (a) => go(a.notification?.data?.go));
    await PushNotifications.register();
  } catch {}
}
