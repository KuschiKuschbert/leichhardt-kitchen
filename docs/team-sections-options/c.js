/* C, One pass (removes the most taps). Rows become short read-outs ("Lunch Grill · Dinner no section yet"). Set
   sections opens one sheet that steps through every person and service still without a section, one tap each, in the
   shared picker frame's look; it never closes between choices. Later services offer "Same as Lunch: Grill" first. A
   row's Change does the same for that one person. Back steps back; Close keeps what was chosen. Nothing saves until Save. */
(function () {
  var TS = window.TS, pass = null, done = '';
  function cells(onlyPid, unsetOnly) {
    var out = [];
    TS.people.forEach(function (p) { if (onlyPid && p.id !== onlyPid) return; TS.works(p.id).forEach(function (s) { if (!unsetOnly || !TS.on[p.id][s.id]) out.push({ pid: p.id, sh: s.id }); }); });
    return out;
  }
  function person(pid) { return TS.people.filter(function (x) { return x.id === pid; })[0]; }
  function summary(p) {
    return TS.works(p.id).map(function (s) { var v = TS.sec(TS.on[p.id][s.id]); return '<span class="' + (v ? '' : 'tc-none') + '"><small>' + s.short + '</small> ' + (v ? '<b>' + v + '</b>' : 'No section yet') + '</span>'; }).join('');
  }
  function row(p) {
    var w = TS.works(p.id), open = TS.focus && TS.focus.pid === p.id;
    return '<li class="tc-row"><div class="tc-line"><span class="ts-name">' + p.name + '</span><span class="ts-hours">' + TS.hhmm(w[0].from) + ' to ' + TS.hhmm(w[w.length - 1].to) + '</span></div>' +
      '<p class="tc-secs">' + summary(p) + '</p><div class="tc-acts"><button type="button" class="ts-btn" data-a="change" data-id="' + p.id + '" aria-label="Change sections for ' + p.name + '"' + (TS.busy() ? ' disabled' : '') + '>Sections</button><button type="button" class="ts-btn" data-a="bench-open" data-id="' + p.id + '" aria-expanded="' + open + '">Breaks</button></div>' + (open ? TS.bench() : '') + '</li>';
  }
  function draw() {
    var left = cells(null, true).length;
    if (done && !TS.dirty()) done = '';   // once saved, the pass's "Not saved yet" words go
    return TS.shell('C', '<div class="tc-start"><button type="button" class="ts-btn tc-go" data-a="go"' + (!left || TS.busy() ? ' disabled' : '') + '>' + (left ? 'Set sections: ' + left + ' to set' : 'Every service has a section') + '</button>' +
      (done ? '<p class="ts-note" role="status">' + done + '</p>' : '') + '</div><ul class="tc-list" aria-label="Staff on ' + TS.date + '">' + TS.people.map(row).join('') + '</ul>') + sheet();
  }
  function sheet() {
    if (!pass) return '';
    var c = pass.list[pass.i], p = person(c.pid), s = TS.svc(c.sh), cur = TS.on[c.pid][c.sh];
    var prev = TS.works(c.pid).filter(function (o) { return o.from < s.from && TS.on[c.pid][o.id]; }).pop();
    var opts = (prev ? [[TS.on[c.pid][prev.id], 'Same as ' + prev.name + ': ' + TS.sec(TS.on[c.pid][prev.id]), 'same']] : []).concat(TS.sections.map(function (x) { return [x.id, x.name]; })).concat([['', 'Leave no section']]);
    return '<div class="ts-sheet-back tc-back"><div class="ts-sheet tc-sheet" role="dialog" aria-modal="true" aria-label="Set sections"><header><p class="tc-step">' + (pass.i + 1) + ' of ' + pass.list.length + '</p><h3>' + p.name + ' · ' + s.name + '</h3><p class="ts-hours">' + TS.hhmm(s.from) + ' to ' + TS.hhmm(s.to) + ' · now ' + (TS.sec(cur) || 'no section') + '</p></header>' +
      '<div class="tc-opts">' + opts.map(function (o, i) { return '<button type="button" data-a="opt" data-i="' + i + '" class="' + (o[2] ? 'tc-same' : '') + '" aria-selected="' + (!o[2] && String(o[0]) === String(cur)) + '">' + o[1] + '</button>'; }).join('') + '</div>' +
      '<footer><button type="button" class="ts-btn" data-a="back"' + (pass.i ? '' : ' disabled') + '>Back</button><button type="button" class="ts-btn" data-a="close">Close</button></footer></div></div>';
  }
  TS.mount(draw);
  function finish() {
    var set = pass.set, left = cells(null, true).length; pass = null;
    done = 'Set ' + set + (set === 1 ? ' section' : ' sections') + '. ' + (left ? left + ' still no section.' : 'Everyone has a section.') + ' Not saved yet.';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b) return;
    var a = b.getAttribute('data-a');
    if (a === 'go') { var l = cells(null, true); if (l.length) { pass = { list: l, i: 0, set: 0 }; done = ''; } TS.redraw(); focusSheet(); }
    else if (a === 'change') { pass = { list: cells(b.getAttribute('data-id'), false), i: 0, set: 0 }; done = ''; TS.redraw(); focusSheet(); }
    else if (a === 'opt' && pass) {
      var c = pass.list[pass.i], s = TS.svc(c.sh), prev = TS.works(c.pid).filter(function (o) { return o.from < s.from && TS.on[c.pid][o.id]; }).pop();
      var opts = (prev ? [TS.on[c.pid][prev.id]] : []).concat(TS.sections.map(function (x) { return x.id; })).concat(['']);
      // bound to the person and service named in the sheet's heading, captured when the step was drawn
      TS.set(c.pid, c.sh, opts[+b.getAttribute('data-i')]); pass.set++;
      if (++pass.i >= pass.list.length) finish();
      TS.redraw(); focusSheet();
    } else if (a === 'back' && pass && pass.i) { pass.i--; TS.redraw(); focusSheet(); }
    else if (a === 'close' && pass) { finish(); TS.redraw(); var g = document.querySelector('[data-a="go"]'); if (g) g.focus(); }
  });
  function focusSheet() { var f = document.querySelector('.tc-sheet .tc-opts button'); if (f) f.focus({ preventScroll: true }); }
})();
