// The chef panel tutorial (docs/tutorial-videos.md): the Head chef / Sous chef panel (#/chef) and its Chef to-do list.
// Filmed as Sam, the sous chef, on the demo kitchen's Tuesday at 14:00 (fixtures.mjs). The demo kitchen gets its
// sections, two shifts, today's team, a few chef jobs, a shift ping for later, last week's meeting minutes and a few
// section standards. Made-up people only (Sam, Ann, Bo); no PINs, no owner pages.
import { L } from '../kit.mjs';

const key = (...p) => ['kitchens', L.PIN].concat(p).join('/');
const day = L.ymd(new Date(L.NOW)), DAY = 86400000;
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }
];
const SECS = [{ id: 'grill', name: 'Grill', off: false }, { id: 'sauce', name: 'Sauce', off: false }, { id: 'larder', name: 'Larder', off: false }, { id: 'fryer', name: 'Fryer', off: false }];
const SHIFTS = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900, off: false }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320, off: false }];
const job = (id, x) => [key('todos', id), Object.assign({ text: '', st: 'open', due: '', for: '', from: 'sam', at: L.NOW - 3 * 3600000, doneAt: 0, doneBy: '', upd: L.NOW - 3 * 3600000, by: 'sam' }, x)];
const standard = (id, sectionId, name, minimum, unit, instruction) => [key('prepStandards', id), { sectionId, name, aliases: [], minimum, unit, instruction, recipe: '', archived: false, v: 1, at: L.NOW - 7 * DAY, by: 'sam' }];
const extra = Object.fromEntries([
  [key('config', 'main'), { people, sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], showBadges: true, staffSee: { cleaning: true, minutes: true, pings: true }, kitSecs: SECS, kitShifts: SHIFTS, prepStandardsEnabled: true }],
  [key('team', day), { day, on: [{ id: 'sam', sh: 'dinner', sec: 'grill' }, { id: 'ann', sh: 'lunch', sec: 'larder' }, { id: 'ann', sh: 'dinner', sec: 'sauce' }, { id: 'bo', sh: 'dinner', sec: 'fryer' }], br: [{ id: 'ann', sh: 'dinner', at: 1050, len: 30 }, { id: 'bo', sh: 'dinner', at: 1080, len: 30 }], v: 1, at: L.NOW - 5 * 3600000, upd: L.NOW - 5 * 3600000, by: 'sam' }],
  job('t1', { text: 'Book the hood clean', due: L.ymd(new Date(L.NOW - DAY)) }),
  job('t2', { text: 'Order new tongs', for: 'sam' }),
  job('t3', { text: 'Check the cool room seal', due: L.ymd(new Date(L.NOW + 2 * DAY)) }),
  job('t4', { text: 'Fixed the dishwasher', st: 'done', doneAt: L.NOW - 7200000, doneBy: 'sam' }),
  [key('notes', 'nr1'), { text: 'Fish delivery at 16:00. Check the temperature.', tag: 'none', start: day, until: day, dows: [], tm: 950, removed: false, upd: L.NOW - 3600000, at: L.NOW - 3600000, author: 'sam', by: 'sam' }],
  [key('minutes', 'mr1'), { no: 1, v: 1, status: 'published', date: L.ymd(new Date(L.NOW - 6 * DAY)), start: '14:00', loc: 'Kitchen', chair: 'sam', taker: 'sam',
    att: ['sam', 'ann', 'bo'].map(id => ({ id, st: 'present' })), guests: '', decisions: 'Label and date every tub.', menu: '', safety: '', dates: '', other: '', acts: [], next: '', pubAt: L.NOW - 6 * DAY, removed: false, at: 1, upd: 1, by: 'sam' }],
  standard('onions', 'larder', 'Slice onions', 2, 'tubs', 'Thin slices. Keep them covered.'),
  standard('slaw', 'larder', 'Slaw', 2, 'tubs', 'Dress it only when it goes out.'),
  standard('rump', 'grill', 'Portion rump', 20, 'portions', '250 g each.'),
  standard('gravy', 'sauce', 'Gravy', 5, 'L', 'Cool it fast, label and date.')
]);

// After a tap, the next sentence waits until the page has finished redrawing and painted it, so on a busy computer
// the voice never runs ahead of the picture.
// Then a tiny paint nobody can see (one pixel, almost clear), twice, so the film catches the page as it ends up: the
// screencast skips frames while it waits for the last one, and a page that has stopped moving sends no more.
const poke = page => page.evaluate(() => new Promise(r => { const d = document.createElement('i'); d.style.cssText = 'position:fixed;width:1px;height:1px;opacity:.01;left:0;top:0;pointer-events:none'; document.documentElement.appendChild(d); requestAnimationFrame(() => requestAnimationFrame(() => { d.remove(); r(); })); }));
const settled = (page, cut, L) => L.settle(page, 2500).then(() => poke(page)).then(() => new Promise(r => setTimeout(r, 150))).then(() => poke(page));
export default {
  id: 'chef-panel',
  title: 'The chef panel',
  done: "That's the chef panel",
  sub: 'Run the shift with the team',
  next: 'Supplier order',
  hash: '#/prep',
  who: 'sam',
  extra,
  intro: ['The chef panel.', "Here's how the head chef and the sous chefs run the shift from one place."],
  outro: ["That's the chef panel. Next up, Supplier order."],
  steps: [
    {
      title: 'Open the panel',
      say: ['Head chefs and sous chefs have their own panel.', 'Tap the chef hat, then Sous chef panel.', 'It has five rooms: Today, Reports, Team, Kitchen and Prep.'],
      do: [
        { s: 1, d: 0.2, tap: '.wtop-who', run: settled },
        { s: 1, d: 1.9, tap: '.wm a[href="#/chef"]', run: settled },
        { s: 2, d: 0.4, circle: '.a-groups', opts: { pad: 6 } }
      ]
    },
    {
      title: 'Dashboard',
      say: ['Today opens on the Dashboard.', "At a glance: the prep done, the orders, and today's team. Tap one to open it.", 'Chef to-do and Shift pings sit next to it.'],
      do: [
        { s: 0, d: 0.3, underline: '#rtitle' },
        { s: 1, d: 0.3, circle: '.c-tiles', opts: { pad: 6 } },
        { s: 2, d: 0.2, circle: '.a-tabs [data-t="todo"]', opts: { pad: 6 } },
        { s: 2, d: 1.4, circle: '.a-tabs [data-t="notes"]', opts: { pad: 6 } }
      ]
    },
    {
      title: 'Add a job',
      say: ['Tap Chef to-do. This list is only for the chefs.', 'Write the job.', "Add the day it's due, and who it's for, if you like.", 'Then tap Add to the list.'],
      do: [
        { s: 0, d: 0.3, tap: '.a-tabs [data-p="c-tab"][data-t="todo"]', run: settled },
        { s: 1, d: 0.2, type: ['[data-k="todo-text"]', 'Sharpen the knives'] },
        { s: 2, d: 0.2, fill: ['[data-k="todo-due"]', L.ymd(new Date(L.NOW + 2 * DAY))], run: settled },
        { s: 2, d: 1.6, tap: '.todo-for .ux-picker-trigger', run: settled },
        { s: 2, d: 2.6, tap: '.ux-picker [data-index="1"]', run: settled },
        { s: 3, d: 0.5, tap: '[data-p="todo-save"]', run: settled },
        { s: 3, d: 1.5, circle: '.todo-row:has-text("Sharpen the knives")' }
      ]
    },
    {
      title: 'Tick it off',
      say: ["When a job's done, tap its box.", 'The slip names it. Tap Undo if it was the wrong one.', 'Chef to-do is in the chef hat too.'],
      do: [
        { s: 0, d: 0.6, tap: '[data-p="todo-tick"][data-id="t2"]', run: settled },
        { s: 1, d: 0.2, circle: '.p-toast:not(.p-toast-old):has([data-p="toast-act"])' },
        { s: 1, d: 1.9, tap: '.p-toast:not(.p-toast-old) [data-p="toast-act"]', run: settled },
        { s: 2, d: 0.3, circle: '.wtop-who', opts: { pad: 6 } }
      ]
    },
    {
      title: 'Reports',
      say: ['Reports keeps the prep and order records.', "Prep history shows a day's prep list, and what was ticked.", 'Pick another day here. Order history works the same way.'],
      do: [
        { s: 0, d: 0.3, tap: '[data-p="c-group"][data-g="reports"]', run: settled },
        { s: 1, d: 0.3, circle: '.c-history > .hint' },
        { s: 2, d: 0.2, circle: '[data-k="c-date"]' },
        { s: 2, d: 2.2, tap: '[data-p="c-tab"][data-t="order-history"]', run: settled }
      ]
    },
    {
      title: 'Team',
      say: ['Team is for the people.', "Today's team sets who is on, their section and their break.", 'Manage staff adds or removes a person.', 'Meeting minutes shows who has signed the latest minutes.'],
      do: [
        { s: 0, d: 0.3, tap: '[data-p="c-group"][data-g="team"]', run: settled },
        { s: 1, d: 0.3, circle: '.tm-tlrow[data-id="ann"]' },
        { s: 2, d: 0.2, tap: '[data-p="c-tab"][data-t="people"]', run: settled },
        { s: 3, d: 0.2, tap: '[data-p="c-tab"][data-t="minutes"]', run: settled },
        { s: 3, d: 1.8, circle: '.mn-tiles' }
      ]
    },
    {
      title: 'Kitchen',
      say: ['Kitchen is one page of rows.', 'Recipes and drawings, Supplier order, Functions, Delivery received and Guides.', 'Tap a row to open that tool.'],
      do: [
        { s: 0, d: 0.1, tap: '[data-p="c-group"][data-g="kitchen"]', run: (page, cut, L) => page.waitForSelector('.c-tools', { state: 'visible', timeout: 8000 }).then(() => settled(page, cut, L)) },
        { s: 1, d: 0.1, underline: '.c-tool[data-tool="recipes"] strong' },
        { s: 1, d: 1.3, underline: '.c-tool[data-tool="suppliers"] strong' },
        { s: 1, d: 2.3, underline: '.c-tool[data-tool="functions"] strong' },
        { s: 1, d: 3.1, underline: '.c-tool[data-tool="deliveries"] strong' },
        { s: 1, d: 4.3, underline: '.c-tool[data-tool="guides"] strong' },
        { s: 2, d: 0.3, circle: '.c-tool[data-tool="recipes"]' }
      ]
    },
    {
      title: 'Section standards',
      say: ['Prep holds the section standards.', 'Pick a section to see what it should have ready before service.', 'Only the head chef changes them.'],
      do: [
        { s: 0, d: 0.3, tap: '[data-p="c-group"][data-g="prep"]', run: settled },
        { s: 1, d: 0.3, tap: '#ps-section-picker', run: settled },
        { s: 1, d: 1.4, tap: '.ux-picker-option[data-v="larder"]', run: settled },
        { s: 1, d: 2.6, circle: '.ps-catalogue' },
        { s: 2, d: 0.3, underline: '.ps-manager > .hint' }
      ]
    }
  ]
};
