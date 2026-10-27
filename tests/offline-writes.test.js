// No signal and changes waiting to send (27 Oct 2026, audit frame-12, r2-2-6, prep-orders-1, waste-transfers-todo-5).
// Since 26 Oct 2026 (#387) Firestore keeps a change made with no signal in this tab's memory only (memoryLocalCache), so a
// reload, Update now, the 04:00 refresh or a closed app loses it, and a reload with no signal opens an empty book.
// The strip says to keep the book open, the browser asks before leaving while writes wait, Update now asks for a
// second tap, the reloads wait for the signal, and every list marks its lines Not sent, on a phone too.
// The stand-in keeps its data in localStorage, so a lost write cannot be shown here: 'hold' stands in for a waiting write.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const today = L.ymd(new Date(L.NOW));
const mark = p => p.evaluate(() => { window.__mark = 1; });
const reloaded = p => p.evaluate(() => window.__mark !== 1).catch(() => true);
const waitReload = p => L.waitFor(p, () => window.__mark !== 1, null, 15000).catch(() => {});
// what a reload or closing the tab would do: true when the book asks first
const asks = p => p.evaluate(() => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });
// the Not sent mark on the row whose words hold this text: 'shown' (it has a size on screen), 'hidden', 'none' or 'no row'
const unsent = (p, text) => p.evaluate(t => {
  const row = [...document.querySelectorAll('.nb-row')].find(r => ((r.querySelector('.nb-t') || {}).textContent || '').indexOf(t) >= 0);
  if (!row) return 'no row';
  const m = row.querySelector('.nb-unsent');
  if (!m) return 'none';
  const b = m.getBoundingClientRect();
  return b.width > 0 && b.height > 0 ? 'shown' : 'hidden';
}, text);
const hold = p => p.evaluate(() => { window.__fake.mode = 'hold'; });
const release = p => p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
// the update strip, as when the service worker has saved a new version (more than 8 seconds after opening)
async function updBar(p) {
  await p.clock.fastForward(10000);
  await p.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: 'lk-new' })));
  await L.waitFor(p, () => !!document.querySelector('.upd-bar'), null, 3000).catch(() => {});
}
const bar = p => p.evaluate(() => { const b = document.querySelector('.upd-bar'); return b ? { t: b.querySelector('span').textContent, btn: b.querySelector('button').textContent, oneLine: b.querySelector('span').getBoundingClientRect().height < 30 && b.scrollWidth <= b.clientWidth } : null; });

(async () => {
  const b = await L.start();

  let p = null;
  // each step on its own: one that fails (say the page reloaded) is a FAIL, and the next steps still run
  async function step(n, fn) {
    try { await fn(); } catch (e) { ok(false, 'step ' + n + ' stopped: ' + String(e && e.message || e).split('\n')[0]); }
    if (p) await p.context().close().catch(() => {});
    p = null;
  }

  // 1. prep at 390 (staff): the strip's words, the Not sent mark on a phone, the browser asking before leaving
  await step('1', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', wait: 1500 });
    await p.context().setOffline(true);
    await L.settle(p, 300);
    const strip = await txt(p, '.p-sync') || '';
    ok(strip === 'No signal. Keep the book open: your changes send when the signal is back.', 'strip: no signal says to keep the book open (' + strip + ')');
    ok(!/kept on this device|Lines marked/.test(strip), 'strip: it no longer promises the changes are kept on the device');
    await p.context().setOffline(false);
    await L.settle(p, 300);
    ok(!(await asks(p)), 'leaving: nothing waiting, the browser does not ask');
    await hold(p);
    await p.fill('#p-text', 'Wipe the pass shelves');
    await p.press('#p-text', 'Enter');
    await L.waitFor(p, () => !!document.querySelector('.nb-unsent'), null, 3000).catch(() => {});
    ok(await unsent(p, 'Wipe the pass shelves') === 'shown', 'prep at 390: the waiting line shows Not sent (' + await unsent(p, 'Wipe the pass shelves') + ')');
    ok(await asks(p), 'leaving: a write waiting for the server, the browser asks first');
    await release(p);
    await L.settle(p, 500);
    ok(await unsent(p, 'Wipe the pass shelves') === 'none', 'prep: Not sent goes once the server has it');
    ok(!(await asks(p)), 'leaving: everything sent, the browser does not ask');
    ok(p.errors.length === 0, 'prep: no page errors ' + p.errors.join(' | '));
  });

  // 2. orders at 390: the waiting line shows Not sent, and the server's confirm takes it off
  await step('2', async () => {
    p = await L.open(b, '#/orders', { wait: 1500 });
    await hold(p);
    await p.fill('#o-text', 'Cream');
    await p.fill('#o-qty', '4 L');
    await p.press('#o-text', 'Enter');
    await L.waitFor(p, () => !!document.querySelector('.nb-unsent'), null, 3000).catch(() => {});
    ok(await unsent(p, 'Cream') === 'shown', 'orders at 390: the waiting line shows Not sent (' + await unsent(p, 'Cream') + ')');
    await release(p);
    await L.settle(p, 500);
    ok(await unsent(p, 'Cream') === 'none', 'orders: Not sent goes once the server has it');
    ok(p.errors.length === 0, 'orders: no page errors ' + p.errors.join(' | '));
  });

  // 3. wastage at 390
  await step('3', async () => {
    p = await L.open(b, '#/waste', { wait: 1500 });
    await hold(p);
    await p.fill('#w-text', 'Rice');
    await p.fill('#w-amt', '1.5');
    await p.evaluate(() => { const r = document.querySelector('.w-rchips [data-v="excess"]') || document.querySelector('[data-p="wreason"][data-v="excess"]'); r.click(); });
    await L.settle(p, 100);
    await p.click('.w-add .nb-addbtn');
    await L.waitFor(p, () => !!document.querySelector('.nb-unsent'), null, 3000).catch(() => {});
    ok(await unsent(p, 'Rice') === 'shown', 'wastage at 390: the waiting entry shows Not sent (' + await unsent(p, 'Rice') + ')');
    await release(p);
    await L.settle(p, 500);
    ok(await unsent(p, 'Rice') === 'none', 'wastage: Not sent goes once the server has it');
    ok(p.errors.length === 0, 'wastage: no page errors ' + p.errors.join(' | '));
  });

  // 4. transfers at 390, then a return: the phone's own mark is never saved in the open loan's record
  await step('4', async () => {
    p = await L.open(b, '#/transfers', { wait: 1500 });
    await hold(p);
    await p.fill('#tr-venue', 'Riviera');
    await p.fill('#tr-person', 'Tom');
    await p.fill('#tr-text', 'Butter');
    await p.fill('#tr-amt', '2');
    await p.click('[data-p="tr-unit"][data-v="kg"]');
    await p.click('.tr-add .nb-addbtn');
    await L.waitFor(p, () => !!document.querySelector('.nb-unsent'), null, 3000).catch(() => {});
    ok(await unsent(p, 'Butter') === 'shown', 'transfers at 390: the waiting line shows Not sent (' + await unsent(p, 'Butter') + ')');
    await release(p);
    await L.settle(p, 500);
    ok(await unsent(p, 'Butter') === 'none', 'transfers: Not sent goes once the server has it');
    await p.evaluate(() => { const r = [...document.querySelectorAll('.tr-row')].find(x => /Butter/.test(x.textContent)); r.querySelector('[data-p="tr-return"]').click(); });
    await L.settle(p, 600);
    const rec = await p.evaluate(d => { const s = window.__fake.dump(); const k = Object.keys(s).find(k => k.indexOf('/transferOpen/' + d + '_') > 0 && s[k].record && s[k].record.text === 'Butter'); return k ? s[k] : null; }, today);
    ok(rec && rec.record.returned === true && !('_unsent' in rec.record), 'transfers: a return saves the record without the phone\'s Not sent flag (' + JSON.stringify(rec && Object.keys(rec.record)) + ')');
    ok(p.errors.length === 0, 'transfers: no page errors ' + p.errors.join(' | '));
  });

  // 5. Update now with a write waiting, then with half a line typed: a second tap first
  await step('5', async () => {
    p = await L.open(b, '#/prep', { wait: 1500 });
    await updBar(p);
    let u = await bar(p);
    ok(u && u.t === 'New version available.' && u.btn === 'Update now', 'update: the strip is up');
    await hold(p);
    await p.fill('#p-text', 'Slice tomatoes');
    await p.press('#p-text', 'Enter');
    await L.settle(p, 300);
    await mark(p);
    await p.click('.upd-bar button');
    await L.settle(p, 1500);
    ok(!(await reloaded(p)), 'update: a write waiting, the first tap does not reload');
    u = await bar(p);
    ok(u && u.t === 'Not saved yet.' && u.btn === 'Tap again to update' && u.oneLine, 'update: it asks for a second tap, on one line at 390 (' + JSON.stringify(u) + ')');
    await L.settle(p, 4500);
    u = await bar(p);
    ok(u && u.btn === 'Update now', 'update: left alone, the button goes back after 4 seconds');
    await release(p);
    await L.settle(p, 400);
    await p.fill('#p-text', 'Half a line');
    await p.click('.upd-bar button');
    await L.settle(p, 1500);
    ok(!(await reloaded(p)), 'update: half a line typed, the first tap does not reload');
    await p.click('.upd-bar button');
    await waitReload(p);
    ok(await reloaded(p), 'update: the second tap updates');
  });

  // 6. Update now with no signal: the book stays as it is, and updates once the signal is back
  await step('6', async () => {
    p = await L.open(b, '#/prep', { wait: 1500 });
    await updBar(p);
    await p.context().setOffline(true);
    await L.settle(p, 300);
    await mark(p);
    await p.click('.upd-bar button');
    await L.settle(p, 1500);
    ok(!(await reloaded(p)), 'update, no signal: the tap does not reload into an empty book');
    u = await bar(p);
    ok(u && /^No signal\./.test(u.t) && u.oneLine, 'update, no signal: the strip says so, on one line at 390 (' + JSON.stringify(u) + ')');
    ok(/Writing as/.test(await txt(p, '#prep-root') || ''), 'update, no signal: the prep list is still there');
    await p.context().setOffline(false);
    await L.settle(p, 300);
    await p.click('.upd-bar button');
    await waitReload(p);
    ok(await reloaded(p), 'update: with the signal back, the tap updates');
  });

  // 7. the automatic update with no signal (2 minutes untouched): it waits for the signal
  await step('7', async () => {
    p = await L.open(b, '#/prep', { touch: true, wait: 1500 });
    await updBar(p);
    await p.context().setOffline(true);
    await L.settle(p, 300);
    await mark(p);
    await p.clock.fastForward('02:30');
    await L.settle(p, 1500);
    ok(!(await reloaded(p)), 'automatic update, no signal: no reload after 2 minutes untouched');
    await p.context().setOffline(false);
    await L.settle(p, 300);
    await p.clock.fastForward('00:30');
    await waitReload(p);
    ok(await reloaded(p), 'automatic update: it updates once the signal is back');
  });

  // 8. the 04:00 refresh with no signal (a router restarting overnight): it waits, and goes once the signal is back
  await step('8', async () => {
    p = await L.open(b, '#/recipes', { wait: 1500 });
    await p.clock.fastForward('13:58:00');
    await L.settle(p, 300);
    await p.context().setOffline(true);
    await L.settle(p, 300);
    await mark(p);
    await p.clock.fastForward('00:03:00');
    await L.settle(p, 2000);
    ok(!(await reloaded(p)), '04:00, no signal: no reload into an empty book');
    await p.context().setOffline(false);
    await waitReload(p);
    ok(await reloaded(p), '04:00: once the signal is back, the book refreshes');
    ok(/#\/recipes/.test(p.url()), '04:00: it stays on the same page');
  });

  // 9. the 04:00 refresh with a write waiting: no reload until it is sent
  await step('9', async () => {
    p = await L.open(b, '#/prep', { touch: true, wait: 1500 });
    await hold(p);
    await p.fill('#p-text', 'Portion the brisket');
    await p.press('#p-text', 'Enter');
    await L.settle(p, 300);
    await p.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
    await mark(p);
    await p.clock.fastForward('14:01:00');
    await L.settle(p, 1500);
    ok(!(await reloaded(p)), '04:00, a write waiting: no reload');
    await release(p);
    await L.settle(p, 400);
    await p.evaluate(() => { window.LK_PREP.state.text = ''; window.LK_PREP.state.qty = ''; });
    await p.clock.fastForward('00:10:30');
    await waitReload(p);
    ok(await reloaded(p), '04:00: sent, it refreshes 10 minutes later');
  });

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
