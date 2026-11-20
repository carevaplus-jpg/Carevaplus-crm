// Careva+ AI cloud models.
//
// Runs large open AI models for signed-in Careva+ AI users, so phones need no download, storage or memory.
// The models run on free AI services. Pollinations needs no key and always works (GPT-OSS 20B); add a free
// Groq, Cerebras or OpenRouter key for bigger, faster models. Keys stay here as Supabase secrets and never
// reach the phone. Only signed-in users can call this: each request's login token is checked with Supabase Auth.
//
//   GET  -> the cloud models and whether each is available right now
//   POST {model, effort, messages:[{role, content}]} -> a stream of lines, each one JSON:
//        {"r": "..."} reasoning text, {"t": "..."} answer text, {"done": true, "model": "...", "provider": "..."}
//        or {"error": "..."}
//   POST with "mode": "team" -> two helper agents (Solver, Checker) work in parallel, then a lead agent streams the
//        final answer. Adds {"step": "..."} progress lines; the helpers' drafts arrive as "r"; done has "team": true.
//
// Optional secrets (Supabase dashboard -> Edge Functions -> Secrets), for bigger models:
//   GROQ_API_KEY, CEREBRAS_API_KEY, OPENROUTER_API_KEY

type Provider = { id: string; name: string; base: string; key?: string; keyless?: boolean; chatPath?: string };

const PROVIDERS: Provider[] = [
  { id: "groq", name: "Groq", base: "https://api.groq.com/openai/v1", key: Deno.env.get("GROQ_API_KEY") },
  { id: "cerebras", name: "Cerebras", base: "https://api.cerebras.ai/v1", key: Deno.env.get("CEREBRAS_API_KEY") },
  { id: "openrouter", name: "OpenRouter", base: "https://openrouter.ai/api/v1", key: Deno.env.get("OPENROUTER_API_KEY") },
  // No key needed; used for every cloud model when no keyed service can answer.
  { id: "pollinations", name: "Pollinations", base: "https://text.pollinations.ai", keyless: true, chatPath: "/openai" },
];

const usable = (p: Provider) => !!p.key || !!p.keyless;
const authHeaders = (p: Provider): Record<string, string> => (p.key ? { Authorization: `Bearer ${p.key}` } : {});

// Each cloud model is a preference list: the first model id (by pattern) that a configured service offers is
// used, so the app keeps working when services rename or add models. OpenRouter is limited to its free models.
const TIERS: Record<string, { name: string; prefer: RegExp[] }> = {
  "cloud-max": {
    name: "Careva Cloud Max",
    prefer: [/^openai\/gpt-oss-120b$/, /^gpt-oss-120b$/, /kimi-k2/i, /qwen-?3-235b/i, /deepseek.*(r1|v3)/i, /llama-4-maverick/i, /llama-3\.3-70b/i],
  },
  "cloud-think": {
    name: "Careva Cloud Think",
    prefer: [/qwen-?3-235b.*thinking/i, /qwen\/?qwen-?3-32b/i, /^qwen-3-32b$/i, /deepseek.*r1/i, /^openai\/gpt-oss-120b$/, /^gpt-oss-120b$/],
  },
  "cloud-code": {
    name: "Careva Cloud Code",
    prefer: [/qwen-?3-coder/i, /kimi-k2/i, /^openai\/gpt-oss-120b$/, /^gpt-oss-120b$/, /llama-3\.3-70b/i],
  },
  "cloud-fast": {
    name: "Careva Cloud Fast",
    prefer: [/^openai\/gpt-oss-20b$/, /^gpt-oss-20b$/, /llama-3\.3-70b/i, /llama-4-scout/i, /llama-3\.1-8b/i, /llama3\.1-8b/i],
  },
};

const EFFORT_TOKENS: Record<string, number> = { LOW: 2048, MEDIUM: 4096, HIGH: 8192, ULTRA: 16384 };
const EFFORT_REASONING: Record<string, string> = { LOW: "low", MEDIUM: "medium", HIGH: "high", ULTRA: "high" };

// ---- which models each service offers (cached for 10 minutes) ----

type Model = { id: string; names: string[] }; // names: the id plus any aliases, matched against the patterns
const modelCache = new Map<string, { at: number; list: Model[] }>();

async function modelsOf(p: Provider): Promise<Model[]> {
  if (!usable(p)) return [];
  const c = modelCache.get(p.id);
  if (c && Date.now() - c.at < 600_000) return c.list;
  try {
    const r = await fetch(`${p.base}/models`, { headers: authHeaders(p) });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    let list: Model[];
    if (Array.isArray(j)) { // Pollinations: [{name, aliases, tier}], only the free (anonymous) ones
      list = j.filter((m: { tier?: string }) => !m.tier || m.tier === "anonymous")
        .map((m: { name: string; aliases?: string[] }) => ({ id: m.name, names: [m.name, ...(m.aliases ?? [])] }));
    } else {
      list = (j.data ?? []).map((m: { id: string }) => ({ id: m.id, names: [m.id.replace(/:free$/, "")] }));
      if (p.id === "openrouter") list = list.filter((m) => m.id.endsWith(":free"));
    }
    modelCache.set(p.id, { at: Date.now(), list });
    return list;
  } catch {
    if (p.keyless && !c) return [{ id: "openai", names: ["openai", "gpt-oss-20b"] }]; // its long-standing default
    return c?.list ?? [];
  }
}

/** Every (service, model) that can serve a tier, best first. */
type Candidate = { p: Provider; model: string; label: string }; // label: a readable name, e.g. gpt-oss-20b

async function candidates(tier: string): Promise<Candidate[]> {
  const t = TIERS[tier];
  if (!t) return [];
  const out: Candidate[] = [];
  const add = (p: Provider, m: Model) => {
    const named = m.names.filter((n) => /gpt-oss|qwen|llama|kimi|deepseek/i.test(n)).sort((x, y) => y.length - x.length);
    const label = named[0] ?? m.id; // the most specific name, e.g. gpt-oss-20b rather than gpt-oss
    if (!out.some((o) => o.p.id === p.id && o.model === m.id)) out.push({ p, model: m.id, label: label.replace(/^.*\//, "") });
  };
  for (const re of t.prefer) {
    for (const p of PROVIDERS) {
      const m = (await modelsOf(p)).find((m) => m.names.some((n) => re.test(n)));
      if (m) add(p, m);
    }
  }
  // Last resort for every cloud model: the best no-key model, so the app always answers.
  for (const p of PROVIDERS.filter((p) => p.keyless)) {
    const list = await modelsOf(p);
    const m = list.find((m) => m.names.some((n) => /gpt-oss|openai/i.test(n))) ?? list[0];
    if (m) add(p, m);
  }
  return out;
}

// ---- talking to the AI services ----

type Msg = { role: string; content: string };

/** At most three keyed attempts, and always the no-key service last. */
const triesOf = (list: Candidate[]) => [...list.filter((c) => !c.p.keyless).slice(0, 3), ...list.filter((c) => c.p.keyless).slice(0, 1)];

function requestBodies(c: Candidate, messages: Msg[], effort: string, stream: boolean, maxTokens: number) {
  const base: Record<string, unknown> = { model: c.model, messages, stream, max_tokens: maxTokens };
  const extra: Record<string, unknown> = {};
  if (/gpt-oss/.test(c.label)) extra.reasoning_effort = EFFORT_REASONING[effort] ?? "medium";
  if (c.p.id === "groq" && /qwen/i.test(c.model)) {
    extra.reasoning_format = "parsed";
    if (effort === "LOW") extra.reasoning_effort = "none";
  }
  return [{ ...base, ...extra }, { model: c.model, messages, stream }];
}

/** Opens a streaming reply, trying each service/model in turn until one starts answering. */
async function openStream(list: Candidate[], messages: Msg[], effort: string):
  Promise<{ upstream: Response; used: Candidate } | { error: string }> {
  let lastError = "";
  for (const c of triesOf(list)) {
    for (const attempt of requestBodies(c, messages, effort, true, EFFORT_TOKENS[effort] ?? 4096)) {
      const r = await fetch(`${c.p.base}${c.p.chatPath ?? "/chat/completions"}`, {
        method: "POST",
        headers: { ...authHeaders(c.p), "Content-Type": "application/json" },
        body: JSON.stringify(attempt),
      });
      if (r.ok && r.body) return { upstream: r, used: c };
      lastError = `${c.p.name} ${r.status}: ${(await r.text()).slice(0, 200)}`;
      if (r.status !== 400 && r.status !== 422) break; // a plain retry only helps when an option was refused
    }
  }
  console.error("all cloud models failed", lastError);
  return {
    error: /429|402/.test(lastError)
      ? "The free cloud service is busy right now. Please wait a minute and try again."
      : "The cloud model didn't respond. Please try again.",
  };
}

/** Splits <think>…</think> out of a finished text. */
function splitThink(text: string): { text: string; reasoning: string } {
  let reasoning = "";
  const out = text.replace(/<think>([\s\S]*?)(<\/think>|$)/g, (_m, t) => { reasoning += t; return ""; });
  return { text: out.trim(), reasoning: reasoning.trim() };
}

/** A whole (non-streaming) reply, for the helper agents. */
async function complete(list: Candidate[], messages: Msg[], effort: string): Promise<{ text: string; reasoning: string; label: string }> {
  let lastError = "no model";
  for (const c of triesOf(list)) {
    for (const attempt of requestBodies(c, messages, effort, false, 1500)) {
      try {
        const r = await fetch(`${c.p.base}${c.p.chatPath ?? "/chat/completions"}`, {
          method: "POST",
          headers: { ...authHeaders(c.p), "Content-Type": "application/json" },
          body: JSON.stringify(attempt),
          signal: AbortSignal.timeout(60_000),
        });
        if (r.ok) {
          const j = await r.json();
          const m = j.choices?.[0]?.message ?? {};
          const split = splitThink(typeof m.content === "string" ? m.content : "");
          const reasoning = [m.reasoning ?? m.reasoning_content ?? "", split.reasoning].filter((x) => typeof x === "string" && x).join("\n");
          if (split.text) return { text: split.text, reasoning, label: c.label };
          lastError = `${c.p.name}: empty answer`;
          break;
        }
        lastError = `${c.p.name} ${r.status}: ${(await r.text()).slice(0, 200)}`;
        if (r.status !== 400 && r.status !== 422) break;
      } catch (e) {
        lastError = `${c.p.name}: ${e}`;
        break;
      }
    }
  }
  throw new Error(lastError);
}

/**
 * Copies a service's stream to the app as simple lines, separating reasoning from the answer
 * (some models send reasoning in its own field, others inline between <think> tags).
 */
async function pump(upstream: Response, send: (o: unknown) => void) {
  const dec = new TextDecoder();
  const reader = upstream.body!.getReader();
  let buf = "", inThink = false, pending = "";
  const content = (s: string) => {
    pending += s;
    while (pending) {
      const tag = inThink ? "</think>" : "<think>";
      const i = pending.indexOf(tag);
      if (i >= 0) {
        if (i > 0) send(inThink ? { r: pending.slice(0, i) } : { t: pending.slice(0, i) });
        pending = pending.slice(i + tag.length); inThink = !inThink;
        continue;
      }
      // keep a possible partial tag for the next piece
      let keep = 0;
      for (let k = Math.min(tag.length - 1, pending.length); k > 0; k--) if (tag.startsWith(pending.slice(-k))) { keep = k; break; }
      const out = pending.slice(0, pending.length - keep);
      if (out) send(inThink ? { r: out } : { t: out });
      pending = pending.slice(pending.length - keep);
      break;
    }
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const j = JSON.parse(data);
          if (j.error) { send({ error: String(j.error.message ?? j.error) }); continue; }
          const d = j.choices?.[0]?.delta ?? {};
          const r = d.reasoning ?? d.reasoning_content;
          if (typeof r === "string" && r) send({ r });
          if (typeof d.content === "string" && d.content) content(d.content);
        } catch { /* ignore keep-alive and partial lines */ }
      }
    }
    if (pending) send(inThink ? { r: pending } : { t: pending });
  } finally {
    try { reader.releaseLock(); } catch { /* already released */ }
  }
}

const HELPERS = [
  { name: "Solver", role: "You are the Solver agent on a team. Solve the user's latest request carefully and completely. Give your full answer." },
  { name: "Checker", role: "You are the Checker agent on a team. Independently solve the user's latest request, focusing on possible mistakes, edge cases, safety (be cautious with anything medical) and points that are easy to miss. Give your full answer and list any pitfalls." },
];

const LEAD = "Two helper agents drafted answers below. Write the best final answer for the user: combine their strengths, fix any errors the Checker found, keep it clear and concise. Don't mention the agents.";


// ---- who is calling ----

const userCache = new Map<string, { at: number; id: string | null }>();

/** The signed-in user's id, checked with Supabase Auth (the public app key alone is not enough). */
async function userId(req: Request): Promise<string | null> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const c = userCache.get(token);
  if (c && Date.now() - c.at < 60_000) return c.id;
  let id: string | null = null;
  try {
    const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? req.headers.get("apikey") ?? "" },
    });
    if (r.ok) id = (await r.json()).id ?? null;
  } catch { /* treated as signed out */ }
  if (userCache.size > 500) userCache.clear();
  userCache.set(token, { at: Date.now(), id });
  return id;
}

// ---- HTTP ----

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

const NDJSON = { ...cors, "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (!(await userId(req))) return json({ error: "Please sign in to use cloud models." }, 401);

  if (req.method === "GET") {
    const models = [];
    for (const [id, t] of Object.entries(TIERS)) {
      const c = (await candidates(id))[0];
      models.push({ id, name: t.name, available: !!c, model: c?.label ?? null, provider: c?.p.name ?? null });
    }
    return json({ configured: true, keyed: PROVIDERS.some((p) => p.key), models });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { model?: string; effort?: string; mode?: string; messages?: { role: string; content: string }[] };
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const tier = body.model ?? "cloud-max";
  const effort = (body.effort ?? "MEDIUM").toUpperCase();
  const messages = (body.messages ?? [])
    .filter((m) => ["system", "user", "assistant"].includes(m.role) && typeof m.content === "string")
    .slice(-60);
  if (!messages.some((m) => m.role === "user")) return json({ error: "No message" }, 400);

  const list = await candidates(tier);
  if (list.length === 0) return json({ error: "This cloud model isn't available right now. Try another cloud model." }, 503);
  const enc = new TextEncoder();

  if (body.mode !== "team") {
    const opened = await openStream(list, messages, effort);
    if ("error" in opened) return json({ error: opened.error }, 502);
    const stream = new ReadableStream({
      async start(ctrl) {
        const send = (o: unknown) => ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
        try {
          await pump(opened.upstream, send);
          send({ done: true, model: opened.used.label, provider: opened.used.p.name });
        } catch (e) {
          send({ error: "The connection to the cloud model was interrupted." });
          console.error(e);
        } finally {
          ctrl.close();
        }
      },
      cancel() { opened.upstream.body?.cancel().catch(() => {}); },
    });
    return new Response(stream, { headers: NDJSON });
  }

  // Team mode: two helper agents work in parallel, then a lead agent writes the final answer from their drafts.
  let cancelled = false;
  let current: Response | null = null;
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (o: unknown) => { if (!cancelled) ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n")); };
      try {
        const drafts: { name: string; text: string }[] = [];
        for (const h of HELPERS) send({ step: `${h.name} agent is working` });
        await Promise.all(HELPERS.map(async (h) => {
          try {
            const res = await complete(list, [...messages, { role: "system", content: h.role }], effort);
            drafts.push({ name: h.name, text: res.text });
            send({ step: `${h.name} agent finished` });
            send({ r: `### ${h.name} agent\n${res.text}\n\n` });
          } catch (e) {
            console.error(`${h.name} agent failed`, e);
            send({ step: `${h.name} agent couldn't answer; continuing` });
          }
        }));
        if (cancelled) return;
        const order = HELPERS.map((h) => h.name);
        drafts.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
        const team = drafts.length > 0;
        const finalMessages = team
          ? [...messages, { role: "system", content: `${LEAD}\n\n${drafts.map((d) => `--- ${d.name} agent ---\n${d.text}`).join("\n\n")}` }]
          : messages;
        if (team) send({ step: "Lead agent is writing the final answer" });
        const opened = await openStream(list, finalMessages, effort);
        if ("error" in opened) { send({ error: opened.error }); return; }
        current = opened.upstream;
        await pump(opened.upstream, send);
        send(team ? { done: true, model: opened.used.label, provider: opened.used.p.name, team: true }
          : { done: true, model: opened.used.label, provider: opened.used.p.name });
      } catch (e) {
        send({ error: "The connection to the cloud model was interrupted." });
        console.error(e);
      } finally {
        if (!cancelled) ctrl.close();
      }
    },
    cancel() { cancelled = true; current?.body?.cancel().catch(() => {}); },
  });
  return new Response(stream, { headers: NDJSON });
});
