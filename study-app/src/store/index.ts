import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { SEED_CARDS } from '@/data/content';
import type { Subject } from '@/data/syllabus';
import { dayKey } from '@/lib/dates';
import { uid } from '@/lib/id';
import { ACHIEVEMENTS, levelInfo, streak, totalXp, XP } from '@/lib/progress';
import { newSrs, schedule, type Grade } from '@/lib/srs';

import type {
  BaseRecord,
  Card,
  ChapterStatus,
  ChatMessage,
  CollectionName,
  Collections,
  DayLog,
  Profile,
  Settings,
} from './types';
import { COLLECTIONS } from './types';

export interface Celebration {
  id: string;
  kind: 'xp' | 'achievement' | 'level';
  title: string;
  subtitle?: string;
  icon?: string;
}

interface SyncMeta {
  cursor: string | null; // last server_updated_at pulled
  lastPushedAt: number;
  lastSyncedAt: number | null;
  status: 'idle' | 'syncing' | 'error' | 'offline';
  error?: string;
}

export interface DayDelta {
  focusMin?: number;
  cards?: number;
  questions?: number;
  correct?: number;
  xp?: number;
}

export interface StoreState {
  hydrated: boolean;
  profile: Profile | null;
  settings: Settings;
  data: Collections;
  chat: ChatMessage[];
  sync: SyncMeta;
  celebrations: Celebration[];

  // lifecycle
  completeOnboarding: (p: Omit<Profile, 'createdAt' | 'updatedAt'>, subjects: Subject[]) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;

  // generic records
  upsert: <K extends CollectionName>(col: K, rec: Omit<Collections[K][string], 'updatedAt'>) => void;
  remove: (col: CollectionName, id: string) => void;
  mergeRemote: (col: CollectionName, recs: BaseRecord[]) => void;

  // domain actions
  setChapterStatus: (chapterId: string, status: ChapterStatus) => void;
  addCard: (c: Pick<Card, 'chapterId' | 'subjectId' | 'front' | 'back'>) => string;
  reviewCard: (id: string, grade: Grade) => void;
  logFocus: (minutes: number, subjectId?: string, chapterId?: string) => void;
  recordQuiz: (a: { chapterId: string; subjectId: string; total: number; correct: number; seconds: number }) => void;
  toggleTask: (id: string) => void;
  seedCards: (subjects: Subject[]) => void;
  award: (delta: DayDelta, label?: string) => void;

  // chat
  pushChat: (m: Omit<ChatMessage, 'id' | 'at'>) => void;
  clearChat: () => void;

  // celebrations & sync meta
  celebrate: (c: Omit<Celebration, 'id'>) => void;
  dismissCelebration: (id: string) => void;
  setSync: (patch: Partial<SyncMeta>) => void;
}

const emptyCollections = (): Collections =>
  Object.fromEntries(COLLECTIONS.map((c) => [c, {}])) as unknown as Collections;

export const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  breakMin: 5,
  longBreakMin: 15,
  ambient: 'rain',
  ambientVolume: 0.6,
  haptics: true,
  tutorMode: 'demo',
};

const initialSync: SyncMeta = { cursor: null, lastPushedAt: 0, lastSyncedAt: null, status: 'idle' };

export const useStore = create<StoreState>()(
  persist(
    (set, get) => {
      /** Add activity to today's log, award XP, then evaluate levels + achievements. */
      const bump = (delta: DayDelta, xpLabel?: string) => {
        const before = levelInfo(totalXp(get().data.days)).level;
        const key = dayKey();
        set((s) => {
          const cur: DayLog = s.data.days[key] ?? { id: key, updatedAt: 0, focusMin: 0, cards: 0, questions: 0, correct: 0, xp: 0 };
          const next: DayLog = {
            ...cur,
            deleted: false,
            focusMin: cur.focusMin + (delta.focusMin ?? 0),
            cards: cur.cards + (delta.cards ?? 0),
            questions: cur.questions + (delta.questions ?? 0),
            correct: cur.correct + (delta.correct ?? 0),
            xp: cur.xp + (delta.xp ?? 0),
            updatedAt: Date.now(),
          };
          return { data: { ...s.data, days: { ...s.data.days, [key]: next } } };
        });

        const st = get();
        const xp = totalXp(st.data.days);
        const after = levelInfo(xp);
        if (xpLabel && delta.xp) st.celebrate({ kind: 'xp', title: `+${delta.xp} XP`, subtitle: xpLabel });
        if (after.level > before) {
          st.celebrate({ kind: 'level', title: `Level ${after.level}`, subtitle: after.title, icon: 'sparkles' });
        }
        const ctx = { streak: streak(st.data.days), xp };
        for (const a of ACHIEVEMENTS) {
          if (st.data.unlocks[a.id] && !st.data.unlocks[a.id].deleted) continue;
          if (a.test(st.data, ctx)) {
            st.upsert('unlocks', { id: a.id, at: Date.now() });
            st.celebrate({ kind: 'achievement', title: a.title, subtitle: a.desc, icon: a.icon });
          }
        }
      };

      return {
        hydrated: false,
        profile: null,
        settings: DEFAULT_SETTINGS,
        data: emptyCollections(),
        chat: [],
        sync: initialSync,
        celebrations: [],

        completeOnboarding: (p, subjects) => {
          const now = Date.now();
          set({ profile: { ...p, createdAt: now, updatedAt: now } });
          get().seedCards(subjects);
        },

        updateProfile: (patch) =>
          set((s) => (s.profile ? { profile: { ...s.profile, ...patch, updatedAt: Date.now() } } : s)),

        updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

        resetAll: () =>
          set({ profile: null, settings: DEFAULT_SETTINGS, data: emptyCollections(), chat: [], sync: initialSync, celebrations: [] }),

        upsert: (col, rec) =>
          set((s) => ({
            data: {
              ...s.data,
              [col]: { ...s.data[col], [rec.id]: { ...(s.data[col][rec.id] ?? {}), ...rec, updatedAt: Date.now() } },
            },
          })),

        remove: (col, id) =>
          set((s) => {
            const cur = s.data[col][id];
            if (!cur) return s;
            return { data: { ...s.data, [col]: { ...s.data[col], [id]: { ...cur, deleted: true, updatedAt: Date.now() } } } };
          }),

        mergeRemote: (col, recs) =>
          set((s) => {
            const next = { ...s.data[col] } as Record<string, BaseRecord>;
            for (const r of recs) {
              const local = next[r.id];
              if (!local || r.updatedAt > local.updatedAt) next[r.id] = r;
            }
            return { data: { ...s.data, [col]: next } };
          }),

        setChapterStatus: (chapterId, status) => {
          const prev = get().data.progress[chapterId];
          get().upsert('progress', {
            id: chapterId,
            status,
            confidence: prev?.confidence ?? 0,
            lastStudied: Date.now(),
            deleted: false,
          });
          if (status === 'mastered' && prev?.status !== 'mastered') {
            bump({ xp: XP.chapterMastered }, 'Chapter mastered');
          }
        },

        addCard: (c) => {
          const id = uid('card_');
          const now = Date.now();
          get().upsert('cards', { ...c, id, srs: newSrs(now), createdAt: now });
          return id;
        },

        reviewCard: (id, grade) => {
          const card = get().data.cards[id];
          if (!card) return;
          get().upsert('cards', { ...card, srs: schedule(card.srs, grade) });
          bump({ cards: 1, xp: XP.cardReview });
        },

        logFocus: (minutes, subjectId, chapterId) => {
          if (minutes < 1) return;
          const m = Math.round(minutes);
          get().upsert('sessions', { id: uid('fs_'), startedAt: Date.now() - m * 60000, minutes: m, subjectId, chapterId });
          bump({ focusMin: m, xp: m * XP.focusMinute }, `${m} min of deep focus`);
        },

        recordQuiz: (a) => {
          get().upsert('attempts', { ...a, id: uid('qa_'), at: Date.now() });
          const xp = a.correct * XP.quizCorrect + XP.quizComplete;
          bump({ questions: a.total, correct: a.correct, xp }, `Quiz · ${a.correct}/${a.total}`);
        },

        toggleTask: (id) => {
          const t = get().data.tasks[id];
          if (!t) return;
          get().upsert('tasks', { ...t, done: !t.done });
          if (!t.done) bump({ xp: XP.taskDone }, 'Task complete');
        },

        seedCards: (subjects) => {
          const chapterToSubject = new Map<string, string>();
          subjects.forEach((s) => s.chapters.forEach((ch) => chapterToSubject.set(ch.id, s.id)));
          const now = Date.now();
          const existing = get().data.cards;
          const additions: Record<string, Card> = {};
          SEED_CARDS.forEach((sc, i) => {
            const subjectId = chapterToSubject.get(sc.chapterId);
            if (!subjectId) return;
            const id = `seed-${sc.chapterId}-${i}`;
            if (existing[id]) return;
            additions[id] = {
              id,
              chapterId: sc.chapterId,
              subjectId,
              front: sc.front,
              back: sc.back,
              srs: newSrs(now),
              seeded: true,
              createdAt: now,
              updatedAt: now,
            };
          });
          set((s) => ({ data: { ...s.data, cards: { ...s.data.cards, ...additions } } }));
        },

        award: (delta, label) => bump(delta, label),

        pushChat: (m) => set((s) => ({ chat: [...s.chat, { ...m, id: uid('m_'), at: Date.now() }].slice(-200) })),
        clearChat: () => set({ chat: [] }),

        celebrate: (c) => set((s) => ({ celebrations: [...s.celebrations, { ...c, id: uid('c_') }].slice(-4) })),
        dismissCelebration: (id) => set((s) => ({ celebrations: s.celebrations.filter((c) => c.id !== id) })),
        setSync: (patch) => set((s) => ({ sync: { ...s.sync, ...patch } })),
      };
    },
    {
      name: 'vidya-store-v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ profile: s.profile, settings: s.settings, data: s.data, chat: s.chat, sync: { ...s.sync, status: 'idle' as const } }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<StoreState>;
        const profile = p.profile && ![8, 9].includes(p.profile.classLevel) ? { ...p.profile, classLevel: 9 as const } : p.profile;
        return {
          ...current,
          ...p,
          profile: profile ?? null,
          settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
          data: { ...emptyCollections(), ...(p.data ?? {}) },
        };
      },
      onRehydrateStorage: () => () => {
        useStore.setState({ hydrated: true });
      },
    },
  ),
);
