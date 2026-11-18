// The Wastage tutorial (docs/tutorial-videos.md). Filmed as Bo, a cook, on his own phone, on the demo kitchen's Tuesday
// (fixtures.mjs): three entries already logged today, and Garlic bread logged twice in the last two weeks, so the book
// fills its section, reason and unit (Filled for you, the nightly summary as the server writes it: L.wasteSum).
import { L } from '../kit.mjs';

const key = (...p) => ['kitchens', L.PIN].concat(p).join('/');
const day = L.ymd(new Date(L.NOW));
const at = mins => L.NOW - mins * 60000;
const sheet = '.w-sheet';
const waste = (text, amount, unit, reason, station, by, mins) => ({ text, amount, unit, reason, action: '', station, addedBy: by, addedById: by.toLowerCase(), addedAt: at(mins), deleted: false });

const extra = Object.assign({
  [key('waste', day, 'lines', 'w0')]: waste('Cos lettuce outer leaves', 0.5, 'kg', 'prep', 'Larder', 'Ann', 150),
  [key('waste', day, 'lines', 'w2')]: waste('Hollandaise', 1, 'L', 'fault', 'Sauce', 'Ann', 70)
}, L.wasteSum([
  { t: 'Garlic bread', n: 2, r: { excess: 2 }, unit: 'portions', reason: 'excess', sec: 'Grill', amt: 6, last: { unit: 'portions', reason: 'excess', sec: 'Grill', amt: 6 } }
]));

export default {
  id: 'wastage',
  title: 'Wastage',
  sub: 'What went in the bin, and why',
  next: 'Transfers',
  hash: '#/waste',
  who: 'bo',
  extra,
  intro: ['Wastage.', "Here's how to log what gets thrown out, and why."],
  outro: ["That's Wastage. Next up, Transfers."],
  steps: [
    {
      title: "Today's waste",
      say: ["This is today's wastage log."],
      do: []
    }
  ]
};
