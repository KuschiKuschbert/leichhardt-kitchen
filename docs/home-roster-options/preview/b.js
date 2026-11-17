  // B: the day on one clock: one row per person in start order, their whole day on a bar on one scale, the hour marks
  // and a line at the time now; their sections and breaks in words
  function homeWholeHTML(rec, rows, m) {
    var ids = [], day = {}, lo = 1440, hi = 0;
    rows.forEach(function (o) { if (ids.indexOf(o.id) < 0) ids.push(o.id); });
    ids.forEach(function (id) { day[id] = homeWDay(rec, rows, id); day[id].forEach(function (h) { lo = Math.min(lo, h[0]); hi = Math.max(hi, h[1]); }); });
    if (hi <= lo) return homeRotaBoard(rec, rows, m);
    lo = Math.floor(lo / 60) * 60; hi = Math.min(1440, Math.ceil(hi / 60) * 60);
    var pc = function (v) { return (Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100))).toFixed(1); };
    var first = function (id) { return day[id].length ? day[id][0][0] : 1e4; };
    ids.sort(function (a, b) { return first(a) - first(b) || mnName(a).localeCompare(mnName(b)); });
    var ticks = ''; for (var h = lo; h <= hi; h += 60) ticks += '<span class="' + ((h / 60) % 3 ? 'tk1' : 'tk3') + '" style="left:' + pc(h) + '%">' + pad(Math.floor(h / 60) % 24) + '</span>';
    var nowAt = m >= lo && m <= hi ? '<i class="hm-dnow" style="left:' + pc(m) + '%" aria-hidden="true"></i>' : '';
    return '<div class="hm-dclock"><span class="tm-tlt hm-dticks" aria-hidden="true">' + ticks + '</span><ul class="hm-dlist">' + ids.map(function (id) {
      var br = homeWBreaks(rec, id, m), d = day[id];
      var bar = d.map(function (x) { return '<i class="sh" style="left:' + pc(x[0]) + '%;width:' + (pc(x[1]) - pc(x[0])).toFixed(1) + '%"></i>'; }).join('') +
        br.list.map(function (b) { return '<i class="' + (tmIsSplit(b.len) ? 'sp' : 'br') + '" style="left:' + pc(b.at) + '%;width:' + Math.max(0.8, pc(b.at + b.len) - pc(b.at)).toFixed(1) + '%"></i>'; }).join('');
      return '<li class="hm-tp hm-drow' + (br.away ? ' is-away' : '') + '"><span class="hm-dtop"><b>' + esc(mnName(id)) + '</b><span class="hm-tp-hrs">' + esc(tmPartsWords(d)) + '</span></span>' +
        '<span class="tm-tlbar hm-dbar" aria-hidden="true">' + bar + nowAt + '</span><small>' + esc(homeWSecs(rec, rows, id)) + (br.words ? ' · <span class="hm-dbr">' + esc(br.words) + '</span>' : '') + '</small></li>';
    }).join('') + '</ul></div>';
  }
