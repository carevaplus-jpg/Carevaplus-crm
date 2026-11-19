<!doctype html>
<html><head><meta charset="utf-8"><title>Careva+ brand film</title>
<style>
@font-face{font-family:"Instrument Serif";src:url("__ASSETS__/fonts/instrument-serif-latin-400-normal.woff2") format("woff2");font-style:normal;font-weight:400}
@font-face{font-family:"Instrument Serif";src:url("__ASSETS__/fonts/instrument-serif-latin-400-italic.woff2") format("woff2");font-style:italic;font-weight:400}
:root{
  --bg:#0B1430; --bg2:#13204A; --ink:#F3EFE7; --mute:rgba(243,239,231,.62); --faint:rgba(243,239,231,.16);
  --teal:#2FB8B0; --teal2:#5FD3CB; --coral:#F2557A;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1920px;height:1080px;overflow:hidden;background:var(--bg)}
body{font-family:Inter,"Liberation Sans",Arial,sans-serif;color:var(--ink);position:relative;-webkit-font-smoothing:antialiased}
.serif{font-family:"Instrument Serif",Georgia,serif;font-weight:400;letter-spacing:-.01em}
em{font-style:italic;color:var(--teal2)}
.abs{position:absolute}

#bg{position:absolute;inset:0;background:radial-gradient(1400px 900px at 50% 45%,var(--bg2) 0%,var(--bg) 62%,#070D22 100%)}
.glow{position:absolute;border-radius:50%}
#g1{width:1400px;height:1400px;background:radial-gradient(closest-side,rgba(47,184,176,.20),rgba(47,184,176,.08) 45%,rgba(47,184,176,0) 100%)}
#g2{width:1100px;height:1100px;background:radial-gradient(closest-side,rgba(242,85,122,.10),rgba(242,85,122,.035) 45%,rgba(242,85,122,0) 100%)}
#grain{position:absolute;inset:-64px;opacity:.035;background-repeat:repeat;background-size:256px 256px;pointer-events:none;z-index:20}
#vig{position:absolute;inset:0;background:radial-gradient(1300px 820px at 50% 50%,transparent 55%,rgba(3,6,18,.55) 100%);z-index:19;pointer-events:none}
#stage{position:absolute;inset:0;transform-origin:50% 50%}
.scene{position:absolute;inset:0;visibility:hidden}

/* masked line reveal */
.ln{display:block;overflow:hidden;padding:0 .08em .12em;margin:0 -.08em -.12em}
.ln>span{display:inline-block;will-change:transform}
.kicker{font-size:22px;font-weight:600;letter-spacing:.34em;color:var(--teal2);text-transform:uppercase}
.rule{height:2px;background:var(--teal);transform-origin:0 50%}
.sup{font-size:30px;line-height:1.45;color:var(--mute);font-weight:400}

/* 1 hook */
#s1t{left:0;width:1920px;top:730px;text-align:center;font-size:118px;line-height:1.02}
#plus1{left:932px;top:520px;width:56px;height:56px}

/* 2 who */
#s2rule{left:184px;top:318px;width:120px}
#s2k{left:184px;top:350px}
#s2t{left:176px;top:400px;font-size:132px;line-height:1.0}
#s2s{left:184px;top:690px;width:620px}
#ring{left:1080px;top:200px;width:640px;height:640px}

/* 3 values */
.val{left:620px;font-size:168px;line-height:1}
.num{left:510px;font-size:20px;font-weight:600;letter-spacing:.2em;color:var(--teal2)}
#v1{top:236px} #v2{top:426px} #v3{top:616px}
#n1{top:300px} #n2{top:490px} #n3{top:680px}
#vline{width:3px;border-radius:2px;background:var(--teal);top:0;left:584px}

/* 4 personal */
#s4t{left:0;width:1920px;top:150px;text-align:center;font-size:104px;line-height:1}
#s4rule{left:900px;top:300px;width:120px}
.card{top:390px;width:440px;height:400px;border-radius:28px;padding:44px 40px;
  background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.025));border:1px solid rgba(255,255,255,.11);
  box-shadow:0 30px 80px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.08)}
#cd1{left:252px} #cd2{left:740px} #cd3{left:1228px}
.card svg{width:84px;height:84px;display:block;overflow:visible}
.card .no{position:absolute;right:38px;top:44px;font-size:18px;letter-spacing:.2em;color:var(--mute);font-weight:600}
.card h3{font-size:64px;margin-top:40px;line-height:1}
.card p{font-size:25px;line-height:1.45;color:var(--mute);margin-top:16px}
.ic{fill:none;stroke:var(--teal2);stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}

/* 5 crm */
#s5rule{left:184px;top:298px;width:120px}
#s5k{left:184px;top:330px}
#s5t{left:176px;top:380px;font-size:98px;line-height:1.04}
#s5s{left:184px;top:640px;width:700px}
#panel{left:1080px;top:200px;width:660px;height:640px;border-radius:32px;padding:44px 48px;
  background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.025));border:1px solid rgba(255,255,255,.12);
  box-shadow:0 40px 100px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.09)}
#panel .hd{display:flex;justify-content:space-between;align-items:center;font-size:22px;color:var(--mute);letter-spacing:.06em;padding-bottom:26px;border-bottom:1px solid rgba(255,255,255,.09)}
#panel .hd b{color:var(--ink);font-weight:600;letter-spacing:.02em;font-size:26px}
#live{display:flex;align-items:center;gap:10px;font-size:18px;letter-spacing:.2em;font-weight:600;color:var(--teal2)}
#live i{width:10px;height:10px;border-radius:50%;background:var(--teal2);display:block}
#steps{position:relative;margin-top:30px}
.step{position:relative;height:118px;padding-left:76px}
.step h4{font-size:30px;font-weight:600;padding-top:4px}
.step p{font-size:21px;color:var(--mute);margin-top:6px}
.node{position:absolute;left:8px;top:6px;width:30px;height:30px;border-radius:50%;border:2px solid rgba(255,255,255,.22);background:var(--bg)}
.node b{position:absolute;inset:-2px;border-radius:50%;background:var(--teal);display:flex;align-items:center;justify-content:center}
.node svg{width:16px;height:16px}
#track{position:absolute;left:22px;top:38px;width:2px;height:354px;background:rgba(255,255,255,.10)}
#trackOn{position:absolute;left:22px;top:38px;width:2px;background:var(--teal);transform-origin:50% 0}

/* 6 end card */
#mark{left:900px;top:300px;width:120px;height:120px}
#word{left:0;width:1920px;top:470px;text-align:center;font-size:150px;line-height:1}
#word .w{background:linear-gradient(100deg,var(--ink) 0%,var(--ink) 42%,#FFFFFF 50%,var(--ink) 58%,var(--ink) 100%);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent}
#word .p{color:var(--teal)}
#tag{left:0;width:1920px;top:648px;text-align:center;font-size:52px;color:var(--mute)}
#s6rule{left:900px;top:742px;width:120px}
#cta{left:0;width:1920px;top:782px;display:flex;justify-content:center}
#cta span{font-size:20px;font-weight:600;letter-spacing:.3em;color:var(--ink);border:1px solid rgba(47,184,176,.7);border-radius:999px;padding:18px 34px 18px 40px}
</style></head>
<body>
<div id="bg"></div>
<div id="g1" class="glow"></div>
<div id="g2" class="glow"></div>

<div id="stage">

<!-- 1. Hook: heartbeat becomes home -->
<div class="scene" id="s1">
  <svg class="abs" style="left:0;top:0" width="1920" height="1080" viewBox="0 0 1920 1080">
    <defs>
      <clipPath id="clip1"><rect id="clipR" x="-20" y="0" width="0" height="1080"/></clipPath>
      <linearGradient id="fadeL" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#2FB8B0" stop-opacity="0"/><stop offset=".22" stop-color="#2FB8B0"/>
        <stop offset=".78" stop-color="#2FB8B0"/><stop offset="1" stop-color="#2FB8B0" stop-opacity="0"/>
      </linearGradient>
      <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
    </defs>
    <g clip-path="url(#clip1)">
      <path id="hb" d="M -10 620 H 640 L 670 620 L 692 570 L 718 680 L 748 490 L 776 650 L 796 620 H 860 V 500 L 960 410 L 1060 500 V 620 H 1930"
        fill="none" stroke="url(#fadeL)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M -10 620 H 640 L 670 620 L 692 570 L 718 680 L 748 490 L 776 650 L 796 620 H 860 V 500 L 960 410 L 1060 500 V 620 H 1930"
        fill="none" stroke="#2FB8B0" stroke-width="8" opacity=".35" filter="url(#soft)" stroke-linejoin="round"/>
    </g>
    <circle id="head" r="7" fill="#BFF3EE"/>
    <circle id="headG" r="26" fill="#2FB8B0" opacity=".45" filter="url(#soft)"/>
  </svg>
  <svg id="plus1" class="abs" viewBox="0 0 56 56">
    <circle cx="28" cy="28" r="26" fill="#2FB8B0" opacity=".18"/>
    <rect x="24" y="12" width="8" height="32" rx="4" fill="#5FD3CB"/><rect x="12" y="24" width="32" height="8" rx="4" fill="#5FD3CB"/>
  </svg>
  <div id="s1t" class="abs serif"><span class="ln"><span>Healing feels different</span></span><span class="ln"><span>at <em>home.</em></span></span></div>
</div>

<!-- 2. Who we are -->
<div class="scene" id="s2">
  <div id="s2rule" class="abs rule"></div>
  <div id="s2k" class="abs kicker"><span class="ln"><span>Careva+&nbsp;&nbsp;·&nbsp;&nbsp;Home health care</span></span></div>
  <div id="s2t" class="abs serif"><span class="ln"><span>Trained nurses.</span></span><span class="ln"><span><em>Caring hands.</em></span></span></div>
  <div id="s2s" class="abs sup"><span class="ln"><span>Professional medical support,</span></span><span class="ln"><span>delivered to your door.</span></span></div>
  <svg id="ring" class="abs" viewBox="-320 -320 640 640">
    <circle r="250" fill="none" stroke="rgba(243,239,231,.10)" stroke-width="1.5"/>
    <circle id="arc" r="250" fill="none" stroke="#2FB8B0" stroke-width="2.5" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" transform="rotate(-90)"/>
    <circle id="arcDot" r="6" fill="#BFF3EE"/>
    <g id="steth" fill="none" stroke="#F3EFE7" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" transform="translate(-35 -10)">
      <path class="d" pathLength="1" d="M -70 -150 C -78 -95 -72 -40 -30 0 C -14 14 -4 26 0 44"/>
      <path class="d" pathLength="1" d="M 70 -150 C 78 -95 72 -40 30 0 C 14 14 4 26 0 44"/>
      <path class="d" pathLength="1" d="M -82 -150 H -58 M 58 -150 H 82"/>
      <path class="d" pathLength="1" d="M 0 44 C 0 120 40 160 95 160 C 148 160 170 120 170 86"/>
      <circle class="d" pathLength="1" cx="170" cy="60" r="26"/>
      <circle class="d" pathLength="1" cx="170" cy="60" r="11" stroke="#5FD3CB"/>
    </g>
  </svg>
</div>

<!-- 3. Values -->
<div class="scene" id="s3">
  <div id="n1" class="abs num">01</div><div id="n2" class="abs num">02</div><div id="n3" class="abs num">03</div>
  <div id="v1" class="abs serif val"><span class="ln"><span>Compassionate.</span></span></div>
  <div id="v2" class="abs serif val"><span class="ln"><span>Reliable.</span></span></div>
  <div id="v3" class="abs serif val"><span class="ln"><span><em>Professional.</em></span></span></div>
  <div id="vline" class="abs"></div>
</div>

<!-- 4. Personal care -->
<div class="scene" id="s4">
  <div id="s4t" class="abs serif"><span class="ln"><span>Care built around <em>one person.</em></span></span></div>
  <div id="s4rule" class="abs rule"></div>
  <div class="abs card" id="cd1"><div class="no">01</div>
    <svg viewBox="0 0 80 80"><path class="ic dr" pathLength="1" d="M40 66 C 18 52 9 39 9 28 C 9 19 16 12 25 12 C 31 12 37 15 40 21 C 43 15 49 12 55 12 C 64 12 71 19 71 28 C 71 39 62 52 40 66 Z"/></svg>
    <h3 class="serif">Comfort</h3><p>At ease in the home<br>they know and love.</p></div>
  <div class="abs card" id="cd2"><div class="no">02</div>
    <svg viewBox="0 0 80 80"><path class="ic dr" pathLength="1" d="M40 9 L65 18 V38 C65 55 54 65 40 71 C26 65 15 55 15 38 V18 Z"/><path class="ic dr" pathLength="1" d="M28 40 L37 49 L53 32"/></svg>
    <h3 class="serif">Safety</h3><p>Careful, trained hands<br>on every visit.</p></div>
  <div class="abs card" id="cd3"><div class="no">03</div>
    <svg viewBox="0 0 80 80"><circle class="ic dr" pathLength="1" cx="40" cy="40" r="29" transform="rotate(-90 40 40)"/><path class="ic dr" pathLength="1" d="M40 23 V40 L52 48"/></svg>
    <h3 class="serif">Routine</h3><p>A personal plan that<br>fits their day.</p></div>
</div>

<!-- 5. Smart AI CRM -->
<div class="scene" id="s5">
  <div id="s5rule" class="abs rule"></div>
  <div id="s5k" class="abs kicker"><span class="ln"><span>Smart AI CRM</span></span></div>
  <div id="s5t" class="abs serif"><span class="ln"><span>Every enquiry answered.</span></span><span class="ln"><span>Every follow-up, <em>on time.</em></span></span></div>
  <div id="s5s" class="abs sup"><span class="ln"><span>Quiet technology behind every visit,</span></span><span class="ln"><span>so families are never left waiting.</span></span></div>
  <div id="panel" class="abs">
    <div class="hd"><b>Care timeline</b><span id="live"><i></i>LIVE</span></div>
    <div id="steps">
      <div id="track"></div><div id="trackOn"></div>
      <div class="step" id="st1"><div class="node"><b></b></div><h4>Enquiry received</h4><p>Logged the moment a family calls</p></div>
      <div class="step" id="st2"><div class="node"><b></b></div><h4>Call back scheduled</h4><p>A coordinator responds quickly</p></div>
      <div class="step" id="st3"><div class="node"><b></b></div><h4>Nurse assigned</h4><p>Matched to the care plan</p></div>
      <div class="step" id="st4"><div class="node"><b></b></div><h4>Follow-up on track</h4><p>Reminders set automatically</p></div>
    </div>
  </div>
</div>

<!-- 6. End card -->
<div class="scene" id="s6">
  <svg id="mark" class="abs" viewBox="0 0 120 120">
    <rect id="markFill" x="4" y="4" width="112" height="112" rx="30" fill="#2FB8B0"/>
    <rect id="markLine" x="4" y="4" width="112" height="112" rx="30" fill="none" stroke="#5FD3CB" stroke-width="3" pathLength="1"/>
    <g id="markPlus"><rect x="52" y="30" width="16" height="60" rx="8" fill="#F3EFE7"/><rect x="30" y="52" width="60" height="16" rx="8" fill="#F3EFE7"/></g>
  </svg>
  <div id="word" class="abs serif"><span class="w">Careva</span><span class="p">+</span></div>
  <div id="tag" class="abs serif"><span class="ln"><span><em style="color:inherit">Care that comes home.</em></span></span></div>
  <div id="s6rule" class="abs rule"></div>
  <div id="cta" class="abs"><span>BOOK A HOME VISIT</span></div>
</div>

</div>
<div id="vig"></div>
<div id="grain"></div>

<script>
const TL = __TL__;
const FPS = TL.fps, SC = TL.scenes;
const $ = (id) => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
// Easing family: expo-out to arrive, expo-in to leave, sine in-out for moves.
const eOut = (x) => { x = clamp(x); return x === 1 ? 1 : 1 - Math.pow(2, -10 * x); };
const eIn = (x) => { x = clamp(x); return x === 0 ? 0 : Math.pow(2, 10 * x - 10); };
const eIO = (x) => { x = clamp(x); return -(Math.cos(Math.PI * x) - 1) / 2; };
const T = (k, i, off = 0, share = 0) => { const x = SC[k].sentences[i]; return x.start + share * (x.end - x.start) + off; };

// Masked reveal: each line rises out of its own mask, staggered.
function lines(el, lt, tIn, dur = .9, stagger = .09) {
  el.querySelectorAll(".ln>span").forEach((s, i) => {
    const k = eOut((lt - tIn - i * stagger) / dur);
    s.style.transform = `translateY(${(1 - k) * 112}%)`; s.style.opacity = clamp((lt - tIn - i * stagger) / 0.25);
  });
}
function fade(el, lt, tIn, dur = .8, dy = 18) { const k = eOut((lt - tIn) / dur); el.style.opacity = k; el.style.transform = `translateY(${(1 - k) * dy}px)`; return k; }
function rule(el, lt, tIn, dur = .9) { el.style.transform = `scaleX(${eOut((lt - tIn) / dur)})`; }
function draw(el, lt, tIn, dur) { const k = eIO((lt - tIn) / dur); el.style.strokeDasharray = "1 1"; el.style.strokeDashoffset = 1 - k; el.style.opacity = k > 0 ? 1 : 0; return k; }

// Film grain: one seeded noise tile, shifted each frame so every render is identical.
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
(() => { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d"), img = x.createImageData(c.width, c.height), r = rng(11);
  for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (r() - .5) * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  x.putImageData(img, 0, 0); $("grain").style.backgroundImage = `url(${c.toDataURL()})`; })();

let HB, VW = [];
window.READY = document.fonts.ready.then(() => {
  // Heartbeat path sampled by x, so the glowing head can ride the line.
  const p = $("hb"), L = p.getTotalLength(); HB = [];
  for (let s = 0; s <= L; s += 2) { const q = p.getPointAtLength(s); HB.push([q.x, q.y]); }
  VW = ["v1", "v2", "v3"].map((id) => $(id).querySelector(".ln>span").getBoundingClientRect().width);
  return true;
});
function hbAt(x) { let best = HB[0]; for (const q of HB) { if (q[0] <= x) best = q; else break; } return best; }

function sceneAt(t) { let k = 0; for (let i = 0; i < SC.length; i++) if (t >= SC[i].t0) k = i; return k; }

// 1. Heartbeat line draws left to right, beats once, rises into a roof.
const HEAD0 = 0.2, HEADDUR = 2.2;
function scene1(lt) {
  const x = lerp(-10, 1930, eIO((lt - HEAD0) / HEADDUR));
  $("clipR").setAttribute("width", x + 20);
  const [hx, hy] = hbAt(x), on = lt > HEAD0 && lt < HEAD0 + HEADDUR;
  for (const id of ["head", "headG"]) { $(id).setAttribute("cx", hx); $(id).setAttribute("cy", hy); $(id).style.opacity = on ? 1 : 0; }
  const pk = eOut((lt - 1.45) / 0.9), pl = $("plus1");
  pl.style.opacity = clamp((lt - 1.45) / 0.4); pl.style.transform = `scale(${0.6 + 0.4 * pk})`;
  lines($("s1t"), lt, T(0, 0, -0.25), 1.0, .12);
}

// 2. Who: headline, support line, stethoscope drawn in one line inside a turning ring.
function scene2(lt) {
  rule($("s2rule"), lt, 0.1); lines($("s2k"), lt, 0.15);
  lines($("s2t"), lt, 0.3, 1.0, .12);
  lines($("s2s"), lt, T(1, 0, 0, 0.55), .9, .1);
  const a = eOut((lt - 0.2) / 2.6) * 0.82, rot = -90 + lt * 9;
  $("arc").style.strokeDashoffset = 1 - a; $("arc").setAttribute("transform", `rotate(${rot})`);
  const ang = (rot + a * 360) * Math.PI / 180;
  $("arcDot").setAttribute("cx", 250 * Math.cos(ang)); $("arcDot").setAttribute("cy", 250 * Math.sin(ang)); $("arcDot").style.opacity = a > 0.01 ? 1 : 0;
  const parts = $("steth").querySelectorAll(".d"), starts = [0.35, 0.45, 1.1, 1.2, 1.85, 2.15], durs = [1.0, 1.0, .5, 1.0, .7, .5];
  parts.forEach((el, i) => draw(el, lt, starts[i], durs[i]));
  $("ring").style.transform = `translateY(${(1 - eOut(lt / 1.2)) * 30}px)`; $("ring").style.opacity = eOut(lt / .8);
}

// 3. Values: one word per beat; the line underlines the word being spoken.
function scene3(lt) {
  const at = [0, 1, 2].map((i) => T(2, i, -0.12));
  const active = at.filter((a) => lt >= a).length - 1;
  ["v1", "v2", "v3"].forEach((id, i) => {
    lines($(id), lt, at[i], .85);
    const dim = active > i ? eOut((lt - at[i + 1]) / .6) : 0;
    $(id).style.opacity = 1 - 0.68 * dim;
    fade($("n" + (i + 1)), lt, at[i] + .1, .6, 10); $("n" + (i + 1)).style.opacity *= 1 - 0.6 * dim;
  });
  // The teal line marks the word being spoken and glides to the next one.
  const v = $("vline"), mids = [236, 426, 616].map((y) => y + 98), H = 120;
  if (active < 0) { v.style.height = "0px"; return; }
  const k = eIO((lt - at[active]) / .6), prev = Math.max(0, active - 1);
  const y = active === 0 ? mids[0] : lerp(mids[prev], mids[active], k);
  const h = active === 0 ? H * eOut((lt - at[0]) / .8) : H;
  Object.assign(v.style, { top: (y - h / 2) + "px", height: h + "px" });
}

// 4. Personal care: headline, then three glass cards as each word is spoken.
function scene4(lt) {
  lines($("s4t"), lt, T(3, 0, -0.2), 1.0);
  rule($("s4rule"), lt, T(3, 0, 0.4)); $("s4rule").style.left = (960 - 60) + "px";
  const at = [T(3, 1, -0.15, 0.0), T(3, 1, -0.15, 0.36), T(3, 1, -0.15, 0.68)];
  at.forEach((a, i) => {
    const c = $("cd" + (i + 1)), k = eOut((lt - a) / .9);
    c.style.opacity = clamp((lt - a) / .35); c.style.transform = `translateY(${(1 - k) * 60}px)`;
    c.querySelectorAll(".dr").forEach((el, j) => draw(el, lt, a + .25 + j * .35, .9));
  });
}

// 5. CRM: headline lines, then the care timeline fills step by step.
function scene5(lt) {
  rule($("s5rule"), lt, 0.1); lines($("s5k"), lt, 0.15);
  const t1 = $("s5t").querySelectorAll(".ln>span");
  [T(4, 0, -0.1), T(4, 1, -0.1)].forEach((a, i) => { const k = eOut((lt - a) / 1.0); t1[i].style.transform = `translateY(${(1 - k) * 112}%)`; t1[i].style.opacity = clamp((lt - a) / .25); });
  lines($("s5s"), lt, T(4, 1, 0, 0.5), .9, .1);
  const p = $("panel"), pk = eOut((lt - 0.25) / 1.1);
  p.style.opacity = clamp((lt - .25) / .5); p.style.transform = `translateY(${(1 - pk) * 50}px)`;
  $("live").querySelector("i").style.opacity = 0.45 + 0.55 * (0.5 + 0.5 * Math.cos(lt * 4.2));
  const at = [T(4, 0, 0, 0.55), T(4, 1, 0, 0.0), T(4, 1, 0, 0.4), T(4, 1, 0, 0.8)];
  at.forEach((a, i) => {
    const s = $("st" + (i + 1)), k = eOut((lt - a + .5) / .8);
    s.style.opacity = 0.35 + 0.65 * clamp((lt - a) / .3); s.style.transform = `translateX(${(1 - eOut((lt - 0.4 - i * .08) / .9)) * 24}px)`;
    const b = s.querySelector(".node b"), bk = eOut((lt - a) / .45);
    b.style.transform = `scale(${bk})`; b.style.opacity = clamp((lt - a) / .1);
    b.innerHTML = '<svg viewBox="0 0 16 16"><path d="M3.5 8.5 L6.8 11.5 L12.5 5" fill="none" stroke="#0B1430" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  });
  let h = 0; for (let i = 1; i < 4; i++) h += 118 * eIO((lt - at[i] + .45) / .45);
  $("trackOn").style.height = h + "px";
}

// 6. End card: the line draws the mark, the wordmark settles, a light sweep, then stillness.
function scene6(lt) {
  const d = eIO((lt - 0.05) / 1.0), ml = $("markLine");
  ml.style.strokeDasharray = "1 1"; ml.style.strokeDashoffset = 1 - d; ml.style.opacity = d > 0 ? 1 - clamp((lt - 1.3) / .5) : 0;
  const f = eOut((lt - 0.85) / .6); $("markFill").style.opacity = f;
  const pk = eOut((lt - 1.0) / .7); $("markPlus").style.opacity = clamp((lt - 1.0) / .2);
  $("markPlus").style.transform = `scale(${0.4 + 0.6 * pk})`; $("markPlus").style.transformOrigin = "60px 60px";
  const w = $("word"), wk = eOut((lt - T(5, 0, -0.2)) / 1.2);
  w.style.opacity = clamp((lt - T(5, 0, -0.2)) / .5); w.style.letterSpacing = `${(1 - wk) * 0.08}em`;
  const sw = eIO((lt - T(5, 1, 0.3, 1)) / 1.3);
  w.querySelector(".w").style.backgroundPosition = `${100 - sw * 100}% 0`;
  lines($("tag"), lt, T(5, 1, -0.15), 1.0);
  rule($("s6rule"), lt, T(5, 1, 0.5));
  fade($("cta"), lt, T(5, 1, 0.75), .9, 14);
}

const SCENES = [scene1, scene2, scene3, scene4, scene5, scene6];
// Glow positions per scene: [x1, y1, x2, y2].
const GLOW = [[960, 520, 1500, 900], [1400, 520, 300, 900], [700, 540, 1600, 200], [960, 620, 200, 200], [1400, 520, 300, 800], [960, 430, 1500, 900]];

window.render = (f) => {
  const t = f / FPS, k = sceneAt(t), last = TL.frames / FPS;
  SC.forEach((s, i) => {
    const el = $("s" + (i + 1)), lt = t - s.t0;
    const fin = i === 0 ? 1 : eOut((lt + 0.05) / 0.5);
    const fo = i === SC.length - 1 ? 0 : eIn((t - (s.t0 + s.dur - 0.5)) / 0.5);
    const op = fin * (1 - fo), vis = op > 0.001 && t > s.t0 - 0.06 && t < s.t0 + s.dur + 0.01;
    el.style.visibility = vis ? "visible" : "hidden"; el.style.opacity = op;
    el.style.transform = `translateY(${-fo * 24}px)`; el.style.filter = fo > 0.01 ? `blur(${fo * 6}px)` : "none";
    if (vis) SCENES[i](lt);
  });
  // Slow camera push within each scene.
  const lt = t - SC[k].t0, pr = lt / SC[k].dur;
  $("stage").style.transform = `scale(${1 + 0.025 * pr})`;
  // Glows ease between scene positions and breathe.
  const g = GLOW[k], gp = k > 0 ? GLOW[k - 1] : g, m = eIO((lt + .3) / 1.6);
  const gx = (i) => lerp(gp[i], g[i], m);
  $("g1").style.transform = `translate(${gx(0) - 700 + 30 * Math.sin(t * .4)}px, ${gx(1) - 700 + 20 * Math.cos(t * .33)}px)`;
  $("g2").style.transform = `translate(${gx(2) - 550}px, ${gx(3) - 550}px)`;
  const r = rng((f >> 1) + 1); $("grain").style.transform = `translate(${Math.floor(r() * 64) - 32}px, ${Math.floor(r() * 64) - 32}px)`;
  // Gentle fade to the end, and in from black at the start.
  document.body.style.opacity = 1;
  $("stage").style.opacity = Math.min(eOut(t / 0.6), 1 - eIn((t - (last - 0.6)) / 0.6));
  return f;
};
</script>
</body></html>
