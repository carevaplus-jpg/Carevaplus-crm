// Generation engine: Auto (best model + fallback), Single, Council; streams into the chat store.
import { completeChat, streamChat, type ApiMessage } from './openrouter';
import { systemPrompt, synthesisPrompt, TITLE_PROMPT } from './prompts';
import type { Conversation, Draft, Message, ModelInfo, Stats } from './types';
import { uid } from './utils';
import { useChat } from '../stores/chat';
import { useSettings } from '../stores/settings';
import { useModels, modelById, rankedCandidates, shortName } from '../stores/models';
import { useUI, toast } from '../stores/ui';

let controller: AbortController | null = null;

/* ---------- frame-throttled store updates while streaming ---------- */
const pending = new Map<string, { convId: string; msg: Message }>();
let raf = 0;
function schedule(convId: string, msg: Message) {
  pending.set(msg.id, { convId, msg });
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    const patch = useChat.getState().patchMessage;
    for (const { convId: c, msg: m } of pending.values()) patch(c, { ...m, drafts: m.drafts?.map((d) => ({ ...d })) });
    pending.clear();
  });
}

const attachedText = (m: Message) => (m.files || []).map((f) => `\n\n<attached_file name="${f.name}">\n${f.text}\n</attached_file>`).join('');

function apiMessages(conv: Conversation, upto: number, vision: boolean): ApiMessage[] {
  const out: ApiMessage[] = [{ role: 'system', content: systemPrompt(useSettings.getState()) }];
  for (const m of conv.messages.slice(0, upto)) {
    if (m.role === 'user') {
      let text = (m.content || '') + attachedText(m);
      if (m.images?.length && vision) {
        out.push({ role: 'user', content: [{ type: 'text', text: text || 'Describe this image.' }, ...m.images.map((url) => ({ type: 'image_url', image_url: { url } }))] });
      } else {
        if (m.images?.length) text += `\n\n[${m.images.length} image(s) attached, but this model can't view images.]`;
        out.push({ role: 'user', content: text });
      }
    } else if (m.content) out.push({ role: 'assistant', content: m.content });
  }
  return out;
}
const needsVision = (conv: Conversation, upto: number) => conv.messages.slice(0, upto).some((m) => m.images?.length);

type Target = { content: string; reasoning?: string; model?: string; thinkStart?: number; thinkEnd?: number; stats?: Stats };

async function streamInto(target: Target, model: string, messages: ApiMessage[], signal: AbortSignal, onEvent: () => void) {
  const s = useSettings.getState();
  const stats: Stats = { start: Date.now(), tokens: 0 };
  target.stats = stats;
  try {
    for await (const ev of streamChat({ key: s.apiKey, model, messages, signal, temperature: s.temperature, effort: s.thinking ? 'high' : undefined })) {
      const now = Date.now();
      if (ev.reasoning || ev.content) { stats.first ||= now; if (!stats.exact) stats.tokens++; }
      if (ev.reasoning) { target.thinkStart ||= now; target.reasoning = (target.reasoning || '') + ev.reasoning; }
      if (ev.content) { if (target.thinkStart && !target.thinkEnd) target.thinkEnd = now; target.content += ev.content; }
      if (ev.usage?.completion_tokens) { stats.tokens = ev.usage.completion_tokens; stats.exact = true; }
      if (ev.model && model === 'openrouter/free') target.model = ev.model;
      onEvent();
    }
  } finally {
    stats.end = Date.now();
  }
  if (target.thinkStart && !target.thinkEnd) target.thinkEnd = Date.now();
}

async function runWithFallback(asst: Message, convId: string, candidates: ModelInfo[], build: (m: ModelInfo) => ApiMessage[], signal: AbortSignal) {
  let lastErr: unknown;
  for (const m of candidates) {
    Object.assign(asst, { model: m.id, content: '', reasoning: '', thinkStart: 0, thinkEnd: 0, stats: { start: Date.now(), tokens: 0 } });
    schedule(convId, asst);
    try {
      await streamInto(asst, m.id, build(m), signal, () => schedule(convId, asst));
      if (!asst.content.trim() && asst.reasoning) asst.content = '_The model only returned its thinking. Try again or pick another model._';
      if (!asst.content.trim()) throw Object.assign(new Error(`${shortName(m.id)} returned an empty answer.`), { status: 0 });
      return;
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.name === 'AbortError' || err.status === 401 || asst.content.trim()) throw err;
      lastErr = err;
      (asst.notes ||= []).push(`${shortName(m.id)} was unavailable (${err.status || 'error'}), so another model answered.`);
    }
  }
  throw lastErr || new Error('No free models are available right now.');
}

async function runCouncil(asst: Message, conv: Conversation, idx: number, signal: AbortSignal) {
  const size = useSettings.getState().councilSize;
  const members = rankedCandidates(needsVision(conv, idx)).filter((m) => m.id !== 'openrouter/free').slice(0, size);
  asst.phase = 'council';
  asst.drafts = members.map((m) => ({ model: m.id, content: '', status: 'pending' as const }));
  schedule(conv.id, asst);
  await Promise.all(members.map(async (m, i) => {
    const d = asst.drafts![i] as Draft & Target;
    try {
      await streamInto(d, m.id, apiMessages(conv, idx, m.vision), signal, () => schedule(conv.id, asst));
      d.status = d.content.trim() ? 'done' : 'error';
      if (!d.content.trim()) d.error = 'Empty answer';
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      d.status = 'error'; d.error = (e as Error).message;
    }
    delete d.reasoning; delete d.thinkStart; delete d.thinkEnd;   // drafts keep their stats for the lanes
    schedule(conv.id, asst);
  }));
  const ok = asst.drafts.filter((d) => d.status === 'done');
  if (!ok.length) throw new Error('None of the council models could answer right now (they may be rate-limited). Try Auto mode or wait a minute.');
  if (ok.length === 1) { asst.content = ok[0].content; asst.model = ok[0].model; return; }
  asst.phase = 'synth';
  const userMsg = conv.messages[idx - 1];
  const synth: ApiMessage[] = [...apiMessages(conv, idx - 1, false), { role: 'user', content: synthesisPrompt((userMsg.content || '') + attachedText(userMsg), ok) }];
  await runWithFallback(asst, conv.id, rankedCandidates(false), () => synth, signal);
}

async function makeTitle(conv: Conversation) {
  const first = conv.messages[0]?.content || conv.messages[0]?.files?.[0]?.name || '';
  for (const m of rankedCandidates(false, 3)) {
    try {
      let t = await completeChat({ key: useSettings.getState().apiKey, model: m.id, maxTokens: 30, messages: [
        { role: 'system', content: TITLE_PROMPT }, { role: 'user', content: first.slice(0, 2000) }] });
      t = t.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/^["'#*\s]+|["'.*\s]+$/g, '').split('\n')[0].trim();
      if (t && t.length <= 80) {
        const cur = useChat.getState().convos.find((c) => c.id === conv.id);
        if (cur) await useChat.getState().save({ ...cur, title: t }, false);
        return;
      }
    } catch { /* try next */ }
  }
}

export async function generate(convId: string) {
  const s = useSettings.getState();
  if (!s.apiKey) { useUI.getState().set({ dialog: 'welcome' }); return; }
  if (!useModels.getState().models.length) await useModels.getState().load(true);
  if (!useModels.getState().models.length) { toast('Could not load the free model list. Check your connection.'); return; }

  const chat = useChat.getState();
  const base = chat.convos.find((c) => c.id === convId);
  if (!base) return;
  const asst: Message = { id: uid(), role: 'assistant', content: '', reasoning: '', model: '', status: 'streaming', createdAt: Date.now() };
  const conv: Conversation = { ...base, messages: [...base.messages, asst] };
  const idx = conv.messages.length - 1;
  chat.patchConversation(conv);
  controller = new AbortController();
  const ctrl = controller;
  useChat.setState({ generating: true });
  const isFirst = conv.messages.length === 2;
  try {
    if (s.mode === 'council') await runCouncil(asst, conv, idx, ctrl.signal);
    else {
      const vision = needsVision(conv, idx);
      const candidates = s.mode === 'single' ? [modelById(s.model) || rankedCandidates(vision)[0]] : rankedCandidates(vision);
      await runWithFallback(asst, conv.id, candidates, (m) => apiMessages(conv, idx, m.vision), ctrl.signal);
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') asst.stopped = true;
    else asst.error = (e as Error).message || String(e);
  } finally {
    asst.status = 'done';
    delete asst.phase;
    if (controller === ctrl) controller = null;
    cancelAnimationFrame(raf); raf = 0; pending.clear();
    const latest = useChat.getState().convos.find((c) => c.id === conv.id) ?? conv;
    if (asst.stats && !asst.stats.end) asst.stats.end = Date.now();
    const final: Conversation = { ...latest, messages: latest.messages.map((m) => (m.id === asst.id ? { ...asst, stats: asst.stats && { ...asst.stats } } : m)) };
    useChat.setState({ generating: false });
    await useChat.getState().save(final);
    if (isFirst && asst.content && !asst.error) void makeTitle(final);
  }
}

export function stop() { controller?.abort(); }

export async function send(text: string) {
  const chat = useChat.getState();
  const s = useSettings.getState();
  const atts = chat.attachments;
  if ((!text.trim() && !atts.length) || chat.generating) return;
  if (!s.apiKey) { useUI.getState().set({ dialog: 'welcome' }); return; }
  const conv = chat.ensureCurrent();
  const msg: Message = { id: uid(), role: 'user', content: text.trim(), createdAt: Date.now() };
  const images = atts.flatMap((a) => (a.kind === 'image' ? [a.url] : []));
  const files = atts.flatMap((a) => (a.kind === 'file' ? [{ name: a.name, text: a.text }] : []));
  if (images.length) msg.images = images;
  if (files.length) msg.files = files;
  const title = conv.title === 'New chat' ? (text.trim() || files[0]?.name || 'Image').slice(0, 48) : conv.title;
  chat.setDraft(''); chat.setAttachments([]);
  await chat.save({ ...conv, title, messages: [...conv.messages, msg] });
  await generate(conv.id);
}

/** Retry from an assistant message (drops it and everything after). */
export async function retry(msgId: string, forceAuto = false) {
  const chat = useChat.getState();
  const conv = chat.current();
  if (!conv || chat.generating) return;
  if (forceAuto) useSettings.getState().set({ mode: 'auto' });
  const i = conv.messages.findIndex((m) => m.id === msgId);
  if (i < 0) return;
  await chat.save({ ...conv, messages: conv.messages.slice(0, i) });
  await generate(conv.id);
}

/** Edit a user message and regenerate from there. */
export async function editAndResend(msgId: string, text: string) {
  const chat = useChat.getState();
  const conv = chat.current();
  if (!conv || chat.generating || !text.trim()) return;
  const i = conv.messages.findIndex((m) => m.id === msgId);
  if (i < 0) return;
  const messages = conv.messages.slice(0, i + 1);
  messages[i] = { ...messages[i], content: text.trim() };
  await chat.save({ ...conv, messages });
  await generate(conv.id);
}
