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
console.log('PASS analysis exclusions, confirmed aliases, ambiguous joins, units, stamped worker attribution, legacy fallback and corrections');
