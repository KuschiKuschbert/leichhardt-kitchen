// Baseline for docs/team-minimum-options/brief.md: today's Today's team planner in the click-test stand-in, on a made-up
// Friday-style day with three cooks on break during dinner. Synthetic data only.
// Run from tests/ with:  CHROME=<headless shell> node ../docs/team-minimum-options/baseline.cjs
const path = require('path');
const L = require(path.resolve(__dirname, '../../tests/lib'));
const OUT = __dirname;
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW));
const people = [
  { id: 'gus', name: 'Gus', role: 'head', active: true, add: true, tick: true, del: true },
  { id: 'sam', name: 'Sam K', role: 'sous', active: true, add: true, tick: true, del: true },
  ...['Ari', 'Bea', 'Cal', 'Dev', 'Eli', 'Fen', 'Gia', 'Hal'].map(n => ({ id: n.toLowerCase(), name: n, role: 'staff', active: true, add: true, tick: true }))
];
// the head chef's real day (docs/home-staff-first.md): Lunch 10:00 to 15:00, Dinner 15:00 to 21:00
const services = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 900, to: 1260 }];
const sections = ['Grill', 'Pans', 'Larder', 'Fryer', 'Dessert', 'Pass'].map(n => ({ id: n.toLowerCase(), name: n }));
const on = [
  ['sam', 'lunch', ''], ['sam', 'dinner', ''],
  ['ari', 'lunch', 'grill'], ['ari', 'dinner', 'grill'], ['bea', 'lunch', 'pans'], ['bea', 'dinner', 'pans'],
  ['cal', 'lunch', 'dessert'], ['dev', 'dinner', 'fryer'], ['eli', 'lunch', 'larder'], ['eli', 'dinner', 'pass'],
  ['fen', 'dinner', 'dessert'], ['gia', 'lunch', 'fryer'], ['gia', 'dinner', 'larder'], ['hal', 'dinner', 'larder']
].map(([id, sh, sec]) => ({ id, sh, sec }));
// breaks: a split for the doubles in the afternoon, then three meal breaks that overlap in the dinner rush
const br = [
  ['ari', 'dinner', 870, 150], ['bea', 'dinner', 870, 150], ['eli', 'lunch', 780, 30], ['gia', 'dinner', 900, 150],
  ['dev', 'dinner', 1095, 30], ['fen', 'dinner', 1095, 45], ['hal', 'dinner', 1110, 30], ['sam', 'dinner', 1110, 30]
].map(([id, sh, at, len]) => ({ id, sh, at, len }));
const fixture = () => ({
  [key('config', 'main')]: { people, headId: 'gus', sousIds: ['sam'], staffIds: people.map(p => p.id), kitShifts: services, kitSecs: sections },
  [key('team', today)]: { day: today, on, br, v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'gus' }
});
const AT_1830 = L.NOW + 4.5 * 3600000;
(async () => {
  const b = await L.start(), out = {};
  for (const [label, hash, opts] of [['admin-390', '#/admin', { admin: true, adminPage: 'plan', width: 390 }], ['team-390', '#/team', { who: 'sam', width: 390 }], ['admin-1280', '#/admin', { admin: true, adminPage: 'plan', width: 1280 }]]) {
    const p = await L.open(b, hash, Object.assign({ extra: fixture(), wait: 1800, clock: AT_1830 }, opts));
    await L.waitFor(p, () => document.querySelectorAll('.tm-grid-row').length >= 7, null, 9000); await L.settle(p, 400);
    out[label] = await p.evaluate(() => {
      const t = s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; };
      const r = s => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top + scrollY), h: Math.round(b.height) }; };
      return { board: t('.tm-away'), boardBox: r('.tm-away'), gridHead: t('.tm-grid-head'), gridBox: r('.tm-grid'), save: r('.tm-focus-save'), pageH: document.documentElement.scrollHeight, rows: document.querySelectorAll('.tm-grid-row').length };
    });
    await p.screenshot({ path: path.join(OUT, 'baseline-' + label + '.png'), fullPage: label !== 'admin-1280' });
    if (label === 'admin-390') {
      // today's only way to check the dinner rush: Whole day review, then read every line and count by hand
      await p.locator('[data-p="tm-whole"]').first().click(); await L.settle(p, 300);
      out[label].whole = await p.evaluate(() => ({ lines: document.querySelectorAll('.tm-dayline').length, people: document.querySelectorAll('.tm-dayperson').length, h: Math.round(document.querySelector('.tm-day').getBoundingClientRect().height) }));
      await p.locator('.tm-day').screenshot({ path: path.join(OUT, 'baseline-whole-390.png') });
    }
    await p.context().close();
  }
  require('fs').writeFileSync(path.join(OUT, 'baseline.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
