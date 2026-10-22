// Prep rollover past a day that holds only a function's platter lines (22 Oct 2026 review, D1), and the rollover runs
// once a day per phone, a reload included (D3). Before, a kitchen day with only function lines (nobody wrote prep) was
// taken as the last written day; its platter lines never roll, so the open lines from the day before were left behind.
const L = require('./lib');
const { R, ok } = L.results();
const today = L.ymd(new Date(L.NOW)), yday = L.ymd(new Date(L.NOW - 86400000)), day2 = L.ymd(new Date(L.NOW - 2 * 86400000));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const reads = (page, re) => page.evaluate(src => window.__fake.reads.filter(k => new RegExp(src).test(k)).length, re);
const line = x => Object.assign({ text: 'Make stock', station: 'Sauce', qty: '10 L', recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 2 * 86400000 - 3600000, done: false, deleted: false }, x);
(async () => {
  const b = await L.start();
  const extra = {};
  extra[fsKey(['days', day2, 'items', 'd1'])] = line();
  extra[fsKey(['days', day2, 'items', 'd2'])] = line({ text: 'Pick coriander', qty: '', done: true });
  extra[fsKey(['days', yday, 'items', 'fn-smith-antipasto'])] = line({ text: 'Antipasto Platter', station: 'Functions', qty: '3', addedBy: 'Fay', addedById: 'fay', fn: 'smith', dupOk: true, addedAt: L.NOW - 86400000 - 3600000 });

  const p = await L.open(b, '#/prep', { extra, wait: 3000 });
  const rolledId = fsKey(['days', today, 'items', 'r' + today.replace(/-/g, '') + '-d1']);
  await L.waitFor(p, id => { const s = window.__fake.dump(); return !!s[id]; }, rolledId);
  const st = await p.evaluate(() => window.__fake.dump());
  const rolled = st[rolledId];
  ok(rolled && rolled.text === 'Make stock' && rolled.rolledFrom === day2, 'the open line from two days ago rolled to today past the function-only day');
  ok(!st[fsKey(['days', today, 'items', 'r' + today.replace(/-/g, '') + '-fn-smith-antipasto'])], 'the platter line did not roll');
  ok(!st[fsKey(['days', today, 'items', 'r' + today.replace(/-/g, '') + '-d2'])], 'the ticked line did not roll');
  ok(await p.evaluate(() => localStorage.getItem('lk.prep.rolled')) === today, 'the phone keeps that it rolled today (lk.prep.rolled)');

  const before = await reads(p, '/days/' + day2 + '/');
  await p.reload(); await L.settle(p, 3000);
  ok(await reads(p, '/days/' + day2 + '/') === 0, 'a reload does not read the rollover days again');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  ok(before >= 1, 'the first open read the day it rolled from (' + before + ')');
  await p.context().close();

  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
