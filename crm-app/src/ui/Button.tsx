import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-card focus-visible:outline-brand-400 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:rounded-t-[inherit] before:bg-gradient-to-b before:from-white/25 before:to-transparent before:pointer-events-none',
  secondary: 'bg-white text-ink-700 ring-1 ring-inset ring-surface-300 hover:bg-surface-50',
  ghost: 'text-ink-600 hover:bg-surface-100',
  danger: 'bg-white text-danger-600 ring-1 ring-inset ring-danger-500/30 hover:bg-danger-50',
  gold: 'bg-gradient-to-br from-gold-400 to-gold-600 text-navy-900 hover:brightness-105 shadow-gold relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:rounded-t-[inherit] before:bg-gradient-to-b before:from-white/40 before:to-transparent before:pointer-events-none',
};
const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'secondary', size = 'md', icon, iconRight, loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-45 disabled:pointer-events-none select-none active:scale-[0.97]',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
});
