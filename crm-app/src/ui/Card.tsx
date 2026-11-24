import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export function Card({ children, className, padded = true, glass = false, ...rest }: HTMLAttributes<HTMLDivElement> & { padded?: boolean; glass?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl shadow-card transition-shadow duration-200',
        glass ? 'glass-panel glass-sheen' : 'bg-surface-0 ring-1 ring-surface-200',
        padded && 'p-5',
        className,
      )}
      {...rest}
    >
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
