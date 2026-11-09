// Pure supplier contracts, with made-up catalogue items only. No Firebase or real supplier data.
const assert = require('assert');
const C = require('../js/supplier-core.js');
const results = [];
function test(name, run) { try { run(); results.push('PASS ' + name); } catch (e) { results.push('FAIL ' + name + ': ' + e.message); } }
function item(overrides) { return Object.assign({ id: 'i-test', name: 'Test stock', pack: '5 kg bag', group: 'Dry goods', category: 'Dry store', par: '10', parUnit: 'kg', orderUnit: 'kg', factor: 1, aliases: ['Test request'], archived: false, manual: true, source: { file: '', page: 0, row: 0, name: '', par: '' } }, overrides || {}); }
function supplier(items) { return { id: 's-test', name: 'Test supplier', cutoffId: 'test-cut', v: 1, items: items || [item()], at: 1, by: 'test-chef' }; }
function throws(code, action) { assert.throws(action, e => e.code === code); }
test('blank, zero and decimal pars are distinct; invalid pars cannot enter the catalogue', () => {
  assert.strictEqual(C.cleanPar(''), ''); assert.strictEqual(C.cleanPar(null), ''); assert.strictEqual(C.cleanPar(0), '0'); assert.strictEqual(C.cleanPar(' 1.50 '), '1.50'); assert.strictEqual(C.cleanPar('1,5'), '1,5');
  [-1, Infinity, NaN, 100000, {}, '-1', '1e2', '1 kg', 'about 3'].forEach(v => assert.strictEqual(C.cleanPar(v), null));
});
test('explicit order amounts reuse the book parser without changing their units', () => {
  assert.deepStrictEqual(C.parseQuantity('1/2 tub'), { qty: '1/2 tub', amount: 0.5, unit: 'tubs' });
  assert.deepStrictEqual(C.parseQuantity('2 ctn'), { qty: '2 ctn', amount: 2, unit: 'cartons' });
  assert.deepStrictEqual(C.parseQuantity('3 rolls'), { qty: '3 rolls', amount: 3, unit: 'rolls' });
  assert.deepStrictEqual(C.parseQuantity('2 Litres'), { qty: '2 Litres', amount: 2, unit: 'L' });
  ['', '0 kg', '-1 kg', '1-2 kg', '1 kg + 2 bags', '2 <widgets>', '1/0 kg'].forEach(v => assert.strictEqual(C.parseQuantity(v), null));
  assert.deepStrictEqual(C.parseStock('0 kg'), { qty: '0 kg', amount: 0, unit: 'kg' });
});
test('confirmed catalogue units let chefs enter ordinary numeric quantities without changing explicit units', () => {
  assert.deepStrictEqual(C.parseQuantity('2', 'kg'), { qty: '2 kg', amount: 2, unit: 'kg' });
  assert.deepStrictEqual(C.parseQuantity(' 1.5 ', 'kg'), { qty: '1.5 kg', amount: 1.5, unit: 'kg' });
  const comma = C.parseQuantity('1,5', 'kg');
  assert.strictEqual(comma.amount, 1.5); assert.strictEqual(comma.unit, 'kg');
  assert.deepStrictEqual(C.parseQuantity('2', 'Bags'), { qty: '2 bags', amount: 2, unit: 'bags' });
  assert.deepStrictEqual(C.parseQuantity('2 bags', 'kg'), { qty: '2 bags', amount: 2, unit: 'bags' });
  assert.deepStrictEqual(C.parseQuantity('1/2 tub', 'kg'), { qty: '1/2 tub', amount: 0.5, unit: 'tubs' });
  ['', '0', '0.0', '-1', '1-2', 'about 3', '100000'].forEach(v => assert.strictEqual(C.parseQuantity(v, 'kg'), null));
  ['5 kg bag', '<kg>'].forEach(unit => assert.deepStrictEqual(C.parseQuantity('2', unit), { qty: '2', amount: 2, unit: '' }));
  assert.deepStrictEqual(C.parseStock('0', 'kg'), { qty: '0 kg', amount: 0, unit: 'kg' });
  assert.deepStrictEqual(C.parseStock('0 g', 'kg'), { qty: '0 g', amount: 0, unit: 'g' });
  assert.strictEqual(C.parseStock('-1', 'kg'), null);
  assert.deepStrictEqual(C.parseStock('0'), { qty: '0', amount: 0, unit: '' });
});
test('number-only entries keep empty units and preserve the shipped decimal precision', () => {
  for (const [input, amount, qty] of [['2', 2, '2'], ['1,5', 1.5, '1,5'], ['1.2345', 1.2345, '1.2345'], ['0.000001', 0.000001, '0.000001'], ['1/2', 0.5, '0.5'], ['1 1/2', 1.5, '1.5'], ['½', 0.5, '0.5'], ['⅓', 0.333, '0.333']]) {
    assert.deepStrictEqual(C.parseQuantity(input), { qty, amount, unit: '' });
  }
  ['', '0', '-2', '1-2', '1e2', '100000', '1/0', '0.0000001', '2+3', '2 3', 'about 2'].forEach(v => assert.strictEqual(C.parseQuantity(v), null, v));
  assert.strictEqual(C.parseStock('-2'), null);
  assert.strictEqual(C.convert(2, '', ''), null);
  assert.strictEqual(C.convert(2, '', 'kg'), null);
});
test('unqualified snapshots preserve source and never acquire a later catalogue unit', () => {
  const entry = item({ orderUnit: '', parUnit: '', factor: 0 });
  const line = C.snapshotLines([entry], { 'i-test': '2' }, { 'i-test': '0' })[0];
  assert.deepStrictEqual([line.qty, line.amount, line.unit, line.stock], ['2', 2, '', '0']);
  assert.deepStrictEqual(line.source, entry.source);
  const last = { id: 'old', lines: [line] };
  assert.strictEqual(C.suggestQuantity(entry, last).qty, '2');
  assert.strictEqual(C.suggestQuantity(item(), last), null);
  assert.strictEqual(C.suggestQuantity(entry, last, '0'), null);
  assert.strictEqual(C.suggestQuantity(item(), last, '0', ''), null);
  const retained = C.snapshotLines([item()], { 'i-test': '1.2345' }, { 'i-test': '0' }, {}, { qty: { 'i-test': '' }, stock: { 'i-test': '' } })[0];
  assert.deepStrictEqual([retained.qty, retained.amount, retained.unit, retained.stock], ['1.2345', 1.2345, '', '0']);
  const changed = C.snapshotLines([item({ orderUnit: 'g', parUnit: 'g' })], { 'i-test': '2' }, { 'i-test': '4' }, {}, { qty: { 'i-test': 'kg' }, stock: { 'i-test': 'kg' } })[0];
  assert.strictEqual(changed.qty, '2 kg'); assert.strictEqual(changed.stock, '4 kg');
});
test('an imported name, punctuation, source and original par survive current par edits', () => {
  const original = item({ name: '*TEST PRODUCT (6) 1KG', manual: false, source: { file: 'test-source.pdf', page: 2, row: 7, name: '*TEST PRODUCT (6) 1KG', par: '0' } });
  const changed = C.cleanItem(Object.assign({}, original, { par: '12' }), original);
  assert.strictEqual(changed.par, '12'); assert.strictEqual(changed.name, original.name); assert.strictEqual(changed.source.par, '0');
  changed.source.par = '90'; assert.strictEqual(original.source.par, '0');
  throws('immutable', () => C.cleanItem(Object.assign({}, original, { source: Object.assign({}, original.source, { par: '4' }) }), original));
  throws('source', () => C.cleanItem(Object.assign({}, original, { name: 'Shorter name' }), original));
});
test('manual additions have no invented PDF source; supplier and item ids stay stable', () => {
  assert.strictEqual(C.cleanItem(item()).manual, true);
  throws('source', () => C.cleanItem(item({ source: { file: 'imaginary.pdf', page: 1, row: 1, name: 'Test stock', par: '10' } })));
  throws('immutable', () => C.cleanItem(item({ id: 'new-id' }), item()));
  throws('archive', () => C.cleanSupplier(supplier([]), supplier()));
  assert.strictEqual(C.cleanSupplier(supplier([item({ archived: true })]), supplier()).items[0].archived, true);
});
test('catalogue import rejects commercial fields, unsupported formats and duplicate ids', () => {
  assert.strictEqual(C.validateCatalogue({ version: 1, suppliers: [supplier()] }).suppliers.length, 1);
  throws('version', () => C.validateCatalogue({ version: 2, suppliers: [] }));
  throws('field', () => C.validateCatalogue({ version: 1, suppliers: [supplier([item({ price: 12 })])] }));
  throws('field', () => C.validateCatalogue({ version: 1, suppliers: [Object.assign(supplier(), { account: 'not-allowed' })] }));
  throws('duplicate', () => C.validateCatalogue({ version: 1, suppliers: [supplier(), supplier()] }));
  throws('duplicate', () => C.cleanSupplier(supplier([item(), item()])));
  const first = supplier(Array.from({ length: 301 }, (_, i) => item({ id: 'a-' + i })));
  const second = Object.assign(supplier(Array.from({ length: 300 }, (_, i) => item({ id: 'b-' + i }))), { id: 's-other' });
  throws('items', () => C.validateCatalogue({ version: 1, suppliers: [first, second] }));
});
test('a snapshot retains exact current quantities, pars and source after later catalogue edits', () => {
  const entry = item(), suggestion = { reason: 'From previous order' }, values = { 'i-test': '2 Kilos' }, stocks = { 'i-test': '3 kg' };
  const snapshot = C.snapshotLines([entry], values, stocks, { 'i-test': suggestion });
  assert.strictEqual(snapshot[0].qty, '2 Kilos'); assert.strictEqual(snapshot[0].amount, 2); assert.strictEqual(snapshot[0].unit, 'kg');
  assert.strictEqual(snapshot[0].suggestion, 'From previous order'); assert.strictEqual(snapshot[0].stock, '3 kg');
  entry.par = '90'; entry.name = 'Renamed'; values['i-test'] = '8 kg';
  assert.strictEqual(snapshot[0].par, '10'); assert.strictEqual(snapshot[0].name, 'Test stock'); assert.strictEqual(snapshot[0].qty, '2 Kilos');
  snapshot[0].source.name = 'Changed snapshot source'; assert.strictEqual(entry.source.name, '');
});
test('review records numeric inputs with their confirmed units and only validates stock for ordered items', () => {
  const entry = item(), unused = item({ id: 'i-unused', name: 'Unused stock', orderUnit: '', parUnit: '', factor: 0 });
  const values = { 'i-test': '1.5' }, stocks = { 'i-test': '0', 'i-unused': 'not counted' };
  const snapshot = C.snapshotLines([entry, unused], values, stocks);
  assert.strictEqual(snapshot.length, 1);
  assert.deepStrictEqual([snapshot[0].qty, snapshot[0].amount, snapshot[0].unit, snapshot[0].stock], ['1.5 kg', 1.5, 'kg', '0 kg']);
  assert.strictEqual(values['i-test'], '1.5'); assert.strictEqual(stocks['i-test'], '0');
  assert.strictEqual(snapshot[0].par, '10');
  assert.strictEqual(C.snapshotLines([unused], { 'i-unused': '2' })[0].unit, '');
  throws('stock', () => C.snapshotLines([entry], { 'i-test': '2' }, { 'i-test': '-1' }));
});
test('recording refuses stale/archived items, invalid counts and empty drafts', () => {
  throws('archived', () => C.snapshotLines([item({ archived: true })], { 'i-test': '1 kg' }));
  throws('quantity', () => C.snapshotLines([item({ orderUnit: '', factor: 0 })], { 'i-test': '2 or 3' }));
  throws('stock', () => C.snapshotLines([item()], { 'i-test': '2 kg' }, { 'i-test': '-1 kg' }));
  throws('item', () => C.snapshotLines([item()], { 'i-test': '2 kg', 'removed-id': '1 bag' }));
  throws('empty', () => C.snapshotLines([item()], { 'i-test': ' ' }));
});
test('stock counts have priority over repeats; zero stock and compatible mass units work', () => {
  const last = { id: 'o-old', lines: [{ itemId: 'i-test', qty: '2 kg' }] };
  const topup = C.suggestQuantity(item(), last, '3 kg');
  assert.strictEqual(topup.qty, '7 kg'); assert.strictEqual(topup.kind, 'topup'); assert(topup.reason.includes('10 kg - counted 3 kg = 7 kg'));
  assert.strictEqual(C.suggestQuantity(item(), last, '0 kg').qty, '10 kg');
  assert.strictEqual(C.suggestQuantity(item(), last, '500 g').qty, '9.5 kg');
  assert.strictEqual(C.suggestQuantity(item(), last).qty, '2 kg');
  assert.strictEqual(C.suggestQuantity(item(), last).sourceOrderId, 'o-old');
  assert.strictEqual(C.suggestQuantity(item(), last, '3 bags'), null, 'unknown stock conversion must not fall back to repeat');
  assert.strictEqual(C.suggestQuantity(item(), last, '12 kg'), null);
});
test('numeric stock counts use the confirmed par unit before calculating compatible top-ups', () => {
  assert.strictEqual(C.suggestQuantity(item(), null, '0').qty, '10 kg');
  assert.strictEqual(C.suggestQuantity(item(), null, '3.5').qty, '6.5 kg');
  const packed = item({ par: '12', orderUnit: 'bags', factor: 5 });
  assert.strictEqual(C.suggestQuantity(packed, null, '3').qty, '2 bags');
  assert.strictEqual(C.suggestQuantity(item({ parUnit: '', orderUnit: 'kg', factor: 0 }), null, '3'), null);
  assert.strictEqual(C.suggestQuantity(item(), null, '-1'), null);
});
test('pack top-ups need a verified conversion and round only whole order units upward', () => {
  const bag = item({ par: '12', orderUnit: 'bags', factor: 5 });
  assert.strictEqual(C.suggestQuantity(bag, null, '3 kg').qty, '2 bags');
  assert(C.suggestQuantity(bag, null, '3 kg').reason.includes('each order unit contains 5 kg'));
  assert.strictEqual(C.suggestQuantity(item({ orderUnit: 'bags', factor: 0 }), null, '3 kg'), null);
  assert.strictEqual(C.suggestQuantity(item({ parUnit: '', orderUnit: '', factor: 0 }), null, '3 kg'), null);
  assert.strictEqual(C.suggestQuantity(item({ par: '' }), null, '3 kg'), null);
  assert.strictEqual(C.suggestQuantity(item({ par: '0' }), null, '0 kg'), null);
  assert.strictEqual(C.suggestQuantity(item({ par: '1.001', orderUnit: 'kg', parUnit: 'kg', factor: 1 }), null, '0 kg').qty, '1.001 kg');
  throws('factor', () => C.cleanItem(item({ parUnit: 'g', orderUnit: 'kg', factor: 1 })));
});
test('suggestions never use absent, voided, archived or incompatible previous-order quantities', () => {
  assert.strictEqual(C.suggestQuantity(item(), { lines: [{ itemId: 'another', qty: '2 kg' }] }), null);
  assert.strictEqual(C.suggestQuantity(item(), { voided: true, lines: [{ itemId: 'i-test', qty: '2 kg' }] }), null);
  assert.strictEqual(C.suggestQuantity(item({ archived: true }), { lines: [{ itemId: 'i-test', qty: '2 kg' }] }), null);
  assert.strictEqual(C.suggestQuantity(item({ orderUnit: 'cartons', factor: 0 }), { lines: [{ itemId: 'i-test', qty: '2 kg' }] }), null);
});
test('custom units retain literal matching and only confirmed conversions drive top-ups', () => {
  assert.strictEqual(C.normaliseUnit('  CrAtEs  '), 'crates');
  assert.strictEqual(C.normaliseUnit('Sample  sachets'), 'sample sachets');
  assert.deepStrictEqual(C.parseQuantity('2 Crates'), { qty: '2 Crates', amount: 2, unit: 'crates' });
  assert.deepStrictEqual(C.parseQuantity('1.5 sample sachets'), { qty: '1.5 sample sachets', amount: 1.5, unit: 'sample sachets' });
  ['2 kg 500 g', '2 kg+500g', '2 <crate>', '2 ctn/pack', '2 crate12'].forEach(v => assert.strictEqual(C.parseQuantity(v), null));
  const custom = item({ par: '10', parUnit: 'sachets', orderUnit: 'crates', factor: 4 });
  assert.strictEqual(C.suggestQuantity(custom, null, '3 sachets').qty, '2 crates');
  assert.strictEqual(C.suggestQuantity(Object.assign({}, custom, { factor: 0 }), null, '3 sachets'), null);
  assert.strictEqual(C.convert(2, 'crates', 'sachets'), null);
  assert.strictEqual(C.convert(2, 'CRATES', 'crates'), 2);
  assert.strictEqual(C.convert(2, 'crate', 'crates'), null, 'custom plurals are not guessed');
  assert.strictEqual(C.snapshotLines([custom], { 'i-test': '2 crates' })[0].unit, 'crates');
});
test('staff requests match complete names or confirmed aliases and never fuzzy or ambiguous names', () => {
  const entries = [item(), item({ id: 'i-second', name: 'Second stock', aliases: ['Shared name'] }), item({ id: 'constructor', name: 'Constructor', aliases: ['Shared name'] })];
  const requests = [{ id: 'r1', text: '  TEST   STOCK ' }, { id: 'r2', text: 'Test request' }, { id: 'r3', text: 'Test stoc' }, { id: 'r4', text: 'Shared name' }, { id: 'r5', text: 'Constructor' }, { id: 'r6', text: 'Test stock', ordered: true }];
  const matched = C.matchRequests(entries, requests);
  assert.deepStrictEqual(matched.matches.find(x => x.itemId === 'i-test').requestIds, ['r1', 'r2']);
  assert.deepStrictEqual(matched.matches.find(x => x.itemId === 'constructor').requestIds, ['r5']);
  assert.deepStrictEqual(matched.unmatched.map(x => x.id), ['r3', 'r4']);
  assert.strictEqual(requests[0].ordered, undefined);
});
test('duplicate-name warnings retain pack variants and audit changes are isolated copies', () => {
  const entry = item(), changed = item({ par: '12' });
  assert.strictEqual(C.duplicateItems([entry], item({ id: 'i-other', name: ' TEST STOCK ', pack: 'Other pack' })).length, 1);
  const audit = C.catalogueDiff(supplier(), supplier([changed]));
  assert.strictEqual(audit.length, 1); assert.strictEqual(audit[0].action, 'change_par'); assert.strictEqual(audit[0].before.par, '10');
  changed.par = '99'; assert.strictEqual(audit[0].after.par, '12');
  assert.strictEqual(C.catalogueDiff(supplier(), supplier([item({ archived: true })]))[0].action, 'archive_item');
});
function imported(id, name, file, overrides) {
  return item(Object.assign({ id, name, manual: false, source: { file, page: 1, row: 1, name, par: '0' } }, overrides || {}));
}
function templateOrder(templates) { return { version: 1, kind: 'supplier-template-order', templates }; }
function template(file, names) { return { file, items: names.map(name => typeof name === 'string' ? { name, pack: '' } : name) }; }
test('template order validation accepts only the bounded private ordering format', () => {
  const payload = templateOrder([template('example.pdf', ['TEST BAG'])]);
  assert.deepStrictEqual(C.validateTemplateOrder(payload), payload);
  const checked = C.validateTemplateOrder(payload); checked.templates[0].items[0].name = 'Changed';
  assert.strictEqual(payload.templates[0].items[0].name, 'TEST BAG');
  throws('version', () => C.validateTemplateOrder({ ...payload, version: 2 }));
  throws('version', () => C.validateTemplateOrder({ ...payload, kind: 'supplier-catalogue' }));
  throws('items', () => C.validateTemplateOrder(templateOrder([])));
  throws('items', () => C.validateTemplateOrder(templateOrder([template('example.pdf', [])])));
  throws('field', () => C.validateTemplateOrder({ ...payload, suppliers: [] }));
  throws('field', () => C.validateTemplateOrder(templateOrder([{ file: 'example.pdf', items: [{ name: 'TEST BAG', pack: '', price: 2 }] }])));
  throws('duplicate', () => C.validateTemplateOrder(templateOrder([template('Example.pdf', ['TEST A']), template(' example.PDF ', ['TEST B'])])));
});
test('template order follows all files for a supplier and retains unchanged extra items afterwards', () => {
  const first = imported('first', 'TEST FIRST', 'dry.pdf', { pack: 'Current edited pack', par: '1.50', aliases: ['Exact alias'] });
  const second = imported('second', 'TEST SECOND', 'fish.pdf', { par: '', archived: true });
  const third = imported('third', 'TEST THIRD', 'dry.pdf', { category: 'Another category' });
  const extra = item({ id: 'manual-extra', name: 'Manual extra' });
  const extraImported = imported('imported-extra', 'TEST EXTRA', 'old.pdf');
  const saved = supplier([extra, first, extraImported, second, third]), before = JSON.stringify(saved);
  const result = C.planTemplateOrder(templateOrder([template('dry.pdf', [{ name: 'TEST THIRD', pack: '' }, { name: 'TEST FIRST', pack: 'Original pack' }]), template('fish.pdf', ['TEST SECOND'])]), [saved]);
  assert.deepStrictEqual([result.matched, result.total], [3, 3]);
  const plan = result.plans[0];
  assert.deepStrictEqual([plan.id, plan.v, plan.name, plan.matched, plan.retained, plan.changed], ['s-test', 1, 'Test supplier', 3, 2, true]);
  assert.deepStrictEqual(plan.items.map(x => x.id), ['third', 'first', 'second', 'manual-extra', 'imported-extra']);
  plan.items.forEach(entry => assert.deepStrictEqual(entry, saved.items.find(x => x.id === entry.id)));
  assert.strictEqual(JSON.stringify(saved), before, 'planning never mutates the supplied catalogue');
  plan.items[1].source.par = '99'; assert.strictEqual(first.source.par, '0', 'preview items are isolated copies');
});
test('renamed templates and a template spanning suppliers use complete original names only', () => {
  const a = supplier([imported('a', 'TEST APPLE', 'original-a.pdf')]);
  const b = { ...supplier([imported('b', 'TEST BEAN', 'original-b.pdf')]), id: 's-other', name: 'Other supplier' };
  const result = C.planTemplateOrder(templateOrder([template('new-template.pdf', [' test   bean ', 'TEST APPLE'])]), [a, b]);
  assert.deepStrictEqual(result.plans.map(p => p.id), ['s-other', 's-test']);
  assert(result.plans.every(p => !p.changed), 'unchanged plans are returned for the preview');
  assert.throws(() => C.planTemplateOrder(templateOrder([template('new.pdf', ['TEST APPL'])]), [a, b]), e => e.code === 'template-missing' && /TEST APPL/.test(e.message) && /new.pdf/.test(e.message));
  a.items[0].aliases = ['SHORT NAME'];
  throws('template-missing', () => C.planTemplateOrder(templateOrder([template('new.pdf', ['SHORT NAME'])]), [a]));
});
test('file provenance and pack variants resolve exact duplicates without guessing', () => {
  const one = imported('one', 'TEST SAME', 'first.pdf', { pack: '1 kg' });
  const two = imported('two', 'TEST SAME', 'second.pdf', { pack: '2 kg' });
  const entries = [supplier([one, two])];
  let result = C.planTemplateOrder(templateOrder([template(' SECOND.PDF ', [{ name: 'TEST SAME', pack: 'Old edited pack' }])]), entries);
  assert.strictEqual(result.plans[0].items[0].id, 'two');
  result = C.planTemplateOrder(templateOrder([template('renamed.pdf', [{ name: 'TEST SAME', pack: ' 2 KG ' }])]), entries);
  assert.strictEqual(result.plans[0].items[0].id, 'two');
  assert.throws(() => C.planTemplateOrder(templateOrder([template('renamed.pdf', ['TEST SAME'])]), entries), e => e.code === 'template-ambiguous' && /TEST SAME/.test(e.message));
  throws('template-ambiguous', () => C.planTemplateOrder(templateOrder([template('renamed.pdf', [{ name: 'TEST SAME', pack: '2 kg' }])]), [supplier([one, two, { ...two, id: 'three' }])]));
  throws('template-ambiguous', () => C.planTemplateOrder(templateOrder([template('first.pdf', ['TEST SAME'])]), [supplier([one]), { ...supplier([{ ...one, id: 'different' }]), id: 'other' }]));
});
test('repeated template rows cannot select the same item twice or discard catalogue records', () => {
  const saved = supplier([imported('one', 'TEST ONE', 'example.pdf'), imported('two', 'TEST TWO', 'example.pdf')]);
  throws('duplicate', () => C.planTemplateOrder(templateOrder([template('one.pdf', ['TEST ONE']), template('two.pdf', ['TEST ONE'])]), [saved]));
  throws('duplicate', () => C.planTemplateOrder(templateOrder([template('one.pdf', ['TEST ONE', 'TEST ONE'])]), [saved]));
  throws('duplicate', () => C.planTemplateOrder(templateOrder([template('one.pdf', ['TEST ONE'])]), [saved, saved]));
  throws('duplicate', () => C.planTemplateOrder(templateOrder([template('one.pdf', ['TEST ONE'])]), [supplier([saved.items[0], saved.items[0]])]));
});
test('reordering keeps previous quantities attached to stable IDs and leaves history untouched', () => {
  const first = imported('first', 'TEST FIRST', 'example.pdf'), second = imported('second', 'TEST SECOND', 'example.pdf');
  const previous = { id: 'recorded', lines: C.snapshotLines([first, second], { first: '2 kg', second: '7 kg' }) }, frozen = JSON.stringify(previous);
  const plan = C.planTemplateOrder(templateOrder([template('example.pdf', ['TEST SECOND', 'TEST FIRST'])]), [supplier([first, second])]).plans[0];
  assert.deepStrictEqual(plan.items.map(entry => [entry.id, C.suggestQuantity(entry, previous).qty]), [['second', '7 kg'], ['first', '2 kg']]);
  const reused = C.snapshotLines(plan.items, Object.fromEntries(previous.lines.map(line => [line.itemId, line.qty])));
  assert.deepStrictEqual(reused.map(line => [line.itemId, line.qty]), [['second', '7 kg'], ['first', '2 kg']]);
  assert.strictEqual(JSON.stringify(previous), frozen);
});
results.forEach(r => console.log(r));
const failed = results.filter(r => r.startsWith('FAIL')).length;
console.log(failed + ' failed of ' + results.length);
process.exit(failed ? 1 : 0);
