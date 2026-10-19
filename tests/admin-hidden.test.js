// The Admin key button only shows on a phone or computer where the head chef has signed in and passed the owner check.
// Staff never see it. The way in for the first time is the Head chef sign in link on Settings, and #/admin still opens
// the Google sign-in card by its address.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
(async () => {
  const b = await L.start();
  // staff: no key in the top bar on the landing page, the prep list or the recipes
  for (const h of ['#/', '#/prep', '#/recipes']) {
    const p = await L.open(b, h, { who: 'ann', wait: 1200 });
    ok(await p.$('.wtop .adm') === null, 'staff ' + h + ': no Admin key in the top bar');
    ok(await p.$('.wtop a[href="#/settings"]') !== null, 'staff ' + h + ': Settings still there');
    ok(p.errors.length === 0, 'staff ' + h + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  // staff on Settings: a Head chef sign in link instead, which opens the sign-in card
  let p = await L.open(b, '#/settings', { who: 'ann', wait: 1000 });
  ok(await p.$('.wtop .adm') === null, 'staff settings: no Admin key');
  ok(await p.$('[data-k="adm-signin"]') !== null, 'staff settings: Head chef sign in link');
  await p.click('[data-k="adm-signin"]');
  await p.waitForTimeout(1200);
  ok(/Sign in with Google/.test(await txt(p, '#prep-root') || ''), 'staff: the link opens the Google sign-in card');
  ok(await p.$('.wtop .adm') === null, 'staff on #/admin: still no Admin key');
  ok(p.errors.length === 0, 'staff settings: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // the head chef's phone: nothing stored yet, the owner probe passes on the prep list and the key appears without a reload
  p = await L.open(b, '#/prep', { admin: true, who: 'ann', wait: 1800 });
  ok(await p.evaluate(() => localStorage.getItem('lk.admin')) === '1', 'head chef: lk.admin set by the owner probe');
  ok(await p.$('.wtop .adm.is-signed[href="#/admin"]') !== null, 'head chef #/prep: Admin key filled in, drawn after the probe');
  await p.click('.wtop .adm');
  await p.waitForTimeout(1500);
  ok(await p.$('[data-p="a-tab"]') !== null, 'head chef: the key opens the admin panel');
  ok(await p.$('.wtop .adm[aria-current="page"]') !== null, 'head chef #/admin: the key marks the page');
  ok(p.errors.length === 0, 'head chef: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // the head chef's Settings page: the sign-in link is gone, the hint says where the key is
  p = await L.open(b, '#/settings', { admin: true, who: 'ann', wait: 1800 });
  ok(await p.$('[data-k="adm-signin"]') === null, 'head chef settings: no sign-in link');
  ok(/signed in as the head chef/.test(await txt(p, '#app') || ''), 'head chef settings: hint says this device is signed in');
  ok(await p.$('.wtop .adm.is-signed') !== null, 'head chef settings: Admin key in the top bar');
  await p.context().close();
  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
