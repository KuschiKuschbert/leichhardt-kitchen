/*
  Leichhardt Kitchen prep list.
  Staff add and tick prep items on any phone. Everything syncs live through Firebase (Cloud Firestore, free plan).

  Pages:   #/prep    the daily prep list
           #/admin   admin panel (names, permissions, tallies), Google sign-in for the admin only

  Data (the kitchen PIN is part of the path, so only people who know it can reach the data):
    kitchens/<PIN>/config/main                 { people: [...] }                    read by staff, written by the admin only
    kitchens/<PIN>/days/<YYYY-MM-DD>/items/<id> one prep item per document (removed items are only flagged, never erased)
    kitchens/<PIN>/pins/<personId>             { salt, hash }   each person's own PIN (hashed), chosen the first time they sign in
    kitchens/<PIN>/activity/<personId>         { name, added, ticked, visits, lastSeen }   tallies shown in the admin panel
    kitchens/<PIN>/sections/<slug>             { name, uses, lastUsed }   sections people have written, offered as suggestions

  Who is allowed to add, tick or remove is set in the admin panel. Those permissions guide the page. The security
  rules in the Firebase console are what really lock the data: the PIN for everything, the admin's Google account for config.
*/
(function () {
  'use strict';

  var FB = window.LK_FIREBASE, D = window.LK_DATA || { recipes: [] };
  var SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
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
    items: [], itemsState: 'idle', prev: [], showRemoved: false,
    section: '', text: '', qty: '', recipeSearch: '', recipeOpen: false, tab: '',
    authed: false, pinStep: '', pinData: null, pf1: '', pf2: '', pinMsg: '',
    sections: [], activity: [], resetId: '',
    user: null, authState: 'idle', draft: null, saveMsg: '', busy: false, toast: ''
  };
  var fb = null, sdkP = null, unsubCfg = null, unsubItems = null, unsubPrev = null, unsubSec = null, unsubAct = null;
  var itemsKey = '', cfgKey = '', toastTimer = null, resumed = false;

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
  function colRef(name) { return fb.fs.collection.apply(null, [fb.db].concat(base(), [name])); }
  function docRef(name, id) { return fb.fs.doc.apply(null, [fb.db].concat(base(), [name, id])); }
  function itemsCol(date) { return fb.fs.collection.apply(null, [fb.db].concat(base(), ['days', date, 'items'])); }
  function itemRef(date, id) { return fb.fs.doc.apply(null, [fb.db].concat(base(), ['days', date, 'items', id])); }
  function cfgDoc() { return docRef('config', 'main'); }

  function connect() {
    if (!/^\d{4,6}$/.test(S.pin)) return;
    if (cfgKey === S.pin && unsubCfg) return;
    S.configState = 'loading'; draw();
    sdk().then(function () {
      if (unsubCfg) unsubCfg();
      cfgKey = S.pin;
      unsubCfg = fb.fs.onSnapshot(cfgDoc(), function (snap) {
        S.config = snap.exists() ? snap.data() : { people: [] };
        S.config.people = S.config.people || [];
        S.configState = 'ok'; watchItems(); watchSections(); resume(); draw();
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
    if (unsubPrev) unsubPrev();
    itemsKey = key; S.itemsState = 'loading';
    unsubItems = fb.fs.onSnapshot(itemsCol(S.date), function (snap) {
      S.items = snap.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
      S.itemsState = 'ok'; draw();
    }, function () { S.itemsState = 'error'; draw(); });
    unsubPrev = fb.fs.onSnapshot(itemsCol(shift(S.date, -1)), function (snap) {
      S.prev = snap.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
      draw();
    }, function () {});
  }
  function watchSections() {
    if (unsubSec || !fb) return;
    unsubSec = fb.fs.onSnapshot(colRef('sections'), function (snap) {
      S.sections = snap.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
      draw();
    }, function () {});
  }
  function watchActivity() {
    if (unsubAct || !fb || !S.user || S.configState !== 'ok') return;
    unsubAct = fb.fs.onSnapshot(colRef('activity'), function (snap) {
      S.activity = snap.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
      draw();
    }, function () {});
  }

  /* ---------- who is using it, their own PIN, and what they may do ---------- */
  function people() { return ((S.config && S.config.people) || []).filter(function (p) { return p.active !== false; }); }
  function who() { return people().filter(function (p) { return p.id === S.who; })[0] || null; }
  function me() { return S.authed ? who() : null; }
  function can(what) { var p = me(); return !!(p && p[what]); }
  function toast(msg) { S.toast = msg; draw(); clearTimeout(toastTimer); toastTimer = setTimeout(function () { S.toast = ''; draw(); }, 3500); }

  function sha(str) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  function randomHex() { var a = new Uint8Array(8); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function bump(patch) {
    // adds to a person's tally in the background; never blocks the page
    var p = who(); if (!p || !fb) return;
    var f = fb.fs, data = { name: p.name };
    Object.keys(patch).forEach(function (k) { data[k] = (k === 'lastSeen' || k === 'lastAdded') ? patch[k] : f.increment(patch[k]); });
    f.setDoc(docRef('activity', p.id), data, { merge: true }).catch(function () {});
  }
  function pickName(id) {
    S.who = id; lsSet('lk.prep.who', id); lsSet('lk.prep.tok', ''); S.authed = false; S.pf1 = S.pf2 = ''; S.pinMsg = ''; S.pinStep = 'checking'; draw();
    fb.fs.getDoc(docRef('pins', id)).then(function (s) { S.pinStep = s.exists() ? 'enter' : 'set'; S.pinData = s.exists() ? s.data() : null; draw(); },
      function () { S.pinStep = 'error'; draw(); });
  }
  function signedIn(id, hash) {
    S.authed = true; S.pf1 = S.pf2 = ''; S.pinMsg = ''; S.pinStep = '';
    lsSet('lk.prep.tok', id + ':' + hash);
    bump({ visits: 1, lastSeen: Date.now() });
    draw();
  }
  function submitPin() {
    var id = S.who, p = who();
    if (!p) return;
    if (!/^\d{4}$/.test(S.pf1)) { S.pinMsg = 'Your PIN is 4 digits.'; draw(); return; }
    if (S.pinStep === 'set') {
      if (S.pf1 !== S.pf2) { S.pinMsg = 'The two PINs do not match.'; draw(); return; }
      var salt = randomHex();
      sha(salt + ':' + id + ':' + S.pf1).then(function (h) {
        return fb.fs.setDoc(docRef('pins', id), { salt: salt, hash: h, setAt: Date.now(), name: p.name }).then(function () { signedIn(id, h); });
      }).catch(function () { S.pinMsg = 'Could not save your PIN. If someone already set one for this name, pick the name again.'; draw(); });
      return;
    }
    if (S.pinStep === 'enter' && S.pinData) {
      sha(S.pinData.salt + ':' + id + ':' + S.pf1).then(function (h) {
        if (h === S.pinData.hash) signedIn(id, h);
        else { S.pinMsg = 'That PIN is not right.'; S.pf1 = ''; draw(); }
      });
    }
  }
  function resume() {
    // a phone that has signed in before stays signed in, unless the admin has reset that PIN
    if (resumed || !S.who) return;
    resumed = true;
    var tok = (lsGet('lk.prep.tok') || '').split(':');
    if (tok[0] !== S.who || !tok[1]) { if (S.who) pickName(S.who); return; }
    fb.fs.getDoc(docRef('pins', S.who)).then(function (s) {
      if (s.exists() && s.data().hash === tok[1]) { S.authed = true; bump({ visits: 1, lastSeen: Date.now() }); draw(); }
      else pickName(S.who);
    }, function () { S.authed = true; draw(); });
  }
  function leave() { S.who = ''; S.authed = false; S.pinStep = ''; lsSet('lk.prep.who', ''); lsSet('lk.prep.tok', ''); resumed = true; draw(); }

  /* ---------- sections: whatever people write becomes a section ---------- */
  function cleanSection(v) {
    var t = String(v || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!t) return '';
    var hit = S.sections.filter(function (x) { return String(x.name).toLowerCase() === t.toLowerCase(); })[0];
    return hit ? hit.name : t;
  }
  function suggestions() {
    var seen = {}, out = [];
    S.sections.filter(function (x) { return !x.hidden; }).sort(function (a, b) { return (b.uses || 0) - (a.uses || 0); }).forEach(function (x) { seen[x.name.toLowerCase()] = 1; out.push(x.name); });
    S.items.concat(S.prev).forEach(function (x) { var n = x.station; if (n && !seen[n.toLowerCase()]) { seen[n.toLowerCase()] = 1; out.push(n); } });
    return out;
  }

  /* ---------- item actions ---------- */
  function newItem(extra) {
    var p = me(), f = fb.fs, ref = f.doc(itemsCol(S.date));
    var data = Object.assign({ text: '', station: '', qty: '', recipe: '', addedBy: p ? p.name : '', addedById: p ? p.id : '', addedAt: Date.now(), done: false, deleted: false }, extra);
    return f.setDoc(ref, data);
  }
  function noteSection(name) {
    if (!name || !fb) return;
    var p = who();
    fb.fs.setDoc(docRef('sections', slug(name)), { name: name, uses: fb.fs.increment(1), lastUsed: Date.now(), lastBy: p ? p.name : '' }, { merge: true }).catch(function () {});
  }
  function addTyped() {
    var t = S.text.trim();
    if (!t || !can('add')) return;
    var sec = cleanSection(S.section);
    newItem({ text: t.slice(0, 160), qty: S.qty.trim().slice(0, 40), station: sec }).catch(function () { toast('Could not save. Check the connection.'); });
    noteSection(sec); bump({ added: 1, lastAdded: Date.now() });
    S.text = ''; S.qty = ''; S.section = sec; draw();
    var el = S.root && S.root.querySelector('[data-k="p-text"]'); if (el) el.focus();
  }
  function addRecipe(id) {
    var r = D.recipes.filter(function (x) { return x.id === id; })[0];
    if (!r || !can('add')) return;
    var sec = cleanSection(S.section);
    newItem({ text: (r.short || r.name), recipe: r.id, qty: S.qty.trim().slice(0, 40), station: sec }).catch(function () { toast('Could not save. Check the connection.'); });
    noteSection(sec); bump({ added: 1, lastAdded: Date.now() });
    S.qty = ''; S.recipeSearch = ''; S.recipeOpen = false; toast('Added ' + (r.short || r.name));
  }
  function tick(date, id) {
    var list = date === S.date ? S.items : S.prev;
    var it = list.filter(function (x) { return x.id === id; })[0], p = me();
    if (!it || !can('tick')) return;
    var done = !it.done;
    fb.fs.updateDoc(itemRef(date, id), { done: done, doneBy: done ? p.name : '', doneById: done ? p.id : '', doneAt: done ? Date.now() : 0 }).catch(function () { toast('Could not save. Check the connection.'); });
    if (done) bump({ ticked: 1 });
    else if (it.doneById && fb) fb.fs.setDoc(docRef('activity', it.doneById), { name: it.doneBy || '', ticked: fb.fs.increment(-1) }, { merge: true }).catch(function () {});
  }
  function removeItem(date, id, restore) {
    var p = me();
    if (!can('del')) return;
    fb.fs.updateDoc(itemRef(date, id), { deleted: !restore, deletedBy: restore ? '' : p.name }).catch(function () { toast('Could not save. Check the connection.'); });
  }
  function carryOver() {
    if (!can('add')) return;
    var have = {}; S.items.forEach(function (x) { if (x.from) have[x.from] = true; });
    var n = 0, jobs = [];
    S.prev.forEach(function (x) {
      if (x.done || x.deleted || have[x.id]) return;
      n++; jobs.push(newItem({ text: x.text, station: x.station || '', qty: x.qty || '', recipe: x.recipe || '', from: x.id }));
    });
    Promise.all(jobs).then(function () { toast(n ? 'Copied ' + n + (n === 1 ? ' line' : ' lines') + ' onto ' + dayName(S.date).toLowerCase() : 'Everything from ' + dayName(shift(S.date, -1)).toLowerCase() + ' was ticked'); },
      function () { toast('Could not copy. Check the connection.'); });
  }

  /* ---------- admin actions ---------- */
  function startDraft() {
    var c = S.config || { people: [] };
    S.draft = JSON.parse(JSON.stringify({ people: c.people || [] }));
    S.saveMsg = '';
  }
  function saveConfig(cfg) {
    var clean = {
      people: cfg.people.filter(function (p) { return String(p.name).trim(); }).map(function (p) {
        return { id: p.id, name: String(p.name).trim().slice(0, 40), role: p.role || 'staff', add: !!p.add, tick: !!p.tick, del: !!p.del, active: p.active !== false };
      }),
      stations: [],
      updated: Date.now(), updatedBy: (S.user && S.user.email) || ''
    };
    return sdk().then(function () { return fb.fs.setDoc(cfgDoc(), clean); }).then(function () { return clean; });
  }
  function adminSave() {
    S.busy = true; S.saveMsg = 'Saving...'; draw();
    saveConfig(S.draft).then(function () { S.busy = false; S.saveMsg = 'Saved. Everyone sees the changes now.'; draw(); },
      function (e) { S.busy = false; S.saveMsg = e && e.code === 'permission-denied' ? 'That Google account is not allowed to change these settings.' : 'Could not save. Check the connection.'; draw(); });
  }
  function resetPin(id) {
    if (S.resetId !== id) { S.resetId = id; draw(); return; }
    S.resetId = '';
    fb.fs.deleteDoc(docRef('pins', id)).then(function () { toast('PIN reset. They set a new one next time they sign in.'); }, function () { toast('Could not reset. Sign in as the admin.'); });
  }
  function hideSection(id, hidden) {
    fb.fs.setDoc(docRef('sections', id), { hidden: hidden }, { merge: true }).catch(function () { toast('Could not save.'); });
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
  function signOut() { if (fb) fb.au.signOut(fb.auth); S.draft = null; if (unsubAct) { unsubAct(); unsubAct = null; } S.activity = []; }

  /* ---------- drawing ---------- */
  var TICK = '<svg viewBox="0 0 26 26" width="26" height="26" aria-hidden="true"><path d="M5 14 L11 20 L22 5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function gateHTML() {
    return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Kitchen PIN</h2><p class="hint">Enter the kitchen PIN to open the prep book. This phone remembers it.</p>' +
      '<div class="field"><label class="label" for="p-pin">PIN</label><input id="p-pin" class="search p-pin" data-k="p-pin" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="6" value="' + esc(S.pinInput) + '"></div>' +
      (S.pinError ? '<p class="p-err" role="alert">' + esc(S.pinError) + '</p>' : '') +
      '<div class="btn-row"><button type="button" class="btn dark" data-p="pin-go">Open the prep book</button></div></section>';
  }
  function whoHTML() {
    var list = people();
    return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Who are you?</h2><p class="hint">Pick your name. The first time, you choose your own 4-digit PIN to go with it.</p>' +
      (list.length ? '<div class="p-names">' + list.map(function (p) { return '<button type="button" class="chip p-name" data-p="who" data-id="' + esc(p.id) + '">' + esc(p.name) + '</button>'; }).join('') + '</div>' :
        '<p class="p-err">No names are set up yet. The admin adds them in the admin panel.</p>') +
      '<div class="btn-row"><button type="button" class="btn" data-p="pin-forget">Change kitchen PIN</button></div></section>';
  }
  function ownPinHTML() {
    var p = who(), step = S.pinStep;
    if (!p) return whoHTML();
    if (step === 'checking' || !step) return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">' + esc(p.name) + '</h2><p class="hint">One moment...</p></section>';
    if (step === 'error') return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">' + esc(p.name) + '</h2><p class="p-err">Could not check your PIN. Check the connection.</p><div class="btn-row"><button type="button" class="btn dark" data-p="who" data-id="' + esc(p.id) + '">Try again</button><button type="button" class="btn" data-p="who-change">Not me</button></div></section>';
    var setting = step === 'set';
    return '<form class="p-card" data-p-form="pin"><h2 class="p-h" id="rtitle" tabindex="-1">' + (setting ? 'Hi ' + esc(p.name) + ', choose your PIN' : esc(p.name) + ', enter your PIN') + '</h2>' +
      '<p class="hint">' + (setting ? 'Pick 4 digits you will remember. You use it with your name from now on. This phone stays signed in.' : 'Your own 4-digit PIN.') + '</p>' +
      '<div class="field"><label class="label" for="pf1">' + (setting ? 'New PIN' : 'PIN') + '</label><input id="pf1" class="search p-pin" type="password" data-k="pf1" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="4" value="' + esc(S.pf1) + '"></div>' +
      (setting ? '<div class="field"><label class="label" for="pf2">Type it again</label><input id="pf2" class="search p-pin" type="password" data-k="pf2" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="4" value="' + esc(S.pf2) + '"></div>' : '') +
      (S.pinMsg ? '<p class="p-err" role="alert">' + esc(S.pinMsg) + '</p>' : '') +
      '<div class="btn-row"><button type="submit" class="btn dark">' + (setting ? 'Save my PIN' : 'Open the prep book') + '</button><button type="button" class="btn" data-p="who-change">Not me</button></div></form>';
  }

  var BOX = '<svg viewBox="0 0 26 26" width="26" height="26" aria-hidden="true"><rect x="2.5" y="2.5" width="21" height="21" rx="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  function rowHTML(x, date, readonly) {
    var tickOk = can('tick') && !x.deleted, delOk = can('del');
    var by = x.done && x.doneBy ? esc(x.doneBy) + (x.doneAt ? ' ' + clock(x.doneAt) : '') : (x.addedBy ? esc(x.addedBy) : '');
    var link = x.recipe ? '<a class="nb-go" href="#/r/' + encodeURIComponent(x.recipe) + '">recipe</a>' : '';
    return '<li class="nb-row' + (x.done ? ' is-done' : '') + (x.deleted ? ' is-removed' : '') + '">' +
      '<button type="button" class="nb-box" data-p="tick" data-id="' + esc(x.id) + '" data-d="' + esc(date) + '" aria-pressed="' + !!x.done + '" aria-label="' + esc((x.done ? 'Untick ' : 'Tick ') + x.text) + '"' + (tickOk ? '' : ' disabled') + '>' + (x.done ? TICK : BOX) + '</button>' +
      '<span class="nb-t">' + esc(x.text) + (x.qty ? ' <span class="nb-q">' + esc(x.qty) + '</span>' : '') + '</span>' +
      '<span class="nb-by">' + by + '</span>' + link +
      (delOk ? '<button type="button" class="nb-x" data-p="' + (x.deleted ? 'restore' : 'del') + '" data-id="' + esc(x.id) + '" data-d="' + esc(date) + '" aria-label="' + (x.deleted ? 'Put back ' : 'Remove ') + esc(x.text) + '">' + (x.deleted ? 'put back' : 'remove') + '</button>' : '') + '</li>';
  }
  function pageBody(items, date) {
    var shown = items.filter(function (x) { return (S.showRemoved || !x.deleted) && (!S.tab || (x.station || '') === S.tab); });
    shown.sort(function (a, b) { return (a.addedAt || 0) - (b.addedAt || 0); });
    var order = [], seen = {};
    shown.forEach(function (x) { var k = x.station || ''; if (!seen[k]) { seen[k] = 1; order.push(k); } });
    order.sort(function (a, b) { return (a === '' ? 0 : 1) - (b === '' ? 0 : 1); });
    return order.map(function (sec) {
      var rows = shown.filter(function (x) { return (x.station || '') === sec; });
      var live = rows.filter(function (x) { return !x.deleted; });
      return (sec ? '<div class="nb-hd"><span>' + esc(sec) + '</span><span>' + live.filter(function (x) { return x.done; }).length + '/' + live.length + '</span></div>' : '') +
        '<ul class="nb-rows">' + rows.map(function (x) { return rowHTML(x, date); }).join('') + '</ul>';
    }).join('');
  }
  function recipePicker() {
    var s = S.recipeSearch.trim().toLowerCase();
    var list = D.recipes.filter(function (r) { return (r.kind === 'batch' || r.kind === 'component') && (!s || (r.name + ' ' + (r.short || '')).toLowerCase().indexOf(s) >= 0); }).slice(0, 40);
    return '<details class="p-pick"' + (S.recipeOpen ? ' open' : '') + '><summary data-p="recipe-toggle">Add from the recipes</summary>' +
      '<div class="field"><label class="label" for="p-rs">Find a batch or component recipe</label><input id="p-rs" class="search" type="search" data-k="p-rs" autocomplete="off" value="' + esc(S.recipeSearch) + '"></div>' +
      '<div class="p-recipes">' + (list.length ? list.map(function (r) { return '<button type="button" class="chip sq" data-p="add-recipe" data-id="' + esc(r.id) + '">' + esc(r.short || r.name) + '</button>'; }).join('') : '<span class="hint">No recipe matches.</span>') + '</div>' +
      '<p class="hint">It goes under the section written in the box above.</p></details>';
  }
  function listHTML() {
    var p = me(), today = ymd(new Date());
    var live = S.items.filter(function (x) { return !x.deleted; }), doneN = live.filter(function (x) { return x.done; }).length;
    var pl = S.prev.filter(function (x) { return !x.deleted; }), pDone = pl.filter(function (x) { return x.done; }).length;
    var removed = S.items.filter(function (x) { return x.deleted; });
    var pdate = shift(S.date, -1);
    var secs = {}, tabs = [];
    S.items.concat(S.prev).forEach(function (x) { if (x.station && !x.deleted && !secs[x.station]) { secs[x.station] = 1; tabs.push(x.station); } });
    var tabHTML = tabs.length ? '<nav class="nb-tabs" aria-label="Sections"><button type="button" class="nb-tab" data-p="tab" data-v="" aria-pressed="' + !S.tab + '">All</button>' +
      tabs.map(function (t) { return '<button type="button" class="nb-tab" data-p="tab" data-v="' + esc(t) + '" aria-pressed="' + (S.tab === t) + '">' + esc(t) + '</button>'; }).join('') + '</nav>' : '';
    var sug = suggestions();
    var add = can('add') ?
      '<form class="nb-add" data-p-form="add"><datalist id="p-sections">' + sug.map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join('') + '</datalist>' +
      '<div class="nb-add-row"><label class="visually-hidden" for="p-section">Section</label><input id="p-section" class="nb-in nb-in-sec" data-k="p-section" list="p-sections" autocomplete="off" placeholder="Section (new or old)" maxlength="40" value="' + esc(S.section) + '">' +
      '<label class="visually-hidden" for="p-text">Prep item</label><input id="p-text" class="nb-in nb-in-text" data-k="p-text" autocomplete="off" placeholder="Write a new line..." maxlength="160" value="' + esc(S.text) + '">' +
      '<label class="visually-hidden" for="p-qty">Amount</label><input id="p-qty" class="nb-in nb-in-qty" data-k="p-qty" autocomplete="off" placeholder="Amount" maxlength="40" value="' + esc(S.qty) + '">' +
      '<button type="submit" class="nb-addbtn">Add</button></div>' + recipePicker() + '</form>' : '<p class="hint">You can read the book but not write in it. Ask the admin if that is wrong.</p>';
    var todayEmpty = !live.length && S.itemsState === 'ok' ? '<p class="nb-empty">Nothing written for ' + esc(dayName(S.date).toLowerCase()) + ' yet.</p>' : '';
    var prevEmpty = !S.prev.length ? '<p class="nb-empty">Nothing was written on ' + esc(dayName(pdate).toLowerCase()) + '.</p>' : '';
    var left = '<section class="nb-page nb-left"><header class="nb-ph"><div><h2 class="nb-title" id="rtitle" tabindex="-1">' + esc(dayName(S.date)) + '</h2><span class="nb-date">' + esc(longDate(S.date)) + '</span></div>' +
      '<div class="nb-prog" role="status">' + doneN + ' of ' + live.length + ' done</div></header>' +
      (S.itemsState === 'error' ? '<p class="p-err">Could not load this page. Check the connection.</p>' : '') +
      '<div class="nb-body">' + pageBody(S.items, S.date) + todayEmpty + '</div>' +
      '<div class="nb-foot">' + add + (removed.length && can('del') ? '<button type="button" class="nb-link" data-p="removed">' + (S.showRemoved ? 'Hide' : 'Show') + ' removed (' + removed.length + ')</button>' : '') + '</div></section>';
    var notTicked = S.prev.filter(function (x) { return !x.done && !x.deleted; }).length;
    var right = '<section class="nb-page nb-right"><header class="nb-ph"><div><h2 class="nb-title nb-dim">' + esc(dayName(pdate)) + '</h2><span class="nb-date">' + esc(longDate(pdate)) + '</span></div>' +
      '<div class="nb-prog nb-dim">' + pDone + ' of ' + pl.length + ' done</div></header>' +
      '<div class="nb-body">' + pageBody(S.prev, pdate) + prevEmpty + '</div>' +
      '<div class="nb-foot nb-foot-r"><span class="nb-note">' + (notTicked ? notTicked + (notTicked === 1 ? ' line was' : ' lines were') + ' not ticked' : '') + '</span>' +
      (notTicked && can('add') ? '<button type="button" class="nb-btn" data-p="carry">Copy onto ' + esc(dayName(S.date).toLowerCase()) + '</button>' : '') + '</div></section>';
    return '<div class="nb-top"><span>' + (p ? 'Writing as <strong>' + esc(p.name) + '</strong>' + (can('tick') ? '' : ' (read only)') : '') + '</span><span class="p-links"><button type="button" class="p-link" data-p="who-change">Not you?</button><a class="p-link" href="#/admin">Admin</a></span></div>' +
      '<div class="nb-nav"><button type="button" class="chip" data-p="day" data-d="-1" aria-label="Back one day">&lsaquo;</button>' +
      '<button type="button" class="chip" data-p="today" aria-pressed="' + (S.date === today) + '">Today</button>' +
      '<button type="button" class="chip" data-p="yesterday" aria-pressed="' + (S.date === shift(today, -1)) + '">Yesterday</button>' +
      '<label class="visually-hidden" for="p-day">Pick a date</label><input id="p-day" type="date" class="p-dateinput" data-k="p-day" value="' + esc(S.date) + '">' +
      '<button type="button" class="chip" data-p="day" data-d="1" aria-label="Forward one day">&rsaquo;</button></div>' +
      '<div class="nb-wrap"><div class="nb">' + left + '<div class="nb-spine" aria-hidden="true"></div>' + right + '</div>' + tabHTML + '</div>';
  }
  function ago(ms) {
    if (!ms) return 'never';
    var m = Math.round((Date.now() - ms) / 60000);
    if (m < 2) return 'just now';
    if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60);
    if (h < 24) return h + ' h ago';
    return Math.round(h / 24) + ' days ago';
  }
  function statsHTML() {
    var act = S.activity.slice();
    var byId = {}; act.forEach(function (a) { byId[a.id] = a; });
    var peopleRows = (S.config.people || []).map(function (p) { var a = byId[p.id] || {}; return { id: p.id, name: p.name, added: Math.max(0, a.added || 0), ticked: Math.max(0, a.ticked || 0), visits: a.visits || 0, lastSeen: a.lastSeen || 0 }; });
    var topAdd = peopleRows.slice().sort(function (a, b) { return b.added - a.added; })[0];
    var topTick = peopleRows.slice().sort(function (a, b) { return b.ticked - a.ticked; })[0];
    var rows = peopleRows.sort(function (a, b) { return (b.added + b.ticked) - (a.added + a.ticked); }).map(function (r) {
      return '<tr><th scope="row">' + esc(r.name) + (topAdd && topAdd.added && r.id === topAdd.id ? ' <span class="a-badge">most written</span>' : '') + (topTick && topTick.ticked && r.id === topTick.id ? ' <span class="a-badge">most ticked</span>' : '') + '</th><td>' + r.added + '</td><td>' + r.ticked + '</td><td>' + r.visits + '</td><td>' + esc(ago(r.lastSeen)) + '</td></tr>';
    }).join('');
    var secRows = S.sections.slice().sort(function (a, b) { return (b.uses || 0) - (a.uses || 0); }).map(function (x) {
      return '<tr><th scope="row">' + esc(x.name) + (x.hidden ? ' <span class="a-badge off">hidden</span>' : '') + '</th><td>' + (x.uses || 0) + '</td><td>' + esc(x.lastBy || '') + '</td><td>' + esc(ago(x.lastUsed)) + '</td>' +
        '<td><button type="button" class="p-x" data-p="sec-hide" data-id="' + esc(x.id) + '" data-hide="' + (x.hidden ? '0' : '1') + '">' + (x.hidden ? 'Show in suggestions' : 'Hide from suggestions') + '</button></td></tr>';
    }).join('');
    return '<section class="set-block"><span class="label">Who is writing and ticking</span><span class="hint">Counted in the background since this feature started. Ticks that are taken back are taken off.</span>' +
      '<div class="a-scroll"><table class="a-table"><thead><tr><th scope="col">Name</th><th scope="col">Lines written</th><th scope="col">Ticked off</th><th scope="col">Sign-ins</th><th scope="col">Last seen</th></tr></thead><tbody>' + (rows || '<tr><td colspan="5">No people yet.</td></tr>') + '</tbody></table></div></section>' +
      '<section class="set-block"><span class="label">Sections people have written</span><span class="hint">Sections appear by themselves when someone types a new one. Hide one to stop it showing as a suggestion.</span>' +
      '<div class="a-scroll"><table class="a-table"><thead><tr><th scope="col">Section</th><th scope="col">Lines</th><th scope="col">Last written by</th><th scope="col">Last used</th><th scope="col"></th></tr></thead><tbody>' + (secRows || '<tr><td colspan="5">No sections yet.</td></tr>') + '</tbody></table></div></section>';
  }
  function adminHTML() {
    if (S.authState !== 'ready' && !S.user) {
      return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Admin panel</h2><p class="hint">Loading...</p></section>';
    }
    if (!S.user) {
      return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Admin panel</h2><p class="hint">Sign in with the admin Google account to change names, permissions and see the tallies.</p>' +
        (S.saveMsg ? '<p class="p-err">' + esc(S.saveMsg) + '</p>' : '') +
        '<div class="btn-row"><button type="button" class="btn dark" data-p="signin">Sign in with Google</button><a class="btn" href="#/prep">Back to the prep book</a></div></section>';
    }
    watchActivity();
    if (!S.draft) startDraft();
    var d = S.draft;
    var rows = d.people.map(function (p, i) {
      return '<li class="a-person' + (p.active === false ? ' is-off' : '') + '"><div class="a-top"><label class="visually-hidden" for="a-n' + i + '">Name</label><input id="a-n' + i + '" class="search a-name" data-k="a-n' + i + '" data-a="name" data-i="' + i + '" value="' + esc(p.name) + '" maxlength="40">' +
        '<label class="visually-hidden" for="a-r' + i + '">Role</label><select id="a-r' + i + '" class="p-select" data-k="a-r' + i + '" data-a="role" data-i="' + i + '">' + Object.keys(ROLES).map(function (k) { return '<option value="' + k + '"' + (p.role === k ? ' selected' : '') + '>' + ROLES[k].name + '</option>'; }).join('') + '</select></div>' +
        '<div class="a-perms">' + [['add', 'Write lines'], ['tick', 'Tick lines'], ['del', 'Remove lines']].map(function (c) {
          return '<label class="a-check"><input type="checkbox" data-a="perm" data-perm="' + c[0] + '" data-i="' + i + '"' + (p[c[0]] ? ' checked' : '') + '> ' + c[1] + '</label>';
        }).join('') + '<label class="a-check"><input type="checkbox" data-a="active" data-i="' + i + '"' + (p.active === false ? '' : ' checked') + '> On the list</label>' +
        '<button type="button" class="p-x" data-p="a-reset-pin" data-id="' + esc(p.id) + '">' + (S.resetId === p.id ? 'Tap again to reset PIN' : 'Reset PIN') + '</button>' +
        '<button type="button" class="p-x" data-p="a-remove-person" data-i="' + i + '">Delete</button></div></li>';
    }).join('');
    return '<div class="p-admin"><div class="p-bar"><span>Signed in as <strong>' + esc(S.user.email) + '</strong></span><span class="p-links"><button type="button" class="p-link" data-p="signout">Sign out</button><a class="p-link" href="#/prep">Prep book</a></span></div>' +
      '<h2 class="p-h" id="rtitle" tabindex="-1">Admin panel</h2>' + statsHTML() +
      '<section class="set-block"><span class="label">People</span><span class="hint">Pick a role to set the usual permissions, then adjust the ticks for one person if you need to. Reset PIN lets that person choose a new one. Removing someone from the list keeps their name on old lines.</span>' +
      '<ul class="a-list">' + (rows || '<li class="hint">No names yet.</li>') + '</ul><div class="btn-row"><button type="button" class="btn" data-p="a-add-person">Add a person</button></div>' +
      '<div class="field"><label class="label" for="a-bulk">Add several names</label><textarea id="a-bulk" class="p-bulk" data-k="a-bulk" rows="3" placeholder="One name per line"></textarea></div><div class="btn-row"><button type="button" class="btn" data-p="a-bulk-add">Add these names as Staff</button></div></section>' +
      '<section class="set-block"><div class="btn-row"><button type="button" class="btn dark" data-p="a-save"' + (S.busy ? ' disabled' : '') + '>Save changes</button><button type="button" class="btn" data-p="a-reset">Undo unsaved changes</button></div>' +
      '<span class="saved" role="status">' + esc(S.saveMsg) + '</span></section>' +
      '<section class="set-block"><span class="label">Kitchen PIN</span><span class="hint">The kitchen PIN is part of the security rules in the Firebase console. To change it, change it there and on every phone. People\'s own PINs only say who is writing. They are not a lock.</span></section></div>';
  }
  function bodyHTML() {
    if (!S.pin) return gateHTML();
    if (S.configState === 'error') return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Prep book</h2><p class="p-err">Could not connect. Check the connection and try again.</p><div class="btn-row"><button type="button" class="btn dark" data-p="retry">Try again</button></div></section>';
    if (S.configState !== 'ok') return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Prep book</h2><p class="hint">Connecting...</p></section>';
    if (S.name === 'admin') return adminHTML();
    if (!who()) return whoHTML();
    if (!S.authed) return ownPinHTML();
    return listHTML();
  }
  var rendering = false;
  function draw() {
    if (!S.root || !document.body.contains(S.root) || rendering) return;
    rendering = true;
    var ae = document.activeElement, key = ae && ae.getAttribute && ae.getAttribute('data-k'), start = null, end = null;
    if (key && ae.selectionStart != null) { try { start = ae.selectionStart; end = ae.selectionEnd; } catch (e) {} }
    var bodyEl = S.root.querySelector('.nb-body'), keepScroll = bodyEl ? S.root.querySelectorAll('.nb-body') : null, scrolls = [];
    if (keepScroll) Array.prototype.forEach.call(keepScroll, function (b) { scrolls.push(b.scrollTop); });
    S.root.innerHTML = bodyHTML() + (S.toast ? '<div class="p-toast" role="status">' + esc(S.toast) + '</div>' : '');
    S.root.classList.toggle('is-book', S.name === 'prep' && !!S.root.querySelector('.nb'));
    if (scrolls.length) Array.prototype.forEach.call(S.root.querySelectorAll('.nb-body'), function (b, i) { if (scrolls[i] != null) b.scrollTop = scrolls[i]; });
    if (key) { var el = S.root.querySelector('[data-k="' + key + '"]'); if (el) { el.focus({ preventScroll: true }); if (start != null && el.setSelectionRange) { try { el.setSelectionRange(start, end); } catch (e) {} } } }
    rendering = false;
  }

  /* ---------- events ---------- */
  function onClick(e) {
    var el = e.target.closest('[data-p]');
    if (!el || !S.root || !S.root.contains(el)) return;
    var a = el.getAttribute('data-p'), id = el.getAttribute('data-id'), i = +el.getAttribute('data-i'), dt = el.getAttribute('data-d');
    if (el.tagName === 'SUMMARY') { S.recipeOpen = !S.recipeOpen; return; }
    if (a === 'pin-go') { var v = S.pinInput.trim(); if (!/^\d{4,6}$/.test(v)) { S.pinError = 'The PIN is 4 to 6 digits.'; draw(); return; } S.pin = v; S.pinError = ''; S.pinInput = ''; lsSet('lk.prep.pin', v); connect(); return; }
    if (a === 'pin-forget') { S.pin = ''; lsSet('lk.prep.pin', ''); S.config = null; S.configState = 'idle'; if (unsubCfg) unsubCfg(); if (unsubItems) unsubItems(); if (unsubPrev) unsubPrev(); if (unsubSec) unsubSec(); unsubCfg = unsubItems = unsubPrev = unsubSec = null; cfgKey = itemsKey = ''; draw(); return; }
    if (a === 'retry') { cfgKey = ''; connect(); return; }
    if (a === 'who') { pickName(id); return; }
    if (a === 'who-change') { leave(); return; }
    if (a === 'day') { S.date = shift(S.date, +el.getAttribute('data-d')); S.tab = ''; watchItems(); draw(); return; }
    if (a === 'today') { S.date = ymd(new Date()); S.tab = ''; watchItems(); draw(); return; }
    if (a === 'yesterday') { S.date = shift(ymd(new Date()), -1); S.tab = ''; watchItems(); draw(); return; }
    if (a === 'tab') { S.tab = el.getAttribute('data-v') || ''; draw(); return; }
    if (a === 'tick') { tick(dt || S.date, id); return; }
    if (a === 'del') { removeItem(dt || S.date, id, false); return; }
    if (a === 'restore') { removeItem(dt || S.date, id, true); return; }
    if (a === 'removed') { S.showRemoved = !S.showRemoved; draw(); return; }
    if (a === 'carry') { carryOver(); return; }
    if (a === 'add-recipe') { addRecipe(id); return; }
    if (a === 'signin') { signIn(); return; }
    if (a === 'signout') { signOut(); draw(); return; }
    if (a === 'sec-hide') { hideSection(id, el.getAttribute('data-hide') === '1'); return; }
    if (a === 'a-reset-pin') { resetPin(id); return; }
    if (!S.draft) return;
    var d = S.draft;
    if (a === 'a-add-person') { d.people.push({ id: slug('person') + '-' + Date.now().toString(36), name: '', role: 'staff', add: true, tick: true, del: false, active: true }); draw(); var n = S.root.querySelector('[data-k="a-n' + (d.people.length - 1) + '"]'); if (n) n.focus(); return; }
    if (a === 'a-bulk-add') {
      var box = S.root.querySelector('#a-bulk'); var lines = box ? box.value.split(/\n/).map(function (s) { return s.trim(); }).filter(Boolean) : [];
      lines.forEach(function (nm, k) { d.people.push({ id: slug(nm) + '-' + Date.now().toString(36) + k, name: nm, role: 'staff', add: true, tick: true, del: false, active: true }); });
      draw(); return;
    }
    if (a === 'a-remove-person') { d.people.splice(i, 1); draw(); return; }
    if (a === 'a-save') { adminSave(); return; }
    if (a === 'a-reset') { startDraft(); draw(); return; }
  }
  function onInput(e) {
    var el = e.target, k = el.getAttribute && el.getAttribute('data-k');
    if (!S.root || !S.root.contains(el)) return;
    if (k === 'p-pin') { S.pinInput = el.value.replace(/\D/g, ''); el.value = S.pinInput; return; }
    if (k === 'pf1') { S.pf1 = el.value.replace(/\D/g, ''); el.value = S.pf1; return; }
    if (k === 'pf2') { S.pf2 = el.value.replace(/\D/g, ''); el.value = S.pf2; return; }
    if (k === 'p-text') { S.text = el.value; return; }
    if (k === 'p-qty') { S.qty = el.value; return; }
    if (k === 'p-section') { S.section = el.value; return; }
    if (k === 'p-rs') { S.recipeSearch = el.value; S.recipeOpen = true; draw(); return; }
    var a = el.getAttribute && el.getAttribute('data-a');
    if (!a || !S.draft) return;
    var i = +el.getAttribute('data-i'), d = S.draft;
    if (a === 'name') d.people[i].name = el.value;
  }
  function onChange(e) {
    var el = e.target, k = el.getAttribute && el.getAttribute('data-k');
    if (!S.root || !S.root.contains(el)) return;
    if (k === 'p-day') { if (el.value) { S.date = el.value; S.tab = ''; watchItems(); draw(); } return; }
    var a = el.getAttribute && el.getAttribute('data-a');
    if (!a || !S.draft) return;
    var i = +el.getAttribute('data-i'), p = S.draft.people[i];
    if (a === 'role') { p.role = el.value; var r = ROLES[el.value]; p.add = r.add; p.tick = r.tick; p.del = r.del; draw(); }
    else if (a === 'perm') { p[el.getAttribute('data-perm')] = el.checked; }
    else if (a === 'active') { p.active = el.checked; draw(); }
  }
  function onSubmit(e) {
    var f = e.target.getAttribute && e.target.getAttribute('data-p-form');
    if (f === 'add') { e.preventDefault(); addTyped(); }
    else if (f === 'pin') { e.preventDefault(); submitPin(); }
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
