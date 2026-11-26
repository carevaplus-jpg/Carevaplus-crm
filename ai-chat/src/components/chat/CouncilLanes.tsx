import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { Draft } from '../../lib/types';
import { shortName } from '../../stores/models';
import { fmtInt, tokensPerSecond } from '../../lib/telemetry';
import { useNow } from '../../hooks/useNow';
import { ComputeCore } from '../ui/ComputeCore';

/** Council at work: one live lane per model (throughput bar, tokens, tok/s), then a merge step. */
export function CouncilLanes({ drafts, merging }: { drafts: Draft[]; merging: boolean }) {
  const now = useNow(true, 150);
  const max = Math.max(400, ...drafts.map((d) => d.content.length));
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mb-4 overflow-hidden rounded-xl border border-line bg-raised font-sans">
      <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-2.5 text-[13.5px]">
        <ComputeCore mode={merging ? 'merging' : 'streaming'} rate={drafts.reduce((a, d) => a + tokensPerSecond(d.stats, now), 0)} size={20} />
        <span className="shimmer font-medium">{merging ? `Merging ${drafts.filter((d) => d.status === 'done').length} answers into one` : `Council: ${drafts.length} models working in parallel`}</span>
      </div>
      <div className="flex flex-col gap-2.5 px-3.5 py-3">
        {drafts.map((d, i) => {
          const tps = tokensPerSecond(d.stats, now);
          const pct = d.status === 'error' ? 100 : Math.max(4, (d.content.length / max) * 100);
          return (
            <motion.div key={d.model} initial={{ opacity: 0, x: -6 }} animate={{ opacity: merging && d.status !== 'done' ? 0.45 : 1, x: 0 }} transition={{ delay: i * 0.06 }}
              className="grid grid-cols-[minmax(0,9.5rem)_1fr_auto] items-center gap-3 text-[12.5px] max-sm:grid-cols-[minmax(0,6.5rem)_1fr_auto]">
              <span className="truncate font-medium text-ink-2">{shortName(d.model)}</span>
              <span className="relative h-1.5 overflow-hidden rounded-full bg-hover-strong">
                <motion.span className={clsx('absolute inset-y-0 left-0 rounded-full', d.status === 'error' ? 'bg-danger/50' : 'bg-accent')}
                  animate={{ width: `${pct}%` }} transition={{ type: 'spring', duration: 0.5, bounce: 0 }} />
                {d.status === 'pending' && (
                  <motion.span className="absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                    animate={{ left: ['-15%', '110%'] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }} />
                )}
              </span>
              <span className="min-w-[6.5rem] text-right font-mono text-[11.5px] tabular-nums text-muted">
                {d.status === 'error' ? 'failed' : d.status === 'done' ? `${fmtInt(d.stats?.tokens ?? 0)} tok ✓` : d.stats?.first ? `${tps.toFixed(0)} tok/s` : 'dispatching'}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
