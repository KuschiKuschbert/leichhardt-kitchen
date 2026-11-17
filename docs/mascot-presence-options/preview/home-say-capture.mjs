// Review-only. Home with the welcome said by the mascot (home-say.js) against today's Home, at four widths, with a
// short and a long name, in the book's own fonts when FONTS points at a folder of them (barlow-400.woff2 and so on),
// on the real book with the click tests' stand-in Firebase and made-up people.
//   CHROME=<chrome> FONTS=<folder> node ../docs/mascot-presence-options/preview/home-say-capture.mjs <out folder>
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const D = fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, ''), W = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\/$/, '');
const require = createRequire(W + '/tests/'), fs = require('fs'), path = require('path');
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8770/';
const L = require(W + '/tests/lib');
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const CSS = fs.readFileSync(D + '/home-say.css', 'utf8'), JS = fs.readFileSync(D + '/home-say.js', 'utf8');
const FONTS = [['Barlow', 400, 'barlow-400.woff2'], ['Barlow', 600, 'barlow-600.woff2'], ['Barlow', 700, 'barlow-700.woff2'], ['Barlow Condensed', 700, 'barlow-condensed-700.woff2'], ['Caveat', 700, 'caveat-700.woff2']];
const fontCss = FONTS.map(([f, w], i) => `@font-face{font-family:'${f}';font-weight:${w};font-style:normal;src:url(https://fonts.gstatic.com/local-${i}.woff2) format('woff2')}`).join('\n');
const b = await L.start(), nc = b.newContext.bind(b);
b.newContext = async o => { const c = await nc(o); if (process.env.FONTS) { const np = c.newPage.bind(c); c.newPage = async () => { await c.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: fontCss })); await c.route(/fonts\.gstatic\.com/, r => { const i = Number((r.request().url().match(/local-(\d)/) || [])[1]); return FONTS[i] ? r.fulfill({ status: 200, contentType: 'font/woff2', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(path.join(process.env.FONTS, FONTS[i][2])) }) : r.fulfill({ status: 404, body: '' }); }); return np(); }; } return c; };
setTimeout(() => { console.log('HARD TIMEOUT'); process.exit(3); }, 560000);
const day = L.ymd(new Date(L.NOW)), key = p => ['kitchens', L.PIN].concat(p).join('/');
function extra(name) {
  const cfg = L.seed()[key(['config', 'main'])];
  cfg.people = cfg.people.map(p => p.id === 'ann' ? Object.assign({}, p, { name }) : p);
  cfg.kitSecs = [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }, { id: 'fryers', name: 'Fryers' }];
  cfg.kitShifts = [{ id: 'lunch', name: 'Lunch', from: 600, to: 1260 }];
  return { [key(['config', 'main'])]: cfg, [key(['team', day])]: { day, on: [{ id: 'ann', sh: 'lunch', sec: 'pans' }, { id: 'sam', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'lunch', sec: 'fryers' }], br: [], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' } };
}
const res = {};
try {
  for (const [w, h] of [[1920, 1080], [1280, 900], [768, 1024], [390, 844]]) for (const [nm, name] of [['short', 'Ann'], ['long', 'Maximiliana Featherstonehaugh-Ramírez']]) for (const on of [false, true]) {
    const p = await L.open(b, '#/', { who: 'ann', width: w, height: h, wait: 1600, extra: extra(name), settings: { shared: true } });
    await p.evaluate(() => document.fonts.ready);
    await L.waitFor(p, () => !!document.querySelector('.mascot[data-state]'), null, 8000).catch(() => {});
    await p.addStyleTag({ content: CSS }); await p.evaluate(JS); await p.evaluate(x => window.LK_SAY.set(x), on); await L.settle(p, 700);
    const tag = `${on ? 'say' : 'today'}-${nm}-${w}x${h}`;
    await p.screenshot({ path: `${OUT}/${tag}.png` });
    res[tag] = await p.evaluate(() => { const q = s => { const e = document.querySelector(s), r = e && e.getBoundingClientRect(); return r && r.width ? [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] : null; };
      return { words: document.querySelector('#rtitle')?.textContent, heading: q('#rtitle'), date: q('.wall-date'), mascot: q('.mascot:not([hidden])'), spot: document.querySelector('.mascot')?.getAttribute('data-spot'), day: q('#hm-day'), font: getComputedStyle(document.querySelector('#rtitle')).fontFamily.split(',')[0] + ' ' + getComputedStyle(document.querySelector('#rtitle')).fontSize, scroll: document.documentElement.scrollWidth - innerWidth }; });
    res[tag].errs = p.errors.filter(e => !/Failed to load resource/.test(e));
    console.log(tag, JSON.stringify(res[tag]));
    await p.context().close();
  }
} catch (e) { console.log('ERR', String(e).slice(0, 600)); }
finally { fs.writeFileSync(`${OUT}/walk-home-say.json`, JSON.stringify(res)); await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]); process.exit(0); }
