/* Leichhardt Kitchen Book service worker.
   Network first for the book's own files, so staff always get the newest cards when online;
   the last copy is kept so the book still opens with no signal. Google Fonts are kept once loaded.
   The prep list, orders and wastage talk to Firebase directly (it has its own offline copy), so those are not touched. */
var CACHE = 'lk-book-v3';
var SHELL = ['./', './index.html', 'css/app.css', 'js/data.js', 'js/art.js', 'js/app.js', 'js/prep.js', 'js/firebase-config.js', 'icon.svg', 'manifest.webmanifest', 'icons/icon-192.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var u = new URL(r.url);
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.match(r).then(function (m) {
      return m || fetch(r).then(function (res) { if (res.ok || res.type === 'opaque') { var c = res.clone(); caches.open(CACHE).then(function (ca) { ca.put(r, c); }); } return res; });
    }));
    return;
  }
  if (u.origin !== self.location.origin) return;
  e.respondWith(fetch(r).then(function (res) {
    if (res.ok && !u.search) { var c = res.clone(); caches.open(CACHE).then(function (ca) { ca.put(r.mode === 'navigate' ? './index.html' : r, c); }); }
    return res;
  }).catch(function () {
    return caches.match(r, { ignoreSearch: true }).then(function (m) { return m || (r.mode === 'navigate' ? caches.match('./index.html') : undefined); });
  }));
});
