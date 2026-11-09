/* Review the prototype's interactions only, never the production persistence contract. */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '../..');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.join(root, 'tests'), path.resolve(root, '../../../tests')] }));
const server = require(path.join(root, 'tests/serve'));
const checks = [];
function ok(condition, label) { if (!condition) throw new Error(label); checks.push(label); }
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/docs/order-list-options/';
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium', headless: true, args: ['--hide-scrollbars'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const state = () => page.evaluate(() => window.ORDER_PREVIEW.getState());
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const tasks = [];
  for (const design of ['a', 'b', 'c']) {
    await page.goto(base + 'index.html?shot=1&design=' + design);
    await page.evaluate(() => document.fonts.ready);
    const first = page.locator('[data-action="item-tick"]').first();
    const firstId = await first.getAttribute('data-id');
    const before = await page.locator('.request-row').evaluateAll(rows => rows.map(e => ({ id: e.dataset.id, height: e.getBoundingClientRect().height })));
    await first.click();
    let current = await state();
    ok(current.items.filter(item => item.done).length === 1 && current.suppliers.every(supplier => !supplier.placed), design + ': one item tick never places a supplier order');
    const after = await page.locator('.request-row').evaluateAll(rows => rows.map(e => ({ id: e.dataset.id, height: e.getBoundingClientRect().height })));
    ok(before.every((row, i) => row.id === after[i].id && Math.abs(row.height - after[i].height) < 1), design + ': item tick preserves every row height and position in list');
    await page.locator('[data-action="item-tick"][data-id="' + firstId + '"]').first().click();
    ok((await state()).items.every(item => !item.done), design + ': item Undo restores request');
    if (design === 'c') await page.locator('.deadline-fold > summary').click();
    if (design === 'b') {
      await page.locator('[data-action="view-deadlines"]').click();
      ok(await page.evaluate(() => document.activeElement.id === 'supplier-deadlines'), 'B: View moves focus to the full deadline block');
    }
    const place = page.locator('[data-action="supplier-place"]').first();
    const sid = await place.getAttribute('data-id');
    await place.click(); current = await state();
    ok(current.suppliers.find(supplier => supplier.id === sid).placed && current.items.every(item => !item.done), design + ': supplier confirmation leaves all requests pending');
    await page.locator('[data-action="supplier-place"][data-id="' + sid + '"]').click();
    ok((await state()).suppliers.every(supplier => !supplier.placed), design + ': supplier Undo works independently');
    await page.locator('[data-action="add"]').click();
    ok(await page.locator('#add-dialog').evaluate(e => e.open), design + ': Add form opens in one tap');
    await page.locator('#item-name').fill('Example request without amount');
    await page.locator('#add-form [type="submit"]').click();
    ok((await state()).items.some(item => item.name === 'Example request without amount' && item.amount === ''), design + ': amount stays optional and submit is the second tap');
    await page.keyboard.press('Escape');
    await page.locator('#add-dialog:not([open])').waitFor({ state: 'attached' });
    await page.locator('[data-action="add"]:focus').waitFor();
    ok(!await page.locator('#add-dialog').evaluate(e => e.open) && await page.evaluate(() => document.activeElement.dataset.action === 'add'), design + ': Escape closes form and returns focus');
    await page.goto(base + 'index.html?shot=1&design=' + design + '&state=offline');
    if (design === 'c') await page.locator('.deadline-fold > summary').click();
    ok(await page.locator('[data-action="supplier-place"]').evaluateAll(buttons => buttons.every(button => button.disabled)), design + ': offline supplier confirmations are disabled');
    await page.locator('[data-action="item-tick"]').first().click();
    current = await state();
    ok(current.items.every(item => !item.done) && current.items.some(item => item.pending), design + ': offline item tick reports Not sent without successful completion');
    await page.goto(base + 'index.html?shot=1&design=' + design + '&state=tomorrow');
    if (design === 'c') await page.locator('.deadline-fold > summary').click();
    ok(/tomorrow/.test(await page.locator('[data-action="supplier-place"][data-id="west-bay"]').getAttribute('aria-label')), design + ': early confirmation explicitly names tomorrow');
    tasks.push({ design, addFormEntry: 1, addThroughSubmitExcludingTypingAndClose: 2, itemOrdered: 1, supplierPlacedPhoneFromInitialState: design === 'a' ? 1 : 2, supplierPlacedDesktopFromInitialState: design === 'c' ? 2 : 1 });
  }
  await page.goto(base + 'orders-designs.html?view=compare');
  await page.locator('iframe').last().waitFor();
  const frames = page.frames().filter(frame => frame.parentFrame());
  await Promise.all(frames.map(frame => frame.waitForSelector('.request-row')));
  ok(frames.length === 3, 'Standalone download renders all three comparison frames');
  ok(errors.length === 0, 'No JavaScript errors during interaction checks');
  fs.writeFileSync(path.join(__dirname, 'preview-interactions.json'), JSON.stringify({ kind: 'Prototype interaction checks, not app or server verification', checks, tasks, errors }, null, 2) + '\n');
  console.log(JSON.stringify({ checks: checks.length, tasks, errors }, null, 2));
  await browser.close(); server.close();
})().catch(error => { console.error(error); process.exit(1); });
