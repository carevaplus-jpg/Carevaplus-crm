import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

export type CoreMode = 'thinking' | 'streaming' | 'merging' | 'routing';

const N = 5;  // 5×5 lattice of cores

/**
 * The compute core: a lattice of cores whose activity is driven by real work.
 * - routing:   a scan line sweeps across while the request is dispatched
 * - thinking:  a slow wave ripples out from the centre
 * - streaming: cores fire at a rate proportional to measured tokens/second
 * - merging:   energy converges inward (Council combining drafts)
 */
export function ComputeCore({ mode, rate = 0, size = 26, className = '' }: { mode: CoreMode; rate?: number; size?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const modeRef = useRef(mode);
  const rateRef = useRef(rate);
  modeRef.current = mode;
  rateRef.current = rate;

  useEffect(() => {
    const cv = ref.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size * dpr; cv.height = size * dpr;
    const ctx = cv.getContext('2d')!;
    const energy = new Float32Array(N * N);
    const dist = new Float32Array(N * N);
    const c = (N - 1) / 2;
    for (let i = 0; i < N * N; i++) dist[i] = Math.hypot((i % N) - c, Math.floor(i / N) - c);
    let colors = readColors();
    let frame = 0, raf = 0, last = performance.now(), t = 0;

    const draw = () => {
      const cell = cv.width / N;
      const gap = Math.max(1, cell * 0.22);
      const r = Math.max(1, cell * 0.22);
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (let i = 0; i < N * N; i++) {
        const e = Math.min(1, energy[i]);
        const x = (i % N) * cell + gap / 2, y = Math.floor(i / N) * cell + gap / 2, w = cell - gap;
        ctx.globalAlpha = 0.16 + e * 0.84;
        ctx.fillStyle = e > 0.35 ? colors.accent : colors.idle;
        ctx.beginPath();
        ctx.roundRect(x, y, w, w, r);
        ctx.fill();
        if (e > 0.75) {   // hot cores glow
          ctx.globalAlpha = (e - 0.75) * 1.6;
          ctx.shadowColor = colors.accent; ctx.shadowBlur = cell * 0.9;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      ctx.globalAlpha = 1;
    };

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now; t += dt;
      if (++frame % 90 === 0) colors = readColors();
      const m = modeRef.current;
      if (m === 'thinking') {
        for (let i = 0; i < N * N; i++) energy[i] = 0.08 + 0.92 * Math.max(0, Math.sin(t * 2.6 - dist[i] * 1.5)) ** 4;
      } else if (m === 'merging') {
        for (let i = 0; i < N * N; i++) energy[i] = 0.08 + 0.92 * Math.max(0, Math.sin(t * 4.2 + dist[i] * 1.5)) ** 4;
      } else if (m === 'routing') {
        const col = (t * 7) % (N + 2) - 1;
        for (let i = 0; i < N * N; i++) energy[i] = Math.max(energy[i] * Math.exp(-dt * 9), Math.max(0, 1 - Math.abs((i % N) - col)) * 0.9);
      } else {
        // streaming: fire cores in proportion to throughput (tokens/s), with decay and a little spill to neighbours
        const perSecond = Math.min(140, 6 + rateRef.current * 1.6);
        let fires = perSecond * dt;
        while (fires > 0) {
          if (Math.random() < Math.min(1, fires)) {
            const i = (Math.random() * N * N) | 0;
            energy[i] = 1;
            const x = i % N, y = (i / N) | 0;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && ny >= 0 && nx < N && ny < N) energy[ny * N + nx] = Math.max(energy[ny * N + nx], 0.45);
            }
          }
          fires -= 1;
        }
        for (let i = 0; i < N * N; i++) energy[i] *= Math.exp(-dt * 5.5);
      }
      draw();
      raf = requestAnimationFrame(step);
    };

    if (reduce) {   // still frame: a lit centre cross, no motion
      for (let i = 0; i < N * N; i++) energy[i] = dist[i] < 1.1 ? 0.9 : 0.1;
      draw();
      return;
    }
    raf = requestAnimationFrame(step);
    const onVis = () => { if (document.hidden) cancelAnimationFrame(raf); else { last = performance.now(); raf = requestAnimationFrame(step); } };
    document.addEventListener('visibilitychange', onVis);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); };
  }, [size, reduce]);

  return <canvas ref={ref} style={{ width: size, height: size }} className={`shrink-0 ${className}`} role="img" aria-label={label(mode)} />;
}

function label(m: CoreMode) {
  return m === 'thinking' ? 'Thinking' : m === 'merging' ? 'Merging answers' : m === 'routing' ? 'Routing request' : 'Generating';
}

function readColors() {
  const cs = getComputedStyle(document.documentElement);
  return { accent: cs.getPropertyValue('--accent').trim() || '#c25f37', idle: cs.getPropertyValue('--ink-2').trim() || '#57534a' };
}
