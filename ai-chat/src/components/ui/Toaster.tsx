import { AnimatePresence, motion } from 'framer-motion';
import { useUI } from '../../stores/ui';

export function Toaster() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[90] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id} layout
            initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
            className="max-w-[min(520px,calc(100vw-32px))] rounded-xl bg-ink px-4 py-2.5 text-[14px] text-paper shadow-pop"
          >{t.text}</motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
