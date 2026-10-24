// Option B pieces (22 Oct 2026, head chef approved): the wastage action folds until wanted, the People how-to folds
// under one line. Recipe return now uses the approved header arrow, with no floating Zoom out control.
const L = require('./lib');
const { R, ok } = L.results();
const vis = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return !!e && e.getClientRects().length > 0; }, sel);
(async () => {
  const b = await L.start();

  let p = await L.open(b, '#/waste', { who: 'ann', wait: 1500 });
  ok(!(await p.$('#w-act')) && await vis(p, '.w-actbtn'), 'wastage: the action is folded under "+ Add an action (optional)"');
  await p.click('.w-actbtn'); await L.settle(p, 200);
  ok(await vis(p, '#w-act') && await p.evaluate(() => document.activeElement && document.activeElement.id === 'w-act'), 'wastage: a tap opens the action box with the cursor in it');
  ok(p.errors.length === 0, 'wastage: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/admin', { admin: true, wait: 1800 });
  await L.adminTab(p, 'people'); await L.settle(p, 300);
  ok(await p.evaluate(() => { const d = document.querySelector('details.a-how'); return !!d && !d.open && /How roles and ticks work/.test(d.querySelector('summary').textContent); }), 'admin People: the how-to is folded under "How roles and ticks work"');
  await p.click('details.a-how > summary'); await L.settle(p, 150);
  ok(/Pick a role/.test(await L.txt(p, 'details.a-how p') || '') && await vis(p, 'details.a-how p'), 'admin People: a tap shows it');
  // there is no Pings tick (20 Oct 2026): the how-to says who writes shift pings instead (23 Oct 2026)
  const how = await L.txt(p, 'details.a-how p') || '';
  ok(!/Pings lets/.test(how) && /Shift pings are written by you and the sous chefs/.test(how), 'admin People: the how-to names no Pings tick');
  ok(!(await p.evaluate(() => [...document.querySelectorAll('.a-pane input[disabled][title]')].some(e => /shift pings/.test(e.title)))), 'admin People: no locked tick says sous chefs can always write shift pings');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/r/barra', { wait: 1200 });
  const arrow = p.locator('.wtop [data-act="back"]'), z = await arrow.boundingBox();
  ok(z && z.width === 44 && z.height === 44 && await p.locator('.zoombar').count() === 0, 'recipe on a phone: one compact header arrow replaces the floating Zoom out control');
  await arrow.click(); await L.settle(p, 600);
  ok(/#\/recipes/.test(p.url()), 'recipe on a phone: it still goes back to the Pass');
  ok(p.errors.length === 0, 'recipe: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
