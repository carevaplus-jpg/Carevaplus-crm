import { memo, useMemo, type ComponentProps } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import clsx from 'clsx';
import { CodeBlock } from './CodeBlock';
import { ArtifactCard } from '../artifacts/ArtifactCard';
import { extractArtifacts, isArtifactBlock, type Artifact } from '../../lib/artifacts';

/* eslint-disable @typescript-eslint/no-explicit-any */
function codeFromPre(children: any): { code: string; lang: string } | null {
  const child = Array.isArray(children) ? children[0] : children;
  if (!child?.props) return null;
  const lang = /language-([\w+#.-]+)/.exec(child.props.className || '')?.[1] || '';
  const raw = child.props.children;
  const code = Array.isArray(raw) ? raw.join('') : String(raw ?? '');
  return { code, lang };
}

export const Markdown = memo(function Markdown({ text, msgId, streaming = false, artifacts = true, versionOf, className, caret }: {
  text: string; msgId?: string; streaming?: boolean; artifacts?: boolean; versionOf?: (a: Artifact) => number | undefined; className?: string; caret?: boolean;
}) {
  const arts = useMemo(() => (artifacts && msgId ? extractArtifacts(text, msgId) : []), [text, msgId, artifacts]);
  const components = useMemo<ComponentProps<typeof ReactMarkdown>['components']>(() => ({
    pre: ({ children }) => {
      const c = codeFromPre(children);
      if (!c) return <pre>{children}</pre>;
      if (artifacts && msgId && isArtifactBlock(c.lang, c.code)) {
        const norm = c.code.replace(/\n$/, '');
        const art = arts.find((a) => a.code.replace(/\n$/, '') === norm) ?? arts.find((a) => norm.startsWith(a.code.replace(/\n$/, '').slice(0, 200)));
        if (art) return <ArtifactCard art={art} version={versionOf?.(art)} streaming={streaming} />;
      }
      return <CodeBlock code={c.code} lang={c.lang} streaming={streaming} />;
    },
    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
    table: ({ children }) => <table>{children}</table>,
  }), [arts, artifacts, msgId, streaming, versionOf]);

  return (
    <div className={clsx('prose-careva', caret && (text ? 'caret' : 'caret empty'), className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]} rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
});
