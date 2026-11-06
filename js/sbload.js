/* Careva+ — loads the Supabase library without ever blocking the app.
   1. If a copy is saved on this phone, it starts from that copy straight away (works on slow or blocked networks).
   2. Otherwise it tries several download sites, each with a time limit.
   3. A good download is saved on the phone for next time; the saved copy is refreshed quietly in the background.
   window.SB_READY resolves to true when window.supabase is ready, false if it could not be loaded. */
(function(){
  var KEY = 'careva_sbjs_v2', KEY_AT = 'careva_sbjs_at';
  var URLS = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
    'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js',
    'https://fastly.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
    'https://gcore.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js'
  ];
  function ok(){ return !!(window.supabase && window.supabase.createClient); }
  function run(code){
    try{ var s = document.createElement('script'); s.text = code + '\n//# sourceURL=supabase.js'; document.head.appendChild(s); s.remove(); }catch(e){}
    return ok();
  }
  function get(url, ms){
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function(){ ctl && ctl.abort(); }, ms);
    return fetch(url, {signal: ctl ? ctl.signal : undefined, credentials:'omit'}).then(function(r){
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function(code){
      clearTimeout(t);
      if(code.length < 20000 || code.indexOf('createClient') < 0) throw new Error('bad file');
      return code;
    }, function(e){ clearTimeout(t); throw e; });
  }
  function save(code){ try{ localStorage.setItem(KEY, code); localStorage.setItem(KEY_AT, String(Date.now())); }catch(e){} }
  function download(ms){
    var i = 0;
    return new Promise(function(resolve){
      (function next(){
        if(i >= URLS.length) return resolve(null);
        get(URLS[i++], ms).then(resolve, next);
      })();
    });
  }
  // Normal case: the library ships inside the app (vendor/supabase.js), so nothing needs downloading.
  if(ok()){ window.SB_SOURCE = 'bundled'; window.SB_READY = Promise.resolve(true); return; }
  var cached = null; try{ cached = localStorage.getItem(KEY); }catch(e){}
  if(cached && run(cached)){
    window.SB_SOURCE = 'saved';
    window.SB_READY = Promise.resolve(true);
    // Refresh the saved copy at most once a day, after the app has started.
    var at = 0; try{ at = +localStorage.getItem(KEY_AT) || 0; }catch(e){}
    if(Date.now() - at > 864e5) setTimeout(function(){ download(20000).then(function(code){ if(code) save(code); }); }, 15000);
    return;
  }
  window.SB_READY = download(9000).then(function(code){
    if(code && run(code)){ save(code); window.SB_SOURCE = 'download'; return true; }
    return false;
  });
})();
