/* Supplier catalogue and orders: real Firestore rules on the emulator, with synthetic people and goods only. */
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously, signOut } from 'firebase/auth';
import { doc, collection, getDoc, getDocFromServer, getDocs, getFirestore, connectFirestoreEmulator, setDoc, updateDoc, deleteDoc, writeBatch, query, orderBy, limit } from 'firebase/firestore';
import * as lite from 'firebase/firestore/lite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const PIN = '000000', OWNER = 'headchef@test.local', K = 'kitchens/' + PIN + '/';
const SID = 'test-vendor', CUT = 'test-cutoff', DAY = '2026-10-24';
const rules = readFileSync(process.env.RULES || path.join(here, '..', '..', 'firestore.rules'), 'utf8').replace(/KITCHEN_PIN/g, PIN).replace(/OWNER_EMAIL/g, OWNER);
const env = await initializeTestEnvironment({ projectId: 'demo-test', firestore: { rules } });
await env.clearFirestore();
const source = { file: 'test-source.pdf', page: 1, row: 1, name: 'TEST BAG ITEM 5KG', par: '0' };
const item = { id: 'test-bag', name: source.name, pack: '5 kg bag', group: 'Test goods', category: 'TEST CATEGORY', par: '0', parUnit: '', orderUnit: 'bag', factor: 0, aliases: [], archived: false, manual: false, source };
const catalogue = x => Object.assign({ name: 'Test vendor', cutoffId: CUT, v: 1, items: [item], at: 1, by: 'owner' }, x || {});
const line = x => Object.assign({ itemId: item.id, name: item.name, pack: item.pack, qty: '2 bags', amount: 2, unit: 'bag', par: '0', parUnit: '', source, suggestion: '', stock: '' }, x || {});
const order = x => Object.assign({ sid: SID, supplierName: 'Test vendor', v: 1, at: 10, day: DAY, deliveryDay: '2026-10-26', cutoffDay: '', cutoffId: '', by: 'sous', lines: [line()] }, x || {});
const existing = order({ by: 'owner' });
await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  await setDoc(doc(db, K + 'config/main'), { headId: 'head', sousIds: ['head', 'sous', 'removed'], fnIds: ['function'], staffIds: ['head', 'sous', 'staff', 'lead', 'function'], people: [] });
  for (const id of ['head', 'sous', 'staff', 'lead', 'function', 'removed']) await setDoc(doc(db, K + 'pinset/' + id), { at: 1 });
  for (const [uid, by, pinAt, exp] of [
    ['head-phone', 'head', 1, Date.now() + 86400000], ['sous-phone', 'sous', 1, Date.now() + 86400000],
    ['staff-phone', 'staff', 1, Date.now() + 86400000], ['lead-phone', 'lead', 1, Date.now() + 86400000],
    ['function-phone', 'function', 1, Date.now() + 86400000], ['removed-phone', 'removed', 1, Date.now() + 86400000],
    ['expired-phone', 'head', 1, 1], ['reset-phone', 'head', 0, Date.now() + 86400000]
  ]) await setDoc(doc(db, K + 'sessions/' + uid), { by, pinAt, exp, at: 1 });
  await setDoc(doc(db, K + 'suppliers/' + SID), catalogue());
  await setDoc(doc(db, K + 'suppliers/' + SID + '/orders/existing'), existing);
  await setDoc(doc(db, K + 'suppliers/' + SID + '/audit/1'), { v: 1, itemId: '', action: 'Imported', before: null, after: catalogue(), at: 1, by: 'owner' });
  await setDoc(doc(db, K + 'supplierlinks/2026-10-20_' + CUT), { sid: SID, cutoffId: CUT, day: '2026-10-20', v: 1, orderId: 'existing', at: 10, by: 'owner' });
});

const phone = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const owner = env.authenticatedContext('owner', { email: OWNER, email_verified: true }).firestore();
const wrongOwner = env.authenticatedContext('owner-unverified', { email: OWNER, email_verified: false }).firestore();
const head = phone('head-phone'), sous = phone('sous-phone'), staff = phone('staff-phone');
const anon = env.unauthenticatedContext().firestore();
let checks = 0, failures = 0;
async function ok(promise, allowed, name) {
  checks++;
  try { await (allowed ? assertSucceeds(promise) : assertFails(promise)); console.log('PASS suppliers: ' + name); }
  catch (error) { failures++; console.log('FAIL suppliers: ' + name + ' (' + String(error?.message || error).split('\n')[0].slice(0, 180) + ')'); }
}
const snap = (db, p) => getDoc(doc(db, K + p));
function saveCatalogue(db, data, auditPatch, sid = SID, includeAudit = true) {
  const b = writeBatch(db);
  b.set(doc(db, K + 'suppliers/' + sid), data);
  if (includeAudit) b.set(doc(db, K + 'suppliers/' + sid + '/audit/' + data.v), Object.assign({ v: data.v, itemId: item.id, action: 'Changed par', before: { par: '0' }, after: { par: data.items[0]?.par || '' }, at: data.at, by: data.by }, auditPatch || {}));
  return b.commit();
}
function linked(db, id, data, options = {}) {
  const d = order(Object.assign({ cutoffDay: DAY, cutoffId: CUT }, data));
  const b = writeBatch(db), lid = d.cutoffDay + '_' + d.cutoffId;
  if (!options.noOrder) b.set(doc(db, K + 'suppliers/' + d.sid + '/orders/' + id), d);
  if (!options.noLink) b.set(doc(db, K + 'supplierlinks/' + lid), Object.assign({ sid: d.sid, cutoffId: d.cutoffId, day: d.cutoffDay, v: options.linkV || 1, orderId: id, at: d.at, by: d.by }, options.linkPatch || {}));
  if (!options.noCut) b.set(doc(db, K + 'cutdone/' + lid), Object.assign({ day: d.cutoffDay, sid: d.cutoffId, on: true, at: d.at, by: d.by }, options.cutPatch || {}));
  return b.commit();
}

// A menu or route guard is not enough: documents and queries themselves are private.
for (const [name, db, allowed] of [
  ['owner', owner, true], ['head chef', head, true], ['sous chef', sous, true], ['staff', staff, false],
  ['lead', phone('lead-phone'), false], ['function manager', phone('function-phone'), false],
  ['removed chef', phone('removed-phone'), false], ['expired session', phone('expired-phone'), false],
  ['reset PIN session', phone('reset-phone'), false], ['no session', phone('unknown-phone'), false],
  ['unverified Google email', wrongOwner, false], ['kitchen PIN alone', anon, false]
]) {
  await ok(snap(db, 'suppliers/' + SID), allowed, name + ' direct catalogue read');
  await ok(getDocs(collection(db, K + 'suppliers')), allowed, name + ' catalogue query');
  await ok(snap(db, 'suppliers/' + SID + '/orders/existing'), allowed, name + ' direct history read');
  await ok(getDocs(query(collection(db, K + 'suppliers/' + SID + '/orders'), orderBy('at', 'desc'), limit(20))), allowed, name + ' bounded history query');
  await ok(getDocs(collection(db, K + 'suppliers/' + SID + '/audit')), allowed, name + ' audit read');
  await ok(snap(db, 'supplierlinks/2026-10-20_' + CUT), allowed, name + ' occurrence read');
}

await ok(saveCatalogue(sous, catalogue({ v: 2, at: 20, by: 'sous' })), false, 'sous cannot change catalogue');
await ok(saveCatalogue(staff, catalogue({ v: 2, at: 20, by: 'head' })), false, 'staff cannot spoof head chef writer');
await ok(saveCatalogue(head, catalogue({ v: 2, at: 20, by: 'head' }), {}, SID, false), false, 'catalogue update without audit refused');
await ok(saveCatalogue(head, catalogue({ v: 3, at: 20, by: 'head' })), false, 'skipped catalogue revision refused');
await ok(saveCatalogue(head, catalogue({ v: 1, at: 20, by: 'head' })), false, 'stale catalogue revision refused');
await ok(saveCatalogue(head, catalogue({ v: 2, at: 20, by: 'head' }), { at: 21 }), false, 'mismatched audit time refused');
await ok(saveCatalogue(head, catalogue({ v: 2, at: 20, by: 'head' }), { by: 'sous' }), false, 'mismatched audit actor refused');
await ok(saveCatalogue(head, catalogue({ v: 2, at: 20, by: 'head', items: [{ ...item, par: '' }, { ...item, id: 'zero', par: '0' }] })), true, 'head saves blank and zero pars with paired audit');
const saved = (await snap(head, 'suppliers/' + SID)).data();
await ok(Promise.resolve().then(() => { if (saved.items[0].par !== '' || saved.items[1].par !== '0') throw Error('Par distinction lost'); }), true, 'blank par and zero survive round trip distinctly');
await ok(setDoc(doc(head, K + 'suppliers/' + SID + '/audit/2'), { v: 2, itemId: '', action: 'Rewrite', before: null, after: null, at: 20, by: 'head' }), false, 'an earlier audit cannot be rewritten');
await ok(setDoc(doc(head, K + 'suppliers/' + SID + '/audit/3'), { v: 3, itemId: '', action: 'Standalone', before: null, after: null, at: 30, by: 'head' }), false, 'standalone head audit without next catalogue revision refused');
await ok(saveCatalogue(head, catalogue({ name: 'New test vendor', cutoffId: '', by: 'head', at: 50 }), { action: 'Imported', before: null }, 'new-vendor'), true, 'head imports new catalogue with first audit');
await ok(saveCatalogue(head, catalogue({ name: 'New test vendor', cutoffId: '', by: 'head', v: 2, at: 51 }), {}, 'empty-vendor', false), false, 'head cannot create a new catalogue at arbitrary revision');

for (const [patch, label] of [
  [{ name: '' }, 'empty supplier name'], [{ name: 'x'.repeat(81) }, 'overlong supplier name'],
  [{ cutoffId: 'invalid cutoff' }, 'invalid cut-off id'], [{ v: 0 }, 'zero revision'],
  [{ v: 1.5 }, 'fractional revision'], [{ items: {} }, 'non-list catalogue'],
  [{ items: Array.from({ length: 601 }, () => item) }, 'oversized catalogue'],
  [{ unexpected: 'field' }, 'unknown catalogue field'], [{ at: -1 }, 'negative timestamp'], [{ by: '' }, 'empty writer']
]) await ok(setDoc(doc(owner, K + 'suppliers/invalid-catalogue'), catalogue(patch)), false, label + ' refused even for owner');

// Chef orders use the catalogue revision reviewed, and linked completion is one atomic save.
await ok(setDoc(doc(sous, K + 'suppliers/' + SID + '/orders/unlinked-sous'), order({ v: 2 })), true, 'sous records order without a configured reminder occurrence');
await ok(setDoc(doc(head, K + 'suppliers/' + SID + '/orders/unlinked-head'), order({ v: 2, by: 'head' })), true, 'head records order without a reminder');
await ok(setDoc(doc(staff, K + 'suppliers/' + SID + '/orders/forged'), order({ v: 2, by: 'sous' })), false, 'staff cannot save as sous chef');
await ok(setDoc(doc(sous, K + 'suppliers/' + SID + '/orders/stale-catalogue'), order({ v: 1 })), false, 'order from stale catalogue revision refused');
await ok(setDoc(doc(sous, K + 'suppliers/' + SID + '/orders/renamed'), order({ v: 2, supplierName: 'Different vendor' })), false, 'order supplier name must match current catalogue');
await ok(linked(sous, 'missing-link', { v: 2 }, { noLink: true }), false, 'linked order without occurrence ledger refused');
await ok(linked(sous, 'missing-cut', { v: 2 }, { noCut: true }), false, 'linked order without matching completion refused');
await ok(linked(sous, 'missing-order', { v: 2 }, { noOrder: true }), false, 'occurrence ledger cannot be planted without its order');
await ok(linked(sous, 'wrong-time', { v: 2 }, { cutPatch: { at: 99 } }), false, 'completion time must match saved order');
await ok(linked(sous, 'wrong-completion', { v: 2 }, { cutPatch: { on: false } }), false, 'linked order cannot leave completion off');
await ok(linked(sous, 'wrong-cutoff', { v: 2, cutoffId: 'another-cutoff' }), false, 'linked order cannot target another supplier cut-off');
await ok(linked(sous, 'ordered-first', { v: 2, at: 70 }), true, 'order, occurrence and completion save atomically');
await ok(linked(head, 'ordered-extra', { v: 2, at: 71, by: 'head' }, { linkV: 2 }), true, 'separate additional order shares occurrence with next ledger revision');
await ok(linked(sous, 'concurrent-loser', { v: 2, at: 72 }, { linkV: 2 }), false, 'stale occurrence version cannot overwrite another chef order');
await ok(Promise.resolve().then(async () => { if ((await snap(head, 'suppliers/' + SID + '/orders/concurrent-loser')).exists()) throw Error('Partial history saved'); }), true, 'refused concurrent save leaves no partial order');
await ok(updateDoc(doc(head, K + 'suppliers/' + SID + '/orders/ordered-first'), { lines: [line({ qty: '9 bags', amount: 9 })] }), false, 'chef cannot rewrite recorded quantities');
await ok(updateDoc(doc(owner, K + 'suppliers/' + SID + '/orders/ordered-first'), { lines: [line({ qty: '9 bags', amount: 9 })] }), false, 'owner cannot rewrite a saved snapshot either');
await ok(setDoc(doc(owner, K + 'suppliers/' + SID + '/orders/ordered-first'), (await snap(owner, 'suppliers/' + SID + '/orders/ordered-first')).data()), true, 'owner can repeat an unchanged PIN-migration copy');
await ok(setDoc(doc(head, K + 'cutdone/' + DAY + '_' + CUT), { day: DAY, sid: CUT, on: false, at: 80, by: 'head' }), true, 'existing untick reopens reminder independently');
await ok(Promise.resolve().then(async () => { if (!(await snap(head, 'suppliers/' + SID + '/orders/ordered-first')).exists()) throw Error('History removed'); }), true, 'unticking leaves order history intact');
await ok(setDoc(doc(sous, K + 'cutdone/' + DAY + '_' + CUT), { day: DAY, sid: CUT, on: true, at: 81, by: 'sous' }), true, 'older reminder-only completion remains compatible');

for (const [patch, label] of [
  [{ sid: 'wrong-supplier' }, 'wrong supplier path'], [{ supplierName: '' }, 'blank supplier name'],
  [{ lines: [] }, 'empty order'], [{ lines: Array.from({ length: 301 }, () => line()) }, 'oversized order'],
  [{ lines: {} }, 'non-list order lines'], [{ cutoffId: CUT, cutoffDay: '' }, 'half-linked order'],
  [{ cutoffId: '', cutoffDay: DAY }, 'missing cut-off id'], [{ day: 'Saturday' }, 'invalid order day'],
  [{ deliveryDay: 'Monday' }, 'invalid delivery day'], [{ unexpected: true }, 'unknown order field']
]) await ok(setDoc(doc(owner, K + 'suppliers/' + SID + '/orders/invalid-order'), order(patch)), false, label + ' refused');

// The Google owner can move old versions and their exact audit/history without manufacturing a new order or reminder.
await ok(setDoc(doc(owner, K + 'suppliers/copied-vendor'), catalogue({ name: 'Copied test vendor', v: 9 })), true, 'owner may copy an older catalogue revision to a new kitchen path');
await ok(setDoc(doc(owner, K + 'suppliers/copied-vendor/audit/7'), { v: 7, itemId: '', action: 'Prior edit', before: null, after: {}, at: 1, by: 'head' }), true, 'owner may copy earlier audit records');
await ok(setDoc(doc(owner, K + 'suppliers/copied-vendor/orders/copied-order'), order({ sid: 'copied-vendor', supplierName: 'Old test vendor name', v: 3, cutoffId: CUT, cutoffDay: '2026-01-05', by: 'head' })), true, 'owner may copy immutable old history without completing an old reminder again');
await ok(setDoc(doc(owner, K + 'supplierlinks/2026-01-05_' + CUT), { sid: 'copied-vendor', cutoffId: CUT, day: '2026-01-05', v: 5, orderId: 'copied-order', at: 1, by: 'head' }), true, 'owner may copy occurrence links');
for (const [p, label] of [
  ['suppliers/' + SID, 'catalogue'], ['suppliers/' + SID + '/audit/2', 'audit'],
  ['suppliers/' + SID + '/orders/ordered-first', 'history'], ['supplierlinks/' + DAY + '_' + CUT, 'occurrence']
]) await ok(deleteDoc(doc(owner, K + p)), false, 'no hard deletion of ' + label);
await ok(getDocs(collection(anon, K + 'suppliers/' + SID + '/unlisted')), false, 'no broad nested collection read is introduced');

// Use the real pinned Lite SDK, not the click-test stand-in. Auth belongs to one FirebaseApp and both Firestore
// clients obtain the same real emulator sign-in through its auth-internal provider. No per-client mock token is used.
const smokeApp = initializeApp({ apiKey: 'test-api-key', projectId: 'demo-test' }, 'supplier-lite-auth-smoke');
const auth = getAuth(smokeApp);
connectAuthEmulator(auth, 'http://' + (process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'), { disableWarnings: true });
const fullDb = getFirestore(smokeApp), liteDb = lite.getFirestore(smokeApp);
const [firestoreHost, firestorePort] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8089').split(':');
connectFirestoreEmulator(fullDb, firestoreHost, Number(firestorePort));
lite.connectFirestoreEmulator(liteDb, firestoreHost, Number(firestorePort));
const signed = await signInAnonymously(auth);
await env.withSecurityRulesDisabled(async ctx => {
  await setDoc(doc(ctx.firestore(), K + 'sessions/' + signed.user.uid), { by: 'head', pinAt: 1, exp: Date.now() + 60000, at: 1 });
});
await ok(Promise.resolve().then(() => {
  if (fullDb === liteDb || fullDb.app !== smokeApp || liteDb.app !== smokeApp || liteDb.type !== 'firestore-lite') throw Error('Firestore components not separated');
}), true, 'full and Lite clients share one app but separate Firestore components');
await ok(getDocFromServer(doc(fullDb, K + 'suppliers/' + SID)), true, 'full SDK uses the shared Auth sign-in and PIN session');
await ok(lite.getDoc(lite.doc(liteDb, K + 'suppliers/' + SID)), true, 'real Lite SDK uses the same Auth sign-in and PIN session');
const liveDay = '2026-10-25', liveId = 'real-lite-order', liveKey = liveDay + '_' + CUT;
await ok(lite.runTransaction(liteDb, async tx => {
  const or = lite.doc(liteDb, K + 'suppliers/' + SID + '/orders/' + liveId);
  const sr = lite.doc(liteDb, K + 'suppliers/' + SID), lr = lite.doc(liteDb, K + 'supplierlinks/' + liveKey);
  const prior = await tx.get(or), current = await tx.get(sr), ledger = await tx.get(lr);
  if (prior.exists() || ledger.exists()) throw Error('Smoke fixture already exists');
  const body = order({ v: current.data().v, at: 91, by: 'head', cutoffDay: liveDay, cutoffId: CUT });
  tx.set(or, body);
  tx.set(lr, { sid: SID, cutoffId: CUT, day: liveDay, v: 1, orderId: liveId, at: 91, by: 'head' });
  tx.set(lite.doc(liteDb, K + 'cutdone/' + liveKey), { sid: CUT, day: liveDay, on: true, at: 91, by: 'head' });
}), true, 'real Lite transaction records order, occurrence and completion together');
const liteOrders = lite.collection(liteDb, K + 'suppliers/' + SID + '/orders');
const first = await lite.getDocs(lite.query(liteOrders, lite.orderBy('at', 'desc'), lite.limit(1)));
const next = await lite.getDocs(lite.query(liteOrders, lite.orderBy('at', 'desc'), lite.startAfter(first.docs[0]), lite.limit(1)));
await ok(Promise.resolve().then(() => {
  if (first.size !== 1 || first.docs[0].id !== liveId || next.size !== 1 || next.docs[0].id === liveId) throw Error('Lite cursor repeated or lost an order');
}), true, 'real Lite history pages with DocumentSnapshot cursor');
await signOut(auth);
await ok(lite.getDoc(lite.doc(liteDb, K + 'suppliers/' + SID)), false, 'Auth sign-out removes Lite access even to a previously read catalogue');
await deleteApp(smokeApp);

await env.cleanup();
console.log((failures ? failures + ' failed' : 'All passed') + ' of ' + checks + ' supplier rules checks.');
process.exit(failures ? 1 : 0);
