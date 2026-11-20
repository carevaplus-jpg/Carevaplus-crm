// Careva+ AI cloud models.
//
// Runs large open AI models for signed-in Careva+ AI users, so phones need no download, storage or memory.
// The models run on free AI services (Groq, Cerebras or OpenRouter); their keys stay here as Supabase
// secrets and never reach the phone. Only signed-in users can call this: each request's login token is checked with Supabase Auth.
//
//   GET  -> the cloud models and whether each is available right now
//   POST {model, effort, messages:[{role, content}]} -> a stream of lines, each one JSON:
//        {"r": "..."} reasoning text, {"t": "..."} answer text, {"done": true, "model": "...", "provider": "..."}
//        or {"error": "..."}
//
// Secrets (Supabase dashboard -> Edge Functions -> Secrets), at least one:
//   GROQ_API_KEY, CEREBRAS_API_KEY, OPENROUTER_API_KEY

type Provider = { id: string; name: string; base: string; key?: string };

const PROVIDERS: Provider[] = [
  { id: "groq", name: "Groq", base: "https://api.groq.com/openai/v1", key: Deno.env.get("GROQ_API_KEY") },
  { id: "cerebras", name: "Cerebras", base: "https://api.cerebras.ai/v1", key: Deno.env.get("CEREBRAS_API_KEY") },
  { id: "openrouter", name: "OpenRouter", base: "https://openrouter.ai/api/v1", key: Deno.env.get("OPENROUTER_API_KEY") },
];

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

const modelCache = new Map<string, { at: number; ids: string[] }>();

async function modelsOf(p: Provider): Promise<string[]> {
  if (!p.key) return [];
  const c = modelCache.get(p.id);
  if (c && Date.now() - c.at < 600_000) return c.ids;
  try {
    const r = await fetch(`${p.base}/models`, { headers: { Authorization: `Bearer ${p.key}` } });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    let ids: string[] = (j.data ?? []).map((m: { id: string }) => m.id);
    if (p.id === "openrouter") ids = ids.filter((id) => id.endsWith(":free"));
    modelCache.set(p.id, { at: Date.now(), ids });
    return ids;
  } catch {
    return c?.ids ?? [];
  }
}

/** Every (service, model) that can serve a tier, best first. */
async function candidates(tier: string): Promise<{ p: Provider; model: string }[]> {
  const t = TIERS[tier];
  if (!t) return [];
  const out: { p: Provider; model: string }[] = [];
  for (const re of t.prefer) {
    for (const p of PROVIDERS) {
      const ids = await modelsOf(p);
      const id = ids.find((m) => re.test(m.replace(/:free$/, "")));
      if (id && !out.some((o) => o.p.id === p.id && o.model === id)) out.push({ p, model: id });
    }
  }
  return out;
}

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
      models.push({ id, name: t.name, available: !!c, model: c?.model ?? null, provider: c?.p.name ?? null });
    }
    return json({ configured: PROVIDERS.some((p) => p.key), models });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { model?: string; effort?: string; messages?: { role: string; content: string }[] };
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const tier = body.model ?? "cloud-max";
  const effort = (body.effort ?? "MEDIUM").toUpperCase();
  const messages = (body.messages ?? [])
    .filter((m) => ["system", "user", "assistant"].includes(m.role) && typeof m.content === "string")
    .slice(-60);
  if (!messages.some((m) => m.role === "user")) return json({ error: "No message" }, 400);

  if (!PROVIDERS.some((p) => p.key))
    return json({ error: "Cloud models aren't switched on yet: the Careva+ owner needs to add a free AI service key in Supabase." }, 503);
  const list = await candidates(tier);
  if (list.length === 0) return json({ error: "This cloud model isn't available right now. Try another cloud model." }, 503);

  // Try each service/model in turn until one starts answering (for example when one is busy or over its free limit).
  let upstream: Response | null = null;
  let used: { p: Provider; model: string } | null = null;
  let lastError = "";
  outer: for (const c of list.slice(0, 4)) {
    const base: Record<string, unknown> = { model: c.model, messages, stream: true, max_tokens: EFFORT_TOKENS[effort] ?? 4096 };
    const extra: Record<string, unknown> = {};
    if (/gpt-oss/.test(c.model)) extra.reasoning_effort = EFFORT_REASONING[effort] ?? "medium";
    if (c.p.id === "groq" && /qwen/i.test(c.model)) {
      extra.reasoning_format = "parsed";
      if (effort === "LOW") extra.reasoning_effort = "none";
    }
    for (const attempt of [{ ...base, ...extra }, { model: c.model, messages, stream: true }]) {
      const r = await fetch(`${c.p.base}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${c.p.key}`, "Content-Type": "application/json" },
        body: JSON.stringify(attempt),
      });
      if (r.ok && r.body) { upstream = r; used = c; break outer; }
      lastError = `${c.p.name} ${r.status}: ${(await r.text()).slice(0, 200)}`;
      if (r.status !== 400 && r.status !== 422) break; // a plain retry only helps when an option was refused
    }
  }
  if (!upstream || !used) {
    console.error("all cloud models failed", lastError);
    return json({ error: /429/.test(lastError)
      ? "The free cloud limit was reached for now. Please wait a minute and try again, or use a phone model."
      : "The cloud model didn't respond. Please try again." }, 502);
  }

  // Turn the service's stream into simple lines for the app, separating reasoning from the answer
  // (some models send reasoning in its own field, others inline between <think> tags).
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const reader = upstream.body!.getReader();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (o: unknown) => ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
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
        send({ done: true, model: used!.model, provider: used!.p.name });
      } catch (e) {
        send({ error: "The connection to the cloud model was interrupted." });
        console.error(e);
      } finally {
        ctrl.close();
      }
    },
    cancel() { reader.cancel(); },
  });
  return new Response(stream, { headers: { ...cors, "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" } });
});
