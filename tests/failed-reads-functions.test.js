/*
  A failed read looks one way on the Functions pages too (the consistency sweep, step 2, 20 Nov 2026,
  docs/consistency-sweep-options/brief.md, FUNC-3 and FUNC-4). The functions listener refused before its first answer:
  #/fn, #/fn/now and a function's own page drew "Loading functions..." and "Could not load functions..." at once, with no
  Try again and nothing that read again. Now each draws one failed-read line (.p-readerr, role status) with Try again,
  which starts the listener again (once, however often it is tapped), and the book tries again by itself after 5 minutes
  or when the phone is back online. The freshness line ("Up to date, 14:00") sat in a different place on each page: now
  it sits right under the page heading on all three, so a cook on the service board sees an old copy at once.
  The checks marked (old) failed on the code before this change.
*/
const L = require('./lib');
const M = require('../js/functions.js');
const { R, ok } = L.results();
const today = L.ymd(new Date(L.NOW));
const at = hm => M.kat(today, M.hmMin(hm));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
// one confirmed function tonight, the way the book saves it (as in tests/functions.test.js)
const smith = M.derive({ v: 1, status: 'confirmed', name: 'Smith 50th', date: today, start: at('18:00'), loc: 'Beer garden', guests: 60, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0,
  rounds: [{ at: at('18:30'), note: '' }], lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: 'Per platter.', fp: '', qty: 3, u: M.toU([3]) }],
  was: {}, chg: [], cBy: 'fay', cAt: L.NOW - 86400000, confBy: 'fay', confAt: L.NOW - 86400000, by: 'fay', upd: L.NOW - 3600000 });
const extra = { [fsKey(['functions', 'smith'])]: smith };
const SPENT = '^kitchens/[^/]+/functions';   // the functions listener (and only it) refused: the free reads used up
const PAGES = [['#/fn', '.fn-cards', 'the list'], ['#/fn/now', '.fn-svc-rows', 'the service view'], ['#/fn/smith', '.fn-cardbox', 'a function page']];

// what #main shows: the failed-read lines, the loading words and how often "Could not load functions" is said
const look = p => p.evaluate(() => {
  const m = document.getElementById('main'), t = m ? m.textContent.replace(/\s+/g, ' ') : '';
  const x = m ? [...m.querySelectorAll('.p-readerr')] : [];
  return { n: x.length, role: x[0] ? x[0].getAttribute('role') : '', text: x[0] ? x[0].textContent.replace(/\s+/g, ' ').trim() : '', retry: x[0] ? [...x[0].querySelectorAll('button')].filter(b => /^Try again$/.test(b.textContent.trim())).length : 0,
    loading: /Loading functions/.test(t), said: (t.match(/Could not load functions/g) || []).length };
});
// the listener on the functions, started and answered (each start bills once in the stand-in; a refused one does not)
const listens = p => p.evaluate(() => (window.__fake.bill || []).filter(x => x.kind === 'listen' && /\/functions$/.test(x.path)).length);
// where the freshness line sits: right under the page heading (a one-line hint under the heading may come between)
const placed = p => p.evaluate(() => {
  const e = document.querySelector('#main .fn-fresh'); if (!e) return 'no freshness line';
  let prev = e.previousElementSibling;
  if (prev && prev.matches('p.hint')) prev = prev.previousElementSibling;
  if (prev && (prev.matches('h2#rtitle') || prev.matches('.fn-page-head') && prev.querySelector('#rtitle'))) return 'under';
  return 'after ' + (prev ? prev.tagName.toLowerCase() + '.' + String(prev.className).split(' ').join('.') : 'nothing');
});
async function failing(b, hash) {
  const p = await L.open(b, hash, { who: 'sam', extra, exhausted: SPENT, width: 390, height: 844, wait: 1600 });
  await L.waitFor(p, () => !!document.querySelector('#main .p-err'), null, 6000).catch(() => {});
  await L.settle(p, 200);
  return p;
}

(async () => {
  const b = await L.start();

  // 1. the read refused before its first answer: one failed-read line with Try again, never Loading as well; Try
  // again brings the functions
  for (const [hash, shows, name] of PAGES) {
    const p = await failing(b, hash);
    const x = await look(p);
    ok(!x.loading, '(old) ' + name + ': a failed read does not also say Loading functions');
    ok(x.n === 1 && x.said === 1 && x.role === 'status' && x.retry === 1, '(old) ' + name + ': one failed-read line with Try again (' + JSON.stringify(x) + ')');
    // the reads used up: the line at the top of the book says why, so the connection is named only otherwise (below)
    ok(/^Could not load functions\.( Check the connection\.)? Try again$/.test(x.text), '(old) ' + name + ': says what could not load, and no No signal when the signal is not the cause (' + x.text + ')');
    await p.evaluate(() => { window.__fake.exhausted = null; });
    const before = await listens(p);
    if (hash === '#/fn') {
      // two taps before the page is drawn again: the listener starts once
      await p.evaluate(() => { const a = document.querySelector('#main [data-fn="retry"]'); if (!a) return; const c = a.cloneNode(true); c.hidden = true; document.body.appendChild(c); a.click(); c.click(); c.remove(); });
    } else {
      const btn = await p.$('#main .p-readerr button'); if (btn) await btn.click();
    }
    const back = await L.waitFor(p, s => !!document.querySelector('#main ' + s) && /Smith 50th/.test(document.getElementById('main').textContent) && !document.querySelector('#main .p-readerr'), shows, 6000).then(() => true, () => false);
    ok(back, '(old) ' + name + ': Try again reads the functions again');
    await L.settle(p, 300);
    if (hash === '#/fn') ok(await listens(p) - before === 1, '(old) ' + name + ': two taps on Try again start one listener (' + (await listens(p) - before) + ')');
    ok(!p.errors.length, name + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // 2. the words follow the cause (js/prep.js noSignal()), and it tries again by itself: when the phone is back online,
  // and after 5 minutes
  let p = await failing(b, '#/fn/now');
  const words = q => q.evaluate(() => { const e = document.querySelector('#main .p-readerr'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; });
  await p.evaluate(() => { window.LK_PREP.state.quota = null; window.dispatchEvent(new Event('lk-fn')); });
  let w = await words(p);
  ok(w === 'Could not load functions. Check the connection. Try again', '(old) another failure: Could not load functions, check the connection (' + w + ')');
  await p.context().setOffline(true); await L.settle(p, 300);
  w = await words(p);
  ok(w === 'No signal. Could not load functions. Try again', '(old) no signal: says No signal (' + w + ')');
  await p.evaluate(() => { window.__fake.exhausted = null; });
  await p.context().setOffline(false);
  ok(await L.waitFor(p, () => !!document.querySelector('#main .fn-svc-rows') && !document.querySelector('#main .p-err'), null, 6000).then(() => true, () => false), 'back online: the service view reads the functions again by itself');
  ok(!p.errors.length, 'back online: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  p = await failing(b, '#/fn');
  await p.evaluate(() => { window.__fake.exhausted = null; });
  await p.clock.fastForward(5 * 60000 + 1000);
  ok(await L.waitFor(p, () => !!document.querySelector('#main .fn-cards') && !document.querySelector('#main .p-err'), null, 6000).then(() => true, () => false), '(old) after 5 minutes: the list reads the functions again by itself, no reload');
  ok(!p.errors.length, 'after 5 minutes: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 3. a copy is known: the freshness line sits right under the page heading on every functions page
  for (const [hash, shows, name] of PAGES) {
    p = await L.open(b, hash, { who: 'sam', extra, width: 390, height: 844, wait: 1600 });
    await L.waitFor(p, s => !!document.querySelector('#main ' + s) && !!document.querySelector('#main .fn-fresh'), shows, 6000).catch(() => {});
    const w = await placed(p);
    ok(w === 'under', (hash === '#/fn' ? '' : '(old) ') + name + ': the freshness line sits right under the heading (' + w + ')');
    ok(/^Up to date, \d\d:\d\d\./.test(await p.evaluate(() => (document.querySelector('#main .fn-fresh') || {}).textContent || '')), name + ': the line says when the functions were read');
    ok(!p.errors.length, name + ', freshness: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
