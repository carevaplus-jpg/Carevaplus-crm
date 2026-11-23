import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

export function Modal({ open, onClose, title, width = 440, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; width?: number; children: ReactNode; footer?: ReactNode }) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-950/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-surface-0 rounded-2xl shadow-float w-full max-h-[88vh] flex flex-col animate-[pop_.16s_cubic-bezier(.16,1,.3,1)]" style={{ maxWidth: width }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-surface-200">
          <h2 className="font-display font-semibold text-ink-900">{title}</h2>
          <IconButton icon={<X className="size-4" />} label="Close" onClick={onClose} />
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-surface-200 bg-surface-50/60 flex justify-end gap-2 rounded-b-2xl">{footer}</div>}
      </div>
      <style>{`@keyframes pop { from { transform: scale(.97); opacity: 0 } to { transform: scale(1); opacity: 1 } }`}</style>
    </div>,
    document.body,
  );
}
