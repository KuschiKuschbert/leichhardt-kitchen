// Closing soon with Log waste comes up on the prep list and the order list (head chef, 22 Oct 2026), from an hour before
// tomorrow's list is usually written on this weekday (summary/learned lists, which every page reads). One Hide for
// today hides it on both. On a laptop (900 px and wider) it sits at the top of Handy with the waste review note, so the
// prep lines start at the top of the list (23 Oct 2026).
const L = require('./lib');
const { R, ok } = L.results();
const today = L.ymd(new Date(L.NOW));
const yday = L.ymd(new Date(L.NOW - 86400000));
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

  // the waste review note from last night, for the next two checks
  const note = Object.assign({}, lists);
  note[fsKey(['waste', yday])] = { avoidable: '', change: 'Make half a batch of slaw', reviewBy: 'Sam', reviewAt: L.NOW - 86400000 };
  const shown = p => p.evaluate(() => [...document.querySelectorAll('.nb-flag')].filter(e => e.getClientRects().length).map(e => (e.closest('.nb-right') ? 'Handy: ' : 'list: ') + e.querySelector('.nb-sl').textContent));
  const both = () => { const f = [...document.querySelectorAll('.nb-flag')]; return f.some(e => /Closing soon/.test(e.textContent)) && f.some(e => /half a batch/.test(e.textContent)); };

  // phone: both cards sit above the lines, as before
  p = await L.open(b, '#/prep', { who: 'ann', wait: 2000, clock: at(20, 30), extra: note });
  await L.waitFor(p, both, null, 6000).catch(() => {});
  let s = await shown(p);
  ok(s.length === 2 && s.every(x => /^list: /.test(x)), 'phone: Closing soon and the waste review note sit above the lines (' + s.join(', ') + ')');
  await p.context().close();

  // laptop: both cards at the top of Handy, and the first line near the top of the list
  p = await L.open(b, '#/prep', { who: 'ann', wait: 2000, clock: at(20, 30), extra: note, width: 1280, height: 900 });
  await L.waitFor(p, both, null, 6000).catch(() => {});
  s = await shown(p);
  ok(s.length === 2 && s.every(x => /^Handy: /.test(x)) && /Closing soon/.test(s[0]), 'laptop: Closing soon and the waste review note sit at the top of Handy (' + s.join(', ') + ')');
  const gap = await p.evaluate(() => { const bd = document.querySelector('.nb-left .nb-body'), r = document.querySelector('.nb-left .nb-row'); return bd && r ? Math.round(r.getBoundingClientRect().top - bd.getBoundingClientRect().top) : -1; });
  ok(gap >= 0 && gap < 120, 'laptop: the first prep line is near the top of the list (' + gap + ' px down)');
  await p.click('.nb-right .nb-close [data-p="close-hide"]');
  await L.settle(p, 300);
  ok(!(await p.$('.nb-close')), 'laptop: Hide for today takes both copies away');
  ok(!(await L.overflow(p)), 'laptop: no sideways scroll');
  ok(p.errors.length === 0, 'laptop: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
