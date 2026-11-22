import { useMemo } from 'react';

import { findSubject, SUBJECT_STYLE, SYLLABUS, type Chapter, type Subject } from '@/data/syllabus';
import { dayKey } from '@/lib/dates';
import { levelInfo, mastery, streak, totalXp } from '@/lib/progress';
import { useNow } from '@/lib/useNow';

import { useStore } from './index';
import type { Card, CustomSubject } from './types';

export const live = <T extends { deleted?: boolean }>(r: Record<string, T>): T[] =>
  Object.values(r).filter((x) => !x.deleted);

function customToSubject(c: CustomSubject): Subject {
  const { updatedAt: _u, deleted: _d, ...rest } = c;
  return { ...rest, ...SUBJECT_STYLE.custom, color: c.color || SUBJECT_STYLE.custom.color, custom: true };
}

/** The student's subjects: NCERT core for their class + their custom subjects. */
export function useMySubjects(): Subject[] {
  const profile = useStore((s) => s.profile);
  const custom = useStore((s) => s.data.subjects);
  return useMemo(() => {
    if (!profile) return [];
    const core = SYLLABUS.filter((s) => s.classLevel === profile.classLevel);
    const mine = live(custom)
      .filter((c) => c.classLevel === profile.classLevel)
      .map(customToSubject);
    return [...core, ...mine];
  }, [profile, custom]);
}

export function useSubject(id?: string): Subject | undefined {
  const custom = useStore((s) => (id ? s.data.subjects[id] : undefined));
  return useMemo(() => {
    if (!id) return undefined;
    if (custom && !custom.deleted) return customToSubject(custom);
    return findSubject(id);
  }, [id, custom]);
}

export function useChapter(chapterId?: string): { subject: Subject; chapter: Chapter } | undefined {
  const subjects = useMySubjects();
  const custom = useStore((s) => s.data.subjects);
  if (!chapterId) return undefined;
  const pool = [...subjects, ...SYLLABUS, ...live(custom).map(customToSubject)];
  for (const subject of pool) {
    const chapter = subject.chapters.find((c) => c.id === chapterId);
    if (chapter) return { subject, chapter };
  }
  return undefined;
}

export function useDueCards(filter?: { subjectId?: string; chapterId?: string }): Card[] {
  const cards = useStore((s) => s.data.cards);
  const subjects = useMySubjects();
  const now = useNow();
  const subjectId = filter?.subjectId;
  const chapterId = filter?.chapterId;
  const mine = new Set(subjects.map((s) => s.id));
  return live(cards)
    .filter((c) => mine.has(c.subjectId))
    .filter((c) => (subjectId ? c.subjectId === subjectId : true))
    .filter((c) => (chapterId ? c.chapterId === chapterId : true))
    .filter((c) => c.srs.due <= now)
    .sort((a, b) => a.srs.due - b.srs.due);
}

export function useStats() {
  const days = useStore((s) => s.data.days);
  const goal = useStore((s) => s.profile?.dailyGoalMin ?? 60);
  return useMemo(() => {
    const xp = totalXp(days);
    const today = days[dayKey()];
    return {
      xp,
      level: levelInfo(xp),
      streak: streak(days),
      todayMin: today && !today.deleted ? today.focusMin : 0,
      todayCards: today && !today.deleted ? today.cards : 0,
      goal,
    };
  }, [days, goal]);
}

export function useSubjectMastery(subject?: Subject) {
  const progress = useStore((s) => s.data.progress);
  return useMemo(() => (subject ? mastery(subject.chapters.map((c) => c.id), progress) : 0), [subject, progress]);
}
