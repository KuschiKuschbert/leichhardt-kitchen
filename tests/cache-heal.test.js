// Repair a broken Firestore read copy only when no work will be lost. Native unload prompts are deliberately absent
// in the regression cases: recovery itself must protect drafts, uncertain writes and work arriving during its check.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();
// SDK 10.14.1 uses firestore/<app name>/<project>/<main> for the default database and that prefix in shared-state keys.
const TARGET_CACHE = 'firestore_targets_firestore/[DEFAULT]/leichhardt-kitchen/_42';
const boom = p => p.evaluate(() => { window.__mark = 1; window.dispatchEvent(new ErrorEvent('error', { message: 'Uncaught Error: FIRESTORE (10.14.1) INTERNAL ASSERTION FAILED: Unexpected state', error: new Error('FIRESTORE (10.14.1) INTERNAL ASSERTION FAILED: Unexpected state') })); });
function noUnload() {
  const add = window.addEventListener;
  window.addEventListener = function (type, ...args) { if (type !== 'beforeunload') return add.call(this, type, ...args); };
}
const preserved = p => p.evaluate(key => window.__mark === 1 && !__fake.terminated && localStorage.getItem(key) === 'keep' && !localStorage.getItem('lk.fsheal'), TARGET_CACHE);
const markCache = p => p.evaluate(key => { localStorage.setItem(key, 'keep'); }, TARGET_CACHE);
const blur = p => p.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
const waitReload = p => L.waitFor(p, () => window.__mark !== 1, null, 8000).catch(() => {}).then(() => p.evaluate(() => window.__mark !== 1).catch(() => true));
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/prep', { wait: 1200 });
  await p.evaluate(key => localStorage.setItem(key, '1'), TARGET_CACHE);
  const loaded = p.waitForEvent('load', { timeout: 5000 }).then(() => true, () => false);
  await boom(p);
  ok(await loaded, 'a broken offline copy reloads the page');
  await L.settle(p, 1200);
  ok(await p.evaluate(key => !window.__mark && localStorage.getItem(key) === null && !!localStorage.getItem('lk.fsheal'), TARGET_CACHE), 'the offline copy is gone and the day is noted');
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
  for (const enumerate of [true, false]) await step('storage ownership ' + enumerate, async () => {
    p = await L.open(b, '#/prep', { init: noUnload, wait: 1200 });
    const fixtures = await p.evaluate(async () => {
      const prefix = 'firestore/[DEFAULT]/' + LK_FIREBASE.projectId + '/';
      const prefixes = ['firestore_clients_', 'firestore_mutations_', 'firestore_targets_', 'firestore_zombie_'];
      const exact = ['firestore_sequence_number_', 'firestore_online_state_', 'firestore_bundle_loaded_v2_'];
      const ownedKeys = prefixes.map(k => k + prefix + '_1').concat(exact.map(k => k + prefix));
      const keepKeys = ['firestore_targets_x', 'firestore_targets_' + prefix + 'not-a-shared-target',
        'firestore_targets_firestore/[DEFAULT]/synthetic-other-project/_1',
        'firestore_targets_firestore/synthetic-other-app/' + LK_FIREBASE.projectId + '/_1',
        'firestore_targets_firestore/kitchen-owner/' + LK_FIREBASE.projectId + '/_1',
        'firestore_targets_firestore/[DEFAULT]/' + LK_FIREBASE.projectId + '.synthetic-other-database/_1'];
      ownedKeys.concat(keepKeys).forEach(key => localStorage.setItem(key, 'stored value'));
      const own = prefix + 'main', keep = ['firestore/[DEFAULT]/synthetic-other-project/main',
        'firestore/synthetic-other-app/' + LK_FIREBASE.projectId + '/main',
        'firestore/kitchen-owner/' + LK_FIREBASE.projectId + '/main',
        'firestore/[DEFAULT]/' + LK_FIREBASE.projectId + '.synthetic-other-database/main',
        prefix + 'synthetic-other-store', 'synthetic-unrelated-store'];
      for (const name of [own].concat(keep)) await new Promise((resolve, reject) => {
        const q = indexedDB.open(name, 1); q.onupgradeneeded = () => q.result.createObjectStore('samples');
        q.onerror = () => reject(q.error); q.onsuccess = () => {
          const db = q.result, tx = db.transaction('samples', 'readwrite'); tx.objectStore('samples').put('stored value', 'sample');
          tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); reject(tx.error); };
        };
      });
      return { own, keep, ownedKeys, keepKeys };
    });
    if (!enumerate) await p.evaluate(() => { indexedDB.databases = undefined; });
    await boom(p); ok(await waitReload(p), 'scoped repair completes with database enumeration ' + (enumerate ? 'available' : 'unavailable'));
    await L.settle(p, 600);
    const result = await p.evaluate(async fixtures => {
      const names = (await indexedDB.databases()).map(d => d.name), values = [];
      for (const name of fixtures.keep) {
        if (!names.includes(name)) { values.push(null); continue; }
        values.push(await new Promise((resolve, reject) => {
          const q = indexedDB.open(name); q.onerror = () => reject(q.error); q.onsuccess = () => {
            const db = q.result, tx = db.transaction('samples'), read = tx.objectStore('samples').get('sample');
            read.onsuccess = () => resolve(read.result); read.onerror = () => reject(read.error); tx.oncomplete = () => db.close();
          };
        }));
      }
      return { ownGone: !names.includes(fixtures.own), otherDataKept: values.every(x => x === 'stored value'),
        ownedKeysGone: fixtures.ownedKeys.every(k => localStorage.getItem(k) === null), otherKeysKept: fixtures.keepKeys.every(k => localStorage.getItem(k) === 'stored value') };
    }, fixtures);
    ok(result.ownGone && result.ownedKeysGone, 'only the configured default-app read database and verified shared-state keys are cleared');
    ok(result.otherDataKept && result.otherKeysKept, 'other projects, apps, databases and unsupported keys retain their actual stored values');
  });
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
    const kept = await p.evaluate(key => window.__mark === 1 && __fake.terminated && localStorage.getItem(key) === 'keep' && !localStorage.getItem('lk.fsheal'), TARGET_CACHE) && await p.inputValue('#p-text') === 'Typed after clean termination started';
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

  await step('signal lost during termination', async () => {
    p = await L.open(b, '#/prep', { init: noUnload, wait: 1200 }); await markCache(p);
    await p.evaluate(async () => {
      const fb = await LK_PREP.book().ready(), terminate = fb.fs.terminate; let delay = true;
      fb.fs.terminate = () => { const stopped = terminate(fb.db); if (!delay) return stopped; delay = false; return new Promise(resolve => { window.__healStopped = () => stopped.then(resolve); }); };
    });
    await boom(p); await L.waitFor(p, () => typeof window.__healStopped === 'function', null, 2500);
    await p.context().setOffline(true); await p.evaluate(() => __healStopped()); await L.settle(p, 500);
    ok(await p.evaluate(key => navigator.onLine === false && window.__mark === 1 && localStorage.getItem(key) === 'keep' && !localStorage.getItem('lk.fsheal'), TARGET_CACHE), 'losing signal after the successful server check prevents cleanup, daily marker and reload');
    await p.context().setOffline(false);
    ok(await waitReload(p), 'online recovery retries the deferred clean repair without a new cache error');
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

  await step('shared-state cleanup failure', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', init: noUnload, wait: 1200 });
    await p.fill('#p-text', 'Acknowledged before storage failure'); await p.press('#p-text', 'Enter');
    await L.waitFor(p, () => !LK_PREP.unsent() && !LK_PREP.state.text && Object.values(__fake.dump()).some(v => v && v.text === 'Acknowledged before storage failure'));
    await blur(p); await markCache(p);
    await p.evaluate(key => {
      const remove = Storage.prototype.removeItem, drop = indexedDB.deleteDatabase.bind(indexedDB); window.__healDeletes = 0;
      Storage.prototype.removeItem = function (name) { if (name === key) throw new DOMException('Synthetic shared-state denial', 'SecurityError'); return remove.call(this, name); };
      indexedDB.deleteDatabase = function (name) { window.__healDeletes++; return drop(name); };
    }, TARGET_CACHE);
    await boom(p);
    // The repair checks the server (one HEAD) before it reaches the shared state, so wait for its answer:
    // a fixed settle could end while the HEAD was still out on a slow runner (CI, 3 Nov 2026).
    await L.waitFor(p, () => /could not be repaired/.test(LK_PREP.state.toast), null, 8000).catch(() => {});
    ok(await p.evaluate(key => window.__mark === 1 && localStorage.getItem(key) === 'keep' && !localStorage.getItem('lk.fsheal') && window.__healDeletes === 0 && /could not be repaired/.test(LK_PREP.state.toast), TARGET_CACHE), 'a real shared-state removal error stops before database deletion, daily marker and reload, with truthful feedback');
  });
  await b.close();
  L.report(R);
})();
