// Supplier order rows, design A step 2 (head chef, 3 Nov 2026): On hand on the row, the top-up Use chip, − and +,
// filters, what staff asked for and the Review bar. Synthetic suppliers only (tests/supplier-fixtures.js).
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results(), { txt } = L;
const qty = id => 'input[data-sf="qty"][data-i="' + id + '"]';
const stock = id => 'input[data-sf="stock"][data-i="' + id + '"]';
const orderReads = p => p.evaluate(() => (window.__fake.reads || []).filter(k => /\/orders\/\d{4}-\d{2}-\d{2}\/lines/.test(k)).length);
async function open(b, width) {
  const p = await L.open(b, '#/suppliers/northside', { who: 'bo', extra: F.fixture(), wait: 1800, width: width || 1280, height: width === 390 ? 844 : 900 });
  await L.waitFor(p, () => !!document.querySelector('input[data-sf="qty"]'), null, 15000);
  return p;
}
(async () => {
  const b = await L.start();
  let p = await open(b, 1280);

  // On hand is on the row, outside Details, and no Use chip shows before a count.
  ok(await p.isVisible(stock('t-stock')) && await p.$eval(stock('t-stock'), el => !el.closest('details')), 'On hand sits on the row, visible without opening Details');
  ok(/On hand \(kg\)/.test(await txt(p, '[data-item="t-stock"] .su-onhand')), 'On hand names the par unit when it is confirmed');
  ok(!(await p.$('.su-use')), 'no Use chip before anything is counted');
  ok(await orderReads(p) === 0, 'opening a supplier reads no staff order lines');

  // A count below par offers the top-up; Use fills only that row, and the chip steps aside.
  await p.fill(stock('t-stock'), '3'); await L.settle(p, 150);
  ok(/Top up 7 kg · Use/.test(await txt(p, '[data-item="t-stock"] .su-use')), 'a count of 3 against a par of 10 kg offers a 7 kg top-up');
  ok(await p.inputValue(qty('t-stock')) === '', 'the top-up is not filled in by itself');
  await p.click('[data-item="t-stock"] .su-use'); await L.settle(p, 150);
  ok(await p.inputValue(qty('t-stock')) === '7 kg' && !(await p.$('[data-item="t-stock"] .su-use:not([hidden])')), 'Use fills 7 kg and the chip goes');
  ok(/1 item in this supplier draft/.test(await txt(p, '.su-order-actions')) && /In this order\s*1/.test(await txt(p, '[data-su="filter"][data-f="inorder"]')), 'the bar and In this order count the item');
  ok((await p.$$eval('input[data-sf="qty"]', els => els.filter(e => e.value).length)) === 1, 'no other row was filled');

  // Typing a quantity hides the chip without a redraw (the caret stays in the box).
  await p.fill(qty('t-stock'), ''); await p.fill(stock('t-stock'), '4'); await L.settle(p, 150);
  ok(/Top up 6 kg/.test(await txt(p, '[data-item="t-stock"] .su-use')), 'a new count gives a new top-up');
  await p.focus(qty('t-stock')); await p.keyboard.type('5');
  ok(await p.$eval('[data-item="t-stock"] .su-use', el => el.hidden) && await p.evaluate(() => document.activeElement.getAttribute('data-i') === 't-stock' && document.activeElement.value === '5'), 'typing a quantity hides the chip and keeps the focus');

  // Filters: Below par, In this order, All.
  await p.click('[data-su="filter"][data-f="low"]'); await L.settle(p, 150);
  ok((await p.$$eval('.su-row', els => els.map(e => e.getAttribute('data-item')))).join() === 't-stock', 'Below par shows only the counted item under par');
  await p.click('[data-su="filter"][data-f="inorder"]'); await L.settle(p, 150);
  ok((await p.$$eval('.su-row', els => els.map(e => e.getAttribute('data-item')))).join() === 't-stock', 'In this order shows only items with a quantity');
  await p.click('[data-su="filter"][data-f=""]'); await L.settle(p, 150);
  ok((await p.$$('.su-row')).length === 6, 'All shows every item again');

  // − and + only where the order unit is confirmed; they move the number by one and keep a typed unit.
  ok(!!(await p.$('[data-su="step"][data-i="t-case"]')) && !(await p.$('[data-su="step"][data-i="t-zero"]')), '− and + show only for items with a confirmed order unit');
  await p.click('[data-su="step"][data-i="t-case"][data-d="1"]'); await p.click('[data-su="step"][data-i="t-case"][data-d="1"]'); await L.settle(p, 150);
  ok(await p.inputValue(qty('t-case')) === '2', '+ twice from empty gives 2');
  await p.click('[data-su="step"][data-i="t-case"][data-d="-1"]'); await p.click('[data-su="step"][data-i="t-case"][data-d="-1"]'); await L.settle(p, 150);
  ok(await p.inputValue(qty('t-case')) === '', '− back to nothing empties the box, never 0');
  await p.fill(qty('t-stock'), '1.5 kg'); await p.click('[data-su="step"][data-i="t-stock"][data-d="1"]'); await L.settle(p, 150);
  ok(await p.inputValue(qty('t-stock')) === '2.5 kg', '+ keeps the typed unit');

  // What staff asked for: a Staff requests chip in the filter row reads them once, then shows Asked for.
  ok(!(await p.$('[data-su="filter"][data-f="asked"]')) && !!(await p.$('.su-filters [data-su="requests"]')), 'Staff requests sits in the filter row; Asked for is not offered before the requests are read');
  const before = await orderReads(p);
  await p.click('[data-su="requests"]');
  await L.waitFor(p, () => !!document.querySelector('.su-asked'), null, 5000);
  ok(await orderReads(p) - before === 1, 'the Staff requests chip costs one query');
  const asked = await txt(p, '.su-asked');
  ok(/Test stock request/.test(asked) && /2 kg/.test(asked) && /Ann at 13:00/.test(asked) && /TEST STOCK 1KG BAG/.test(asked), 'the strip names the request, its amount, who asked, when, and the matched item');
  ok(await p.getAttribute('[data-su="filter"][data-f="asked"]', 'aria-pressed') === 'true' && (await p.$$eval('.su-row', els => els.map(e => e.getAttribute('data-item')))).join() === 't-stock', 'the chip opens Asked for with the matched item only');
  ok(await p.evaluate(() => document.querySelector('.su-asked').getBoundingClientRect().top < document.querySelector('.su-row').getBoundingClientRect().top), 'the strip sits above the matched rows while Asked for is on');
  await p.click('[data-su="filter"][data-f=""]');

  // Review still records exactly what was typed.
  await p.click('[data-su="review"]'); await L.waitFor(p, () => !!document.querySelector('[data-su="record"]'));
  ok(/2\.5 kg/.test(await txt(p, '.su-review .su-lines')), 'Review shows the stepped quantity');
  ok(!p.errors.length, 'desktop journey: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Step 3: today's cut-off beside the supplier, and Share opens the phone's own share sheet (a stand-in here).
  p = await L.open(b, '#/suppliers/northside', { who: 'bo', extra: F.fixture(), wait: 1800, width: 1280,
    init: () => { navigator.share = data => { window.__shared = data; return Promise.resolve(); }; } });
  await L.waitFor(p, () => !!document.querySelector('input[data-sf="qty"]'), null, 15000);
  ok(/by 15:00/.test(await txt(p, '[data-su="pick"][data-sid="northside"]')) && !/by /.test(await txt(p, '[data-su="pick"][data-sid="west-bay"]')), 'the supplier list shows today\'s cut-off time, and nothing for a supplier without one');
  await p.fill(qty('t-stock'), '2'); await p.click('[data-su="review"]'); await L.waitFor(p, () => !!document.querySelector('[data-su="share-review"]'));
  ok(/1\. Send it your usual way/.test(await txt(p, '.su-review')) && /2\. Then record it here/.test(await txt(p, '.su-review')), 'Review spells out send first, then record');
  await p.click('[data-su="share-review"]'); await L.settle(p, 200);
  const shared = await p.evaluate(() => window.__shared);
  ok(shared && shared.title === 'Northside Test Foods' && /2 kg \| TEST STOCK 1KG BAG/.test(shared.text), 'Share hands the order text to the phone');
  ok(/Order text shared/.test(await txt(p, '.su-status')) && !(await p.evaluate(prefix => Object.keys(window.__fake.dump()).some(k => k.startsWith(prefix) && !/\/(previous|older)$/.test(k)), F.key(['suppliers', 'northside', 'orders']) + '/')), 'sharing records nothing; Record order placed stays the only save');
  await p.context().close();
  p = await open(b, 1280);
  await p.fill(qty('t-stock'), '2'); await p.click('[data-su="review"]'); await L.waitFor(p, () => !!document.querySelector('[data-su="copy-review"]'));
  ok(await p.evaluate(() => !!navigator.share) === !!(await p.$('[data-su="share-review"]')), 'Share shows only where the phone offers a share sheet; Copy is always there');
  await p.context().close();

  // One list (4 Nov 2026): a 300-item example supplier draws every row, no pages; category chips jump; typing, Use
  // and + change only their own row, so a long list stays quick (measured: about 45 ms a keystroke at 4x slower CPU).
  const cats = ['DAIRY', 'DRY GOODS', 'FROZEN', 'FRUIT', 'MEAT', 'SEAFOOD'];
  const bigItems = [];
  for (let n = 0; n < 300; n++) {
    const name = 'EXAMPLE ITEM ' + n, par = String(4 + n % 5);
    bigItems.push({ id: 'b' + n, name, pack: '1 kg bag', group: 'Example', category: cats[Math.floor(n / 50)], par, parUnit: n % 2 ? 'kg' : '', orderUnit: n % 2 ? 'kg' : '', factor: n % 2 ? 1 : 0,
      aliases: [], archived: false, manual: false, source: { file: 'example.pdf', page: 1, row: n + 1, name, par } });
  }
  p = await L.open(b, '#/suppliers/big', { who: 'bo', width: 390, height: 844, wait: 1800,
    extra: F.fixture({ [F.key(['suppliers', 'big'])]: { name: 'Big example supplier', cutoffId: '', v: 1, items: bigItems, at: L.NOW - 864e5, by: 'owner' } }) });
  await L.waitFor(p, () => !!document.querySelector('input[data-sf="stock"][data-i="b1"]'), null, 20000);
  ok((await p.$$('.su-row')).length === 300 && !(await p.$('[data-su="next"]')), 'one list: all 300 items are on the sheet, with no Next page');
  ok((await p.$$eval('[data-su="jump"]', els => els.map(e => e.getAttribute('data-cat')))).join() === cats.join(), 'one list: a jump chip for each category, in catalogue order');
  await p.click('[data-su="jump"][data-cat="SEAFOOD"]'); await L.settle(p, 300);
  const headTop = await p.evaluate(() => [...document.querySelectorAll('.su-category')].find(h => h.getAttribute('data-cat') === 'SEAFOOD').getBoundingClientRect().top);
  ok(headTop >= 0 && headTop < 120, 'one list: Seafood jumps its heading to the top of the screen (' + Math.round(headTop) + ' px)');
  await p.evaluate(() => { document.querySelector('[data-item="b3"]').__kept = true; document.querySelector('[data-item="b1"]').__old = true; });
  await p.focus('input[data-sf="stock"][data-i="b1"]'); await p.keyboard.type('2');
  ok(await p.evaluate(() => document.querySelector('[data-item="b3"]').__kept === true && !document.querySelector('[data-item="b1"]').__old), 'a keystroke in On hand redraws only its own row');
  ok(await p.evaluate(() => { const a = document.activeElement; return a.getAttribute('data-sf') === 'stock' && a.getAttribute('data-i') === 'b1' && a.value === '2' && a.selectionStart === 1; }), 'the focus and caret stay in the box while typing');
  ok(/Below par\s*1/.test(await txt(p, '[data-su="filter"][data-f="low"]')), 'the Below par count follows the count without a full redraw');
  await p.click('[data-item="b1"] .su-use'); await L.settle(p, 150);
  ok(await p.inputValue('input[data-sf="qty"][data-i="b1"]') === '3 kg' && await p.evaluate(() => { const a = document.activeElement; return document.querySelector('[data-item="b3"]').__kept === true && a.getAttribute('data-sf') === 'qty' && a.getAttribute('data-i') === 'b1'; }), 'Use fills its row only and hands the focus to that To order box');
  ok(/1 item in this supplier draft/.test(await txt(p, '.su-order-actions')) && !(await p.$eval('[data-su="review"]', e => e.disabled)), 'the Review bar counts the item and turns on');
  await p.click('[data-su="step"][data-i="b3"][data-d="1"]'); await L.settle(p, 150);
  ok(await p.inputValue('input[data-sf="qty"][data-i="b3"]') === '1' && await p.evaluate(() => { const a = document.activeElement; return a.getAttribute('data-su') === 'step' && a.getAttribute('data-i') === 'b3' && a.getAttribute('data-d') === '1'; }), '+ changes its row and keeps the focus on +');
  ok(!(await L.overflow(p)) && !p.errors.length, 'one list at 390 px: no sideways scroll, no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // List first on a phone (4 Nov 2026, the Prep list's rule): the first To order box is on the first screen above the
  // Review bar (it was 1,284 px down), the cut-off and last order fold into one line, and the laptop keeps them open.
  p = await open(b, 390);
  const first = await p.evaluate(() => ({ qty: document.querySelector('input[data-sf="qty"]').getBoundingClientRect().bottom, bar: document.querySelector('.su-order-actions').getBoundingClientRect().top }));
  ok(first.qty <= first.bar, '390 px: the first To order box is on the first screen, above the Review bar (' + Math.round(first.qty) + ' px, bar at ' + Math.round(first.bar) + ')');
  ok(await p.isVisible('.su-info-line') && !(await p.isVisible('.su-cutoff')) && !(await p.isVisible('.su-latest')), '390 px: the cut-off card and the last order fold into one line');
  ok(/Order by .*15:00/.test(await txt(p, '.su-info-line')) && /last order/.test(await txt(p, '.su-info-line')), 'the line says when the order closes and when the last order was');
  await p.click('[data-su="info"]'); await L.settle(p, 150);
  ok(await p.isVisible('.su-cutoff') && await p.isVisible('.su-latest') && await p.getAttribute('[data-su="info"]', 'aria-expanded') === 'true', 'More opens the cut-off card and the last order');
  await p.click('[data-su="info"]'); await L.settle(p, 150);
  ok(!(await p.isVisible('.su-cutoff')), 'Less folds them again');
  ok(!p.errors.length, 'folded line: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // an order already marked as placed opens the line by itself, so Additional order is in sight before Review
  const placed = F.fixture({ [F.key(['cutdone', F.today + '_northside'])]: { day: F.today, sid: 'northside', on: true, at: L.NOW - 60000, by: 'sam' } });
  p = await L.open(b, '#/suppliers/northside', { who: 'bo', extra: placed, wait: 1800, width: 390, height: 844 });
  await L.waitFor(p, () => !!document.querySelector('input[data-sf="qty"]'), null, 15000);
  await L.waitFor(p, () => /marked as placed/.test((document.querySelector('.su-info-line') || {}).textContent || ''), null, 5000);
  ok(await p.isVisible('[data-su="additional"]'), 'an order already marked as placed opens the line with Additional order in sight');
  await p.context().close();
  p = await open(b, 1280);
  ok(!(await p.isVisible('.su-info-line')) && await p.isVisible('.su-cutoff') && await p.isVisible('.su-latest'), '1280 px: the cut-off card and the last order stay open, no folded line');
  await p.context().close();

  // Phone: the Review bar stays above the tabs while the list scrolls; no sideways scroll at any width.
  for (const width of [390, 768, 1280]) {
    p = await open(b, width);
    await p.fill(stock('t-stock'), '3'); await L.settle(p, 150);
    ok(!(await L.overflow(p)), width + ' px: no sideways scroll with On hand and the Use chip');
    if (width === 390) {
      await p.evaluate(() => document.querySelector('[data-item="t-stock"]').scrollIntoView({ block: 'start' })); await L.settle(p, 200);
      const pos = await p.evaluate(() => { const bar = document.querySelector('.su-order-actions').getBoundingClientRect(), tabs = document.querySelector('.tabbar').getBoundingClientRect(); return { bottom: bar.bottom, tabs: tabs.top, height: innerHeight }; });
      ok(pos.bottom <= pos.tabs + 1 && pos.bottom > pos.tabs - 80, '390 px: the Review bar sits just above the tabs while the list scrolls');
    }
    ok(!p.errors.length, width + ' px: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close(); L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
