// Shared screens lock private records after ten idle minutes and at 04:00 Queensland time. Scheduled locks keep
// the original person's drafts behind their PIN; explicit handover clears them before another person signs in.
const L = require('./lib');
const { R, ok } = L.results();
const DRAFTS = { 'lk.mg.draft.laksa': '{"name":"Laksa, kept"}', 'lk.dw.draft.d1': '{"parts":[]}', 'lk.fe.draft.new': '{"phone":"0400 000 000"}' };
const plant = p => p.evaluate(d => Object.keys(d).forEach(k => localStorage.setItem(k, d[k])), DRAFTS);
const left = p => p.evaluate(d => Object.keys(d).filter(k => localStorage.getItem(k)), DRAFTS);
const privateOn = p => p.evaluate(() => LK_PREP.privateAccess());
async function unlock(p, id = 'sam', pin = '1111') {
  const name = p.locator('.p-name[data-id="' + id + '"]');
  if (await name.count() && await name.isVisible()) { await name.click(); await L.settle(p, 200); }
  await p.fill('#pf1', pin);
  await L.waitFor(p, expected => LK_PREP.privateAccess() && LK_PREP.state.who === expected, id, 8000); await L.settle(p, 300);
}
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/prep', { who: 'sam', touch: true, deviceMode: 'shared', wait: 1200 });
  ok(await privateOn(p), 'shared: Sam starts with an actual daily PIN session');
  await p.clock.runFor(11 * 60000); await L.settle(p, 300);
  ok(!await privateOn(p) && !(await p.$('.nb-row')) && !!(await p.$('#pf1')), 'shared: eleven idle minutes hide the list and ask for the original person\'s PIN');
  ok(await p.evaluate(() => !!localStorage.getItem('lk.prep.pin') && LK_DEVICE.mode() === 'shared'), 'shared: the kitchen PIN and explicit device choice remain');
  await p.goto(L.BASE + '#/guides'); await L.settle(p, 800);
  ok(!await privateOn(p) && !(await p.$('.g-card')) && !(await p.$('#p-pin')), 'shared: guides stay private without asking again for the kitchen PIN');
  await p.goto(L.BASE + '#/recipes'); await L.settle(p, 700);
  ok(!await privateOn(p) && !!(await p.$('#shelves a.dish')), 'shared: current recipes remain public after the lock');
  ok(!p.errors.length, 'shared idle: no page errors ' + p.errors.join(' | ')); await p.context().close();

  // Calendar midnight is not the authentication boundary. The v2 session's 04:00 expiry is authoritative.
  for (const deviceMode of ['own', 'shared']) {
    p = await L.open(b, '#/prep', { who: 'sam', touch: true, deviceMode, wait: 1200 });
    await p.evaluate(() => localStorage.setItem('lk.prep.day', '2020-01-01'));
    await p.reload({ waitUntil: 'load' }); await L.settle(p, 1200);
    ok(await privateOn(p), deviceMode + ': an old calendar-day flag cannot override the valid daily session');
    ok(!p.errors.length, deviceMode + ' calendar flag: no page errors ' + p.errors.join(' | ')); await p.context().close();
  }

  for (const [deviceMode, touch] of [['own', true], ['own', false], ['shared', true]]) {
    p = await L.open(b, '#/prep', { who: 'sam', touch, deviceMode, wait: 1200 }); await plant(p);
    await p.evaluate(() => localStorage.setItem('lk.prep.seen', String(Date.now() - 11 * 60000)));
    await p.reload({ waitUntil: 'load' }); await L.settle(p, 1200);
    ok((await left(p)).length === 3, deviceMode + (touch ? ' phone' : ' computer') + ': reopening retains drafts for their original person');
    if (deviceMode === 'shared') {
      ok(!await privateOn(p) && !!(await p.$('#pf1')), 'reopening an idle shared screen requires the same PIN before private records return');
      await unlock(p);
      ok((await left(p)).length === 3 && await privateOn(p), 'the original person can recover the drafts with their PIN');
      await p.click('.wtop-who'); await L.settle(p, 150); await p.click('.wm [data-who="out"]'); await L.settle(p, 400);
      if (await privateOn(p)) { await p.click('.wm [data-who="out"]'); await L.settle(p, 400); }
      ok(!(await left(p)).length && !await privateOn(p), 'explicit shared handover clears the old recipe, drawing and function drafts');
      await unlock(p, 'ann', '2222');
      ok(await p.evaluate(() => LK_PREP.state.who === 'ann') && !(await left(p)).length, 'the next person receives their own access without the old drafts');
    } else ok(await privateOn(p), 'personal ' + (touch ? 'phone' : 'computer') + ': reopening after eleven idle minutes needs no new PIN');
    ok(!p.errors.length, deviceMode + ' draft recovery: no page errors ' + p.errors.join(' | ')); await p.context().close();
  }

  const day = new Date(L.NOW + 10 * 3600000).toISOString().slice(0, 10), cutoff = Date.parse(day + 'T04:00:00+10:00');
  for (const deviceMode of ['own', 'shared']) {
    p = await L.open(b, '#/prep', { who: 'sam', deviceMode, clock: cutoff - 60000, sessionExp: cutoff, wait: 1200 });
    await plant(p); await p.clock.runFor(90000); await L.settle(p, 400);
    ok(!await privateOn(p) && (await left(p)).length === 3, deviceMode + ': 04:00 locks access and keeps the same person\'s drafts');
    await unlock(p);
    ok(await privateOn(p) && (await left(p)).length === 3, deviceMode + ': the next daily PIN restores access to those drafts');
    ok(!p.errors.length, deviceMode + ' daily draft recovery: no page errors ' + p.errors.join(' | ')); await p.context().close();
  }

  p = await L.open(b, '#/settings', { admin: true, deviceMode: 'own', wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('[data-act="device-choice"]'), null, 8000);
  await p.click('[data-act="device-choice"]'); await p.click('[data-device="shared"]'); await L.settle(p, 400);
  ok(await p.evaluate(() => LK_DEVICE.mode() === 'shared' && !LK_DEVICE.ownerId() && !LK_PREP.privateAccess() && !LK_PREP.state.user), 'Settings changes the explicit profile and ends the previous PIN and Google access');
  ok(!p.errors.length, 'shared Settings: no page errors ' + p.errors.join(' | ')); await p.context().close();
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exitCode = 1; });
