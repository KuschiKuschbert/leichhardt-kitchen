// A late atomic refusal at 04:00 keeps the original payload behind the same person's PIN. All data is synthetic.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const day = L.ymd(new Date(L.NOW)), cutoff = Date.parse(day + 'T04:00:00+10:00');
async function unlock(p, id, pin) {
  const choice = p.locator('.p-name[data-id="' + id + '"]');
  if (await choice.count() && await choice.isVisible()) await choice.click();
  await p.locator('#pf1').fill(pin);
  await L.waitFor(p, id => LK_PREP.state.authed && LK_PREP.state.who === id, id, 8000);
}
(async () => {
  const b = await L.start();
  for (const admin of [false, true]) for (const mode of ['personal', 'shared']) {
    const id = admin ? 'head' : 'ann', pin = admin ? '4444' : '2222', label = (admin ? 'admin' : 'staff') + ' ' + mode;
    const p = await L.open(b, admin ? '#/admin' : '#/prep', { admin, who: id, deviceMode: mode, clock: cutoff - 60000, wait: 1000 });
    try {
      await L.waitFor(p, () => LK_PREP.privateAccess() && !LK_PREP.unsent());
      await p.evaluate(async admin => {
        const book = LK_PREP.book(), fb = await book.ready(), originalReject = Promise.reject;
        // Hold one permission-denied SDK reply, then restore native Promise behaviour immediately. The first
        // attempt is rejected atomically by the stand-in; it never changes a record or invents an acknowledgement.
        Promise.reject = function (error) {
          if (error && error.code === 'permission-denied') {
            Promise.reject = originalReject; __fake.mode = 'ok';
            return new Promise((resolve, reject) => { window.__releaseRefusal = () => reject(error); });
          }
          return originalReject.call(Promise, error);
        };
        __fake.mode = 'deny';
        const state = LK_PREP.state, stamp = LK_TIME.day();
        const ref = admin ? fb.fs.doc(fb.db, 'kitchens', state.pin, 'daily', 'recovery-example') : fb.fs.doc(fb.db, 'kitchens', state.pin, 'days', stamp, 'items', 'recovery-example');
        const data = admin ? { example: fb.fs.increment(1) } : { text: 'Recovery example', qty: '2 tubs', station: 'Larder', done: false, deleted: false, addedBy: 'Ann', addedById: 'ann', addedAt: LK_TIME.now() };
        window.__recoveryDone = false; window.__recoveryError = '';
        book.W([['set', ref, data, true]]).then(() => { window.__recoveryDone = true; }, e => { window.__recoveryError = e.code || 'failed'; });
      }, admin);
      await L.waitFor(p, () => typeof window.__releaseRefusal === 'function');
      await p.clock.runFor(90000); await L.settle(p, 300);
      ok(await p.evaluate(() => !LK_PREP.privateAccess() && LK_PREP.unsent() && !window.__recoveryDone), label + ': daily privacy lock keeps the pending operation without reporting success');
      await p.evaluate(() => window.__releaseRefusal()); await L.settle(p, 250);
      ok(await p.evaluate(id => LK_PREP.blockedRecorder() === id && !window.__recoveryDone && !window.__recoveryError, id), label + ': late refusal retains the original recorder and payload');
      ok(await p.evaluate(() => !LK_PREP.signOut(true) && LK_PREP.unsent()), label + ': a second sign-out cannot abandon work or hand it to another person');
      if (admin && mode === 'shared') {
        ok(await p.evaluate(async () => !(await LK_PREP.book().ready()).ownerAuth.currentUser), label + ': overnight lock clears actual Google authentication');
        await p.locator('[data-p="signin"]').click(); await L.settle(p, 400);
      }
      await unlock(p, id, pin);
      await L.waitFor(p, () => window.__recoveryDone && !LK_PREP.unsent(), null, 10000);
      const saved = await p.evaluate(k => __fake.dump()[k], admin ? key('daily', 'recovery-example') : key('days', day, 'items', 'recovery-example'));
      ok(saved && saved.by === id && (admin ? saved.example === 1 : saved.qty === '2 tubs'), label + ': fresh same-person PIN sends the original change once with its original writer');
      ok(await p.evaluate(() => !window.__recoveryError), label + ': recovered save resolves without a stale permission error');
      ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | '));
    } catch (e) { ok(false, label + ': ' + String(e.message || e).split('\n')[0]); }
    await p.context().close();
  }
  // A draft that has never been submitted stays hidden during the boundary and returns for the same person.
  const p = await L.open(b, '#/prep', { who: 'ann', clock: cutoff - 60000, wait: 700 });
  await p.fill('[data-k="p-text"]', 'Half-written prep'); await p.clock.runFor(90000); await L.settle(p, 300);
  ok(await p.evaluate(() => !LK_PREP.privateAccess() && LK_PREP.dirtyForUpdate()), 'unsubmitted prep draft survives behind the daily PIN lock');
  await unlock(p, 'ann', '2222');
  ok(await p.locator('[data-k="p-text"]').inputValue() === 'Half-written prep', 'same-person daily unlock restores the unsubmitted prep text');
  await p.context().close(); await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exitCode = 1; });
