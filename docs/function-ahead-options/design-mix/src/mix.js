/* Combined preview only (functions ahead of time, round 2, 10 Nov 2026; revised after the focused review the same day).
   The taps the preview can show: Got it answered in place inside the Next function line (with Undo in the line, no
   bottom slip on Home), the work-page minus with its slip and Undo, a tap on the line opening the existing function
   sheet, and the open-only rule (the slot's height is set when the page opens, for the tallest words it can become at
   the current text size; later changes only change the words inside it; a function today breaks the lock).
   Nothing is saved. In the app: Got it per person on the phone (lk.fn.hu.<staffId>: function id, stage and a now()
   stamp), the minus per phone, per person, for the kitchen day (lk.fn.ahead.fold: day and staff id, apart from the
   band's own lk.fn.fold), and the lock in js/functions.js paint() and js/prep.js homePaint(). */
(function () {
  function $(s, r) { return (r || document).querySelector(s); }
  function all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var html = document.documentElement;

  /* the text size setting, as js/boot.js applies it before the page draws (Settings: large 112.5%, extra large 125%).
     The preview takes it from ?text=large or ?text=xlarge, or from the frame's own data-fma-text. */
  (function () {
    var m = /[?&]text=(large|xlarge)\b/.exec(location.search), v = m ? m[1] : html.getAttribute('data-fma-text');
    if (v) html.setAttribute('data-text', v);
  })();

  /* ---------- the book's slip (toast()), work pages only: words by name, with Undo ---------- */
  var slipUndo = null;
  function slip(text, back) {
    var s = $('#fma-slip'); if (!s) return;
    s.querySelector('.p-toast-msg').textContent = text;
    s.hidden = false; slipUndo = back;
  }

  /* ---------- open-only rule ----------
     An open is: a route change, the app becoming visible again, a PIN unlock after an idle or daily lock, or a reload.
     At an open the slot is sized for the tallest set of words it can become (every state of the line, drawn at the
     current text size and width), so later words never need more room. Here: every words-only template on the page. */
  function lock() {
    var b = document.getElementById('fn-band');
    if (!b || b.hidden || !b.hasAttribute('data-fma-lock')) return;
    var keep = b.innerHTML, hs = [];
    var sets = [keep].concat(all('template[data-sim]').filter(function (t) { return !t.hasAttribute('data-unlock') && !t.hasAttribute('data-target'); }).map(function (t) { return t.innerHTML; }));
    b.style.height = '';
    sets.forEach(function (h) { b.innerHTML = h; hs.push(Math.ceil(b.getBoundingClientRect().height)); });
    b.innerHTML = keep;
    var h = Math.max.apply(null, hs);
    b.style.height = h + 'px'; b.setAttribute('data-fma-h', h); b.setAttribute('data-fma-sets', hs.join(' '));
  }
  /* later data while the page is open. Words-only: swap the words inside the locked slot (or the Home line), never its
     height. data-unlock (a function today): the full band draws at once, because a missed round is the mistake the band
     exists to stop (service rule 3). */
  window.fmaSim = function (kind) {
    var t = document.querySelector('template[data-sim="' + kind + '"]');
    if (!t) return false;
    if (t.hasAttribute('data-target')) {
      var line = document.getElementById(t.getAttribute('data-target'));
      if (!line || line.hidden) return false;
      var n = line.querySelector('.fa-next'); if (!n) return false;
      n.outerHTML = t.innerHTML;
      return true;
    }
    var b = document.getElementById('fn-band');
    if (!b || b.hidden) return false;
    if (t.hasAttribute('data-unlock')) { b.outerHTML = t.innerHTML; html.setAttribute('data-fma-unlocked', kind); return true; }
    b.innerHTML = t.innerHTML;
    var st = b.querySelector('[role="status"]'); if (st) st.setAttribute('aria-live', 'polite');
    return true;
  };

  /* ---------- Home: Got it collapses the card in place to the line, and the line answers ---------- */
  function snapshot() { return all('[data-fma-part]').map(function (e) { return [e, e.hidden]; }); }
  function restore(snap) { snap.forEach(function (x) { x[0].hidden = x[1]; }); }
  var ack = null;   // { n: the .fa-next, back: undo, timer }
  function endAck() {
    if (!ack) return;
    var a = ack; ack = null; clearTimeout(a.timer);
    var hadFocus = a.n.contains(document.activeElement);
    a.n.classList.remove('is-ack');
    var sr = a.n.querySelector('[data-fma-sr]'); if (sr) sr.textContent = '';
    if (hadFocus) { var lb = a.n.querySelector('.fa-next-b'); if (lb) lb.focus({ preventScroll: true }); }
  }
  window.fmaAckEnd = endAck;   // the capture script uses this to show the line after the 9 s
  function startAck(line, words, said, back, quiet) {
    endAck();
    var n = line.querySelector('.fa-next'); if (!n) return;
    n.querySelector('.fa-next-ack').textContent = words;
    var sr = n.querySelector('[data-fma-sr]'); if (sr) sr.textContent = said;
    n.classList.add('is-ack');
    ack = { n: n, back: back, timer: html.hasAttribute('data-fma-hold') ? 0 : setTimeout(endAck, 9000) };
    var lb = n.querySelector('.fa-next-b'); if (lb) lb.focus({ preventScroll: true, focusVisible: !quiet });
  }
  function gotIt(got, quiet) {
    var card = got.closest('[data-fma-part]'), snap = snapshot();
    (got.getAttribute('data-hide') || '').split(' ').filter(Boolean).forEach(function (id) { var x = document.getElementById(id); if (x) x.hidden = true; });
    (got.getAttribute('data-show') || '').split(' ').filter(Boolean).forEach(function (id) { var x = document.getElementById(id); if (x) x.hidden = false; });
    card.hidden = true;
    var line = document.getElementById(got.getAttribute('data-line'));
    if (!line) return;
    startAck(line, got.getAttribute('data-ack') || 'Got it. Kept here as one line', got.getAttribute('data-said') || '', function () {
      restore(snap); var g = card.querySelector('[data-fma="got"]'); if (g) g.focus({ preventScroll: true });
    }, quiet);
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var got = t.closest('[data-fma="got"]');
    if (got) { e.preventDefault(); gotIt(got); return; }
    var u = t.closest('[data-fma="undo"]');
    if (u) {
      e.preventDefault();
      if (u.closest('.fa-next')) { if (ack) { var back = ack.back; endAck(); back(); } return; }
      var s = $('#fma-slip'); if (s) s.hidden = true; if (slipUndo) { var b2 = slipUndo; slipUndo = null; b2(); } return;
    }

    /* the work-page minus: hides the line for this person on this phone for the kitchen day (lk.fn.ahead.fold) */
    var f = t.closest('#fn-band.fa-quiet [data-fn="fold"]');
    if (f) {
      var band = document.getElementById('fn-band'); band.hidden = true;
      slip('Hidden for you on this phone until tomorrow. Home still shows it.', function () { band.hidden = false; var m = band.querySelector('[data-fn="fold"]'); if (m) m.focus({ preventScroll: true }); });
      return;
    }
    /* a tap on the line, a busy-week row or Open the function opens the existing function sheet */
    var o = t.closest('[data-fn="open"]');
    if (o) { e.preventDefault(); var p = document.getElementById('fa-sheet-' + o.getAttribute('data-id')); if (p) { p.className = 'fn-pop'; p.querySelector('.fn-sheet').focus(); } return; }
    var c = t.closest('[data-fn="close"]'); if (c) { c.closest('.fn-pop').className = 'fa-pop'; return; }
  });

  // lock once the page and its fonts are in (the app sizes the slot on the first paint after an open)
  window.addEventListener('load', function () {
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
      lock();
      var sim = html.getAttribute('data-fma-sim');
      if (sim && !/[?&]nosim\b/.test(location.search)) window.fmaSim(sim);
      var auto = html.getAttribute('data-fma-auto');   // a frame that shows the moment just after Got it
      if (auto) auto.split(' ').forEach(function (id) { var g = document.querySelector('#' + id + ' [data-fma="got"]'); if (g) gotIt(g, true); });
      html.setAttribute('data-fma-ready', '1');
    });
  });
})();
