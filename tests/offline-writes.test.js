// No signal and changes waiting to send (27 Oct 2026, audit frame-12, r2-2-6, prep-orders-1, waste-transfers-todo-5).
// Since 26 Oct 2026 (#387) Firestore keeps a change made with no signal in this tab's memory only (memoryLocalCache), so a
// reload, Update now, the 04:00 refresh or a closed app loses it, and a reload with no signal opens an empty book.
// The strip says to keep the book open, the browser asks before leaving while writes wait, Update now asks for a
// second tap, the reloads wait for the signal (wifi with no internet too), and every list marks its lines Not sent, on
// a phone too. The mark shows only while the strip does (no signal, or a write waiting more than 3 seconds) and sits
// inside the words, so a tick on a good signal never moves the rows below (review of the first fix, 27 Oct 2026).
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
// wifi with no internet: the phone says it is online (navigator.onLine stays true), but every request to the book fails
const DEAD = u => u.href.indexOf(L.BASE) === 0;
const deadNet = (p, on) => on ? p.context().route(DEAD, r => r.abort('internetdisconnected')) : p.context().unroute(DEAD);
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

  // 1. prep at 390 (staff): the strip's words, the browser asking before leaving, and Not sent only once the strip is up
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
    await L.settle(p, 300);
    // every write is pending until the server answers, even on a good signal: no mark in the first 3 seconds
    ok(await unsent(p, 'Wipe the pass shelves') === 'none', 'prep, good signal: no Not sent while the server answers (first 3 seconds) (' + await unsent(p, 'Wipe the pass shelves') + ')');
    ok(await asks(p), 'leaving: a write waiting for the server, the browser asks first');
    await L.waitFor(p, () => !!document.querySelector('.p-sync'), null, 5000).catch(() => {});
    ok(/^Not sent yet\./.test(await txt(p, '.p-sync') || ''), 'prep: after 3 seconds the strip says Not sent yet');
    ok(await unsent(p, 'Wipe the pass shelves') === 'shown', 'prep at 390: with the strip up, the waiting line shows Not sent (' + await unsent(p, 'Wipe the pass shelves') + ')');
    ok(await p.evaluate(() => !!document.querySelector('.nb-row .nb-t .nb-unsent')), 'prep: Not sent sits inside the words, like Urgent');
    await release(p);
    await L.settle(p, 500);
    ok(await unsent(p, 'Wipe the pass shelves') === 'none', 'prep: Not sent goes once the server has it');
    ok(!(await asks(p)), 'leaving: everything sent, the browser does not ask');
    ok(p.errors.length === 0, 'prep: no page errors ' + p.errors.join(' | '));
  });

  // 1b. ticking fast on a good signal at 390 (20 Oct 2026 decision): the rows below stay where they are, so the next tap
  // lands on the line it was meant for. With no signal the mark wraps with the words and never narrows them.
  const rowAt = (p, t) => p.evaluate(t => [...document.querySelectorAll('.nb-row')].findIndex(r => ((r.querySelector('.nb-t') || {}).textContent || '').indexOf(t) === 0), t);
  const rows = p => p.evaluate(() => [...document.querySelectorAll('.nb-row')].map(r => { const b = r.getBoundingClientRect(); return { top: Math.round(b.top), h: Math.round(b.height) }; }));
  // the width of a row's words, with its Not sent mark as drawn, or with the mark taken out of the layout for a moment
  const wordsW = (p, i, hide) => p.evaluate(([i, hide]) => {
    const r = document.querySelectorAll('.nb-row')[i], m = r && r.querySelector('.nb-unsent');
    if (!r) return -1;
    if (m && hide) m.style.display = 'none';
    const w = Math.round(r.querySelector('.nb-t').getBoundingClientRect().width);
    if (m) m.style.display = '';
    return w;
  }, [i, hide]);
  for (const [who, hash, target] of [['ann', '#/prep', 'Slice onions'], ['sam', '#/prep', 'Laksa'], ['sam', '#/orders', 'Milk']]) {
    await step('1b ' + who + ' ' + hash, async () => {
      p = await L.open(b, hash, { who, wait: 1500 });
      const i = await rowAt(p, target), r0 = await rows(p);
      await hold(p);
      await p.evaluate(i => document.querySelectorAll('.nb-row')[i].querySelector('.nb-box').click(), i);
      await L.settle(p, 300);
      const r1 = await rows(p), moved = Math.max(0, ...r0.slice(i).map((r, k) => Math.abs(((r1[i + k] || {}).top || 0) - r.top) + Math.abs(((r1[i + k] || {}).h || 0) - r.h)));
      ok(i >= 0 && r1.length === r0.length && moved === 0, hash + ' ' + who + ' at 390, good signal: a tick moves no row (' + target + ', moved ' + moved + ' px)');
      ok(await unsent(p, target) === 'none', hash + ' ' + who + ': no Not sent flash on a tick the server is answering');
      // no signal: the mark shows at once, inside the words, and the words keep their width
      await p.context().setOffline(true);
      await L.settle(p, 300);
      const j = await rowAt(p, target), withMark = await wordsW(p, j, false), without = await wordsW(p, j, true);
      ok(await unsent(p, target) === 'shown', hash + ' ' + who + ', no signal: the ticked line shows Not sent (' + await unsent(p, target) + ')');
      ok(j >= 0 && withMark === without, hash + ' ' + who + ', no signal: Not sent does not narrow the words (' + without + ' px without it, ' + withMark + ' px with it)');
      ok(!(await L.overflow(p)), hash + ' ' + who + ', no signal: no sideways scroll at 390');
      await p.context().setOffline(false);
      await release(p);
      await L.settle(p, 500);
      ok(await unsent(p, target) === 'none', hash + ' ' + who + ': Not sent goes once the server has it');
      ok(p.errors.length === 0, hash + ' ' + who + ': no page errors ' + p.errors.join(' | '));
    });
  }

  // 1c. Done today and Ordered today, where a ticked line goes: Not sent there too with no signal
  const doneMark = (p, t) => p.evaluate(t => { const li = [...document.querySelectorAll('.nb-done li')].find(l => (l.textContent || '').indexOf(t) >= 0); return li ? (li.querySelector('.nb-dx .nb-unsent') ? 'shown' : 'none') : 'no row'; }, t);
  for (const [hash, target] of [['#/prep', 'Wash bok choy'], ['#/orders', 'Brioche buns']]) {
    await step('1c ' + hash, async () => {
      p = await L.open(b, hash, { wait: 1500 });
      await p.context().setOffline(true);
      await hold(p);
      await p.evaluate(t => [...document.querySelectorAll('.nb-row')].find(r => ((r.querySelector('.nb-t') || {}).textContent || '').indexOf(t) === 0).querySelector('.nb-box').click(), target);
      // a ticked prep line goes to Done today after 3.5 seconds, an ordered line to Ordered today after 10 minutes
      // (the mouse moves halfway, or the desktop idle lock signs the test browser out after 7.5 minutes)
      if (hash === '#/orders') { await p.clock.fastForward('05:00'); await p.mouse.move(5, 300); await p.mouse.move(9, 320); await p.clock.fastForward('05:30'); }
      await L.waitFor(p, t => [...document.querySelectorAll('.nb-done li')].some(l => (l.textContent || '').indexOf(t) >= 0), target, 8000).catch(() => {});
      ok(await doneMark(p, target) === 'shown', hash + ', no signal: ' + (hash === '#/prep' ? 'Done today' : 'Ordered today') + ' shows the tick Not sent (' + await doneMark(p, target) + ')');
      await p.context().setOffline(false);
      await release(p);
      await L.settle(p, 500);
      ok(await doneMark(p, target) === 'none', hash + ': Not sent goes there too once the server has it');
    });
  }

  // 2. orders at 390, no signal: the waiting line shows Not sent, and the server's confirm takes it off
  await step('2', async () => {
    p = await L.open(b, '#/orders', { wait: 1500 });
    await p.context().setOffline(true);
    await hold(p);
    await p.fill('#o-text', 'Cream');
    await p.fill('#o-qty', '4 L');
    await p.press('#o-text', 'Enter');
    await L.waitFor(p, () => !!document.querySelector('.nb-unsent'), null, 3000).catch(() => {});
    ok(await unsent(p, 'Cream') === 'shown', 'orders at 390: the waiting line shows Not sent (' + await unsent(p, 'Cream') + ')');
    await p.context().setOffline(false);
    await release(p);
    await L.settle(p, 500);
    ok(await unsent(p, 'Cream') === 'none', 'orders: Not sent goes once the server has it');
    ok(p.errors.length === 0, 'orders: no page errors ' + p.errors.join(' | '));
  });

  // 3. wastage at 390, no signal
  await step('3', async () => {
    p = await L.open(b, '#/waste', { wait: 1500 });
    await p.context().setOffline(true);
    await hold(p);
    await p.fill('#w-text', 'Rice');
    await p.fill('#w-amt', '1.5');
    await p.evaluate(() => { const r = document.querySelector('.w-rchips [data-v="excess"]') || document.querySelector('[data-p="wreason"][data-v="excess"]'); r.click(); });
    await L.settle(p, 100);
    await p.click('.w-add .nb-addbtn');
    await L.waitFor(p, () => !!document.querySelector('.nb-unsent'), null, 3000).catch(() => {});
    ok(await unsent(p, 'Rice') === 'shown', 'wastage at 390: the waiting entry shows Not sent (' + await unsent(p, 'Rice') + ')');
    await p.context().setOffline(false);
    await release(p);
    await L.settle(p, 500);
    ok(await unsent(p, 'Rice') === 'none', 'wastage: Not sent goes once the server has it');
    ok(p.errors.length === 0, 'wastage: no page errors ' + p.errors.join(' | '));
  });

  // 4. transfers at 390, no signal, then a return: the phone's own mark is never saved in the open loan's record
  await step('4', async () => {
    p = await L.open(b, '#/transfers', { wait: 1500 });
    await p.context().setOffline(true);
    await hold(p);
    await p.fill('#tr-venue', 'Riviera');
    await p.fill('#tr-person', 'Tom');
    await p.fill('#tr-text', 'Butter');
    await p.fill('#tr-amt', '2');
    await p.click('[data-p="tr-unit"][data-v="kg"]');
    await p.click('.tr-add .nb-addbtn');
    await L.waitFor(p, () => !!document.querySelector('.nb-unsent'), null, 3000).catch(() => {});
    ok(await unsent(p, 'Butter') === 'shown', 'transfers at 390: the waiting line shows Not sent (' + await unsent(p, 'Butter') + ')');
    await p.context().setOffline(false);
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
    const u = await bar(p);
    ok(u && /^No signal\./.test(u.t) && u.oneLine, 'update, no signal: the strip says so, on one line at 390 (' + JSON.stringify(u) + ')');
    ok(/Writing as/.test(await txt(p, '#prep-root') || ''), 'update, no signal: the prep list is still there');
    await p.context().setOffline(false);
    await L.settle(p, 300);
    await p.click('.upd-bar button');
    await waitReload(p);
    ok(await reloaded(p), 'update: with the signal back, the tap updates');
  });

  // 6b. Update now on wifi with no internet: the phone says it is online, but the server does not answer
  await step('6b', async () => {
    p = await L.open(b, '#/prep', { wait: 1500 });
    await updBar(p);
    await deadNet(p, true);
    await mark(p);
    await p.click('.upd-bar button');
    await L.settle(p, 1500);
    ok(!(await reloaded(p)), 'update, wifi with no internet: the tap does not reload into an empty book');
    const u = await bar(p);
    ok(u && /^No signal\./.test(u.t), 'update, wifi with no internet: the strip says No signal (' + JSON.stringify(u) + ')');
    await deadNet(p, false);
    await L.settle(p, 4500);
    await p.click('.upd-bar button');
    await waitReload(p);
    ok(await reloaded(p), 'update: with the internet back, the tap updates');
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

  // 8b. the 04:00 refresh on wifi with no internet: it waits, and goes at the next try once the server answers
  await step('8b', async () => {
    p = await L.open(b, '#/recipes', { wait: 1500 });
    await p.clock.fastForward('13:58:00');
    await L.settle(p, 300);
    await deadNet(p, true);
    await mark(p);
    await p.clock.fastForward('00:03:00');
    await L.settle(p, 1000);
    await p.clock.fastForward(9000);
    await L.settle(p, 1000);
    ok(!(await reloaded(p)), '04:00, wifi with no internet: no reload into an empty book');
    await deadNet(p, false);
    await p.clock.fastForward('00:10:30');
    await waitReload(p);
    ok(await reloaded(p), '04:00: with the internet back, it refreshes at the next try (10 minutes)');
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
