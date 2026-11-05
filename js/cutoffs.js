/*
  Order cut-offs (23 Oct 2026): the maths shared by the phone (window.LK_CUT, loaded before js/prep.js, which draws the
  bar and the admin page) and node (scripts/cutoff-push.mjs, which sends the phone pushes). One copy, so the bar and
  the pushes always agree on when a supplier's order closes.
  A supplier, as config/main cutoffs keeps it: { id, name, days, dd, at, pre, lead }.
    days (5 Nov 2026, the head chef's supplier patterns): one line per delivery day, { d: delivery weekday (0 Sunday to
      6 Saturday), pre: days before the delivery the order closes (0 to 14), at: cut-off time in minutes after midnight
      (-1 to come) }. "Wednesday's order by Friday 16:00" is { d: 3, pre: 5, at: 960 }. This is what the book uses.
    dd, at, pre: the older shape, one rule for every delivery day. Saved too, so an older copy of the book still reminds:
      dd is the delivery days, at and pre the line that closes earliest before its delivery, so an older copy reminds
      early, never late. A record saved before 5 Nov 2026 has no days: its lines come from dd, pre and at.
    lead: minutes before the cut-off the reminder starts (240, 360 or 480; 0 all day on the cut-off day).
  One supplier closes once a day at most: lines that close on the same weekday are one order and one tick
  (cutdone/<day>_<id>), at the earliest of their times, "for Mon 9 and Wed 11 Nov". The page refuses two times.
*/
(function () {
  'use strict';
  var MAX = 20, MAX_PRE = 14, V = 2;
  var LEADS = [[240, '4 hours before'], [360, '6 hours before'], [480, '8 hours before'], [0, 'All day on the cut-off day']];
  var DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  /* The heads-up (5 Nov 2026): an order that closes 2 or more days before its delivery is shown the day before its
     cut-off (the Order list's Tomorrow, heads-up) and pushed at 15:00 that day, between services. HEADS_FOR is the
     push window: the job runs every 10 minutes, so an hour is six chances and few reads. */
  var HEADS = 900, HEADS_FOR = 60, HEADS_PRE = 2;
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'supplier'; }
  function int(n, lo, hi) { return typeof n === 'number' && n === Math.floor(n) && n >= lo && n <= hi; }
  // the weekday a line's order closes on
  function cutDow(l) { return ((l.d - l.pre) % 7 + 7) % 7; }
  // the line that closes earliest before its delivery (the most minutes ahead), for the older shape
  function earliest(days) {
    var best = null;
    days.forEach(function (l) { if (l.at >= 0 && (!best || l.pre * 1440 - l.at > best.pre * 1440 - best.at)) best = l; });
    return best;
  }
  // a supplier's lines, from days, or from the older shape when there are none (also for a record not cleaned yet)
  function lines(s) {
    if (s && Array.isArray(s.days)) return s.days;
    var pre = s && int(s.pre, 0, MAX_PRE) ? s.pre : 1, at = s && int(s.at, 0, 1439) ? s.at : -1;
    return (s && Array.isArray(s.dd) ? s.dd : []).filter(function (n, i, a) { return int(n, 0, 6) && a.indexOf(n) === i; }).sort().map(function (d) { return { d: d, pre: pre, at: at }; });
  }
  // checked by type before use: a damaged record never puts anything odd on screen or in a push
  function clean(list) {
    return (Array.isArray(list) ? list : []).filter(function (x) { return x && typeof x.name === 'string' && x.name.trim(); }).slice(0, MAX).map(function (x) {
      var days = Array.isArray(x.days) ? x.days.filter(function (l, i, a) {
        return l && int(l.d, 0, 6) && int(l.pre, 0, MAX_PRE) && (l.at === -1 || int(l.at, 0, 1439)) && a.findIndex(function (m) { return m && m.d === l.d; }) === i;
      }).map(function (l) { return { d: l.d, pre: l.pre, at: l.at }; }) : null;
      if (!days || (!days.length && x.days.length)) days = lines({ dd: x.dd, pre: x.pre, at: x.at });   // none usable: the older shape
      days.sort(function (a, b) { return a.d - b.d; });
      var e = earliest(days), lead = LEADS.some(function (l) { return l[0] === x.lead; }) ? x.lead : 240;   // saved before 24 Oct 2026: 4 hours
      return { id: (typeof x.id === 'string' && /^[a-z0-9-]{1,40}$/.test(x.id)) ? x.id : slug(x.name).slice(0, 40), name: x.name.trim().slice(0, 40),
        days: days, dd: days.map(function (l) { return l.d; }), at: e ? e.at : -1, pre: e ? e.pre : (days.length ? days[0].pre : 1), lead: lead };
    });
  }
  // Positive weekdays even when the cut-off is one or two weeks before delivery, one for each line.
  function cutDays(s) { return lines(s).map(cutDow); }
  /* the cut-offs that fall on a weekday (0 Sunday), soonest first: { s: the supplier, at and t: minutes after midnight
     (callers move at to their own day; t stays), del and pre: the soonest delivery and its days before, dels: every
     delivery the order is for, soonest first }. Lines with no time yet are left out. */
  function on(list, dow) {
    var out = [];
    list.forEach(function (s) {
      var ls = lines(s).filter(function (l) { return l.at >= 0 && cutDow(l) === dow; }).sort(function (a, b) { return a.pre - b.pre; });
      if (!ls.length) return;
      var at = Math.min.apply(null, ls.map(function (l) { return l.at; }));
      out.push({ s: s, at: at, t: at, del: ls[0].d, pre: ls[0].pre, dels: ls.map(function (l) { return { d: l.d, pre: l.pre }; }) });
    });
    return out.sort(function (a, b) { return a.at - b.at || a.s.name.localeCompare(b.s.name); });
  }
  // dates: YYYY-MM-DD, worked out in UTC so the phone's own zone never moves them
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function shift(day, n) {
    var p = String(day).split('-'), t = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate());
  }
  function dateParts(day) { var p = String(day).split('-'), t = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); return { w: DY[t.getUTCDay()], d: t.getUTCDate(), m: MON[t.getUTCMonth()] }; }
  // "Wed 11 Nov"
  function dateText(day) { var x = dateParts(day); return x.w + ' ' + x.d + ' ' + x.m; }
  // "Mon 9 and Wed 11 Nov", "Mon 30 Nov and Wed 2 Dec", "Mon 9, Tue 10 and Wed 11 Nov"
  function datesText(days) {
    var ps = days.map(dateParts), one = ps.every(function (x) { return x.m === ps[0].m; });
    var ws = ps.map(function (x, i) { return x.w + ' ' + x.d + (one && i < ps.length - 1 ? '' : ' ' + x.m); });
    return ws.length < 2 ? ws.join('') : ws.slice(0, -1).join(', ') + ' and ' + ws[ws.length - 1];
  }
  /* The delivery a cut-off is for, in words. With the cut-off's own date (YYYY-MM-DD): the delivery dates, "for Wed 11
     Nov" (5 Nov 2026). Without one, the older weekday words. */
  function forText(c, day) {
    var dels = c.dels || [{ d: c.del, pre: typeof c.pre === 'number' ? c.pre : c.s.pre }];
    if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) return 'for ' + datesText(dels.map(function (x) { return shift(day, x.pre); }));
    var pre = dels[0].pre, del = dels[0].d;
    return pre === 0 ? 'for today' : pre === 1 ? 'for ' + DAY[del] + (lines(c.s).length === 7 ? '' : '\'s delivery') :
      'for ' + DAY[del] + (pre === 7 ? ' in 1 week' : pre === 14 ? ' in 2 weeks' : pre > 7 ? ' in ' + pre + ' days' : '');
  }
  /* When the first phone push goes, in minutes from the cut-off day's midnight (below 0 is the night before): when the
     reminder starts, or for all day 08:00 (4 hours before a cut-off earlier than 12:00), so nobody is woken at midnight.
     The second goes 1 hour before (NOW). at: the cut-off's own time (a line's, 5 Nov 2026), the supplier's by default. */
  var NOW = 60;
  function when(s, at) { return typeof at === 'number' ? at : s.at; }
  function pushAt(s, at) { at = when(s, at); return s.lead ? at - s.lead : Math.min(at - 240, 480); }
  /* When the bar and the tick list show a cut-off, in the same minutes: from the reminder's start, all day from midnight,
     and never later than the first push (an all-day cut-off before 04:00 is pushed the night before, so it shows from
     then too and can be ticked off). */
  function startAt(s, at) { at = when(s, at); return s.lead ? at - s.lead : Math.min(0, at - 240); }
  /* The heads-up for a cut-off c (from on()), in minutes from its day's midnight: 15:00 the day before (-540), when one
     of its deliveries is 2 or more days after the cut-off and the reminder itself does not start before then. Else null. */
  function headsAt(c) {
    var far = (c.dels || [{ pre: c.pre }]).some(function (x) { return x.pre >= HEADS_PRE; }), h = HEADS - 1440;
    return far && h < startAt(c.s, c.t) ? h : null;
  }
  /* The next time a line closes, from a day (YYYY-MM-DD), its weekday and the minutes after midnight now: { cut, del },
     both dates. A line with no time yet: null. */
  function next(l, day, dow, mins) {
    if (!(l.at >= 0)) return null;
    for (var k = 0; k < 8; k++) if ((dow + k) % 7 === cutDow(l) && (k > 0 || l.at > mins)) return { cut: shift(day, k), del: shift(day, k + l.pre) };
    return null;
  }
  // Two lines of one supplier that close on the same weekday at different times (the page refuses them): [a, b] or null.
  function clash(s) {
    var ls = lines(s).filter(function (l) { return l.at >= 0; });
    for (var i = 0; i < ls.length; i++) for (var j = i + 1; j < ls.length; j++) if (cutDow(ls[i]) === cutDow(ls[j]) && ls[i].at !== ls[j].at) return [ls[i], ls[j]];
    return null;
  }
  var C = { v: V, clean: clean, lines: lines, cutDow: cutDow, cutDays: cutDays, on: on, forText: forText, pushAt: pushAt, startAt: startAt, headsAt: headsAt,
    next: next, clash: clash, shift: shift, dateText: dateText, datesText: datesText, LEADS: LEADS, DAY: DAY, DY: DY, MAX: MAX, MAX_PRE: MAX_PRE, NOW: NOW,
    HEADS: HEADS, HEADS_FOR: HEADS_FOR, HEADS_PRE: HEADS_PRE };
  if (typeof module === 'object' && module.exports) { module.exports = C; return; }
  window.LK_CUT = C;
})();
