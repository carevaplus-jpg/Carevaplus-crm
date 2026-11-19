<!doctype html>
<html><head><meta charset="utf-8"><title>Careva+ intro</title>
<style>
/* Careva+ light theme: navy text, royal blue, teal "plus", coral heart, gold crown. */
:root{
  --bg:#F2F6FB; --fg:#0F1B3D; --muted:#5F6B85; --blue:#2563EB; --blue2:#1D4ED8; --teal:#0EA5A4; --teal2:#0B8584;
  --coral:#F2557A; --coral2:#D93C63; --gold:#E8A93A; --card:#FFFFFF; --line:#E3E9F2; --green:#16A34A; --navy:#111827;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1920px;height:1080px;overflow:hidden;background:var(--bg)}
body{font-family:Inter,"Liberation Sans",Arial,sans-serif;color:var(--fg);position:relative;
  background:radial-gradient(1200px 800px at 28% 40%,#FFFFFF 0%,var(--bg) 70%)}
#dots{position:absolute;inset:0;background-image:radial-gradient(rgba(15,27,61,.08) 1.5px,transparent 1.6px);background-size:36px 36px}
.abs{position:absolute}
.scene{position:absolute;inset:0}
#mark{left:64px;top:44px;display:flex;align-items:center;gap:12px;font-size:26px;font-weight:800;color:var(--fg);letter-spacing:.5px}
#mark i{width:30px;height:30px;border-radius:8px;background:var(--teal);color:#fff;font-style:normal;font-size:26px;font-weight:900;display:flex;align-items:center;justify-content:center}
#mark span{color:var(--muted);font-weight:600;font-size:22px;margin-left:6px}
#mascot{position:absolute;z-index:5}
#mascot svg{width:100%;height:100%;overflow:visible;display:block}
#body .h{fill:var(--coral)}
#body .k{fill:#1B1030}
#body .ck{fill:#FF9AB2}
#body .cap{fill:#fff;stroke:#C9D3E3;stroke-width:1}
#body .pl{fill:var(--teal)}
.kicker{font-size:28px;font-weight:700;letter-spacing:4px;color:var(--teal2);text-transform:uppercase}
.title{font-weight:800;color:var(--fg);letter-spacing:-1.5px;line-height:1.04}
.plus{color:var(--teal)}
.crumb{display:inline-flex;align-items:center;gap:10px;font-size:26px;font-weight:600;color:var(--fg);background:#fff;border:1px solid var(--line);padding:10px 18px;border-radius:12px;box-shadow:0 4px 14px rgba(15,27,61,.06)}
.crumb b{color:var(--blue)}

/* scene 1 */
#bubble{left:600px;top:150px;background:var(--fg);color:#fff;font-size:40px;font-weight:800;padding:18px 30px;border-radius:18px;transform-origin:0% 100%}
#bubble:after{content:"";position:absolute;left:34px;bottom:-18px;border:18px solid transparent;border-top-color:var(--fg);border-bottom:0;border-left:0}
#s1k{left:980px;top:270px}
#s1t{left:972px;top:316px;font-size:176px;letter-spacing:-5px}
#s1s{left:984px;top:524px;font-size:52px;font-weight:700;color:var(--coral2)}
.chips{left:984px;top:640px;display:flex;flex-direction:column;gap:20px}
.chip{display:flex;align-items:center;gap:20px;font-size:40px;font-weight:700;color:var(--fg)}
.chip span{width:54px;height:54px;border-radius:14px;background:var(--teal);color:#fff;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900}

/* scenes 2 and 3: left column */
.lk{left:104px;top:200px}
.lt{left:100px;top:248px;width:620px;font-size:92px}
.lc{left:104px;top:470px}

/* cards */
.card{left:800px;top:120px;width:1020px;background:var(--card);color:var(--fg);border-radius:24px;border:1px solid var(--line);box-shadow:0 24px 70px rgba(15,27,61,.14);overflow:hidden}
.head{display:flex;align-items:center;justify-content:space-between;padding:26px 44px;border-bottom:1px solid var(--line);font-size:26px;color:var(--muted)}
.head b{color:var(--fg);font-weight:700}
.body{padding:12px 44px 30px}
.row{display:flex;align-items:center;gap:28px;padding:26px 0;border-top:1px solid var(--line)}
.row:first-child{border-top:0}
.ico{width:76px;height:76px;border-radius:20px;background:#E8F7F7;color:var(--teal2);font-size:40px;font-weight:900;display:flex;align-items:center;justify-content:center;flex:none}
.row h4{font-size:34px;font-weight:700}
.row p{font-size:24px;color:var(--muted);margin-top:6px}
.tick{margin-left:auto;width:56px;height:56px;border-radius:50%;background:var(--green);color:#fff;font-size:34px;font-weight:900;display:flex;align-items:center;justify-content:center;flex:none}

/* scene 3: CRM mock */
#crm{display:flex;height:690px;padding:0}
#side{width:230px;background:var(--navy);color:#C7CEDB;padding:28px 22px;font-size:22px;flex:none}
#side h5{color:#fff;font-size:26px;font-weight:800;margin-bottom:26px;letter-spacing:.5px}
#side h5 em{font-style:normal;color:var(--gold)}
#side div{padding:12px 14px;border-radius:10px;margin-bottom:6px}
#side .on{background:rgba(37,99,235,.35);color:#fff;font-weight:700}
#main{flex:1;padding:26px 34px;background:#F6F8FC;position:relative}
#main h3{font-size:30px;font-weight:800;margin-bottom:18px}
.stats{display:flex;gap:16px;margin-bottom:20px}
.stat{flex:1;background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 18px}
.stat p{font-size:18px;color:var(--muted);font-weight:600}
.stat b{font-size:40px;font-weight:800;font-variant-numeric:tabular-nums}
.form{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px 20px;display:flex;gap:14px;align-items:center}
.inp{flex:1;height:54px;border:2px solid var(--line);border-radius:10px;padding:0 16px;font-size:24px;display:flex;align-items:center;color:var(--fg);white-space:nowrap;overflow:hidden}
.inp.ph{color:#A3ADBF}
.save{background:var(--blue);color:#fff;font-size:22px;font-weight:700;padding:15px 22px;border-radius:10px;white-space:nowrap}
.lead{margin-top:18px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px 20px;display:flex;align-items:center;gap:16px}
.lead .av{width:52px;height:52px;border-radius:50%;background:#FDE4EB;color:var(--coral2);font-weight:800;font-size:24px;display:flex;align-items:center;justify-content:center}
.lead h4{font-size:26px;font-weight:700}
.lead p{font-size:19px;color:var(--muted)}
.st{margin-left:auto;font-size:20px;font-weight:700;border-radius:999px;padding:8px 16px}
.conv{font-size:20px;font-weight:700;color:var(--blue);border:2px solid var(--blue);border-radius:10px;padding:9px 14px;white-space:nowrap}
#toast{position:absolute;right:28px;bottom:28px;width:470px;background:var(--fg);color:#fff;border-radius:16px;padding:18px 22px;display:flex;gap:16px;align-items:center;box-shadow:0 18px 40px rgba(15,27,61,.3)}
#toast .ai{width:50px;height:50px;border-radius:12px;background:linear-gradient(135deg,#22C55E,#06B6D4);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:20px;flex:none}
#toast h4{font-size:22px;font-weight:700}
#toast p{font-size:18px;color:#B9C2D6;margin-top:3px}
#cursor{position:absolute;width:44px;height:44px;z-index:3}
#ripple{position:absolute;width:20px;height:20px;border-radius:50%;border:4px solid var(--blue);z-index:2}

/* scene 4 */
#s4t{left:0;width:1920px;top:590px;text-align:center;font-size:118px}
#s4l{left:0;width:1920px;top:742px;text-align:center;font-size:46px;font-weight:800;color:var(--fg)}
#s4f{left:0;width:1920px;top:816px;text-align:center;font-size:30px;font-weight:600;color:var(--muted)}

#sub{position:absolute;left:0;width:1920px;bottom:58px;display:flex;justify-content:center;z-index:10}
#sub span{max-width:1500px;text-align:center;font-size:44px;font-weight:600;line-height:1.25;color:#fff;background:rgba(15,27,61,.88);padding:10px 28px;border-radius:14px;white-space:pre-line}
</style></head>
<body>
<div id="dots"></div>
<div id="mark" class="abs"><i>+</i>CAREVA+<span>Home health care</span></div>

<!-- Pixel heart mascot in a nurse cap. Animated per frame by render(). -->
<div id="mascot"><svg viewBox="0 0 100 90" shape-rendering="crispEdges">
  <ellipse id="shadow" cx="50" cy="84" rx="20" ry="4.5" fill="#0F1B3D" opacity=".14"/>
  <g id="body">
    <rect class="h" x="20" y="14" width="22" height="6"/>
    <rect class="h" x="58" y="14" width="22" height="6"/>
    <rect class="h" x="14" y="20" width="32" height="6"/>
    <rect class="h" x="54" y="20" width="32" height="6"/>
    <rect class="h" x="12" y="26" width="76" height="20"/>
    <rect class="h" x="16" y="46" width="68" height="6"/>
    <rect class="h" x="22" y="52" width="56" height="6"/>
    <rect class="h" x="28" y="58" width="44" height="6"/>
    <rect class="h" x="34" y="64" width="32" height="6"/>
    <rect class="h" x="42" y="70" width="16" height="5"/>
    <rect id="armL" class="h" x="2" y="34" width="10" height="8"/>
    <rect id="armR" class="h" x="88" y="34" width="10" height="8"/>
    <rect id="eyeL" class="k" x="30" y="30" width="8" height="10"/>
    <rect id="eyeR" class="k" x="62" y="30" width="8" height="10"/>
    <rect class="ck" x="22" y="42" width="7" height="4"/>
    <rect class="ck" x="71" y="42" width="7" height="4"/>
    <rect id="mouth" class="k" x="44" y="46" width="12" height="6"/>
    <g id="cap">
      <rect class="cap" x="33" y="3" width="34" height="12" rx="1"/>
      <rect class="pl" x="48" y="5" width="4" height="8"/>
      <rect class="pl" x="46" y="7" width="8" height="4"/>
    </g>
  </g>
</svg></div>

<!-- 1. Hello -->
<div class="scene" id="s1">
  <div id="bubble" class="abs">Hello!</div>
  <div id="s1k" class="abs kicker">Trusted home health care</div>
  <div id="s1t" class="abs title">Careva<span class="plus">+</span></div>
  <div id="s1s" class="abs">Care that comes home.</div>
  <div class="abs chips">
    <div class="chip" id="ch1"><span>+</span>Trained nurses</div>
    <div class="chip" id="ch2"><span>+</span>Caretakers at home</div>
    <div class="chip" id="ch3"><span>+</span>Smart AI CRM</div>
  </div>
</div>

<!-- 2. Care at home -->
<div class="scene" id="s2">
  <div class="abs kicker lk" id="s2k">Our care team</div>
  <div class="abs title lt" id="s2t">Care at your door</div>
  <div class="abs lc" id="s2c"><span class="crumb">Safe <b>·</b> Personal <b>·</b> At home</span></div>
  <div class="abs card" id="c1">
    <div class="head"><span>Careva+&nbsp;&nbsp;›&nbsp;&nbsp;<b>Care team</b></span><span>Home visit</span></div>
    <div class="body">
      <div class="row" id="r1"><div class="ico">+</div><div><h4>Trained nurses</h4><p>Medical support in the comfort of home</p></div><div class="tick" id="k1">✓</div></div>
      <div class="row" id="r2"><div class="ico">+</div><div><h4>Caretakers</h4><p>Daily help, company and comfort</p></div><div class="tick" id="k2">✓</div></div>
      <div class="row" id="r3"><div class="ico">+</div><div><h4>Patient safety first</h4><p>Careful routines on every visit</p></div><div class="tick" id="k3">✓</div></div>
      <div class="row" id="r4"><div class="ico">+</div><div><h4>Personal care plan</h4><p>Built around each patient's needs</p></div><div class="tick" id="k4">✓</div></div>
    </div>
  </div>
</div>

<!-- 3. Smart CRM -->
<div class="scene" id="s3">
  <div class="abs kicker lk" id="s3k">Behind the scenes</div>
  <div class="abs title lt" id="s3t">Smart AI CRM</div>
  <div class="abs lc" id="s3c"><span class="crumb">Enquiry <b>›</b> Follow-up <b>›</b> Patient</span></div>
  <div class="abs card" id="c2">
    <div id="crm">
      <div id="side">
        <h5><em>&#9819;</em> CAREVA+</h5>
        <div>Dashboard</div><div class="on">Leads</div><div>Patients</div><div>Tasks</div><div>AI Automation</div><div>Billing</div>
      </div>
      <div id="main">
        <h3>Leads</h3>
        <div class="stats">
          <div class="stat"><p>Leads</p><b id="nL">0</b></div>
          <div class="stat"><p>Tasks</p><b id="nT">0</b></div>
          <div class="stat"><p>Patients</p><b id="nP">0</b></div>
        </div>
        <div class="form">
          <div class="inp" id="iN">Name</div>
          <div class="inp" id="iP">Phone</div>
          <div class="save" id="sv">Save lead</div>
        </div>
        <div class="lead" id="ld">
          <div class="av">AV</div>
          <div><h4>Asha Verma</h4><p>Enquiry · home nursing</p></div>
          <div class="st" id="lst">New lead</div>
          <div class="conv" id="cv">Convert</div>
        </div>
        <div id="toast"><div class="ai">AI</div><div><h4>Follow-up task created</h4><p>Call Asha Verma back today</p></div></div>
        <div id="ripple"></div>
        <svg id="cursor" viewBox="0 0 24 24"><path d="M4 2 L4 20 L9 15.5 L12.5 22.5 L15.5 21 L12 14 L19 14 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>
      </div>
    </div>
  </div>
</div>

<!-- 4. Close -->
<div class="scene" id="s4">
  <div id="s4t" class="abs title">Care that comes home.</div>
  <div id="s4l" class="abs">Careva<span class="plus">+</span> · Trusted home health care</div>
  <div id="s4f" class="abs">Nurses · Caretakers · Smart follow-ups · Book a home visit today</div>
</div>

<div id="sub"><span id="subt"></span></div>

<script>
const TL = __TL__;
const FPS = TL.fps, SC = TL.scenes;
const $ = (id) => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const eout = (x) => 1 - Math.pow(1 - clamp(x), 3);
const ease = (x) => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const back = (x) => { x = clamp(x); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
// Scene-local time of sentence i: its start, plus a share of its length, plus an offset in seconds.
const T = (k, i, off = 0, share = 0) => { const x = SC[k].sentences[i]; return x.start + share * (x.end - x.start) + off; };
function show(el, lt, tIn, dur = .45, dy = 26) {
  const k = eout((lt - tIn) / dur); el.style.opacity = k; el.style.transform = `translateY(${(1 - k) * dy}px)`; return k;
}
function pop(el, lt, tIn, dur = .35) {
  const k = back((lt - tIn) / dur); el.style.opacity = clamp((lt - tIn) / 0.12); el.style.transform = `scale(${lt < tIn ? 0 : k})`; return k;
}
function mix(c1, c2, k) {
  const h = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)), a = h(c1), b = h(c2);
  return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], k))).join(",")})`;
}

// Mascot layouts per scene: centre x, centre y, width in px.
const LAYOUT = [[540, 560, 520], [380, 740, 280], [380, 740, 280], [960, 360, 360]];
let CONV;
window.READY = document.fonts.ready.then(() => {
  const m = $("main").getBoundingClientRect(), c = $("cv").getBoundingClientRect();
  CONV = { x: c.left - m.left + c.width / 2, y: c.top - m.top + c.height / 2 };
  return true;
});

function sceneAt(t) { let k = 0; for (let i = 0; i < SC.length; i++) if (t >= SC[i].t0) k = i; return k; }

function mascot(t, f, k) {
  const lt = t - SC[k].t0;
  let L = LAYOUT[k];
  if (k > 0) { const p = ease((lt + 0.15) / 0.7); L = LAYOUT[k - 1].map((v, i) => lerp(v, L[i], p)); }
  const [x, y, w] = L, el = $("mascot");
  el.style.left = (x - w / 2) + "px"; el.style.top = (y - w * 0.45) + "px"; el.style.width = w + "px"; el.style.height = (w * 0.9) + "px";

  // Gentle float, plus a heartbeat pulse every 1.1 s.
  let by = -1.8 * Math.sin(2 * Math.PI * t / 1.1), jy = 0, sx = 1, sy = 1, aL = 0, aR = 0, sh = 1;
  const beat = (t % 1.1) / 1.1, pulse = 1 + 0.025 * Math.max(0, Math.sin(Math.PI * clamp(beat / 0.18)));
  sx = pulse; sy = pulse;
  const capTilt = 3 * Math.sin(2 * Math.PI * t / 1.1);
  const jump = (p) => { p = clamp(p); jy = -18 * Math.sin(Math.PI * p); sy = 1 + 0.07 * Math.sin(Math.PI * p); sx = 1 / sy; sh = 1 - 0.55 * Math.sin(Math.PI * p); by = 0; };

  if (k === 0 && lt < T(0, 1, 0.2, 1)) aR = -(35 + 22 * Math.sin(2 * Math.PI * 2.6 * lt));           // wave hello
  if (k === 1) { for (let i = 0; i < 2; i++) { const c = T(1, i, 0, 1); if (lt > c && lt < c + 0.45) { jump((lt - c) / 0.45); aL = 30; aR = -30; } } } // hop after each line
  if (k === 2) { const c = T(2, 1, 0.1); if (lt > c && lt < c + 1.6) { const a = 30 + 10 * Math.sin(2 * Math.PI * 3 * lt); aL = a; aR = -a; } } // cheer at the AI task
  if (k === 3) { const c = T(3, 1, 0.05, 1); if (lt > c) { const p = ((lt - c) % 0.55) / 0.55; jump(p); const a = 25 * Math.sin(2 * Math.PI * p); aL = a; aR = -a; } }

  $("body").setAttribute("transform", `translate(0 ${by + jy}) translate(50 74) scale(${sx} ${sy}) translate(-50 -74)`);
  $("shadow").setAttribute("transform", `translate(50 84) scale(${sh} 1) translate(-50 -84)`);
  $("cap").setAttribute("transform", `rotate(${capTilt} 50 15)`);
  $("armL").setAttribute("transform", `rotate(${aL} 12 38)`); $("armR").setAttribute("transform", `rotate(${aR} 88 38)`);
  const m = TL.mouth[f] || 0, mh = m === 0 ? 2 : 2 + m * 1.5;
  $("mouth").setAttribute("height", mh); $("mouth").setAttribute("y", 49 - mh / 2);
  const blink = ((t + 0.8) % 3.1) < 0.12, eh = blink ? 2 : 10, ey = blink ? 34 : 30;
  for (const id of ["eyeL", "eyeR"]) { $(id).setAttribute("height", eh); $(id).setAttribute("y", ey); }
}

function scene1(lt) {
  const b = $("bubble"), bi = back((lt - T(0, 0, -0.15)) / 0.4), bo = 1 - clamp((lt - T(0, 1, 0.1)) / 0.25);
  b.style.opacity = clamp(bi) * bo; b.style.transform = `scale(${0.6 + 0.4 * bi})`;
  show($("s1k"), lt, 0.05);
  const k = back((lt - T(0, 1, -0.1)) / 0.55);
  $("s1t").style.opacity = clamp((lt - T(0, 1, -0.1)) / 0.2); $("s1t").style.transform = `scale(${0.75 + 0.25 * k})`; $("s1t").style.transformOrigin = "0% 70%";
  show($("s1s"), lt, T(0, 2, -0.1), .5, 30);
  show($("ch1"), lt, T(0, 2, 0.1, 0.2), .4, 24);
  show($("ch2"), lt, T(0, 2, 0.1, 0.45), .4, 24);
  show($("ch3"), lt, T(0, 2, 0.1, 0.7), .4, 24);
}

function card(el, lt) {
  const k = eout((lt - 0.05) / 0.55);
  el.style.opacity = k; el.style.transform = `translateY(${(1 - k) * 60}px) scale(${0.97 + 0.03 * k})`;
}

function scene2(lt) {
  show($("s2k"), lt, 0.0); show($("s2t"), lt, 0.08, .5, 34); show($("s2c"), lt, 0.25);
  card($("c1"), lt);
  // Rows tick in time with the words: nurses, caretakers, safe, personal.
  const at = [T(1, 0, 0, 0.35), T(1, 0, 0, 0.7), T(1, 1, 0, 0.45), T(1, 1, 0, 0.75)];
  at.forEach((a, i) => {
    const r = $("r" + (i + 1)), h = eout((lt - a) / 0.3), fade = 1 - eout((lt - a - 1.1) / 0.5);
    r.style.background = `rgba(14,165,164,${0.08 * h * fade})`;
    r.style.margin = "0 -20px"; r.style.padding = "26px 20px"; r.style.borderRadius = "14px";
    pop($("k" + (i + 1)), lt, a + 0.05);
  });
}

function type(el, text, ph, lt, t0, cps = 16) {
  const n = Math.floor(clamp((lt - t0) * cps, 0, text.length));
  if (lt < t0) { el.textContent = ph; el.classList.add("ph"); el.style.borderColor = "#E3E9F2"; return false; }
  el.classList.remove("ph"); el.textContent = text.slice(0, n) + (n < text.length && Math.floor(lt * 4) % 2 ? "|" : "");
  el.style.borderColor = n < text.length ? "#2563EB" : "#E3E9F2";
  return n >= text.length;
}

function scene3(lt) {
  show($("s3k"), lt, 0.0); show($("s3t"), lt, 0.08, .5, 34); show($("s3c"), lt, 0.25);
  card($("c2"), lt);
  // Sentence 1: the enquiry is typed and saved.
  const t0 = T(2, 0, 0.05), nameDone = t0 + "Asha Verma".length / 18, phoneAt = nameDone + 0.1;
  const saved = phoneAt + "98765 43210".length / 22 + 0.15;
  if (lt < saved) { type($("iN"), "Asha Verma", "Name", lt, t0, 18); type($("iP"), "98765 43210", "Phone", lt, phoneAt, 22); }
  else { for (const [id, ph] of [["iN", "Name"], ["iP", "Phone"]]) { $(id).textContent = ph; $(id).classList.add("ph"); $(id).style.borderColor = "#E3E9F2"; } }
  $("sv").style.transform = lt > saved - 0.08 && lt < saved + 0.08 ? "scale(.92)" : "none";
  show($("ld"), lt, saved + 0.05, .4, 20);
  $("nL").textContent = lt > saved + 0.05 ? 1 : 0;
  // Sentence 2: the AI creates a follow-up task.
  const ta = T(2, 1, -0.05);
  const tk = show($("toast"), lt, ta, .45, 40);
  $("toast").style.transform += ` scale(${0.94 + 0.06 * tk})`;
  $("nT").textContent = lt > ta + 0.3 ? 1 : 0;
  // Sentence 3: the lead becomes a patient.
  const cIn = T(2, 2, -0.3), cAt = T(2, 2, 0.35), click = T(2, 2, 0.45);
  const cu = $("cursor"), p = ease((lt - cIn) / (cAt - cIn));
  cu.style.left = lerp(CONV.x + 200, CONV.x - 6, p) + "px"; cu.style.top = lerp(CONV.y + 250, CONV.y - 4, p) + "px";
  cu.style.opacity = clamp((lt - cIn) / 0.15) * (1 - clamp((lt - T(2, 2, 1.5)) / 0.3));
  const cv = $("cv"); cv.style.transform = lt > click && lt < click + 0.14 ? "scale(.92)" : "none";
  const done = lt > click + 0.05;
  cv.textContent = done ? "Converted ✓" : "Convert"; cv.style.color = done ? "#16A34A" : "#2563EB"; cv.style.borderColor = done ? "#16A34A" : "#2563EB";
  const st = $("lst"); st.textContent = done ? "Patient" : "New lead";
  st.style.background = done ? "#DCFCE7" : "#DBEAFE"; st.style.color = done ? "#15803D" : "#1D4ED8";
  $("nP").textContent = done ? 1 : 0;
  const rp = (lt - click) / 0.5, rip = $("ripple");
  rip.style.opacity = rp > 0 && rp < 1 ? 1 - rp : 0; const rs = 20 + 90 * eout(rp);
  Object.assign(rip.style, { width: rs + "px", height: rs + "px", left: (CONV.x - rs / 2) + "px", top: (CONV.y - rs / 2) + "px" });
}

function scene4(lt) {
  const t = $("s4t"), k = back((lt - T(3, 1, -0.1)) / 0.5);
  t.style.opacity = clamp((lt - T(3, 1, -0.1)) / 0.25); t.style.transform = `scale(${0.7 + 0.3 * k})`;
  show($("s4l"), lt, T(3, 0, -0.1));
  show($("s4f"), lt, T(3, 1, 0.4));
}

function subtitle(t) {
  let text = "", op = 0;
  TL.cues.forEach((c, i) => {
    const next = TL.cues[i + 1], end = next && next.a - c.b < 0.4 ? next.a : c.b + 0.25;
    if (t >= c.a - 0.05 && t < end) { text = c.text; op = 1; }
  });
  const s = $("subt"); s.textContent = text; s.style.opacity = op; s.style.display = text ? "inline-block" : "none";
}

window.render = (f) => {
  const t = f / FPS, k = sceneAt(t);
  SC.forEach((s, i) => {
    const fin = i === 0 ? 1 : clamp((t - (s.t0 - 0.2)) / 0.3);
    const fout = i === SC.length - 1 ? 1 : 1 - clamp((t - (s.t0 + s.dur - 0.25)) / 0.25);
    const el = $("s" + (i + 1)); el.style.opacity = fin * fout; el.style.visibility = fin * fout > 0 ? "visible" : "hidden";
  });
  mascot(t, f, k);
  scene1(t - SC[0].t0); scene2(t - SC[1].t0); scene3(t - SC[2].t0); scene4(t - SC[3].t0);
  subtitle(t);
  return f;
};
</script>
</body></html>
