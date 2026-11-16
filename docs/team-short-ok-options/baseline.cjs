// Baseline for docs/team-short-ok-options/brief.md: today's Too few line (built 15 Nov 2026, #713) on the one-clock rows
// (#721), in the click-test stand-in. The study's made-up day (docs/team-minimum-options/data.js), Dinner busy time
// 17:30 to 20:30 with 6 needed, at 14:00 (planning ahead) and 18:30 (in service). Synthetic data only.
// Run from tests/:  CHROME=<headless shell> node ../docs/team-short-ok-options/baseline.cjs
const path = require('path');
const L = require(path.resolve(__dirname, '../../tests/lib'));
const OUT = __dirname;
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW));
global.window = {}; require('../team-minimum-options/data.js'); const D = window.TM_DATA;
const people = [{ id: 'gus', name: 'Gus', role: 'head', active: true, add: true, tick: true, del: true }, { id: 'sam', name: 'Sam K', role: 'sous', active: true, add: true, tick: true, del: true },
  ...['Ari', 'Bea', 'Cal', 'Dev', 'Eli', 'Fen', 'Gia', 'Hal'].map(n => ({ id: n.toLowerCase(), name: n, role: 'staff', active: true, add: true, tick: true }))];
const BUSY = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900, busy: { from: 720, to: 840, n: 3 } }, { id: 'dinner', name: 'Dinner', from: 900, to: 1260, busy: { from: 1050, to: 1230, n: 6 } }];
const fx = { [key('config', 'main')]: { people, headId: 'gus', sousIds: ['sam'], staffIds: people.map(p => p.id), kitShifts: BUSY, kitSecs: D.sections },
  [key('team', today)]: { day: today, on: D.on, br: D.br, v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'gus' } };
const measure = p => p.evaluate(() => {
  const dock = document.querySelector('.tm-focus-save'), dr = dock && dock.getBoundingClientRect();
  let bottom = innerHeight; const nav = document.querySelector('.tabbar');
  if (nav && nav.getClientRects().length) { const r = nav.getBoundingClientRect(); if (r.top > innerHeight / 2) bottom = Math.min(bottom, r.top); }
  if (dr) bottom = Math.min(bottom, dr.top);
  const line = document.querySelector('.tm-short-line'), lr = line && !line.hidden ? line.getBoundingClientRect() : null;
  return { dockH: dr ? Math.round(dr.height) : 0, line: line && !line.hidden ? line.innerText.replace(/\s+/g, ' ').trim() : '',
    lineFont: line ? getComputedStyle(line).fontSize : '', lineOnScreen: !!lr && lr.top >= 0 && lr.bottom <= innerHeight,
    rowsFull: [...document.querySelectorAll('.tm-tlrow')].filter(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= bottom + .5; }).length,
    rowsAny: [...document.querySelectorAll('.tm-tlrow')].filter(e => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < bottom; }).length,
    marks: [...document.querySelectorAll('.tm-short-mark:not([hidden])')].map(e => e.dataset.id).join(','), overflow: document.documentElement.scrollWidth > innerWidth };
});
(async () => {
  const b = await L.start(), out = {};
  for (const [label, hash, o] of [['admin-390', '#/admin', { admin: true, adminPage: 'plan', width: 390 }], ['team-390', '#/team', { who: 'sam', width: 390 }], ['admin-1280', '#/admin', { admin: true, adminPage: 'plan', width: 1280 }]]) {
    for (const [when, clock] of [['1400', L.NOW], ['1830', L.NOW + 270 * 60000]]) {
      const p = await L.open(b, hash, Object.assign({ extra: fx, wait: 1800, clock }, o));
      await L.waitFor(p, () => document.querySelectorAll('.tm-tlrow').length >= 7, null, 9000); await L.settle(p, 400);
      const first = await measure(p);
      await p.screenshot({ path: path.join(OUT, 'baseline-' + label + '-' + when + '.png') });
      await p.evaluate(() => { const h = document.querySelector('.tm-grid-head'); window.scrollTo(0, h.getBoundingClientRect().top + scrollY - 60); }); await L.settle(p, 200);
      const working = await measure(p);
      if (/390/.test(label) && when === '1830') await p.screenshot({ path: path.join(OUT, 'baseline-' + label + '-' + when + '-working.png') });
      out[label + '-' + when] = { first, working, errors: p.errors.length };
      await p.context().close();
    }
  }
  require('fs').writeFileSync(path.join(OUT, 'baseline.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
