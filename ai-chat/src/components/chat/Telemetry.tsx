import { AnimatePresence, motion } from 'framer-motion';
import type { Stats } from '../../lib/types';
import { fmtInt, fmtSecs, tokensPerSecond } from '../../lib/telemetry';
import { useNow } from '../../hooks/useNow';

/**
 * Measured run telemetry: output tokens, throughput, time to first token, wall time.
 * Ticks live while streaming; freezes into a compact summary when done.
 */
export function Telemetry({ stats, live, model }: { stats?: Stats; live: boolean; model?: string }) {
  const now = useNow(live, 120);
  if (!stats) return model ? <span className="truncate">{model}</span> : null;
  const tps = tokensPerSecond(stats, now);
  const ttft = stats.first ? stats.first - stats.start : undefined;
  const total = (stats.end ?? now) - stats.start;
  const cells: [string, string][] = [];
  if (stats.tokens) cells.push([fmtInt(stats.tokens), stats.tokens === 1 ? 'token' : 'tokens']);
  if (tps) cells.push([tps >= 100 ? fmtInt(tps) : tps.toFixed(1), 'tok/s']);
  if (ttft !== undefined) cells.push([fmtSecs(ttft), 'to first token']);
  cells.push([fmtSecs(total), live ? 'elapsed' : 'total']);

  return (
    <span className="flex min-w-0 items-center gap-3 overflow-hidden whitespace-nowrap" aria-label="Run statistics">
      {model && <span className="truncate text-ink-2">{model}</span>}
      <AnimatePresence initial={false}>
        {cells.map(([v, unit]) => (
          <motion.span key={unit} layout="position" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }} className="inline-flex items-baseline gap-1 max-sm:[&:nth-of-type(n+4)]:hidden">
            <span className="font-mono text-[11.5px] tabular-nums text-ink-2">{v}</span>
            <span className="text-[11px] text-muted">{unit}</span>
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
}
