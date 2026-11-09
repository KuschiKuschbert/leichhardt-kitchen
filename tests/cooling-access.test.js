// The browser SDK stand-in must enforce the same atomic shared timer transitions as Firestore.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  let tick = Date.parse('2026-11-08T00:00:00Z');
  const root = 'kitchens/000000', realNow = Date.now;
  Date.now = () => tick;
  let user = null, checks = 0;
  global.localStorage = { getItem: () => null, setItem: () => {} };
  global.window = { __fakeAuthUser: () => user, addEventListener: () => {} };
  const source = fs.readFileSync(path.join(__dirname, 'fake/firebase-firestore.js'), 'utf8');
  const f = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  const db = f.getFirestore(), D = (name = 'cooling/current') => f.doc(db, ...root.split('/'), ...name.split('/'));
  const C = name => f.collection(db, ...root.split('/'), name), write = (name, value) => window.__fake.write(root + '/' + name, value);
  const allow = async (promise, label) => { await assert.doesNotReject(promise, label); checks++; };
  const deny = async (promise, label) => { await assert.rejects(promise, e => e.code === 'permission-denied', label); checks++; };
  const check = (value, label) => { assert.ok(value, label); checks++; };
  const config = { headId: 'head', staffIds: ['head', 'sous', 'staff', 'view', 'fn'], sousIds: ['head', 'sous'], fnOnlyIds: ['fn'], addIds: [], tickIds: [], delIds: [] };
  const session = (by, mode = 'personal', at = tick - 1000) => ({ v: 2, by, mode, pinAt: 1,
    issuedAt: f.Timestamp.fromMillis(at), at: f.Timestamp.fromMillis(at), exp: Math.floor((at + 21600000) / 86400000) * 86400000 + 64800000 });
  function sign(role) {
    const by = ['owner', 'head'].includes(role) ? 'head' : role === 'shared' ? 'staff' : role;
    user = role === 'public' ? null : { uid: 'device-' + role, isAnonymous: role !== 'google', emailVerified: true, email: 'headchef@test.local' };
    if (user) {
      write('sessions/' + user.uid, role === 'locked' || role === 'google' ? null : session(by, role === 'shared' ? 'shared' : 'personal'));
      if (role === 'expired') write('sessions/' + user.uid, session('staff', 'personal', tick - 86400000));
      if (role === 'owner') write('adminDevices/' + user.uid, { ...session('head'), googleUid: 'google-owner' });
    }
    return by;
  }
  const current = (extra = {}) => ({ v: 1, run: 'run-1234567890123456', rev: 1,
    firstAt: f.Timestamp.fromMillis(tick - 7200000 - 1), firstBy: 'staff', secondAt: 0, secondBy: '', by: 'staff', ...extra });
  const complete = (due = Math.floor((tick + 36000000) / 86400000) * 86400000 - 36000000 - 1) => current({ rev: 2,
    firstAt: f.Timestamp.fromMillis(due - 21600000), secondAt: f.Timestamp.fromMillis(due - 14400000), secondBy: 'sous', by: 'sous' });
  const first = (by, extra = {}) => current({ firstAt: f.serverTimestamp(), firstBy: by, by, ...extra });
  const second = (by, extra = {}) => ({ rev: 2, secondAt: f.serverTimestamp(), secondBy: by, by, ...extra });
  write('config/main', config);
  for (const id of [...config.staffIds, 'removed']) write('pinset/' + id, { at: 1 });
  for (const role of ['head', 'owner', 'sous', 'staff', 'view', 'shared']) {
    const by = sign(role); write('cooling/current', null);
    await allow(f.getDoc(D()), role + ' reads absent shared state');
    await allow(f.setDoc(D(), first(by)), role + ' starts without Add or Tick');
    check(window.__fake.dump()[root + '/cooling/current'].firstAt.toMillis() === tick, 'first start gets server time');
    await deny(f.updateDoc(D(), second(by)), role + ' cannot skip two hours');
    await deny(f.setDoc(D(), first(by, { run: 'other-1234567890123456', rev: 2 })), role + ' cannot restart unfinished first stage');
    await deny(f.deleteDoc(D()), role + ' cannot delete timer');
    await deny(f.getDocs(C('cooling')), role + ' cannot enumerate timers');
    await deny(f.getDoc(D('cooling/other')), role + ' cannot read arbitrary timer documents');
    await deny(f.setDoc(D('cooling/other'), first(by)), role + ' cannot create arbitrary timer documents');
    write('cooling/current', current());
    await allow(f.updateDoc(D(), second(by)), role + ' starts four hours manually');
    const value = window.__fake.dump()[root + '/cooling/current'];
    check(value.firstAt.isEqual(current().firstAt) && value.firstBy === 'staff' && value.secondAt.toMillis() === tick && value.secondBy === by, role + ' preserves first-stage identity');
    await deny(f.updateDoc(D(), second(by, { rev: 3 })), role + ' cannot restart second stage');
    await deny(f.setDoc(D(), first(by, { run: 'other-1234567890123456', rev: 3 })), role + ' cannot skip four hours');
    write('cooling/current', complete(tick - 1));
    await deny(f.setDoc(D(), first(by, { run: 'other-1234567890123456', rev: 3 })), role + ' cannot restart on the completion day');
    write('cooling/current', complete());
    await allow(f.setDoc(D(), first(by, { run: 'other-1234567890123456', rev: 3 })), role + ' starts a new batch the day after four hours');
  }
  for (const role of ['public', 'google', 'locked', 'expired', 'removed', 'fn']) {
    const by = sign(role); write('cooling/current', null);
    await deny(f.getDoc(D()), role + ' cannot read shared cooling');
    await deny(f.setDoc(D(), first(by)), role + ' cannot start first stage');
    write('cooling/current', current());
    await deny(f.updateDoc(D(), second(by)), role + ' cannot start second stage');
    write('cooling/current', complete());
    await deny(f.setDoc(D(), first(by, { run: 'other-1234567890123456', rev: 3 })), role + ' cannot start a new batch');
  }
  sign('owner');
  await allow(f.getDoc(D('staffpins/head')), 'owner fixture has a real admin grant');
  await deny(f.getDocs(f.collectionGroup(db, 'cooling')), 'admin cannot list the cooling collection group');
  sign('view'); write('cooling/current', null);
  for (const [label, change] of Object.entries({ by: { by: 'staff' }, recorder: { firstBy: 'staff' },
    clock: { firstAt: f.Timestamp.fromMillis(tick - 1) }, numeric: { firstAt: tick }, duration: { duration: 7200000 },
    deadline: { firstDue: tick + 7200000 }, skipped: { secondAt: f.serverTimestamp(), secondBy: 'view' },
    revision: { rev: 2 }, fractional: { rev: 1.5 }, run: { run: 'bad/run' }, version: { v: 2 } })) {
    await deny(f.setDoc(D(), first('view', change)), 'first start rejects forged ' + label);
  }
  for (const field of Object.keys(first('view'))) {
    const value = first('view'); delete value[field];
    await deny(f.setDoc(D(), value), 'first start requires ' + field);
  }
  write('cooling/current', current());
  for (const [label, change] of Object.entries({ by: { by: 'staff' }, recorder: { secondBy: 'staff' },
    clock: { secondAt: f.Timestamp.fromMillis(tick - 1) }, numeric: { secondAt: tick }, stale: { rev: 1 }, skipped: { rev: 3 },
    first: { firstAt: f.Timestamp.fromMillis(tick - 7200001 - 1) }, firstBy: { firstBy: 'view' }, run: { run: 'other-1234567890123456' } })) {
    await deny(f.updateDoc(D(), second('view', change)), 'second stage rejects forged ' + label);
  }
  write('cooling/current', current({ firstAt: f.Timestamp.fromMillis(tick - 7200000 + 1) }));
  await deny(f.updateDoc(D(), second('view')), 'second stage cannot start one millisecond early');
  write('cooling/current', current({ firstAt: f.Timestamp.fromMillis(tick - 7200000) }));
  await allow(f.updateDoc(D(), second('view')), 'second stage may start exactly at two hours');
  write('cooling/current', { ...complete(), secondAt: f.Timestamp.fromMillis(tick - 14400000 + 1) });
  await deny(f.setDoc(D(), first('view', { run: 'other-1234567890123456', rev: 3 })), 'new batch cannot start one millisecond early');
  write('cooling/current', { ...complete(), secondAt: f.Timestamp.fromMillis(tick - 14400000) });
  await deny(f.setDoc(D(), first('view', { run: 'other-1234567890123456', rev: 3 })), 'new batch remains disabled exactly at four hours');
  const midnight = Date.parse('2026-11-08T14:00:00Z'), ended = complete(midnight - 1800000);
  tick = midnight - 1; sign('view'); write('cooling/current', ended);
  await deny(f.setDoc(D(), first('view', { run: 'other-1234567890123456', rev: 3 })), 'one millisecond before Queensland midnight is still locked');
  tick = midnight; sign('view');
  await allow(f.setDoc(D(), first('view', { run: 'other-1234567890123456', rev: 3 })), "Queensland midnight unlocks the preceding day's completed batch");
  write('cooling/current', complete(midnight));
  await deny(f.setDoc(D(), first('view', { run: 'other-1234567890123456', rev: 3 })), 'a four-hour deadline exactly at midnight locks for that whole new day');
  write('cooling/current', complete(midnight + 1));
  await deny(f.setDoc(D(), first('view', { run: 'other-1234567890123456', rev: 3 })), 'cross-midnight four-hour stage cannot restart while running');
  tick = midnight + 86400000; sign('view');
  await allow(f.setDoc(D(), first('view', { run: 'other-1234567890123456', rev: 3 })), 'a cross-midnight completion unlocks on the following midnight');
  for (const stage of ['first', 'second', 'new']) {
    write('cooling/current', stage === 'first' ? null : stage === 'second' ? current() : complete());
    const results = await Promise.allSettled([1, 2].map(i => stage === 'second' ? f.updateDoc(D(), second('view')) :
      f.setDoc(D(), first('view', { run: 'batch-' + i + '-1234567890123456', rev: stage === 'first' ? 1 : 3 }))));
    check(results.filter(x => x.status === 'fulfilled').length === 1, stage + ' racing writes commit exactly once');
  }
  write('cooling/current', current()); write('pinset/view', { at: 2 });
  await deny(f.getDoc(D()), 'PIN reset revokes shared reads');
  await deny(f.updateDoc(D(), second('view')), 'PIN reset revokes starts');
  write('pinset/view', { at: 1 }); write('config/main', { ...config, staffIds: config.staffIds.filter(id => id !== 'view') });
  await deny(f.getDoc(D()), 'canonical removal revokes shared reads');
  await deny(f.updateDoc(D(), second('view')), 'canonical removal revokes starts');
  Date.now = realNow;
  console.log('PASS open-app cooling stand-in access: ' + checks + ' checks');
})().catch(e => { console.error(e); process.exit(1); });
