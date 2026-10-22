/*
  Tomorrow's list (22 Oct 2026, head chef): every night the team writes the next day's prep list in one go. This finds
  when that started on a day, and the usual time over many nights. Lines written before it roll over the next day and
  show Rolled; lines written from then on are tomorrow's list and look like normal lines.
  Shared: the phone (window.LK_LEARN, loaded before js/prep.js) and node (scripts/nightly-learn.mjs, tests/learn.test.js).
*/
(function () {
  'use strict';
  // From 15:00, lines written with gaps of 15 minutes or less are one batch, and a batch of 6 or more lines can be the
  // night list. Tune these once the head chef has seen the clocked nights (admin panel, Reports, Learning).
  var FROM = 15 * 60, GAP = 15 * 60000, MIN = 6;
  // rolled copies, a function's platters, practice lines and removed lines were not written by people for the night list
  function counts(x) { return !!x && !x.rolled && !x.fn && !x.tst && !x.deleted && typeof x.addedAt === 'number' && x.addedAt > 0; }
  /* One day's lines (days/<day>/items). clock reads a time in kitchen time: day(ms) and mins(ms), LK_TIME on the phone.
     The biggest batch is the night list (a tie goes to the later one). Gives the minute after midnight it started and
     how many lines it has, or m -1 when the day has none. */
  function listStart(lines, day, clock) {
    var ts = (lines || []).filter(function (x) { return counts(x) && clock.day(x.addedAt) === day && clock.mins(x.addedAt) >= FROM; })
      .map(function (x) { return x.addedAt; }).sort(function (a, b) { return a - b; });
    var best = { m: -1, n: 0 }, i = 0, j;
    while (i < ts.length) {
      for (j = i + 1; j < ts.length && ts[j] - ts[j - 1] <= GAP; j++) {}
      if (j - i >= MIN && j - i >= best.n) best = { m: clock.mins(ts[i]), n: j - i };
      i = j;
    }
    return best;
  }
  function median(a) { a = a.slice().sort(function (x, y) { return x - y; }); return a[Math.floor(a.length / 2)]; }
  function dowOf(day) { var p = day.split('-'); return String(new Date(Date.UTC(+p[0], p[1] - 1, +p[2])).getUTCDay()); }
  /* The clocked nights ({ 'YYYY-MM-DD': { m, n } }, as listStart gives them) into the usual start: over every night
     with a list (3 or more nights), and for each weekday the list was written on (2 or more of that weekday, '0' is
     Sunday). usual is -1 until there are 3. */
  function usual(days) {
    var all = [], by = {}, dow = {};
    Object.keys(days || {}).forEach(function (d) {
      var e = days[d];
      if (!e || typeof e.m !== 'number' || e.m < 0 || e.m >= 1440) return;
      all.push(e.m); (by[dowOf(d)] = by[dowOf(d)] || []).push(e.m);
    });
    Object.keys(by).forEach(function (k) { if (by[k].length >= 2) dow[k] = median(by[k]); });
    return { usual: all.length >= 3 ? median(all) : -1, dow: dow, n: all.length };
  }
  var L = { listStart: listStart, usual: usual, dowOf: dowOf, FROM: FROM, GAP: GAP, MIN: MIN };
  if (typeof module === 'object' && module.exports) { module.exports = L; return; }
  window.LK_LEARN = L;
})();
