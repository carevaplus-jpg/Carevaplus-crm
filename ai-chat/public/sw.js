// App-shell service worker: installable + opens offline. Build assets are content-hashed,
// so: network-first for pages, cache-first for /assets/*, never touch openrouter.ai.
const CACHE = 'careva-ai-v3';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', 'manifest.webmanifest', 'icons/icon.svg'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.hostname.endsWith('openrouter.ai')) return;
  const same = url.origin === location.origin;
  const cdn = /fonts\.(googleapis|gstatic)\.com/.test(url.hostname);
  if (!same && !cdn) return;
  if (url.pathname.endsWith('.apk')) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (cdn || url.pathname.includes('/assets/')) {
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
      return (await cache.match(e.request, { ignoreSearch: true })) || cache.match('./');
    }
  })());
});
