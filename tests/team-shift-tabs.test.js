// Row service display order must not change configured defaults or the shared day draft.
const L = require('./lib');
const { R, ok } = L.results();
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const day = L.ymd(new Date(L.NOW)), CFG = key(['config', 'main']), TEAM = key(['team', day]);
const shifts = [
  { id: 'dinner', name: 'DINNER service', from: 960, to: 1320 },
  { id: 'smoker', name: 'Smoker', from: 600, to: 1320 },
  { id: 'lunch', name: 'lUnCh service', from: 600, to: 900 },
  { id: 'prep', name: 'Late prep', from: 720, to: 1000 }
];
const config = {
  people: [
    { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, active: true },
    { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, active: true }
  ],
  sousIds: ['sam'], staffIds: ['sam', 'ann'], kitShifts: shifts,
  kitSecs: [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }]
};
const plan = { day, on: [{ id: 'ann', sh: 'dinner', sec: 'pans' }, { id: 'ann', sh: 'lunch', sec: 'grill' }],
  br: [{ id: 'ann', sh: 'lunch', at: 840, len: 30 }], v: 1, at: L.NOW, upd: L.NOW, by: 'sam' };
// the day grid (15 Nov 2026): services across in the book's order, one section picker per person and service
const cell = sh => 'select[data-k="tm-sec:ann:' + sh + '"]';
const state = p => p.evaluate(([configKey, teamKey]) => ({
  reads: window.__fake.reads.filter(k => /\/(team|teamsum|config)\//.test(k)).length,
  writes: window.__fake.writes.length,
  shifts: window.__fake.dump()[configKey].kitShifts,
  team: window.__fake.dump()[teamKey]
}), [CFG, TEAM]);

(async () => {
  const browser = await L.start();
  const p = await L.open(browser, '#/team', { who: 'sam', extra: { [CFG]: config, [TEAM]: plan }, wait: 1200 });
  await L.waitFor(p, () => !!document.querySelector('select[data-k="tm-sec:ann:dinner"]'), null, 6000);
  const before = await state(p);
  ok(await p.$eval('.tm-person-row[data-id="ann"]', e => e.dataset.sh) === 'lunch', 'details service: at 14:00 Ann\'s break details start on Lunch, the service on now, though Dinner is configured first');

  for (const width of [390, 768, 1280]) {
    await p.setViewportSize({ width, height: 844 }); await L.settle(p, 150);
    const order = await p.$$eval('.tm-grid-head .tm-grid-sh > b', l => l.map(e => e.textContent));
    ok(JSON.stringify(order) === JSON.stringify(['lUnCh service', 'DINNER service']), width + ': Lunch and Dinner prefixes sort first regardless of case; services nobody works today have no column (' + order.join(', ') + ')');
    ok(await p.locator(cell('lunch')).count() === 1 && await p.locator(cell('dinner')).count() === 1 && !await p.locator(cell('smoker')).count(), width + ': Ann has a section picker on each service she works');
    ok(!(await L.overflow(p)), width + ': the service columns do not cause sideways page scroll');
  }

  await p.locator('[data-p="tm-focus"][data-id="ann"]').click(); await L.settle(p, 150);
  const chips = await p.$$eval('.tm-bench-shifts [data-p="tm-sh"]', l => l.map(e => e.dataset.v));
  ok(JSON.stringify(chips) === JSON.stringify(['lunch', 'dinner', 'smoker', 'prep']), 'details: every configured service is offered in the book\'s order, ready to add (' + chips.join(', ') + ')');
  await L.pick(p, cell('dinner'), 'grill');
  await L.pick(p, cell('lunch'), 'pans');
  ok(await p.$eval(cell('dinner'), e => e.value) === 'grill', 'each service: Dinner keeps its own unsaved Grill assignment');
  ok(await p.$eval(cell('lunch'), e => e.value) === 'pans', 'shared draft: Lunch keeps its separate unsaved Pans assignment');
  const after = await state(p);
  ok(JSON.stringify(after.shifts) === JSON.stringify(shifts), 'display order: the saved shift configuration remains unchanged');
  ok(JSON.stringify(after.team) === JSON.stringify(before.team) && after.writes === before.writes, 'draft switching: the saved day and write count remain unchanged until Save');
  ok(after.reads === before.reads, 'section edits and resizing: the existing loaded plan is reused without reads');
  ok(await p.$$eval('[data-p="tm-save"]', all => all.length) === 1 && await p.$eval('[data-p="tm-save"]', e => !e.disabled), 'shared draft: one enabled Save covers both shift edits');
  ok(p.errors.length === 0, 'service columns: no browser errors ' + p.errors.join(' | '));
  await p.context().close(); await browser.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
