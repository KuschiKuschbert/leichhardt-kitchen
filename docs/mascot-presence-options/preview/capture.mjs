// Review-only. Walks the same evening on a shared section screen through each round 2 design, on the real book with the
// click tests' stand-in Firebase, made-up lines and people, and records the rectangles a cook works with.
//
//   cd tests && npm install
//   node -e "require('./serve').listen(8770,'127.0.0.1')" &
//   CHROME=<chrome> node ../docs/mascot-presence-options/preview/capture.mjs <out folder> "today,A,B,C,M" 1920x1080,1280x900,390x844 [fallback]
//
// The stand-in fonts are used (not Barlow), so text widths differ from the kitchen's screens.
// The evening: 20:00, 15 lines for today (11 ticked, Fryers already finished) and 6 lines for tomorrow written from
// 19:30 (a batch of 6, so today's own lines clock tonight's list). 14 regulars fill Quick add. fallback: no batch,
// one line for tomorrow at 20:10 under the book's usual-time cut, so A must leave today's finish as it is.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const D = fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, ''), W = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\/$/, '');
const require = createRequire(W + '/tests/'), fs = require('fs');
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8770/';
const L = require(W + '/tests/lib');
const OUT = process.argv[2], ONLY = (process.argv[3] || 'today,A,B,C').split(','), SIZES = (process.argv[4] || '1920x1080').split(',').map(s => s.split('x').map(Number)), FALLBACK = process.argv.slice(5).includes('fallback');
fs.mkdirSync(OUT, { recursive: true });
const b = await L.start();
setTimeout(() => { console.log('HARD TIMEOUT'); process.exit(3); }, 900000);
const H = 3600000, EVE = L.NOW + 6 * H, day = L.ymd(new Date(L.NOW)), key = p => ['kitchens', L.PIN].concat(p).join('/'), item = id => key(['days', day, 'items', id]);
const line = (text, station, o) => Object.assign({ text, station, qty: '', recipes: [], addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - H, done: false, deleted: false }, o || {});
const dn = (t, s, o) => line(t, s, Object.assign({ done: true, doneBy: 'Sam', doneById: 'sam', doneAt: L.NOW + 2 * H }, o || {}));
const late = (t, s, i) => line(t, s, { addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW + 5.5 * H + i * 120000 });
function kitchen() {
  const k = {
    i1: dn('Portion rump', 'Grill', { qty: '20' }), i2: dn('Marinate chicken', 'Grill', { qty: '8 kg' }), i3: line('Skewer prawns', 'Grill', { qty: '40' }), i15: dn('Trim steaks', 'Grill'),
    i4: line('Reduce jus', 'Pans', { qty: '5 L' }), i5: line('Caramelise onions', 'Pans', { qty: '2 tubs' }), i6: dn('Blanch beans', 'Pans'),
    i7: dn('Cut chips', 'Fryers', { qty: '3 tubs' }), i8: dn('Crumb schnitzels', 'Fryers', { qty: '24' }), i9: dn('Batter mix', 'Fryers', { qty: '2 L' }),
    i10: dn('Pick herbs', 'Hot larder'), i11: dn('Wash leaves', 'Hot larder'), i12: dn('Slice tomatoes', 'Hot larder'), i13: line('Dressing', 'Hot larder', { qty: '1 L' }), i14: dn('Pickle onions', 'Hot larder')
  };
  if (FALLBACK) k.t1 = line('Portion lamb', 'Grill', { addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW + 6 * H + 10 * 60000 });
  else [['Portion lamb', 'Grill'], ['Prep mash', 'Pans'], ['Crumb calamari', 'Fryers'], ['Make aioli', 'Hot larder'], ['Pick parsley', 'Hot larder'], ['Braise cheeks', 'Pans']].forEach(([t, s], i) => { k['t' + (i + 1)] = late(t, s, i); });
  const out = {}; Object.keys(k).forEach(id => { out[item(id)] = k[id]; }); return out;
}
function fixture() {
  const cfg = L.seed()[key(['config', 'main'])];
  cfg.kitSecs = [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }, { id: 'fryers', name: 'Fryers' }, { id: 'hot', name: 'Hot larder' }];
  cfg.kitShifts = [{ id: 'dinner', name: 'Dinner', from: 900, to: 1380 }];
  const regs = ['Cut chips', 'Pick herbs', 'Reduce jus', 'Portion rump', 'Make gravy', 'Slice onions', 'Wash cos', 'Crumb schnitzels', 'Make slaw', 'Grate cheese', 'Peel potatoes', 'Make aioli', 'Dice capsicum', 'Blanch broccolini']
    .map((t, i) => ({ id: t.toLowerCase().replace(/ /g, '-'), text: t, uses: 20 - i, typed: 20 - i, dow: {}, qtys: {}, secs: {} }));
  return {
    [key(['config', 'main'])]: cfg,
    [key(['summary', 'learned'])]: { day, items: regs, lists: { days: {}, dow: {}, usual: 20 * 60 + 30, n: 4 }, at: L.NOW - H },
    [key(['team', day])]: { day, on: [{ id: 'ann', sh: 'dinner', sec: 'pans' }, { id: 'sam', sh: 'dinner', sec: 'grill' }, { id: 'bo', sh: 'dinner', sec: 'fryers' }], br: [], v: 1, at: L.NOW - H, upd: L.NOW - H, by: 'sam' }
  };
}
const CSS = fs.readFileSync(D + '/candidate.css', 'utf8'), JS = fs.readFileSync(D + '/candidate.js', 'utf8');
const PVCFG = { items: key(['days', day, 'items']) + '/', day, ownCut: !FALLBACK, cutMs: L.NOW + 5.5 * H, order: ['Grill', 'Pans', 'Fryers', 'Hot larder'] };
const rects = p => p.evaluate(() => {
  const out = {}, r = e => { const x = e.getBoundingClientRect(); return [Math.round(x.x), Math.round(x.y), Math.round(x.width), Math.round(x.height)]; };
  const put = (k, e) => { if (e && !e.closest('[data-pv]')) out[k] = r(e); };
  document.querySelectorAll('.nb-left .nb-row').forEach(e => put('row:' + e.id, e));
  document.querySelectorAll('.nb-tab').forEach(e => put('tab:' + e.getAttribute('data-v'), e));
  document.querySelectorAll('.nb-left .nb-hd').forEach(e => put('hd:' + e.textContent.replace(/[\d/ ]+$/, ''), e));
  ['.nb-left .nb-prog', '.nb-addline', '.nb-right .nb-ph', '.nb-right .nb-title', '#nb-donebox', '.nb-quick', '.nb-done'].forEach(s => put('part:' + s, document.querySelector(s)));
  document.querySelectorAll('.nb-quick .chip').forEach((e, i) => put('quick:' + i, e));
  document.querySelectorAll('#hm-day, #hm-with, #hm-prep, .hm-sec, .mascot').forEach((e, i) => put('home:' + (e.id || e.className.split(' ')[0]) + i, e));
  return out;
});
const info = p => p.evaluate(() => {
  const q = s => { const e = document.querySelector(s), r = e && e.getBoundingClientRect(); return r && r.width ? [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] : null; };
  const vis = [...document.querySelectorAll('.nb-left .nb-row')].filter(e => { const r = e.getBoundingClientRect(); return r.height && r.bottom <= innerHeight && r.top >= 0; }).length;
  return { prog: document.querySelector('.nb-left .nb-prog')?.textContent || '', tmr: document.querySelector('.pv-tmr')?.textContent || '', rows: document.querySelectorAll('.nb-left .nb-row').length, rowsInView: vis,
    fin: q('.nb-fin'), pvFin: q('.pv-fin'), pvFinArt: q('.pv-fin .pv-art img'), pvShelf: q('.pv-shelf'), pvCorner: q('.pv-corner'), say: [...document.querySelectorAll('[data-pv] .pv-say, .nb-fin-say')].map(e => e.textContent).join(' | '),
    slip: (t => t ? t.textContent.replace(/\s+/g, ' ').trim() : '')(document.querySelector('.p-toasts .p-toast')), handyPh: q('.nb-right .nb-ph'), handyTitle: q('.nb-right .nb-title'), homeMascot: q('.mascot'), homeCount: [...document.querySelectorAll('.hm-pc')].map(e => e.textContent).join(' · '),
    scroll: document.documentElement.scrollWidth - innerWidth };
});
const res = {};
async function tick(p, id) {
  await p.click(`button.nb-box[data-id="${id}"]`);
  const sheet = await L.waitFor(p, () => !!document.querySelector('[data-pt="choose"][data-id="ann"]'), null, 2500).then(() => true, () => false);
  if (sheet) { await p.click('[data-pt="choose"][data-id="ann"]'); await L.waitFor(p, () => !document.querySelector('[data-pt="choose"]'), null, 8000); }
  await L.settle(p, 500);
}
async function walk(d, w, h) {
  const tag = `${d || 'today'}${FALLBACK ? '-fallback' : ''}-${w}x${h}`, steps = {}, extra = { ...fixture(), ...kitchen() };
  const shot = async (p, name) => { await L.settle(p, 400); await p.screenshot({ path: `${OUT}/${tag}-${name}.png` }); steps[name] = { rects: await rects(p), info: await info(p) }; };
  const boot = async p => { await p.addStyleTag({ content: CSS }); await p.evaluate(JS); await p.evaluate(([x, c]) => window.LK_PV.set(x, c), [d, PVCFG]); await L.settle(p, 600); };
  let p = await L.open(b, '#/prep', { who: 'ann', width: w, height: h, wait: 1600, extra, clock: EVE, settings: { shared: true } });
  await boot(p);
  await shot(p, '1-all');
  if (FALLBACK) {
    for (const id of ['i3', 'i4', 'i5', 'i13']) { await tick(p, id); await p.clock.runFor(9500); await L.settle(p, 300); }
    await p.clock.runFor(4000); await L.settle(p, 900); await shot(p, '4-today-ticked');
  } else {
    await tick(p, 'i4'); await p.clock.runFor(9500); await L.settle(p, 300);
    await tick(p, 'i5'); await shot(p, '2-pans-finished');
    await p.clock.runFor(9500); await L.settle(p, 900); await shot(p, '3-pans-after');
    await tick(p, 'i3'); await p.clock.runFor(9500); await L.settle(p, 300);
    await tick(p, 'i13'); await p.clock.runFor(4200); await L.settle(p, 1400); await shot(p, '4-today-done');
    await p.context().setOffline(true); await L.settle(p, 1200); await shot(p, '4b-no-signal');
    await p.context().setOffline(false); await L.settle(p, 1200);
    if (w >= 900) { await p.click('.nb-tab[data-v="Pans"]'); await L.settle(p, 700); await shot(p, '5-pans-tab'); }
  }
  const errs = p.errors.filter(e => !/Failed to load resource/.test(e)); await p.context().close();
  if (!FALLBACK) {
    p = await L.open(b, '#/', { who: 'ann', width: w, height: h, wait: 1600, extra, clock: EVE, settings: { shared: true } }); await boot(p); await L.settle(p, 900); await shot(p, '6-home');
    errs.push(...p.errors.filter(e => !/Failed to load resource/.test(e))); await p.context().close();
  }
  res[tag] = { steps, errs };
  console.log(tag, 'done', errs.length ? 'ERRORS ' + errs.join(' | ').slice(0, 300) : '');
}
try {
  for (const [w, h] of SIZES) for (const d of ONLY) await walk(d === 'today' ? '' : d, w, h);
} catch (e) { console.log('ERR', String(e).slice(0, 900)); }
finally { fs.writeFileSync(`${OUT}/walk-${ONLY.join('')}${FALLBACK ? '-fallback' : ''}-${SIZES.map(s => s.join('x')).join('-')}.json`, JSON.stringify(res)); await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]); process.exit(0); }
