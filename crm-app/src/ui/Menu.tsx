import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './cn';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
}

export function Menu({ trigger, items }: { trigger: ReactNode; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: Math.max(8, r.right - 190) });
    }
    setOpen((v) => !v);
  };

  return (
    <div ref={btnRef} className="inline-block">
      <div onClick={toggle}>{trigger}</div>
      {open &&
        createPortal(
          <div className="fixed z-50 w-48 bg-white rounded-lg shadow-float ring-1 ring-surface-200 py-1 animate-[menuIn_.1s_ease-out]" style={{ top: pos.top, left: pos.left }}>
            {items.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-surface-50', item.danger ? 'text-danger-600' : 'text-ink-700')}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
            <style>{`@keyframes menuIn { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: translateY(0) } }`}</style>
          </div>,
          document.body,
        )}
    </div>
  );
}
