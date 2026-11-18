// Synthesised score for the Pro film, scheduled on the film's timeline (seconds). 104 BPM.
window.buildScore = async function (ctx, D) {
  const B = 60 / 104, sr = ctx.sampleRate, master = ctx.createGain(); master.gain.value = .8;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -15; comp.ratio.value = 3; master.connect(comp); comp.connect(ctx.destination);
  const wet = ctx.createGain(); wet.gain.value = .25; const dl = ctx.createDelay(1), dr = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter(), mg = ctx.createChannelMerger(2);
  dl.delayTime.value = B * .75; dr.delayTime.value = B * .5; fb.gain.value = .35; lp.type = 'lowpass'; lp.frequency.value = 2800;
  wet.connect(dl); wet.connect(dr); dl.connect(lp); dr.connect(lp); lp.connect(fb); fb.connect(dl); fb.connect(dr); dl.connect(mg, 0, 0); dr.connect(mg, 0, 1); mg.connect(master);
  const bus = (g, pan = 0, send = 0) => { const n = ctx.createGain(); n.gain.value = g; const p = ctx.createStereoPanner(); p.pan.value = pan; n.connect(p); p.connect(master); if (send) { const s = ctx.createGain(); s.gain.value = send; p.connect(s); s.connect(wet); } return n; };
  let seed = 9; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const nb = ctx.createBuffer(1, sr * 2, sr), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = rnd() * 2 - 1;
  const env = (g, t, a, d, pk) => { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(pk, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); };
  const osc = (type, f, t, a, d, pk, dest, f1) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + a + d); env(g, t, a, d, pk); o.connect(g); g.connect(dest); o.start(t); o.stop(t + a + d + .05); };
  const noise = (t, a, d, pk, type, f0, f1, q, dest) => { const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + a + d); const g = ctx.createGain(); env(g, t, a, d, pk); s.connect(f); f.connect(g); g.connect(dest); s.start(t, rnd()); s.stop(t + a + d + .05); };
  const pad = (fs, t, d, v = 1) => { const b = bus(.055 * v, 0, .6), l = ctx.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = 1700; l.connect(b); for (const f of fs) for (const dt of [-7, 7]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(1 / fs.length, t + .5); g.gain.setValueAtTime(1 / fs.length, t + d - .2); g.gain.linearRampToValueAtTime(.0001, t + d + .6); o.connect(g); g.connect(l); o.start(t); o.stop(t + d + .7); } };
  const pluck = (f, t, v = 1, pan = 0) => { const b = bus(.11 * v, pan, .7); osc('triangle', f, t, .003, .9, 1, b); osc('sine', f * 2, t, .002, .3, .3, b); };
  const kick = (t, v = 1) => osc('sine', 125, t, .003, .24, 1, bus(.6 * v), 44);
  const clap = (t, v = 1) => { const b = bus(.16 * v, 0, .4); for (const o of [0, .011, .022]) noise(t + o, .001, .08, 1, 'bandpass', 1600, 0, 1.1, b); };
  const hat = (t, v = 1) => noise(t, .001, .025, 1, 'highpass', 8500, 0, .7, bus(.045 * v, .2));
  const sub = (f, t, d, v = 1) => { const b = bus(.3 * v), l = ctx.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = 230; l.connect(b); osc('sawtooth', f, t, .006, d, 1, l); };
  const tick = (t, f = 2300, v = 1, pan = 0) => osc('sine', f, t, .001, .05, 1, bus(.09 * v, pan, .3));
  const chime = (f, t, v = 1) => { const b = bus(.17 * v, 0, .9); osc('sine', f, t, .003, 1.5, 1, b); osc('sine', f * 2.76, t, .002, .5, .25, b); };
  const whoosh = (t, d, v = 1) => noise(t, d * .55, d * .45, 1, 'bandpass', 300, 4200, 1.3, bus(.26 * v, 0, .4));
  const impact = (t, v = 1) => { const b = bus(.7 * v, 0, .4); osc('sine', 85, t, .003, 1.0, 1, b, 32); noise(t, .002, .45, .5, 'lowpass', 4500, 260, .7, b); };
  const riser = (t0, t1, v = 1) => { const b = bus(.15 * v, 0, .3); noise(t0, (t1 - t0) * .95, .05, 1, 'bandpass', 400, 6000, 2, b); };
  // Am  F  C  G (2-bar groove), drums from 3.6 s
  const CH = [[220, 261.63, 329.63, 440], [174.61, 220, 261.63, 349.23], [130.81, 196, 261.63, 329.63], [196, 246.94, 293.66, 392]], RT = [55, 43.65, 65.41, 49];
  const bars = Math.ceil(D / (4 * B));
  for (let bar = 0; bar < bars; bar++) { const t0 = bar * 4 * B, c = bar % 4; if (t0 > D - .5) break; pad(CH[c], t0, 4 * B, t0 > 37 ? 1.3 : 1);
    for (let k = 0; k < 8; k++) { const tk = t0 + k * B / 2; if (tk > 41.2) break; pluck(CH[c][(k * 3 + bar) % 4] * 2, tk, k % 2 ? .45 : .8, k % 2 ? .35 : -.35); if (tk > 3.6) { sub(RT[c] * (k % 4 === 3 ? 2 : 1), tk, B * .4, k % 2 ? .5 : .9); if (k % 2 === 0) kick(tk, k % 4 ? .6 : 1); else hat(tk, 1); if (k === 2 || k === 6) clap(tk, .8); } } }
  // the multicolour wipes
  for (const b of [3.6, 7.2, 15.0, 21.6, 31.2, 37.2, 41.4]) { whoosh(b - .45, .9, 1); impact(b, .45); }
  riser(1.0, 3.5, .8); for (let i = 0; i < 3; i++) chime([659.25, 783.99, 987.77][i], .25 + i * .3, .45);
  chime(1046.5, 3.6 + 1.0, .5); [0, 1, 2, 3].forEach(i => tick(3.6 + 2.1 + i * .14, 1800 + i * 200, 1.2));
  // chapters: word ticks
  for (const s of [7.2, 15.0, 21.6, 31.2]) { for (let i = 0; i < 5; i++) tick(s + .25 + i * .09, 2000 + i * 120, .8); chime(880, s + .8, .3); }
  for (let i = 0; i < 9; i++) { const b = bus(.11, 0, 1); osc('sine', 1320, 7.2 + 2.4 + i * .5, .004, .5, 1, b); }
  [0.3, 0.5, 0.7].forEach(a => tick(7.2 + 2.4 + a * 4.2, 1500, 1.5)); chime(987.77, 7.2 + 6.8, .55);
  noise(15.0 + 2.0, .3, 1.6, .06, 'bandpass', 2400, 3600, 3, bus(1, 0, .3)); chime(1174.66, 15.0 + 2.7, .55);
  for (let i = 0; i <= 3; i++) tick(15.0 + 4.2 + i * .4, 1600 + i * 220, 1.4); noise(15.0 + 6.2, .001, .02, 1, 'highpass', 2500, 0, .7, bus(.25));
  { const t0 = 21.6 + 2.0, t1 = 31.0, b = bus(.1, 0, .3), l = ctx.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = 800; l.connect(b); const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(55, t0); o.frequency.exponentialRampToValueAtTime(110, t0 + .7); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.6, t0 + .6); g.gain.setValueAtTime(.6, t1 - .6); g.gain.exponentialRampToValueAtTime(.0001, t1); o.connect(g); g.connect(l); o.start(t0); o.stop(t1 + .1); }
  impact(21.6 + 2.0, .5); for (let i = 0; i < 34; i++) tick(21.6 + 2.4 + (230 + ((i * 97) % 520)) / 260, 2400 + (i % 5) * 120, .4, (i % 2 ? .5 : -.5));
  for (let i = 0; i < 4; i++) chime(659.25 + i * 110, 21.6 + 6.5 + i * .45, .35);
  for (let i = 0; i < 4; i++) tick(31.2 + 2.3 + i * .6, 1900 + i * 160, 1.5); impact(31.2 + 4.9, .4); chime(1318.5, 31.2 + 4.9, .5);
  for (let i = 0; i < 4; i++) chime([523.25, 659.25, 783.99, 1046.5][i], 37.2 + .6 + i * .35, .45);
  pad([220, 329.63, 440, 523.25, 659.25], 41.4, D - 41.4, 1.6); chime(880, 41.6, .7); chime(1318.5, 42.3, .5);
};
