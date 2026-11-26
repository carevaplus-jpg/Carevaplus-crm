// Local persistence: conversations in IndexedDB (room for images), settings in localStorage.
const DB_NAME = 'careva-ai';
const STORE = 'conversations';
let dbPromise;

function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode, fn) {
  return db().then((d) => new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(r?.result);
    t.onerror = () => reject(t.error);
  }));
}

export async function listConversations() {
  const all = (await tx('readonly', (s) => s.getAll())) || [];
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}
export const saveConversation = (c) => tx('readwrite', (s) => s.put(JSON.parse(JSON.stringify(c))));
export const deleteConversation = (id) => tx('readwrite', (s) => s.delete(id));
export const clearConversations = () => tx('readwrite', (s) => s.clear());

const SETTINGS = 'careva.settings.v1';
export const DEFAULT_SETTINGS = {
  apiKey: '',
  mode: 'auto',          // auto | single | council
  model: '',             // used in single mode
  councilSize: 3,
  temperature: 0.7,
  instructions: '',
  userName: '',
  theme: 'system',       // system | light | dark
  showThinking: true,
  style: 'normal',       // normal | concise | explanatory | formal | friendly
  thinking: false,       // "Extended thinking" toggle
  voiceLang: '',         // '' = browser language
  voiceEngine: 'auto',   // auto | browser | ai
  voiceAutoSend: false,
  rail: false,           // sidebar collapsed to icon rail (desktop)
};

export function loadSettings() {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS) || '{}') }; }
  catch { return { ...DEFAULT_SETTINGS }; }
}
export function saveSettings(s) {
  localStorage.setItem(SETTINGS, JSON.stringify(s));
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
