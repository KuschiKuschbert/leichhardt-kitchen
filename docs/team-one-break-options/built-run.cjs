// The built design D (17 Nov 2026) in the implemented app: the same tasks as the previews (preview-run.cjs D,
// after-run.cjs D, spread-run.cjs), the admin panel's Today's team and a sous chef on #/team, the test stand-in,
// made-up staff (fixture.cjs). Run from the repo:  CHROME=<chrome-headless-shell> node docs/team-one-break-options/built-run.cjs
const path = require('path');
const L = require(path.join(__dirname, '../../tests/lib'));
const F = require('./fixture.cjs');
const OUT = __dirname + '/', H = F.H;
const log = (k, v) => console.log(k + ': ' + JSON.stringify(v));
let taps = 0;
const tap = async (p, sel) => { await p.locator(sel).first().click(); taps++; await L.settle(p, 150); };
const choose = async (p, sel, v) => { await L.pick(p, sel, String(v)); taps++; await L.settle(p, 150); };
const open = (b, w, extra) => L.open(b, '#/admin', { admin: true, adminPage: 'plan', width: w, height: w === 390 ? 844 : w === 768 ? 1024 : 900, extra: extra || F.fixture(), wait: 1800 });
const ready = p => L.waitFor(p, () => document.querySelectorAll('.tm-person-row').length >= 9, null, 9000);
const words = (p, id) => p.$eval('.tm-person-row[data-id="' + id + '"] .tm-roster-time', e => e.textContent);
const said = p => p.evaluate(() => { const m = document.body.innerText.match(/^(Mo|Dev|Gus|Bea|Ari|Cal|Eli|Fen|Sam)( taken off|: )[^\n]*/m); return m ? String(m[0]) : ''; });
const addBr = (p, id) => tap(p, '[data-p="tm-addbr"][data-id="' + id + '"]');
const pickAt = async (p, id, n, m) => choose(p, 'select[data-k="' + await L.brKey(p, id, n) + '"]', m);
const rows = p => p.evaluate(() => ['mo', 'bea', 'gus'].map(id => Math.round(document.querySelector('.tm-person-row[data-id="' + id + '"]').getBoundingClientRect().height)));
const fit = p => p.evaluate(() => {
  const r = [...document.querySelectorAll('.tm-person-row')], head = document.querySelector('.tm-grid-head'), dock = document.querySelector('.tm-save');
  window.scrollTo(0, r[0].getBoundingClientRect().top + scrollY - (head ? head.getBoundingClientRect().height : 0) - 2);
  const top = head ? head.getBoundingClientRect().bottom : 0, bottom = dock ? Math.min(innerHeight, dock.getBoundingClientRect().top) : innerHeight;
  return r.filter(x => { const g = x.getBoundingClientRect(); return g.top >= top - 3 && g.bottom <= bottom + 1; }).length;
});

(async () => {
  const srv = require(path.join(__dirname, '../../tests/serve'));
  await new Promise(r => srv.listen(8777, '127.0.0.1', r));
  const b = await L.start();
  for (const w of [390, 768, 1280]) {
    let p = await open(b, w); await ready(p);
    log(w + ' + Break buttons on the page', await p.$$eval('[data-p="tm-addbr"]', l => l.length));
    log(w + ' row px no breaks Mo, Bea, Gus', await rows(p));
    log(w + ' rows wholly in one screen from the first row', await fit(p));
    if (w === 390) { await p.evaluate(() => window.scrollTo(0, 0)); await L.settle(p, 100); await p.screenshot({ path: OUT + 'built-plan-390.png' }); }
    taps = 0; await addBr(p, 'mo'); log(w + ' Mo + Break once', { taps, words: await words(p, 'mo'), said: await said(p) });
    await addBr(p, 'gus'); log(w + ' Gus + Break once', { words: await words(p, 'gus'), said: await said(p) });
    await addBr(p, 'dev'); log(w + ' Dev + Break once', { words: await words(p, 'dev'), said: await said(p) });
    await p.context().close();
    // Mo: split 15:00 to 17:30 and a 2nd break at 19:00
    p = await open(b, w); await ready(p); taps = 0;
    await addBr(p, 'mo'); await pickAt(p, 'mo', 0, H(15)); await addBr(p, 'mo');
    const k2 = (await p.$$eval('select[data-k^="tm-bat:mo:"]', l => l.map(e => e.getAttribute('data-k')))).filter(k => k.split(':')[2] !== String(H(15)))[0];
    await choose(p, 'select[data-k="' + k2 + '"]', H(19));
    log(w + ' Mo split 15:00 and a 2nd break 19:00', { taps, words: await words(p, 'mo') });
    if (w === 390) { await p.evaluate(() => { const r = document.querySelector('.tm-person-row[data-id="mo"]'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 200); }); await L.settle(p, 200); await p.screenshot({ path: OUT + 'built-mo-390.png' }); }
    log(w + ' sideways scroll, errors', { over: await L.overflow(p), errors: p.errors });
    await p.context().close();
    // everyone a break at the book's own times
    p = await open(b, w); await ready(p);
    for (const id of ['gus', 'sam', 'ari', 'bea', 'cal', 'dev', 'eli', 'fen', 'mo']) await addBr(p, id);
    log(w + ' row px everyone a break Mo, Bea, Gus', await rows(p));
    if (w === 390) { await p.evaluate(() => { const r = document.querySelector('.tm-person-row[data-id="dev"]'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 120); }); await L.settle(p, 200); await p.screenshot({ path: OUT + 'built-rows-390.png' }); }
    if (w === 1280) await p.screenshot({ path: OUT + 'built-day-1280.png', fullPage: true });
    if (w === 768) await p.screenshot({ path: OUT + 'built-day-768.png', fullPage: true });
    log(w + ' everyone: sideways scroll, errors', { over: await L.overflow(p), errors: p.errors });
    await p.context().close();
  }
  // the whole day at 1280: sections on every line and one break each at the planner's times, then Save
  let p = await open(b, 1280); await ready(p); taps = 0;
  for (const id of Object.keys(F.plan)) {
    const [sec, at] = F.plan[id];
    for (const sh of F.lines[id]) await choose(p, 'select[data-k="tm-sec:' + id + ':' + sh + '"]', sec);
    await addBr(p, id); await pickAt(p, id, 0, at);
  }
  await tap(p, '[data-p="tm-save"]');
  await L.waitFor(p, () => /saved at/i.test(document.body.innerText), null, 5000).catch(() => {});
  log('1280 the day at the planner\'s times, then Save', { taps, saved: /saved at/i.test(await p.evaluate(() => document.body.innerText)) });
  await p.context().close();
  // Take off and Undo, an old day, Spread
  p = await open(b, 390); await ready(p);
  await addBr(p, 'mo'); await addBr(p, 'dev'); await pickAt(p, 'dev', 0, H(15, 30));
  await tap(p, '[data-p="tm-off"][data-id="mo"][data-sh="lunch"]'); await tap(p, '[data-p="tm-off"][data-id="mo"][data-sh="lunch"]');
  log('390 take Mo off Lunch (split 14:30)', { said: await said(p), words: await words(p, 'mo') });
  await tap(p, '[data-p="tm-off-undo"]'); log('390 Undo', { words: await words(p, 'mo') });
  await tap(p, '[data-p="tm-off"][data-id="dev"][data-sh="lunch"]'); await tap(p, '[data-p="tm-off"][data-id="dev"][data-sh="lunch"]');
  log('390 take Dev off Lunch (break 15:30 on All day)', { said: await said(p), words: await words(p, 'dev') });
  log('390 take off: errors', p.errors);
  await p.context().close();
  const ex = F.fixture(); ex[F.TEAM] = Object.assign({}, ex[F.TEAM], { br: [{ id: 'ari', sh: 'lunch', at: H(11), len: 30 }, { id: 'ari', sh: 'lunch', at: H(12, 30), len: 30 }, { id: 'ari', sh: 'lunch', at: H(14), len: 30 }] });
  p = await open(b, 390, ex); await ready(p);
  log('390 old day, Ari three breaks', { pickers: await p.$$eval('select[data-k^="tm-bat:ari:"]', l => l.length), add: await p.$$eval('[data-p="tm-addbr"][data-id="ari"]', l => l.length), words: await words(p, 'ari'), save: await p.locator('[data-p="tm-save"]').isDisabled() });
  await p.context().close();
  p = await open(b, 1280); await ready(p);
  await addBr(p, 'mo'); await tap(p, 'details.tm-batch > summary');
  const sp = [];
  for (const sh of ['lunch', 'allday', 'dinner']) { await L.pick(p, 'select[data-k="tm-tool-sh"]', sh); await L.settle(p, 150); await tap(p, '[data-p="tm-spread"]'); sp.push(await p.evaluate(() => { const m = document.body.innerText.match(/\d+ (breaks?|splits?) from[^\n]*/); return m ? String(m[0]) : ''; })); }
  log('1280 Spread on Lunch, All day, Dinner after Mo\'s split', { mo: await words(p, 'mo'), dev: await words(p, 'dev'), said: sp, errors: p.errors });
  await p.context().close();
  // a sous chef on #/team, 390
  p = await L.open(b, '#/team', { who: 'sam', width: 390, height: 844, extra: F.fixture(), wait: 1800 });
  await L.waitFor(p, () => document.querySelectorAll('.tm-person-row').length >= 9, null, 9000).catch(() => {});
  await addBr(p, 'bea');
  log('390 sous chef on #/team', { rows: await p.evaluate(() => document.querySelectorAll('.tm-tlrow').length), bea: await words(p, 'bea'), said: await said(p), over: await L.overflow(p), errors: p.errors });
  await p.context().close();
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
