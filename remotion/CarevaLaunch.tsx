import React from "react";
import {
  AbsoluteFill,
  Html5Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";

// Brand palette (from logo + app theme-color)
const C = {
  navy: "#0B2F5E",
  blue: "#1E88E5",
  sky: "#4FC3F7",
  green: "#5DB82B",
  lime: "#A5D63A",
  red: "#E53935",
  ink: "#0F1B2D",
  muted: "#5B6B82",
  line: "#E4ECF5",
  bg: "#F5F9FF",
};
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

const useSpring = (delay = 0, damping = 18, mass = 0.8) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass } });
};

/* ---------- shared pieces ---------- */

const Background: React.FC = () => {
  const f = useCurrentFrame();
  const blob = (x: number, y: number, size: number, color: string, speed: number) => (
    <div
      style={{
        position: "absolute",
        left: x + Math.sin(f / speed) * 60,
        top: y + Math.cos(f / (speed * 1.3)) * 50,
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        filter: "blur(120px)",
        opacity: 0.35,
      }}
    />
  );
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, #FFFFFF 0%, ${C.bg} 55%, #EAF4FF 100%)`, overflow: "hidden" }}>
      {blob(-200, -150, 700, C.sky, 40)}
      {blob(1350, 600, 760, C.lime, 46)}
      {blob(900, -300, 500, C.blue, 52)}
      {/* subtle dot grid */}
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${C.navy}14 1.5px, transparent 1.5px)`,
          backgroundSize: "36px 36px",
          maskImage: "linear-gradient(180deg, transparent, black 30%, black 70%, transparent)",
        }}
      />
    </AbsoluteFill>
  );
};

/** Cross-fades a scene in/out over `edge` frames. */
const Scene: React.FC<{ dur: number; fadeIn?: boolean; fadeOut?: boolean; children: React.ReactNode }> = ({
  dur,
  fadeIn = true,
  fadeOut = true,
  children,
}) => {
  const f = useCurrentFrame();
  const edge = 12;
  const inO = fadeIn ? interpolate(f, [0, edge], [0, 1], clamp) : 1;
  const outO = fadeOut ? interpolate(f, [dur - edge, dur], [1, 0], clamp) : 1;
  const outScale = fadeOut ? interpolate(f, [dur - edge, dur], [1, 1.04], clamp) : 1;
  return (
    <AbsoluteFill style={{ opacity: inO * outO, transform: `scale(${outScale})`, fontFamily: FONT }}>
      {children}
    </AbsoluteFill>
  );
};

const Kicker: React.FC<{ children: React.ReactNode; color?: string; delay?: number }> = ({ children, color = C.green, delay = 0 }) => {
  const s = useSpring(delay);
  return (
    <div
      style={{
        display: "inline-flex",
        alignSelf: "flex-start",
        alignItems: "center",
        gap: 10,
        padding: "10px 20px",
        borderRadius: 999,
        background: `${color}1A`,
        color,
        fontWeight: 700,
        fontSize: 22,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        opacity: s,
        transform: `translateY(${(1 - s) * 20}px)`,
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 5, background: color }} />
      {children}
    </div>
  );
};

/** Headline with a word-by-word rise. */
const Headline: React.FC<{ text: string; delay?: number; size?: number; accent?: string[] }> = ({
  text,
  delay = 0,
  size = 78,
  accent = [],
}) => {
  const f = useCurrentFrame();
  return (
    <div style={{ fontSize: size, fontWeight: 800, color: C.navy, lineHeight: 1.08, letterSpacing: -2 }}>
      {text.split(" ").map((w, i) => {
        const p = interpolate(f, [delay + i * 3, delay + i * 3 + 16], [0, 1], { ...clamp, easing: easeOut });
        const isAccent = accent.includes(w.replace(/[.,]/g, ""));
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: 6 }}>
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${(1 - p) * 100}%)`,
                opacity: p,
                color: isAccent ? C.green : undefined,
              }}
            >
              {w}&nbsp;
            </span>
          </span>
        );
      })}
    </div>
  );
};

const Sub: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [delay, delay + 18], [0, 1], { ...clamp, easing: easeOut });
  return (
    <div style={{ fontSize: 30, color: C.muted, fontWeight: 500, lineHeight: 1.45, opacity: p, transform: `translateY(${(1 - p) * 16}px)`, maxWidth: 680 }}>
      {children}
    </div>
  );
};

const Phone: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      width: 420,
      height: 860,
      borderRadius: 64,
      background: "#0E1726",
      padding: 14,
      boxShadow: "0 60px 120px -30px rgba(11,47,94,0.45), 0 0 0 2px #2A3546 inset",
      position: "relative",
      ...style,
    }}
  >
    <div style={{ width: "100%", height: "100%", borderRadius: 52, overflow: "hidden", background: "#fff", position: "relative" }}>
      {/* status bar */}
      <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 34px", fontSize: 17, fontWeight: 700, color: C.ink }}>
        <span>9:41</span>
        <div style={{ width: 110, height: 30, borderRadius: 20, background: "#0E1726", position: "absolute", left: "50%", top: 10, transform: "translateX(-50%)" }} />
        <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ width: 18, height: 11, borderRadius: 2, border: `2px solid ${C.ink}` }} />
        </span>
      </div>
      {children}
    </div>
  </div>
);

const Icon: React.FC<{ kind: "nurse" | "physio" | "elder" | "doctor" | "check" | "pin" | "clock"; color: string; size?: number }> = ({ kind, color, size = 30 }) => {
  const s = { width: size, height: size, fill: "none", stroke: color, strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (kind) {
    case "nurse":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M12 3v18M3 12h18" /></svg>);
    case "physio":
      return (<svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="5" r="2" /><path d="M12 7v6l-4 7M12 13l4 7M7 10h10" /></svg>);
    case "elder":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" /></svg>);
    case "doctor":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M6 3v6a4 4 0 0 0 8 0V3" /><path d="M10 13v3a4 4 0 0 0 8 0v-2" /><circle cx="18" cy="12" r="2" /></svg>);
    case "check":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>);
    case "pin":
      return (<svg viewBox="0 0 24 24" {...s}><path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z" /><circle cx="12" cy="10" r="2.2" /></svg>);
    case "clock":
      return (<svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
  }
};

/* ---------- Scene 1: logo reveal ---------- */

const SceneLogo: React.FC = () => {
  const f = useCurrentFrame();
  const s = useSpring(4, 16, 1);
  const blur = interpolate(f, [4, 26], [24, 0], clamp);
  const ring = interpolate(f, [0, 40], [0, 1], { ...clamp, easing: easeOut });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {/* expanding rings */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 1400,
            height: 1400,
            borderRadius: "50%",
            border: `2px solid ${i === 1 ? C.green : C.blue}`,
            opacity: (1 - ring) * 0.5,
            transform: `scale(${0.2 + ring * (0.6 + i * 0.25)})`,
          }}
        />
      ))}
      <div
        style={{
          background: "#fff",
          borderRadius: 48,
          padding: "26px 48px",
          boxShadow: "0 40px 100px -30px rgba(11,47,94,0.35)",
          transform: `scale(${0.82 + s * 0.18})`,
          opacity: s,
          filter: `blur(${blur}px)`,
        }}
      >
        <Img src={staticFile("careva-logo.png")} style={{ width: 1020, display: "block" }} />
      </div>
      <div style={{ marginTop: 56, textAlign: "center" }}>
        <Headline text="Hospital care, in the comfort of your home." delay={30} size={60} accent={["home"]} />
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Scene 2: patient booking ---------- */

const services = [
  { t: "Nursing Care", k: "nurse" as const, c: C.red },
  { t: "Physiotherapy", k: "physio" as const, c: C.blue },
  { t: "Elder Care", k: "elder" as const, c: C.green },
  { t: "Doctor Visit", k: "doctor" as const, c: C.navy },
];

const SceneBooking: React.FC = () => {
  const f = useCurrentFrame();
  const phoneIn = useSpring(6, 20, 1);
  const tapAt = 46;
  const tap = interpolate(f, [tapAt, tapAt + 14], [0, 1], clamp);
  const sheet = useSpring(tapAt + 12, 18, 0.9);
  const check = interpolate(f, [tapAt + 24, tapAt + 40], [0, 1], { ...clamp, easing: easeOut });
  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 160px", gap: 120 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 30 }}>
        <Kicker>For patients &amp; families</Kicker>
        <Headline text="Book trusted care in a few taps." delay={6} accent={["trusted", "care"]} />
        <Sub delay={20}>Nurses, physiotherapists, elder care and doctor visits — at your doorstep.</Sub>
      </div>
      <Phone style={{ transform: `translateY(${(1 - phoneIn) * 500}px) rotate(${(1 - phoneIn) * 6}deg)` }}>
        <div style={{ padding: "18px 28px" }}>
          <div style={{ fontSize: 18, color: C.muted, fontWeight: 600 }}>Good evening</div>
          <div style={{ fontSize: 32, color: C.navy, fontWeight: 800, marginTop: 2 }}>How can we help?</div>
          <div style={{ marginTop: 22, padding: "16px 18px", borderRadius: 18, background: C.bg, color: C.muted, fontSize: 17, display: "flex", gap: 10, alignItems: "center" }}>
            <Icon kind="pin" color={C.blue} size={22} /> Home · Salem
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 22 }}>
            {services.map((s, i) => {
              const p = interpolate(f, [14 + i * 4, 30 + i * 4], [0, 1], { ...clamp, easing: easeOut });
              const pressed = i === 0 ? 1 - Math.sin(tap * Math.PI) * 0.06 : 1;
              return (
                <div
                  key={s.t}
                  style={{
                    height: 150,
                    borderRadius: 22,
                    background: i === 0 && tap > 0.3 ? `${s.c}12` : "#fff",
                    border: `2px solid ${i === 0 && tap > 0.3 ? s.c : C.line}`,
                    padding: 18,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    opacity: p,
                    transform: `translateY(${(1 - p) * 30}px) scale(${pressed})`,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: `${s.c}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon kind={s.k} color={s.c} />
                  </div>
                  <div style={{ fontSize: 19, fontWeight: 700, color: C.ink }}>{s.t}</div>
                  {i === 0 && (
                    <div
                      style={{
                        position: "absolute",
                        left: 110,
                        top: 70,
                        width: 300,
                        height: 300,
                        marginLeft: -150,
                        marginTop: -150,
                        borderRadius: "50%",
                        background: s.c,
                        opacity: (1 - tap) * 0.25,
                        transform: `scale(${tap})`,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 22, fontSize: 18, fontWeight: 700, color: C.ink }}>Upcoming</div>
          <div style={{ marginTop: 10, height: 70, borderRadius: 18, background: C.bg }} />
        </div>
        {/* confirmation sheet */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 400,
            background: "#fff",
            borderRadius: "34px 34px 0 0",
            boxShadow: "0 -20px 60px rgba(11,47,94,0.18)",
            transform: `translateY(${(1 - sheet) * 420}px)`,
            padding: 30,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ width: 48, height: 5, borderRadius: 3, background: C.line }} />
          <div
            style={{
              marginTop: 26,
              width: 84,
              height: 84,
              borderRadius: 42,
              background: C.green,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${0.6 + check * 0.4})`,
              boxShadow: `0 0 0 ${check * 14}px ${C.green}22`,
            }}
          >
            <Icon kind="check" color="#fff" size={46} />
          </div>
          <div style={{ marginTop: 20, fontSize: 26, fontWeight: 800, color: C.navy }}>Visit confirmed</div>
          <div style={{ marginTop: 6, fontSize: 18, color: C.muted, fontWeight: 500 }}>Nursing Care · Today, 4:30 PM</div>
          <div style={{ marginTop: 22, width: "100%", padding: "16px 18px", borderRadius: 18, background: C.bg, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 23, background: `linear-gradient(135deg, ${C.sky}, ${C.blue})` }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>Nurse Priya</div>
              <div style={{ fontSize: 15, color: C.muted }}>Verified care staff</div>
            </div>
          </div>
        </div>
      </Phone>
    </AbsoluteFill>
  );
};

/* ---------- Scene 3: live GPS ---------- */

const route: [number, number][] = [
  [60, 640], [60, 520], [170, 520], [170, 380], [290, 380], [290, 250], [330, 250], [330, 170],
];
const routeLens = route.slice(1).map((p, i) => Math.hypot(p[0] - route[i][0], p[1] - route[i][1]));
const routeTotal = routeLens.reduce((a, b) => a + b, 0);
const pointAt = (t: number): [number, number] => {
  let d = t * routeTotal;
  for (let i = 0; i < routeLens.length; i++) {
    if (d <= routeLens[i]) {
      const k = d / routeLens[i];
      return [route[i][0] + (route[i + 1][0] - route[i][0]) * k, route[i][1] + (route[i + 1][1] - route[i][1]) * k];
    }
    d -= routeLens[i];
  }
  return route[route.length - 1];
};

const SceneGPS: React.FC = () => {
  const f = useCurrentFrame();
  const phoneIn = useSpring(4, 20, 1);
  const progress = interpolate(f, [16, 104], [0, 0.93], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const [mx, my] = pointAt(progress);
  const path = route.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  const eta = Math.max(2, Math.round(9 - progress * 7));
  const pulse = (f % 30) / 30;
  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 160px", gap: 120 }}>
      <Phone style={{ transform: `translateX(${(1 - phoneIn) * -700}px)` }}>
        {/* map */}
        <svg width={392} height={780} style={{ position: "absolute", left: 0, top: 52 }}>
          <rect width="392" height="780" fill="#EEF3F0" />
          <rect x="200" y="420" width="170" height="140" rx="16" fill="#D7EDC8" />
          <rect x="20" y="60" width="140" height="160" rx="16" fill="#D7EDC8" />
          <path d="M-20 700 C 120 640, 260 720, 420 640" stroke="#BFE0F7" strokeWidth="34" fill="none" />
          {[60, 170, 290, 330].map((x) => (<line key={`v${x}`} x1={x} y1={0} x2={x} y2={780} stroke="#fff" strokeWidth={18} />))}
          {[170, 250, 380, 520, 640].map((y) => (<line key={`h${y}`} x1={0} y1={y} x2={392} y2={y} stroke="#fff" strokeWidth={18} />))}
          <path d={path} stroke={C.blue} strokeOpacity={0.2} strokeWidth={10} fill="none" strokeLinejoin="round" />
          <path
            d={path}
            stroke={C.blue}
            strokeWidth={8}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={routeTotal}
            strokeDashoffset={routeTotal * (1 - progress)}
          />
          {/* home pin */}
          <circle cx={330} cy={170} r={18 + pulse * 30} fill={C.red} opacity={(1 - pulse) * 0.3} />
          <circle cx={330} cy={170} r={16} fill={C.red} stroke="#fff" strokeWidth={5} />
          {/* staff marker */}
          <circle cx={mx} cy={my} r={30} fill={C.blue} opacity={0.18} />
          <circle cx={mx} cy={my} r={15} fill={C.blue} stroke="#fff" strokeWidth={5} />
        </svg>
        {/* ETA card */}
        <div
          style={{
            position: "absolute",
            left: 18,
            right: 18,
            bottom: 22,
            background: "#fff",
            borderRadius: 26,
            padding: 22,
            boxShadow: "0 20px 50px rgba(11,47,94,0.22)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 54, height: 54, borderRadius: 27, background: `linear-gradient(135deg, ${C.sky}, ${C.blue})` }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>Priya is on the way</div>
              <div style={{ fontSize: 15, color: C.muted, fontWeight: 500 }}>Nursing Care · Live location</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: C.green, lineHeight: 1 }}>{eta}</div>
              <div style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>min</div>
            </div>
          </div>
          <div style={{ marginTop: 16, height: 8, borderRadius: 4, background: C.line }}>
            <div style={{ width: `${progress * 100}%`, height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${C.blue}, ${C.green})` }} />
          </div>
        </div>
      </Phone>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 30 }}>
        <Kicker color={C.blue} delay={4}>Live GPS tracking</Kicker>
        <Headline text="Know exactly when your caregiver arrives." delay={10} accent={["exactly"]} />
        <Sub delay={24}>Real-time location and ETA for every visit — peace of mind for the whole family.</Sub>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Scene 4: office dashboard ---------- */

const Counter: React.FC<{ to: number; delay: number; suffix?: string }> = ({ to, delay, suffix = "" }) => {
  const f = useCurrentFrame();
  const v = interpolate(f, [delay, delay + 34], [0, to], { ...clamp, easing: easeOut });
  return <>{Math.round(v)}{suffix}</>;
};

const SceneOffice: React.FC = () => {
  const f = useCurrentFrame();
  const win = useSpring(4, 20, 1);
  const kpis = [
    { l: "Visits today", v: 128, c: C.blue },
    { l: "Staff on duty", v: 42, c: C.green },
    { l: "On-time arrivals", v: 98, s: "%", c: C.navy },
  ];
  const bars = [40, 62, 48, 76, 58, 88, 70, 94];
  const visits = [
    { n: "R. Kumar", s: "Physiotherapy", st: "In progress", c: C.blue },
    { n: "S. Meena", s: "Nursing Care", st: "Completed", c: C.green },
    { n: "A. Rajan", s: "Elder Care", st: "En route", c: "#F59E0B" },
  ];
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 70 }}>
      <div style={{ display: "flex", flexDirection: "column" }}><Kicker color={C.navy} delay={0}>Careva+ Office</Kicker></div>
      <div style={{ marginTop: 22, textAlign: "center" }}>
        <Headline text="Every visit. Every caregiver. One dashboard." delay={4} size={64} accent={["One", "dashboard"]} />
      </div>
      <div
        style={{
          marginTop: 40,
          width: 1440,
          height: 600,
          borderRadius: 28,
          background: "#fff",
          boxShadow: "0 60px 120px -40px rgba(11,47,94,0.4)",
          overflow: "hidden",
          display: "flex",
          transform: `translateY(${(1 - win) * 300}px) perspective(2000px) rotateX(${(1 - win) * 18}deg)`,
          opacity: win,
        }}
      >
        <div style={{ width: 240, background: C.navy, padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 26 }}>Careva<span style={{ color: C.red }}>+</span></div>
          {["Dashboard", "Visits", "Care staff", "Patients", "Billing"].map((t, i) => (
            <div key={t} style={{ color: i === 0 ? "#fff" : "#9FB3CF", fontSize: 18, fontWeight: 600, padding: "10px 14px", borderRadius: 12, background: i === 0 ? "rgba(255,255,255,0.12)" : "transparent" }}>
              {t}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, padding: 34, display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", gap: 20 }}>
            {kpis.map((k, i) => {
              const p = interpolate(f, [10 + i * 5, 26 + i * 5], [0, 1], { ...clamp, easing: easeOut });
              return (
                <div key={k.l} style={{ flex: 1, borderRadius: 20, border: `2px solid ${C.line}`, padding: "20px 24px", opacity: p, transform: `translateY(${(1 - p) * 20}px)` }}>
                  <div style={{ fontSize: 17, color: C.muted, fontWeight: 600 }}>{k.l}</div>
                  <div style={{ fontSize: 52, fontWeight: 800, color: k.c, marginTop: 4 }}>
                    <Counter to={k.v} delay={12 + i * 5} suffix={k.s} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 20, flex: 1 }}>
            <div style={{ flex: 1.1, borderRadius: 20, border: `2px solid ${C.line}`, padding: 24, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>Visits this week</div>
              <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 16, marginTop: 14 }}>
                {bars.map((h, i) => {
                  const p = interpolate(f, [18 + i * 3, 40 + i * 3], [0, 1], { ...clamp, easing: easeOut });
                  return (
                    <div key={i} style={{ flex: 1, height: `${h * p}%`, borderRadius: 10, background: i === bars.length - 1 ? `linear-gradient(180deg, ${C.lime}, ${C.green})` : `linear-gradient(180deg, ${C.sky}, ${C.blue})` }} />
                  );
                })}
              </div>
            </div>
            <div style={{ flex: 1, borderRadius: 20, border: `2px solid ${C.line}`, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>Live visits</div>
              {visits.map((v, i) => {
                const p = interpolate(f, [24 + i * 6, 40 + i * 6], [0, 1], { ...clamp, easing: easeOut });
                return (
                  <div key={v.n} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 14, background: C.bg, opacity: p, transform: `translateX(${(1 - p) * 40}px)` }}>
                    <div style={{ width: 40, height: 40, borderRadius: 20, background: `${v.c}30` }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: C.ink }}>{v.n}</div>
                      <div style={{ fontSize: 14, color: C.muted }}>{v.s}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: v.c, background: `${v.c}18`, padding: "6px 12px", borderRadius: 999 }}>{v.st}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Scene 5: CTA ---------- */

const SceneCTA: React.FC = () => {
  const f = useCurrentFrame();
  const logo = useSpring(0, 16, 1);
  const btn = useSpring(26, 14, 0.8);
  const shine = interpolate(f, [44, 70], [-30, 130], clamp);
  const roles = ["Patients", "Care Staff", "Office"];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 40, padding: "20px 40px", boxShadow: "0 40px 100px -30px rgba(11,47,94,0.3)", transform: `scale(${0.85 + logo * 0.15})`, opacity: logo }}>
        <Img src={staticFile("careva-logo.png")} style={{ width: 760, display: "block" }} />
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 44 }}>
        {roles.map((r, i) => {
          const p = interpolate(f, [12 + i * 4, 26 + i * 4], [0, 1], { ...clamp, easing: easeOut });
          return (
            <div key={r} style={{ padding: "12px 26px", borderRadius: 999, border: `2px solid ${C.line}`, background: "#fff", fontSize: 24, fontWeight: 700, color: C.navy, opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}>
              {r}
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 44,
          padding: "26px 60px",
          borderRadius: 999,
          background: `linear-gradient(135deg, ${C.green}, #3E9B1F)`,
          color: "#fff",
          fontSize: 34,
          fontWeight: 800,
          position: "relative",
          overflow: "hidden",
          transform: `scale(${btn})`,
          boxShadow: `0 24px 50px -16px ${C.green}`,
        }}
      >
        The Careva+ app is now live
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${shine}%`, width: 80, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)", transform: "skewX(-20deg)" }} />
      </div>
      <div style={{ marginTop: 30, fontSize: 24, fontWeight: 600, color: C.muted, opacity: interpolate(f, [36, 50], [0, 1], clamp) }}>
        Careva+ Home Health Care · Salem, Tamil Nadu
      </div>
    </AbsoluteFill>
  );
};

/* ---------- timeline (15s @ 30fps) ---------- */

const T = [
  { from: 0, dur: 90, C: SceneLogo, fadeIn: false },
  { from: 82, dur: 120, C: SceneBooking },
  { from: 194, dur: 120, C: SceneGPS },
  { from: 306, dur: 76, C: SceneOffice },
  { from: 374, dur: 76, C: SceneCTA, fadeOut: false },
];

/* ---------- sound (frame-synced) ---------- */

// [frame, file, volume]. Music beat = 14 frames; cuts sit on beats 6/14/22, final chord on beat 30 (frame 418).
const SFX: [number, string, number][] = [
  [4, "impact-bass-1", 0.18],
  [22, "sparkle", 0.3],
  [76, "whoosh", 0.5],
  [128, "click-soft", 0.8],
  [142, "chime", 0.4],
  [188, "whoosh", 0.5],
  [214, "ping", 0.3],
  [294, "notification", 0.3],
  [300, "whoosh-short", 0.5],
  [316, "pop", 0.22],
  [321, "pop", 0.22],
  [326, "pop", 0.22],
  [368, "whoosh", 0.55],
  [400, "pop", 0.45],
  [418, "impact-bass-1", 0.3],
  [418, "sparkle", 0.4],
];

const Sound: React.FC = () => (
  <>
    <Html5Audio src={staticFile("audio/careva-bed.wav")} volume={0.5} />
    {SFX.map(([from, file, vol], i) => (
      <Sequence key={i} from={from} layout="none">
        <Html5Audio src={staticFile(`audio/sfx/${file}.mp3`)} volume={vol} />
      </Sequence>
    ))}
  </>
);

export const CarevaLaunch: React.FC = () => (
  <AbsoluteFill>
    <Sound />
    <Background />
    {T.map(({ from, dur, C: Comp, fadeIn, fadeOut }) => (
      <Sequence key={from} from={from} durationInFrames={dur}>
        <Scene dur={dur} fadeIn={fadeIn} fadeOut={fadeOut}>
          <Comp />
        </Scene>
      </Sequence>
    ))}
  </AbsoluteFill>
);
