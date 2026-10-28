// No signal and changes waiting to send (27 Oct 2026, audit frame-12, r2-2-6, prep-orders-1, waste-transfers-todo-5).
// Since 26 Oct 2026 (#387) Firestore keeps a change made with no signal in this tab's memory only (memoryLocalCache), so a
// reload or a closed app loses it, which is why Update now and the 04:00 refresh wait until it is sent, and a reload
// with no signal opens an empty book.
// The strip says to keep the book open, the browser asks before leaving while writes wait, Update now waits until a
// change is sent (head chef, 28 Oct 2026) and asks for a second tap over half a line, the reloads wait for the signal
// (wifi with no internet too) and look again before they go, and every list marks its lines Not sent, on
// a phone too. The mark shows only while the strip does (no signal, or a write waiting more than 3 seconds) and sits
// inside the words, so a tick on a good signal never moves the rows below (review of the first fix, 27 Oct 2026). While
// the strip is up every row keeps the mark's room, so a tick with no signal moves no row either (second review).
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
// the update strip's words (no-break spaces read as spaces), its button, and whether it all fits: the words inside the
// strip, the strip no wider than its room, and the button on the screen
const bar = p => p.evaluate(() => { const b = document.querySelector('.upd-bar'); if (!b) return null; const s = b.querySelector('span'), n = b.querySelector('button'), r = b.getBoundingClientRect(), w = s.getBoundingClientRect(), k = n.getBoundingClientRect(); return { t: s.textContent.replace(/\u00a0/g, ' '), btn: n.textContent, fits: w.top >= r.top && w.bottom <= r.bottom && b.scrollWidth <= b.clientWidth && k.left >= 0 && k.right <= window.innerWidth }; });
// the tests answer the book's fonts with nothing (tests/lib.js), so words show in the machine's own font, which is
// wider on GitHub than here: a wide font with extra spacing on the strip stands in for the widest, on every machine
const wide = p => p.addStyleTag({ content: '.upd-bar, .upd-bar button { font-family: "DejaVu Sans", Verdana, sans-serif !important; letter-spacing: 0.04em !important; }' });
// page errors, less the browser's own note for a request it could not make while the test has the signal off on purpose
const errs = p => p.errors.filter(e => !/Failed to load resource: net::ERR_(FAILED|INTERNET_DISCONNECTED)/.test(e));
// a weak signal: the server takes ms to answer the HEAD of index.html that the update check and lkServerUp() send
const slowHead = (p, ms) => p.context().route(u => u.href === L.BASE + 'index.html', async r => { if (r.request().method() === 'HEAD') await L.sleep(ms); return r.fallback(); });

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
    ok(errs(p).length === 0, 'prep: no page errors ' + errs(p).join(' | '));
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
  // the last name is the line ticked with no signal: one whose words wrapped when the mark came (Brioche buns grew 9 px)
  for (const [who, hash, target, offTarget] of [['ann', '#/prep', 'Slice onions', 'Slice onions'], ['sam', '#/prep', 'Laksa', 'Laksa'], ['sam', '#/orders', 'Milk', 'Brioche buns']]) {
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
      ok(errs(p).length === 0, hash + ' ' + who + ': no page errors ' + errs(p).join(' | '));
    });
    // no signal (the cool room): every row keeps the mark's room while the strip is up, so a tick only fills it and the
    // rows below stay where they are (review 2 of the fix: Laksa moved them 26 px for a chef, Slice onions 9 px)
    await step('1b ' + who + ' ' + hash + ' no signal', async () => {
      p = await L.open(b, hash, { who, wait: 1500 });
      await p.context().setOffline(true);
      await hold(p);
      await L.settle(p, 300);
      const held = await p.evaluate(() => ({
        n: document.querySelectorAll('.nb-row .nb-t .nb-held[aria-hidden="true"]').length, rows: document.querySelectorAll('.nb-row').length,
        words: [...document.querySelectorAll('.nb-row .nb-t')].some(t => /Not sent/.test(t.textContent)), seen: [...document.querySelectorAll('.nb-held')].some(h => getComputedStyle(h).visibility !== 'hidden')
      }));
      ok(held.rows > 0 && held.n === held.rows && !held.words && !held.seen, hash + ' ' + who + ', no signal: every row keeps the room for Not sent, unseen and with no words in the row (' + JSON.stringify(held) + ')');
      const i = await rowAt(p, offTarget), r0 = await rows(p);
      await p.evaluate(i => document.querySelectorAll('.nb-row')[i].querySelector('.nb-box').click(), i);
      await L.settle(p, 300);
      const r1 = await rows(p), moved = Math.max(0, ...r0.slice(i).map((r, k) => Math.abs(((r1[i + k] || {}).top || 0) - r.top) + Math.abs(((r1[i + k] || {}).h || 0) - r.h)));
      ok(await unsent(p, offTarget) === 'shown', hash + ' ' + who + ', no signal: the ticked line shows Not sent (' + await unsent(p, offTarget) + ')');
      ok(i >= 0 && r1.length === r0.length && moved === 0, hash + ' ' + who + ' at 390, no signal: a tick moves no row (' + offTarget + ', moved ' + moved + ' px)');
      await p.context().setOffline(false);
      await release(p);
      await L.settle(p, 500);
      ok(await p.evaluate(() => !document.querySelector('.nb-held, .nb-unsent')), hash + ' ' + who + ': signal back and sent, the room for the mark goes with the strip');
      ok(errs(p).length === 0, hash + ' ' + who + ', no signal: no page errors ' + errs(p).join(' | '));
    });
  }

  // 1b. ticking fast with no signal at 390 (the review's mis-tap): a chef taps Make gravy's words, then where Laksa was
  // a third of the way down. The second tap lands on Laksa, so both lines end ticked (it used to untick Make gravy).
  await step('1b fast taps, no signal', async () => {
    p = await L.open(b, '#/prep', { who: 'sam', wait: 1500 });
    await p.context().setOffline(true);
    await hold(p);
    await L.settle(p, 300);
    // where a line's row and words are on screen now
    const at = t => p.evaluate(t => {
      const r = [...document.querySelectorAll('.nb-rows .nb-row')].find(r => ((r.querySelector('.nb-t') || {}).textContent || '').indexOf(t) === 0);
      const w = r.querySelector('.nb-t').getBoundingClientRect(), rb = r.getBoundingClientRect();
      return { x: w.left + 20, wy: w.top + w.height / 2, top: rb.top, h: rb.height };
    }, t);
    await p.evaluate(() => [...document.querySelectorAll('.nb-rows .nb-row')].find(r => /^Make gravy/.test((r.querySelector('.nb-t') || {}).textContent || '')).scrollIntoView({ block: 'center' }));
    await L.settle(p, 300);
    const g = await at('Make gravy'), l = await at('Laksa');
    await p.mouse.click(g.x, g.wy);
    await L.settle(p, 250);
    await p.mouse.click(l.x, l.top + l.h / 3);
    await L.settle(p, 300);
    const done = await p.evaluate(() => ['Make gravy', 'Laksa'].map(t => { const r = [...document.querySelectorAll('.nb-rows .nb-row')].find(r => ((r.querySelector('.nb-t') || {}).textContent || '').indexOf(t) === 0); return !!(r && r.classList.contains('is-done')); }));
    ok(done[0] && done[1], 'prep, no signal, two fast taps down the list: Make gravy and Laksa both end ticked (' + JSON.stringify(done) + ')');
    await p.context().setOffline(false);
    await release(p);
    await L.settle(p, 500);
    ok(errs(p).length === 0, 'fast taps, no signal: no page errors ' + errs(p).join(' | '));
  });

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
    ok(errs(p).length === 0, 'orders: no page errors ' + errs(p).join(' | '));
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
    ok(errs(p).length === 0, 'wastage: no page errors ' + errs(p).join(' | '));
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
    ok(errs(p).length === 0, 'transfers: no page errors ' + errs(p).join(' | '));
  });

  // 4b. with the no-signal note (tests/offline-open.test.js): Orders first opened with no signal is not loaded yet, since
  // the copy in memory holds only this phone's own lines. A line written there shows under the note and says Not sent,
  // inside the words; the strip says to keep the book open and leaving asks first. With the signal back the list loads,
  // and the note and the mark go.
  await step('4b', async () => {
    const NO_LIST = 'No signal. This list shows when the phone is back online. What you add now is sent then.';
    p = await L.open(b, '#/prep', { who: 'sam', wait: 1500 });
    await p.context().setOffline(true);
    await p.evaluate(() => { window.__fake.cold = /./; window.__fake.mode = 'hold'; });
    await p.evaluate(() => { location.hash = '#/orders'; });
    await L.settle(p, 700);
    ok(await p.evaluate(() => window.LK_PREP.state.ordState) === 'offline', 'orders first opened with no signal: not loaded yet, not empty');
    await p.fill('#o-text', 'Lemons');
    await p.fill('#o-qty', '2 kg');
    await p.press('#o-text', 'Enter');
    await L.waitFor(p, () => !!document.querySelector('.nb-unsent'), null, 3000).catch(() => {});
    const t = await txt(p, '#prep-root') || '';
    ok(t.indexOf(NO_LIST) >= 0 && t.indexOf('Lemons') > t.indexOf(NO_LIST) && !/Milk/.test(t), 'orders not loaded, a line written: the note stays and the line shows under it (' + t.slice(0, 160) + ')');
    ok(await unsent(p, 'Lemons') === 'shown' && await p.evaluate(() => !!document.querySelector('.nb-row .nb-t .nb-unsent')), 'orders not loaded, a line written: it says Not sent, inside the words (' + await unsent(p, 'Lemons') + ')');
    ok(await txt(p, '.p-sync') === 'No signal. Keep the book open: your changes send when the signal is back.', 'orders not loaded: the strip says to keep the book open');
    ok(await asks(p), 'orders not loaded, a line waiting: leaving asks first');
    await p.context().setOffline(false);
    await p.evaluate(() => { window.__fake.warm(); });
    await L.waitFor(p, () => /Milk/.test((document.querySelector('#prep-root') || {}).textContent || ''), null, 5000).catch(() => {});
    await L.settle(p, 500);
    const t2 = await txt(p, '#prep-root') || '';
    ok(await p.evaluate(() => window.LK_PREP.state.ordState) === 'ok' && t2.indexOf(NO_LIST) < 0 && /Milk/.test(t2) && /Lemons/.test(t2), 'signal back: the order list loads with Milk and Lemons, and the note goes');
    ok(await unsent(p, 'Lemons') === 'none', 'signal back: Not sent goes once the server has the line');
    ok(!(await asks(p)), 'signal back: everything sent, leaving does not ask');
    ok(errs(p).length === 0, 'orders not loaded: no page errors ' + errs(p).join(' | '));
  });

  // 4c. the server takes one line while the strip is still up (on a weak signal another write can still be waiting):
  // only that line's mark goes, patched in its row (listSnap() says 'same'), on every list. The phone still says it is
  // offline here, so the strip stays up and only the row patch can take the mark away.
  const addLine = {
    '#/prep': async p => { await p.fill('#p-text', 'Zest limes'); await p.press('#p-text', 'Enter'); return 'Zest limes'; },
    '#/orders': async p => { await p.fill('#o-text', 'Limes'); await p.fill('#o-qty', '1 kg'); await p.press('#o-text', 'Enter'); return 'Limes'; },
    '#/waste': async p => {
      await p.fill('#w-text', 'Bread'); await p.fill('#w-amt', '2');
      await p.evaluate(() => (document.querySelector('.w-rchips [data-v="excess"]') || document.querySelector('[data-p="wreason"][data-v="excess"]')).click());
      await L.settle(p, 100); await p.click('.w-add .nb-addbtn'); return 'Bread';
    },
    '#/transfers': async p => {
      await p.fill('#tr-venue', 'Riviera'); await p.fill('#tr-person', 'Tom'); await p.fill('#tr-text', 'Limes'); await p.fill('#tr-amt', '3');
      await p.click('[data-p="tr-unit"][data-v="kg"]'); await p.click('.tr-add .nb-addbtn'); return 'Limes';
    }
  };
  for (const hash of Object.keys(addLine)) {
    await step('4c ' + hash, async () => {
      p = await L.open(b, hash, { who: 'sam', wait: 1500 });
      await p.context().setOffline(true);
      await hold(p);
      const text = await addLine[hash](p);
      await L.waitFor(p, () => !!document.querySelector('.nb-unsent'), null, 3000).catch(() => {});
      ok(await unsent(p, text) === 'shown', hash + ', strip up: the waiting line shows Not sent (' + await unsent(p, text) + ')');
      await release(p);
      await L.settle(p, 500);
      ok(!!(await p.$('.p-sync')) && await unsent(p, text) === 'none', hash + ', strip still up: Not sent goes from the line the server has (' + await unsent(p, text) + ')');
      ok(errs(p).length === 0, hash + ', strip still up: no page errors ' + errs(p).join(' | '));
    });
  }

  // 5. Update now with a write waiting (head chef, 28 Oct 2026): it waits, a second tap does not override it, and the
  // book updates by itself once the change is sent, like the automatic update. Then half a line typed: a second tap first.
  const WAITS = 'Not sent yet. It updates once sent.';
  await step('5', async () => {
    p = await L.open(b, '#/prep', { wait: 1500 });
    await updBar(p);
    let u = await bar(p);
    ok(u && u.t === 'New version available.' && u.btn === 'Update now', 'update: the strip is up');
    await hold(p);
    await p.fill('#p-text', 'Slice tomatoes');
    await p.press('#p-text', 'Enter');
    await L.settle(p, 300);
    await p.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
    await mark(p);
    await p.click('.upd-bar button');
    await L.settle(p, 1500);
    ok(!(await reloaded(p)), 'update: a write waiting, the tap does not reload');
    u = await bar(p);
    ok(u && u.t === WAITS && u.btn === 'Update now', 'update: a write waiting, it says it updates once sent, with no second tap to offer (' + JSON.stringify(u) + ')');
    // at 390 the words take two lines inside the strip, broken after "Not sent yet."
    const fit = await p.evaluate(() => {
      const b = document.querySelector('.upd-bar'), s = b.querySelector('span'), n = s.firstChild, at = n ? n.textContent.indexOf('It') : -1, r = document.createRange();
      if (at >= 0) { r.setStart(n, at); r.setEnd(n, n.textContent.length); }
      return { inside: s.getBoundingClientRect().height <= b.getBoundingClientRect().height && b.scrollWidth <= b.clientWidth, whole: at >= 0 && r.getClientRects().length === 1 };
    });
    ok(fit.inside && fit.whole, 'update at 390: the words fit inside the strip, "It updates once sent." on a line of its own (' + JSON.stringify(fit) + ')');
    await p.click('.upd-bar button');
    await L.settle(p, 1500);
    u = await bar(p);
    ok(!(await reloaded(p)) && u && u.t === WAITS && u.btn === 'Update now', 'update: a write waiting, a second tap does not reload either (' + JSON.stringify(u) + ')');
    await L.settle(p, 4500);
    u = await bar(p);
    ok(u && u.t === 'New version available.' && u.btn === 'Update now', 'update: left alone, the strip goes back after 4 seconds');
    await release(p);
    await L.settle(p, 400);
    // sent: the book updates by itself at its next look (every 20 seconds), with nothing typed (step 20: also in use)
    await p.clock.fastForward('02:30');
    await waitReload(p);
    ok(await reloaded(p), 'update: once the change is sent, the book updates by itself');
  });

  // 5b. Update now with half a line typed: "Not saved yet." and a second tap
  await step('5b', async () => {
    p = await L.open(b, '#/prep', { wait: 1500 });
    await updBar(p);
    await mark(p);
    let u;
    await p.fill('#p-text', 'Half a line');
    await p.click('.upd-bar button');
    await L.settle(p, 1500);
    ok(!(await reloaded(p)), 'update: half a line typed, the first tap does not reload');
    u = await bar(p);
    ok(u && u.t === 'Not saved yet.' && u.btn === 'Tap again to update', 'update: half a line typed, it says Not saved yet (' + JSON.stringify(u) + ')');
    await p.click('.upd-bar button');
    await waitReload(p);
    ok(await reloaded(p), 'update: the second tap updates');
  });

  // 5c. taps while Update now checks the signal are ignored, and a line ticked meanwhile holds the update back
  // (head chef, 28 Oct 2026): it waits until the tick is sent, with no "Reload site?" box
  await step('5c', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', wait: 1500 });
    let asked = 0;
    p.on('dialog', d => { asked++; d.dismiss().catch(() => {}); });
    await updBar(p);
    await slowHead(p, 3000);
    await mark(p);
    await p.click('.upd-bar button');
    await L.settle(p, 200);
    let u = await bar(p);
    ok(u && u.t === 'Checking the signal...', 'update, slow server: the tap says it is checking (' + JSON.stringify(u) + ')');
    await hold(p);
    await p.evaluate(() => [...document.querySelectorAll('.nb-row')].find(r => /^Slice onions/.test((r.querySelector('.nb-t') || {}).textContent || '')).querySelector('.nb-box').click());
    await L.settle(p, 200);
    await p.click('.upd-bar button');
    await L.settle(p, 200);
    u = await bar(p);
    ok(u && u.t === 'Checking the signal...' && u.btn === 'Update now', 'update, checking: a second tap is ignored (' + JSON.stringify(u) + ')');
    // the note shows for 4 seconds from when the slow check answers (3 s in), so a read at a fixed time can land after
    // it went on a slow runner: wait for the note, then read it at once
    await L.waitFor(p, () => { const s = document.querySelector('.upd-bar span'); return !!s && /updates.once.sent/.test(s.textContent.replace(/\u00a0/g, ' ')); }, null, 12000).catch(() => {});
    u = await bar(p);
    ok(!(await reloaded(p)) && asked === 0, 'update, a tick made while it checked: no reload and no Reload site? box (' + asked + ' asked)');
    ok(u && u.t === WAITS, 'update, a tick made while it checked: it says it updates once sent (' + JSON.stringify(u) + ')');
    ok(await p.evaluate(() => !!(window.LK_PREP.state.items.find(x => x.id === 'i1') || {}).done), 'update, a tick made while it checked: the tick is still there');
    await release(p);
    await L.settle(p, 300);
  });

  // 5d. half a line typed after the tap, while it checks the signal: no reload over it, "Not saved yet." and Tap again
  // to update, the same as half a line typed before the tap (final review, 28 Oct 2026)
  await step('5d', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', wait: 1500 });
    await updBar(p);
    await slowHead(p, 3000);
    await mark(p);
    await p.click('.upd-bar button');
    await L.settle(p, 200);
    let u = await bar(p);
    ok(u && u.t === 'Checking the signal...', 'update, half a line typed after the tap: it was checking (' + JSON.stringify(u) + ')');
    await p.fill('#p-text', 'Brunoise shallots');
    await L.settle(p, 4500);
    u = await bar(p);
    ok(!(await reloaded(p)) && await p.evaluate(() => (document.querySelector('#p-text') || {}).value === 'Brunoise shallots'), 'update, half a line typed after the tap: no reload, the words still there');
    ok(u && u.t === 'Not saved yet.' && u.btn === 'Tap again to update', 'update, half a line typed after the tap: it says Not saved yet with Tap again to update (' + JSON.stringify(u) + ')');
    await p.click('.upd-bar button');
    await waitReload(p);
    ok(await reloaded(p), 'update, half a line typed after the tap: the second tap updates');
  });

  // 6. Update now with no signal: the book stays as it is, and updates once the signal is back
  await step('6', async () => {
    p = await L.open(b, '#/prep', { wait: 1500 });
    await updBar(p);
    await wide(p);
    await p.context().setOffline(true);
    await L.settle(p, 300);
    await mark(p);
    await p.click('.upd-bar button');
    await L.settle(p, 1500);
    ok(!(await reloaded(p)), 'update, no signal: the tap does not reload into an empty book');
    const u = await bar(p);
    ok(u && /^No signal\./.test(u.t) && u.fits, 'update, no signal: the strip says so, and it fits at 390 in a wide font (' + JSON.stringify(u) + ')');
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

  // 6c. Update now on a signal so weak the server takes its time: the strip says the book is checking, then No signal
  // after 8 seconds with no answer (it used to show nothing for those 8 seconds)
  await step('6c', async () => {
    p = await L.open(b, '#/prep', { wait: 1500 });
    await updBar(p);
    await p.context().route(DEAD, () => {});   // every request to the book waits, unanswered
    await mark(p);
    await p.click('.upd-bar button');
    await L.settle(p, 300);
    let u = await bar(p);
    ok(u && u.t === 'Checking the signal...', 'update, weak signal: the strip says it is checking (' + JSON.stringify(u) + ')');
    await p.clock.fastForward(5000);
    u = await bar(p);
    ok(u && u.t === 'Checking the signal...', 'update, weak signal: still checking after 5 seconds, not back to New version (' + JSON.stringify(u) + ')');
    await p.clock.fastForward(3500);
    await L.settle(p, 300);
    u = await bar(p);
    ok(!(await reloaded(p)) && u && /^No signal\./.test(u.t), 'update, weak signal: no answer in 8 seconds, no reload and the strip says No signal (' + JSON.stringify(u) + ')');
    await deadNet(p, false);
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

  // 10. the automatic update looks again before it reloads (final review, 28 Oct 2026). It asks the server, then fetches
  // the files, up to 8 seconds each on a weak signal: someone who types, ticks a line with the write waiting, or scrolls
  // in that time keeps what they did, and the strip stays up
  // the files the book fetches before a reload (X-LK-Fresh) held back ms on a weak signal; st.on once they are asked for
  const slowFiles = async (p, ms) => {
    const st = { on: false };
    await p.context().route(u => u.href === L.BASE + 'js/data.js', async r => { if (r.request().headers()['x-lk-fresh']) { st.on = true; await L.sleep(ms); } return r.fallback(); });
    return st;
  };
  const fetching = async st => { for (let i = 0; i < 100 && !st.on; i++) await L.sleep(50); return st.on; };

  const autoUpd = async p => {
    await updBar(p);
    await slowHead(p, 3000);
    await mark(p);
    await p.clock.fastForward('02:30');   // 2 minutes untouched: the automatic update starts and asks the server
    await L.settle(p, 200);
  };
  const ACTS = {
    typing: async p => { await p.fill('#p-text', 'Brunoise shallots'); return () => p.evaluate(() => document.querySelector('#p-text').value === 'Brunoise shallots'); },
    ticking: async p => {
      await hold(p);
      await p.click('[data-p="tick"][data-id="i1"]');
      return () => p.evaluate(() => !!(window.LK_PREP.state.items.find(x => x.id === 'i1') || {}).done);
    },
    scrolling: async p => { await p.mouse.move(200, 500); await p.mouse.wheel(0, 300); return () => true; }
  };
  for (const act of Object.keys(ACTS)) {
    await step('10 ' + act, async () => {
      p = await L.open(b, '#/prep', { who: 'ann', wait: 1500 });
      let asked = 0;
      p.on('dialog', d => { asked++; d.dismiss().catch(() => {}); });
      const files = await slowFiles(p, 0);
      await autoUpd(p);
      const kept = await ACTS[act](p);
      await L.settle(p, 10000);
      ok(!(await reloaded(p)) && asked === 0, 'automatic update, ' + act + ' while it checked: no reload and no Reload site? box (' + asked + ' asked)');
      // the 14 files (about 435 kB) are not fetched for an update that is not going ahead
      ok(!files.on, 'automatic update, ' + act + ' while it checked: it stops before it fetches the files');
      ok(await kept(), 'automatic update, ' + act + ' while it checked: what was done is still there');
      ok(!!(await bar(p)), 'automatic update, ' + act + ' while it checked: the strip still offers Update now');
      if (act === 'ticking') await release(p);
      await L.settle(p, 300);
    });
  }

  // 10a. the second look, just before the reload: typing while the files come in holds the update back too, and it
  // goes at its next turn (a reload that did not happen does not count towards the 10 minutes between reloads)
  await step('10a', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', wait: 1500 });
    await updBar(p);
    const st = await slowFiles(p, 3000);
    await mark(p);
    await p.clock.fastForward('02:30');
    ok(await fetching(st), 'automatic update: it fetches the files');
    await p.fill('#p-text', 'Peel garlic');
    await L.settle(p, 6000);
    ok(!(await reloaded(p)) && await p.evaluate(() => (document.querySelector('#p-text') || {}).value === 'Peel garlic'), 'automatic update, typing while the files came in: no reload, the words still there');
    await p.fill('#p-text', '');
    await p.evaluate(() => { window.LK_PREP.state.text = ''; if (document.activeElement) document.activeElement.blur(); });
    await p.clock.fastForward('02:30');
    await waitReload(p);
    ok(await reloaded(p), 'automatic update: left alone again for 2 minutes, it updates');
  });

  // 10b. the update reloads once: a reload the browser turns down (a page that asks first, like the staff list with
  // changes) is not tried again 8 seconds later, so nobody gets a second Reload site? box out of nowhere
  await step('10b', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', wait: 1500 });
    let asked = 0;
    p.on('dialog', d => { asked++; d.dismiss().catch(() => {}); });
    await updBar(p);
    await p.evaluate(() => window.addEventListener('beforeunload', e => { e.preventDefault(); e.returnValue = ''; }));
    await p.click('.upd-bar span');   // the page has been used, so the browser may ask before leaving
    await mark(p);
    await p.clock.fastForward('02:30');
    await L.settle(p, 10000);
    ok(asked === 1 && !(await reloaded(p)), 'automatic update turned down: asked once, not again 8 seconds later (' + asked + ' asked)');
  });

  // 10c. the 04:00 refresh looks again after the files came in: half a line typed meanwhile holds it back
  await step('10c', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', clock: L.NOW - 10 * 3600000 - 180000, wait: 1500 });   // 03:57
    const st = await slowFiles(p, 3000);
    await mark(p);
    await p.clock.fastForward('03:10');
    ok(await fetching(st), '04:00: it fetches the files');
    await p.fill('#p-text', 'Dice carrots');
    await L.settle(p, 4000);
    ok(!(await reloaded(p)), '04:00, half a line typed while the files came in: no reload');
    ok(await p.evaluate(() => (document.querySelector('#p-text') || {}).value === 'Dice carrots'), '04:00: the half line is still there');
    // the line added or cleared once the files are in: it still waits its 10 minutes, it does not reload 8 seconds in
    await p.fill('#p-text', '');
    await p.evaluate(() => { window.LK_PREP.state.text = ''; window.LK_PREP.state.qty = ''; });
    await L.settle(p, 6000);
    ok(!(await reloaded(p)), '04:00, the box cleared after the files came in: no reload 8 seconds in, it waits 10 minutes');
    await p.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
    await p.clock.fastForward('10:30');
    await waitReload(p);
    ok(await reloaded(p), '04:00: 10 minutes later, nothing typed, it refreshes');
  });

  // 11. an order line with Used in (final review, 28 Oct 2026): the room for Not sent sits on the words' line, before
  // Used in, so the row does not grow when the strip comes, and the mark never sits alone under Used in
  const cream = {};
  cream[['kitchens', L.PIN, 'orders', today, 'lines', 'o3'].join('/')] = { text: 'Cream', qty: '4 L', recipes: ['carbonara-sauce'], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 2400000, ordered: false, deleted: false };
  const creamRow = p => p.evaluate(() => {
    const r = [...document.querySelectorAll('.nb-rows .nb-row')].find(r => /^Cream/.test((r.querySelector('.nb-t') || {}).textContent || ''));
    if (!r) return null;
    const u = r.querySelector('.o-used'), m = r.querySelector('.nb-unsent, .nb-held'), ub = u && u.getBoundingClientRect(), mb = m && m.getBoundingClientRect();
    return { h: Math.round(r.getBoundingClientRect().height), used: !!u, above: !!(ub && mb) && mb.bottom <= ub.top + 1 };
  });
  for (const width of [390, 1280]) {
    await step('11 ' + width, async () => {
      p = await L.open(b, '#/orders', { width, extra: cream, wait: 1500 });
      const r0 = await creamRow(p);
      ok(r0 && r0.used, width + ': the Cream line says Used in (' + JSON.stringify(r0) + ')');
      await p.context().setOffline(true);
      await hold(p);
      await L.settle(p, 300);
      const r1 = await creamRow(p);
      ok(r0 && r1 && r1.h === r0.h && r1.above, width + ', no signal: a line with Used in keeps its height, its room for Not sent above Used in (' + (r0 && r0.h) + ' px, then ' + JSON.stringify(r1) + ')');
      await p.click('[data-p="otick"][data-id="o3"]');
      await L.settle(p, 300);
      const r2 = await creamRow(p);
      ok(await unsent(p, 'Cream') === 'shown' && r2 && r2.above && r2.h === r0.h, width + ', no signal: Cream ticked shows Not sent on its words\' line, not under Used in (' + JSON.stringify(r2) + ')');
      await p.context().setOffline(false);
      await release(p);
      await L.settle(p, 500);
      ok(errs(p).length === 0, width + ', Used in: no page errors ' + errs(p).join(' | '));
    });
  }

  // 12. the head chef's Google device with nobody signed in by PIN: its changes also wait in the tab's memory, so it
  // gets the strip with the marks' room (final review, 28 Oct 2026; it had the room but never the strip)
  for (const hash of ['#/prep', '#/orders']) {
    await step('12 ' + hash, async () => {
      p = await L.open(b, hash, { admin: true, who: '', wait: 1500 });
      ok(await p.evaluate(() => document.querySelectorAll('.nb-row').length > 0 && !document.querySelector('.p-sync, .nb-held, .nb-unsent')), hash + ', Google device, good signal: the list, no strip and no marks');
      await p.context().setOffline(true);
      await L.settle(p, 300);
      const s = await p.evaluate(() => ({ strip: ((document.querySelector('.p-sync') || {}).textContent || '').trim(), rows: document.querySelectorAll('.nb-rows .nb-row').length, held: document.querySelectorAll('.nb-rows .nb-row .nb-held').length }));
      ok(s.strip === 'No signal. Keep the book open: your changes send when the signal is back.' && s.rows > 0 && s.held === s.rows, hash + ', Google device, no signal: the strip with the room for Not sent (' + JSON.stringify(s) + ')');
      ok(!(await L.overflow(p)), hash + ', Google device, no signal: no sideways scroll at 390');
      await p.context().setOffline(false);
      await L.settle(p, 500);
      ok(await p.evaluate(() => !document.querySelector('.p-sync, .nb-held, .nb-unsent')), hash + ', Google device: signal back, the strip and the room go');
      ok(errs(p).length === 0, hash + ', Google device: no page errors ' + errs(p).join(' | '));
    });
  }

  // 13. the line menu's title is the line's words and amount, never "Not sent" or Used in glued on
  await step('13 prep', async () => {
    p = await L.open(b, '#/prep', { wait: 1500 });
    await p.context().setOffline(true);
    await hold(p);
    await p.fill('#p-text', 'Zest limes');
    await p.fill('#p-qty', '2 tubs');
    await p.press('#p-text', 'Enter');
    await L.waitFor(p, () => !!document.querySelector('.nb-unsent'), null, 3000).catch(() => {});
    ok(await unsent(p, 'Zest limes') === 'shown', 'line menu, prep: Zest limes shows Not sent');
    await p.evaluate(() => [...document.querySelectorAll('.nb-row')].find(r => /^Zest limes/.test((r.querySelector('.nb-t') || {}).textContent || '')).querySelector('.nb-more').click());
    await L.settle(p, 200);
    const h = await txt(p, '#lm-h');
    ok(h === 'Zest limes 2 tubs', 'line menu, prep: the title is the words and the amount (' + h + ')');
    await p.keyboard.press('Escape');
    await p.context().setOffline(false);
    await release(p);
    await L.settle(p, 300);
  });
  await step('13 orders', async () => {
    p = await L.open(b, '#/orders', { extra: cream, wait: 1500 });
    await p.context().setOffline(true);
    await L.settle(p, 300);
    await p.click('.nb-row [data-lm="open"][data-id="o3"]');
    await L.settle(p, 200);
    const h = await txt(p, '#lm-h');
    ok(h === 'Cream 4 L', 'line menu, orders: the title is the words and the amount, without Used in (' + h + ')');
    await p.keyboard.press('Escape');
    await p.context().setOffline(false);
    await L.settle(p, 300);
  });

  // 14. Update now tapped while the automatic update runs (the strip still says New version available.): the tap takes
  // it over, says what is happening and updates, once. The tap is a touch, but it no longer calls the update off.
  for (const phase of ['check', 'files']) {
    await step('14 ' + phase, async () => {
      p = await L.open(b, '#/prep', { who: 'ann', touch: true, wait: 1500 });
      let navs = 0;   // loads of the page itself from now on: a reload asks for the document once
      p.on('request', q => { if (q.isNavigationRequest() && q.frame() === p.mainFrame()) navs++; });
      await updBar(p);
      const st = phase === 'files' ? await slowFiles(p, 3000) : null;
      if (phase === 'check') await slowHead(p, 3000);
      await mark(p);
      await p.clock.fastForward('02:30');   // 2 minutes untouched: the automatic update starts
      if (st) ok(await fetching(st), 'automatic update: it fetches the files');
      else await L.settle(p, 200);
      let u = await bar(p);
      ok(u && u.t === 'New version available.', 'automatic update, ' + phase + ': the strip still says New version available (' + JSON.stringify(u) + ')');
      await p.tap('.upd-bar button');
      await L.settle(p, 200);
      u = await bar(p);
      const words = phase === 'files' ? 'Updating...' : 'Checking the signal...';
      ok(u && u.t === words, 'automatic update, ' + phase + ': a tap on Update now says ' + words + ' (' + JSON.stringify(u) + ')');
      await waitReload(p);
      ok(await reloaded(p), 'automatic update, ' + phase + ': the tap does not call it off, it updates');
      await L.settle(p, 2000);
      ok(navs === 1, 'automatic update, ' + phase + ': it reloads once (' + navs + ')');
    });
  }

  // 15. the automatic update on coming back after 5 minutes away, with no answer from the server: the strip still
  // comes, so Update now is there to tap while the book is in use (it used to show nothing)
  await step('15', async () => {
    const st = { on: false, n: 0 };
    p = await L.open(b, '#/prep', { who: 'ann', touch: true, wait: 1500 });
    await p.context().route(u => u.href === L.BASE + 'index.html', r => {
      if (r.request().method() !== 'HEAD' || !st.on) return r.fallback();
      // the first answer is a new version, then the signal goes
      if (++st.n === 1) return r.fulfill({ status: 200, headers: { 'last-modified': 'Mon, 19 Oct 2026 00:00:00 GMT' } });
      return r.abort('internetdisconnected');
    });
    await p.evaluate(() => {
      window.__vis = 'visible';
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__vis });
    });
    const vis = s => p.evaluate(s => { window.__vis = s; document.dispatchEvent(new Event('visibilitychange')); }, s);
    await vis('hidden');
    await p.clock.fastForward('06:00');
    st.on = true;
    await mark(p);
    await vis('visible');
    await L.settle(p, 1500);
    ok(st.n >= 2, 'back after 6 minutes: it found the new version and asked the server again (' + st.n + ' asked)');
    const u = await bar(p);
    ok(!(await reloaded(p)) && u && u.t === 'New version available.' && u.btn === 'Update now', 'back after 6 minutes, no answer: no reload, and the strip offers Update now (' + JSON.stringify(u) + ')');
  });

  // 16. the signal goes while the files come in (the server answered first): no reload into an empty book, for the
  // automatic update, Update now and the 04:00 refresh, and each goes once the signal is back
  const dropOnFiles = async p => {
    const st = { on: false };
    await p.context().route(u => u.href === L.BASE + 'js/data.js', async r => {
      if (!r.request().headers()['x-lk-fresh'] || st.on) return r.fallback();
      st.on = true;
      await p.context().setOffline(true);
      return r.abort('internetdisconnected');
    });
    return st;
  };
  for (const how of ['automatic', 'tapped', '04:00']) {
    await step('16 ' + how, async () => {
      p = await L.open(b, how === '04:00' ? '#/recipes' : '#/prep', { who: 'ann', touch: true, wait: 1500 });
      if (how !== '04:00') await updBar(p);
      else { await p.clock.fastForward('13:58:00'); await L.settle(p, 300); }
      const st = await dropOnFiles(p);
      await mark(p);
      if (how === 'automatic') await p.clock.fastForward('02:30');
      else if (how === 'tapped') await p.tap('.upd-bar button');
      else await p.clock.fastForward('00:03:00');
      ok(await fetching(st), how + ': it asked for the files');
      await L.settle(p, 1500);
      ok(!(await reloaded(p)), how + ', the signal gone while the files came in: no reload into an empty book');
      if (how === 'tapped') { const u = await bar(p); ok(u && /^No signal\./.test(u.t), how + ': the strip says No signal (' + JSON.stringify(u) + ')'); }
      await p.context().setOffline(false);
      await L.settle(p, 300);
      if (how === 'automatic') await p.clock.fastForward('02:30');
      else if (how === 'tapped') { await L.settle(p, 4500); await p.tap('.upd-bar button'); }
      else await p.clock.fastForward(6000);   // 5 seconds after the signal is back
      await waitReload(p);
      ok(await reloaded(p), how + ': with the signal back, it updates');
    });
  }

  // 17. On a narrow phone with Extra large text, in a wide font, the strip still fits: its words wrap inside it and its
  // button stays on the screen at 360 px (the usual Android width) or 344 px. Only the strip is measured here: the tab
  // bar's own fit at Extra large is not this check's.
  for (const width of [344, 360]) {
    await step('17 ' + width, async () => {
      p = await L.open(b, '#/prep', { width, settings: { text: 'xlarge' }, wait: 1500 });
      await updBar(p);
      await wide(p);
      await hold(p);
      await p.fill('#p-text', 'Slice tomatoes');
      await p.press('#p-text', 'Enter');
      await L.settle(p, 300);
      await p.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
      await p.click('.upd-bar button');
      await L.settle(p, 300);
      const u = await bar(p);
      ok(u && u.t === WAITS, width + ' px, Extra large: it says it updates once sent (' + JSON.stringify(u) + ')');
      ok(u && u.fits, width + ' px, Extra large, wide font: the words fit inside the strip and Update now stays on the screen (' + JSON.stringify(u) + ')');
      const h = await p.evaluate(() => ({ bar: document.querySelector('.upd-bar').offsetHeight, room: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--upd-h')) }));
      ok(h.room === h.bar, width + ' px, Extra large, wide font: the bars below sit under the strip at its real height (' + JSON.stringify(h) + ')');
      await release(p);
      await L.settle(p, 300);
    });
  }

  // a swipe up the screen, the way a finger scrolls a phone: what the book hears as a touch
  const swipe = async p => {
    const c = await p.context().newCDPSession(p);
    for (const [type, y] of [['touchStart', 600], ['touchMove', 500], ['touchMove', 400], ['touchEnd']]) await c.send('Input.dispatchTouchEvent', { type, touchPoints: y ? [{ x: 200, y }] : [] });
    await c.detach();
  };

  // 18. the 04:00 refresh held back all night (review of the fix, 28 Oct 2026): a tablet on Recipes from 03:57, with
  // every request to the book failing until 07:01, or no signal at all. A refresh that has waited has missed its night,
  // so it goes only the way the automatic update does: a chef typing "Lamb shank" in the recipe search and scrolling
  // keeps the words and the keyboard (it reloaded at 07:11, and 10 seconds after the signal came back). Left alone, it goes.
  for (const how of ['wifi with no internet', 'no signal']) {
    await step('18 ' + how, async () => {
      p = await L.open(b, '#/recipes', { touch: true, width: 768, height: 1024, clock: L.NOW - 10 * 3600000 - 180000, wait: 1500 });   // 03:57
      const cut = on => how === 'no signal' ? p.context().setOffline(on) : deadNet(p, on);
      await cut(true);
      await mark(p);
      await p.clock.fastForward('03:10');   // 04:00: the refresh finds no server and waits
      await L.settle(p, 1000);
      await p.clock.fastForward('03:00:00');   // 07:00
      await L.settle(p, 1000);
      ok(!(await reloaded(p)), '04:00, ' + how + ' until 07:00: no reload into an empty book');
      await p.fill('#find', 'Lamb shank');
      await cut(false);
      // a scroll every 10 seconds for 12 minutes: past the try 5 seconds after the signal is back, and the next 10 minute try
      await p.mouse.move(380, 700);
      for (let i = 0; i < 72 && !(await reloaded(p)); i++) { await p.mouse.wheel(0, i % 2 ? 150 : -150); await p.clock.fastForward(10000); await L.settle(p, 60); }
      ok(!(await reloaded(p)), '04:00 missed, ' + how + ' until 07:01: no reload while a chef types in the recipe search and scrolls');
      ok(await p.evaluate(() => { const f = document.getElementById('find'); return !!f && f.value === 'Lamb shank' && document.activeElement === f; }), '04:00 missed, ' + how + ': the search words still there, the keyboard still up');
      // done: nothing in a box and nobody touching the tablet for 2 minutes, it refreshes at its next try
      await p.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
      await p.clock.fastForward('10:30');
      await waitReload(p);
      ok(await reloaded(p), '04:00 missed, ' + how + ': left alone for 2 minutes, it refreshes at its next try');
      ok(/#\/recipes/.test(p.url()), '04:00 missed, ' + how + ': it stays on Recipes');
    });
  }

  // 19. coming back after 5 minutes away updates straight away, over a swipe (review of the fix, 28 Oct 2026: a swipe as
  // the phone came back called the update off, and with a swipe every 45 seconds it never updated in 60 minutes). A tick
  // made meanwhile still holds it back until it is sent, and so does a tap whose tick comes a moment after its touch.
  // back(): 6 minutes away, and the server has a new version (Last-Modified and ETag)
  const back = async p => {
    const st = { on: false };
    await p.context().route(u => u.href === L.BASE + 'index.html', r => r.request().method() === 'HEAD' && st.on ? r.fulfill({ status: 200, headers: { 'last-modified': 'Mon, 19 Oct 2026 00:00:00 GMT', etag: '"v2"' } }) : r.fallback());
    await p.evaluate(() => {
      window.__vis = 'visible';
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__vis });
    });
    const vis = s => p.evaluate(s => { window.__vis = s; document.dispatchEvent(new Event('visibilitychange')); }, s);
    await vis('hidden');
    await p.clock.fastForward('06:00');
    st.on = true;
    await mark(p);
    await vis('visible');
  };
  const ticked = p => p.evaluate(() => !!(window.LK_PREP.state.items.find(x => x.id === 'i1') || {}).done);
  await step('19 swipe', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', touch: true, wait: 1500 });
    const st = await slowFiles(p, 1500);
    await back(p);
    await L.sleep(400);
    await swipe(p);
    ok(await fetching(st), 'back after 6 minutes: it fetches the files');
    await waitReload(p);
    ok(await reloaded(p), 'back after 6 minutes, a swipe 0.4 seconds in: it updates straight away');
  });
  // 19 lk-new. The same when the strip came from the worker (lk-new: the files are already saved, and the server's
  // stamp is the one the book knew): it used to wait for 2 minutes untouched (review of 28 Oct 2026, older than this fix)
  await step('19 lk-new', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', touch: true, wait: 1500 });
    await updBar(p);
    await p.evaluate(() => {
      window.__vis = 'visible';
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__vis });
    });
    const vis = s => p.evaluate(s => { window.__vis = s; document.dispatchEvent(new Event('visibilitychange')); }, s);
    await vis('hidden');
    await p.clock.fastForward('06:00');
    await mark(p);
    await vis('visible');
    await L.sleep(300);
    await swipe(p);
    await waitReload(p);
    ok(await reloaded(p), 'the strip from the worker, back after 6 minutes, a swipe 0.3 seconds in: it updates straight away');
  });
  await step('19 tick', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', touch: true, wait: 1500 });
    await slowFiles(p, 1500);
    await back(p);
    await L.sleep(400);
    await hold(p);
    await p.tap('[data-p="tick"][data-id="i1"]');
    await L.settle(p, 4000);
    ok(!(await reloaded(p)), 'back after 6 minutes, a line ticked while it checked: no reload');
    ok(await ticked(p), 'back after 6 minutes, a line ticked while it checked: the tick is still there');
    const u = await bar(p);
    ok(u && u.t === 'New version available.', 'back after 6 minutes, a line ticked while it checked: the strip offers Update now (' + JSON.stringify(u) + ')');
    await release(p);
    await L.settle(p, 300);
  });
  await step('19 tap', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', touch: true, wait: 1500 });
    // the files the book fetches before the reload wait until the test lets them through
    const st = { on: false };
    let open = null;
    const gate = new Promise(r => { open = r; });
    await p.context().route(u => u.href === L.BASE + 'js/data.js', async r => { if (r.request().headers()['x-lk-fresh']) { st.on = true; await gate; } return r.fallback(); });
    await back(p);
    ok(await fetching(st), 'back after 6 minutes: it fetches the files');
    // a finger comes down just before the files are in, and its tick follows 300 ms later
    await p.evaluate(() => document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await hold(p);
    open();
    await L.sleep(300);
    await p.evaluate(() => document.querySelector('[data-p="tick"][data-id="i1"]').click());
    await L.settle(p, 3000);
    ok(!(await reloaded(p)), 'back after 6 minutes, a tap just as the files came in: it waits a moment, sees the tick and does not reload');
    ok(await ticked(p), 'back after 6 minutes, a tap just as the files came in: the tick is still there');
    await release(p);
    await L.settle(p, 300);
  });

  // 20. Update now tapped while a change waits, then the change is sent: the book updates at its next look (every 20
  // seconds), even while it is in use (review of the fix, 28 Oct 2026: it waited for 2 minutes untouched, so with a
  // touch every 30 seconds it never updated)
  await step('20', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', touch: true, wait: 1500 });
    await updBar(p);
    await hold(p);
    await p.fill('#p-text', 'Slice tomatoes');
    await p.press('#p-text', 'Enter');
    await L.settle(p, 300);
    await p.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
    await mark(p);
    await p.tap('.upd-bar button');
    await L.settle(p, 300);
    const u = await bar(p);
    ok(u && u.t === WAITS, 'Update now, a change waiting: it updates once sent (' + JSON.stringify(u) + ')');
    await swipe(p);
    await p.clock.fastForward(30000);
    await L.settle(p, 1500);
    ok(!(await reloaded(p)), 'Update now, the change still waiting 30 seconds on: no reload');
    await release(p);
    await L.settle(p, 300);
    await swipe(p);
    await p.clock.fastForward(30000);
    await L.waitFor(p, () => window.__mark !== 1, null, 8000).catch(() => {});
    ok(await reloaded(p), 'Update now, the change sent, a touch every 30 seconds: it updates at the next look');
  });

  // 21. back within 10 minutes of the last update, with a newer version found on return: the strip offers Update now
  // (the book reloads by itself at most once in 10 minutes; it used to show nothing)
  await step('21', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', touch: true, wait: 1500 });
    await p.evaluate(() => localStorage.setItem('lk.upd.last', String(Date.now() - 60000)));   // updated a minute ago
    await back(p);
    await L.settle(p, 1500);
    const u = await bar(p);
    ok(!(await reloaded(p)) && u && u.t === 'New version available.' && u.btn === 'Update now', 'back 7 minutes after an update, a newer version: no reload, the strip offers Update now (' + JSON.stringify(u) + ')');
  });

  // 22. the update step 20 runs once the change is sent (review of the fix, 28 Oct 2026). Nobody tapped just now, so the
  // strip says nothing while it checks the signal, and it never reloads over a box tapped into or typed in meanwhile (the
  // server slow, 3 seconds): it reloaded over "Lamb shank" in the recipe search and over a tap into the search or a prep
  // box, which closed the keyboard, and said Tap again to update over half a prep line. It waits quietly and goes at a
  // later look once the box is left, within 10 minutes of the tap, still while the book is in use.
  const INBOX = {
    'search typed': { hash: '#/recipes', act: async p => { await p.fill('#find', 'Lamb shank'); return () => p.evaluate(() => { const f = document.getElementById('find'); return !!f && f.value === 'Lamb shank' && document.activeElement === f; }); } },
    'search tapped': { hash: '#/recipes', act: async p => { await p.tap('#find'); return () => p.evaluate(() => document.activeElement === document.getElementById('find')); } },
    'prep box tapped': { hash: '#/prep', act: async p => { await p.tap('#p-text'); return () => p.evaluate(() => document.activeElement === document.getElementById('p-text')); } },
    'half a line': { hash: '#/prep', act: async p => { await p.fill('#p-text', 'Brunoise shallots'); return () => p.evaluate(() => (document.querySelector('#p-text') || {}).value === 'Brunoise shallots'); } }
  };
  for (const how of Object.keys(INBOX)) {
    await step('22 ' + how, async () => {
      p = await L.open(b, '#/prep', { who: 'ann', touch: true, wait: 1500 });
      const st = { heads: 0, navs: 0 };   // HEADs of index.html (the update asking the server), and loads of the page
      p.on('request', q => {
        if (q.isNavigationRequest() && q.frame() === p.mainFrame()) st.navs++;
        if (q.method() === 'HEAD' && q.url() === L.BASE + 'index.html') st.heads++;
      });
      await updBar(p);
      await hold(p);
      await p.fill('#p-text', 'Slice tomatoes');
      await p.press('#p-text', 'Enter');
      await L.settle(p, 300);
      await p.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
      await p.tap('.upd-bar button');
      await L.settle(p, 300);
      let u = await bar(p);
      ok(u && u.t === WAITS, how + ': Update now, a change waiting: it updates once sent (' + JSON.stringify(u) + ')');
      if (INBOX[how].hash !== '#/prep') { await p.evaluate(h => { location.hash = h; }, INBOX[how].hash); await L.settle(p, 600); }
      await slowHead(p, 3000);
      await release(p);
      await L.settle(p, 300);
      await mark(p);
      st.heads = 0;
      await p.clock.fastForward(20000);   // the next look: the change is sent, so the update starts and asks the server
      for (let i = 0; i < 100 && !st.heads; i++) await L.sleep(50);
      ok(st.heads > 0, how + ': the change sent, the update starts at the next look');
      u = await bar(p);
      ok(u && u.t === 'New version available.' && u.btn === 'Update now', how + ': nobody tapped just now, so the strip says nothing new while it checks (' + JSON.stringify(u) + ')');
      const kept = await INBOX[how].act(p);
      await L.settle(p, 4500);
      ok(!(await reloaded(p)), how + ' while it checked: no reload');
      ok(await kept(), how + ' while it checked: ' + (how === 'half a line' ? 'the words still there' : 'the box still in use, the keyboard still up'));
      u = await bar(p);
      ok(u && u.t === 'New version available.' && u.btn === 'Update now', how + ' while it checked: it waits quietly, with no Tap again to update (' + JSON.stringify(u) + ')');
      // the box left (half a line cleared), the book still in use: it goes at a later look
      await p.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
      if (how === 'half a line') { await p.fill('#p-text', ''); await p.evaluate(() => { window.LK_PREP.state.text = ''; if (document.activeElement) document.activeElement.blur(); }); }
      await swipe(p);
      await p.clock.fastForward(20000);
      await waitReload(p);
      ok(await reloaded(p), how + ': the box left, a touch 20 seconds before: it updates at the next look');
      await L.settle(p, 2000);
      ok(st.navs === 1, how + ': it reloads once (' + st.navs + ')');
    });
  }

  // 23. Reload the book (28 Oct 2026): a page loaded on its own that is a different version from the book (here an old
  // js/manage.js) offers Reload, which now goes through Update now's own path. With a change waiting it says it updates
  // once sent, with no Reload site? box, and does; with half a line typed it asks for a second tap. It used to reload at
  // once: the browser asked (a phone app that does not ask lost the change), and the half line went.
  const headCfg = { [['kitchens', L.PIN, 'config', 'main'].join('/')]: { people: [
    { id: 'ann', name: 'Ann', role: 'head', add: true, tick: true, del: true, active: true },
    { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true }
  ], headId: 'ann', sousIds: ['sam', 'ann'], showBadges: true } };
  const OLD_MG = 'window.LK_MG = { api: 3, render: {}, mount: function () {}, unmount: function () {}, open: function () { return false; }, dirty: function () { return false; }, hasDraft: function () { return false; } };';
  for (const how of ['a change waiting', 'half a line']) {
    await step('23 ' + how, async () => {
      p = await L.open(b, '#/prep', { who: 'ann', extra: headCfg, touch: true, wait: 1500 });
      let asked = 0;
      p.on('dialog', d => { asked++; d.dismiss().catch(() => {}); });
      await p.context().route(/\/js\/manage\.js(?:\?|$)/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: OLD_MG }));
      if (how === 'a change waiting') { await hold(p); await p.fill('#p-text', 'Portion the brisket'); await p.press('#p-text', 'Enter'); await L.settle(p, 300); }
      else { await p.fill('#p-text', 'Half a line'); await L.settle(p, 200); }
      await p.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
      await p.evaluate(() => { location.hash = '#/manage/r/burger'; });
      await L.waitFor(p, () => /Reload the book/.test((document.querySelector('#mg-root') || {}).textContent || ''), null, 10000);
      await mark(p);
      // L.tap: a click that starts a reload the browser asks about would wait on it
      await L.tap(p, '[data-act="reload"]');
      await L.settle(p, 1500);
      const u = await bar(p);
      if (how === 'a change waiting') {
        ok(!(await reloaded(p)) && asked === 0, 'Reload the book, a change waiting: no reload and no Reload site? box (' + asked + ' asked)');
        ok(u && u.t === WAITS && u.btn === 'Update now', 'Reload the book, a change waiting: the strip says it updates once sent (' + JSON.stringify(u) + ')');
        for (const width of [390, 768, 1280]) {
          await p.setViewportSize({ width, height: 844 });
          ok(!(await L.overflow(p)), 'Reload the book with the strip: no sideways scroll at ' + width);
        }
        await release(p);
        await L.settle(p, 400);
        await p.clock.fastForward(21000);   // the next look, the change sent
      } else {
        ok(!(await reloaded(p)) && u && u.t === 'Not saved yet.' && u.btn === 'Tap again to update', 'Reload the book, half a line typed: it asks first (' + JSON.stringify(u) + ')');
        await L.tap(p, '[data-act="reload"]');
      }
      await waitReload(p);
      ok(await reloaded(p), 'Reload the book, ' + how + ': then it updates');
    });
  }

  // 24. an update waiting on wifi with no internet, the book left alone (28 Oct 2026): the look every 20 seconds waits
  // longer after each try that found no signal (20 seconds, then 1, 2, 5 and 10 minutes). It asked the server every 20
  // seconds, 25 times in 10 minutes. With the internet back, and no online event (the wifi never went), it still
  // updates within the longest wait.
  await step('24', async () => {
    p = await L.open(b, '#/prep', { touch: true, wait: 1500 });
    let heads = 0;
    p.on('request', q => { if (q.method() === 'HEAD' && q.url() === L.BASE + 'index.html') heads++; });
    await updBar(p);
    await deadNet(p, true);
    await mark(p);
    heads = 0;
    for (let i = 0; i < 30; i++) { await p.clock.fastForward(20000); await L.settle(p, 150); }
    ok(heads <= 6 && !(await reloaded(p)), 'wifi with no internet, left alone for 10 minutes: no reload, and it asked the server ' + heads + ' times (6 at most)');
    await deadNet(p, false);
    for (let i = 0; i < 33 && !(await reloaded(p)); i++) { await p.clock.fastForward(20000); await L.settle(p, 150); }
    await waitReload(p);
    ok(await reloaded(p), 'the internet back with no online event: it updates within 11 minutes');
  });
  // 24 online. The same, but the signal comes back with an online event (the phone's wifi came back): it updates at the
  // next look, not after the longest wait (review of the fix, 28 Oct 2026: nothing checked goodLook() on online)
  await step('24 online', async () => {
    p = await L.open(b, '#/prep', { touch: true, wait: 1500 });
    await updBar(p);
    await deadNet(p, true);
    await mark(p);
    // 15 minutes: the first look is 2 minutes in (nobody has touched it), then 20 seconds, 1, 2 and 5 minutes, so the
    // next one waits 10 minutes
    for (let i = 0; i < 45; i++) { await p.clock.fastForward(20000); await L.settle(p, 150); }
    ok(!(await reloaded(p)), 'wifi with no internet for 15 minutes: no reload');
    await deadNet(p, false);
    await p.evaluate(() => window.dispatchEvent(new Event('online')));
    for (let i = 0; i < 2 && !(await reloaded(p)); i++) { await p.clock.fastForward(20000); await L.settle(p, 300); }
    await waitReload(p);
    ok(await reloaded(p), 'the internet back with an online event: it updates within the next two looks, not after the 10 minute wait');
  });

  // 25. the server has a change while the strip is still up: the listener's 'same' snapshot patches the row's Not sent
  // mark in place (patchOrDraw(), patchLines()), with no redraw, and the row keeps the mark's room (28 Oct 2026; no test
  // reached it before). __fake.ack() lets the listeners hear the server's confirm while the write's own promise waits
  // (its .then() draws), and __fake.quiet stops the stand-in telling every other listener too, which redrew the page.
  // An added order line, an order line under Ordered today, and an added prep line.
  const ROWS = [['orders, an added line', '#/orders', 'Lemons'], ['orders, Ordered today', '#/orders', 'Milk'], ['prep, an added line', '#/prep', 'Zest limes']];
  for (const [what, hash, text] of ROWS) {
    await step('25 ' + what, async () => {
      p = await L.open(b, hash, { who: 'sam', wait: 1500 });
      await p.context().setOffline(true);
      await p.evaluate(() => { window.__fake.mode = 'hold'; window.__fake.quiet = true; });
      await L.settle(p, 300);
      if (text === 'Milk') {
        await p.evaluate(() => [...document.querySelectorAll('.nb-row')].find(r => /^Milk/.test((r.querySelector('.nb-t') || {}).textContent || '')).querySelector('.nb-box').click());
        // 10 minutes on, the ticked line leaves the list for Ordered today (a touch each minute, so nobody is signed out)
        for (let i = 0; i < 11; i++) { await p.mouse.move(30 + i, 30); await p.clock.runFor(60000); }
        await L.settle(p, 500);
      } else {
        const box = hash === '#/orders' ? '#o-text' : '#p-text';
        await p.fill(box, text); await p.press(box, 'Enter'); await L.settle(p, 500);
      }
      // the row the line is in: Ordered today's li for Milk, the list's row otherwise
      const tag = await p.evaluate(t => { const r = [...document.querySelectorAll(t === 'Milk' ? '.nb-done li[data-ln]' : '.nb-rows .nb-row')].find(x => x.textContent.indexOf(t) >= 0); if (!r) return 'no row'; r.__k = 1; return r.querySelector('.nb-unsent') ? 'shown' : 'none'; }, text);
      ok(tag === 'shown', what + ': with no signal the line shows Not sent (' + tag + ')');
      await p.evaluate(() => window.__fake.ack());
      await L.settle(p, 400);
      const s = await p.evaluate(t => { const r = [...document.querySelectorAll('[data-ln]')].find(x => x.__k === 1); return r ? { same: true, inPage: document.body.contains(r) && r.textContent.indexOf(t) >= 0, unsent: !!r.querySelector('.nb-unsent'), held: !!r.querySelector('.nb-held'), strip: !!document.querySelector('.p-sync') } : { same: false }; }, text);
      ok(s.same && s.inPage && !s.unsent && s.held && s.strip, what + ': the server has it, so the mark goes from the same row, which keeps its room under the strip (' + JSON.stringify(s) + ')');
      ok(!(await L.overflow(p)), what + ': no sideways scroll at 390');
      await release(p);
      await p.context().setOffline(false);
      await L.settle(p, 300);
      ok(errs(p).length === 0, what + ': no page errors ' + errs(p).join(' | '));
    });
  }

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
