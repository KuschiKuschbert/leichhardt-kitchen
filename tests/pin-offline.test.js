// Typing your PIN with no signal: the screen says it is checking, then that it cannot check until the phone is back
// online, instead of staying silent with a "Not sent yet" strip meant for list writes (audit, October 2026). Picking
// your name with no signal says so too, and the PIN box comes by itself once the signal is back (28 Oct 2026).
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/prep', { who: 'ann', noTok: true, fakeMode: 'hold', wait: 1500 });
  ok(await p.$('#pf1') !== null, 'offline: the PIN screen is up');
  await p.type('#pf1', '2222');
  await L.settle(p, 400);
  ok(/Checking your PIN/.test(await txt(p, '#prep-root') || ''), 'offline: the screen says it is checking the PIN');
  await p.clock.runFor(9000);
  await L.settle(p, 300);
  ok(/No signal\. Your PIN cannot be checked/.test(await txt(p, '#prep-root') || ''), 'offline: after 8 seconds it says there is no signal');
  ok(await p.$('.p-sync') === null, 'offline: no "Not sent yet" strip on the PIN screen');
  ok(p.errors.length === 0, 'pin offline: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // A shared tablet with Who are you? up when the signal goes, and Bo taps his name (28 Oct 2026, r2-2-2). Whether he has
  // a PIN yet is a read, which fails with no signal: the screen says there is no signal, not "Could not check your PIN.
  // Check the connection.", and reads again by itself once the phone is back online, so his PIN box comes up.
  for (const w of [390, 768, 1280]) {
    const q = await L.open(b, '#/prep', { who: '', settings: { shared: true }, width: w, wait: 1500 });
    ok(await q.$('.p-name[data-id="bo"]') !== null, 'shared tablet at ' + w + ' px: Who are you? lists Bo');
    await q.evaluate(() => { window.__fake.cold = /./; window.__fake.mode = 'hold'; });
    await q.click('.p-name[data-id="bo"]'); await L.settle(q, 600);
    const t = await txt(q, '#prep-root') || '';
    ok(/No signal\. You can sign in once the phone is back online\./.test(t) && !/Could not check your PIN/.test(t), 'shared tablet at ' + w + ' px: picking a name with no signal says there is no signal (' + t.slice(0, 120) + ')');
    const o = await L.overflow(q);
    ok(!o, 'shared tablet at ' + w + ' px: no sideways scroll' + (o ? ' (' + o + ')' : ''));
    if (w === 768) {
      await q.evaluate(() => { window.__fake.warm(); window.dispatchEvent(new Event('online')); });
      ok(await L.waitFor(q, () => !!document.querySelector('#pf1') && !/No signal/.test(document.querySelector('#prep-root').textContent), null, 6000).then(() => true, () => false), 'shared tablet, signal back: Bo\'s PIN box comes up by itself');
    }
    ok(q.errors.length === 0, 'shared tablet at ' + w + ' px: no page errors ' + q.errors.join(' | '));
    await q.context().close();
  }
  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
