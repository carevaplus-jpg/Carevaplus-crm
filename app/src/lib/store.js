import { useSyncExternalStore } from "react";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY, STAFF_DOMAIN, PATIENT_DOMAIN } from "./config";
import { notify, initNotifications } from "./notify";
import { SERVICES as SVC } from "./config";

/* ------------------------------------------------------------------ *
 * One cache for every table the signed-in user may read (row-level
 * security decides what that is), kept live with Supabase Realtime.
 * Rows are flattened to { ...doc, id } — the DB derives its indexed
 * columns from doc via triggers, so writes always send { id, doc }.
 * ------------------------------------------------------------------ */

const DOC_TABLES = ["settings", "staff", "patients", "visits", "requests", "invoices", "alerts", "messages", "notifications", "vitals", "staff_locations", "shifts", "timesheets", "docs", "leave"];

function createLiveBackend() {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  return {
    async session() {
      const { data } = await sb.auth.getSession();
      return data.session;
    },
    async signIn(kind, ident, password) {
      let email = ident.trim();
      if (kind === "staff") email = `${email.toLowerCase()}@${STAFF_DOMAIN}`;
      if (kind === "patient") email = `${email.replace(/\D/g, "").slice(-10)}@${PATIENT_DOMAIN}`;
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message === "Invalid login credentials" ? "That ID and password don't match. Check them and try again." : error.message);
    },
    async signOut() { await sb.auth.signOut(); },
    async profile() {
      const { data: s } = await sb.auth.getSession();
      if (!s.session) return null;
      const { data, error } = await sb.from("profiles").select("*").eq("id", s.session.user.id).single();
      if (error) throw error;
      return data;
    },
    async load(table, profile) {
      if (table === "location_trail") {
        if (!["admin", "coordinator", "supervisor", "billing"].includes(profile.role)) return [];
        const since = new Date(Date.now() - 36 * 3600e3).toISOString();
        const { data } = await sb.from("location_trail").select("*").gte("recorded_at", since).order("recorded_at").limit(5000);
        return data || [];
      }
      const { data, error } = await sb.from(table).select("id, doc");
      if (error) return [];
      return data.map((r) => ({ ...r.doc, id: r.id }));
    },
    // Existing rows are UPDATEd and new rows INSERTed (not upserted): an upsert would also need INSERT
    // permission, which staff/patients only have on some tables under the row-level security rules.
    async put(table, id, doc, exists) {
      const body = { ...doc, id: doc.id ?? id };
      const q = exists ? sb.from(table).update({ doc: body }).eq("id", id).select("id") : sb.from(table).insert({ id, doc: body }).select("id");
      const { data, error } = await q;
      if (error) throw new Error(friendly(error.message));
      if (exists && !data?.length) throw new Error("You don't have permission to change this record.");
    },
    async trail(staffId, p) {
      await sb.from("location_trail").insert({ staff_id: staffId, lat: p.lat, lng: p.lng, acc: p.acc });
    },
    async registerPush(token) {
      const { error } = await sb.rpc("register_push_token", { p_token: token, p_platform: "android" });
      if (error) throw error;
    },
    async signedUrl(path) {
      const { data } = await sb.storage.from("careva").createSignedUrl(path, 600);
      return data?.signedUrl;
    },
    subscribe(onRow) {
      const ch = sb.channel("careva-live");
      [...DOC_TABLES, "location_trail"].forEach((t) =>
        ch.on("postgres_changes", { event: "*", schema: "public", table: t }, (p) => onRow(t, p.eventType, p.new, p.old)),
      );
      ch.subscribe();
      return () => sb.removeChannel(ch);
    },
  };
}

const friendly = (m) => /row-level security/i.test(m) ? "You don't have permission to do that. Ask the office if you think this is wrong." : /Failed to fetch|NetworkError/i.test(m) ? "No internet connection. Check your network and try again." : m;

/* ----------------------------- store ------------------------------ */
let backend = null;
let state = { ready: false, profile: null, t: {} };
const subs = new Set();
const emit = () => subs.forEach((f) => f());
const set = (patch) => { state = { ...state, ...patch }; emit(); };

export const useStore = (sel = (s) => s) => sel(useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => state));
export const getState = () => state;
export const api = () => backend;

function applyRow(table, type, row, old, remote = false) {
  if (remote) maybeNotify(table, type, row);
  const cur = state.t[table] || [];
  let next;
  if (table === "location_trail") next = type === "INSERT" ? [...cur, row] : cur;
  else if (type === "DELETE") next = cur.filter((r) => r.id !== old.id);
  else {
    const flat = { ...row.doc, id: row.id };
    const i = cur.findIndex((r) => r.id === flat.id);
    next = i < 0 ? [...cur, flat] : cur.map((r, j) => (j === i ? flat : r));
  }
  set({ t: { ...state.t, [table]: next } });
}

let unsub = null;
/** `testBackend` is only passed by local test builds (VITE_TEST_FIXTURES); real builds always use the live database. */
export async function boot(testBackend) {
  backend = testBackend || createLiveBackend();
  const session = await backend.session();
  if (!session) return set({ ready: true, profile: null, t: {} });
  await loadAll();
}

async function loadAll() {
  const profile = await backend.profile();
  if (!profile) return set({ ready: true, profile: null });
  const tables = [...DOC_TABLES, "location_trail"];
  const rows = await Promise.all(tables.map((t) => backend.load(t, profile)));
  set({ ready: true, profile, t: Object.fromEntries(tables.map((t, i) => [t, rows[i]])) });
  unsub?.();
  unsub = backend.subscribe((t, type, row, old) => applyRow(t, type, row, old, true));
  initNotifications((tok) => backend.registerPush?.(tok));
}

/* --------------------------- notifications --------------------------- */
const seen = new Set();
const nameOf = (id) => id === "office" ? "Careva+ office" : (byId(state.t.staff, id) || byId(state.t.patients, id))?.name || id;
function maybeNotify(table, type, row) {
  const p = state.profile; if (!p || !row) return;
  const doc = row.doc ? { ...row.doc, id: row.id } : row;
  const key = table + ":" + doc.id + ":" + type;
  if (seen.has(key)) return; seen.add(key);
  const office = isOffice(p), me = office ? "office" : p.role === "staff" ? p.staff_id : p.patient_id;
  if (table === "messages" && type === "INSERT" && doc.from !== me && Date.now() - (doc.ts || 0) < 120e3) {
    if (office && doc.from === "office") return;
    const where = office ? "messages:" + doc.thread : "chat";
    const title = doc.thread === "all-staff" ? "Announcement · Careva+" : nameOf(doc.from);
    const sos = /^🚨/.test(doc.text || "");
    return notify({ id: key, title, body: doc.text, tone: sos ? "sos" : "msg", go: where });
  }
  if (table === "alerts" && type === "INSERT" && office && !doc.done) {
    const sos = doc.kind === "sos";
    return notify({ id: key, title: sos ? "🚨 SOS emergency" : ({ request: "New visit request", payment: "Payment reported", evv: "Visit verification", vitals: "Abnormal vitals", late: "Late arrival", resched: "Reschedule request" }[doc.kind] || "Alert"), body: doc.text, tone: sos ? "sos" : "alert", go: sos ? "sos:" + doc.id : "alerts" });
  }
  if (table === "notifications" && type === "INSERT" && p.role === "patient") return notify({ id: key, title: "Careva+", body: doc.text, tone: "msg", go: "home" });
  if (table === "visits" && type === "INSERT" && p.role === "staff" && doc.sid === p.staff_id) return notify({ id: key, title: "New visit assigned", body: `${SVC[doc.service]?.label || "Visit"} · ${new Date(doc.date + "T" + (doc.start || "09:00")).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`, tone: "alert", go: "visits" });
}

export async function signIn(kind, ident, pw) {
  await backend.signIn(kind, ident, pw);
  await loadAll();
}
export async function signOut() {
  unsub?.(); unsub = null; seen.clear();
  await backend.signOut();
  set({ profile: null, t: {} });
}

/** Write a document. Updates the cache immediately; realtime brings back the server's version (after triggers/guards). */
export async function put(table, doc) {
  const prev = state.t[table] || [];
  const exists = prev.some((r) => r.id === doc.id);
  applyRow(table, "UPSERT", { id: doc.id, doc });
  try { await backend.put(table, doc.id, doc, exists); }
  catch (e) { set({ t: { ...state.t, [table]: prev } }); throw e; }
}
export const patch = (table, id, changes) => {
  const row = (state.t[table] || []).find((r) => r.id === id) || { id };
  return put(table, { ...row, ...changes });
};

/* ------------------------- derived helpers ------------------------ */
export const settings = (s) => (s.t.settings || []).find((r) => r.id === "main") || {};
export const byId = (list, id) => (list || []).find((r) => r.id === id);
export const isOffice = (p) => p && ["admin", "coordinator", "supervisor", "billing"].includes(p.role);
