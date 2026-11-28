import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { useEffect, useState } from 'react';
import { SUGGESTIONS } from '../../lib/prompts';
import { useSettings } from '../../stores/settings';
import { useModels, chatModels } from '../../stores/models';
import { useChat } from '../../stores/chat';
import { Logo } from '../ui/Logo';
import { Icon } from '../ui/Icon';

function greeting(name: string) {
  const h = new Date().getHours();
  const part = h < 5 ? 'Hello, night owl' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return name.trim() ? `${part}, ${name.trim()}` : part;
}

// The one orchestrated entrance in the app: greeting, then composer, then suggestions.
const parent: Variants = { show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } } };
export const rise: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] } } };

export function WelcomeHero() {
  const name = useSettings((s) => s.userName);
  const { models, error } = useModels();
  const n = chatModels(models).length;
  const shown = useCountUp(n);
  return (
    <motion.div variants={rise} className="text-center">
      <h1 className="m-0 inline-flex items-center gap-3.5 font-serif text-[clamp(30px,4.6vw,42px)] font-normal leading-tight tracking-[-0.02em] [text-wrap:balance] max-md:gap-2.5">
        <Logo size={38} className="max-md:size-[30px]" />{greeting(name)}
      </h1>
      <p className="mt-2.5 text-[14px] text-muted">{n ? <><span className="font-mono tabular-nums text-ink-2">{shown}</span> free open-source models online</> : error ? 'Model list unavailable. Check your connection.' : <span className="shimmer">Connecting to the model network…</span>}</p>
    </motion.div>
  );
}

export function Suggestions() {
  const setDraft = useChat((s) => s.setDraft);
  return (
    <motion.div variants={rise} className="mx-auto mt-3.5 flex max-w-[740px] flex-wrap justify-center gap-2">
      {SUGGESTIONS.map((s) => (
        <button key={s.label} type="button"
          onClick={() => { setDraft(s.prompt); requestAnimationFrame(() => { const p = document.getElementById('prompt') as HTMLTextAreaElement | null; p?.focus(); p?.setSelectionRange(p.value.length, p.value.length); }); }}
          className="inline-flex items-center gap-2 rounded-[10px] border border-line bg-paper px-3.5 py-2 text-[14px] text-ink-2 transition-[background-color,border-color,color,transform] duration-150 hover:border-line-strong hover:bg-raised hover:text-ink active:scale-[0.97]">
          <Icon name={s.icon} size={17} className="text-muted" />{s.label}
        </button>
      ))}
    </motion.div>
  );
}

export const WelcomeStagger = ({ children }: { children: React.ReactNode }) => (
  <motion.div variants={parent} initial="hidden" animate="show" className="contents">{children}</motion.div>
);

/** Counts up to n (the models coming online), once. */
function useCountUp(n: number, ms = 900) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!n) return;
    if (reduce) { setV(n); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(n * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [n, ms, reduce]);
  return v;
}
