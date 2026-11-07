// Supplier cut-off patterns (5 Nov 2026, docs/cutoff-options/brief.md): each delivery day has its own order-by day and
// time ("Wednesday's order by Friday 16:00"), reminders name the delivery date, and an order that closes 2 or more days
// before its delivery shows the day before under Tomorrow, heads-up on the order list, with Ordered already.
// Suppliers and people are synthetic. Firebase is the usual test stand-in. The pages open on Thursday 5 Nov 2026.
const L = require('./lib');
const CUT = require('../js/cutoffs');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const CFG = fsKey(['config', 'main']);
const dump = p => p.evaluate(() => window.__fake.dump());
const THU = Date.parse('2026-11-05T12:30:00+10:00'), FRI = THU + 86400000;
const P = 'Zz<i id="pwn"></i><img src=x onerror="window.__pwn=1">" data-pwn="1 \'Zz';
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }
];
const withCuts = cuts => ({ [CFG]: { people, sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], showBadges: true, cutoffs: cuts, pinOpen: { sam: 0, ann: 0, bo: 0 } } });
// Coast: Monday the day before 14:00, and Wednesday's order by Friday 16:00. PFD: the day before 14:00, Monday to Saturday.
const COAST = { id: 'coast', name: 'Coast ' + P, days: [{ d: 1, pre: 1, at: 840 }, { d: 3, pre: 5, at: 960 }], dd: [1, 3], at: 960, pre: 5, lead: 240 };
const PFD = { id: 'pfd', name: 'PFD', dd: [1, 2, 3, 4, 5, 6], at: 840, pre: 1, lead: 240 };
const bad = p => p.evaluate(() => ({ i: document.querySelectorAll('#pwn').length, img: document.querySelectorAll('img[src="x"]').length, attr: document.querySelectorAll('[data-pwn]').length, run: !!window.__pwn }));

(async () => {
  // ---------- the shared maths, in node (the phones and the push job run the same file) ----------
  ok(CUT.v === 2 && CUT.MAX_PRE === 14, 'js/cutoffs.js is version 2 and keeps the 14-day range');
  const legacy = CUT.clean([{ id: 'old', name: 'Old', dd: [1, 4], at: 840, pre: 1, lead: 360 }])[0];
  ok(JSON.stringify(legacy.days) === '[{"d":1,"pre":1,"at":840},{"d":4,"pre":1,"at":840}]' && legacy.dd.join() === '1,4' && legacy.at === 840 && legacy.pre === 1 && legacy.lead === 360, 'a record saved before 5 Nov 2026 gets a line per delivery day from its one rule');
  const coast = CUT.clean([COAST])[0];
  ok(coast.dd.join() === '1,3' && coast.at === 960 && coast.pre === 5, 'the older fields keep the line that closes earliest (Wednesday, 5 days before at 16:00)');
  // an older copy of the book reads dd, pre and at only: it must remind early, never late, for every delivery
  const late = [];
  for (let a = 0; a <= 14; a++) for (let b = 0; b <= 14; b += 3) for (const t of [[360, 960], [960, 360], [840, 840]]) {
    const c = CUT.clean([{ name: 'X', days: [{ d: 1, pre: a, at: t[0] }, { d: 4, pre: b, at: t[1] }] }])[0];
    c.days.forEach(l => { if (c.pre * 1440 - c.at < l.pre * 1440 - l.at) late.push({ a, b, t, l }); });
  }
  ok(!late.length, 'older fields never remind later than any line (' + JSON.stringify(late.slice(0, 2)) + ')');
  const damaged = CUT.clean([{ name: 'D', days: [{ d: 9, pre: 1, at: 840 }, { d: 2, pre: 'x', at: 840 }, null], dd: [5], at: 600, pre: 2 }])[0];
  ok(JSON.stringify(damaged.days) === '[{"d":5,"pre":2,"at":600}]', 'lines that are all damaged fall back to the older fields (' + JSON.stringify(damaged.days) + ')');
  const dup = CUT.clean([{ name: 'D', days: [{ d: 2, pre: 1, at: 840 }, { d: 2, pre: 3, at: 900 }] }])[0];
  ok(dup.days.length === 1 && dup.days[0].pre === 1, 'a delivery day listed twice keeps its first line');
  let fri = CUT.on([coast], 5);
  ok(fri.length === 1 && fri[0].at === 960 && fri[0].t === 960 && fri[0].del === 3 && fri[0].pre === 5 && CUT.forText(fri[0], '2026-11-06') === 'for Wed 11 Nov', "Friday: Coast closes 16:00 for Wednesday's delivery, named by date");
  ok(CUT.on([coast], 0).length === 1 && CUT.forText(CUT.on([coast], 0)[0], '2026-11-08') === 'for Mon 9 Nov' && !CUT.on([coast], 4).length, 'Sunday: the Monday line; Thursday: nothing');
  const pair = CUT.clean([{ id: 'pair', name: 'Pair', days: [{ d: 1, pre: 3, at: 960 }, { d: 3, pre: 5, at: 960 }] }]);
  fri = CUT.on(pair, 5);
  ok(fri.length === 1 && CUT.forText(fri[0], '2026-11-06') === 'for Mon 9 and Wed 11 Nov' && CUT.forText(fri[0], '2026-11-27') === 'for Mon 30 Nov and Wed 2 Dec', 'two deliveries that close together are one order, both dates, across a month');
  const clashy = { name: 'C', days: [{ d: 1, pre: 3, at: 840 }, { d: 3, pre: 5, at: 960 }] };
  ok(!!CUT.clash(clashy) && !CUT.clash(pair[0]) && !CUT.clash(coast), 'two times on one day are a clash; the same time is not');
  ok(CUT.on(CUT.clean([clashy]), 5)[0].at === 840, 'a clash saved anyway reminds at the earlier time');
  ok(CUT.headsAt(CUT.on([coast], 5)[0]) === -540 && CUT.headsAt(CUT.on([coast], 0)[0]) === null, 'heads-up: 15:00 the day before for 5 days ahead, none for the day before');
  const early = CUT.clean([{ name: 'E', days: [{ d: 3, pre: 2, at: 120 }], lead: 480 }])[0];
  ok(CUT.headsAt(CUT.on([early], 1)[0]) === -540 && CUT.startAt(early, 120) === -360, 'an early cut-off 2 days ahead (02:00, 8 hours): the heads-up at 15:00 still comes before its reminder from 18:00');
  const nx = CUT.next(coast.days[1], '2026-11-05', 4, 750);
  ok(nx && nx.cut === '2026-11-06' && nx.del === '2026-11-11' && CUT.next({ d: 4, pre: 0, at: 700 }, '2026-11-05', 4, 750).cut === '2026-11-12', 'next: Fri 6 Nov for Wed 11 Nov; a time already passed today goes to next week');
  ok(CUT.forText({ s: legacy, del: 4, pre: 1 }) === "for Thursday's delivery", 'without a date the older words stay');

  const b = await L.start();
  let p, s;

  // ---------- the head chef sets Coast: Monday the day before 14:00, then Wednesday's order by Friday 16:00 ----------
  p = await L.open(b, '#/admin', { admin: true, who: '', extra: withCuts([{ id: 'coast', name: 'Coast Seafood', dd: [1], at: 840, pre: 1, lead: 240 }]), clock: THU, wait: 2000 });
  await L.adminTab(p, 'cutoffs');
  await L.waitFor(p, () => !!document.querySelector('[data-k="cut-t0"]'), null, 10000);
  ok(await p.$eval('[data-k="cut-t0"]', e => e.value === '14:00' && e.type === 'text') && await txt(p, '.cut-say') === 'Next: Sun 8 Nov 14:00 for Mon 9 Nov. Reminder from 10:00.', 'one day: the rule once, a 24-hour time, and the next real dates');
  await L.choose(p, '[data-p="cut-day"][data-i="0"][data-v="3"]'); await L.settle(p, 250);
  ok(!(await p.$('.cut-ls')) && !!(await p.$('[data-p="cut-open"]')), 'Wednesday ticked: it takes the same rule, so the supplier stays one line, with Change one day');
  await p.click('[data-p="cut-open"]'); await L.settle(p, 250);
  ok(await p.evaluate(() => [...document.querySelectorAll('.cut-l .cut-ld')].map(e => e.textContent).join('|')) === 'Monday delivery|Wednesday delivery', 'Change one day: a line for each delivery day, Monday first');
  const opts = await p.$eval('[data-k="cut-o0-3"]', e => [...e.options].map(o => o.value + ':' + o.textContent));
  ok(opts[0] === '0:Wed, the same day' && opts[1] === '1:Tue, the day before' && opts[5] === '5:Fri, 5 days before' && opts[7] === '7:Wed, 1 week before' && opts[8] === '14:Wed, 2 weeks before', 'Order by offers the weekday with its days before (' + opts.join(' | ') + ')');
  await L.pick(p, '[data-k="cut-o0-3"]', '5'); await L.settle(p, 250);
  await p.fill('[data-k="cut-a0-3"]', '16:00'); await L.settle(p, 200);
  ok(await txt(p, '.cut-nx[data-d="3"]') === 'Next: Fri 6 Nov 16:00 for Wed 11 Nov. Heads-up Thu 15:00.' && await txt(p, '.cut-nx[data-d="1"]') === 'Next: Sun 8 Nov 14:00 for Mon 9 Nov.', 'each line says its next dates, and the heads-up for the long one');
  ok(await p.$eval('.cut-l.is-diff', e => /Wednesday delivery/.test(e.textContent) && /Different/.test(e.textContent)) && (await p.$$('.cut-l.is-diff')).length === 1, 'the Wednesday line is marked Different, Monday is not');
  await p.fill('[data-k="cut-a0-3"]', '16:'); await L.settle(p, 100);
  ok(/16:00 for Wed/.test(await txt(p, '.cut-nx[data-d="3"]')), 'a half-typed time leaves the line as it was');
  await p.fill('[data-k="cut-a0-3"]', '16:00'); await L.settle(p, 100);
  await p.click('[data-p="cut-save"]');
  await L.waitFor(p, k => (window.__fake.dump()[k]?.cutoffs?.[0]?.days || []).length === 2, CFG, 10000);
  s = (await dump(p))[CFG].cutoffs[0];
  ok(JSON.stringify(s.days) === '[{"d":1,"pre":1,"at":840},{"d":3,"pre":5,"at":960}]' && s.dd.join() === '1,3' && s.at === 960 && s.pre === 5 && s.lead === 240, 'Save keeps both lines, and the older fields at the earliest (' + JSON.stringify(s) + ')');
  await p.reload(); await L.adminTab(p, 'cutoffs');
  await L.waitFor(p, () => !!document.querySelector('.cut-l.is-diff'), null, 10000);
  ok(/Wednesday delivery/.test(await txt(p, '.cut-l.is-diff')) && await p.$eval('[data-k="cut-o0-3"]', e => e.value) === '5', 'reopened: the different day shows open, as saved');

  // a clash: Monday's order moved to Friday at 14:00, beside Wednesday's at 16:00. Save refuses and says why.
  await L.pick(p, '[data-k="cut-o0-1"]', '3'); await L.settle(p, 250);
  ok(/Mon and Wed deliveries both close on Fri, at 14:00 and 16:00/.test(await txt(p, '.cut-clash')), 'a clash shows on the supplier');
  const before = JSON.stringify((await dump(p))[CFG].cutoffs);
  await p.click('[data-p="cut-save"]'); await L.settle(p, 400);
  ok(/Not saved/.test(await txt(p, '.a-cut')) && JSON.stringify((await dump(p))[CFG].cutoffs) === before, 'Save refuses a clash and changes nothing');
  await p.fill('[data-k="cut-a0-1"]', '1600'); await L.settle(p, 150);
  ok(await p.$eval('.cut-clash', e => e.hidden) && await p.$eval('[data-k="cut-a0-1"]', e => e.value) === '1600', 'the same time: the clash goes');
  await p.$eval('[data-k="cut-a0-1"]', e => e.dispatchEvent(new Event('change', { bubbles: true }))); await L.settle(p, 100);
  ok(await p.$eval('[data-k="cut-a0-1"]', e => e.value) === '16:00', 'leaving the box writes the time as 16:00');
  ok(!(await L.overflow(p)), 'the lines fit a phone');
  for (const width of [768, 1280]) { await p.setViewportSize({ width, height: 900 }); await L.settle(p, 200); ok(!(await L.overflow(p)), 'the lines fit ' + width + ' px'); }
  await p.setViewportSize({ width: 390, height: 844 });

  // Set every day the same asks first when a day differs, then folds back to one rule
  await p.click('[data-p="cut-same"]'); await L.settle(p, 200);
  ok(await txt(p, '[data-p="cut-same"]') === 'Tap again: every day changes' && !!(await p.$('.cut-ls')), 'Set every day the same asks for a second tap');
  await p.click('[data-p="cut-same"]'); await L.settle(p, 250);
  ok(!(await p.$('.cut-ls')) && await p.$eval('[data-k="cut-t0"]', e => e.value) === '16:00', 'the second tap sets every day the same and shows the one rule');
  await p.click('[data-p="cut-undo"]'); await p.click('[data-p="cut-undo"]'); await L.settle(p, 250);
  ok(/Wednesday delivery/.test(await txt(p, '.cut-l.is-diff')), 'Undo unsaved changes brings the saved lines back');

  // the People tab's full save keeps the lines (the new js/cutoffs.js cleans them, it does not drop them)
  await L.adminTab(p, 'people');
  await p.fill('[data-a="name"][data-i="2"]', 'Bo P'); await p.keyboard.press('Tab');
  await p.click('[data-p="a-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k]?.people?.[2]?.name === 'Bo P', CFG, 10000);
  ok(JSON.stringify((await dump(p))[CFG].cutoffs[0].days) === '[{"d":1,"pre":1,"at":840},{"d":3,"pre":5,"at":960}]', 'People save keeps the lines for each delivery day');
  ok(!p.errors.length, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // ---------- Sam, a sous chef, on Thursday 12:30: PFD closes today; Coast's Wednesday order closes tomorrow ----------
  p = await L.open(b, '#/orders', { who: 'sam', extra: withCuts([COAST, PFD]), clock: THU, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.cut-hl [data-p="cut-tick"]'), null, 10000);
  ok(/PFD\s*by 14:00 in 1 h 30 min for Fri 6 Nov/.test(await txt(p, '#cut-band')) && !/Coast/.test(await txt(p, '#cut-band')), 'the bar: PFD for Fri 6 Nov, and nothing about tomorrow over the page');
  ok((await p.$$('.cut-tl li')).length === 1 && /Tomorrow, heads-up/i.test(await txt(p, '.cut-today')), 'the tick list keeps today; tomorrow has its own heads-up list');
  ok(/by tomorrow 16:00 for Wed 11 Nov/.test(await txt(p, '.cut-hl li')) && await txt(p, '.cut-hl [data-p="cut-tick"]') === 'Ordered already' && !(await p.$('.cut-hl .cut-box')), 'heads-up: when it closes, for which delivery, and Ordered already, not a tick box');
  const r0 = await bad(p);
  ok(!r0.i && !r0.img && !r0.attr && !r0.run, 'a supplier name with markup shows as words on the heads-up (' + JSON.stringify(r0) + ')');
  ok(!(await L.overflow(p)) && !p.errors.length, 'heads-up fits the phone, no page errors ' + p.errors.join(' | '));
  await p.click('.cut-hl [data-p="cut-tick"]');
  await L.waitFor(p, k => window.__fake.dump()[k]?.on === true, fsKey(['cutdone', '2026-11-06_coast']), 10000);
  await L.waitFor(p, () => !!document.querySelector('.cut-hl .cut-box[aria-pressed="true"]'), null, 10000);
  s = (await dump(p))[fsKey(['cutdone', '2026-11-06_coast'])];
  ok(s.day === '2026-11-06' && s.sid === 'coast' && s.by === 'sam' && /Ordered by Sam/.test(await txt(p, '.cut-hl li')), "Ordered already writes tomorrow's tick, by Sam, and the row shows it");
  ok(!(await p.$('.cut-hl .cut-early')), 'once ordered, the row is an ordinary ticked row that can be taken off again');
  await p.context().close();

  // Friday 12:30: the ordered one gets no bar; on a fresh book without the tick, Coast is on the bar with its date
  p = await L.open(b, '#/recipes', { who: 'sam', extra: Object.assign(withCuts([COAST, PFD]), { [fsKey(['cutdone', '2026-11-06_coast'])]: { day: '2026-11-06', sid: 'coast', on: true, at: THU, by: 'sam' } }), clock: FRI, wait: 1500 });
  await L.waitFor(p, () => { const e = document.getElementById('cut-band'); return e && !e.hidden; }, null, 10000);
  await L.settle(p, 500);
  ok(!/Coast/.test(await txt(p, '#cut-band')), 'Friday: ordered early, so no reminder for Coast');
  await p.context().close();
  p = await L.open(b, '#/recipes', { who: 'sam', extra: withCuts([COAST, PFD]), clock: FRI, wait: 1500 });
  await L.waitFor(p, () => /Coast/.test(document.getElementById('cut-band')?.textContent || ''), null, 10000);
  ok(/by 16:00 in 3 h 30 min for Wed 11 Nov/.test(await txt(p, '#cut-band')), 'Friday 12:30: Coast on the bar, 16:00 for Wed 11 Nov');
  await p.context().close();

  // Chef to-do: the heads-up to see, with no button (ticked on the order list only)
  p = await L.open(b, '#/todo', { who: 'sam', extra: withCuts([COAST, PFD]), clock: THU, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.todo-cut .cut-hl'), null, 10000);
  ok(/Tomorrow/.test(await txt(p, '.todo-cut .cut-hl .cut-st')) && !(await p.$('.todo-cut button')), 'Chef to-do: the heads-up shows Tomorrow, with nothing to tap');
  await p.context().close();

  // staff see no cut-offs and no heads-up
  p = await L.open(b, '#/orders', { who: 'ann', extra: withCuts([COAST, PFD]), clock: THU, wait: 1500 });
  await L.settle(p, 600);
  ok(!(await p.$('.cut-hl')) && !(await p.$('#cut-band:not([hidden])')), 'staff: no heads-up and no bar');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
