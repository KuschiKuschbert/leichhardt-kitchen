// A local tick travels to another context through its live snapshot, then ages out on both screens.
const L = require('./lib');
const { R, ok } = L.results();
const date = L.ymd(new Date(L.NOW));
const key = `kitchens/${L.PIN}/days/${date}/items/i4`;
const tick = '.nb-left .nb-box[data-id="i4"]';
const next = '.nb-left .nb-box[data-id="i5"]';

async function open(browser, width, deviceUid) {
  const page = await L.open(browser, '#/prep', { who: 'ann', deviceUid, width, height: width === 390 ? 844 : width === 768 ? 900 : 800, touch: width === 390 });
  await page.locator('.nb-tab[data-v="Sauce"]').click();
  await page.locator(tick).waitFor();
  await page.evaluate(() => { __fake.quiet = true; });
  return page;
}

async function acknowledgedTick(writer, reader) {
  await writer.evaluate(() => { __fake.mode = 'hold'; });
  await writer.locator(tick).tap();
  await L.waitFor(writer, key => __fake.dump()[key]?.done, key);
  ok(await reader.locator(tick).getAttribute('aria-pressed') === 'false', 'the receiver still has an open row while the writer is unacknowledged');
  await writer.evaluate(() => { __fake.mode = 'ok'; __fake.release(); });
  await L.waitFor(writer, () => !LK_PREP.unsent());
  const saved = await writer.evaluate(key => __fake.dump()[key], key);
  // The test contexts have separate stores. Deliver the writer's acknowledged document as a live server snapshot.
  // The receiving clock advances only when the test asks, including during screenshots on a slow runner.
  await reader.clock.pauseAt(await reader.evaluate(() => Date.now()) + 1000);
  const offset = await reader.evaluate(() => LK_TIME.now() - Date.now());
  await reader.clock.setSystemTime(saved.doneAt + 30 - offset);
  await reader.evaluate(([key, saved]) => __fake.write(key, saved), [key, saved]);
  await L.waitFor(reader, tick => document.querySelector(tick)?.getAttribute('aria-pressed') === 'true', tick);
  return saved;
}

async function usage(page) {
  return page.evaluate(key => ({ reads: __fake.reads.filter(p => p === key || p === key.split('/').slice(0, -1).join('/')).length,
    writes: __fake.writes.flat().filter(w => w.path === key).length }), key);
}

async function advanceTo(page, target) {
  const remaining = target - await page.evaluate(() => LK_TIME.now());
  if (remaining > 0) await page.clock.runFor(remaining);
}

async function check(browser, width) {
  const [writer, reader] = await Promise.all([open(browser, 390, 'prep-writer'), open(browser, width, 'prep-reader')]);
  try {
    if (width === 390) await reader.locator(next).scrollIntoViewIfNeeded();
    const saved = await acknowledgedTick(writer, reader), counts = await usage(reader);
    let touch;
    if (width === 390) {
      const box = await reader.locator(next).boundingBox();
      const finger = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
      touch = await reader.context().newCDPSession(reader);
      await reader.evaluate(() => {
        window.prepExpiryCancelled = false;
        document.addEventListener('pointercancel', () => { window.prepExpiryCancelled = true; }, { once: true, capture: true });
      });
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger] });
      await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: finger.x, y: finger.y - 55 }] });
      await L.waitFor(reader, () => window.prepExpiryCancelled, null, 1500);
      await advanceTo(reader, saved.doneAt + 3150);
      ok(await reader.locator(tick).getAttribute('aria-pressed', { timeout: 1500 }) === 'true', `${width}: the acknowledged row stays struck during the 3.5-second pause`);
      await advanceTo(reader, saved.doneAt + 5050);
      ok(await reader.locator(tick).count() === 1, `${width}: a scrolling finger keeps the struck row in place after pointercancel`);
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    if (width !== 390) {
      await advanceTo(reader, saved.doneAt + 3150);
      ok(await reader.locator(tick).getAttribute('aria-pressed', { timeout: 1500 }) === 'true', `${width}: the acknowledged row stays struck during the 3.5-second pause`);
    }
    await advanceTo(reader, saved.doneAt + 6200);
    const remaining = await reader.locator(tick).count();
    ok(remaining === 0, `${width}: the struck row clears on the other screen without unrelated input (remaining ${remaining})`);
    ok(await reader.locator(next).getAttribute('aria-pressed') === 'false', `${width}: the other Sauce line stays open`);
    ok(JSON.stringify(await usage(reader)) === JSON.stringify(counts), `${width}: expiry adds no item query or write`);
    ok(!reader.errors.length && !writer.errors.length, `${width}: no browser errors`);
    await touch?.detach();
  } finally {
    await Promise.all([writer.context().close(), reader.context().close()]);
  }
}

async function typingAndUndo(browser) {
  const [writer, reader] = await Promise.all([open(browser, 390, 'prep-writer'), open(browser, 768, 'prep-reader')]);
  try {
    const saved = await acknowledgedTick(writer, reader);
    await writer.clock.pauseAt(await writer.evaluate(() => Date.now()) + 1000);
    await L.pLog(reader);
    await reader.clock.runFor(100);
    await reader.locator('#p-text').fill('Check the stock');
    await reader.evaluate(() => {
      window.prepExpiryInput = document.getElementById('p-text');
      window.prepExpiryInput.setSelectionRange(3, 9);
    });
    await advanceTo(reader, saved.doneAt + 5200);
    ok(await reader.evaluate(() => document.activeElement === window.prepExpiryInput &&
      window.prepExpiryInput.value === 'Check the stock' && window.prepExpiryInput.selectionStart === 3 &&
      window.prepExpiryInput.selectionEnd === 9), 'expiry does not replace the focused Prep input or its selection');
    await reader.evaluate(() => document.activeElement.blur());
    await advanceTo(reader, saved.doneAt + 6200);
    ok(await reader.locator(tick).count() === 0, 'the remote tick expires when the input loses focus');
    ok(await reader.locator('#p-text').inputValue() === 'Check the stock', 'the expiry redraw keeps the unsaved typed line');

    // Undo on the first screen writes a fresh open row. The receiving screen must keep it open.
    await writer.evaluate(() => document.querySelector('.p-toast [data-p="toast-act"]').click());
    await L.waitFor(writer, key => __fake.dump()[key]?.done === false, key);
    const undone = await writer.evaluate(key => __fake.dump()[key], key);
    await reader.evaluate(([key, row]) => __fake.write(key, row), [key, undone]);
    await L.waitFor(reader, tick => document.querySelector(tick)?.getAttribute('aria-pressed') === 'false', tick);
    await reader.clock.runFor(4000);
    ok(await reader.locator(tick).getAttribute('aria-pressed') === 'false', 'Undo leaves the row open on the receiving screen');
    ok(!reader.errors.length && !writer.errors.length, 'typing and Undo have no browser errors');
  } finally {
    await Promise.all([writer.context().close(), reader.context().close()]);
  }
}

(async () => {
  const browser = await L.start();
  try {
    for (const width of [390, 768, 1280]) await check(browser, width);
    await typingAndUndo(browser);
  } finally { await browser.close(); }
  L.report(R);
})().catch(error => { console.log(R.join('\n')); console.error(error); process.exit(1); });
