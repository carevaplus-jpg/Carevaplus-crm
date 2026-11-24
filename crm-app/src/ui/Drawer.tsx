import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  width = 480,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  width?: number;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-[3px] animate-[fadeIn_.18s_ease-out]" onClick={onClose} />
      <div
        className="glass-panel glass-sheen relative h-full flex flex-col animate-[slideIn_.3s_var(--ease-spring)] rounded-l-2xl"
        style={{ width: `min(${width}px, 100vw)` }}
      >
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-white/50">
          <div>
            <h2 className="font-display font-semibold text-lg text-ink-900">{title}</h2>
            {subtitle && <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>}
          </div>
          <IconButton icon={<X className="size-4" />} label="Close" onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-white/50 bg-white/30 flex justify-end gap-2">{footer}</div>}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideIn { from { transform: translateX(28px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
      `}</style>
    </div>,
    document.body,
  );
}
