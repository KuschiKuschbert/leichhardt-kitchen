// The clock is one device-local timer. It must survive leaving its sheet and reloading, keep elapsed time when a
// browser delays callbacks, and finish without putting another sheet over service work. Firebase is the stand-in.
const L = require('./lib');
const { R, ok } = L.results();
const button = action => '[data-kt="' + action + '"]';
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('lk.timer') || 'null'));
const hasSheet = p => p.locator('.kt-wrap').count();
const status = p => L.txt(p, '#kt-status');
const secondsShown = async p => {
  const parts = String(await L.txt(p, '#kt-countdown')).split(':').map(Number);
  return parts.reduce((n, x) => n * 60 + x, 0);
};
const fill = async (p, minutes, seconds) => {
  await p.fill('#kt-minutes', String(minutes));
  await p.fill('#kt-seconds', String(seconds));
};
const open = async p => {
  await L.waitFor(p, () => window.LK_PREP && window.LK_PREP.privateAccess());
  await p.click(button('open'));
  await L.waitFor(p, () => !!document.querySelector('.kt-wrap [role="dialog"]'));
  await L.settle(p, 250);
};
const close = async p => {
  await p.click('.kt-wrap button' + button('close'));
  await L.waitFor(p, () => !document.querySelector('.kt-wrap'));
  await L.settle(p, 250);
};
const stopClock = async p => {
  for (let i = 1; ; i++) {
    try { return await p.clock.pauseAt(await p.evaluate(() => Date.now()) + 300 * i); }
    catch (e) { if (i > 4) throw e; }
  }
};
const noErrors = (p, name) => ok(p.errors.length === 0, name + ': no page errors ' + p.errors.join(' | '));

(async () => {
  const b = await L.start();
  try {
    let p = await L.open(b, '#/prep', { who: 'sam' });
    await L.waitFor(p, () => !!document.querySelector('.nb-row'));
    await open(p);
    ok(await p.locator('.kt-wrap').evaluate(e => e.parentElement === document.body), 'sheet: attached to the body, outside page redraws');
    ok(/keep.*(app|book).*open/i.test(await L.txt(p, '.kt-wrap')), 'sheet: explains the open-app alarm limit before Start');
    ok(await p.locator('#kt-minutes').getAttribute('inputmode') === 'numeric', 'sheet: minutes opens the numeric keyboard');

    // Invalid values must never become a running timer, including zero and fractional durations.
    for (const [minutes, seconds, label] of [[0, 0, 'zero'], [-1, 0, 'negative'], [1.5, 0, 'fractional'], [1000, 0, 'too many minutes'], [0, 60, 'too many seconds']]) {
      await fill(p, minutes, seconds);
      await L.tap(p, button('start'));
      ok(!(await saved(p)), 'validation: ' + label + ' is not started');
      ok(await p.locator('#kt-minutes').count() === 1, 'validation: ' + label + ' keeps the editable duration');
    }

    await fill(p, 1, 20);
    await stopClock(p);
    await p.evaluate(() => { window.__fake.reads = []; window.__fake.writes = []; });
    await p.press('#kt-seconds', 'Enter');
    ok(await status(p) === 'Timer running', 'start: confirms Timer running in the sheet');
    ok(await p.evaluate(() => document.activeElement && document.activeElement.matches('.kt-wrap button')), 'Enter: starts the timer and keeps keyboard focus on a sheet control');
    ok(await secondsShown(p) === 80, 'start: the chosen 1 minute 20 seconds is shown');
    const started = await saved(p);
    ok(started && started.status === 'running' && started.duration === 80, 'start: saves the requested duration on this device');
    await p.clock.runFor(11000);
    const elapsed = await secondsShown(p);
    ok(elapsed >= 68 && elapsed <= 69, 'countdown: 11 elapsed seconds leave about 69 seconds (' + elapsed + ')');
    await p.evaluate(() => {
      const t = window.LK_TIME, getTime = t.now, getGap = t.gap;
      window.__timerClockRestore = () => { t.now = getTime; t.gap = getGap; };
      t.now = () => getTime() + 3600000; t.gap = () => getGap() + 3600000;
      window.dispatchEvent(new Event('lk-clock'));
    });
    ok(await secondsShown(p) === elapsed, 'clock correction: a new kitchen clock offset does not shorten the running duration');
    await p.evaluate(() => { window.__timerClockRestore(); window.dispatchEvent(new Event('lk-clock')); });
    await L.tap(p, button('pause'));
    const paused = await saved(p), pausedText = await L.txt(p, '#kt-countdown');
    ok(paused && paused.status === 'paused' && await status(p) === 'Timer paused', 'pause: keeps the time left and confirms Timer paused');
    await p.clock.runFor(9000);
    ok(await L.txt(p, '#kt-countdown') === pausedText, 'pause: time left stays still');
    ok(await p.evaluate(() => window.__fake.reads.length === 0 && window.__fake.writes.length === 0), 'timer: start, countdown and pause add no Firestore reads or writes');
    await p.clock.resume();
    await close(p);
    await p.reload();
    await L.waitFor(p, () => !!document.querySelector('[data-kt="open"]') && window.LK_PREP.privateAccess());
    await open(p);
    ok(await status(p) === 'Timer paused' && await L.txt(p, '#kt-countdown') === pausedText, 'reload: paused duration is restored without resuming');
    await p.click(button('resume'));
    ok(await status(p) === 'Timer running', 'resume: continues the saved timer');
    await close(p);
    const deadline = (await saved(p)).end;
    await p.evaluate(() => { location.hash = '#/recipes'; });
    await L.waitFor(p, () => location.hash === '#/recipes' && !!document.querySelector('[data-kt="open"]'));
    ok((await saved(p)).end === deadline, 'navigation: changing page does not reset the deadline');
    await open(p);
    ok(await status(p) === 'Timer running', 'navigation: the same running timer opens from Recipes');
    await p.click(button('cancel'));
    ok(!(await saved(p)) && await p.locator('#kt-minutes').count() === 1, 'cancel: clears the timer and returns to setting a duration');
    await close(p);

    // Native Back, Escape and the backdrop close only the sheet. Keyboard focus stays inside while it is open.
    const route = new URL(p.url()).hash;
    await open(p);
    await p.evaluate(() => history.back());
    await L.waitFor(p, () => !document.querySelector('.kt-wrap'));
    ok(new URL(p.url()).hash === route, 'Back: closes the timer without leaving the page');
    await open(p);
    await p.keyboard.press('Escape');
    await L.waitFor(p, () => !document.querySelector('.kt-wrap'));
    await L.settle(p, 250);
    ok(await p.locator(button('open')).evaluate(e => e === document.activeElement), 'Escape: returns focus to the clock');
    await open(p);
    await p.locator('.kt-wrap .nt-bg').click({ position: { x: 5, y: 5 } });
    await L.waitFor(p, () => !document.querySelector('.kt-wrap'));
    await L.settle(p, 250);
    await open(p);
    await p.evaluate(() => {
      const f = [...document.querySelectorAll('.kt-wrap button:not([disabled]), .kt-wrap input:not([disabled])')].filter(e => e.offsetParent !== null);
      f[f.length - 1].focus();
    });
    await p.keyboard.press('Tab');
    ok(await p.evaluate(() => {
      const f = [...document.querySelectorAll('.kt-wrap button:not([disabled]), .kt-wrap input:not([disabled])')].filter(e => e.offsetParent !== null);
      return document.activeElement === f[0];
    }), 'keyboard: Tab from the final control wraps to the first');
    await p.keyboard.press('Shift+Tab');
    ok(await p.evaluate(() => {
      const f = [...document.querySelectorAll('.kt-wrap button:not([disabled]), .kt-wrap input:not([disabled])')].filter(e => e.offsetParent !== null);
      return document.activeElement === f[f.length - 1];
    }), 'keyboard: Shift+Tab wraps back to the final control');

    // A suspended tab has no useful ticks. Returning must derive expiry from the stored deadline, just once.
    await fill(p, 0, 20);
    await p.click(button('start'));
    await close(p);
    await stopClock(p);
    await p.evaluate(() => {
      window.__timerSounds = [];
      window.LK_CHIME.play = id => { window.__timerSounds.push(id); return true; };
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await p.clock.setSystemTime(await p.evaluate(() => Date.now()) + 35000);
    await p.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await p.clock.runFor(1000);
    const finished = await saved(p);
    ok(finished && finished.status === 'done', 'background: returning after the deadline finishes the timer');
    ok(!(await hasSheet(p)), 'finished: does not open a sheet over service work');
    ok(/finished/i.test(await p.locator(button('open')).getAttribute('aria-label')), 'finished: the clock describes completion without relying on colour');
    await p.clock.runFor(3000);
    ok(await p.evaluate(() => window.__timerSounds.length === 1), 'finished: asks for one sound, not one per tick');
    await p.clock.resume();
    await p.reload();
    await L.waitFor(p, () => /finished/i.test(document.querySelector('[data-kt="open"]')?.getAttribute('aria-label') || ''));
    await open(p);
    ok(await status(p) === 'Timer finished' && await secondsShown(p) === 0, 'reload: finished state stays until acknowledged');
    await p.click(button('again'));
    ok((await saved(p)).duration === 20 && await status(p) === 'Timer running', 'again: starts the same duration, not the time remaining');

    // A second tab on the same device shares this timer. Its cancellation updates an already open timer sheet.
    const other = await p.context().newPage();
    await other.goto(p.url(), { waitUntil: 'load' });
    await open(other);
    ok(await status(other) === 'Timer running', 'second tab: opens the existing timer');
    await other.click(button('cancel'));
    await L.waitFor(p, () => !!document.querySelector('#kt-minutes'));
    ok(!(await saved(p)) && await p.locator('#kt-minutes').count() === 1, 'second tab: cancellation clears the timer in the first tab too');
    await other.close();
    await close(p);
    noErrors(p, 'timer journey');
    await p.context().close();

    // Corrupt browser storage must not block the whole book or inject a duration into the sheet.
    for (const value of ['{broken', JSON.stringify({ v: 1, status: 'running', duration: -1, end: '<img src=x onerror=alert(1)>', gap: 0 })]) {
      p = await L.open(b, '#/recipes', { who: 'ann' });
      await p.evaluate(v => localStorage.setItem('lk.timer', v), value);
      await p.reload();
      await L.waitFor(p, () => !!document.querySelector('[data-kt="open"]'));
      await open(p);
      ok(await p.locator('#kt-minutes').count() === 1 && await p.locator('.kt-wrap img').count() === 0, 'storage: invalid saved timer falls back to the duration form');
      noErrors(p, 'invalid saved timer');
      await p.context().close();
    }

    p = await L.open(b, '#/recipes', { who: 'ann' });
    await p.evaluate(() => {
      const set = Storage.prototype.setItem, remove = Storage.prototype.removeItem;
      Storage.prototype.setItem = function (key, value) { if (key === 'lk.timer') throw new Error('Storage unavailable'); return set.call(this, key, value); };
      Storage.prototype.removeItem = function (key) { if (key === 'lk.timer') throw new Error('Storage unavailable'); return remove.call(this, key); };
    });
    await open(p);
    await fill(p, 1, 0);
    await p.click(button('start'));
    ok(await status(p) === 'Timer running', 'storage unavailable: the timer still runs in this visit');
    ok(/could not save the timer.*reloading may lose/i.test(await L.txt(p, '.kt-wrap')), 'storage unavailable: explains that reloading may lose the timer');
    await p.click(button('cancel'));
    ok(await p.locator('#kt-minutes').count() === 1, 'storage unavailable: cancellation still works');
    noErrors(p, 'storage unavailable');
    await p.context().close();

    // Compare with and without the icon on the same rendered page; fonts and machine widths cancel out.
    for (const [width, height] of [[390, 844], [768, 844], [1280, 844], [390, 480]]) {
      p = await L.open(b, '#/prep', { who: 'sam', width, height });
      await L.waitFor(p, () => !!document.querySelector('.nb-row'));
      const dimensions = await p.evaluate(() => {
        const clock = document.querySelector('[data-kt="open"]'), header = document.querySelector('.wtop'), row = document.querySelector('.nb-row');
        const measure = () => [header.getBoundingClientRect().height, row.getBoundingClientRect().top];
        const withClock = measure(), target = clock.getBoundingClientRect();
        clock.style.display = 'none'; const withoutClock = measure(); clock.style.display = '';
        return { withClock, withoutClock, width: target.width, height: target.height };
      });
      ok(dimensions.width >= 44 && dimensions.height >= 44, width + ' px: clock retains a 44 px touch target');
      ok(dimensions.withClock.every((n, i) => Math.abs(n - dimensions.withoutClock[i]) < 1), width + ' px: clock adds no header height or lost list space (' + JSON.stringify(dimensions) + ')');
      await open(p);
      const bounds = await p.locator('.kt-wrap [role="dialog"]').boundingBox();
      ok(bounds && bounds.x >= -1 && bounds.y >= -1 && bounds.x + bounds.width <= width + 1 && bounds.y + bounds.height <= height + 1, width + ' x ' + height + ' px: timer sheet fits the screen (' + JSON.stringify(bounds) + ')');
      const action = await p.locator(button('start')).boundingBox();
      ok(action && action.y >= 0 && action.y + action.height <= height + 1, width + ' x ' + height + ' px: Start stays within reach');
      ok(!(await L.overflow(p)), width + ' px: no sideways scroll');
      noErrors(p, width + ' px');
      await p.context().close();
    }
  } finally { await b.close(); }
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
