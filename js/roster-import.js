/*
  Roster file (14 Nov 2026, head chef; docs/roster-import-options/brief.md): reads the Humanforce "Weekly Department
  Roster Report" exported as CSV into who works which day and when, and puts each shift on the kitchen's own shifts.
  Step 1 of the chosen design: this file alone, with tests. Nothing in the book loads it yet. Later it loads only in the
  admin panel, for the head chef's verified admin session, when they choose a roster file (never in SHELL).
  Shared: the phone (window.LK_ROSTER) and node (tests/roster-import.test.js).

  Wages: the CSV carries wage costs. Every money cell is wiped the moment the text is split into cells, before anything
  else reads it. Nothing here keeps, returns or shows a cost, an award role or hours: only names, dates and times.

  Fails closed: anything that does not fit the report exactly gives { ok: false, why } and no people, so nothing is
  filled. The day of a shift is written only in the report's own column names on line 1 (each row's names, one row after
  another), so every row must walk those names in step, in day order, and finish exactly at the end of line 1. As a
  second check, the shifts on each day must add up to at least that day's total hours in the report (breaks only take
  hours away), so a shift that slipped to another day is usually caught. The day totals are read for that check only and
  never kept or returned. A message names the line, never a cell from it.

  Names (head chef, 14 Nov 2026): a person is looked for in the book by their given name, the first word of the name in
  the file. Two people in the file with the same given name are looked for with the first letter of the family name as
  well ("Sam K"). Exactly one person in the book must fit, and no two people in the file may land on the same person in
  the book; anything else is listed for the chef, never guessed. The import never adds people.
  Name links (head chef, 14 Nov 2026: "sometimes we're given nicknames"): the head chef can link a name on the roster
  to a person in the book ("Daniel Kuschmierz" is "Kuschi"). A linked name goes to that person first; a person in the
  book who has a link is found only through it, never by a given name.
*/
(function () {
  'use strict';
  var MAX_TEXT = 1000000, MAX_ROWS = 200, MAX_NAME = 80;
  var TITLE = 'Weekly Department Roster Report';
  // line 1: the report's own column names. The first 37 are the same on every row (title, filters, the week's labels
  // and totals, then the person's name, hours and cost); the rest come in groups of four, one group for each day worked.
  var FIXED = ['titleTextBox', 'textBox61', 'textBox62', 'textBox65', 'textBox3', 'textBox4', 'textBox2', 'textBox1', 'textBox7',
    'textBox5', 'textBox8', 'textBox9', 'textBox11', 'textBox12', 'textBox13', 'textBox14', 'textBox10', 'textBox15',
    'textBox16', 'textBox17', 'textBox18', 'textBox19', 'textBox20', 'textBox21', 'textBox22', 'textBox23', 'textBox24',
    'textBox25', 'textBox26', 'textBox27', 'textBox28', 'textBox29', 'textBox6', 'textBox31', 'textBox30', 'textBox63', 'textBox64'];
  // Monday to Sunday: each day's four column names in file order, and which of the four holds the shift's time
  var DAYS = [
    { names: ['textBox34', 'textBox33', 'textBox32', 'textBox35'], time: 0 },
    { names: ['textBox37', 'textBox38', 'textBox39', 'textBox36'], time: 2 },
    { names: ['textBox41', 'textBox42', 'textBox43', 'textBox40'], time: 2 },
    { names: ['textBox45', 'textBox46', 'textBox47', 'textBox44'], time: 2 },
    { names: ['textBox49', 'textBox50', 'textBox51', 'textBox48'], time: 2 },
    { names: ['textBox53', 'textBox54', 'textBox55', 'textBox52'], time: 2 },
    { names: ['textBox56', 'textBox57', 'textBox58', 'textBox59'], time: 2 }
  ];
  var WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var C = { title: 0, locations: 1, departments: 2, dates: 3, locLabel: 4, loc: 5, depLabel: 6, dep: 7, employee: 8, day0: 9, hoursLabel0: 16, total0: 18, name: 32, hoursLabel: 35, costsLabel: 36 };
  var HOURS = /^\d{1,4}(\.\d{1,2})?$/;
  var TIME = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/;
  var MONEY = /^\s*\(?-?\s*\$/;

  function no(why) { return { ok: false, why: why }; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function dmy(s) { // "16/11/2026" to a UTC date, or null
    var m = /^(\d\d)\/(\d\d)\/(\d{4})$/.exec(s); if (!m) return null;
    var d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
    return d.getUTCDate() === +m[1] && d.getUTCMonth() === +m[2] - 1 ? d : null;
  }
  function same(a, b) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }

  /* The text split into lines of cells (quoted cells, doubled quotes, commas and line ends inside quotes, CRLF or LF).
     Money cells are blanked here, as each cell is finished, before anything else sees them. null when it is not CSV. */
  function cells(text) {
    var rows = [], row = [], cell = '', q = false, i = 0, n = text.length, c;
    function end() { row.push(MONEY.test(cell) ? '' : cell); cell = ''; }
    if (text.charCodeAt(0) === 0xFEFF) i = 1;
    for (; i < n; i++) {
      c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') { if (cell !== '') return null; q = true; }
      else if (c === ',') end();
      else if (c === '\r' || c === '\n') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        end(); rows.push(row); row = [];
        if (rows.length > MAX_ROWS + 1) return null;
      } else cell += c;
    }
    if (q) return null;
    if (cell !== '' || row.length) { end(); rows.push(row); }
    return rows;
  }

  /* read(text, want): the roster, or { ok: false, why }. want: { location, department } the file must be for
     (by default Leichhardt Hotel, Food). */
  function read(text, want) {
    want = want || {};
    var loc = want.location || 'Leichhardt Hotel', dep = want.department || 'Food';
    if (typeof text !== 'string' || !text.trim()) return no('The file is empty.');
    if (text.length > MAX_TEXT) return no('The file is too big for one week of roster.');
    var rows = cells(text);
    if (!rows) return no('The file is not a CSV file the book can read.');
    while (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') rows.pop();
    if (rows.length < 2) return no('The file has no people in it.');
    if (rows.length > MAX_ROWS + 1) return no('The file has more rows than one week of roster.');
    var hdr = rows[0];
    if (!same(hdr.slice(0, FIXED.length), FIXED)) return no('This is not the Weekly Department Roster Report, or Humanforce has changed its layout.');
    var first = rows[1];
    if (first.length < FIXED.length || first[C.title] !== TITLE) return no('Line 2 is not a roster line.');
    var span = /^Dates: (\d\d\/\d\d\/\d{4}) - (\d\d\/\d\d\/\d{4})$/.exec(first[C.dates] || '');
    var from = span && dmy(span[1]), to = span && dmy(span[2]);
    if (!from || !to) return no('The file does not say which week it is for.');
    if (from.getUTCDay() !== 1 || to.getTime() - from.getTime() !== 6 * 86400000) return no('The file is not one week from Monday to Sunday.');
    var days = [];
    for (var d = 0; d < 7; d++) {
      var day = new Date(from.getTime() + d * 86400000), label = WD[d] + ' ' + pad(day.getUTCDate()) + '/' + pad(day.getUTCMonth() + 1) + '/' + day.getUTCFullYear();
      if (first[C.day0 + d] !== label) return no('The days in the file do not line up with the week it names.');
      days.push(ymd(day));
    }
    if (first[C.locLabel] !== 'Location:' || first[C.loc] !== loc) return no('The file is not for ' + loc + '.');
    if (first[C.depLabel] !== 'Department:' || first[C.dep] !== dep) return no('The file is not for the ' + dep + ' department.');
    if (first[C.employee] !== 'Employee' || first[C.hoursLabel0] !== 'Total Hours' || first[C.hoursLabel] !== 'Hours:' || first[C.costsLabel] !== 'Costs:') return no('Line 2 is not laid out like the roster report.');
    var totals = [];
    for (var h = 0; h < 7; h++) {
      if (!HOURS.test(first[C.total0 + h] || '')) return no('The file does not show each day\'s total hours.');
      totals.push(Math.round(parseFloat(first[C.total0 + h]) * 60));
    }
    var off = FIXED.length, people = [], seen = {};
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r], line = 'Line ' + (r + 1);
      if (row.length < FIXED.length || (row.length - FIXED.length) % 4) return no(line + ' is not laid out like the roster report.');
      for (var k = 0; k < C.total0 + 7; k++) if (row[k] !== first[k]) return no(line + ' is for a different week, place or report.');
      if (row[C.hoursLabel] !== 'Hours:' || row[C.costsLabel] !== 'Costs:') return no(line + ' is not laid out like the roster report.');
      var name = String(row[C.name] || '').replace(/\s+/g, ' ').trim();
      if (!name || name.length > MAX_NAME || /[\u0000-\u001f\u007f<>]/.test(name)) return no(line + ' has no name the book can use.');
      if (seen[name.toLowerCase()]) return no(line + ' repeats a person already in the file.');
      seen[name.toLowerCase()] = true;
      var shifts = [], last = -1;
      for (var g = FIXED.length; g < row.length; g += 4) {
        if (off + 4 > hdr.length) return no(line + ' does not match the column names on line 1.');
        var names = hdr.slice(off, off + 4), di = -1;
        off += 4;
        for (var x = 0; x < 7; x++) if (same(names, DAYS[x].names)) di = x;
        if (di < 0 || di <= last) return no(line + ' has a shift on a day the report does not name, or out of day order.');
        last = di;
        var four = row.slice(g, g + 4), t = TIME.exec(four[DAYS[di].time]);
        if (!t) return no(line + ' has a shift without a start and finish time.');
        for (var y = 0; y < 4; y++) if (y !== DAYS[di].time && TIME.test(four[y])) return no(line + ' has more than one time on a day.');
        var a = +t[1] * 60 + +t[2], b = +t[3] * 60 + +t[4];
        if (b <= a) return no(line + ' has a shift that ends after midnight or before it starts.');
        shifts.push({ day: days[di], from: a, to: b });
      }
      var parts = name.split(' ');
      people.push({ name: name, given: parts[0], family: parts.length > 1 ? parts[parts.length - 1] : '', shifts: shifts });
    }
    if (off !== hdr.length) return no('Line 1 does not match the roster lines under it.');
    for (var t2 = 0; t2 < 7; t2++) {
      var gross = 0;
      people.forEach(function (p) { p.shifts.forEach(function (s) { if (s.day === days[t2]) gross += s.to - s.from; }); });
      if (gross < totals[t2]) return no('The shifts on ' + WD[t2] + ' do not add up to that day\'s hours in the report. The days may have slipped.');
    }
    return { ok: true, week: { from: days[0], to: days[6], days: days }, location: loc, department: dep, people: people };
  }

  /* The kitchen's shifts a roster time touches (head chef, 14 Nov 2026: every one it overlaps). kit: config kitShifts
     { id, from, to, off } in minutes after midnight. Shifts switched off or without both times are left out. */
  function services(shift, kit) {
    return (kit || []).filter(function (s) {
      return s && !s.off && typeof s.from === 'number' && typeof s.to === 'number' && s.to > s.from && shift.from < s.to && shift.to > s.from;
    }).map(function (s) { return s.id; });
  }

  function key(s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
  /* Who each person in the file is in the book. staff: the people who can be on Today's team { id, name }. links:
     [{ name, id }], a roster name linked to a person in the book. Gives [{ name, id, looksFor, why, linked }]: id ''
     with why 'none' (nobody fits), 'many' (more than one fits) or 'shared' (another person in the file lands on the
     same person in the book). A link to someone no longer in staff is left out. */
  function match(people, staff, links) {
    var count = {}, ids = {}, byName = {}, linkedIds = {};
    (staff || []).forEach(function (s) { if (s && s.id) ids[s.id] = 1; });
    (links || []).forEach(function (l) { if (l && l.id && ids[l.id] && key(l.name)) { byName[key(l.name)] = l.id; linkedIds[l.id] = 1; } });
    people.forEach(function (p) { var g = key(p.given); count[g] = (count[g] || 0) + 1; });
    var out = people.map(function (p) {
      var twins = count[key(p.given)] > 1, initial = p.family ? p.family[0] : '';
      var looksFor = twins && initial ? p.given + ' ' + initial : p.given;
      if (byName[key(p.name)]) return { name: p.name, id: byName[key(p.name)], looksFor: looksFor, why: '', linked: true };
      var keys = twins ? [key(looksFor)] : [key(p.given)].concat(initial ? [key(p.given + ' ' + initial)] : []);
      var fit = (staff || []).filter(function (s) { return s && s.id && !linkedIds[s.id] && keys.indexOf(key(s.name)) >= 0; });
      return { name: p.name, id: fit.length === 1 ? fit[0].id : '', looksFor: looksFor, why: fit.length === 1 ? '' : fit.length ? 'many' : 'none', linked: false };
    });
    var landed = {};
    out.forEach(function (m) { if (m.id) landed[m.id] = (landed[m.id] || 0) + 1; });
    out.forEach(function (m) { if (m.id && landed[m.id] > 1) { m.id = ''; m.why = 'shared'; m.linked = false; } });
    return out;
  }

  /* What the roster puts on each day: { days: { 'YYYY-MM-DD': [{ id, sh, from, to }] }, unmatched: [{ name, looksFor,
     why, shifts }] }. A shift that touches none of the kitchen's shifts is listed in idle. Filling the book's drafts
     (only empty days that were read from the server) is the admin panel's job, not this file's. */
  function plan(roster, staff, kit, links) {
    var who = match(roster.people, staff, links), days = {}, unmatched = [], idle = [];
    roster.week.days.forEach(function (d) { days[d] = []; });
    roster.people.forEach(function (p, i) {
      var m = who[i];
      if (!m.id) { unmatched.push({ name: p.name, looksFor: m.looksFor, why: m.why, shifts: p.shifts.slice() }); return; }
      p.shifts.forEach(function (s) {
        var sh = services(s, kit);
        if (!sh.length) idle.push({ id: m.id, day: s.day, from: s.from, to: s.to });
        sh.forEach(function (id) { days[s.day].push({ id: m.id, sh: id, from: s.from, to: s.to }); });
      });
    });
    return { days: days, unmatched: unmatched, idle: idle };
  }

  // api: 2 since name links (14 Nov 2026); the admin panel refuses any other copy
  var R = { api: 2, read: read, services: services, match: match, plan: plan, cells: cells, key: key };
  if (typeof module === 'object' && module.exports) { module.exports = R; return; }
  window.LK_ROSTER = R;
})();
