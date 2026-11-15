/* The combined preview (the lean mix the council's round 2 pointed to): B's one line in the Save dock, cut short (no
   names, "Draft" or "Saved plan" first, only when short or not checked); C's mark on the Breaks button of each person
   away during a short time, so the line says when and the rows say who; A's busy time and need on each service in
   Admin, Kitchen, Shifts, chosen with the book's pickers. Fixes from round 2 folded in: today counts from the kitchen
   clock on (a short time already over says nothing); a short roster is said as such, never blamed on a break; no
   all-clear line anywhere; the board and the grid heads are unchanged. */
(function () {
  var TM = window.TM, D = TM.D, C = TM.C;
  function spells() { return TM.state === 'ready' && TM.mins.length ? C.spells(TM.plan(), TM.mins, { from: TM.clock }) : []; }
  function line() {
    if (!TM.mins.length) return '';
    if (TM.state !== 'ready') return '<p class="tb-line tm-unknown" role="status">Busy times not checked yet: the saved plan is not ready.</p>';
    var sp = spells(); if (!sp.length) return '';
    var s = sp[0], svc = TM.svcAt(s.from), n = s.w.n, label = TM.dirty() ? 'Draft' : 'Saved plan';
    var when = s.from <= TM.clock ? 'short now until ' + D.hhmm(s.to) : 'short ' + D.hhmm(s.from) + ' to ' + D.hhmm(s.to);
    var count;
    if (s.roster < n) count = 'Only ' + s.roster + ' on ' + svc + (s.awayIds.length ? ', fewer during breaks' : '') + '. Need ' + n + '.';
    else count = s.steps[0].n + ' on ' + svc + ' and not on a break' + s.steps.slice(1, 3).map(function (x) { return ', then ' + x.n + ' from ' + D.hhmm(x.at); }).join('') + '. Need ' + n + '.';
    return '<p class="tb-line" role="status"><b class="tm-short">' + label + ': ' + when + '.</b> ' + count + (sp.length > 1 ? ' ' + (sp.length - 1) + ' more short time later.' : '') + '</p>';
  }
  function rowTag(p) {
    var hit = spells().some(function (s) { return s.awayIds.indexOf(p.id) >= 0; });
    return hit ? '<em class="tx-tag">away when short</em>' : '';
  }
  function kitchen() {
    var pick = function (v, label, words) { return '<span class="ts-pick tk-time"><button type="button" data-a="noop" aria-label="' + label + ': ' + words + '">' + words + '</button></span>'; };
    var rows = D.services.map(function (s) {
      var m = TM.mins.filter(function (x) { return x.from >= s.from && x.from < s.to; })[0] || {};
      return '<li class="ta-sh"><div class="ta-shline"><input type="text" value="' + s.name + '" aria-label="Shift name">' + TM.timeBtn(s.from, 'From, ' + s.name) + TM.timeBtn(s.to, 'To, ' + s.name) + '</div>' +
        '<div class="ta-busy"><span>Busy time</span>' + TM.timeBtn(m.from, 'Busy time from, ' + s.name) + '<span>to</span>' + TM.timeBtn(m.to, 'Busy time to, ' + s.name) + '<span>need</span>' + pick(m.n, 'Need on ' + s.name, m.n ? String(m.n) : 'Not set') + '</div></li>';
    }).join('');
    return '<p class="ts-note">The kinds of shift the chefs put people on in Today\'s team. <b>Busy time</b> is optional: when a plan leaves fewer than the need on that shift and not on a break, the Save bar in Today\'s team says when, and each person away then is marked. It never stops a Save.</p><ul class="ta-shlist">' + rows + '</ul>' +
      '<p class="ts-note">Counts everyone on the shift and not on a break, for the whole shift: the book has no personal start and finish times.</p><div class="tk-save"><button type="button" class="ts-btn" data-a="noop" disabled>Save changes</button></div>';
  }
  function draw() {
    if (TM.q.get('page') === 'kitchen') return TM.kitchen('Shifts', 'Lunch 10:00 to 15:00 (busy time 12:00 to 14:00, need 3), Dinner 15:00 to 21:00 (busy time 17:30 to 20:30, need 6)', kitchen, 'shifts');
    return TM.shell(TM.grid(rowTag), line);
  }
  TM.mount(draw);
})();
