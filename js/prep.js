/*
  Leichhardt Kitchen prep list.
  Staff add and tick prep items on any phone. Everything syncs live through Firebase (Cloud Firestore, free plan).

  Pages:   #/prep    the daily prep list
           #/admin   admin panel (names, permissions, stations), Google sign-in for the admin only

  Data (the kitchen PIN is part of the path, so only people who know it can reach the data):
    kitchens/<PIN>/config/main                 { people: [...], stations: [...] }   read by staff, written by the admin only
    kitchens/<PIN>/days/<YYYY-MM-DD>/items/<id> one prep item per document (removed items are only flagged, never erased)

  Who is allowed to add, tick or remove is set in the admin panel. Those permissions guide the page. The security
  rules in the Firebase console are what really lock the data: the PIN for everything, the admin's Google account for config.
*/
(function () {
  'use strict';

  var FB = window.LK_FIREBASE, D = window.LK_DATA || { recipes: [] };
  var SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
  var DEFAULT_STATIONS = ['Grill', 'Pans', 'Fryer', 'Oven', 'Salads', 'Desserts', 'Burgers and sandwiches', 'Schnitty', 'Parmy', 'Fish'];
  var ROLES = {
    lead: { name: 'Lead', add: true, tick: true, del: true },
    staff: { name: 'Staff', add: true, tick: true, del: false },
    view: { name: 'View only', add: false, tick: false, del: false }
  };

  /* ---------- small helpers ---------- */
  var LS = (function () { try { localStorage.getItem('x'); return localStorage; } catch (e) { return null; } })();
  function lsGet(k) { try { return LS ? LS.getItem(k) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { if (LS) { if (v == null || v === '') LS.removeItem(k); else LS.setItem(k, v); } } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0); }
  function shift(s, days) { var d = parseYmd(s); d.setDate(d.getDate() + days); return ymd(d); }
  function dayName(s) {
    var t = ymd(new Date());
    if (s === t) return 'Today';
    if (s === shift(t, -1)) return 'Yesterday';
    if (s === shift(t, 1)) return 'Tomorrow';
    return parseYmd(s).toLocaleDateString('en-AU', { weekday: 'long' });
  }
  function longDate(s) { return parseYmd(s).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function clock(ms) { return new Date(ms).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false }); }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'person'; }

  /* ---------- state ---------- */
  var S = {
    name: 'prep', root: null,
    pin: lsGet('lk.prep.pin') || '', pinInput: '', pinError: '',
    who: lsGet('lk.prep.who') || '',
    date: ymd(new Date()),
    config: null, configState: 'idle',   // idle, loading, ok, badpin, error
    items: [], itemsState: 'idle', showRemoved: false,
    station: '', text: '', qty: '', recipeSearch: '', recipeOpen: false,
    user: null, authState: 'idle', draft: null, saveMsg: '', busy: false, toast: ''
  };
  var fb = null, sdkP = null, unsubCfg = null, unsubItems = null, itemsKey = '', cfgKey = '', toastTimer = null;

  /* ---------- Firebase (loaded only when the prep pages are opened) ---------- */
  function sdk() {
    if (sdkP) return sdkP;
    sdkP = Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-firestore.js'), import(SDK + 'firebase-auth.js')]).then(function (m) {
      var app = m[0].initializeApp(FB), fs = m[1], au = m[2], db;
      try { db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) }); }
      catch (e) { db = fs.getFirestore(app); }
      var auth = au.getAuth(app);
      fb = { app: app, fs: fs, au: au, db: db, auth: auth };
      au.onAuthStateChanged(auth, function (u) { S.user = u; S.authState = 'ready'; draw(); });
      return fb;
    }, function (e) { sdkP = null; throw e; });
    return sdkP;
  }
  function base() { return ['kitchens', S.pin]; }
  function itemsCol(date) { var f = fb.fs; return f.collection.apply(null, [fb.db].concat(base(), ['days', date, 'items'])); }
  function cfgDoc() { var f = fb.fs; return f.doc.apply(null, [fb.db].concat(base(), ['config', 'main'])); }

  function connect() {
    if (!/^\d{4,6}$/.test(S.pin)) return;
    if (cfgKey === S.pin && unsubCfg) return;
    S.configState = 'loading'; draw();
    sdk().then(function () {
      if (unsubCfg) unsubCfg();
      cfgKey = S.pin;
      unsubCfg = fb.fs.onSnapshot(cfgDoc(), function (snap) {
        S.config = snap.exists() ? snap.data() : { people: [], stations: DEFAULT_STATIONS.slice() };
        if (!S.config.stations || !S.config.stations.length) S.config.stations = DEFAULT_STATIONS.slice();
        S.config.people = S.config.people || [];
        S.configState = 'ok'; watchItems(); draw();
      }, function (err) {
        S.configState = err && err.code === 'permission-denied' ? 'badpin' : 'error';
        if (S.configState === 'badpin') { S.pinError = 'That PIN is not right.'; S.pin = ''; lsSet('lk.prep.pin', ''); cfgKey = ''; unsubCfg = null; }
        draw();
      });
    }, function () { S.configState = 'error'; draw(); });
  }
  function watchItems() {
    if (S.configState !== 'ok' || !fb) return;
    var key = S.pin + '|' + S.date;
    if (key === itemsKey && unsubItems) return;
    if (unsubItems) unsubItems();
    itemsKey = key; S.itemsState = 'loading';
    unsubItems = fb.fs.onSnapshot(itemsCol(S.date), function (snap) {
      S.items = snap.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
      S.itemsState = 'ok'; draw();
    }, function () { S.itemsState = 'error'; draw(); });
  }

  /* ---------- who is using it, and what they may do ---------- */
  function people() { return ((S.config && S.config.people) || []).filter(function (p) { return p.active !== false; }); }
  function me() { return people().filter(function (p) { return p.id === S.who; })[0] || null; }
  function can(what) { var p = me(); return !!(p && p[what]); }
  function toast(msg) { S.toast = msg; draw(); clearTimeout(toastTimer); toastTimer = setTimeout(function () { S.toast = ''; draw(); }, 3500); }

  /* ---------- item actions ---------- */
  function newItem(extra) {
    var p = me(), f = fb.fs, ref = f.doc(itemsCol(S.date));
    var data = Object.assign({ text: '', station: S.station || '', qty: '', recipe: '', addedBy: p ? p.name : '', addedAt: Date.now(), done: false, deleted: false }, extra);
    return f.setDoc(ref, data);
  }
  function addTyped() {
    var t = S.text.trim();
    if (!t || !can('add')) return;
    newItem({ text: t.slice(0, 160), qty: S.qty.trim().slice(0, 40) }).catch(function () { toast('Could not save. Check the connection.'); });
    S.text = ''; S.qty = ''; draw();
    var el = S.root && S.root.querySelector('[data-k="p-text"]'); if (el) el.focus();
  }
  function addRecipe(id) {
    var r = D.recipes.filter(function (x) { return x.id === id; })[0];
    if (!r || !can('add')) return;
    newItem({ text: (r.short || r.name), recipe: r.id, qty: S.qty.trim().slice(0, 40) }).catch(function () { toast('Could not save. Check the connection.'); });
    S.qty = ''; S.recipeSearch = ''; S.recipeOpen = false; toast('Added ' + (r.short || r.name));
  }
  function itemRef(id) { var f = fb.fs; return f.doc.apply(null, [fb.db].concat(base(), ['days', S.date, 'items', id])); }
  function tick(id) {
    var it = S.items.filter(function (x) { return x.id === id; })[0], p = me();
    if (!it || !can('tick')) return;
    var done = !it.done;
    fb.fs.updateDoc(itemRef(id), { done: done, doneBy: done ? p.name : '', doneAt: done ? Date.now() : 0 }).catch(function () { toast('Could not save. Check the connection.'); });
  }
  function removeItem(id, restore) {
    var p = me();
    if (!can('del')) return;
    fb.fs.updateDoc(itemRef(id), { deleted: !restore, deletedBy: restore ? '' : p.name }).catch(function () { toast('Could not save. Check the connection.'); });
  }
  function carryOver() {
    if (!can('add')) return;
    var prev = shift(S.date, -1);
    fb.fs.getDocs(itemsCol(prev)).then(function (snap) {
      var have = {}; S.items.forEach(function (x) { if (x.from) have[x.from] = true; });
      var n = 0, jobs = [];
      snap.docs.forEach(function (d) {
        var x = d.data();
        if (x.done || x.deleted || have[d.id]) return;
        n++; jobs.push(newItem({ text: x.text, station: x.station || '', qty: x.qty || '', recipe: x.recipe || '', from: d.id }));
      });
      return Promise.all(jobs).then(function () { toast(n ? 'Brought over ' + n + (n === 1 ? ' item' : ' items') + ' from ' + dayName(prev).toLowerCase() : 'Nothing left over from ' + dayName(prev).toLowerCase()); });
    }).catch(function () { toast('Could not read the last list.'); });
  }

  /* ---------- admin actions ---------- */
  function startDraft() {
    var c = S.config || { people: [], stations: DEFAULT_STATIONS.slice() };
    S.draft = JSON.parse(JSON.stringify({ people: c.people || [], stations: c.stations || DEFAULT_STATIONS }));
    S.saveMsg = '';
  }
  function saveConfig(cfg) {
    var clean = {
      people: cfg.people.filter(function (p) { return String(p.name).trim(); }).map(function (p) {
        return { id: p.id, name: String(p.name).trim().slice(0, 40), role: p.role || 'staff', add: !!p.add, tick: !!p.tick, del: !!p.del, active: p.active !== false };
      }),
      stations: cfg.stations.map(function (s) { return String(s).trim(); }).filter(Boolean),
      updated: Date.now(), updatedBy: (S.user && S.user.email) || ''
    };
    return sdk().then(function () { return fb.fs.setDoc(cfgDoc(), clean); }).then(function () { return clean; });
  }
  function adminSave() {
    S.busy = true; S.saveMsg = 'Saving...'; draw();
    saveConfig(S.draft).then(function () { S.busy = false; S.saveMsg = 'Saved. Everyone sees the changes now.'; draw(); },
      function (e) { S.busy = false; S.saveMsg = e && e.code === 'permission-denied' ? 'That Google account is not allowed to change these settings.' : 'Could not save. Check the connection.'; draw(); });
  }
  function signIn() {
    sdk().then(function () {
      var provider = new fb.au.GoogleAuthProvider();
      return fb.au.signInWithPopup(fb.auth, provider);
    }).catch(function (e) {
      var c = e && e.code;
      if (c === 'auth/popup-blocked' || c === 'auth/operation-not-supported-in-this-environment') { return fb.au.signInWithRedirect(fb.auth, new fb.au.GoogleAuthProvider()); }
      S.saveMsg = (c === 'auth/popup-closed-by-user') ? '' : 'Sign-in did not work (' + (c || 'unknown') + '). Try again.'; draw();
    });
  }
  function signOut() { if (fb) fb.au.signOut(fb.auth); S.draft = null; }

  /* ---------- drawing ---------- */
  var CHECK = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function gateHTML() {
    return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Kitchen PIN</h2><p class="hint">Enter the kitchen PIN to open the prep list. This phone remembers it.</p>' +
      '<div class="field"><label class="label" for="p-pin">PIN</label><input id="p-pin" class="search p-pin" data-k="p-pin" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="6" value="' + esc(S.pinInput) + '"></div>' +
      (S.pinError ? '<p class="p-err" role="alert">' + esc(S.pinError) + '</p>' : '') +
      '<div class="btn-row"><button type="button" class="btn dark" data-p="pin-go">Open the prep list</button></div></section>';
  }
  function whoHTML() {
    var list = people();
    return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Who are you?</h2><p class="hint">Your name goes next to the items you add and tick.</p>' +
      (list.length ? '<div class="p-names">' + list.map(function (p) { return '<button type="button" class="chip p-name" data-p="who" data-id="' + esc(p.id) + '">' + esc(p.name) + '</button>'; }).join('') + '</div>' :
        '<p class="p-err">No names are set up yet. The admin adds them in the admin panel.</p>') +
      '<div class="btn-row"><button type="button" class="btn" data-p="pin-forget">Change PIN</button></div></section>';
  }
  function topBar() {
    var p = me();
    return '<div class="p-bar"><span>' + (p ? 'You are <strong>' + esc(p.name) + '</strong>' + (can('tick') ? '' : ' (view only)') : '') + '</span>' +
      '<span class="p-links"><button type="button" class="p-link" data-p="who-change">Not you?</button><a class="p-link" href="#/admin">Admin</a></span></div>';
  }
  function stationsFor(items) {
    var order = (S.config.stations || []).slice();
    items.forEach(function (x) { var s = x.station || ''; if (s && order.indexOf(s) < 0) order.push(s); });
    return order;
  }
  function itemHTML(x) {
    var tickOk = can('tick'), delOk = can('del');
    var meta = [];
    if (x.addedBy) meta.push('Added by ' + esc(x.addedBy));
    if (x.done && x.doneBy) meta.push('Done by ' + esc(x.doneBy) + (x.doneAt ? ' at ' + clock(x.doneAt) : ''));
    if (x.from) meta.push('from ' + esc(dayName(shift(S.date, -1)).toLowerCase()));
    var link = x.recipe ? '<a class="p-recipe" href="#/r/' + encodeURIComponent(x.recipe) + '">Open recipe</a>' : '';
    return '<li class="p-item' + (x.done ? ' is-done' : '') + (x.deleted ? ' is-removed' : '') + '">' +
      '<button type="button" class="p-tick" data-p="tick" data-id="' + esc(x.id) + '" aria-pressed="' + !!x.done + '" aria-label="' + esc((x.done ? 'Untick ' : 'Tick ') + x.text) + '"' + (tickOk && !x.deleted ? '' : ' disabled') + '>' + (x.done ? CHECK : '') + '</button>' +
      '<div class="p-main"><div class="p-line"><span class="p-text">' + esc(x.text) + '</span>' + (x.qty ? '<span class="p-qty">' + esc(x.qty) + '</span>' : '') + '</div>' +
      '<div class="p-meta">' + meta.join(' · ') + (link ? (meta.length ? ' · ' : '') + link : '') + '</div></div>' +
      (delOk ? '<button type="button" class="p-x" data-p="' + (x.deleted ? 'restore' : 'del') + '" data-id="' + esc(x.id) + '">' + (x.deleted ? 'Put back' : 'Remove') + '</button>' : '') + '</li>';
  }
  function recipePicker() {
    var s = S.recipeSearch.trim().toLowerCase();
    var list = D.recipes.filter(function (r) { return (r.kind === 'batch' || r.kind === 'component') && (!s || (r.name + ' ' + (r.short || '')).toLowerCase().indexOf(s) >= 0); }).slice(0, 40);
    return '<details class="p-pick"' + (S.recipeOpen ? ' open' : '') + '><summary data-p="recipe-toggle">Add from the recipes</summary>' +
      '<div class="field"><label class="label" for="p-rs">Find a batch or component recipe</label><input id="p-rs" class="search" type="search" data-k="p-rs" autocomplete="off" value="' + esc(S.recipeSearch) + '"></div>' +
      '<div class="p-recipes">' + (list.length ? list.map(function (r) { return '<button type="button" class="chip sq" data-p="add-recipe" data-id="' + esc(r.id) + '">' + esc(r.short || r.name) + '</button>'; }).join('') : '<span class="hint">No recipe matches.</span>') + '</div>' +
      '<p class="hint">Fill in the amount above first if you want it on the item, for example "2 batches".</p></details>';
  }
  function listHTML() {
    var p = me(), all = S.items.slice().sort(function (a, b) { return (a.addedAt || 0) - (b.addedAt || 0); });
    var live = all.filter(function (x) { return !x.deleted; }), removed = all.filter(function (x) { return x.deleted; });
    var doneN = live.filter(function (x) { return x.done; }).length;
    var stations = stationsFor(live.concat(S.showRemoved ? removed : []));
    var groups = stations.map(function (st) {
      var items = (S.showRemoved ? all : live).filter(function (x) { return (x.station || '') === st; });
      return items.length ? '<section class="p-group"><div class="group-head"><span>' + esc(st) + '</span><span>' + items.filter(function (x) { return x.done && !x.deleted; }).length + ' of ' + items.filter(function (x) { return !x.deleted; }).length + '</span></div><ul class="p-items">' + items.map(itemHTML).join('') + '</ul></section>' : '';
    }).join('');
    var noStation = (S.showRemoved ? all : live).filter(function (x) { return !x.station; });
    if (noStation.length) groups += '<section class="p-group"><div class="group-head"><span>No station</span><span>' + noStation.filter(function (x) { return x.done && !x.deleted; }).length + ' of ' + noStation.filter(function (x) { return !x.deleted; }).length + '</span></div><ul class="p-items">' + noStation.map(itemHTML).join('') + '</ul></section>';
    var addForm = can('add') ?
      '<form class="p-add" data-p-form="add"><div class="p-add-row"><label class="visually-hidden" for="p-station">Station</label><select id="p-station" class="p-select" data-k="p-station">' +
      '<option value="">No station</option>' + (S.config.stations || []).map(function (s) { return '<option' + (S.station === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select>' +
      '<label class="visually-hidden" for="p-text">Prep item</label><input id="p-text" class="search" data-k="p-text" autocomplete="off" placeholder="What needs prepping?" maxlength="160" value="' + esc(S.text) + '">' +
      '<label class="visually-hidden" for="p-qty">Amount</label><input id="p-qty" class="search p-qtyin" data-k="p-qty" autocomplete="off" placeholder="Amount" maxlength="40" value="' + esc(S.qty) + '">' +
      '<button type="submit" class="btn dark">Add</button></div>' + recipePicker() + '</form>' : '<p class="hint">You can look at the list but not change it. Ask the admin if that is wrong.</p>';
    var state = S.itemsState === 'error' ? '<p class="p-err">Could not load this list. Check the connection.</p>' : '';
    var empty = !live.length && S.itemsState === 'ok' ? '<p class="p-empty">Nothing on the list for ' + esc(dayName(S.date).toLowerCase()) + ' yet.</p>' : '';
    return topBar() +
      '<div class="p-date"><button type="button" class="chip" data-p="day" data-d="-1" aria-label="Previous day">‹</button>' +
      '<div class="p-date-mid"><h2 class="p-h" id="rtitle" tabindex="-1">Prep list: ' + esc(dayName(S.date)) + '</h2><span class="hint">' + esc(longDate(S.date)) + '</span></div>' +
      '<button type="button" class="chip" data-p="day" data-d="1" aria-label="Next day">›</button></div>' +
      '<div class="chips"><button type="button" class="chip" data-p="today" aria-pressed="' + (S.date === ymd(new Date())) + '">Today</button>' +
      '<button type="button" class="chip" data-p="yesterday" aria-pressed="' + (S.date === shift(ymd(new Date()), -1)) + '">Yesterday</button>' +
      '<label class="visually-hidden" for="p-day">Pick a date</label><input id="p-day" type="date" class="p-dateinput" data-k="p-day" value="' + esc(S.date) + '"></div>' +
      '<div class="p-progress" role="status"><strong>' + doneN + ' of ' + live.length + '</strong> done' + (live.length && doneN === live.length ? ' · all done' : '') + '</div>' +
      state + addForm +
      '<div class="btn-row">' + (can('add') ? '<button type="button" class="btn" data-p="carry">Bring over unticked from ' + esc(dayName(shift(S.date, -1)).toLowerCase()) + '</button>' : '') +
      (removed.length && can('del') ? '<button type="button" class="btn" data-p="removed">' + (S.showRemoved ? 'Hide' : 'Show') + ' removed (' + removed.length + ')</button>' : '') + '</div>' +
      empty + groups;
  }
  function adminHTML() {
    if (S.authState !== 'ready' && !S.user) {
      return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Admin panel</h2><p class="hint">Loading...</p></section>';
    }
    if (!S.user) {
      return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Admin panel</h2><p class="hint">Sign in with the admin Google account to change names, permissions and stations.</p>' +
        (S.saveMsg ? '<p class="p-err">' + esc(S.saveMsg) + '</p>' : '') +
        '<div class="btn-row"><button type="button" class="btn dark" data-p="signin">Sign in with Google</button><a class="btn" href="#/prep">Back to the prep list</a></div></section>';
    }
    if (!S.draft) startDraft();
    var d = S.draft;
    var rows = d.people.map(function (p, i) {
      return '<li class="a-person' + (p.active === false ? ' is-off' : '') + '"><div class="a-top"><label class="visually-hidden" for="a-n' + i + '">Name</label><input id="a-n' + i + '" class="search a-name" data-k="a-n' + i + '" data-a="name" data-i="' + i + '" value="' + esc(p.name) + '" maxlength="40">' +
        '<label class="visually-hidden" for="a-r' + i + '">Role</label><select id="a-r' + i + '" class="p-select" data-k="a-r' + i + '" data-a="role" data-i="' + i + '">' + Object.keys(ROLES).map(function (k) { return '<option value="' + k + '"' + (p.role === k ? ' selected' : '') + '>' + ROLES[k].name + '</option>'; }).join('') + '</select></div>' +
        '<div class="a-perms">' + [['add', 'Add items'], ['tick', 'Tick items'], ['del', 'Remove items']].map(function (c) {
          return '<label class="a-check"><input type="checkbox" data-a="perm" data-perm="' + c[0] + '" data-i="' + i + '"' + (p[c[0]] ? ' checked' : '') + '> ' + c[1] + '</label>';
        }).join('') + '<label class="a-check"><input type="checkbox" data-a="active" data-i="' + i + '"' + (p.active === false ? '' : ' checked') + '> On the list</label>' +
        '<button type="button" class="p-x" data-p="a-remove-person" data-i="' + i + '">Delete</button></div></li>';
    }).join('');
    var sts = d.stations.map(function (s, i) {
      return '<li class="a-station"><label class="visually-hidden" for="a-s' + i + '">Station</label><input id="a-s' + i + '" class="search" data-k="a-s' + i + '" data-a="station" data-i="' + i + '" value="' + esc(s) + '" maxlength="40">' +
        '<button type="button" class="p-x" data-p="a-up" data-i="' + i + '" aria-label="Move up"' + (i ? '' : ' disabled') + '>Up</button><button type="button" class="p-x" data-p="a-down" data-i="' + i + '" aria-label="Move down"' + (i < d.stations.length - 1 ? '' : ' disabled') + '>Down</button>' +
        '<button type="button" class="p-x" data-p="a-remove-station" data-i="' + i + '">Delete</button></li>';
    }).join('');
    return '<div class="p-bar"><span>Signed in as <strong>' + esc(S.user.email) + '</strong></span><span class="p-links"><button type="button" class="p-link" data-p="signout">Sign out</button><a class="p-link" href="#/prep">Prep list</a></span></div>' +
      '<h2 class="p-h" id="rtitle" tabindex="-1">Admin panel</h2>' +
      '<section class="set-block"><span class="label">People</span><span class="hint">Pick a role to set the usual permissions, then adjust the ticks for one person if you need to. Removing someone from the list keeps their name on old items.</span>' +
      '<ul class="a-list">' + (rows || '<li class="hint">No names yet.</li>') + '</ul><div class="btn-row"><button type="button" class="btn" data-p="a-add-person">Add a person</button></div>' +
      '<div class="field"><label class="label" for="a-bulk">Add several names</label><textarea id="a-bulk" class="p-bulk" data-k="a-bulk" rows="3" placeholder="One name per line"></textarea></div><div class="btn-row"><button type="button" class="btn" data-p="a-bulk-add">Add these names as Staff</button></div></section>' +
      '<section class="set-block"><span class="label">Stations</span><span class="hint">The prep list groups items by these, in this order.</span><ul class="a-list">' + sts + '</ul><div class="btn-row"><button type="button" class="btn" data-p="a-add-station">Add a station</button></div></section>' +
      '<section class="set-block"><div class="btn-row"><button type="button" class="btn dark" data-p="a-save"' + (S.busy ? ' disabled' : '') + '>Save changes</button><button type="button" class="btn" data-p="a-reset">Undo unsaved changes</button></div>' +
      '<span class="saved" role="status">' + esc(S.saveMsg) + '</span></section>' +
      '<section class="set-block"><span class="label">Kitchen PIN</span><span class="hint">The PIN is part of the security rules in the Firebase console. To change it, change it there and in this page on every phone.</span></section>';
  }
  function bodyHTML() {
    if (!S.pin) return gateHTML();
    if (S.configState === 'error') return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Prep list</h2><p class="p-err">Could not connect. Check the connection and try again.</p><div class="btn-row"><button type="button" class="btn dark" data-p="retry">Try again</button></div></section>';
    if (S.configState !== 'ok') return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Prep list</h2><p class="hint">Connecting...</p></section>';
    if (S.name === 'admin') return adminHTML();
    if (!me()) return whoHTML();
    return listHTML();
  }
  var rendering = false;
  function draw() {
    if (!S.root || !document.body.contains(S.root) || rendering) return;
    rendering = true;
    var ae = document.activeElement, key = ae && ae.getAttribute && ae.getAttribute('data-k'), start = null, end = null;
    if (key && ae.selectionStart != null) { try { start = ae.selectionStart; end = ae.selectionEnd; } catch (e) {} }
    S.root.innerHTML = bodyHTML() + (S.toast ? '<div class="p-toast" role="status">' + esc(S.toast) + '</div>' : '');
    if (key) { var el = S.root.querySelector('[data-k="' + key + '"]'); if (el) { el.focus({ preventScroll: true }); if (start != null && el.setSelectionRange) { try { el.setSelectionRange(start, end); } catch (e) {} } } }
    rendering = false;
  }

  /* ---------- events ---------- */
  function onClick(e) {
    var el = e.target.closest('[data-p]');
    if (!el || !S.root || !S.root.contains(el)) return;
    var a = el.getAttribute('data-p'), id = el.getAttribute('data-id'), i = +el.getAttribute('data-i');
    if (el.tagName === 'SUMMARY') { S.recipeOpen = !S.recipeOpen; return; }
    if (a === 'pin-go') { var v = S.pinInput.trim(); if (!/^\d{4,6}$/.test(v)) { S.pinError = 'The PIN is 4 to 6 digits.'; draw(); return; } S.pin = v; S.pinError = ''; S.pinInput = ''; lsSet('lk.prep.pin', v); connect(); return; }
    if (a === 'pin-forget') { S.pin = ''; lsSet('lk.prep.pin', ''); S.config = null; S.configState = 'idle'; if (unsubCfg) unsubCfg(); if (unsubItems) unsubItems(); unsubCfg = unsubItems = null; cfgKey = itemsKey = ''; draw(); return; }
    if (a === 'retry') { cfgKey = ''; connect(); return; }
    if (a === 'who') { S.who = id; lsSet('lk.prep.who', id); draw(); return; }
    if (a === 'who-change') { S.who = ''; draw(); return; }
    if (a === 'day') { S.date = shift(S.date, +el.getAttribute('data-d')); watchItems(); draw(); return; }
    if (a === 'today') { S.date = ymd(new Date()); watchItems(); draw(); return; }
    if (a === 'yesterday') { S.date = shift(ymd(new Date()), -1); watchItems(); draw(); return; }
    if (a === 'tick') { tick(id); return; }
    if (a === 'del') { removeItem(id, false); return; }
    if (a === 'restore') { removeItem(id, true); return; }
    if (a === 'removed') { S.showRemoved = !S.showRemoved; draw(); return; }
    if (a === 'carry') { carryOver(); return; }
    if (a === 'add-recipe') { addRecipe(id); return; }
    if (a === 'signin') { signIn(); return; }
    if (a === 'signout') { signOut(); draw(); return; }
    if (!S.draft) return;
    var d = S.draft;
    if (a === 'a-add-person') { d.people.push({ id: slug('person') + '-' + Date.now().toString(36), name: '', role: 'staff', add: true, tick: true, del: false, active: true }); draw(); var n = S.root.querySelector('[data-k="a-n' + (d.people.length - 1) + '"]'); if (n) n.focus(); return; }
    if (a === 'a-bulk-add') {
      var box = S.root.querySelector('#a-bulk'); var lines = box ? box.value.split(/\n/).map(function (s) { return s.trim(); }).filter(Boolean) : [];
      lines.forEach(function (nm, k) { d.people.push({ id: slug(nm) + '-' + Date.now().toString(36) + k, name: nm, role: 'staff', add: true, tick: true, del: false, active: true }); });
      draw(); return;
    }
    if (a === 'a-remove-person') { d.people.splice(i, 1); draw(); return; }
    if (a === 'a-add-station') { d.stations.push(''); draw(); var s = S.root.querySelector('[data-k="a-s' + (d.stations.length - 1) + '"]'); if (s) s.focus(); return; }
    if (a === 'a-remove-station') { d.stations.splice(i, 1); draw(); return; }
    if (a === 'a-up' && i > 0) { var t = d.stations[i - 1]; d.stations[i - 1] = d.stations[i]; d.stations[i] = t; draw(); return; }
    if (a === 'a-down' && i < d.stations.length - 1) { var u = d.stations[i + 1]; d.stations[i + 1] = d.stations[i]; d.stations[i] = u; draw(); return; }
    if (a === 'a-save') { adminSave(); return; }
    if (a === 'a-reset') { startDraft(); draw(); return; }
  }
  function onInput(e) {
    var el = e.target, k = el.getAttribute && el.getAttribute('data-k');
    if (!S.root || !S.root.contains(el)) return;
    if (k === 'p-pin') { S.pinInput = el.value.replace(/\D/g, ''); el.value = S.pinInput; return; }
    if (k === 'p-text') { S.text = el.value; return; }
    if (k === 'p-qty') { S.qty = el.value; return; }
    if (k === 'p-rs') { S.recipeSearch = el.value; S.recipeOpen = true; draw(); return; }
    var a = el.getAttribute && el.getAttribute('data-a');
    if (!a || !S.draft) return;
    var i = +el.getAttribute('data-i'), d = S.draft;
    if (a === 'name') d.people[i].name = el.value;
    else if (a === 'station') d.stations[i] = el.value;
  }
  function onChange(e) {
    var el = e.target, k = el.getAttribute && el.getAttribute('data-k');
    if (!S.root || !S.root.contains(el)) return;
    if (k === 'p-station') { S.station = el.value; return; }
    if (k === 'p-day') { if (el.value) { S.date = el.value; watchItems(); draw(); } return; }
    var a = el.getAttribute && el.getAttribute('data-a');
    if (!a || !S.draft) return;
    var i = +el.getAttribute('data-i'), p = S.draft.people[i];
    if (a === 'role') { p.role = el.value; var r = ROLES[el.value]; p.add = r.add; p.tick = r.tick; p.del = r.del; draw(); }
    else if (a === 'perm') { p[el.getAttribute('data-perm')] = el.checked; }
    else if (a === 'active') { p.active = el.checked; draw(); }
  }
  function onSubmit(e) {
    if (e.target.getAttribute && e.target.getAttribute('data-p-form') === 'add') { e.preventDefault(); addTyped(); }
  }
  function onKey(e) {
    if (e.key === 'Enter' && e.target.getAttribute && e.target.getAttribute('data-k') === 'p-pin') { e.preventDefault(); var b = S.root.querySelector('[data-p="pin-go"]'); if (b) b.click(); }
  }
  var wired = false;
  function wire() {
    if (wired) return; wired = true;
    var app = document.getElementById('app');
    app.addEventListener('click', onClick);
    app.addEventListener('input', onInput);
    app.addEventListener('change', onChange);
    app.addEventListener('submit', onSubmit);
    app.addEventListener('keydown', onKey);
  }

  /* ---------- public bits used by app.js ---------- */
  window.LK_PREP = {
    mount: function (name, root) {
      wire();
      S.name = name; S.root = root;
      if (name === 'admin') S.draft = S.draft || null;
      draw();
      if (S.pin) { connect(); if (name === 'admin') sdk(); }
    },
    saveConfig: saveConfig,
    state: S
  };
})();
