import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import assert from 'node:assert/strict';
import { analyse } from './analysis.mjs';
if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Emulator required');
initializeApp({ projectId: 'demo-analysis' });
const db = getFirestore(), K = db.collection('kitchens').doc('000000');
const at = Date.parse('2026-10-31T04:00:00Z'), yesterday = '2026-10-30';
await db.recursiveDelete(K);
await K.collection('references').doc('milk').set({ alias: 'Milk', label: 'Milk', recipeId: 'milk' });
await K.collection('days').doc(yesterday).collection('items').doc('p').set({ text: 'Milk', done: true, doneBy: 'Example recorder', doneById: 'ann', doneAt: at - 1000,
  preparedBy: 'Example cook', preparedById: 'bo', preparedAt: at - 1000, station: 'Larder' });
await K.collection('waste').doc(yesterday).collection('lines').doc('w').set({ text: 'Milk', amount: 2, unit: 'L' });
const get = async id => (await K.collection('analysis').doc(id).get()).data();
await analyse(K, { days: 3, at });
assert.equal((await get('range-7')).counts.prep, 1);
assert.equal((await get('range-7')).people.bo.Larder, 1, 'Published analysis credits the reported worker.');
assert.equal((await get('range-7')).people.ann, undefined, 'The recorder is not counted as a second worker.');
const initialGeneration = (await get('current')).generation;
assert.equal((await K.collection('analysisDaily').doc(initialGeneration + '_' + yesterday).get()).data().entries.find(e => e.source === 'prep').person, 'bo', 'The daily contribution keeps the same worker as the published range.');
await K.collection('days').doc(yesterday).collection('items').doc('p').update({ doneAt: at - 500 });
await analyse(K, { days: 3, at: at + 1 });
assert.equal((await get('range-7')).counts.prep, 1);
assert.equal((await get('range-7')).people.ann.Larder, 1, 'An old-client re-tick does not inherit a previous prepared worker.');
assert.equal((await get('range-7')).people.bo, undefined);
await K.collection('days').doc(yesterday).collection('items').doc('p').update({ deleted: true });
await analyse(K, { days: 3, at: at + 2 });
assert.equal((await get('range-7')).counts.prep, undefined);
const generation = (await get('current')).generation;
await assert.rejects(analyse(K, { days: 3, budget: 2, at: at + 3 }));
assert.equal((await get('current')).generation, generation);
assert.equal((await K.collection('analysisDaily').get()).size, 6);
await assert.rejects(analyse(K, { days: 91 }));
for (let i = 0; i < 3000; i += 400) { const batch = db.batch(); for (let j = i; j < Math.min(3000, i + 400); j++) batch.set(K.collection('days').doc(yesterday).collection('items').doc('large-' + j), { text: 'x'.repeat(160), station: 's'.repeat(80), qty: 'q'.repeat(80) }); await batch.commit(); }
await assert.rejects(analyse(K, { days: 3, at: at + 4 }), /analysis-day-too-large/);
assert.equal((await get('current')).generation, generation);
// The Dashboard record: counted like Insights and Wastage, published with the same generation, no prices.
const K2 = db.collection('kitchens').doc('000001'), d2 = '2026-10-29', t0 = Date.parse(d2 + 'T00:00:00Z');
await db.recursiveDelete(K2);
const prep = { a: { text: 'Slaw', station: 'Larder', addedAt: t0, done: true, doneAt: t0 + 90 * 60000, doneById: 'cy' }, b: { text: 'Steak', station: 'Grill', addedAt: t0 },
  c: { text: 'Rolled', station: 'Grill', rolled: 1 }, d: { text: 'Ahead', rolled: 1, ahead: true }, e: { text: 'Gone', deleted: true, done: true },
  f: { text: 'Practice', tst: true, done: true }, g: { text: 'Herbs', addedAt: t0, done: true, doneAt: t0 + 30 * 60000 } };
for (const [id, x] of Object.entries(prep)) await K2.collection('days').doc(d2).collection('items').doc(id).set(x);
const waste = { a: { text: 'Brisket', amount: 1.5, unit: 'kg', reason: 'excess', station: 'Larder' }, b: { text: ' brisket ', amount: 0.5, unit: 'kg', reason: 'excess', station: 'Larder' },
  c: { text: 'Brisket', amount: 9, unit: 'kg', deleted: true }, d: { text: 'Rolls', amount: '2', unit: 'each', reason: 'expired' } };
for (const [id, x] of Object.entries(waste)) await K2.collection('waste').doc(d2).collection('lines').doc(id).set(x);
for (const [id, x] of Object.entries({ a: { dir: 'out', text: 'Milk' }, b: { dir: 'in', text: 'Eggs' }, c: { dir: 'out', text: 'Old', deleted: true } })) await K2.collection('transfers').doc(d2).collection('lines').doc(id).set(x);
await K2.collection('references').doc('ai-slaw').set({ alias: 'Slaw', label: 'Slaw', recipeId: 'slaw' });
await K2.collection('config').doc('main').set({ people: [{ id: 'ann', name: 'Ann' }, { id: 'cy', name: 'Cy' }, { id: 'dee', name: 'Dee' }, { id: 'gone', name: 'Gone', active: false }],
  kitSecs: [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill', off: true }] });
await K2.collection('training').doc('t1').set({ personId: 'ann', section: 'Larder', status: 'confirmed', day: d2 });
await K2.collection('training').doc('t2').set({ personId: 'dee', section: 'Larder', status: 'in-training', day: d2 });
await K2.collection('training').doc('t3').set({ personId: 'cy', section: 'Larder', recipeId: 'slaw', status: 'confirmed', day: d2 });
await analyse(K2, { days: 3, at });
const board = (await K2.collection('analysis').doc('dashboard').get()).data();
assert.equal(board.generation, (await K2.collection('analysis').doc('current').get()).data().generation, 'The dashboard publishes with its generation.');
assert.deepEqual(board.days.map(x => x.day), ['2026-10-28', '2026-10-29', '2026-10-30'], 'One row for every finished day, today left out.');
const row = board.days[1];
assert.deepEqual(row.p, { n: 5, w: 3, t: 2, r: 1, sec: { Larder: 1, Grill: 1, General: 1 }, mins: { Larder: [90], General: [30] }, who: { cy: 1 } }, 'Prep counts match Insights, with ticks per person.');
assert.deepEqual(row.w, { n: 3, reason: { excess: 2, expired: 1 }, sec: { Larder: 2, General: 1 }, items: [{ t: 'Brisket', u: 'kg', a: 2, n: 2 }, { t: 'Rolls', u: 'each', a: 0, n: 1 }] }, 'Waste counts lines and amounts.');
assert.deepEqual(row.x, { out: 1, in: 1 }, 'Transfers count out and in, not deleted lines.');
assert.equal(JSON.stringify(board).includes('price'), false);
// Needs you: Slaw is linked, so 6 of 7 recorded names wait; Cy (recipe only) and Dee (in training) need a Larder review.
assert.deepEqual(board.needs, { links: 6, training: 2, inTraining: 1 }, 'Needs you counts the Review desk queues: ' + JSON.stringify(board.needs));
// Day digests (Plan B 2.1, 5 Nov 2026): one record per past day with its prep and order lines, written only when they change
const dig = async day => (await K2.collection('digest').doc(day).get()).data();
const dg = await dig(d2);
assert.deepEqual(dg.prep.map(x => x.id), ['a', 'b', 'c', 'd', 'e', 'f', 'g'], 'The digest holds every prep line of the day, removed ones too, by id.');
assert.equal(dg.prep[0].text, 'Slaw'); assert.equal(dg.prep[4].deleted, true); assert.deepEqual(dg.orders, []);
assert.equal(dg.v, 1); assert.equal(dg.day, d2); assert.equal(dg.at, at);
assert.deepEqual(Object.keys((await K2.collection('digest').doc('_index').get()).data().days).sort(), ['2026-10-28', '2026-10-29', '2026-10-30'], 'The index has every day in the window, empty days too.');
const same = await analyse(K2, { days: 3, at: at + 60000 });
assert.equal(same.digests.written, 0, 'A night with nothing changed writes no digest.');
assert.equal((await dig(d2)).at, at, 'An unchanged day keeps its digest.');
await K2.collection('days').doc(d2).collection('items').doc('b').update({ done: true, doneAt: t0 + 3600000 });
const fixed = await analyse(K2, { days: 3, at: at + 120000 });
assert.equal(fixed.digests.written, 1, 'A past day fixed: only its digest is written again.');
assert.equal((await dig(d2)).prep.find(x => x.id === 'b').done, true); assert.equal((await dig(d2)).at, at + 120000);
const narrow = await analyse(K2, { days: 1, at: at + 180000 });
assert.equal(narrow.digests.deleted, 2, 'The days that left the window lose their digests.');
assert.equal(await dig('2026-10-28'), undefined); assert.equal((await dig('2026-10-30')).day, '2026-10-30');
await db.recursiveDelete(K2);
console.log('PASS analysis worker attribution, dashboard counts, day digests, old-client re-ticks, reruns, corrections, atomic publication, read budget and generation retention');
