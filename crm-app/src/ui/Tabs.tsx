import { cn } from './cn';

export function Tabs<T extends string>({ value, options, onChange, counts }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; counts?: Partial<Record<T, number>> }) {
  return (
    <div className="flex items-center gap-1 border-b border-surface-200 overflow-x-auto no-scrollbar">
      {options.map((o) => {
        const active = o.value === value;
        const count = counts?.[o.value];
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
              active ? 'text-brand-700' : 'text-ink-500 hover:text-ink-800',
            )}
          >
            {o.label}
            {count !== undefined && <span className={cn('ml-1.5 text-xs', active ? 'text-brand-500' : 'text-ink-400')}>{count}</span>}
            {active && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-brand-600 rounded-full" />}
          </button>
        );
      })}
    </div>
  );
}
