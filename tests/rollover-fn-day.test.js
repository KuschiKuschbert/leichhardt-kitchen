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

  // A copy rolled onto yesterday and removed there stays gone (13 Nov 2026): the rollover took two days ago as its source
  // again, because yesterday held no line still on it. A line added and removed yesterday that has nothing to do with it
  // does not stop the others rolling. The copy's id carries its first line's id (the phone's past days keep no root).
  const ydC = yday.replace(/-/g, ''), rem = {};
  rem[fsKey(['days', day2, 'items', 'c1'])] = line({ text: 'Cut chips' });
  rem[fsKey(['days', day2, 'items', 'c2'])] = line({ text: 'Pick parsley' });
  rem[fsKey(['days', yday, 'items', 'r' + ydC + '-c1'])] = line({ text: 'Cut chips', addedBy: 'Rolled over', addedById: '', rolled: 1, root: 'c1', from: 'c1', rolledFrom: day2, deleted: true, deletedBy: 'Sam' });
  rem[fsKey(['days', yday, 'items', 'u1'])] = line({ text: 'Typo line', deleted: true, deletedBy: 'Ann' });
  const q = await L.open(b, '#/prep', { extra: rem, wait: 3000 });
  const cp = id => fsKey(['days', today, 'items', 'r' + today.replace(/-/g, '') + '-' + id]);
  await L.waitFor(q, id => !!window.__fake.dump()[id], cp('c2'), 8000).catch(() => {});
  await L.settle(q, 300);
  const st2 = await q.evaluate(() => window.__fake.dump());
  ok(!st2[cp('c1')], 'a copy removed yesterday does not roll from two days ago again');
  ok(!!st2[cp('c2')], 'the open line from two days ago still rolls past a day that only had removed lines');
  ok(q.errors.length === 0, 'removed copy: no page errors ' + q.errors.join(' | '));
  await q.context().close();

  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
