// Implemented app for docs/team-sections-options/brief.md: the built day grid in the click-test stand-in, with the
// same made-up days and tasks as baseline.cjs (which measured the C row before the change). Synthetic data only.
// Run from tests/ with the test server up:  CHROME=<headless shell> node ../docs/team-sections-options/implemented.cjs
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
const services = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'adl', name: 'All day dining', from: 900, to: 1020 }, { id: 'dinner', name: 'Dinner', from: 1020, to: 1320 }];
const sections = ['Grill', 'Pans', 'Larder', 'Fryer', 'Dessert', 'Pass'].map(n => ({ id: n.toLowerCase(), name: n }));
// roster shifts (made up) and the services each touches, as the import fills them
const shifts = { ari: ['lunch', 'adl', 'dinner'], bea: ['lunch', 'adl', 'dinner'], cal: ['lunch'], dev: ['adl', 'dinner'], eli: ['lunch', 'adl', 'dinner'], fen: ['adl', 'dinner'], gia: ['lunch', 'adl'], hal: ['dinner'] };
// what the chef wants: most keep one section all day, two change at dinner
const want = { ari: { lunch: 'grill', adl: 'grill', dinner: 'grill' }, bea: { lunch: 'pans', adl: 'pans', dinner: 'pans' }, cal: { lunch: 'larder' }, dev: { adl: 'fryer', dinner: 'fryer' },
  eli: { lunch: 'larder', adl: 'larder', dinner: 'pass' }, fen: { adl: 'dessert', dinner: 'dessert' }, gia: { lunch: 'fryer', adl: 'pans' }, hal: { dinner: 'larder' } };
// the head chef's real day (docs/home-staff-first.md): Lunch 10:00 to 15:00, Dinner 15:00 to 21:00, doubles often move
const FX = {
  three: { services, shifts, want },
  double: { services: [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 900, to: 1260 }],
    shifts: { ari: ['lunch', 'dinner'], bea: ['lunch', 'dinner'], cal: ['lunch'], dev: ['lunch', 'dinner'], eli: ['lunch', 'dinner'], fen: ['dinner'], gia: ['lunch', 'dinner'], hal: ['lunch', 'dinner'] },
    want: { ari: { lunch: 'grill', dinner: 'pans' }, bea: { lunch: 'pans', dinner: 'grill' }, cal: { lunch: 'dessert' }, dev: { lunch: 'fryer', dinner: 'fryer' }, eli: { lunch: 'larder', dinner: 'pass' }, fen: { dinner: 'dessert' }, gia: { lunch: 'pass', dinner: 'larder' }, hal: { lunch: 'larder', dinner: 'fryer' } } }
};
let fx = FX.three;
const onOf = f => { const on = []; Object.keys(f.shifts).forEach(id => f.shifts[id].forEach(sh => on.push({ id, sh, sec: '' }))); return on; };
const fixture = () => ({
  [key('config', 'main')]: { people, headId: 'gus', sousIds: ['sam'], staffIds: people.map(p => p.id), kitShifts: fx.services, kitSecs: sections },
  [key('team', today)]: { day: today, on: onOf(fx), br: [], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'gus' }
});
const ready = p => L.waitFor(p, () => document.querySelectorAll('.tm-grid-row').length >= 8, null, 9000);
async function rows(p) {
  return p.evaluate(() => {
    const nav = document.querySelector('.tabbar'), save = document.querySelector('.tm-focus-save');
    let bottom = innerHeight;
    if (nav && nav.getClientRects().length) { const r = nav.getBoundingClientRect(); if (r.top > innerHeight / 2) bottom = Math.min(bottom, r.top); }
    if (save) { const r = save.getBoundingClientRect(); if (r.top > 0 && r.top < bottom) bottom = r.top; }
    const list = [...document.querySelectorAll('.tm-person-row')], head = document.querySelector('.tm-grid-head');
    // rows under the stuck service heads do not count as visible
    let top = 0; if (head) { const hr = head.getBoundingClientRect(); if (hr.top <= 120 && hr.bottom > 0) top = hr.bottom; }
    return { complete: list.filter(e => { const r = e.getBoundingClientRect(); return r.top >= top - 0.5 && r.bottom <= bottom; }).length, firstTop: list[0] ? Math.round(list[0].getBoundingClientRect().top) : null, rowH: list[0] ? Math.round(list[0].getBoundingClientRect().height) : null, pageH: document.documentElement.scrollHeight };
  });
}
(async () => {
  const b = await L.start(), out = {};
  for (const [label, hash, opts, fxName] of [['team-390', '#/team', { who: 'sam', width: 390 }, 'three'], ['admin-390', '#/admin', { admin: true, adminPage: 'plan', width: 390 }, 'three'], ['admin-1280', '#/admin', { admin: true, adminPage: 'plan', width: 1280 }, 'three'], ['double-admin-390', '#/admin', { admin: true, adminPage: 'plan', width: 390 }, 'double']]) {
    fx = FX[fxName]; const shifts = fx.shifts, want = fx.want, on = onOf(fx);
    const p = await L.open(b, hash, Object.assign({ extra: fixture(), wait: 1800 }, opts));
    await ready(p); await L.settle(p, 400);
    out[label] = { before: await rows(p) };
    // the working screen: the first row just under the sticky top bar
    // the working screen: the service heads stuck at the top (under the admin room tabs on a phone), rows under them
    await p.evaluate(() => { const h = document.querySelector('.tm-grid-head'), inset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tm-grid-top')) || 0; window.scrollTo(0, h.getBoundingClientRect().top + scrollY - inset); }); await L.settle(p, 160);
    out[label].working = (await rows(p)).complete; await p.evaluate(() => window.scrollTo(0, 0)); await L.settle(p, 120);
    if (fxName === 'three' || label === 'double-admin-390') await p.screenshot({ path: path.join(OUT, 'built-' + label + '.png') });
    if (/admin-390/.test(label)) {
      // open Ari's Dinner break details: Service to edit to Dinner, then Edit breaks
      let bt = 0; await p.locator('[data-p="tm-focus"][data-id="ari"]').click(); await L.settle(p, 200); bt += 1;
      if (await p.locator('.tm-detail-workbench').getAttribute('data-sh') !== 'dinner') { await p.locator('.tm-detail-workbench [data-p="tm-sh"][data-v="dinner"]').click(); await L.settle(p, 200); bt += 1; }
      out[label].breaks = { taps: bt, named: (await p.locator('.tm-detail-workbench h3').innerText()) };
      await p.locator('[data-p="tm-focus-close"]').click(); await L.settle(p, 200);
      // the task: every person a section on every service they work, then Save. Each picker = open + choose = 2 taps.
      let taps = 0;
      for (const id of Object.keys(want)) {
        const list = shifts[id];
        for (let i = 0; i < list.length; i++) { await L.pick(p, 'select[data-k="tm-sec:' + id + ':' + list[i] + '"]', want[id][list[i]]); taps += 2; }
      }
      await p.locator('[data-p="tm-save"]').click(); taps += 1;
      await L.waitFor(p, k => __fake.dump()[k].v === 2, key('team', today), 8000);
      const saved = await p.evaluate(k => __fake.dump()[k].on, key('team', today));
      const right = saved.every(o => want[o.id][o.sh] === o.sec) && saved.length === on.length;
      out[label].task = { taps, cells: on.length, people: Object.keys(want).length, savedRight: right };
      await p.evaluate(() => { const r = document.querySelector('.tm-grid-head'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 70); }); await L.settle(p, 200);
      await p.screenshot({ path: path.join(OUT, 'built-' + label + '-after.png') });
      // one correction: Eli's Dinner becomes Grill, then Save
      let ft = 0; await L.pick(p, 'select[data-k="tm-sec:eli:dinner"]', 'grill'); ft += 2; await p.locator('[data-p="tm-save"]').click(); ft += 1;
      await L.waitFor(p, k => __fake.dump()[k].v === 3, key('team', today), 8000);
      out[label].fixOne = { taps: ft, right: (await p.evaluate(k => __fake.dump()[k].on, key('team', today))).some(o => o.id === 'eli' && o.sh === 'dinner' && o.sec === 'grill') };
    }
    await p.context().close();
  }
  console.log(JSON.stringify(out, null, 2));
  require('fs').writeFileSync(path.join(OUT, 'implemented.json'), JSON.stringify(out, null, 2) + '\n');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
