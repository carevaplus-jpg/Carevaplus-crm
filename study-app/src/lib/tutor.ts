import { QUESTION_BANK, SEED_CARDS } from '@/data/content';
import { daysUntil } from '@/lib/dates';
import { useStore } from '@/store';
import type { ChatMessage } from '@/store/types';

import { supabase } from './supabase';

export interface TutorContext {
  name: string;
  classLevel: number;
  subject?: string;
  chapter?: string;
  chapterId?: string;
  examName?: string;
  examDate?: string;
}

export interface TutorReply {
  text: string;
  source: 'demo' | 'cloud';
}

/**
 * Single entry point for the AI tutor. Provider is pluggable:
 *  - 'cloud' → Supabase Edge Function `tutor` (or a custom endpoint) that holds the AI key server-side.
 *  - 'demo'  → on-device study coach built on Vidya's own content, works fully offline.
 */
export async function askTutor(history: ChatMessage[], ctx: TutorContext): Promise<TutorReply> {
  const { tutorMode, tutorEndpoint } = useStore.getState().settings;
  if (tutorMode === 'cloud') {
    try {
      return { text: await askCloud(history, ctx, tutorEndpoint), source: 'cloud' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        text: `I couldn't reach the cloud tutor (${msg}). Here's what I can do offline:\n\n${demoReply(history, ctx)}`,
        source: 'demo',
      };
    }
  }
  await new Promise((r) => setTimeout(r, 650 + Math.random() * 500));
  return { text: demoReply(history, ctx), source: 'demo' };
}

async function askCloud(history: ChatMessage[], ctx: TutorContext, endpoint?: string): Promise<string> {
  const messages = history.slice(-16).map((m) => ({ role: m.role, content: m.text }));
  if (endpoint) {
    const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ messages, context: ctx }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { text?: string };
    if (!json.text) throw new Error('empty response');
    return json.text;
  }
  if (!supabase) throw new Error('cloud is not configured');
  const { data, error } = await supabase.functions.invoke<{ text: string }>('tutor', { body: { messages, context: ctx } });
  if (error) throw error;
  if (!data?.text) throw new Error('empty response');
  return data.text;
}

// ── Demo brain ─────────────────────────────────────────────────────────────

const STOP = new Set('a an the is are was of to in on for and or what how why explain tell me about please can you define meaning formula give with do does it this that i my'.split(' '));

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9À-ɏ\s']/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

function bestCards(query: string, chapterId?: string, classLevel?: number, n = 2) {
  const q = words(query);
  if (!q.length) return [];
  return SEED_CARDS.map((c) => {
    const hay = words(`${c.front} ${c.back}`);
    let score = q.reduce((s, w) => s + (hay.some((h) => h.startsWith(w) || w.startsWith(h)) ? 1 : 0), 0);
    if (chapterId && c.chapterId === chapterId) score += 0.5;
    if (classLevel && c.chapterId.startsWith(`c${classLevel}-`)) score += 0.25;
    return { c, score };
  })
    .filter((x) => x.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.c);
}

function demoReply(history: ChatMessage[], ctx: TutorContext): string {
  const last = [...history].reverse().find((m) => m.role === 'user')?.text ?? '';
  const t = last.toLowerCase();
  const first = ctx.name.split(' ')[0] || 'there';

  if (/\b(quiz|test me|mcq|practice question)/.test(t)) {
    const pool = QUESTION_BANK.filter((q) => (ctx.chapterId ? q.chapterId === ctx.chapterId : q.chapterId.startsWith(`c${ctx.classLevel}-`)));
    if (!pool.length) return `I don't have ready-made questions for ${ctx.chapter ?? 'this topic'} yet. Try making flashcards from your notes, then open **Quiz** on the chapter. With the cloud tutor connected I can write fresh questions on any chapter.`;
    const picks = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    return `Let's warm up, ${first}! Answer in your head first, then check.\n\n${picks
      .map((q, i) => `**Q${i + 1}. ${q.q}**\n${q.options.map((o, j) => `${'ABCD'[j]}) ${o}`).join('\n')}\n_Answer: ${'ABCD'[q.answer]}, because ${q.explain.charAt(0).toLowerCase()}${q.explain.slice(1)}_`)
      .join('\n\n')}\n\nWant a full timed quiz? Open the chapter and tap **Quiz**.`;
  }

  if (/\b(plan|schedule|timetable|routine|prepare|preparation)\b/.test(t)) {
    const d = ctx.examDate ? daysUntil(ctx.examDate) : null;
    const left = d !== null && d > 0 ? `You have **${d} days** until ${ctx.examName ?? 'your exam'}.` : '';
    return `${left}\n\nHere's a simple system toppers use:\n\n1. **Learn** a new topic in one or two 25-minute focus blocks.\n2. **Recall** it the same evening: close the book and write what you remember.\n3. **Review** flashcards daily. Vidya schedules them for you.\n4. **Test** yourself weekly with chapter quizzes and NCERT exemplar problems.\n5. In the last 30 days, switch to **sample papers + PYQs** under timed conditions.\n\nOpen the **Planner** to drop these into your week.`.trim();
  }

  if (/\b(stress|anxious|anxiety|tired|bored|demotivat|can't focus|cant focus|scared|nervous|give up)\b/.test(t)) {
    return `That's completely normal, ${first}, and it means you care. Try this:\n\n• Shrink the task: *one* 15-minute focus block, nothing more.\n• Breathe 4-4-6 (in 4, hold 4, out 6) three times before you start.\n• Put your phone face-down in another room.\n• Celebrate small wins. Every session adds to your streak.\n\nYou don't need to feel motivated to start. Starting is what creates motivation. Want me to set up a gentle 15-minute session?`;
  }

  const hits = bestCards(last, ctx.chapterId, ctx.classLevel, 3);
  if (hits.length) {
    const main = hits[0];
    const related = hits.slice(1).find((h) => h.chapterId === main.chapterId);
    const extra = related ? `\n\n**Related:** ${related.front}\n${related.back}` : '';
    return `**${main.front}**\n${main.back}${extra}\n\n**Check yourself:** can you explain *why* this is true, in your own words, without looking? If you can teach it, you know it.`;
  }

  return `Good question${ctx.chapter ? ` on *${ctx.chapter}*` : ''}! I'm in **demo mode**, so I answer from Vidya's built-in NCERT formula bank and study playbook. I can:\n\n• Explain formulas and key facts (try "What is Ohm's law?")\n• Quiz you ("Quiz me")\n• Help you plan ("Make a study plan")\n• Coach you through stress or low motivation\n\nConnect the cloud tutor in **Settings → AI Tutor** to get full step-by-step explanations of any NCERT question.`;
}

export const TUTOR_STARTERS = [
  'Explain this chapter simply',
  'Quiz me',
  'Make a study plan for my exam',
  'What are the key formulas?',
  "I can't focus today",
];
