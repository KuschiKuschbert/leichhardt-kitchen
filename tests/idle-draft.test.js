// The desktop idle lock (7.5 minutes without a mouse or key) signs the person out like Sign out (since #387): back to
// Who are you?, and an unsaved staff list goes with them, so the next person never lands in it (29 Oct 2026 wording).
const L = require('./lib');
const { R, ok } = L.results();
const has = async (page, name) => { const t = await page.evaluate(() => document.getElementById('prep-root').textContent + ' ' + Array.from(document.querySelectorAll('#prep-root input')).map(i => i.value).join(' ')); return t.indexOf(name) >= 0; };
(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/prep', { width: 1280, height: 800, wait: 1500 });
  await L.chef(p, 'staff');
  await L.settle(p, 300);
  await p.fill('[data-k="a-bulk"]', 'Zed');
  await p.click('[data-p="a-bulk-add"]');
  await L.settle(p, 200);
  ok(await has(p, 'Zed'), 'staff page: Zed added to the draft');
  await p.clock.runFor(8 * 60000);
  await L.settle(p, 300);
  ok(await p.$('.p-name') !== null, 'idle lock: personal login is required after 8 minutes');
  await p.click('.p-name[data-id="sam"]'); await L.settle(p, 300);
  await p.type('#pf1', '1111');
  await L.settle(p, 800);
  await L.chef(p, 'staff'); await L.settle(p, 300);
  ok(await p.$('[data-k="a-bulk"]') !== null, 'after the PIN: staff management can be opened again');
  ok(!(await has(p, 'Zed')), 'idle lock discards the previous private staff draft');
  ok(p.errors.length === 0, 'idle draft: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
