/* Leichhardt Kitchen Book service worker.
   Saved copy first (21 Oct 2026): the book's own files come from the copy kept on the phone, so the book opens at once
   even on weak kitchen wifi. Each time the book opens, the worker asks the server for the newest copy of every file in
   the background (a small "has it changed?" request each). Only when every file came in is the saved copy replaced, so a
   phone never mixes old and new files. If anything changed it tells the open book, which updates itself (js/upkeep.js).
   The update and the 04:00 refresh (js/upkeep.js) ask the worker for the same round and wait for its answer (28 Oct
   2026), so they reload only into a whole new set. A file fetched with the X-LK-Fresh header (a page's script loader,
   js/app.js mgScript()) goes to the network first, past the browser's own copy. With no saved copy yet, or a file that
   is not saved, it goes to the network and keeps what comes back. A page's script with its version (js/manage.js?v=4)
   is kept under its plain address, so the pages loaded only when they open (Manage recipes, Delivery received, Supplier
   order and the others) open with no signal too, once they have opened with it. A start file (SHELL) is never loaded
   with a version.
   Google Fonts and the Firebase files are kept once loaded. The prep list, orders and wastage talk to Firebase directly,
   so those requests are not touched: their data is never kept here (since 26 Oct 2026, #387, Firebase keeps it in the
   tab's memory only). */
var CACHE = 'lk-book-v8';
var SHELL = ['./', './index.html', 'css/app.css', 'js/data.js', 'js/art.js', 'js/overlay.js', 'js/controls.js', 'js/app.js', 'js/amounts.js', 'js/learn.js', 'js/cutoffs.js', 'js/prep.js', 'js/functions.js', 'js/firebase-config.js', 'js/boot.js', 'js/upkeep.js', 'icon.svg', 'manifest.webmanifest', 'icons/icon-192.png'];
self.addEventListener('install', function (e) {
  // past the browser's own cache (28 Oct 2026): GitHub Pages lets it keep a file for 10 minutes, so a new worker could
  // save files from before a deploy next to new ones over the saved copy every opening uses
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL.map(function (f) { return new Request(f, { cache: 'no-cache' }); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
function stamp(res) { return res ? (res.headers.get('etag') || '') + '|' + (res.headers.get('last-modified') || '') : ''; }
/* Fetches every saved file again (the browser asks the server whether it changed). All or nothing: one failure keeps the
   old copy. Then, if any file is new, every open book is told. One round at a time, 30 s at most. Gives true when every
   file came in (in the round after it too, when one was asked for meanwhile), false when the old copy was kept. */
var fresh = null, again = false;
function freshen() {
  // opened again while a round is running: one more round straight after it, so the newest files are not missed
  if (fresh) { again = true; return fresh; }
  // a round that hangs (wifi that drops halfway) gives up after 30 s, so the next opening tries again
  var stop = new Promise(function (res, rej) { setTimeout(function () { rej(new Error('slow')); }, 30000); });
  var done = function (ok) { fresh = null; if (again) { again = false; return freshen(); } return ok; };
  fresh = Promise.race([freshRound(), stop]).then(function () { return done(true); }, function () { return done(false); });
  return fresh;
}
/* The update and the 04:00 refresh (lkFresh() in js/upkeep.js, 28 Oct 2026) ask for a round before they reload, and
   reload only on { ok: true }: before, they fetched each file themselves and every file that came in was saved at once,
   so on a weak signal the book, and the saved copy every later opening uses, could mix a new js/app.js with an old
   js/prep.js. */
self.addEventListener('message', function (e) {
  var port = e.ports && e.ports[0];
  if (!port || !e.data || e.data.lk !== 'fresh') return;
  // started at once, so the page can tell this worker from one before 28 Oct 2026, which has no round and never
  // answers: the page then fetches the files itself, the way the book did before (lkFresh() in js/upkeep.js)
  port.postMessage({ started: true });
  e.waitUntil(freshen().then(function (ok) { port.postMessage({ ok: ok === true }); }));
});
function freshRound() {
  var files = SHELL.filter(function (f) { return f !== './'; });
  return caches.open(CACHE).then(function (c) {
    return Promise.all(files.map(function (f) {
      return Promise.all([fetch(f, { cache: 'no-cache' }), c.match(f)]).then(function (x) {
        if (!x[0].ok) throw new Error('not ok');
        return { f: f, res: x[0], changed: !!x[1] && stamp(x[0]) !== stamp(x[1]), missing: !x[1] };
      });
    })).then(function (got) {
      // only the files that changed (or were not saved yet) are written: before, all of them were written on every
      // opening, about 2.4 MB each time (22 Oct 2026). Still all or nothing: nothing is written until every file came in.
      return Promise.all(got.filter(function (g) { return g.changed || g.missing; }).map(function (g) { return c.put(g.f, g.res); })).then(function () {
        if (got.some(function (g) { return g.changed; })) return self.clients.matchAll({ type: 'window' }).then(function (cs) { cs.forEach(function (cl) { cl.postMessage('lk-new'); }); });
      });
    });
  });
}
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var u = new URL(r.url);
  // Google Fonts, and the Firebase files the prep pages load (22 Oct 2026, review P5): kept once loaded, then handed out
  // from the saved copy. A Firebase file's address carries its version, so a kept file never goes out of date; a new
  // version is a new address, and the old one goes when CACHE changes. Before, they were only in the browser's own cache,
  // so a phone whose browser cache had been cleared could not open the prep list with no signal.
  var fbFile = u.hostname === 'www.gstatic.com' && /^\/firebasejs\/[^/]+\/[^/]+\.js$/.test(u.pathname);
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com' || fbFile) {
    e.respondWith(caches.match(r).then(function (m) {
      return m || fetch(r).then(function (res) { if (res.ok || (res.type === 'opaque' && !fbFile)) { var c = res.clone(); caches.open(CACHE).then(function (ca) { ca.put(r, c); }); } return res; });
    }));
    return;
  }
  if (u.origin !== self.location.origin) return;
  var nav = r.mode === 'navigate', key = nav ? './index.html' : r, asked = r.headers.get('X-LK-Fresh') === '1';
  // a page's script with its version (js/manage.js?v=4, js/suppliers.js?v=8, 28 Oct 2026): kept under its plain address,
  // one copy per file, so it opens with no signal once it has opened with it. Before, nothing with a ? was kept, so those
  // pages said they could not open with no signal even after a visit. A newer one still comes from the network first,
  // and each page checks the version it got (MG_API, FE_API, SUP_API in js/app.js and the files' own API).
  // Never a start file (SHELL) with a version: kept under its plain address it would replace the saved shell one file at
  // a time, outside the all-or-nothing round. Nothing loads one that way; if something did, it goes to the network and
  // is not kept.
  var lazy = /^\?v=\d{1,4}$/.test(u.search) && /\.js$/.test(u.pathname) && !SHELL.some(function (f) { return new URL(f, self.location).pathname === u.pathname; });
  function net() {
    // asked for the newest, or a page's script with its version: past the browser's own copy too (28 Oct 2026). GitHub
    // Pages lets the browser keep a file for 10 minutes, so after an update a page opened again ran its old scripts, and
    // the worker kept those for no signal. A file that did not change is a small "not changed" answer.
    return fetch(asked || lazy ? new Request(r, { cache: 'no-cache' }) : r).then(function (res) {
      if (!res.ok || (u.search && !lazy)) return res;
      var c = res.clone(), put = caches.open(CACHE).then(function (ca) { return ca.put(lazy ? u.origin + u.pathname : key, c); });
      // asked for the newest (X-LK-Fresh): answered once it is saved, so the script tag that follows gets this copy
      // and not the older one (js/library.js, js/lib/*.js, js/smart.js and js/compose.js have no version to check)
      if (asked) return put.then(function () { return res; }, function () { return res; });
      try { e.waitUntil(put.catch(function () {})); } catch (x) {}
      return res;
    });
  }
  function saved() { return caches.match(key, { ignoreSearch: true }); }
  // a file asked for with the X-LK-Fresh header, or with a ?: network first, the saved copy only with no signal.
  // Everything else opens from the saved copy, also on a pull-to-refresh, because the update has already saved the new
  // files (freshen()) when the book reloads into them. (The browser's own cache mode is no guide: a reload, and every
  // request in the click tests, says "reload" or "no-cache".)
  if (!nav && (asked || u.search)) {
    e.respondWith(net().catch(function () { return saved().then(function (m) { return m || (nav ? caches.match('./index.html') : undefined); }); }));
    return;
  }
  if (nav) e.waitUntil(freshen());
  e.respondWith(saved().then(function (m) { return m || net(); }));
});
/* Phone pushes for order cut-offs (24 Oct 2026): scripts/cutoff-push.mjs sends them through Firebase Cloud Messaging
   with data only, and the worker shows them. A validated cut-off ID and date open its supplier sheet. Older pushes
   open the order list. No URL or arbitrary route from a push is ever followed. */
function supplierPushData(d) {
  return d && typeof d.sid === 'string' && /^[a-z0-9-]{1,40}$/.test(d.sid) && typeof d.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.day) ? { sid: d.sid, day: d.day } : {};
}
self.addEventListener('push', function (e) {
  var d = {};
  try { var j = e.data ? e.data.json() : {}; d = (j && (j.data || j.notification)) || {}; } catch (x) {}
  var title = String(d.title || 'Kitchen Book').slice(0, 80), body = String(d.body || '').slice(0, 200), tag = String(d.tag || 'lk-cut').slice(0, 60);
  e.waitUntil(self.registration.showNotification(title, { body: body, tag: tag, renotify: true, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: supplierPushData(d) }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var data = supplierPushData(e.notification.data), path = data.sid ? './#/suppliers/cutoff/' + encodeURIComponent(data.sid) + '/' + data.day : './#/orders';
  var url = new URL(path, self.registration.scope).href;
  // a window of the book this worker runs (other pages share the origin on GitHub Pages, and only such a window can be
  // moved): brought forward, then moved to the order list (Chrome lets navigate run after focus; Firefox may never answer a
  // move within the page, so it is not waited on past 3 seconds). No such window: a new one opens on the order list.
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(function (cs) {
    var c = cs.filter(function (x) { return x.url.indexOf(self.registration.scope) === 0; })[0];
    if (!c) return self.clients.openWindow(url);
    return c.focus().then(function (w) {
      return Promise.race([(w || c).navigate(url), new Promise(function (r) { setTimeout(r, 3000); })]);
    }).catch(function () {});
  }));
});
