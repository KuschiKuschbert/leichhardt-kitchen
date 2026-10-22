// js/learn.js clocks when tomorrow's list is written (22 Oct 2026). Pure node, no browser.
const N = require('../js/learn.js');
const R = [], ok = (c, m) => R.push((c ? 'PASS ' : 'FAIL ') + m);
const ZONE = 10 * 3600000, pad = n => (n < 10 ? '0' : '') + n;
const clock = {
  day: ms => { const d = new Date(ms + ZONE); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); },
  mins: ms => { const d = new Date(ms + ZONE); return d.getUTCHours() * 60 + d.getUTCMinutes(); }
};
// a kitchen time on a day, as a saved addedAt
const at = (day, h, m, s) => { const p = day.split('-'); return Date.UTC(+p[0], p[1] - 1, +p[2], h, m, s || 0) - ZONE; };
const line = (day, h, m, x) => Object.assign({ text: 'Line', addedAt: at(day, h, m) }, x || {});
const D = '2026-10-21';   // a Wednesday
// n lines from h:m, one every step minutes
const run = (day, h, m, n, step, x) => Array.from({ length: n }, (_, i) => line(day, h, m + i * step, x));

// a normal day: lines through the day, then the night list from 21:05
let ls = [line(D, 9, 0), line(D, 11, 30), line(D, 14, 10), line(D, 18, 45)].concat(run(D, 21, 5, 12, 2));
let r = N.listStart(ls, D, clock);
ok(r.m === 21 * 60 + 5 && r.n === 12, 'night list from 21:05, 12 lines (' + JSON.stringify(r) + ')');
// gaps of up to 15 minutes keep one batch; 16 minutes splits it
r = N.listStart(run(D, 20, 0, 4, 15).concat(run(D, 21, 0, 4, 1)), D, clock);
ok(r.m === 20 * 60 && r.n === 8, 'gaps of 15 minutes are one batch (' + JSON.stringify(r) + ')');
r = N.listStart(run(D, 20, 0, 6, 1).concat(run(D, 20, 21, 7, 1)), D, clock);
ok(r.m === 20 * 60 + 21 && r.n === 7, 'a 16 minute gap splits it, the bigger batch wins (' + JSON.stringify(r) + ')');
r = N.listStart(run(D, 20, 0, 6, 1).concat(run(D, 21, 0, 6, 1)), D, clock);
ok(r.m === 21 * 60 && r.n === 6, 'two batches the same size: the later one (' + JSON.stringify(r) + ')');
// a quiet day, a small group, and a batch before 15:00 are not a night list
ok(N.listStart([line(D, 9, 0), line(D, 21, 0)], D, clock).m === -1, 'a quiet day: no list (-1)');
ok(N.listStart(run(D, 21, 0, 5, 1), D, clock).m === -1, '5 lines are not a list yet');
ok(N.listStart(run(D, 11, 0, 10, 1), D, clock).m === -1, 'a big batch at 11:00 is not the night list');
ok(N.listStart([], D, clock).m === -1 && N.listStart(null, D, clock).m === -1, 'no lines: -1');
// rolled copies (written all at once by the rollover), a function's platters, practice and removed lines do not count
const noise = run(D, 21, 0, 8, 0, { rolled: 1 }).concat(run(D, 21, 0, 8, 0, { fn: 'f1' }), run(D, 21, 0, 8, 0, { tst: true }), run(D, 21, 0, 8, 0, { deleted: true }));
ok(N.listStart(noise, D, clock).m === -1, 'rolled, function, practice and removed lines do not count');
// a line saved after midnight belongs to the next day; a line with no time is left out
ok(N.listStart(run('2026-10-22', 0, 5, 8, 1), D, clock).m === -1, 'lines from the next day are left out');
ok(N.listStart(run(D, 21, 0, 8, 1).concat([{ text: 'x', addedAt: 0 }, { text: 'y' }, null]), D, clock).n === 8, 'lines with no time are left out');

// the usual time: 3 nights or more; each weekday from 2 of it
let u = N.usual({ '2026-10-20': { m: 1270, n: 10 }, '2026-10-21': { m: 1260, n: 9 } });
ok(u.usual === -1 && u.n === 2, 'two nights: not usual yet (' + JSON.stringify(u) + ')');
u = N.usual({ '2026-10-13': { m: 1250, n: 9 }, '2026-10-14': { m: 1300, n: 9 }, '2026-10-20': { m: 1270, n: 10 }, '2026-10-21': { m: 1310, n: 9 }, '2026-10-19': { m: -1, n: 0 } });
ok(u.usual === 1300 && u.n === 4, 'usual: the median of the nights with a list (' + JSON.stringify(u) + ')');
ok(u.dow['2'] === 1270 && u.dow['3'] === 1310 && u.dow['1'] == null, 'weekdays: Tuesday and Wednesday from two each, Monday not clocked (' + JSON.stringify(u.dow) + ')');
ok(N.usual({ '2026-10-21': { m: 'late' }, '2026-10-20': { m: 99999 }, '2026-10-19': null }).n === 0, 'odd values are left out');
ok(N.dowOf('2026-10-21') === '3' && N.dowOf('2026-10-25') === '0', 'weekday of a date: Wednesday 3, Sunday 0');

R.forEach(x => console.log(x));
const bad = R.filter(x => x.startsWith('FAIL')).length;
console.log(bad + ' failed of ' + R.length);
process.exit(bad ? 1 : 0);
