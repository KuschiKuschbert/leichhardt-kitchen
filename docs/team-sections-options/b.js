/* B, The day as a grid (rethinks the layout). One table for the day: services across with their hours in the column
   head, people down, one Section picker in each cell the person works and "Off" where they do not. Each column says how
   many are on and how many still have no section. A name opens that person's break details. No automatic fill. */
(function () {
  var TS = window.TS;
  function cell(p, s) {
    var cur = TS.on[p.id][s.id];
    if (cur === undefined) return '<td class="tb-off">Off</td>';
    return '<td><button type="button" class="tb-cell' + (cur ? '' : ' is-empty') + '" data-a="pick" data-id="' + p.id + '" data-sh="' + s.id + '" data-focus="b:' + p.id + ':' + s.id + '" aria-label="Section for ' + p.name + ' on ' + s.name + ': ' + (TS.sec(cur) || 'No section') + '"' + (TS.busy() ? ' disabled' : '') + '>' + (TS.sec(cur) || 'No section') + '</button></td>';
  }
  function draw() {
    var sv = TS.services, n = sv.length;
    var head = '<thead><tr><th scope="col" class="tb-who">Who</th>' + sv.map(function (s) { return '<th scope="col">' + s.short + '<small>' + TS.hhmm(s.from) + ' to ' + TS.hhmm(s.to) + '</small></th>'; }).join('') + '</tr></thead>';
    var body = TS.people.map(function (p) {
      var open = TS.focus && TS.focus.pid === p.id;
      return '<tr><th scope="row" class="tb-who"><button type="button" class="tb-name" data-a="bench-open" data-id="' + p.id + '" aria-expanded="' + open + '" aria-label="' + p.name + ', break details">' + p.name + '</button></th>' + sv.map(function (s) { return cell(p, s); }).join('') + '</tr>' +
        (open ? '<tr class="tb-benchrow"><td colspan="' + (n + 1) + '">' + TS.bench() + '</td></tr>' : '');
    }).join('');
    var foot = '<tfoot><tr><th scope="row" class="tb-who">Still</th>' + sv.map(function (s) {
      var onS = TS.people.filter(function (p) { return TS.on[p.id][s.id] !== undefined; }), none = onS.filter(function (p) { return !TS.on[p.id][s.id]; }).length;
      return '<td>' + (none ? '<b class="tb-left">' + none + ' no section</b>' : '<span class="tb-ok">All set</span>') + '<small>' + onS.length + ' on</small></td>';
    }).join('') + '</tr></tfoot>';
    return TS.shell('B', '<p class="ts-note tb-help">Tap a section to change it. Tap a name for breaks.</p><div class="tb-wrap"><table class="tb-grid tb-n' + n + '" aria-label="Sections on ' + TS.date + '">' + head + '<tbody>' + body + '</tbody>' + foot + '</table></div>');
  }
  TS.mount(draw);
  document.getElementById('ts').addEventListener('click', function (e) {
    var b = e.target.closest('[data-a="pick"]'); if (!b) return;
    var pid = b.getAttribute('data-id'), sh = b.getAttribute('data-sh'), p = TS.people.filter(function (x) { return x.id === pid; })[0], s = TS.svc(sh);
    TS.pick('Section for ' + p.name + ' on ' + s.name, TS.secOpts(), TS.on[pid][sh], function (v) { TS.set(pid, sh, v); });
  });
})();
