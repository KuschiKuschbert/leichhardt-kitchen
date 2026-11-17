// Review-only. Home with the mascot's speech bubble (home-bubble.js) at four widths, on the real book with the
// click tests' stand-in Firebase and made-up people. The stand-in fonts are used, not Barlow.
//   cd tests && node -e "require('./serve').listen(8770,'127.0.0.1')" &
//   CHROME=<chrome> node ../docs/mascot-presence-options/preview/home-capture.mjs <out folder>
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const D = fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, ''), W = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\/$/, '');
const require = createRequire(W + '/tests/'), fs = require('fs');
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8770/';
const L = require(W + '/tests/lib');
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const CSS = fs.readFileSync(D + '/home-bubble.css', 'utf8'), JS = fs.readFileSync(D + '/home-bubble.js', 'utf8');
const b = await L.start(); setTimeout(() => { console.log('HARD TIMEOUT'); process.exit(3); }, 500000);
const day = L.ymd(new Date(L.NOW)), key = p => ['kitchens', L.PIN].concat(p).join('/');
const cfg = L.seed()[key(['config', 'main'])];
cfg.kitSecs = [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }, { id: 'fryers', name: 'Fryers' }];
cfg.kitShifts = [{ id: 'lunch', name: 'Lunch', from: 600, to: 1260 }];
const ln = (t, s, d) => ({ text: t, station: s, qty: '', recipes: [], addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 3600000, done: !!d, deleted: false, ...(d ? { doneBy: 'Sam', doneById: 'sam', doneAt: L.NOW - 600000 } : {}) });
const extra = { [key(['config', 'main'])]: cfg, [key(['team', day])]: { day, on: [{ id: 'ann', sh: 'lunch', sec: 'pans' }, { id: 'sam', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'lunch', sec: 'fryers' }], br: [], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' } };
[['a', 'Reduce jus', 'Pans'], ['b', 'Blanch beans', 'Pans', 1], ['c', 'Portion rump', 'Grill', 1], ['d', 'Cut chips', 'Fryers']].forEach(([id, t, s, d]) => { extra[key(['days', day, 'items', id])] = ln(t, s, d); });
const res = {};
try {
  for (const [w, h] of [[1920, 1080], [1280, 900], [768, 1024], [390, 844]]) for (const m of ['', 'H1', 'H2', 'H3']) {
    const p = await L.open(b, '#/', { who: 'ann', width: w, height: h, wait: 1600, extra, settings: { shared: true } });
    await L.waitFor(p, () => !!document.querySelector('.mascot[data-state]'), null, 8000).catch(() => {});
    await p.addStyleTag({ content: CSS }); await p.evaluate(JS); await p.evaluate(([x]) => window.LK_HB.set(x, 'smash'), [m]); await L.settle(p, 600);
    const tag = `${m || 'today'}-${w}x${h}`;
    await p.screenshot({ path: `${OUT}/home-${tag}.png` });
    res[tag] = await p.evaluate(() => { const q = s => { const e = document.querySelector(s), r = e && e.getBoundingClientRect(); return r && r.width ? [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] : null; };
      return { bubble: q('.hb-bubble'), say: document.querySelector('.hb-bubble')?.textContent || '', mascot: q('.mascot'), spot: document.querySelector('.mascot')?.getAttribute('data-spot'), heading: q('#rtitle'), day: q('#hm-day'), scroll: document.documentElement.scrollWidth - innerWidth }; });
    res[tag].errs = p.errors.filter(e => !/Failed to load resource/.test(e));
    console.log(tag, JSON.stringify(res[tag]));
    await p.context().close();
  }
} catch (e) { console.log('ERR', String(e).slice(0, 600)); }
finally { fs.writeFileSync(`${OUT}/walk-home.json`, JSON.stringify(res)); await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]); process.exit(0); }
