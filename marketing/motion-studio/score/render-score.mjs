// node score/render-score.mjs public/score.wav 47.4
import { createRequire } from 'node:module'; import { writeFileSync } from 'node:fs'; import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [, , out, dur] = process.argv, D = +dur;
const b = await chromium.launch(), p = await b.newPage();
await p.setContent('<html><body></body></html>'); await p.addScriptTag({ path: path.resolve('score/score.js') });
const b64 = await p.evaluate(async D => { const sr = 48000, ctx = new OfflineAudioContext(2, Math.ceil(sr * D), sr); await window.buildScore(ctx, D); const buf = await ctx.startRendering();
  const L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length, ab = new ArrayBuffer(44 + n * 4), v = new DataView(ab); const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) { v.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); v.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
  const u8 = new Uint8Array(ab); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }, D);
writeFileSync(out, Buffer.from(b64, 'base64')); await b.close(); console.log('score ->', out);
