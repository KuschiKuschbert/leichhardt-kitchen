// Real Firestore boundaries for the shared open-app Operandio timer. No background service or notification tokens.
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, collectionGroup, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, setLogLevel } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { anonContext, dailySession, seedOwnerDevice } from './device-auth-fixtures.mjs';
setLogLevel('silent');
const K = 'kitchens/000000/', NOW = Date.now(), OWNER = 'owner@test.local';
const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8').replaceAll('KITCHEN_PIN', '000000').replaceAll('OWNER_EMAIL', OWNER);
const env = await initializeTestEnvironment({ projectId: 'demo-cooling', firestore: { rules } });
await env.clearFirestore();
const roles = { head: 'head', sous: 'sous', staff: 'staff', lead: 'lead', view: 'view', functions: 'functions', tablet: 'staff', owner: 'head', rememberedStaff: 'staff' };
const kitchenRoles = Object.keys(roles).filter(r => r !== 'functions');
const config = { people: [], headId: 'head', sousIds: ['head', 'sous'], staffIds: ['head', 'sous', 'staff', 'lead', 'view', 'functions'], fnOnlyIds: ['functions'], addIds: [], tickIds: [], delIds: [] };
const sessions = Object.fromEntries(Object.entries(roles).map(([uid, by]) => [uid, dailySession(by, { at: NOW, mode: uid === 'tablet' ? 'shared' : 'personal' })]));
const runId = 'run-1234567890123456';
const waiting = (extra = {}) => ({ v: 1, run: runId, rev: 1, firstAt: Timestamp.fromMillis(NOW - 7200000 - 1000), firstBy: 'staff', secondAt: 0, secondBy: '', by: 'staff', ...extra });
const DAY_START = Math.floor((NOW + 36000000) / 86400000) * 86400000 - 36000000;
const complete = (extra = {}) => waiting({ rev: 2, firstAt: Timestamp.fromMillis(DAY_START - 21600000 - 1000),
  secondAt: Timestamp.fromMillis(DAY_START - 14400000 - 1000), secondBy: 'sous', by: 'sous', ...extra });
const first = (by, extra = {}) => waiting({ firstAt: serverTimestamp(), firstBy: by, by, ...extra });
const second = (by, extra = {}) => ({ rev: 2, secondAt: serverTimestamp(), secondBy: by, by, ...extra });
async function put(path, value) { await env.withSecurityRulesDisabled(c => value === null ? deleteDoc(doc(c.firestore(), K + path)) : setDoc(doc(c.firestore(), K + path), value)); }
const db = uid => anonContext(env, uid).firestore(), D = (d, path = 'cooling/current') => doc(d, K + path);
// Pin request.time only in these source variations, like function-midnight.test.mjs. Normal cases use the real emulator clock.
async function midnightChecks() {
  const midnight = Date.parse('2026-01-02T14:00:00Z');
  for (const pinned of [midnight - 1, midnight, midnight + 86400000]) {
    const boundaryRules = rules.replaceAll('request.time', 'timestamp.value("' + new Date(pinned).toISOString() + '")');
    const boundary = await initializeTestEnvironment({ projectId: 'demo-cooling-midnight', firestore: { rules: boundaryRules } });
    const session = dailySession('view', { at: pinned - 60000 }), d = anonContext(boundary, 'view').firestore();
    const putBoundary = async (values) => boundary.withSecurityRulesDisabled(async c => {
      const store = c.firestore();
      for (const [path, value] of Object.entries(values)) await setDoc(doc(store, K + path), value);
    });
    try {
      await boundary.clearFirestore();
      await putBoundary({ 'config/main': config, 'pinset/view': { at: 1 }, 'sessions/view': session });
      for (const due of [Timestamp.fromMillis(midnight - 1800000), new Timestamp(midnight / 1000 - 1, 999999000), Timestamp.fromMillis(midnight), Timestamp.fromMillis(midnight + 3600000)]) {
        const dueMillis = due.toMillis(), secondAt = new Timestamp(due.seconds - 14400, due.nanoseconds);
        await putBoundary({ 'cooling/current': complete({ firstAt: Timestamp.fromMillis(dueMillis - 21600000), secondAt }) });
        const next = first('view', { run: 'next-1234567890123456', rev: 3, firstAt: Timestamp.fromMillis(pinned) });
        // The first two deadlines belong to the previous calendar day; the other two require another midnight.
        const unlocked = pinned >= (dueMillis < midnight ? midnight : midnight + 86400000);
        if (unlocked) await pass('pinned midnight unlocks a completed prior-day deadline', setDoc(D(d), next));
        else await deny('pinned clock keeps completion-day and unfinished deadlines locked', setDoc(D(d), next));
      }
    } finally { await boundary.cleanup(); }
  }
}
let n = 0;
async function pass(label, operation) { await assertSucceeds(operation); n++; }
async function deny(label, operation) { await assertFails(operation); n++; }
function check(value, label) { if (!value) throw new Error(label); n++; }
try {
  await put('config/main', config);
  for (const id of [...config.staffIds, 'removed']) await put('pinset/' + id, { at: 1 });
  for (const [uid, session] of Object.entries(sessions)) await put('sessions/' + uid, session);
  await put('sessions/expired', dailySession('staff', { at: NOW - 86400000, exp: NOW - 1 }));
  await put('sessions/removed', dailySession('removed', { at: NOW }));
  await seedOwnerDevice(env, { uid: 'owner', headId: 'head', at: NOW });
  await seedOwnerDevice(env, { uid: 'rememberedStaff', headId: 'head', at: NOW });
  await put('sessions/rememberedStaff', sessions.rememberedStaff);
  for (const role of kitchenRoles) {
    const d = db(role), by = roles[role];
    await put('cooling/current', null);
    await pass(role + ' reads absence without creating anything', getDoc(D(d)));
    await pass(role + ' starts two hours without Add or Tick', setDoc(D(d), first(by)));
    const saved = (await getDoc(D(d))).data();
    check(saved.firstAt instanceof Timestamp && saved.firstBy === by && saved.by === by && saved.rev === 1 && saved.secondAt === 0, role + ' receives server time and correct attribution');
    await deny(role + ' cannot restart first timer', setDoc(D(d), first(by, { run: 'new-1234567890123456', rev: 2 })));
    await deny(role + ' cannot start second early', updateDoc(D(d), second(by)));
    await deny(role + ' cannot delete a shared run', deleteDoc(D(d)));
    await deny(role + ' cannot enumerate timers', getDocs(collection(d, K + 'cooling')));
    await deny(role + ' cannot read arbitrary timer documents', getDoc(D(d, 'cooling/other')));
    await deny(role + ' cannot create arbitrary timer documents', setDoc(D(d, 'cooling/other'), first(by)));
    await put('cooling/current', waiting());
    await pass(role + ' manually starts four hours after first deadline', updateDoc(D(d), second(by)));
    const next = (await getDoc(D(d))).data();
    check(next.secondAt instanceof Timestamp && next.secondBy === by && next.firstAt.isEqual(waiting().firstAt) && next.firstBy === 'staff' && next.rev === 2, role + ' keeps exact first-stage identity');
    await deny(role + ' cannot retick second stage', updateDoc(D(d), second(by, { rev: 3 })));
    await deny(role + ' cannot begin new batch while four hours run', setDoc(D(d), first(by, { run: 'new-1234567890123456', rev: 3 })));
    await put('cooling/current', complete({ secondAt: Timestamp.fromMillis(NOW - 14400000 - 1000) }));
    await deny(role + ' cannot restart on the four-hour completion day', setDoc(D(d), first(by, { run: 'new-1234567890123456', rev: 3 })));
    await put('cooling/current', complete());
    await pass(role + ' can start a distinct batch the following day', setDoc(D(d), first(by, { run: 'new-1234567890123456', rev: 3 })));
  }
  const invalid = [
    ['public', env.unauthenticatedContext().firestore(), 'staff'], ['no PIN', db('missing'), 'staff'],
    ['expired', db('expired'), 'staff'], ['removed', db('removed'), 'removed'], ['functions only', db('functions'), 'functions'],
    ['Google only', env.authenticatedContext('staff', { email: OWNER, email_verified: true, firebase: { sign_in_provider: 'google.com' } }).firestore(), 'staff']
  ];
  for (const [label, d, by] of invalid) {
    await put('cooling/current', null);
    await deny(label + ' cannot read missing state', getDoc(D(d)));
    await deny(label + ' cannot start first stage', setDoc(D(d), first(by)));
    await put('cooling/current', waiting());
    await deny(label + ' cannot read a running timer', getDoc(D(d)));
    await deny(label + ' cannot start second stage', updateDoc(D(d), second(by)));
    await put('cooling/current', complete());
    await deny(label + ' cannot start a new batch', setDoc(D(d), first(by, { run: 'new-1234567890123456', rev: 3 })));
  }
  const staff = db('staff'), owner = db('owner');
  await put('cooling/current', null);
  for (const [label, extra] of [
    ['forged writer', { by: 'head' }], ['forged attribution', { firstBy: 'head' }], ['numeric start', { firstAt: NOW }],
    ['chosen start', { firstAt: Timestamp.fromMillis(NOW - 1) }], ['arbitrary deadline', { firstDue: NOW + 1 }],
    ['arbitrary duration', { duration: 1 }], ['skipped stage', { secondAt: serverTimestamp(), secondBy: 'staff' }],
    ['revision zero', { rev: 0 }], ['revision skipped', { rev: 2 }], ['revision fraction', { rev: 1.5 }],
    ['short run ID', { run: 'short' }], ['long run ID', { run: 'a'.repeat(81) }], ['unsafe run ID', { run: '../1234567890123456' }], ['version', { v: 2 }]
  ]) await deny('first start refuses ' + label, setDoc(D(staff), first('staff', extra)));
  for (const field of Object.keys(first('staff'))) {
    const value = first('staff'); delete value[field];
    await deny('first start requires ' + field, setDoc(D(staff), value));
  }
  await deny('owner cannot choose first time either', setDoc(D(owner), first('head', { firstAt: Timestamp.fromMillis(NOW) })));
  await deny('owner cannot list through collection group', getDocs(collectionGroup(owner, 'cooling')));
  await put('cooling/current', waiting());
  for (const [label, extra] of [
    ['forged recorder', { by: 'head' }], ['forged completer', { secondBy: 'head' }], ['numeric second start', { secondAt: NOW }],
    ['chosen second time', { secondAt: Timestamp.fromMillis(NOW) }], ['stale revision', { rev: 1 }], ['skipped revision', { rev: 3 }],
    ['moved first time', { firstAt: Timestamp.fromMillis(NOW - 7200000 - 2000) }], ['changed first recorder', { firstBy: 'head' }],
    ['changed run', { run: 'other-1234567890123456' }], ['extra deadline', { secondDue: NOW + 1 }]
  ]) await deny('second stage refuses ' + label, updateDoc(D(staff), second('staff', extra)));
  await put('cooling/current', waiting({ firstAt: Timestamp.fromMillis(NOW - 7200000 + 60000) }));
  await deny('first deadline is checked on server time', updateDoc(D(staff), second('staff')));
  await put('cooling/current', complete({ secondAt: Timestamp.fromMillis(NOW - 14400000 + 60000) }));
  await deny('new batch cannot shorten four-hour stage', setDoc(D(staff), first('staff', { run: 'new-1234567890123456', rev: 3 })));
  await put('cooling/current', complete());
  await deny('completed batch requires distinct run identity', setDoc(D(staff), first('staff', { rev: 3 })));
  await deny('completed batch still requires next revision', setDoc(D(staff), first('staff', { run: 'new-1234567890123456', rev: 2 })));
  // Retaining the first Timestamp must preserve its microseconds exactly across an update of the second stage.
  const precise = new Timestamp(Math.floor((NOW - 7200000 - 1000) / 1000), 1000);
  await put('cooling/current', waiting({ firstAt: precise }));
  await deny('second start cannot round first-stage microseconds', updateDoc(D(staff), second('staff', { firstAt: Timestamp.fromMillis(precise.toMillis()) })));
  await pass('partial second update preserves exact microseconds', updateDoc(D(staff), second('staff')));
  for (const stage of ['first', 'second', 'new']) {
    await put('cooling/current', stage === 'first' ? null : stage === 'second' ? waiting() : complete());
    const outcomes = await Promise.allSettled(['staff', 'view'].map(by => stage === 'second'
      ? updateDoc(D(db(by)), second(by))
      : setDoc(D(db(by)), first(by, { run: by + '-1234567890123456', rev: stage === 'first' ? 1 : 3 }))));
    check(outcomes.filter(x => x.status === 'fulfilled').length === 1, stage + ' simultaneous starts have exactly one winner');
    const value = (await getDoc(D(staff))).data();
    check(value.rev === (stage === 'first' ? 1 : stage === 'second' ? 2 : 3), stage + ' racing clients cannot advance twice');
  }
  await put('cooling/current', waiting());
  await put('pinset/staff', { at: 2 });
  await deny('PIN reset revokes reads', getDoc(D(staff)));
  await deny('PIN reset revokes stage starts', updateDoc(D(staff), second('staff')));
  await put('pinset/staff', { at: 1 });
  await put('config/main', { ...config, staffIds: config.staffIds.filter(id => id !== 'staff') });
  await deny('canonical removal revokes reads', getDoc(D(staff)));
  await deny('canonical removal revokes stage starts', updateDoc(D(staff), second('staff')));
  await midnightChecks();
  console.log(n + ' Operandio open-app cooling rules checks passed.');
} finally { await env.cleanup(); }
