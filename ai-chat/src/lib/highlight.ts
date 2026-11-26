import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import python from 'highlight.js/lib/languages/python';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import c from 'highlight.js/lib/languages/c';
import csharp from 'highlight.js/lib/languages/csharp';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import php from 'highlight.js/lib/languages/php';
import ruby from 'highlight.js/lib/languages/ruby';
import kotlin from 'highlight.js/lib/languages/kotlin';
import swift from 'highlight.js/lib/languages/swift';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
import dart from 'highlight.js/lib/languages/dart';
import scss from 'highlight.js/lib/languages/scss';

const langs = { javascript, typescript, xml, css, python, json, bash, sql, java, cpp, c, csharp, go, rust, php, ruby, kotlin, swift, yaml, markdown, dart, scss };
for (const [n, l] of Object.entries(langs)) hljs.registerLanguage(n, l);
hljs.registerAliases(['jsx', 'js', 'mjs'], { languageName: 'javascript' });
hljs.registerAliases(['tsx', 'ts'], { languageName: 'typescript' });
hljs.registerAliases(['html', 'svg', 'vue'], { languageName: 'xml' });
hljs.registerAliases(['py'], { languageName: 'python' });
hljs.registerAliases(['sh', 'shell', 'zsh', 'console'], { languageName: 'bash' });
hljs.registerAliases(['cs'], { languageName: 'csharp' });
hljs.registerAliases(['rs'], { languageName: 'rust' });
hljs.registerAliases(['rb'], { languageName: 'ruby' });
hljs.registerAliases(['yml'], { languageName: 'yaml' });
hljs.registerAliases(['md'], { languageName: 'markdown' });

const escape = (s: string) => s.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]!));

/** Returns highlighted HTML split into lines (tags re-opened across line breaks so each line is self-contained). */
export function highlightLines(code: string, lang: string): string[] {
  let html: string;
  try {
    html = lang && hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
      : code.length < 20000 ? hljs.highlightAuto(code).value : escape(code);
  } catch { html = escape(code); }
  const lines: string[] = [];
  const open: string[] = [];
  for (const raw of html.split('\n')) {
    let line = open.join('') + raw;
    const re = /<span[^>]*>|<\/span>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw))) { if (m[0] === '</span>') open.pop(); else open.push(m[0]); }
    line += '</span>'.repeat(open.length);
    lines.push(line);
  }
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}
