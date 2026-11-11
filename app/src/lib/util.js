export const uid = (p) => p + crypto.randomUUID().replace(/-/g, "").slice(0, 14);
export const today = () => localDate(new Date());
export function localDate(d) {
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
export const addDays = (s, n) => { const d = new Date(s + "T00:00"); d.setDate(d.getDate() + n); return localDate(d); };
export const hm = (d = new Date()) => d.toTimeString().slice(0, 5);
export const rupee = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
export function fmtDate(s, opts = { weekday: "short", day: "numeric", month: "short" }) {
  if (!s) return "—";
  return new Date(s + "T00:00").toLocaleDateString("en-IN", opts);
}
export function fmtTime(t) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
export function ago(ts) {
  if (!ts) return "never";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}
export const initials = (n = "") => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
export const byStart = (a, b) => (a.date + (a.start || "")).localeCompare(b.date + (b.start || ""));
export const minsBetween = (a, b) => Math.max(0, Math.round((b - a) / 60000));
