// Home's now and next board (redesign step 2, 8 Nov 2026, head chef; docs/whole-app-redesign-options/brief.md, Build
// step 2). On the kraft board: the named welcome (10 Nov 2026), the dark board with only what is still to come (your section and
// its lines left, your break, the order cut-offs a chef gets the bar for, today's functions and their next round, new
// pings), each a tap to where it is done; Prep by section with a bar each; Coming up with the functions of the next days.
// The function band and the cut-off bar leave Home and stay on the other pages. Signed out keeps the Recipes docket.
// Staff also see the saved roster below their own day on phones, tablets and laptops, with no team editing controls.
// All of it from what the phone already holds: no reads of its own. The pages open at 14:00.
const L = require('./lib');
const M = require('../js/functions.js');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), tom = M.addDays(today, 1);
const dow = new Date(L.NOW).getDay(), next = (dow + 1) % 7;
const CFG = fsKey(['config', 'main']), TEAM = fsKey(['team', today]);
const at = (ymd, hm) => M.kat(ymd, M.hmMin(hm));
const P = 'Zz<i id="pwn"></i><img src=x onerror="window.__pwn=1">" data-pwn="1 \'Zz';
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }
];
const SECS = [{ id: 'grill', name: 'Grill', off: false }, { id: 'sauce', name: 'Sauce', off: false }, { id: 'larder', name: 'Larder', off: false }];
const SHIFTS = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900, off: false }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320, off: false }];
// PFD closes at 15:00 for tomorrow's delivery: on the bar, the last hour (hot)
const CUTS = [{ id: 'pfd', name: 'PFD ' + P, dd: [next], at: 15 * 60, pre: 1 },
  // B&E closes at 19:00 with its reminder from 17:00, Meat Co at 20:00 from 19:00: at 14:00 neither reminder has started, so
  // only the next one, B&E, is on the board, quiet (8 Nov 2026, head chef: the next cut-off on Home from the morning)
  { id: 'bne', name: 'B&E Chicken', dd: [next], at: 19 * 60, pre: 1, lead: 120 }, { id: 'meat', name: 'Meat Co', dd: [next], at: 20 * 60, pre: 1, lead: 60 }];
function fn(o) {
  const R0 = (o.rounds || []).map(x => ({ at: at(o.date, x), note: '' }));
  return M.derive({ v: 1, status: 'confirmed', name: o.name, date: o.date, start: o.start ? at(o.date, o.start) : 0, st: !o.start, loc: '', guests: 40, gu: false, mode: R0.length > 1 ? 'stag' : 'all',
    notes: '', kc: '', kcBy: '', kcAt: 0, rounds: R0, lines: o.lines.map(([rid, name, a]) => ({ rid, name, unit: 'platter', spec: 'Per platter.', fp: '', qty: a.reduce((s, x) => s + x, 0), u: M.toU(a) })),
    was: {}, chg: [], cBy: 'sam', cAt: L.NOW - 86400000, confBy: 'sam', confAt: L.NOW - 86400000, by: 'sam', upd: L.NOW - 3600000 });
}
const base = (x) => ({ [CFG]: Object.assign({ people, sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], showBadges: true, kitSecs: SECS, kitShifts: SHIFTS }, x || {}) });
const full = () => Object.assign(base({ cutoffs: CUTS }), {
  [fsKey(['functions', 'bday'])]: fn({ name: 'Birthday 60th ' + P, date: today, start: '13:30', rounds: ['14:10', '15:00', '15:40'], lines: [['pizza-platter', 'Pizza Platter', [2, 2, 2]]] }),
  [fsKey(['functions', 'wed'])]: fn({ name: 'Wedding reception', date: tom, start: '18:00', rounds: ['18:30'], lines: [['pizza-platter', 'Pizza Platter', [4]]] }),
  // 6 days out: in Coming up since it looks a week ahead (8 Nov 2026, the audit of the redesign)
  [fsKey(['functions', 'quiz'])]: fn({ name: 'Quiz night', date: M.addDays(today, 6), start: '18:00', rounds: ['19:00'], lines: [['pizza-platter', 'Pizza Platter', [3]]] }),
  // Ann on Lunch at Larder, her break at 14:30 for 30 minutes
  [TEAM]: { day: today, on: [{ id: 'ann', sh: 'lunch', sec: 'larder' }, { id: 'sam', sh: 'lunch', sec: '' }], br: [{ id: 'ann', sh: 'lunch', at: 870, len: 30 }], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' },
  [fsKey(['notes', 'n1'])]: { text: 'Fryer 2 is down. Use fryer 1. ' + P, tag: 'none', start: today, until: today, dows: [], tm: 835, removed: false, at: 1, by: 'sam' }
});
const board = p => p.evaluate(() => [...document.querySelectorAll('#hm-board .hm-a')].map(a => ({ t: a.querySelector('.hm-t').textContent, s: (a.querySelector('.hm-s') || {}).textContent || '', tm: (a.querySelector('.hm-tm') || {}).textContent || '', n: (a.querySelector('.hm-n') || {}).textContent || '', hot: a.classList.contains('is-hot'), href: a.getAttribute('href') || '', fn: a.getAttribute('data-fn') || '', note: a.getAttribute('data-note') || '', tmd: a.getAttribute('data-tm') || '' })));
const secs = p => p.evaluate(() => [...document.querySelectorAll('#hm-prep .hm-sec')].map(a => a.querySelector('.hm-sn').textContent + ':' + a.querySelector('.hm-sl').textContent));
const bad = p => p.evaluate(() => ({ i: document.querySelectorAll('#pwn').length, img: document.querySelectorAll('img[src="x"]').length, attr: document.querySelectorAll('[data-pwn]').length, run: !!window.__pwn }));
const bill = p => p.evaluate(() => window.__fake.bill.reduce((n, x) => n + x.n, 0));
const shut = async p => { if (await p.$('.nt-wrap')) { await p.keyboard.press('Escape'); await L.settle(p, 300); } };

(async () => {
  const b = await L.start();
  let p, rows;

  // Sam, a sous chef: a named welcome, the board with the cut-off, the function's next round and the ping, soonest first
  p = await L.open(b, '#/', { who: 'sam', extra: full(), wait: 1800 });
  await L.waitFor(p, () => document.querySelectorAll('#hm-board .hm-a').length >= 3, null, 8000).catch(() => {});
  const date = new Date(L.NOW).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Australia/Brisbane' });
  const welcome = await txt(p, '#rtitle');
  ok(!!(await p.$('#rtitle.hm-welcome')) && ['Welcome', 'Hello', 'Hi there', 'G’day', 'Morning', 'Good morning', 'Afternoon', 'Good afternoon', 'Evening', 'Good evening', 'Late one', 'Good to see you', 'Welcome in', 'Enjoy your break', 'Have a good break', 'Welcome back', 'Back at it', 'Last stretch', 'Nearly there', 'Thanks for today', 'Good work today'].some(prefix => welcome === prefix + ', Sam') && await txt(p, '.wall-date') === date + ' · 14:00', 'the named welcome keeps the kitchen weekday, date and time beneath it (' + await txt(p, '.wall-date') + ')');
  ok(!(await p.$('.dockets')) && !(await p.$('#fn-band')) && !(await p.$('#cut-band')), 'no dockets on Home, and the function band and the cut-off bar are off it');
  rows = await board(p);
  const fnRow = rows.find(r => r.fn === 'open'), cut = rows.find(r => /order closes$/.test(r.t)), ping = rows.find(r => r.note === 'open');
  ok(!!fnRow && /^Birthday 60th Zz<i/.test(fnRow.t) && /^Round 1 of 3 · 2 × Pizza$/.test(fnRow.s) && fnRow.tm === '14:10' && fnRow.n === 'In 10 min' && fnRow.hot, 'the function: its next round, what goes out, the time and In 10 min, hot (' + JSON.stringify(fnRow) + ')');
  ok(!!cut && /^PFD Zz<i/.test(cut.t) && cut.tm === '15:00' && cut.n === '1 h left' && cut.hot && /^#\/suppliers\/cutoff\/pfd\//.test(cut.href) && /^For /.test(cut.s), 'the cut-off: closes at 15:00, 1 h left, hot, to its supplier order (' + JSON.stringify(cut) + ')');
  ok(!!ping && ping.t === '1 new ping' && /^Fryer 2 is down/.test(ping.s), 'the new ping, with its words (' + JSON.stringify(ping) + ')');
  const quiet = rows.find(r => r.t === 'B&E Chicken order closes');
  ok(!!quiet && quiet.tm === '19:00' && quiet.n === '' && !quiet.hot && /^For /.test(quiet.s) && !rows.some(r => /^Meat Co/.test(r.t)), 'before its reminder starts, today\'s next cut-off shows quiet: its time, no time left, not hot; the one after it waits (' + JSON.stringify(quiet) + ')');
  ok(rows.indexOf(cut) < rows.indexOf(quiet) && rows.indexOf(quiet) < rows.indexOf(ping), 'the quiet cut-off sits in its place by time');
  ok(rows.indexOf(fnRow) < rows.indexOf(cut) && rows.indexOf(cut) < rows.indexOf(ping), 'soonest first, the ping after the timed rows (' + rows.map(r => r.t.slice(0, 12)).join(' | ') + ')');
  ok(!rows.some(r => /^You are on/.test(r.t)) && !rows.some(r => /break/.test(r.t)), 'a sous chef with no section and no break on the plan: neither row');
  let s = await secs(p);
  ok(s.join() === 'Larder:3 left,Grill:1 left,Sauce:2 left' && /0 of 6 done/.test(await txt(p, '#hm-prep .hm-pc') || ''), 'Prep by section: each section and its lines left, 0 of 6 done (' + s.join() + ')');
  // since 10 Nov 2026 (functions ahead of time) tomorrow's wedding is on the Function tomorrow card under Your day
  ok(/Wedding reception/.test(await txt(p, '#fn-hm') || '') && !/Wedding reception|Birthday/.test(await txt(p, '.hm-up #fn-land') || ''), 'tomorrow\'s wedding on the Function tomorrow card, not again in Coming up; not today\'s birthday the board shows');
  // the audit of the redesign (8 Nov 2026): a week of functions and each supplier's next cut-off in Coming up, chevrons
  ok(/Quiz night/.test(await txt(p, '.hm-up #fn-land') || ''), 'Coming up: a function 6 days out (Quiz night)');
  const cuts = await p.$$eval('#hm-cuts li a', l => l.map(a => ({ t: a.textContent, href: a.getAttribute('href') })));
  ok(cuts.length === 3 && cuts.some(c => /^.+ PFD Zz<i.* order closes 15:00$/.test(c.t) && /^#\/suppliers\/cutoff\/pfd\//.test(c.href)) && cuts.some(c => /B&E Chicken order closes 19:00$/.test(c.t)) && !(await p.$('#hm-cuts i#pwn')), 'Coming up: each supplier\'s next cut-off after today, as words, to its supplier order (' + JSON.stringify(cuts.map(c => c.t)) + ')');
  const chev = await p.evaluate(() => [...document.querySelectorAll('#hm-board .hm-a')].map(a => ({ t: a.querySelector('.hm-t').textContent, chev: !!a.querySelector('.hm-chev'), tm: !!a.querySelector('.hm-tm') })));
  ok(chev.length && chev.every(r => r.chev === !r.tm) && chev.some(r => r.chev), 'board rows with no time show a chevron, the timed ones none (' + JSON.stringify(chev.map(r => r.t.slice(0, 10) + ':' + r.chev)) + ')');
  const vb = await bad(p);
  ok(!vb.i && !vb.img && !vb.attr && !vb.run, 'the board shows the names as words, no markup (' + JSON.stringify(vb) + ')');

  // a tick on another phone: the prep card counts it with no reload
  const k = Object.keys(await p.evaluate(() => window.__fake.dump())).find(x => x.indexOf('/days/' + today + '/items/') > 0);
  await p.evaluate(([key]) => { const d = window.__fake.dump()[key]; window.__fake.write(key, Object.assign({}, d, { done: true, doneBy: 'Bo', doneById: 'bo', doneAt: LK_TIME.now() })); }, [k]);
  await L.waitFor(p, () => /1 of 6 done/.test((document.querySelector('#hm-prep .hm-pc') || {}).textContent || ''), null, 5000).catch(() => {});
  ok(/1 of 6 done/.test(await txt(p, '#hm-prep .hm-pc') || ''), 'a line ticked on another phone: 1 of 6 done, no reload');

  // a tap on a section opens the prep list on its tab
  await shut(p);
  await p.click('#hm-prep .hm-sec[data-hm-sec="Grill"]'); await L.settle(p, 900);
  ok(/#\/prep$/.test(p.url()) && await p.$eval('.nb-tabs [data-p="tab"][aria-pressed="true"]', e => e.textContent.trim()).catch(() => '') === 'Grill', 'a section opens the prep list on its tab');
  ok(!!(await p.$('#cut-band:not([hidden])')), 'the cut-off bar is still on the prep list');
  ok(p.errors.length === 0, 'sous chef: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // time passing reads nothing: a minute on, the board is drawn again from what is held
  p = await L.open(b, '#/', { who: 'sam', extra: full(), wait: 1800 });
  await shut(p);
  const b0 = await bill(p);
  await p.clock.runFor(61000); await L.settle(p, 300);
  ok(await bill(p) === b0 && /14:01/.test(await txt(p, '#hm-board .hm-clock') || ''), 'a minute on: the clock moves, no reads (' + b0 + ' then ' + await bill(p) + ')');
  await p.context().close();
  // the same day opened on Recipes (no board): the same reads, so the board reads nothing of its own
  p = await L.open(b, '#/recipes', { who: 'sam', extra: full(), wait: 1800 });
  const b1 = await bill(p);
  ok(b1 === b0, 'Home reads what Recipes reads for the same day (' + b0 + ' and ' + b1 + ')');
  await p.context().close();

  // Ann, staff on Larder: section/hours and full break stay above the separate work board.
  p = await L.open(b, '#/', { who: 'ann', extra: full(), wait: 1800 });
  await L.waitFor(p, () => /Larder/.test(document.querySelector('#hm-day')?.textContent || ''), null, 8000);
  rows = await board(p);
  const sec = await txt(p, '[data-hm-priority="section"]') || '', brk = await txt(p, '[data-hm-priority="break"]') || '';
  ok(/Your section/.test(sec) && /Larder/.test(sec) && /Lunch/.test(sec) && /10:00/.test(sec) && /15:00/.test(sec), 'staff: personal section and complete shift hours first (' + sec + ')');
  ok(/Your break/.test(brk) && /14:30/.test(brk) && /15:00/.test(brk) && /30 min/.test(brk) && !!(await p.$('#hm-day [data-tm="day"]')), 'staff: full break window and duration open Your day (' + brk + ')');
  ok(!rows.some(r => /Your break|You are on/.test(r.t)), 'staff: personal facts are not duplicated among the work reminders');
  ok(!rows.some(r => /order closes/.test(r.t)), 'staff: no cut-off rows');
  ok(!(await p.$('#hm-cuts li')), 'staff: no cut-offs in Coming up');
  const staffTeam = await txt(p, '#hm-team') || '';
  ok(/Ann/.test(staffTeam) && /Sam/.test(staffTeam) && /Larder/.test(staffTeam) && /Lunch 10:00 to 15:00/.test(staffTeam), 'staff: the full day shows the saved team, their sections and shift hours (' + staffTeam + ')');
  ok(!(await p.$('#hm-team a[href="#/team"]')) && !(await p.$('#hm-team button, #hm-team input, #hm-team select')), 'staff: the roster has no team editor link or editing controls');
  const staffBill = await bill(p);
  await shut(p);
  await p.click('#hm-day [data-tm="day"]'); await L.settle(p, 400);
  ok(!!(await p.$('.nt-wrap .nt')) && /Your day/.test(await txt(p, '.nt-wrap') || ''), 'the break row opens Your day');
  ok(p.errors.length === 0, 'staff: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  p = await L.open(b, '#/recipes', { who: 'ann', extra: full(), wait: 1800 });
  ok(await bill(p) === staffBill, 'staff: Home with the roster reads what Recipes reads for the same day (' + staffBill + ' and ' + await bill(p) + ')');
  await p.context().close();

  // Staff see coworkers immediately; the complete saved day remains one tap away at every width.
  for (const w of [390, 768, 1280]) {
    p = await L.open(b, '#/', { who: 'ann', extra: full(), width: w, height: w === 390 ? 844 : 900, wait: 1800 });
    await shut(p);
    const team = await p.evaluate(() => {
      const e = document.getElementById('hm-with-body'), own = document.getElementById('hm-day');
      return e && own ? { shown: e.getBoundingClientRect().height > 0, text: e.innerText, ownFirst: !!(own.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING) } : null;
    });
    ok(!!team && team.shown && team.ownFirst && /Sam/.test(team.text) && /Lunch/.test(team.text) && !/Ann/.test(team.text), w + ' px staff: own day then visible scheduled coworkers, without a sheet (' + JSON.stringify(team) + ')');
    await p.click('#hm-full-team > summary');
    ok(/Ann/.test(await txt(p, '#hm-team') || '') && /Sam/.test(await txt(p, '#hm-team') || ''), w + ' px staff: the whole saved day remains available in one tap');
    ok(!(await L.overflow(p)) && p.errors.length === 0, w + ' px staff: no sideways scroll or page errors ' + p.errors.join(' | '));
    const reads = await bill(p);
    await p.clock.runFor(61000); await L.settle(p, 150);
    ok(await bill(p) === reads, w + ' px staff: the roster minute tick adds no reads');
    await p.context().close();
  }

  // nothing to come: one short line; signed out: the Recipes docket as before
  p = await L.open(b, '#/', { who: 'sam', extra: base(), wait: 1800 });
  ok(await p.locator('#hm-board').evaluate(e => e.hidden) && !(await p.$('#hm-board .hm-a')), 'nothing to come: the work board is hidden rather than competing with the personal day');
  ok(await p.$eval('.hm-up', e => getComputedStyle(e).display === 'none').catch(() => false), 'nothing coming up: no Coming up card');
  await p.context().close();
  p = await L.open(b, '#/', { noPin: true, who: '', wait: 1400 });
  ok(!(await p.$('#hm-board')) && (await p.$$('.dockets .docket')).length === 1 && /Recipes/i.test(await txt(p, '.dockets') || '') && await txt(p, '#rtitle') === 'Pick a docket', 'signed out: the Recipes docket, as before');
  await p.context().close();

  // every width: no sideways scroll, no errors, the board and prep card side by side on a laptop
  for (const w of [390, 768, 1280]) {
    p = await L.open(b, '#/', { who: 'sam', extra: full(), width: w, height: w === 390 ? 844 : 900, wait: 1800 });
    await shut(p);
    const g = await p.evaluate(() => { const a = document.getElementById('hm-board').getBoundingClientRect(), c = document.getElementById('hm-prep').getBoundingClientRect(); return { side: c.left >= a.right - 1, below: c.top >= a.bottom - 1 }; });
    ok(!(await L.overflow(p)) && p.errors.length === 0 && (w >= 768 ? g.side : g.below), w + ' px: no sideways scroll, no errors, ' + (w >= 768 ? 'board and prep side by side' : 'prep under the board') + ' (' + JSON.stringify(g) + ') ' + p.errors.join(' | '));
    ok(await p.$$eval('#hm-board .hm-a, #hm-prep .hm-sec', l => l.every(e => e.getBoundingClientRect().height >= 44 - .1)), w + ' px: every row is at least 44 px high');
    // The accepted quieter Home folds the full-day roster at every width, while keeping it available.
    ok(await p.locator('#hm-full-team').evaluate(e => !e.open), w + ' px: full-day detail starts folded');
    await p.click('#hm-full-team > summary');
    const team = await txt(p, '#hm-team') || '';
    ok(/Larder/.test(team) && /Ann/.test(team) && /break 14:30/.test(team) && /Lunch/.test(team), w + ' px: full On today retains section, shift and break details (' + team.slice(0, 100) + ')');
    await p.context().close();
  }

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
