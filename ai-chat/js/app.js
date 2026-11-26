import {
  APP_NAME, fetchFreeModels, streamChat, completeChat, transcribeAudio, getKeyInfo, startOAuth, finishOAuth,
} from './openrouter.js';
import * as store from './store.js';
import { systemPrompt, synthesisPrompt, TITLE_PROMPT, SUGGESTIONS, STYLES } from './prompts.js';
import { icon, hydrateIcons } from './icons.js';
import { renderMarkdown, enhanceCode, esc } from './markdown.js';
import { Artifacts } from './artifacts.js';
import { Dictation, VOICE_LANGS, browserSpeechSupported, recordingSupported, joinText } from './voice.js';

/* ================= State ================= */
const $ = (s, el = document) => el.querySelector(s);
const state = {
  settings: store.loadSettings(),
  models: [],
  modelsError: null,
  convos: [],
  current: null,
  abort: null,
  attachments: [],   // { kind: 'image'|'file', name, url?, text?, size? }
  search: '',
};
const LOGO = 'icons/icon.svg';
const MAX_FALLBACKS = 6;
const LONG_PASTE = 2500;
const isMobile = () => matchMedia('(max-width: 820px)').matches;
const isWide = () => matchMedia('(min-width: 1100px)').matches;

/* ================= Helpers ================= */
const modelById = (id) => state.models.find((m) => m.id === id);
const shortName = (id) => {
  const m = modelById(id);
  if (m) return m.name.replace(/^[^:]+:\s*/, '');
  return String(id || '').split('/').pop().replace(/:free$/, '');
};
function toast(text, ms = 2800) {
  const t = $('#toast');
  t.textContent = text; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), ms);
}
const saveSettings = () => store.saveSettings(state.settings);
const fmtSize = (n) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);
const lineCount = (s) => (s.match(/\n/g) || []).length + 1;

async function copyText(text, btn) {
  try { await navigator.clipboard.writeText(text); } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  if (btn) {
    const old = btn.innerHTML;
    btn.innerHTML = icon('check') + (btn.querySelector('span') ? '<span>Copied</span>' : '');
    setTimeout(() => (btn.innerHTML = old), 1400);
  }
}

const artifacts = new Artifacts({ onToast: toast });

/* ================= Dialog helpers ================= */
function ask({ title, text = '', value = '', placeholder = '', ok = 'Save', danger = false, input = true }) {
  const d = $('#ask');
  $('#ask-title').textContent = title;
  $('#ask-text').textContent = text; $('#ask-text').hidden = !text;
  const inp = $('#ask-input');
  inp.hidden = !input; inp.value = value; inp.placeholder = placeholder;
  const okBtn = $('#ask-ok');
  okBtn.textContent = ok;
  okBtn.style.background = danger ? 'var(--danger)' : ''; okBtn.style.borderColor = danger ? 'var(--danger)' : '';
  d.returnValue = '';
  d.showModal();
  if (input) { inp.focus(); inp.select(); }
  return new Promise((resolve) => {
    d.addEventListener('close', () => resolve(d.returnValue === 'ok' ? (input ? inp.value.trim() : true) : null), { once: true });
  });
}
const confirmDialog = (title, text, ok = 'Delete') => ask({ title, text, ok, danger: true, input: false });

/* ================= Popover menu ================= */
let menuAnchor = null;
function openMenu(anchor, html, { wide = false, place = 'auto', onClick } = {}) {
  const menu = $('#menu');
  if (menuAnchor === anchor && !menu.hidden) { closeMenu(); return; }
  closeMenu();
  menu.innerHTML = html;
  menu.classList.toggle('wide', wide);
  menu.hidden = false;
  menuAnchor = anchor;
  anchor.setAttribute('aria-expanded', 'true');
  const r = anchor.getBoundingClientRect();
  const w = menu.offsetWidth, h = menu.offsetHeight;
  const above = place === 'above' || (place === 'auto' && r.bottom + h + 8 > innerHeight && r.top > h);
  let left = place === 'right' ? r.right + 6 : r.left;
  if (left + w > innerWidth - 12) left = Math.max(12, r.right - w);
  menu.style.left = `${Math.max(12, left)}px`;
  if (place === 'right') { menu.style.top = `${Math.min(r.top, innerHeight - h - 12)}px`; menu.style.bottom = 'auto'; }
  else if (above) { menu.style.bottom = `${innerHeight - r.top + 6}px`; menu.style.top = 'auto'; }
  else { menu.style.top = `${r.bottom + 6}px`; menu.style.bottom = 'auto'; }
  menu.style.transformOrigin = `${r.left + r.width / 2 - Math.max(12, left)}px ${above ? '100%' : '0'}`;
  menu.onclick = (e) => {
    const opt = e.target.closest('[data-v]');
    if (!opt) return;
    e.stopPropagation();
    const keep = opt.dataset.keep;
    if (!keep) closeMenu();
    onClick?.(opt.dataset.v, opt);
  };
  menu.querySelector('.opt')?.focus({ preventScroll: true });
}
function closeMenu() {
  $('#menu').hidden = true;
  menuAnchor?.setAttribute('aria-expanded', 'false');
  menuAnchor = null;
}
const opt = (v, label, ic, extra = '') => `<button class="opt ${extra}" data-v="${v}" role="menuitem">${ic ? icon(ic) : ''}<span class="o-main"><span class="o-title">${label}</span></span></button>`;

/* ================= Models ================= */
async function loadModels(force = false) {
  try {
    state.models = await fetchFreeModels({ force });
    state.modelsError = null;
    if (state.settings.mode === 'single' && !modelById(state.settings.model)) { state.settings.mode = 'auto'; saveSettings(); }
  } catch (e) { state.modelsError = e.message; }
  updateModelLabel();
  if (!state.current?.messages.length) renderThread();
}

function rankedCandidates({ needVision }) {
  let list = state.models.filter((m) => m.id !== 'openrouter/free');
  if (needVision) { const vis = list.filter((m) => m.vision); list = vis.length ? vis : list; }
  const out = list.slice(0, MAX_FALLBACKS);
  const router = modelById('openrouter/free');
  if (router) out.push(router);
  return out;
}
const audioModels = () => state.models.filter((m) => m.audio && m.id !== 'openrouter/free');

function updateModelLabel() {
  const s = state.settings;
  $('#model-label').textContent = s.mode === 'council' ? `Council · ${s.councilSize}`
    : s.mode === 'single' ? shortName(s.model) : (isMobile() ? 'Auto' : 'Auto · best free model');
}

function openModelMenu() {
  const s = state.settings;
  const tick = (on) => `<span class="tick">${on ? icon('check') : ''}</span>`;
  const free = state.models.filter((m) => m.id !== 'openrouter/free');
  let html = `<div class="pop-label">Mode</div>
    <button class="opt rich" data-v="mode:auto"><span class="o-icon">${icon('sparkles')}</span><span class="o-main"><span class="o-title">Auto</span>
      <span class="o-sub">The strongest free model, switching automatically when one is busy</span></span>${tick(s.mode === 'auto')}</button>
    <button class="opt rich" data-v="mode:council"><span class="o-icon">${icon('scale')}</span><span class="o-main"><span class="o-title">Council <span class="badge">best quality</span></span>
      <span class="o-sub">Top ${s.councilSize} models answer in parallel, then the best ideas are merged. Slower.</span></span>${tick(s.mode === 'council')}</button>
    <div class="pop-sep"></div><div class="pop-label">Or pick one model · ${free.length} free</div>`;
  if (state.modelsError) html += `<div class="opt"><span class="o-main"><span class="o-sub">Couldn't load models: ${esc(state.modelsError)}</span></span></div>`;
  for (const m of free) {
    const ctx = m.contextLength >= 1e6 ? `${+(m.contextLength / 1e6).toFixed(1)}M` : `${Math.round(m.contextLength / 1000)}K`;
    const caps = [m.vision && 'vision', m.supportsReasoning && 'reasoning', m.audio && 'audio'].filter(Boolean)
      .map((c) => `<span class="badge dim">${c}</span>`).join('');
    html += `<button class="opt rich" data-v="model:${esc(m.id)}"><span class="o-main">
      <span class="o-title">${esc(shortName(m.id))}${caps}</span><span class="o-sub">${esc(m.provider)} · ${ctx} context</span></span>${tick(s.mode === 'single' && s.model === m.id)}</button>`;
  }
  openMenu($('#model-btn'), html, { wide: true, place: 'above', onClick: (v) => {
    const [k, val] = [v.slice(0, v.indexOf(':')), v.slice(v.indexOf(':') + 1)];
    if (k === 'mode') state.settings.mode = val;
    else { state.settings.mode = 'single'; state.settings.model = val; }
    saveSettings(); updateModelLabel(); $('#prompt').focus();
  } });
}

function openPlusMenu() {
  const s = state.settings;
  let html = opt('files', 'Upload files or photos', 'paperclip');
  if (isMobile()) html += opt('camera', 'Take a photo', 'camera');
  html += `<div class="pop-sep"></div><div class="pop-label">Use style</div>`;
  for (const [k, st] of Object.entries(STYLES)) {
    html += `<button class="opt rich" data-v="style:${k}"><span class="o-main"><span class="o-title">${st.label}</span><span class="o-sub">${st.desc}</span></span><span class="tick">${s.style === k ? icon('check') : ''}</span></button>`;
  }
  html += `<div class="pop-sep"></div>${opt('think', `Extended thinking: ${s.thinking ? 'on' : 'off'}`, 'bulb')}`;
  openMenu($('#plus-btn'), html, { place: 'above', onClick: (v) => {
    if (v === 'files') $('#file-input').click();
    else if (v === 'camera') $('#camera-input').click();
    else if (v === 'think') toggleThinking();
    else if (v.startsWith('style:')) { s.style = v.slice(6); saveSettings(); updateComposerTools(); $('#prompt').focus(); }
  } });
}

function toggleThinking() {
  state.settings.thinking = !state.settings.thinking;
  saveSettings(); updateComposerTools();
  toast(state.settings.thinking ? 'Extended thinking on: reasoning models will think longer.' : 'Extended thinking off');
}

function updateComposerTools() {
  const s = state.settings;
  const tb = $('#think-btn');
  tb.setAttribute('aria-pressed', String(!!s.thinking));
  tb.title = `Extended thinking: ${s.thinking ? 'on' : 'off'}`;
  const chip = $('#style-chip');
  chip.hidden = s.style === 'normal' || !STYLES[s.style];
  if (!chip.hidden) chip.innerHTML = `${esc(STYLES[s.style].label)}${icon('x')}`;
}

/* ================= Conversations ================= */
const newConversation = () => ({ id: store.uid(), title: 'New chat', createdAt: Date.now(), updatedAt: Date.now(), starred: false, messages: [] });
async function persist(conv, { touch = true } = {}) {
  if (touch) conv.updatedAt = Date.now();
  await store.saveConversation(conv);
  const i = state.convos.findIndex((c) => c.id === conv.id);
  if (i >= 0) state.convos.splice(i, 1);
  state.convos.unshift(conv);
  state.convos.sort((a, b) => b.updatedAt - a.updatedAt);
  renderSidebar();
}
function openConversation(id) {
  if (state.abort) stopGenerating();
  artifacts.close();
  state.current = state.convos.find((c) => c.id === id) || null;
  history.replaceState(null, '', state.current ? `#c=${state.current.id}` : location.pathname);
  renderSidebar(); renderThread(); closeSidebarMobile();
  if (!isMobile()) $('#prompt').focus();
}
function startNewChat() {
  if (state.abort) stopGenerating();
  artifacts.close();
  state.current = null;
  history.replaceState(null, '', location.pathname);
  renderSidebar(); renderThread(); closeSidebarMobile();
  $('#prompt').focus();
}
async function renameConversation(conv) {
  const t = await ask({ title: 'Rename chat', value: conv.title, placeholder: 'Chat title' });
  if (!t) return;
  conv.title = t.slice(0, 120);
  await persist(conv, { touch: false });
  if (state.current?.id === conv.id) $('#chat-title').textContent = conv.title;
}
async function toggleStar(conv) {
  conv.starred = !conv.starred;
  await persist(conv, { touch: false });
  toast(conv.starred ? 'Added to Starred' : 'Removed from Starred');
}
async function removeConversation(conv) {
  if (!(await confirmDialog('Delete chat?', `"${conv.title}" will be permanently deleted from this device.`))) return;
  await store.deleteConversation(conv.id);
  state.convos = state.convos.filter((c) => c.id !== conv.id);
  if (state.current?.id === conv.id) startNewChat(); else renderSidebar();
  toast('Chat deleted');
}
function convoMenu(anchor, conv, place = 'auto') {
  const html = opt('star', conv.starred ? 'Unstar' : 'Star', 'star') + opt('rename', 'Rename', 'pencil') +
    opt('export', 'Export as Markdown', 'download') + '<div class="pop-sep"></div>' + opt('delete', 'Delete', 'trash', 'danger');
  openMenu(anchor, html, { place, onClick: (v) => {
    if (v === 'star') toggleStar(conv);
    if (v === 'rename') renameConversation(conv);
    if (v === 'export') exportChat(conv);
    if (v === 'delete') removeConversation(conv);
  } });
}

/* ================= Rendering ================= */
function renderSidebar() {
  const list = $('#convo-list');
  const q = state.search.trim().toLowerCase();
  const items = state.convos.filter((c) => c.messages.length && (!q || c.title.toLowerCase().includes(q) ||
    c.messages.some((m) => (m.content || '').toLowerCase().includes(q))));
  if (!items.length) {
    list.innerHTML = `<div class="empty-list">${q ? 'No chats match your search.' : 'Your chats will appear here.<br>Start one below.'}</div>`;
    return;
  }
  const row = (c) => `<div class="convo${c.id === state.current?.id ? ' active' : ''}" data-id="${c.id}" tabindex="0" role="link">
      <span class="t">${esc(c.title)}</span>
      <button class="icon-btn more" data-more="${c.id}" aria-label="More options for ${esc(c.title)}">${icon('more')}</button></div>`;
  const starred = items.filter((c) => c.starred);
  const recent = items.filter((c) => !c.starred);
  list.innerHTML = (starred.length ? `<div class="group-label">Starred</div>${starred.map(row).join('')}` : '') +
    (recent.length ? `<div class="group-label">Recents</div>${recent.map(row).join('')}` : '');
}

function greeting() {
  const h = new Date().getHours();
  const part = h < 5 ? 'Hello, night owl' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const name = state.settings.userName.trim();
  return name ? `${part}, ${name}` : part;
}

function renderSuggestions() {
  $('#suggestions').innerHTML = SUGGESTIONS.map((s, i) => `<button type="button" class="chip" data-suggest="${i}">${icon(s.icon)}${esc(s.label)}</button>`).join('');
}

function renderThread() {
  const thread = $('#thread');
  const conv = state.current;
  const empty = !conv || !conv.messages.length;
  $('#main').classList.toggle('is-empty', empty);
  $('#title-btn').hidden = empty;
  $('#chat-title').textContent = empty ? '' : conv.title;
  $('#prompt').placeholder = empty ? 'How can I help you today?' : 'Reply to Careva AI…';
  if (empty) {
    const n = state.models.filter((m) => m.id !== 'openrouter/free').length;
    thread.innerHTML = `<div class="hero">
      <h1><img src="${LOGO}" alt="">${esc(greeting())}</h1>
      <p class="sub">${n ? `${n} free open-source models ready` : state.modelsError ? 'Model list unavailable, check your connection' : 'Loading free models…'}</p>
    </div>`;
    $('#to-bottom').hidden = true;
    return;
  }
  const wrap = document.createElement('div');
  wrap.className = 'messages';
  conv.messages.forEach((m, i) => wrap.appendChild(renderMessage(m, i === conv.messages.length - 1)));
  thread.replaceChildren(wrap);
  thread.scrollTop = thread.scrollHeight;
}

function fileCard(f) {
  return `<span class="file-card"><span class="fc-ic">${icon('file')}</span><span class="fc-t"><b>${esc(f.name)}</b><span>${lineCount(f.text || '')} lines</span></span></span>`;
}

function renderMessage(m, isLast) {
  const el = document.createElement('div');
  el.className = `msg ${m.role}${isLast ? ' last' : ''}`;
  el.dataset.id = m.id;
  if (m.role === 'user') {
    const files = [...(m.images || []).map((u) => `<img src="${esc(u)}" alt="Attached image">`), ...(m.files || []).map(fileCard)].join('');
    el.innerHTML = `${files ? `<div class="files">${files}</div>` : ''}${m.content ? `<div class="bubble">${esc(m.content)}</div>` : ''}
      <div class="msg-foot"><div class="actions">
        <button class="icon-btn" data-act="copy" aria-label="Copy" title="Copy">${icon('copy')}</button>
        <button class="icon-btn" data-act="edit" aria-label="Edit" title="Edit">${icon('pencil')}</button>
      </div></div>`;
    return el;
  }
  el.innerHTML = '<div class="body"></div>';
  fillAssistant(el, m, isLast);
  return el;
}

const chevron = () => icon('chevronRight', 'chev');

function fillAssistant(el, m, isLast = el.classList.contains('last')) {
  const body = el.querySelector('.body');
  const streaming = m.status === 'streaming';
  const openThinking = body.querySelector('details.thinking')?.open ?? false;
  const openDrafts = body.querySelector('details.drafts')?.open ?? false;
  let html = '';

  if (m.drafts?.length) {
    const done = m.drafts.filter((d) => d.status === 'done').length;
    html += `<details class="drafts"${openDrafts ? ' open' : ''}><summary>${chevron()}Council · ${done} of ${m.drafts.length} models answered</summary>
      ${m.drafts.map((d) => `<div class="draft"><div class="draft-head">${esc(shortName(d.model))}
        <span class="badge ${d.status === 'done' ? 'ok' : d.status === 'error' ? 'err' : 'dim'}">${d.status === 'done' ? 'done' : d.status === 'error' ? 'failed' : 'writing…'}</span></div>
        <div class="draft-body prose">${d.status === 'error' ? `<p class="muted">${esc(d.error)}</p>` : renderMarkdown(d.content || '…')}</div></div>`).join('')}
    </details>`;
  }
  if (m.reasoning && state.settings.showThinking) {
    const thinkingNow = streaming && !m.content;
    const secs = Math.max(1, Math.round(((m.thinkEnd || Date.now()) - (m.thinkStart || Date.now())) / 1000));
    const label = thinkingNow ? '<span class="shimmer">Thinking…</span>' : `Thought for ${secs} second${secs === 1 ? '' : 's'}`;
    html += `<details class="thinking"${openThinking ? ' open' : ''}><summary>${chevron()}${label}</summary><div class="thinking-body">${esc(m.reasoning)}</div></details>`;
  }
  if (streaming && !m.content && !(m.reasoning && state.settings.showThinking)) {
    const what = m.phase === 'council' ? `Consulting ${m.drafts?.length || ''} models`
      : m.phase === 'synth' ? 'Combining the best answers'
      : `Asking ${esc(shortName(m.model)) || 'the model'}`;
    html += `<div class="status-line"><span class="shimmer">${what}…</span></div>`;
  }
  if (m.content) html += `<div class="prose answer">${renderMarkdown(m.content)}</div>`;
  if (m.notes?.length && !streaming) html += m.notes.map((n) => `<div class="note">${esc(n)}</div>`).join('');
  if (m.error) {
    html += `<div class="error-box">${esc(m.error)}<div class="row">
      <button class="btn sm" data-act="retry">Try again</button>
      ${state.settings.mode !== 'auto' ? '<button class="btn sm" data-act="retry-auto">Retry with Auto</button>' : ''}</div></div>`;
  }
  if (m.stopped) html += '<div class="note">Stopped.</div>';
  html += `<div class="msg-foot">${streaming || isLast ? `<img class="spark${streaming ? ' live' : ''}" src="${LOGO}" alt="">` : ''}
    ${streaming ? '' : `<div class="actions">
      ${m.content ? `<button class="icon-btn" data-act="copy" aria-label="Copy" title="Copy">${icon('copy')}</button>` : ''}
      <button class="icon-btn" data-act="regen" aria-label="Retry" title="Retry">${icon('retry')}</button>
      ${m.model ? `<span class="model-tag">${esc(m.drafts?.length ? `Council → ${shortName(m.model)}` : shortName(m.model))}</span>` : ''}
    </div>`}</div>`;
  body.innerHTML = html;

  const answer = body.querySelector('.answer');
  if (answer) {
    const found = enhanceCode(answer, { msgId: m.id, streaming });
    for (const art of found) {
      artifacts.set(art, { streaming });
      // like Claude: big artifacts open beside the chat as they're written (wide screens)
      if (streaming && isWide() && !artifacts.isOpen && m.autoOpened !== art.key) { m.autoOpened = art.key; artifacts.open(art.key, { streaming: true }); }
    }
    if (!streaming && found.length) found.forEach((a) => artifacts.finish(a.key));
    artifacts.markActive();
    if (streaming) {
      const last = answer.lastElementChild;
      if (last && !last.classList.contains('codeblock') && !last.classList.contains('artifact-card')) {
        (last.matches('ul,ol') ? last.lastElementChild || last : last).classList.add('cursor');
      }
    }
  }
  body.querySelectorAll('.draft-body').forEach((d) => enhanceCode(d, { artifacts: false }));
  const tb = body.querySelector('.thinking-body');
  if (tb && streaming) tb.scrollTop = tb.scrollHeight;
}

// rAF-throttled live update of an assistant message while streaming
const pending = new Map();
function scheduleUpdate(m) {
  pending.set(m.id, m);
  if (scheduleUpdate.raf) return;
  scheduleUpdate.raf = requestAnimationFrame(() => {
    scheduleUpdate.raf = 0;
    const thread = $('#thread');
    const nearBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 160;
    for (const msg of pending.values()) {
      const el = thread.querySelector(`.msg[data-id="${msg.id}"]`);
      if (el) fillAssistant(el, msg);
    }
    pending.clear();
    if (nearBottom) thread.scrollTop = thread.scrollHeight;
  });
}

/* ================= Generation ================= */
function attachedText(m) {
  return (m.files || []).map((f) => `\n\n<attached_file name="${f.name}">\n${f.text}\n</attached_file>`).join('');
}
function apiMessages(conv, uptoIndex, { vision }) {
  const out = [{ role: 'system', content: systemPrompt(state.settings) }];
  for (const m of conv.messages.slice(0, uptoIndex)) {
    if (m.role === 'user') {
      let text = (m.content || '') + attachedText(m);
      if (m.images?.length && vision) {
        out.push({ role: 'user', content: [{ type: 'text', text: text || 'Describe this image.' }, ...m.images.map((url) => ({ type: 'image_url', image_url: { url } }))] });
      } else {
        if (m.images?.length) text += `\n\n[${m.images.length} image(s) attached, but this model can't view images.]`;
        out.push({ role: 'user', content: text });
      }
    } else if (m.content) out.push({ role: 'assistant', content: m.content });
  }
  return out;
}
const needsVision = (conv, upto) => conv.messages.slice(0, upto).some((m) => m.images?.length);

async function streamInto(target, { model, messages, signal, onEvent }) {
  for await (const ev of streamChat({
    key: state.settings.apiKey, model, messages, signal,
    temperature: state.settings.temperature, effort: state.settings.thinking ? 'high' : undefined,
  })) {
    if (ev.reasoning) { target.thinkStart ||= Date.now(); target.reasoning = (target.reasoning || '') + ev.reasoning; }
    if (ev.content) { if (target.thinkStart && !target.thinkEnd) target.thinkEnd = Date.now(); target.content += ev.content; }
    if (ev.model && model === 'openrouter/free') target.model = ev.model;
    onEvent?.();
  }
  if (target.thinkStart && !target.thinkEnd) target.thinkEnd = Date.now();
}

async function runWithFallback(asst, candidates, buildMessages, signal) {
  let lastErr;
  for (const m of candidates) {
    Object.assign(asst, { model: m.id, content: '', reasoning: '', thinkStart: 0, thinkEnd: 0 });
    scheduleUpdate(asst);
    try {
      await streamInto(asst, { model: m.id, messages: buildMessages(m), signal, onEvent: () => scheduleUpdate(asst) });
      if (!asst.content.trim() && asst.reasoning) asst.content = '_The model only returned its thinking. Try again or pick another model._';
      if (!asst.content.trim()) throw Object.assign(new Error(`${shortName(m.id)} returned an empty answer.`), { status: 0 });
      return;
    } catch (e) {
      if (e.name === 'AbortError' || e.status === 401 || asst.content.trim()) throw e;
      lastErr = e;
      (asst.notes ||= []).push(`${shortName(m.id)} was unavailable (${e.status || 'error'}), so another model answered.`);
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
    delete d.reasoning; delete d.thinkStart; delete d.thinkEnd;
    scheduleUpdate(asst);
  }));
  const ok = asst.drafts.filter((d) => d.status === 'done');
  if (!ok.length) throw new Error('None of the council models could answer right now (they may be rate-limited). Try Auto mode or wait a minute.');
  if (ok.length === 1) { asst.content = ok[0].content; asst.model = ok[0].model; return; }
  asst.phase = 'synth';
  const userMsg = conv.messages[idx - 1];
  const synthMessages = [...apiMessages(conv, idx - 1, { vision: false }), { role: 'user', content: synthesisPrompt((userMsg.content || '') + attachedText(userMsg), ok) }];
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
  updateSendButton();
  const isFirst = conv.messages.length === 2;
  try {
    if (state.settings.mode === 'council') await runCouncil(asst, conv, idx, ctrl.signal);
    else {
      const vision = needsVision(conv, idx);
      const candidates = state.settings.mode === 'single'
        ? [modelById(state.settings.model) || rankedCandidates({ needVision: vision })[0]]
        : rankedCandidates({ needVision: vision });
      await runWithFallback(asst, candidates, (m) => apiMessages(conv, idx, { vision: m.vision }), ctrl.signal);
    }
  } catch (e) {
    if (e.name === 'AbortError') asst.stopped = true;
    else asst.error = e.message || String(e);
  } finally {
    asst.status = 'done';
    delete asst.phase; delete asst.autoOpened;
    if (state.abort === ctrl) state.abort = null;
    updateSendButton();
    pending.delete(asst.id);
    if (state.current === conv) {
      const el = $(`#thread .msg[data-id="${asst.id}"]`);
      if (el) fillAssistant(el, asst, true);
      // a new artifact opens beside the chat on wide screens (like Claude)
      const card = el?.querySelector('.artifact-card');
      if (card && isWide() && !artifacts.isOpen) artifacts.open(card.dataset.art);
    }
    await persist(conv);
    if (isFirst && asst.content && !asst.error) makeTitle(conv);
  }
}

async function makeTitle(conv) {
  const first = conv.messages[0]?.content || conv.messages[0]?.files?.[0]?.name || '';
  for (const m of rankedCandidates({ needVision: false }).slice(0, 3)) {
    try {
      let t = await completeChat({ key: state.settings.apiKey, model: m.id, maxTokens: 30, messages: [
        { role: 'system', content: TITLE_PROMPT }, { role: 'user', content: first.slice(0, 2000) }] });
      t = t.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/^["'#*\s]+|["'.*\s]+$/g, '').split('\n')[0].trim();
      if (t && t.length <= 80) {
        conv.title = t;
        await persist(conv, { touch: false });
        if (state.current?.id === conv.id) $('#chat-title').textContent = t;
        return;
      }
    } catch { /* next */ }
  }
}

function stopGenerating() { state.abort?.abort(); }

async function send() {
  if (dict.busy) { finishDictation(true); return; }
  const input = $('#prompt');
  const text = input.value.trim();
  if ((!text && !state.attachments.length) || state.abort) return;
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

function updateSendButton() {
  const btn = $('#send');
  const listening = dict.busy;
  btn.classList.toggle('stop', !!state.abort && !listening);
  btn.classList.toggle('done', listening);
  btn.setAttribute('aria-label', listening ? 'Finish dictation' : state.abort ? 'Stop response' : 'Send message');
  btn.disabled = !listening && !state.abort && !$('#prompt').value.trim() && !state.attachments.length;
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
    msgEl.querySelector('.msg-foot').hidden = true;
    const bubble = msgEl.querySelector('.bubble');
    const editor = document.createElement('div');
    editor.innerHTML = `<textarea class="edit-box" rows="3" aria-label="Edit message">${esc(m.content)}</textarea>
      <div class="edit-actions"><button class="btn sm" data-edit="cancel">Cancel</button><button class="btn sm primary" data-edit="save">Save &amp; send</button></div>`;
    (bubble || msgEl.lastElementChild).replaceWith(editor);
    const ta = editor.querySelector('textarea');
    ta.style.height = `${Math.min(ta.scrollHeight + 4, 420)}px`;
    ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    const save = () => {
      if (!ta.value.trim()) return;
      m.content = ta.value.trim();
      conv.messages.splice(idx + 1);
      renderThread(); generate(conv);
    };
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); save(); }
      if (e.key === 'Escape') renderThread();
    });
    editor.querySelector('.edit-actions').addEventListener('click', (e) => {
      const which = e.target.closest('[data-edit]')?.dataset.edit;
      if (which === 'cancel') renderThread();
      if (which === 'save') save();
    });
  }
}

function exportChat(c = state.current) {
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
      toast('PDFs aren\'t supported yet. Paste the text instead, or attach a .txt file.');
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
    ${a.kind === 'image' ? `<img src="${a.url}" alt="${esc(a.name)}">` : fileCard(a)}
    <button type="button" class="x" data-rm="${i}" aria-label="Remove ${esc(a.name)}">${icon('x')}</button></div>`).join('');
  updateSendButton();
}

/* ================= Voice dictation ================= */
let voiceBase = '';
let voiceTimer = 0;
let voiceStarted = 0;
const BARS = 28;
let levels = new Array(BARS).fill(0.08);
let fakeLevel = 0;

const dict = new Dictation({
  onUpdate(final, interim) {
    const p = $('#prompt');
    p.value = joinText(voiceBase, joinText(final, interim));
    autosize();
    p.scrollTop = p.scrollHeight;
  },
  onDone(text) {
    const p = $('#prompt');
    p.value = joinText(voiceBase, text);
    autosize();
    endVoiceUI();
    if (!text) { toast('I didn\'t catch anything. Try again a little closer to the mic.'); return; }
    p.focus(); p.setSelectionRange(p.value.length, p.value.length);
    if (state.settings.voiceAutoSend || dict.sendAfter) { dict.sendAfter = false; send(); }
  },
  onCancel() { $('#prompt').value = voiceBase; autosize(); endVoiceUI(); },
  onError(msg, { fallback } = {}) {
    endVoiceUI();
    if (fallback && canUseAI()) { toast(`${msg} Switching to AI transcription.`); startDictation('ai'); return; }
    toast(msg, 5000);
  },
  onState(s) {
    $('#voice-status').textContent = s === 'transcribing' ? 'Transcribing…' : s === 'starting' ? 'Opening mic…' : 'Listening…';
    $('#send').disabled = s === 'transcribing' || s === 'starting';
  },
  onLevel(l) { if (dict.engine === 'ai') pushLevel(l); else fakeLevel = l; },
}, async (wav, lang) => {
  const name = VOICE_LANGS.find(([c]) => c && c === lang)?.[1]?.replace(/^[^\x00-\x7F]+\s*/, '') || '';
  let lastErr;
  for (const m of audioModels().slice(0, 3)) {
    try { return await transcribeAudio({ key: state.settings.apiKey, model: m.id, wavBase64: wav, langName: name }); }
    catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('No free audio model is available right now.');
});

const canUseAI = () => recordingSupported && !!state.settings.apiKey && audioModels().length > 0;
function chooseEngine() {
  const pref = state.settings.voiceEngine;
  if (pref === 'browser' && browserSpeechSupported) return 'browser';
  if (pref === 'ai' && canUseAI()) return 'ai';
  if (browserSpeechSupported) return 'browser';
  if (canUseAI()) return 'ai';
  return null;
}

function pushLevel(l) {
  levels.push(Math.max(0.08, Math.min(1, l)));
  levels = levels.slice(-BARS);
  $('#voice-wave').querySelectorAll('i').forEach((b, i) => (b.style.height = `${Math.round(levels[i] * 100)}%`));
}

function startDictation(forceEngine) {
  if (dict.busy) return;
  if (state.abort) { toast('Wait for the answer to finish first.'); return; }
  const engine = forceEngine || chooseEngine();
  if (!engine) {
    if (!recordingSupported) toast('Voice input isn\'t available in this browser. Try Chrome, Edge or Safari.', 5000);
    else if (!state.settings.apiKey) showWelcome();
    else toast('Voice input needs Chrome, Edge or Safari here, or a free audio model on OpenRouter (none online right now).', 5000);
    return;
  }
  voiceBase = $('#prompt').value;
  $('#voice-wave').innerHTML = '<i></i>'.repeat(BARS);
  levels = new Array(BARS).fill(0.08);
  $('#composer').classList.add('listening');
  $('.composer-row').classList.add('listening');
  $('#voice-bar').hidden = false;
  voiceStarted = Date.now();
  $('#voice-time').textContent = '0:00';
  clearInterval(voiceTimer);
  voiceTimer = setInterval(() => {
    const s = Math.floor((Date.now() - voiceStarted) / 1000);
    $('#voice-time').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    if (dict.engine === 'browser') { pushLevel(fakeLevel > 0.1 ? fakeLevel * (0.5 + Math.random() * 0.5) : 0.06 + Math.random() * 0.1); fakeLevel *= 0.75; }
  }, 90);
  $('#prompt').placeholder = 'Listening… speak now';
  dict.start(engine, state.settings.voiceLang || navigator.language);
  updateSendButton();
}
function finishDictation(andSend = false) { dict.sendAfter = andSend; dict.finish(); }
function endVoiceUI() {
  clearInterval(voiceTimer);
  $('#composer').classList.remove('listening');
  $('.composer-row').classList.remove('listening');
  $('#voice-bar').hidden = true;
  $('#prompt').placeholder = state.current?.messages.length ? 'Reply to Careva AI…' : 'How can I help you today?';
  updateSendButton();
}

/* ================= Settings & connection ================= */
async function refreshKeyInfo() {
  const s = state.settings;
  const status = $('#account-status'), keyStatus = $('#key-status');
  $('#avatar').textContent = (s.userName.trim()[0] || (s.apiKey ? 'C' : '?')).toUpperCase();
  $('#account-name').textContent = s.userName.trim() || 'Settings';
  $('#disconnect').hidden = !s.apiKey;
  $('#oauth-connect').textContent = s.apiKey ? 'Reconnect' : 'Connect with OpenRouter';
  if (!s.apiKey) { status.textContent = 'Not connected'; keyStatus.textContent = 'Not connected. Connect to start chatting.'; return; }
  status.textContent = 'Connected to OpenRouter';
  try {
    const info = await getKeyInfo(s.apiKey);
    keyStatus.textContent = `✓ Connected${info.label ? ` (${info.label})` : ''} · ${info.is_free_tier ? 'Free tier' : 'Credits on account'}${info.limit != null ? ` · limit $${info.limit}` : ''}`;
  } catch (e) {
    keyStatus.textContent = `⚠ ${e.message}`;
    if (e.status === 401) status.textContent = 'Key rejected, reconnect';
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
  $('#voice-lang').innerHTML = VOICE_LANGS.map(([c, n]) => `<option value="${c}">${esc(n)}</option>`).join('');
  $('#voice-lang').value = s.voiceLang;
  $('#voice-engine').value = s.voiceEngine;
  $('#voice-autosend').checked = s.voiceAutoSend;
  const am = audioModels();
  $('#voice-support').textContent = [
    browserSpeechSupported ? '✓ This browser supports live speech recognition.' : '✗ This browser has no built-in speech recognition.',
    am.length ? `✓ AI transcription available (${shortName(am[0].id)}).` : '✗ No free audio model online right now for AI transcription.',
  ].join(' ');
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
  const code = new URLSearchParams(location.search).get('code');
  if (!code) return;
  history.replaceState(null, '', location.pathname + location.hash);
  try {
    toast('Connecting to OpenRouter…');
    state.settings.apiKey = await finishOAuth(code);
    saveSettings();
    toast('Connected! You can start chatting.');
  } catch (e) { toast(`Connection failed: ${e.message}`, 5000); }
}

/* ================= Sidebar ================= */
function setRail(on) {
  state.settings.rail = on; saveSettings();
  $('#app').classList.toggle('rail', on);
  const b = $('#rail-toggle');
  b.setAttribute('aria-label', on ? 'Expand sidebar' : 'Collapse sidebar'); b.title = b.getAttribute('aria-label');
}
function openSidebarMobile() { $('#app').classList.add('sidebar-open'); $('#scrim').hidden = false; }
function closeSidebarMobile() { $('#app').classList.remove('sidebar-open'); $('#scrim').hidden = true; }
function openSearch() {
  if (isMobile()) openSidebarMobile();
  else if (state.settings.rail) setRail(false);
  $('#side-search').hidden = false;
  $('#search').focus();
}

/* ================= Composer ================= */
function autosize() {
  const ta = $('#prompt');
  ta.style.height = 'auto';
  ta.style.height = `${Math.min(ta.scrollHeight, innerHeight * 0.38)}px`;
  updateSendButton();
}

/* ================= Wire up ================= */
function bind() {
  $('#composer').addEventListener('submit', (e) => {
    e.preventDefault();
    if (dict.busy) finishDictation(false);
    else if (state.abort) stopGenerating();
    else send();
  });
  const p = $('#prompt');
  p.addEventListener('input', autosize);
  p.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !(isMobile() && 'ontouchstart' in window)) {
      e.preventDefault(); if (!state.abort) send();
    }
  });
  p.addEventListener('paste', (e) => {
    const files = [...(e.clipboardData?.files || [])];
    if (files.length) { e.preventDefault(); addFiles(files); return; }
    const text = e.clipboardData?.getData('text/plain') || '';
    if (text.length >= LONG_PASTE) {          // like Claude: long pastes become an attachment
      e.preventDefault();
      state.attachments.push({ kind: 'file', name: `Pasted text (${lineCount(text)} lines)`, text });
      renderAttachments();
    }
  });
  $('#file-input').addEventListener('change', (e) => { addFiles([...e.target.files]); e.target.value = ''; });
  $('#camera-input').addEventListener('change', (e) => { addFiles([...e.target.files]); e.target.value = ''; });
  $('#attachments').addEventListener('click', (e) => {
    const i = e.target.closest('[data-rm]')?.dataset.rm;
    if (i != null) { state.attachments.splice(+i, 1); renderAttachments(); }
  });
  const comp = $('#composer');
  comp.addEventListener('dragover', (e) => { e.preventDefault(); comp.classList.add('drag'); });
  comp.addEventListener('dragleave', () => comp.classList.remove('drag'));
  comp.addEventListener('drop', (e) => { e.preventDefault(); comp.classList.remove('drag'); addFiles([...e.dataTransfer.files]); });

  $('#plus-btn').addEventListener('click', (e) => { e.stopPropagation(); openPlusMenu(); });
  $('#think-btn').addEventListener('click', toggleThinking);
  $('#style-chip').addEventListener('click', () => { state.settings.style = 'normal'; saveSettings(); updateComposerTools(); });
  $('#model-btn').addEventListener('click', (e) => { e.stopPropagation(); openModelMenu(); });
  $('#mic').addEventListener('click', () => startDictation());
  $('#voice-cancel').addEventListener('click', () => dict.cancel());

  document.addEventListener('click', (e) => { if (!e.target.closest('#menu')) closeMenu(); });
  addEventListener('resize', () => { closeMenu(); updateModelLabel(); });
  document.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === 'Escape') {
      if (!$('#menu').hidden) closeMenu();
      else if (dict.busy) dict.cancel();
      else if (artifacts.isOpen) artifacts.close();
      else if (state.abort) stopGenerating();
    }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'o') { e.preventDefault(); startNewChat(); }
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
    if (mod && e.key.toLowerCase() === 'm') { e.preventDefault(); dict.busy ? finishDictation() : startDictation(); }
    if (mod && e.key === '.') { e.preventDefault(); isMobile() ? openSidebarMobile() : setRail(!state.settings.rail); }
  });

  const thread = $('#thread');
  thread.addEventListener('scroll', () => {
    const away = thread.scrollHeight - thread.scrollTop - thread.clientHeight > 400;
    $('#to-bottom').hidden = !away || $('#main').classList.contains('is-empty');
  }, { passive: true });
  $('#to-bottom').addEventListener('click', () => thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' }));
  thread.addEventListener('click', (e) => {
    const codeBtn = e.target.closest('[data-copy-code]');
    if (codeBtn) return copyText(codeBtn.closest('.codeblock').querySelector('code').innerText, codeBtn);
    const card = e.target.closest('.artifact-card');
    if (card) {
      if (artifacts.current === card.dataset.art) artifacts.close();
      else artifacts.open(card.dataset.art, { streaming: !!state.abort && card.closest('.msg')?.classList.contains('last') });
      return;
    }
    const act = e.target.closest('[data-act]');
    if (act) { onMessageAction(act.dataset.act, act.closest('.msg'), act); return; }
    const bubble = e.target.closest('.msg.user .bubble');   // phones: tap a message to show copy / edit
    if (bubble && isMobile()) bubble.closest('.msg').classList.toggle('show-actions');
  });
  $('#suggestions').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-suggest]');
    if (!chip) return;
    p.value = SUGGESTIONS[+chip.dataset.suggest].prompt; autosize(); p.focus();
    p.setSelectionRange(p.value.length, p.value.length);
  });

  $('#new-chat').addEventListener('click', startNewChat);
  $('#new-chat-top').addEventListener('click', startNewChat);
  $('#rail-toggle').addEventListener('click', () => setRail(!state.settings.rail));
  $('#open-sidebar').addEventListener('click', openSidebarMobile);
  $('#scrim').addEventListener('click', closeSidebarMobile);
  $('#search-btn').addEventListener('click', () => {
    const box = $('#side-search');
    if (!box.hidden && !state.settings.rail && !isMobile()) { box.hidden = true; state.search = ''; $('#search').value = ''; renderSidebar(); }
    else openSearch();
  });
  $('#search').addEventListener('input', (e) => { state.search = e.target.value; renderSidebar(); });
  $('#search').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.target.value = ''; state.search = ''; renderSidebar(); $('#side-search').hidden = true; } });
  $('#convo-list').addEventListener('click', (e) => {
    const more = e.target.closest('[data-more]');
    if (more) { e.stopPropagation(); const c = state.convos.find((x) => x.id === more.dataset.more); if (c) convoMenu(more, c, isMobile() ? 'auto' : 'right'); return; }
    const row = e.target.closest('.convo');
    if (row) openConversation(row.dataset.id);
  });
  $('#convo-list').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('convo')) openConversation(e.target.dataset.id);
  });
  $('#title-btn').addEventListener('click', (e) => { e.stopPropagation(); if (state.current) convoMenu($('#title-btn'), state.current); });

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
  bindSetting('#voice-lang', 'voiceLang');
  bindSetting('#voice-engine', 'voiceEngine');
  bindSetting('#voice-autosend', 'voiceAutoSend');
  $('#refresh-models').addEventListener('click', async () => { await loadModels(true); toast(`${state.models.length} free models loaded.`); });
  $('#clear-chats').addEventListener('click', async () => {
    if (!(await confirmDialog('Delete all chats?', 'Every chat on this device will be permanently deleted.', 'Delete all'))) return;
    await store.clearConversations(); state.convos = []; startNewChat(); toast('All chats deleted.');
  });
  $('#ask-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); $('#ask').close('ok'); }
  });
  $('#settings').addEventListener('close', () => { if (!state.current?.messages.length) renderThread(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
}

async function init() {
  hydrateIcons();
  applyTheme();
  if (state.settings.rail) setRail(true);
  renderSuggestions();
  updateComposerTools();
  bind();
  await handleOAuthReturn();
  updateModelLabel();
  refreshKeyInfo();
  try { state.convos = await store.listConversations(); } catch { state.convos = []; }
  const hashId = new URLSearchParams(location.hash.slice(1)).get('c');
  state.current = state.convos.find((c) => c.id === hashId) || null;
  state.convos.forEach((c) => c.messages.forEach((m) => { if (m.status === 'streaming') { m.status = 'done'; m.stopped = true; } }));
  renderSidebar();
  renderThread();
  loadModels();
  if (!state.settings.apiKey) showWelcome();
  else if (!isMobile()) $('#prompt').focus();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

init();
