// Review-only. Walks the same task through each wide-screen design on the real book (stand-in Firebase from tests/fake,
// made-up people and prep lines, the kitchen's own section names) and records every rectangle a cook works with.
//
//   cd tests && npm install
//   node -e "require('./serve').listen(8770,'127.0.0.1')" &          (serves the repo; tests/serve.js)
//   CHROME=<chrome> FONTS=<folder with barlow-400.ttf, barlow-600.ttf, barlow-700.ttf, barlow-condensed-700.ttf> \
//     node ../docs/mascot-desktop-options/preview/capture.mjs <out folder> "today,A,B,C,M,H,P" 1920x1080,1280x900 [xlarge] [sam] [noart] [long] [shared]
//
// Without FONTS the click tests' stand-in fonts are used and text widths differ from the kitchen's screens.
// Designs: '' is today's book; A, B, C, M (B with C's arrival), P (the recommended blend) and H (Home, drawn apart)
// are in candidate.js and candidate.css. xlarge: Extra large text. sam: a sous chef. noart: the mascot's file and art
// fail to load. long: long section names. shared: a shared kitchen screen (its own short walk).
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const D = fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, ''), W = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\/$/, '');
const require = createRequire(W + '/tests/'), fs = require('fs'), path = require('path');
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8770/';
const L = require(W + '/tests/lib');
const OUT = process.argv[2], ONLY = (process.argv[3] || '').split(',').filter(Boolean), SIZES = (process.argv[4] || '1920x1080,1280x900').split(',').map(s => s.split('x').map(Number)), REST = process.argv.slice(5), TEXT = REST.includes('xlarge') ? 'xlarge' : '', WHO = REST.includes('sam') ? 'sam' : 'ann', NOART = REST.includes('noart'), LONG = REST.includes('long'), SHARED = REST.includes('shared'), PANS = LONG ? 'Salads and dessert' : 'Pans', GRILL = LONG ? 'Hot larder and pass' : 'Grill';
const fonts = [['Barlow', 400, 'barlow-400.ttf'], ['Barlow', 600, 'barlow-600.ttf'], ['Barlow', 700, 'barlow-700.ttf'], ['Barlow Condensed', 700, 'barlow-condensed-700.ttf']];
const css = fonts.map(([f, w], i) => `@font-face{font-family:'${f}';font-weight:${w};font-style:normal;src:url(https://fonts.gstatic.com/live-font-${i}.ttf) format('truetype')}`).join('\n');
async function installFonts(c) {
  if (!process.env.FONTS) return;
  await c.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: css }));
  await c.route(/fonts\.gstatic\.com/, r => { const i = Number(r.request().url().match(/live-font-(\d)/)?.[1]); return r.fulfill({ status: 200, contentType: 'font/ttf', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(path.join(process.env.FONTS, fonts[i][2])) }); });
}
const b = await L.start(), nc = b.newContext.bind(b);
b.newContext = async o => { const c = await nc(o), np = c.newPage.bind(c); c.newPage = async () => { await installFonts(c); return np(); }; return c; };
setTimeout(() => { console.log('HARD TIMEOUT'); process.exit(3); }, 560000);
const day = L.ymd(new Date(L.NOW)), key = p => ['kitchens', L.PIN].concat(p).join('/'), item = id => key(['days', day, 'items', id]);
const line = (text, station, o) => Object.assign({ text, station, qty: '', recipes: [], addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 3600000, done: false, deleted: false }, o || {});
const kitchen = () => ({
  [item('i3')]: line('Portion rump', GRILL, { urgent: true, qty: '20' }), [item('i8')]: line('Marinate chicken', GRILL, { qty: '8 kg' }),
  [item('i4')]: line('Reduce jus', PANS, { rolled: 1, qty: '5 L' }), [item('i5')]: line('Caramelise onions', PANS, { qty: '2 tubs' }),
  [item('i1')]: line('Cut chips', 'Fryers', { qty: '3 tubs' }), [item('i2')]: line('Crumb schnitzels', 'Fryers', { qty: '24' }),
  [item('i0')]: line('Old line', PANS, { deleted: true }), [item('i6')]: line('Pick herbs', 'Hot larder'), [item('i7')]: line('Wash leaves', 'Hot larder'), [item('i9')]: line('Slice tomatoes', 'Hot larder', { qty: '1 tub' })
});
function fixture() {
  const cfg = L.seed()[key(['config', 'main'])];
  cfg.kitSecs = [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }, { id: 'fryers', name: 'Fryers' }, { id: 'hot', name: 'Hot larder' }];
  cfg.kitShifts = [{ id: 'lunch', name: 'Lunch', from: 600, to: 1260 }];
  return { [key(['config', 'main'])]: cfg, [key(['team', day])]: { day, on: [{ id: 'ann', sh: 'lunch', sec: 'pans' }, { id: 'sam', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'lunch', sec: 'fryers' }], br: [], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' } };
}
const CSS = fs.readFileSync(D + '/candidate.css', 'utf8'), JS = fs.readFileSync(D + '/candidate.js', 'utf8');
const other = (p, id, data) => p.evaluate(([path, d]) => window.__fake.write(path, Object.assign({}, window.__fake.dump()[path] || {}, d)), [item(id), data]);
const tick = async (p, id, w) => { await p.click(`button.nb-box[data-id="${id}"]`); await L.settle(p, w == null ? 250 : w); };
// every rectangle a cook works with, by a stable name
const rects = p => p.evaluate(() => {
  const out = {}, r = e => { const x = e.getBoundingClientRect(); return [Math.round(x.x), Math.round(x.y), Math.round(x.width), Math.round(x.height)]; };
  const put = (k, e) => { if (e && !e.closest('.dk-stage, .dk-perch, .nb-fin') && !e.classList.contains('mascot')) out[k] = r(e); };
  document.querySelectorAll('.nb-left .nb-rows .nb-row').forEach(e => put('row:' + e.id, e));
  document.querySelectorAll('.nb-left .nb-hd').forEach((e, i) => put('hd:' + e.textContent.replace(/[\d/ ]+$/, ''), e));
  document.querySelectorAll('.nb-tab').forEach(e => put('tab:' + e.getAttribute('data-v'), e));
  document.querySelectorAll('.nb-right .nb-ph, .nb-left .nb-ph, .nb-prog, .nb-addline, .wtop, .nb-right .nb-body > *, .nb-left .nb-foot, .nb-left .nb-foot button, .p-badges, .nb-book').forEach((e, i) => put('part:' + e.className.split(' ')[0] + i, e));
  document.querySelectorAll('[data-undo], .nb-right button, .nb-right a').forEach((e, i) => put('handy:' + i, e));
  const t = document.querySelector('.p-toasts .p-toast[data-toast="new"]'); if (t) { put('slip', t); put('undo', t.querySelector('.p-toast-btn')); }
  document.querySelectorAll('.wall-main > *, #hm-day, #hm-with, #hm-prep, .hm-sec').forEach((e, i) => put('home:' + (e.id || e.className.split(' ')[0]) + i, e));
  return out;
});
const info = p => p.evaluate(() => { const t = document.querySelector('.p-toasts .p-toast[data-toast="new"]'), q = s => { const e = document.querySelector(s), r = e && e.getBoundingClientRect(); return r && r.width ? [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] : null; };
  return { slip: t ? [t.querySelector('.p-toast-msg').textContent, t.querySelector('.p-toast-say')?.textContent || ''] : null, fin: q('.nb-fin'), finArt: q('.nb-fin-art'), stage: q('.dk-stage'), stageArt: q('.dk-stage .dk-art'), stageBubble: q('.dk-stage .dk-bubble'), finSay: q('.nb-fin-say'), body: q('.nb-left .nb-body'), bodyScroll: (b => b ? b.scrollHeight - b.clientHeight : null)(document.querySelector('.nb-left .nb-body')), font: (e => e ? getComputedStyle(e).fontSize : '')(document.querySelector('.dk-stage .dk-bubble, .nb-fin-say')), noteY: (e => e ? Math.round(e.getBoundingClientRect().bottom) : null)(document.querySelector('.dk-stage, .nb-fin')), winH: innerHeight, stageSay: document.querySelector('.dk-stage .dk-bubble')?.innerText.replace(/\n/g, ' | ') || '', perch: q('.dk-perch:not([hidden])'), perchArt: q('.dk-perch:not([hidden]) .dk-art'), perchSay: (document.querySelector('.dk-perch:not([hidden]) .dk-bubble')?.innerText || '').replace(/\n/g, ' | '), homeMascot: q('.mascot'), empty: [...document.querySelectorAll('.nb-left .nb-empty')].map(e => e.textContent).join(' | '), desk: window.LK_DESK ? window.LK_DESK.state() : null, scroll: document.documentElement.scrollWidth - innerWidth, docH: document.documentElement.scrollHeight }; });
const res = {};
async function walk(d, w, h) {
  const tag = `${d || 'today'}${TEXT ? '-' + TEXT : ''}${WHO !== 'ann' ? '-' + WHO : ''}${NOART ? '-noart' : ''}${LONG ? '-long' : ''}-${w}x${h}`, extra = { ...fixture(), ...kitchen() }, steps = {};
  const shot = async (p, name) => { await L.settle(p, 350); await p.screenshot({ path: `${OUT}/${tag}-${name}.png` }); steps[name] = { rects: await rects(p), info: await info(p) }; };
  const said = [];
  const boot = async (p) => { await p.evaluate(() => document.fonts.ready); await p.addStyleTag({ content: CSS }); await p.evaluate(JS); await p.evaluate(x => window.LK_DESK.set(x), d); await L.settle(p, 500); };
  let p = await L.open(b, '#/prep', { who: WHO, width: w, height: h, wait: 1300, extra, ...(TEXT ? { settings: { text: TEXT } } : {}) });
  // his file and his art fail to load: the words must stand alone
  if (NOART) await p.context().route(/js\/mascot\.js|art\/mascot\//, r => r.abort());
  await boot(p);
  await p.click(`.nb-tab[data-v="${PANS}"]`); await L.settle(p, 400);
  await shot(p, '1-tab');
  await tick(p, 'i4'); await shot(p, '2-ordinary');
  await p.clock.runFor(9500); await L.settle(p, 300);
  await tick(p, 'i5', 800); await shot(p, '3-finishing');
  await p.clock.runFor(4000); await L.settle(p, 1400); await shot(p, '4-line-left');
  if (d === 'P') { await p.evaluate(() => document.documentElement.classList.add('dk-allgreen')); await shot(p, '4g-all-green'); await p.evaluate(() => document.documentElement.classList.remove('dk-allgreen')); await L.settle(p, 200); }
  await p.clock.runFor(6000); await L.settle(p, 800); await shot(p, '5-rest');
  // the signal drops with the scene standing, then comes back
  await p.context().setOffline(true); await L.settle(p, 1500); await shot(p, '5e-no-signal');
  await p.context().setOffline(false); await L.settle(p, 1500); await shot(p, '5f-signal-back');
  // another screen ticks a Grill line: what is next follows the list
  await other(p, 'i3', { done: true, doneAt: L.NOW - 60000, doneBy: 'Sam', doneById: 'sam' });   // before every tick here, so Done today keeps one order from run to run await L.settle(p, 700); await p.clock.runFor(4000); await L.settle(p, 700); await shot(p, '5b-follows');
  // another screen writes a new Pans line: the finished state is no longer true
  await p.evaluate(([path, d]) => window.__fake.write(path, d), [item('i10'), line('Blanch beans', PANS, { qty: '2 kg', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW + 120000 })]); await L.settle(p, 900); await shot(p, '5c-new-line');
  await tick(p, 'i10', 800); await p.clock.runFor(4000); await L.settle(p, 1400); await shot(p, '5d-again');
  await p.clock.runFor(6000); await L.settle(p, 500);
  await p.click('.nb-tab[data-v=""]'); await L.settle(p, 400);
  for (const id of ['i8', 'i1', 'i2', 'i6', 'i7']) { await tick(p, id, id === 'i8' ? 800 : 250); if (id === 'i8') await shot(p, '6a-all-section'); await p.clock.runFor(9500); await L.settle(p, 200); }
  await shot(p, '6-one-left');
  await tick(p, 'i9', 900); await shot(p, '7-list-finishing');
  await p.clock.runFor(4200); await L.settle(p, 1600); await shot(p, '8-list-scene');
  await p.clock.runFor(8000); await L.settle(p, 900); await shot(p, '9-list-rest');
  const errs = p.errors.filter(e => !/Failed to load resource/.test(e)); await p.context().close();
  p = await L.open(b, '#/', { who: WHO, width: w, height: h, wait: 1500, extra, ...(TEXT ? { settings: { text: TEXT } } : {}) }); await boot(p); await L.settle(p, 900); await shot(p, '10-home');
  errs.push(...p.errors.filter(e => !/Failed to load resource/.test(e))); await p.context().close();
  res[tag] = { steps, errs };
  console.log(tag, 'done', errs.length ? 'ERRORS ' + errs.join(' | ').slice(0, 300) : '');
}
// A shared kitchen screen: a tick asks Who did this?, and the answer comes after the name. Is anything of a design
// on screen, or sharp beside the dimmed page, while the sheet is up?
async function walkShared(d, w, h) {
  const tag = `${d || 'today'}-shared-${w}x${h}`, extra = { ...fixture(), ...kitchen() }, steps = {};
  const shot = async (p, name) => { await L.settle(p, 350); await p.screenshot({ path: `${OUT}/${tag}-${name}.png` }); steps[name] = { rects: await rects(p), info: await info(p) }; };
  const boot = async (p) => { await p.evaluate(() => document.fonts.ready); await p.addStyleTag({ content: CSS }); await p.evaluate(JS); await p.evaluate(x => window.LK_DESK.set(x), d); await L.settle(p, 500); };
  const who = async (p, id) => { await p.click(`button.nb-box[data-id="${id}"]`); await L.waitFor(p, () => !!document.querySelector('[data-pt="choose"][data-id="ann"]'), null, 6000); };
  const name = async p => { await p.click('[data-pt="choose"][data-id="ann"]'); await L.waitFor(p, () => !document.querySelector('[data-pt="choose"]'), null, 8000); await L.settle(p, 700); };
  const p = await L.open(b, '#/prep', { who: 'ann', width: w, height: h, wait: 1500, extra, settings: { shared: true } }); await boot(p);
  await who(p, 'i4'); await name(p); await p.clock.runFor(9500); await L.settle(p, 300);
  await who(p, 'i5'); await shot(p, 's1-who-last-pans');              // the sheet is up for the tick that will finish Pans
  await name(p); await shot(p, 's2-pans-finished-on-all');            // Pans is finished on the All list: the slip's sentence
  await who(p, 'i3'); await shot(p, 's3-who-next-tick');              // the cook goes straight to the next tick: the sheet is up
  await name(p); await p.clock.runFor(9500); await L.settle(p, 300);
  await p.click('.nb-tab[data-v="Pans"]'); await L.settle(p, 900); await shot(p, 's4-pans-tab');
  const errs = p.errors.filter(e => !/Failed to load resource/.test(e)); await p.context().close();
  res[tag] = { steps, errs };
  console.log(tag, 'done', errs.length ? 'ERRORS ' + errs.join(' | ').slice(0, 300) : '');
}
try {
  for (const [w, h] of SIZES) for (const d of ['', 'A', 'B', 'C', 'M', 'H', 'P']) { if (ONLY.length && !ONLY.includes(d || 'today')) continue; await (SHARED ? walkShared : walk)(d, w, h); }
  fs.writeFileSync(`${OUT}/walk-${SHARED ? 'shared-' : ''}${ONLY.join('') || 'all'}${TEXT ? '-' + TEXT : ''}${WHO !== 'ann' ? '-' + WHO : ''}${NOART ? '-noart' : ''}${LONG ? '-long' : ''}-${SIZES.map(s => s.join('x')).join('-')}.json`, JSON.stringify(res));
} catch (e) { console.log('ERR', String(e).slice(0, 700)); } finally { await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]); process.exit(0); }
