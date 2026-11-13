// A shared device retains a locked draft for its person until an explicit discard. Pending saves cannot be discarded.
const L = require('./lib');
const { R, ok } = L.results();
const day = L.ymd(new Date(L.NOW)), cutoff = Date.parse(day + 'T04:00:00+10:00');
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
function drafts() {
  localStorage.setItem('lk.mg.draft.example', JSON.stringify({ example: 'Original recipe draft' }));
  localStorage.setItem('lk.dw.draft.example', JSON.stringify({ example: 'Original drawing draft' }));
  localStorage.setItem('lk.fe.draft.example', JSON.stringify({ example: 'Original function draft' }));
}
async function unlock(p, pin) {
  await p.locator('#pf1').fill(pin);
  await L.waitFor(p, () => LK_PREP.privateAccess(), null, 8000);
}

(async () => {
  const browser = await L.start();
  let p;
  try {
    p = await L.open(browser, '#/prep', { who: 'ann', deviceMode: 'shared', clock: cutoff - 60000, wait: 1000, init: drafts });
    const original = await p.evaluate(() => ({ identity: LK_PREP.book().identity(), uid: LK_PREP.state.uid }));
    await p.locator('#p-text').fill('Original person prep draft'); await p.locator('#p-qty').fill('2 tubs');
    await p.clock.runFor(90000); await L.settle(p, 300);
    const locked = await p.evaluate(() => ({ lock: LK_PREP.workLock(), held: LK_PREP.state.lockHasDraft, blocked: LK_PREP.blockedRecorder(), text: LK_PREP.state.text }));
    ok(locked.lock && locked.lock.identity === original.identity && locked.lock.person === 'ann' && locked.held && locked.blocked === 'ann' && locked.text === 'Original person prep draft', '04:00 captures the original draft owner and stable identity');
    await p.locator('[data-p="who-change"]').click(); await L.settle(p, 150);
    ok(await p.evaluate(() => LK_PREP.state.who === 'ann' && LK_PREP.workLock() && LK_PREP.state.text === 'Original person prep draft') && /Discard work and change person/.test(await p.locator('[data-p="who-change"]').innerText()), 'the first Not me tap keeps the locked draft and asks for explicit discard confirmation');
    await p.locator('[data-p="who-change"]').click(); await L.settle(p, 300);
    ok(await p.evaluate(() => !LK_PREP.workLock() && !LK_PREP.blockedRecorder() && !LK_PREP.state.text && !LK_PREP.state.qty && !LK_PREP.state.lockHasDraft), 'the second Not me tap explicitly discards the original work and releases the device');
    ok(await p.evaluate(() => !Object.keys(localStorage).some(k => /^lk\.(mg|dw|fe)\.draft\./.test(k))), 'explicit discard also clears private recipe, drawing and function drafts');
    await p.locator('.p-name[data-id="bo"]').click(); await unlock(p, '3333');
    ok(await p.evaluate(uid => LK_PREP.state.uid === uid && LK_PREP.state.who === 'bo' && !LK_PREP.state.text && !LK_PREP.state.qty, original.uid), 'another person can unlock the shared device without the previous values');
    ok(!p.errors.length, 'draft handover has no browser errors ' + p.errors.join(' | '));
  } catch (error) { ok(false, 'draft handover: ' + String(error.message || error).split('\n')[0]); }
  if (p) await p.context().close();

  try {
    p = await L.open(browser, '#/prep', { who: 'ann', deviceMode: 'shared', clock: cutoff - 60000, wait: 1000 });
    await p.evaluate(async () => {
      const book = LK_PREP.book(), fb = await book.ready();
      __fake.mode = 'hold'; window.__handoverSaved = false;
      book.W([['set', fb.fs.doc(fb.db, 'kitchens', LK_PREP.state.pin, 'days', LK_TIME.day(), 'items', 'handover-example'),
        { text: 'Pending original work', qty: '2 tubs', station: 'Larder', done: false, deleted: false, addedBy: 'Ann', addedById: 'ann', addedAt: LK_TIME.now() }]])
        .then(() => { window.__handoverSaved = true; });
    });
    await p.clock.runFor(90000); await L.settle(p, 250);
    await p.locator('[data-p="who-change"]').click(); await p.locator('[data-p="who-change"]').click();
    ok(await p.evaluate(() => LK_PREP.blockedRecorder() === 'ann' && LK_PREP.unsent() && LK_PREP.state.who === 'ann' && !__handoverSaved), 'two Not me taps cannot discard or transfer a pending save');
    ok(await p.evaluate(() => !LK_PREP.signOut(true) && LK_PREP.workLock() && LK_PREP.unsent()), 'forced Sign out cannot override pending work');
    await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); }); await L.settle(p, 250);
    await unlock(p, '2222');
    await L.waitFor(p, () => __handoverSaved && !LK_PREP.unsent(), null, 10000);
    const saved = await p.evaluate(k => __fake.dump()[k], key('days', day, 'items', 'handover-example'));
    ok(saved && saved.by === 'ann' && saved.qty === '2 tubs', 'only the original person finishes the retained payload');
    ok(!p.errors.length, 'pending handover guard has no browser errors ' + p.errors.join(' | '));
  } catch (error) { ok(false, 'pending handover: ' + String(error.message || error).split('\n')[0]); }
  if (p) await p.context().close();

  // 13 Nov 2026: a save that reaches the server after the lock is sent. Before, it still said Not sent yet and Not me
  // did nothing until the same person came back, so nobody else could sign in on that device.
  try {
    p = await L.open(browser, '#/prep', { who: 'ann', deviceMode: 'shared', clock: cutoff - 60000, wait: 1000 });
    await p.evaluate(async () => {
      const book = LK_PREP.book(), fb = await book.ready();
      __fake.mode = 'hold'; window.__lateSaved = false;
      book.W([['set', fb.fs.doc(fb.db, 'kitchens', LK_PREP.state.pin, 'days', LK_TIME.day(), 'items', 'late-example'),
        { text: 'Saved after the lock', qty: '1 tub', station: 'Larder', done: false, deleted: false, addedBy: 'Ann', addedById: 'ann', addedAt: LK_TIME.now() }]])
        .then(() => { window.__lateSaved = true; });
    });
    await p.clock.runFor(90000); await L.settle(p, 250);
    await p.locator('[data-p="who-change"]').click(); await L.settle(p, 200);
    ok(await p.evaluate(() => LK_PREP.workLock() && LK_PREP.unsent() && LK_PREP.state.who === 'ann') && /Ann's PIN finishes sending it/.test(await p.locator('.p-toast-msg').first().innerText()), 'while still unsent, Not me holds and names whose PIN finishes it');
    await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); }); await L.settle(p, 300);
    ok(await p.evaluate(k => { const d = __fake.dump()[k]; return !!d && d.by === 'ann'; }, key('days', day, 'items', 'late-example')), 'the save reaches the server as the original person while the device is locked');
    await p.locator('[data-p="who-change"]').click();
    await L.waitFor(p, () => !LK_PREP.workLock() && !LK_PREP.unsent() && !LK_PREP.state.who, null, 5000);
    ok(await p.evaluate(() => __lateSaved && !LK_PREP.blockedRecorder()), 'once it is on the server, one Not me tap hands the device over');
    await p.locator('.p-name[data-id="bo"]').click(); await unlock(p, '3333');
    await L.waitFor(p, () => !LK_PREP.unsent(), null, 5000);
    ok(await p.evaluate(() => LK_PREP.state.who === 'bo' && !LK_PREP.blockedRecorder()), 'the next person signs in and nothing of the last person waits');
    ok(!p.errors.length, 'sent-while-locked handover has no browser errors ' + p.errors.join(' | '));
  } catch (error) { ok(false, 'sent-while-locked handover: ' + String(error.message || error).split('\n')[0]); }
  if (p) await p.context().close();
  await browser.close(); L.report(R);
})().catch(error => { console.error(error); process.exit(1); });
