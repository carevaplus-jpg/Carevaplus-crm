// Side panel for large code and live HTML/SVG previews ("artifacts").
import { esc, highlight, langLabel, extFor } from './markdown.js';

export class Artifacts {
  constructor({ onToast }) {
    this.items = new Map();
    this.current = null;
    this.tab = 'preview';
    this.streaming = false;
    this.onToast = onToast;
    this.panel = document.getElementById('artifact-panel');
    this.frame = document.getElementById('ap-frame');
    this.codeEl = document.querySelector('#ap-code code');
    this.lastSrc = '';
    this.panel.querySelector('#ap-close').addEventListener('click', () => this.close());
    this.panel.querySelector('#ap-tabs').addEventListener('click', (e) => {
      const t = e.target.closest('[data-tab]')?.dataset.tab;
      if (t) { this.tab = t; this.render(); }
    });
    this.panel.querySelector('#ap-copy').addEventListener('click', async () => {
      const a = this.items.get(this.current);
      if (!a) return;
      try { await navigator.clipboard.writeText(a.code); this.onToast?.('Copied to clipboard'); } catch {}
    });
    this.panel.querySelector('#ap-download').addEventListener('click', () => {
      const a = this.items.get(this.current);
      if (!a) return;
      const name = `${a.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'artifact'}.${extFor(a.lang)}`;
      const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([a.code], { type: 'text/plain' })), download: name });
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });
  }

  get isOpen() { return !this.panel.hidden; }

  set(art, { streaming = false } = {}) {
    this.items.set(art.key, art);
    if (this.current === art.key) { this.streaming = streaming; this.render(); }
  }

  open(key, { streaming = false } = {}) {
    if (!this.items.has(key)) return;
    this.current = key;
    this.streaming = streaming;
    this.tab = this.items.get(key).previewable && !streaming ? 'preview' : 'code';
    this.lastSrc = '';
    this.panel.hidden = false;
    document.getElementById('app').classList.add('panel-open');
    this.render();
    this.markActive();
  }

  close() {
    this.panel.hidden = true;
    this.current = null;
    this.frame.srcdoc = '';
    this.lastSrc = '';
    document.getElementById('app').classList.remove('panel-open');
    this.markActive();
  }

  finish(key) {
    if (this.current !== key) return;
    this.streaming = false;
    if (this.items.get(key)?.previewable) this.tab = 'preview';
    this.render();
  }

  markActive() {
    document.querySelectorAll('.artifact-card').forEach((c) => c.classList.toggle('active', c.dataset.art === this.current));
  }

  render() {
    const a = this.items.get(this.current);
    if (!a) return;
    this.panel.querySelector('#ap-title').textContent = a.title;
    this.panel.querySelector('#ap-sub').textContent = `${langLabel(a.lang)} · ${a.lines} lines${this.streaming ? ' · writing…' : ''}`;
    const tabs = this.panel.querySelector('#ap-tabs');
    tabs.hidden = !a.previewable;
    tabs.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === this.tab)));
    const showPreview = a.previewable && this.tab === 'preview';
    this.frame.hidden = !showPreview;
    this.codeEl.parentElement.hidden = showPreview;
    if (showPreview) {
      const src = /^\s*<svg/i.test(a.code) || a.lang.toLowerCase() === 'svg'
        ? `<!doctype html><meta charset="utf-8"><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#fff">${a.code}</body>`
        : a.code;
      if (src !== this.lastSrc) { this.frame.srcdoc = src; this.lastSrc = src; }
    } else {
      this.codeEl.innerHTML = this.streaming ? esc(a.code) : highlight(a.code, a.lang);
      this.codeEl.className = 'hljs';
      if (this.streaming) this.codeEl.parentElement.scrollTop = this.codeEl.parentElement.scrollHeight;
    }
  }
}
