// Typing your PIN with no signal: the screen says it is checking, then that it cannot check until the phone is back
// online, instead of staying silent with a "Not sent yet" strip meant for list writes (audit, October 2026).
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/prep', { who: 'ann', noTok: true, fakeMode: 'hold', wait: 1500 });
  ok(await p.$('#pf1') !== null, 'offline: the PIN screen is up');
  await p.type('#pf1', '2222');
  await p.waitForTimeout(400);
  ok(/Checking your PIN/.test(await txt(p, '#prep-root') || ''), 'offline: the screen says it is checking the PIN');
  await p.clock.runFor(9000);
  await p.waitForTimeout(300);
  ok(/No signal\. Your PIN cannot be checked/.test(await txt(p, '#prep-root') || ''), 'offline: after 8 seconds it says there is no signal');
  ok(await p.$('.p-sync') === null, 'offline: no "Not sent yet" strip on the PIN screen');
  ok(p.errors.length === 0, 'pin offline: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
