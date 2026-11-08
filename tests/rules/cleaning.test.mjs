/* Cleaning schedules and daily reports on the real rules. All people and tasks here are synthetic. */
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, collection, query, where, limit, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, setLogLevel } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { anonContext, dailySession, seedOwnerDevice } from './device-auth-fixtures.mjs';

setLogLevel('silent');
const K = 'kitchens/000000/', OWNER = 'headchef@test.local';
const source = process.env.RULES || new URL('../../firestore.rules', import.meta.url);
const rules = readFileSync(source, 'utf8').replaceAll('KITCHEN_PIN', '000000').replaceAll('OWNER_EMAIL', OWNER);
const env = await initializeTestEnvironment({ projectId: 'demo-cleaning', firestore: { rules } });
await env.clearFirestore();
const NOW = Date.now(), DAY = 86400000, MIN = 60000, OPEN = 253402178400000;
const day = ms => new Date(ms + 36000000).toISOString().slice(0, 10);
const TODAY = day(NOW), YDAY = day(NOW - DAY), TOMORROW = day(NOW + DAY);
const START = Date.parse(TODAY + 'T00:00:00Z') - 36000000, DOW = new Date(START + 36000000).getUTCDay();
const people = [
  { id: 'head', name: 'Kit', role: 'head' }, { id: 'sous', name: 'Sam', role: 'sous' },
  { id: 'staff', name: 'Ann', role: 'staff' }, { id: 'other', name: 'Bo', role: 'staff' },
  { id: 'lead', name: 'Lou', role: 'lead' }, { id: 'view', name: 'Vic', role: 'view' },
  { id: 'fn', name: 'Fay', role: 'fnc' }, { id: 'removed', name: 'Former worker', role: 'staff', active: false }
].map(p => ({ active: true, ...p }));
const ids = people.filter(p => p.active).map(p => p.id);
const cfg = { people, staffIds: ids, headId: 'head', sousIds: ['head', 'sous'], fnIds: ['fn'], fnOnlyIds: ['fn'],
  addIds: ['staff', 'other', 'lead', 'sous'], tickIds: ['staff', 'other', 'lead', 'sous'], delIds: ['lead', 'sous'] };
const roles = [
  { id: 'signedout', who: '', read: false, tick: false, chef: false },
  { id: 'anonymous', who: '', read: false, tick: false, chef: false },
  { id: 'google', who: '', read: false, tick: false, chef: false },
  { id: 'staff', who: 'staff', read: true, tick: true, chef: false },
  { id: 'lead', who: 'lead', read: true, tick: true, chef: false },
  { id: 'view', who: 'view', read: true, tick: false, chef: false },
  { id: 'fn', who: 'fn', read: false, tick: false, chef: false },
  { id: 'sous', who: 'sous', read: true, tick: true, chef: true },
  { id: 'head', who: 'head', read: true, tick: true, chef: true },
  { id: 'owner', who: 'head', read: true, tick: true, chef: true },
  { id: 'owner-shared', who: 'head', mode: 'shared', read: true, tick: true, chef: true },
  { id: 'owner-staff', who: 'staff', read: true, tick: true, chef: false },
  { id: 'tablet', who: 'other', mode: 'shared', read: true, tick: true, chef: false },
  { id: 'expired', who: 'staff', expired: true, read: false, tick: false, chef: false },
  { id: 'reset', who: 'staff', pinAt: 0, read: false, tick: false, chef: false },
  { id: 'removed', who: 'removed', read: false, tick: false, chef: false }
];
const dbs = Object.fromEntries(roles.map(r => [r.id, r.id === 'signedout' ? env.unauthenticatedContext().firestore()
  : r.id === 'google' ? env.authenticatedContext('google-owner', { email: OWNER, email_verified: true, firebase: { sign_in_provider: 'google.com' } }).firestore()
    : anonContext(env, r.id).firestore()]));
const ref = (db, path) => doc(db, K + path), taskPath = id => 'cleaningTasks/' + id;
const donePath = (id, d = TODAY) => 'cleaningDone/' + d + '_' + id;
const task = (id, x = {}) => ({ root: id, prev: '', next: '', text: 'Test shelf clean', area: 'Shelves', section: 'larder', sectionName: 'Larder', shared: false,
  dows: [0, 1, 2, 3, 4, 5, 6], guide: '', from: START, until: OPEN, at: Date.now(), by: 'head', ...x });
const name = id => people.find(p => p.id === id)?.name || 'Test person';
const done = (id, who = 'staff', x = {}) => ({ day: TODAY, task: id, version: 1, done: true, doneAt: Date.now(), doneById: who,
  doneBy: name(who), workerId: who, worker: name(who), by: who, ...x });
async function put(map) {
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore(), b = writeBatch(db);
    for (const [p, d] of Object.entries(map)) d === null ? b.delete(ref(db, p)) : b.set(ref(db, p), d);
    await b.commit();
  });
}
function replace(db, previous, next, x = {}) {
  const b = writeBatch(db);
  b.update(ref(db, taskPath(previous)), { until: START + DAY, next, by: 'head' });
  b.set(ref(db, taskPath(next)), task(previous, { prev: previous, from: START + DAY, ...x }));
  return b.commit();
}
let n = 0, fails = 0;
async function check(label, fn, allowed = true) {
  n++;
  try { await (allowed ? assertSucceeds(fn()) : assertFails(fn())); }
  catch (e) { fails++; console.log('FAIL ' + label + ': ' + String(e.message || e).split('\n')[0].slice(0, 220)); }
}
async function same(label, fn) { await check(label, async () => { if (!await fn()) throw new Error(label); }); }

try {
  const seed = { 'config/main': cfg, [taskPath('read')]: task('read'), [donePath('read')]: done('read'),
    [donePath('read', YDAY)]: done('read', 'staff', { day: YDAY, doneAt: NOW - DAY }) };
  for (const p of people) seed['pinset/' + p.id] = { at: 1 };
  for (const r of roles) if (r.who) seed['sessions/' + r.id] = dailySession(r.who, { at: NOW - MIN, mode: r.mode || 'personal', pinAt: r.pinAt ?? 1, ...(r.expired ? { exp: NOW - 1 } : {}) });
  await put(seed);
  for (const id of ['owner', 'owner-shared']) await seedOwnerDevice(env, { uid: id, headId: 'head', at: NOW - MIN, mode: id === 'owner-shared' ? 'shared' : 'personal' });

  for (const r of roles) {
    const db = dbs[r.id], tid = 'matrix-' + r.id;
    await put({ [taskPath(tid)]: task(tid) });
    await check(r.id + ': one bounded schedule query', () => getDocs(query(collection(db, K + 'cleaningTasks'), where('until', '>', START), limit(501))), r.read);
    await check(r.id + ': current day completion query', () => getDocs(query(collection(db, K + 'cleaningDone'), where('day', '==', TODAY), limit(1001))), r.read);
    await check(r.id + ': read current completion', () => getDoc(ref(db, donePath('read'))), r.read);
    await check(r.id + ': read historical completion', () => getDoc(ref(db, donePath('read', YDAY))), r.chef);
    await check(r.id + ': weekly completion query', () => getDocs(query(collection(db, K + 'cleaningDone'), where('day', '>=', YDAY), where('day', '<=', TOMORROW), limit(1001))), r.chef);
    await check(r.id + ': create schedule', () => setDoc(ref(db, taskPath('new-' + r.id)), task('new-' + r.id, { by: r.who })), r.chef);
    await check(r.id + ': archive tomorrow', () => updateDoc(ref(db, taskPath(tid)), { until: START + DAY, by: r.who }), r.chef);
    await check(r.id + ': tick', () => setDoc(ref(db, donePath(tid)), done(tid, r.who)), r.tick);
  }

  await check('staff cannot query all completion history', () => getDocs(collection(dbs.staff, K + 'cleaningDone')), false);
  await check('chef cannot delete task history', () => deleteDoc(ref(dbs.head, taskPath('read'))), false);
  await check('chef cannot delete a completion', () => deleteDoc(ref(dbs.head, donePath('read'))), false);
  await check('chef cannot rewrite a past completion', () => updateDoc(ref(dbs.head, donePath('read', YDAY)), { done: false, version: 2, by: 'head' }), false);
  await check('owner grant cannot import a backdated schedule', () => setDoc(ref(dbs.owner, taskPath('owner-backdated')), task('owner-backdated', { from: START - DAY, at: NOW - DAY })), false);
  await put({ [taskPath('owner-history')]: task('owner-history', { from: START - DAY, at: NOW - DAY }) });
  await check('owner grant cannot import a historical completion', () => setDoc(ref(dbs.owner, donePath('owner-history', YDAY)), done('owner-history', 'head', { day: YDAY, doneAt: NOW - DAY })), false);

  await put({ [taskPath('history')]: task('history', { from: START - 7 * DAY, at: NOW - 7 * DAY }) });
  await check('replacement atomically closes the old revision tomorrow', () => replace(dbs.head, 'history', 'history-next'));
  await same('old schedule body and effective days survive replacement', async () => {
    const d = (await getDoc(ref(dbs.head, taskPath('history')))).data();
    return d.text === 'Test shelf clean' && d.from === START - 7 * DAY && d.until === START + DAY && d.at === NOW - 7 * DAY;
  });
  await check('stale editor cannot branch a closed revision', () => replace(dbs.head, 'history', 'history-stale'), false);
  await check('successor without closing prior revision is refused', () => setDoc(ref(dbs.head, taskPath('unpaired')), task('read', { prev: 'read', from: START + DAY })), false);
  await check('successor cannot refer to a missing prior revision', () => setDoc(ref(dbs.head, taskPath('missing-prev')), task('missing', { prev: 'missing', from: START + DAY })), false);
  await put({ [taskPath('different-root')]: task('different-root') });
  await check('replacement cannot change root', () => replace(dbs.head, 'different-root', 'wrong-root', { root: 'other-root' }), false);
  await check('tomorrow revision can be corrected before it starts', () => replace(dbs.head, 'history-next', 'history-next2', { root: 'history' }));
  await same('cancelled draft revision has zero effective days', async () => {
    const d = (await getDoc(ref(dbs.head, taskPath('history-next')))).data();
    return d.from === START + DAY && d.until === d.from;
  });
  await put({ [taskPath('siblings')]: task('siblings') });
  await check('one batch cannot create two active successors', () => {
    const b = writeBatch(dbs.head);
    b.update(ref(dbs.head, taskPath('siblings')), { until: START + DAY, next: 'sibling-a', by: 'head' });
    for (const id of ['sibling-a', 'sibling-b']) b.set(ref(dbs.head, taskPath(id)), task('siblings', { prev: 'siblings', from: START + DAY }));
    return b.commit();
  }, false);
  await check('archived schedule cannot be reopened', () => updateDoc(ref(dbs.head, taskPath('history')), { until: OPEN, by: 'head' }), false);
  await check('archive cannot retrospectively remove today', () => updateDoc(ref(dbs.head, taskPath('read')), { until: START, by: 'head' }), false);
  for (const [field, value] of Object.entries({ text: 'Changed', area: 'Pass', section: 'grill', sectionName: 'Grill', shared: true, dows: [DOW], guide: 'g1', from: START - DAY, at: NOW + 1, root: 'other', prev: 'other' })) {
    await check('existing revision keeps ' + field, () => updateDoc(ref(dbs.head, taskPath('read')), { [field]: value, by: 'head' }), false);
  }
  const badTasks = [
    ['text empty', { text: '' }], ['text blank', { text: '   ' }], ['text long', { text: 'x'.repeat(161) }], ['text type', { text: 1 }],
    ['area long', { area: 'a'.repeat(81) }], ['section long', { section: 'a'.repeat(81) }], ['section name long', { sectionName: 'a'.repeat(81) }],
    ['guide long', { guide: 'a'.repeat(81) }], ['shared type', { shared: 1 }], ['days empty', { dows: [] }], ['days duplicate', { dows: [DOW, DOW] }],
    ['days outside week', { dows: [7] }], ['days negative', { dows: [-1] }], ['days fractional', { dows: [1.5] }], ['days strings', { dows: ['1'] }],
    ['days wrong type', { dows: 1 }], ['backdated start', { from: START - DAY }], ['initial tomorrow', { from: START + DAY }], ['nonmidnight start', { from: START + 1 }],
    ['finite initial end', { until: START + DAY }], ['wrong sentinel', { until: OPEN - DAY }], ['extra key', { unsafe: true }],
    ['old creation', { at: NOW - DAY }], ['future creation', { at: NOW + DAY }], ['forged writer', { by: 'sous' }], ['initial successor', { next: 'future-revision' }]
  ];
  for (const [label, changes] of badTasks) {
    const id = 'bad-task-' + n;
    await check('new schedule rejects ' + label, () => setDoc(ref(dbs.head, taskPath(id)), task(id, changes)), false);
  }
  for (const id of ['bad.id', 'x'.repeat(81)]) await check('schedule rejects invalid revision id ' + id.slice(0, 10), () => setDoc(ref(dbs.head, taskPath(id)), task(id)), false);
  await check('schedule accepts maximum bounded text and every weekday', () => setDoc(ref(dbs.head, taskPath('bounds')), task('bounds', { text: 'x'.repeat(160), area: 'a'.repeat(80), section: 's'.repeat(80), sectionName: 'n'.repeat(80), guide: 'g'.repeat(80) })));

  await put({ [taskPath('cycle')]: task('cycle') });
  const first = done('cycle');
  await check('first completion creates version one', () => setDoc(ref(dbs.staff, donePath('cycle')), first));
  await check('an identical acknowledged tick may be retried safely', () => setDoc(ref(dbs.staff, donePath('cycle')), first));
  await check('another recorder cannot overwrite a completed occurrence', () => setDoc(ref(dbs.lead, donePath('cycle')), done('cycle', 'lead', { version: 2 })), false);
  await check('stale tick cannot overwrite the accepted recorder', () => setDoc(ref(dbs.lead, donePath('cycle')), done('cycle', 'lead')), false);
  await check('sous cannot Undo another recorder completion', () => updateDoc(ref(dbs.sous, donePath('cycle')), { done: false, version: 2, by: 'sous' }), false);
  await check('head cannot Undo another recorder completion', () => updateDoc(ref(dbs.head, donePath('cycle')), { done: false, version: 2, by: 'head' }), false);
  await check('Undo refuses stale version', () => updateDoc(ref(dbs.staff, donePath('cycle')), { done: false, version: 1, by: 'staff' }), false);
  await check('Undo refuses changed worker audit fields', () => updateDoc(ref(dbs.staff, donePath('cycle')), { done: false, version: 2, worker: '', workerId: '', by: 'staff' }), false);
  await check('Undo keeps original recorder and worker audit fields', () => updateDoc(ref(dbs.staff, donePath('cycle')), { done: false, version: 2, by: 'staff' }));
  await same('Undo preserves the entire completion cycle identity and time', async () => {
    const d = (await getDoc(ref(dbs.staff, donePath('cycle')))).data();
    return ['doneAt', 'doneById', 'doneBy', 'workerId', 'worker'].every(k => d[k] === first[k]) && d.version === 2 && d.done === false;
  });
  await check('new completion after Undo establishes a new recorder cycle', () => setDoc(ref(dbs.lead, donePath('cycle')), done('cycle', 'lead', { version: 3 })));
  await check('old Undo cannot erase another recorder later cycle', () => setDoc(ref(dbs.staff, donePath('cycle')), { ...first, done: false, version: 2 }), false);
  await put({ [taskPath('late')]: task('late'), [donePath('late')]: done('late', 'staff', { doneAt: NOW - 3 * MIN }) });
  await check('recorder cannot Undo after two minutes', () => updateDoc(ref(dbs.staff, donePath('late')), { done: false, version: 2, by: 'staff' }), false);
  await put({ [taskPath('report')]: task('report') });
  await check('personal device cannot name another worker', () => setDoc(ref(dbs.staff, donePath('report')), done('report', 'staff', { workerId: 'other', worker: 'Bo' })), false);
  await check('shared device can report an active view-only worker', () => setDoc(ref(dbs.tablet, donePath('report')), done('report', 'other', { workerId: 'view', worker: 'Vic' })));
  await check('reported worker does not acquire recorder Undo permission', () => updateDoc(ref(dbs.view, donePath('report')), { done: false, version: 2, by: 'view' }), false);
  for (const workerId of ['removed', 'fn', 'missing']) {
    const id = 'bad-worker-' + workerId; await put({ [taskPath(id)]: task(id) });
    await check('shared device rejects worker ' + workerId, () => setDoc(ref(dbs.tablet, donePath(id)), done(id, 'other', { workerId, worker: name(workerId) })), false);
  }
  const badDone = [
    ['forged recorder', { doneById: 'other' }], ['forged by', { by: 'other' }], ['initial false', { done: false }], ['initial version two', { version: 2 }],
    ['version string', { version: '1' }], ['past time', { doneAt: NOW - DAY }], ['future time', { doneAt: NOW + DAY }], ['time string', { doneAt: String(NOW) }],
    ['worker empty', { worker: '' }], ['worker blank', { worker: '   ' }], ['worker long', { worker: 'x'.repeat(81) }], ['worker type', { worker: 1 }],
    ['worker id type', { workerId: 1 }], ['recorder empty', { doneBy: '' }], ['recorder long', { doneBy: 'x'.repeat(81) }], ['extra field', { unsafe: true }],
    ['yesterday', { day: YDAY }], ['tomorrow', { day: TOMORROW }], ['invalid date', { day: '2026-13-40' }], ['task mismatch', { task: 'read' }]
  ];
  for (const [label, changes] of badDone) {
    const id = 'bad-done-' + n; await put({ [taskPath(id)]: task(id) });
    await check('completion rejects ' + label, () => setDoc(ref(dbs.staff, donePath(id)), done(id, 'staff', changes)), false);
  }
  await put({ [taskPath('not-due')]: task('not-due', { dows: [(DOW + 1) % 7] }), [taskPath('future')]: task('future', { from: START + DAY }),
    [taskPath('ended')]: task('ended', { from: START - DAY, until: START }) });
  for (const id of ['not-due', 'future', 'ended', 'no-task']) await check('cannot complete occurrence outside due schedule: ' + id, () => setDoc(ref(dbs.staff, donePath(id)), done(id)), false);
  await check('completion document id must match its day and task', () => setDoc(ref(dbs.staff, 'cleaningDone/wrong-id'), done('read')), false);
  await put({ [taskPath('removed-after')]: task('removed-after'), [donePath('removed-after')]: done('removed-after', 'other', { workerId: 'staff', worker: 'Ann' }) });
  await put({ 'config/main': { ...cfg, staffIds: ids.filter(id => id !== 'staff') } });
  await check('historical completion remains readable when worker leaves', () => getDoc(ref(dbs.head, donePath('removed-after'))));
  await check('removed recorder cannot tick using an old session', () => setDoc(ref(dbs.staff, donePath('read')), done('read')), false);
  await put({ 'config/main': cfg });
  console.log(`${fails} failed of ${n} cleaning rule checks`);
} finally { await env.cleanup(); }
if (fails) process.exit(1);
