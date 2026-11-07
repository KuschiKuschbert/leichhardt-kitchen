// Today's team (7 Nov 2026, docs/todays-team-options/brief.md): the head chef and the sous chefs put today's team on the
// kitchen's shifts, with a section on each shift and their breaks. The round chip left of the bell (filled until the day
// is saved), the chef hat tile and Set today's team under the done count lead to #/team. Use it fills last week's team
// to check, Spread them sets a shift's breaks, Save writes team/<day> with the next version and never over a newer save.
// The Shifts row in the admin panel. Staff get no chip and no page yet (the staff side is its own step).
const L = require('./lib');
const { R, ok } = L.results(), { txt, tap } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), lastWeek = L.ymd(new Date(L.NOW - 7 * 86400000));
const TEAM = fsKey(['team', today]), CFG = fsKey(['config', 'main']);
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }
];
const SECS = [{ id: 'grill', name: 'Grill', off: false }, { id: 'pans', name: 'Pans', off: false }, { id: 'larder', name: 'Larder', off: false }];
const SHIFTS = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900, off: false }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320, off: false }];
const cfg = x => ({ [CFG]: Object.assign({ people, sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], showBadges: true, kitSecs: SECS, kitShifts: SHIFTS }, x || {}) });
const store = p => p.evaluate(() => window.__fake.dump());
// a picker on the page: the shared controls dress each select up, so set the select and send its change like a tap would
const pick = (p, k, v) => p.evaluate(([k, v]) => { const s = document.querySelector('select[data-k="' + k + '"]'); if (!s) return false; s.value = String(v); s.dispatchEvent(new Event('change', { bubbles: true })); return true; }, [k, v]);
const chip = p => p.evaluate(() => { const c = document.querySelector('.wtop .tm-chip'); return c ? { due: c.classList.contains('is-due'), label: c.getAttribute('aria-label'), href: c.getAttribute('href') } : null; });
const titleCut = p => p.evaluate(() => { const b = document.querySelector('.wtop-brand b'), i = document.querySelector('.wtop-icons'); return !b || b.scrollWidth > b.clientWidth + 1 || b.getBoundingClientRect().right > i.getBoundingClientRect().left + 1; });
// tick a person onto the shift shown: the people not on it fold away once someone is on, so open the fold first
const onShift = async (p, id) => { await p.evaluate(() => { const b = [...document.querySelectorAll('.tm-fold')].find(e => /Show$/.test(e.textContent.trim())); if (b) b.click(); }); await L.settle(p, 150); const done = await tap(p, '[data-p="tm-on"][data-id="' + id + '"]'); await L.settle(p, 200); return done; };
const linesSeen = p => p.evaluate(() => { const bar = document.querySelector('.nb-addline').getBoundingClientRect().top; return [...document.querySelectorAll('[id^="nbr-"]')].filter(e => { const q = e.getBoundingClientRect(); return q.top >= 0 && q.bottom <= bar; }).length; });

(async () => {
  const b = await L.start();
  let p, s;

  // a sous chef, nothing set for today yet: the chip is filled, the chef hat says Not set yet, the prep list says so too
  p = await L.open(b, '#/prep', { who: 'sam', extra: cfg(), wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('.wtop .tm-chip'), null, 8000);
  let c = await chip(p);
  ok(!!c && c.due && /not set yet/.test(c.label) && c.href === '#/team', 'chip: a sous chef sees the Today\'s team chip, filled while not set (' + JSON.stringify(c) + ')');
  ok(/Set today's team/.test(await txt(p, '.nb-tmset') || ''), 'prep list: Set today\'s team under the done count');
  ok(await linesSeen(p) === 2, 'prep list: a sous chef still sees 2 list lines above Add a line (as before)');
  ok(!(await titleCut(p)), 'top bar: "Kitchen Book" is whole at 390 px with the chip');
  await p.click('.wtop-who'); await L.settle(p, 300);
  ok(/Today's team\s*Not set yet/.test(await txt(p, '.wm .wm-team') || ''), 'chef hat: a Today\'s team tile says Not set yet');
  await p.keyboard.press('Escape'); await L.settle(p, 200);
  ok(p.errors.length === 0, 'prep list: no page errors ' + p.errors.join(' | '));

  // the page: tick people onto Lunch, a section, a break, Spread them, Dinner with another section, Save
  await p.click('.wtop .tm-chip'); await L.settle(p, 900);
  ok(/#\/team$/.test(p.url()) && /Today's team/.test(await txt(p, '#rtitle') || ''), 'page: the chip opens Today\'s team');
  ok(/Not set yet/.test(await txt(p, '.tm-page .hint') || '') && !!(await p.$('[data-p="tm-use"]')), 'page: not set yet, and Same as last Saturday? Use it is offered');
  ok(await p.$eval('[data-p="tm-sh"][data-v="lunch"]', e => e.getAttribute('aria-pressed')) === 'true', 'page: Lunch is the shift shown first');
  ok(await p.$eval('[data-p="tm-save"]', e => e.disabled), 'page: Save is off while nothing changed');
  await tap(p, '[data-p="tm-on"][data-id="ann"]'); await L.settle(p, 200);
  ok(await pick(p, 'tm-sec:ann', 'grill'), 'page: Ann on Lunch gets a section picker');
  ok(await onShift(p, 'sam'), 'page: Sam is ticked onto Lunch');
  ok(!(await p.$('select[data-k="tm-sec:sam"]')), 'page: a sous chef has no section picker (their section is their role)');
  await tap(p, '[data-p="tm-addbr"][data-id="ann"]'); await L.settle(p, 200);
  ok(await pick(p, 'tm-at:ann:0', 870) && await pick(p, 'tm-len:ann:0', 45), 'page: Ann gets a break at 14:30 for 45 minutes');
  await L.settle(p, 150);
  ok((await p.$eval('[data-p="tm-save"]', e => e.disabled)) === false, 'page: Save is on once something changed');
  ok(TEAM in (await store(p)) === false, 'page: nothing is saved before Save');
  await onShift(p, 'bo');
  await pick(p, 'tm-spfrom', 720); await L.settle(p, 100);
  await tap(p, '[data-p="tm-spread"]'); await L.settle(p, 200);
  ok(/3 breaks from 12:00/.test(await txt(p, '.tm-save') || ''), 'page: Spread them sets 3 breaks from 12:00, one at a time (' + (await txt(p, '.tm-save')) + ')');
  await tap(p, '[data-p="tm-sh"][data-v="dinner"]'); await L.settle(p, 200);
  await onShift(p, 'ann');
  ok(await p.$eval('select[data-k="tm-sec:ann"]', e => e.value) === 'grill', 'page: Ann on Dinner starts with her Lunch section');
  await pick(p, 'tm-sec:ann', 'pans'); await L.settle(p, 150);
  ok(/Also on Lunch: Grill/.test(await txt(p, '.tm-list') || ''), 'page: Ann\'s row says she is also on Lunch, on Grill');
  await tap(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => !!window.__fake.dump()[k], TEAM, 8000);
  s = await store(p);
  const t = s[TEAM], on = JSON.stringify(t.on), br = JSON.stringify(t.br);
  ok(t.v === 1 && t.day === today && t.by === 'sam' && typeof t.upd === 'number' && t.at === t.upd, 'save: version 1, today, by Sam');
  ok(on === JSON.stringify([{ id: 'ann', sh: 'dinner', sec: 'pans' }, { id: 'ann', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'lunch', sec: '' }, { id: 'sam', sh: 'lunch', sec: '' }]), 'save: who is on which shift and section (' + on + ')');
  ok(br === JSON.stringify([{ id: 'sam', sh: 'lunch', at: 720, len: 30 }, { id: 'ann', sh: 'lunch', at: 750, len: 30 }, { id: 'bo', sh: 'lunch', at: 780, len: 30 }]), 'save: the breaks Spread them set (' + br + ')');
  ok(typeof (s[CFG].pastEdit || {}).t === 'number', 'save: the team stamp tells the other phones');
  await L.settle(p, 1500);
  ok(/Today's team saved at \d\d:\d\d: 3 people on/.test(await txt(p, '.tm-save') || ''), 'save: the page says it is saved, with how many on (' + (await txt(p, '.tm-save')) + ')');
  c = await chip(p);
  ok(!!c && !c.due, 'chip: plain once today\'s team is saved');
  ok(p.errors.length === 0, 'page: no page errors ' + p.errors.join(' | '));

  // another chef saves meanwhile: this page's save is refused and says so, the changes stay, Refresh reads theirs
  await p.evaluate(([k, d]) => window.__fake.write(k, d), [TEAM, Object.assign({}, t, { v: 2, upd: t.upd + 60000, by: 'sam', on: t.on.slice(0, 2) })]);
  await tap(p, '[data-p="tm-sh"][data-v="lunch"]'); await L.settle(p, 200);
  await onShift(p, 'bo');
  await tap(p, '[data-p="tm-save"]'); await L.settle(p, 1500);
  ok(/Not saved: Sam saved today's team at \d\d:\d\d\. Your changes are still here/.test(await txt(p, '.tm-save') || ''), 'conflict: a save over a newer one is refused and says so (' + (await txt(p, '.tm-save')) + ')');
  ok((await store(p))[TEAM].v === 2, 'conflict: the newer save stays as it is');
  await tap(p, '[data-p="tm-refresh"]'); await L.settle(p, 200);
  ok(!!(await p.$('.tm-page')), 'conflict: Refresh asks a second tap first (the changes would go)');
  await tap(p, '[data-p="tm-refresh"]'); await L.settle(p, 900);
  ok(/Set by Sam/.test(await txt(p, '.tm-page .hint') || '') && (await p.$eval('[data-p="tm-save"]', e => e.disabled)), 'conflict: after Refresh the page shows theirs, nothing to save');
  await p.context().close();

  // Use it: last week's team filled in to check, people no longer on the list and shifts taken off left out
  const lw = { day: lastWeek, on: [{ id: 'bo', sh: 'dinner', sec: 'pans' }, { id: 'ann', sh: 'lunch', sec: 'grill' }, { id: 'gone', sh: 'lunch', sec: 'grill' }, { id: 'ann', sh: 'brunch', sec: 'grill' }], br: [{ id: 'bo', sh: 'dinner', at: 1140, len: 60 }], v: 3, at: 1, upd: 1, by: 'sam' };
  p = await L.open(b, '#/team', { who: 'sam', extra: Object.assign(cfg(), { [fsKey(['team', lastWeek])]: lw }), wait: 1800 });
  await tap(p, '[data-p="tm-use"]'); await L.settle(p, 900);
  ok(/Filled in from last \w+day: 2 people/.test(await txt(p, '.tm-save') || ''), 'use it: last week\'s team filled in for 2 people (' + (await txt(p, '.tm-save')) + ')');
  ok(!(fsKey(['team', today]) in (await store(p))), 'use it: nothing saved until Save');
  await tap(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => !!window.__fake.dump()[k], TEAM, 8000);
  s = (await store(p))[TEAM];
  ok(JSON.stringify(s.on) === JSON.stringify([{ id: 'ann', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'dinner', sec: 'pans' }]) && JSON.stringify(s.br) === JSON.stringify([{ id: 'bo', sh: 'dinner', at: 1140, len: 60 }]), 'use it: saved as checked (' + JSON.stringify(s.on) + ')');
  ok(p.errors.length === 0, 'use it: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // no signal: the record cannot be read, so the page and the chip never say "not set yet"
  p = await L.open(b, '#/team', { who: 'sam', extra: cfg(), failReads: '/team/', wait: 1800 });
  ok(/Could not load today's team/.test(await txt(p, '.tm-page') || ''), 'no signal: the page says it could not load, not "not set yet"');
  const tries = await p.evaluate(() => window.__fake.reads.filter(r => /\/team\//.test(r)).length);
  await L.settle(p, 1500); await tap(p, '[data-p="tm-on"]'); await L.settle(p, 500);
  ok(await p.evaluate(() => window.__fake.reads.filter(r => /\/team\//.test(r)).length) === tries && tries <= 2, 'no signal: it does not read again by itself before 5 minutes (' + tries + ' tries)');
  c = await chip(p);
  ok(!!c && !c.due && /could not check/.test(c.label), 'no signal: the chip is plain and says it could not check');
  await p.context().close();

  // staff: no chip, and the page by its address says who sets it
  p = await L.open(b, '#/prep', { who: 'ann', extra: cfg(), wait: 1800 });
  ok(!(await p.$('.wtop .tm-chip')) && !(await p.$('.nb-tmset')), 'staff: no chip and no Set today\'s team');
  await p.evaluate(() => { location.hash = '#/team'; }); await L.settle(p, 800);
  ok(/The head chef and the sous chefs set today's team/.test(await txt(p, '.tm-page') || ''), 'staff: #/team says the head chef and the sous chefs set it');
  ok(p.errors.length === 0, 'staff: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the smallest phones and the laptop: the title whole, the page tabs on one row, nothing sideways
  for (const w of [360, 375]) {
    p = await L.open(b, '#/prep', { who: 'sam', extra: cfg(), width: w, wait: 1600 });
    await L.waitFor(p, () => !!document.querySelector('.wtop .tm-chip'), null, 8000);
    ok(!(await titleCut(p)), 'top bar: "Kitchen Book" is whole at ' + w + ' px with the chip');
    await p.context().close();
  }
  for (const w of [390, 768, 1280]) {
    p = await L.open(b, '#/team', { who: 'sam', extra: cfg(), width: w, wait: 1600 });
    await tap(p, '[data-p="tm-on"][data-id="ann"]'); await L.settle(p, 200);
    ok(!(await L.overflow(p)), 'page at ' + w + ' px: no sideways scroll');
    if (w > 700) ok(await p.evaluate(() => { const n = document.querySelector('.pnav'); return !n || n.getBoundingClientRect().height < 60; }), 'top bar at ' + w + ' px: the page tabs stay on one row with the chip');
    ok(p.errors.length === 0, 'page at ' + w + ' px: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // the head chef sets up the shifts in Admin, Kitchen, Shifts: Add Lunch and Dinner, their times, Save changes
  p = await L.open(b, '#/admin', { admin: true, width: 1280, height: 900, adminPage: '', wait: 2500, extra: { [CFG]: { people, sousIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], showBadges: true, kitSecs: SECS } } });
  await L.kitchenRow(p, 'shifts');
  ok(/No shifts yet/.test(await txt(p, '.a-sh') || ''), 'admin: the Shifts row says there are none yet');
  await tap(p, '[data-p="sh-usual"]'); await L.settle(p, 300);
  const setTime = (i, k, v) => p.evaluate(([i, k, v]) => { const e = document.querySelector('[data-a="sh' + k + '"][data-i="' + i + '"]'); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [i, k, v]);
  await setTime(0, 'from', '10:00'); await setTime(0, 'to', '15:00'); await L.settle(p, 300);
  await tap(p, '[data-p="a-save"]'); await L.settle(p, 1200);
  s = (await store(p))[CFG];
  ok(JSON.stringify(s.kitShifts) === JSON.stringify([{ id: 'lunch', name: 'Lunch', from: 600, to: 900, off: false }, { id: 'dinner', name: 'Dinner', from: null, to: null, off: false }]), 'admin: the shifts saved with Lunch\'s times (' + JSON.stringify(s.kitShifts) + ')');
  ok(JSON.stringify(s.kitSecs) === JSON.stringify(SECS), 'admin: the sections are kept as they were');
  ok(/Lunch 10:00 to 15:00, Dinner/.test(await txt(p, '[data-p="k-row"][data-r="shifts"]') || ''), 'admin: the row says what it is set to');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
