import { memo, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { highlightLines } from '../../lib/highlight';
import { langLabel } from '../../lib/artifacts';
import { CopyButton } from '../ui/CopyButton';
import { IconButton } from '../ui/Button';
import { Icon } from '../ui/Icon';

const COLLAPSE_AT = 24;

/** Inline code block: language header, copy, wrap toggle, line numbers, collapsible when long. */
export const CodeBlock = memo(function CodeBlock({ code, lang, streaming }: { code: string; lang: string; streaming: boolean }) {
  const [wrap, setWrap] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const text = code.replace(/\n$/, '');
  const lines = useMemo(() => (streaming ? text.split('\n').map(escape) : highlightLines(text, lang)), [text, lang, streaming]);
  const numbered = lines.length > 3;
  const collapsible = !streaming && lines.length > COLLAPSE_AT;
  const shown = collapsible && !expanded ? lines.slice(0, COLLAPSE_AT - 6) : lines;

  return (
    <div className="not-prose group/code my-4 overflow-hidden rounded-xl border border-line bg-code font-sans first:mt-0">
      <div className="flex items-center justify-between border-b border-line py-1 pl-3.5 pr-1.5 text-[12px] text-muted">
        <span className="font-medium">{lang ? langLabel(lang) : 'Code'}</span>
        <div className="flex items-center gap-0.5">
          <IconButton icon="wrap" label={wrap ? 'Turn off line wrap' : 'Wrap lines'} size="sm" active={wrap} onClick={() => setWrap(!wrap)} className="!size-7" />
          <CopyButton text={text} withLabel />
        </div>
      </div>
      <div className="relative">
        <pre className={clsx('m-0 overflow-x-auto py-3 font-mono text-[13px] leading-[1.6]', wrap && 'whitespace-pre-wrap break-all')}>
          <code className="hljs grid">
            {shown.map((html, i) => (
              <span key={i} className="flex">
                {numbered && <span className="sticky left-0 w-10 shrink-0 select-none bg-code pr-3 text-right text-muted/60 tabular-nums">{i + 1}</span>}
                <span className={clsx('min-w-0 flex-1', numbered ? 'pr-4' : 'px-4')} dangerouslySetInnerHTML={{ __html: html || ' ' }} />
              </span>
            ))}
          </code>
        </pre>
        <AnimatePresence>
          {collapsible && !expanded && (
            <motion.div exit={{ opacity: 0 }} className="absolute inset-x-0 bottom-0 flex h-24 items-end justify-center bg-gradient-to-t from-code via-code/85 to-transparent pb-3">
              <button type="button" onClick={() => setExpanded(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-raised px-3 py-1.5 text-[13px] font-medium text-ink-2 shadow-hair hover:text-ink">
                <Icon name="chevronDown" size={15} /> Show all {lines.length} lines
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

function escape(s: string) { return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!)); }
