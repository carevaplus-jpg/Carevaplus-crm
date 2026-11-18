// Shared look: themes, fonts, easing, the robot, small UI parts.
import React from 'react';
import { continueRender, delayRender, staticFile, Easing, interpolate, random } from 'remotion';

export const THEMES = {
  map: { a: '#22D3EE', b: '#0EA5E9', name: 'Map' },
  check: { a: '#FBBF24', b: '#F97316', name: 'Check' },
  uv: { a: '#A78BFA', b: '#D946EF', name: 'UV-C' },
  report: { a: '#A3E635', b: '#22C55E', name: 'Report' },
} as const;
export const INK = '#060A18', NAVY = '#0E2D5C', RED = '#E5332A', CREAM = '#F6F7FB';
export const RAINBOW = `linear-gradient(100deg, ${THEMES.map.a}, ${THEMES.uv.a} 35%, ${THEMES.uv.b} 55%, ${THEMES.check.a} 80%, ${THEMES.report.a})`;

/* ---------- fonts ---------- */
const FONT_CSS = `
@font-face{font-family:'Mont';font-weight:100 900;src:url(${staticFile('fonts/montserrat-latin-wght-normal.woff2')}) format('woff2')}
@font-face{font-family:'Serif';font-style:italic;font-weight:400;src:url(${staticFile('fonts/instrument-serif-latin-400-italic.woff2')}) format('woff2')}
@font-face{font-family:'Mono';font-weight:500;src:url(${staticFile('fonts/jetbrains-mono-latin-500-normal.woff2')}) format('woff2')}`;
let fontsHandle: number | null = null;
export const Fonts: React.FC = () => {
  React.useState(() => {
    if (typeof document === 'undefined') return;
    fontsHandle = delayRender('fonts');
    const el = document.createElement('style'); el.textContent = FONT_CSS; document.head.appendChild(el);
    Promise.all(['800 40px Mont', '500 40px Mono', 'italic 40px Serif'].map(f => document.fonts.load(f))).then(() => continueRender(fontsHandle!));
  });
  return null;
};

/* ---------- maths ---------- */
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const eio = Easing.bezier(0.65, 0, 0.35, 1), eout = Easing.bezier(0.16, 1, 0.3, 1), ein = Easing.bezier(0.7, 0, 0.84, 0);
export const io = (t: number, a: number, b: number) => eio(seg(t, a, b));
export const out = (t: number, a: number, b: number) => eout(seg(t, a, b));
export function spr(t: number, w = 14, z = 0.8) { if (t <= 0) return 0; const wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t)); }
export const kf = (t: number, keys: [number, number][]) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; if (t <= b) return lerp(va, vb, eio((t - a) / (b - a))); } return keys[keys.length - 1][1]; };
export { interpolate, random };

/* ---------- absolute box ---------- */
export const Abs: React.FC<React.PropsWithChildren<{ style?: React.CSSProperties }>> = ({ style, children }) => <div style={{ position: 'absolute', ...style }}>{children}</div>;

/* ---------- glowing mesh background (drifting colour blobs) ---------- */
export const Mesh: React.FC<{ t: number; colors: string[]; base?: string; light?: boolean }> = ({ t, colors, base = INK, light }) => (
  <Abs style={{ inset: 0, background: base, overflow: 'hidden' }}>
    {colors.map((c, i) => {
      const x = 50 + 38 * Math.sin(t * 0.25 + i * 2.1), y = 50 + 34 * Math.cos(t * 0.21 + i * 1.7);
      return <Abs key={i} style={{ left: `${x}%`, top: `${y}%`, width: '110%', height: '110%', transform: 'translate(-50%,-50%)', background: `radial-gradient(closest-side, ${c}${light ? '55' : '66'}, ${c}00)` }} />;
    })}
    {!light && <Abs style={{ inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,.07) 1.2px, transparent 1.6px)', backgroundSize: '36px 36px' }} />}
    <Abs style={{ inset: 0, background: `radial-gradient(ellipse 80% 80% at 50% 50%, transparent 55%, ${light ? 'rgba(14,45,92,.10)' : 'rgba(0,0,0,.55)'} 100%)` }} />
  </Abs>
);

/* ---------- the robot (original illustration) ---------- */
export const Robot: React.FC<{ lamp?: number; eye?: string; size?: number; glowColor?: string }> = ({ lamp = 0, eye = '#47B6F0', size = 260, glowColor = '#C4B5FF' }) => (
  <svg viewBox="0 0 120 260" width={size * 120 / 260} height={size} style={{ overflow: 'visible', display: 'block' }}>
    <defs>
      <linearGradient id="rb" x1="0" x2="1"><stop offset="0" stopColor="#C9D3E2" /><stop offset=".45" stopColor="#FFFFFF" /><stop offset="1" stopColor="#B5C1D3" /></linearGradient>
      <linearGradient id="rk" x1="0" x2="1"><stop offset="0" stopColor="#0A1A33" /><stop offset=".5" stopColor="#1D3A66" /><stop offset="1" stopColor="#0A1A33" /></linearGradient>
    </defs>
    <ellipse cx="60" cy="251" rx="54" ry="9" fill="rgba(0,0,0,.4)" />
    <rect x="12" y="214" width="96" height="34" rx="15" fill="url(#rk)" />
    <rect x="20" y="222" width="80" height="4" rx="2" fill={eye} opacity=".9" />
    <rect x="32" y="44" width="56" height="176" rx="26" fill="url(#rb)" />
    {[41, 56, 71].map((x, i) => <rect key={i} x={x} y={i === 1 ? 58 : 62} width="8" height={i === 1 ? 148 : 140} rx="4" fill={lamp > 0.05 ? '#E4DCFF' : '#C9D3E6'} />)}
    <g opacity={lamp}>{[35, 50, 65].map((x, i) => <rect key={i} x={x} y={i === 1 ? 52 : 56} width="20" height={i === 1 ? 160 : 152} rx="10" fill={glowColor} opacity=".65" />)}</g>
    <rect x="28" y="196" width="64" height="12" rx="6" fill={NAVY} /><circle cx="82" cy="202" r="3" fill={lamp > 0.5 ? '#C4B5FF' : '#A3E635'} />
    <rect x="38" y="12" width="44" height="36" rx="15" fill="url(#rk)" />
    <circle cx="51" cy="29" r="5.5" fill={eye} /><circle cx="69" cy="29" r="5.5" fill={eye} /><circle cx="51" cy="29" r="2" fill="#fff" /><circle cx="69" cy="29" r="2" fill="#fff" />
  </svg>
);

/* ---------- icons ---------- */
export const Tick: React.FC<{ size?: number; color?: string }> = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const Phone: React.FC<{ size?: number; color?: string }> = ({ size = 44, color = '#3E8A16' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg>
);
export const Cursor: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size * 1.3} viewBox="0 0 22 28" style={{ overflow: 'visible', display: 'block' }}><path d="M2 2v20l5.5-5 3.6 8.2 3.4-1.5-3.6-8H18z" fill="#fff" stroke="#0E2D5C" strokeWidth="1.6" strokeLinejoin="round" /></svg>
);

/* ---------- Careva+ logo (user supplied) ---------- */
export const Logo: React.FC<{ scale: number; crossSpin?: number; wordReveal?: number; iconPop?: number }> = ({ scale, crossSpin = 1, wordReveal = 1, iconPop = 1 }) => (
  <div style={{ position: 'relative', width: 1786, height: 553, transform: `scale(${scale})`, transformOrigin: '50% 50%' }}>
    <img src={staticFile('logo-icon.png')} style={{ position: 'absolute', left: 0, top: 0, width: 815, height: 553, transform: `scale(${iconPop})`, transformOrigin: '50% 100%', opacity: clamp(iconPop * 1.5) }} />
    <img src={staticFile('logo-word.png')} style={{ position: 'absolute', left: 860, top: 213, width: 749, height: 143, clipPath: `inset(0 ${(1 - wordReveal) * 100}% 0 0)` }} />
    <img src={staticFile('logo-cross.png')} style={{ position: 'absolute', left: 1606, top: 209, width: 180, height: 150, transform: `rotate(${(1 - crossSpin) * -180}deg) scale(${crossSpin})`, opacity: clamp(crossSpin * 2) }} />
  </div>
);

/* ---------- glass card ---------- */
export const Glass: React.FC<React.PropsWithChildren<{ w: number; h: number; accent: string; dark?: boolean; style?: React.CSSProperties }>> = ({ w, h, accent, dark = true, style, children }) => (
  <div style={{ position: 'absolute', width: w, height: h, left: -w / 2, top: -h / 2, borderRadius: 30, overflow: 'hidden',
    background: dark ? 'linear-gradient(160deg, rgba(22,30,58,.92), rgba(10,14,32,.94))' : '#FFFFFF',
    border: `1.5px solid ${dark ? accent + '55' : '#E4E8EF'}`,
    boxShadow: dark ? `0 40px 100px -30px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,.04), 0 0 80px -20px ${accent}55` : '0 40px 90px -40px rgba(14,45,92,.35)', ...style }}>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 58, borderBottom: `1px solid ${dark ? 'rgba(255,255,255,.08)' : '#E4E8EF'}` }}>
      {[24, 46, 68].map(x => <div key={x} style={{ position: 'absolute', left: x, top: 22, width: 13, height: 13, borderRadius: 7, background: dark ? 'rgba(255,255,255,.14)' : '#E4E8EF' }} />)}
      <div style={{ position: 'absolute', left: 100, top: 19, fontFamily: 'Mono', fontSize: 15, letterSpacing: '.16em', textTransform: 'uppercase', color: dark ? accent : '#6A7B8E' }}>UV-C robot console</div>
    </div>
    {children}
  </div>
);
