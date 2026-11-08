// The browser SDK stand-in must enforce the server-only cooling boundary even for an admin device.
// Real Firestore rules are exercised separately in rules/cooling.test.mjs; no backend is simulated here.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const now = Date.parse('2026-11-08T00:00:00Z'), root = 'kitchens/000000';
  const realNow = Date.now;
  Date.now = () => now;
  let user = null, checks = 0, sequence = 0;
  global.localStorage = { getItem: () => null, setItem: () => {} };
  global.window = { __fakeAuthUser: () => user, addEventListener: () => {} };
  const source = fs.readFileSync(path.join(__dirname, 'fake/firebase-firestore.js'), 'utf8');
  const f = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  const db = f.getFirestore(), D = name => f.doc(db, ...root.split('/'), ...name.split('/'));
  const C = name => f.collection(db, ...root.split('/'), name), write = (name, value) => window.__fake.write(root + '/' + name, value);
  const allow = async (promise, label) => { await assert.doesNotReject(promise, label); checks++; };
  const deny = async (promise, label) => { await assert.rejects(promise, e => e.code === 'permission-denied', label); checks++; };
  const check = (value, label) => { assert.ok(value, label); checks++; };
  const config = { headId: 'head', staffIds: ['head', 'sous', 'staff', 'view', 'fn'], sousIds: ['head', 'sous'], fnOnlyIds: ['fn'], addIds: [], tickIds: [], delIds: [] };
  const session = (by, mode = 'personal', at = now - 1000) => ({ v: 2, by, mode, pinAt: 1,
    issuedAt: f.Timestamp.fromMillis(at), at: f.Timestamp.fromMillis(at), exp: Math.floor((at + 21600000) / 86400000) * 86400000 + 64800000 });
  function sign(role) {
    const by = ['owner', 'head'].includes(role) ? 'head' : role === 'shared' ? 'staff' : role;
    user = role === 'public' ? null : { uid: 'device-' + role, isAnonymous: role !== 'google', emailVerified: true, email: 'headchef@test.local' };
    if (user) {
      write('sessions/' + user.uid, role === 'locked' || role === 'google' ? null : session(by, role === 'shared' ? 'shared' : 'personal'));
      if (role === 'expired') write('sessions/' + user.uid, session('staff', 'personal', now - 86400000));
      if (role === 'removed') write('sessions/' + user.uid, session('removed'));
      if (role === 'owner') write('adminDevices/' + user.uid, { ...session('head'), googleUid: 'google-owner' });
    }
    return by;
  }
  const request = (stage = 1) => ({ v: 1, uid: user?.uid || 'anonymous', by: window.__fake.dump()[root + '/sessions/' + user?.uid]?.by || 'staff',
    sessionAt: window.__fake.dump()[root + '/sessions/' + user?.uid]?.issuedAt || f.Timestamp.fromMillis(now - 1000),
    stage, expectedRun: '', expectedRev: 0, at: f.serverTimestamp() });
  const nextId = () => 'request-' + String(++sequence).padStart(16, '0');
  const push = () => ({ v: 1, uid: user?.uid || 'anonymous', by: request().by, pinAt: 1, tok: 'synthetic-token', mode: 'personal', at: f.serverTimestamp() });
  write('config/main', config);
  for (const id of [...config.staffIds, 'removed']) write('pinset/' + id, { at: 1 });
  write('cooling/config', { v: 1, enabled: true });

  for (const role of ['head', 'owner', 'sous', 'staff', 'view', 'shared']) {
    sign(role);
    await allow(f.getDoc(D('cooling/config')), role + ' reads readiness');
    await allow(f.getDoc(D('cooling/current')), role + ' reads the current run, including absent');
    const id = nextId();
    await deny(f.getDoc(D('coolingRequests/' + id)), role + ' cannot read an unowned missing request');
    await allow(f.setDoc(D('coolingRequests/' + id), request()), role + ' starts the two-hour stage without Add or Tick');
    await allow(f.getDoc(D('coolingRequests/' + id)), role + ' reads only its own created result');
    await allow(f.setDoc(D('coolingRequests/' + nextId()), { ...request(2), expectedRun: 'run-current', expectedRev: 1 }), role + ' requests the four-hour stage');
    check(window.__fake.dump()[root + '/cooling/current'] === undefined, 'a client request never automatically publishes a run');
    await deny(f.setDoc(D('coolingRequests/' + id), request()), role + ' cannot replace its immutable request');
    await deny(f.updateDoc(D('coolingRequests/' + id), { status: 'accepted' }), role + ' cannot accept its own request');
    await deny(f.deleteDoc(D('coolingRequests/' + id)), role + ' cannot delete its request');
    await (role === 'shared' ? deny : allow)(f.setDoc(D('coolingPush/' + user.uid), push()), role + ' personal-only opt-in');
    await deny(f.getDoc(D('coolingPush/' + user.uid)), role + ' cannot read even its own token');
    await deny(f.setDoc(D('cooling/current'), { by: request().by, v: 1 }), role + ' cannot forge canonical time');
    await deny(f.setDoc(D('cooling/config'), { by: request().by, v: 1, enabled: true }), role + ' cannot enable backend readiness');
    await deny(f.getDocs(C('coolingRequests')), role + ' cannot enumerate requests');
  }

  for (const role of ['public', 'google', 'locked', 'expired', 'removed', 'fn']) {
    sign(role);
    await deny(f.getDoc(D('cooling/current')), role + ' cannot read shared cooling');
    await deny(f.getDoc(D('cooling/config')), role + ' cannot read backend readiness');
    await deny(f.setDoc(D('coolingRequests/' + nextId()), request()), role + ' cannot start cooling');
    await deny(f.setDoc(D('coolingPush/' + (user?.uid || 'anonymous')), push()), role + ' cannot opt in');
    await (user?.isAnonymous ? allow : deny)(f.deleteDoc(D('coolingPush/' + (user?.uid || 'anonymous'))), role + ' unsubscribe matches anonymous UID only');
  }

  sign('owner');
  await allow(f.getDoc(D('staffpins/head')), 'owner fixture has an active admin grant before testing cooling exceptions');
  for (const name of ['cooling', 'coolingRequests', 'coolingPush', 'coolingRuns', 'coolingJobs']) {
    await deny(f.getDocs(C(name)), 'admin cannot list ' + name);
    await deny(f.getDocs(f.collectionGroup(db, name)), 'admin cannot query the ' + name + ' collection group');
  }
  await deny(f.getDocs(f.collectionGroup(db, 'devices')), 'admin cannot query internal delivery receipts');
  for (const name of ['cooling/internal', 'cooling/current/private/state', 'coolingRuns/archive', 'coolingJobs/job', 'coolingJobs/job/devices/device-owner']) {
    write(name, { by: 'head' });
    await deny(f.getDoc(D(name)), 'admin cannot read ' + name);
    await deny(f.setDoc(D(name), { by: 'head' }), 'admin cannot write ' + name);
    await deny(f.deleteDoc(D(name)), 'admin cannot delete ' + name);
  }

  sign('view');
  for (const [label, change] of Object.entries({ uid: { uid: 'device-staff' }, by: { by: 'staff' }, session: { sessionAt: f.Timestamp.fromMillis(now - 2000) },
    date: { at: f.Timestamp.fromMillis(now - 1) }, duration: { duration: 7200000 }, outcome: { status: 'accepted' }, stage: { stage: 4 },
    revision: { expectedRev: -1 }, fractional: { expectedRev: 0.5 }, run: { expectedRun: 'bad/run' }, version: { v: 2 } })) {
    await deny(f.setDoc(D('coolingRequests/' + nextId()), { ...request(), ...change }), 'request rejects forged ' + label);
  }
  await deny(f.setDoc(D('coolingRequests/short'), request()), 'request rejects short IDs');
  const missingField = request(); delete missingField.sessionAt;
  await deny(f.setDoc(D('coolingRequests/' + nextId()), missingField), 'request requires all identity fields');
  for (const ready of [null, { v: 1, enabled: false }, { v: 2, enabled: true }]) {
    write('cooling/config', ready);
    await deny(f.setDoc(D('coolingRequests/' + nextId()), request()), 'request requires deployed v1 readiness');
  }
  write('cooling/config', { v: 1, enabled: true });
  const raced = nextId(), results = await Promise.allSettled([f.setDoc(D('coolingRequests/' + raced), request()), f.setDoc(D('coolingRequests/' + raced), request())]);
  check(results.filter(x => x.status === 'fulfilled').length === 1, 'concurrent duplicate request ID permits one create');
  const created = window.__fake.dump()[root + '/coolingRequests/' + raced];
  check(created.at instanceof f.Timestamp && created.at.toMillis() === now, 'server timestamp is materialized as current request time');
  for (const [label, change] of Object.entries({ uid: { uid: 'device-staff' }, by: { by: 'staff' }, pin: { pinAt: 2 }, mode: { mode: 'shared' },
    token: { tok: '' }, oversized: { tok: 'x'.repeat(4097) }, date: { at: f.Timestamp.fromMillis(now - 1) }, fields: { ua: 'extra' } })) {
    await deny(f.setDoc(D('coolingPush/' + user.uid), { ...push(), ...change }), 'subscription rejects forged ' + label);
  }
  await allow(f.setDoc(D('coolingPush/' + user.uid), push()), 'current personal view-only member can register');
  await allow(f.updateDoc(D('coolingPush/' + user.uid), { tok: 'refreshed-token', at: f.serverTimestamp() }), 'registration refresh validates the complete after-image');
  await deny(f.setDoc(D('coolingPush/device-staff'), push()), 'registration cannot overwrite another device');
  await deny(f.deleteDoc(D('coolingPush/device-staff')), 'unsubscribe cannot delete another device');

  let revoked;
  const rejection = new Promise(resolve => { revoked = resolve; });
  const stop = f.onSnapshot(D('coolingRequests/' + raced), () => {}, revoked);
  write('sessions/' + user.uid, session('staff'));
  check((await rejection).code === 'permission-denied', 'shared-device handover revokes the previous member result listener');
  stop();
  await deny(f.getDoc(D('coolingRequests/' + raced)), 'new member on same UID cannot read previous result');
  write('sessions/' + user.uid, session('view'));
  write('pinset/view', { at: 2 });
  await deny(f.getDoc(D('cooling/current')), 'PIN reset revokes canonical reads');
  await deny(f.setDoc(D('coolingRequests/' + nextId()), request()), 'PIN reset revokes starts');
  await allow(f.deleteDoc(D('coolingPush/' + user.uid)), 'PIN reset still allows own anonymous unsubscribe');
  Date.now = realNow;
  console.log('PASS cooling stand-in access: ' + checks + ' checks');
})().catch(e => { console.error(e); process.exit(1); });
