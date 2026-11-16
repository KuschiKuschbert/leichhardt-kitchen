/* Previews for docs/team-short-ok-options/brief.md: three designs (and the mix) drawn over a static snapshot of the real
   Today's team page (snap.cjs). Never loaded by the book, never connects to the kitchen. Synthetic data only.
   ?s=<state> picks a state: short, edit, accept, saving, accepted, worse, fail, fixed. Buttons move between them. */
(function () {
  var me = document.currentScript, D = me.getAttribute('data-design'), ROLE = me.getAttribute('data-role');
  var q = new URLSearchParams(location.search), st = q.get('s') || 'short';
  if (q.get('red') === '1') document.documentElement.classList.add('pv-red');
  var ME = ROLE === 'team' ? 'Sam K' : 'Gus', DATE = 'Monday 16 November';
  var LO = 600, HI = 1260, pc = function (m) { return Math.round((m - LO) / (HI - LO) * 1000) / 10; };
  // the study's made-up day at 18:30 (docs/team-minimum-options/data.js): Dinner busy time 17:30 to 20:30, 6 needed
  var S = {
    short: { when: 'now until 19:00', range: [1110, 1140], low: 4, n: 6, steps: '5 from 18:45', away: ['sam', 'dev', 'fen', 'hal'], dirty: false },
    edit: { when: 'now until 18:45', range: [1110, 1125], low: 5, n: 6, steps: '', away: ['dev', 'fen', 'hal'], dirty: true },
    worse: { when: 'now until 19:00', range: [1110, 1140], low: 3, n: 6, steps: '4 from 18:45', away: ['sam', 'dev', 'fen', 'hal', 'eli'], dirty: false }
  };
  var OK = { by: 'Gus', at: '14:05', low: 4, when: 'now until 19:00', range: [1110, 1140] };
  function cur() { return st === 'edit' ? S.edit : st === 'worse' ? S.worse : S.short; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var dock = document.querySelector('.tm-focus-save'), head = document.querySelector('.tm-planhead');
  var dirty = function () { return st === 'edit' || st === 'accept' || st === 'saving' || st === 'fail' || (st === 'acceptc'); };
  var accepted = function () { return st === 'accepted'; };

  function saveBtn(extra) {
    var busy = st === 'saving', fail = st === 'fail', off = !dirty() || busy;
    var label = busy ? 'Saving...' : fail ? 'Try again' : 'Save ' + DATE;
    return '<button type="button" class="btn dark ink-busy-button sv-btn pv-save" data-p="tm-save"' + (off ? ' disabled' : '') + (busy ? ' aria-busy="true"' : '') + '><span class="sv-now">' + esc(label) + '</span></button>' + (extra || '');
  }
  function svLine() {
    if (st === 'fail') return '<span class="sv-line bad" role="alert" style="color:var(--bad-ink)">Not saved for ' + DATE + '. Check the signal, then try again. Your changes are still here.</span>';
    if (st === 'accepted') return '<span class="sv-line saved" role="status"></span>';
    return '<span class="sv-line" role="status"></span>';
  }
  function stateWords() {
    if (st === 'accepted') return 'Saved 18:31 · ' + ME;
    if (st === 'fixed') return 'Saved 18:31 · ' + ME;
    return dirty() ? 'Not saved yet' : 'Saved 13:00 · Gus';
  }
  function fact(s) { return '<p class="pv-fact"><span class="pv-tf">Too few</span> ' + esc(s.when) + ': ' + s.low + ' of ' + s.n + '</p>'; }
  function more(s, tail) {
    var plan = s.dirty || st === 'accept' ? 'Unsaved plan.' : 'Saved plan.';
    return '<p class="pv-more">' + esc((plan + (s.steps ? ' ' + s.steps + '.' : '') + (tail ? ' ' + tail : '')).trim()) + '</p>';
  }
  function lapsed() { return st === 'worse' ? '<p class="pv-more">' + esc('Gus accepted ' + OK.low + ' of 6 at ' + OK.at + '. The plan changed since.') + '</p>' : ''; }
  function quiet(undo) {
    return '<p class="pv-quiet"><b>Accepted for today:</b> ' + esc(OK.low + ' of 6 on Dinner ' + OK.when + '. ' + OK.by + ', ' + OK.at + '.') + (undo ? ' <button type="button" class="p-link pv-undo">Undo</button>' : '') + '</p>';
  }
  function marks(show, muted, words) {
    document.querySelectorAll('.tm-short-mark').forEach(function (e) {
      var on = show.indexOf(e.dataset.id) >= 0; e.hidden = !on; e.classList.toggle('pv-muted', !!muted);
      e.textContent = words || 'break when too few';
    });
  }

  /* ---------- A: the Save dock, louder. The existing line becomes the attention band, fact first, with Accept in it.
     Accept goes into the plan; Save sends it. ---------- */
  function drawA() {
    var s = cur(), band = '', show = s.away, muted = false;
    if (st === 'fixed') { band = ''; show = []; }
    else if (accepted()) { band = quiet(false); muted = true; show = S.short.away; }
    else if (st === 'accept' || st === 'saving' || st === 'fail') {
      band = '<div class="pv-band is-pending" role="status"><div class="pv-words"><p class="pv-fact">' + esc('Accepting ' + OK.low + ' of 6 ' + OK.when) + '</p><p class="pv-more">Not saved yet. Save to share it with the chefs. <button type="button" class="p-link pv-undo">Undo</button></p></div></div>';
    } else {
      band = '<div class="pv-band is-row" role="status"><div class="pv-words">' + fact(s) + (st === 'worse' ? lapsed() : more(s, '')) + '</div>' +
        '<button type="button" class="pv-accept" aria-label="' + esc('Accept ' + s.low + ' of ' + s.n + ' on Dinner ' + s.when + ' for today') + '">Accept ' + s.low + ' of ' + s.n + '</button></div>';
    }
    dock.innerHTML = '<p class="tm-save-state" role="status"' + (band && !dirty() && !accepted() ? ' hidden' : '') + '>' + esc(stateWords()) + '</p>' + band + saveBtn() + svLine();
    marks(show, muted, muted ? 'away when too few (accepted)' : '');
  }

  /* ---------- B: on the clock. The short time drawn on the list head's hours and on each marked person's bar, with its
     words and Accept in the sticky head; the dock keeps one plain pointer line. Accept goes into the plan; Save sends it. ---------- */
  function drawB() {
    var s = cur(), cov = '', line = '', show = s.away, ptr = '';
    head.removeAttribute('aria-hidden');
    head.querySelectorAll('.pv-cov, .pv-headline').forEach(function (e) { e.remove(); });
    document.querySelectorAll('.tm-rowbar .pv-sp').forEach(function (e) { e.remove(); });
    var busy = '<i class="pv-busy" style="left:' + pc(1050) + '%;width:' + (pc(1230) - pc(1050)) + '%" title="Dinner busy time 17:30 to 20:30"></i>';
    if (st === 'fixed') { show = []; cov = busy; }
    else if (accepted()) {
      show = [];
      cov = busy + '<i class="pv-sp is-ok" style="left:' + pc(OK.range[0]) + '%;width:' + (pc(OK.range[1]) - pc(OK.range[0])) + '%"></i>';
      line = '<p class="pv-headline is-ok"><span class="pv-words pv-more"><b>Accepted for today:</b> ' + esc(OK.low + ' of 6 on Dinner 18:30 to 19:00. ' + OK.by + ', ' + OK.at + '.') + '</span></p>';
    } else {
      var r = st === 'accept' || st === 'saving' || st === 'fail' ? OK.range : s.range;
      cov = busy + '<i class="pv-sp" style="left:' + pc(r[0]) + '%;width:' + Math.max(1, pc(r[1]) - pc(r[0])) + '%"></i>';
      if (st === 'accept' || st === 'saving' || st === 'fail') {
        line = '<div class="pv-headline" role="status"><div class="pv-words"><p class="pv-fact">' + esc('Accepting 4 of 6, 18:30 to 19:00') + '</p><p class="pv-more">Not saved yet. Save to share it. <button type="button" class="p-link pv-undo">Undo</button></p></div></div>';
        ptr = '<p class="pv-pointer"><b>Accepting 4 of 6, 18:30 to 19:00.</b> Not saved yet.</p>';
      } else {
        var t = s.range[0] === 1110 && s.range[1] === 1140 ? '18:30 to 19:00' : '18:30 to 18:45';
        line = '<div class="pv-headline" role="status"><div class="pv-words"><p class="pv-fact"><span class="pv-tf">Too few</span> ' + esc(t + ' on Dinner: ' + s.low + ' of ' + s.n) + '</p>' +
          (st === 'worse' ? lapsed() : '') + '</div>' +
          '<button type="button" class="pv-accept" aria-label="' + esc('Accept ' + s.low + ' of ' + s.n + ' on Dinner ' + t + ' for today') + '">Accept ' + s.low + ' of ' + s.n + '</button></div>';
        ptr = '<p class="pv-pointer"><b>' + esc('Too few ' + s.when + ': ' + s.low + ' of ' + s.n + '.') + '</b> ' + esc(s.dirty ? 'Unsaved plan.' : 'Saved plan.') + '</p>';
      }
      show.forEach(function (id) { var bar = document.querySelector('.tm-tlrow[data-id="' + id + '"] .tm-rowbar'); if (bar) bar.insertAdjacentHTML('beforeend', '<i class="pv-sp" style="left:' + pc(r[0]) + '%;width:' + Math.max(1, pc(r[1]) - pc(r[0])) + '%"></i>'); });
    }
    head.querySelector('.tm-rowticks').insertAdjacentHTML('afterend', '<span class="pv-cov" aria-hidden="true">' + cov + '</span>' + line);
    dock.innerHTML = '<p class="tm-save-state" role="status"' + (ptr && !dirty() ? ' hidden' : '') + '>' + esc(stateWords()) + '</p>' + ptr + saveBtn() + svLine();
    marks(show, false, 'away 18:30 to 19:00, too few');
  }

  /* ---------- C: one tap. The band in the dock with two actions: Show breaks to move (jumps to each marked person in
     turn) and Accept, which saves at once (with any unsaved change, as "Save and accept"). ---------- */
  var jump = -1;
  function drawC() {
    var s = cur(), band = '', show = s.away;
    if (st === 'fixed') { show = []; }
    else if (accepted()) { band = quiet(true); show = []; }
    else {
      var busy = st === 'saving', fail = st === 'fail';
      var acc = busy ? 'Saving...' : fail ? 'Try again' : (s.dirty ? 'Save and accept ' : 'Accept ') + s.low + ' of ' + s.n;
      var nextName = jump >= 0 ? (document.querySelector('.tm-tlrow[data-id="' + show[(jump + 1) % show.length] + '"] .tm-person-name') || {}).textContent : '';
      band = '<div class="pv-band" role="status"><div class="pv-words">' + fact(s) + (st === 'worse' ? lapsed() : more(s, '')) + '</div>' +
        '<div class="pv-acts"><button type="button" class="pv-show">' + esc(jump >= 0 ? 'Next: ' + nextName : 'Show breaks to move') + '</button>' +
        '<button type="button" class="pv-accept pv-acceptc"' + (busy ? ' disabled aria-busy="true"' : '') + ' aria-label="' + esc((s.dirty ? 'Save the plan and accept ' : 'Accept ') + s.low + ' of ' + s.n + ' on Dinner ' + s.when + ' for today') + '">' + esc(acc) + '</button></div></div>';
    }
    dock.innerHTML = '<p class="tm-save-state" role="status"' + (band && !dirty() && !accepted() ? ' hidden' : '') + '>' + esc(stateWords()) + '</p>' + band + saveBtn() + svLine();
    marks(show, false, '');
  }

  var draw = { z: function () {}, a: drawA, b: drawB, c: drawC, m: function () { window.PV_MIX ? window.PV_MIX({ st: st, cur: cur, S: S, OK: OK, esc: esc, dock: dock, head: head, pc: pc, saveBtn: saveBtn, svLine: svLine, stateWords: stateWords, fact: fact, more: more, lapsed: lapsed, quiet: quiet, marks: marks, dirty: dirty, ME: ME }) : 0; } }[D];
  function go(next) { st = next; draw(); }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.classList.contains('pv-accept')) {
      e.preventDefault();
      if (D === 'c' || t.classList.contains('pv-now')) { go('saving'); setTimeout(function () { go('accepted'); }, 900); }
      else go('accept');
    } else if (t.classList.contains('pv-undo')) { e.preventDefault(); go(st === 'accepted' ? 'short' : 'short'); }
    else if (t.classList.contains('pv-save') && !t.disabled) { e.preventDefault(); var was = st; go('saving'); setTimeout(function () { go(was === 'accept' || was === 'fail' ? 'accepted' : 'short'); }, 900); }
    else if (t.classList.contains('pv-show')) {
      e.preventDefault(); var ids = cur().away; jump = (jump + 1) % ids.length;
      document.querySelectorAll('.pv-here').forEach(function (r) { r.classList.remove('pv-here'); });
      var row = document.querySelector('.tm-tlrow[data-id="' + ids[jump] + '"]');
      if (row) {
        row.classList.add('pv-here');
        var top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tm-grid-top')) || 0, h = head.getBoundingClientRect().height;
        window.scrollTo({ top: row.getBoundingClientRect().top + scrollY - top - h - 8, behavior: 'instant' });
        var pick = row.querySelector('.tm-tlsvc-brs .ux-picker-trigger, .tm-tlsvc-brs select'); if (pick) pick.focus({ preventScroll: true });
      }
      draw();
    }
  });
  window.PV = { go: go, get state() { return st; } };
  draw();
})();
