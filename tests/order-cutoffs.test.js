// Order cut-offs (23 Oct 2026): the head chef sets each supplier's cut-off in the admin panel (Settings, Order cut-offs,
// config/main cutoffs). The head chef and sous chefs get a bar under the top bar from 4 hours before a cut-off (or the
// time picked under Remind us, 24 Oct 2026) until it passes, orange in the last hour, and today's cut-offs on the order
// list. An early cut-off is reminded from the night before. Staff see neither. The pages open at 14:00.
const L = require('./lib');
const { R, ok, } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const CFG = fsKey(['config', 'main']);
const store = page => page.evaluate(() => window.__fake.dump());
const dow = new Date(L.NOW).getDay(), next = (dow + 1) % 7;
const P = 'Zz<i id="pwn"></i><img src=x onerror="window.__pwn=1">" data-pwn="1 \'Zz';
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }
];
const CUTS = [
  { id: 'pfd', name: 'PFD', dd: [next], at: 15 * 60, pre: 1 },            // in 1 hour: on the bar, Order now
  { id: 'veg', name: 'Veg ' + P, dd: [next], at: 17 * 60 + 30, pre: 1 },  // in 3 h 30 min: on the bar (4 hours)
  { id: 'six', name: 'Six Hours', dd: [next], at: 19 * 60 + 30, pre: 1, lead: 360 },   // in 5 h 30 min, reminded 6 hours before
  { id: 'chk', name: 'Chicken', dd: [next], at: 13 * 60, pre: 1 },       // gone at 13:00: Closed on the order list only
  { id: 'late', name: 'Late Meats', dd: [next], at: 20 * 60, pre: 1 },   // 6 hours away, reminded 4 hours before: not yet
  { id: 'nope', name: 'Other Day', dd: [(next + 3) % 7], at: 15 * 60, pre: 1 },
  { id: 'tbc', name: 'To Come', dd: [], at: -1, pre: 1 }
];
const withCuts = (cuts) => ({ [CFG]: { people, sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], showBadges: true, cutoffs: cuts } });
const bad = p => p.evaluate(() => ({ i: document.querySelectorAll('#pwn').length, img: document.querySelectorAll('img[src="x"]').length, attr: document.querySelectorAll('[data-pwn]').length, run: !!window.__pwn }));
const names = p => p.evaluate(() => [...document.querySelectorAll('#cut-band .cut-n')].map(e => e.textContent));

(async () => {
  const b = await L.start();
  let p, s;

  // Sam, a sous chef, on the landing page: the bar shows the cut-offs whose reminder is on, soonest first
  p = await L.open(b, '#/', { who: 'sam', extra: withCuts(CUTS), wait: 1500 });
  await L.waitFor(p, () => { const e = document.getElementById('cut-band'); return e && !e.hidden; }, null, 10000);
  let n = await names(p);
  ok(n.length === 3 && n[0] === 'PFD' && n[1].indexOf('Veg Zz<i') === 0 && n[2] === 'Six Hours', 'sous chef: the bar lists 4 hours ahead, and 6 for the one set so, soonest first (' + n.join(' | ') + ')');
  ok(/Order now by 15:00 in 1 h/.test(await txt(p, '#cut-band .cut-row')), 'sous chef: the last hour says Order now, with the time and the time left');
  ok(await p.$eval('#cut-band .cut-row', e => e.classList.contains('is-soon')) && !(await p.$eval('#cut-band .cut-row:nth-child(2)', e => e.classList.contains('is-soon'))), 'sous chef: only the last hour is orange');
  const r0 = await bad(p);
  ok(!r0.i && !r0.img && !r0.attr && !r0.run, 'a supplier name with markup shows as words (' + JSON.stringify(r0) + ')');
  ok(!(await L.overflow(p)), 'the bar fits a phone');
  ok(p.errors.length === 0, 'landing: no page errors ' + p.errors.join(' | '));
  // Ordered takes PFD off the bar for today, on this phone
  await p.click('#cut-band [data-cut="done"][data-id^="pfd|"]'); await L.settle(p, 300);
  n = await names(p);
  ok(n.length === 2 && n[0].indexOf('Veg') === 0, 'Ordered: PFD leaves the bar');
  // the order list: every cut-off today, the one at 13:00 Closed, the ordered one marked
  await p.evaluate(() => { location.hash = '#/orders'; });
  await L.waitFor(p, () => !!document.querySelector('.cut-tl'), null, 10000);
  const tl = await p.evaluate(() => [...document.querySelectorAll('.cut-tl li')].map(e => e.textContent));
  ok(tl.length === 5 && /^Chicken13:00.*Closed$/.test(tl[0]) && /^PFD15:00.*Ordered$/.test(tl[1]) && /Late Meats20:00/.test(tl[4]), 'order list: today\'s cut-offs in time order (' + tl.join(' | ') + ')');
  ok(!tl.some(t => /Other Day|To Come/.test(t)), 'order list: another day\'s and a to-come cut-off are left off');
  ok(!!(await p.$('#cut-band:not([hidden])')), 'order list: the bar is there too');
  await p.context().close();

  // a fresh phone at 14:50: PFD is 10 minutes away and marked soon
  p = await L.open(b, '#/orders', { who: 'sam', extra: withCuts(CUTS), wait: 1500, clock: L.NOW + 50 * 60000 });
  await L.waitFor(p, () => { const e = document.getElementById('cut-band'); return e && !e.hidden; }, null, 10000);
  ok(await p.$eval('#cut-band .cut-row', e => e.classList.contains('is-soon') && /in 10 min/.test(e.textContent)), 'ten minutes out: the cut-off is marked soon');
  await p.context().close();

  // All day on the cut-off day: on the bar at 08:00, when a 4 hour reminder for the same time is not yet
  const DAY = [{ id: 'allday', name: 'All Day', dd: [next], at: 14 * 60, pre: 1, lead: 0 }, { id: 'four', name: 'Four', dd: [next], at: 14 * 60, pre: 1 }];
  p = await L.open(b, '#/', { who: 'sam', extra: withCuts(DAY), wait: 1500, clock: L.NOW - 6 * 3600000 });
  await L.waitFor(p, () => { const e = document.getElementById('cut-band'); return e && !e.hidden; }, null, 10000);
  n = await names(p);
  ok(n.join() === 'All Day', 'all day: on the bar at 08:00, the 4 hour one not yet (' + n.join(' | ') + ')');
  await p.context().close();

  // an early cut-off: 06:00 tomorrow, 8 hours before, so the reminder starts at 22:00 tonight
  const EARLY = [{ id: 'early', name: 'Early Bread', dd: [(next + 1) % 7], at: 6 * 60, pre: 1, lead: 480 }];
  p = await L.open(b, '#/', { who: 'sam', extra: withCuts(EARLY), wait: 1500 });
  await L.settle(p, 800);
  ok(!(await p.$('#cut-band:not([hidden])')), 'early cut-off: nothing at 14:00 the day before');
  await p.context().close();
  p = await L.open(b, '#/', { who: 'sam', extra: withCuts(EARLY), wait: 1500, clock: L.NOW + 8.5 * 3600000 });
  await L.waitFor(p, () => { const e = document.getElementById('cut-band'); return e && !e.hidden; }, null, 10000);
  ok(/by tomorrow 06:00 in 7 h 30 min/.test(await txt(p, '#cut-band .cut-row')), 'early cut-off: on the bar at 22:30 the night before, as tomorrow 06:00');
  await p.click('#cut-band [data-cut="done"]'); await L.settle(p, 300);
  await p.reload(); await L.settle(p, 1500);
  ok(!(await p.$('#cut-band:not([hidden])')), 'early cut-off: Ordered the night before holds after a reload');
  await p.context().close();

  // Ann, staff: no bar and no cut-offs on the order list
  p = await L.open(b, '#/orders', { who: 'ann', extra: withCuts(CUTS), wait: 2000 });
  await L.settle(p, 500);
  ok(!(await p.$('#cut-band:not([hidden])')) && !(await p.$('.cut-tl')), 'staff: no bar and no cut-offs');
  await p.context().close();

  // the head chef's Google account: Settings, Order cut-offs. An empty list offers the head chef's four suppliers.
  p = await L.open(b, '#/admin', { admin: true, who: '', extra: withCuts(undefined), wait: 2000 });
  await L.adminTab(p, 'cutoffs');
  await L.waitFor(p, () => !!document.querySelector('[data-p="cut-usual"]'), null, 10000);
  ok(await p.$eval('[data-p="cut-save"]', e => e.disabled), 'admin: Save waits for a change');
  await p.click('[data-p="cut-usual"]'); await L.settle(p, 300);
  const says = await p.evaluate(() => [...document.querySelectorAll('.cut-say')].map(e => e.textContent));
  ok(says[0] === 'Order by 14:00 Mon, Wed, Thu, Sun for the next day. Reminder from 10:00.' && says[1] === 'Order by 14:00 every day for the next day. Reminder from 10:00.' && says[2] === 'Order by 14:00 Wed, Sun for the next day. Reminder from 10:00.' && says[3] === 'Cut-off to come', 'admin: each supplier says when its order closes (' + says.join(' | ') + ')');
  ok(!(await L.overflow(p)), 'admin: the page fits a phone');
  // change PFD to 15:30, the same day, not Sunday
  await p.fill('[data-k="cut-t1"]', '15:30'); await L.settle(p, 200);
  await p.selectOption('[data-k="cut-p1"]', '0'); await L.settle(p, 200);
  await p.click('[data-p="cut-day"][data-i="1"][data-v="0"]'); await L.settle(p, 200);
  ok(/^Order by 15:30 Mon, Tue, Wed, Thu, Fri, Sat for the same day\. Reminder from 11:30\.$/.test(await txt(p, '.cut-ed:nth-child(2) .cut-say')), 'admin: the line follows the time, the days and Order closes');
  await p.selectOption('[data-k="cut-r1"]', '0'); await L.settle(p, 200);
  ok(/Reminder all day\.$/.test(await txt(p, '.cut-ed:nth-child(2) .cut-say')), 'admin: Remind us all day');
  await p.fill('[data-k="cut-t0"]', '06:00'); await p.selectOption('[data-k="cut-r0"]', '480'); await L.settle(p, 200);
  ok(/Reminder from 22:00 the night before\.$/.test(await txt(p, '.cut-ed:nth-child(1) .cut-say')), 'admin: an early cut-off is reminded the night before');
  await p.click('[data-p="cut-save"]'); await L.settle(p, 600);
  s = await store(p);
  const saved = s[CFG].cutoffs || [];
  ok(saved.length === 4 && saved[1].name === 'PFD' && saved[1].at === 930 && saved[1].pre === 0 && saved[1].dd.join() === '1,2,3,4,5,6' && saved[1].lead === 0 && saved[0].lead === 480 && saved[2].lead === 240 && saved[3].at === -1, 'admin: Save writes the cut-offs to config/main');
  ok((s[CFG].people || []).length === 3, 'admin: the staff list is left as it was');
  ok(/Saved/.test(await txt(p, '.a-cut .saved')), 'admin: Saved shows');
  // the People tab's full save keeps the cut-offs
  await L.adminTab(p, 'people');
  await p.fill('[data-a="name"][data-i="2"]', 'Bo B'); await L.settle(p, 200);
  await p.click('[data-p="a-save"]'); await L.settle(p, 800);
  s = await store(p);
  ok((s[CFG].cutoffs || []).length === 4 && s[CFG].people[2].name === 'Bo B', 'People save: the cut-offs are kept');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
