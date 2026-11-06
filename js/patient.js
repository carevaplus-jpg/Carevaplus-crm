'use strict';
/* =========================================================
   PATIENT & FAMILY PORTAL
   ========================================================= */
const PU = () => pat(App.uid);
const pVisits = () => S().visits.filter(v => v.pid===App.uid);
const pNext = () => {
  const now = TODAY()+fromMin(nowMin()-60);
  const vs = pVisits().filter(v => ['scheduled','enroute','inprogress'].includes(v.status) && (v.date+v.start) >= now.slice(0,10)).sort(byTime);
  return vs.find(v => v.status==='enroute' || v.status==='inprogress') || vs.find(v => v.date>TODAY() || (v.date===TODAY() && toMin(v.start)+v.dur > nowMin())) || vs[0];
};
const vHas = (x, k) => x[k] != null && x[k] !== '' && !Number.isNaN(+x[k]);
const unreadP = () => (S().notifications[App.uid]||[]).filter(n => !n.read).length;
const threadsP = () => {
  const p = PU(); const team = [...new Set(pVisits().map(v => v.sid))].map(stf).filter(Boolean);
  return [{id:`${p.id}|office`, name:'Care Coordinator', sub:'Careva+ office', color:'#0B2F5E'}, ...team.map(s => ({id:`${p.id}|${s.id}`, name:s.name, sub:s.role, color:s.color}))];
};
/* enroute position shared by patient tracking & office map */
function enroutePos(v){
  const g = S().gps[v.sid], p = pat(v.pid);
  if(!g || g.lat==null || !p) return null;
  return {lat:g.lat, lng:g.lng, acc:g.acc, ts:g.ts, live:Date.now() - (g.ts||0) < 5*60e3, left:haversine(g, p)};
}
function prevStop(v){ const prev = S().visits.filter(x => x.sid===v.sid && x.date===v.date && x.start < v.start && x.status==='completed').sort(byTime).pop(); if(prev){ const p = pat(prev.pid); return {lat:p.lat, lng:p.lng}; } return null; }

PORTALS.patient = {
  label:'Patient Portal', icon:'heart', home:'home',
  init(){ GPS.stop(); },
  user(){ const p = PU(); return {name:p.name, sub:`Patient · ${p.id}`, color:patColor(p.id)}; },
  nav(){ const reqs = S().requests.filter(r => r.pid===App.uid && r.status==='pending').length; const due = S().invoices.filter(i => i.pid===App.uid && i.status!=='paid').length;
    return [{id:'home',label:'Home',icon:'home'},{id:'visits',label:'Visits',icon:'calendar',badge:reqs||''},{id:'track',label:'Track nurse',icon:'nav',tab:'Track'},{id:'health',label:'My health',icon:'pulse',tab:'Health'},{id:'messages',label:'Messages',icon:'chat',badge:Unread.count(threadsP(), App.uid)||''},{id:'billing',label:'Bills & payments',icon:'card',badge:due||''},{id:'account',label:'Profile & family',icon:'user'}]; },
  tabs:['home','visits','track','health','more'],
  navOf(v){ return v; },
  title(v){ const p = PU(); const m = {home:[`${greet()}, ${first(p.name)}`, `${p.id} · ${p.area}`], visits:['Visits','Upcoming and past home visits'], track:['Live tracking','Know exactly when your nurse arrives'], health:['My health','Vitals, medicines, care plan & reports'], messages:['Messages','Talk to your care team'], billing:['Bills & payments','Invoices, payments and insurance'], account:['Profile & family','Personal details and family access']}[v]||['','']; return {t:m[0], s:m[1]}; },
  actions(){ const n = unreadP(); return `<button class="icon-btn" data-act="pNotifs" aria-label="Notifications">${I('bell')}${nbadge(n)}</button><a class="icon-btn hide-m" href="tel:${CO.tel}" title="Call Careva+">${I('phone')}</a>`; },
  fab(v){ return v==='messages' ? '' : `<button class="sos-fab" data-act="pSOS" aria-label="Emergency SOS">SOS</button>`; },
  views:{}, after:{},
};
const PV = PORTALS.patient.views, PA = PORTALS.patient.after;

/* ---------------- HOME ---------------- */
PV.home = () => {
  const p = PU(), v = pNext(), s = v && stfOr(v.sid);
  let hero = `<div class="hero"><h3>No upcoming visits</h3><p class="muted mt-s">Book a nurse, physiotherapist or caregiver at home.</p><button class="btn btn-primary mt" data-act="bookVisit">${I('plus','sm')} Book a visit</button></div>`;
  if(v){
    const pos = v.status==='enroute' ? enroutePos(v) : null;
    const state = v.status==='enroute' ? `<span class="pill" style="background:rgba(124,209,59,.2);color:#C8F5A6"><span class="live-dot"></span>&nbsp;On the way${pos?` · ETA ${etaMin(pos.left)} min`:''}</span>`
      : v.status==='inprogress' ? `<span class="pill" style="background:rgba(255,200,97,.2);color:#FFD995">Nurse is with you</span>` : `<span class="pill" style="background:rgba(255,255,255,.14);color:#fff">${I('shield','xs')} Confirmed</span>`;
    hero = `<div class="hero">
      <svg class="hero-line" viewBox="0 0 100 100"><path d="M30 10h40v20h20v40H70v20H30V70H10V30h20z" fill="none" stroke="#fff" stroke-width="3"/></svg>
      <div class="row between"><span class="small b" style="color:#B9CCEC;letter-spacing:.08em;text-transform:uppercase">Next visit</span>${state}</div>
      <h2 style="font-size:24px;margin-top:10px">${relDay(v.date)} · ${fmtT(v.start)}</h2>
      <div class="muted">${svc(v.service).name} · ${v.dur} min</div>
      <div class="glass row mt">${av(s.name, s.color, '', true)}<div class="grow"><div class="b">${esc(s.name)}</div><div class="small" style="color:#B9CCEC">${s.short} · ★ ${ratingOf(s)} · ${s.exp} yrs exp.</div></div>
        <a class="icon-btn" style="background:rgba(255,255,255,.12);border-color:transparent;color:#fff" href="tel:+91${s.phone.replace(/\s/g,'')}" aria-label="Call">${I('phone','sm')}</a>
        <button class="icon-btn" style="background:rgba(255,255,255,.12);border-color:transparent;color:#fff" data-go="messages" data-p='{"t":"${p.id}|${s.id}"}' aria-label="Message">${I('chat','sm')}</button></div>
      <div class="row mt wrap"><button class="btn btn-primary" data-go="track">${I('nav','sm')} Track live</button><button class="btn" style="background:rgba(255,255,255,.12);color:#fff" data-act="pResched" data-id="${v.id}">Reschedule</button></div>
    </div>`;
  }
  const qa = [['bookVisit','plus','bg-blue','Book visit'],['go:track','nav','bg-violet','Track nurse'],['go:health:vitals','pulse','bg-red','Vitals'],['go:health:meds','pill','bg-green','Medicines'],['go:health:docs','file','bg-amber','Reports'],['go:messages','chat','bg-teal','Messages'],['go:billing','card','bg-navy','Pay bills'],['call','phone','bg-blue','Call us']];
  const qaHTML = qa.map(([a,ic,bg,l]) => { let attr; if(a==='call') return `<a href="tel:${CO.tel}"><span class="q-ic ${bg}">${I(ic)}</span>${l}</a>`; if(a.startsWith('go:')){ const [,view,tab] = a.split(':'); attr = `data-go="${view}" ${tab?`data-p='{"tab":"${tab}"}'`:''}`; } else attr = `data-act="${a}"`; return `<button ${attr}><span class="q-ic ${bg}">${I(ic)}</span>${l}</button>`; }).join('');
  const vt = S().vitals.filter(x => x.pid===p.id).sort((a,b) => (a.date+(a.time||'')).localeCompare(b.date+(b.time||''))).slice(-10), L = vt[vt.length-1] || {};
  const vital = (n, val, unit, key, color, ok) => `<div class="vital"><div class="v-top"><span class="v-n">${n}</span><span class="pill ${ok?'p-green':'p-amber'}" style="height:20px;font-size:10.5px">${ok?'Normal':'Watch'}</span></div><div class="v-v tnum">${val}<small>${unit}</small></div>${spark(vt.map(x => x[key]), color)}</div>`;
  const plan = S().carePlan[p.id];
  return `${hero}
  <div class="sec-h"><h2>Quick actions</h2></div><div class="qa">${qaHTML}</div>
  <div class="grid g2 mt-l">
    <div class="card"><div class="card-h"><div><h3>Today’s medicines</h3><div class="sub">${medsDoneCount()} of ${medsDueToday().length} doses taken</div></div><button class="btn btn-soft btn-sm" data-go="health" data-p='{"tab":"meds"}'>All</button></div>${medsTodayList(4)}</div>
    <div class="card"><div class="card-h"><div><h3>Latest vitals</h3><div class="sub">${L.date?`${relDay(L.date)} · ${esc(L.by)}`:'No readings yet'}</div></div><button class="btn btn-soft btn-sm" data-act="addVital">${I('plus','sm')} Add</button></div>
      ${vt.length ? `<div class="grid g2 keep" style="gap:10px">${L.sys?vital('Blood pressure', `${L.sys}/${L.dia??'–'}`, 'mmHg', 'sys', '#E1343A', L.sys<140):''}${L.sugar?vital('Blood sugar', L.sugar, 'mg/dL', 'sugar', '#D98A00', L.sugar<140):''}${L.spo2?vital('SpO₂', L.spo2, '%', 'spo2', '#2B6DE8', L.spo2>=95):''}${L.pulse?vital('Pulse', L.pulse, 'bpm', 'pulse', '#7B5CE6', L.pulse<100):''}</div>` : emptyState('pulse','No readings yet','Your nurse records vitals at each visit, or tap Add.')}</div>
  </div>
  <div class="grid g2 mt-l">
    ${plan?`<div class="card"><div class="card-h"><div><h3>Care plan progress</h3><div class="sub">${esc(p.plan||'')}</div></div><button class="btn btn-soft btn-sm" data-go="health" data-p='{"tab":"plan"}'>View</button></div>${plan.goals.map(g => `<div class="mb"><div class="row between small"><span class="sb ink2">${esc(g.g)}</span><b>${g.p}%</b></div><div class="bar ${g.p>80?'green':''} mt-s"><i style="width:${g.p}%"></i></div></div>`).join('')}</div>`:''}
    <div class="card"><div class="card-h"><h3>Your care team</h3></div><div class="list">${careTeam().map(s => `<div class="li">${av(s.name, s.color)}<div class="grow"><div class="t">${esc(s.name)}</div><div class="s">${s.role} · ${s.qual}</div></div><button class="icon-btn" data-go="messages" data-p='{"t":"${p.id}|${s.id}"}'>${I('chat','sm')}</button></div>`).join('')}
      <div class="li"><span class="av" style="background:#0B2F5E">${I('building','sm')}</span><div class="grow"><div class="t">Care Coordinator</div><div class="s">Careva+ office · ${CO.phone}</div></div><a class="icon-btn" href="tel:${CO.tel}">${I('phone','sm')}</a></div></div></div>
  </div>`;
};
PA.home = () => {};
const careTeam = () => [...new Set(pVisits().filter(v => v.date>=dOff(-14)).map(v => v.sid))].map(stf).filter(Boolean);
const medKey = (m,t) => `${App.uid}|${TODAY()}|${m.id}|${t}`;
const medsDueToday = () => (S().meds[App.uid]||[]).flatMap(m => m.times.map(t => ({m,t}))).sort((a,b) => a.t.localeCompare(b.t));
const medsDoneCount = () => medsDueToday().filter(x => S().medLog[medKey(x.m,x.t)]).length;
function medsTodayList(limit){
  let list = medsDueToday(); if(limit){ const pend = list.filter(x => !S().medLog[medKey(x.m,x.t)]); list = (pend.length ? pend : list).slice(0, limit); }
  if(!list.length) return emptyState('pill','No medicines scheduled');
  return `<div class="col" style="gap:8px">${list.map(({m,t}) => { const on = !!S().medLog[medKey(m,t)]; const late = !on && toMin(t) < nowMin()-30; return `<div class="med ${on?'done':''}"><button class="tick ${on?'on':''}" data-act="medTick" data-m="${m.id}" data-t="${t}" aria-label="Mark taken">${I('check','sm')}</button><div class="grow"><div class="t b">${esc(m.name)}</div><div class="small muted">${m.dose} · ${m.when}</div></div><div class="center"><div class="b small tnum">${fmtT(t)}</div>${late?'<span class="pill p-red" style="height:18px;font-size:10px">Missed?</span>':''}</div></div>`; }).join('')}</div>`;
}
ACT.medTick = el => { const m = (S().meds[App.uid]||[]).find(x => x.id===el.dataset.m), k = medKey(m, el.dataset.t); S().medLog[k] = !S().medLog[k]; Store.save(); toast(S().medLog[k] ? `${m.name} marked as taken` : 'Marked as not taken', S().medLog[k]?'ok':'warn'); App.refresh(); };

/* ---------------- NOTIFICATIONS / SOS ---------------- */
ACT.pNotifs = () => {
  const ns = S().notifications[App.uid] || [];
  Modal.open({title:'Notifications', body: ns.length ? `<div class="list">${ns.map(n => `<div class="li"><div class="li-ic ${n.read?'bg-blue':'bg-green'}">${I('bell','sm')}</div><div class="grow"><div class="${n.read?'':'b'}">${esc(n.text)}</div><div class="s">${timeAgo(n.ts)}</div></div></div>`).join('')}</div>` : emptyState('bell','You’re all caught up'), onClose:() => { ns.forEach(n => n.read = true); Store.save(); App.refresh(); }});
};
ACT.pSOS = () => {
  const p = PU();
  const m = Modal.open({title:'Emergency help', sub:'Use this if the patient needs urgent help at home.', body:`
    <button class="sos-ring" data-act="pSOSsend" style="border:0;cursor:pointer" aria-label="Send SOS alert">SOS</button>
    <p class="center ink2 small" style="margin-top:-4px">Tap SOS to alert the Careva+ care team and <b>${esc(p.contact.name)}</b> (${esc(p.contact.rel)}) with the home location.</p>
    <div class="grid g2 keep mt-l" style="gap:10px"><a class="btn btn-danger btn-lg" href="tel:108">${I('phone','sm')} Ambulance 108</a><a class="btn btn-ghost btn-lg" href="tel:${CO.tel}">${I('phone','sm')} Careva+</a></div>
    <p class="center tiny muted mt">Ambulance: 108 · Careva+: ${CO.phone}</p>`});
};
ACT.pSOSsend = el => {
  const p = PU(); addAlert('red','sos',`SOS from patient ${p.name} (${p.id}) — ${p.addr}`, {pid:p.id, lat:p.lat, lng:p.lng});
  const m = el.closest('.modal'); m.querySelector('.modal-b').innerHTML = `<div class="center" style="padding:10px 0 6px"><div class="li-ic bg-green" style="width:72px;height:72px;border-radius:50%;margin:0 auto">${I('check','xl')}</div><h3 class="mt">Help is on the way</h3><p class="ink2 mt-s">The Careva+ care team and ${esc(p.contact.name)} have been alerted with your home location. A coordinator will call you within 2 minutes.</p>
    <div class="grid g2 keep mt-l" style="gap:10px"><a class="btn btn-danger" href="tel:108">Call 108</a><a class="btn btn-ghost" href="tel:${CO.tel}">Call Careva+</a></div></div>`;
};

/* ---------------- VISITS ---------------- */
PV.visits = (prm) => {
  const tab = prm.tab || 'up', p = PU();
  const reqs = S().requests.filter(r => r.pid===p.id && r.status==='pending');
  const up = pVisits().filter(v => ['scheduled','enroute','inprogress'].includes(v.status) && v.date>=TODAY()).sort(byTime);
  const past = pVisits().filter(v => v.date<=TODAY() && ['completed','missed','cancelled'].includes(v.status)).sort(byTime).reverse();
  const card = v => { const s = stfOr(v.sid), d = parseD(v.date); return `<div class="visit-card"><div class="date-box"><span>${d.toLocaleDateString(LOC(),{month:'short'})}</span><b>${d.getDate()}</b><span>${d.toLocaleDateString(LOC(),{weekday:'short'})}</span></div>
    <div class="grow"><div class="row between top"><div><div class="b" style="color:var(--navy)">${svc(v.service).name}</div><div class="small muted">${relDay(v.date)} · ${fmtT(v.start)} – ${fmtT(visitEnd(v))}</div></div>${v.reschedReq?stPill('pending'):vPill(v)}</div>
      <div class="row mt-s">${av(s.name,s.color,'sm')}<span class="small sb ink2">${esc(s.name)} · ${s.short}</span></div>
      ${tab==='up' ? `<div class="row mt wrap" style="gap:8px">${v.date===TODAY()?`<button class="btn btn-primary btn-sm" data-go="track">${I('nav','sm')} Track</button>`:''}<button class="btn btn-ghost btn-sm" data-act="pResched" data-id="${v.id}">Reschedule</button><button class="btn btn-ghost btn-sm" data-act="pCancel" data-id="${v.id}">Cancel</button></div>`
       : v.status==='completed' ? `<div class="small ink2 mt-s">${esc(v.notes)}</div><div class="row mt wrap" style="gap:8px"><button class="btn btn-soft btn-sm" data-act="pVisitSum" data-id="${v.id}">${I('shield','sm')} Visit summary</button>${v.rating?`<span class="stars">${'★'.repeat(v.rating)}</span>`:`<button class="btn btn-ghost btn-sm" data-act="pRate" data-id="${v.id}">${I('star','sm')} Rate visit</button>`}</div>` : ''}
    </div></div>`; };
  const groups = {}; up.slice(0,30).forEach(v => (groups[v.date] ||= []).push(v));
  return `<div class="page-h"><div><h1>Visits</h1><p>${up.length} upcoming · ${past.filter(v=>v.status==='completed').length} completed</p></div><button class="btn btn-primary" data-act="bookVisit">${I('plus','sm')} Book a visit</button></div>
  <div class="seg mb"><button class="${tab==='up'?'on':''}" data-go="visits" data-p='{"tab":"up"}'>Upcoming</button><button class="${tab==='past'?'on':''}" data-go="visits" data-p='{"tab":"past"}'>Past visits</button></div>
  ${tab==='up' && reqs.length ? `<div class="card mb" style="border-color:var(--amber-100);background:#FFFCF5"><div class="card-h"><h3>Awaiting confirmation</h3><span class="pill p-amber">${reqs.length}</span></div>${reqs.map(r => `<div class="li"><div class="li-ic bg-amber">${I('clock','sm')}</div><div class="grow"><div class="t">${svc(r.service).name}</div><div class="s">${relDay(r.date)} · ${fmtT(r.slot)} · requested ${timeAgo(r.created)}</div></div></div>`).join('')}<p class="tiny muted mt-s">The care coordinator confirms requests within 30 minutes during working hours.</p></div>`:''}
  ${tab==='up' ? (Object.keys(groups).length ? Object.entries(groups).map(([d,vs]) => `<div class="sec-h" style="margin-top:14px"><h2 style="font-size:15px">${relDay(d)} <span class="muted small">· ${fmtD(d,{day:'numeric',month:'long'})}</span></h2></div><div class="grid g2">${vs.map(card).join('')}</div>`).join('') : emptyState('calendar','No upcoming visits'))
    : `<div class="grid g2">${past.slice(0,24).map(card).join('') || emptyState('calendar','No past visits')}</div>`}`;
};
ACT.bookVisit = () => {
  const p = PU(); let st = {service:p.services[0], date:dOff(1), slot:null};
  const days = Array.from({length:10}, (_,i) => dOff(i));
  const slots = ['07:00','08:00','09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00','19:00'];
  const busy = (d,t) => d===TODAY() && toMin(t) < nowMin()+90;
  const draw = m => {
    m.querySelector('.modal-b').innerHTML = `
      <div class="lbl mb">Type of care</div><div class="svc-pick">${SERVICES.map(s => `<button class="chip ${st.service===s.id?'on':''}" data-bk="service" data-v="${s.id}">${I(s.icon,'sm')}<span><b>${s.short}</b><br><span class="tiny muted">from ${inr(rate(s.id))}/${s.unit}</span></span></button>`).join('')}</div>
      <div class="lbl mt-l mb">Date</div><div class="chips scroll day-chips">${days.map(d => { const x = parseD(d); return `<button class="chip ${st.date===d?'on':''}" data-bk="date" data-v="${d}"><small>${d===TODAY()?'Today':x.toLocaleDateString(LOC(),{weekday:'short'})}</small><b>${x.getDate()}</b></button>`; }).join('')}</div>
      <div class="lbl mt-l mb">Preferred time</div><div class="slot-grid">${slots.map(t => `<button class="chip ${st.slot===t?'on':''}" data-bk="slot" data-v="${t}" ${busy(st.date,t)?'disabled':''}>${fmtT(t)}</button>`).join('')}</div>
      <div class="field mt-l"><label>Notes for the care team (optional)</label><textarea class="textarea" id="bk-notes" placeholder="e.g. please check blood sugar, bring dressing kit">${esc(st.notes||'')}</textarea></div>
      <div class="hint">${I('pin','sm')}<span><b>Visit address:</b> ${esc(p.addr)}</span></div>`;
  };
  const m = Modal.open({title:'Book a home visit', sub:'Choose the care you need — we confirm within 30 minutes.', wide:true, body:'',
    foot:`<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="bk-ok">Request visit</button>`});
  draw(m);
  m.addEventListener('click', e => { const b = e.target.closest('[data-bk]'); if(!b) return; st.notes = ($('#bk-notes')||{}).value; st[b.dataset.bk] = b.dataset.v; if(b.dataset.bk==='date') st.slot = null; draw(m); });
  m.querySelector('#bk-ok').onclick = () => {
    st.notes = $('#bk-notes').value; if(!st.slot) return toast('Please pick a time slot','err');
    S().requests.unshift({id:uid('RQ'), pid:p.id, service:st.service, date:st.date, slot:st.slot, notes:st.notes, created:Date.now(), status:'pending', source:'Patient app'});
    addAlert('blue','request',`New visit request — ${p.name}: ${svc(st.service).name}, ${relDay(st.date)} ${fmtT(st.slot)}`);
    Modal.close(m); toast('Visit requested — you’ll get a confirmation shortly'); App.go('visits',{tab:'up'});
  };
};
ACT.pResched = el => {
  const v = visit(el.dataset.id);
  const m = Modal.open({title:'Reschedule visit', sub:`${svc(v.service).name} · ${relDay(v.date)} ${fmtT(v.start)}`, body:`<div class="f2"><div class="field"><label>New date</label><input class="input" type="date" id="rs-d" min="${TODAY()}" value="${v.date}"></div><div class="field"><label>New time</label><input class="input" type="time" id="rs-t" value="${v.start}"></div></div><div class="field"><label>Reason</label><select class="select" id="rs-r"><option>Doctor appointment</option><option>Family function</option><option>Patient not well enough</option><option>Other</option></select></div>`,
    foot:`<button class="btn btn-ghost" data-close>Keep visit</button><button class="btn btn-primary" id="rs-ok">Send request</button>`});
  m.querySelector('#rs-ok').onclick = () => { const d = $('#rs-d').value, t = $('#rs-t').value; v.reschedReq = {date:d, start:t, reason:$('#rs-r').value, ts:Date.now()}; addAlert('amber','resched',`Reschedule request — ${PU().name}: ${relDay(v.date)} ${fmtT(v.start)} → ${relDay(d)} ${fmtT(t)}`, {vid:v.id}); Store.save(); Modal.close(m); toast('Reschedule request sent'); App.refresh(); };
};
ACT.pCancel = async el => { const v = visit(el.dataset.id); if(await confirmBox({title:'Cancel this visit?', text:`${svc(v.service).name} on ${relDay(v.date)} at ${fmtT(v.start)} with ${stfOr(v.sid).name}. Cancellations within 2 hours of the visit may be charged.`, ok:'Cancel visit', cls:'btn-danger'})){ v.status = 'cancelled'; addAlert('amber','cancel',`Visit cancelled by patient — ${PU().name}, ${relDay(v.date)} ${fmtT(v.start)}`); Store.save(); toast('Visit cancelled','warn'); App.refresh(); } };
ACT.pRate = el => {
  const v = visit(el.dataset.id), s = stfOr(v.sid); let r = 5;
  const m = Modal.open({title:`Rate your visit`, sub:`${s.name} · ${relDay(v.date)}`, body:`<div class="center"><div class="stars" id="rt">${[1,2,3,4,5].map(i => `<button data-r="${i}" class="on">${I('star','fill')}</button>`).join('')}</div><textarea class="textarea mt" id="rt-c" placeholder="What went well? Anything we can improve?"></textarea></div>`, foot:`<button class="btn btn-primary btn-block" id="rt-ok">Submit rating</button>`});
  m.querySelector('#rt').onclick = e => { const b = e.target.closest('[data-r]'); if(!b) return; r = +b.dataset.r; $$('#rt button').forEach(x => x.classList.toggle('on', +x.dataset.r <= r)); };
  m.querySelector('#rt-ok').onclick = () => { v.rating = r; v.feedback = $('#rt-c').value; Store.save(); Modal.close(m); toast('Thank you for your feedback!'); App.refresh(); };
};
function visitSummaryHTML(v){
  const s = stfOr(v.sid) || {name:'Care staff', color:'#97A4B6', role:''}, p = pat(v.pid), e = v.evv || {};
  return `<div class="row mb">${av(s.name,s.color)}<div class="grow"><div class="b">${esc(s.name)}</div><div class="small muted">${s.role} · ${svc(v.service).name}</div></div>${vPill(v)}</div>
  ${e.inT ? `<div class="lbl mb">GPS visit verification (EVV)</div><div class="evv"><div><span>Clock-in</span><b>${fmtT(e.inT)}</b><div class="tiny muted">${fmtDist(e.inDist)} from home</div></div><div><span>Clock-out</span><b>${fmtT(e.outT)}</b><div class="tiny muted">${e.outDist!=null?fmtDist(e.outDist)+' from home':'—'}</div></div><div><span>Status</span><b style="color:${e.status==='verified'?'var(--green)':'var(--amber)'}">${e.status==='verified'?'Verified':'Review'}</b><div class="tiny muted">${e.mode==='manual'?'Manual':'GPS'} · ±${e.inAcc||8} m</div></div></div>` : ''}
  ${v.vitals ? `<div class="lbl mt-l mb">Vitals recorded</div><div class="chips">${v.vitals.sys?`<span class="pill p-red">BP ${v.vitals.sys}/${v.vitals.dia}</span>`:''}${v.vitals.pulse?`<span class="pill p-violet">Pulse ${v.vitals.pulse}</span>`:''}${v.vitals.spo2?`<span class="pill p-blue">SpO₂ ${v.vitals.spo2}%</span>`:''}${v.vitals.temp?`<span class="pill p-amber">Temp ${v.vitals.temp}°C</span>`:''}${v.vitals.sugar?`<span class="pill p-teal">Sugar ${v.vitals.sugar}</span>`:''}</div>`:''}
  <div class="lbl mt-l mb">Care tasks</div>${v.tasks.map(t => `<div class="row small" style="padding:4px 0"><span style="color:${t.done?'var(--green)':'var(--faint)'}">${I(t.done?'check':'x','sm')}</span><span class="${t.done?'':'muted'}">${esc(t.t)}</span></div>`).join('')}
  ${v.notes ? `<div class="lbl mt-l mb">Nurse’s notes</div><p class="ink2">${esc(v.notes)}</p>`:''}
  ${v.photos && v.photos.length ? `<div class="lbl mt-l mb">Photos</div><div class="photo-grid">${v.photos.map(f => fileImg(f)).join('')}</div>`:''}
  ${v.sig && String(v.sig).startsWith('data:') ? `<div class="lbl mt-l mb">Signature</div><img src="${v.sig}" alt="Signature" style="max-height:90px;border:1px solid var(--line);border-radius:12px;background:#fff">` : ''}<div class="hint green mt-l">${I('pen','sm')}<span>${v.sig ? `Signed by ${esc(v.sigBy || p.contact.name+' ('+p.contact.rel+')')}` : 'Signature pending'}</span></div>`;
}
ACT.pVisitSum = el => { const v = visit(el.dataset.id); Modal.open({title:'Visit summary', sub:`${relDay(v.date)} · ${fmtT(v.start)}`, body:visitSummaryHTML(v)}); };

/* ---------------- LIVE TRACKING ---------------- */
PV.track = () => {
  const p = PU(), v = trackVisit();
  if(!v) return `<div class="card">${emptyState('nav','No visit to track today','Live tracking appears here on the day of your visit, as soon as your nurse starts the journey.')}<div class="center"><button class="btn btn-primary" data-act="bookVisit">Book a visit</button></div></div>`;
  const s = stfOr(v.sid) || {name:'Care staff', role:'', qual:'', rating:'', exp:'', short:'', color:'#2B6DE8', phone:''};
  const steps = [['Visit confirmed', true], ['Nurse started journey', ['enroute','inprogress','completed'].includes(v.status)], ['Arrived & GPS check-in', ['inprogress','completed'].includes(v.status)], ['Visit completed', v.status==='completed']];
  const cur = steps.findIndex(x => !x[1]);
  return `<div class="grid" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)" id="trk-grid">
    <div class="card pad-0" style="overflow:hidden;position:relative"><div class="map" id="trk-map" style="height:min(62vh,520px);border:0;border-radius:0"></div>
      <div class="map-tag" id="trk-tag"></div></div>
    <div class="col" style="gap:16px">
      <div class="card"><div class="small b muted" style="letter-spacing:.08em;text-transform:uppercase">${relDay(v.date)} · ${fmtT(v.start)}</div>
        <div id="trk-status" class="mt-s"></div>
        <div class="divider"></div>
        <div class="row">${av(s.name,s.color,'lg',true)}<div class="grow"><div class="b" style="font-size:16px">${esc(s.name)}</div><div class="small muted">${esc(s.role)}${s.qual?' · '+esc(s.qual):''}</div>${s.id?`<div class="small"><span style="color:#E3A21A">★</span> <b>${ratingOf(s)}</b> <span class="muted">· ${s.exp} yrs experience</span></div>`:''}</div></div>
        <div class="chips mt"><span class="pill p-green">${I('shield','xs')} ID verified</span><span class="pill p-teal">${I('steth','xs')} ${esc(s.short||'Care')} staff</span></div>
        <div class="grid g2 keep mt" style="gap:10px">${s.phone?`<a class="btn btn-ghost" href="tel:+91${String(s.phone).replace(/\D/g,'').slice(-10)}">${I('phone','sm')} Call</a>`:`<a class="btn btn-ghost" href="tel:${CO.tel}">${I('phone','sm')} Call office</a>`}<button class="btn btn-ghost" data-go="messages" data-p='{"t":"${p.id}|${v.sid}"}'>${I('chat','sm')} Message</button></div>
      </div>
      <div class="card"><h3 class="mb" style="font-size:15px">Visit progress</h3><div class="tl">${steps.map((x,i) => `<div class="tl-i ${x[1]?'done':i===cur?'now':''}"><div class="b ${x[1]||i===cur?'':'muted'}">${x[0]}</div>${i===2 && v.evv && v.evv.inT?`<div class="tiny muted">${fmtT(v.evv.inT)} · ${fmtDist(v.evv.inDist)} from your door</div>`:''}</div>`).join('')}</div></div>
    </div></div>
    <style>@media(max-width:980px){#trk-grid{grid-template-columns:1fr!important}}</style>`;
};
function trackVisit(){
  const today = pVisits().filter(x => x.date===TODAY() && x.status!=='cancelled').sort(byTime);
  return today.find(x => ['enroute','inprogress'].includes(x.status)) || today.find(x => x.status==='scheduled') || today.filter(x => x.status==='completed').pop() || null;
}
PA.track = () => {
  const p = PU(), el = $('#trk-map'); if(!el) return;
  const v = trackVisit(); if(!v) return;
  const s = stfOr(v.sid) || {name:'Nurse', color:'#2B6DE8'};
  const map = new LiveMap(el, {minSpan:240, onRoute:r => { routeInfo = r; }});
  let routeInfo = null, fitted = false;
  map.set('home', {type:'home', lat:p.lat, lng:p.lng, label:'Home', color:'#0B2F5E'});
  const status = $('#trk-status'), tag = $('#trk-tag');
  const paint = () => {
    const vv = visit(v.id) || v; let html, tg, pos = null;
    if(vv.status==='inprogress' || vv.status==='completed'){
      html = `<h3 style="font-size:20px">${vv.status==='completed'?'Visit completed':`${esc(first(s.name))} is at your home`}</h3><div class="small muted">Checked in at ${fmtT(vv.evv && vv.evv.inT)} · GPS verified</div>`;
      tg = `<span class="pill p-green">${I('shield','xs')} GPS-verified check-in</span>`; map.setRoute(null); map.remove('staff');
    } else if(vv.status==='enroute'){
      const q = enroutePos(vv);
      if(q){
        pos = q; map.set('staff', {type:'staff', lat:q.lat, lng:q.lng, color:s.color, text:initials(s.name), live:true, label:first(s.name)});
        if(!map.route || haversine({lat:map.route[0][0], lng:map.route[0][1]}, q) > 250) map.setRoute([[q.lat,q.lng],[p.lat,p.lng]], s.color);
        const left = routeInfo && haversine({lat:map.route[0][0], lng:map.route[0][1]}, q) < 250 ? Math.max(q.left, routeInfo.m - haversine({lat:map.route[0][0], lng:map.route[0][1]}, q)) : q.left*1.3;
        const eta = left < 80 ? 0 : etaMin(left);
        html = `<div class="row"><span class="live-dot"></span><span class="small b" style="color:${q.live?'var(--green)':'var(--amber)'}">${q.live?'Live':'Last seen'} · ${timeAgo(q.ts)}</span></div><h3 style="font-size:26px;margin-top:6px">${eta===0?'Arriving now':`${eta} min away`}</h3><div class="small muted">${fmtDist(left)} by road${eta?` · expected around ${tsTime(Date.now()+eta*60000)}`:''}</div>`;
      } else {
        html = `<div class="row"><span class="live-dot"></span><span class="small b" style="color:var(--green)">On the way</span></div><h3 style="font-size:20px;margin-top:6px">${esc(first(s.name))} has started the journey</h3><div class="small muted">The live location will appear as soon as their phone shares GPS.</div>`;
      }
      tg = `<span class="pill p-violet"><span class="live-dot"></span>&nbsp;${esc(first(s.name))} is on the way</span>`;
    } else {
      const mins = toMin(vv.start) - nowMin();
      html = `<h3 style="font-size:20px">${mins>0 ? `Starts in ${mins>=60?Math.floor(mins/60)+' h ':''}${mins%60} min` : 'Starting shortly'}</h3><div class="small muted">Live tracking switches on automatically when ${esc(first(s.name))} starts the journey.</div>`;
      tg = `<span class="pill p-blue">${I('clock','xs')} Scheduled · ${fmtT(vv.start)}</span>`; map.remove('staff'); map.setRoute(null);
    }
    status.innerHTML = html; tag.innerHTML = tg; map.draw();
    if(!fitted || (pos && !fitted.withStaff)){ map.fit(pos ? [[p.lat,p.lng],[pos.lat,pos.lng]] : [[p.lat,p.lng]], 240); fitted = {withStaff:!!pos}; }
  };
  paint();
  App.every(paint, 3000);
};

/* ---------------- HEALTH ---------------- */
const VMETRIC = {
  bp:{l:'Blood pressure', unit:'mmHg', keys:['sys','dia'], colors:['#E1343A','#F08A8D'], band:[80,130], ok:x => x.sys<140 && x.dia<90},
  sugar:{l:'Blood sugar', unit:'mg/dL', keys:['sugar'], colors:['#D98A00'], band:[80,130], ok:x => x.sugar<140},
  spo2:{l:'SpO₂', unit:'%', keys:['spo2'], colors:['#2B6DE8'], band:[95,100], min:90, max:100, ok:x => x.spo2>=95},
  pulse:{l:'Pulse', unit:'bpm', keys:['pulse'], colors:['#7B5CE6'], band:[60,100], ok:x => x.pulse>=60 && x.pulse<=100},
  temp:{l:'Temperature', unit:'°C', keys:['temp'], colors:['#0E9AA7'], band:[36.1,37.2], ok:x => x.temp<37.5},
  weight:{l:'Weight', unit:'kg', keys:['weight'], colors:['#4FA21A'], ok:() => true},
};
PV.health = (prm) => {
  const tab = prm.tab || 'vitals', p = PU();
  const seg = `<div class="seg mb">${[['vitals','Vitals'],['meds','Medicines'],['plan','Care plan'],['docs','Reports']].map(([id,l]) => `<button class="${tab===id?'on':''}" data-go="health" data-p='{"tab":"${id}"}'>${l}</button>`).join('')}</div>`;
  let body = '';
  if(tab==='vitals'){
    const mk = prm.m || 'bp', M = VMETRIC[mk], vt = S().vitals.filter(x => x.pid===p.id && M.keys.some(k => x[k]!=null)).sort((a,b) => (a.date+(a.time||'')).localeCompare(b.date+(b.time||''))).slice(-30), L = vt[vt.length-1];
    if(!vt.length) body = `<div class="page-h"><div><h1>Vitals</h1><p>Recorded by your nurse at each visit — or add your own.</p></div><button class="btn btn-primary" data-act="addVital">${I('plus','sm')} Add reading</button></div>
    <div class="chips scroll mb">${Object.entries(VMETRIC).map(([k,m]) => `<button class="chip ${k===mk?'on':''}" data-go="health" data-p='{"tab":"vitals","m":"${k}"}'>${m.l}</button>`).join('')}</div><div class="card">${emptyState('pulse',`No ${M.l.toLowerCase()} readings yet`,'Readings appear here after your nurse’s visit or when you add one.')}</div>`;
    else body = `<div class="page-h"><div><h1>Vitals</h1><p>Recorded by your nurse at each visit — or add your own.</p></div><button class="btn btn-primary" data-act="addVital">${I('plus','sm')} Add reading</button></div>
    <div class="chips scroll mb">${Object.entries(VMETRIC).map(([k,m]) => `<button class="chip ${k===mk?'on':''}" data-go="health" data-p='{"tab":"vitals","m":"${k}"}'>${m.l}</button>`).join('')}</div>
    <div class="card"><div class="card-h"><div><h3>${M.l}</h3><div class="sub">Last 14 days · green band = target range</div></div>${L?`<div style="text-align:right"><div class="b tnum" style="font-size:22px;color:var(--navy)">${M.keys.map(k => L[k]).join('/')}<span class="small muted"> ${M.unit}</span></div><span class="pill ${M.ok(L)?'p-green':'p-amber'}">${M.ok(L)?'In range':'Above target'}</span></div>`:''}</div>
      ${chart({type:'line', labels:vt.map(x => fmtD(x.date,{day:'numeric',month:'short'})), series:M.keys.map((k,i) => ({values:vt.map(x => x[k]), color:M.colors[i]})), band:M.band, min:M.min, max:M.max, noArea:M.keys.length>1}, 240)}
      ${M.keys.length>1?`<div class="row gap-l mt-s"><span class="legend-row"><i style="background:${M.colors[0]}"></i>Systolic</span><span class="legend-row"><i style="background:${M.colors[1]}"></i>Diastolic</span></div>`:''}</div>
    <div class="card mt-l"><div class="card-h"><h3>Recent readings</h3></div><div class="list">
      ${vt.slice().reverse().slice(0,8).map(x => `<div class="li" style="align-items:flex-start"><div class="li-ic ${x.by.startsWith('Self')?'bg-teal':'bg-blue'}">${I(x.by.startsWith('Self')?'user':'steth','sm')}</div><div class="grow"><div class="row between"><span class="t">${relDay(x.date)} <span class="muted small">· ${fmtT(x.time)}</span></span><span class="tiny muted">${esc(x.by)}</span></div><div class="chips mt-s" style="gap:6px">${vHas(x,'sys')?`<span class="pill p-red">BP ${x.sys}/${vHas(x,'dia')?x.dia:'–'}</span>`:''}${vHas(x,'sugar')?`<span class="pill p-amber">Sugar ${x.sugar}</span>`:''}${vHas(x,'spo2')?`<span class="pill p-blue">SpO₂ ${x.spo2}%</span>`:''}${vHas(x,'pulse')?`<span class="pill p-violet">Pulse ${x.pulse}</span>`:''}${vHas(x,'temp')?`<span class="pill p-teal">${x.temp}°C</span>`:''}${vHas(x,'weight')?`<span class="pill p-gray">${x.weight} kg</span>`:''}</div></div></div>`).join('')}</div></div>`;
  }
  if(tab==='meds'){
    const meds = S().meds[p.id] || [];
    body = `<div class="page-h"><div><h1>Medicines</h1><p>${medsDoneCount()} of ${medsDueToday().length} doses taken today · reminders on</p></div></div>
    <div class="grid g2"><div class="card"><div class="card-h"><h3>Today’s schedule</h3><span class="pill p-blue">${fmtD(TODAY())}</span></div>${medsTodayList()}</div>
    <div class="card"><div class="card-h"><h3>Current prescription</h3><span class="small muted">${esc(p.doctor||'')}</span></div><div class="list">${meds.map(m => `<div class="li"><div class="li-ic bg-green">${I('pill','sm')}</div><div class="grow"><div class="t">${esc(m.name)}</div><div class="s">${esc(m.purpose)} · ${m.sos?esc(m.when):m.times.map(fmtT).join(', ')}</div></div><div style="text-align:right">${m.left<=7?`<span class="pill p-red">${m.left} days left</span><button class="btn-text small mt-s" style="display:block" data-act="refill" data-m="${m.id}">Request refill</button>`:`<span class="pill p-gray">${m.left} days</span>`}</div></div>`).join('')}</div></div></div>
    <div class="hint mt">${I('info','sm')}<span>Never change or stop a medicine without talking to your doctor. Your nurse reviews adherence at every visit.</span></div>`;
  }
  if(tab==='plan'){
    const c = S().carePlan[p.id];
    body = `<div class="page-h"><div><h1>Care plan</h1><p>${esc(p.plan||'Personalised home-care plan')} · next review ${c&&c.review?relDay(c.review):'—'}</p></div></div>
    <div class="grid g2"><div class="card"><div class="card-h"><h3>Goals</h3></div>${c?c.goals.map(g => `<div class="mb"><div class="row between"><span class="sb">${esc(g.g)}</span><b>${g.p}%</b></div><div class="bar ${g.p>80?'green':g.p<50?'amber':''} mt-s"><i style="width:${g.p}%"></i></div></div>`).join(''):emptyState('clipboard','No goals yet')}</div>
    <div class="card"><div class="card-h"><h3>Medical summary</h3></div><dl class="kv"><dt>Diagnosis</dt><dd>${p.dx.map(esc).join('<br>')}</dd><dt>Allergies</dt><dd style="color:var(--red)">${p.allergies.length?p.allergies.map(esc).join(', '):'None known'}</dd><dt>Blood group</dt><dd>${p.blood}</dd><dt>Doctor</dt><dd>${esc(p.doctor||'—')}</dd>${c?`<dt>Diet</dt><dd>${esc(c.diet)}</dd><dt>Activity</dt><dd>${esc(c.activity)}</dd>`:''}</dl></div></div>
    <div class="card mt-l"><div class="card-h"><h3>Services in your plan</h3></div><div class="grid g2">${p.services.map(sid => { const s = svc(sid), vs = pVisits().filter(v => v.service===sid); return `<div class="row" style="padding:12px;border:1px solid var(--line);border-radius:16px"><div class="li-ic" style="background:${s.color}18;color:${s.color}">${I(s.icon)}</div><div class="grow"><div class="b">${s.name}</div><div class="small muted">${vs.filter(v=>v.status==='completed').length} completed · ${vs.filter(v=>v.status==='scheduled'&&v.date>=TODAY()).length} upcoming</div></div></div>`; }).join('')}</div>
      <div class="lbl mt-l mb">What your nurse does each visit</div><div class="chips">${p.services.flatMap(sid => TASKS[sid]).slice(0,10).map(t => `<span class="pill p-gray">${esc(t)}</span>`).join('')}</div></div>`;
  }
  if(tab==='docs'){
    const docs = patientDocs(p.id);
    const col = {PDF:['#FDECEC','#C4242A'], Rx:['#EEF4FF','#1F5BD0'], LAB:['#E3F6F7','#08737D'], PLAN:['#EDF8E3','#3B8412'], IMG:['#F1EDFD','#5B3FC4']};
    body = `<div class="page-h"><div><h1>Reports & documents</h1><p>Prescriptions, lab reports and discharge papers — always with you.</p></div><label class="btn btn-primary">${I('upload','sm')} Upload<input type="file" accept="image/*,.pdf" class="hidden" data-onchange="docUpload" data-pid="${p.id}"></label></div>
    ${docs.length ? `<div class="grid g2">${docs.map(d => { const [bg,fg] = col[d.kind]||col.PDF; return `<div class="doc" data-act="viewDoc" data-id="${d.id}" data-pid="${p.id}"><div class="doc-ic" style="background:${bg};color:${fg}">${d.kind}</div><div class="grow"><div class="b">${esc(d.name)}</div><div class="small muted">${fmtD(d.date,{day:'numeric',month:'short',year:'numeric'})} · ${esc(d.by)}</div></div>${I('right','sm muted')}</div>`; }).join('')}</div>` : `<div class="card">${emptyState('file','No documents yet','Upload discharge papers, lab reports or prescriptions so your care team can see them.')}</div>`}`;
  }
  return seg + body;
};
ACT.addVital = () => {
  const m = Modal.open({title:'Add a reading', sub:'Enter what you measured at home', body:`<form id="vt-f" data-submit="saveVital"><div class="f2"><div class="field"><label>BP systolic</label><input class="input" name="sys" inputmode="numeric" placeholder="130"></div><div class="field"><label>BP diastolic</label><input class="input" name="dia" inputmode="numeric" placeholder="82"></div></div>
    <div class="f3"><div class="field"><label>Sugar (mg/dL)</label><input class="input" name="sugar" inputmode="numeric" placeholder="126"></div><div class="field"><label>SpO₂ (%)</label><input class="input" name="spo2" inputmode="numeric" placeholder="97"></div><div class="field"><label>Pulse</label><input class="input" name="pulse" inputmode="numeric" placeholder="76"></div></div>
    <div class="f2"><div class="field"><label>Temperature (°C)</label><input class="input" name="temp" inputmode="decimal" placeholder="36.8"></div><div class="field"><label>Weight (kg)</label><input class="input" name="weight" inputmode="decimal" placeholder="61.5"></div></div></form>`,
    foot:`<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" form="vt-f">Save reading</button>`});
};
FORM.saveVital = f => {
  const d = Object.fromEntries(new FormData(f)); const L = S().vitals.filter(x => x.pid===App.uid).slice(-1)[0] || {};
  const n = k => d[k]==='' ? L[k] : Number(d[k]);
  if(!['sys','dia','sugar','spo2','pulse','temp','weight'].some(k => d[k]!=='')) return toast('Enter at least one value','err');
  const r = {id:uid('VT'), pid:App.uid, date:TODAY(), time:nowHM(), sys:n('sys'), dia:n('dia'), sugar:n('sugar'), spo2:n('spo2'), pulse:n('pulse'), temp:n('temp'), weight:n('weight'), by:'Self (family)'};
  S().vitals.push(r);
  if(r.sys>=160 || r.sugar>=250 || r.spo2<92) addAlert('red','vitals',`Abnormal reading — ${PU().name}: ${r.sys>=160?`BP ${r.sys}/${r.dia} `:''}${r.sugar>=250?`Sugar ${r.sugar} `:''}${r.spo2<92?`SpO₂ ${r.spo2}%`:''}`);
  Store.save(); Modal.close(f); toast('Reading saved and shared with your nurse'); if(App.view==='health') App.refresh(); else App.go('health',{tab:'vitals'});
};
ACT.refill = el => { const m = (S().meds[App.uid]||[]).find(x => x.id===el.dataset.m); addAlert('blue','refill',`Refill request — ${PU().name}: ${m.name} (${m.left} days left)`); toast(`Refill requested for ${m.name}`); el.outerHTML = '<span class="small b" style="color:var(--green)">Requested</span>'; };
function patientDocs(pid){
  const out = [], meds = S().meds[pid] || [], plan = S().carePlan[pid];
  if(meds.length) out.push({id:'auto-rx', name:'Current prescription', kind:'Rx', date:TODAY(), by:'Careva+ care team', type:'rx'});
  if(plan && (plan.goals||[]).length) out.push({id:'auto-plan', name:'Care plan', kind:'PLAN', date:plan.updated || TODAY(), by:'Careva+ care team', type:'plan'});
  return out.concat((S().docs[pid] || []).slice().sort((a,b) => (b.date||'').localeCompare(a.date||'')));
}
ON.docUpload = async el => {
  const f = el.files && el.files[0], pid = el.dataset.pid || App.uid; if(!f) return;
  if(f.size > 10*1024*1024) return toast('File is too large (max 10 MB)','err');
  toast('Uploading…','warn',1500);
  try{
    const ext = (f.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g,'');
    const path = `${pid}/${uid('f')}.${ext}`; await Cloud.upload(path, f);
    const by = App.portal==='patient' ? 'Uploaded by family' : App.portal==='staff' ? `${SU().name}` : 'Careva+ office';
    (S().docs[pid] ||= []).unshift({id:uid('d'), pid, name:f.name.replace(/\.[^.]+$/,''), kind:/pdf/i.test(f.type)?'PDF':/image/.test(f.type)?'IMG':'PDF', mime:f.type, path, date:TODAY(), by, type:'upload'});
    Store.save(); toast('Document uploaded'); App.refresh();
  }catch(e){ toast(isNetErr(e) ? 'No internet connection' : 'Upload failed: ' + (e.message||''),'err'); }
};
ACT.viewDoc = el => {
  const pid = el.dataset.pid || App.uid, p = pat(pid), d = patientDocs(pid).find(x => x.id===el.dataset.id); if(!d) return;
  const meds = S().meds[pid]||[], c = S().carePlan[pid] || {};
  const head = `<div class="ph"><div><img src="img/logo.png" alt="Careva+"></div><div style="text-align:right" class="small"><b>${esc(d.name)}</b><br><span class="muted">${fmtD(d.date,{day:'numeric',month:'long',year:'numeric'})}</span></div></div><div class="row between small mb wrap"><span><b>${esc(p.name)}</b> · ${p.age||''} ${p.g||''} · ${p.id}</span><span class="muted">${esc(p.addr||'')}</span></div>`;
  let inner = '', foot = `<button class="btn btn-primary" data-close>Done</button>`;
  if(d.type==='rx') inner = `<h4>℞ Current medicines</h4><table class="tbl"><thead><tr><th>Medicine</th><th>Dose</th><th>Timing</th></tr></thead><tbody>${meds.map(m => `<tr><td class="b">${esc(m.name)}<div class="tiny muted">${esc(m.purpose||'')}</div></td><td>${esc(m.dose||'')}</td><td>${m.sos?'When needed':(m.times||[]).map(fmtT).join(', ')}<div class="tiny muted">${esc(m.when||'')}</div></td></tr>`).join('')}</tbody></table>${p.doctor?`<p class="mt small muted">Prescribing doctor: ${esc(p.doctor)}</p>`:''}`;
  else if(d.type==='plan') inner = `<h4>Home care plan</h4>${p.plan?`<p class="ink2">${esc(p.plan)}</p>`:''}<ul>${(c.goals||[]).map(g => `<li>${esc(g.g)} — ${g.p||0}%</li>`).join('')}</ul>${c.diet?`<p><b>Diet:</b> ${esc(c.diet)}</p>`:''}${c.activity?`<p><b>Activity:</b> ${esc(c.activity)}</p>`:''}${c.review?`<p><b>Next review:</b> ${fmtD(c.review,{day:'numeric',month:'short',year:'numeric'})}</p>`:''}`;
  else if(d.type==='note') inner = `<h4>${esc(d.name)}</h4><p class="ink2" style="white-space:pre-wrap;font-size:14px">${esc(d.text||'')}</p><p class="small muted mt">${esc(d.by||'')}${d.time?' · '+fmtT(d.time):''}</p>`;
  else if(d.path){ inner = /image/.test(d.mime||'') || d.kind==='IMG' ? `<div class="center">${fileImg(d.path,'doc-img')}</div>` : `<div class="empty"><div class="e-ic">${I('file','lg')}</div><p class="mt-s">${esc(d.name)}.pdf</p></div>`; foot = `<button class="btn btn-ghost" data-act="openFile" data-path="${esc(d.path)}">${I('eye','sm')} Open file</button><button class="btn btn-primary" data-close>Done</button>`; }
  else inner = `<div class="empty">${I('file','xl')}<p class="mt-s">This document has no file attached.</p></div>`;
  const m = Modal.open({title:esc(d.name), wide:true, body:`<div class="paper">${head}${inner}</div>`, foot});
  hydrateFiles(m);
};
ACT.openFile = el => openFile(el.dataset.path);

/* ---------------- MESSAGES (shared chat renderer) ---------------- */
function chatView(threads, active, meId, opts={}){
  const t = threads.find(x => x.id===active) || threads[0];
  const msgs = S().messages[t.id] || [];
  if(active || window.innerWidth > 980) Unread.mark(t.id);
  const list = `<div class="list">${threads.map(x => { const last = (S().messages[x.id]||[]).slice(-1)[0]; return `<div class="li click" data-go="${opts.view||'messages'}" data-p='{"t":"${x.id}"}' style="${x.id===t.id?'background:var(--blue-50)':''}">${av(x.name, x.color)}<div class="grow"><div class="row between"><span class="t ell">${esc(x.name)}${x.id!==t.id || !(active || window.innerWidth > 980) ? nbadge(Unread.of(x.id, meId), 'blue') : ''}</span><span class="tiny muted">${last?timeAgo(last.ts):''}</span></div><div class="s ell">${last?esc(last.text):esc(x.sub)}</div></div></div>`; }).join('')}</div>`;
  const chat = `<div class="card pad-0 chat"><div class="row" style="padding:12px 16px;border-bottom:1px solid var(--line)">${av(t.name,t.color,'sm')}<div class="grow"><div class="b">${esc(t.name)}</div><div class="tiny muted">${esc(t.sub)}</div></div></div>
    <div class="chat-body" id="chat-body">${msgs.map(m => `<div class="msg ${m.from===meId?'me':''} ${Date.now()-(m.ts||0) < 4000 ? 'new' : ''}">${esc(m.text)}<small>${tsTime(m.ts)}</small></div>`).join('') || `<div class="empty">Start the conversation</div>`}</div>
    <form class="chat-in" data-submit="sendMsg" data-thread="${t.id}" data-me="${meId}"><input name="m" placeholder="Type a message…" autocomplete="off"><button class="btn btn-primary" aria-label="Send">${I('send','sm')}</button></form></div>`;
  return `<div class="grid" style="grid-template-columns:minmax(0,320px) minmax(0,1fr)" id="msg-grid"><div class="card ${opts.mobileChat?'hide-m':''}">${list}</div><div class="${opts.mobileChat?'':'hide-m'}">${opts.mobileChat?`<button class="back hide-d" data-go="${opts.view||'messages'}">${I('left','sm')} All conversations</button>`:''}${chat}</div></div><style>@media(max-width:980px){#msg-grid{grid-template-columns:1fr!important}}</style>`;
}
FORM.sendMsg = f => {
  const txt = f.m.value.trim(); if(!txt) return; const th = f.dataset.thread, me = f.dataset.me; addMsg(th, me, txt); f.m.value = '';
  App.refresh(); const b = $('#chat-body'); if(b) b.scrollTop = b.scrollHeight;
};
PV.messages = (prm) => chatView(threadsP(), prm.t, App.uid, {mobileChat:!!prm.t});
PA.messages = () => { const b = $('#chat-body'); if(b) b.scrollTop = b.scrollHeight; };

/* ---------------- BILLING ---------------- */
const INV_ST = {paid:['Paid','p-green'], due:['Due','p-amber'], overdue:['Overdue','p-red'], verifying:['Verifying payment','p-blue']};
const invPill = i => { const [l,c] = INV_ST[i.status] || [i.status,'p-gray']; return `<span class="pill ${c}">${l}</span>`; };
PV.billing = () => {
  const p = PU(), inv = S().invoices.filter(i => i.pid===p.id).sort((a,b) => (b.month||'').localeCompare(a.month||''));
  const due = inv.filter(i => ['due','overdue'].includes(i.status)), ver = inv.filter(i => i.status==='verifying'), dueAmt = sum(due.map(i => i.amount));
  return `<div class="grid g2"><div class="hero"><div class="small b" style="color:#B9CCEC;letter-spacing:.08em;text-transform:uppercase">Amount due</div><div style="font-size:36px;font-weight:800;margin-top:6px" class="tnum">${inr(dueAmt)}</div><div class="muted">${due.length ? `${due.length} invoice${due.length>1?'s':''} · due ${fmtD(due[due.length-1].due,{day:'numeric',month:'short'})}` : ver.length ? 'Payment being verified by the office' : 'You’re all paid up'}</div>
      <div class="row mt wrap"><button class="btn btn-primary" data-act="payNow" ${dueAmt?'':'disabled'}>${I('card','sm')} Pay now</button><span class="small" style="color:#B9CCEC">UPI · GPay · PhonePe · Paytm</span></div></div>
    <div class="card"><div class="card-h"><h3>Billing details</h3></div><dl class="kv"><dt>Payer</dt><dd>${esc(p.payer||'Self-pay')}</dd><dt>Billing contact</dt><dd>${esc(p.contact.name)}</dd>${p.plan?`<dt>Care plan</dt><dd>${esc(p.plan)}</dd>`:''}<dt>Rates</dt><dd>${(p.services||[]).map(s => `${svc(s).short} ${inr(rate(s))}/${svc(s).unit}`).join('<br>')}</dd></dl>
      <button class="btn btn-ghost btn-sm mt" data-act="insurance">${I('shield','sm')} Add insurance policy</button></div></div>
  <div class="card mt-l"><div class="card-h"><h3>Invoices</h3></div>${inv.length ? `<div class="list">${inv.map(i => `<div class="li click" data-act="viewInv" data-id="${i.id}"><div class="li-ic ${i.status==='paid'?'bg-green':i.status==='overdue'?'bg-red':'bg-amber'}">${I('file','sm')}</div><div class="grow"><div class="t">${new Date((i.month||TODAY().slice(0,7))+'-01').toLocaleDateString(LOC(),{month:'long',year:'numeric'})}</div><div class="s">${i.id} · ${sum((i.items||[]).map(x=>x.q))} visits</div></div><div style="text-align:right"><div class="b tnum">${inr(i.amount)}</div>${invPill(i)}</div></div>`).join('')}</div>` : emptyState('file','No invoices yet','Invoices appear here at the end of each month.')}</div>`;
};
function invoiceHTML(i){
  const p = pat(i.pid) || {name:'', contact:{}, addr:'', id:i.pid};
  return `<div class="paper"><div class="ph"><img src="img/logo.png" alt="Careva+"><div style="text-align:right" class="small"><b>INVOICE</b><br>${i.id}<br><span class="muted">${fmtD(i.date,{day:'numeric',month:'short',year:'numeric'})}</span></div></div>
    <div class="row between small mb top wrap"><div><span class="muted">Billed to</span><br><b>${esc(p.contact.name||p.name)}</b><br>for ${esc(p.name)} (${p.id})<br>${esc(p.addr)}</div><div style="text-align:right"><span class="muted">From</span><br><b>${esc(CO.name)}</b><br>${CO.city}<br>${CO.phone} · ${CO.web}</div></div>
    <table class="tbl"><thead><tr><th>Service</th><th>Qty</th><th>Rate</th><th style="text-align:right">Amount</th></tr></thead><tbody>${(i.items||[]).map(x => `<tr><td>${esc(x.d)}</td><td>${x.q}</td><td>${inr(x.r)}</td><td style="text-align:right" class="b">${inr(x.q*x.r)}</td></tr>`).join('')}
      <tr><td colspan="3" class="b">Total</td><td style="text-align:right;font-size:16px" class="b">${inr(i.amount)}</td></tr></tbody></table>
    <p class="small muted mt">${i.status==='paid' ? `Paid on ${fmtD(i.paidOn||i.date,{day:'numeric',month:'short'})}${i.txn?` · Ref ${esc(i.txn)}`:''}` : i.status==='verifying' ? `Payment reported · Ref ${esc(i.payRef||'')} — awaiting office confirmation` : `Due by ${fmtD(i.due,{day:'numeric',month:'short',year:'numeric'})}`}</p></div>`;
}
ACT.viewInv = el => { const i = S().invoices.find(x => x.id===el.dataset.id); Modal.open({title:'Invoice', wide:true, body:invoiceHTML(i), foot:`<button class="btn btn-ghost" data-act="copyInv" data-id="${i.id}">${I('copy','sm')} Copy summary</button>${['due','overdue'].includes(i.status)&&App.portal==='patient'?`<button class="btn btn-primary" data-act="payNow">Pay ${inr(i.amount)}</button>`:'<button class="btn btn-primary" data-close>Done</button>'}`}); };
ACT.copyInv = el => { const i = S().invoices.find(x => x.id===el.dataset.id), p = pat(i.pid); copyText(`${CO.brand} invoice ${i.id} — ${p.name}\n${(i.items||[]).map(x => `${x.d}: ${x.q} × ${inr(x.r)} = ${inr(x.q*x.r)}`).join('\n')}\nTotal: ${inr(i.amount)} (${(INV_ST[i.status]||[i.status])[0]})`); };
ACT.payNow = () => {
  Modal.closeAll();
  const due = S().invoices.filter(i => i.pid===App.uid && ['due','overdue'].includes(i.status)), amt = sum(due.map(i => i.amount));
  if(!amt) return toast('Nothing to pay right now');
  const upi = CO.upi, note = 'Careva+ ' + due.map(i => i.id).join(' ');
  const link = upi ? `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(CO.brand)}&am=${amt.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note.slice(0,60))}` : '';
  Modal.open({title:'Pay Careva+', sub:`${inr(amt)} · ${due.length} invoice${due.length>1?'s':''}`, body:`
    ${upi ? `<a class="btn btn-primary btn-lg btn-block" href="${link}">${I('phone','sm')} Pay ${inr(amt)} with a UPI app</a>
      <div class="hint mt">${I('info','sm')}<span>Opens GPay, PhonePe, Paytm or BHIM on this phone. Or pay to UPI ID <b>${esc(upi)}</b> <button class="btn-text small" data-act="copyUpi">Copy</button></span></div>`
      : `<div class="hint amber">${I('info','sm')}<span>Online payment details haven’t been added yet. Please pay the care coordinator, or call ${CO.phone}.</span></div>`}
    <div class="divider"></div>
    <form data-submit="payClaim" id="pc-f"><div class="lbl mb">Already paid?</div><div class="field"><label>UPI / bank reference (UTR) number</label><input class="input" name="ref" required minlength="6" placeholder="e.g. 431298765012" inputmode="numeric"></div></form>
    <p class="tiny muted">The office confirms your payment and the invoice is marked paid in the app.</p>`,
    foot:`<button class="btn btn-ghost" data-close>Close</button><button class="btn btn-green" form="pc-f">${I('check','sm')} I’ve paid</button>`});
};
ACT.copyUpi = () => copyText(CO.upi);
FORM.payClaim = f => {
  const ref = f.ref.value.trim(); if(ref.length < 6) return toast('Enter the payment reference number','err');
  const due = S().invoices.filter(i => i.pid===App.uid && ['due','overdue'].includes(i.status)), amt = sum(due.map(i => i.amount));
  due.forEach(i => { i.payRef = ref; i.payClaimedAt = Date.now(); i.status = 'verifying'; });
  addAlert('green','payment',`Payment reported — ${PU().name}: ${inr(amt)} · Ref ${ref}`);
  Store.save(); Modal.close(f); toast('Thank you! The office will confirm your payment'); App.refresh();
};
ACT.insurance = () => { const m = Modal.open({title:'Add insurance', body:`<form id="ins-f" data-submit="saveIns"><div class="field"><label>Insurance company</label><input class="input" name="co" required></div><div class="f2"><div class="field"><label>Policy number</label><input class="input" name="no" required></div><div class="field"><label>Valid till</label><input class="input" type="date" name="till"></div></div><div class="hint">${I('info','sm')}<span>Our billing team will check home-care cover with your insurer.</span></div></form>`, foot:`<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" form="ins-f">Save</button>`}); };
FORM.saveIns = f => { const p = PU(); p.payer = 'Insurance (verification pending)'; addAlert('blue','insurance',`Insurance added — ${p.name}: ${f.co.value}`); Store.save(); Modal.close(f); toast('Insurance details sent for verification'); App.refresh(); };

/* ---------------- ACCOUNT ---------------- */
PV.account = () => {
  const p = PU(), family = p.family || [{name:p.contact.name, rel:p.contact.rel, phone:p.contact.phone, access:'Full access'}], prefs = p.prefs || {};
  return `<div class="card"><div class="row">${av(p.name, patColor(p.id), 'xl')}<div class="grow"><h2 style="font-size:21px">${esc(p.name)}</h2><div class="muted">${p.age} yrs · ${p.g==='F'?'Female':'Male'} · Blood group ${esc(p.blood||'—')}</div><div class="chips mt-s"><span class="pill p-blue">${p.id}</span><span class="pill p-green">Active since ${fmtD(p.since||TODAY(),{month:'short',year:'numeric'})}</span></div></div></div></div>
  <div class="grid g2 mt-l">
    <div class="card"><div class="card-h"><h3>Personal details</h3><button class="btn btn-soft btn-sm" data-act="editProfile">${I('edit','sm')} Edit</button></div><dl class="kv"><dt>Mobile</dt><dd>${fmtPhone(p.phone)}</dd><dt>Address</dt><dd>${esc(p.addr)}</dd><dt>Allergies</dt><dd style="color:var(--red)">${p.allergies.join(', ')||'None'}</dd><dt>Doctor</dt><dd>${esc(p.doctor||'—')}</dd><dt>Emergency contact</dt><dd>${esc(p.contact.name)} (${esc(p.contact.rel)})<br>${fmtPhone(p.contact.phone)}</dd></dl></div>
    <div class="card"><div class="card-h"><div><h3>Family access</h3><div class="sub">Family members can track visits & see reports</div></div><button class="btn btn-soft btn-sm" data-act="addFamily">${I('plus','sm')} Invite</button></div><div class="list">${family.map(f => `<div class="li">${av(f.name,'#11407D')}<div class="grow"><div class="t">${esc(f.name)}</div><div class="s">${esc(f.rel)} · ${fmtPhone(f.phone)}</div></div><span class="pill p-blue">${esc(f.access)}</span></div>`).join('')}</div></div>
    <div class="card"><div class="card-h"><h3>Notifications</h3></div>${[['visits','Visit reminders & nurse on the way',1],['meds','Medicine reminders',1],['bills','Bills & payment receipts',1],['family','Share visit updates with family',1]].map(([k,l,on]) => `<div class="li"><div class="grow sb">${l}</div><label class="switch"><input type="checkbox" ${(prefs[k] ?? on)?'checked':''} data-onchange="prefToggle" data-k="${k}"><span></span></label></div>`).join('')}<div class="li"><div class="li-ic bg-blue">${I('bell','sm')}</div><div class="grow"><div class="t">Notification sound</div><div class="s">Play a sound for new messages and updates</div></div><label class="switch"><input type="checkbox" ${Chime.on()?'checked':''} data-onchange="soundToggle"><span></span></label></div>${installBtn('btn btn-ghost btn-sm mt')}</div>
    <div class="card"><div class="card-h"><h3>Help & privacy</h3></div><div class="list">
      <div class="li"><div class="li-ic bg-violet">${I('globe','sm')}</div><div class="grow"><div class="t">Language</div><div class="s">App language on this phone</div></div>${langSeg()}</div>
      <a class="li click" href="tel:${CO.tel}"><div class="li-ic bg-blue">${I('phone','sm')}</div><div class="grow"><div class="t">Call Careva+</div><div class="s">${CO.phone} · 24×7 care line</div></div></a>
      <div class="li click" data-go="health" data-p='{"tab":"docs"}'><div class="li-ic bg-amber">${I('shield','sm')}</div><div class="grow"><div class="t">Consent & privacy</div><div class="s">GPS is used only to verify visits at your home</div></div></div>
      <div class="li click" data-act="logout"><div class="li-ic bg-red">${I('logout','sm')}</div><div class="grow"><div class="t">Sign out</div></div></div></div></div>
  </div>`;
};
ON.prefToggle = el => { const p = PU(); p.prefs = {...(p.prefs||{}), [el.dataset.k]:el.checked}; Store.save(); toast('Preference saved'); };
ACT.addFamily = () => { const m = Modal.open({title:'Invite a family member', body:`<form id="fam-f" data-submit="saveFamily"><div class="field"><label>Name</label><input class="input" name="name" required></div><div class="f2"><div class="field"><label>Relationship</label><select class="select" name="rel"><option>Son</option><option>Daughter</option><option>Spouse</option><option>Grandchild</option><option>Relative</option><option>Neighbour</option></select></div><div class="field"><label>Mobile</label><input class="input" name="phone" inputmode="tel" required></div></div><div class="field"><label>Access</label><select class="select" name="access"><option>Full access</option><option>Visits & tracking only</option><option>Billing only</option></select></div></form>`, foot:`<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" form="fam-f">Send invite</button>`}); };
FORM.saveFamily = f => { const d = Object.fromEntries(new FormData(f)), p = PU(); p.family = (p.family || [{name:p.contact.name, rel:p.contact.rel, phone:p.contact.phone, access:'Full access'}]).concat([d]); Store.save(); Modal.close(f); toast(`Invite sent to ${d.name}`); App.refresh(); };
ACT.editProfile = () => { const p = PU(); const m = Modal.open({title:'Edit details', body:`<form id="ep-f" data-submit="saveProfile"><div class="field"><label>Address</label><textarea class="textarea" name="addr">${esc(p.addr)}</textarea></div><div class="f2"><div class="field"><label>Emergency contact</label><input class="input" name="cn" value="${esc(p.contact.name)}"></div><div class="field"><label>Their mobile</label><input class="input" name="cp" value="${esc(p.contact.phone)}"></div></div></form>`, foot:`<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" form="ep-f">Save</button>`}); };
FORM.saveProfile = f => { const p = PU(); p.addr = f.addr.value; p.contact.name = f.cn.value; p.contact.phone = f.cp.value; Store.save(); Modal.close(f); toast('Details updated'); App.refresh(); };
