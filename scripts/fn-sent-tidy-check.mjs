// Emulator check for scripts/fn-sent-tidy.mjs (Function sent, lines off, 14 Nov 2026). Made-up kitchen, made-up lines.
// Proves: only open, unkept lines of an all-sent function come off (platter, linked ingredient, stock line and its
// rolled copy after midnight); a line for two functions waits for both; a tick made days early never counts; a second
// run changes nothing; a past day's change stamps config/main.pastEdit.
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
import assert from 'node:assert/strict';
import { tidySentFunctions, kitchenDay } from './fn-sent-tidy.mjs';
const M = createRequire(import.meta.url)('../js/functions.js');
if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Run on the Firestore emulator only.');
const app = initializeApp({ projectId: 'demo-test' }, 'fn-sent-tidy-check');
try {
  const db = getFirestore(app), K = db.collection('kitchens').doc('424242'), doc = p => db.doc(K.path + '/' + p);
  const today = kitchenDay(Date.now()), D = M.addDays(today, -1), at = (d, hm) => M.kat(d, M.hmMin(hm));
  const r1 = at(D, '12:00'), r2 = at(D, '12:45'), e1 = at(D, '18:00');
  const put = (p, v) => doc(p).set(v);
  await put('functions/smith-x', { status: 'confirmed', name: 'Smith 60th', date: D, rounds: [{ at: r1 }, { at: r2 }] });
  await put('functions/jones-x', { status: 'confirmed', name: 'Jones', date: D, rounds: [{ at: e1 }] });
  await put('functions/early-x', { status: 'confirmed', name: 'Early', date: D, rounds: [{ at: e1 }] });
  await put('fnsent/smith-x_' + r1, { fid: 'smith-x', at: r1, day: D, sent: true, sentAt: r1 + 120000, sentBy: 'ann' });
  await put('fnsent/smith-x_' + r2, { fid: 'smith-x', at: r2, day: D, sent: true, sentAt: r2 + 180000, sentBy: 'ann' });
  // Early: ticked two days before its day by mistake, so it never counts as sent
  await put('fnsent/early-x_' + e1, { fid: 'early-x', at: e1, day: D, sent: true, sentAt: e1 - 2 * 86400000, sentBy: 'ann' });
  const open = x => Object.assign({ qty: '1', addedBy: 'Ann', addedById: 'ann', addedAt: r1 - 3600000, done: false, deleted: false }, x);
  const P = id => `days/${D}/items/${id}`, O = (d, id) => `orders/${d}/lines/${id}`;
  await put(P('fn-smith-x-aussie'), open({ text: 'Aussie Platter: Smith 60th, from 12:00', fn: 'smith-x' }));
  await put(P('fn-smith-x-pizza'), open({ text: 'Pizza Platter: Smith 60th, from 12:00', fn: 'smith-x', done: true }));
  await put(P('need1'), open({ text: 'Party pies', fnFor: ['smith-x'] }));
  await put(P('need2'), open({ text: 'Sausage rolls', fnFor: ['smith-x', 'jones-x'] }));
  await put(P('need3'), open({ text: 'Meatballs', fnFor: ['smith-x'], keep: true }));
  await put(P('plain'), open({ text: 'Slice onions' }));
  await put(P('fn-early-x-pizza'), open({ text: 'Pizza Platter: Early, from 18:00', fn: 'early-x' }));
  await put(O(D, 'r' + D.replace(/-/g, '') + '-fn-smith-x'), open({ text: 'Function stock: Smith 60th', root: 'fn-smith-x', rolled: 2, ordered: false }));
  await put(O(D, 'fn-smith-x-' + D.replace(/-/g, '')), open({ text: 'Function stock changed: Smith 60th', ordered: false }));
  await put(O(today, 'r' + today.replace(/-/g, '') + '-fn-smith-x'), open({ text: 'Function stock: Smith 60th', root: 'fn-smith-x', rolled: 3, ordered: false }));
  await put(O(D, 'fn-smith-xy'), open({ text: 'Another function whose id starts the same', ordered: false }));
  await put(O(D, 'milk'), open({ text: 'Milk', ordered: false }));
  await put(O(D, 'ord-done'), open({ text: 'Function stock: Smith 60th (ordered)', root: 'fn-smith-x', ordered: true }));

  const first = await tidySentFunctions(K, today);
  assert.deepEqual({ f: first.functions, p: first.prep, o: first.orders, k: first.kept }, { f: 1, p: 2, o: 3, k: 1 }, 'first run');
  const gone = async p => { const x = (await doc(p).get()).data(); return !!x.deleted && x.deletedBy === 'Function sent'; };
  assert.equal(await gone(P('fn-smith-x-aussie')), true, 'the open platter line comes off');
  assert.equal(await gone(P('fn-smith-x-pizza')), false, 'a ticked platter line stays');
  assert.equal(await gone(P('need1')), true, 'a linked ingredient line comes off');
  assert.equal(await gone(P('need2')), false, 'a line for two functions waits for both');
  assert.equal(await gone(P('need3')), false, 'a kept line stays');
  assert.equal(await gone(P('plain')), false, 'the kitchen\'s own line stays');
  assert.equal(await gone(P('fn-early-x-pizza')), false, 'a tick days early never counts');
  assert.equal(await gone(O(D, 'r' + D.replace(/-/g, '') + '-fn-smith-x')), true, 'the rolled stock line comes off');
  assert.equal(await gone(O(D, 'fn-smith-x-' + D.replace(/-/g, ''))), true, 'its notice comes off');
  assert.equal(await gone(O(today, 'r' + today.replace(/-/g, '') + '-fn-smith-x')), true, 'a copy rolled after midnight comes off');
  assert.equal(await gone(O(D, 'fn-smith-xy')), false, 'another function\'s line stays');
  assert.equal(await gone(O(D, 'milk')), false, 'an ordinary order line stays');
  assert.equal(await gone(O(D, 'ord-done')), false, 'an ordered line stays');
  const pe = ((await doc('config/main').get()).data() || {}).pastEdit || {};
  assert.ok(pe.p && pe.o, 'a past day changed: both stamps');
  const second = await tidySentFunctions(K, today);
  assert.deepEqual({ p: second.prep, o: second.orders }, { p: 0, o: 0 }, 'a second run changes nothing');
  console.log('Function sent, lines off: checked on the emulator (first run 2 prep and 3 order lines, second run none).');
} finally { await deleteApp(app); }
