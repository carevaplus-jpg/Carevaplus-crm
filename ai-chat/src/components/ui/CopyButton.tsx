import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import clsx from 'clsx';
import { Icon } from './Icon';
import { copyText } from '../../lib/utils';

/** Copy button whose icon morphs into a check on success. */
export function CopyButton({ text, label = 'Copy', withLabel = false, className }: { text: string | (() => string); label?: string; withLabel?: boolean; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button" aria-label={done ? 'Copied' : label} title={label}
      onClick={async () => { await copyText(typeof text === 'function' ? text() : text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className={clsx('inline-flex items-center gap-1.5 rounded-lg text-muted transition-colors hover:bg-hover-strong hover:text-ink', withLabel ? 'px-2 py-1 text-[12px]' : 'size-8 justify-center', className)}
    >
      <span className="relative grid size-4 place-items-center">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span key={done ? 'ok' : 'copy'} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.14 }}>
            <Icon name={done ? 'check' : 'copy'} size={done ? 16 : 15} strokeWidth={done ? 2.4 : 1.8} className={done ? 'text-ok' : ''} />
          </motion.span>
        </AnimatePresence>
      </span>
      {withLabel && <span>{done ? 'Copied' : label}</span>}
    </button>
  );
}
