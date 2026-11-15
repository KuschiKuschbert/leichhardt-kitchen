// Baseline for the council (16 Nov 2026): the admin panel's Today's team today, in the test stand-in, with made-up staff
// in the head chef's Monday situation: Lunch, Dinner, a hidden Smoker (06:00 to 15:00) the roster file put the lunch
// cooks on before the hide existed, and an All day shift added last. Run from the repo:
//   CHROME=<chrome-headless-shell> node docs/team-order-clear-options/baseline-run.cjs
const path = require('path');
const L = require(path.join(__dirname, '../../tests/lib'));
const OUT = __dirname + '/';
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW)), TEAM = key('team', today), CFG = key('config', 'main');
const people = [
  { id: 'gus', name: 'Gus', role: 'head', active: true, add: true, tick: true, del: true },
  { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true },
  ...['Ari', 'Bea', 'Cal', 'Dev', 'Eli', 'Fen', 'Mo'].map(n => ({ id: n.toLowerCase(), name: n, role: 'staff', active: true, add: true, tick: true }))
];
// saved order: the order they were added in Admin, Kitchen, Shifts
const SHIFTS = [
  { id: 'lunch', name: 'Lunch', from: 600, to: 900, off: false },
  { id: 'dinner', name: 'Dinner', from: 1020, to: 1260, off: false },
  { id: 'smoker', name: 'Smoker', from: 360, to: 900, off: false, occ: true },
  { id: 'allday', name: 'All day', from: 600, to: 1260, off: false }
];
const SECS = ['Grill', 'Pans', 'Larder', 'Fryer'].map(n => ({ id: n.toLowerCase(), name: n }));
const on = [];
['ari', 'bea', 'cal', 'dev'].forEach(id => { on.push({ id, sh: 'lunch', sec: '' }); on.push({ id, sh: 'smoker', sec: '' }); });
['gus'].forEach(id => ['lunch', 'dinner', 'smoker'].forEach(sh => on.push({ id, sh, sec: '' })));
['sam', 'eli', 'fen'].forEach(id => on.push({ id, sh: 'dinner', sec: '' }));
on.push({ id: 'mo', sh: 'allday', sec: '' });
const fixture = () => ({
  [CFG]: { people, headId: 'gus', sousIds: ['sam'], staffIds: people.map(p => p.id), kitShifts: SHIFTS, kitSecs: SECS },
  [TEAM]: { day: today, on, br: [], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'gus' }
});
const log = (k, v) => console.log(k + ': ' + JSON.stringify(v));
const ready = p => L.waitFor(p, () => document.querySelectorAll('.tm-grid-row').length >= 9, null, 9000);
let taps = 0;
const tap = async (p, sel) => { await p.locator(sel).first().click(); taps++; await L.settle(p, 150); };

(async () => {
  const srv = require(path.join(__dirname, '../../tests/serve'));
  await new Promise(r => srv.listen(8777, '127.0.0.1', r));
  const b = await L.start();
  for (const w of [390, 1280]) {
    const p = await L.open(b, '#/admin', { admin: true, adminPage: 'plan', width: w, height: w === 390 ? 844 : 900, extra: fixture(), wait: 1800 });
    await ready(p);
    log(w + ' grid columns', await p.$$eval('.tm-grid-head .tm-grid-sh', l => l.map(e => e.innerText.replace(/\n/g, ' / '))));
    await p.locator('[data-p="tm-focus"][data-id="ari"]').click(); await L.settle(p, 300);
    log(w + ' Ari details chips', await p.$$eval('.tm-bench-shifts button', l => l.map(e => e.textContent)));
    await p.locator('[data-p="tm-focus"][data-id="ari"]').click(); await L.settle(p, 300);
    const add = p.locator('[data-p="tm-add-staff"]').first();
    if (await add.count()) { await add.click(); await L.settle(p, 300); log(w + ' Add staff services', await p.$$eval('.tm-quick-services label, .tm-quick-services button', l => l.map(e => e.textContent.trim()))); await add.click(); await L.settle(p, 200); }
    log(w + ' tools fold', await p.$eval('details.tm-batch summary', e => e.textContent));
    await p.screenshot({ path: OUT + 'baseline-plan-' + w + '.png', fullPage: true });
    log(w + ' errors', p.errors);
    await p.context().close();
  }
  // Clear the whole day today, 390 px: Breaks, then for each shift the person is on, its chip and Remove; then Save
  const p = await L.open(b, '#/admin', { admin: true, adminPage: 'plan', width: 390, height: 844, extra: fixture(), wait: 1800 });
  await ready(p); taps = 0;
  const plan = {};
  on.forEach(o => { (plan[o.id] = plan[o.id] || []).push(o.sh); });
  for (const id of Object.keys(plan)) {
    await tap(p, '[data-p="tm-focus"][data-id="' + id + '"]');
    for (const sh of plan[id]) {
      const cur = await p.$eval('.tm-detail-workbench', e => e.getAttribute('data-sh'));
      if (cur !== sh) await tap(p, '[data-p="tm-sh"][data-id="' + id + '"][data-v="' + sh + '"]');
      await tap(p, '.tm-detail-workbench [data-p="tm-on"][data-id="' + id + '"][data-sh="' + sh + '"]');
    }
  }
  const left = await p.evaluate(() => document.querySelectorAll('.tm-grid-row').length);
  log('clear the day by hand, 390 px', { people: Object.keys(plan).length, places: on.length, taps, gridRowsLeft: left, beforeSave: true });
  await p.screenshot({ path: OUT + 'baseline-cleared-390.png' });
  await p.context().close();
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
