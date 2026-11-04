// A missing saved-shell binding/member gives truthful recovery without discarding a draft or pending write.
const L = require('./lib');
const { R, ok } = L.results();
const notice = p => p.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: 'lk-shell-unavailable' })));
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/prep', { who: 'ann', wait: 1200 });
  await p.evaluate(() => { window.__shellNoticeMarker = 1; __fake.mode = 'hold'; });
  await p.fill('#p-text', 'Synthetic pending shell recovery'); await p.press('#p-text', 'Enter');
  await L.waitFor(p, () => LK_PREP.unsent());
  await notice(p);
  await L.waitFor(p, () => /Saved book unavailable/.test(document.querySelector('.upd-bar')?.textContent || ''));
  ok(await p.locator('.upd-bar button').textContent() === 'Retry update', 'missing saved copy offers an explicit Retry update action');
  await p.clock.fastForward(21000);
  ok(await p.evaluate(() => __shellNoticeMarker === 1 && LK_PREP.unsent()), 'the missing-copy notice does not automatically reload over pending work');
  // the write has waited 21 seconds, so the Not sent yet band is up and the update band waits behind it (4 Nov 2026);
  // the guard behind Retry update is the same for a tap made before that and for the Reload buttons (LK_UPDATE.now())
  // (it slides away in 0.22 s on the browser's own clock, which the test clock does not move)
  const behind = await L.waitFor(p, () => getComputedStyle(document.querySelector('.upd-bar')).visibility === 'hidden' && /^Not sent yet/.test(document.querySelector('.p-sync.is-on')?.textContent || ''), null, 3000).then(() => true, () => false);
  ok(behind, 'the update band waits behind the Not sent yet band while the write waits');
  await L.tap(p, '.upd-bar button');
  ok(await p.evaluate(() => __shellNoticeMarker === 1 && LK_PREP.unsent()) && /Not sent yet/.test(await L.txt(p, '.upd-bar')), 'Retry update keeps the existing unacknowledged-write guard');
  ok((await L.txt(p, '#prep-root')).includes('Synthetic pending shell recovery'), 'pending work stays visible under the original recorder');
  ok(!await L.overflow(p) && p.errors.length === 0, 'pending-work recovery notice fits the phone without browser errors');
  await p.context().close();

  p = await L.open(b, '#/prep', { who: 'ann', wait: 1200 });
  await p.fill('#p-text', 'Synthetic unsaved shell draft');
  await notice(p); await p.click('.upd-bar button');
  await L.waitFor(p, () => !!document.querySelector('#lk-update-confirm'));
  ok(await p.locator('#lk-update-confirm').isVisible(), 'Retry update keeps the existing explicit draft decision');
  await p.locator('#lk-update-confirm button').filter({ hasText: 'Keep working' }).click();
  ok(await p.inputValue('#p-text') === 'Synthetic unsaved shell draft', 'Keep working retains the exact draft after a missing-copy notice');
  ok(p.errors.length === 0, 'draft recovery notice has no browser errors');
  await p.context().close(); await b.close(); L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
