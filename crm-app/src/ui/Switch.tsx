import { cn } from './cn';

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-out ring-1 ring-inset disabled:opacity-40 disabled:pointer-events-none',
        checked ? 'bg-brand-600 ring-brand-700/40' : 'bg-surface-200 ring-surface-300',
      )}
    >
      <span
        className={cn(
          'inline-block h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(15,22,38,0.35)] transition-transform duration-200 ease-[cubic-bezier(.34,1.56,.64,1)]',
          checked ? 'translate-x-[22px]' : 'translate-x-[3px]',
        )}
      />
    </button>
  );
}
