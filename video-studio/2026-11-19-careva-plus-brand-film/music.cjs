// Original music bed for the Careva+ brand film, written to fit the narration timeline.
//   node music.cjs   (after `node ../engine/build.cjs . tts`)
// Warm pads in D major that change chord on every scene cut, a soft piano note on each key reveal,
// a heartbeat under the opening pulse, and a shimmer under the end card. Ducks under the voice.
// Writes <build>/music.wav (48 kHz stereo), which video.json mixes under the narration.
const fs = require("fs"), path = require("path");

const VIDEO = __dirname;
const BUILD = process.env.BUILD_DIR || path.join(VIDEO, "..", ".build", path.basename(VIDEO));
const TL = JSON.parse(fs.readFileSync(path.join(BUILD, "timeline.json"), "utf8"));
const SC = TL.scenes, SR = 48000, DUR = TL.frames / TL.fps, N = Math.ceil(DUR * SR);
const L = new Float32Array(N), R = new Float32Array(N);       // dry bus
const WL = new Float32Array(N), WR = new Float32Array(N);     // reverb send
const HB = new Float32Array(N);                                // heartbeat (dry, not ducked)

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const hz = (n) => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(n); const midi = 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0); return 440 * Math.pow(2, (midi - 69) / 12); };
// Global time of sentence i in scene k (same helper as the scenes).
const T = (k, i, off = 0, share = 0) => { const x = SC[k].sentences[i]; return SC[k].t0 + x.start + share * (x.end - x.start) + off; };
const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

// ---- Pads: one chord per scene (scene 5 moves to a sus chord that resolves into the end card).
const chords = [
  [SC[0].t0, SC[1].t0, ["D2", "A2", "E4", "F#3"]],
  [SC[1].t0, SC[2].t0, ["B1", "F#2", "D3", "A3", "C#4"]],
  [SC[2].t0, SC[3].t0, ["G1", "D2", "B2", "F#3", "A3"]],
  [SC[3].t0, SC[4].t0, ["F#1", "A2", "D3", "E3", "A3"]],
  [SC[4].t0, SC[4].t0 + SC[4].dur / 2, ["E1", "B1", "G2", "D3", "F#3"]],
  [SC[4].t0 + SC[4].dur / 2, SC[5].t0, ["A1", "E2", "G2", "D3", "E3"]],
  [SC[5].t0, DUR + 2, ["D1", "D2", "A2", "F#3", "C#4", "E4"]],
];
const PARTIALS = [1, 0.5, 0.3, 0.17, 0.1, 0.06];
for (const [t0, t1, notes] of chords) {
  const a = Math.max(0, Math.floor((t0 - 0.35) * SR)), b = Math.min(N, Math.ceil((t1 + 1.8) * SR));
  for (const n of notes) {
    const f0 = hz(n), lowGain = f0 < 80 ? 0.7 : 1;
    for (const [cents, pan] of [[-7, -0.65], [0, 0], [7, 0.65]]) {
      const f = f0 * Math.pow(2, cents / 1200), gl = Math.sqrt((1 - pan) / 2), gr = Math.sqrt((1 + pan) / 2);
      const ph = (f * 13.7) % (2 * Math.PI);
      for (let s = a; s < b; s++) {
        const t = s / SR;
        const env = smooth((t - (t0 - 0.35)) / 1.4) * (1 - smooth((t - t1) / 1.8)) * (0.9 + 0.1 * Math.sin(2 * Math.PI * 0.13 * t + f));
        let v = 0; for (let k = 0; k < PARTIALS.length; k++) if (f * (k + 1) < 6000) v += PARTIALS[k] * Math.sin(2 * Math.PI * f * (k + 1) * t + ph * (k + 1));
        v *= env * 0.055 * lowGain;
        L[s] += v * gl; R[s] += v * gr; WL[s] += v * gl * 0.9; WR[s] += v * gr * 0.9;
      }
    }
  }
}
// Gentle low-pass on the pads for warmth (opens up a little for the end card).
for (const ch of [L, R]) { let y = 0; for (let s = 0; s < N; s++) { const fc = s / SR > SC[5].t0 ? 2600 : 1600, a = 1 - Math.exp(-2 * Math.PI * fc / SR); y += a * (ch[s] - y); ch[s] = y; } }

// ---- Piano-like notes on the key reveals.
function pluck(t, n, vel = 1, pan = 0) {
  const f = hz(n), a = Math.floor(t * SR), b = Math.min(N, a + 5 * SR), gl = Math.sqrt((1 - pan) / 2), gr = Math.sqrt((1 + pan) / 2);
  const parts = [[1, 1, 2.2], [2.002, 0.42, 1.3], [3.004, 0.18, 0.9], [4.02, 0.07, 0.6], [5.03, 0.035, 0.45]];
  for (let s = Math.max(0, a); s < b; s++) {
    const x = (s - a) / SR, att = Math.min(1, x / 0.004);
    let v = 0; for (const [m, amp, tau] of parts) v += amp * Math.exp(-x / tau) * Math.sin(2 * Math.PI * f * m * x);
    v *= att * vel * 0.11;
    L[s] += v * gl * 0.7; R[s] += v * gr * 0.7; WL[s] += v * gl; WR[s] += v * gr;
  }
}
pluck(1.5, "A4", 0.55, 0.2);
pluck(T(0, 0, -0.25), "D5", 0.7, -0.1);
pluck(SC[1].t0 + 0.3, "B4", 0.7, -0.2);
pluck(SC[1].t0 + 2.2, "F#5", 0.45, 0.3);
["A4", "B4", "D5"].forEach((n, i) => pluck(T(2, i, -0.12), n, 0.8, [-0.25, 0, 0.25][i]));
pluck(T(3, 0, -0.2), "F#4", 0.65, 0);
["A4", "D5", "E5"].forEach((n, i) => pluck(T(3, 1, -0.15, [0, 0.36, 0.68][i]), n, 0.6, [-0.3, 0, 0.3][i]));
[T(4, 0, 0, 0.55), T(4, 1, 0, 0), T(4, 1, 0, 0.4), T(4, 1, 0, 0.8)].forEach((t, i) => pluck(t, ["D5", "E5", "F#5", "A5"][i], 0.5, 0.35));
pluck(SC[5].t0 + 1.0, "D5", 0.85, -0.1); pluck(SC[5].t0 + 1.0, "A5", 0.5, 0.15);
pluck(T(5, 1, -0.15), "F#5", 0.5, 0.2);

// ---- Shimmer under the end card.
{
  const t0 = SC[5].t0 + 0.8, a = Math.floor(t0 * SR);
  for (const [n, g] of [["D6", 0.02], ["A6", 0.014], ["F#6", 0.01]]) {
    const f = hz(n);
    for (let s = a; s < N; s++) {
      const t = s / SR, v = g * smooth((t - t0) / 2.2) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 0.6 * t + f)) * Math.sin(2 * Math.PI * f * t);
      WL[s] += v; WR[s] += v * 0.9; L[s] += v * 0.3; R[s] += v * 0.3;
    }
  }
}

// ---- Heartbeat under the opening pulse: lub-dub as the line spikes.
function thump(t, vel) {
  const a = Math.floor(t * SR);
  let ph = 0;
  for (let s = a; s < Math.min(N, a + 0.6 * SR); s++) {
    const x = (s - a) / SR, f = 42 + 34 * Math.exp(-x / 0.05);
    ph += 2 * Math.PI * f / SR;
    HB[s] += vel * 0.5 * Math.min(1, x / 0.006) * Math.exp(-x / 0.11) * Math.sin(ph);
  }
}
thump(1.08, 1); thump(1.3, 0.65);

// ---- Reverb (Freeverb-style: parallel damped combs, then allpasses) on the send bus.
function reverb(inp, spread) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map((d) => Math.round((d + spread) * 48 / 44.1));
  const aps = [556, 441, 341, 225].map((d) => Math.round((d + spread) * 48 / 44.1));
  const out = new Float32Array(N);
  for (const d of combs) {
    const buf = new Float32Array(d); let i = 0, lp = 0;
    for (let s = 0; s < N; s++) { const y = buf[i]; lp = y * 0.75 + lp * 0.25; buf[i] = inp[s] * 0.015 + lp * 0.86; out[s] += y; i = (i + 1) % d; }
  }
  for (const d of aps) {
    const buf = new Float32Array(d); let i = 0;
    for (let s = 0; s < N; s++) { const b = buf[i], y = -out[s] + b; buf[i] = out[s] + b * 0.5; out[s] = y; i = (i + 1) % d; }
  }
  return out;
}
const RL = reverb(WL, 0), RR = reverb(WR, 23);

// ---- Mix: pads + piano + reverb, ducked under the voice; heartbeat on top; fades at both ends.
const voice = [];
for (const s of SC) for (const x of s.sentences) voice.push([s.t0 + x.start, s.t0 + x.end]);
const duck = (t) => { let d = 0; for (const [a, b] of voice) d = Math.max(d, smooth((t - a + 0.15) / 0.15) * (1 - smooth((t - b) / 0.4))); return 1 - 0.42 * d; };
const outL = new Float32Array(N), outR = new Float32Array(N);
let sq = 0;
for (let s = 0; s < N; s++) {
  const t = s / SR, g = duck(t) * smooth(t / 0.8) * (1 - smooth((t - (DUR - 1.2)) / 1.2));
  outL[s] = (L[s] + RL[s] * 1.1) * g; outR[s] = (R[s] + RR[s] * 1.1) * g; sq += outL[s] * outL[s] + outR[s] * outR[s];
}
// Level the bed to about -25 dBFS RMS so it sits well under the narration, then add the heartbeat.
const rms = Math.sqrt(sq / (2 * N)), k = Math.pow(10, -25 / 20) / rms;
let peak = 0;
for (let s = 0; s < N; s++) { outL[s] = outL[s] * k + HB[s] * 0.55; outR[s] = outR[s] * k + HB[s] * 0.55; peak = Math.max(peak, Math.abs(outL[s]), Math.abs(outR[s])); }
const lim = peak > 0.7 ? 0.7 / peak : 1;

const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let s = 0; s < N; s++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outL[s] * lim)) * 32767), 44 + s * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outR[s] * lim)) * 32767), 46 + s * 4);
}
fs.writeFileSync(path.join(BUILD, "music.wav"), buf);
console.log(`music ${DUR.toFixed(2)} s, rms gain ${k.toFixed(2)}, peak ${(20 * Math.log10(peak * lim)).toFixed(1)} dBFS -> ${path.join(BUILD, "music.wav")}`);
