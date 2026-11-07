const assert = require('node:assert/strict');
const C = require('../js/analysis-core');
const refs = [{ id: 'a', alias: 'Milk', label: 'Milk', supplierId: 's', itemId: 'milk', recipeId: '' }, { id: 'b', alias: 'Full cream milk', label: 'Milk', supplierId: 's', itemId: 'milk', recipeId: '' }];
const d = C.daily('2026-10-30', {
  prep: [{ id: 'p', text: 'Milk', done: true, doneById: 'ann', station: 'Larder' }, { text: 'Milk', rolled: 1 }, { text: 'Milk', tst: true }, { text: 'Milk', deleted: true }, { text: 'Function dish', fn: 'f' }],
  waste: [{ id: 'w', text: 'Full cream milk', amount: 2, unit: 'L' }, { text: 'Milk', amount: 500, unit: 'ml' }, { text: '__proto__', amount: 1, unit: '' }],
  supplierOrders: [{ text: 'Milk', amount: 6, unit: '', sid: 's', itemId: 'milk' }],
  functions: [{ name: 'Cancelled', status: 'cancelled' }, { name: 'Booked', status: 'confirmed' }]
}, refs);
assert.equal(d.counts.prep, 2); assert.equal(d.excluded.prep, 3); assert.equal(d.counts.functions, 1);
const a = C.aggregate([d]), milk = a.items.find(x => x.ref === 'supplier:s:milk');
assert.equal(milk.counts.waste, 2); assert.equal(milk.counts.prep, 1); assert.equal(milk.amounts['waste|L'], 2);
assert.equal(milk.amounts['waste|ml'], 500); assert.equal(milk.amounts['supplierOrders|unit not set'], 6);
assert.equal(a.people.ann.Larder, 1); assert.equal(d.quality.unknownUnit, 2);
assert.equal(C.aggregate([d], 'Larder').counts.prep, 1);
assert.equal(C.resolve({ text: 'Milk' }, refs.concat([{ alias: 'Milk', recipeId: 'different' }])), null);
const ingredients = [{ alias: 'Milk', recipeId: 'sauce', supplierId: 's', itemId: 'milk' }, { alias: 'Flour', recipeId: 'sauce', supplierId: 's', itemId: 'flour' }];
assert.notEqual(C.identity(ingredients[0]), C.identity(ingredients[1]));
assert.equal(C.resolve({ text: 'Sauce', recipe: 'sauce' }, ingredients), null);
assert.equal(C.resolve({ text: 'Milk', recipe: 'sauce' }, ingredients), ingredients[0]);
const original = C.daily('2026-10-30', { prep: [{ text: 'Old entry' }] });
const correction = C.daily('2026-10-30', { prep: [{ text: 'Old entry', deleted: true }] });
assert.equal(C.aggregate([original]).counts.prep, 1); assert.equal(C.aggregate([correction]).counts.prep, undefined);
assert.equal(C.aggregate([C.daily('2026-10-30', { prep: [{ text: 'Milk' }], waste: [{ text: 'Milk' }] })]).items.length, 2);
const attributed = patch => C.daily('2026-10-30', { prep: [{ text: 'Example prep', station: 'Grill', done: true,
  doneBy: 'Example recorder', doneById: 'recorder', doneAt: 200, preparedBy: 'Example cook', preparedById: 'worker', preparedAt: 200, ...patch }] });
const prepared = attributed({});
assert.equal(prepared.entries[0].person, 'worker', 'A stamped completion credits the reported worker rather than the recorder.');
assert.equal(C.aggregate([prepared]).people.worker.Grill, 1);
assert.equal(C.aggregate([prepared]).people.recorder, undefined, 'One shared tick does not also count as work by its recorder.');
for (const patch of [
  { preparedBy: undefined, preparedById: undefined, preparedAt: undefined },
  { preparedBy: '', preparedById: '' }, { preparedBy: '   ' }, { preparedById: '' },
  { preparedBy: 2 }, { preparedById: ['worker'] },
  { preparedBy: 'x'.repeat(81) }, { preparedById: 'x'.repeat(81) },
  { preparedAt: undefined }, { preparedAt: '200' }, { preparedAt: 0 }, { preparedAt: 199 },
  { preparedAt: Infinity, doneAt: Infinity }, { doneAt: 201 }
]) assert.equal(attributed(patch).entries[0].person, 'recorder', 'Legacy, malformed or stale attribution falls back to the recorder: ' + JSON.stringify(patch));
assert.equal(attributed({ done: false }).entries[0].person, '', 'Undo removes completion credit even when an older client leaves prepared fields behind.');
assert.equal(C.aggregate([attributed({ doneAt: 201 })]).people.recorder.Grill, 1, 'An old-client re-tick with a new timestamp cannot inherit an earlier worker.');
// Today's team, step 4 (7 Nov 2026): shifts worked per section from the plan and own moves, usual sections, In training
const secs = [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }, { id: 'larder', name: ' Larder ', off: true }];
const team = [
  { day: '2026-11-07', on: [{ id: 'ann', sh: 'lunch', sec: 'grill' }, { id: 'ann', sh: 'dinner', sec: 'pans' }, { id: 'sam', sh: 'lunch', sec: '' }, { id: '__proto__', sh: 'lunch', sec: 'grill' }] },
  { day: '2026-10-31', on: [{ id: 'ann', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'lunch', sec: 'pans' }] },
  { day: '2026-10-24', on: [{ id: 'ann', sh: 'lunch', sec: 'pans' }, { id: 'bo', sh: 'lunch', sec: 'pans' }] },
  { day: '2026-10-17', on: [{ id: 'ann', sh: 'lunch', sec: 'grill' }] }];
const picks = [
  { day: '2026-11-07', by: 'ann', sec: 'larder', name: 'Larder', auto: false, sh: 'lunch', log: [{ sh: 'lunch', sec: 'larder', at: 1 }] },
  { day: '2026-11-07', by: 'ann', sec: 'grill', auto: true, sh: 'lunch' },
  { day: '2026-11-06', by: 'bo', sec: 'pans', name: 'Pans', auto: false },
  { day: '2026-10-31', by: 'bo', sec: 'grill', name: 'Grill', auto: false },
  { day: '2026-11-07', by: 'sam', sec: 'sous', name: 'Sous chef', auto: true },
  { day: '2026-11-05', by: 'cy', sec: 'gone', name: 'Old section', auto: false }];
const stints = C.teamStints(team, picks, secs, '2026-10-25', '2026-11-07');
assert.deepEqual(stints, [
  { day: '2026-10-31', s: [{ p: 'ann', sec: 'Grill', sh: 'lunch' }, { p: 'bo', sec: 'Pans', sh: 'lunch' }] },
  { day: '2026-11-05', s: [{ p: 'cy', sec: 'Old section', sh: '' }] },
  { day: '2026-11-06', s: [{ p: 'bo', sec: 'Pans', sh: '' }] },
  { day: '2026-11-07', s: [{ p: 'ann', sec: 'Grill', sh: 'lunch' }, { p: 'ann', sec: 'Pans', sh: 'dinner' }, { p: 'ann', sec: 'Larder', sh: 'lunch' }] }],
  'Stints: the plan, an own move from the log, a pick on a day with no plan; not a chef role, not a pick the plan overrides, not a doubled auto record, not a day outside the window, not a bad id.');
const counts = C.teamShiftCounts(stints);
assert.equal(counts.ann.Grill, 2); assert.equal(counts.ann.Larder, 1); assert.equal(counts.bo.Pans, 2); assert.equal(counts.sam, undefined);
assert.equal(C.teamShiftCounts(stints, '2026-11-01').bo.Pans, 1, 'Counts from a day on.');
const usual = C.teamUsual(team, '2026-11-14', 8);
assert.deepEqual(JSON.parse(JSON.stringify(usual)), { '6|lunch': { ann: ['grill', 3, 4], bo: ['pans', 2, 4] } }, 'Usual: the section given most on that weekday and shift, at least twice, out of the weekdays with a plan.');
assert.deepEqual(JSON.parse(JSON.stringify(C.teamUsual(team, '2026-11-14', 2))), { '6|lunch': { ann: ['grill', 2, 2] } }, 'Only the last weeks asked for count, and once is not usual (Bo on Pans).');
const queue = C.trainingQueue(null, [{ personId: 'ann', section: 'Pans', status: 'in-training', day: '2026-11-01' }], [{ id: 'ann', name: 'Ann' }], ['Grill', 'Pans', 'Larder'], counts);
assert.deepEqual(queue.map(o => [o.section, o.shifts]), [['Pans', 1], ['Grill', 2], ['Larder', 1]], 'Training rows carry the shifts worked, in training first.');
assert.deepEqual(JSON.parse(JSON.stringify(C.teamLearning([{ personId: 'ann', section: 'Pans', status: 'in-training', day: '2026-11-01' }, { personId: 'ann', section: 'Grill', status: 'confirmed', day: '2026-11-01' }], [{ id: 'ann' }, { id: 'bo' }], ['Grill', 'Pans']))), { ann: ['Pans'] }, 'In training: the latest whole-section assessment only.');
console.log('PASS analysis exclusions, confirmed aliases, ambiguous joins, units, stamped worker attribution, legacy fallback and corrections, team stints, usual sections and In training');
