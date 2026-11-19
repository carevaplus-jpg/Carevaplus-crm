<!doctype html>
<html><head><meta charset="utf-8"><title>Careva+ intro (Tamil)</title>
<style>
@font-face{font-family:"Noto Sans Tamil";src:url("__ASSETS__/fonts/noto-sans-tamil-tamil-400-normal.woff2") format("woff2");font-weight:400}
@font-face{font-family:"Noto Sans Tamil";src:url("__ASSETS__/fonts/noto-sans-tamil-tamil-600-normal.woff2") format("woff2");font-weight:600}
@font-face{font-family:"Noto Sans Tamil";src:url("__ASSETS__/fonts/noto-sans-tamil-tamil-700-normal.woff2") format("woff2");font-weight:700 900}
/* Careva+ light theme: navy text, royal blue, teal "plus", coral accent. */
:root{
  --bg:#F2F6FB; --fg:#0F1B3D; --muted:#5F6B85; --blue:#2563EB; --teal:#0EA5A4; --teal2:#0B8584;
  --coral:#F2557A; --coral2:#D93C63; --card:#FFFFFF; --line:#E3E9F2; --green:#16A34A; --navy:#111827;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1920px;height:1080px;overflow:hidden;background:var(--bg)}
body{font-family:Inter,"Noto Sans Tamil","Liberation Sans",Arial,sans-serif;color:var(--fg);position:relative;
  background:radial-gradient(1200px 800px at 28% 40%,#FFFFFF 0%,var(--bg) 70%)}
#dots{position:absolute;inset:0;background-image:radial-gradient(rgba(15,27,61,.07) 1.5px,transparent 1.6px);background-size:36px 36px}
.abs{position:absolute}
.scene{position:absolute;inset:0}
.ta{font-family:"Noto Sans Tamil",Inter,sans-serif}
.en{font-family:Inter,sans-serif}
#mark{left:64px;top:44px;display:flex;align-items:center;gap:12px;font-size:26px;font-weight:800;color:var(--fg);letter-spacing:.5px;z-index:6}
#mark i{width:30px;height:30px;border-radius:8px;background:var(--teal);color:#fff;font-style:normal;font-size:26px;font-weight:900;display:flex;align-items:center;justify-content:center}
#mark span{color:var(--muted);font-weight:600;font-size:22px;margin-left:6px}

/* The nurse photo glides between a layout per scene. */
#photo{position:absolute;z-index:4;overflow:hidden;background:#dfe7f1;border:10px solid #fff;box-shadow:0 30px 70px rgba(15,27,61,.22)}
#photo i{position:absolute;inset:0;background:url("__ASSETS__/images/nurse.jpg") center 22%/cover no-repeat;transform-origin:51% 30%}
#badge{position:absolute;z-index:5;display:flex;align-items:center;gap:14px;background:#fff;border-radius:18px;padding:14px 22px 14px 14px;box-shadow:0 14px 34px rgba(15,27,61,.16)}
#badge b{width:46px;height:46px;border-radius:12px;background:var(--green);color:#fff;font-size:28px;display:flex;align-items:center;justify-content:center}
#badge div{font-size:24px;font-weight:700;line-height:1.25}
#badge small{display:block;font-size:18px;color:var(--muted);font-weight:500}

.kicker{font-size:24px;font-weight:700;letter-spacing:3px;color:var(--teal2);text-transform:uppercase}
.title{font-weight:800;color:var(--fg);letter-spacing:-1px;line-height:1.12}
.plus{color:var(--teal)}
.sub{font-size:32px;font-weight:500;color:var(--muted)}
.crumb{display:inline-flex;align-items:center;gap:10px;font-size:26px;font-weight:600;color:var(--fg);background:#fff;border:1px solid var(--line);padding:10px 18px;border-radius:12px;box-shadow:0 4px 14px rgba(15,27,61,.06)}
.crumb b{color:var(--blue)}

/* 1 welcome */
#bubble{left:640px;top:150px;background:var(--fg);color:#fff;font-size:40px;font-weight:700;padding:14px 30px 18px;border-radius:18px;transform-origin:0% 100%;z-index:6}
#bubble:after{content:"";position:absolute;left:34px;bottom:-18px;border:18px solid transparent;border-top-color:var(--fg);border-bottom:0;border-left:0}
#s1k{left:900px;top:190px}
#s1t{left:892px;top:226px;font-size:168px;letter-spacing:-5px;line-height:1.1}
#s1s{left:900px;top:430px;font-size:46px;font-weight:700;color:var(--coral2)}
#s1e{left:902px;top:500px;font-size:30px;color:var(--muted);font-weight:500}
.chips{left:900px;top:580px;display:flex;flex-direction:column;gap:18px}
.chip{display:flex;align-items:center;gap:20px}
.chip span{width:58px;height:58px;border-radius:15px;background:var(--teal);color:#fff;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;flex:none}
.chip b{display:block;font-size:34px;font-weight:700;line-height:1.2}
.chip small{display:block;font-size:21px;color:var(--muted);font-weight:500}

/* 2 and 4: left column */
.lk{left:104px;top:190px}
.lt{left:100px;top:236px;width:660px}
.lt .tt{font-size:56px;font-weight:800;line-height:1.28;letter-spacing:0}
.lt .le{margin-top:14px;font-size:30px;color:var(--muted);font-weight:600}
.lc{left:104px;top:470px}

/* cards */
.card{left:800px;top:120px;width:1020px;background:var(--card);color:var(--fg);border-radius:24px;border:1px solid var(--line);box-shadow:0 24px 70px rgba(15,27,61,.14);overflow:hidden}
.head{display:flex;align-items:center;justify-content:space-between;padding:24px 44px;border-bottom:1px solid var(--line);font-size:26px;color:var(--muted)}
.head b{color:var(--fg);font-weight:700}
.body{padding:10px 44px 26px}
.row{display:flex;align-items:center;gap:28px;padding:22px 20px;margin:0 -20px;border-radius:14px}
.row+.row{border-top:1px solid var(--line)}
.ico{width:72px;height:72px;border-radius:20px;background:#E8F7F7;color:var(--teal2);font-size:38px;font-weight:900;display:flex;align-items:center;justify-content:center;flex:none}
.row h4{font-size:32px;font-weight:700;line-height:1.25}
.row p{font-size:22px;color:var(--muted);margin-top:4px}
.tick{margin-left:auto;width:56px;height:56px;border-radius:50%;background:var(--green);color:#fff;font-size:34px;font-weight:900;display:flex;align-items:center;justify-content:center;flex:none}

/* 3 promise */
#s3k{left:200px;top:170px}
.val{left:200px;display:flex;align-items:flex-start;gap:28px}
.val .n{font-size:22px;font-weight:700;color:var(--teal2);letter-spacing:2px;width:40px;margin-top:44px}
.val b{display:block;font-size:92px;font-weight:700;line-height:1.2;color:var(--fg)}
.val small{display:block;font-size:28px;color:var(--muted);font-weight:600;margin-top:-6px}
#v1{top:215px} #v2{top:390px} #v3{top:565px}
#vbar{left:190px;width:4px;border-radius:2px;background:var(--teal)}
#s3p{left:200px;top:760px;display:flex;align-items:center;gap:16px;font-size:36px;font-weight:700;color:var(--coral2)}
#s3p span{font-size:24px;color:var(--muted);font-weight:600}

/* 4: CRM mock */
#crm{display:flex;height:690px;padding:0}
#side{width:230px;background:var(--navy);color:#C7CEDB;padding:28px 22px;font-size:22px;flex:none}
#side h5{color:#fff;font-size:26px;font-weight:800;margin-bottom:26px;letter-spacing:.5px}
#side h5 em{font-style:normal;color:#E8A93A}
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

/* 5 close */
#s5t{left:0;width:1920px;top:470px;text-align:center;font-size:150px;letter-spacing:-4px;line-height:1.1}
#s5s{left:0;width:1920px;top:654px;text-align:center;font-size:52px;font-weight:700;color:var(--coral2)}
#s5e{left:0;width:1920px;top:732px;text-align:center;font-size:30px;font-weight:500;color:var(--muted)}
#s5c{left:0;width:1920px;top:790px;display:flex;justify-content:center}
#s5c span{display:flex;align-items:center;gap:14px;background:var(--blue);color:#fff;font-size:30px;font-weight:700;padding:14px 34px 16px;border-radius:999px;box-shadow:0 14px 34px rgba(37,99,235,.3)}
#s5c small{font-family:Inter,sans-serif;font-size:22px;font-weight:600;opacity:.85}

#sub{position:absolute;left:0;width:1920px;bottom:52px;display:flex;justify-content:center;z-index:10}
#sub span{max-width:1560px;text-align:center;font-family:"Noto Sans Tamil",Inter,sans-serif;font-size:40px;font-weight:600;line-height:1.4;color:#fff;background:rgba(15,27,61,.88);padding:8px 30px 12px;border-radius:14px;white-space:pre-line}
</style></head>
<body>
<div id="dots"></div>
<div id="mark" class="abs"><i>+</i>CAREVA+<span>Home health care</span></div>

<div id="photo"><i></i></div>
<div id="badge"><b>✓</b><div class="ta">பயிற்சி பெற்ற செவிலியர்<small class="en">Trained home nurse</small></div></div>

<!-- 1. Welcome -->
<div class="scene" id="s1">
  <div id="bubble" class="abs ta">வணக்கம்!</div>
  <div id="s1k" class="abs kicker">Trusted home health care</div>
  <div id="s1t" class="abs title">Careva<span class="plus">+</span></div>
  <div id="s1s" class="abs ta">நம்பகமான வீட்டு மருத்துவ சேவை</div>
  <div id="s1e" class="abs">Care that comes home.</div>
  <div class="abs chips">
    <div class="chip" id="ch1"><span>+</span><div><b class="ta">பயிற்சி பெற்ற செவிலியர்கள்</b><small>Trained nurses</small></div></div>
    <div class="chip" id="ch2"><span>+</span><div><b class="ta">வீட்டு பராமரிப்பாளர்கள்</b><small>Caretakers at home</small></div></div>
    <div class="chip" id="ch3"><span>+</span><div><b class="ta">ஸ்மார்ட் AI CRM</b><small>Quick response, organised follow-ups</small></div></div>
  </div>
</div>

<!-- 2. Care at home -->
<div class="scene" id="s2">
  <div class="abs kicker lk" id="s2k"><span class="ta">எங்கள் குழு</span> · Our care team</div>
  <div class="abs lt" id="s2t"><div class="tt ta">உங்கள் வீட்டு வாசலில் கவனிப்பு</div><div class="le">Care at your door</div></div>
  <div class="abs card" id="c1">
    <div class="head"><span>Careva+&nbsp;&nbsp;›&nbsp;&nbsp;<b>Care team</b></span><span>Home visit</span></div>
    <div class="body">
      <div class="row" id="r1"><div class="ico">+</div><div><h4 class="ta">பயிற்சி பெற்ற செவிலியர்கள்</h4><p>Trained nurses · medical support at home</p></div><div class="tick" id="k1">✓</div></div>
      <div class="row" id="r2"><div class="ico">+</div><div><h4 class="ta">பராமரிப்பாளர்கள்</h4><p>Caretakers · daily help and comfort</p></div><div class="tick" id="k2">✓</div></div>
      <div class="row" id="r3"><div class="ico">+</div><div><h4 class="ta">நோயாளி பாதுகாப்பு</h4><p>Patient safety first, on every visit</p></div><div class="tick" id="k3">✓</div></div>
      <div class="row" id="r4"><div class="ico">+</div><div><h4 class="ta">தனிப்பட்ட கவனிப்பு</h4><p>A personal care plan for each patient</p></div><div class="tick" id="k4">✓</div></div>
    </div>
  </div>
</div>

<!-- 3. Our promise -->
<div class="scene" id="s3">
  <div id="s3k" class="abs kicker"><span class="ta">எங்கள் வாக்குறுதி</span> · Our promise</div>
  <div id="v1" class="abs val"><span class="n">01</span><div><b class="ta">அன்பு</b><small>Compassion</small></div></div>
  <div id="v2" class="abs val"><span class="n">02</span><div><b class="ta">நம்பிக்கை</b><small>Trust</small></div></div>
  <div id="v3" class="abs val"><span class="n">03</span><div><b class="ta">தொழில்முறை</b><small>Professional care</small></div></div>
  <div id="vbar" class="abs"></div>
  <div id="s3p" class="abs"><span class="plus" style="font-size:44px">+</span><div class="ta">இதுவே எங்கள் வாக்குறுதி</div><span>· This is our promise</span></div>
</div>

<!-- 4. Smart CRM -->
<div class="scene" id="s4">
  <div class="abs kicker lk" id="s4k"><span class="ta">ஸ்மார்ட்</span> AI CRM</div>
  <div class="abs lt" id="s4t"><div class="tt ta">ஒவ்வொரு விசாரணையும் உடனே பதிவு</div><div class="le">Every enquiry, logged instantly</div></div>
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
          <div class="av">LS</div>
          <div><h4>Lakshmi Sundaram</h4><p>Enquiry · home nursing</p></div>
          <div class="st" id="lst">New lead</div>
          <div class="conv" id="cv">Convert</div>
        </div>
        <div id="toast"><div class="ai">AI</div><div><h4>Follow-up task created</h4><p>Call Lakshmi Sundaram back today</p></div></div>
        <div id="ripple"></div>
        <svg id="cursor" viewBox="0 0 24 24"><path d="M4 2 L4 20 L9 15.5 L12.5 22.5 L15.5 21 L12 14 L19 14 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>
      </div>
    </div>
  </div>
</div>

<!-- 5. Close -->
<div class="scene" id="s5">
  <div id="s5t" class="abs title">Careva<span class="plus">+</span></div>
  <div id="s5s" class="abs ta">அன்பான கவனிப்பு, உங்கள் வீட்டிலேயே.</div>
  <div id="s5e" class="abs">Care that comes home.</div>
  <div id="s5c" class="abs"><span><b class="ta">இன்றே முன்பதிவு செய்யுங்கள்</b><small>· Book a home visit today</small></span></div>
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
const back = (x) => { x = clamp(x); const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
// Scene-local time of sentence i: its start, plus a share of its length, plus an offset in seconds.
const T = (k, i, off = 0, share = 0) => { const x = SC[k].sentences[i]; return x.start + share * (x.end - x.start) + off; };
function show(el, lt, tIn, dur = .5, dy = 26) {
  const k = eout((lt - tIn) / dur); el.style.opacity = k; el.style.transform = `translateY(${(1 - k) * dy}px)`; return k;
}
function pop(el, lt, tIn, dur = .35) {
  const k = back((lt - tIn) / dur); el.style.opacity = clamp((lt - tIn) / 0.12); el.style.transform = `scale(${lt < tIn ? 0 : k})`; return k;
}

// Photo layout per scene: x, y, width, height, corner radius (a circle when radius = width / 2).
const PHOTO = [[150, 130, 610, 790, 40], [210, 600, 270, 270, 135], [1240, 150, 520, 690, 260], [210, 600, 270, 270, 135], [810, 120, 300, 300, 150]];
let CONV;
window.READY = document.fonts.ready.then(() => {
  const img = new Image(); img.src = "__ASSETS__/images/nurse.jpg";
  return img.decode().then(() => {
    const m = $("main").getBoundingClientRect(), c = $("cv").getBoundingClientRect();
    CONV = { x: c.left - m.left + c.width / 2, y: c.top - m.top + c.height / 2 };
    return true;
  });
});

function sceneAt(t) { let k = 0; for (let i = 0; i < SC.length; i++) if (t >= SC[i].t0) k = i; return k; }

function photo(t, k) {
  const lt = t - SC[k].t0;
  let L = PHOTO[k];
  if (k > 0) { const p = ease((lt + 0.25) / 0.9); L = PHOTO[k - 1].map((v, i) => lerp(v, L[i], p)); }
  const [x, y, w, h, r] = L, el = $("photo"), bob = 4 * Math.sin(2 * Math.PI * t / 4.2);
  Object.assign(el.style, { left: x + "px", top: (y + bob) + "px", width: w + "px", height: h + "px", borderRadius: r + "px" });
  el.style.borderWidth = (w > 400 ? 12 : 8) + "px";
  // Entrance at the very start, and a slow push-in (Ken Burns) throughout.
  const inK = eout(t / 0.9);
  el.style.opacity = inK; el.style.transform = `translateY(${(1 - inK) * 40}px)`;
  el.querySelector("i").style.transform = `scale(${1.04 + 0.05 * ((t % 12) / 12)})`;
  // Badge rides on the photo in the first scene only.
  const b = $("badge"), bk = k === 0 ? eout((lt - T(0, 1, 0)) / .5) * (1 - clamp((lt - (SC[0].dur - 0.4)) / .3)) : 0;
  b.style.left = (x + w - 300) + "px"; b.style.top = (y + h - 70 + bob) + "px";
  b.style.opacity = bk; b.style.transform = `translateY(${(1 - bk) * 20}px)`;
}

function scene1(lt) {
  const b = $("bubble"), bi = back((lt - T(0, 0, -0.15)) / 0.4), bo = 1 - clamp((lt - T(0, 1, 0.3)) / 0.3);
  b.style.opacity = clamp(bi) * bo; b.style.transform = `scale(${0.6 + 0.4 * bi})`;
  show($("s1k"), lt, 0.15);
  const k = back((lt - T(0, 1, -0.1)) / 0.55);
  $("s1t").style.opacity = clamp((lt - T(0, 1, -0.1)) / 0.2); $("s1t").style.transform = `scale(${0.8 + 0.2 * k})`; $("s1t").style.transformOrigin = "0% 70%";
  show($("s1s"), lt, T(0, 2, -0.1), .5, 30);
  show($("s1e"), lt, T(0, 2, 0.15), .5, 20);
  show($("ch1"), lt, T(0, 2, 0.1, 0.3), .45, 24);
  show($("ch2"), lt, T(0, 2, 0.1, 0.55), .45, 24);
  show($("ch3"), lt, T(0, 2, 0.1, 0.8), .45, 24);
}

function card(el, lt) {
  const k = eout((lt - 0.05) / 0.6);
  el.style.opacity = k; el.style.transform = `translateY(${(1 - k) * 60}px) scale(${0.97 + 0.03 * k})`;
}

function scene2(lt) {
  show($("s2k"), lt, 0.0); show($("s2t"), lt, 0.08, .55, 34);
  card($("c1"), lt);
  const at = [T(1, 0, 0, 0.12), T(1, 0, 0, 0.42), T(1, 1, 0, 0.35), T(1, 1, 0, 0.7)];
  at.forEach((a, i) => {
    const r = $("r" + (i + 1)), h = eout((lt - a) / 0.3), fade = 1 - eout((lt - a - 1.2) / 0.5);
    r.style.background = `rgba(14,165,164,${0.09 * h * fade})`;
    pop($("k" + (i + 1)), lt, a + 0.05);
  });
}

function scene3(lt) {
  show($("s3k"), lt, 0.0);
  const at = [0, 1, 2].map((i) => T(2, i, -0.15));
  const active = at.filter((a) => lt >= a).length - 1;
  ["v1", "v2", "v3"].forEach((id, i) => {
    show($(id), lt, at[i], .5, 40);
    const dim = active > i ? eout((lt - at[i + 1]) / .5) : 0;
    $(id).style.opacity = parseFloat($(id).style.opacity) * (1 - 0.55 * dim);
  });
  const v = $("vbar"), tops = [215, 390, 565].map((y) => y + 20), H = 120;
  if (active < 0) v.style.height = "0px";
  else {
    const k = ease((lt - at[active]) / .5), prev = Math.max(0, active - 1);
    const y = active === 0 ? tops[0] : lerp(tops[prev], tops[active], k), h = active === 0 ? H * eout((lt - at[0]) / .6) : H;
    Object.assign(v.style, { top: y + "px", height: h + "px" });
  }
  show($("s3p"), lt, T(2, 3, -0.15), .55, 24);
}

function type(el, text, ph, lt, t0, cps = 16) {
  const n = Math.floor(clamp((lt - t0) * cps, 0, text.length));
  if (lt < t0) { el.textContent = ph; el.classList.add("ph"); el.style.borderColor = "#E3E9F2"; return false; }
  el.classList.remove("ph"); el.textContent = text.slice(0, n) + (n < text.length && Math.floor(lt * 4) % 2 ? "|" : "");
  el.style.borderColor = n < text.length ? "#2563EB" : "#E3E9F2";
  return n >= text.length;
}

function scene4(lt) {
  show($("s4k"), lt, 0.0); show($("s4t"), lt, 0.08, .55, 34);
  card($("c2"), lt);
  const NAME = "Lakshmi Sundaram", PHONE = "98400 12345";
  const t0 = T(3, 0, 0.1), phoneAt = t0 + NAME.length / 18 + 0.1, saved = phoneAt + PHONE.length / 22 + 0.2;
  if (lt < saved) { type($("iN"), NAME, "Name", lt, t0, 18); type($("iP"), PHONE, "Phone", lt, phoneAt, 22); }
  else { for (const [id, ph] of [["iN", "Name"], ["iP", "Phone"]]) { $(id).textContent = ph; $(id).classList.add("ph"); $(id).style.borderColor = "#E3E9F2"; } }
  $("sv").style.transform = lt > saved - 0.08 && lt < saved + 0.08 ? "scale(.92)" : "none";
  show($("ld"), lt, saved + 0.05, .4, 20);
  $("nL").textContent = lt > saved + 0.05 ? 1 : 0;
  const ta = T(3, 1, -0.05), tk = show($("toast"), lt, ta, .45, 40);
  $("toast").style.transform += ` scale(${0.94 + 0.06 * tk})`;
  $("nT").textContent = lt > ta + 0.3 ? 1 : 0;
  const cIn = T(3, 2, -0.3), cAt = T(3, 2, 0.4), click = T(3, 2, 0.5);
  const cu = $("cursor"), p = ease((lt - cIn) / (cAt - cIn));
  cu.style.left = lerp(CONV.x + 200, CONV.x - 6, p) + "px"; cu.style.top = lerp(CONV.y + 250, CONV.y - 4, p) + "px";
  cu.style.opacity = clamp((lt - cIn) / 0.15) * (1 - clamp((lt - T(3, 2, 1.6)) / 0.3));
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

function scene5(lt) {
  const t = $("s5t"), k = back((lt - T(4, 0, -0.15)) / 0.55);
  t.style.opacity = clamp((lt - T(4, 0, -0.15)) / 0.25); t.style.transform = `scale(${0.8 + 0.2 * k})`;
  show($("s5s"), lt, T(4, 1, -0.1), .55, 26);
  show($("s5e"), lt, T(4, 1, 0.3), .5, 18);
  const c = $("s5c"), ck = back((lt - T(4, 2, -0.1)) / .5);
  c.style.opacity = clamp((lt - T(4, 2, -0.1)) / .2); c.style.transform = `scale(${0.85 + 0.15 * ck})`;
}

function subtitle(t) {
  let text = "", op = 0;
  TL.cues.forEach((c, i) => {
    const next = TL.cues[i + 1], end = next && next.a - c.b < 0.4 ? next.a : c.b + 0.25;
    if (t >= c.a - 0.05 && t < end) { text = c.text; op = 1; }
  });
  const s = $("subt"); s.textContent = text; s.style.opacity = op; s.style.display = text ? "inline-block" : "none";
}

const SCENES = [scene1, scene2, scene3, scene4, scene5];
window.render = (f) => {
  const t = f / FPS, k = sceneAt(t);
  SC.forEach((s, i) => {
    const fin = i === 0 ? 1 : clamp((t - (s.t0 - 0.2)) / 0.3);
    const fout = i === SC.length - 1 ? 1 : 1 - clamp((t - (s.t0 + s.dur - 0.25)) / 0.25);
    const el = $("s" + (i + 1)), op = fin * fout;
    el.style.opacity = op; el.style.visibility = op > 0 ? "visible" : "hidden";
    if (op > 0) SCENES[i](t - s.t0);
  });
  photo(t, k);
  subtitle(t);
  return f;
};
</script>
</body></html>
