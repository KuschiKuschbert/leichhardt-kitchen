// End-to-end shared cooling through the app's real session, W(), sheets and fake Firestore boundary.
// Only explicit __fake.write() calls below represent the backend. The fake never accepts a request automatically.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const HOUR = 3600000;
const READY = { [key('cooling', 'config')]: { v: 1, enabled: true } };
const stamp = value => ({ __fakeTimestamp: value });
const millis = value => typeof value === 'number' ? value : value && (value.__fakeTimestamp != null ? value.__fakeTimestamp : value.seconds != null ? value.seconds * 1000 + (value.nanoseconds || 0) / 1000000 : NaN);
const requests = p => p.evaluate(() => Object.entries(__fake.dump()).filter(([path]) => /\/coolingRequests\/[^/]+$/.test(path)).map(([path, data]) => ({ path, data })));
const pushKey = key('coolingPush', 'anon-test');
function firstRecord(id, at, by = 'ann') {
  return { v: 1, run: id, rev: 1, firstAt: at, firstDue: at + 2 * HOUR, firstBy: by,
    secondAt: 0, secondDue: 0, secondBy: '', schedule: { first: 'queued', second: '' } };
}
async function clockOpen(p) {
  await L.waitFor(p, () => !!document.querySelector('[data-cooling="open"]:not([hidden])'), null, 10000);
  await p.locator('[data-cooling="open"]').click();
  await L.waitFor(p, () => !!document.querySelector('.cooling-menu'), null, 8000);
}
async function server(p, path, data) { await p.evaluate(({ path, data }) => __fake.write(path, data), { path, data }); }
async function accept(p, request, record, currentFirst = true) {
  const result = { ...request.data, status: 'accepted', run: record.run, revision: record.rev, resolvedAt: stamp(record.secondAt || record.firstAt) };
  if (currentFirst) await server(p, key('cooling', 'current'), record);
  await server(p, request.path, result);
  if (!currentFirst) await server(p, key('cooling', 'current'), record);
  await L.waitFor(p, () => !document.querySelector('.cooling-wrap [aria-busy="true"]'), null, 8000);
}
function pushFixture() {
  let permission = 'default';
  Object.defineProperty(Notification, 'permission', { configurable: true, get: () => permission });
  Notification.requestPermission = () => { permission = 'granted'; return Promise.resolve(permission); };
  if (!window.PushManager) window.PushManager = function () {};
  Object.defineProperty(navigator.serviceWorker, 'ready', { configurable: true, get: () => Promise.resolve({ scope: '/' }) });
}
const roleConfig = L.seed()[key('config', 'main')];
roleConfig.people.push({ id: 'vic', name: 'Vic', role: 'view', active: true, add: false, tick: false, del: false },
  { id: 'fay', name: 'Fay', role: 'fnc', active: true, add: false, tick: false, del: false, fn: true });
roleConfig.staffIds.push('vic', 'fay'); roleConfig.fnOnlyIds = ['fay']; roleConfig.fnIds = ['fay'];
const ROLES = { ...READY, [key('config', 'main')]: roleConfig };
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
    await step('backend readiness', async () => {
      p = await L.open(b, '#/prep', { who: 'ann', wait: 1200 }); await clockOpen(p);
      await L.waitFor(p, () => /not set up/.test(document.querySelector('.cooling-menu').textContent));
      ok(await p.locator('[data-cooling="start"][data-stage="2"]').isDisabled(), 'Without deployed readiness, the clock explains setup and cannot start a local-only timer');
      ok((await requests(p)).length === 0, 'Opening an unconfigured timer creates no request');
    });
    for (const width of [390, 768, 1280]) await step('staff clock ' + width, async () => {
      p = await L.open(b, '#/prep', { who: 'ann', width, extra: READY, wait: 1200 });
      const before = await p.locator('.wtop').evaluate(el => el.getBoundingClientRect().height);
      await clockOpen(p);
      await L.waitFor(p, () => { const el = document.querySelector('[data-cooling="start"][data-stage="2"]'); return el && !el.disabled; });
      const box = await p.locator('.cooling-menu').evaluate(el => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height, fits: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; });
      ok(box.width === 248 && box.height <= 157 && box.fits && !await L.overflow(p), width + ': approved compact dropdown fits the real app');
      ok(await p.locator('[data-stage="4"]').isDisabled(), width + ': second stage is visible and unavailable initially');
      await p.keyboard.press('Escape');
      ok(await p.locator('.wtop').evaluate(el => el.getBoundingClientRect().height) === before && await p.locator('[data-cooling="open"]').evaluate(el => el === document.activeElement), width + ': closing keeps header height and returns focus to the clock');
      ok(!(await p.evaluate(() => __fake.refused)).some(x => /\/cooling/.test(x.path)), width + ': ordinary staff cooling reads pass the fake permission boundary');
    });
    await step('two-stage shared sequence', async () => {
      p = await L.open(b, '#/prep', { who: 'ann', deviceMode: 'personal', extra: READY, wait: 1200 }); await clockOpen(p);
      await L.waitFor(p, () => !document.querySelector('[data-stage="2"]').disabled);
      await p.locator('[data-stage="2"]').click();
      await L.waitFor(p, () => Object.keys(__fake.dump()).some(path => /\/coolingRequests\//.test(path)), null, 8000);
      let all = await requests(p), request = all[0];
      const session = await p.evaluate(path => __fake.dump()[path], key('sessions', 'anon-test'));
      ok(all.length === 1 && request.data.v === 1 && request.data.uid === 'anon-test' && request.data.by === 'ann' && request.data.stage === 1 && request.data.expectedRun === '' && request.data.expectedRev === 0,
        'First click writes one identity-bound stage-one request through W');
      ok(millis(request.data.sessionAt) === millis(session.issuedAt) && Number.isFinite(millis(request.data.at)), 'Request binds the actual daily session and has a server timestamp');
      await p.locator('[data-stage="2"]').evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      ok((await requests(p)).length === 1 && await p.locator('[data-stage="2"]').isDisabled() && await p.locator('[data-stage="2"]').getAttribute('aria-busy') === 'true', 'A duplicate click stays pending and cannot create another request');
      const at = Math.floor(await p.evaluate(() => LK_TIME.now())), record = firstRecord(request.path.split('/').pop(), at);
      await server(p, key('cooling', 'current'), record); await L.settle(p, 150);
      ok(await p.locator('.cooling-menu .lk-stamp').count() === 0 && await p.locator('[data-stage="2"]').getAttribute('aria-busy') === 'true', 'Canonical state alone cannot turn an unresolved own request into confirmed success');
      await accept(p, request, record);
      await L.waitFor(p, () => !!document.querySelector('[data-timer="2"] .lk-stamp'));
      ok(await p.locator('[data-timer="2"] button').count() === 0 && await p.locator('[data-stage="4"]').isDisabled(), 'Accepted start shows read-only countdown and keeps the next stage off');
      await p.keyboard.press('Escape');
      await p.clock.fastForward(2 * HOUR + 5000); await p.evaluate(() => window.dispatchEvent(new Event('lk-clock')));
      await L.waitFor(p, () => !!document.querySelector('.cooling-ping'), null, 10000);
      ok(await p.getByText('Operandio batch cooling time 2 hours is done.', { exact: true }).isVisible(), 'The first deadline produces the exact two-hour shift-style ping');
      const beforeGot = (await requests(p)).length;
      await p.getByRole('button', { name: 'Got it', exact: true }).click();
      await L.waitFor(p, () => !document.querySelector('.cooling-ping'));
      const seen = await p.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), 'lk.cooling.seen.' + L.PIN + '.anon-test.ann');
      ok(seen[record.run + '_1'] === true && (await requests(p)).length === beforeGot, 'Got it records only Ann’s local event marker and never starts stage two');
      const other = await L.open(b, '#/prep', { who: 'bo', clock: record.firstDue + 5000, extra: { ...READY, [key('cooling', 'current')]: record }, wait: 1200 });
      try {
        await L.waitFor(other, () => !!document.querySelector('.cooling-ping'), null, 10000);
        ok(await other.getByText('Operandio batch cooling time 2 hours is done.', { exact: true }).isVisible(), 'Bo still receives the first ping after Ann dismissed hers');
        ok(!other.errors.length, 'Bo’s separate delivery has no browser errors');
      } finally { await other.context().close(); }
      await clockOpen(p); await L.waitFor(p, () => !document.querySelector('[data-stage="4"]').disabled);
      ok(await p.locator('[data-timer="2"] button').count() === 0, 'The elapsed first timer remains read-only when four hours becomes available');
      await p.locator('[data-stage="4"]').click();
      await L.waitFor(p, () => Object.values(__fake.dump()).some(d => d && d.stage === 2 && d.expectedRev === 1));
      all = await requests(p); const second = all.find(x => x.data.stage === 2);
      ok(all.length === 2 && second.data.expectedRun === record.run && second.data.expectedRev === 1, 'A separate click creates stage two against the accepted run and revision');
      const secondAt = Math.floor(await p.evaluate(() => LK_TIME.now())), continued = { ...record, rev: 2, secondAt, secondDue: secondAt + 4 * HOUR, secondBy: 'ann', schedule: { first: 'queued', second: 'queued' } };
      await accept(p, second, continued, false);
      await L.waitFor(p, () => !!document.querySelector('[data-timer="4"] .lk-stamp'));
      ok(await p.locator('[data-timer="4"] button').count() === 0 && continued.secondDue - continued.secondAt === 4 * HOUR, 'The accepted second timer runs a further four hours from its own start');
      await p.keyboard.press('Escape'); await p.clock.fastForward(4 * HOUR + 5000); await p.evaluate(() => window.dispatchEvent(new Event('lk-clock')));
      await L.waitFor(p, () => !!document.querySelector('.cooling-ping'), null, 10000);
      ok(await p.getByText('Operandio batch cooling time 4 hours is done.', { exact: true }).isVisible(), 'The second deadline produces the exact four-hour ping');
      ok((await requests(p)).length === 2, 'Deadline ticks never create request writes or restart either timer');
    });
    await step('view-only cooling access', async () => {
      p = await L.open(b, '#/prep', { who: 'vic', extra: ROLES, wait: 1200 }); await clockOpen(p);
      await L.waitFor(p, () => !document.querySelector('[data-stage="2"]').disabled); await p.locator('[data-stage="2"]').click();
      await L.waitFor(p, () => Object.keys(__fake.dump()).some(path => /\/coolingRequests\//.test(path)));
      const req = (await requests(p))[0];
      ok(req.data.by === 'vic' && req.data.stage === 1, 'View-only kitchen staff can start the fixed cooling sequence without ordinary Prep tick rights');
      ok(!(await p.evaluate(() => __fake.refused)).some(x => /\/cooling/.test(x.path)), 'View-only cooling reads stay within the narrow permitted paths');
    });
    for (const role of ['functions-only', 'daily locked', 'signed out']) await step(role + ' hidden clock', async () => {
      const options = role === 'functions-only' ? { who: 'fay', extra: ROLES } : role === 'daily locked' ? { who: 'ann', dailyLocked: true, extra: READY } : { who: '', extra: READY };
      p = await L.open(b, role === 'functions-only' ? '#/functions' : '#/prep', { ...options, wait: 1200 });
      ok(await p.locator('[data-cooling="open"]:not([hidden])').count() === 0, role + ': no private cooling clock appears');
      ok(!(await p.evaluate(() => __fake.reads)).some(path => /\/cooling\//.test(path)), role + ': no cooling state is read');
    });
    await step('push route waits for PIN', async () => {
      p = await L.open(b, '#/cooling', { who: 'ann', dailyLocked: true, extra: READY, wait: 1200 });
      ok(await p.locator('.cooling-wrap').count() === 0 && await p.locator('[data-cooling="open"]:not([hidden])').count() === 0, 'Opening the notification route does not bypass the PIN screen');
      const pick = p.locator('.p-name[data-id="ann"]'); if (await pick.isVisible()) await pick.click();
      await p.locator('[data-k="pf1"]').fill('2222');
      await L.waitFor(p, () => LK_PREP.privateAccess() && LK_PREP.state.who === 'ann', null, 10000);
      await L.waitFor(p, () => !!document.querySelector('.cooling-menu'), null, 10000);
      ok(await p.getByRole('heading', { name: 'Operandio', exact: true }).isVisible(), 'After the correct PIN, the notification route opens the compact clock menu');
    });
    await step('staff phone cooling opt-in', async () => {
      p = await L.open(b, '#/settings', { who: 'ann', extra: READY, init: pushFixture, wait: 1200 });
      await p.locator('[data-act="strow"][data-val="cooling-push"]').click();
      await p.locator('[data-act="stcoolingpush"]').click();
      await L.waitFor(p, path => !!__fake.dump()[path], pushKey, 10000);
      let record = await p.evaluate(path => __fake.dump()[path], pushKey);
      ok(record.uid === 'anon-test' && record.by === 'ann' && record.mode === 'personal' && record.tok === 'fake-push-token-1' && Number.isFinite(millis(record.at)), 'Ordinary staff opt in only their own personal device for cooling push');
      const kept = await p.evaluate(() => JSON.parse(localStorage.getItem('lk.cooling.push') || '{}'));
      ok(!kept.tok && kept.uid === 'anon-test' && await p.evaluate(() => !localStorage.getItem('lk.push')), 'Cooling opt-in stores no push token locally and does not change supplier reminders');
      await L.waitFor(p, () => document.querySelector('[data-act="stcoolingpush"]').getAttribute('data-val') === '0');
      await p.locator('[data-act="stcoolingpush"]').click();
      await L.waitFor(p, path => !__fake.dump()[path], pushKey);
      await L.waitFor(p, () => !localStorage.getItem('lk.cooling.push') && !LK_PREP.coolingPush().busy);
      ok(await p.evaluate(() => !localStorage.getItem('lk.cooling.push') && !window.__pushDeleted), 'Turning cooling alerts off removes their device subscription without disabling other push uses');
    });
  } finally { if (p) await p.context().close(); await b.close(); }
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
