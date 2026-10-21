// A broken Firestore offline copy (20 Oct 2026: "INTERNAL ASSERTION FAILED", the prep pages stuck on Loading with no
// names) is thrown away and the page reloads by itself, once a day at most so it can never loop.
const L = require('./lib');
const { R, ok } = L.results();
const boom = p => p.evaluate(() => { window.__mark = 1; window.dispatchEvent(new ErrorEvent('error', { message: 'Uncaught Error: FIRESTORE (10.14.1) INTERNAL ASSERTION FAILED: Unexpected state', error: new Error('FIRESTORE (10.14.1) INTERNAL ASSERTION FAILED: Unexpected state') })); });
(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/prep', { wait: 1200 });
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
  await b.close();
  L.report(R);
})();
