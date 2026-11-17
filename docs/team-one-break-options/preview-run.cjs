// Round 2 previews (17 Nov 2026): today's page and designs A, B and C (window.__ob, preview-prep.patch and
// preview-css.patch applied), the admin panel's Today's team in the test stand-in, made-up staff (fixture.cjs).
// The same tasks for each. Run from a checkout with the patches applied (port 8779):
//   BASE=http://127.0.0.1:8779/ CHROME=<chrome-headless-shell> node docs/team-one-break-options/preview-run.cjs [A B C D]
const path = require('path');
const L = require(path.join(__dirname, '../../tests/lib'));
const F = require('./fixture.cjs');
const OUT = __dirname + '/', H = F.H;
const log = (k, v) => console.log(k + ': ' + JSON.stringify(v));
let taps = 0;
const tap = async (p, sel) => { await p.locator(sel).first().click(); taps++; await L.settle(p, 150); };
const choose = async (p, sel, v) => { await L.pick(p, sel, String(v)); taps++; await L.settle(p, 150); };
const open = (b, v, w, extra) => L.open(b, '#/admin', { admin: true, adminPage: 'plan', width: w, height: w === 390 ? 844 : w === 768 ? 1024 : 900, extra: extra || F.fixture(), wait: 1800, init: 'window.__ob=' + JSON.stringify(v) });
const ready = p => L.waitFor(p, () => document.querySelectorAll('.tm-person-row').length >= 9, null, 9000);
const words = (p, id) => p.$eval('.tm-person-row[data-id="' + id + '"] .tm-roster-time', e => e.textContent);
const said = p => p.evaluate(() => { const m = document.body.innerText.match(/(Filled for you|Mo:|Dev:|Gus:|Mo taken|Undone)[^\n]*/); return m ? String(m[0]) : ''; });
// + Break for a person: today's is on a service line (sh), a design's on the person
const addBr = (p, v, id, sh) => tap(p, v ? '[data-p="tm-ob-add"][data-id="' + id + '"]' : '[data-p="tm-addbr"][data-id="' + id + '"][data-sh="' + sh + '"]');
const atSel = async (p, v, id, sh, n) => v ? 'select[data-k^="tm-ob-at:' + id + ':"] >> nth=' + n : 'select[data-k="tm-at:' + id + ':' + sh + ':0"]';
const pickAt = async (p, v, id, sh, n, m) => {
  if (!v) return choose(p, 'select[data-k="tm-at:' + id + ':' + sh + ':0"]', m);
  const k = await p.$$eval('select[data-k^="tm-ob-at:' + id + ':"]', l => l.map(e => e.getAttribute('data-k')));
  return choose(p, 'select[data-k="' + k[n] + '"]', m);
};
const pickLen = async (p, v, id, sh, n, l) => {
  if (!v) return choose(p, 'select[data-k="tm-len:' + id + ':' + sh + ':0"]', l);
  const k = await p.$$eval('select[data-k^="tm-ob-len:' + id + ':"]', x => x.map(e => e.getAttribute('data-k')));
  return choose(p, 'select[data-k="' + k[n] + '"]', l);
};
const fit = (p, fromId) => p.evaluate(id => {
  const rows = [...document.querySelectorAll('.tm-person-row')], head = document.querySelector('.tm-grid-head'), dock = document.querySelector('.tm-save');
  const start = id ? document.querySelector('.tm-person-row[data-id="' + id + '"]') : rows[0];
  window.scrollTo(0, start.getBoundingClientRect().top + scrollY - (head ? head.getBoundingClientRect().height : 0) - 2);
  const top = head ? head.getBoundingClientRect().bottom : 0, bottom = dock ? Math.min(innerHeight, dock.getBoundingClientRect().top) : innerHeight;
  const hs = rows.map(r => r.getBoundingClientRect().height).sort((a, c) => a - c);
  return { rows: rows.filter(r => { const x = r.getBoundingClientRect(); return x.top >= top - 3 && x.bottom <= bottom + 1; }).length, medianRow: Math.round(hs[Math.floor(hs.length / 2)]), list: Math.round(document.querySelector('.tm-people').getBoundingClientRect().height) };
}, fromId || '');

(async () => {
  const srv = require(path.join(__dirname, '../../tests/serve'));
  await new Promise(r => srv.listen(8779, '127.0.0.1', r));
  const b = await L.start();
  const designs = process.argv.slice(2).length ? process.argv.slice(2) : ['', 'A', 'B', 'C'];
  for (const v of designs) {
    const tag = v || 'today';
    for (const w of [390, 768, 1280]) {
      let p = await open(b, v, w); await ready(p);
      log(tag + ' ' + w + ' + Break buttons on the page', await p.$$eval('[data-p="tm-addbr"], [data-p="tm-ob-add"]', l => l.length));
      log(tag + ' ' + w + ' row px Mo, Bea, Gus', await p.evaluate(() => ['mo', 'bea', 'gus'].map(id => Math.round(document.querySelector('.tm-person-row[data-id="' + id + '"]').getBoundingClientRect().height))));
      log(tag + ' ' + w + ' rows in one screen from the first row', await fit(p));
      log(tag + ' ' + w + ' rows in one screen from Ari', await fit(p, 'ari'));
      if (w === 390) { await p.evaluate(() => window.scrollTo(0, 0)); await L.settle(p, 100); await p.screenshot({ path: OUT + tag + '-plan-390.png', fullPage: true }); }
      // T1 Mo: one tap on + Break, the book's own choice
      taps = 0; await addBr(p, v, 'mo', 'lunch');
      log(tag + ' ' + w + ' T1 Mo + Break once', { taps, words: await words(p, 'mo'), said: await said(p) });
      // Gus and Dev the same
      await addBr(p, v, 'gus', 'lunch'); log(tag + ' ' + w + ' Gus + Break once', { words: await words(p, 'gus'), said: await said(p) });
      await addBr(p, v, 'dev', 'lunch'); log(tag + ' ' + w + ' Dev + Break once', { words: await words(p, 'dev'), said: await said(p) });
      log(tag + ' ' + w + ' Mo break times offered', await p.$$eval(v ? 'select[data-k^="tm-ob-at:mo:"]' : 'select[data-k^="tm-at:mo:"]', l => l.map(e => [...e.options].filter(o => o.value !== '').length)));
      await p.context().close();
      // T3 Mo: split 15:00 to 17:30 and a second 30 minute break at 19:00
      p = await open(b, v, w); await ready(p); taps = 0;
      if (v) { await addBr(p, v, 'mo'); await pickAt(p, v, 'mo', '', 0, H(15)); await addBr(p, v, 'mo'); const k2 = (await p.$$eval('select[data-k^="tm-ob-at:mo:"]', l => l.map(e => e.getAttribute('data-k')))).filter(k => k !== 'tm-ob-at:mo:' + H(15))[0]; await choose(p, 'select[data-k="' + k2 + '"]', H(19)); }
      else { await addBr(p, v, 'mo', 'allday'); await pickLen(p, v, 'mo', 'allday', 0, 150); await addBr(p, v, 'mo', 'dinner'); await pickAt(p, v, 'mo', 'dinner', 0, H(19)); }
      log(tag + ' ' + w + ' T3 Mo split 15:00 and a second break 19:00', { taps, words: await words(p, 'mo') });
      if (w === 390) {
        await p.evaluate(v => { const r = v === 'B' ? document.querySelector('.ob-li[data-id="mo"]') : document.querySelector('.tm-person-row[data-id="mo"]'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 200); }, v); await L.settle(p, 200);
        await p.screenshot({ path: OUT + tag + '-mo-390.png' });
      }
      if (w === 768) await p.screenshot({ path: OUT + tag + '-mo-768.png', fullPage: true });
      log(tag + ' ' + w + ' sideways scroll, errors', { over: await L.overflow(p), errors: p.errors });
      await p.context().close();
    }
    // T5 the whole day at 1280: 7 cooks, a section on every line and one break each at the planner's time, then Save
    let p = await open(b, v, 1280); await ready(p); taps = 0;
    for (const id of Object.keys(F.plan)) {
      const [sec, at] = F.plan[id];
      for (const sh of F.lines[id]) await choose(p, 'select[data-k="tm-sec:' + id + ':' + sh + '"]', sec);
      await addBr(p, v, id, F.brSh[id]);
      await pickAt(p, v, id, F.brSh[id], 0, at);
    }
    await tap(p, '[data-p="tm-save"]');
    await L.waitFor(p, () => /saved at/i.test(document.body.innerText), null, 5000).catch(() => {});
    log(tag + ' 1280 T5 whole day at the planner\'s times, then Save', { taps, saved: /saved at/i.test(await p.evaluate(() => document.body.innerText)) });
    await p.screenshot({ path: OUT + tag + '-day-1280.png', fullPage: true });
    await p.context().close();
    // T6 the whole day at the book's own times: sections, a break for all 9 people as offered, then Save
    p = await open(b, v, 1280); await ready(p); taps = 0;
    for (const id of Object.keys(F.plan)) for (const sh of F.lines[id]) await choose(p, 'select[data-k="tm-sec:' + id + ':' + sh + '"]', F.plan[id][0]);
    if (v === 'C') await tap(p, '[data-p="tm-ob-fill"]');
    else for (const id of ['gus', 'sam', ...Object.keys(F.plan)]) await addBr(p, v, id, F.brSh[id] || 'dinner');
    const after = await p.evaluate(() => [...document.querySelectorAll('.tm-person-row')].map(r => r.getAttribute('data-id') + ' ' + r.querySelector('.tm-roster-time').textContent.split(' · ').slice(1).join(' · ')));
    const shortLine = await p.evaluate(() => { const e = document.querySelector('.tm-short-band'); return e ? e.innerText.replace(/\n+/g, ' | ') : ''; });
    await tap(p, '[data-p="tm-save"]');
    log(tag + ' 1280 T6 whole day at the book\'s times, then Save', { taps, said: await said(p), breaks: after, tooFew: shortLine });
    if (v === 'C') await p.screenshot({ path: OUT + 'C-filled-1280.png', fullPage: true });
    await p.context().close();
    // an old saved day: Ari with three breaks on Lunch; every one shows and can change; no + Second break
    if (v) {
      const ex = F.fixture(); ex[F.TEAM] = Object.assign({}, ex[F.TEAM], { br: [{ id: 'ari', sh: 'lunch', at: H(11), len: 30 }, { id: 'ari', sh: 'lunch', at: H(12, 30), len: 30 }, { id: 'ari', sh: 'lunch', at: H(14), len: 30 }] });
      p = await open(b, v, 390, ex); await ready(p);
      log(tag + ' 390 old day, Ari three breaks', { pickers: await p.$$eval('select[data-k^="tm-ob-at:ari:"]', l => l.length), add: await p.$$eval('[data-p="tm-ob-add"][data-id="ari"]', l => l.length), words: await words(p, 'ari') });
      await p.context().close();
    }
    // Take off: Dev off All day with a break at 15:30 (All day) and Mo off Lunch with a split 14:30 to 17:00
    if (v) {
      p = await open(b, v, 390); await ready(p);
      await addBr(p, v, 'mo'); await addBr(p, v, 'dev'); await pickAt(p, v, 'dev', '', 0, H(15, 30));
      await tap(p, '[data-p="tm-off"][data-id="mo"][data-sh="lunch"]'); await tap(p, '[data-p="tm-off"][data-id="mo"][data-sh="lunch"]');
      log(tag + ' 390 take Mo off Lunch (split 14:30)', { said: await said(p), words: await words(p, 'mo') });
      await tap(p, '[data-p="tm-off-undo"]');
      log(tag + ' 390 Undo', { said: await said(p), words: await words(p, 'mo') });
      log(tag + ' 390 take off: errors', p.errors);
      await p.context().close();
    }
  }
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
