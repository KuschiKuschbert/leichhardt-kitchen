// The clock UI consumes acknowledged records. It never starts a private browser countdown or saves shared data.
const L = require('./lib');
const { R, ok } = L.results();
const firstAt = L.NOW, firstDue = firstAt + 2 * 3600000;
const restartAt = firstAt + 20 * 3600000; // 10:00 Queensland after this fixture's 20:10 completion.
const run = { restartAt, id: 'batch-a', firstAt, firstDue, secondAt: 0, secondDue: 0 };
async function fixture(browser, width, textSize) {
  const context = await browser.newContext({ viewport: { width: width || 390, height: 844 }, serviceWorkers: 'block' });
  const p = await context.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(String(e)));
  await p.route('**/__cooling-ui-fixture', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="css/app.css"><link rel="stylesheet" href="css/cooling.css"></head><body><div class="wtop"><div class="wtop-icons" id="fixture-icons"></div></div><main><button id="outside">Outside action</button></main><script src="js/cooling-ui.js"></script></body></html>' }));
  await p.goto(new URL('__cooling-ui-fixture', L.BASE).href);
  await p.evaluate(({ stamp, textSize }) => {
    document.documentElement.dataset.text = textSize || 'normal';
    window.__blocked = false; window.__calls = []; window.__acks = []; window.__confirms = []; window.__readRetries = 0; window.__names = {}; window.__closed = []; window.__opens = [];
    window.__model = { available: true, ready: true, stale: false, error: '', pending: 0, actionError: null, window: { open: true }, recorded: null, recordedReady: true, recordedStale: false, recordedError: '', confirmPending: 0, confirmError: null, run: null, now: stamp };
    window.__ui = LK_COOLING_UI.mount({
      esc: value => { const e = document.createElement('span'); e.textContent = String(value); return e.innerHTML; },
      clock: value => new Date(value + 10 * 3600000).toISOString().slice(11, 16),
      canOpen: () => !window.__blocked,
      personName: id => window.__names[id] || '',
      opened: (kind, fromBack) => { window.__opens.push(kind); window.__fromBack = fromBack; },
      closed: (kind, noBack, stage, runId) => window.__closed.push({ kind, noBack, stage, runId }),
      onStart: hours => { window.__calls.push(hours); window.__model.pending = hours; window.__ui.render(window.__model); },
      onAcknowledge: (stage, runId) => window.__acks.push({ stage, runId }),
      onConfirm: (stage, runId) => { window.__confirms.push({ stage, runId }); window.__model.confirmPending = stage; window.__ui.render(window.__model); return true; },
      onRetryRead: () => { window.__readRetries++; window.__model.error = ''; window.__model.ready = false; window.__ui.render(window.__model); },
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
async function contrast(p, selector) {
  return p.locator(selector).first().evaluate(el => {
    const rgba = value => {
      const channels = (value.match(/[\d.]+/g) || []).map(Number);
      return [channels[0] || 0, channels[1] || 0, channels[2] || 0, channels.length > 3 ? channels[3] : 1];
    };
    const mix = (front, back) => front.slice(0, 3).map((v, i) => v * front[3] + back[i] * (1 - front[3])).concat([1]);
    const chain = []; for (let node = el; node; node = node.parentElement) chain.unshift(node);
    let background = [255, 255, 255, 1], opacity = 1;
    for (const node of chain) { const style = getComputedStyle(node); opacity *= Number(style.opacity); background = mix(rgba(style.backgroundColor), background); }
    const foreground = rgba(getComputedStyle(el).color); foreground[3] *= opacity;
    const colour = mix(foreground, background);
    const lum = value => value.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    const a = lum(colour), b = lum(background);
    return { ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), colour: getComputedStyle(el).color };
  });
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
    const overnight = await fixture(b, 1280);
    try {
      await render(overnight, { run, now: firstDue }); await overnight.evaluate(() => __ui.ping(2));
      await render(overnight, { window: { open: false, nextOpenAt: firstAt + 20 * 3600000 }, run: null, rawRun: run, now: firstAt + 7 * 3600000 });
      ok(await overnight.locator('.cooling-clock').getAttribute('data-clock-state') === 'off_hours', 'Daily-window regression: 21:00 changes the visible clock to its overnight state');
      ok(await overnight.locator('.cooling-clock-status').isVisible() && await overnight.locator('button[data-cooling="clock"]').isHidden(), 'Daily-window regression: overnight clock is a non-interactive status');
      ok(await overnight.locator('.cooling-wrap').count() === 0, 'Daily-window regression: 21:00 closes an outstanding cooling ping');
      ok(await overnight.locator('.cooling-clock-status').getAttribute('aria-disabled') === 'true' && /10:00 Queensland/.test(await overnight.locator('.cooling-clock-status').getAttribute('aria-label')), 'Overnight status names its next opening without becoming an action');
      await overnight.locator('.cooling-clock-status').click();
      await overnight.locator('.cooling-clock-status').focus(); await overnight.keyboard.press('Enter'); await overnight.keyboard.press('Space');
      await overnight.locator('button[data-cooling="clock"]').evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      const opens = await overnight.evaluate(() => [__ui.open(), __ui.ping(2)]);
      ok(opens.every(value => value === false) && (await overnight.evaluate(() => __calls.length + __confirms.length)) === 0 && !await overnight.locator('.cooling-wrap').count(), 'Mouse, keyboard, synthetic click and public overlay calls cannot use the overnight clock');
      await render(overnight, { pending: 2, confirmPending: 4, error: 'Checking an unsent write' });
      ok(await overnight.locator('.cooling-clock').getAttribute('data-clock-state') === 'off_hours' && !await overnight.locator('.cooling-wrap').count(), 'Unresolved writes keep their model while the overnight UI remains closed');
      await render(overnight, { pending: 0, confirmPending: 0, error: '', window: { open: true }, now: firstAt + 20 * 3600000 });
      ok(await overnight.locator('.cooling-clock').getAttribute('data-clock-state') === 'idle' && !await overnight.locator('.cooling-wrap').count() && await overnight.evaluate(() => __calls.length === 0), 'At 10:00 yesterday’s raw record becomes an idle clock without a start or popup');
      await overnight.locator('button[data-cooling="clock"]').click();
      ok(await overnight.locator('.cooling-clock').getAttribute('data-clock-state') === 'armed', 'The reopened clock still needs its normal first manual tap');
      await render(overnight, { window: { open: false }, now: firstAt + 31 * 3600000 });
      await render(overnight, { window: { open: true }, now: firstAt + 44 * 3600000 });
      ok(await overnight.locator('.cooling-clock').getAttribute('data-clock-state') === 'idle', 'A daily cutoff clears an armed Start instead of carrying it into the next morning');
      await overnight.evaluate(() => __ui.open());
      await render(overnight, { window: { open: false }, now: firstAt + 55 * 3600000 });
      ok(!await overnight.locator('.cooling-wrap').count(), 'The daily cutoff also closes timer details');
      const nightContrast = await contrast(overnight, '.cooling-clock-status');
      ok(nightContrast.ratio >= 4.5, 'Overnight label retains readable contrast ' + nightContrast.ratio.toFixed(2) + ':1');
      ok(!overnight.errors.length, 'Daily-window UI has no browser errors');

    } finally { await overnight.context().close(); }
    const confirmation = await fixture(b);
    try {
      await render(confirmation, { run, now: firstDue }); await confirmation.evaluate(() => __ui.ping(2));
      ok(await confirmation.getByRole('button', { name: 'I’ve recorded this in Operandio', exact: true }).count() === 1, 'Regression: due ping offers a shared Operandio confirmation');
      ok(await confirmation.getByRole('button', { name: 'Not yet', exact: true }).count() === 1, 'Regression: due ping offers a quiet close without confirming');
      ok(await confirmation.locator('.cooling-clock').getAttribute('data-clock-state') === 'record', 'Regression: pending external entry remains an attention state on the existing clock');
      await L.settle(confirmation, 300); // Measure settled controls after the existing sheet entrance.
      for (const selector of ['.cooling-confirm', '.cooling-record-note', '.cooling-later', '.cooling-clock button']) {
        const measured = await contrast(confirmation, selector);
        ok(measured.ratio >= 4.5, selector + ': ordinary rendered text contrast ' + measured.ratio.toFixed(2) + ':1');
      }
      await confirmation.getByRole('button', { name: 'I’ve recorded this in Operandio', exact: true }).focus();
      ok(await confirmation.locator('.cooling-confirm').evaluate(el => { const css = getComputedStyle(el); return css.outlineStyle !== 'none' && parseFloat(css.outlineWidth) >= 2; }), 'Shared confirmation keeps a visible keyboard focus outline');
      await render(confirmation, { confirmError: { stage: 2, message: 'Couldn’t save the Operandio 2-hour confirmation. Try again.' } });
      const failureContrast = await contrast(confirmation, '.cooling-confirm-error .cooling-error');
      ok(failureContrast.ratio >= 4.5 && await confirmation.locator('.cooling-confirm-error .cooling-error').evaluate(el => (() => { const sample = document.createElement('span'); sample.style.color = 'var(--bad-ink)'; document.body.appendChild(sample); const expected = getComputedStyle(sample).color; sample.remove(); return getComputedStyle(el).color === expected; })()), 'Ping failure uses shared red with rendered text contrast ' + failureContrast.ratio.toFixed(2) + ':1');
      await render(confirmation, { confirmError: null });

      await confirmation.getByRole('button', { name: 'Not yet', exact: true }).click();
      ok((await confirmation.evaluate(() => __confirms)).length === 0 && !await confirmation.locator('.cooling-ping').count(), 'Not yet is cancellation and never records external completion');
      await confirmation.locator('[data-cooling="clock"]').click();
      ok(await confirmation.locator('.cooling-menu [data-confirm-stage="2"]').isVisible() && await confirmation.locator('.cooling-menu [data-stage="4"]').isEnabled(), 'The quiet clock exposes recording and a separate four-hour start');
      await confirmation.locator('[data-confirm-stage="2"]').evaluate(el => { window.__confirmButton = el; });
      await confirmation.locator('[data-confirm-stage="2"]').click();
      ok(await confirmation.locator('[data-confirm-stage="2"]').getAttribute('aria-busy') === 'true' && await confirmation.locator('[data-confirm-stage="2"]').textContent() === 'Saving…', 'Confirmation answers immediately with Saving and waits for the server');
      await confirmation.locator('[data-confirm-stage="2"]').evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      ok((await confirmation.evaluate(() => __confirms)).length === 1 && await confirmation.evaluate(() => __confirmButton === document.querySelector('[data-confirm-stage="2"]')), 'Repeated confirmation preserves its target and sends once');
      await render(confirmation, { recordedError: 'Couldn’t check the Operandio confirmation. Try again.' });
      await confirmation.keyboard.press('Escape');
      ok(await confirmation.locator('[data-cooling="clock"]').isEnabled() && await confirmation.locator('[data-cooling="clock"]').getAttribute('aria-busy') === 'true', 'An unresolved confirmation keeps an enabled busy details control after closing');
      await confirmation.locator('[data-cooling="clock"]').click();
      await confirmation.locator('.cooling-read button').click();
      ok((await confirmation.evaluate(() => __confirms)).length === 1 && await confirmation.evaluate(() => __readRetries === 1), 'Reopening an unresolved confirmation permits read recovery without resending the write');
      await render(confirmation, { ready: true, recordedError: '' });

      await render(confirmation, { confirmPending: 0, confirmError: { stage: 2, message: 'Couldn’t save the Operandio 2-hour confirmation. Try again.' } });
      ok(await confirmation.locator('.cooling-confirm-error [role="alert"]').isVisible() && await confirmation.getByRole('button', { name: 'Try again: recorded in Operandio', exact: true }).isEnabled(), 'Refused confirmation retains a named error and explicit retry');
      await render(confirmation, { now: firstDue + 60000 });
      ok(await confirmation.locator('.cooling-confirm-error [role="alert"]').isVisible(), 'Confirmation failure remains across clock paints');
      await confirmation.getByRole('button', { name: 'Try again: recorded in Operandio', exact: true }).click();
      await render(confirmation, { recorded: { id: run.id, firstAt: firstDue, firstBy: 'ann', secondAt: 0, secondBy: '', by: 'ann' } });
      ok(await confirmation.locator('[data-confirm-stage="2"]').getAttribute('aria-busy') === 'true' && await confirmation.locator('.cooling-record .lk-stamp').count() === 0, 'A record callback alone cannot confirm an unresolved write');
      await render(confirmation, { confirmPending: 0, confirmError: null });
      ok(await confirmation.locator('.cooling-record .lk-stamp').textContent() === 'Recorded 16:00' && await confirmation.locator('.cooling-clock').getAttribute('data-clock-state') === 'done1', 'Accepted confirmation leaves a recorded stamp and the separate next-stage action');
      await confirmation.evaluate(() => { __names.ann = '<img src=x onerror=alert(1)>' + 'Long recorder name '.repeat(10); });
      await render(confirmation, { now: firstDue + 120000 });
      ok(await confirmation.locator('.cooling-record img').count() === 0 && (await confirmation.locator('.cooling-record .lk-stamp').textContent()).includes('<img src=x'), 'Recorder names stay escaped text in the confirmation stamp');
      ok(await confirmation.locator('.cooling-record .lk-stamp').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Long recorder names wrap within the existing details width');
      await confirmation.evaluate(() => { __names = {}; });

      await confirmation.keyboard.press('Escape');
      const both = { ...run, secondAt: firstDue, secondDue: firstDue + 4 * 3600000 };
      await render(confirmation, { run: both, now: both.secondDue }); await confirmation.evaluate(() => __ui.ping(4));
      await render(confirmation, { recordedStale: true });
      ok(await confirmation.locator('[data-confirm-stage="4"]').isDisabled() && await confirmation.getByText('Not connected. Reconnect to check Operandio confirmations.', { exact: true }).isVisible(), 'Offline confirmation cannot imply a saved entry');
      await render(confirmation, { recordedStale: false, recorded: { id: run.id, firstAt: firstDue, firstBy: 'ann', secondAt: both.secondDue, secondBy: 'bo', by: 'bo' } });
      ok(!await confirmation.locator('.cooling-ping').count() && await confirmation.locator('.visually-hidden').textContent() === 'Operandio 4-hour check confirmed. The reminder is cleared for everyone.', 'Another screen’s accepted confirmation closes the matching ping and announces the result');
      await render(confirmation, { recorded: null }); await confirmation.evaluate(() => __ui.open());
      ok(await confirmation.locator('[data-confirm-stage="2"]').count() === 1 && await confirmation.locator('[data-confirm-stage="4"]').count() === 1, 'Both overdue stages remain independently confirmable');
      await render(confirmation, { recorded: { id: run.id, firstAt: 0, firstBy: '', secondAt: both.secondDue, secondBy: 'bo', by: 'bo' } });
      ok(await confirmation.locator('[data-confirm-stage="2"]').isEnabled() && await confirmation.locator('[data-confirm-stage="4"]').count() === 0, 'Recording stage two never silently records stage one');
      await render(confirmation, { recordedReady: false });
      ok(await confirmation.locator('[data-confirm-stage="2"]').isDisabled(), 'Unknown confirmation state cannot enable a confirmation');
      ok(!confirmation.errors.length, 'Shared confirmation UI has no browser errors');

    } finally { await confirmation.context().close(); }
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
      await p.getByRole('button', { name: 'Not yet', exact: true }).click();
      ok((await p.evaluate(() => window.__confirms)).length === 0 && (await p.evaluate(() => window.__calls)).length === 2, 'Not yet closes without confirming or starting the next stage');
      await p.evaluate(() => window.__ui.ping(2));
      await p.getByRole('button', { name: 'Start Operandio 4-hour timer', exact: true }).click();
      ok((await p.evaluate(() => window.__calls)).at(-1) === 4 && await p.locator('.cooling-next [aria-busy]').count() === 1, 'The second stage needs its own explicit start and waits for acknowledgement');
      const next = { ...run, secondAt: firstDue + 10 * 60000, secondDue: firstDue + 250 * 60000 };
      await render(p, { run: next, now: next.secondAt, pending: 0 });
      ok(await p.locator('.cooling-next button').count() === 0 && await p.getByText('The next 4 hours are running.', { exact: true }).isVisible(), 'Another worker starting stage two removes the stale first-ping Start button');
      await render(p, { run: { ...run, id: 'batch-b', firstAt: next.secondDue + 1000, firstDue: next.secondDue + 2 * 3600000 + 1000 }, now: next.secondDue + 2000 });
      ok(await p.getByText('Another Operandio batch has started.', { exact: true }).isVisible() && await p.getByText('Time reached at 16:00.', { exact: true }).isVisible(), 'An old ping retains its own deadline when a new batch arrives');
      await p.getByRole('button', { name: 'Not yet', exact: true }).click();
      ok((await p.evaluate(() => window.__confirms)).length === 0, 'Dismissing an old ping cannot confirm the new batch');
      await render(p, { run: next, now: next.secondDue }); await p.evaluate(() => window.__ui.ping(4));
      ok(await p.getByText('Operandio batch cooling time 4 hours is done.', { exact: true }).isVisible(), 'Second deadline uses the requested four-hour message');
      await render(p, { run: { ...run, id: 'tomorrow-batch', firstAt: restartAt, firstDue: restartAt + 2 * 3600000 }, now: restartAt });
      ok(!/available tomorrow/.test(await p.locator('.cooling-ping-time').textContent()), 'An old completion ping never borrows tomorrow’s new batch lockout message');
      await render(p, { run: next, now: next.secondDue });
      await p.evaluate(() => window.__fromBack());
      ok((await p.evaluate(() => window.__closed)).at(-1).noBack === true && await p.locator('.cooling-wrap').count() === 0, 'The injected Back callback closes without another history Back');
      await render(p, { recorded: { id: run.id, firstAt: firstDue, firstBy: 'ann', secondAt: next.secondDue, secondBy: 'bo', by: 'bo' } });
      await p.evaluate(() => window.__ui.open(document.querySelector('.cooling-chip')));
      ok(await p.locator('.cooling-new button').isDisabled() && await p.locator('.cooling-clock-status').isVisible(), 'Completed timer and new-batch action stay disabled for the rest of the day');
      ok(/disabled until tomorrow/.test(await p.locator('.cooling-clock-status').getAttribute('aria-label')), 'The read-only clock explains when it is available');
      const callsBefore = (await p.evaluate(() => window.__calls)).length;
      await p.locator('.cooling-new button').evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      ok((await p.evaluate(() => window.__calls)).length === callsBefore, 'A synthetic disabled-button tap cannot start another batch');
      await render(p, { now: restartAt - 1 });
      ok(await p.locator('.cooling-new button').isDisabled(), 'The final millisecond before 10:00 stays locked');
      await render(p, { now: restartAt });
      ok(await p.locator('.cooling-new button').isEnabled(), 'The open details menu becomes available at 10:00 without a read or reload');
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
          await render(p, { run, now: firstDue, recorded: { id: run.id, firstAt: firstDue, firstBy: 'ann', secondAt: 0, secondBy: '', by: 'ann' } }); await p.click('[data-cooling="clock"]');
        }
        const winner = hours === 2 ? { ...run, id: 'winning-first' } : { ...run, secondAt: firstDue + 1000, secondDue: firstDue + 4 * 3600000 + 1000 };
        const due = hours === 2 ? winner.firstDue : winner.secondDue;
        const refusal = { stage: hours, message: 'Your Operandio ' + hours + '-hour start was not saved. The shared timer changed. Check its current stage.' };
        await render(p, { run: winner, now: hours === 2 ? firstAt + 1000 : winner.secondAt + 1000, pending: 0, actionError: refusal, recorded: hours === 4 ? { id: winner.id, firstAt: winner.firstDue, firstBy: 'ann', secondAt: 0, secondBy: '', by: 'ann' } : null });
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
        await render(p, { now: due, recorded: { id: winner.id, firstAt: winner.firstDue, firstBy: 'ann', secondAt: hours === 4 ? winner.secondDue : 0, secondBy: hours === 4 ? 'bo' : '', by: 'ann' } });
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
