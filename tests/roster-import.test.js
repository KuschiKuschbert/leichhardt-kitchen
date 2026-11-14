// js/roster-import.js reads the Humanforce roster CSV (14 Nov 2026, docs/roster-import-options/brief.md). Pure node,
// no browser. Every roster here is built below from made-up people, made-up costs and the report's real layout.
const X = require('../js/roster-import.js');
const R = [], ok = (c, m) => R.push((c ? 'PASS ' : 'FAIL ') + m);

// ---- a synthetic Weekly Department Roster Report, laid out like the real export ----
const FIXED = ['titleTextBox', 'textBox61', 'textBox62', 'textBox65', 'textBox3', 'textBox4', 'textBox2', 'textBox1', 'textBox7', 'textBox5', 'textBox8', 'textBox9', 'textBox11', 'textBox12', 'textBox13', 'textBox14', 'textBox10', 'textBox15', 'textBox16', 'textBox17', 'textBox18', 'textBox19', 'textBox20', 'textBox21', 'textBox22', 'textBox23', 'textBox24', 'textBox25', 'textBox26', 'textBox27', 'textBox28', 'textBox29', 'textBox6', 'textBox31', 'textBox30', 'textBox63', 'textBox64'];
const DAYS = [[['textBox34', 'textBox33', 'textBox32', 'textBox35'], 'tcbr'], [['textBox37', 'textBox38', 'textBox39', 'textBox36'], 'cbtr'], [['textBox41', 'textBox42', 'textBox43', 'textBox40'], 'cbtr'], [['textBox45', 'textBox46', 'textBox47', 'textBox44'], 'cbtr'], [['textBox49', 'textBox50', 'textBox51', 'textBox48'], 'cbtr'], [['textBox53', 'textBox54', 'textBox55', 'textBox52'], 'cbtr'], [['textBox56', 'textBox57', 'textBox58', 'textBox59'], 'cbtr']];
const LABELS = ['Mon 16/11/2026', 'Tue 17/11/2026', 'Wed 18/11/2026', 'Thu 19/11/2026', 'Fri 20/11/2026', 'Sat 21/11/2026', 'Sun 22/11/2026'];
const PEOPLE = [
  ['Sam Kerr', 'Sous Chef', { 3: '10:00-21:00', 4: '10:00-21:00', 5: '10:00-21:00', 6: '10:00-21:00' }],
  ['Sam Lee', 'Commi Chef L4', { 0: '11:00-15:30', 1: '10:00-21:30', 2: '10:00-21:30', 3: '11:00-21:30', 6: '10:00-22:00' }],
  ['Ann Moss', 'Chef de Partie L6', { 0: '16:00-21:30', 1: '10:30-21:30', 2: '10:30-21:30', 3: '10:00-21:30', 5: '10:00-22:00' }],
  ['Bo Tran', 'Demi Chef L5', { 0: '10:30-22:00', 1: '10:30-22:00', 2: '10:30-22:00', 3: '17:00-22:00' }],
  ['Mary Jo Kahale', 'Chef de Partie L6', { 2: '10:00-21:00', 3: '10:00-15:00', 4: '10:00-22:15', 5: '10:00-21:45', 6: '10:00-21:00' }]
];
// each day's total hours, as the report prints them: the shifts' hours less an hour of break each
const dayTotals = people => [0, 1, 2, 3, 4, 5, 6].map(d => (people.reduce((a, [, , sh]) => a + (sh[d] ? Math.max(0, (mins(sh[d].slice(6)) - mins(sh[d])) / 60 - 1) : 0), 0)).toFixed(2));
const mins = t => +t.slice(0, 2) * 60 + +t.slice(3, 5);
const q = v => /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
function build(o) {
  o = o || {};
  const people = o.people || PEOPLE, head = (o.head || ['Weekly Department Roster Report', 'Locations: All', 'Departments: Food', 'Dates: 16/11/2026 - 22/11/2026', 'Location:', o.loc || 'Leichhardt Hotel', 'Department:', o.dep || 'Food', 'Employee'].concat(o.labels || LABELS, ['Total Hours', 'Total Costs'], o.totals || dayTotals(people), [0, 1, 2, 3, 4, 5, 6].map(i => '$1,0' + i + '0.50')));
  const names = (o.fixed || FIXED).slice(), rows = [];
  people.forEach(([full, role, sh], n) => {
    const r = head.concat([full, '38.00', '$1,234.50', 'Hours:', 'Costs:']);
    Object.keys(sh).map(Number).sort((a, b) => a - b).forEach(d => {
      const [cols, order] = DAYS[d]; names.push(...(o.rename && o.rename[n + ':' + d] || cols));
      const cell = { c: '$111.11', b: '', t: sh[d], r: role };
      r.push(...order.split('').map(k => cell[k]));
    });
    rows.push(o.edit ? o.edit(r, n) : r);
  });
  if (o.extraNames) names.push(...o.extraNames);
  return [names].concat(rows).map(r => r.map(q).join(',')).join(o.lf ? '\n' : '\r\n') + (o.tail === false ? '' : '\r\n');
}
const good = X.read(build());
const shiftsOf = (r, name) => (r.people.find(p => p.name === name) || { shifts: [] }).shifts;

// ---- reading a good file ----
ok(good.ok, 'reads the synthetic roster (' + (good.why || '') + ')');
ok(good.ok && good.people.length === 5 && good.people.reduce((a, p) => a + p.shifts.length, 0) === 23, 'five people and 23 shifts');
ok(good.ok && good.week.from === '2026-11-16' && good.week.to === '2026-11-22' && good.week.days.length === 7 && good.week.days[3] === '2026-11-19', 'the week runs Monday 16 to Sunday 22 November');
ok(good.ok && JSON.stringify(shiftsOf(good, 'Sam Lee')) === JSON.stringify([{ day: '2026-11-16', from: 660, to: 930 }, { day: '2026-11-17', from: 600, to: 1290 }, { day: '2026-11-18', from: 600, to: 1290 }, { day: '2026-11-19', from: 660, to: 1290 }, { day: '2026-11-22', from: 600, to: 1320 }]), 'each shift lands on its day: Monday is the one day whose time comes first in its four cells');
ok(good.ok && shiftsOf(good, 'Ann Moss')[0].day === '2026-11-16' && shiftsOf(good, 'Ann Moss')[0].from === mins('16:00'), 'a Monday shift reads from the Monday group');
ok(good.ok && JSON.stringify(good.people.find(p => p.name === 'Mary Jo Kahale')).includes('"given":"Mary"') && good.people.find(p => p.name === 'Mary Jo Kahale').family === 'Kahale', 'the given name is the first word, the family name the last');
// wages, roles and hours never come out
const out = JSON.stringify(good);
ok(good.ok && !/\$|1,234|111\.11|1,0\d0/.test(out), 'no wage cost comes out of the reader');
ok(good.ok && !/Chef|Commi|Demi|Partie|38\.00|40\.00|Hours|Costs/.test(out.replace(/"(name|given|family)":"[^"]*"/g, '')), 'no award role or hours come out either');
ok(JSON.stringify(X.cells('a,"$1,234.50",b\r\n')) === JSON.stringify([['a', '', 'b']]), 'cells: a quoted money value with a comma is one cell, wiped as it is read');
ok(JSON.stringify(X.cells('"a ""b""",c\n')) === JSON.stringify([['a "b"', 'c']]), 'cells: doubled quotes inside a quoted cell');
ok(JSON.stringify(X.cells('x,(-$5.00),$0\n')) === JSON.stringify([['x', '', '']]), 'cells: negative and zero money values are wiped too');
ok(X.read(build({ lf: true })).ok && X.read('﻿' + build()).ok && X.read(build({ tail: false })).ok, 'LF line ends, a byte order mark and no last line end all read');
ok(X.read(build({ people: [['Ana "Ace" Cruz', 'Demi Chef L5', { 1: '10:00-15:00' }], ['Lee, Jo', 'Demi Chef L5', { 2: '17:00-22:00' }]] })).ok, 'quotes and commas inside a name keep the columns in place');

// ---- fails closed: nothing comes out ----
const refused = (o, why, label) => { const r = X.read(typeof o === 'string' ? o : build(o)); ok(!r.ok && !r.people && why.test(r.why || ''), 'refused: ' + label + ' ("' + (r.why || 'read it') + '")'); };
refused('', /empty/, 'an empty file');
refused('just some words', /not the Weekly Department Roster Report|no people/, 'a file that is not the report');
refused(build().replace('titleTextBox', 'titleBox'), /changed its layout/, 'a renamed column on line 1');
refused({ loc: 'Another Venue' }, /not for Leichhardt Hotel/, 'another venue');
refused({ dep: 'Bar' }, /Food department/, 'another department');
refused(build().replace(/Dates: 16\/11\/2026 - 22\/11\/2026/g, 'Dates: 17/11/2026 - 23/11/2026'), /Monday to Sunday/, 'a week that does not start on Monday');
refused({ labels: ['Mon 16/11/2026', 'Tue 17/11/2026', 'Wed 18/11/2026', 'Fri 20/11/2026', 'Thu 19/11/2026', 'Sat 21/11/2026', 'Sun 22/11/2026'] }, /do not line up/, 'day labels out of step with the dates');
refused({ rename: { '1:2': DAYS[0][0] } }, /out of day order/, 'two shifts in one row under the same day\'s column names');
refused({ rename: { '0:3': DAYS[1][0] }, totals: dayTotals(PEOPLE) }, /do not add up.*slipped/, 'a shift whose column names say another valid day: caught by the day totals (council finding, 14 Nov 2026)');
refused({ totals: ['48.00', '', '40.00', '40.00', '40.00', '40.00', '40.00'] }, /total hours/, 'a day without its total hours');
ok(X.read(build({ totals: Array(7).fill('0.00') })).ok, 'day totals below the shifts (breaks taken off) read fine');
refused({ rename: { '2:1': ['textBox90', 'textBox91', 'textBox92', 'textBox93'] } }, /does not name/, 'a shift under column names the report does not use (a changed export)');
refused({ extraNames: ['textBox45', 'textBox46', 'textBox47', 'textBox44'] }, /Line 1 does not match/, 'line 1 with names left over after the last row');
refused(build().split('\r\n').map((l, i) => i === 1 ? l.split(',').slice(0, -4).join(',') : l).join('\r\n'), /Line \d|Line 1/, 'a row missing its last shift, so the days slip');
refused({ edit: (r, n) => n === 1 ? r.concat(['', '', '']) : r }, /Line 3 is not laid out/, 'a row with a broken shift group');
refused({ people: [['Jo Pike', 'Demi Chef L5', { 2: '10:00-15:00' }]], edit: r => { r[r.length - 4] = '17:00-22:00'; return r; } }, /more than one time/, 'two times on one day (a split shift laid out differently)');
refused({ people: [['Jo Pike', 'Demi Chef L5', { 2: '17:00-01:00' }]] }, /after midnight/, 'a shift past midnight');
refused({ people: [['Jo Pike', 'Demi Chef L5', { 2: '10:00 to 15:00' }]], totals: Array(7).fill('0.00') }, /without a start and finish/, 'a time written another way');
refused({ people: [['Jo Pike', 'Demi Chef L5', { 2: '25:00-26:00' }]], totals: Array(7).fill('0.00') }, /without a start and finish/, 'an hour that does not exist');
refused({ people: [['Jo Pike', 'Demi Chef L5', { 1: '10:00-15:00' }], ['jo  pike', 'Demi Chef L5', { 2: '10:00-15:00' }]] }, /repeats a person/, 'the same person twice');
refused({ people: [['<b>Jo</b>', 'Demi Chef L5', { 1: '10:00-15:00' }]] }, /no name/, 'a name with markup in it');
refused({ edit: (r, n) => { if (n === 2) r[3] = 'Dates: 23/11/2026 - 29/11/2026'; return r; } }, /Line 4 is for a different week/, 'a line for another week');
refused('titleTextBox,"unfinished\r\n', /not a CSV file/, 'a quote that never closes');
refused(build() + 'x,'.repeat(10) + '\r\n', /not laid out|Line 1/, 'a stray line at the end');
const why = X.read({ toString() { return ''; } }); ok(!why.ok, 'refused: something that is not text');
ok(['Sam Kerr', 'Ann Moss', '$1,234.50', '111.11'].every(s => !String(X.read(build({ rename: { '1:2': DAYS[0][0] } })).why).includes(s)), 'a refusal names the line, never a name or a cost from it');

// ---- the kitchen's shifts a roster time touches (every one it overlaps) ----
const KIT = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'adl', name: 'All day dining', from: 900, to: 1020 }, { id: 'dinner', name: 'Dinner', from: 1020, to: 1320 }, { id: 'old', name: 'Old', from: 300, to: 1400, off: true }];
const sv = t => X.services({ from: mins(t), to: mins(t.slice(6)) }, KIT).join(' ');
ok(sv('10:00-21:30') === 'lunch adl dinner', 'services: 10:00 to 21:30 is Lunch, All day dining and Dinner');
ok(sv('17:00-22:00') === 'dinner', 'services: 17:00 to 22:00 is Dinner only');
ok(sv('10:00-15:00') === 'lunch', 'services: 10:00 to 15:00 ends as All day dining starts, so Lunch only');
ok(sv('11:00-15:30') === 'lunch adl', 'services: 11:00 to 15:30 touches All day dining for 30 minutes, so it counts');
ok(sv('16:00-21:30') === 'adl dinner', 'services: 16:00 to 21:30 is All day dining and Dinner');
ok(sv('06:00-09:00') === '', 'services: a shift before every service touches none; a switched-off shift never counts');
ok(X.services({ from: 600, to: 900 }, [{ id: 'x', from: 'a', to: 900 }, null, { id: 'y', from: 900, to: 600 }]).length === 0, 'services: shifts without proper times are left out');

// ---- names: the given name, the family initial for two of the same, exactly one, never shared ----
const people = n => n.map(full => { const p = full.split(' '); return { name: full, given: p[0], family: p.length > 1 ? p[p.length - 1] : '', shifts: [] }; });
const ids = (roster, book) => X.match(people(roster), book.map((name, i) => ({ id: 'p' + i, name }))).map(m => m.id || m.why).join(' ');
ok(ids(['Ann Moss', 'Bo Tran'], ['Ann', 'Bo']) === 'p0 p1', 'names: one Ann and one Bo match by given name');
ok(ids(['Ann Moss'], ['ann ']) === 'p0', 'names: case and spaces do not matter');
ok(ids(['Sam Kerr', 'Sam Lee'], ['Sam K', 'Ann']) === 'p0 none', 'names: two Sams are looked for as Sam K and Sam L');
ok(ids(['Sam Kerr', 'Sam Lee'], ['Sam']) === 'none none', 'names: two Sams in the file never land on the book\'s one Sam (council finding, 14 Nov 2026)');
ok(ids(['Sam Kerr'], ['Sam K', 'Sam L']) === 'p0', 'names: one Sam in the file finds Sam K when the book has two Sams');
ok(ids(['Sam Kerr'], ['Sam', 'Sam K']) === 'many', 'names: more than one fits, so it is listed, not guessed');
ok(ids(['Sam Kerr', 'Sam Kim'], ['Sam K']) === 'shared shared', 'names: two people looking for the same book person are both listed');
ok(ids(['Mary Jo Kahale'], ['Mary Jo']) === 'none', 'names: a two-word given name is looked for by its first word only, and listed when the book has it otherwise');
const lf = X.match(people(['Sam Kerr', 'Sam Lee', 'Mary Jo Kahale']), []);
ok(lf.map(m => m.looksFor).join('|') === 'Sam K|Sam L|Mary', 'names: each listed person says the name the book looks for');

// ---- the plan for each day ----
const BOOK = [{ id: 'sk', name: 'Sam K' }, { id: 'ann', name: 'Ann' }, { id: 'bo', name: 'Bo' }];
const p = X.plan(good, BOOK, KIT);
ok(Object.keys(p.days).join(' ') === good.week.days.join(' '), 'plan: every day of the week has a list, even an empty one');
ok(JSON.stringify(p.days['2026-11-16'].map(x => x.id + ':' + x.sh)) === JSON.stringify(['ann:adl', 'ann:dinner', 'bo:lunch', 'bo:adl', 'bo:dinner']), 'plan: Monday has Ann on All day dining and Dinner, Bo on all three');
ok(p.days['2026-11-19'].filter(x => x.id === 'sk').map(x => x.sh).join(' ') === 'lunch adl dinner', 'plan: Sam Kerr is on Thursday as Sam K');
ok(p.unmatched.map(u => u.name + ':' + u.looksFor + ':' + u.shifts.length).join(' ') === 'Sam Lee:Sam L:5 Mary Jo Kahale:Mary:5', 'plan: unmatched people are listed with the name looked for and their shifts');
ok(!Object.values(p.days).some(l => l.some(x => !x.id)), 'plan: nobody unmatched is ever put on a day');
const early = X.plan(X.read(build({ people: [['Ann Moss', 'Demi Chef L5', { 1: '06:00-09:00' }]] })), BOOK, KIT);
ok(early.idle.length === 1 && early.days['2026-11-17'].length === 0, 'plan: a shift outside every service is kept aside in idle, not put on a service');

R.forEach(r => console.log(r));
const bad = R.filter(r => r.startsWith('FAIL')).length;
console.log(bad + ' failed of ' + R.length);
process.exit(bad ? 1 : 0);
