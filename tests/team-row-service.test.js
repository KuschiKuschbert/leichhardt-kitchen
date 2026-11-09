// Service to edit is view state. Attendance, sections, breaks and dated Save remain independent.
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
const pane = p => p.locator('.tm-detail-workbench[data-id]');
async function ready(p) { await L.waitFor(p, () => document.querySelectorAll('select[data-k^="tm-row-sh:"]').length > 0, null, 7000); }
async function day(p, d) { if (!await p.locator('.tm-weeknav').isVisible()) await click(p, '[data-p="tm-date-toggle"]'); await click(p, '[data-p="tm-day"][data-day="' + d + '"]'); await ready(p); }
async function focus(p, id) { await click(p, '[data-p="tm-focus"][data-id="' + id + '"]'); }

(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/team', { who: 'sam', extra: fixture(), width: 1280, wait: 900 }); await ready(p);
  const original = await read(p), nextOriginal = await read(p, NEXT), board = await p.locator('.tm-away').innerText();
  const reads = await p.evaluate(() => __fake.reads.length), writes = await p.evaluate(() => __fake.writes.length);
  ok(await p.locator('.tm-person-row').count() === 3 && await p.locator('select[data-k^="tm-row-sh:"]').count() === 3 && !await p.locator('[data-p="tm-sh"]:not([data-id])').count(), 'row context: every selected person has one Service to edit and no global roster service tabs');
  ok(await value(p, 'tm-row-sh:bo') === 'dinner' && await value(p, 'tm-sec:bo') === 'grill', 'actual service: Dinner-only person starts on Dinner with their own section');
  ok(!await p.locator('.tm-person-row[data-id="dee"]').count() && await p.locator('input[data-k="tm-quick-person:dee"]').count() === 1, 'selected date: unselected people remain in Add staff only');
  await pick(p, 'tm-row-sh:ann', 'dinner');
  ok(await value(p, 'tm-sec:ann') === 'pans' && await value(p, 'tm-row-sh:sam') === 'lunch' && await value(p, 'tm-sec:sam') === 'pans', 'view only: Ann Dinner does not change Sam context or either section');
  ok(same(await read(p), original) && await p.evaluate(n => __fake.writes.length === n, writes) && await p.locator('[data-p="tm-save"]').isDisabled(), 'view only: selecting another service creates no draft write or Save work');
  await focus(p, 'ann');
  ok(await pane(p).count() === 1 && await pane(p).getAttribute('data-sh') === 'dinner' && /Ann.*Dinner/.test(await pane(p).innerText()) && (await pane(p).getAttribute('aria-label')).includes('Dinner') && await value(p, 'tm-at:ann:0') === '1140', 'named focus: one real editor identifies Ann Dinner and its dated break');
  await pick(p, 'tm-at:ann:0', '1155'); await pick(p, 'tm-sec:ann', 'grill');
  await pick(p, 'tm-row-sh:ann', 'lunch');
  ok(await value(p, 'tm-at:ann:0') === '825' && await value(p, 'tm-sec:ann') === 'grill' && await pane(p).getAttribute('data-sh') === 'lunch', 'service isolation: Lunch keeps its original section and break after a Dinner draft edit');
  await pick(p, 'tm-at:ann:0', '855'); await pick(p, 'tm-sec:ann', '');
  ok(await value(p, 'tm-sec:ann') === '' && await value(p, 'tm-at:ann:0') === '855' && await p.locator('[data-p="tm-on"][data-id="ann"][data-sh="lunch"]').getAttribute('aria-pressed') === 'true', 'No section: membership and the edited break remain present');
  ok(await p.locator('.tm-away').innerText() === board && same(await read(p), original), 'saved board: unsaved break edits never replace today\'s acknowledged current breaks');
  // The real enhanced picker and its focused source travel with the same editor DOM node.
  await p.locator('select[data-k="tm-at:ann:0"]').locator('xpath=following-sibling::*[1]').focus();
  const resizeContext = await p.evaluate(() => { window.__teamEditor = document.querySelector('.tm-detail-workbench[data-id]'); return document.activeElement.getAttribute('aria-label'); });
  await p.setViewportSize({ width: 390, height: 844 }); await L.settle(p, 220);
  ok(await p.evaluate(() => window.__teamEditor === document.querySelector('.tm-detail-workbench[data-id]') && document.querySelector('.tm-person-row[data-id="ann"]').contains(window.__teamEditor)) && await value(p, 'tm-at:ann:0') === '855', 'responsive editor: the same DOM editor moves inline without losing a break draft');
  ok(await p.evaluate(label => document.activeElement.getAttribute('aria-label') === label, resizeContext), 'responsive focus: moving the editor retains the focused labelled break control');
  ok(await p.evaluate(() => { const e = document.activeElement, r = e.getBoundingClientRect(), dock = document.querySelector('.tm-focus-save').getBoundingClientRect(), nav = document.querySelector('.tabbar').getBoundingClientRect(), bottom = Math.min(innerHeight, dock.top, nav.top), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return r.top >= 0 && r.bottom <= bottom + .5 && (hit === e || e.contains(hit)); }), 'responsive focus: the moved break control remains fully visible and reachable above Save and phone navigation');
  await p.fill('[data-k="tm-q"]', 'Bo'); await L.settle(p, 180);
  ok(await p.locator('.tm-person-row').count() === 1 && await p.locator('.tm-person-row[data-id="bo"]').count() === 1 && await pane(p).count() === 1 && await pane(p).getAttribute('data-id') === 'ann' && await value(p, 'tm-at:ann:0') === '855', 'mobile search: matching another person retains the sole named editor and its unsaved break');
  await L.clear(p, '[data-k="tm-q"]'); await L.waitFor(p, () => document.querySelectorAll('.tm-person-row').length === 3, null, 6000);
  ok(await p.locator('.tm-person-row[data-id="ann"] .tm-detail-workbench').count() === 1 && await p.locator('select[data-k="tm-at:ann:0"]').count() === 1 && await value(p, 'tm-at:ann:0') === '855', 'mobile search clear: the retained editor returns inline once without duplicate fields');
  await p.setViewportSize({ width: 1280, height: 844 }); await L.settle(p, 220);
  ok(await p.evaluate(() => window.__teamEditor === document.querySelector('.tm-detail-workbench[data-id]') && !document.querySelector('.tm-person-row[data-id="ann"]').contains(window.__teamEditor)) && await p.locator('select[data-k="tm-at:ann:0"]').count() === 1, 'responsive editor: laptop restores the same single editor beside the roster');
  await pick(p, 'tm-row-sh:bo', 'lunch'); await focus(p, 'bo');
  ok(await p.locator('select[data-k="tm-sec:bo"]').isDisabled() && !await p.locator('select[data-k="tm-sec:bo"] option[value="__off"]').count() && /Not on Lunch/.test(await p.locator('.tm-person-row[data-id="bo"]').innerText()), 'off service: view alone exposes explicit absence and a disabled section, not a No section removal option');
  await click(p, '[data-p="tm-on"][data-id="bo"][data-sh="lunch"]'); await pick(p, 'tm-sec:bo', 'pans');
  await click(p, '[data-p="tm-on"][data-id="bo"][data-sh="lunch"]');
  ok(await p.locator('.tm-person-row[data-id="bo"]').count() === 1 && await p.locator('select[data-k="tm-sec:bo"]').isDisabled(), 'explicit removal: removing Lunch preserves a Dinner-selected person in the day roster');
  await pick(p, 'tm-row-sh:bo', 'dinner');
  ok(await value(p, 'tm-sec:bo') === 'grill', 'explicit removal: Bo Dinner section survives Lunch add/edit/remove');
  await click(p, '[data-p="tm-whole"]');
  const wholeLink = p.locator('[data-p="tm-sh"][data-id="ann"][data-v="dinner"]');
  ok(await wholeLink.count() === 1, 'Whole day: actual Ann Dinner membership exposes a named person/service edit action');
  await wholeLink.click(); await L.settle(p, 160);
  ok(await value(p, 'tm-row-sh:ann') === 'dinner' && await pane(p).getAttribute('data-id') === 'ann' && await pane(p).getAttribute('data-sh') === 'dinner' && await value(p, 'tm-at:ann:0') === '1155', 'Whole day edit: targets the named Ann Dinner context and retained draft instead of changing other row views');
  await pick(p, 'tm-row-sh:ann', 'lunch'); await focus(p, 'bo');
  await day(p, tomorrow);
  ok(await value(p, 'tm-row-sh:ann') === 'lunch' && await value(p, 'tm-sec:ann') === 'pans' && await value(p, 'tm-row-sh:sam') === 'dinner', 'dated view: another date starts from its own actual memberships');
  await pick(p, 'tm-row-sh:ann', 'dinner'); await focus(p, 'ann'); await click(p, '[data-p="tm-on"][data-id="ann"][data-sh="dinner"]'); await pick(p, 'tm-sec:ann', 'grill');
  await day(p, today);
  ok(await value(p, 'tm-row-sh:ann') === 'lunch' && await value(p, 'tm-sec:ann') === '' && await value(p, 'tm-row-sh:bo') === 'dinner' && await pane(p).getAttribute('data-id') === 'bo', 'dated return: each person view, focused person and unsaved sections restore only for that date');
  await pick(p, 'tm-row-sh:ann', 'dinner'); await focus(p, 'ann');
  ok(await value(p, 'tm-sec:ann') === 'grill' && await value(p, 'tm-at:ann:0') === '1155', 'dated return: other-service unsaved break and section survive another date\'s edits');
  ok(same(await read(p, NEXT), nextOriginal) && await p.locator('.tm-away').innerText() === board && await p.evaluate(n => __fake.reads.length === n, reads), 'bounded views: loaded date, person and service navigation preserve saved board/data and add no reads');
  await p.evaluate(() => { __fake.mode = 'hold'; }); await click(p, '[data-p="tm-save"]');
  const heldWrites = await p.evaluate(() => __fake.writes.length);
  ok(/Saving/.test(await p.locator('[data-p="tm-save"]').innerText()) && await p.locator('.tm-away').innerText() === board, 'held Save: pending draft never appears acknowledged on the saved board');
  await L.tap(p, '[data-p="tm-save"]'); await L.settle(p, 160);
  ok(await p.evaluate(n => __fake.writes.length === n, heldWrites), 'repeat Save: a second activation cannot queue another version while acknowledgement waits');
  await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); });
  await L.waitFor(p, k => __fake.dump()[k].v === 2 && /saved/i.test(document.querySelector('.tm-save').innerText) && !/Saving/.test(document.querySelector('[data-p="tm-save"]').innerText), TEAM, 6000);
  const saved = await read(p);
  ok(saved.on.some(x => x.id === 'ann' && x.sh === 'lunch' && x.sec === '') && saved.on.some(x => x.id === 'ann' && x.sh === 'dinner' && x.sec === 'grill') && saved.br.some(x => x.id === 'ann' && x.sh === 'lunch' && x.at === 855) && saved.br.some(x => x.id === 'ann' && x.sh === 'dinner' && x.at === 1155), 'acknowledged Save: one dated record contains both independent service drafts and No section membership');
  ok(same(await read(p, NEXT), nextOriginal) && saved.v === 2, 'dated Save: today publishes once without sending another date\'s retained work');
  await day(p, tomorrow);
  ok(await value(p, 'tm-row-sh:ann') === 'dinner' && await value(p, 'tm-sec:ann') === 'grill' && !await p.locator('[data-p="tm-save"]').isDisabled(), 'other date draft: today\'s acknowledgement preserves tomorrow\'s independent view and unsaved work');
  ok(!p.errors.length, 'row service journeys: no browser errors ' + p.errors.join(' | '));
  await p.context().close();
  // Midnight changes the operational date;04:00 separately removes this device's authority.
  const cutoff = Date.parse(today + 'T04:00:00+10:00');
  const locked = await L.open(b, '#/team', { who: 'sam', extra: fixture(), deviceMode: 'personal', clock: cutoff - 60000, wait: 900 }); await ready(locked);
  await pick(locked, 'tm-row-sh:ann', 'dinner'); await focus(locked, 'ann'); await pick(locked, 'tm-at:ann:0', '1155');
  await locked.clock.fastForward(90000); await L.waitFor(locked, () => !LK_PREP.privateAccess() && !!LK_PREP.workLock(), null, 8000);
  ok(!await locked.locator('.tm-detail-workbench,select[data-k^="tm-row-sh:"]').count() && await locked.evaluate(() => LK_PREP.dirtyForUpdate() && LK_PREP.workLock().person === 'sam'), '04:00: private row contexts and details hide while the original chef retains the unsaved draft');
  const samePerson = locked.locator('.p-name[data-id="sam"]'); if (await samePerson.count() && await samePerson.isVisible()) await samePerson.click();
  await locked.fill('#pf1', '1111'); await L.waitFor(locked, () => LK_PREP.privateAccess() && LK_PREP.state.who === 'sam', null, 8000); await ready(locked);
  ok(await value(locked, 'tm-row-sh:ann') === 'dinner' && await pane(locked).getAttribute('data-id') === 'ann' && await value(locked, 'tm-at:ann:0') === '1155', '04:00 recovery: the same chef PIN restores the named Dinner editor and exact unsaved break');
  ok((await read(locked)).v === 1 && !locked.errors.length, '04:00 recovery: no draft is automatically saved and no browser errors occur ' + locked.errors.join(' | '));
  await locked.context().close(); await b.close(); L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
