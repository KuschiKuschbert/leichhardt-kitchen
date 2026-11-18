// The Today's team tutorial (docs/tutorial-videos.md). Filmed as Sam, the sous chef: head and sous chefs set the day's
// team. The demo kitchen's Tuesday (fixtures.mjs) has nothing saved for today yet, and last Tuesday's team to copy:
// Sam, Ann and Bo on Lunch, Cal, Dee and Eli on Dinner. Dinner is busy from 18:00 to 20:30 and needs four, so the copy
// shows the Too few warning until Ann stays on for Dinner. Made-up people only (tests/lib.js seed plus Cal, Dee, Eli).
import { L } from '../kit.mjs';

const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const lastWeek = L.ymd(new Date(L.NOW - 7 * 86400000));
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
const people = [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'staff'), P('bo', 'Bo', 'staff'), P('cal', 'Cal', 'staff'), P('dee', 'Dee', 'staff'), P('eli', 'Eli', 'staff')];
const sections = ['Grill', 'Pans', 'Larder', 'Fryer'].map(name => ({ id: name.toLowerCase(), name, off: false }));
const shifts = [
  { id: 'lunch', name: 'Lunch', from: 600, to: 900, off: false, busy: { from: 720, to: 840, n: 3 } },
  { id: 'dinner', name: 'Dinner', from: 960, to: 1320, off: false, busy: { from: 1080, to: 1230, n: 4 } }
];
const on = [['sam', 'lunch', ''], ['ann', 'lunch', 'grill'], ['bo', 'lunch', 'larder'], ['cal', 'dinner', 'grill'], ['dee', 'dinner', 'pans'], ['eli', 'dinner', 'fryer']].map(([id, sh, sec]) => ({ id, sh, sec }));

const extra = {
  [key('config', 'main')]: { people, sousIds: ['sam'], pingIds: ['sam'], staffIds: people.map(p => p.id), showBadges: true, staffSee: { cleaning: true }, kitSecs: sections, kitShifts: shifts },
  [key('team', lastWeek)]: { day: lastWeek, on, br: [{ id: 'dee', sh: 'dinner', at: 1050, len: 30 }], v: 2, at: L.NOW - 7 * 86400000, upd: L.NOW - 7 * 86400000, by: 'sam' }
};
const picker = sel => sel + ' + .ux-picker-trigger';

export default {
  id: 'todays-team',
  title: "Today's team",
  sub: 'Who is on, where, and their breaks',
  done: "That's Today's team",
  next: 'Cleaning',
  hash: '#/team',
  who: 'sam',
  extra,
  intro: ["Today's team.", "Here's how a chef puts the day's team on their sections, with their breaks."],
  outro: ["That's Today's team. Next up, Cleaning."],
  steps: [
    {
      title: "Today's team",
      say: ["This is Today's team. Head and sous chefs set it.", "It's for the day shown here. Nothing is saved for today yet."],
      do: [
        { s: 0, d: 0.3, underline: '.tm-nhead #rtitle' },
        { s: 1, d: 0.2, circle: '[data-p="tm-date-toggle"]' },
        { s: 1, d: 2.1, circle: '.tm-draftstate', opts: { pad: 5 } }
      ]
    },
    {
      title: 'Fill the day',
      say: ['Add staff puts people on a service.', 'Quicker still: open Copy a day, and tap Use last Tuesday.', "Last week's shifts, sections and breaks fill in."],
      do: [
        { s: 0, d: 0.3, circle: '[data-p="tm-add-staff"]' },
        { s: 1, d: 0.8, tap: 'details.tm-batch > summary' },
        { s: 1, d: 2.6, tap: '[data-p="tm-use"]' },
        { s: 2, d: 0.4, circle: '.tm-tlrow[data-id="ann"] .tm-grid-who', opts: { pad: 6 } }
      ]
    },
    {
      title: 'Sections',
      say: ['Everyone has a section for each service.', 'Tap it to change it. Bo moves to the fryer.'],
      do: [
        { s: 0, d: 0.5, circle: picker('[data-k="tm-sec:bo:lunch"]') },
        { s: 1, d: 0.3, tap: picker('[data-k="tm-sec:bo:lunch"]') },
        { s: 1, d: 1.9, tap: '.ux-picker [data-index="4"]' }
      ]
    },
    {
      title: 'Breaks',
      say: ['Tap Break beside a name to give them a break.', 'It starts at the first time left today. Tap the time to change it.'],
      do: [
        { s: 0, d: 0.6, tap: '[data-p="tm-addbr"][data-id="ann"]' },
        { s: 1, d: 0.3, circle: picker('select[data-k^="tm-bat:ann:"]') }
      ]
    },
    {
      title: 'Too few',
      say: ['When too few are on at a busy time, the book warns you here.', 'Only three are on Dinner at the busy time, and four are needed.'],
      do: [
        { s: 0, d: 0.8, circle: '.tm-short-line', opts: { pad: 4 } },
        { s: 1, d: 0.4, underline: '.tm-short-fact' }
      ]
    },
    {
      title: 'Add a service',
      say: ['Ann can stay on for Dinner. Tap Add a service, then Dinner.', 'Now four are on, and the warning goes.'],
      do: [
        { s: 0, d: 2.0, tap: picker('[data-k="tm-addsvc:ann"]') },
        { s: 0, d: 3.4, tap: '.ux-picker [data-index="1"]' },
        { s: 1, d: 0.3, circle: '.tm-tlrow[data-id="ann"] .tm-tlsvc[data-sh="dinner"]', opts: { pad: 4 } }
      ]
    },
    {
      title: 'Save',
      say: ['Nothing is shared until you tap Save.', 'Then the plan is saved for everyone, with your name and the time.'],
      do: [
        { s: 0, d: 1.2, tap: '[data-p="tm-save"]' },
        { s: 1, d: 0.6, circle: '.tm-draftstate', opts: { pad: 5 } }
      ]
    },
    {
      title: 'On break now',
      say: ['The card at the top shows who is on a break now.', 'Staff see their own day from the round chip up top.'],
      do: [
        { s: 0, top: true },
        { s: 0, d: 0.3, circle: '.tm-away', opts: { pad: 3 } },
        { s: 1, d: 0.5, circle: '.wtop .tm-slot .tm-chip' }
      ]
    }
  ]
};
