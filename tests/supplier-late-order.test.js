// An order recorded after a supplier's cut-off has closed counts for the next order cycle (head chef, 13 Nov 2026).
// Before, the supplier sheet linked it to today's closed cut-off: it ticked that one and left tomorrow's reminder open,
// which invited a second order. Pages open at 14:00 today (tests/lib.js), so a 10:00 cut-off has closed and a 15:00 one
// is still open.
const L = require('./lib'), F = require('./supplier-fixtures'), { R, ok } = L.results();
const tomorrow = L.ymd(new Date(L.NOW + 86400000));
const orderPrefix = F.key(['suppliers', 'northside', 'orders']) + '/';
// the shared fixture with a daily Northside cut-off at the given minute of the day
function daily(at) {
  const seed = F.fixture(), cfg = seed[F.key(['config', 'main'])];
  cfg.cutoffs = [Object.assign({}, cfg.cutoffs[0], { dd: [0, 1, 2, 3, 4, 5, 6], at })];
  return seed;
}
async function record(p) {
  const before = Object.keys(await p.evaluate(() => window.__fake.dump())).filter(k => k.startsWith(orderPrefix));
  await L.waitFor(p, () => !!document.querySelector('input[data-sf="qty"][data-i="t-stock"]'), null, 15000);
  await p.fill('input[data-sf="qty"][data-i="t-stock"]', '3');
  await p.click('[data-su="review"]');
  await L.waitFor(p, () => !!document.querySelector('[data-su="record"]:not([disabled])'), null, 10000);
  await p.click('[data-su="record"]');
  // only the order this records: the fixture already holds earlier orders
  await L.waitFor(p, ([prefix, old]) => Object.keys(window.__fake.dump()).some(k => k.startsWith(prefix) && old.indexOf(k) < 0), [orderPrefix, before], 10000);
  const data = await p.evaluate(() => window.__fake.dump());
  return { data, orders: Object.entries(data).filter(([k]) => k.startsWith(orderPrefix) && before.indexOf(k) < 0).map(([, x]) => x) };
}

(async () => {
  const b = await L.start();
  let p, r;

  // Today's cut-off closed at 10:00: the order is for tomorrow's cut-off, and today's is left as it was.
  for (const [label, hash] of [['supplier page', '#/suppliers/northside'], ['link to the closed cut-off', '#/suppliers/cutoff/northside/' + F.today]]) {
    p = await L.open(b, hash, { who: 'sam', extra: daily(10 * 60), wait: 1500 });
    r = await record(p);
    ok(r.orders.length === 1 && r.orders[0].cutoffDay === tomorrow, label + ': an order after the cut-off is for the next cut-off (' + (r.orders[0] || {}).cutoffDay + ')');
    ok(r.data[F.key(['cutdone', tomorrow + '_northside'])]?.on === true && r.data[F.key(['supplierlinks', tomorrow + '_northside'])]?.day === tomorrow, label + ': it ticks off the next cut-off\'s reminder');
    ok(!r.data[F.key(['cutdone', F.today + '_northside'])] && !r.data[F.key(['supplierlinks', F.today + '_northside'])], label + ': the closed cut-off is not linked or ticked');
    ok(!p.errors.length, label + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // Today's cut-off is still open at 15:00: the order is for today's, as before.
  p = await L.open(b, '#/suppliers/northside', { who: 'sam', extra: daily(15 * 60), wait: 1500 });
  r = await record(p);
  ok(r.orders.length === 1 && r.orders[0].cutoffDay === F.today && r.data[F.key(['cutdone', F.today + '_northside'])]?.on === true, 'open cut-off: the order is for today\'s cut-off');
  ok(!p.errors.length, 'open cut-off: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
