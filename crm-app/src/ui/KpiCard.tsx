import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from './cn';

export function KpiCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel,
  tint = 'brand',
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  delta?: number;
  deltaLabel?: string;
  tint?: 'brand' | 'gold' | 'success' | 'navy';
}) {
  const tintClasses: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600',
    gold: 'bg-gold-400/15 text-gold-700',
    success: 'bg-success-50 text-success-600',
    navy: 'bg-navy-900 text-gold-400',
  };
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="bg-surface-0 rounded-xl ring-1 ring-surface-200 shadow-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-500">{label}</span>
        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', tintClasses[tint])}>
          <Icon className="size-4" strokeWidth={2} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="font-display text-2xl font-bold text-ink-900 tabular-nums tracking-tight">{value}</span>
        {delta !== undefined && (
          <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold', positive ? 'text-success-600' : 'text-danger-500')}>
            {positive ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(delta)}%{deltaLabel && <span className="text-ink-400 font-normal ml-0.5">{deltaLabel}</span>}
          </span>
        )}
      </div>
    </div>
  );
}
