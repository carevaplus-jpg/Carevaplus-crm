import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export function Card({ children, className, padded = true, ...rest }: HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return (
    <div className={cn('bg-surface-0 rounded-xl ring-1 ring-surface-200 shadow-card', padded && 'p-5', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h3 className="font-display font-semibold text-ink-900 text-[15px]">{title}</h3>
        {subtitle && <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
