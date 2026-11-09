// A worksheet shows the people selected for its date, across every configured service.
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
const ids = p => p.locator('.tm-person-row').evaluateAll(es => es.map(e => e.dataset.id).sort());
const expected = (p, list) => ids(p).then(xs => JSON.stringify(xs) === JSON.stringify(list.slice().sort()));
const section = (p, id) => p.locator('select[data-k="tm-sec:' + id + '"]');
const pick = (p, id, value) => L.pick(p, 'select[data-k="tm-sec:' + id + '"]', value);
const service = (p, id, sh) => L.pick(p, 'select[data-k="tm-row-sh:' + id + '"]', sh);
const click = async (p, selector) => { await p.locator(selector).click(); await L.settle(p, 140); };
const read = p => p.evaluate(k => __fake.dump()[k], TEAM);
const countReads = p => p.evaluate(() => __fake.reads.filter(k => /\/(team|teamsum)(\/|$)/.test(k)).length);
async function ready(p) { await L.waitFor(p, () => !!document.querySelector('.tm-work [data-p="tm-whole"]'), null, 7000); }
async function details(p, id) { if (!await p.locator('.tm-detail-workbench[data-id="' + id + '"]').count()) await click(p, '[data-p="tm-focus"][data-id="' + id + '"]'); }
async function membership(p, id, sh) { await service(p, id, sh); await details(p, id); await click(p, '[data-p="tm-on"][data-id="' + id + '"][data-sh="' + sh + '"]'); }
async function day(p, date) { if (!await p.locator('.tm-weeknav').isVisible()) await click(p, '[data-p="tm-date-toggle"]'); await click(p, '[data-p="tm-day"][data-day="' + date + '"]'); await ready(p); }

(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/team', { who: 'sam', extra: fixture(), wait: 900 }); await ready(p);
  const original = await read(p), reads = await countReads(p), writes = await p.evaluate(() => __fake.writes.length);
  ok(await expected(p, ['ann', 'bo', 'sam']), 'day membership: only people on an active configured service appear in the worksheet');
  ok(await p.locator('select[data-k="tm-row-sh:bo"]').inputValue() === 'dinner' && await section(p, 'bo').inputValue() === 'pans' && await p.locator('.tm-person-row[data-id="bo"]').isVisible(), 'day membership: Dinner-only Bo starts on his actual Dinner service and section');
  ok(await p.locator('input[data-k="tm-quick-person:dee"]').count() === 1 && !await p.locator('.tm-person-row[data-id="dee"]').count(), 'Add staff: an unselected person remains available in the chooser rather than the worksheet');
  await p.fill('[data-k="tm-q"]', 'Dee'); await L.settle(p, 160);
  ok(await p.locator('.tm-person-row').count() === 0 && /No people match/.test(await p.locator('.tm-people').innerText()), 'search: typing an unselected name cannot reveal an unscheduled worksheet row');
  await L.clear(p, '[data-k="tm-q"]'); await L.waitFor(p, () => !!document.querySelector('.tm-person-row[data-id="ann"]'), null, 6000);
  await day(p, tomorrow);
  ok(await expected(p, ['dee']), 'date isolation: tomorrow shows only its own selected people');
  await day(p, today); await L.waitFor(p, () => !!document.querySelector('.tm-person-row[data-id="ann"]'), null, 6000);
  ok(await expected(p, ['ann', 'bo', 'sam']), 'date return: today restores its own day membership without another date leaking in');
  await pick(p, 'ann', '');
  await details(p, 'ann');
  ok(await expected(p, ['ann', 'bo', 'sam']) && await section(p, 'ann').inputValue() === '' && await p.locator('select[data-k="tm-at:ann:0"]').inputValue() === '825', 'clear section: attendance and the break keep the person in the worksheet');
  await membership(p, 'ann', 'lunch');
  ok(!await p.locator('.tm-person-row[data-id="ann"]').count(), 'last service removal: the person leaves the worksheet immediately');
  await membership(p, 'bo', 'lunch'); await pick(p, 'bo', 'grill'); await membership(p, 'bo', 'lunch');
  ok(await p.locator('.tm-person-row[data-id="bo"]').count() === 1 && await section(p, 'bo').isDisabled() && await p.locator('[data-p="tm-on"][data-id="bo"][data-sh="lunch"]').getAttribute('aria-pressed') === 'false', 'one of several services removed: another selected service keeps the person visible and Lunch is explicitly absent');
  await service(p, 'bo', 'dinner');
  ok(await section(p, 'bo').inputValue() === 'pans' && await p.locator('select[data-k="tm-at:bo:0"]').inputValue() === '1140', 'other service: section and break remain intact after removing Lunch');
  await membership(p, 'bo', 'dinner');
  ok(!await p.locator('.tm-person-row[data-id="bo"]').count(), 'all services removed: the final removal drops the row even while another person is still selected');
  await click(p, '.tm-focus-toolbar [data-p="tm-add-staff"]');
  await p.locator('input[data-k="tm-quick-person:dee"]').check(); await click(p, '[data-p="tm-quick-add"]');
  ok(await expected(p, ['dee', 'sam']) && await section(p, 'dee').inputValue() === '', 'late Add staff: adding another person brings their row into the selected day');
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
  await p.context().close(); await b.close(); L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
