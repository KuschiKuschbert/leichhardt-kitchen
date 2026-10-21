// Read budget (coding rules, 22 Oct 2026): what each page open and each reload costs in Firestore reads, counted the way
// the real Firestore bills them (tests/fake: a getDoc is one read, a query one per document, at least one, a listener what
// it first sends). The free plan stops the book for the day at 50,000 reads, so a change that goes over a budget here
// either reads less or raises the budget in the same pull request, with the reason.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const day = n => L.ymd(new Date(L.NOW - n * 86400000));
// a kitchen that has been running a while: 300 learned prep items, 80 learned order items, a week of prep, orders and
// wastage behind it, and the people's tallies
const extra = {};
for (let i = 0; i < 300; i++) extra[fsKey(['learned', 'item-' + i])] = { text: 'Item ' + i, uses: 300 - i, dow: {}, secs: {}, qtys: {}, hidden: false };
for (let i = 0; i < 80; i++) extra[fsKey(['ordlearned', 'ord-' + i])] = { text: 'Order ' + i, uses: 80 - i, dow: {}, qtys: {}, hidden: false };
for (let d = 1; d <= 7; d++) for (let i = 0; i < 20; i++) {
  extra[fsKey(['days', day(d), 'items', 'p' + d + '-' + i])] = { text: 'Line ' + i, station: 'Larder', qty: '', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - d * 86400000, done: true, doneAt: L.NOW - d * 86400000 + 3600000, deleted: false };
  if (i < 5) extra[fsKey(['orders', day(d), 'lines', 'o' + d + '-' + i])] = { text: 'Milk ' + i, qty: '2 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - d * 86400000, ordered: true, deleted: false };
}
['sam', 'ann', 'bo'].forEach(id => { extra[fsKey(['activity', id])] = { name: id, added: 3, ticked: 4, visits: 5, lastSeen: L.NOW - 3600000 }; });

const billed = p => p.evaluate(() => window.__fake.bill.slice());
const sum = b => b.reduce((t, x) => t + x.n, 0);
function top(b) {
  const m = {};
  b.forEach(x => { const k = x.kind + ' ' + x.path.replace(/^kitchens\/[^/]+\//, '').replace(/\d{4}-\d{2}-\d{2}/g, 'DAY').replace(/\/[^/]+$/, x.kind === 'get' ? '/ID' : '$&'); m[k] = (m[k] || 0) + x.n; });
  return Object.keys(m).sort((a, b2) => m[b2] - m[a]).slice(0, 8).map(k => k + ' ' + m[k]).join(', ');
}
async function measure(b, hash, o, settle) {
  const p = await L.open(b, hash, Object.assign({ extra, wait: 2500 }, o || {}));
  await L.settle(p, settle || 1500);
  return p;
}
(async () => {
  const b = await L.start();
  // measured 22 Oct 2026 with this seed: first open 655, reload 17, admin 699, admin again 27 (before: first open 775, the
  // rollover read seven past days the past-days list had just read; reload 317 and admin again 699, the learned list and
  // the admin's past days read again every time). RB_SHOW=1 prints what costs most.
  const BUDGET = { first: 680, reload: 40, admin: 720, admin2: 60 };
  const show = !!process.env.RB_SHOW;

  // a staff phone opens the prep list for the first time today, then goes to orders and wastage
  let p = await measure(b, '#/prep', { who: 'ann' });
  await p.evaluate(() => { location.hash = '#/orders'; }); await L.settle(p, 1200);
  await p.evaluate(() => { location.hash = '#/waste'; }); await L.settle(p, 1200);
  let bl = await billed(p);
  const first = sum(bl);
  if (show) console.log('first open: ' + first + ' (' + top(bl) + ')');
  // the same phone reloads (the 04:00 refresh, an update): what is kept for the day must not be read again
  await p.reload(); await L.settle(p, 2500);
  await p.evaluate(() => { location.hash = '#/orders'; }); await L.settle(p, 1200);
  await p.evaluate(() => { location.hash = '#/waste'; }); await L.settle(p, 1200);
  bl = await billed(p);
  const reload = sum(bl);
  if (show) console.log('reload: ' + reload + ' (' + top(bl) + ')');
  ok(p.errors.length === 0, 'staff: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the head chef opens the admin panel (Insights, then Wastage and Team)
  p = await measure(b, '#/admin', { admin: true, who: '' }, 2500);
  await L.adminTab(p, 'waste'); await L.settle(p, 1500);
  await L.adminTab(p, 'team'); await L.settle(p, 1500);
  bl = await billed(p);
  const admin = sum(bl);
  if (show) console.log('admin: ' + admin + ' (' + top(bl) + ')');
  // later the same day: the past days come from the device's own copy
  await p.reload(); await L.settle(p, 2500);
  await L.adminTab(p, 'waste'); await L.settle(p, 1500);
  await L.adminTab(p, 'team'); await L.settle(p, 1500);
  bl = await billed(p);
  const admin2 = sum(bl);
  if (show) console.log('admin again: ' + admin2 + ' (' + top(bl) + ')');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  {
    ok(first <= BUDGET.first, 'staff first open today: ' + first + ' reads (budget ' + BUDGET.first + ')');
    ok(reload <= BUDGET.reload, 'staff reload the same day: ' + reload + ' reads (budget ' + BUDGET.reload + ')');
    ok(admin <= BUDGET.admin, 'admin panel open: ' + admin + ' reads (budget ' + BUDGET.admin + ')');
    ok(admin2 <= BUDGET.admin2, 'admin panel again the same day: ' + admin2 + ' reads (budget ' + BUDGET.admin2 + ')');
  }
  await b.close();
  L.report(R);
})();
