// Builds two HyperFrames projects from sting.template: wide/ (1920x1080) and reel/ (1080x1920).
// Each gets its own index.html (one root composition per project) and a copy of assets/.
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
const here = (p) => new URL(p, import.meta.url);
const src = readFileSync(here('./sting.template'), 'utf8');
const title = '<span class="w">Robotic</span><span class="w">UV-C</span><br/><span class="w g">disinfection</span>';
const fmt = {
  wide: { W: 1920, H: 1080, REEL: 'false', GX: 30, KS: 28, TS: 108, LW: 560, TITLE: title },
  reel: { W: 1080, H: 1920, REEL: 'true', GX: 50, KS: 30, TS: 104, LW: 560, TITLE: title },
};
for (const [dir, v] of Object.entries(fmt)) {
  let out = src;
  for (const [k, val] of Object.entries(v)) out = out.replaceAll(`__${k}__`, String(val));
  out = out.replace('<html lang="en">', `<html lang="en" data-resolution="${v.H > v.W ? 'portrait' : 'landscape'}">`);
  mkdirSync(here(`./${dir}/`), { recursive: true });
  cpSync(here('./assets/'), here(`./${dir}/assets/`), { recursive: true });
  cpSync(here('./hyperframes.json'), here(`./${dir}/hyperframes.json`));
  writeFileSync(here(`./${dir}/meta.json`), JSON.stringify({ id: `spotless-sting-${dir}`, name: `Spotless sting (${dir})` }, null, 2));
  writeFileSync(here(`./${dir}/index.html`), out);
  console.log('built', dir);
}
