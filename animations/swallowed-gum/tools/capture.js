const {chromium}=require('/opt/node-tools/node_modules/playwright');
const fs=require('fs'),path=require('path');
const S=process.env.S, V=S+'/vendor';
const [,,mode,...args]=process.argv;
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:540,height:960},deviceScaleFactor:2});
  p.on('console',m=>{if(m.type()==='error')console.log('console:',m.text())});
  p.on('pageerror',e=>console.log('pageerror:',e.message));p.on('requestfailed',q=>console.log('reqfail',q.url()));
  await p.route(/^https?:\/\//,async r=>{const u=r.request().url();
    const m=u.match(/three@0\.160\.0\/(.*)$/);if(m)return r.fulfill({path:V+'/package/'+m[1],contentType:'text/javascript'});
    if(u.startsWith('http://film.local/')){const f=S+'/gum/'+u.split('film.local/')[1].split('?')[0];const ext=path.extname(f);return r.fulfill({path:f,contentType:{'.html':'text/html','.glb':'model/gltf-binary','.json':'application/json','.jpg':'image/jpeg','.hdr':'application/octet-stream'}[ext]||'application/octet-stream'});}
    if(u.includes('fonts.googleapis'))return r.fulfill({body:fs.readFileSync(V+'/fonts.css','utf8'),contentType:'text/css'});
    if(u.includes('fonts.gstatic'))return r.fulfill({path:V+'/'+path.basename(u),contentType:'font/woff2'});
    return r.abort();});
  await p.goto('http://film.local/index.html?capture=1'+(mode==='capframes'?'&layer=cap':''));
  const t0=Date.now();await p.waitForFunction(()=>window.__ready,null,{timeout:60000});console.log('ready ms',Date.now()-t0);await p.evaluate(()=>document.fonts.ready);
  const st=await p.$('#stage');
  if(mode==='stills'){for(const t of args){if(t.includes('=')){const[k,v]=t.split('=');await p.evaluate(([k,v])=>__set(k,+v),[k,v]);continue;}await p.evaluate(t=>__render(+t),t);await st.screenshot({path:`${S}/g_${t}.jpg`,quality:80,type:'jpeg'});}}
  if(mode==='frames'){const [out,a,bb,fps]=args;fs.mkdirSync(out,{recursive:true});
    for(let f=+a;f<+bb;f++){await p.evaluate(t=>__render(t),f/ +fps);await st.screenshot({path:`${out}/f${String(f).padStart(4,'0')}.jpg`,quality:92,type:'jpeg'});if(f%50==0)console.log('frame',f);}}
  if(mode==='capframes'){const [out,a,bb,fps]=args;fs.mkdirSync(out,{recursive:true});for(let f=+a;f<+bb;f++){await p.evaluate(t=>__render(t),f/ +fps);await st.screenshot({path:`${out}/c${String(f).padStart(4,'0')}.png`,omitBackground:true});}}
  if(mode==='audio'){const b64=await p.evaluate(()=>__renderAudio());fs.writeFileSync(args[0],Buffer.from(b64,'base64'));}
  await b.close();
})();
