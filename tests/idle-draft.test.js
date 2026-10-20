// The desktop idle lock (7.5 minutes without a mouse or key) asks for the PIN again but keeps an unsaved staff list,
// so a sous chef carries on where they were (audit, October 2026).
const L = require('./lib');
const { R, ok } = L.results();
const has = async (page, name) => { const t = await page.evaluate(() => document.getElementById('prep-root').textContent + ' ' + Array.from(document.querySelectorAll('#prep-root input')).map(i => i.value).join(' ')); return t.indexOf(name) >= 0; };
(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/prep', { width: 1280, height: 800, wait: 1500 });
  await L.chef(p, 'staff');
  await p.waitForTimeout(300);
  await p.fill('[data-k="a-bulk"]', 'Zed');
  await p.click('[data-p="a-bulk-add"]');
  await p.waitForTimeout(200);
  ok(await has(p, 'Zed'), 'staff page: Zed added to the draft');
  await p.clock.runFor(8 * 60000);
  await p.waitForTimeout(300);
  ok(await p.$('#pf1') !== null, 'idle lock: the PIN screen is back after 8 minutes without a touch');
  await p.type('#pf1', '1111');
  await p.waitForTimeout(800);
  ok(await p.$('[data-k="a-bulk"]') !== null, 'after the PIN: the staff page is open again');
  ok(await has(p, 'Zed'), 'after the PIN: Zed is still in the draft');
  ok(p.errors.length === 0, 'idle draft: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
