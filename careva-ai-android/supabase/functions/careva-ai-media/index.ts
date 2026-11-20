// Careva+ AI image and video creation.
//
// Signed-in Careva+ AI users can create pictures and short videos. Results are stored in the public
// Supabase Storage bucket `ai-media` under <userId>/<random id>, so the same link works on every phone.
//
//   POST {"kind":"image","prompt":"...","quality":"best"|"fast"}
//        -> {"url","model","free"}
//   POST {"kind":"video","prompt":"...","quality":"pro"|"standard","duration":5}
//        -> {"job","model"}            (video takes 1–3 minutes; poll with GET ?job=)
//   GET  ?job=<job> -> {"status":"running"} | {"status":"done","url","model"} | {"status":"failed","error"}
//
// Images use Pollinations' top models when the optional secret POLLINATIONS_API_KEY is set (Supabase dashboard ->
// Edge Functions -> Secrets), and otherwise its free no-key image model. Video always needs the key and paid
// Pollinations credit.

const GEN = "https://gen.pollinations.ai";
const FREE_IMAGE = "https://image.pollinations.ai/prompt/";

const IMAGE_MODELS: Record<string, { id: string; name: string }[]> = {
  best: [
    { id: "openai/gpt-image-2", name: "GPT Image 2" },
    { id: "black-forest-labs/flux.2-pro", name: "FLUX.2 Pro" },
    { id: "black-forest-labs/flux.1.1-pro", name: "FLUX 1.1 Pro" },
    { id: "microsoft/mai-image-2.7", name: "MAI Image 2.7" },
  ],
  fast: [
    { id: "black-forest-labs/flux.1.1-pro", name: "FLUX 1.1 Pro" },
    { id: "microsoft/mai-image-2.7", name: "MAI Image 2.7" },
    { id: "tongyi-mai/z-image-turbo", name: "Z-Image Turbo" },
  ],
};

const VIDEO_MODELS: Record<string, { id: string; name: string }[]> = {
  pro: [
    { id: "google/veo-3.1-fast", name: "Veo 3.1 (with sound)" },
    { id: "kwaivgi/kling-v3.0-std", name: "Kling 3.0" },
  ],
  standard: [
    { id: "alibaba/wan-2.2-fast", name: "Wan 2.2" },
    { id: "bytedance/seedance-2.0-fast", name: "Seedance 2.0" },
  ],
};

const NEED_CREDIT = "Video needs paid credit on the Pollinations account: about $0.05 for a 5-second Wan video or $0.50 for Veo with sound. Top up at enter.pollinations.ai, then try again.";

const env = (k: string) => Deno.env.get(k) ?? "";

// ---- who is calling (same check as careva-ai-chat) ----

const userCache = new Map<string, { at: number; id: string | null }>();

async function userId(req: Request): Promise<string | null> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const c = userCache.get(token);
  if (c && Date.now() - c.at < 60_000) return c.id;
  let id: string | null = null;
  try {
    const r = await fetch(`${env("SUPABASE_URL")}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? req.headers.get("apikey") ?? "" },
    });
    if (r.ok) id = (await r.json()).id ?? null;
  } catch { /* treated as signed out */ }
  if (userCache.size > 500) userCache.clear();
  userCache.set(token, { at: Date.now(), id });
  return id;
}

// ---- helpers ----

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function extFor(type: string): string | null {
  const t = type.toLowerCase();
  if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
  if (t.includes("png")) return "png";
  if (t.includes("webp")) return "webp";
  if (t.includes("mp4") || t.startsWith("video/")) return "mp4";
  return null;
}

async function fetchT(url: string, init: RequestInit = {}, ms = 120_000): Promise<Response> {
  return await fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
}

/** Stores bytes in the public ai-media bucket and returns their public address. */
async function store(user: string, bytes: Uint8Array, type: string): Promise<string> {
  const ext = extFor(type);
  if (!ext) throw new Error("unsupported type");
  const contentType = ext === "jpg" ? "image/jpeg" : ext === "mp4" ? "video/mp4" : `image/${ext}`;
  const path = `${user}/${crypto.randomUUID()}.${ext}`;
  const r = await fetchT(`${env("SUPABASE_URL")}/storage/v1/object/ai-media/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": contentType, "x-upsert": "true" },
    body: bytes,
  }, 60_000);
  if (!r.ok) { console.error("storage upload failed", r.status); throw new Error("upload failed"); }
  return `${env("SUPABASE_URL")}/storage/v1/object/public/ai-media/${path}`;
}

const enc = (s: string) => encodeURIComponent(s);
const seed = () => Math.floor(Math.random() * 1_000_000_000);

function b64url(s: string) {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(s: string) {
  const p = s.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(p + "=".repeat((4 - (p.length % 4)) % 4))));
}

// ---- images ----

async function image(user: string, prompt: string, quality: string): Promise<Response> {
  const key = env("POLLINATIONS_API_KEY");
  if (key) {
    for (const m of IMAGE_MODELS[quality] ?? IMAGE_MODELS.best) {
      try {
        const r = await fetchT(`${GEN}/image/${enc(prompt)}?model=${enc(m.id)}&width=1024&height=1024&seed=${seed()}`,
          { headers: { Authorization: `Bearer ${key}` } });
        const type = r.headers.get("content-type") ?? "";
        if (r.ok && extFor(type) && extFor(type) !== "mp4") {
          const url = await store(user, new Uint8Array(await r.arrayBuffer()), type);
          return json({ url, model: m.name, free: false });
        }
        console.error("image model failed", m.id, r.status);
        await r.body?.cancel();
      } catch (e) {
        console.error("image model error", m.id, (e as Error).name);
      }
    }
  }
  // Free, no-key model (lower quality, small watermark).
  try {
    const r = await fetchT(`${FREE_IMAGE}${enc(prompt)}?width=1024&height=1024&seed=${seed()}&nologo=true&enhance=true`);
    const type = r.headers.get("content-type") ?? "";
    if (r.ok && extFor(type) && extFor(type) !== "mp4") {
      const url = await store(user, new Uint8Array(await r.arrayBuffer()), type);
      return json({ url, model: "Free image model", free: true });
    }
    console.error("free image failed", r.status);
  } catch (e) {
    console.error("free image error", (e as Error).name);
  }
  return json({ error: "Couldn't create the image right now. Please try again." }, 502);
}

// ---- video ----

async function startVideo(user: string, prompt: string, quality: string, duration: number): Promise<Response> {
  const key = env("POLLINATIONS_API_KEY");
  if (!key) return json({ error: "Video creation isn't switched on yet: add a Pollinations key in Supabase (see the README).", setup: true }, 503);
  const secs = Math.min(8, Math.max(4, Math.round(Number.isFinite(duration) ? duration : 5)));
  for (const m of VIDEO_MODELS[quality] ?? VIDEO_MODELS.standard) {
    try {
      const r = await fetchT(`${GEN}/video/${enc(prompt)}?model=${enc(m.id)}&duration=${secs}`,
        { headers: { Authorization: `Bearer ${key}`, Prefer: "respond-async" } }, 60_000);
      if (r.status === 402) { await r.body?.cancel(); return json({ error: NEED_CREDIT, setup: true }, 402); }
      if (r.status === 202) {
        const j = await r.json();
        if (j?.id) return json({ job: b64url(JSON.stringify({ id: String(j.id), model: m.name })), model: m.name });
      } else if (r.ok && extFor(r.headers.get("content-type") ?? "") === "mp4") {
        // An already made (cached) video comes back straight away.
        const url = await store(user, new Uint8Array(await r.arrayBuffer()), "video/mp4");
        return json({ job: b64url(JSON.stringify({ url, model: m.name })), model: m.name });
      } else {
        console.error("video model failed", m.id, r.status);
        await r.body?.cancel();
      }
    } catch (e) {
      console.error("video model error", m.id, (e as Error).name);
    }
  }
  return json({ error: "Couldn't start the video right now. Please try again." }, 502);
}

async function pollVideo(user: string, job: string): Promise<Response> {
  let j: { id?: string; url?: string; model?: string };
  try { j = JSON.parse(unb64url(job)); } catch { return json({ error: "Unknown video job." }, 400); }
  const model = j.model ?? "Video";
  if (j.url) return json({ status: "done", url: j.url, model });
  if (!j.id) return json({ error: "Unknown video job." }, 400);
  const key = env("POLLINATIONS_API_KEY");
  if (!key) return json({ status: "failed", error: "Video creation isn't switched on." });
  try {
    const r = await fetchT(`${GEN}/v1/jobs/${enc(j.id)}`, { headers: { Authorization: `Bearer ${key}` } }, 30_000);
    if (r.status === 404) return json({ status: "failed", error: "This video expired or couldn't be found. Please create it again." });
    if (!r.ok) { console.error("job poll failed", r.status); await r.body?.cancel(); return json({ status: "running" }); }
    const s = await r.json();
    if (s.status === "failed") return json({ status: "failed", error: "The video couldn't be made. Try a different description." });
    if (s.status !== "succeeded") return json({ status: "running" });
    const res = await fetchT(`${GEN}/v1/jobs/${enc(j.id)}/result`, { headers: { Authorization: `Bearer ${key}` } }, 120_000);
    if (res.status === 409) { await res.body?.cancel(); return json({ status: "running" }); }
    if (!res.ok) { console.error("job result failed", res.status); await res.body?.cancel(); return json({ status: "failed", error: "Couldn't download the video. Please try again." }); }
    const url = await store(user, new Uint8Array(await res.arrayBuffer()), "video/mp4");
    return json({ status: "done", url, model });
  } catch (e) {
    console.error("job poll error", (e as Error).name);
    return json({ status: "running" });
  }
}

// ---- HTTP ----

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const user = await userId(req);
  if (!user) return json({ error: "Please sign in to use image and video creation." }, 401);

  if (req.method === "GET") {
    const job = new URL(req.url).searchParams.get("job");
    if (!job) return json({ error: "Missing job." }, 400);
    return pollVideo(user, job);
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { kind?: string; prompt?: string; quality?: string; duration?: number };
  try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const prompt = (body.prompt ?? "").trim().slice(0, 2000);
  if (body.kind === "image") {
    if (!prompt) return json({ error: "Describe the image you want." }, 400);
    return image(user, prompt, body.quality === "fast" ? "fast" : "best");
  }
  if (body.kind === "video") {
    if (!prompt) return json({ error: "Describe the video you want." }, 400);
    return startVideo(user, prompt, body.quality === "pro" ? "pro" : "standard", Number(body.duration ?? 5));
  }
  return json({ error: "Unknown request." }, 400);
});
