// The Orders tutorial (docs/tutorial-videos.md). Filmed as Sam, the sous chef, on his own phone, on the demo kitchen's
// Tuesday (fixtures.mjs): everyone adds requests, and only the head chef or a sous chef ticks them as ordered and sees
// the supplier cut-offs, so one person shows both and the words say who does what. The suppliers are made up.
import { L } from '../kit.mjs';

const key = (...p) => ['kitchens', L.PIN].concat(p).join('/');
const day = L.ymd(new Date(L.NOW));
const at = mins => L.NOW - mins * 60000;
const wed = (new Date(L.NOW).getDay() + 1) % 7;   // the delivery day: tomorrow
const sheet = '.o-sheet';
const row = id => '.o-main [data-ln$="/' + id + '"]';
const cut = name => '.cut-tl li:has-text("' + name + '")';

const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }
];
const line = (text, qty, by, mins, more) => Object.assign({ text, qty, recipes: [], addedBy: by, addedById: by.toLowerCase(), addedAt: at(mins), ordered: false, deleted: false }, more || {});

const extra = {
  // three made-up suppliers whose orders close today, for tomorrow's delivery; the dairy was ordered this morning
  [key('config', 'main')]: { people, sousIds: ['sam'], showBadges: true, staffSee: { cleaning: true },
    cutoffs: [
      { id: 'dairy', name: 'Bayview Dairy', dd: [wed], at: 11 * 60, pre: 1 },
      { id: 'veg', name: 'Greenvale Produce', dd: [wed], at: 15 * 60, pre: 1 },
      { id: 'meat', name: 'Hilltop Meats', dd: [wed], at: 17 * 60 + 30, pre: 1 }
    ] },
  [key('cutdone', day + '_dairy')]: { day, sid: 'dairy', on: true, at: at(200), by: 'sam' },
  // today's requests, from the cooks
  [key('orders', day, 'lines', 'o1')]: line('Milk', '6 L', 'Ann', 60),
  [key('orders', day, 'lines', 'o2')]: line('Brioche buns', '4 packs', 'Ann', 50),
  [key('orders', day, 'lines', 'o3')]: line('Cos lettuce', '2 boxes', 'Bo', 40),
  [key('orders', day, 'lines', 'o4')]: line('Lemons', '1 box', 'Bo', 30),
  // what the book has learned is usually ordered: Cream fills in 4 L
  [key('ordlearned', 'cream')]: { text: 'Cream', uses: 7, dow: {}, qtys: { a: { q: '4 L', n: 6 } } }
};

export default {
  id: 'orders',
  title: 'Orders',
  sub: 'Ask for it, order it, tick it off',
  next: 'Wastage',
  hash: '#/orders',
  who: 'sam',
  extra,
  // a phone that has not been asked about notifications yet (the test browser says no), so the cut-offs offer pushes plainly
  open: { init: () => { try { Object.defineProperty(Notification, 'permission', { get: () => 'default', configurable: true }); } catch (e) {} } },
  intro: ['Orders.', "Here's how to ask for stock, and how the chefs tick it off once it's ordered."],
  outro: ["That's Orders. Next up, Wastage."],
  steps: [
    {
      title: 'The list',
      say: ["This is today's order list.", 'Each line is something the team needs, with the amount and who asked.', 'The count shows how much is ordered so far.', 'Anyone can add a request. The head chef or a sous chef does the ordering.'],
      do: [
        { s: 0, d: 0.3, underline: '.nb-title' },
        { s: 1, d: 0.4, circle: row('o1') },
        { s: 2, d: 0.3, circle: '.nb-prog' },
        { s: 3, d: 0.3, circle: '[data-p="o-write"]' }
      ]
    },
    {
      title: 'Add a request',
      say: ['Need something? Tap Add request.', 'Write what you need.'],
      do: [
        { s: 0, d: 0.9, tap: '[data-p="o-write"]' },
        { s: 1, d: 0.2, type: ['#o-text', 'Cream'] }
      ]
    },
    {
      title: 'Filled for you',
      say: ['The book fills in the usual amount, and says so under the box.', 'Change it if you need more or less.'],
      do: [
        { s: 0, d: 0.4, circle: sheet + ' .lk-fb', opts: { pad: 6 } },
        { s: 0, d: 2.4, circle: '#o-fill', opts: { pad: 4 } },
        { s: 1, d: 0.3, underline: '#o-qty' }
      ]
    },
    {
      title: 'How urgent',
      say: ['Say how urgent it is. Running low, or out now.', "Then tap Add. It's on the list straight away."],
      do: [
        { s: 0, d: 0.3, circle: '#o-need .seg', opts: { pad: 6 } },
        { s: 0, d: 2.3, tap: sheet + ' [data-p="oneed"][data-v="low"]' },
        // the sheet changes shape once the line is added, so the marks go first
        { s: 1, d: 0.2, clear: true },
        { s: 1, d: 0.4, tap: sheet + ' .nb-addbtn' },
        { s: 1, d: 1.6, tap: sheet + ' .ux-modal-close' },
        { s: 1, d: 2.4, circle: '.o-main .nb-row:has-text("Cream")' }
      ]
    },
    {
      title: 'Supplier cut-offs',
      say: ['Chefs see the supplier cut-offs here. Tap the View button to open them.', 'Each supplier shows when its order closes, and how long is left.', 'Placed the order by phone or email? Tap Order placed.', "Everyone sees it's done, with your name and the time."],
      do: [
        { s: 0, d: 0.4, circle: '.o-cut-fold > summary' },
        { s: 0, d: 2.6, tap: '.o-cut-fold > summary' },
        { s: 1, d: 0.4, circle: cut('Greenvale') },
        { s: 2, d: 1.8, tap: cut('Greenvale') + ' [data-p="cut-tick"]' },
        { s: 3, d: 0.3, circle: cut('Greenvale') + ' .cut-st' }
      ]
    },
    {
      title: 'Tick it off',
      say: ['When a line is ordered, tap its box.', 'Ticked the wrong one? Tap Undo on the slip, straight away.', 'Tick it again once it is really ordered. The book keeps your name and the time.'],
      do: [
        // the cut-offs fold shut again first, so the list is back in view, and the cut-off's slip has had its time
        { s: 0, tap: '.o-cut-fold > summary' },
        { s: 0, run: page => page.clock.fastForward(9500) },
        { s: 0, top: true },
        { s: 0, d: 1.0, tap: row('o1') + ' .nb-box' },
        { s: 1, d: 0.2, circle: '.p-toast:not(.p-toast-old) .p-toast-btn' },
        { s: 1, d: 2.1, tap: '.p-toast:not(.p-toast-old) .p-toast-btn' },
        { s: 2, d: 0.5, tap: row('o1') + ' .nb-box' },
        { s: 2, d: 2.4, circle: row('o1') + ' .nb-wrote' }
      ]
    },
    {
      title: 'Ordered today',
      say: ['A ticked line stays for ten minutes, then moves to Ordered today.', "Tap it to see what's been ordered. Each one has its own Undo."],
      do: [
        // ten minutes on the demo kitchen's clock, so the ticked line moves down
        { s: 0, d: 1.2, run: async page => { await page.clock.fastForward(11 * 60000); await L.settle(page, 500); } },
        { s: 0, d: 2.6, circle: '.o-done summary' },
        { s: 1, d: 0.4, tap: '.o-done summary' },
        { s: 1, d: 2.6, circle: '.o-done .nb-undo' }
      ]
    }
  ]
};
