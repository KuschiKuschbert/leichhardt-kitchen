// Unitless supplier quantities stay identifiable through failed saves, history, copy and reuse.
// All records are synthetic and remain in the Firebase stand-in.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();
const qty = id => 'input[data-sf="qty"][data-i="' + id + '"]';
const stock = id => 'input[data-sf="stock"][data-i="' + id + '"]';
const action = (p, cmd) => p.click('[data-su="' + cmd + '"]');
const dump = p => p.evaluate(() => window.__fake.dump());
const orderPrefix = F.key(['suppliers', 'northside', 'orders']) + '/';
const orders = s => Object.entries(s).filter(([key]) => key.startsWith(orderPrefix) && !/\/(previous|older)$/.test(key));
const completion = F.key(['cutdone', F.today + '_northside']);
async function ready(p) { await L.waitFor(p, () => !!document.querySelector('input[data-sf="qty"]'), null, 15000); }
async function reviewed(p) { await L.waitFor(p, () => { const e = document.querySelector('[data-su="record"]'); return e && !e.disabled; }, null, 10000); }
async function history(p) {
  if (await p.getAttribute('[data-su="history"]', 'aria-expanded') !== 'true') await action(p, 'history');
  await L.waitFor(p, () => !!document.querySelector('[data-su="copy-history"]'), null, 10000);
}
async function captureCopy(p) {
  await p.evaluate(() => { window.__copiedOrder = ''; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: text => { window.__copiedOrder = text; return Promise.resolve(); } } }); });
}

(async () => {
  const b = await L.start(), seed = F.fixture();
  seed[F.key(['suppliers', 'northside'])].items = seed[F.key(['suppliers', 'northside'])].items.map(i => ['t-zero', 't-unset'].includes(i.id) ? Object.assign({}, i, { par: '10' }) : i);
  let p = await L.open(b, '#/suppliers/northside', { who: 'bo', extra: seed, width: 768, wait: 1800 });
  await ready(p);
  const before = await dump(p);
  await p.fill(qty('t-zero'), '1,5');
  await p.fill(qty('t-unset'), '1/2');
  await p.fill(qty('t-stock'), '2');
  await p.click('[data-item="t-zero"] .su-item > summary');
  await p.fill(stock('t-zero'), '0');
  await p.click('[data-item="t-unset"] .su-item > summary');
  await p.fill(stock('t-unset'), '1.25');
  ok(await p.getAttribute(stock('t-zero'), 'placeholder') === 'e.g. 4', 'unconfirmed stock field also offers plain numeric entry');
  await action(p, 'smart');
  await p.fill(qty('t-zero'), ''); await p.fill(qty('t-unset'), '');
  await L.settle(p, 250);
  ok(!(await p.$('.su-suggestion [data-i="t-zero"]')) && !(await p.$('.su-suggestion [data-i="t-unset"]')), 'unconfirmed stock counts never invent a top-up conversion');
  await p.fill(qty('t-zero'), '1,5'); await p.fill(qty('t-unset'), '1/2');
  await action(p, 'review'); await reviewed(p);
  let review = await p.textContent('.su-review');
  ok(/1\.5 \(unit not set\)/.test(review) && /0\.5 \(unit not set\)/.test(review) && /2 kg/.test(review), 'review handles comma decimals, fractions and confirmed units together');
  await captureCopy(p); await action(p, 'copy-review');
  let copied = await p.evaluate(() => window.__copiedOrder);
  ok(copied.includes('1.5 (unit not set) | TEST ZERO PAR ITEM') && copied.includes('0.5 (unit not set) | TEST UNSET PAR ITEM') && !copied.includes('unspecified'), 'copied order text explains missing units without inventing a physical unit');

  // A failed record leaves all typed values and the reminder untouched. Retrying saves one immutable snapshot.
  await p.evaluate(() => { window.__fake.deny = /\/suppliers\/northside\/orders\//; });
  await action(p, 'record');
  await L.waitFor(p, () => !!document.querySelector('[role="alert"]') && !document.querySelector('[data-su="record"]').disabled, null, 10000);
  let s = await dump(p);
  ok(orders(s).length === 0 && !s[completion], 'failed number-only order creates neither history nor a completion tick');
  await p.click('.wtop [data-act="back"]'); await ready(p);
  ok(await p.inputValue(qty('t-zero')) === '1,5' && await p.inputValue(qty('t-unset')) === '1/2' && await p.inputValue(stock('t-zero')) === '0' && await p.inputValue(stock('t-unset')) === '1.25', 'failed save retains the exact quantity and stock text for every item');
  await p.evaluate(() => { window.__fake.deny = null; });
  await action(p, 'review'); await reviewed(p); await action(p, 'record');
  await L.waitFor(p, prefix => Object.keys(window.__fake.dump()).filter(k => k.startsWith(prefix) && !/\/(previous|older)$/.test(k)).length === 1, orderPrefix, 10000);
  await ready(p);
  s = await dump(p);
  const [savedKey, saved] = orders(s)[0], savedJson = JSON.stringify(saved);
  const decimal = saved.lines.find(l => l.itemId === 't-zero'), fraction = saved.lines.find(l => l.itemId === 't-unset');
  ok(decimal.qty === '1,5' && decimal.amount === 1.5 && decimal.unit === '' && decimal.stock === '0', 'decimal order text and zero stock retain the shipped empty-unit format');
  ok(fraction.qty === '0.5' && fraction.amount === 0.5 && fraction.unit === '' && fraction.stock === '1.25', 'fraction order and decimal stock have stable numeric snapshots');
  ok(saved.lines.find(l => l.itemId === 't-stock').qty === '2 kg' && s[completion].on === true, 'confirmed units and atomic reminder completion are preserved');
  ok(JSON.stringify(s[orderPrefix + 'previous']) === JSON.stringify(before[orderPrefix + 'previous']) && JSON.stringify(s[orderPrefix + 'older']) === JSON.stringify(before[orderPrefix + 'older']), 'recording number-only entries never rewrites previous orders');
  ok(/1\.5 \(unit not set\)/.test(await p.textContent('[data-item="t-zero"] .su-last')), 'the last-order column makes the missing unit visible');
  ok(!(await L.overflow(p)), 'optional-unit values fit the tablet layout');

  // A full reload validates and reads these records, rather than only displaying the in-memory save result.
  await p.reload(); await ready(p);
  await L.waitFor(p, () => /1\.5 \(unit not set\)/.test((document.querySelector('[data-item="t-zero"] .su-last') || {}).textContent || ''), null, 10000);
  await history(p);
  ok(/0\.5 \(unit not set\)/.test(await p.textContent('.su-disclosure:has([data-su="history"])')), 'history reload accepts number-only records and identifies their unset units');
  await captureCopy(p); await action(p, 'copy-history');
  copied = await p.evaluate(() => window.__copiedOrder);
  ok(copied.includes('1.5 (unit not set) | TEST ZERO PAR ITEM') && !copied.includes('unspecified'), 'copying saved history uses the same clear quantity display as review');
  await action(p, 'reuse');
  ok(await p.inputValue(qty('t-zero')) === '1,5' && await p.inputValue(qty('t-unset')) === '0.5' && /Unit not set/.test(await p.textContent('[data-item="t-zero"] .su-qty')) && /Unit not set/.test(await p.textContent('[data-item="t-unset"] .su-qty')), 'reusing history shows plain numbers with clear unset-unit hints');
  ok(orders(await dump(p)).length === 1, 'reuse only fills the draft and never creates another saved order');

  // A later catalogue correction must not silently reinterpret the old quantities as kilograms.
  await p.evaluate(key => {
    const supplier = window.__fake.dump()[key]; supplier.v += 1;
    supplier.items = supplier.items.map(i => i.id === 't-zero' ? Object.assign({}, i, { orderUnit: 'kg', parUnit: 'kg', factor: 1 }) : i);
    window.__fake.write(key, supplier);
  }, F.key(['suppliers', 'northside']));
  await action(p, 'refresh');
  await L.waitFor(p, () => Array.from(document.querySelectorAll('[data-item="t-zero"] dt')).some(e => e.textContent === 'Order unit' && e.nextElementSibling.textContent === 'kg'), null, 10000);
  ok(await p.inputValue(qty('t-zero')) === '1,5' && /Unit not set/.test(await p.textContent('[data-item="t-zero"] .su-qty')), 'catalogue refresh preserves an already reused unknown quantity and its unset-unit hint');
  await action(p, 'additional'); await action(p, 'review'); await reviewed(p);
  review = await p.textContent('.su-review');
  ok(/1\.5 \(unit not set\)/.test(review) && !/1\.5 kg/.test(review), 'a confirmed catalogue unit does not relabel a previous unitless order');
  ok(JSON.stringify((await dump(p))[savedKey]) === savedJson && orders(await dump(p)).length === 1, 'review after a unit correction leaves immutable history intact');
  await p.click('.wtop [data-act="back"]'); await ready(p);
  await p.fill(qty('t-zero'), '2');
  ok(await p.inputValue(qty('t-zero')) === '2' && /Order unit: kg/.test(await p.textContent('[data-item="t-zero"] .su-qty')) && await p.$eval(qty('t-zero'), el => el === document.activeElement), 'deliberately editing a preserved number updates its unit hint immediately without losing focus');
  await action(p, 'review'); await reviewed(p);
  ok(await p.locator('.su-review .su-lines > div').filter({ hasText: 'TEST ZERO PAR ITEM' }).locator('strong').textContent() === '2 kg', 'a deliberate edit after the unit correction uses the newly confirmed kilograms');
  ok(p.errors.length === 0, 'number-only lifecycle: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Raw numbers keep the units shown when they were entered, even when a catalogue refresh changes those defaults.
  p = await L.open(b, '#/suppliers/northside', { who: 'bo', extra: F.fixture(), width: 1280, wait: 1800 });
  await ready(p);
  await p.fill(qty('t-zero'), '2'); await p.fill(qty('t-stock'), '3'); await p.fill(qty('t-case'), '2 bags');
  await p.click('[data-item="t-zero"] .su-item > summary'); await p.fill(stock('t-zero'), '0');
  await p.click('[data-item="t-stock"] .su-item > summary'); await p.fill(stock('t-stock'), '4');
  await p.evaluate(key => {
    const supplier = window.__fake.dump()[key]; supplier.v += 1;
    supplier.items = supplier.items.map(i => {
      if (i.id === 't-zero' || i.id === 't-case') return Object.assign({}, i, { orderUnit: 'kg', parUnit: 'kg', factor: 1 });
      if (i.id === 't-stock') return Object.assign({}, i, { orderUnit: 'g', parUnit: 'g', factor: 1 });
      return i;
    });
    window.__fake.write(key, supplier);
  }, F.key(['suppliers', 'northside']));
  await action(p, 'refresh');
  await L.waitFor(p, () => Array.from(document.querySelectorAll('[data-item="t-stock"] dt')).some(e => e.textContent === 'Order unit' && e.nextElementSibling.textContent === 'g'), null, 10000);
  ok(await p.inputValue(qty('t-zero')) === '2' && await p.inputValue(stock('t-zero')) === '0' && /Unit not set/.test(await p.textContent('[data-item="t-zero"] .su-qty')), 'fresh unknown quantity and stock remain unqualified after the catalogue confirms kilograms');
  ok(await p.inputValue(qty('t-stock')) === '3' && await p.inputValue(stock('t-stock')) === '4' && /Order unit: kg/.test(await p.textContent('[data-item="t-stock"] .su-qty')), 'numbers entered with confirmed kilograms retain kilograms when defaults change to grams');
  ok(await p.inputValue(qty('t-case')) === '2 bags', 'an explicitly entered unit also survives a catalogue unit correction');
  await action(p, 'review'); await reviewed(p);
  review = await p.textContent('.su-review');
  ok(/2 \(unit not set\)/.test(review) && /3 kg/.test(review) && /2 bags/.test(review), 'review keeps each draft quantity in its original interpretation');
  await action(p, 'record');
  await L.waitFor(p, prefix => Object.keys(window.__fake.dump()).filter(k => k.startsWith(prefix) && !/\/(previous|older)$/.test(k)).length === 1, orderPrefix, 10000);
  const corrected = orders(await dump(p))[0][1];
  const untouched = corrected.lines.find(l => l.itemId === 't-zero'), known = corrected.lines.find(l => l.itemId === 't-stock');
  ok(untouched.qty === '2' && untouched.unit === '' && untouched.stock === '0', 'recording preserves unknown units for a draft typed before the catalogue correction');
  ok(known.qty === '3 kg' && known.unit === 'kg' && known.stock === '4 kg' && corrected.lines.find(l => l.itemId === 't-case').unit === 'bags', 'recording retains original known and explicit units after defaults change');
  ok(p.errors.length === 0, 'catalogue unit change with fresh drafts: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Records already saved by the earlier empty-unit release retain their exact decimal amounts on reuse.
  const existingSeed = F.fixture(), existingKey = orderPrefix + 'number-only-v3';
  const numberOnly = JSON.parse(JSON.stringify(existingSeed[orderPrefix + 'previous']));
  numberOnly.at = L.NOW - 3600000;
  numberOnly.lines = [['t-zero', '1.2345', 1.2345], ['t-unset', '0.000001', 0.000001]].map(([id, raw, amount]) => {
    const item = F.items.find(i => i.id === id);
    return { itemId: id, name: item.name, pack: item.pack, qty: raw, amount, unit: '', par: item.par, parUnit: item.parUnit, source: item.source, suggestion: '', stock: '' };
  });
  existingSeed[existingKey] = numberOnly;
  const existingJson = JSON.stringify(numberOnly);
  p = await L.open(b, '#/suppliers/northside', { who: 'bo', extra: existingSeed, width: 390, wait: 1800 });
  await ready(p);
  await L.waitFor(p, () => /1\.2345 \(unit not set\)/.test((document.querySelector('[data-item="t-zero"] .su-last') || {}).textContent || ''), null, 10000);
  ok(/0\.000001 \(unit not set\)/.test(await p.textContent('[data-item="t-unset"] .su-last')), 'already saved empty-unit history loads exact small decimal quantities');
  await history(p); await action(p, 'reuse');
  ok(await p.inputValue(qty('t-zero')) === '1.2345' && await p.inputValue(qty('t-unset')) === '0.000001', 'reusing shipped empty-unit records retains every decimal place');
  await action(p, 'review'); await reviewed(p);
  review = await p.textContent('.su-review');
  ok(/1\.2345 \(unit not set\)/.test(review) && /0\.000001 \(unit not set\)/.test(review), 'review does not round precise or very small empty-unit quantities');
  await action(p, 'record');
  await L.waitFor(p, ([prefix, oldKey]) => Object.keys(window.__fake.dump()).filter(k => k.startsWith(prefix) && k !== oldKey && !/\/(previous|older)$/.test(k)).length === 1, [orderPrefix, existingKey], 10000);
  s = await dump(p);
  const resaved = orders(s).find(([key]) => key !== existingKey)[1];
  ok(resaved.lines.some(l => l.itemId === 't-zero' && l.qty === '1.2345' && l.amount === 1.2345 && l.unit === '') && resaved.lines.some(l => l.itemId === 't-unset' && l.qty === '0.000001' && l.amount === 0.000001 && l.unit === ''), 'recording reused shipped quantities preserves exact amounts and empty units');
  ok(JSON.stringify(s[existingKey]) === existingJson, 'the already shipped history record remains immutable');
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'exact empty-unit history journey fits a phone without page errors ' + p.errors.join(' | '));
  await p.context().close();

  // The existing staff free-text order list continues accepting a plain number independently of supplier sheets.
  p = await L.open(b, '#/orders', { who: 'ann', extra: F.fixture(), wait: 1500 });
  await p.fill('#o-text', 'TEST plain number request'); await p.fill('#o-qty', '3');
  await p.click('[data-p-form="oadd"] .nb-addbtn');
  await L.waitFor(p, () => Object.values(window.__fake.dump()).some(x => x.text === 'TEST plain number request' && x.qty === '3'), null, 10000);
  const request = Object.values(await dump(p)).find(x => x.text === 'TEST plain number request' && x.qty === '3');
  ok(request.qn === 3 && request.qu === '', 'general order requests still retain plain-number quantities without guessed units');
  ok(p.errors.length === 0, 'staff numeric order request: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close(); L.report(R);
})();
