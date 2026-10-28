/* Runs at the end of <body>, before the deferred app scripts (moved out of index.html for the security header, 20 Oct 2026). */
/* Something not saved or not sent yet in the prep pages (a line, a shift ping, minutes, the staff list, a write waiting
   for the server): LK_PREP.unsaved() in js/prep.js decides. */
function lkUnsaved() { try { return !!(window.LK_PREP && window.LK_PREP.unsaved && window.LK_PREP.unsaved()); } catch (e) { return false; } }
// of those, a write waiting for the server (LK_PREP.unsent()), which the strip on the prep pages calls Not sent yet
function lkUnsent() { try { return !!(window.LK_PREP && window.LK_PREP.unsent && window.LK_PREP.unsent()); } catch (e) { return false; } }
/* One HEAD of index.html past every cache (the service worker leaves HEAD alone): a tiny request, no Firestore. The
   update check reads its stamp, the reloads ask it whether the server is there, and every answer keeps the book's clock
   right (LK_TIME.learn). Gives the answer, or null with no answer (no signal, an error, or nothing in 8 seconds). */
function lkHead() {
  var t0 = Date.now();
  return new Promise(function (res) {
    var wait = setTimeout(function () { res(null); }, 8000);
    function got(r) { clearTimeout(wait); window.LK_TIME.learn(r, t0, Date.now()); res(r); }
    try { fetch('index.html', { method: 'HEAD', cache: 'no-store' }).then(function (r) { got(r.ok ? r : null); }, function () { got(null); }); } catch (e) { got(null); }
  });
}
/* Is the book's server there (27 Oct 2026)? Since 26 Oct 2026 (#387) Firestore keeps the kitchen's data, and every
   change not sent yet, in this tab's memory only, so a reload with no signal opens an empty book and loses what was
   waiting. The 04:00 refresh and the updates ask this first: the browser's own flag, then lkHead(), so wifi with no
   internet counts as no signal too. One HEAD when a reload is due. */
function lkServerUp() {
  if (navigator.onLine === false) return Promise.resolve(false);
  return lkHead().then(function (r) { return !!r; });
}
/* The automatic update's rule for a reload nobody asked for, which a 04:00 refresh that had to wait follows too (28 Oct
   2026): nothing in a box, half typed or waiting to send (lkTyping()), and nobody has touched the book for 2 minutes
   (lkTouch: the last tap, key, touch or scroll). */
var lkTouch = Date.now();
['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(function (ev) { document.addEventListener(ev, function () { lkTouch = Date.now(); }, { passive: true, capture: true }); });
function lkTyping() {
  var a = document.activeElement, t = a && a.tagName;
  // also anything half written in the prep pages, even when the cursor has left the box
  if (lkUnsaved()) return true;
  return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || !!(a && a.isContentEditable);
}
function lkIdle() { return !lkTyping() && Date.now() - lkTouch > 120000; }
// Daily self-refresh: the book reloads itself once a day (about 04:00) so a tablet left open on the pass
// always shows the latest cards. If the device was asleep at 04:00, it refreshes as soon as it wakes.
(function () {
  var DAY = 24 * 60 * 60 * 1000, CATCH_UP = 20 * 60 * 60 * 1000, loaded = Date.now(), T = window.LK_TIME, due = false;
  function untilFour() { var n = T.now(), t = T.at(T.day(n), 240); if (t <= n + 60000) t += DAY; return t - n; }
  // A refresh that has to wait tries again in 10 minutes, and soon after the signal is back. While it waits, the clock
  // being put right (lk-clock) does not push it to tomorrow. A refresh that has waited has missed its night (28 Oct
  // 2026), so from then on it goes only by the automatic update's rule (lkIdle()): a chef typing in the recipe search
  // mid-morning keeps the words and the keyboard.
  var waited = false;
  function later() { due = waited = true; clearTimeout(timer); timer = setTimeout(refresh, 600000); }
  // what holds it back: something half written or not sent yet, and once it has waited, the book being in use
  function held() { return waited ? !lkIdle() : lkUnsaved(); }
  // one refresh at a time: the 04:00 timer and the catch-up after waking can both call it while one is still asking
  var flying = false;
  function refresh() {
    if (flying) return;
    // held back: try again in 10 minutes
    if (held()) { later(); return; }
    due = true; flying = true;
    // no signal (a router restarting overnight, a phone waking before its wifi): the book stays as it is and waits
    lkServerUp().then(function (up) {
      if (!up || held()) { flying = false; later(); return; }
      // Re-fetch the data files past the browser cache first, so the reload shows the newest cards. The page stays on the same card.
      // X-LK-Fresh tells the service worker to fetch these from the network and save them (sw.js).
      var files = ['index.html', 'js/data.js', 'js/art.js', 'js/overlay.js', 'js/app.js', 'js/amounts.js', 'js/learn.js', 'js/cutoffs.js', 'js/prep.js', 'js/functions.js', 'js/firebase-config.js', 'js/boot.js', 'js/upkeep.js', 'css/app.css'];
      /* Once, when the files are in or after 8 seconds (28 Oct 2026). later(): if the reload is turned down (a page asks
         first), it tries again in 10 minutes. Something typed or written while the files came in holds it back the same
         way, and so does the signal going meanwhile: the service worker answers a failed fetch with the saved copy, so
         the browser's own flag is the one sign of it. */
      var gone = false, wait = null;
      var go = function () {
        if (gone) return;
        gone = true; clearTimeout(wait); flying = false;
        // asked before later(), which counts as a wait
        var ok = navigator.onLine !== false && !held();
        later();
        if (ok) location.reload();
      };
      try {
        // 'no-cache' asks the server whether each file changed (a small answer when it did not), instead of downloading all
        // of them again every morning (about 435 kB a phone, 22 Oct 2026). An update found by the stamp check still uses 'reload'.
        Promise.all(files.map(function (f) { return fetch(f, { cache: 'no-cache', headers: { 'X-LK-Fresh': '1' } }); })).then(go, go);
        wait = setTimeout(go, 8000);
      } catch (e) { go(); }
    });
  }
  var timer = null;
  function schedule() { if (due) return; clearTimeout(timer); timer = setTimeout(refresh, Math.max(1000, untilFour())); }
  schedule();
  window.addEventListener('lk-clock', schedule);
  window.addEventListener('online', function () { if (due) { clearTimeout(timer); timer = setTimeout(refresh, 5000); } });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - loaded > CATCH_UP) refresh(); else schedule();
  });
})();
// Automatic updates. After every deploy the site files carry a new Last-Modified/ETag. The book asks for just those
// headers (a tiny request, no Firestore) when it opens, when someone comes back to it, and every 15 minutes while it is open.
// If they changed, the book updates itself: straight away when it was just brought back from the background,
// otherwise when nobody has touched it for 2 minutes and nothing is being typed. A bar offers "Update now" meanwhile.
// The same answer carries the server's time, which keeps the book's clock right (LK_TIME, at the top).
(function () {
  var base = null, found = false, hiddenAt = 0, lastCheck = 0, bar = null;
  function stamp() {
    return lkHead().then(function (r) { return r ? (r.headers.get('last-modified') || '') + '|' + (r.headers.get('etag') || '') : ''; });
  }
  // Update now's words while a change waits to send (head chef, 28 Oct 2026). On a phone they take two lines: the
  // no-break spaces keep the second sentence whole, so the line breaks after "Not sent yet."
  var UNSENT_NOTE = 'Not sent yet. It\u00a0updates\u00a0once\u00a0sent.';
  /* The update running now, or null (28 Oct 2026). tapped: Update now was tapped for it, before it started or while it
     ran (a tap takes over an update nobody tapped, so the tap's own touch does not call it off). half: something half
     typed when it was tapped, which the second tap said may go. files: it is fetching the files. asked: see reloadNow(). */
  var run = null;
  /* When Update now was tapped while a change waited to send, or 0 (28 Oct 2026). The look every 20 seconds runs the
     update that tap asked for once the change is sent and nothing is in a box or half typed, within 10 minutes of the
     tap, even while the book is in use. After that it updates by the usual rule. */
  var wanted = 0;
  /* back: the book was brought back after 5 minutes or more away. asked: the time of that tap (wanted), for the update
     the look every 20 seconds runs once the change is sent. Nobody tapped just now, so it runs like an update nobody
     tapped: no note in the strip, and a touch does not call it off. */
  function reloadNow(tapped, back, asked) {
    if (run) return;
    // Once per 10 minutes at most, so a flapping header can never cause a reload loop. The strip still offers Update now.
    try { var last = +localStorage.getItem('lk.upd.last') || 0; if (Date.now() - last < 600000) { showBar(); return; } } catch (e) {}
    var me = run = { tapped: !!tapped, half: !!tapped && lkUnsaved(), files: false, asked: asked || 0 }, touched = lkTouch, gone = false, wait = null;
    /* The check and the files take up to 8 seconds each on a weak signal, so the book looks again before it reloads
       (28 Oct 2026): an update nobody tapped stops when someone typed or wrote meanwhile, and the one after 2 minutes
       untouched also when someone touched the book. Coming back is a touch, so that update goes on over a swipe; a tick
       still stops it. The one after a tap whose change has since been sent (asked) goes on over a touch too, and stops
       for a box tapped into, typed in or waiting to send (review of the fix, 28 Oct 2026: it reloaded over the recipe
       search). A tapped one stops when a change waits to send or something was typed after the tap. The strip stays
       and the update waits for its next turn, or for the next tap. */
    function stop() {
      var note = '';
      if (me.tapped) {
        if (lkUnsent()) note = UNSENT_NOTE; else if (lkUnsaved() && !me.half) note = 'Not saved yet.'; else return false;
      } else if (!lkTyping() && (back || me.asked || lkTouch === touched)) return false;
      run = null; showBar(); keep();
      if (note === UNSENT_NOTE) { wanted = Date.now(); say(note, 'Update now'); }
      else if (note) { say(note, 'Tap again to update'); armedAt = Date.now(); }
      return true;
    }
    // the update after a tap that stopped, quietly: the look every 20 seconds tries it again, within 10 minutes of the tap
    function keep() { if (me.asked && !me.tapped) wanted = me.asked; }
    // no signal (27 Oct 2026): the book stays as it is, the strip stays up, and it updates by itself once the signal is back
    function noSignal() { run = null; showBar(); keep(); if (me.tapped) say('No signal. It updates later.', 'Update now'); }
    // the check can take up to 8 seconds on a weak signal, so a tap says what is happening meanwhile
    if (me.tapped) busy('Checking the signal...');
    lkServerUp().then(function (up) {
      if (!up) { noSignal(); return; }
      if (stop()) return;
      me.files = true;
      if (me.tapped) busy('Updating...');
      var files = ['index.html', 'js/data.js', 'js/art.js', 'js/overlay.js', 'js/app.js', 'js/amounts.js', 'js/learn.js', 'js/cutoffs.js', 'js/prep.js', 'js/functions.js', 'js/firebase-config.js', 'js/boot.js', 'js/upkeep.js', 'css/app.css'];
      /* Once, when the files are in or after 8 seconds: a reload turned down (a page asks first) is not tried again. The
         signal going while the files came in counts as no signal: the service worker answers a failed fetch with the
         saved copy, so the browser's own flag is the one sign of it. */
      var go = function () {
        if (gone) return;
        gone = true; clearTimeout(wait);
        land();
      };
      // a touch in the last 600 ms (a tap whose tick comes a moment later): the book looks again 700 ms on, once that
      // tick waits to send and holds the update back (28 Oct 2026)
      var land = function () {
        if (!me.tapped && Date.now() - lkTouch < 600) { setTimeout(land, 700); return; }
        if (stop()) return;
        if (navigator.onLine === false) { noSignal(); return; }
        run = null;
        try { localStorage.setItem('lk.upd.last', String(Date.now())); } catch (e) {}
        location.reload();
      };
      try { Promise.all(files.map(function (f) { return fetch(f, { cache: 'reload', headers: { 'X-LK-Fresh': '1' } }); })).then(go, go); wait = setTimeout(go, 8000); } catch (e) { go(); }
    });
  }
  /* A slim strip at the top of the screen (21 Oct 2026), styled in css/app.css (.upd-bar), so it never sits with the
     toasts at the bottom. It sticks to the top while the page scrolls. */
  var barText = null, barBtn = null, armedAt = 0, calm = null;
  // a short note in the strip for 4 seconds, then the strip as it was
  function say(msg, btn) {
    if (!barText) return;
    barText.textContent = msg; barBtn.textContent = btn;
    clearTimeout(calm);
    calm = setTimeout(reset, 4000);
  }
  function reset() { armedAt = 0; barText.textContent = 'New version available.'; barBtn.textContent = 'Update now'; }
  // a note while the check and the reload run (each 8 seconds at most): the strip as it was after 12 seconds, in case
  // the reload was turned down
  function busy(msg) {
    if (!barText) return;
    clearTimeout(calm); barText.textContent = msg; barBtn.textContent = 'Update now';
    calm = setTimeout(reset, 12000);
  }
  function showBar() {
    if (bar || !document.body) return;
    bar = document.createElement('div'); bar.setAttribute('role', 'status'); bar.className = 'upd-bar';
    document.documentElement.classList.add('has-upd');
    var t = barText = document.createElement('span'); t.textContent = 'New version available.';
    var b = barBtn = document.createElement('button'); b.type = 'button'; b.textContent = 'Update now';
    b.onclick = function () {
      // a tapped update already running ("Checking the signal...", "Updating..."): the tap is ignored
      if (run && run.tapped) return;
      // a change waiting for the server (head chef, 28 Oct 2026): Update now waits, because the reload loses it, and the
      // book updates by itself at its next look once it is sent (wanted). No second tap gets past it.
      if (lkUnsent()) { armedAt = 0; wanted = Date.now(); say(UNSENT_NOTE, 'Update now'); return; }
      // something half typed (27 Oct 2026): a second tap within 4 seconds, like the other Tap again buttons
      if (lkUnsaved() && !(armedAt && Date.now() - armedAt < 4000)) { say('Not saved yet.', 'Tap again to update'); armedAt = Date.now(); return; }
      armedAt = 0;
      try { localStorage.removeItem('lk.upd.last'); } catch (e) {}
      // the automatic update already running, the strip still saying New version available.: the tap takes it over
      if (run) { run.tapped = true; run.half = lkUnsaved(); busy(run.files ? 'Updating...' : 'Checking the signal...'); return; }
      reloadNow(true);
    };
    bar.appendChild(t); bar.appendChild(b); document.body.insertBefore(bar, document.getElementById('app') || document.body.firstChild);
    // the strip keeps its usual height, taller only when its words need more room (Extra large text in a wide font):
    // the bars that stick under it follow its real height (--upd-h, 48 px in css/app.css until this has measured it)
    if (window.ResizeObserver) new ResizeObserver(function () { document.documentElement.style.setProperty('--upd-h', bar.offsetHeight + 'px'); }).observe(bar);
  }
  function check(returned) {
    lastCheck = Date.now();
    stamp().then(function (s) {
      if (!s || s === '|') return;
      if (base === null) { base = s; return; }
      if (s === base) return;
      found = true;
      if (returned && !lkTyping()) reloadNow(false, true); else showBar();
    });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    var away = hiddenAt ? Date.now() - hiddenAt : 0;
    if (Date.now() - lastCheck > 60000) check(away > 300000); else if (found && away > 300000 && !lkTyping()) reloadNow(false, true);
  });
  setInterval(function () {
    if (document.visibilityState !== 'visible') return;
    if (found) {
      // Update now tapped while a change waited: the update it asked for, once the change is sent (see wanted)
      if (wanted && Date.now() - wanted < 600000 && !run && !lkTyping()) { var w = wanted; wanted = 0; try { localStorage.removeItem('lk.upd.last'); } catch (e) {} reloadNow(false, false, w); }
      else if (lkIdle()) reloadNow();
    }
    else if (Date.now() - lastCheck > 15 * 60000) check(false);
  }, 20000);
  window.addEventListener('load', function () { check(false); });
  // The service worker opens the book from the copy saved on the phone and fetches the newest files behind it
  // (sw.js, 21 Oct 2026). When it has saved a new version it says 'lk-new': in the first seconds after opening, before
  // anyone has touched the screen, the book reloads straight into it (the files are already on the phone); otherwise
  // it is the same as a new version found by the check above.
  var opened = Date.now();
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', function (e) {
    if (e.data !== 'lk-new') return;
    found = true;
    if (Date.now() - opened < 8000 && lkTouch <= opened && !lkTyping() && navigator.onLine !== false) {
      try { var last = +localStorage.getItem('lk.upd.last') || 0; if (Date.now() - last < 600000) { showBar(); return; } localStorage.setItem('lk.upd.last', String(Date.now())); } catch (err) {}
      location.reload();
    } else showBar();
  });
})();
// Installable: the service worker keeps the last copy of the book, so it opens at once and with no signal.
if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
