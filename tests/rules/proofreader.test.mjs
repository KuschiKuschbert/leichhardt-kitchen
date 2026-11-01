// Synthetic admin repairs and shared spelling words, against the real Firestore emulator only.
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, collection, query, orderBy, limit, getDoc, getDocFromServer, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, setLogLevel } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { anonContext, dailySession, seedOwnerDevice } from './device-auth-fixtures.mjs';
setLogLevel(process.env.RULE_DEBUG ? 'error' : 'silent');
const K = 'kitchens/000000/', email = 'owner@test.local', at = Date.now();
const today = new Date(at + 10 * 3600000).toISOString().slice(0, 10);
const env = await initializeTestEnvironment({ projectId: 'demo-proofreader', firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8').replaceAll('KITCHEN_PIN', '000000').replaceAll('OWNER_EMAIL', email) } });
await env.clearFirestore();
const roles = { owner: '', ownkit: 'kit', kit: 'kit', sam: 'sam', ann: 'ann', lou: 'lou', vic: 'vic', fay: 'fay', tab: 'bo', anonymous: '', unverified: '', other: '' };
const dbs = Object.fromEntries(Object.keys(roles).map(r => [r, (r === 'unverified' ? env.authenticatedContext(r, { email, email_verified: false })
  : r === 'other' ? env.authenticatedContext(r, { email: 'other@test.local', email_verified: true }) : anonContext(env, r)).firestore()]));
dbs.signedout = env.unauthenticatedContext().firestore();
const config = { staffIds: ['kit', 'sam', 'ann', 'lou', 'vic', 'fay', 'bo'], sousIds: ['kit', 'sam'], headId: 'kit', fnIds: ['fay'], fnOnlyIds: ['fay'], people: [], by: 'sam' };
const line = { text: 'Cut brine', orig: 'cut brie', qty: '2', station: 'Larder', recipe: 'wrong', done: false, deleted: false, addedBy: 'Ann', addedById: 'ann', addedAt: at - 3600000, by: 'ann' };
const p = `days/${today}/items/line`, o = `orders/${today}/lines/line`;
let checks = 0, failed = 0;
async function expect(label, allowed, action) {
  let got;
  try { await action(); got = true; }
  catch (e) { if (e.code !== 'permission-denied') throw e; if (process.env.RULE_DEBUG && allowed) console.log('DEBUG ' + label + ': ' + e.message); got = false; }
  checks++;
  if (got !== allowed) { failed++; console.log('FAIL ' + label + ': ' + (got ? 'allowed' : 'refused')); }
}
async function seed(values) { await env.withSecurityRulesDisabled(async c => { const db = c.firestore(), b = writeBatch(db); for (const [path, data] of Object.entries(values)) data === null ? b.delete(doc(db, K + path)) : b.set(doc(db, K + path), data); await b.commit(); }); }
async function reset() {
  const values = { 'config/main': config, [p]: line, [o]: { ...line, recipes: ['wrong'], ordered: false }, 'proofHistory/line-event': null, 'proofHistory/word-event': null };
  for (const [r, id] of Object.entries(roles)) if (id) { values['pinset/' + id] = { at: 1 }; values['sessions/' + r] = dailySession(id, { at }); }
  await seed(values);
  for (const uid of ['owner', 'ownkit']) await seedOwnerDevice(env, { uid, headId: 'kit', at });
}
const by = r => roles[r] || '';
function repair(db, role, source = 'prep', options = {}) {
  const sourcePath = source === 'prep' ? p : o;
  const ev = { kind: 'line', action: 'restore', source, day: today, recordId: 'line', before: line.text, after: line.orig, original: line.orig, v: 1, at, by: by(role), ...options.event };
  const value = { text: ev.after, proofV: ev.v, proofEvent: 'line-event', by: by(role), ...(source === 'prep' ? { recipe: '' } : { recipes: [] }), ...options.value };
  const b = writeBatch(db);
  if (options.source !== false) b.update(doc(db, K + sourcePath), value);
  if (options.audit !== false) b.set(doc(db, K + 'proofHistory/line-event'), ev);
  if (options.stamp) b.set(doc(db, K + 'config/main'), { pastEdit: { [source === 'prep' ? 'p' : 'o']: at }, by: by(role) }, { merge: true });
  return b.commit();
}
function word(db, role, options = {}) {
  const ev = { kind: 'word', action: 'keep', word: 'brie', v: 1, at, by: by(role), ...options.event };
  const b = writeBatch(db);
  if (options.source !== false) b.set(doc(db, K + 'config/main'), { proofWords: ['brie'], proofV: 1, proofEvent: 'word-event', by: by(role), ...options.value }, { merge: true });
  if (options.audit !== false) b.set(doc(db, K + 'proofHistory/word-event'), ev);
  return b.commit();
}

for (const [r, db] of Object.entries(dbs)) {
  const admin = r === 'owner' || r === 'ownkit';
  await reset();
  await expect(r + ' atomic prep restoration', admin, () => repair(db, r, 'prep', { stamp: true }));
  await reset();
  await expect(r + ' atomic order edit', admin, () => repair(db, r, 'orders', { event: { action: 'edit', after: 'Cut soft cheese' }, stamp: true }));
  await reset();
  await expect(r + ' atomic shared word', admin, () => word(db, r));
  await seed({ 'proofHistory/existing': { kind: 'word', action: 'keep', word: 'brie', v: 1, at, by: '' } });
  await expect(r + ' audit get', admin, () => getDoc(doc(db, K + 'proofHistory/existing')));
  await expect(r + ' audit list', admin, () => getDocs(query(collection(db, K + 'proofHistory'), orderBy('at', 'desc'), limit(30))));
  await expect(r + ' source server read', !['signedout', 'anonymous', 'unverified', 'other', 'fay'].includes(r), () => getDocFromServer(doc(db, K + p)));
  await expect(r + ' shared words config read', !['signedout', 'anonymous', 'unverified', 'other', 'fay'].includes(r), () => getDoc(doc(db, K + 'config/main')));
  await expect(r + ' unchanged audit copy retry', admin, () => setDoc(doc(db, K + 'proofHistory/existing'), { kind: 'word', action: 'keep', word: 'brie', v: 1, at, by: '' }));
  await expect(r + ' immutable audit update', false, () => updateDoc(doc(db, K + 'proofHistory/existing'), { word: 'cream' }));
  await expect(r + ' immutable audit delete', false, () => deleteDoc(doc(db, K + 'proofHistory/existing')));
}
const owner = dbs.owner;
await reset();
for (const [label, options] of [
  ['without audit', { audit: false }],
  ['wrong source version', { value: { proofV: 2 } }], ['stale audit version', { event: { v: 2 } }],
  ['wrong before', { event: { before: 'Other text' } }], ['wrong original', { event: { original: 'Another word' } }],
  ['wrong after', { value: { text: 'Another word' } }], ['restore to invented wording', { event: { after: 'Another word' } }],
  ['empty wording', { event: { action: 'edit', after: '' } }], ['blank wording', { event: { action: 'edit', after: '   ' } }],
  ['unchanged wording', { event: { action: 'edit', after: line.text } }], ['long prep wording', { event: { action: 'edit', after: 'x'.repeat(161) } }],
  ['wrong by', { event: { by: 'sam' } }], ['wrong day', { event: { day: '2026-01-01' } }],
  ['wrong source', { event: { source: 'orders' } }], ['wrong record', { event: { recordId: 'other' } }], ['changed quantity', { value: { qty: '9' } }],
  ['changed original', { value: { orig: 'Changed original' } }], ['changed tick', { value: { done: true } }],
  ['unknown event fields', { event: { privateNote: 'extra' } }], ['unknown action', { event: { action: 'replace' } }],
  ['future time', { event: { at: at + 86400000 } }], ['negative time', { event: { at: -1 } }]
]) await expect('repair ' + label, false, () => repair(owner, 'owner', 'prep', options));
await expect('order length limit', false, () => repair(owner, 'owner', 'orders', { event: { action: 'edit', after: 'x'.repeat(121) } }));
for (const change of [{ deleted: true }, { fn: 'booking' }, { orig: '' }]) {
  await seed({ [p]: { ...line, ...change } });
  await expect('cannot repair removed, function or uncorrected line ' + JSON.stringify(change), false, () => repair(owner, 'owner'));
}
await reset();
await expect('valid source-only ordinary Undo before admin repair', true, () => updateDoc(doc(dbs.ann, K + p), { text: line.orig, orig: '', by: 'ann' }));
await reset();
await expect('valid admin repair', true, () => repair(owner, 'owner'));
await expect('exact successful repair can retry without a second mutation', true, () => repair(owner, 'owner'));
await expect('stale repair cannot overwrite first version', false, () => repair(owner, 'owner', 'prep', { event: { action: 'edit', after: 'Outdated wording' } }));
for (const r of ['owner', 'ownkit', 'kit', 'sam', 'ann', 'lou', 'vic', 'tab']) {
  await expect(r + ' stale Undo after admin repair', false, () => updateDoc(doc(dbs[r], K + p), { text: line.text, orig: '', by: by(r) }));
  await expect(r + ' cannot strip repair version', false, () => setDoc(doc(dbs[r], K + p), { ...line, by: by(r) }));
  await expect(r + ' still changes quantity', true, () => updateDoc(doc(dbs[r], K + p), { qty: r, by: by(r) }));
}
await expect('staff still ticks manually repaired prep', true, () => updateDoc(doc(dbs.ann, K + p), { done: true, doneById: 'ann', doneAt: at, by: 'ann' }));
await expect('second edit with version two and new audit', true, () => {
  const b = writeBatch(owner), ev = { kind: 'line', action: 'edit', source: 'prep', day: today, recordId: 'line', before: line.orig, after: 'Cut soft cheese', original: line.orig, v: 2, at, by: '' };
  b.update(doc(owner, K + p), { text: ev.after, recipe: '', proofV: 2, proofEvent: 'second-event', by: '' });
  b.set(doc(owner, K + 'proofHistory/second-event'), ev);
  return b.commit();
});
await expect('new staff line cannot forge proof metadata', false, () => setDoc(doc(dbs.ann, K + `days/${today}/items/forged`), { ...line, proofV: 1, proofEvent: 'second-event' }));
await expect('existing line cannot gain proof metadata without audit', false, () => updateDoc(doc(dbs.ann, K + o), { proofV: 1, proofEvent: 'second-event', by: 'ann' }));
await expect('owner copies source proof metadata during PIN move', true, () => setDoc(doc(owner, K + `days/${today}/items/copied`), { ...line, proofV: 1, proofEvent: 'copied-event', by: '' }));
await seed({ 'proofHistory/line-event': null });
await expect('owner copies immutable line audit during PIN move', true, () => repair(owner, 'owner', 'prep', { source: false, event: { before: 'Old copy' } }));
await expect('owner copies protected word history during PIN move', true, () => word(owner, 'owner', { source: false }));
await seed({ 'config/main': null });
const copiedConfig = { ...config, proofWords: ['brie'], proofV: 1, proofEvent: 'copied-word' };
await expect('a device grant cannot initialise a missing kitchen config', false, () => setDoc(doc(owner, K + 'config/main'), copiedConfig));
const freshOwner = env.authenticatedContext('google-owner', { email, email_verified: true, auth_time: Math.floor(Date.now() / 1000), firebase: { sign_in_provider: 'google.com' } }).firestore();
await expect('fresh owner copies shared protected word state during PIN move', true, () => setDoc(doc(freshOwner, K + 'config/main'), copiedConfig));
await reset();
await seed({ 'proofHistory/line-event': { kind: 'line', action: 'restore', source: 'prep', day: today, recordId: 'line', before: line.text, after: line.orig, original: line.orig, v: 1, at, by: '' } });
await expect('cannot replay a pre-created line history copy as a repair', false, () => repair(owner, 'owner'));
await reset();
await seed({ 'proofHistory/word-event': { kind: 'word', action: 'keep', word: 'brie', v: 1, at, by: '' } });
await expect('cannot replay a pre-created word history copy as a config change', false, () => word(owner, 'owner'));
await reset();
for (const [label, options] of [
  ['without event', { audit: false }],
  ['wrong version', { value: { proofV: 2 } }], ['stale event version', { event: { v: 2 } }],
  ['wrong by', { event: { by: 'sam' } }], ['unlisted word', { event: { word: 'cheese' } }],
  ['uppercase word', { event: { word: 'Brie' }, value: { proofWords: ['Brie'] } }],
  ['multiple words', { event: { word: 'soft cheese' }, value: { proofWords: ['soft cheese'] } }],
  ['short word', { event: { word: 'a' }, value: { proofWords: ['a'] } }],
  ['long word', { event: { word: 'a'.repeat(41) }, value: { proofWords: ['a'.repeat(41)] } }],
  ['unknown fields', { event: { extra: 1 } }], ['also changes settings', { value: { headId: 'ann' } }],
  ['release absent word', { event: { action: 'release' }, value: { proofWords: [] } }],
  ['two words at once', { value: { proofWords: ['brie', 'cheese'] } }]
]) await expect('protected word ' + label, false, () => word(owner, 'owner', options));
await expect('shared keep succeeds', true, () => word(owner, 'owner'));
await expect('ordinary People save preserves shared words', true, () => setDoc(doc(owner, K + 'config/main'), { people: [], by: '' }, { merge: true }));
await expect('ordinary config stamp preserves shared words', true, () => setDoc(doc(dbs.sam, K + 'config/main'), { pastEdit: { p: at }, by: 'sam' }, { merge: true }));
await expect('cannot append duplicate protected word', false, () => {
  const b = writeBatch(owner); b.set(doc(owner, K + 'config/main'), { proofWords: ['brie', 'brie'], proofV: 2, proofEvent: 'duplicate', by: '' }, { merge: true }); b.set(doc(owner, K + 'proofHistory/duplicate'), { kind: 'word', action: 'keep', word: 'brie', v: 2, at, by: '' }); return b.commit();
});
await expect('release with version two and matching event succeeds', true, () => {
  const b = writeBatch(owner); b.set(doc(owner, K + 'config/main'), { proofWords: [], proofV: 2, proofEvent: 'released', by: '' }, { merge: true }); b.set(doc(owner, K + 'proofHistory/released'), { kind: 'word', action: 'release', word: 'brie', v: 2, at, by: '' }); return b.commit();
});
await expect('config cannot clear version without audit', false, () => setDoc(doc(owner, K + 'config/main'), config));
await seed({ 'config/main': { ...config, proofWords: Array.from({ length: 200 }, (_, i) => 'word' + String.fromCharCode(97 + Math.floor(i / 26)) + String.fromCharCode(97 + i % 26)), proofV: 200 } });
await expect('protected word list stays bounded', false, () => word(owner, 'owner', { value: { proofWords: [...Array.from({ length: 200 }, (_, i) => 'word' + String.fromCharCode(97 + Math.floor(i / 26)) + String.fromCharCode(97 + i % 26)), 'brie'], proofV: 201 }, event: { v: 201 } }));
await env.cleanup();
console.log((failed ? 'FAIL ' + failed + ' of ' : 'PASS ') + checks + ' proofreader rules checks');
if (failed) process.exit(1);
