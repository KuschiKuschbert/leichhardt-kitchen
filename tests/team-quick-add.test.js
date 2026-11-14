// Bulk day setup and overlapping breaks use the existing dated team draft and Save.
// All people, sessions, plans and acknowledgements are the browser's Firebase stand-in.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW)), tomorrow = L.ymd(new Date(L.NOW + 86400000));
const CFG = key('config', 'main'), TEAM = key('team', today);
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true },
  { id: 'ann', name: 'Ann', role: 'staff', active: true, add: true, tick: true },
  { id: 'bo', name: 'Bo', role: 'staff', active: true, add: true, tick: true },
  { id: 'cam', name: 'Cam', role: 'staff', active: true, add: true, tick: true },
  { id: 'fn', name: 'Functions only', role: 'fnc', active: true },
  { id: 'gone', name: 'Former staff', role: 'staff', active: false }
];
const services = [
  { id: 'lunch', name: 'Lunch', from: 600, to: 900 },
  { id: 'dinner', name: 'Dinner', from: 960, to: 1320 },
  { id: 'smoker', name: 'Smoker', from: 360, to: 660 }
];
const sections = [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }, { id: 'larder', name: 'Larder' }];
const fixture = (extra = {}) => Object.assign({ [CFG]: {
  people, sousIds: ['sam'], staffIds: ['sam', 'ann', 'bo', 'cam', 'fn'],
  fnOnlyIds: ['fn'], kitShifts: services, kitSecs: sections
} }, extra);
const field = k => '[data-k="' + k + '"]';
const personCheck = id => field('tm-quick-person:' + id);
const serviceCheck = id => field('tm-quick-shift:' + id);
const click = async (p, selector) => { await p.locator(selector).first().click(); await L.settle(p, 140); };
const check = async (p, selector, checked = true) => { await p.locator(selector).setChecked(checked); await L.settle(p, 140); };
const read = (p, day = today) => p.evaluate(k => __fake.dump()[k], key('team', day));
const readCount = p => p.evaluate(() => __fake.reads.filter(k => /\/(?:team|teamsum)(?:\/|$)/.test(k)).length);
const saveOff = p => p.locator('[data-p="tm-save"]').isDisabled();
const selected = p => p.locator('[data-p="tm-day"][aria-pressed="true"]').getAttribute('data-day');
const ready = p => L.waitFor(p, () => !!document.querySelector('.tm-work [data-p="tm-whole"]'), null, 7000);
async function goDay(p, day) { await L.teamDay(p, day); await ready(p); }
async function quickOpen(p) {
  if (!await p.locator('.tm-quick-add').isVisible()) await click(p, '.tm-focus-toolbar [data-p="tm-add-staff"]');
}
async function pick(p, k, value) { await L.pick(p, 'select' + field(k), String(value)); }
const service = (p, id, sh) => pick(p, 'tm-row-sh:' + id, sh);
async function save(p, version, day = today) {
  await click(p, '[data-p="tm-save"]');
  await L.waitFor(p, ([k, v]) => (__fake.dump()[k] || {}).v === v, [key('team', day), version], 7000);
  await L.waitFor(p, () => /saved/i.test((document.querySelector('.tm-save') || {}).textContent || ''), null, 5000);
  return read(p, day);
}
const has = (rec, id, sh, sec) => !!rec && rec.on.some(o => o.id === id && o.sh === sh && (sec === undefined || o.sec === sec));
const mealStarts = rec => ['sam', 'ann', 'bo', 'cam'].map(id => rec.br.find(b => b.id === id && b.sh === 'lunch' && b.len < 150)?.at);
const spreadPlan = () => ({ day: today,
  on: people.slice(0, 4).map(p => ({ id: p.id, sh: 'lunch', sec: 'grill' })).concat([{ id: 'sam', sh: 'dinner', sec: 'pans' }]),
  br: people.slice(0, 4).map((p, i) => ({ id: p.id, sh: 'lunch', at: 840 + i * 15, len: 30 })).concat([
    { id: 'sam', sh: 'lunch', at: 630, len: 150 }, { id: 'sam', sh: 'dinner', at: 1110, len: 30 }
  ]), v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' });

(async () => {
  const browser = await L.start();
  let p = await L.open(browser, '#/team', { who: 'sam', extra: fixture(), wait: 950 }); await ready(p);
  ok(await p.locator('.tm-quick-add').count() === 1 && await p.locator(personCheck('ann')).isVisible(), 'empty day: the inline staff chooser is immediately available');
  ok(await p.locator('[data-k^="tm-quick-person:"]').count() === 4 && !await p.locator(personCheck('fn') + ', ' + personCheck('gone')).count(), 'staff choices: current kitchen staff only, without functions-only or departed people');
  ok(await p.locator('[data-k^="tm-quick-person:"]:checked').count() === 0 && await p.locator('[data-p="tm-quick-add"]').isDisabled(), 'empty day: nobody is silently scheduled and Add waits for a deliberate choice');
  ok(await p.locator('[data-k^="tm-quick-shift:"]').count() === 3 && await p.locator(serviceCheck('lunch')).isChecked() && await p.locator('[data-k^="tm-quick-shift:"]:checked').count() === 1, 'services: every configured shift is offered and only the visible current shift starts selected');
  const initialReads = await readCount(p);
  await check(p, personCheck('ann')); await check(p, personCheck('bo'));
  await check(p, serviceCheck('lunch'), false);
  ok(await p.locator('[data-p="tm-quick-add"]').isDisabled(), 'validation: picked staff without a service cannot be added');
  await check(p, serviceCheck('lunch')); await check(p, serviceCheck('dinner'));
  ok(!await p.locator('[data-p="tm-quick-add"]').isDisabled() && await saveOff(p), 'chooser selections enable Add while the plan still waits for Add before Save');
  ok(await p.evaluate(() => LK_PREP.unsaved() && LK_PREP.dirtyForUpdate()), 'chooser protection: unsent staff choices count as work before the roster is changed');
  await click(p, '[data-p="tm-quick-add"]');
  ok(!await p.locator('.tm-quick-add').isVisible() && await p.locator('[data-k^="tm-quick-person:"]:checked').count() === 0, 'Add: the chooser collapses and clears only its completed selection');
  ok(await p.locator('select' + field('tm-sec:ann')).inputValue() === '' && await p.locator('select' + field('tm-sec:bo')).inputValue() === '' && !await p.locator('select' + field('tm-sec:sam')).count() && await p.locator(personCheck('sam')).count() === 1, 'Add: only chosen people enter the worksheet; other staff stay available in the chooser');
  ok(!await saveOff(p) && !await read(p) && await readCount(p) === initialReads, 'Add is a local draft change with no database read or premature save');
  await service(p, 'ann', 'dinner'); await service(p, 'bo', 'dinner');
  ok(await p.locator('select' + field('tm-sec:ann')).inputValue() === '' && await p.locator('select' + field('tm-sec:bo')).inputValue() === '', 'multi-service add: both selected staff also join Dinner without an invented section or break');
  await pick(p, 'tm-sec:ann', 'pans');
  await service(p, 'ann', 'lunch'); await pick(p, 'tm-sec:ann', 'grill');
  const first = await save(p, 1);
  ok(first.on.length === 4 && has(first, 'ann', 'lunch', 'grill') && has(first, 'ann', 'dinner', 'pans') && has(first, 'bo', 'lunch', '') && has(first, 'bo', 'dinner', '') && !first.br.length, 'one Save persists the selected people, services and distinct sections without guessing breaks');
  await quickOpen(p); await check(p, personCheck('ann')); await check(p, personCheck('cam'));
  await click(p, '[data-p="tm-quick-add"]');
  ok(await p.locator('select' + field('tm-sec:ann')).inputValue() === 'grill' && await p.locator('select' + field('tm-sec:cam')).inputValue() === '', 'adding another group keeps an existing person\'s section while adding the new person');
  const second = await save(p, 2);
  ok(second.on.length === 5 && has(second, 'cam', 'lunch', '') && has(second, 'ann', 'dinner', 'pans'), 'repeated Add does not duplicate membership or overwrite another service');
  await p.reload(); await ready(p);
  ok((await read(p)).on.length === 5 && await p.locator('select' + field('tm-sec:ann')).inputValue() === 'grill', 'reload: the bulk-added day uses the existing persisted team record');
  ok(!p.errors.length, 'staff setup: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // Bulk membership uses the same established defaults as adding one person to a service.
  const earlierService = { day: today, on: [{ id: 'bo', sh: 'dinner', sec: 'pans' }], br: [],
    v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' };
  const hints = { day: today, days: [], usual: { [new Date(L.NOW).getDay() + '|lunch']: { ann: ['larder', 6, 8] } }, learn: {} };
  p = await L.open(browser, '#/team', { who: 'sam', extra: fixture({ [TEAM]: earlierService, [key('teamsum', 'main')]: hints }), wait: 950 }); await ready(p);
  await quickOpen(p); await check(p, personCheck('ann')); await check(p, personCheck('bo')); await click(p, '[data-p="tm-quick-add"]');
  ok(await p.locator('select' + field('tm-sec:ann')).inputValue() === 'larder' && await p.locator('select' + field('tm-sec:bo')).inputValue() === 'pans', 'known defaults: bulk Add uses this weekday/service\'s usual section, then a valid section from another service');
  ok(JSON.stringify(await read(p)) === JSON.stringify(earlierService), 'known defaults remain an unsaved draft for the chef to check');
  const hinted = await save(p, 2);
  ok(has(hinted, 'ann', 'lunch', 'larder') && has(hinted, 'bo', 'lunch', 'pans') && has(hinted, 'bo', 'dinner', 'pans') && hinted.on.length === 3, 'known defaults: explicit Save retains the existing service while publishing the checked additions');
  await p.context().close();

  // Pending chooser work is separate for each date and survives the same chef's daily/privacy lock.
  p = await L.open(browser, '#/team', { who: 'sam', extra: fixture(), deviceMode: 'shared', touch: true, wait: 950 }); await ready(p);
  await goDay(p, tomorrow); await check(p, personCheck('ann')); await check(p, serviceCheck('dinner'));
  await click(p, '.tm-batch > summary'); await pick(p, 'tm-tool-sh', 'dinner');
  ok(await p.locator(personCheck('ann')).isChecked() && await p.locator(serviceCheck('lunch')).isChecked() && await p.locator(serviceCheck('dinner')).isChecked(), 'tools service choice retains the deliberately chosen people and service group');
  await goDay(p, today);
  ok(await p.locator('[data-k^="tm-quick-person:"]:checked').count() === 0 && await p.evaluate(() => LK_PREP.unsaved() && LK_PREP.dirtyForUpdate()), 'date isolation: today has its own empty chooser while hidden tomorrow choices protect work');
  await goDay(p, tomorrow);
  ok(await p.locator(personCheck('ann')).isChecked() && await p.locator(serviceCheck('dinner')).isChecked(), 'date return: tomorrow restores its unfinished chooser without saving it');
  await goDay(p, today); await p.clock.runFor(11 * 60000); await L.settle(p, 220);
  ok(await p.evaluate(() => !LK_PREP.privateAccess() && LK_PREP.dirtyForUpdate()) && !await p.locator('.tm-quick-add').count(), 'privacy lock hides the chooser and retains the original chef\'s hidden selections');
  const name = p.locator('.p-name[data-id="sam"]');
  if (await name.count() && await name.isVisible()) { await name.click(); await L.settle(p, 100); }
  await p.fill('#pf1', '1111');
  await L.waitFor(p, () => LK_PREP.privateAccess() && LK_PREP.state.who === 'sam', null, 8000); await ready(p); await goDay(p, tomorrow);
  ok(await p.locator(personCheck('ann')).isChecked() && await p.locator(serviceCheck('dinner')).isChecked() && !await read(p, tomorrow), 'same-chef unlock restores unfinished choices on their original unsaved date');
  await click(p, '[data-p="tm-quick-add"]');
  const future = await save(p, 1, tomorrow);
  ok(has(future, 'ann', 'lunch', '') && has(future, 'ann', 'dinner', '') && !await read(p, today), 'recovered Add and Save write only the chosen future day');
  ok(!p.errors.length, 'pending chooser recovery: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // Start spacing is independent of break length, with the existing group-size and split rules retained.
  const original = spreadPlan();
  p = await L.open(browser, '#/team', { who: 'sam', extra: fixture({ [TEAM]: original }), wait: 950 }); await ready(p);
  await click(p, '.tm-batch > summary');
  await pick(p, 'tm-spfrom', '720'); await pick(p, 'tm-splen', '30'); await pick(p, 'tm-spmode', '1'); await pick(p, 'tm-spgap', '15');
  const beforeSpreadReads = await readCount(p);
  await click(p, '[data-p="tm-spread"]');
  ok(JSON.stringify(await read(p)) === JSON.stringify(original) && await readCount(p) === beforeSpreadReads, 'Spread fills only the draft and adds no read before the explicit Save');
  let rec = await save(p, 2);
  ok(JSON.stringify(mealStarts(rec)) === JSON.stringify([720, 735, 750, 765]) && rec.br.filter(b => b.sh === 'lunch' && b.len < 150).every(b => b.len === 30), 'overlap: 30-minute breaks can start every 15 minutes in chef-first order');
  ok(rec.br.some(b => b.id === 'sam' && b.sh === 'lunch' && b.at === 630 && b.len === 150) && rec.br.some(b => b.id === 'sam' && b.sh === 'dinner' && b.at === 1110 && b.len === 30), 'Spread retains existing splits and other services while replacing the selected service\'s meal breaks');
  await pick(p, 'tm-spmode', '2'); await click(p, '[data-p="tm-spread"]'); rec = await save(p, 3);
  ok(JSON.stringify(mealStarts(rec)) === JSON.stringify([720, 720, 735, 735]), 'two together: pairs share a start and the next pair starts after the selected spacing');
  await pick(p, 'tm-spmode', '0');
  ok(!await p.locator('select' + field('tm-spgap')).count() || !await p.locator('select' + field('tm-spgap')).evaluate(e => !!e.nextElementSibling && e.nextElementSibling.getClientRects().length > 0), 'all together: unused start spacing is hidden');
  await click(p, '[data-p="tm-spread"]'); rec = await save(p, 4);
  ok(JSON.stringify(mealStarts(rec)) === JSON.stringify([720, 720, 720, 720]), 'all together: every selected-service meal break starts at the chosen time');
  await pick(p, 'tm-spmode', '1'); await pick(p, 'tm-spgap', '');
  await click(p, '[data-p="tm-spread"]'); rec = await save(p, 5);
  ok(JSON.stringify(mealStarts(rec)) === JSON.stringify([720, 750, 780, 810]), 'default spacing: After previous break keeps the earlier one-after-another behaviour');
  await pick(p, 'tm-splen', '45'); await pick(p, 'tm-spgap', '15');
  await click(p, '[data-p="tm-spread"]'); rec = await save(p, 6);
  ok(JSON.stringify(mealStarts(rec)) === JSON.stringify([720, 735, 750, 765]) && rec.br.filter(b => b.sh === 'lunch' && b.len < 150).every(b => b.len === 45), 'independent controls: changing duration to 45 minutes does not change a deliberate 15-minute start spacing');
  ok(rec.on.length === original.on.length && JSON.stringify(rec.on) === JSON.stringify(original.on.slice().sort((a, b) => a.id.localeCompare(b.id) || a.sh.localeCompare(b.sh))), 'Spread never changes who is on a service or their sections');
  ok(!p.errors.length, 'overlapping breaks: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // Staff cannot reach either the bulk editor or the break-spreading controls.
  p = await L.open(browser, '#/team', { who: 'bo', extra: fixture({ [TEAM]: original }), wait: 850 });
  ok(!await p.locator('.tm-quick-add, [data-p="tm-quick-add"], [data-p="tm-spread"], [data-p="tm-save"]').count(), 'staff access: no quick-add, spread or Save controls are exposed');
  await p.context().close(); await browser.close(); L.report(R);
})().catch(e => { console.error(e.stack || e); process.exit(1); });
