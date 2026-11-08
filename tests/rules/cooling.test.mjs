// Synthetic Operandio access checks. Accepted starts, deadlines and delivery stay server-owned.
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, setLogLevel } from 'firebase/firestore';
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
const current = { v: 1, run: 'run-1234567890123456', rev: 1, firstAt: NOW, firstDue: NOW + 7200000, firstBy: 'staff', secondAt: 0, secondDue: 0, secondBy: '', schedule: { first: 'queued', second: '' } };
async function put(path, data) { await env.withSecurityRulesDisabled(c => data === null ? deleteDoc(doc(c.firestore(), K + path)) : setDoc(doc(c.firestore(), K + path), data)); }
async function setup() {
  await put('config/main', config);
  for (const id of [...config.staffIds, 'removed']) await put('pinset/' + id, { at: 1 });
  for (const [uid, session] of Object.entries(sessions)) await put('sessions/' + uid, session);
  await put('sessions/expired', dailySession('staff', { at: NOW - 86400000, exp: NOW - 1 }));
  await put('sessions/removed', dailySession('removed', { at: NOW }));
  await put('cooling/config', { v: 1, enabled: true });
  await put('cooling/current', current);
  await put('coolingRuns/' + current.run, current);
  await put('coolingJobs/job-1234567890123456', { run: current.run, stage: 1 });
  await seedOwnerDevice(env, { uid: 'owner', headId: 'head', at: NOW });
  // A remembered Google grant does not change who is on this device now.
  await seedOwnerDevice(env, { uid: 'rememberedStaff', headId: 'head', at: NOW });
  await put('sessions/rememberedStaff', sessions.rememberedStaff);
}
await setup();
const db = uid => anonContext(env, uid).firestore();
const D = (d, path) => doc(d, K + path);
const request = (uid, extra = {}) => ({ v: 1, uid, by: roles[uid] || 'staff', sessionAt: (sessions[uid] || sessions.staff).issuedAt, stage: 1, expectedRun: '', expectedRev: 0, at: serverTimestamp(), ...extra });
const push = (uid, extra = {}) => ({ v: 1, uid, by: roles[uid] || 'staff', pinAt: 1, tok: 'synthetic-token-' + uid, at: serverTimestamp(), mode: 'personal', ...extra });
let n = 0;
async function pass(label, operation) { await assertSucceeds(operation); n++; }
async function deny(label, operation) { await assertFails(operation); n++; }
const invalid = [
  ['signed out', env.unauthenticatedContext().firestore(), 'staff'],
  ['anonymous without PIN', db('unlocked'), 'unlocked'], ['expired', db('expired'), 'expired'], ['removed', db('removed'), 'removed'],
  ['Google only', env.authenticatedContext('staff', { email: OWNER, email_verified: true, firebase: { sign_in_provider: 'google.com' } }).firestore(), 'staff'],
  ['functions only', db('functions'), 'functions']
];
try {
  for (const role of kitchenRoles) {
    const d = db(role), id = 'start-' + role + '-1234567890123456';
    await pass(role + ' reads current', getDoc(D(d, 'cooling/current')));
    await pass(role + ' reads backend readiness', getDoc(D(d, 'cooling/config')));
    await pass(role + ' requests first stage without Add or Tick', setDoc(D(d, 'coolingRequests/' + id), request(role)));
    await pass(role + ' reads own request result', getDoc(D(d, 'coolingRequests/' + id)));
    await pass(role + ' may submit a second-stage request for server validation', setDoc(D(d, 'coolingRequests/next-' + id), request(role, { stage: 2, expectedRun: current.run, expectedRev: current.rev })));
    await deny(role + ' cannot write canonical state', setDoc(D(d, 'cooling/current'), current));
    await deny(role + ' cannot enable the backend', setDoc(D(d, 'cooling/config'), { v: 1, enabled: true }));
    await deny(role + ' cannot list cooling records', getDocs(collection(d, K + 'cooling')));
    await deny(role + ' cannot read run history', getDoc(D(d, 'coolingRuns/' + current.run)));
    await deny(role + ' cannot read jobs', getDoc(D(d, 'coolingJobs/job-1234567890123456')));
    await deny(role + ' cannot replace a request', setDoc(D(d, 'coolingRequests/' + id), request(role)));
    await deny(role + ' cannot edit a result', updateDoc(D(d, 'coolingRequests/' + id), { status: 'accepted' }));
    await deny(role + ' cannot delete a request', deleteDoc(D(d, 'coolingRequests/' + id)));
  }
  for (const [label, d, uid] of invalid) {
    await deny(label + ' reads', getDoc(D(d, 'cooling/current')));
    await deny(label + ' backend config', getDoc(D(d, 'cooling/config')));
    await deny(label + ' starts', setDoc(D(d, 'coolingRequests/blocked-1234567890123456'), request(uid, { by: uid === 'removed' ? 'removed' : roles[uid] || 'staff', sessionAt: uid === 'expired' ? Timestamp.fromMillis(NOW - 86400000) : (sessions[uid] || sessions.staff).issuedAt })));
    await deny(label + ' subscribes', setDoc(D(d, 'coolingPush/' + uid), push(uid, { by: uid === 'removed' ? 'removed' : roles[uid] || 'staff' })));
  }
  const staff = db('staff'), owner = db('owner');
  for (const d of [db('view'), owner]) {
    await deny('another member cannot read a request', getDoc(D(d, 'coolingRequests/start-staff-1234567890123456')));
    await deny('no request listing or filtered ownership query', getDocs(query(collection(d, K + 'coolingRequests'), where('uid', '==', 'staff'))));
  }
  await deny('no missing request ownership', getDoc(D(staff, 'coolingRequests/missing-1234567890123456')));
  // Requests are immutable inputs. The backend alone decides whether the requested transition is still valid.
  for (const [label, extra] of [
    ['forged UID', { uid: 'view' }], ['forged recorder', { by: 'head' }],
    ['old session', { sessionAt: Timestamp.fromMillis(NOW - 1) }], ['numeric session', { sessionAt: NOW }],
    ['wrong version', { v: 2 }], ['invalid stage', { stage: 4 }], ['fractional stage', { stage: 1.5 }],
    ['negative revision', { expectedRev: -1 }], ['fractional revision', { expectedRev: 0.5 }],
    ['unsafe run', { expectedRun: '../run' }], ['long run', { expectedRun: 'a'.repeat(81) }],
    ['client clock', { at: NOW }], ['chosen past time', { at: Timestamp.fromMillis(NOW - 5000) }],
    ['chosen duration', { duration: 1 }], ['chosen deadline', { firstDue: NOW + 1 }], ['forged result', { status: 'accepted' }]
  ]) await deny(label, setDoc(D(staff, 'coolingRequests/invalid-1234567890123456'), request('staff', extra)));
  for (const key of ['v', 'uid', 'by', 'sessionAt', 'stage', 'expectedRun', 'expectedRev', 'at']) {
    const r = request('staff'); delete r[key];
    await deny('missing ' + key, setDoc(D(staff, 'coolingRequests/missing-1234567890123456'), r));
  }
  for (const id of ['short', 'a'.repeat(81), 'invalid.request.123456']) await deny('invalid request ID', setDoc(D(staff, 'coolingRequests/' + id), request('staff')));
  for (const readiness of [null, { v: 1, enabled: false }, { v: 2, enabled: true }]) {
    await put('cooling/config', readiness);
    await deny('unavailable backend cannot accept request', setDoc(D(staff, 'coolingRequests/unready-1234567890123456'), request('staff')));
  }
  await put('cooling/config', { v: 1, enabled: true });
  const simultaneous = await Promise.allSettled([
    setDoc(D(staff, 'coolingRequests/concurrent-1234567890123456'), request('staff')),
    setDoc(D(db('view'), 'coolingRequests/concurrent-1234567890123456'), request('view'))
  ]);
  if (simultaneous.filter(r => r.status === 'fulfilled').length !== 1) throw new Error('A shared request identity must be created only once');
  n++;
  for (const role of kitchenRoles.filter(r => r !== 'tablet')) {
    const d = db(role);
    await pass(role + ' opts in own personal device', setDoc(D(d, 'coolingPush/' + role), push(role)));
    await pass(role + ' refreshes own token', setDoc(D(d, 'coolingPush/' + role), push(role, { tok: 'replacement-token' })));
    await deny(role + ' cannot read even own push address', getDoc(D(d, 'coolingPush/' + role)));
    await deny(role + ' cannot list addresses', getDocs(collection(d, K + 'coolingPush')));
  }
  await deny('shared tablet cannot retain a personal push', setDoc(D(db('tablet'), 'coolingPush/tablet'), push('tablet')));
  await deny('a spoofed personal mode does not change the session mode', setDoc(D(db('tablet'), 'coolingPush/tablet'), push('tablet', { mode: 'personal' })));
  for (const [label, extra] of [
    ['other UID', { uid: 'view' }], ['other owner', { by: 'head' }], ['old PIN', { pinAt: 0 }],
    ['wrong mode', { mode: 'shared' }], ['empty token', { tok: '' }], ['long token', { tok: 't'.repeat(4097) }],
    ['wrong version', { v: 2 }], ['client timestamp', { at: NOW }], ['extra field', { enabled: true }]
  ]) await deny('push ' + label, setDoc(D(staff, 'coolingPush/staff'), push('staff', extra)));
  await deny('cannot register another device path', setDoc(D(staff, 'coolingPush/view'), push('staff')));
  await deny('owner admin cannot delete another device subscription', deleteDoc(D(owner, 'coolingPush/staff')));
  await deny('cannot delete another device subscription', deleteDoc(D(staff, 'coolingPush/view')));
  await pass('valid worker deletes own subscription', deleteDoc(D(staff, 'coolingPush/staff')));
  await pass('deleting an already-removed own token is safe', deleteDoc(D(staff, 'coolingPush/staff')));
  await put('coolingPush/expired', { ...push('staff'), uid: 'expired', at: Timestamp.fromMillis(NOW) });
  await pass('expired session can unsubscribe its own anonymous device', deleteDoc(D(db('expired'), 'coolingPush/expired')));
  await put('coolingPush/no-session', { ...push('staff'), uid: 'no-session', at: Timestamp.fromMillis(NOW) });
  await pass('locked device without a session can unsubscribe itself', deleteDoc(D(db('no-session'), 'coolingPush/no-session')));
  await deny('Google identity cannot unsubscribe anonymous device', deleteDoc(D(invalid.find(([label]) => label === 'Google only')[1], 'coolingPush/staff')));
  await deny('signed out cannot unsubscribe', deleteDoc(D(env.unauthenticatedContext().firestore(), 'coolingPush/staff')));
  await deny('another kitchen path cannot be used', deleteDoc(doc(staff, 'kitchens/other/coolingPush/staff')));
  // Firestore sessions carry microseconds. Rebuilding their identity from a persisted numeric millisecond value
  // can round below the original microsecond, so the bridge must keep/recover the exact server-issued Timestamp.
  const preciseIssued = new Timestamp(Math.floor(NOW / 1000) - 1, 1000);
  await put('sessions/staff', { ...dailySession('staff', { at: preciseIssued.toMillis() }), issuedAt: preciseIssued, at: preciseIssued });
  await deny('lossy numeric timestamp reconstruction cannot impersonate exact session', setDoc(D(staff, 'coolingRequests/lossy-session-1234567890123456'),
    request('staff', { sessionAt: Timestamp.fromMillis(preciseIssued.toMillis()) })));
  const recoveredSession = await getDoc(D(staff, 'sessions/staff'));
  await pass('exact recovered microsecond session can start', setDoc(D(staff, 'coolingRequests/exact-session-1234567890123456'),
    request('staff', { sessionAt: recoveredSession.data().issuedAt })));
  await put('sessions/staff', dailySession('view', { at: NOW + 1 }));
  await deny('handover cannot read former member result on same UID', getDoc(D(staff, 'coolingRequests/start-staff-1234567890123456')));
  await deny('handover cannot submit old person request', setDoc(D(staff, 'coolingRequests/handover-1234567890123456'), request('staff')));
  await put('sessions/staff', sessions.staff);
  await put('pinset/staff', { at: 2 });
  await deny('PIN reset revokes current read', getDoc(D(staff, 'cooling/current')));
  await deny('PIN reset revokes request', setDoc(D(staff, 'coolingRequests/reset-1234567890123456'), request('staff')));
  await deny('PIN reset revokes push registration', setDoc(D(staff, 'coolingPush/staff'), push('staff')));
  await put('pinset/staff', { at: 1 });
  await put('config/main', { ...config, staffIds: config.staffIds.filter(id => id !== 'staff') });
  await deny('canonical removal revokes read', getDoc(D(staff, 'cooling/current')));
  await deny('canonical removal revokes request', setDoc(D(staff, 'coolingRequests/removed-1234567890123456'), request('staff')));
  await deny('canonical removal revokes subscription', setDoc(D(staff, 'coolingPush/staff'), push('staff')));
  await pass('removed member may still unsubscribe its own device', deleteDoc(D(staff, 'coolingPush/staff')));
  console.log(n + ' Operandio cooling rules checks passed.');
} finally { await env.cleanup(); }
