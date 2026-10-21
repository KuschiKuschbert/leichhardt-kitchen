// A read lost to a bad signal is never kept as "nothing there": Everything to order says so, nothing goes into the day
// cache, and the book reads again by itself later (usability U1). The same for the wastage summary (22 Oct 2026).
const L = require('./lib');
const { R, ok } = L.results(), txt = L.txt;
const day = n => L.ymd(new Date(L.NOW - n * 86400000));
const path = (...p) => ['kitchens', L.PIN].concat(p).join('/');
const extra = {};
Object.assign(extra, L.wasteSum([{ t: 'Rice', n: 2, r: { expired: 2 }, unit: 'portions', reason: 'expired', sec: 'Pans', amt: 1, last: { unit: 'portions', reason: 'expired', sec: 'Pans', amt: 1 } }]));
extra[path('orders', day(1), 'lines', 'old1')] = { text: 'Cream', qty: '2 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 86400000, ordered: false, deleted: false, rolled: 1 };
const cached = (p, k) => p.evaluate(k => localStorage.getItem(k), k);
(async () => {
  const b = await L.start();
  let p;

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
