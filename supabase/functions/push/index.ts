// Careva+ push notifications.
// Called by database triggers (public.tg_push) on new messages, alerts, patient notifications and assigned
// visits. Works out who should hear about it and sends a Firebase Cloud Messaging (FCM v1) notification to
// every phone they are signed in on — so it arrives even when the app is closed.
// Needs the FCM_SERVICE_ACCOUNT secret (the Firebase service-account JSON). Without it the call is a no-op.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { importPKCS8, SignJWT } from "npm:jose@5.9.6";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const OFFICE = ["admin", "coordinator", "supervisor", "billing"];
const SVC: Record<string, string> = { nursing: "Nursing Care", elder: "Elder Care", wound: "Wound Care", physio: "Physiotherapy", postop: "Post-op Care", palliative: "Palliative Care" };
const ALERT_TITLE: Record<string, string> = { sos: "🚨 SOS emergency", request: "New visit request", payment: "Payment reported", evv: "Visit verification", vitals: "Abnormal vitals", late: "Late arrival", resched: "Reschedule request" };

type Msg = { title: string; body: string; go: string; sos?: boolean };

async function nameOf(id: string) {
  if (id === "office") return "Careva+ office";
  const t = id.startsWith("S") ? "staff" : "patients";
  const { data } = await sb.from(t).select("doc").eq("id", id).maybeSingle();
  return (data?.doc as { name?: string })?.name || id;
}
async function users(filter: { roles?: string[]; staff?: string; patient?: string }) {
  let q = sb.from("profiles").select("id");
  if (filter.roles) q = q.in("role", filter.roles);
  if (filter.staff) q = q.eq("staff_id", filter.staff);
  if (filter.patient) q = q.eq("patient_id", filter.patient);
  const { data } = await q;
  return (data || []).map((r) => r.id as string);
}

async function plan(table: string, op: string, doc: Record<string, any>, old: Record<string, any> | null): Promise<{ to: string[]; msg: Msg } | null> {
  if (table === "messages") {
    const from = doc.from as string, thread = doc.thread as string, sos = /^🚨/.test(doc.text || "");
    if (from === "office") {
      const to = thread === "all-staff" ? await users({ roles: ["staff"] }) : thread.startsWith("S") ? await users({ staff: thread }) : await users({ patient: thread });
      return { to, msg: { title: thread === "all-staff" ? "Announcement · Careva+" : "Careva+ office", body: doc.text, go: "chat" } };
    }
    return { to: await users({ roles: OFFICE }), msg: { title: await nameOf(from), body: doc.text, go: "messages:" + thread, sos } };
  }
  if (table === "alerts") {
    if (doc.done) return null;
    return { to: await users({ roles: OFFICE }), msg: { title: ALERT_TITLE[doc.kind] || "Careva+ alert", body: doc.text, go: doc.kind === "sos" ? "sos:" + doc.id : "alerts", sos: doc.kind === "sos" } };
  }
  if (table === "notifications" && doc.pid) return { to: await users({ patient: doc.pid }), msg: { title: "Careva+", body: doc.text, go: "home" } };
  if (table === "visits" && doc.sid && (op === "INSERT" || old?.sid !== doc.sid)) {
    const when = new Date(`${doc.date}T${doc.start || "09:00"}`).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "UTC" });
    return { to: await users({ staff: doc.sid }), msg: { title: "New visit assigned", body: `${SVC[doc.service] || "Visit"} · ${await nameOf(doc.pid)} · ${when}`, go: "visits" } };
  }
  return null;
}

let cached: { token: string; exp: number } | null = null;
async function googleToken(sa: { client_email: string; private_key: string }) {
  if (cached && cached.exp > Date.now() + 60e3) return cached.token;
  const key = await importPKCS8(sa.private_key, "RS256");
  const jwt = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" }).setIssuer(sa.client_email).setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt().setExpirationTime("1h").sign(key);
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) });
  const j = await r.json();
  if (!j.access_token) throw new Error("Google auth failed: " + JSON.stringify(j));
  cached = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return cached.token;
}

Deno.serve(async (req) => {
  const secret = req.headers.get("x-hook-secret") || "";
  const { data: ok } = await sb.rpc("push_hook_ok", { s: secret });
  if (!ok) return new Response("forbidden", { status: 403 });
  const { table, op, doc, old } = await req.json();
  const p = await plan(table, op, doc || {}, old);
  if (!p || !p.to.length) return Response.json({ sent: 0, reason: "no recipients" });
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT");
  if (!raw) return Response.json({ sent: 0, reason: "FCM_SERVICE_ACCOUNT not set" });
  const sa = JSON.parse(raw);
  const { data: toks } = await sb.from("push_tokens").select("token").in("user_id", p.to);
  if (!toks?.length) return Response.json({ sent: 0, reason: "no devices" });
  const access = await googleToken(sa);
  let sent = 0;
  await Promise.all(toks.map(async ({ token }) => {
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: "POST", headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: {
        token,
        notification: { title: p.msg.title, body: String(p.msg.body || "").slice(0, 240) },
        data: { go: p.msg.go },
        android: { priority: "HIGH", notification: { channel_id: p.msg.sos ? "careva-sos" : "careva", sound: "default", default_vibrate_timings: true, notification_priority: p.msg.sos ? "PRIORITY_MAX" : "PRIORITY_HIGH" } },
      } }),
    });
    if (r.ok) sent++;
    else if (r.status === 404) await sb.from("push_tokens").delete().eq("token", token); // app uninstalled → token gone
  }));
  return Response.json({ sent, devices: toks.length });
});
