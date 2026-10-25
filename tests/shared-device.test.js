// Shared kitchen device (Settings): a tablet everyone picks up goes back to "Who are you?" after 10 minutes without a
// touch and on a new kitchen day, so the next person does not write under the last name. The kitchen PIN stays, so
// nothing is locked. A personal phone keeps the person signed in (19 Oct 2026).
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const state = p => p.evaluate(() => document.querySelector('#p-pin') ? 'kitchen-pin' : document.querySelector('.nb-guest') ? 'guest' : document.querySelector('.p-name') ? 'who' : document.querySelector('#pf1') ? 'own-pin' : document.querySelector('.nb-top') ? 'in:' + document.querySelector('.nb-top').textContent.replace(/\s+/g, ' ').trim() : 'other');
(async () => {
  const b = await L.start();
  // a shared tablet: 11 minutes without a touch and the names are back, the kitchen PIN is not asked
  let p = await L.open(b, '#/prep', { who: 'sam', touch: true, settings: { shared: true }, wait: 1200 });
  ok(/^in:Writing as Sam/.test(await state(p)), 'shared: Sam is signed in to start (' + await state(p) + ')');
  await p.clock.runFor(11 * 60000);
  await L.settle(p, 300);
  ok((await state(p)) === 'who', 'shared: after 11 minutes idle nobody is signed in and the lists are hidden and personal login is required (' + await state(p) + ')');
  ok(await p.evaluate(() => localStorage.getItem('lk.prep.pin')) !== '', 'shared: the kitchen PIN is still on the device');
  await p.goto(L.BASE + '#/guides'); await L.settle(p, 800);
  ok(await p.$('.p-name') !== null && await p.$('#p-pin') === null, 'shared: guides require a personal login');
  ok(p.errors.length === 0, 'shared idle: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a personal phone: 11 minutes idle changes nothing
  p = await L.open(b, '#/prep', { who: 'sam', touch: true, wait: 1200 });
  await p.clock.runFor(11 * 60000);
  await L.settle(p, 300);
  ok(/^in:Writing as Sam/.test(await state(p)), 'personal phone: still signed in after 11 minutes (' + await state(p) + ')');
  await p.context().close();

  // a new kitchen day on a shared device: the book opens on the names
  p = await L.open(b, '#/prep', { who: 'sam', touch: true, settings: { shared: true }, wait: 1200 });
  await p.evaluate(() => localStorage.setItem('lk.prep.day', '2020-01-01'));
  await p.reload({ waitUntil: 'load' }); await L.settle(p, 1200);
  ok((await state(p)) === 'who', 'shared, new day: the book opens with nobody signed in (' + await state(p) + ')');
  await p.context().close();
  p = await L.open(b, '#/prep', { who: 'sam', touch: true, wait: 1200 });
  await p.evaluate(() => localStorage.setItem('lk.prep.day', '2020-01-01'));
  await p.reload({ waitUntil: 'load' }); await L.settle(p, 1200);
  ok(/^in:Writing as Sam/.test(await state(p)), 'personal phone, new day: still signed in (' + await state(p) + ')');
  await p.context().close();

  // the switch lives in Settings on the head chef's signed-in device and is kept on the device
  p = await L.open(b, '#/settings', { admin: true, wait: 1800 });
  // Settings draws the owner-only block after the Google account check finishes. Wait for that actual UI, as the
  // following getAttribute and click already do, rather than assuming open() means the owner check is complete.
  await L.waitFor(p, () => !!document.querySelector('[data-act="setshared"][data-val="1"]'), null, 8000);
  ok(await p.$('[data-act="setshared"][data-val="1"]') !== null, 'settings: the Shared device choice is there');
  ok((await p.getAttribute('[data-act="setshared"][data-val="0"]', 'aria-pressed')) === 'true', 'settings: Personal phone is the default');
  await p.click('[data-act="setshared"][data-val="1"]');
  await L.settle(p, 200);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('lk.settings.v1') || '{}').shared === true), 'settings: Shared device is saved on the device');
  ok((await p.getAttribute('[data-act="setshared"][data-val="1"]', 'aria-pressed')) === 'true', 'settings: Shared device shows as chosen');
  ok(p.errors.length === 0, 'shared settings: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
