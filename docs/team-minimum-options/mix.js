/* The combined preview (the lean mix the council's round 2 pointed to): B's one line in the Save dock, cut short (no
   names, "Draft" or "Saved plan" first, only when short or not checked); C's mark on the Breaks button of each person
   away during the short time the line names, so the line says when and the rows say who; A's busy time and need on each service in
   Admin, Kitchen, Shifts, chosen with the book's pickers. Fixes from round 2 folded in: today counts from the kitchen
   clock on (a short time already over says nothing); a short roster is said as such, never blamed on a break; no
   all-clear line anywhere; the board and the grid heads are unchanged. */
(function () {
  var TM = window.TM, D = TM.D, C = TM.C;
  // Each busy time belongs to one shift and counts only that shift's people (follow-up: a Function shift over Dinner)
  function spells() { return TM.state === 'ready' && TM.mins.length ? C.spells(TM.plan(), TM.mins, { from: TM.clock, byShift: true }) : []; }
  function svcName(s) { var x = s.w.sh && TM.svc(s.w.sh); return x ? x.name : TM.svcAt(s.from); }
  // the counts in words: "4 now, 5 from 18:45"; more than two steps say the lowest and when; a short roster says so
  function counts(s, svc) {
    var n = s.w.n, at = function (x) { return x.at <= TM.clock ? 'now' : 'from ' + D.hhmm(x.at); };
    var lowest = s.steps.reduce(function (a, b) { return b.n < a.n ? b : a; });
    if (s.roster < n) return 'Only ' + s.roster + ' on ' + svc + (s.low < s.roster ? ' (' + s.low + ' ' + at(lowest) + ' with breaks)' : '') + ', ' + n + ' needed. Add people or move a marked break.';
    return (s.steps.length <= 2 ? s.steps.map(function (x) { return x.n + ' ' + at(x); }).join(', ') : 'As few as ' + lowest.n + ' ' + at(lowest)) + ', ' + n + ' needed. Move a marked break.';
  }
  function line() {
    if (!TM.mins.length) return '';
    if (TM.state !== 'ready') return '<p class="tb-line tm-unknown" role="status">Loading the saved plan. Busy times are checked after.</p>';
    var sp = spells(); if (!sp.length) return '';
    var s = sp[0], svc = svcName(s), label = TM.dirty() ? 'Unsaved plan' : 'Saved plan';
    var when = s.from <= TM.clock ? 'now until ' + D.hhmm(s.to) : D.hhmm(s.from) + ' to ' + D.hhmm(s.to);
    // the shift is named only when another shift has a busy time at the same time (two lines on a 390 px phone)
    var named = TM.mins.some(function (w) { return w !== s.w && w.from < s.to && s.from < w.to; }) ? ' on ' + svc : '';
    return '<p class="tb-line" role="status"><b class="tm-short">' + label + ': too few' + named + ' ' + when + '.</b> ' + counts(s, svc) +
      (sp[1] ? ' Next: ' + D.hhmm(sp[1].from) + ' to ' + D.hhmm(sp[1].to) + '.' : '') + '</p>';
  }
  // Only the people away in the short time the line names are marked. While a Breaks panel is open the marks hold
  // still (a row must not shrink under a thumb); they catch up on Close details or Save. The line stays live.
  var held = null;
  function current() { var s = spells()[0]; return s ? s.awayIds : []; }
  function marks() { if (TM.focus) { if (!held) held = current(); return held; } held = null; return current(); }
  function rowTag(p) { return marks().indexOf(p.id) >= 0 ? '<em class="tx-tag">break when too few</em>' : ''; }
  function kitchen() {
    var pick = function (label, words) { return '<span class="ts-pick tk-time"><button type="button" data-a="noop" aria-label="' + label + ': ' + words + '">' + words + '</button></span>'; };
    var rows = D.services.map(function (s) {
      var m = TM.mins.filter(function (x) { return x.sh === s.id; })[0] || {};
      return '<li class="ta-sh"><div class="ta-shline"><input type="text" value="' + s.name + '" aria-label="Shift name">' + TM.timeBtn(s.from, 'From, ' + s.name) + TM.timeBtn(s.to, 'To, ' + s.name) + '</div>' +
        '<div class="ta-busy"><span>Busy time</span>' + TM.timeBtn(m.from, 'Busy time from, ' + s.name) + '<span>to</span>' + TM.timeBtn(m.to, 'Busy time to, ' + s.name) + '</div>' +
        '<div class="ta-busy"><span>People needed then</span>' + pick('People needed on ' + s.name + ' in the busy time', m.n ? String(m.n) : 'Not set') + '</div></li>';
    }).join('');
    return '<p class="ts-note">The kinds of shift the chefs put people on in Today\'s team. <b>Busy time</b> is optional. When a plan leaves fewer people on that shift and not on a break than needed, the Save bar in Today\'s team says when, and marks whose break it is. It never stops a Save.</p><ul class="ta-shlist">' + rows + '</ul>' +
      '<p class="ts-note">Counts everyone on the shift and not on a break, for the whole shift: the book has no personal start and finish times.</p><div class="tk-save"><button type="button" class="ts-btn" data-a="noop" disabled>Save changes</button></div>';
  }
  function draw() {
    if (TM.q.get('page') === 'kitchen') return TM.kitchen('Shifts', 'Lunch 10:00 to 15:00 (busy 12:00 to 14:00, 3 needed), Dinner 15:00 to 21:00 (busy 17:30 to 20:30, 6 needed)', kitchen, 'shifts');
    return TM.shell(TM.grid(rowTag), line);
  }
  TM.mount(draw);
})();
