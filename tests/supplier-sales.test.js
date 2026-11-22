// Weekly sales to supplier order, with a synthetic CSV and the Firebase stand-in only.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();

const dish = 'TEST DISH, CASE PORTION';
const supplierId = 'northside';
const itemId = 't-case';
const salesDoc = F.key(['suppliersales', 'weekly']);
const orderPrefix = F.key(['suppliers', supplierId, 'orders']) + '/';
const fixture = {
  [orderPrefix + 'older']: undefined,
  [orderPrefix + 'previous']: undefined
};
const csv = { name: 'synthetic-sales.csv', mimeType: 'text/csv', buffer: Buffer.from('Product Name,Quantity\r\n"' + dish + '",25\r\n') };
const daysSinceSunday = new Date(L.NOW).getDay() || 7;
const dateAgo = days => L.ymd(new Date(L.NOW - days * 86400000));
const start = dateAgo(daysSinceSunday + 6), end = dateAgo(daysSinceSunday);
const widths = [390, 768, 1280];
const root = '#supplier-root';
const qty = 'input[data-sf="qty"][data-i="' + itemId + '"]';
const untouched = 'input[data-sf="qty"][data-i="t-stock"]';
const action = name => '[data-su="' + name + '"]';
const field = name => '[data-sf="sales-' + name + '"]';
const part = name => field(name) + '[data-part="0"]';
const onItem = name => action('sales-' + name) + '[data-i="' + itemId + '"]';
const state = (p, key) => p.evaluate(k => window.__fake.dump()[k], key);
const orders = p => p.evaluate(prefix => Object.entries(window.__fake.dump()).filter(([key]) => key.startsWith(prefix)), orderPrefix);
const salesReads = p => p.evaluate(key => window.__fake.bill.filter(entry => entry.path === key).map(entry => entry.kind), salesDoc);
const ready = p => p.locator(qty).waitFor({ state: 'visible', timeout: 15000 });

async function layout(p, stage, withSuggestion = false) {
  const sizes = {};
  for (const width of widths) {
    await p.setViewportSize({ width, height: width === 768 ? 1024 : 844 });
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.locator(untouched).waitFor({ state: 'visible' });
    sizes[width] = await p.evaluate(() => {
      const dock = document.querySelector('.su-order-actions').getBoundingClientRect();
      const bottom = Math.min(innerHeight, dock.top);
      const fits = element => {
        const rect = element.getBoundingClientRect();
        return rect.height > 0 && rect.top >= 0 && rect.bottom <= bottom;
      };
      const toolbar = document.querySelector('.su-toolbar');
      const find = toolbar.querySelector('[data-sf="q"]').getBoundingClientRect();
      const sales = toolbar.querySelector('[data-su="sales-links"]')?.getBoundingClientRect();
      return {
        rows: [...document.querySelectorAll('.su-row')].filter(fits).length,
        inputs: [...document.querySelectorAll('[data-sf="qty"]')].filter(fits).length,
        headerHeight: document.querySelector('.su-head').getBoundingClientRect().height,
        toolbarHeight: toolbar.getBoundingClientRect().height,
        linksBesideSearch: !!sales && sales.right <= innerWidth && sales.top < find.bottom && sales.bottom > find.top
      };
    });
    const overflow = await L.overflow(p);
    ok(!overflow, width + ' px ' + stage + ': supplier order fits without sideways scroll' + (overflow ? ' (' + overflow + ')' : ''));
    if (withSuggestion) {
      const use = p.locator(onItem('use'));
      await use.scrollIntoViewIfNeeded();
      const target = await use.boundingBox();
      ok(target && target.width >= 44 && target.height >= 44, width + ' px: Use has a 44 px tap target');
    }
  }
  return sizes;
}

async function run(browser) {
  const p = await L.open(browser, '#/', { who: 'bo', extra: F.fixture(fixture), width: 390 });
  ok(!(await salesReads(p)).length, 'weekly sales are not read when the signed-in book opens at Home');
  await p.click('.wtop-who');
  await p.click('.wm a[href="#/suppliers"]');
  await ready(p);
  const before = await layout(p, 'before import');
  await p.setViewportSize({ width: 390, height: 844 });
  await p.click(qty);
  ok(await p.$eval(qty, input => document.activeElement === input), 'head chef can focus To order with one tap in the usual supplier sheet');
  await p.fill(qty, '1');
  const [fileChooser] = await Promise.all([p.waitForEvent('filechooser'), p.click(action('sales-import'))]);
  await fileChooser.setFiles(csv);
  await p.locator(field('start')).waitFor({ state: 'visible' });
  await p.fill(field('start'), start);
  await p.fill(field('end'), end);
  ok(!await p.locator(field('venue')).isChecked() && /Leichhardt/i.test(await L.txt(p, root)), 'CSV without venue metadata asks the chef to confirm this venue');
  await p.click(action('sales-save'));
  ok(/confirm the report is for Leichhardt/i.test(await L.txt(p, '#su-sales-status')) && !await state(p, salesDoc), 'a report with an unconfirmed venue is blocked before publication');
  await p.check(field('venue'));
  ok(await p.inputValue(field('start')) === start && await p.inputValue(field('end')) === end && !await state(p, salesDoc), 'the chef confirms both trading dates and sees an uncommitted report first');

  // A refused acknowledgement must leave the selected report available to retry.
  await p.evaluate(() => { window.__fake.deny = /\/suppliersales\/weekly$/; });
  await p.click(action('sales-save'));
  await L.waitFor(p, key => window.__fake.writes.some(batch => batch.some(write => write.path === key)), salesDoc);
  await p.locator('#su-sales-status[role="alert"]').waitFor({ state: 'visible' });
  ok(!await state(p, salesDoc) && await p.inputValue(field('start')) === start && await p.inputValue(field('end')) === end && await p.locator(field('venue')).isChecked(), 'failed publication keeps the report dates and venue confirmation for retry');
  await p.evaluate(() => { window.__fake.deny = null; });
  await p.click(action('sales-save'));
  await L.waitFor(p, key => window.__fake.dump()[key]?.v === 1, salesDoc);
  await ready(p);
  const published = await state(p, salesDoc);
  ok(published.by === 'bo' && published.report.start === start && published.report.end === end && published.report.rows.length === 1 && published.report.rows[0].name === dish && published.report.rows[0].qty === 25 && !published.links.length, 'publishing stores the confirmed dates and normalised count before any link');
  ok(await p.inputValue(qty) === '1' && await p.inputValue(untouched) === '' && !(await orders(p)).length, 'publishing never fills or replaces an order draft and writes no history');

  await p.click(action('sales-links'));
  await p.getByRole('button', { name: 'Link item ' + dish, exact: true }).click();
  await L.pick(p, part('supplier'), 'west-bay');
  await L.pick(p, part('supplier'), supplierId);
  await L.pick(p, part('item'), itemId);
  await p.fill(part('amount'), '250');
  await p.fill(part('unit'), 'g');
  await p.fill(part('per-order'), '3000');
  ok(/^cases?$/.test(await p.inputValue(part('order-unit'))), 'the link uses the selected catalogue product’s confirmed case order unit');
  await p.click(action('sales-save-link'));
  await L.waitFor(p, key => window.__fake.dump()[key]?.v === 2, salesDoc);
  await ready(p);
  const linked = await state(p, salesDoc);
  const link = linked.links[0], product = link?.parts[0];
  ok(link?.name === dish && product?.sid === supplierId && product.iid === itemId && product.amount === 250 && product.unit === 'g' && product.perOrder === 3000 && /^cases?$/.test(product.orderUnit), 'saved link contains stable supplier and product IDs and the confirmed portion and case conversion');
  ok(!(await orders(p)).length && await p.inputValue(qty) === '1', 'saving a link never orders anything or changes a typed amount');
  const linksToggle = p.locator(action('sales-links'));
  if (await linksToggle.getAttribute('aria-expanded') === 'true') await linksToggle.click();

  const readsBeforeRefresh = (await salesReads(p)).length;
  await p.click(action('refresh'));
  await L.waitFor(p, ({ key, count }) => window.__fake.bill.filter(entry => entry.path === key).length > count, { key: salesDoc, count: readsBeforeRefresh });
  await ready(p);
  await p.locator(onItem('use')).waitFor({ state: 'visible' });
  ok(/3 cases?\b/.test(await L.txt(p, onItem('calc'))) && await p.inputValue(qty) === '1', 'refreshing the supplier sheet keeps the original draft and shows 25 portions rounded up to 3 cases');
  const after = await layout(p, 'after linking', true);
  for (const width of widths) {
    const first = before[width], next = after[width];
    console.log(width + ' px full-app counts before and after linking: ' + first.rows + ' → ' + next.rows + ' complete rows, ' + first.inputs + ' → ' + next.inputs + ' visible To order fields');
  }
  ok(after[390].linksBesideSearch && Math.abs(after[390].headerHeight - before[390].headerHeight) <= 1 &&
    Math.abs(after[390].toolbarHeight - before[390].toolbarHeight) <= 1, 'phone sales links share the item search row without adding height');
  ok(after[390].inputs >= Math.min(before[390].inputs, 1), 'weekly sales keep the first visible To order field in the phone workspace');
  await p.setViewportSize({ width: 390, height: 844 });
  const weekCaption = p.locator(onItem('calc') + ' .su-sales-week');
  ok(await weekCaption.isVisible() && /^Week to /.test(await weekCaption.innerText()), 'the report week is visible beside the collapsed suggestion');
  const use = p.locator(onItem('use'));
  await p.locator(qty).focus();
  // Put Use just behind the dock so the browser's normal Tab scrolling has to account for the overlay.
  const behindDock = await use.evaluate(async button => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const dock = document.querySelector('.su-order-actions');
    window.scrollBy(0, button.getBoundingClientRect().top - dock.getBoundingClientRect().top - 6);
    return button.getBoundingClientRect().top >= dock.getBoundingClientRect().top;
  });
  ok(behindDock, 'keyboard fixture places Use behind the phone review dock');
  for (let tab = 0; tab < 6; tab++) {
    await p.keyboard.press('Tab');
    if (await use.evaluate(button => document.activeElement === button)) break;
  }
  const useAboveDock = await use.evaluate(async button => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const dock = document.querySelector('.su-order-actions');
    const rect = button.getBoundingClientRect();
    return document.activeElement === button && rect.top >= 0 && rect.bottom <= dock.getBoundingClientRect().top;
  });
  ok(useAboveDock, 'tabbing to Use reveals keyboard focus above the phone review dock');
  await p.click(onItem('calc'));
  ok(/6250 g.*3000 g/.test(await L.txt(p, '[data-item="' + itemId + '"] .su-sales-explain')), 'calculation explains the sold portions and how many grams make one case');
  await p.click(onItem('calc'));
  await p.click(onItem('use'));
  ok(await p.inputValue(qty) === '1' && await p.locator(onItem('keep')).isVisible(), 'Use offers a choice before overwriting a typed amount');
  await p.click(onItem('keep'));
  ok(await p.inputValue(qty) === '1', 'keeping the current quantity leaves the typed value intact');
  await p.click(onItem('use'));
  await p.click(onItem('replace'));
  ok(/^3(?: cases?)?$/.test(await p.inputValue(qty)) && await p.$eval(qty, input => document.activeElement === input), 'replacing sets 3 cases and focuses its To order field');
  await p.click(action('review'));
  const record = p.locator(action('record') + ':enabled');
  await record.waitFor({ state: 'visible' });
  ok(/^3 cases?$/.test(await L.txt(p, '.su-review .su-lines strong')) && !(await orders(p)).length, 'review shows the draft amount and writes no order history');
  await record.click();
  await L.waitFor(p, prefix => Object.keys(window.__fake.dump()).some(key => key.startsWith(prefix)), orderPrefix, 10000);
  const recorded = await orders(p);
  const line = recorded[0][1].lines[0];
  ok(recorded.length === 1 && recorded[0][1].lines.length === 1 && line.itemId === itemId && line.amount === 3 && /^cases?$/.test(line.unit), 'Record order placed writes exactly one history snapshot using the chosen quantity');
  await ready(p);
  await p.reload();
  await ready(p);
  await p.locator(onItem('use')).waitFor({ state: 'visible' });
  await p.locator('[data-item="' + itemId + '"] .su-last').getByText(/^3 cases?$/).waitFor({ state: 'visible' });
  ok((await state(p, salesDoc))?.v === 2 && /3 cases?\b/.test(await L.txt(p, onItem('calc'))) && (await orders(p)).length === 1, 'reopening the book reads the saved report and link and retains the recorded order');
  ok(p.errors.length === 0, 'head chef sales journey has no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  const savedFixture = F.fixture({ ...fixture, [salesDoc]: linked });
  const sous = await L.open(browser, '#/suppliers/northside', { who: 'sam', extra: savedFixture, width: 768, height: 1024 });
  await ready(sous);
  await sous.locator(onItem('use')).waitFor({ state: 'visible' });
  ok((await salesReads(sous)).join() === 'lite-get', 'supplier order reads one shared weekly sales document on demand');
  ok(!await sous.locator(action('sales-import')).count() && !await sous.locator(action('sales-save-link')).count(), 'sous chef can see suggestions without access to publish reports or save links');
  await sous.click(onItem('use'));
  ok(/^3(?: cases?)?$/.test(await sous.inputValue(qty)) && !(await orders(sous)).length, 'sous chef can use the shared suggestion in their own draft without recording an order');
  ok(sous.errors.length === 0, 'sous chef sales journey has no browser errors ' + sous.errors.join(' | '));
  await sous.context().close();

  const otherVenue = await L.open(browser, '#/suppliers/northside', {
    who: 'bo', extra: savedFixture,
    init: () => Object.defineProperty(window, 'LK_SUPPLIER_SALES_ENABLED', { get: () => false, set() {} })
  });
  await ready(otherVenue);
  ok(!await otherVenue.locator(action('sales-import')).count() && !await otherVenue.locator(onItem('use')).count() &&
    !(await salesReads(otherVenue)).length, 'a venue outside the pilot keeps manual supplier ordering and reads no sales data');
  await otherVenue.context().close();

  const staff = await L.open(browser, '#/suppliers/northside', { who: 'ann', extra: savedFixture });
  await staff.getByText('Chef access needed', { exact: true }).waitFor({ state: 'visible' });
  ok(!await staff.locator(qty).count() && !await staff.locator(onItem('use')).count() && !await staff.evaluate(key => window.__fake.reads.includes(key), salesDoc), 'ordinary staff see the existing chef access gate with no sales read or controls');
  ok(staff.errors.length === 0, 'staff access check has no browser errors ' + staff.errors.join(' | '));
  await staff.context().close();
}

(async () => {
  const browser = await L.start();
  try { await run(browser); }
  finally { await browser.close(); }
  L.report(R);
})().catch(error => { console.log(R.join('\n')); console.error(error); process.exit(1); });
