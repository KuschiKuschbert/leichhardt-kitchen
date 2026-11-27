// Person worksheet: per-person section and break picks share one dated draft and Save. The away panel always describes the
// saved plan. Rows on one clock (16 Nov 2026): each person's row holds a line per service they work, with its section
// picker, and Add a service; the details panel and Whole day review went with the day grid. One break per person (17 Nov
// 2026): a person's breaks sit on one break line under their day, keyed by the break's start (tm-bat:ID:AT:N).
// Access, Use it and every old break/batch control are covered by todays-team.test.js.
const L = require('./lib');
const fs = require('fs'), path = require('path');
const { R, ok } = L.results(), { txt, tap } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), TEAM = fsKey(['team', today]), CFG = fsKey(['config', 'main']);
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, active: true }
];
const secs = [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }, { id: 'larder', name: 'Larder' }];
const shifts = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320 }, { id: 'full', name: 'Full day', from: 600, to: 1320 }];
const cfg = x => ({ [CFG]: Object.assign({ people, sousIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], kitSecs: secs, kitShifts: shifts }, x || {}) });
const plan = x => Object.assign({ day: today, on: [{ id: 'ann', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'full', sec: 'larder' }, { id: 'sam', sh: 'dinner', sec: 'grill' }, { id: 'sam', sh: 'lunch', sec: 'larder' }],
  br: [{ id: 'bo', sh: 'full', at: 750, len: 150 }, { id: 'ann', sh: 'lunch', at: 825, len: 45 }, { id: 'sam', sh: 'lunch', at: 870, len: 30 }, { id: 'sam', sh: 'dinner', at: 1140, len: 150 }],
  v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' }, x || {});
const fixture = (p, c) => Object.assign(cfg(c), p === null ? {} : { [TEAM]: p || plan() });
const readCount = p => p.evaluate(() => window.__fake.reads.filter(k => /\/(team|teamsum)\//.test(k)).length);
const saved = p => p.evaluate(k => window.__fake.dump()[k], TEAM);
const away = p => txt(p, '.tm-away-slot');
const boardHidden = p => p.$eval('.tm-away', e => e.hidden && getComputedStyle(e).display === 'none' && e.getBoundingClientRect().height === 0);
const boardShown = p => p.$eval('.tm-away', e => !e.hidden && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0);
const rows = p => p.$$eval('.tm-away-row', all => all.map(e => ({ name: (e.querySelector('.tm-away-name') || {}).textContent || '', text: e.textContent.trim() })));
const press = async (p, s) => { const found = await tap(p, s); await L.settle(p, 150); return found; };
// a section picker per person and service (tm-sec:ID:SH), one break line per person (tm-bat:ID:AT:N, found as it is now
// with L.brKey(), since the key follows the break's start), all in the row
const assign = (p, id, sec, sh = 'lunch') => L.pick(p, 'select[data-k="tm-sec:' + id + ':' + sh + '"]', sec);
const pick = async (p, k, v) => { await L.pick(p, 'select[data-k="' + k + '"]', String(v)); return true; };
const val = (p, k) => p.$eval('select[data-k="' + k + '"]', e => e.value);
const lines = (p, id) => p.$$eval('.tm-tlrow[data-id="' + id + '"] .tm-tlsvc', all => all.map(e => e.dataset.sh));
// the notebook's work column is drawn (its Add staff button shows with or without people on the day)
async function ready(p) { await L.waitFor(p, () => !!document.querySelector('.tm-page.tm-notebook .tm-nbook .tm-work [data-p="tm-add-staff"], .tm-page.tm-notebook .tm-nbook .tm-work .tm-quick-add:not([hidden])'), null, 6000); }
async function refresh(p, rec) {
  if (rec !== undefined) await p.evaluate(([k, v]) => window.__fake.write(k, v), [TEAM, rec]);
  await press(p, '[data-p="tm-refresh"]');
  await L.settle(p, 250);
}
async function focusAt(p, time) { await p.context().clock.setSystemTime(time); await p.evaluate(() => window.dispatchEvent(new Event('focus'))); await L.settle(p, 150); }

(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/team', { who: 'sam', extra: Object.assign(fixture(), { [fsKey(['teamsum', 'main'])]: { day: today, days: [], usual: { [new Date(L.NOW).getDay() + '|lunch']: { sam: ['pans', 6, 8] } }, learn: { sam: ['Grill'] } } }), wait: 1200 });
  await ready(p);
  const before = await readCount(p), initialAway = await away(p), initialBreaks = plan().br;
  const current = await rows(p);
  ok(current.length === 2 && current.some(r => r.name === 'Ann' && /14:30/.test(r.text)) && current.some(r => r.name === 'Bo' && /[Ss]plit/.test(r.text) && /15:00/.test(r.text)), 'saved status: a Lunch meal break and a Full day split both show with return times');
  ok(/On break now/.test(initialAway) && /Until 14:30/.test(initialAway) && /All services/.test(initialAway) && /Saved plan/.test(initialAway), 'saved status: On break now shows Until, all services and Saved plan');
  const boardStyle = await p.$eval('.tm-away', e => {
    const s = getComputedStyle(e), pin = getComputedStyle(e, '::before'), probe = document.createElement('span');
    probe.style.background = 'var(--bar)'; document.body.appendChild(probe);
    const charcoal = getComputedStyle(probe).backgroundColor; probe.remove();
    return { charcoal: s.backgroundColor === charcoal, edge: parseFloat(s.borderInlineStartWidth), radius: parseFloat(s.borderRadius), compact: e.classList.contains('tm-live-strip'), pin: pin.display !== 'none' && pin.content !== 'none' && pin.content !== 'normal' };
  });
  ok(boardStyle.charcoal && boardStyle.edge >= 4 && boardStyle.radius >= 8 && boardStyle.compact && !boardStyle.pin, 'break board: the saved breaks retain charcoal and their orange edge in the compact strip');
  ok(await p.$$eval('.tm-next-row', all => all.length) > 0 && await p.$$eval('.tm-next-row', all => all.length) <= 3, 'next breaks: a compact list uses the loaded saved schedule');
  ok(await val(p, 'tm-sec:sam:lunch') === 'larder' && await val(p, 'tm-sec:sam:dinner') === 'grill' && !await p.$('[data-p="tm-section"], [data-p="tm-assign"]'), 'assignment: Sam has an explicit current section picker without a global assignment mode');
  ok(!await p.$('[data-p="tm-focus"], .tm-detail-workbench, [data-p="tm-whole"], .tm-dayperson') && JSON.stringify(await lines(p, 'sam')) === '["lunch","dinner"]', 'rows: Sam\'s Lunch and Dinner are lines in his row, in time order, with no panel or Whole day to open');
  await assign(p, 'sam', 'grill');
  ok(await val(p, 'tm-sec:sam:lunch') === 'grill', 'assignment: choosing Grill deliberately overrides Sam\'s usual Pans');
  ok(await p.$eval('select[data-k="tm-sec:sam:lunch"]', e => [...e.options].some(o => o.value === '' && o.textContent === 'Sous chef')), 'assignment: the chef role remains an explicit no-section choice');
  await assign(p, 'sam', '');
  ok(await val(p, 'tm-sec:sam:lunch') === '' && JSON.stringify(await lines(p, 'sam')) === '["lunch","dinner"]' && await val(p, await L.brKey(p, 'sam', 0)) === '870', 'Clear section: Sam stays on Lunch and keeps his break');
  await assign(p, 'sam', 'grill');
  ok(await val(p, 'tm-sec:sam:dinner') === 'grill' && await val(p, 'tm-sec:sam:lunch') === 'grill', 'each service: Dinner keeps its own section beside Lunch, without a selected assignment mode');
  await assign(p, 'sam', 'pans', 'dinner');
  // Whole day review went (16 Nov 2026): Sam's row is his whole day, its sentence his hours and breaks
  // what the chef sees on each of Sam's lines: its service name and the section its picker shows (visible text only,
  // so the picker's other options never count)
  const samLine = sh => p.$eval('.tm-tlrow[data-id="sam"] .tm-tlsvc[data-sh="' + sh + '"]', e => e.querySelector('.tm-tlsvc-head b').innerText + ' | ' + e.querySelector('.tm-tlsvc-sec').innerText.replace(/\s+/g, ' '));
  const samDay = await txt(p, '.tm-tlrow[data-id="sam"] .tm-roster-time') || '', lunchSeen = await samLine('lunch'), dinnerSeen = await samLine('dinner');
  ok(/Unsaved changes/.test(await txt(p, '.tm-draftstate') || '') && /^Lunch \|.*Grill/.test(lunchSeen) && !/Pans|Larder/.test(lunchSeen) && /^Dinner \|.*Pans/.test(dinnerSeen) && !/Grill|Larder/.test(dinnerSeen), 'Sam\'s row: the same draft shows Lunch Grill and Dinner Pans (' + lunchSeen + '; ' + dinnerSeen + ')');
  ok(/14:30/.test(samDay) && /19:00/.test(samDay) && /21:30/.test(samDay) && /[Ss]plit/.test(samDay), 'Sam\'s row: his meal break, split and return time remain in the draft (' + samDay + ')');
  ok(await p.$$eval('[data-p="tm-save"]', all => all.length) === 1 && (await saved(p)).v === 1 && await away(p) === initialAway, 'draft: one Save, no automatic write, and the saved away panel stays unchanged');
  ok(await readCount(p) === before, 'reads: section and break changes in the rows reuse the loaded plan and training data');
  await press(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k].v === 2, TEAM, 6000);
  const out = await saved(p);
  const expectedOn = [{ id: 'ann', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'full', sec: 'larder' }, { id: 'sam', sh: 'dinner', sec: 'pans' }, { id: 'sam', sh: 'lunch', sec: 'grill' }];
  ok(JSON.stringify(out.on) === JSON.stringify(expectedOn) && JSON.stringify(out.br) === JSON.stringify(initialBreaks), 'Save: exact per-shift sections, meal breaks and split persist, with no overview assignment');
  ok(out.day === today && out.by === 'sam' && out.v === 2 && out.at === plan().at && typeof out.upd === 'number', 'Save: the existing versioned day record and original creation time are preserved');

  // An unsaved break move cannot change staff\'s published status, including when another chef wins the save.
  // 14:15 (855): the last start a 45 minute break has inside Ann's Lunch to 15:00 (break times inside her hours, 16 Nov 2026)
  ok(await pick(p, await L.brKey(p, 'ann', 0), 855), 'draft: Ann\'s break remains editable through the existing controls');
  await L.settle(p, 150);
  ok((await rows(p)).some(r => r.name === 'Ann'), 'draft break: Ann remains scheduled away according to the saved break');
  await press(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k].v === 3, TEAM, 6000);
  ok(!(await rows(p)).some(r => r.name === 'Ann') && (await saved(p)).br.some(x => x.id === 'ann' && x.at === 855), 'saved break: only a successful Save publishes the moved break to scheduled status');
  await pick(p, await L.brKey(p, 'ann', 0), 780); await L.settle(p, 150);
  const beforeConflict = await away(p);
  const newer = Object.assign({}, await saved(p), { v: 4, upd: L.NOW + 60000, br: out.br.map(x => x.id === 'ann' ? Object.assign({}, x, { at: 840 }) : x) });
  await p.evaluate(([k, r]) => window.__fake.write(k, r), [TEAM, newer]);
  await press(p, '[data-p="tm-save"]'); await L.settle(p, 700);
  ok(/Not saved:/.test(await txt(p, '.tm-save') || '') && (await saved(p)).v === 4, 'conflict: another chef\'s newer version is protected');
  ok(await away(p) === beforeConflict && await val(p, await L.brKey(p, 'ann', 0)) === '780', 'conflict: saved status stays on the loaded plan and the unfinished break edit remains recoverable');
  await press(p, '[data-p="tm-refresh"]');
  ok(await val(p, await L.brKey(p, 'ann', 0)) === '780', 'Refresh: the first tap keeps the unsaved draft until discard is confirmed');
  await press(p, '[data-p="tm-refresh"]'); await L.settle(p, 250);
  ok(/14:45/.test(await away(p) || '') && await p.$eval('[data-p="tm-save"]', e => e.disabled), 'Refresh: confirmation loads the newer saved break and resets the draft');
  ok(p.errors.length === 0, 'assignment and conflict: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Real minute tick at the inclusive start, then focus at the exclusive end. A focused search is never replaced.
  p = await L.open(b, '#/team', { who: 'sam', extra: fixture(), clock: L.NOW - 16 * 60000, wait: 1200 });
  await ready(p);
  ok((await rows(p)).length === 1 && (await rows(p))[0].name === 'Bo', 'boundary: a meal break is absent before its scheduled start');
  await p.fill('[data-k="tm-q"]', 'Sam');
  await p.evaluate(() => { const q = document.querySelector('[data-k="tm-q"]'); q.focus(); q.setSelectionRange(1, 2); window.__teamInputProbe = q; });
  const beforeTick = await readCount(p);
  await p.clock.fastForward(60000); await L.settle(p, 180);
  ok((await rows(p)).some(r => r.name === 'Ann'), 'minute tick: a meal break appears at its inclusive start without opening the page again');
  ok(await p.evaluate(() => { const q = document.querySelector('[data-k="tm-q"]'); return q === window.__teamInputProbe && q === document.activeElement && q.value === 'Sam' && q.selectionStart === 1 && q.selectionEnd === 2; }), 'minute tick: targeted status painting preserves the search node, focus, words and selection');
  await focusAt(p, L.NOW + 30 * 60000);
  ok(!(await rows(p)).some(r => r.name === 'Ann') && (await rows(p)).some(r => r.name === 'Bo'), 'focus: a meal break is absent at its exclusive end while another shift\'s split remains');
  await focusAt(p, L.NOW + 60 * 60000);
  ok(!(await rows(p)).some(r => r.name === 'Bo') && /15:00/.test(await txt(p, '.tm-nclock') || ''), 'focus: a split ends at its return time and the kitchen clock repaints');
  ok(await readCount(p) === beforeTick, 'reads: minute and focus paints add no team or training reads');
  ok(await p.evaluate(() => { const q = document.querySelector('[data-k="tm-q"]'); return q === window.__teamInputProbe && q.value === 'Sam'; }), 'focus: time updates preserve the unfinished person search');
  ok(p.errors.length === 0, 'clock boundaries: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // A checked empty board takes no space, but its retained node can show each saved break when the clock reaches it.
  p = await L.open(b, '#/team', { who: 'sam', extra: fixture(plan({ br: [{ id: 'ann', sh: 'lunch', at: 825, len: 45 }, { id: 'bo', sh: 'full', at: 900, len: 150 }] })), clock: L.NOW - 16 * 60000, wait: 1200 });
  await ready(p);
  ok(await boardHidden(p), 'empty board: a confirmed plan with nobody away hides the whole board and its layout space on initial render');
  await p.fill('[data-k="tm-q"]', 'Sam');
  await p.evaluate(() => { window.__emptyBoardProbe = document.querySelector('.tm-away'); window.__emptyInputProbe = document.querySelector('[data-k="tm-q"]'); });
  const visibilityReads = await readCount(p);
  await p.clock.fastForward(60000); await L.settle(p, 180);
  ok(await boardShown(p) && (await rows(p)).some(r => r.name === 'Ann'), 'empty board: the first meal break shows the board at its inclusive start without reloading');
  await focusAt(p, L.NOW + 30 * 60000);
  ok(await boardHidden(p), 'empty board: the final meal return hides the board at its exclusive end');
  await focusAt(p, L.NOW + 60 * 60000);
  ok(await boardShown(p) && /Split|split/.test(await away(p) || '') && (await rows(p)).some(r => r.name === 'Bo'), 'empty board: the next split shows the retained board at its inclusive start');
  await focusAt(p, L.NOW + 210 * 60000);
  ok(await boardHidden(p), 'empty board: the final split return hides the board again');
  ok(await readCount(p) === visibilityReads && await p.evaluate(() => document.querySelector('.tm-away') === window.__emptyBoardProbe && document.querySelector('[data-k="tm-q"]') === window.__emptyInputProbe && window.__emptyInputProbe.value === 'Sam'), 'empty board: clock visibility changes retain the board, unfinished search and read count');
  ok(p.errors.length === 0, 'empty board: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // The same input data can contain duplicate or overlapping planned intervals. Never guess one return time.
  const overlap = plan({ on: [{ id: 'ann', sh: 'lunch', sec: 'grill' }, { id: 'ann', sh: 'full', sec: 'pans' }], br: [{ id: 'ann', sh: 'lunch', at: 825, len: 45 }, { id: 'ann', sh: 'full', at: 825, len: 45 }] });
  p = await L.open(b, '#/team', { who: 'sam', extra: fixture(overlap), wait: 1200 }); await ready(p);
  ok((await rows(p)).length === 1 && !/Check break times/.test(await away(p) || ''), 'duplicates: the same person and interval on two shifts appears once');
  await refresh(p, Object.assign({}, overlap, { v: 2, br: overlap.br.concat([{ id: 'ann', sh: 'lunch', at: 840, len: 60 }]) }));
  const overlapText = await away(p) || '';
  ok((await rows(p)).length === 1 && /Check break times/.test(overlapText) && /13:45/.test(overlapText) && /15:00/.test(overlapText), 'overlap: conflicting times produce one named warning with the explicit scheduled ranges');
  ok(!/\bback\s+14:30/i.test(overlapText) && !/\bback\s+15:00/i.test(overlapText), 'overlap: the summary does not present one guessed return as reliable');
  // Sam stays on with no break: a plan with nobody on reads as Not set (16 Nov 2026), so this checks orphans on a set day
  await refresh(p, plan({ v: 3, on: [{ id: 'sam', sh: 'dinner', sec: 'grill' }], br: [{ id: 'ann', sh: 'lunch', at: 825, len: 45 }, { id: 'gone', sh: 'full', at: 750, len: 150 }, { id: 'bo', sh: 'removed', at: 825, len: 45 }] }));
  ok(!(await rows(p)).length && /Nobody scheduled away/.test(await away(p) || ''), 'membership: orphan breaks, removed people and removed shifts do not imply someone is away');
  await refresh(p, plan({ v: 4, on: [{ id: 'ann', sh: 'lunch', sec: 'grill' }], br: [{ id: 'ann', sh: 'lunch', at: 825, len: 40 }] }));
  ok(/Some times could not be checked/.test(await away(p) || '') && !/Nobody scheduled away/.test(await away(p) || ''), 'malformed saved break: a discarded current-member interval warns instead of claiming zero');
  ok(await boardShown(p), 'malformed saved break: an unknown current status keeps its warning board visible');
  await assign(p, 'ann', 'pans'); await press(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k].v === 5, TEAM, 6000);
  ok(!Object.hasOwn(await saved(p), 'uncheckedBr'), 'saved format: defensive warning metadata stays in memory and never changes the team document');
  ok(p.errors.length === 0, 'defensive intervals: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Hold both live-day and week reads: either successful server answer can now establish today's saved plan.
  let sdk = fs.readFileSync(path.join(__dirname, 'fake', 'firebase-firestore.js'), 'utf8');
  ['getDoc', 'getDocsFromServer'].forEach(fn => {
    sdk = sdk.replace('export function ' + fn + '(ref) {', 'export function ' + fn + '(ref) { if (/\\/team(?:\\/|$)/.test(key(ref.path)) && !window.__fake.allowTeamRead) return new Promise(resolve => { (window.__fake.teamReleases = window.__fake.teamReleases || []).push(() => ' + fn + '(ref).then(resolve)); window.__fake.releaseTeamRead = () => { window.__fake.allowTeamRead = true; window.__fake.teamReleases.splice(0).forEach(release => release()); }; });');
  });
  p = await L.open(b, '#/team', { who: 'sam', extra: fixture(null), fakeSDK: { 'firebase-firestore.js': sdk }, wait: 1000 });
  await L.waitFor(p, () => !!window.__fake && typeof window.__fake.releaseTeamRead === 'function', null, 6000);
  const loading = await away(p) || await txt(p, '.tm-page') || '';
  ok(/Checking|Loading/i.test(loading) && !/Nobody scheduled away|No saved plan/i.test(loading), 'loading: a pending plan read never becomes a false zero or an unset plan');
  await p.evaluate(() => window.__fake.releaseTeamRead()); await ready(p);
  ok(/No team saved yet/i.test(await away(p) || '') && !/Nobody scheduled away/i.test(await away(p) || ''), 'unset: no team saved is distinct from a checked empty schedule');
  // since 27 Nov 2026 (head chef, step 4) the board waits until a team is saved: the names to tick come first
  ok(!(await boardShown(p)), 'unset: with no team saved the board waits until there is one');
  await p.evaluate(() => { window.__fake.failReads = /\/team(?:\/|$)/; }); await refresh(p);
  const errorState = await away(p) || await txt(p, '.tm-page') || '';
  ok(/Could not check|Could not load/i.test(errorState) && !/Nobody scheduled away/i.test(errorState), 'failed read: an unavailable plan is unknown, never Nobody scheduled away');
  ok(p.errors.length === 0, 'plan states: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Staleness uses elapsed read age, while an old calendar day must never claim the current break count.
  // a set day with nobody on a break (a plan with nobody on reads as Not set since 16 Nov 2026)
  p = await L.open(b, '#/team', { who: 'sam', extra: fixture(plan({ on: [{ id: 'sam', sh: 'dinner', sec: 'grill' }], br: [] })), clock: L.NOW - 9.5 * 3600000, wait: 1200 }); await ready(p);
  const beforeAge = await readCount(p);
  ok(await boardHidden(p), 'fresh empty plan: its checked zero is hidden before authority or time becomes unknown');
  await p.evaluate(() => { window.__teamClockReady = window.LK_TIME.ready; window.LK_TIME.ready = () => false; window.dispatchEvent(new Event('focus')); });
  ok(/Checking the kitchen clock/i.test(await away(p) || '') && !/Nobody scheduled away/i.test(await away(p) || ''), 'unknown clock: an unchecked kitchen clock cannot claim a reliable zero');
  ok(await boardShown(p), 'unknown clock: the hidden board becomes visible to explain the unchecked clock');
  await p.evaluate(() => { window.LK_TIME.ready = window.__teamClockReady; });
  await focusAt(p, L.NOW + 3 * 3600000);
  ok(/Refresh|last checked|older|stale/i.test(await away(p) || '') && !/Nobody scheduled away/i.test(await away(p) || ''), 'stale: a plan held more than twelve hours asks to check again instead of claiming a reliable zero');
  ok(await boardShown(p), 'stale: an old empty plan keeps its refresh warning visible');
  await focusAt(p, L.NOW + 24 * 3600000);
  ok(/today|day|check|Refresh/i.test(await away(p) || '') && !/Nobody scheduled away/i.test(await away(p) || ''), 'day boundary: yesterday\'s loaded plan cannot answer who is scheduled away today');
  ok(await readCount(p) === beforeAge, 'freshness painting: checking old state itself adds no reads');
  await p.context().close();

  // More real shifts than fit, long synthetic people and an older day's four breaks for Sam (two at most a person since
  // 17 Nov 2026, but a saved day with more still shows them all) at the largest supported reading size.
  const manyShifts = shifts.concat(Array.from({ length: 9 }, (_, i) => ({ id: 'extra' + i, name: 'Evening preparation and smoker ' + (i + 1), from: 600, to: 1320 })));
  const longPeople = people.map(x => Object.assign({}, x, { name: x.name + ' ' + 'Longsynthetickitchenname'.repeat(3) }));
  p = await L.open(b, '#/team', { who: 'sam', extra: fixture(plan({ br: plan().br.concat([{ id: 'sam', sh: 'lunch', at: 720, len: 30 }, { id: 'sam', sh: 'lunch', at: 780, len: 30 }]) }), { people: longPeople, kitShifts: manyShifts, kitSecs: secs.map(x => Object.assign({}, x, { name: x.name + ' and the long preparation section' })) }), wait: 1200 });
  await ready(p);
  const layoutReads = await readCount(p);
  // every configured service in time order: Sam's lines (the services he works), then his Add a service offers the rest
  const ordered = manyShifts.slice().sort((x, y) => x.from - y.from || x.to - y.to).map(s => s.id);
  for (const width of [320, 390, 768, 1280]) for (const text of ['normal', 'xlarge']) {
    await p.setViewportSize({ width, height: 844 });
    await p.evaluate(size => document.documentElement.setAttribute('data-text', size), text); await L.settle(p, 150);
    const m = await p.evaluate(() => {
      const on = [...document.querySelectorAll('.tm-tlrow[data-id="sam"] .tm-tlsvc')].map(e => e.dataset.sh), add = document.querySelector('select[data-k="tm-addsvc:sam"]');
      const offered = add ? [...add.options].map(o => o.value).filter(Boolean) : [], columns = document.querySelectorAll('.tm-planhead .tm-grid-sh').length;
      const targets = [...document.querySelectorAll('.tm-tlrow .ux-picker-trigger, [data-p="tm-addbr"], [data-p="tm-off"], [data-p="tm-save"]')].filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return { action: e.dataset.p || 'picker', width: Math.round(r.width), height: Math.round(r.height) }; });
      return { on, offered, columns, small: targets.filter(r => r.width < 43.5 || r.height < 43.5), saves: document.querySelectorAll('[data-p="tm-save"]').length };
    });
    const label = width + ' ' + text, over = await L.overflow(p);
    ok(JSON.stringify(m.on) === JSON.stringify(ordered.filter(x => x === 'lunch' || x === 'dinner')) && JSON.stringify(m.offered) === JSON.stringify(ordered.filter(x => x !== 'lunch' && x !== 'dinner')) && m.columns === 3, label + ': the head has a column only for the 3 services worked; Sam\'s lines and his Add a service give every configured service in time order');
    ok(!over && m.small.length === 0 && m.saves === 1, label + ': long names and four breaks fit the page, controls are 44 px and Save remains single (' + [over, m.small.length && JSON.stringify(m.small)].filter(Boolean).join('; ') + ')');
  }
  // the last configured service by keyboard alone: Add a service, End, Enter
  await p.locator('select[data-k="tm-addsvc:sam"] + .ux-picker-trigger').focus(); await p.keyboard.press('Enter'); await L.settle(p, 200);
  await p.keyboard.press('End'); await p.keyboard.press('Enter'); await L.settle(p, 250);
  ok(JSON.stringify(await lines(p, 'sam')) === JSON.stringify(ordered.filter(x => ['lunch', 'dinner', 'extra8'].includes(x))) && /added to Evening preparation and smoker 9\. Not saved yet\./.test(await txt(p, '.tm-focus-save') || ''), 'keyboard: the last configured service is reachable from Sam\'s Add a service, and adds him to it');
  ok(await readCount(p) === layoutReads && p.errors.length === 0, 'layout: resizing, largest text and keyboard service changes reuse reads and raise no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
