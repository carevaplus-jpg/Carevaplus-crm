import { useRef, useState } from 'react';
import { useSettings } from '../../stores/settings';
import { useModels, chatModels, shortName } from '../../stores/models';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { Menu, MenuItem, MenuLabel, MenuSep } from '../ui/Menu';
import { Icon } from '../ui/Icon';

const OptIcon = ({ name }: { name: string }) => <span className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-ink"><Icon name={name} size={17} /></span>;

export function ModelPicker() {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const { mode, model, councilSize, set } = useSettings();
  const { models, error } = useModels();
  const mobile = useIsMobile();
  const free = chatModels(models);
  const label = mode === 'council' ? `Council of ${councilSize}` : mode === 'single' ? shortName(model) : mobile ? 'Auto' : 'Auto: best free model';
  const ctx = (n: number) => (n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : `${Math.round(n / 1000)}K`);

  return (
    <>
      <button ref={btn} type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}
        className="inline-flex min-w-0 items-center gap-1 rounded-[10px] px-2 py-1.5 text-[13.5px] text-ink-2 transition-colors hover:bg-hover-strong hover:text-ink">
        <span className="max-w-[36vw] truncate">{label}</span><Icon name="chevronDown" size={15} />
      </button>
      <Menu open={open} onClose={() => setOpen(false)} anchor={btn} placement="above" width={380}>
        <MenuLabel>Mode</MenuLabel>
        <MenuItem leading={<OptIcon name="sparkles" />} label="Auto" sub="The strongest free model, switching automatically when one is busy" checked={mode === 'auto'} onSelect={() => set({ mode: 'auto' })} />
        <MenuItem leading={<OptIcon name="scale" />} label="Council" badge={<span className="rounded-full bg-accent-soft px-2 py-px text-[11px] text-accent-ink">best quality</span>}
          sub={`Top ${councilSize} models answer in parallel, then the best ideas are merged. Slower.`} checked={mode === 'council'} onSelect={() => set({ mode: 'council' })} />
        <MenuSep />
        <MenuLabel>Or pick one model ({free.length} free)</MenuLabel>
        {error && <p className="px-2.5 py-2 text-[12.5px] text-muted">Couldn't load models: {error}</p>}
        {free.map((m) => (
          <MenuItem key={m.id} label={shortName(m.id)} checked={mode === 'single' && model === m.id} onSelect={() => set({ mode: 'single', model: m.id })}
            badge={<>{[m.vision && 'vision', m.supportsReasoning && 'reasoning', m.audio && 'audio'].filter(Boolean).map((c) => <span key={String(c)} className="rounded-full bg-hover-strong px-2 py-px text-[11px] font-normal text-muted">{c}</span>)}</>}
            sub={`${m.provider}, ${ctx(m.contextLength)} context`} />
        ))}
      </Menu>
    </>
  );
}
