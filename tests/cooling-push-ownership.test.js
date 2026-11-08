// Cooling token refresh may outlive the person who started it. The real app must retain that person's
// captured session across the asynchronous Messaging response, including their personal-PIN generation.
const fs = require('fs'), path = require('path');
const L = require('./lib');
const { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const pushKey = key('coolingPush', 'anon-test');
const messaging = fs.readFileSync(path.join(__dirname, 'fake/firebase-messaging.js'), 'utf8').replace(
  "return Promise.resolve(window.__pushTok || 'fake-push-token-1');",
  "return new Promise(resolve => { window.__releaseCoolingToken = () => { resolve('refreshed-cooling-token'); window.__releaseCoolingToken = null; }; });"
);
function init() {
  Object.defineProperty(Notification, 'permission', { configurable: true, get: () => 'granted' });
  Notification.requestPermission = () => Promise.resolve('granted');
  if (!window.PushManager) window.PushManager = function () {};
  Object.defineProperty(navigator.serviceWorker, 'ready', { configurable: true, get: () => Promise.resolve({ scope: '/' }) });
}
async function refresh(p) {
  await p.evaluate(() => {
    const s = LK_PREP.state;
    localStorage.setItem('lk.cooling.push', JSON.stringify({ uid: s.uid, by: s.who, pin: s.pin, pinAt: s.sessPinAt, day: '2000-01-01' }));
    window.dispatchEvent(new Event('lk-access'));
  });
  await L.waitFor(p, () => typeof window.__releaseCoolingToken === 'function');
}
async function release(p) {
  await p.evaluate(() => window.__releaseCoolingToken());
  await L.settle(p, 600);
}
async function unlock(p, by, pin) {
  await L.waitFor(p, expected => !!document.querySelector('.p-name[data-id="' + expected + '"]') || !!document.querySelector('[data-k="pf1"]'), by);
  const pick = p.locator('.p-name[data-id="' + by + '"]');
  if (await pick.count() && await pick.isVisible()) await pick.click();
  await p.locator('[data-k="pf1"]').fill(pin);
  await L.waitFor(p, expected => LK_PREP.privateAccess() && LK_PREP.state.who === expected, by, 10000);
  await L.waitFor(p, () => !LK_PREP.unsent());
}
(async () => {
  const b = await L.start(); let p;
  async function step(label, run) {
    try {
      p = await L.open(b, '#/prep', { who: 'ann', init, wait: 1200,
        extra: { [key('cooling', 'config')]: { v: 1, enabled: true } },
        fakeSDK: { 'firebase-messaging.js': messaging } });
      await L.waitFor(p, () => LK_PREP.privateAccess() && !LK_PREP.unsent());
      await run();
    } catch (e) { ok(false, label + ': ' + String(e.message || e).split('\n')[0]); }
    finally {
      if (p) { ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; }
    }
  }
  try {
    await step('unchanged refresh owner', async () => {
      await refresh(p); await release(p);
      await L.waitFor(p, path => !!__fake.dump()[path], pushKey);
      const saved = await p.evaluate(path => __fake.dump()[path], pushKey);
      ok(saved.by === 'ann' && saved.pinAt === 1 && saved.tok === 'refreshed-cooling-token', 'The opted-in person can refresh their own notification token');
      ok(await p.evaluate(() => JSON.parse(localStorage.getItem('lk.cooling.push')).day === LK_TIME.day()), 'Successful refresh advances only the original owner’s daily marker');
    });
    await step('replacement person during refresh', async () => {
      await refresh(p);
      // Use the real authenticated device handover and PIN entry, retaining this tab's unresolved SDK call.
      ok(await p.evaluate(() => LK_PREP.changeDevice('personal', false)), 'A pending token lookup has created no unsent write and permits device handover');
      await unlock(p, 'bo', '3333');
      ok(await p.evaluate(() => LK_DEVICE.ownerId() === 'bo' && LK_PREP.coolingPush().show && !LK_PREP.coolingPush().on), 'The replacement person has an authorised personal session but has not opted into cooling push');
      await release(p);
      ok(await p.evaluate(path => !__fake.dump()[path], pushKey), 'The late refresh response cannot create a cooling subscription for the replacement person');
      ok(await p.evaluate(() => { const kept = JSON.parse(localStorage.getItem('lk.cooling.push') || 'null'); return !kept || kept.by !== 'bo'; }), 'The late response cannot transfer the old person’s local opt-in to the replacement person');
      ok(await p.evaluate(() => !__fake.writes.some(x => /\/coolingPush\//.test(x.path))), 'An obsolete refresh is cancelled before any cooling subscription write');
    });
    await step('replacement PIN generation during refresh', async () => {
      await refresh(p);
      // Reset the same person's PIN generation, then perform a fresh real PIN unlock on the same device.
      await p.evaluate(path => __fake.write(path, { at: 2 }), key('pinset', 'ann'));
      await p.evaluate(() => LK_PREP.signOut(true, true));
      await unlock(p, 'ann', '2222');
      ok(await p.evaluate(() => LK_PREP.state.sessPinAt === 2 && !LK_PREP.coolingPush().on), 'The new PIN generation does not inherit the old cooling opt-in');
      await release(p);
      ok(await p.evaluate(path => !__fake.dump()[path], pushKey), 'The late token response cannot register against a replacement PIN generation');
      ok(await p.evaluate(() => !__fake.writes.some(x => /\/coolingPush\//.test(x.path))), 'The PIN-generation mismatch cancels before any cooling subscription write');
    });
    await step('push feedback belongs to its person', async () => {
      await p.evaluate(() => LK_PREP.coolingPushSet(true));
      await L.waitFor(p, () => typeof window.__releaseCoolingToken === 'function');
      await release(p);
      await L.waitFor(p, () => !LK_PREP.coolingPush().busy && LK_PREP.coolingPush().on);
      await p.evaluate(() => LK_PREP.changeDevice('personal', false));
      await unlock(p, 'bo', '3333');
      const info = await p.evaluate(() => LK_PREP.coolingPush());
      ok(!info.on && !/alerts are on/.test(info.msg) && !info.error, 'A replacement person never sees the previous person’s successful opt-in status');
    });
    await step('in-flight opt-in keeps one request', async () => {
      await p.evaluate(() => LK_PREP.coolingPushSet(true));
      await L.waitFor(p, () => typeof window.__releaseCoolingToken === 'function');
      await p.evaluate(() => LK_PREP.changeDevice('personal', false));
      await unlock(p, 'bo', '3333');
      const info = await p.evaluate(() => LK_PREP.coolingPush());
      ok(info.busy && !info.error && !/Turning cooling alerts/.test(info.msg), 'Handover clears obsolete feedback while retaining the in-flight request guard');
      await p.evaluate(() => LK_PREP.coolingPushSet(true));
      ok(await p.evaluate(() => window.__pushGot === 1), 'The replacement person cannot create a second token request while the first is unresolved');
      await release(p);
      ok(await p.evaluate(path => !__fake.dump()[path] && !LK_PREP.coolingPush().busy && !LK_PREP.coolingPush().error, pushKey), 'The old opt-in cancels without a write or error attributed to the replacement person');
    });
  } finally { if (p) await p.context().close(); await b.close(); }
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
