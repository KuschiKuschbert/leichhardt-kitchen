// Tomorrow's list (22 Oct 2026, head chef): the rollover goes by when the team wrote the next day's prep list. Lines
// written before that batch roll over (Rolled); lines from then on are tomorrow's list and look normal (ahead). The
// batch is clocked from the night's own lines (js/learn.js), else from what the server clocked (summary/learned lists),
// else the usual time for the weekday. The order list goes by the same time. The admin Learning page shows it.
const L = require('./lib');
const { R, ok } = L.results(), { row } = L;
const today = L.ymd(new Date(L.NOW));
const yday = L.ymd(new Date(L.NOW - 86400000));
const ydow = String(new Date(L.NOW - 86400000).getDay());
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const rid = id => 'r' + today.replace(/-/g, '') + '-' + id;
const at = (day, h, m) => { const p = day.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], h, m).getTime(); };
const item = (text, addedAt, x) => Object.assign({ text, station: 'Larder', qty: '', recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt, done: false, deleted: false }, x || {});
const oline = (text, addedAt) => ({ text, qty: '', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt, ordered: false, deleted: false });
// n lines on yesterday from h:m, one every 2 minutes
const batch = (extra, key, h, m, n) => { for (let i = 0; i < n; i++) extra[fsKey(['days', yday, 'items', key + i])] = item('Night ' + key + ' ' + i, at(yday, h, m + i * 2)); };
const lists = v => ({ [fsKey(['summary', 'learned'])]: { day: today, items: [], lists: v, at: L.NOW - 3600000 } });
const copy = (s, id) => s[fsKey(['days', today, 'items', rid(id)])];
(async () => {
  const b = await L.start();
  let p, s, e;

  // the list was written early, from 19:10: a line in it is tomorrow's even before 20:00, a line from 16:00 rolled over
  e = {};
  batch(e, 'a', 19, 10, 8);
  e[fsKey(['days', yday, 'items', 'early'])] = item('Dice onion', at(yday, 16, 0));
  p = await L.open(b, '#/prep', { who: 'ann', wait: 2500, extra: e });
  await L.waitFor(p, id => !!document.getElementById('nbr-' + id), rid('a0'), 8000).catch(() => {});
  s = await store(p);
  ok(!!copy(s, 'a0') && copy(s, 'a0').ahead === true && copy(s, 'a7').ahead === true, 'early list: the lines written from 19:10 are tomorrow\'s (ahead)');
  ok(!!copy(s, 'early') && !copy(s, 'early').ahead && copy(s, 'early').rolled === 1, 'early list: the 16:00 line rolled over');
  ok(!/Rolled/.test(await row(p, rid('a0')) || 'Rolled') && /Rolled/.test(await row(p, rid('early')) || ''), 'early list: the list line looks normal, the 16:00 line shows Rolled');
  ok(p.errors.length === 0, 'early list: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the list was written late, from 21:30: a line from 20:30 is a real leftover now (it was "after close" at 20:00 before)
  e = {};
  batch(e, 'b', 21, 30, 8);
  e[fsKey(['days', yday, 'items', 'left'])] = item('Pick parsley', at(yday, 20, 30));
  p = await L.open(b, '#/prep', { who: 'ann', wait: 2500, extra: e });
  await L.waitFor(p, id => !!document.getElementById('nbr-' + id), rid('left'), 8000).catch(() => {});
  s = await store(p);
  ok(!!copy(s, 'left') && !copy(s, 'left').ahead && /Rolled/.test(await row(p, rid('left')) || ''), 'late list: the 20:30 line rolled over (Rolled)');
  ok(!!copy(s, 'b3') && copy(s, 'b3').ahead === true, 'late list: the lines written from 21:30 are tomorrow\'s');
  await p.context().close();

  // no batch in the night's lines: the usual time for that weekday (19:00) wins over the usual time of any night and 20:00
  e = lists({ days: { [yday]: { m: -1, n: 0 } }, dow: { [ydow]: 19 * 60 }, usual: 22 * 60, n: 5 });
  e[fsKey(['days', yday, 'items', 'q1'])] = item('Zest lemons', at(yday, 18, 30));
  e[fsKey(['days', yday, 'items', 'q2'])] = item('Pick mint', at(yday, 19, 30));
  p = await L.open(b, '#/prep', { who: 'ann', wait: 2500, extra: e });
  await L.waitFor(p, id => !!document.getElementById('nbr-' + id), rid('q2'), 8000).catch(() => {});
  s = await store(p);
  ok(!!copy(s, 'q1') && !copy(s, 'q1').ahead && !!copy(s, 'q2') && copy(s, 'q2').ahead === true, 'weekday time: 18:30 rolled over, 19:30 is tomorrow\'s');
  await p.context().close();

  // the order list goes by the night the server clocked (19:00): a 19:40 order line waits since today, an 18:00 one since yesterday
  e = lists({ days: { [yday]: { m: 19 * 60, n: 9 } }, dow: { [ydow]: 22 * 60 }, usual: 22 * 60, n: 5 });
  e[fsKey(['orders', yday, 'lines', 'ol1'])] = oline('Flour', at(yday, 19, 40));
  e[fsKey(['orders', yday, 'lines', 'ol2'])] = oline('Sugar', at(yday, 18, 0));
  p = await L.open(b, '#/orders', { who: 'ann', wait: 2000, extra: e });
  await L.waitFor(p, () => Object.keys(window.__fake.dump()).some(k => /\/orders\/[^/]+\/lines\/r\d+-ol1$/.test(k)), null, 8000).catch(() => {});
  s = await store(p);
  const fl = s[fsKey(['orders', today, 'lines', rid('ol1')])], su = s[fsKey(['orders', today, 'lines', rid('ol2')])];
  ok(!!fl && fl.ahead === true && fl.since === today, 'orders: the 19:40 line is tomorrow\'s, waiting since today (' + JSON.stringify(fl && { ahead: fl.ahead, since: fl.since }) + ')');
  ok(!!su && !su.ahead && su.since === yday, 'orders: the 18:00 line rolled over, waiting since yesterday');
  ok(p.errors.length === 0, 'orders: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the admin Learning page shows the clocked times
  const nights = {};
  for (let i = 1; i <= 7; i++) nights[L.ymd(new Date(L.NOW - i * 86400000))] = i === 2 ? { m: -1, n: 0 } : { m: 21 * 60 + i, n: 10 + i };
  p = await L.open(b, '#/admin', { admin: true, wait: 1600, extra: lists({ days: nights, dow: { [ydow]: 21 * 60 + 1 }, usual: 21 * 60 + 10, n: 6 }) });
  await L.adminTab(p, 'learning');
  await L.waitFor(p, () => /When tomorrow/.test(document.body.textContent), null, 5000).catch(() => {});
  const t = await p.evaluate(() => document.body.textContent);
  ok(/When tomorrow's list is written/.test(t) && /21:10\s*usual start, 6 of the last 7 nights/.test(t), 'Learning: the usual start, 21:10, from 6 nights');
  ok(/21:01/.test(t) && /11 lines/.test(t) && /No list found/.test(t), 'Learning: the last nights with their times and line counts, and a night with no list');
  ok(await p.evaluate(() => [...document.querySelectorAll('.a-nav button, .a-nav a')].some(x => /tomorrow/i.test(x.textContent))), 'Learning: the block has its own chip in the admin nav');
  ok(p.errors.length === 0, 'Learning: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // odd values in the record (a booby-trapped night, a time that is text) are left out, not drawn
  p = await L.open(b, '#/admin', { admin: true, wait: 1600, extra: lists({ days: { '<img src=x id=boom>': { m: 1200, n: 9 }, [yday]: { m: '<b id=boom>21:00</b>', n: '9' } }, dow: { '9': 1200, [ydow]: 'late' }, usual: '<i id=boom>', n: 'lots' }) });
  await L.adminTab(p, 'learning');
  await L.waitFor(p, () => /When tomorrow/.test(document.body.textContent), null, 5000).catch(() => {});
  ok(/Not clocked yet/.test(await p.evaluate(() => document.body.textContent)), 'Learning: not clocked yet says so');
  ok(await p.evaluate(() => !document.getElementById('boom') && !/<img|<b |<i /.test(document.body.textContent)), 'Learning: odd values in the record are left out, no markup added');
  ok(p.errors.length === 0, 'Learning, odd values: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
