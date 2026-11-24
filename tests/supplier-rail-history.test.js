// Supplier work and one inline order history, tested with the book's synthetic catalogue and order records.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();

const action = name => '[data-su="' + name + '"]';
const history = action('history');
const target = '#su-order-history';
const qty = '[data-sf="qty"][data-i="t-stock"]';
const stock = '[data-sf="stock"][data-i="t-stock"]';
const search = '[data-sf="q"]';
const path = F.key(['suppliers', 'northside', 'orders']);
const reads = p => p.evaluate(path => __fake.bill.filter(entry => entry.kind === 'lite-query' && entry.path === path).length, path);
const open = (browser, options) => L.open(browser, '#/suppliers/northside', { who: 'bo', height: 800, width: 1280, extra: F.fixture(), ...options });
const loaded = page => page.waitForSelector('.su-latest', { state: 'attached' });

(async () => {
  const browser = await L.start();
  let page = await open(browser);
  await loaded(page);
  const position = await page.evaluate(({ qty, history }) => {
    const bottom = document.querySelector('.su-order-actions').getBoundingClientRect().top;
    const fits = selector => {
      const box = document.querySelector(selector).getBoundingClientRect();
      return box.top >= 0 && box.bottom <= bottom;
    };
    return { qty: fits(qty), history: fits(history) };
  }, { qty, history });
  ok(position.qty && position.history, 'desktop first To order and Order history clear the Review bar at opening');
  ok(await page.locator('.su-side .su-info .su-cutoff').isVisible() && /Delivery/.test(await L.txt(page, '.su-cutoff')) &&
    await page.locator('.su-side .su-latest').isVisible() && await page.locator('.su-toolbar ' + history).count() === 1,
    'desktop rail shows original cut-off, delivery and Last order at the same time as quantities');
  ok(await reads(page) === 1, 'opening supplier reads only its existing recent order page');

  await page.fill(qty, '3');
  await page.fill(stock, '2');
  await page.fill(search, 'TEST STOCK');
  await L.waitFor(page, () => document.querySelectorAll('.su-row').length === 1);
  await page.evaluate(() => window.scrollTo({ top: 90, behavior: 'instant' }));
  const startY = await page.evaluate(() => scrollY);
  await page.locator(history).press('Enter');
  ok(await page.locator(history).getAttribute('aria-expanded') === 'true' && await page.locator('#su-history-title').evaluate(el => el === document.activeElement),
    'one keyboard action opens the existing history and focuses its heading');
  ok(await reads(page) === 1, 'opening loaded Order history causes no further order read');
  await L.choose(page, action('history-order') + '[data-id="older"]');
  ok(await page.locator(target + ' ' + action('history-order') + '[aria-pressed=true]').getAttribute('data-id') === 'older' &&
    /2 bags/.test(await L.txt(page, target + ' .su-lines')), 'the existing date chooser shows the correct older supplier quantities');
  await page.locator(action('history-close')).press('Enter');
  ok(await page.locator(history).evaluate(el => el === document.activeElement) &&
    Math.abs(await page.evaluate(() => scrollY) - startY) <= 1 && !await page.locator(target).isVisible(),
    'Back to draft restores the opening position and Order history focus');
  ok(await page.inputValue(qty) === '3' && await page.inputValue(stock) === '2', 'Back keeps To order and On hand');
  ok(await page.inputValue(search) === 'TEST STOCK' && await page.locator('.su-row').count() === 1, 'Back keeps the active product search');
  await page.locator(history).press('Enter');
  ok(await page.locator(target + ' ' + action('history-order') + '[aria-pressed=true]').getAttribute('data-id') === 'older', 'reopening retains the selected order');
  await page.locator('.wtop [data-act="back"]').click();
  ok(await page.locator(history).evaluate(el => el === document.activeElement) && !await page.locator(target).isVisible(), 'the shared Back returns to the same History action');

  await page.locator(history).focus();
  await page.setViewportSize({ width: 768, height: 900 });
  await page.waitForSelector('.su-order-context .su-info-line');
  ok(await page.locator('.su-order-context ' + history).evaluate(el => el === document.activeElement) &&
    await page.locator('.su-info').count() === 1 && await page.inputValue(qty) === '3',
    'resizing across the rail boundary moves one History action and retains its focus and the draft');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForSelector('.su-side .su-info .su-cutoff');
  await page.locator(action('collapse')).click();
  ok(await page.locator('.su-order-context .su-info-line').isVisible() && !(await page.locator('.su-cutoff').isVisible()),
    'hiding the wide rail reveals the compact context and its original More button');
  await page.locator(action('info')).press('Enter');
  ok(await page.locator(action('info')).evaluate(el => el === document.activeElement) &&
    await page.locator('.su-order-context .su-cutoff').isVisible() && await page.locator('.su-order-context .su-latest').isVisible(),
    'More in the rail-hidden fallback restores both blocks without losing keyboard focus');
  await L.clear(page, search);
  await L.waitFor(page, () => document.querySelectorAll('.su-row').length === 6);
  await page.locator(history).click();
  await page.evaluate(() => { location.hash = '#/suppliers/west-bay'; });
  await page.waitForSelector('[data-item="w-one"]');
  ok(await page.locator(history).getAttribute('aria-expanded') === 'false', 'another supplier route gets its own closed history');
  await page.locator(history).click();
  ok(/No orders recorded for this supplier/.test(await L.txt(page, target)) && !(await page.locator(target + ' .su-lines').count()),
    'opening a different supplier shows its own history and actual empty state');
  ok(!page.errors.length, 'navigation, history and rail resize have no browser errors');
  await page.context().close();

  page = await open(browser, { width:390, height:844, failReads:'/suppliers/northside/orders$' });
  await page.waitForSelector('.su-info.open ' + action('history-retry'));
  const beforeRetry = await reads(page);
  ok(/not read/i.test(await L.txt(page,'.su-info-line')), 'failed last-order read automatically opens the original compact context and its Retry');
  await page.locator(history).click();
  ok(await page.locator(target + ' ' + action('history-retry')).isVisible() &&
    !/No orders recorded/.test(await L.txt(page,target)) && await reads(page) === beforeRetry,
    'a failed History read is explicit and opening the section spends no additional query');
  await page.evaluate(() => { __fake.failReads = null; });
  await page.locator(target + ' ' + action('history-retry')).click();
  await page.waitForSelector(target + ' .su-lines');
  ok(await reads(page) === beforeRetry + 1 && /2 kg/.test(await L.txt(page,target + ' .su-lines')), 'Retry reads the one bounded page and restores actual quantities');
  ok(!page.errors.length, 'failure and Retry have no browser errors');
  await page.context().close();

  page = await open(browser, { width: 390, height: 844 });
  await loaded(page);
  await page.fill(qty, '7');
  const beforeFilter = await reads(page);
  const historySearch = target + ' [data-sf="historyQ"]';
  const date = id => target + ' ' + action('history-order') + '[data-id="' + id + '"]';
  const use = page.locator(target + ' ' + action('reuse'));
  const copy = page.locator(target + ' ' + action('copy-history'));
  const replace = page.locator(target + ' ' + action('reuse-confirm'));
  const find = page.locator(historySearch);
  const draftQuantity = () => page.inputValue(qty);
  const filter = async text => { await find.fill(text); await L.settle(page, 220); };
  const keepOld = selector => page.evaluate(selector => {
    window.oldHistoryAction = document.querySelector(selector)?.cloneNode(true);
  }, target + ' ' + selector);
  const dispatchOld = () => page.evaluate(target => {
    const node = window.oldHistoryAction;
    if (node) { document.querySelector(target).appendChild(node); node.click(); node.remove(); }
  }, target);
  await page.locator(history).click();
  await find.focus();
  for (const letter of 'test') { await page.keyboard.press(letter); await L.settle(page, 170); }
  ok(await find.evaluate(el => el.value === 'test' && el === document.activeElement && el.selectionStart === 4),
    'typing a history search keeps the full query and caret after results redraw');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Delete');
  await L.settle(page, 220);
  ok(await find.evaluate(el => el.value === 'tst' && el === document.activeElement && el.selectionStart === 1),
    'editing in the middle of the history search keeps the caret in place');
  await page.locator(target + ' .ux-search-clear').press('Enter');
  ok(await find.evaluate(el => el.value === '' && el === document.activeElement),
    'clearing with the keyboard returns focus to the history search');

  await keepOld(action('copy-history'));
  await page.evaluate(() => {
    window.historyCopies = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async text => { window.historyCopies.push(text); }
    } });
  });
  await filter('TEST ZERO PAR ITEM');
  ok(await page.locator(date('older')).count() === 1 && await page.locator(date('previous')).count() === 0 &&
    !await page.locator(target + ' .su-lines').count() && !await use.count() && !await copy.count(),
    'one matching date excludes the former selection, detail, Use and Copy until the date is chosen');
  await dispatchOld();
  ok(await page.evaluate(() => !window.historyCopies.length), 'an old Copy action cannot use a filtered-out order');
  await L.choose(page, date('older'));
  ok(await use.getAttribute('data-id') === 'older' && await copy.getAttribute('data-id') === 'older' &&
    /2 bags/.test(await L.txt(page, target + ' .su-lines')), 'choosing the match binds the detail, Use and Copy to one order');
  await copy.click();
  ok(await page.evaluate(() => window.historyCopies.length === 1 && /2 bags/.test(window.historyCopies[0])),
    'Copy uses the quantities on the selected order');

  await use.click();
  ok(await replace.count() === 1 && await draftQuantity() === '7', 'Use asks before replacing a typed amount');
  await keepOld(action('reuse-confirm'));
  await page.evaluate(selector => {
    const el = document.querySelector(selector);
    el.value = 'TEST STOCK';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    window.oldHistoryAction && document.querySelector('[data-su="reuse-confirm"]').click();
  }, historySearch);
  ok(await draftQuantity() === '7', 'a confirmation during the search debounce keeps the typed amount');
  await L.settle(page, 220);
  ok(await page.locator(date('older')).count() === 1 && await page.locator(date('previous')).count() === 1 &&
    await use.getAttribute('data-id') === 'older' && !await replace.count(),
    'a search change keeps a still-matching selection but cancels its pending replacement');
  await dispatchOld();
  ok(await draftQuantity() === '7', 'a delayed confirmation cannot replace the draft even when its date still matches');
  await page.fill(qty, '7');

  await use.click();
  await keepOld(action('reuse-confirm'));
  await L.choose(page, date('previous'));
  ok(await use.getAttribute('data-id') === 'previous' && !await replace.count(), 'changing the selected date cancels the earlier confirmation');
  await dispatchOld();
  ok(await draftQuantity() === '7', 'confirming a different selected order requires a fresh Use action');
  await page.fill(qty, '7');

  await use.click();
  await filter('nothing in this history matches');
  ok(/No loaded orders match your search/.test(await L.txt(page, target)) &&
    !await use.count() && !await copy.count() && !await replace.count() && await draftQuantity() === '7',
    'zero matches shows a scoped empty result without order actions or changes to the draft');
  await page.locator(target + ' .ux-search-clear').press('Enter');
  await L.choose(page, date('older'));
  await use.click();
  await replace.click();
  const result = await draftQuantity();
  const afterFilter = await reads(page);
  const writes = await page.evaluate(() => __fake.writes.flat().filter(w => /\/suppliers\/[^/]+\/orders\/|\/(supplierlinks|cutdone)\//.test(w.path)).length);
  ok(result === '1 kg' && afterFilter === beforeFilter && !writes && !page.errors.length,
    'fresh confirmation fills the selected quantities without extra history reads or an order write (' + result + ', ' +
    beforeFilter + ' to ' + afterFilter + ' reads, ' + writes + ' writes)');
  await page.context().close();

  const hiddenRail = { init: () => localStorage.setItem('lk.sup.sidebar', 'hide') };
  page = await open(browser, { ...hiddenRail, failReads:'/suppliers/northside/orders$' });
  const railRetry = page.locator('.su-order-context ' + action('history-retry'));
  await railRetry.waitFor();
  ok(await railRetry.isVisible() && /not read/i.test(await L.txt(page,'.su-info-line')), 'desktop with the rail hidden exposes the last-order error and its Retry');
  await page.evaluate(() => { __fake.failReads = null; });
  await railRetry.click();
  await loaded(page);
  ok(/2 kg/.test(await L.txt(page, '[data-item="t-stock"] .su-last')), 'rail-hidden Retry restores the existing last purchase');
  await page.context().close();

  const placed = F.fixture({ [F.key(['cutdone', F.today + '_northside'])]: { day: F.today, sid: 'northside', on: true, at: L.NOW - 60000, by: 'sam' } });
  page = await open(browser, { ...hiddenRail, extra: placed });
  const additional = page.locator('.su-order-context ' + action('additional'));
  await additional.waitFor();
  ok(await additional.isVisible() && /Ordered for/.test(await L.txt(page,'.su-info-line')), 'a placed order with the rail hidden still shows the exact delivery and Additional order');
  await page.context().close();

  const extra = F.fixture();
  const supplier = extra[F.key(['suppliers','northside'])];
  supplier.name = 'Northside Test Foods and Long Distance Distribution for the Kitchen';
  const name = 'TEST LONG STOCK PRODUCT WITH A COMPLETE SUPPLIER PACK DESCRIPTION';
  supplier.items = [{ ...supplier.items[0], name, source: { ...supplier.items[0].source, name } }, ...supplier.items.slice(1)];
  for (const width of [390, 768, 1280]) {
    page = await open(browser, { width, height:width===1280?800:width===390?844:900, extra, settings:{ text:'xlarge' } });
    await loaded(page);
    const sizes = await page.locator(history).boundingBox();
    ok(!(await L.overflow(page)) && sizes.height >= 44 && sizes.x >= 0 && sizes.x + sizes.width <= width &&
      await page.locator(qty).isVisible(), width + ' px Extra large with long names: History target and original quantity fit the width');
    await page.context().close();
  }

  await browser.close();
  L.report(R);
})().catch(error => { console.error(error); console.log(R.join('\n')); process.exit(1); });
