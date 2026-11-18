// The Supplier order tutorial (docs/tutorial-videos.md): #/suppliers, the chefs' order sheet for each supplier. Filmed as
// Sam, the sous chef, on the demo kitchen's Tuesday at 14:00 (fixtures.mjs), an hour before Northside Foods' order
// closes. Made-up suppliers and products only: no prices, no supplier codes, nothing from a real order sheet.
import { L } from '../kit.mjs';

const key = (...p) => ['kitchens', L.PIN].concat(p).join('/');
const day = L.ymd(new Date(L.NOW)), DAY = 86400000;
const next = (new Date(L.NOW).getDay() + 1) % 7;
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }
];
// a product the way a supplier's catalogue keeps it (tests/supplier-fixtures.js), from a made-up order sheet
// (par and order counted in the same confirmed unit, so each row has its plus and minus)
const item = (id, name, pack, group, unit, par, x) => Object.assign({ id, name, pack, group, category: group.toUpperCase(), par, parUnit: unit, orderUnit: unit, factor: 1, aliases: [],
  archived: false, manual: false, source: { file: 'demo-order-sheet.pdf', page: 1, row: 1, name, par } }, x || {});
const NORTH = [
  item('chips', 'FROZEN STRAIGHT CUT CHIPS', '4 x 2.5 kg carton', 'Freezer', 'carton', '6'),
  item('calamari', 'CALAMARI RINGS', '1 kg bag', 'Freezer', 'kg', '4'),
  item('oil', 'CANOLA FRYING OIL', '20 L drum', 'Dry store', 'drum', '2'),
  item('panko', 'PANKO CRUMBS', '1 kg bag', 'Dry store', 'kg', '5', { aliases: ['Panko', 'Breadcrumbs'] }),
  item('flour', 'PLAIN FLOUR', '12.5 kg bag', 'Dry store', 'bag', '1'),
  item('tomato', 'DICED TOMATOES', '6 x 2.5 kg tins', 'Dry store', 'carton', '2'),
  item('mayo', 'WHOLE EGG MAYONNAISE', '2.5 L tub', 'Dry store', 'tub', '3'),
  item('butter', 'UNSALTED BUTTER', '5 kg block', 'Cool room', 'block', '2')
];
const WEST = [
  item('cos', 'COS LETTUCE', 'each', 'Fruit and veg', 'each', '12'),
  item('onion', 'BROWN ONIONS', '10 kg bag', 'Fruit and veg', 'bag', '2'),
  item('lemon', 'LEMONS', '1 kg', 'Fruit and veg', 'kg', '3')
];
const pastOrder = (at, lines) => ({ sid: 'northside', supplierName: 'Northside Foods', v: 1, at, day: L.ymd(new Date(at)), deliveryDay: '', cutoffDay: '', cutoffId: '', by: 'sam',
  lines: lines.map(([id, qty, amount, unit]) => { const x = NORTH.find(i => i.id === id); return { itemId: id, name: x.name, pack: x.pack, qty, amount, unit, par: x.par, parUnit: x.parUnit, source: x.source, suggestion: '', stock: '' }; }) });
const extra = {
  [key('config', 'main')]: { people, sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], showBadges: true, staffSee: { cleaning: true },
    cutoffs: [{ id: 'northside', name: 'Northside Foods', dd: [next], at: 15 * 60, pre: 1, lead: 240 }, { id: 'westbay', name: 'West Bay Produce', dd: [next], at: 17 * 60, pre: 1, lead: 240 }] },
  [key('suppliers', 'northside')]: { name: 'Northside Foods', cutoffId: 'northside', v: 1, items: NORTH, at: L.NOW - 20 * DAY, by: 'owner' },
  [key('suppliers', 'westbay')]: { name: 'West Bay Produce', cutoffId: 'westbay', v: 1, items: WEST, at: L.NOW - 20 * DAY, by: 'owner' },
  [key('suppliers', 'northside', 'orders', 'o-last')]: pastOrder(L.NOW - 7 * DAY, [['chips', '5 cartons', 5, 'cartons'], ['oil', '2 drums', 2, 'drums'], ['panko', '3 kg', 3, 'kg'], ['mayo', '2 tubs', 2, 'tubs']]),
  [key('suppliers', 'northside', 'orders', 'o-older')]: pastOrder(L.NOW - 14 * DAY, [['chips', '6 cartons', 6, 'cartons'], ['flour', '1 bag', 1, 'bags'], ['butter', '2 blocks', 2, 'blocks']]),
  // Ann asked for panko on the order list this morning
  [key('orders', day, 'lines', 'panko')]: { text: 'Panko', qty: '2 kg', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 4 * 3600000, ordered: false, deleted: false }
};

export default {
  id: 'supplier-order',
  title: 'Supplier order',
  sub: 'Write it, check it, record it',
  next: 'Recipes and drawings',
  hash: '#/suppliers/northside',
  who: 'sam',
  extra,
  intro: ['Supplier order.', "Here's how the chefs write each supplier's order, check it and record it."],
  outro: ["That's Supplier order. Next up, Recipes and drawings."],
  steps: []
};
