import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { VoiceState } from '../../lib/voice';
import { IconButton } from '../ui/Button';

export function VoiceBar({ state, levels, startedAt, onCancel }: { state: VoiceState; levels: number[]; startedAt: number; onCancel: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  const s = Math.max(0, Math.floor((now - startedAt) / 1000));
  const status = state === 'transcribing' ? 'Transcribing…' : state === 'starting' ? 'Opening the microphone…' : 'Listening…';
  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex min-w-0 items-center gap-2.5">
      <IconButton icon="x" label="Cancel dictation (Esc)" onClick={onCancel} className="border border-line !size-[34px] max-md:!size-[38px]" />
      <motion.span className="size-2.5 shrink-0 rounded-full bg-rec" animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
      <span className="min-w-[34px] text-[13px] font-medium tabular-nums text-ink-2">{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</span>
      <span className="flex h-7 items-center gap-[2px] max-[420px]:hidden" aria-hidden="true">
        {levels.map((l, i) => (
          <motion.i key={i} className="block w-[3px] rounded-full bg-rec/85" animate={{ height: `${Math.round(Math.max(0.12, l) * 100)}%` }} transition={{ duration: 0.09, ease: 'linear' }} />
        ))}
      </span>
      <span className={`truncate text-[13px] text-muted ${state === 'transcribing' ? 'shimmer' : ''}`}>{status}</span>
    </motion.div>
  );
}
