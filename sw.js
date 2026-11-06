/* Careva+ service worker — app shell offline cache. Never caches patient data or API calls. */
const VERSION = 'careva-v9';
const SHELL = [
"./",
"css/app.css",
"img/icons/apple-touch-icon.png",
"img/icons/favicon-64.png",
"img/icons/icon-192.png",
"img/icons/icon-512.png",
"img/icons/maskable-512.png",
"img/logo.png",
"img/mark.png",
"index.html",
"js/cloud.js",
"js/config.js",
"js/core.js",
"js/i18n.js",
"js/main.js",
"js/notify.js",
"js/office.js",
"js/patient.js",
"js/sbload.js",
"vendor/supabase.js",
"js/staff.js",
"manifest.webmanifest",
"vendor/leaflet-entry.js",
"vendor/leaflet/LICENSE",
"vendor/leaflet/images/layers-2x.png",
"vendor/leaflet/images/layers.png",
"vendor/leaflet/images/marker-icon-2x.png",
"vendor/leaflet/images/marker-icon.png",
"vendor/leaflet/images/marker-shadow.png",
"vendor/leaflet/leaflet.css",
"vendor/leaflet/src/Leaflet.js",
"vendor/leaflet/src/control/Control.Attribution.js",
"vendor/leaflet/src/control/Control.Layers.js",
"vendor/leaflet/src/control/Control.Scale.js",
"vendor/leaflet/src/control/Control.Zoom.js",
"vendor/leaflet/src/control/Control.js",
"vendor/leaflet/src/control/index.js",
"vendor/leaflet/src/core/Browser.js",
"vendor/leaflet/src/core/Class.js",
"vendor/leaflet/src/core/Class.leafdoc",
"vendor/leaflet/src/core/Events.js",
"vendor/leaflet/src/core/Events.leafdoc",
"vendor/leaflet/src/core/Handler.js",
"vendor/leaflet/src/core/Util.js",
"vendor/leaflet/src/core/index.js",
"vendor/leaflet/src/dom/DomEvent.DoubleTap.js",
"vendor/leaflet/src/dom/DomEvent.Pointer.js",
"vendor/leaflet/src/dom/DomEvent.js",
"vendor/leaflet/src/dom/DomUtil.js",
"vendor/leaflet/src/dom/Draggable.js",
"vendor/leaflet/src/dom/PosAnimation.js",
"vendor/leaflet/src/dom/index.js",
"vendor/leaflet/src/geo/LatLng.js",
"vendor/leaflet/src/geo/LatLngBounds.js",
"vendor/leaflet/src/geo/crs/CRS.EPSG3395.js",
"vendor/leaflet/src/geo/crs/CRS.EPSG3857.js",
"vendor/leaflet/src/geo/crs/CRS.EPSG4326.js",
"vendor/leaflet/src/geo/crs/CRS.Earth.js",
"vendor/leaflet/src/geo/crs/CRS.Simple.js",
"vendor/leaflet/src/geo/crs/CRS.js",
"vendor/leaflet/src/geo/crs/index.js",
"vendor/leaflet/src/geo/index.js",
"vendor/leaflet/src/geo/projection/Projection.LonLat.js",
"vendor/leaflet/src/geo/projection/Projection.Mercator.js",
"vendor/leaflet/src/geo/projection/Projection.SphericalMercator.js",
"vendor/leaflet/src/geo/projection/index.js",
"vendor/leaflet/src/geometry/Bounds.js",
"vendor/leaflet/src/geometry/LineUtil.js",
"vendor/leaflet/src/geometry/Point.js",
"vendor/leaflet/src/geometry/PolyUtil.js",
"vendor/leaflet/src/geometry/Transformation.js",
"vendor/leaflet/src/geometry/index.js",
"vendor/leaflet/src/images/layers.svg",
"vendor/leaflet/src/images/logo.svg",
"vendor/leaflet/src/images/marker.svg",
"vendor/leaflet/src/layer/DivOverlay.js",
"vendor/leaflet/src/layer/FeatureGroup.js",
"vendor/leaflet/src/layer/GeoJSON.js",
"vendor/leaflet/src/layer/ImageOverlay.js",
"vendor/leaflet/src/layer/Layer.Interactive.leafdoc",
"vendor/leaflet/src/layer/Layer.js",
"vendor/leaflet/src/layer/LayerGroup.js",
"vendor/leaflet/src/layer/Popup.js",
"vendor/leaflet/src/layer/SVGOverlay.js",
"vendor/leaflet/src/layer/Tooltip.js",
"vendor/leaflet/src/layer/VideoOverlay.js",
"vendor/leaflet/src/layer/index.js",
"vendor/leaflet/src/layer/marker/DivIcon.js",
"vendor/leaflet/src/layer/marker/Icon.Default.js",
"vendor/leaflet/src/layer/marker/Icon.js",
"vendor/leaflet/src/layer/marker/Marker.Drag.js",
"vendor/leaflet/src/layer/marker/Marker.js",
"vendor/leaflet/src/layer/marker/index.js",
"vendor/leaflet/src/layer/tile/GridLayer.js",
"vendor/leaflet/src/layer/tile/TileLayer.WMS.js",
"vendor/leaflet/src/layer/tile/TileLayer.js",
"vendor/leaflet/src/layer/tile/index.js",
"vendor/leaflet/src/layer/vector/Canvas.js",
"vendor/leaflet/src/layer/vector/Circle.js",
"vendor/leaflet/src/layer/vector/CircleMarker.js",
"vendor/leaflet/src/layer/vector/Path.js",
"vendor/leaflet/src/layer/vector/Polygon.js",
"vendor/leaflet/src/layer/vector/Polyline.js",
"vendor/leaflet/src/layer/vector/Rectangle.js",
"vendor/leaflet/src/layer/vector/Renderer.getRenderer.js",
"vendor/leaflet/src/layer/vector/Renderer.js",
"vendor/leaflet/src/layer/vector/SVG.Util.js",
"vendor/leaflet/src/layer/vector/SVG.VML.js",
"vendor/leaflet/src/layer/vector/SVG.js",
"vendor/leaflet/src/layer/vector/index.js",
"vendor/leaflet/src/map/Map.js",
"vendor/leaflet/src/map/Map.methodOptions.leafdoc",
"vendor/leaflet/src/map/handler/Map.BoxZoom.js",
"vendor/leaflet/src/map/handler/Map.DoubleClickZoom.js",
"vendor/leaflet/src/map/handler/Map.Drag.js",
"vendor/leaflet/src/map/handler/Map.Keyboard.js",
"vendor/leaflet/src/map/handler/Map.ScrollWheelZoom.js",
"vendor/leaflet/src/map/handler/Map.TapHold.js",
"vendor/leaflet/src/map/handler/Map.TouchZoom.js",
"vendor/leaflet/src/map/index.js"
];
const CDN = ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL).then(() => Promise.all(CDN.map(u => fetch(u, {mode:'cors'}).then(r => r.ok && c.put(u, r)).catch(() => {}))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(req.mode === 'navigate'){
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put('./', copy)); return r; }).catch(() => caches.match('./')));
    return;
  }
  if(url.origin === location.origin){
    if(url.pathname.endsWith('.mp4')) return;   // video streams with range requests
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if(r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if(CDN.includes(req.url) || url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com'){
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return r; })));
  }
});
