  // ---- preview only: the whole day (head chef's On today, the staff fold) drawn by homeWholeHTML() ----
  function homeRotaHTML(rec, rows, m) {
    var all = rec.on.filter(function (o) { return tmShift(o.sh); }).length;
    // by role (round 2): the head chef's whole day only; staff, and staff not on the plan, keep the board
    var p = me(), hc = !!p && (S.config || {}).headId === p.id;
    return hc && rows.length === all ? homeWholeHTML(rec, rows, m) : homeRotaBoard(rec, rows, m);
  }
  function homeWBreaks(rec, id, m) {
    var bs = (rec.br || []).filter(function (b) { return b.id === id && tmShift(b.sh) && tmMin(b.at) !== null; }).sort(function (a, b) { return a.at - b.at; });
    var away = bs.filter(function (b) { return tmOnBreak(b, m); })[0];
    return { list: bs, away: away, words: away ? 'back ' + tmAwayTime(away.at + away.len) : bs.map(function (b) { return (tmIsSplit(b.len) ? 'split ' : 'break ') + tmAwayTime(b.at) + ' to ' + tmAwayTime(b.at + b.len); }).join(', ') };
  }
  function homeWDay(rec, rows, id) {
    var d = homePersonDay(rec, id);
    return d.length ? d : tmJoin(rows.filter(function (o) { return o.id === id; }).map(function (o) { var s = tmShift(o.sh); return s && s.from != null && s.to != null ? [s.from, s.to] : null; }));
  }
  // a person's sections through the day in words: "Larder, Grill from 17:00"; "No section"
  function homeWSecs(rec, rows, id) {
    var mine = rows.filter(function (o) { return o.id === id; }).sort(function (a, b) { return tmShiftCmp(tmShift(a.sh), tmShift(b.sh)); }), out = [], last = null;
    mine.forEach(function (o, i) {
      var k = tmSecName(o.sec) || 'No section'; if (k === last) return;
      var at = tmMin(o.from) !== null ? o.from : tmShift(o.sh).from;
      out.push(i && at != null ? k + ' from ' + tmHHMM(at) : k); last = k;
    });
    return out.join(', ');
  }
