import { AnimatePresence, motion } from 'framer-motion';
import { memo, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { Message } from '../../lib/types';
import { editAndResend } from '../../lib/engine';
import { lineCount } from '../../lib/utils';
import { useChat } from '../../stores/chat';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { CopyButton } from '../ui/CopyButton';
import { IconButton, Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

export function FileChip({ name, text }: { name: string; text: string }) {
  return (
    <span className="inline-flex max-w-64 items-center gap-2.5 rounded-xl border border-line bg-raised py-2 pl-2 pr-3 text-left text-[13px]">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-ink"><Icon name="file" size={18} /></span>
      <span className="flex min-w-0 flex-col"><b className="truncate font-medium">{name}</b><span className="text-[12px] text-muted">{lineCount(text)} lines</span></span>
    </span>
  );
}

export const UserMessage = memo(function UserMessage({ msg }: { msg: Message }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(msg.content);
  const [showActions, setShowActions] = useState(false);
  const generating = useChat((s) => s.generating);
  const mobile = useIsMobile();
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (editing && ta.current) { ta.current.style.height = `${Math.min(ta.current.scrollHeight + 4, 420)}px`; ta.current.focus(); ta.current.setSelectionRange(value.length, value.length); }
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => { if (value.trim()) { setEditing(false); void editAndResend(msg.id, value); } };

  return (
    <div className="group/msg ml-auto flex max-w-[82%] flex-col items-end max-md:max-w-[90%]">
      {(msg.images?.length || msg.files?.length) ? (
        <div className="mb-1.5 flex flex-wrap justify-end gap-1.5">
          {msg.images?.map((u, i) => <img key={i} src={u} alt="Attached" className="max-h-44 max-w-60 rounded-xl border border-line" />)}
          {msg.files?.map((f, i) => <FileChip key={i} {...f} />)}
        </div>
      ) : null}
      <AnimatePresence mode="wait" initial={false}>
        {editing ? (
          <motion.div key="edit" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} className="w-[min(620px,78vw)]">
            <textarea ref={ta} value={value} onChange={(e) => setValue(e.target.value)} rows={3} aria-label="Edit message"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); save(); } if (e.key === 'Escape') setEditing(false); }}
              className="w-full resize-y rounded-2xl border border-line-strong bg-raised px-3.5 py-3 text-[15.5px] leading-normal outline-none" />
            <div className="mt-2 flex justify-end gap-2">
              <Button size="sm" onClick={() => { setValue(msg.content); setEditing(false); }}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={save}>Save and send</Button>
            </div>
          </motion.div>
        ) : msg.content ? (
          <motion.div key="bubble" layout="position" onClick={() => mobile && setShowActions(!showActions)}
            className="whitespace-pre-wrap rounded-[18px] bg-bubble px-4 py-2.5 text-[15.5px] [overflow-wrap:anywhere]">{msg.content}</motion.div>
        ) : null}
      </AnimatePresence>
      {!editing && (
        <div className={clsx('mt-0.5 flex min-h-8 items-center gap-0.5 transition-opacity', mobile ? (showActions ? 'flex' : 'hidden') : 'opacity-0 group-hover/msg:opacity-100 group-focus-within/msg:opacity-100')}>
          <CopyButton text={msg.content} />
          <IconButton icon="pencil" label="Edit" size="sm" disabled={generating} onClick={() => { setValue(msg.content); setEditing(true); }} />
        </div>
      )}
    </div>
  );
});
