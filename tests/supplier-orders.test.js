// Supplier orders (24 Oct 2026): the head chef and sous chefs tick off each supplier's order once it is in, on the
// order list or on Chef to-do. The ticks are shared (cutdone/<cut-off day>, one live listener each on today and
// tomorrow), take the cut-off off the bar on every chef's phone and stop its pushes (scripts/cutoff-push.mjs). Staff
// never see or read them. The pages open at 14:00.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const CFG = fsKey(['config', 'main']);
const store = page => page.evaluate(() => window.__fake.dump());
const today = L.ymd(new Date(L.NOW)), dow = new Date(L.NOW).getDay(), next = (dow + 1) % 7;
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }
];
const CUTS = [
  { id: 'pfd', name: 'PFD', dd: [next], at: 15 * 60, pre: 1 },
  { id: 'veg', name: 'Veg', dd: [next], at: 17 * 60, pre: 1 },
  { id: 'chk', name: 'Chicken', dd: [next], at: 13 * 60, pre: 1 }
];
const CD = fsKey(['cutdone', today]);
const extra = x => Object.assign({ [CFG]: { people, sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], showBadges: true, cutoffs: CUTS } }, x || {});
const band = p => p.evaluate(() => [...document.querySelectorAll('#cut-band .cut-n')].map(e => e.textContent));
const rows = p => p.evaluate(() => [...document.querySelectorAll('.cut-tl li')].map(e => ({ n: e.querySelector('.cut-n').textContent, on: e.querySelector('.cut-box').getAttribute('aria-pressed') === 'true', st: e.querySelector('.cut-st').textContent })));

(async () => {
  const b = await L.start();
  let p, s, r;

  // Sam ticks PFD off on the order list
  p = await L.open(b, '#/orders', { who: 'sam', extra: extra(), wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.cut-tl .cut-box'), null, 10000);
  r = await rows(p);
  ok(r.map(x => x.n).join() === 'Chicken,PFD,Veg' && r[0].st === 'Closed, not ticked' && r[1].st === 'in 1 h' && !r.some(x => x.on), 'order list: Supplier orders today, soonest first, nothing ticked (' + JSON.stringify(r) + ')');
  ok(/Supplier orders today/.test(await txt(p, '.cut-today')), 'order list: the list is called Supplier orders today');
  ok((await band(p)).join() === 'PFD,Veg', 'bar: PFD and Veg before they are ticked');
  ok(await p.$eval('.cut-box', e => e.getBoundingClientRect().width >= 44 && e.getBoundingClientRect().height >= 44), 'the tick boxes are big enough to tap');
  await p.click('.cut-tl li:nth-child(2) .cut-box');
  await L.waitFor(p, () => { const e = document.querySelector('.cut-tl li:nth-child(2) .cut-box'); return e && e.getAttribute('aria-pressed') === 'true'; }, null, 10000);
  s = await store(p);
  ok(s[CD] && s[CD].ids.pfd && s[CD].ids.pfd.by === 'sam' && typeof s[CD].ids.pfd.at === 'number', 'tick: saved for every chef, as Sam (' + JSON.stringify(s[CD]) + ')');
  r = await rows(p);
  ok(/^Ordered by Sam, \d\d:\d\d$/.test(r[1].st), 'tick: the row says who ordered and when (' + r[1].st + ')');
  await L.waitFor(p, () => [...document.querySelectorAll('#cut-band .cut-n')].map(e => e.textContent).join() === 'Veg', null, 10000);
  ok(true, 'tick: PFD leaves the bar');
  // ticking the closed one still records it
  await p.click('.cut-tl li:nth-child(1) .cut-box');
  await L.waitFor(p, () => { const e = document.querySelector('.cut-tl li:nth-child(1) .cut-box'); return e && e.getAttribute('aria-pressed') === 'true'; }, null, 10000);
  ok(true, 'tick: a closed cut-off can still be ticked off');
  // a mis-tap: untick PFD
  await p.click('.cut-tl li:nth-child(2) .cut-box');
  await L.waitFor(p, () => { const e = document.querySelector('.cut-tl li:nth-child(2) .cut-box'); return e && e.getAttribute('aria-pressed') === 'false'; }, null, 10000);
  s = await store(p);
  ok(s[CD].ids.pfd === false && !!s[CD].ids.chk, 'untick: PFD is ticked off again, Chicken stays');
  await L.waitFor(p, () => [...document.querySelectorAll('#cut-band .cut-n')].map(e => e.textContent).join() === 'PFD,Veg', null, 10000);
  ok(true, 'untick: PFD is back on the bar');
  // another chef's phone ticks Veg: this phone follows straight away (the live listener)
  await p.evaluate(k => { const d = window.__fake.dump()[k]; window.__fake.write(k, { ids: Object.assign({}, d.ids, { veg: { by: 'sam', at: Date.now() } }), by: 'sam' }); }, CD);
  await L.waitFor(p, () => { const e = document.querySelector('.cut-tl li:nth-child(3) .cut-box'); return e && e.getAttribute('aria-pressed') === 'true'; }, null, 10000);
  await L.waitFor(p, () => [...document.querySelectorAll('#cut-band .cut-n')].map(e => e.textContent).join() === 'PFD', null, 10000);
  ok(true, 'another phone ticks Veg: the list and the bar follow at once');
  const reads = await p.evaluate(() => window.__fake.bill.filter(x => /\/cutdone\//.test(x.path)));
  ok(reads.filter(x => x.kind === 'listen').length === 2, 'reads: one listener each on today and tomorrow (' + JSON.stringify(reads.map(x => x.kind + ' ' + x.path.split('/').pop())) + ')');
  ok(!(await L.overflow(p)), 'order list: fits a phone');
  ok(p.errors.length === 0, 'order list: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a fresh phone with PFD already ticked by another chef: ticked here too, and not on the bar
  p = await L.open(b, '#/', { who: 'sam', extra: extra({ [CD]: { ids: { pfd: { by: 'sam', at: L.NOW - 3600000 } }, by: 'sam' } }), wait: 1500 });
  await L.waitFor(p, () => { const e = document.getElementById('cut-band'); return e && !e.hidden && e.textContent.indexOf('Veg') >= 0; }, null, 10000);
  ok((await band(p)).join() === 'Veg', 'another phone: PFD, ticked elsewhere, is not on the bar');
  await p.context().close();

  // Chef to-do: the same tick list at the top
  p = await L.open(b, '#/todo', { who: 'sam', extra: extra(), wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.todo-cut .cut-box'), null, 10000);
  ok(/Supplier orders today/.test(await txt(p, '.todo-cut')), 'Chef to-do: Supplier orders today at the top');
  await p.click('.todo-cut li:nth-child(3) .cut-box');
  await L.waitFor(p, () => { const e = document.querySelector('.todo-cut li:nth-child(3) .cut-box'); return e && e.getAttribute('aria-pressed') === 'true'; }, null, 10000);
  s = await store(p);
  ok(s[CD] && s[CD].ids.veg && s[CD].ids.veg.by === 'sam', 'Chef to-do: ticking Veg there saves it for everyone');
  ok(!(await L.overflow(p)), 'Chef to-do: fits a phone');
  ok(p.errors.length === 0, 'Chef to-do: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a laptop: the tick list on one line each
  p = await L.open(b, '#/orders', { who: 'sam', extra: extra(), wait: 1500, width: 1280, height: 900 });
  await L.waitFor(p, () => !!document.querySelector('.cut-tl .cut-box'), null, 10000);
  ok(!(await L.overflow(p)), 'order list at 1280 px: no sideways scroll');
  await p.context().close();

  // staff: nothing shown, nothing read
  p = await L.open(b, '#/orders', { who: 'ann', extra: extra(), wait: 2000 });
  await L.settle(p, 500);
  ok(!(await p.$('.cut-tl')) && !(await p.$('#cut-band:not([hidden])')), 'staff: no tick list and no bar');
  ok(await p.evaluate(() => !window.__fake.bill.some(x => /\/cutdone\//.test(x.path))), 'staff: the ticks are never read');
  await p.context().close();

  // the head chef's Google account, nobody signed in: Chef to-do, ticks as the head chef
  p = await L.open(b, '#/todo', { admin: true, who: '', extra: extra(), wait: 2000 });
  await L.waitFor(p, () => !!document.querySelector('.todo-cut .cut-box:not([disabled])'), null, 10000);
  await p.click('.todo-cut li:nth-child(2) .cut-box');
  await L.waitFor(p, () => { const e = document.querySelector('.todo-cut li:nth-child(2) .cut-box'); return e && e.getAttribute('aria-pressed') === 'true'; }, null, 10000);
  s = await store(p);
  ok(s[CD] && s[CD].ids.pfd && s[CD].ids.pfd.by === 'owner' && /Ordered by Head chef/.test(await txt(p, '.todo-cut li:nth-child(2) .cut-st')), 'Google account: ticks as the head chef');
  await p.context().close();

  await b.close();
  L.report(R);
})();
