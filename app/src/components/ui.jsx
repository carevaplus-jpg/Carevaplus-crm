import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { STATUS, SERVICES } from "../lib/config";
import { initials } from "../lib/util";

export const Card = ({ title, action, children, className = "", pad = true }) => (
  <section className={`card ${className}`}>
    {(title || action) && <header className="card-h"><h3>{title}</h3>{action}</header>}
    <div className={pad ? "card-b" : ""}>{children}</div>
  </section>
);
export const Badge = ({ tone = "grey", children, dot }) => <span className={`badge t-${tone}`}>{dot && <i />}{children}</span>;
export const StatusBadge = ({ s }) => { const x = STATUS[s] || { label: s, tone: "grey" }; return <Badge tone={x.tone} dot>{x.label}</Badge>; };
export const ServiceTag = ({ s }) => { const x = SERVICES[s] || { label: s, color: "#5b6577" }; return <span className="svc" style={{ "--c": x.color }}>{x.label}</span>; };
export const Avatar = ({ name, color = "#0B2F5E", size = 36 }) => <span className="avatar" style={{ background: color, width: size, height: size, fontSize: size * 0.38 }}>{initials(name)}</span>;
export const Btn = ({ kind = "primary", icon: I, children, busy, ...p }) => (
  <button className={`btn b-${kind}`} disabled={busy || p.disabled} {...p}>{busy ? <span className="spin" /> : I && <I size={16} />}{children}</button>
);
export const Stat = ({ label, value, sub, tone, icon: I }) => (
  <div className={`stat ${tone ? "t-" + tone : ""}`}>
    <div className="stat-top">{I && <span className="stat-i"><I size={18} /></span>}<span>{label}</span></div>
    <b>{value}</b>{sub && <small>{sub}</small>}
  </div>
);
export const Empty = ({ icon: I, title, children }) => <div className="empty">{I && <I size={28} />}<b>{title}</b>{children && <p>{children}</p>}</div>;
export const Field = ({ label, children, hint }) => <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;

export function Sheet({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sheet ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="grabber" aria-hidden="true" />
        <header><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button></header>
        <div className="sheet-b">{children}</div>
      </div>
    </div>
  );
}

let pushToast = () => {};
export const toast = (msg, tone = "ok") => pushToast({ msg, tone, id: Math.random() });
export function Toaster() {
  const [list, setList] = useState([]);
  useEffect(() => { pushToast = (t) => { setList((l) => [...l, t]); setTimeout(() => setList((l) => l.filter((x) => x.id !== t.id)), 3200); }; }, []);
  return <div className="toasts" role="status" aria-live="polite">{list.map((t) => <div key={t.id} className={`toast t-${t.tone}`}>{t.msg}</div>)}</div>;
}

/** Run an async action with a busy flag and a toast on failure. */
export function useAction() {
  const [busy, setBusy] = useState(null);
  const run = async (key, fn, okMsg) => {
    setBusy(key);
    try { await fn(); if (okMsg) toast(okMsg); }
    catch (e) { toast(e.message || "Something went wrong. Try again.", "err"); }
    finally { setBusy(null); }
  };
  return [busy, run];
}

export function Tabs({ tabs, value, onChange }) {
  return <div className="tabs" role="tablist">{tabs.map(([k, l]) => <button type="button" key={k} role="tab" aria-selected={value === k} className={value === k ? "on" : ""} onClick={() => onChange(k)}>{l}</button>)}</div>;
}

/** Tiny sparkline for vitals trends */
export function Spark({ values, color = "#2B6DE8", w = 120, h = 34 }) {
  const v = values.filter((x) => x != null && x !== "");
  if (v.length < 2) return <svg width={w} height={h} />;
  const min = Math.min(...v), max = Math.max(...v), r = max - min || 1;
  const pts = v.map((x, i) => [(i / (v.length - 1)) * (w - 6) + 3, h - 4 - ((x - min) / r) * (h - 8)]);
  return (
    <svg width={w} height={h} aria-hidden="true">
      <path d={`M${pts.map((p) => p.join(",")).join(" L")}`} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r="3" fill={color} />
    </svg>
  );
}

/** Signature pad → PNG data URL */
export function SignaturePad({ onChange }) {
  const ref = React.useRef(null);
  useEffect(() => {
    const c = ref.current, x = c.getContext("2d");
    const r = c.getBoundingClientRect(); c.width = r.width * 2; c.height = r.height * 2; x.scale(2, 2);
    x.lineWidth = 2.2; x.lineCap = "round"; x.strokeStyle = "#0B2F5E";
    let down = false;
    const pos = (e) => { const b = c.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
    const dn = (e) => { down = true; c.setPointerCapture(e.pointerId); x.beginPath(); x.moveTo(...pos(e)); };
    const mv = (e) => { if (!down) return; x.lineTo(...pos(e)); x.stroke(); };
    const up = () => { if (down) { down = false; onChange(c.toDataURL("image/png")); } };
    c.addEventListener("pointerdown", dn); c.addEventListener("pointermove", mv); c.addEventListener("pointerup", up);
    return () => { c.removeEventListener("pointerdown", dn); c.removeEventListener("pointermove", mv); c.removeEventListener("pointerup", up); };
  }, [onChange]);
  const clear = () => { const c = ref.current; c.getContext("2d").clearRect(0, 0, c.width, c.height); onChange(null); };
  return <div className="sig"><canvas ref={ref} aria-label="Signature pad" /><button type="button" className="link" onClick={clear}>Clear</button></div>;
}

/** true on phone-sized screens — used to swap tables for touch-friendly lists */
const PHONE_Q = "(max-width: 860px)";
export function usePhone() {
  const [m, setM] = useState(() => typeof matchMedia !== "undefined" && matchMedia(PHONE_Q).matches);
  useEffect(() => {
    const mm = matchMedia(PHONE_Q), f = () => setM(mm.matches);
    mm.addEventListener("change", f); return () => mm.removeEventListener("change", f);
  }, []);
  return m;
}
