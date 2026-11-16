/* The mix for docs/team-short-ok-options/brief.md, drawn by pv.js (data-design="m"): A's band in the Save dock with
   Accept beside the fact, going into the plan for the existing Save; C's jump to the breaks as a link in the band;
   B's real times in each person's mark. Never loaded by the book. Synthetic data only. */
(function () {
  var BR = { sam: [1110, 1140], dev: [1095, 1125], fen: [1095, 1140], hal: [1110, 1140], eli: [1110, 1140] };
  var hh = function (m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); };
  var jumpAt = -1, liveAt = '';
  function name(id) { var e = document.querySelector('.tm-tlrow[data-id="' + id + '"] .tm-person-name'); return e ? e.textContent : id; }
  window.PV_MIX = function (c) {
    var st = c.st, s = c.cur(), esc = c.esc, ME = c.ME;
    var pending = st === 'accept' || st === 'saving' || st === 'fail', off = st === 'unaccept' || st === 'unsaving';
    var dirty = st === 'edit' || pending || off;
    var acc = st === 'accepted' || st === 'acceptedLive';
    var who = st === 'acceptedLive' ? ME + ' at ' + liveAt : 'Gus at 14:05';
    var band = '', show = s.away, grey = false;
    var go = s.away[(jumpAt + 1) % s.away.length];
    var link = '<button type="button" class="p-link pv-jump" data-id="' + esc(go) + '">' + esc((jumpAt >= 0 ? 'Next: ' : 'Go to ') + name(go) + '’s break') + '</button>';
    if (st === 'fixed') show = [];
    else if (acc) {
      band = '<p class="pv-quiet" role="status"><b>Accepted for today:</b> ' + esc('4 on, 6 needed, until 19:00. ' + who + '.') + ' <button type="button" class="p-link pv-mundo">Undo</button></p>';
      grey = true; show = c.S.short.away;
    } else if (pending) {
      band = '<div class="pv-band is-pending" role="status"><div class="pv-words"><p class="pv-fact">' + esc('Not saved yet: accept 4 on, 6 needed, until 19:00') + '</p><p class="pv-more">Save to share it with the chefs. <button type="button" class="p-link pv-undo">Undo</button></p></div></div>';
    } else {
      var lead = off ? 'Not saved yet: acceptance taken off.' : st === 'worse' ? 'Gus accepted 4 on at 14:05. The plan changed since.' : (s.dirty ? 'Unsaved plan.' : 'Saved plan.') + (s.steps ? ' ' + s.steps + '.' : '');
      band = '<div class="pv-band is-row" role="status"><div class="pv-words"><p class="pv-fact"><span class="pv-tf">Too few</span> ' + esc(s.when + ': ' + s.low + ' on, ' + s.n + ' needed') + '</p>' +
        '<p class="pv-more">' + esc(lead) + ' ' + link + '</p></div>' +
        '<button type="button" class="pv-accept" data-low="' + s.low + '" data-from="' + s.range[0] + '" data-to="' + s.range[1] + '" aria-label="' + esc('Accept ' + s.low + ' on, ' + s.n + ' needed, on Dinner ' + s.when + ', for today') + '">Accept ' + s.low + ' on</button></div>';
    }
    var busy = st === 'saving' || st === 'unsaving', fail = st === 'fail';
    var save = '<button type="button" class="btn dark ink-busy-button sv-btn pv-save" data-p="tm-save"' + (!dirty || busy ? ' disabled' : '') + '><span class="sv-now">' + esc(busy ? 'Saving...' : fail ? 'Try again' : 'Save Monday 16 November') + '</span></button>';
    var line = fail ? '<span class="sv-line bad" role="alert" style="color:var(--bad-ink)">Not saved for Monday 16 November. The plan and the acceptance are still here. Check the signal, then try again.</span>' : '<span class="sv-line" role="status"></span>';
    var stw = acc ? '' : st === 'fixed' ? 'Saved 18:31 · ' + ME : dirty ? 'Not saved yet' : 'Saved 13:00 · Gus';
    // the band says Saved, Unsaved or Not saved yet itself, so the dock's own status words step aside while it shows
    c.dock.innerHTML = (stw && !band ? '<p class="tm-save-state" role="status">' + esc(stw) + '</p>' : '') + band + save + line;
    var head = document.querySelector('.tm-draftstate'); if (head) head.textContent = st === 'acceptedLive' ? 'Saved ' + liveAt + ' · ' + ME : st === 'accepted' ? 'Saved 14:05 · Gus' : dirty ? 'Not saved yet' : 'Saved 13:00 · Gus';
    document.querySelectorAll('.tm-short-mark').forEach(function (e) {
      var id = e.dataset.id, on = show.indexOf(id) >= 0, b = BR[id];
      e.hidden = !on; e.classList.toggle('pv-muted', grey);
      if (b) e.textContent = 'Break ' + hh(b[0]) + ' to ' + hh(b[1]) + (grey ? ' (short accepted)' : ', too few then');
    });
  };
  // the mix's own taps, before pv.js: Undo on the accepted line goes into the plan; Save from there; the jump link
  window.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t || !window.PV) return;
    var st = PV.state;
    if (t.classList.contains('pv-mundo')) { e.stopPropagation(); PV.go('unaccept'); }
    else if (t.classList.contains('pv-save') && !t.disabled && (st === 'unaccept' || st === 'accept' || st === 'fail')) {
      e.stopPropagation(); var was = st; PV.go(was === 'unaccept' ? 'unsaving' : 'saving');
      setTimeout(function () { liveAt = '18:31'; PV.go(was === 'unaccept' ? 'short' : 'acceptedLive'); }, 900);
    } else if (t.classList.contains('pv-jump')) {
      e.stopPropagation(); var ids = Array.prototype.slice.call(document.querySelectorAll('.tm-short-mark:not([hidden])')).map(function (m) { return m.dataset.id; });
      jumpAt = (jumpAt + 1) % ids.length;
      document.querySelectorAll('.pv-here').forEach(function (r) { r.classList.remove('pv-here'); });
      var row = document.querySelector('.tm-tlrow[data-id="' + t.dataset.id + '"]');
      if (row) {
        row.classList.add('pv-here');
        var top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tm-grid-top')) || 0, h = document.querySelector('.tm-planhead').getBoundingClientRect().height;
        window.scrollTo({ top: row.getBoundingClientRect().top + scrollY - top - h - 8, behavior: 'instant' });
        var pick = row.querySelector('.tm-tlsvc-brs .ux-picker-trigger, .tm-tlsvc-brs select'); if (pick) pick.focus({ preventScroll: true });
      }
      PV.go(st);
    }
  }, true);
})();
