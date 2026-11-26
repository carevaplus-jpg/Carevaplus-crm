// OpenRouter client: free-model discovery + ranking, streaming chat, OAuth (PKCE) connect.
export const API = 'https://openrouter.ai/api/v1';
export const APP_NAME = 'Careva AI';

export class ApiError extends Error {
  constructor(status, message, model) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.model = model;
  }
}

/* ---------------- Models ---------------- */

// Quality ranking for known open model families. Higher = tried first.
// Patterns, not exact IDs, so new versions of the same family slot in automatically.
const FAMILY_SCORES = [
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

function sizeHint(id) {
  // "550b-a55b" -> 550, "31b" -> 31
  const m = id.match(/(\d+(?:\.\d+)?)b(?![a-z])/);
  return m ? Math.min(parseFloat(m[1]), 1000) : 0;
}

export function scoreModel(m) {
  const id = m.id.toLowerCase();
  if (id === 'openrouter/free') return -1000; // router: last-resort fallback only
  let score = 40;
  for (const [re, s] of FAMILY_SCORES) if (re.test(id)) { score = s; break; }
  if (score === 40) score += Math.min(30, Math.log2(1 + sizeHint(id)) * 3.5);
  if (/(^|[-/])(1\.7b|1b|3b|mini|tiny|nano(?!-omni))/.test(id)) score -= 15;
  if (m.supportsTools) score += 1;
  if (m.supportsReasoning) score += 1;
  score += Math.min(2, (m.contextLength || 0) / 500000);
  return score;
}

function normalize(m) {
  const params = m.supported_parameters || [];
  const inputs = m.architecture?.input_modalities || [];
  return {
    id: m.id,
    name: (m.name || m.id).replace(/\s*\(free\)\s*$/i, ''),
    provider: m.id.split('/')[0],
    description: m.description || '',
    contextLength: m.context_length || m.top_provider?.context_length || 0,
    maxOutput: m.top_provider?.max_completion_tokens || 0,
    vision: inputs.includes('image'),
    audio: inputs.includes('audio'),
    supportsTools: params.includes('tools'),
    supportsReasoning: params.includes('reasoning') || params.includes('include_reasoning'),
    created: m.created || 0,
  };
}

export function isFreeChatModel(m) {
  const p = m.pricing || {};
  const free = m.id.endsWith(':free') ||
    (Number(p.prompt) === 0 && Number(p.completion) === 0 && !Number(p.request || 0));
  const out = m.architecture?.output_modalities || ['text'];
  return free && out.length === 1 && out[0] === 'text';
}

const MODEL_CACHE = 'careva.models.v2';

export async function fetchFreeModels({ force = false } = {}) {
  if (!force) {
    try {
      const c = JSON.parse(localStorage.getItem(MODEL_CACHE) || 'null');
      if (c && Date.now() - c.at < 30 * 60 * 1000 && c.models.length) return c.models;
    } catch {}
  }
  const res = await fetch(`${API}/models`);
  if (!res.ok) throw new ApiError(res.status, `Could not load models (${res.status})`);
  const { data } = await res.json();
  const models = data.filter(isFreeChatModel).map(normalize);
  for (const m of models) m.score = scoreModel(m);
  models.sort((a, b) => b.score - a.score || b.created - a.created);
  try { localStorage.setItem(MODEL_CACHE, JSON.stringify({ at: Date.now(), models })); } catch {}
  return models;
}

/* ---------------- Chat ---------------- */

function headers(key) {
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': location.origin,
    'X-Title': APP_NAME,
  };
}

async function readError(res, model) {
  let msg = `${res.status} ${res.statusText}`;
  try {
    const j = await res.json();
    msg = j?.error?.metadata?.raw || j?.error?.message || msg;
  } catch {}
  if (res.status === 401) msg = 'Your OpenRouter key was rejected. Reconnect in Settings.';
  if (res.status === 429) msg = `Rate limited on ${model} (free models have daily/minute limits). ${msg}`;
  return new ApiError(res.status, String(msg).slice(0, 400), model);
}

/**
 * Streams a chat completion. Yields { content?, reasoning?, model?, usage? }.
 */
export async function* streamChat({ key, model, messages, signal, temperature, maxTokens, effort }) {
  const body = { model, messages, stream: true };
  if (temperature != null) body.temperature = temperature;
  if (maxTokens) body.max_tokens = maxTokens;
  if (effort) body.reasoning = { effort }; // "Extended thinking" asks reasoning models to think harder

  const res = await fetch(`${API}/chat/completions`, {
    method: 'POST', headers: headers(key), body: JSON.stringify(body), signal,
  });
  if (!res.ok) throw await readError(res, model);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue; // ": OPENROUTER PROCESSING" keep-alives
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      let j;
      try { j = JSON.parse(data); } catch { continue; }
      if (j.error) throw new ApiError(j.error.code || 500, j.error.message || 'Stream error', model);
      const d = j.choices?.[0]?.delta || {};
      const ev = {};
      if (d.content) ev.content = d.content;
      if (d.reasoning) ev.reasoning = d.reasoning;
      if (j.model) ev.model = j.model;
      if (j.usage) ev.usage = j.usage;
      if (j.choices?.[0]?.finish_reason) ev.finish = j.choices[0].finish_reason;
      yield ev;
    }
  }
}

/** Non-streaming helper (titles etc.). */
export async function completeChat({ key, model, messages, maxTokens = 60, signal }) {
  const res = await fetch(`${API}/chat/completions`, {
    method: 'POST', headers: headers(key), signal,
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.3, reasoning: { exclude: true } }),
  });
  if (!res.ok) throw await readError(res, model);
  const j = await res.json();
  return j.choices?.[0]?.message?.content || '';
}

/** Speech-to-text with an audio-capable chat model (input_audio content part). */
export async function transcribeAudio({ key, model, wavBase64, langName }) {
  const instructions = 'Transcribe this audio recording exactly as spoken, word for word, with natural punctuation.' +
    (langName ? ` The speaker is most likely speaking ${langName}; write it in that language's own script.` : ' Keep the original language.') +
    ' Output only the transcript text: no quotes, labels, notes or translation. If there is no speech, output nothing.';
  const res = await fetch(`${API}/chat/completions`, {
    method: 'POST', headers: headers(key),
    body: JSON.stringify({
      model, max_tokens: 1500, temperature: 0, reasoning: { exclude: true },
      messages: [{ role: 'user', content: [
        { type: 'text', text: instructions },
        { type: 'input_audio', input_audio: { data: wavBase64, format: 'wav' } },
      ] }],
    }),
  });
  if (!res.ok) throw await readError(res, model);
  const j = await res.json();
  return (j.choices?.[0]?.message?.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

export async function getKeyInfo(key) {
  const res = await fetch(`${API}/key`, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) throw await readError(res, 'key');
  return (await res.json()).data;
}

/* ---------------- OAuth PKCE ("Connect with OpenRouter") ---------------- */

const VERIFIER = 'careva.pkce';

function b64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function callbackUrl() {
  return location.origin + location.pathname;
}

export async function startOAuth() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  localStorage.setItem(VERIFIER, verifier);
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const url = new URL('https://openrouter.ai/auth');
  url.searchParams.set('callback_url', callbackUrl());
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  location.href = url.toString();
}

export async function finishOAuth(code) {
  const verifier = localStorage.getItem(VERIFIER);
  const res = await fetch(`${API}/auth/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: 'S256' }),
  });
  localStorage.removeItem(VERIFIER);
  if (!res.ok) throw await readError(res, 'auth');
  const j = await res.json();
  if (!j.key) throw new Error('OpenRouter did not return a key.');
  return j.key;
}
