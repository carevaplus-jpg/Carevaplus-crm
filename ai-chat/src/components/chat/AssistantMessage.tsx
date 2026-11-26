import { motion, AnimatePresence } from 'framer-motion';
import { memo, useEffect, useRef } from 'react';
import type { Message } from '../../lib/types';
import type { Artifact } from '../../lib/artifacts';
import { useSmoothText } from '../../hooks/useSmoothText';
import { useSettings } from '../../stores/settings';
import { shortName } from '../../stores/models';
import { useChat } from '../../stores/chat';
import { retry } from '../../lib/engine';
import { Markdown } from './Markdown';
import { Disclosure } from './Disclosure';
import { Logo } from '../ui/Logo';
import { CopyButton } from '../ui/CopyButton';
import { IconButton, Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

export const AssistantMessage = memo(function AssistantMessage({ msg, isLast, versionOf }: { msg: Message; isLast: boolean; versionOf: (a: Artifact) => number | undefined }) {
  const streaming = msg.status === 'streaming';
  const showThinking = useSettings((s) => s.showThinking);
  const mode = useSettings((s) => s.mode);
  const generating = useChat((s) => s.generating);
  const text = useSmoothText(msg.content, streaming);
  const thinkingNow = streaming && !msg.content && !!msg.reasoning;
  const thinkBody = useRef<HTMLDivElement>(null);
  useEffect(() => { if (thinkingNow && thinkBody.current) thinkBody.current.scrollTop = thinkBody.current.scrollHeight; }, [msg.reasoning, thinkingNow]);

  const secs = Math.max(1, Math.round(((msg.thinkEnd || Date.now()) - (msg.thinkStart || Date.now())) / 1000));
  const status = msg.phase === 'council' ? `Consulting ${msg.drafts?.length ?? ''} models` : msg.phase === 'synth' ? 'Combining the best answers' : `Asking ${shortName(msg.model) || 'the model'}`;
  const done = msg.drafts?.filter((d) => d.status === 'done').length ?? 0;

  return (
    <div className="group/msg">
      {msg.drafts?.length ? (
        <Disclosure summary={<span>Council: {done} of {msg.drafts.length} models answered</span>}>
          {msg.drafts.map((d) => (
            <div key={d.model} className="border-t border-line px-4 py-3">
              <div className="mb-1.5 flex items-center gap-2 font-sans text-[13px] font-medium">
                {shortName(d.model)}
                <span className={`rounded-full px-2 py-px text-[11px] ${d.status === 'done' ? 'bg-ok/15 text-ok' : d.status === 'error' ? 'bg-danger/10 text-danger' : 'bg-hover-strong text-muted'}`}>
                  {d.status === 'done' ? 'done' : d.status === 'error' ? 'failed' : 'writing…'}
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {d.status === 'error' ? <p className="text-[14px] text-muted">{d.error}</p> : <Markdown text={d.content || '…'} artifacts={false} className="small" />}
              </div>
            </div>
          ))}
        </Disclosure>
      ) : null}

      {msg.reasoning && showThinking && (
        <Disclosure summary={thinkingNow ? <span className="shimmer">Thinking…</span> : <span>Thought for {secs} second{secs === 1 ? '' : 's'}</span>}>
          <div ref={thinkBody} className="max-h-80 overflow-y-auto whitespace-pre-wrap px-4 pb-3.5 pl-9 text-[13.5px] leading-relaxed text-ink-2">{msg.reasoning}</div>
        </Disclosure>
      )}

      <AnimatePresence>
        {streaming && !msg.content && !(msg.reasoning && showThinking) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-2 text-[14px]"><span className="shimmer">{status}…</span></motion.div>
        )}
      </AnimatePresence>

      {msg.content && <Markdown text={text} msgId={msg.id} streaming={streaming} caret={streaming} versionOf={versionOf} />}

      {!streaming && msg.notes?.map((n) => <p key={n} className="mt-2 text-[13px] text-muted">{n}</p>)}
      {msg.error && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-3 text-[14px] text-danger">
          <div className="flex gap-2"><Icon name="alert" size={18} className="mt-px" /><span>{msg.error}</span></div>
          <div className="mt-2.5 flex gap-2">
            <Button size="sm" onClick={() => retry(msg.id)} disabled={generating}>Try again</Button>
            {mode !== 'auto' && <Button size="sm" onClick={() => retry(msg.id, true)} disabled={generating}>Retry with Auto</Button>}
          </div>
        </motion.div>
      )}
      {msg.stopped && <p className="mt-2 text-[13px] text-muted">Stopped.</p>}

      <div className="mt-3 flex min-h-8 items-center gap-0.5 text-[12px] text-muted">
        {(streaming || isLast) && <Logo size={24} state={streaming ? (msg.content ? 'streaming' : 'thinking') : 'idle'} className="mr-2" />}
        {!streaming && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, delay: 0.1 }}
            className={`flex min-w-0 items-center gap-0.5 transition-opacity ${isLast ? '' : 'md:opacity-0 md:group-hover/msg:opacity-100 md:group-focus-within/msg:opacity-100'}`}>
            {msg.content && <CopyButton text={msg.content} />}
            <IconButton icon="retry" label="Retry" size="sm" onClick={() => retry(msg.id)} disabled={generating} />
            {msg.model && <span className="ml-2 truncate">{msg.drafts?.length ? `Council, answered by ${shortName(msg.model)}` : shortName(msg.model)}</span>}
          </motion.div>
        )}
      </div>
    </div>
  );
});
