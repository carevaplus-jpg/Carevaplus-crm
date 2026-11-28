import type { Stats } from './types';

/** Tokens per second over the generation window (first token → end/now). */
export function tokensPerSecond(s: Stats | undefined, now = Date.now()) {
  if (!s?.first || s.tokens < 2) return 0;
  const secs = ((s.end ?? now) - s.first) / 1000;
  return secs > 0.05 ? s.tokens / secs : 0;
}
export const fmtSecs = (ms: number) => (ms < 10_000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms / 1000)} s`);
export const fmtInt = (n: number) => Math.round(n).toLocaleString();
