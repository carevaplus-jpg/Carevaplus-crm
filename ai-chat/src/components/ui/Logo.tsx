import { motion, useReducedMotion } from 'framer-motion';

/**
 * The Careva spark. Idle: still. "thinking": slow breathing rotation.
 * "streaming": a gentle continuous turn, the one ambient motion in the app, so you always know it's working.
 */
export function Logo({ size = 28, state = 'idle', className = '' }: { size?: number; state?: 'idle' | 'thinking' | 'streaming'; className?: string }) {
  const reduce = useReducedMotion();
  const anim = reduce || state === 'idle' ? { rotate: 0, scale: 1 }
    : state === 'thinking' ? { rotate: [0, 90, 180], scale: [1, 0.86, 1] }
    : { rotate: 360, scale: 1 };
  const transition = state === 'thinking'
    ? { duration: 1.8, ease: [0.45, 0, 0.55, 1] as const, repeat: Infinity }
    : state === 'streaming' ? { duration: 3.2, ease: 'linear' as const, repeat: Infinity } : { duration: 0.4 };
  return (
    <motion.svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true" animate={anim} transition={transition}>
      <defs>
        <linearGradient id="careva-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e0875f" /><stop offset="1" stopColor="#b8532d" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#careva-g)" />
      <path d="M32 11c1.6 10.4 6.7 15.4 17 17-10.3 1.6-15.4 6.7-17 17-1.6-10.3-6.6-15.4-17-17 10.4-1.6 15.4-6.6 17-17z" fill="#fff" />
      <circle cx="45.5" cy="44.5" r="3.2" fill="#fff" opacity=".9" />
    </motion.svg>
  );
}
