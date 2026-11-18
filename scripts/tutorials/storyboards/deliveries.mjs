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
      title: 'Check it in',
      say: ['When a delivery arrives, check it in here.', 'Your name and the time are filled in for you.'],
      do: [
        { s: 0, d: 0.3, underline: '.dl-heading h1' },
        { s: 1, d: 0.3, circle: '.dl-when-line', opts: { pad: 4 } }
      ]
    },
    {
      title: 'The supplier',
      say: ["The suppliers due today are right here. Tap the one that's come in.", 'Not on the list? Write its name in the box.'],
      do: [
        { s: 0, d: 0.4, circle: '.dl-due-pick', opts: { pad: 6 } },
        { s: 0, d: 3.0, tap: '[data-dl="sup"][data-name="Hilltop Meats"]' },
        { s: 1, d: 0.3, underline: '#dl-supplier' }
      ]
    },
    {
      title: 'What came in',
      say: ['Say what came in. Chilled, frozen, or both.', 'This one has both, so tap the Both button.'],
      do: [
        { s: 0, d: 0.3, circle: '.dl-what .seg', opts: { pad: 6 } },
        { s: 1, d: 1.2, tap: '[data-dl="mode"][data-mode="both"]' }
      ]
    },
    {
      title: 'Temperatures',
      say: ['Probe the food, and write each temperature.', 'Frozen reads below zero. If the minus is missing, the book asks.', 'One tap on the minus key fixes it.'],
      do: [
        { s: 0, d: 0.5, tap: '#dl-chilled' },
        { s: 0, d: 0.8, type: ['#dl-chilled', '3.5'] },
        { s: 0, d: 1.8, tap: '#dl-frozen' },
        { s: 0, d: 2.1, type: ['#dl-frozen', '18'] },
        { s: 1, d: 0.3, circle: '#dl-sign-note', opts: { pad: 4 } },
        { s: 2, d: 0.3, tap: '[data-dl="sign"][data-for="frozen"]' },
        { s: 2, d: 1.0, circle: '#dl-frozen', opts: { pad: 6 } }
      ]
    },
    {
      title: 'Items and notes',
      say: ['Add the items, or anything wrong with them, if you like.'],
      do: [
        { s: 0, d: 0.5, tap: '[data-dl="note"]' },
        { s: 0, d: 1.0, type: ['#dl-note', 'Rump, chicken thigh, frozen chips'] }
      ]
    },
    {
      title: 'Save delivery',
      say: ['Then tap Save delivery.', "It's under Today's deliveries, with the time, both readings and your name."],
      do: [
        { s: 0, d: 0.6, tap: '#dl-form [data-dl="save"]' },
        { s: 1, d: 0.3, circle: '.dl-receipt:has-text("Hilltop Meats")' }
      ]
    },
    {
      title: 'Still to come',
      say: ["Suppliers due today that haven't come in yet are listed at the bottom.", 'Saved readings stay as they were recorded. To fix one, save it again with a note.'],
      do: [
        { s: 0, d: 0.4, circle: '.dl-waiting', opts: { pad: 6 } },
        { s: 1, d: 0.3, underline: '.dl-form > .hint:last-child' }
      ]
    }
  ]
};
