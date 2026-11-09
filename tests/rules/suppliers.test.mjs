/* Supplier catalogue and orders: real Firestore rules on the emulator, with synthetic people and goods only. */
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously, signOut } from 'firebase/auth';
import { doc, collection, getDoc, getDocFromServer, getDocs, getFirestore, connectFirestoreEmulator, setDoc, updateDoc, deleteDoc, writeBatch, query, orderBy, limit } from 'firebase/firestore';
import * as lite from 'firebase/firestore/lite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import supplierCore from '../../js/supplier-core.js';
import { anonContext, dailySession, seedOwnerDevice } from './device-auth-fixtures.mjs';

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
const order = x => Object.assign({ sid: SID, supplierName: 'Test vendor', v: 1, at: 30, day: DAY, deliveryDay: '2026-10-26', cutoffDay: '', cutoffId: '', by: 'sous', lines: [line()] }, x || {});
const existing = order({ by: 'owner', at: 10 });
const sessionAt = Date.now();
await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  await setDoc(doc(db, K + 'config/main'), { headId: 'head', sousIds: ['head', 'sous', 'removed'], fnIds: ['function'], staffIds: ['head', 'sous', 'staff', 'lead', 'function'], people: [] });
  for (const id of ['head', 'sous', 'staff', 'lead', 'function', 'removed']) await setDoc(doc(db, K + 'pinset/' + id), { at: 1 });
  for (const [uid, by, pinAt, expired] of [
    ['head-phone', 'head', 1], ['sous-phone', 'sous', 1],
    ['staff-phone', 'staff', 1], ['lead-phone', 'lead', 1],
    ['function-phone', 'function', 1], ['removed-phone', 'removed', 1],
    ['expired-phone', 'head', 1, true], ['reset-phone', 'head', 0]
  ]) await setDoc(doc(db, K + 'sessions/' + uid), dailySession(by, { pinAt, at: expired ? sessionAt - 86400000 : sessionAt }));
  await setDoc(doc(db, K + 'suppliers/' + SID), catalogue());
  await setDoc(doc(db, K + 'suppliers/' + SID + '/orders/existing'), existing);
  await setDoc(doc(db, K + 'suppliers/' + SID + '/audit/1'), { v: 1, itemId: '', action: 'Imported', before: null, after: catalogue(), at: 1, by: 'owner' });
  await setDoc(doc(db, K + 'supplierlinks/2026-10-20_' + CUT), { sid: SID, cutoffId: CUT, day: '2026-10-20', v: 1, orderId: 'existing', at: 10, by: 'owner' });
});
await seedOwnerDevice(env, { pin: PIN, uid: 'owner', headId: 'head', at: sessionAt });

const phone = uid => anonContext(env, uid).firestore();
const owner = phone('owner');
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
for (const timestamp of [20, 19]) await ok(saveCatalogue(head, { ...saved, v: 3, at: timestamp, by: 'head' }), false, 'catalogue revision cannot reuse or regress its previous timestamp (' + timestamp + ')');
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
for (const timestamp of [20, 19]) await ok(setDoc(doc(sous, K + 'suppliers/' + SID + '/orders/catalogue-time-' + timestamp), order({ v: 2, at: timestamp })), false, 'new order must be later than the current catalogue timestamp (' + timestamp + ')');
await ok(setDoc(doc(sous, K + 'suppliers/' + SID + '/orders/unlinked-sous'), order({ v: 2 })), true, 'sous records order without a configured reminder occurrence');
await ok(setDoc(doc(head, K + 'suppliers/' + SID + '/orders/unlinked-head'), order({ v: 2, by: 'head' })), true, 'head records order without a reminder');
await ok(setDoc(doc(staff, K + 'suppliers/' + SID + '/orders/forged'), order({ v: 2, by: 'sous' })), false, 'staff cannot save as sous chef');
const unqualifiedLines = supplierCore.snapshotLines([{ ...item, orderUnit: '' }], { [item.id]: '1,5' }, { [item.id]: '0' });
await ok(setDoc(doc(sous, K + 'suppliers/' + SID + '/orders/number-only'), order({ v: 2, at: 68, lines: unqualifiedLines })), true, 'number-only order and stock save under the existing rules');
await ok(setDoc(doc(staff, K + 'suppliers/' + SID + '/orders/number-only-staff'), order({ v: 2, by: 'staff', lines: unqualifiedLines })), false, 'number-only quantities do not grant staff supplier writes');
await ok(Promise.resolve().then(async () => {
  const row = (await snap(sous, 'suppliers/' + SID + '/orders/number-only')).data().lines[0];
  if (row.amount !== 1.5 || row.unit !== '' || row.qty !== '1,5' || row.stock !== '0') throw Error('Unqualified snapshot changed');
}), true, 'unqualified quantities round trip without gaining a physical unit');
await ok(updateDoc(doc(sous, K + 'suppliers/' + SID + '/orders/number-only'), { lines: [line({ qty: '1.5 kg', amount: 1.5, unit: 'kg' })] }), false, 'saved number-only quantities cannot be relabelled later');
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
// Ticked on the order list first, then the quantities (5 Nov 2026): the tick has no order and no occurrence record,
// so the first recorded order creates the link at v 1 and takes over the tick with its own writer and time.
const TICKED = '2026-10-23';
await ok(setDoc(doc(sous, K + 'cutdone/' + TICKED + '_' + CUT), { day: TICKED, sid: CUT, on: true, at: 82, by: 'sous' }), true, 'order-list tick with no quantities');
await ok(linked(head, 'after-tick', { v: 2, at: 83, by: 'head', cutoffDay: TICKED }), true, 'the first recorded order after a tick saves with its occurrence and completion');
await ok(Promise.resolve().then(async () => {
  const l = (await snap(head, 'supplierlinks/' + TICKED + '_' + CUT)).data(), c = (await snap(head, 'cutdone/' + TICKED + '_' + CUT)).data();
  if (l.v !== 1 || l.orderId !== 'after-tick' || c.on !== true || c.by !== 'head' || c.at !== 83) throw Error('Tick and order out of step');
}), true, 'the occurrence links that order and the tick stays on');
await ok(linked(sous, 'after-tick-again', { v: 2, at: 84, cutoffDay: TICKED }), false, 'a second order on that cut-off without the next occurrence revision is still refused');

for (const [patch, label] of [
  [{ sid: 'wrong-supplier' }, 'wrong supplier path'], [{ supplierName: '' }, 'blank supplier name'],
  [{ lines: [] }, 'empty order'], [{ lines: Array.from({ length: 301 }, () => line()) }, 'oversized order'],
  [{ lines: {} }, 'non-list order lines'], [{ cutoffId: CUT, cutoffDay: '' }, 'half-linked order'],
  [{ cutoffId: '', cutoffDay: DAY }, 'missing cut-off id'], [{ day: 'Saturday' }, 'invalid order day'],
  [{ deliveryDay: 'Monday' }, 'invalid delivery day'], [{ unexpected: true }, 'unknown order field']
]) await ok(setDoc(doc(owner, K + 'suppliers/' + SID + '/orders/invalid-order'), order(patch)), false, label + ' refused');

// The owner device can move old versions and their exact audit/history without manufacturing a new order or reminder.
await ok(setDoc(doc(owner, K + 'suppliers/copied-vendor'), catalogue({ name: 'Copied test vendor', v: 9 })), true, 'owner may copy an older catalogue revision to a new kitchen path');
await ok(setDoc(doc(owner, K + 'suppliers/copied-vendor/audit/7'), { v: 7, itemId: '', action: 'Prior edit', before: null, after: {}, at: 1, by: 'head' }), true, 'owner may copy earlier audit records');
await ok(setDoc(doc(owner, K + 'suppliers/copied-vendor/orders/copied-order'), order({ sid: 'copied-vendor', supplierName: 'Old test vendor name', v: 3, cutoffId: CUT, cutoffDay: '2026-01-05', by: 'head' })), true, 'owner may copy immutable old history without completing an old reminder again');
await ok(setDoc(doc(owner, K + 'supplierlinks/2026-01-05_' + CUT), { sid: 'copied-vendor', cutoffId: CUT, day: '2026-01-05', v: 5, orderId: 'copied-order', at: 1, by: 'head' }), true, 'owner may copy occurrence links');
for (const [p, label] of [
  ['suppliers/' + SID, 'catalogue'], ['suppliers/' + SID + '/audit/2', 'audit'],
  ['suppliers/' + SID + '/orders/ordered-first', 'history'], ['supplierlinks/' + DAY + '_' + CUT, 'occurrence']
]) await ok(deleteDoc(doc(owner, K + p)), false, 'no hard deletion of ' + label);
await ok(getDocs(collection(anon, K + 'suppliers/' + SID + '/unlisted')), false, 'no broad nested collection read is introduced');

// Split suppliers keep the original order history and add immutable same-kitchen lineage.
const SPLIT_SOURCE = 'split-source', SPLIT_TARGET = 'split-target', SPLIT_AT = 120;
const splitMoved = { ...item, id: 'split-moved', name: 'TEST SPLIT MOVED ITEM', source: { ...source, name: 'TEST SPLIT MOVED ITEM' } };
const splitKept = { ...item, id: 'split-kept', name: 'TEST SPLIT KEPT ITEM', source: { ...source, name: 'TEST SPLIT KEPT ITEM', row: 2 } };
const splitOriginal = catalogue({ name: 'Test combined supplier', cutoffId: '', items: [splitMoved, splitKept] });
const splitOrder = order({ sid: SPLIT_SOURCE, supplierName: splitOriginal.name, at: 100,
  lines: [line({ itemId: splitMoved.id, name: splitMoved.name, source: splitMoved.source })] });
await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  await setDoc(doc(db, K + 'suppliers/' + SPLIT_SOURCE), splitOriginal);
  await setDoc(doc(db, K + 'suppliers/' + SPLIT_SOURCE + '/orders/before-split'), splitOrder);
  await setDoc(doc(db, K + 'suppliers/atomic-split-source'), splitOriginal);
});
function splitWrite(db, options = {}) {
  const sourceId = options.sourceId || SPLIT_SOURCE, targetId = options.targetId || SPLIT_TARGET;
  const currentSource = options.currentSource || splitOriginal;
  const sourceNext = { ...currentSource, name: 'Test separate source', v: currentSource.v + 1, at: SPLIT_AT, by: options.by || 'head',
    items: currentSource.items.map(entry => entry.id === splitMoved.id ? { ...entry, archived: true } : entry), ...(options.sourcePatch || {}) };
  const targetNext = catalogue({ name: 'Test separate target', cutoffId: 'separate-cutoff', items: [splitMoved], at: SPLIT_AT, by: options.by || 'head',
    historyFrom: sourceId, historyBefore: SPLIT_AT, ...(options.targetPatch || {}) });
  const b = writeBatch(db);
  if (!options.noSource) b.set(doc(db, K + 'suppliers/' + sourceId), sourceNext);
  if (!options.noSourceAudit) b.set(doc(db, K + 'suppliers/' + sourceId + '/audit/' + sourceNext.v), {
    v: sourceNext.v, itemId: '', action: 'split-source', before: currentSource, after: sourceNext, at: sourceNext.at, by: sourceNext.by });
  b.set(doc(db, K + 'suppliers/' + targetId), targetNext);
  if (!options.noTargetAudit) b.set(doc(db, K + 'suppliers/' + targetId + '/audit/1'), {
    v: 1, itemId: '', action: 'split-supplier', before: { sourceSid: sourceId }, after: targetNext, at: targetNext.at, by: targetNext.by });
  if (options.oldSourceOrder) b.set(doc(db, K + 'suppliers/' + sourceId + '/orders/batched-old-order'), {
    ...splitOrder, sid: sourceId, v: currentSource.v, supplierName: currentSource.name, at: SPLIT_AT - 1, by: options.by || 'head' });
  return b.commit();
}
await ok(splitWrite(sous, { by: 'sous' }), false, 'sous cannot split a supplier or set lineage');
await ok(splitWrite(staff, { by: 'head' }), false, 'staff cannot forge a head-chef split');
await ok(splitWrite(phone('function-phone'), { by: 'function' }), false, 'function-only session cannot split a supplier');
await ok(splitWrite(anon), false, 'signed-out device cannot split a supplier');
await ok(splitWrite(head, { noSource: true, noSourceAudit: true }), false, 'head cannot create lineage without the parent catalogue update');
await ok(splitWrite(head, { noSourceAudit: true }), false, 'source catalogue must have its paired split audit');
await ok(splitWrite(head, { noTargetAudit: true }), false, 'new target must have its paired split audit');
await ok(splitWrite(head, { sourcePatch: { at: SPLIT_AT + 1 } }), false, 'source and target split timestamps must match');
await ok(splitWrite(head, { targetPatch: { historyBefore: SPLIT_AT - 1 } }), false, 'new lineage cutoff must equal its atomic split timestamp');
await ok(splitWrite(head, { sourceId: 'atomic-split-source', targetId: 'atomic-split-target', oldSourceOrder: true }), false, 'split cannot batch a backdated source order against the pre-split catalogue');
await ok(Promise.resolve().then(async () => {
  if ((await snap(head, 'suppliers/' + SPLIT_SOURCE)).data().v !== 1 || (await snap(head, 'suppliers/' + SPLIT_TARGET)).exists()) throw Error('A refused split saved a partial catalogue');
}), true, 'refused split attempts leave both catalogues unchanged');
for (const [patch, label] of [
  [{ historyFrom: SPLIT_SOURCE }, 'missing lineage timestamp'],
  [{ historyBefore: SPLIT_AT }, 'missing lineage supplier'],
  [{ historyFrom: 'invalid/path', historyBefore: SPLIT_AT }, 'foreign lineage path'],
  [{ historyFrom: 'invalid-lineage', historyBefore: SPLIT_AT }, 'self-referential lineage'],
  [{ historyFrom: SPLIT_SOURCE, historyBefore: 0 }, 'zero lineage timestamp'],
  [{ historyFrom: SPLIT_SOURCE, historyBefore: -1 }, 'negative lineage timestamp'],
  [{ historyFrom: SPLIT_SOURCE, historyBefore: '120' }, 'text lineage timestamp'],
  [{ historyFrom: SPLIT_SOURCE, historyBefore: SPLIT_AT + 1 }, 'future lineage timestamp'],
  [{ historyFrom: '', historyBefore: SPLIT_AT }, 'empty lineage supplier']
]) await ok(setDoc(doc(owner, K + 'suppliers/invalid-lineage'), catalogue({ at: SPLIT_AT, ...patch })), false, label + ' refused even for owner');
await ok(splitWrite(head), true, 'head atomically archives source references and creates target with both audits');
const splitSaved = (await snap(head, 'suppliers/' + SPLIT_TARGET)).data();
await ok(Promise.resolve().then(async () => {
  const sourceAfter = (await snap(head, 'suppliers/' + SPLIT_SOURCE)).data();
  if (!sourceAfter.items.find(entry => entry.id === splitMoved.id)?.archived || splitSaved.items[0].id !== splitMoved.id || splitSaved.historyFrom !== SPLIT_SOURCE || splitSaved.historyBefore !== SPLIT_AT) throw Error('Split identity or lineage changed');
  assert.deepEqual((await snap(head, 'suppliers/' + SPLIT_SOURCE + '/orders/before-split')).data(), splitOrder, 'Original history was rewritten');
}), true, 'split retains item identity, archived source and immutable original quantities');
await ok(snap(sous, 'suppliers/' + SPLIT_TARGET), true, 'sous can read the new supplier lineage');
await ok(getDocs(query(collection(sous, K + 'suppliers/' + SPLIT_SOURCE + '/orders'), orderBy('at', 'desc'), limit(20))), true, 'sous keeps bounded access to original split history');
await ok(snap(staff, 'suppliers/' + SPLIT_TARGET), false, 'new lineage does not expose supplier data to staff');
await ok(snap(phone('function-phone'), 'suppliers/' + SPLIT_TARGET), false, 'new lineage does not expose supplier data to function-only accounts');
await ok(saveCatalogue(head, { ...splitSaved, v: 2, at: 130, by: 'head', items: [{ ...splitMoved, par: '3' }] }, {}, SPLIT_TARGET), true, 'head can change a par while retaining immutable lineage');
const splitEdited = (await snap(head, 'suppliers/' + SPLIT_TARGET)).data();
await ok(setDoc(doc(sous, K + 'suppliers/' + SPLIT_SOURCE + '/orders/source-at-split'), order({ sid: SPLIT_SOURCE, supplierName: 'Test separate source', v: 2, at: SPLIT_AT,
  lines: [line({ itemId: splitKept.id, name: splitKept.name, source: splitKept.source })] })), false, 'post-split source order cannot be backdated to the inherited history cutoff');
for (const timestamp of [SPLIT_AT, splitEdited.at]) await ok(setDoc(doc(sous, K + 'suppliers/' + SPLIT_TARGET + '/orders/target-time-' + timestamp), order({ sid: SPLIT_TARGET, supplierName: splitEdited.name, v: splitEdited.v, at: timestamp,
  lines: [line({ itemId: splitMoved.id, name: splitMoved.name, source: splitMoved.source })] })), false, 'target order cannot use the split cutoff or its current catalogue timestamp (' + timestamp + ')');
await ok(setDoc(doc(sous, K + 'suppliers/' + SPLIT_TARGET + '/orders/after-current-catalogue'), order({ sid: SPLIT_TARGET, supplierName: splitEdited.name, v: splitEdited.v, at: splitEdited.at + 1,
  lines: [line({ itemId: splitMoved.id, name: splitMoved.name, source: splitMoved.source })] })), true, 'new target order after its current catalogue timestamp succeeds');
await ok(setDoc(doc(owner, K + 'suppliers/' + SPLIT_SOURCE + '/orders/restored-old-source'), splitOrder), true, 'owner may restore an exact old source order before the split cutoff');
await ok(setDoc(doc(owner, K + 'suppliers/' + SPLIT_TARGET + '/orders/restored-old-target'), { ...splitOrder, sid: SPLIT_TARGET, supplierName: splitSaved.name, at: 110 }), true, 'owner may restore an exact old target snapshot before the split cutoff');
for (const [patch, label] of [
  [{ historyFrom: SID }, 'change source supplier'],
  [{ historyBefore: SPLIT_AT - 1 }, 'move history cutoff'],
  [{ historyFrom: undefined, historyBefore: undefined }, 'erase lineage pair']
]) {
  const value = { ...splitEdited, v: 3, at: 140, by: 'head', ...patch };
  for (const field of ['historyFrom', 'historyBefore']) if (value[field] === undefined) delete value[field];
  await ok(saveCatalogue(head, value, {}, SPLIT_TARGET), false, 'head cannot ' + label + ' after split');
  await ok(saveCatalogue(owner, { ...value, by: 'owner' }, {}, SPLIT_TARGET), false, 'owner cannot ' + label + ' after split');
}
await ok(saveCatalogue(owner, { ...splitOriginal, v: 3, at: 150, historyFrom: SID, historyBefore: 140 }, {}, SPLIT_SOURCE), false, 'existing supplier cannot acquire fabricated lineage in a later update');
await ok(splitWrite(head, { sourceId: SPLIT_TARGET, targetId: 'split-chain', currentSource: splitEdited,
  sourcePatch: { at: 160 }, targetPatch: { at: 160, historyBefore: 160 } }), false, 'head cannot create chained split ancestry');
await ok(setDoc(doc(owner, K + 'suppliers/restored-split'), splitEdited), true, 'owner PIN migration can copy exact lineage without a new parent split');
await ok(setDoc(doc(owner, K + 'suppliers/restored-split'), splitEdited), true, 'repeating the same lineage copy is harmless');
await ok(Promise.resolve().then(async () => {
  const copied = (await snap(owner, 'suppliers/restored-split')).data();
  assert.deepEqual(copied, splitEdited, 'Copied lineage changed');
}), true, 'lineage and historical cutoff survive the owner copy exactly');
const restoredBeforeParent = { ...splitEdited, historyFrom: 'not-yet-restored-parent' };
await ok(setDoc(doc(owner, K + 'suppliers/restored-before-parent'), restoredBeforeParent), true, 'owner backup restore can copy lineage before its parent catalogue is restored');
await ok(Promise.resolve().then(async () => {
  assert.equal((await snap(owner, 'suppliers/not-yet-restored-parent')).exists(), false, 'Restore parent unexpectedly exists');
  assert.deepEqual((await snap(owner, 'suppliers/restored-before-parent')).data(), restoredBeforeParent, 'Early restore changed the raw lineage');
}), true, 'early owner restore retains exact lineage without requiring the parent yet');

// A destination already used for orders keeps its own identities and snapshots when the combined history is attached.
const ATTACH_SOURCE = 'existing-split-source', ATTACH_TARGET = 'existing-split-target', ATTACH_AT = 200;
const attachItems = ['stock', 'case', 'zero', 'dry', 'other'].map((name, index) => ({ ...item,
  id: 'parent-' + name, name: 'TEST ATTACH ' + name.toUpperCase(), source: { ...source, row: index + 1, name: 'TEST ATTACH ' + name.toUpperCase() } }));
const attachOriginal = catalogue({ name: 'Test existing combined supplier', cutoffId: 'dry-cutoff', items: attachItems });
const ownAttachItems = attachItems.slice(0, 2).map(entry => ({ ...entry, id: entry.id.replace('parent-', 'seafood-'), par: '7',
  source: { ...entry.source, file: 'test-existing-seafood.pdf' } }));
const attachDestination = catalogue({ name: 'Test existing seafood supplier', cutoffId: 'seafood-cutoff', v: 4, at: 80, items: ownAttachItems });
const attachMap = Object.fromEntries(attachItems.slice(0, 3).map((entry, index) => [entry.id, ownAttachItems[index]?.id || entry.id]));
const attachSourceOrder = order({ sid: ATTACH_SOURCE, supplierName: attachOriginal.name, at: 100,
  lines: attachItems.map(entry => line({ itemId: entry.id, name: entry.name, source: entry.source })) });
const attachOwnOrder = order({ sid: ATTACH_TARGET, supplierName: attachDestination.name, v: 4, at: 110,
  lines: [line({ itemId: ownAttachItems[0].id, name: ownAttachItems[0].name, qty: '11 bags', amount: 11, source: ownAttachItems[0].source })] });
await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  for (const [id, data] of [[ATTACH_SOURCE, attachOriginal], [ATTACH_TARGET, attachDestination], ['mapped-create-source', splitOriginal],
    ['mutual-split-a', splitOriginal], ['mutual-split-b', splitOriginal]])
    await setDoc(doc(db, K + 'suppliers/' + id), data);
  await setDoc(doc(db, K + 'suppliers/' + ATTACH_SOURCE + '/orders/previous'), attachSourceOrder);
  await setDoc(doc(db, K + 'suppliers/' + ATTACH_TARGET + '/orders/previous'), attachOwnOrder);
});
function attachSplitWrite(db, options = {}) {
  const by = options.by || 'head';
  const sourceNext = { ...attachOriginal, v: 2, at: ATTACH_AT, by,
    items: attachItems.map((entry, index) => index < 3 ? { ...entry, archived: true } : entry), ...(options.sourcePatch || {}) };
  const targetNext = { ...attachDestination, v: 5, at: ATTACH_AT, by, items: [...ownAttachItems, attachItems[2]],
    historyFrom: ATTACH_SOURCE, historyBefore: ATTACH_AT, historyItems: attachMap, ...(options.targetPatch || {}) };
  const b = writeBatch(db);
  if (!options.noSource) b.set(doc(db, K + 'suppliers/' + ATTACH_SOURCE), sourceNext);
  if (!options.noSourceAudit) b.set(doc(db, K + 'suppliers/' + ATTACH_SOURCE + '/audit/' + sourceNext.v), {
    v: sourceNext.v, itemId: '', action: 'split-source', before: attachOriginal, after: sourceNext, at: sourceNext.at, by: sourceNext.by });
  b.set(doc(db, K + 'suppliers/' + ATTACH_TARGET), targetNext);
  if (!options.noTargetAudit) b.set(doc(db, K + 'suppliers/' + ATTACH_TARGET + '/audit/' + targetNext.v), {
    v: targetNext.v, itemId: '', action: 'split-supplier', before: attachDestination, after: targetNext, at: targetNext.at, by: targetNext.by });
  if (options.oldTargetOrder) b.set(doc(db, K + 'suppliers/' + ATTACH_TARGET + '/orders/backdated-attachment'), {
    ...attachOwnOrder, at: ATTACH_AT - 1, by });
  return b.commit();
}
await ok(Promise.resolve().then(() => {
  const b = writeBatch(head);
  for (const [sid, parent] of [['mutual-split-a', 'mutual-split-b'], ['mutual-split-b', 'mutual-split-a']]) {
    const next = { ...splitOriginal, v: 2, at: ATTACH_AT, by: 'head', historyFrom: parent, historyBefore: ATTACH_AT };
    b.set(doc(head, K + 'suppliers/' + sid), next);
    b.set(doc(head, K + 'suppliers/' + sid + '/audit/2'), { v: 2, itemId: '', action: 'split-supplier',
      before: splitOriginal, after: next, at: ATTACH_AT, by: 'head' });
  }
  return b.commit();
}), false, 'two existing suppliers cannot acquire mutual lineage in the same batch');
for (const [db, by, label] of [[sous, 'sous', 'sous'], [staff, 'head', 'staff'], [phone('function-phone'), 'function', 'function-only session'], [anon, 'head', 'signed-out device']])
  await ok(attachSplitWrite(db, { by }), false, label + ' cannot attach lineage to an existing destination');
for (const [options, label] of [
  [{ noSource: true, noSourceAudit: true }, 'unpaired parent'],
  [{ noSourceAudit: true }, 'missing source audit'], [{ noTargetAudit: true }, 'missing target audit'],
  [{ sourcePatch: { v: 3 } }, 'skipped source revision'], [{ targetPatch: { v: 6 } }, 'skipped destination revision'],
  [{ sourcePatch: { at: ATTACH_AT + 1 } }, 'different parent timestamp'], [{ sourcePatch: { by: 'sous' } }, 'different parent writer'],
  [{ targetPatch: { historyBefore: ATTACH_AT - 1 } }, 'earlier attachment boundary'],
  [{ targetPatch: { at: attachDestination.at, historyBefore: attachDestination.at } }, 'reused destination timestamp'],
  [{ oldTargetOrder: true }, 'backdated destination order against the old catalogue']
]) await ok(attachSplitWrite(head, options), false, 'existing destination attachment refuses ' + label);
for (const [patch, label] of [
  [{ historyItems: attachMap }, 'map without lineage'],
  [{ historyFrom: ATTACH_SOURCE, historyItems: attachMap }, 'map without cutoff'],
  [{ historyBefore: ATTACH_AT, historyItems: attachMap }, 'map without parent'],
  ...[null, [], 'invalid', {}, Object.fromEntries(Array.from({ length: 601 }, (_, index) => ['item-' + index, 'target-' + index]))]
    .map((historyItems, index) => [{ historyFrom: ATTACH_SOURCE, historyBefore: ATTACH_AT, historyItems }, ['null map', 'list map', 'text map', 'empty map', 'oversized map'][index]])
]) await ok(setDoc(doc(owner, K + 'suppliers/invalid-history-map'), catalogue({ at: ATTACH_AT, ...patch })), false, label + ' refused even for owner restore');
await ok(Promise.resolve().then(async () => {
  assert.deepEqual((await snap(head, 'suppliers/' + ATTACH_SOURCE)).data(), attachOriginal);
  assert.deepEqual((await snap(head, 'suppliers/' + ATTACH_TARGET)).data(), attachDestination);
}), true, 'refused existing destination attachments leave both catalogues unchanged');
await ok(attachSplitWrite(head), true, 'head attaches mapped history to an existing destination with both catalogue revisions and audits');
const attached = (await snap(head, 'suppliers/' + ATTACH_TARGET)).data();
await ok(Promise.resolve().then(async () => {
  assert.equal(attached.v, 5); assert.equal(attached.historyFrom, ATTACH_SOURCE); assert.equal(attached.historyBefore, ATTACH_AT);
  assert.deepEqual(attached.historyItems, attachMap);
  assert.deepEqual(attached.items.slice(0, 2), ownAttachItems);
  assert.equal(attached.items[2].id, attachItems[2].id);
  assert.deepEqual((await snap(head, 'suppliers/' + ATTACH_SOURCE + '/orders/previous')).data(), attachSourceOrder);
  assert.deepEqual((await snap(head, 'suppliers/' + ATTACH_TARGET + '/orders/previous')).data(), attachOwnOrder);
  assert.equal((await snap(head, 'suppliers/' + ATTACH_SOURCE + '/audit/2')).data().at, ATTACH_AT);
  assert.equal((await snap(head, 'suppliers/' + ATTACH_TARGET + '/audit/5')).data().at, ATTACH_AT);
}), true, 'attachment preserves two saved item identities and both colliding old order IDs with exact quantities');
await ok(saveCatalogue(head, { ...attached, v: 6, at: 210, by: 'head', items: attached.items.map(entry => ({ ...entry, par: '9' })) }, {}, ATTACH_TARGET), true, 'ordinary destination edit retains the complete immutable history map');
const attachedEdited = (await snap(head, 'suppliers/' + ATTACH_TARGET)).data();
for (const [patch, label] of [
  [{ historyItems: { ...attachMap, [attachItems[0].id]: ownAttachItems[1].id } }, 'remap a source item'],
  [{ historyItems: { ...attachMap, 'parent-extra': 'seafood-extra' } }, 'add a mapped item'],
  [{ historyItems: Object.fromEntries(Object.entries(attachMap).slice(1)) }, 'remove a mapped item'],
  [{ historyItems: undefined }, 'strip the map'],
  [{ historyFrom: undefined, historyBefore: undefined, historyItems: undefined }, 'strip all lineage'],
  [{ historyFrom: SID }, 'change the mapped parent'], [{ historyBefore: ATTACH_AT - 1 }, 'change the mapped boundary']
]) {
  const value = { ...attachedEdited, v: attachedEdited.v + 1, at: 220, by: 'head', ...patch };
  for (const field of ['historyFrom', 'historyBefore', 'historyItems']) if (value[field] === undefined) delete value[field];
  await ok(saveCatalogue(head, value, {}, ATTACH_TARGET), false, 'head cannot ' + label + ' after attachment');
  await ok(saveCatalogue(owner, value, {}, ATTACH_TARGET), false, 'owner cannot ' + label + ' after attachment');
}
await ok(saveCatalogue(head, { ...splitEdited, v: 3, at: 170, by: 'head', historyItems: { [splitMoved.id]: splitMoved.id } }, {}, SPLIT_TARGET), false, 'older identity-lineage destination cannot acquire a map later');
await ok(splitWrite(head, { sourceId: 'mapped-create-source', targetId: 'mapped-create-target', targetPatch: { historyItems: { [splitMoved.id]: splitMoved.id } } }), true, 'new destination creation also permits a bounded map with its paired split');
const restoredMapped = { ...attachedEdited, historyFrom: 'mapped-parent-not-restored' };
await ok(setDoc(doc(owner, K + 'suppliers/restored-mapped-before-parent'), restoredMapped), true, 'owner raw restore copies a mapped destination before its parent exists');
await ok(setDoc(doc(owner, K + 'suppliers/restored-mapped-before-parent'), restoredMapped), true, 'owner may repeat the exact mapped raw restore');
await ok(Promise.resolve().then(async () => {
  assert.equal((await snap(owner, 'suppliers/mapped-parent-not-restored')).exists(), false);
  assert.deepEqual((await snap(owner, 'suppliers/restored-mapped-before-parent')).data(), restoredMapped);
}), true, 'owner restore retains the raw map and original boundary exactly');

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
  await setDoc(doc(ctx.firestore(), K + 'sessions/' + signed.user.uid), dailySession('head'));
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
