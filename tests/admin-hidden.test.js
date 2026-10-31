// Admin in the chef hat's menu only shows on a phone or computer where the head chef has signed in and passed the owner check.
// Staff never see it, and Settings says nothing about it. #/admin opens the Google sign-in card by its address.
// Clear all ticks and the device type (Personal phone or Shared device) only show on Settings on that device.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
(async () => {
  const b = await L.start();
  // staff: no key in the top bar on the landing page, the prep list or the recipes
  for (const h of ['#/', '#/prep', '#/recipes']) {
    const p = await L.open(b, h, { who: 'ann', wait: 1200 });
    ok(await L.admItem(p) === 'none', 'staff ' + h + ': no Admin in the chef hat menu');
    ok(await p.$('.wtop .wtop-who') !== null, 'staff ' + h + ': the chef mark (with Settings) still there');
    ok(p.errors.length === 0, 'staff ' + h + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  // staff on Settings: no Admin panel block, no Clear all ticks, no device type; #/admin still opens the sign-in card
  let p = await L.open(b, '#/settings', { who: 'ann', wait: 1000 });
  ok(await L.admItem(p) === 'none', 'staff settings: no Admin in the menu');
  ok(await p.$('[aria-label="Admin panel"]') === null && await p.$('[data-k="adm-signin"]') === null, 'staff settings: no Admin panel block');
  ok(await p.$('[data-act="clearticks"]') === null, 'staff settings: no Clear all ticks');
  ok(await p.$('[data-act="setshared"]') === null, 'staff settings: no device type');
  ok(await p.$('[data-act="settext"]') !== null, 'staff settings: text size still there');
  await p.goto(L.BASE + '#/admin');
  await L.settle(p, 1200);
  ok(/Sign in with Google/.test(await txt(p, '#prep-root') || ''), 'staff: #/admin opens the Google sign-in card');
  ok(await L.admItem(p) === 'none', 'staff on #/admin: still no Admin in the menu');
  ok(p.errors.length === 0, 'staff settings: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // the head chef's phone (a chef signed in, see shared-tablet-chef.test.js): nothing stored yet, the owner probe passes on the prep list and the key appears without a reload
  p = await L.open(b, '#/prep', { admin: true, who: '', wait: 1800 });
  ok(await p.evaluate(() => localStorage.getItem('lk.admin')) === '1', 'head chef: lk.admin set by the owner probe');
  ok(await p.$('.wtop .adm') === null, 'head chef #/prep: no Admin key in the top bar any more');
  ok(await L.admItem(p) === 'signed', 'head chef #/prep: Admin panel in the chef hat menu, after the probe');
  await p.click('.wtop-who'); await L.settle(p, 150);
  await p.click('.wm .wm-adm');
  await L.settle(p, 1500);
  ok(await p.$('.p-admin .a-nav') !== null, 'head chef: Admin panel in the menu opens the admin panel');
  ok(await p.$('.wm-wrap') === null, 'head chef: the menu closes on the way');
  ok(await p.$('.wtop-who[aria-current="page"]') !== null, 'head chef #/admin: the chef hat marks the page');
  ok(p.errors.length === 0, 'head chef: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // the head chef's Settings page: Clear all ticks and the device type, still no Admin panel block
  p = await L.open(b, '#/settings', { admin: true, who: '', wait: 1800 });
  // Config can be ready before the asynchronous owner probe has shown these controls.
  await L.waitFor(p, () => !!document.querySelector('[data-act="clearticks"]') && !!document.querySelector('[data-act="setshared"][data-val="1"]'), null, 10000);
  ok(await p.$('[aria-label="Admin panel"]') === null, 'head chef settings: no Admin panel block');
  ok(await p.$('[data-act="clearticks"]') !== null, 'head chef settings: Clear all ticks');
  ok(await p.$('[data-act="setshared"][data-val="1"]') !== null, 'head chef settings: device type');
  ok(await L.admItem(p) === 'signed', 'head chef settings: Admin in the chef hat menu');
  // signing out on that device drops them again without a reload, and the device type chosen stays
  await p.click('[data-act="setshared"][data-val="1"]');
  await p.evaluate(() => { localStorage.setItem('lk.admin', ''); window.dispatchEvent(new Event('lk-admin')); });
  await L.settle(p, 300);
  ok(await p.$('[data-act="setshared"]') === null && await p.$('[data-act="clearticks"]') === null, 'head chef signed out: the device blocks are gone');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('lk.settings.v1') || '{}').shared === true), 'head chef signed out: Shared device stays on the device');
  ok(p.errors.length === 0, 'head chef settings: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
