/* A, Where the break is set (changes the least). The warning lives only inside a person's Breaks details, under their
   break times, at the moment a break is chosen or moved. It names the short time, how many are on the service and
   not on a break, the need and who else is away, and says Draft. Nothing new on the grid, the board or the Save dock.
   The minimum is set beside each service in Admin, Kitchen, Shifts: a busy time and how many it needs. */
(function () {
  var TM = window.TM, D = TM.D;
  function benchWarn(p, s) {
    if (TM.state !== 'ready') return '<p class="ta-warn tm-unknown" role="status">Can\'t check the minimum yet: the saved plan is not ready.</p>';
    if (!TM.mins.length) return '<p class="ta-warn ts-note">No minimum set for ' + s.name + '. The head chef sets it in Admin, Kitchen, Shifts.</p>';
    var mine = TM.breaksOf(p.id), spells = TM.spells('draft');
    // the short times this person's breaks fall in
    var hit = spells.filter(function (sp) { return mine.some(function (b) { return b.at < sp.to && sp.from < b.at + b.len; }); });
    if (hit.length) return hit.map(function (sp) {
      var others = sp.awayNames.filter(function (n) { return n !== p.name; });
      return '<div class="ta-warn" role="status"><p class="tm-short">Short while ' + p.name + ' is away</p><p>' + TM.spellWords(sp, TM.svcAt(sp.from)) + '</p>' +
        '<p class="ts-note">Also away then: ' + (others.join(', ') || 'nobody') + '. ' + (TM.dirty() ? 'Draft, not saved.' : 'Saved plan.') + '</p></div>';
    }).join('');
    var w = TM.mins.filter(function (m) { return mine.some(function (b) { return b.at < m.to && m.from < b.at + b.len; }); })[0];
    return '<p class="ta-warn ts-note" role="status">' + (w ? p.name + '\'s break is in the ' + w.name.toLowerCase() + ' (' + D.hhmm(w.from) + ' to ' + D.hhmm(w.to) + ', need ' + w.n + '). ' + (TM.dirty() ? 'This draft keeps ' : 'The saved plan keeps ') + w.n + ' or more on the plan then.' : 'No break in a busy time.') + ' ' + (TM.dirty() ? 'Draft, not saved.' : '') + '</p>';
  }
  TM.benchHTML = function () { return TM.bench(benchWarn); };
  function kitchen() {
    var rows = D.services.map(function (s, i) {
      var m = TM.mins.filter(function (x) { return x.from >= s.from && x.from < s.to; })[0] || {};
      return '<li class="ta-sh"><div class="ta-shline"><input type="text" value="' + s.name + '" aria-label="Shift name">' + TM.timeBtn(s.from, 'From, ' + s.name) + '' + TM.timeBtn(s.to, 'To, ' + s.name) + '</div>' +
        '<div class="ta-busy"><span>Busy</span>' + TM.timeBtn(m.from, 'Busy from, ' + s.name) + '<span>to</span>' + TM.timeBtn(m.to, 'Busy to, ' + s.name) + '<span>need</span><span class="ta-step"><button type="button" class="ts-btn" data-a="noop" aria-label="One fewer">−</button><b>' + (m.n || '–') + '</b><button type="button" class="ts-btn" data-a="noop" aria-label="One more">+</button></span></div></li>';
    }).join('');
    return '<p class="ts-note">The kinds of shift the chefs put people on in Today\'s team. <b>Busy</b> is optional: Today\'s team then says in a person\'s break details when their break leaves fewer than the need on that shift and not on a break.</p><ul class="ta-shlist">' + rows + '</ul>' +
      '<p class="ts-note">Counts everyone on the shift and not on a break, for the whole shift: the book has no personal start and finish times.</p><div class="tk-save"><button type="button" class="ts-btn" data-a="noop" disabled>Save changes</button></div>';
  }
  function draw() {
    if (TM.q.get('page') === 'kitchen') return TM.kitchen('Shifts', 'Lunch 10:00 to 15:00 (busy 12:00 to 14:00, need 3), Dinner 15:00 to 21:00 (busy 17:30 to 20:30, need 6)', kitchen, 'shifts');
    return TM.shell(TM.grid());
  }
  TM.mount(draw);
})();
