// The clock UI consumes acknowledged records. It never starts a private browser countdown or saves shared data.
const L = require('./lib');
const { R, ok } = L.results();
const firstAt = L.NOW, firstDue = firstAt + 2 * 3600000;
const restartAt = firstAt + 10 * 3600000; // 00:00 Queensland after this fixture's 20:10 completion.
const run = { restartAt, id: 'batch-a', firstAt, firstDue, secondAt: 0, secondDue: 0 };
async function fixture(browser, width, textSize) {
  const context = await browser.newContext({ viewport: { width: width || 390, height: 844 }, serviceWorkers: 'block' });
  const p = await context.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(String(e)));
  await p.route('**/__cooling-ui-fixture', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="css/app.css"><link rel="stylesheet" href="css/cooling.css"></head><body><div class="wtop"><div class="wtop-icons" id="fixture-icons"></div></div><main><button id="outside">Outside action</button></main><script src="js/cooling-ui.js"></script></body></html>' }));
  await p.goto(new URL('__cooling-ui-fixture', L.BASE).href);
  await p.evaluate(({ stamp, textSize }) => {
    document.documentElement.dataset.text = textSize || 'normal';
    window.__blocked = false; window.__calls = []; window.__acks = []; window.__closed = []; window.__opens = [];
    window.__model = { available: true, ready: true, stale: false, error: '', pending: 0, actionError: null, run: null, now: stamp };
    window.__ui = LK_COOLING_UI.mount({
      esc: value => { const e = document.createElement('span'); e.textContent = String(value); return e.innerHTML; },
      clock: value => new Date(value + 10 * 3600000).toISOString().slice(11, 16),
      canOpen: () => !window.__blocked,
      opened: (kind, fromBack) => { window.__opens.push(kind); window.__fromBack = fromBack; },
      closed: (kind, noBack, stage, runId) => window.__closed.push({ kind, noBack, stage, runId }),
      onStart: hours => { window.__calls.push(hours); window.__model.pending = hours; window.__ui.render(window.__model); },
      onAcknowledge: (stage, runId) => window.__acks.push({ stage, runId }),
      onRetryRead: () => { window.__model.error = ''; window.__model.ready = false; window.__ui.render(window.__model); },
      trapTab: (e, box) => {
        const f = [...box.querySelectorAll('button:not(:disabled)')].filter(el => !!el.getClientRects().length);
        const first = f[0], last = f.at(-1), out = !box.contains(document.activeElement);
        if (e.shiftKey && (document.activeElement === first || out)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || out)) { e.preventDefault(); first.focus(); }
      }
    });
    window.__ui.render(window.__model); document.querySelector('#fixture-icons').innerHTML = window.__ui.chipHTML(); if (window.__ui.paintChip) window.__ui.paintChip();
  }, { stamp: firstAt, textSize });
  return p;
}
async function render(p, patch) {
  await p.evaluate(patch => { Object.assign(window.__model, patch); window.__ui.render(window.__model); }, patch);
}
async function shape(p) {
  return p.locator('.cooling-menu').evaluate(el => {
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height, fits: rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
      clipped: [...el.querySelectorAll('.cooling-label,.cooling-start,.cooling-status')].some(x => x.scrollWidth > x.clientWidth + 1),
      targets: [...el.querySelectorAll('button')].every(x => x.getBoundingClientRect().width >= 43.5 && x.getBoundingClientRect().height >= 43.5) };
  });
}
(async () => {
  const b = await L.start();
  try {
    for (const width of [390, 768, 1280]) for (const textSize of ['normal', 'xlarge']) {
      const p = await fixture(b, width, textSize);
      try {
        await p.evaluate(() => window.__ui.open(document.querySelector('.cooling-chip')));
        for (const [label, record, stamp] of [
          ['ready', null, firstAt], ['first running', run, firstAt + 18 * 60000], ['second available', run, firstDue],
          ['second running', { ...run, secondAt: firstDue + 10 * 60000, secondDue: firstDue + 250 * 60000 }, firstDue + 20 * 60000],
          ['complete', { ...run, secondAt: firstDue + 10 * 60000, secondDue: firstDue + 250 * 60000 }, firstDue + 251 * 60000]
        ]) {
          await render(p, { run: record, now: stamp }); const s = await shape(p);
          ok(s.fits && !s.clipped && s.targets, width + ' ' + textSize + ' ' + label + ': fits without clipping and retains 44px controls');
          if (label === 'ready' && textSize === 'normal') ok(s.width === 248 && s.height <= 157, width + ': approved compact 248px ready menu');
        }
        ok(p.errors.length === 0, width + ' ' + textSize + ': no browser errors');
      } finally { await p.context().close(); }
    }
    const p = await fixture(b);
    try {
      await p.evaluate(() => { window.__blocked = true; }); await p.evaluate(() => window.__ui.open(document.querySelector('.cooling-chip')));
      ok(await p.locator('.cooling-wrap').count() === 0, 'Sheet coordination can refuse opening without creating another overlay');
      await p.evaluate(() => { window.__blocked = false; }); await p.evaluate(() => window.__ui.open(document.querySelector('.cooling-chip')));
      ok(await p.locator('[data-stage="2"]').isEnabled() && await p.locator('[data-stage="4"]').isDisabled(), 'First Start is available; 4 hours explains the blocked stage');
      await p.locator('[data-stage="2"]').evaluate(el => { window.__originalStart = el; });
      await p.click('[data-stage="2"]');
      ok(await p.locator('[data-stage="2"]').getAttribute('aria-busy') === 'true' && await p.locator('[data-stage="2"]').isDisabled(), 'Start immediately becomes a disabled, busy Starting button');
      await render(p, { now: firstAt + 1000 });
      ok(await p.evaluate(() => window.__originalStart === document.querySelector('[data-stage="2"]')) && await p.locator('.cooling-menu .lk-stamp').count() === 0, 'Pending renders preserve the original button and show no unconfirmed success');
      await p.evaluate(() => document.querySelector('[data-stage="2"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
      ok((await p.evaluate(() => window.__calls)).length === 1, 'A repeated pending click cannot submit another start');
      await render(p, { pending: 0, actionError: { stage: 2, message: 'Couldn’t start Operandio 2-hour timer. Try again.' } });
      ok(await p.getByRole('alert').isVisible() && await p.getByRole('button', { name: 'Try again: start Operandio 2-hour timer' }).isEnabled(), 'Failure names the timer and retains a retry action');
      await render(p, { now: firstAt + 120000 });
      ok(await p.getByRole('alert').isVisible(), 'The failure persists across clock renders');
      await p.getByRole('button', { name: 'Try again: start Operandio 2-hour timer' }).click();
      ok(await p.getByRole('alert').count() === 0, 'Retry clears the old failure in the same action frame');
      await render(p, { pending: 0, actionError: null, run, now: firstAt });
      ok(await p.locator('[data-timer="2"] .lk-stamp').textContent() === 'Started 14:00' && await p.locator('[data-timer="2"] button').count() === 0, 'Only the acknowledged record shows the green start stamp and read-only countdown');
      ok(await p.evaluate(() => document.activeElement.getAttribute('data-timer') === '2'), 'After confirmation keyboard focus stays on the resulting timer row');
      await p.keyboard.press('Tab');
      ok(await p.evaluate(() => !!document.activeElement.closest('.cooling-menu')), 'Tab from a newly read-only row stays in the menu');
      await render(p, { actionError: { stage: 2, message: 'Your Operandio 2-hour start was not saved. The shared timer changed. Check its current stage.' } });
      ok(await p.locator('[data-timer="2"] .cooling-error').isVisible() && await p.locator('[data-timer="2"] .lk-stamp').count() === 1 && await p.locator('.visually-hidden[role="status"]').textContent() === '', 'A refused start keeps its error beside the shared timer and announces no successful start');
      await render(p, { actionError: null });
      await p.keyboard.press('Escape');
      ok(await p.locator('.cooling-wrap').count() === 0 && await p.evaluate(() => !!document.activeElement.closest('.cooling-clock, .cooling-chip')), 'Escape closes and returns focus to the clock');
      await render(p, { now: firstDue }); await p.evaluate(() => window.__ui.ping(2));
      ok(await p.getByText('Operandio batch cooling time 2 hours is done.', { exact: true }).isVisible(), 'First deadline uses the requested shift-style message');
      await p.getByRole('button', { name: 'Got it', exact: true }).click();
      ok((await p.evaluate(() => window.__acks))[0].runId === run.id && (await p.evaluate(() => window.__calls)).length === 2, 'Got it acknowledges that run and does not start the next stage');
      await p.evaluate(() => window.__ui.ping(2));
      await p.getByRole('button', { name: 'Start Operandio 4-hour timer', exact: true }).click();
      ok((await p.evaluate(() => window.__calls)).at(-1) === 4 && await p.locator('.cooling-next [aria-busy]').count() === 1, 'The second stage needs its own explicit start and waits for acknowledgement');
      const next = { ...run, secondAt: firstDue + 10 * 60000, secondDue: firstDue + 250 * 60000 };
      await render(p, { run: next, now: next.secondAt, pending: 0 });
      ok(await p.locator('.cooling-next button').count() === 0 && await p.getByText('The next 4 hours are running.', { exact: true }).isVisible(), 'Another worker starting stage two removes the stale first-ping Start button');
      await render(p, { run: { ...run, id: 'batch-b', firstAt: next.secondDue + 1000, firstDue: next.secondDue + 2 * 3600000 + 1000 }, now: next.secondDue + 2000 });
      ok(await p.getByText('Another Operandio batch has started.', { exact: true }).isVisible() && await p.getByText('Time reached at 16:00.', { exact: true }).isVisible(), 'An old ping retains its own deadline when a new batch arrives');
      await p.getByRole('button', { name: 'Got it', exact: true }).click();
      ok((await p.evaluate(() => window.__acks)).at(-1).runId === run.id, 'Dismissing an old ping cannot acknowledge the new batch');
      await render(p, { run: next, now: next.secondDue }); await p.evaluate(() => window.__ui.ping(4));
      ok(await p.getByText('Operandio batch cooling time 4 hours is done.', { exact: true }).isVisible(), 'Second deadline uses the requested four-hour message');
      await render(p, { run: { ...run, id: 'tomorrow-batch', firstAt: restartAt, firstDue: restartAt + 2 * 3600000 }, now: restartAt });
      ok(!/available tomorrow/.test(await p.locator('.cooling-ping-time').textContent()), 'An old completion ping never borrows tomorrow’s new batch lockout message');
      await render(p, { run: next, now: next.secondDue });
      await p.evaluate(() => window.__fromBack());
      ok((await p.evaluate(() => window.__closed)).at(-1).noBack === true && await p.locator('.cooling-wrap').count() === 0, 'The injected Back callback closes without another history Back');
      await p.evaluate(() => window.__ui.open(document.querySelector('.cooling-chip')));
      ok(await p.locator('.cooling-new button').isDisabled() && await p.locator('.cooling-clock-status').isVisible(), 'Completed timer and new-batch action stay disabled for the rest of the day');
      ok(/disabled until tomorrow/.test(await p.locator('.cooling-clock-status').getAttribute('aria-label')), 'The read-only clock explains when it is available');
      const callsBefore = (await p.evaluate(() => window.__calls)).length;
      await p.locator('.cooling-new button').evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      ok((await p.evaluate(() => window.__calls)).length === callsBefore, 'A synthetic disabled-button tap cannot start another batch');
      await render(p, { now: restartAt - 1 });
      ok(await p.locator('.cooling-new button').isDisabled(), 'The final millisecond before midnight stays locked');
      await render(p, { now: restartAt });
      ok(await p.locator('.cooling-new button').isEnabled(), 'The open details menu becomes available at midnight without a read or reload');
      await p.locator('.cooling-new button').click();
      ok((await p.evaluate(() => window.__calls)).at(-1) === 2 && await p.locator('.cooling-new [aria-busy]').count() === 1, 'Start another batch explicitly requests a new two-hour stage while preserving the old completed record');
      await p.keyboard.press('Escape');
      await render(p, { run: null, pending: 0, stale: true }); await p.evaluate(() => window.__ui.open(document.querySelector('.cooling-chip')));
      ok(await p.locator('[data-stage="2"]').isDisabled() && await p.getByText('Not connected. The last timer is shown. Reconnect before starting.', { exact: true }).isVisible(), 'A stale read never offers a shared start');
      await render(p, { stale: false, error: '<img src=x onerror=alert(1)>' });
      ok(await p.locator('.cooling-read img').count() === 0 && await p.getByText('<img src=x onerror=alert(1)>', { exact: true }).isVisible(), 'Read failure words are text, not HTML');
      await p.locator('.cooling-read button').click();
      ok(await p.getByText('Checking Operandio timers…', { exact: true }).isVisible(), 'Read retry answers immediately where the error was');
      await render(p, { available: false });
      ok(await p.locator('.cooling-wrap').count() === 0 && await p.locator('.cooling-chip').isHidden(), 'Losing access clears the private UI and hides the clock');
      await p.evaluate(() => window.__ui.dispose());
      ok(p.errors.length === 0, 'Actions and recovery: no browser errors');
    } finally { await p.context().close(); }
    // A refused local attempt is retained by the controller even after another device wins the start.
    // Reading that refusal must not hide the winning countdown or block the following stage forever.
    for (const hours of [2, 4]) {
      const p = await fixture(b, 1280);
      try {
        if (hours === 2) {
          await p.click('[data-cooling="clock"]'); await p.click('[data-cooling="clock"]');
        } else {
          await render(p, { run, now: firstDue }); await p.click('[data-cooling="clock"]');
        }
        const winner = hours === 2 ? { ...run, id: 'winning-first' } : { ...run, secondAt: firstDue + 1000, secondDue: firstDue + 4 * 3600000 + 1000 };
        const due = hours === 2 ? winner.firstDue : winner.secondDue;
        const refusal = { stage: hours, message: 'Your Operandio ' + hours + '-hour start was not saved. The shared timer changed. Check its current stage.' };
        await render(p, { run: winner, now: hours === 2 ? firstAt + 1000 : winner.secondAt + 1000, pending: 0, actionError: refusal });
        ok(await p.locator('.cooling-menu .cooling-error').isVisible(), hours + 'h competing start immediately shows the named refusal beside the winning shared timer');
        await p.keyboard.press('Escape');
        ok(await p.locator('.cooling-clock').getAttribute('data-clock-state') === (hours === 2 ? 'first' : 'second') && await p.locator('.cooling-clock-status').isVisible(), hours + 'h read refusal no longer masks the winning canonical countdown');
        ok(await p.evaluate(() => !!window.__model.actionError), hours + 'h header recovery does not erase the controller refusal');
        await p.evaluate(() => window.__ui.open(document.querySelector('.cooling-clock-status')));
        ok(await p.locator('.cooling-menu .cooling-error').textContent() === refusal.message, hours + 'h refusal remains available in timer details after the clock recovers');
        await p.keyboard.press('Escape');
        await render(p, { actionError: { ...refusal } });
        ok(await p.locator('.cooling-clock').getAttribute('data-clock-state') === 'error', hours + 'h a fresh refusal with the same words is not silently treated as already read');
        await p.click('[data-cooling="clock"]'); await p.keyboard.press('Escape');
        await render(p, { now: due });
        ok(await p.locator('.cooling-clock').getAttribute('data-clock-state') === (hours === 2 ? 'done1' : 'done2'), hours + 'h the retained read refusal does not mask the completed shared stage');
        if (hours === 4) {
          await render(p, { now: restartAt });
        }
        await p.click('[data-cooling="clock"]');
        if (hours === 4) {
          await render(p, { now: restartAt + 1000 });
          ok(await p.locator('.cooling-clock').getAttribute('data-clock-state') === 'armed' && (await p.evaluate(() => window.__calls)).length === 1, 'A retained read refusal does not cancel new-batch arming on the next clock render');
          if (await p.locator('.cooling-wrap').count()) await p.keyboard.press('Escape');
          await p.click('[data-cooling="clock"]');
        }
        const calls = await p.evaluate(() => window.__calls);
        ok(calls.length === 2 && calls.at(-1) === (hours === 2 ? 4 : 2), hours + 'h only the explicit next action starts the following stage or new batch once');
        ok(!p.errors.length, hours + 'h competing start recovery has no browser errors');
      } finally { await p.context().close(); }
    }
    const failed = await fixture(b);
    try {
      await failed.click('[data-cooling="clock"]'); await failed.click('[data-cooling="clock"]');
      await render(failed, { pending: 0, run: null, actionError: { stage: 2, message: 'Couldn’t start Operandio 2-hour timer. Try again.' } });
      await failed.keyboard.press('Escape');
      ok(await failed.locator('.cooling-clock').getAttribute('data-clock-state') === 'error', 'A read refusal without a winning canonical run stays an error, not a ready or running timer');
      await failed.click('[data-cooling="clock"]');
      ok(await failed.getByRole('button', { name: 'Try again: start Operandio 2-hour timer' }).isEnabled(), 'A refusal without a winning run keeps its explicit retry after reopening details');
    } finally { await failed.context().close(); }
  } finally { await b.close(); }
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
