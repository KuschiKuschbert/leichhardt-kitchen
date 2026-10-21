// A refused write when the PIN still holds (a right the rules do not give, or rules behind the code) says so and keeps
// the person signed in, instead of bouncing them to the PIN screen for a loop. A PIN that no longer counts still
// bounces (19 Oct 2026).
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/prep', { who: 'ann', wait: 1200 });
  // only the prep line writes are refused; Ann's own activity record (the PIN check) still goes through
  await p.evaluate(() => { window.__fake.deny = /\/days\//; });
  await p.fill('#p-text', 'Crumb schnitzels');
  await p.press('#p-text', 'Enter');
  await L.settle(p, 700);
  const t1 = await txt(p, '.p-toast') || '';
  ok(/rules did not allow that for you\. Ask the head chef/.test(t1), 'rights refused: the message blames the rules, not the PIN (' + t1.trim() + ')');
  ok(/still in the box/.test(t1) && await p.inputValue('#p-text') === 'Crumb schnitzels', 'rights refused: the line is back in the box');
  ok(await p.$('#pf1') === null && /Writing as\s*Ann/.test(await txt(p, '.nb-top') || ''), 'rights refused: Ann stays signed in');
  // a PIN that no longer counts: everything is refused, so the page asks for the PIN again
  await p.evaluate(() => { window.__fake.deny = null; window.__fake.mode = 'deny'; });
  await p.press('#p-text', 'Enter');
  await L.settle(p, 700);
  ok(/sign in again with your PIN/.test(await txt(p, '.p-toast') || ''), 'stale PIN: still asks to sign in again');
  ok(await p.$('#pf1') !== null, 'stale PIN: the own PIN screen shows');
  ok(p.errors.length === 0, 'refused rights: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
