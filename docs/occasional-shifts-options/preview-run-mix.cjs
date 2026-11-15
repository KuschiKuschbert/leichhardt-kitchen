const src = require('fs').readFileSync(__dirname + '/preview.js', 'utf8');
eval(src.split("(async () => {")[0] + `
(async () => {
  await new Promise(r => srv.listen(8777, '127.0.0.1', r));
  const b = await L.start();
  const v = 'R';
  for (const w of [390, 768, 1280]) {
    let p = await team(b, v, w);
    await p.locator('[data-p="tm-add-staff"]').first().click(); await L.settle(p, 300);
    log(v + ' ' + w + ' services fieldset px', await p.$eval('.tm-quick-services', e => Math.round(e.getBoundingClientRect().height)));
    log(v + ' ' + w + ' services shown', await p.$eval('.tm-quick-services', e => [...e.querySelectorAll('label,button')].map(x => x.textContent.trim() + (x.querySelector('input') && x.querySelector('input').checked ? ' [x]' : ''))));
    await p.locator('.tm-quick-add').screenshot({ path: OUT + 'R-addstaff-' + w + '.png' });
    await p.locator('[data-p="tm-occ-show"]').click(); await L.settle(p, 300);
    log(v + ' ' + w + ' after + Smoker in Add staff', { focus: await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-k')), boxes: await p.$eval('.tm-quick-services', e => [...e.querySelectorAll('label')].map(x => x.textContent.trim() + (x.querySelector('input').checked ? ' [x]' : ''))), px: await p.$eval('.tm-quick-services', e => Math.round(e.getBoundingClientRect().height)) });
    if (w === 390) await p.locator('.tm-quick-add').screenshot({ path: OUT + 'R-addstaff-shown-390.png' });
    await p.locator('[data-p="tm-add-staff"]').first().click(); await L.settle(p, 300);
    await p.context().close();
    p = await team(b, v, w);
    await p.locator('[data-p="tm-focus"][data-id="ann"]').click(); await L.settle(p, 400);
    log(v + ' ' + w + ' detail chips', await p.$eval('.tm-bench-shifts', e => ({ h: Math.round(e.getBoundingClientRect().height), t: [...e.querySelectorAll('button')].map(x => x.textContent) })));
    await p.locator('.tm-detail-workbench').screenshot({ path: OUT + 'R-details-' + w + '.png' });
    await p.locator('[data-p="tm-on"][data-occ="1"][data-id="ann"]').click(); await L.settle(p, 400);
    log(v + ' ' + w + ' after + Smoker in details', { focus: await p.evaluate(() => { const a = document.activeElement; return a && (a.getAttribute('data-p') + ':' + a.getAttribute('data-v')); }), chips: await p.$eval('.tm-bench-shifts', e => [...e.querySelectorAll('button')].map(x => x.textContent + (x.getAttribute('aria-pressed') === 'true' ? ' [pressed]' : ''))), msg: await p.evaluate(() => (document.body.innerText.match(/Ann added to Smoker[^\\n]*/) || [''])[0]), cell: await p.locator('select[data-k="tm-sec:ann:smoker"]').count() });
    await p.locator('.tm-detail-workbench').screenshot({ path: OUT + 'R-added-' + w + '.png' });
    if (w === 390) await p.screenshot({ path: OUT + 'R-page-390.png' });
    if (w === 1280) await p.screenshot({ path: OUT + 'R-page-1280.png', fullPage: true });
    await p.locator('[data-p="tm-on"][data-id="ann"][data-sh="smoker"]').click(); await L.settle(p, 300);
    log(v + ' ' + w + ' remove then add', { chips: await p.$eval('.tm-bench-shifts', e => [...e.querySelectorAll('button')].map(x => x.textContent)), add: await p.$$eval('[data-p="tm-on"]', l => l.map(x => x.textContent)) });
    log(v + ' ' + w + ' errors', p.errors);
    await p.context().close();
  }
  // tasks at 390
  let p = await team(b, v, 390); taps = 0;
  await tap(p, '[data-p="tm-focus"][data-id="ann"]'); await tap(p, '[data-p="tm-on"][data-occ="1"][data-id="ann"]');
  await L.waitFor(p, () => !!document.querySelector('select[data-k="tm-sec:ann:smoker"]'), null, 4000);
  await choose(p, 'select[data-k="tm-sec:ann:smoker"]', 'larder');
  log('R task1 Ann onto Smoker taps', { taps, ok: await p.$eval('select[data-k="tm-sec:ann:smoker"]', e => e.value) === 'larder' });
  await p.context().close();
  p = await team(b, v, 390); taps = 0;
  await tap(p, '[data-p="tm-add-staff"]'); await tap(p, '[data-p="tm-occ-show"][data-v="smoker"]'); await tap(p, '[data-k="tm-quick-shift:lunch"]');
  await tap(p, '[data-k="tm-quick-person:gus"]'); await tap(p, '[data-p="tm-quick-add"]');
  await L.waitFor(p, () => !!document.querySelector('select[data-k="tm-sec:gus:smoker"]'), null, 4000);
  await choose(p, 'select[data-k="tm-sec:gus:smoker"]', 'larder');
  log('R task2 Gus onto Smoker only taps', { taps, cells: await p.evaluate(() => [...document.querySelectorAll('select[data-k^="tm-sec:gus:"]')].map(e => e.getAttribute('data-k'))) });
  await p.context().close();
  // break tools Smoker then Add staff
  p = await team(b, v, 390);
  await L.pick(p, 'select[data-k="tm-tool-sh"]', 'smoker'); await L.settle(p, 300);
  await p.locator('[data-p="tm-add-staff"]').first().click(); await L.settle(p, 300);
  log('R breakit default tick after tools=Smoker', await p.$eval('.tm-quick-services', e => [...e.querySelectorAll('label,button')].map(x => x.textContent.trim() + (x.querySelector('input') && x.querySelector('input').checked ? ' [x]' : ''))));
  await p.context().close();
  // empty day: Add staff open by itself
  p = await L.open(b, '#/team', { who: 'sam', width: 390, height: 844, extra: { [CFG]: cfg(shifts) }, wait: 1500, init: 'window.__occ="R"' });
  await L.waitFor(p, () => !!document.querySelector('.tm-quick-services'), null, 8000);
  log('R empty day services', await p.$eval('.tm-quick-services', e => [...e.querySelectorAll('label,button')].map(x => x.textContent.trim() + (x.querySelector('input') && x.querySelector('input').checked ? ' [x]' : ''))));
  await p.context().close();
  // long names and three services worked, 390
  const long = [{ id: 'lunch', name: 'Lunch service', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner service', from: 960, to: 1320 }, { id: 'late', name: 'Late prep', from: 720, to: 1000 }, { id: 'smoker', name: 'Evening preparation and smoker', from: 360, to: 660, occ: true }];
  const plan3 = Object.assign({}, plan, { on: plan.on.concat([{ id: 'ann', sh: 'late', sec: '' }]) });
  p = await L.open(b, '#/team', { who: 'sam', width: 390, height: 844, extra: { [CFG]: cfg(long), [TEAM]: plan3 }, wait: 1500, init: 'window.__occ="R"' });
  await L.waitFor(p, () => !!document.querySelector('select[data-k="tm-sec:ann:dinner"]'), null, 8000);
  await p.locator('[data-p="tm-add-staff"]').first().click(); await L.settle(p, 300);
  log('R long names 390 services', { px: await p.$eval('.tm-quick-services', e => Math.round(e.getBoundingClientRect().height)), overflow: await L.overflow(p) });
  await p.locator('.tm-quick-add').screenshot({ path: OUT + 'R-long-addstaff-390.png' });
  await p.locator('[data-p="tm-add-staff"]').first().click(); await L.settle(p, 300);
  await p.locator('[data-p="tm-focus"][data-id="ann"]').click(); await L.settle(p, 400);
  await p.locator('.tm-detail-workbench').screenshot({ path: OUT + 'R-long-details-390.png' });
  log('R long names 390 chips', { h: await p.$eval('.tm-bench-shifts', e => Math.round(e.getBoundingClientRect().height)), overflow: await L.overflow(p), errors: p.errors });
  await p.context().close();
  for (const w of [390, 1280]) {
    const a = await L.open(b, '#/admin', { admin: true, width: w, height: 1000, extra: { [CFG]: cfg(shifts) }, wait: 1500, init: 'window.__occ="R"' });
    await L.kitchenRow(a, 'shifts', 500);
    await a.locator('.a-ks.a-sh').first().screenshot({ path: OUT + 'R-admin-shifts-' + w + '.png' });
    log('R admin ' + w + ' px', await a.$eval('.a-ks.a-sh', e => Math.round(e.getBoundingClientRect().height)));
    await a.context().close();
  }
  require('fs').writeFileSync(OUT + 'results-R.json', JSON.stringify(results, null, 1));
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
`);
