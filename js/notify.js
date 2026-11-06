/* ============ Careva+ — Apple-style notifications ============
   • Chime: a short bell sound made in the browser (no sound files to download).
   • Banner: an iPhone-style glass notification that drops in from the top.
   • Red count badges on the bell / messages buttons, and on the installed app icon.
   Shown when something new arrives from someone else: a patient messages their
   nurse, a patient sends information to the office, the office messages staff, etc. */
const Chime = {
  ctx: null,
  on(){ try{ return localStorage.getItem('careva_sound') !== '0'; }catch(e){ return true; } },
  setOn(v){ try{ localStorage.setItem('careva_sound', v ? '1' : '0'); }catch(e){} },
  unlock(){   // phones only allow sound after the first tap
    try{
      const C = window.AudioContext || window.webkitAudioContext; if(!C) return;
      if(!this.ctx) this.ctx = new C();
      if(this.ctx.state === 'suspended') this.ctx.resume();
    }catch(e){}
  },
  play(kind = 'msg'){
    if(!this.on()) return;
    this.unlock(); const c = this.ctx; if(!c || c.state !== 'running') return;
    try{
      const t0 = c.currentTime + 0.02, urgent = kind === 'urgent';
      // msg: two rising bell notes (like a message tone) · soft: one note · urgent: three quick pulses
      const notes = urgent ? [[987.8, 0], [987.8, .2], [987.8, .4]] : kind === 'soft' ? [[1318.5, 0]] : [[1318.5, 0], [1760, .12]];
      const out = c.createGain(); out.gain.value = urgent ? .3 : .2; out.connect(c.destination);
      notes.forEach(([f, at]) => [[1, 1], [2.01, .16], [3.02, .05]].forEach(([mul, g]) => {   // bell partials
        const o = c.createOscillator(), e = c.createGain(), s = t0 + at, dur = urgent ? .17 : .85;
        o.type = 'sine'; o.frequency.value = f * mul;
        e.gain.setValueAtTime(0.0001, s); e.gain.exponentialRampToValueAtTime(g, s + .008); e.gain.exponentialRampToValueAtTime(0.0001, s + dur);
        o.connect(e); e.connect(out); o.start(s); o.stop(s + dur + .05);
      }));
    }catch(e){}
    try{ if(navigator.vibrate) navigator.vibrate(urgent ? [90, 60, 90] : 16); }catch(e){}
  },
};
['pointerdown', 'touchstart', 'keydown'].forEach(ev => document.addEventListener(ev, () => Chime.unlock(), {passive: true}));

// messages you have already seen (kept on this phone)
const Unread = {
  key(){ return 'careva_read_' + (App.uid || ''); },
  map(){ try{ return JSON.parse(localStorage.getItem(this.key()) || '{}'); }catch(e){ return {}; } },
  mark(th){ try{ const r = this.map(); r[th] = Date.now(); localStorage.setItem(this.key(), JSON.stringify(r)); }catch(e){} },
  of(th, me){ const r = this.map(); return (S().messages[th] || []).filter(m => m.from !== me && (m.ts || 0) > (r[th] || 0)).length; },
  count(threads, me){ return threads.reduce((n, t) => n + this.of(t.id || t, me), 0); },
};
// Apple-style red count bubble
const nbadge = (n, cls = '') => n ? `<span class="nbadge ${cls}">${n > 99 ? '99+' : n}</span>` : '';

const Notify = {
  away: 0,
  banner({title, text, icon = 'bell', tone = 'blue', go, sound = 'msg'}){
    let host = document.getElementById('nb-host');
    if(!host){ host = document.createElement('div'); host.id = 'nb-host'; host.className = 'nb-host'; document.body.appendChild(host); }
    const el = document.createElement('div'); el.className = 'nb'; el.setAttribute('role', 'status');
    el.innerHTML = `<div class="nb-app"><img src="img/mark.png" alt=""></div><div class="nb-b"><div class="nb-top"><span>CAREVA+</span><span>now</span></div><div class="nb-row"><span class="nb-sym nb-${tone}">${I(icon, 'xs')}</span><b class="ell">${esc(title)}</b></div><p>${esc(text || '')}</p></div>`;
    host.prepend(el); while(host.children.length > 3) host.lastChild.remove();
    let gone = false, y0 = null, dy = 0;
    const close = () => { if(gone) return; gone = true; el.classList.add('out'); setTimeout(() => el.remove(), 330); };
    const timer = setTimeout(close, 6500);
    el.addEventListener('click', () => { if(Math.abs(dy) > 8) return; clearTimeout(timer); close(); if(go) try{ go(); }catch(e){} });
    el.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; dy = 0; el.style.transition = 'none'; }, {passive: true});
    el.addEventListener('touchmove', e => { if(y0 == null) return; dy = Math.min(0, e.touches[0].clientY - y0); el.style.transform = `translateY(${dy}px)`; }, {passive: true});
    el.addEventListener('touchend', () => { el.style.transition = ''; if(dy < -30){ clearTimeout(timer); close(); } else el.style.transform = ''; y0 = null; });
    Chime.play(sound);
    if(document.hidden){ this.away++; this.appBadge(); }
  },
  appBadge(){ try{ if(this.away && navigator.setAppBadge) navigator.setAppBadge(this.away); else if(navigator.clearAppBadge) navigator.clearAppBadge(); }catch(e){} document.title = (this.away ? `(${this.away}) ` : '') + 'Careva+ Home Health Care'; },
  // something new arrived from someone else (realtime)
  incoming(t, d){
    if(!App.portal || !d) return;
    const P = App.portal, me = P === 'office' ? 'office' : App.uid;
    const who = x => x === 'office' ? 'Careva+ office' : (pat(x) || stf(x) || {}).name || 'Careva+';
    const chatOpen = th => ['messages', 'smsg', 'omsg'].includes(App.view) && App.params && App.params.t === th && !document.hidden;
    if(t === 'messages'){
      const th = String(d.thread || ''), parts = th.split('|');
      if(d.from === me) return;
      const mine = P === 'staff' ? (parts.includes(me) || th === 'all-staff') : P === 'patient' ? parts[0] === me : true;
      if(!mine) return;
      if(chatOpen(th)){ Unread.mark(th); return Chime.play('soft'); }
      const view = P === 'staff' ? 'smsg' : P === 'office' ? 'omsg' : 'messages';
      return this.banner({title: who(d.from), text: d.text, icon: 'chat', tone: 'blue', go: () => App.go(view, {t: th})});
    }
    if(P === 'office'){
      if(t === 'alerts'){
        const TITLE = {sos: 'Emergency SOS', request: 'New visit request', resched: 'Reschedule request', payment: 'Payment reported', refill: 'Medicine refill request', vitals: 'Abnormal vitals', insurance: 'Insurance details', staffnote: 'Message from staff', evv: 'Visit verification', cancel: 'Visit cancelled', leave: 'Leave request', cert: 'Certificate uploaded', avail: 'Staff availability', timesheet: 'Timesheet submitted'};
        const IC = {sos: 'sos', request: 'inbox', resched: 'calendar', payment: 'rupee', refill: 'pill', vitals: 'pulse', insurance: 'shield', staffnote: 'steth', evv: 'shield', cancel: 'calendar', leave: 'calendar', cert: 'award', avail: 'user', timesheet: 'clock'};
        const urgent = d.kind === 'sos' || d.level === 'red';
        return this.banner({title: TITLE[d.kind] || 'Careva+ update', text: d.text, icon: IC[d.kind] || 'bell', tone: d.level || 'blue', sound: urgent ? 'urgent' : 'msg',
          go: () => d.kind === 'request' || d.kind === 'resched' ? App.go('requests') : d.pid && pat(d.pid) && d.kind !== 'sos' ? App.go('patient', {id: d.pid}) : App.go('dash')});
      }
      if(t === 'vitals' && String(d.by || '').startsWith('Self') && pat(d.pid)) return this.banner({title: `New reading — ${pat(d.pid).name}`, text: `${d.sys ? `BP ${d.sys}/${d.dia || '–'}  ` : ''}${d.sugar ? `Sugar ${d.sugar}  ` : ''}${d.spo2 ? `SpO₂ ${d.spo2}%` : ''}`.trim() || 'Added from the family app', icon: 'pulse', tone: 'red', sound: 'soft', go: () => App.go('patient', {id: d.pid})});
      if(t === 'docs' && d.by === 'Uploaded by family' && pat(d.pid)) return this.banner({title: `New document — ${pat(d.pid).name}`, text: d.name, icon: 'file', tone: 'amber', sound: 'soft', go: () => App.go('patient', {id: d.pid})});
      return;
    }
    if(P === 'patient' && t === 'notifications' && d.pid === me) return this.banner({title: 'Careva+ update', text: d.text, icon: 'bell', tone: 'green', go: () => ACT.pNotifs && ACT.pNotifs()});
    if(P === 'staff' && t === 'visits' && d.sid === me && pat(d.pid)) return this.banner({title: 'New visit assigned', text: `${pat(d.pid).name} · ${relDay(d.date)} ${fmtT(d.start)}`, icon: 'calendar', tone: 'green', go: () => App.go('visit', {id: d.id})});
  },
};
document.addEventListener('visibilitychange', () => { if(!document.hidden){ Notify.away = 0; Notify.appBadge(); } });
