// A line written after the usual close is meant for the next day: it moves onto that day without counting as rolled.
// Only if it is still open after that day does it show as rolled. Same for order lines. (No past ticks in the seed,
// so the cut-off is the 20:00 fallback.)
const L = require('./lib');
const { R, ok } = L.results(), { row } = L;
const today = L.ymd(new Date(L.NOW));
const yday = L.ymd(new Date(L.NOW - 86400000));
const ago2 = L.ymd(new Date(L.NOW - 2 * 86400000));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const rid = id => 'r' + today.replace(/-/g, '') + '-' + id;
const at = (day, h, m) => { const p = day.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], h, m).getTime(); };
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
  // rolled this morning by older code, before the rule: the original was written at 21:45, the copy has no ahead mark
  extra[fsKey(['days', yday, 'items', 'old2'])] = item('Brine pork', at(yday, 21, 45));
  extra[fsKey(['days', today, 'items', rid('old2')])] = item('Brine pork', at(today, 6, 0), { addedBy: 'Rolled over', addedById: '', rolled: 1, root: 'old2', from: 'old2', rolledFrom: yday, origBy: 'Ann' });
  // and one written in the afternoon: it really did roll over
  extra[fsKey(['days', yday, 'items', 'day2'])] = item('Peel garlic', at(yday, 15, 0));
  extra[fsKey(['days', today, 'items', rid('day2')])] = item('Peel garlic', at(today, 6, 0), { addedBy: 'Rolled over', addedById: '', rolled: 1, root: 'day2', from: 'day2', rolledFrom: yday, origBy: 'Ann' });
  // written three days ago and still open: rolled x3, labelled with the day it was first written
  const ago3 = L.ymd(new Date(L.NOW - 3 * 86400000));
  extra[fsKey(['days', today, 'items', rid('old3')])] = item('Cure salmon', at(today, 6, 0), { addedBy: 'Rolled over', addedById: '', rolled: 3, root: 'old3', from: 'old3', rolledFrom: yday, origBy: 'Ann', origAt: at(ago3, 10, 0) });
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
  ok(!/Rolled|last night|from Ann/.test(tLate) && /Ann/.test(tLate), 'late line: looks like a normal line, with who wrote it (' + tLate.trim().slice(0, 60) + ')');
  ok(/Rolled/.test(tDay), 'daytime line: Rolled badge');
  ok(/Rolled/.test(tDuck) && !/Rolled x2/.test(tDuck), 'late line open a day later: Rolled once, not x2');
  const fixed = s[fsKey(['days', today, 'items', rid('old2')])], kept = s[fsKey(['days', today, 'items', rid('day2')])];
  ok(fixed.ahead === true && fixed.origAt === at(yday, 21, 45), 'repair: a line rolled before the rule, written late, is marked from last night');
  ok(!kept.ahead, 'repair: a line written in the afternoon stays rolled');
  ok(!/Rolled|last night/.test(await row(p, rid('old2'))), 'repair: the repaired line looks like a normal line');
  ok(/Rolled/.test(await row(p, rid('day2'))), 'repair: the afternoon line still shows Rolled');
  ok(/from Ann, yesterday/.test(tDay), 'rolled once: says who wrote it and that it was yesterday (' + tDay.trim().slice(0, 80) + ')');
  const wd3 = new Date(at(ago3, 10, 0)).toLocaleDateString('en-AU', { weekday: 'short' }), t3 = await row(p, rid('old3'));
  ok(/Rolled x3/.test(t3) && t3.includes('from Ann, ' + wd3), 'rolled x3: says the weekday it was first written (' + t3.trim().slice(0, 80) + ')');
  const start = await p.evaluate(() => [...document.querySelectorAll('.nb-start')].map(e => e.textContent).join(' '));
  ok(/Rolled over x3/.test(start) && !/Rolled over x2/.test(start), 'Start here: counts rolls like the line does (written ahead is not a roll)');
  ok(late.origAt === at(yday, 21, 30), 'new copies carry the time the original was written');
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
