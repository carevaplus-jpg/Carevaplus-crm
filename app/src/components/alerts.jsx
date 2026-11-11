import LOGO from "../assets/logo.webp";
import React, { useEffect, useRef, useState } from "react";
import { Download, Phone, MapPin, ShieldAlert, X, Volume2, VolumeX, Ambulance } from "lucide-react";
import { onBanner, go, chime, NATIVE } from "../lib/notify";
import { put, patch, byId, settings as getSettings, useStore } from "../lib/store";
import { getPosition, gmapsAt } from "../lib/geo";
import { uid, ago } from "../lib/util";
import { APK_URL } from "../lib/config";
import { Sheet, toast, Btn } from "./ui";
import GMap from "./GMap";

/* ---------------- iOS-style notification banners (top of screen) ---------------- */
export function Banners() {
  const [list, setList] = useState([]);
  useEffect(() => onBanner((n) => {
    setList((l) => [n, ...l].slice(0, 3));
    setTimeout(() => setList((l) => l.filter((x) => x.id !== n.id)), n.tone === "sos" ? 15000 : 5500);
  }), []);
  const close = (id) => setList((l) => l.filter((x) => x.id !== id));
  if (!list.length) return null;
  return (
    <div className="banners" role="region" aria-live="assertive" aria-label="Notifications">
      {list.map((n) => (
        <button key={n.id} className={`banner ${n.tone === "sos" ? "sos" : ""}`} onClick={() => { go(n.go); close(n.id); }}>
          <span className="banner-icon">{n.tone === "sos" ? <ShieldAlert size={20} /> : <img src={LOGO} alt="" />}</span>
          <span className="banner-text"><span className="banner-top"><b>{n.title}</b><small>now</small></span><span className="banner-body">{n.body}</span></span>
        </button>
      ))}
    </div>
  );
}

/* ---------------- "Download Android app" (web only — hidden inside the APK) ---------------- */
export function ApkButton({ compact }) {
  if (NATIVE) return null;
  return <a className={`apk-btn ${compact ? "compact" : ""}`} href={APK_URL} download="Careva-Plus.apk"><Download size={16} />{compact ? "Android app" : "Download Android app"}</a>;
}

/* ---------------- SOS (patients & staff): press and hold 1.5 s ---------------- */
const HOLD = 1500;
export function SOSButton({ who }) {
  const s = useStore();
  const cfg = getSettings(s);
  const [p, setP] = useState(0);
  const [sent, setSent] = useState(null);
  const raf = useRef(0), t0 = useRef(0), firing = useRef(false);

  const fire = async () => {
    firing.current = true;
    try { navigator.vibrate?.([200, 80, 200]); } catch {}
    let pos = null;
    try { pos = await getPosition({ timeout: 8000 }); } catch {}
    const where = pos ? ` Location: https://maps.google.com/?q=${pos.lat},${pos.lng}` : " (location unavailable)";
    const doc = { id: uid("A"), kind: "sos", level: "red", text: `SOS from ${who.name} (${who.label})${pos ? "" : " — location unavailable"}`, ts: Date.now(), done: false, by: who.name, phone: who.phone, ...(who.pid ? { pid: who.pid } : { sid: who.sid }), ...(pos || {}) };
    try {
      await put("alerts", doc);
      await put("messages", { id: uid("M"), thread: who.id, from: who.id, text: `🚨 SOS — I need help now.${where}`, ts: Date.now() });
      setSent({ ok: true, pos });
    } catch (e) { setSent({ ok: false, err: e.message }); }
    firing.current = false;
  };
  const down = (e) => {
    if (firing.current) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    t0.current = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0.current) / HOLD); setP(k);
      if (k >= 1) { setP(0); fire(); return; }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const up = () => {
    if (!raf.current) return;
    cancelAnimationFrame(raf.current); raf.current = 0;
    if (p > 0 && p < 1) toast("Keep holding SOS for 2 seconds to call for help");
    setP(0);
  };
  const office = cfg.company?.phone || "96555 08881";
  return (
    <>
      <button className="sos-btn" aria-label="SOS emergency — press and hold" onPointerDown={down} onPointerUp={up} onPointerCancel={up} onContextMenu={(e) => e.preventDefault()} style={{ "--p": p }}>
        <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" /></svg>
        <span>SOS</span>
      </button>
      {sent && (
        <Sheet open title={sent.ok ? "Help is on the way" : "SOS not sent"} onClose={() => setSent(null)}>
          {sent.ok ? <p style={{ margin: 0 }}>The Careva+ office has been alerted{sent.pos ? " with your live location" : ""}. Stay where you are. If it's life-threatening, call an ambulance now.</p>
            : <div className="err">{sent.err || "No connection."} Call for help directly:</div>}
          <a className="btn b-danger-solid block" href="tel:108"><Ambulance size={18} />Call 108 Ambulance</a>
          <a className="btn b-primary block" href={`tel:${office.replace(/\s/g, "")}`}><Phone size={18} />Call Careva+ office · {office}</a>
          {who.contact?.phone && <a className="btn b-ghost block" href={`tel:${who.contact.phone.replace(/\s/g, "")}`}><Phone size={18} />Call {who.contact.name} ({who.contact.rel})</a>}
          <a className="btn b-ghost block" href="tel:112">Call 112 Emergency</a>
        </Sheet>
      )}
    </>
  );
}

/* ---------------- Office: full-screen SOS until someone handles it ---------------- */
export function SOSOverlay() {
  const s = useStore();
  const active = (s.t.alerts || []).filter((a) => a.kind === "sos" && !a.done).sort((a, b) => b.ts - a.ts);
  const [muted, setMuted] = useState(false);
  const a = active[0];
  useEffect(() => {
    if (!a || muted) return;
    chime("sos");
    const t = setInterval(() => chime("sos"), 2600);
    return () => clearInterval(t);
  }, [a?.id, muted]);
  if (!a) return null;
  const person = byId(s.t.patients, a.pid) || byId(s.t.staff, a.sid);
  const phone = a.phone || person?.phone;
  const pos = a.lat != null ? { lat: a.lat, lng: a.lng } : person?.lat ? { lat: person.lat, lng: person.lng } : null;
  return (
    <div className="sos-overlay" role="alertdialog" aria-modal="true" aria-label="SOS emergency">
      <div className="sos-card">
        <div className="row"><span className="sos-pulse"><ShieldAlert size={26} /></span><div className="grow"><div className="sos-k">SOS emergency{active.length > 1 ? ` · ${active.length} active` : ""}</div><h2>{a.by || person?.name || "Unknown"}</h2><div className="muted">{a.pid ? "Patient" : "Care staff"} · {ago(a.ts)}{a.acc ? ` · GPS ±${a.acc} m` : ""}</div></div>
          <button className="icon-btn" onClick={() => setMuted(!muted)} aria-label={muted ? "Unmute siren" : "Mute siren"}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button></div>
        {pos ? <GMap markers={[{ id: "sos", kind: "patient", ...pos, color: "#FF3B30", title: a.by || "SOS", sub: a.lat != null ? "Live location at SOS" : "Home address" }]} focus={pos} height={260} /> : <div className="err">No location was shared. Call them now.</div>}
        {person?.addr && <div className="muted" style={{ fontSize: 15 }}><MapPin size={14} /> {person.addr}</div>}
        <div className="grid2 keep">
          {phone && <a className="btn b-danger-solid" href={`tel:${phone.replace(/\s/g, "")}`}><Phone size={18} />Call {(a.by || "").split(" ")[0]}</a>}
          {pos && <a className="btn b-ghost" href={gmapsAt(pos)} target="_blank" rel="noreferrer"><MapPin size={18} />Open in Maps</a>}
        </div>
        {person?.contact?.phone && <a className="btn b-ghost block" href={`tel:${person.contact.phone.replace(/\s/g, "")}`}><Phone size={18} />Call family · {person.contact.name}</a>}
        <Btn className="btn b-primary block" onClick={() => patch("alerts", a.id, { done: true, handledAt: Date.now() }).then(() => toast("SOS marked as handled"), (e) => toast(e.message, "err"))}>Mark as handled</Btn>
      </div>
    </div>
  );
}
