/* Auravelle service worker.
   Shell files are cached on install and served cache-first, so the site opens
   instantly and keeps working offline. Pages are network-first with a cache
   fallback, so content stays fresh while still being available offline. */

var VERSION = "auravelle-v1";
var SHELL = VERSION + "-shell";
var PAGES = VERSION + "-pages";

var SHELL_FILES = [
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "offline.html",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/kojiba-pack-480.webp",
  "assets/kojiba-pack-800.webp",
  "assets/kojiba-scene-400.webp",
  "assets/kojiba-scene-640.webp",
  "assets/auravelle-logo-600.webp"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(SHELL).then(function (c) {
      // One bad URL must not fail the whole install.
      return Promise.all(SHELL_FILES.map(function (u) {
        return c.add(u).catch(function () { return null; });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL && k !== PAGES) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  if (url.origin !== location.origin) return;       // let fonts and the rest go to the network

  // Pages: network first, fall back to cache, then to the offline page.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(PAGES).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match("offline.html");
        });
      })
    );
    return;
  }

  // Everything else: cache first, and fill the cache as we go.
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === "basic") {
          var copy = res.clone();
          caches.open(SHELL).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
