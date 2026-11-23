// Use the real SDK and emulator to prove path bounds and owner-only collection-group history access.
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { collectionGroup, collection, doc, setDoc, getDoc, getDocs, query, where, documentId, runTransaction } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { anonContext, dailySession, seedOwnerDevice } from './device-auth-fixtures.mjs';
const PIN = '000000', OWNER = 'headchef@test.local', K = 'kitchens/' + PIN + '/';
const rules = readFileSync('../../firestore.rules', 'utf8').replaceAll('KITCHEN_PIN', PIN).replaceAll('OWNER_EMAIL', OWNER).replaceAll('PLATFORM_EMAIL', OWNER).replaceAll('PLATFORM_ID', '');
const env = await initializeTestEnvironment({ projectId: 'demo-test', firestore: { rules } });
try {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, K + 'config/main'), { people: [{ id: 'sam', role: 'sous' }, { id: 'head', role: 'head' }, { id: 'ann', role: 'staff' }], sousIds: ['sam', 'head'], staffIds: ['sam', 'head', 'ann'], headId: 'head', pastEdit: { w: 1 } });
    for (const id of ['sam', 'head', 'ann']) {
      await setDoc(doc(db, K + 'pinset/' + id), { at: 1 });
      await setDoc(doc(db, K + 'sessions/' + id), dailySession(id));
    }
    for (const d of ['2026-07-01', '2026-08-31', '2026-09-01', '2026-09-30', '2026-10-01']) {
      await setDoc(doc(db, K + 'waste/' + d + '/lines/a'), { text: d, amount: 1, unit: 'kg', reason: 'excess' });
      await setDoc(doc(db, K + 'waste/' + d), { avoidable: d });
    }
    await setDoc(doc(db, K + 'orders/2026-09-01/lines/a'), { text: 'Order' });
    await setDoc(doc(db, K + 'transfers/2026-09-01/lines/a'), { text: 'Transfer' });
    await setDoc(doc(db, 'kitchens/other/waste/2026-09-01/lines/a'), { text: 'Other kitchen' });
  });
  await seedOwnerDevice(env, { pin: PIN, uid: 'owner', headId: 'head' });
  const owner = anonContext(env, 'owner').firestore();
  const history = db => query(collectionGroup(db, 'lines'), where(documentId(), '>=', doc(db, K + 'waste/2026-09-01/lines/\u0000')), where(documentId(), '<', doc(db, K + 'waste/2026-10-01/lines/\u0000')));
  const sn = await assertSucceeds(getDocs(history(owner)));
  assert.deepEqual(sn.docs.map(x => x.data().text), ['2026-09-01', '2026-09-30']);
  console.log('PASS history includes both month boundaries and excludes other dates, orders, transfers and kitchens');
  const rv = await assertSucceeds(getDocs(query(collection(owner, K + 'waste'), where(documentId(), '>=', '2026-09-01'), where(documentId(), '<=', '2026-09-30'))));
  assert.equal(rv.size, 2);
  console.log('PASS reviews use one bounded query');
  for (const [uid, claims] of [['anonymous', {}], ['ann', {}], ['sam', {}], ['head', {}], ['wrong', { email: 'other@test.local', email_verified: true }], ['unverified', { email: OWNER, email_verified: false }]]) {
    const db = uid === 'anonymous' ? env.unauthenticatedContext().firestore() : (claims.email ? env.authenticatedContext(uid, claims) : anonContext(env, uid)).firestore();
    await assertFails(getDocs(history(db)));
    await assertFails(getDoc(doc(db, K + 'waste/2026-07-01/lines/a')));
    console.log('PASS ' + uid + ' cannot query or directly read private dated history');
  }
  await assertFails(setDoc(doc(owner, 'other/x/lines/new'), { text: 'No new write permission' }));
  console.log('PASS recursive history rule adds no write permission');
  const sous = anonContext(env, 'sam').firestore();
  await assertSucceeds(setDoc(doc(sous, K + 'config/main'), { pastEdit: { p: 10, w: 1 }, by: 'sam' }, { merge: true }));
  console.log('PASS a sous chef prep stamp can preserve the new wastage stamp');

  const reviewPath = K + 'waste/2026-10-02';
  const initial = { avoidable: 'Already reviewed', change: 'Use smaller trays', reviewBy: 'Other chef', reviewAt: 101, oldNote: true };
  const approved = { avoidable: 'Measured the leftovers', change: 'Use smaller trays', reviewBy: 'Sam', reviewAt: 102, by: 'sam' };
  const intervening = { avoidable: 'Counted the next tray', change: 'Keep the section plan', reviewBy: 'Sam', reviewAt: 103, by: 'sam' };
  const candidate = { avoidable: 'Started with smaller batches', change: intervening.change, reviewBy: 'Head chef', reviewAt: 104, by: 'head' };
  const version = r => JSON.stringify([r.avoidable, r.change, r.reviewBy, r.reviewAt, r.by]);
  let reads = 0;
  const attempt = (db, expected, data, afterRead) => runTransaction(db, async tx => {
    const ref = doc(db, reviewPath);
    const ss = await tx.get(ref);
    const current = ss.exists() ? ss.data() : {};
    reads++;
    if (version(current) !== version(expected)) throw { code: 'review-conflict', review: current };
    if (afterRead) await afterRead();
    tx.set(ref, data, { merge: true });
  });
  const saved = async () => (await getDoc(doc(owner, reviewPath))).data();
  const oldSave = data => setDoc(doc(sous, reviewPath), data, { merge: true });

  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), reviewPath), initial));
  await assertSucceeds(attempt(sous, initial, approved));
  assert.deepEqual(await saved(), { ...initial, ...approved });
  console.log('PASS the full SDK and current rules support a scoped transaction on an existing legacy review');

  reads = 0;
  await assert.rejects(attempt(owner, approved, candidate, () => oldSave(intervening)),
    error => error.code === 'review-conflict' && error.review.avoidable === intervening.avoidable);
  assert.equal(reads, 2);
  assert.deepEqual(await saved(), { ...initial, ...intervening });
  console.log('PASS a legacy third writer between read and commit invalidates the exact approved version');

  await assertSucceeds(attempt(owner, intervening, candidate));
  assert.deepEqual(await saved(), { ...initial, ...candidate });
  await assertFails(attempt(anonContext(env, 'ann').firestore(), candidate, { ...approved, by: 'ann' }));
  await assertFails(attempt(env.unauthenticatedContext().firestore(), candidate, candidate));
  assert.deepEqual(await saved(), { ...initial, ...candidate });
  console.log('PASS fresh approval writes once and the actual rules refuse staff writes and signed-out reads');

  const oldLater = { ...intervening, reviewAt: 105 };
  await assertSucceeds(oldSave(oldLater));
  assert.deepEqual(await saved(), { ...initial, ...oldLater });
  console.log('PASS old installed clients remain compatible and their later unconditional save remains possible');
} finally { await env.cleanup(); }
