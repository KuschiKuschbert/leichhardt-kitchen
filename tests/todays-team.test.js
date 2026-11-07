// Today's team (7 Nov 2026, docs/todays-team-options/brief.md): the head chef and the sous chefs put today's team on the
// kitchen's shifts, with a section on each shift and their breaks. The round chip left of the bell (filled until the day
// is saved), the chef hat tile and Set today's team under the done count lead to #/team. Use it fills last week's team
// to check, Spread them sets a shift's breaks, Save writes team/<day> with the next version and never over a newer save.
// The Shifts row in the admin panel. The staff side: once their day is set, a round chip (filled 30 minutes before a
// break and after a change) opens Your day; their day under the done count and in the chef hat; their section follows
// the plan and the shift that counts now (the next one in a gap), so they are not asked; their own moves are logged.
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
  // 2 lines until the redesign's step 1 (8 Nov 2026) put a phone line's buttons beside its words; 3 since
  const seen = await linesSeen(p);
  ok(seen === 3, 'prep list: a sous chef still sees 3 list lines above Add a line, with Set today\'s team showing (' + seen + ')');
  const headWith = await p.evaluate(() => document.querySelector('.nb-left .nb-ph').getBoundingClientRect().height);
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
  ok(await p.$eval('select[data-k="tm-sec:sam"]', e => e.value === '' && e.options[0].textContent === 'Sous chef'), 'page: a sous chef has a section picker too, starting on their role');
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
  await p.evaluate(() => { location.hash = '#/prep'; }); await L.settle(p, 800);
  ok(!(await p.$('.nb-tmset')), 'prep list: Set today\'s team has gone once it is saved');
  ok(Math.abs(await p.evaluate(() => document.querySelector('.nb-left .nb-ph').getBoundingClientRect().height) - headWith) < 0.5, 'prep list: the header keeps its height with or without the link, so nothing below moves');
  await p.evaluate(() => { location.hash = '#/team'; }); await L.settle(p, 800);
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

  // staff, nothing set yet: no chip, no line, and the page by its address says who sets it
  p = await L.open(b, '#/prep', { who: 'ann', extra: cfg(), wait: 1800 });
  ok(!(await p.$('.wtop .tm-chip')) && !(await p.$('.nb-tmset')) && !(await p.$('.nb-tmday')), 'staff: no chip, no Set today\'s team and no day line while it is not set');
  await p.evaluate(() => { location.hash = '#/team'; }); await L.settle(p, 800);
  ok(/The head chef and the sous chefs set today's team/.test(await txt(p, '.tm-page') || ''), 'staff: #/team says the head chef and the sous chefs set it');
  ok(p.errors.length === 0, 'staff: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // staff, today's team set: Ann on Lunch (10:00 to 15:00) on Grill with a break at 14:30, and on Dinner on Pans with a
  // break at 19:00; Bo on a break now, back at 14:30. It is 14:00.
  const plan = x => Object.assign({ day: today, on: [{ id: 'ann', sh: 'dinner', sec: 'pans' }, { id: 'ann', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'lunch', sec: 'larder' }, { id: 'sam', sh: 'lunch', sec: '' }],
    br: [{ id: 'bo', sh: 'lunch', at: 825, len: 45 }, { id: 'ann', sh: 'lunch', at: 870, len: 30 }, { id: 'ann', sh: 'dinner', at: 1140, len: 60 }], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' }, x || {});
  const SHIFT_ANN = fsKey(['shifts', today + '_ann']);
  p = await L.open(b, '#/prep', { who: 'ann', extra: Object.assign(cfg(), { [TEAM]: plan() }), wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('.wtop .tm-chip'), null, 8000);
  c = await chip(p);
  ok(!!c && c.due && /^Your day: Lunch: Grill · Break 14:30$/.test(c.label), 'staff chip: once her day is set, filled from 30 minutes before her break (' + JSON.stringify(c) + ')');
  ok(await txt(p, '.nb-tmday') === 'Lunch: Grill · Break 14:30', 'staff prep list: her day under the done count (' + (await txt(p, '.nb-tmday')) + ')');
  ok(await linesSeen(p) === 3, 'staff prep list: still 3 list lines above Add a line (as before)');
  const hh = await p.evaluate(() => { const h = () => document.querySelector('.nb-left .nb-ph').getBoundingClientRect().height, a = h(), l = document.querySelector('.nb-tmday'); l.style.display = 'none'; const z = h(); l.style.display = ''; return [a, z]; });
  ok(Math.abs(hh[0] - hh[1]) < 0.5, 'staff prep list: the header keeps its height with the day line (' + JSON.stringify(hh) + ')');
  ok(!(await p.$('.ks-wrap')) && !(await p.$('.ux-section-picker')), 'staff section: not asked, the chef set it');
  await L.waitFor(p, k => !!window.__fake.dump()[k], SHIFT_ANN, 6000);
  s = (await store(p))[SHIFT_ANN];
  ok(!!s && s.sec === 'grill' && s.auto === true && s.sh === 'lunch' && s.by === 'ann', 'staff section: kept as the plan set it, for Lunch (' + JSON.stringify(s) + ')');
  ok(await p.$eval('[data-k="p-section"]', e => e.value) === 'Grill', 'staff section: a new prep line starts on Grill');
  ok(await p.evaluate(() => window.__fake.reads.filter(r => /\/team\//.test(r)).length) === 1, 'staff reads: today\'s team is read once');

  // Your day: Now, Break, Later, who is on a break now; Escape closes it and the focus goes back to the chip
  await p.click('.wtop .tm-chip'); await L.settle(p, 400);
  const day = await txt(p, '.tm-dw .nt') || '';
  ok(/Your day/.test(day) && /Now\s*Grill\s*Lunch, 10:00 to 15:00/.test(day) && /Break\s*14:30\s*30 minutes/.test(day) && /Later\s*Pans\s*Dinner, 16:00 to 22:00/.test(day), 'Your day: now, her break and later (' + day + ')');
  ok(/On break now: Bo, back 14:30\./.test(day) && /Set by Sam at \d\d:\d\d/.test(day), 'Your day: who is on a break now and when they are back, and who set it');
  ok(await p.evaluate(() => !!document.activeElement && document.activeElement.classList.contains('nt-got')), 'Your day: the focus starts on Close');
  ok(!(await L.overflow(p)), 'Your day: fits the phone');
  await p.keyboard.press('Escape'); await L.settle(p, 400);
  ok(!(await p.$('.tm-dw')) && await p.evaluate(() => !!document.activeElement && !!document.activeElement.closest('.wtop')), 'Your day: Escape closes it, the focus is back in the top bar');

  // the chef hat: her day under her name
  await p.click('.wtop-who'); await L.settle(p, 300);
  const hat = await p.$$eval('.wm .wm-day', e => e.map(x => x.textContent));
  ok(JSON.stringify(hat) === JSON.stringify(['Lunch: Grill · Break 14:30, 30 min', 'Dinner from 16:00: Pans']), 'chef hat: her day under her name (' + JSON.stringify(hat) + ')');
  // she moves herself to Larder: kept with the shift and logged, and her day says Larder
  await p.click('.wm [data-who="sec"]'); await L.settle(p, 300);
  await p.click('.ks-b[data-v="larder"]'); await L.settle(p, 600);
  s = (await store(p))[SHIFT_ANN];
  ok(!!s && s.sec === 'larder' && s.auto === false && s.sh === 'lunch' && Array.isArray(s.log) && s.log.length === 1 && s.log[0].sh === 'lunch' && s.log[0].sec === 'larder', 'my section: her own move is kept with the shift and logged (' + JSON.stringify(s) + ')');
  ok(await txt(p, '.nb-tmday') === 'Lunch: Larder · Break 14:30', 'my section: her day says Larder (' + (await txt(p, '.nb-tmday')) + ')');
  ok(p.errors.length === 0, 'staff: no page errors ' + p.errors.join(' | '));

  // a chef moves her break and saves: her phone hears the stamp, reads once more, and shows it as changed until she
  // opens Your day. The chef's later save wins over her own move.
  const v2 = plan({ v: 2, upd: L.NOW + 60000, br: [{ id: 'bo', sh: 'lunch', at: 825, len: 45 }, { id: 'ann', sh: 'lunch', at: 885, len: 30 }, { id: 'ann', sh: 'dinner', at: 1140, len: 60 }] });
  await p.evaluate(([k, d, cf, t]) => { const f = window.__fake; f.write(k, d); const m = f.dump()[cf]; f.write(cf, Object.assign({}, m, { pastEdit: Object.assign({}, m.pastEdit || {}, { t }) })); }, [TEAM, v2, CFG, L.NOW + 60000]);
  await L.waitFor(p, () => !!document.querySelector('.nb-tmday.is-changed'), null, 6000);
  ok(await txt(p, '.nb-tmday') === 'Lunch: Grill · Break 14:45', 'changed: her day line shows the new break, and the plan again (' + (await txt(p, '.nb-tmday')) + ')');
  c = await chip(p);
  ok(!!c && c.due && /Changed$/.test(c.label), 'changed: the chip is filled and says changed (' + JSON.stringify(c) + ')');
  ok(await p.evaluate(() => window.__fake.reads.filter(r => /\/team\//.test(r)).length) === 2, 'changed: one more read for the save');
  await p.click('.nb-tmday'); await L.settle(p, 400);
  ok(/Changed \d\d:\d\d by Sam/.test(await txt(p, '.tm-dw .nt-date') || ''), 'changed: Your day says when and who (' + (await txt(p, '.tm-dw .nt-date')) + ')');
  await p.click('.tm-dw .nt-got'); await L.settle(p, 400);
  ok(!(await p.$('.tm-dw')) && !(await p.$('.nb-tmday.is-changed')), 'changed: seen once Your day was opened');
  ok(p.errors.length === 0, 'changed: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // between shifts the next one counts (15:30: Dinner from 16:00), and on Dinner its own section and break (16:30)
  p = await L.open(b, '#/prep', { who: 'ann', extra: Object.assign(cfg(), { [TEAM]: plan() }), clock: L.NOW + 90 * 60000, wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('.nb-tmday'), null, 8000);
  ok(await txt(p, '.nb-tmday') === 'Dinner from 16:00: Pans · Break 19:00', 'gap: at 15:30 the next shift counts (' + (await txt(p, '.nb-tmday')) + ')');
  c = await chip(p);
  ok(!!c && !c.due, 'gap: the chip is plain, no break near');
  await L.waitFor(p, k => !!window.__fake.dump()[k], SHIFT_ANN, 6000);
  ok((await store(p))[SHIFT_ANN].sec === 'pans', 'gap: her section for the day is Pans, from the next shift');
  await p.context().close();
  p = await L.open(b, '#/prep', { who: 'ann', extra: Object.assign(cfg(), { [TEAM]: plan() }), clock: L.NOW + 150 * 60000, wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('.nb-tmday'), null, 8000);
  ok(await txt(p, '.nb-tmday') === 'Dinner: Pans · Break 19:00', 'dinner: at 16:30 her Dinner section and break (' + (await txt(p, '.nb-tmday')) + ')');
  ok(p.errors.length === 0, 'dinner: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Chefs take a section too, and split shifts (head chef, 7 Nov 2026): a Day shift of 10:00 to 22:00 starts Spread
  // them on a 2.5 hour split 4.5 hours in; splits and meal breaks spread apart; + Break starts with the split
  const DAY = [{ id: 'day', name: 'Day', from: 600, to: 1320, off: false }];
  p = await L.open(b, '#/team', { who: 'sam', extra: cfg({ kitShifts: DAY }), wait: 1800 });
  await tap(p, '[data-p="tm-on"][data-id="ann"]'); await L.settle(p, 200);
  await onShift(p, 'bo'); await onShift(p, 'sam');
  ok(await pick(p, 'tm-sec:sam', 'pans'), 'chef section: Sam puts himself on Pans');
  ok(await p.$eval('select[data-k="tm-spfrom"]', e => e.value) === '870' && await p.$eval('select[data-k="tm-splen"]', e => e.value) === '150' && await p.$eval('select[data-k="tm-spmode"]', e => e.value) === '0', 'split: on a 10:00 to 22:00 shift Spread them starts on a 2.5 hour split at 14:30, all together');
  await tap(p, '[data-p="tm-addbr"][data-id="sam"]'); await L.settle(p, 200);
  ok(await p.$eval('select[data-k="tm-len:sam:0"]', e => e.value) === '150' && await p.$eval('select[data-k="tm-at:sam:0"]', e => e.value) === '870', '+ Break: on a long shift the first one is the split');
  await tap(p, '[data-p="tm-spread"]'); await L.settle(p, 200);
  ok(/3 splits from 14:30, all together/.test(await txt(p, '.tm-save') || ''), 'split: Spread them, all together (' + (await txt(p, '.tm-save')) + ')');
  await pick(p, 'tm-spfrom', 1080); await pick(p, 'tm-splen', 30); await pick(p, 'tm-spmode', '2'); await L.settle(p, 100);
  await tap(p, '[data-p="tm-spread"]'); await L.settle(p, 200);
  ok(/3 breaks from 18:00, two at a time/.test(await txt(p, '.tm-save') || ''), 'split: then the meal breaks, two at a time, keeping the splits (' + (await txt(p, '.tm-save')) + ')');
  ok(await p.$$eval('[data-p="tm-addbr"]', e => e.length) === 3, 'split: a third break can still be added');
  await tap(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => !!window.__fake.dump()[k], TEAM, 8000);
  s = (await store(p))[TEAM];
  ok(JSON.stringify(s.on.filter(o => o.id === 'sam')) === JSON.stringify([{ id: 'sam', sh: 'day', sec: 'pans' }]), 'chef section: saved (' + JSON.stringify(s.on) + ')');
  ok(JSON.stringify(s.br) === JSON.stringify([{ id: 'ann', sh: 'day', at: 870, len: 150 }, { id: 'bo', sh: 'day', at: 870, len: 150 }, { id: 'sam', sh: 'day', at: 870, len: 150 }, { id: 'ann', sh: 'day', at: 1080, len: 30 }, { id: 'sam', sh: 'day', at: 1080, len: 30 }, { id: 'bo', sh: 'day', at: 1110, len: 30 }]), 'split: the splits and the meal breaks saved, chefs first, two at a time (' + JSON.stringify(s.br) + ')');
  ok(p.errors.length === 0, 'split: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // what Ann and Sam see: the split with the time they are back, every break left in Your day, Sam's section
  const dayPlan = { day: today, on: [{ id: 'ann', sh: 'day', sec: 'grill' }, { id: 'sam', sh: 'day', sec: 'pans' }], br: [{ id: 'ann', sh: 'day', at: 870, len: 150 }, { id: 'ann', sh: 'day', at: 1080, len: 30 }], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' };
  p = await L.open(b, '#/prep', { who: 'ann', extra: Object.assign(cfg({ kitShifts: DAY }), { [TEAM]: dayPlan }), wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('.nb-tmday'), null, 8000);
  ok(await txt(p, '.nb-tmday') === 'Day: Grill · Split 14:30 to 17:00', 'split, staff: her day line (' + (await txt(p, '.nb-tmday')) + ')');
  c = await chip(p);
  ok(!!c && c.due, 'split, staff: the chip is filled 30 minutes before her split');
  await p.click('.wtop .tm-chip'); await L.settle(p, 400);
  const sday = await txt(p, '.tm-dw .nt') || '';
  ok(/Split\s*14:30 to 17:00\s*2\.5 hours/.test(sday) && /Break\s*18:00\s*30 minutes/.test(sday), 'split, Your day: the split and the meal break after it (' + sday + ')');
  await p.keyboard.press('Escape'); await L.settle(p, 300);
  ok(p.errors.length === 0, 'split, staff: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  p = await L.open(b, '#/prep', { who: 'ann', extra: Object.assign(cfg({ kitShifts: DAY }), { [TEAM]: dayPlan }), clock: L.NOW + 60 * 60000, wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('.nb-tmday'), null, 8000);
  ok(await txt(p, '.nb-tmday') === 'Day: Grill · On split, back 17:00', 'split, staff: during it, when she is back (' + (await txt(p, '.nb-tmday')) + ')');
  await p.context().close();
  p = await L.open(b, '#/prep', { who: 'sam', extra: Object.assign(cfg({ kitShifts: DAY }), { [TEAM]: dayPlan }), wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('.nb-tmday'), null, 8000);
  ok(await txt(p, '.nb-tmday') === 'Day: Pans', 'chef section: Sam\'s day line names his section, not his role (' + (await txt(p, '.nb-tmday')) + ')');
  await p.context().close();

  // Step 4, the nightly training numbers (teamsum/main): on the chef's page a cook's usual section for today's weekday
  // and shift fills in on a tick, and their row says it and what they are In training on; staff never read them
  const at12 = d => new Date(d + 'T12:00:00Z'), dowToday = at12(today).getUTCDay(), wdName = at12(today).toLocaleDateString('en-AU', { weekday: 'long', timeZone: 'UTC' });
  const yday = L.ymd(new Date(L.NOW - 86400000)), d3 = L.ymd(new Date(L.NOW - 3 * 86400000)), TSUM = fsKey(['teamsum', 'main']);
  const tsumRec = { v: 1, at: L.NOW - 36000000, day: today, from: L.ymd(new Date(L.NOW - 30 * 86400000)), to: yday,
    days: [{ day: d3, s: [{ p: 'ann', sec: 'Grill', sh: 'lunch' }, { p: 'bo', sec: 'Larder', sh: 'lunch' }] }, { day: yday, s: [{ p: 'ann', sec: 'Grill', sh: 'lunch' }, { p: 'ann', sec: 'Pans', sh: 'dinner' }] }],
    usual: { [dowToday + '|lunch']: { ann: ['grill', 6, 8], bo: ['gone', 3, 8] } }, learn: { ann: ['Pans'] } };
  const withSum = () => Object.assign(cfg(), { [TSUM]: tsumRec });
  p = await L.open(b, '#/team', { who: 'sam', extra: withSum(), wait: 1800 });
  ok(await onShift(p, 'ann'), 'usual: Ann is ticked onto Lunch');
  ok(await p.$eval('select[data-k="tm-sec:ann"]', e => e.value) === 'grill', 'usual: she starts on her usual section, Grill');
  const annRow = await p.evaluate(() => { const x = document.querySelector('[data-p="tm-on"][data-id="ann"]'); return x ? x.closest('.tm-row').querySelector('.tm-name').textContent : ''; });
  ok(annRow.includes('Usually Grill, 6 of the last 8 ' + wdName + 's') && annRow.includes('In training: Pans'), 'usual: her row says her usual section and what she is in training on (' + annRow + ')');
  await onShift(p, 'bo');
  ok(await p.$eval('select[data-k="tm-sec:bo"]', e => e.value) === '', 'usual: a section taken off the list is not filled in');
  ok(await p.evaluate(() => window.__fake.reads.filter(r => /\/teamsum\//.test(r)).length) === 1, 'usual: the numbers are read once');
  ok(p.errors.length === 0, 'usual: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  p = await L.open(b, '#/prep', { who: 'ann', extra: withSum(), wait: 1800 });
  await p.evaluate(() => { location.hash = '#/team'; }); await L.settle(p, 600);
  ok(await p.evaluate(() => window.__fake.reads.filter(r => /\/teamsum\//.test(r)).length + window.__fake.refused.filter(r => /\/teamsum\//.test(r.path)).length) === 0, 'staff: the training numbers are never read');
  await p.context().close();

  // the admin: Who worked where counts the shifts, Reports, Team has a shifts table, Training shows shifts beside ticks
  p = await L.open(b, '#/admin', { admin: true, who: '', width: 1280, height: 900, adminPage: '', wait: 2500, extra: Object.assign(withSum(), { [fsKey(['shifts', today + '_ann'])]: { day: today, sec: 'larder', name: 'Larder', auto: false, at: L.NOW - 3600000, by: 'ann' } }) });
  await L.kitchenRow(p, 'secs', 600);
  await L.waitFor(p, () => /Pans 1/.test((document.querySelector('[data-lvb="ks-days"]') || {}).textContent || ''), null, 6000).catch(() => {});
  const where = await txt(p, '[data-lvb="ks-days"]') || '';
  ok(/Ann/.test(where) && /Grill 2/.test(where) && /Pans 1/.test(where) && /Larder 1/.test(where) && /Bo/.test(where), 'admin: who worked where counts the shifts from the plans and today\'s pick (' + where.slice(0, 200) + ')');
  await L.adminTab(p, 'team');
  await L.waitFor(p, () => !!document.querySelector('.sk-shifts'), null, 8000).catch(() => {});
  const grid = await txt(p, '.sk-shifts') || '';
  ok(/Grill/.test(grid) && /Pans/.test(grid) && /Ann/.test(grid) && /Bo/.test(grid), 'admin: the Team report has shifts on each section (' + grid.slice(0, 160) + ')');
  await L.adminTab(p, 'training');
  await L.waitFor(p, () => /shifts? on it in the last 30 days/.test((document.querySelector('.ai-workspace') || {}).textContent || ''), null, 8000).catch(() => {});
  const train = await txt(p, '.ai-workspace') || '';
  ok(/Ann: Grill[^]*2 shifts on it in the last 30 days/.test(train), 'admin: Training shows the shifts on a section beside the ticks (' + (train.match(/Ann: Grill.{0,160}/) || [''])[0] + ')');
  ok(!(await L.overflow(p)), 'admin: no sideways scroll');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
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
    ok(p.errors.length === 0, 'page at ' + w + ' px: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // The chip must not wrap the page tabs on a tablet or laptop. Measured in the book's own font, Barlow, which the phones
  // and laptops show (the saved copy keeps it): the tests stand Google Fonts in with nothing, and the stand-in fonts differ
  // from machine to machine (wider on GitHub's runner, 7 Nov 2026). The same top bar is measured with the chip and
  // without it. If Barlow cannot load here, the check says so and measures nothing.
  for (const w of [720, 768, 1200, 1280]) {
    p = await L.open(b, '#/prep', { who: 'sam', extra: cfg(), width: w, wait: 1500 });
    await p.context().unroute(/fonts\.(googleapis|gstatic)\.com/);
    const css = await p.addStyleTag({ url: 'https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@700&display=swap' }).then(() => true, () => false);
    const got = css && await p.evaluate(() => Promise.race([Promise.all(['600 16px Barlow', '700 16px "Barlow Condensed"'].map(f => document.fonts.load(f))).then(r => r.every(x => x.length > 0)), new Promise(r => setTimeout(() => r(false), 8000))]));
    if (!got) { ok(true, 'top bar at ' + w + ' px: Barlow could not load here, the chip and the tabs were not measured'); await p.context().close(); continue; }
    await L.settle(p, 300);
    const rows = await p.evaluate(() => { const n = document.querySelector('.wtop .pnav'), c = document.querySelector('.wtop .tm-chip'); if (!n || !c) return null; const withChip = n.getBoundingClientRect().height; c.style.display = 'none'; const without = n.getBoundingClientRect().height; c.style.display = ''; return [withChip, without]; });
    ok(!!rows && Math.abs(rows[0] - rows[1]) < 1, 'top bar at ' + w + ' px, in Barlow: the chip does not wrap the page tabs (' + JSON.stringify(rows) + ')');
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
