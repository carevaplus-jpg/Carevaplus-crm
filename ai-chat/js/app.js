import {
  APP_NAME, fetchFreeModels, streamChat, completeChat, getKeyInfo, startOAuth, finishOAuth,
} from './openrouter.js';
import * as store from './store.js';
import { systemPrompt, synthesisPrompt, TITLE_PROMPT, SUGGESTIONS } from './prompts.js';

/* ================= State ================= */
const $ = (s, el = document) => el.querySelector(s);
const state = {
  settings: store.loadSettings(),
  models: [],
  modelsError: null,
  convos: [],
  current: null,          // active conversation object
  abort: null,            // AbortController while generating
  attachments: [],        // pending { kind: 'image'|'file', name, url?, text? }
  keyInfo: null,
  search: '',
};
const ICON = 'icons/icon.svg';
const MAX_FALLBACKS = 6;

const svg = {
  copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>',
  retry: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M14 3H6v18h12V7l-4-4zM14 3v4h4"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

/* ================= Helpers ================= */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const modelById = (id) => state.models.find((m) => m.id === id);
const shortName = (id) => {
  const m = modelById(id);
  if (m) return m.name.replace(/^[^:]+:\s*/, '');
  return String(id || '').split('/').pop().replace(/:free$/, '');
};
function toast(text, ms = 2600) {
  const t = $('#toast');
  t.textContent = text; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), ms);
}
function saveSettings() { store.saveSettings(state.settings); }

let mdReady = false;
function renderMarkdown(text) {
  if (!mdReady) {
    if (!window.marked || !window.DOMPurify) return `<p>${esc(text).replace(/\n/g, '<br>')}</p>`;
    window.marked.setOptions({ gfm: true, breaks: false });
    mdReady = true;
  }
  const html = window.marked.parse(text || '');
  return window.DOMPurify.sanitize(html, { ADD_ATTR: ['target'] });
}
function enhanceCode(root) {
  root.querySelectorAll('pre > code').forEach((code) => {
    const pre = code.parentElement;
    if (pre.parentElement.classList.contains('codeblock')) return;
    const lang = (code.className.match(/language-([\w+#-]+)/) || [])[1] || '';
    const wrap = document.createElement('div');
    wrap.className = 'codeblock';
    wrap.innerHTML = `<div class="cb-head"><span>${esc(lang || 'code')}</span><button class="copy-btn" data-copy-code>${svg.copy}<span>Copy</span></button></div>`;
    pre.replaceWith(wrap);
    wrap.appendChild(pre);
    if (window.hljs) {
      try { window.hljs.highlightElement(code); } catch {}
    }
  });
  root.querySelectorAll('a[href]').forEach((a) => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
}
async function copyText(text, btn) {
  try { await navigator.clipboard.writeText(text); } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  if (btn) {
    const old = btn.innerHTML;
    btn.innerHTML = svg.check + (btn.querySelector('span') ? '<span>Copied</span>' : '');
    setTimeout(() => (btn.innerHTML = old), 1400);
  }
}

/* ================= Models ================= */
async function loadModels(force = false) {
  try {
    state.models = await fetchFreeModels({ force });
    state.modelsError = null;
    if (state.settings.mode === 'single' && !modelById(state.settings.model)) {
      state.settings.mode = 'auto'; saveSettings();
    }
  } catch (e) {
    state.modelsError = e.message;
  }
  updateModelLabel();
  if (!state.current?.messages.length) renderThread();
}

function rankedCandidates({ needVision }) {
  let list = state.models.filter((m) => m.id !== 'openrouter/free');
  if (needVision) {
    const vis = list.filter((m) => m.vision);
    list = vis.length ? vis : list;
  }
  const router = state.models.find((m) => m.id === 'openrouter/free');
  const out = list.slice(0, MAX_FALLBACKS);
  if (router) out.push(router);
  return out;
}

function updateModelLabel() {
  const s = state.settings;
  const label = s.mode === 'council' ? `Council · ${s.councilSize} models`
    : s.mode === 'single' ? shortName(s.model) : (isMobile() ? 'Auto' : 'Auto · best free model');
  $('#model-label').textContent = label;
}

function openModelMenu() {
  const menu = $('#model-menu');
  const s = state.settings;
  const tick = (on) => `<span class="check">${on ? svg.check : ''}</span>`;
  const free = state.models.filter((m) => m.id !== 'openrouter/free');
  let html = `<div class="pop-label">Mode</div>
    <button class="opt" data-mode="auto"><span class="o-icon">✦</span><span class="o-main"><span class="o-title">Auto</span>
      <span class="o-sub">Uses the strongest free model and switches automatically if one is busy.</span></span>${tick(s.mode === 'auto')}</button>
    <button class="opt" data-mode="council"><span class="o-icon">⚖︎</span><span class="o-main"><span class="o-title">Council <span class="badge">best quality</span></span>
      <span class="o-sub">Asks the top ${s.councilSize} models in parallel, then merges their best ideas into one answer. Slower, uses more requests.</span></span>${tick(s.mode === 'council')}</button>
    <div class="pop-label">Pick one model · ${free.length} free models available</div>`;
  if (state.modelsError) html += `<div class="opt"><span class="o-main"><span class="o-sub">Couldn't load models: ${esc(state.modelsError)}</span></span></div>`;
  for (const m of free) {
    const ctx = m.contextLength >= 1e6 ? `${+(m.contextLength / 1e6).toFixed(1)}M` : `${Math.round(m.contextLength / 1000)}K`;
    html += `<button class="opt" data-model="${esc(m.id)}"><span class="o-main">
      <span class="o-title">${esc(shortName(m.id))}${m.vision ? '<span class="badge dim">vision</span>' : ''}${m.supportsReasoning ? '<span class="badge dim">reasoning</span>' : ''}</span>
      <span class="o-sub">${esc(m.provider)} · ${ctx} context</span></span>${tick(s.mode === 'single' && s.model === m.id)}</button>`;
  }
  menu.innerHTML = html;
  menu.hidden = false;
  const r = $('#model-btn').getBoundingClientRect();
  const w = menu.offsetWidth;
  menu.style.left = `${Math.max(12, Math.min(r.right - w, innerWidth - w - 12))}px`;
  menu.style.bottom = `${innerHeight - r.top + 8}px`;
  menu.style.top = 'auto';
}
function closeModelMenu() { $('#model-menu').hidden = true; }

/* ================= Conversations ================= */
function newConversation() {
  return { id: store.uid(), title: 'New chat', createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
}
async function persist(conv) {
  conv.updatedAt = Date.now();
  await store.saveConversation(conv);
  const i = state.convos.findIndex((c) => c.id === conv.id);
  if (i >= 0) state.convos.splice(i, 1);
  state.convos.unshift(conv);
  renderSidebar();
}
function openConversation(id) {
  if (state.abort) stopGenerating();
  state.current = state.convos.find((c) => c.id === id) || null;
  history.replaceState(null, '', state.current ? `#c=${state.current.id}` : location.pathname);
  renderSidebar(); renderThread(); closeSidebarMobile();
  $('#prompt').focus();
}
function startNewChat() {
  if (state.abort) stopGenerating();
  state.current = null;
  history.replaceState(null, '', location.pathname);
  renderSidebar(); renderThread(); closeSidebarMobile();
  $('#prompt').focus();
}
async function removeConversation(id) {
  if (!confirm('Delete this chat?')) return;
  await store.deleteConversation(id);
  state.convos = state.convos.filter((c) => c.id !== id);
  if (state.current?.id === id) startNewChat(); else renderSidebar();
}

/* ================= Rendering ================= */
function renderSidebar() {
  const list = $('#convo-list');
  const q = state.search.trim().toLowerCase();
  const items = state.convos.filter((c) => c.messages.length && (!q || c.title.toLowerCase().includes(q) ||
    c.messages.some((m) => (m.content || '').toLowerCase().includes(q))));
  if (!items.length) {
    list.innerHTML = `<div class="empty-list">${q ? 'No chats match.' : 'Your chats will show up here.'}</div>`;
    return;
  }
  const day = 864e5, now = Date.now();
  const groups = [['Today', (t) => now - t < day], ['Previous 7 days', (t) => now - t < 7 * day], ['Previous 30 days', (t) => now - t < 30 * day], ['Older', () => true]];
  const used = new Set();
  let html = '';
  for (const [label, test] of groups) {
    const g = items.filter((c) => !used.has(c.id) && test(c.updatedAt));
    if (!g.length) continue;
    g.forEach((c) => used.add(c.id));
    html += `<div class="group-label">${label}</div>` + g.map((c) =>
      `<div class="convo${c.id === state.current?.id ? ' active' : ''}" data-id="${c.id}" tabindex="0">
        <span class="t">${esc(c.title)}</span>
        <button class="del" data-del="${c.id}" aria-label="Delete chat">${svg.trash}</button>
      </div>`).join('');
  }
  list.innerHTML = html;
}

function greeting() {
  const h = new Date().getHours();
  const part = h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const name = state.settings.userName.trim();
  return name ? `${part}, ${name}` : part;
}

function renderThread() {
  const thread = $('#thread');
  const conv = state.current;
  $('#chat-title').textContent = conv?.messages.length ? conv.title : '';
  $('#export-chat').hidden = !conv?.messages.length;
  if (!conv || !conv.messages.length) {
    const n = state.models.filter((m) => m.id !== 'openrouter/free').length;
    thread.innerHTML = `<div class="hero">
      <h1><img src="${ICON}" alt="">${esc(greeting())}</h1>
      <p>Ask anything. ${APP_NAME} picks the strongest free open-source model for you.</p>
      <div class="chips">${SUGGESTIONS.map((s, i) => `<button class="chip" data-suggest="${i}">${s.icon} ${esc(s.label)}</button>`).join('')}</div>
      <div class="model-count">${n ? `${n} free models online` : state.modelsError ? 'Model list unavailable — check your connection' : 'Loading models…'}</div>
    </div>`;
    return;
  }
  const wrap = document.createElement('div');
  wrap.className = 'messages';
  conv.messages.forEach((m, i) => wrap.appendChild(renderMessage(m, i === conv.messages.length - 1)));
  thread.replaceChildren(wrap);
  thread.scrollTop = thread.scrollHeight;
}

function renderMessage(m, isLast) {
  const el = document.createElement('div');
  el.className = `msg ${m.role}${isLast ? ' last' : ''}`;
  el.dataset.id = m.id;
  if (m.role === 'user') {
    const files = [...(m.images || []).map((u) => `<img src="${esc(u)}" alt="Attached image">`),
      ...(m.files || []).map((f) => `<span class="file-pill">${svg.file}${esc(f.name)}</span>`)].join('');
    el.innerHTML = `${files ? `<div class="files">${files}</div>` : ''}<div class="bubble">${esc(m.content)}</div>
      <div class="meta-row">
        <button class="icon-btn" data-act="copy" title="Copy">${svg.copy}</button>
        <button class="icon-btn" data-act="edit" title="Edit">${svg.edit}</button>
      </div>`;
    return el;
  }
  el.innerHTML = `<div class="mark"><img src="${ICON}" alt=""></div><div class="body"></div>`;
  fillAssistant(el, m);
  return el;
}

function fillAssistant(el, m) {
  const body = el.querySelector('.body');
  const streaming = m.status === 'streaming';
  el.classList.toggle('streaming', streaming);
  const openThinking = body.querySelector('details.thinking')?.open ?? false;
  const openDrafts = body.querySelector('details.drafts')?.open ?? false;
  let html = '';

  if (streaming && !m.content) {
    const what = m.phase === 'council' ? `Consulting ${m.drafts?.length || ''} models`
      : m.phase === 'synth' ? 'Combining the best answers'
      : m.reasoning ? `Thinking with ${esc(shortName(m.model))}` : `Asking ${esc(shortName(m.model)) || 'the model'}`;
    html += `<div class="status-line"><span class="dots"><i></i><i></i><i></i></span>${what}…</div>`;
  }
  if (m.drafts?.length) {
    const done = m.drafts.filter((d) => d.status === 'done').length;
    html += `<details class="drafts"${openDrafts ? ' open' : ''}><summary>Council · ${done}/${m.drafts.length} models answered</summary>
      ${m.drafts.map((d) => `<div class="draft"><div class="draft-head">${esc(shortName(d.model))}
        <span class="badge ${d.status === 'done' ? 'ok' : d.status === 'error' ? 'err' : 'dim'}">${d.status === 'done' ? 'done' : d.status === 'error' ? 'failed' : 'writing…'}</span></div>
        <div class="draft-body prose">${d.status === 'error' ? `<p class="muted">${esc(d.error)}</p>` : renderMarkdown(d.content || '…')}</div></div>`).join('')}
    </details>`;
  }
  if (m.reasoning && state.settings.showThinking) {
    const label = streaming && !m.content ? 'Thinking…' : 'Thought process';
    html += `<details class="thinking"${openThinking ? ' open' : ''}><summary>${label}</summary><div class="thinking-body">${esc(m.reasoning)}</div></details>`;
  }
  if (m.content) html += `<div class="prose answer${streaming ? ' cursor-host' : ''}">${renderMarkdown(m.content)}</div>`;
  if (m.notes?.length) html += m.notes.map((n) => `<div class="note">${esc(n)}</div>`).join('');
  if (m.error) {
    html += `<div class="error-box">${esc(m.error)}<div class="row">
      <button class="btn sm" data-act="retry">Try again</button>
      ${state.settings.mode !== 'auto' ? '<button class="btn sm" data-act="retry-auto">Retry with Auto</button>' : ''}</div></div>`;
  }
  if (m.stopped) html += '<div class="note">Stopped.</div>';
  if (!streaming) {
    html += `<div class="meta-row">
      ${m.content ? `<button class="icon-btn" data-act="copy" title="Copy">${svg.copy}</button>` : ''}
      <button class="icon-btn" data-act="regen" title="Regenerate">${svg.retry}</button>
      ${m.model ? `<span class="model-tag">${esc(m.drafts?.length ? `Council → ${shortName(m.model)}` : shortName(m.model))}</span>` : ''}
    </div>`;
  }
  body.innerHTML = html;
  const answer = body.querySelector('.answer');
  if (answer) {
    enhanceCode(answer);
    if (streaming) {
      const last = answer.lastElementChild;
      (last && !last.classList.contains('codeblock') ? last : answer).classList.add('cursor');
    }
  }
  body.querySelectorAll('.draft-body').forEach(enhanceCode);
  const tb = body.querySelector('.thinking-body');
  if (tb && streaming) tb.scrollTop = tb.scrollHeight;
}

// rAF-throttled live update of one assistant message while streaming
const pending = new Map();
function scheduleUpdate(m) {
  pending.set(m.id, m);
  if (scheduleUpdate.raf) return;
  scheduleUpdate.raf = requestAnimationFrame(() => {
    scheduleUpdate.raf = 0;
    const thread = $('#thread');
    const nearBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 140;
    for (const msg of pending.values()) {
      const el = thread.querySelector(`.msg[data-id="${msg.id}"]`);
      if (el) fillAssistant(el, msg);
    }
    pending.clear();
    if (nearBottom) { thread.style.scrollBehavior = 'auto'; thread.scrollTop = thread.scrollHeight; thread.style.scrollBehavior = ''; }
  });
}

/* ================= Generation ================= */
function apiMessages(conv, uptoIndex, { vision }) {
  const out = [{ role: 'system', content: systemPrompt(state.settings) }];
  for (const m of conv.messages.slice(0, uptoIndex)) {
    if (m.role === 'user') {
      let text = m.content || '';
      for (const f of m.files || []) text += `\n\n<attached_file name="${f.name}">\n${f.text}\n</attached_file>`;
      if (m.images?.length && vision) {
        out.push({ role: 'user', content: [{ type: 'text', text: text || 'Describe this image.' }, ...m.images.map((url) => ({ type: 'image_url', image_url: { url } }))] });
      } else {
        if (m.images?.length) text += `\n\n[${m.images.length} image(s) attached, but this model can't view images.]`;
        out.push({ role: 'user', content: text });
      }
    } else if (m.content) {
      out.push({ role: 'assistant', content: m.content });
    }
  }
  return out;
}

const needsVision = (conv, upto) => conv.messages.slice(0, upto).some((m) => m.images?.length);

async function streamInto(target, { model, messages, signal, onEvent }) {
  for await (const ev of streamChat({ key: state.settings.apiKey, model, messages, signal, temperature: state.settings.temperature })) {
    if (ev.content) target.content += ev.content;
    if (ev.reasoning) target.reasoning = (target.reasoning || '') + ev.reasoning;
    if (ev.model && model === 'openrouter/free') target.model = ev.model;
    onEvent?.();
  }
}

async function runWithFallback(asst, candidates, buildMessages, signal) {
  let lastErr;
  for (const m of candidates) {
    asst.model = m.id; asst.content = ''; asst.reasoning = '';
    scheduleUpdate(asst);
    try {
      await streamInto(asst, { model: m.id, messages: buildMessages(m), signal, onEvent: () => scheduleUpdate(asst) });
      if (!asst.content.trim() && asst.reasoning) asst.content = '_The model only returned its thinking. Try again or pick another model._';
      if (!asst.content.trim()) throw Object.assign(new Error(`${shortName(m.id)} returned an empty answer.`), { status: 0 });
      return;
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      if (e.status === 401) throw e;
      if (asst.content.trim()) throw e; // failed mid-answer: keep what we have
      lastErr = e;
      (asst.notes ||= []).push(`${shortName(m.id)} was unavailable (${e.status || 'error'}), switched model.`);
    }
  }
  throw lastErr || new Error('No free models are available right now.');
}

async function runCouncil(asst, conv, idx, signal) {
  const vision = needsVision(conv, idx);
  const members = rankedCandidates({ needVision: vision }).filter((m) => m.id !== 'openrouter/free').slice(0, state.settings.councilSize);
  asst.phase = 'council';
  asst.drafts = members.map((m) => ({ model: m.id, content: '', status: 'pending' }));
  scheduleUpdate(asst);
  await Promise.all(members.map(async (m, i) => {
    const d = asst.drafts[i];
    try {
      await streamInto(d, { model: m.id, messages: apiMessages(conv, idx, { vision: m.vision }), signal, onEvent: () => scheduleUpdate(asst) });
      d.status = d.content.trim() ? 'done' : 'error';
      if (!d.content.trim()) d.error = 'Empty answer';
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      d.status = 'error'; d.error = e.message;
    }
    delete d.reasoning;
    scheduleUpdate(asst);
  }));
  const ok = asst.drafts.filter((d) => d.status === 'done');
  if (!ok.length) throw new Error('None of the council models could answer right now (they may be rate-limited). Try Auto mode or wait a minute.');
  if (ok.length === 1) { asst.content = ok[0].content; asst.model = ok[0].model; return; }

  asst.phase = 'synth';
  const userMsg = conv.messages[idx - 1];
  const question = userMsg.content + (userMsg.files || []).map((f) => `\n\n<attached_file name="${f.name}">\n${f.text}\n</attached_file>`).join('');
  const base = apiMessages(conv, idx - 1, { vision: false });
  const synthMessages = [...base, { role: 'user', content: synthesisPrompt(question, ok) }];
  await runWithFallback(asst, rankedCandidates({ needVision: false }), () => synthMessages, signal);
}

async function generate(conv) {
  if (!state.settings.apiKey) { showWelcome(); return; }
  if (!state.models.length) await loadModels(true);
  if (!state.models.length) { toast('Could not load the free model list. Check your connection.'); return; }

  const asst = { id: store.uid(), role: 'assistant', content: '', reasoning: '', model: '', status: 'streaming', createdAt: Date.now() };
  conv.messages.push(asst);
  const idx = conv.messages.length - 1;
  renderThread();
  const ctrl = new AbortController();
  state.abort = ctrl;
  setComposerBusy(true);
  const isFirst = conv.messages.length === 2;

  try {
    const mode = state.settings.mode;
    if (mode === 'council') {
      await runCouncil(asst, conv, idx, ctrl.signal);
    } else {
      const vision = needsVision(conv, idx);
      const candidates = mode === 'single'
        ? [modelById(state.settings.model) || rankedCandidates({ needVision: vision })[0]]
        : rankedCandidates({ needVision: vision });
      await runWithFallback(asst, candidates, (m) => apiMessages(conv, idx, { vision: m.vision }), ctrl.signal);
    }
  } catch (e) {
    if (e.name === 'AbortError') asst.stopped = true;
    else asst.error = e.message || String(e);
  } finally {
    asst.status = 'done';
    delete asst.phase;
    if (state.abort === ctrl) state.abort = null;
    setComposerBusy(false);
    scheduleUpdate(asst);
    requestAnimationFrame(() => renderThread());
    await persist(conv);
    if (isFirst && asst.content && !asst.error) makeTitle(conv);
  }
}

async function makeTitle(conv) {
  const first = conv.messages[0]?.content || '';
  const candidates = rankedCandidates({ needVision: false }).slice(0, 3);
  for (const m of candidates) {
    try {
      let t = await completeChat({ key: state.settings.apiKey, model: m.id, maxTokens: 30, messages: [
        { role: 'system', content: TITLE_PROMPT }, { role: 'user', content: first.slice(0, 2000) }] });
      t = t.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/^["'#*\s]+|["'.*\s]+$/g, '').split('\n')[0].trim();
      if (t && t.length <= 80) {
        conv.title = t;
        await store.saveConversation(conv);
        renderSidebar();
        if (state.current?.id === conv.id) $('#chat-title').textContent = t;
        return;
      }
    } catch { /* try next */ }
  }
}

function stopGenerating() { state.abort?.abort(); }

async function send() {
  const input = $('#prompt');
  const text = input.value.trim();
  if (!text && !state.attachments.length) return;
  if (state.abort) return;
  if (!state.settings.apiKey) { showWelcome(); return; }

  if (!state.current) state.current = newConversation();
  const conv = state.current;
  const msg = {
    id: store.uid(), role: 'user', content: text, createdAt: Date.now(),
    images: state.attachments.filter((a) => a.kind === 'image').map((a) => a.url),
    files: state.attachments.filter((a) => a.kind === 'file').map((a) => ({ name: a.name, text: a.text })),
  };
  if (!msg.images.length) delete msg.images;
  if (!msg.files.length) delete msg.files;
  conv.messages.push(msg);
  if (conv.title === 'New chat') conv.title = (text || msg.files?.[0]?.name || 'Image').slice(0, 48);
  history.replaceState(null, '', `#c=${conv.id}`);
  input.value = ''; autosize();
  state.attachments = []; renderAttachments();
  await persist(conv);
  await generate(conv);
}

function setComposerBusy(busy) {
  const btn = $('#send');
  btn.classList.toggle('stop', busy);
  btn.setAttribute('aria-label', busy ? 'Stop' : 'Send');
  updateSendEnabled();
}
function updateSendEnabled() {
  $('#send').disabled = !state.abort && !$('#prompt').value.trim() && !state.attachments.length;
}

/* ================= Message actions ================= */
async function onMessageAction(act, msgEl, btn) {
  const conv = state.current;
  if (!conv) return;
  const idx = conv.messages.findIndex((m) => m.id === msgEl.dataset.id);
  const m = conv.messages[idx];
  if (!m) return;
  if (act === 'copy') return copyText(m.content, btn);
  if (state.abort) return toast('Wait for the answer to finish, or press stop.');
  if (act === 'regen' || act === 'retry' || act === 'retry-auto') {
    if (act === 'retry-auto') { state.settings.mode = 'auto'; saveSettings(); updateModelLabel(); }
    conv.messages.splice(idx);
    return generate(conv);
  }
  if (act === 'edit') {
    const bubble = msgEl.querySelector('.bubble');
    const meta = msgEl.querySelector('.meta-row');
    meta.hidden = true;
    bubble.outerHTML = `<div class="editor"><textarea class="edit-box" rows="3">${esc(m.content)}</textarea>
      <div class="edit-actions"><button class="btn sm" data-edit="cancel">Cancel</button><button class="btn sm primary" data-edit="save">Save &amp; send</button></div></div>`;
    const ta = msgEl.querySelector('.edit-box');
    ta.style.height = `${Math.min(ta.scrollHeight + 4, 400)}px`;
    ta.focus();
    msgEl.querySelector('.edit-actions').addEventListener('click', (e) => {
      const which = e.target.closest('[data-edit]')?.dataset.edit;
      if (which === 'cancel') renderThread();
      if (which === 'save' && ta.value.trim()) {
        m.content = ta.value.trim();
        conv.messages.splice(idx + 1);
        renderThread();
        generate(conv);
      }
    });
  }
}

function exportChat() {
  const c = state.current;
  if (!c) return;
  const md = `# ${c.title}\n\n` + c.messages.map((m) => m.role === 'user'
    ? `**You:**\n\n${m.content}${(m.files || []).map((f) => `\n\n_(attached: ${f.name})_`).join('')}`
    : `**${APP_NAME}** _(${shortName(m.model)})_:\n\n${m.content}`).join('\n\n---\n\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([md], { type: 'text/markdown' })),
    download: `${c.title.replace(/[^\w\- ]+/g, '').trim() || 'chat'}.md`,
  });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ================= Attachments ================= */
const TEXT_LIMIT = 150_000;
async function addFiles(files) {
  for (const f of files) {
    if (state.attachments.length >= 8) { toast('Up to 8 attachments per message.'); break; }
    if (f.type.startsWith('image/')) {
      try { state.attachments.push({ kind: 'image', name: f.name, url: await downscaleImage(f) }); }
      catch { toast(`Couldn't read ${f.name}`); }
    } else if (f.type === 'application/pdf') {
      toast('PDFs aren\'t supported yet — paste the text or attach a .txt file.');
    } else {
      if (f.size > 2_000_000) { toast(`${f.name} is too large (max 2 MB).`); continue; }
      let text = await f.text();
      if (text.length > TEXT_LIMIT) text = text.slice(0, TEXT_LIMIT) + '\n…[truncated]';
      state.attachments.push({ kind: 'file', name: f.name, text });
    }
  }
  renderAttachments();
}
function downscaleImage(file, max = 1568) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
function renderAttachments() {
  const box = $('#attachments');
  box.hidden = !state.attachments.length;
  box.innerHTML = state.attachments.map((a, i) => `<div class="att">
    ${a.kind === 'image' ? `<img src="${a.url}" alt="${esc(a.name)}">` : `<span class="file-pill">${svg.file}<span>${esc(a.name)}</span></span>`}
    <button type="button" class="x" data-rm="${i}" aria-label="Remove">${svg.x}</button></div>`).join('');
  updateSendEnabled();
}

/* ================= Settings & connection ================= */
async function refreshKeyInfo() {
  const s = state.settings;
  const status = $('#account-status'), keyStatus = $('#key-status');
  $('#avatar').textContent = (s.userName.trim()[0] || (s.apiKey ? '✓' : '?')).toUpperCase();
  $('#account-name').textContent = s.userName.trim() || 'Settings';
  $('#disconnect').hidden = !s.apiKey;
  $('#oauth-connect').textContent = s.apiKey ? 'Reconnect' : 'Connect with OpenRouter';
  if (!s.apiKey) { status.textContent = 'Not connected'; keyStatus.textContent = 'Not connected. Connect to start chatting.'; return; }
  status.textContent = 'Connected to OpenRouter';
  try {
    const info = await getKeyInfo(s.apiKey);
    state.keyInfo = info;
    const tier = info.is_free_tier ? 'Free tier' : 'Credits on account';
    keyStatus.textContent = `✓ Connected${info.label ? ` (${info.label})` : ''} · ${tier}${info.limit != null ? ` · limit $${info.limit}` : ''}`;
  } catch (e) {
    keyStatus.textContent = `⚠ ${e.message}`;
    if (e.status === 401) status.textContent = 'Key rejected — reconnect';
  }
}

function fillSettingsForm() {
  const s = state.settings;
  $('#user-name').value = s.userName;
  $('#instructions').value = s.instructions;
  $('#council-size').value = s.councilSize; $('#council-size-val').textContent = s.councilSize;
  $('#temperature').value = s.temperature; $('#temperature-val').textContent = s.temperature;
  $('#show-thinking').checked = s.showThinking;
  $('#theme').value = s.theme;
  $('#key-input').value = '';
}
function applyTheme() {
  const t = state.settings.theme;
  if (t === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('#hl-dark').disabled = !dark;
  $('#hl-light').disabled = dark;
}
function showWelcome() { const d = $('#welcome'); if (!d.open) d.showModal(); }

async function handleOAuthReturn() {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  if (!code) return;
  history.replaceState(null, '', location.pathname + location.hash);
  try {
    toast('Connecting to OpenRouter…');
    state.settings.apiKey = await finishOAuth(code);
    saveSettings();
    toast('Connected! You can start chatting.');
  } catch (e) {
    toast(`Connection failed: ${e.message}`, 5000);
  }
}

/* ================= Sidebar (mobile) ================= */
const isMobile = () => matchMedia('(max-width: 820px)').matches;
function toggleSidebar() {
  const app = $('#app');
  if (isMobile()) { app.classList.toggle('sidebar-open'); $('#scrim').hidden = !app.classList.contains('sidebar-open'); }
  else app.classList.toggle('collapsed');
}
function closeSidebarMobile() {
  if (!isMobile()) return;
  $('#app').classList.remove('sidebar-open'); $('#scrim').hidden = true;
}

/* ================= Composer ================= */
function autosize() {
  const ta = $('#prompt');
  ta.style.height = 'auto';
  ta.style.height = `${Math.min(ta.scrollHeight, innerHeight * 0.4)}px`;
  updateSendEnabled();
}

function setupDictation() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  const btn = $('#mic');
  btn.hidden = false;
  let rec = null;
  btn.addEventListener('click', () => {
    if (rec) { rec.stop(); return; }
    rec = new SR();
    rec.interimResults = true; rec.continuous = true; rec.lang = navigator.language || 'en-US';
    const base = $('#prompt').value;
    rec.onresult = (e) => {
      const said = Array.from(e.results).map((r) => r[0].transcript).join('');
      $('#prompt').value = (base ? base + ' ' : '') + said; autosize();
    };
    rec.onend = () => { rec = null; btn.classList.remove('listening'); };
    rec.onerror = (e) => toast(`Dictation: ${e.error}`);
    rec.start(); btn.classList.add('listening');
  });
}

/* ================= Wire up ================= */
function bind() {
  $('#composer').addEventListener('submit', (e) => { e.preventDefault(); state.abort ? stopGenerating() : send(); });
  $('#prompt').addEventListener('input', autosize);
  $('#prompt').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !(isMobile() && 'ontouchstart' in window)) {
      e.preventDefault(); if (!state.abort) send();
    }
  });
  $('#prompt').addEventListener('paste', (e) => {
    const files = [...(e.clipboardData?.files || [])];
    if (files.length) { e.preventDefault(); addFiles(files); }
  });
  $('#file-input').addEventListener('change', (e) => { addFiles([...e.target.files]); e.target.value = ''; });
  $('#attachments').addEventListener('click', (e) => {
    const i = e.target.closest('[data-rm]')?.dataset.rm;
    if (i != null) { state.attachments.splice(+i, 1); renderAttachments(); }
  });
  const comp = $('#composer');
  comp.addEventListener('dragover', (e) => { e.preventDefault(); comp.classList.add('drag'); });
  comp.addEventListener('dragleave', () => comp.classList.remove('drag'));
  comp.addEventListener('drop', (e) => { e.preventDefault(); comp.classList.remove('drag'); addFiles([...e.dataTransfer.files]); });

  $('#model-btn').addEventListener('click', (e) => { e.stopPropagation(); $('#model-menu').hidden ? openModelMenu() : closeModelMenu(); });
  $('#model-menu').addEventListener('click', (e) => {
    const opt = e.target.closest('.opt');
    if (!opt) return;
    if (opt.dataset.mode) state.settings.mode = opt.dataset.mode;
    if (opt.dataset.model) { state.settings.mode = 'single'; state.settings.model = opt.dataset.model; }
    saveSettings(); updateModelLabel(); closeModelMenu();
    $('#prompt').focus();
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('#model-menu')) closeModelMenu(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModelMenu();
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'o') { e.preventDefault(); startNewChat(); }
  });

  $('#thread').addEventListener('click', (e) => {
    const codeBtn = e.target.closest('[data-copy-code]');
    if (codeBtn) return copyText(codeBtn.closest('.codeblock').querySelector('code').innerText, codeBtn);
    const chip = e.target.closest('[data-suggest]');
    if (chip) {
      const p = $('#prompt'); p.value = SUGGESTIONS[+chip.dataset.suggest].prompt; autosize(); p.focus();
      p.setSelectionRange(p.value.length, p.value.length); return;
    }
    const act = e.target.closest('[data-act]');
    if (act) onMessageAction(act.dataset.act, act.closest('.msg'), act);
  });

  $('#new-chat').addEventListener('click', startNewChat);
  $('#toggle-sidebar').addEventListener('click', toggleSidebar);
  $('#close-sidebar').addEventListener('click', closeSidebarMobile);
  $('#scrim').addEventListener('click', closeSidebarMobile);
  $('#search').addEventListener('input', (e) => { state.search = e.target.value; renderSidebar(); });
  $('#convo-list').addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) { e.stopPropagation(); return removeConversation(del.dataset.del); }
    const row = e.target.closest('.convo');
    if (row) openConversation(row.dataset.id);
  });
  $('#convo-list').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('convo')) openConversation(e.target.dataset.id);
  });
  $('#export-chat').addEventListener('click', exportChat);

  // settings
  $('#open-settings').addEventListener('click', () => { fillSettingsForm(); refreshKeyInfo(); $('#settings').showModal(); closeSidebarMobile(); });
  $('#oauth-connect').addEventListener('click', startOAuth);
  $('#welcome-connect').addEventListener('click', startOAuth);
  $('#welcome-later').addEventListener('click', () => { $('#welcome').close(); fillSettingsForm(); $('#settings').showModal(); $('#settings details').open = true; });
  $('#save-key').addEventListener('click', async () => {
    const k = $('#key-input').value.trim();
    if (!/^sk-or-/.test(k)) return toast('That doesn\'t look like an OpenRouter key (sk-or-…).');
    state.settings.apiKey = k; saveSettings(); $('#key-input').value = '';
    await refreshKeyInfo(); toast('Key saved.');
  });
  $('#disconnect').addEventListener('click', () => {
    state.settings.apiKey = ''; saveSettings(); refreshKeyInfo(); toast('Disconnected. Your key was removed from this browser.');
  });
  const bindSetting = (sel, key, parse = (v) => v, after) => $(sel).addEventListener('input', (e) => {
    state.settings[key] = parse(e.target.type === 'checkbox' ? e.target.checked : e.target.value);
    saveSettings(); after?.();
  });
  bindSetting('#user-name', 'userName', String, refreshKeyInfo);
  bindSetting('#instructions', 'instructions');
  bindSetting('#council-size', 'councilSize', Number, () => { $('#council-size-val').textContent = state.settings.councilSize; updateModelLabel(); });
  bindSetting('#temperature', 'temperature', Number, () => { $('#temperature-val').textContent = state.settings.temperature; });
  bindSetting('#show-thinking', 'showThinking');
  bindSetting('#theme', 'theme', String, applyTheme);
  $('#refresh-models').addEventListener('click', async () => { await loadModels(true); toast(`${state.models.length} free models loaded.`); });
  $('#clear-chats').addEventListener('click', async () => {
    if (!confirm('Delete all chats on this device? This can\'t be undone.')) return;
    await store.clearConversations(); state.convos = []; startNewChat(); toast('All chats deleted.');
  });
  $('#settings').addEventListener('close', () => { if (!state.current?.messages.length) renderThread(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
}

async function init() {
  applyTheme();
  bind();
  setupDictation();
  await handleOAuthReturn();
  updateModelLabel();
  refreshKeyInfo();
  try { state.convos = await store.listConversations(); } catch { state.convos = []; }
  const hashId = new URLSearchParams(location.hash.slice(1)).get('c');
  state.current = state.convos.find((c) => c.id === hashId) || null;
  // Drop any interrupted streaming state from a previous session
  state.convos.forEach((c) => c.messages.forEach((m) => { if (m.status === 'streaming') { m.status = 'done'; m.stopped = true; } }));
  renderSidebar();
  renderThread();
  loadModels();
  if (!state.settings.apiKey) showWelcome();
  else $('#prompt').focus();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

// CDN scripts are `defer`, module scripts run after them, so libs are ready here.
init();
