import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';
import { Icon } from './Icon';

export function IconButton({ icon, label, size = 'md', className, active, ...rest }: { icon: string; label: string; size?: 'sm' | 'md'; active?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button" aria-label={label} title={label} {...rest}
      className={clsx('inline-grid shrink-0 place-items-center rounded-[10px] text-ink-2 transition-[background-color,color,transform] duration-150 hover:bg-hover-strong hover:text-ink active:scale-[0.94] disabled:pointer-events-none disabled:opacity-40',
        size === 'sm' ? 'size-8' : 'size-9 max-md:size-10', active && 'bg-accent-soft text-accent-ink hover:bg-accent-soft', className)}
    >
      <Icon name={icon} size={size === 'sm' ? 17 : 19} />
    </button>
  );
}

export function Button({ variant = 'default', size = 'md', className, ...rest }: { variant?: 'default' | 'primary' | 'danger' | 'ghost'; size?: 'sm' | 'md' | 'lg' } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button" {...rest}
      className={clsx('inline-flex items-center justify-center gap-2 rounded-[10px] border font-medium transition-[background-color,transform] duration-150 active:scale-[0.97] disabled:opacity-40',
        size === 'sm' && 'px-2.5 py-1 text-[13px]', size === 'md' && 'px-3.5 py-2 text-[14px]', size === 'lg' && 'rounded-xl px-5 py-3 text-[16px]',
        variant === 'default' && 'border-line-strong bg-raised hover:bg-paper',
        variant === 'primary' && 'border-accent bg-accent text-white hover:bg-accent-hover',
        variant === 'danger' && 'border-danger bg-danger text-white hover:opacity-90',
        variant === 'ghost' && 'border-transparent bg-transparent hover:bg-hover-strong', className)}
    />
  );
}
