// Loads Leaflet 1.9.4 (BSD-2, © Vladimir Agafonkin / Leaflet contributors) from local ES-module source.
import * as Leaflet from './leaflet/src/Leaflet.js';
const L = Object.assign({}, Leaflet);
window.L = L;
window.dispatchEvent(new Event('leaflet:ready'));
