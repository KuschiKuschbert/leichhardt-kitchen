  // D, repaired after round 2: who starts when, for the head chef's whole day. Names grouped by start time; under each
  // name the section they are rostered on now (before that part of their day, the one they start on; after it, its
  // last), "then Grill from 17:00" where they move later in the same part; "back 14:15" in bold while on a break in that
  // part; a part already over in grey, "until 15:00"; a second part of a split day listed again at its start, "again".
  // A line "Now" (no time, so the card only changes when a start passes or a break starts or ends). Anyone without a
  // start time is listed under "No start time"; with no start times at all, the section board.
  // a person's parts: each service they work, from its saved roster hours (else the service's). Parts that overlap
  // (plans saved on 15 Nov 2026 hold the whole day on each service) are cut where the later service starts
  function homeDParts(rec, rows, id) {
    var ps = rows.filter(function (o) { return o.id === id; }).map(function (o) {
      var s = tmShift(o.sh), ok = tmMin(o.from) !== null && tmMin(o.to) !== null && o.from < o.to;
      var from = ok ? o.from : s.from, to = ok ? o.to : s.to;
      return from != null && to != null && from < to ? { o: o, s: s, from: from, to: to } : null;
    }).filter(Boolean).sort(function (a, b) { return a.from - b.from || tmShiftCmp(a.s, b.s); });
    for (var i = 1; i < ps.length; i++) {
      var a = ps[i - 1], b = ps[i];
      if (b.from < a.to) { if (b.s.from != null) b.from = Math.min(b.to - 1, Math.max(b.from, b.s.from)); a.to = Math.max(a.from + 1, Math.min(a.to, b.from)); }
    }
    return ps;
  }
  function homeDSec(o) {
    var n = tmSecName(o.sec); if (n) return n;
    var p = ((S.config || {}).people || []).filter(function (x) { return x.id === o.id; })[0];
    return p && chefP(p) ? tmChefRole(p) : 'No section';
  }
  function homeWholeHTML(rec, rows, m) {
    var ids = [], entries = [], none = [];
    rows.forEach(function (o) { if (ids.indexOf(o.id) < 0) ids.push(o.id); });
    ids.forEach(function (id) {
      var parts = homeDParts(rec, rows, id);
      if (!parts.length) { none.push(id); return; }
      tmJoin(parts.map(function (p) { return [p.from, p.to]; })).forEach(function (span, i) {
        entries.push({ id: id, again: i > 0, from: span[0], to: span[1], parts: parts.filter(function (p) { return p.from >= span[0] && p.to <= span[1]; }) });
      });
    });
    if (!entries.length) return homeRotaBoard(rec, rows, m);
    var person = function (e) {
      var t = Math.min(Math.max(m, e.from), e.to - 1), cur = e.parts.filter(function (p) { return p.from <= t && t < p.to; })[0] || e.parts[e.parts.length - 1];
      var later = e.parts.filter(function (p) { return p.from > cur.from && tmSecName(p.o.sec) && p.o.sec !== cur.o.sec; })[0];
      var gone = e.to <= m, bs = (rec.br || []).filter(function (b) { return b.id === e.id && tmShift(b.sh) && tmMin(b.at) !== null && e.from <= b.at && b.at < e.to; });
      var away = bs.filter(function (b) { return tmOnBreak(b, m); })[0];
      var sec = homeDSec(cur.o) + (later && !gone ? ', then ' + tmSecName(later.o.sec) + ' from ' + tmHHMM(later.from) : '') + (gone ? ', until ' + tmHHMM(e.to) : '');
      return '<span class="hm-tp' + (away ? ' is-away' : '') + (gone ? ' is-gone' : '') + '"><b>' + esc(mnName(e.id)) + (e.again ? ' <small>again</small>' : '') + '</b><small class="hm-st-sec">' + esc(sec) + '</small>' +
        (away ? '<small class="hm-st-back">back ' + esc(tmAwayTime(away.at + away.len)) + '</small>' : '') + '</span>';
    };
    var times = []; entries.forEach(function (e) { if (times.indexOf(e.from) < 0) times.push(e.from); });
    times.sort(function (a, b) { return a - b; });
    var placed = false, line = function () { placed = true; return '<li class="hm-st-now"><span>Now</span></li>'; };
    var out = times.map(function (t) {
      return (!placed && t > m ? line() : '') + '<li class="hm-st"><b class="hm-st-t">' + esc(tmHHMM(t)) + '</b><span class="hm-st-n">' +
        entries.filter(function (e) { return e.from === t; }).sort(function (a, b) { return mnName(a.id).localeCompare(mnName(b.id)); }).map(person).join('') + '</span></li>';
    }).join('') + (placed ? '' : line());
    if (none.length) out += '<li class="hm-st hm-st-none"><b class="hm-st-t">No start time</b><span class="hm-st-n">' + none.sort(function (a, b) { return mnName(a).localeCompare(mnName(b)); }).map(function (id) {
      var o = rows.filter(function (x) { return x.id === id; })[0];
      return '<span class="hm-tp"><b>' + esc(mnName(id)) + '</b><small class="hm-st-sec">' + esc(homeDSec(o)) + '</small></span>';
    }).join('') + '</span></li>';
    return '<ul class="hm-starts">' + out + '</ul>';
  }
