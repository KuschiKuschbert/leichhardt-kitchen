// Shared confirmation and once-per-device presentation through the real app, with synthetic Firebase only.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const CURRENT = key('cooling', 'current'), RECORDED = key('cooling', 'recorded'), HOUR = 3600000;
const RUN = 'cooling-confirmation-01', stamp = value => ({ __fakeTimestamp: value });
const millis = value => value && (value.__fakeTimestamp != null ? value.__fakeTimestamp : value.seconds * 1000 + (value.nanoseconds || 0) / 1000000);
const first = (at = L.NOW - 2 * HOUR - 1000) => ({ v: 1, run: RUN, rev: 1, firstAt: stamp(at), firstBy: 'ann', secondAt: 0, secondBy: '', by: 'ann' });
const second = () => ({ ...first(L.NOW - 4 * HOUR), rev: 2, secondAt: stamp(L.NOW - 2 * HOUR), secondBy: 'ann' });
const checked = (hours, by = 'ann') => ({ v: 1, run: RUN, firstAt: hours === 2 ? stamp(L.NOW - 500) : 0, firstBy: hours === 2 ? by : '', secondAt: hours === 4 ? stamp(L.NOW - 500) : 0, secondBy: hours === 4 ? by : '', by });
const read = (p, path) => p.evaluate(path => __fake.dump()[path], path);
const writes = p => p.evaluate(path => __fake.writes.flat().filter(x => x.path === path), RECORDED);
const confirm = (p, hours = 2) => p.locator('[data-cooling="confirm"][data-confirm-stage="' + hours + '"]').first();
const ping = p => L.waitFor(p, () => !!document.querySelector('.cooling-ping'), null, 8000);
const closed = p => L.waitFor(p, () => !document.querySelector('.cooling-ping'), null, 8000);
async function quiet(p) {
  await L.waitFor(p, () => {
    const clock = document.querySelector('.cooling-clock:not([hidden])');
    return window.LK_PREP && LK_PREP.privateAccess() && clock && clock.dataset.clockState !== 'checking';
  }, null, 8000);
  await L.settle(p, 500);
  return await p.locator('.cooling-ping').count() === 0;
}
async function server(p, path, value) { await p.evaluate(({ path, value }) => __fake.write(path, value), { path, value }); }
async function openClock(p) {
  await p.locator('button[data-cooling="clock"]:visible').click();
  await L.waitFor(p, () => !!document.querySelector('.cooling-menu'));
}

(async () => {
  const browser = await L.start(); let p;
  async function step(label, fn) {
    try { await fn(); }
    catch (error) { ok(false, label + ': ' + String(error.message || error).split('\n')[0]); }
    finally { if (p) { ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; } }
  }
  try {
    await step('quiet dismissal survives routes, reload and handover', async () => {
      p = await L.open(browser, '#/prep', { who: 'ann', deviceMode: 'shared', extra: { [CURRENT]: first() }, wait: 1000 });
      await ping(p); await p.getByRole('button', { name: 'Not yet', exact: true }).click();
      ok(!await read(p, RECORDED) && (await writes(p)).length === 0, 'Not yet makes no shared completion claim or write');
      for (const hash of ['#/orders', '#/waste', '#/transfers', '#/recipes', '#/prep']) {
        await p.evaluate(hash => { location.hash = hash; }, hash);
        ok(await quiet(p), hash + ': changing page does not reopen the dismissed stage');
      }
      await p.reload();
      ok(await quiet(p), 'Reload retains the device presentation marker instead of replaying the ping');
      await openClock(p);
      ok(await confirm(p).isEnabled(), 'The quiet clock reopens the outstanding confirmation');
      await p.keyboard.press('Escape');
      await L.notYou(p);
      await L.waitFor(p, () => !LK_PREP.privateAccess());
      await p.locator('.p-name[data-id="bo"]').click();
      await p.locator('[data-k="pf1"]').fill('3333');
      await L.waitFor(p, () => LK_PREP.privateAccess() && LK_PREP.state.who === 'bo', null, 8000);
      ok(await quiet(p), 'A different person signing in on the same shared device does not replay the stage');
      await openClock(p);
      ok(await confirm(p).isEnabled() && !await read(p, RECORDED), 'The next person can still complete the shared outstanding check');
    });

    await step('Escape persists quiet presentation', async () => {
      p = await L.open(browser, '#/recipes', { who: 'ann', extra: { [CURRENT]: first() }, wait: 1000 });
      await ping(p); await p.keyboard.press('Escape'); await p.reload();
      ok(await quiet(p) && !await read(p, RECORDED), 'Escape followed by reload stays quiet without confirming Operandio');
    });

    await step('existing personal dismissal migrates without replay', async () => {
      p = await L.open(browser, '#/prep', { who: 'ann', deviceMode: 'shared', extra: { [CURRENT]: first() }, wait: 1000,
        init: () => localStorage.setItem('lk.cooling.seen.000000.anon-test.ann', JSON.stringify({ 'cooling-confirmation-01_1': true })) });
      ok(await quiet(p), 'A Got it marker from the previous release still suppresses automatic replay');
      await openClock(p);
      ok(await confirm(p).isEnabled() && !await read(p, RECORDED), 'The old personal dismissal is never converted into a shared completion claim');
      await p.keyboard.press('Escape'); await L.notYou(p);
      await L.waitFor(p, () => !LK_PREP.privateAccess());
      await p.locator('.p-name[data-id="bo"]').click(); await p.locator('[data-k="pf1"]').fill('3333');
      await L.waitFor(p, () => LK_PREP.privateAccess() && LK_PREP.state.who === 'bo', null, 8000);
      ok(await quiet(p), 'The migrated dismissal is stored for this device before another person signs in');
    });

    await step('a shared device upgrades under a different person', async () => {
      p = await L.open(browser, '#/prep', { who: 'bo', deviceMode: 'shared', extra: { [CURRENT]: first() }, wait: 1000,
        init: () => localStorage.setItem('lk.cooling.seen.000000.anon-test.ann', JSON.stringify({ 'cooling-confirmation-01_1': true })) });
      ok(await quiet(p), 'A previous person’s dismissal stays quiet when another person first opens the updated shared device');
    });

    await step('presentation markers synchronise sibling tabs', async () => {
      p = await L.open(browser, '#/prep', { who: 'ann', extra: { [CURRENT]: first(L.NOW) }, wait: 1000 });
      const other = await p.context().newPage();
      try {
        await other.goto(L.BASE + '#/recipes');
        await L.waitFor(other, () => !!document.querySelector('.cooling-clock:not([hidden])'));
        await other.evaluate(() => LK_PREP.coolingOpen(document.querySelector('.cooling-chip')));
        await L.waitFor(other, () => !!document.querySelector('.cooling-menu'));
        const due = { ...first(), run: 'cooling-confirmation-02', rev: 3 };
        await server(p, CURRENT, due); await ping(p);
        await server(other, CURRENT, due);
        await other.keyboard.press('Escape');
        ok(await quiet(other), 'A queued sibling tab receives the device presentation marker and does not repeat the ping');
        ok(!await read(other, RECORDED), 'Cross-tab presentation suppression does not manufacture completion');
      } finally { await other.close(); }
    });

    await step('shared confirmation waits for acknowledgement and silences other devices', async () => {
      p = await L.open(browser, '#/prep', { who: 'ann', extra: { [CURRENT]: first() }, wait: 1000 });
      const other = await L.open(browser, '#/recipes', { who: 'bo', deviceUid: 'bo-phone', extra: { [CURRENT]: first() }, wait: 1000 });
      try {
        await ping(p); await ping(other);
        const timer = JSON.stringify(await read(p, CURRENT));
        await p.evaluate(() => { __fake.mode = 'hold'; });
        await confirm(p).click();
        await L.waitFor(p, path => __fake.writes.flat().some(x => x.path === path), RECORDED);
        ok(await confirm(p).isDisabled() && /Saving|Waiting/.test(await p.locator('.cooling-ping').textContent()), 'Confirmation answers immediately and remains pending while its write waits');
        await confirm(p).evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
        ok((await writes(p)).length === 1, 'A repeated tap cannot send the confirmation twice');
        await p.evaluate(() => __fake.ack()); await L.settle(p, 200);
        ok(await p.locator('.cooling-ping').isVisible(), 'A listener callback alone does not close a confirmation whose write acknowledgement still waits');
        await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); }); await closed(p);
        const record = await read(p, RECORDED);
        ok(record.run === RUN && record.firstBy === 'ann' && record.by === 'ann' && millis(record.firstAt) >= L.NOW && record.secondAt === 0 && record.secondBy === '', 'Accepted confirmation records its exact batch, stage, person and server time');
        ok(JSON.stringify(await read(p, CURRENT)) === timer, 'Recording in Operandio does not start or alter either timer');
        await other.evaluate(() => {
          window.__confirmationSoundStops = 0;
          const stop = LK_CHIME.stopCooling;
          LK_CHIME.stopCooling = function () { window.__confirmationSoundStops++; return stop(); };
        });
        await server(other, RECORDED, record); await closed(other);
        ok(await quiet(other) && await other.evaluate(() => __confirmationSoundStops > 0), 'The accepted shared confirmation closes another device’s open ping and cancels its remaining chimes');
        await p.reload(); await other.reload();
        ok(await quiet(p) && await quiet(other), 'Both devices stay quiet after a reload of the confirmed stage');
        const later = await L.open(browser, '#/orders', { who: 'sam', deviceUid: 'fresh-phone', extra: { [CURRENT]: first(), [RECORDED]: record }, wait: 1000 });
        try { ok(await quiet(later), 'A fresh device signing in after confirmation never shows the completed stage'); }
        finally { await later.context().close(); }
        ok(!other.errors.length, 'Other device has no browser errors ' + other.errors.join(' | '));
      } finally { await other.context().close(); }
    });

    await step('refused confirmation retains an explicit retry', async () => {
      p = await L.open(browser, '#/prep', { who: 'ann', extra: { [CURRENT]: first() }, wait: 1000 });
      await ping(p); await p.evaluate(() => { __fake.mode = 'deny'; }); await confirm(p).click();
      await L.waitFor(p, () => !!document.querySelector('.cooling-ping [role="alert"]'));
      ok(await p.locator('.cooling-ping').isVisible() && !await read(p, RECORDED) && await confirm(p).isEnabled(), 'A refused save keeps the named failure and retry in the ping');
      await p.evaluate(() => { __fake.mode = 'ok'; }); await confirm(p).click(); await closed(p);
      ok((await read(p, RECORDED)).firstBy === 'ann', 'An explicit retry records the confirmation and then closes it');
    });

    await step('view-only kitchen staff can record the check', async () => {
      const config = L.seed()[key('config', 'main')];
      config.people.push({ id: 'vic', name: 'Vic', role: 'view', active: true, add: false, tick: false, del: false });
      config.staffIds.push('vic');
      p = await L.open(browser, '#/prep', { who: 'vic', extra: {
        [CURRENT]: first(), [key('config', 'main')]: config,
        [key('pinset', 'vic')]: { at: 1 }, [key('staffpins', 'vic')]: { hash: L.sha('lk:vic:4444') },
        [key('drinks', 'vic')]: { kind: 'flat', size: 'reg', at: L.NOW - 86400000, by: 'vic' }
      }, wait: 1000 });
      await ping(p); await confirm(p).click(); await closed(p);
      ok((await read(p, RECORDED)).firstBy === 'vic' && !(await p.evaluate(() => __fake.refused)).some(x => /\/cooling\//.test(x.path)), 'The explicit cooling permission includes View only without granting ordinary Prep writes');
    });

    await step('unread confirmations cannot replay completed work', async () => {
      p = await L.open(browser, '#/prep', { who: 'ann', cold: '/cooling/recorded$', extra: { [CURRENT]: first(), [RECORDED]: checked(2, 'bo') }, wait: 1000 });
      await L.waitFor(p, () => LK_PREP.privateAccess() && !!document.querySelector('.cooling-clock:not([hidden])'));
      await L.settle(p, 500);
      ok(await p.locator('.cooling-ping').count() === 0, 'A cached or unread confirmation record cannot be treated as no one having completed the check');
      await p.evaluate(() => __fake.warm()); await L.settle(p, 500);
      ok(await quiet(p) && (await writes(p)).length === 0, 'A fresh confirmed record suppresses the stage without a write');
    });

    await step('stages stay independent and final lockout remains', async () => {
      const completed = second();
      p = await L.open(browser, '#/prep', { who: 'bo', clock: L.NOW + 3 * HOUR, extra: { [CURRENT]: completed, [RECORDED]: checked(2, 'ann') }, wait: 1000 });
      await ping(p);
      ok(/4 hours/.test(await p.locator('.cooling-ping h3').textContent()), 'A confirmed first stage does not suppress the due four-hour reminder');
      await p.getByRole('button', { name: 'Not yet', exact: true }).click(); await openClock(p);
      ok(await confirm(p, 4).isEnabled() && await p.locator('.cooling-new button').isDisabled(), 'The completed-day clock opens the outstanding check while new-batch Start stays locked');
      const before = await read(p, RECORDED); await confirm(p, 4).click();
      await L.waitFor(p, path => !!__fake.dump()[path]?.secondAt, RECORDED);
      await L.waitFor(p, () => !LK_PREP.unsent());
      const record = await read(p, RECORDED);
      ok(record.firstBy === 'ann' && millis(record.firstAt) === millis(before.firstAt) && record.secondBy === 'bo', 'The second person’s four-hour confirmation preserves the first person’s two-hour check');
      ok((await read(p, CURRENT)).rev === 2 && await p.locator('.cooling-new button').isDisabled(), 'Confirming the final check does not reset the timer or unlock another batch today');
    });

    await step('quiet outstanding check remains reachable during second timer', async () => {
      p = await L.open(browser, '#/prep', { who: 'ann', extra: { [CURRENT]: first() }, wait: 1000 });
      await ping(p); await p.locator('[data-cooling="start"][data-stage="4"]').click();
      await L.waitFor(p, path => !!__fake.dump()[path]?.secondAt, CURRENT);
      await p.getByRole('button', { name: 'Not yet', exact: true }).click(); await p.reload();
      ok(await quiet(p), 'Starting four hours and reloading does not replay the first reminder');
      await openClock(p);
      ok(await confirm(p).isEnabled() && !await read(p, RECORDED), 'While four hours runs, the clock still exposes the independent two-hour check');
    });
  } finally { if (p) await p.context().close(); await browser.close(); }
  L.report(R);
})().catch(error => { console.error(error); process.exit(1); });
