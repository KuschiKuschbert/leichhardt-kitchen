const path = require('node:path');
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();

const itemSearch = '[data-sf="q"]';
const historySearch = '[data-sf="historyQ"]';
const supplierRoute = '#/suppliers/northside';
const views = {
  order: { field: itemSearch, rows: '.su-row[data-item]', query: 'stock', id: 't-stock', total: 6 },
  catalogue: { field: itemSearch, rows: '.su-catalogue-row [data-su="edit"][data-i]', query: 'stock', id: 't-stock', total: 6 },
  history: { field: historySearch, rows: '[data-su="history-order"]', query: 'zero', id: 'older', total: 2 }
};

const state = (input, rows) => input.evaluate((el, selector) => ({
  value: el.value,
  query: el.dataset.committedQuery,
  focused: document.activeElement === el,
  start: el.selectionStart,
  end: el.selectionEnd,
  ids: Array.from(document.querySelectorAll(selector), row => row.dataset.item || row.dataset.id || row.dataset.i)
}), rows);

const traffic = page => page.evaluate(() => ({
  reads: window.__fake.bill.filter(row => /\/suppliers(?:\/|$)/.test(row.path)).length,
  writes: window.__fake.writes.length
}));

async function checkSearch(page, name, width) {
  const view = views[name], input = page.locator(view.field), prefix = `${width} ${name}`;
  const before = await traffic(page);
  await input.focus();
  const samples = [];
  for (const key of view.query) {
    await page.keyboard.press(key);
    await L.settle(page, 180);
    samples.push(await state(input, view.rows));
  }
  const full = samples.at(-1);
  ok(samples.every((sample, i) => sample.focused && sample.value === view.query.slice(0, i + 1) && sample.start === i + 1),
    `${prefix}: paced keys keep focus and type the whole item name (${full.value})`);
  ok(full.ids.length === 1 && full.ids[0] === view.id, `${prefix}: complete query narrows to the exact match (${full.ids.join(', ')})`);
  if (process.env.SUPPLIER_SEARCH_SHOTS) {
    await page.screenshot({ path: path.join(process.env.SUPPLIER_SEARCH_SHOTS, `${name}-${width}.png`), animations: 'disabled' });
  }

  // Give the later gestures the same starting query even when the paced keys failed on an older build.
  if (full.query !== view.query) {
    await input.fill(view.query);
    await L.waitFor(page, ([selector, query]) => document.querySelector(selector)?.dataset.committedQuery === query, [view.field, view.query]);
  }
  await input.evaluate(el => window.LK_UX.restoreFocus(el));
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Delete');
  await L.settle(page, 180);
  const removed = await state(input, view.rows);
  ok(removed.focused && removed.value === view.query[0] + view.query.slice(2) && removed.start === 1 && removed.ids.length === 0,
    `${prefix}: deleting a middle letter keeps the caret at the edit and refreshes the results`);
  await page.keyboard.press(view.query[1]);
  await L.settle(page, 180);
  const repaired = await state(input, view.rows);
  ok(repaired.focused && repaired.value === view.query && repaired.start === 2 && repaired.ids.length === 1 && repaired.ids[0] === view.id,
    `${prefix}: inserting at the caret restores the match`);
  const replaced = await input.evaluate(el => {
    window.LK_UX.restoreFocus(el);
    el.setSelectionRange(1, 3);
    window.dispatchEvent(new Event('offline'));
    return !el.isConnected;
  });
  const selection = await state(input, view.rows);
  ok(replaced && selection.focused && selection.start === 1 && selection.end === 3 && selection.value === repaired.value,
    `${prefix}: an independent redraw restores the current selection on the replacement search field`);

  await input.locator('..').getByRole('button', { name: 'Clear search' }).press('Enter');
  const cleared = await state(input, view.rows);
  ok(cleared.focused && cleared.start === 0 && cleared.value === '' && cleared.ids.length === view.total,
    `${prefix}: keyboard Clear restores all results and puts the caret back in the search`);

  if (!cleared.focused) await input.focus();
  await page.keyboard.press(view.query[0]);
  // Add the second letter and repaint on one JavaScript turn so the original debounce is still pending.
  const pending = await input.evaluate((el, term) => {
    el.value += term;
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: term }));
    window.dispatchEvent(new Event('offline'));
    const replacement = document.getElementById(el.id);
    return { focused: document.activeElement === replacement, value: replacement.value, query: replacement.dataset.committedQuery };
  }, view.query[1]);
  ok(pending.focused && pending.value === view.query.slice(0, 2) && pending.query === '',
    `${prefix}: an in-flight redraw keeps the input draft while the debounce waits`);
  await L.waitFor(page, ([selector, query]) => document.querySelector(selector)?.dataset.committedQuery === query, [view.field, view.query.slice(0, 2)]);
  const applied = await state(input, view.rows);
  ok(applied.focused && applied.start === 2, `${prefix}: the original debounce applies after the redraw with the caret intact`);
  const after = await traffic(page);
  ok(after.reads === before.reads && after.writes === before.writes, `${prefix}: search and Clear spend no supplier reads or writes`);
}

(async () => {
  const browser = await L.start();
  try {
    for (const [width, height] of [[390, 844], [768, 900], [1280, 800]]) {
      const page = await L.open(browser, supplierRoute, { who: 'bo', width, height, touch: width < 1280, extra: F.fixture() });
      await page.locator('.su-latest').waitFor({ state: 'attached' });
      await checkSearch(page, 'order', width);

      await page.locator('[data-su="history"]').press('Enter');
      await L.choose(page, '[data-su="history-order"][data-id="older"]');
      await checkSearch(page, 'history', width);
      const selectedOrder = page.locator('[data-su="history-order"][aria-pressed="true"]');
      const reuse = page.locator('[data-su="reuse"]');
      ok(await selectedOrder.getAttribute('data-id') === 'older' && await reuse.getAttribute('data-id') === 'older',
        `${width} history: the displayed date and reuse action still identify the same selected order`);
      await page.locator('[data-su="history-close"]').press('Enter');

      await page.locator('[data-su="manage"]').press('Enter');
      await page.locator('.su-catalogue-row').first().waitFor();
      await checkSearch(page, 'catalogue', width);
      ok(await page.evaluate(hash => location.hash === hash, supplierRoute), `${width}: supplier and catalogue stay on the original supplier route`);
      ok(page.errors.length === 0, `${width}: the supplier searches have no browser errors`);
      await page.context().close();
    }
    L.report(R);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); console.log(R.join('\n')); process.exit(1); });
