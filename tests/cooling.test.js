// Shared in-app cooling through the real session, W(), sheets and fake Firestore boundary.
// A second browser context receives the same saved record explicitly, like another device's Firestore listener.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const CURRENT = key('cooling', 'current'), HOUR = 3600000;
const stamp = value => ({ __fakeTimestamp: value });
const millis = value => value && (value.__fakeTimestamp != null ? value.__fakeTimestamp : value.seconds != null ? value.seconds * 1000 + (value.nanoseconds || 0) / 1000000 : NaN);
const saved = p => p.evaluate(path => __fake.dump()[path], CURRENT);
const writes = p => p.evaluate(path => __fake.writes.flat().filter(x => x.path === path), CURRENT);
function firstRecord(at, by = 'ann') {
  return { v: 1, run: 'cooling-fixture-run-01', rev: 1, firstAt: stamp(at), firstBy: by, secondAt: 0, secondBy: '', by };
}
async function clockOpen(p) {
  await L.waitFor(p, () => !!document.querySelector('.cooling-clock:not([hidden])'), null, 10000);
  await p.evaluate(() => LK_PREP.coolingOpen(document.querySelector('.cooling-chip')));
  await L.waitFor(p, () => !!document.querySelector('.cooling-menu'), null, 8000);
}
async function ready(p, hours = 2) {
  await L.waitFor(p, stage => { const el = document.querySelector('[data-stage="' + stage + '"]'); return el && !el.disabled; }, hours);
}
async function server(p, data) { await p.evaluate(({ path, data }) => __fake.write(path, data), { path: CURRENT, data }); }
async function advanceTo(p, at) {
  const before = await p.evaluate(() => LK_TIME.now());
  await p.clock.fastForward(Math.max(0, Math.ceil(at - before)));
  await p.evaluate(() => window.dispatchEvent(new Event('lk-clock')));
}
const roleConfig = L.seed()[key('config', 'main')];
roleConfig.people.push({ id: 'vic', name: 'Vic', role: 'view', active: true, add: false, tick: false, del: false },
  { id: 'fay', name: 'Fay', role: 'fnc', active: true, add: false, tick: false, del: false, fn: true });
roleConfig.staffIds.push('vic', 'fay'); roleConfig.fnOnlyIds = ['fay']; roleConfig.fnIds = ['fay'];
const ROLES = { [key('config', 'main')]: roleConfig };
for (const [id, pin] of [['vic', '4444'], ['fay', '5151']]) {
  ROLES[key('pinset', id)] = { at: 1 }; ROLES[key('staffpins', id)] = { hash: L.sha('lk:' + id + ':' + pin) };
  ROLES[key('drinks', id)] = { kind: 'flat', size: 'reg', at: L.NOW - 86400000, by: id };
}
(async () => {
  const b = await L.start(); let p;
  async function step(label, fn) {
    try { await fn(); }
    catch (e) { ok(false, label + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; } }
  }
  try {
    for (const width of [390, 768, 1280]) await step('staff clock ' + width, async () => {
      p = await L.open(b, '#/prep', { who: 'ann', width, wait: 1200 });
      const before = await p.locator('.wtop').evaluate(el => el.getBoundingClientRect().height);
      await clockOpen(p); await ready(p);
      const box = await p.locator('.cooling-menu').evaluate(el => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height, fits: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; });
      ok(box.width === 248 && box.height <= 157 && box.fits && !await L.overflow(p), width + ': approved compact dropdown fits the real app');
      ok(await p.locator('[data-stage="4"]').isDisabled(), width + ': a confirmed empty timer offers 2 hours and keeps 4 hours unavailable');
      await p.keyboard.press('Escape');
      ok(await p.locator('.wtop').evaluate(el => el.getBoundingClientRect().height) === before && await p.evaluate(() => !!document.activeElement.closest('.cooling-clock')), width + ': closing keeps header height and returns focus to the clock');
      const read = await p.evaluate(() => __fake.reads.concat(__fake.bill.map(x => x.path)).filter(path => /\/cooling\//.test(path)));
      ok(read.length > 0 && read.every(path => path === CURRENT) && !(await p.evaluate(() => __fake.refused)).some(x => /\/cooling/.test(x.path)), width + ': cooling reads only the authorised canonical document');
    });
    await step('shared two-stage sequence', async () => {
      p = await L.open(b, '#/prep', { who: 'ann', deviceMode: 'personal', wait: 1200 }); await clockOpen(p); await ready(p);
      await p.evaluate(() => { __fake.mode = 'hold'; }); await p.locator('[data-stage="2"]').click();
      await L.waitFor(p, path => __fake.writes.flat().some(x => x.path === path), CURRENT);
      let record = await saved(p), attempts = await writes(p);
      ok(attempts.length === 1 && attempts[0].kind === 'set' && record.v === 1 && record.rev === 1 && /^[A-Za-z0-9_-]{16,80}$/.test(record.run) && record.firstBy === 'ann' && record.by === 'ann' && Number.isFinite(millis(record.firstAt)) && record.secondAt === 0,
        'The first click writes one timestamped shared two-hour start through W');
      ok(!Object.hasOwn(record, 'firstDue') && !Object.hasOwn(record, 'secondDue') && !Object.hasOwn(record, 'schedule'), 'Fixed deadlines are derived from accepted start timestamps, with no job or stored countdown');
      ok(await p.locator('[data-stage="2"]').getAttribute('aria-busy') === 'true' && await p.locator('.cooling-menu .lk-stamp').count() === 0, 'A locally pending write stays Starting and never shows confirmed success');
      await p.locator('[data-stage="2"]').evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      ok((await writes(p)).length === 1, 'A duplicate click cannot write another start');
      await p.evaluate(() => __fake.ack()); await L.settle(p, 150);
      ok(await p.locator('[data-stage="2"]').getAttribute('aria-busy') === 'true' && await p.locator('.cooling-menu .lk-stamp').count() === 0, 'A listener acknowledgement alone cannot confirm a write whose promise still waits');
      await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); });
      await L.waitFor(p, () => !!document.querySelector('[data-timer="2"] .lk-stamp'));
      record = await saved(p); const firstAt = millis(record.firstAt), firstDue = firstAt + 2 * HOUR;
      ok(await p.locator('[data-timer="2"] button').count() === 0 && await p.locator('[data-stage="4"]').isDisabled(), 'The accepted first timer is read-only and never starts the next stage automatically');
      await p.keyboard.press('Escape');
      const other = await L.open(b, '#/prep', { who: 'bo', deviceUid: 'bo-phone', clock: firstAt + 1000, extra: { [CURRENT]: record }, wait: 1200 });
      try {
        await clockOpen(other);
        await L.waitFor(other, () => !!document.querySelector('[data-timer="2"] .lk-stamp'));
        ok(await other.locator('[data-stage="4"]').isDisabled(), 'A second signed-in device sees the same running first timer');
        await other.keyboard.press('Escape');
        await advanceTo(p, firstDue + 1000); await advanceTo(other, firstDue + 1000);
        await L.waitFor(p, () => !!document.querySelector('.cooling-ping')); await L.waitFor(other, () => !!document.querySelector('.cooling-ping'));
        ok(await p.getByText('Operandio batch cooling time 2 hours is done.', { exact: true }).isVisible() && await other.getByText('Operandio batch cooling time 2 hours is done.', { exact: true }).isVisible(), 'Both open, signed-in devices receive the exact two-hour screen ping');
        const beforeGot = (await writes(p)).length;
        await p.getByRole('button', { name: 'Got it', exact: true }).click();
        const seen = await p.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), 'lk.cooling.seen.' + L.PIN + '.anon-test.ann');
        ok(seen[record.run + '_1'] === true && (await writes(p)).length === beforeGot && await other.locator('.cooling-ping').isVisible(), 'Ann’s Got it is personal, leaves Bo’s ping open and never starts four hours');
        await other.getByRole('button', { name: 'Got it', exact: true }).click();
        await clockOpen(p); await ready(p, 4);
        await p.locator('[data-stage="4"]').click(); await L.waitFor(p, () => !!document.querySelector('[data-timer="4"] .lk-stamp'));
        const continued = await saved(p), secondAt = millis(continued.secondAt), secondDue = secondAt + 4 * HOUR;
        attempts = await writes(p);
        ok(attempts.length === 2 && attempts[1].kind === 'update' && continued.run === record.run && continued.rev === 2 && millis(continued.firstAt) === firstAt && secondAt >= firstDue && continued.secondBy === 'ann', 'A separate click updates the same batch to a further four hours, preserving its first start');
        await server(other, continued);
        await clockOpen(other); await L.waitFor(other, () => !!document.querySelector('[data-timer="4"] .lk-stamp'));
        ok(await other.locator('[data-timer="4"] button').count() === 0, 'The other device follows the accepted manual second start');
        await other.keyboard.press('Escape'); await p.keyboard.press('Escape');
        await advanceTo(p, secondAt + HOUR / 2); await clockOpen(p);
        const remaining = await p.locator('[data-timer="4"] .cooling-detail').textContent(); await p.keyboard.press('Escape');
        await p.reload(); await clockOpen(p); await L.waitFor(p, () => !!document.querySelector('[data-timer="4"] .lk-stamp'));
        const afterReload = await saved(p);
        ok(await p.locator('[data-timer="4"] .cooling-detail').textContent() === remaining && /^3 h/.test(remaining) && millis(afterReload.secondAt) === secondAt && afterReload.rev === 2, 'Refreshing retains the shared deadline and remaining time instead of restarting four hours');
        await p.keyboard.press('Escape');
        await advanceTo(p, secondDue + 1000); await advanceTo(other, secondDue + 1000);
        await L.waitFor(p, () => !!document.querySelector('.cooling-ping')); await L.waitFor(other, () => !!document.querySelector('.cooling-ping'));
        ok(await p.getByText('Operandio batch cooling time 4 hours is done.', { exact: true }).isVisible() && await other.getByText('Operandio batch cooling time 4 hours is done.', { exact: true }).isVisible(), 'Both open devices receive the exact four-hour screen ping');
        ok((await writes(p)).length === 0 && (await writes(other)).length === 0 && (await saved(p)).rev === 2, 'Refresh and deadline ticks never create timer writes');
        for (const screen of [p, other]) {
          await screen.getByRole('button', { name: 'Got it', exact: true }).click();
          await clockOpen(screen);
          ok(await screen.locator('.cooling-new button').isDisabled(), 'Each signed-in device refuses another batch on the completion day');
          await screen.keyboard.press('Escape');
        }
        await other.reload(); await clockOpen(other);
        ok(await other.locator('.cooling-new button').isDisabled() && (await saved(other)).rev === 2, 'Reloading keeps the shared completed timer locked for the day');
        ok(!other.errors.length, 'Second device: no browser errors ' + other.errors.join(' | '));
      } finally { await other.context().close(); }
    });
    await step('refused start and explicit retry', async () => {
      p = await L.open(b, '#/prep', { who: 'ann', wait: 1200 }); await clockOpen(p); await ready(p);
      await p.evaluate(() => { __fake.mode = 'deny'; }); await p.locator('[data-stage="2"]').click();
      await L.waitFor(p, () => !!document.querySelector('[data-timer="2"] .cooling-error'));
      ok(!await saved(p) && await p.locator('.cooling-menu .lk-stamp').count() === 0 && await p.getByRole('button', { name: 'Try again: start Operandio 2-hour timer' }).isEnabled(), 'A refused start keeps an explicit retry and never claims the timer started');
      await p.evaluate(() => { __fake.mode = 'ok'; }); await p.getByRole('button', { name: 'Try again: start Operandio 2-hour timer' }).click();
      await L.waitFor(p, () => !!document.querySelector('[data-timer="2"] .lk-stamp'));
      ok((await saved(p)).rev === 1 && await p.locator('.cooling-error').count() === 0, 'Explicit retry saves the first timer and removes the old failure');
    });
    await step('offline canonical read', async () => {
      p = await L.open(b, '#/prep', { who: 'ann', cold: '/cooling/current$', wait: 1200 }); await clockOpen(p);
      ok(await p.locator('[data-stage="2"]').isDisabled() && (await writes(p)).length === 0, 'A cached empty snapshot cannot enable a shared start');
      await p.evaluate(() => __fake.warm()); await ready(p);
      ok(await p.locator('[data-stage="2"]').isEnabled(), 'A fresh server snapshot makes the first timer available');
    });
    await step('view-only cooling access', async () => {
      p = await L.open(b, '#/prep', { who: 'vic', extra: ROLES, wait: 1200 }); await clockOpen(p); await ready(p);
      await p.locator('[data-stage="2"]').click(); await L.waitFor(p, () => !!document.querySelector('[data-timer="2"] .lk-stamp'));
      ok((await saved(p)).firstBy === 'vic' && (await saved(p)).by === 'vic', 'View-only kitchen staff can start cooling without ordinary Prep tick rights');
      ok(!(await p.evaluate(() => __fake.refused)).some(x => /\/cooling/.test(x.path)), 'View-only cooling stays within its narrow permission boundary');
    });
    for (const role of ['functions-only', 'daily locked', 'signed out']) await step(role + ' hidden clock', async () => {
      const options = role === 'functions-only' ? { who: 'fay', extra: ROLES } : role === 'daily locked' ? { who: 'ann', dailyLocked: true } : { who: '' };
      p = await L.open(b, role === 'functions-only' ? '#/functions' : '#/prep', { ...options, wait: 1200 });
      ok(await p.locator('.cooling-clock:not([hidden])').count() === 0, role + ': no private cooling clock appears');
      ok(!(await p.evaluate(() => __fake.reads)).some(path => /\/cooling\//.test(path)), role + ': no cooling state is read');
    });
    await step('due alert waits for PIN', async () => {
      p = await L.open(b, '#/prep', { who: 'ann', dailyLocked: true, extra: { [CURRENT]: firstRecord(L.NOW - 2 * HOUR - 1000) }, wait: 1200 });
      ok(await p.locator('.cooling-ping').count() === 0, 'A due timer never opens over the locked PIN screen');
      const pick = p.locator('.p-name[data-id="ann"]'); if (await pick.isVisible()) await pick.click();
      await p.locator('[data-k="pf1"]').fill('2222');
      await L.waitFor(p, () => LK_PREP.privateAccess() && LK_PREP.state.who === 'ann');
      await L.waitFor(p, () => !!document.querySelector('.cooling-ping'));
      ok(await p.getByText('Operandio batch cooling time 2 hours is done.', { exact: true }).isVisible(), 'The pending screen ping appears after the person signs in');
    });
    await step('cooling and shift ping sheet queue', async () => {
      const day = L.ymd(new Date(L.NOW));
      p = await L.open(b, '#/prep', { who: 'ann', wait: 1200, extra: {
        [CURRENT]: firstRecord(L.NOW - 2 * HOUR - 1000),
        [key('notes', 'cooling-queue-check')]: { text: 'Delivery: use the rear door', tag: 'delivery', start: day, until: day, dows: [], tm: 841, removed: false, at: 1, by: 'sam', author: 'sam' }
      } });
      await L.waitFor(p, () => !!document.querySelector('.cooling-ping'));
      await advanceTo(p, L.NOW + 61000);
      // A foreground wake runs the same sheet queue after the shift ping becomes due.
      await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      await L.waitFor(p, () => !!document.querySelector('.nbell.has-new'));
      ok(await p.locator('.nt-wrap').count() === 1 && await p.locator('.cooling-ping').isVisible() && await p.locator('.nt-wrap:not(.cooling-wrap)').count() === 0, 'A normal shift ping becoming due waits behind the cooling alert instead of stacking a second sheet');
      await p.locator('.cooling-ping [data-cooling="got"]').click();
      await L.waitFor(p, () => !!document.querySelector('.nt-wrap:not(.cooling-wrap)'));
      ok(await p.locator('.nt-wrap').count() === 1 && await p.locator('.cooling-ping').count() === 0 && /use the rear door/.test(await p.locator('.nt-list').textContent()), 'Closing the cooling alert hands the screen to the queued shift ping');
    });
  } finally { if (p) await p.context().close(); await b.close(); }
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
