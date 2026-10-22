/* Runs at the end of <body>, before the deferred app scripts (moved out of index.html for the security header, 20 Oct 2026). */
// Daily self-refresh: the book reloads itself once a day (about 04:00) so a tablet left open on the pass
// always shows the latest cards. If the device was asleep at 04:00, it refreshes as soon as it wakes.
(function () {
  var DAY = 24 * 60 * 60 * 1000, CATCH_UP = 20 * 60 * 60 * 1000, loaded = Date.now(), T = window.LK_TIME;
  function untilFour() { var n = T.now(), t = T.at(T.day(n), 240); if (t <= n + 60000) t += DAY; return t - n; }
  function refresh() {
    // Something half written in the prep pages (a line, a shift ping, minutes, the staff list): try again in 10 minutes.
    try { if (window.LK_PREP && window.LK_PREP.unsaved && window.LK_PREP.unsaved()) { clearTimeout(timer); timer = setTimeout(refresh, 600000); return; } } catch (e) {}
    // Re-fetch the data files past the browser cache first, so the reload shows the newest cards. The page stays on the same card.
    // X-LK-Fresh tells the service worker to fetch these from the network and save them (sw.js).
    var files = ['index.html', 'js/data.js', 'js/art.js', 'js/overlay.js', 'js/app.js', 'js/amounts.js', 'js/learn.js', 'js/prep.js', 'js/functions.js', 'js/firebase-config.js', 'js/boot.js', 'js/upkeep.js', 'css/app.css'];
    var go = function () { location.reload(); };
    try {
      // 'no-cache' asks the server whether each file changed (a small answer when it did not), instead of downloading all
      // of them again every morning (about 435 kB a phone, 22 Oct 2026). An update found by the stamp check still uses 'reload'.
      Promise.all(files.map(function (f) { return fetch(f, { cache: 'no-cache', headers: { 'X-LK-Fresh': '1' } }); })).then(go, go);
      setTimeout(go, 8000);
    } catch (e) { go(); }
  }
  var timer = null;
  function schedule() { clearTimeout(timer); timer = setTimeout(refresh, Math.max(1000, untilFour())); }
  schedule();
  window.addEventListener('lk-clock', schedule);
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
  var STAMP_URL = 'index.html', base = null, found = false, lastTouch = Date.now(), hiddenAt = 0, lastCheck = 0, bar = null;
  function stamp() {
    var t0 = Date.now();
    return fetch(STAMP_URL, { method: 'HEAD', cache: 'no-store' }).then(function (r) {
      window.LK_TIME.learn(r.ok ? r : null, t0, Date.now());
      return r.ok ? (r.headers.get('last-modified') || '') + '|' + (r.headers.get('etag') || '') : '';
    }, function () { window.LK_TIME.learn(null); return ''; });
  }
  function typing() {
    var a = document.activeElement, t = a && a.tagName;
    // also anything half written in the prep pages, even when the cursor has left the box
    try { if (window.LK_PREP && window.LK_PREP.unsaved && window.LK_PREP.unsaved()) return true; } catch (e) {}
    return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || !!(a && a.isContentEditable);
  }
  function reloadNow() {
    // Once per 10 minutes at most, so a flapping header can never cause a reload loop.
    try { var last = +localStorage.getItem('lk.upd.last') || 0; if (Date.now() - last < 600000) return; localStorage.setItem('lk.upd.last', String(Date.now())); } catch (e) {}
    var files = ['index.html', 'js/data.js', 'js/art.js', 'js/overlay.js', 'js/app.js', 'js/amounts.js', 'js/learn.js', 'js/prep.js', 'js/functions.js', 'js/firebase-config.js', 'js/boot.js', 'js/upkeep.js', 'css/app.css'];
    var go = function () { location.reload(); };
    try { Promise.all(files.map(function (f) { return fetch(f, { cache: 'reload', headers: { 'X-LK-Fresh': '1' } }); })).then(go, go); setTimeout(go, 8000); } catch (e) { go(); }
  }
  /* A slim strip at the top of the screen (21 Oct 2026), styled in css/app.css (.upd-bar), so it never sits with the
     toasts at the bottom. It sticks to the top while the page scrolls. */
  function showBar() {
    if (bar || !document.body) return;
    bar = document.createElement('div'); bar.setAttribute('role', 'status'); bar.className = 'upd-bar';
    document.documentElement.classList.add('has-upd');
    var t = document.createElement('span'); t.textContent = 'New version available.';
    var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Update now';
    b.onclick = function () { try { localStorage.removeItem('lk.upd.last'); } catch (e) {} reloadNow(); };
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
    if (Date.now() - opened < 8000 && lastTouch <= opened && !typing()) {
      try { var last = +localStorage.getItem('lk.upd.last') || 0; if (Date.now() - last < 600000) { showBar(); return; } localStorage.setItem('lk.upd.last', String(Date.now())); } catch (err) {}
      location.reload();
    } else showBar();
  });
})();
// Installable: the service worker keeps the last copy of the book, so it opens at once and with no signal.
if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
