/* The combined preview: B's day grid as the main flow, built from the existing person rows (not a table, so the one
   break details panel still moves inline), with A's worded Breaks button and break line on each row, and C's "Same as
   Lunch: Grill" offered first in a later service's own picker (never applied by itself). No automatic fill, no pass.
   The service heads stay in view while scrolling and count, in neutral words, who still has no section. Breaks open on
   the service on now or next. Chef rows read Head chef or Sous chef and are left out of the counts. */
(function () {
  var TS = window.TS;
  function person(pid) { return TS.people.filter(function (x) { return x.id === pid; })[0]; }
  function cell(p, s) {
    var cur = TS.on[p.id][s.id];
    if (cur === undefined) return '<span class="tx-off">Off</span>';
    var none = p.chef || 'No section';
    return '<button type="button" class="tx-cell' + (cur ? '' : ' is-empty') + '" data-a="pick" data-id="' + p.id + '" data-sh="' + s.id + '" data-focus="m:' + p.id + ':' + s.id + '" aria-label="Section for ' + p.name + ' on ' + s.name + ': ' + (TS.sec(cur) || none) + '"' + (TS.busy() ? ' disabled' : '') + '>' + (TS.sec(cur) || none) + '</button>';
  }
  function head() {
    return '<li class="tx-ghead" aria-hidden="true"><span class="tx-who">Who</span>' + TS.services.map(function (s) {
      var onS = TS.people.filter(function (p) { return !p.chef && TS.on[p.id][s.id] !== undefined; }), none = onS.filter(function (p) { return !TS.on[p.id][s.id]; }).length;
      return '<span class="tx-sh"><b>' + s.name + '</b><small>' + TS.hhmm(s.from) + ' to ' + TS.hhmm(s.to) + '</small><small class="tx-count">' + (none ? '<b>' + none + '</b> no section' : 'All have one') + '</small></span>';
    }).join('') + '</li>';
  }
  function row(p) {
    var open = TS.focus && TS.focus.pid === p.id;
    return '<li class="tx-row" data-id="' + p.id + '"><div class="tx-who"><span class="ts-name">' + p.name + '</span><button type="button" class="tx-brk" data-a="bench-open" data-id="' + p.id + '" aria-expanded="' + open + '" aria-label="Breaks for ' + p.name + ', break not set">Breaks <span>not set</span></button></div>' +
      TS.services.map(function (s) { return '<div class="tx-c">' + cell(p, s) + '</div>'; }).join('') + (open ? TS.bench() : '') + '</li>';
  }
  function draw() {
    var counts = TS.services.map(function (s) { var n = TS.people.filter(function (p) { return !p.chef && TS.on[p.id][s.id] === ''; }).length; return n ? s.name + ' ' + n : ''; }).filter(Boolean);
    return TS.shell('Mix', '<p class="ts-note tx-say" role="status">' + (counts.length ? 'No section yet: ' + counts.join(', ') + '.' : 'Every service has a section in this draft.') + ' Tap a section to change it.</p>' +
      '<ul class="tx-grid tx-n' + TS.services.length + '" aria-label="Sections on ' + TS.date + '">' + head() + TS.people.map(row).join('') + '</ul>');
  }
  TS.mount(draw);
  document.getElementById('ts').addEventListener('click', function (e) {
    var b = e.target.closest('[data-a="pick"]'); if (!b) return;
    var pid = b.getAttribute('data-id'), sh = b.getAttribute('data-sh'), p = person(pid), s = TS.svc(sh), cur = TS.on[pid][sh];
    // offer the person's section on the service before this one, first and in words; never applied by itself
    var prev = TS.works(pid).filter(function (o) { return o.from < s.from && TS.on[pid][o.id]; }).pop();
    var opts = TS.secOpts(p.chef);
    if (prev && TS.on[pid][prev.id] !== cur) opts = [[TS.on[pid][prev.id], 'Same as ' + prev.name + ': ' + TS.sec(TS.on[pid][prev.id])]].concat(opts);
    TS.pick('Section for ' + p.name + ' on ' + s.name, opts, cur, function (v) { TS.set(pid, sh, v); });
  });
})();
