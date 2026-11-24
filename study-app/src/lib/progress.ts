import { addDays, dayKey } from '@/lib/dates';
import type { ChapterStatus, Collections } from '@/store/types';
import { colors } from '@/theme/tokens';

// ── XP & levels ────────────────────────────────────────────────────────────
export const XP = {
  focusMinute: 2,
  cardReview: 2,
  quizCorrect: 10,
  quizComplete: 15,
  chapterMastered: 50,
  noteCreated: 5,
  taskDone: 8,
} as const;

const TITLES = [
  'Curious Mind',
  'Seeker',
  'Learner',
  'Scholar',
  'Thinker',
  'Achiever',
  'Topper',
  'Prodigy',
  'Sage',
  'Vidya Master',
];

/** Cumulative XP needed to reach level n (level 1 = 0 XP). */
export const levelThreshold = (n: number) => (50 * (n - 1) * (n + 2)) / 2;

export function levelInfo(xp: number) {
  let level = 1;
  while (xp >= levelThreshold(level + 1)) level++;
  const floor = levelThreshold(level);
  const ceil = levelThreshold(level + 1);
  return {
    level,
    title: TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 3))],
    into: xp - floor,
    span: ceil - floor,
    progress: (xp - floor) / (ceil - floor),
  };
}

export function totalXp(days: Collections['days']) {
  return Object.values(days).reduce((s, d) => s + (d.deleted ? 0 : d.xp), 0);
}

// ── Streaks ────────────────────────────────────────────────────────────────
const active = (d?: { focusMin: number; cards: number; questions: number; deleted?: boolean }) =>
  !!d && !d.deleted && d.focusMin + d.cards + d.questions > 0;

export function streak(days: Collections['days'], today = new Date()) {
  let n = 0;
  let cursor = today;
  // today counts if active; otherwise the streak is still alive from yesterday
  if (!active(days[dayKey(cursor)])) cursor = addDays(cursor, -1);
  while (active(days[dayKey(cursor)])) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export function bestStreak(days: Collections['days']) {
  const keys = Object.keys(days).filter((k) => active(days[k])).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of keys) {
    if (prev && dayKey(addDays(new Date(prev + 'T00:00:00'), 1)) === k) run++;
    else run = 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

// ── Mastery ────────────────────────────────────────────────────────────────
export const STATUS_WEIGHT: Record<ChapterStatus, number> = {
  new: 0,
  learning: 0.35,
  revising: 0.7,
  mastered: 1,
};

export const STATUS_LABEL: Record<ChapterStatus, string> = {
  new: 'Not started',
  learning: 'Learning',
  revising: 'Revising',
  mastered: 'Mastered',
};

export function mastery(chapterIds: string[], progress: Collections['progress']) {
  if (!chapterIds.length) return 0;
  const sum = chapterIds.reduce((s, id) => {
    const p = progress[id];
    return s + (p && !p.deleted ? STATUS_WEIGHT[p.status] : 0);
  }, 0);
  return sum / chapterIds.length;
}

export const STATUS_COLOR: Record<ChapterStatus, string> = {
  new: colors.textFaint,
  learning: colors.amber,
  revising: colors.secondary,
  mastered: colors.mint,
};

// ── Achievements ───────────────────────────────────────────────────────────
export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  test: (c: Collections, ctx: { streak: number; xp: number }) => boolean;
}

const sumDays = (c: Collections, k: 'focusMin' | 'cards' | 'questions' | 'correct') =>
  Object.values(c.days).reduce((s, d) => s + (d.deleted ? 0 : d[k]), 0);
const live = <T extends { deleted?: boolean }>(r: Record<string, T>) => Object.values(r).filter((x) => !x.deleted);

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-focus', title: 'Deep Breath', desc: 'Complete your first focus session', icon: 'leaf', test: (c) => live(c.sessions).length >= 1 },
  { id: 'focus-10h', title: 'Ten-Hour Monk', desc: 'Focus for 10 hours in total', icon: 'hourglass', test: (c) => sumDays(c, 'focusMin') >= 600 },
  { id: 'streak-3', title: 'On a Roll', desc: 'Study 3 days in a row', icon: 'flame', test: (_, x) => x.streak >= 3 },
  { id: 'streak-7', title: 'Week Warrior', desc: 'Keep a 7-day streak', icon: 'bonfire', test: (_, x) => x.streak >= 7 },
  { id: 'streak-30', title: 'Unstoppable', desc: 'Keep a 30-day streak', icon: 'rocket', test: (_, x) => x.streak >= 30 },
  { id: 'cards-100', title: 'Memory Palace', desc: 'Review 100 flashcards', icon: 'layers', test: (c) => sumDays(c, 'cards') >= 100 },
  { id: 'quiz-perfect', title: 'Full Marks', desc: 'Score 100% on a quiz', icon: 'ribbon', test: (c) => live(c.attempts).some((a) => a.total >= 3 && a.correct === a.total) },
  { id: 'questions-100', title: 'Problem Solver', desc: 'Answer 100 questions correctly', icon: 'bulb', test: (c) => sumDays(c, 'correct') >= 100 },
  { id: 'mastered-1', title: 'First Summit', desc: 'Master your first chapter', icon: 'trophy', test: (c) => live(c.progress).some((p) => p.status === 'mastered') },
  { id: 'mastered-10', title: 'Chapter Champion', desc: 'Master 10 chapters', icon: 'medal', test: (c) => live(c.progress).filter((p) => p.status === 'mastered').length >= 10 },
  { id: 'notes-10', title: 'Scribe', desc: 'Write 10 notes', icon: 'create', test: (c) => live(c.notes).length >= 10 },
  { id: 'level-5', title: 'Rising Star', desc: 'Reach level 5', icon: 'star', test: (_, x) => levelInfo(x.xp).level >= 5 },
];
