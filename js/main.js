'use strict';
/* =========================================================
   App shell, router, real sign-in, first-time setup,
   ad player, install-as-app
   ========================================================= */
const PORTALS = {};
const ACT = {};   // click actions:  data-act="name"
const FORM = {};  // form submits:   data-submit="name"
const ON = {};    // input/change:   data-on / data-onchange

const App = {
  portal:null, view:null, params:{}, uid:null, timers:[], cleanups:[], root:null, hist:[],
  every(fn, ms){ const id = setInterval(fn, ms); this.timers.push(id); return id; },
  onCleanup(fn){ this.cleanups.push(fn); },
  teardown(){ this.timers.forEach(clearInterval); this.timers = []; this.cleanups.forEach(f => { try{ f(); }catch(e){} }); this.cleanups = []; },
  saveView(){ try{ localStorage.setItem('careva_view', JSON.stringify(this.portal ? {portal:this.portal, view:this.view} : null)); }catch(e){} },
  async start(){
    this.root = $('#root'); this.screen = 'welcome'; I18N.start();
    this.slowHint();
    if(Cloud.configured()){
      const ready = await withTimeout(window.SB_READY || Promise.resolve(!!window.supabase), 40000).catch(() => false);
      if(!ready) return this.fatal('nolib');
    }
    let server = null;
    try{ server = await Cloud.pickServer(); }catch(e){}
    try{ Cloud.init(server); }catch(e){ return this.fatal('nolib'); }
    Sync.onRemote = t => this.remoteChanged(t);
    Sync.onNew = (t, id, doc) => Notify.incoming(t, doc);
    let prof = null;
    try{ prof = await Cloud.restore(); }catch(e){ if(isNetErr(e)) return this.fatal('offline'); }
    if(prof) return this.boot(prof, true);
    this.welcome();
  },
  /* After a few seconds on the loading screen, tell people the app is still working on it. */
  slowHint(){
    clearTimeout(this._slow);
    this._slow = setTimeout(() => {
      const b = this.root && this.root.querySelector('.boot'); if(!b || !b.querySelector('.spinner') || b.querySelector('.slow-hint')) return;
      b.insertAdjacentHTML('beforeend', `<p class="small slow-hint" style="margin-top:10px;max-width:300px">${esc(T('Still connecting… a slow or busy network can take a little longer.'))}</p>`);
    }, 8000);
  },
  async boot(prof, restoring){
    this.loading('Loading your Careva+ data…'); this.slowHint();
    try{ await withTimeout(Sync.loadAll(), 60000); }
    catch(e){ return this.fatal(isNetErr(e) ? 'offline' : (e.message || 'Could not load data')); }
    const portal = prof.role==='staff' ? 'staff' : prof.role==='patient' ? 'patient' : 'office';
    const uid = portal==='staff' ? prof.staff_id : portal==='patient' ? prof.patient_id : prof.id;
    if(portal==='patient' && !pat(uid)) return this.fatal('Your patient record isn’t available. Please contact the Careva+ office.', true);
    if(portal==='staff' && !stf(uid)) return this.fatal('Your staff record isn’t available. Please contact the Careva+ office.', true);
    let view = null; try{ const s = JSON.parse(localStorage.getItem('careva_view')||'null'); if(restoring && s && s.portal===portal) view = s.view; }catch(e){}
    this.enter(portal, uid, view, restoring);
  },
  loading(msg){ this.teardown(); this.root.innerHTML = `<div class="boot"><img src="img/logo.png" alt="Careva+"><div class="spinner"></div><p>${esc(msg)}</p></div>`; },
  fatal(kind, signOut){
    this.teardown(); clearTimeout(this._slow);
    const net = kind==='offline' || kind==='nolib';
    const box = (title, msg, tip) => `<div class="boot"><img src="img/logo.png" alt="Careva+"><div class="li-ic ${net?'bg-amber':'bg-red'}" style="width:64px;height:64px;border-radius:50%;margin-top:10px">${I(net?'signal':'alert','lg')}</div>
      <h2 style="margin-top:14px">${esc(title)}</h2><p style="max-width:330px">${esc(msg)}</p>${tip ? `<div class="net-tip">${tip}</div>` : ''}
      <button class="btn btn-primary mt" data-act="reload">${I('refresh','sm')} Try again</button>${signOut?`<button class="btn btn-ghost mt-s" data-act="logout">Sign out</button>`:''}<p class="small mt">Help: ${CO.phone}</p></div>`;
    if(!net){ this.root.innerHTML = box('Something went wrong', kind); return; }
    this.root.innerHTML = box(kind==='nolib' ? 'Couldn’t start Careva+' : 'Can’t connect', 'Checking your connection…');
    try{ localStorage.removeItem('careva_via'); }catch(e){}
    NetCheck.run().then(r => {
      if(!this.root.querySelector('.boot') || this.portal) return;
      const dns = `<b>${esc(T('Fix:'))}</b> ${esc(T('Switch between Wi-Fi and mobile data, or on Android open Settings → Network & internet → Private DNS → choose “Private DNS provider hostname” and type dns.google — then tap Try again.'))}`;
      let title, msg, tip = '';
      if(!r.internet && !r.server){ title = 'You’re offline'; msg = 'Careva+ needs an internet connection to load your data. Check your mobile data or Wi-Fi.'; }
      else if(kind==='nolib'){ title = 'Couldn’t start Careva+'; msg = 'The first start needs internet to finish setting up the app, and the download didn’t get through. Your internet works — please try again in a moment.'; tip = r.server ? '' : dns; }
      else if(!r.server && !r.proxy){ title = 'Your network is blocking Careva+'; msg = 'Your internet works, but this network isn’t letting the app reach the Careva+ server.'; tip = dns; }
      else { title = 'Can’t connect'; msg = 'The Careva+ server took too long to answer. Please try again.'; }
      const html = box(title, msg, tip); this.root.innerHTML = html;
    });
  },
  welcome(){ this.teardown(); this.portal = null; this.screen = 'welcome'; this.saveView(); this.root.innerHTML = welcomeView(); window.scrollTo(0,0); welcomeAfter(); },
  login(portal){ this.teardown(); this.screen = portal; I18N.sync(); this.root.innerHTML = LOGIN[portal](); window.scrollTo(0,0); LOGIN_AFTER[portal] && LOGIN_AFTER[portal](); },
  redraw(){ if(this.portal) return this.refresh(); if(this.screen === 'welcome') return this.welcome(); if(LOGIN[this.screen]) return this.login(this.screen); },
  enter(portal, uid, view, restoring){
    this.portal = portal; this.screen = portal; this.uid = uid; const P = PORTALS[portal];
    P.init && P.init(restoring);
    this.view = view && P.views[view] && view!=='visit' && view!=='patient' ? view : P.home; this.params = {}; this.hist = [];
    this.saveView(); this.render();
  },
  async logout(){ const P = PORTALS[this.portal]; try{ P && P.exit && P.exit(); }catch(e){} Modal.closeAll(); await Cloud.signOut(); Store.s = emptyData(); this.portal = null; this.uid = null; this.welcome(); },
  go(view, params={}, push=true){ if(push && this.view) this.hist.push([this.view, this.params]); this.view = view; this.params = params; this.saveView(); this.render(); window.scrollTo(0,0); },
  back(){ const h = this.hist.pop(); if(h){ this.view = h[0]; this.params = h[1]; this.render(); window.scrollTo(0,0); } else this.go(PORTALS[this.portal].home, {}, false); },
  refresh(){ const y = window.scrollY, ci = $('.chat-in input'), cv = ci && ci.value, cf = ci && document.activeElement===ci; this.render(); window.scrollTo(0, y); const ni = $('.chat-in input'); if(ni && cv){ ni.value = cv; } if(ni && cf) ni.focus(); },
  remoteChanged(t){ if(!this.portal || QUIET_TABLES.has(t)) return; clearTimeout(this._rt); this._rt = setTimeout(() => this.safeRefresh(), 350); },
  safeRefresh(){
    if(!this.portal) return;
    const a = document.activeElement, typing = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !a.closest('.chat-in');
    if(Modal.stack.length || typing || (PORTALS[this.portal].holdRefresh && PORTALS[this.portal].holdRefresh())){ clearTimeout(this._pt); this._pt = setTimeout(() => this.safeRefresh(), 1500); return; }
    this.refresh();
  },
  render(){
    this.teardown();
    const P = PORTALS[this.portal], v = this.view;
    let body; try{ body = P.views[v](this.params); }catch(e){ console.error(e); body = `<div class="card">${emptyState('alert','This page could not be shown', esc(e.message))}</div>`; }
    const t = (P.title && P.title(v, this.params)) || {t:'', s:''};
    const nav = P.nav(), u = P.user();
    const key = `${this.portal}|${v}|${JSON.stringify(this.params||{})}`, fresh = key !== this._key; this._key = key;   // new screen → entrance animation
    const prevB = this._badges || {}; this._badges = {}; nav.forEach(n => this._badges[n.id] = +n.badge || 0);
    const pop = n => prevB[n.id] !== undefined && (+n.badge || 0) > prevB[n.id] ? ' pop' : '';
    const navHTML = nav.map(n => `<button class="nav-i ${n.id===v||(P.navOf&&P.navOf(v)===n.id)?'on':''}" data-go="${n.id}">${I(n.icon)}<span>${n.label}</span>${n.badge?`<span class="badge${pop(n)}">${n.badge}</span>`:''}</button>`).join('');
    const tabs = P.tabs.map(id => { if(id==='more'){ const on = !P.tabs.includes(P.navOf ? P.navOf(v) : v); return `<button class="tab ${on?'on':''}" data-act="moreSheet">${I('menu')}<span>More</span></button>`; } const n = nav.find(x => x.id===id); const on = id===v || (P.navOf && P.navOf(v)===id); return `<button class="tab ${on?'on':''}" data-go="${id}">${I(n.icon)}<span>${n.tab||n.label}</span>${n.badge?`<span class="badge">${n.badge}</span>`:''}</button>`; }).join('');
    this.root.innerHTML = `<div class="app portal-${this.portal}">
      <aside class="side">
        <div class="side-brand"><img src="img/logo.png" alt="Careva+"></div>
        <div class="side-portal">${I(P.icon,'sm')} ${P.label}<span id="sync-badge" class="sync-badge ok">●&nbsp;Live</span></div>
        <nav>${navHTML}</nav>
        <div class="side-foot">
          ${installBtn('btn btn-ghost btn-sm btn-block mb')}
          <div class="me">${av(u.name, u.color, '', true)}<div class="grow"><div class="b ell">${esc(u.name)}</div><div class="tiny muted ell">${esc(u.sub)}</div></div><button class="icon-btn" data-act="logout" title="Sign out">${I('logout','sm')}</button></div>
        </div>
      </aside>
      <div class="main">
        <header class="topbar"><img class="mark" src="img/mark.png" alt=""><div class="top-title"><div class="t1 ell">${t.t}</div>${t.s?`<div class="t2 ell">${t.s}</div>`:''}</div><div class="top-actions">${P.actions ? P.actions(v) : ''}</div></header>
        ${Cloud.mode==='local' ? `<div class="local-banner">${I('info','xs')} Preview copy — data you enter here stays on this device. The live app shares data between office, staff and families.</div>` : ''}
        <main class="content${fresh?' enter':''}">${body}</main>
      </div>
      <nav class="tabbar${fresh?' fresh':''}">${tabs}</nav>
      ${P.fab ? P.fab(v) : ''}
    </div>`;
    const h1 = $('.page-h h1', this.root); if(h1 && h1.textContent.trim()===String(t.t).trim()) h1.remove();
    mountCharts(this.root);
    try{ P.after && P.after[v] && P.after[v](this.params); }catch(e){ console.error(e); }
    hydrateFiles(this.root); Sync.badge();
  },
};
window.addEventListener('scroll', () => { const t = $('.topbar'); if(t) t.classList.toggle('scrolled', window.scrollY > 6); }, {passive:true});

/* ---------- global delegation ---------- */
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if(g){ e.preventDefault(); let p = {}; if(g.dataset.p){ try{ p = JSON.parse(g.dataset.p); }catch(_){} } if(g.closest('.modal-wrap')) Modal.closeAll(); App.go(g.dataset.go, p); return; }
  const a = e.target.closest('[data-act]');
  if(a){ const f = ACT[a.dataset.act]; if(f){ e.preventDefault(); f(a, e); } }
});
document.addEventListener('submit', e => { const f = e.target.closest('[data-submit]'); if(f){ e.preventDefault(); const h = FORM[f.dataset.submit]; h && h(f, e); } });
document.addEventListener('input', e => { const el = e.target.closest('[data-on]'); if(el && ON[el.dataset.on]) ON[el.dataset.on](el, e); });
document.addEventListener('change', e => { const el = e.target.closest('[data-onchange]'); if(el && ON[el.dataset.onchange]) ON[el.dataset.onchange](el, e); });
document.addEventListener('keydown', e => { if(e.key==='Escape' && Modal.stack.length) Modal.close(); });

ACT.reload = () => location.reload();
ACT.setLang = el => I18N.set(el.dataset.l);
// Android back button (called by the Careva+ app): close a sheet, go back a screen, or let the app close
window.CarevaBack = () => {
  if(Modal.stack.length){ Modal.close(); return true; }
  if(App.portal){ if(App.hist && App.hist.length){ App.back(); return true; } const home = PORTALS[App.portal].home; if(App.view !== home){ App.go(home, {}, false); return true; } return false; }
  if(App.screen && App.screen !== 'welcome'){ App.welcome(); return true; }
  return false;
};
ON.soundToggle = el => { Chime.setOn(el.checked); if(el.checked){ Chime.unlock(); setTimeout(() => Chime.play('msg'), 60); } };
ACT.logout = async () => { if(await confirmBox({title:'Sign out?', text:'You will return to the Careva+ start screen.', ok:'Sign out'})) App.logout(); };
ACT.back = () => App.back();
ACT.home = () => App.welcome();
ACT.portal = el => App.login(el.dataset.portal);
ACT.moreSheet = () => {
  const P = PORTALS[App.portal], nav = P.nav().filter(n => !P.tabs.includes(n.id));
  Modal.open({title:'More', body:`<div class="list">${nav.map(n => `<div class="li click" data-go="${n.id}"><div class="li-ic bg-blue">${I(n.icon)}</div><div class="grow t">${n.label}</div>${n.badge?`<span class="pill p-red">${n.badge}</span>`:''}${I('right','sm muted')}</div>`).join('')}
    ${isStandalone() ? '' : `<div class="li click" data-act="install"><div class="li-ic bg-teal">${I('upload')}</div><div class="grow t">Install Careva+ app</div>${I('right','sm muted')}</div>`}
    <div class="li click" data-act="logout"><div class="li-ic bg-red">${I('logout')}</div><div class="grow t">Sign out</div></div></div>`});
};

/* ---------- install as an app (PWA) ---------- */
let deferredInstall = null;
const IN_APP = /CarevaPlusApp/.test(navigator.userAgent);   // running inside the Careva+ Android app
const isStandalone = () => IN_APP || (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints > 1);
const installBtn = cls => isStandalone() || (typeof Cloud !== 'undefined' && Cloud.mode==='local') ? '' : `<button class="${cls}" data-act="install">${I('upload','sm')} Install app</button>`;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });
window.addEventListener('appinstalled', () => { deferredInstall = null; toast('Careva+ is installed on this device'); });
ACT.install = async () => {
  if(deferredInstall){ deferredInstall.prompt(); try{ await deferredInstall.userChoice; }catch(e){} deferredInstall = null; return; }
  const ios = isIOS();
  Modal.open({title:'Install the Careva+ app', sub:'Works offline-ready, opens full screen like a normal app.', body: ios
    ? `<ol class="steps"><li>Open this page in <b>Safari</b>.</li><li>Tap the <b>Share</b> button <span class="pill p-gray">⬆︎</span> at the bottom.</li><li>Scroll and tap <b>Add to Home Screen</b>, then <b>Add</b>.</li></ol>`
    : `<ol class="steps"><li>Open this page in <b>Chrome</b>.</li><li>Tap the menu <span class="pill p-gray">⋮</span> at the top right.</li><li>Tap <b>Install app</b> (or <b>Add to Home screen</b>), then <b>Install</b>.</li></ol>`,
    foot:`<button class="btn btn-primary btn-block" data-close>Got it</button>`});
};
if('serviceWorker' in navigator && window.CAREVA_CONFIG && CAREVA_CONFIG.supabaseUrl && (location.protocol==='https:' || location.hostname==='localhost')){
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  const hadController = !!navigator.serviceWorker.controller; let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if(!hadController || reloaded) return; reloaded = true; if(!App.portal) location.reload(); else toast('A new version of Careva+ is ready — it loads next time you open the app','ok',4000); });
}

/* ---------- welcome ---------- */
async function welcomeAfter(){
  try{
    const st = await Cloud.admin('status');
    const box = $('#wl-setup'); if(!box || App.portal || !st || st.hasOwner!==false) return;
    box.innerHTML = `<div class="hint green mt">${I('star','sm')}<span><b>New here? Start with Office &amp; Admin.</b> Create your own owner login there (you choose the email and password), then add your staff and patients — the app gives each of them a sign-in code. <button class="btn-text" data-act="portal" data-portal="office">Set up now</button></span></div>`;
  }catch(e){}
}
function welcomeView(){
  const line = `<svg class="wl-line" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax meet"><path d="M-20 690 L120 690 L120 600 L200 530 L280 600 L280 690 L560 690 L600 712 C540 662 500 632 500 592 C500 562 525 542 550 542 C575 542 590 557 600 572 C610 557 625 542 650 542 C675 542 700 562 700 592 C700 632 660 662 600 712 L640 690 L940 690 L940 650 L900 650 L900 610 L940 610 L940 570 L980 570 L980 610 L1020 610 L1020 650 L980 650 L980 690 L1220 690"/></svg>`;
  const portal = (id, ic, bg, t, s, badge='') => `<button class="portal" data-act="portal" data-portal="${id}"><div class="p-ic ${bg}">${I(ic,'lg')}</div><div class="grow"><div class="p-t">${t}${badge}</div><div class="p-s">${s}</div></div><div class="go">${I('right')}</div></button>`;
  return `<div class="welcome">${line}<div class="wl-inner">
    <header class="wl-head"><img src="img/logo.png" alt="Careva+"><div class="row" style="gap:8px">${installBtn('btn btn-ghost btn-sm hide-m')}${langToggle()}<a class="wl-call" href="tel:${CO.tel}" aria-label="Call ${CO.phone}"><b>${I('phone','sm')}</b><span>${CO.phone}</span></a></div></header>
    <section class="wl-hero">
      <div class="wl-copy">
        <span class="eyebrow">Home health care · Salem</span>
        <h1>Hospital care in the comfort of your <em>home.</em></h1>
        <p>One secure app that connects patients and families, our nurses and therapists in the field, and the Careva+ care office.</p>
        <div id="wl-setup"></div>
        <div class="portals">
          ${portal('patient','heart','bg-blue','Patient & Family','Book visits, track your nurse live, vitals, medicines, reports & bills')}
          ${portal('staff','nav','bg-green','Care Staff','GPS clock-in, today’s route, visit notes, vitals & e-signature', '<span class="pill p-green">'+I('locate','xs')+' Live GPS</span>')}
          ${portal('office','building','bg-navy','Office & Admin','Scheduling, live staff map, visit verification, billing & reports')}
        </div>
        ${isStandalone() || Cloud.mode==='local' ? '' : `<button class="btn btn-soft btn-block mt hide-d" data-act="install">${I('upload','sm')} Install the Careva+ app</button>`}
      </div>
    </section>
    <section class="services-strip">${SERVICES.map(s => `<div class="svc"><div class="s-ic">${I(s.icon,'sm')}</div><div><b>${s.name}</b><br><span>${s.desc}</span></div></div>`).join('')}</section>
    <footer class="wl-foot"><span>${CO.web} · ${CO.city}</span><span>Medical emergency? Call 108</span></footer>
    ${Cloud.mode==='local' ? `<div class="local-banner mt">${I('info','xs')} Preview copy — data entered here stays on this device. The live app (installed from your website) shares data between office, staff and families.</div>` : ''}
  </div></div>`;
}

/* ---------- sign-in screens ---------- */
const brandWhite = `<div class="brand-white"><img src="img/mark.png" alt=""><span>CAREVA<span class="plus">✚</span></span></div>`;
const authShell = (brand, form) => `<div class="auth"><div class="auth-brand">${brand}</div><div class="auth-form"><button class="back" data-act="home">${I('left','sm')} All portals</button>${form}</div></div>`;
const LOGIN = {}, LOGIN_AFTER = {};
const codeBoxes = name => `<div class="otp">${[0,1,2,3,4,5].map(i => `<input inputmode="numeric" maxlength="1" data-${name}="${i}" aria-label="Digit ${i+1}" autocomplete="one-time-code">`).join('')}</div>`;
function wireBoxes(name, onDone){
  const all = $$(`[data-${name}]`);
  all.forEach((inp, i) => {
    inp.addEventListener('input', () => { const v = inp.value.replace(/\D/g,''); if(v.length > 1){ v.split('').slice(0, 6-i).forEach((ch, k) => { if(all[i+k]) all[i+k].value = ch; }); (all[Math.min(5, i+v.length)]).focus(); } else { inp.value = v; if(v && all[i+1]) all[i+1].focus(); } if(all.every(x => x.value)) onDone && onDone(); });
    inp.addEventListener('keydown', e => { if(e.key==='Backspace' && !inp.value && all[i-1]) all[i-1].focus(); });
  });
}
const boxVal = name => $$(`[data-${name}]`).map(i => i.value).join('');
async function busy(btn, fn){ const t = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spin-sm"></span> Please wait…`; try{ return await fn(); } finally { if(document.body.contains(btn)){ btn.disabled = false; btn.innerHTML = t; } } }

LOGIN.patient = () => authShell(`${brandWhite}<h2>Your care, your nurse and your health — in one place.</h2><p>Secure access for patients and family members.</p>
  <ul><li><b>${I('nav','sm')}</b>Track your nurse live on the map</li><li><b>${I('pulse','sm')}</b>Vitals, medicines and care plan</li><li><b>${I('file','sm')}</b>Reports, prescriptions and bills</li><li><b>${I('shield','sm')}</b>Every visit GPS-verified</li></ul>`,
  `<div class="lang-top">${langToggle()}</div><h1>Patient sign in</h1><p class="sub">Use the mobile number registered with Careva+ and your 6-digit access code.</p>
   <form data-submit="pLogin" id="pl-f"><div class="field"><label>Mobile number</label><div class="input-group"><span class="pre">+91</span><input id="pl-phone" inputmode="numeric" maxlength="11" autocomplete="tel" placeholder="98765 43210"></div></div>
   <div class="field"><label>Access code</label>${codeBoxes('pc')}</div>
   <label class="remember"><span class="switch"><input type="checkbox" id="patient-rem" ${Remember.def() ? 'checked' : ''}><span></span></span><span class="grow"><b>Remember me</b><small>Stay signed in on this phone</small></span></label>
   <button class="btn btn-primary btn-lg btn-block" id="pl-btn">Sign in</button></form>
   <div class="hint mt">${I('info','sm')}<span>Your access code is given by the Careva+ office when care starts. Forgot it? Call <b>${CO.phone}</b>.</span></div>
   <div class="divider"></div>
   <p class="small muted center">New to Careva+? <button class="btn-text" data-act="assessment">Request a free care assessment</button></p>`);
LOGIN_AFTER.patient = () => { wireBoxes('pc'); const l = Remember.last('patient'); if(l) $('#pl-phone').value = l; };
FORM.pLogin = () => busy($('#pl-btn'), async () => {
  const ph = $('#pl-phone').value.replace(/\D/g,''), code = boxVal('pc');
  if(ph.length < 10) return toast('Enter your 10-digit mobile number','err');
  if(code.length !== 6) return toast('Enter the 6-digit access code','err');
  const rem = $('#patient-rem').checked; Remember.set(rem); Remember.keep('patient', rem ? $('#pl-phone').value.trim() : '');
  try{ const p = await Cloud.signIn(LOGIN_EMAIL.patient(ph), code); await App.boot(p); toast('Welcome to Careva+'); }
  catch(e){ toast(isNetErr(e) ? 'No internet connection' : /incorrect/i.test(e.message) ? 'Mobile number or access code is wrong. Use the family mobile number the office registered for the app.' : e.message,'err',5000); $$('[data-pc]').forEach(i => i.value=''); }
});
ACT.assessment = () => {
  Modal.open({title:'Free care assessment', sub:'Our care coordinator will call you back.', body:`<form data-submit="assessSubmit" id="assess-f">
    <div class="f2"><div class="field"><label>Patient name</label><input class="input" name="name" required></div><div class="field"><label>Age</label><input class="input" name="age" inputmode="numeric"></div></div>
    <div class="f2"><div class="field"><label>Mobile</label><input class="input" name="phone" inputmode="tel" required></div><div class="field"><label>Area</label><input class="input" name="area" list="areas-dl" placeholder="e.g. Fairlands"></div></div>
    <datalist id="areas-dl">${Object.keys(AREAS).map(a => `<option value="${a}">`).join('')}</datalist>
    <div class="field"><label>Care needed</label><select class="select" name="service">${SERVICES.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
    <div class="field"><label>Tell us about the patient</label><textarea class="textarea" name="notes" placeholder="e.g. discharged after knee surgery, needs dressing and physio"></textarea></div></form>`,
    foot:`<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" form="assess-f" id="as-btn">Request call-back</button>`});
};
FORM.assessSubmit = f => busy($('#as-btn'), async () => {
  const d = Object.fromEntries(new FormData(f));
  const req = {id:uid('RQ'), lead:{name:d.name, age:d.age, phone:d.phone, area:d.area}, service:d.service, date:dOff(1), slot:'10:00', notes:d.notes, created:Date.now(), status:'pending', source:'App — new enquiry'};
  const al = {id:uid('A'), level:'blue', kind:'request', text:`New enquiry — ${d.name} (${svc(d.service).name}${d.area?', '+d.area:''})`, ts:Date.now(), done:false};
  try{
    if(Cloud.profile){ S().requests.unshift(req); S().alerts.unshift(al); Store.save(); }
    else { await Cloud.publicInsert('requests', {id:req.id, doc:req}); await Cloud.publicInsert('alerts', {id:al.id, doc:al}).catch(() => {}); }
    Modal.close(f); toast('Request sent — we’ll call you shortly');
  }catch(e){ toast(isNetErr(e) ? 'No internet connection — please try again' : 'Could not send the request. Please call '+CO.phone,'err'); }
});

LOGIN.staff = () => authShell(`${brandWhite}<h2>Care staff app — GPS-verified visits.</h2><p>Clock in at the patient’s door, document care and get the family’s e-signature.</p>
  <ul><li><b>${I('locate','sm')}</b>GPS geofenced clock-in & clock-out</li><li><b>${I('route','sm')}</b>Today’s route & navigation</li><li><b>${I('clipboard','sm')}</b>Care tasks, vitals & notes</li><li><b>${I('sos','sm')}</b>Staff safety SOS</li></ul>`,
  `<div class="lang-top">${langToggle()}</div><div id="sl-step1"><h1>Staff sign in</h1><p class="sub">Use your employee ID and 6-digit PIN from the office.</p>
    <form data-submit="sLogin"><div class="field"><label>Employee ID</label><input class="input" id="sl-id" placeholder="e.g. S101" autocapitalize="characters" autocomplete="username" style="text-transform:uppercase"></div>
    <div class="field"><label>PIN</label>${codeBoxes('sp')}</div>
    <label class="remember"><span class="switch"><input type="checkbox" id="staff-rem" ${Remember.def() ? 'checked' : ''}><span></span></span><span class="grow"><b>Remember me</b><small>Stay signed in on this phone</small></span></label>
    <button class="btn btn-green btn-lg btn-block" id="sl-btn">${I('lock','sm')} Sign in</button></form>
    <div class="hint amber mt">${I('locate','sm')}<span>Location access is required on shift. Your GPS is shared with the office only while you’re working.</span></div></div>
  <div id="sl-step2" class="hidden center"><h1>Checking your location</h1><p class="sub">Required for Electronic Visit Verification (EVV).</p>
    <div class="gps-radar" id="sl-radar"><b>${I('locate','xl')}</b></div>
    <div id="sl-gps-msg" class="ink2">Waiting for GPS signal… allow location when your phone asks.</div>
    <div id="sl-gps-act" class="mt-l"></div></div>`);
LOGIN_AFTER.staff = () => { wireBoxes('sp'); const l = Remember.last('staff'); if(l) $('#sl-id').value = l; };
FORM.sLogin = () => busy($('#sl-btn'), async () => {
  const id = $('#sl-id').value.trim().toUpperCase(), pin = boxVal('sp');
  if(!/^S\d+$/.test(id)) return toast('Enter your employee ID, e.g. S101','err');
  if(pin.length !== 6) return toast('Enter your 6-digit PIN','err');
  let prof;
  const rem = $('#staff-rem').checked; Remember.set(rem); Remember.keep('staff', rem ? id : '');
  try{ prof = await Cloud.signIn(LOGIN_EMAIL.staff(id), pin); }
  catch(e){ $$('[data-sp]').forEach(i => i.value=''); return toast(isNetErr(e) ? 'No internet connection' : /incorrect/i.test(e.message) ? 'Employee ID or PIN is wrong. Check the PIN the office gave you.' : e.message,'err',5000); }
  $('#sl-step1').classList.add('hidden'); $('#sl-step2').classList.remove('hidden');
  staffGpsCheck(prof);
});
function staffGpsCheck(prof){
  const msg = $('#sl-gps-msg'), act = $('#sl-gps-act'), radar = $('#sl-radar');
  radar.className = 'gps-radar'; msg.textContent = 'Waiting for GPS signal… allow location when your phone asks.'; act.innerHTML = '';
  GPS.request(12000).then(p => {
    GPS.set(p.coords.latitude, p.coords.longitude, p.coords.accuracy);
    radar.classList.add('ok');
    msg.innerHTML = `<b class="b" style="color:var(--green)">GPS locked</b><br><span class="small tnum">${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)} · ±${Math.round(p.coords.accuracy)} m</span>`;
    act.innerHTML = `<button class="btn btn-green btn-lg btn-block" data-act="sEnter">Continue</button>`;
  }).catch(err => {
    radar.classList.add('warn');
    const denied = err && err.code===1;
    msg.innerHTML = `<b class="b" style="color:var(--amber)">${denied ? 'Location permission is blocked' : 'No GPS signal yet'}</b><p class="small muted mt-s" style="max-width:380px;margin:8px auto 0">${denied
      ? (isIOS() ? 'Open Settings → Privacy → Location Services → Safari (or Careva+) and choose “While Using”, then try again.' : 'Tap the lock icon next to the address bar (or Settings → Apps → Careva+ → Permissions) and allow Location, then try again.')
      : 'Step outside or near a window, make sure Location is switched on, then try again.'} Without GPS you can still work, but each clock-in will need office approval.</p>`;
    act.innerHTML = Cloud.mode==='local'
      ? `<div class="hint mt-s" style="text-align:left">${I('info','sm')}<span>This is the preview copy — it can’t read phone GPS. The live app on staff phones uses real GPS.</span></div><button class="btn btn-green btn-lg btn-block mt" data-act="sTestLoc">Use a test location (preview)</button><button class="btn btn-ghost btn-block mt-s" data-act="sEnter">Continue without GPS</button>`
      : `<button class="btn btn-green btn-lg btn-block" data-act="sRetry">${I('refresh','sm')} Try again</button><button class="btn btn-ghost btn-block mt-s" data-act="sEnter">Continue without GPS</button>`;
  });
  ACT.sRetry = () => staffGpsCheck(prof);
  ACT.sTestLoc = () => { GPS.test = true; GPS.set(OFFICE.lat, OFFICE.lng, 10); App.boot(prof); };
  ACT.sEnter = () => App.boot(prof);
}

LOGIN.office = () => authShell(`${brandWhite}<h2>Careva+ care office — run every visit from one screen.</h2><p>For the owner, coordinators, clinical supervisors and billing.</p>
  <ul><li><b>${I('map','sm')}</b>Live staff map & visit verification</li><li><b>${I('calendar','sm')}</b>Scheduling & assignments</li><li><b>${I('users','sm')}</b>Patients, staff & logins</li><li><b>${I('rupee','sm')}</b>Billing, payments & reports</li></ul>`,
  `<div id="ol-login"><h1>Office sign in</h1><p class="sub">Authorised Careva+ staff only.</p>
   <form data-submit="oLogin"><div class="field"><label>Work email</label><input class="input" id="ol-email" type="email" autocomplete="username" required></div>
   <div class="field"><label>Password</label><input class="input" id="ol-pass" type="password" autocomplete="current-password" required></div>
   <button class="btn btn-navy btn-lg btn-block" id="ol-btn">${I('lock','sm')} Sign in</button></form>
   <div id="ol-setup-cta"></div></div>
   <div id="ol-setup" class="hidden"><h1>Create your owner login</h1><p class="sub">First time only. There is no ready-made username or password — you choose them here. After this you add your staff and patients, and the app gives each of them their own code.</p>
   <form data-submit="oSetup"><div class="field"><label>Your name</label><input class="input" name="name" required></div>
   <div class="field"><label>Email</label><input class="input" name="email" type="email" required autocomplete="username"></div>
   <div class="f2"><div class="field"><label>Password</label><input class="input" name="password" type="password" minlength="8" required autocomplete="new-password"></div><div class="field"><label>Confirm</label><input class="input" name="password2" type="password" minlength="8" required autocomplete="new-password"></div></div>
   <button class="btn btn-primary btn-lg btn-block" id="os-btn">${I('check','sm')} Create owner account</button></form>
   <div class="hint mt">${I('info','sm')}<span>Write down this email and password — you will use them every time you sign in to the office.</span></div>
   <p class="small muted center mt">Already set up? <button class="btn-text" data-act="oShowLogin">Sign in instead</button></p></div>`);
LOGIN_AFTER.office = async () => {
  try{ const st = await Cloud.admin('status'); if(st && st.hasOwner===false && $('#ol-setup')){ ACT.oShowSetup(); $('#ol-setup-cta').innerHTML = `<div class="hint green mt">${I('star','sm')}<span>First time here? <button class="btn-text" data-act="oShowSetup">Set up Careva+ and create the owner account</button></span></div>`; } }catch(e){}
};
ACT.oShowSetup = () => { $('#ol-login').classList.add('hidden'); $('#ol-setup').classList.remove('hidden'); };
ACT.oShowLogin = () => { $('#ol-setup').classList.add('hidden'); $('#ol-login').classList.remove('hidden'); };
FORM.oLogin = () => busy($('#ol-btn'), async () => {
  Remember.set(Cloud.mode === 'supabase');
  try{ const p = await Cloud.signIn($('#ol-email').value.trim().toLowerCase(), $('#ol-pass').value); if(!OFFICE_ROLES.includes(p.role)){ toast('This account is not an office account — use the staff or patient sign-in','warn'); } await App.boot(p); }
  catch(e){ toast(isNetErr(e) ? 'No internet connection' : e.message,'err'); }
});
FORM.oSetup = f => busy($('#os-btn'), async () => {
  const d = Object.fromEntries(new FormData(f));
  if(d.password !== d.password2) return toast('Passwords don’t match','err');
  Remember.set(Cloud.mode === 'supabase');
  try{ await Cloud.admin('bootstrap', {name:d.name, email:d.email.trim().toLowerCase(), password:d.password}); const p = await Cloud.signIn(d.email.trim().toLowerCase(), d.password); await App.boot(p); toast('Careva+ is ready — start by adding your staff and patients'); }
  catch(e){ toast(isNetErr(e) ? 'No internet connection' : e.message,'err'); }
});

document.addEventListener('DOMContentLoaded', () => App.start());
