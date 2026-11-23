import { useEffect, useRef } from 'react';
import { useStore } from '@/store';
import { useTasks } from '@/store/selectors';

const NOTIFIED_KEY = 'careva-crm-notified-tasks';

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

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  if (Notification.permission === 'default') return Notification.requestPermission();
  return Notification.permission;
}

/** Polls open tasks and fires a local notification the first time each becomes due. */
export function useTaskReminders(enabled: boolean) {
  const tasks = useTasks();
  const profileId = useStore((s) => s.currentProfileId);
  const notifiedRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!enabled || !notificationsSupported()) return;
    if (!notifiedRef.current) notifiedRef.current = getNotified();

    const check = () => {
      if (Notification.permission !== 'granted') return;
      const notified = notifiedRef.current!;
      const now = Date.now();
      let changed = false;
      for (const t of tasks) {
        if (t.done) continue;
        if (profileId && t.assigneeId && t.assigneeId !== profileId) continue;
        if (new Date(t.dueAt).getTime() > now || notified.has(t.id)) continue;
        try {
          const n = new Notification('Careva+ CRM — task due', {
            body: t.title,
            tag: t.id,
            icon: '/icons/icon-192.png',
          });
          n.onclick = () => {
            window.focus();
            n.close();
          };
        } catch {
          // Notification constructor can throw in some embedded/webview contexts
        }
        notified.add(t.id);
        changed = true;
      }
      if (changed) saveNotified(notified);
    };

    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [enabled, tasks, profileId]);
}
