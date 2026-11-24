// Pure supplier sales contracts. All POS rows and catalogue items here are synthetic.
const assert = require('node:assert/strict');
const S = require('../js/supplier-sales-core.js');
const C = require('../js/supplier-core.js');

const supplierId = 'sample-supplier';
const schnitzel = { id: 'sample-schnitzel', pack: '30 pieces', orderUnit: 'pack', parUnit: 'pieces', factor: 30 };
const rump = { id: 'sample-rump', pack: '', orderUnit: 'kg', parUnit: 'kg', factor: 1 };
const mince = { id: 'sample-mince', pack: '', orderUnit: '', parUnit: '', factor: 0 };
const catalogue = [{ id: supplierId, items: [schnitzel, rump, mince] }];

function report(rows) { return { start: '2024-02-26', end: '2024-03-03', rows }; }
function row(name, qty) { return { name, qty }; }
function part(item, amount, unit, perOrder, overrides) {
  return { sid: supplierId, iid: item.id, amount, unit, perOrder, orderUnit: item.orderUnit,
    catalogueKey: S.catalogKey(item), ...overrides };
}
function link(name, ...parts) { return { name, parts }; }
function get(result, item) { return result.suggestions.get(S.itemKey(supplierId, item.id)); }
function invalid(action) { assert.throws(action, error => error && error.code === 'invalid'); }
function test(name, run) { run(); console.log('PASS ' + name); }

test('inclusive calendar weeks validate across leap day and cannot end after the kitchen date', () => {
  const data = report([row('A dish', 1)]);
  assert.deepEqual(S.validateReport(data, '2024-03-03'), data);
  invalid(() => S.validateReport(data, '2024-03-02'));
  invalid(() => S.validateReport({ ...data, end: '2024-03-04' }, '2024-03-04'));
  invalid(() => S.validateReport({ ...data, start: '2023-02-29', end: '2023-03-06' }, '2024-03-03'));
  invalid(() => S.validateReport({ ...data, end: '2024-03-3' }, '2024-03-03'));
});

test('only normalised names and bounded numeric counts survive validation', () => {
  const rows = [row('Zulu', 4), row('Chicken Schnitzel', 200), row(' chicken    schnitzel ', 140)];
  const expected = [row('Chicken Schnitzel', 340), row('Zulu', 4)];
  assert.deepEqual(S.validateReport(report(rows)).rows, expected);
  assert.deepEqual(S.validateReport(report([...rows].reverse())).rows, expected);
  assert.equal(S.nameKey(' Italian  Schnitzel (1) '), 'italian schnitzel (1)');
  for (const quantity of ['10', -1, NaN, Infinity, 1000001]) invalid(() => S.validateReport(report([row('A dish', quantity)])));
  invalid(() => S.validateReport(report([row('Dish', 1000000), row('DISH', 1)])));
  invalid(() => S.validateReport(report([{ name: 'A dish', qty: 1, revenue: 1 }])));
  invalid(() => S.validateReport(report([])));
  invalid(() => S.validateReport(report(Array(1001).fill(rows[0]))));
});

test('part validation uses the book’s units and checks source shape before storage', () => {
  const named = S.validateLink(link(' A  dish ', part(rump, 250, 'grams')));
  assert.equal(named.name, 'A dish');
  assert.equal(named.parts[0].unit, 'g');
  assert.equal(named.parts[0].perOrder, 1000);
  assert.deepEqual(S.validateLink(link('To ignore')), { name: 'To ignore', parts: [] });
  invalid(() => S.validateLink(link('A dish', part(rump, 250, 'g', 1))));
  invalid(() => S.validateLink(link('A dish', part(schnitzel, 1, 'pieces'))));
  invalid(() => S.validateLink(link('A dish', part(rump, 0, 'g'))));
  invalid(() => S.validateLink(link('A dish', part(rump, 250, 'g', null, { sid: 'bad:id' }))));
  invalid(() => S.validateLink(link('A dish', part(rump, 250, 'g', null, { catalogueKey: '' }))));
  invalid(() => S.validateLink(link('A dish', part(rump, 250, 'g', null, { extra: 1 }))));
  invalid(() => S.validateLink(link('A dish', part(rump, 250, 'g'), part(rump, 250, 'g'))));
  invalid(() => S.validateLink(link('A dish', ...Array(9).fill(part(rump, 250, 'g')))));
  invalid(() => S.validateSales(null, [link('A dish'), link(' a   DISH ')]));
  invalid(() => S.validateSales(null, Array(1001).fill(link('A dish'))));
  assert.deepEqual(S.validateSales(null, [link('Zulu'), link('A dish')]).links, [link('A dish'), link('Zulu')]);
});

test('confirm only mapped lines, sum before pack rounding and return ordinary order quantities', () => {
  const weekly = report([row('Chicken Schnitzel', 200), row('Schnitzel Lunch', 140), row('250 g Rump', 188),
    row('Beef Mince', 111), row('Unknown Special', 9), row('Not ordered', 0), row('Ignore this', 15)]);
  const links = [
    link('Chicken schnitzel', part(schnitzel, 1, 'pieces', 30)),
    link('Schnitzel Lunch', part(schnitzel, 1, 'piece', 30)),
    link('250 g Rump', part(rump, 250, 'g')),
    link('Beef Mince', part(mince, 0.16, 'kg', 1, { orderUnit: 'kilos' })),
    link('Ignore this')
  ];
  const result = S.suggest(weekly, links, catalogue);
  const pack = get(result, schnitzel);
  assert.deepEqual([pack.amount, pack.unit, pack.qty], [12, 'packs', '12 packs']);
  assert.match(pack.reason, /340 pieces.*30 pieces.*Rounded up/);
  assert.equal(get(result, rump).qty, '47 kg');
  assert.equal(get(result, mince).qty, '17.76 kg');
  assert.equal(C.parseQuantity(get(result, mince).qty, mince.orderUnit).unit, 'kg');
  assert.deepEqual(result.review.map(entry => entry.name), ['Unknown Special']);
  assert.equal(mince.orderUnit, '');
  const exactlyAcrossThree = S.suggest(report([row('A', 10), row('B', 10), row('C', 10)]),
    ['A', 'B', 'C'].map(name => link(name, part(schnitzel, 1, 'pieces', 30))), catalogue);
  assert.equal(get(exactlyAcrossThree, schnitzel).qty, '1 packs');
});

test('all portions on a stale, archived or conflicting recipe are held', () => {
  const links = [
    link('Combo', part(rump, 1, 'kg'), part(schnitzel, 1, 'pieces', 30)),
    link('Solo rump', part(rump, 1, 'kg'))
  ];
  const weekly = report([row('Combo', 5), row('Solo rump', 2)]);
  const equivalents = { ...schnitzel, orderUnit: 'packs', pack: '   30 PIECES ', parUnit: 'pcs' };
  assert.equal(S.catalogKey(equivalents), S.catalogKey(schnitzel));
  for (const changed of [{ ...schnitzel, pack: '24 pieces' }, { ...schnitzel, archived: true }, { ...schnitzel, factor: 24 }, { ...schnitzel, orderUnit: 'bags' }]) {
    const result = S.suggest(weekly, links, [{ id: supplierId, items: [changed, rump] }]);
    assert.equal(result.suggestions.size, 1);
    assert.equal(get(result, rump).qty, '2 kg');
    assert.deepEqual(result.review.map(entry => entry.name), ['Combo']);
    assert.deepEqual(result.review[0].link, S.validateLink(links[0]));
  }
  const missing = S.suggest(weekly, links, [{ id: supplierId, items: [rump] }]);
  assert.equal(missing.review.length, 1);
  const incorrect = S.suggest(weekly, [link('Combo', part(schnitzel, 1, 'pieces', 29))], catalogue);
  assert.match(incorrect.review[0].reason, /conversion differs/);
  assert.equal(incorrect.suggestions.size, 0);
});

test('conflicting explicit conversion rates hold each affected recipe in either input order', () => {
  const item = { ...schnitzel, parUnit: '', factor: 0 };
  const catalog = [{ id: supplierId, items: [item, rump] }];
  const weekly = report([row('Dish A', 1), row('Dish B', 1)]);
  const links = [link('Dish A', part(item, 200, 'g', 1000), part(rump, 1, 'kg')), link('Dish B', part(item, 0.3, 'kg', 2))];
  for (const pair of [links, [...links].reverse()]) {
    const result = S.suggest(weekly, pair, catalog);
    assert.equal(result.suggestions.size, 0);
    assert.deepEqual(result.review.map(entry => entry.name), ['Dish A', 'Dish B']);
  }
  const equivalent = [links[0], link('Dish B', part(item, 0.3, 'kg', 1))];
  assert.equal(get(S.suggest(weekly, equivalent, catalog), item).amount, 1);
});

test('ambiguous mapping and amounts beyond the order parser limit remain for review', () => {
  const weekly = report([row('Dish A', 100000), row('Dish B', 2)]);
  const result = S.suggest(weekly, [
    link('Dish A', part(rump, 1, 'kg')),
    link('Dish B', part(schnitzel, 1, 'pieces', 30)),
    link('dish b')
  ], catalogue);
  assert.equal(result.suggestions.size, 0);
  assert.match(result.review[0].reason, /cannot be entered/);
  assert.match(result.review[1].reason, /More than one/);
});
