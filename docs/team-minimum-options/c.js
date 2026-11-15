/* C, At a glance where people already look (now on the board, the plan in the service heads). The charcoal On break
   now board adds one line from the saved plan: how many are on the service and not on a break now, and the need now.
   Each service head in the grid says its busy time and need from the draft, or the short time in words. A person whose
   break falls in a short time has "short then" beside their break time. The minimum row is the same as B's. */
(function () {
  var TM = window.TM, D = TM.D;
  function boardLine() {
    if (!TM.mins.length) return '';
    if (TM.state !== 'ready') return '<p class="tc-now tm-bwarn">Count now: not known until the saved plan is checked.</p>';
    var n = TM.C.minAt(TM.mins, TM.clock); if (n == null) return '';
    var c = TM.C.inAt(TM.savedPlan(), TM.clock), sv = TM.svcAt(TM.clock), short = c.inn.length < n;
    return '<p class="tc-now' + (short ? ' is-short' : '') + '"><b>' + (short ? 'SHORT NOW · ' : 'NOW · ') + c.inn.length + ' on ' + sv + '</b> and not on break. Need ' + n + '.</p>';
  }
  function head(s) {
    if (!TM.mins.length) return '<small class="tx-count">All have one</small>';
    if (TM.state !== 'ready') return '<small class="tx-count tm-unknown">Need: not checked yet</small>';
    var ws = TM.mins.filter(function (w) { return w.from < s.to && s.from < w.to; });
    if (!ws.length) return '<small class="tx-count">No busy time</small>';
    var sp = TM.spells('draft').filter(function (x) { return x.from < s.to && s.from < x.to; });
    if (sp.length) return sp.map(function (x) { return '<small class="tx-count tm-short">Short ' + D.hhmm(x.from) + ' to ' + D.hhmm(x.to) + ': ' + TM.howMany(x) + ' of ' + x.w.n + '</small>'; }).join('');
    return ws.map(function (w) { return '<small class="tx-count">Need ' + w.n + ', ' + D.hhmm(w.from) + ' to ' + D.hhmm(w.to) + '</small>'; }).join('');
  }
  function rowTag(p) {
    if (TM.state !== 'ready' || !TM.mins.length) return '';
    var sp = TM.spells('draft'), hit = TM.breaksOf(p.id).some(function (b) { return sp.some(function (x) { return b.at < x.to && x.from < b.at + b.len; }); });
    return hit ? ' <em class="tc-tag">short then</em>' : '';
  }
  function draw() {
    if (TM.q.get('page') === 'kitchen') return TM.kitchen('Minimum on the plan', TM.mins.length ? TM.mins.map(function (w) { return w.name + ' ' + D.hhmm(w.from) + ' to ' + D.hhmm(w.to) + ': ' + w.n; }).join(', ') : 'None', function () {
      var rows = TM.mins.map(function (w) {
        return '<li class="tb-win"><input type="text" value="' + w.name + '" aria-label="Name, like Dinner rush"><div class="tb-winline">' + TM.timeBtn(w.from, 'From, ' + w.name) + '<span>to</span>' + TM.timeBtn(w.to, 'To, ' + w.name) + '<span>need</span><span class="ta-step"><button type="button" class="ts-btn" data-a="noop" aria-label="One fewer">−</button><b>' + w.n + '</b><button type="button" class="ts-btn" data-a="noop" aria-label="One more">+</button></span></div><button type="button" class="ts-link" data-a="noop">Remove ' + w.name + '</button></li>';
      }).join('');
      return '<p class="ts-note">How many people Today\'s team needs on the plan and not on a break at the busy times. The service heads in Today\'s team show them, and the On break now board says how many are on now. It never stops a Save.</p><ul class="tb-wins">' + rows + '</ul>' +
        '<p><button type="button" class="ts-btn" data-a="noop">Add a busy time</button></p><p class="ts-note">Counts everyone on a shift and not on a break, for the whole shift: the book has no personal start and finish times.</p><div class="tk-save"><button type="button" class="ts-btn" data-a="noop" disabled>Save changes</button></div>';
    });
    // the grid head is aria-hidden in the app: its words are repeated once for screen readers
    var sp = TM.state === 'ready' && TM.mins.length ? TM.spells('draft') : [];
    var sr = '<p class="visually-hidden" role="status">' + (sp.length ? sp.map(function (x) { return TM.spellWords(x, TM.svcAt(x.from)); }).join(' ') : '') + '</p>';
    return TM.shell(sr + TM.grid(rowTag, head), null, boardLine);
  }
  TM.mount(draw);
})();
