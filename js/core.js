'use strict';
/* =========================================================
   Careva+ Home Health Care — core: utils, data, store, UI kit,
   charts, map and GPS engine (shared by all three portals)
   ========================================================= */
const CO = {
  get c(){ return (Store.s && Store.s.settings && Store.s.settings.company) || {}; },
  brand:'Careva+',
  get name(){ return this.c.name || 'Careva Plus Home Health Care'; },
  get phone(){ return this.c.phone || '96555 08881'; },
  get tel(){ return '+91' + String(this.phone).replace(/\D/g,'').slice(-10); },
  get web(){ return this.c.web || 'carevaplus.com'; },
  get city(){ return this.c.city || 'Salem · Tamil Nadu'; },
  get upi(){ return this.c.upi || ''; },
};


/* ---------------- utils ---------------- */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2,'0');
const dstr = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const addDays = (d,n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const TODAY = () => dstr(new Date());
const dOff = n => dstr(addDays(new Date(), n));
const parseD = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const LOC = () => typeof I18N !== 'undefined' && I18N.on() ? 'ta-IN' : 'en-IN';
const T = s => typeof I18N !== 'undefined' ? I18N.t(s) : s;
const fmtD = (s, o={weekday:'short', day:'numeric', month:'short'}) => !s ? '—' : parseD(s).toLocaleDateString(LOC(), o);
const relDay = s => !s ? '—' : s===TODAY() ? T('Today') : s===dOff(1) ? T('Tomorrow') : s===dOff(-1) ? T('Yesterday') : fmtD(s);
const fmtT = t => { if(!t) return '—'; let [h,m] = t.split(':').map(Number); const ap = h>=12?'PM':'AM'; h = h%12||12; return `${h}:${pad(m)} ${ap}`; };
const toMin = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
const fromMin = m => { m = Math.max(0, Math.min(23*60+59, Math.round(m))); return `${pad(Math.floor(m/60))}:${pad(m%60)}`; };
const nowMin = () => { const d = new Date(); return d.getHours()*60 + d.getMinutes(); };
const nowHM = () => fromMin(nowMin());
const tsTime = ts => new Date(ts).toLocaleTimeString(LOC(), {hour:'numeric', minute:'2-digit'});
const tsFull = ts => new Date(ts).toLocaleString(LOC(), {day:'numeric', month:'short', hour:'numeric', minute:'2-digit'});
const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
const uid = (p='') => p + ((window.crypto && crypto.randomUUID) ? crypto.randomUUID().replace(/-/g,'').slice(0,14) : (Date.now().toString(36) + Math.random().toString(36).slice(2,9)));
const initials = n => String(n).replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/,'').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0,2).join('').toUpperCase();
const first = n => String(n).split(' ')[0];
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const lerp = (a,b,t) => a + (b-a)*t;
const sum = a => a.reduce((x,y) => x+y, 0);
const avg = a => a.length ? sum(a)/a.length : 0;
const greet = () => { const h = new Date().getHours(); return T(h<12 ? 'Good morning' : h<17 ? 'Good afternoon' : 'Good evening'); };
const timeAgo = ts => { const s = (Date.now()-ts)/1000; if(s<45) return 'just now'; if(s<3600) return Math.round(s/60)+' min ago'; if(s<86400) return Math.round(s/3600)+' h ago'; return Math.round(s/86400)+' d ago'; };
const haversine = (a,b) => { const R=6371000, r=Math.PI/180; const dLat=(b.lat-a.lat)*r, dLng=(b.lng-a.lng)*r; const x=Math.sin(dLat/2)**2 + Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLng/2)**2; return 2*R*Math.asin(Math.sqrt(x)); };
const fmtDist = m => m==null || !isFinite(m) ? '—' : m < 1000 ? `${Math.round(m)} m` : `${(m/1000).toFixed(m<10000?1:0)} km`;
const etaMin = m => !isFinite(m) ? '—' : Math.max(1, Math.round(m / (20000/60)));   // ~20 km/h city traffic
function rng(seed){ let a = seed>>>0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------------- icons ---------------- */
const ICONS = {
  home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  calendar:'<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  heart:'<path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 21.8l8.8-8.8a5.2 5.2 0 0 0 0-7.4Z"/>',
  pulse:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  pill:'<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
  chat:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  card:'<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20M6 15h4"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  pin:'<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
  nav:'<path d="m3 11 19-9-9 19-2-8-8-2Z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/>',
  bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  right:'<path d="m9 18 6-6-6-6"/>',
  left:'<path d="m15 18-6-6 6-6"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  sliders:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  alert:'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  chart:'<path d="M3 3v18h18"/><path d="M8 17v-5M13 17V8M18 17v-9"/>',
  grid:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  steth:'<path d="M5 3H4v6a5 5 0 0 0 10 0V3h-1"/><path d="M9 14v1.5a5.5 5.5 0 0 0 11 0V13"/><circle cx="20" cy="11" r="2"/>',
  thermo:'<path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0Z"/>',
  drop:'<path d="M12 2.7s6 6.3 6 11.3a6 6 0 0 1-12 0c0-5 6-11.3 6-11.3Z"/>',
  lungs:'<path d="M12 4v8M12 12c-2-2-4 0-4 0M12 12c2-2 4 0 4 0"/><path d="M8 8.5C5 8 3 12 3 16c0 2.5 1.5 4 3.5 4S9 18.5 9 16v-4.5M16 8.5c3-.5 5 3.5 5 7.5 0 2.5-1.5 4-3.5 4S15 18.5 15 16v-4.5"/>',
  play:'<path d="M7 4.5v15l12-7.5z"/>',
  vol:'<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  mute:'<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>',
  send:'<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  camera:'<path d="M14.5 4h-5L7.5 6.5H4a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8.5a2 2 0 0 0-2-2h-3.5z"/><circle cx="12" cy="13" r="3.5"/>',
  pen:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  clipboard:'<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 2h6v4H9zM9 11h6M9 15h6"/>',
  briefcase:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2 13h20"/>',
  star:'<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  route:'<circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/>',
  locate:'<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
  more:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1Z"/>',
  rupee:'<path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3a5 5 0 0 0 0-10"/>',
  upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  building:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  bed:'<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
  elder:'<circle cx="11" cy="4" r="2"/><path d="M11 8v5l-3 8M11 13l3 3v5M8 10l-2 4M15 9l2.5 2.5V21"/>',
  physio:'<circle cx="13" cy="4" r="2"/><path d="m4 13 4-2 3 1 2-4 4 3 3 1"/><path d="m11 12-1 5 3 4M13 8l2 6 4 4"/>',
  bandage:'<rect x="2.5" y="7.5" width="19" height="9" rx="4.5" transform="rotate(-35 12 12)"/><path d="M10 10.5h.01M13.5 13h.01M11 13.5h.01M12.5 10h.01"/>',
  award:'<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 8 5-3 5 3-1.5-8"/>',
  trend:'<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  refresh:'<path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5"/>',
  filter:'<path d="M3 4h18l-7 8.5V19l-4 2v-8.5z"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  map:'<path d="m9 4-6 2.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  log:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  signal:'<path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16"/>',
  sos:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5h.01"/>',
  car:'<path d="M5 16H3v-4l2-5h14l2 5v4h-2"/><circle cx="7.5" cy="16.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/><path d="M9.5 16.5h5M4 12h16"/>',
  timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M10 2h4"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  edit:'<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  doctor:'<circle cx="12" cy="7" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/><path d="M12 15v4M10 17h4"/>',
};
const I = (n, cls='') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||ICONS.info}</svg>`;

/* ---------------- reference data ---------------- */
const AREAS = {
  'Fairlands':[11.6735,78.1365], 'Hasthampatti':[11.6748,78.1525], 'Five Roads':[11.6690,78.1420], 'Alagapuram':[11.6850,78.1395],
  'Suramangalam':[11.6650,78.1215], 'Ammapet':[11.6545,78.1715], 'Gugai':[11.6455,78.1590], 'Shevapet':[11.6560,78.1545],
  'Kondalampatti':[11.6330,78.1270], 'Swarnapuri':[11.6775,78.1300], 'Junction':[11.6705,78.1150], 'Meyyanur':[11.6610,78.1420], 'Kitchipalayam':[11.6480,78.1440]
};
const OFFICE = { get lat(){ return +(S().settings.company.officeLat ?? 11.6643); }, get lng(){ return +(S().settings.company.officeLng ?? 78.1460); }, name:'Careva+ office' };
const SERVICES = [
  {id:'nursing',    name:'Home Nursing Care',     short:'Nursing',    desc:'Nursing support at home',        icon:'home',    rate:800,  unit:'visit',      color:'#2B6DE8'},
  {id:'elder',      name:'Elder Care',            short:'Elder care', desc:'Daily support for seniors',      icon:'elder',   rate:900,  unit:'4-hr shift', color:'#7B5CE6'},
  {id:'postop',     name:'Post-Operative Care',   short:'Post-op',    desc:'Recovery support after surgery', icon:'bed',     rate:1000, unit:'visit',      color:'#0E9AA7'},
  {id:'physio',     name:'Physiotherapy at Home', short:'Physio',     desc:'Rehab sessions at home',         icon:'physio',  rate:700,  unit:'session',    color:'#4FA21A'},
  {id:'wound',      name:'Wound Care',            short:'Wound care', desc:'Dressing & wound care support',  icon:'bandage', rate:900,  unit:'visit',      color:'#D98A00'},
  {id:'palliative', name:'Palliative Care',       short:'Palliative', desc:'Comfort and dignity',            icon:'heart',   rate:1200, unit:'visit',      color:'#E1343A'},
];
const TASKS = {
  nursing:['Check vitals — BP, pulse, SpO₂, temperature','Blood sugar check','Administer medicines / insulin as charted','Review medicine adherence','Skin & pressure-area check','Patient & family education'],
  elder:['Assist bathing & grooming','Mobility & transfer assistance','Meal & hydration support','Medicine reminder','Companionship / memory activity','Fall-risk & home safety check'],
  postop:['Check vitals','Inspect surgical site','Change dressing (aseptic)','Pain assessment (0–10)','Drain / catheter check','Supervised mobility exercises'],
  physio:['Pain & range-of-motion assessment','Strengthening exercises','Gait training with walker','Balance training','Review home exercise plan'],
  wound:['Measure & photograph wound','Cleanse wound (normal saline)','Apply prescribed dressing','Check for signs of infection','Offloading & diet advice'],
  palliative:['Symptom assessment (pain, breathlessness)','Comfort care & positioning','Medicine review','Mouth & skin care','Family counselling & support'],
};
const NOTE_TPL = {
  nursing:'Vitals stable. Medicines given as per chart. Patient comfortable, no new complaints.',
  elder:'Assisted with bath and breakfast. Short walk with support (10 min). Mood cheerful, ate well.',
  postop:'Surgical site clean and dry, no signs of infection. Dressing changed. Pain 3/10.',
  physio:'40-min session: gait training with walker and quadriceps strengthening. Tolerated well.',
  wound:'Wound size reducing. Cleansed with NS, dressing applied. Mild exudate, no odour.',
  palliative:'Breathlessness eased with positioning and nebulisation. Family counselled. Comfortable.',
};
const svc = id => SERVICES.find(s => s.id===id) || SERVICES[0];

/* ---------------- data (starts empty — everything comes from the live database) ---------------- */
function defaultSettings(){ return { geofence:150, lateMin:15, requireSig:true, requirePhotoWound:true, mileageRate:4,
  rates:Object.fromEntries(SERVICES.map(s => [s.id, s.rate])),
  company:{name:'Careva Plus Home Health Care', phone:'96555 08881', web:'carevaplus.com', city:'Salem · Tamil Nadu', upi:'', officeLat:11.6643, officeLng:78.1460, officeSet:false} }; }
function mergeSettings(d){ const def = defaultSettings(); d = d || {}; return {...def, ...d, rates:{...def.rates, ...(d.rates||{})}, company:{...def.company, ...(d.company||{})}}; }
function emptyData(){ return {staff:[], patients:[], visits:[], vitals:[], meds:{}, medLog:{}, carePlan:{}, docs:{}, invoices:[], requests:[], messages:{}, alerts:[], notifications:{}, gps:{}, shifts:{}, leave:[], timesheets:{}, settings:defaultSettings()}; }

/* ---------------- store (in-memory cache, synced by Sync in cloud.js) ---------------- */
const Store = { s:null, save(){ if(typeof Cloud !== 'undefined' && Cloud.profile) Sync.schedule(); } };
const S = () => Store.s || (Store.s = emptyData());
const pat = id => S().patients.find(p => p.id===id);
const stf = id => S().staff.find(s => s.id===id);
const ratingOf = s => { if(!s || !s.id) return '–'; const r = S().visits.filter(v => v.sid===s.id && v.rating).map(v => +v.rating); return r.length ? avg(r).toFixed(1) : 'New'; };
const stfOr = id => stf(id) || {id, name:'Unassigned', role:'Care staff', short:'—', color:'#97A4B6', rating:'–', exp:'–', phone:'', qual:'', skills:[], certs:[], area:''};
const visit = id => S().visits.find(v => v.id===id);
const rate = sid => S().settings.rates[sid] ?? svc(sid).rate;
const visitEnd = v => fromMin(toMin(v.start)+v.dur);
const byTime = (a,b) => (a.date+a.start).localeCompare(b.date+b.start);
const isLate = v => v.date===TODAY() && v.status==='scheduled' && toMin(v.start) + S().settings.lateMin < nowMin();
const STATUS = {
  scheduled:['Scheduled','p-blue'], enroute:['On the way','p-violet'], inprogress:['In progress','p-amber'], completed:['Completed','p-green'],
  missed:['Missed','p-red'], cancelled:['Cancelled','p-gray'], pending:['Awaiting confirmation','p-amber'], late:['Late','p-red'] };
const stPill = (st) => { const [l,c] = STATUS[st] || [st,'p-gray']; return `<span class="pill ${c}"><span class="d"></span>${l}</span>`; };
const vPill = v => stPill(isLate(v) ? 'late' : v.status);
const av = (name, color='#2B6DE8', cls='', on=false) => `<span class="av ${cls}" style="background:${color}">${esc(initials(name))}${on?'<i class="on"></i>':''}</span>`;
const patColor = id => ['#2B6DE8','#0E9AA7','#7B5CE6','#D98A00','#C2417F','#4FA21A','#E1343A','#11407D'][Number(id.slice(-2))%8];
function addMsg(thread, from, text){ (S().messages[thread] ||= []).push({id:uid('m'), thread, from, text, ts:Date.now()}); Store.save(); }
function addAlert(level, kind, text, extra={}){ S().alerts.unshift({id:uid('A'), level, kind, text, ts:Date.now(), ...extra}); Store.save(); }
function notifyPatient(pid, text){ if(!pid) return; (S().notifications[pid] ||= []).unshift({id:uid('n'), pid, text, ts:Date.now()}); Store.save(); }

/* ---------------- UI kit ---------------- */
const Toast = {
  show(msg, type='ok', ms=2600){
    let host = $('.toast-host'); if(!host){ host = document.createElement('div'); host.className = 'toast-host'; document.body.appendChild(host); }
    const el = document.createElement('div'); el.className = `toast ${type}`;
    el.innerHTML = `${I(type==='err'?'alert':type==='warn'?'info':'check')}<span>${msg}</span>`;
    host.appendChild(el); setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, ms);
  }
};
const toast = (m,t,ms) => Toast.show(m,t,ms);
const Modal = {
  stack:[],
  open({title='', sub='', body='', foot='', wide=false, onOpen, onClose, cls=''}){
    const w = document.createElement('div'); w.className = 'modal-wrap';
    w.innerHTML = `<div class="modal ${wide?'wide':''} ${cls}" role="dialog" aria-modal="true">
      ${title ? `<div class="modal-h"><div class="grow"><h3>${title}</h3>${sub?`<div class="sub">${sub}</div>`:''}</div><button class="icon-btn" data-close aria-label="Close">${I('x','sm')}</button></div>` : ''}
      <div class="modal-b">${body}</div>${foot ? `<div class="modal-f">${foot}</div>` : ''}</div>`;
    w.addEventListener('click', e => { if(e.target===w || e.target.closest('[data-close]')) Modal.close(w); });
    document.body.appendChild(w); document.body.style.overflow = 'hidden';
    const rec = {w, onClose}; this.stack.push(rec);
    onOpen && onOpen(w.querySelector('.modal'));
    return w.querySelector('.modal');
  },
  close(w){
    const i = w ? this.stack.findIndex(r => r.w===w || r.w.contains(w)) : this.stack.length-1; if(i<0) return;
    const [rec] = this.stack.splice(i,1); rec.w.querySelectorAll('.lmap').forEach(el => { try{ el._lmap && el._lmap.kill(); }catch(e){} }); rec.w.remove(); rec.onClose && rec.onClose();
    if(!this.stack.length) document.body.style.overflow = '';
  },
  closeAll(){ while(this.stack.length) this.close(); },
};
function confirmBox({title, text, ok='Confirm', cls='btn-primary'}){
  return new Promise(res => {
    let done = false;
    const m = Modal.open({title, body:`<p class="ink2">${text}</p>`, foot:`<button class="btn btn-ghost" data-close>Cancel</button><button class="btn ${cls}" data-ok>${ok}</button>`, onClose:() => { if(!done) res(false); }});
    m.querySelector('[data-ok]').onclick = () => { done = true; Modal.close(m); res(true); };
  });
}
function copyText(text){
  const ok = () => toast('Copied to clipboard');
  try{ navigator.clipboard.writeText(text).then(ok, () => fallback()); }catch(e){ fallback(); }
  function fallback(){ const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try{ document.execCommand('copy'); ok(); }catch(e){ toast('Copy not available here','err'); } t.remove(); }
}
// Where families and staff get the app (used in the WhatsApp messages with sign-in codes).
// Set CAREVA_CONFIG.appLink (js/config.js) to your Play Store or website link once it is live.
function appLinkInfo(){
  const cfg = (window.CAREVA_CONFIG && CAREVA_CONFIG.appLink) || '';
  const inApp = /CarevaPlusApp/.test(navigator.userAgent) || location.hostname === 'app.carevaplus.com' || location.protocol === 'file:';
  if(cfg) return {open:`Install / open the Careva+ app: ${cfg}`, tip:''};
  if(inApp) return {open:'Install the Careva+ app on your Android phone (the office sends you the app file) and open it', tip:''};
  return {open:`Open ${location.origin}${location.pathname}`, tip:'Install it from your browser menu → "Install app" / "Add to Home Screen".'};
}
const emptyState = (icon, title, sub='') => `<div class="empty"><div class="e-ic">${I(icon,'lg')}</div><div class="b ink2">${title}</div>${sub?`<div class="small mt-s">${sub}</div>`:''}</div>`;
const fmtPhone = p => `+91 ${p}`;
const telLink = (p, label) => `<a class="btn btn-ghost btn-sm" href="tel:+91${String(p).replace(/\s/g,'')}">${I('phone','sm')}${label||fmtPhone(p)}</a>`;

/* ---------------- charts ---------------- */
const ChartReg = {}; let chartSeq = 0;
function chart(cfg, h=200){ const id = 'ch'+(++chartSeq); ChartReg[id] = cfg; return `<div class="chart" data-chart="${id}" style="height:${h}px;width:100%"></div>`; }
function mountCharts(root=document){ $$('[data-chart]', root).forEach(el => { const c = ChartReg[el.dataset.chart]; if(c) el.innerHTML = drawChart(c, el.clientWidth || 600, el.clientHeight || 200); }); }
let _rz; window.addEventListener('resize', () => { clearTimeout(_rz); _rz = setTimeout(() => mountCharts(), 150); });
function smoothPath(pts){ if(pts.length<2) return ''; let d = `M${pts[0][0]},${pts[0][1]}`; for(let i=0;i<pts.length-1;i++){ const p0=pts[i-1]||pts[i], p1=pts[i], p2=pts[i+1], p3=pts[i+2]||p2; const c1=[p1[0]+(p2[0]-p0[0])/6, p1[1]+(p2[1]-p0[1])/6], c2=[p2[0]-(p3[0]-p1[0])/6, p2[1]-(p3[1]-p1[1])/6]; d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`; } return d; }
function drawChart(c, W, H){
  const font = 'font-family="-apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif" font-size="11" font-weight="600"';
  if(c.type==='donut'){
    const tot = sum(c.parts.map(p => p.v)) || 1, r = Math.min(W,H)/2 - 10, cx = W/2, cy = H/2, sw = Math.max(14, r*.28); let acc = 0;
    const segs = c.parts.map(p => { const len = p.v/tot * 2*Math.PI*(r-sw/2); const s = `<circle cx="${cx}" cy="${cy}" r="${r-sw/2}" fill="none" stroke="${p.c}" stroke-width="${sw}" stroke-dasharray="${Math.max(0,len-2)} 9999" stroke-dashoffset="${-acc}" transform="rotate(-90 ${cx} ${cy})"><title>${esc(p.l)}: ${p.v}</title></circle>`; acc += len; return s; }).join('');
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${segs}<text x="${cx}" y="${cy-2}" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif" font-size="${Math.round(r*.36)}" font-weight="800" fill="#0B2F5E">${esc(c.center||tot)}</text><text x="${cx}" y="${cy+16}" text-anchor="middle" ${font} fill="#76869B">${esc(c.centerSub||'')}</text></svg>`;
  }
  const pl = c.yw ?? 40, pr = 10, pt = 14, pb = 26, w = W-pl-pr, h = H-pt-pb;
  const all = c.series.flatMap(s => s.values).filter(v => v!=null);
  let mn = c.min ?? Math.min(...all), mx = c.max ?? Math.max(...all);
  if(c.type==='bar') mn = 0;
  if(mx===mn){ mx += 1; mn -= 1; }
  const span = mx-mn; if(c.min==null && c.type!=='bar') mn -= span*.15; if(c.max==null) mx += span*.12;
  const n = c.labels.length, X = i => c.type==='bar' ? pl + (i+.5)*w/n : pl + (n===1 ? w/2 : i*w/(n-1)), Y = v => pt + h - (v-mn)/(mx-mn)*h;
  let g = '';
  for(let k=0;k<=3;k++){ const v = mn + (mx-mn)*k/3, y = Y(v); g += `<line x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}" stroke="#E9EEF5" stroke-dasharray="${k?'3 4':''}"/><text x="${pl-8}" y="${y+4}" text-anchor="end" ${font} fill="#97A4B6">${c.fmt ? c.fmt(v) : Math.round(v)}</text>`; }
  if(c.band){ g += `<rect x="${pl}" y="${Y(c.band[1])}" width="${w}" height="${Y(c.band[0])-Y(c.band[1])}" fill="#4FA21A" opacity=".07"/>`; }
  const step = Math.ceil(n / Math.max(2, Math.floor(w/56)));
  c.labels.forEach((l,i) => { if(i%step===0 || i===n-1) g += `<text x="${X(i)}" y="${H-7}" text-anchor="middle" ${font} fill="#97A4B6">${esc(l)}</text>`; });
  let body = '';
  if(c.type==='bar'){
    const bw = Math.min(34, w/n*.58);
    c.series.forEach((s,si) => s.values.forEach((v,i) => { const x = X(i) - bw/2 + (c.series.length>1 ? (si-.5)*bw*.55 : 0), y = Y(v), hh = Y(0)-y; const col = s.hl && i===n-1 ? s.hl : s.color; body += `<rect x="${x}" y="${y}" width="${c.series.length>1?bw*.5:bw}" height="${Math.max(0,hh)}" rx="${Math.min(7,bw/3)}" fill="${col}"><title>${esc(c.labels[i])}: ${c.fmt?c.fmt(v):v}</title></rect>`; }));
  } else {
    c.series.forEach((s,si) => {
      const pts = s.values.map((v,i) => v==null || v==='' || isNaN(v) ? null : [X(i), Y(+v)]).filter(Boolean); if(!pts.length) return;
      const d = smoothPath(pts), gid = 'g'+Math.random().toString(36).slice(2,7);
      if(si===0 && !c.noArea && d) body += `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".22"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient></defs><path d="${d} L${pts[pts.length-1][0]},${pt+h} L${pts[0][0]},${pt+h}Z" fill="url(#${gid})"/>`;
      if(d) body += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.6" stroke-linecap="round"/>`;
      pts.forEach((p,i) => { body += `<circle cx="${p[0]}" cy="${p[1]}" r="${i===pts.length-1?4.5:2.6}" fill="${i===pts.length-1?s.color:'#fff'}" stroke="${s.color}" stroke-width="2"><title>${esc(c.labels[i]||'')}: ${s.values[i]}</title></circle>`; });
    });
  }
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${g}${body}</svg>`;
}
function spark(values, color='#2B6DE8'){
  const v = values.filter(x => x!=null); if(v.length<2) return '';
  const mn = Math.min(...v), mx = Math.max(...v), r = mx-mn || 1;
  const pts = v.map((x,i) => [i/(v.length-1)*100, 28 - (x-mn)/r*24]);
  return `<svg viewBox="0 0 100 30" preserveAspectRatio="none"><path d="${smoothPath(pts)}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round"/></svg>`;
}

/* ---------------- map (stylised Salem city map) ---------------- */
const MAPB = { lat0:11.700, lat1:11.625, lng0:78.105, lng1:78.185, W:1000, H:950 };
const UPM = 0.1146; // map units per metre
const proj = (lat,lng) => [ (lng-MAPB.lng0)/(MAPB.lng1-MAPB.lng0)*MAPB.W, (MAPB.lat0-lat)/(MAPB.lat0-MAPB.lat1)*MAPB.H ];
let _baseMap = null;
function baseMap(){
  if(_baseMap) return _baseMap;
  const R = rng(77);
  let s = `<rect x="-2000" y="-2000" width="5000" height="5000" fill="#EDF1F6"/>
  <defs><linearGradient id="hill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D6E6CF"/><stop offset="1" stop-color="#EDF1F6" stop-opacity="0"/></linearGradient></defs>
  <rect x="-2000" y="-2000" width="5000" height="2130" fill="url(#hill)"/>
  <ellipse cx="480" cy="480" rx="420" ry="360" fill="#E8EDF3"/>`;
  for(let i=0;i<5;i++) s += `<path d="M${-50+i*30},${20+i*16} Q 300 ${-10+i*22} 520 ${30+i*14} T 1060 ${10+i*18}" fill="none" stroke="#CFE0C6" stroke-width="1.2" opacity=".8"/>`;
  // parks
  [[430,350,22],[700,300,30],[260,610,26],[610,760,34],[150,200,28],[880,420,24]].forEach(([x,y,r]) => s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#D9ECCF"/>`);
  s += `<ellipse cx="812" cy="127" rx="64" ry="34" fill="#C4DDF6"/><text x="812" y="131" text-anchor="middle" font-size="11" font-weight="700" fill="#6B93BE" font-family="-apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif">Mookaneri Lake</text>`;
  // neighbourhood street patches
  for(const [name,[la,ln]] of Object.entries(AREAS)){
    const [x,y] = proj(la,ln), a = (R()-.5)*50, sz = 60 + R()*40; let g = '';
    for(let k=-3;k<=3;k++){ const o = k*sz/3.2; g += `<line x1="${-sz}" y1="${o}" x2="${sz}" y2="${o}"/><line x1="${o}" y1="${-sz}" x2="${o}" y2="${sz}"/>`; }
    s += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${a.toFixed(0)})" stroke="#FFFFFF" stroke-width="2.4" opacity=".95">${g}</g>`;
  }
  // railway
  s += `<path d="M-40,290 L125,372 L400,520 L700,640 L1040,770" fill="none" stroke="#C3CCD8" stroke-width="3.5" stroke-dasharray="10 7"/>`;
  // river
  s += `<path d="M560,-40 C540,150 520,260 540,380 S600,560 560,700 S520,860 540,1000" fill="none" stroke="#BCD8F5" stroke-width="10" stroke-linecap="round"/>`;
  // roads: [path, highway?]
  const roads = [
    ['M70,-40 C90,250 55,520 150,1000',1], ['M-40,700 Q300,760 500,820 T1040,872',1],
    ['M462,393 L330,300 L180,170 L40,20',0], ['M462,393 L300,380 L125,372 L-40,365',0], ['M462,393 Q420,260 430,120 L440,-40',0],
    ['M462,393 L594,319 Q620,200 650,-40',0], ['M-40,470 L300,455 L520,445 L700,470 L1040,500',0], ['M520,445 L700,520 L831,578 L1040,640',0],
    ['M500,450 L560,560 L640,660 L700,800 L760,1000',0], ['M125,372 L207,443 L240,600 L275,849 L300,1000',0], ['M462,393 L462,494 L487,659 L470,1000',0],
  ];
  roads.forEach(([d,hw]) => s += `<path d="${d}" fill="none" stroke="${hw?'#EFC873':'#D5DEE9'}" stroke-width="${hw?12:9}" stroke-linecap="round" stroke-linejoin="round"/>`);
  roads.forEach(([d,hw]) => s += `<path d="${d}" fill="none" stroke="${hw?'#FCE6AE':'#FFFFFF'}" stroke-width="${hw?8:6}" stroke-linecap="round" stroke-linejoin="round"/>`);
  const shield = (x,y,t) => `<g transform="translate(${x} ${y})"><rect x="-19" y="-10" width="38" height="20" rx="6" fill="#fff" stroke="#E0B455" stroke-width="1.5"/><text y="4" text-anchor="middle" font-size="10.5" font-weight="800" fill="#8A6413" font-family="-apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif">${t}</text></g>`;
  s += shield(78,560,'NH 44') + shield(760,850,'NH 544');
  const lab = `font-family="-apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif" font-size="12.5" font-weight="800" letter-spacing="1.6" fill="#8D9BAE" stroke="#EDF1F6" stroke-width="4" paint-order="stroke" text-anchor="middle"`;
  for(const [name,[la,ln]] of Object.entries(AREAS)){ const [x,y] = proj(la,ln); s += `<text x="${x.toFixed(0)}" y="${(y-34).toFixed(0)}" ${lab}>${name.toUpperCase()}</text>`; }
  s += `<text x="500" y="40" ${lab} fill="#7FA36F" font-size="11">↑ SHEVAROY HILLS · YERCAUD</text>`;
  _baseMap = s; return s;
}
class SvgMap {
  constructor(el, opt={}){
    this.el = el; this.opt = opt; this.markers = new Map(); this.route = null; this.fence = null; this.vb = [0,0,MAPB.W,MAPB.H];
    el.innerHTML = `<svg viewBox="0 0 ${MAPB.W} ${MAPB.H}" preserveAspectRatio="xMidYMid slice">${baseMap()}<g class="m-fence"></g><g class="m-route"></g><g class="m-mk"></g></svg>
      <div class="map-ctrl"><button data-z="in" aria-label="Zoom in">+</button><button data-z="out" aria-label="Zoom out">−</button><button data-z="fit" aria-label="Recenter">${I('locate','sm')}</button></div>`;
    this.svg = el.querySelector('svg');
    el.querySelector('.map-ctrl').addEventListener('click', e => { const b = e.target.closest('[data-z]'); if(!b) return; e.stopPropagation(); b.dataset.z==='fit' ? this.fit() : this.zoom(b.dataset.z==='in' ? .7 : 1.45); });
    let drag = null;
    this.svg.addEventListener('pointerdown', e => { drag = {x:e.clientX, y:e.clientY, vb:[...this.vb]}; try{ this.svg.setPointerCapture(e.pointerId); }catch(_){} });
    this.svg.addEventListener('pointermove', e => { if(!drag) return; const k = this.vb[2]/(this.el.clientWidth||1); this.vb[0] = drag.vb[0] - (e.clientX-drag.x)*k; this.vb[1] = drag.vb[1] - (e.clientY-drag.y)*k; this.apply(false); });
    const end = () => { drag = null; }; this.svg.addEventListener('pointerup', end); this.svg.addEventListener('pointercancel', end);
    this.svg.addEventListener('wheel', e => { e.preventDefault(); this.zoom(e.deltaY < 0 ? .85 : 1.18); }, {passive:false});
    el.addEventListener('click', e => { const g = e.target.closest('[data-mkclick]'); if(g && this.opt.onClick) this.opt.onClick(g.dataset.mkclick); });
  }
  center(){ const [x,y,w,h] = this.vb, cx = x+w/2, cy = y+h/2; return {lat:MAPB.lat0 - cy/MAPB.H*(MAPB.lat0-MAPB.lat1), lng:MAPB.lng0 + cx/MAPB.W*(MAPB.lng1-MAPB.lng0)}; }
  aspect(){ return (this.el.clientHeight||300)/(this.el.clientWidth||400); }
  k(){ return this.vb[2]/(this.el.clientWidth||400); }
  apply(re=true){ this.svg.setAttribute('viewBox', this.vb.map(n => n.toFixed(1)).join(' ')); if(re) this.draw(); }
  zoom(f){ const [x,y,w,h] = this.vb, cx = x+w/2, cy = y+h/2, nw = clamp(w*f, 120, 2200), nh = nw*this.aspect(); this.vb = [cx-nw/2, cy-nh/2, nw, nh]; this.apply(); }
  fit(points, minSpan=this.opt.minSpan||320){
    const pts = points || [...this.markers.values()].filter(m => !m.noFit).map(m => [m.lat,m.lng]).concat(this.route||[]);
    this._fitPts = pts;
    if(!pts.length){ this.vb = [0,0,MAPB.W,MAPB.W*this.aspect()]; return this.apply(); }
    const xy = pts.map(([a,b]) => proj(a,b)); let x0 = Math.min(...xy.map(p=>p[0])), x1 = Math.max(...xy.map(p=>p[0])), y0 = Math.min(...xy.map(p=>p[1])), y1 = Math.max(...xy.map(p=>p[1]));
    const cx = (x0+x1)/2, cy = (y0+y1)/2, asp = this.aspect();
    let w = Math.max(x1-x0, minSpan) * 1.35, h = Math.max(y1-y0, minSpan*asp) * 1.35 + 60;
    if(h/w > asp) w = h/asp; else h = w*asp;
    this.vb = [cx-w/2, cy-h/2 - (pts.length>1 ? 10 : 0), w, h]; this.apply();
  }
  set(id, m){ this.markers.set(id, {...(this.markers.get(id)||{}), ...m}); }
  remove(id){ this.markers.delete(id); }
  move(id, lat, lng, acc){ const m = this.markers.get(id); if(!m) return; m.lat = lat; m.lng = lng; if(acc!=null) m.acc = acc; const g = this.svg.querySelector(`[data-mk="${id}"]`); if(g){ const [x,y] = proj(lat,lng); g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${this.k().toFixed(3)})`); if(m.type==='me'){ const halo = g.querySelector('.acc'); if(halo) halo.setAttribute('r', Math.max(14, (m.acc||10)*UPM/this.k())); } } else this.draw(); }
  setRoute(pts, color='#2B6DE8'){ this.route = pts; this.routeColor = color; }
  setFence(lat, lng, r){ this.fence = lat==null ? null : {lat,lng,r}; }
  draw(){
    const k = this.k();
    const fence = this.svg.querySelector('.m-fence'), route = this.svg.querySelector('.m-route'), mk = this.svg.querySelector('.m-mk');
    if(this.fence){ const [x,y] = proj(this.fence.lat, this.fence.lng); fence.innerHTML = `<circle cx="${x}" cy="${y}" r="${this.fence.r*UPM}" fill="#4FA21A" fill-opacity=".12" stroke="#4FA21A" stroke-width="${1.6*k}" stroke-dasharray="${5*k} ${4*k}"/>`; } else fence.innerHTML = '';
    if(this.route && this.route.length>1){ const d = this.route.map(([a,b],i) => { const [x,y] = proj(a,b); return `${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`; }).join(' '); route.innerHTML = `<path d="${d}" fill="none" stroke="#fff" stroke-width="${9*k}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${this.routeColor}" stroke-width="${5*k}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${this.opt.solidRoute?'none':`${1*k} ${9*k}`}"/>`; } else route.innerHTML = '';
    const order = {home:0, office:1, stop:1, staff:2, me:3};
    mk.innerHTML = [...this.markers.entries()].sort((a,b) => (order[a[1].type]||0)-(order[b[1].type]||0)).map(([id,m]) => {
      const [x,y] = proj(m.lat, m.lng); let g = '';
      const label = m.label ? `<text y="${m.type==='home'||m.type==='stop'?16:34}" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif" font-size="11.5" font-weight="800" fill="#0B2F5E" stroke="#fff" stroke-width="4" paint-order="stroke">${esc(m.label)}</text>` : '';
      if(m.type==='staff') g = `${m.live?`<circle r="26" fill="${m.color}" class="mk-pulse"/>`:''}<circle r="17" fill="${m.color}" stroke="#fff" stroke-width="3.5"/><text y="4.3" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif" font-size="11.5" font-weight="800" fill="#fff">${esc(m.text||'')}</text>`;
      else if(m.type==='me') g = `<circle class="acc" r="${Math.max(14,(m.acc||10)*UPM/k)}" fill="#2B6DE8" fill-opacity=".14" stroke="#2B6DE8" stroke-opacity=".3"/><circle r="26" fill="#2B6DE8" class="mk-pulse"/><circle r="10" fill="#2B6DE8" stroke="#fff" stroke-width="3.5"/>`;
      else if(m.type==='office') g = `<rect x="-15" y="-15" width="30" height="30" rx="9" fill="#0B2F5E" stroke="#fff" stroke-width="3"/><path d="M0-8v16M-8 0h16" stroke="#7CD13B" stroke-width="4.5" stroke-linecap="round"/>`;
      else if(m.type==='stop') g = `<path d="M0 0C-5-8-15-13-15-25a15 15 0 1 1 30 0C15-13 5-8 0 0Z" fill="${m.color||'#0B2F5E'}" stroke="#fff" stroke-width="2.5"/><text y="-20.5" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif" font-size="12.5" font-weight="800" fill="#fff">${esc(m.text||'')}</text>`;
      else g = `<path d="M0 0C-5-8-15-13-15-25a15 15 0 1 1 30 0C15-13 5-8 0 0Z" fill="${m.color||'#0B2F5E'}" stroke="#fff" stroke-width="2.5"/><path d="M-6.5-23.5 0-29l6.5 5.5M-4.8-24.5v6h9.6v-6" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      return `<g data-mk="${esc(id)}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(3)})" ${m.click?`style="cursor:pointer" data-mkclick="${esc(id)}"`:''}>${g}${label}</g>`;
    }).join('');
  }
}
function pointOnPath(path, t){
  const seg = []; let tot = 0; for(let i=0;i<path.length-1;i++){ const d = haversine({lat:path[i][0],lng:path[i][1]},{lat:path[i+1][0],lng:path[i+1][1]}); seg.push(d); tot += d; }
  let need = clamp(t,0,1)*tot; for(let i=0;i<seg.length;i++){ if(need <= seg[i] || i===seg.length-1){ const f = seg[i] ? clamp(need/seg[i],0,1) : 1; return {lat:lerp(path[i][0],path[i+1][0],f), lng:lerp(path[i][1],path[i+1][1],f), total:tot, left:tot*(1-clamp(t,0,1))}; } need -= seg[i]; }
  const l = path[path.length-1]; return {lat:l[0], lng:l[1], total:tot, left:0};
}
/* ---------------- real street map (Leaflet + OpenStreetMap) ---------------- */
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
const PIN_SVG = (fill, inner) => `<svg viewBox="-17 -44 34 46" width="34" height="46"><path d="M0 0C-5-8-15-13-15-25a15 15 0 1 1 30 0C15-13 5-8 0 0Z" fill="${fill}" stroke="#fff" stroke-width="2.5"/>${inner}</svg>`;
const HOUSE = '<path d="M-6.5-23.5 0-29l6.5 5.5M-4.8-24.5v6h9.6v-6" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
class LeafletMap {
  constructor(el, opt={}){
    this.el = el; this.opt = opt; this.markers = new Map(); this.layers = new Map(); this.route = null; this.fence = null; this._fitPts = null;
    el.innerHTML = ''; el.classList.add('lmap'); el._lmap = this;
    this.map = L.map(el, {zoomControl:false, attributionControl:true, preferCanvas:false}).setView([OFFICE.lat, OFFICE.lng], 13);
    L.tileLayer(TILE_URL, {maxZoom:19, attribution:TILE_ATTR, crossOrigin:true}).addTo(this.map);
    this.map.attributionControl.setPrefix('');
    L.control.zoom({position:'topright'}).addTo(this.map);
    const self = this;
    const Fit = L.Control.extend({ onAdd(){ const b = L.DomUtil.create('button', 'lmap-btn'); b.type = 'button'; b.title = 'Recenter'; b.innerHTML = I('locate','sm'); L.DomEvent.disableClickPropagation(b); L.DomEvent.on(b, 'click', e => { L.DomEvent.stop(e); self.fit(self._fitPts); }); return b; } });
    new Fit({position:'topright'}).addTo(this.map);
    this.fenceLayer = L.layerGroup().addTo(this.map); this.routeLayer = L.layerGroup().addTo(this.map);
    this.dead = false; const alive = () => !this.dead && document.body.contains(el);
    const ro = window.ResizeObserver ? new ResizeObserver(() => { if(alive()) try{ this.map.invalidateSize({animate:false}); }catch(e){} }) : null; if(ro) ro.observe(el);
    setTimeout(() => { if(!alive()) return; try{ this.map.invalidateSize({animate:false}); if(this._fitPts) this.fit(this._fitPts, this._minSpan); }catch(e){} }, 80);
    const kill = () => { if(this.dead) return; this.dead = true; try{ ro && ro.disconnect(); this.map.stop(); this.map.remove(); }catch(e){} };
    this.kill = kill;
    if(typeof App !== 'undefined' && !el.closest('.modal-wrap')) App.onCleanup(kill);
  }
  iconFor(id, m){
    const click = m.click ? `data-mkclick="${esc(id)}"` : '';
    const label = m.label ? `<div class="mk-label">${esc(m.label)}</div>` : '';
    if(m.type==='staff') return L.divIcon({className:'mk', iconSize:[36,36], iconAnchor:[18,18], html:`<div class="mk-staff ${m.live?'live':''}" style="--c:${m.color||'#2B6DE8'}" ${click}><span>${esc(m.text||'')}</span></div>${label}`});
    if(m.type==='me') return L.divIcon({className:'mk', iconSize:[22,22], iconAnchor:[11,11], html:`<div class="mk-me" ${click}></div>`});
    if(m.type==='office') return L.divIcon({className:'mk', iconSize:[30,30], iconAnchor:[15,15], html:`<div class="mk-office" ${click}><i></i></div>${label}`});
    const inner = m.type==='stop' ? `<text y="-20.5" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif" font-size="12.5" font-weight="800" fill="#fff">${esc(m.text||'')}</text>` : HOUSE;
    return L.divIcon({className:'mk', iconSize:[34,46], iconAnchor:[17,44], html:`<div class="mk-pin" ${click}>${PIN_SVG(m.color||'#0B2F5E', inner)}</div>${label}`});
  }
  set(id, m){ const prev = this.markers.get(id) || {}; this.markers.set(id, {...prev, ...m}); }
  remove(id){ this.markers.delete(id); const l = this.layers.get(id); if(l){ l.marker.remove(); l.acc && l.acc.remove(); this.layers.delete(id); } }
  move(id, lat, lng, acc){ if(this.dead) return; const m = this.markers.get(id); if(!m) return; m.lat = lat; m.lng = lng; if(acc!=null) m.acc = acc; const l = this.layers.get(id); if(l){ l.marker.setLatLng([lat,lng]); if(l.acc){ l.acc.setLatLng([lat,lng]); l.acc.setRadius(Math.max(5, m.acc||10)); } } else this.draw(); }
  setRoute(pts, color='#2B6DE8'){ this.route = pts && pts.length>1 ? pts : null; this.routeColor = color; }
  setFence(lat, lng, r){ this.fence = lat==null ? null : {lat, lng, r}; }
  draw(){
    if(this.dead) return;
    for(const [id, l] of this.layers){ if(!this.markers.has(id)){ l.marker.remove(); l.acc && l.acc.remove(); this.layers.delete(id); } }
    for(const [id, m] of this.markers){
      if(m.lat==null || m.lng==null) continue;
      const sig = [m.type, m.color, m.text, m.label, m.live, m.click].join('|'); let l = this.layers.get(id);
      if(l && l.sig !== sig){ l.marker.remove(); l.acc && l.acc.remove(); l = null; this.layers.delete(id); }
      if(!l){
        const z = {home:200, stop:300, office:300, staff:600, me:800}[m.type] || 100;
        const marker = L.marker([m.lat, m.lng], {icon:this.iconFor(id, m), zIndexOffset:z, keyboard:false}).addTo(this.map);
        if(m.click && this.opt.onClick) marker.on('click', () => this.opt.onClick(id));
        const acc = m.type==='me' ? L.circle([m.lat, m.lng], {radius:Math.max(5, m.acc||10), color:'#2B6DE8', weight:1, opacity:.35, fillOpacity:.12, interactive:false}).addTo(this.map) : null;
        this.layers.set(id, {marker, acc, sig});
      } else { l.marker.setLatLng([m.lat, m.lng]); if(l.acc){ l.acc.setLatLng([m.lat, m.lng]); l.acc.setRadius(Math.max(5, m.acc||10)); } }
    }
    this.fenceLayer.clearLayers();
    if(this.fence) L.circle([this.fence.lat, this.fence.lng], {radius:this.fence.r, color:'#4FA21A', weight:2, dashArray:'6 5', fillColor:'#4FA21A', fillOpacity:.1, interactive:false}).addTo(this.fenceLayer);
    this.drawRoute();
  }
  drawRoute(){
    this.routeLayer.clearLayers(); if(!this.route) return;
    const pts = this.route, color = this.routeColor, key = pts.map(p => p[0].toFixed(4)+','+p[1].toFixed(4)).join(';'); this._routeKey = key;
    const cached = Route.peek(pts);
    const paint = line => { this.routeLayer.clearLayers(); L.polyline(line, {color:'#fff', weight:8, opacity:.9, interactive:false}).addTo(this.routeLayer); L.polyline(line, {color, weight:4.5, opacity:.95, dashArray:cached||this._road ? null : '2 9', lineCap:'round', interactive:false}).addTo(this.routeLayer); };
    if(cached){ this._road = true; paint(cached.pts); return; }
    this._road = false; paint(pts);
    if(this.opt.road !== false) Route.road(pts).then(r => { if(r && this._routeKey === key && this.route){ this._road = true; paint(r.pts); if(this.opt.onRoute) this.opt.onRoute(r); } });
  }
  fit(points, minSpan){
    this.draw();
    const pts = (points || [...this.markers.values()].filter(m => !m.noFit && m.lat!=null).map(m => [m.lat, m.lng]).concat(this.route||[])).filter(p => p && isFinite(p[0]) && isFinite(p[1]));
    this._fitPts = points || null; this._minSpan = minSpan;
    if(this.dead) return;
    if(!pts.length) return this.map.setView([OFFICE.lat, OFFICE.lng], 13, {animate:false});
    if(pts.length===1) return this.map.setView(pts[0], (minSpan||this.opt.minSpan||300) < 200 ? 17 : 16, {animate:false});
    this.map.fitBounds(L.latLngBounds(pts), {padding:[46,46], maxZoom:17, animate:false});
  }
}
const useRealMap = () => !!(window.L && L.map) && typeof Cloud !== 'undefined' && Cloud.mode === 'supabase';
class LiveMap { constructor(el, opt){ return useRealMap() ? new LeafletMap(el, opt) : new SvgMap(el, opt); } }

/* road routes (OSRM) and address search (Nominatim) — both OpenStreetMap-based, with graceful fallback */
const Route = {
  cache:new Map(),
  key(pts){ return pts.map(p => (+p[0]).toFixed(3)+','+(+p[1]).toFixed(3)).join(';'); },
  peek(pts){ return this.cache.get(this.key(pts)) || null; },
  async road(pts){
    if(!pts || pts.length<2 || pts.length>15) return null;
    const k = this.key(pts); if(this.cache.has(k)) return this.cache.get(k);
    const ctl = window.AbortController ? new AbortController() : null, t = setTimeout(() => ctl && ctl.abort(), 7000);
    try{
      const coords = pts.map(p => `${(+p[1]).toFixed(6)},${(+p[0]).toFixed(6)}`).join(';');
      const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`, ctl ? {signal:ctl.signal} : {});
      const j = await r.json(); if(j.code!=='Ok' || !j.routes || !j.routes[0]) return null;
      const g = j.routes[0], out = {pts:g.geometry.coordinates.map(c => [c[1], c[0]]), m:g.distance, s:g.duration};
      this.cache.set(k, out); return out;
    }catch(e){ return null; } finally { clearTimeout(t); }
  },
};
const Geo = {
  async search(q){ const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=in&q=${encodeURIComponent(q)}`, {headers:{'Accept-Language':'en'}}); const j = await r.json(); return j.map(x => ({lat:+x.lat, lng:+x.lon, name:x.display_name})); },
  async reverse(lat, lng){ try{ const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`, {headers:{'Accept-Language':'en'}}); const j = await r.json(); return j.display_name || ''; }catch(e){ return ''; } },
};
const mapsLink = (lat,lng) => `https://www.google.com/maps/dir/?api=1&destination=${(+lat).toFixed(6)},${(+lng).toFixed(6)}&travelmode=driving`;

/* pick a precise location (patient home, office) on the map */
function pickLocation({lat, lng, title='Set location', sub='Move the map so the pin sits on the front door'}={}){
  return new Promise(resolve => {
    let done = false, cur = {lat:lat ?? OFFICE.lat, lng:lng ?? OFFICE.lng};
    const hasMap = useRealMap();
    const m = Modal.open({title, sub, wide:true, body:`
      <form class="row" style="gap:8px" id="pk-f"><input class="input" id="pk-q" placeholder="Search street, area or landmark"><button class="btn btn-ghost" type="submit">${I('search','sm')}</button></form>
      <div id="pk-res" class="list"></div>
      ${hasMap ? '' : `<div class="chips scroll mt">${Object.keys(AREAS).map(a => `<button class="chip" type="button" data-area="${a}" style="height:32px">${a}</button>`).join('')}</div>`}
      <div class="map mt" id="pk-map" style="height:min(52vh,380px)"><div class="pk-pin">${PIN_SVG('#E1343A', HOUSE)}</div></div>
      <div class="row between mt wrap" style="gap:8px"><button class="btn btn-soft btn-sm" id="pk-me" type="button">${I('locate','sm')} Use my current location</button><span class="tiny muted tnum" id="pk-ll">${cur.lat.toFixed(6)}, ${cur.lng.toFixed(6)}</span></div>`,
      foot:`<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="pk-ok">${I('check','sm')} Use this location</button>`,
      onClose:() => { if(!done) resolve(null); }});
    let map = null, svgMap = null;
    const show = () => { const t = $('#pk-ll', m); if(t) t.textContent = `${cur.lat.toFixed(6)}, ${cur.lng.toFixed(6)}`; };
    if(!hasMap){
      const el = $('#pk-map', m), pin = el.querySelector('.pk-pin');
      svgMap = new SvgMap(el, {minSpan:120}); el.appendChild(pin); setTimeout(() => { svgMap.fit([[cur.lat, cur.lng]], 140); cur = svgMap.center(); show(); }, 60);
      const upd = () => { cur = svgMap.center(); show(); };
      el.addEventListener('pointermove', upd); el.addEventListener('pointerup', upd); el.addEventListener('click', upd); el.addEventListener('wheel', () => setTimeout(upd, 0));
      m.addEventListener('click', e => { const b = e.target.closest('[data-area]'); if(!b) return; const [la, ln] = AREAS[b.dataset.area]; svgMap.fit([[la, ln]], 140); cur = svgMap.center(); show(); });
    }
    if(hasMap){
      const el = $('#pk-map', m), pin = el.querySelector('.pk-pin');
      map = L.map(el, {zoomControl:true}).setView([cur.lat, cur.lng], lat!=null ? 18 : 14);
      L.tileLayer(TILE_URL, {maxZoom:19, attribution:TILE_ATTR}).addTo(map); map.attributionControl.setPrefix('');
      el.appendChild(pin);
      map.on('move', () => { if(!map) return; const c = map.getCenter(); cur = {lat:c.lat, lng:c.lng}; show(); });
      setTimeout(() => { try{ map && map.invalidateSize({animate:false}); }catch(e){} }, 120);
    }
    const goTo = (la, ln, z=18) => { cur = {lat:la, lng:ln}; if(map) map.setView([la, ln], z, {animate:false}); else if(svgMap) svgMap.fit([[la, ln]], 140); show(); };
    $('#pk-f', m).onsubmit = async e => { e.preventDefault(); const q = $('#pk-q', m).value.trim(); if(!q) return; const box = $('#pk-res', m); box.innerHTML = `<div class="small muted" style="padding:8px">Searching…</div>`;
      try{ const res = await Geo.search(q); box.innerHTML = res.length ? res.map((r,i) => `<div class="li click" data-i="${i}"><div class="li-ic bg-blue" style="width:32px;height:32px">${I('pin','sm')}</div><div class="grow small">${esc(r.name)}</div></div>`).join('') : `<div class="small muted" style="padding:8px">No results — try a nearby landmark.</div>`;
        box.onclick = ev => { const it = ev.target.closest('[data-i]'); if(!it) return; const r = res[+it.dataset.i]; goTo(r.lat, r.lng, 17); box.innerHTML = ''; };
      }catch(err){ box.innerHTML = `<div class="small muted" style="padding:8px">Search needs an internet connection.</div>`; } };
    $('#pk-me', m).onclick = async e => { const b = e.currentTarget; b.disabled = true; try{ const p = await GPS.request(12000); goTo(p.coords.latitude, p.coords.longitude, 18); toast(`Location found · ±${Math.round(p.coords.accuracy)} m`); }catch(err){ toast(err && err.code===1 ? 'Location permission is blocked on this device' : 'Could not get a GPS fix','err'); } b.disabled = false; };
    $('#pk-ok', m).onclick = async () => { if(svgMap) cur = svgMap.center(); if(!isFinite(cur.lat) || !isFinite(cur.lng)) return toast('Invalid location','err'); done = true; const addr = await Promise.race([Geo.reverse(cur.lat, cur.lng), new Promise(r => setTimeout(() => r(''), 2500))]); try{ map && (map.stop(), map.remove()); }catch(e){} map = null; Modal.close(m); resolve({...cur, addr}); };
  });
}

/* ---------------- GPS (real phone location) ---------------- */
const GPS = {
  pos:null, watchId:null, subs:new Set(), err:null, staffId:null,
  sub(fn){ this.subs.add(fn); return () => this.subs.delete(fn); },
  emit(){ this.subs.forEach(f => { try{ f(this.pos); }catch(e){ console.error(e); } }); },
  set(lat, lng, acc){ this.pos = {lat, lng, acc:Math.round(acc||0), ts:Date.now(), mode:'live'}; this.err = null; this.emit(); },
  supported(){ return 'geolocation' in navigator; },
  request(timeout=10000){
    return new Promise((res, rej) => {
      if(!this.supported()) return rej(Object.assign(new Error('This device does not support GPS'), {code:2}));
      let done = false; const t = setTimeout(() => { if(!done){ done = true; rej(Object.assign(new Error('Location request timed out'), {code:3})); } }, timeout+1500);
      try{ navigator.geolocation.getCurrentPosition(p => { if(done) return; done = true; clearTimeout(t); res(p); }, e => { if(done) return; done = true; clearTimeout(t); rej(e); }, {enableHighAccuracy:true, timeout, maximumAge:0}); }
      catch(e){ done = true; clearTimeout(t); rej(e); }
    });
  },
  start(){
    if(this.watchId!=null || !this.supported()) return;
    try{ this.watchId = navigator.geolocation.watchPosition(p => this.set(p.coords.latitude, p.coords.longitude, p.coords.accuracy), e => { this.err = e; this.emit(); }, {enableHighAccuracy:true, maximumAge:5000, timeout:30000}); }
    catch(e){ this.err = e; }
  },
  stop(){ if(this.watchId!=null){ try{ navigator.geolocation.clearWatch(this.watchId); }catch(e){} } this.watchId = null; this.pos = null; this.err = null; this.staffId = null; this.test = false; },
};
const Wake = {
  want:false, lock:null,
  async on(){ this.want = true; try{ if(navigator.wakeLock && !this.lock){ this.lock = await navigator.wakeLock.request('screen'); this.lock.addEventListener('release', () => { this.lock = null; }); } }catch(e){} },
  off(){ this.want = false; try{ this.lock && this.lock.release(); }catch(e){} this.lock = null; },
};
document.addEventListener('visibilitychange', () => { if(document.visibilityState==='visible' && Wake.want) Wake.on(); });

/* ---------------- stored files (documents, photos) ---------------- */
const BLANK_IMG = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
const fileSrc = f => typeof f === 'string' ? f : (f && f.path) || '';
const fileImg = (f, cls='') => { const s = fileSrc(f); return s.startsWith('data:') ? `<img src="${s}" class="${cls}" alt="">` : `<img data-file="${esc(s)}" src="${BLANK_IMG}" class="${cls}" alt="">`; };
async function hydrateFiles(root=document){ for(const img of $$('img[data-file]', root)){ if(img.dataset.done) continue; img.dataset.done = '1'; try{ img.src = await Cloud.fileUrl(img.dataset.file); }catch(e){} } }
async function openFile(path){ try{ const url = await Cloud.fileUrl(path); if(!url) throw 0; const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); }catch(e){ toast('Could not open the file','err'); } }

/* ---------------- signature pad ---------------- */
function sigPad(canvas, onEnd){
  const ctx = canvas.getContext('2d'); let drawing = false, empty = true, last = null;
  const style = () => { ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0B2F5E'; };
  const fit = () => { const r = canvas.getBoundingClientRect(), d = window.devicePixelRatio||1; canvas.width = r.width*d; canvas.height = r.height*d; ctx.setTransform(d,0,0,d,0,0); style(); };
  fit();
  const pos = e => { const r = canvas.getBoundingClientRect(); return [e.clientX-r.left, e.clientY-r.top]; };
  canvas.addEventListener('pointerdown', e => { drawing = true; last = pos(e); try{ canvas.setPointerCapture(e.pointerId); }catch(_){} });
  canvas.addEventListener('pointermove', e => { if(!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(...last); ctx.lineTo(...p); ctx.stroke(); last = p; empty = false; });
  const end = () => { if(drawing && !empty && onEnd) onEnd(canvas.toDataURL('image/png')); drawing = false; }; canvas.addEventListener('pointerup', end); canvas.addEventListener('pointerleave', end);
  return {
    clear(){ ctx.clearRect(0,0,canvas.width,canvas.height); empty = true; onEnd && onEnd(null); },
    isEmpty:() => empty, data:() => canvas.toDataURL('image/png'),
    load(src){ const img = new Image(); img.onload = () => { const r = canvas.getBoundingClientRect(); ctx.drawImage(img, 0, 0, r.width, r.height); empty = false; }; img.src = src; },
  };
}
function dataUrlBlob(u){ const [h, b] = u.split(','), mime = (h.match(/:(.*?);/)||[])[1] || 'application/octet-stream', bin = atob(b), arr = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i); return new Blob([arr], {type:mime}); }
