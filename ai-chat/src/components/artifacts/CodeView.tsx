import { useEffect, useMemo, useRef } from 'react';
import clsx from 'clsx';
import { highlightLines } from '../../lib/highlight';

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));

/** Editor-style code view: sticky line-number gutter, highlighted lines, follows the end while streaming. */
export function CodeView({ code, lang, streaming, wrap }: { code: string; lang: string; streaming: boolean; wrap: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const lines = useMemo(() => {
    const text = code.replace(/\n$/, '');
    return streaming ? text.split('\n').map(esc) : highlightLines(text, lang === 'react' ? 'jsx' : lang);
  }, [code, lang, streaming]);
  useEffect(() => { if (streaming && box.current) box.current.scrollTop = box.current.scrollHeight; }, [lines, streaming]);
  const gutter = String(lines.length).length;

  return (
    <div ref={box} className="h-full overflow-auto bg-code-panel">
      <pre className={clsx('m-0 min-w-full py-4 font-mono text-[13px] leading-[1.65]', wrap ? 'whitespace-pre-wrap break-all' : 'w-max')}>
        <code className="hljs grid">
          {lines.map((html, i) => (
            <span key={i} className={clsx('flex', streaming && i === lines.length - 1 && 'bg-accent-soft/60')}>
              <span className="sticky left-0 z-[1] shrink-0 select-none bg-code-panel pl-4 pr-4 text-right text-muted/55 tabular-nums" style={{ width: `${gutter + 3.2}ch` }}>{i + 1}</span>
              <span className="min-w-0 flex-1 pr-6" dangerouslySetInnerHTML={{ __html: html || ' ' }} />
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
