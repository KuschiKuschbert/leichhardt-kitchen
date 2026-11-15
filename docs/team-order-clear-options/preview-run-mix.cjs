// The combined preview D (16 Nov 2026), the mix, with the three designs patched into the real page (preview-prep.patch, preview-css.patch;
// window.__tl = 'A', 'B' or 'C', '' is today's page), the admin panel's Today's team in the test stand-in, made-up
// staff, a day as the roster file leaves it. Measures the same tasks for each and takes the screenshots. Run from the
// repo with the patches applied:  CHROME=<chrome-headless-shell> node docs/team-order-clear-options/preview-run.cjs
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
let taps = 0;
const tap = async (p, sel) => { await p.locator(sel).first().click(); taps++; await L.settle(p, 150); };
const choose = async (p, sel, v) => { await L.pick(p, sel, String(v)); taps++; await L.settle(p, 150); };
const open = (b, v, w) => L.open(b, '#/admin', { admin: true, adminPage: 'plan', width: w, height: w === 390 ? 844 : w === 768 ? 1024 : 900, extra: fixture(), wait: 1800, init: 'window.__tl=' + JSON.stringify(v) });
const ready = p => L.waitFor(p, () => document.querySelectorAll('.tm-person-row').length >= 9, null, 9000);
// one cook: section, then one break; C sets them in the row, A and B through Breaks and the details panel
async function oneCook(p, v, id, sh, sec, at) {
  await choose(p, 'select[data-k="tm-sec:' + id + ':' + sh + '"]', sec);
  if (v === 'C' || v === 'D') {
    await tap(p, '[data-p="tm-addbr2"][data-id="' + id + '"][data-sh="' + sh + '"]');
    await choose(p, 'select[data-k="tm-bat:' + id + ':' + sh + ':0"]', at);
  } else {
    await tap(p, '[data-p="tm-focus"][data-id="' + id + '"]');
    await tap(p, '.tm-detail-workbench [data-p="tm-addbr"]');
    await choose(p, 'select[data-k="tm-at:' + id + ':0"]', at);
  }
}
const breakSel = (v, id, sh) => v === 'C' || v === 'D' ? 'select[data-k="tm-bat:' + id + ':' + sh + ':0"]' : 'select[data-k="tm-at:' + id + ':0"]';

(async () => {
  const srv = require(path.join(__dirname, '../../tests/serve'));
  await new Promise(r => srv.listen(8777, '127.0.0.1', r));
  const b = await L.start();
  const v = 'D', tag = 'D';
  for (const w of [390, 768, 1280]) {
    const p = await open(b, v, w); await ready(p);
    const fit = await p.evaluate(() => {
      const rows = [...document.querySelectorAll('.tm-person-row')], head = document.querySelector('.tm-tlplan-head'), dock = document.querySelector('.tm-save');
      window.scrollTo(0, rows[0].getBoundingClientRect().top + scrollY - (head ? head.getBoundingClientRect().height : 0) - 120);
      const top = head ? head.getBoundingClientRect().bottom : 0, bottom = dock ? Math.min(innerHeight, dock.getBoundingClientRect().top) : innerHeight;
      return { rows: rows.filter(r => { const x = r.getBoundingClientRect(); return x.top >= top - 1 && x.bottom <= bottom + 1; }).length, rowPx: Math.round(rows.map(r => r.getBoundingClientRect().height).sort((a, c) => a - c)[Math.floor(rows.length / 2)]), list: Math.round(document.querySelector('.tm-people').getBoundingClientRect().height), headPx: head ? Math.round(head.getBoundingClientRect().height) : 0 };
    });
    log(tag + ' ' + w + ' rows in one screen, median row px, list px, head px', fit);
    const fromAri = async (pg) => pg.evaluate(() => {
      const rows = [...document.querySelectorAll('.tm-person-row')], head = document.querySelector('.tm-grid-head, .tm-tlplan-head'), dock = document.querySelector('.tm-save'), ari = document.querySelector('.tm-person-row[data-id="ari"]');
      window.scrollTo(0, ari.getBoundingClientRect().top + scrollY - (head ? head.getBoundingClientRect().bottom : 0) - 2);
      const top = head ? head.getBoundingClientRect().bottom : 0, bottom = dock ? Math.min(innerHeight, dock.getBoundingClientRect().top) : innerHeight;
      return { rows: rows.filter(r => { const x = r.getBoundingClientRect(); return x.top >= top - 3 && x.bottom <= bottom + 1; }).length, room: Math.round(bottom - top) };
    });
    log(tag + ' ' + w + ' rows in one screen from Ari (one service each)', await fromAri(p));
    const t = await open(b, '', w); await ready(t);
    log('today ' + w + ' rows in one screen from Ari (one service each)', await fromAri(t));
    await t.context().close();
    log(tag + ' ' + w + ' services in the head', await p.$$eval('.tm-tlplan-svcs > span', l => l.map(e => e.innerText)));
    log(tag + ' ' + w + ' Add a service for Ari', await p.$eval('select[data-k="tm-addsvc:ari"]', e => [...e.options].map(o => o.textContent)));
    if (w === 390) await p.screenshot({ path: OUT + 'D-plan-390.png' });
    taps = 0;
    await oneCook(p, v, 'dev', 'lunch', 'larder', H(13, 30));
    log(tag + ' ' + w + ' Dev: section and a break at 13:30, taps', taps);
    const offered = await p.$eval(breakSel(v, 'dev', 'lunch'), e => [...e.options].map(o => o.textContent).filter(t => t !== 'No break'));
    log(tag + ' ' + w + ' Dev break times offered', { first: offered[0], last: offered[offered.length - 1], count: offered.length });
    log(tag + ' ' + w + ' Dev row words', await p.$eval('.tm-person-row[data-id="dev"]', e => e.innerText.replace(/\n+/g, ' | ')));
    log(tag + ' ' + w + ' Gus row words', await p.$eval('.tm-person-row[data-id="gus"]', e => e.innerText.replace(/\n+/g, ' | ')));
    log(tag + ' ' + w + ' sideways scroll, errors', { over: await L.overflow(p), errors: p.errors });
    if (w !== 390) await p.screenshot({ path: OUT + 'D-dev-' + w + '.png', fullPage: true });
    else {
      await p.evaluate(() => { const r = document.querySelector('.tm-person-row[data-id="dev"]'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 260); }); await L.settle(p, 200);
      await p.screenshot({ path: OUT + 'D-dev-390.png' });
    }
    await p.context().close();
  }
  // the whole day at 1280: 7 cooks, a section and one break each, then Save
  let p = await open(b, v, 1280); await ready(p); taps = 0;
  const plan = { ari: ['lunch', 'grill', H(12)], bea: ['lunch', 'pans', H(13)], cal: ['lunch', 'fryer', H(12, 30)], dev: ['lunch', 'larder', H(13, 30)], eli: ['dinner', 'grill', H(18)], fen: ['dinner', 'pans', H(18, 30)], mo: ['allday', 'larder', H(15)] };
  for (const id of Object.keys(plan)) await oneCook(p, v, id, ...plan[id]);
  await tap(p, '[data-p="tm-save"]');
  await L.waitFor(p, () => /saved at/i.test(document.body.innerText), null, 5000).catch(() => {});
  log(tag + ' 1280 whole day: 7 cooks, then Save', { taps, saved: /saved at/i.test(await p.evaluate(() => document.body.innerText)) });
  await p.screenshot({ path: OUT + 'D-day-1280.png', fullPage: true });
  await p.context().close();
  // add a service, a hidden one, take off with a second tap, at 390
  p = await open(b, v, 390); await ready(p); taps = 0;
  await choose(p, 'select[data-k="tm-addsvc:ari"]', 'dinner');
  log(tag + ' 390 Ari add Dinner', { taps, msg: await p.evaluate(() => (document.body.innerText.match(/Ari added to[^\n]*/) || [''])[0]), lines: await p.$$eval('.tm-person-row[data-id="ari"] .tm-tlsvc-name b', l => l.map(e => e.textContent)) });
  await choose(p, 'select[data-k="tm-addsvc:bea"]', 'smoker');
  log(tag + ' 390 Bea add hidden Smoker', { msg: await p.evaluate(() => (document.body.innerText.match(/Bea added to[^\n]*/) || [''])[0]), head: await p.$$eval('.tm-tlplan-svcs > span', l => l.map(e => e.innerText)) });
  taps = 0;
  await tap(p, '[data-p="tm-off2"][data-id="cal"][data-sh="lunch"]');
  const armedOff = await p.$eval('[data-p="tm-off2"][data-id="cal"][data-sh="lunch"]', e => e.textContent);
  await p.evaluate(() => { const r = document.querySelector('.tm-person-row[data-id="cal"]'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 260); }); await L.settle(p, 150);
  await p.screenshot({ path: OUT + 'D-takeoff-390.png' });
  await tap(p, '[data-p="tm-off2"][data-id="cal"][data-sh="lunch"]');
  log(tag + ' 390 take Cal off Lunch', { taps, armedOff, msg: await p.evaluate(() => (document.body.innerText.match(/Cal taken off[^\n]*/) || [''])[0]), calRow: await p.evaluate(() => !!document.querySelector('.tm-person-row[data-id="cal"]')) });
  log(tag + ' 390 after take off: focus and Undo', { focus: await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-p')), undoLine: await p.evaluate(() => { const e = document.querySelector('.tm-tlundo'); return e ? e.innerText : ''; }) });
  await tap(p, '[data-p="tm-off-undo"]');
  log(tag + ' 390 Undo', { msg: await p.evaluate(() => (document.body.innerText.match(/Undone:[^\n]*/) || [''])[0]), calWords: await p.evaluate(() => { const r = document.querySelector('.tm-person-row[data-id="cal"] .tm-roster-time'); return r ? r.textContent : ''; }) });
  log(tag + ' 390 add and take off: errors', p.errors);
  await p.context().close();
  // Spread Lunch from 13:30, one at a time: who was moved inside their hours is named
  p = await open(b, v, 1280); await ready(p);
  await tap(p, 'details.tm-batch > summary');
  await L.pick(p, 'select[data-k="tm-tool-sh"]', 'lunch'); await L.settle(p, 150);
  await L.pick(p, 'select[data-k="tm-spfrom"]', String(H(13, 30))); await L.settle(p, 150);
  await L.pick(p, 'select[data-k="tm-spmode"]', '1'); await L.settle(p, 150);
  await tap(p, '[data-p="tm-spread"]');
  log(tag + ' 1280 Spread Lunch from 13:30 one at a time', await p.evaluate(() => (document.body.innerText.match(/\d+ breaks? from[^\n]*/) || [''])[0]));
  log(tag + ' 1280 Gus words', await p.$eval('.tm-person-row[data-id="gus"] .tm-roster-time', e => e.textContent));
  await p.context().close();
  // Clear
  p = await open(b, v, 390); await ready(p); taps = 0;
  await tap(p, 'details.tm-batch > summary'); await tap(p, '[data-p="tm-clear"]');
  const armedWords = await p.$eval('[data-p="tm-clear"]', e => e.textContent);
  await tap(p, '[data-p="tm-clear"]');
  log(tag + ' 390 clear', { armedWords, rowsLeft: await p.evaluate(() => document.querySelectorAll('.tm-person-row').length), tapsBeforeSave: taps });
  await p.context().close();
  // a sous chef on the chef panel's Today's team: the same rows, no Clear
  p = await L.open(b, '#/team', { who: 'sam', width: 390, height: 844, extra: fixture(), wait: 1800, init: 'window.__tl="D"' });
  await L.waitFor(p, () => document.querySelectorAll('.tm-person-row').length >= 9, null, 9000).catch(() => {});
  log(tag + ' 390 sous chef', { rows: await p.evaluate(() => document.querySelectorAll('.tm-tlrow').length), clear: await p.evaluate(() => !!document.querySelector('[data-p="tm-clear"]')), over: await L.overflow(p), errors: p.errors });
  await p.context().close();
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
