import { useEffect } from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { useStore, type Toast } from '@/store';
import { cn } from './cn';

const ICONS = { success: CheckCircle2, info: Info, warning: AlertTriangle, danger: XCircle };
const TONE: Record<Toast['kind'], string> = {
  success: 'text-success-500',
  info: 'text-brand-500',
  warning: 'text-warning-500',
  danger: 'text-danger-500',
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useStore((s) => s.dismissToast);
  const Icon = ICONS[toast.kind];
  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), 4200);
    return () => clearTimeout(t);
  }, [toast.id, dismiss]);
  return (
    <div className="glass-navy flex items-start gap-3 text-white rounded-xl px-4 py-3 min-w-[280px] max-w-sm animate-[toastIn_.25s_var(--ease-spring)]">
      <Icon className={cn('size-5 shrink-0 mt-0.5', TONE[toast.kind])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{toast.title}</p>
        {toast.subtitle && <p className="text-xs text-white/60 mt-0.5">{toast.subtitle}</p>}
      </div>
      <button onClick={() => dismiss(toast.id)} className="text-white/40 hover:text-white/80">
        <X className="size-4" />
      </button>
    </div>
  );
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
      <style>{`@keyframes toastIn { from { transform: translateY(8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
    </div>
  );
}
