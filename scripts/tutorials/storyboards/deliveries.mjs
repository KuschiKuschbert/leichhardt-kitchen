// The Delivery received tutorial (docs/tutorial-videos.md). Filmed as Ann, a cook, on her own phone, on the demo
// kitchen's Tuesday (fixtures.mjs): every role records deliveries. Three made-up suppliers deliver on a Tuesday (the
// head chef's cut-off settings, which fill the Due today chips), and the dairy came in this morning.
import { L } from '../kit.mjs';

const key = (...p) => ['kitchens', L.PIN].concat(p).join('/');
const day = L.ymd(new Date(L.NOW));
const tue = new Date(L.NOW).getDay();   // the delivery day: today

const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }
];

const extra = {
  [key('config', 'main')]: { people, sousIds: ['sam'], showBadges: true, staffSee: { cleaning: true },
    cutoffs: [
      { id: 'dairy', name: 'Bayview Dairy', dd: [tue], at: 11 * 60, pre: 1 },
      { id: 'veg', name: 'Greenvale Produce', dd: [tue], at: 15 * 60, pre: 1 },
      { id: 'meat', name: 'Hilltop Meats', dd: [tue], at: 17 * 60 + 30, pre: 1 }
    ] },
  // the dairy came in at 07:40, checked by Bo
  [key('deliveries', 'demo-dairy')]: { day, supplier: 'Bayview Dairy', receivedAt: L.NOW - (6 * 60 + 20) * 60000, recordedAt: L.NOW - (6 * 60 + 18) * 60000, chilled: 3.2, frozen: null, note: 'Milk, cream and butter', receivedBy: 'Bo', receivedById: 'bo', by: 'bo' }
};

export default {
  id: 'deliveries',
  title: 'Delivery received',
  sub: 'Temperatures on arrival',
  next: 'Guides',
  hash: '#/deliveries',
  who: 'ann',
  extra,
  intro: ['Delivery received.', "Here's how to check a delivery in, with its temperatures."],
  outro: ["That's Delivery received. Next up, Guides."],
  steps: [
    {
      title: 'The form',
      say: ['This is where a delivery is checked in.'],
      do: []
    }
  ]
};
