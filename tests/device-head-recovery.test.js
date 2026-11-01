// A forgotten daily head PIN cannot strand an original shared-device save. All identities and records are synthetic.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const day = L.ymd(new Date(L.NOW)), cutoff = Date.parse(day + 'T04:00:00+10:00');
const base = L.seed()[key('config', 'main')];
const extra = {
  [key('config', 'main')]: { ...base, headId: 'head', people: base.people.concat([{ id: 'head', name: 'Example head', role: 'head', active: true, add: true, tick: true, del: true, ping: true }]),
    staffIds: (base.staffIds || []).concat(['head']), sousIds: (base.sousIds || []).concat(['head']), pingIds: (base.pingIds || []).concat(['head']) },
  [key('pinset', 'head')]: { at: 1 },
  [key('staffpins', 'head')]: { hash: L.sha('lk:head:4444') }
};

async function deniedUntilBoundary(p, admin) {
  await L.waitFor(p, () => LK_PREP.privateAccess() && !LK_PREP.unsent());
  await p.evaluate(async admin => {
    const book = LK_PREP.book(), fb = await book.ready(), reject = Promise.reject;
    Promise.reject = function (error) {
      if (error && error.code === 'permission-denied') {
        Promise.reject = reject; __fake.mode = 'ok';
        return new Promise((yes, no) => { window.__headRefusal = () => no(error); });
      }
      return reject.call(Promise, error);
    };
    __fake.mode = 'deny';
    const state = LK_PREP.state, ref = admin
      ? fb.fs.doc(fb.db, 'kitchens', state.pin, 'daily', 'head-recovery-example')
      : fb.fs.doc(fb.db, 'kitchens', state.pin, 'days', LK_TIME.day(), 'items', 'staff-recovery-example');
    const value = admin ? { example: fb.fs.increment(1) }
      : { text: 'Staff recovery example', qty: '2 tubs', station: 'Larder', done: false, deleted: false, addedBy: 'Ann', addedById: 'ann', addedAt: LK_TIME.now() };
    window.__headSaved = false; window.__headError = '';
    book.W([['set', ref, value, true]]).then(() => { window.__headSaved = true; }, error => { window.__headError = error.code || 'failed'; });
  }, admin);
  await L.waitFor(p, () => typeof window.__headRefusal === 'function');
  await p.clock.runFor(90000); await L.settle(p, 200);
  await p.evaluate(() => window.__headRefusal()); await L.settle(p, 200);
}

(async () => {
  const browser = await L.start();
  let p;
  try {
    p = await L.open(browser, '#/admin', { admin: true, who: 'head', deviceMode: 'shared', clock: cutoff - 60000, wait: 1000, extra });
    const uid = await p.evaluate(() => LK_PREP.state.uid);
    await deniedUntilBoundary(p, true);
    ok(await p.evaluate(() => LK_PREP.blockedRecorder() === 'head' && LK_PREP.unsent() && !__headSaved && !__headError), 'the atomic refusal retains the original head save after 04:00');
    ok(await p.evaluate(async () => !(await LK_PREP.book().ready()).ownerAuth.currentUser), 'the shared daily lock clears actual Google authentication');
    await p.locator('[data-p="signin"]').click();
    await L.waitFor(p, () => LK_PREP.state.ownerVerified && !!document.querySelector('[data-p="owner-reset"]'));
    ok(await p.evaluate(() => !LK_PREP.privateAccess() && !__headSaved), 'remembered work and fresh Google do not bypass the new personal PIN');
    const prior = await p.evaluate(k => __fake.dump()[k], key('pinset', 'head'));
    await p.locator('[data-p="owner-reset"]').click(); await L.settle(p, 100);
    ok(await p.evaluate(k => !!__fake.dump()[k], key('staffpins', 'head')), 'the first reset tap only asks for confirmation');
    await p.locator('[data-p="owner-reset"]').click();
    await L.waitFor(p, () => !!document.querySelector('#pf2'), null, 8000);
    ok(await p.evaluate(() => !__headSaved && !__headError && LK_PREP.unsent()), 'fresh Google reset keeps the save blocked until a replacement head PIN and grant exist');
    await p.locator('#pf1').fill('7777'); await p.locator('#pf2').fill('7777');
    await L.waitFor(p, () => __headSaved && !LK_PREP.unsent() && LK_PREP.state.level === 'owner', null, 10000);
    const saved = await p.evaluate(k => __fake.dump()[k], key('daily', 'head-recovery-example'));
    const session = await p.evaluate(k => __fake.dump()[k], key('sessions', uid));
    const grant = await p.evaluate(k => __fake.dump()[k], key('adminDevices', uid));
    ok(saved && saved.example === 1 && saved.by === 'head', 'the original payload is applied once with the original head recorder');
    ok(await p.evaluate(expected => LK_PREP.state.uid === expected && LK_PREP.state.who === 'head' && !__headError, uid), 'recovery keeps the same anonymous device and resolves the original save');
    ok(session && grant && session.pinAt !== prior.at && session.pinAt === grant.pinAt && session.exp === grant.exp && JSON.stringify(session.issuedAt) === JSON.stringify(grant.issuedAt), 'the replacement PIN session and owner grant match the new PIN cycle');
    ok(!p.errors.length, 'head PIN recovery has no browser errors ' + p.errors.join(' | '));
  } catch (error) {
    const state = p && await p.evaluate(() => ({ step: LK_PREP.state.pinStep, level: LK_PREP.state.level, message: LK_PREP.state.saveMsg, pinMessage: LK_PREP.state.pinMsg, blocked: LK_PREP.blockedRecorder() })).catch(() => null);
    ok(false, 'head PIN recovery: ' + String(error.message || error).split('\n')[0] + ' ' + JSON.stringify(state));
  }
  if (p) await p.context().close();

  try {
    p = await L.open(browser, '#/prep', { who: 'ann', deviceMode: 'shared', clock: cutoff - 60000, wait: 1000, extra });
    await deniedUntilBoundary(p, false);
    const headPin = await p.evaluate(k => __fake.dump()[k], key('pinset', 'head'));
    await p.goto(L.BASE + '#/admin'); await L.settle(p, 400);
    await p.locator('[data-p="signin"]').click(); await L.settle(p, 300);
    ok(await p.evaluate(async () => LK_PREP.blockedRecorder() === 'ann' && !(await LK_PREP.book().ready()).ownerAuth.currentUser), 'another staff recorder cannot use the pending-head Google recovery exception');
    ok(!await p.locator('[data-p="owner-reset"]').count() && await p.evaluate(a => JSON.stringify(__fake.dump()[a.key]) === JSON.stringify(a.pin), { key: key('pinset', 'head'), pin: headPin }), 'staff work cannot open or reset the head PIN');
    await p.goto(L.BASE + '#/prep'); await L.settle(p, 300);
    await p.locator('#pf1').fill('2222');
    await L.waitFor(p, () => __headSaved && !LK_PREP.unsent(), null, 10000);
    const saved = await p.evaluate(k => __fake.dump()[k], key('days', day, 'items', 'staff-recovery-example'));
    ok(saved && saved.by === 'ann' && saved.qty === '2 tubs', 'the staff payload can still recover through its own original PIN');
    ok(!p.errors.length, 'staff recovery guard has no browser errors ' + p.errors.join(' | '));
  } catch (error) { ok(false, 'staff recovery guard: ' + String(error.message || error).split('\n')[0]); }
  if (p) await p.context().close();
  await browser.close(); L.report(R);
})().catch(error => { console.error(error); process.exitCode = 1; });
