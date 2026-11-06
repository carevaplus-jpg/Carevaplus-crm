import React from "react";
import {
  AbsoluteFill,
  Easing,
  OffthreadVideo,
  Img,
  Sequence,
  interpolate,
  random,
  staticFile,
  getInputProps,
  useCurrentFrame,
} from "remotion";

/**
 * BNI Dignity Salem promo — 40.8s source tightened to a 30s cut.
 *
 * Music is ~92.2 BPM (beat = 0.6505s), grid t = 0.44 + 0.6505k.
 * Every removal is a whole number of beats taken from a static hold, so the
 * score stays on the beat (audio is cut sample-accurately in scripts/bni-audio.sh).
 */
export const BEAT = 0.6505;
export const SEGMENTS: [number, number][] = [
  [0, 8.896], //        intro → Feature Presentation → LifeTech enters   (−2 beats: LifeTech hold)
  [10.197, 14.751], //  LifeTech → Mr. Praveen K.S + name card            (−2 beats: portrait hold)
  [16.052, 22.557], //  portrait → Save the Date build                    (−2 beats: list hold)
  [23.858, 25.81], //   list → poster recap enters                        (−4 beats: poster hold)
  [28.41, 35.567], //   poster break → DROP → Register Now / CTA          (−6 beats: CTA hold)
  [39.47, 40.406], //   outro fade
];

import TRACK from "./bni-logo-track.json";

const FPS = 30;
const LOGO = staticFile("brand/lifetech-logo.jpg");
const track = TRACK as unknown as Record<string, number[]>;

/** New LifeTech logo pinned over the old one, following the tracked white card. */
const LogoPlate: React.FC<{ srcFrame: number }> = ({ srcFrame }) => {
  const t = track[String(srcFrame)];
  if (!t) return null;
  const [x0, y0, x1, y1, r, g, b, blur, gray, opacity] = t;
  const big = srcFrame < 400;
  const inset = big ? 5 : 3;
  const w = x1 - x0 - inset * 2;
  const h = y1 - y0 - inset * 2;
  return (
    <div
      style={{
        position: "absolute",
        left: x0 + inset,
        top: y0 + inset,
        width: w,
        height: h,
        borderRadius: big ? 12 : 6,
        overflow: "hidden",
        background: "#fff",
        opacity,
        filter: `${blur ? `blur(${blur}px) ` : ""}${gray ? `grayscale(${gray})` : ""}` || undefined,
      }}
    >
      <Img src={LOGO} style={{ position: "absolute", left: "4%", top: "6%", width: "92%", height: "88%", objectFit: "contain" }} />
      {/* match the plate's light: multiply by the card colour measured in this frame */}
      <div style={{ position: "absolute", inset: 0, mixBlendMode: "multiply", background: `rgb(${r * 255},${g * 255},${b * 255})` }} />
    </div>
  );
};

const Plate: React.FC<{ start: number; logo?: boolean }> = ({ start, logo = true }) => {
  const f = useCurrentFrame();
  return (
    <>
      <OffthreadVideo src={SRC} startFrom={start} muted style={{ width: "100%", height: "100%" }} />
      {logo && <LogoPlate srcFrame={start + f} />}
    </>
  );
};
// pass --props='{"hd":true}' with --scale=1.5 for the 1080x1920 master (pre-upscaled, denoised source)
const SRC = staticFile((getInputProps() as { hd?: boolean }).hd ? "edit/bni-source-1080.mp4" : "edit/bni-source.mp4");
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// output start time (s) of each segment
const OUT_START: number[] = SEGMENTS.reduce<number[]>((acc, [a, b], i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + (SEGMENTS[i - 1][1] - SEGMENTS[i - 1][0]));
  return acc;
}, []);
const toOut = (src: number) => {
  for (let i = SEGMENTS.length - 1; i >= 0; i--) if (src >= SEGMENTS[i][0]) return OUT_START[i] + (src - SEGMENTS[i][0]);
  return src;
};

const CUTS = OUT_START.slice(1, 5).map((s) => Math.round(s * FPS)); // jump cuts to disguise
const DROP = Math.round(toOut(31.664) * FPS); // "Register Now" bass drop
const TRANSITIONS = [6.2, 11.27, 17.1, 25.1, 30.93].map((s) => Math.round(toOut(s) * FPS));
// beat frames in the CTA section after the drop
const CTA_BEATS = Array.from({ length: 12 }, (_, i) => Math.round(toOut(31.664 + i * BEAT) * FPS)).filter(
  (f) => f < Math.round(toOut(35.567) * FPS),
);

/** decaying envelope after the most recent trigger frame */
const env = (f: number, triggers: number[], len: number) => {
  let v = 0;
  for (const t of triggers) if (f >= t && f < t + len) v = Math.max(v, 1 - (f - t) / len);
  return v;
};

const Footage: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <>
    {SEGMENTS.map(([a, b], i) => {
      const from = Math.round(OUT_START[i] * FPS);
      const next = i < SEGMENTS.length - 1 ? Math.round(OUT_START[i + 1] * FPS) : Math.round((OUT_START[i] + b - a) * FPS);
      return (
        <Sequence key={i} from={from} durationInFrames={next - from} layout="none">
          <AbsoluteFill style={style}>
            <Plate start={Math.round(a * FPS)} />
          </AbsoluteFill>
        </Sequence>
      );
    })}
  </>
);

/** Clean cut: original footage + new logo only. Each hidden jump cut gets a 6-frame dissolve
 *  from the outgoing shot (continued past the cut) so the holds read as one smooth shot. */
const DISSOLVE = 6;
// measured alignment (scale, dx, dy in 720-wide px) that maps the last outgoing frame onto the first incoming frame
const ALIGN: [number, number, number][] = [
  [0.982, 0, -9],
  [1, 0, 0],
  [1, 0, 0],
  [1.016, 0, 1],
];
const CleanCut: React.FC = () => {
  const f = useCurrentFrame();
  const end = interpolate(f, [870, 899], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ opacity: end }}>
        <Footage />
        {SEGMENTS.slice(0, 4).map(([, b], i) => {
          const at = Math.round(OUT_START[i + 1] * FPS);
          return (
            <Sequence key={i} from={at} durationInFrames={DISSOLVE} layout="none">
              <Dissolve srcStart={Math.round(b * FPS)} align={ALIGN[i]} />
              <IncomingLogo srcStart={Math.round(SEGMENTS[i + 1][0] * FPS)} />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
const Dissolve: React.FC<{ srcStart: number; align: [number, number, number] }> = ({ srcStart, align: [sc, dx, dy] }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: interpolate(f, [0, DISSOLVE], [1, 0], clamp), transform: `translate(${dx}px, ${dy}px) scale(${sc})` }}>
      <Plate start={srcStart} logo={false} />
    </AbsoluteFill>
  );
};
/** keeps exactly one (the incoming shot's) new logo on screen through a dissolve */
const IncomingLogo: React.FC<{ srcStart: number }> = ({ srcStart }) => {
  const f = useCurrentFrame();
  return <LogoPlate srcFrame={srcStart + f} />;
};

export const BNICut: React.FC = () => {
  if (!(getInputProps() as { fx?: boolean }).fx) return <CleanCut />;
  const f = useCurrentFrame();

  // --- camera: punch-ins on cuts/transitions, beat pulses, drop shake ---
  const cutPunch = env(f, CUTS, 10);
  const transPunch = env(f, TRANSITIONS, 12);
  const dropHit = env(f, [DROP], 18);
  const beat = env(f, CTA_BEATS, 7);
  const ease = (x: number) => Easing.out(Easing.cubic)(x);
  const scale = 1 + 0.06 * ease(cutPunch) + 0.035 * ease(transPunch) + 0.1 * ease(dropHit) + 0.022 * ease(beat);
  const shakeAmt = 16 * dropHit * dropHit + 3 * beat;
  const sx = (random(`x${f}`) - 0.5) * 2 * shakeAmt;
  const sy = (random(`y${f}`) - 0.5) * 2 * shakeAmt;
  const rot = (random(`r${f}`) - 0.5) * 1.2 * dropHit;

  // --- light ---
  const flash = Math.max(env(f, CUTS, 5) * 0.18, env(f, TRANSITIONS, 6) * 0.1);
  const whiteHit = env(f, [DROP], 5) ** 2 * 0.35;
  const rgb = env(f, [DROP, ...CUTS], 6);
  // light-leak that sweeps across at transitions
  const leak = Math.max(...[...TRANSITIONS, ...CUTS].map((t) => interpolate(f, [t - 4, t + 2, t + 16], [0, 1, 0], clamp)));
  const leakX = interpolate(f % 60, [0, 60], [-30, 130]);
  // final fade
  const end = interpolate(f, [870, 899], [1, 0], clamp);

  const cam: React.CSSProperties = {
    transform: `translate(${sx}px, ${sy}px) rotate(${rot}deg) scale(${scale})`,
  };

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ ...cam, opacity: end }}>
        <Footage />
        {/* bloom: blurred copy screened on top makes the oranges glow */}
        <Footage style={{ filter: "blur(14px) brightness(1.15) saturate(1.2)", mixBlendMode: "screen", opacity: 0.22 }} />
        {/* RGB split on hits */}
        {rgb > 0 && (
          <>
            <Footage style={{ mixBlendMode: "screen", opacity: 0.55 * rgb, transform: `translateX(${10 * rgb}px)`, filter: "sepia(1) saturate(8) hue-rotate(-50deg)" }} />
            <Footage style={{ mixBlendMode: "screen", opacity: 0.45 * rgb, transform: `translateX(${-10 * rgb}px)`, filter: "sepia(1) saturate(8) hue-rotate(160deg)" }} />
          </>
        )}
      </AbsoluteFill>

      {/* orange light leak */}
      <AbsoluteFill
        style={{
          mixBlendMode: "screen",
          opacity: leak * 0.3 * end,
          background: `radial-gradient(60% 40% at ${leakX}% 30%, rgba(255,120,30,0.9), rgba(255,60,0,0.25) 45%, transparent 70%)`,
        }}
      />
      {/* cut flash (warm) and drop hit (white) */}
      <AbsoluteFill style={{ background: "#FF7A2A", mixBlendMode: "screen", opacity: flash * end }} />
      <AbsoluteFill style={{ background: "#FFF", opacity: whiteHit }} />
      {/* cinematic vignette */}
      <AbsoluteFill style={{ background: "radial-gradient(120% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
