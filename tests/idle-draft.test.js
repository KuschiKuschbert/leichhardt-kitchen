// Personal computers retain idle work. Shared screens lock it behind the original person's PIN;
// only an explicit handover clears that person's private draft.
const L = require('./lib');
const { R, ok } = L.results();
const has = p => p.evaluate(() => !!(LK_PREP.state.draft && LK_PREP.state.draft.people.some(p => p.name === 'Zed')));
(async () => {
  const b = await L.start();
  for (const deviceMode of ['own', 'shared']) {
    const p = await L.open(b, '#/prep', { who: 'sam', width: 1280, height: 800, deviceMode, wait: 1500 });
    await L.chef(p, 'staff'); await L.settle(p, 300);
    await p.fill('[data-k="a-bulk"]', 'Zed'); await p.click('[data-p="a-bulk-add"]'); await L.settle(p, 200);
    ok(await has(p), deviceMode + ': Zed is present only in the unsaved staff draft');
    await p.clock.runFor(11 * 60000); await L.settle(p, 300);
    if (deviceMode === 'own') {
      ok(await p.evaluate(() => LK_PREP.privateAccess() && LK_PREP.state.authed) && await has(p), 'personal computer: idle time retains sign-in and the unsaved staff draft');
    } else {
      ok(await p.evaluate(() => !LK_PREP.privateAccess() && !LK_PREP.state.authed) && await p.locator('#pf1').isVisible(), 'shared: ten idle minutes hide private records behind the original person\'s PIN');
      ok(await has(p), 'scheduled shared lock keeps the unfinished staff draft');
      await p.fill('#pf1', '1111');
      await L.waitFor(p, () => LK_PREP.privateAccess() && LK_PREP.state.who === 'sam', null, 8000); await L.settle(p, 300);
      if (!(await p.locator('[data-k="a-bulk"]').count())) await L.chef(p, 'staff');
      ok(await has(p) && !!(await p.$('[data-k="a-bulk"]')), 'the same PIN restores the staff draft');
      await p.click('.wtop-who'); await L.settle(p, 150); await p.click('.wm [data-who="out"]'); await L.settle(p, 200);
      if (await p.evaluate(() => LK_PREP.state.authed)) { await p.click('.wm [data-who="out"]'); await L.settle(p, 400); }
      ok(await p.evaluate(() => !LK_PREP.privateAccess() && !LK_PREP.state.draft), 'explicit handover clears the old staff draft after discard confirmation');
    }
    ok(!p.errors.length, deviceMode + ': no page errors ' + p.errors.join(' | ')); await p.context().close();
  }
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exitCode = 1; });
