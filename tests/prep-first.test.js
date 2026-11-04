// The prep list's first screen on a phone: Start here is numbered on the lines themselves, the "x of y done" count is the
// way to Done today once something is ticked, and Quick add sits in the add box, in the Add a line sheet (and only there:
// Handy's copy is for big screens) (work pages redesign A, 3 Nov 2026). The Writing as row is gone (3 Nov 2026, who is
// signed in is on the chef hat): your own place for ticks is in the Top tickers strip (23 Oct 2026).
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const extra = {};
extra[fsKey(['learned', 'mise-onions'])] = { text: 'Mise onions', uses: 6, typed: 6, secs: { larder: { name: 'Larder', n: 6 } }, dow: {} };
extra[fsKey(['learned', 'make-aioli'])] = { text: 'Make aioli', uses: 5, typed: 5, secs: { sauce: { name: 'Sauce', n: 5 } }, dow: {} };
const top = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top) : -1; }, sel);
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/prep', { extra, wait: 1600 });
  const nums = await p.$$eval('.nb-row .nb-t[data-n]', l => l.length);
  ok(nums > 0 && !(await p.$('.nb-start')), 'phone: Start here is numbered on the lines, with no box of its own (' + nums + ')');
  const first = await top(p, '.nb-rows li');
  ok(first > 0 && first < 560, 'phone: the first line starts higher up (' + first + ')');
  ok(!(await p.$('button.nb-prog')), 'phone: nothing ticked, the count is not a button');
  ok(await p.evaluate(() => { const q = document.querySelector('.nb-right .nb-quick'); return !q || !q.getClientRects().length; }), 'phone: Handy shows no second copy of the chips');
  await L.tap(p, '[data-p="tick"][data-id="i1"]'); await L.settle(p, 400);
  ok(/^1 of \d+ done$/.test((await L.txt(p, 'button.nb-prog') || '').trim()), 'phone: one ticked, "1 of n done" is the button to Done today');
  await L.pLog(p);
  ok(await p.$('.p-sheet .nb-qadd [data-p="quick"]') !== null, 'phone: Quick add sits in the add box, in the Add a line sheet');
  ok(p.errors.length === 0, 'phone: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/prep', { extra, width: 1280, height: 900, wait: 1600 });
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.nb-qadd') || document.body).display) === 'none' || !(await p.$('.nb-qadd')), 'laptop: Quick add stays in Handy only');
  await p.context().close();

  // ticks over the last 7 days: Sam 5, Ann 4, Kim 3, Bo 2. Bo (4th) is signed in.
  const week = {}, ago = n => L.ymd(new Date(L.NOW - n * 86400000));
  [['Sam', 5], ['Ann', 4], ['Kim', 3], ['Bo', 2]].forEach(([name, n]) => { for (let k = 0; k < n; k++) week[fsKey(['days', ago(1 + k % 3), 'items', 'w' + name + k])] = { text: name + ' job ' + k, station: 'Larder', qty: '', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - (1 + k % 3) * 86400000, done: true, doneBy: name, doneById: name.toLowerCase(), doneAt: L.NOW - (1 + k % 3) * 86400000 + 3600000, deleted: false }; });
  p = await L.open(b, '#/prep', { who: 'bo', wait: 1600, extra: week });
  await L.waitFor(p, () => !!document.querySelector('.nb-badges'), null, 6000).catch(() => {});
  // no Writing as row (3 Nov 2026): Bo is on the hat as an initial, and no rank sits anywhere above the list
  ok(!(await p.$('.nb-top')) && await L.txt(p, '.wtop-who .wtop-av') === 'B' && await L.whoIs(p) === 'Bo', 'phone: no Writing as row, Bo\'s initial on the hat');
  const strip = (await L.txt(p, '.nb-badges') || '').replace(/\s+/g, ' ');
  ok(/Sam 1st, 5 ticks/.test(strip) && /Kim 3rd, 3 ticks/.test(strip) && /You: 4th, 2 ticks/.test(strip), 'phone: Top tickers shows the top 3 and "You: 4th, 2 ticks" (' + strip + ')');
  ok(await p.evaluate(() => document.querySelector('.nb-badges').getAttribute('aria-label')) === 'Top tickers, last 7 days', 'phone: the strip is read out as "Top tickers, last 7 days"');
  ok(p.errors.length === 0, 'ticks: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // Sam is in the top 3, so no second "You" item
  p = await L.open(b, '#/prep', { who: 'sam', wait: 1600, extra: week });
  await L.waitFor(p, () => !!document.querySelector('.nb-badges'), null, 6000).catch(() => {});
  ok(!/You:/.test(await L.txt(p, '.nb-badges') || ''), 'phone: someone in the top 3 has no extra "You" item');
  await p.context().close();
  await b.close();
  L.report(R);
})();
