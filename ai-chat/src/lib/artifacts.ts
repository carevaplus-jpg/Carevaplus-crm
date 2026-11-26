// Artifacts: large or renderable code blocks lifted out of a reply into the side panel.
import type { Conversation } from './types';

export type ArtifactKind = 'html' | 'svg' | 'react' | 'mermaid' | 'code';

export interface Artifact {
  key: string;          // `${msgId}:${index}`
  identity: string;     // groups revisions of the same artifact across messages
  msgId: string;
  index: number;
  start: number;        // offset of the opening fence in the message text
  lang: string;
  kind: ArtifactKind;
  title: string;
  code: string;
  lines: number;
  closed: boolean;      // false while the fence is still streaming
}

// `(?![\s\S])` = true end of text (`$` alone means end of *line* under the m flag).
const FENCE = /^([ \t]*)(```|~~~)([\w+#.-]*)[^\n]*\n([\s\S]*?)(?:\n\1\2[ \t]*(?=\n|$)|(?![\s\S]))/gm;

const LANG_LABEL: Record<string, string> = {
  js: 'JavaScript', javascript: 'JavaScript', jsx: 'React', tsx: 'React', ts: 'TypeScript', typescript: 'TypeScript',
  py: 'Python', python: 'Python', html: 'HTML', svg: 'SVG', css: 'CSS', json: 'JSON', sql: 'SQL', sh: 'Shell', bash: 'Shell',
  shell: 'Shell', java: 'Java', c: 'C', cpp: 'C++', cs: 'C#', csharp: 'C#', go: 'Go', rust: 'Rust', rs: 'Rust', php: 'PHP',
  rb: 'Ruby', ruby: 'Ruby', kotlin: 'Kotlin', swift: 'Swift', md: 'Markdown', markdown: 'Markdown', yaml: 'YAML',
  yml: 'YAML', xml: 'XML', dart: 'Dart', mermaid: 'Mermaid', vue: 'Vue', scss: 'SCSS',
};
export const langLabel = (l: string) => LANG_LABEL[(l || '').toLowerCase()] || (l ? l[0].toUpperCase() + l.slice(1) : 'Code');

const EXT: Record<string, string> = {
  javascript: 'js', python: 'py', typescript: 'ts', html: 'html', svg: 'svg', css: 'css', json: 'json', markdown: 'md',
  bash: 'sh', shell: 'sh', ruby: 'rb', rust: 'rs', csharp: 'cs', mermaid: 'mmd', jsx: 'jsx', tsx: 'tsx',
};
export const extFor = (a: Pick<Artifact, 'lang' | 'kind'>) => (a.kind === 'react' ? 'jsx' : EXT[a.lang.toLowerCase()] || a.lang.toLowerCase() || 'txt');

export function kindOf(lang: string, code: string): ArtifactKind {
  const l = lang.toLowerCase();
  if (l === 'html' || (l === '' && /^\s*<!doctype html|^\s*<html/i.test(code))) return 'html';
  if (l === 'svg' || (l === 'xml' && /^\s*<svg/i.test(code))) return 'svg';
  if (l === 'mermaid') return 'mermaid';
  if (['jsx', 'tsx', 'react'].includes(l) || (['js', 'javascript', 'ts', 'typescript'].includes(l) && /export\s+default/.test(code) && /<[A-Z][\w.]*[\s/>]|return\s*\(\s*</.test(code))) return 'react';
  return 'code';
}

export const isPreviewable = (k: ArtifactKind) => k !== 'code';

/** Should this fenced block become an artifact (vs. an inline code block)? */
export function isArtifactBlock(lang: string, code: string) {
  const k = kindOf(lang, code);
  return isPreviewable(k) || code.split('\n').length >= 18;
}

function titleOf(kind: ArtifactKind, lang: string, code: string) {
  if (kind === 'html' || kind === 'svg') {
    const t = code.match(/<title>([^<]{1,80})<\/title>/i)?.[1] || code.match(/<h1[^>]*>([^<{]{1,80})</i)?.[1];
    if (t?.trim()) return t.trim();
  }
  if (kind === 'react') {
    const n = code.match(/export\s+default\s+(?:function|class)\s+([A-Z]\w*)/)?.[1] || code.match(/export\s+default\s+([A-Z]\w*)/)?.[1]
      || code.match(/(?:function|const)\s+([A-Z]\w*)/)?.[1];
    return n ? n.replace(/([a-z])([A-Z])/g, '$1 $2') : 'React component';
  }
  if (kind === 'mermaid') {
    const first = code.trim().split('\n')[0].trim().split(/\s+/)[0];
    return `${first ? first[0].toUpperCase() + first.slice(1) : 'Mermaid'} diagram`;
  }
  if (kind === 'svg') return 'SVG image';
  if (kind === 'html') return 'Web page';
  const fn = code.match(/(?:function|def|class|fn|func)\s+([A-Za-z_]\w*)/)?.[1];
  return fn ? `${langLabel(lang)}: ${fn}` : `${langLabel(lang)} code`;
}

export function extractArtifacts(content: string, msgId: string): Artifact[] {
  const out: Artifact[] = [];
  FENCE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FENCE.exec(content))) {
    const [whole, , , lang, code] = m;
    if (!isArtifactBlock(lang, code)) continue;
    const kind = kindOf(lang, code);
    const title = titleOf(kind, lang, code);
    const closed = /\n[ \t]*(```|~~~)[ \t]*$/.test(whole);
    out.push({
      key: `${msgId}:${out.length}`, identity: `${kind}:${title.toLowerCase()}`, msgId, index: out.length,
      start: m.index + m[1].length, lang, kind, title, code, lines: code.replace(/\n$/, '').split('\n').length, closed,
    });
    if (m.index === FENCE.lastIndex) FENCE.lastIndex++;
  }
  return out;
}

/** All artifacts in a conversation, plus version info for revisions of the same artifact. */
export function conversationArtifacts(conv: Conversation | null) {
  const all: Artifact[] = [];
  if (!conv) return { all, versionsOf: (_a: Artifact) => [] as Artifact[] };
  for (const m of conv.messages) if (m.role === 'assistant' && m.content) all.push(...extractArtifacts(m.content, m.id));
  const versionsOf = (a: Artifact) => all.filter((x) => x.identity === a.identity);
  return { all, versionsOf };
}

/* ---------------- Sandboxed preview documents ---------------- */

const ERROR_BRIDGE = `<script>
(function(){
  function send(msg){ try { parent.postMessage({ type: 'careva-artifact-error', message: String(msg).slice(0, 800) }, '*'); } catch (e) {} }
  window.addEventListener('error', function(e){ send(e.message || 'Script error'); });
  window.addEventListener('unhandledrejection', function(e){ send((e.reason && e.reason.message) || e.reason || 'Unhandled promise rejection'); });
  window.__carevaError = send;
  parent.postMessage({ type: 'careva-artifact-ready' }, '*');
})();
</script>`;

const BASE_STYLE = `<style>html,body{margin:0;min-height:100%;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;}
#careva-error{position:fixed;inset:auto 12px 12px 12px;padding:12px 14px;border-radius:10px;background:#fdecea;color:#8a1c14;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap;box-shadow:0 6px 24px rgba(0,0,0,.15)}</style>`;

function reactProgram(code: string) {
  let src = code;
  const prelude: string[] = [];
  const missing: string[] = [];
  const bind = (what: string, lib: string) => {
    const w = what.trim();
    const parts: string[] = [];
    const ns = w.match(/\*\s+as\s+(\w+)/);
    if (ns) { prelude.push(`const ${ns[1]} = ${lib};`); return; }
    const named = w.match(/\{([\s\S]*)\}/);
    const def = w.replace(/\{[\s\S]*\}/, '').replace(/,/g, '').trim();
    if (def) prelude.push(`const ${def} = (${lib} && ${lib}.default) || ${lib};`);
    if (named) {
      for (const p of named[1].split(',').map((s) => s.trim()).filter(Boolean)) {
        const [orig, alias] = p.replace(/^type\s+/, '').split(/\s+as\s+/);
        parts.push(alias ? `${orig}: ${alias}` : orig);
      }
      if (parts.length) prelude.push(`const { ${parts.join(', ')} } = ${lib};`);
    }
  };
  src = src.replace(/^\s*import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"];?[ \t]*$/gm, (_m, what: string, from: string) => {
    if (/^type\s/.test(what)) return '';
    const lib = from === 'react' ? 'React' : from.startsWith('react-dom') ? 'ReactDOM' : from === 'lucide-react' ? 'LucideReact' : null;
    if (lib) bind(what, lib);
    else { missing.push(from); bind(what, `__missing(${JSON.stringify(from)})`); }
    return '';
  });
  src = src.replace(/^\s*import\s+['"][^'"]+['"];?[ \t]*$/gm, '');
  let name = '';
  src = src.replace(/export\s+default\s+(async\s+)?function\s*([A-Z]\w*)?/, (_m, a = '', n?: string) => { name = n || '__Default'; return `${a}function ${name}`; });
  if (!name) src = src.replace(/export\s+default\s+class\s+([A-Z]\w*)/, (_m, n: string) => { name = n; return `class ${n}`; });
  if (!name) src = src.replace(/export\s+default\s+([A-Z]\w*)\s*;?/, (_m, n: string) => { name = n; return ''; });
  if (!name) src = src.replace(/export\s+default\s+/, () => { name = '__Default'; return 'const __Default = '; });
  src = src.replace(/^export\s+(?=(const|let|var|function|class|async)\b)/gm, '');
  if (!name) name = src.match(/function\s+(App)\b/)?.[1] || [...src.matchAll(/(?:function|const)\s+([A-Z]\w*)/g)].pop()?.[1] || '';
  const mount = name
    ? `ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(${name}));`
    : `throw new Error('No React component found. Export a component with "export default".');`;
  return { program: `${prelude.join('\n')}\n${src}\n${mount}`, missing };
}

export function previewDoc(a: Pick<Artifact, 'kind' | 'code'>): string {
  if (a.kind === 'html') {
    const doc = /<html[\s>]/i.test(a.code) ? a.code : `<!doctype html><html><head><meta charset="utf-8"></head><body>${a.code}</body></html>`;
    return doc.replace(/<head([^>]*)>/i, `<head$1>${ERROR_BRIDGE}`);
  }
  if (a.kind === 'svg') {
    return `<!doctype html><meta charset="utf-8">${ERROR_BRIDGE}<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff}svg{max-width:100%;height:auto}</style>${a.code}`;
  }
  if (a.kind === 'mermaid') {
    return `<!doctype html><html><head><meta charset="utf-8">${ERROR_BRIDGE}${BASE_STYLE}
<style>body{display:grid;place-items:center;min-height:100vh;background:#fff;padding:16px;box-sizing:border-box}</style>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script></head>
<body><pre class="mermaid" id="m"></pre><script>
document.getElementById('m').textContent = ${JSON.stringify(a.code)};
mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'strict' });
mermaid.run({ nodes: [document.getElementById('m')] }).catch(function(e){ window.__carevaError(e.message || e); });
</script></body></html>`;
  }
  if (a.kind === 'react') {
    const { program, missing } = reactProgram(a.code);
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${ERROR_BRIDGE}${BASE_STYLE}
<script src="https://cdn.tailwindcss.com/3.4.16"></script>
<script src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
<script>window.react = window.React;</script>
<script src="https://cdn.jsdelivr.net/npm/lucide-react@0.454.0/dist/umd/lucide-react.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.26.4/babel.min.js"></script>
</head><body><div id="root"></div>
<script type="text/plain" id="src">${program.replace(/<\/script/gi, '<\\/script')}</script>
<script>
window.__missing = function(name){
  return new Proxy(function(){ return null; }, { get: function(_t, key){ if (key === 'default' || key === '__esModule') return undefined;
    return function(){ return React.createElement('span', { title: name + ' is not available in previews' }); }; } });
};
${missing.length ? `console.warn('Not available in preview: ${missing.join(', ')}');` : ''}
try {
  var code = document.getElementById('src').textContent;
  var out = Babel.transform(code, { filename: 'artifact.tsx', presets: [['typescript', { isTSX: true, allExtensions: true }], 'react'] }).code;
  new Function('React', 'ReactDOM', 'LucideReact', out)(window.React, window.ReactDOM, window.LucideReact || {});
} catch (e) {
  window.__carevaError(e.message || e);
  var box = document.createElement('div'); box.id = 'careva-error'; box.textContent = String(e.message || e); document.body.appendChild(box);
}
</script></body></html>`;
  }
  return '';
}
