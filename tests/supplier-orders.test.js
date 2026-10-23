// Supplier orders (24 Oct 2026): the head chef and sous chefs tick off each supplier's order once it is in, on the
// order list or on Chef to-do. The ticks are shared (cutdone/<day>_<supplier id>, one live listener on today's and
// tomorrow's), take the cut-off off the bar on every chef's phone and stop its pushes (scripts/cutoff-push.mjs). Staff
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
const CD = sid => fsKey(['cutdone', today + '_' + sid]);
const tickOf = (sid, by, at) => ({ [CD(sid)]: { day: today, sid, on: true, at, by } });
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
  ok(s[CD('pfd')] && s[CD('pfd')].on === true && s[CD('pfd')].by === 'sam' && s[CD('pfd')].sid === 'pfd' && s[CD('pfd')].day === today && typeof s[CD('pfd')].at === 'number', 'tick: saved for every chef, as Sam (' + JSON.stringify(s[CD('pfd')]) + ')');
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
  ok(s[CD('pfd')].on === false && s[CD('chk')].on === true, 'untick: PFD\'s tick is taken off, Chicken stays');
  await L.waitFor(p, () => [...document.querySelectorAll('#cut-band .cut-n')].map(e => e.textContent).join() === 'PFD,Veg', null, 10000);
  ok(true, 'untick: PFD is back on the bar');
  // a mis-tap: tick and untick Veg straight after each other; the untick wins, in the order tapped (review, 24 Oct 2026)
  await p.evaluate(() => { const b = document.querySelector('.cut-tl li:nth-child(3) .cut-box'); b.click(); document.querySelector('.cut-tl li:nth-child(3) .cut-box').click(); });
  await L.settle(p, 800);
  s = await store(p);
  ok(s[CD('veg')] && s[CD('veg')].on === false && await p.$eval('.cut-tl li:nth-child(3) .cut-box', e => e.getAttribute('aria-pressed') === 'false'), 'quick tick and untick: Veg ends up not ticked (' + JSON.stringify(s[CD('veg')]) + ')');
  // another chef's phone ticks Veg: this phone follows straight away (the live listener)
  await p.evaluate(([k, day]) => { window.__fake.write(k, { day, sid: 'veg', on: true, at: Date.now(), by: 'sam' }); }, [CD('veg'), today]);
  await L.waitFor(p, () => { const e = document.querySelector('.cut-tl li:nth-child(3) .cut-box'); return e && e.getAttribute('aria-pressed') === 'true'; }, null, 10000);
  await L.waitFor(p, () => [...document.querySelectorAll('#cut-band .cut-n')].map(e => e.textContent).join() === 'PFD', null, 10000);
  ok(true, 'another phone ticks Veg: the list and the bar follow at once');
  const tickReads = await p.evaluate(() => window.__fake.bill.filter(x => /\/cutdone$/.test(x.path)));
  ok(tickReads.filter(x => x.kind === 'listen').length === 1, 'reads: one listener on today\'s and tomorrow\'s ticks (' + JSON.stringify(tickReads.map(x => x.kind + ' ' + x.n)) + ')');
  ok(!(await L.overflow(p)), 'order list: fits a phone');
  ok(p.errors.length === 0, 'order list: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a fresh phone with PFD already ticked by another chef: ticked here too, and not on the bar
  p = await L.open(b, '#/', { who: 'sam', extra: extra(tickOf('pfd', 'sam', L.NOW - 3600000)), wait: 1500 });
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
  ok(s[CD('veg')] && s[CD('veg')].on === true && s[CD('veg')].by === 'sam', 'Chef to-do: ticking Veg there saves it for everyone');
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
  ok(await p.evaluate(() => !window.__fake.bill.some(x => /\/cutdone/.test(x.path))), 'staff: the ticks are never read');
  await p.context().close();

  // the head chef's Google account, nobody signed in: Chef to-do, ticks as the head chef
  p = await L.open(b, '#/todo', { admin: true, who: '', extra: extra(), wait: 2000 });
  await L.waitFor(p, () => !!document.querySelector('.todo-cut .cut-box:not([disabled])'), null, 10000);
  await p.click('.todo-cut li:nth-child(2) .cut-box');
  await L.waitFor(p, () => { const e = document.querySelector('.todo-cut li:nth-child(2) .cut-box'); return e && e.getAttribute('aria-pressed') === 'true'; }, null, 10000);
  s = await store(p);
  ok(s[CD('pfd')] && s[CD('pfd')].by === 'owner' && /Ordered by Head chef/.test(await txt(p, '.todo-cut li:nth-child(2) .cut-st')), 'Google account: ticks as the head chef');
  await p.context().close();

  // the Google account on the landing page, nobody signed in: the ticks are read as soon as the account is checked, so a
  // supplier a sous chef ticked is not on its bar (review, 24 Oct 2026). The kitchen settings are in step (every PIN
  // window set, fnIds), so nothing writes config/main and its listener does not fire again: the real path.
  const settled = { [CFG]: { people, sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], fnIds: [], showBadges: true, cutoffs: CUTS, pinOpen: { sam: L.NOW + 86400000 * 5, ann: L.NOW + 86400000 * 5, bo: L.NOW + 86400000 * 5 } } };
  p = await L.open(b, '#/', { admin: true, who: '', extra: Object.assign(settled, tickOf('pfd', 'sam', L.NOW - 3600000)), wait: 2000 });
  await L.waitFor(p, () => { const e = document.getElementById('cut-band'); return e && !e.hidden && e.textContent.indexOf('Veg') >= 0 && e.textContent.indexOf('PFD') < 0; }, null, 8000);
  ok((await band(p)).join() === 'Veg', 'Google account, landing page: PFD, ticked by a sous chef, is not on the bar');
  ok(await p.evaluate(() => !window.__fake.writes.some(ops => ops.some(o => /config\/main$/.test(o.path)))), 'Google account, landing page: nothing wrote the kitchen settings on the way (the real path)');
  await p.click('#cut-band [data-cut="done"]');
  await L.waitFor(p, () => { const e = document.getElementById('cut-band'); return e && e.hidden; }, null, 10000);
  ok(true, 'Google account, landing page: Ordered on the bar clears it at once');
  await p.context().close();

  // an all-day cut-off at 01:00 tomorrow is pushed from 22:00 tonight (4 hours before), so it shows on the list from
  // then and can be ticked off (review, 24 Oct 2026)
  const LATE = [{ id: 'night', name: 'Night Bakery', dd: [(next + 1) % 7], at: 60, pre: 1, lead: 0 }];
  const lateExtra = { [CFG]: { people, sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], showBadges: true, cutoffs: LATE } };
  p = await L.open(b, '#/orders', { who: 'sam', extra: lateExtra, wait: 1500, clock: L.NOW + 8.5 * 3600000 });
  await L.waitFor(p, () => !!document.querySelector('.cut-tl .cut-box'), null, 10000);
  r = await rows(p);
  ok(r.length === 1 && r[0].n === 'Night Bakery' && r[0].st === 'in 2 h 30 min' && /by tomorrow 01:00/.test(await txt(p, '.cut-tl li')), 'all day, 01:00 tomorrow: on the tick list at 22:30 the night before (' + JSON.stringify(r) + ')');
  await p.click('.cut-tl .cut-box');
  await L.waitFor(p, () => { const e = document.querySelector('.cut-tl .cut-box'); return e && e.getAttribute('aria-pressed') === 'true'; }, null, 10000);
  s = await store(p);
  const tmr = L.ymd(new Date(L.NOW + 86400000));
  ok(s[fsKey(['cutdone', tmr + '_night'])] && s[fsKey(['cutdone', tmr + '_night'])].day === tmr, 'all day, 01:00 tomorrow: ticked under tomorrow, the cut-off\'s own day');
  await p.context().close();

  // js/cutoffs.js does not load: the book still works, the admin page says so and saves nothing, and the head chef's
  // People save keeps the cut-offs as they are (review, 24 Oct 2026)
  p = await L.open(b, '#/admin', { admin: true, who: '', extra: extra(), wait: 2000, block: 'js/cutoffs\\.js' });
  await L.adminTab(p, 'cutoffs');
  await L.waitFor(p, () => /could not load/.test((document.querySelector('.a-cut') || {}).textContent || ''), null, 10000);
  ok(!(await p.$('[data-p="cut-save"]')), 'no js/cutoffs.js: the Order cut-offs page says it could not load, with no Save');
  await L.adminTab(p, 'people');
  await p.fill('[data-a="name"][data-i="2"]', 'Bo B'); await L.settle(p, 200);
  await p.click('[data-p="a-save"]'); await L.settle(p, 800);
  s = await store(p);
  ok(s[CFG].people[2].name === 'Bo B' && JSON.stringify(s[CFG].cutoffs) === JSON.stringify(CUTS), 'no js/cutoffs.js: the People save keeps the cut-offs exactly as they were');
  ok(p.errors.filter(e => !/cutoffs\.js|ERR_FAILED|net::/.test(e)).length === 0, 'no js/cutoffs.js: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  p = await L.open(b, '#/orders', { who: 'sam', extra: extra(), wait: 2000, block: 'js/cutoffs\\.js' });
  await L.settle(p, 800);
  ok(!(await p.$('.cut-today')) && !(await p.$('#cut-band:not([hidden])')) && await p.evaluate(() => !window.__fake.bill.some(x => /\/cutdone/.test(x.path))), 'no js/cutoffs.js: the order list shows no Supplier orders and reads no ticks');
  ok(await p.$('.nb-page') !== null, 'no js/cutoffs.js: the order list itself still works');
  await p.context().close();

  await b.close();
  L.report(R);
})();
