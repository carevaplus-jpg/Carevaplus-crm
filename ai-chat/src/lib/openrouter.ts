// OpenRouter client: free-model discovery + ranking, streaming chat, transcription, OAuth (PKCE).
import type { ModelInfo } from './types';

export const API = 'https://openrouter.ai/api/v1';
export const APP_NAME = 'Careva AI';

export class ApiError extends Error {
  status: number;
  model?: string;
  constructor(status: number, message: string, model?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.model = model;
  }
}

/* ---------------- Models ---------------- */

// Quality ranking for open model families. Patterns, not exact IDs, so new versions slot in.
const FAMILY_SCORES: [RegExp, number][] = [
  [/deepseek.*(r2|v4|v3\.[1-9]|chat-v3)/, 99],
  [/nemotron-3-ultra/, 98],
  [/kimi-k2/, 97],
  [/qwen3.*(max|235b|480b|coder|next)/, 96],
  [/glm-(4\.[5-9]|5)/, 95],
  [/gpt-oss-120b/, 93],
  [/gemma-4-31b/, 92],
  [/nemotron-3\.5-super/, 91],
  [/ernie-5/, 90],
  [/deepseek-r1/, 89],
  [/llama-4-maverick/, 88],
  [/ling-3/, 86],
  [/gemma-4-26b/, 85],
  [/mistral-(large|medium)|devstral|magistral/, 84],
  [/qwen3/, 83],
  [/nemotron-3-nano-omni/, 80],
  [/nemotron-3\.5-lightning/, 79],
  [/gpt-oss-20b/, 78],
  [/llama-3\.3-70b|hermes-4/, 77],
  [/gemma-3-27b/, 74],
  [/particle|flint/, 70],
];

function sizeHint(id: string) {
  const m = id.match(/(\d+(?:\.\d+)?)b(?![a-z])/);
  return m ? Math.min(parseFloat(m[1]), 1000) : 0;
}

export function scoreModel(m: Omit<ModelInfo, 'score'>) {
  const id = m.id.toLowerCase();
  if (id === 'openrouter/free') return -1000;
  let score = 40;
  for (const [re, s] of FAMILY_SCORES) if (re.test(id)) { score = s; break; }
  if (score === 40) score += Math.min(30, Math.log2(1 + sizeHint(id)) * 3.5);
  if (/(^|[-/])(1\.7b|1b|3b|mini|tiny|nano(?!-omni))/.test(id)) score -= 15;
  if (m.supportsTools) score += 1;
  if (m.supportsReasoning) score += 1;
  score += Math.min(2, (m.contextLength || 0) / 500000);
  return score;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function normalize(m: any): Omit<ModelInfo, 'score'> {
  const params: string[] = m.supported_parameters || [];
  const inputs: string[] = m.architecture?.input_modalities || [];
  return {
    id: m.id,
    name: String(m.name || m.id).replace(/\s*\(free\)\s*$/i, ''),
    provider: m.id.split('/')[0],
    contextLength: m.context_length || m.top_provider?.context_length || 0,
    vision: inputs.includes('image'),
    audio: inputs.includes('audio'),
    supportsTools: params.includes('tools'),
    supportsReasoning: params.includes('reasoning') || params.includes('include_reasoning'),
    created: m.created || 0,
  };
}

function isFreeChatModel(m: any) {
  const p = m.pricing || {};
  const free = m.id.endsWith(':free') || (Number(p.prompt) === 0 && Number(p.completion) === 0 && !Number(p.request || 0));
  const out: string[] = m.architecture?.output_modalities || ['text'];
  return free && out.length === 1 && out[0] === 'text';
}

const MODEL_CACHE = 'careva.models.v2';

export async function fetchFreeModels({ force = false } = {}): Promise<ModelInfo[]> {
  if (!force) {
    try {
      const c = JSON.parse(localStorage.getItem(MODEL_CACHE) || 'null');
      if (c && Date.now() - c.at < 30 * 60 * 1000 && c.models.length) return c.models;
    } catch { /* ignore */ }
  }
  const res = await fetch(`${API}/models`);
  if (!res.ok) throw new ApiError(res.status, `Could not load models (${res.status})`);
  const { data } = await res.json();
  const models: ModelInfo[] = data.filter(isFreeChatModel).map((raw: any) => {
    const n = normalize(raw);
    return { ...n, score: scoreModel(n) };
  });
  models.sort((a, b) => b.score - a.score || b.created - a.created);
  try { localStorage.setItem(MODEL_CACHE, JSON.stringify({ at: Date.now(), models })); } catch { /* full */ }
  return models;
}

/* ---------------- Chat ---------------- */

function headers(key: string) {
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': location.origin,
    'X-Title': APP_NAME,
  };
}

async function readError(res: Response, model: string) {
  let msg = `${res.status} ${res.statusText}`;
  try {
    const j = await res.json();
    msg = j?.error?.metadata?.raw || j?.error?.message || msg;
  } catch { /* not json */ }
  if (res.status === 401) msg = 'Your OpenRouter key was rejected. Reconnect in Settings.';
  if (res.status === 429) msg = `Rate limited on ${model} (free models have per-minute and daily limits). ${msg}`;
  return new ApiError(res.status, String(msg).slice(0, 400), model);
}

export type ApiMessage = { role: 'system' | 'user' | 'assistant'; content: string | any[] };
export interface StreamEvent { content?: string; reasoning?: string; model?: string; usage?: { completion_tokens?: number; prompt_tokens?: number } }

export async function* streamChat(opts: {
  key: string; model: string; messages: ApiMessage[]; signal?: AbortSignal;
  temperature?: number; effort?: 'high' | 'medium' | 'low';
}): AsyncGenerator<StreamEvent> {
  const body: any = { model: opts.model, messages: opts.messages, stream: true, usage: { include: true } };
  if (opts.temperature != null) body.temperature = opts.temperature;
  if (opts.effort) body.reasoning = { effort: opts.effort };
  const res = await fetch(`${API}/chat/completions`, {
    method: 'POST', headers: headers(opts.key), body: JSON.stringify(body), signal: opts.signal,
  });
  if (!res.ok || !res.body) throw await readError(res, opts.model);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      let j: any;
      try { j = JSON.parse(data); } catch { continue; }
      if (j.error) throw new ApiError(j.error.code || 500, j.error.message || 'Stream error', opts.model);
      const d = j.choices?.[0]?.delta || {};
      yield { content: d.content || undefined, reasoning: d.reasoning || undefined, model: j.model, usage: j.usage || undefined };
    }
  }
}

export async function completeChat(opts: { key: string; model: string; messages: ApiMessage[]; maxTokens?: number }) {
  const res = await fetch(`${API}/chat/completions`, {
    method: 'POST', headers: headers(opts.key),
    body: JSON.stringify({ model: opts.model, messages: opts.messages, max_tokens: opts.maxTokens ?? 60, temperature: 0.3, reasoning: { exclude: true } }),
  });
  if (!res.ok) throw await readError(res, opts.model);
  const j = await res.json();
  return String(j.choices?.[0]?.message?.content || '');
}

export async function transcribeAudio(opts: { key: string; model: string; wavBase64: string; langName?: string }) {
  const instructions = 'Transcribe this audio recording exactly as spoken, word for word, with natural punctuation.' +
    (opts.langName ? ` The speaker is most likely speaking ${opts.langName}; write it in that language's own script.` : ' Keep the original language.') +
    ' Output only the transcript text: no quotes, labels, notes or translation. If there is no speech, output nothing.';
  const res = await fetch(`${API}/chat/completions`, {
    method: 'POST', headers: headers(opts.key),
    body: JSON.stringify({
      model: opts.model, max_tokens: 1500, temperature: 0, reasoning: { exclude: true },
      messages: [{ role: 'user', content: [
        { type: 'text', text: instructions },
        { type: 'input_audio', input_audio: { data: opts.wavBase64, format: 'wav' } },
      ] }],
    }),
  });
  if (!res.ok) throw await readError(res, opts.model);
  const j = await res.json();
  return String(j.choices?.[0]?.message?.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

export async function getKeyInfo(key: string) {
  const res = await fetch(`${API}/key`, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) throw await readError(res, 'key');
  return (await res.json()).data as { label?: string; is_free_tier?: boolean; limit?: number | null };
}

/* ---------------- OAuth PKCE ---------------- */
const VERIFIER = 'careva.pkce';
const b64url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function startOAuth() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  localStorage.setItem(VERIFIER, verifier);
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const url = new URL('https://openrouter.ai/auth');
  url.searchParams.set('callback_url', location.origin + location.pathname);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  location.href = url.toString();
}

export async function finishOAuth(code: string) {
  const verifier = localStorage.getItem(VERIFIER);
  const res = await fetch(`${API}/auth/keys`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: 'S256' }),
  });
  localStorage.removeItem(VERIFIER);
  if (!res.ok) throw await readError(res, 'auth');
  const j = await res.json();
  if (!j.key) throw new Error('OpenRouter did not return a key.');
  return j.key as string;
}
