// The order day (head chef, 24 Nov 2026; docs/order-day-options/brief.md). The head chef ticks the days the supplier
// orders are done (config/main.orderDay { days, from, upd, by }) on the admin Order cut-offs page. On an order day, from
// the reminder time, one line in Your day on Home: "Order day: 1 of 4 ordered", 1 tap to Supplier order. The head chef
// sees it while on today's saved team; the sous chef on sees it too when the head chef is not on, once the head chef's
// shift has ended, or from 13:00 with nothing ticked since the reminder time; with no team saved, every chef. Staff never.
// Made-up people (Max head chef, Sam sous chef, Ann and Bo) and suppliers. Pages open at a set time on the order day.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const CFG = fsKey(['config', 'main']);
const store = page => page.evaluate(() => window.__fake.dump());
const today = L.ymd(new Date(L.NOW)), dow = new Date(L.NOW).getDay();
const at = (h, m) => L.NOW - 4 * 3600000 + ((h - 10) * 60 + (m || 0)) * 60000;   // a Queensland time today (L.NOW is 14:00)
const people = [
  { id: 'hd', name: 'Max', role: 'head', add: true, tick: true, del: true, active: true },
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }];
const CUTS = [
  { id: 'pfd', name: 'PFD Dry Goods', dd: [(dow + 1) % 7], at: 14 * 60, pre: 1 },
  { id: 'sg', name: 'Simon George', dd: [(dow + 1) % 7], at: 16 * 60, pre: 1 },
  { id: 'coast', name: 'Coast Seafood', dd: [(dow + 3) % 7], at: 15 * 60, pre: 1 },
  { id: 'meat', name: 'Fresh Meats', dd: [(dow + 4) % 7], at: 14 * 60, pre: 1 }];
const shifts = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 900, to: 1260 }];
const secs = [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }];
const MAX_ON = [{ id: 'hd', sh: 'lunch', from: 540, to: 900 }];
const SAM_ON = [{ id: 'sam', sh: 'lunch', from: 600, to: 900 }, { id: 'sam', sh: 'dinner', from: 900, to: 1290 }];
const STAFF_ON = [{ id: 'ann', sh: 'lunch', sec: 'grill', from: 600, to: 900 }, { id: 'bo', sh: 'dinner', sec: 'pans', from: 900, to: 1290 }];
const tick = (sid, by, t, day) => ({ [fsKey(['cutdone', (day || today) + '_' + sid])]: { day: day || today, sid, on: true, at: t, by } });
// o.days: order days (today by default); o.team: the saved team's on list, or null for no team saved; o.ticks: tick records
function fixture(o) {
  o = o || {};
  const x = { [CFG]: { people, headId: 'hd', sousIds: ['hd', 'sam'], pingIds: ['hd', 'sam'], staffIds: ['hd', 'sam', 'ann', 'bo'], showBadges: true, cutoffs: CUTS, kitShifts: shifts, kitSecs: secs,
    orderDay: o.orderDay === undefined ? { days: o.days || [dow], from: 600, upd: L.NOW - 3 * 86400000, by: 'hd' } : o.orderDay } };
  if (o.orderDay === null) delete x[CFG].orderDay;
  const team = o.team === undefined ? MAX_ON.concat(SAM_ON, STAFF_ON) : o.team;
  if (team) x[fsKey(['team', today])] = { day: today, v: 1, br: [], at: L.NOW - 86400000, upd: L.NOW - 86400000, by: 'hd', on: team };
  return Object.assign(x, ...(o.ticks || [tick('sg', 'sam', at(9, 40))]));
}
async function home(b, who, clock, o, more) {
  const p = await L.open(b, '#/', Object.assign({ extra: fixture(o), clock, wait: 1500 }, who === 'hd' ? { admin: true } : { who }, more || {}));
  await L.waitFor(p, () => !!document.querySelector('#hm-day') && !/Checking/.test(document.querySelector('#hm-day').textContent), null, 10000);
  await L.settle(p, 400);
  return p;
}
const line = p => p.evaluate(() => { const a = document.querySelector('#hm-day .hm-od'); return a ? { text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href'), first: !!a.closest('li') && a.closest('li') === document.querySelector('#hm-day .hm-rows li') } : null; });

(async () => {
  const b = await L.start();
  let p, l, s;

  // the head chef, on today, at 10:05: the line first in Your day, counting from the ticks, naming what is left
  p = await home(b, 'hd', at(10, 5));
  l = await line(p);
  ok(!!l && /Order day: 1 of 4 ordered/.test(l.text) && l.first, 'head chef on today, 10:05: "Order day: 1 of 4 ordered" first in Your day (' + JSON.stringify(l) + ')');
  ok(!!l && /Next: PFD Dry Goods by 14:00\. Then Coast Seafood by \w{3} 15:00, Fresh Meats by \w{3} 14:00\./.test(l.text), 'head chef: names the next order and the ones after, with their day (' + (l && l.text) + ')');
  ok(!!l && l.href === '#/suppliers', 'head chef: 1 tap opens Supplier order');
  ok(p.errors.length === 0, 'head chef: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // before the reminder time, and on a day that is not an order day: nothing
  p = await home(b, 'hd', at(9, 59));
  ok(!(await line(p)), 'head chef, 09:59: no line before the reminder time');
  await p.context().close();
  p = await home(b, 'hd', at(10, 5), { days: [(dow + 1) % 7, (dow + 3) % 7] });
  ok(!(await line(p)), 'head chef: no line on a day that is not an order day');
  await p.context().close();
  p = await home(b, 'hd', at(10, 5), { orderDay: { days: [], from: 600 } });
  ok(!(await line(p)), 'head chef: no order days set, no line');
  await p.context().close();

  // the sous chef while the head chef is on, before 13:00: nothing (the head chef first)
  p = await home(b, 'sam', at(10, 5));
  ok(!(await line(p)), 'sous chef, head chef on, 10:05: no line (the head chef first)');
  await p.context().close();

  // 13:05 and nothing ticked since 10:00: the sous chef on sees it too, and why (no push)
  p = await home(b, 'sam', at(13, 5));
  l = await line(p);
  ok(!!l && /Order day: 1 of 4 ordered/.test(l.text) && /Nothing ticked since 10:00\. Max is on until 15:00\./.test(l.text), 'sous chef, 13:05, nothing ticked since 10:00: the line, saying why (' + (l && l.text) + ')');
  await p.context().close();

  // a tick after 10:00 (only ticks that are on count): the sous chef does not get it at 13:05
  p = await home(b, 'sam', at(13, 5), { ticks: [tick('sg', 'sam', at(9, 40)), tick('pfd', 'hd', at(11, 30))] });
  ok(!(await line(p)), 'sous chef, 13:05, Max ticked PFD at 11:30: no line');
  await p.context().close();

  // the head chef's shift has ended: the sous chef sees it, with the last tick so the same order is not placed twice
  p = await home(b, 'sam', at(15, 5), { ticks: [tick('sg', 'sam', at(9, 40)), tick('pfd', 'hd', at(11, 30))] });
  l = await line(p);
  ok(!!l && /Order day: 2 of 4 ordered/.test(l.text) && /Max's shift ended at 15:00\./.test(l.text) && /Last ticked: PFD Dry Goods, Max, 11:30\./.test(l.text), 'sous chef, 15:05: Max\'s shift ended, the count and the last tick (' + (l && l.text) + ')');
  await p.context().close();

  // a head chef on lunch and dinner with no roster hours: the shifts' own end (21:00), so not ended at 15:05
  p = await home(b, 'sam', at(15, 5), { team: [{ id: 'hd', sh: 'lunch' }, { id: 'hd', sh: 'dinner' }].concat(SAM_ON, STAFF_ON), ticks: [tick('pfd', 'hd', at(11, 30))] });
  ok(!(await line(p)), 'sous chef, 15:05, Max on lunch and dinner with no hours, a tick at 11:30: no line');
  await p.context().close();

  // the head chef not on today: the sous chef on sees it from the reminder time; the head chef does not
  const NO_HEAD = SAM_ON.concat(STAFF_ON);
  p = await home(b, 'sam', at(10, 5), { team: NO_HEAD });
  l = await line(p);
  ok(!!l && /Max is not on today\./.test(l.text) && /1 of 4 ordered/.test(l.text), 'sous chef, Max not on today: the line from 10:05 (' + (l && l.text) + ')');
  await p.context().close();
  p = await home(b, 'hd', at(10, 5), { team: NO_HEAD });
  ok(!(await line(p)), 'head chef not on today, a sous chef on: no line for the head chef');
  await p.context().close();

  // no team saved today: every chef sees it, and why; staff never
  p = await home(b, 'sam', at(10, 5), { team: null });
  l = await line(p);
  ok(!!l && /Today's team is not saved, so every chef sees this\./.test(l.text), 'no team saved: the sous chef sees it, and why (' + (l && l.text) + ')');
  await p.context().close();
  p = await home(b, 'hd', at(10, 5), { team: null });
  ok(!!(await line(p)), 'no team saved: the head chef sees it');
  await p.context().close();
  for (const who of ['ann', 'bo']) {
    p = await home(b, who, at(13, 5), { team: null });
    ok(!(await line(p)) && !/Order day/.test(await txt(p, 'body')), who + ' (staff): never sees the order day');
    await p.context().close();
  }

  // every supplier's next order ticked: "4 of 4 ordered ✓" for 30 minutes after the last tick, then the line goes
  const ALL = [tick('sg', 'sam', at(9, 40)), tick('pfd', 'hd', at(10, 30)), tick('coast', 'hd', at(10, 40), L.ymd(new Date(L.NOW + 2 * 86400000))), tick('meat', 'sam', at(11, 0), L.ymd(new Date(L.NOW + 3 * 86400000)))];
  p = await home(b, 'hd', at(11, 10), { ticks: ALL });
  l = await line(p);
  ok(!!l && /Order day: 4 of 4 ordered ✓/.test(l.text) && /Last: Fresh Meats, Sam, 11:00\./.test(l.text), 'all ordered: 4 of 4 with a tick and the last one (' + (l && l.text) + ')');
  await p.context().close();
  p = await home(b, 'hd', at(11, 31), { ticks: ALL });
  ok(!(await line(p)), 'all ordered: the line goes 30 minutes after the last tick');
  await p.context().close();

  // Home left open across 13:00: the line comes to the sous chef without a reload (the 30 second tick)
  p = await home(b, 'sam', at(12, 58));
  ok(!(await line(p)), 'sous chef, Home open at 12:58: no line yet');
  await p.clock.fastForward('03:00');
  ok(await L.waitFor(p, () => !!document.querySelector('#hm-day .hm-od'), null, 10000), 'sous chef, Home still open at 13:01: the line comes in by itself');
  await p.context().close();

  // no signal for the ticks: the count says ticks from other phones are not in yet
  p = await home(b, 'hd', at(10, 5), {}, { cold: 'cutdone' });
  l = await line(p);
  ok(!!l && /No signal: ticks from other phones are not in yet\./.test(l.text) && !/of 4 ordered ✓/.test(l.text), 'no signal for the ticks: says they are not in yet, never all done (' + (l && l.text) + ')');
  await p.context().close();

  // the setting: the head chef ticks two days and a time on the admin Order cut-offs page, while a cut-off change waits
  p = await L.open(b, '#/admin', { admin: true, extra: fixture({ orderDay: null }), clock: at(10, 5), wait: 1500 });
  await L.adminTab(p, 'cutoffs');
  await L.waitFor(p, () => !!document.querySelector('.a-od'), null, 10000);
  ok(/No order days, so no reminder\./.test(await txt(p, '.a-od .od-next')), 'setting: no order days yet says so');
  ok(await p.$eval('.a-od [data-p="od-save"]', e => e.disabled), 'setting: Save order days is off with nothing changed');
  await p.fill('[data-k="cut-n0"]', 'PFD Dry Goods Co'); await L.settle(p, 200);   // an unsaved cut-off change on the same page
  const days = [(dow + 2) % 7, (dow + 4) % 7];
  for (const d of days) await p.click('.a-od [data-p="od-day"][data-v="' + d + '"]');
  await p.fill('[data-k="od-from"]', '930'); await p.press('[data-k="od-from"]', 'Tab'); await L.settle(p, 200);
  ok((await p.$eval('[data-k="od-from"]', e => e.value)) === '09:30', 'setting: a typed 930 reads as 09:30');
  ok(/^Next: \w{3} \d{1,2} \w{3} from 09:30\.$/.test(await txt(p, '.a-od .od-next')), 'setting: says the next order day and time (' + await txt(p, '.a-od .od-next') + ')');
  await p.click('.a-od [data-p="od-save"]');
  await L.waitFor(p, () => /Saved \d\d:\d\d/.test((document.querySelector('.a-od .od-msg') || {}).textContent || ''), null, 10000);
  s = await store(p);
  const od = s[CFG].orderDay || {};
  ok(JSON.stringify(od.days) === JSON.stringify(days.slice().sort((x, y) => x - y)) && od.from === 570 && typeof od.upd === 'number' && od.by === 'hd', 'setting: saved as orderDay { days, from 570, upd, by } (' + JSON.stringify(od) + ')');
  ok(JSON.stringify(s[CFG].cutoffs) === JSON.stringify(CUTS) || (s[CFG].cutoffs || [])[0].name === 'PFD Dry Goods', 'setting: Save order days sent no cut-off change');
  ok((await p.$eval('[data-k="cut-n0"]', e => e.value)) === 'PFD Dry Goods Co' && !(await p.$eval('[data-p="cut-save"]', e => e.disabled)), 'setting: the unsaved cut-off change is still there, its Save still on');
  ok(/Last saved by Max, /.test(await txt(p, '.a-od .od-by') || ''), 'setting: says who saved it last (' + await txt(p, '.a-od .od-by') + ')');
  // the People tab's full save keeps the order days
  await L.adminTab(p, 'people');
  await L.openPerson(p, 3);
  await p.fill('[data-a="name"][data-i="3"]', 'Bo B'); await L.settle(p, 200);
  await p.click('[data-p="a-save"]'); await L.settle(p, 800);
  s = await store(p);
  ok(JSON.stringify((s[CFG].orderDay || {}).days) === JSON.stringify(days.slice().sort((x, y) => x - y)) && s[CFG].people.some(x => x.name === 'Bo B'), 'People save: the order days are kept (' + JSON.stringify(s[CFG].orderDay) + ')');
  ok(p.errors.length === 0, 'setting: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
