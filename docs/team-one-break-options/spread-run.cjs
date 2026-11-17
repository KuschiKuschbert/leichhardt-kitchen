// The skeptic's round 2 case (17 Nov 2026): Mo with his default split, then Spread on Lunch, All day and Dinner.
// Today's page and A gave Mo 4 breaks and Dev 3; D leaves anyone with two breaks, or a break then, as they were.
const path = require('path');
const L = require(path.join(__dirname, '../../tests/lib'));
const F = require('./fixture.cjs');
(async () => {
  const srv = require(path.join(__dirname, '../../tests/serve'));
  await new Promise(r => srv.listen(8779, '127.0.0.1', r));
  const b = await L.start();
  for (const v of ['A', 'D']) {
    const p = await L.open(b, '#/admin', { admin: true, adminPage: 'plan', width: 1280, height: 900, extra: F.fixture(), wait: 1800, init: 'window.__ob=' + JSON.stringify(v) });
    await L.waitFor(p, () => document.querySelectorAll('.tm-person-row').length >= 9, null, 9000);
    await p.locator('[data-p="tm-ob-add"][data-id="mo"]').click(); await L.settle(p, 200);
    await p.locator('details.tm-batch > summary').click(); await L.settle(p, 150);
    const said = [];
    for (const sh of ['lunch', 'allday', 'dinner']) {
      await L.pick(p, 'select[data-k="tm-tool-sh"]', sh); await L.settle(p, 150);
      await p.locator('[data-p="tm-spread"]').click(); await L.settle(p, 200);
      said.push(await p.evaluate(() => { const m = document.body.innerText.match(/\d+ (breaks?|splits?) from[^\n]*/); return m ? String(m[0]) : ''; }));
    }
    const w = id => p.$eval('.tm-person-row[data-id="' + id + '"] .tm-roster-time', e => e.textContent);
    console.log(v + ' after Spread on Lunch, All day, Dinner: ' + JSON.stringify({ mo: await w('mo'), dev: await w('dev'), said, errors: p.errors }));
    await p.context().close();
  }
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
