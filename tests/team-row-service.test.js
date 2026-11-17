// Today's team on one clock (16 Nov 2026, docs/team-order-clear-options/brief.md, D): one row per person and one line
// per service they work, in time order. Each line's controls carry their own person, service and date (tm-sec:<id>:<sh>,
// Take off with data-sh and data-day), so a section change on one service never reaches another. One break per person
// (17 Nov 2026, docs/team-one-break-options/brief.md, D): a person's breaks sit in one break line under their day, each
// picker keyed by the person, the break's start and the date (tm-bat:<id>:<at>:<n>, tm-blen:...); + Break by the name
// (data-id and data-day, no service), "+ 2nd break" on the break line, two at most. A change to one person's break never
// reaches another person or date. The details panel and its service chips are gone. Attendance, sections, breaks and
// dated Save remain independent.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const today = L.ymd(new Date(L.NOW)), tomorrow = L.ymd(new Date(L.NOW + 86400000));
const TEAM = key('team', today), NEXT = key('team', tomorrow);
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true },
  ...['Ann', 'Bo', 'Dee'].map(name => ({ id: name.toLowerCase(), name, role: 'staff', active: true, add: true, tick: true }))
];
const shifts = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320 }];
const plan = (day, on, br = []) => ({ day, on, br, v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' });
const fixture = () => ({
  [key('config', 'main')]: { people, sousIds: ['sam'], staffIds: people.map(p => p.id), kitShifts: shifts, kitSecs: [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }] },
  [TEAM]: plan(today, [{ id: 'sam', sh: 'lunch', sec: 'pans' }, { id: 'ann', sh: 'lunch', sec: 'grill' }, { id: 'ann', sh: 'dinner', sec: 'pans' }, { id: 'bo', sh: 'dinner', sec: 'grill' }], [{ id: 'ann', sh: 'lunch', at: 825, len: 45 }, { id: 'ann', sh: 'dinner', at: 1140, len: 30 }]),
  [NEXT]: plan(tomorrow, [{ id: 'ann', sh: 'lunch', sec: 'pans' }, { id: 'sam', sh: 'dinner', sec: 'grill' }], [{ id: 'ann', sh: 'lunch', at: 840, len: 30 }])
});
const pick = (p, k, value) => L.pick(p, 'select[data-k="' + k + '"]', String(value));
const value = (p, k) => p.locator('select[data-k="' + k + '"]').inputValue();
const click = async (p, s) => { await p.locator(s).click(); await L.settle(p, 160); };
const read = (p, path = TEAM) => p.evaluate(k => __fake.dump()[k], path);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const words = p => p.locator('.tm-save').innerText().then(t => t.replace(/\s+/g, ' '));
const off = (id, sh) => '[data-p="tm-off"][data-id="' + id + '"][data-sh="' + sh + '"]';
const line = (id, sh) => '.tm-person-row[data-id="' + id + '"] .tm-tlsvc[data-sh="' + sh + '"]';
const trigger = (p, k) => p.locator('select[data-k="' + k + '"]').locator('xpath=following-sibling::*[1]');
const focusOn = (p, s) => p.evaluate(s => document.activeElement === document.querySelector(s), s);
// a person's nth break picker in the order of their day: its key carries the break's start, so look it up each time
const brk = (p, id, n, kind) => L.brKey(p, id, n, kind);
const brValue = async (p, id, n) => { const k = await brk(p, id, n); return k ? value(p, k) : null; };
const breaks = p => p.locator('select[data-k^="tm-bat:"]').evaluateAll(l => l.map(e => e.dataset.k.split(':').slice(0, 3).join(':') + '=' + e.value));
async function ready(p) { await L.waitFor(p, () => document.querySelectorAll('select[data-k^="tm-sec:"]').length > 0, null, 7000); }
async function day(p, d) { await L.teamDay(p, d); await ready(p); }
async function takeOff(p, id, sh) { await click(p, off(id, sh)); await click(p, off(id, sh)); }
// Every control in a person's service line names that person, that service and the date in view: the key, data-sh,
// data-day and a select's id (the shared picker finds a held choice's box again by that id, js/controls.js liveSource).
// Since 17 Nov 2026 a service line holds its section and Take off only; the break controls are the person's (ownBreaks)
const ownLines = (p, d) => p.locator('.tm-tlsvc').evaluateAll((lines, d) => lines.length > 0 && lines.every(x => {
  const id = x.closest('.tm-person-row').dataset.id, sh = x.dataset.sh;
  const selects = [...x.querySelectorAll('select[data-k^="tm-sec:"]')], buttons = [...x.querySelectorAll('[data-p="tm-off"]')];
  return selects.length === 1 && buttons.length === 1 && !x.querySelector('[data-p="tm-addbr"], select[data-k^="tm-bat:"], select[data-k^="tm-blen:"]') && selects.every(e => { const k = e.dataset.k.split(':'); return k[1] === id && k[2] === sh && e.dataset.sh === sh && e.dataset.day === d && e.id === 'tm-choice-' + encodeURIComponent(d) + '-' + encodeURIComponent(sh) + '-' + encodeURIComponent(e.dataset.k); }) &&
    buttons.every(e => e.dataset.id === id && e.dataset.sh === sh && e.dataset.day === d);
}), d);
// Every break control in a row names that person and the date in view, and no service: the pickers in the row's break
// line (key, data-day and id, with no service in it) and + Break or + 2nd break (data-id, data-day, no data-sh)
const ownBreaks = (p, d) => p.locator('.tm-person-row').evaluateAll((rows, d) => rows.length > 0 && rows.every(r => {
  const id = r.dataset.id, picks = [...r.querySelectorAll('select[data-k^="tm-bat:"], select[data-k^="tm-blen:"]')], adds = [...r.querySelectorAll('[data-p="tm-addbr"]')];
  return picks.every(e => e.dataset.k.split(':')[1] === id && e.dataset.day === d && !e.dataset.sh && !!e.closest('.tm-brline') && e.id === 'tm-choice-' + encodeURIComponent(d) + '--' + encodeURIComponent(e.dataset.k)) &&
    adds.length <= 1 && adds.every(e => e.dataset.id === id && e.dataset.day === d && !e.hasAttribute('data-sh'));
}), d);

(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/team', { who: 'sam', extra: fixture(), width: 1280, wait: 900 }); await ready(p);
  await L.teamWarm(p, tomorrow, ready);   // tomorrow's week read first: on a Sunday it is next week
  const original = await read(p), nextOriginal = await read(p, NEXT), board = await p.locator('.tm-away').innerText();
  const reads = await p.evaluate(() => __fake.reads.length), writes = await p.evaluate(() => __fake.writes.length);
  ok(await p.locator('.tm-person-row').count() === 3 && !await p.locator('select[data-k^="tm-row-sh:"]').count() && await p.locator('select[data-k="tm-sec:ann:lunch"]').count() === 1 && await p.locator('select[data-k="tm-sec:ann:dinner"]').count() === 1 && !await p.locator('[data-p="tm-sh"], [data-p="tm-focus"], .tm-detail-workbench').count(), 'rows: every service a person works has its own section picker, with no Service to edit switch, service chips or details panel');
  ok(!await p.locator(line('bo', 'lunch')).count() && !await p.locator('select[data-k="tm-sec:bo:lunch"]').count() && !await p.locator('.tm-grid-off').count() && await value(p, 'tm-sec:bo:dinner') === 'grill' && await p.locator('select[data-k="tm-addsvc:bo"] option[value="lunch"]').innerText() === 'Lunch 10:00 to 15:00', 'actual service: Dinner-only Bo has no Lunch line or Off cell, his own Dinner section, and Lunch offered in Add a service with its hours');
  ok(!await p.locator('.tm-person-row[data-id="dee"]').count() && await p.locator('input[data-k="tm-quick-person:dee"]').count() === 1, 'selected date: unselected people remain in Add staff only');
  ok(await p.locator('.tm-grid-head').innerText().then(t => /Lunch[\s\S]*10:00 to 15:00[\s\S]*Dinner[\s\S]*16:00 to 22:00/.test(t)), 'service heads: each service names its hours, in time order');
  // was: Ann's details opened on Lunch, the service on now. Both lines show, in time order, each with its own controls
  ok(same(await p.locator('.tm-person-row[data-id="ann"] .tm-tlsvc').evaluateAll(es => es.map(e => e.dataset.sh)), ['lunch', 'dinner']) && await ownLines(p, today), 'own lines: Ann\'s Lunch then Dinner, and every service line control carries its own person, service and date');
  ok(await ownBreaks(p, today) && same(await breaks(p), ['tm-bat:ann:825=825', 'tm-bat:ann:1140=1140']) && await p.locator('.tm-person-row[data-id="ann"] .tm-brline').count() === 1, 'own breaks: Ann\'s two breaks sit in one break line under her day, each picker named for her and the date, never a service');
  // was: choosing a details service was view only. There is nothing to choose before editing, and opening drafts nothing
  ok(same(await read(p), original) && await p.evaluate(n => __fake.writes.length === n, writes) && await p.locator('[data-p="tm-save"]').isDisabled(), 'no view state: the rows open with no draft write or Save work');
  // was: Ann's Dinner break picker named her and Dinner. A break belongs to her day now: it names her and its place
  ok(await p.locator('select[data-k="tm-bat:ann:1140:0"]').getAttribute('aria-label') === '2nd break for Ann' && await value(p, 'tm-bat:ann:1140:0') === '1140' && await p.locator('select[data-k="tm-blen:ann:1140:0"]').getAttribute('aria-label') === 'How long, 2nd break for Ann', 'named controls: Ann\'s 2nd break pickers name her and the break, with its dated time');
  await pick(p, 'tm-bat:ann:1140:0', '1155');
  ok(/Ann: 2nd break 19:15 to 19:45\. Not saved yet\./.test(await words(p)) && await brk(p, 'ann', 1) === 'tm-bat:ann:1155:0', 'break change: the words say Ann\'s 2nd break and its new time, unsaved');
  await pick(p, 'tm-sec:ann:dinner', 'grill');
  // was: service isolation (Lunch kept its own break after Dinner edits). Now: a person isolation, the first break and
  // both sections stay, and nobody else gains a break
  ok(await brValue(p, 'ann', 0) === '825' && await value(p, 'tm-sec:ann:lunch') === 'grill' && await value(p, 'tm-sec:ann:dinner') === 'grill' && await brValue(p, 'ann', 1) === '1155' && same(await breaks(p), ['tm-bat:ann:825=825', 'tm-bat:ann:1155=1155']), 'person isolation: Ann\'s first break and both sections stay after her 2nd break and Dinner edits; nobody else gains a break');
  await pick(p, 'tm-bat:ann:825:0', '855'); await pick(p, 'tm-sec:ann:lunch', '');
  ok(await value(p, 'tm-sec:ann:lunch') === '' && await brValue(p, 'ann', 0) === '855' && await p.locator(off('ann', 'lunch')).count() === 1 && await brValue(p, 'ann', 1) === '1155', 'No section: membership and the edited break remain present, and the 2nd break keeps its own time');
  ok(await p.locator('.tm-away').innerText() === board && same(await read(p), original), 'saved board: unsaved break edits never replace today\'s acknowledged current breaks');
  // was: the editor moved into Ann's row on a phone. Nothing moves now: a resize keeps the focused picker's own node
  await trigger(p, 'tm-bat:ann:855:0').focus();
  await p.evaluate(() => { window.__teamPicker = document.activeElement; });
  await p.setViewportSize({ width: 390, height: 844 }); await L.settle(p, 220);
  ok(await p.evaluate(() => document.activeElement === window.__teamPicker && window.__teamPicker.isConnected && document.querySelector('.tm-person-row[data-id="ann"] .tm-brline').contains(window.__teamPicker)) && await value(p, 'tm-bat:ann:855:0') === '855', 'responsive rows: a phone width keeps the focused break picker, its node and its draft in Ann\'s break line');
  await p.fill('[data-k="tm-q"]', 'Bo'); await L.settle(p, 180);
  ok(await p.locator('.tm-person-row').count() === 1 && await p.locator('.tm-person-row[data-id="bo"]').count() === 1, 'mobile search: a name finds only that person\'s row');
  await p.fill('[data-k="tm-q"]', 'Grill'); await L.settle(p, 180);
  ok(JSON.stringify(await p.locator('.tm-person-row').evaluateAll(es => es.map(e => e.dataset.id).sort())) === JSON.stringify(['ann', 'bo']), 'search: a section on any service finds the person (Ann\'s Dinner, Bo\'s Dinner)');
  await L.clear(p, '[data-k="tm-q"]'); await L.waitFor(p, () => document.querySelectorAll('.tm-person-row').length === 3, null, 6000);
  ok(await p.locator('select[data-k="tm-bat:ann:855:0"]').count() === 1 && await value(p, 'tm-bat:ann:855:0') === '855' && await brValue(p, 'ann', 1) === '1155', 'mobile search clear: search hides rows, never drafts; each field is back once');
  // was: opening Bo's Breaks kept his row in place. Now the first tap on Take off redraws the page: the row stays put
  await p.locator(off('bo', 'dinner')).evaluate(e => window.scrollBy(0, e.getBoundingClientRect().top - 450)); await L.settle(p, 120);   // clear of the Save dock, as a finger sees it
  const before = await p.locator(off('bo', 'dinner')).evaluate(e => e.getBoundingClientRect().top), sy = await p.evaluate(() => Math.round(scrollY));
  await click(p, off('bo', 'dinner'));
  const after = await p.locator(off('bo', 'dinner')).evaluate(e => e.getBoundingClientRect().top);
  ok(Math.abs(after - before) <= 4 && await p.locator(off('bo', 'dinner')).innerText() === 'Tap again to take off' && await p.locator(line('bo', 'dinner')).count() === 1, 'phone: arming Take off Dinner keeps Bo\'s row where the finger is and changes nothing yet (' + Math.round(before) + ' to ' + Math.round(after) + ', scrolled ' + sy + ')');
  await click(p, off('bo', 'dinner'));
  ok(await p.locator('.tm-person-row.tm-tlgone[data-id="bo"] [data-p="tm-off-undo"][data-id="bo"]').count() === 1 && !await p.locator('select[data-k^="tm-sec:bo:"]').count() && /Bo taken off Dinner\. Not saved yet\. Bo is not on this day now: Undo, or Add staff, puts them back\./.test(await words(p)), 'last service: Bo\'s row becomes the Undo line, and the words say he is not on this day now');
  // was: the moved break control stayed visible above Save. Now the focus moves to Undo, which must be reachable there
  ok(await focusOn(p, '[data-p="tm-off-undo"][data-id="bo"]') && await p.evaluate(() => { const e = document.activeElement, r = e.getBoundingClientRect(), dock = document.querySelector('.tm-focus-save').getBoundingClientRect(), nav = document.querySelector('.tabbar').getBoundingClientRect(), bottom = Math.min(innerHeight, dock.top, nav.top), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return r.top >= 0 && r.bottom <= bottom + .5 && (hit === e || e.contains(hit)); }), 'phone focus: Undo takes the focus, fully visible and reachable above Save and phone navigation');
  await click(p, '[data-p="tm-off-undo"][data-id="bo"]');
  ok(await value(p, 'tm-sec:bo:dinner') === 'grill' && !await p.locator('.tm-tlgone').count() && /Undone: Bo is back on Dinner with their section and breaks\. Not saved yet\./.test(await words(p)) && await focusOn(p, off('bo', 'dinner')), 'Undo: Bo is back on Dinner with his section, and the focus is on Take off Dinner');
  await p.setViewportSize({ width: 1280, height: 844 }); await L.settle(p, 220);
  // "responsive editor: laptop restores the single editor beside the grid" is gone: no editor moves between widths
  await pick(p, 'tm-addsvc:bo', 'lunch');
  ok(await value(p, 'tm-sec:bo:lunch') === 'grill' && /Bo added to Lunch\. Not saved yet\./.test(await words(p)), 'explicit Add: one Add a service pick puts Bo on Lunch with his section from his other service');
  await pick(p, 'tm-sec:bo:lunch', 'pans');
  await takeOff(p, 'bo', 'lunch');
  ok(await p.locator('.tm-person-row[data-id="bo"]').count() === 1 && !await p.locator('select[data-k="tm-sec:bo:lunch"]').count() && await value(p, 'tm-sec:bo:dinner') === 'grill', 'explicit removal: Take off Lunch keeps Bo in the list with his Dinner section intact');
  // A quick second tap where + Break was: the first tap gives Sam a break and the button leaves the spot by his name
  // (+ 2nd break sits at the end of his break line now), so the second lands on the name block and adds nothing
  const addSam = '.tm-person-row[data-id="sam"] .tm-braddwho [data-p="tm-addbr"][data-id="sam"]', spot = await p.locator(addSam).boundingBox();
  await p.mouse.click(spot.x + spot.width / 2, spot.y + spot.height / 2); await p.mouse.click(spot.x + spot.width / 2, spot.y + spot.height / 2); await L.settle(p, 200);
  ok(await p.locator('select[data-k^="tm-bat:sam:"]').count() === 1 && !await p.locator(addSam).count() && await p.locator('.tm-person-row[data-id="sam"] .tm-brline [data-p="tm-addbr"]').innerText() === '+ 2nd break', 'quick second tap: + Break by Sam\'s name gives one break; the second tap on the same spot adds no second');
  await pick(p, await brk(p, 'sam', 0), '');   // No break: Sam's break goes again
  ok(!await p.locator('select[data-k^="tm-bat:sam:"]').count() && /Sam: break \d\d:\d\d taken away\. Not saved yet\./.test(await words(p)), 'No break: Sam\'s break goes, said by name');
  // A picker held open while its break goes with its service: Ann's 2nd break (19:15) sits only in Dinner, so Take off
  // Dinner takes it, said by name. The held choice finds no break with that start and date, so it reaches nothing, not
  // her first break; Undo then puts back the 2nd break as it was
  await trigger(p, 'tm-bat:ann:1155:0').click(); await L.settle(p, 200);
  const held = await p.locator('dialog.ux-picker').count() === 1;
  await p.evaluate(s => { document.querySelector(s).click(); document.querySelector(s).click(); }, off('ann', 'dinner')); await L.settle(p, 200);
  const offWords = await words(p);
  await p.locator('.ux-picker [data-index]').filter({ hasText: '2nd break 20:00' }).first().click(); await L.settle(p, 200);
  ok(held && /Ann taken off Dinner\. Break 19:15 to 19:45 goes too\. Not saved yet\./.test(offWords) && !await p.locator(line('ann', 'dinner')).count() && same(await breaks(p), ['tm-bat:ann:855=855']), 'held picker: a 2nd break time chosen after its break went with Dinner reaches no other break (' + offWords + ')');
  await click(p, '[data-p="tm-off-undo"][data-id="ann"]');
  ok(await brValue(p, 'ann', 1) === '1155' && await value(p, 'tm-sec:ann:dinner') === 'grill', 'held picker: Undo puts back Ann\'s 2nd break at 19:15, not the held choice');
  // The keyboard: with one break, + 2nd break at the end of the break line adds Ann's second and the focus moves to its
  // time, the next thing to choose. Her first break is untouched; there is then no + Break for a third.
  await pick(p, 'tm-bat:ann:1155:0', '');   // No break: Ann has one break, so + 2nd break shows
  await p.focus('.tm-person-row[data-id="ann"] .tm-brline [data-p="tm-addbr"]'); await p.keyboard.press('Enter'); await L.settle(p, 200);
  const kbNew = await brk(p, 'ann', 1);
  ok(await p.evaluate(k => { const s = document.querySelector('select[data-k="' + k + '"]'); return !!s && document.activeElement === s._uxTrigger; }, kbNew) && await brValue(p, 'ann', 0) === '855' && !await p.locator('[data-p="tm-addbr"][data-id="ann"]').count(), 'keyboard + 2nd break: the new break takes the focus on its time, the first is untouched, and there is no third (' + kbNew + ')');
  await pick(p, kbNew, '1155');   // the keyboard check's break back to 19:15, as the 2nd break was
  // was: Whole day review linked to Ann's Dinner. The row is the whole day: its sentence says her hours and both breaks
  const annDay = await p.locator('.tm-person-row[data-id="ann"] .tm-roster-time').innerText();
  ok(/Lunch 10:00 to 15:00, Dinner 16:00 to 22:00/.test(annDay) && /Break 14:15 to 15:00/.test(annDay) && /2nd break 19:15 to 19:45/.test(annDay), 'whole day: Ann\'s row says both services and both unsaved breaks (' + annDay + ')');
  await day(p, tomorrow);
  ok(await value(p, 'tm-sec:ann:lunch') === 'pans' && !await p.locator('select[data-k="tm-sec:ann:dinner"]').count() && await value(p, 'tm-sec:sam:dinner') === 'grill' && await ownLines(p, tomorrow) && await ownBreaks(p, tomorrow) && same(await breaks(p), ['tm-bat:ann:840=840']), 'dated view: another date starts from its own actual memberships and breaks, and its controls carry that date');
  await pick(p, 'tm-addsvc:ann', 'dinner'); await pick(p, 'tm-sec:ann:dinner', 'grill');
  await day(p, today);
  ok(await value(p, 'tm-sec:ann:lunch') === '' && await value(p, 'tm-sec:ann:dinner') === 'grill' && await value(p, 'tm-sec:bo:dinner') === 'grill' && await ownLines(p, today) && await ownBreaks(p, today), 'dated return: each date restores its own sections');
  ok(await value(p, 'tm-sec:ann:dinner') === 'grill' && same(await breaks(p), ['tm-bat:ann:855=855', 'tm-bat:ann:1155=1155']), 'dated return: Ann\'s unsaved breaks and Dinner section survive another date\'s edits');
  ok(same(await read(p, NEXT), nextOriginal) && await p.locator('.tm-away').innerText() === board && await p.evaluate(n => __fake.reads.length === n, reads), 'bounded views: loaded date, person and service navigation preserve saved board/data and add no reads');
  await p.evaluate(() => { __fake.mode = 'hold'; }); await click(p, '[data-p="tm-save"]');
  const heldWrites = await p.evaluate(() => __fake.writes.length);
  ok(/Saving/.test(await p.locator('[data-p="tm-save"]').innerText()) && await p.locator('.tm-away').innerText() === board, 'held Save: pending draft never appears acknowledged on the saved board');
  await L.tap(p, '[data-p="tm-save"]'); await L.settle(p, 160);
  ok(await p.evaluate(n => __fake.writes.length === n, heldWrites), 'repeat Save: a second activation cannot queue another version while acknowledgement waits');
  await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); });
  await L.waitFor(p, k => __fake.dump()[k].v === 2 && /saved/i.test(document.querySelector('.tm-save').innerText) && !/Saving/.test(document.querySelector('[data-p="tm-save"]').innerText), TEAM, 6000);
  const saved = await read(p);
  ok(saved.on.some(x => x.id === 'ann' && x.sh === 'lunch' && x.sec === '') && saved.on.some(x => x.id === 'ann' && x.sh === 'dinner' && x.sec === 'grill') && saved.br.some(x => x.id === 'ann' && x.sh === 'lunch' && x.at === 855) && saved.br.some(x => x.id === 'ann' && x.sh === 'dinner' && x.at === 1155) && !saved.br.some(x => x.at === 1200) && !saved.on.some(x => x.id === 'bo' && x.sh === 'lunch'), 'acknowledged Save: one dated record contains both breaks, each on the service that holds it, both service drafts and No section membership');
  ok(/Still no section: Ann Lunch\./.test(await p.locator('.tm-save').innerText()), 'Save words: the dated message names the service still without a section (' + (await p.locator('.tm-save').innerText()).replace(/\s+/g, ' ') + ')');
  ok(same(await read(p, NEXT), nextOriginal) && saved.v === 2, 'dated Save: today publishes once without sending another date\'s retained work');
  await day(p, tomorrow);
  ok(await value(p, 'tm-sec:ann:dinner') === 'grill' && !await p.locator('[data-p="tm-save"]').isDisabled(), 'other date draft: today\'s acknowledgement preserves tomorrow\'s unsaved work');
  ok(!p.errors.length, 'row journeys: no browser errors ' + p.errors.join(' | '));
  await p.context().close();
  // Midnight changes the operational date; 04:00 separately removes this device's authority.
  const cutoff = Date.parse(today + 'T04:00:00+10:00');
  const locked = await L.open(b, '#/team', { who: 'sam', extra: fixture(), deviceMode: 'personal', clock: cutoff - 60000, wait: 900 }); await ready(locked);
  await pick(locked, 'tm-bat:ann:1140:0', '1155');
  await locked.clock.fastForward(90000); await L.waitFor(locked, () => !LK_PREP.privateAccess() && !!LK_PREP.workLock(), null, 8000);
  ok(!await locked.locator('.tm-tlrow, select[data-k^="tm-sec:"], select[data-k^="tm-bat:"], [data-p="tm-off"], [data-p="tm-addbr"]').count() && await locked.evaluate(() => LK_PREP.dirtyForUpdate() && LK_PREP.workLock().person === 'sam'), '04:00: the private rows hide while the original chef retains the unsaved draft');
  const samePerson = locked.locator('.p-name[data-id="sam"]'); if (await samePerson.count() && await samePerson.isVisible()) await samePerson.click();
  await locked.fill('#pf1', '1111'); await L.waitFor(locked, () => LK_PREP.privateAccess() && LK_PREP.state.who === 'sam', null, 8000); await ready(locked);
  ok(await value(locked, 'tm-bat:ann:1155:0') === '1155' && await value(locked, 'tm-bat:ann:825:0') === '825' && await locked.locator('select[data-k="tm-bat:ann:1155:0"]').getAttribute('data-day') === today, '04:00 recovery: the same chef PIN restores Ann\'s exact unsaved 2nd break beside her first');
  ok((await read(locked)).v === 1 && !locked.errors.length, '04:00 recovery: no draft is automatically saved and no browser errors occur ' + locked.errors.join(' | '));
  await locked.context().close(); await b.close(); L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
