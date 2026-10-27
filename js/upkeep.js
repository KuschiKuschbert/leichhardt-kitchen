/* Runs at the end of <body>, before the deferred app scripts (moved out of index.html for the security header, 20 Oct 2026). */
/* Something not saved or not sent yet in the prep pages (a line, a shift ping, minutes, the staff list, a write waiting
   for the server): LK_PREP.unsaved() in js/prep.js decides. */
function lkUnsaved() { try { return !!(window.LK_PREP && window.LK_PREP.unsaved && window.LK_PREP.unsaved()); } catch (e) { return false; } }
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
// Daily self-refresh: the book reloads itself once a day (about 04:00) so a tablet left open on the pass
// always shows the latest cards. If the device was asleep at 04:00, it refreshes as soon as it wakes.
(function () {
  var DAY = 24 * 60 * 60 * 1000, CATCH_UP = 20 * 60 * 60 * 1000, loaded = Date.now(), T = window.LK_TIME, due = false;
  function untilFour() { var n = T.now(), t = T.at(T.day(n), 240); if (t <= n + 60000) t += DAY; return t - n; }
  // A refresh that has to wait tries again in 10 minutes, and soon after the signal is back. While it waits, the clock
  // being put right (lk-clock) does not push it to tomorrow.
  function later() { due = true; clearTimeout(timer); timer = setTimeout(refresh, 600000); }
  function refresh() {
    // something half written or not sent yet: try again in 10 minutes
    if (lkUnsaved()) { later(); return; }
    due = true;
    // no signal (a router restarting overnight, a phone waking before its wifi): the book stays as it is and waits
    lkServerUp().then(function (up) {
      if (!up || lkUnsaved()) { later(); return; }
      // Re-fetch the data files past the browser cache first, so the reload shows the newest cards. The page stays on the same card.
      // X-LK-Fresh tells the service worker to fetch these from the network and save them (sw.js).
      var files = ['index.html', 'js/data.js', 'js/art.js', 'js/overlay.js', 'js/app.js', 'js/amounts.js', 'js/learn.js', 'js/cutoffs.js', 'js/prep.js', 'js/functions.js', 'js/firebase-config.js', 'js/boot.js', 'js/upkeep.js', 'css/app.css'];
      // later(): if the reload is turned down (a page asks first), it tries again in 10 minutes
      var go = function () { later(); location.reload(); };
      try {
        // 'no-cache' asks the server whether each file changed (a small answer when it did not), instead of downloading all
        // of them again every morning (about 435 kB a phone, 22 Oct 2026). An update found by the stamp check still uses 'reload'.
        Promise.all(files.map(function (f) { return fetch(f, { cache: 'no-cache', headers: { 'X-LK-Fresh': '1' } }); })).then(go, go);
        setTimeout(go, 8000);
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
  var base = null, found = false, lastTouch = Date.now(), hiddenAt = 0, lastCheck = 0, bar = null;
  function stamp() {
    return lkHead().then(function (r) { return r ? (r.headers.get('last-modified') || '') + '|' + (r.headers.get('etag') || '') : ''; });
  }
  function typing() {
    var a = document.activeElement, t = a && a.tagName;
    // also anything half written in the prep pages, even when the cursor has left the box
    if (lkUnsaved()) return true;
    return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || !!(a && a.isContentEditable);
  }
  var going = false;
  function reloadNow(tapped) {
    if (going) return;
    // Once per 10 minutes at most, so a flapping header can never cause a reload loop.
    try { var last = +localStorage.getItem('lk.upd.last') || 0; if (Date.now() - last < 600000) return; } catch (e) {}
    going = true;
    // no signal (27 Oct 2026): the book stays as it is, and updates by itself once the signal is back
    lkServerUp().then(function (up) {
      if (!up) { going = false; if (tapped) say('No signal. It updates later.', 'Update now'); return; }
      try { localStorage.setItem('lk.upd.last', String(Date.now())); } catch (e) {}
      var files = ['index.html', 'js/data.js', 'js/art.js', 'js/overlay.js', 'js/app.js', 'js/amounts.js', 'js/learn.js', 'js/cutoffs.js', 'js/prep.js', 'js/functions.js', 'js/firebase-config.js', 'js/boot.js', 'js/upkeep.js', 'css/app.css'];
      var go = function () { going = false; location.reload(); };
      try { Promise.all(files.map(function (f) { return fetch(f, { cache: 'reload', headers: { 'X-LK-Fresh': '1' } }); })).then(go, go); setTimeout(go, 8000); } catch (e) { go(); }
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
    calm = setTimeout(function () { armedAt = 0; barText.textContent = 'New version available.'; barBtn.textContent = 'Update now'; }, 4000);
  }
  function showBar() {
    if (bar || !document.body) return;
    bar = document.createElement('div'); bar.setAttribute('role', 'status'); bar.className = 'upd-bar';
    document.documentElement.classList.add('has-upd');
    var t = barText = document.createElement('span'); t.textContent = 'New version available.';
    var b = barBtn = document.createElement('button'); b.type = 'button'; b.textContent = 'Update now';
    b.onclick = function () {
      // something not saved or not sent yet (27 Oct 2026): a second tap within 4 seconds, like Sign out, because the
      // reload loses it
      if (lkUnsaved() && !(armedAt && Date.now() - armedAt < 4000)) { say('Not saved yet.', 'Tap again to update'); armedAt = Date.now(); return; }
      armedAt = 0;
      try { localStorage.removeItem('lk.upd.last'); } catch (e) {}
      reloadNow(true);
    };
    bar.appendChild(t); bar.appendChild(b); document.body.insertBefore(bar, document.getElementById('app') || document.body.firstChild);
  }
  function check(returned) {
    lastCheck = Date.now();
    stamp().then(function (s) {
      if (!s || s === '|') return;
      if (base === null) { base = s; return; }
      if (s === base) return;
      found = true;
      if (returned && !typing()) reloadNow(); else showBar();
    });
  }
  ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(function (ev) { document.addEventListener(ev, function () { lastTouch = Date.now(); }, { passive: true, capture: true }); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    var away = hiddenAt ? Date.now() - hiddenAt : 0;
    if (Date.now() - lastCheck > 60000) check(away > 300000); else if (found && away > 300000 && !typing()) reloadNow();
  });
  setInterval(function () {
    if (document.visibilityState !== 'visible') return;
    if (found) { if (Date.now() - lastTouch > 120000 && !typing()) reloadNow(); }
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
    if (Date.now() - opened < 8000 && lastTouch <= opened && !typing() && navigator.onLine !== false) {
      try { var last = +localStorage.getItem('lk.upd.last') || 0; if (Date.now() - last < 600000) { showBar(); return; } localStorage.setItem('lk.upd.last', String(Date.now())); } catch (err) {}
      location.reload();
    } else showBar();
  });
})();
// Installable: the service worker keeps the last copy of the book, so it opens at once and with no signal.
if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
