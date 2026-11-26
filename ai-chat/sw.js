// App-shell service worker: makes Careva AI installable and open instantly / offline.
// API calls to openrouter.ai are never cached.
const CACHE = 'careva-ai-v2';
const SHELL = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/app.js', 'js/openrouter.js', 'js/store.js', 'js/prompts.js',
  'js/icons.js', 'js/markdown.js', 'js/artifacts.js', 'js/voice.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.hostname.endsWith('openrouter.ai')) return;
  const sameOrigin = url.origin === location.origin;
  const isCdn = /cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(url.hostname);
  if (!sameOrigin && !isCdn) return;
  // network-first for our own files (fresh deploys win), cache fallback offline; cache-first for pinned CDN assets
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (isCdn) {
      const hit = await cache.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok || res.type === 'opaque') cache.put(e.request, res.clone());
      return res;
    }
    try {
      const res = await fetch(e.request);
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    } catch {
      return (await cache.match(e.request, { ignoreSearch: true })) || cache.match('index.html');
    }
  })());
});
