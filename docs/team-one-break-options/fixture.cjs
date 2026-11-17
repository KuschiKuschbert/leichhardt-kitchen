// The made-up day every runner in this folder uses (17 Nov 2026): the roster file's day since "cut to each service".
const path = require('path');
const L = require(path.join(__dirname, '../../tests/lib'));
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW)), TEAM = key('team', today), CFG = key('config', 'main');
const people = [
  { id: 'gus', name: 'Gus', role: 'head', active: true, add: true, tick: true, del: true },
  { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true },
  ...['Ari', 'Bea', 'Cal', 'Dev', 'Eli', 'Fen', 'Mo'].map(n => ({ id: n.toLowerCase(), name: n, role: 'staff', active: true, add: true, tick: true }))
];
// Lunch, All day dining between them, Dinner; Dinner's busy time needs 3 on (the Too few check)
const SHIFTS = [
  { id: 'lunch', name: 'Lunch', from: 600, to: 900, off: false, busy: { from: 720, to: 840, n: 3 } },
  { id: 'allday', name: 'All day', from: 900, to: 1020, off: false },
  { id: 'dinner', name: 'Dinner', from: 1020, to: 1260, off: false, busy: { from: 1080, to: 1200, n: 3 } },
  { id: 'smoker', name: 'Smoker', from: 360, to: 900, off: false, occ: true }
];
const SECS = ['Grill', 'Pans', 'Larder', 'Fryer'].map(n => ({ id: n.toLowerCase(), name: n }));
const H = (h, m) => h * 60 + (m || 0);
const on = [
  { id: 'gus', sh: 'lunch', sec: '', from: H(8), to: H(15) }, { id: 'gus', sh: 'dinner', sec: '', from: H(17), to: H(21) },
  { id: 'ari', sh: 'lunch', sec: '', from: H(10), to: H(15) },
  { id: 'bea', sh: 'lunch', sec: '', from: H(11), to: H(15) },
  { id: 'cal', sh: 'lunch', sec: '', from: H(10), to: H(14, 30) },
  { id: 'dev', sh: 'lunch', sec: '', from: H(12), to: H(15) }, { id: 'dev', sh: 'allday', sec: '', from: H(15), to: H(17) }, { id: 'dev', sh: 'dinner', sec: '', from: H(17), to: H(20) },
  { id: 'sam', sh: 'allday', sec: '', from: H(16), to: H(17) }, { id: 'sam', sh: 'dinner', sec: '', from: H(17), to: H(21, 30) },
  { id: 'eli', sh: 'dinner', sec: '', from: H(17), to: H(21) },
  { id: 'fen', sh: 'dinner', sec: '', from: H(17), to: H(21) },
  // Mo 10:00 to 21:00, cut to each service by the roster file
  { id: 'mo', sh: 'lunch', sec: '', from: H(10), to: H(15) }, { id: 'mo', sh: 'allday', sec: '', from: H(15), to: H(17) }, { id: 'mo', sh: 'dinner', sec: '', from: H(17), to: H(21) }
];
const fixture = () => ({
  [CFG]: { people, headId: 'gus', sousIds: ['sam'], staffIds: people.map(p => p.id), kitShifts: SHIFTS, kitSecs: SECS },
  [TEAM]: { day: today, on, br: [], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'gus' }
});
// the day a planner sets: a section and one break per cook (Mo and Dev keep one section all day)
const plan = { ari: ['grill', H(12)], bea: ['pans', H(13)], cal: ['fryer', H(12, 30)], dev: ['larder', H(15, 30)], eli: ['grill', H(18)], fen: ['pans', H(18, 30)], mo: ['larder', H(15)] };
const lines = { ari: ['lunch'], bea: ['lunch'], cal: ['lunch'], dev: ['lunch', 'allday', 'dinner'], eli: ['dinner'], fen: ['dinner'], mo: ['lunch', 'allday', 'dinner'] };
const brSh = { ari: 'lunch', bea: 'lunch', cal: 'lunch', dev: 'allday', eli: 'dinner', fen: 'dinner', mo: 'allday' };
module.exports = { H, fixture, plan, lines, brSh, today, TEAM, CFG, SHIFTS };
