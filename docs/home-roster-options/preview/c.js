  // C: sections across the day: one block per section in the kitchen's order, who works it and when, in time order;
  // a gap where nobody is on that section between its first start and last finish
  function homeWholeHTML(rec, rows, m) {
    var secs = kitSecs().map(function (x) { return x.id; }), key = function (o) { return secs.indexOf(o.sec) >= 0 ? o.sec : ''; };
    var part = function (o) { var s = tmShift(o.sh); return tmMin(o.from) !== null && tmMin(o.to) !== null && o.from < o.to ? [o.from, o.to] : s.from != null && s.to != null ? [s.from, s.to] : null; };
    var keys = secs.concat(['']).filter(function (k) { return rows.some(function (o) { return key(o) === k; }); });
    return '<div class="hm-secs-day">' + keys.map(function (k) {
      var here = rows.filter(function (o) { return key(o) === k; }), ids = [], t = {};
      here.forEach(function (o) { if (ids.indexOf(o.id) < 0) ids.push(o.id); });
      ids.forEach(function (id) { t[id] = tmJoin(here.filter(function (o) { return o.id === id; }).map(part)); });
      ids.sort(function (a, b) { return (t[a][0] ? t[a][0][0] : 1e4) - (t[b][0] ? t[b][0][0] : 1e4) || mnName(a).localeCompare(mnName(b)); });
      var cover = tmJoin([].concat.apply([], ids.map(function (id) { return t[id]; }))), gaps = [];
      for (var i = 1; i < cover.length; i++) gaps.push(tmHHMM(cover[i - 1][1]) + ' to ' + tmHHMM(cover[i][0]));
      return '<section class="hm-sd"><h4 class="hm-sd-h"><b>' + esc(k ? tmSecName(k) : 'No section') + '</b>' + (k && gaps.length ? '<small>Nobody ' + esc(gaps.join(', ')) + '</small>' : '') + '</h4><ul>' + ids.map(function (id) {
        var br = homeWBreaks(rec, id, m), mine = t[id], words = br.list.filter(function (b) { return mine.some(function (h) { return h[0] <= b.at && b.at < h[1]; }); });
        var bw = br.away && words.indexOf(br.away) >= 0 ? 'back ' + tmAwayTime(br.away.at + br.away.len) : words.map(function (b) { return (tmIsSplit(b.len) ? 'split ' : 'break ') + tmAwayTime(b.at); }).join(', ');
        return '<li class="hm-tp' + (br.away && words.indexOf(br.away) >= 0 ? ' is-away' : '') + '"><span class="hm-sd-t">' + esc(tmPartsWords(mine)) + '</span><b>' + esc(mnName(id)) + '</b>' + (bw ? '<small>' + esc(bw) + '</small>' : '') + '</li>';
      }).join('') + '</ul></section>';
    }).join('') + '</div>';
  }
