/* Design C preview only: the taps the preview can show (Got it, Undo, the bell, Who has seen it). Nothing is saved;
   in the app Got it would be kept on the phone for each person (phase 1) and, in phase 2, one small receipt write. */
(function () {
  function $(s, r) { return (r || document).querySelector(s); }
  function all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var hist = [];
  function show(id) {
    all('.fn-hu[data-hu-card]').forEach(function (c) { c.hidden = c.id !== id; });
    var c = document.getElementById(id);
    if (c) { var f = c.querySelector('.fn-hu-got, .p-link'); if (f && document.activeElement && document.activeElement !== document.body) f.focus({ preventScroll: true }); }
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-hu], [data-note="open"], [data-c="close"]') : null;
    if (!t) return;
    var act = t.getAttribute('data-hu');
    if (act === 'got') {
      e.preventDefault();
      var card = t.closest('.fn-hu'); hist.push(card.id);
      show(t.getAttribute('data-next'));
      document.querySelectorAll('.nbell.has-new').forEach(function (b) { if (!$('.fn-hu[data-hu-card][data-hu-open]:not([hidden])')) b.classList.remove('has-new'); });
    } else if (act === 'undo') {
      e.preventDefault();
      var back = hist.pop(); if (back) show(back);
    } else if (act === 'seen') {
      e.preventDefault();
      var box = t.closest('.fn-hu, .fn-sheet').querySelector('.fn-hu-seen'); if (box) { box.hidden = false; t.hidden = true; }
    } else if (t.getAttribute('data-note') === 'open') {
      e.preventDefault();
      var sh = $('.c-sheet'); if (sh) sh.hidden = false;
    } else if (t.getAttribute('data-c') === 'close') {
      e.preventDefault();
      var s2 = t.closest('.c-sheet'); if (s2) s2.hidden = true;
      if (t.getAttribute('data-got')) document.querySelectorAll('.nbell.has-new').forEach(function (b) { b.classList.remove('has-new'); });
    }
  });
  // a state frame can ask to start scrolled to a part of the page: <html data-c-scroll="#hm-up-h">
  window.addEventListener('load', function () {
    var sel = document.documentElement.getAttribute('data-c-scroll'); if (!sel) return;
    var el = $(sel); if (el) window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - 90));
  });
})();
