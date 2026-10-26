import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
const K = 'kitchens/000000/', ownerEmail = 'owner@test.local';
const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8').replaceAll('KITCHEN_PIN', '000000').replaceAll('OWNER_EMAIL', ownerEmail);
const env = await initializeTestEnvironment({ projectId: 'demo-deliveries', firestore: { rules } });
await env.clearFirestore();
const at = Date.now(), today = new Date(at + 36000000).toISOString().slice(0, 10), past = '2025-01-01';
const ids = ['head', 'sous', 'lead', 'staff', 'function', 'view'];
const receipt = by => ({ day: today, receivedAt: at - 60000, recordedAt: at, supplier: 'Test supplier', chilled: 0, frozen: -18.5, note: 'Test goods', receivedBy: by, receivedById: by, by });
const old = { ...receipt('staff'), day: past, receivedAt: Date.parse(past + 'T00:00:00+10:00'), recordedAt: Date.parse(past + 'T12:00:00+10:00') };
await env.withSecurityRulesDisabled(async c => {
  const db = c.firestore();
  await setDoc(doc(db, K + 'config/main'), { staffIds: ids, headId: 'head', sousIds: ['head', 'sous'], fnIds: ['function'], fnOnlyIds: ['function'] });
  for (const id of [...ids, 'removed']) {
    await setDoc(doc(db, K + 'pinset/' + id), { at: 1 });
    await setDoc(doc(db, K + 'sessions/' + id), { by: id, pinAt: 1, exp: at + 86400000 });
  }
  await setDoc(doc(db, K + 'sessions/expired'), { by: 'staff', pinAt: 1, exp: 1 });
  await setDoc(doc(db, K + 'sessions/reset'), { by: 'staff', pinAt: 0, exp: at + 86400000 });
  await setDoc(doc(db, K + 'deliveries/today'), receipt('staff'));
  await setDoc(doc(db, K + 'deliveries/past'), old);
});
let n = 0;
const yes = async p => { await assertSucceeds(p); n++; }, no = async p => { await assertFails(p); n++; };
const phone = id => env.authenticatedContext(id).firestore();
const owner = env.authenticatedContext('admin', { email: ownerEmail, email_verified: true }).firestore();
for (const id of ids) {
  const db = phone(id), ref = doc(db, K + 'deliveries/by-' + id), data = receipt(id);
  await yes(getDoc(doc(db, K + 'deliveries/today')));
  await yes(getDoc(ref)); // Absent id check before a save.
  await yes(getDocs(query(collection(db, K + 'deliveries'), where('day', '==', today))));
  await yes(setDoc(ref, data));
  await yes(setDoc(ref, data)); // A retry cannot make a second record.
  await no(updateDoc(ref, { chilled: 4 }));
  await no(deleteDoc(ref));
  await no(getDoc(doc(db, K + 'deliveries/past')));
  await no(getDocs(query(collection(db, K + 'deliveries'), where('day', '==', past))));
  await no(getDocs(collection(db, K + 'deliveries')));
  await no(setDoc(doc(db, K + 'deliveries/forged-' + id), receipt(id === 'head' ? 'staff' : 'head')));
  await no(setDoc(doc(db, K + 'deliveries/backdated-' + id), { ...old, by: id, receivedById: id }));
}
for (const db of [env.unauthenticatedContext().firestore(), phone('unknown'), phone('expired'), phone('reset'), phone('removed'), env.authenticatedContext('wrong-google', { email: ownerEmail, email_verified: false }).firestore()]) {
  await no(getDoc(doc(db, K + 'deliveries/today')));
  await no(getDoc(doc(db, K + 'deliveries/new-id')));
  await no(getDocs(query(collection(db, K + 'deliveries'), where('day', '==', today))));
  await no(setDoc(doc(db, K + 'deliveries/no-session'), receipt('staff')));
}
await yes(getDoc(doc(owner, K + 'deliveries/past')));
await yes(getDocs(collection(owner, K + 'deliveries')));
await yes(setDoc(doc(owner, K + 'deliveries/copied'), old)); // PIN moves preserve the original receiver and times.
await no(updateDoc(doc(owner, K + 'deliveries/past'), { frozen: -20 }));
await no(deleteDoc(doc(owner, K + 'deliveries/past')));
const staff = phone('staff');
await yes(setDoc(doc(staff, K + 'deliveries/chilled-only'), { ...receipt('staff'), frozen: null }));
await yes(setDoc(doc(staff, K + 'deliveries/frozen-only'), { ...receipt('staff'), chilled: null }));
for (const patch of [
  { chilled: null, frozen: null }, { chilled: '' }, { frozen: '-18' }, { chilled: 101 }, { frozen: -101 },
  { supplier: '' }, { supplier: '   ' }, { supplier: 'x'.repeat(81) }, { note: 'x'.repeat(301) }, { receivedBy: '' },
  { receivedById: 'head' }, { day: '2026-99-99' }, { receivedAt: at + 3600000 }, { recordedAt: at + 3600000 },
  { receivedAt: at - 86400000 }, { receivedAt: '12:00' }, { extraField: true }
]) await no(setDoc(doc(staff, K + 'deliveries/invalid'), { ...receipt('staff'), ...patch }));
// Giving functions accounts this receipt permission must not expose the rest of the kitchen.
for (const path of ['config/main', 'orders/' + today + '/lines/x', 'suppliers/x', 'mail/x']) await no(getDoc(doc(phone('function'), K + path)));
console.log('PASS delivery access and validation: ' + n + ' real-rules checks.');
await env.cleanup();
