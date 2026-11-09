// Daily Queensland availability through the real app and synthetic Firebase. Nothing writes to a live kitchen.
const L = require('./lib');
const { R, ok } = L.results();
const HOUR = 3600000, DAY = 24 * HOUR, OPEN = L.NOW - 4 * HOUR, CLOSE = OPEN + 11 * HOUR;
const key = name => ['kitchens', L.PIN, 'cooling', name].join('/');
const CURRENT = key('current'), RECORDED = key('recorded'), RUN = 'daily-window-run-01';
const stamp = at => ({ __fakeTimestamp: at });
const first = at => ({ v: 1, run: RUN, rev: 7, firstAt: stamp(at), firstBy: 'ann', secondAt: 0, secondBy: '', by: 'ann' });
const second = (at, next) => ({ ...first(at), rev: 8, secondAt: stamp(next), secondBy: 'bo', by: 'bo' });
const read = (p, path = CURRENT) => p.evaluate(path => __fake.dump()[path], path);
const millis = value => value && value.seconds * 1000 + (value.nanoseconds || 0) / 1000000;
const activity = p => p.evaluate(() => ({
  writes: __fake.writes.flat().filter(x => /\/cooling\//.test(x.path)).length,
  reads: __fake.bill.filter(x => /\/cooling\//.test(x.path)).reduce((n, x) => n + x.n, 0)
}));
const overlays = p => p.locator('.cooling-menu, .cooling-ping').count();
async function loaded(p) {
  await L.waitFor(p, () => window.LK_PREP && LK_PREP.privateAccess() && document.querySelector('.cooling-clock:not([hidden])') && document.querySelector('.cooling-clock').dataset.clockState !== 'checking', null, 8000);
  await L.settle(p, 250);
}
async function phase(p, state) { await L.waitFor(p, state => document.querySelector('.cooling-clock')?.dataset.clockState === state, state, 4000); }
async function at(p, value, wake = false) {
  await p.clock.pauseAt(new Date(value));
  await p.evaluate(wake => { if (wake) document.dispatchEvent(new Event('visibilitychange')); else window.dispatchEvent(new Event('lk-clock')); }, wake);
}
async function noActivity(p, before, label) { ok(JSON.stringify(await activity(p)) === JSON.stringify(before), label + ': no cooling writes or additional reads'); }
async function offHours(p, label) {
  await phase(p, 'off_hours');
  const status = p.locator('.cooling-clock-status'), button = p.locator('button[data-cooling="clock"]');
  ok(await status.isVisible() && await status.getAttribute('role') === 'status' && await status.getAttribute('aria-disabled') === 'true' && /10:00.*Queensland/.test(await status.getAttribute('aria-label')), label + ': visible clock explains its 10:00 Queensland reopening');
  ok(!await button.isVisible() && await button.isDisabled() && await overlays(p) === 0, label + ': the start action is disabled and no old ping or menu is open');
}

(async () => {
  const browser = await L.start(); let p;
  async function step(label, fn) {
    try { await fn(); }
    catch (error) { ok(false, label + ': ' + String(error.message || error).split('\n')[0]); }
    finally { if (p) { ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; } }
  }
  try {
    await step('morning boundary and explicit fresh start', async () => {
      p = await L.open(browser, '#/recipes', { who: 'ann', clock: OPEN - 60000, extra: { [CURRENT]: first(OPEN - DAY) }, wait: 1000 });
      await loaded(p); const old = JSON.stringify(await read(p)), baseline = await activity(p);
      await at(p, OPEN - 1); await offHours(p, '09:59:59.999');
      const status = p.locator('.cooling-clock-status'), box = await status.boundingBox();
      await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await status.evaluate(el => el.focus()); await p.keyboard.press('Enter'); await p.keyboard.press('Space');
      await p.evaluate(() => {
        document.querySelector('button[data-cooling="clock"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        LK_PREP.coolingOpen(document.querySelector('.cooling-chip'));
      });
      ok(await overlays(p) === 0 && await status.evaluate(el => el.tabIndex < 0 && el.closest('.cooling-clock').dataset.clockState === 'off_hours'), 'Off-hours mouse, keyboard and synthetic clock activation cannot open or arm the timer');
      await noActivity(p, baseline, 'Off-hours activation');
      await at(p, OPEN); await phase(p, 'idle');
      ok(await overlays(p) === 0 && JSON.stringify(await read(p)) === old && !await read(p, RECORDED), 'At exactly 10:00 the old unfinished batch stays retained and the clock is idle without replay or confirmation');
      await noActivity(p, baseline, '10:00 transition');
      await at(p, OPEN + 1000); await phase(p, 'idle');
      await noActivity(p, baseline, 'After 10:00');
      await p.clock.resume();
      await p.locator('button[data-cooling="clock"]:visible').click(); await phase(p, 'armed');
      ok(JSON.stringify(await read(p)) === old, 'The first manual tap only prepares a new start');
      await p.locator('button[data-cooling="clock"]:visible').click(); await phase(p, 'first');
      const next = await read(p);
      ok(next.run !== RUN && next.rev === 8 && next.windowAt === OPEN && millis(next.firstAt) >= OPEN && next.secondAt === 0, 'Only the second manual tap starts today with a new run and increments the retained revision with today’s window');
      ok((await activity(p)).writes === baseline.writes + 1, 'The new day needs exactly one explicit timer write');
    });

    await step('21:00 closes an outstanding ping and its chimes', async () => {
      p = await L.open(browser, '#/recipes', { who: 'ann', clock: CLOSE - 60000, extra: { [CURRENT]: first(OPEN + HOUR) }, wait: 1000 });
      await loaded(p); await L.waitFor(p, () => !!document.querySelector('.cooling-ping'));
      ok(await p.locator('[data-cooling="confirm"][data-confirm-stage="2"]').isEnabled(), 'Before 21:00 the due two-hour check can still be confirmed');
      await p.evaluate(() => { window.__dailySoundStops = 0; const stop = LK_CHIME.stopCooling; LK_CHIME.stopCooling = function () { __dailySoundStops++; return stop(); }; });
      const old = JSON.stringify(await read(p)), baseline = await activity(p);
      await at(p, CLOSE - 1);
      ok(await p.locator('.cooling-ping').isVisible(), 'The outstanding reminder remains available up to 20:59:59.999');
      await at(p, CLOSE); await offHours(p, '21:00');
      ok(await p.evaluate(() => __dailySoundStops > 0), '21:00 cancels the outstanding cooling chime sequence');
      ok(JSON.stringify(await read(p)) === old && !await read(p, RECORDED), '21:00 keeps the saved unfinished timer without pretending it was recorded in Operandio');
      await noActivity(p, baseline, '21:00 reset');
      await at(p, CLOSE + 1000); await noActivity(p, baseline, 'After 21:00');
      await p.clock.resume(); await p.reload(); await loaded(p); await offHours(p, 'Overnight refresh');
      await p.evaluate(() => { location.hash = '#/cooling'; }); await L.settle(p, 200);
      ok(await overlays(p) === 0, 'Opening the cooling route overnight cannot reopen the expired reminder');
    });

    await step('late unfinished second stage resets on wake', async () => {
      p = await L.open(browser, '#/recipes', { who: 'bo', clock: CLOSE - 60000, extra: { [CURRENT]: second(OPEN + 6 * HOUR, OPEN + 8 * HOUR) },
        init: () => localStorage.setItem('lk.cooling.seen.000000.anon-test', JSON.stringify({ 'daily-window-run-01_1': true })), wait: 1000 });
      await loaded(p); await phase(p, 'record');
      await p.evaluate(() => LK_PREP.coolingOpen(document.querySelector('.cooling-chip'))); await L.waitFor(p, () => !!document.querySelector('.cooling-menu'));
      const old = JSON.stringify(await read(p)), baseline = await activity(p);
      await at(p, CLOSE + 60000, true); await offHours(p, 'Wake after 21:00');
      ok(JSON.stringify(await read(p)) === old, 'A four-hour stage due at 22:00 is retained but inactive after the daily reset');
      await noActivity(p, baseline, 'Wake after cutoff');
    });

    await step('a deadline exactly at cutoff never pings', async () => {
      p = await L.open(browser, '#/recipes', { who: 'ann', clock: CLOSE - 60000, extra: { [CURRENT]: first(CLOSE - 2 * HOUR) }, wait: 1000 });
      await loaded(p); await phase(p, 'first');
      await p.evaluate(() => { window.__dailySoundStarts = 0; const play = LK_CHIME.playCooling; LK_CHIME.playCooling = function () { __dailySoundStarts++; return play(); }; });
      const baseline = await activity(p);
      await at(p, CLOSE - 1); ok(await overlays(p) === 0, 'A timer due at 21:00 has no early reminder');
      await at(p, CLOSE); await offHours(p, 'Deadline at 21:00');
      ok(await p.evaluate(() => __dailySoundStarts === 0 && !localStorage.getItem('lk.cooling.seen.000000.anon-test')), 'The exact cutoff never chimes or marks an expired reminder as presented');
      await noActivity(p, baseline, 'Deadline at cutoff');
    });

    for (const [label, clock, expected] of [['new login overnight', CLOSE + HOUR, 'off_hours'], ['next-day login before opening', OPEN + DAY - 60000, 'off_hours'], ['next-day login after opening', OPEN + DAY, 'idle']]) await step(label, async () => {
      p = await L.open(browser, '#/recipes', { who: 'bo', deviceUid: 'fresh-device', clock, extra: { [CURRENT]: second(OPEN, OPEN + 2 * HOUR) }, wait: 1000 });
      await loaded(p); await phase(p, expected);
      ok(await overlays(p) === 0 && (await read(p)).run === RUN && !(await activity(p)).writes, label + ': a fresh device cannot replay or restart yesterday’s completed batch');
      if (expected === 'idle') {
        await p.evaluate(() => LK_PREP.coolingOpen(document.querySelector('.cooling-chip'))); await L.waitFor(p, () => !!document.querySelector('.cooling-menu'));
        ok(await p.locator('[data-cooling="start"][data-stage="2"]').isEnabled() && await p.locator('.cooling-menu .lk-stamp').count() === 0, 'Next-day details offer a fresh manual start without stale completed-stage stamps');
      }
    });
  } finally { if (p) await p.context().close(); await browser.close(); }
  L.report(R);
})().catch(error => { console.error(error); process.exit(1); });
