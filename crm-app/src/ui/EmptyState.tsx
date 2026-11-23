import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="h-12 w-12 rounded-full bg-surface-100 flex items-center justify-center mb-3.5">
        <Icon className="size-5 text-ink-400" strokeWidth={1.6} />
      </div>
      <p className="font-display font-semibold text-ink-800">{title}</p>
      {body && <p className="text-sm text-ink-500 mt-1 max-w-xs">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
