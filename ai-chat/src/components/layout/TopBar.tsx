import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { useChat } from '../../stores/chat';
import { useUI } from '../../stores/ui';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { IconButton } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { ChatMenu } from './ChatMenu';
import { startNewChat } from './Sidebar';

export function TopBar() {
  const conv = useChat((s) => s.convos.find((c) => c.id === s.currentId) ?? null);
  const mobile = useIsMobile();
  const set = useUI((s) => s.set);
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const hasChat = !!conv?.messages.length;
  return (
    <header className="flex min-h-[52px] items-center gap-1.5 px-3 pt-[max(8px,env(safe-area-inset-top))] pb-2 max-md:px-2">
      {mobile && <IconButton icon="menu" label="Open chats" onClick={() => set({ sidebarOpen: true })} />}
      <AnimatePresence mode="wait">
        {hasChat && conv && (
          <motion.button key={conv.id + conv.title} ref={btn} type="button" aria-haspopup="menu" onClick={() => setOpen(!open)}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}
            className="inline-flex min-w-0 max-w-[min(520px,70vw)] items-center gap-1 rounded-[10px] py-1.5 pl-2.5 pr-2 text-[15px] font-medium hover:bg-hover-strong">
            <span className="truncate">{conv.title}</span><Icon name="chevronDown" size={16} className="text-muted" />
          </motion.button>
        )}
      </AnimatePresence>
      {conv && <ChatMenu conv={conv} open={open} onClose={() => setOpen(false)} anchor={btn} placement="below" />}
      <span className="flex-1" />
      {mobile && hasChat && <IconButton icon="pen" label="New chat" onClick={startNewChat} />}
    </header>
  );
}
