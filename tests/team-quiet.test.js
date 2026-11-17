// Today's team on one clock (16 Nov 2026, docs/team-order-clear-options/brief.md, D): each person is one row with a line
// per service worked, and each line holds its own section picker and Take off; the last line ends with Add a service.
// One break per person (17 Nov 2026, docs/team-one-break-options/brief.md, D): a person's breaks belong to their whole
// day, in one break line under their day (tm-bat:<id>:<at>:<n>, tm-blen:...), + Break by the name while they have none,
// "+ 2nd break" at the end of the line while they have one. No details panel, no Breaks link, no Whole day review. A
// quiet repaint (the minute, the clock, the window coming back) never rebuilds a control, its value or its focus.
// All people, plans, PIN sessions and failures below use the browser's Firebase stand-in.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW)), tomorrow = L.ymd(new Date(L.NOW + 86400000));
const CFG = key('config', 'main'), TEAM = key('team', today);
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true },
  { id: 'ann', name: 'Ann', role: 'head', active: true, add: true, tick: true, del: true },
  { id: 'bo', name: 'Bo', role: 'staff', active: true, add: true, tick: true }
];
const shifts = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320 }];
const sections = [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }, { id: 'larder', name: 'Larder' }];
const plan = day => ({ day, on: [{ id: 'ann', sh: 'lunch', sec: 'grill' }, { id: 'ann', sh: 'dinner', sec: 'pans' }, { id: 'bo', sh: 'lunch', sec: 'larder' }, { id: 'bo', sh: 'dinner', sec: 'larder' }, { id: 'sam', sh: 'lunch', sec: 'pans' }, { id: 'sam', sh: 'dinner', sec: 'grill' }],
  br: [{ id: 'ann', sh: 'lunch', at: 825, len: 45 }, { id: 'ann', sh: 'dinner', at: 1140, len: 30 }, { id: 'sam', sh: 'lunch', at: 870, len: 30 }, { id: 'sam', sh: 'dinner', at: 1140, len: 150 }],
  v: 1, by: 'sam', at: L.NOW - 3600000, upd: L.NOW - 3600000 });
const fixture = () => ({ [CFG]: { people, headId: 'ann', sousIds: ['sam', 'ann'], staffIds: ['sam', 'ann', 'bo'], kitShifts: shifts, kitSecs: sections }, [TEAM]: plan(today), [key('team', tomorrow)]: plan(tomorrow) });
const fullDate = d => new Date(d + 'T12:00:00+10:00').toLocaleDateString('en-AU', { timeZone: 'Australia/Brisbane', weekday: 'long', day: 'numeric', month: 'long' });
const click = async (p, s) => { await p.locator(s).first().click(); await L.settle(p, 150); };
const field = k => 'select[data-k="' + k + '"]';
const value = (p, k) => p.locator(field(k)).inputValue();
const words = p => p.locator('.tm-save').innerText().then(t => t.replace(/\s+/g, ' '));
const saved = p => p.evaluate(k => __fake.dump()[k], TEAM);
const readCount = p => p.evaluate(() => __fake.reads.filter(k => /\/(team|teamsum)(\/|$)/.test(k)).length);
const off = (id, sh) => '[data-p="tm-off"][data-id="' + id + '"][data-sh="' + sh + '"]';
// + Break (by the name) or + 2nd break (on the break line): one per person, no service in it since 17 Nov 2026
const addBreak = id => '[data-p="tm-addbr"][data-id="' + id + '"]';
// a person's nth break picker in the order of their day (its key carries the break's start, so look it up each time)
const brk = (p, id, n, kind) => L.brKey(p, id, n, kind);
const brValue = async (p, id, n, kind) => { const k = await brk(p, id, n, kind); return k ? value(p, k) : null; };
const line = (id, sh) => '.tm-person-row[data-id="' + id + '"] .tm-tlsvc[data-sh="' + sh + '"]';
// the picker button that stands in for a row select (the select itself is hidden by js/controls.js)
const trigger = (p, k) => p.locator(field(k)).locator('xpath=following-sibling::*[1]');
const focusOn = (p, s) => p.evaluate(s => document.activeElement === document.querySelector(s), s);
const focusOnPicker = (p, k) => p.evaluate(k => { const s = document.querySelector('select[data-k="' + k + '"]'); return !!s && document.activeElement === s._uxTrigger; }, k);
// a page with rows, or the staff chooser on an empty day: either way the dated Save is drawn
async function ready(p) { await L.waitFor(p, () => !!document.querySelector('.tm-work [data-p="tm-save"]'), null, 7000); }
// Take off is two taps in place: the first only arms it and says so
async function takeOff(p, id, sh) {
  await click(p, off(id, sh));
  const armed = await p.locator(off(id, sh)).innerText() === 'Tap again to take off' && await p.locator(line(id, sh)).count() === 1;
  await click(p, off(id, sh));
  return armed;
}
async function chefPlan(p) { await click(p, '[data-p="c-group"][data-g="team"]'); const tab = p.locator('[data-p="c-tab"][data-t="plan"]'); if (await tab.getAttribute('aria-pressed') !== 'true') await tab.click(); await ready(p); }
async function day(p, d) { await L.teamDay(p, d); await ready(p); }
async function assertQuiet(p, label) {
  const roster = await p.locator('.tm-people').evaluateAll(lists => lists.map(e => ({ names: [...e.querySelectorAll('.tm-person-name')].map(n => n.textContent), open: e.querySelectorAll('details[open]').length, text: e.innerText })));
  ok(roster.length === 1 && roster[0].names.slice().sort().join() === 'Ann,Bo,Sam' && roster[0].open === 0, label + ': one collapsed roster contains each person once');
  ok(roster.length === 1 && people.every(x => (roster[0].text.match(new RegExp(x.name, 'g')) || []).length === 1) && !/Choose a section/.test(roster[0].text), label + ': collapsed rows avoid repeated names and repeated assignment instructions');
  ok(await p.locator('.tm-worksheet').count() === 1 && !await p.locator('[data-p="tm-section"], [data-p="tm-assign"]').count(), label + ': one person worksheet replaces global section-selection mode');
  ok(await p.locator('.tm-person-row').evaluateAll((es, day) => es.length === 3 && es.every(e => { const sections = [...e.querySelectorAll('select[data-k^="tm-sec:"]')], services = e.querySelectorAll('select[data-k^="tm-row-sh:"]'); return sections.length === 2 && !services.length && sections.map(x => x.dataset.k.split(':')[2]).join() === 'lunch,dinner' && sections.every(x => !x.closest('details') && !x.querySelector('option[value="__off"]') && !!x.querySelector('option[value=""]') && x.closest('.tm-tlsvc').dataset.sh === x.dataset.k.split(':')[2] && x.dataset.day === day); }), today), label + ': each person has one section picker per service they work, on that service\'s own line with its date, no Service to edit switch, and a distinct no-section choice');
  // was: every service line held its own Take off and + Break. Since 17 Nov 2026 a service line holds its Take off only;
  // the person's breaks sit in one break line under their day, keyed to them and the date, and + Break sits by the name
  // of someone with no break (Bo here; Ann and Sam have two each, so neither has + 2nd break). Nothing else opens.
  ok(await p.locator('.tm-details, .tm-detail-workbench, [data-p="tm-focus"], [data-p="tm-whole"], [data-p="tm-sh"]').count() === 0 && await p.locator('.tm-person-row').evaluateAll((es, day) => es.length === 3 && es.every(e => {
    const lines = [...e.querySelectorAll('.tm-tlsvc')], id = e.dataset.id, picks = [...e.querySelectorAll('select[data-k^="tm-bat:"], select[data-k^="tm-blen:"]')], adds = [...e.querySelectorAll('[data-p="tm-addbr"]')];
    return lines.map(x => x.dataset.sh).join() === 'lunch,dinner' && lines.every(x => {
      const name = x.dataset.sh === 'lunch' ? 'Lunch' : 'Dinner', offs = x.querySelectorAll('[data-p="tm-off"]');
      return offs.length === 1 && !x.querySelector('[data-p="tm-addbr"], select[data-k^="tm-bat:"]') && offs[0].dataset.id === id && offs[0].dataset.sh === x.dataset.sh && offs[0].dataset.day === day && offs[0].textContent === 'Take off ' + name;
    }) && picks.every(x => x.dataset.k.split(':')[1] === id && x.dataset.day === day && !!x.closest('.tm-brline')) &&
      (id === 'bo' ? !picks.length && adds.length === 1 && !!adds[0].closest('.tm-braddwho') && adds[0].textContent === '+ Break' && adds[0].dataset.id === id && adds[0].dataset.day === day && !adds[0].hasAttribute('data-sh') : picks.length === 4 && !adds.length);
  }), today) && !await p.locator('select[data-k^="tm-addsvc:"]').count(), label + ': every service line holds its own Take off for that person, service and date; each person\'s breaks sit in their own break line with the date; + Break by the name of someone with none; nothing opens; no Add a service while everyone is on every service');
  ok(await p.locator('[data-p="tm-save"]').count() === 1 && await p.locator('[data-p="tm-save"]').innerText() === 'Save ' + fullDate(today) && await p.evaluate(() => {
    const roster = document.querySelector('.tm-people'), save = document.querySelector('.tm-focus-save'), book = document.querySelector('.tm-notebook');
    return !!save && !!book && book.contains(save) && !!(roster.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING) && !!save.querySelector('[data-p="tm-save"]');
  }), label + ': the single dated Save follows the roster within the notebook save area');
}

async function layouts(p, label) {
  for (const width of [390, 768, 1280]) for (const size of ['normal', 'xlarge']) {
    await p.setViewportSize({ width, height: 900 }); await p.evaluate(s => document.documentElement.dataset.text = s, size); await L.settle(p, 150);
    // the row's own buttons (Take off, + Break) and its pickers replaced the Breaks link: every one a 44 px target
    const small = await p.locator('.tm-tlsvc .ux-picker-trigger, .tm-brline .ux-picker-trigger, [data-p="tm-off"], [data-p="tm-addbr"], .tm-weeknav button, [data-p="tm-date-toggle"], [data-p="tm-save"], .tm-batch > summary').evaluateAll(es => es.filter(e => e.getClientRects().length).map(e => ({ label: e.textContent.trim(), w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height })).filter(e => e.w < 43.5 || e.h < 43.5));
    ok(!await L.overflow(p) && !small.length, label + ' ' + width + ' ' + size + ': no sideways page scroll and visible planner controls remain 44 px ' + JSON.stringify(small));
    // was: one roster and one contextual workbench. The workbench is gone: the one roster spans the notebook
    if (width === 1280 && size === 'normal') ok(await p.locator('.tm-nbook').evaluate(e => { const work = e.querySelector('.tm-focus-grid'), spine = e.querySelector('.tm-nspine'); return !!work && e.querySelectorAll('.tm-worksheet').length === 1 && e.querySelectorAll('.tm-people').length === 1 && !e.querySelector('.tm-detail-workbench') && work.getBoundingClientRect().width >= e.getBoundingClientRect().width - 60 && (!spine || getComputedStyle(spine).display === 'none'); }), label + ': desktop writing region spans the notebook with one roster and no separate workbench');
  }
}

(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/team', { who: 'sam', extra: fixture(), wait: 1000 }); await ready(p);
  await assertQuiet(p, 'Direct sous-chef');
  ok(await value(p, 'tm-sec:ann:lunch') === 'grill' && await value(p, 'tm-sec:ann:dinner') === 'pans' && /Break 13:45 to 14:30/.test(await p.locator('.tm-person-row[data-id="ann"] .tm-roster-time').innerText()), 'collapsed row: the current section and planned break remain legible');
  await L.teamWarm(p, tomorrow, ready);   // tomorrow's week read first: on a Sunday it is next week
  const reads = await readCount(p), original = await saved(p);
  await L.pick(p, field('tm-sec:ann:lunch'), 'pans');
  ok(await value(p, 'tm-sec:ann:lunch') === 'pans' && await value(p, 'tm-sec:ann:dinner') === 'pans' && await brValue(p, 'ann', 0) === '825' && !await p.locator('.tm-detail-workbench').count(), 'section move: the Lunch picker changes only Lunch in the draft and opens nothing');
  await L.pick(p, field('tm-sec:ann:lunch'), '');
  ok(await value(p, 'tm-sec:ann:lunch') === '' && await brValue(p, 'ann', 0) === '825' && await p.locator(off('ann', 'lunch')).count() === 1, 'clear section: attendance and the break are retained');
  // "Edit breaks: only the selected person opens" is gone with the panel: every row holds its breaks (assertQuiet above)
  await L.pick(p, field(await brk(p, 'ann', 0)), '840');
  ok(await brk(p, 'ann', 0) === 'tm-bat:ann:840:0' && await brValue(p, 'ann', 0) === '840' && await brValue(p, 'ann', 1) === '1140' && await brValue(p, 'sam', 0) === '870', 'row picker: an actual break-time choice changes only Ann\'s first break in the draft');
  await L.pick(p, field('tm-sec:ann:lunch'), 'grill');
  ok(await brValue(p, 'ann', 0) === '840', 'section redraw: the unfinished break edit survives');
  // was: a service chip showed Ann's Dinner, then each line its own break. Since 17 Nov 2026 the breaks are the
  // person's: Ann's 2nd break and section stay beside her first break edit, and Sam's breaks are untouched
  ok(await value(p, 'tm-sec:ann:dinner') === 'pans' && await brValue(p, 'ann', 1) === '1140' && await brValue(p, 'sam', 0) === '870' && await brValue(p, 'sam', 1) === '1140', 'both breaks: Ann\'s 2nd break and Dinner section stay beside her first break edit, and Sam\'s breaks are untouched');
  ok(await brValue(p, 'sam', 1, 'blen') === '150' && /^Split 19:00/.test(await p.locator(field(await brk(p, 'sam', 1))).evaluate(e => e.selectedOptions[0].textContent)), 'Dinner: the original long split remains available in Sam\'s controls');
  // "service return" is gone: there is no service view to return to
  await day(p, tomorrow);
  ok(await brValue(p, 'ann', 0) === '825' && await p.locator('.tm-people select[data-day]').evaluateAll((es, d) => es.length > 0 && es.every(e => e.dataset.day === d), tomorrow), 'date switch: another date starts from its own plan, and every row picker carries that date');
  await L.pick(p, field(await brk(p, 'ann', 0)), '855');
  await day(p, today);
  ok(await brValue(p, 'ann', 0) === '840' && await value(p, 'tm-sec:ann:lunch') === 'grill', 'date return: today\'s break draft is restored, not tomorrow\'s');
  await day(p, tomorrow);
  ok(await brValue(p, 'ann', 0) === '855', 'second date return: the future date restores only its own draft');
  await day(p, today);
  ok(await takeOff(p, 'bo', 'lunch'), 'Take off: the first tap only arms Take off Lunch, in place, and says Tap again');
  ok(!await p.locator(field('tm-sec:bo:lunch')).count() && !await p.locator(line('bo', 'lunch')).count() && await value(p, 'tm-sec:bo:dinner') === 'larder' && /Bo taken off Lunch\. Not saved yet\./.test(await words(p)) && await p.locator(field('tm-addsvc:bo') + ' option[value="lunch"]').innerText() === 'Lunch 10:00 to 15:00', 'explicit removal: Take off Lunch changes only that membership; Lunch has no line and is offered in Add a service');
  ok(await focusOn(p, '[data-p="tm-off-undo"][data-id="bo"]'), 'Take off: the focus moves to Undo');

  // The minute and the clock repaint quietly: every control in every row, Bo's Add a service and his Undo included,
  // keeps its node, its value and the focus. The clock moving on proves the paint ran.
  await trigger(p, await brk(p, 'ann', 0)).focus();
  const clockBefore = await p.locator('.tm-nclock').innerText();
  await p.evaluate(() => { window.__quietNodes = [...document.querySelectorAll('.tm-people li, .tm-people select, .tm-people button')]; window.__quietValues = __quietNodes.map(e => e.value + '|' + e.textContent); window.__quietFocus = document.activeElement; });
  const kinds = await p.evaluate(() => ['tm-sec:', 'tm-bat:', 'tm-blen:', 'tm-addsvc:bo'].map(k => __quietNodes.some(e => (e.dataset.k || '').startsWith(k))).concat(['tm-off', 'tm-addbr', 'tm-off-undo'].map(a => __quietNodes.some(e => e.dataset.p === a))));
  await p.clock.fastForward(60000); await L.settle(p, 180);
  const tick = await p.evaluate(() => { const now = [...document.querySelectorAll('.tm-people li, .tm-people select, .tm-people button')]; return { same: now.length === __quietNodes.length && now.every((e, i) => e === __quietNodes[i] && e.isConnected), values: __quietNodes.every((e, i) => e.value + '|' + e.textContent === __quietValues[i]), focus: document.activeElement === __quietFocus }; });
  ok(kinds.every(Boolean) && await p.locator('.tm-nclock').innerText() !== clockBefore && Object.values(tick).every(Boolean), 'minute tick: the clock moves on while every row control (section, break and Add a service pickers, + Break, Take off, Undo) keeps its node, value and focus ' + JSON.stringify({ kinds, tick }));

  await p.fill('[data-k="tm-q"]', 'Ann'); await L.settle(p, 300);
  await p.evaluate(() => { const q = document.querySelector('[data-k="tm-q"]'); q.focus(); q.setSelectionRange(1, 2); window.__quietSearch = q; window.__quietRow = [...document.querySelectorAll('.tm-person-row[data-id="ann"], .tm-person-row[data-id="ann"] select, .tm-person-row[data-id="ann"] button')]; });
  await p.clock.fastForward(60000); await L.settle(p, 180);
  ok(await p.evaluate(() => __quietRow.length > 8 && __quietRow.every(e => e.isConnected) && document.querySelector('.tm-person-row[data-id="ann"]') === __quietRow[0]), 'minute tick: Ann\'s found row keeps its exact DOM nodes');
  await p.evaluate(() => dispatchEvent(new Event('focus'))); await L.settle(p, 180);
  const clockState = await p.evaluate(() => ({ focus: document.activeElement === __quietSearch, search: document.querySelector('[data-k="tm-q"]') === __quietSearch, value: __quietSearch.value === 'Ann', selection: __quietSearch.selectionStart === 1 && __quietSearch.selectionEnd === 2, row: __quietRow.every(e => e.isConnected), rows: document.querySelectorAll('.tm-person-row').length === 1 }));
  ok(Object.values(clockState).every(Boolean), 'clock paint: typing, focus, selection, the actual search node and the found row are retained ' + JSON.stringify(clockState));
  await p.setViewportSize({ width: 768, height: 900 }); await L.settle(p, 150);
  ok(await brValue(p, 'ann', 0) === '840' && await value(p, 'tm-sec:ann:lunch') === 'grill', 'resize: the row and its draft remain intact');
  // the shared search keeps its results for an empty draft: its clear button shows everyone again
  await L.clear(p, '[data-k="tm-q"]'); await L.waitFor(p, () => document.querySelectorAll('.tm-person-row').length === 3, null, 6000);
  ok(await p.locator('[data-p="tm-off-undo"][data-id="bo"]').count() === 1 && await p.locator(field('tm-addsvc:bo')).count() === 1, 'search cleared: Bo\'s Undo and Add a service are still where his Lunch line was');
  await L.pick(p, field('tm-addsvc:bo'), 'lunch');
  // was: Add Lunch kept the person focused in the panel. Now one pick puts the service back, with the words
  ok(await value(p, 'tm-sec:bo:lunch') === 'larder' && await value(p, 'tm-sec:bo:dinner') === 'larder' && !await p.locator(field('tm-addsvc:bo')).count() && /Bo added to Lunch\. Not saved yet\./.test(await words(p)), 'explicit Add: one Add a service pick puts Lunch back with Bo\'s known section');

  // Take off Lunch: Ann's first break (14:00 to 14:45) sits only in Lunch, so it goes with it, said by name; her 2nd
  // break (19:00, Dinner) stays and is now her only one
  ok(await takeOff(p, 'ann', 'lunch') && !await p.locator(field('tm-sec:ann:lunch')).count() && await brk(p, 'ann', 0) === 'tm-bat:ann:1140:0' && !await brk(p, 'ann', 1) && /Ann taken off Lunch\. Break 14:00 to 14:45 goes too\. Not saved yet\./.test(await words(p)), 'explicit removal: Take off Lunch removes that service and the break inside it, by name');
  ok(await value(p, 'tm-sec:ann:dinner') === 'pans' && await brValue(p, 'ann', 0) === '1140', 'inline removal: Dinner and its meal break remain unchanged');
  await click(p, '[data-p="tm-off-undo"][data-id="ann"]');
  ok(await value(p, 'tm-sec:ann:lunch') === 'grill' && await brValue(p, 'ann', 0) === '840' && await brValue(p, 'ann', 0, 'blen') === '45' && /Undone: Ann is back on Lunch with their section and breaks\. Not saved yet\./.test(await words(p)) && await focusOn(p, off('ann', 'lunch')), 'Undo: Lunch returns with its section and the unsaved 14:00 break; the focus goes back to Take off Lunch');
  await takeOff(p, 'ann', 'lunch'); await L.pick(p, field('tm-addsvc:ann'), 'lunch'); await L.pick(p, field('tm-sec:ann:lunch'), 'grill');
  ok(await brk(p, 'ann', 0) === 'tm-bat:ann:1140:0' && !await brk(p, 'ann', 1) && await p.locator('.tm-person-row[data-id="ann"] .tm-brline ' + addBreak('ann')).innerText() === '+ 2nd break', 'Add a service: Lunch comes back without the break that went; Ann has one break and + 2nd break at the end of her break line');
  await click(p, addBreak('ann'));
  const added2 = await brk(p, 'ann', 0);
  ok(await brk(p, 'ann', 1) === 'tm-bat:ann:1140:0' && /^tm-bat:ann:\d+:0$/.test(added2) && await focusOnPicker(p, added2) && !await p.locator(addBreak('ann')).count(), '+ 2nd break: the new break takes the focus on its time, the next thing to choose, and Ann has no third');
  await L.pick(p, field(await brk(p, 'ann', 0)), '840'); await L.pick(p, field(await brk(p, 'ann', 0, 'blen')), '45');
  await takeOff(p, 'ann', 'lunch');
  ok(!await p.locator(line('ann', 'lunch')).count() && await brk(p, 'ann', 0) === 'tm-bat:ann:1140:0' && !await brk(p, 'ann', 1), 'membership removal: removing Lunch also removes the break inside Lunch');
  ok(await value(p, 'tm-sec:ann:dinner') === 'pans' && await brValue(p, 'ann', 0) === '1140', 'membership removal: the person\'s other shift and break remain intact');
  // was: Whole day review. The row is the whole day: its sentence says the hours and breaks of every service worked
  const annDay = await p.locator('.tm-person-row[data-id="ann"] .tm-roster-time').innerText();
  ok(/Dinner/.test(annDay) && !/Lunch/.test(annDay) && /Break 19:00 to 19:30/.test(annDay) && await p.locator(field('tm-addsvc:ann') + ' option[value="lunch"]').count() === 1, 'whole day: Ann\'s row reviews attendance across shifts (' + annDay + ')');
  ok(await readCount(p) === reads && JSON.stringify(await saved(p)) === JSON.stringify(original), 'local work: rows, assignment, dates, shifts, Take off, Undo, resize and clock add no reads or writes');
  await p.evaluate(() => { __fake.mode = 'hold'; }); await click(p, '[data-p="tm-save"]');
  const rowHeld = await p.evaluate(() => ['[data-p="tm-off"][data-id="ann"]', '[data-p="tm-addbr"][data-id="ann"]', 'select[data-k="tm-addsvc:ann"]', 'select[data-k="tm-sec:ann:dinner"]', 'select[data-k="tm-bat:ann:1140:0"]'].every(s => { const e = document.querySelector(s); return !!e && e.disabled; }));
  await p.focus('[data-k="tm-q"]');
  await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); });
  await L.waitFor(p, k => __fake.dump()[k].v === 2, TEAM, 6000); await L.settle(p, 150);
  ok(rowHeld && await p.locator('.tm-person-row[data-id="ann"]').count() === 1 && await p.evaluate(() => document.activeElement.matches('[data-k="tm-q"]')), 'Save acknowledgement: the row controls are off while pending; the rows and enabled search focus survive the confirmed redraw');
  ok(!(await saved(p)).on.some(x => x.id === 'ann' && x.sh === 'lunch') && (await saved(p)).br.some(x => x.id === 'ann' && x.sh === 'dinner' && x.at === 1140) && (await saved(p)).on.some(x => x.id === 'bo' && x.sh === 'lunch' && x.sec === 'larder') && /saved/i.test(await p.locator('.tm-save').innerText()), 'dated Save: the one shared Save publishes membership and preserves the other shift\'s break');
  ok(!p.errors.length, 'editing journey: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // An empty day can add several people and services together, before individual worksheet corrections.
  const empty = fixture(); delete empty[TEAM];
  p = await L.open(b, '#/team', { who: 'sam', extra: empty, wait: 900 }); await ready(p);
  const quickPerson = id => 'input[data-k="tm-quick-person:' + id + '"]';
  const quickShift = sh => 'input[data-k="tm-quick-shift:' + sh + '"]';
  ok(!await p.locator('.tm-person-row').count() && await p.locator(quickPerson('ann')).isVisible() && await p.locator('[data-p="tm-quick-add"]').isDisabled(), 'empty day: staff selection replaces a blank worksheet and Add requires a person');
  ok(await p.locator(quickShift('lunch')).isChecked() && !await p.locator(quickShift('dinner')).isChecked(), 'empty day: the currently selected service is preselected explicitly');
  const emptyReads = await readCount(p), emptyWrites = await p.evaluate(() => __fake.writes.length);
  await p.locator(quickPerson('ann')).check(); await p.locator(quickPerson('bo')).check(); await p.locator(quickShift('dinner')).check();
  await click(p, '[data-p="tm-quick-add"]');
  ok(await p.locator('.tm-person-row').count() === 2 && await value(p, 'tm-sec:ann:lunch') === '' && await value(p, 'tm-sec:bo:lunch') === '' && !await p.locator('select[data-k^="tm-sec:sam:"]').count() && await p.locator(quickPerson('sam')).count() === 1, 'bulk Add: selected staff enter Lunch together while unselected people stay in the chooser');
  await L.pick(p, field('tm-sec:ann:lunch'), 'grill');
  ok(await value(p, 'tm-sec:ann:dinner') === '' && await value(p, 'tm-sec:bo:dinner') === '', 'bulk Add: both selected people are also on the explicitly chosen Dinner service');
  await L.pick(p, field('tm-sec:ann:dinner'), 'pans'); await click(p, addBreak('ann'));
  await L.pick(p, field(await brk(p, 'ann', 0)), '1140'); await L.pick(p, field(await brk(p, 'ann', 0, 'blen')), '45');
  // was: Whole day review. Ann's row says the day: both services, their sections and the Dinner break
  const addedDay = await p.locator('.tm-person-row[data-id="ann"]').innerText();
  ok(/Lunch/.test(addedDay) && /Grill/.test(addedDay) && /Dinner/.test(addedDay) && /Pans/.test(addedDay) && /Break 19:00 to 19:45/.test(addedDay), 'bulk Add: sections and a break remain editable after the quick membership step');
  ok(await readCount(p) === emptyReads && await p.evaluate(n => __fake.writes.length === n, emptyWrites) && !await saved(p), 'bulk Add: names, services, sections and breaks remain one local draft until Save');
  await click(p, '[data-p="tm-save"]'); await L.waitFor(p, k => !!__fake.dump()[k], TEAM, 6000);
  const added = await saved(p);
  ok(added.on.length === 4 && added.on.every(o => ['ann', 'bo'].includes(o.id) && o.sec !== '__off') && added.br.some(x => x.id === 'ann' && x.sh === 'dinner' && x.at === 1140 && x.len === 45), 'bulk Add Save: one dated record persists only the chosen people, both services and the corrected break');
  ok(!await p.locator('.tm-quick-add').isVisible() && await p.locator('.tm-focus-toolbar [data-p="tm-add-staff"]').isVisible(), 'nonempty day: adding another group remains discoverable through the labelled Add staff control');
  ok(!p.errors.length, 'bulk Add: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // The shared page must stay quiet in both chefs' actual entry points and at supported sizes.
  for (const route of ['#/team', '#/chef']) for (const who of ['sam', 'ann']) {
    p = await L.open(b, route, { who, extra: fixture(), wait: 900 });
    if (route === '#/chef') await chefPlan(p); else await ready(p);
    const label = route + ' ' + who;
    await assertQuiet(p, label);
    await layouts(p, label);
    // was: the keyboard opened the named workbench without moving focus. Now Enter on Take off Dinner arms it and the
    // focus stays on that same button, so a second Enter takes Ann off Dinner, never another service
    await p.focus(off('ann', 'dinner')); await p.keyboard.press('Enter'); await L.settle(p, 150);
    const focusName = () => p.evaluate(() => document.activeElement.getAttribute('aria-label') || document.activeElement.textContent.trim());
    const armedFocus = await focusOn(p, off('ann', 'dinner')) && await p.locator(off('ann', 'dinner')).innerText() === 'Tap again to take off', armedOn = await focusName();
    await p.keyboard.press('Enter'); await L.settle(p, 150);
    ok(armedFocus && !await p.locator(line('ann', 'dinner')).count() && await p.locator(line('ann', 'lunch')).count() === 1 && await brValue(p, 'ann', 0) === '825' && await focusOn(p, '[data-p="tm-off-undo"][data-id="ann"]'), label + ': keyboard Take off Dinner stays on its own button and takes Ann off Dinner only (focus after the first Enter: ' + armedOn + '; then: ' + await focusName() + ')');
    ok(!p.errors.length && await p.evaluate(() => !__fake.refused.length), label + ': no browser errors or refused reads');
    await p.context().close();
  }
  p = await L.open(b, '#/admin', { admin: true, who: '', extra: fixture(), adminPage: '', wait: 1200 });
  await p.evaluate(() => location.hash = '#/team'); await ready(p);
  await assertQuiet(p, 'Verified admin entry'); await layouts(p, 'Verified admin entry');
  ok(await p.evaluate(() => LK_PREP.privateAccess() && !__fake.refused.length) && !p.errors.length, 'verified admin: the daily head PIN session and device grant can use the shared planner');
  await p.context().close();
  p = await L.open(b, '#/team', { who: 'bo', extra: fixture(), wait: 900 });
  const editors = '.tm-tlrow, .tm-person-section, [data-p="tm-save"], [data-p="tm-off"], [data-p="tm-addbr"], select[data-k^="tm-addsvc:"]';
  ok(!await p.locator(editors + ', .tm-weeknav').count(), 'staff: direct entry exposes no planner or edit controls');
  await p.evaluate(() => location.hash = '#/chef'); await L.settle(p, 300);
  ok(!await p.locator(editors + ', [data-p="c-tab"][data-t="plan"]').count() && !p.errors.length, 'staff: the chef route cannot expose the Plan editor');
  await p.context().close();
  await b.close(); L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
