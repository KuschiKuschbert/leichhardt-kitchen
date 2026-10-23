/* Leichhardt Kitchen Book service worker.
   Saved copy first (21 Oct 2026): the book's own files come from the copy kept on the phone, so the book opens at once
   even on weak kitchen wifi. Each time the book opens, the worker asks the server for the newest copy of every file in
   the background (a small "has it changed?" request each). Only when every file came in is the saved copy replaced, so a
   phone never mixes old and new files. If anything changed it tells the open book, which updates itself (js/upkeep.js).
   A file fetched with the X-LK-Fresh header (the update and the 04:00 refresh, js/upkeep.js) goes to the network first.
   With no saved copy yet, or a file that is not saved, it goes to the network and keeps what comes back.
   Google Fonts and the Firebase files are kept once loaded. The prep list, orders and wastage talk to Firebase directly
   (it has its own offline copy of the data), so those requests are not touched. */
var CACHE = 'lk-book-v8';
var SHELL = ['./', './index.html', 'css/app.css', 'js/data.js', 'js/art.js', 'js/overlay.js', 'js/app.js', 'js/amounts.js', 'js/learn.js', 'js/cutoffs.js', 'js/prep.js', 'js/functions.js', 'js/firebase-config.js', 'js/boot.js', 'js/upkeep.js', 'icon.svg', 'manifest.webmanifest', 'icons/icon-192.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
function stamp(res) { return res ? (res.headers.get('etag') || '') + '|' + (res.headers.get('last-modified') || '') : ''; }
/* Fetches every saved file again (the browser asks the server whether it changed). All or nothing: one failure keeps the
   old copy. Then, if any file is new, every open book is told. One round at a time, 30 s at most. */
var fresh = null, again = false;
function freshen() {
  // opened again while a round is running: one more round straight after it, so the newest files are not missed
  if (fresh) { again = true; return fresh; }
  // a round that hangs (wifi that drops halfway) gives up after 30 s, so the next opening tries again
  var stop = new Promise(function (res, rej) { setTimeout(function () { rej(new Error('slow')); }, 30000); });
  var done = function () { fresh = null; if (again) { again = false; return freshen(); } };
  fresh = Promise.race([freshRound(), stop]).then(done, done);
  return fresh;
}
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
  var nav = r.mode === 'navigate', key = nav ? './index.html' : r;
  function net() {
    return fetch(r).then(function (res) {
      if (res.ok && !u.search) { var c = res.clone(); caches.open(CACHE).then(function (ca) { ca.put(key, c); }); }
      return res;
    });
  }
  function saved() { return caches.match(key, { ignoreSearch: true }); }
  // the update and the 04:00 refresh fetch each file with the X-LK-Fresh header before reloading: network first, the
  // saved copy only with no signal. Everything else opens from the saved copy, also on a pull-to-refresh, because those
  // fetches have already saved the new files when the book reloads for an update. (The browser's own cache mode is no
  // guide: a reload, and every request in the click tests, says "reload" or "no-cache".)
  if (!nav && (r.headers.get('X-LK-Fresh') === '1' || u.search)) {
    e.respondWith(net().catch(function () { return saved().then(function (m) { return m || (nav ? caches.match('./index.html') : undefined); }); }));
    return;
  }
  if (nav) e.waitUntil(freshen());
  e.respondWith(saved().then(function (m) { return m || net(); }));
});
/* Phone pushes for order cut-offs (24 Oct 2026): scripts/cutoff-push.mjs sends them through Firebase Cloud Messaging
   with data only (title, body, tag), and the worker shows them. Every push shows a notification (iPhones stop pushes to
   a book that does not). A tap opens the order list: a fixed route, never an address from the push. */
self.addEventListener('push', function (e) {
  var d = {};
  try { var j = e.data ? e.data.json() : {}; d = (j && (j.data || j.notification)) || {}; } catch (x) {}
  var title = String(d.title || 'Kitchen Book').slice(0, 80), body = String(d.body || '').slice(0, 200), tag = String(d.tag || 'lk-cut').slice(0, 60);
  e.waitUntil(self.registration.showNotification(title, { body: body, tag: tag, renotify: true, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = new URL('./#/orders', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    var c = cs[0];
    if (c && c.focus) return c.focus().then(function (w) { return w && w.navigate ? w.navigate(url) : w; });
    return self.clients.openWindow(url);
  }));
});
