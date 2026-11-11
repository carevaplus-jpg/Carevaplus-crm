export function distM(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371000, r = (x) => (x * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// City driving estimate used when the Google Directions service is unavailable (road factor 1.35, 22 km/h in Salem traffic).
export function etaMin(m) { return m == null ? null : Math.max(1, Math.round(((m * 1.35) / 1000 / 22) * 60)); }
export const fmtDist = (m) => (m == null ? "—" : m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);
export const gmapsDir = (to, from) =>
  `https://www.google.com/maps/dir/?api=1${from ? `&origin=${from.lat},${from.lng}` : ""}&destination=${to.lat},${to.lng}&travelmode=driving`;
export const gmapsAt = (p) => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
export const embedAt = (p, z = 15) => `https://maps.google.com/maps?q=${p.lat},${p.lng}&z=${z}&output=embed`;

export function getPosition(opts = {}) {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error("Location is not available on this device."));
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }),
      (e) => rej(new Error(e.code === 1 ? "Location permission is off. Allow location for Careva+ and try again." : "Couldn't get your location. Move to an open area and try again.")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000, ...opts },
    );
  });
}
