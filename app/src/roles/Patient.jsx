import React, { useEffect, useState } from "react";
import { Home, CalendarPlus, HeartPulse, Receipt, MessageSquare, Phone, Star, Bell, LogOut, CheckCircle2, Clock, MapPin, IndianRupee, ShieldCheck } from "lucide-react";
import { useStore, put, patch, signOut, settings as getSettings, byId } from "../lib/store";
import { SERVICES } from "../lib/config";
import { distM, fmtDist } from "../lib/geo";
import { uid, today, fmtDate, fmtTime, ago, rupee, byStart, addDays, hm } from "../lib/util";
import GMap from "../components/GMap";
import { SOSButton } from "../components/alerts";
import { Card, Badge, StatusBadge, ServiceTag, Avatar, Btn, Empty, Field, Sheet, useAction, toast } from "../components/ui";
import { Chat, VitalsPanel } from "./Office";

export default function Patient() {
  const s = useStore();
  const pid = s.profile.patient_id;
  const me = byId(s.t.patients, pid) || { name: s.profile.name || "" };
  const [tab, setTab] = useState("home");
  useEffect(() => {
    const f = (e) => { const g = e.detail; if (["chat", "home", "book", "health", "bills"].includes(g)) setTab(g); };
    window.addEventListener("careva:go", f); return () => window.removeEventListener("careva:go", f);
  }, []);
  const cfg = getSettings(s);
  const due = (s.t.invoices || []).filter((i) => i.status === "due").length;
  const ctx = { s, pid, me, cfg, setTab };
  return (
    <div className="app">
      <SOSButton who={{ id: pid, pid, name: me.name, label: "Patient", phone: me.phone, contact: me.contact }} />
      <header className="app-h"><div className="row"><div className="grow"><div className="hello">Careva+ Home Health Care</div><h1>Vanakkam, {me.name?.split(" ")[0]}</h1></div><a className="icon-btn" href={`tel:${cfg.company?.phone || "9655508881"}`} aria-label="Call Careva+"><Phone size={18} /></a></div></header>
      <div className="app-b">
        {tab === "home" && <HomeTab {...ctx} />}
        {tab === "book" && <Book {...ctx} />}
        {tab === "health" && <Health {...ctx} />}
        {tab === "bills" && <Bills {...ctx} />}
        {tab === "chat" && <><Chat title="Careva+ care team" msgs={(s.t.messages || []).filter((m) => m.thread === pid).sort((a, b) => a.ts - b.ts)} me={pid} thread={pid} /><Btn className="btn b-ghost block" icon={LogOut} onClick={signOut}>Sign out</Btn></>}
      </div>
      <nav className="tabbar" aria-label="Patient"><div>
        {[["home", "Home", Home], ["book", "Book", CalendarPlus], ["health", "Health", HeartPulse], ["bills", "Bills", Receipt], ["chat", "Chat", MessageSquare]].map(([k, l, I]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}><I size={21} />{l}{k === "bills" && due > 0 && <i className="dotc" />}</button>))}
      </div></nav>
    </div>
  );
}

function HomeTab({ s, pid, me, setTab }) {
  const vs = (s.t.visits || []).filter((v) => v.pid === pid && v.status !== "cancelled").sort(byStart);
  const live = vs.find((v) => v.date === today() && ["enroute", "inprogress"].includes(v.status));
  const next = vs.find((v) => v.date >= today() && v.status === "scheduled");
  const toRate = vs.filter((v) => v.status === "completed" && !v.rating).slice(-1)[0];
  const notes = (s.t.notifications || []).sort((a, b) => b.ts - a.ts).slice(0, 5);
  return (
    <>
      {live ? <LiveTracking v={live} s={s} me={me} /> : next ? <NextCard v={next} s={s} /> : (
        <div className="hero"><Empty icon={CalendarPlus} title="No visits booked">Book nursing, physiotherapy, elder care and more at home.</Empty><Btn className="btn b-primary block" onClick={() => setTab("book")}>Book a visit</Btn></div>)}
      {toRate && <RateCard v={toRate} s={s} />}
      <Card title="Updates" action={<Bell size={16} className="muted" />}>
        {notes.length ? <div className="list">{notes.map((n) => (
          <div key={n.id} className="li" onClick={() => !n.read && patch("notifications", n.id, { read: true }).catch(() => {})}>
            {!n.read && <span className="live-dot" style={{ background: "#2B6DE8", animation: "none" }} />}<div className="grow" style={{ fontWeight: n.read ? 500 : 700, fontSize: 14 }}>{n.text}</div><small className="muted">{ago(n.ts)}</small></div>))}</div> : <Empty title="No updates yet" />}
      </Card>
      <Card title="Upcoming visits">{vs.filter((v) => v.date >= today() && v.status === "scheduled").length ? <div className="list">{vs.filter((v) => v.date >= today() && v.status === "scheduled").slice(0, 5).map((v) => <VisitRow key={v.id} v={v} s={s} />)}</div> : <Empty title="Nothing scheduled" />}</Card>
    </>
  );
}

function LiveTracking({ v, s, me }) {
  const st = byId(s.t.staff, v.sid);
  const loc = byId(s.t.staff_locations, v.sid);
  const [eta, setEta] = useState(null);
  const home = me.lat ? { lat: me.lat, lng: me.lng } : null;
  const d = loc && home ? distM(loc, home) : null;
  const step = v.status === "enroute" ? (d != null && d < 120 ? 2 : 1) : 3;
  const markers = [];
  if (home) markers.push({ id: "home", kind: "patient", ...home, color: "#3FA34D", title: "Home" });
  if (loc && st) markers.push({ id: "st", kind: "staff", lat: loc.lat, lng: loc.lng, color: st.color, label: (st.name || "").split(" ").map((w) => w[0]).join("").slice(0, 2), title: st.name, sub: `Updated ${ago(loc.ts)}` });
  return (
    <div className="hero live">
      <div className="row"><span className="live-dot" /><b className="grow">{v.status === "enroute" ? (step === 2 ? "Arriving now" : `${st?.name?.split(" ")[0] || "Your caregiver"} is on the way`) : `${st?.name?.split(" ")[0]} is with you now`}</b><ServiceTag s={v.service} /></div>
      {v.status === "enroute" && <div className="eta"><b>{eta?.minutes ?? (d != null ? Math.max(1, Math.round(d * 1.35 / 1000 / 22 * 60)) : "—")}</b><span className="muted">min away · {fmtDist(eta?.meters ?? d)}{eta?.approx ? " (approx.)" : ""}</span></div>}
      {markers.length > 0 && v.status === "enroute" && <GMap markers={markers} route={loc && home ? { from: loc, to: home } : null} onRoute={setEta} height={240} />}
      <div className="steps">{[0, 1, 2, 3].map((i) => <div key={i} className={i <= step ? "on" : ""} />)}</div>
      <div className="steps-l"><span>Booked</span><span>On the way</span><span>Arrived</span><span>In visit</span></div>
      {st && <div className="row"><Avatar name={st.name} color={st.color} size={42} /><div className="grow"><b>{st.name}</b><div className="muted" style={{ fontSize: 13 }}>{st.role} · {st.exp || 0} yrs experience</div></div><a className="btn b-ghost" href={`tel:${st.phone}`}><Phone size={16} />Call</a></div>}
      {v.status === "inprogress" && <div className="muted" style={{ fontSize: 13 }}><ShieldCheck size={13} /> Checked in at {v.evv?.inT} · {(v.tasks || []).filter((t) => t.done).length} of {(v.tasks || []).length} care tasks done</div>}
    </div>
  );
}

function NextCard({ v, s }) {
  const st = byId(s.t.staff, v.sid);
  const [busy, run] = useAction();
  return (
    <div className="hero">
      <div className="row"><b className="grow">Next visit</b><ServiceTag s={v.service} /></div>
      <div className="row"><div style={{ background: "var(--glass-strong)", borderRadius: 16, padding: "8px 12px", textAlign: "center", minWidth: 64, boxShadow: "inset 0 0 0 .5px var(--sep)" }}><div style={{ fontSize: 12, fontWeight: 600, color: "var(--red)", textTransform: "uppercase" }}>{fmtDate(v.date, { month: "short" })}</div><div style={{ fontSize: 28, fontWeight: 300, lineHeight: 1.05 }}>{v.date.slice(8)}</div></div>
        <div className="grow"><b style={{ fontSize: 17 }}>{v.date === today() ? "Today" : fmtDate(v.date, { weekday: "long" })}, {fmtTime(v.start)}</b><div className="muted" style={{ fontSize: 13 }}>{v.dur || 45} min · {st ? `with ${st.name}` : "caregiver being assigned"}</div></div></div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>You'll see your caregiver live on the map once they start travelling.</p>
      {v.status === "scheduled" && v.date > today() && <button className="link" onClick={() => run("c", () => patch("visits", v.id, { status: "cancelled" }), "Visit cancelled — the office has been told")} disabled={busy === "c"}>Cancel this visit</button>}
    </div>
  );
}

function VisitRow({ v, s }) {
  const st = byId(s.t.staff, v.sid);
  return <div className="li"><div style={{ width: 70 }}><b>{fmtDate(v.date, { day: "numeric", month: "short" })}</b><div className="s">{fmtTime(v.start)}</div></div><div className="grow"><div className="t">{SERVICES[v.service]?.label}</div><div className="s">{st?.name || "Caregiver to be assigned"}</div></div><StatusBadge s={v.status} /></div>;
}

function RateCard({ v, s }) {
  const [r, setR] = useState(0); const [fb, setFb] = useState(""); const [busy, run] = useAction();
  const st = byId(s.t.staff, v.sid);
  return (
    <Card title={`How was your visit with ${st?.name?.split(" ")[0] || "us"}?`}>
      <div className="row" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => <button key={n} className="icon-btn" style={{ border: 0, color: n <= r ? "#E5A50A" : "#C5CDD8" }} aria-label={`${n} star`} onClick={() => setR(n)}><Star size={26} fill={n <= r ? "#E5A50A" : "none"} /></button>)}</div>
      {r > 0 && <div className="stack" style={{ marginTop: 10 }}><textarea id="fb" placeholder="Anything we should know? (optional)" value={fb} onChange={(e) => setFb(e.target.value)} style={{ minHeight: 60 }} /><Btn busy={busy === "r"} onClick={() => run("r", () => patch("visits", v.id, { rating: r, feedback: fb }), "Thank you for your feedback")}>Send rating</Btn></div>}
    </Card>
  );
}

function Book({ s, pid, me, cfg, setTab }) {
  const [f, setF] = useState({ service: me.services?.[0] || "nursing", date: addDays(today(), 1), slot: "09:00", notes: "" });
  const [busy, run] = useAction();
  const slots = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00"];
  const submit = () => run("b", async () => {
    await put("requests", { id: uid("RQ"), pid, service: f.service, date: f.date, slot: f.slot, notes: f.notes, source: "Patient app", status: "pending", created: Date.now() });
    await put("alerts", { id: uid("A"), kind: "request", level: "blue", text: `New visit request — ${me.name} · ${SERVICES[f.service].label} · ${fmtDate(f.date)} ${fmtTime(f.slot)}`, pid, ts: Date.now(), done: false });
    setTab("home");
  }, "Request sent — the office will confirm shortly");
  const mine = (s.t.requests || []).filter((r) => r.status === "pending");
  return (
    <>
      <Card title="Book a home visit"><div className="stack">
        <Field label="What do you need?"><div className="chips">{Object.entries(SERVICES).map(([k, x]) => <button key={k} type="button" className={`chip ${f.service === k ? "on" : ""}`} onClick={() => setF({ ...f, service: k })}>{x.label}{cfg.rates?.[k] ? ` · ${rupee(cfg.rates[k])}` : ""}</button>)}</div></Field>
        <Field label="Date"><input id="bdate" type="date" min={today()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Preferred time"><div className="chips">{slots.map((t) => <button key={t} type="button" className={`chip ${f.slot === t ? "on" : ""}`} onClick={() => setF({ ...f, slot: t })}>{fmtTime(t)}</button>)}</div></Field>
        <Field label="Notes for the care team"><textarea id="bnotes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="e.g. Dressing change on left foot, gate code 1234" /></Field>
        <Btn className="btn b-primary block" busy={busy === "b"} onClick={submit}>Request visit</Btn>
        <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Charges are per visit. Urgent? Call {cfg.company?.phone || "96555 08881"}.</p>
      </div></Card>
      {mine.length > 0 && <Card title="Waiting for confirmation">{mine.map((r) => <div key={r.id} className="li"><Clock size={16} className="muted" /><div className="grow"><div className="t">{SERVICES[r.service]?.label}</div><div className="s">{fmtDate(r.date)} · {fmtTime(r.slot)}</div></div><Badge tone="amber">Pending</Badge></div>)}</Card>}
    </>
  );
}

function Health({ s, pid, me }) {
  const vit = (s.t.vitals || []).filter((x) => x.pid === pid).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const [add, setAdd] = useState(false);
  const [edit, setEdit] = useState(false);
  return (
    <>
      <Card title="My vitals" action={<Btn kind="ghost" onClick={() => setAdd(true)}>Add reading</Btn>}><VitalsPanel vit={vit} /></Card>
      <Card title="My care profile" action={<button className="link" onClick={() => setEdit(true)}>Edit</button>}><dl className="kv">
        <dt>Conditions</dt><dd>{(me.dx || []).join(", ") || "—"}</dd><dt>Allergies</dt><dd>{(me.allergies || []).join(", ") || "None recorded"}</dd>
        <dt>Doctor</dt><dd>{me.doctor || "—"}</dd><dt>Address</dt><dd>{me.addr || "—"}</dd>
        <dt>Emergency</dt><dd>{me.contact?.name ? `${me.contact.name} (${me.contact.rel}) · ${me.contact.phone}` : "—"}</dd>
      </dl>{!me.lat && <div className="err" style={{ marginTop: 10 }}><MapPin size={14} /> Your home isn't pinned on the map yet. Call the office so caregivers find you easily.</div>}</Card>
      {add && <AddVitals pid={pid} onClose={() => setAdd(false)} />}
      {edit && <EditProfile me={me} onClose={() => setEdit(false)} />}
    </>
  );
}

function AddVitals({ pid, onClose }) {
  const [v, setV] = useState({}); const [busy, run] = useAction();
  const save = () => run("v", async () => {
    const clean = Object.fromEntries(Object.entries(v).filter(([, x]) => x !== "").map(([k, x]) => [k, +x]));
    if (!Object.keys(clean).length) throw new Error("Enter at least one reading.");
    await put("vitals", { id: uid("VT"), pid, date: today(), time: hm(), ...clean, by: "self" }); onClose();
  }, "Reading saved");
  return (
    <Sheet open title="Add a reading" onClose={onClose}>
      <div className="grid2 keep">{[["sys", "BP systolic"], ["dia", "BP diastolic"], ["pulse", "Pulse /min"], ["spo2", "SpO₂ %"], ["sugar", "Sugar mg/dL"], ["temp", "Temp °F"]].map(([k, l]) => <Field key={k} label={l}><input id={`pv-${k}`} type="number" step="any" inputMode="decimal" value={v[k] || ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></Field>)}</div>
      <Btn className="btn b-primary block" busy={busy === "v"} onClick={save}>Save reading</Btn>
    </Sheet>
  );
}

function EditProfile({ me, onClose }) {
  const [addr, setAddr] = useState(me.addr || ""); const [c, setC] = useState(me.contact || {}); const [busy, run] = useAction();
  return (
    <Sheet open title="Edit my details" onClose={onClose}>
      <Field label="Home address"><textarea id="paddr" value={addr} onChange={(e) => setAddr(e.target.value)} style={{ minHeight: 60 }} /></Field>
      <div className="grid3"><Field label="Emergency contact"><input value={c.name || ""} onChange={(e) => setC({ ...c, name: e.target.value })} /></Field><Field label="Relation"><input value={c.rel || ""} onChange={(e) => setC({ ...c, rel: e.target.value })} /></Field><Field label="Phone"><input type="tel" value={c.phone || ""} onChange={(e) => setC({ ...c, phone: e.target.value })} /></Field></div>
      <Btn className="btn b-primary block" busy={busy === "s"} onClick={() => run("s", async () => { await patch("patients", me.id, { addr, contact: c }); onClose(); }, "Details updated")}>Save</Btn>
    </Sheet>
  );
}

function Bills({ s, pid, me, cfg }) {
  const inv = (s.t.invoices || []).filter((i) => i.pid === pid).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const [pay, setPay] = useState(null);
  const due = inv.filter((i) => i.status === "due").reduce((a, i) => a + (+i.amount || 0), 0);
  return (
    <>
      <div className="hero"><div className="muted" style={{ fontWeight: 700, fontSize: 13 }}>Amount due</div><div className="eta"><b><IndianRupee size={26} style={{ verticalAlign: -3 }} />{Number(due).toLocaleString("en-IN")}</b></div>{due === 0 && <span className="muted">You're all paid up. Thank you!</span>}</div>
      <Card title="Invoices">{inv.length ? <div className="list">{inv.map((i) => (
        <div key={i.id} className="li"><div className="grow"><div className="t">{fmtDate(i.month + "-01", { month: "long", year: "numeric" })}</div><div className="s">{(i.items || []).map((x) => `${x.d} × ${x.q}`).join(", ")} · due {fmtDate(i.due)}</div></div>
          <div style={{ textAlign: "right" }}><b className="num">{rupee(i.amount)}</b><div>{i.status === "paid" ? <Badge tone="green">Paid</Badge> : i.status === "verifying" ? <Badge tone="amber">Verifying</Badge> : <button className="btn b-green" style={{ padding: "6px 12px", marginTop: 4 }} onClick={() => setPay(i)}>Pay</button>}</div></div></div>))}</div> : <Empty icon={Receipt} title="No bills yet" />}</Card>
      {pay && <PaySheet inv={pay} me={me} cfg={cfg} onClose={() => setPay(null)} />}
    </>
  );
}

function PaySheet({ inv, me, cfg, onClose }) {
  const [ref, setRef] = useState(""); const [busy, run] = useAction();
  const upi = cfg.company?.upi;
  const link = upi ? `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(cfg.company?.name || "Careva Plus")}&am=${inv.amount}&cu=INR&tn=${encodeURIComponent(inv.id)}` : null;
  const claim = () => run("p", async () => {
    if (ref.trim().length < 6) throw new Error("Enter the UPI reference (UTR) number from your payment app.");
    await patch("invoices", inv.id, { payRef: ref.trim(), payClaimedAt: Date.now() });
    await put("alerts", { id: uid("A"), kind: "payment", level: "green", text: `Payment reported — ${me.name}: ${rupee(inv.amount)} · Ref ${ref.trim()}`, pid: inv.pid, ts: Date.now(), done: false });
    onClose();
  }, "Thanks! We'll confirm your payment shortly");
  return (
    <Sheet open title={`Pay ${rupee(inv.amount)}`} onClose={onClose}>
      <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}><li>Pay with any UPI app (GPay, PhonePe, Paytm) to <b>{upi || "the Careva+ UPI ID"}</b>.</li><li>Copy the UPI reference (UTR) number from the receipt.</li><li>Enter it below so we can confirm your payment.</li></ol>
      {link && <a className="btn b-green block" href={link}><IndianRupee size={16} />Open UPI app</a>}
      {upi && <div className="row"><input readOnly value={upi} id="upi" /><Btn kind="ghost" type="button" onClick={() => navigator.clipboard?.writeText(upi).then(() => toast("UPI ID copied"), () => document.getElementById("upi").select())}>Copy</Btn></div>}
      <Field label="UPI reference (UTR)"><input id="utr" inputMode="numeric" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="12-digit number" /></Field>
      <Btn className="btn b-primary block" busy={busy === "p"} onClick={claim}>I've paid</Btn>
    </Sheet>
  );
}
