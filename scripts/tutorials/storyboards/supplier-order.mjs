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

// After a tap, the next sentence waits until the page has finished redrawing and painted it, so on a busy computer
// the voice never runs ahead of the picture.
// Then a tiny paint nobody can see (one pixel, almost clear), twice, so the film catches the page as it ends up: the
// screencast skips frames while it waits for the last one, and a page that has stopped moving sends no more.
const poke = page => page.evaluate(() => new Promise(r => { const d = document.createElement('i'); d.style.cssText = 'position:fixed;width:1px;height:1px;opacity:.01;left:0;top:0;pointer-events:none'; document.documentElement.appendChild(d); requestAnimationFrame(() => requestAnimationFrame(() => { d.remove(); r(); })); }));
const settled = (page, cut, L) => L.settle(page, 2500).then(() => poke(page)).then(() => new Promise(r => setTimeout(r, 150))).then(() => poke(page));

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
  steps: [
    {
      title: 'Cut-offs first',
      say: ['The cut-offs sit at the top. Northside Foods closes at 15:00.', 'Pick a supplier here, or tap its name up top.'],
      do: [
        { s: 0, d: 0.3, circle: '#cut-band .cut-row >> nth=0', opts: { pad: 6 } },
        { s: 1, d: 0.3, circle: { phone: '.su-mobile-pick .ux-picker-trigger', desktop: '.su-side' }, opts: { pad: 6 } }
      ]
    },
    {
      title: 'Write the order',
      say: ['Each item shows its par, and what you ordered last time.', 'Type how many in the To order box.', 'Plus and minus change it by one.'],
      do: [
        { s: 0, d: 0.3, circle: '.su-row[data-item="chips"] .su-par', opts: { pad: 6 } },
        { s: 0, d: 2.0, circle: '.su-row[data-item="chips"] .su-last', opts: { pad: 6 } },
        { s: 1, d: 0.4, type: ['input[data-sf="qty"][data-i="chips"]', '5'] },
        { s: 2, d: 0.4, tap: '[data-su="step"][data-i="chips"][data-d="1"]', run: settled },
        { s: 2, d: 1.6, circle: '.su-row[data-item="chips"] .su-qty', opts: { pad: 6 } }
      ]
    },
    {
      title: 'Staff requests',
      say: ['Staff requests shows what the team asked for on the order list.', 'Ann asked for panko, so write it in.', 'Nothing is ticked off here. The request stays on the order list.'],
      do: [
        { s: 0, d: 0.6, tap: '[data-su="requests"]', run: settled },
        { s: 0, d: 2.2, circle: '.su-asked', opts: { pad: 6 } },
        { s: 1, d: 0.6, type: ['input[data-sf="qty"][data-i="panko"]', '5'] },
        { s: 2, d: 0.4, underline: '.su-asked .hint' }
      ]
    },
    {
      title: 'Review',
      say: ["When it's all in, tap Review order.", 'Check every line.', 'Send it the usual way. Copy order text helps. The book sends nothing itself.'],
      do: [
        { s: 0, d: 0.8, tap: '[data-su="review"]', run: settled },
        { s: 1, d: 0.2, circle: '.su-review .su-lines', opts: { pad: 6 } },
        { s: 2, d: 1.4, circle: '[data-su="copy-review"]', opts: { pad: 6 } }
      ]
    },
    {
      title: 'Record it',
      say: ['Once the order is placed, tap Record order placed.', 'Northside Foods now shows as ordered, and leaves the cut-offs.'],
      do: [
        { s: 0, d: 1.2, tap: '[data-su="record"]', run: settled },
        { s: 1, d: 0.3, circle: { phone: '.su-info-line', desktop: '.su-pick[data-sid="northside"]' }, opts: { pad: 6 } },
        { s: 1, d: 2.4, circle: '#cut-band', opts: { pad: 2 } }
      ]
    },
    {
      title: 'Order history',
      say: ['Order history shows each order, and who recorded it.', 'Choose a date to see that order.'],
      do: [
        { s: 0, d: 0.5, tap: '[data-su="history"]', run: settled },
        { s: 0, d: 2.0, circle: '.su-disclosure:has([data-su="history"]) .su-lines', opts: { pad: 6 } },
        { s: 1, d: 0.3, tap: '.su-history-dates .ux-picker-trigger', run: settled },
        { s: 1, d: 1.4, tap: '.ux-picker [data-index="1"]', run: settled }
      ]
    },
    {
      title: 'Order done',
      say: ['Ordered by phone or email instead? Open the order list.', 'Under the cut-offs, tap Order placed beside the supplier.', 'It shows who ordered it, with Undo.'],
      do: [
        { s: 0, d: 1.8, tap: '#cut-band .cut-go', run: settled },
        { s: 1, d: 0.2, tap: '.o-cut-fold > summary', run: settled },
        { s: 1, d: 1.6, tap: '.cut-tl li:has-text("West Bay Produce") .cut-box', run: settled },
        { s: 2, d: 0.2, circle: '.cut-tl li:has-text("West Bay Produce")', opts: { pad: 4 } }
      ]
    }
  ]
};
