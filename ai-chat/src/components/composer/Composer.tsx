import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useChat } from '../../stores/chat';
import { useSettings } from '../../stores/settings';
import { toast } from '../../stores/ui';
import { send, stop } from '../../lib/engine';
import { STYLES } from '../../lib/prompts';
import { downscaleImage, lineCount } from '../../lib/utils';
import type { StyleKey } from '../../lib/types';
import { useDictation } from '../../hooks/useDictation';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { Menu, MenuItem, MenuLabel, MenuSep } from '../ui/Menu';
import { IconButton } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { ModelPicker } from './ModelPicker';
import { VoiceBar } from './VoiceBar';
import { FileChip } from '../chat/UserMessage';
import { pulseField, surgeField } from '../chat/NeuralField';

const LONG_PASTE = 2500;
const TEXT_LIMIT = 150_000;

export function Composer({ centered }: { centered: boolean }) {
  const { draft, setDraft, attachments, setAttachments, generating } = useChat();
  const { style, thinking, set } = useSettings();
  const voice = useDictation();
  const mobile = useIsMobile();
  const ta = useRef<HTMLTextAreaElement>(null);
  const files = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const plusBtn = useRef<HTMLButtonElement>(null);
  const [plusOpen, setPlusOpen] = useState(false);
  const [drag, setDrag] = useState(false);

  useLayoutEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, innerHeight * 0.38)}px`;
    if (voice.busy) el.scrollTop = el.scrollHeight;
  }, [draft, voice.busy]);

  // keyboard: Esc cancels dictation; Ctrl/Cmd+M toggles it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && voice.busy) { e.preventDefault(); voice.cancel(); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') { e.preventDefault(); if (voice.busy) voice.finish(); else voice.start(); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [voice]);

  async function addFiles(list: File[]) {
    const next = [...useChat.getState().attachments];
    for (const f of list) {
      if (next.length >= 8) { toast('Up to 8 attachments per message.'); break; }
      if (f.type.startsWith('image/')) {
        try { next.push({ kind: 'image', name: f.name, url: await downscaleImage(f) }); } catch { toast(`Couldn't read ${f.name}`); }
      } else if (f.type === 'application/pdf') {
        toast("PDFs aren't supported yet. Paste the text instead, or attach a .txt file.");
      } else if (f.size > 2_000_000) {
        toast(`${f.name} is too large (max 2 MB).`);
      } else {
        let text = await f.text();
        if (text.length > TEXT_LIMIT) text = text.slice(0, TEXT_LIMIT) + '\n…[truncated]';
        next.push({ kind: 'file', name: f.name, text });
      }
    }
    setAttachments(next);
  }

  const submit = () => {
    if (voice.busy) { voice.finish(true); return; }
    if (generating) { stop(); return; }
    if (useChat.getState().draft.trim() || useChat.getState().attachments.length) surgeField();
    void send(useChat.getState().draft);
  };
  const canSend = voice.busy || generating || !!draft.trim() || attachments.length > 0;
  const sendIcon = voice.busy ? 'check' : generating ? 'stop' : 'arrowUp';

  return (
    <motion.form
      layoutId="composer" layout="position"
      transition={{ layout: { type: 'spring', duration: 0.6, bounce: 0.12 } }}
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); void addFiles([...e.dataTransfer.files]); }}
      className={clsx('relative mx-auto w-full max-w-[740px] rounded-[20px] border bg-raised px-4 pb-2.5 pt-3.5 shadow-soft transition-[border-color] duration-150 max-md:rounded-[22px] max-md:pl-3.5 max-md:pr-2',
        generating && !voice.busy && 'compute-live',
        drag ? 'border-dashed border-accent' : voice.busy ? 'border-rec/45' : 'border-line focus-within:border-line-strong')}
    >
      <AnimatePresence initial={false}>
        {attachments.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="-mt-1 mb-3 flex flex-wrap gap-2 pt-1.5">
              <AnimatePresence initial={false}>
                {attachments.map((a, i) => (
                  <motion.div key={`${a.name}-${i}`} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative">
                    {a.kind === 'image' ? <img src={a.url} alt={a.name} className="size-16 rounded-xl border border-line object-cover" /> : <FileChip name={a.name} text={a.text} />}
                    <button type="button" aria-label={`Remove ${a.name}`} onClick={() => setAttachments(attachments.filter((_, j) => j !== i))}
                      className="absolute -right-1.5 -top-1.5 grid size-[22px] place-items-center rounded-full border border-line bg-raised shadow-hair"><Icon name="x" size={12} strokeWidth={2.4} /></button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <textarea
        id="prompt" ref={ta} rows={1} value={draft} aria-label="Message"
        placeholder={voice.busy ? 'Listening… speak now' : centered ? 'How can I help you today?' : 'Reply to Careva AI…'}
        onChange={(e) => { setDraft(e.target.value); if (centered) pulseField(e.target.value.length > draft.length ? 0.7 : 0.3); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !(mobile && 'ontouchstart' in window)) { e.preventDefault(); if (!generating) submit(); }
        }}
        onPaste={(e) => {
          const fl = [...e.clipboardData.files];
          if (fl.length) { e.preventDefault(); void addFiles(fl); return; }
          const text = e.clipboardData.getData('text/plain');
          if (text.length >= LONG_PASTE) { e.preventDefault(); setAttachments([...attachments, { kind: 'file', name: `Pasted text (${lineCount(text)} lines)`, text }]); }
        }}
        className={clsx('block max-h-[38vh] w-full resize-none bg-transparent pr-1.5 text-[16px] leading-normal outline-none placeholder:text-muted', centered ? 'min-h-12' : 'min-h-6')}
      />

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <AnimatePresence mode="popLayout" initial={false}>
            {voice.busy ? (
              <VoiceBar key="voice" state={voice.state} levels={voice.levels} startedAt={voice.startedAt} onCancel={voice.cancel} />
            ) : (
              <motion.div key="tools" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-w-0 items-center gap-1">
                <button ref={plusBtn} type="button" aria-label="Add files, styles and more" aria-haspopup="menu" onClick={() => setPlusOpen(!plusOpen)}
                  className="grid size-[34px] place-items-center rounded-[10px] border border-line text-ink-2 transition-[background-color,transform] hover:bg-hover-strong hover:text-ink active:scale-[0.94] max-md:size-[38px]">
                  <motion.span animate={{ rotate: plusOpen ? 45 : 0 }} transition={{ type: 'spring', duration: 0.3, bounce: 0.2 }}><Icon name="plus" size={18} /></motion.span>
                </button>
                <IconButton icon="bulb" label={`Extended thinking: ${thinking ? 'on' : 'off'}`} active={thinking}
                  onClick={() => { set({ thinking: !thinking }); toast(!thinking ? 'Extended thinking on. Reasoning models will think longer.' : 'Extended thinking off'); }}
                  className="border border-line !size-[34px] max-md:!size-[38px] aria-pressed:border-transparent" aria-pressed={thinking} />
                <AnimatePresence>
                  {style !== 'normal' && (
                    <motion.button type="button" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() => set({ style: 'normal' })} aria-label={`Remove ${STYLES[style].label} style`}
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-[9px] bg-hover-strong py-1.5 pl-2.5 pr-2 text-[13px] text-ink-2">
                      {STYLES[style].label}<Icon name="x" size={14} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {!voice.busy && <ModelPicker />}
          {!voice.busy && <IconButton icon="mic" label="Dictate (Ctrl+M)" onClick={voice.start} />}
          <motion.button
            type="submit" disabled={!canSend || voice.state === 'transcribing' || voice.state === 'starting'}
            onClick={(e) => { if (voice.busy) { e.preventDefault(); voice.finish(false); } }}
            aria-label={voice.busy ? 'Finish dictation' : generating ? 'Stop response' : 'Send message'}
            whileTap={{ scale: 0.92 }}
            className={clsx('grid size-9 place-items-center rounded-[11px] text-white transition-[background-color,opacity] duration-150 disabled:opacity-35 max-md:size-10 max-md:rounded-xl',
              voice.busy ? 'bg-rec' : generating ? 'bg-ink !text-paper' : 'bg-accent hover:bg-accent-hover')}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={sendIcon} initial={{ opacity: 0, scale: 0.5, rotate: -30 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ type: 'spring', duration: 0.3, bounce: 0.25 }}>
                <Icon name={sendIcon} size={18} strokeWidth={2.3} />
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      <input ref={files} type="file" multiple hidden onChange={(e) => { void addFiles([...(e.target.files ?? [])]); e.target.value = ''; }}
        accept="image/*,.txt,.md,.csv,.json,.js,.ts,.jsx,.tsx,.py,.html,.css,.xml,.yaml,.yml,.sql,.java,.c,.cpp,.cs,.go,.rs,.php,.rb,.sh,.log" />
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void addFiles([...(e.target.files ?? [])]); e.target.value = ''; }} />

      <Menu open={plusOpen} onClose={() => setPlusOpen(false)} anchor={plusBtn} placement="above" width={260}>
        <MenuItem icon="paperclip" label="Upload files or photos" onSelect={() => files.current?.click()} />
        {mobile && <MenuItem icon="camera" label="Take a photo" onSelect={() => camera.current?.click()} />}
        <MenuSep />
        <MenuLabel>Use style</MenuLabel>
        {(Object.keys(STYLES) as StyleKey[]).map((k) => (
          <MenuItem key={k} label={STYLES[k].label} sub={STYLES[k].desc} checked={style === k} onSelect={() => set({ style: k })} />
        ))}
      </Menu>
    </motion.form>
  );
}
