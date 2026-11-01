/* Runs at the end of <body>, before the deferred app scripts (moved out of index.html for the security header, 20 Oct 2026). */
/* Something not saved or not sent yet in the prep pages (a line, a shift ping, minutes, the staff list, a write waiting
   for the server): LK_PREP.unsaved() in js/prep.js decides. */
function lkUnsaved() { try { return !!(window.LK_PREP && window.LK_PREP.unsaved && window.LK_PREP.unsaved()); } catch (e) { return false; } }
// of those, a write waiting for the server (LK_PREP.unsent()), which the strip on the prep pages calls Not sent yet
function lkUnsent() { try { return !!(window.LK_PREP && window.LK_PREP.unsent && window.LK_PREP.unsent()); } catch (e) { return false; } }
// Manual Update distinguishes actual drafts from a picker that is merely open. Older modules stay conservative.
function lkDirty() {
  try {
    var p = window.LK_PREP;
    return !!(p && (p.dirtyForUpdate ? p.dirtyForUpdate() : p.unsavedHere ? p.unsavedHere() : lkUnsaved() && !lkUnsent()));
  } catch (e) { return true; }
}
// Discard consent covers the words present at that decision, not later typing while the files arrive.
var lkEdits = 0;
['input', 'change'].forEach(function (ev) { document.addEventListener(ev, function () { lkEdits++; }, { capture: true }); });
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
/* The newest copy of the book's files before a reload (28 Oct 2026), all or nothing: true only when every file came in.
   With the service worker in charge it runs its own round (freshen() in sw.js), which replaces the saved copy only once
   every file is in. Before, the update and the 04:00 refresh fetched the files here and the worker saved each one as it
   came, so on a weak signal the reload, and every later opening, could run a new js/app.js with an old js/prep.js.
   With no worker (the first visit, or a browser with none) the files are fetched here (cache: 'reload' or 'no-cache'),
   and so they are with a worker from before 28 Oct 2026: it has no round, so it never says it started, and it goes to
   the network for a file with the X-LK-Fresh header. It used to wait for an answer that never came and say No signal
   with the wifi fine, and with no reload the browser did not look for the new worker for up to a day. No answer in 8
   seconds counts as no signal: the old copy stays and the reload waits. */
function lkFresh(files, mode) {
  var w = navigator.serviceWorker && navigator.serviceWorker.controller;
  return new Promise(function (res) {
    var wait = setTimeout(function () { got(false); }, 8000), old = null, done = false;
    function got(ok) { if (done) return; done = true; clearTimeout(wait); clearTimeout(old); res(ok === true); }
    function own() {
      Promise.all(files.map(function (f) {
        return fetch(f, { cache: mode, headers: { 'X-LK-Fresh': '1' } }).then(function (r) { if (!r.ok) throw new Error('not ok'); });
      })).then(function () { got(true); }, function () { got(false); });
    }
    try {
      if (w && window.MessageChannel) {
        var ch = new MessageChannel();
        ch.port1.onmessage = function (e) {
          var d = e.data || {};
          if (d.started) { clearTimeout(old); return; }
          got(d.ok === true);
        };
        // no word in 2 seconds: the worker before 28 Oct 2026. The files come here, with 8 seconds of their own, and the
        // browser is asked to look for the new worker now.
        old = setTimeout(function () {
          if (done) return;
          clearTimeout(wait); wait = setTimeout(function () { got(false); }, 8000);
          try { navigator.serviceWorker.getRegistration().then(function (r) { if (r) r.update().catch(function () {}); }, function () {}); } catch (e) {}
          own();
        }, 2000);
        w.postMessage({ lk: 'fresh' }, [ch.port2]);
        return;
      }
      own();
    } catch (e) { got(false); }
  });
}
/* The automatic update's rule for a reload nobody asked for, which a 04:00 refresh that had to wait follows too (28 Oct
   2026): nothing in a box, half typed or waiting to send (lkTyping()), and nobody has touched the book for 2 minutes
   (lkTouch: the last tap, key, touch or scroll). */
var lkTouch = Date.now();
['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(function (ev) { document.addEventListener(ev, function () { lkTouch = Date.now(); }, { passive: true, capture: true }); });
function lkEditing() {
  var a = document.activeElement, t = a && a.tagName;
  return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || !!(a && a.isContentEditable);
}
function lkTyping() { return lkUnsaved() || lkEditing(); }
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
      // The newest files first, all or nothing (lkFresh()), so the reload shows the newest cards. The page stays on the same card.
      var files = ['index.html', 'js/data.js', 'js/art.js', 'js/overlay.js', 'js/controls.js', 'js/device.js', 'js/app.js', 'js/amounts.js', 'js/learn.js', 'js/cutoffs.js', 'js/prep.js', 'js/functions.js', 'js/firebase-config.js', 'js/boot.js', 'js/upkeep.js', 'css/app.css'];
      /* Once, when every file is in (28 Oct 2026). later(): if the reload is turned down (a page asks first), it tries
         again in 10 minutes. Something typed or written while the files came in holds it back the same way, and so do a
         file that did not come in (weak signal, no answer in 8 seconds) and the signal going meanwhile. */
      // 'no-cache' asks the server whether each file changed (a small answer when it did not), instead of downloading all
      // of them again every morning (about 435 kB a phone, 22 Oct 2026); the worker's round does the same.
      lkFresh(files, 'no-cache').then(function (got) {
        flying = false;
        // asked before later(), which counts as a wait
        var ok = got && navigator.onLine !== false && !held();
        later();
        if (ok) location.reload();
      });
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
  // a version's stamp, from the server's answer or from the saved copy of index.html (a zipped answer marks its ETag weak, W/)
  function stampOf(r) { return (r.headers.get('last-modified') || '') + '|' + (r.headers.get('etag') || '').replace(/^W\//, ''); }
  function stamp() {
    return lkHead().then(function (r) { return r ? stampOf(r) : ''; });
  }
  /* The version this page opened from (28 Oct 2026): opened by the service worker from its saved copy, the stamp of that
     copy of index.html (read once from the phone's own Cache Storage: no request, no Firestore). The first look that gets
     an answer compares with it, so a version that came out meanwhile is found: opened with no signal, or opened with
     signal while the worker's round lost a file on weak wifi (nothing saved, so no lk-new). It used to take that first
     answer as the version running, and missed the update until 04:00. A round that saved the new version first still
     says so with lk-new. Gives '' when there is no saved copy (no worker, or the first visit). */
  var savedAt = Promise.resolve('');
  try { if (navigator.serviceWorker && navigator.serviceWorker.controller && window.caches) savedAt = caches.match('./index.html').then(function (r) { return r ? stampOf(r) : ''; }, function () { return ''; }); } catch (e) {}
  // Update now's words while a change waits to send (head chef, 28 Oct 2026). On a phone they take two lines: the
  // no-break spaces keep the second sentence whole, so the line breaks after "Not sent yet."
  var UNSENT_NOTE = 'Not sent yet. It\u00a0updates\u00a0once\u00a0sent.';
  /* tapped: an explicit Update request. half: the current draft has discard consent for this edit revision.
     files: the atomic file round is running. asked: a previous tap is continuing after pending writes or no signal. */
  var run = null;
  // A requested update waits for every pending write. New typing or an active field still holds its quiet resumption.
  var wanted = 0;
  var consentRevision = null, confirmation = null, resumeTimer = null;
  // A resumed draft can change through Add, Remove or drawing tools without an input/change event. Any interaction
  // back in the book revokes the old discard decision; retrying Update itself keeps that decision.
  ['pointerdown', 'click', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      if (consentRevision === null) return;
      if (e.target && e.target.closest && e.target.closest('.upd-bar, #lk-update-confirm')) return;
      lkEdits++; consentRevision = null;
    }, { capture: true });
  });
  /* The look every 20 seconds waits longer after each update that found no signal (28 Oct 2026): 20 seconds, then 1, 2,
     5 and 10 minutes. On wifi with no internet the phone says it is online, so it used to ask the server every 20
     seconds all shift. The signal coming back (the online event), a tap on Update now or a Reload button, and an update
     that goes start it again. Coming back after 5 minutes away is not held back. Date.now(): time passing on the phone. */
  var BACK = [20000, 60000, 120000, 300000, 600000], fails = 0, nextTry = 0;
  function failedLook() { nextTry = Date.now() + BACK[Math.min(fails, BACK.length - 1)]; fails++; }
  function goodLook() { fails = 0; nextTry = 0; }
  window.addEventListener('online', goodLook);
  /* back: the book was brought back after 5 minutes or more away. asked: the time of that tap (wanted), for the update
     the look every 20 seconds runs once the change is sent. Nobody tapped just now, so it runs like an update nobody
     tapped: no note in the strip, and a touch does not call it off. */
  function reloadNow(tapped, back, asked) {
    if (run || confirmation) return;
    // Once per 10 minutes at most, so a flapping header can never cause a reload loop. The strip still offers Update now.
    try { var last = +localStorage.getItem('lk.upd.last') || 0; if (Date.now() - last < 600000) { showBar(); return; } } catch (e) {}
    var me = run = { tapped: !!tapped, half: !!(tapped || asked) && lkDirty() && consentRevision === lkEdits,
      edits: lkEdits, files: false, asked: asked || 0 }, touched = lkTouch;
    /* The check and the files take up to 8 seconds each on a weak signal, so the book looks again before it reloads
       (28 Oct 2026): an update nobody tapped stops when someone typed or wrote meanwhile, and the one after 2 minutes
       untouched also when someone touched the book. Coming back is a touch, so that update goes on over a swipe; a tick
       still stops it. The one after a tap whose change has since been sent (asked) goes on over a touch too, and stops
       for a box tapped into, typed in or waiting to send (review of the fix, 28 Oct 2026: it reloaded over the recipe
       search). A tapped one stops when a change waits to send or something was typed after the tap. The strip stays
       and the update waits for its next turn, or for the next tap. */
    function stop() {
      if (run !== me) return true;
      var note = '';
      if (me.tapped) {
        if (lkUnsent()) note = UNSENT_NOTE;
        else if (lkDirty() && (!me.half || me.edits !== lkEdits || consentRevision !== me.edits)) {
          run = null; wanted = 0; showBar(); confirmUpdate(); return true;
        } else return false;
      } else if (me.asked) {
        if (!lkUnsent() && !lkEditing() && (!lkDirty() || me.half && me.edits === lkEdits && consentRevision === me.edits)) return false;
      } else if (!lkTyping() && (back || lkTouch === touched)) return false;
      run = null; showBar(); keep();
      if (note === UNSENT_NOTE) { wanted = Date.now(); say(note, 'Update now'); }
      return true;
    }
    function keep() { if (me.tapped || me.asked) wanted = me.asked || Date.now(); }
    // no signal (27 Oct 2026): the book stays as it is, the strip stays up, and it updates by itself once the signal is
    // back; the look every 20 seconds waits longer each time (failedLook())
    function noSignal() { if (run !== me) return; run = null; showBar(); keep(); failedLook(); if (me.tapped) say('No signal. It updates later.', 'Update now'); }
    // the check can take up to 8 seconds on a weak signal, so a tap says what is happening meanwhile
    if (me.tapped) busy('Checking the signal...');
    lkServerUp().then(function (up) {
      if (run !== me) return;
      if (!up) { noSignal(); return; }
      if (stop()) return;
      me.files = true;
      if (me.tapped) busy('Updating...');
      var files = ['index.html', 'js/data.js', 'js/art.js', 'js/overlay.js', 'js/controls.js', 'js/device.js', 'js/app.js', 'js/amounts.js', 'js/learn.js', 'js/cutoffs.js', 'js/prep.js', 'js/functions.js', 'js/firebase-config.js', 'js/boot.js', 'js/upkeep.js', 'css/app.css'];
      // a touch in the last 600 ms (a tap whose tick comes a moment later): the book looks again 700 ms on, once that
      // tick waits to send and holds the update back (28 Oct 2026)
      var land = function () {
        if (run !== me) return;
        if (!me.tapped && Date.now() - lkTouch < 600) { setTimeout(land, 700); return; }
        if (stop()) return;
        if (navigator.onLine === false) { noSignal(); return; }
        run = null; wanted = 0; goodLook();
        try { localStorage.setItem('lk.upd.last', String(Date.now())); } catch (e) {}
        // The explicit discard decision already covered this draft, so beforeunload must not ask a second time.
        if (me.half) letGoAt = Date.now();
        location.reload();
      };
      /* Once, when every file is in (lkFresh(), all or nothing): a reload turned down (a page asks first) is not tried
         again. A file that did not come in, no answer in 8 seconds or the signal going meanwhile counts as no signal,
         unless something typed or written meanwhile stops it first. */
      lkFresh(files, 'reload').then(function (got) { if (run !== me) return; if (got) land(); else if (!stop()) noSignal(); });
    });
  }
  /* A slim strip at the top of the screen (21 Oct 2026), styled in css/app.css (.upd-bar), so it never sits with the
     toasts at the bottom. It sticks to the top while the page scrolls. */
  var barText = null, barBtn = null, calm = null;
  // a short note in the strip for 4 seconds, then the strip as it was
  function say(msg, btn) {
    if (!barText) return;
    barText.textContent = msg; barBtn.textContent = btn;
    clearTimeout(calm);
    calm = setTimeout(reset, 4000);
  }
  function reset() { barText.textContent = 'New version available.'; barBtn.textContent = 'Update now'; }
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
    b.onclick = updateNow;
    bar.appendChild(t); bar.appendChild(b); document.body.insertBefore(bar, document.getElementById('app') || document.body.firstChild);
    // the strip keeps its usual height, taller only when its words need more room (Extra large text in a wide font):
    // the bars that stick under it follow its real height (--upd-h, 48 px in css/app.css until this has measured it)
    if (window.ResizeObserver) new ResizeObserver(function () { document.documentElement.style.setProperty('--upd-h', bar.offsetHeight + 'px'); }).observe(bar);
  }
  /* Update now, and the Reload buttons of a page loaded on its own that is a different version from the book (28 Oct
     2026, LK_UPDATE.now() from js/app.js): they reloaded at once, over a change waiting to send or half a line typed.
     Now they follow Update now's rules, with the strip saying what happens, and reload into the whole new set. */
  function updateNow() {
    found = true; showBar(); goodLook();
    // a tapped update already running ("Checking the signal...", "Updating..."): the tap is ignored
    if (run && run.tapped) return;
    // a change waiting for the server (head chef, 28 Oct 2026): Update now waits, because the reload loses it, and the
    // book updates by itself at its next look once it is sent (wanted). No second tap gets past it.
    if (lkUnsent()) { wanted = Date.now(); say(UNSENT_NOTE, 'Update now'); return; }
    if (lkDirty() && consentRevision !== lkEdits) { confirmUpdate(); return; }
    beginTapped();
  }
  function beginTapped() {
    // A write can start while the discard dialog is open. Its data must be acknowledged before any reload.
    if (lkUnsent()) { wanted = Date.now(); say(UNSENT_NOTE, 'Update now'); return; }
    wanted = 0;
    try { localStorage.removeItem('lk.upd.last'); } catch (e) {}
    // the automatic update already running, the strip still saying New version available.: the tap takes it over
    if (run) { run.tapped = true; run.half = lkDirty() && consentRevision === lkEdits; run.edits = lkEdits; run.asked = 0; busy(run.files ? 'Updating...' : 'Checking the signal...'); return; }
    reloadNow(true);
  }
  function confirmUpdate() {
    if (confirmation) { confirmation.keep.focus(); return; }
    // Stop an in-flight automatic update before asking. Its callbacks are guarded by their run identity.
    run = null; wanted = 0; consentRevision = null; clearTimeout(calm); reset();
    var dialog = document.createElement('dialog'), trigger = barBtn || document.activeElement, openedHash = location.hash;
    dialog.id = 'lk-update-confirm'; dialog.className = 'ux-picker';
    dialog.setAttribute('aria-labelledby', 'lk-update-confirm-title'); dialog.setAttribute('aria-describedby', 'lk-update-confirm-note');
    var header = document.createElement('header'); header.className = 'ux-picker-head';
    var title = document.createElement('h2'); title.id = 'lk-update-confirm-title'; title.textContent = 'Unsaved changes'; header.appendChild(title);
    var body = document.createElement('div'); body.className = 'ux-picker-options';
    var note = document.createElement('p'); note.id = 'lk-update-confirm-note'; note.textContent = 'You have changes that are not saved. Discard them to update the book.'; body.appendChild(note);
    var footer = document.createElement('footer'); footer.className = 'ux-picker-footer';
    var keep = document.createElement('button'); keep.type = 'button'; keep.className = 'btn'; keep.setAttribute('data-update', 'keep'); keep.textContent = 'Keep working';
    var discard = document.createElement('button'); discard.type = 'button'; discard.className = 'btn dark'; discard.setAttribute('data-update', 'discard'); discard.textContent = 'Discard and update';
    footer.appendChild(keep); footer.appendChild(discard); dialog.appendChild(header); dialog.appendChild(body); dialog.appendChild(footer);
    var closeHistory = null, fromHistory = false;
    function finish(update) {
      if (!confirmation || confirmation.dialog !== dialog) return;
      confirmation = null; dialog.close(); dialog.remove();
      if (closeHistory) closeHistory(fromHistory || location.hash !== openedHash);
      if (trigger && trigger.isConnected) trigger.focus({ preventScroll: true });
      if (update) { consentRevision = lkEdits; beginTapped(); }
      else { wanted = 0; consentRevision = null; reset(); }
    }
    confirmation = { dialog: dialog, keep: keep, close: function () { finish(false); } };
    keep.onclick = function () { finish(false); };
    discard.onclick = function () { finish(true); };
    dialog.addEventListener('cancel', function (e) { e.preventDefault(); finish(false); });
    dialog.addEventListener('click', function (e) {
      if (e.target !== dialog) return;
      var r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) finish(false);
    });
    dialog.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); finish(false); return; }
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === keep) { e.preventDefault(); discard.focus(); }
        else if (!e.shiftKey && document.activeElement === discard) { e.preventDefault(); keep.focus(); }
      }
    });
    document.body.appendChild(dialog); dialog.showModal();
    if (window.LK_PREP && window.LK_PREP.pickerOverlay) closeHistory = window.LK_PREP.pickerOverlay(function () { fromHistory = true; finish(false); });
    keep.focus();
  }
  function resumeWanted() {
    if (!wanted || run || confirmation || Date.now() < nextTry || lkUnsent() || lkEditing()) return;
    if (lkDirty() && consentRevision !== lkEdits) return;
    var asked = wanted; wanted = 0;
    try { localStorage.removeItem('lk.upd.last'); } catch (e) {}
    clearTimeout(calm); reset();
    reloadNow(false, false, asked);
  }
  // Acknowledgement handlers finish their forms in promise callbacks. Recheck after those callbacks settle.
  function resumeSoon() { clearTimeout(resumeTimer); resumeTimer = setTimeout(resumeWanted, 100); }
  window.addEventListener('lk-sent', resumeSoon);
  window.addEventListener('hashchange', function () { consentRevision = null; if (confirmation) confirmation.close(); });
  /* Words typed on the prep pages make a reload or closing the tab ask first (typedHere() in js/prep.js, 28 Oct 2026).
     The reload after Discard and update is the one the person already said yes to, so for a moment
     around it letGo() is true and the book does not ask again. Date.now(): time passing on the phone. */
  var letGoAt = 0;
  window.LK_UPDATE = { now: updateNow, letGo: function () { return !!letGoAt && Date.now() - letGoAt < 3000; } };
  function check(returned) {
    lastCheck = Date.now();
    Promise.all([stamp(), savedAt]).then(function (x) {
      var s = x[0], was = x[1];
      if (!s || s === '|') return;
      // the first answer: the saved copy this page opened from, or with none the version running
      if (base === null) base = was && was !== '|' ? was : s;
      // back after 5 minutes away with an update already found (the worker's lk-new, so the server's stamp is the one
      // this look already knew): it updates now, as it does for a stamp that changed. It used to wait for 2 minutes
      // untouched, so a cook who tapped straight away kept the old version.
      if (s === base) { if (found && returned && !lkTyping()) reloadNow(false, true); return; }
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
      if (confirmation) return;
      // the last update found no signal: wait longer before asking the server again (see failedLook())
      if (Date.now() < nextTry) return;
      // Update now tapped while a change waited: the update it asked for, once the change is sent (see wanted)
      if (wanted) resumeWanted();
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
