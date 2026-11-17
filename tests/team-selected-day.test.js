// A worksheet shows the people selected for its date, across every configured service. Breaks are the person's, one
// break line each (17 Nov 2026, docs/team-one-break-options/brief.md): pickers tm-bat:<id>:<at>:<n>, found by the start.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW)), tomorrow = L.ymd(new Date(L.NOW + 86400000));
const TEAM = key('team', today), CFG = key('config', 'main');
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true },
  ...[['ann', 'Ann'], ['bo', 'Bo'], ['dee', 'Dee'], ['lee', 'Lee']].map(([id, name]) => ({ id, name, role: 'staff', active: true, add: true, tick: true }))
];
const shifts = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320 }];
const plan = (day, on, br = []) => ({ day, on, br, v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' });
const fixture = () => ({
  [CFG]: { people, staffIds: people.map(p => p.id), sousIds: ['sam'], kitShifts: shifts, kitSecs: [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }] },
  [TEAM]: plan(today, [{ id: 'ann', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'dinner', sec: 'pans' }, { id: 'sam', sh: 'lunch', sec: 'pans' }, { id: 'lee', sh: 'removed', sec: 'grill' }], [{ id: 'ann', sh: 'lunch', at: 825, len: 45 }, { id: 'bo', sh: 'dinner', at: 1140, len: 30 }]),
  [key('team', tomorrow)]: plan(tomorrow, [{ id: 'dee', sh: 'lunch', sec: 'grill' }])
});
// the people on the day: their rows (a line left with Undo after a Take off, .tm-tlgone, is not a person on the day)
const ids = p => p.locator('.tm-tlrow').evaluateAll(es => es.map(e => e.dataset.id).sort());
const expected = (p, list) => ids(p).then(xs => JSON.stringify(xs) === JSON.stringify(list.slice().sort()));
// the rows on one clock (16 Nov 2026): one section picker per person and service (tm-sec:<id>:<sh>) on its service line
const section = (p, id, sh) => p.locator('select[data-k="tm-sec:' + id + ':' + sh + '"]');
const pick = (p, id, value, sh = 'lunch') => L.pick(p, 'select[data-k="tm-sec:' + id + ':' + sh + '"]', value);
const click = async (p, selector) => { await p.locator(selector).click(); await L.settle(p, 140); };
const read = p => p.evaluate(k => __fake.dump()[k], TEAM);
const countReads = p => p.evaluate(() => __fake.reads.filter(k => /\/(team|teamsum)(\/|$)/.test(k)).length);
// the dated Save drawn in the work area means the day loaded and is editable (Whole day review, the old signal, is gone)
async function ready(p) { await L.waitFor(p, () => !!document.querySelector('.tm-work [data-p="tm-save"]'), null, 7000); }
const words = p => p.locator('.tm-focus-save').innerText();
// Add a service replaced the details chip and its Add; Take off (tapped twice) replaced Remove Lunch and its breaks
const addService = (p, id, sh) => L.pick(p, 'select[data-k="tm-addsvc:' + id + '"]', sh);
const offButton = (id, sh) => '[data-p="tm-off"][data-id="' + id + '"][data-sh="' + sh + '"]';
async function takeOff(p, id, sh) { await click(p, offButton(id, sh)); await click(p, offButton(id, sh)); }
const lines = (p, id) => p.locator('.tm-tlrow[data-id="' + id + '"] .tm-tlsvc').evaluateAll(es => es.map(e => e.dataset.sh));
const addable = (p, id) => p.locator('select[data-k="tm-addsvc:' + id + '"] option').evaluateAll(es => es.map(e => e.value).filter(Boolean));
async function day(p, date) { await L.teamDay(p, date); await ready(p); }

(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/team', { who: 'sam', extra: fixture(), wait: 900 }); await ready(p);
  await L.teamWarm(p, tomorrow, ready);   // tomorrow's week read first: on a Sunday it is next week
  const original = await read(p), reads = await countReads(p), writes = await p.evaluate(() => __fake.writes.length);
  ok(await expected(p, ['ann', 'bo', 'sam']), 'day membership: only people on an active configured service appear in the worksheet');
  // the grid's "Off" cell and the details' service are gone: a service Bo does not work has no line and is offered to add
  ok(!await section(p, 'bo', 'lunch').count() && JSON.stringify(await lines(p, 'bo')) === '["dinner"]' && JSON.stringify(await addable(p, 'bo')) === '["lunch"]' && await section(p, 'bo', 'dinner').inputValue() === 'pans' && await p.locator('.tm-tlrow[data-id="bo"]').isVisible(), 'day membership: Dinner-only Bo has only his actual Dinner line and section, with Lunch offered to add');
  ok(await p.locator('input[data-k="tm-quick-person:dee"]').count() === 1 && !await p.locator('.tm-person-row[data-id="dee"]').count(), 'Add staff: an unselected person remains available in the chooser rather than the worksheet');
  await p.fill('[data-k="tm-q"]', 'Dee'); await L.settle(p, 160);
  ok(await p.locator('.tm-person-row').count() === 0 && /No people match/.test(await p.locator('.tm-people').innerText()), 'search: typing an unselected name cannot reveal an unscheduled worksheet row');
  await L.clear(p, '[data-k="tm-q"]'); await L.waitFor(p, () => !!document.querySelector('.tm-person-row[data-id="ann"]'), null, 6000);
  await day(p, tomorrow);
  ok(await expected(p, ['dee']), 'date isolation: tomorrow shows only its own selected people');
  await day(p, today); await L.waitFor(p, () => !!document.querySelector('.tm-person-row[data-id="ann"]'), null, 6000);
  ok(await expected(p, ['ann', 'bo', 'sam']), 'date return: today restores its own day membership without another date leaking in');
  await pick(p, 'ann', '');
  ok(await expected(p, ['ann', 'bo', 'sam']) && await section(p, 'ann', 'lunch').inputValue() === '' && await p.locator('select[data-k^="tm-bat:ann:825:"]').inputValue() === '825', 'clear section: attendance and the break keep the person in the worksheet');
  await click(p, offButton('ann', 'lunch'));
  ok(await p.locator('.tm-tlrow[data-id="ann"]').count() === 1 && /Tap again to take off/.test(await p.locator(offButton('ann', 'lunch')).innerText()), 'Take off: the first tap only arms it, in place, and Ann is still on Lunch');
  await click(p, offButton('ann', 'lunch'));
  ok(!await p.locator('.tm-tlrow[data-id="ann"]').count() && !await p.locator('select[data-k^="tm-sec:ann:"], select[data-k^="tm-bat:ann:"]').count(), 'last service removal: the person leaves the worksheet immediately, with her section and break pickers');
  ok(await p.locator('.tm-tlgone[data-id="ann"] [data-p="tm-off-undo"]').count() === 1 && await p.evaluate(() => document.activeElement && document.activeElement.matches('[data-p="tm-off-undo"][data-id="ann"]')) && /Ann taken off Lunch\. Break 13:45 to 14:30 goes too\. Not saved yet\. Ann is not on this day now: Undo, or Add staff, puts them back\./.test(await words(p)), 'last service removal: a line with Undo stays where the row was, takes the focus and the words say what went');
  await addService(p, 'bo', 'lunch');
  ok(JSON.stringify(await lines(p, 'bo')) === '["lunch","dinner"]' && /Bo added to Lunch\. Not saved yet\./.test(await words(p)), 'Add a service: Bo joins Lunch in one pick, in time order before Dinner, and the words say so');
  await pick(p, 'bo', 'grill'); await takeOff(p, 'bo', 'lunch');
  ok(await p.locator('.tm-tlrow[data-id="bo"]').count() === 1 && !await section(p, 'bo', 'lunch').count() && JSON.stringify(await lines(p, 'bo')) === '["dinner"]' && JSON.stringify(await addable(p, 'bo')) === '["lunch"]' && await p.locator('.tm-tlrow[data-id="bo"] [data-p="tm-off-undo"]').count() === 1, 'one of several services removed: another selected service keeps the person visible and Lunch is explicitly absent (offered to add again, Undo in his row)');
  ok(!await p.locator('.tm-tlgone[data-id="ann"]').count(), 'one Undo at a time: the newer Take off replaces Ann\'s Undo line');
  ok(await section(p, 'bo', 'dinner').inputValue() === 'pans' && await p.locator('select[data-k^="tm-bat:bo:1140:"]').inputValue() === '1140', 'other service: section and break remain intact after removing Lunch');
  await takeOff(p, 'bo', 'dinner');
  ok(!await p.locator('.tm-tlrow[data-id="bo"]').count() && await p.locator('.tm-tlgone[data-id="bo"]').count() === 1, 'all services removed: the final removal drops the row even while another person is still selected');
  await click(p, '.tm-focus-toolbar [data-p="tm-add-staff"]');
  await p.locator('input[data-k="tm-quick-person:dee"]').check(); await click(p, '[data-p="tm-quick-add"]');
  ok(await expected(p, ['dee', 'sam']) && await section(p, 'dee', 'lunch').inputValue() === '', 'late Add staff: adding another person brings their row into the selected day');
  ok(JSON.stringify(await read(p)) === JSON.stringify(original) && await countReads(p) === reads && await p.evaluate(n => __fake.writes.length === n, writes), 'local filtering: membership, searching and date navigation add no database read or write');
  await click(p, '[data-p="tm-save"]'); await L.waitFor(p, k => __fake.dump()[k].v === 2, TEAM, 6000);
  const saved = await read(p);
  ok(saved.on.some(o => o.id === 'dee' && o.sh === 'lunch') && !saved.on.some(o => o.id === 'ann' || o.id === 'bo'), 'explicit Save: the existing day record publishes the retained additions and removals');
  ok(!p.errors.length, 'selected-day worksheet: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/chef', { who: 'sam', extra: fixture(), wait: 900 });
  await click(p, '[data-p="c-group"][data-g="team"]');
  const tab = p.locator('[data-p="c-tab"][data-t="plan"]'); if (await tab.getAttribute('aria-pressed') !== 'true') await tab.click(); await ready(p);
  ok(await expected(p, ['ann', 'bo', 'sam']) && !p.errors.length, 'embedded chef panel: the shared worksheet uses the same selected-day filter');
  await p.context().close();

  // on a Sunday (15 Nov 2026) tomorrow is in next week: the week arrows keep the open date list open, so its days can be
  // picked (before, Next week closed the list under the finger and hid the days it had just shown)
  const dow = new Date(L.NOW).getUTCDay(), sun = L.NOW + ((7 - dow) % 7) * 86400000, sunDay = L.ymd(new Date(sun)), mon = L.ymd(new Date(sun + 86400000));
  p = await L.open(b, '#/team', { who: 'sam', extra: fixture(), clock: sun, width: 1280, wait: 900 }); await ready(p);
  await click(p, '[data-p="tm-date-toggle"]');
  ok(await p.locator('[data-p="tm-day"][data-day="' + sunDay + '"]').isVisible() && !await p.locator('[data-p="tm-day"][data-day="' + mon + '"]').count(), 'Sunday: this week ends today, so tomorrow is not in it');
  await click(p, '[data-p="tm-week-next"]');
  ok(await p.locator('.tm-weeknav').isVisible() && await p.locator('[data-p="tm-day"][data-day="' + mon + '"]').isVisible(), 'Sunday: Next week keeps the date list open, with Monday to pick');
  await click(p, '[data-p="tm-day"][data-day="' + mon + '"]'); await ready(p);
  ok((await p.locator('[data-p="tm-date-toggle"]').innerText()).length > 0 && await p.locator('[data-p="tm-day"][aria-pressed="true"]').getAttribute('data-day') === mon, 'Sunday: tomorrow is picked from next week');
  ok(!p.errors.length, 'Sunday: no browser errors ' + p.errors.join(' | '));
  await p.context().close(); await b.close(); L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
