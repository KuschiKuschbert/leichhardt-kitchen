// The consistency sweep, step 3 (head chef, 20 Nov 2026, choices 12 to 17 in docs/head-chef-decisions.md):
// 12 Orders steps its day with Prep's control (‹ Today date ›), Cleaning's week arrows are the same step chips;
// 13 "Cleaning" and "Recipes & drawings" everywhere, and no Cleaning row in the chef hat beside its tab;
// 14 a tap on an Orders line's words ticks it, the Used in links keep their own taps;
// 15 Transfers counts what the page shows (still out), never "0 transfers" above a loan still out;
// 16 the supplier rows on Chef to-do have a supplier mark, not an empty tick box;
// 17 the to-do and ping slips name the job on Added and Saved.
const L = require('./lib'), schedule = require('../js/cleaning-schedule');
const { R, ok } = L.results(), { txt, tap } = L;
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const DAY = 86400000;
const today = L.ymd(new Date(L.NOW)), yest = L.ymd(new Date(L.NOW - DAY)), tom = L.ymd(new Date(L.NOW + DAY)), old = L.ymd(new Date(L.NOW - 3 * DAY));
const store = p => p.evaluate(() => window.__fake.dump());
const attr = (p, sel, a) => p.evaluate(([sel, a]) => { const e = document.querySelector(sel); return e ? e.getAttribute(a) : null; }, [sel, a]);
const press = (p, sel) => p.click(sel, { timeout: 3000 }).catch(() => {});
const dow = new Date(L.NOW).getDay(), next = (dow + 1) % 7;
// the ‹ chip's look: width, height and type size, measured where it is drawn
const stepLook = (p, sel) => p.$eval(sel, e => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return [Math.round(r.width), Math.round(r.height), c.fontSize, c.borderTopWidth].join(' '); }).catch(() => 'none');

(async () => {
  const b = await L.start();

  // 12. Prep's day control, the pattern the others follow
  let p = await L.open(b, '#/prep', { who: 'sam', wait: 1600 });
  const prepStep = await stepLook(p, '.nb-nav [data-p="day"][data-d="-1"]');
  await p.context().close();

  // 12. Orders: ‹ Today date ›, then Delivery received on today
  const ord = { [key('orders', today, 'lines', 'o3')]: { text: 'Cream', qty: '4 L', recipes: ['carbonara-sauce'], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 2400000, ordered: false, deleted: false } };
  p = await L.open(b, '#/orders', { who: 'sam', extra: ord, wait: 1600 });
  const seq = await p.evaluate(() => [...document.querySelectorAll('.o-nav [data-p="oday"], .o-nav [data-p="otoday"], .o-nav #o-day')].map(e => e.id || e.getAttribute('data-p') + (e.getAttribute('data-d') || '')));
  ok(seq.join(',') === 'oday-1,otoday,o-day,oday1', 'Orders: the day control reads back chip, Today, the date box, forward chip, as on Prep (' + seq + ')');
  ok(await attr(p, '.o-nav [data-p="otoday"]', 'aria-pressed') === 'true' && !!(await p.$('.o-nav .o-deliv')), 'Orders on today: Today is pressed and Delivery received stays');
  const ordStep = await stepLook(p, '.o-nav [data-p="oday"][data-d="-1"]');
  ok(ordStep !== 'none' && ordStep === prepStep, 'Orders: the back chip looks like Prep\'s (' + ordStep + ' / ' + prepStep + ')');
  await tap(p, '.o-nav [data-p="oday"][data-d="-1"]'); await L.settle(p, 600);
  ok(await p.inputValue('#o-day', { timeout: 3000 }).catch(() => '') === yest && await attr(p, '.o-nav [data-p="otoday"]', 'aria-pressed') === 'false' && !(await p.$('.o-nav .o-deliv')), 'Orders: the back chip opens yesterday, Today is not pressed, no Delivery received');
  await tap(p, '.o-nav [data-p="otoday"]'); await L.settle(p, 600);
  ok(await p.inputValue('#o-day', { timeout: 3000 }).catch(() => '') === today && !!(await p.$('.o-nav .o-deliv')), 'Orders: Today comes back to today');
  await tap(p, '.o-nav [data-p="oday"][data-d="1"]'); await L.settle(p, 600);
  ok(await p.inputValue('#o-day', { timeout: 3000 }).catch(() => '') === tom, 'Orders: the forward chip opens tomorrow');
  await tap(p, '.o-nav [data-p="otoday"]'); await L.settle(p, 600);
  ok(!(await L.overflow(p)), 'Orders at 390: no sideways scroll');

  // 14. a tap on an Orders line's words ticks it, as on Prep; a tap on the words again unticks it, like the box
  await press(p, '.nb-row[data-ln$="/o1"] .nb-t'); await L.settle(p, 500);
  let s = await store(p);
  ok(s[key('orders', today, 'lines', 'o1')].ordered === true && await attr(p, '.nb-row[data-ln$="/o1"] .nb-box', 'aria-pressed') === 'true', 'Orders: a tap on Milk\'s words ticks it ordered');
  ok(/Ordered Milk/.test(await txt(p, '.p-toast-msg') || '') && /Undo/.test(await txt(p, '.p-toast-btn') || ''), 'Orders: the words\' tick says "Ordered Milk" with Undo, like the box');
  await press(p, '.nb-row[data-ln$="/o1"] .nb-t'); await L.settle(p, 500);
  s = await store(p);
  ok(s[key('orders', today, 'lines', 'o1')].ordered === false, 'Orders: a second tap on the words takes the tick off, like the box');
  await press(p, '.nb-row[data-ln$="/o3"] .o-used a'); await L.settle(p, 600);
  s = await store(p);
  ok(s[key('orders', today, 'lines', 'o3')].ordered === false && /#\/r\//.test(p.url()), 'Orders: a tap on a Used in link opens the recipe and ticks nothing (' + p.url() + ')');
  ok(p.errors.length === 0, 'Orders: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 14. staff cannot tick Orders: the words do not tick either (the same rights as the box)
  p = await L.open(b, '#/orders', { who: 'ann', wait: 1600 });
  await press(p, '.nb-row[data-ln$="/o1"] .nb-t'); await L.settle(p, 500);
  s = await store(p);
  ok(s[key('orders', today, 'lines', 'o1')].ordered === false && !(await p.$('.nb-row .nb-main[data-p]')), 'Orders, staff: the words tick nothing, as the box is off');
  await p.context().close();

  // 12. Cleaning's week arrows: the same step chips, its words kept
  const CLOCK = Date.parse('2026-11-09T12:00:00Z'), OPEN = 253402178400000;
  const source = schedule.drafts().concat(schedule.packDownDrafts());
  const clean = Object.fromEntries(source.map(t => [key('cleaningTasks', 'clean-template-' + t.plan.template), { ...t, sectionName: '', root: 'clean-template-' + t.plan.template, prev: '', next: '', from: CLOCK - 30 * DAY, until: OPEN, at: CLOCK - 31 * DAY, by: 'sam' }]));
  p = await L.open(b, '#/cleaning', { who: 'sam', clock: CLOCK, extra: clean, wait: 1200 });
  await L.waitFor(p, () => !!document.querySelector('.cln-page') && !document.querySelector('.cln-loading'), null, 8000).catch(() => {});
  ok(/^Cleaning ·/.test(await p.title()), 'Cleaning: the browser tab says Cleaning (' + await p.title() + ')');
  await tap(p, '[data-cln="week"]');
  await L.waitFor(p, () => !!document.querySelector('.cln-week-nav'), null, 8000).catch(() => {});
  const clnStep = await stepLook(p, '.cln-week-nav [data-cln="previous"]');
  ok(clnStep === prepStep && /Week commencing/.test(await txt(p, '.cln-week-nav') || ''), 'Cleaning week: the ‹ chip looks like Prep\'s and the words stay (' + clnStep + ' / ' + prepStep + ')');
  await p.context().close();

  // 13. the chef hat has no Cleaning row beside the Cleaning tab, and nothing says "Kitchen cleaning"
  p = await L.open(b, '#/recipes', { who: 'ann', extra: L.guides(), wait: 1600 });
  await p.click('.wtop-who'); await L.settle(p, 300);
  const hat = await p.evaluate(() => ({ row: !!document.querySelector('.wm a[href="#/cleaning"]'), tab: [...document.querySelectorAll('.tabbar a[href="#/cleaning"], .pnav a[href="#/cleaning"]')].map(a => a.textContent.trim()), words: /Kitchen cleaning/i.test(document.body.innerText) }));
  ok(!hat.row && hat.tab.length && hat.tab.every(t => /^Cleaning$/i.test(t)) && !hat.words, 'hat: no Cleaning row (the tab stays) and no "Kitchen cleaning" (' + JSON.stringify(hat) + ')');
  await p.keyboard.press('Escape'); await L.settle(p, 200);
  await p.evaluate(() => { location.hash = '#/cleaning'; }); await L.settle(p, 800);
  ok(await p.title() === 'Cleaning · Leichhardt Kitchen Book', 'Cleaning: the browser tab title (' + await p.title() + ')');
  await p.context().close();

  // 13. Recipes & drawings: the page heading and the browser tab say what the hat says
  p = await L.open(b, '#/manage', { who: '', admin: true, wait: 2500 });
  await L.waitFor(p, () => !!document.querySelector('.mg-head #rtitle'), null, 8000).catch(() => {});
  ok(await txt(p, '.mg-head #rtitle') === 'Recipes & drawings' && /^Recipes & drawings ·/.test(await p.title()), 'Recipes & drawings: the heading and the browser tab (' + await txt(p, '.mg-head #rtitle') + ' / ' + await p.title() + ')');
  const mgHat = await (async () => { await press(p, '.wtop-who'); await L.settle(p, 200); const t = await txt(p, '.wm a[href="#/manage"]'); await p.keyboard.press('Escape'); return t; })();
  ok(/Recipes & drawings/.test(mgHat || ''), 'Recipes & drawings: the hat row says the same (' + mgHat + ')');
  await p.context().close();

  // 15. Transfers: a loan from an earlier day and one line today
  const rec = { dir: 'out', venue: 'Other venue', person: 'Jo', text: 'Butter', amount: 2, unit: 'kg', note: '', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 3 * DAY, deleted: false, by: 'bo' };
  const loan = { [key('transfers', old, 'lines', 'loan')]: rec, [key('transferOpen', old + '_loan')]: { date: old, lineId: 'loan', record: rec, open: true } };
  const xin = { [key('transfers', today, 'lines', 't1')]: { dir: 'in', venue: 'Riviera', person: 'Jess', text: 'Milk', amount: 6, unit: 'L', note: '', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 1800000, deleted: false } };
  p = await L.open(b, '#/transfers', { who: 'ann', extra: Object.assign({}, loan, xin), wait: 1600 });
  await L.waitFor(p, () => document.querySelectorAll('.tr-card').length === 2, null, 6000).catch(() => {});
  let prog = await txt(p, '.tr-page .nb-prog') || '', date = await txt(p, '.tr-page .nb-date') || '';
  ok(/^2 still out$/.test(prog.trim()) && /1 borrowed today/.test(date), 'Transfers: the count says the 2 still out on the page, the date line today\'s 1 borrowed (' + prog + ' / ' + date + ')');
  await p.context().close();
  p = await L.open(b, '#/transfers', { who: 'ann', extra: loan, wait: 1600 });
  await L.waitFor(p, () => document.querySelectorAll('.tr-card').length === 1, null, 6000).catch(() => {});
  prog = await txt(p, '.tr-page .nb-prog') || ''; date = await txt(p, '.tr-page .nb-date') || '';
  ok(/^1 still out$/.test(prog.trim()) && !/\b0\b|transfer/.test(prog + date), 'Transfers: nothing logged today, a loan still out: "1 still out", never "0 transfers" (' + prog + ' / ' + date + ')');
  await p.context().close();

  // 16 and 17. Chef to-do: the supplier rows wear a mark, not a box; Added and Saved name the job
  const CFG = key('config', 'main');
  const CUTS = [{ id: 'pfd', name: 'PFD', dd: [next], at: 15 * 60, pre: 1 }, { id: 'veg', name: 'Veg', dd: [next], at: 17 * 60, pre: 1 }];
  const cfg = { [CFG]: { people: [{ id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true }, { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true }], sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann'], showBadges: true, cutoffs: CUTS },
    [key('cutdone', today + '_veg')]: { day: today, sid: 'veg', on: true, at: L.NOW - 600000, by: 'sam' },
    [key('todos', 't2')]: { text: 'Order new tongs', st: 'open', due: '', for: '', from: 'sam', at: L.NOW - 3600000, doneAt: 0, doneBy: '', upd: L.NOW - 3600000, by: 'sam' } };
  p = await L.open(b, '#/todo', { who: 'sam', extra: cfg, wait: 1600 });
  await L.waitFor(p, () => !!document.querySelector('.todo-cut .cut-n'), null, 8000).catch(() => {});
  const marks = await p.$$eval('.todo-cut .cut-o', l => l.map(li => { const m = li.querySelector('.cut-mark'); if (!m) return 'none'; const c = getComputedStyle(m); return [m.tagName, m.getAttribute('aria-hidden'), m.classList.contains('cut-box') ? 'box' : 'mark', c.borderTopWidth, !!m.querySelector('svg')].join(' '); }));
  ok(marks.length === 2 && marks.every(m => m === 'SPAN true mark 0px true'), 'Chef to-do: each supplier row has a supplier mark, not a box (' + marks.join(' | ') + ')');
  ok(!(await p.$('.todo-cut button, .todo-cut [data-p="cut-tick"]')) && /Tick them on the order list/.test(await txt(p, '.todo-cut') || '') && /Ordered by Sam/.test(await txt(p, '.todo-cut') || ''), 'Chef to-do: nothing to tap, "Tick them on the order list" and "Ordered by Sam" stay');
  await p.fill('[data-k="todo-text"]', 'Call the fridge tech about the cool room door');
  await tap(p, '[data-p="todo-save"]'); await L.settle(p, 600);
  let slip = await txt(p, '.p-toast-msg') || '';
  ok(/Added/.test(slip) && /Call the fridge tech/.test(slip), 'Chef to-do: the Added slip names the job (' + slip + ')');
  await tap(p, '[data-p="todo-edit"][data-id="t2"]'); await L.settle(p, 200);
  await p.fill('[data-k="todo-text"]', 'Order new tongs and a fish slice');
  await tap(p, '[data-p="todo-save"]'); await L.settle(p, 600);
  slip = await txt(p, '.p-toast-msg') || '';
  ok(/Saved/.test(slip) && /Order new tongs and a fish slice/.test(slip), 'Chef to-do: the Saved slip names the job (' + slip + ')');
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'Chef to-do: no sideways scroll, no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 17. a saved ping says its own words
  p = await L.open(b, '#/recipes', { who: 'sam', wait: 2000 });
  await p.click('.nt-got', { timeout: 1500 }).catch(() => {});
  await L.chef(p, 'pings'); await L.settle(p, 500);
  await tap(p, '[data-p="n-new"]'); await L.settle(p, 200);
  await p.fill('[data-k="n-text"]', 'Special: pork belly tonight');
  await tap(p, '[data-p="n-save"]'); await L.settle(p, 600);
  await p.clock.runFor(2000); await L.settle(p, 400);
  const said = await p.$$eval('.sv-line.saved', l => l.map(e => e.textContent).join(' | '));
  ok(/Special: pork belly tonight/.test(said) && /Shows:/.test(said), 'Shift pings: Saved names the ping\'s words (' + said + ')');
  ok(p.errors.length === 0, 'Shift pings: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
