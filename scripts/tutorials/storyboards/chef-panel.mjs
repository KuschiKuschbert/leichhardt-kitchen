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

export default {
  id: 'chef-panel',
  title: 'The chef panel',
  done: "That's the chef panel",
  sub: 'Run the shift with the team',
  next: 'Supplier order',
  hash: '#/chef',
  who: 'sam',
  extra,
  intro: ['The chef panel.', "Here's how the head chef and the sous chefs run the shift from one place."],
  outro: ["That's the chef panel. Next up, Supplier order."],
  steps: []
};
