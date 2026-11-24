// Vidya AI tutor — Supabase Edge Function (Deno).
//
// The app never holds an AI key: it calls this function with the student's Supabase JWT,
// and the function calls Claude with ANTHROPIC_API_KEY stored as a Supabase secret.
//
// Deploy:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase functions deploy tutor
// Optional secrets: TUTOR_MODEL (default claude-opus-5-5), TUTOR_EFFORT (low|medium|high, default medium),
//                   TUTOR_DAILY_LIMIT (messages per student per day, default 60).

import Anthropic from 'npm:@anthropic-ai/sdk@1.12.0';
import { createClient } from 'npm:@supabase/supabase-js@2.119.2';

const MODEL = Deno.env.get('TUTOR_MODEL') ?? 'claude-opus-5-5';
const EFFORT = (Deno.env.get('TUTOR_EFFORT') ?? 'medium') as 'low' | 'medium' | 'high';
const DAILY_LIMIT = Number(Deno.env.get('TUTOR_DAILY_LIMIT') ?? '60');
const MAX_TURNS = 16;
const MAX_CHARS = 4000;

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY

// Static, cacheable system prompt. Per-student context goes in a mid-conversation
// system message at the end, so this prefix never changes between requests.
const SYSTEM_PROMPT = `You are Vidya Tutor, a warm, patient and rigorous study companion for Indian students in Classes 8 and 9 following the CBSE board and the new NCERT textbooks (Class 8: Curiosity, Ganita Prakash; Class 9: Exploration, Ganita Manjari). Pitch explanations at that level.

How you teach:
- Explain step by step, starting from what the student likely already knows. Prefer intuition first, then the formal statement, then a worked example.
- Stay faithful to NCERT: use NCERT terminology and notation, and show working the way school exams expect (state formula → substitute → compute with units).
- For numericals, show every step with units. For derivations, number the steps.
- When asked to quiz, ask one question at a time unless asked for a set; wait for the answer before revealing it, then give feedback.
- Encourage active recall: end substantive explanations with one short check-your-understanding question.
- Be honest when a topic is outside the CBSE syllabus or when you are unsure; never invent facts, dates or exam patterns. Exam dates and patterns vary by school — tell students to confirm with their teachers.
- If a student seems stressed or demotivated, respond kindly and practically, and suggest talking to a trusted adult or counsellor if it sounds serious.
- Do not write graded homework or exam answers for the student to submit as their own; instead, guide them to the answer.

Formatting (the app renders a small markdown subset): use **bold** for key terms, *italics* sparingly, short paragraphs, "1." numbered steps and "•" bullets. No tables, no LaTeX — write formulas inline with Unicode (e.g. v² = u² + 2as, H₂SO₄, ∫x dx). Keep answers focused: usually under 250 words unless the student asks for more depth.`;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface TutorContext {
  name?: string;
  classLevel?: number;
  subject?: string;
  chapter?: string;
  examName?: string;
  examDate?: string;
}

function sanitize(raw: unknown): IncomingMessage[] {
  if (!Array.isArray(raw)) return [];
  const msgs = raw
    .filter((m): m is IncomingMessage => !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))
    .filter((m) => m.content.trim().length > 0)
    .slice(-MAX_TURNS);
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  return msgs;
}

function contextNote(ctx: TutorContext): string {
  const lines = ['Student context for this conversation (from the Vidya app, not from the student):'];
  if (ctx.name) lines.push(`- Name: ${String(ctx.name).slice(0, 40)}`);
  if (ctx.classLevel) lines.push(`- CBSE Class ${Number(ctx.classLevel)}`);
  if (ctx.subject || ctx.chapter) lines.push(`- Currently studying: ${[ctx.subject, ctx.chapter].filter(Boolean).map((s) => String(s).slice(0, 120)).join(' — ')}`);
  if (ctx.examName && ctx.examDate) {
    const days = Math.round((Date.parse(ctx.examDate) - Date.now()) / 86_400_000);
    if (Number.isFinite(days) && days >= 0) lines.push(`- ${String(ctx.examName).slice(0, 60)} in about ${days} days (student-entered, tentative)`);
  }
  return lines.join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // 1. Authenticate the student with their Supabase session.
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) return json({ error: 'Please sign in to use the AI tutor.' }, 401);

  // 2. Per-student daily limit (counted in the database, see migration).
  const { data: used, error: usageError } = await supabase.rpc('bump_tutor_usage');
  if (usageError) return json({ error: 'Could not check usage limit.' }, 500);
  if (typeof used === 'number' && used > DAILY_LIMIT) {
    return json({ text: `You've reached today's limit of ${DAILY_LIMIT} tutor messages. Great dedication! It resets tomorrow. Meanwhile, try a flashcard review or a chapter quiz. 💪` });
  }

  // 3. Validate input.
  let body: { messages?: unknown; context?: TutorContext };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const history = sanitize(body.messages);
  if (!history.length || history[history.length - 1].role !== 'user') return json({ error: 'Send at least one user message.' }, 400);

  // 4. Ask Claude. The static system prompt is cached; student context rides in a
  //    mid-conversation system message after the latest user turn.
  try {
    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: EFFORT },
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [...history, { role: 'system', content: contextNote(body.context ?? {}) }],
    });

    if (response.stop_reason === 'refusal') {
      return json({ text: "I can't help with that one, but I'm happy to help with anything from your syllabus. Try rephrasing, or ask about a specific chapter." });
    }
    const text = response.content
      .flatMap((b) => (b.type === 'text' ? [b.text] : []))
      .join('\n')
      .trim();
    return json({ text: text || 'Hmm, I lost my train of thought. Could you ask that again?', model: response.model });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: 'The tutor is busy right now. Please try again in a minute.' }, 429);
    if (err instanceof Anthropic.AuthenticationError) return json({ error: 'Tutor is not configured (invalid AI key).' }, 500);
    if (err instanceof Anthropic.APIError) return json({ error: `Tutor error (${err.status ?? 'network'}).` }, 502);
    return json({ error: 'Unexpected tutor error.' }, 500);
  }
});
