// Real Firestore boundaries for the shared open-app Operandio timer. No background service or notification tokens.
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, collectionGroup, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp as actualServerTimestamp, Timestamp, setLogLevel } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { anonContext, dailySession, seedOwnerDevice } from './device-auth-fixtures.mjs';
setLogLevel('silent');
const K = 'kitchens/000000/', NOW = Date.parse('2026-01-02T08:00:00Z'), OWNER = 'owner@test.local';
const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8').replaceAll('KITCHEN_PIN', '000000').replaceAll('OWNER_EMAIL', OWNER);
// Fixed 18:00 Queensland source variation keeps role/deadline cases deterministic during overnight CI.
// Exact boundary cases below and an unmodified real-clock environment cover the production clock separately.
// Firestore stores data timestamps at microsecond precision. At nanosecond clock probes, compare saved
// event fields with that persisted instant while keeping every policy/deadline comparison at full precision.
const pinnedRules = at => rules.replaceAll('== request.time', '== timestamp.value("' + at.replace(/(\.\d{6})\d{3}Z$/, (_, micro) => micro + '000Z') + '")')
  .replaceAll('request.time', 'timestamp.value("' + at + '")');
const serverTimestamp = () => Timestamp.fromMillis(NOW);
const env = await initializeTestEnvironment({ projectId: 'demo-cooling', firestore: { rules: pinnedRules(new Date(NOW).toISOString()) } });
await env.clearFirestore();
const roles = { head: 'head', sous: 'sous', staff: 'staff', lead: 'lead', view: 'view', functions: 'functions', tablet: 'staff', owner: 'head', rememberedStaff: 'staff' };
const kitchenRoles = Object.keys(roles).filter(r => r !== 'functions');
const config = { people: [], headId: 'head', sousIds: ['head', 'sous'], staffIds: ['head', 'sous', 'staff', 'lead', 'view', 'functions'], fnOnlyIds: ['functions'], addIds: [], tickIds: [], delIds: [] };
const sessions = Object.fromEntries(Object.entries(roles).map(([uid, by]) => [uid, dailySession(by, { at: NOW, mode: uid === 'tablet' ? 'shared' : 'personal' })]));
const runId = 'run-1234567890123456';
const waiting = (extra = {}) => ({ v: 1, run: runId, rev: 1, firstAt: Timestamp.fromMillis(NOW - 7200000 - 1000), firstBy: 'staff', secondAt: 0, secondBy: '', by: 'staff', ...extra });
const OPENING = Math.floor((NOW + 36000000) / 86400000) * 86400000;
const complete = (extra = {}) => waiting({ rev: 2, firstAt: Timestamp.fromMillis(NOW - 21600000 - 1000),
  secondAt: Timestamp.fromMillis(NOW - 14400000 - 1000), secondBy: 'sous', by: 'sous', ...extra });
const expired = (extra = {}) => complete({ firstAt: Timestamp.fromMillis(NOW - 86400000 - 21600000),
  secondAt: Timestamp.fromMillis(NOW - 86400000 - 14400000), ...extra });
const first = (by, extra = {}) => waiting({ windowAt: OPENING, firstAt: serverTimestamp(), firstBy: by, by, ...extra });
const second = (by, extra = {}) => ({ rev: 2, secondAt: serverTimestamp(), secondBy: by, by, ...extra });
const recorded = (by, stage = 1, extra = {}) => ({ v: 1, run: runId,
  firstAt: stage === 1 ? serverTimestamp() : 0, firstBy: stage === 1 ? by : '',
  secondAt: stage === 2 ? serverTimestamp() : 0, secondBy: stage === 2 ? by : '', by, ...extra });
const recordStage = (by, stage, extra = {}) => ({ run: runId,
  [stage === 1 ? 'firstAt' : 'secondAt']: serverTimestamp(), [stage === 1 ? 'firstBy' : 'secondBy']: by, by, ...extra });
const RD = d => D(d, 'cooling/recorded');
async function put(path, value) { await env.withSecurityRulesDisabled(c => value === null ? deleteDoc(doc(c.firestore(), K + path)) : setDoc(doc(c.firestore(), K + path), value)); }
const db = uid => anonContext(env, uid).firestore(), D = (d, path = 'cooling/current') => doc(d, K + path);
// All times are server request times, including the final nanosecond on either side of a whole-second boundary.
async function dailyWindowChecks() {
  const opening = Date.parse('2026-01-02T00:00:00Z'), closing = opening + 11 * 3600000;
  const points = [
    ['2026-01-01T23:59:59.999000000Z', new Timestamp(opening / 1000 - 1, 999000000), false],
    ['2026-01-01T23:59:59.999999999Z', new Timestamp(opening / 1000 - 1, 999999999), false],
    ['2026-01-02T00:00:00.000000000Z', Timestamp.fromMillis(opening), true],
    ['2026-01-02T10:59:59.999999999Z', new Timestamp(closing / 1000 - 1, 999999999), true],
    ['2026-01-02T11:00:00.000000000Z', Timestamp.fromMillis(closing), false],
    ['2026-01-02T14:00:00.000000000Z', Timestamp.fromMillis(closing + 3 * 3600000), false],
    ['2026-01-03T00:00:00.000000000Z', Timestamp.fromMillis(opening + 86400000), true]
  ];
  for (const [iso, pinned, open] of points) {
    const boundary = await initializeTestEnvironment({ projectId: 'demo-cooling-daily-window', firestore: { rules: pinnedRules(iso) } });
    const at = pinned.seconds * 1000 + Math.floor(pinned.nanoseconds / 1000000), dayOpen = Math.floor((at + 36000000) / 86400000) * 86400000;
    const putBoundary = async values => boundary.withSecurityRulesDisabled(async c => {
      const store = c.firestore();
      for (const [path, value] of Object.entries(values)) {
        const ref = doc(store, K + path);
        if (value === null) await deleteDoc(ref); else await setDoc(ref, value);
      }
    });
    try {
      await boundary.clearFirestore();
      await putBoundary({ 'config/main': config });
      for (const role of Object.keys(roles)) {
        const by = roles[role], d = anonContext(boundary, role).firestore();
        const permitted = open && role !== 'functions';
        await putBoundary({ ['pinset/' + by]: { at: 1 }, ['sessions/' + role]: dailySession(by, { at: at - 60000 }), 'cooling/current': null, 'cooling/recorded': null });
        await (role !== 'functions' ? pass : deny)(iso + ' ' + role + ' timer reads retain existing kitchen permissions', getDoc(D(d)));
        await (role !== 'functions' ? pass : deny)(iso + ' ' + role + ' declaration reads retain existing kitchen permissions', getDoc(RD(d)));
        // A first start queued before yesterday's close cannot start tomorrow with a fresh serverTimestamp.
        await deny(iso + ' ' + role + ' queued previous-window first start cannot create',
          setDoc(D(d), first(by, { firstAt: pinned, windowAt: dayOpen - 86400000 })));
        const fresh = first(by, { firstAt: pinned, windowAt: dayOpen });
        await (permitted ? pass : deny)(iso + ' ' + role + ' first start obeys service window', setDoc(D(d), fresh));
        for (const old of [expired(), expired({ rev: 1, secondAt: 0, secondBy: '', by: 'staff' }),
          expired({ secondAt: Timestamp.fromMillis(dayOpen - 3600000) })]) {
          await putBoundary({ 'cooling/current': old });
          await deny(iso + ' ' + role + ' queued previous-window first start cannot replace',
            setDoc(D(d), first(by, { run: 'late-1234567890123456', rev: old.rev + 1, firstAt: pinned, windowAt: dayOpen - 86400000 })));
          await (permitted ? pass : deny)(iso + ' ' + role + ' expired batch can be replaced only during service',
            setDoc(D(d), first(by, { run: 'next-1234567890123456', rev: old.rev + 1, firstAt: pinned, windowAt: dayOpen })));
        }
        // A current batch remains once per day, even if both elapsed stages and declarations are done.
        await putBoundary({ 'cooling/current': complete({ firstAt: Timestamp.fromMillis(dayOpen), secondAt: Timestamp.fromMillis(dayOpen + 7200000) }) });
        await deny(iso + ' current-day batch cannot restart', setDoc(D(d), first(by, { run: 'next-1234567890123456', rev: 3, firstAt: pinned, windowAt: dayOpen })));
        const due = permitted && at >= dayOpen + 21600000;
        await putBoundary({ 'cooling/current': waiting({ firstAt: Timestamp.fromMillis(dayOpen) }), 'cooling/recorded': null });
        await (permitted && at >= dayOpen + 7200000 ? pass : deny)(iso + ' first confirmation checks service time', setDoc(RD(d), recorded(by, 1, { firstAt: pinned })));
        await (permitted && at >= dayOpen + 7200000 ? pass : deny)(iso + ' stage two checks service time', updateDoc(D(d), second(by, { secondAt: pinned })));
        await putBoundary({ 'cooling/current': complete({ firstAt: Timestamp.fromMillis(dayOpen), secondAt: Timestamp.fromMillis(dayOpen + 7200000) }), 'cooling/recorded': null });
        await (due ? pass : deny)(iso + ' confirmation checks service time', setDoc(RD(d), recorded(by, 2, { secondAt: pinned })));
        await putBoundary({ 'cooling/current': expired(), 'cooling/recorded': null });
        await deny(iso + ' old queued confirmation cannot record previous cycle', setDoc(RD(d), recorded(by, 2, { secondAt: pinned })));
        await putBoundary({ 'cooling/current': expired({ rev: 1, secondAt: 0, secondBy: '', by: 'staff' }) });
        await deny(iso + ' old queued second start cannot revive previous cycle', updateDoc(D(d), second(by, { secondAt: pinned })));
      }
      // Timestamp comparisons retain the sub-millisecond edge before 10:00; no rounding into today's cycle.
      const d = anonContext(boundary, 'view').firestore();
      await putBoundary({ 'cooling/current': waiting({ firstAt: new Timestamp(dayOpen / 1000 - 1, 999999000) }) });
      await deny(iso + ' final microsecond before opening cannot continue stage two', updateDoc(D(d), second('view', { secondAt: pinned })));
      await putBoundary({ 'cooling/recorded': null });
      await deny(iso + ' final microsecond before opening cannot be confirmed', setDoc(RD(d), recorded('view', 1, { firstAt: pinned })));
      await (open ? pass : deny)(iso + ' final microsecond before opening is an expired batch',
        setDoc(D(d), first('view', { run: 'nano-1234567890123456', rev: 2, firstAt: pinned, windowAt: dayOpen })));
    } finally { await boundary.cleanup(); }
  }
}
async function realClockChecks() {
  const real = await initializeTestEnvironment({ projectId: 'demo-cooling-real-clock', firestore: { rules } });
  const at = Date.now(), opening = Math.floor((at + 36000000) / 86400000) * 86400000;
  const open = at >= opening && at < opening + 39600000;
  try {
    await real.clearFirestore();
    await real.withSecurityRulesDisabled(async c => {
      const store = c.firestore();
      for (const [path, value] of Object.entries({ 'config/main': config, 'pinset/view': { at: 1 }, 'sessions/view': dailySession('view', { at: at - 1000 }) })) await setDoc(doc(store, K + path), value);
    });
    const d = anonContext(real, 'view').firestore();
    await (open ? pass : deny)('unmodified production rules check the real server hour and timestamp',
      setDoc(D(d), first('view', { firstAt: actualServerTimestamp(), windowAt: opening })));
    await deny('real server refuses a client-chosen start timestamp', setDoc(D(d), first('view', { firstAt: Timestamp.fromMillis(at - 1000), windowAt: opening })));
  } finally { await real.cleanup(); }
}
let n = 0;
async function pass(label, operation) { try { await assertSucceeds(operation); n++; } catch (e) { throw new Error(label + ': expected allow', { cause: e }); } }
async function deny(label, operation) { try { await assertFails(operation); n++; } catch (e) { throw new Error(label + ': expected deny', { cause: e }); } }
function check(value, label) { if (!value) throw new Error(label); n++; }
try {
  await dailyWindowChecks();
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
    await put('cooling/current', expired());
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
  await put('cooling/current', waiting());
  await deny('legacy current run cannot have its window added by stage two', updateDoc(D(staff), second('staff', { windowAt: OPENING })));
  await put('cooling/current', waiting({ windowAt: OPENING }));
  await deny('stage two cannot change the captured window', updateDoc(D(staff), second('staff', { windowAt: OPENING - 86400000 })));
  await deny('stage two cannot remove the captured window', setDoc(D(staff), waiting({ ...second('staff') })));
  await pass('stage two preserves an existing captured window through a partial update', updateDoc(D(staff), second('staff')));

  await put('cooling/current', null);
  for (const [label, extra] of [
    ['forged writer', { by: 'head' }], ['forged attribution', { firstBy: 'head' }], ['numeric start', { firstAt: NOW }],
    ['chosen start', { firstAt: Timestamp.fromMillis(NOW - 1) }], ['arbitrary deadline', { firstDue: NOW + 1 }],
    ['arbitrary duration', { duration: 1 }], ['skipped stage', { secondAt: serverTimestamp(), secondBy: 'staff' }],
    ['revision zero', { rev: 0 }], ['revision skipped', { rev: 2 }], ['revision fraction', { rev: 1.5 }],
    ['previous window', { windowAt: OPENING - 86400000 }], ['future window', { windowAt: OPENING + 86400000 }],
    ['numeric string window', { windowAt: String(OPENING) }], ['fractional window', { windowAt: OPENING + 0.5 }],
    ['short run ID', { run: 'short' }], ['long run ID', { run: 'a'.repeat(81) }], ['unsafe run ID', { run: '../1234567890123456' }], ['version', { v: 2 }]
  ]) await deny('first start refuses ' + label, setDoc(D(staff), first('staff', extra)));
  for (const field of Object.keys(first('staff'))) {
    const value = first('staff'); delete value[field];
    await deny('first start requires ' + field, setDoc(D(staff), value));
  }
  await deny('owner cannot choose first time either', setDoc(D(owner), first('head', { firstAt: Timestamp.fromMillis(NOW - 1) })));
  await deny('owner cannot list through collection group', getDocs(collectionGroup(owner, 'cooling')));
  await put('cooling/current', waiting());
  for (const [label, extra] of [
    ['forged recorder', { by: 'head' }], ['forged completer', { secondBy: 'head' }], ['numeric second start', { secondAt: NOW }],
    ['chosen second time', { secondAt: Timestamp.fromMillis(NOW - 1) }], ['stale revision', { rev: 1 }], ['skipped revision', { rev: 3 }],
    ['moved first time', { firstAt: Timestamp.fromMillis(NOW - 7200000 - 2000) }], ['changed first recorder', { firstBy: 'head' }],
    ['changed run', { run: 'other-1234567890123456' }], ['extra deadline', { secondDue: NOW + 1 }]
  ]) await deny('second stage refuses ' + label, updateDoc(D(staff), second('staff', extra)));
  await put('cooling/current', waiting({ firstAt: Timestamp.fromMillis(NOW - 7200000 + 60000) }));
  await deny('first deadline is checked on server time', updateDoc(D(staff), second('staff')));
  await put('cooling/current', complete({ secondAt: Timestamp.fromMillis(NOW - 14400000 + 60000) }));
  await deny('new batch cannot shorten four-hour stage', setDoc(D(staff), first('staff', { run: 'new-1234567890123456', rev: 3 })));
  await put('cooling/current', expired());
  await deny('completed batch requires distinct run identity', setDoc(D(staff), first('staff', { rev: 3 })));
  await deny('completed batch still requires next revision', setDoc(D(staff), first('staff', { run: 'new-1234567890123456', rev: 2 })));
  // Retaining the first Timestamp must preserve its microseconds exactly across an update of the second stage.
  const precise = new Timestamp(Math.floor((NOW - 7200000 - 1000) / 1000), 1000);
  await put('cooling/current', waiting({ firstAt: precise }));
  await deny('second start cannot round first-stage microseconds', updateDoc(D(staff), second('staff', { firstAt: Timestamp.fromMillis(precise.toMillis()) })));
  await pass('partial second update preserves exact microseconds', updateDoc(D(staff), second('staff')));
  for (const stage of ['first', 'second', 'new']) {
    await put('cooling/current', stage === 'first' ? null : stage === 'second' ? waiting() : expired());
    const outcomes = await Promise.allSettled(['staff', 'view'].map(by => stage === 'second'
      ? updateDoc(D(db(by)), second(by))
      : setDoc(D(db(by)), first(by, { run: by + '-1234567890123456', rev: stage === 'first' ? 1 : 3 }))));
    check(outcomes.filter(x => x.status === 'fulfilled').length === 1, stage + ' simultaneous starts have exactly one winner');
    const value = (await getDoc(D(staff))).data();
    check(value.rev === (stage === 'first' ? 1 : stage === 'second' ? 2 : 3), stage + ' racing clients cannot advance twice');
  }
  // Shared declarations are a separate bounded document. The timer and old client schema stay untouched.
  for (const role of kitchenRoles) {
    const d = db(role), by = roles[role];
    await put('cooling/current', complete()); await put('cooling/recorded', null);
    await pass(role + ' reads absent shared confirmations', getDoc(RD(d)));
    await pass(role + ' confirms the due first stage', setDoc(RD(d), recorded(by)));
    const one = (await getDoc(RD(d))).data();
    check(one.firstAt instanceof Timestamp && one.firstBy === by && one.secondAt === 0 && one.by === by, role + ' first confirmation uses server time and recorder');
    await deny(role + ' cannot rewrite a confirmed first stage', updateDoc(RD(d), recordStage(by, 1)));
    await deny(role + ' cannot delete shared confirmations', deleteDoc(RD(d)));
    await pass(role + ' confirms second stage without changing first', updateDoc(RD(d), recordStage(by, 2)));
    const both = (await getDoc(RD(d))).data();
    check(both.firstAt.isEqual(one.firstAt) && both.firstBy === one.firstBy && both.secondAt instanceof Timestamp && both.secondBy === by, role + ' first declaration stays exact');
    await deny(role + ' cannot rewrite a confirmed second stage', updateDoc(RD(d), recordStage(by, 2)));
    check((await getDoc(D(d))).data().rev === 2, role + ' confirmations never change timer revision');
    await put('cooling/recorded', null);
    await pass(role + ' may confirm second stage first', setDoc(RD(d), recorded(by, 2)));
    await pass(role + ' may then confirm the unrecorded first stage', updateDoc(RD(d), recordStage(by, 1)));
  }
  for (const [label, d, by] of invalid) {
    await put('cooling/current', complete()); await put('cooling/recorded', null);
    await deny(label + ' cannot read absent declarations', getDoc(RD(d)));
    await deny(label + ' cannot confirm a stage', setDoc(RD(d), recorded(by)));
    await put('cooling/recorded', recorded('staff', 1, { firstAt: Timestamp.fromMillis(NOW - 1000) }));
    await deny(label + ' cannot read saved declarations', getDoc(RD(d)));
    await deny(label + ' cannot confirm another stage', updateDoc(RD(d), recordStage(by, 2)));
  }
  await put('cooling/current', complete()); await put('cooling/recorded', null);
  for (const [label, patch] of [
    ['forged writer', { by: 'head' }], ['forged first recorder', { firstBy: 'head' }],
    ['chosen first time', { firstAt: Timestamp.fromMillis(NOW - 1) }], ['numeric first time', { firstAt: NOW }],
    ['different run', { run: 'other-1234567890123456' }], ['missing run', { run: '' }], ['extra field', { completed: true }],
    ['wrong version', { v: 2 }], ['empty recorder', { firstBy: '' }], ['both stages at once', { secondAt: serverTimestamp(), secondBy: 'staff' }],
    ['unconfirmed actor', { secondBy: 'staff' }], ['no stage confirmed', { firstAt: 0, firstBy: '' }]
  ]) await deny('confirmation refuses ' + label, setDoc(RD(staff), recorded('staff', 1, patch)));
  for (const field of Object.keys(recorded('staff'))) {
    const value = recorded('staff'); delete value[field];
    await deny('confirmation requires ' + field, setDoc(RD(staff), value));
  }
  await put('cooling/current', null);
  await deny('no timer cannot be confirmed', setDoc(RD(staff), recorded('staff')));
  await put('cooling/current', waiting({ firstAt: Timestamp.fromMillis(NOW - 7200000 + 60000) }));
  await deny('first confirmation cannot precede server deadline', setDoc(RD(staff), recorded('staff')));
  await put('cooling/current', waiting());
  await deny('second confirmation requires its timer to have started', setDoc(RD(staff), recorded('staff', 2)));
  await put('cooling/current', complete({ secondAt: Timestamp.fromMillis(NOW - 14400000 + 60000) }));
  await deny('second confirmation cannot precede server deadline', setDoc(RD(staff), recorded('staff', 2)));
  await put('cooling/current', complete());
  await pass('staff creates confirmation before another writer', setDoc(RD(staff), recorded('staff')));
  const prior = (await getDoc(RD(staff))).data();
  await deny('different writer cannot erase first declaration', setDoc(RD(db('view')), recorded('view', 2)));
  await deny('different writer cannot reattribute first declaration', updateDoc(RD(db('view')), recordStage('view', 2, { firstBy: 'view' })));
  await deny('different writer cannot replace first timestamp', updateDoc(RD(db('view')), recordStage('view', 2, { firstAt: Timestamp.fromMillis(NOW - 1) })));
  await pass('different writer confirms second while preserving first', updateDoc(RD(db('view')), recordStage('view', 2)));
  const crossWriter = (await getDoc(RD(staff))).data();
  check(crossWriter.firstAt.isEqual(prior.firstAt) && crossWriter.firstBy === 'staff' && crossWriter.secondBy === 'view' && crossWriter.by === 'view', 'second writer retains first recorder');
  for (const stage of [1, 2]) {
    await put('cooling/recorded', null);
    const outcomes = await Promise.allSettled(['staff', 'view'].map(by => setDoc(RD(db(by)), recorded(by, stage))));
    check(outcomes.filter(x => x.status === 'fulfilled').length === 1, 'simultaneous same-stage confirmation has one immutable winner');
  }
  await put('cooling/recorded', null);
  const competing = await Promise.allSettled([setDoc(RD(staff), recorded('staff')), setDoc(RD(db('view')), recorded('view', 2))]);
  check(competing.filter(x => x.status === 'fulfilled').length === 1, 'simultaneous different-stage creates cannot erase each other');
  const missingStage = competing[0].status === 'fulfilled' ? 2 : 1;
  await pass('explicit retry can add the other stage without overwriting winner', updateDoc(RD(staff), recordStage('staff', missingStage)));
  const nextRun = 'next-1234567890123456';
  await put('cooling/current', waiting({ run: nextRun, rev: 3 }));
  await deny('late previous-run confirmation cannot affect current batch', updateDoc(RD(staff), recordStage('staff', 1)));
  await pass('due new run replaces the old declaration pair', setDoc(RD(staff), recorded('staff', 1, { run: nextRun })));
  const replaced = (await getDoc(RD(staff))).data();
  check(replaced.run === nextRun && replaced.secondAt === 0 && replaced.secondBy === '', 'new run never inherits an older second confirmation');
  await deny('old batch cannot overwrite a replacement declaration', setDoc(RD(staff), recorded('staff')));
  await put('cooling/current', waiting());
  await put('pinset/staff', { at: 2 });
  await deny('PIN reset revokes reads', getDoc(D(staff)));
  await deny('PIN reset revokes stage starts', updateDoc(D(staff), second('staff')));
  await put('pinset/staff', { at: 1 });
  await put('config/main', { ...config, staffIds: config.staffIds.filter(id => id !== 'staff') });
  await deny('canonical removal revokes reads', getDoc(D(staff)));
  await deny('canonical removal revokes stage starts', updateDoc(D(staff), second('staff')));
  await realClockChecks();
  console.log(n + ' Operandio open-app cooling rules checks passed.');
} finally { await env.cleanup(); }
