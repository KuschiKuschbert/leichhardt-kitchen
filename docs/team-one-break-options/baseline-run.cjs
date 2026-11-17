// Baseline for one break per person (17 Nov 2026): the admin panel's Today's team in the test stand-in, made-up staff,
// a day as the roster file leaves it since the head chef chose "cut to each service" (16 Nov 2026): a 10:00 to 21:00
// cook is on Lunch 10:00 to 15:00, All day 15:00 to 17:00 and Dinner 17:00 to 21:00. Counts the break controls and
// the taps, and takes the screenshots. Run from the repo:
//   CHROME=<chrome-headless-shell> node docs/team-one-break-options/baseline-run.cjs
const path = require('path');
const L = require(path.join(__dirname, '../../tests/lib'));
const OUT = __dirname + '/';
const F = require('./fixture.cjs');
const log = (k, v) => console.log(k + ': ' + JSON.stringify(v));
let taps = 0;
const tap = async (p, sel) => { await p.locator(sel).first().click(); taps++; await L.settle(p, 150); };
const choose = async (p, sel, v) => { await L.pick(p, sel, String(v)); taps++; await L.settle(p, 150); };
const open = (b, w, init) => L.open(b, '#/admin', { admin: true, adminPage: 'plan', width: w, height: w === 390 ? 844 : w === 768 ? 1024 : 900, extra: F.fixture(), wait: 1800, init });
const ready = p => L.waitFor(p, () => document.querySelectorAll('.tm-person-row').length >= 9, null, 9000);
const H = F.H;

(async () => {
  const srv = require(path.join(__dirname, '../../tests/serve'));
  await new Promise(r => srv.listen(8777, '127.0.0.1', r));
  const b = await L.start();
  for (const w of [390, 1280]) {
    const p = await open(b, w); await ready(p);
    log(w + ' + Break buttons on the page', await p.$$eval('[data-p="tm-addbr"]', l => l.length));
    log(w + ' Mo + Break buttons', await p.$$eval('.tm-person-row[data-id="mo"] [data-p="tm-addbr"]', l => l.map(e => e.getAttribute('aria-label'))));
    log(w + ' Gus + Break buttons', await p.$$eval('.tm-person-row[data-id="gus"] [data-p="tm-addbr"]', l => l.length));
    log(w + ' Mo row px', await p.$eval('.tm-person-row[data-id="mo"]', e => Math.round(e.getBoundingClientRect().height)));
    // Mo: one break. The + Break on the first line (Lunch) gives a 30 minute break in the middle of Lunch, not a split
    taps = 0;
    await tap(p, '[data-p="tm-addbr"][data-id="mo"][data-sh="lunch"]');
    const first = await p.$eval('.tm-person-row[data-id="mo"] .tm-roster-time', e => e.textContent);
    log(w + ' Mo after one + Break on Lunch', { taps, words: first });
    // and what a planner does to give Mo one break at 15:00 (All day): that line's + Break, then the time
    const p2 = await open(b, w); await ready(p2); taps = 0;
    await tap(p2, '[data-p="tm-addbr"][data-id="mo"][data-sh="allday"]');
    const offered = await p2.$eval('select[data-k="tm-at:mo:allday:0"]', e => [...e.options].map(o => o.textContent).filter(t => t !== 'No break'));
    log(w + ' Mo break times offered on All day', { first: offered[0], last: offered[offered.length - 1], count: offered.length });
    await choose(p2, 'select[data-k="tm-at:mo:allday:0"]', H(15));
    log(w + ' Mo: one break at 15:00 on All day, taps', taps);
    // a meal break and a second break for Mo (14:00 on Lunch, 18:30 on Dinner): two lines, two + Break
    taps = 0;
    const p3 = await open(b, w); await ready(p3);
    await tap(p3, '[data-p="tm-addbr"][data-id="mo"][data-sh="lunch"]');
    await choose(p3, 'select[data-k="tm-at:mo:lunch:0"]', H(13));
    await tap(p3, '[data-p="tm-addbr"][data-id="mo"][data-sh="dinner"]');
    await choose(p3, 'select[data-k="tm-at:mo:dinner:0"]', H(18, 30));
    log(w + ' Mo: break 13:00 and second break 18:30, taps', { taps, words: await p3.$eval('.tm-person-row[data-id="mo"] .tm-roster-time', e => e.textContent) });
    if (w === 390) {
      await p3.evaluate(() => { const r = document.querySelector('.tm-person-row[data-id="mo"]'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 200); }); await L.settle(p3, 200);
      await p3.screenshot({ path: OUT + 'baseline-mo-390.png' });
    } else await p3.screenshot({ path: OUT + 'baseline-day-1280.png', fullPage: true });
    log(w + ' sideways scroll, errors', { over: await L.overflow(p3), errors: [p.errors, p2.errors, p3.errors].flat() });
    for (const x of [p, p2, p3]) await x.context().close();
  }
  // the whole day at 1280: a section and one break each for the 7 cooks, at the time a planner would pick, then Save
  const p = await open(b, 1280); await ready(p); taps = 0;
  for (const id of Object.keys(F.plan)) {
    const [sec, at] = F.plan[id], lines = F.lines[id];
    for (const sh of lines) await choose(p, 'select[data-k="tm-sec:' + id + ':' + sh + '"]', sec);
    const sh = F.brSh[id];
    await tap(p, '[data-p="tm-addbr"][data-id="' + id + '"][data-sh="' + sh + '"]');
    await choose(p, 'select[data-k="tm-at:' + id + ':' + sh + ':0"]', at);
  }
  await tap(p, '[data-p="tm-save"]');
  await L.waitFor(p, () => /saved at/i.test(document.body.innerText), null, 5000).catch(() => {});
  log('1280 whole day: 7 cooks, a section on every line and one break each, then Save', { taps, saved: /saved at/i.test(await p.evaluate(() => document.body.innerText)) });
  await p.context().close();
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
