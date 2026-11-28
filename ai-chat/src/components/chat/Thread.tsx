import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Conversation } from '../../lib/types';
import { conversationArtifacts, type Artifact } from '../../lib/artifacts';
import { AssistantMessage } from './AssistantMessage';
import { UserMessage } from './UserMessage';
import { Icon } from '../ui/Icon';

const isFresh = (t: number) => Date.now() - t < 1500;

export function Thread({ conv }: { conv: Conversation }) {
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [away, setAway] = useState(false);
  const { versionsOf } = useMemo(() => conversationArtifacts(conv), [conv]);
  const versionOf = useCallback((a: Artifact) => {
    const v = versionsOf(a);
    return v.length > 1 ? v.findIndex((x) => x.key === a.key) + 1 : undefined;
  }, [versionsOf]);

  const onScroll = () => {
    const el = box.current!;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    stick.current = gap < 140;
    setAway(gap > 420);
  };

  // follow the stream while the reader is at the bottom
  useLayoutEffect(() => {
    const el = box.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  });
  // jump to bottom when switching conversations
  useEffect(() => { stick.current = true; const el = box.current; if (el) el.scrollTop = el.scrollHeight; }, [conv.id]);
  // keep following as content reflows (images, code highlighting)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { if (stick.current) el.scrollTop = el.scrollHeight; });
    ro.observe(el.firstElementChild!);
    return () => ro.disconnect();
  }, []);

  const last = conv.messages.length - 1;
  return (
    <div className="relative min-h-0 flex-1">
      <div ref={box} onScroll={onScroll} className="h-full overflow-y-auto overscroll-contain px-5 pb-8 pt-2 max-md:px-4">
        <div className="mx-auto flex max-w-[740px] flex-col gap-7">
          {conv.messages.map((m, i) => (
            <motion.div
              key={m.id}
              initial={isFresh(m.createdAt) ? (m.role === 'user' ? { opacity: 0, y: 12, scale: 0.98 } : { opacity: 0, y: 6 }) : false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={m.role === 'user' ? { type: 'spring', duration: 0.42, bounce: 0.12 } : { duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className={m.role === 'user' ? 'flex' : ''}
            >
              {m.role === 'user' ? <UserMessage msg={m} /> : <AssistantMessage msg={m} isLast={i === last} versionOf={versionOf} />}
            </motion.div>
          ))}
        </div>
      </div>
      <AnimatePresence>
        {away && (
          <motion.button
            type="button" aria-label="Scroll to latest message"
            initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.2 }}
            onClick={() => { stick.current = true; box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' }); }}
            className="absolute bottom-3 left-1/2 z-10 grid size-9 -translate-x-1/2 place-items-center rounded-full border border-line bg-raised text-ink-2 shadow-soft hover:text-ink"
          ><Icon name="arrowDown" size={18} /></motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
