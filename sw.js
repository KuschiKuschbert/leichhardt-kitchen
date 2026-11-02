/* The saved public shell is an immutable complete generation (2 Nov 2026). CacheStorage holds bodies; one tiny
   IndexedDB transaction selects the active generation and owns each refresh ticket. Independent Cache.put calls
   cannot publish an all-or-nothing update, and an expired round must never select files after a newer round.
   lk-book-v8 retains already saved lazy modules, Firebase files and fonts. Neither store holds kitchen records. */
var CACHE = 'lk-book-v8';
var SHELL = ['./', './index.html', 'css/app.css', 'js/data.js', 'js/art.js', 'js/overlay.js', 'js/controls.js', 'js/device.js', 'js/app.js', 'js/amounts.js', 'js/learn.js', 'js/cutoffs.js', 'js/prep.js', 'js/functions.js', 'js/firebase-config.js', 'js/boot.js', 'js/upkeep.js', 'icon.svg', 'manifest.webmanifest', 'icons/icon-192.png', 'js/seasonal/au-global.js', 'js/seasonal/india.js', 'js/seasonal/nepal.js', 'js/seasonal/bali.js', 'js/seasonal/philippines.js', 'js/seasonal/catalog.js', 'js/seasonal/motion-policy.js', 'js/seasonal/calendar.js', 'js/seasonal/theme-brand.js', 'js/seasonal/theme-effects.js', 'js/seasonal/celebration-copy.js', 'js/seasonal/celebration-ticker.js', 'js/seasonal/theme-bridge.js', 'js/seasonal/seasonal.js', 'css/seasonal-brand.css', 'css/seasonal-effects.css', 'css/celebration-ticker.css', 'css/seasonal.css', 'fonts/NotoSansDevanagari-Regular.ttf', 'fonts/NotoSansDevanagari-Bold.ttf'];
var SHELL_DB = 'lk-shell-v1-' + encodeURIComponent(new URL(self.registration.scope).pathname);
var SHELL_PREFIX = SHELL_DB + '-', shellDBPromise = null, shellState = null, shellPins = {};
var shellFiles = SHELL.filter(function (f) { return f !== './'; });
var stateKey = new URL('__lk-shell-state', self.registration.scope).href;
var pinPrefix = new URL('__lk-shell-client/', self.registration.scope).href;
function pinKey(id) { return pinPrefix + encodeURIComponent(id); }
function shellDB() {
  if (!shellDBPromise) shellDBPromise = new Promise(function (resolve, reject) {
    var request = indexedDB.open(SHELL_DB, 1);
    request.onupgradeneeded = function () { request.result.createObjectStore('meta'); };
    request.onsuccess = function () {
      var db = request.result; db.onversionchange = function () { db.close(); shellDBPromise = null; }; resolve(db);
    };
    request.onerror = request.onblocked = function () { shellDBPromise = null; reject(request.error || new Error('Saved-copy metadata unavailable')); };
  });
  return shellDBPromise;
}
function shellMeta(mode, round, work) {
  return shellDB().then(function (db) { return new Promise(function (resolve, reject) {
    if (round && !round.alive) { reject(new Error('Expired shell round')); return; }
    var tx = db.transaction('meta', mode), result;
    if (round) round.tx = tx;
    tx.oncomplete = function () {
      if (round) { round.tx = null; if (result && result.active === round.name) round.committed = true; }
      resolve(result);
    };
    tx.onerror = tx.onabort = function () { if (round) round.tx = null; reject(tx.error || new Error('Saved-copy metadata not written')); };
    work(tx.objectStore('meta'), function (value) { result = value; });
  }); });
}
function readShellState() {
  return shellMeta('readonly', null, function (store, done) { var q = store.get('state'); q.onsuccess = function () { done(q.result || { active: CACHE, previous: '', ticket: 0 }); }; }).then(function (state) { if (state.active && state.active.indexOf(SHELL_PREFIX) === 0) shellState = state; return state; });
}
function mirrorShell(state) {
  // A best-effort public pointer mirror allows a coherent last-good launch if metadata storage later becomes blocked.
  // It may be older than IndexedDB. It is never a source of refresh ownership or permission.
  return caches.open(CACHE).then(function (cache) { return cache.put(stateKey, new Response(JSON.stringify(state), { headers: { 'Content-Type': 'application/json' } })); }).catch(function () {});
}
function fallbackShellState() {
  if (shellState) return Promise.resolve(shellState);
  return caches.open(CACHE).then(function (cache) { return cache.match(stateKey); }).then(function (r) { return r ? r.json() : null; }).catch(function () { return null; }).then(function (s) { return s || { active: CACHE, previous: '' }; });
}
function stamp(res) { return res ? (res.headers.get('etag') || '') + '|' + (res.headers.get('last-modified') || '') : ''; }
function completeShell(name) {
  if (!name) return Promise.resolve(null);
  return caches.has(name).then(function (has) { if (!has) return null; return caches.open(name).then(function (cache) {
    return cache.keys().then(function (keys) {
      var urls = keys.map(function (key) { return key.url; });
      return shellFiles.every(function (file) { return urls.indexOf(new URL(file, self.registration.scope).href) >= 0; }) ? { name: name, cache: cache } : null;
    });
  }); });
}
function chooseShell() {
  return readShellState().then(function (state) { return state.active && state.active.indexOf(SHELL_PREFIX) === 0 ? state : fallbackShellState(); }).catch(fallbackShellState).then(function (state) {
    var names = [state.active, state.previous].filter(function (name) { return typeof name === 'string' && name.indexOf(SHELL_PREFIX) === 0; });
    function next(i) { return i >= names.length ? null : completeShell(names[i]).then(function (copy) { return copy || next(i + 1); }); }
    return next(0);
  });
}
function mirrorShellPin(id, pin) {
  return caches.open(CACHE).then(function (cache) { return cache.put(pinKey(id), new Response(JSON.stringify(pin), { headers: { 'Content-Type': 'application/json' } })); }).catch(function () {});
}
function keepShellPin(id, name) {
  if (!id) return Promise.resolve();
  var pin = { cache: name, at: Date.now() }; shellPins[id] = pin;
  // Opaque browser client id and public cache name only. Never save a URL, hash route, person or booking id.
  return shellMeta('readwrite', null, function (store) { store.put(pin, 'client:' + id); }).catch(function () {}).then(function () { return mirrorShellPin(id, pin); });
}
function shellPinValid(pin) { return pin && typeof pin.cache === 'string' && pin.cache.indexOf(SHELL_PREFIX) === 0; }
function readShellPinMirror(id) { return caches.open(CACHE).then(function (cache) { return cache.match(pinKey(id)); }).then(function (response) { return response ? response.json() : null; }).catch(function () { return null; }); }
function shellForClient(id) {
  // A system request (for example a notification icon) has no loaded document whose generation could be mixed.
  if (!id) return chooseShell().then(function (copy) { return copy ? copy.cache : null; });
  if (shellPins[id]) return caches.open(shellPins[id].cache);
  return shellMeta('readonly', null, function (store, done) { var q = store.get('client:' + id); q.onsuccess = function () { done(q.result); }; }).catch(function () { return null; }).then(function (pin) {
    if (shellPinValid(pin)) return pin;
    // A transient primary-write failure can leave a mirror even when a later primary read succeeds but is empty.
    // An unknown existing document must never be attached to whichever generation happens to be active now.
    return readShellPinMirror(id);
  }).then(function (pin) {
    if (!shellPinValid(pin)) return null;
    shellPins[id] = pin; return caches.open(pin.cache);
  });
}
function warnShell(e) {
  var client = e.source ? Promise.resolve(e.source) : e.clientId ? self.clients.get(e.clientId) : Promise.resolve(null);
  return client.then(function (page) { if (page) page.postMessage('lk-shell-unavailable'); }).catch(function () {});
}
function shellNavigation(e) {
  return chooseShell().then(function (copy) {
    if (!copy) return new Response('The saved book is incomplete. Open it with signal to repair it.', { status: 503 });
    return keepShellPin(e.resultingClientId || e.clientId, copy.name).then(function () { return copy.cache.match('./index.html'); });
  });
}
function shellCleanup() {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
    var live = clients.filter(function (c) { return c.url.indexOf(self.registration.scope) === 0; }).map(function (c) { return c.id; });
    return shellMeta('readwrite', null, function (store, done) {
      var q = store.getAll(), k = store.getAllKeys();
      k.onsuccess = function () {
        var records = q.result, keys = k.result, state = {}, keep = {}, recent = [];
        keys.forEach(function (key, i) { if (key === 'state') state = records[i]; if (key === 'install') keep[records[i].name] = true; });
        keep[state.active] = keep[state.previous] = true;
        keys.forEach(function (key, i) {
          if (String(key).indexOf('client:') !== 0) return;
          var pin = records[i], id = key.slice(7);
          if (live.indexOf(id) >= 0) keep[pin.cache] = true;
          else recent.push({ key: key, pin: pin });
        });
        // Keep at most 32 recent navigation ids while new clients become visible to clients.matchAll.
        recent.sort(function (a, b) { return b.pin.at - a.pin.at; }).forEach(function (row, i) {
          if (i < 32 && Date.now() - row.pin.at < 60000) keep[row.pin.cache] = true;
          else { store.delete(row.key); delete shellPins[row.key.slice(7)]; }
        });
        if (fresh && fresh.alive) keep[fresh.name] = true;
        done(keep);
      };
    });
  }).then(function (keep) {
    return caches.open(CACHE).then(function (cache) { return cache.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) { return key.url.indexOf(pinPrefix) === 0; }).map(function (key) {
        return cache.match(key).then(function (response) { return response.json(); }).then(function (pin) { return { key: key, pin: pin, id: decodeURIComponent(key.url.slice(pinPrefix.length)) }; });
      }));
    }).then(function (pins) {
      var orphan = 0;
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
        var ids = clients.map(function (client) { return client.id; });
        return Promise.all(pins.sort(function (a, b) { return b.pin.at - a.pin.at; }).map(function (row) {
          if (ids.indexOf(row.id) >= 0 || orphan++ < 32 && Date.now() - row.pin.at < 60000) { keep[row.pin.cache] = true; return; }
          return cache.delete(row.key);
        }));
      });
    }); }).then(function () { return caches.keys().then(function (names) { return Promise.all(names.filter(function (name) {
    // A just-created install may not have registered its completed generation yet. Never collect another worker's work.
    var born = parseInt(name.slice(SHELL_PREFIX.length).split('-')[0], 36);
    return name.indexOf(SHELL_PREFIX) === 0 && !keep[name] && Date.now() - born > 60000;
  }).map(function (name) { return caches.delete(name); })); }); }); }).catch(function () {});
}
var fresh = null;
function expireShell(round) {
  if (!round.alive || round.committed) return;
  round.alive = false;
  try { round.controller.abort(); } catch (e) {}
  if (round.tx) {
    // A transaction may have committed before its completion event is delivered. Let that event decide whether
    // this generation is active; deleting its bodies before the acknowledgement could erase the last-good copy.
    try { round.tx.abort(); } catch (e) {}
    return;
  }
  caches.delete(round.name).catch(function () {});
}
function shellRound(install) {
  var round = { name: SHELL_PREFIX + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2), alive: true, committed: false, started: Date.now(), controller: new AbortController(), tx: null };
  var timer;
  var timeout = new Promise(function (resolve) { timer = setTimeout(function () { expireShell(round); resolve(false); }, 30000); });
  round.promise = Promise.race([freshRound(round, install), timeout]).then(function (ok) {
    clearTimeout(timer);
    if (!ok) expireShell(round);
    if (fresh === round) fresh = null;
    return !!ok;
  }, function () { clearTimeout(timer); expireShell(round); if (fresh === round) fresh = null; return false; });
  return round;
}
function freshen(manual) {
  // Update retry does not join a background round already older than the page's eight-second wait.
  if (fresh && fresh.alive) {
    if (!manual || Date.now() - fresh.started < 8000) return fresh.promise;
    expireShell(fresh);
  }
  fresh = shellRound(false); return fresh.promise;
}
function freshRound(round, install) {
  var old, stage, changed = false;
  function alive() { if (!round.alive) throw new Error('Expired shell round'); }
  var job = (install ? Promise.resolve() : shellMeta('readwrite', round, function (store, done) {
    var q = store.get('state'); q.onsuccess = function () { var s = q.result || { active: CACHE, previous: '', ticket: 0 }; s.ticket = (s.ticket || 0) + 1; round.ticket = s.ticket; store.put(s, 'state'); done(s); };
  })).then(function () { alive(); return chooseShell(); }).then(function (copy) {
    old = copy;
    return Promise.all(shellFiles.map(function (file) {
      return Promise.all([fetch(file, { cache: 'no-cache', signal: round.controller.signal }), old ? old.cache.match(file) : null]).then(function (pair) {
        alive(); if (!pair[0].ok) throw new Error('Shell file unavailable');
        if (!pair[1] || stamp(pair[0]) !== stamp(pair[1])) changed = true;
        // Drain each body while the other requests arrive. Holding many unread responses can exhaust the browser's
        // connection slots before the final file starts. No saved generation changes while these bytes are prepared.
        var response = pair[0];
        return response.arrayBuffer().then(function (body) {
          alive(); return { file: file, response: new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers }) };
        });
      });
    }));
  }).then(function (files) {
    alive();
    if (!install && !changed) return true;
    return caches.open(round.name).then(function (cache) {
      alive(); stage = cache;
      return Promise.all(files.map(function (file) { return stage.put(file.file, file.response); }));
    }).then(function () {
      alive();
      return shellMeta('readwrite', round, function (store, done) {
        if (install) { store.put({ name: round.name }, 'install'); done(true); return; }
        var q = store.get('state'); q.onsuccess = function () {
          var state = q.result; if (!round.alive || !state || state.ticket !== round.ticket) { done(false); return; }
          var next = { active: round.name, previous: old && old.name !== CACHE ? old.name : '', ticket: state.ticket };
          store.put(next, 'state'); done(next);
        };
      }).then(function (state) {
        if (install) return true;
        if (!state) return false;
        shellState = state;
        if (!round.alive) return true;
        return mirrorShell(state).then(function () { return self.clients.matchAll({ type: 'window' }); }).then(function (clients) {
          clients.forEach(function (client) { client.postMessage('lk-new'); }); return true;
        }, function () { return true; });
      });
    });
  });
  return job.then(function (ok) {
    if (!ok || !install && !changed) return caches.delete(round.name).then(function () { return ok; });
    return ok;
  }, function (error) { if (round.committed) throw error; return caches.delete(round.name).then(function () { throw error; }); });
}
self.addEventListener('install', function (e) {
  // Prepare without changing the old worker's active copy. Activation owns the single publication transaction.
  var round = shellRound(true);
  e.waitUntil(round.promise.then(function (ok) { if (!ok) throw new Error('Complete shell not saved'); return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  var activationPins = [], legacyClients = [];
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (all) {
    var clients = all.filter(function (client) { return client.url.indexOf(self.registration.scope) === 0; });
    return Promise.all(clients.map(function (client) { return readShellPinMirror(client.id); })).then(function (mirrors) {
      return caches.open(CACHE).then(function (cache) { return cache.match('./index.html'); }).then(function (legacyIndex) {
        return shellMeta('readwrite', null, function (store, done) {
          var install = store.get('install'); install.onsuccess = function () {
            if (!install.result) throw new Error('No prepared shell');
            var q = store.get('state'); q.onsuccess = function () {
              var state = q.result || { ticket: 0 }, name = install.result.name;
              clients.forEach(function (client, i) {
                var pin = store.get('client:' + client.id); pin.onsuccess = function () {
                  var binding = shellPinValid(pin.result) ? pin.result : shellPinValid(mirrors[i]) ? mirrors[i] : null;
                  if (binding) {
                    store.put(binding, 'client:' + client.id); activationPins.push({ id: client.id, pin: binding });
                  } else {
                    // The previous deployed worker may still write lk-book-v8. Its existing documents cannot be
                    // assigned an immutable generation retrospectively. Offer the normal guarded update instead.
                    store.delete('client:' + client.id); if (legacyIndex) legacyClients.push(client);
                  }
                };
              });
              var next = { active: name, previous: state.active && state.active !== CACHE ? state.active : '', ticket: (state.ticket || 0) + 1 };
              store.put(next, 'state'); store.delete('install'); done(next);
            };
          };
        });
      });
    });
  }).then(function (state) {
    shellState = state;
    return Promise.all([mirrorShell(state)].concat(activationPins.map(function (binding) { return mirrorShellPin(binding.id, binding.pin); })));
  }).then(function () {
    // This is a successfully installed new version. Old clients understand lk-new and retain their existing
    // typing/pending-write safeguards. Missing-binding warnings on their own never request a reload.
    legacyClients.forEach(function (client) { client.postMessage('lk-new'); });
    return shellCleanup();
  }));
  // Do not claim an uncontrolled document midway through network HTML and deferred scripts. Existing controlled
  // tabs adopt the activated worker normally; a first visit uses this complete shell on its next navigation.
});
self.addEventListener('message', function (e) {
  var port = e.ports && e.ports[0];
  if (!port || !e.data) return;
  if (e.data.lk === 'opened') {
    port.postMessage({ started: true });
    e.waitUntil(shellForClient(e.source && e.source.id).then(function (cache) { return cache ? cache.match('./index.html') : null; }).then(function (r) {
      if (!r) warnShell(e);
      port.postMessage({ modified: r ? r.headers.get('last-modified') || '' : '', etag: r ? r.headers.get('etag') || '' : '' });
    }));
  } else if (e.data.lk === 'fresh') {
    port.postMessage({ started: true });
    e.waitUntil(freshen(true).then(function (ok) { port.postMessage({ ok: ok === true }); return shellCleanup(); }));
  }
});
self.addEventListener('fetch', function (e) {
  var r = e.request; if (r.method !== 'GET') return;
  var u = new URL(r.url), local = u.origin === self.location.origin;
  var fbFile = u.hostname === 'www.gstatic.com' && /^\/firebasejs\/[^/]+\/[^/]+\.js$/.test(u.pathname);
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com' || fbFile) {
    e.respondWith(caches.open(CACHE).then(function (cache) { return cache.match(r).then(function (saved) {
      return saved || fetch(r).then(function (response) {
        if (response.ok || response.type === 'opaque' && !fbFile) e.waitUntil(cache.put(r, response.clone()).catch(function () {}));
        return response;
      });
    }); })); return;
  }
  if (!local) return;
  var nav = r.mode === 'navigate', asked = r.headers.get('X-LK-Fresh') === '1';
  var shell = shellFiles.some(function (file) { return new URL(file, self.registration.scope).pathname === u.pathname; });
  if (nav) {
    e.respondWith(shellNavigation(e)); e.waitUntil(freshen().then(shellCleanup)); return;
  }
  if (shell && !u.search && !asked) {
    e.respondWith(shellForClient(e.clientId).then(function (cache) { return cache ? cache.match(r) : null; }).then(function (copy) {
      // A missing pinned member must not be replaced individually from a different deployment.
      if (copy) return copy;
      e.waitUntil(warnShell(e));
      return new Response('This saved book file is unavailable. Keep unfinished work open and retry the update.', { status: 503 });
    })); return;
  }
  // Versioned startup files are deliberately never kept individually. Lazy versions share one plain saved address.
  var lazy = /^\?v=\d{1,4}$/.test(u.search) && /\.js$/.test(u.pathname) && !shell;
  var key = lazy ? u.origin + u.pathname : r;
  function saved() { return caches.open(CACHE).then(function (cache) { return cache.match(key, { ignoreSearch: true }); }); }
  function net() {
    return fetch(asked || lazy ? new Request(r, { cache: 'no-cache' }) : r).then(function (response) {
      if (!response.ok || shell || u.search && !lazy) return response;
      var copy = response.clone(), put = caches.open(CACHE).then(function (cache) { return cache.put(key, copy); });
      if (asked) return put.then(function () { return response; }, function () { return response; });
      e.waitUntil(put.catch(function () {})); return response;
    });
  }
  e.respondWith(asked || u.search ? net().catch(saved) : saved().then(function (copy) { return copy || net(); }));
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
