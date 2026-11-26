// Markdown → safe HTML, with LaTeX math (KaTeX) and code-block / artifact enhancement.
import { icon } from './icons.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CODE_SPLIT = /(```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]+`)/g;

function extractMath(text, store) {
  const tok = (tex, display) => { store.push({ tex, display }); return `MATHTOKEN${store.length - 1}X`; };
  return text.split(CODE_SPLIT).map((part, i) => (i % 2 ? part : part
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => `\n\n${tok(t, true)}\n\n`)
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => `\n\n${tok(t, true)}\n\n`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => tok(t, false))
    // $inline$ — opening $ not followed by space, closing $ not preceded by space and not followed by a digit (avoids "$5 and $10")
    .replace(/(^|[^\\$\w])\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\d)/g, (_, pre, t) => pre + tok(t, false))
  )).join('');
}

function renderTex({ tex, display }) {
  if (!window.katex) return `<code>${esc(tex)}</code>`;
  try { return window.katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'html', trust: false }); }
  catch { return `<code>${esc(tex)}</code>`; }
}

let configured = false;
export function renderMarkdown(text) {
  if (!window.marked || !window.DOMPurify) return `<p>${esc(text).replace(/\n/g, '<br>')}</p>`;
  if (!configured) { window.marked.setOptions({ gfm: true, breaks: false }); configured = true; }
  const math = [];
  const src = extractMath(text || '', math);
  let html = window.DOMPurify.sanitize(window.marked.parse(src));
  if (math.length) html = html.replace(/MATHTOKEN(\d+)X/g, (_, i) => renderTex(math[+i]));
  return html;
}

/* ---------- code blocks & artifacts ---------- */
const LANG_LABEL = {
  js: 'JavaScript', javascript: 'JavaScript', jsx: 'React', tsx: 'React (TS)', ts: 'TypeScript', typescript: 'TypeScript',
  py: 'Python', python: 'Python', html: 'HTML', svg: 'SVG', css: 'CSS', json: 'JSON', sql: 'SQL', sh: 'Shell', bash: 'Shell',
  java: 'Java', c: 'C', cpp: 'C++', cs: 'C#', csharp: 'C#', go: 'Go', rust: 'Rust', rs: 'Rust', php: 'PHP', rb: 'Ruby', ruby: 'Ruby',
  kotlin: 'Kotlin', swift: 'Swift', md: 'Markdown', markdown: 'Markdown', yaml: 'YAML', yml: 'YAML', xml: 'XML', dart: 'Dart',
};
export const langLabel = (l) => LANG_LABEL[(l || '').toLowerCase()] || (l ? l[0].toUpperCase() + l.slice(1) : 'Code');
const EXT = { javascript: 'js', python: 'py', typescript: 'ts', html: 'html', svg: 'svg', css: 'css', json: 'json', markdown: 'md', bash: 'sh', shell: 'sh', ruby: 'rb', rust: 'rs', csharp: 'cs' };
export const extFor = (l) => EXT[(l || '').toLowerCase()] || (l || 'txt').toLowerCase();

export function isPreviewable(lang, code) {
  const l = (lang || '').toLowerCase();
  return l === 'html' || l === 'svg' || (l === 'xml' && /^\s*<svg/i.test(code));
}

function artifactTitle(lang, code) {
  const t = code.match(/<title>([^<]{1,80})<\/title>/i)?.[1] || code.match(/<h1[^>]*>([^<]{1,80})</i)?.[1];
  if (t) return t.trim();
  if (isPreviewable(lang, code)) return (lang || '').toLowerCase() === 'html' ? 'Web page' : 'SVG image';
  const fn = code.match(/(?:function|def|class|const|fn|func)\s+([A-Za-z_][\w]*)/)?.[1];
  return fn ? `${langLabel(lang)}: ${fn}` : `${langLabel(lang)} code`;
}

/**
 * Upgrades rendered <pre><code> blocks. Big or previewable blocks become artifact cards
 * (opened in the side panel); others get a header with a copy button and highlighting.
 * Returns the artifacts found, in order.
 */
export function enhanceCode(root, { msgId, streaming = false, artifacts = true } = {}) {
  const found = [];
  root.querySelectorAll('pre > code').forEach((codeEl) => {
    const pre = codeEl.parentElement;
    const lang = (codeEl.className.match(/language-([\w+#-]+)/) || [])[1] || '';
    const code = codeEl.textContent;
    const lines = code.replace(/\n$/, '').split('\n').length;
    if (artifacts && msgId && (isPreviewable(lang, code) || lines >= 18)) {
      const index = found.length;
      const art = { key: `${msgId}:${index}`, lang, code, title: artifactTitle(lang, code), lines, previewable: isPreviewable(lang, code) };
      found.push(art);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'artifact-card';
      card.dataset.art = art.key;
      card.innerHTML = `<span class="ac-icon">${icon(art.previewable ? 'layers' : 'code')}</span>
        <span class="ac-text"><span class="ac-title">${esc(art.title)}</span>
        <span class="ac-sub">${esc(langLabel(lang))} · ${lines} lines${streaming ? ' · writing…' : ' · Click to open'}</span></span>
        <span class="ac-open">${icon('chevronRight')}</span>`;
      pre.replaceWith(card);
      return;
    }
    const wrap = document.createElement('div');
    wrap.className = 'codeblock';
    wrap.innerHTML = `<div class="cb-head"><span>${esc(lang ? langLabel(lang) : 'Code')}</span>
      <button type="button" class="copy-btn" data-copy-code>${icon('copy')}<span>Copy</span></button></div>`;
    pre.replaceWith(wrap);
    wrap.appendChild(pre);
    if (window.hljs && !streaming) { try { window.hljs.highlightElement(codeEl); } catch {} }
  });
  root.querySelectorAll('a[href]').forEach((a) => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
  return found;
}

export function highlight(code, lang) {
  if (window.hljs) {
    try {
      if (lang && window.hljs.getLanguage(lang)) return window.hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
      return window.hljs.highlightAuto(code).value;
    } catch {}
  }
  return esc(code);
}
