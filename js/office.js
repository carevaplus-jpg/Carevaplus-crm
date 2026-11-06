'use strict';
/* =========================================================
   OFFICE & ADMIN PORTAL
   ========================================================= */
const ROLE_NAMES = {admin:'Owner / Admin', coordinator:'Care Coordinator', supervisor:'Clinical Supervisor', billing:'Billing'};
const oRole = () => ROLE_NAMES[(Cloud.profile||{}).role] || 'Office';
const isAdminUser = () => (Cloud.profile||{}).role === 'admin';
const todayV = () => S().visits.filter(v => v.date===TODAY() && v.status!=='cancelled').sort(byTime);
const pendingReqs = () => S().requests.filter(r => r.status==='pending');
const reschedReqs = () => S().visits.filter(v => v.reschedReq && !v.reschedReq.done);
const lateVisits = () => todayV().filter(isLate);
const openAlerts = () => S().alerts.filter(a => !a.done);
const STATE = { visit:['On visit','p-amber','#D98A00'], enroute:['En route','p-violet','#7B5CE6'], duty:['On duty','p-blue','#2B6DE8'], off:['Off duty','p-gray','#97A4B6'] };
function staffNow(s){
  const g = S().gps[s.id], vs = todayV().filter(v => v.sid===s.id);
  const cur = vs.find(v => v.status==='inprogress'), er = vs.find(v => v.status==='enroute'), nx = vs.find(v => v.status==='scheduled');
  const sh = S().shifts[s.id], onShift = !!(sh && sh.on && sh.day===TODAY());
  const state = cur ? 'visit' : er ? 'enroute' : (onShift || (g && g.on && Date.now()-(g.ts||0) < 30*60e3)) ? 'duty' : 'off';
  const fresh = g && Date.now() - (g.ts||0) < 5*60e3;
  if(g && g.lat!=null) return {lat:g.lat, lng:g.lng, live:fresh && state!=='off', state, v:cur||er||nx, ts:g.ts, acc:g.acc, has:true};
  return {lat:null, lng:null, live:false, state, v:cur||er||nx, ts:null, acc:null, has:false};
}
const evvCell = v => v.evv ? `<span class="small ${v.evv.status==='verified'?'':'b'}" style="color:${v.evv.status==='verified'?'var(--green)':'var(--amber)'}">${I(v.evv.status==='verified'?'shield':'alert','xs')} ${fmtT(v.evv.inT)} · ${fmtDist(v.evv.inDist)}</span>` : '<span class="muted small">—</span>';
const statePill = st => `<span class="pill ${STATE[st][1]}"><span class="d"></span>${STATE[st][0]}</span>`;
const monthRevenue = m => sum(S().visits.filter(v => v.status==='completed' && v.date.slice(0,7)===m && !(v.evv && v.evv.status==='rejected')).map(v => rate(v.service)));
const mtdRevenue = () => monthRevenue(TODAY().slice(0,7));
const monthKeys = n => Array.from({length:n}, (_,i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-(n-1)+i); return dstr(d).slice(0,7); });
const evvStats = (days=30) => { const vs = S().visits.filter(v => v.evv && v.date>=dOff(-days) && v.date<=TODAY()); const ok = vs.filter(v => v.evv.status==='verified').length; return {n:vs.length, ok, pct: vs.length ? ok/vs.length*100 : 100, ex: vs.filter(v => v.evv.status==='exception'), onTime: vs.filter(v => toMin(v.evv.inT) <= toMin(v.start)+10).length}; };

PORTALS.office = {
  label:'Office & Admin', icon:'building', home:'dash',
  init(){ GPS.stop(); },
  user(){ return {name:(Cloud.profile && Cloud.profile.name) || 'Careva+ Office', sub:oRole(), color:'#0B2F5E'}; },
  nav(){ const r = pendingReqs().length + reschedReqs().length; const ex = evvStats(14).ex.filter(v => !v.evv.approved).length;
    return [{id:'dash',label:'Dashboard',icon:'grid'},{id:'live',label:'Live staff map',icon:'map',tab:'Live map'},{id:'patients',label:'Patients',icon:'heart'},{id:'requests',label:'Requests',icon:'inbox',badge:r||''},{id:'schedule',label:'Scheduling',icon:'calendar',tab:'Schedule'},{id:'staffs',label:'Staff',icon:'users'},{id:'evv',label:'Visit verification',icon:'shield',badge:ex||''},{id:'billing',label:'Billing',icon:'rupee'},{id:'reports',label:'Reports',icon:'chart'},{id:'omsg',label:'Messages',icon:'chat',badge:Unread.count(threadsO(), 'office')||''},{id:'settings',label:'Settings',icon:'sliders'}]; },
  tabs:['dash','live','patients','schedule','more'],
  navOf(v){ return v==='patient' ? 'patients' : v; },
  title(v, prm){ if(v==='patient'){ const p = pat(prm.id); return p ? {t:p.name, s:`${p.id}${p.area?' · '+p.area:''}`} : {t:'Patient', s:''}; } const m = {dash:['Dashboard', fmtD(TODAY(),{weekday:'long',day:'numeric',month:'long',year:'numeric'})], live:['Live staff map','GPS positions of field staff'], patients:['Patients',`${S().patients.filter(p=>p.status==='active').length} active`], requests:['Requests','Visit bookings & enquiries'], schedule:['Scheduling','Week view by staff'], staffs:['Staff',`${S().staff.length} field staff`], evv:['Visit verification (EVV)','GPS clock-in / clock-out records'], billing:['Billing','Invoices & collections'], reports:['Reports','Performance & quality'], omsg:['Messages','Staff, patients & broadcasts'], settings:['Settings','Company, EVV rules & rates']}[v]; return {t:m[0], s:m[1]}; },
  actions(){ const n = openAlerts().filter(a => a.level==='red'||a.level==='amber').length + lateVisits().length; return `<button class="btn btn-primary btn-sm hide-m" data-act="newVisit">${I('plus','sm')} New visit</button><button class="icon-btn" data-act="oAlerts" aria-label="Alerts">${I('bell')}${nbadge(n)}</button>`; },
  views:{}, after:{},
};
const OV = PORTALS.office.views, OA = PORTALS.office.after;

/* ---------------- alerts ---------------- */
function alertsList(limit){
  const late = lateVisits().map(v => ({id:'late-'+v.id, level:'red', kind:'late', text:`Late clock-in — ${stfOr(v.sid).name} has not checked in at ${pat(v.pid).name} (due ${fmtT(v.start)})`, ts:Date.now(), vid:v.id}));
  const all = [...openAlerts().filter(a => a.kind==='sos'), ...late, ...openAlerts().filter(a => a.kind!=='sos')].slice(0, limit||99);
  if(!all.length) return emptyState('check','No open alerts');
  const icon = {sos:'sos', late:'clock', cert:'award', evv:'shield', refill:'pill', request:'inbox', resched:'calendar', payment:'rupee', cancel:'x', vitals:'pulse', leave:'calendar', timesheet:'clock', avail:'user', insurance:'shield', staffnote:'steth'};
  return all.map(a => `<div class="alert-i ${a.level==='red'?'red':a.level==='amber'?'amber':''}"><div class="li-ic ${a.level==='red'?'bg-red':a.level==='amber'?'bg-amber':a.level==='green'?'bg-green':'bg-blue'}" style="width:36px;height:36px">${I(icon[a.kind]||'bell','sm')}</div><div class="grow"><div class="sb small" style="color:var(--ink)">${esc(a.text)}</div><div class="tiny muted mt-s">${timeAgo(a.ts)}</div>
    <div class="row mt-s wrap" style="gap:6px">${a.kind==='sos'&&a.lat?`<button class="btn btn-danger btn-xs" data-act="locate" data-lat="${a.lat}" data-lng="${a.lng}">${I('pin','xs')} Locate</button>`:''}${a.kind==='late'?`<a class="btn btn-ghost btn-xs" href="tel:+91${stf(visit(a.vid).sid).phone.replace(/\s/g,'')}">${I('phone','xs')} Call staff</a><button class="btn btn-ghost btn-xs" data-act="visitModal" data-id="${a.vid}">Reassign</button>`:''}${['request','resched'].includes(a.kind)?`<button class="btn btn-soft btn-xs" data-go="requests">Review</button>`:''}${a.kind==='evv'?`<button class="btn btn-soft btn-xs" data-go="evv" data-p='{"f":"ex"}'>Review</button>`:''}${a.pid && a.kind!=='sos' && pat(a.pid)?`<button class="btn btn-soft btn-xs" data-go="patient" data-p='{"id":"${a.pid}"}'>Open patient</button>`:''}${a.kind!=='late'?`<button class="btn btn-ghost btn-xs" data-act="resolveAlert" data-id="${a.id}">Resolve</button>`:''}</div></div></div>`).join('');
}
ACT.oAlerts = () => Modal.open({title:'Alerts', sub:'Needs attention', body:alertsList()});
ACT.resolveAlert = el => { const a = S().alerts.find(x => x.id===el.dataset.id); if(a){ a.done = true; Store.save(); } const m = el.closest('.modal'); if(m){ m.querySelector('.modal-b').innerHTML = alertsList(); } else App.refresh(); toast('Alert resolved'); };
ACT.locate = el => { Modal.closeAll(); App.go('live', {lat:+el.dataset.lat, lng:+el.dataset.lng}); };

/* ---------------- DASHBOARD ---------------- */
OV.dash = () => {
  const tv = todayV(), done = tv.filter(v => v.status==='completed').length, st = S().staff.map(s => staffNow(s)), onDuty = st.filter(x => x.state!=='off').length, ev = evvStats(30);
  const mk = monthKeys(6), months = mk.map((m,i) => new Date(m+'-01').toLocaleDateString('en-IN',{month:'short'}) + (i===5?' (MTD)':'')), rev = mk.map(monthRevenue);
  const growth = rev[4] ? Math.round((rev[5]/rev[4]-1)*100) : null;
  const mix = SERVICES.map(s => ({l:s.short, v:S().visits.filter(v => v.service===s.id && v.date.slice(0,7)===TODAY().slice(0,7) && v.status==='completed').length, c:s.color}));
  const kpi = (ic,bg,v,l,t='') => `<div class="card kpi"><div class="k-ic ${bg}">${I(ic)}</div><div class="k-v tnum">${v}</div><div class="k-l">${l}</div>${t?`<div class="k-t">${t}</div>`:''}</div>`;
  return `${setupGuide()}<div class="grid g6">
    ${kpi('heart','bg-blue', S().patients.filter(p=>p.status==='active').length, 'Active patients')}
    ${kpi('calendar','bg-violet', `${done}/${tv.length}`, 'Visits today')}
    ${kpi('users','bg-green', `${onDuty}/${S().staff.length}`, 'Staff on duty', '<span class="live-dot"></span>')}
    ${kpi('shield','bg-teal', ev.pct.toFixed(0)+'%', 'EVV verified (30 d)')}
    ${kpi('rupee','bg-amber', inr(mtdRevenue()), 'Revenue this month')}
    ${kpi('inbox','bg-red', pendingReqs().length + reschedReqs().length, 'Pending requests')}
  </div>
  <div class="grid mt-l" style="grid-template-columns:minmax(0,1.55fr) minmax(0,1fr)" id="d-grid">
    <div class="card pad-0" style="overflow:hidden;position:relative"><div class="row between" style="padding:16px 18px 12px"><div><h3 style="font-size:16px">Live field staff</h3><div class="small muted">${st.filter(x=>x.state==='visit').length} on visit · ${st.filter(x=>x.state==='enroute').length} en route · ${st.filter(x=>x.state==='duty').length} between visits</div></div><button class="btn btn-soft btn-sm" data-go="live">Open map</button></div>
      <div class="map" id="d-map" style="height:340px;border:0;border-radius:0;border-top:1px solid var(--line)"></div></div>
    <div class="card"><div class="card-h"><h3>Needs attention</h3><button class="btn btn-ghost btn-xs" data-act="oAlerts">View all</button></div><div style="max-height:356px;overflow:auto">${alertsList(6)}</div></div>
  </div>
  <div class="card mt-l"><div class="card-h"><div><h3>Today’s visits</h3><div class="sub">${tv.filter(v=>v.status==='inprogress').length} in progress · ${lateVisits().length} late</div></div><button class="btn btn-soft btn-sm" data-go="schedule">Schedule</button></div>
    <div class="tbl-wrap hide-m"><table class="tbl"><thead><tr><th>Time</th><th>Patient</th><th>Staff</th><th>Service</th><th>Status</th><th>GPS check-in</th></tr></thead><tbody>
    ${tv.map(v => { const p = pat(v.pid), s = stfOr(v.sid); return `<tr class="click" data-act="visitModal" data-id="${v.id}"><td class="b tnum">${fmtT(v.start)}</td><td><div class="who">${av(p.name,patColor(p.id),'sm')}<span class="sb">${esc(p.name)}</span></div></td><td>${esc(s.name)}</td><td>${svc(v.service).short}</td><td>${vPill(v)}</td><td>${evvCell(v)}</td></tr>`; }).join('')}</tbody></table></div>
    <div class="list hide-d">${tv.map(v => { const p = pat(v.pid), s = stfOr(v.sid); return `<div class="li click" data-act="visitModal" data-id="${v.id}"><div style="width:58px;flex:none" class="b small tnum">${fmtT(v.start)}</div><div class="grow"><div class="t ell">${esc(p.name)}</div><div class="s ell">${esc(first(s.name))} · ${svc(v.service).short}</div>${v.evv?`<div class="tiny">${evvCell(v)}</div>`:''}</div>${vPill(v)}</div>`; }).join('')}</div></div>
  <div class="grid g3 mt-l">
    <div class="card span2"><div class="card-h"><div><h3>Revenue</h3><div class="sub">Completed visits × your rates · last 6 months</div></div>${growth!=null?`<span class="pill ${growth>=0?'p-green':'p-amber'}">${I('trend','xs')} ${growth>=0?'+':''}${growth}% vs last month</span>`:''}</div>${chart({type:'bar', labels:months, series:[{values:rev, color:'#BCD3FA', hl:'#2B6DE8'}], fmt:v => v>=1e5 ? '₹'+(v/1e5).toFixed(1)+'L' : '₹'+Math.round(v/1000)+'k', yw:52}, 230)}</div>
    <div class="card"><div class="card-h"><h3>Service mix</h3><span class="small muted">This month</span></div>${chart({type:'donut', parts:mix, center:sum(mix.map(x=>x.v)), centerSub:'visits'}, 170)}<div class="col mt" style="gap:6px">${mix.map(x => `<div class="legend-row"><i style="background:${x.c}"></i><span class="grow">${x.l}</span><b>${x.v}</b></div>`).join('')}</div></div>
  </div><style>@media(max-width:980px){#d-grid{grid-template-columns:1fr!important}}</style>`;
};
function setupGuide(){
  const st = S(), c = st.settings.company;
  const steps = [
    {done:!!(c.officeSet && c.upi), t:'Company details', s:'Office location on the map and UPI ID for payments', act:'go:settings'},
    {done:st.staff.length>0, t:'Add your care staff', s:'Each gets an employee ID and a 6-digit PIN for the staff app', act:'newStaff'},
    {done:st.patients.length>0, t:'Add patients', s:'Pin their home on the map and give the family an access code', act:'newPatient'},
    {done:st.visits.length>0, t:'Schedule the first visits', s:'Staff see them instantly with GPS clock-in', act:'newVisit'},
  ];
  if(steps.every(x => x.done)) return '';
  return `<div class="card mb setup"><div class="card-h"><div><h3>Get Careva+ ready</h3><div class="sub">${steps.filter(x=>x.done).length} of ${steps.length} steps done — the app starts empty, with no sample data</div></div></div>
    <div class="grid g4">${steps.map((x,i) => `<button class="setup-step ${x.done?'done':''}" ${x.act.startsWith('go:')?`data-go="${x.act.slice(3)}"`:`data-act="${x.act}"`}><span class="n">${x.done?I('check','sm'):i+1}</span><b>${x.t}</b><span class="small muted">${x.s}</span></button>`).join('')}</div></div>`;
}
function staffMap(el, opt={}){
  const m = new LiveMap(el, {minSpan:opt.minSpan||420, onClick:id => { if(stf(id)) ACT.staffModal({dataset:{id}}); }});
  const paint = () => { S().staff.filter(s => s.active!==false).forEach(s => { const n = staffNow(s); if(!n.has){ m.remove(s.id); return; } m.set(s.id, {type:'staff', lat:n.lat, lng:n.lng, color:n.state==='off'?'#97A4B6':s.color, text:initials(s.name), live:n.live && n.state!=='off', label:opt.labels?first(s.name):'', click:true}); }); };
  m.set('office', {type:'office', lat:OFFICE.lat, lng:OFFICE.lng, label:opt.labels?'Office':''});
  if(opt.patients) S().patients.filter(p => p.status==='active' && p.lat!=null).forEach(p => m.set('p-'+p.id, {type:'home', lat:p.lat, lng:p.lng, color:'#11407D', noFit:true, label:opt.labels?first(p.name):''}));
  paint(); m.paint = paint; return m;
}
const livePoints = () => S().staff.map(s => staffNow(s)).filter(n => n.has).map(n => [n.lat, n.lng]);
OA.dash = () => { const el = $('#d-map'); if(!el) return; const m = staffMap(el); const pts = livePoints(); m.fit(pts.length ? pts.concat([[OFFICE.lat, OFFICE.lng]]) : [[OFFICE.lat, OFFICE.lng]], 600); App.every(() => { m.paint(); m.draw(); }, 3000); };

/* ---------------- LIVE MAP ---------------- */
OV.live = (prm) => {
  const f = prm.f || 'all', rows = S().staff.filter(s => s.active!==false).map(s => ({s, n:staffNow(s)})).filter(x => f==='all' || x.n.state===f);
  return `<div class="grid" style="grid-template-columns:minmax(0,1.7fr) minmax(0,1fr)" id="lv-grid">
    <div class="card pad-0" style="overflow:hidden;position:relative"><div class="map" id="lv-map" style="height:min(72vh,640px);border:0;border-radius:0"></div>
      <div class="map-tag"><span class="pill"><span class="live-dot"></span>&nbsp;Live GPS</span><label class="pill" style="cursor:pointer"><input type="checkbox" id="lv-pts" ${prm.pts?'checked':''} style="margin:0 4px 0 0">Patient homes</label></div>
      <div class="map-legend">${Object.entries(STATE).map(([k,[l,,c]]) => `<span><i style="background:${c}"></i>${l}</span>`).join('')}</div></div>
    <div class="card"><div class="chips scroll mb">${[['all','All'],['visit','On visit'],['enroute','En route'],['duty','On duty'],['off','Off']].map(([k,l]) => `<button class="chip ${f===k?'on':''}" data-go="live" data-p='{"f":"${k}"}' style="height:34px">${l}</button>`).join('')}</div>
      ${rows.length ? `<div class="list" id="lv-list">${rows.map(({s,n}) => `<div class="li click" data-act="focusStaff" data-id="${s.id}">${av(s.name, n.state==='off'?'#97A4B6':s.color, '', n.state!=='off')}<div class="grow"><div class="t">${esc(s.name)}</div><div class="s ell">${n.v ? `${n.state==='visit'?'At':'Next:'} ${esc(pat(n.v.pid).name)} · ${fmtT(n.v.start)}` : 'No more visits today'}</div><div class="tiny muted">${n.has ? `${n.live?'Live GPS':'Last GPS'} · ${timeAgo(n.ts)} · ±${n.acc||'?'} m` : 'No GPS shared yet'}</div></div>${statePill(n.state)}</div>`).join('')}</div>` : emptyState('users', S().staff.length ? 'Nobody in this filter' : 'No staff yet', S().staff.length ? '' : 'Add staff, give them their PIN, and they appear here when they start a shift.')}</div></div>
    <style>@media(max-width:980px){#lv-grid{grid-template-columns:1fr!important}}</style>`;
};
OA.live = (prm) => {
  const el = $('#lv-map'); const m = staffMap(el, {labels:true, patients:!!prm.pts, minSpan:500}); App._lvmap = m;
  if(prm.lat){ m.set('sos', {type:'home', lat:prm.lat, lng:prm.lng, color:'#E1343A', label:'SOS'}); m.fit([[prm.lat,prm.lng]], 160); }
  else { const pts = livePoints(); m.fit(pts.length ? pts : [[OFFICE.lat, OFFICE.lng]], 600); }
  $('#lv-pts').onchange = e => App.go('live', {...prm, pts:e.target.checked}, false);
  App.every(() => { m.paint(); m.draw(); }, 3000);
};
ACT.focusStaff = el => { const s = stf(el.dataset.id), n = staffNow(s), m = App._lvmap; if(m && n.has){ m.fit([[n.lat,n.lng]], 140); } ACT.staffModal({dataset:{id:s.id}}); };
ACT.staffModal = el => {
  const s = stf(el.dataset.id), n = staffNow(s), vs = todayV().filter(v => v.sid===s.id);
  Modal.open({title:esc(s.name), sub:`${esc(s.role)} · ${s.id}${s.active===false?' · inactive':''}`, wide:true, body:`<div class="grid g2"><div>${n.has?`<div class="map" id="sm-map" style="height:220px"></div>`:`<div class="empty" style="border:1px dashed var(--line);border-radius:16px">${I('locate','lg')}<div class="small mt-s">No GPS shared yet — appears when ${esc(first(s.name))} starts a shift in the staff app.</div></div>`}
      <div class="evv mt"><div><span>Status</span><b>${STATE[n.state][0]}</b></div><div><span>Last GPS</span><b>${n.ts?timeAgo(n.ts):'—'}</b></div><div><span>Accuracy</span><b>${n.acc!=null?'±'+n.acc+' m':'—'}</b></div></div>
      <div class="lbl mt mb">App login</div>${s.login ? `<div class="row"><span class="pill p-green">${I('check','xs')} Active · ID ${s.id}</span><button class="btn btn-ghost btn-xs" data-act="staffPin" data-id="${s.id}">Reset PIN</button><button class="btn btn-ghost btn-xs" data-act="removeLogin" data-kind="staff" data-id="${s.id}" style="color:var(--red)">Remove</button></div>` : `<button class="btn btn-primary btn-sm" data-act="staffPin" data-id="${s.id}">${I('lock','sm')} Create login PIN</button>`}</div>
    <div><div class="lbl mb">Today’s visits</div>${vs.length?`<div class="tl">${vs.map(v => `<div class="tl-i ${v.status==='completed'?'done':['inprogress','enroute'].includes(v.status)?'now':''}"><div class="row between"><div><div class="b small">${fmtT(v.start)} · ${esc(pat(v.pid).name)}</div><div class="tiny muted">${svc(v.service).short} · ${esc(pat(v.pid).area||'')}</div></div>${vPill(v)}</div></div>`).join('')}</div>`:emptyState('calendar','No visits today')}
    <div class="lbl mt mb">Credentials</div><div class="chips">${(s.certs||[]).length ? s.certs.map(c => { const d = Math.round((parseD(c.exp)-parseD(TODAY()))/864e5); return `<span class="pill ${d<0?'p-red':d<30?'p-amber':'p-green'}">${esc(c.n)}${d<30?` · ${d<0?'expired':d+'d'}`:''}</span>`; }).join('') : '<span class="small muted">None added</span>'}</div></div></div>`,
    foot:`<button class="btn btn-ghost" data-act="editStaff" data-id="${s.id}">${I('edit','sm')} Edit</button>${s.phone?`<a class="btn btn-ghost" href="tel:+91${String(s.phone).replace(/\D/g,'').slice(-10)}">${I('phone','sm')} Call</a>`:''}<button class="btn btn-primary" data-go="omsg" data-p='{"t":"${s.id}|office"}'>${I('chat','sm')} Message</button>`,
    onOpen:mm => setTimeout(() => { const e = mm.querySelector('#sm-map'); if(!e) return; const m = new LiveMap(e, {minSpan:160}); m.set(s.id, {type:'staff', lat:n.lat, lng:n.lng, color:s.color, text:initials(s.name), live:n.live}); if(n.v){ const p = pat(n.v.pid); if(p.lat!=null) m.set('h', {type:'home', lat:p.lat, lng:p.lng}); } m.fit(); }, 60)});
};

/* ---------------- PATIENTS ---------------- */
OV.patients = (prm) => {
  const f = prm.f || 'all', list = S().patients.filter(p => f==='all' || (f==='discharged' ? p.status==='discharged' : p.status==='active' && p.services.includes(f)));
  const nextOf = p => S().visits.filter(v => v.pid===p.id && v.status==='scheduled' && (v.date>TODAY() || (v.date===TODAY() && toMin(v.start)>=nowMin()))).sort(byTime)[0];
  const lead = p => { const c = {}; S().visits.filter(v => v.pid===p.id).forEach(v => c[v.sid] = (c[v.sid]||0)+1); const id = Object.entries(c).sort((a,b) => b[1]-a[1])[0]; return id ? stf(id[0]) : null; };
  return `<div class="page-h"><div><h1>Patients</h1><p>${S().patients.filter(p=>p.status==='active').length} active · ${S().patients.filter(p=>p.risk==='High'&&p.status==='active').length} high-risk</p></div><button class="btn btn-primary" data-act="newPatient">${I('plus','sm')} New patient</button></div>
  <div class="card"><div class="row wrap mb" style="gap:10px"><div class="input-group grow" style="min-width:220px"><span class="pre" style="background:#fff;border:0">${I('search','sm')}</span><input placeholder="Search name, ID, area, diagnosis…" data-on="pSearch"></div></div>
    <div class="chips scroll mb">${[['all','All'],...SERVICES.map(s => [s.id, s.short]),['discharged','Discharged']].map(([k,l]) => `<button class="chip ${f===k?'on':''}" data-go="patients" data-p='{"f":"${k}"}' style="height:34px">${l}</button>`).join('')}</div>
    ${!S().patients.length ? emptyState('heart','No patients yet','Add your first patient — pin their home on the map so staff can clock in with GPS.') + `<div class="center"><button class="btn btn-primary" data-act="newPatient">${I('plus','sm')} New patient</button></div>` : ''}
    <div class="tbl-wrap ${S().patients.length?'':'hidden'}"><table class="tbl stack" id="p-tbl"><thead><tr><th>Patient</th><th>Area</th><th>Services</th><th>Primary staff</th><th>Risk</th><th>Next visit</th></tr></thead><tbody>
    ${list.map(p => { const n = nextOf(p), l = lead(p); return `<tr class="click" data-go="patient" data-p='{"id":"${p.id}"}' data-q="${esc((p.name+' '+p.id+' '+(p.area||'')+' '+(p.phone||'')+' '+(p.dx||[]).join(' ')).toLowerCase())}"><td class="first"><div class="who">${av(p.name,patColor(p.id),'sm')}<div><div class="b">${esc(p.name)}</div><div class="tiny muted">${p.id} · ${p.age}${p.g}</div></div></div></td><td data-l="Area">${esc(p.area)}</td><td data-l="Services"><div class="chips" style="gap:4px;justify-content:flex-end">${p.services.map(s => `<span class="pill" style="background:${svc(s).color}18;color:${svc(s).color}">${svc(s).short}</span>`).join('')}</div></td><td data-l="Staff">${l?esc(l.name):'—'}</td><td data-l="Risk"><span class="pill ${p.risk==='High'?'p-red':p.risk==='Low'?'p-green':'p-amber'}">${p.risk}</span></td><td data-l="Next">${p.status==='discharged'?'<span class="pill p-gray">Discharged</span>':n?`<span class="small sb">${relDay(n.date)} ${fmtT(n.start)}</span>`:'—'}</td></tr>`; }).join('')}</tbody></table></div></div>`;
};
ON.pSearch = el => { const q = el.value.trim().toLowerCase(); $$('#p-tbl tbody tr').forEach(r => r.style.display = !q || r.dataset.q.includes(q) ? '' : 'none'); };
OV.patient = (prm) => {
  const p = pat(prm.id); if(!p) return emptyState('alert','Patient not found');
  const vs = S().visits.filter(v => v.pid===p.id).sort(byTime);
  const up = vs.filter(v => ['scheduled','enroute','inprogress'].includes(v.status) && v.date>=TODAY()).slice(0,6), past = vs.filter(v => v.status==='completed').reverse().slice(0,6);
  const team = [...new Set(vs.map(v => v.sid))].map(stf).filter(Boolean);
  const vit = S().vitals.filter(x => x.pid===p.id && x.sys!=null).sort((a,b) => (a.date+(a.time||'')).localeCompare(b.date+(b.time||''))).slice(-14);
  const inv = S().invoices.filter(i => i.pid===p.id), meds = S().meds[p.id] || [], plan = S().carePlan[p.id], docs = patientDocs(p.id);
  return `<button class="back" data-act="back">${I('left','sm')} Patients</button>
  <div class="card"><div class="row top wrap">${av(p.name, patColor(p.id), 'xl')}<div class="grow" style="min-width:220px"><div class="row wrap" style="gap:8px"><h2 style="font-size:22px">${esc(p.name)}</h2><span class="pill ${p.status==='active'?'p-green':'p-gray'}">${p.status==='active'?'Active':'Discharged'}</span><span class="pill ${p.risk==='High'?'p-red':p.risk==='Low'?'p-green':'p-amber'}">${esc(p.risk||'Medium')} risk</span></div>
    <div class="muted">${p.id} · ${p.age||'?'} yrs · ${p.g==='F'?'Female':'Male'}${p.blood&&p.blood!=='—'?' · Blood '+esc(p.blood):''} · since ${fmtD(p.since||TODAY(),{day:'numeric',month:'short',year:'numeric'})}</div><div class="small ink2 mt-s">${I('pin','xs')} ${esc(p.addr||'Address not set')}</div></div>
    <div class="row wrap" style="gap:8px"><button class="btn btn-primary btn-sm" data-act="newVisit" data-pid="${p.id}">${I('plus','sm')} Schedule visit</button><button class="btn btn-ghost btn-sm" data-act="editPatient" data-id="${p.id}">${I('edit','sm')} Edit</button><button class="btn btn-ghost btn-sm" data-go="omsg" data-p='{"t":"${p.id}|office"}'>${I('chat','sm')} Message</button>${p.status==='active'?`<button class="btn btn-ghost btn-sm" data-act="discharge" data-id="${p.id}">Discharge</button>`:`<button class="btn btn-ghost btn-sm" data-act="readmit" data-id="${p.id}">Re-admit</button>`}</div></div>
    ${(p.allergies||[]).length?`<div class="hint red mt">${I('alert','sm')}<span><b>Allergies:</b> ${p.allergies.map(esc).join(', ')}</span></div>`:''}
    ${p.lat==null?`<div class="hint amber mt">${I('pin','sm')}<span><b>Home location not set.</b> Staff can’t clock in with GPS until you pin the home on the map. <button class="btn-text small" data-act="setPatientLoc" data-id="${p.id}">Set location</button></span></div>`:''}</div>
  <div class="grid g3 mt-l">
    <div class="card"><div class="card-h"><h3>Patient app access</h3></div>${p.login ? `<div class="row"><span class="li-ic bg-green">${I('check','sm')}</span><div class="grow"><div class="b">Login active</div><div class="small muted">Mobile +91 ${esc(p.login.phone)}</div></div></div><div class="row mt wrap" style="gap:8px"><button class="btn btn-ghost btn-sm" data-act="patientLogin" data-id="${p.id}">${I('refresh','sm')} New access code</button><button class="btn btn-ghost btn-sm" data-act="removeLogin" data-kind="patient" data-id="${p.id}" style="color:var(--red)">Remove</button></div>` : `<p class="small muted mb">The family signs in with their mobile number and a 6-digit access code to track visits, see vitals and pay bills.</p><button class="btn btn-primary btn-sm" data-act="patientLogin" data-id="${p.id}">${I('lock','sm')} Create access code</button>`}</div>
    <div class="card"><div class="card-h"><h3>Family contact</h3></div><div class="row">${av(p.contact.name||'?','#11407D')}<div class="grow"><div class="b">${esc(p.contact.name||'—')}</div><div class="small muted">${esc(p.contact.rel||'')}</div></div></div>${p.contact.phone?telLink(p.contact.phone):''}<div class="lbl mt mb">Care team</div>${team.length?`<div class="av-stack">${team.map(s => av(s.name, s.color, 'sm')).join('')}</div><div class="small muted mt-s">${team.map(s => esc(first(s.name))).join(', ')}</div>`:'<div class="small muted">Assigned when visits are scheduled</div>'}</div>
    <div class="card"><div class="card-h"><h3>Home location</h3><button class="btn btn-soft btn-xs" data-act="setPatientLoc" data-id="${p.id}">${I('pin','xs')} ${p.lat==null?'Set':'Change'}</button></div>${p.lat!=null?`<div class="map" id="pp-map" style="height:170px"></div><div class="row between mt-s"><span class="tiny muted tnum">${(+p.lat).toFixed(5)}, ${(+p.lng).toFixed(5)} · geofence ${S().settings.geofence} m</span><a class="btn-text tiny" href="${mapsLink(p.lat,p.lng)}" target="_blank" rel="noopener">Maps ↗</a></div>`:emptyState('pin','Not set yet')}</div></div>
  <div class="grid g2 mt-l">
    <div class="card"><div class="card-h"><h3>Clinical</h3></div><dl class="kv"><dt>Diagnosis</dt><dd>${(p.dx||[]).map(esc).join('<br>')||'—'}</dd><dt>Services</dt><dd>${(p.services||[]).map(s => svc(s).name).join('<br>')}</dd><dt>Doctor</dt><dd>${esc(p.doctor||'—')}</dd><dt>Payer</dt><dd>${esc(p.payer||'Self-pay')}</dd><dt>Referred by</dt><dd>${esc(p.source||'—')}</dd></dl></div>
    <div class="card"><div class="card-h"><div><h3>Care plan</h3><div class="sub">${esc(p.plan||'')}${plan&&plan.review?` · review ${fmtD(plan.review,{day:'numeric',month:'short'})}`:''}</div></div><button class="btn btn-soft btn-xs" data-act="editPlan" data-id="${p.id}">${I('edit','xs')} ${plan?'Edit':'Create'}</button></div>${plan && (plan.goals||[]).length ? plan.goals.map(g => `<div class="mb"><div class="row between small"><span class="sb">${esc(g.g)}</span><b>${g.p||0}%</b></div><div class="bar ${g.p>80?'green':''} mt-s"><i style="width:${g.p||0}%"></i></div></div>`).join('') + (plan.diet?`<div class="small"><b>Diet:</b> ${esc(plan.diet)}</div>`:'') + (plan.activity?`<div class="small mt-s"><b>Activity:</b> ${esc(plan.activity)}</div>`:'') : emptyState('clipboard','No care plan yet')}</div></div>
  <div class="grid g2 mt-l">
    <div class="card"><div class="card-h"><h3>Medicines</h3><button class="btn btn-soft btn-xs" data-act="editMed" data-pid="${p.id}">${I('plus','xs')} Add</button></div>${meds.length ? `<div class="list">${meds.map(m => `<div class="li click" data-act="editMed" data-pid="${p.id}" data-id="${m.id}"><div class="li-ic bg-green">${I('pill','sm')}</div><div class="grow"><div class="t">${esc(m.name)}</div><div class="s">${esc(m.dose||'')} · ${m.sos?'when needed':(m.times||[]).map(fmtT).join(', ')}${m.purpose?' · '+esc(m.purpose):''}</div></div>${m.left!=null&&m.left<=7?`<span class="pill p-red">${m.left} d left</span>`:''}</div>`).join('')}</div>` : emptyState('pill','No medicines added')}</div>
    <div class="card"><div class="card-h"><h3>Documents</h3><label class="btn btn-soft btn-xs">${I('upload','xs')} Upload<input type="file" accept="image/*,.pdf" class="hidden" data-onchange="docUpload" data-pid="${p.id}"></label></div>${docs.length ? `<div class="list">${docs.map(d => `<div class="li click" data-act="viewDoc" data-id="${d.id}" data-pid="${p.id}"><div class="li-ic bg-amber">${I('file','sm')}</div><div class="grow"><div class="t">${esc(d.name)}</div><div class="s">${fmtD(d.date,{day:'numeric',month:'short',year:'numeric'})} · ${esc(d.by)}</div></div>${I('right','sm muted')}</div>`).join('')}</div>` : emptyState('file','No documents')}</div></div>
  ${vit.length>1?`<div class="card mt-l"><div class="card-h"><div><h3>Vitals trend</h3><div class="sub">Blood pressure & sugar</div></div></div>${chart({type:'line', labels:vit.map(x => fmtD(x.date,{day:'numeric',month:'short'})), series:[{values:vit.map(x=>x.sys), color:'#E1343A'},{values:vit.map(x=>x.sugar), color:'#D98A00'}], noArea:true}, 210)}<div class="row gap-l"><span class="legend-row"><i style="background:#E1343A"></i>Systolic BP</span><span class="legend-row"><i style="background:#D98A00"></i>Sugar</span></div></div>`:''}
  <div class="grid g2 mt-l"><div class="card"><div class="card-h"><h3>Upcoming visits</h3></div>${up.length?`<div class="list">${up.map(v => `<div class="li click" data-act="visitModal" data-id="${v.id}"><div class="li-ic" style="background:${svc(v.service).color}18;color:${svc(v.service).color}">${I(svc(v.service).icon,'sm')}</div><div class="grow"><div class="t">${relDay(v.date)} · ${fmtT(v.start)}</div><div class="s">${svc(v.service).short} · ${esc(stfOr(v.sid).name)}</div></div>${vPill(v)}</div>`).join('')}</div>`:emptyState('calendar','None scheduled')}</div>
    <div class="card"><div class="card-h"><h3>Recent visits</h3></div>${past.length?`<div class="list">${past.map(v => `<div class="li click" data-act="visitModal" data-id="${v.id}"><div class="li-ic bg-green">${I('check','sm')}</div><div class="grow"><div class="t">${relDay(v.date)} · ${svc(v.service).short}</div><div class="s ell">${esc(v.notes||'')}</div></div>${v.evv?`<span class="tiny ${v.evv.status==='verified'?'':'b'}" style="color:${v.evv.status==='verified'?'var(--green)':'var(--amber)'}">${fmtDist(v.evv.inDist)}</span>`:''}</div>`).join('')}</div>`:emptyState('calendar','No visits yet')}</div></div>
  <div class="card mt-l"><div class="card-h"><h3>Invoices</h3></div>${inv.length?`<div class="list">${inv.map(i => `<div class="li click" data-act="oInv" data-id="${i.id}"><div class="li-ic ${i.status==='paid'?'bg-green':i.status==='overdue'?'bg-red':'bg-amber'}">${I('file','sm')}</div><div class="grow"><div class="t">${i.id}</div><div class="s">${new Date(i.month+'-01').toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</div></div><b class="tnum">${inr(i.amount)}</b> ${invPill(i)}</div>`).join('')}</div>`:emptyState('file','No invoices')}</div>`;
};
OA.patient = (prm) => { const p = pat(prm.id), el = $('#pp-map'); if(!el || !p || p.lat==null) return; const m = new LiveMap(el, {minSpan:120}); m.set('h', {type:'home', lat:p.lat, lng:p.lng}); m.setFence(p.lat, p.lng, S().settings.geofence); m.fit([[p.lat,p.lng]], 120); };
ACT.discharge = async el => { const p = pat(el.dataset.id); if(await confirmBox({title:`Discharge ${p.name}?`, text:'All future scheduled visits will be cancelled. Records are kept.', ok:'Discharge', cls:'btn-danger'})){ p.status = 'discharged'; S().visits.filter(v => v.pid===p.id && v.status==='scheduled' && v.date>=TODAY()).forEach(v => v.status='cancelled'); Store.save(); toast(`${p.name} discharged`); App.refresh(); } };
ACT.readmit = el => { const p = pat(el.dataset.id); p.status = 'active'; Store.save(); toast(`${p.name} re-admitted`); App.refresh(); };
ACT.setPatientLoc = async el => { const p = pat(el.dataset.id); const r = await pickLocation({lat:p.lat, lng:p.lng, title:`Home of ${p.name}`}); if(!r) return; p.lat = r.lat; p.lng = r.lng; if(!p.addr && r.addr) p.addr = r.addr; Store.save(); toast('Home location saved — GPS clock-in is ready'); App.refresh(); };
const sixDigits = () => String(Math.floor(100000 + Math.random()*900000));
ACT.patientLogin = el => {
  const p = pat(el.dataset.id);
  const m = Modal.open({title:'Patient app access', sub:p.name, body:`<form id="pl2-f" data-submit="savePatientLogin" data-id="${p.id}">
    <div class="field"><label>Family mobile number (used to sign in)</label><div class="input-group"><span class="pre">+91</span><input name="phone" inputmode="numeric" value="${esc(String((p.login&&p.login.phone)||p.contact.phone||p.phone||'').replace(/\D/g,'').slice(-10))}" required></div></div>
    <div class="field"><label>6-digit access code</label><input class="input tnum" name="code" inputmode="numeric" maxlength="6" value="${sixDigits()}" required style="letter-spacing:.3em;font-weight:800;font-size:20px"></div>
    <div class="hint">${I('info','sm')}<span>Share the code with the family privately. You can generate a new one any time.</span></div></form>`,
    foot:`<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" form="pl2-f" id="pl2-btn">${I('lock','sm')} Save access</button>`});
};
FORM.savePatientLogin = f => busy($('#pl2-btn'), async () => {
  const p = pat(f.dataset.id), phone = f.phone.value.replace(/\D/g,'').slice(-10), code = f.code.value.trim();
  try{ await Sync.settle(); await Cloud.admin('patient_login', {patient_id:p.id, phone, code}); p.login = {phone, at:new Date().toISOString()}; Sync.snap.patients && Sync.snap.patients.set(p.id, stable(p));
    const L = appLinkInfo(), msg = `Careva+ app for ${p.name}\n1. ${L.open}\n2. Tap "Patient & Family"\n3. Mobile: ${phone}\n4. Access code: ${code}${L.tip ? '\n' + L.tip : ''}`;
    Modal.close(f); Modal.open({title:'Access ready', body:`<div class="center"><div class="li-ic bg-green" style="width:64px;height:64px;border-radius:50%;margin:0 auto">${I('check','lg')}</div><p class="mt">Mobile <b>+91 ${phone}</b></p><div class="code-big tnum">${code}</div></div><pre class="share">${esc(msg)}</pre>`, foot:`<button class="btn btn-ghost" data-act="copyTxt" data-t="${esc(msg)}">${I('copy','sm')} Copy message</button><a class="btn btn-green" href="https://wa.me/91${phone}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">WhatsApp</a>`}); App.refresh();
  }catch(e){ toast(isNetErr(e) ? 'No internet connection' : e.message,'err'); }
});
ACT.copyTxt = el => copyText(el.dataset.t);
ACT.removeLogin = async el => { const kind = el.dataset.kind, r = kind==='staff' ? stf(el.dataset.id) : pat(el.dataset.id); if(!await confirmBox({title:'Remove app login?', text:`${r.name} will be signed out and can no longer use the app until you create a new ${kind==='staff'?'PIN':'access code'}.`, ok:'Remove login', cls:'btn-danger'})) return;
  try{ await Cloud.admin('remove_login', {kind, id:r.id}); delete r.login; const t = kind==='staff'?'staff':'patients'; Sync.snap[t] && Sync.snap[t].set(r.id, stable(r)); Modal.closeAll(); toast('Login removed'); App.refresh(); }catch(e){ toast(e.message,'err'); } };
ACT.editMed = el => {
  const pid = el.dataset.pid, list = (S().meds[pid] ||= []), m = list.find(x => x.id===el.dataset.id) || {times:['08:00'], left:30};
  const times = ['06:00','07:00','08:00','09:00','12:00','13:00','14:00','17:00','18:00','20:00','21:00','22:00'];
  Modal.open({title:m.id?'Edit medicine':'Add medicine', body:`<form id="md-f" data-submit="saveMed" data-pid="${pid}" data-id="${m.id||''}">
    <div class="field"><label>Medicine & strength</label><input class="input" name="name" value="${esc(m.name||'')}" placeholder="e.g. Metformin 500 mg" required></div>
    <div class="f2"><div class="field"><label>Dose</label><input class="input" name="dose" value="${esc(m.dose||'1 tablet')}"></div><div class="field"><label>Purpose</label><input class="input" name="purpose" value="${esc(m.purpose||'')}" placeholder="e.g. Diabetes"></div></div>
    <div class="f2"><div class="field"><label>Instructions</label><input class="input" name="when" value="${esc(m.when||'After food')}"></div><div class="field"><label>Days of stock left</label><input class="input" name="left" inputmode="numeric" value="${m.left??''}"></div></div>
    <label class="row small sb mb"><input type="checkbox" name="sos" ${m.sos?'checked':''} style="accent-color:var(--blue)"> Only when needed (SOS)</label>
    <div class="lbl mb">Times each day</div><div class="chips">${times.map(t => `<label class="chip"><input type="checkbox" name="t" value="${t}" ${(m.times||[]).includes(t)?'checked':''} style="accent-color:var(--blue)">${fmtT(t)}</label>`).join('')}</div></form>`,
    foot:`${m.id?`<button class="btn btn-ghost" data-act="delMed" data-pid="${pid}" data-id="${m.id}" style="color:var(--red)">Delete</button>`:''}<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" form="md-f">Save</button>`});
};
FORM.saveMed = f => { const d = new FormData(f), pid = f.dataset.pid, list = (S().meds[pid] ||= []); let m = list.find(x => x.id===f.dataset.id); if(!m){ m = {id:uid('md'), pid}; list.push(m); }
  Object.assign(m, {name:d.get('name').trim(), dose:d.get('dose'), purpose:d.get('purpose'), when:d.get('when'), left:d.get('left')===''?null:+d.get('left'), sos:!!d.get('sos'), times:d.get('sos')?[]:d.getAll('t').sort()});
  Store.save(); Modal.close(f); toast('Medicine saved'); App.refresh(); };
ACT.delMed = el => { const list = S().meds[el.dataset.pid] || []; S().meds[el.dataset.pid] = list.filter(x => x.id!==el.dataset.id); Store.save(); Modal.closeAll(); toast('Medicine removed'); App.refresh(); };
ACT.editPlan = el => {
  const p = pat(el.dataset.id), c = S().carePlan[p.id] || {goals:[]};
  Modal.open({title:'Care plan', sub:p.name, wide:true, body:`<form id="cp-f" data-submit="savePlan" data-id="${p.id}">
    <div class="field"><label>Plan name</label><input class="input" name="plan" value="${esc(p.plan||'')}" placeholder="e.g. Post-hip rehab · 60-day plan"></div>
    <div class="lbl mb">Goals & progress</div><div id="cp-goals">${(c.goals.length?c.goals:[{g:'',p:0}]).map(g => goalRow(g)).join('')}</div><button class="btn btn-ghost btn-sm mb" type="button" data-act="addGoal">${I('plus','sm')} Add goal</button>
    <div class="f2"><div class="field"><label>Diet</label><input class="input" name="diet" value="${esc(c.diet||'')}"></div><div class="field"><label>Activity</label><input class="input" name="activity" value="${esc(c.activity||'')}"></div></div>
    <div class="field"><label>Next review date</label><input class="input" type="date" name="review" value="${c.review||''}"></div></form>`,
    foot:`<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" form="cp-f">Save plan</button>`});
};
const goalRow = g => `<div class="row mb goal-row" style="gap:8px"><input class="input grow" name="g" value="${esc(g.g||'')}" placeholder="Goal, e.g. Walk 50 m with walker"><input class="input" name="gp" type="number" min="0" max="100" value="${g.p||0}" style="width:84px" aria-label="Progress %"><span class="small muted">%</span></div>`;
ACT.addGoal = () => $('#cp-goals').insertAdjacentHTML('beforeend', goalRow({}));
FORM.savePlan = f => { const p = pat(f.dataset.id), d = new FormData(f), gs = d.getAll('g'), ps = d.getAll('gp');
  S().carePlan[p.id] = {pid:p.id, goals:gs.map((g,i) => ({g:g.trim(), p:clamp(+ps[i]||0,0,100)})).filter(x => x.g), diet:d.get('diet'), activity:d.get('activity'), review:d.get('review')||null, updated:TODAY()};
  p.plan = d.get('plan'); Store.save(); Modal.close(f); toast('Care plan saved'); App.refresh(); };
ACT.newPatient = () => patientForm({});
ACT.editPatient = el => patientForm(pat(el.dataset.id));
function patientForm(pre){
  const editing = !!pre.id; let loc = pre.lat!=null ? {lat:pre.lat, lng:pre.lng} : null;
  const m = Modal.open({title:editing?'Edit patient':'New patient intake', sub:editing?pre.id:'Creates the patient record and care profile', wide:true, body:`<form id="np-f" data-submit="savePatient" data-id="${pre.id||''}" data-rq="${pre.rq||''}">
    <div class="f3"><div class="field"><label>Full name</label><input class="input" name="name" required value="${esc(pre.name||'')}"></div><div class="field"><label>Age</label><input class="input" name="age" inputmode="numeric" required value="${esc(pre.age||'')}"></div><div class="field"><label>Gender</label><select class="select" name="g"><option value="F" ${pre.g==='F'?'selected':''}>Female</option><option value="M" ${pre.g==='M'?'selected':''}>Male</option></select></div></div>
    <div class="f3"><div class="field"><label>Mobile</label><input class="input" name="phone" inputmode="tel" required value="${esc(pre.phone||'')}"></div><div class="field"><label>Area / locality</label><input class="input" name="area" list="areas-dl2" value="${esc(pre.area||'')}"></div><div class="field"><label>Risk level</label><select class="select" name="risk">${['Low','Medium','High'].map(r => `<option ${r===(pre.risk||'Medium')?'selected':''}>${r}</option>`).join('')}</select></div></div>
    <datalist id="areas-dl2">${Object.keys(AREAS).map(a => `<option value="${a}">`).join('')}</datalist>
    <div class="field"><label>Address</label><input class="input" name="addr" placeholder="Door no., street, landmark" required value="${esc(pre.addr||'')}"></div>
    <div class="field"><label>Home location (for GPS check-in)</label><div class="row" style="gap:8px"><button class="btn ${loc?'btn-soft':'btn-primary'} btn-sm" type="button" id="np-loc">${I('pin','sm')} ${loc?'Change location':'Pin home on map'}</button><span class="small muted tnum" id="np-ll">${loc?`${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`:'Not set'}</span></div></div>
    <div class="lbl mb">Services</div><div class="chips mb">${SERVICES.map(s => `<label class="chip"><input type="checkbox" name="svc" value="${s.id}" ${(pre.services||[pre.service]).includes(s.id)?'checked':''} style="accent-color:var(--blue)">${s.short}</label>`).join('')}</div>
    <div class="f2"><div class="field"><label>Diagnosis / reason for care</label><input class="input" name="dx" placeholder="Separate with commas" value="${esc((pre.dx||[]).join(', '))}"></div><div class="field"><label>Allergies</label><input class="input" name="allergies" placeholder="None" value="${esc((pre.allergies||[]).join(', '))}"></div></div>
    <div class="f3"><div class="field"><label>Family contact</label><input class="input" name="cn" value="${esc((pre.contact||{}).name||'')}"></div><div class="field"><label>Relationship</label><input class="input" name="cr" value="${esc((pre.contact||{}).rel||'Son')}"></div><div class="field"><label>Contact mobile</label><input class="input" name="cp" inputmode="tel" value="${esc((pre.contact||{}).phone||'')}"></div></div>
    <div class="f3"><div class="field"><label>Referring doctor</label><input class="input" name="doctor" value="${esc(pre.doctor||'')}"></div><div class="field"><label>Blood group</label><select class="select" name="blood">${['—','A+','A-','B+','B-','O+','O-','AB+','AB-'].map(b => `<option ${b===(pre.blood||'—')?'selected':''}>${b}</option>`).join('')}</select></div><div class="field"><label>Payer</label><select class="select" name="payer">${['Self-pay','Insurance','Corporate'].map(x => `<option ${x===(pre.payer||'Self-pay')?'selected':''}>${x}</option>`).join('')}</select></div></div>
    <div class="field"><label>Referral source</label><select class="select" name="source">${['Hospital discharge','Doctor referral','Website / app','Word of mouth','Other'].map(x => `<option ${x===(pre.source||'')?'selected':''}>${x}</option>`).join('')}</select></div></form>`,
    foot:`<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" form="np-f">${editing?'Save changes':'Create patient'}</button>`});
  m.querySelector('#np-loc').onclick = async () => { const f = m.querySelector('#np-f'); const r = await pickLocation({lat:loc&&loc.lat, lng:loc&&loc.lng, title:'Pin the patient’s home'}); if(!r) return; loc = {lat:r.lat, lng:r.lng}; m.querySelector('#np-ll').textContent = `${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}`; if(r.addr && !f.addr.value) f.addr.value = r.addr.split(',').slice(0,4).join(','); f.dataset.lat = r.lat; f.dataset.lng = r.lng; };
  if(loc){ const f = m.querySelector('#np-f'); f.dataset.lat = loc.lat; f.dataset.lng = loc.lng; }
}
FORM.savePatient = f => {
  const d = new FormData(f), g = k => (d.get(k)||'').toString().trim(), svcs = d.getAll('svc');
  if(!svcs.length) return toast('Select at least one service','err');
  const fields = {name:g('name'), age:+g('age'), g:g('g'), phone:g('phone'), area:g('area'), addr:g('addr'), services:svcs, dx:g('dx')?g('dx').split(',').map(x=>x.trim()).filter(Boolean):['Assessment pending'], allergies:g('allergies')&&!/^none$/i.test(g('allergies'))?g('allergies').split(',').map(x=>x.trim()).filter(Boolean):[], contact:{name:g('cn')||g('name'), rel:g('cr')||'Self', phone:g('cp')||g('phone')}, risk:g('risk'), payer:g('payer'), doctor:g('doctor'), blood:g('blood'), source:g('source')};
  if(f.dataset.lat){ fields.lat = +f.dataset.lat; fields.lng = +f.dataset.lng; }
  let p = f.dataset.id && pat(f.dataset.id);
  if(p){ Object.assign(p, fields); Store.save(); Modal.close(f); toast('Patient updated'); return App.refresh(); }
  const nums = S().patients.map(x => +String(x.id).slice(1)).filter(n => n>0), n = nums.length ? Math.max(...nums)+1 : 1001;
  p = {id:'P'+n, ...fields, lat:fields.lat ?? null, lng:fields.lng ?? null, status:'active', since:TODAY()};
  S().patients.push(p);
  const rq = f.dataset.rq && S().requests.find(x => x.id===f.dataset.rq); if(rq) rq.pid = p.id;
  Store.save(); Modal.close(f); toast(`${p.name} added as ${p.id}${p.lat==null?' — remember to pin the home location':''}`);
  if(rq) ACT.approveReq({dataset:{id:rq.id}}); else App.go('patient',{id:p.id});
};

/* ---------------- REQUESTS ---------------- */
OV.requests = () => {
  const pend = pendingReqs(), rs = reschedReqs(), done = S().requests.filter(r => r.status!=='pending').slice(0,8);
  const who = r => r.pid ? pat(r.pid) : null;
  return `<div class="page-h"><div><h1>Requests</h1><p>${pend.length} new bookings · ${rs.length} reschedule requests</p></div></div>
  ${pend.length?`<div class="grid g2">${pend.map(r => { const p = who(r); return `<div class="card"><div class="row top">${av(p?p.name:r.lead.name, p?patColor(p.id):'#97A4B6')}<div class="grow"><div class="row wrap" style="gap:6px"><b>${esc(p?p.name:r.lead.name)}</b>${p?`<span class="pill p-blue">${p.id}</span>`:'<span class="pill p-violet">New enquiry</span>'}</div><div class="small muted">${esc(r.source)} · ${timeAgo(r.created)}</div></div></div>
    <div class="evv mt"><div><span>Service</span><b style="font-size:13.5px">${svc(r.service).short}</b></div><div><span>Date</span><b style="font-size:13.5px">${relDay(r.date)}</b></div><div><span>Time</span><b style="font-size:13.5px">${fmtT(r.slot)}</b></div></div>
    ${r.notes?`<p class="small ink2 mt">“${esc(r.notes)}”</p>`:''}${!p?`<div class="small muted mt-s">${esc(r.lead.area)} · ${r.lead.age?r.lead.age+' yrs · ':''}${fmtPhone(r.lead.phone)}</div>`:''}
    <div class="row mt wrap" style="gap:8px"><button class="btn btn-primary btn-sm" data-act="approveReq" data-id="${r.id}">${I('check','sm')} ${p?'Approve & assign':'Create patient & assign'}</button>${!p?`<a class="btn btn-ghost btn-sm" href="tel:+91${String(r.lead.phone).replace(/\s/g,'')}">${I('phone','sm')} Call</a>`:''}<button class="btn btn-ghost btn-sm" data-act="declineReq" data-id="${r.id}">Decline</button></div></div>`; }).join('')}</div>` : `<div class="card">${emptyState('inbox','No new booking requests')}</div>`}
  ${rs.length?`<div class="sec-h"><h2>Reschedule requests</h2></div><div class="grid g2">${rs.map(v => { const p = pat(v.pid); return `<div class="card"><div class="row">${av(p.name,patColor(p.id))}<div class="grow"><b>${esc(p.name)}</b><div class="small muted">${svc(v.service).short} with ${esc(stfOr(v.sid).name)} · ${esc(v.reschedReq.reason)}</div></div></div><div class="row mt small"><span class="pill p-gray">${relDay(v.date)} ${fmtT(v.start)}</span>${I('right','sm muted')}<span class="pill p-blue">${relDay(v.reschedReq.date)} ${fmtT(v.reschedReq.start)}</span></div><div class="row mt" style="gap:8px"><button class="btn btn-primary btn-sm" data-act="approveRes" data-id="${v.id}">Approve</button><button class="btn btn-ghost btn-sm" data-act="declineRes" data-id="${v.id}">Decline</button></div></div>`; }).join('')}</div>`:''}
  ${done.length?`<div class="sec-h"><h2>Recently handled</h2></div><div class="card"><div class="list">${done.map(r => `<div class="li"><div class="li-ic ${r.status==='approved'?'bg-green':'bg-red'}">${I(r.status==='approved'?'check':'x','sm')}</div><div class="grow"><div class="t">${esc(r.pid?pat(r.pid).name:r.lead.name)} · ${svc(r.service).short}</div><div class="s">${r.status==='approved'?`Assigned to ${esc(stf(r.sid)?.name||'')}`:'Declined'} · ${relDay(r.date)} ${fmtT(r.slot)}</div></div></div>`).join('')}</div></div>`:''}`;
};
function rankStaff(service, date, start, dur, near){
  return S().staff.filter(s => s.active!==false).map(s => {
    const vs = S().visits.filter(v => v.sid===s.id && v.date===date && !['cancelled','missed'].includes(v.status));
    const clash = vs.find(v => toMin(start) < toMin(v.start)+v.dur && toMin(v.start) < toMin(start)+dur);
    const g = S().gps[s.id], base = s.lat!=null ? {lat:s.lat, lng:s.lng} : (g && g.lat!=null ? g : AREAS[s.area] ? {lat:AREAS[s.area][0], lng:AREAS[s.area][1]} : null);
    const d = near && near.lat!=null && base ? haversine(base, near) : null;
    const skill = (s.skills||[]).includes(service);
    return {s, clash, d, skill, load:vs.length, score:(skill?0:1000)+(clash?500:0)+(d==null?30:d/100)+vs.length*3+(s.avail&&s.avail[date]===false?800:0)};
  }).sort((a,b) => a.score-b.score);
}
ACT.approveReq = el => {
  const r = S().requests.find(x => x.id===el.dataset.id);
  if(!r.pid){ Modal.closeAll(); return patientForm({name:r.lead.name, age:r.lead.age, phone:r.lead.phone, area:r.lead.area, service:r.service, contact:{name:'', rel:'Son', phone:r.lead.phone}, rq:r.id}); }
  if(!S().staff.filter(s => s.active!==false).length) return toast('Add a staff member first (Staff → Add staff)','err');
  const p = pat(r.pid), dur = r.service==='elder'?240:r.service==='palliative'?60:45;
  const ranked = rankStaff(r.service, r.date, r.slot, dur, p);
  const m = Modal.open({title:'Assign staff', sub:`${p.name} · ${svc(r.service).name} · ${relDay(r.date)}`, wide:true, body:`
    <div class="f2"><div class="field"><label>Date</label><input class="input" type="date" id="ar-d" value="${r.date}"></div><div class="field"><label>Start time</label><input class="input" type="time" id="ar-t" value="${r.slot}"></div></div>
    <div class="lbl mb">Suggested staff <span class="muted">— ranked by skill, availability and distance</span></div>
    <div class="col" style="gap:8px" id="ar-list">${ranked.slice(0,5).map((x,i) => `<label class="chip ${i===0?'on':''}" style="height:auto;padding:10px 12px;justify-content:flex-start"><input type="radio" name="ar-s" value="${x.s.id}" ${i===0?'checked':''} style="accent-color:var(--blue)">${av(x.s.name,x.s.color,'sm')}<span class="grow" style="text-align:left"><b>${esc(x.s.name)}</b> <span class="small muted">· ${x.s.short}</span><br><span class="tiny muted">${x.d==null?'distance unknown':fmtDist(x.d)+' from patient'} · ${x.load} visits that day</span></span>${x.skill?'<span class="pill p-green">Skill match</span>':'<span class="pill p-gray">Other skill</span>'}${x.clash?'<span class="pill p-red">Clash</span>':''}${i===0?'<span class="pill p-blue">Best</span>':''}</label>`).join('')}</div>
    <label class="row mt small sb"><input type="checkbox" id="ar-rep" style="accent-color:var(--blue)"> Repeat weekly for 4 weeks</label>`,
    foot:`<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="ar-ok">${I('check','sm')} Confirm visit</button>`});
  m.querySelector('#ar-list').onchange = () => $$('#ar-list .chip').forEach(c => c.classList.toggle('on', c.querySelector('input').checked));
  m.querySelector('#ar-ok').onclick = () => {
    const sid = m.querySelector('[name="ar-s"]:checked').value, d = $('#ar-d').value, t = $('#ar-t').value, reps = $('#ar-rep').checked ? 4 : 1;
    for(let k=0;k<reps;k++) S().visits.push({id:uid('V'), pid:p.id, sid, service:r.service, date:dstr(addDays(parseD(d), k*7)), start:t, dur, status:'scheduled', tasks:TASKS[r.service].map(x => ({t:x, done:false})), notes:'', vitals:null, evv:null, sig:null, rating:null, photos:[]});
    Object.assign(r, {status:'approved', sid, date:d, slot:t}); S().alerts.filter(a => a.kind==='request' && a.text.includes(p.name)).forEach(a => a.done = true);
    notifyPatient(p.id, `Your ${svc(r.service).name} visit on ${relDay(d)} at ${fmtT(t)} is confirmed with ${stf(sid).name}.`);
    addMsg(`${sid}|office`, 'office', `New visit assigned: ${p.name} (${p.area}) — ${svc(r.service).name}, ${relDay(d)} ${fmtT(t)}.`);
    Store.save(); Modal.close(m); toast(`Confirmed with ${stf(sid).name} · patient & staff notified`); App.refresh();
  };
};
ACT.declineReq = async el => { const r = S().requests.find(x => x.id===el.dataset.id); if(await confirmBox({title:'Decline request?', text:'The patient will be notified that the slot is unavailable and asked to choose another time.', ok:'Decline', cls:'btn-danger'})){ r.status = 'declined'; if(r.pid) notifyPatient(r.pid, `Sorry, we couldn’t confirm ${relDay(r.date)} ${fmtT(r.slot)}. Please choose another slot.`); Store.save(); App.refresh(); } };
ACT.approveRes = el => { const v = visit(el.dataset.id); v.date = v.reschedReq.date; v.start = v.reschedReq.start; v.reschedReq.done = true; notifyPatient(v.pid, `Your visit is moved to ${relDay(v.date)} at ${fmtT(v.start)}.`); addMsg(`${v.sid}|office`,'office',`Visit moved: ${pat(v.pid).name} → ${relDay(v.date)} ${fmtT(v.start)}.`); S().alerts.filter(a => a.vid===v.id).forEach(a => a.done = true); Store.save(); toast('Visit rescheduled'); App.refresh(); };
ACT.declineRes = el => { const v = visit(el.dataset.id); v.reschedReq.done = true; notifyPatient(v.pid, `Your reschedule request could not be accommodated. The visit stays on ${relDay(v.date)} at ${fmtT(v.start)}.`); Store.save(); App.refresh(); };

/* ---------------- SCHEDULE ---------------- */
OV.schedule = (prm) => {
  const start = prm.w || TODAY(), days = Array.from({length:7}, (_,i) => dstr(addDays(parseD(start), i)));
  const vs = S().visits.filter(v => days.includes(v.date) && v.status!=='cancelled');
  const hrs = sid => sum(vs.filter(v => v.sid===sid).map(v => v.dur))/60;
  return `<div class="page-h"><div><h1>Scheduling</h1><p>${vs.length} visits · ${fmtD(days[0],{day:'numeric',month:'short'})} – ${fmtD(days[6],{day:'numeric',month:'short'})}</p></div>
    <div class="row" style="gap:8px"><button class="icon-btn" data-go="schedule" data-p='{"w":"${dstr(addDays(parseD(start),-7))}"}'>${I('left','sm')}</button><button class="btn btn-ghost btn-sm" data-go="schedule">This week</button><button class="icon-btn" data-go="schedule" data-p='{"w":"${dstr(addDays(parseD(start),7))}"}'>${I('right','sm')}</button><button class="btn btn-primary btn-sm" data-act="newVisit">${I('plus','sm')} New visit</button></div></div>
  <div class="row wrap mb" style="gap:12px">${SERVICES.map(s => `<span class="legend-row"><i style="background:${s.color}"></i>${s.short}</span>`).join('')}</div>
  <div class="card pad-0" style="overflow:auto;max-height:76vh"><div class="cal"><div class="cal-h" style="left:0;z-index:3;position:sticky">Staff</div>${days.map(d => `<div class="cal-h ${d===TODAY()?'today':''}">${fmtD(d,{weekday:'short',day:'numeric'})}${d===TODAY()?' · Today':''}</div>`).join('')}
    ${S().staff.filter(s => s.active!==false).map(s => `<div class="cal-s">${av(s.name,s.color,'sm')}<div style="min-width:0"><div class="b small ell">${esc(s.name)}</div><div class="tiny muted">${s.short} · ${hrs(s.id).toFixed(0)} h</div></div></div>${days.map(d => `<div class="cal-c ${d===TODAY()?'today':''}">${vs.filter(v => v.sid===s.id && v.date===d).sort(byTime).map(v => `<div class="ev" data-act="visitModal" data-id="${v.id}" style="border-color:${svc(v.service).color};background:${svc(v.service).color}12;${v.status==='completed'?'opacity:.6':''}">${fmtT(v.start)}${isLate(v)?' ⚠':''}<small>${esc(pat(v.pid).name.split(' ')[0])} · ${svc(v.service).short}</small></div>`).join('')}${(s.avail&&s.avail[d]===false)?'<span class="pill p-gray" style="height:20px">Unavailable</span>':''}</div>`).join('')}`).join('')}
  </div></div>`;
};
ACT.visitModal = el => {
  const v = visit(el.dataset.id), p = pat(v.pid);
  Modal.closeAll();
  Modal.open({title:`${esc(p.name)} · ${svc(v.service).short}`, sub:`${relDay(v.date)} · ${fmtT(v.start)} – ${fmtT(visitEnd(v))}`, wide:true, body:`
    ${['completed','inprogress'].includes(v.status) ? visitSummaryHTML(v) : `<div class="row mb">${vPill(v)}<span class="small muted">${esc(p.addr)}</span></div>
    <form id="vm-f" data-submit="saveVisit" data-id="${v.id}"><div class="f3"><div class="field"><label>Date</label><input class="input" type="date" name="date" value="${v.date}"></div><div class="field"><label>Start</label><input class="input" type="time" name="start" value="${v.start}"></div><div class="field"><label>Minutes</label><input class="input" name="dur" inputmode="numeric" value="${v.dur}"></div></div>
    <div class="field"><label>Assigned staff</label><select class="select" name="sid">${rankStaff(v.service, v.date, v.start, v.dur, p).map(x => `<option value="${x.s.id}" ${x.s.id===v.sid?'selected':''}>${esc(x.s.name)} (${x.s.short}) · ${x.d==null?'':fmtDist(x.d)}${x.skill?'':' · other skill'}${x.clash&&x.s.id!==v.sid?' · CLASH':''}</option>`).join('')}</select></div></form>`}`,
    foot: ['completed','inprogress'].includes(v.status) ? `<button class="btn btn-ghost" data-go="patient" data-p='{"id":"${p.id}"}'>Patient record</button><button class="btn btn-primary" data-close>Close</button>` : `<button class="btn btn-ghost" data-act="cancelVisit" data-id="${v.id}" style="color:var(--red)">Cancel visit</button><button class="btn btn-primary" form="vm-f">Save changes</button>`});
};
FORM.saveVisit = f => {
  const v = visit(f.dataset.id), d = Object.fromEntries(new FormData(f)), old = v.sid;
  const clash = S().visits.find(x => x.id!==v.id && x.sid===d.sid && x.date===d.date && !['cancelled','missed'].includes(x.status) && toMin(d.start) < toMin(x.start)+x.dur && toMin(x.start) < toMin(d.start)+(+d.dur));
  if(clash) return toast(`${stf(d.sid).name} already has ${pat(clash.pid).name} at ${fmtT(clash.start)}`,'err',3200);
  Object.assign(v, {date:d.date, start:d.start, dur:+d.dur, sid:d.sid});
  if(old!==d.sid){ addMsg(`${d.sid}|office`,'office',`Visit assigned to you: ${pat(v.pid).name}, ${relDay(v.date)} ${fmtT(v.start)}.`); notifyPatient(v.pid, `Your ${relDay(v.date)} visit will now be with ${stf(d.sid).name}.`); S().alerts.filter(a => a.vid===v.id).forEach(a => a.done = true); }
  Store.save(); Modal.close(f); toast('Visit updated'); App.refresh();
};
ACT.cancelVisit = async el => { const v = visit(el.dataset.id); Modal.closeAll(); if(await confirmBox({title:'Cancel visit?', text:`${pat(v.pid).name} · ${relDay(v.date)} ${fmtT(v.start)}. The patient and staff will be notified.`, ok:'Cancel visit', cls:'btn-danger'})){ v.status = 'cancelled'; notifyPatient(v.pid, `Your visit on ${relDay(v.date)} at ${fmtT(v.start)} was cancelled by the office.`); Store.save(); toast('Visit cancelled','warn'); App.refresh(); } };
ACT.newVisit = el => {
  const pid = el && el.dataset && el.dataset.pid;
  if(!S().patients.some(p => p.status==='active')) return toast('Add a patient first (Patients → New patient)','err');
  if(!S().staff.some(s => s.active!==false)) return toast('Add a staff member first (Staff → Add staff)','err');
  Modal.open({title:'Schedule a visit', wide:true, body:`<form id="nv-f" data-submit="saveNewVisit"><div class="f2"><div class="field"><label>Patient</label><select class="select" name="pid">${S().patients.filter(p => p.status==='active').map(p => `<option value="${p.id}" ${p.id===pid?'selected':''}>${esc(p.name)} · ${p.area}</option>`).join('')}</select></div><div class="field"><label>Service</label><select class="select" name="service">${SERVICES.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div></div>
    <div class="f3"><div class="field"><label>Date</label><input class="input" type="date" name="date" value="${dOff(1)}" min="${TODAY()}"></div><div class="field"><label>Start</label><input class="input" type="time" name="start" value="10:00"></div><div class="field"><label>Minutes</label><input class="input" name="dur" value="45" inputmode="numeric"></div></div>
    <div class="field"><label>Staff</label><select class="select" name="sid">${S().staff.filter(s => s.active!==false).map(s => `<option value="${s.id}">${esc(s.name)} (${s.short}) — ${(s.skills||[]).map(x => svc(x).short).join(', ')}</option>`).join('')}</select></div>
    <label class="row small sb"><input type="checkbox" name="rep" style="accent-color:var(--blue)"> Repeat weekly for 4 weeks</label></form>`,
    foot:`<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" form="nv-f">Schedule</button>`});
};
FORM.saveNewVisit = f => {
  const d = Object.fromEntries(new FormData(f)), reps = d.rep ? 4 : 1, dur = +d.dur || 45;
  for(let k=0;k<reps;k++){ const date = dstr(addDays(parseD(d.date), k*7)); const clash = S().visits.find(x => x.sid===d.sid && x.date===date && !['cancelled','missed'].includes(x.status) && toMin(d.start) < toMin(x.start)+x.dur && toMin(x.start) < toMin(d.start)+dur); if(clash) return toast(`Clash on ${relDay(date)}: ${stf(d.sid).name} is with ${pat(clash.pid).name} at ${fmtT(clash.start)}`,'err',3500); }
  for(let k=0;k<reps;k++) S().visits.push({id:uid('V'), pid:d.pid, sid:d.sid, service:d.service, date:dstr(addDays(parseD(d.date), k*7)), start:d.start, dur, status:'scheduled', tasks:TASKS[d.service].map(x => ({t:x, done:false})), notes:'', vitals:null, evv:null, sig:null, rating:null, photos:[]});
  notifyPatient(d.pid, `New visit scheduled: ${svc(d.service).name} on ${relDay(d.date)} at ${fmtT(d.start)} with ${stf(d.sid).name}.`);
  addMsg(`${d.sid}|office`,'office',`New visit: ${pat(d.pid).name}, ${relDay(d.date)} ${fmtT(d.start)}${reps>1?' (weekly × 4)':''}.`);
  Store.save(); Modal.close(f); toast('Visit scheduled · staff & family notified'); App.refresh();
};

/* ---------------- STAFF ---------------- */
OV.staffs = () => { const list = S().staff.slice().sort((a,b) => (a.active===false) - (b.active===false) || a.id.localeCompare(b.id));
  return `<div class="page-h"><div><h1>Staff</h1><p>${S().staff.filter(s => s.active!==false && staffNow(s).state!=='off').length} on duty now · ${S().staff.flatMap(s => s.certs||[]).filter(c => parseD(c.exp) < addDays(new Date(),30)).length} credentials need renewal</p></div><button class="btn btn-primary" data-act="newStaff">${I('plus','sm')} Add staff</button></div>
  ${list.length ? `<div class="grid g3">${list.map(s => { const n = staffNow(s), tv = todayV().filter(v => v.sid===s.id), warn = (s.certs||[]).filter(c => parseD(c.exp) < addDays(new Date(),30));
    return `<div class="card click" data-act="staffModal" data-id="${s.id}" style="cursor:pointer;${s.active===false?'opacity:.55':''}"><div class="row">${av(s.name, s.color, 'lg', n.state!=='off')}<div class="grow"><div class="b">${esc(s.name)}</div><div class="small muted">${esc(s.role)} · ${s.id}</div></div>${s.active===false?'<span class="pill p-gray">Inactive</span>':statePill(n.state)}</div>
      <div class="evv mt"><div><span>Today</span><b>${tv.filter(v=>v.status==='completed').length}/${tv.length}</b></div><div><span>Rating</span><b>★ ${ratingOf(s)}</b></div><div><span>App</span><b style="color:${s.login?'var(--green)':'var(--amber)'}">${s.login?'Active':'No PIN'}</b></div></div>
      <div class="chips mt">${(s.skills||[]).map(x => `<span class="pill" style="background:${svc(x).color}15;color:${svc(x).color}">${svc(x).short}</span>`).join('')}${warn.map(c => `<span class="pill ${parseD(c.exp)<new Date()?'p-red':'p-amber'}">${I('award','xs')} ${esc(c.n.split(' ')[0])} ${parseD(c.exp)<new Date()?'expired':'expiring'}</span>`).join('')}</div></div>`; }).join('')}</div>`
  : `<div class="card">${emptyState('users','No staff yet','Add nurses, physiotherapists and caregivers. Each gets an employee ID and a 6-digit PIN to sign in to the staff app.')}<div class="center"><button class="btn btn-primary" data-act="newStaff">${I('plus','sm')} Add staff</button></div></div>`}`; };
const ROLES = [['Registered Nurse','RN'],['Staff Nurse','GNM'],['Physiotherapist','BPT'],['Wound Care Nurse','RN'],['Palliative Care Nurse','RN'],['Patient Care Attendant','PCA']];
const STAFF_COLORS = ['#2B6DE8','#4FA21A','#7B5CE6','#0E9AA7','#D98A00','#E1343A','#C2417F','#11407D'];
ACT.newStaff = () => staffForm({});
ACT.editStaff = el => { Modal.closeAll(); staffForm(stf(el.dataset.id)); };
function staffForm(pre){
  const editing = !!pre.id;
  Modal.open({title:editing?`Edit ${pre.name}`:'Add staff member', sub:editing?pre.id:'An employee ID is created automatically', wide:true, body:`<form id="ns-f" data-submit="saveStaff" data-id="${pre.id||''}">
    <div class="f2"><div class="field"><label>Full name</label><input class="input" name="name" required value="${esc(pre.name||'')}"></div><div class="field"><label>Mobile</label><input class="input" name="phone" inputmode="tel" required value="${esc(pre.phone||'')}"></div></div>
    <div class="f3"><div class="field"><label>Role</label><select class="select" name="role">${ROLES.map(([r,sh]) => `<option value="${r}|${sh}" ${pre.role===r?'selected':''}>${r}</option>`).join('')}</select></div><div class="field"><label>Qualification</label><input class="input" name="qual" value="${esc(pre.qual||'')}" placeholder="e.g. B.Sc Nursing"></div><div class="field"><label>Experience (yrs)</label><input class="input" name="exp" inputmode="numeric" value="${esc(pre.exp??'')}"></div></div>
    <div class="field"><label>Home area</label><input class="input" name="area" list="areas-dl3" value="${esc(pre.area||'')}"><datalist id="areas-dl3">${Object.keys(AREAS).map(a => `<option value="${a}">`).join('')}</datalist></div>
    <div class="lbl mb">Skills (services they can provide)</div><div class="chips mb">${SERVICES.map(s => `<label class="chip"><input type="checkbox" name="sk" value="${s.id}" ${(pre.skills||[]).includes(s.id)?'checked':''} style="accent-color:var(--blue)">${s.short}</label>`).join('')}</div>
    <div class="lbl mb">Credentials & expiry</div><div id="cert-rows">${((pre.certs||[]).length ? pre.certs : [{n:'Nursing / Physio Council Registration', exp:''},{n:'BLS / CPR', exp:''}]).map(c => certRow(c)).join('')}</div>
    <button class="btn btn-ghost btn-sm" type="button" data-act="addCert">${I('plus','sm')} Add credential</button>
    ${editing ? `<label class="row small sb mt"><input type="checkbox" name="inactive" ${pre.active===false?'checked':''} style="accent-color:var(--red)"> Inactive (left Careva+ — hidden from scheduling)</label>` : `<div class="hint mt">${I('lock','sm')}<span>After saving you’ll set their 6-digit PIN for the staff app.</span></div>`}</form>`,
    foot:`<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" form="ns-f">${editing?'Save changes':'Add staff'}</button>`});
}
const certRow = c => `<div class="row mb" style="gap:8px"><input class="input grow" name="cn" value="${esc(c.n||'')}" placeholder="Certificate"><input class="input" type="date" name="ce" value="${esc(c.exp||'')}" style="width:170px" aria-label="Expiry date"></div>`;
ACT.addCert = () => $('#cert-rows').insertAdjacentHTML('beforeend', certRow({}));
FORM.saveStaff = f => {
  const d = new FormData(f), [role, short] = d.get('role').split('|'), sk = d.getAll('sk');
  if(!sk.length) return toast('Pick at least one skill','err');
  const certs = d.getAll('cn').map((n,i) => ({n:n.trim(), exp:d.getAll('ce')[i]})).filter(c => c.n && c.exp);
  const fields = {name:d.get('name').trim(), phone:d.get('phone').trim(), role, short, qual:d.get('qual'), exp:+d.get('exp')||0, area:d.get('area'), skills:sk, certs};
  let s = f.dataset.id && stf(f.dataset.id);
  if(s){ Object.assign(s, fields, {active:!d.get('inactive')}); Store.save(); Modal.close(f); toast('Staff updated'); return App.refresh(); }
  const nums = S().staff.map(x => +String(x.id).slice(1)).filter(n => n>0), n = nums.length ? Math.max(...nums)+1 : 101;
  s = {id:'S'+n, ...fields, color:STAFF_COLORS[(n-101) % STAFF_COLORS.length], active:true, joined:TODAY()};
  S().staff.push(s); Store.save(); Modal.close(f); toast(`${s.name} added as ${s.id}`); App.refresh();
  setTimeout(() => ACT.staffPin({dataset:{id:s.id}}), 400);
};
ACT.staffPin = el => {
  const s = stf(el.dataset.id); Modal.closeAll();
  Modal.open({title:'Staff app PIN', sub:`${s.name} · Employee ID ${s.id}`, body:`<form id="sp-f" data-submit="saveStaffPin" data-id="${s.id}"><div class="field"><label>6-digit PIN</label><input class="input tnum" name="pin" inputmode="numeric" maxlength="6" value="${sixDigits()}" required style="letter-spacing:.3em;font-weight:800;font-size:20px"></div><div class="hint">${I('info','sm')}<span>They sign in with Employee ID <b>${s.id}</b> and this PIN. Share it privately.</span></div></form>`,
    foot:`<button class="btn btn-ghost" data-close>Later</button><button class="btn btn-primary" form="sp-f" id="sp-btn">${I('lock','sm')} Save PIN</button>`});
};
FORM.saveStaffPin = f => busy($('#sp-btn'), async () => {
  const s = stf(f.dataset.id), pin = f.pin.value.trim();
  try{ await Sync.settle(); await Cloud.admin('staff_login', {staff_id:s.id, pin}); s.login = {code:s.id, at:new Date().toISOString()}; Sync.snap.staff && Sync.snap.staff.set(s.id, stable(s));
    const L = appLinkInfo(), msg = `Careva+ staff app\n1. ${L.open}\n2. Tap "Care Staff"\n3. Employee ID: ${s.id}\n4. PIN: ${pin}\nAllow Location when asked.${L.tip ? '\n' + L.tip : ''}`;
    Modal.close(f); Modal.open({title:'PIN saved', body:`<div class="center"><p>Employee ID <b>${s.id}</b></p><div class="code-big tnum">${pin}</div></div><pre class="share">${esc(msg)}</pre>`, foot:`<button class="btn btn-ghost" data-act="copyTxt" data-t="${esc(msg)}">${I('copy','sm')} Copy message</button>${s.phone?`<a class="btn btn-green" href="https://wa.me/91${String(s.phone).replace(/\D/g,'').slice(-10)}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">WhatsApp</a>`:''}`}); App.refresh();
  }catch(e){ toast(isNetErr(e) ? 'No internet connection' : e.message,'err'); }
});

/* ---------------- EVV ---------------- */
OV.evv = (prm) => {
  const f = prm.f || 'all', ev = evvStats(30);
  let vs = S().visits.filter(v => v.evv && v.date>=dOff(-14) && v.date<=TODAY()).sort(byTime).reverse();
  if(f==='ex') vs = vs.filter(v => v.evv.status==='exception'); if(f==='today') vs = vs.filter(v => v.date===TODAY());
  const avgD = avg(S().visits.filter(v => v.evv && v.evv.inDist!=null && v.date>=dOff(-30)).map(v => v.evv.inDist));
  return `<div class="grid g4"><div class="card kpi"><div class="k-ic bg-green">${I('shield')}</div><div class="k-v">${ev.pct.toFixed(1)}%</div><div class="k-l">GPS-verified visits (30 d)</div></div><div class="card kpi"><div class="k-ic bg-blue">${I('clock')}</div><div class="k-v">${ev.n?Math.round(ev.onTime/ev.n*100):100}%</div><div class="k-l">On-time arrivals</div></div><div class="card kpi"><div class="k-ic bg-violet">${I('locate')}</div><div class="k-v">${Math.round(avgD)} m</div><div class="k-l">Avg clock-in distance</div></div><div class="card kpi"><div class="k-ic bg-amber">${I('alert')}</div><div class="k-v">${ev.ex.filter(v=>!v.evv.approved).length}</div><div class="k-l">Exceptions to review</div></div></div>
  <div class="card mt-l"><div class="row between wrap mb" style="gap:10px"><div class="seg">${[['all','Last 14 days'],['today','Today'],['ex','Exceptions']].map(([k,l]) => `<button class="${f===k?'on':''}" data-go="evv" data-p='{"f":"${k}"}'>${l}</button>`).join('')}</div><button class="btn btn-ghost btn-sm" data-act="evvCsv" data-f="${f}">${I('copy','sm')} Copy CSV</button></div>
    <div class="tbl-wrap"><table class="tbl stack"><thead><tr><th>Visit</th><th>Staff</th><th>Scheduled</th><th>Clock-in</th><th>Clock-out</th><th>Method</th><th>Status</th></tr></thead><tbody>
    ${vs.slice(0,60).map(v => { const p = pat(v.pid), s = stfOr(v.sid), e = v.evv; const late = toMin(e.inT) - toMin(v.start); return `<tr class="click" data-act="visitModal" data-id="${v.id}"><td class="first"><div class="b">${esc(p.name)}</div><div class="tiny muted">${relDay(v.date)} · ${svc(v.service).short}</div></td><td data-l="Staff">${esc(s.name)}</td><td data-l="Scheduled" class="tnum">${fmtT(v.start)}</td><td data-l="Clock-in" class="tnum"><b>${fmtT(e.inT)}</b> <span class="tiny ${late>10?'':'muted'}" style="${late>10?'color:var(--red)':''}">${late>0?'+':''}${late}m</span><div class="tiny" style="color:${e.inDist!=null&&e.inDist<=S().settings.geofence?'var(--green)':'var(--red)'}">${e.inDist==null?'no GPS':fmtDist(e.inDist)+' from home'}</div></td><td data-l="Clock-out" class="tnum">${e.outT?fmtT(e.outT):'<span class="pill p-amber">On visit</span>'}</td><td data-l="Method"><span class="pill ${e.mode==='manual'?'p-amber':'p-blue'}">${e.mode==='manual'?'Manual':'GPS'}</span></td><td data-l="Status">${e.status==='verified'?`<span class="pill p-green">${I('check','xs')} ${e.approved?'Approved':'Verified'}</span>`:`<button class="btn btn-soft btn-xs" data-act="approveEvv" data-id="${v.id}">Review</button>`}</td></tr>`; }).join('') || `<tr><td colspan="7">${emptyState('shield','No records')}</td></tr>`}</tbody></table></div></div>`;
};
ACT.approveEvv = (el, e) => { e && e.stopPropagation(); const v = visit(el.dataset.id), p = pat(v.pid);
  const m = Modal.open({title:'Review EVV exception', sub:`${esc(stfOr(v.sid).name)} · ${esc(p.name)} · ${relDay(v.date)}`, body:`<div class="hint amber">${I('alert','sm')}<span>${esc(v.evv.reason || `Clock-in ${fmtDist(v.evv.inDist)} from the patient’s home`)}</span></div><div class="map mt" id="ev-map" style="height:200px"></div><div class="field mt"><label>Supervisor note</label><textarea class="textarea" id="ev-n" placeholder="e.g. Confirmed with family by phone"></textarea></div>`,
    foot:`<button class="btn btn-ghost" id="ev-rej" style="color:var(--red)">Reject (unbillable)</button><button class="btn btn-green" id="ev-ok">${I('check','sm')} Approve</button>`,
    onOpen:mm => setTimeout(() => { const mp = new LiveMap(mm.querySelector('#ev-map'), {minSpan:100}); if(p.lat!=null) mp.set('h',{type:'home', lat:p.lat, lng:p.lng}); if(v.evv.inLat!=null) mp.set('in',{type:'staff', lat:v.evv.inLat, lng:v.evv.inLng, color:'#D98A00', text:'IN'}); if(p.lat!=null) mp.setFence(p.lat,p.lng,S().settings.geofence); mp.fit(); }, 30)});
  m.querySelector('#ev-ok').onclick = () => { v.evv.status = 'verified'; v.evv.approved = true; v.evv.note = $('#ev-n').value; S().alerts.filter(a => a.kind==='evv' && (a.vid===v.id || a.text.includes(p.name))).forEach(a => a.done = true); Store.save(); Modal.close(m); toast('Visit approved'); App.refresh(); };
  m.querySelector('#ev-rej').onclick = () => { v.evv.status = 'rejected'; v.evv.note = $('#ev-n').value; Store.save(); Modal.close(m); toast('Marked unbillable — staff notified','warn'); addMsg(`${v.sid}|office`,'office',`EVV for ${p.name} on ${relDay(v.date)} was rejected. Please contact your supervisor.`); App.refresh(); };
};
ACT.evvCsv = el => { const rows = S().visits.filter(v => v.evv && v.date>=dOff(-14)).sort(byTime).map(v => [v.date, stfOr(v.sid).name, pat(v.pid).name, svc(v.service).name, v.start, v.evv.inT, v.evv.outT||'', v.evv.inDist==null?'':Math.round(v.evv.inDist), v.evv.inLat==null?'':(+v.evv.inLat).toFixed(6), v.evv.inLng==null?'':(+v.evv.inLng).toFixed(6), v.evv.mode, v.evv.status].join(',')); copyText(['date,staff,patient,service,scheduled,clock_in,clock_out,distance_m,lat,lng,method,status', ...rows].join('\n')); };

/* ---------------- BILLING ---------------- */
OV.billing = (prm) => {
  const f = prm.f || 'all', m = TODAY().slice(0,7), inv = S().invoices.filter(i => f==='all' || i.status===f).sort((a,b) => (a.status==='verifying'?0:1)-(b.status==='verifying'?0:1) || (b.month||'').localeCompare(a.month||'') || a.status.localeCompare(b.status));
  const billed = sum(S().invoices.filter(i => i.month===m).map(i => i.amount)), coll = sum(S().invoices.filter(i => i.status==='paid' && (i.paidOn||'').slice(0,7)===m).map(i => i.amount)), out = sum(S().invoices.filter(i => i.status!=='paid').map(i => i.amount)), od = S().invoices.filter(i => i.status==='overdue');
  return `<div class="grid g4"><div class="card kpi"><div class="k-ic bg-blue">${I('file')}</div><div class="k-v">${inr(billed)}</div><div class="k-l">Billed this month</div></div><div class="card kpi"><div class="k-ic bg-green">${I('check')}</div><div class="k-v">${inr(coll)}</div><div class="k-l">Collected this month</div></div><div class="card kpi"><div class="k-ic bg-amber">${I('clock')}</div><div class="k-v">${inr(out)}</div><div class="k-l">Outstanding</div></div><div class="card kpi"><div class="k-ic bg-red">${I('alert')}</div><div class="k-v">${od.length}</div><div class="k-l">Overdue invoices</div></div></div>
  <div class="card mt-l"><div class="row between wrap mb" style="gap:10px"><div class="seg">${[['all','All'],['verifying','To verify'],['due','Due'],['overdue','Overdue'],['paid','Paid']].map(([k,l]) => `<button class="${f===k?'on':''}" data-go="billing" data-p='{"f":"${k}"}'>${l}</button>`).join('')}</div><button class="btn btn-primary btn-sm" data-act="genInv">${I('refresh','sm')} Update this month’s invoices</button></div>
    <div class="tbl-wrap"><table class="tbl stack"><thead><tr><th>Invoice</th><th>Patient</th><th>Month</th><th>Visits</th><th>Amount</th><th>Status</th></tr></thead><tbody>${inv.map(i => { const p = pat(i.pid); return `<tr class="click" data-act="oInv" data-id="${i.id}"><td class="first b">${i.id}</td><td data-l="Patient">${esc(p.name)}</td><td data-l="Month">${new Date(i.month+'-01').toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</td><td data-l="Visits">${sum(i.items.map(x=>x.q))}</td><td data-l="Amount" class="b tnum">${inr(i.amount)}</td><td data-l="Status">${invPill(i)}</td></tr>`; }).join('')}</tbody></table></div></div>`;
};
ACT.oInv = el => { const i = S().invoices.find(x => x.id===el.dataset.id); Modal.closeAll(); Modal.open({title:'Invoice', wide:true, body:invoiceHTML(i), foot:`<button class="btn btn-ghost" data-act="copyInv" data-id="${i.id}">${I('copy','sm')} Copy</button>${i.status!=='paid'?`<button class="btn btn-ghost" data-act="remindInv" data-id="${i.id}">${I('bell','sm')} Remind</button><button class="btn btn-green" data-act="markPaid" data-id="${i.id}">${I('check','sm')} ${i.status==='verifying'?'Confirm payment':'Mark paid'}</button>`:'<button class="btn btn-primary" data-close>Done</button>'}`}); };
ACT.markPaid = el => { const i = S().invoices.find(x => x.id===el.dataset.id); i.status = 'paid'; i.paidOn = TODAY(); i.txn = i.payRef || 'Office'; notifyPatient(i.pid, `Payment received for invoice ${i.id} (${inr(i.amount)}). Thank you!`); S().alerts.filter(a => a.kind==='payment' && !a.done && a.text.includes(pat(i.pid).name)).forEach(a => a.done = true); Store.save(); Modal.closeAll(); toast(`${i.id} marked as paid`); App.refresh(); };
ACT.remindInv = el => { const i = S().invoices.find(x => x.id===el.dataset.id); notifyPatient(i.pid, `Reminder: invoice ${i.id} for ${inr(i.amount)} is due on ${fmtD(i.due,{day:'numeric',month:'short'})}.`); toast('Payment reminder sent to the family'); };
ACT.genInv = () => {
  const m = TODAY().slice(0,7); let n = 0;
  S().patients.forEach(p => { const vs = S().visits.filter(v => v.pid===p.id && v.status==='completed' && v.date.slice(0,7)===m && !(v.evv && v.evv.status==='rejected')); if(!vs.length) return;
    const items = SERVICES.map(s => { const q = vs.filter(v => v.service===s.id).length; return q ? {d:s.name, q, r:rate(s.id)} : null; }).filter(Boolean), amount = sum(items.map(x => x.q*x.r));
    let i = S().invoices.find(x => x.pid===p.id && x.month===m); if(i && i.status==='paid') return; if(!i){ i = {id:`INV-${m.replace('-','')}-${p.id}`, pid:p.id, month:m, date:TODAY(), due:dOff(10), status:'due'}; S().invoices.push(i); } Object.assign(i, {items, amount, date:TODAY()}); n++; });
  Store.save(); toast(`${n} invoices updated from GPS-verified visits`); App.refresh();
};

/* ---------------- REPORTS ---------------- */
OV.reports = () => {
  const m = TODAY().slice(0,7), mv = S().visits.filter(v => v.status==='completed' && v.date.slice(0,7)===m);
  const days = Array.from({length:14}, (_,i) => dOff(i-13));
  const util = S().staff.filter(s => s.active!==false).map(s => ({s, h:sum(mv.filter(v => v.sid===s.id).map(v => v.dur))/60, n:mv.filter(v => v.sid===s.id).length, ot:mv.filter(v => v.sid===s.id && v.evv && toMin(v.evv.inT)<=toMin(v.start)+10).length, r:avg(S().visits.filter(v => v.sid===s.id && v.rating).map(v => v.rating))||0}));
  const rated = S().visits.filter(v => v.rating), csat = avg(rated.map(v => v.rating));
  const srcNames = ['Hospital discharge','Doctor referral','Website / app','Word of mouth','Other'], src = srcNames.map(n => [n, S().patients.filter(p => (p.source||'Other')===n).length]).filter(x => x[1]);
  return `<div class="page-h"><div><h1>Reports</h1><p>${new Date(m+'-01').toLocaleDateString('en-IN',{month:'long',year:'numeric'})} · ${mv.length} completed visits</p></div><button class="btn btn-ghost" data-act="copyReport">${I('copy','sm')} Copy summary</button></div>
  <div class="grid g4"><div class="card kpi"><div class="k-v">${mv.length}</div><div class="k-l">Visits completed (MTD)</div></div><div class="card kpi"><div class="k-v">${(sum(mv.map(v=>v.dur))/60).toFixed(0)} h</div><div class="k-l">Care hours delivered</div></div><div class="card kpi"><div class="k-v">${rated.length?'★ '+csat.toFixed(2):'—'}</div><div class="k-l">Family satisfaction (${rated.length} ratings)</div></div><div class="card kpi"><div class="k-v">${S().visits.filter(v => v.status==='missed' && v.date>=dOff(-30)).length}</div><div class="k-l">Missed visits (30 d)</div></div></div>
  <div class="grid g2 mt-l"><div class="card"><div class="card-h"><h3>Visits per day</h3><span class="small muted">Last 14 days</span></div>${chart({type:'line', labels:days.map(d => fmtD(d,{day:'numeric',month:'short'})), series:[{values:days.map(d => S().visits.filter(v => v.date===d && v.status==='completed').length), color:'#2B6DE8'}]}, 220)}</div>
    <div class="card"><div class="card-h"><h3>Visits by service</h3><span class="small muted">This month</span></div>${chart({type:'bar', labels:SERVICES.map(s => s.short), series:[{values:SERVICES.map(s => mv.filter(v => v.service===s.id).length), color:'#2B6DE8'}]}, 220)}</div></div>
  <div class="grid g3 mt-l"><div class="card span2"><div class="card-h"><h3>Staff performance</h3><span class="small muted">This month · from GPS records</span></div><div class="tbl-wrap"><table class="tbl stack"><thead><tr><th>Staff</th><th>Visits</th><th>Hours</th><th>On-time</th><th>Rating</th><th>Utilisation</th></tr></thead><tbody>${util.sort((a,b) => b.h-a.h).map(u => `<tr><td class="first"><div class="who">${av(u.s.name,u.s.color,'sm')}<span class="sb">${esc(u.s.name)}</span></div></td><td data-l="Visits">${u.n}</td><td data-l="Hours" class="tnum">${u.h.toFixed(1)}</td><td data-l="On-time">${u.n?Math.round(u.ot/u.n*100):'—'}%</td><td data-l="Rating">${u.r?"★ "+u.r.toFixed(1):"—"}</td><td data-l="Util." style="min-width:110px"><div class="bar ${u.h/ (parseD(TODAY()).getDate()*6) > .8 ? 'amber':''}"><i style="width:${Math.min(100, u.h/(parseD(TODAY()).getDate()*6)*100)}%"></i></div></td></tr>`).join('')}</tbody></table></div></div>
    <div class="card"><div class="card-h"><h3>Referral sources</h3></div>${chart({type:'donut', parts:src.map(([l,v],i) => ({l, v, c:['#2B6DE8','#4FA21A','#7B5CE6','#D98A00','#97A4B6'][i]})), center:S().patients.length, centerSub:'patients'}, 170)}<div class="col mt" style="gap:6px">${src.map(([l,v],i) => `<div class="legend-row"><i style="background:${['#2B6DE8','#4FA21A','#7B5CE6','#D98A00','#97A4B6'][i]}"></i><span class="grow">${l}</span><b>${v}</b></div>`).join('')}</div></div></div>`;
};
ACT.copyReport = () => { const m = TODAY().slice(0,7), mv = S().visits.filter(v => v.status==='completed' && v.date.slice(0,7)===m), ev = evvStats(30); copyText(`Careva+ monthly summary — ${new Date(m+'-01').toLocaleDateString('en-IN',{month:'long',year:'numeric'})}\nVisits completed: ${mv.length}\nCare hours: ${(sum(mv.map(v=>v.dur))/60).toFixed(0)}\nRevenue (MTD): ${inr(mtdRevenue())}\nGPS-verified visits (30 days): ${ev.pct.toFixed(1)}%\nActive patients: ${S().patients.filter(p=>p.status==='active').length}`); };

/* ---------------- MESSAGES ---------------- */
const threadsO = () => [{id:'all-staff', name:'All staff (broadcast)', sub:'Announcement to every staff phone', color:'#4FA21A'}, ...S().staff.map(s => ({id:`${s.id}|office`, name:s.name, sub:s.role, color:s.color})), ...S().patients.filter(p => p.status==='active').map(p => ({id:`${p.id}|office`, name:p.name, sub:`Patient family · ${p.area}`, color:patColor(p.id)}))];
OV.omsg = (prm) => chatView(threadsO(), prm.t, 'office', {view:'omsg', mobileChat:!!prm.t});
OA.omsg = () => { const b = $('#chat-body'); if(b) b.scrollTop = b.scrollHeight; };

/* ---------------- SETTINGS ---------------- */
OV.settings = () => {
  const st = S().settings, c = st.company, admin = isAdminUser();
  return `<div class="grid g2"><div class="card"><div class="card-h"><h3>Company</h3>${admin?`<button class="btn btn-soft btn-xs" data-act="editCompany">${I('edit','xs')} Edit</button>`:''}</div><div class="row mb"><img src="img/logo.png" alt="" style="height:48px;width:auto"></div>
      <dl class="kv"><dt>Name</dt><dd>${esc(c.name)}</dd><dt>Phone</dt><dd>${esc(c.phone)}</dd><dt>Website</dt><dd>${esc(c.web)}</dd><dt>City</dt><dd>${esc(c.city)}</dd><dt>UPI ID (payments)</dt><dd>${c.upi?esc(c.upi):'<span style="color:var(--amber)">Not set</span>'}</dd><dt>Mileage rate</dt><dd>₹${st.mileageRate}/km</dd></dl>
      <div class="lbl mt mb">Care office location</div>${c.officeSet?`<div class="map" id="st-map" style="height:150px"></div>`:`<div class="hint amber">${I('pin','sm')}<span>Set the office location so maps and staff routes start from the right place.</span></div>`}
      ${admin?`<button class="btn btn-ghost btn-sm mt" data-act="setOfficeLoc">${I('pin','sm')} ${c.officeSet?'Change':'Set'} office location</button>`:''}</div>
    <div class="card"><div class="card-h"><div><h3>Visit verification rules (EVV)</h3><div class="sub">Applied instantly on every staff phone</div></div></div>
      <div class="field"><label>Geofence radius — <b id="gf-v">${st.geofence} m</b></label><input type="range" min="50" max="500" step="25" value="${st.geofence}" data-onchange="gfIn" data-on="gfShow" style="width:100%;accent-color:var(--blue)" ${admin?'':'disabled'}><div class="tiny muted">Staff can clock in only within this distance of the patient’s home.</div></div>
      <div class="field"><label>Late clock-in alert after</label><select class="select" data-onchange="lateIn" ${admin?'':'disabled'}>${[5,10,15,20,30].map(n => `<option value="${n}" ${n===st.lateMin?'selected':''}>${n} minutes</option>`).join('')}</select></div>
      <div class="li"><div class="grow"><div class="t">Notification sound</div><div class="s">On this computer — new messages, requests & SOS</div></div><label class="switch"><input type="checkbox" ${Chime.on()?'checked':''} data-onchange="soundToggle"><span></span></label></div>
      <div class="li"><div class="grow"><div class="t">Require patient/family e-signature</div><div class="s">Before clock-out</div></div><label class="switch"><input type="checkbox" ${st.requireSig?'checked':''} data-onchange="setRule" data-k="requireSig" ${admin?'':'disabled'}><span></span></label></div>
      <div class="li"><div class="grow"><div class="t">Require photo for wound care</div><div class="s">Documents wound progress</div></div><label class="switch"><input type="checkbox" ${st.requirePhotoWound?'checked':''} data-onchange="setRule" data-k="requirePhotoWound" ${admin?'':'disabled'}><span></span></label></div></div>
    <div class="card"><div class="card-h"><h3>Services & rates</h3></div>${SERVICES.map(s => `<div class="li"><div class="li-ic" style="background:${s.color}18;color:${s.color}">${I(s.icon,'sm')}</div><div class="grow"><div class="t">${s.name}</div><div class="s">per ${s.unit}</div></div><div class="input-group" style="width:130px"><span class="pre">₹</span><input value="${rate(s.id)}" inputmode="numeric" data-onchange="rateIn" data-s="${s.id}" ${admin?'':'disabled'}></div></div>`).join('')}</div>
    <div class="card"><div class="card-h"><div><h3>Office team</h3><div class="sub">People who can sign in to this office portal</div></div>${admin?`<button class="btn btn-soft btn-xs" data-act="addOfficeUser">${I('plus','xs')} Add</button>`:''}</div><div id="ou-list">${emptyState('users','Loading…')}</div>
      <div class="divider"></div><div class="small muted"><b>Access levels:</b> Owner/Admin — everything · Care Coordinator — patients, scheduling, live map · Clinical Supervisor — patients & visit verification · Billing — invoices & reports. Staff and patients only ever see their own records.</div>
      <div class="divider"></div><div class="row between wrap"><div><div class="b">Database</div><div class="small muted">${Cloud.mode==='supabase'?'Connected · live sync':'Test mode — data stays on this device'}</div></div><span id="sync-badge2" class="pill ${Cloud.mode==='supabase'?'p-green':'p-amber'}">${Cloud.mode==='supabase'?'Live':'Local'}</span></div></div></div>`;
};
OA.settings = async () => {
  const c = S().settings.company, el = $('#st-map');
  if(el && c.officeSet){ const m = new LiveMap(el, {minSpan:150}); m.set('o', {type:'office', lat:OFFICE.lat, lng:OFFICE.lng}); m.fit([[OFFICE.lat, OFFICE.lng]], 150); }
  const box = $('#ou-list'); if(!box) return;
  try{ const r = await Cloud.admin('office_users'); if(!document.body.contains(box)) return;
    box.innerHTML = `<div class="list">${(r.users||[]).map(u => `<div class="li">${av(u.name||u.email,'#0B2F5E','sm')}<div class="grow"><div class="t">${esc(u.name||u.email)}${Cloud.profile && u.id===Cloud.profile.id?' <span class="pill p-blue">You</span>':''}</div><div class="s">${esc(u.email||'')} · ${ROLE_NAMES[u.role]||u.role}</div></div>${isAdminUser() && (!Cloud.profile || u.id!==Cloud.profile.id)?`<button class="icon-btn" data-act="removeOfficeUser" data-id="${u.id}" data-n="${esc(u.name||u.email)}" title="Remove">${I('trash','sm')}</button>`:''}</div>`).join('')}</div>`;
  }catch(e){ box.innerHTML = `<div class="small muted">${isNetErr(e)?'Offline':'Could not load the team'}.</div>`; }
};
ON.gfShow = el => { $('#gf-v').textContent = el.value + ' m'; };
ON.gfIn = el => { S().settings.geofence = +el.value; Store.save(); toast(`Geofence set to ${el.value} m`); };
ON.lateIn = el => { S().settings.lateMin = +el.value; Store.save(); toast('Saved'); };
ON.setRule = el => { S().settings[el.dataset.k] = el.checked; Store.save(); toast('Rule updated'); };
ON.rateIn = el => { S().settings.rates[el.dataset.s] = Math.max(0, +el.value.replace(/\D/g,'') || 0); Store.save(); toast(`${svc(el.dataset.s).name} rate updated`); };
ACT.editCompany = () => { const st = S().settings, c = st.company;
  Modal.open({title:'Company details', body:`<form id="co-f" data-submit="saveCompany"><div class="field"><label>Business name</label><input class="input" name="name" value="${esc(c.name)}" required></div>
    <div class="f2"><div class="field"><label>Phone</label><input class="input" name="phone" value="${esc(c.phone)}" required></div><div class="field"><label>Website</label><input class="input" name="web" value="${esc(c.web)}"></div></div>
    <div class="f2"><div class="field"><label>City</label><input class="input" name="city" value="${esc(c.city)}"></div><div class="field"><label>Mileage rate (₹/km)</label><input class="input" name="mileage" inputmode="decimal" value="${st.mileageRate}"></div></div>
    <div class="field"><label>UPI ID for patient payments</label><input class="input" name="upi" value="${esc(c.upi)}" placeholder="e.g. carevaplus@okicici"><div class="tiny muted">Patients pay from GPay/PhonePe/Paytm to this UPI ID; the office confirms each payment.</div></div></form>`,
    foot:`<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" form="co-f">Save</button>`}); };
FORM.saveCompany = f => { const d = Object.fromEntries(new FormData(f)), st = S().settings; if(d.upi && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(d.upi.trim())) return toast('That UPI ID doesn’t look right (example: name@okicici)','err');
  st.company = {...st.company, name:d.name.trim(), phone:d.phone.trim(), web:d.web.trim(), city:d.city.trim(), upi:d.upi.trim()}; st.mileageRate = +d.mileage || 0; Store.save(); Modal.close(f); toast('Company details saved'); App.refresh(); };
ACT.setOfficeLoc = async () => { const c = S().settings.company; const r = await pickLocation({lat:c.officeSet?c.officeLat:null, lng:c.officeSet?c.officeLng:null, title:'Care office location', sub:'Move the map so the pin sits on your office'}); if(!r) return; S().settings.company = {...c, officeLat:r.lat, officeLng:r.lng, officeSet:true}; Store.save(); toast('Office location saved'); App.refresh(); };
ACT.addOfficeUser = () => Modal.open({title:'Add office user', body:`<form id="ou-f" data-submit="saveOfficeUser"><div class="field"><label>Name</label><input class="input" name="name" required></div><div class="field"><label>Email (their sign-in)</label><input class="input" type="email" name="email" required></div>
  <div class="f2"><div class="field"><label>Temporary password</label><input class="input" name="password" minlength="8" required value="Careva-${sixDigits()}"></div><div class="field"><label>Role</label><select class="select" name="role"><option value="coordinator">Care Coordinator</option><option value="supervisor">Clinical Supervisor</option><option value="billing">Billing</option><option value="admin">Owner / Admin</option></select></div></div></form>`,
  foot:`<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" form="ou-f" id="ou-btn">Add user</button>`});
FORM.saveOfficeUser = f => busy($('#ou-btn'), async () => { const d = Object.fromEntries(new FormData(f)); try{ await Cloud.admin('office_user', {name:d.name, email:d.email.trim().toLowerCase(), password:d.password, role:d.role}); Modal.close(f); Modal.open({title:'User added', body:`<p>Share these sign-in details privately:</p><pre class="share">Careva+ office\n${location.origin}${location.pathname}\nEmail: ${esc(d.email)}\nPassword: ${esc(d.password)}</pre>`, foot:`<button class="btn btn-primary" data-close>Done</button>`}); App.refresh(); }catch(e){ toast(isNetErr(e)?'No internet connection':e.message,'err'); } });
ACT.removeOfficeUser = async el => { if(!await confirmBox({title:`Remove ${el.dataset.n}?`, text:'They will no longer be able to sign in to the office portal.', ok:'Remove', cls:'btn-danger'})) return; try{ await Cloud.admin('remove_office_user', {id:el.dataset.id}); toast('User removed'); App.refresh(); }catch(e){ toast(e.message,'err'); } };
