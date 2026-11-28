import { motion } from 'framer-motion';
import { useEffect } from 'react';
import clsx from 'clsx';
import { Icon } from '../ui/Icon';
import { langLabel, type Artifact } from '../../lib/artifacts';
import { useUI } from '../../stores/ui';
import { matches, isWideQuery } from '../../lib/utils';

// Each new artifact auto-opens once (like Claude); if the reader closes it, it stays closed.
const autoOpened = new Set<string>();

const KIND_ICON: Record<Artifact['kind'], string> = { html: 'globe', svg: 'image', react: 'layers', mermaid: 'chart', code: 'code' };
const KIND_LABEL: Record<Artifact['kind'], string> = { html: 'Web page', svg: 'Image', react: 'Component', mermaid: 'Diagram', code: '' };

export function ArtifactCard({ art, version, streaming }: { art: Artifact; version?: number; streaming: boolean }) {
  const openKey = useUI((s) => s.artifactKey);
  const set = useUI((s) => s.set);
  const active = openKey === art.key;
  const writing = streaming && !art.closed;

  useEffect(() => {
    if (!streaming || autoOpened.has(art.key) || !matches(isWideQuery)) return;
    autoOpened.add(art.key);
    if (!useUI.getState().artifactKey || useUI.getState().artifactKey?.split(':')[0] !== art.msgId) {
      set({ artifactKey: art.key, artifactTab: 'code', artifactAuto: true });
    }
  }, [streaming, art.key, art.msgId, set]);
  return (
    <motion.button
      type="button" layout="position"
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      onClick={() => set(active ? { artifactKey: null } : { artifactKey: art.key, artifactTab: art.kind === 'code' || writing ? 'code' : 'preview', artifactAuto: writing })}
      className={clsx('not-prose my-4 flex w-full max-w-[480px] items-center gap-3 rounded-2xl border bg-raised p-2.5 pr-3 text-left font-sans shadow-hair transition-[border-color,box-shadow] duration-200 first:mt-0',
        active ? 'border-line-strong ring-[3px] ring-accent-soft' : 'border-line hover:border-line-strong')}
    >
      <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-[10px] border border-line bg-code text-ink-2">
        <Icon name={KIND_ICON[art.kind]} size={19} />
        {writing && <motion.span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" initial={{ scaleX: 0 }} animate={{ scaleX: [0, 1, 0], originX: [0, 0, 1] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[14.5px] font-medium text-ink">{art.title}</span>
        <span className="text-[12.5px] text-muted">
          {writing ? <span className="shimmer">Writing {art.lines} lines…</span>
            : <>{KIND_LABEL[art.kind] || langLabel(art.lang)}{version ? `, version ${version}` : ''} · {art.lines} lines</>}
        </span>
      </span>
      <Icon name="chevronRight" size={18} className={clsx('text-muted transition-transform duration-200', active && 'translate-x-0.5 text-ink')} />
    </motion.button>
  );
}
