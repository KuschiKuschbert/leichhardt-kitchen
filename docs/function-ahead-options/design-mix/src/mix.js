/* Combined preview only (functions ahead of time, round 2, 10 Nov 2026). The taps the preview can show: Got it and its
   Undo on Home, the work-page minus and its Undo, a tap on the line opening the existing function sheet, and the
   open-only rule (the slot's height is set when the page opens; later changes only change the words inside it).
   Nothing is saved. In the app, Got it would be kept on the phone per person (lk.fn.hu.<staffId>), the minus per phone
   for the kitchen day (lk.fn.fold), and the height lock would live in js/functions.js paint(). */
(function () {
  function $(s, r) { return (r || document).querySelector(s); }
  function all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var undo = null;

  /* the slip: the book's own bottom slip (toast()), words by name, with Undo */
  function slip(text, back) {
    var s = $('#fma-slip'); if (!s) return;
    s.querySelector('.p-toast-msg').textContent = text;
    s.hidden = false; undo = back;
  }

  /* ---------- open-only rule: lock the slot's height as the page opens ---------- */
  function lock() {
    var b = document.getElementById('fn-band');
    if (!b || b.hidden || !b.hasAttribute('data-fma-lock')) return;
    var h = Math.round(b.getBoundingClientRect().height);
    b.style.height = h + 'px'; b.setAttribute('data-fma-h', h);
  }
  /* later data while the page is open: swap the words inside the locked slot, never its height */
  window.fmaSim = function (kind) {
    var b = document.getElementById('fn-band'), t = document.querySelector('template[data-sim="' + kind + '"]');
    if (!b || !t || b.hidden) return false;
    b.innerHTML = t.innerHTML;
    var st = b.querySelector('[role="status"]'); if (st) st.setAttribute('aria-live', 'polite');
    return true;
  };

  /* ---------- Home: Got it collapses the card in place to the line ---------- */
  function snapshot() { return all('[data-fma-part]').map(function (e) { return [e, e.hidden]; }); }
  function restore(snap) { snap.forEach(function (x) { x[0].hidden = x[1]; }); }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var got = t.closest('[data-fma="got"]');
    if (got) {
      e.preventDefault();
      var card = got.closest('[data-fma-part]'), snap = snapshot();
      (got.getAttribute('data-hide') || '').split(' ').filter(Boolean).forEach(function (id) { var x = document.getElementById(id); if (x) x.hidden = true; });
      (got.getAttribute('data-show') || '').split(' ').filter(Boolean).forEach(function (id) { var x = document.getElementById(id); if (x) x.hidden = false; });
      card.hidden = true;
      var line = document.getElementById(got.getAttribute('data-line'));
      if (line) { var lb = line.querySelector('.fa-next-b'); if (lb) lb.focus({ preventScroll: true }); }
      slip(got.getAttribute('data-slip'), function () { restore(snap); var g = card.querySelector('[data-fma="got"]'); if (g) g.focus({ preventScroll: true }); });
      return;
    }
    if (t.closest('[data-fma="undo"]')) { e.preventDefault(); var s = $('#fma-slip'); if (s) s.hidden = true; if (undo) { var u = undo; undo = null; u(); } return; }

    /* the work-page minus: hides the line on this phone for the kitchen day */
    var f = t.closest('#fn-band.fa-quiet [data-fn="fold"]');
    if (f) {
      var band = document.getElementById('fn-band'); band.hidden = true;
      slip('Hidden on this phone until tomorrow. Home still shows it.', function () { band.hidden = false; var m = band.querySelector('[data-fn="fold"]'); if (m) m.focus({ preventScroll: true }); });
      return;
    }
    /* a tap on the line (or Open the function) opens the existing function sheet */
    var o = t.closest('[data-fn="open"]');
    if (o) { e.preventDefault(); var p = document.getElementById('fa-sheet-' + o.getAttribute('data-id')); if (p) { p.className = 'fn-pop'; p.querySelector('.fn-sheet').focus(); } return; }
    var c = t.closest('[data-fn="close"]'); if (c) { c.closest('.fn-pop').className = 'fa-pop'; return; }
  });

  // lock once the page and its fonts are in (the app locks on the first paint after the route opens)
  window.addEventListener('load', function () {
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
      lock();
      var sim = document.documentElement.getAttribute('data-fma-sim');
      if (sim) window.fmaSim(sim);
      document.documentElement.setAttribute('data-fma-ready', '1');
    });
  });
})();
