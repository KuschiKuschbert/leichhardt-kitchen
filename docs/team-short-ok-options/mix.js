/* The mix for docs/team-short-ok-options/brief.md, drawn over the page snapshot (pv.js loads it with data-design="m"):
   A's band in the Save dock, fact first, with Accept going into the plan for the existing Save; C's jump to the breaks
   as a 44 px link on the same row as Accept, the fix first; B's real times in each person's mark. Its own small model,
   so an unsaved edit, a waiting acceptance and Undo stay separate (follow-up repairs, 16 Nov 2026). Never loaded by the
   book. Synthetic data only. */
(function () {
  var BR = { sam: [1110, 1140], dev: [1095, 1125], fen: [1095, 1140], hal: [1110, 1140], eli: [1110, 1140] };
  // the made-up day at 18:30: the saved plan, the plan after moving Sam K's break to 19:00 (still short), and worse
  var SP = {
    short: { low: 4, n: 6, from: 1110, to: 1140, when: 'now until 19:00', away: ['sam', 'dev', 'fen', 'hal'] },
    edit: { low: 5, n: 6, from: 1110, to: 1125, when: 'now until 18:45', away: ['dev', 'fen', 'hal'] },
    worse: { low: 3, n: 6, from: 1110, to: 1140, when: 'now until 19:00', away: ['sam', 'dev', 'fen', 'hal', 'eli'] }
  };
  var hh = function (m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var ME = 'Gus';   // set in init: pv.js's own tag (with the role) comes after this file
  // M: the saved plan (base), what is unsaved (edit, pend, unacc) and the Save's state (saving, fail)
  var M = null, jumpId = '';
  function init(s) {
    var tag = document.querySelector('script[data-design="m"]'); ME = tag && tag.getAttribute('data-role') === 'team' ? 'Sam K' : 'Gus';
    M = { base: 'short', edit: false, pend: null, unacc: false, acc: null, saving: false, fail: false, savedAt: 'Saved 13:00 · Gus' };
    if (s === 'edit') M.edit = true;
    if (s === 'accept') M.pend = SP.short;
    if (s === 'fail') { M.pend = SP.short; M.fail = true; }
    if (s === 'accepted' || s === 'unaccept') { M.acc = { sp: SP.short, by: 'Gus', at: '14:05' }; M.savedAt = 'Saved 14:05 · Gus'; M.unacc = s === 'unaccept'; }
    if (s === 'worse') { M.base = 'worse'; M.savedAt = 'Saved 18:10 · Sam K'; }
    if (s === 'fixed') M.base = 'fixed';
    jumpId = '';
  }
  function dirty() { return M.edit || !!M.pend || M.unacc; }
  function cur() { return M.base === 'fixed' ? null : M.edit || M.base === 'saved-edit' ? SP.edit : M.base === 'worse' ? SP.worse : SP.short; }
  function name(id) { var e = document.querySelector('.tm-tlrow[data-id="' + id + '"] .tm-person-name'); return e ? e.textContent : id; }
  function stateName() { return M.saving ? 'saving' : M.fail ? 'fail' : M.pend ? 'accept' : M.unacc ? 'unaccept' : M.acc && !M.edit ? (M.acc.at === '18:31' ? 'acceptedLive' : 'accepted') : M.edit ? 'edit' : M.base; }
  function draw() {
    var dock = document.querySelector('.tm-focus-save'), s = cur(), band = '', show = s ? s.away : [], grey = false;
    if (!s) band = '';
    else if (M.acc && !M.unacc && !M.edit && !M.pend) {
      band = '<div class="pv-quiet pv-mquiet" role="status"><p><b>' + esc('Accepted until ' + hh(M.acc.sp.to) + ' today:') + '</b> ' + esc(M.acc.sp.low + ' on, ' + M.acc.sp.n + ' needed. By ' + M.acc.by + ' at ' + M.acc.at + '.') + '</p><button type="button" class="p-link pv-mlink pv-mundo">Undo</button></div>';
      grey = true; show = M.acc.sp.away;
    } else if (M.pend) {
      band = '<div class="pv-band pv-mband is-pending" role="status"><p class="pv-fact">' + esc('Not saved yet: ' + M.pend.low + ' on, ' + M.pend.n + ' needed, accepted until ' + hh(M.pend.to)) + '</p>' +
        '<div class="pv-mrow"><span class="pv-more">Tap Save to share it with the chefs.</span><button type="button" class="p-link pv-mlink pv-undo">Undo</button></div></div>';
      show = M.pend.away;
    } else {
      var ids = s.away, at = jumpId ? ids.indexOf(jumpId) : -1, next = ids[(at + 1) % ids.length];
      var link = '<button type="button" class="p-link pv-mlink pv-jump" data-id="' + esc(next) + '">' + esc((at < 0 ? 'Go to ' : 'Next: ') + name(next) + '’s break' + (at < 0 ? '' : ' (' + (ids.indexOf(next) + 1) + ' of ' + ids.length + ')')) + '</button>';
      var why = M.unacc ? 'Acceptance undone.' : M.base === 'worse' ? 'At 14:05 Gus accepted 4 on. Sam K’s save at 18:10 left 3 on.' : '';
      // "Not saved yet." leads only while something is unsaved; a saved plan says nothing extra (Save is off, the head says Saved)
      band = '<div class="pv-band pv-mband" role="status"><p class="pv-fact">' + (dirty() ? 'Not saved yet. ' : '') + '<span class="pv-tf">Too few</span> ' + esc(s.when + ': ' + s.low + ' on, ' + s.n + ' needed') + '</p>' +
        (why ? '<p class="pv-more">' + esc(why) + '</p>' : '') +
        '<div class="pv-mrow">' + link + '<button type="button" class="pv-accept" data-low="' + s.low + '" data-from="' + s.from + '" data-to="' + s.to + '" aria-label="' + esc('Accept ' + s.low + ' on, ' + s.n + ' needed, on Dinner ' + s.when + ', for today') + '">Accept ' + s.low + ' on</button></div></div>';
    }
    var save = '<button type="button" class="btn dark ink-busy-button sv-btn pv-save" data-p="tm-save"' + (!dirty() || M.saving ? ' disabled' : '') + '><span class="sv-now">' + esc(M.saving ? 'Saving...' : M.fail ? 'Try again' : 'Save Monday 16 November') + '</span></button>';
    var line = M.fail ? '<span class="sv-line bad" role="alert" style="color:var(--bad-ink)">Not saved for Monday 16 November. The plan and the acceptance are still here. Check the signal, then try again.</span>' : '<span class="sv-line" role="status"></span>';
    // the band says Not saved yet or Accepted itself, so the dock's own status words step aside while it shows
    dock.innerHTML = (band ? '' : '<p class="tm-save-state" role="status">' + esc(dirty() ? 'Not saved yet' : M.savedAt) + '</p>') + band + save + line;
    var head = document.querySelector('.tm-draftstate'); if (head) { head.classList.toggle('is-dirty', dirty()); head.textContent = dirty() ? 'Not saved yet' : M.savedAt; }
    var samMoved = M.edit || M.base === 'saved-edit' || M.pend === SP.edit;
    document.querySelectorAll('.tm-short-mark').forEach(function (e) {
      var id = e.dataset.id, on = show.indexOf(id) >= 0, b = id === 'sam' && samMoved ? [1140, 1170] : BR[id];
      e.hidden = !on; e.classList.toggle('pv-muted', grey);
      if (b) e.textContent = 'Break ' + hh(b[0]) + ' to ' + hh(b[1]) + (grey ? ' (too few, accepted)' : ', too few then');
    });
  }
  window.PV_MIX = function (c) {
    if (!M) {
      init(c.st);
      window.PV = { go: function (s) { init(s); draw(); }, get state() { return stateName(); } };
    }
    draw();
  };
  window.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t || !M) return;
    if (!['pv-accept', 'pv-undo', 'pv-mundo', 'pv-save', 'pv-jump'].some(function (k) { return t.classList.contains(k); })) return;
    e.stopPropagation(); e.preventDefault();
    if (t.classList.contains('pv-accept')) {
      // the acceptance is the short time on the button that was tapped, never a later one
      M.pend = [SP.short, SP.edit, SP.worse].filter(function (x) { return x.low === +t.dataset.low && x.from === +t.dataset.from && x.to === +t.dataset.to; })[0];
      M.unacc = false; M.fail = false;
    } else if (t.classList.contains('pv-undo')) { M.pend = null; M.fail = false; }
    else if (t.classList.contains('pv-mundo')) { M.unacc = true; }
    else if (t.classList.contains('pv-save')) {
      if (t.disabled) return;
      M.saving = true; draw();
      setTimeout(function () {
        M.saving = false; M.fail = false;
        if (M.pend) { M.acc = { sp: M.pend, by: ME, at: '18:31' }; M.pend = null; }
        if (M.unacc) { M.acc = null; M.unacc = false; }
        if (M.edit) { M.base = 'saved-edit'; M.edit = false; }
        M.savedAt = 'Saved 18:31 · ' + ME; jumpId = ''; draw();
      }, 900);
      return;
    } else if (t.classList.contains('pv-jump')) {
      jumpId = t.dataset.id;
      document.querySelectorAll('.pv-here').forEach(function (r) { r.classList.remove('pv-here'); });
      var row = document.querySelector('.tm-tlrow[data-id="' + jumpId + '"]');
      if (row) {
        row.classList.add('pv-here');
        var top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tm-grid-top')) || 0, h = document.querySelector('.tm-planhead').getBoundingClientRect().height;
        window.scrollTo({ top: row.getBoundingClientRect().top + scrollY - top - h - 8, behavior: 'instant' });
      }
    }
    draw();
  }, true);
  // the preview's own "edit": a button the verify script uses to move Sam K's break (stands in for the break picker)
  window.PV_EDIT = function () { M.edit = true; M.pend = null; draw(); };
})();
