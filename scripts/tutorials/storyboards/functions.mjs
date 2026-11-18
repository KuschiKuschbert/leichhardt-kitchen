// The Functions tutorial (docs/tutorial-videos.md). Filmed as Sam, the sous chef, ticked for Functions too (so he sees the
// kitchen's page and the function managers' page), at 18:20 on the demo kitchen's Tuesday (fixtures.mjs), so the first
// round of tonight's function is nearly due. Made-up bookings only: Smith 50th and Jones 40th tonight, Kerr lunch
// tomorrow, Brown 21st the day after, and Lee 30th booked on film. No booking contacts are filled in or shown.
import { createRequire } from 'module';
import { L } from '../kit.mjs';
const M = createRequire(import.meta.url)('../../../js/functions.js');

const key = (...p) => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), tomorrow = M.addDays(today, 1), day2 = M.addDays(today, 2), day3 = M.addDays(today, 3);
const at = (ymd, hm) => M.kat(ymd, M.hmMin(hm));
const PEOPLE = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true, fn: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'fay', name: 'Fay', role: 'fnc', add: false, tick: false, del: false, fn: true, active: true }
];
// a function the way the book saves it (tests/functions.test.js)
function fn(o) {
  const date = o.date || today, R = o.rounds.map(x => ({ at: at(date, x), note: '' }));
  return M.derive({ v: 1, status: 'confirmed', name: o.name, date, start: at(date, o.start), loc: o.loc, guests: o.guests, mode: R.length > 1 ? 'stag' : 'all',
    notes: o.notes || '', kc: o.kc || '', kcBy: o.kc ? 'fay' : '', kcAt: o.kc ? L.NOW - 3600000 : 0, rounds: R,
    lines: o.lines.map(([rid, name, a]) => ({ rid, name, unit: 'platter', spec: 'Per platter.', fp: '', qty: a.reduce((s, x) => s + x, 0), u: M.toU(a) })),
    was: {}, chg: [], cBy: 'fay', cAt: L.NOW - 86400000, confBy: 'fay', confAt: L.NOW - 86400000, by: 'fay', upd: L.NOW - 3600000 });
}
const FNS = {
  smith: fn({ name: 'Smith 50th', start: '18:00', loc: 'Beer garden', guests: 60, rounds: ['18:30', '19:00', '19:30'],
    lines: [['antipasto-platter', 'Antipasto Platter', [3, 0, 0]], ['aussie-platter', 'Aussie Platter', [2, 2, 0]], ['pizza-platter', 'Pizza Platter', [0, 2, 3]]],
    kc: 'Cake comes out at 20:00.\nKeep the pass clear.', notes: 'Two vegetarians.' }),
  jones: fn({ name: 'Jones 40th', start: '18:15', loc: 'Function room', guests: 30, rounds: ['18:40'], lines: [['pizza-platter', 'Pizza Platter', [2]], ['antipasto-platter', 'Antipasto Platter', [1]]] }),
  kerr: fn({ name: 'Kerr lunch', date: tomorrow, start: '11:30', loc: 'Function room', guests: 40, rounds: ['12:00'], lines: [['pizza-platter', 'Pizza Platter', [4]], ['vege-platter', 'Vege Platter', [2]]] }),
  brown: fn({ name: 'Brown 21st', date: day2, start: '18:00', loc: 'Beer garden', guests: 80, rounds: ['18:30', '19:15'], lines: [['aussie-platter', 'Aussie Platter', [3, 3]], ['pizza-platter', 'Pizza Platter', [2, 2]]] })
};
const extra = {
  [key('config', 'main')]: { people: PEOPLE, sousIds: ['sam'], pingIds: ['sam'], staffIds: PEOPLE.map(p => p.id), fnIds: ['sam', 'fay'], fnOnlyIds: ['fay'], showBadges: true, staffSee: { cleaning: true } },
  [key('staffpins', 'fay')]: { hash: L.sha('lk:fay:5151') }, [key('pinset', 'fay')]: { at: 1 }, [key('drinks', 'fay')]: { kind: 'flat', at: 1, by: 'fay' }
};
Object.entries(FNS).forEach(([id, f]) => { extra[key('functions', id)] = f; });
// a typed amount counts once its box loses focus (its change event), the way it does when a person taps on
const blur = page => page.evaluate(() => document.activeElement && document.activeElement.blur());

export default {
  id: 'functions',
  title: 'Functions',
  sub: 'See them, send them, book them',
  next: 'Settings',
  hash: '#/fn',
  who: 'sam',
  open: { clock: at(today, '18:20') },
  extra,
  intro: ['Functions.', "Here's how to see what's booked, send each round, and book a new function."],
  outro: ["That's Functions. Next up, Settings."],
  steps: [
    {
      title: 'Today and soon',
      say: ["This page shows today's functions, and the next seven days.", 'Each card says when the next round goes out, and what goes in it.', 'Under each day, the book adds up the platters to make.'],
      do: [
        { s: 0, d: 0.3, underline: '#rtitle' },
        { s: 1, d: 0.3, circle: '.fn-card .fn-cnext >> nth=0' },
        { s: 2, d: 0.3, circle: '.fn-dtot >> nth=0' }
      ]
    },
    {
      title: 'The band',
      say: ["The band under the top bar shows today's functions, on every page.", 'The time of the next round comes first.', 'Tap a function to see all of it: what goes out next, and every round.'],
      do: [
        { s: 0, top: true },
        { s: 0, d: 0.9, circle: '#fn-band .fn-list', opts: { pad: 4 } },
        { s: 1, d: 0.3, circle: '#fn-band .fn-due >> nth=0', opts: { pad: 8 } },
        { s: 2, d: 0.9, tap: '#fn-band .fn-row >> nth=0' },
        { s: 2, d: 2.6, circle: '.fn-sheet .fn-next' }
      ]
    },
    {
      title: 'Service view',
      say: ['With two functions on, tap Service view.', "Every round still to go is here, in order, with how long until it's due.", 'When a round leaves the pass, tap Send all.', 'It waits for Functions to confirm it, with Undo if you sent the wrong one.'],
      do: [
        { s: 0, key: 'Escape' },
        { s: 0, d: 1.0, tap: '#fn-band a.fn-svc' },
        { s: 1, d: 0.3, circle: '.fn-svc-row >> nth=0' },
        { s: 2, d: 0.9, tap: '.fn-svc-row [data-fn="send"] >> nth=0' },
        { s: 3, d: 0.2, tap: '.fn-svc-wl' },
        { s: 3, d: 1.6, circle: '.fn-svc-trip >> nth=0' }
      ]
    },
    {
      title: 'Cancel and Undo',
      say: ['If a function is called off, tap Cancel function on its card.', 'The kitchen is told straight away.', 'Tapped the wrong one? Tap Undo cancel, and it is back.'],
      do: [
        { s: 0, go: '#/fn' },
        { s: 0, d: 1.8, tap: '[data-fn="status"][data-id="kerr"][data-v="cancel"]' },
        { s: 1, d: 0.2, circle: '.p-toast:not(.p-toast-old) .p-toast-msg' },
        { s: 2, d: 1.2, tap: '[data-fn="status"][data-id="kerr"][data-v="undo"]' }
      ]
    },
    {
      title: 'Book a function',
      say: ['Function managers book them too. Tap the chef hat, then Functions.', 'Tap New function.', 'Write the name, the date, the start time and the guests.'],
      do: [
        { s: 0, d: 1.8, tap: '.wtop-who' },
        { s: 0, d: 3.4, tap: '.wm a[href="#/functions"]' },
        { s: 1, d: 0.3, tap: 'a[href="#/functions/new"]' },
        { s: 2, d: 0.2, type: ['[data-ff="name"]', 'Lee 30th'] },
        { s: 2, d: 1.4, fill: ['[data-ff="date"]', day3] },
        { s: 2, d: 2.2, fill: ['[data-ff="startT"]', '18:00'] },
        { s: 2, d: 3.0, fill: ['[data-ff="guests"]', '40'] }
      ]
    },
    {
      title: 'Add platters',
      say: ['Tap Choose a platter, pick one, then write how many.', 'Add the next one the same way.', "The bar at the bottom adds them up, and says when it's ready."],
      do: [
        { s: 0, d: 0.5, tap: '.fe-pick .ux-picker-trigger' },
        { s: 0, d: 1.5, tap: '.ux-picker-option[data-v="pizza-platter"]' },
        { s: 0, d: 2.4, fill: ['[data-ff="qty0"]', '4'], run: blur },
        { s: 1, d: 0.2, tap: '.fe-pick .ux-picker-trigger' },
        { s: 1, d: 1.1, tap: '.ux-picker-option[data-v="vege-platter"]' },
        { s: 1, d: 1.8, fill: ['[data-ff="qty1"]', '2'], run: blur },
        { s: 2, d: 0.4, circle: '#fe-live' }
      ]
    },
    {
      title: 'Check and confirm',
      say: ['Tap Check and confirm. This is what the kitchen will see.', 'Then tap Confirm function.', 'The band says its stock is on the order list today.'],
      do: [
        { s: 0, d: 0.5, tap: '[data-fe="review"]' },
        { s: 0, d: 2.0, circle: '.fe-review .fn-next' },
        { s: 1, d: 0.5, tap: '[data-fe="confirm"]' },
        { s: 2, d: 0.3, circle: '#fn-band .fn-li:has-text("Lee 30th")' }
      ]
    }
  ]
};
