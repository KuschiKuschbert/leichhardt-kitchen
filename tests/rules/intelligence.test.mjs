import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { anonContext, dailySession, seedOwnerDevice } from './device-auth-fixtures.mjs';
const K = 'kitchens/000000/', email = 'owner@test.local';
const env = await initializeTestEnvironment({ projectId: 'demo-intelligence', firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8').replaceAll('KITCHEN_PIN', '000000').replaceAll('OWNER_EMAIL', email) } });
await env.clearFirestore();
await env.withSecurityRulesDisabled(async c => {
  const db = c.firestore();
  await setDoc(doc(db, K + 'config/main'), { headId: 'head', staffIds: ['head', 'staff'], fnOnlyIds: [] });
  await setDoc(doc(db, K + 'pinset/head'), { at: 1 });
});
await seedOwnerDevice(env, { uid: 'owner', headId: 'head' });
const owner = anonContext(env, 'owner').firestore();
const reference = { alias: 'Milk', label: 'Milk', recipeId: 'milk', supplierId: '', itemId: '', guideId: '', v: 1, at: 1, by: 'owner' };
const training = { personId: 'ann', section: 'Larder', recipeId: '', guideId: '', status: 'confirmed', assessorId: 'sam', day: '2026-10-30', v: 1, at: 1, by: 'owner' };
for (const [col, value] of [['references', reference], ['training', training]]) {
  const ref = doc(owner, K + col + '/record');
  await assertSucceeds(setDoc(ref, value));
  await assertFails(updateDoc(ref, { v: 2 }));
  const batch = writeBatch(owner); batch.set(ref, { ...value, v: 2 }); batch.set(doc(owner, K + col + '/record/hist/1'), value);
  await assertSucceeds(batch.commit());
  await assertFails(updateDoc(ref, { v: 2 }));
  await assertFails(updateDoc(doc(owner, K + col + '/record/hist/1'), { at: 2 }));
  await assertFails(deleteDoc(ref));
  await assertSucceeds(getDocs(collection(owner, K + col)));
  await assertSucceeds(getDocs(collection(owner, K + col + '/record/hist')));
}
await assertFails(setDoc(doc(owner, K + 'training/bad'), { ...training, status: 'automatic' }));
await assertFails(setDoc(doc(owner, K + 'references/bad'), { ...reference, supplierId: 's', itemId: '' }));
await env.withSecurityRulesDisabled(async c => {
  const db = c.firestore();
  await setDoc(doc(db, K + 'config/main'), { headId: 'head', staffIds: ['head', 'staff'], fnOnlyIds: [] });
  await setDoc(doc(db, K + 'pinset/staff'), { at: 1 });
  await setDoc(doc(db, K + 'sessions/staff'), dailySession('staff'));
  await setDoc(doc(db, K + 'analysis/current'), { v: 1 });
  await setDoc(doc(db, K + 'analysisDaily/g_2026-10-30'), { day: '2026-10-30' });
});
for (const db of [env.unauthenticatedContext().firestore(), anonContext(env, 'staff').firestore(), env.authenticatedContext('unverified', { email, email_verified: false }).firestore(), env.authenticatedContext('wrong', { email: 'other@test.local', email_verified: true }).firestore()]) {
  for (const [col, id] of [['references', 'record'], ['training', 'record'], ['analysis', 'current'], ['analysisDaily', 'g_2026-10-30']]) {
    await assertFails(getDoc(doc(db, K + col + '/' + id))); await assertFails(getDocs(collection(db, K + col)));
    await assertFails(setDoc(doc(db, K + col + '/new'), col === 'training' ? training : reference));
  }
  await assertFails(getDoc(doc(db, K + 'training/record/hist/1')));
}
await assertSucceeds(getDoc(doc(owner, K + 'analysis/current')));
await assertFails(updateDoc(doc(owner, K + 'analysis/current'), { v: 2 }));
console.log('PASS private intelligence permissions, version conflicts and immutable history');
await env.cleanup();
