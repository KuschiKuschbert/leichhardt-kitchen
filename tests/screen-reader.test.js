// Screen reader and keyboard basics (usability U15): toasts are read out from one live region that is never redrawn,
// counts are not live regions, and after a tick with the keyboard the focus stays on a tick box.
const L = require('./lib');
const { R, ok } = L.results();
(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/prep', { width: 1280, height: 900, wait: 1500 });
  ok(await p.$('.nb-prog[role]') === null, 'the done count is not a live region');
  await p.focus('#nbr-i1 .nb-box'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-p')) === 'tick', 'after a tick the focus stays on a tick box');
  ok(/Ticked/.test(await p.evaluate(() => (document.getElementById('lk-live') || {}).textContent || '')), 'the toast is read out from the live region');
  ok(await p.$('.p-toast[role]') === null, 'the toast itself is not a second live region');
  await p.waitForTimeout(4000);
  ok(await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-p')) === 'tick', 'when the ticked line leaves, the focus moves to the next tick box');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  L.report(R);
})();
