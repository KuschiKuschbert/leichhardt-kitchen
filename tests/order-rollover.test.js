// Order lines that were not ordered roll onto today's order list, like prep lines, until someone ticks them as ordered.
const L = require('./lib');
const R = [];
const ok = (c, m) => L.check(c, m, R);
const today = L.ymd(new Date(L.NOW));
const yday = L.ymd(new Date(L.NOW - 86400000));
const ago2 = L.ymd(new Date(L.NOW - 2 * 86400000));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const rid = id => 'r' + today.replace(/-/g, '') + '-' + id;
(async () => {
  const b = await L.start();
  let p, s;
  const line = (text, x) => Object.assign({ text, qty: '', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 90000000, ordered: false, deleted: false }, x || {});
  const extra = {};
  // two days ago: flour was written; yesterday it rolled over (its copy is on yesterday's list) and was still not ordered
  extra[fsKey(['orders', ago2, 'lines', 'f1'])] = line('Flour', { qty: '2 bags' });
  extra[fsKey(['orders', yday, 'lines', 'r-f1'])] = line('Flour', { qty: '2 bags', addedBy: 'Rolled over', addedById: '', rolled: 1, root: 'f1', from: 'f1', rolledFrom: ago2, since: ago2, origBy: 'Ann' });
  extra[fsKey(['orders', yday, 'lines', 'y1'])] = line('Cream', { qty: '4 L' });
  extra[fsKey(['orders', yday, 'lines', 'y2'])] = line('Butter', { ordered: true, orderedBy: 'Sam', orderedAt: L.NOW - 80000000 });
  extra[fsKey(['orders', yday, 'lines', 'y3'])] = line('Eggs', { deleted: true });

  p = await L.open(b, '#/orders', { who: 'ann', wait: 2000, extra });
  s = await store(p);
  const cream = s[fsKey(['orders', today, 'lines', rid('y1')])], flour = s[fsKey(['orders', today, 'lines', rid('f1')])];
  ok(!!cream && cream.rolled === 1 && cream.from === 'y1' && cream.ordered === false, 'rollover: a line not ordered yesterday is on today\'s list');
  ok(!!flour && flour.rolled === 2 && flour.since === ago2 && flour.origBy === 'Ann', 'rollover: it keeps rolling, counting days and the first day');
  ok(!s[fsKey(['orders', today, 'lines', rid('y2')])], 'rollover: an ordered line does not roll');
  ok(!s[fsKey(['orders', today, 'lines', rid('y3')])], 'rollover: a removed line does not roll');
  ok(/Since/.test(await p.evaluate(() => document.querySelector('.o-page').textContent)), 'rollover: the line shows since when it is waiting');
  ok(/rolled over/.test(await p.evaluate(() => (document.querySelector('.p-toast') || {}).textContent || '')), 'rollover: a toast says lines rolled over');
  const writes = await p.evaluate(() => window.__fake.writes.length);
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(1500);
  const again = await p.evaluate(d => window.__fake.writes.filter(w => w.some(o => o.path.indexOf('/orders/' + d + '/lines/r') >= 0)).length, today);
  ok(writes > 0 && again === 0, 'rollover: a second visit the same day does not roll again');
  ok(p.errors.length === 0, 'rollover: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Everything to order (sous chef): each item once, as its newest copy, and ticking it marks it ordered
  const rolledToday = Object.assign({}, extra);
  rolledToday[fsKey(['orders', today, 'lines', rid('y1')])] = line('Cream', { qty: '4 L', addedBy: 'Rolled over', addedById: '', rolled: 1, root: 'y1', from: 'y1', rolledFrom: yday, since: yday, origBy: 'Ann', addedAt: L.NOW - 1000 });
  rolledToday[fsKey(['orders', today, 'lines', rid('f1')])] = line('Flour', { qty: '2 bags', addedBy: 'Rolled over', addedById: '', rolled: 2, root: 'f1', from: 'r-f1', rolledFrom: yday, since: ago2, origBy: 'Ann', addedAt: L.NOW - 1000 });
  p = await L.open(b, '#/orders', { wait: 1500, extra: rolledToday });
  await p.click('[data-p="oview"][data-v="all"]');
  await p.waitForTimeout(800);
  const groups = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll('.o-group .nb-t'), e => e.firstChild.textContent.trim() + (e.querySelector('.o-n') ? ' ' + e.querySelector('.o-n').textContent : '')));
  ok(groups.indexOf('Flour') >= 0 && groups.indexOf('Cream') >= 0 && !groups.some(g => / x\d/.test(g) && /Flour|Cream/.test(g)), 'everything to order: each rolled item shows once (' + groups.join(', ') + ')');
  await p.click('.o-group [data-k2="flour"]');
  await p.waitForTimeout(500);
  s = await store(p);
  ok(s[fsKey(['orders', today, 'lines', rid('f1')])].ordered === true, 'everything to order: ticking marks the newest copy ordered');
  ok(p.errors.length === 0, 'everything to order: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
