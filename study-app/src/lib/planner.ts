import type { Subject } from '@/data/syllabus';
import { live } from '@/store/selectors';
import type { Card, Collections, PlanTask, Profile, TaskKind } from '@/store/types';

import { daysUntil } from './dates';
import { mastery } from './progress';

type Draft = Omit<PlanTask, 'id' | 'updatedAt' | 'createdAt' | 'done' | 'date'>;

/**
 * "Smart plan": a balanced day built from the student's real data —
 * spaced-repetition debt first, then the weakest subject, then active recall, then exam drills.
 */
export function smartPlan(data: Collections, subjects: Subject[], profile: Profile, now = Date.now()): Draft[] {
  const out: Draft[] = [];
  const mine = new Set(subjects.map((s) => s.id));
  const due = live(data.cards).filter((c: Card) => mine.has(c.subjectId) && c.srs.due <= now);
  if (due.length) {
    out.push({ title: `Review ${due.length} due flashcard${due.length > 1 ? 's' : ''}`, kind: 'revise', estMin: Math.min(30, Math.max(10, Math.round(due.length * 0.6))) });
  }

  const ranked = [...subjects].sort(
    (a, b) => mastery(a.chapters.map((c) => c.id), data.progress) - mastery(b.chapters.map((c) => c.id), data.progress),
  );
  for (const s of ranked.slice(0, 2)) {
    const next = s.chapters.find((c) => {
      const st = data.progress[c.id];
      return !st || st.deleted || st.status === 'new' || st.status === 'learning';
    });
    if (next) out.push({ title: `${s.name}: Ch ${next.number} · ${next.title}`, kind: 'study', estMin: 45, subjectId: s.id, chapterId: next.id });
  }

  const revising = live(data.progress)
    .filter((p) => p.status === 'revising')
    .sort((a, b) => (a.lastStudied ?? 0) - (b.lastStudied ?? 0))[0];
  if (revising) {
    const s = subjects.find((x) => x.chapters.some((c) => c.id === revising.id));
    const ch = s?.chapters.find((c) => c.id === revising.id);
    if (s && ch) out.push({ title: `Quiz yourself: ${ch.title}`, kind: 'practice', estMin: 20, subjectId: s.id, chapterId: ch.id });
  }

  const left = daysUntil(profile.examDate);
  if (left >= 0 && left <= 45) {
    out.push({ title: 'Timed practice: one sample-paper section', kind: 'test', estMin: 60 });
  }
  return out;
}

export const KINDS: { value: TaskKind; label: string; icon: string }[] = [
  { value: 'study', label: 'Learn', icon: 'book-outline' },
  { value: 'revise', label: 'Revise', icon: 'repeat-outline' },
  { value: 'practice', label: 'Practice', icon: 'create-outline' },
  { value: 'homework', label: 'Homework', icon: 'home-outline' },
  { value: 'test', label: 'Test', icon: 'stopwatch-outline' },
];

