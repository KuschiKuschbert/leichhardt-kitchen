// The 04:00 refresh (js/upkeep.js): the book reloads itself once a day at about 04:00 kitchen time so a tablet left open
// shows the newest cards, but never while something is half written (it tries again 10 minutes later). Had no test
// before the 22 Oct 2026 review (D6).
const L = require('./lib');
const { R, ok } = L.results();
const reloaded = p => p.evaluate(() => window.__mark !== 1).catch(() => true);
(async () => {
  const b = await L.start();
  // the page opens at 14:00 kitchen time; 04:00 is 14 hours away
  let p = await L.open(b, '#/recipes', { wait: 1500 });
  await p.evaluate(() => { window.__mark = 1; });
  await p.clock.fastForward('13:58:00');
  await L.settle(p, 300);
  ok(!(await reloaded(p)), 'before 04:00: no reload');
  await p.clock.fastForward('00:03:00');
  await L.waitFor(p, () => window.__mark !== 1, null, 10000).catch(() => {});
  ok(await reloaded(p), 'at 04:00: the book reloads itself');
  ok(/#\/recipes/.test(p.url()), 'it stays on the same page');
  await p.context().close();

  // something half written on the prep list: no reload at 04:00, one 10 minutes later once it is gone
  // a phone (touch, no keyboard events), so the computer's 7.5 minute idle lock stays out of it
  p = await L.open(b, '#/prep', { touch: true, wait: 1500 });
  const type = v => p.evaluate(v => { const e = document.getElementById('p-text'); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, v);
  await type('Half a line');
  await p.evaluate(() => { window.__mark = 1; });
  await p.clock.fastForward('14:01:00');
  await L.settle(p, 500);
  ok(!(await reloaded(p)), 'half a line typed: no reload at 04:00');
  // after midnight a sous chef's list shows yesterday (no add box there); the half line is still held, so it is cleared
  // the way Add or Clear would leave it
  await p.evaluate(() => { window.LK_PREP.state.text = ''; window.LK_PREP.state.qty = ''; if (document.activeElement) document.activeElement.blur(); });
  await p.clock.fastForward('00:10:30');
  await L.waitFor(p, () => window.__mark !== 1, null, 10000).catch(() => {});
  ok(await reloaded(p), 'the box emptied: it reloads 10 minutes later');
  await p.context().close();

  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
