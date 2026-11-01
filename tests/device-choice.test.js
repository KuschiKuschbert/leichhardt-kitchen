// The remembered device preference stays separate from a person's PIN and role.
const L = require('./lib');
const { R, ok } = L.results();
(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await L.open(b, '#/recipes', { width, who: '', deviceUnclassified: true, settings: { shared: true }, wait: 500 });
    await L.waitFor(p, () => !!document.querySelector('#lk-device-choice[open]'));
    const ui = await p.evaluate(() => {
      const d = document.querySelector('#lk-device-choice'), r = d.getBoundingClientRect();
      return { modal: d.matches(':modal'), title: document.getElementById(d.getAttribute('aria-labelledby')).textContent,
        focus: d.contains(document.activeElement), bottom: Math.abs(innerHeight - r.bottom) < 2,
        centred: Math.abs(r.left + r.width / 2 - innerWidth / 2) < 2, width: r.width,
        choices: [...d.querySelectorAll('[data-device]')].map(e => e.dataset.device) };
    });
    ok(ui.modal && ui.focus && ui.title === 'How is this device used?', width + ' px: labelled modal contains keyboard focus');
    ok(ui.choices.join() === 'personal,shared', width + ' px: explicit personal and shared choices, even with a legacy shared setting');
    ok(width < 768 ? ui.bottom && ui.width === width : ui.centred && ui.width < width, width + ' px: phone bottom sheet or centred larger-screen dialog');
    ok(!(await L.overflow(p)), width + ' px: device setup has no sideways scroll');
    await p.click('[data-device="personal"]');
    ok(await p.evaluate(() => LK_DEVICE.mode() === 'personal' && !LK_DEVICE.ownerId() && !LK_PREP.privateAccess()), width + ' px: choosing personal grants no identity or kitchen access');
    await p.reload(); await L.settle(p, 400);
    ok(await p.evaluate(() => LK_DEVICE.classified() && LK_DEVICE.mode() === 'personal' && !document.querySelector('#lk-device-choice')), width + ' px: choice survives reopening without another prompt');
    ok(!p.errors.length, width + ' px: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  let p = await L.open(b, '#/recipes', { who: '', deviceUnclassified: true, wait: 400 });
  await p.click('[data-device="shared"]');
  ok(await p.evaluate(() => LK_DEVICE.mode() === 'shared' && LK_DEVICE.verify('ann') && LK_DEVICE.verify('bo') && !LK_DEVICE.ownerId() && !LK_PREP.privateAccess()), 'shared preference never binds or signs in the worker selected');
  await p.context().close();

  p = await L.open(b, '#/recipes', { who: '', deviceUnclassified: true, wait: 400 });
  await p.click('[data-device="personal"]');
  ok(await p.evaluate(() => LK_DEVICE.verify('ann') && !LK_DEVICE.verify('bo') && LK_DEVICE.ownerId() === 'ann' && !LK_PREP.privateAccess()), 'a personal profile binds once and cannot be reassigned by choosing another name');
  ok(await p.evaluate(() => !LK_DEVICE.choose('shared') && LK_DEVICE.mode() === 'personal'), 'an existing choice cannot be overwritten through the initial chooser');
  await p.context().close();

  p = await L.open(b, '#/recipes', { who: '', deviceUnclassified: true, wait: 400 });
  await p.click('[data-device-cancel]');
  ok(await p.evaluate(() => !LK_DEVICE.classified() && !LK_PREP.privateAccess() && location.hash === '#/recipes'), 'viewing public recipes leaves the device unclassified and kitchen operations locked');
  await p.evaluate(() => LK_DEVICE.request());
  const second = await p.context().newPage();
  await second.goto(L.BASE + '#/recipes');
  await L.waitFor(second, () => !!document.querySelector('#lk-device-choice[open]'));
  await second.click('[data-device="shared"]');
  await L.waitFor(p, () => LK_DEVICE.mode() === 'shared' && !document.querySelector('#lk-device-choice'));
  ok(await p.evaluate(() => !LK_PREP.back()), 'another tab choosing the device also settles the first tab\'s picker history');
  ok(!p.errors.length, 'cross-tab setup has no page errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/settings', { who: 'ann', wait: 800 });
  ok(await p.locator('[aria-label="This device"] [data-act="device-choice"]').count() === 1, 'the unlocked owner of a personal device can change its type in Settings');
  await p.click('[data-act="device-choice"]'); await p.click('[data-device="shared"]');
  await L.waitFor(p, () => LK_DEVICE.mode() === 'shared' && !LK_PREP.privateAccess());
  ok(await p.evaluate(() => !LK_DEVICE.ownerId()), 'changing to shared signs the previous person out and removes the personal binding');
  await p.context().close();

  p = await L.open(b, '#/settings', { who: 'ann', settings: { shared: true }, wait: 800 });
  ok(await p.locator('[data-act="device-choice"]').count() === 0 && /head chef/.test(await L.txt(p, '[aria-label="This device"]')), 'staff cannot turn an established shared screen into a remembered personal device');
  ok(!p.errors.length, 'protected Settings has no page errors ' + p.errors.join(' | '));
  await p.context().close();

  for (const action of ['cancel', 'escape', 'back']) {
    p = await L.open(b, '#/prep', { who: '', deviceUnclassified: true, wait: 400 });
    await L.waitFor(p, () => !!document.querySelector('#lk-device-choice[open]'));
    ok(await p.evaluate(() => history.state && history.state.lkOv === 'adaptive'), 'direct Prep ' + action + ': first device prompt has its own history entry');
    if (action === 'cancel') await p.click('[data-device-cancel]');
    else if (action === 'escape') await p.keyboard.press('Escape');
    else await p.goBack();
    await L.waitFor(p, () => location.hash === '#/recipes' && !document.querySelector('#lk-device-choice'));
    ok(await p.evaluate(() => !LK_DEVICE.classified() && !LK_PREP.privateAccess()), 'direct Prep ' + action + ': dismisses to public recipes without leaving the app or granting access');
    await p.context().close();
  }

  p = await L.open(b, '#/prep', { who: 'ann', wait: 700 });
  await p.fill('[data-k="p-text"]', 'Keep this prep draft');
  await p.evaluate(() => { location.hash = '#/settings'; }); await L.settle(p, 300);
  await p.click('[data-act="device-choice"]'); await p.click('[data-device="shared"]');
  await L.waitFor(p, () => !!document.querySelector('#lk-device-discard[open]'));
  ok(await p.evaluate(() => history.state && history.state.lkOv === 'adaptive'), 'draft device change reuses the picker history entry for its confirmation');
  await p.goBack(); await L.settle(p, 300);
  ok(await p.evaluate(() => location.hash === '#/settings' && !document.querySelector('#lk-device-discard') && LK_DEVICE.mode() === 'personal' && LK_PREP.state.text === 'Keep this prep draft'), 'Back dismisses discard confirmation and keeps Settings, the profile and the draft');
  ok(await p.evaluate(() => document.activeElement && document.activeElement.dataset.act === 'device-choice'), 'Back returns focus to Change device type');
  await p.click('[data-act="device-forget"]'); await p.click('#lk-device-discard [data-discard]');
  await L.waitFor(p, () => !!document.querySelector('#lk-device-choice[open]') && !LK_DEVICE.classified());
  ok(await p.evaluate(() => history.state && history.state.lkOv === 'adaptive' && !LK_PREP.privateAccess() && !LK_PREP.state.text), 'Forget waits for confirmation history to settle before asking for the new device choice');
  await p.goBack();
  await L.waitFor(p, () => location.hash === '#/recipes' && !document.querySelector('#lk-device-choice'));
  ok(await p.evaluate(() => !LK_DEVICE.classified()), 'Back after Forget dismisses the new prompt to public recipes without reviving the old profile');
  ok(!p.errors.length, 'device setup history has no browser errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exitCode = 1; });
