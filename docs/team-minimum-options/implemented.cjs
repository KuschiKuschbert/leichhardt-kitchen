// Implemented app for docs/team-minimum-options/brief.md: the built warning in the click-test stand-in, on the study's
// made-up day at 18:30, with busy times set (Lunch 12:00 to 14:00, 3; Dinner 17:30 to 20:30, 6) and without (as today).
// Synthetic data only. Run from tests/:  CHROME=<headless shell> node ../docs/team-minimum-options/implemented.cjs
const path = require('path');
const L = require(path.resolve(__dirname, '../../tests/lib'));
const OUT = __dirname;
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW));
global.window = {}; require('./data.js'); const D = window.TM_DATA;
const people = [{ id: 'gus', name: 'Gus', role: 'head', active: true, add: true, tick: true, del: true }, { id: 'sam', name: 'Sam K', role: 'sous', active: true, add: true, tick: true, del: true },
  ...['Ari', 'Bea', 'Cal', 'Dev', 'Eli', 'Fen', 'Gia', 'Hal'].map(n => ({ id: n.toLowerCase(), name: n, role: 'staff', active: true, add: true, tick: true }))];
const BUSY = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900, busy: { from: 720, to: 840, n: 3 } }, { id: 'dinner', name: 'Dinner', from: 900, to: 1260, busy: { from: 1050, to: 1230, n: 6 } }];
const PLAIN = BUSY.map(s => ({ id: s.id, name: s.name, from: s.from, to: s.to }));
const fx = shifts => ({ [key('config', 'main')]: { people, headId: 'gus', sousIds: ['sam'], staffIds: people.map(p => p.id), kitShifts: shifts, kitSecs: D.sections },
  [key('team', today)]: { day: today, on: D.on, br: D.br, v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'gus' } });
const measure = p => p.evaluate(() => {
  const dock = document.querySelector('.tm-focus-save').getBoundingClientRect(), nav = document.querySelector('.tabbar');
  let bottom = innerHeight; if (nav && nav.getClientRects().length) { const r = nav.getBoundingClientRect(); if (r.top > innerHeight / 2) bottom = Math.min(bottom, r.top); }
  bottom = Math.min(bottom, dock.top);
  const head = document.querySelector('.tm-grid-head').getBoundingClientRect(), top = head.top <= 160 ? head.bottom : 0;
  const line = document.querySelector('.tm-short-line'), lr = line && !line.hidden ? line.getBoundingClientRect() : null;
  return { dockH: Math.round(dock.height), boardNames: [...document.querySelectorAll('.tm-away-row')].filter(e => e.getBoundingClientRect().bottom <= dock.top + .5).length + ' of ' + document.querySelectorAll('.tm-away-row').length,
    rows: [...document.querySelectorAll('.tm-grid-row')].filter(e => { const r = e.getBoundingClientRect(); return r.top >= top - .5 && r.bottom <= bottom + .5; }).length,
    line: line && !line.hidden ? line.innerText.replace(/\s+/g, ' ').trim() : '', lineOnScreen: !!lr && lr.top >= 0 && lr.bottom <= innerHeight, marks: [...document.querySelectorAll('.tm-short-mark:not([hidden])')].map(e => e.dataset.id).join(','),
    overflow: document.documentElement.scrollWidth > innerWidth };
});
(async () => {
  const b = await L.start(), out = {};
  for (const [label, hash, o] of [['admin-390', '#/admin', { admin: true, adminPage: 'plan', width: 390 }], ['team-390', '#/team', { who: 'sam', width: 390 }], ['admin-768', '#/admin', { admin: true, adminPage: 'plan', width: 768 }], ['admin-1280', '#/admin', { admin: true, adminPage: 'plan', width: 1280 }]]) {
    out[label] = {};
    for (const [state, shifts] of [['before', PLAIN], ['built', BUSY]]) {
      const p = await L.open(b, hash, Object.assign({ extra: fx(shifts), wait: 1800, clock: L.NOW + 270 * 60000 }, o));
      await L.waitFor(p, () => document.querySelectorAll('.tm-grid-row').length >= 7, null, 9000); await L.settle(p, 400);
      const first = await measure(p);
      if (state === 'built') await p.screenshot({ path: path.join(OUT, 'implemented-' + label + '.png') });
      await p.evaluate(() => { const h = document.querySelector('.tm-grid-head'), inset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tm-grid-top')) || 0; window.scrollTo(0, h.getBoundingClientRect().top + scrollY - inset); }); await L.settle(p, 200);
      const working = await measure(p);
      if (state === 'built' && /390/.test(label)) await p.screenshot({ path: path.join(OUT, 'implemented-' + label + '-working.png') });
      out[label][state] = { first, working: { rows: working.rows, dockH: working.dockH }, errors: p.errors.length };
      await p.context().close();
    }
  }
  // the setting at 390 px
  { const p = await L.open(b, '#/admin', { admin: true, width: 390, adminPage: '', extra: fx(BUSY), wait: 2500 }); await L.kitchenRow(p, 'shifts'); await L.settle(p, 300);
    await p.locator('.a-sh').scrollIntoViewIfNeeded(); await p.locator('.a-sh').screenshot({ path: path.join(OUT, 'implemented-setting-390.png') });
    out.setting = { overflow: await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), errors: p.errors.length }; await p.context().close(); }
  require('fs').writeFileSync(path.join(OUT, 'implemented.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
