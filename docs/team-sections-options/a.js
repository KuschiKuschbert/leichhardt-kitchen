/* A, Section on the row (changes the least). Service to edit goes; each person's row has one labelled Section picker
   for every service they work, with the service hours. The first choice on a person also fills their other services
   that are still No section (the rule tmAddShift() already uses), tagged SAME and said in words. Breaks keep the one
   named details panel, which now has its own service chips. */
(function () {
  var TS = window.TS, filled = {}, said = {};
  function hours(p) {
    var w = TS.works(p.id); if (!w.length) return '';
    return w.map(function (s) { return s.name; }).join(', ') + ' · ' + TS.hhmm(w[0].from) + ' to ' + TS.hhmm(w[w.length - 1].to);
  }
  function row(p) {
    var w = TS.works(p.id), f = filled[p.id] || {};
    var picks = w.map(function (s) {
      var cur = TS.on[p.id][s.id];
      return '<label class="ts-pick"><span>' + s.short + (f[s.id] ? '<b class="ts-tag">SAME</b>' : '') + '</span><button type="button" data-a="pick" data-id="' + p.id + '" data-sh="' + s.id + '" data-focus="a:' + p.id + ':' + s.id + '" class="' + (cur ? '' : 'is-empty') + '" aria-label="Section for ' + p.name + ' on ' + s.name + ': ' + (TS.sec(cur) || 'No section') + '"' + (TS.busy() ? ' disabled' : '') + '>' + (TS.sec(cur) || 'No section') + '</button></label>';
    }).join('');
    var open = TS.focus && TS.focus.pid === p.id;
    return '<li class="ta-row" data-id="' + p.id + '"><div class="ta-head"><div><span class="ts-name">' + p.name + '</span><span class="ts-hours">' + hours(p) + ' · Break not set</span></div>' +
      '<button type="button" class="ts-btn" data-a="bench-open" data-id="' + p.id + '" aria-expanded="' + open + '" aria-label="Edit breaks for ' + p.name + '">Edit breaks</button></div>' +
      '<div class="ta-picks ta-n' + w.length + '">' + picks + '</div>' + (said[p.id] ? '<p class="ts-note" role="status">' + said[p.id] + '</p>' : '') + (open ? TS.bench() : '') + '</li>';
  }
  function draw() {
    return TS.shell('A', '<ul class="ta-list" aria-label="Staff on ' + TS.date + '">' + TS.people.map(row).join('') + '</ul>');
  }
  TS.mount(draw);
  document.getElementById('ts').addEventListener('click', function (e) {
    var b = e.target.closest('[data-a="pick"]'); if (!b) return;
    var pid = b.getAttribute('data-id'), sh = b.getAttribute('data-sh'), p = TS.people.filter(function (x) { return x.id === pid; })[0], s = TS.svc(sh);
    TS.pick('Section for ' + p.name + ' on ' + s.name, TS.secOpts(), TS.on[pid][sh], function (v) {
      // The choice is bound to this person, date and service. It fills only this person's services still on No section.
      TS.set(pid, sh, v); (filled[pid] = filled[pid] || {})[sh] = false;
      var also = [];
      if (v) TS.works(pid).forEach(function (o) { if (o.id !== sh && !TS.on[pid][o.id]) { TS.set(pid, o.id, v); filled[pid][o.id] = true; also.push(o.name); } });
      said[pid] = also.length ? 'Also set ' + also.join(' and ') + ' to ' + TS.sec(v) + '. Change ' + (also.length > 1 ? 'either' : 'it') + ' on its own picker.' : '';
    });
  });
})();
