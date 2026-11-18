// Render careva-explainer.html to JPEG frames with headless Chromium.
// usage: node render.js <outDir> [fps=30] [workers=4] [t0] [t1]
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs'); const serve = require('./serve');
const [outDir, fpsA, wA, t0A, t1A] = process.argv.slice(2);
const fps = +fpsA || 30, workers = +wA || 4;
(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const srv = await serve(); const url = srv.url;
  const probe = await browser.newPage(); await probe.goto(url);
  const D = await probe.evaluate(() => window.DURATION); await probe.close();
  const t0 = t0A ? +t0A : 0, t1 = t1A ? +t1A : D;
  const frames = []; for (let i = Math.round(t0 * fps); i < Math.round(t1 * fps); i++) frames.push(i);
  const chunk = Math.ceil(frames.length / workers); let done = 0;
  await Promise.all([...Array(workers)].map(async (_, w) => {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(url); await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].every(i => i.complete));
    for (const f of frames.slice(w * chunk, (w + 1) * chunk)) {
      await page.evaluate(t => window.seek(t), f / fps);
      await page.screenshot({ path: path.join(outDir, `f_${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 94 });
      if (++done % 150 === 0) console.log(`${done}/${frames.length}`);
    }
  }));
  await browser.close(); srv.close(); console.log('done', frames.length);
})();
