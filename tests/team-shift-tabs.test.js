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
const rowService = 'select[data-k="tm-row-sh:ann"]';
const service = (p, id) => L.pick(p, rowService, id);
const state = p => p.evaluate(([configKey, teamKey]) => ({
  reads: window.__fake.reads.filter(k => /\/(team|teamsum|config)\//.test(k)).length,
  writes: window.__fake.writes.length,
  shifts: window.__fake.dump()[configKey].kitShifts,
  team: window.__fake.dump()[teamKey]
}), [CFG, TEAM]);

(async () => {
  const browser = await L.start();
  const p = await L.open(browser, '#/team', { who: 'sam', extra: { [CFG]: config, [TEAM]: plan }, wait: 1200 });
  await L.waitFor(p, () => !!document.querySelector('select[data-k="tm-row-sh:ann"]'), null, 6000);
  const before = await state(p);
  ok(await p.$eval(rowService, e => e.value) === 'dinner', 'row service: the configured Dinner default remains selected even though Lunch is displayed first');

  for (const width of [390, 768, 1280]) {
    await p.setViewportSize({ width, height: 844 }); await L.settle(p, 150);
    const order = await p.$eval(rowService, e => [...e.options].map(o => o.value));
    ok(JSON.stringify(order) === JSON.stringify(['lunch', 'dinner', 'smoker', 'prep']), width + ': Lunch and Dinner prefixes sort first regardless of case; other shifts retain configured order');
    ok(!(await L.overflow(p)), width + ': ordered row services do not cause sideways page scroll');
  }

  await L.pick(p, 'select[data-k="tm-sec:ann"]', 'grill');
  await service(p, 'lunch');
  await L.pick(p, 'select[data-k="tm-sec:ann"]', 'pans');
  await service(p, 'dinner');
  ok(await p.$eval(rowService, e => e.value) === 'dinner' && await p.$eval('select[data-k="tm-sec:ann"]', e => e.value) === 'grill', 'row service switching: Dinner stays selected with its own unsaved Grill assignment');
  await service(p, 'lunch');
  ok(await p.$eval('select[data-k="tm-sec:ann"]', e => e.value) === 'pans', 'shared draft: Lunch retains its separate unsaved Pans assignment');
  const after = await state(p);
  ok(JSON.stringify(after.shifts) === JSON.stringify(shifts), 'display order: the saved shift configuration remains unchanged');
  ok(JSON.stringify(after.team) === JSON.stringify(before.team) && after.writes === before.writes, 'draft switching: the saved day and write count remain unchanged until Save');
  ok(after.reads === before.reads, 'row service switching and resizing: the existing loaded plan is reused without reads');
  ok(await p.$$eval('[data-p="tm-save"]', all => all.length) === 1 && await p.$eval('[data-p="tm-save"]', e => !e.disabled), 'shared draft: one enabled Save covers both shift edits');
  ok(p.errors.length === 0, 'row service display: no browser errors ' + p.errors.join(' | '));
  await p.context().close(); await browser.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
