// Prep lines for a later day (head chef, 17 Nov 2026: admin only; docs/prep-ahead-options/brief.md, findings 15 to 17).
// Before nearDay()'s window opens (the day after tomorrow and later) a line marked plan, before or after the write, is
// written only by the admin (the owner's Google sign-in, the head chef PIN session and the device grant). Unmarked lines
// are as before; on the eve, the line's own day and past days the usual capabilities hold. Synthetic records only.
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, setLogLevel } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { anonContext, dailySession, seedOwnerDevice } from './device-auth-fixtures.mjs';
setLogLevel('silent');
const source = process.env.RULES || new URL('../../firestore.rules', import.meta.url);
const rules = readFileSync(source, 'utf8').replaceAll('KITCHEN_PIN', '000000').replaceAll('OWNER_EMAIL', 'headchef@test.local').replaceAll('PLATFORM_EMAIL', 'headchef@test.local').replaceAll('PLATFORM_ID', '');
const env = await initializeTestEnvironment({ projectId: 'demo-prep-ahead', firestore: { rules } });
const K = 'kitchens/000000/', NOW = Date.now(), DAY = 86400000;
const qld = ms => new Date(ms + 36000000).toISOString().slice(0, 10);
const today = qld(NOW), tmr = qld(NOW + DAY), later = qld(NOW + 5 * DAY), past = qld(NOW - 2 * DAY);
const people = ['head', 'sous', 'staff', 'fn'].map(id => ({ id, name: id, role: id === 'fn' ? 'fnc' : id === 'staff' ? 'staff' : id, active: true }));
const config = { people, staffIds: people.map(p => p.id), sousIds: ['head', 'sous'], headId: 'head', fnIds: ['fn'], fnOnlyIds: [],
  addIds: ['staff', 'sous', 'fn'], tickIds: ['staff', 'sous'], delIds: ['sous'] };
const dbs = Object.fromEntries(people.map(p => [p.id, anonContext(env, p.id).firestore()]));
const line = (by, extra) => ({ text: 'Thaw brisket', station: 'Grill', qty: '2', recipe: '', addedBy: by, addedById: by, addedAt: NOW - 1000, done: false, deleted: false, by, ...extra });
const put = async (path, value) => env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), K + path), value));
let n = 0, fails = 0;
async function check(label, fn, allowed) {
  n++;
  try { await (allowed ? assertSucceeds(fn()) : assertFails(fn())); console.log('PASS ' + label); }
  catch (e) { fails++; console.log('FAIL ' + label + ': ' + String(e.message || e).slice(0, 200)); }
}
try {
  await env.clearFirestore(); await put('config/main', config);
  for (const p of people) { await put('pinset/' + p.id, { at: 1 }); await put('sessions/' + p.id, dailySession(p.id)); }
  await seedOwnerDevice(env, { uid: 'admin', headId: 'head' }); dbs.admin = anonContext(env, 'admin').firestore();
  const at = (d, id) => `days/${d}/items/${id}`;

  // creating a planned line five days ahead
  await check('the admin plans a line 5 days ahead', () => setDoc(doc(dbs.admin, K + at(later, 'a1')), line('head', { plan: later })), true);
  await check('the head chef PIN without the admin grant cannot plan ahead', () => setDoc(doc(dbs.head, K + at(later, 'h1')), line('head', { plan: later })), false);
  await check('a sous chef cannot plan ahead', () => setDoc(doc(dbs.sous, K + at(later, 's1')), line('sous', { plan: later })), false);
  await check('a function manager cannot plan an ordinary line ahead', () => setDoc(doc(dbs.fn, K + at(later, 'f1')), line('fn', { plan: later })), false);
  await check('staff cannot plan ahead', () => setDoc(doc(dbs.staff, K + at(later, 't1')), line('staff', { plan: later })), false);
  await check('a sous chef still writes an unmarked line on a later day, as before', () => setDoc(doc(dbs.sous, K + at(later, 's2')), line('sous')), true);

  // changing a planned line before its day
  await put(at(later, 'p1'), line('head', { plan: later }));
  await check('a sous chef cannot remove a planned line before its day', () => updateDoc(doc(dbs.sous, K + at(later, 'p1')), { deleted: true, deletedBy: 'sous', deletedAt: NOW, by: 'sous' }), false);
  await check('a sous chef cannot take the plan mark off', () => updateDoc(doc(dbs.sous, K + at(later, 'p1')), { plan: '', by: 'sous' }), false);
  await check('a sous chef cannot change its amount', () => updateDoc(doc(dbs.sous, K + at(later, 'p1')), { qty: '3', by: 'sous' }), false);
  await check('the admin changes its amount', () => updateDoc(doc(dbs.admin, K + at(later, 'p1')), { qty: '3', by: 'head' }), true);
  await check('the admin removes it', () => updateDoc(doc(dbs.admin, K + at(later, 'p1')), { deleted: true, deletedBy: 'head', deletedAt: NOW, by: 'head' }), true);

  // on the eve, the line's own day and a past day the usual capabilities hold
  await put(at(tmr, 'p2'), line('head', { plan: tmr, addedAt: NOW - 3 * DAY }));
  await check('on the eve a sous chef may remove a planned line', () => updateDoc(doc(dbs.sous, K + at(tmr, 'p2')), { deleted: true, deletedBy: 'sous', deletedAt: NOW, by: 'sous' }), true);
  await put(at(today, 'p3'), line('head', { plan: today, addedAt: NOW - 3 * DAY }));
  await check('on its day staff tick a planned line', () => updateDoc(doc(dbs.staff, K + at(today, 'p3')), { done: true, doneAt: NOW, doneBy: 'staff', doneById: 'staff', by: 'staff' }), true);
  await put(at(past, 'p4'), line('head', { plan: past, addedAt: NOW - 5 * DAY, deleted: true, deletedBy: 'head', deletedAt: NOW - 3 * DAY }));
  await check('a sous chef puts back a planned line on a past day', () => updateDoc(doc(dbs.sous, K + at(past, 'p4')), { deleted: false, deletedBy: '', deletedAt: 0, by: 'sous' }), true);
  await check('a rolled copy onto today is written as usual', () => setDoc(doc(dbs.staff, K + at(today, 'r-p9')), line('', { by: 'staff', addedBy: 'Rolled over', rolled: 1, root: 'p9', from: 'p9', rolledFrom: past, origBy: 'head', origAt: NOW - 2 * DAY })), true);
} finally {
  console.log(n - fails + ' of ' + n + ' passed');
  await env.cleanup();
  process.exit(fails ? 1 : 0);
}
