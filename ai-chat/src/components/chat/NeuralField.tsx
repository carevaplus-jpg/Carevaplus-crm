import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

/** Fire field events from anywhere (typing pulses, the send surge). */
export const pulseField = (strength = 1) => window.dispatchEvent(new CustomEvent('careva:pulse', { detail: strength }));
export const surgeField = () => window.dispatchEvent(new CustomEvent('careva:surge'));

interface Node { x: number; y: number; vx: number; vy: number; e: number }

/**
 * The welcome screen's ambient network: faint drifting nodes, linked when close.
 * Typing injects energy near the composer that propagates along links; sending
 * triggers a surge that pulls the whole field toward the composer.
 */
export function NeuralField({ anchor }: { anchor: React.RefObject<HTMLElement | null> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 0, nodes: Node[] = [], raf = 0, last = performance.now(), surge = 0;
    const LINK = 120;
    let colors = read();

    const resize = () => {
      const r = cv.getBoundingClientRect();
      w = r.width; h = r.height;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(90, Math.round((w * h) / 15000));
      nodes = Array.from({ length: count }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 9, vy: (Math.random() - 0.5) * 9, e: 0 }));
    };
    const target = () => {
      const a = anchor.current?.getBoundingClientRect(), r = cv.getBoundingClientRect();
      return a ? { x: a.left - r.left + a.width / 2, y: a.top - r.top + a.height / 2 } : { x: w / 2, y: h / 2 };
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > LINK) continue;
          const e = Math.max(a.e, b.e);
          ctx.strokeStyle = e > 0.2 ? colors.accent : colors.line;
          ctx.globalAlpha = (1 - d / LINK) * (0.18 + e * 0.6);
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      for (const n of nodes) {
        ctx.globalAlpha = 0.35 + n.e * 0.65;
        ctx.fillStyle = n.e > 0.2 ? colors.accent : colors.line;
        ctx.beginPath(); ctx.arc(n.x, n.y, 1.4 + n.e * 1.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t = surge > 0 ? target() : null;
      for (const n of nodes) {
        if (t) { n.vx += (t.x - n.x) * surge * dt * 2.2; n.vy += (t.y - n.y) * surge * dt * 2.2; }
        n.x += n.vx * dt; n.y += n.vy * dt;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        n.vx *= t ? 0.96 : 1; n.vy *= t ? 0.96 : 1;
      }
      // energy diffuses along links, then decays
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        if (Math.abs(a.e - b.e) < 0.05 || Math.hypot(a.x - b.x, a.y - b.y) > LINK) continue;
        const flow = (a.e - b.e) * dt * 2.4;
        a.e -= flow; b.e += flow;
      }
      for (const n of nodes) n.e *= Math.exp(-dt * 1.6);
      surge = Math.max(0, surge - dt * 0.9);
      draw();
      raf = requestAnimationFrame(step);
    };

    const onPulse = (ev: Event) => {
      const t = target();
      const near = [...nodes].sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y)).slice(0, 3);
      const s = (ev as CustomEvent).detail ?? 1;
      for (const n of near) n.e = Math.min(1.4, n.e + 0.55 * s);
    };
    const onSurge = () => { surge = 1; for (const n of nodes) n.e = Math.min(1.4, n.e + 0.8); };

    resize();
    const ro = new ResizeObserver(() => { resize(); if (reduce) draw(); });
    ro.observe(cv);
    colors = read();
    if (reduce) { draw(); return () => ro.disconnect(); }
    raf = requestAnimationFrame(step);
    const onVis = () => { if (document.hidden) cancelAnimationFrame(raf); else { last = performance.now(); raf = requestAnimationFrame(step); } };
    const onTheme = new MutationObserver(() => { colors = read(); });
    onTheme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    addEventListener('careva:pulse', onPulse);
    addEventListener('careva:surge', onSurge);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); onTheme.disconnect();
      removeEventListener('careva:pulse', onPulse); removeEventListener('careva:surge', onSurge);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [anchor, reduce]);

  return (
    <canvas ref={ref} aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 size-full [mask-image:radial-gradient(ellipse_70%_65%_at_50%_55%,#000_35%,transparent_100%)]" />
  );
}

function read() {
  const cs = getComputedStyle(document.documentElement);
  return { accent: cs.getPropertyValue('--accent').trim() || '#c25f37', line: cs.getPropertyValue('--line-strong').trim() || '#d2cbbb' };
}
