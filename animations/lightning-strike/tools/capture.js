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
    if(u.includes('fonts.googleapis'))return r.fulfill({body:fs.readFileSync(V+'/fonts.css','utf8'),contentType:'text/css'});
    if(u.includes('fonts.gstatic'))return r.fulfill({path:V+'/'+path.basename(u),contentType:'font/woff2'});
    return r.abort();});
  await p.goto('file:///home/user/Carevaplus-crm/animations/lightning-strike/index.html?capture=1');
  const t0=Date.now();await p.waitForFunction(()=>window.__ready,null,{timeout:180000});console.log('ready ms',Date.now()-t0);await p.evaluate(()=>document.fonts.ready);
  const st=await p.$('#stage');
  if(mode==='stills'){for(const t of args){await p.evaluate(t=>__render(+t),t);await st.screenshot({path:`${S}/still_${t}.jpg`,quality:80,type:'jpeg'});}}
  if(mode==='frames'){const [out,a,bb,fps]=args;fs.mkdirSync(out,{recursive:true});
    for(let f=+a;f<+bb;f++){await p.evaluate(t=>__render(t),f/ +fps);await st.screenshot({path:`${out}/f${String(f).padStart(4,'0')}.jpg`,quality:92,type:'jpeg'});if(f%50==0)console.log('frame',f);}}
  if(mode==='audio'){const b64=await p.evaluate(()=>__renderAudio());fs.writeFileSync(args[0],Buffer.from(b64,'base64'));}
  await b.close();
})();
