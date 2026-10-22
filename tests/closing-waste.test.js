// Closing soon with Log waste comes up on the prep list and the order list (head chef, 22 Oct 2026), from an hour before
// tomorrow's list is usually written on this weekday (summary/learned lists, which every page reads). One Hide for
// today hides it on both.
const L = require('./lib');
const { R, ok } = L.results();
const today = L.ymd(new Date(L.NOW));
const dow = String(new Date(L.NOW).getDay());
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const at = (h, m) => { const d = new Date(L.NOW); d.setHours(h, m, 0, 0); return d.getTime(); };
const lists = { [fsKey(['summary', 'learned'])]: { day: today, items: [], lists: { days: {}, dow: { [dow]: 21 * 60 }, usual: 22 * 60, n: 8 }, at: L.NOW - 3600000 } };
const card = p => p.evaluate(() => { const e = document.querySelector('.nb-close'); return e ? e.textContent : ''; });
const go = async (p, hash) => { await p.evaluate(h => { location.hash = h; }, hash); await L.settle(p, 600); };
(async () => {
  const b = await L.start();
  let p, t;

  // 20:30, the list is usually written from 21:00 on this weekday: the card is on both lists
  p = await L.open(b, '#/prep', { who: 'ann', wait: 2000, clock: at(20, 30), extra: lists });
  await L.waitFor(p, () => !!document.querySelector('.nb-close'), null, 6000).catch(() => {});
  t = await card(p);
  ok(/Closing soon/.test(t) && /lines are still open and will roll to tomorrow/.test(t) && /log any waste before you go/.test(t), 'prep: Closing soon says what will roll over and to log waste (' + t.trim().slice(0, 90) + ')');
  ok(!/\d\d:\d\d/.test(t), 'prep: the card shows no clock time (that is on the Learning page)');
  ok(await p.evaluate(() => !!document.querySelector('.nb-close a.btn[href="#/waste"]')), 'prep: Log waste opens the wastage log');
  await go(p, '#/orders');
  await L.waitFor(p, () => !!document.querySelector('.o-page .nb-close'), null, 6000).catch(() => {});
  t = await card(p);
  ok(/Closing soon/.test(t) && /^Closing soonLog any waste before you go\./.test(t.trim()), 'orders: Closing soon with Log any waste before you go (' + t.trim().slice(0, 60) + ')');
  await p.click('.nb-close a.btn[href="#/waste"]');
  await L.settle(p, 600);
  ok(await p.evaluate(() => location.hash === '#/waste'), 'orders: Log waste opens the wastage log');
  await go(p, '#/orders');
  await p.click('.nb-close [data-p="close-hide"]');
  await L.settle(p, 300);
  ok(!(await card(p)), 'orders: Hide for today takes it away');
  await go(p, '#/prep');
  ok(!(await card(p)), 'prep: one Hide for today hides it on the prep list too');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // everything ticked: still a reminder to log waste
  const done = Object.assign({}, lists);
  ['i1', 'i2', 'i3', 'i4', 'i5', 'i6'].forEach((id, k) => { done[fsKey(['days', today, 'items', id])] = { text: 'Line ' + k, station: 'Larder', qty: '', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 3600000, done: true, doneBy: 'Sam', doneById: 'sam', doneAt: L.NOW, deleted: false }; });
  p = await L.open(b, '#/prep', { who: 'ann', wait: 2000, clock: at(20, 30), extra: done });
  await L.waitFor(p, () => !!document.querySelector('.nb-close'), null, 6000).catch(() => {});
  t = await card(p);
  ok(/Log any waste before you go/.test(t) && !/still open/.test(t), 'prep, all ticked: the card still says to log waste (' + t.trim().slice(0, 60) + ')');
  await p.context().close();

  // 19:30, more than an hour before: no card on either list
  p = await L.open(b, '#/prep', { who: 'ann', wait: 2000, clock: at(19, 30), extra: lists });
  await L.settle(p, 800);
  ok(!(await card(p)), 'prep: no card more than an hour before');
  await go(p, '#/orders');
  ok(!(await card(p)), 'orders: no card more than an hour before');
  await p.context().close();

  await b.close();
  L.report(R);
})();
