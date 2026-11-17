// Renders index.html to PNG frames by seeking the timeline deterministically.
//   node render.js frames <outDir> [fps] [workers]     -> full sequence
//   node render.js stills <outDir> t1 t2 ...           -> individual frames for review
//   node render.js cues   <outFile>                     -> sound cue points (JSON)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [mode = 'frames', out = 'frames', ...rest] = process.argv.slice(2);
const URL = 'file://' + path.resolve(__dirname, 'index.html') + '?render';

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(URL);
  await page.evaluate(() => window.ready);
  page.cdp = await page.context().newCDPSession(page);
  return page;
}

// Lossless PNG via CDP with Chromium's fast encoder (~3x quicker than page.screenshot)
async function shoot(page, file) {
  const { data } = await page.cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
}

(async () => {
  const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--allow-file-access-from-files'] });
  if (mode === 'cues') {
    const page = await openPage(browser);
    fs.writeFileSync(out, JSON.stringify(await page.evaluate(() => window.CUES), null, 2));
  } else if (mode === 'stills') {
    fs.mkdirSync(out, { recursive: true });
    const page = await openPage(browser);
    for (const t of rest.map(Number)) {
      await page.evaluate(t => window.seek(t), t);
      await shoot(page, path.join(out, `still_${t.toFixed(2)}.png`));
    }
  } else {
    fs.mkdirSync(out, { recursive: true });
    const fps = Number(rest[0] || 30), workers = Number(rest[1] || 4);
    const total = Math.round(fps * 30);
    let done = 0;
    await Promise.all([...Array(workers)].map(async (_, w) => {
      const page = await openPage(browser);
      for (let i = w; i < total; i += workers) {
        await page.evaluate(t => window.seek(t), i / fps);
        await shoot(page, path.join(out, `f_${String(i).padStart(5, '0')}.png`));
        if (++done % 60 === 0) console.log(`${done}/${total}`);
      }
    }));
  }
  await browser.close();
})();
