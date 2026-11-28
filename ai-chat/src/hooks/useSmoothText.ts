import { useEffect, useRef, useState } from 'react';

/**
 * Network chunks arrive in bursts. This reveals streamed text at a steady, adaptive pace
 * (faster when far behind, gentle when caught up), so answers flow in smoothly.
 */
export function useSmoothText(target: string, streaming: boolean) {
  const [shown, setShown] = useState(streaming ? '' : target);
  const len = useRef(streaming ? 0 : target.length);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (!streaming) { len.current = target.length; setShown(target); return; }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const t = targetRef.current;
      const dt = Math.min(64, now - last);
      last = now;
      if (len.current < t.length) {
        const behind = t.length - len.current;
        // ~90 chars/s baseline, accelerating with backlog so we never lag far behind the model
        const step = Math.max(1, Math.round((90 + behind * 4.5) * (dt / 1000)));
        len.current = Math.min(t.length, len.current + step);
        setShown(t.slice(0, len.current));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [streaming, target]);

  // A new, shorter target (retry) resets the reveal.
  useEffect(() => { if (target.length < len.current) { len.current = 0; setShown(''); } }, [target]);

  return streaming ? shown : target;
}
