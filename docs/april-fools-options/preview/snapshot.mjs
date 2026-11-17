// Review-only. Opens the real Home with the click tests' stand-in Firebase and made-up people, then saves the drawn
// page (no scripts) and a screenshot, so the April Fools previews can break the book's own elements.
//   CHROME=<chrome> FONTS=<folder> node docs/april-fools-options/preview/snapshot.mjs <out folder> [width] [height]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const W = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\/$/, '');
const require = createRequire(W + '/tests/'), fs = require('fs');
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8771/';
const L = require(W + '/tests/lib');
const server = require(W + '/tests/serve'); await new Promise(r => server.listen(8771, '127.0.0.1', r));
const OUT = process.argv[2], w = +(process.argv[3] || 390), h = +(process.argv[4] || 844); fs.mkdirSync(OUT, { recursive: true });
setTimeout(() => { console.log('HARD TIMEOUT'); process.exit(3); }, 120000);
const day = L.ymd(new Date(L.NOW)), key = p => ['kitchens', L.PIN].concat(p).join('/');
const cfg = L.seed()[key(['config', 'main'])];
cfg.kitSecs = [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }, { id: 'fryers', name: 'Fryers' }];
cfg.kitShifts = [{ id: 'lunch', name: 'Lunch', from: 600, to: 1260 }];
const extra = { [key(['config', 'main'])]: cfg, [key(['team', day])]: { day, on: [{ id: 'ann', sh: 'lunch', sec: 'pans' }, { id: 'sam', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'lunch', sec: 'fryers' }], br: [], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' } };
// The book's own fonts when FONTS points at a folder of them (barlow-400.woff2 and so on), else the test fallbacks.
const FONTS = [['Barlow', 400, 'barlow-400.woff2'], ['Barlow', 600, 'barlow-600.woff2'], ['Barlow', 700, 'barlow-700.woff2'], ['Barlow Condensed', 700, 'barlow-condensed-700.woff2'], ['Caveat', 700, 'caveat-700.woff2']];
const fontCss = FONTS.map(([f, w], i) => `@font-face{font-family:'${f}';font-weight:${w};font-style:normal;src:url(https://fonts.gstatic.com/local-${i}.woff2) format('woff2')}`).join('\n');
const b = await L.start(), nc = b.newContext.bind(b);
b.newContext = async o => { const c = await nc(o); if (process.env.FONTS) { const np = c.newPage.bind(c); c.newPage = async () => { await c.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: fontCss })); await c.route(/fonts\.gstatic\.com/, r => { const i = Number((r.request().url().match(/local-(\d)/) || [])[1]); return FONTS[i] ? r.fulfill({ status: 200, contentType: 'font/woff2', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(require('path').join(process.env.FONTS, FONTS[i][2])) }) : r.fulfill({ status: 404, body: '' }); }); return np(); }; } return c; };
try {
  const p = await L.open(b, '#/', { who: 'ann', width: w, height: h, wait: 1600, extra, settings: { shared: true } });
  await p.evaluate(() => document.fonts.ready);
  await L.waitFor(p, () => !!document.querySelector('.mascot[data-state]'), null, 8000).catch(() => {});
  await L.settle(p, 4500);
  await p.screenshot({ path: `${OUT}/home-${w}.png` });
  const snap = await p.evaluate(() => {
    document.querySelectorAll('script,noscript,iframe').forEach(e => e.remove());
    const links = [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.getAttribute('href'));
    return { html: document.documentElement.outerHTML, links, cls: document.documentElement.className, body: document.body.className };
  });
  fs.writeFileSync(`${OUT}/home-${w}.json`, JSON.stringify(snap));
  console.log('links', snap.links, 'errors', p.errors);
} catch (e) { console.log('ERR', String(e).slice(0, 800)); }
finally { await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]); server.close(); process.exit(0); }
