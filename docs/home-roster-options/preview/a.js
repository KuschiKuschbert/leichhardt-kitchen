  // A: the board one service at a time, each person one line (name, their whole day), then section moves and breaks
  function homeWholeHTML(rec, rows, m) {
    var cols = [], at = {}, secs = kitSecs().map(function (x) { return x.id; }), key = function (o) { return secs.indexOf(o.sec) >= 0 ? o.sec : ''; };
    rows.forEach(function (o) { if (!at[o.sh]) { at[o.sh] = []; cols.push(tmShift(o.sh)); } if (!at[o.sh].some(function (x) { return x.id === o.id; })) at[o.sh].push(o); });
    cols.sort(tmShiftCmp);
    return '<div class="hm-svcs">' + cols.map(function (s) {
      var list = at[s.id], keys = secs.concat(['']).filter(function (k) { return list.some(function (o) { return key(o) === k; }); });
      return '<section class="hm-svc"><h4 class="hm-svc-h"><b>' + esc(s.name) + '</b> <span>' + esc(homeShiftHours(s)) + '</span><small>' + list.length + ' on</small></h4><dl class="hm-svc-l">' +
        keys.map(function (k) {
          return '<dt>' + esc(k ? tmSecName(k) : 'No section') + '</dt><dd>' + list.filter(function (o) { return key(o) === k; }).sort(function (a, b) { return mnName(a.id).localeCompare(mnName(b.id)); }).map(function (o) {
            var day = homeWDay(rec, rows, o.id), br = homeWBreaks(rec, o.id, m), move = homeSecMove(rec, o), sub = [move, br.words].filter(Boolean).join(' · ');
            return '<span class="hm-tp' + (br.away ? ' is-away' : '') + '"><span class="hm-tp-line"><b>' + esc(mnName(o.id)) + '</b><span class="hm-tp-hrs">' + esc(tmPartsWords(day)) + '</span></span>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>';
          }).join('') + '</dd>';
        }).join('') + '</dl></section>';
    }).join('') + '</div>';
  }
