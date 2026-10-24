// Supplier Back controls keep order quantities and ask before discarding catalogue changes.
// All catalogue records are synthetic and all saves use the Firebase stand-in.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();
const qty = 'input[data-sf="qty"][data-i="t-stock"]';
const action = (p, cmd) => p.click('[data-su="' + cmd + '"]');
const localBack = p => p.evaluate(() => window.LK_SUP.back());
const label = p => p.locator('.page-return [data-act="back"]').innerText();
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
  ok(await p.locator('.su-review .su-supplier-title [data-su="review-close"]').isVisible(), 'review has an obvious Back to draft at its heading');
  ok(await label(p) === 'Back to draft', 'shared Back identifies the draft behind order review');
  await p.click('.page-return [data-act="back"]'); await ready(p);
  ok(await p.$eval(qty, e => e.value) === '4 kg', 'Back to draft retains the entered order quantity');
  ok(await p.evaluate(() => document.activeElement?.getAttribute('data-su') === 'review'), 'leaving review returns focus to Review order');
  await action(p, 'history');
  await L.waitFor(p, () => !!document.querySelector('[data-su="history-order"][data-id="older"]'), null, 5000);
  await action(p, 'history-order'); await action(p, 'history-close');
  ok(await p.$eval('[data-su="history"]', e => e.getAttribute('aria-expanded') === 'false') && await p.$eval(qty, e => e.value) === '4 kg', 'Back from order history closes it and keeps the draft');
  ok(await data(p) === initial, 'review and history Back controls never write an order or catalogue change');

  await action(p, 'manage'); await action(p, 'edit');
  ok(await label(p) === 'Back to catalogue', 'item editor exposes its catalogue parent');
  await p.fill('[data-sf="par"]', '12'); await action(p, 'editor-close');
  ok(await p.$eval('[data-sf="par"]', e => e.value) === '12' && /not saved/.test(await L.txt(p, '.su-status')), 'first Back preserves an edited par and explains that it is unsaved');
  ok(/Tap again/.test(await label(p)), 'shared Back explains the second press that would discard changes');
  await p.fill('[data-sf="par"]', '13');
  ok(await label(p) === 'Back to catalogue', 'typing again clears the armed discard action');
  await localBack(p);
  ok(await p.$eval('[data-sf="par"]', e => e.value) === '13', 'Back after a further edit asks again instead of discarding the new value');
  await localBack(p);
  ok(!(await p.$('[data-sf="par"]')) && await p.evaluate(() => document.activeElement?.getAttribute('data-su') === 'edit'), 'confirmed Back returns to the catalogue and restores focus to the item');
  ok(await data(p) === initial, 'discarding the unsaved par leaves the saved catalogue unchanged');

  await action(p, 'supplier-settings'); await p.fill('[data-sf="supplierName"]', 'TEST CHANGED NAME');
  ok(await p.locator('.su-editor .su-supplier-title [data-su="supplier-close"]').isVisible(), 'supplier settings have Back to catalogue at the heading');
  await localBack(p);
  ok(await p.$eval('[data-sf="supplierName"]', e => e.value) === 'TEST CHANGED NAME', 'first Back keeps the supplier settings form');
  await localBack(p);
  ok(!(await p.$('[data-sf="supplierName"]')) && await data(p) === initial, 'confirmed Back closes supplier settings without writing the edited name');

  const payload = { version: 1, suppliers: [{ id: 'northside', name: 'Northside Test Foods', cutoffId: 'northside', items: F.items }] };
  await p.setInputFiles('[data-sf="import"]', { name: 'synthetic-catalogue.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload)) });
  await L.waitFor(p, () => !!document.querySelector('[data-su="import-apply"]'), null, 5000);
  ok(await p.locator('.su-editor .su-supplier-title [data-su="import-cancel"]').isVisible(), 'import review has Back to catalogue above its reminder links');
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
  ok(await p.evaluate(() => window.LK_SUP.backDisabled()) && await localBack(p), 'Back reports a pending save as blocked and consumes the action');
  ok(!!(await p.$('[data-sf="par"]')), 'pending save Back keeps the same supplier form on screen');
  await L.waitFor(p, () => !document.querySelector('[data-sf="par"]'), null, 5000);
  ok(!await p.evaluate(() => window.LK_SUP.backDisabled()), 'Back becomes available once the catalogue save is acknowledged');
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'desktop supplier Back and pending-save journey fits without errors');
  await p.context().close(); await b.close(); L.report(R);
})();
