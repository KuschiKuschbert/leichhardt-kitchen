// Supplier Back controls keep order quantities and ask before discarding catalogue changes.
// All catalogue records are synthetic and all saves use the Firebase stand-in.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();
const qty = 'input[data-sf="qty"][data-i="t-stock"]';
const action = (p, cmd) => p.click('[data-su="' + cmd + '"]');
const localBack = p => p.evaluate(() => window.LK_SUP.back());
const back = '.wtop [data-act="back"]';
const label = p => p.getAttribute(back, 'aria-label');
const data = p => p.evaluate(() => JSON.stringify(window.__fake.dump()));
async function ready(p) { await L.waitFor(p, selector => !!document.querySelector(selector), qty, 15000); }
async function open(b, width) {
  const p = await L.open(b, '#/suppliers/northside', { who: 'bo', extra: F.fixture(), width: width || 390, wait: 1800 });
  await ready(p); return p;
}

(async () => {
  const b = await L.start();
  let p = await open(b), initial = await data(p);
  await p.fill(qty, '4 kg');
  await action(p, 'review');
  await L.waitFor(p, () => { const e = document.querySelector('[data-su="record"]'); return e && !e.disabled; }, null, 10000);
  ok(await p.locator(back).count() === 1 && !(await p.$('[data-su="review-close"]')), 'review uses one header arrow without duplicate return buttons');
  ok(await p.locator('#rtitle').count() === 1 && await L.txt(p, '#rtitle') === 'Review order' && !(await p.$('.su-head, .su-tools, .su-side')), 'review shows one task heading above the order instead of repeating workspace tools');
  ok(await label(p) === 'Back to draft', 'shared Back identifies the draft behind order review');
  await p.click(back); await ready(p);
  ok(await p.$eval(qty, e => e.value) === '4 kg', 'Back to draft retains the entered order quantity');
  ok(await p.evaluate(() => document.activeElement?.getAttribute('data-su') === 'review'), 'leaving review returns focus to Review order');
  await action(p, 'history');
  await L.waitFor(p, () => !!document.querySelector('[data-su="history-order"][data-id="older"]'), null, 5000);
  await action(p, 'history-order'); await p.click(back);
  ok(await p.$eval('[data-su="history"]', e => e.getAttribute('aria-expanded') === 'false') && await p.$eval(qty, e => e.value) === '4 kg', 'Back from order history closes it and keeps the draft');
  ok(await data(p) === initial, 'review and history Back controls never write an order or catalogue change');

  await action(p, 'manage'); await action(p, 'edit');
  ok(await label(p) === 'Back to catalogue', 'item editor exposes its catalogue parent');
  await p.fill('[data-sf="par"]', '12'); await p.click(back);
  ok(await p.$eval('[data-sf="par"]', e => e.value) === '12' && /not saved/.test(await L.txt(p, '.su-status')), 'first Back preserves an edited par and explains that it is unsaved');
  ok(await label(p) === 'Back to catalogue' && /Back again/.test(await L.txt(p, '#su-leave-note')) && await p.getAttribute(back, 'aria-describedby') === 'su-leave-note', 'discard feedback is separate from the stable header arrow label and described to assistive technology');
  await p.fill('[data-sf="par"]', '13');
  ok(await label(p) === 'Back to catalogue' && !(await p.$('#su-leave-note')) && !(await p.getAttribute(back, 'aria-describedby')), 'typing again clears the armed discard note and accessible description');
  await localBack(p);
  ok(await p.$eval('[data-sf="par"]', e => e.value) === '13', 'Back after a further edit asks again instead of discarding the new value');
  await localBack(p);
  ok(!(await p.$('[data-sf="par"]')) && await p.evaluate(() => document.activeElement?.getAttribute('data-su') === 'edit'), 'confirmed Back returns to the catalogue and restores focus to the item');
  ok(await data(p) === initial, 'discarding the unsaved par leaves the saved catalogue unchanged');

  await action(p, 'supplier-settings'); await p.fill('[data-sf="supplierName"]', 'TEST CHANGED NAME');
  ok(await L.txt(p, '#rtitle') === 'Supplier settings' && !(await p.$('[data-su="supplier-close"]')) && await label(p) === 'Back to catalogue', 'supplier settings use the header arrow and a single current-task heading');
  await localBack(p);
  ok(await p.$eval('[data-sf="supplierName"]', e => e.value) === 'TEST CHANGED NAME', 'first Back keeps the supplier settings form');
  await localBack(p);
  ok(!(await p.$('[data-sf="supplierName"]')) && await data(p) === initial, 'confirmed Back closes supplier settings without writing the edited name');

  const payload = { version: 1, suppliers: [{ id: 'northside', name: 'Northside Test Foods', cutoffId: 'northside', items: F.items }] };
  await p.setInputFiles('[data-sf="import"]', { name: 'synthetic-catalogue.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload)) });
  await L.waitFor(p, () => !!document.querySelector('[data-su="import-apply"]'), null, 5000);
  ok(await L.txt(p, '#rtitle') === 'Review catalogue import' && !(await p.$('[data-su="import-cancel"]')) && await label(p) === 'Back to catalogue', 'import review uses the header arrow above its reminder links');
  await localBack(p);
  ok(!!(await p.$('[data-su="import-apply"]')) && /not saved/.test(await L.txt(p, '.su-status')), 'first Back keeps an unsubmitted import and asks before discarding it');
  await localBack(p);
  ok(!(await p.$('[data-su="import-apply"]')) && await data(p) === initial, 'confirmed Back discards only the import preview and makes no catalogue writes');
  await localBack(p); await ready(p);
  ok(await p.$eval(qty, e => e.value) === '4 kg', 'Back from catalogue returns to the supplier draft with its original quantity');
  ok(await localBack(p) === false, 'the supplier order sheet hands Back to the app after its local steps are closed');
  ok(!(await L.overflow(p)), 'supplier Back controls and discard explanations fit a phone');
  ok(p.errors.length === 0, 'supplier Back journey has no page errors: ' + p.errors.join(' | '));
  await p.context().close();

  // A native route Back can return to the retained editor, even when the form was not saved.
  p = await open(b, 1280); await action(p, 'manage'); await action(p, 'edit');
  await p.fill('[data-sf="par"]', '17');
  await p.evaluate(() => { location.hash = '#/orders'; });
  await L.waitFor(p, () => !!document.querySelector('.nb-page'), null, 5000);
  await p.goBack();
  await L.waitFor(p, () => !!document.querySelector('[data-sf="par"]'), null, 10000);
  ok(await p.$eval('[data-sf="par"]', e => e.value) === '17', 'returning from another page retains an unsaved supplier par form');
  const beforeCrossSupplier = await data(p);
  await p.evaluate(() => { location.hash = '#/suppliers/west-bay/manage'; });
  await L.waitFor(p, () => !!document.querySelector('[data-su="edit"][data-i="w-one"]'), null, 10000);
  ok(!(await p.$('[data-sf="par"]')) && !(await p.$('[data-su="save-item"]')), 'a different supplier route never shows the previous supplier\'s par form or Save');
  ok(await data(p) === beforeCrossSupplier, 'cross-supplier navigation makes no catalogue writes');
  await p.goBack();
  await L.waitFor(p, () => !!document.querySelector('[data-sf="par"]'), null, 10000);
  ok(await p.$eval('[data-sf="par"]', e => e.value) === '17', 'Back to the original supplier restores its own unsaved par form');
  await p.evaluate(() => { window.__fake.liteCommitDelay = 700; });
  await action(p, 'save-item');
  ok(await p.evaluate(() => window.LK_SUP.backDisabled()) && await p.isDisabled(back) && await localBack(p), 'Back reports a pending save as blocked and consumes the action');
  ok(!!(await p.$('[data-sf="par"]')), 'pending save Back keeps the same supplier form on screen');
  await L.waitFor(p, () => !document.querySelector('[data-sf="par"]'), null, 5000);
  ok(!await p.evaluate(() => window.LK_SUP.backDisabled()), 'Back becomes available once the catalogue save is acknowledged');
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'desktop supplier Back and pending-save journey fits without errors');
  await p.context().close();
  // A retained form is restored by its original route, but cannot intercept a different visible task.
  p = await L.open(b, '#/suppliers/northside/manage', { who: 'bo', extra: F.fixture(), wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('[data-su="edit"][data-i="t-stock"]'), null, 10000);
  await action(p, 'edit'); await p.fill('[data-sf="par"]', '17');
  const retainedData = await data(p);
  await p.evaluate(() => { location.hash = '#/suppliers/northside'; }); await ready(p);
  ok(await L.txt(p, '#rtitle') === 'Supplier order' && !(await p.$('[data-sf="par"]')) && await p.evaluate(() => window.LK_SUP.backLabel() === ''), 'order route shows its own return instead of the retained par editor parent');
  await p.click(back);
  await L.waitFor(p, () => !!document.querySelector('[data-sf="par"]'), null, 10000);
  ok(await p.$eval('[data-sf="par"]', e => e.value) === '17' && !(await p.$('#su-leave-note')) && await data(p) === retainedData, 'one order-route Back restores the original par form without discarding or writing its hidden edits');
  await p.context().close();

  p = await open(b); await p.fill(qty, '4 kg'); await action(p, 'review');
  await L.waitFor(p, () => { const e = document.querySelector('[data-su="record"]'); return e && !e.disabled; }, null, 10000);
  const reviewData = await data(p);
  await p.evaluate(() => { location.hash = '#/suppliers/west-bay'; });
  await L.waitFor(p, () => !!document.querySelector('[data-sf="qty"][data-i="w-one"]'), null, 10000);
  ok(await L.txt(p, '#rtitle') === 'Supplier order' && !(await p.$('.su-review, [data-su="record"]')) && await p.evaluate(() => window.LK_SUP.backLabel() === ''), 'another supplier route displays its own order sheet without the retained supplier review or Record action');
  await p.click(back);
  await L.waitFor(p, () => !!document.querySelector('.su-review'), null, 10000);
  ok(/Northside Test Foods/.test(await L.txt(p, '.su-review')) && /4 kg/.test(await L.txt(p, '.su-lines')) && await data(p) === reviewData, 'returning to the original supplier restores its exact review without saving or changing supplier drafts');
  await p.click(back); await ready(p);
  ok(await p.$eval(qty, e => e.value) === '4 kg', 'restored review returns to its original supplier draft with the same quantity');
  await p.context().close();

  // A timed-out recording stays locked, with a direct recovery link if the route changed meanwhile.
  p = await open(b); await p.fill(qty, '5 kg'); await action(p, 'review');
  await L.waitFor(p, () => { const e = document.querySelector('[data-su="record"]'); return e && !e.disabled; }, null, 10000);
  await p.evaluate(() => { window.__fake.liteCommitDelay = 25000; }); await action(p, 'record');
  await L.waitFor(p, () => window.LK_SUP.backDisabled(), null, 5000);
  await p.evaluate(() => { location.hash = '#/suppliers/west-bay'; });
  await L.waitFor(p, () => !!document.querySelector('#su-recording-status'), null, 10000);
  ok(await p.isDisabled(back) && /Northside Test Foods/.test(await L.txt(p, '#su-recording-status')) && await p.getAttribute('[data-su-recovery]', 'href') === '#/suppliers/northside', 'hidden pending recording explains the blocked Back action and links to its supplier review');
  ok(await L.txt(p, '#rtitle') === 'Confirm order recording' && !(await p.$('#supplier-root [data-su], #supplier-root input, #supplier-root select, .su-side')), 'hidden pending recording offers recovery only, without workspace controls that could replace its unresolved draft');
  await p.clock.fastForward(21000); await L.settle(p, 300);
  ok(await p.isDisabled(back) && /needs confirmation/.test(await L.txt(p, '#su-recording-status')) && !(await p.$('[data-su="record"]')), 'an uncertain recording remains blocked without exposing another supplier record action');
  ok(!(await p.$('#supplier-root [data-su], #supplier-root input, #supplier-root select, .su-side')), 'uncertain recording keeps catalogue, supplier switching and quantity edits unavailable until recovery');
  await p.click('[data-su-recovery]');
  await L.waitFor(p, () => !!document.querySelector('.su-review'), null, 10000);
  ok(/Northside Test Foods/.test(await L.txt(p, '.su-review')) && /5 kg/.test(await L.txt(p, '.su-lines')) && await p.isDisabled(back), 'recovery link restores the unresolved review and its exact quantity safely');
  await p.evaluate(() => { window.__fake.liteCommitDelay = 0; }); await p.clock.fastForward(6000); await L.settle(p, 300);
  await action(p, 'record'); await ready(p);
  ok(await p.evaluate(pre => Object.keys(window.__fake.dump()).filter(k => k.startsWith(pre)).length === 3, F.key(['suppliers', 'northside', 'orders']) + '/'), 'retry after a late acknowledgement records one order snapshot without duplication');
  await p.context().close();

  for (const width of [390, 768, 1280]) {
    p = await L.open(b, '#/suppliers/northside', { who: 'bo', extra: F.fixture(), width, settings: { text: 'xlarge' }, wait: 1800 });
    await ready(p); await p.fill(qty, '6 kg'); await action(p, 'review');
    await L.waitFor(p, () => !!document.querySelector('.su-review'), null, 5000); await L.settle(p, 300);
    ok(await p.evaluate(() => scrollY === 0 && document.querySelector('.wtop').getBoundingClientRect().top === 0), width + ': entering review leaves its header arrow visible at the top');
    ok(await p.locator(back).count() === 1 && await p.locator('#rtitle').count() === 1 && !(await p.$('.su-head, .su-tools, .su-workspace-tools, .su-side')) && !(await L.overflow(p)), width + ': enlarged-text review has one task heading and header return with no repeated workspace or sideways scroll');
    await p.click(back); await ready(p);
    ok(await p.$eval(qty, e => e.value) === '6 kg', width + ': compact review return preserves the exact quantity');
    await action(p, 'manage'); await action(p, 'edit'); await L.settle(p, 300);
    ok(await p.evaluate(() => scrollY === 0 && document.querySelector('.wtop').getBoundingClientRect().top === 0), width + ': entering the par editor leaves its header arrow visible at the top');
    ok(await p.locator('#rtitle').count() === 1 && /Edit par/.test(await L.txt(p, '#rtitle')) && !(await p.$('[data-su="editor-close"], .su-head, .su-tools, .su-side')) && !(await L.overflow(p)), width + ': enlarged-text par editor has one task heading and no duplicated return controls');
    await p.context().close();
  }
  await b.close(); L.report(R);
})();
