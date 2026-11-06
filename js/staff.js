'use strict';
/* =========================================================
   CARE STAFF PORTAL — GPS, geofenced EVV clock-in/out
   ========================================================= */
const SU = () => stf(App.uid);
const sToday = () => S().visits.filter(v => v.sid===App.uid && v.date===TODAY() && v.status!=='cancelled').sort(byTime);
const sNext = () => sToday().find(v => ['enroute','inprogress'].includes(v.status)) || sToday().find(v => v.status==='scheduled');
const fence = () => S().settings.geofence;
const myPos = () => GPS.pos && (GPS.test || Date.now() - GPS.pos.ts < 3*60e3) ? GPS.pos : null;
const distTo = p => { const q = myPos(); return q && p ? haversine(q, p) : Infinity; };
const shift = () => (S().shifts[App.uid] ||= {on:false, km:0});

const Staff = {
  maps:[], unsub:null, last:null, lastUp:0, lastTrail:0, sigDrafts:{},
  hook(){ if(this.unsub) this.unsub(); this.last = null; this.unsub = GPS.sub(pos => this.onGps(pos)); },
  start(id){ GPS.staffId = id; this.hook(); GPS.start(); if(shift().on) Wake.on(); },
  onGps(pos){
    if(App.portal!=='staff') return;
    const chip = $('#gps-chip'); if(chip) chip.outerHTML = gpsChip();
    if(!pos) { const f = $('#fence'); if(f) paintFence(f); return; }
    const sh = shift(), now = Date.now();
    if(sh.on && this.last){ const d = haversine(this.last, pos); if(d > 15 && d < 3000 && (pos.acc||0) < 80) sh.km = +((sh.km||0) + d/1000).toFixed(3); }
    if(!this.last || haversine(this.last, pos) > 15) this.last = {lat:pos.lat, lng:pos.lng};
    // share live location with the office (and the patient while en route): every 15 s or 25 m
    const g = S().gps[App.uid];
    const travelling = sToday().some(v => v.status==='enroute');
    if(sh.on || travelling){
      if(!g || now - (g.ts||0) > 15000 || haversine(g, pos) > 25){ S().gps[App.uid] = {lat:pos.lat, lng:pos.lng, acc:pos.acc, ts:now, on:!!sh.on}; Store.save(); }
      if(now - this.lastTrail > 60000){ this.lastTrail = now; Cloud.trail({staff_id:App.uid, lat:pos.lat, lng:pos.lng, acc:pos.acc}); }
    }
    $$('[data-dist]').forEach(el => { const [a,b] = el.dataset.dist.split(',').map(Number); const d = haversine(pos,{lat:a,lng:b}); el.textContent = el.dataset.fmt==='eta' ? `${etaMin(d*1.3)} min` : fmtDist(d); });
    const f = $('#fence'); if(f) paintFence(f);
    const km = $('#shift-km'); if(km) km.textContent = (sh.km||0).toFixed(1);
    this.maps.forEach(m => { if(m.markers.has('me')) m.move('me', pos.lat, pos.lng, pos.acc); else { m.set('me', {type:'me', lat:pos.lat, lng:pos.lng, acc:pos.acc}); m.draw(); } });
  },
};
function gpsChip(){
  const p = myPos();
  if(p) return `<button class="gps-chip ${GPS.test?'demo':'live'}" id="gps-chip" data-act="gpsInfo"><span class="d"></span>${GPS.test?'Test GPS (preview)':`GPS live · ±${p.acc} m`}</button>`;
  const denied = GPS.err && GPS.err.code===1;
  return `<button class="gps-chip ${denied?'off':''}" id="gps-chip" data-act="gpsInfo"><span class="d"></span>${denied?'Location blocked':'Finding GPS…'}</button>`;
}
function paintFence(f){
  const lat = +f.dataset.lat, lng = +f.dataset.lng, q = myPos(), d = distTo({lat,lng}), inside = d <= fence(), v = visit(f.dataset.v);
  f.className = `fence ${inside?'in':'out'}`;
  f.innerHTML = !q ? `<div class="f-ic bg-amber">${I('locate','lg')}</div><div class="grow"><div class="b" style="font-size:16px;color:var(--navy)">Waiting for your GPS…</div><div class="small muted">${GPS.err && GPS.err.code===1 ? 'Location is blocked — tap the GPS chip above for help.' : 'Keep the app open with Location switched on.'}</div></div>`
    : `<div class="f-ic ${inside?'bg-green':'bg-blue'}">${I(inside?'shield':'locate','lg')}</div><div class="grow"><div class="b" style="font-size:16px;color:${inside?'var(--green)':'var(--navy)'}">${inside?'You are at the patient’s home':`${fmtDist(d)} from patient’s home`}</div><div class="small muted">${inside?`Inside the ${fence()} m geofence · ±${q.acc||0} m accuracy`:`Clock-in unlocks within ${fence()} m of the home`}</div></div>`;
  const b = $('#clock-in'); if(b){ b.disabled = !inside; b.innerHTML = inside ? `${I('locate','lg')} Clock in · GPS verified` : `${I('lock','lg')} Clock in (get within ${fence()} m)`; }
  if(v && v.status==='enroute' && inside && !v.arrivedAt){ v.arrivedAt = Date.now(); Store.save(); }
}

PORTALS.staff = {
  label:'Care Staff App', icon:'nav', home:'today',
  init(){ Staff.start(App.uid); },
  exit(){ GPS.stop(); Wake.off(); if(Staff.unsub) Staff.unsub(); Staff.unsub = null; },
  user(){ const s = SU(); return {name:s.name, sub:`${s.role} · ${s.id}`, color:s.color}; },
  nav(){ return [{id:'today',label:'Today',icon:'home'},{id:'route',label:'Route map',icon:'map',tab:'Route'},{id:'schedule',label:'My schedule',icon:'calendar',tab:'Schedule'},{id:'patients',label:'My patients',icon:'users'},{id:'timesheet',label:'Timesheet & mileage',icon:'clock',tab:'Timesheet'},{id:'smsg',label:'Messages',icon:'chat',badge:Unread.count(threadsS(), App.uid)||''},{id:'profile',label:'Profile & credentials',icon:'user'}]; },
  tabs:['today','route','schedule','timesheet','more'],
  navOf(v){ return v==='visit' ? 'today' : v==='spatient' ? 'patients' : v; },
  title(v, prm){ const s = SU(); if(v==='spatient'){ const p = pat(prm.id); return p ? {t:p.name, s:`${p.id}${p.area?' · '+p.area:''}`} : {t:'Patient', s:''}; } if(v==='visit'){ const x = visit(prm.id); return x ? {t:pat(x.pid).name, s:`${svc(x.service).name} · ${fmtT(x.start)}`} : {t:'Visit', s:''}; } const m = {today:[`${greet()}, ${first(s.name)}`, fmtD(TODAY(),{weekday:'long',day:'numeric',month:'long'})], route:['Route map','Today’s stops'], schedule:['My schedule','Next 7 days'], timesheet:['Timesheet & mileage','This week'], smsg:['Messages','Office & patients'], patients:['My patients','Vitals, notes & details'], profile:['Profile','Credentials & training']}[v]; return {t:m[0], s:m[1]}; },
  actions(){ return `${gpsChip()}<button class="icon-btn" data-go="smsg" aria-label="Messages">${I('chat')}${nbadge(Unread.count(threadsS(), App.uid))}</button>`; },
  fab(v){ return v==='visit' ? '' : `<button class="sos-fab" data-act="staffSOS" aria-label="Staff safety SOS">SOS</button>`; },
  views:{}, after:{},
};
const SV = PORTALS.staff.views, SA = PORTALS.staff.after;
const regMap = m => { Staff.maps.push(m); App.onCleanup(() => { Staff.maps = Staff.maps.filter(x => x!==m); }); return m; };

/* ---------------- GPS info / SOS ---------------- */
ACT.gpsInfo = () => {
  const p = myPos(), denied = GPS.err && GPS.err.code===1;
  Modal.open({title:'GPS & location', sub:'Used for Electronic Visit Verification while you’re on shift', body:`
    ${p ? `<div class="evv"><div><span>Status</span><b style="color:var(--green)">Live</b></div><div><span>Accuracy</span><b>±${p.acc} m</b></div><div><span>Updated</span><b>${timeAgo(p.ts)}</b></div></div>
      <div class="kv mt"><dt>Latitude</dt><dd class="tnum">${p.lat.toFixed(6)}</dd><dt>Longitude</dt><dd class="tnum">${p.lng.toFixed(6)}</dd><dt>Geofence radius</dt><dd>${fence()} m</dd><dt>Shift distance</dt><dd>${(shift().km||0).toFixed(1)} km</dd></div>
      <div class="hint green mt">${I('check','sm')}<span>Live GPS connected. Keep Careva+ open on your screen while travelling so the office and family can follow your route.</span></div>`
    : `<div class="hint ${denied?'red':'amber'}">${I('alert','sm')}<span>${denied ? 'Location permission is blocked for Careva+.' : 'No GPS fix yet.'}</span></div>
      <ol class="steps mt">${denied ? (isIOS() ? '<li>Open <b>Settings → Privacy & Security → Location Services</b>.</li><li>Turn Location Services on, then choose <b>Safari Websites</b> (or Careva+) → <b>While Using the App</b>.</li><li>Come back and tap <b>Try again</b>.</li>' : '<li>Tap the <b>lock icon</b> next to the address (or open <b>Settings → Apps → Careva+ → Permissions</b>).</li><li>Set <b>Location</b> to <b>Allow</b>.</li><li>Come back and tap <b>Try again</b>.</li>') : '<li>Make sure <b>Location / GPS</b> is switched on in your quick settings.</li><li>Step outside or near a window for a better signal.</li><li>Tap <b>Try again</b>.</li>'}</ol>
      <button class="btn btn-primary btn-block mt" data-act="gpsRetry">${I('refresh','sm')} Try again</button>`}`});
};
ACT.gpsRetry = el => { el.disabled = true; el.textContent = 'Requesting…'; GPS.request(12000).then(p => { GPS.set(p.coords.latitude, p.coords.longitude, p.coords.accuracy); GPS.start(); Modal.closeAll(); toast('Live GPS connected'); App.refresh(); }).catch(e => { el.disabled = false; el.innerHTML = `${I('refresh','sm')} Try again`; toast(e && e.code===1 ? 'Location permission is still blocked' : 'No GPS signal yet','err'); }); };
ACT.staffSOS = () => {
  const s = SU(), p = myPos() || S().gps[App.uid] || {lat:0, lng:0};
  Modal.open({title:'Staff safety alert', sub:'Feeling unsafe, injured or facing an emergency?', body:`<button class="sos-ring" data-act="staffSOSsend" style="border:0;cursor:pointer">SOS</button><p class="center small ink2">Sends your live GPS position (${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}) to the Careva+ office. A supervisor will call you immediately.</p><div class="grid g2 keep mt" style="gap:10px"><a class="btn btn-danger" href="tel:100">Police 100</a><a class="btn btn-ghost" href="tel:${CO.tel}">Call office</a></div>`});
};
ACT.staffSOSsend = el => { const s = SU(), p = myPos() || S().gps[App.uid] || {lat:0, lng:0}; addAlert('red','sos',`STAFF SOS — ${s.name} (${s.id}) at ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`, {sid:s.id, lat:p.lat, lng:p.lng}); el.closest('.modal-b').innerHTML = `<div class="center" style="padding:14px 0"><div class="li-ic bg-green" style="width:72px;height:72px;border-radius:50%;margin:0 auto">${I('check','xl')}</div><h3 class="mt">Alert sent</h3><p class="ink2 mt-s">The office can see your live location. Stay where you are safe — a supervisor is calling you now.</p></div>`; };

/* ---------------- TODAY ---------------- */
SV.today = () => {
  const s = SU(), vs = sToday(), next = sNext(), sh = shift();
  const done = vs.filter(v => v.status==='completed'), hrs = sum(done.map(v => v.dur))/60;
  const shiftCard = sh.on
    ? `<div class="row"><span class="live-dot"></span><div class="grow"><div class="b">On duty since ${tsTime(sh.start)}</div><div class="small muted">GPS tracking active · <span id="shift-km">${(sh.km||0).toFixed(1)}</span> km today</div></div><button class="btn btn-ghost btn-sm" data-act="endShift">End shift</button></div>`
    : `<div class="row wrap-ta"><div class="li-ic bg-amber">${I('clock')}</div><div class="grow"><div class="b">You’re off duty</div><div class="small muted">Start your shift to begin GPS visit verification</div></div><button class="btn btn-green" data-act="startShift">${I('play','fill sm')} Start shift</button></div>`;
  const nextCard = next ? (() => { const p = pat(next.pid); return `<div class="hero">
    <div class="row between"><span class="small b" style="color:#B9CCEC;letter-spacing:.08em;text-transform:uppercase">${next.status==='inprogress'?'Current visit':'Next visit'}</span>${vPill(next)}</div>
    <h2 style="font-size:23px;margin-top:10px">${esc(p.name)}</h2><div class="muted">${svc(next.service).name} · ${fmtT(next.start)} – ${fmtT(visitEnd(next))}</div>
    <div class="glass mt"><div class="row">${I('pin')}<div class="grow"><div class="b small">${esc(p.addr)}</div><div class="small" style="color:#B9CCEC"><span data-dist="${p.lat},${p.lng}">${fmtDist(distTo(p))}</span> away · ~<span data-dist="${p.lat},${p.lng}" data-fmt="eta">${etaMin(distTo(p))} min</span> drive</div></div></div></div>
    <div class="row mt wrap"><button class="btn btn-primary" data-go="visit" data-p='{"id":"${next.id}"}'>${next.status==='inprogress'?'Continue visit':'Open visit'} ${I('right','sm')}</button><a class="btn" style="background:rgba(255,255,255,.12);color:#fff" href="${mapsLink(p.lat,p.lng)}" target="_blank" rel="noopener">${I('nav','sm')} Navigate</a></div></div>`; })()
    : `<div class="card">${vs.length ? emptyState('check','All visits done for today','Great work! Don’t forget to end your shift.') : emptyState('calendar','No visits scheduled today','New visits from the office appear here instantly.')}</div>`;
  return `<div class="card mb">${shiftCard}</div>
  ${staffQuick()}
  <div class="grid" style="grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)" id="td-grid"><div class="col" style="gap:16px">${nextCard}
    <div class="grid g2 keep" style="gap:12px">
    <div class="card kpi"><div class="k-ic bg-blue">${I('calendar')}</div><div class="k-v">${done.length}/${vs.length}</div><div class="k-l">Visits completed</div></div>
    <div class="card kpi"><div class="k-ic bg-green">${I('clock')}</div><div class="k-v">${hrs.toFixed(1)} h</div><div class="k-l">Care hours today</div></div>
    <div class="card kpi"><div class="k-ic bg-violet">${I('car')}</div><div class="k-v">${((sh.km||0) + routeKm(done)).toFixed(1)}</div><div class="k-l">Km travelled</div></div>
    <div class="card kpi"><div class="k-ic bg-amber">${I('star')}</div><div class="k-v">${ratingOf(s)}</div><div class="k-l">Family rating</div></div></div></div>
    <div class="card pad-0" style="overflow:hidden;min-height:300px;display:flex"><div class="map" id="td-map" style="flex:1;min-height:300px;border:0;border-radius:0"></div></div></div>
  <div class="sec-h"><h2>Today’s visits</h2><span class="sub">${vs.length} stops</span></div>
  <div class="col" style="gap:10px">${vs.map((v,i) => { const p = pat(v.pid); return `<div class="visit-card click" data-go="visit" data-p='{"id":"${v.id}"}' style="cursor:pointer">
    <div class="date-box" style="${v.status==='completed'?'background:var(--green-50);color:var(--green)':''}"><span>Stop</span><b>${i+1}</b><span>${fmtT(v.start).replace(' ','')}</span></div>
    <div class="grow"><div class="row between top"><div><div class="b" style="color:var(--navy)">${esc(p.name)} <span class="muted small">· ${p.age}${p.g}</span></div><div class="small muted">${svc(v.service).name} · ${v.dur} min</div></div>${vPill(v)}</div>
      <div class="row small mt-s muted">${I('pin','xs')}<span class="ell">${esc(p.area)}</span> · <b class="ink2" style="white-space:nowrap" data-dist="${p.lat},${p.lng}">${fmtDist(distTo(p))}</b>${p.allergies.length?`<span class="pill p-red" style="height:20px">Allergy</span>`:''}</div></div>${I('right','sm muted')}</div>`; }).join('')}</div>
  <style>@media(max-width:980px){#td-grid{grid-template-columns:1fr!important}}</style>`;
};
const routeKm = vs => { let km = 0, prev = {lat:OFFICE.lat, lng:OFFICE.lng}; vs.forEach(v => { const p = pat(v.pid); km += haversine(prev,p)*1.3/1000; prev = p; }); return km; };
SA.today = () => {
  const el = $('#td-map'); if(!el) return; const m = regMap(new LiveMap(el, {minSpan:300}));
  const vs = sToday(); vs.forEach((v,i) => { const p = pat(v.pid); m.set(v.id, {type:'stop', lat:p.lat, lng:p.lng, text:String(i+1), color:v.status==='completed'?'#4FA21A':v.status==='scheduled'?'#0B2F5E':'#2B6DE8', click:true}); });
  m.set('office', {type:'office', lat:OFFICE.lat, lng:OFFICE.lng});
  const p = myPos(); if(p) m.set('me', {type:'me', lat:p.lat, lng:p.lng, acc:p.acc, noFit:haversine(p, {lat:OFFICE.lat, lng:OFFICE.lng}) > 40000});
  m.draw();
  m.setRoute([[OFFICE.lat,OFFICE.lng], ...vs.map(v => { const q = pat(v.pid); return [q.lat,q.lng]; })], '#11407D');
  m.fit(); el.addEventListener('click', e => { const g = e.target.closest('[data-mkclick]'); if(g && visit(g.dataset.mkclick)) App.go('visit',{id:g.dataset.mkclick}); });
};
ACT.startShift = () => {
  const sh = shift(), p = myPos(); const today = sh.day===TODAY();
  Object.assign(sh, {on:true, day:TODAY(), start:Date.now(), startLat:p?p.lat:null, startLng:p?p.lng:null, km:today ? (sh.km||0) : 0});
  if(p) S().gps[App.uid] = {lat:p.lat, lng:p.lng, acc:p.acc, ts:Date.now(), on:true};
  Store.save(); Wake.on(); GPS.start();
  toast(p ? `Shift started · GPS live (±${p.acc} m)` : 'Shift started — waiting for GPS', p ? 'ok' : 'warn'); App.refresh();
};
ACT.endShift = async () => {
  const open = sToday().filter(v => v.status==='inprogress');
  if(open.length) return toast('Clock out of your current visit first','err');
  if(!await confirmBox({title:'End shift?', text:`Your hours and ${(shift().km||0).toFixed(1)} km will be added to this week’s timesheet.`, ok:'End shift'})) return;
  const sh = shift(); const mins = Math.round((Date.now()-sh.start)/60000); const ts = S().timesheets[App.uid] ||= {}; const prev = ts[TODAY()] || {mins:0, km:0}; ts[TODAY()] = {mins:prev.mins + mins, km:+(prev.km + (sh.km||0)).toFixed(1)}; sh.on = false; sh.km = 0; const g = S().gps[App.uid]; if(g) S().gps[App.uid] = {...g, on:false, ts:Date.now()}; Store.save(); Wake.off(); toast(`Shift ended · ${Math.floor(mins/60)}h ${mins%60}m logged`); App.refresh();
};

/* ---------------- VISIT (EVV) ---------------- */
SV.visit = (prm) => {
  const v = visit(prm.id); if(!v) return emptyState('alert','Visit not found');
  const p = pat(v.pid), s = SU(), e = v.evv;
  const meds = S().meds[p.id] || [];
  const header = `<button class="back" data-act="back">${I('left','sm')} Today</button>
  <div class="card"><div class="row top">${av(p.name, patColor(p.id), 'lg')}<div class="grow"><div class="row wrap" style="gap:8px"><h2 style="font-size:20px">${esc(p.name)}</h2>${vPill(v)}</div>
    <div class="small muted">${p.age} yrs · ${p.g==='F'?'Female':'Male'} · ${p.id}${p.blood && p.blood!=="—" ? " · Blood "+esc(p.blood) : ""}</div>
    <div class="chips mt-s"><span class="pill" style="background:${svc(v.service).color}18;color:${svc(v.service).color}">${I(svc(v.service).icon,'xs')} ${svc(v.service).name}</span><span class="pill p-gray">${I('clock','xs')} ${fmtT(v.start)} · ${v.dur} min</span><span class="pill ${p.risk==='High'?'p-red':p.risk==='Low'?'p-green':'p-amber'}">${p.risk} risk</span></div></div></div>
    ${p.allergies.length?`<div class="hint red mt">${I('alert','sm')}<span><b>Allergy:</b> ${p.allergies.map(esc).join(', ')}</span></div>`:''}
    <div class="divider"></div><dl class="kv"><dt>Diagnosis</dt><dd>${p.dx.map(esc).join('<br>')}</dd><dt>Family contact</dt><dd>${esc(p.contact.name)} (${esc(p.contact.rel)})<br><a href="tel:+91${p.contact.phone.replace(/\s/g,'')}">${fmtPhone(p.contact.phone)}</a></dd><dt>Address</dt><dd>${esc(p.addr)}</dd></dl></div>`;
  if(v.status==='completed' || v.status==='missed') return header + `<div class="card mt-l"><div class="card-h"><h3>Visit record</h3></div>${visitSummaryHTML(v)}</div>`;
  const loc = `<div class="card mt-l"><div class="card-h"><div><h3>Location & visit verification</h3><div class="sub">Geofence ${fence()} m · live phone GPS</div></div>${gpsChip().replace('id="gps-chip"','')}</div>
    <div class="map" id="v-map" style="height:230px"></div>
    ${v.status!=='inprogress' ? `<div class="fence mt" id="fence" data-lat="${p.lat}" data-lng="${p.lng}" data-v="${v.id}"></div>
      <div class="grid g2 keep mt" style="gap:10px">${v.status==='scheduled'?`<button class="btn btn-primary" data-act="startTravel" data-id="${v.id}">${I('car','sm')} Start travel</button>`:(GPS.test ? `<button class="btn btn-soft" data-act="testArrive" data-id="${v.id}">${I('pin','sm')} Simulate arrival (preview)</button>` : `<button class="btn btn-soft" data-act="gpsInfo">${I('locate','sm')} GPS status</button>`)}<a class="btn btn-ghost" href="${mapsLink(p.lat,p.lng)}" target="_blank" rel="noopener">${I('nav','sm')} Navigate</a></div>
      <button class="clock-btn in mt" id="clock-in" data-act="clockIn" data-id="${v.id}" disabled></button>
      <p class="center small mt-s"><button class="btn-text small" data-act="manualEVV" data-id="${v.id}">Can’t get a GPS fix? Request manual verification</button></p>`
    : `<div class="evv mt"><div><span>Clocked in</span><b>${fmtT(e.inT)}</b></div><div><span>Distance</span><b style="color:${e.status==='verified'?'var(--green)':'var(--amber)'}">${fmtDist(e.inDist)}</b></div><div><span>On visit</span><b class="tnum" id="visit-timer">—</b></div></div>
       <div class="small muted mt-s tnum">${e.inLat.toFixed(5)}, ${e.inLng.toFixed(5)} · ±${e.inAcc} m · ${e.mode==='manual'?'manual — pending office review':'GPS verified'}</div>`}</div>`;
  if(v.status!=='inprogress') return header + loc;
  const vt = v.vitals || {};
  const doc = `<div class="card mt-l"><div class="card-h"><div><h3>Care tasks</h3><div class="sub" id="task-count">${v.tasks.filter(t=>t.done).length} of ${v.tasks.length} done</div></div></div>
      ${v.tasks.map((t,i) => `<div class="task ${t.done?'on':''}" data-act="taskTick" data-id="${v.id}" data-i="${i}"><span class="box">${I('check','sm')}</span><span class="tx grow sb">${esc(t.t)}</span></div>`).join('')}</div>
    <div class="card mt-l"><div class="card-h"><h3>Vitals</h3><span class="small muted">Shared with family & office</span></div><form id="vit-f" data-on="vitIn"><div class="f3 k2">
      ${[['sys','BP systolic','mmHg'],['dia','BP diastolic','mmHg'],['pulse','Pulse','bpm'],['spo2','SpO₂','%'],['temp','Temp','°C'],['sugar','Blood sugar','mg/dL']].map(([k,l,u]) => `<div class="field"><label>${l} <span class="muted">(${u})</span></label><input class="input" name="${k}" inputmode="decimal" value="${vt[k]??''}"></div>`).join('')}</div></form></div>
    ${meds.length && v.service==='nursing' ? `<div class="card mt-l"><div class="card-h"><h3>Medicines given (MAR)</h3></div>${meds.filter(m => !m.sos).map(m => { const on = (v.mar||[]).includes(m.id); return `<div class="task ${on?'on':''}" data-act="marTick" data-id="${v.id}" data-m="${m.id}"><span class="box">${I('check','sm')}</span><span class="tx grow"><b>${esc(m.name)}</b> <span class="small muted">· ${m.dose} · ${m.when}</span></span></div>`; }).join('')}</div>` : ''}
    <div class="card mt-l"><div class="card-h"><h3>Visit notes</h3><button class="btn btn-soft btn-xs" data-act="noteTpl" data-id="${v.id}">Insert template</button></div><textarea class="textarea" id="v-notes" data-on="noteIn" data-id="${v.id}" placeholder="Observations, patient response, instructions for family…">${esc(v.notes||'')}</textarea>
      <div class="lbl mt mb">Photos ${v.service==='wound'&&S().settings.requirePhotoWound?'<span class="pill p-amber" style="height:18px">Required for wound care</span>':''}</div><div class="photo-grid">${(v.photos||[]).map(f => fileImg(f)).join('')}<label class="upload">${I('camera')}<input type="file" accept="image/*" capture="environment" class="hidden" data-onchange="photoIn" data-id="${v.id}"></label></div></div>
    <div class="card mt-l"><div class="card-h"><div><h3>Patient / family signature</h3><div class="sub">Confirms the visit took place</div></div><button class="btn btn-ghost btn-xs" data-act="sigClear">Clear</button></div>
      <div class="field"><select class="select" id="sig-by"><option>${esc(p.name)} (patient)</option><option selected>${esc(p.contact.name)} (${esc(p.contact.rel)})</option></select></div><canvas class="sig" id="sig"></canvas><div class="tiny muted mt-s center">Sign with a finger inside the box</div></div>
    <div class="sticky-actions"><button class="clock-btn out" data-act="clockOut" data-id="${v.id}">${I('locate','lg')} Clock out & complete visit</button></div>`;
  return header + loc + doc;
};
SA.visit = (prm) => {
  const v = visit(prm.id); if(!v) return; const p = pat(v.pid);
  const el = $('#v-map');
  if(el){ const m = regMap(new LiveMap(el, {minSpan:200, solidRoute:false})); m.set('home', {type:'home', lat:p.lat, lng:p.lng, color:'#0B2F5E'}); m.setFence(p.lat, p.lng, fence());
    const q = myPos(); if(q) m.set('me', {type:'me', lat:q.lat, lng:q.lng, acc:q.acc});
    if(q && v.status==='enroute' && haversine(q,p) > fence()) m.setRoute([[q.lat,q.lng],[p.lat,p.lng]], '#2B6DE8');
    m.draw(); m.fit(q && haversine(q,p) < 30000 ? [[p.lat,p.lng],[q.lat,q.lng]] : [[p.lat,p.lng]], 160); }
  const f = $('#fence'); if(f) paintFence(f);
  if(v.status==='inprogress'){
    const t = $('#visit-timer'); const tick = () => { if(!t) return; const s = Math.max(0, Math.floor((Date.now() - (v.evv.inTs||Date.now()))/1000)); t.textContent = `${Math.floor(s/3600)?Math.floor(s/3600)+':':''}${pad(Math.floor(s/60)%60)}:${pad(s%60)}`; }; tick(); App.every(tick, 1000);
    const c = $('#sig'); if(c){ Staff.sig = sigPad(c, data => { Staff.sigDrafts[v.id] = data; }); const dr = Staff.sigDrafts[v.id]; if(dr) Staff.sig.load(dr); }
  }
};
ACT.startTravel = el => {
  const v = visit(el.dataset.id), p = pat(v.pid), s = SU();
  const busyV = sToday().find(x => x.status==='inprogress'); if(busyV) return toast(`Clock out of ${pat(busyV.pid).name}’s visit first`,'err');
  if(!shift().on) ACT.startShift();
  const q = myPos();
  v.status = 'enroute'; v.enrouteAt = Date.now(); v.enrouteFrom = q ? {lat:q.lat, lng:q.lng} : null;
  if(q) S().gps[App.uid] = {lat:q.lat, lng:q.lng, acc:q.acc, ts:Date.now(), on:true};
  Store.save(); Wake.on();
  notifyPatient(p.id, `${s.name} has started the journey to your home. Track live in the Careva+ app.`);
  toast('Journey started — the family can now track you live'); App.refresh();
  setTimeout(() => { const a = document.createElement('a'); a.href = mapsLink(p.lat,p.lng); a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); }, 400);
};
ACT.testArrive = el => { const v = visit(el.dataset.id), p = pat(v.pid); if(p.lat==null) return toast('Set the patient’s home location first (office)','err'); GPS.set(p.lat + .00009, p.lng + .00011, 8); toast('Preview: moved to the patient’s door'); };
ACT.clockIn = el => {
  const v = visit(el.dataset.id), p = pat(v.pid), q = myPos();
  if(!q) return toast('Waiting for GPS — keep Location on, or use manual verification','err');
  const d = haversine(q,p);
  if(d > fence()) return toast(`You are ${fmtDist(d)} away — move within ${fence()} m`,'err');
  if(!shift().on) ACT.startShift();
  v.status = 'inprogress'; v.evv = {inT:nowHM(), inTs:Date.now(), inLat:q.lat, inLng:q.lng, inDist:Math.round(d), inAcc:q.acc||0, mode:'gps', status:'verified'};
  Store.save(); notifyPatient(p.id, `${SU().name} checked in at your home at ${fmtT(v.evv.inT)} (GPS verified).`);
  toast(`Clocked in at ${fmtT(v.evv.inT)} · ${fmtDist(d)} from home · verified`); App.refresh(); window.scrollTo(0,0);
};
ACT.manualEVV = el => {
  const v = visit(el.dataset.id);
  const m = Modal.open({title:'Manual verification', sub:'The office will review this visit before it is approved.', body:`<div class="field"><label>Reason</label><select class="select" id="mv-r"><option>Weak GPS signal inside the building</option><option>Phone location services not working</option><option>Patient moved to a relative’s home</option><option>Other</option></select></div><div class="field"><label>Note for the office</label><textarea class="textarea" id="mv-n"></textarea></div>`, foot:`<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="mv-ok">Clock in manually</button>`});
  m.querySelector('#mv-ok').onclick = () => { const q = myPos(), p = pat(v.pid), d = q ? Math.round(haversine(q,p)) : null; v.status = 'inprogress'; v.evv = {inT:nowHM(), inTs:Date.now(), inLat:q?q.lat:null, inLng:q?q.lng:null, inDist:d, inAcc:q?q.acc:null, mode:'manual', status:'exception', reason:$('#mv-r').value + ($('#mv-n').value?` — ${$('#mv-n').value}`:'')}; addAlert('amber','evv',`Manual clock-in — ${SU().name} at ${p.name}’s visit (${d==null?'no GPS':fmtDist(d)+' from home'}): ${$('#mv-r').value}`, {vid:v.id}); Store.save(); Modal.close(m); toast('Clocked in — pending office review','warn'); App.refresh(); };
};
ACT.taskTick = el => { const v = visit(el.dataset.id), t = v.tasks[+el.dataset.i]; t.done = !t.done; Store.save(); el.classList.toggle('on', t.done); $('#task-count').textContent = `${v.tasks.filter(x=>x.done).length} of ${v.tasks.length} done`; };
ACT.marTick = el => { const v = visit(el.dataset.id); v.mar ||= []; const i = v.mar.indexOf(el.dataset.m); if(i<0) v.mar.push(el.dataset.m); else v.mar.splice(i,1); Store.save(); el.classList.toggle('on', i<0); };
ON.vitIn = (el, e) => { const v = visit(App.params.id); const f = $('#vit-f'); const d = Object.fromEntries(new FormData(f)); v.vitals = Object.fromEntries(Object.entries(d).map(([k,x]) => [k, x==='' ? null : Number(x)])); Store.save(); };
ON.noteIn = el => { visit(el.dataset.id).notes = el.value; Store.save(); };
ACT.noteTpl = el => { const v = visit(el.dataset.id), t = $('#v-notes'); t.value = (t.value ? t.value+'\n' : '') + NOTE_TPL[v.service]; v.notes = t.value; Store.save(); };
ACT.sigClear = () => Staff.sig && Staff.sig.clear();
function shrinkImage(file, max=520){ return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => { const img = new Image(); img.onload = () => { const k = Math.min(1, max/Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width*k); c.height = Math.round(img.height*k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .72)); }; img.onerror = rej; img.src = r.result; }; r.onerror = rej; r.readAsDataURL(file); }); }
ON.photoIn = async el => { const f = el.files && el.files[0]; if(!f) return; try{ toast('Uploading photo…','warn',1500); const src = await shrinkImage(f, 1280); const blob = dataUrlBlob(src); const v = visit(el.dataset.id); const path = `${v.pid}/visits/${v.id}-${uid('p')}.jpg`; await Cloud.upload(path, new File([blob], 'photo.jpg', {type:'image/jpeg'})); (v.photos ||= []).push({path}); Store.save(); toast('Photo added to visit record'); App.refresh(); }catch(e){ toast(isNetErr(e) ? 'No internet — photo not uploaded' : 'Could not upload that photo','err'); } };
ACT.clockOut = async el => {
  const v = visit(el.dataset.id), p = pat(v.pid), st = S().settings;
  const open = v.tasks.filter(t => !t.done).length;
  if(st.requireSig && (!Staff.sig || Staff.sig.isEmpty())) { toast('Please get the patient/family signature first','err'); $('#sig').scrollIntoView({behavior:'smooth', block:'center'}); return; }
  if(v.service==='wound' && st.requirePhotoWound && !(v.photos||[]).length){ toast('Add a wound photo before clocking out','err'); return; }
  if(open && !await confirmBox({title:`${open} task${open>1?'s':''} not done`, text:'Clock out anyway? Please explain in your visit notes why these were skipped.', ok:'Clock out anyway'})) return;
  const q = myPos(), d = q ? Math.round(haversine(q, p)) : null;
  v.sig = Staff.sig && !Staff.sig.isEmpty() ? Staff.sig.data() : null; v.sigBy = ($('#sig-by')||{}).value; delete Staff.sigDrafts[v.id];
  Object.assign(v.evv, {outT:nowHM(), outTs:Date.now(), outLat:q?q.lat:null, outLng:q?q.lng:null, outDist:d});
  if(d==null || d > fence()*2){ v.evv.status = 'exception'; v.evv.reason = d==null ? 'No GPS at clock-out' : `Clock-out ${fmtDist(d)} from home`; addAlert('amber','evv',`EVV exception — ${SU().name} clocked out ${d==null?'without GPS':fmtDist(d)+' from '+p.name+'’s home'}`, {vid:v.id}); }
  v.status = 'completed'; if(!v.notes) v.notes = NOTE_TPL[v.service];
  if(v.vitals && (v.vitals.sys || v.vitals.sugar || v.vitals.spo2)){ const L = S().vitals.filter(x => x.pid===p.id).slice(-1)[0] || {}; S().vitals.push({id:uid('VT'), pid:p.id, date:TODAY(), time:v.evv.inT, sys:v.vitals.sys??L.sys, dia:v.vitals.dia??L.dia, pulse:v.vitals.pulse??L.pulse, spo2:v.vitals.spo2??L.spo2, sugar:v.vitals.sugar??L.sugar, temp:v.vitals.temp??L.temp, weight:L.weight, by:`${SU().name}, ${SU().short}`}); }
  Store.save(); notifyPatient(p.id, `Visit completed by ${SU().name}. The visit summary is ready in the app.`);
  const mins = Math.round((v.evv.outTs - v.evv.inTs)/60000);
  const m = Modal.open({title:'Visit completed', body:`<div class="center"><div class="li-ic bg-green" style="width:72px;height:72px;border-radius:50%;margin:0 auto">${I('check','xl')}</div><h3 class="mt">${esc(p.name)}</h3><p class="muted">${svc(v.service).name}</p></div>
    <div class="evv mt"><div><span>In</span><b>${fmtT(v.evv.inT)}</b></div><div><span>Out</span><b>${fmtT(v.evv.outT)}</b></div><div><span>Duration</span><b>${mins} min</b></div></div>
    <div class="hint green mt">${I('shield','sm')}<span>EVV record sent to the office · family notified · ${v.tasks.filter(t=>t.done).length}/${v.tasks.length} tasks</span></div>`, foot:`<button class="btn btn-primary btn-block" data-close>Back to today</button>`, onClose:() => App.go('today',{},false)});
};

/* ---------------- ROUTE ---------------- */
SV.route = () => {
  const vs = sToday(), left = vs.filter(v => v.status!=='completed');
  return `<div class="grid" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)" id="rt-grid">
    <div class="card pad-0" style="overflow:hidden;position:relative"><div class="map" id="rt-map" style="height:min(66vh,560px);border:0;border-radius:0"></div><div class="map-legend"><span><i style="background:#4FA21A"></i>Done</span><span><i style="background:#2B6DE8"></i>Active</span><span><i style="background:#0B2F5E"></i>Upcoming</span><span><i style="background:#2B6DE8;box-shadow:0 0 0 3px #CFE0FC"></i>You</span></div></div>
    <div class="card"><div class="card-h"><div><h3>Stops</h3><div class="sub">${left.length} remaining · ~${routeKm(vs).toFixed(1)} km route</div></div></div>
      <div class="tl">${vs.map((v,i) => { const p = pat(v.pid); return `<div class="tl-i ${v.status==='completed'?'done':v===sNext()?'now':''}"><div class="row between"><div class="click" data-go="visit" data-p='{"id":"${v.id}"}' style="cursor:pointer"><div class="b">${i+1}. ${esc(p.name)}</div><div class="small muted">${fmtT(v.start)} · ${svc(v.service).short} · ${esc(p.area)}</div></div><div style="text-align:right"><div class="small b" data-dist="${p.lat},${p.lng}">${fmtDist(distTo(p))}</div>${v.status!=='completed'?`<a class="btn-text tiny" href="${mapsLink(p.lat,p.lng)}" target="_blank" rel="noopener">Navigate ↗</a>`:'<span class="tiny" style="color:var(--green)">Done</span>'}</div></div></div>`; }).join('')}</div></div></div>
    <style>@media(max-width:980px){#rt-grid{grid-template-columns:1fr!important}}</style>`;
};
SA.route = () => {
  const el = $('#rt-map'); const m = regMap(new LiveMap(el, {minSpan:320})); const vs = sToday(), nx = sNext();
  vs.forEach((v,i) => { const p = pat(v.pid); m.set(v.id, {type:'stop', lat:p.lat, lng:p.lng, text:String(i+1), label:first(p.name), color:v.status==='completed'?'#4FA21A':v===nx?'#2B6DE8':'#0B2F5E', click:true}); });
  m.set('office', {type:'office', lat:OFFICE.lat, lng:OFFICE.lng, label:'Office'}); const q = myPos(); if(q) m.set('me', {type:'me', lat:q.lat, lng:q.lng, acc:q.acc, noFit:haversine(q, {lat:OFFICE.lat, lng:OFFICE.lng}) > 40000}); m.draw();
  m.setRoute([[OFFICE.lat,OFFICE.lng], ...vs.map(v => { const p = pat(v.pid); return [p.lat,p.lng]; })], '#11407D'); m.fit();
  el.addEventListener('click', e => { const g = e.target.closest('[data-mkclick]'); if(g && visit(g.dataset.mkclick)) App.go('visit',{id:g.dataset.mkclick}); });
};

/* ---------------- SCHEDULE ---------------- */
SV.schedule = (prm) => {
  const day = prm.d || TODAY(), days = Array.from({length:7}, (_,i) => dOff(i));
  const vs = S().visits.filter(v => v.sid===App.uid && v.date===day && v.status!=='cancelled').sort(byTime);
  const avail = (SU().avail ||= {});
  return `<div class="page-h"><div><h1>My schedule</h1><p>${S().visits.filter(v => v.sid===App.uid && days.includes(v.date) && v.status!=='cancelled').length} visits in the next 7 days</p></div><button class="btn btn-ghost" data-act="leaveReq">${I('calendar','sm')} Request leave</button></div>
  <div class="chips scroll day-chips mb">${days.map(d => { const x = parseD(d), n = S().visits.filter(v => v.sid===App.uid && v.date===d && v.status!=='cancelled').length; return `<button class="chip ${d===day?'on':''}" data-go="schedule" data-p='{"d":"${d}"}'><small>${d===TODAY()?'Today':x.toLocaleDateString(LOC(),{weekday:'short'})}</small><b>${x.getDate()}</b><small>${n} visits</small></button>`; }).join('')}</div>
  <div class="grid g2"><div class="card"><div class="card-h"><h3>${relDay(day)}</h3><span class="small muted">${vs.length} visits · ${(sum(vs.map(v=>v.dur))/60).toFixed(1)} h</span></div>
    ${vs.length ? `<div class="tl">${vs.map(v => { const p = pat(v.pid); return `<div class="tl-i ${v.status==='completed'?'done':''}"><div class="row between"><div><div class="b">${fmtT(v.start)} – ${fmtT(visitEnd(v))}</div><div class="small">${esc(p.name)} · <span class="muted">${svc(v.service).name}</span></div><div class="tiny muted">${esc(p.area)}</div></div>${vPill(v)}</div></div>`; }).join('')}</div>` : emptyState('calendar','No visits this day')}</div>
  <div class="card"><div class="card-h"><div><h3>Availability</h3><div class="sub">Tell the office which days you can take extra visits</div></div></div>${days.map(d => `<div class="li"><div class="grow"><div class="t">${relDay(d)}</div><div class="s">${fmtD(d,{day:'numeric',month:'short'})}</div></div><label class="switch"><input type="checkbox" ${avail[d]!==false?'checked':''} data-onchange="availToggle" data-d="${d}"><span></span></label></div>`).join('')}
   ${(S().leave||[]).filter(l => l.sid===App.uid).map(l => `<div class="hint amber mt-s">${I('calendar','sm')}<span>Leave ${fmtD(l.from,{day:'numeric',month:'short'})} – ${fmtD(l.to,{day:'numeric',month:'short'})} · ${l.status}</span></div>`).join('')}</div></div>`;
};
ON.availToggle = el => { SU().avail[el.dataset.d] = el.checked; Store.save(); toast(el.checked ? 'Marked available' : 'Marked unavailable — office notified', el.checked?'ok':'warn'); if(!el.checked) addAlert('blue','avail',`${SU().name} is unavailable on ${relDay(el.dataset.d)}`); };
ACT.leaveReq = () => { const m = Modal.open({title:'Request leave', body:`<form id="lv-f" data-submit="saveLeave"><div class="f2"><div class="field"><label>From</label><input class="input" type="date" name="from" min="${TODAY()}" value="${dOff(7)}" required></div><div class="field"><label>To</label><input class="input" type="date" name="to" min="${TODAY()}" value="${dOff(8)}" required></div></div><div class="field"><label>Type</label><select class="select" name="type"><option>Casual leave</option><option>Sick leave</option><option>Emergency</option></select></div><div class="field"><label>Reason</label><textarea class="textarea" name="reason"></textarea></div></form>`, foot:`<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" form="lv-f">Submit</button>`}); };
FORM.saveLeave = f => { const d = Object.fromEntries(new FormData(f)); (S().leave ||= []).push({id:uid('LV'), sid:App.uid, ...d, status:'Pending approval'}); addAlert('blue','leave',`Leave request — ${SU().name}: ${fmtD(d.from,{day:'numeric',month:'short'})} to ${fmtD(d.to,{day:'numeric',month:'short'})} (${d.type})`); Modal.close(f); toast('Leave request sent'); App.refresh(); };

/* ---------------- TIMESHEET ---------------- */
SV.timesheet = () => {
  const days = Array.from({length:7}, (_,i) => dOff(i-6)), ts = S().timesheets[App.uid] || {};
  const rows = days.map(d => { const vs = S().visits.filter(v => v.sid===App.uid && v.date===d && v.status==='completed'); const t = ts[d]; const km = t ? t.km + routeKm(vs) : routeKm(vs); return {d, n:vs.length, h:sum(vs.map(v => v.evv && v.evv.outT ? toMin(v.evv.outT)-toMin(v.evv.inT) : v.dur))/60, km, ex:vs.filter(v => v.evv && v.evv.status==='exception').length}; });
  const H = sum(rows.map(r => r.h)), K = sum(rows.map(r => r.km)), N = sum(rows.map(r => r.n));
  const submitted = SU().tsSubmitted===days[0];
  return `<div class="grid g4"><div class="card kpi"><div class="k-ic bg-blue">${I('clock')}</div><div class="k-v">${H.toFixed(1)} h</div><div class="k-l">Care hours (GPS)</div></div><div class="card kpi"><div class="k-ic bg-green">${I('check')}</div><div class="k-v">${N}</div><div class="k-l">Visits completed</div></div><div class="card kpi"><div class="k-ic bg-violet">${I('car')}</div><div class="k-v">${K.toFixed(0)} km</div><div class="k-l">Travel (from GPS)</div></div><div class="card kpi"><div class="k-ic bg-amber">${I('rupee')}</div><div class="k-v">${inr(K*4)}</div><div class="k-l">Mileage claim @ ₹4/km</div></div></div>
  <div class="card mt-l"><div class="card-h"><div><h3>Last 7 days</h3><div class="sub">Hours are taken from GPS clock-in/out times</div></div><button class="btn ${submitted?'btn-ghost':'btn-primary'} btn-sm" data-act="tsSubmit" ${submitted?'disabled':''}>${submitted?'Submitted':'Submit timesheet'}</button></div>
    <div class="tbl-wrap"><table class="tbl stack"><thead><tr><th>Day</th><th>Visits</th><th>Hours</th><th>Km</th><th>EVV</th></tr></thead><tbody>${rows.slice().reverse().map(r => `<tr><td class="first b">${relDay(r.d)}</td><td data-l="Visits">${r.n}</td><td data-l="Hours" class="tnum">${r.h.toFixed(1)}</td><td data-l="Km" class="tnum">${r.km.toFixed(1)}</td><td data-l="EVV">${r.n ? (r.ex ? `<span class="pill p-amber">${r.ex} to review</span>` : '<span class="pill p-green">All verified</span>') : '—'}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="card mt-l"><div class="card-h"><h3>Hours by day</h3></div>${chart({type:'bar', labels:rows.map(r => fmtD(r.d,{weekday:'short'})), series:[{values:rows.map(r => +r.h.toFixed(1)), color:'#BCD3FA', hl:'#2B6DE8'}], fmt:v => v.toFixed(0)+'h'}, 200)}</div>`;
};
ACT.tsSubmit = () => { SU().tsSubmitted = dOff(-6); addAlert('blue','timesheet',`Timesheet submitted — ${SU().name} (last 7 days)`); Store.save(); toast('Timesheet submitted for approval'); App.refresh(); };

/* ---------------- MESSAGES ---------------- */
const threadsS = () => { const s = SU(); const pids = [...new Set(S().visits.filter(v => v.sid===s.id && v.date>=dOff(-3) && v.date<=dOff(3)).map(v => v.pid))];
  return [{id:`${s.id}|office`, name:'Careva+ Office', sub:'Care coordinator desk', color:'#0B2F5E'}, {id:'all-staff', name:'All staff', sub:'Announcements', color:'#4FA21A'}, ...pids.map(pid => { const p = pat(pid); return {id:`${pid}|${s.id}`, name:p.name, sub:`Patient · ${p.area}`, color:patColor(pid)}; })]; };
SV.smsg = (prm) => chatView(threadsS(), prm.t, App.uid, {view:'smsg', mobileChat:!!prm.t});
SA.smsg = () => { const b = $('#chat-body'); if(b) b.scrollTop = b.scrollHeight; };

/* ---------------- PROFILE ---------------- */
SV.profile = () => {
  const s = SU(), mv = S().visits.filter(v => v.sid===s.id && v.date.slice(0,7)===TODAY().slice(0,7) && v.status==='completed');
  const onTime = mv.filter(v => v.evv && toMin(v.evv.inT) <= toMin(v.start)+10).length;
  const train = [['Infection control & hand hygiene',100],['Safe patient handling',100],['Fall prevention at home',70],['Dementia care basics',40]];
  return `<div class="card"><div class="row">${av(s.name, s.color, 'xl', true)}<div class="grow"><h2 style="font-size:21px">${esc(s.name)}</h2><div class="muted">${s.role} · ${s.qual}</div><div class="chips mt-s"><span class="pill p-blue">${s.id}</span><span class="pill p-green">★ ${ratingOf(s)}</span><span class="pill p-gray">${s.exp} yrs experience</span></div></div></div></div>
  <div class="grid g3 mt-l"><div class="card kpi"><div class="k-v">${mv.length}</div><div class="k-l">Visits this month</div></div><div class="card kpi"><div class="k-v">${mv.length?Math.round(onTime/mv.length*100):100}%</div><div class="k-l">On-time arrivals</div></div><div class="card kpi"><div class="k-v">${ratingOf(s)}</div><div class="k-l">Average family rating</div></div></div>
  <div class="grid g2 mt-l"><div class="card"><div class="card-h"><h3>Credentials</h3></div><div class="list">${s.certs.map(c => { const d = Math.round((parseD(c.exp)-parseD(TODAY()))/864e5); return `<div class="li"><div class="li-ic ${d<0?'bg-red':d<30?'bg-amber':'bg-green'}">${I('award','sm')}</div><div class="grow"><div class="t">${esc(c.n)}</div><div class="s">Valid till ${fmtD(c.exp,{day:'numeric',month:'short',year:'numeric'})}</div></div><span class="pill ${d<0?'p-red':d<30?'p-amber':'p-green'}">${d<0?'Expired':d<30?`${d} days left`:'Valid'}</span></div>`; }).join('')}</div><label class="btn btn-ghost btn-sm mt">${I('upload','sm')} Upload renewed certificate<input type="file" class="hidden" data-onchange="certUp"></label></div>
  <div class="card"><div class="card-h"><h3>Training</h3></div>${train.map(([t,p]) => `<div class="mb"><div class="row between small"><span class="sb">${t}</span><b>${p}%</b></div><div class="bar ${p===100?'green':''} mt-s"><i style="width:${p}%"></i></div></div>`).join('')}</div>
  <div class="card"><div class="card-h"><h3>Location & privacy</h3></div><p class="small ink2">Your location is recorded only while you’re on shift, to verify visits (EVV), calculate mileage and keep you safe. It is never shared outside Careva+.</p><div class="row mt">${gpsChip().replace('id="gps-chip"','')}<button class="btn btn-ghost btn-sm" data-act="gpsInfo">GPS details</button></div></div>
  <div class="card"><div class="card-h"><h3>Account</h3></div><div class="list"><div class="li"><div class="li-ic bg-blue">${I('bell','sm')}</div><div class="grow"><div class="t">Notification sound</div><div class="s">Play a sound for new messages and updates</div></div><label class="switch"><input type="checkbox" ${Chime.on()?'checked':''} data-onchange="soundToggle"><span></span></label></div><div class="li"><div class="li-ic bg-violet">${I('globe','sm')}</div><div class="grow"><div class="t">Language</div><div class="s">App language on this phone</div></div>${langSeg()}</div><a class="li click" href="tel:${CO.tel}"><div class="li-ic bg-blue">${I('phone','sm')}</div><div class="grow t">Call office</div></a><div class="li click" data-act="logout"><div class="li-ic bg-red">${I('logout','sm')}</div><div class="grow t">Sign out</div></div></div></div></div>`;
};
ON.certUp = el => { if(el.files && el.files[0]){ addAlert('blue','cert',`${SU().name} uploaded a renewed certificate for review`); toast('Certificate uploaded for verification'); } };


/* ---------------- MY PATIENTS — vitals, care notes, photos & concerns from the staff dashboard ---------------- */
const myPatients = () => S().patients.filter(p => S().visits.some(v => v.pid===p.id && v.sid===App.uid)).sort((a,b) => a.name.localeCompare(b.name));
const lastVit = pid => S().vitals.filter(x => x.pid===pid).sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time)).slice(-1)[0];
const vitChips = x => !x ? '' : `${vHas(x,'sys')?`<span class="pill p-red">BP ${x.sys}/${vHas(x,'dia')?x.dia:'–'}</span>`:''}${vHas(x,'sugar')?`<span class="pill p-amber">Sugar ${x.sugar}</span>`:''}${vHas(x,'spo2')?`<span class="pill p-blue">SpO₂ ${x.spo2}%</span>`:''}${vHas(x,'pulse')?`<span class="pill p-violet">Pulse ${x.pulse}</span>`:''}${vHas(x,'temp')?`<span class="pill p-teal">${x.temp}°C</span>`:''}${vHas(x,'weight')?`<span class="pill p-gray">${x.weight} kg</span>`:''}`;
function staffQuick(){
  return `<div class="qa staff-qa mb">
    <button data-act="sPick" data-next="sVitals"><span class="q-ic bg-red">${I('pulse')}</span>Record vitals</button>
    <button data-act="sPick" data-next="sNote"><span class="q-ic bg-blue">${I('pen')}</span>Care note</button>
    <button data-act="sPick" data-next="sPhoto"><span class="q-ic bg-teal">${I('camera')}</span>Add photo</button>
    <button data-go="patients"><span class="q-ic bg-violet">${I('users')}</span>My patients</button></div>`;
}
SV.patients = () => {
  const ps = myPatients();
  if(!ps.length) return `<div class="card">${emptyState('users','No patients yet','Patients appear here once the office schedules a visit with you.')}</div>`;
  return `<div class="col" style="gap:12px">${ps.map(p => { const L = lastVit(p.id), nv = S().visits.filter(v => v.pid===p.id && v.sid===App.uid && v.date>=TODAY() && v.status!=='completed' && v.status!=='cancelled').sort(byTime)[0];
    return `<div class="card sp-card"><div class="row click" data-go="spatient" data-p='{"id":"${p.id}"}' style="cursor:pointer">${av(p.name, patColor(p.id), 'lg')}<div class="grow"><div class="b" style="color:var(--navy);font-size:16px">${esc(p.name)}</div><div class="small muted">${p.age} yrs · ${p.g==='F'?'Female':'Male'} · ${esc(p.area||'')}</div>
      <div class="small mt-s">${nv ? `<span class="pill p-blue">${I('calendar','xs')} ${relDay(nv.date)} · ${fmtT(nv.start)}</span>` : ''}${p.allergies.length?` <span class="pill p-red">Allergy</span>`:''}</div></div>${I('right','sm muted')}</div>
      ${L ? `<div class="chips mt" style="gap:6px">${vitChips(L)}</div><div class="tiny muted mt-s">${relDay(L.date)} · ${fmtT(L.time)} · ${esc(L.by||'')}</div>` : ''}
      <div class="row mt wrap" style="gap:8px"><button class="btn btn-soft btn-sm" data-act="sVitals" data-pid="${p.id}">${I('pulse','sm')} Vitals</button><button class="btn btn-soft btn-sm" data-act="sNote" data-pid="${p.id}">${I('pen','sm')} Note</button><button class="btn btn-ghost btn-sm" data-go="spatient" data-p='{"id":"${p.id}"}'>Details</button></div></div>`; }).join('')}</div>`;
};
SV.spatient = (prm) => {
  const p = pat(prm.id); if(!p) return `<div class="card">${emptyState('users','Patient not found','')}</div>`;
  const vt = S().vitals.filter(x => x.pid===p.id).sort((a,b) => (b.date+b.time).localeCompare(a.date+a.time));
  const meds = S().meds[p.id] || [], plan = S().carePlan[p.id], docs = (S().docs[p.id] || []).slice().sort((a,b) => ((b.date||'')+(b.time||'')).localeCompare((a.date||'')+(a.time||'')));
  return `<button class="back" data-go="patients">${I('left','sm')} My patients</button>
  <div class="card"><div class="row">${av(p.name, patColor(p.id), 'xl')}<div class="grow"><h2 style="font-size:21px">${esc(p.name)}</h2><div class="muted">${p.age} yrs · ${p.g==='F'?'Female':'Male'} · ${p.id}</div></div>${p.phone?`<a class="icon-btn" href="tel:${p.phone}" aria-label="Call">${I('phone','sm')}</a>`:''}</div>
    ${p.allergies.length?`<div class="hint red mt">${I('alert','sm')}<span><b>Allergy:</b> ${esc(p.allergies.join(', '))}</span></div>`:''}
    <dl class="kv mt"><dt>Diagnosis</dt><dd>${p.dx.map(esc).join('<br>')||'—'}</dd><dt>Address</dt><dd>${esc(p.addr||'—')}</dd>${p.contact?`<dt>Family contact</dt><dd>${esc(p.contact.name)} (${esc(p.contact.rel)})<br><a href="tel:${p.contact.phone}">${fmtPhone(p.contact.phone)}</a></dd>`:''}</dl></div>
  <div class="qa staff-qa mt-l">
    <button data-act="sVitals" data-pid="${p.id}"><span class="q-ic bg-red">${I('pulse')}</span>Record vitals</button>
    <button data-act="sNote" data-pid="${p.id}"><span class="q-ic bg-blue">${I('pen')}</span>Care note</button>
    <button data-act="sPhoto" data-pid="${p.id}"><span class="q-ic bg-teal">${I('camera')}</span>Add photo</button>
    <button data-act="sConcern" data-pid="${p.id}"><span class="q-ic bg-amber">${I('alert')}</span>Tell office</button></div>
  <div class="grid g2 mt-l">
    <div class="card"><div class="card-h"><div><h3>Vitals</h3><div class="sub">${vt.length ? `${relDay(vt[0].date)} · ${fmtT(vt[0].time)}` : 'No readings yet'}</div></div><button class="btn btn-soft btn-sm" data-act="sVitals" data-pid="${p.id}">${I('plus','sm')} Add</button></div>
      ${vt.length ? `<div class="list">${vt.slice(0,6).map(x => `<div class="li" style="align-items:flex-start"><div class="li-ic ${String(x.by||'').startsWith('Self')?'bg-teal':'bg-blue'}">${I(String(x.by||'').startsWith('Self')?'user':'steth','sm')}</div><div class="grow"><div class="row between"><span class="t">${relDay(x.date)} <span class="muted small">· ${fmtT(x.time)}</span></span><span class="tiny muted">${esc(x.by||'')}</span></div><div class="chips mt-s" style="gap:6px">${vitChips(x)}</div>${x.note?`<div class="small muted mt-s">${esc(x.note)}</div>`:''}</div></div>`).join('')}</div>` : emptyState('pulse','No readings yet','Tap Add to record BP, sugar, SpO₂, pulse, temperature or weight.')}</div>
    <div class="card"><div class="card-h"><div><h3>Care notes & photos</h3><div class="sub">Shared with family & office</div></div><button class="btn btn-soft btn-sm" data-act="sNote" data-pid="${p.id}">${I('plus','sm')} Note</button></div>
      ${docs.length ? `<div class="col" style="gap:8px">${docs.slice(0,8).map(d => `<div class="doc" data-act="viewDoc" data-id="${d.id}" data-pid="${p.id}"><div class="doc-ic ${d.type==='note'?'bg-blue':d.kind==='IMG'?'bg-teal':'bg-red'}">${d.type==='note'?I('pen','sm'):d.kind}</div><div class="grow"><div class="b ell">${esc(d.name)}</div><div class="tiny muted ell">${d.type==='note'?esc(d.text||'')+' · ':''}${fmtD(d.date,{day:'numeric',month:'short'})} · ${esc(d.by||'')}</div></div>${I('right','sm muted')}</div>`).join('')}</div>` : emptyState('file','No notes yet','Add a care note or a photo — the family and office see it straight away.')}</div>
    <div class="card"><div class="card-h"><h3>Medicines</h3></div>${meds.length ? `<div class="list">${meds.map(m => `<div class="li"><div class="li-ic bg-green">${I('pill','sm')}</div><div class="grow"><div class="t">${esc(m.name)}</div><div class="s">${esc(m.dose||'')}${m.when?' · '+esc(m.when):''}</div></div><span class="small b ink2">${m.sos?'When needed':(m.times||[]).map(fmtT).join(', ')}</span></div>`).join('')}</div>` : emptyState('pill','No medicines scheduled','')}</div>
    <div class="card"><div class="card-h"><h3>Care plan</h3></div>${plan && (plan.goals||[]).length ? plan.goals.map(g => `<div class="mb"><div class="row between small"><span class="sb ink2">${esc(g.g)}</span><b>${g.p||0}%</b></div><div class="bar ${g.p>80?'green':''} mt-s"><i style="width:${g.p||0}%"></i></div></div>`).join('') + (plan.diet?`<p class="small mt"><b>Diet:</b> ${esc(plan.diet)}</p>`:'') : emptyState('clipboard','No goals yet','')}</div>
  </div>`;
};
// choose a patient first when started from the Today screen
ACT.sPick = el => {
  const ps = myPatients(), next = el.dataset.next;
  if(!ps.length) return toast('No patients yet — the office assigns them to you','warn');
  if(ps.length === 1) return ACT[next]({dataset:{pid:ps[0].id}});
  const m = Modal.open({title:'Choose a patient', body:`<div class="list">${ps.map(p => `<div class="li click" data-pick="${p.id}">${av(p.name, patColor(p.id))}<div class="grow"><div class="t">${esc(p.name)}</div><div class="s">${p.id} · ${esc(p.area||'')}</div></div>${I('right','sm muted')}</div>`).join('')}</div>`});
  m.querySelectorAll('[data-pick]').forEach(r => r.onclick = () => { Modal.close(m); setTimeout(() => ACT[next]({dataset:{pid:r.dataset.pick}}), 220); });
};
ACT.sVitals = el => {
  const p = pat(el.dataset.pid); if(!p) return;
  Modal.open({title:'Record vitals', sub:`${p.name} · ${p.id}`, body:`<form id="sv-f" data-submit="sSaveVitals" data-pid="${p.id}">
    <div class="f2"><div class="field"><label>BP systolic</label><input class="input" name="sys" inputmode="numeric" placeholder="128"></div><div class="field"><label>BP diastolic</label><input class="input" name="dia" inputmode="numeric" placeholder="82"></div></div>
    <div class="f3"><div class="field"><label>Sugar (mg/dL)</label><input class="input" name="sugar" inputmode="numeric" placeholder="126"></div><div class="field"><label>SpO₂ (%)</label><input class="input" name="spo2" inputmode="numeric" placeholder="97"></div><div class="field"><label>Pulse</label><input class="input" name="pulse" inputmode="numeric" placeholder="76"></div></div>
    <div class="f2"><div class="field"><label>Temperature (°C)</label><input class="input" name="temp" inputmode="decimal" placeholder="36.8"></div><div class="field"><label>Weight (kg)</label><input class="input" name="weight" inputmode="decimal" placeholder="61.5"></div></div>
    <div class="field"><label>Note (optional)</label><input class="input" name="note" placeholder="e.g. Taken after breakfast"></div></form>
    <div class="hint">${I('info','sm')}<span>Shared with the family and the office as soon as you save.</span></div>`,
    foot:`<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" form="sv-f">Save vitals</button>`});
};
FORM.sSaveVitals = f => {
  const p = pat(f.dataset.pid), d = Object.fromEntries(new FormData(f)), keys = ['sys','dia','sugar','spo2','pulse','temp','weight'];
  if(!keys.some(k => d[k] !== '')) return toast('Enter at least one value','err');
  const num = k => d[k] === '' || isNaN(+d[k]) ? null : +d[k];
  const r = {id:uid('VT'), pid:p.id, date:TODAY(), time:nowHM(), by:`${SU().name}, ${SU().short}`, note:d.note || ''}; keys.forEach(k => r[k] = num(k));
  S().vitals.push(r);
  if(r.sys>=160 || r.sugar>=250 || (r.spo2!=null && r.spo2<92)) addAlert('red','vitals',`Abnormal reading — ${p.name}: ${r.sys>=160?`BP ${r.sys}/${r.dia} `:''}${r.sugar>=250?`Sugar ${r.sugar} `:''}${r.spo2!=null&&r.spo2<92?`SpO₂ ${r.spo2}%`:''}(recorded by ${SU().name})`, {pid:p.id});
  notifyPatient(p.id, `${SU().name} recorded new vitals. See them in My health.`);
  Store.save(); Modal.close(f); toast('Vitals saved — shared with family & office');
  if(App.view === 'spatient' || App.view === 'patients') App.refresh();
};
ACT.sNote = el => {
  const p = pat(el.dataset.pid); if(!p) return;
  Modal.open({title:'Care note', sub:`${p.name} · ${p.id}`, body:`<form id="sn-f" data-submit="sSaveNote" data-pid="${p.id}">
    <div class="field"><label>Type</label><div class="chips" id="sn-kind">${['Care note','Observation','Wound update','Diet & activity','Family update'].map((k,i) => `<button type="button" class="chip ${i?'':'on'}" data-k="${k}">${k}</button>`).join('')}</div></div>
    <div class="field"><label>Note</label><textarea class="textarea" name="text" required placeholder="What did you observe or do?"></textarea></div></form>`,
    foot:`<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" form="sn-f">Save note</button>`});
  $$('#sn-kind .chip').forEach(c => c.onclick = () => { $$('#sn-kind .chip').forEach(x => x.classList.toggle('on', x===c)); });
};
FORM.sSaveNote = f => {
  const p = pat(f.dataset.pid), text = f.text.value.trim(); if(!text) return toast('Write the note first','err');
  const kind = ($('#sn-kind .chip.on') || {dataset:{k:'Care note'}}).dataset.k;
  (S().docs[p.id] ||= []).unshift({id:uid('d'), pid:p.id, name:kind, kind:'NOTE', type:'note', text, date:TODAY(), time:nowHM(), by:SU().name});
  notifyPatient(p.id, `${SU().name} added a care note. See it in My health → Reports.`);
  Store.save(); Modal.close(f); toast('Note saved — shared with family & office'); if(App.view === 'spatient') App.refresh();
};
ACT.sPhoto = el => {
  const p = pat(el.dataset.pid); if(!p) return;
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment';
  inp.onchange = async () => { const f = inp.files && inp.files[0]; if(!f) return;
    if(f.size > 10*1024*1024) return toast('File is too large (max 10 MB)','err');
    toast('Uploading photo…','warn',1500);
    try{ const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g,''); const path = `${p.id}/${uid('f')}.${ext}`; await Cloud.upload(path, f);
      (S().docs[p.id] ||= []).unshift({id:uid('d'), pid:p.id, name:`Photo — ${fmtD(TODAY(),{day:'numeric',month:'short'})}`, kind:'IMG', mime:f.type, path, date:TODAY(), time:nowHM(), by:SU().name, type:'upload'});
      Store.save(); toast('Photo added to the patient record'); if(App.view === 'spatient') App.refresh(); }
    catch(e){ toast(isNetErr(e) ? 'No internet — photo not uploaded' : 'Could not upload that photo','err'); } };
  inp.click();
};
ACT.sConcern = el => {
  const p = pat(el.dataset.pid); if(!p) return;
  Modal.open({title:'Tell the office', sub:`${p.name} · ${p.id}`, body:`<form id="sc-f" data-submit="sSendConcern" data-pid="${p.id}">
    <div class="field"><label>How urgent?</label><div class="seg" id="sc-lvl"><button type="button" data-l="red">Urgent</button><button type="button" class="on" data-l="amber">Needs attention</button><button type="button" data-l="blue">For information</button></div></div>
    <div class="field"><label>What should the office know?</label><textarea class="textarea" name="text" required placeholder="e.g. Patient complains of dizziness since morning"></textarea></div></form>`,
    foot:`<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" form="sc-f">Send to office</button>`});
  $$('#sc-lvl button').forEach(b => b.onclick = () => $$('#sc-lvl button').forEach(x => x.classList.toggle('on', x===b)));
};
FORM.sSendConcern = f => {
  const p = pat(f.dataset.pid), text = f.text.value.trim(); if(!text) return toast('Write a short message first','err');
  const lvl = ($('#sc-lvl .on') || {dataset:{l:'amber'}}).dataset.l;
  addAlert(lvl, 'staffnote', `${SU().name} about ${p.name}: ${text}`, {pid:p.id, sid:App.uid});
  Modal.close(f); toast('Sent to the office');
};
