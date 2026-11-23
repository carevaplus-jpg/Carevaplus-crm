import { initials } from '@/lib/format';
import { cn } from './cn';

const hsl = (h: number, s: number, l: number) => `hsl(${Math.round(h) % 360}, ${s}%, ${l}%)`;

export function Avatar({ name, hue = 220, size = 36, ring = false, className }: { name: string; hue?: number; size?: number; ring?: boolean; className?: string }) {
  return (
    <div
      className={cn('shrink-0 rounded-full flex items-center justify-center font-display font-semibold text-white select-none', ring && 'ring-2 ring-white shadow-card', className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, ${hsl(hue, 70, 56)}, ${hsl(hue + 40, 65, 42)})`,
      }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
