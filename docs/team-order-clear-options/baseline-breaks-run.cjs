// Baseline for the council's second question (16 Nov 2026): a day filled from the roster file, then sections and breaks
// set by hand, in the admin panel's Today's team, in the test stand-in, with made-up staff. Counts the taps and records
// what the screen shows about each person's hours while their break is set. Run from the repo:
//   CHROME=<chrome-headless-shell> node docs/team-order-clear-options/baseline-breaks-run.cjs
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
const SHIFTS = [
  { id: 'lunch', name: 'Lunch', from: 600, to: 900, off: false },
  { id: 'dinner', name: 'Dinner', from: 1020, to: 1260, off: false },
  { id: 'smoker', name: 'Smoker', from: 360, to: 900, off: false, occ: true },
  { id: 'allday', name: 'All day', from: 600, to: 1260, off: false }
];
const SECS = ['Grill', 'Pans', 'Larder', 'Fryer'].map(n => ({ id: n.toLowerCase(), name: n }));
// as the roster file leaves a day: everyone on, their own hours, no sections, no breaks (saved, as Save each day does)
const H = (h, m) => h * 60 + (m || 0);
const on = [
  { id: 'gus', sh: 'lunch', sec: '', from: H(8), to: H(15) }, { id: 'gus', sh: 'dinner', sec: '', from: H(17), to: H(21) },
  { id: 'ari', sh: 'lunch', sec: '', from: H(10), to: H(15) },
  { id: 'bea', sh: 'lunch', sec: '', from: H(11), to: H(15) },
  { id: 'cal', sh: 'lunch', sec: '', from: H(10), to: H(14, 30) },
  { id: 'dev', sh: 'lunch', sec: '', from: H(12), to: H(15) },
  { id: 'sam', sh: 'dinner', sec: '', from: H(16), to: H(21, 30) },
  { id: 'eli', sh: 'dinner', sec: '', from: H(17), to: H(21) },
  { id: 'fen', sh: 'dinner', sec: '', from: H(17), to: H(21) },
  { id: 'mo', sh: 'allday', sec: '', from: H(10), to: H(21) }
];
const fixture = () => ({
  [CFG]: { people, headId: 'gus', sousIds: ['sam'], staffIds: people.map(p => p.id), kitShifts: SHIFTS, kitSecs: SECS },
  [TEAM]: { day: today, on, br: [], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'gus' }
});
const log = (k, v) => console.log(k + ': ' + JSON.stringify(v));
const ready = p => L.waitFor(p, () => document.querySelectorAll('.tm-grid-row').length >= 9, null, 9000);
let taps = 0;
const tap = async (p, sel) => { await p.locator(sel).first().click(); taps++; await L.settle(p, 150); };
const choose = async (p, sel, v) => { await L.pick(p, sel, String(v)); taps++; await L.settle(p, 150); };

(async () => {
  const srv = require(path.join(__dirname, '../../tests/serve'));
  await new Promise(r => srv.listen(8777, '127.0.0.1', r));
  const b = await L.start();
  for (const w of [390, 1280]) {
    const p = await L.open(b, '#/admin', { admin: true, adminPage: 'plan', width: w, height: w === 390 ? 844 : 900, extra: fixture(), wait: 1800 });
    await ready(p); taps = 0;
    // the main task: Dev (roster 12:00 to 15:00) on Lunch at Larder, with a 30 minute break at 13:30
    await choose(p, 'select[data-k="tm-sec:dev:lunch"]', 'larder');
    await tap(p, '[data-p="tm-focus"][data-id="dev"]');
    await tap(p, '.tm-detail-workbench [data-p="tm-addbr"]');
    const offered = await p.$eval('select[data-k="tm-at:dev:0"]', e => [...e.options].map(o => o.textContent));
    await choose(p, 'select[data-k="tm-at:dev:0"]', H(13, 30));
    log(w + ' Dev: section and one break, taps before Save', taps);
    log(w + ' Dev break times offered (roster 12:00 to 15:00)', { first: offered[1], last: offered[offered.length - 1], count: offered.length - 1, defaultWas: '' });
    const seen = await p.$eval('.tm-detail-workbench', e => e.innerText.replace(/\n+/g, ' | '));
    log(w + ' details panel words', seen);
    log(w + ' roster hours visible in the details panel', /12:00 to 15:00/.test(seen));
    const rect = await p.evaluate(() => { const a = document.querySelector('.tm-detail-workbench').getBoundingClientRect(), r = document.querySelector('.tm-person-row[data-id="dev"] .tm-roster-time'); const b = r && r.getBoundingClientRect(); return { panelTop: Math.round(a.top + scrollY), rosterLineTop: b ? Math.round(b.top + scrollY) : null, viewport: innerHeight }; });
    log(w + ' where the roster hours sit', rect);
    await p.screenshot({ path: OUT + 'baseline-breaks-' + w + '.png', fullPage: true });
    log(w + ' errors', p.errors);
    await p.context().close();
  }
  // whole day at 1280: a section and one 30 minute break for each of the 8 cooks (chefs keep their role), then Save
  const p = await L.open(b, '#/admin', { admin: true, adminPage: 'plan', width: 1280, height: 900, extra: fixture(), wait: 1800 });
  await ready(p); taps = 0;
  const plan = { ari: ['lunch', 'grill', H(12)], bea: ['lunch', 'pans', H(13)], cal: ['lunch', 'fryer', H(12, 30)], dev: ['lunch', 'larder', H(13, 30)], eli: ['dinner', 'grill', H(18)], fen: ['dinner', 'pans', H(18, 30)], mo: ['allday', 'larder', H(15)] };
  for (const id of Object.keys(plan)) {
    const [sh, sec, at] = plan[id];
    await choose(p, 'select[data-k="tm-sec:' + id + ':' + sh + '"]', sec);
    await tap(p, '[data-p="tm-focus"][data-id="' + id + '"]');
    await tap(p, '.tm-detail-workbench [data-p="tm-addbr"]');
    await choose(p, 'select[data-k="tm-at:' + id + ':0"]', at);
  }
  await tap(p, '[data-p="tm-save"]');
  log('1280 whole day: 7 cooks, a section and one break each, then Save', { taps });
  await p.context().close();
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
