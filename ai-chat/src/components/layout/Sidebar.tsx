import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import type { Conversation } from '../../lib/types';
import { useChat } from '../../stores/chat';
import { useSettings } from '../../stores/settings';
import { useUI } from '../../stores/ui';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { IconButton } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Logo } from '../ui/Logo';
import { ChatMenu } from './ChatMenu';

export function startNewChat() {
  useChat.getState().open(null);
  useUI.getState().set({ artifactKey: null, artifactFull: false, sidebarOpen: false });
  requestAnimationFrame(() => document.getElementById('prompt')?.focus());
}

function Row({ c, active, mobile }: { c: Conversation; active: boolean; mobile: boolean }) {
  const [open, setOpen] = useState(false);
  const more = useRef<HTMLButtonElement>(null);
  const select = () => { useChat.getState().open(c.id); useUI.getState().set({ artifactKey: null, sidebarOpen: false }); };
  return (
    <motion.div layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} transition={{ layout: { type: 'spring', duration: 0.4, bounce: 0.1 }, opacity: { duration: 0.15 } }}
      role="link" tabIndex={0} onClick={select} onKeyDown={(e) => e.key === 'Enter' && select()}
      className={clsx('group relative flex min-h-9 cursor-pointer items-center gap-1 rounded-[10px] pl-2.5 pr-1 text-[14px] max-md:min-h-[42px]',
        active ? 'bg-hover-strong text-ink' : 'text-ink-2 hover:bg-hover hover:text-ink')}>
      <span className="min-w-0 flex-1 truncate [mask-image:linear-gradient(90deg,#000_85%,transparent)]">{c.title}</span>
      <button ref={more} type="button" aria-label={`More options for ${c.title}`} onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={clsx('grid size-7 place-items-center rounded-lg text-muted hover:bg-hover-strong hover:text-ink', open || active || mobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}>
        <Icon name="more" size={17} />
      </button>
      <ChatMenu conv={c} open={open} onClose={() => setOpen(false)} anchor={more} placement={mobile ? 'auto' : 'right'} />
    </motion.div>
  );
}

export function Sidebar() {
  const mobile = useIsMobile();
  const { rail, set: setSettings, userName, apiKey } = useSettings();
  const { sidebarOpen, searchOpen, search, set } = useUI();
  const convos = useChat((s) => s.convos);
  const currentId = useChat((s) => s.currentId);
  const collapsed = rail && !mobile;

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return convos.filter((c) => c.messages.length && (!q || c.title.toLowerCase().includes(q) || c.messages.some((m) => m.content.toLowerCase().includes(q))));
  }, [convos, search]);
  const starred = items.filter((c) => c.starred);
  const recent = items.filter((c) => !c.starred);

  const openSearch = () => { if (collapsed) setSettings({ rail: false }); set({ searchOpen: !searchOpen || collapsed, search: searchOpen && !collapsed ? '' : search }); requestAnimationFrame(() => document.getElementById('chat-search')?.focus()); };

  const body = (
    <motion.aside
      aria-label="Chats"
      animate={mobile ? { x: sidebarOpen ? 0 : '-104%' } : { width: collapsed ? 60 : 272 }}
      initial={false}
      transition={{ type: 'spring', duration: 0.42, bounce: 0.06 }}
      className={clsx('flex shrink-0 flex-col gap-0.5 overflow-hidden border-r border-line bg-side px-2 pb-[env(safe-area-inset-bottom)] pt-[max(10px,env(safe-area-inset-top))]',
        mobile && 'fixed inset-y-0 left-0 z-50 w-[min(300px,86vw)] shadow-pop')}
    >
      <div className={clsx('flex min-h-11 items-center pb-2', collapsed ? 'flex-col justify-center gap-1.5' : 'justify-between pl-2 pr-0.5')}>
        {!collapsed && (
          <a href="./" onClick={(e) => { e.preventDefault(); startNewChat(); }} className="flex items-center gap-2.5 whitespace-nowrap font-serif text-[19px] font-semibold tracking-[-0.01em] text-ink">
            <Logo size={24} />Careva AI
          </a>
        )}
        <IconButton icon={mobile ? 'x' : 'panel'} label={mobile ? 'Close' : collapsed ? 'Expand sidebar (Ctrl+.)' : 'Collapse sidebar (Ctrl+.)'}
          onClick={() => (mobile ? set({ sidebarOpen: false }) : setSettings({ rail: !rail }))} />
      </div>

      <button type="button" onClick={startNewChat} title="New chat (Ctrl+Shift+O)"
        className={clsx('group flex min-h-[38px] items-center gap-2.5 whitespace-nowrap rounded-[10px] py-2 font-medium text-accent-ink transition-colors hover:bg-accent-soft', collapsed ? 'justify-center' : 'px-2')}>
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-white transition-transform group-active:scale-90"><Icon name="plus" size={16} strokeWidth={2.4} /></span>
        {!collapsed && 'New chat'}
      </button>
      <button type="button" onClick={openSearch} title="Search chats (Ctrl+K)"
        className={clsx('flex min-h-[38px] items-center gap-2.5 whitespace-nowrap rounded-[10px] py-2 text-[14px] text-ink-2 transition-colors hover:bg-hover-strong hover:text-ink', collapsed ? 'justify-center' : 'px-2.5')}>
        <Icon name="search" size={19} />{!collapsed && 'Search chats'}
      </button>

      {!collapsed && (
        <>
          <AnimatePresence initial={false}>
            {searchOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', duration: 0.3, bounce: 0 }} className="overflow-hidden">
                <input id="chat-search" type="search" value={search} placeholder="Search your chats…" aria-label="Search chats" autoComplete="off"
                  onChange={(e) => set({ search: e.target.value })} onKeyDown={(e) => e.key === 'Escape' && set({ search: '', searchOpen: false })}
                  className="my-1.5 w-full rounded-[10px] border border-line bg-raised px-3 py-2 text-[14px] outline-none focus:border-line-strong" />
              </motion.div>
            )}
          </AnimatePresence>
          <nav aria-label="Chat history" className="-mx-1 mt-2 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1 pb-2">
            {!items.length && <p className="px-2.5 py-3.5 text-[13px] leading-relaxed text-muted">{search ? 'No chats match your search.' : 'Your chats will appear here. Start one in the message box.'}</p>}
            {starred.length > 0 && <div className="px-2.5 pb-1.5 pt-3.5 text-[12px] font-medium text-muted">Starred</div>}
            <AnimatePresence initial={false}>{starred.map((c) => <Row key={c.id} c={c} active={c.id === currentId} mobile={mobile} />)}</AnimatePresence>
            {recent.length > 0 && <div className="px-2.5 pb-1.5 pt-3.5 text-[12px] font-medium text-muted">Recents</div>}
            <AnimatePresence initial={false}>{recent.map((c) => <Row key={c.id} c={c} active={c.id === currentId} mobile={mobile} />)}</AnimatePresence>
          </nav>
        </>
      )}

      <div className={clsx('border-t border-line pt-2', collapsed && 'mt-auto')}>
        <button type="button" onClick={() => set({ dialog: 'settings', sidebarOpen: false })} title="Settings"
          className={clsx('flex w-full items-center gap-2.5 whitespace-nowrap rounded-xl p-[7px] text-left hover:bg-hover-strong', collapsed && 'justify-center')}>
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-[13px] font-semibold text-paper">{(userName.trim()[0] || (apiKey ? 'C' : '?')).toUpperCase()}</span>
          {!collapsed && (
            <>
              <span className="flex min-w-0 flex-1 flex-col text-[14px] leading-tight">
                <span className="truncate">{userName.trim() || 'Settings'}</span>
                <span className="truncate text-[12px] text-muted">{apiKey ? 'Connected to OpenRouter' : 'Not connected'}</span>
              </span>
              <Icon name="settings" size={18} className="text-muted" />
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );

  return (
    <>
      {body}
      <AnimatePresence>
        {mobile && sidebarOpen && (
          <motion.div className="fixed inset-0 z-40 bg-[rgb(20_15_5/0.35)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => set({ sidebarOpen: false })} />
        )}
      </AnimatePresence>
    </>
  );
}
