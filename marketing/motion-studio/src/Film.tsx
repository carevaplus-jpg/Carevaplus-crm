/* =====================================================================================
   CAREVA+ — ROBOTIC UV-C DISINFECTION · PRO (Remotion)        16:9 + 9:16 from one source
   Four colour themes, one per step; a multicolour stripe wipe joins every scene.

   time    scene                                                       look
   0.0     OPEN    Spotless AI sting, built and rendered in HyperFrames (spotless-sting/), played here as video   Spotless purple
   3.6     BRAND   Careva+ logo assembles; four step tiles flip in      light, multicolour
   7.2     MAP     01 title → tilted console, camera rides the robot, lidar, objects  cyan
   15.0    CHECK   02 title → macro on the robot's eyes scanning → dose slider close-up → Start   amber
   21.6    UV-C    03 title → hero robot with light rays, germs dissolve → ring close-up, chips   violet
   31.2    REPORT  04 title → report card rides row by row → macro on Log 4 stamp   green
   37.2    CLOSER  "Safer rooms for" four colour tiles (Careva+ services)   multicolour
   41.4    END     logo, Spotless AI, phone, location, footnote          light
   47.4    end
   Facts: spotless.ai and carevaplus.com (see README). Robot photo and Spotless logo supplied by Careva+; console screens are illustrations.
   ===================================================================================== */
import React from 'react';
import { AbsoluteFill, Audio, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig, random } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { THEMES, INK, NAVY, CREAM, RAINBOW, SPOT, Fonts, Abs, Mesh, RealRobot, SpotlessLogo, Tick, Phone, Cursor, Logo, Glass, clamp, seg, lerp, io, out, spr, kf, eio } from './kit';

export const FPS = 60;
export const DURATION_S = 47.4;
const T = { brand: 3.6, map: 7.2, check: 15.0, uv: 21.6, rep: 31.2, clo: 37.2, end: 41.4 };
const BOUNDS = [T.brand, T.map, T.check, T.uv, T.rep, T.clo, T.end];

type Ctx = { t: number; W: number; H: number; reel: boolean };

/* ---------- camera: perspective tilt + zoom + pan around a world point ---------- */
const Cam: React.FC<React.PropsWithChildren<{ W: number; H: number; x?: number; y?: number; z?: number; rx?: number; ry?: number; rz?: number }>> = ({ W, H, x = 0, y = 0, z = 1, rx = 0, ry = 0, rz = 0, children }) => (
  <Abs style={{ left: W / 2, top: H / 2, width: 0, height: 0, transformStyle: 'preserve-3d', transform: `perspective(2000px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${z}) translate(${-x}px,${-y}px)` }}>{children}</Abs>
);

/* ---------- the multicolour stripe wipe ---------- */
const Wipe: React.FC<Ctx> = ({ t, W, H }) => {
  const b = BOUNDS.find(b => Math.abs(t - b) < 0.45); if (b === undefined) return null;
  const p = seg(t, b - 0.45, b + 0.45), cols = [THEMES.map.a, THEMES.check.a, THEMES.uv.b, THEMES.report.a, '#E5332A'];
  const bw = Math.max(W, H) * 0.42;
  return <Abs style={{ inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
    {cols.map((c, i) => { const k = eio(clamp(p * 1.25 - i * 0.06)); const x = lerp(-bw * 1.6, W + bw * 1.2, k);
      return <Abs key={i} style={{ left: x + i * bw * 0.32, top: -H * 0.2, width: bw, height: H * 1.4, background: c, transform: 'skewX(-18deg)', boxShadow: `0 0 60px ${c}` }} />; })}
  </Abs>;
};

/* ---------- chapter title: big outlined numeral + heavy line + gradient underline ---------- */
const Chapter: React.FC<Ctx & { n: string; line: string; sub: string; th: { a: string; b: string }; light?: boolean }> = ({ t, W, H, reel, n, line, sub, th, light }) => {
  if (t > 2.2) return null;
  const o = 1 - io(t, 1.85, 2.2), sc = 1 + 0.25 * io(t, 1.85, 2.2), words = line.split(' ');
  const num = out(t, 0.05, 0.7), ul = io(t, 0.75, 1.35), fs = reel ? 112 : 128;
  return <Abs style={{ inset: 0, opacity: o, transform: `scale(${sc})` }}>
    <Abs style={{ left: 0, right: 0, top: H / 2 - (reel ? 330 : 250), textAlign: 'center', fontFamily: 'Mont', fontWeight: 900, fontSize: reel ? 300 : 280, lineHeight: 1, color: 'transparent', WebkitTextStroke: `3px ${th.a}`, opacity: 0.9 * num, transform: `translateY(${(1 - num) * 80}px)`, letterSpacing: '-.04em' }}>{n}</Abs>
    <Abs style={{ left: 0, right: 0, top: H / 2 - 20, textAlign: 'center', fontFamily: 'Mont', fontWeight: 850, fontSize: fs, letterSpacing: '-.035em', color: light ? NAVY : '#fff', lineHeight: 1.02, whiteSpace: reel ? 'normal' : 'nowrap', padding: reel ? '0 60px' : 0 }}>
      {words.map((w, i) => { const k = out(t, 0.25 + i * 0.09, 0.75 + i * 0.09); return <span key={i} style={{ display: 'inline-block', marginRight: '.25em', opacity: k, transform: `translateY(${(1 - k) * 60}px) rotate(${(1 - k) * 6}deg)`, filter: `blur(${(1 - k) * 8}px)` }}>{w}</span>; })}
    </Abs>
    <Abs style={{ left: W / 2 - (reel ? 380 : 520), width: (reel ? 760 : 1040) * ul, top: H / 2 + (reel ? 270 : 150), height: 8, borderRadius: 4, background: `linear-gradient(90deg, ${th.a}, ${th.b})`, boxShadow: `0 0 30px ${th.a}` }} />
    <Abs style={{ left: 0, right: 0, top: H / 2 + (reel ? 300 : 182), textAlign: 'center', fontFamily: 'Mono', fontSize: reel ? 26 : 24, letterSpacing: '.22em', textTransform: 'uppercase', color: light ? '#4B5D74' : th.a, opacity: out(t, 1.0, 1.4) }}>{sub}</Abs>
  </Abs>;
};

/* =================================== OPEN (HyperFrames) =================================== */
// The opening 3.6 s is the Spotless AI sting, made in HyperFrames (HTML + GSAP) and rendered to MP4.
const Open: React.FC<Ctx> = ({ reel }) => (
  <AbsoluteFill style={{ background: SPOT.ink }}>
    <OffthreadVideo src={staticFile(reel ? 'sting-reel.mp4' : 'sting-wide.mp4')} muted style={{ width: '100%', height: '100%' }} />
  </AbsoluteFill>
);

/* =================================== BRAND =================================== */
const STEPS = [{ th: THEMES.map, n: '01', l: 'Map' }, { th: THEMES.check, n: '02', l: 'Check' }, { th: THEMES.uv, n: '03', l: 'UV-C' }, { th: THEMES.report, n: '04', l: 'Report' }];
const Brand: React.FC<Ctx> = ({ t, W, H, reel }) => {
  const up = io(t, 1.6, 2.3), ls = lerp(reel ? 0.5 : 0.48, reel ? 0.4 : 0.34, up), ly = lerp(0, reel ? -560 : -280, up);
  return <AbsoluteFill>
    <Mesh t={t + 3} light base={CREAM} colors={[THEMES.map.a, THEMES.uv.a, THEMES.check.a, THEMES.report.a]} />
    <Abs style={{ left: W / 2 - 893, top: H / 2 - 276.5 + ly }}>
      <Logo scale={ls} iconPop={clamp(spr(t - 0.1, 12, 0.6), 0, 1.15)} wordReveal={out(t, 0.4, 1.0)} crossSpin={clamp(spr(t - 0.9, 16, 0.5), 0, 1.2)} />
    </Abs>
    <Abs style={{ left: 0, right: 0, top: H / 2 + ly + (reel ? 140 : 120), textAlign: 'center', fontFamily: 'Mont', fontWeight: 650, fontSize: reel ? 40 : 36, color: '#4B5D74', opacity: out(t, 1.0, 1.5) }}>
      <div style={{ display: 'flex', flexDirection: reel ? 'column' : 'row', justifyContent: 'center', alignItems: 'center', gap: reel ? 18 : 16 }}><span>brings you <b style={{ color: NAVY }}>robotic disinfection</b> by</span><SpotlessLogo width={reel ? 280 : 200} pill /></div>
    </Abs>
    {STEPS.map((s, i) => {
      const k = clamp(spr(t - 2.1 - i * 0.14, 13, 0.7), 0, 1.1), cw = reel ? 420 : 340, ch = reel ? 300 : 300;
      const x = reel ? (i % 2 ? 20 : -cw - 20) : -2 * cw - 45 + i * (cw + 30), y = reel ? (i < 2 ? -200 : 130) : 0;
      return <Abs key={i} style={{ left: W / 2 + x, top: H / 2 + y + (reel ? 220 : 120) - ch / 2, width: cw, height: ch, borderRadius: 32, background: `linear-gradient(145deg, ${s.th.a}, ${s.th.b})`, boxShadow: `0 30px 60px -25px ${s.th.b}`, transform: `perspective(1200px) rotateX(${(1 - k) * 80}deg) translateY(${(1 - k) * 60}px)`, transformOrigin: '50% 100%', opacity: clamp(k * 2) }}>
        <Abs style={{ left: 30, top: 26, fontFamily: 'Mono', fontSize: 22, letterSpacing: '.2em', color: 'rgba(255,255,255,.85)' }}>STEP {s.n}</Abs>
        <Abs style={{ left: 30, bottom: 30, fontFamily: 'Mont', fontWeight: 900, fontSize: 64, letterSpacing: '-.03em', color: '#fff' }}>{s.l}</Abs>
        <Abs style={{ right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
      </Abs>;
    })}
  </AbsoluteFill>;
};

/* =================================== MAP (cyan) =================================== */
const PATH: [number, number][] = [[620, 470], [620, 300], [420, 300], [420, 440], [280, 440], [120, 440], [120, 380], [300, 380]];
const plen = PATH.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - PATH[i][0], p[1] - PATH[i][1]), 0);
const along = (u: number): [number, number] => { let d = u * plen; for (let i = 1; i < PATH.length; i++) { const [x0, y0] = PATH[i - 1], [x1, y1] = PATH[i], l = Math.hypot(x1 - x0, y1 - y0); if (d <= l) return [x0 + (x1 - x0) * d / l, y0 + (y1 - y0) * d / l]; d -= l; } return PATH[PATH.length - 1]; };
const FURN = [{ n: 'Bed', x: 70, y: 70, w: 170, h: 260, at: 0.3 }, { n: 'Cabinet', x: 260, y: 60, w: 70, h: 70, at: 0.5 }, { n: 'Chair', x: 560, y: 80, w: 90, h: 90, at: 0.7 }];
const MapScene: React.FC<Ctx> = (c) => {
  const { t, W, H, reel } = c, th = THEMES.map, u = io(t, 2.4, 6.6), [dx, dy] = along(u);
  const CW = reel ? 940 : 1180, CH = reel ? 1180 : 680, PS = reel ? 880 / 720 : 1, PX = reel ? 30 : 40, PY = reel ? 90 : 96;
  const wx = -CW / 2 + PX + dx * PS, wy = -CH / 2 + PY + dy * PS, pull = io(t, 6.3, 7.4), fit = Math.min(W * 0.9 / CW, H * 0.86 / CH);
  const found = FURN.filter(f => u > f.at).length, appear = out(t, 2.0, 2.6);
  const info = (k: string, v: React.ReactNode, i: number) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderTop: '1px solid rgba(255,255,255,.08)', fontSize: reel ? 26 : 22 }}><span style={{ color: 'rgba(255,255,255,.6)', fontWeight: 550 }}>{k}</span><span style={{ color: '#fff', fontWeight: 750 }}>{v}</span></div>;
  return <AbsoluteFill>
    <Mesh t={t} colors={[th.a, th.b, '#6366F1']} />
    {t > 1.85 && <Abs style={{ inset: 0, opacity: appear }}>
      <Cam W={W} H={H} x={lerp(wx, 0, pull)} y={lerp(wy, 0, pull)} z={lerp(reel ? 1.7 : 2.0, fit, pull)} rx={lerp(34, 0, pull)} rz={lerp(-10, 0, pull)}>
        <Glass w={CW} h={CH} accent={th.a}>
          <Abs style={{ left: PX, top: PY, width: 720, height: 540, transform: `scale(${PS})`, transformOrigin: '0 0', borderRadius: 18, background: '#0B1B2E', overflow: 'hidden', border: `1px solid ${th.a}33` }}>
            <Abs style={{ inset: 0, backgroundImage: `linear-gradient(${th.a}18 1px,transparent 1px),linear-gradient(90deg,${th.a}18 1px,transparent 1px)`, backgroundSize: '36px 36px' }} />
            <svg width={720} height={540} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
              <path d="M40 40 H680 V500 H560 M480 500 H40 Z" fill="none" stroke={th.a} strokeWidth={7} strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - out(t, 2.4, 6.8)} style={{ filter: `drop-shadow(0 0 8px ${th.a})` }} />
              <polyline points={Array.from({ length: 61 }, (_, k) => along(u * k / 60).join(',')).join(' ')} fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={3} strokeDasharray="2 10" strokeLinecap="round" />
            </svg>
            {FURN.map(f => { const k = clamp(spr(t - (2.4 + f.at * 4.2), 16, 0.7), 0, 1.15); return <Abs key={f.n} style={{ left: f.x, top: f.y, width: f.w, height: f.h, borderRadius: 12, border: `2px solid ${th.a}`, background: `${th.a}22`, opacity: clamp(k * 2), transform: `scale(${lerp(0.7, 1, k)})` }}>
              <Abs style={{ left: 8, top: -30, padding: '4px 10px', borderRadius: 8, background: th.a, color: INK, fontFamily: 'Mono', fontSize: 14, letterSpacing: '.1em', whiteSpace: 'nowrap' }}>{f.n.toUpperCase()}</Abs></Abs>; })}
            {[0, 1, 2].map(i => { const ph = ((t * 1.3) + i / 3) % 1, r = 20 + ph * 200; return <Abs key={i} style={{ left: dx - r, top: dy - r, width: 2 * r, height: 2 * r, borderRadius: '50%', border: `2px solid ${th.a}`, opacity: (1 - ph) * (t < 6.8 ? 1 : 0) }} />; })}
            <Abs style={{ left: dx - 24, top: dy - 24, width: 48, height: 48, borderRadius: '50%', background: '#fff', boxShadow: `0 0 0 6px ${th.a}55, 0 0 30px ${th.a}` }}><Abs style={{ left: 14, top: 14, width: 20, height: 20, borderRadius: 10, background: th.b }} /></Abs>
          </Abs>
          <Abs style={{ left: reel ? 40 : 800, top: reel ? 780 : 104, width: reel ? CW - 80 : 340, fontFamily: 'Mont' }}>
            <div style={{ fontWeight: 800, fontSize: reel ? 34 : 28, color: t > 6.8 ? THEMES.report.a : th.a, marginBottom: 14 }}>{t > 6.8 ? 'Map ready ✓' : 'Mapping…'}</div>
            {info('Room', 'Patient room', 0)}{info('Size', '20 × 15 ft', 1)}{info('Objects found', found, 2)}
            <div style={{ marginTop: 22, height: 10, borderRadius: 5, background: 'rgba(255,255,255,.08)' }}><div style={{ width: `${seg(t, 2.4, 6.8) * 100}%`, height: 10, borderRadius: 5, background: `linear-gradient(90deg, ${th.a}, ${th.b})` }} /></div>
          </Abs>
        </Glass>
      </Cam>
    </Abs>}
    <Chapter {...c} n="01" line="It maps every room" sub="Onboard sensors + mapping" th={th} />
  </AbsoluteFill>;
};

/* =================================== CHECK (amber) =================================== */
const CheckScene: React.FC<Ctx> = (c) => {
  const { t, W, H, reel } = c, th = THEMES.check;
  // part A: macro on the robot head scanning (2.0–3.6)  part B: dose slider close-up → card + Start (3.6–6.6)
  const A = t > 1.85 && t < 3.9, a = seg(t, 2.0, 3.8), scan = Math.sin(t * 5) * 0.5 + 0.5;
  const LV = ['90%', '99%', '99.9%', '99.99%'], sv = io(t, 4.2, 5.4), lvl = Math.min(3, Math.round(sv * 3));
  const CW = reel ? 940 : 1000, CH = reel ? 980 : 620, SW = CW - 112;
  const pull = io(t, 5.5, 6.3), fit = Math.min(W * 0.9 / CW, H * 0.86 / CH), clicked = t > 6.2;
  return <AbsoluteFill>
    <Mesh t={t} colors={[th.a, th.b, '#EF4444']} />
    {A && <Abs style={{ inset: 0, opacity: out(t, 1.9, 2.3) * (1 - seg(t, 3.6, 3.9)) }}>
      <Abs style={{ left: W / 2 + 60 - 2000, top: H / 2 - 2000, width: 4000, height: 4000, borderRadius: '50%', background: `conic-gradient(from ${55 + scan * 50}deg at 50% 50%, transparent 0deg, ${th.a}66 18deg, transparent 36deg)`, WebkitMaskImage: 'radial-gradient(closest-side, #000 2%, rgba(0,0,0,.5) 25%, transparent 60%)', opacity: 0.9 }} />
      <Cam W={W} H={H} z={lerp(reel ? 2.9 : 2.7, reel ? 2.4 : 2.2, a)} y={-262} rz={lerp(-4, 2, a)}><Abs style={{ left: -132, top: -300 }}><RealRobot height={600} lamp={0.35} /></Abs></Cam>
      <Abs style={{ left: 0, right: 0, top: reel ? H - 560 : H - 250, display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '22px 36px', borderRadius: 999, background: 'rgba(10,14,32,.82)', border: `2px solid ${th.a}`, fontFamily: 'Mont', fontWeight: 800, fontSize: reel ? 46 : 44, color: '#fff', boxShadow: `0 0 50px ${th.a}66`, transform: `scale(${clamp(spr(t - 2.7, 16, 0.6), 0, 1.2)})` }}>
          <span style={{ color: THEMES.report.a }}><Tick size={44} /></span> Room empty</div>
      </Abs>
      <Abs style={{ left: 0, right: 0, top: reel ? 250 : 90, textAlign: 'center', fontFamily: 'Mono', fontSize: 22, letterSpacing: '.24em', color: th.a, opacity: out(t, 2.1, 2.5) }}>CAMERAS + DEPTH SENSING · OCCUPANCY CHECK</Abs>
    </Abs>}
    {t > 3.6 && <Abs style={{ inset: 0, opacity: out(t, 3.6, 4.0) }}>
      <Cam W={W} H={H} x={lerp(reel ? 0 : -SW / 2 + sv * SW, 0, pull)} y={lerp(-CH / 2 + 300, 0, pull)} z={lerp(reel ? 1.08 : 2.2, fit, pull)} rx={lerp(18, 0, pull)}>
        <Glass w={CW} h={CH} accent={th.a}>
          <Abs style={{ left: 56, top: 96, right: 56, fontFamily: 'Mont', color: '#fff' }}>
            <div style={{ fontWeight: 800, fontSize: 40 }}>Cycle setup</div>
            <div style={{ marginTop: 26, display: 'flex', justifyContent: 'space-between', fontSize: 26, padding: '18px 0', borderTop: '1px solid rgba(255,255,255,.08)' }}><span style={{ color: 'rgba(255,255,255,.6)' }}>Room</span><b>Patient room · 20 × 15 ft</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 26, padding: '18px 0', borderTop: '1px solid rgba(255,255,255,.08)' }}><span style={{ color: 'rgba(255,255,255,.6)' }}>Occupancy</span><b style={{ color: THEMES.report.a, display: 'flex', gap: 10, alignItems: 'center' }}><Tick size={26} /> Room empty</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '18px 0 0', borderTop: '1px solid rgba(255,255,255,.08)' }}><span style={{ color: 'rgba(255,255,255,.6)', fontSize: 26 }}>Dose target</span><b style={{ fontSize: 46, color: th.a }}>Log {lvl + 1} · {LV[lvl]}</b></div>
          </Abs>
          <Abs style={{ left: 56, top: reel ? 470 : 420, width: SW, height: 14, borderRadius: 7, background: 'rgba(255,255,255,.1)' }}>
            <Abs style={{ left: 0, top: 0, height: 14, width: sv * SW, borderRadius: 7, background: `linear-gradient(90deg, ${th.a}, ${th.b})`, boxShadow: `0 0 20px ${th.a}` }} />
            <Abs style={{ left: sv * SW - 22, top: -15, width: 44, height: 44, borderRadius: 22, background: '#fff', border: `4px solid ${th.b}`, boxShadow: `0 0 24px ${th.a}` }} />
            {['Log 1', 'Log 2', 'Log 3', 'Log 4'].map((l, i) => <Abs key={l} style={{ left: i * SW / 3, top: 40, transform: `translateX(${i === 0 ? 0 : i === 3 ? -100 : -50}%)`, fontFamily: 'Mono', fontSize: 16, color: i <= lvl ? th.a : 'rgba(255,255,255,.4)', whiteSpace: 'nowrap' }}>{l}</Abs>)}
          </Abs>
          <Abs style={{ left: 56, top: CH - 150, width: SW, height: 90, borderRadius: 45, background: clicked ? `linear-gradient(90deg, ${THEMES.uv.a}, ${THEMES.uv.b})` : `linear-gradient(90deg, ${th.a}, ${th.b})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Mont', fontWeight: 800, fontSize: 32, color: INK, transform: `scale(${1 - 0.04 * Math.exp(-Math.abs(t - 6.2) * 18)})`, boxShadow: `0 20px 50px -15px ${clicked ? THEMES.uv.b : th.b}` }}>{clicked ? 'Cycle starting…' : 'Start cycle'}</Abs>
          <Abs style={{ left: lerp(CW - 60, CW / 2 + 40, io(t, 5.5, 6.1)), top: lerp(CH + 40, CH - 100, io(t, 5.5, 6.1)), opacity: seg(t, 5.4, 5.6) }}><Cursor /></Abs>
        </Glass>
      </Cam>
    </Abs>}
    <Chapter {...c} n="02" line="It checks the room is empty" sub="Then sets the dose" th={th} />
  </AbsoluteFill>;
};

/* =================================== UV-C (violet) =================================== */
const GERMS = Array.from({ length: 34 }, (_, i) => ({ a: random('g' + i) * Math.PI * 2, r: 230 + random('r' + i) * 520, s: 0.7 + random('s' + i) * 0.8 }));
const CHIPS = ['Chemical-free', 'No residue', 'Dose adjusted to each surface', 'Shuts off if anyone enters'];
const UvScene: React.FC<Ctx> = (c) => {
  const { t, W, H, reel } = c, th = THEMES.uv, on = out(t, 2.0, 2.8), wave = (t - 2.4) * 260;
  const heroOut = io(t, 5.4, 6.0), ring = seg(t, 2.6, 9.0);
  return <AbsoluteFill>
    <Mesh t={t} base={SPOT.ink} colors={[SPOT.magenta, th.b, SPOT.blue]} />
    {t > 1.85 && <Abs style={{ inset: 0, opacity: out(t, 1.85, 2.3) * (1 - heroOut) }}>
      <Abs style={{ left: W / 2 - 1500, top: H / 2 - 1500, width: 3000, height: 3000, borderRadius: '50%', transform: `rotate(${t * 18}deg)`, opacity: 0.7 * on, background: `repeating-conic-gradient(from 0deg, ${th.a}66 0deg 5deg, transparent 5deg 16deg)`, WebkitMaskImage: 'radial-gradient(closest-side, #000 20%, transparent)' }} />
      <Cam W={W} H={H} z={kf(t, [[1.9, reel ? 1.6 : 1.9], [5.6, reel ? 2.0 : 2.4]])} ry={kf(t, [[1.9, -14], [5.6, 14]])} y={-10}>
        {GERMS.map((g, i) => { const k = clamp((wave - g.r) / 80); const x = Math.cos(g.a) * g.r * 1.3, y = Math.sin(g.a) * g.r * 0.55 + 40;
          return <Abs key={i} style={{ left: x - 14, top: y - 14, width: 28, height: 28, transform: `scale(${(1 - k) * g.s}) rotate(${t * 90 + i * 20}deg)`, opacity: clamp(seg(t, 1.9, 2.2)) * (1 - k) }}>
            <svg viewBox="-20 -20 40 40" width={28} height={28}><polygon points="0,-14 3,-5 12,-7 6,0 12,7 3,5 0,14 -3,5 -12,7 -6,0 -12,-7 -3,-5" fill="#34D399" /><circle r="5" fill="#047857" /></svg></Abs>; })}
        {GERMS.map((g, i) => { const k = clamp((wave - g.r) / 80); if (k <= 0 || k >= 1) return null; const x = Math.cos(g.a) * g.r * 1.3, y = Math.sin(g.a) * g.r * 0.55 + 40;
          return <Abs key={'s' + i} style={{ left: x - 30 * k - 6, top: y - 30 * k - 6, width: 60 * k + 12, height: 60 * k + 12, borderRadius: '50%', border: `2px solid ${th.a}`, opacity: 1 - k }} />; })}
        <Abs style={{ left: -520, top: -520, width: 1040, height: 1040, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(235,215,255,.95), ${SPOT.magenta}77 28%, ${th.b}44 55%, ${SPOT.blue}22 70%, transparent)`, opacity: on }} />
        <Abs style={{ left: -73, top: -175 }}><RealRobot height={330} lamp={on} glow={SPOT.purple} /></Abs>
      </Cam>
    </Abs>}
    {t > 5.4 && <Abs style={{ inset: 0, opacity: out(t, 5.4, 5.9) }}>
      <Abs style={{ left: W / 2 - (reel ? 0 : 420), top: H / 2 - (reel ? 330 : 0), width: 0, height: 0 }}>
        <svg width={420} height={420} viewBox="0 0 100 100" style={{ position: 'absolute', left: -210, top: -210, transform: `scale(${kf(t, [[5.4, 1.5], [6.6, 1]])})`, filter: `drop-shadow(0 0 30px ${th.a})` }}>
          <defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" stopColor={th.a} /><stop offset="1" stopColor={th.b} /></linearGradient></defs>
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="7" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="url(#rg)" strokeWidth="7" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ring} transform="rotate(-90 50 50)" />
        </svg>
        <Abs style={{ left: -200, width: 400, top: -64, textAlign: 'center', fontFamily: 'Mont', fontWeight: 900, fontSize: 104, color: '#fff', letterSpacing: '-.04em' }}>{Math.round(ring * 100)}%</Abs>
        <Abs style={{ left: -200, width: 400, top: 52, textAlign: 'center', fontFamily: 'Mono', fontSize: 20, letterSpacing: '.24em', color: th.a }}>UV-C ON</Abs>
      </Abs>
      <Abs style={{ left: reel ? 0 : W / 2 - 80, right: reel ? 0 : undefined, top: reel ? H / 2 - 40 : H / 2 - 250, textAlign: reel ? 'center' : 'left', fontFamily: 'Mont' }}>
        <div style={{ fontWeight: 900, fontSize: reel ? 82 : 86, letterSpacing: '-.03em', color: '#fff', opacity: out(t, 5.8, 6.3) }}>Under 30 min</div>
        <div style={{ fontSize: reel ? 32 : 30, color: 'rgba(255,255,255,.7)', marginTop: 6, opacity: out(t, 6.0, 6.5) }}>for a typical patient room</div>
        <div style={{ marginTop: 34, display: 'flex', flexDirection: 'column', alignItems: reel ? 'center' : 'flex-start', gap: 16 }}>
          {CHIPS.map((ch, i) => { const k = clamp(spr(t - 6.5 - i * 0.45, 15, 0.7), 0, 1.1); return <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 28px', borderRadius: 999, background: 'rgba(16,12,40,.75)', border: `1.5px solid ${[THEMES.map.a, THEMES.check.a, th.a, THEMES.report.a][i]}`, fontWeight: 750, fontSize: reel ? 32 : 30, color: '#fff', opacity: clamp(k * 2), transform: `perspective(900px) translateZ(${(1 - k) * -400}px) rotateY(${(1 - k) * 30}deg)` }}>
            <span style={{ color: [THEMES.map.a, THEMES.check.a, th.a, THEMES.report.a][i] }}><Tick size={28} /></span>{ch}</div>; })}
        </div>
      </Abs>
    </Abs>}
    <Chapter {...c} n="03" line="UV-C does the rest" sub="Autonomous cycle" th={th} />
  </AbsoluteFill>;
};

/* =================================== REPORT (green) =================================== */
const ROWS = [['Surfaces treated', 'All mapped surfaces'], ['UV-C dose logged', 'Per surface'], ['Duration', 'Under 30 min'], ['Lab-validated', 'Log 4 · 99.99%*']];
const RepScene: React.FC<Ctx> = (c) => {
  const { t, W, H, reel } = c, th = THEMES.report, CW = reel ? 940 : 1000, CH = reel ? 1000 : 720;
  const rideRow = clamp((t - 2.4) / 0.6, 0, 3), macro = io(t, 4.6, 5.3), fit = Math.min(W * 0.9 / CW, H * 0.86 / CH);
  const rowY = (i: number) => -CH / 2 + 240 + i * 92;
  const z = lerp(lerp(reel ? 1.45 : 1.7, fit, io(t, 4.2, 4.7)), reel ? 2.0 : 2.4, macro);
  const camY = lerp(lerp(rowY(rideRow), 0, io(t, 4.2, 4.7)), rowY(3), macro), camX = lerp(0, CW / 2 - 240, macro);
  return <AbsoluteFill>
    <Mesh t={t} light base={CREAM} colors={[th.a, th.b, THEMES.map.a]} />
    {t > 1.85 && <Abs style={{ inset: 0, opacity: out(t, 1.85, 2.3) }}>
      <Cam W={W} H={H} x={camX} y={camY} z={z} rx={lerp(16, 0, io(t, 1.9, 3.2))} rz={lerp(-4, 0, io(t, 1.9, 3.2))}>
        <Glass w={CW} h={CH} accent={th.b} dark={false}>
          <Abs style={{ left: 56, top: 96, fontFamily: 'Mont' }}><div style={{ fontWeight: 900, fontSize: 46, color: NAVY, letterSpacing: '-.02em' }}>Cycle report</div><div style={{ fontSize: 24, color: '#6A7B8E', marginTop: 4 }}>Patient room · today, 10:42</div></Abs>
          {ROWS.map(([k, v], i) => { const kk = clamp(spr(t - 2.3 - i * 0.6, 16, 0.7), 0, 1.2); return <Abs key={k} style={{ left: 56, top: CH / 2 + rowY(i) - 40, width: CW - 112, height: 92, borderTop: '1px solid #E4E8EF', display: 'flex', alignItems: 'center', gap: 18, fontFamily: 'Mont', opacity: clamp(kk * 2) }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: `linear-gradient(135deg, ${th.a}, ${th.b})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${kk})` }}><Tick size={26} /></div>
            <div style={{ fontSize: 28, color: '#4B5D74', fontWeight: 550, flex: 1 }}>{k}</div><div style={{ fontSize: 30, fontWeight: 800, color: NAVY }}>{v}</div></Abs>; })}
          <Abs style={{ right: 70, top: CH - 230, width: 220, height: 220, borderRadius: '50%', border: `6px solid ${th.b}`, color: th.b, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Mont', fontWeight: 900, transform: `rotate(-14deg) scale(${clamp(spr(t - 4.9, 14, 0.5), 0, 1.3)})`, opacity: seg(t, 4.85, 5.0) }}>
            <div style={{ fontSize: 26, letterSpacing: '.12em' }}>CYCLE</div><div style={{ fontSize: 40 }}>VERIFIED</div><Tick size={40} /></Abs>
          <Abs style={{ left: 56, top: CH - 150, height: 80, padding: '0 46px', borderRadius: 40, background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', fontFamily: 'Mont', fontWeight: 800, fontSize: 28 }}>Download report</Abs>
        </Glass>
      </Cam>
    </Abs>}
    <Chapter {...c} n="04" line="And proves every cycle" sub="A report for every room" th={th} light />
  </AbsoluteFill>;
};

/* =================================== CLOSER =================================== */
const SERV = [{ w: 'Seniors', th: THEMES.map }, { w: 'New mothers', th: THEMES.check }, { w: 'Post-surgery', th: THEMES.uv }, { w: 'ICU at home', th: THEMES.report }];
const Closer: React.FC<Ctx> = ({ t, W, H, reel }) => {
  const tw = reel ? 470 : 400, thh = reel ? 420 : 460;
  return <AbsoluteFill>
    <Mesh t={t} colors={SERV.map(s => s.th.a)} />
    <Abs style={{ left: 0, right: 0, top: reel ? 330 : 110, textAlign: 'center', fontFamily: 'Mont', fontWeight: 900, fontSize: reel ? 92 : 96, letterSpacing: '-.035em', color: '#fff', opacity: out(t, 0.1, 0.6), transform: `translateY(${(1 - out(t, 0.1, 0.6)) * 30}px)` }}>Safer rooms for</Abs>
    {SERV.map((s, i) => { const k = clamp(spr(t - 0.6 - i * 0.35, 12, 0.7), 0, 1.1);
      const x = reel ? (i % 2 ? 15 : -tw - 15) : -2 * tw - 45 + i * (tw + 30), y = reel ? (i < 2 ? -thh - 15 + 140 : 155) : -thh / 2 + 70;
      return <Abs key={s.w} style={{ left: W / 2 + x, top: H / 2 + y, width: tw, height: thh, borderRadius: 36, background: `linear-gradient(150deg, ${s.th.a}, ${s.th.b})`, boxShadow: `0 40px 80px -30px ${s.th.b}`, transform: `perspective(1400px) rotateY(${(1 - k) * -90}deg) scale(${1 + 0.03 * Math.sin(t * 2 + i)})`, opacity: clamp(k * 2), overflow: 'hidden' }}>
        <Abs style={{ right: -60, bottom: -60, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,.2)' }} />
        <Abs style={{ left: 34, top: 30, fontFamily: 'Mono', fontSize: 20, letterSpacing: '.2em', color: 'rgba(255,255,255,.85)' }}>CAREVA+ CARE</Abs>
        <Abs style={{ left: 34, bottom: 34, right: 20, fontFamily: 'Mont', fontWeight: 900, fontSize: reel ? 58 : 54, lineHeight: 1, letterSpacing: '-.03em', color: '#fff', whiteSpace: 'normal' }}>{s.w}</Abs>
      </Abs>; })}
  </AbsoluteFill>;
};

/* =================================== END =================================== */
const End: React.FC<Ctx> = ({ t, W, H, reel }) => {
  const e = (d: number, dy = 24) => { const k = clamp(spr(t - d, 12, 0.95)); return { opacity: k, transform: `translateY(${(1 - k) * dy}px)` }; };
  const L = reel ? { lc: 560, ls: 0.52, t1: 840, t2: 920, ph: 1060, loc: 1160, fn: 1450 } : { lc: 300, ls: 0.42, t1: 520, t2: 590, ph: 690, loc: 776, fn: 960 };
  return <AbsoluteFill>
    <Mesh t={t} light base="#FFFFFF" colors={[THEMES.map.a, THEMES.uv.a, THEMES.check.a, THEMES.report.a]} />
    <Abs style={{ left: W / 2 - 893, top: L.lc - 276.5 }}><Logo scale={L.ls * (1 + 0.012 * seg(t, 1, 6))} iconPop={clamp(spr(t - 0.15, 12, 0.7), 0, 1.1)} wordReveal={out(t, 0.4, 1.0)} crossSpin={clamp(spr(t - 0.9, 16, 0.5), 0, 1.2)} /></Abs>
    <Abs style={{ left: 0, right: 0, top: L.t1, textAlign: 'center', fontFamily: 'Mont', fontWeight: 900, fontSize: reel ? 56 : 52, letterSpacing: '-.025em', ...e(1.1) }}><span style={{ background: RAINBOW, WebkitBackgroundClip: 'text', color: 'transparent' }}>Robotic UV-C disinfection</span></Abs>
    <Abs style={{ left: 0, right: 0, top: L.t2 - (reel ? 6 : 10), display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 22, fontFamily: 'Serif', fontStyle: 'italic', fontSize: reel ? 44 : 40, color: '#4B5D74', flexWrap: 'wrap', ...e(1.4) }}><span>by</span><SpotlessLogo width={reel ? 250 : 220} pill /><span>· booked through Careva+</span></Abs>
    <Abs style={{ left: 0, right: 0, top: L.ph, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18, fontFamily: 'Mont', fontWeight: 900, fontSize: reel ? 72 : 64, color: NAVY, ...e(1.8, 30) }}><Phone size={reel ? 56 : 50} />+91 96555 08881</Abs>
    <Abs style={{ left: 0, right: 0, top: L.loc, textAlign: 'center', fontFamily: 'Mono', fontSize: reel ? 24 : 21, letterSpacing: '.22em', color: '#4B5D74', ...e(2.1) }}>SALEM & NEARBY AREAS · CAREVAPLUS.COM</Abs>
    <Abs style={{ left: reel ? 90 : 360, right: reel ? 90 : 360, top: L.fn, textAlign: 'center', fontFamily: 'Mont', fontSize: reel ? 20 : 16, lineHeight: 1.45, color: '#6A7B8E', ...e(2.4, 10) }}>*Log 4 (99.99%) reduction validated by Spotless AI in NABL-accredited lab tests under controlled conditions; on-site validation recommended. UV-C cycles run in unoccupied rooms only. Console screens shown are illustrations.</Abs>
  </AbsoluteFill>;
};

/* =================================== film =================================== */
const Scene: React.FC<Ctx> = (c) => {
  const { t } = c;
  if (t < T.brand) return <Open {...c} />;
  if (t < T.map) return <Brand {...c} t={t - T.brand} />;
  if (t < T.check) return <MapScene {...c} t={t - T.map} />;
  if (t < T.uv) return <CheckScene {...c} t={t - T.check} />;
  if (t < T.rep) return <UvScene {...c} t={t - T.uv} />;
  if (t < T.clo) return <RepScene {...c} t={t - T.rep} />;
  if (t < T.end) return <Closer {...c} t={t - T.clo} />;
  return <End {...c} t={t - T.end} />;
};
const Frame: React.FC = () => {
  const f = useCurrentFrame(), { width: W, height: H, fps } = useVideoConfig(), t = f / fps, c = { t, W, H, reel: H > W };
  return <AbsoluteFill style={{ background: INK, overflow: 'hidden' }}><Scene {...c} /><Wipe {...c} /></AbsoluteFill>;
};
export const Film: React.FC<{ fast?: boolean }> = ({ fast }) => (
  <AbsoluteFill>
    <Fonts />
    {fast ? <Frame /> : <CameraMotionBlur shutterAngle={160} samples={4}><Frame /></CameraMotionBlur>}
    <Audio src={staticFile('score.wav')} />
  </AbsoluteFill>
);
