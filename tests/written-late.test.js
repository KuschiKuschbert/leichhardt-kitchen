// A line written after the usual close is meant for the next day: it moves onto that day without counting as rolled.
// Only if it is still open after that day does it show as rolled. Same for order lines. (No past ticks in the seed,
// so the cut-off is the 20:00 fallback.)
const L = require('./lib');
const R = [];
const ok = (c, m) => L.check(c, m, R);
const today = L.ymd(new Date(L.NOW));
const yday = L.ymd(new Date(L.NOW - 86400000));
const ago2 = L.ymd(new Date(L.NOW - 2 * 86400000));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const rid = id => 'r' + today.replace(/-/g, '') + '-' + id;
const at = (day, h, m) => { const p = day.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], h, m).getTime(); };
const row = (page, id) => page.evaluate(i => { const e = document.getElementById('nbr-' + i); return e ? e.textContent : ''; }, id);
(async () => {
  const b = await L.start();
  let p, s;
  const item = (text, addedAt, x) => Object.assign({ text, station: 'Larder', qty: '', recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt, done: false, deleted: false }, x || {});
  const extra = {};
  extra[fsKey(['days', yday, 'items', 'late'])] = item('Veal stock', at(yday, 21, 30));
  extra[fsKey(['days', yday, 'items', 'day'])] = item('Pickle onions', at(yday, 10, 0));
  // written late two days ago, moved to yesterday (ahead), still not done: now it counts as rolled once
  extra[fsKey(['days', ago2, 'items', 'old'])] = item('Confit duck', at(ago2, 22, 0));
  extra[fsKey(['days', yday, 'items', 'r-old'])] = item('Confit duck', at(yday, 6, 0), { addedBy: 'Rolled over', addedById: '', rolled: 1, ahead: true, root: 'old', from: 'old', rolledFrom: ago2, origBy: 'Ann' });
  extra[fsKey(['orders', yday, 'lines', 'ol'])] = { text: 'Flour', qty: '', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: at(yday, 22, 15), ordered: false, deleted: false };

  p = await L.open(b, '#/prep', { who: 'ann', wait: 2500, extra });
  s = await store(p);
  const late = s[fsKey(['days', today, 'items', rid('late')])], day = s[fsKey(['days', today, 'items', rid('day')])], duck = s[fsKey(['days', today, 'items', rid('old')])];
  ok(!!late && late.rolled === 1 && late.ahead === true, 'late line: moved to today and marked as written ahead');
  ok(!!day && day.rolled === 1 && !day.ahead, 'daytime line: rolled as before');
  ok(!!duck && duck.rolled === 2 && duck.ahead === true, 'late line still open a day later: rolls again, keeps ahead');
  ok(!!day && day.origAt === at(yday, 10, 0) && !!late && late.origAt === at(yday, 21, 30), 'rolled lines: keep the time they were first written (origAt)');
  ok(!!duck && duck.origAt === 0, 'a line that rolled before origAt was kept: origAt 0, not a roll time');
  const tLate = await row(p, rid('late')), tDay = await row(p, rid('day')), tDuck = await row(p, rid('old'));
  ok(!/Rolled/.test(tLate) && /From last night/.test(tLate), 'late line: no Rolled badge, says from last night (' + tLate.trim().slice(0, 60) + ')');
  ok(/Rolled/.test(tDay), 'daytime line: Rolled badge');
  ok(/Rolled/.test(tDuck) && !/Rolled x2/.test(tDuck), 'late line open a day later: Rolled once, not x2');
  ok(p.errors.length === 0, 'prep: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/orders', { who: 'ann', wait: 2000, extra });
  s = await store(p);
  const fl = s[fsKey(['orders', today, 'lines', rid('ol')])];
  ok(!!fl && fl.ahead === true && fl.since === today, 'late order line: moved to today, waiting since today');
  ok(!!fl && fl.origAt === at(yday, 22, 15), 'late order line: keeps the time it was first written (origAt)');
  ok(!/Since/.test(await p.evaluate(() => document.querySelector('.o-page').textContent)), 'late order line: no Since label yet');
  ok(p.errors.length === 0, 'orders: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
