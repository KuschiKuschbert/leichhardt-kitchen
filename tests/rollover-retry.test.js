// A rollover that fails (no signal, a refused write) waits 5 minutes before trying again, instead of reading 8 days of
// lines on every redraw (audit, October 2026). The stand-in fails every write ('fail'), so the rolled lines never save.
const L = require('./lib');
const { R, ok } = L.results();
const yday = L.ymd(new Date(L.NOW - 86400000));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const reads = (page, re) => page.evaluate(src => window.__fake.reads.filter(k => new RegExp(src).test(k)).length, re);
const draws = async (page, sel) => { for (let i = 0; i < 3; i++) { await page.click(sel); await L.settle(page, 250); } };
(async () => {
  const b = await L.start();
  const extra = {};
  extra[fsKey(['days', yday, 'items', 'y1'])] = { text: 'Make stock', station: 'Sauce', qty: '10 L', recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 90000000, done: false, deleted: false };
  extra[fsKey(['orders', yday, 'lines', 'oy1'])] = { text: 'Cream', qty: '4 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 90000000, ordered: false, deleted: false };

  // prep list: the rollover's write fails every time
  let p = await L.open(b, '#/prep', { extra, fakeMode: 'fail', wait: 3000 });
  const d1 = await reads(p, '/days/');
  ok(d1 >= 8, 'prep: the rollover read today and the past days once (' + d1 + ' reads)');
  await draws(p, '[data-p="tab"]');
  await L.settle(p, 600);
  const d2 = await reads(p, '/days/');
  ok(d2 === d1, 'prep: redraws after the failed rollover read nothing more (' + (d2 - d1) + ')');
  await p.clock.runFor(5 * 60000 + 2000);
  await draws(p, '[data-p="tab"]');
  await L.settle(p, 800);
  const d3 = await reads(p, '/days/');
  ok(d3 === d2 + 8, 'prep: five minutes later it tries once more, 8 reads (' + (d3 - d2) + ')');
  await draws(p, '[data-p="tab"]');
  await L.settle(p, 600);
  ok(await reads(p, '/days/') === d3, 'prep: and then waits again');
  ok(p.errors.length === 0, 'prep: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // order list: the same for the order rollover
  p = await L.open(b, '#/orders', { extra, fakeMode: 'fail', wait: 3000 });
  const o1 = await reads(p, '/orders/');
  ok(o1 >= 8, 'orders: the rollover read today and the past days once (' + o1 + ' reads)');
  await draws(p, '[data-p="otoday"]');
  await L.settle(p, 600);
  const o2 = await reads(p, '/orders/');
  ok(o2 === o1, 'orders: redraws after the failed rollover read nothing more (' + (o2 - o1) + ')');
  await p.clock.runFor(5 * 60000 + 2000);
  await draws(p, '[data-p="otoday"]');
  await L.settle(p, 800);
  const o3 = await reads(p, '/orders/');
  ok(o3 === o2 + 8, 'orders: five minutes later it tries once more, 8 reads (' + (o3 - o2) + ')');
  ok(p.errors.length === 0, 'orders: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
