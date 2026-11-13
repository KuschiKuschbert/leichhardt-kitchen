// Order lines that were not ordered roll onto today's order list, like prep lines, until someone ticks them as ordered.
const L = require('./lib');
const { R, ok } = L.results();
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
  ok(!!cream && cream.origAt === L.NOW - 90000000 && !!flour && flour.origAt === 0, 'rollover: origAt is the first written time (0 for a line rolled before it was kept)');
  ok(!s[fsKey(['orders', today, 'lines', rid('y2')])], 'rollover: an ordered line does not roll');
  ok(!s[fsKey(['orders', today, 'lines', rid('y3')])], 'rollover: a removed line does not roll');
  ok(!(await p.$('.o-page .nb-roll, .o-wait, #o-overdue')), 'staff rollover: the requests stay visible without waiting-age labels or groups');
  ok(!/rolled over/.test(await p.evaluate(() => (document.querySelector('.p-toast') || {}).textContent || '')), 'staff rollover: no age reminder appears over the list');
  const writes = await p.evaluate(() => window.__fake.writes.length);
  await p.reload({ waitUntil: 'load' });
  await L.settle(p, 1500);
  const again = await p.evaluate(d => window.__fake.writes.filter(w => w.some(o => o.path.indexOf('/orders/' + d + '/lines/r') >= 0)).length, today);
  ok(writes > 0 && again === 0, 'rollover: a second visit the same day does not roll again');
  ok(p.errors.length === 0, 'rollover: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Waiting from earlier days (one list since 3 Nov 2026, Everything to order went): each rolled item once, saying who
  // first wrote it and since when; ticking it marks today's copy ordered without reading the past days again
  const rolledToday = Object.assign({}, extra);
  rolledToday[fsKey(['orders', today, 'lines', rid('y1')])] = line('Cream', { qty: '4 L', addedBy: 'Rolled over', addedById: '', rolled: 1, root: 'y1', from: 'y1', rolledFrom: yday, since: yday, origBy: 'Ann', addedAt: L.NOW - 1000 });
  rolledToday[fsKey(['orders', today, 'lines', rid('f1')])] = line('Flour', { qty: '2 bags', addedBy: 'Rolled over', addedById: '', rolled: 2, root: 'f1', from: 'r-f1', rolledFrom: yday, since: ago2, origBy: 'Ann', addedAt: L.NOW - 1000 });
  p = await L.open(b, '#/orders', { wait: 1500, extra: rolledToday });
  await L.settle(p, 500);
  const waiting = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll('.o-main .nb-row .nb-t'), e => e.firstChild.textContent.trim()));
  ok(waiting.filter(t => t === 'Flour').length === 1 && waiting.filter(t => t === 'Cream').length === 1, 'waiting from earlier days: each rolled item shows once (' + waiting.join(', ') + ')');
  const flourRow = await p.evaluate(id => { const r = document.querySelector('.o-main [data-ln$="/' + id + '"]'); return r ? r.textContent : ''; }, rid('f1'));
  const ago2Short = await p.evaluate(d => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }); }, ago2);
  ok(/from Ann/.test(flourRow) && flourRow.indexOf('Since ' + ago2Short) >= 0 && !/Rolled over/.test(flourRow), 'waiting from earlier days: a rolled line says who wrote it and the day it was first written (' + flourRow.trim().slice(0, 80) + ')');
  const readsBefore = await p.evaluate(() => window.__fake.reads.length);
  await p.click('.o-main [data-p="otick"][data-id="' + rid('f1') + '"]');
  await L.settle(p, 500);
  const newReads = await p.evaluate(n => window.__fake.reads.slice(n), readsBefore);
  ok(!newReads.some(r => /\/orders\/\d{4}-\d\d-\d\d/.test(r) && r.indexOf('/orders/' + today) < 0), 'waiting from earlier days: a tick reads no past day (' + newReads.join(', ') + ')');
  s = await store(p);
  ok(s[fsKey(['orders', today, 'lines', rid('f1')])].ordered === true, 'waiting from earlier days: ticking marks today\'s copy ordered');
  ok(p.errors.length === 0, 'waiting from earlier days: no page errors ' + p.errors.join(' | '));
  // past days are kept on the phone for the day: a reload does not read the last 14 days of orders again
  await p.reload({ waitUntil: 'load' });
  await L.settle(p, 1500);
  const past = await p.evaluate(t => window.__fake.reads.filter(r => /\/orders\/\d{4}-\d\d-\d\d\/lines$/.test(r) && r.indexOf(t) < 0).length, today);
  ok(past === 0, 'reload: no past order days read again (' + past + ' reads)');
  await p.context().close();

  // A copy rolled onto yesterday and removed there stays gone (13 Nov 2026). The rollover took the last day with a line
  // still on it as its source, so with yesterday's only copy removed it rolled two days ago's line again. A line added and
  // removed yesterday that has nothing to do with it does not stop the other lines rolling.
  const ydC = yday.replace(/-/g, '');
  const gone = {};
  gone[fsKey(['orders', ago2, 'lines', 'g1'])] = line('Saffron', { qty: '1 jar' });
  gone[fsKey(['orders', ago2, 'lines', 'g2'])] = line('Salt', { qty: '1 box' });
  gone[fsKey(['orders', yday, 'lines', 'r' + ydC + '-g1'])] = line('Saffron', { qty: '1 jar', addedBy: 'Rolled over', addedById: '', rolled: 1, root: 'g1', from: 'g1', rolledFrom: ago2, since: ago2, deleted: true, deletedBy: 'Sam' });
  gone[fsKey(['orders', yday, 'lines', 'u1'])] = line('Typo line', { deleted: true, deletedBy: 'Ann' });
  // the same days from the night's digests: the rollover then reads only the day it copies from
  const night = L.NOW - 11 * 3600000, withDigests = Object.assign({}, gone), dIdx = {};
  for (let d = 1; d <= 7; d++) {
    const k = L.ymd(new Date(L.NOW - d * 86400000)), pre = fsKey(['orders', k, 'lines', '']);
    const orders = Object.keys(gone).filter(x => x.indexOf(pre) === 0).map(x => Object.assign({}, gone[x], { id: x.slice(pre.length) }));
    withDigests[fsKey(['digest', k])] = { v: 1, day: k, at: night, prep: [], orders };
    dIdx[k] = 'fp' + d;
  }
  withDigests[fsKey(['digest', '_index'])] = { v: 1, at: night, days: dIdx };
  for (const [name, seed] of [['lines', gone], ['digests', withDigests]]) {
    p = await L.open(b, '#/orders', { who: 'ann', wait: 2000, extra: seed });
    await L.waitFor(p, k => !!window.__fake.dump()[k], fsKey(['orders', today, 'lines', rid('g2')]), 8000).catch(() => {});
    await L.settle(p, 300);
    s = await store(p);
    ok(!s[fsKey(['orders', today, 'lines', rid('g1')])], name + ': a copy removed yesterday does not roll from two days ago again');
    ok(!!s[fsKey(['orders', today, 'lines', rid('g2')])], name + ': the line still not ordered two days ago rolls past a day that only had removed lines');
    ok(p.errors.length === 0, name + ': removed copy, no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  await b.close();
  L.report(R);
})();
