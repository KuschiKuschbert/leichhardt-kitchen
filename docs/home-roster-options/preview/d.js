  // D: who is in and when they start: names grouped by roster start time, in time order, a line at the time now
  // between starts already passed and those still to come; "back 14:15" for anyone on a break now. A split's second
  // start lists them again, marked "split". Sections, breaks and finishes are one tap away in Today's team.
  function homeWholeHTML(rec, rows, m) {
    var ids = [], groups = {}, times = [];
    rows.forEach(function (o) { if (ids.indexOf(o.id) < 0) ids.push(o.id); });
    ids.forEach(function (id) {
      homeWDay(rec, rows, id).forEach(function (h, i) {
        if (!groups[h[0]]) { groups[h[0]] = []; times.push(h[0]); }
        groups[h[0]].push({ id: id, again: i > 0 });
      });
    });
    times.sort(function (a, b) { return a - b; });
    var nowDone = false, line = function () { nowDone = true; return '<li class="hm-st-now"><span>Now ' + esc(tmHHMM(m)) + '</span></li>'; };
    var out = times.map(function (t) {
      var head = !nowDone && t > m && times[0] <= m ? line() : '';
      return head + '<li class="hm-st"><b class="hm-st-t">' + esc(tmHHMM(t)) + '</b><span class="hm-st-n">' + groups[t].sort(function (a, b) { return mnName(a.id).localeCompare(mnName(b.id)); }).map(function (x) {
        var br = homeWBreaks(rec, x.id, m);
        return '<span class="hm-tp' + (br.away ? ' is-away' : '') + '">' + esc(mnName(x.id)) + (x.again ? ' <small>split</small>' : '') + (br.away && !x.again ? ' <small class="hm-st-back">back ' + esc(tmAwayTime(br.away.at + br.away.len)) + '</small>' : '') + '</span>';
      }).join('') + '</span></li>';
    }).join('');
    return '<ul class="hm-starts">' + out + '</ul>';
  }
