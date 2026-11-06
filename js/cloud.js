'use strict';
/* =========================================================
   Cloud — live Supabase backend (or a local, single-browser
   backend when no database is configured) + the sync engine
   that keeps the in-memory store S() in step with the database.
   ========================================================= */
/* ---------- "Remember me" ----------
   Ticked: the sign-in is kept on this phone (stays signed in after closing the app).
   Not ticked: the sign-in lives only until the app/browser tab is closed. */
const Remember = {
  get on(){ try{ return localStorage.getItem('careva_remember') === '1'; }catch(e){ return false; } },
  set(v){ try{ localStorage.setItem('careva_remember', v ? '1' : '0'); }catch(e){} },
  def(){ try{ return localStorage.getItem('careva_remember') !== '0'; }catch(e){ return true; } },   // switch starts on unless it was turned off last time
  store: {
    getItem(k){ try{ const v = sessionStorage.getItem(k); return v != null ? v : localStorage.getItem(k); }catch(e){ return null; } },
    setItem(k, v){ try{ if(Remember.on){ localStorage.setItem(k, v); sessionStorage.removeItem(k); } else { sessionStorage.setItem(k, v); localStorage.removeItem(k); } }catch(e){} },
    removeItem(k){ try{ localStorage.removeItem(k); sessionStorage.removeItem(k); }catch(e){} },
  },
  // the mobile number / employee ID is filled in for next time
  last(kind){ try{ return (JSON.parse(localStorage.getItem('careva_last_login') || '{}'))[kind] || ''; }catch(e){ return ''; } },
  keep(kind, v){ try{ const o = JSON.parse(localStorage.getItem('careva_last_login') || '{}'); if(v) o[kind] = v; else delete o[kind]; localStorage.setItem('careva_last_login', JSON.stringify(o)); }catch(e){} },
};

const LOGIN_EMAIL = {
  staff: id => `${String(id).trim().toLowerCase()}@staff.carevaplus.com`,
  patient: ph => `${String(ph).replace(/\D/g,'').slice(-10)}@patient.carevaplus.com`,
};
const OFFICE_ROLES = ['admin','coordinator','supervisor','billing'];

// how each database table maps onto the in-memory store
const COLL = [
  {t:'settings', kind:'single'},
  {t:'staff', kind:'arr', k:'staff'}, {t:'patients', kind:'arr', k:'patients'}, {t:'visits', kind:'arr', k:'visits'},
  {t:'vitals', kind:'arr', k:'vitals'}, {t:'requests', kind:'arr', k:'requests'}, {t:'invoices', kind:'arr', k:'invoices'},
  {t:'alerts', kind:'arr', k:'alerts'}, {t:'leave', kind:'arr', k:'leave'},
  {t:'meds', kind:'group', k:'meds', g:'pid'}, {t:'docs', kind:'group', k:'docs', g:'pid'},
  {t:'notifications', kind:'group', k:'notifications', g:'pid'}, {t:'messages', kind:'group', k:'messages', g:'thread'},
  {t:'med_logs', kind:'flag', k:'medLog'},
  {t:'care_plans', kind:'keyed', k:'carePlan', g:'pid'}, {t:'staff_locations', kind:'keyed', k:'gps'},
  {t:'shifts', kind:'keyed', k:'shifts'}, {t:'timesheets', kind:'keyed', k:'timesheets'},
];
const COLL_BY = Object.fromEntries(COLL.map(c => [c.t, c]));
const QUIET_TABLES = new Set(['staff_locations']);   // live GPS: maps poll these, no full re-render

function stable(v){
  if(v === null || typeof v !== 'object') return JSON.stringify(v);
  if(Array.isArray(v)) return '[' + v.map(x => x === undefined ? 'null' : stable(x)).join(',') + ']';
  return '{' + Object.keys(v).filter(k => v[k] !== undefined && typeof v[k] !== 'function').sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
}
const isNetErr = e => /fetch|network|timeout|offline|Load failed|abort/i.test(String(e && (e.message || e)));

/* fetch with a time limit, so a blocked or very slow network can never make the app wait forever */
function fetchT(url, opts={}, ms=20000){
  if(!window.AbortController) return fetch(url, opts);
  const ctl = new AbortController(), up = opts.signal;
  if(up){ if(up.aborted) ctl.abort(); else up.addEventListener('abort', () => ctl.abort(), {once:true}); }
  const t = setTimeout(() => ctl.abort(), ms);
  return fetch(url, {...opts, signal:ctl.signal}).then(r => { clearTimeout(t); return r; }, e => { clearTimeout(t); throw (ctl.signal.aborted && !(up && up.aborted)) ? new Error('Network timeout') : e; });
}
const withTimeout = (p, ms, msg='Network timeout') => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(msg)), ms))]);

/* Network check used when the app cannot connect: is the internet down, or only the Careva+ server unreachable? */
const NetCheck = {
  async reach(url, opts={}){ try{ await fetchT(url, {cache:'no-store', ...opts}, 7000); return true; }catch(e){ return false; } },
  async run(){
    const cfg = window.CAREVA_CONFIG || {};
    const [internet, server, proxy] = await Promise.all([
      this.reach('https://www.gstatic.com/generate_204', {mode:'no-cors'}),
      cfg.supabaseUrl ? this.reach(cfg.supabaseUrl + '/auth/v1/health', {headers:{apikey:cfg.supabaseKey}}) : Promise.resolve(true),
      cfg.supabaseProxyUrl ? this.reach(cfg.supabaseProxyUrl.replace(/\/$/, '') + '/auth/v1/health', {headers:{apikey:cfg.supabaseKey}}) : Promise.resolve(false),
    ]);
    return {internet, server, proxy};
  },
};

/* ---------------- Supabase backend ---------------- */
const SupaBackend = {
  name:'supabase', sb:null, chan:null,
  url:null,
  init(url){
    this.url = url || CAREVA_CONFIG.supabaseUrl;
    // Inside the Android app there is only ever one window, so the cross-tab sign-in lock is not needed (it can stall some phones).
    const oneWindow = /CarevaPlusApp/.test(navigator.userAgent);
    const auth = {persistSession:true, autoRefreshToken:true, storageKey:'careva-auth', storage:Remember.store};
    if(oneWindow) auth.lock = async (name, wait, fn) => await fn();
    const fetchFn = (u, o) => fetchT(u, o, /\/storage\/v1\//.test(String(u && u.url || u)) ? 120000 : 25000);
    this.sb = window.supabase.createClient(this.url, CAREVA_CONFIG.supabaseKey, {auth, global:{fetch:fetchFn}});
  },
  async session(){ const {data} = await this.sb.auth.getSession(); return data.session ? {uid:data.session.user.id, email:data.session.user.email} : null; },
  async signIn(email, password){ const {data, error} = await this.sb.auth.signInWithPassword({email, password}); if(error) throw new Error(/invalid/i.test(error.message) ? 'Incorrect login details' : error.message); return {uid:data.user.id, email:data.user.email}; },
  async signOut(){ try{ await this.sb.auth.signOut(); }catch(e){} },
  async profile(uid){ const {data, error} = await this.sb.from('profiles').select('*').eq('id', uid).maybeSingle(); if(error) throw error; return data; },
  async selectAll(t, filter){
    const out = []; let from = 0; const page = 1000;
    for(;;){
      let q = this.sb.from(t).select('id,doc');
      if(filter) q = filter(q);
      const {data, error} = await q.range(from, from+page-1);
      if(error) throw error;
      out.push(...data); if(data.length < page) break; from += page;
    }
    return out;
  },
  async insert(t, rows){ const {error} = await this.sb.from(t).insert(rows); if(error) throw error; },
  async update(t, id, doc){ const {data, error} = await this.sb.from(t).update({doc}).eq('id', id).select('id,doc'); if(error) throw error; return data && data[0] ? data[0].doc : null; },
  async remove(t, ids){ const {error} = await this.sb.from(t).delete().in('id', ids); if(error) throw error; },
  subscribe(cb){
    if(this.chan) this.sb.removeChannel(this.chan);
    let ch = this.sb.channel('careva-live');
    COLL.forEach(c => { ch = ch.on('postgres_changes', {event:'*', schema:'public', table:c.t}, p => cb(c.t, p.eventType, (p.new && p.new.id) || (p.old && p.old.id), p.new && p.new.doc)); });
    this.chan = ch.subscribe(st => Sync.setLive(st === 'SUBSCRIBED'));
  },
  unsubscribe(){ if(this.chan){ this.sb.removeChannel(this.chan); this.chan = null; } },
  async admin(action, body={}){
    const {data, error} = await this.sb.functions.invoke('careva-admin', {body:{action, ...body}});
    if(error){ let msg = error.message; try{ const j = await error.context.json(); if(j && j.error) msg = j.error; }catch(e){} throw new Error(msg); }
    if(data && data.error) throw new Error(data.error);
    return data;
  },
  async upload(path, file){ const {error} = await this.sb.storage.from('careva').upload(path, file, {upsert:true, contentType:file.type || 'application/octet-stream'}); if(error) throw error; return path; },
  async fileUrl(path){ const {data, error} = await this.sb.storage.from('careva').createSignedUrl(path, 3600); if(error) throw error; return data.signedUrl; },
  async trail(p){ try{ await this.sb.from('location_trail').insert(p); }catch(e){} },
  async publicInsert(t, row){ const {error} = await this.sb.from(t).insert(row); if(error) throw error; },
};

/* ---------------- Local backend (one browser, for preview/testing) ---------------- */
const LocalBackend = {
  name:'local', key:'careva_local_db_v1', bc:null, cb:null,
  db(){ try{ return JSON.parse(localStorage.getItem(this.key)) || {tables:{}, users:{}, profiles:{}, files:{}}; }catch(e){ return {tables:{}, users:{}, profiles:{}, files:{}}; } },
  put(d){ try{ localStorage.setItem(this.key, JSON.stringify(d)); }catch(e){ throw new Error('This browser is out of storage space'); } },
  init(){ try{ this.bc = new BroadcastChannel('careva-local'); this.bc.onmessage = e => this.cb && this.cb(e.data.t, e.data.type, e.data.id, e.data.doc); }catch(e){} },
  emit(t, type, id, doc){ try{ this.bc && this.bc.postMessage({t, type, id, doc}); }catch(e){} },
  async session(){ const uid = Remember.store.getItem('careva_local_uid'); return uid ? {uid} : null; },
  async signIn(email, password){ const d = this.db(), u = d.users[String(email).toLowerCase()]; if(!u || u.password !== password) throw new Error('Incorrect login details'); Remember.store.setItem('careva_local_uid', u.uid); return {uid:u.uid, email}; },
  async signOut(){ Remember.store.removeItem('careva_local_uid'); },
  async profile(uid){ return this.db().profiles[uid] || null; },
  async selectAll(t){ const rows = this.db().tables[t] || {}; return Object.entries(rows).map(([id, doc]) => ({id, doc})); },
  async insert(t, rows){ const d = this.db(); d.tables[t] ||= {}; rows.forEach(r => { if(d.tables[t][r.id]) throw new Error('duplicate key'); d.tables[t][r.id] = r.doc; }); this.put(d); rows.forEach(r => this.emit(t,'INSERT',r.id,r.doc)); },
  async update(t, id, doc){ const d = this.db(); (d.tables[t] ||= {})[id] = doc; this.put(d); this.emit(t,'UPDATE',id,doc); return doc; },
  async remove(t, ids){ const d = this.db(); ids.forEach(id => { if(d.tables[t]) delete d.tables[t][id]; }); this.put(d); ids.forEach(id => this.emit(t,'DELETE',id,null)); },
  subscribe(cb){ this.cb = cb; Sync.setLive(true); },
  unsubscribe(){ this.cb = null; },
  newUser(d, email, password, profile, existing){
    email = String(email).trim().toLowerCase();
    if(d.users[email] && d.users[email].uid !== existing) throw new Error('This login is already used by another account.');
    let uid = existing && Object.values(d.users).find(u => u.uid===existing) ? existing : (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
    Object.keys(d.users).forEach(k => { if(d.users[k].uid === uid) delete d.users[k]; });
    d.users[email] = {uid, password}; d.profiles[uid] = {id:uid, email, ...profile}; return uid;
  },
  async admin(action, b={}){
    const d = this.db(); const me = await this.session(); const role = me && d.profiles[me.uid] ? d.profiles[me.uid].role : null;
    const office = OFFICE_ROLES.includes(role), hasOwner = Object.values(d.profiles).some(p => p.role==='admin');
    const six = (s, l) => { if(!/^\d{6}$/.test(String(s||''))) throw new Error(`${l} must be exactly 6 digits.`); };
    const T = t => (d.tables[t] ||= {});
    if(action==='status') return {hasOwner};
    if(action==='bootstrap'){ if(hasOwner) throw new Error('Careva+ is already set up. Please sign in.'); if(String(b.password||'').length < 8) throw new Error('Password must be at least 8 characters.'); this.newUser(d, b.email, b.password, {role:'admin', name:b.name}); this.put(d); return {ok:true}; }
    if(!office) throw new Error('Not allowed.');
    if(action==='staff_login'){ six(b.pin,'PIN'); const s = T('staff')[b.staff_id]; if(!s) throw new Error('Staff member not found.'); const uid = this.newUser(d, LOGIN_EMAIL.staff(b.staff_id), b.pin, {role:'staff', name:s.name, staff_id:b.staff_id}, s._uid); s._uid = uid; s.login = {code:b.staff_id, at:new Date().toISOString()}; this.put(d); this.emit('staff','UPDATE',b.staff_id,s); this.cb && this.cb('staff','UPDATE',b.staff_id,s); return {ok:true}; }
    if(action==='patient_login'){ six(b.code,'Access code'); const p = T('patients')[b.patient_id]; if(!p) throw new Error('Patient not found.'); const digits = String(b.phone||'').replace(/\D/g,'').slice(-10); if(digits.length!==10) throw new Error('Enter a 10-digit mobile number.'); const uid = this.newUser(d, LOGIN_EMAIL.patient(digits), b.code, {role:'patient', name:p.name, patient_id:b.patient_id}, p._uid); p._uid = uid; p.login = {phone:digits, at:new Date().toISOString()}; this.put(d); this.emit('patients','UPDATE',b.patient_id,p); this.cb && this.cb('patients','UPDATE',b.patient_id,p); return {ok:true}; }
    if(action==='remove_login'){ const t = b.kind==='staff' ? 'staff' : 'patients', r = T(t)[b.id]; if(r){ Object.keys(d.users).forEach(k => { if(d.users[k].uid===r._uid) delete d.users[k]; }); delete d.profiles[r._uid]; delete r._uid; delete r.login; this.put(d); this.emit(t,'UPDATE',b.id,r); this.cb && this.cb(t,'UPDATE',b.id,r); } return {ok:true}; }
    if(action==='office_users') return {users:Object.values(d.profiles).filter(p => OFFICE_ROLES.includes(p.role))};
    if(action==='office_user'){ if(role!=='admin') throw new Error('Only the owner/admin can add office users.'); if(String(b.password||'').length<8) throw new Error('Password must be at least 8 characters.'); this.newUser(d, b.email, b.password, {role:b.role, name:b.name}); this.put(d); return {ok:true}; }
    if(action==='remove_office_user'){ if(role!=='admin') throw new Error('Not allowed.'); const p = d.profiles[b.id]; if(p && p.role==='admin' && Object.values(d.profiles).filter(x => x.role==='admin').length<=1) throw new Error('You can’t remove the only admin.'); Object.keys(d.users).forEach(k => { if(d.users[k].uid===b.id) delete d.users[k]; }); delete d.profiles[b.id]; this.put(d); return {ok:true}; }
    throw new Error('Unknown action');
  },
  async upload(path, file){ const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); }); const d = this.db(); d.files[path] = url; this.put(d); return path; },
  async fileUrl(path){ return this.db().files[path] || ''; },
  async trail(){},
  async publicInsert(t, row){ return this.insert(t, [row]); },
};

/* ---------------- Cloud facade ---------------- */
const Cloud = {
  be:null, mode:'local', user:null, profile:null,
  configured(){ return !!(window.CAREVA_CONFIG && CAREVA_CONFIG.supabaseUrl && CAREVA_CONFIG.supabaseKey); },
  via:'direct',
  init(url){
    if(this.configured()){
      if(!window.supabase || !window.supabase.createClient) throw new Error('offline');
      this.be = SupaBackend; this.mode = 'supabase';
    } else { this.be = LocalBackend; this.mode = 'local'; }
    this.be.init(url);
  },
  /* Picks the server address: the normal one, or the backup address when this phone's network blocks the normal one. */
  async pickServer(){
    const cfg = window.CAREVA_CONFIG || {};
    if(!this.configured() || !cfg.supabaseProxyUrl) return null;
    const proxy = cfg.supabaseProxyUrl.replace(/\/$/, '');
    // Remember the choice for 12 hours so the app doesn't re-check on every start.
    let saved = null; try{ const v = JSON.parse(localStorage.getItem('careva_via') || 'null'); if(v && Date.now() - v.at < 432e5) saved = v.via; }catch(e){}
    if(saved === 'proxy'){ this.via = 'proxy'; return proxy; }
    if(saved === 'direct') return null;
    const direct = await NetCheck.reach(cfg.supabaseUrl + '/auth/v1/health', {headers:{apikey:cfg.supabaseKey}});
    const via = direct ? 'direct' : 'proxy';
    try{ localStorage.setItem('careva_via', JSON.stringify({via, at:Date.now()})); }catch(e){}
    this.via = via; return via === 'proxy' ? proxy : null;
  },
  async restore(){ const s = await withTimeout(this.be.session(), 30000); if(!s) return null; const p = await this.be.profile(s.uid); if(!p){ await this.be.signOut(); return null; } this.user = s; this.profile = p; return p; },
  async signIn(email, password){ const s = await this.be.signIn(email, password); const p = await this.be.profile(s.uid); if(!p){ await this.be.signOut(); throw new Error('This login has no Careva+ access yet. Please contact the office.'); } this.user = s; this.profile = p; return p; },
  async signOut(){ Sync.stop(); await this.be.signOut(); this.user = null; this.profile = null; },
  admin(a, b){ return this.be.admin(a, b); },
  upload(path, file){ return this.be.upload(path, file); },
  fileUrl(path){ return this.be.fileUrl(path); },
  trail(p){ return this.be.trail(p); },
  publicInsert(t, row){ return this.be.publicInsert(t, row); },
};

/* ---------------- Sync engine ---------------- */
const Sync = {
  snap:{}, server:{}, sent:{}, timer:null, busy:false, again:false, live:false, online:true, failures:0, onRemote:null, deniedWarned:false,
  reset(){ this.snap = {}; this.server = {}; this.sent = {}; },
  setLive(v){ this.live = v; this.badge(); },
  badge(){ const b = document.getElementById('sync-badge'); if(!b) return; const off = !this.online; b.className = 'sync-badge ' + (off ? 'off' : this.pending() ? 'busy' : 'ok'); b.title = off ? 'Offline — changes will sync when you reconnect' : this.pending() ? 'Saving…' : 'All changes saved'; b.innerHTML = off ? '●&nbsp;Offline' : this.pending() ? '●&nbsp;Saving' : '●&nbsp;Live'; },
  pending(){ return !!this.timer || this.busy; },
  rowsOf(c){
    const s = S();
    switch(c.kind){
      case 'single': return [{id:'main', doc:s.settings}];
      case 'arr': return s[c.k].filter(o => o && o.id).map(o => ({id:o.id, doc:o}));
      case 'group': return Object.entries(s[c.k]).flatMap(([key, list]) => (list||[]).map(o => { if(!o.id) o.id = uid('x'); if(o[c.g] !== key) o[c.g] = key; return {id:o.id, doc:o}; }));
      case 'flag': return Object.entries(s[c.k]).map(([key, v]) => ({id:key, doc:{pid:key.split('|')[0], taken:!!v}}));
      case 'keyed': return Object.entries(s[c.k]).filter(([,o]) => o && typeof o==='object').map(([key, o]) => { if(c.g && o[c.g] !== key) o[c.g] = key; return {id:key, doc:o}; });
    }
    return [];
  },
  apply(c, id, doc){
    const s = S();
    switch(c.kind){
      case 'single': s.settings = mergeSettings(doc); break;
      case 'arr': { doc = {...doc, id}; const i = s[c.k].findIndex(o => o.id===id); if(i<0) s[c.k].push(doc); else s[c.k][i] = doc; break; }
      case 'group': { doc = {...doc, id}; const key = doc[c.g]; if(key==null) return; Object.keys(s[c.k]).forEach(k => { if(k!==key) s[c.k][k] = s[c.k][k].filter(o => o.id!==id); }); const list = (s[c.k][key] ||= []); const i = list.findIndex(o => o.id===id); if(i<0) list.push(doc); else list[i] = doc; if(c.t==='messages') list.sort((a,b) => (a.ts||0)-(b.ts||0)); else if(c.t==='notifications') list.sort((a,b) => (b.ts||0)-(a.ts||0)); break; }
      case 'flag': s[c.k][id] = !!(doc && doc.taken); break;
      case 'keyed': s[c.k][id] = doc; break;
    }
  },
  removeLocal(c, id){
    const s = S();
    if(c.kind==='arr') s[c.k] = s[c.k].filter(o => o.id!==id);
    else if(c.kind==='group') Object.keys(s[c.k]).forEach(k => s[c.k][k] = s[c.k][k].filter(o => o.id!==id));
    else if(c.kind==='flag' || c.kind==='keyed') delete s[c.k][id];
  },
  async loadAll(){
    this.reset(); Store.s = emptyData();
    const be = Cloud.be, from = dOff(-90), msgFrom = new Date(Date.now()-120*864e5).toISOString();
    const filters = { visits:q => q.gte('date', from), vitals:q => q.gte('date', dOff(-180)), messages:q => q.gte('updated_at', msgFrom) };
    const results = await Promise.all(COLL.map(c => be.selectAll(c.t, be.name==='supabase' ? filters[c.t] : null).then(rows => [c, rows]).catch(e => { if(isNetErr(e)) throw e; console.warn('load', c.t, e); return [c, []]; })));
    for(const [c, rows] of results){ this.server[c.t] = new Set(rows.map(r => r.id)); rows.forEach(r => this.apply(c, r.id, r.doc)); }
    Object.values(S().messages).forEach(l => l.sort((a,b) => (a.ts||0)-(b.ts||0)));
    Object.values(S().notifications).forEach(l => l.sort((a,b) => (b.ts||0)-(a.ts||0)));
    for(const c of COLL){ const m = this.snap[c.t] = new Map(); const ids = this.server[c.t]; this.rowsOf(c).forEach(r => { if(ids.has(r.id)) m.set(r.id, stable(r.doc)); }); this.sent[c.t] = new Map(); }
    be.subscribe((t, type, id, doc) => this.remote(t, type, id, doc));
  },
  stop(){ clearTimeout(this.timer); this.timer = null; try{ Cloud.be && Cloud.be.unsubscribe(); }catch(e){} this.reset(); },
  remote(t, type, id, doc){
    const c = COLL_BY[t]; if(!c || !id) return;
    const snap = this.snap[t] ||= new Map(), server = this.server[t] ||= new Set();
    if(type==='DELETE'){ snap.delete(id); server.delete(id); this.removeLocal(c, id); }
    else {
      const j = stable(doc), isNew = !server.has(id); server.add(id);
      const sent = this.sent[t] && this.sent[t].get(id);
      if(sent === j){ snap.set(id, j); return; }               // echo of our own write
      if(snap.get(id) === j) return;                            // nothing new
      snap.set(id, j); this.apply(c, id, doc);
      if(isNew && this.onNew) try{ this.onNew(t, id, doc); }catch(e){}
    }
    this.onRemote && this.onRemote(t);
  },
  schedule(){ clearTimeout(this.timer); this.timer = setTimeout(() => { this.timer = null; this.flush(); }, 300); this.badge(); },
  async flush(){
    if(!Cloud.be || !Cloud.profile && Cloud.be.name==='supabase') return;
    if(this.busy){ this.again = true; return; }
    this.busy = true; this.badge(); let netFail = false;
    try{
      for(const c of COLL){
        const snap = this.snap[c.t] ||= new Map(), server = this.server[c.t] ||= new Set(), sent = this.sent[c.t] ||= new Map();
        const rows = this.rowsOf(c), cur = new Set(), ins = [], upd = [];
        for(const r of rows){ cur.add(r.id); const j = stable(r.doc); if(snap.get(r.id) === j) continue; (server.has(r.id) ? upd : ins).push({id:r.id, doc:JSON.parse(JSON.stringify(r.doc)), j}); }
        const del = [...snap.keys()].filter(id => !cur.has(id));
        if(ins.length){
          try{ await Cloud.be.insert(c.t, ins.map(r => ({id:r.id, doc:r.doc}))); ins.forEach(r => { snap.set(r.id, r.j); server.add(r.id); sent.set(r.id, r.j); }); }
          catch(e){
            if(isNetErr(e)){ netFail = true; break; }
            for(const r of ins){ try{ await Cloud.be.insert(c.t, [{id:r.id, doc:r.doc}]); server.add(r.id); }catch(e2){ if(isNetErr(e2)){ netFail = true; break; } this.denied(c.t, e2); } snap.set(r.id, r.j); sent.set(r.id, r.j); }
            if(netFail) break;
          }
        }
        for(const r of upd){
          try{ sent.set(r.id, r.j); const back = await Cloud.be.update(c.t, r.id, r.doc); snap.set(r.id, r.j);
            if(back && stable(back) !== r.j){ const bj = stable(back); snap.set(r.id, bj); sent.set(r.id, bj); this.apply(c, r.id, back); this.onRemote && this.onRemote(c.t); }
            else if(!back && Cloud.be.name==='supabase') this.denied(c.t, {message:'not permitted'});
          }catch(e){ if(isNetErr(e)){ netFail = true; break; } this.denied(c.t, e); snap.set(r.id, r.j); }
        }
        if(netFail) break;
        if(del.length){ try{ await Cloud.be.remove(c.t, del); del.forEach(id => { snap.delete(id); server.delete(id); }); }catch(e){ if(isNetErr(e)){ netFail = true; break; } this.denied(c.t, e); del.forEach(id => snap.delete(id)); } }
      }
    } finally {
      this.busy = false; this.online = !netFail;
      if(netFail){ this.failures++; clearTimeout(this.timer); this.timer = setTimeout(() => { this.timer = null; this.flush(); }, Math.min(30000, 3000*this.failures)); }
      else { this.failures = 0; if(this.again){ this.again = false; this.schedule(); } }
      this.badge();
    }
  },
  async settle(){ clearTimeout(this.timer); this.timer = null; for(let i=0; i<80 && this.busy; i++) await new Promise(r => setTimeout(r, 100)); await this.flush(); },
  denied(t, e){ console.warn('sync denied', t, e && e.message); if(!this.deniedWarned){ this.deniedWarned = true; setTimeout(() => this.deniedWarned = false, 8000); toast('Some changes could not be saved — you may not have permission','err',3500); } },
};
window.addEventListener('online', () => { Sync.online = true; Sync.badge(); if(Cloud.profile) Sync.schedule(); });
window.addEventListener('offline', () => { Sync.online = false; Sync.badge(); });
