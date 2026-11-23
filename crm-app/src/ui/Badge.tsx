import type { ReactNode } from 'react';
import { cn } from './cn';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'gold';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-100 text-ink-700 ring-surface-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  success: 'bg-success-50 text-success-600 ring-success-500/20',
  warning: 'bg-warning-50 text-warning-600 ring-warning-500/20',
  danger: 'bg-danger-50 text-danger-600 ring-danger-500/20',
  gold: 'bg-gold-400/15 text-gold-700 ring-gold-500/30',
};

export function Badge({ children, tone = 'neutral', dot = false, className }: { children: ReactNode; tone?: BadgeTone; dot?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap', TONE_CLASSES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}
