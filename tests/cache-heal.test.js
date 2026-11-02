// Repair a broken Firestore read copy only when no work will be lost. Native unload prompts are deliberately absent
// in the regression cases: recovery itself must protect drafts, uncertain writes and work arriving during its check.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();
const boom = p => p.evaluate(() => { window.__mark = 1; window.dispatchEvent(new ErrorEvent('error', { message: 'Uncaught Error: FIRESTORE (10.14.1) INTERNAL ASSERTION FAILED: Unexpected state', error: new Error('FIRESTORE (10.14.1) INTERNAL ASSERTION FAILED: Unexpected state') })); });
function noUnload() {
  const add = window.addEventListener;
  window.addEventListener = function (type, ...args) { if (type !== 'beforeunload') return add.call(this, type, ...args); };
}
const preserved = p => p.evaluate(() => window.__mark === 1 && !__fake.terminated && localStorage.getItem('firestore_targets_recovery') === 'keep' && !localStorage.getItem('lk.fsheal'));
const markCache = p => p.evaluate(() => { localStorage.setItem('firestore_targets_recovery', 'keep'); });
const blur = p => p.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
const waitReload = p => L.waitFor(p, () => window.__mark !== 1, null, 8000).catch(() => {}).then(() => p.evaluate(() => window.__mark !== 1).catch(() => true));
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/prep', { wait: 1200 });
  await p.evaluate(() => localStorage.setItem('firestore_targets_x', '1'));
  const loaded = p.waitForEvent('load', { timeout: 5000 }).then(() => true, () => false);
  await boom(p);
  ok(await loaded, 'a broken offline copy reloads the page');
  await L.settle(p, 1200);
  ok(await p.evaluate(() => !window.__mark && localStorage.getItem('firestore_targets_x') === null && !!localStorage.getItem('lk.fsheal')), 'the offline copy is gone and the day is noted');
  ok(await p.$('.p-name, .p-list, #p-text') !== null, 'the prep list opens again after the reload');
  ok(await p.evaluate(() => localStorage.getItem('lk.prep.pin')) === L.PIN, 'the kitchen PIN is kept');
  await boom(p);
  await L.settle(p, 1500);
  ok(await p.evaluate(() => window.__mark === 1), 'a second break the same day does not reload again');
  await p.context().close();

  async function step(label, run) {
    try { await run(); }
    catch (e) { ok(false, label + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { await p.context().close().catch(() => {}); p = null; } }
  }
  for (const [name, hash, field, value, extra] of [
    ['Prep', '#/prep', '#p-text', 'Retained prep'],
    ['Orders', '#/orders', '#o-text', 'Retained order'],
    ['Wastage', '#/waste', '#w-text', 'Retained waste'],
    ['Supplier', '#/suppliers/northside', '[data-sf="qty"][data-i="t-stock"]', '4', F.fixture()]
  ]) await step(name + ' draft', async () => {
    p = await L.open(b, hash, { who: 'sam', extra, init: noUnload, wait: 1200 });
    await p.locator(field).fill(value); await markCache(p);
    ok(await p.evaluate(() => LK_PREP.unsavedHere()), name + ': actual form is dirty before cache failure');
    await boom(p); await L.settle(p, 500);
    ok(await preserved(p) && await p.locator(field).inputValue() === value, name + ': no termination, cache deletion, daily marker or reload over the draft without a native unload prompt');
  });

  await step('uncertain save', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', init: noUnload, wait: 1200 });
    await p.evaluate(() => { __fake.mode = 'hold'; });
    await p.fill('#p-text', 'Original recorder cache recovery'); await p.press('#p-text', 'Enter');
    await L.waitFor(p, () => LK_PREP.unsent()); await blur(p); await markCache(p);
    await boom(p); await L.settle(p, 500);
    ok(await preserved(p) && await p.evaluate(() => LK_PREP.unsent() && LK_PREP.state.who === 'ann'), 'uncertain save keeps its original recorder, pending marker and live SDK before acknowledgement');
    await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); });
    ok(await waitReload(p), 'acknowledgement resumes the deferred clean repair without another error or manual replay');
    await L.settle(p, 700);
    ok(await p.evaluate(() => Object.values(__fake.dump()).filter(v => v && v.text === 'Original recorder cache recovery' && v.by === 'ann').length === 1), 'the acknowledged operation remains exactly once with Ann as recorder after repair');
  });

  await step('no server', async () => {
    p = await L.open(b, '#/prep', { init: noUnload, wait: 1200 }); await markCache(p);
    await p.evaluate(() => { window.__healChecks = 0; window.lkServerUp = () => { __healChecks++; return Promise.resolve(false); }; });
    await boom(p); await L.settle(p, 500);
    ok(await preserved(p) && await p.evaluate(() => __healChecks === 1), 'failed server check leaves the SDK, read copy and daily repair allowance intact');
    await p.evaluate(() => { window.lkServerUp = () => Promise.resolve(true); window.dispatchEvent(new Event('online')); });
    ok(await waitReload(p), 'a real retry opportunity resumes the clean repair once the server returns');
  });

  for (const kind of ['draft', 'pending']) await step('new ' + kind + ' during check', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', init: noUnload, wait: 1200 }); await markCache(p);
    await p.evaluate(() => { window.lkServerUp = () => new Promise(resolve => { window.__healServer = resolve; }); });
    await boom(p);
    await L.waitFor(p, () => typeof window.__healServer === 'function', null, 2500);
    if (kind === 'pending') await p.evaluate(() => { __fake.mode = 'hold'; });
    await p.fill('#p-text', 'New work during repair check');
    if (kind === 'pending') { await p.press('#p-text', 'Enter'); await L.waitFor(p, () => LK_PREP.unsent()); }
    await p.evaluate(() => __healServer(true)); await L.settle(p, 500);
    ok(await preserved(p) && await p.evaluate(kind => kind === 'pending' ? LK_PREP.unsent() : LK_PREP.state.text === 'New work during repair check', kind), kind + ' arriving while reachability waits prevents termination and reload');
  });

  await step('late work during termination', async () => {
    p = await L.open(b, '#/prep', { init: noUnload, wait: 1200 }); await markCache(p);
    await p.evaluate(async () => {
      const fb = await LK_PREP.book().ready(), terminate = fb.fs.terminate;
      fb.fs.terminate = () => { const stopped = terminate(fb.db); return new Promise(resolve => { window.__healStopped = () => stopped.then(resolve); }); };
    });
    await boom(p); await L.waitFor(p, () => typeof window.__healStopped === 'function', null, 2500);
    await p.fill('#p-text', 'Typed after clean termination started');
    await p.evaluate(() => __healStopped()); await L.settle(p, 500);
    const kept = await p.evaluate(() => window.__mark === 1 && __fake.terminated && localStorage.getItem('firestore_targets_recovery') === 'keep' && !localStorage.getItem('lk.fsheal')) && await p.inputValue('#p-text') === 'Typed after clean termination started';
    ok(kept, 'new work after a clean termination starts still prevents read-copy deletion, daily marker and reload');
    if (!kept) return;
    // The real terminated SDK can refuse new writes. Model a refused SDK reply through the normal save path.
    await p.evaluate(() => { __fake.mode = 'fail'; }); await p.press('#p-text', 'Enter');
    await L.waitFor(p, () => !LK_PREP.unsent() && /could not|not saved|no signal/i.test(LK_PREP.state.toast), null, 8000);
    ok(await p.inputValue('#p-text') === 'Typed after clean termination started' && await p.evaluate(() => window.__mark === 1 && !localStorage.getItem('lk.fsheal')), 'a refused write after termination retains the real form instead of clearing it or reloading');
  });

  await step('termination failure', async () => {
    p = await L.open(b, '#/prep', { init: noUnload, wait: 1200 }); await markCache(p);
    await p.evaluate(async () => { const fb = await LK_PREP.book().ready(); fb.fs.terminate = () => Promise.reject(new Error('Synthetic terminate failure')); });
    await boom(p); await L.settle(p, 500);
    ok(await preserved(p) && /could not be repaired/.test(await p.locator('.p-toast').innerText()), 'failed termination preserves the read copy and daily attempt, with truthful failure feedback');
  });

  await step('database cleanup failure', async () => {
    p = await L.open(b, '#/prep', { init: noUnload, wait: 1200 });
    await p.evaluate(() => {
      indexedDB.databases = () => Promise.resolve([{ name: 'firestore/synthetic-old-copy' }]);
      indexedDB.deleteDatabase = () => { const request = {}; queueMicrotask(() => request.onerror()); return request; };
    });
    await boom(p); await L.settle(p, 500);
    ok(await p.evaluate(() => window.__mark === 1 && !localStorage.getItem('lk.fsheal')) && /could not be repaired/.test(await p.locator('.p-toast').innerText()), 'failed database cleanup cannot spend the daily attempt or claim a completed repair');
  });
  await b.close();
  L.report(R);
})();
