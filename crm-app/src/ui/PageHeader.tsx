import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">{children}</div>;
}
