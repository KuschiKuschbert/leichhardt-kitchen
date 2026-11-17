// Review-only. Plays each design on the real Home (click-test stand-in, made-up people) at tablet and laptop widths,
// quick (15 s), and saves frames, script errors and sideways scroll. The book's own Home, not the frozen 390 copy.
//   CHROME=<chrome> FONTS=<folder> node docs/april-fools-options/preview/widths.mjs <out folder> [A1,B1,...] [768x1024,1280x900]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const HERE = fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, ''), W = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\/$/, '');
const require = createRequire(W + '/tests/'), fs = require('fs'), path = require('path');
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8772/';
const L = require(W + '/tests/lib');
const server = require(W + '/tests/serve'); await new Promise(r => server.listen(8772, '127.0.0.1', r));
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const WHICH = (process.argv[3] || 'ABCDEFGHIJKL'.split('').map(d => d + '1').join(',')).split(',');
const SIZES = (process.argv[4] || '768x1024,1280x900').split(',').map(s => s.split('x').map(Number));
const CSS = fs.readFileSync(HERE + '/fools.css', 'utf8'), JS = fs.readFileSync(HERE + '/fools.js', 'utf8');
const FONTS = [['Barlow', 400, 'barlow-400.woff2'], ['Barlow', 600, 'barlow-600.woff2'], ['Barlow', 700, 'barlow-700.woff2'], ['Barlow Condensed', 700, 'barlow-condensed-700.woff2'], ['Caveat', 700, 'caveat-700.woff2']];
const fontCss = FONTS.map(([f, w], i) => `@font-face{font-family:'${f}';font-weight:${w};font-style:normal;src:url(https://fonts.gstatic.com/local-${i}.woff2) format('woff2')}`).join('\n');
const b = await L.start(), nc = b.newContext.bind(b);
b.newContext = async o => { const c = await nc(o); if (process.env.FONTS) { const np = c.newPage.bind(c); c.newPage = async () => { await c.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: fontCss })); await c.route(/fonts\.gstatic\.com/, r => { const i = Number((r.request().url().match(/local-(\d)/) || [])[1]); return FONTS[i] ? r.fulfill({ status: 200, contentType: 'font/woff2', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(path.join(process.env.FONTS, FONTS[i][2])) }) : r.fulfill({ status: 404, body: '' }); }); return np(); }; } return c; };
setTimeout(() => { console.log('HARD TIMEOUT'); process.exit(3); }, 1700000);
const day = L.ymd(new Date(L.NOW)), key = p => ['kitchens', L.PIN].concat(p).join('/');
const cfg = L.seed()[key(['config', 'main'])];
cfg.kitSecs = [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }, { id: 'fryers', name: 'Fryers' }];
cfg.kitShifts = [{ id: 'lunch', name: 'Lunch', from: 600, to: 1260 }];
const extra = { [key(['config', 'main'])]: cfg, [key(['team', day])]: { day, on: [{ id: 'ann', sh: 'lunch', sec: 'pans' }, { id: 'sam', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'lunch', sec: 'fryers' }], br: [], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' } };
const res = {};
try {
  for (const [w, h] of SIZES) for (const j of WHICH) {
    const p = await L.open(b, '#/', { who: 'ann', width: w, height: h, wait: 1600, extra, settings: { shared: true } });
    await p.evaluate(() => document.fonts.ready);
    await L.waitFor(p, () => !!document.querySelector('.mascot[data-state]'), null, 8000).catch(() => {});
    await L.settle(p, 1500);
    await p.addStyleTag({ content: CSS }); await p.evaluate(JS);
    const errs0 = p.errors.length;
    await p.evaluate(o => window.FOOLS.play(o.d, { name: 'Ann', version: o.v, quick: true }), { d: j[0], v: +j[1] });
    const shots = [], scroll = [];
    for (const t of [9, 23, 35, 47, 56]) {
      await L.settle(p, 0); await new Promise(r => setTimeout(r, t * 250 - (shots.length ? [9, 23, 35, 47, 56][shots.length - 1] * 250 : 0)));
      const f = `${j}-${w}-${String(t).padStart(2, '0')}.png`; await p.screenshot({ path: path.join(OUT, f) }); shots.push(f);
      scroll.push(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth));
    }
    await new Promise(r => setTimeout(r, 2200));
    const after = await p.evaluate(() => ({ layer: !!document.querySelector('.fl-layer'), card: !!document.querySelector('.fl-card'), under: document.getElementById('app').classList.contains('fl-under') }));
    res[`${j}-${w}`] = { errs: p.errors.slice(errs0).filter(e => !/Failed to load resource/.test(e)), scroll: Math.max(...scroll), after };
    console.log(`${j}-${w}`, JSON.stringify(res[`${j}-${w}`]));
    await p.context().close();
  }
} catch (e) { console.log('ERR', String(e).slice(0, 600)); }
finally { fs.writeFileSync(path.join(OUT, 'widths.json'), JSON.stringify(res, null, 1)); await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]); server.close(); process.exit(0); }
