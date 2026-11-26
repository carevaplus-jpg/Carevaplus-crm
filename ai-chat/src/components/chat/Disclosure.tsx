import { AnimatePresence, motion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { Icon } from '../ui/Icon';

/** Collapsible card with an animated height reveal (thinking, council drafts). */
export function Disclosure({ summary, children, defaultOpen = false }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-line bg-raised text-[14px]">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-ink-2 transition-colors hover:bg-hover">
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ type: 'spring', duration: 0.3, bounce: 0 }} className="text-muted"><Icon name="chevronRight" size={16} /></motion.span>
        {summary}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ height: { type: 'spring', duration: 0.38, bounce: 0 }, opacity: { duration: 0.2 } }}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
