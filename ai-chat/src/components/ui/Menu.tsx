import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import clsx from 'clsx';

const CloseCtx = createContext<() => void>(() => {});

export function Menu({ open, onClose, anchor, children, placement = 'auto', width }: {
  open: boolean; onClose: () => void; anchor: RefObject<HTMLElement | null>; children: ReactNode;
  placement?: 'auto' | 'above' | 'below' | 'right'; width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; origin: string }>({ left: 0, top: 0, origin: 'top left' });

  useLayoutEffect(() => {
    if (!open || !anchor.current) return;
    const r = anchor.current.getBoundingClientRect();
    const w = width ?? 240;
    const estH = Math.min(560, innerHeight * 0.72);
    const above = placement === 'above' || (placement === 'auto' && r.bottom + estH > innerHeight && r.top > innerHeight / 2);
    let left = placement === 'right' ? r.right + 6 : r.left;
    if (left + w > innerWidth - 12) left = Math.max(12, r.right - w);
    left = Math.max(12, left);
    if (placement === 'right') setPos({ left, top: Math.max(12, Math.min(r.top, innerHeight - 320)), origin: 'top left' });
    else if (above) setPos({ left, bottom: innerHeight - r.top + 6, origin: `${r.left - left + r.width / 2}px 100%` });
    else setPos({ left, top: r.bottom + 6, origin: `${r.left - left + r.width / 2}px 0` });
  }, [open, anchor, placement, width]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current?.contains(e.target as Node) || anchor.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); anchor.current?.focus(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = [...(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"],[role="menuitemradio"]') ?? [])];
        const i = items.indexOf(document.activeElement as HTMLElement);
        items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
      }
    };
    const onResize = () => onClose();
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    addEventListener('resize', onResize);
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('[role="menuitem"],[role="menuitemradio"]')?.focus({ preventScroll: true }));
    return () => { document.removeEventListener('pointerdown', onDown, true); document.removeEventListener('keydown', onKey, true); removeEventListener('resize', onResize); };
  }, [open, onClose, anchor]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref} role="menu"
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
          transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, transformOrigin: pos.origin, width }}
          className="fixed z-[70] max-h-[min(560px,72vh)] min-w-[220px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-2xl border border-line bg-raised p-1.5 shadow-pop"
        >
          <CloseCtx.Provider value={onClose}>{children}</CloseCtx.Provider>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function MenuItem({ icon, label, sub, onSelect, danger, checked, keepOpen, badge, leading }: {
  icon?: string; label: ReactNode; sub?: ReactNode; onSelect: () => void; danger?: boolean; checked?: boolean; keepOpen?: boolean;
  badge?: ReactNode; leading?: ReactNode;
}) {
  const close = useContext(CloseCtx);
  return (
    <button
      type="button" role={checked === undefined ? 'menuitem' : 'menuitemradio'} aria-checked={checked}
      onClick={() => { if (!keepOpen) close(); onSelect(); }}
      className={clsx('flex w-full items-start gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[14px] outline-none transition-colors hover:bg-hover-strong focus-visible:bg-hover-strong',
        danger ? 'text-danger' : 'text-ink')}
    >
      {leading}
      {icon && <Icon name={icon} size={18} className={clsx('mt-px', danger ? 'text-danger' : 'text-ink-2')} />}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex flex-wrap items-center gap-1.5 font-medium">{label}{badge}</span>
        {sub && <span className="text-[12.5px] leading-snug text-muted">{sub}</span>}
      </span>
      {checked !== undefined && <span className="mt-0.5 w-[18px] text-accent">{checked && <Icon name="check" size={18} strokeWidth={2.4} />}</span>}
    </button>
  );
}

export const MenuLabel = ({ children }: { children: ReactNode }) => <div className="px-2.5 pb-1 pt-2.5 text-[12px] font-medium text-muted">{children}</div>;
export const MenuSep = () => <div className="mx-1 my-1.5 h-px bg-line" />;
