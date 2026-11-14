// A synthetic Humanforce "Weekly Department Roster Report" CSV, laid out like the real export (14 Nov 2026,
// docs/roster-import-options/brief.md): the report's own column names on line 1, one ragged row per person, quoted
// money values. Made-up people, made-up roles and made-up costs only. Used by roster-import.test.js (the reader) and
// roster-import-ui.test.js (the admin panel). Not a test file itself (run.js runs *.test.js only).
const FIXED = ['titleTextBox', 'textBox61', 'textBox62', 'textBox65', 'textBox3', 'textBox4', 'textBox2', 'textBox1', 'textBox7', 'textBox5', 'textBox8', 'textBox9', 'textBox11', 'textBox12', 'textBox13', 'textBox14', 'textBox10', 'textBox15', 'textBox16', 'textBox17', 'textBox18', 'textBox19', 'textBox20', 'textBox21', 'textBox22', 'textBox23', 'textBox24', 'textBox25', 'textBox26', 'textBox27', 'textBox28', 'textBox29', 'textBox6', 'textBox31', 'textBox30', 'textBox63', 'textBox64'];
const DAYS = [[['textBox34', 'textBox33', 'textBox32', 'textBox35'], 'tcbr'], [['textBox37', 'textBox38', 'textBox39', 'textBox36'], 'cbtr'], [['textBox41', 'textBox42', 'textBox43', 'textBox40'], 'cbtr'], [['textBox45', 'textBox46', 'textBox47', 'textBox44'], 'cbtr'], [['textBox49', 'textBox50', 'textBox51', 'textBox48'], 'cbtr'], [['textBox53', 'textBox54', 'textBox55', 'textBox52'], 'cbtr'], [['textBox56', 'textBox57', 'textBox58', 'textBox59'], 'cbtr']];
const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// the week's dates from its Monday ('YYYY-MM-DD'): dd/mm/yyyy, and the seven day labels the report prints
const dmy = d => d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4);
const weekDays = monday => [0, 1, 2, 3, 4, 5, 6].map(n => new Date(Date.parse(monday + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10));
const labels = monday => weekDays(monday).map((d, n) => WD[n] + ' ' + dmy(d));
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
  const monday = o.monday || '2026-11-16', days = weekDays(monday);
  const people = o.people || PEOPLE, head = (o.head || ['Weekly Department Roster Report', 'Locations: All', 'Departments: Food', 'Dates: ' + dmy(days[0]) + ' - ' + dmy(days[6]), 'Location:', o.loc || 'Leichhardt Hotel', 'Department:', o.dep || 'Food', 'Employee'].concat(o.labels || labels(monday), ['Total Hours', 'Total Costs'], o.totals || dayTotals(people), [0, 1, 2, 3, 4, 5, 6].map(i => '$1,0' + i + '0.50')));
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
module.exports = { build, DAYS, PEOPLE, dayTotals, mins, weekDays };
