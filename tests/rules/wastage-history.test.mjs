// Use the real SDK and emulator to prove path bounds and owner-only collection-group history access.
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { collectionGroup, collection, doc, setDoc, getDoc, getDocs, query, where, documentId } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const PIN = '000000', OWNER = 'headchef@test.local', K = 'kitchens/' + PIN + '/';
const rules = readFileSync('../../firestore.rules', 'utf8').replaceAll('KITCHEN_PIN', PIN).replaceAll('OWNER_EMAIL', OWNER);
const env = await initializeTestEnvironment({ projectId: 'demo-test', firestore: { rules } });
try {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, K + 'config/main'), { people: [{ id: 'sam', role: 'sous' }, { id: 'head', role: 'head' }, { id: 'ann', role: 'staff' }], sousIds: ['sam', 'head'], staffIds: ['sam', 'head', 'ann'], headId: 'head', pastEdit: { w: 1 } });
    for (const id of ['sam', 'head', 'ann']) {
      await setDoc(doc(db, K + 'pinset/' + id), { at: 1 });
      await setDoc(doc(db, K + 'sessions/' + id), { by: id, pinAt: 1, exp: Date.now() + 3600000 });
    }
    for (const d of ['2026-07-01', '2026-08-31', '2026-09-01', '2026-09-30', '2026-10-01']) {
      await setDoc(doc(db, K + 'waste/' + d + '/lines/a'), { text: d, amount: 1, unit: 'kg', reason: 'excess' });
      await setDoc(doc(db, K + 'waste/' + d), { avoidable: d });
    }
    await setDoc(doc(db, K + 'orders/2026-09-01/lines/a'), { text: 'Order' });
    await setDoc(doc(db, K + 'transfers/2026-09-01/lines/a'), { text: 'Transfer' });
    await setDoc(doc(db, 'kitchens/other/waste/2026-09-01/lines/a'), { text: 'Other kitchen' });
  });
  const owner = env.authenticatedContext('owner', { email: OWNER, email_verified: true }).firestore();
  const history = db => query(collectionGroup(db, 'lines'), where(documentId(), '>=', doc(db, K + 'waste/2026-09-01/lines/\u0000')), where(documentId(), '<', doc(db, K + 'waste/2026-10-01/lines/\u0000')));
  const sn = await assertSucceeds(getDocs(history(owner)));
  assert.deepEqual(sn.docs.map(x => x.data().text), ['2026-09-01', '2026-09-30']);
  console.log('PASS history includes both month boundaries and excludes other dates, orders, transfers and kitchens');
  const rv = await assertSucceeds(getDocs(query(collection(owner, K + 'waste'), where(documentId(), '>=', '2026-09-01'), where(documentId(), '<=', '2026-09-30'))));
  assert.equal(rv.size, 2);
  console.log('PASS reviews use one bounded query');
  for (const [uid, claims] of [['anonymous', {}], ['ann', {}], ['sam', {}], ['head', {}], ['wrong', { email: 'other@test.local', email_verified: true }], ['unverified', { email: OWNER, email_verified: false }]]) {
    const db = uid === 'anonymous' ? env.unauthenticatedContext().firestore() : env.authenticatedContext(uid, claims).firestore();
    await assertFails(getDocs(history(db)));
    await assertFails(getDoc(doc(db, K + 'waste/2026-07-01/lines/a')));
    console.log('PASS ' + uid + ' cannot query or directly read private dated history');
  }
  await assertFails(setDoc(doc(owner, 'other/x/lines/new'), { text: 'No new write permission' }));
  console.log('PASS recursive history rule adds no write permission');
  const sous = env.authenticatedContext('sam', {}).firestore();
  await assertSucceeds(setDoc(doc(sous, K + 'config/main'), { pastEdit: { p: 10, w: 1 }, by: 'sam' }, { merge: true }));
  console.log('PASS a sous chef prep stamp can preserve the new wastage stamp');
} finally { await env.cleanup(); }
