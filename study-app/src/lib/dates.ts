export const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar day key, e.g. 2026-11-22. */
export function dayKey(d: Date | number = new Date()): string {
  const x = typeof d === 'number' ? new Date(d) : d;
  const m = `${x.getMonth() + 1}`.padStart(2, '0');
  const day = `${x.getDate()}`.padStart(2, '0');
  return `${x.getFullYear()}-${m}-${day}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function startOfWeek(d = new Date()): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Monday = 0
  return addDays(x, -dow);
}

export function daysUntil(target: string | number | Date, from = new Date()): number {
  const t = target instanceof Date ? target : new Date(target);
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  return Math.round((b - a) / DAY_MS);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const weekdayShort = (d: Date) => WEEKDAYS[d.getDay()];
export const monthShort = (d: Date) => MONTHS[d.getMonth()];
export const prettyDate = (d: Date) => `${weekdayShort(d)}, ${d.getDate()} ${monthShort(d)}`;
export const fullDate = (d: Date) => `${d.getDate()} ${monthShort(d)} ${d.getFullYear()}`;

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Late-night focus';
}

export function formatMinutes(min: number) {
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function timeAgo(ts: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}
