import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { conversationArtifacts, extFor, isPreviewable, langLabel, previewDoc, type Artifact } from '../../lib/artifacts';
import { useChat } from '../../stores/chat';
import { useUI } from '../../stores/ui';
import { send } from '../../lib/engine';
import { download } from '../../lib/utils';
import { IconButton } from '../ui/Button';
import { CopyButton } from '../ui/CopyButton';
import { Icon } from '../ui/Icon';
import { Menu, MenuItem } from '../ui/Menu';
import { CodeView } from './CodeView';
import { useIsMobile } from '../../hooks/useMediaQuery';

const WIDTH_KEY = 'careva.panelWidth';

export function ArtifactPanel() {
  const key = useUI((s) => s.artifactKey);
  const tab = useUI((s) => s.artifactTab);
  const full = useUI((s) => s.artifactFull);
  const set = useUI((s) => s.set);
  const conv = useChat((s) => s.convos.find((c) => c.id === s.currentId) ?? null);
  const generating = useChat((s) => s.generating);
  const mobile = useIsMobile();
  const { all, versionsOf } = useMemo(() => conversationArtifacts(conv), [conv]);
  const art = all.find((a) => a.key === key) ?? null;
  const lastMsgId = conv?.messages[conv.messages.length - 1]?.id;
  const streaming = !!art && generating && art.msgId === lastMsgId && !art.closed;

  // an artifact opened while being written flips to its live preview once its code is complete
  const auto = useUI((s) => s.artifactAuto);
  useEffect(() => {
    if (auto && art && !streaming) set({ artifactAuto: false, ...(isPreviewable(art.kind) ? { artifactTab: 'preview' as const } : {}) });
  }, [auto, streaming, art, set]);

  // close if the artifact disappears (chat switched / regenerated)
  useEffect(() => { if (key && !art) set({ artifactKey: null, artifactFull: false }); }, [key, art, set]);

  const [width, setWidth] = useState(() => Number(localStorage.getItem(WIDTH_KEY)) || Math.round(Math.min(820, Math.max(400, innerWidth * 0.46))));
  const dragging = useRef(false);
  const onDrag = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.cursor = 'col-resize';
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const w = Math.round(Math.min(innerWidth - 380, Math.max(360, innerWidth - e.clientX)));
    setWidth(w);
  };
  const onUp = () => { if (dragging.current) { dragging.current = false; document.body.style.cursor = ''; localStorage.setItem(WIDTH_KEY, String(width)); } };

  return (
    <AnimatePresence>
      {art && (
        <motion.aside
          key="panel" aria-label="Artifact"
          initial={mobile ? { y: '100%' } : { opacity: 0, x: 40 }} animate={mobile ? { y: 0 } : { opacity: 1, x: 0 }}
          exit={mobile ? { y: '100%' } : { opacity: 0, x: 40, transition: { duration: 0.18 } }}
          transition={{ type: 'spring', duration: 0.45, bounce: 0.08 }}
          style={!mobile && !full ? { width } : undefined}
          className={clsx('z-40 flex shrink-0 flex-col bg-raised',
            mobile || full ? 'fixed inset-0' : 'relative border-l border-line max-[1100px]:fixed max-[1100px]:inset-y-0 max-[1100px]:right-0 max-[1100px]:shadow-pop')}
        >
          {!mobile && !full && (
            <div onPointerDown={onDrag} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
              className="group absolute inset-y-0 -left-1.5 z-10 w-3 cursor-col-resize" role="separator" aria-orientation="vertical" aria-label="Resize panel">
              <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:bg-accent" />
            </div>
          )}
          <PanelBody art={art} versions={versionsOf(art)} tab={isPreviewable(art.kind) ? tab : 'code'} streaming={streaming} full={full} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function PanelBody({ art, versions, tab, streaming, full }: { art: Artifact; versions: Artifact[]; tab: 'preview' | 'code'; streaming: boolean; full: boolean }) {
  const set = useUI((s) => s.set);
  const [wrap, setWrap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [verOpen, setVerOpen] = useState(false);
  const verBtn = useRef<HTMLButtonElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const previewable = isPreviewable(art.kind);
  const vIndex = versions.findIndex((v) => v.key === art.key);
  const doc = useMemo(() => (previewable && !streaming ? previewDoc(art) : ''), [art, previewable, streaming]);

  useEffect(() => setError(null), [art.key, art.code, reload]);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || !e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'careva-artifact-error') setError(String(e.data.message || 'Unknown error'));
    };
    addEventListener('message', onMsg);
    return () => removeEventListener('message', onMsg);
  }, []);

  const fileName = `${art.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'artifact'}.${extFor(art)}`;
  const openTab = () => {
    // wrapper page holds the artifact in a sandboxed iframe, so it can't reach this app's storage
    const wrapper = `<!doctype html><meta charset="utf-8"><title>${art.title.replace(/</g, '&lt;')}</title><style>html,body,iframe{margin:0;width:100%;height:100%;border:0;display:block}</style><iframe sandbox="allow-scripts allow-forms allow-modals allow-popups" srcdoc="${previewDoc(art).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></iframe>`;
    const url = URL.createObjectURL(new Blob([wrapper], { type: 'text/html' }));
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  const askFix = () => {
    void send(`The "${art.title}" artifact shows this error in the preview:\n\n${error}\n\nPlease fix it and send the complete corrected version.`);
    setError(null);
  };

  return (
    <>
      <header className="flex min-h-14 items-center gap-1 border-b border-line py-2 pl-4 pr-2 pt-[max(8px,env(safe-area-inset-top))]">
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate font-semibold">{art.title}</span>
          <span className="flex items-center gap-1 text-[12px] text-muted">
            {versions.length > 1 ? (
              <>
                <button ref={verBtn} type="button" onClick={() => setVerOpen(!verOpen)} className="inline-flex items-center gap-0.5 rounded-md px-1 -ml-1 hover:bg-hover-strong hover:text-ink">
                  <Icon name="history" size={13} /> Version {vIndex + 1} of {versions.length}<Icon name="chevronDown" size={13} />
                </button>
                <Menu open={verOpen} onClose={() => setVerOpen(false)} anchor={verBtn} placement="below">
                  {versions.map((v, i) => (
                    <MenuItem key={v.key} label={`Version ${i + 1}`} sub={`${v.lines} lines`} checked={v.key === art.key} onSelect={() => set({ artifactKey: v.key })} />
                  ))}
                </Menu>
              </>
            ) : <span>{langLabel(art.kind === 'react' ? 'jsx' : art.lang)}</span>}
            <span aria-hidden="true">·</span>
            {streaming ? <span className="shimmer">Writing line {art.lines}…</span> : <span>{art.lines} lines</span>}
          </span>
        </div>

        {previewable && (
          <div className="relative mr-1 inline-flex rounded-[10px] bg-hover-strong p-[3px]" role="group" aria-label="View">
            {(['preview', 'code'] as const).map((t) => (
              <button key={t} type="button" aria-pressed={tab === t} onClick={() => set({ artifactTab: t })}
                className={clsx('relative z-[1] inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] transition-colors max-sm:px-2', tab === t ? 'text-ink' : 'text-ink-2 hover:text-ink')}>
                {tab === t && <motion.span layoutId="seg-pill" className="absolute inset-0 -z-[1] rounded-lg bg-raised shadow-hair" transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} />}
                <Icon name={t === 'preview' ? 'eye' : 'code'} size={15} /><span className="max-sm:hidden">{t === 'preview' ? 'Preview' : 'Code'}</span>
              </button>
            ))}
          </div>
        )}
        {tab === 'code' && <IconButton icon="wrap" label={wrap ? 'Turn off line wrap' : 'Wrap lines'} size="sm" active={wrap} onClick={() => setWrap(!wrap)} />}
        {tab === 'preview' && previewable && <IconButton icon="retry" label="Reload preview" size="sm" onClick={() => setReload((r) => r + 1)} disabled={streaming} />}
        <CopyButton text={art.code} />
        <IconButton icon="download" label="Download" size="sm" onClick={() => download(fileName, art.code)} />
        {previewable && <IconButton icon="external" label="Open in new tab" size="sm" onClick={openTab} disabled={streaming} className="max-sm:hidden" />}
        <IconButton icon={full ? 'minimize' : 'maximize'} label={full ? 'Exit full screen' : 'Full screen'} size="sm" onClick={() => set({ artifactFull: !full })} className="max-md:hidden" />
        <IconButton icon="x" label="Close panel" size="sm" onClick={() => set({ artifactKey: null, artifactFull: false })} />
      </header>

      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {tab === 'preview' && previewable ? (
              streaming ? (
                <div className="grid h-full place-items-center bg-code-panel text-[14px] text-muted"><span className="shimmer">The preview will appear when the code is finished…</span></div>
              ) : (
                <iframe key={`${art.key}:${reload}`} ref={frame} title={`${art.title} preview`} srcDoc={doc}
                  sandbox="allow-scripts allow-forms allow-modals allow-popups" referrerPolicy="no-referrer" className="block size-full border-0 bg-white" />
              )
            ) : <CodeView code={art.code} lang={art.kind === 'react' ? 'jsx' : art.lang} streaming={streaming} wrap={wrap} />}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {error && tab === 'preview' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ type: 'spring', duration: 0.35, bounce: 0.1 }}
              className="absolute inset-x-3 bottom-3 flex items-start gap-3 rounded-xl border border-danger/30 bg-raised p-3 shadow-pop">
              <Icon name="alert" size={18} className="mt-0.5 text-danger" />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium">This artifact hit an error</div>
                <div className="mt-0.5 line-clamp-3 font-mono text-[12px] text-ink-2">{error}</div>
              </div>
              <button type="button" onClick={askFix} className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white hover:bg-accent-hover">Ask Careva to fix</button>
              <IconButton icon="x" label="Dismiss" size="sm" onClick={() => setError(null)} className="!size-7" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
