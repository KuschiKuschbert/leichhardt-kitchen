// Device preferences never authenticate a person. A daily PIN session, its anonymous device UID and a bound
// owner grant remain separate from the remembered Google account. All identities and documents are synthetic.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const person = (id, name, role, rights = {}) => ({ id, name, role, active: true, add: true, tick: true, del: false, ...rights });
const people = [person('kit', 'Kit', 'head', { del: true }), person('sam', 'Sam', 'sous', { del: true }),
  person('lee', 'Lee', 'lead', { del: true }), person('ann', 'Ann', 'staff'), person('vic', 'Vic', 'view', { add: false, tick: false }),
  person('fay', 'Fay', 'fnc', { add: false, tick: false, fn: true })];
const pins = { kit: '6666', sam: '1111', lee: '5555', ann: '2222', vic: '4444', fay: '5151' };
const config = { people, headId: 'kit', staffIds: people.map(p => p.id), sousIds: ['kit', 'sam'], pingIds: ['kit', 'sam'], fnIds: ['fay'], fnOnlyIds: ['fay'], showBadges: true };
const extra = { [key('config', 'main')]: config };
for (const p of people) {
  extra[key('pinset', p.id)] = { at: 1, name: p.name };
  extra[key('staffpins', p.id)] = { hash: L.sha('lk:' + p.id + ':' + pins[p.id]) };
  extra[key('drinks', p.id)] = { kind: 'flat', size: 'reg', at: L.NOW - 86400000, by: p.id };
}
function init() {
  const day = new Date(Date.now() + 10 * 3600000).toISOString().slice(0, 10);
  ['kit', 'sam', 'lee', 'ann', 'vic', 'fay'].forEach(id => localStorage.setItem('lk.board.' + id, day));
}
const four = day => Date.parse(day + 'T04:00:00+10:00');
const day = new Date(L.NOW + 10 * 3600000).toISOString().slice(0, 10);
const cutoff = four(day), beforeCutoff = cutoff - 60000;
const routeFor = id => id === 'fay' ? '#/functions' : '#/prep';
const profile = p => p.evaluate(() => JSON.parse(localStorage.getItem('lk.device.v2') || 'null'));
const isPrivate = p => p.evaluate(() => !!(window.LK_PREP && LK_PREP.privateAccess()));
const record = (p, collection, uid) => p.evaluate(k => __fake.dump()[k] || null, key(collection, uid));
const millis = value => typeof value === 'number' ? value : value && (value.__fakeTimestamp != null ? value.__fakeTimestamp : value.seconds != null ? value.seconds * 1000 + (value.nanoseconds || 0) / 1000000 : value._seconds != null ? value._seconds * 1000 + (value._nanoseconds || 0) / 1000000 : null);
const stamp = at => ({ __fakeTimestamp: at });
const issuedAt = L.NOW - 60000, tomorrow = four(new Date(L.NOW + 86400000 + 10 * 3600000).toISOString().slice(0, 10));
const grant = { by: 'kit', pinAt: 1, issuedAt: stamp(issuedAt), exp: tomorrow, googleUid: 'owner', at: stamp(issuedAt), v: 2 };
async function auth(p) {
  return p.evaluate(async () => {
    const fb = await LK_PREP.book().ready(), state = LK_PREP.state;
    return { uid: state.uid, primaryUid: fb.auth.currentUser && fb.auth.currentUser.uid,
      anonymous: !!(fb.auth.currentUser && fb.auth.currentUser.isAnonymous),
      googleUid: fb.ownerAuth.currentUser && fb.ownerAuth.currentUser.uid,
      who: state.who, authed: state.authed, level: state.level };
  });
}
async function unlock(p, id) {
  const pick = p.locator('.p-name[data-id="' + id + '"]');
  if (await pick.count() && await pick.isVisible()) { await pick.click(); await L.settle(p, 200); }
  await p.locator('[data-k="pf1"]').fill(pins[id]);
  await L.waitFor(p, expected => LK_PREP.state.authed && LK_PREP.state.who === expected, id, 8000);
  await L.settle(p, 500);
}
async function open(browser, route, options = {}) {
  return L.open(browser, route || '#/prep', { who: 'ann', width: 390, height: 844, touch: true, extra, init, wait: 1500, ...options });
}
async function adminRead(p, secondary = false) {
  return p.evaluate(async secondary => {
    const fb = await LK_PREP.book().ready(), fs = secondary ? fb.ownerFs : fb.fs, db = secondary ? fb.ownerDb : fb.db;
    try { await fs.getDocFromServer(fs.doc(db, 'kitchens', LK_PREP.state.pin, 'daily', 'synthetic-access-check')); return 'allowed'; }
    catch (e) { return e.code || 'failed'; }
  }, secondary);
}
function denyGrantInit() {
  const day = new Date(Date.now() + 10 * 3600000).toISOString().slice(0, 10);
  ['kit', 'sam', 'lee', 'ann', 'vic', 'fay'].forEach(id => localStorage.setItem('lk.board.' + id, day));
  window.__fake = Object.assign(window.__fake || {}, { mode: 'ok', writes: [], reads: [], deny: /\/adminDevices\// });
}

(async () => {
  const browser = await L.start();
  let p;
  async function step(label, run) {
    try { await run(); }
    catch (e) { ok(false, label + ': ' + String(e.message || e).split('\n')[0]); }
    finally {
      if (p) { ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; }
    }
  }

  for (const touch of [false, true]) await step('own device has no idle lock ' + touch, async () => {
    p = await open(browser, '#/prep', { deviceMode: 'own', touch });
    const initial = await auth(p), session = await record(p, 'sessions', initial.uid);
    await p.clock.runFor(12 * 60000); await L.settle(p, 400);
    const current = await auth(p), later = await record(p, 'sessions', initial.uid);
    ok(await isPrivate(p) && current.who === 'ann' && current.authed && current.uid === initial.uid, (touch ? 'own phone' : 'own computer') + ': twelve idle minutes retain Ann and the device UID');
    ok(later && later.exp === session.exp && millis(later.issuedAt) === millis(session.issuedAt), 'idle time does not silently extend the daily session');
  });

  // Exercise every role, including view-only and function-only, under each device choice. The cutoff is AEST,
  // independent of the machine timezone and independent of whether the browser is a phone or computer.
  for (const mode of ['own', 'shared']) for (const id of ['ann', 'sam', 'lee', 'vic', 'fay', 'kit']) await step('04:00 ' + mode + ' ' + id, async () => {
    p = await open(browser, routeFor(id), { who: id, deviceMode: mode, clock: beforeCutoff, sessionExp: cutoff });
    const initial = await auth(p);
    ok(await isPrivate(p), mode + ' ' + id + ': a verified session opens before the cutoff');
    await p.clock.runFor(90000); await L.settle(p, 700);
    await L.waitFor(p, () => !!window.LK_PREP && !LK_PREP.privateAccess(), null, 8000);
    const current = await auth(p), session = await record(p, 'sessions', initial.uid);
    ok(!await isPrivate(p) && !current.authed, mode + ' ' + id + ': 04:00 removes operational access');
    ok(current.uid === initial.uid && current.anonymous, mode + ' ' + id + ': the anonymous device identity survives the daily lock');
    ok(!session || session.exp <= cutoff, mode + ' ' + id + ': expiry does not create tomorrow\'s session without a PIN');
    ok((await profile(p)).mode === (mode === 'own' ? 'personal' : 'shared'), mode + ' ' + id + ': the one-time device choice survives the daily lock');
  });

  for (const mode of ['own', 'shared']) await step('Google sign-in keeps device identity ' + mode, async () => {
    p = await open(browser, '#/admin', { who: 'kit', deviceMode: mode });
    const initial = await auth(p), session = await record(p, 'sessions', initial.uid);
    await p.locator('[data-p="signin"]').click();
    await L.waitFor(p, () => LK_PREP.state.level === 'owner' && !!document.querySelector('.ad-admin'), null, 8000);
    const current = await auth(p), later = await record(p, 'sessions', initial.uid);
    ok(current.uid === initial.uid && current.primaryUid === initial.uid && current.anonymous && current.googleUid !== initial.uid, mode + ': the actual Google sign-in button leaves operational authentication on the existing anonymous device');
    ok(later && later.by === session.by && later.exp === session.exp && millis(later.issuedAt) === millis(session.issuedAt) && await adminRead(p) === 'allowed', mode + ': Google augments the exact current head PIN session without moving or renewing it');
  });

  await step('legacy primary Google migration', async () => {
    const legacy = { by: 'kit', pinAt: 1, exp: L.NOW + 30 * 86400000, at: L.NOW };
    p = await open(browser, '#/admin', { admin: true, who: 'kit', deviceMode: 'own', legacyPrimaryGoogle: true,
      extra: { ...extra, [key('sessions', 'owner')]: legacy } });
    await L.waitFor(p, () => {
      const device = __fakeAuthUser('[DEFAULT]'), owner = __fakeAuthUser('kitchen-owner');
      return device && device.isAnonymous && owner && owner.uid === 'owner';
    }, null, 8000);
    const initial = await auth(p);
    ok(initial.anonymous && initial.uid === initial.primaryUid && initial.uid !== 'owner' && initial.googleUid === 'owner' && !await isPrivate(p), 'legacy Google moves to the owner app and a new anonymous device still needs a fresh PIN');
    ok(JSON.stringify(await record(p, 'sessions', 'owner')) === JSON.stringify(legacy), 'migration preserves the old shared Google-UID session document');
    await unlock(p, 'kit');
    await L.waitFor(p, () => LK_PREP.state.level === 'owner' && !!document.querySelector('.ad-admin'), null, 8000);
    const current = await auth(p), session = await record(p, 'sessions', initial.uid);
    ok(current.uid === initial.uid && session && session.v === 2 && session.by === 'kit' && session.exp === tomorrow, 'the fresh PIN opens a daily v2 session on the new device without changing its anonymous identity');
    ok(JSON.stringify(await record(p, 'sessions', 'owner')) === JSON.stringify(legacy) && await p.evaluate(path => !__fake.writes.flat().some(w => w.path === path), key('sessions', 'owner')), 'neither migration nor the new PIN writes to or deletes the legacy shared-UID session');
  });

  for (const mode of ['own', 'shared']) await step('Google alone needs daily PIN ' + mode, async () => {
    p = await open(browser, '#/admin', { admin: true, who: '', deviceMode: mode, dailyLocked: true });
    const initial = await auth(p);
    ok(initial.anonymous && initial.googleUid && initial.uid !== initial.googleUid && !await isPrivate(p), mode + ': remembered Google authentication never substitutes for today\'s PIN');
    ok(!(await p.locator('.ad-admin').count()), mode + ': the admin workspace stays hidden before the head-chef PIN');
    await unlock(p, 'kit');
    await L.waitFor(p, () => LK_PREP.state.level === 'owner' && !!document.querySelector('.ad-admin'), null, 8000);
    const current = await auth(p), session = await record(p, 'sessions', initial.uid), grant = await record(p, 'adminDevices', initial.uid);
    ok(current.uid === initial.uid && current.anonymous && current.googleUid === initial.googleUid, mode + ': completing Google and PIN authentication keeps the primary anonymous UID stable');
    ok(session && grant && session.by === 'kit' && grant.by === 'kit' && grant.googleUid === initial.googleUid && grant.exp === session.exp && millis(grant.issuedAt) === millis(session.issuedAt), mode + ': the owner grant is bound to this exact verified device session');
    ok(session && session.v === 2 && session.exp === tomorrow && millis(session.issuedAt) > 0, mode + ': a real PIN check opens only today\'s v2 session');
    ok(await p.evaluate(() => __fakePersistenceByApp['[DEFAULT]'] === 'local' && __fakePersistenceByApp['kitchen-owner'] === (LK_DEVICE.mode() === 'personal' ? 'local' : 'session')), mode + ': Google uses the chosen persistence independently of persistent anonymous authentication');
    ok(await adminRead(p) === 'allowed' && await adminRead(p, true) === 'permission-denied', mode + ': only the bound anonymous device can perform an admin operational read');
    await p.reload({ waitUntil: 'load' }); await L.settle(p, 1200);
    await L.waitFor(p, () => LK_PREP.state.level === 'owner', null, 8000);
    const restored = await auth(p);
    ok(restored.uid === initial.uid && restored.googleUid === initial.googleUid && await isPrivate(p), mode + ': reload preserves both independent identities and today\'s verified access');
  });

  for (const mode of ['own', 'shared']) await step('Google daily cutoff ' + mode, async () => {
    p = await open(browser, '#/admin', { admin: true, who: 'kit', deviceMode: mode, clock: beforeCutoff, sessionExp: cutoff });
    const initial = await auth(p);
    await L.waitFor(p, () => LK_PREP.state.level === 'owner', null, 8000);
    await p.clock.runFor(90000); await L.settle(p, 700);
    await L.waitFor(p, () => !!window.LK_PREP && !LK_PREP.privateAccess(), null, 8000);
    const current = await auth(p);
    ok(current.uid === initial.uid && current.anonymous && !await isPrivate(p), mode + ': Google admin also locks at 04:00 without replacing the device identity');
    ok(mode === 'own' ? current.googleUid === initial.googleUid : !current.googleUid, mode + ': daily lock ' + (mode === 'own' ? 'remembers personal Google authentication' : 'signs out the shared Google account'));
    if (mode === 'shared') { await p.locator('[data-p="signin"]').click(); await L.settle(p, 500); }
    await unlock(p, 'kit');
    await L.waitFor(p, () => LK_PREP.state.level === 'owner' && !!document.querySelector('.ad-admin'), null, 8000);
    const unlocked = await auth(p), fresh = await record(p, 'sessions', initial.uid), bound = await record(p, 'adminDevices', initial.uid);
    ok(unlocked.uid === initial.uid && unlocked.googleUid === initial.googleUid && fresh && fresh.exp === cutoff + 86400000 && millis(fresh.issuedAt) >= cutoff && bound && millis(bound.issuedAt) === millis(fresh.issuedAt), mode + ': the next day opens only after a fresh PIN and receives a newly bound grant on the same device');
  });

  // Both devices live in the same synthetic backend. A lock on this browser must never delete another device's
  // independently issued session/grant, even when both were opened by the same head chef and Google account.
  for (const owner of [false, true]) await step('shared idle is local ' + owner, async () => {
    p = await open(browser, owner ? '#/admin' : '#/prep', { admin: owner, who: owner ? 'kit' : 'ann', deviceMode: 'shared' });
    if (owner) await L.waitFor(p, () => LK_PREP.state.level === 'owner', null, 8000);
    const initial = await auth(p), session = await record(p, 'sessions', initial.uid), localGrant = await record(p, 'adminDevices', initial.uid);
    const remoteUid = 'another-trusted-device', remoteSession = { ...session, by: 'kit' };
    const remoteGrant = localGrant || { ...grant, issuedAt: session.issuedAt, at: session.at, exp: session.exp };
    await p.evaluate(a => { __fake.write(a.sessionKey, a.session); __fake.write(a.grantKey, a.grant); }, {
      sessionKey: key('sessions', remoteUid), session: remoteSession, grantKey: key('adminDevices', remoteUid), grant: remoteGrant
    });
    const remoteBefore = JSON.stringify([await record(p, 'sessions', remoteUid), await record(p, 'adminDevices', remoteUid)]);
    await p.clock.runFor(12 * 60000); await L.settle(p, 600);
    const locked = await auth(p);
    ok(!await isPrivate(p) && !locked.authed && !locked.googleUid && locked.uid === initial.uid && locked.anonymous, (owner ? 'head chef' : 'staff') + ': ten idle minutes lock only this shared browser, preserving its anonymous UID');
    ok(!(await p.locator('.nb-row,.ad-admin').count()) && !await record(p, 'adminDevices', initial.uid), 'shared idle hides private records and removes this device\'s owner grant');
    const reads = await p.evaluate(() => __fake.reads.length);
    await p.clock.runFor(45000); await L.settle(p, 300);
    ok(await p.evaluate(n => __fake.reads.slice(n).every(path => !/\/(days|orders|waste|daily|mail|notes|directnotes)\//.test(path)), reads), 'a locked shared screen starts no further operational reads');
    ok(JSON.stringify([await record(p, 'sessions', remoteUid), await record(p, 'adminDevices', remoteUid)]) === remoteBefore && await p.evaluate(uid => !__fake.writes.flat().some(w => w.path.endsWith('/' + uid)), remoteUid), 'idle lock leaves the other device\'s session and grant unchanged and never writes to that UID');
    await p.reload({ waitUntil: 'load' }); await L.settle(p, 1200);
    const reloaded = await auth(p);
    ok(!await isPrivate(p) && !reloaded.googleUid && reloaded.uid === initial.uid, 'reopening the idle shared screen still needs a PIN and does not restore Google');
  });

  await step('shared Google sign-out does not wait for Firestore', async () => {
    p = await open(browser, '#/admin', { admin: true, who: 'kit', deviceMode: 'shared' });
    await L.waitFor(p, () => LK_PREP.state.level === 'owner', null, 8000);
    const initial = await auth(p);
    await p.evaluate(() => { __fake.mode = 'hold'; });
    await p.clock.runFor(11 * 60000); await L.settle(p, 500);
    const locked = await auth(p);
    ok(!await isPrivate(p) && !locked.googleUid, 'a shared idle lock signs out the actual Google Auth client even while grant/session deletion waits for Firestore');
    ok(locked.anonymous && locked.primaryUid === initial.primaryUid, 'the offline shared Google sign-out preserves the independent anonymous device UID');
    await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); }); await L.settle(p, 300);
    ok(!(await auth(p)).googleUid && !await isPrivate(p), 'the delayed Firestore acknowledgement cannot restore Google or operational access');
  });

  // A remembered authorised Google account may legitimately repair a missing or stale grant. Refuse that repair
  // here so these cases exercise the stored mismatch itself, rather than mistaking a valid replacement for bypass.
  const mismatches = [
    ['missing', false], ['wrong person', { by: 'ann' }], ['old PIN', { pinAt: 99 }],
    ['different issuance', { issuedAt: stamp(issuedAt - 1000) }], ['different expiry', { exp: tomorrow - 1 }],
    ['legacy grant', { v: 1 }]
  ];
  for (const [label, value] of mismatches) await step('grant mismatch ' + label, async () => {
    p = await open(browser, '#/admin', { admin: true, who: 'kit', deviceMode: 'own', sessionIssuedAt: issuedAt,
      adminGrant: value === false ? false : { ...grant, ...value }, init: denyGrantInit });
    const state = await auth(p);
    ok(state.anonymous && state.googleUid && state.level !== 'owner' && !(await p.locator('.ad-admin').count()), label + ': a mismatched grant cannot open the admin workspace when replacement is refused');
    ok(await adminRead(p) === 'permission-denied', label + ': the operational data boundary also refuses the unmatched device grant');
  });

  await step('grant creation binds Google identity', async () => {
    p = await open(browser, '#/admin', { admin: true, who: 'kit', deviceMode: 'own' });
    await L.waitFor(p, () => LK_PREP.state.level === 'owner', null, 8000);
    const identity = await auth(p), before = JSON.stringify(await record(p, 'adminDevices', identity.uid));
    const result = await p.evaluate(async () => {
      const fb = await LK_PREP.book().ready(), fs = fb.ownerFs;
      const session = __fake.dump()['kitchens/' + LK_PREP.state.pin + '/sessions/' + LK_PREP.state.uid];
      const value = { by: session.by, pinAt: session.pinAt, issuedAt: session.issuedAt, exp: session.exp, googleUid: 'untrusted-google', at: fs.serverTimestamp(), v: 2 };
      try { await fs.setDoc(fs.doc(fb.ownerDb, 'kitchens', LK_PREP.state.pin, 'adminDevices', LK_PREP.state.uid), value); return 'allowed'; }
      catch (e) { return e.code || 'failed'; }
    });
    ok(result === 'permission-denied' && JSON.stringify(await record(p, 'adminDevices', identity.uid)) === before, 'a Google owner cannot issue a grant naming a different Google UID or replace the valid grant with it');
  });

  for (const change of ['PIN reset', 'session removed', 'head membership removed']) await step('owner revocation ' + change, async () => {
    p = await open(browser, '#/admin', { admin: true, who: 'kit', deviceMode: 'own' });
    await L.waitFor(p, () => LK_PREP.state.level === 'owner', null, 8000);
    const initial = await auth(p);
    ok(await adminRead(p) === 'allowed', change + ': the device starts with a functioning bound owner grant');
    await p.evaluate(a => {
      if (a.change === 'PIN reset') __fake.write(a.pinKey, { at: 99, name: 'Kit' });
      else if (a.change === 'session removed') __fake.write(a.sessionKey, null);
      else { const c = __fake.dump()[a.configKey]; __fake.write(a.configKey, { ...c, staffIds: c.staffIds.filter(id => id !== 'kit') }); }
    }, { change, pinKey: key('pinset', 'kit'), sessionKey: key('sessions', initial.uid), configKey: key('config', 'main') });
    ok(await adminRead(p) === 'permission-denied', change + ': the existing grant cannot bypass the revoked daily PIN authority');
    await p.reload({ waitUntil: 'load' }); await L.settle(p, 1200);
    const current = await auth(p), visible = await isPrivate(p), panes = await p.locator('.ad-admin').count();
    const locked = !visible && current.level !== 'owner' && !panes && current.primaryUid === initial.primaryUid && current.anonymous;
    ok(locked, change + ': reload stays locked on the same device and remembered Google cannot repair revoked PIN authority' + (locked ? '' : ' ' + JSON.stringify({ ...current, private: visible, panes, initialUid: initial.uid })));
  });

  for (const mode of ['own', 'shared']) await step('staff never inherits Google ' + mode, async () => {
    p = await open(browser, '#/prep', { admin: true, who: 'ann', deviceMode: mode });
    await L.waitFor(p, () => !LK_PREP.state.user && !LK_PREP.state.authed, null, 8000);
    const initial = await auth(p);
    ok(initial.anonymous && !initial.googleUid && initial.level !== 'owner' && !await isPrivate(p), mode + ': a staff name cannot inherit the Google account left on this browser');
    await unlock(p, 'ann');
    const current = await auth(p);
    ok(current.uid === initial.uid && current.who === 'ann' && current.authed && !current.googleUid && current.level !== 'owner' && await isPrivate(p), mode + ': Ann\'s own PIN restores only her staff access on the same anonymous device');
    ok(await adminRead(p) === 'permission-denied' && !await record(p, 'adminDevices', initial.uid), mode + ': the new staff identity has no owner grant or admin data access');
  });

  await browser.close(); L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
