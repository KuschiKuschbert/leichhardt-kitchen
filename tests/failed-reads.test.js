// A past day that cannot be read (bad signal) is never kept as an empty day: Last 7 days and Everything to order say so,
// nothing goes into the day cache, and the book reads again by itself later (usability U1).
const L = require('./lib');
const { R, ok } = L.results(), txt = L.txt;
const day = n => L.ymd(new Date(L.NOW - n * 86400000));
const path = (...p) => ['kitchens', L.PIN].concat(p).join('/');
const extra = {};
extra[path('waste', day(1), 'lines', 'r1')] = { text: 'Rice', amount: 1, unit: 'portions', reason: 'expired', action: '', station: 'Pans', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 86400000, deleted: false };
extra[path('orders', day(1), 'lines', 'old1')] = { text: 'Cream', qty: '2 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 86400000, ordered: false, deleted: false, rolled: 1 };
const cached = (p, k) => p.evaluate(k => localStorage.getItem(k), k);
(async () => {
  const b = await L.start();
  let p;

  // wastage, Last 7 days: yesterday cannot be read
  p = await L.open(b, '#/waste', { wait: 1500, extra, failReads: '/waste/' + day(1) + '/lines$' });
  await p.click('[data-p="wview"][data-v="week"]');
  await L.settle(p, 400);
  const page = await txt(p, '.nb-body') || '';
  ok(/Could not load every day/.test(page), 'waste week: says it could not load every day');
  ok(/could not load/.test(page) && !/Rice/.test(page), 'waste week: yesterday says "could not load", not "nothing logged"');
  ok(!(await cached(p, 'lk.w.recent')), 'waste week: nothing is cached for today');
  // the signal comes back: after the retry wait, the next redraw reads again and fills it in
  await p.evaluate(() => { window.__fake.failReads = null; });
  await p.clock.fastForward('06:00');
  await p.click('[data-p="wview"][data-v="day"]'); await p.click('[data-p="wview"][data-v="week"]');
  await L.settle(p, 500);
  const again = await txt(p, '.nb-body') || '';
  ok(/Rice/.test(again) && !/Could not load/.test(again), 'waste week: after the wait it reads again and shows Rice');
  ok(/Rice/.test(await cached(p, 'lk.w.recent') || ''), 'waste week: the full read is cached for the day');
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

  // nothing missing: one read set, cached, no warning (as before)
  p = await L.open(b, '#/waste', { wait: 1500, extra });
  await p.click('[data-p="wview"][data-v="week"]');
  await L.settle(p, 400);
  ok(!/Could not load/.test(await txt(p, '.nb-body') || '') && /Rice/.test(await cached(p, 'lk.w.recent') || ''), 'waste week: with a good signal there is no warning and the day is cached');
  await p.context().close();

  await b.close();
  L.report(R);
})();
