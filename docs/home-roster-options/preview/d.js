  // D: who is in and when they start: names grouped by roster start time, in time order, a line at the time now
  // between starts already passed and those still to come; "back 14:15" for anyone on a break now. A split's second
  // start lists them again, marked "split". Sections, breaks and finishes are one tap away in Today's team.
  // the section a person is rostered on at a time: the service on then; before their day, the one they start on;
  // after it, the last one; a chef with no section reads as their role (Head chef, Sous chef)
  function homeWSecAt(rec, rows, id, t) {
    var mine = rows.filter(function (o) { return o.id === id; }).map(function (o) {
      var s = tmShift(o.sh), from = tmMin(o.from) !== null ? Math.max(o.from, s.from != null ? s.from : 0) : s.from, to = tmMin(o.to) !== null ? o.to : s.to;
      return { o: o, from: from, to: to };
    }).filter(function (x) { return x.from != null && x.to != null; }).sort(function (a, b) { return a.from - b.from; });
    var pick = mine.filter(function (x) { return x.from <= t && t < x.to; })[0] || mine.filter(function (x) { return x.from > t; })[0] || mine[mine.length - 1];
    if (!pick) return '';
    var name = tmSecName(pick.o.sec); if (name) return name;
    var p = ((S.config || {}).people || []).filter(function (x) { return x.id === id; })[0];
    return p && chefP(p) ? tmChefRole(p) : 'No section';
  }
  function homeWholeHTML(rec, rows, m) {
    var ids = [], groups = {}, times = [];
    rows.forEach(function (o) { if (ids.indexOf(o.id) < 0) ids.push(o.id); });
    ids.forEach(function (id) {
      homeWDay(rec, rows, id).forEach(function (h, i) {
        if (!groups[h[0]]) { groups[h[0]] = []; times.push(h[0]); }
        groups[h[0]].push({ id: id, again: i > 0, start: h[0], end: h[1] });
      });
    });
    times.sort(function (a, b) { return a - b; });
    // the line at the time now: before the first start still to come; at the top before anyone starts, at the end once
    // everyone has started
    var nowDone = false, line = function () { nowDone = true; return '<li class="hm-st-now"><span>Now ' + esc(tmHHMM(m)) + '</span></li>'; };
    var out = times.map(function (t) {
      var head = !nowDone && t > m ? line() : '';
      return head + '<li class="hm-st"><b class="hm-st-t">' + esc(tmHHMM(t)) + '</b><span class="hm-st-n">' + groups[t].sort(function (a, b) { return mnName(a.id).localeCompare(mnName(b.id)); }).map(function (x) {
        var br = homeWBreaks(rec, x.id, m);
        var sec = homeWSecAt(rec, rows, x.id, x.again ? Math.max(m, x.start) : m), gone = x.end <= m;
        // a part of the day already over says until when, from the roster (not a claim about who is still there)
        if (gone) sec = (sec ? sec + ', ' : '') + 'until ' + tmHHMM(x.end);
        return '<span class="hm-tp' + (br.away ? ' is-away' : '') + (gone ? ' is-gone' : '') + '"><b>' + esc(mnName(x.id)) + (x.again ? ' <small>split</small>' : '') + '</b>' + (sec ? '<small class="hm-st-sec">' + esc(sec) + '</small>' : '') + (br.away && !x.again ? '<small class="hm-st-back">back ' + esc(tmAwayTime(br.away.at + br.away.len)) + '</small>' : '') + '</span>';
      }).join('') + '</span></li>';
    }).join('') + (nowDone ? '' : line());
    return '<ul class="hm-starts">' + out + '</ul>';
  }
