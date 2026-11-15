/* B, With Save (one line for the whole draft). The Save dock, which stays on screen while the chef edits, carries one
   line about the draft: the first short time in words, how many short times in all, and who is away then. It shows only
   when the draft is short or cannot be counted; nothing when the draft keeps to the need. The board, the grid and the
   break details are unchanged. The minimum is its own Admin, Kitchen row: any number of busy times, every day. */
(function () {
  var TM = window.TM, D = TM.D;
  function line() {
    if (!TM.mins.length) return '';
    if (TM.state !== 'ready') return '<p class="tb-line tm-unknown" role="status">Minimum not checked: the saved plan is not ready.</p>';
    var sp = TM.spells('draft'); if (!sp.length) return '';
    var s = sp[0];
    return '<p class="tb-line" role="status"><b class="tm-short">' + (TM.dirty() ? 'Draft' : 'Saved plan') + ': short ' + D.hhmm(s.from) + ' to ' + D.hhmm(s.to) + '.</b> ' + TM.howMany(s) + ' on ' + TM.svcAt(s.from) + ' and not on break, need ' + s.w.n + '. Away: ' + s.awayNames.join(', ') + '.' + (sp.length > 1 ? ' And ' + (sp.length - 1) + ' more short time' + (sp.length > 2 ? 's' : '') + '.' : '') + '</p>';
  }
  function kitchen() {
    var rows = TM.mins.map(function (w) {
      return '<li class="tb-win"><input type="text" value="' + w.name + '" aria-label="Name, like Dinner rush"><div class="tb-winline">' + TM.timeBtn(w.from, 'From, ' + w.name) + '<span>to</span>' + TM.timeBtn(w.to, 'To, ' + w.name) + '<span>need</span><span class="ta-step"><button type="button" class="ts-btn" data-a="noop" aria-label="One fewer">−</button><b>' + w.n + '</b><button type="button" class="ts-btn" data-a="noop" aria-label="One more">+</button></span></div><button type="button" class="ts-link" data-a="noop">Remove ' + w.name + '</button></li>';
    }).join('');
    return '<p class="ts-note">How many people Today\'s team needs on the plan and not on a break at the busy times. When a plan leaves fewer, the Save bar says when and who is away. It never stops a Save.</p><ul class="tb-wins">' + rows + '</ul>' +
      '<p><button type="button" class="ts-btn" data-a="noop">Add a busy time</button></p><p class="ts-note">Counts everyone on a shift and not on a break, for the whole shift: the book has no personal start and finish times.</p><div class="tk-save"><button type="button" class="ts-btn" data-a="noop" disabled>Save changes</button></div>';
  }
  function draw() {
    if (TM.q.get('page') === 'kitchen') return TM.kitchen('Minimum on the plan', TM.mins.length ? TM.mins.map(function (w) { return w.name + ' ' + D.hhmm(w.from) + ' to ' + D.hhmm(w.to) + ': ' + w.n; }).join(', ') : 'None', kitchen);
    return TM.shell(TM.grid(), line);
  }
  TM.mount(draw);
})();
