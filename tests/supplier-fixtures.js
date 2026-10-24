// Made-up suppliers and products for browser tests. None are the kitchen's purchasing records.
const L = require('./lib');
const key = parts => ['kitchens', L.PIN].concat(parts).join('/');
const today = L.ymd(new Date(L.NOW));
const next = (new Date(L.NOW).getDay() + 1) % 7;
const source = (name, par, row) => ({ file: 'synthetic-order-sheet.pdf', page: 1, row, name, par });
function item(id, name, par, extra) {
  return Object.assign({ id, name, pack: '1 kg bag', group: 'Test groceries', category: 'TEST STORE', par,
    parUnit: '', orderUnit: '', factor: 0, aliases: [], archived: false, manual: false,
    source: source(name, par, 1) }, extra || {});
}
const items = [
  item('t-stock', 'TEST STOCK 1KG BAG', '10', { parUnit: 'kg', orderUnit: 'kg', factor: 1, aliases: ['Test stock request'] }),
  item('t-zero', 'TEST ZERO PAR ITEM', '0'),
  item('t-unset', 'TEST UNSET PAR ITEM', ''),
  item('t-case', 'TEST CASE PRODUCT 12 X 250G', '2', { pack: '12 x 250 g case', orderUnit: 'case' }),
  item('t-long', 'TEST LONG PRODUCT ' + 'EXTRA-LONG-PACK-DESCRIPTION-'.repeat(5), '3'),
  item('t-safe', 'TEST PRODUCT <img src=x onerror=alert(1)> & "case"', '1')
];
function order(id, supplier, at, lines) {
  return { id, sid: supplier, supplierName: 'Northside Test Foods', v: 1, at, day: L.ymd(new Date(at)),
    deliveryDay: '', cutoffDay: '', cutoffId: '', by: 'sam', lines: lines.map(([i, qty, amount, unit]) => {
      const x = items[i];
      return { itemId: x.id, name: x.name, pack: x.pack, qty, amount, unit, par: x.par, parUnit: x.parUnit,
        source: x.source, suggestion: '', stock: '' };
    }) };
}
function fixture(patch) {
  const people = [
    { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
    { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
    { id: 'bo', name: 'Bo', role: 'head', add: true, tick: true, del: true, active: true }
  ];
  const seed = {
    [key(['config', 'main'])]: { people, headId: 'bo', sousIds: ['sam', 'bo'], pingIds: ['sam', 'bo'], fnIds: [],
      staffIds: ['sam', 'ann', 'bo'], showBadges: true, pinOpen: {},
      cutoffs: [{ id: 'northside', name: 'Northside Test Foods', dd: [next], at: 15 * 60, pre: 1, lead: 240 }] },
    [key(['suppliers', 'northside'])]: { name: 'Northside Test Foods', cutoffId: 'northside', v: 1, items,
      at: L.NOW - 10 * 86400000, by: 'owner' },
    [key(['suppliers', 'west-bay'])]: { name: 'West Bay Test Supply', cutoffId: '', v: 1,
      items: [item('w-one', 'TEST OTHER SUPPLIER PRODUCT', '')], at: L.NOW - 10 * 86400000, by: 'owner' },
    [key(['orders', today, 'lines', 'request-test'])]: { text: 'Test stock request', qty: '2 kg', recipes: [],
      addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 3600000, ordered: false, deleted: false }
  };
  const latest = order('previous', 'northside', L.NOW - 2 * 86400000, [[0, '2 kg', 2, 'kg'], [3, '1 case', 1, 'cases']]);
  const older = order('older', 'northside', L.NOW - 9 * 86400000, [[0, '1 kg', 1, 'kg'], [1, '2 bags', 2, 'bags']]);
  delete latest.id; delete older.id;
  seed[key(['suppliers', 'northside', 'orders', 'previous'])] = latest;
  seed[key(['suppliers', 'northside', 'orders', 'older'])] = older;
  return Object.assign(seed, patch || {});
}
module.exports = { key, today, items, fixture };
