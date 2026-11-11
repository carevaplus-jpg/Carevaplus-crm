import { today, addDays, uid } from "../src/lib/util";
import { TASKS } from "../src/lib/config";

/* In-memory backend with sample data around Salem, for trying the app without touching real records.
   A caregiver on the way to a patient moves every 2.5 s so live tracking can be seen working. */

const OFFICE = { lat: 11.682734, lng: 78.153343 };
const D = today();

const staff = [
  { id: "S101", name: "Priya Raman", role: "Staff Nurse", short: "GNM", phone: "98400 11223", color: "#2B6DE8", exp: 5, qual: "GNM Diploma", skills: ["nursing", "elder", "wound"], active: true, joined: "2025-02-11", area: "Fairlands" },
  { id: "S102", name: "Arun Kumar", role: "Physiotherapist", short: "BPT", phone: "98400 22334", color: "#8E4EC6", exp: 7, qual: "BPT", skills: ["physio", "postop"], active: true, joined: "2024-08-01", area: "Hasthampatti" },
  { id: "S103", name: "Meena Devi", role: "Care Assistant", short: "CA", phone: "98400 33445", color: "#3FA34D", exp: 3, qual: "Certified Caregiver", skills: ["elder", "palliative"], active: true, joined: "2025-06-20", area: "Ammapet" },
  { id: "S104", name: "Karthik S", role: "Staff Nurse", short: "B.Sc", phone: "98400 44556", color: "#E5862B", exp: 4, qual: "B.Sc Nursing", skills: ["nursing", "wound", "postop"], active: true, joined: "2025-01-05", area: "Shevapet" },
];
const patients = [
  { id: "P1001", name: "Lakshmi Narayanan", age: 72, g: "F", phone: "90000 10001", addr: "14, 3rd Cross, Fairlands, Salem 636016", area: "Fairlands", lat: 11.6745, lng: 78.1352, dx: ["Type 2 diabetes", "Hypertension"], allergies: ["Penicillin"], blood: "B+", doctor: "Dr. R. Senthil", risk: "Medium", services: ["nursing"], status: "active", since: "2026-09-02", payer: "Self pay", source: "Hospital discharge", contact: { name: "Suresh N", rel: "Son", phone: "90000 20001" } },
  { id: "P1002", name: "Rajendran K", age: 64, g: "M", phone: "90000 10002", addr: "7, Gandhi Road, Hasthampatti, Salem 636007", area: "Hasthampatti", lat: 11.6722, lng: 78.1628, dx: ["Knee replacement (post-op)"], allergies: [], blood: "O+", doctor: "Dr. M. Kavitha", risk: "Low", services: ["physio"], status: "active", since: "2026-10-20", payer: "Insurance — Star Health", source: "Doctor referral", contact: { name: "Revathi R", rel: "Wife", phone: "90000 20002" } },
  { id: "P1003", name: "Saroja Ammal", age: 81, g: "F", phone: "90000 10003", addr: "22, Bazaar Street, Ammapet, Salem 636003", area: "Ammapet", lat: 11.6592, lng: 78.1781, dx: ["Dementia (mild)", "Osteoarthritis"], allergies: [], blood: "A+", doctor: "Dr. P. Anand", risk: "High", services: ["elder", "palliative"], status: "active", since: "2026-07-14", payer: "Self pay", source: "Website", contact: { name: "Vijay A", rel: "Grandson", phone: "90000 20003" } },
  { id: "P1004", name: "Mohammed Ismail", age: 58, g: "M", phone: "90000 10004", addr: "3, Mill Road, Shevapet, Salem 636002", area: "Shevapet", lat: 11.6531, lng: 78.1556, dx: ["Diabetic foot ulcer"], allergies: ["Sulfa drugs"], blood: "AB+", doctor: "Dr. R. Senthil", risk: "High", services: ["wound"], status: "active", since: "2026-10-28", payer: "Insurance (verification pending)", source: "Hospital discharge", contact: { name: "Ayesha I", rel: "Daughter", phone: "90000 20004" } },
  { id: "P1005", name: "Gowri Shankar", age: 69, g: "M", phone: "90000 10005", addr: "41, Alagapuram Main Rd, Salem 636004", area: "Alagapuram", lat: 11.6884, lng: 78.1362, dx: ["COPD"], allergies: [], blood: "O-", doctor: "Dr. M. Kavitha", risk: "Medium", services: ["nursing"], status: "active", since: "2026-08-19", payer: "Self pay", source: "Patient app", contact: { name: "Uma G", rel: "Wife", phone: "90000 20005" } },
];
const tasks = (svc, done = 0) => TASKS[svc].map((t, i) => ({ t, done: i < done }));
const visits = [
  { id: "V1", pid: "P1001", sid: "S101", date: D, start: "08:30", dur: 45, service: "nursing", status: "completed", tasks: tasks("nursing", 6), evv: { status: "verified", mode: "gps", inT: "08:34", outT: "09:16", inDist: 18, outDist: 21 }, rating: 5, notes: "Sugar 142 fasting. Insulin given as charted." },
  { id: "V2", pid: "P1002", sid: "S102", date: D, start: "10:30", dur: 45, service: "physio", status: "enroute", tasks: tasks("physio"), enrouteAt: Date.now() - 6 * 60e3 },
  { id: "V3", pid: "P1003", sid: "S103", date: D, start: "10:00", dur: 60, service: "elder", status: "inprogress", tasks: tasks("elder", 3), evv: { status: "pending", mode: "gps", inT: "10:04", inDist: 22 } },
  { id: "V4", pid: "P1004", sid: "S104", date: D, start: "12:00", dur: 40, service: "wound", status: "scheduled", tasks: tasks("wound") },
  { id: "V5", pid: "P1005", sid: "S101", date: D, start: "15:30", dur: 45, service: "nursing", status: "scheduled", tasks: tasks("nursing") },
  { id: "V6", pid: "P1001", sid: "S101", date: addDays(D, 1), start: "08:30", dur: 45, service: "nursing", status: "scheduled", tasks: tasks("nursing") },
  { id: "V7", pid: "P1003", sid: "S103", date: addDays(D, 1), start: "10:00", dur: 60, service: "elder", status: "scheduled", tasks: tasks("elder") },
  { id: "V8", pid: "P1002", sid: "S102", date: addDays(D, -2), start: "10:30", dur: 45, service: "physio", status: "completed", tasks: tasks("physio", 5), evv: { status: "verified", mode: "gps", inT: "10:31", outT: "11:18", inDist: 9, outDist: 14 }, rating: 4 },
  { id: "V9", pid: "P1004", sid: "S104", date: addDays(D, -1), start: "12:00", dur: 40, service: "wound", status: "completed", tasks: tasks("wound", 6), evv: { status: "flagged", mode: "gps", inT: "12:22", outT: "12:58", inDist: 240, outDist: 31 } },
];
// S102 drives from Five Roads towards Hasthampatti (P1002)
const ROUTE = [[11.6703, 78.1450], [11.6712, 78.1478], [11.6718, 78.1506], [11.6721, 78.1534], [11.6719, 78.1562], [11.6716, 78.1589], [11.6719, 78.1607], [11.6722, 78.1620]];
const locs = [
  { id: "S101", lat: 11.6801, lng: 78.1410, acc: 8, on: true, ts: Date.now() - 4 * 60e3 },
  { id: "S102", lat: ROUTE[0][0], lng: ROUTE[0][1], acc: 6, on: true, ts: Date.now() - 20e3 },
  { id: "S103", lat: 11.6594, lng: 78.1779, acc: 10, on: true, ts: Date.now() - 50e3 },
  { id: "S104", lat: 11.6580, lng: 78.1500, acc: 12, on: true, ts: Date.now() - 9 * 60e3 },
];
const trail = [];
const trails = { S101: [[11.6827, 78.1533], [11.6790, 78.1460], [11.6760, 78.1390], [11.6745, 78.1352], [11.6770, 78.1380], [11.6801, 78.1410]], S103: [[11.6827, 78.1533], [11.6750, 78.1640], [11.6660, 78.1730], [11.6594, 78.1779]], S104: [[11.6827, 78.1533], [11.6700, 78.1540], [11.6580, 78.1500]] };
let tid = 1;
Object.entries(trails).forEach(([sid, pts]) => pts.forEach(([lat, lng], i) => trail.push({ id: tid++, staff_id: sid, lat, lng, acc: 8, recorded_at: new Date(Date.now() - (pts.length - i) * 15 * 60e3).toISOString() })));
const vit = (pid, d, sys, dia, pulse, spo2, sugar, temp) => ({ id: uid("VT"), pid, date: addDays(D, d), time: "09:00", sys, dia, pulse, spo2, sugar, temp, by: "S101" });
const data = {
  settings: [{ id: "main", company: { name: "Careva Plus Home Health Care", phone: "96555 08881", web: "carevaplus.com", city: "Salem · Tamil Nadu", upi: "carevaplus@upi", officeLat: OFFICE.lat, officeLng: OFFICE.lng, officeSet: true }, geofence: 75, lateMin: 15, mileageRate: 0, requireSig: true, requirePhotoWound: true, rates: { nursing: 800, elder: 900, wound: 900, physio: 700, postop: 1000, palliative: 1200 } }],
  staff, patients, visits,
  requests: [
    { id: "RQ1", pid: "P1005", service: "nursing", date: addDays(D, 1), slot: "17:00", notes: "Need evening insulin support this week.", source: "Patient app", status: "pending", created: Date.now() - 40 * 60e3 },
    { id: "RQ2", pid: "", name: "Kavya M", phone: "90000 30006", service: "elder", date: addDays(D, 2), slot: "09:00", notes: "Mother, 78, needs day-care assistance.", source: "Website", status: "pending", created: Date.now() - 3 * 3600e3 },
  ],
  invoices: [
    { id: "INV-1", pid: "P1001", month: D.slice(0, 7), date: addDays(D, -5), due: addDays(D, 5), items: [{ d: "Nursing Care", q: 8, r: 800 }], amount: 6400, status: "due" },
    { id: "INV-2", pid: "P1002", month: D.slice(0, 7), date: addDays(D, -6), due: addDays(D, 4), items: [{ d: "Physiotherapy", q: 6, r: 700 }], amount: 4200, status: "verifying", payRef: "UPI 4471 2203 9981", payClaimedAt: Date.now() - 5 * 3600e3 },
    { id: "INV-3", pid: "P1003", month: D.slice(0, 7), date: addDays(D, -9), due: addDays(D, 1), items: [{ d: "Elder Care", q: 10, r: 900 }], amount: 9000, status: "paid", paidOn: addDays(D, -2) },
  ],
  alerts: [
    { id: "A1", kind: "evv", level: "red", text: "Check-in 240 m from Mohammed Ismail's home — outside the 75 m geofence", pid: "P1004", sid: "S104", vid: "V9", ts: Date.now() - 22 * 3600e3, done: false },
    { id: "A2", kind: "request", level: "blue", text: "New visit request — Gowri Shankar · Nursing Care", pid: "P1005", ts: Date.now() - 40 * 60e3, done: false },
    { id: "A3", kind: "payment", level: "green", text: "Payment reported — Rajendran K: ₹4,200 · Ref UPI 4471 2203 9981", pid: "P1002", ts: Date.now() - 5 * 3600e3, done: false },
    { id: "A4", kind: "vitals", level: "amber", text: "High blood sugar recorded for Lakshmi Narayanan — 212 mg/dL", pid: "P1001", ts: Date.now() - 26 * 3600e3, done: false },
  ],
  messages: [
    { id: "M1", thread: "S102", from: "S102", text: "Leaving Five Roads now, traffic is light.", ts: Date.now() - 6 * 60e3 },
    { id: "M2", thread: "S102", from: "office", text: "Thanks Arun. Mr. Rajendran's daughter will be home.", ts: Date.now() - 5 * 60e3 },
    { id: "M3", thread: "P1002", from: "office", text: "Your physiotherapist Arun is on the way.", ts: Date.now() - 6 * 60e3 },
  ],
  notifications: [{ id: "N1", pid: "P1002", text: "Arun Kumar is on the way for your Physiotherapy visit.", ts: Date.now() - 6 * 60e3, read: false }],
  vitals: [vit("P1001", -6, 138, 86, 78, 97, 168, 98.4), vit("P1001", -4, 142, 88, 80, 96, 181, 98.6), vit("P1001", -2, 135, 84, 76, 97, 212, 98.2), vit("P1001", 0, 130, 82, 74, 98, 142, 98.1), vit("P1002", -2, 128, 80, 72, 98, null, 98.3)],
  staff_locations: locs,
  shifts: staff.map((s) => ({ id: s.id, day: D, on: true, start: Date.now() - 3 * 3600e3, km: 0 })),
  timesheets: staff.map((s) => ({ id: s.id, [D]: { mins: 180, km: 9.4 } })),
  docs: [], leave: [],
  location_trail: trail,
};

export function createDemoBackend() {
  const ROLE_KEY = "careva-demo-role";
  let listeners = [];
  const store = JSON.parse(JSON.stringify(data));
  const fire = (t, type, row) => listeners.forEach((f) => f(t, type, row, row));
  window.__careva_fire = fire; // tests: simulate incoming realtime events
  let step = 0;
  setInterval(() => {
    const v = store.visits.find((x) => x.id === "V2");
    if (!v || v.status !== "enroute") return;
    step = Math.min(step + 1, ROUTE.length - 1);
    const [lat, lng] = ROUTE[step];
    const loc = { id: "S102", lat, lng, acc: 6, on: true, ts: Date.now() };
    store.staff_locations = store.staff_locations.map((l) => (l.id === "S102" ? loc : l));
    fire("staff_locations", "UPDATE", { id: "S102", doc: loc });
    fire("location_trail", "INSERT", { id: Date.now(), staff_id: "S102", lat, lng, acc: 6, recorded_at: new Date().toISOString() });
    if (step === ROUTE.length - 1) step = 0;
  }, 2500);
  const role = () => { try { return sessionStorage.getItem(ROLE_KEY); } catch { return null; } };
  return {
    demo: true,
    async session() { return role() ? { demo: true } : null; },
    async signIn(kind) { try { sessionStorage.setItem(ROLE_KEY, kind); } catch {} },
    async signOut() { try { sessionStorage.removeItem(ROLE_KEY); } catch {} },
    async profile() {
      const r = role();
      if (r === "staff") return { id: "demo-s", role: "staff", staff_id: "S101", name: "Priya Raman" };
      if (r === "patient") return { id: "demo-p", role: "patient", patient_id: "P1002", name: "Rajendran K" };
      if (r === "office") return { id: "demo-o", role: "admin", name: "Office Admin" };
      return null;
    },
    async load(t, profile) {
      const all = store[t] || [];
      if (profile.role === "staff") {
        const mine = new Set(store.visits.filter((v) => v.sid === profile.staff_id).map((v) => v.pid));
        if (t === "visits") return all.filter((v) => v.sid === profile.staff_id);
        if (t === "patients" || t === "vitals") return all.filter((r) => mine.has(t === "patients" ? r.id : r.pid));
        if (["staff", "staff_locations", "shifts", "timesheets"].includes(t)) return all.filter((r) => r.id === profile.staff_id);
        if (t === "messages") return all.filter((m) => m.thread === profile.staff_id || m.thread === "all-staff");
        if (["requests", "invoices", "alerts", "notifications", "location_trail"].includes(t)) return [];
      }
      if (profile.role === "patient") {
        const pid = profile.patient_id;
        const vs = store.visits.filter((v) => v.pid === pid);
        if (t === "visits") return vs;
        if (t === "patients") return all.filter((r) => r.id === pid);
        if (t === "staff") return all.filter((s) => vs.some((v) => v.sid === s.id));
        if (t === "staff_locations") return all.filter((l) => vs.some((v) => v.sid === l.id && v.date === D && ["enroute", "inprogress"].includes(v.status)));
        if (["vitals", "invoices", "requests", "notifications", "docs"].includes(t)) return all.filter((r) => r.pid === pid);
        if (t === "messages") return all.filter((m) => m.thread === pid);
        if (["alerts", "shifts", "timesheets", "location_trail", "leave"].includes(t)) return [];
      }
      return all;
    },
    async put(t, id, doc) {
      const list = store[t] || (store[t] = []);
      const i = list.findIndex((r) => r.id === id);
      if (i < 0) list.push(doc); else list[i] = doc;
      setTimeout(() => fire(t, i < 0 ? "INSERT" : "UPDATE", { id, doc }), 50);
    },
    async trail(sid, p) { fire("location_trail", "INSERT", { id: Date.now(), staff_id: sid, ...p, recorded_at: new Date().toISOString() }); },
    async signedUrl() { return null; },
    subscribe(f) { listeners.push(f); return () => { listeners = listeners.filter((x) => x !== f); }; },
  };
}
