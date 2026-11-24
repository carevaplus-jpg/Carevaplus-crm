/**
 * Spaced repetition scheduler (SM-2 family, Anki-style four buttons).
 * Pure functions so it is trivially testable and shared by review + stats.
 */

export type Grade = 0 | 1 | 2 | 3; // Again, Hard, Good, Easy

export interface SrsState {
  ease: number; // ease factor, starts 2.5, floor 1.3
  interval: number; // days
  reps: number; // successful reviews in a row
  lapses: number;
  due: number; // epoch ms
  lastReviewed?: number;
}

export const DAY = 24 * 60 * 60 * 1000;
const MIN_EASE = 1.3;
const RELEARN_MS = 10 * 60 * 1000;

export function newSrs(now = Date.now()): SrsState {
  return { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now };
}

export function schedule(s: SrsState, grade: Grade, now = Date.now()): SrsState {
  if (grade === 0) {
    return {
      ease: Math.max(MIN_EASE, s.ease - 0.2),
      interval: 0,
      reps: 0,
      lapses: s.lapses + 1,
      due: now + RELEARN_MS,
      lastReviewed: now,
    };
  }

  let ease = s.ease;
  let interval: number;
  if (grade === 1) {
    ease = Math.max(MIN_EASE, ease - 0.15);
    interval = s.reps === 0 ? 1 : Math.max(s.interval + 1, Math.round(s.interval * 1.2));
  } else if (grade === 2) {
    interval = s.reps === 0 ? 1 : s.reps === 1 ? 3 : Math.round(s.interval * ease);
  } else {
    ease = ease + 0.15;
    interval = s.reps === 0 ? 4 : Math.round(Math.max(s.interval, 1) * ease * 1.3);
  }
  interval = Math.min(Math.max(1, interval), 365);

  return { ease, interval, reps: s.reps + 1, lapses: s.lapses, due: now + interval * DAY, lastReviewed: now };
}

/** Human label for what each button would schedule, e.g. "10m", "3d", "2mo". */
export function previewLabel(s: SrsState, grade: Grade, now = Date.now()): string {
  const next = schedule(s, grade, now);
  const ms = next.due - now;
  if (ms < 60 * 60 * 1000) return `${Math.round(ms / 60000)}m`;
  const days = Math.round(ms / DAY);
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

export function isDue(s: SrsState, now = Date.now()) {
  return s.due <= now;
}

/** Retention-weighted strength 0..1 used for mastery visuals. */
export function strength(s: SrsState) {
  if (s.reps === 0) return 0;
  return Math.min(1, Math.log2(1 + s.interval) / Math.log2(1 + 60));
}
