import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

const BASE = 'w-full rounded-lg bg-white ring-1 ring-inset ring-surface-300 text-ink-900 text-sm placeholder:text-ink-400 transition-shadow focus:ring-2 focus:ring-brand-400 disabled:bg-surface-50 disabled:text-ink-400';

function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-ink-600 mb-1.5">
      {children}
      {required && <span className="text-danger-500 ml-0.5">*</span>}
    </label>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  hint?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, required, hint, icon, className, ...rest }, ref) {
  return (
    <div>
      {label && <Label required={required}>{label}</Label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">{icon}</span>}
        <input ref={ref} className={cn(BASE, 'px-3', icon && 'pl-9', className)} style={{ height: 38 }} {...rest} />
      </div>
      {hint && <p className="text-[11px] text-ink-400 mt-1">{hint}</p>}
    </div>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, required, className, ...rest }, ref) {
  return (
    <div>
      {label && <Label required={required}>{label}</Label>}
      <textarea ref={ref} className={cn(BASE, 'px-3 py-2 min-h-[88px] resize-y', className)} {...rest} />
    </div>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  required?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, required, className, children, ...rest }, ref) {
  return (
    <div>
      {label && <Label required={required}>{label}</Label>}
      <select ref={ref} className={cn(BASE, 'px-3 appearance-none bg-no-repeat bg-[right_0.65rem_center]', className)} style={{ height: 38 }} {...rest}>
        {children}
      </select>
    </div>
  );
});
