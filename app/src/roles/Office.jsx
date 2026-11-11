import LOGO from "../assets/logo.webp";
import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Map as MapIcon, CalendarDays, Users, Inbox, Stethoscope, Receipt, Bell, MessageSquare, Settings as Cog,
  LogOut, Plus, KeyRound, Grid2x2, ChevronLeft, ChevronRight, Home, UserPlus, Share2, Trash2, Navigation, Phone, CheckCircle2, AlertTriangle, Clock, IndianRupee, Activity, MapPin, Search, ShieldCheck, Route,
} from "lucide-react";
import { useStore, put, patch, signOut, settings as getSettings, byId, adminCall } from "../lib/store";
import { SERVICES, TASKS, STATUS } from "../lib/config";
import { distM, fmtDist, gmapsAt } from "../lib/geo";
import { uid, today, fmtDate, fmtTime, ago, rupee, byStart, addDays } from "../lib/util";
import GMap from "../components/GMap";
import { SOSOverlay, ApkButton } from "../components/alerts";
import { Card, Badge, StatusBadge, ServiceTag, Avatar, Btn, Stat, Empty, Field, Sheet, Tabs, Spark, toast, useAction, usePhone } from "../components/ui";

const LIVE_MS = 10 * 60e3;
const NAV = [
  ["dash", "Dashboard", LayoutDashboard], ["map", "Live map", MapIcon], ["visits", "Schedule", CalendarDays],
  ["patients", "Patients", Users], ["requests", "Requests", Inbox], ["staff", "Care staff", Stethoscope],
  ["billing", "Billing", Receipt], ["alerts", "Alerts", Bell], ["messages", "Messages", MessageSquare], ["settings", "Settings", Cog],
];

const TABS = [["dash", "Home", Home], ["visits", "Schedule", CalendarDays], ["patients", "Patients", Users], ["messages", "Messages", MessageSquare], ["more", "More", Grid2x2]];

export default function Office() {
  const s = useStore();
  const [page, setPage] = useState("dash");
  const [visitForm, setVisitForm] = useState(null);
  const [visitId, setVisitId] = useState(null);
  const [patientId, setPatientId] = useState(null);
  const [staffId, setStaffId] = useState(null);
  const [thread, setThread] = useState(null);
  const [more, setMore] = useState(false);
  const phone = usePhone();
  const goPage = (k) => { setPage(k); setMore(false); window.scrollTo(0, 0); };
  // tapping a notification / banner opens the right place
  useEffect(() => {
    const f = (e) => { const g = e.detail || ""; if (g.startsWith("messages:")) { setThread(g.slice(9)); setPage("messages"); } else if (g === "alerts") setPage("alerts"); else if (g === "requests") setPage("requests"); };
    window.addEventListener("careva:go", f); return () => window.removeEventListener("careva:go", f);
  }, []);
  const T = s.t;
  const openAlerts = (T.alerts || []).filter((a) => !a.done).length;
  const pending = (T.requests || []).filter((r) => r.status === "pending").length;
  const ctx = { T, cfg: getSettings(s), isAdmin: s.profile.role === "admin", phone, setPage: goPage, thread, setThread, newVisit: (v) => setVisitForm(v || {}), openVisit: setVisitId, openPatient: setPatientId, openStaff: setStaffId };
  const counts = { alerts: openAlerts, requests: pending };
  const Page = { dash: Dashboard, map: LiveMap, visits: Schedule, patients: Patients, requests: Requests, staff: StaffPage, billing: Billing, alerts: Alerts, messages: Messages, settings: SettingsPage }[page];

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><span className="logo-plate"><img src={LOGO} alt="Careva+" /></span></div>
        <nav aria-label="Office">
          {NAV.map(([k, l, I]) => (
            <button key={k} className={page === k ? "on" : ""} onClick={() => setPage(k)}><I size={18} />{l}{counts[k] ? <span className="count">{counts[k]}</span> : null}</button>
          ))}
        </nav>
        <div className="me"><Avatar name={s.profile.name || "Office"} color="#2B6DE8" size={32} /><div><div style={{ fontWeight: 600 }}>{s.profile.name || "Office"}</div><small className="muted" style={{ textTransform: "capitalize" }}>{s.profile.role}</small></div><button onClick={signOut} aria-label="Sign out"><LogOut size={18} /></button></div>
      </aside>
      <div style={{ minWidth: 0 }}>
        <main className="main"><Page {...ctx} /></main>
      </div>
      {/* phone: floating bottom tab bar + "More" sheet */}
      <nav className="tabbar mtab" aria-label="Office"><div>
        {TABS.map(([k, l, I]) => {
          const on = k === "more" ? more || !TABS.some(([x]) => x === page) : page === k && !more;
          const n = k === "more" ? (counts.alerts || 0) + (counts.requests || 0) : k === "messages" ? 0 : counts[k];
          return <button key={k} className={on ? "on" : ""} aria-current={on ? "page" : undefined} onClick={() => (k === "more" ? setMore(true) : goPage(k))}><I size={22} />{l}{n ? <i className="dotc num-badge">{n}</i> : null}</button>;
        })}
      </div></nav>
      {more && <Sheet open title="More" onClose={() => setMore(false)}>
        <div className="more-grid">{NAV.filter(([k]) => !TABS.some(([x]) => x === k)).map(([k, l, I]) => (
          <button key={k} className={`more-tile ${page === k ? "on" : ""}`} onClick={() => goPage(k)}><span className="more-i"><I size={22} /></span>{l}{counts[k] ? <span className="count">{counts[k]}</span> : null}</button>))}</div>
        <div className="li" style={{ marginTop: 4 }}><Avatar name={s.profile.name || "Office"} color="#5856D6" size={36} /><div className="grow"><div className="t">{s.profile.name || "Office"}</div><div className="s" style={{ textTransform: "capitalize" }}>{s.profile.role}</div></div><Btn kind="danger" icon={LogOut} onClick={signOut}>Sign out</Btn></div>
      </Sheet>}
      {visitForm && <VisitForm init={visitForm} ctx={ctx} onClose={() => setVisitForm(null)} />}
      {visitId && <VisitSheet id={visitId} ctx={ctx} onClose={() => setVisitId(null)} />}
      {patientId && <PatientSheet id={patientId} ctx={ctx} onClose={() => setPatientId(null)} />}
      {staffId && <StaffSheet id={staffId} ctx={ctx} onClose={() => setStaffId(null)} />}
      <SOSOverlay />
    </div>
  );
}

/* ----------------------------- shared bits ----------------------------- */
const officePos = (cfg) => (cfg.company?.officeLat ? { lat: cfg.company.officeLat, lng: cfg.company.officeLng } : null);
const isLive = (l) => l && l.on && Date.now() - l.ts < LIVE_MS;
function liveMarkers(T, cfg, { patientsToday = true, onlyStaff } = {}) {
  const m = [];
  const o = officePos(cfg);
  if (o) m.push({ id: "office", kind: "office", ...o, title: "Careva+ office", sub: cfg.company?.city });
  const d = today();
  const todays = (T.visits || []).filter((v) => v.date === d && v.status !== "cancelled");
  if (patientsToday) todays.forEach((v) => {
    const p = byId(T.patients, v.pid); if (!p?.lat) return;
    m.push({ id: "p" + p.id, kind: "patient", lat: p.lat, lng: p.lng, color: SERVICES[v.service]?.color, title: p.name, sub: `${fmtTime(v.start)} · ${SERVICES[v.service]?.label} · ${STATUS[v.status]?.label}` });
  });
  (T.staff_locations || []).forEach((l) => {
    if (onlyStaff && l.id !== onlyStaff) return;
    const st = byId(T.staff, l.id); if (!st || l.lat == null) return;
    const v = todays.find((x) => x.sid === st.id && ["enroute", "inprogress"].includes(x.status));
    m.push({ id: "s" + st.id, kind: "staff", lat: l.lat, lng: l.lng, color: st.color, label: initialsOf(st.name), stale: !isLive(l), title: st.name, sub: `${v ? STATUS[v.status].label + " · " + (byId(T.patients, v.pid)?.name || "") : "Available"} · ${ago(l.ts)}` });
  });
  return m;
}
const initialsOf = (n = "") => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
function trails(T, only) {
  const g = {};
  (T.location_trail || []).forEach((r) => { if (only && r.staff_id !== only) return; if (new Date(r.recorded_at).toDateString() !== new Date().toDateString()) return; (g[r.staff_id] ||= []).push({ lat: r.lat, lng: r.lng }); });
  return Object.entries(g).map(([sid, pts]) => ({ pts, color: byId(T.staff, sid)?.color || "#0B2F5E" }));
}
const Legend = () => (
  <div className="map-legend">
    <span><i style={{ background: "#0B2F5E" }} />Office</span><span><i style={{ background: "#2B6DE8" }} />Staff (live)</span>
    <span><i style={{ background: "#9AA4B2" }} />Staff (no signal 10+ min)</span><span><i style={{ background: "#3FA34D", borderRadius: 2 }} />Patient home</span><span>– – Today's travel</span>
  </div>
);
function EvvBadge({ v }) {
  if (!v.evv) return <span className="muted">—</span>;
  const t = v.evv.status === "verified" ? "green" : v.evv.status === "flagged" ? "red" : "amber";
  return <Badge tone={t}>{v.evv.status === "verified" ? "GPS verified" : v.evv.status === "flagged" ? "Outside geofence" : "Checked in"}</Badge>;
}

/* ------------------------------ Dashboard ------------------------------ */
function Dashboard(c) {
  const { T, cfg } = c;
  const d = today();
  const todays = (T.visits || []).filter((v) => v.date === d && v.status !== "cancelled").sort(byStart);
  const done = todays.filter((v) => v.status === "completed").length;
  const moving = todays.filter((v) => ["enroute", "inprogress"].includes(v.status)).length;
  const live = (T.staff_locations || []).filter(isLive).length;
  const due = (T.invoices || []).filter((i) => i.status !== "paid").reduce((a, i) => a + (+i.amount || 0), 0);
  const alerts = (T.alerts || []).filter((a) => !a.done).sort((a, b) => b.ts - a.ts);
  const reqs = (T.requests || []).filter((r) => r.status === "pending");
  const hour = new Date().getHours();
  return (
    <>
      <div className="page-h">
        <div><h1>Good {hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}</h1><p>{fmtDate(d, { weekday: "long", day: "numeric", month: "long" })} · {cfg.company?.name || "Careva Plus"}</p></div>
        <div className="row"><ApkButton compact /><Btn icon={Plus} onClick={() => c.newVisit()}>New visit</Btn></div>
      </div>
      <div className="stats">
        <Stat icon={CalendarDays} label="Visits today" value={todays.length} sub={`${done} completed`} tone="blue" />
        <Stat icon={Activity} label="On the way / in visit" value={moving} sub="right now" tone="amber" />
        <Stat icon={Navigation} label="Staff sharing location" value={`${live}/${(T.staff || []).filter((s) => s.active !== false).length}`} sub="updated in last 10 min" tone="green" />
        <Stat icon={AlertTriangle} label="Open alerts" value={alerts.length} sub={`${reqs.length} visit requests`} tone={alerts.some((a) => a.level === "red") ? "red" : undefined} />
        <Stat icon={IndianRupee} label="Outstanding" value={rupee(due)} sub="unpaid & verifying" />
      </div>
      <div className="cols">
        <Card title="Live operations" action={<button className="link" onClick={() => c.setPage("map")}>Full map →</button>}>
          <GMap markers={liveMarkers(T, cfg)} paths={trails(T)} height={420} />
          <Legend />
        </Card>
        <div className="stack">
          <Card title="Needs attention" action={<button className="link" onClick={() => c.setPage("alerts")}>All alerts</button>}>
            {alerts.length ? <div className="list">{alerts.slice(0, 5).map((a) => <AlertRow key={a.id} a={a} c={c} />)}</div> : <Empty icon={CheckCircle2} title="All clear">No open alerts.</Empty>}
          </Card>
          <Card title="Visit requests" action={<button className="link" onClick={() => c.setPage("requests")}>Review</button>}>
            {reqs.length ? <div className="list">{reqs.slice(0, 4).map((r) => (
              <div className="li" key={r.id}><div className="grow"><div className="t">{byId(T.patients, r.pid)?.name || r.name || "New enquiry"}</div><div className="s">{SERVICES[r.service]?.label} · {fmtDate(r.date)} {fmtTime(r.slot)}</div></div><Btn kind="ghost" onClick={() => c.setPage("requests")}>Review</Btn></div>
            ))}</div> : <Empty title="No pending requests" />}
          </Card>
        </div>
      </div>
      <Card title="Today's schedule" action={<span className="muted">{todays.length} visits</span>}>
        {todays.length ? <VisitTable visits={todays} c={c} /> : <Empty icon={CalendarDays} title="No visits today"><button className="link" onClick={() => c.newVisit()}>Schedule one</button></Empty>}
      </Card>
    </>
  );
}

function AlertRow({ a, c }) {
  const [busy, run] = useAction();
  const tone = { red: "red", amber: "amber", green: "green", blue: "blue" }[a.level] || "grey";
  return (
    <div className="li">
      <span className={`badge t-${tone}`} style={{ padding: 6 }}><AlertTriangle size={14} /></span>
      <div className="grow"><div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.text}</div><div className="s">{ago(a.ts)}{a.vid ? <> · <button className="link" onClick={() => c.openVisit(a.vid)}>Open visit</button></> : null}</div></div>
      {!a.done && <Btn kind="ghost" busy={busy === "d"} onClick={() => run("d", () => patch("alerts", a.id, { done: true }))}>Done</Btn>}
    </div>
  );
}

function VisitTable({ visits, c }) {
  const { T } = c;
  if (c.phone) return (
    <div className="list">{visits.map((v) => { const p = byId(T.patients, v.pid), st = byId(T.staff, v.sid); return (
      <div key={v.id} className="li click vrow" onClick={() => c.openVisit(v.id)}>
        <div className="vtime"><b className="num">{fmtTime(v.start).replace(" ", "\u00a0")}</b><small>{v.date !== today() ? fmtDate(v.date, { day: "numeric", month: "short" }) : `${v.dur || 45} min`}</small></div>
        <span className="vbar" style={{ background: SERVICES[v.service]?.color }} />
        <div className="grow"><div className="t ell">{p?.name || v.pid}</div>
          <div className="s ell">{SERVICES[v.service]?.label} · {st ? st.name.split(" ")[0] : <span style={{ color: "var(--red)" }}>Unassigned</span>}</div></div>
        <div className="vend"><StatusBadge s={v.status} />{v.evv?.status === "flagged" && <Badge tone="red">EVV</Badge>}</div>
        <ChevronRight size={18} className="chev" />
      </div>); })}</div>
  );
  return (
    <div className="tbl-wrap"><table className="tbl">
      <thead><tr><th>Time</th><th>Patient</th><th>Service</th><th>Care staff</th><th>Status</th><th>EVV</th></tr></thead>
      <tbody>{visits.map((v) => { const p = byId(T.patients, v.pid), st = byId(T.staff, v.sid); return (
        <tr key={v.id} className="click" onClick={() => c.openVisit(v.id)}>
          <td className="num" style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{fmtTime(v.start)}<div className="muted" style={{ fontWeight: 500, fontSize: 12 }}>{v.date !== today() ? fmtDate(v.date) : `${v.dur || 45} min`}</div></td>
          <td><b>{p?.name || v.pid}</b><div className="muted" style={{ fontSize: 12 }}>{p?.area || p?.addr?.split(",").slice(-2, -1)[0]}</div></td>
          <td><ServiceTag s={v.service} /></td>
          <td>{st ? <span className="row"><Avatar name={st.name} color={st.color} size={26} />{st.name}</span> : <Badge tone="red">Unassigned</Badge>}</td>
          <td><StatusBadge s={v.status} /></td><td><EvvBadge v={v} /></td>
        </tr>); })}</tbody>
    </table></div>
  );
}

/* ------------------------------ Live map ------------------------------ */
function LiveMap({ T, cfg, openStaff }) {
  const [focus, setFocus] = useState(null);
  const [showTrails, setShowTrails] = useState(true);
  const staff = (T.staff || []).filter((s) => s.active !== false);
  return (
    <>
      <div className="page-h"><div><h1>Live map</h1><p>Care staff positions update in real time while they are on shift.</p></div>
        <div className="row"><Tabs tabs={[["all", "Everyone"], ...staff.map((s) => [s.id, s.name.split(" ")[0]])]} value={focus || "all"} onChange={(v) => setFocus(v === "all" ? null : v)} />
          <label className="row" style={{ fontWeight: 600, fontSize: 13 }}><input type="checkbox" style={{ width: 18 }} checked={showTrails} onChange={(e) => setShowTrails(e.target.checked)} />Travel trails</label></div>
      </div>
      <div className="cols">
        <div><GMap key={focus || "all"} markers={liveMarkers(T, cfg, { onlyStaff: focus })} paths={showTrails ? trails(T, focus) : []} height={620} className="tall" /><Legend /></div>
        <Card title="Care staff">
          <div className="list">{staff.map((st) => { const l = byId(T.staff_locations, st.id); const v = (T.visits || []).find((x) => x.sid === st.id && x.date === today() && ["enroute", "inprogress"].includes(x.status)); const p = v && byId(T.patients, v.pid); return (
            <div key={st.id} className="li click" onClick={() => openStaff(st.id)}>
              <Avatar name={st.name} color={isLive(l) ? st.color : "#9AA4B2"} />
              <div className="grow"><div className="t">{st.name}</div><div className="s">{v ? `${STATUS[v.status].label} → ${p?.name}` : "Available"} · {l ? ago(l.ts) : "no location yet"}</div>
                {v?.status === "enroute" && l && p?.lat && <div className="s" style={{ color: "var(--tint)", fontWeight: 600 }}>{fmtDist(distM(l, p))} away</div>}</div>
              {isLive(l) ? <Badge tone="green" dot>Live</Badge> : <Badge>Offline</Badge>}
            </div>); })}</div>
        </Card>
      </div>
    </>
  );
}

/* ------------------------------ Schedule ------------------------------ */
function Schedule(c) {
  const { T } = c;
  const [day, setDay] = useState(today());
  const [q, setQ] = useState("");
  const list = (T.visits || []).filter((v) => v.date === day).filter((v) => !q || (byId(T.patients, v.pid)?.name || "").toLowerCase().includes(q.toLowerCase()) || (byId(T.staff, v.sid)?.name || "").toLowerCase().includes(q.toLowerCase())).sort(byStart);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 1));
  return (
    <>
      <div className="page-h"><div><h1>Schedule</h1><p>{list.length} visits on {fmtDate(day, { weekday: "long", day: "numeric", month: "long" })}</p></div><Btn icon={Plus} onClick={() => c.newVisit({ date: day })}>New visit</Btn></div>
      <div className="row wrap">
        <div className="chips scroll">{days.map((d) => <button key={d} className={`chip ${d === day ? "on" : ""}`} onClick={() => setDay(d)}>{d === today() ? "Today" : fmtDate(d)}</button>)}</div>
        <input type="date" value={day} onChange={(e) => setDay(e.target.value)} style={{ width: "auto" }} aria-label="Pick a date" />
        <div className="row grow" style={{ minWidth: 220 }}><Search size={16} className="muted" /><input placeholder="Search patient or staff" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <Card pad={false}><div className="card-b">{list.length ? <VisitTable visits={list} c={c} /> : <Empty icon={CalendarDays} title="Nothing scheduled">Use “New visit” to book care for this day.</Empty>}</div></Card>
    </>
  );
}

function VisitForm({ init, ctx, onClose }) {
  const { T, cfg } = ctx;
  const [f, setF] = useState({ pid: init.pid || "", sid: init.sid || "", date: init.date || today(), start: init.start || "09:00", dur: init.dur || 45, service: init.service || "nursing", notes: init.notes || "" });
  const [busy, run] = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const p = byId(T.patients, f.pid);
  const staffOpts = (T.staff || []).filter((s) => s.active !== false).map((s) => {
    const l = byId(T.staff_locations, s.id);
    const clash = (T.visits || []).some((v) => v.id !== init.id && v.sid === s.id && v.date === f.date && v.status !== "cancelled" && Math.abs(toMin(v.start) - toMin(f.start)) < (+v.dur || 45));
    return { s, skill: (s.skills || []).includes(f.service), dist: p?.lat && l ? distM(l, p) : null, clash };
  }).sort((a, b) => (b.skill - a.skill) || (a.clash - b.clash) || ((a.dist ?? 9e9) - (b.dist ?? 9e9)));
  const save = () => run("s", async () => {
    if (!f.pid) throw new Error("Choose a patient.");
    const v = init.id ? { ...byId(T.visits, init.id), ...f, dur: +f.dur } : { id: uid("V"), ...f, dur: +f.dur, status: "scheduled", tasks: (TASKS[f.service] || []).map((t) => ({ t, done: false })) };
    await put("visits", v);
    if (!init.id) await put("notifications", { id: uid("N"), pid: f.pid, text: `${SERVICES[f.service].label} visit booked for ${fmtDate(f.date)} at ${fmtTime(f.start)}${f.sid ? ` with ${byId(T.staff, f.sid)?.name}` : ""}.`, ts: Date.now(), read: false });
    init.onSaved?.(v); onClose();
  }, init.id ? "Visit updated" : "Visit scheduled");
  return (
    <Sheet open title={init.id ? "Edit visit" : "Schedule a visit"} onClose={onClose}>
      <Field label="Patient"><select value={f.pid} onChange={set("pid")}><option value="">Choose patient…</option>{(T.patients || []).filter((x) => x.status !== "discharged").map((x) => <option key={x.id} value={x.id}>{x.name} · {x.area || x.id}</option>)}</select></Field>
      <Field label="Service"><div className="chips">{Object.entries(SERVICES).map(([k, s]) => <button type="button" key={k} className={`chip ${f.service === k ? "on" : ""}`} onClick={() => setF({ ...f, service: k })}>{s.label}</button>)}</div></Field>
      <div className="grid3"><Field label="Date"><input type="date" value={f.date} onChange={set("date")} /></Field><Field label="Start"><input type="time" value={f.start} onChange={set("start")} /></Field><Field label="Minutes"><input type="number" min="15" step="5" value={f.dur} onChange={set("dur")} /></Field></div>
      <Field label="Care staff" hint="Sorted by skill match, free time and distance from the patient's home.">
        <div className="list" style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "0 10px", maxHeight: 260, overflowY: "auto" }}>
          {staffOpts.map(({ s, skill, dist, clash }) => (
            <label key={s.id} className="li" style={{ cursor: "pointer" }}>
              <input type="radio" name="sid" style={{ width: 18 }} checked={f.sid === s.id} onChange={() => setF({ ...f, sid: s.id })} />
              <Avatar name={s.name} color={s.color} size={30} />
              <div className="grow"><div className="t">{s.name}</div><div className="s">{s.role}{dist != null ? ` · ${fmtDist(dist)} from home` : ""}</div></div>
              {clash ? <Badge tone="red">Busy then</Badge> : skill ? <Badge tone="green">Skilled</Badge> : <Badge>Other skill</Badge>}
            </label>))}
        </div>
      </Field>
      {p && <div className="muted" style={{ fontSize: 13 }}><MapPin size={13} /> {p.addr}</div>}
      <Btn className="btn b-primary block" busy={busy === "s"} onClick={save}>{init.id ? "Save changes" : "Schedule visit"}</Btn>
    </Sheet>
  );
}
const toMin = (t = "0:0") => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

function VisitSheet({ id, ctx, onClose }) {
  const { T, cfg } = ctx;
  const v = byId(T.visits, id);
  const [busy, run] = useAction();
  const [edit, setEdit] = useState(false);
  if (!v) return null;
  const p = byId(T.patients, v.pid), st = byId(T.staff, v.sid), l = byId(T.staff_locations, v.sid);
  const markers = [];
  if (p?.lat) markers.push({ id: "home", kind: "patient", lat: p.lat, lng: p.lng, color: SERVICES[v.service]?.color, title: p.name, sub: p.addr });
  if (v.evv?.inLat) markers.push({ id: "in", kind: "me", lat: v.evv.inLat, lng: v.evv.inLng, color: "#3FA34D", label: "IN", title: `Check-in ${v.evv.inT}`, sub: `${v.evv.inDist} m from home` });
  if (v.evv?.outLat) markers.push({ id: "out", kind: "me", lat: v.evv.outLat, lng: v.evv.outLng, color: "#E5862B", label: "OUT", title: `Check-out ${v.evv.outT}`, sub: `${v.evv.outDist} m from home` });
  if (["enroute", "inprogress"].includes(v.status) && l && st) markers.push({ id: "st", kind: "staff", lat: l.lat, lng: l.lng, color: st.color, label: initialsOf(st.name), title: st.name, sub: ago(l.ts) });
  const done = (v.tasks || []).filter((t) => t.done).length;
  return (
    <Sheet open wide title={`${SERVICES[v.service]?.label} · ${p?.name || ""}`} onClose={onClose}>
      <div className="row wrap"><StatusBadge s={v.status} /><EvvBadge v={v} /><span className="muted">{fmtDate(v.date, { weekday: "long", day: "numeric", month: "long" })} · {fmtTime(v.start)} · {v.dur || 45} min</span></div>
      {markers.length > 0 && <GMap markers={markers} focus={p?.lat ? p : undefined} radius={cfg.geofence || 75} route={v.status === "enroute" && l && p?.lat ? { from: l, to: p } : null} height={280} />}
      <div className="grid2">
        <Card title="Care staff">{st ? <div className="row"><Avatar name={st.name} color={st.color} /><div className="grow"><b>{st.name}</b><div className="muted">{st.role}</div></div><a className="icon-btn" href={`tel:${st.phone}`} aria-label="Call"><Phone size={16} /></a></div> : <Badge tone="red">Unassigned</Badge>}</Card>
        <Card title="EVV — visit verification">{v.evv ? <dl className="kv"><dt>Check-in</dt><dd>{v.evv.inT || "—"} · {v.evv.inDist ?? "—"} m from home</dd><dt>Check-out</dt><dd>{v.evv.outT || "—"}{v.evv.outDist != null ? ` · ${v.evv.outDist} m` : ""}</dd><dt>Geofence</dt><dd>{cfg.geofence || 75} m</dd></dl> : <span className="muted">Not checked in yet.</span>}</Card>
      </div>
      <Card title={`Care tasks · ${done}/${(v.tasks || []).length}`}>{(v.tasks || []).map((t, i) => <div key={i} className={`task ${t.done ? "done" : ""}`} style={{ cursor: "default" }}><CheckCircle2 size={18} color={t.done ? "#3FA34D" : "#C5CDD8"} /><span>{t.t}</span></div>)}</Card>
      {(v.vitals || v.notes || v.sig || v.rating) && <Card title="Visit record">
        <dl className="kv">
          {v.vitals && <><dt>Vitals</dt><dd>{vitalsLine(v.vitals)}</dd></>}
          {v.notes && <><dt>Notes</dt><dd>{v.notes}</dd></>}
          {v.rating && <><dt>Family rating</dt><dd>{"★".repeat(v.rating)}{"☆".repeat(5 - v.rating)} {v.feedback ? `— “${v.feedback}”` : ""}</dd></>}
          {v.sig && <><dt>Signed by</dt><dd><img src={v.sig} alt="Signature" style={{ height: 60, background: "#FBFCFE", border: "1px solid var(--line)", borderRadius: 8 }} />{v.sigBy ? <div className="muted">{v.sigBy}</div> : null}</dd></>}
        </dl>
      </Card>}
      {v.status !== "completed" && v.status !== "cancelled" && <div className="row wrap">
        <Btn kind="ghost" onClick={() => setEdit(true)}>Reassign / reschedule</Btn>
        <Btn kind="danger" busy={busy === "c"} onClick={() => run("c", () => patch("visits", v.id, { status: "cancelled" }), "Visit cancelled")}>Cancel visit</Btn>
        {p?.phone && <a className="btn b-ghost" href={`tel:${p.phone}`}><Phone size={16} />Call patient</a>}
      </div>}
      {edit && <VisitForm init={v} ctx={ctx} onClose={() => setEdit(false)} />}
    </Sheet>
  );
}
export const vitalsLine = (x) => [x.sys && `BP ${x.sys}/${x.dia}`, x.pulse && `Pulse ${x.pulse}`, x.spo2 && `SpO₂ ${x.spo2}%`, x.sugar && `Sugar ${x.sugar}`, x.temp && `Temp ${x.temp}°F`].filter(Boolean).join(" · ") || "—";

/* ------------------------------ Patients ------------------------------ */
function Patients(c) {
  const { T } = c;
  const [q, setQ] = useState(""); const [tab, setTab] = useState("active"); const [add, setAdd] = useState(false);
  const list = (T.patients || []).filter((p) => (tab === "all" || p.status === tab) && (!q || `${p.name} ${p.area} ${p.phone} ${p.id}`.toLowerCase().includes(q.toLowerCase())));
  const next = (pid) => (T.visits || []).filter((v) => v.pid === pid && v.date >= today() && v.status === "scheduled").sort(byStart)[0];
  return (
    <>
      <div className="page-h"><div><h1>Patients</h1><p>{(T.patients || []).filter((p) => p.status === "active").length} active patients</p></div><Btn icon={Plus} onClick={() => setAdd(true)}>Add patient</Btn></div>
      <div className="row wrap"><Tabs tabs={[["active", "Active"], ["discharged", "Discharged"], ["all", "All"]]} value={tab} onChange={setTab} /><div className="row grow" style={{ minWidth: 220 }}><Search size={16} className="muted" /><input placeholder="Search name, area, phone or ID" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
      {c.phone ? <Card>{list.length ? <div className="list">{list.map((p) => { const n = next(p.id); return (
        <div key={p.id} className="li click" onClick={() => c.openPatient(p.id)}>
          <Avatar name={p.name} size={42} color="#12407c" />
          <div className="grow"><div className="t ell">{p.name}</div><div className="s ell">{[p.area, p.age && `${p.age} ${p.g || ""}`, (p.dx || [])[0]].filter(Boolean).join(" · ")}</div>
            <div className="s ell" style={{ fontSize: 13 }}>{n ? `Next: ${fmtDate(n.date, { day: "numeric", month: "short" })} ${fmtTime(n.start)}` : "No visit booked"}{!p.login ? " · no app login" : ""}</div></div>
          <div className="vend"><Badge tone={p.risk === "High" ? "red" : p.risk === "Medium" ? "amber" : "green"}>{p.risk || "—"}</Badge>{!p.lat && <Badge tone="amber">No pin</Badge>}</div>
          <ChevronRight size={18} className="chev" />
        </div>); })}</div> : <Empty icon={Users} title="No patients match" />}</Card> :
      <Card><div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Patient</th><th>Area</th><th>Conditions</th><th>Risk</th><th>Next visit</th><th>Location</th><th>App login</th></tr></thead>
        <tbody>{list.map((p) => { const n = next(p.id); return (
          <tr key={p.id} className="click" onClick={() => c.openPatient(p.id)}>
            <td><div className="row"><Avatar name={p.name} size={32} color="#12407c" /><div><b>{p.name}</b><div className="muted" style={{ fontSize: 12 }}>{p.id} · {p.age || "—"}{p.g ? ` ${p.g}` : ""}</div></div></div></td>
            <td>{p.area || "—"}</td><td style={{ maxWidth: 220 }}>{(p.dx || []).join(", ") || "—"}</td>
            <td><Badge tone={p.risk === "High" ? "red" : p.risk === "Medium" ? "amber" : "green"}>{p.risk || "—"}</Badge></td>
            <td className="num">{n ? `${fmtDate(n.date)} ${fmtTime(n.start)}` : <span className="muted">None</span>}</td>
            <td>{p.lat ? <Badge tone="green"><MapPin size={12} />Pinned</Badge> : <Badge tone="amber">Not pinned</Badge>}</td>
            <td>{p.login ? <Badge tone="green">Active</Badge> : <Badge>None</Badge>}</td>
          </tr>); })}</tbody>
      </table>{!list.length && <Empty icon={Users} title="No patients match" />}</div></Card>}
      {add && <PatientForm ctx={c} onClose={() => setAdd(false)} />}
    </>
  );
}

/** Accepts a Google Maps link, "lat, lng", or a plus-code-free coordinate string. */
export function parseLatLng(s = "") {
  const m = s.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || s.match(/[?&](?:q|query|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || s.match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/);
  return m ? { lat: +m[1], lng: +m[2] } : null;
}

function PatientForm({ ctx, onClose, init }) {
  const { T } = ctx;
  const [f, setF] = useState(init || { name: "", age: "", g: "F", phone: "", addr: "", area: "", dx: "", allergies: "", blood: "", doctor: "", risk: "Low", payer: "Self pay", source: "Office", services: ["nursing"], contact: { name: "", rel: "", phone: "" } });
  const [loc, setLoc] = useState(init?.lat ? `${init.lat}, ${init.lng}` : "");
  const [busy, run] = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const pt = parseLatLng(loc);
  const save = () => run("s", async () => {
    if (!f.name.trim()) throw new Error("Enter the patient's name.");
    const nextId = "P" + (Math.max(1000, ...(T.patients || []).map((p) => +p.id.slice(1) || 0)) + 1);
    const doc = { ...f, id: init?.id || nextId, age: +f.age || null, dx: typeof f.dx === "string" ? f.dx.split(",").map((x) => x.trim()).filter(Boolean) : f.dx, allergies: typeof f.allergies === "string" ? f.allergies.split(",").map((x) => x.trim()).filter(Boolean) : f.allergies, status: init?.status || "active", since: init?.since || today(), ...(pt || {}) };
    await put("patients", doc); onClose();
  }, init ? "Patient updated" : "Patient added");
  return (
    <Sheet open title={init ? "Edit patient" : "Add patient"} onClose={onClose}>
      <div className="grid2"><Field label="Full name"><input value={f.name} onChange={set("name")} /></Field><Field label="Mobile"><input type="tel" value={f.phone} onChange={set("phone")} /></Field></div>
      <div className="grid3"><Field label="Age"><input type="number" value={f.age} onChange={set("age")} /></Field><Field label="Gender"><select value={f.g} onChange={set("g")}><option value="F">Female</option><option value="M">Male</option><option value="O">Other</option></select></Field><Field label="Risk"><select value={f.risk} onChange={set("risk")}><option>Low</option><option>Medium</option><option>High</option></select></Field></div>
      <Field label="Home address"><textarea value={f.addr} onChange={set("addr")} style={{ minHeight: 60 }} /></Field>
      <div className="grid2"><Field label="Area"><input value={f.area} onChange={set("area")} placeholder="e.g. Fairlands" /></Field>
        <Field label="Home location" hint={pt ? `Pinned at ${pt.lat.toFixed(5)}, ${pt.lng.toFixed(5)}` : "Paste a Google Maps link or “lat, lng”."}><input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="https://maps.google.com/…" /></Field></div>
      {pt && <GMap markers={[{ id: "h", kind: "patient", ...pt, color: "#3FA34D", title: f.name || "Home" }]} height={180} />}
      <div className="grid2"><Field label="Conditions (comma separated)"><input value={Array.isArray(f.dx) ? f.dx.join(", ") : f.dx} onChange={set("dx")} /></Field><Field label="Allergies"><input value={Array.isArray(f.allergies) ? f.allergies.join(", ") : f.allergies} onChange={set("allergies")} /></Field></div>
      <div className="grid3"><Field label="Blood group"><input value={f.blood} onChange={set("blood")} /></Field><Field label="Doctor"><input value={f.doctor} onChange={set("doctor")} /></Field><Field label="Payer"><input value={f.payer} onChange={set("payer")} /></Field></div>
      <div className="grid3"><Field label="Emergency contact"><input value={f.contact?.name || ""} onChange={(e) => setF({ ...f, contact: { ...f.contact, name: e.target.value } })} /></Field><Field label="Relation"><input value={f.contact?.rel || ""} onChange={(e) => setF({ ...f, contact: { ...f.contact, rel: e.target.value } })} /></Field><Field label="Their phone"><input type="tel" value={f.contact?.phone || ""} onChange={(e) => setF({ ...f, contact: { ...f.contact, phone: e.target.value } })} /></Field></div>
      <Btn className="btn b-primary block" busy={busy === "s"} onClick={save}>{init ? "Save patient" : "Add patient"}</Btn>
    </Sheet>
  );
}

function PatientSheet({ id, ctx, onClose }) {
  const { T } = ctx;
  const p = byId(T.patients, id);
  const [tab, setTab] = useState("overview"); const [edit, setEdit] = useState(false);
  const [busy, run] = useAction();
  if (!p) return null;
  const vit = (T.vitals || []).filter((x) => x.pid === id).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const vis = (T.visits || []).filter((v) => v.pid === id).sort(byStart).reverse();
  const inv = (T.invoices || []).filter((i) => i.pid === id);
  return (
    <Sheet open wide title={p.name} onClose={onClose}>
      <div className="row wrap"><Badge tone={p.status === "active" ? "green" : "grey"}>{p.status}</Badge><Badge tone={p.risk === "High" ? "red" : p.risk === "Medium" ? "amber" : "green"}>{p.risk} risk</Badge><span className="muted">{p.id} · {p.age} {p.g} · since {fmtDate(p.since)}</span>
        <span className="grow" /><Btn kind="ghost" onClick={() => setEdit(true)}>Edit</Btn><Btn icon={Plus} onClick={() => { onClose(); ctx.newVisit({ pid: id, service: p.services?.[0] }); }}>Book visit</Btn></div>
      <Tabs tabs={[["overview", "Overview"], ["vitals", `Vitals (${vit.length})`], ["visits", `Visits (${vis.length})`], ["bills", `Bills (${inv.length})`]]} value={tab} onChange={setTab} />
      {tab === "overview" && <div className="grid2">
        <Card title="Details"><dl className="kv">
          <dt>Phone</dt><dd><a href={`tel:${p.phone}`}>{p.phone}</a></dd><dt>Address</dt><dd>{p.addr}</dd>
          <dt>Conditions</dt><dd>{(p.dx || []).join(", ") || "—"}</dd><dt>Allergies</dt><dd style={{ color: p.allergies?.length ? "#B42328" : undefined }}>{(p.allergies || []).join(", ") || "None recorded"}</dd>
          <dt>Blood</dt><dd>{p.blood || "—"}</dd><dt>Doctor</dt><dd>{p.doctor || "—"}</dd><dt>Payer</dt><dd>{p.payer || "—"}</dd>
          <dt>Emergency</dt><dd>{p.contact?.name ? <>{p.contact.name} ({p.contact.rel}) · <a href={`tel:${p.contact.phone}`}>{p.contact.phone}</a></> : "—"}</dd>
        </dl></Card>
        <div>{p.lat ? <><GMap markers={[{ id: "h", kind: "patient", lat: p.lat, lng: p.lng, color: "#3FA34D", title: p.name, sub: p.addr }]} height={250} /><a className="link" style={{ display: "inline-block", marginTop: 8 }} href={gmapsAt(p)} target="_blank" rel="noreferrer">Open in Google Maps ↗</a></> : <Empty icon={MapPin} title="Home not pinned"><button className="link" onClick={() => setEdit(true)}>Pin the location</button> so staff get exact directions.</Empty>}
          <div style={{ marginTop: 12 }}><LoginCard kind="patient" rec={p} /></div>
          {p.status === "active" && <div style={{ marginTop: 12 }}><Btn kind="ghost" busy={busy === "d"} onClick={() => run("d", () => patch("patients", id, { status: "discharged" }), "Patient discharged")}>Discharge patient</Btn></div>}</div>
      </div>}
      {tab === "vitals" && <VitalsPanel vit={vit} />}
      {tab === "visits" && (vis.length ? <VisitTable visits={vis} c={{ ...ctx, openVisit: (v) => { onClose(); ctx.openVisit(v); } }} /> : <Empty title="No visits yet" />)}
      {tab === "bills" && <InvoiceTable inv={inv} T={T} />}
      {edit && <PatientForm ctx={ctx} init={p} onClose={() => setEdit(false)} />}
    </Sheet>
  );
}

export function VitalsPanel({ vit }) {
  if (!vit.length) return <Empty icon={Activity} title="No vitals recorded" />;
  const last = vit.at(-1);
  const rows = [["Blood pressure", "sys", "mmHg", (x) => `${x.sys}/${x.dia}`, (x) => x.sys >= 140 || x.dia >= 90], ["Pulse", "pulse", "bpm", (x) => x.pulse, (x) => x.pulse > 100 || x.pulse < 55], ["SpO₂", "spo2", "%", (x) => x.spo2, (x) => x.spo2 < 94], ["Blood sugar", "sugar", "mg/dL", (x) => x.sugar, (x) => x.sugar > 180 || x.sugar < 70], ["Temperature", "temp", "°F", (x) => x.temp, (x) => x.temp >= 100.4]];
  return (
    <div className="stack">
      <div className="stats">{rows.map(([l, k, u, f, bad]) => last[k] != null && last[k] !== "" ? (
        <div className="stat" key={k}><div className="stat-top">{l}</div><b style={{ color: bad(last) ? "#B42328" : undefined }}>{f(last)} <small style={{ fontSize: 13 }}>{u}</small></b><Spark values={vit.map((x) => +x[k] || null)} color={bad(last) ? "#E5484D" : "#2B6DE8"} /></div>) : null)}</div>
      <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Date</th><th>BP</th><th>Pulse</th><th>SpO₂</th><th>Sugar</th><th>Temp</th></tr></thead>
        <tbody>{[...vit].reverse().map((x) => <tr key={x.id}><td className="num">{fmtDate(x.date)} {x.time}</td><td>{x.sys ? `${x.sys}/${x.dia}` : "—"}</td><td>{x.pulse || "—"}</td><td>{x.spo2 || "—"}</td><td>{x.sugar || "—"}</td><td>{x.temp || "—"}</td></tr>)}</tbody></table></div>
    </div>
  );
}

/* ------------------------------ Requests ------------------------------ */
function Requests(c) {
  const { T } = c;
  const [tab, setTab] = useState("pending");
  const [busy, run] = useAction();
  const [newPt, setNewPt] = useState(null);
  const list = (T.requests || []).filter((r) => tab === "all" || r.status === tab).sort((a, b) => (b.created || 0) - (a.created || 0));
  const approve = (r) => c.newVisit({ pid: r.pid, service: r.service, date: r.date, start: r.slot || "09:00", onSaved: (v) => patch("requests", r.id, { status: "approved", sid: v.sid }) });
  return (
    <>
      <div className="page-h"><div><h1>Visit requests</h1><p>From the patient app, the website and phone calls.</p></div></div>
      <Tabs tabs={[["pending", "Pending"], ["approved", "Approved"], ["rejected", "Declined"], ["all", "All"]]} value={tab} onChange={setTab} />
      <Card>{list.length ? <div className="list">{list.map((r) => { const p = byId(T.patients, r.pid); return (
        <div className="li" key={r.id} style={{ alignItems: "flex-start" }}>
          <Avatar name={p?.name || r.name || "?"} color={p ? "#12407c" : "#E5862B"} />
          <div className="grow"><div className="row wrap"><span className="t">{p?.name || r.name || "New enquiry"}</span>{!p && <Badge tone="amber">New patient</Badge>}<ServiceTag s={r.service} /><span className="s">{r.source}</span></div>
            <div className="s">Wants {fmtDate(r.date, { weekday: "long", day: "numeric", month: "short" })} at {fmtTime(r.slot)} · asked {ago(r.created)}</div>
            {r.notes && <div style={{ marginTop: 4, fontSize: 13.5 }}>“{r.notes}”</div>}
            {!p && r.phone && <div className="s"><a href={`tel:${r.phone}`}>{r.phone}</a></div>}</div>
          {r.status === "pending" ? <div className="row">
            {p ? <Btn kind="green" onClick={() => approve(r)}>Approve & schedule</Btn> : <Btn kind="green" onClick={() => setNewPt(r)}>Register patient</Btn>}
            <Btn kind="ghost" busy={busy === r.id} onClick={() => run(r.id, () => patch("requests", r.id, { status: "rejected" }), "Request declined")}>Decline</Btn></div>
            : <Badge tone={r.status === "approved" ? "green" : "grey"}>{r.status === "approved" ? "Approved" : r.status}</Badge>}
        </div>); })}</div> : <Empty icon={Inbox} title="Nothing here">New requests appear instantly.</Empty>}</Card>
      {newPt && <PatientForm ctx={c} init={{ name: newPt.name || "", phone: newPt.phone || "", age: "", g: "F", addr: "", area: "", dx: "", allergies: "", risk: "Low", payer: "Self pay", source: newPt.source, services: [newPt.service], contact: {} }} onClose={() => setNewPt(null)} />}
    </>
  );
}

/* ------------------------------ Staff ------------------------------ */
function StaffPage(c) {
  const { T } = c;
  const d = today();
  const [add, setAdd] = useState(false);
  return (
    <>
      {add && <StaffForm T={T} onClose={() => setAdd(false)} onSaved={(id) => { setAdd(false); c.openStaff(id); }} />}
      <div className="page-h"><div><h1>Care staff</h1><p>Shift status, today's work and live location.</p></div><Btn icon={UserPlus} onClick={() => setAdd(true)}>Add staff</Btn></div>
      <div className="stats" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>{(T.staff || []).map((st) => {
        const l = byId(T.staff_locations, st.id), sh = byId(T.shifts, st.id), ts = byId(T.timesheets, st.id)?.[d];
        const vs = (T.visits || []).filter((v) => v.sid === st.id && v.date === d && v.status !== "cancelled");
        const cur = vs.find((v) => ["enroute", "inprogress"].includes(v.status));
        return (
          <button key={st.id} className="card" style={{ textAlign: "left", cursor: "pointer", padding: 16, display: "grid", gap: 10 }} onClick={() => c.openStaff(st.id)}>
            <div className="row"><Avatar name={st.name} color={st.color} size={42} /><div className="grow"><b>{st.name}</b><div className="muted" style={{ fontSize: 13 }}>{st.id} · {st.role} · {st.exp || 0} yrs{st.active === false ? " · inactive" : ""}</div>{!st.login && <Badge tone="amber">No app login</Badge>}</div>{isLive(l) ? <Badge tone="green" dot>Live</Badge> : sh?.on && sh.day === d ? <Badge tone="amber">On shift</Badge> : <Badge>Off</Badge>}</div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{cur ? <>{STATUS[cur.status].label}: {byId(T.patients, cur.pid)?.name}</> : <span className="muted">{vs.length ? "Between visits" : "No visits today"}</span>}</div>
            <div className="row" style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 600 }}><span>{vs.filter((v) => v.status === "completed").length}/{vs.length} visits</span><span>·</span><span>{ts ? `${Math.round(ts.mins / 60 * 10) / 10} h` : "0 h"} logged</span><span>·</span><span>{l ? ago(l.ts) : "no GPS"}</span></div>
          </button>);
      })}</div>
    </>
  );
}

function StaffSheet({ id, ctx, onClose }) {
  const { T, cfg } = ctx;
  const st = byId(T.staff, id);
  const [edit, setEdit] = useState(false);
  if (!st) return null;
  const vs = (T.visits || []).filter((v) => v.sid === id && v.date === today()).sort(byStart);
  const ts = byId(T.timesheets, id) || {};
  const days = Object.keys(ts).filter((k) => /^\d{4}-/.test(k)).sort().slice(-7);
  return (
    <Sheet open wide title={st.name} onClose={onClose}>
      <div className="row wrap"><Avatar name={st.name} color={st.color} size={44} /><div className="grow"><b>{st.role}</b><div className="muted">{[st.id, st.qual, `${st.exp || 0} yrs`, `joined ${fmtDate(st.joined)}`].filter(Boolean).join(" · ")}</div></div><a className="btn b-ghost" href={`tel:${st.phone}`}><Phone size={16} />{st.phone}</a><Btn kind="ghost" onClick={() => setEdit(true)}>Edit</Btn></div>
      <div className="chips">{(st.skills || []).map((s) => <ServiceTag key={s} s={s} />)}</div>
      <LoginCard kind="staff" rec={st} />
      {edit && <StaffForm T={T} init={st} onClose={() => setEdit(false)} onSaved={() => setEdit(false)} />}
      <GMap markers={liveMarkers(T, cfg, { onlyStaff: id })} paths={trails(T, id)} height={300} />
      <div className="grid2">
        <Card title="Today's visits">{vs.length ? <div className="list">{vs.map((v) => <div key={v.id} className="li click" onClick={() => { onClose(); ctx.openVisit(v.id); }}><b className="num">{fmtTime(v.start)}</b><div className="grow"><div className="t">{byId(T.patients, v.pid)?.name}</div><div className="s">{SERVICES[v.service]?.label}</div></div><StatusBadge s={v.status} /></div>)}</div> : <Empty title="No visits today" />}</Card>
        <Card title="Timesheet (last days)">{days.length ? <div className="list">{days.map((d) => <div key={d} className="li"><span className="grow">{fmtDate(d)}</span><b className="num">{(ts[d].mins / 60).toFixed(1)} h</b><span className="muted num">{(ts[d].km || 0).toFixed?.(1) ?? ts[d].km} km</span></div>)}</div> : <Empty title="No timesheet yet" />}</Card>
      </div>
    </Sheet>
  );
}

const COLORS = ["#2B6DE8", "#8E4EC6", "#3FA34D", "#E5862B", "#0E9AA7", "#E5484D", "#5856D6", "#C2410C"];
function StaffForm({ T, init, onClose, onSaved }) {
  const [f, setF] = useState(init || { name: "", phone: "", role: "Staff Nurse", short: "", qual: "", exp: "", area: "", skills: ["nursing"], color: COLORS[(T.staff || []).length % COLORS.length], active: true });
  const [busy, run] = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (k) => setF({ ...f, skills: (f.skills || []).includes(k) ? f.skills.filter((x) => x !== k) : [...(f.skills || []), k] });
  const save = () => run("s", async () => {
    if (!f.name.trim()) throw new Error("Enter the staff member's name.");
    if (String(f.phone).replace(/\D/g, "").length < 10) throw new Error("Enter a 10-digit mobile number.");
    const id = init?.id || "S" + (Math.max(100, ...(T.staff || []).map((x) => +x.id.slice(1) || 0)) + 1);
    await put("staff", { ...f, id, exp: +f.exp || 0, joined: init?.joined || today(), active: f.active !== false });
    onSaved?.(id);
  }, init ? "Staff updated" : "Staff member added — now create their app login");
  return (
    <Sheet open title={init ? `Edit ${init.name}` : "Add care staff"} onClose={onClose}>
      <div className="grid2"><Field label="Full name"><input id="st-name" value={f.name} onChange={set("name")} /></Field><Field label="Mobile"><input id="st-phone" type="tel" value={f.phone} onChange={set("phone")} /></Field></div>
      <div className="grid3"><Field label="Role"><select value={f.role} onChange={set("role")}>{["Staff Nurse", "Senior Nurse", "Physiotherapist", "Care Assistant", "Doctor", "Lab Technician"].map((r) => <option key={r}>{r}</option>)}</select></Field>
        <Field label="Qualification"><input value={f.qual} onChange={set("qual")} placeholder="e.g. GNM, B.Sc Nursing" /></Field><Field label="Experience (yrs)"><input type="number" min="0" value={f.exp} onChange={set("exp")} /></Field></div>
      <Field label="Area they cover"><input value={f.area} onChange={set("area")} placeholder="e.g. Fairlands, Hasthampatti" /></Field>
      <Field label="Services they can do"><div className="chips">{Object.entries(SERVICES).map(([k, x]) => <button key={k} type="button" className={`chip ${(f.skills || []).includes(k) ? "on" : ""}`} onClick={() => toggle(k)}>{x.label}</button>)}</div></Field>
      <Field label="Map colour"><div className="chips">{COLORS.map((c) => <button key={c} type="button" aria-label={c} className="chip" onClick={() => setF({ ...f, color: c })} style={{ width: 34, height: 34, padding: 0, background: c, boxShadow: f.color === c ? "0 0 0 3px var(--glass-strong), 0 0 0 5px " + c : "none" }} />)}</div></Field>
      {init && <label className="row"><input type="checkbox" checked={f.active !== false} onChange={(e) => setF({ ...f, active: e.target.checked })} />Active (can be assigned visits)</label>}
      <Btn className="btn b-primary block" busy={busy === "s"} onClick={save}>{init ? "Save" : "Add staff member"}</Btn>
    </Sheet>
  );
}

/** Create / reset / remove an app login (via the careva-admin edge function). */
const sixDigits = () => String(Math.floor(100000 + Math.random() * 900000));
function LoginCard({ kind, rec }) {
  const staff = kind === "staff";
  const [secret, setSecret] = useState("");
  const [phone, setPhone] = useState((rec.login?.phone || rec.phone || "").replace(/\D/g, "").slice(-10));
  const [done, setDone] = useState(null);
  const [busy, run] = useAction();
  const create = () => run("c", async () => {
    if (!/^\d{6}$/.test(secret)) throw new Error(`${staff ? "PIN" : "Access code"} must be exactly 6 digits.`);
    if (staff) await adminCall("staff_login", { staff_id: rec.id, pin: secret });
    else { if (phone.length !== 10) throw new Error("Enter the 10-digit mobile number they'll sign in with."); await adminCall("patient_login", { patient_id: rec.id, phone, code: secret }); }
    setDone({ id: staff ? rec.id : phone, secret });
  }, rec.login ? "Login reset" : "Login created");
  const remove = () => run("r", () => adminCall("remove_login", { kind, id: rec.id }), "Login removed — they can no longer sign in");
  const msg = done && `Careva+ app login for ${rec.name}\n${staff ? "Staff ID" : "Mobile number"}: ${done.id}\n${staff ? "PIN" : "Access code"}: ${done.secret}\nOpen the Careva+ app, choose “${staff ? "Care staff" : "Patient & family"}” and sign in.`;
  const waTo = String(staff ? rec.phone : phone).replace(/\D/g, "").slice(-10);
  return (
    <Card title="App login" action={rec.login ? <Badge tone="green">Active</Badge> : <Badge tone="amber">Not set up</Badge>}>
      <div className="stack">
        <p className="muted" style={{ margin: 0, fontSize: 15 }}>{rec.login ? <>Signs in as <b>{staff ? rec.id : rec.login.phone}</b>{rec.login.at ? ` · since ${fmtDate(rec.login.at.slice(0, 10))}` : ""}. Set a new {staff ? "PIN" : "code"} to reset it.</> : `${staff ? "Staff sign in with their Staff ID" : "Patients and family sign in with their mobile number"} and a 6-digit ${staff ? "PIN" : "access code"}.`}</p>
        {!staff && <Field label="Mobile number for sign-in"><input type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} /></Field>}
        <Field label={staff ? "6-digit PIN" : "6-digit access code"}><div className="row"><input id={`secret-${rec.id}`} inputMode="numeric" value={secret} onChange={(e) => setSecret(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" /><Btn kind="ghost" type="button" onClick={() => setSecret(sixDigits())}>Generate</Btn></div></Field>
        <div className="row wrap"><Btn icon={KeyRound} busy={busy === "c"} onClick={create}>{rec.login ? "Reset login" : "Create login"}</Btn>{rec.login && <Btn kind="danger" icon={Trash2} busy={busy === "r"} onClick={remove}>Remove login</Btn>}</div>
        {done && <div className="hero" style={{ gap: 10 }}>
          <b>Send these details to {rec.name.split(" ")[0]}</b>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", font: "inherit", fontSize: 15 }}>{msg}</pre>
          <div className="row wrap">{waTo.length === 10 && <a className="btn b-green" href={`https://wa.me/91${waTo}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer"><Share2 size={16} />Send on WhatsApp</a>}
            <Btn kind="ghost" type="button" onClick={() => navigator.clipboard?.writeText(msg).then(() => toast("Copied"), () => toast("Select the text above to copy it", "err"))}>Copy</Btn></div>
        </div>}
      </div>
    </Card>
  );
}

function OfficeUsers({ isAdmin }) {
  const [users, setUsers] = useState(null);
  const [f, setF] = useState({ name: "", email: "", password: "", role: "coordinator" });
  const [busy, run] = useAction();
  const load = () => adminCall("office_users").then((r) => setUsers(r.users || []), () => setUsers([]));
  useEffect(() => { load(); }, []);
  const add = () => run("a", async () => { await adminCall("office_user", f); setF({ name: "", email: "", password: "", role: "coordinator" }); await load(); }, "Office user added");
  const del = (u) => run(u.id, async () => { await adminCall("remove_office_user", { id: u.id }); await load(); }, "Office user removed");
  return (
    <Card title="Office users">
      {users === null ? <div className="muted">Loading…</div> : <div className="list">{users.map((u) => (
        <div key={u.id} className="li"><Avatar name={u.name || u.email} color="#5856D6" size={32} /><div className="grow"><div className="t">{u.name || u.email}</div><div className="s">{u.email} · <span style={{ textTransform: "capitalize" }}>{u.role}</span></div></div>
          {isAdmin && <Btn kind="ghost" busy={busy === u.id} onClick={() => del(u)} aria-label={`Remove ${u.email}`}><Trash2 size={16} /></Btn>}</div>))}</div>}
      {isAdmin ? <div className="stack" style={{ marginTop: 14 }}>
        <div className="grid2"><Field label="Name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field><Field label="Email"><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field></div>
        <div className="grid2"><Field label="Password (8+ characters)"><input type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          <Field label="Role"><select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="coordinator">Coordinator — schedule & patients</option><option value="supervisor">Supervisor</option><option value="billing">Billing</option><option value="admin">Admin — full access</option></select></Field></div>
        <Btn icon={UserPlus} busy={busy === "a"} onClick={add}>Add office user</Btn>
      </div> : <p className="muted" style={{ fontSize: 15 }}>Only an admin can add office users.</p>}
    </Card>
  );
}

/* ------------------------------ Billing ------------------------------ */
function InvoiceTable({ inv, T, onOpen }) {
  const [busy, run] = useAction();
  const phone = usePhone();
  if (!inv.length) return <Empty icon={Receipt} title="No invoices" />;
  const badge = (i) => i.status === "paid" ? <Badge tone="green">Paid{i.paidOn ? ` ${fmtDate(i.paidOn, { day: "numeric", month: "short" })}` : ""}</Badge> : i.status === "verifying" ? <Badge tone="amber">Verify payment</Badge> : i.due < today() ? <Badge tone="red">Overdue</Badge> : <Badge tone="blue">Due</Badge>;
  if (phone) return (
    <div className="list">{[...inv].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((i) => (
      <div key={i.id} className="li" style={{ alignItems: "flex-start" }}>
        <div className="grow"><div className="t ell">{byId(T.patients, i.pid)?.name || i.pid}</div>
          <div className="s ell">{(i.items || []).map((x) => `${x.d} × ${x.q}`).join(", ")}</div>
          <div className="s" style={{ fontSize: 13 }}>{i.id} · due {fmtDate(i.due, { day: "numeric", month: "short" })}{i.payRef ? ` · Ref ${i.payRef}` : ""}</div>
          {i.status !== "paid" && <div style={{ marginTop: 8 }}><Btn kind={i.status === "verifying" ? "green" : "ghost"} busy={busy === i.id} onClick={() => run(i.id, () => patch("invoices", i.id, { status: "paid", paidOn: today() }), "Marked as paid")}>{i.status === "verifying" ? "Confirm payment" : "Mark paid"}</Btn></div>}</div>
        <div className="vend"><b className="num" style={{ fontSize: 17 }}>{rupee(i.amount)}</b>{badge(i)}</div>
      </div>))}</div>
  );
  return (
    <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Invoice</th><th>Patient</th><th>Items</th><th>Amount</th><th>Due</th><th>Status</th><th /></tr></thead>
      <tbody>{inv.sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((i) => (
        <tr key={i.id}><td className="num"><b>{i.id}</b><div className="muted" style={{ fontSize: 12 }}>{fmtDate(i.date)}</div></td><td>{byId(T.patients, i.pid)?.name || i.pid}</td>
          <td style={{ fontSize: 13 }}>{(i.items || []).map((x) => `${x.d} × ${x.q}`).join(", ")}</td><td className="num"><b>{rupee(i.amount)}</b></td><td className="num">{fmtDate(i.due)}</td>
          <td>{i.status === "paid" ? <Badge tone="green">Paid {i.paidOn ? fmtDate(i.paidOn) : ""}</Badge> : i.status === "verifying" ? <Badge tone="amber">Verify · {i.payRef}</Badge> : i.due < today() ? <Badge tone="red">Overdue</Badge> : <Badge tone="blue">Due</Badge>}</td>
          <td>{i.status !== "paid" && <Btn kind={i.status === "verifying" ? "green" : "ghost"} busy={busy === i.id} onClick={() => run(i.id, () => patch("invoices", i.id, { status: "paid", paidOn: today() }), "Marked as paid")}>{i.status === "verifying" ? "Confirm payment" : "Mark paid"}</Btn>}</td></tr>))}</tbody></table></div>
  );
}
function Billing({ T, cfg, phone }) {
  const month = today().slice(0, 7);
  const [busy, run] = useAction();
  const inv = T.invoices || [];
  const sum = (f) => inv.filter(f).reduce((a, i) => a + (+i.amount || 0), 0);
  const generate = () => run("g", async () => {
    const rates = cfg.rates || {};
    const done = (T.visits || []).filter((v) => v.status === "completed" && v.date.startsWith(month));
    const byP = {};
    done.forEach((v) => { (byP[v.pid] ||= {})[v.service] = ((byP[v.pid] || {})[v.service] || 0) + 1; });
    let n = 0;
    for (const [pid, svc] of Object.entries(byP)) {
      const id = `INV-${month.replace("-", "")}-${pid}`;
      if (inv.some((i) => i.id === id && i.status === "paid")) continue;
      const items = Object.entries(svc).map(([s, q]) => ({ d: SERVICES[s]?.label || s, q, r: rates[s] || 0 }));
      await put("invoices", { id, pid, month, date: today(), due: addDays(today(), 10), items, amount: items.reduce((a, x) => a + x.q * x.r, 0), status: byId(inv, id)?.status === "verifying" ? "verifying" : "due" });
      n++;
    }
    toast(n ? `${n} invoice${n > 1 ? "s" : ""} prepared for ${fmtDate(month + "-01", { month: "long" })}` : "No new completed visits to bill");
  });
  return (
    <>
      <div className="page-h"><div><h1>Billing</h1><p>Invoices are built from completed visits at your service rates. Patients pay by UPI to {cfg.company?.upi || "your UPI ID"}.</p></div><Btn icon={Receipt} busy={busy === "g"} onClick={generate}>{phone ? "Prepare invoices" : "Prepare this month's invoices"}</Btn></div>
      <div className="stats">
        <Stat icon={Receipt} label="Billed this month" value={rupee(sum((i) => i.month === month))} tone="blue" />
        <Stat icon={CheckCircle2} label="Collected" value={rupee(sum((i) => i.status === "paid"))} tone="green" />
        <Stat icon={ShieldCheck} label="Awaiting verification" value={rupee(sum((i) => i.status === "verifying"))} tone="amber" />
        <Stat icon={Clock} label="Outstanding" value={rupee(sum((i) => i.status === "due"))} tone="red" />
      </div>
      <Card title="Invoices"><InvoiceTable inv={[...inv]} T={T} /></Card>
    </>
  );
}

/* ------------------------------ Alerts ------------------------------ */
function Alerts(c) {
  const [tab, setTab] = useState("open");
  const list = (c.T.alerts || []).filter((a) => (tab === "open" ? !a.done : a.done)).sort((a, b) => b.ts - a.ts);
  return (
    <>
      <div className="page-h"><div><h1>Alerts</h1><p>Geofence exceptions, abnormal vitals, payments, requests and staff notes.</p></div></div>
      <Tabs tabs={[["open", "Open"], ["done", "Resolved"]]} value={tab} onChange={setTab} />
      <Card>{list.length ? <div className="list">{list.map((a) => <AlertRow key={a.id} a={a} c={c} />)}</div> : <Empty icon={CheckCircle2} title={tab === "open" ? "All clear" : "Nothing resolved yet"} />}</Card>
    </>
  );
}

/* ------------------------------ Messages ------------------------------ */
function Messages({ T, thread, setThread, phone }) {
  const threads = useMemo(() => {
    const g = {};
    (T.messages || []).forEach((m) => { (g[m.thread] ||= []).push(m); });
    [...(T.staff || []).map((s) => s.id), ...(T.patients || []).filter((p) => p.status === "active").map((p) => p.id)].forEach((id) => (g[id] ||= []));
    return Object.entries(g).map(([id, ms]) => ({ id, ms: ms.sort((a, b) => a.ts - b.ts), last: ms.at(-1)?.ts || 0 })).sort((a, b) => b.last - a.last);
  }, [T.messages, T.staff, T.patients]);
  const sel = thread || (phone ? null : threads[0]?.id); const setSel = setThread;
  const name = (id) => id === "all-staff" ? "All staff" : byId(T.staff, id)?.name || byId(T.patients, id)?.name || id;
  const cur = threads.find((t) => t.id === sel);
  if (phone && cur) return (
    <>
      <button className="back" onClick={() => setSel(null)}><ChevronLeft size={22} />Messages</button>
      <Chat title={name(cur.id)} msgs={cur.ms} me="office" thread={cur.id} />
    </>
  );
  return (
    <>
      <div className="page-h"><div><h1>Messages</h1><p>Chat with care staff and patient families.</p></div></div>
      <div className="cols" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.6fr)" }}>
        <Card title="Conversations"><div className="list">{threads.map((t) => (
          <div key={t.id} className="li click" onClick={() => setSel(t.id)} style={sel === t.id ? { background: "var(--bg)" } : undefined}>
            <Avatar name={name(t.id)} color={t.id.startsWith("S") ? byId(T.staff, t.id)?.color || "#2B6DE8" : "#12407c"} size={34} />
            <div className="grow"><div className="t ell">{name(t.id)}</div><div className="s ell">{t.ms.at(-1)?.text || (t.id.startsWith("S") ? "Care staff" : "Patient")}</div></div>
            {t.last ? <small className="muted">{ago(t.last)}</small> : null}
          </div>))}</div></Card>
        {!phone && (cur ? <Chat title={name(cur.id)} msgs={cur.ms} me="office" thread={cur.id} /> : <Card><Empty icon={MessageSquare} title="Pick a conversation" /></Card>)}
      </div>
    </>
  );
}
export function Chat({ title, msgs, me, thread, extra = {} }) {
  const [text, setText] = useState(""); const [busy, run] = useAction();
  const send = (e) => { e.preventDefault(); if (!text.trim()) return; const t = text.trim(); setText(""); run("s", () => put("messages", { id: uid("M"), thread, from: me, text: t, ts: Date.now(), ...extra })); };
  return (
    <Card title={title}>
      <div className="chat" style={{ maxHeight: 420, overflowY: "auto", padding: "4px 2px" }}>
        {msgs.length ? msgs.map((m) => <div key={m.id} className={`msg ${m.from === me ? "me" : ""}`}>{m.text}<small>{new Date(m.ts).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</small></div>) : <Empty icon={MessageSquare} title="No messages yet">Say hello.</Empty>}
      </div>
      <form className="row" style={{ marginTop: 12 }} onSubmit={send}><input id={`msg-${thread}`} placeholder="Write a message" value={text} onChange={(e) => setText(e.target.value)} /><Btn busy={busy === "s"}>Send</Btn></form>
    </Card>
  );
}

/* ------------------------------ Settings ------------------------------ */
function SettingsPage({ cfg, isAdmin }) {
  const [f, setF] = useState(() => JSON.parse(JSON.stringify(cfg)));
  const [loc, setLoc] = useState(cfg.company?.officeLat ? `${cfg.company.officeLat}, ${cfg.company.officeLng}` : "");
  const [busy, run] = useAction();
  const co = f.company || {};
  const setCo = (k) => (e) => setF({ ...f, company: { ...co, [k]: e.target.value } });
  const pt = parseLatLng(loc);
  const save = () => run("s", () => put("settings", { ...f, id: "main", geofence: +f.geofence || 75, lateMin: +f.lateMin || 15, company: { ...co, ...(pt ? { officeLat: pt.lat, officeLng: pt.lng, officeSet: true } : {}) }, rates: Object.fromEntries(Object.entries(f.rates || {}).map(([k, v]) => [k, +v || 0])) }), "Settings saved");
  return (
    <>
      <div className="page-h"><div><h1>Settings</h1><p>Company details, visit verification and service rates.</p></div><Btn busy={busy === "s"} onClick={save}>Save settings</Btn></div>
      <div className="cols">
        <Card title="Company"><div className="stack">
          <div className="grid2"><Field label="Name"><input value={co.name || ""} onChange={setCo("name")} /></Field><Field label="Phone"><input value={co.phone || ""} onChange={setCo("phone")} /></Field></div>
          <div className="grid2"><Field label="City"><input value={co.city || ""} onChange={setCo("city")} /></Field><Field label="UPI ID for payments"><input value={co.upi || ""} onChange={setCo("upi")} /></Field></div>
          <Field label="Office location" hint="Paste a Google Maps link or “lat, lng”. Staff distances and the map centre use this."><input value={loc} onChange={(e) => setLoc(e.target.value)} /></Field>
          {pt && <GMap markers={[{ id: "o", kind: "office", ...pt, title: co.name }]} height={200} />}
        </div></Card>
        <div className="stack">
          <Card title="Visit verification (EVV)"><div className="stack">
            <Field label="Geofence radius (metres)" hint="Check-in/out farther than this from the patient's home is flagged."><input type="number" value={f.geofence || 75} onChange={(e) => setF({ ...f, geofence: e.target.value })} /></Field>
            <Field label="Late after (minutes)"><input type="number" value={f.lateMin || 15} onChange={(e) => setF({ ...f, lateMin: e.target.value })} /></Field>
            <label className="row" style={{ fontWeight: 600 }}><input type="checkbox" style={{ width: 18 }} checked={!!f.requireSig} onChange={(e) => setF({ ...f, requireSig: e.target.checked })} />Require patient/family signature at check-out</label>
          </div></Card>
          <OfficeUsers isAdmin={isAdmin} />
          <Card title="Service rates (₹ per visit)"><div className="grid2">{Object.entries(SERVICES).map(([k, s]) => <Field key={k} label={s.label}><input type="number" value={f.rates?.[k] ?? ""} onChange={(e) => setF({ ...f, rates: { ...f.rates, [k]: e.target.value } })} /></Field>)}</div></Card>
        </div>
      </div>
    </>
  );
}
