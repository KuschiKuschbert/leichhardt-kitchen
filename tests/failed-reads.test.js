// A read lost to a bad signal is never kept as "nothing there": Everything to order says so, nothing goes into the day
// cache, and the book reads again by itself later (usability U1). The same for the wastage summary (22 Oct 2026), and
// since 28 Oct 2026 for the admin Insights and Team days, the Insights counts and the nightly summaries of what is usual.
const L = require('./lib');
const { R, ok } = L.results(), txt = L.txt;
const day = n => L.ymd(new Date(L.NOW - n * 86400000));
const path = (...p) => ['kitchens', L.PIN].concat(p).join('/');
const extra = {};
Object.assign(extra, L.wasteSum([{ t: 'Rice', n: 2, r: { expired: 2 }, unit: 'portions', reason: 'expired', sec: 'Pans', amt: 1, last: { unit: 'portions', reason: 'expired', sec: 'Pans', amt: 1 } }]));
extra[path('orders', day(1), 'lines', 'old1')] = { text: 'Cream', qty: '2 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 86400000, ordered: false, deleted: false, rolled: 1 };
const cached = (p, k) => p.evaluate(k => localStorage.getItem(k), k);
const until = (p, fn, arg) => L.waitFor(p, fn, arg, 6000).then(() => true, () => false);
const shows = (p, sel, re) => until(p, a => new RegExp(a[1]).test((document.querySelector(a[0]) || {}).textContent || ''), [sel, re.source]);
const reads = (p, re) => p.evaluate(s => window.__fake.reads.filter(k => new RegExp(s).test(k)).length, re.source);
const go = async (p, h) => { await p.evaluate(h => { location.hash = h; }, h); await L.settle(p, 700); };
// no sideways scroll at the three widths, then back to the width the page opened at
async function fits(p, what, back) {
  for (const w of [390, 768, 1280]) {
    await p.setViewportSize({ width: w, height: 900 }); await L.settle(p, 250);
    const o = await L.overflow(p);
    ok(!o, what + ': no sideways scroll at ' + w + ' px' + (o ? ' (' + o + ')' : ''));
  }
  await p.setViewportSize({ width: back, height: 900 }); await L.settle(p, 250);
}
(async () => {
  const b = await L.start();
  let p, t;

  // wastage: the summary cannot be read. The form and today's entries still work, nothing is cached, and it is read again later
  p = await L.open(b, '#/waste', { wait: 1500, extra, failReads: '/summary/waste$' });
  ok(await p.$('#w-text') !== null && await p.$('.w-row') !== null, 'waste: with the summary unreadable the form and today\'s entries still show');
  ok(!(await p.$('[data-p="woften"]')), 'waste: no Logged often chips without the summary');
  ok(!(await cached(p, 'lk.w.sum')), 'waste: nothing is cached for today');
  await p.evaluate(() => { window.__fake.failReads = null; });
  await p.clock.fastForward('06:00');
  await p.evaluate(() => { location.hash = '#/prep'; }); await L.settle(p, 600);
  await p.evaluate(() => { location.hash = '#/waste'; });
  await L.waitFor(p, () => !!document.querySelector('[data-p="woften"]'));
  ok(/Rice/.test(await txt(p, '.w-often') || ''), 'waste: after the wait it reads the summary again and shows Rice under Logged often');
  ok(/Rice/.test(await cached(p, 'lk.w.sum') || ''), 'waste: the summary is cached for the day');
  ok(p.errors.length === 0, 'waste: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // orders, Everything to order: yesterday cannot be read, so it must not say "Nothing waiting"
  p = await L.open(b, '#/orders', { wait: 1500, extra, failReads: '/orders/' + day(1) + '/lines$' });
  await p.click('[data-p="oview"][data-v="all"]');
  await L.settle(p, 500);
  const all = await txt(p, '.nb-body') || await txt(p, '.o-page') || '';
  ok(/Could not load every day/.test(all), 'orders all: says it could not load every day');
  ok(!/Nothing waiting to be ordered/.test(all), 'orders all: does not say nothing is waiting');
  ok(!(await cached(p, 'lk.ord.hist')), 'orders: the order history is not cached with a day missing');
  await p.evaluate(() => { window.__fake.failReads = null; });
  await p.clock.fastForward('06:00');
  await p.click('[data-p="oview"][data-v="day"]'); await p.click('[data-p="oview"][data-v="all"]');
  await L.settle(p, 500);
  const all2 = await txt(p, '.o-page') || '';
  ok(/Cream/.test(all2) && !/Could not load/.test(all2), 'orders all: after the wait it reads again and shows Cream');
  ok(p.errors.length === 0, 'orders: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // admin Insights with one past day unreadable (loadStats(), 28 Oct 2026): never counted as a day with no lines. It
  // says it could not load every day, offers no CSV, and once the signal is back reads only that day again
  const d2 = day(2), insX = {};
  for (let k = 0; k < 4; k++) insX[path('days', d2, 'items', 'q' + k)] = { text: 'Job ' + k, station: 'Larder', qty: '', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 2 * 86400000, done: true, doneBy: 'Sam', doneById: 'sam', doneAt: L.NOW - 2 * 86400000 + 3600000, deleted: false };
  p = await L.open(b, '#/admin', { admin: true, who: '', extra: insX, width: 1280, height: 900, failReads: '/days/' + d2 + '/items$', wait: 2000 });
  ok(await shows(p, '#prep-root', /Insights[\s\S]*Could not load every day\. Check the signal\./), 'insights, a day unreadable: says it could not load every day');
  ok(await p.evaluate(d => { const st = window.LK_PREP.state.stats; return !!st && (st.miss || []).indexOf(d) >= 0; }, d2), 'insights, a day unreadable: the day is listed as missing, not as a day with no lines');
  ok(await p.evaluate(() => { const x = document.querySelector('[data-p="csv"][data-v="insights"]'); return !!x && x.disabled; }), 'insights, a day unreadable: no CSV of only the days that came in');
  await fits(p, 'insights with the could-not-load note', 1280);
  const dr0 = await reads(p, /\/days\/[^/]+\/items$/);
  await p.evaluate(() => { window.__fake.failReads = null; window.dispatchEvent(new Event('online')); });
  ok(await until(p, d => { const st = window.LK_PREP.state.stats; return !!st && !!st.days[d] && st.days[d].length === 4 && !(st.miss || []).length; }, d2), 'insights, signal back: the missing day is read by itself and counted (4 lines)');
  ok(await reads(p, /\/days\/[^/]+\/items$/) - dr0 === 1, 'insights, signal back: only that day is read again (' + (await reads(p, /\/days\/[^/]+\/items$/) - dr0) + ' reads)');
  ok(await until(p, () => !/Could not load every day/.test((document.querySelector('#prep-root') || {}).textContent || '') && !document.querySelector('[data-p="csv"][data-v="insights"]').disabled), 'insights, signal back: the note goes and Download CSV is back');
  ok(p.errors.length === 0, 'insights: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // admin Team with one past order day unreadable (loadOrdStats()): the Order list block says so, and the day comes in
  p = await L.open(b, '#/admin', { admin: true, who: '', extra, width: 1280, height: 900, failReads: '/orders/' + day(1) + '/lines$', wait: 2000 });
  await L.adminTab(p, 'team');
  const ordBlock = () => p.evaluate(() => { const l = [...document.querySelectorAll('.set-block')].find(x => /^Order list/.test((x.querySelector('.label') || {}).textContent || '')); return l ? l.textContent : ''; });
  ok(await until(p, () => { const l = [...document.querySelectorAll('.set-block')].find(x => /^Order list/.test((x.querySelector('.label') || {}).textContent || '')); return !!l && /Could not load every day/.test(l.textContent); }), 'team, an order day unreadable: the Order list says it could not load every day (' + (await ordBlock()).slice(0, 160) + ')');
  await p.evaluate(() => { window.__fake.failReads = null; window.dispatchEvent(new Event('online')); });
  ok(await until(p, () => { const o = window.LK_PREP.state.ordStats; return !!o && !(o.miss || []).length && o.lines.some(x => x.text === 'Cream'); }), 'team, signal back: the order day is read by itself (Cream is in)');
  ok(!/Could not load every day/.test(await ordBlock()), 'team, signal back: the note goes');
  ok(p.errors.length === 0, 'team: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // admin Insights' counts unreadable (loadViews(), loadMisses(), loadUsage()): not "none", no read on every draw, and
  // read again once the signal is back
  p = await L.open(b, '#/admin', { admin: true, who: '', width: 1280, height: 900, failReads: '/(views|misses)$|/summary/usage$', wait: 2000 });
  const COUNTS = /Could not load these counts\. Check the signal\./;
  ok(await until(p, () => (((document.querySelector('#prep-root') || {}).textContent || '').match(/Could not load these counts/g) || []).length === 3), 'insights counts unreadable: card opens, empty searches and smart features each say they could not load');
  t = await txt(p, '#prep-root') || '';
  ok(COUNTS.test(t) && !/No card opens counted yet/.test(t) && !/No empty searches yet/.test(t), 'insights counts unreadable: never "No card opens counted yet" or "No empty searches yet"');
  const u0 = await reads(p, /\/summary\/usage$|\/views$|\/misses$/);
  for (const g of ['team', 'insights', 'team', 'insights']) await L.adminTab(p, g);
  ok(await reads(p, /\/summary\/usage$|\/views$|\/misses$/) === u0, 'insights counts unreadable: no read on every draw (' + u0 + ' then ' + await reads(p, /\/summary\/usage$|\/views$|\/misses$/) + ')');
  await p.evaluate(() => { window.__fake.failReads = null; window.dispatchEvent(new Event('online')); });
  ok(await until(p, () => { const x = (document.querySelector('#prep-root') || {}).textContent || ''; return /No card opens counted yet/.test(x) && /No empty searches yet/.test(x) && /Nothing counted yet/.test(x) && !/Could not load these counts/.test(x); }), 'insights counts, signal back: each is read again and shows what is there');
  ok(p.errors.length === 0, 'insights counts: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the nightly summaries of what is usual unreadable (sumList()): no fall back to reading up to 500 learned records
  // (or 300 order records) in their place; read again later
  const sumX = { [path('summary', 'learned')]: { day: day(0), items: [{ id: 'mise onions', text: 'Mise onions', uses: 6, typed: 6, dow: {}, qtys: {}, secs: {} }] }, [path('summary', 'ordlearned')]: { day: day(0), items: [] } };
  p = await L.open(b, '#/prep', { extra: sumX, failReads: '/summary/(learned|ordlearned)$', wait: 1800 });
  await go(p, '#/orders'); await go(p, '#/prep');
  ok(await reads(p, /^kitchens\/[^/]+\/(learned|ordlearned)$/) === 0, 'summaries unreadable: the learned records are not read in their place (' + await p.evaluate(() => window.__fake.reads.filter(k => /^kitchens\/[^/]+\/(learned|ordlearned)$/.test(k)).join(' | ')) + ')');
  ok(await p.evaluate(() => !localStorage.getItem('lk.learned') && !localStorage.getItem('lk.ord.learned')), 'summaries unreadable: nothing kept for the day');
  const s0 = await reads(p, /\/summary\/(learned|ordlearned)$/);
  await p.evaluate(() => { window.__fake.failReads = null; window.dispatchEvent(new Event('online')); });
  await p.clock.fastForward('06:00');
  await go(p, '#/orders'); await go(p, '#/prep');
  ok(await until(p, () => !!localStorage.getItem('lk.learned') && !!localStorage.getItem('lk.ord.learned')), 'summaries, signal back: both read again by themselves and kept (' + s0 + ' then ' + await reads(p, /\/summary\/(learned|ordlearned)$/) + ' reads)');
  ok(await reads(p, /^kitchens\/[^/]+\/(learned|ordlearned)$/) === 0, 'summaries, signal back: still no read of the learned records');
  ok(p.errors.length === 0, 'summaries: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a good signal: one read of the summary, cached, and no past wastage lines read at all
  p = await L.open(b, '#/waste', { wait: 1500, extra });
  await L.waitFor(p, () => !!localStorage.getItem('lk.w.sum'));
  const wr = await p.evaluate(() => window.__fake.reads.filter(k => /\/waste\/|\/summary\//.test(k)));
  ok(wr.filter(k => /\/summary\/waste$/.test(k)).length === 1, 'waste: the summary is read once (' + wr.join(' | ') + ')');
  ok(!wr.some(k => /\/waste\/[^/]+\/lines/.test(k)), 'waste: no wastage lines are read with getDocs (today\'s come from the live list)');
  await p.context().close();

  await b.close();
  L.report(R);
})();
