import type { ClassLevel, Subject } from '@/data/syllabus';
import type { SrsState } from '@/lib/srs';

/** Every synced record carries these fields (last-write-wins by updatedAt). */
export interface BaseRecord {
  id: string;
  updatedAt: number;
  deleted?: boolean;
}

export type ChapterStatus = 'new' | 'learning' | 'revising' | 'mastered';

export interface ChapterProgress extends BaseRecord {
  // id = chapterId
  status: ChapterStatus;
  confidence: number; // 0..5
  lastStudied?: number;
}

export interface Note extends BaseRecord {
  title: string;
  body: string;
  subjectId?: string;
  chapterId?: string;
  pinned?: boolean;
  createdAt: number;
}

export interface Card extends BaseRecord {
  chapterId: string;
  subjectId: string;
  front: string;
  back: string;
  srs: SrsState;
  seeded?: boolean;
  createdAt: number;
}

export type TaskKind = 'study' | 'revise' | 'practice' | 'homework' | 'test';

export interface PlanTask extends BaseRecord {
  title: string;
  date: string; // day key
  kind: TaskKind;
  subjectId?: string;
  chapterId?: string;
  estMin: number;
  done: boolean;
  createdAt: number;
}

export interface Exam extends BaseRecord {
  name: string;
  date: string; // ISO date
  subjectId?: string;
}

export interface FocusSession extends BaseRecord {
  startedAt: number;
  minutes: number;
  subjectId?: string;
  chapterId?: string;
}

export interface QuizAttempt extends BaseRecord {
  chapterId: string;
  subjectId: string;
  at: number;
  total: number;
  correct: number;
  seconds: number;
}

/** One row per calendar day; drives streaks, heatmaps and charts. */
export interface DayLog extends BaseRecord {
  // id = day key
  focusMin: number;
  cards: number;
  questions: number;
  correct: number;
  xp: number;
}

export interface Unlock extends BaseRecord {
  // id = achievement id
  at: number;
}

export interface CustomSubject extends BaseRecord, Omit<Subject, 'id'> {}

export interface Profile {
  name: string;
  classLevel: ClassLevel;
  dailyGoalMin: number;
  examName: string;
  examDate: string; // ISO
  hue: number; // avatar hue
  createdAt: number;
  updatedAt: number;
}

export type Ambient = 'none' | 'rain' | 'brown' | 'ocean' | 'night';

export interface Settings {
  focusMin: number;
  breakMin: number;
  longBreakMin: number;
  ambient: Ambient;
  ambientVolume: number;
  haptics: boolean;
  tutorMode: 'demo' | 'cloud';
  tutorEndpoint?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: number;
  chapterId?: string;
}

export interface Collections {
  progress: Record<string, ChapterProgress>;
  notes: Record<string, Note>;
  cards: Record<string, Card>;
  tasks: Record<string, PlanTask>;
  exams: Record<string, Exam>;
  sessions: Record<string, FocusSession>;
  attempts: Record<string, QuizAttempt>;
  days: Record<string, DayLog>;
  unlocks: Record<string, Unlock>;
  subjects: Record<string, CustomSubject>;
}

export type CollectionName = keyof Collections;
export const COLLECTIONS: CollectionName[] = [
  'progress',
  'notes',
  'cards',
  'tasks',
  'exams',
  'sessions',
  'attempts',
  'days',
  'unlocks',
  'subjects',
];
