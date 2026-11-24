const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const inrCompact = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 });

export function money(amount: number, currency: 'INR' | 'USD' = 'INR'): string {
  return currency === 'USD' ? usd.format(amount) : inr.format(amount);
}

export function moneyCompact(amount: number): string {
  return inrCompact.format(amount);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function fullName(c: { firstName: string; lastName: string }): string {
  return `${c.firstName} ${c.lastName}`.trim();
}

const dtf = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const dtfShort = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const dtfTime = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
const dtfDateTime = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });

export function fmtDate(iso: string): string {
  return dtf.format(new Date(iso));
}
export function fmtDateShort(iso: string): string {
  return dtfShort.format(new Date(iso));
}
export function fmtTime(iso: string): string {
  return dtfTime.format(new Date(iso));
}
export function fmtDateTime(iso: string): string {
  return dtfDateTime.format(new Date(iso));
}

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  if (d < 30) return `${d}d ago`;
  return fmtDateShort(iso);
}

export function daysUntil(iso: string, now = new Date()): number {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = new Date(iso);
  const b = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  return Math.round((b - a) / 86400000);
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
