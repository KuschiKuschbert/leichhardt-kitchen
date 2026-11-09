/* Cleaning schedules and daily reports on the real rules. All people and tasks here are synthetic. */
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, collection, query, where, limit, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, setLogLevel, serverTimestamp, Timestamp } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
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
  staffSee: { guides: true, pings: false, minutes: true, cleaning: true },
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
    await check(r.id + ': current day completion query', () => getDocs(query(collection(db, K + 'cleaningDone'), where('day', '==', TODAY), limit(2001))), r.read);
    await check(r.id + ': read current completion', () => getDoc(ref(db, donePath('read'))), r.read);
    await check(r.id + ': read historical completion', () => getDoc(ref(db, donePath('read', YDAY))), r.chef);
    await check(r.id + ': weekly completion query', () => getDocs(query(collection(db, K + 'cleaningDone'), where('day', '>=', YDAY), where('day', '<=', TOMORROW), limit(2001))), r.chef);
    await check(r.id + ': create schedule', () => setDoc(ref(db, taskPath('new-' + r.id)), task('new-' + r.id, { by: r.who })), r.chef);
    await check(r.id + ': archive tomorrow', () => updateDoc(ref(db, taskPath(tid)), { until: START + DAY, by: r.who }), r.chef);
    await check(r.id + ': tick', () => setDoc(ref(db, donePath(tid)), done(tid, r.who)), r.tick);
  }

  // Existing kitchens have no flag yet. Only canonical chefs may prepare and use the schedule until release.
  for (const [state, staffSee] of [['off', { ...cfg.staffSee, cleaning: false }], ['missing', { guides: true, pings: false, minutes: true }]]) {
    await put({ 'config/main': { ...cfg, staffSee } });
    for (const r of roles) {
      const db = dbs[r.id], tid = 'release-' + state + '-' + r.id, undoId = tid + '-undo';
      const receipt = done(undoId, r.who);
      await put({ [taskPath(tid)]: task(tid), [taskPath(undoId)]: task(undoId), [donePath(undoId)]: receipt });
      await check(state + ' ' + r.id + ': read schedule metadata', () => getDoc(ref(db, taskPath('read'))), r.chef);
      await check(state + ' ' + r.id + ': query schedules', () => getDocs(query(collection(db, K + 'cleaningTasks'), where('until', '>', START), limit(501))), r.chef);
      await check(state + ' ' + r.id + ': read current completion', () => getDoc(ref(db, donePath('read'))), r.chef);
      await check(state + ' ' + r.id + ': current completion query', () => getDocs(query(collection(db, K + 'cleaningDone'), where('day', '==', TODAY), limit(2001))), r.chef);
      await check(state + ' ' + r.id + ': weekly completion query', () => getDocs(query(collection(db, K + 'cleaningDone'), where('day', '>=', YDAY), where('day', '<=', TOMORROW), limit(2001))), r.chef);
      await check(state + ' ' + r.id + ': prepare a new schedule', () => setDoc(ref(db, taskPath(tid + '-new')), task(tid + '-new', { by: r.who })), r.chef);
      await check(state + ' ' + r.id + ': archive tomorrow', () => updateDoc(ref(db, taskPath(tid)), { until: START + DAY, by: r.who }), r.chef);
      await check(state + ' ' + r.id + ': tick', () => setDoc(ref(db, donePath(tid)), done(tid, r.who)), r.chef && r.tick);
      await check(state + ' ' + r.id + ': retry identical completion', () => setDoc(ref(db, donePath(undoId)), receipt), r.chef && r.tick);
      await check(state + ' ' + r.id + ': Undo own completion', () => updateDoc(ref(db, donePath(undoId)), { done: false, version: 2, by: r.who }), r.chef && r.tick);
    }
  }
  const withoutSee = { ...cfg }; delete withoutSee.staffSee;
  for (const [state, config] of [['no staffSee map', withoutSee], ['non-map staffSee', { ...cfg, staffSee: true }],
    ['string flag', { ...cfg, staffSee: { cleaning: 'true' } }], ['numeric flag', { ...cfg, staffSee: { cleaning: 1 } }]]) {
    await put({ 'config/main': config });
    for (const id of ['staff', 'lead', 'sous', 'head']) {
      await check(state + ' ' + id + ': only canonical chefs read', () => getDoc(ref(dbs[id], taskPath('read'))), ['head', 'sous'].includes(id));
      const tid = 'malformed-' + n; await put({ [taskPath(tid)]: task(tid) });
      await check(state + ' ' + id + ': only canonical chefs tick', () => setDoc(ref(dbs[id], donePath(tid)), done(tid, id)), ['head', 'sous'].includes(id));
    }
  }
  await put({ 'config/main': { ...cfg, staffSee: { ...cfg.staffSee, cleaning: false }, sousIds: ['head'] } });
  await check('sous role label without canonical membership cannot bypass release', () => getDoc(ref(dbs.sous, taskPath('read'))), false);
  await put({ 'config/main': { ...cfg, staffSee: { ...cfg.staffSee, cleaning: false }, tickIds: cfg.tickIds.filter(id => id !== 'sous') },
    [taskPath('sous-no-tick')]: task('sous-no-tick') });
  await check('unreleased setup access does not grant a sous chef Tick capability', () => setDoc(ref(dbs.sous, donePath('sous-no-tick')), done('sous-no-tick', 'sous')), false);
  await check('sous chef without Tick still prepares the unreleased schedule', () => setDoc(ref(dbs.sous, taskPath('sous-setup')), task('sous-setup', { by: 'sous' })));

  // The release switch uses the existing admin config boundary, including on a shared head-chef device.
  for (const enabled of [true, false]) for (const r of roles) {
    const before = { ...cfg.staffSee, cleaning: !enabled };
    await put({ 'config/main': { ...cfg, staffSee: before } });
    const admin = ['owner', 'owner-shared'].includes(r.id);
    await check(r.id + ': admin turns Cleaning ' + (enabled ? 'on' : 'off'), () => updateDoc(ref(dbs[r.id], 'config/main'),
      { staffSee: { ...before, cleaning: enabled }, by: r.who }), admin);
    await same(r.id + ': release preserves the other page switches', async () => {
      const saved = (await getDoc(ref(dbs.head, 'config/main'))).data().staffSee;
      const expected = { ...before, cleaning: admin ? enabled : !enabled };
      return Object.keys(expected).every(key => saved[key] === expected[key]) && Object.keys(saved).length === Object.keys(expected).length;
    });
  }
  await put({ 'config/main': cfg });
  await check('enabling Cleaning restores team access to existing schedule', () => getDoc(ref(dbs.staff, taskPath('read'))));
  await same('switching Cleaning off and on preserves completion history', async () => {
    const saved = (await getDoc(ref(dbs.staff, donePath('read')))).data();
    return saved.done === true && saved.doneById === 'staff' && saved.version === 1;
  });

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
  // Enhanced tasks keep each explicit occurrence, required checks and verification in server-validated state.
  const plan = (x = {}) => ({ template: '', method: 'Clean and dry.', responsibility: 'Kitchen team', checks: ['Clean', 'Dry'], timing: 'daily', verification: false, verifiers: [], review: '', ...x });
  const flowRecord = (id, who = 'staff', x = {}) => ({ day: TODAY, task: id, version: 1, done: false, doneAt: 0, doneById: '', doneBy: '', workerId: '', worker: '', by: who,
    flow: { slot: 'daily', kind: 'daily', status: 'pending', checked: [], note: '', verifiedBy: '', verifiedAt: 0 }, ...x });
  const occurrenceId = d => d.day + '_' + d.task + '__' + d.flow.slot;
  const actionPath = d => 'cleaningActions/' + occurrenceId(d) + '_v' + d.version;
  function flowWrite(db, d, action, eventChanges = {}) {
    const b = writeBatch(db), occurrence = occurrenceId(d);
    b.set(ref(db, 'cleaningDone/' + occurrence), d);
    b.set(ref(db, actionPath(d)), { day: d.day, task: d.task, occurrence, version: d.version, action, at: serverTimestamp(), by: d.by, snapshot: d, ...eventChanges });
    return b.commit();
  }
  const performed = (d, who, x = {}) => ({ ...d, by: who, doneAt: Date.now(), doneById: who, doneBy: name(who), workerId: who, worker: name(who),
    flow: { ...d.flow, checked: ['Clean', 'Dry'], status: 'complete' }, done: true, ...x });
  for (const r of roles) {
    const tid = 'enhanced-' + r.id, d = flowRecord(tid, r.who);
    await put({ [taskPath(tid)]: task(tid, { plan: plan() }) });
    await check(r.id + ': enhanced occurrence save is capability gated', () => flowWrite(dbs[r.id], d, 'save'), r.tick);
    await check(r.id + ': explicit verifier configuration is chef only', () => setDoc(ref(dbs[r.id], taskPath(tid + '-plan')), task(tid + '-plan', { by: r.who, plan: plan({ verification: true, verifiers: ['sous'] }) })), r.chef);
  }
  await put({ [taskPath('checked')]: task('checked', { plan: plan() }) });
  const partial = flowRecord('checked', 'staff');
  await check('required checks cannot be bypassed with legacy completion', () => setDoc(ref(dbs.staff, donePath('checked')), done('checked')), false);
  await check('enhanced current state requires its atomic audit event', () => setDoc(ref(dbs.staff, 'cleaningDone/' + occurrenceId(partial)), partial), false);
  await check('audit timestamp cannot be client supplied', () => flowWrite(dbs.staff, partial, 'save', { at: Timestamp.fromMillis(NOW - DAY) }), false);
  await check('partial checks save without claiming completion', () => flowWrite(dbs.staff, partial, 'save'));
  const incomplete = performed({ ...partial, version: 2 }, 'staff'); incomplete.flow.checked = ['Clean'];
  await check('perform refuses missing required checks', () => flowWrite(dbs.staff, incomplete, 'perform'), false);
  await check('perform refuses a checklist not present in the saved revision', () => flowWrite(dbs.staff, { ...incomplete, flow: { ...incomplete.flow, checked: ['Clean', 'Invented'] } }, 'perform'), false);
  const full = performed({ ...partial, version: 2 }, 'staff');
  await check('perform accepts the complete persisted checklist', () => flowWrite(dbs.staff, full, 'perform'));
  await check('a standalone audit cannot claim an unperformed next state', () => setDoc(ref(dbs.head, 'cleaningActions/' + occurrenceId(full) + '_v3'),
    { day: TODAY, task: full.task, occurrence: occurrenceId(full), version: 3, action: 'verify', at: serverTimestamp(), by: 'head', snapshot: { ...full, version: 3, by: 'head' } }), false);
  await check('stale competitor cannot replace the saved occurrence', () => flowWrite(dbs.lead, performed({ ...partial, version: 2 }, 'lead'), 'perform'), false);
  await check('audit records cannot be edited', () => updateDoc(ref(dbs.staff, actionPath(full)), { action: 'save' }), false);
  await check('audit records cannot be deleted', () => deleteDoc(ref(dbs.head, actionPath(full))), false);
  await same('audit has a real server Timestamp and exact accepted snapshot', async () => {
    const event = (await getDoc(ref(dbs.head, actionPath(full)))).data();
    return event.at instanceof Timestamp && event.snapshot.version === 2 && event.snapshot.flow.status === 'complete' && event.snapshot.workerId === 'staff';
  });
  const reopen = flowRecord('checked', 'staff', { version: 3 }); reopen.flow.note = 'Ticked the wrong task.';
  await check('recorder can reopen with a reason and a new audit version', () => flowWrite(dbs.staff, reopen, 'reopen'));
  await same('reopening does not erase the earlier performance audit', async () => (await getDoc(ref(dbs.head, actionPath(full)))).data().snapshot.done === true);
  const blocked = { ...reopen, version: 4, flow: { ...reopen.flow, status: 'blocked', note: '' } };
  await check('blocked requires a reason', () => flowWrite(dbs.staff, blocked, 'block'), false);
  blocked.flow.note = 'Equipment in use.';
  await check('blocked work is persisted without counting complete', () => flowWrite(dbs.staff, blocked, 'block'));
  const invalidSlot = { ...blocked, version: 5, flow: { ...blocked.flow, slot: 'service-one', kind: 'service' } };
  await check('daily task refuses an arbitrary service slot', () => flowWrite(dbs.staff, invalidSlot, 'save'), false);
  await put({ [taskPath('food')]: task('food', { plan: plan({ timing: 'food', verification: true, verifiers: ['sous'] }) }) });
  const foodBase = flowRecord('food'); foodBase.flow.slot = foodBase.flow.kind = 'start';
  const food = performed(foodBase, 'staff', { done: false }); food.flow.status = 'awaiting';
  await check('food performance is saved awaiting the configured checker', () => flowWrite(dbs.staff, food, 'perform'));
  const verified = { ...food, version: 2, by: 'sous', done: true, flow: { ...food.flow, status: 'complete', verifiedBy: 'sous', verifiedAt: Date.now() } };
  await check('performer cannot grant themselves Pass verification', () => flowWrite(dbs.staff, { ...verified, by: 'staff', flow: { ...verified.flow, verifiedBy: 'staff' } }, 'verify'), false);
  await check('canonical head role alone is not a mapped Pass checker', () => flowWrite(dbs.head, { ...verified, by: 'head', flow: { ...verified.flow, verifiedBy: 'head' } }, 'verify'), false);
  await check('verification cannot change the original cleaner', () => flowWrite(dbs.sous, { ...verified, workerId: 'sous' }, 'verify'), false);
  await check('mapped Pass checker verifies the saved performance', () => flowWrite(dbs.sous, verified, 'verify'));
  await put({ [taskPath('service')]: task('service', { plan: plan({ timing: 'service' }) }) });
  for (const slot of ['service-one', 'service-two']) {
    const d = flowRecord('service'); d.flow.slot = slot; d.flow.kind = 'service';
    await check(slot + ': explicit occurrences persist separately', () => flowWrite(dbs.staff, performed(d, 'staff'), 'perform'));
  }
  await put({ [taskPath('no-verifier')]: task('no-verifier', { plan: plan({ verification: true }) }) });
  const noVerifier = performed(flowRecord('no-verifier'), 'staff', { done: false }); noVerifier.flow.status = 'awaiting';
  await check('missing checker mapping still records honest awaiting status', () => flowWrite(dbs.staff, noVerifier, 'perform'));
  await check('missing checker mapping never auto-verifies', () => flowWrite(dbs.head, { ...noVerifier, version: 2, done: true, by: 'head', flow: { ...noVerifier.flow, status: 'complete', verifiedBy: 'head', verifiedAt: Date.now() } }, 'verify'), false);
  for (const [id, anchor, allowed] of [['interval-due', TODAY, true], ['interval-between', YDAY, false], ['interval-future', TOMORROW, false], ['interval-unset', '', false]]) {
    await check(id + ': a chef saves the bounded anchored recurrence', () => setDoc(ref(dbs.head, taskPath(id)), task(id, { plan: plan({ repeat: { days: 2, anchor } }) })));
    await check(id + ': interval is enforced on the server', () => flowWrite(dbs.staff, performed(flowRecord(id), 'staff'), 'perform'), allowed);
  }
  await check('enhanced schedule accepts the full bounded checklist and text', () => setDoc(ref(dbs.head, taskPath('plan-bounds')), task('plan-bounds', { plan: plan({ method: 'x'.repeat(1000), responsibility: 'r'.repeat(120), review: 'q'.repeat(500), checks: Array.from({ length: 12 }, (_, i) => 'Check ' + i) }) })));
  const combinedPlan = plan({ checks: Array.from({ length: 12 }, (_, i) => 'Check ' + i), verification: true, verifiers: ['sous'], repeat: { days: 2, anchor: TODAY } });
  await check('maximum checklist also supports mapped verification and anchored recurrence', () => setDoc(ref(dbs.head, taskPath('plan-bounds-combined')), task('plan-bounds-combined', { plan: combinedPlan })));
  await check('maximum enhanced plan can be revised prospectively in one atomic batch', () => replace(dbs.head, 'plan-bounds-combined', 'plan-bounds-combined-next', { plan: combinedPlan }));
  await check('maximum enhanced plan can be archived without revalidating its immutable body', () => updateDoc(ref(dbs.head, taskPath('plan-bounds-combined-next')), { until: START + DAY, by: 'head' }));
  await check('method responsibility and review retain multiline text', () => setDoc(ref(dbs.head, taskPath('plan-multiline')), task('plan-multiline', {
    plan: plan({ method: 'Wash\nDry', responsibility: 'Night\nKitchen team', review: 'See the approved procedure.\nConfirm the equipment settings.' }) })));
  for (const [label, changes] of [['method too long', { method: 'x'.repeat(1001) }], ['duplicate checks', { checks: ['Clean', 'Clean'] }], ['non-string checks', { checks: [1] }],
    ['unknown timing', { timing: 'whenever' }], ['forged checker role label', { verifiers: ['Pass Chef'] }], ['function-only checker', { verifiers: ['fn'] }],
    ['non-string method', { method: 1 }], ['non-string review', { review: false }], ['non-string responsibility', { responsibility: [] }],
    ['invalid interval', { repeat: { days: 1, anchor: TODAY } }], ['fractional interval', { repeat: { days: 2.5, anchor: TODAY } }],
    ['invalid anchor', { repeat: { days: 2, anchor: '2026-13-40' } }]]) {
    const id = 'plan-invalid-' + n;
    await check(label, () => setDoc(ref(dbs.head, taskPath(id)), task(id, { plan: plan(changes) })), false);
  }
  await put({ 'config/main': { ...cfg, staffIds: cfg.staffIds.filter(id => id !== 'sous') } });
  await check('removed checker cannot verify through a stale session', () => flowWrite(dbs.sous, { ...noVerifier, version: 2, by: 'sous' }, 'save'), false);
  await check('a chef can still archive a task after its mapped checker leaves', () => updateDoc(ref(dbs.head, taskPath('food')), { until: START + DAY, by: 'head' }));
  await put({ 'config/main': cfg });
  await check('the actual 26-template schedule imports in one authorised atomic batch', () => {
    const templates = createRequire(import.meta.url)('../../js/cleaning-schedule.js').drafts(), b = writeBatch(dbs.head);
    for (const draft of templates) { const id = 'clean-template-' + draft.plan.template; b.set(ref(dbs.head, taskPath(id)), task(id, draft)); }
    return b.commit();
  });
  console.log(`${fails} failed of ${n} cleaning rule checks`);
} finally { await env.cleanup(); }
if (fails) process.exit(1);
