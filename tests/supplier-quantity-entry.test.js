// Review order accepts numbers with optional units and shows the exact draft field that needs attention.
// Products and quantities here are synthetic. All saves go to the Firebase stand-in.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();
const qty = id => 'input[data-sf="qty"][data-i="' + id + '"]';
const stock = id => 'input[data-sf="stock"][data-i="' + id + '"]';
const action = (p, cmd) => p.click('[data-su="' + cmd + '"]');
const dump = p => p.evaluate(() => window.__fake.dump());
const orderPrefix = F.key(['suppliers', 'northside', 'orders']) + '/';
const newOrders = s => Object.entries(s).filter(([key]) => key.startsWith(orderPrefix) && !/\/(previous|older)$/.test(key));
async function ready(p, id = 't-stock') {
  await L.waitFor(p, selector => !!document.querySelector(selector), qty(id), 15000);
}
async function open(b, seed, width = 1280) {
  const p = await L.open(b, '#/suppliers/northside', { who: 'bo', extra: seed || F.fixture(), width, wait: 1800 });
  await ready(p); return p;
}
async function reviewed(p) {
  await L.waitFor(p, () => { const el = document.querySelector('[data-su="record"]'); return el && !el.disabled; }, null, 10000);
}
async function fieldState(p, selector) {
  return p.$eval(selector, el => ({
    invalid: el.getAttribute('aria-invalid') === 'true', focused: el === document.activeElement,
    message: (el.getAttribute('aria-describedby') || '').split(/\s+/).map(id => document.getElementById(id)).filter(Boolean).map(n => n.textContent).join(' ')
  }));
}
async function record(p) {
  await action(p, 'record');
  await L.waitFor(p, prefix => Object.keys(window.__fake.dump()).filter(key => key.startsWith(prefix) && !/\/(previous|older)$/.test(key)).length === 1, orderPrefix, 10000);
  return newOrders(await dump(p))[0][1];
}
function pagedFixture() {
  const seed = F.fixture(), supplier = seed[F.key(['suppliers', 'northside'])];
  supplier.items = supplier.items.map(item => JSON.parse(JSON.stringify(item)));
  for (let n = 7; n <= 26; n++) {
    const item = JSON.parse(JSON.stringify(F.items[0]));
    item.id = 'page-' + n; item.name = 'TEST PAGE ITEM ' + n; item.source.name = item.name; item.source.row = n;
    item.aliases = []; item.orderUnit = n === 26 ? '' : 'kg'; item.parUnit = 'kg'; item.factor = n === 26 ? 0 : 1;
    supplier.items.push(item);
  }
  return seed;
}

(async () => {
  const b = await L.start(); let p, state, saved;

  // A known order unit lets the chef type a number. Zero and negative order amounts still need correction.
  p = await open(b);
  await p.click('[data-item="t-stock"] .su-item > summary');
  await p.fill(stock('t-stock'), '3');
  for (const value of ['0', '-2']) {
    await p.fill(qty('t-stock'), value); await action(p, 'review');
    await L.waitFor(p, selector => document.querySelector(selector)?.getAttribute('aria-invalid') === 'true', qty('t-stock'), 5000);
    state = await fieldState(p, qty('t-stock'));
    ok(state.invalid && state.focused && state.message.includes('TEST STOCK 1KG BAG'), 'confirmed unit: order amount ' + value + ' identifies and focuses its own item');
    ok(!(await p.$('[data-su="record"]')) && newOrders(await dump(p)).length === 0, 'invalid amount ' + value + ' never reaches recording or writes history');
  }
  await p.fill(qty('t-stock'), '2');
  ok(!(await fieldState(p, qty('t-stock'))).invalid, 'correcting a quantity clears its field error without needing a full page redraw');
  await p.fill(qty('t-case'), '2 kg');
  ok(/Order unit: kg/.test(await p.textContent('[data-item="t-case"] .su-qty')), 'an explicit unit updates the field hint immediately');
  await p.click('[data-item="t-unset"] .su-item > summary'); await p.fill(stock('t-unset'), 'not counted');
  await action(p, 'review'); await reviewed(p);
  ok(!(await p.$('[role="alert"]')), 'confirmed numeric quantities review successfully and unused stock does not block another item');
  saved = await record(p);
  const inferred = saved.lines.find(line => line.itemId === 't-stock'), explicit = saved.lines.find(line => line.itemId === 't-case');
  ok(inferred.qty === '2 kg' && inferred.amount === 2 && inferred.unit === 'kg', 'recorded numeric quantity keeps its confirmed unit in the immutable snapshot');
  ok(inferred.stock === '3 kg', 'recorded numeric stock keeps its confirmed par unit in the snapshot');
  ok(explicit.qty === '2 kg' && explicit.unit === 'kg', 'an explicit unit overrides the catalogue order unit without being replaced');
  ok(saved.lines.length === 2 && !saved.lines.some(line => line.itemId === 't-unset'), 'stock alone never creates an order line');
  ok(p.errors.length === 0, 'confirmed-unit quantity journey: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Unconfirmed order units accept positive numbers, while invalid amounts still identify their exact field.
  p = await open(b, null, 390);
  ok(await p.getAttribute(qty('t-zero'), 'placeholder') === 'e.g. 2' && /Unit optional/.test(await p.textContent('[data-item="t-zero"] .su-qty')), 'unconfirmed unit: the row clearly allows a number without a unit');
  await p.fill(qty('t-stock'), '4 kg');
  for (const value of ['0', '-2', 'some']) {
    await p.fill(qty('t-zero'), value); await action(p, 'review');
    await L.waitFor(p, selector => document.querySelector(selector)?.getAttribute('aria-invalid') === 'true', qty('t-zero'), 5000);
    state = await fieldState(p, qty('t-zero'));
    ok(state.invalid && state.focused && /TEST ZERO PAR ITEM/.test(state.message), 'optional unit: invalid amount ' + value + ' identifies and focuses its own item');
    ok(await p.inputValue(qty('t-stock')) === '4 kg' && await p.inputValue(qty('t-zero')) === value, 'optional-unit validation preserves every typed quantity');
    ok(!(await p.$('[data-su="record"]')) && newOrders(await dump(p)).length === 0, 'invalid optional-unit quantity never reaches recording');
  }
  await p.fill(qty('t-zero'), '2'); await p.fill(qty('t-unset'), '2 bags');
  ok(!(await fieldState(p, qty('t-zero'))).invalid, 'a valid bare number clears the quantity error without requiring a unit');
  await action(p, 'review'); await reviewed(p);
  ok(/2 \(unit not set\)/.test(await p.textContent('.su-review')), 'review distinguishes a number without a unit from a confirmed physical quantity');
  saved = await record(p);
  ok(saved.lines.some(line => line.itemId === 't-zero' && line.qty === '2' && line.amount === 2 && line.unit === ''), 'a bare number records safely without guessing pieces, packs or kilograms');
  ok(saved.lines.some(line => line.itemId === 't-unset' && line.qty === '2 bags' && line.unit === 'bags'), 'explicit units remain available for an otherwise unconfirmed item');
  ok(!(await L.overflow(p)), 'phone validation and recording fit without sideways scroll');
  ok(p.errors.length === 0, 'optional-unit quantity journey: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Review must reveal an invalid item hidden by another page or search, then its stock field behind Details.
  p = await open(b, pagedFixture());
  await p.fill(qty('t-stock'), '2'); await action(p, 'next'); await ready(p, 'page-26');
  await p.fill(qty('page-25'), '5 kg'); await p.fill(qty('page-26'), 'some');
  await p.click('[data-item="page-26"] .su-item > summary'); await p.fill(stock('page-26'), 'not counted');
  await p.click('[data-item="page-26"] .su-item > summary');
  await action(p, 'previous'); await ready(p); await p.fill('[data-sf="q"]', 'TEST STOCK');
  ok(!(await p.$(qty('page-26'))), 'search hides the invalid second-page item before review');
  await action(p, 'review');
  await L.waitFor(p, selector => { const el = document.querySelector(selector); return el && el.getAttribute('aria-invalid') === 'true' && el === document.activeElement; }, qty('page-26'), 5000);
  state = await fieldState(p, qty('page-26'));
  ok(state.invalid && state.focused && /TEST PAGE ITEM 26/.test(state.message), 'review reveals the hidden page and names the exact quantity field');
  ok(await p.$eval(qty('page-25'), el => el.value) === '5 kg' && await p.$eval(qty('page-26'), el => el.value) === 'some', 'revealing an error preserves quantities on that page');
  await p.fill(qty('page-26'), '3 bags'); await action(p, 'previous'); await ready(p); await p.fill('[data-sf="q"]', 'TEST STOCK');
  ok(await p.$eval(qty('t-stock'), el => el.value) === '2', 'the original first-page quantity survives validation and page changes');
  await action(p, 'review');
  await L.waitFor(p, selector => { const el = document.querySelector(selector); return el && el.getAttribute('aria-invalid') === 'true' && el === document.activeElement; }, stock('page-26'), 5000);
  state = await fieldState(p, stock('page-26'));
  ok(state.invalid && state.focused && /TEST PAGE ITEM 26/.test(state.message) && /stock/i.test(state.message), 'review focuses and describes the hidden stock error on the right item');
  ok(await p.$eval('[data-item="page-26"] .su-item', el => el.open), 'stock error opens the item details so its field is visible');
  ok(await p.$eval(qty('page-26'), el => el.value) === '3 bags', 'a stock error retains the corrected order quantity');
  await p.fill(stock('page-26'), '4');
  ok(!(await fieldState(p, stock('page-26'))).invalid, 'correcting stock clears its accessible field error');
  await action(p, 'review'); await reviewed(p); saved = await record(p);
  ok(saved.lines.length === 3 && saved.lines.find(line => line.itemId === 'page-26').stock === '4 kg', 'corrected draft records all pages once with the confirmed stock unit');
  ok(saved.lines.some(line => line.itemId === 't-stock' && line.qty === '2 kg') && saved.lines.some(line => line.itemId === 'page-25' && line.qty === '5 kg'), 'recording preserves the other pages\' reviewed quantities');
  ok(p.errors.length === 0, 'hidden-field validation journey: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close(); L.report(R);
})();
