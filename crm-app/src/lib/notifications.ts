import { useEffect, useRef } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useStore } from '@/store';
import { useTasks } from '@/store/selectors';
import { isNativeApp } from './pwa';

const NOTIFIED_KEY = 'careva-crm-notified-tasks';

/** Composite `${taskId}:${dueAt}` keys so an edited due date is treated as a fresh reminder. */
function getNotified(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveNotified(set: Set<string>) {
  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...set].slice(-300)));
  } catch {
    // storage unavailable (private mode, etc.) — reminders still work for this session
  }
}

/** Capacitor local-notification ids must be 32-bit ints; hash the task id into one. */
function taskNotificationId(taskId: string): number {
  let h = 0;
  for (let i = 0; i < taskId.length; i++) h = (h * 31 + taskId.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

export function notificationsSupported(): boolean {
  if (isNativeApp()) return true;
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<'granted' | 'denied'> {
  if (isNativeApp()) {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted' ? 'granted' : 'denied';
  }
  if (!notificationsSupported()) return 'denied';
  const current = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  return current === 'granted' ? 'granted' : 'denied';
}

/**
 * Reminds the user when one of their open tasks comes due.
 * Native (the Android app): schedules real OS alarms via @capacitor/local-notifications — they
 * fire even if the app is closed, and are kept in sync (rescheduled on edit, cancelled on
 * done/delete) whenever the task list changes.
 * Web/PWA: polls once a minute and fires a browser Notification while the tab is open.
 */
export function useTaskReminders(enabled: boolean) {
  const tasks = useTasks();
  const profileId = useStore((s) => s.currentProfileId);
  const notifiedRef = useRef<Set<string> | null>(null);
  if (!notifiedRef.current) notifiedRef.current = getNotified();

  useEffect(() => {
    const relevant = tasks.filter((t) => !t.done && (!profileId || !t.assigneeId || t.assigneeId === profileId));

    if (isNativeApp()) {
      if (!enabled) {
        void LocalNotifications.getPending().then((p) => {
          if (p.notifications.length) void LocalNotifications.cancel({ notifications: p.notifications.map((n) => ({ id: n.id })) });
        });
        return;
      }

      let cancelled = false;
      void (async () => {
        const notified = notifiedRef.current!;
        const relevantIds = new Set(relevant.map((t) => taskNotificationId(t.id)));
        try {
          const pending = await LocalNotifications.getPending();
          const stale = pending.notifications.filter((n) => !relevantIds.has(n.id));
          if (stale.length) await LocalNotifications.cancel({ notifications: stale.map((n) => ({ id: n.id })) });
        } catch {
          // getPending/cancel can fail without permission — scheduling below will surface that
        }

        const toSchedule = relevant.filter((t) => !notified.has(`${t.id}:${t.dueAt}`));
        if (cancelled || toSchedule.length === 0) return;
        try {
          await LocalNotifications.schedule({
            notifications: toSchedule.map((t) => ({
              id: taskNotificationId(t.id),
              title: 'Careva+ CRM — task due',
              body: t.title,
              schedule: { at: new Date(t.dueAt), allowWhileIdle: true },
            })),
          });
          toSchedule.forEach((t) => notified.add(`${t.id}:${t.dueAt}`));
          saveNotified(notified);
        } catch {
          // no permission yet — the Settings toggle surfaces that before enabling
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    // ── Web / PWA path ──
    if (!enabled || !notificationsSupported()) return;
    const check = () => {
      if (Notification.permission !== 'granted') return;
      const notified = notifiedRef.current!;
      const now = Date.now();
      let changed = false;
      for (const t of relevant) {
        const key = `${t.id}:${t.dueAt}`;
        if (new Date(t.dueAt).getTime() > now || notified.has(key)) continue;
        try {
          const n = new Notification('Careva+ CRM — task due', { body: t.title, tag: t.id, icon: '/icons/icon-192.png' });
          n.onclick = () => {
            window.focus();
            n.close();
          };
        } catch {
          // Notification constructor can throw in some embedded/webview contexts
        }
        notified.add(key);
        changed = true;
      }
      if (changed) saveNotified(notified);
    };
    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [enabled, tasks, profileId]);
}
