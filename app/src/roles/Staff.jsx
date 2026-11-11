import React, { useEffect, useRef, useState } from "react";
import { Home, CalendarDays, MessageSquare, User, Navigation, Phone, MapPin, LogIn, LogOut, Car, CheckCircle2, AlertTriangle, Clock, ShieldCheck, Signal } from "lucide-react";
import { useStore, put, patch, signOut, settings as getSettings, byId, api, getState } from "../lib/store";
import { SERVICES } from "../lib/config";
import { distM, fmtDist, gmapsDir, getPosition } from "../lib/geo";
import { uid, today, fmtDate, fmtTime, ago, byStart, hm, minsBetween } from "../lib/util";
import GMap from "../components/GMap";
import { SOSButton } from "../components/alerts";
import { Card, Badge, StatusBadge, ServiceTag, Avatar, Btn, Empty, Field, Sheet, SignaturePad, useAction, toast } from "../components/ui";
import { Chat, vitalsLine } from "./Office";

export default function Staff() {
  const s = useStore();
  const sid = s.profile.staff_id;
  const me = byId(s.t.staff, sid) || { name: s.profile.name || "Care staff" };
  const [tab, setTab] = useState("today");
  const [open, setOpen] = useState(null);
  useEffect(() => {
    const f = (e) => { const g = e.detail; if (["chat", "visits", "today", "me"].includes(g)) setTab(g); };
    window.addEventListener("careva:go", f); return () => window.removeEventListener("careva:go", f);
  }, []);
  const shift = byId(s.t.shifts, sid);
  const onShift = !!(shift?.on && shift.day === today());
  const pos = useLiveLocation(sid, onShift);
  const unread = (s.t.messages || []).filter((m) => m.thread === sid && m.from !== sid && m.ts > (+localStorageGet("careva-read-" + sid) || 0)).length;
  const ctx = { s, sid, me, pos, onShift, shift, open: setOpen, cfg: getSettings(s) };
  return (
    <div className="app">
      <SOSButton who={{ id: sid, sid, name: me.name, label: "Care staff", phone: me.phone }} />
      <header className="app-h">
        <div className="row"><div className="grow"><div className="hello">{fmtDate(today(), { weekday: "long", day: "numeric", month: "long" })}</div><h1>Hi, {me.name.split(" ")[0]}</h1></div><Avatar name={me.name} color={me.color || "#2B6DE8"} size={40} /></div>
      </header>
      <div className="app-b">
        {tab === "today" && <Today {...ctx} />}
        {tab === "visits" && <Upcoming {...ctx} />}
        {tab === "chat" && <ChatTab {...ctx} />}
        {tab === "me" && <Me {...ctx} />}
      </div>
      <nav className="tabbar" aria-label="Staff"><div>
        {[["today", "Today", Home], ["visits", "Visits", CalendarDays], ["chat", "Office chat", MessageSquare], ["me", "Me", User]].map(([k, l, I]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}><I size={21} />{l}{k === "chat" && unread > 0 && <i className="dotc" />}</button>))}
      </div></nav>
      {open && <VisitFlow id={open} ctx={ctx} onClose={() => setOpen(null)} />}
    </div>
  );
}
const localStorageGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };

/* Live location while on shift: updates staff_locations (≥15 s or ≥25 m), trail every ≥45 s / 60 m, km travelled. */
function useLiveLocation(sid, on) {
  const [pos, setPos] = useState(null);
  const last = useRef({ loc: null, locAt: 0, trail: null, trailAt: 0 });
  useEffect(() => {
    if (!on || !navigator.geolocation) return;
    let lock = null;
    navigator.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    const id = navigator.geolocation.watchPosition(async (g) => {
      const p = { lat: g.coords.latitude, lng: g.coords.longitude, acc: Math.round(g.coords.accuracy) };
      setPos(p);
      const L = last.current, now = Date.now();
      if (!L.loc || now - L.locAt > 15e3 || distM(L.loc, p) > 25) {
        L.loc = p; L.locAt = now;
        put("staff_locations", { id: sid, ...p, on: true, ts: now }).catch(() => {});
      }
      if (p.acc < 60 && (!L.trail || now - L.trailAt > 45e3 || distM(L.trail, p) > 60)) {
        const step = L.trail ? distM(L.trail, p) : 0;
        L.trail = p; L.trailAt = now;
        api().trail(sid, p).catch(() => {});
        if (step > 30 && step < 5000) { const sh = byId(getState().t.shifts, sid); if (sh) patch("shifts", sid, { km: Math.round(((sh.km || 0) + step / 1000) * 10) / 10 }).catch(() => {}); }
      }
    }, () => {}, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    return () => { navigator.geolocation.clearWatch(id); lock?.release?.(); };
  }, [on, sid]);
  return pos;
}

function ShiftCard({ sid, onShift, shift, pos, s }) {
  const [busy, run] = useAction();
  const toggle = () => run("t", async () => {
    if (!onShift) {
      const p = await getPosition();
      await put("shifts", { id: sid, day: today(), on: true, start: Date.now(), startLat: p.lat, startLng: p.lng, km: 0 });
      await put("staff_locations", { id: sid, ...p, on: true, ts: Date.now() });
      toast("Shift started — the office can now see your location");
    } else {
      const mins = minsBetween(shift.start, Date.now());
      const ts = byId(s.t.timesheets, sid) || { id: sid };
      const d = today(), prev = ts[d] || { mins: 0, km: 0 };
      await put("timesheets", { ...ts, id: sid, [d]: { mins: prev.mins + mins, km: Math.round((prev.km + (shift.km || 0)) * 10) / 10 } });
      await put("shifts", { ...shift, on: false, end: Date.now() });
      const l = byId(s.t.staff_locations, sid); if (l) await put("staff_locations", { ...l, on: false, ts: Date.now() });
      toast(`Shift ended · ${Math.floor(mins / 60)} h ${mins % 60} min logged`);
    }
  });
  return (
    <div className="hero">
      <div className="shift">
        <div className="grow"><b style={{ fontSize: 16 }}>{onShift ? "You're on shift" : "Off shift"}</b>
          <div className="muted" style={{ fontSize: 13 }}>{onShift ? <>Since {new Date(shift.start).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} · {(shift.km || 0).toFixed(1)} km · {pos ? <span style={{ color: "var(--green)", fontWeight: 600 }}><Signal size={12} /> GPS ±{pos.acc} m</span> : "finding GPS…"}</> : "Start your shift to share your location with the office and get directions."}</div></div>
        <button className={`toggle ${onShift ? "on" : ""}`} aria-label={onShift ? "End shift" : "Start shift"} aria-pressed={onShift} disabled={busy === "t"} onClick={toggle} />
      </div>
    </div>
  );
}

function Today(ctx) {
  const { s, sid, pos, onShift, shift } = ctx;
  const vs = (s.t.visits || []).filter((v) => v.sid === sid && v.date === today() && v.status !== "cancelled").sort(byStart);
  const active = vs.find((v) => ["enroute", "inprogress"].includes(v.status)) || vs.find((v) => v.status === "scheduled");
  return (
    <>
      <ShiftCard {...{ sid, onShift, shift, pos, s }} />
      {active ? <NextVisit v={active} ctx={ctx} /> : <div className="hero"><Empty icon={CheckCircle2} title={vs.length ? "All visits done for today" : "No visits today"}>{vs.length ? "Great work. Remember to end your shift." : "The office will add visits here."}</Empty></div>}
      <Card title={`Today · ${vs.filter((v) => v.status === "completed").length}/${vs.length} done`}>
        {vs.length ? <div className="timeline">{vs.map((v) => { const p = byId(s.t.patients, v.pid); return (
          <div className="tl" key={v.id} onClick={() => ctx.open(v.id)} style={{ cursor: "pointer" }}>
            <div className="tm">{fmtTime(v.start)}</div><div className="rail" style={{ "--c": SERVICES[v.service]?.color }}><i /></div>
            <div className="body"><div className="row"><b className="grow">{p?.name || v.pid}</b><StatusBadge s={v.status} /></div><div className="muted" style={{ fontSize: 13 }}>{SERVICES[v.service]?.label} · {p?.area}{pos && p?.lat ? ` · ${fmtDist(distM(pos, p))}` : ""}</div></div>
          </div>); })}</div> : <Empty title="No visits" />}
      </Card>
    </>
  );
}

function NextVisit({ v, ctx }) {
  const { s, sid, pos, onShift, cfg } = ctx;
  const p = byId(s.t.patients, v.pid);
  const [eta, setEta] = useState(null);
  const [busy, run] = useAction();
  const d = pos && p?.lat ? distM(pos, p) : null;
  const startTravel = () => run("go", async () => {
    if (!onShift) throw new Error("Start your shift first so the family can follow your arrival.");
    const here = pos || (await getPosition());
    await patch("visits", v.id, { status: "enroute", enrouteAt: Date.now(), enrouteFrom: { lat: here.lat, lng: here.lng } });
    await put("notifications", { id: uid("N"), pid: v.pid, text: `${ctx.me.name} is on the way for your ${SERVICES[v.service]?.label} visit.`, ts: Date.now(), read: false });
    window.open(gmapsDir(p, here), "_blank");
  }, "Family notified — you're on the way");
  return (
    <div className="hero live">
      <div className="row"><span className="live-dot" style={{ background: v.status === "scheduled" ? "#2B6DE8" : undefined }} /><b className="grow">{v.status === "scheduled" ? `Next · ${fmtTime(v.start)}` : v.status === "enroute" ? "Heading to" : "In visit with"}</b><ServiceTag s={v.service} /></div>
      <div className="row"><Avatar name={p?.name} color="#12407c" size={44} /><div className="grow"><b style={{ fontSize: 17 }}>{p?.name}</b><div className="muted" style={{ fontSize: 13 }}><MapPin size={12} /> {p?.addr}</div></div></div>
      {p?.allergies?.length > 0 && <div className="err" style={{ padding: "6px 10px" }}><AlertTriangle size={14} /> Allergies: {p.allergies.join(", ")}</div>}
      {p?.lat && <GMap markers={[{ id: "h", kind: "patient", lat: p.lat, lng: p.lng, color: SERVICES[v.service]?.color, title: p.name, sub: p.addr }, ...(pos ? [{ id: "me", kind: "me", ...pos, color: ctx.me.color || "#2B6DE8", label: "ME", title: "You" }] : [])]} route={pos && v.status !== "inprogress" ? { from: pos, to: p } : null} onRoute={setEta} focus={p} radius={cfg.geofence || 75} height={220} />}
      {d != null && v.status !== "inprogress" && <div className="row"><div className="eta"><b>{eta?.minutes ?? "—"}</b><span className="muted">min{eta?.approx ? " (approx.)" : ""}</span></div><span className="muted grow">· {fmtDist(eta?.meters ?? d)} by road</span>{d <= (cfg.geofence || 75) && <Badge tone="green">At the door</Badge>}</div>}
      <div className="grid2 keep">
        {p?.lat && <a className="btn b-ghost" href={gmapsDir(p, pos)} target="_blank" rel="noreferrer"><Navigation size={16} />Navigate</a>}
        {p?.phone && <a className="btn b-ghost" href={`tel:${p.phone}`}><Phone size={16} />Call</a>}
      </div>
      {v.status === "scheduled" && <Btn className="btn b-primary block" icon={Car} busy={busy === "go"} onClick={startTravel}>Start travel</Btn>}
      {v.status !== "scheduled" && <Btn className="btn b-green block" icon={v.status === "enroute" ? LogIn : ShieldCheck} onClick={() => ctx.open(v.id)}>{v.status === "enroute" ? "I've arrived — check in" : "Open visit & check out"}</Btn>}
    </div>
  );
}

/* --------------------------- Visit flow --------------------------- */
function VisitFlow({ id, ctx, onClose }) {
  const { s, sid, cfg } = ctx;
  const v = byId(s.t.visits, id);
  const p = v && byId(s.t.patients, v.pid);
  const [busy, run] = useAction();
  const [vit, setVit] = useState(v?.vitals || { sys: "", dia: "", pulse: "", spo2: "", sugar: "", temp: "" });
  const [notes, setNotes] = useState(v?.notes || "");
  const [sig, setSig] = useState(null);
  const [sigBy, setSigBy] = useState("");
  if (!v) return null;
  const g = cfg.geofence || 75;
  const raise = (kind, level, text) => put("alerts", { id: uid("A"), kind, level, text, pid: v.pid, sid, vid: v.id, ts: Date.now(), done: false });

  const checkIn = () => run("in", async () => {
    const here = await getPosition();
    const dist = p?.lat ? Math.round(distM(here, p)) : null;
    const ok = dist == null || dist <= g;
    await patch("visits", v.id, { status: "inprogress", evv: { mode: "gps", inT: hm(), inTs: Date.now(), inLat: here.lat, inLng: here.lng, inAcc: here.acc, inDist: dist, status: ok ? "pending" : "flagged" } });
    if (!ok) await raise("evv", "red", `Check-in ${dist} m from ${p.name}'s home — outside the ${g} m geofence`);
    const late = minsBetween(new Date(`${v.date}T${v.start}`).getTime(), Date.now());
    if (late > (cfg.lateMin || 15)) await raise("late", "amber", `${ctx.me.name} arrived ${late} min late at ${p.name}`);
    toast(ok ? `Checked in · ${dist ?? "?"} m from home` : `Checked in, but ${dist} m from home — the office has been told`, ok ? "ok" : "err");
  });
  const toggleTask = (i) => patch("visits", v.id, { tasks: v.tasks.map((t, j) => (j === i ? { ...t, done: !t.done } : t)) }).catch((e) => toast(e.message, "err"));
  const hasVit = Object.values(vit).some((x) => x !== "" && x != null);
  const checkOut = () => run("out", async () => {
    if (cfg.requireSig && !sig && !v.sig) throw new Error("Ask the patient or family to sign before checking out.");
    const here = await getPosition();
    const dist = p?.lat ? Math.round(distM(here, p)) : null;
    const ok = (dist == null || dist <= g) && v.evv?.status !== "flagged";
    const clean = hasVit ? Object.fromEntries(Object.entries(vit).map(([k, x]) => [k, x === "" ? null : +x])) : null;
    if (clean) {
      await put("vitals", { id: uid("VT"), pid: v.pid, date: today(), time: hm(), ...clean, by: sid });
      const bad = (clean.sys >= 160 || clean.dia >= 100) ? "high blood pressure" : clean.spo2 && clean.spo2 < 92 ? "low oxygen (SpO₂)" : clean.sugar && (clean.sugar > 250 || clean.sugar < 70) ? "abnormal blood sugar" : clean.temp >= 101 ? "fever" : null;
      if (bad) await raise("vitals", "amber", `${bad[0].toUpperCase() + bad.slice(1)} recorded for ${p.name} — ${vitalsLine(clean)}`);
    }
    await patch("visits", v.id, { status: "completed", notes, vitals: clean, ...(sig ? { sig, sigBy } : {}), evv: { ...v.evv, outT: hm(), outTs: Date.now(), outLat: here.lat, outLng: here.lng, outDist: dist, status: ok ? "verified" : "flagged" } });
    if (dist != null && dist > g) await raise("evv", "red", `Check-out ${dist} m from ${p.name}'s home — outside the ${g} m geofence`);
    await put("notifications", { id: uid("N"), pid: v.pid, text: `Your ${SERVICES[v.service]?.label} visit is complete. Tap to rate ${ctx.me.name.split(" ")[0]}.`, ts: Date.now(), read: false });
    toast("Visit completed and verified"); onClose();
  });

  const done = (v.tasks || []).filter((t) => t.done).length;
  return (
    <Sheet open title={p?.name || "Visit"} onClose={onClose}>
      <div className="row wrap"><StatusBadge s={v.status} /><ServiceTag s={v.service} /><span className="muted">{fmtDate(v.date)} · {fmtTime(v.start)} · {v.dur} min</span></div>
      <dl className="kv"><dt>Address</dt><dd>{p?.addr}</dd><dt>Conditions</dt><dd>{(p?.dx || []).join(", ") || "—"}</dd><dt>Allergies</dt><dd style={{ color: p?.allergies?.length ? "#B42328" : undefined }}>{(p?.allergies || []).join(", ") || "None recorded"}</dd><dt>Family</dt><dd>{p?.contact?.name ? <>{p.contact.name} ({p.contact.rel}) · <a href={`tel:${p.contact.phone}`}>{p.contact.phone}</a></> : "—"}</dd></dl>
      {["scheduled", "enroute"].includes(v.status) && <>
        <div className="err" style={{ background: "color-mix(in srgb, var(--tint) 13%, transparent)", color: "var(--tint)" }}><ShieldCheck size={14} /> Check in when you're at the door. Your GPS must be within {g} m of the patient's home.</div>
        <Btn className="btn b-green block" icon={LogIn} busy={busy === "in"} onClick={checkIn}>Check in now</Btn>
      </>}
      {v.status === "inprogress" && <>
        <div className="row muted" style={{ fontSize: 13 }}><Clock size={14} /> Checked in {v.evv?.inT} · {v.evv?.inDist ?? "?"} m from home {v.evv?.status === "flagged" && <Badge tone="red">Outside geofence</Badge>}</div>
        <Card title={`Care tasks · ${done}/${(v.tasks || []).length}`}>{(v.tasks || []).map((t, i) => (
          <label key={i} className={`task ${t.done ? "done" : ""}`}><input type="checkbox" checked={t.done} onChange={() => toggleTask(i)} /><span>{t.t}</span></label>))}</Card>
        <Card title="Vitals">
          <div className="grid3">
            {[["sys", "BP systolic"], ["dia", "BP diastolic"], ["pulse", "Pulse /min"], ["spo2", "SpO₂ %"], ["sugar", "Sugar mg/dL"], ["temp", "Temp °F"]].map(([k, l]) => (
              <Field key={k} label={l}><input id={`vit-${k}`} inputMode="decimal" type="number" step="any" value={vit[k] ?? ""} onChange={(e) => setVit({ ...vit, [k]: e.target.value })} /></Field>))}
          </div>
        </Card>
        <Field label="Visit notes"><textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What you did, how the patient is, anything the office or family should know" /></Field>
        {cfg.requireSig && <Card title="Patient / family signature"><SignaturePad onChange={setSig} /><Field label="Signed by"><input id="sigby" value={sigBy} onChange={(e) => setSigBy(e.target.value)} placeholder="Name and relation" /></Field></Card>}
        <Btn className="btn b-primary block" icon={LogOut} busy={busy === "out"} onClick={checkOut}>Check out & complete visit</Btn>
      </>}
      {v.status === "completed" && <Card title="Completed"><dl className="kv"><dt>In / out</dt><dd>{v.evv?.inT} – {v.evv?.outT}</dd><dt>EVV</dt><dd>{v.evv?.status === "verified" ? <Badge tone="green">GPS verified</Badge> : <Badge tone="red">Flagged</Badge>}</dd>{v.vitals && <><dt>Vitals</dt><dd>{vitalsLine(v.vitals)}</dd></>}{v.notes && <><dt>Notes</dt><dd>{v.notes}</dd></>}</dl></Card>}
    </Sheet>
  );
}

function Upcoming({ s, sid, open }) {
  const vs = (s.t.visits || []).filter((v) => v.sid === sid && v.date > today() && v.status !== "cancelled").sort(byStart);
  const past = (s.t.visits || []).filter((v) => v.sid === sid && v.date < today()).sort(byStart).reverse().slice(0, 10);
  const row = (v) => { const p = byId(s.t.patients, v.pid); return <div key={v.id} className="li click" onClick={() => open(v.id)}><div style={{ width: 64 }}><b className="num">{fmtTime(v.start)}</b><div className="s">{fmtDate(v.date, { day: "numeric", month: "short" })}</div></div><div className="grow"><div className="t">{p?.name}</div><div className="s">{SERVICES[v.service]?.label} · {p?.area}</div></div><StatusBadge s={v.status} /></div>; };
  return (
    <>
      <Card title="Coming up">{vs.length ? <div className="list">{vs.map(row)}</div> : <Empty icon={CalendarDays} title="Nothing scheduled yet" />}</Card>
      <Card title="Recent visits">{past.length ? <div className="list">{past.map(row)}</div> : <Empty title="No past visits" />}</Card>
    </>
  );
}

function ChatTab({ s, sid }) {
  useEffect(() => { try { localStorage.setItem("careva-read-" + sid, Date.now()); } catch {} });
  const msgs = (s.t.messages || []).filter((m) => m.thread === sid).sort((a, b) => a.ts - b.ts);
  const all = (s.t.messages || []).filter((m) => m.thread === "all-staff").sort((a, b) => a.ts - b.ts);
  return (
    <>
      <Chat title="Careva+ office" msgs={msgs} me={sid} thread={sid} />
      {all.length > 0 && <Card title="Announcements">{all.slice(-5).map((m) => <div key={m.id} className="li"><div className="grow">{m.text}</div><small className="muted">{ago(m.ts)}</small></div>)}</Card>}
    </>
  );
}

function Me({ s, sid, me }) {
  const ts = byId(s.t.timesheets, sid) || {};
  const days = Object.keys(ts).filter((k) => /^\d{4}-/.test(k)).sort().reverse().slice(0, 7);
  const tot = days.reduce((a, d) => a + (ts[d].mins || 0), 0);
  return (
    <>
      <div className="hero"><div className="row"><Avatar name={me.name} color={me.color} size={52} /><div className="grow"><b style={{ fontSize: 17 }}>{me.name}</b><div className="muted">{me.role} · {sid}</div></div></div>
        <div className="chips">{(me.skills || []).map((x) => <ServiceTag key={x} s={x} />)}</div></div>
      <Card title={`Hours · last ${days.length} days · ${(tot / 60).toFixed(1)} h`}>{days.length ? <div className="list">{days.map((d) => <div key={d} className="li"><span className="grow">{fmtDate(d)}</span><b className="num">{(ts[d].mins / 60).toFixed(1)} h</b><span className="muted num">{ts[d].km || 0} km</span></div>)}</div> : <Empty title="No hours logged yet" />}</Card>
      <Btn kind="ghost" className="btn b-ghost block" icon={LogOut} onClick={signOut}>Sign out</Btn>
    </>
  );
}
