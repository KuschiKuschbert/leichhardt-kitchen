/*
  Order cut-offs (23 Oct 2026): the maths shared by the phone (window.LK_CUT, loaded before js/prep.js, which draws the
  bar and the admin page) and node (scripts/cutoff-push.mjs, which sends the phone pushes). One copy, so the bar and
  the pushes always agree on when a supplier's order closes.
  A supplier, as config/main cutoffs keeps it: { id, name, dd: delivery weekdays (0 Sunday to 6 Saturday), at: cut-off
  time in minutes after midnight (-1 to come), pre: days before the delivery the order closes (0 to 3), lead: minutes
  before the cut-off the reminder starts (240, 360 or 480; 0 all day on the cut-off day) }.
*/
(function () {
  'use strict';
  var MAX = 20;
  var LEADS = [[240, '4 hours before'], [360, '6 hours before'], [480, '8 hours before'], [0, 'All day on the cut-off day']];
  var DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'supplier'; }
  // checked by type before use: a damaged record never puts anything odd on screen or in a push
  function clean(list) {
    return (Array.isArray(list) ? list : []).filter(function (x) { return x && typeof x.name === 'string' && x.name.trim(); }).slice(0, MAX).map(function (x) {
      var at = typeof x.at === 'number' && x.at >= 0 && x.at < 1440 ? Math.floor(x.at) : -1, pre = typeof x.pre === 'number' && x.pre >= 0 && x.pre <= 3 ? Math.floor(x.pre) : 1;
      var dd = (Array.isArray(x.dd) ? x.dd : []).filter(function (n, i, a) { return typeof n === 'number' && n >= 0 && n <= 6 && n === Math.floor(n) && a.indexOf(n) === i; }).sort();
      var lead = LEADS.some(function (l) { return l[0] === x.lead; }) ? x.lead : 240;   // saved before 24 Oct 2026: 4 hours
      return { id: (typeof x.id === 'string' && /^[a-z0-9-]{1,40}$/.test(x.id)) ? x.id : slug(x.name).slice(0, 40), name: x.name.trim().slice(0, 40), dd: dd, at: at, pre: pre, lead: lead };
    });
  }
  // the cut-offs that fall on a weekday (0 Sunday), soonest first: { s: the supplier, at: minutes after midnight, del: delivery weekday }
  function on(list, dow) {
    var out = [];
    list.forEach(function (s) {
      if (s.at < 0) return;
      s.dd.forEach(function (d) { if ((d - s.pre + 7) % 7 === dow) out.push({ s: s, at: s.at, del: d }); });
    });
    return out.sort(function (a, b) { return a.at - b.at || a.s.name.localeCompare(b.s.name); });
  }
  // the delivery a cut-off is for, in words
  function forText(c) { return c.s.pre === 0 ? 'for today' : c.s.pre === 1 ? 'for ' + DAY[c.del] + (c.s.dd.length === 7 ? '' : '\'s delivery') : 'for ' + DAY[c.del]; }
  /* When the first phone push goes, in minutes from the cut-off day's midnight (below 0 is the night before): when the
     reminder starts, or for all day 08:00 (4 hours before a cut-off earlier than 12:00), so nobody is woken at midnight.
     The second goes 1 hour before (NOW). */
  var NOW = 60;
  function pushAt(s) { return s.lead ? s.at - s.lead : Math.min(s.at - 240, 480); }
  /* When the bar and the tick list show a cut-off, in the same minutes: from the reminder's start, all day from midnight,
     and never later than the first push (an all-day cut-off before 04:00 is pushed the night before, so it shows from
     then too and can be ticked off). */
  function startAt(s) { return s.lead ? s.at - s.lead : Math.min(0, s.at - 240); }
  var C = { clean: clean, on: on, forText: forText, pushAt: pushAt, startAt: startAt, LEADS: LEADS, DAY: DAY, MAX: MAX, NOW: NOW };
  if (typeof module === 'object' && module.exports) { module.exports = C; return; }
  window.LK_CUT = C;
})();
