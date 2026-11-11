import React, { useEffect, useRef, useState } from "react";
import { GOOGLE_MAPS_KEY } from "../lib/config";
import { embedAt, gmapsAt, gmapsDir, distM, etaMin, fmtDist } from "../lib/geo";
import { ExternalLink, Navigation } from "lucide-react";

/* ---------------- Google Maps JS API loader (once per page) ---------------- */
let loading = null;
function loadMaps() {
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  if (loading) return loading;
  loading = new Promise((res, rej) => {
    window.__careva_maps_cb = () => res(window.google.maps);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&v=weekly&libraries=geometry&loading=async&callback=__careva_maps_cb`;
    s.async = true;
    s.onerror = () => rej(new Error("Google Maps failed to load"));
    window.gm_authFailure = () => rej(new Error("Google Maps key was rejected"));
    document.head.appendChild(s);
  });
  return loading;
}

const STYLE = [
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi", elementType: "labels.icon", stylers: [{ saturation: -60 }, { lightness: 20 }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ lightness: 18 }] },
  { featureType: "water", stylers: [{ color: "#cfe3f5" }] },
  { featureType: "landscape", stylers: [{ color: "#f3f5f8" }] },
];

/* Marker artwork (SVG) — pins for homes/office, round avatars for staff */
function icon(m) {
  const c = m.color || "#0B2F5E";
  let svg, w, h, ax, ay;
  if (m.kind === "staff" || m.kind === "me") {
    const txt = (m.label || "").slice(0, 2);
    const ring = m.stale ? "#9AA4B2" : c;
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46"><circle cx="23" cy="23" r="20" fill="white" stroke="${ring}" stroke-width="3"/><circle cx="23" cy="23" r="15" fill="${ring}"/><text x="23" y="28" font-family="Arial" font-weight="700" font-size="13" fill="white" text-anchor="middle">${txt}</text></svg>`;
    w = h = 46; ax = ay = 23;
  } else if (m.kind === "office") {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50"><path d="M20 49s16-15 16-28A16 16 0 0 0 4 21c0 13 16 28 16 28z" fill="#0B2F5E" stroke="white" stroke-width="2"/><path d="M14 21h12M20 15v12" stroke="#7BC74D" stroke-width="4" stroke-linecap="round"/></svg>`;
    w = 40; h = 50; ax = 20; ay = 49;
  } else {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44"><path d="M17 43s14-13 14-25A14 14 0 0 0 3 18c0 12 14 25 14 25z" fill="${c}" stroke="white" stroke-width="2"/><path d="M11 19l6-5 6 5v6h-12z" fill="white"/></svg>`;
    w = 34; h = 44; ax = 17; ay = 43;
  }
  const g = window.google.maps;
  return { url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg), scaledSize: new g.Size(w, h), anchor: new g.Point(ax, ay) };
}

export default function GMap({ markers = [], paths = [], route, onRoute, height = 360, focus, className = "", radius }) {
  if (!GOOGLE_MAPS_KEY) return <FallbackMap markers={markers} route={route} onRoute={onRoute} height={height} focus={focus} className={className} />;
  return <LiveMap {...{ markers, paths, route, onRoute, height, focus, className, radius }} />;
}

function LiveMap({ markers, paths, route, onRoute, height, focus, className, radius }) {
  const el = useRef(null), map = useRef(null), mk = useRef(new Map()), lines = useRef([]), info = useRef(null);
  const dir = useRef(null), lastRoute = useRef(null), fitted = useRef(false), circle = useRef(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let dead = false;
    loadMaps().then((g) => {
      if (dead || !el.current) return;
      map.current = new g.Map(el.current, {
        center: focus || markers[0] || { lat: 11.6643, lng: 78.146 }, zoom: 13, styles: STYLE,
        disableDefaultUI: true, zoomControl: true, fullscreenControl: true, gestureHandling: "greedy", clickableIcons: false,
      });
      info.current = new g.InfoWindow();
      dir.current = new g.DirectionsRenderer({ map: map.current, suppressMarkers: true, preserveViewport: true, polylineOptions: { strokeColor: "#2B6DE8", strokeWeight: 6, strokeOpacity: 0.85 } });
      setErr(null);
      sync();
    }).catch((e) => setErr(e.message));
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sync() {
    const g = window.google?.maps; if (!g || !map.current) return;
    const seen = new Set();
    markers.forEach((m) => {
      if (m.lat == null) return;
      seen.add(m.id);
      let o = mk.current.get(m.id);
      const pos = { lat: m.lat, lng: m.lng };
      if (!o) {
        o = new g.Marker({ map: map.current, position: pos, icon: icon(m), title: m.title, zIndex: m.kind === "staff" ? 50 : 10 });
        o.addListener("click", () => { info.current.setContent(`<div style="font:600 13px system-ui;padding:2px 4px">${m.title || ""}<div style="font-weight:400;color:#5b6577;margin-top:2px">${m.sub || ""}</div></div>`); info.current.open(map.current, o); m.onClick?.(); });
        mk.current.set(m.id, o);
      } else {
        o.setIcon(icon(m));
        glide(o, pos);
      }
    });
    for (const [id, o] of mk.current) if (!seen.has(id)) { o.setMap(null); mk.current.delete(id); }
    lines.current.forEach((l) => l.setMap(null));
    lines.current = paths.filter((p) => p.pts.length > 1).map((p) => new g.Polyline({
      map: map.current, path: p.pts, strokeColor: p.color, strokeOpacity: 0, strokeWeight: 4,
      icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.8, strokeWeight: 3, scale: 3 }, offset: "0", repeat: "12px" }],
    }));
    if (radius && focus) {
      if (!circle.current) circle.current = new g.Circle({ map: map.current, strokeColor: "#3FA34D", strokeOpacity: 0.6, strokeWeight: 1, fillColor: "#3FA34D", fillOpacity: 0.08 });
      circle.current.setCenter(focus); circle.current.setRadius(radius);
    }
    if (!fitted.current) {
      const pts = markers.filter((m) => m.lat != null);
      if (pts.length > 1) { const b = new g.LatLngBounds(); pts.forEach((m) => b.extend(m)); map.current.fitBounds(b, 60); fitted.current = true; }
      else if (pts.length === 1) { map.current.setCenter(pts[0]); map.current.setZoom(15); fitted.current = true; }
    }
    if (route?.from && route?.to) drawRoute(g);
    else dir.current?.setDirections({ routes: [] });
  }

  function drawRoute(g) {
    const last = lastRoute.current;
    const moved = !last || distM(last.from, route.from) > 120 || distM(last.to, route.to) > 20 || Date.now() - last.at > 90e3;
    if (!moved) return;
    lastRoute.current = { from: route.from, to: route.to, at: Date.now() };
    new g.DirectionsService().route({
      origin: route.from, destination: route.to, travelMode: g.TravelMode.DRIVING,
      drivingOptions: { departureTime: new Date(), trafficModel: "bestguess" },
    }, (r, status) => {
      if (status !== "OK") { onRoute?.({ minutes: etaMin(distM(route.from, route.to)), meters: distM(route.from, route.to), approx: true }); return; }
      dir.current.setDirections(r);
      const leg = r.routes[0].legs[0];
      onRoute?.({ minutes: Math.round((leg.duration_in_traffic || leg.duration).value / 60), meters: leg.distance.value, approx: false });
    });
  }

  useEffect(sync); // every render: markers move, paths redraw

  return (
    <div className={`map ${className}`} style={{ height }}>
      <div ref={el} style={{ position: "absolute", inset: 0 }} />
      {err && <div className="map-err">{err}. Check the Google Maps key in app/.env.</div>}
    </div>
  );
}

/* Smoothly animate a marker to its new position (1 s ease-out) */
function glide(o, to) {
  const from = o.getPosition(); if (!from) return o.setPosition(to);
  const a = { lat: from.lat(), lng: from.lng() };
  if (Math.abs(a.lat - to.lat) + Math.abs(a.lng - to.lng) < 1e-7) return;
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / 1000), e = 1 - (1 - k) ** 3;
    o.setPosition({ lat: a.lat + (to.lat - a.lat) * e, lng: a.lng + (to.lng - a.lng) * e });
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------------- Keyless fallback: Google Maps embed + links ---------------- */
function FallbackMap({ markers, route, onRoute, height, focus, className }) {
  const target = route?.from || focus || markers.find((m) => m.kind === "staff") || markers[0];
  const d = route?.from && route?.to ? distM(route.from, route.to) : null;
  useEffect(() => { if (d != null) onRoute?.({ minutes: etaMin(d), meters: d, approx: true }); /* eslint-disable-next-line */ }, [d != null && Math.round(d / 50)]);
  if (!target) return <div className={`map map-empty ${className}`} style={{ height }}>No locations to show yet</div>;
  return (
    <div className={`map ${className}`} style={{ height }}>
      <iframe title="Google Map" src={embedAt(target, route ? 14 : 13)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" style={{ border: 0, position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      <div className="map-chip">
        {route?.to ? (
          <a href={gmapsDir(route.to, route.from)} target="_blank" rel="noreferrer"><Navigation size={14} /> Route in Google Maps · {fmtDist(d)}</a>
        ) : (
          <a href={gmapsAt(target)} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open in Google Maps</a>
        )}
      </div>
    </div>
  );
}
