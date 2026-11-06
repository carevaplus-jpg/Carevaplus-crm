/* ============ Careva+ — Tamil language for the patient and staff apps ============
   The office portal stays in English. Screens are written in English; when Tamil is
   on, every text the patient/staff app shows is swapped for its Tamil version right
   after it is drawn (before the phone paints it), so layout, fonts and styles stay
   exactly the same in both languages. Names, addresses, medicines and notes typed by
   people are never changed. */
const I18N = {
  lang: (() => { try{ return localStorage.getItem('careva_lang') === 'ta' ? 'ta' : 'en'; }catch(e){ return 'en'; } })(),
  on(){
    if(this.lang !== 'ta' || typeof App === 'undefined') return false;
    return App.portal ? App.portal !== 'office' : App.screen !== 'office';
  },
  set(l){
    this.lang = l === 'ta' ? 'ta' : 'en';
    try{ localStorage.setItem('careva_lang', this.lang); }catch(e){}
    this.sync(); App.redraw();
  },
  t(s){ if(!this.on()) return s; const v = this.lookup(String(s).trim()); return v == null ? s : v; },
  // exact text → pattern (texts with numbers/names) → "a · b · c" pieces one by one
  lookup(k){
    if(Object.prototype.hasOwnProperty.call(TA, k)) return TA[k];
    if(k.indexOf('·') < 0) return this.one(k);
    let hit = false;
    const out = k.split(/(\s*·\s*)/).map(p => { const q = p.trim(); if(!q || q === '·') return p; const w = this.one(q); if(w == null) return p; hit = true; return p.replace(q, w); }).join('');
    return hit ? out : null;
  },
  one(k){
    if(Object.prototype.hasOwnProperty.call(TA, k)) return TA[k];
    for(const [re, rep] of TA_PAT){ const m = k.match(re); if(!m) continue; const v = typeof rep === 'function' ? rep(...m) : k.replace(re, rep); if(v != null) return v; }
    return null;
  },
  SKIP: new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'svg', 'CODE', 'PRE']),
  skipEl(e){ return this.SKIP.has(e.nodeName) || e.hasAttribute('data-notr') || e.isContentEditable; },
  skipped(el){ for(let e = el; e && e.nodeType === 1; e = e.parentNode){ if(this.skipEl(e)) return true; } return false; },
  done: new WeakMap(),   // text nodes already in Tamil (so they are never translated twice)
  text(n){
    const s = n.data, k = s.trim();
    if(!k || !/[A-Za-z]/.test(k) || this.done.get(n) === s) return;
    const v = this.lookup(k);
    if(v != null && v !== k){
      const p = n.parentNode;
      if(p && p.nodeName === 'OPTION' && !p.hasAttribute('value')) p.setAttribute('value', p.textContent);  // keep the form value in English
      n.data = s.replace(k, v); this.done.set(n, n.data);
    } else if(v == null && window.__I18N_MISS) window.__I18N_MISS.add(k);
  },
  attrs(el){
    for(const a of ['placeholder', 'title', 'aria-label', 'alt']){
      const s = el.getAttribute(a); if(!s || !/[A-Za-z]/.test(s)) continue;
      const v = this.lookup(s.trim());
      if(v != null) el.setAttribute(a, v); else if(window.__I18N_MISS) window.__I18N_MISS.add(s.trim());
    }
  },
  walk(root){
    if(!root) return;
    if(root.nodeType === 3){ if(root.parentNode && !this.skipped(root.parentNode)) this.text(root); return; }
    if(root.nodeType !== 1 || this.skipped(root)) return;
    this.attrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {acceptNode: n => n.nodeType === 1 && this.skipEl(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT});
    let n; while((n = w.nextNode())){ if(n.nodeType === 3) this.text(n); else this.attrs(n); }
  },
  sync(){
    const on = this.on(), h = document.documentElement;
    h.lang = on ? 'ta' : 'en'; h.classList.toggle('ta', on);
    return on;
  },
  start(){
    if(this.mo) return;
    this.mo = new MutationObserver(list => {
      if(!this.sync()) return;
      for(const m of list){
        if(m.type === 'characterData') this.walk(m.target);
        else for(const n of m.addedNodes) this.walk(n);
      }
    });
    this.mo.observe(document.body, {childList: true, subtree: true, characterData: true});
    if(this.sync()) this.walk(document.body);
  },
};

// language switch used on the start screen, the sign-in screens and the profile pages
const langToggle = (cls = '') => `<button class="lang-btn ${cls}" data-act="setLang" data-l="${I18N.lang === 'ta' ? 'en' : 'ta'}" data-notr>${I('globe', 'sm')}<span>${I18N.lang === 'ta' ? 'English' : 'தமிழ்'}</span></button>`;
const langSeg = () => `<div class="seg lang-seg" data-notr><button class="${I18N.lang === 'en' ? 'on' : ''}" data-act="setLang" data-l="en">English</button><button class="${I18N.lang === 'ta' ? 'on' : ''}" data-act="setLang" data-l="ta">தமிழ்</button></div>`;

const tr = x => { const v = I18N.lookup(String(x).trim()); return v == null ? x : v; };

/* ---------- Tamil dictionary (exact screen texts) ---------- */
const TA = {
  /* ---- start screen ---- */
  'Home health care': 'வீட்டு மருத்துவப் பராமரிப்பு',
  'Salem': 'சேலம்',
  'Tamil Nadu': 'தமிழ்நாடு',
  'Hospital care in the comfort of your': 'மருத்துவமனைத் தரப் பராமரிப்பு — உங்கள்',
  'home.': 'வீட்டின் வசதியிலேயே.',
  'One secure app that connects patients and families, our nurses and therapists in the field, and the Careva+ care office.': 'நோயாளிகள், குடும்பத்தினர், களத்தில் உள்ள எங்கள் செவிலியர்கள், சிகிச்சையாளர்கள் மற்றும் Careva+ பராமரிப்பு அலுவலகம் — அனைவரையும் இணைக்கும் ஒரே பாதுகாப்பான செயலி.',
  'Patient & Family': 'நோயாளி & குடும்பம்',
  'Book visits, track your nurse live, vitals, medicines, reports & bills': 'வருகை முன்பதிவு, செவிலியரை நேரலையில் கண்காணித்தல், உடல் அளவீடுகள், மருந்துகள், அறிக்கைகள் & கட்டணங்கள்',
  'Care Staff': 'பராமரிப்பு ஊழியர்',
  'Live GPS': 'நேரலை GPS',
  'GPS clock-in, today’s route, visit notes, vitals & e-signature': 'GPS வருகைப் பதிவு, இன்றைய வழித்தடம், வருகைக் குறிப்புகள், உடல் அளவீடுகள் & மின்-கையொப்பம்',
  'Office & Admin': 'அலுவலகம் & நிர்வாகம்',
  'Scheduling, live staff map, visit verification, billing & reports': 'அட்டவணை, ஊழியர் நேரலை வரைபடம், வருகைச் சரிபார்ப்பு, கட்டணம் & அறிக்கைகள்',
  'Medical emergency? Call 108': 'மருத்துவ அவசரமா? 108-ஐ அழைக்கவும்',
  'Preview copy — data entered here stays on this device. The live app (installed from your website) shares data between office, staff and families.': 'முன்னோட்டப் பதிப்பு — இங்கே உள்ளிடும் தகவல்கள் இந்தச் சாதனத்தில் மட்டுமே இருக்கும். (உங்கள் இணையதளத்திலிருந்து நிறுவப்படும்) நேரலைச் செயலி அலுவலகம், ஊழியர்கள், குடும்பங்களுக்கு இடையே தகவல்களைப் பகிரும்.',
  'Preview copy — data you enter here stays on this device. The live app shares data between office, staff and families.': 'முன்னோட்டப் பதிப்பு — இங்கே உள்ளிடும் தகவல்கள் இந்தச் சாதனத்தில் மட்டுமே இருக்கும். நேரலைச் செயலி அலுவலகம், ஊழியர்கள், குடும்பங்களுக்கு இடையே தகவல்களைப் பகிரும்.',
  'New here? Start with Office & Admin.': 'புதியவரா? அலுவலகம் & நிர்வாகம் பகுதியில் தொடங்குங்கள்.',
  'Create your own owner login there (you choose the email and password), then add your staff and patients — the app gives each of them a sign-in code.': 'அங்கே உங்கள் உரிமையாளர் உள்நுழைவை உருவாக்குங்கள் (மின்னஞ்சலும் கடவுச்சொல்லும் நீங்களே தேர்ந்தெடுக்கலாம்), பிறகு ஊழியர்களையும் நோயாளிகளையும் சேர்க்கவும் — ஒவ்வொருவருக்கும் செயலி ஒரு உள்நுழைவுக் குறியீடு தரும்.',
  'Set up now': 'இப்போதே அமைக்கவும்',
  'Install app': 'செயலியை நிறுவு',
  'Install the Careva+ app': 'Careva+ செயலியை நிறுவுங்கள்',
  'Install Careva+ app': 'Careva+ செயலியை நிறுவு',

  /* ---- services ---- */
  'Home Nursing Care': 'வீட்டு செவிலியர் பராமரிப்பு',
  'Nursing support at home': 'வீட்டிலேயே செவிலியர் உதவி',
  'Elder Care': 'முதியோர் பராமரிப்பு',
  'Daily support for seniors': 'முதியோருக்குத் தினசரி உதவி',
  'Post-Operative Care': 'அறுவை சிகிச்சைக்குப் பிந்தைய பராமரிப்பு',
  'Recovery support after surgery': 'அறுவை சிகிச்சைக்குப் பின் குணமடைய உதவி',
  'Physiotherapy at Home': 'வீட்டிலேயே பிசியோதெரபி',
  'Rehab sessions at home': 'வீட்டிலேயே மறுவாழ்வுப் பயிற்சிகள்',
  'Wound Care': 'காயப் பராமரிப்பு',
  'Dressing & wound care support': 'கட்டு மாற்றுதல் & காயப் பராமரிப்பு',
  'Palliative Care': 'நோய்த்தணிப்புப் பராமரிப்பு',
  'Comfort and dignity': 'ஆறுதலும் கண்ணியமும்',
  'Nursing': 'செவிலியர் சேவை',
  'Elder care': 'முதியோர் பராமரிப்பு',
  'Post-op': 'அறுவைக்குப் பின்',
  'Physio': 'பிசியோ',
  'Wound care': 'காயப் பராமரிப்பு',
  'Palliative': 'நோய்த்தணிப்பு',
  'visit': 'வருகை',
  'session': 'அமர்வு',
  '4-hr shift': '4 மணி நேரப் பணி',

  /* ---- roles ---- */
  'Registered Nurse': 'பதிவுபெற்ற செவிலியர்',
  'Staff Nurse': 'ஸ்டாஃப் நர்ஸ்',
  'Physiotherapist': 'பிசியோதெரபிஸ்ட்',
  'Wound Care Nurse': 'காயப் பராமரிப்பு செவிலியர்',
  'Palliative Care Nurse': 'நோய்த்தணிப்பு செவிலியர்',
  'Patient Care Attendant': 'நோயாளி பராமரிப்பு உதவியாளர்',
  'Care Coordinator': 'பராமரிப்பு ஒருங்கிணைப்பாளர்',
  'Care staff': 'பராமரிப்பு ஊழியர்',
  'Unassigned': 'ஒதுக்கப்படவில்லை',

  /* ---- visit status ---- */
  'Scheduled': 'திட்டமிடப்பட்டது',
  'On the way': 'வழியில் உள்ளார்',
  'In progress': 'நடைபெறுகிறது',
  'Completed': 'நிறைவு',
  'Missed': 'தவறியது',
  'Cancelled': 'ரத்து செய்யப்பட்டது',
  'Awaiting confirmation': 'உறுதிப்படுத்தலுக்குக் காத்திருக்கிறது',
  'Late': 'தாமதம்',
  'Confirmed': 'உறுதி செய்யப்பட்டது',
  'Requested': 'கோரப்பட்டது',
  'requested': 'கோரப்பட்டது',

  /* ---- people & relations ---- */
  'Female': 'பெண்', 'Male': 'ஆண்',
  'Son': 'மகன்', 'Daughter': 'மகள்', 'Spouse': 'வாழ்க்கைத் துணை', 'Grandchild': 'பேரக்குழந்தை', 'Relative': 'உறவினர்', 'Neighbour': 'அண்டை வீட்டார்',
  'Wife': 'மனைவி', 'Husband': 'கணவர்', 'Mother': 'அம்மா', 'Father': 'அப்பா', 'Brother': 'சகோதரர்', 'Sister': 'சகோதரி', 'Daughter-in-law': 'மருமகள்', 'Son-in-law': 'மருமகன்',
  'Self': 'நானே', 'Self (family)': 'நானே (குடும்பம்)', 'patient': 'நோயாளி', 'Patient': 'நோயாளி', 'Nurse': 'செவிலியர்', 'Care': 'பராமரிப்பு', 'You': 'நீங்கள்', 'Office': 'அலுவலகம்',

  /* ---- common words ---- */
  'Today': 'இன்று', 'Tomorrow': 'நாளை', 'Yesterday': 'நேற்று',
  'Good morning': 'காலை வணக்கம்', 'Good afternoon': 'மதிய வணக்கம்', 'Good evening': 'மாலை வணக்கம்',
  'Close': 'மூடு', 'Cancel': 'ரத்து செய்', 'Save': 'சேமி', 'Edit': 'திருத்து', 'Add': 'சேர்', 'View': 'பார்', 'All': 'அனைத்தும்', 'Done': 'முடிந்தது',
  'Continue': 'தொடரவும்', 'Confirm': 'உறுதி செய்', 'Copy': 'நகலெடு', 'Send': 'அனுப்பு', 'Submit': 'சமர்ப்பி', 'Upload': 'பதிவேற்று', 'Open': 'திறக்கவும்',
  'Call': 'அழை', 'Message': 'செய்தி', 'Invite': 'அழை', 'Clear': 'அழி', 'Ok': 'சரி', 'Got it': 'சரி', 'Review': 'மறுஆய்வு', 'Manual': 'கைமுறை',
  'Live': 'நேரலை', '● Live': '● நேரலை', 'just now': 'இப்போது', 'New': 'புதியவர்', '★ New': '★ புதியவர்', 'Active': 'செயலில்', 'Status': 'நிலை',
  'None': 'இல்லை', 'None known': 'எதுவும் இல்லை', 'Other': 'மற்றவை', 'Name': 'பெயர்', 'Age': 'வயது', 'Mobile': 'மொபைல்', 'Area': 'பகுதி', 'Address': 'முகவரி',
  'Date': 'தேதி', 'Day': 'நாள்', 'Hours': 'மணிநேரம்', 'Km': 'கி.மீ', 'Type': 'வகை', 'Reason': 'காரணம்', 'From': 'இருந்து', 'To': 'வரை', 'Distance': 'தூரம்',
  'Please wait…': 'சற்று காத்திருக்கவும்…', 'Saving…': 'சேமிக்கிறது…', '● Saving': '● சேமிக்கிறது', 'Uploading…': 'பதிவேற்றுகிறது…', 'Searching…': 'தேடுகிறது…', 'Requesting…': 'கோருகிறது…',
  'All changes saved': 'அனைத்து மாற்றங்களும் சேமிக்கப்பட்டன', 'Copied to clipboard': 'நகலெடுக்கப்பட்டது', 'Copy not available here': 'இங்கே நகலெடுக்க முடியாது',
  'No internet connection': 'இணைய இணைப்பு இல்லை', 'No internet connection — please try again': 'இணைய இணைப்பு இல்லை — மீண்டும் முயலவும்', 'Try again': 'மீண்டும் முயலவும்',
  'Help:': 'உதவி:', 'away': 'தொலைவில்', 'drive': 'பயணம்', 'verified': 'சரிபார்க்கப்பட்டது', 'Verified': 'சரிபார்க்கப்பட்டது', 'Updated': 'புதுப்பிக்கப்பட்டது',
  'Expired': 'காலாவதியானது', 'Valid': 'செல்லுபடியாகும்', 'Due': 'நிலுவை', 'Paid': 'செலுத்தப்பட்டது', 'Overdue': 'தாமதம்', 'Submitted': 'சமர்ப்பிக்கப்பட்டது',
  'High': 'அதிகம்', 'Low': 'குறைவு', 'Normal': 'இயல்பு', 'In range': 'வரம்பிற்குள்', 'Above target': 'இலக்கை விட அதிகம்',
  'Medium risk': 'நடுத்தர அபாயம்', 'High risk': 'அதிக அபாயம்', 'Low risk': 'குறைந்த அபாயம்',
  'not done': 'செய்யப்படவில்லை', 'no GPS': 'GPS இல்லை', 'without GPS': 'GPS இல்லாமல்', 'clocked out': 'வெளியேறல் பதிவானது',
  '●\u00a0Live': '●\u00a0நேரலை', '●\u00a0Saving': '●\u00a0சேமிக்கிறது', '●\u00a0Offline': '●\u00a0ஆஃப்லைன்', 'Offline — changes will sync when you reconnect': 'ஆஃப்லைன் — இணைப்பு திரும்பியதும் மாற்றங்கள் சேமிக்கப்படும்',
  'Remember me': 'என்னை நினைவில் கொள்', 'Stay signed in on this phone': 'இந்தத் தொலைபேசியில் உள்நுழைந்தே இருக்கவும்',
  'Mobile number or access code is wrong. Use the family mobile number the office registered for the app.': 'மொபைல் எண் அல்லது அணுகல் குறியீடு தவறு. செயலிக்காக அலுவலகம் பதிவு செய்த குடும்ப மொபைல் எண்ணைப் பயன்படுத்தவும்.',
  'Employee ID or PIN is wrong. Check the PIN the office gave you.': 'பணியாளர் ID அல்லது PIN தவறு. அலுவலகம் வழங்கிய PIN-ஐச் சரிபார்க்கவும்.',
  'Language': 'மொழி', 'App language on this phone': 'இந்தத் தொலைபேசியில் செயலியின் மொழி',
  'Zoom in': 'பெரிதாக்கு', 'Zoom out': 'சிறிதாக்கு', 'Recenter': 'மையப்படுத்து',
  'Loading your Careva+ data…': 'உங்கள் Careva+ தகவல்கள் ஏற்றப்படுகின்றன…',
  'You’re offline': 'நீங்கள் ஆஃப்லைனில் உள்ளீர்கள்',
  'Couldn’t start Careva+': 'Careva+ ஐத் தொடங்க முடியவில்லை', 'Can’t connect': 'இணைக்க முடியவில்லை', 'Checking your connection…': 'உங்கள் இணைப்பைச் சரிபார்க்கிறது…',
  'Your network is blocking Careva+': 'உங்கள் நெட்வொர்க் Careva+ ஐத் தடுக்கிறது',
  'Your internet works, but this network isn’t letting the app reach the Careva+ server.': 'உங்கள் இணையம் வேலை செய்கிறது, ஆனால் இந்த நெட்வொர்க் Careva+ சர்வரை அடைய ஆப்பை அனுமதிக்கவில்லை.',
  'The Careva+ server took too long to answer. Please try again.': 'Careva+ சர்வர் பதில் அளிக்க அதிக நேரம் எடுத்தது. மீண்டும் முயற்சிக்கவும்.',
  'The first start needs internet to finish setting up the app, and the download didn’t get through. Your internet works — please try again in a moment.': 'ஆப்பை முதல் முறை தொடங்க இணையம் தேவை, பதிவிறக்கம் முடியவில்லை. உங்கள் இணையம் வேலை செய்கிறது — சிறிது நேரத்தில் மீண்டும் முயற்சிக்கவும்.',
  'Still connecting… a slow or busy network can take a little longer.': 'இன்னும் இணைக்கிறது… மெதுவான நெட்வொர்க்கில் சற்று அதிக நேரம் ஆகலாம்.',
  'Fix:': 'தீர்வு:',
  'Switch between Wi-Fi and mobile data, or on Android open Settings → Network & internet → Private DNS → choose “Private DNS provider hostname” and type dns.google — then tap Try again.': 'Wi-Fi மற்றும் மொபைல் டேட்டா இடையே மாற்றவும், அல்லது Android-இல் Settings → Network & internet → Private DNS → “Private DNS provider hostname” தேர்ந்தெடுத்து dns.google என டைப் செய்யவும் — பிறகு “மீண்டும் முயலவும்” என்பதைத் தட்டவும்.', 'Something went wrong': 'ஏதோ தவறு நடந்தது',
  'Careva+ needs an internet connection to load your data. Check your mobile data or Wi-Fi.': 'உங்கள் தகவல்களை ஏற்ற Careva+-க்கு இணைய இணைப்பு தேவை. மொபைல் டேட்டா அல்லது Wi-Fi-ஐச் சரிபார்க்கவும்.',
  'Could not load data': 'தகவல்களை ஏற்ற முடியவில்லை',
  'Your patient record isn’t available. Please contact the Careva+ office.': 'உங்கள் நோயாளிப் பதிவு கிடைக்கவில்லை. Careva+ அலுவலகத்தைத் தொடர்பு கொள்ளவும்.',
  'Your staff record isn’t available. Please contact the Careva+ office.': 'உங்கள் ஊழியர் பதிவு கிடைக்கவில்லை. Careva+ அலுவலகத்தைத் தொடர்பு கொள்ளவும்.',
  'This page could not be shown': 'இந்தப் பக்கத்தைக் காட்ட முடியவில்லை',
  'Sign out': 'வெளியேறு', 'Sign out?': 'வெளியேறவா?', 'You will return to the Careva+ start screen.': 'Careva+ தொடக்கத் திரைக்குத் திரும்புவீர்கள்.',
  'Welcome to Careva+': 'Careva+-க்கு வரவேற்கிறோம்',
  'Careva+ is installed on this device': 'Careva+ இந்தச் சாதனத்தில் நிறுவப்பட்டது',
  'A new version of Careva+ is ready — it loads next time you open the app': 'Careva+ புதிய பதிப்பு தயார் — அடுத்த முறை திறக்கும்போது ஏற்றப்படும்',
  'Works offline-ready, opens full screen like a normal app.': 'சாதாரண செயலி போல முழுத் திரையில் திறக்கும்.',
  'Open this page in': 'இந்தப் பக்கத்தைத் திறக்கவும்:',
  'Tap the': 'தட்டவும்:', 'button': 'பொத்தான்', 'at the bottom.': '(கீழே).', 'Scroll and tap': 'கீழே நகர்த்தித் தட்டவும்:', ', then': ', பிறகு',
  'Tap the menu': 'மெனுவைத் தட்டவும்', 'at the top right.': '(மேல் வலது மூலையில்).', '(or': '(அல்லது', '), then': '), பிறகு', 'Install': 'நிறுவு',

  /* ---- sign in ---- */
  'Your care, your nurse and your health — in one place.': 'உங்கள் பராமரிப்பு, உங்கள் செவிலியர், உங்கள் ஆரோக்கியம் — ஒரே இடத்தில்.',
  'Secure access for patients and family members.': 'நோயாளிகளுக்கும் குடும்பத்தினருக்கும் பாதுகாப்பான அணுகல்.',
  'Track your nurse live on the map': 'உங்கள் செவிலியரை வரைபடத்தில் நேரலையில் கண்காணிக்கலாம்',
  'Vitals, medicines and care plan': 'உடல் அளவீடுகள், மருந்துகள் மற்றும் பராமரிப்புத் திட்டம்',
  'Reports, prescriptions and bills': 'அறிக்கைகள், மருந்துச் சீட்டுகள் மற்றும் கட்டணங்கள்',
  'Every visit GPS-verified': 'ஒவ்வொரு வருகையும் GPS மூலம் சரிபார்க்கப்படும்',
  'All portals': 'முதல் பக்கம்',
  'Patient sign in': 'நோயாளி உள்நுழைவு',
  'Use the mobile number registered with Careva+ and your 6-digit access code.': 'Careva+-இல் பதிவு செய்த மொபைல் எண்ணையும் உங்கள் 6 இலக்க அணுகல் குறியீட்டையும் பயன்படுத்தவும்.',
  'Mobile number': 'மொபைல் எண்', 'Access code': 'அணுகல் குறியீடு', 'Sign in': 'உள்நுழை',
  'Your access code is given by the Careva+ office when care starts. Forgot it? Call': 'பராமரிப்பு தொடங்கும்போது Careva+ அலுவலகம் அணுகல் குறியீட்டை வழங்கும். மறந்துவிட்டீர்களா? அழைக்கவும்',
  'New to Careva+?': 'Careva+-க்கு புதியவரா?',
  'Request a free care assessment': 'இலவசப் பராமரிப்பு மதிப்பீட்டைக் கோருங்கள்',
  'Enter your 10-digit mobile number': 'உங்கள் 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்',
  'Enter the 6-digit access code': '6 இலக்க அணுகல் குறியீட்டை உள்ளிடவும்',
  'Incorrect login details': 'உள்நுழைவு விவரங்கள் தவறானவை',
  'Care staff app — GPS-verified visits.': 'பராமரிப்பு ஊழியர் செயலி — GPS சரிபார்த்த வருகைகள்.',
  'Clock in at the patient’s door, document care and get the family’s e-signature.': 'நோயாளியின் வீட்டு வாசலில் வருகையைப் பதிவுசெய்து, பராமரிப்பை ஆவணப்படுத்தி, குடும்பத்தினரின் மின்-கையொப்பத்தைப் பெறுங்கள்.',
  'GPS geofenced clock-in & clock-out': 'GPS எல்லைக்குள் வருகை & வெளியேறல் பதிவு',
  'Today’s route & navigation': 'இன்றைய வழித்தடம் & வழிகாட்டல்',
  'Care tasks, vitals & notes': 'பராமரிப்புப் பணிகள், உடல் அளவீடுகள் & குறிப்புகள்',
  'Staff safety SOS': 'ஊழியர் பாதுகாப்பு SOS',
  'Staff sign in': 'ஊழியர் உள்நுழைவு',
  'Use your employee ID and 6-digit PIN from the office.': 'அலுவலகம் வழங்கிய பணியாளர் ID மற்றும் 6 இலக்க PIN-ஐப் பயன்படுத்தவும்.',
  'Employee ID': 'பணியாளர் ID',
  'Location access is required on shift. Your GPS is shared with the office only while you’re working.': 'பணி நேரத்தில் இருப்பிட அனுமதி தேவை. நீங்கள் பணியில் இருக்கும்போது மட்டுமே உங்கள் GPS அலுவலகத்துடன் பகிரப்படும்.',
  'Checking your location': 'உங்கள் இருப்பிடம் சரிபார்க்கப்படுகிறது',
  'Required for Electronic Visit Verification (EVV).': 'மின்னணு வருகைச் சரிபார்ப்புக்கு (EVV) தேவை.',
  'Waiting for GPS signal… allow location when your phone asks.': 'GPS சிக்னலுக்காகக் காத்திருக்கிறது… தொலைபேசி கேட்கும்போது இருப்பிட அனுமதி வழங்கவும்.',
  'Enter your employee ID, e.g. S101': 'உங்கள் பணியாளர் ID-ஐ உள்ளிடவும், எ.கா. S101',
  'Enter your 6-digit PIN': 'உங்கள் 6 இலக்க PIN-ஐ உள்ளிடவும்',
  'GPS locked': 'GPS கிடைத்தது',
  'Location permission is blocked': 'இருப்பிட அனுமதி தடுக்கப்பட்டுள்ளது',
  'Open Settings → Privacy → Location Services → Safari (or Careva+) and choose “While Using”, then try again.': 'Settings → Privacy → Location Services → Safari (அல்லது Careva+) திறந்து “While Using” தேர்ந்தெடுத்து, மீண்டும் முயலவும்.',
  'Tap the lock icon next to the address bar (or Settings → Apps → Careva+ → Permissions) and allow Location, then try again.': 'முகவரிப் பட்டிக்கு அருகிலுள்ள பூட்டு ஐகானைத் தட்டி (அல்லது Settings → Apps → Careva+ → Permissions) Location-ஐ அனுமதித்து, மீண்டும் முயலவும்.',
  'Step outside or near a window, make sure Location is switched on, then try again.': 'வெளியே அல்லது ஜன்னல் அருகே சென்று, Location இயக்கத்தில் உள்ளதை உறுதி செய்து, மீண்டும் முயலவும்.',
  'This is the preview copy — it can’t read phone GPS. The live app on staff phones uses real GPS.': 'இது முன்னோட்டப் பதிப்பு — தொலைபேசி GPS-ஐப் படிக்க முடியாது. ஊழியர் தொலைபேசிகளில் உள்ள நேரலைச் செயலி உண்மையான GPS-ஐப் பயன்படுத்தும்.',
  'Use a test location (preview)': 'சோதனை இருப்பிடத்தைப் பயன்படுத்து (முன்னோட்டம்)',
  'Continue without GPS': 'GPS இல்லாமல் தொடர்',
  'Without GPS you can still work, but each clock-in will need office approval.': 'GPS இல்லாமலும் பணியாற்றலாம், ஆனால் ஒவ்வொரு வருகைப் பதிவுக்கும் அலுவலக ஒப்புதல் தேவை.',
  'Free care assessment': 'இலவசப் பராமரிப்பு மதிப்பீடு',
  'Our care coordinator will call you back.': 'எங்கள் பராமரிப்பு ஒருங்கிணைப்பாளர் உங்களைத் திரும்ப அழைப்பார்.',
  'Patient name': 'நோயாளியின் பெயர்', 'Care needed': 'தேவையான பராமரிப்பு', 'Tell us about the patient': 'நோயாளியைப் பற்றிச் சொல்லுங்கள்',
  'Request call-back': 'திரும்ப அழைக்கக் கோருங்கள்',
  'Request sent — we’ll call you shortly': 'கோரிக்கை அனுப்பப்பட்டது — விரைவில் அழைப்போம்',
  'Could not send the request. Please call': 'கோரிக்கையை அனுப்ப முடியவில்லை. அழைக்கவும்',

  /* ---- patient app: navigation ---- */
  'Patient Portal': 'நோயாளி பகுதி', 'Patient app': 'நோயாளி செயலி',
  'Home': 'முகப்பு', 'Visits': 'வருகைகள்', 'Track nurse': 'செவிலியரைக் கண்காணி', 'My health': 'என் ஆரோக்கியம்', 'Messages': 'செய்திகள்',
  'Bills & payments': 'கட்டணங்கள் & செலுத்துதல்', 'Profile & family': 'சுயவிவரம் & குடும்பம்', 'Track': 'கண்காணி', 'Health': 'ஆரோக்கியம்', 'More': 'மேலும்',
  'Notifications': 'அறிவிப்புகள்', 'Call Careva+': 'Careva+-ஐ அழைக்கவும்', 'Emergency SOS': 'அவசர SOS',

  /* ---- patient home ---- */
  'Next visit': 'அடுத்த வருகை', 'Track live': 'நேரலையில் கண்காணி', 'Reschedule': 'நேரம் மாற்று', 'Nurse is with you': 'செவிலியர் உங்களுடன் இருக்கிறார்',
  'Quick actions': 'விரைவுச் செயல்கள்', 'Book visit': 'வருகை முன்பதிவு', 'Vitals': 'உடல் அளவீடுகள்', 'Medicines': 'மருந்துகள்', 'Reports': 'அறிக்கைகள்',
  'Pay bills': 'கட்டணம் செலுத்து', 'Call us': 'எங்களை அழைக்க', 'Today’s medicines': 'இன்றைய மருந்துகள்', 'Mark taken': 'எடுத்ததாகக் குறி', 'Missed?': 'தவறியதா?',
  'After food': 'உணவுக்குப் பின்', 'Before food': 'உணவுக்கு முன்', 'With food': 'உணவுடன்', 'Empty stomach': 'வெறும் வயிற்றில்', 'At bedtime': 'தூங்கும் முன்', 'When needed': 'தேவைப்படும்போது',
  'Latest vitals': 'சமீபத்திய உடல் அளவீடுகள்', 'No readings yet': 'இன்னும் அளவீடுகள் இல்லை',
  'Your nurse records vitals at each visit, or tap Add.': 'ஒவ்வொரு வருகையிலும் செவிலியர் அளவீடுகளைப் பதிவு செய்வார், அல்லது சேர் என்பதைத் தட்டவும்.',
  'Care plan progress': 'பராமரிப்புத் திட்ட முன்னேற்றம்', 'Your care team': 'உங்கள் பராமரிப்புக் குழு', 'Careva+ office': 'Careva+ அலுவலகம்', 'Careva+ Office': 'Careva+ அலுவலகம்',
  'No medicines scheduled': 'மருந்துகள் திட்டமிடப்படவில்லை', 'Marked as not taken': 'எடுக்கவில்லை எனக் குறிக்கப்பட்டது', 'You’re all caught up': 'புதிய அறிவிப்புகள் இல்லை',

  /* ---- live tracking ---- */
  'Live tracking': 'நேரலைக் கண்காணிப்பு', 'Know exactly when your nurse arrives': 'செவிலியர் எப்போது வருவார் என்பதைத் துல்லியமாக அறியுங்கள்',
  'ID verified': 'ID சரிபார்க்கப்பட்டது', 'RN staff': 'RN ஊழியர்', 'Visit progress': 'வருகை நிலை', 'Visit confirmed': 'வருகை உறுதி செய்யப்பட்டது',
  'Nurse started journey': 'செவிலியர் புறப்பட்டார்', 'Arrived & GPS check-in': 'வந்தடைந்தார் & GPS பதிவு', 'Visit completed': 'வருகை நிறைவடைந்தது',
  'Arriving now': 'இப்போது வந்துகொண்டிருக்கிறார்', 'GPS verified': 'GPS சரிபார்க்கப்பட்டது', 'GPS-verified check-in': 'GPS சரிபார்த்த வருகைப் பதிவு',
  'No visit to track today': 'இன்று கண்காணிக்க வருகை இல்லை',
  'Live tracking appears here on the day of your visit, as soon as your nurse starts the journey.': 'வருகை நாளில், செவிலியர் பயணத்தைத் தொடங்கியதும் நேரலைக் கண்காணிப்பு இங்கே தோன்றும்.',
  'The live location will appear as soon as their phone shares GPS.': 'அவர்களின் தொலைபேசி GPS-ஐப் பகிர்ந்தவுடன் நேரலை இருப்பிடம் தோன்றும்.',
  'Live tracking switches on automatically when': 'நேரலைக் கண்காணிப்பு தானாக இயங்கும் —', 'starts the journey.': 'பயணத்தைத் தொடங்கியதும்.',
  'Last seen': 'கடைசியாகத் தெரிந்தது', 'Starting shortly': 'விரைவில் தொடங்கும்', 'Checked in at': 'வருகை பதிவு நேரம்',

  /* ---- visits & booking ---- */
  'No upcoming visits': 'வரவிருக்கும் வருகைகள் இல்லை', 'Book a nurse, physiotherapist or caregiver at home.': 'செவிலியர், பிசியோதெரபிஸ்ட் அல்லது பராமரிப்பாளரை வீட்டுக்கு முன்பதிவு செய்யுங்கள்.',
  'Book a visit': 'வருகையை முன்பதிவு செய்', 'Upcoming and past home visits': 'வரவிருக்கும் மற்றும் முந்தைய வீட்டு வருகைகள்', 'Upcoming': 'வரவிருப்பவை',
  'Past visits': 'முந்தைய வருகைகள்', 'No past visits': 'முந்தைய வருகைகள் இல்லை', 'Visit summary': 'வருகைச் சுருக்கம்', 'Rate visit': 'வருகையை மதிப்பிடு',
  'Book a home visit': 'வீட்டு வருகையை முன்பதிவு செய்யுங்கள்', 'Choose the care you need — we confirm within 30 minutes.': 'உங்களுக்குத் தேவையான பராமரிப்பைத் தேர்ந்தெடுங்கள் — 30 நிமிடங்களுக்குள் உறுதி செய்வோம்.',
  'Type of care': 'பராமரிப்பு வகை', 'Preferred time': 'விரும்பும் நேரம்', 'Notes for the care team (optional)': 'பராமரிப்புக் குழுவுக்கான குறிப்புகள் (விருப்பத்தேர்வு)',
  'Visit address:': 'வருகை முகவரி:', 'Request visit': 'வருகையைக் கோரு', 'Please pick a time slot': 'ஒரு நேரத்தைத் தேர்ந்தெடுக்கவும்',
  'Visit requested — you’ll get a confirmation shortly': 'வருகை கோரப்பட்டது — விரைவில் உறுதிப்படுத்தல் வரும்',
  'The care coordinator confirms requests within 30 minutes during working hours.': 'வேலை நேரத்தில் 30 நிமிடங்களுக்குள் பராமரிப்பு ஒருங்கிணைப்பாளர் கோரிக்கைகளை உறுதி செய்வார்.',
  'Reschedule visit': 'வருகை நேரத்தை மாற்று', 'New date': 'புதிய தேதி', 'New time': 'புதிய நேரம்', 'Doctor appointment': 'மருத்துவர் சந்திப்பு', 'Family function': 'குடும்ப நிகழ்வு',
  'Patient not well enough': 'நோயாளிக்கு உடல்நிலை சரியில்லை', 'Keep visit': 'வருகையை வைத்திரு', 'Send request': 'கோரிக்கையை அனுப்பு', 'Reschedule request sent': 'நேர மாற்றக் கோரிக்கை அனுப்பப்பட்டது',
  'Cancel this visit?': 'இந்த வருகையை ரத்து செய்யவா?', 'Cancel visit': 'வருகையை ரத்து செய்', 'Visit cancelled': 'வருகை ரத்து செய்யப்பட்டது',
  'Submit rating': 'மதிப்பீட்டைச் சமர்ப்பி', 'Thank you for your feedback!': 'உங்கள் கருத்துக்கு நன்றி!', 'Signature pending': 'கையொப்பம் நிலுவையில்',

  /* ---- health ---- */
  'Vitals, medicines, care plan & reports': 'உடல் அளவீடுகள், மருந்துகள், பராமரிப்புத் திட்டம் & அறிக்கைகள்',
  'Recorded by your nurse at each visit — or add your own.': 'ஒவ்வொரு வருகையிலும் செவிலியர் பதிவு செய்வார் — நீங்களும் சேர்க்கலாம்.',
  'Add reading': 'அளவீடு சேர்', 'Blood pressure': 'இரத்த அழுத்தம்', 'Blood sugar': 'இரத்தச் சர்க்கரை', 'Pulse': 'நாடித்துடிப்பு', 'Temperature': 'உடல் வெப்பநிலை', 'Weight': 'எடை',
  'Sugar': 'சர்க்கரை', 'Temp': 'வெப்பம்', 'green band = target range': 'பச்சைப் பட்டை = இலக்கு வரம்பு', 'Systolic': 'சிஸ்டாலிக்', 'Diastolic': 'டயஸ்டாலிக்',
  'Recent readings': 'சமீபத்திய அளவீடுகள்', 'Readings appear here after your nurse’s visit or when you add one.': 'செவிலியர் வருகைக்குப் பின் அல்லது நீங்கள் சேர்க்கும்போது அளவீடுகள் இங்கே தோன்றும்.',
  'Add a reading': 'அளவீட்டைச் சேர்க்கவும்', 'Enter what you measured at home': 'வீட்டில் அளந்த மதிப்புகளை உள்ளிடவும்', 'BP systolic': 'BP சிஸ்டாலிக்', 'BP diastolic': 'BP டயஸ்டாலிக்',
  'Sugar (mg/dL)': 'சர்க்கரை (mg/dL)', 'Temperature (°C)': 'வெப்பநிலை (°C)', 'Weight (kg)': 'எடை (kg)', 'Save reading': 'அளவீட்டைச் சேமி',
  'Enter at least one value': 'குறைந்தது ஒரு மதிப்பை உள்ளிடவும்', 'Reading saved and shared with your nurse': 'அளவீடு சேமிக்கப்பட்டு செவிலியருடன் பகிரப்பட்டது',
  'Today’s schedule': 'இன்றைய அட்டவணை', 'Current prescription': 'தற்போதைய மருந்துச் சீட்டு', 'Request refill': 'மருந்தை மீண்டும் கோரு',
  'Never change or stop a medicine without talking to your doctor. Your nurse reviews adherence at every visit.': 'மருத்துவரிடம் கேட்காமல் எந்த மருந்தையும் மாற்றவோ நிறுத்தவோ வேண்டாம். ஒவ்வொரு வருகையிலும் மருந்து உட்கொள்ளுதலைச் செவிலியர் சரிபார்ப்பார்.',
  'Care plan': 'பராமரிப்புத் திட்டம்', 'Goals': 'இலக்குகள்', 'No goals yet': 'இன்னும் இலக்குகள் இல்லை', 'Medical summary': 'மருத்துவச் சுருக்கம்', 'Diagnosis': 'நோயறிதல்',
  'Allergies': 'ஒவ்வாமைகள்', 'Allergy': 'ஒவ்வாமை', 'Allergy:': 'ஒவ்வாமை:', 'Blood group': 'இரத்த வகை', 'Diet': 'உணவு முறை', 'Activity': 'செயல்பாடு', 'Doctor': 'மருத்துவர்',
  'Services in your plan': 'உங்கள் திட்டத்தில் உள்ள சேவைகள்', 'What your nurse does each visit': 'ஒவ்வொரு வருகையிலும் செவிலியர் செய்வது',
  'Personalised home-care plan': 'தனிப்பயன் வீட்டுப் பராமரிப்புத் திட்டம்', 'Home care plan': 'வீட்டுப் பராமரிப்புத் திட்டம்',
  'Reports & documents': 'அறிக்கைகள் & ஆவணங்கள்', 'Prescriptions, lab reports and discharge papers — always with you.': 'மருந்துச் சீட்டுகள், ஆய்வக அறிக்கைகள், டிஸ்சார்ஜ் ஆவணங்கள் — எப்போதும் உங்களுடன்.',
  'Careva+ care team': 'Careva+ பராமரிப்புக் குழு', 'No documents yet': 'இன்னும் ஆவணங்கள் இல்லை',
  'Upload discharge papers, lab reports or prescriptions so your care team can see them.': 'உங்கள் பராமரிப்புக் குழு பார்க்க, டிஸ்சார்ஜ் ஆவணங்கள், ஆய்வக அறிக்கைகள் அல்லது மருந்துச் சீட்டுகளைப் பதிவேற்றுங்கள்.',
  'File is too large (max 10 MB)': 'கோப்பு மிகப் பெரியது (அதிகபட்சம் 10 MB)', 'Uploaded by family': 'குடும்பத்தினர் பதிவேற்றியது', 'Document uploaded': 'ஆவணம் பதிவேற்றப்பட்டது',
  'Open file': 'கோப்பைத் திற', 'This document has no file attached.': 'இந்த ஆவணத்தில் கோப்பு இணைக்கப்படவில்லை.', 'Could not open the file': 'கோப்பைத் திறக்க முடியவில்லை',
  '℞ Current medicines': '℞ தற்போதைய மருந்துகள்', 'Medicine': 'மருந்து', 'Dose': 'அளவு', 'Timing': 'நேரம்', 'Prescribing doctor:': 'பரிந்துரைத்த மருத்துவர்:',
  'Diet:': 'உணவு முறை:', 'Activity:': 'செயல்பாடு:', 'Next review:': 'அடுத்த மறுஆய்வு:', 'reminders on': 'நினைவூட்டல்கள் இயக்கத்தில்', 'next review': 'அடுத்த மறுஆய்வு',

  /* ---- SOS ---- */
  'Emergency help': 'அவசர உதவி', 'Use this if the patient needs urgent help at home.': 'நோயாளிக்கு வீட்டில் அவசர உதவி தேவைப்பட்டால் இதைப் பயன்படுத்தவும்.',
  'Send SOS alert': 'SOS எச்சரிக்கை அனுப்பு', 'Tap SOS to alert the Careva+ care team and': 'SOS-ஐத் தட்டினால் Careva+ பராமரிப்புக் குழுவுக்கும்',
  'Ambulance 108': 'ஆம்புலன்ஸ் 108', 'Help is on the way': 'உதவி வந்துகொண்டிருக்கிறது', 'Call 108': '108-ஐ அழை',
  'The Careva+ care team and': 'Careva+ பராமரிப்புக் குழுவுக்கும்',
  'have been alerted with your home location. A coordinator will call you within 2 minutes.': '-க்கும் உங்கள் வீட்டு இருப்பிடத்துடன் எச்சரிக்கை அனுப்பப்பட்டது. 2 நிமிடங்களுக்குள் ஒருங்கிணைப்பாளர் உங்களை அழைப்பார்.',

  /* ---- bills ---- */
  'Invoices, payments and insurance': 'பில்கள், செலுத்துதல்கள் மற்றும் காப்பீடு', 'Amount due': 'செலுத்த வேண்டிய தொகை', 'Pay now': 'இப்போது செலுத்து', 'Pay': 'செலுத்து',
  'Billing details': 'கட்டண விவரங்கள்', 'Payer': 'செலுத்துபவர்', 'Self-pay': 'சுயமாகச் செலுத்துதல்', 'Billing contact': 'கட்டணத் தொடர்பு', 'Rates': 'கட்டண விகிதங்கள்',
  'Add insurance policy': 'காப்பீட்டுக் கொள்கையைச் சேர்', 'Add insurance': 'காப்பீடு சேர்', 'Insurance company': 'காப்பீட்டு நிறுவனம்', 'Policy number': 'பாலிசி எண்', 'Valid till': 'செல்லுபடியாகும் நாள்',
  'Our billing team will check home-care cover with your insurer.': 'உங்கள் காப்பீட்டு நிறுவனத்திடம் வீட்டுப் பராமரிப்புக் காப்பீட்டை எங்கள் கட்டணக் குழு சரிபார்க்கும்.',
  'Insurance (verification pending)': 'காப்பீடு (சரிபார்ப்பு நிலுவையில்)', 'Insurance details sent for verification': 'காப்பீட்டு விவரங்கள் சரிபார்ப்புக்கு அனுப்பப்பட்டன',
  'Invoices': 'பில்கள்', 'Invoice': 'பில்', 'INVOICE': 'பில்', 'Pay Careva+': 'Careva+-க்குச் செலுத்து',
  'Opens GPay, PhonePe, Paytm or BHIM on this phone. Or pay to UPI ID': 'இந்தத் தொலைபேசியில் GPay, PhonePe, Paytm அல்லது BHIM திறக்கும். அல்லது இந்த UPI ID-க்குச் செலுத்தவும்',
  'Already paid?': 'ஏற்கனவே செலுத்திவிட்டீர்களா?', 'UPI / bank reference (UTR) number': 'UPI / வங்கிக் குறிப்பு (UTR) எண்',
  'The office confirms your payment and the invoice is marked paid in the app.': 'அலுவலகம் உங்கள் கட்டணத்தை உறுதிசெய்த பின், செயலியில் பில் செலுத்தப்பட்டதாகக் குறிக்கப்படும்.',
  'I’ve paid': 'செலுத்திவிட்டேன்', 'Thank you! The office will confirm your payment': 'நன்றி! அலுவலகம் உங்கள் கட்டணத்தை உறுதி செய்யும்',
  'Payment being verified by the office': 'அலுவலகம் கட்டணத்தைச் சரிபார்க்கிறது', 'Verifying payment': 'கட்டணம் சரிபார்க்கப்படுகிறது', 'Payment reported': 'கட்டணம் தெரிவிக்கப்பட்டது',
  'Online payment details haven’t been added yet. Please pay the care coordinator, or call': 'ஆன்லைன் கட்டண விவரங்கள் இன்னும் சேர்க்கப்படவில்லை. பராமரிப்பு ஒருங்கிணைப்பாளரிடம் செலுத்தவும், அல்லது அழைக்கவும்',
  'You’re all paid up': 'அனைத்துக் கட்டணங்களும் செலுத்தப்பட்டன', 'No invoices yet': 'இன்னும் பில்கள் இல்லை', 'Invoices appear here at the end of each month.': 'ஒவ்வொரு மாத இறுதியிலும் பில்கள் இங்கே தோன்றும்.',
  'Nothing to pay right now': 'இப்போது செலுத்த எதுவும் இல்லை', 'Enter the payment reference number': 'கட்டணக் குறிப்பு எண்ணை உள்ளிடவும்',
  'Billed to': 'பில் பெறுபவர்', 'Service': 'சேவை', 'Qty': 'எண்ணிக்கை', 'Rate': 'விலை', 'Amount': 'தொகை', 'Total': 'மொத்தம்', 'Copy summary': 'சுருக்கத்தை நகலெடு',

  /* ---- messages ---- */
  'Talk to your care team': 'உங்கள் பராமரிப்புக் குழுவுடன் பேசுங்கள்', 'All conversations': 'அனைத்து உரையாடல்களும்', 'Start the conversation': 'உரையாடலைத் தொடங்குங்கள்',
  'Type a message…': 'செய்தியைத் தட்டச்சு செய்யவும்…', 'Office & patients': 'அலுவலகம் & நோயாளிகள்', 'All staff': 'அனைத்து ஊழியர்களும்', 'Announcements': 'அறிவிப்புகள்',
  'Care coordinator desk': 'பராமரிப்பு ஒருங்கிணைப்பாளர் மேசை',

  /* ---- profile & family ---- */
  'Personal details and family access': 'தனிப்பட்ட விவரங்கள் மற்றும் குடும்ப அணுகல்', 'Personal details': 'தனிப்பட்ட விவரங்கள்', 'Emergency contact': 'அவசரத் தொடர்பு',
  'Family access': 'குடும்ப அணுகல்', 'Family members can track visits & see reports': 'குடும்பத்தினர் வருகைகளைக் கண்காணிக்கவும் அறிக்கைகளைப் பார்க்கவும் முடியும்',
  'Full access': 'முழு அணுகல்', 'Visits & tracking only': 'வருகைகள் & கண்காணிப்பு மட்டும்', 'Billing only': 'கட்டணம் மட்டும்',
  'Visit reminders & nurse on the way': 'வருகை நினைவூட்டல்கள் & செவிலியர் வருகை', 'Medicine reminders': 'மருந்து நினைவூட்டல்கள்', 'Bills & payment receipts': 'பில்கள் & கட்டண ரசீதுகள்',
  'Share visit updates with family': 'வருகைத் தகவல்களைக் குடும்பத்துடன் பகிர்', 'Help & privacy': 'உதவி & தனியுரிமை', '24×7 care line': '24×7 பராமரிப்பு உதவி எண்',
  'Consent & privacy': 'ஒப்புதல் & தனியுரிமை', 'GPS is used only to verify visits at your home': 'உங்கள் வீட்டில் நடக்கும் வருகைகளைச் சரிபார்க்க மட்டுமே GPS பயன்படுத்தப்படுகிறது',
  'Edit details': 'விவரங்களைத் திருத்து', 'Their mobile': 'அவர்களின் மொபைல்', 'Invite a family member': 'குடும்ப உறுப்பினரை அழைக்கவும்', 'Relationship': 'உறவு', 'Access': 'அணுகல்',
  'Send invite': 'அழைப்பு அனுப்பு', 'Preference saved': 'விருப்பம் சேமிக்கப்பட்டது', 'Details updated': 'விவரங்கள் புதுப்பிக்கப்பட்டன', 'Family contact': 'குடும்பத் தொடர்பு',

  /* ---- staff app: navigation ---- */
  'Care Staff App': 'பராமரிப்பு ஊழியர் செயலி', 'Route map': 'வழித்தட வரைபடம்', 'My schedule': 'என் அட்டவணை', 'Timesheet & mileage': 'வேலை நேரம் & பயணத் தூரம்',
  'Profile & credentials': 'சுயவிவரம் & சான்றுகள்', 'Route': 'வழித்தடம்', 'Schedule': 'அட்டவணை', 'Timesheet': 'நேரத்தாள்', 'Profile': 'சுயவிவரம்', 'Leave': 'விடுப்பு', 'Visit': 'வருகை',

  /* ---- staff today ---- */
  'GPS live': 'GPS நேரலை', 'You’re off duty': 'நீங்கள் பணியில் இல்லை', 'Start your shift to begin GPS visit verification': 'GPS வருகைச் சரிபார்ப்பைத் தொடங்க உங்கள் பணியைத் தொடங்குங்கள்',
  'Start shift': 'பணியைத் தொடங்கு', 'End shift': 'பணியை முடி', 'End shift?': 'பணியை முடிக்கவா?', 'Shift started': 'பணி தொடங்கியது', 'Shift started — waiting for GPS': 'பணி தொடங்கியது — GPS-க்காகக் காத்திருக்கிறது',
  'Open visit': 'வருகையைத் திற', 'Navigate': 'வழிகாட்டு', 'Navigate ↗': 'வழிகாட்டு ↗', 'Visits completed': 'முடிந்த வருகைகள்', 'Care hours today': 'இன்றைய பராமரிப்பு நேரம்',
  'Km travelled': 'பயணித்த கி.மீ', 'Family rating': 'குடும்ப மதிப்பீடு', 'Today’s visits': 'இன்றைய வருகைகள்', 'Stop': 'நிறுத்தம்', 'Stops': 'நிறுத்தங்கள்', 'Today’s stops': 'இன்றைய நிறுத்தங்கள்',
  'GPS tracking active': 'GPS கண்காணிப்பு இயக்கத்தில்', 'km today': 'கி.மீ இன்று', 'Current visit': 'தற்போதைய வருகை', 'Continue visit': 'வருகையைத் தொடர்',
  'No visits scheduled today': 'இன்று வருகைகள் திட்டமிடப்படவில்லை', 'New visits from the office appear here instantly.': 'அலுவலகத்திலிருந்து வரும் புதிய வருகைகள் உடனே இங்கே தோன்றும்.',
  'All visits done for today': 'இன்றைய அனைத்து வருகைகளும் முடிந்தன', 'Great work! Don’t forget to end your shift.': 'அருமை! உங்கள் பணியை முடிக்க மறக்காதீர்கள்.', 'Back to today': 'இன்றைய பக்கத்துக்குத் திரும்பு',
  'Test GPS (preview)': 'சோதனை GPS (முன்னோட்டம்)', 'Location blocked': 'இருப்பிட அனுமதி தடுக்கப்பட்டது', 'Finding GPS…': 'GPS தேடுகிறது…', 'Waiting for your GPS…': 'உங்கள் GPS-க்காகக் காத்திருக்கிறது…',
  'Location is blocked — tap the GPS chip above for help.': 'இருப்பிடம் தடுக்கப்பட்டுள்ளது — உதவிக்கு மேலே உள்ள GPS பொத்தானைத் தட்டவும்.',
  'Keep the app open with Location switched on.': 'Location இயக்கத்தில் இருக்க, செயலியைத் திறந்தே வைத்திருங்கள்.',
  'Location permission is blocked for Careva+.': 'Careva+-க்கு இருப்பிட அனுமதி தடுக்கப்பட்டுள்ளது.', 'No GPS fix yet.': 'இன்னும் GPS கிடைக்கவில்லை.',
  'Live GPS connected': 'நேரலை GPS இணைந்தது', 'Location permission is still blocked': 'இருப்பிட அனுமதி இன்னும் தடுக்கப்பட்டுள்ளது', 'No GPS signal yet': 'இன்னும் GPS சிக்னல் இல்லை',
  'Turn Location Services on, then choose': 'Location Services-ஐ இயக்கி, தேர்ந்தெடுக்கவும்:', '(or Careva+) →': '(அல்லது Careva+) →', 'Come back and tap': 'திரும்பி வந்து தட்டவும்:',
  'lock icon': 'பூட்டு ஐகான்', 'next to the address (or open': '(முகவரிக்கு அருகில்; அல்லது திறக்கவும்:', 'Set': 'அமைக்கவும்:', 'to': '→', 'Make sure': 'விரைவு அமைப்புகளில்',
  'is switched on in your quick settings.': 'இயக்கத்தில் உள்ளதை உறுதி செய்யவும்.', 'Step outside or near a window for a better signal.': 'நல்ல சிக்னலுக்கு வெளியே அல்லது ஜன்னல் அருகே செல்லவும்.', 'Tap': 'தட்டவும்:',

  /* ---- staff visit ---- */
  'Diagnosis:': 'நோயறிதல்:', 'Location & visit verification': 'இருப்பிடம் & வருகைச் சரிபார்ப்பு', 'live phone GPS': 'தொலைபேசியின் நேரலை GPS', 'Start travel': 'பயணத்தைத் தொடங்கு',
  'Can’t get a GPS fix? Request manual verification': 'GPS கிடைக்கவில்லையா? கைமுறைச் சரிபார்ப்பைக் கோருங்கள்',
  'Journey started — the family can now track you live': 'பயணம் தொடங்கியது — குடும்பத்தினர் இப்போது உங்களை நேரலையில் கண்காணிக்கலாம்',
  'GPS status': 'GPS நிலை', 'You are at the patient’s home': 'நீங்கள் நோயாளியின் வீட்டில் இருக்கிறீர்கள்', 'Clock in': 'வருகை பதிவு', 'Clocked in': 'வருகை பதிவானது', 'On visit': 'வருகையில்',
  'Clock in manually': 'கைமுறையாக வருகை பதிவு', 'Simulate arrival (preview)': 'வருகையை உருவகப்படுத்து (முன்னோட்டம்)', 'Preview: moved to the patient’s door': 'முன்னோட்டம்: நோயாளியின் வாசலுக்கு நகர்த்தப்பட்டது',
  'Waiting for GPS — keep Location on, or use manual verification': 'GPS-க்காகக் காத்திருக்கிறது — Location-ஐ இயக்கத்தில் வைக்கவும், அல்லது கைமுறைச் சரிபார்ப்பைப் பயன்படுத்தவும்',
  'Manual verification': 'கைமுறைச் சரிபார்ப்பு', 'The office will review this visit before it is approved.': 'ஒப்புதலுக்கு முன் அலுவலகம் இந்த வருகையை மறுஆய்வு செய்யும்.',
  'Weak GPS signal inside the building': 'கட்டடத்துக்குள் GPS சிக்னல் பலவீனம்', 'Phone location services not working': 'தொலைபேசி இருப்பிடச் சேவை வேலை செய்யவில்லை',
  'Patient moved to a relative’s home': 'நோயாளி உறவினர் வீட்டுக்கு மாறியுள்ளார்', 'Note for the office': 'அலுவலகத்துக்கான குறிப்பு',
  'Clocked in — pending office review': 'வருகை பதிவானது — அலுவலக மறுஆய்வு நிலுவையில்', 'manual — pending office review': 'கைமுறை — அலுவலக மறுஆய்வு நிலுவையில்',
  'Set the patient’s home location first (office)': 'முதலில் நோயாளியின் வீட்டு இருப்பிடத்தை அமைக்கவும் (அலுவலகம்)', 'Clock out of your current visit first': 'முதலில் தற்போதைய வருகையிலிருந்து வெளியேறல் பதிவு செய்யவும்',
  'Visit not found': 'வருகை கிடைக்கவில்லை', 'Care tasks': 'பராமரிப்புப் பணிகள்', 'Shared with family & office': 'குடும்பம் & அலுவலகத்துடன் பகிரப்படும்',
  'Medicines given (MAR)': 'வழங்கிய மருந்துகள் (MAR)', 'Visit notes': 'வருகைக் குறிப்புகள்', 'Insert template': 'மாதிரி உரையைச் சேர்', 'Photos': 'புகைப்படங்கள்',
  'Required for wound care': 'காயப் பராமரிப்புக்குத் தேவை', 'Patient / family signature': 'நோயாளி / குடும்பத்தினர் கையொப்பம்', 'Confirms the visit took place': 'வருகை நடந்ததை உறுதிப்படுத்துகிறது',
  'Sign with a finger inside the box': 'பெட்டிக்குள் விரலால் கையொப்பமிடவும்', 'Clock out & complete visit': 'வெளியேறல் பதிவு & வருகையை முடி',
  'Uploading photo…': 'புகைப்படம் பதிவேற்றுகிறது…', 'Photo added to visit record': 'வருகைப் பதிவில் புகைப்படம் சேர்க்கப்பட்டது', 'No internet — photo not uploaded': 'இணையம் இல்லை — புகைப்படம் பதிவேற்றப்படவில்லை',
  'Could not upload that photo': 'அந்தப் புகைப்படத்தைப் பதிவேற்ற முடியவில்லை', 'Please get the patient/family signature first': 'முதலில் நோயாளி/குடும்பத்தினர் கையொப்பத்தைப் பெறவும்',
  'Add a wound photo before clocking out': 'வெளியேறல் பதிவுக்கு முன் காயப் புகைப்படத்தைச் சேர்க்கவும்',
  'Clock out anyway? Please explain in your visit notes why these were skipped.': 'இருப்பினும் வெளியேறல் பதிவு செய்யவா? இவை ஏன் விடுபட்டன என்பதை வருகைக் குறிப்புகளில் விளக்கவும்.',
  'Clock out anyway': 'இருப்பினும் வெளியேறு', 'No GPS at clock-out': 'வெளியேறல் பதிவின்போது GPS இல்லை',
  'In': 'உள்ளே', 'Out': 'வெளியே', 'Duration': 'நேரம்', 'EVV record sent to the office': 'EVV பதிவு அலுவலகத்துக்கு அனுப்பப்பட்டது', 'family notified': 'குடும்பத்தினருக்குத் தெரிவிக்கப்பட்டது',
  'Visit record': 'வருகைப் பதிவேடு', 'GPS visit verification (EVV)': 'GPS வருகைச் சரிபார்ப்பு (EVV)', 'Clock-in': 'வருகைப் பதிவு', 'Clock-out': 'வெளியேறல் பதிவு',
  'Vitals recorded': 'பதிவான உடல் அளவீடுகள்', 'Nurse’s notes': 'செவிலியர் குறிப்புகள்', 'Signature': 'கையொப்பம்',
  /* care tasks (from the service templates) */
  'Check vitals — BP, pulse, SpO₂, temperature': 'உடல் அளவீடுகளைச் சரிபார் — BP, நாடித்துடிப்பு, SpO₂, வெப்பநிலை', 'Blood sugar check': 'இரத்தச் சர்க்கரைச் சோதனை',
  'Administer medicines / insulin as charted': 'அட்டவணைப்படி மருந்துகள் / இன்சுலின் வழங்கு', 'Review medicine adherence': 'மருந்து உட்கொள்ளுதலைச் சரிபார்',
  'Skin & pressure-area check': 'தோல் & அழுத்தப் பகுதிச் சோதனை', 'Patient & family education': 'நோயாளி & குடும்பத்தினருக்கு விளக்கம்',
  'Assist bathing & grooming': 'குளியல் & சுத்தம் செய்ய உதவு', 'Mobility & transfer assistance': 'நடமாட்டம் & இடமாற்ற உதவி', 'Meal & hydration support': 'உணவு & நீர் அருந்த உதவி',
  'Medicine reminder': 'மருந்து நினைவூட்டல்', 'Companionship / memory activity': 'துணை இருப்பு / நினைவாற்றல் பயிற்சி', 'Fall-risk & home safety check': 'விழும் அபாயம் & வீட்டுப் பாதுகாப்புச் சோதனை',
  'Check vitals': 'உடல் அளவீடுகளைச் சரிபார்', 'Inspect surgical site': 'அறுவைப் பகுதியைப் பரிசோதி', 'Change dressing (aseptic)': 'கட்டு மாற்று (கிருமிநீக்கம்)', 'Pain assessment (0–10)': 'வலி மதிப்பீடு (0–10)',
  'Drain / catheter check': 'டிரெய்ன் / கதீட்டர் சோதனை', 'Supervised mobility exercises': 'மேற்பார்வையில் நடமாட்டப் பயிற்சிகள்', 'Pain & range-of-motion assessment': 'வலி & அசைவு வரம்பு மதிப்பீடு',
  'Strengthening exercises': 'வலுவூட்டும் பயிற்சிகள்', 'Gait training with walker': 'வாக்கருடன் நடைப் பயிற்சி', 'Balance training': 'சமநிலைப் பயிற்சி', 'Review home exercise plan': 'வீட்டுப் பயிற்சித் திட்டத்தை மறுஆய்வு செய்',
  'Measure & photograph wound': 'காயத்தை அளந்து புகைப்படம் எடு', 'Cleanse wound (normal saline)': 'காயத்தைச் சுத்தம் செய் (நார்மல் சலைன்)', 'Apply prescribed dressing': 'பரிந்துரைத்த கட்டு போடு',
  'Check for signs of infection': 'தொற்று அறிகுறிகளைச் சரிபார்', 'Offloading & diet advice': 'அழுத்தக் குறைப்பு & உணவு ஆலோசனை', 'Symptom assessment (pain, breathlessness)': 'அறிகுறி மதிப்பீடு (வலி, மூச்சுத்திணறல்)',
  'Comfort care & positioning': 'ஆறுதல் பராமரிப்பு & நிலைப்படுத்தல்', 'Medicine review': 'மருந்து மறுஆய்வு', 'Mouth & skin care': 'வாய் & தோல் பராமரிப்பு', 'Family counselling & support': 'குடும்ப ஆலோசனை & ஆதரவு',

  /* ---- staff: my patients ---- */
  'Record vitals': 'உடல் அளவீடுகளைப் பதிவுசெய்', 'Care note': 'பராமரிப்புக் குறிப்பு', 'Add photo': 'புகைப்படம் சேர்', 'My patients': 'என் நோயாளிகள்',
  'Vitals, notes & details': 'உடல் அளவீடுகள், குறிப்புகள் & விவரங்கள்', 'No patients yet': 'இன்னும் நோயாளிகள் இல்லை',
  'Patients appear here once the office schedules a visit with you.': 'அலுவலகம் உங்களுக்கு வருகையைத் திட்டமிட்டதும் நோயாளிகள் இங்கே தோன்றுவார்கள்.',
  'Details': 'விவரங்கள்', 'Note': 'குறிப்பு', 'Patient not found': 'நோயாளி கிடைக்கவில்லை', 'Tell office': 'அலுவலகத்துக்குச் சொல்',
  'Tap Add to record BP, sugar, SpO₂, pulse, temperature or weight.': 'BP, சர்க்கரை, SpO₂, நாடித்துடிப்பு, வெப்பநிலை அல்லது எடையைப் பதிவுசெய்ய சேர் என்பதைத் தட்டவும்.',
  'Care notes & photos': 'பராமரிப்புக் குறிப்புகள் & புகைப்படங்கள்', 'No notes yet': 'இன்னும் குறிப்புகள் இல்லை',
  'Add a care note or a photo — the family and office see it straight away.': 'பராமரிப்புக் குறிப்பு அல்லது புகைப்படத்தைச் சேர்க்கவும் — குடும்பத்தினரும் அலுவலகமும் உடனே பார்ப்பார்கள்.',
  'Choose a patient': 'நோயாளியைத் தேர்ந்தெடுக்கவும்', 'No patients yet — the office assigns them to you': 'இன்னும் நோயாளிகள் இல்லை — அலுவலகம் ஒதுக்கும்',
  'Note (optional)': 'குறிப்பு (விருப்பத்தேர்வு)', 'Shared with the family and the office as soon as you save.': 'சேமித்தவுடன் குடும்பத்தினருடனும் அலுவலகத்துடனும் பகிரப்படும்.',
  'Save vitals': 'அளவீடுகளைச் சேமி', 'Vitals saved — shared with family & office': 'அளவீடுகள் சேமிக்கப்பட்டன — குடும்பம் & அலுவலகத்துடன் பகிரப்பட்டன',
  'Observation': 'கவனிப்பு', 'Wound update': 'காய நிலை', 'Diet & activity': 'உணவு & செயல்பாடு', 'Family update': 'குடும்பத் தகவல்',
  'Save note': 'குறிப்பைச் சேமி', 'Write the note first': 'முதலில் குறிப்பை எழுதவும்', 'Note saved — shared with family & office': 'குறிப்பு சேமிக்கப்பட்டது — குடும்பம் & அலுவலகத்துடன் பகிரப்பட்டது',
  'Photo added to the patient record': 'நோயாளி பதிவில் புகைப்படம் சேர்க்கப்பட்டது', 'Tell the office': 'அலுவலகத்துக்குத் தெரிவிக்கவும்', 'How urgent?': 'எவ்வளவு அவசரம்?',
  'Urgent': 'அவசரம்', 'Needs attention': 'கவனம் தேவை', 'For information': 'தகவலுக்கு', 'What should the office know?': 'அலுவலகம் என்ன தெரிந்துகொள்ள வேண்டும்?',
  'Send to office': 'அலுவலகத்துக்கு அனுப்பு', 'Write a short message first': 'முதலில் சிறு செய்தியை எழுதவும்', 'Sent to the office': 'அலுவலகத்துக்கு அனுப்பப்பட்டது',
  'e.g. Taken after breakfast': 'எ.கா. காலை உணவுக்குப் பின் அளந்தது', 'What did you observe or do?': 'நீங்கள் என்ன கவனித்தீர்கள் அல்லது செய்தீர்கள்?',
  'e.g. Patient complains of dizziness since morning': 'எ.கா. காலை முதல் நோயாளிக்குத் தலைச்சுற்றல்',
  /* ---- notification banner & sounds ---- */
  'now': 'இப்போது', 'New message': 'புதிய செய்தி', 'Notification sound': 'அறிவிப்பு ஒலி', 'Play a sound for new messages and updates': 'புதிய செய்திகள் & தகவல்களுக்கு ஒலி எழுப்பு',
  'Message from the office': 'அலுவலகத்திலிருந்து செய்தி', 'New visit assigned': 'புதிய வருகை ஒதுக்கப்பட்டது', 'Careva+ update': 'Careva+ தகவல்',
  /* ---- staff schedule, timesheet, profile ---- */
  'Request leave': 'விடுப்பு கோரு', 'Availability': 'கிடைக்கும் நேரம்', 'Tell the office which days you can take extra visits': 'கூடுதல் வருகைகளை எந்த நாட்களில் ஏற்க முடியும் என அலுவலகத்துக்குத் தெரிவிக்கவும்',
  'This week': 'இந்த வாரம்', 'No visits this day': 'இந்த நாளில் வருகைகள் இல்லை', 'Marked available': 'கிடைக்கும் எனக் குறிக்கப்பட்டது', 'Marked unavailable — office notified': 'கிடைக்காது எனக் குறிக்கப்பட்டது — அலுவலகத்துக்குத் தெரிவிக்கப்பட்டது',
  'Casual leave': 'தற்செயல் விடுப்பு', 'Sick leave': 'மருத்துவ விடுப்பு', 'Emergency': 'அவசரம்', 'Pending approval': 'ஒப்புதல் நிலுவையில்', 'Leave request sent': 'விடுப்புக் கோரிக்கை அனுப்பப்பட்டது',
  'Care hours (GPS)': 'பராமரிப்பு நேரம் (GPS)', 'Travel (from GPS)': 'பயணம் (GPS மூலம்)', 'Hours are taken from GPS clock-in/out times': 'GPS வருகை/வெளியேறல் நேரங்களிலிருந்து மணிநேரம் கணக்கிடப்படுகிறது',
  'Submit timesheet': 'நேரத்தாளைச் சமர்ப்பி', 'All verified': 'அனைத்தும் சரிபார்க்கப்பட்டன', 'Hours by day': 'நாள்வாரியான மணிநேரம்', 'Timesheet submitted for approval': 'ஒப்புதலுக்கு நேரத்தாள் சமர்ப்பிக்கப்பட்டது',
  'Credentials & training': 'சான்றுகள் & பயிற்சி', 'Visits this month': 'இந்த மாத வருகைகள்', 'On-time arrivals': 'சரியான நேர வருகைகள்', 'Average family rating': 'சராசரி குடும்ப மதிப்பீடு',
  'Credentials': 'சான்றுகள்', 'Upload renewed certificate': 'புதுப்பித்த சான்றிதழைப் பதிவேற்று', 'Certificate uploaded for verification': 'சான்றிதழ் சரிபார்ப்புக்குப் பதிவேற்றப்பட்டது', 'Training': 'பயிற்சி',
  'Infection control & hand hygiene': 'தொற்றுக் கட்டுப்பாடு & கை சுகாதாரம்', 'Safe patient handling': 'நோயாளியைப் பாதுகாப்பாகக் கையாளுதல்', 'Fall prevention at home': 'வீட்டில் விழுதல் தடுப்பு', 'Dementia care basics': 'டிமென்ஷியா பராமரிப்பு அடிப்படைகள்',
  'Location & privacy': 'இருப்பிடம் & தனியுரிமை',
  'Your location is recorded only while you’re on shift, to verify visits (EVV), calculate mileage and keep you safe. It is never shared outside Careva+.': 'வருகைகளைச் சரிபார்க்க (EVV), பயணத் தூரத்தைக் கணக்கிட, உங்கள் பாதுகாப்புக்காக — நீங்கள் பணியில் இருக்கும்போது மட்டுமே உங்கள் இருப்பிடம் பதிவு செய்யப்படும். இது Careva+-க்கு வெளியே ஒருபோதும் பகிரப்படாது.',
  'GPS details': 'GPS விவரங்கள்', 'Account': 'கணக்கு', 'Call office': 'அலுவலகத்தை அழை', 'GPS & location': 'GPS & இருப்பிடம்',
  'Used for Electronic Visit Verification while you’re on shift': 'நீங்கள் பணியில் இருக்கும்போது மின்னணு வருகைச் சரிபார்ப்புக்குப் பயன்படுத்தப்படுகிறது',
  'Accuracy': 'துல்லியம்', 'Latitude': 'அட்சரேகை', 'Longitude': 'தீர்க்கரேகை', 'Geofence radius': 'எல்லை ஆரம்', 'Geofence': 'எல்லை', 'Shift distance': 'பணி நேரப் பயணத் தூரம்',
  'Live GPS connected. Keep Careva+ open on your screen while travelling so the office and family can follow your route.': 'நேரலை GPS இணைந்தது. அலுவலகமும் குடும்பத்தினரும் உங்கள் வழியைப் பின்தொடர, பயணத்தின்போது Careva+ செயலியைத் திரையில் திறந்தே வைத்திருங்கள்.',
  'Staff safety alert': 'ஊழியர் பாதுகாப்பு எச்சரிக்கை', 'Feeling unsafe, injured or facing an emergency?': 'பாதுகாப்பற்றதாக உணர்கிறீர்களா, காயமடைந்தீர்களா அல்லது அவசர நிலையா?',
  'Police 100': 'காவல்துறை 100', 'Alert sent': 'எச்சரிக்கை அனுப்பப்பட்டது',
  'The office can see your live location. Stay where you are safe — a supervisor is calling you now.': 'அலுவலகம் உங்கள் நேரலை இருப்பிடத்தைப் பார்க்க முடியும். பாதுகாப்பான இடத்தில் இருங்கள் — மேற்பார்வையாளர் இப்போது உங்களை அழைக்கிறார்.',

  /* ---- maps & location picker ---- */
  'No results — try a nearby landmark.': 'முடிவுகள் இல்லை — அருகிலுள்ள அடையாள இடத்தை முயலவும்.', 'Search needs an internet connection.': 'தேடலுக்கு இணைய இணைப்பு தேவை.',
  'Use my current location': 'என் தற்போதைய இருப்பிடத்தைப் பயன்படுத்து', 'Use this location': 'இந்த இருப்பிடத்தைப் பயன்படுத்து', 'Set location': 'இருப்பிடத்தை அமை',
  'Move the map so the pin sits on the front door': 'பின் முன் வாசலில் இருக்கும்படி வரைபடத்தை நகர்த்தவும்',
  'Location permission is blocked on this device': 'இந்தச் சாதனத்தில் இருப்பிட அனுமதி தடுக்கப்பட்டுள்ளது', 'Could not get a GPS fix': 'GPS பெற முடியவில்லை', 'Invalid location': 'தவறான இருப்பிடம்',
  'This device does not support GPS': 'இந்தச் சாதனம் GPS-ஐ ஆதரிக்கவில்லை', 'Location request timed out': 'இருப்பிடக் கோரிக்கைக்கான நேரம் முடிந்தது',
};

/* ---------- Tamil patterns (texts that include numbers, times or names) ---------- */
const TA_PAT = [
  /* numbers & units */
  [/^(\d+) min$/, '$1 நிமி'],
  [/^([\d.]+) h$/, '$1 மணி'],
  [/^(\d+) min ago$/, '$1 நிமி முன்'],
  [/^(\d+) h ago$/, '$1 மணி முன்'],
  [/^(\d+) d ago$/, '$1 நாள் முன்'],
  [/^(\d+) days$/, '$1 நாட்கள்'],
  [/^(\d+) days left$/, 'இன்னும் $1 நாட்கள்'],
  [/^\((\d+) days left\)$/, '(இன்னும் $1 நாட்கள்)'],
  [/^Last (\d+) days$/, 'கடந்த $1 நாட்கள்'],
  [/^Next (\d+) days$/, 'அடுத்த $1 நாட்கள்'],
  [/^(\d+) yrs$/, '$1 வயது'],
  [/^(\d+) yrs exp\.$/, '$1 ஆண்டு அனுபவம்'],
  [/^(\d+) yrs experience$/, '$1 ஆண்டு அனுபவம்'],
  [/^(\d+)F$/, '$1 பெ'],
  [/^(\d+)M$/, '$1 ஆ'],
  [/^(\d+) tablets?$/, '$1 மாத்திரை'],
  [/^(\d+) capsules?$/, '$1 கேப்சூல்'],
  [/^(\d+) stops?$/, '$1 நிறுத்தங்கள்'],
  [/^(\d+) visits?$/, '$1 வருகைகள்'],
  [/^(\d+) invoices?$/, '$1 பில்'],
  [/^(\d+) upcoming$/, '$1 வரவிருப்பவை'],
  [/^(\d+) completed$/, '$1 நிறைவு'],
  [/^(\d+) remaining$/, '$1 மீதம்'],
  [/^(\d+)\/(\d+) tasks$/, '$1/$2 பணிகள்'],
  [/^(\d+) of (\d+) done$/, '$2-இல் $1 முடிந்தது'],
  [/^(\d+) of (\d+) doses taken$/, '$2 அளவுகளில் $1 எடுக்கப்பட்டது'],
  [/^(\d+) of (\d+) doses taken today$/, 'இன்று $2 அளவுகளில் $1 எடுக்கப்பட்டது'],
  [/^(\d+) visits in the next (\d+) days$/, 'அடுத்த $2 நாட்களில் $1 வருகைகள்'],
  [/^~([\d.]+) km route$/, '~$1 கி.மீ வழித்தடம்'],
  [/^([\d.]+ ?k?m) by road$/, 'சாலை வழியாக $1'],
  [/^(\d+) min away$/, '$1 நிமிடத் தொலைவில்'],
  [/^([\d.]+ ?k?m) from your door$/, 'உங்கள் வாசலிலிருந்து $1'],
  [/^([\d.]+ ?k?m) from home$/, 'வீட்டிலிருந்து $1'],
  [/^([\d.]+ ?k?m) from patient’s home$/, 'நோயாளியின் வீட்டிலிருந்து $1'],
  [/^Geofence (\d+) m$/, 'எல்லை $1 மீ'],
  [/^Inside the (\d+) m geofence$/, '$1 மீ எல்லைக்குள்'],
  [/^(±[\d.]+ m) accuracy$/, '$1 துல்லியம்'],
  [/^Clock-in unlocks within (\d+) m of the home$/, 'வீட்டிலிருந்து $1 மீ-க்குள் வந்தால் வருகைப் பதிவு திறக்கும்'],
  [/^Clock in \(get within (\d+) m\)$/, 'வருகை பதிவு ($1 மீ-க்குள் வரவும்)'],
  [/^([\d.]+ ?k?m) away — move within (\d+) m$/, '$1 தொலைவில் — $2 மீ-க்குள் வரவும்'],
  [/^GPS live \((.+)\)$/, 'GPS நேரலை ($1)'],
  [/^ETA (\d+) min$/, '$1 நிமிடத்தில் வருவார்'],
  [/^expected around (.+)$/, 'சுமார் $1-க்கு வருவார்'],
  [/^On duty since (.+)$/, '$1 முதல் பணியில்'],
  [/^Checked in at (.+)$/, '$1-க்கு வருகை பதிவானது'],
  [/^Clocked in at (.+)$/, '$1-க்கு வருகை பதிவானது'],
  [/^Active since (.+)$/, '$1 முதல் செயலில்'],
  [/^due (.+)$/, 'கடைசி நாள் $1'],
  [/^next review (.+)$/, 'அடுத்த மறுஆய்வு $1'],
  [/^e\.g\. (.+)$/, 'எ.கா. $1'],
  [/^Call ([\d +]+)$/, '$1-ஐ அழை'],
  [/^Blood group (.+)$/, 'இரத்த வகை $1'],
  [/^Sugar (.+)$/, 'சர்க்கரை $1'],
  [/^Pulse (\d+)$/, 'நாடித்துடிப்பு $1'],
  [/^Ambulance: (.+)$/, 'ஆம்புலன்ஸ்: $1'],
  [/^Mileage claim @ (₹[\d.]+)\/km$/, 'பயணப்படிக் கோரிக்கை @ $1/கி.மீ'],
  [/^Pay (₹[\d,]+) with a UPI app$/, '$1-ஐ UPI செயலி மூலம் செலுத்துங்கள்'],
  [/^Ref (.+) — awaiting office confirmation$/, 'குறிப்பு $1 — அலுவலக உறுதிப்படுத்தலுக்குக் காத்திருக்கிறது'],
  [/^Upload failed: (.+)$/, 'பதிவேற்றம் தோல்வி: $1'],
  [/^for (.+)$/, '$1-க்காக'],
  [/^(High|Medium|Low) risk$/, (m, a) => ({High: 'அதிக', Medium: 'நடுத்தர', Low: 'குறைந்த'})[a] + ' அபாயம்'],
  [/^from (₹[\d,]+)\/(.+)$/, (m, a, b) => `${a}/${tr(b)} முதல்`],
  [/^(.+?) (₹[\d,]+)\/(visit|session|4-hr shift)$/, (m, a, b, c) => `${tr(a)} ${b}/${tr(c)}`],
  [/^No (.+) readings yet$/, (m, a) => `${({'spo₂': 'SpO₂', pulse: 'நாடித்துடிப்பு', temperature: 'வெப்பநிலை', weight: 'எடை', sugar: 'சர்க்கரை', 'blood sugar': 'இரத்தச் சர்க்கரை', 'blood pressure': 'இரத்த அழுத்த', bp: 'BP'})[a.toLowerCase()] || a} அளவீடுகள் இன்னும் இல்லை`],
  [/^(.+) marked as taken$/, '$1 எடுக்கப்பட்டதாகக் குறிக்கப்பட்டது'],
  [/^Your hours and ([\d.]+) km will be added to this week’s timesheet\.$/, 'உங்கள் மணிநேரமும் $1 கி.மீ பயணமும் இந்த வார நேரத்தாளில் சேர்க்கப்படும்.'],

  [/^Photo — (.+)$/, 'புகைப்படம் — $1'],
  [/^Message from (.+)$/, '$1-இடமிருந்து செய்தி'],
  [/^(.+) recorded new vitals\. See them in My health\.$/, '$1 புதிய உடல் அளவீடுகளைப் பதிவு செய்தார். என் ஆரோக்கியம் பகுதியில் பார்க்கலாம்.'],
  [/^(.+) added a care note\. See it in My health → Reports\.$/, '$1 பராமரிப்புக் குறிப்பைச் சேர்த்தார். என் ஆரோக்கியம் → அறிக்கைகள் பகுதியில் பார்க்கலாம்.'],
  /* people & places */
  [/^(.+) is on the way$/, '$1 வழியில் இருக்கிறார்'],
  [/^(.+) is at your home$/, '$1 உங்கள் வீட்டில் இருக்கிறார்'],
  [/^(.+) \(patient\)$/, '$1 (நோயாளி)'],
  [/^Signed by (.+)$/, (m, a) => `கையொப்பமிட்டவர்: ${tr(a)}`],
  [/^\((.+)\) with the home location\.$/, (m, a) => `(${tr(a)})-க்கும் வீட்டின் இருப்பிடத்துடன் எச்சரிக்கை அனுப்பப்படும்.`],
  [/^(.+) \(([A-Z][a-z-]+)\)$/, (m, a, b) => Object.prototype.hasOwnProperty.call(TA, b) ? `${a} (${TA[b]})` : null],
  [/^The Careva\+ care team and (.+) have been alerted with your home location\. A coordinator will call you within 2 minutes\.$/, 'Careva+ பராமரிப்புக் குழுவுக்கும் $1-க்கும் உங்கள் வீட்டு இருப்பிடத்துடன் எச்சரிக்கை அனுப்பப்பட்டது. 2 நிமிடங்களுக்குள் ஒருங்கிணைப்பாளர் உங்களை அழைப்பார்.'],
  [/^Sends your live GPS position \((.+)\) to the Careva\+ office\. A supervisor will call you immediately\.$/, 'உங்கள் நேரலை GPS இருப்பிடம் ($1) Careva+ அலுவலகத்துக்கு அனுப்பப்படும். மேற்பார்வையாளர் உடனே உங்களை அழைப்பார்.'],
  [/^(.+) on (.+) at (.+) with (.+)\. Cancellations within 2 hours of the visit may be charged\.$/, (m, a, b, c, d) => `${tr(a)} — ${tr(b)} ${c}, ${d}. வருகைக்கு 2 மணி நேரத்துக்குள் ரத்து செய்தால் கட்டணம் விதிக்கப்படலாம்.`],

  /* notifications sent to families (stored in English, shown in Tamil) */
  [/^Visit completed by (.+)\. The visit summary is ready in the app\.$/, '$1 வருகையை நிறைவு செய்தார். வருகைச் சுருக்கம் செயலியில் தயார்.'],
  [/^(.+) checked in at your home at (.+) \(GPS verified\)\.$/, '$1 உங்கள் வீட்டில் $2-க்கு வருகையைப் பதிவு செய்தார் (GPS சரிபார்க்கப்பட்டது).'],
  [/^(.+) has started the journey to your home\. Track live in the Careva\+ app\.$/, '$1 உங்கள் வீட்டுக்குப் புறப்பட்டுவிட்டார். Careva+ செயலியில் நேரலையில் கண்காணிக்கலாம்.'],
  [/^New visit scheduled: (.+) on (.+) at (.+) with (.+)\.$/, (m, a, b, c, d) => `புதிய வருகை திட்டமிடப்பட்டது: ${tr(a)} — ${tr(b)} ${c}, ${d} உடன்.`],
  [/^Your (.+) visit on (.+) at (.+) is confirmed with (.+)\.$/, (m, a, b, c, d) => `உங்கள் ${tr(a)} வருகை ${tr(b)} ${c}-க்கு ${d} உடன் உறுதி செய்யப்பட்டது.`],
  [/^Sorry, we couldn’t confirm (.+?) (\d{1,2}:\d{2} [AP]M)\. Please choose another slot\.$/, (m, a, b) => `மன்னிக்கவும், ${tr(a)} ${b} நேரத்தை உறுதி செய்ய முடியவில்லை. வேறு நேரத்தைத் தேர்ந்தெடுக்கவும்.`],
  [/^Your visit is moved to (.+) at (.+)\.$/, (m, a, b) => `உங்கள் வருகை ${tr(a)} ${b}-க்கு மாற்றப்பட்டது.`],
  [/^Your reschedule request could not be accommodated\. The visit stays on (.+) at (.+)\.$/, (m, a, b) => `நேர மாற்றக் கோரிக்கையை ஏற்க முடியவில்லை. வருகை ${tr(a)} ${b}-க்கே தொடரும்.`],
  [/^Your (.+) visit will now be with (.+)\.$/, (m, a, b) => `உங்கள் ${tr(a)} வருகை இனி ${b} உடன் நடைபெறும்.`],
  [/^Your visit on (.+) at (.+) was cancelled by the office\.$/, (m, a, b) => `${tr(a)} ${b} வருகையை அலுவலகம் ரத்து செய்தது.`],
  [/^Payment received for invoice (.+) \((.+)\)\. Thank you!$/, 'பில் $1-க்கான கட்டணம் ($2) பெறப்பட்டது. நன்றி!'],
  [/^Reminder: invoice (.+) for (.+) is due on (.+)\.$/, 'நினைவூட்டல்: பில் $1 ($2) செலுத்த வேண்டிய நாள் $3.'],

  /* messages sent to staff by the office */
  [/^New visit: (.+), (.+?) (\d{1,2}:\d{2} [AP]M)( \(weekly × 4\))?\.$/, (m, a, b, c, d) => `புதிய வருகை: ${a}, ${tr(b)} ${c}${d ? ' (வாரந்தோறும் × 4)' : ''}.`],
  [/^New visit assigned: (.+) — (.+), (.+?) (\d{1,2}:\d{2} [AP]M)\.$/, (m, a, b, c, d) => `புதிய வருகை ஒதுக்கப்பட்டது: ${a} — ${tr(b)}, ${tr(c)} ${d}.`],
  [/^Visit moved: (.+) → (.+?) (\d{1,2}:\d{2} [AP]M)\.$/, (m, a, b, c) => `வருகை மாற்றப்பட்டது: ${a} → ${tr(b)} ${c}.`],
  [/^Visit assigned to you: (.+), (.+?) (\d{1,2}:\d{2} [AP]M)\.$/, (m, a, b, c) => `உங்களுக்கு ஒதுக்கப்பட்ட வருகை: ${a}, ${tr(b)} ${c}.`],
  [/^EVV for (.+) on (.+) was rejected\. Please contact your supervisor\.$/, (m, a, b) => `${tr(b)} ${a} வருகையின் EVV நிராகரிக்கப்பட்டது. உங்கள் மேற்பார்வையாளரைத் தொடர்பு கொள்ளவும்.`],
];
