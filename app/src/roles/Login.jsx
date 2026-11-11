import LOGO from "../assets/logo.webp";
import React, { useState } from "react";
import { CheckCircle2, Stethoscope, User, Building2 } from "lucide-react";
import { signIn } from "../lib/store";
import { Btn, Field, Tabs } from "../components/ui";

const KINDS = {
  staff: { label: "Care staff", ident: "Staff ID", ph: "e.g. S101", type: "text", icon: Stethoscope },
  patient: { label: "Patient & family", ident: "Registered mobile number", ph: "10-digit mobile", type: "tel", icon: User },
  office: { label: "Office", ident: "Email", ph: "you@carevaplus.com", type: "email", icon: Building2 },
};

export default function Login({ demo }) {
  const [kind, setKind] = useState("staff");
  const [ident, setIdent] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const k = KINDS[kind];

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try { await signIn(kind, ident, pw); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const tryDemo = async (r) => { setBusy(true); try { await signIn(r, "", ""); } finally { setBusy(false); } };

  return (
    <div className="login">
      <div className="login-art">
        <div>
          <span className="logo-plate"><img src={LOGO} alt="Careva Plus Home Health Care" /></span>
          <h1 style={{ marginTop: 36 }}>Hospital care, in the <span>comfort of home.</span></h1>
          <p>One app for patients and families, care staff on the road and the Careva+ office in Salem.</p>
          <ul>
            <li><CheckCircle2 size={18} /> Live caregiver tracking on Google Maps</li>
            <li><CheckCircle2 size={18} /> GPS-verified visits with signatures</li>
            <li><CheckCircle2 size={18} /> Vitals, care tasks and bills in one place</li>
          </ul>
        </div>
        <small className="foot muted">Careva Plus Home Health Care · Salem, Tamil Nadu · 96555 08881</small>
      </div>
      <div className="login-form">
        <form className="login-card" onSubmit={submit}>
          <div><h2>Sign in</h2><p className="muted" style={{ margin: "4px 0 0" }}>Choose who you are, then enter your details.</p></div>
          <Tabs tabs={Object.entries(KINDS).map(([key, v]) => [key, v.label])} value={kind} onChange={(v) => { setKind(v); setErr(""); setIdent(""); }} />
          {!demo && <>
            <Field label={k.ident}><input id="ident" type={k.type} inputMode={kind === "patient" ? "numeric" : undefined} autoComplete="username" placeholder={k.ph} value={ident} onChange={(e) => setIdent(e.target.value)} required /></Field>
            <Field label="Password"><input id="pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></Field>
            {err && <div className="err">{err}</div>}
            <Btn className="btn b-primary block" busy={busy}>Sign in</Btn>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>Forgot your password? Call the Careva+ office on 96555 08881.</p>
          </>}
          {demo && <>
            <div className="err" style={{ background: "color-mix(in srgb, var(--orange) 14%, transparent)", color: "var(--orange)" }}>Demo mode uses sample patients and staff. Nothing you do here touches real records.</div>
            <Btn className="btn b-primary block" busy={busy} type="button" onClick={() => tryDemo(kind)}>Open the {k.label.toLowerCase()} demo</Btn>
          </>}
          <div className="or">{demo ? "OR" : "NEW TO THE APP?"}</div>
          {demo
            ? <a className="btn b-ghost block" href="./">Sign in to the real app</a>
            : <a className="btn b-ghost block" href="?demo=1">Try the demo with sample data</a>}
        </form>
      </div>
    </div>
  );
}
