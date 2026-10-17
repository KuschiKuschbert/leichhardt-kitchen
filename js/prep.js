/*
  Leichhardt Kitchen prep list.
  Staff add and tick prep items on any phone. Everything syncs live through Firebase (Cloud Firestore, free plan).

  Pages:   #/prep    the daily prep list
           #/admin   admin panel (names, permissions, tallies), Google sign-in for the admin only

  Data (the kitchen PIN is part of the path, so only people who know it can reach the data):
    kitchens/<PIN>/config/main                 { people: [...] }                    read by staff, written by the admin only
    kitchens/<PIN>/days/<YYYY-MM-DD>/items/<id> one prep item per document (removed items are only flagged, never erased)
    kitchens/<PIN>/staffpins/<personId>        { hash }   each person's own PIN (hashed). Nobody can read it; the rules compare it on every write
    kitchens/<PIN>/pinset/<personId>           { at }   only says that a PIN has been chosen
    kitchens/<PIN>/proofs/<personId>           { tok, at } write only: sent with each write so the rules can check the writer's PIN (at = server time, so an old proof cannot be reused)
    kitchens/<PIN>/activity/<personId>         { name, added, ticked, visits, lastSeen }   tallies shown in the admin panel
    kitchens/<PIN>/sections/<slug>             { name, uses, lastUsed }   sections people have written, offered as suggestions

  Who is allowed to add, tick or remove is set in the admin panel. Those permissions guide the page. The security
  rules in the Firebase console are what really lock the data: the kitchen PIN to read, a person's own PIN to write,
  the admin's Google account for settings.
*/
(function () {
  'use strict';

  var FB = window.LK_FIREBASE, D = window.LK_DATA || { recipes: [] };
  var SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
  var ROLES = {
    lead: { name: 'Lead', add: true, tick: true, del: true },
    sous: { name: 'Sous chef', add: true, tick: true, del: true },
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
    section: '', text: '', qty: '', recipeSearch: '', recipeOpen: false, tab: '',
    authed: false, tok: '', pinStep: '', pinData: null, pf1: '', pf2: '', pinMsg: '',
    sections: [], activity: [], resetId: '', hideDone: false, rolledFor: '', learned: [], pickedText: '', staffOpen: false, exporting: '', moving: false, moveMsg: '', newPin: '', atab: lsGet('lk.prep.atab') || 'insights', ordDate: ymd(new Date()), ordLines: [], ordState: 'idle', ordView: 'day', otext: '', oqty: '', ordAll: [], ordAllAt: 0, ordBusy: false, osugg: [],
    wDate: ymd(new Date()), wLines: [], wState: 'idle', wReview: null, wrA: null, wrC: null, wf: { text: '', amt: '', unit: 'kg', reason: '', sec: '', act: '' }, wRecent: null, wsugg: [], wNote: null, wNoteFor: '', wStats: null, misses: null, heat: 'w', hist: {},
    adminsFor: '', level: '', stats: null, statsRange: 14, week: null, weekAt: 0, weekBusy: false,
    user: null, authState: 'idle', draft: null, saveMsg: '', busy: false, toast: '', toastAct: null
  };
  var fb = null, sdkP = null, unsubCfg = null, unsubItems = null, unsubSec = null, unsubAct = null, unsubLrn = null;
  var itemsKey = '', cfgKey = '', toastTimer = null, resumed = false;

  /* ---------- Firebase (loaded only when the prep pages are opened) ---------- */
  function sdk() {
    if (sdkP) return sdkP;
    sdkP = Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-firestore.js'), import(SDK + 'firebase-auth.js'), FB.appCheckKey ? import(SDK + 'firebase-app-check.js') : Promise.resolve(null)]).then(function (m) {
      var app = m[0].initializeApp(FB), fs = m[1], au = m[2], db;
      if (FB.appCheckKey && m[3]) { try { m[3].initializeAppCheck(app, { provider: new m[3].ReCaptchaV3Provider(FB.appCheckKey), isTokenAutoRefreshEnabled: true }); } catch (e) {} }
      try { db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) }); }
      catch (e) { db = fs.getFirestore(app); }
      var auth = au.getAuth(app);
      fb = { app: app, fs: fs, au: au, db: db, auth: auth };
      au.onAuthStateChanged(auth, function (u) { S.user = u; S.authState = 'ready'; lsSet('lk.admin', u ? '1' : ''); draw(); });
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
        S.configState = 'ok'; watchItems(); watchSections(); watchLearned(); if (S.name === 'orders') watchOrders(); if (S.name === 'waste') watchWaste(); resume(); draw();
      }, function (err) {
        S.configState = err && err.code === 'permission-denied' ? 'badpin' : 'error';
        if (S.configState === 'badpin') { S.pinError = 'That PIN is not right.'; S.pin = ''; lsSet('lk.prep.pin', ''); cfgKey = ''; unsubCfg = null; }
        draw();
      });
    }, function () { S.configState = 'error'; draw(); });
  }
  var unsubOrd = null, ordKey = '';
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
  function watchLearned() {
    if (unsubLrn || !fb) return;
    unsubLrn = fb.fs.onSnapshot(colRef('learned'), function (snap) {
      S.learned = snap.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
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
  /* only the head chef (signed in with Google) and sous chefs may look at other days; everyone else stays on today */
  function canBrowse() { return S.level === 'owner' || isSous(); }
  function can(what) { var p = me(); return !!(p && p[what]); }
  function toast(msg, act) { S.toast = msg; S.toastAct = act || null; draw(); clearTimeout(toastTimer); toastTimer = setTimeout(function () { S.toast = ''; S.toastAct = null; draw(); }, act ? 9000 : 3500); }

  function sha(str) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  function randomHex() { var a = new Uint8Array(8); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  /* Every write carries the writer's id (by) and, in the same batch, a write-only proof of their own PIN.
     The security rules compare that proof with the stored PIN, so only people who know a personal PIN can write. */
  function W(ops) {
    var b = fb.fs.writeBatch(fb.db), pf = S.who && S.tok;
    if (pf) b.set(docRef('proofs', S.who), { tok: S.tok, at: fb.fs.serverTimestamp() });
    ops.forEach(function (o) {
      var data = pf ? Object.assign({ by: S.who }, o[2]) : o[2];
      if (o[0] === 'upd') b.update(o[1], data); else if (o[3]) b.set(o[1], data, { merge: true }); else b.set(o[1], data);
    });
    return b.commit();
  }
  function sset(ref, data, merge) { return W([['set', ref, data, merge]]); }
  function supd(ref, data) { return W([['upd', ref, data]]); }
  function pinHash(id, pin) { return sha('lk:' + id + ':' + pin); }
  /* four drawn cells over one real input: numbers only, shown as dots */
  function pinField(id, k, val) {
    var cells = '', i;
    for (i = 0; i < 4; i++) cells += '<span class="pin-cell' + (i < val.length ? ' full' : '') + (i === Math.min(val.length, 3) ? ' on' : '') + '" aria-hidden="true">' + (i < val.length ? '\u25CF' : '') + '</span>';
    return '<div class="pinbox"><div class="pin-cells">' + cells + '</div><input id="' + id + '" class="pin-in" type="password" data-k="' + k + '" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="4" aria-label="4 digit PIN" value="' + esc(val) + '"></div>';
  }
  function pinCells(el) {
    var cs = el.parentNode.querySelectorAll('.pin-cell'), n = el.value.length, i;
    for (i = 0; i < cs.length; i++) { cs[i].className = 'pin-cell' + (i < n ? ' full' : '') + (i === Math.min(n, 3) ? ' on' : ''); cs[i].textContent = i < n ? '\u25CF' : ''; }
  }
  function bump(patch) {
    // adds to a person's tally in the background; never blocks the page
    var p = who(); if (!p || !fb) return;
    var f = fb.fs, data = { name: p.name };
    Object.keys(patch).forEach(function (k) { data[k] = (k === 'lastSeen' || k === 'lastAdded') ? patch[k] : f.increment(patch[k]); });
    sset(docRef('activity', p.id), data, true).catch(function () {});
  }
  function pickName(id) {
    S.who = id; lsSet('lk.prep.who', id); lsSet('lk.prep.tok', ''); S.authed = false; S.tok = ''; S.pf1 = S.pf2 = ''; S.pinMsg = ''; S.pinStep = 'checking'; draw();
    fb.fs.getDoc(docRef('pinset', id)).then(function (s) { S.pinStep = s.exists() ? 'enter' : 'set'; draw(); },
      function () { S.pinStep = 'error'; draw(); });
  }
  function signedIn(id, hash) {
    S.authed = true; S.tok = hash; S.pf1 = S.pf2 = ''; S.pinMsg = ''; S.pinStep = '';
    lsSet('lk.prep.tok', id + ':' + hash);
    draw();
  }
  /* After 3 wrong PINs the page makes the person wait (1, 2, 5, 15 then 30 minutes). Kept on the phone, so a reload does not skip it.
     This slows someone using the page; it cannot stop a script that talks to the database directly. */
  var WAITS = [60, 120, 300, 900, 1800];
  function lockGet() { try { return JSON.parse(lsGet('lk.prep.lock') || '{}'); } catch (e) { return {}; } }
  function lockLeft() { var l = lockGet(); return Math.max(0, Math.ceil(((l.until || 0) - Date.now()) / 1000)); }
  function lockFail() {
    var l = lockGet(); l.n = (l.n || 0) + 1; l.f = l.f || 0;
    if (l.n >= 3) { l.until = Date.now() + WAITS[Math.min(l.f, WAITS.length - 1)] * 1000; l.f++; l.n = 0; }
    lsSet('lk.prep.lock', JSON.stringify(l)); return l;
  }
  function lockWait(sec) { return 'Too many wrong tries. Wait ' + (sec >= 60 ? Math.ceil(sec / 60) + ' minute' + (sec > 60 ? 's' : '') : sec + ' seconds') + ' and try again.'; }
  function submitPin() {
    var id = S.who, p = who();
    if (!p) return;
    if (!/^\d{4}$/.test(S.pf1)) { S.pinMsg = 'Your PIN is 4 digits.'; draw(); return; }
    if (S.pinStep === 'set') {
      if (S.pf1 !== S.pf2) { S.pinMsg = 'The two PINs do not match.'; draw(); return; }
      pinHash(id, S.pf1).then(function (h) {
        var b = fb.fs.writeBatch(fb.db);
        b.set(docRef('staffpins', id), { hash: h, setAt: Date.now(), name: p.name });
        b.set(docRef('pinset', id), { at: Date.now(), name: p.name });
        return b.commit().then(function () { signedIn(id, h); S.tok = h; bump({ visits: 1, lastSeen: Date.now() }); });
      }).catch(function () { S.pinMsg = 'Could not save your PIN. If someone already set one for this name, pick the name again.'; draw(); });
      return;
    }
    if (S.pinStep === 'enter') {
      if (lockLeft() > 0) { S.pinMsg = lockWait(lockLeft()); S.pf1 = ''; draw(); return; }
      pinHash(id, S.pf1).then(function (h) {
        S.who = id; S.tok = h;
        // a write only succeeds with the right PIN, so a visit count doubles as the PIN check
        return sset(docRef('activity', id), { name: p.name, visits: fb.fs.increment(1), lastSeen: Date.now() }, true).then(function () { lsSet('lk.prep.lock', ''); signedIn(id, h); },
          function (e) {
            S.tok = '';
            if (e && e.code === 'permission-denied') { lockFail(); S.pinMsg = lockLeft() > 0 ? lockWait(lockLeft()) : 'That PIN is not right.'; S.pf1 = ''; }
            else S.pinMsg = 'Could not check your PIN. Check the connection.';
            draw();
          });
      });
    }
  }
  function resume() {
    // a phone that has signed in before stays signed in, unless the admin has reset that PIN
    if (resumed || !S.who) return;
    resumed = true;
    var tok = (lsGet('lk.prep.tok') || '').split(':');
    if (tok[0] !== S.who || !tok[1]) { if (S.who) pickName(S.who); return; }
    S.authed = true; S.tok = tok[1]; draw();
    sset(docRef('activity', S.who), { name: (who() || {}).name || '', visits: fb.fs.increment(1), lastSeen: Date.now() }, true).catch(function (e) {
      if (e && e.code === 'permission-denied') { S.authed = false; S.tok = ''; pickName(S.who); }
    });
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
    S.items.forEach(function (x) { var n = x.station; if (n && !seen[n.toLowerCase()]) { seen[n.toLowerCase()] = 1; out.push(n); } });
    return out;
  }

  /* ---------- item actions ---------- */
  function newItem(extra) {
    var p = me(), f = fb.fs, ref = f.doc(itemsCol(S.date));
    var data = Object.assign({ text: '', station: '', qty: '', recipe: '', addedBy: p ? p.name : '', addedById: p ? p.id : '', addedAt: Date.now(), done: false, deleted: false }, extra);
    var pr = sset(ref, data); pr.id = ref.id; return pr;
  }
  function noteSection(name) {
    if (!name || !fb) return;
    var p = who();
    sset(docRef('sections', slug(name)), { name: name, uses: fb.fs.increment(1), lastUsed: Date.now(), lastBy: p ? p.name : '' }, true).catch(function () {});
  }
  function addTyped() {
    var t = S.text.trim();
    if (!t || !can('add')) return;
    var sec = cleanSection(S.section), typedAs = t, pr = proofread(t), fixed = pr.changes.length || pr.text !== t;
    t = pr.text;
    var rm = matchRecipe(t);
    if (!sec) { var lx = learnedFor(t); if (lx && bestSection(lx)) sec = bestSection(lx); }
    var made = newItem(Object.assign({ text: t.slice(0, 160), qty: S.qty.trim().slice(0, 40), station: sec, recipe: rm ? rm.id : '' }, fixed ? { orig: typedAs.slice(0, 160) } : {}));
    made.catch(function () { toast('Could not save. Check the connection.'); });
    noteSection(sec); bump({ added: 1, lastAdded: Date.now() }); learn(t, sec, t === S.pickedText ? 'pick' : 'type', S.qty);
    if (pr.changes.length) {
      var ch = pr.changes, mid = made.id, dte = S.date;
      toast('Corrected ' + ch.map(function (c) { return c[0] + ' to ' + c[1]; }).join(', '), { label: 'Undo', fn: function () {
        keepWords(ch);
        supd(itemRef(dte, mid), { text: typedAs.slice(0, 160), orig: '' }).catch(function () { toast('Could not undo.'); });
      } });
    }
    S.text = ''; S.qty = ''; S.section = sec; S.pickedText = ''; draw();
    var el = S.root && S.root.querySelector('[data-k="p-text"]'); if (el) el.focus();
  }
  function addRecipe(id) {
    var r = D.recipes.filter(function (x) { return x.id === id; })[0];
    if (!r || !can('add')) return;
    var sec = cleanSection(S.section);
    newItem({ text: (r.short || r.name), recipe: r.id, qty: S.qty.trim().slice(0, 40), station: sec }).catch(function () { toast('Could not save. Check the connection.'); });
    noteSection(sec); bump({ added: 1, lastAdded: Date.now() }); learn(r.short || r.name, sec, 'pick', S.qty);
    S.qty = ''; S.recipeSearch = ''; S.recipeOpen = false; toast('Added ' + (r.short || r.name));
  }
  function canUntick(x) {
    return canBrowse() || (!!x.doneById && x.doneById === S.who && Date.now() - (x.doneAt || 0) < 110000);
  }
  function tick(date, id) {
    var it = S.items.filter(function (x) { return x.id === id; })[0], p = me();
    if (!it || !can('tick')) return;
    var done = !it.done;
    if (!done && !canUntick(it)) { toast('Ticked lines stay ticked. Ask the head chef or sous chef to undo it.'); return; }
    supd(itemRef(date, id), { done: done, doneBy: done ? p.name : '', doneById: done ? p.id : '', doneAt: done ? Date.now() : 0 }).catch(function () { toast('Could not save. Check the connection.'); });
    if (done) bump({ ticked: 1 });
    else if (it.doneById && fb) sset(docRef('activity', it.doneById), { name: it.doneBy || '', ticked: fb.fs.increment(-1) }, true).catch(function () {});
  }
  function removeItem(date, id, restore) {
    var p = me();
    if (!can('del')) return;
    supd(itemRef(date, id), { deleted: !restore, deletedBy: restore ? '' : p.name, deletedAt: restore ? 0 : Date.now() }).catch(function () { toast('Could not save. Check the connection.'); });
  }
  /* Anything not ticked on the last written day rolls onto today by itself. */
  function maybeRoll() {
    var today = ymd(new Date());
    if (!S.authed || !fb || !can('add') || S.date !== today || S.itemsState !== 'ok' || S.rolledFor === today) return;
    S.rolledFor = today;
    var dates = [], k;
    for (k = 1; k <= 7; k++) dates.push(shift(today, -k));
    Promise.all([fb.fs.getDocs(itemsCol(today))].concat(dates.map(function (d) { return fb.fs.getDocs(itemsCol(d)); }))).then(function (res) {
      var have = {};
      res[0].docs.forEach(function (d) { have[d.id] = true; });
      var src = null, j;
      for (j = 1; j < res.length && !src; j++) {
        var docs = res[j].docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }).filter(function (x) { return !x.deleted; });
        if (docs.length) src = { date: dates[j - 1], items: docs };
      }
      if (!src) return;
      var jobs = [];
      src.items.forEach(function (x) {
        if (x.done) return;
        var root = x.root || x.id, id = 'r' + today.replace(/-/g, '') + '-' + root;
        if (have[id]) return;
        have[id] = true;
        jobs.push(sset(itemRef(today, id), {
          text: x.text, station: x.station || '', qty: x.qty || '', recipe: x.recipe || '',
          addedBy: 'Rolled over', addedById: '', addedAt: Date.now(), done: false, deleted: false,
          rolled: (x.rolled || 0) + 1, root: root, from: x.id, rolledFrom: src.date, origBy: x.origBy || x.addedBy || '', urgent: !!x.urgent
        }));
      });
      if (!jobs.length) return;
      return Promise.all(jobs).then(function () { toast(jobs.length + (jobs.length === 1 ? ' line' : ' lines') + ' rolled over from ' + dayName(src.date).toLowerCase()); });
    }).catch(function () { S.rolledFor = ''; });
  }
  function toggleUrgent(id) {
    var it = S.items.filter(function (x) { return x.id === id; })[0];
    if (!it || !can('add')) return;
    var p = me(), on = !it.urgent;
    supd(itemRef(S.date, id), { urgent: on, urgentBy: on && p ? p.name : '', urgentById: on && p ? p.id : '', urgentAt: on ? Date.now() : 0 }).catch(function () { toast('Could not save. Check the connection.'); });
  }

  /* ---------- proofreading: every new line is tidied and spell-checked before it is saved ---------- */
  var KITCHEN = ('blanch julienne dice diced slice sliced marinate marinated portion portioned batch wash pick chop chopped shred shredded trim tray crumb crumbed batter gravy sauce stock reduce season seasoned mix mixed roast roasted smoke smoked pulled pull cook cooked cool chill chilled defrost thaw label date rotate fill refill restock set setup stack fold grate grated peel peeled core cut cure brine rub glaze whip whipped steam steamed fry fried grill grilled bake baked char charred toast toasted dress dressing garnish drizzle lemon lime orange tomato tomatoes onion onions garlic potato potatoes lettuce cucumber carrot carrots cabbage capsicum mushroom mushrooms bacon cheese chicken beef pork lamb barramundi calamari prawn prawns salmon rice pasta mash chips fries slaw coleslaw aioli mayo mayonnaise pickle pickles parmesan parmigiana parmy schnitzel schnitty beetroot spinach broccoli zucchini pumpkin sweet corn peas beans dough pastry pie pies brownie cookie caramel butterscotch cream ice vanilla chocolate guinness snickers laksa coconut asian greens oak leaf salad salads burger burgers patties patty bun buns brioche ribs rib wings wing steak sandwich skillet spring rolls roll roll bourbon bbq chilli chili ginger shallot shallots herbs parsley coriander basil thyme rosemary sage mint dill chives pepper salt sugar flour butter milk eggs egg oil vinegar mustard ketchup tomato relish jus beer batter fish chip sauce sides side dessert desserts entree entrees mains main kids ketchup bacon jam onion rings nachos tacos taco quesadilla wrap wraps hummus dip dips bread garlic focaccia fetta feta halloumi mozzarella cheddar swiss tasty gravy peppercorn mushroom diane creamy white red green yellow large small half full double single extra spare backup morning afternoon night lunch dinner breakfast service base bases bowl bowls sheet sheets lid lids tub tubs bag bags pack packs cup cups jar jars pot pots pan pans oven rack racks jug jugs make made need needs more less last next each every both some thing things stuff work done ready first top bottom front back cold hot warm mild spicy fresh frozen dried raw plain with without from into over under before after until only also then than that this these those mince stir drain rest wrap cover covered uncover break bone bones skin skinned skinless fillet fillets cube cubes strip strips wedge wedges round rounds ring rings whole sliced thick thin fine rough coarse smooth').split(/\s+/);
  var vocabCache = null, vocabKey = '';
  function vocab() {
    var key = S.learned.length + ':' + D.recipes.length;
    if (vocabCache && vocabKey === key) return vocabCache;
    var v = {};
    function add(t, w) { String(t || '').toLowerCase().split(/[^a-z']+/).forEach(function (x) { if (x.length >= 3) v[x] = Math.max(v[x] || 0, w); }); }
    KITCHEN.forEach(function (w) { add(w, 1); });
    D.recipes.forEach(function (r) { add(r.name, 3); add(r.short, 3); (r.ingredients || []).forEach(function (i) { add(i.name, 2); }); });
    S.learned.forEach(function (x) { add(x.text, 2 + Math.min(5, x.uses || 0)); });
    vocabCache = v; vocabKey = key; return v;
  }
  function osa(a, b) {
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (j = 1; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) {
      var c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[a.length][b.length];
  }
  var KEEP = (function () { try { return JSON.parse(lsGet('lk.prep.keep') || '{}'); } catch (e) { return {}; } })();
  function keepWords(list) { list.forEach(function (c) { KEEP[c[0].toLowerCase()] = 1; }); lsSet('lk.prep.keep', JSON.stringify(KEEP)); }
  function fixWord(w) {
    var lw = w.toLowerCase(), v = vocab();
    if (lw.length < 4 || v[lw] || KEEP[lw] || v[lw.replace(/(es|s|ed|ing)$/, '')] || v[lw.replace(/s$/, '')]) return null;
    var maxd = lw.length >= 8 ? 2 : 1, best = null, bd = 9, bw = -1, tie = false;
    Object.keys(v).forEach(function (c) {
      if (c[0] !== lw[0] || Math.abs(c.length - lw.length) > maxd) return;
      var dd = osa(lw, c);
      if (dd > maxd) return;
      if (dd < bd || (dd === bd && v[c] > bw)) { best = c; bd = dd; bw = v[c]; tie = false; }
      else if (dd === bd && v[c] === bw) tie = true;
    });
    if (!best || tie) return null;
    if (w === w.toUpperCase() && w.length > 1) return best.toUpperCase();
    if (w[0] === w[0].toUpperCase()) return best[0].toUpperCase() + best.slice(1);
    return best;
  }
  function proofread(text) {
    var changes = [], t = String(text).replace(/\s+/g, ' ').trim().replace(/\s+([,.;:!?])/g, '$1').replace(/([,;:])(?=\S)/g, '$1 ');
    t = t.replace(/[A-Za-z']+/g, function (w) { var f = fixWord(w); if (f && f !== w) { changes.push([w, f]); return f; } return w; });
    if (/^[a-z]/.test(t)) t = t[0].toUpperCase() + t.slice(1);
    return { text: t, changes: changes };
  }

  /* ---------- the prep list learns: every line added is counted per item, weekday and section ---------- */
  var REGULAR = 4;   // typed or picked this many times and it becomes a regular
  function lkey(t) { return slug(String(t).toLowerCase()).slice(0, 80); }
  function learn(text, sec, how, qty) {
    if (!fb || !text) return;
    var p = who(), f = fb.fs, dow = String(parseYmd(S.date).getDay()), sk = lkey(sec || 'general');
    var secs = {}; secs[sk] = { name: sec || '', n: f.increment(1) };
    var data = { text: String(text).trim().slice(0, 160), uses: f.increment(1), lastUsed: Date.now(), lastBy: p ? p.name : '', dow: {}, secs: secs };
    data.dow[dow] = f.increment(1);
    data[how === 'pick' ? 'picked' : 'typed'] = f.increment(1);
    qty = String(qty || '').trim().slice(0, 40);
    if (qty) { data.qtys = {}; data.qtys[lkey(qty).slice(0, 40)] = { q: qty, n: f.increment(1) }; }
    sset(docRef('learned', lkey(text)), data, true).catch(function () {});
    markLive(S.date);
  }
  function learnedFor(text) { var k = lkey(text); return S.learned.filter(function (x) { return x.id === k; })[0] || null; }
  function bestSection(x) {
    var best = '', n = 0;
    Object.keys(x.secs || {}).forEach(function (k) { var v = x.secs[k]; if (v && v.name && v.n > n) { n = v.n; best = v.name; } });
    return best;
  }
  /* Amounts written for a line before: the learned record (kept for good) and the last 7 days, most used first. */
  function qtyList(text) {
    var k = lkey(String(text || '').trim()), out = {}, lx = S.learned.filter(function (x) { return x.id === k; })[0], h = (S.hist || {})[k];
    if (!k) return [];
    Object.keys((lx && lx.qtys) || {}).forEach(function (q) { var v = lx.qtys[q]; if (v && v.q) out[q] = { q: v.q, n: v.n || 0 }; });
    Object.keys((h && h.q) || {}).forEach(function (q) { var v = h.q[q]; if (!out[q] || out[q].n < v.n) out[q] = { q: v.q, n: v.n }; });
    return Object.keys(out).map(function (q) { return out[q]; }).sort(function (a, b) { return b.n - a.n; });
  }
  function usualQty(text) {
    var l = qtyList(text), tot = 0;
    l.forEach(function (x) { tot += x.n; });
    return l.length && l[0].n >= 2 && l[0].n / tot >= 0.5 ? l[0].q : '';
  }
  function qtyChipsHTML() {
    if (S.qty.trim() || S.text.trim().length < 3) return '';
    var l = qtyList(S.text).slice(0, 3);
    if (!l.length) return '';
    return '<span class="nb-ql">Usual amount</span>' + l.map(function (x) { return '<button type="button" class="chip sq nb-qc" data-p="qset" data-v="' + esc(x.q) + '">' + esc(x.q) + '</button>'; }).join('');
  }
  /* Start here: up to three open lines to do first, across all sections. */
  function startHere(live) {
    var open = live.filter(function (x) { return !x.done; }), picked = [], seen = {};
    function take(list, why) { list.forEach(function (x) { if (picked.length < 3 && !seen[x.id]) { seen[x.id] = 1; picked.push({ x: x, why: why(x) }); } }); }
    take(open.filter(function (x) { return x.urgent; }).sort(function (a, b) { return (a.addedAt || 0) - (b.addedAt || 0); }), function () { return 'Urgent'; });
    take(open.filter(function (x) { return x.rolled; }).sort(function (a, b) { return (b.rolled || 0) - (a.rolled || 0); }), function (x) { return 'Rolled over' + (x.rolled > 1 ? ' x' + x.rolled : ''); });
    var slow = open.map(function (x) { return { x: x, m: ((S.hist || {})[lkey(x.text)] || {}).med || 0 }; }).filter(function (o) { return o.m >= 2 * 3600000; }).sort(function (a, b) { return b.m - a.m; }).map(function (o) { return o.x; });
    take(slow, function (x) { return 'Usually takes ' + dur(((S.hist || {})[lkey(x.text)] || {}).med); });
    take(open.slice().sort(function (a, b) { return (a.addedAt || 0) - (b.addedAt || 0); }), function (x) { return x.addedAt ? 'Waiting since ' + clock(x.addedAt) : 'Waiting longest'; });
    return picked;
  }
  function startHTML(live) {
    if (!can('tick') || S.date !== ymd(new Date())) return '';
    if (live.filter(function (x) { return !x.done; }).length < 4) return '';
    var l = startHere(live);
    return '<div class="nb-start"><span class="nb-sl">Start here</span><ol>' + l.map(function (o) {
      return '<li><button type="button" class="nb-sb" data-p="goto" data-id="' + esc(o.x.id) + '"><span class="nb-st">' + esc(o.x.text) + (o.x.qty ? ' <span class="nb-q">' + esc(o.x.qty) + '</span>' : '') + '</span><span class="nb-sw">' + esc(o.why) + (o.x.station ? ' &middot; ' + esc(o.x.station) : '') + '</span></button></li>';
    }).join('') + '</ol></div>';
  }
  function gotoRow(id) {
    var it = S.items.filter(function (x) { return x.id === id; })[0];
    if (it && S.tab && (it.station || '') !== S.tab) { S.tab = ''; draw(); }
    var row = S.root && S.root.querySelector('#nbr-' + CSS.escape(id));
    if (!row) return;
    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row.classList.remove('is-flash'); void row.offsetWidth; row.classList.add('is-flash');
  }
  function onList() { var h = {}; S.items.forEach(function (x) { if (!x.deleted) h[lkey(x.text)] = 1; }); return h; }
  function isRegular(x) { return !x.hidden && (x.uses || 0) >= REGULAR; }
  function typeahead(q) {
    q = String(q || '').trim().toLowerCase();
    if (q.length < 2) return [];
    var words = q.split(/\s+/), have = onList(), seen = {}, out = [];
    function ok(t) { var l = t.toLowerCase(); return words.every(function (w) { return l.indexOf(w) >= 0; }); }
    S.learned.filter(function (x) { return !x.hidden && x.text && ok(x.text) && !have[x.id]; })
      .sort(function (a, b) { return ((b.text.toLowerCase().indexOf(q) === 0) - (a.text.toLowerCase().indexOf(q) === 0)) || (b.uses || 0) - (a.uses || 0); })
      .forEach(function (x) { seen[x.id] = 1; out.push({ text: x.text, section: bestSection(x), uses: x.uses || 0 }); });
    D.recipes.filter(function (r) { return r.kind === 'batch' || r.kind === 'component'; }).forEach(function (r) {
      var t = r.short || r.name, k = lkey(t);
      if (!seen[k] && !have[k] && ok(t)) { seen[k] = 1; out.push({ text: t, section: '', uses: 0 }); }
    });
    return out.slice(0, 6);
  }
  function suggestHTML() {
    var list = typeahead(S.text);
    S.sugg = list;
    return list.map(function (x, i) { return '<button type="button" class="chip sq nb-sg" data-p="sugg" data-i="' + i + '">' + esc(x.text) + (x.section ? ' <span class="nb-us">' + esc(x.section) + '</span>' : '') + '</button>'; }).join('');
  }
  function pickSugg(i) {
    var x = (S.sugg || [])[i];
    if (!x) return;
    S.text = x.text; S.pickedText = x.text;
    if (!S.section.trim() && x.section) S.section = x.section;
    draw();
    var el = S.root && S.root.querySelector('[data-k="p-text"]'); if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {} }
  }
  function quickAdd(i) {
    var x = (S.quick || [])[i];
    if (!x || !can('add')) return;
    var rm = matchRecipe(x.text), uq = usualQty(x.text);
    newItem({ text: x.text.slice(0, 160), station: x.section, recipe: rm ? rm.id : '', qty: uq }).catch(function () { toast('Could not save. Check the connection.'); });
    noteSection(x.section); bump({ added: 1, lastAdded: Date.now() }); learn(x.text, x.section, 'pick', uq);
  }
  /* Owner backup: everything the book holds, as one JSON file (PIN fingerprints left out). */
  function exportAll() {
    if (!fb || S.exporting) return;
    S.exporting = 'Reading the data...'; draw();
    var f = fb.fs, out = { exportedAt: new Date().toISOString(), config: null, days: {}, orders: {}, waste: {}, wasteReviews: {}, activity: [], sections: [], learned: [], learnlog: [], misses: [], pins: [] };
    function all(name) { return f.getDocs(colRef(name)).then(function (sn) { return sn.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }); }); }
    var today = ymd(new Date()), dates = [], k;
    for (k = 0; k < 400; k++) dates.push(shift(today, -k));
    f.getDoc(cfgDoc()).then(function (sn) { out.config = sn.exists() ? sn.data() : null; })
      .then(function () { return all('activity'); }).then(function (r) { out.activity = r; })
      .then(function () { return all('sections'); }).then(function (r) { out.sections = r; })
      .then(function () { return all('learned'); }).then(function (r) { out.learned = r; })
      .then(function () { return all('learnlog'); }).then(function (r) { out.learnlog = r; })
      .then(function () { return all('misses'); }).then(function (r) { out.misses = r; })
      .then(function () { return all('views'); }).then(function (r) { out.views = r; })
      .then(function () { return all('pinset'); }).then(function (r) { out.pins = r.map(function (x) { return { id: x.id, name: x.name, setAt: x.setAt }; }); })
      .then(function () {
        var i = 0, n = 0;
        function next() {
          if (i >= dates.length) return;
          var chunk = dates.slice(i, i + 20); i += 20;
          S.exporting = 'Reading days ' + Math.min(i, dates.length) + ' of ' + dates.length + '...'; draw();
          function grab(sn) { return sn.docs.map(function (x) { var y = x.data(); y.id = x.id; return y; }); }
          return Promise.all(chunk.map(function (d) { return Promise.all([
            f.getDocs(itemsCol(d)).then(function (sn) { if (sn.docs.length) { out.days[d] = grab(sn); n += sn.docs.length; } }),
            f.getDocs(ordCol(d)).then(function (sn) { if (sn.docs.length) out.orders[d] = grab(sn); }),
            f.getDocs(wCol(d)).then(function (sn) { if (sn.docs.length) out.waste[d] = grab(sn); }),
            f.getDoc(wDay(d)).then(function (sn) { if (sn.exists()) out.wasteReviews[d] = sn.data(); })
          ]); })).then(next);
        }
        return next().then(function () { return n; });
      })
      .then(function (n) {
        var blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }), a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'leichhardt-prep-backup-' + today + '.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        S.exporting = ''; toast('Backup saved: ' + n + ' lines from ' + Object.keys(out.days).length + ' days.');
      }).catch(function () { S.exporting = ''; toast('Could not read everything. Check the connection.'); });
  }
  /* Owner only: copy everything under the current kitchen PIN to a new one, then switch this device over.
     The security rules must already allow the new PIN (see firestore.rules) or the copy is refused. */
  function movePin() {
    var box = S.root.querySelector('#a-newpin'), np = box ? box.value.trim() : '';
    if (S.moving || !fb) return;
    if (!/^\d{4}$/.test(np)) { S.moveMsg = 'The new PIN is exactly 4 digits.'; draw(); return; }
    if (np === S.pin) { S.moveMsg = 'That is the PIN already in use.'; draw(); return; }
    S.moving = true; S.moveMsg = 'Copying...'; draw();
    var f = fb.fs, old = S.pin, n = 0;
    function oc(name) { return f.collection.apply(null, [fb.db, 'kitchens', old, name]); }
    function nd(name, id) { return f.doc(fb.db, 'kitchens', np, name, id); }
    function copyCol(name) { return f.getDocs(oc(name)).then(function (sn) { n += sn.docs.length; return Promise.all(sn.docs.map(function (d) { return f.setDoc(nd(name, d.id), d.data()); })); }); }
    var today = ymd(new Date()), dates = [], k;
    for (k = 0; k < 400; k++) dates.push(shift(today, -k));
    f.getDoc(f.doc(fb.db, 'kitchens', old, 'config', 'main')).then(function (sn) { if (sn.exists()) { n++; return f.setDoc(f.doc(fb.db, 'kitchens', np, 'config', 'main'), sn.data()); } })
      .then(function () { return copyCol('staffpins'); }).then(function () { return copyCol('pinset'); }).then(function () { return copyCol('activity'); }).then(function () { return copyCol('sections'); })
      .then(function () { return copyCol('learned'); }).then(function () { return copyCol('learnlog'); }).then(function () { return copyCol('misses'); }).then(function () { return copyCol('views'); })
      .then(function () {
        var i = 0;
        function next() {
          if (i >= dates.length) return;
          var chunk = dates.slice(i, i + 20); i += 20;
          S.moveMsg = 'Copying days ' + Math.min(i, dates.length) + ' of ' + dates.length + '...'; draw();
          return Promise.all(chunk.map(function (d) {
            function sub(top, col) { return f.getDocs(f.collection(fb.db, 'kitchens', old, top, d, col)).then(function (sn) { n += sn.docs.length; return Promise.all(sn.docs.map(function (x) { return f.setDoc(f.doc(fb.db, 'kitchens', np, top, d, col, x.id), x.data()); })); }); }
            return Promise.all([sub('days', 'items'), sub('orders', 'lines'), sub('waste', 'lines'),
              f.getDoc(f.doc(fb.db, 'kitchens', old, 'waste', d)).then(function (sn) { if (sn.exists()) { n++; return f.setDoc(f.doc(fb.db, 'kitchens', np, 'waste', d), sn.data()); } })]);
          })).then(next);
        }
        return next();
      })
      .then(function () {
        S.moving = false; S.moveMsg = 'Copied ' + n + ' records. This device now uses the new PIN. Everyone else enters the new PIN next time they open the book.';
        S.pin = np; lsSet('lk.prep.pin', np); S.items = []; S.learned = []; S.sections = []; S.activity = [];
        if (unsubCfg) unsubCfg(); if (unsubItems) unsubItems(); if (unsubSec) unsubSec(); if (unsubLrn) unsubLrn(); if (unsubAct) unsubAct();
        unsubCfg = unsubItems = unsubSec = unsubLrn = unsubAct = null; cfgKey = itemsKey = ''; S.rolledFor = ''; S.learnRan = false; S.weekAt = 0; S.stats = null;
        connect();
      }).catch(function (e) { S.moving = false; S.moveMsg = e && e.code === 'permission-denied' ? 'The rules do not allow the new PIN yet. Nothing was changed on the old PIN.' : 'Stopped part way. Nothing was changed on the old PIN, so it is safe to try again.'; draw(); });
  }
  function hideLearned(id, hidden) {
    sset(docRef('learned', id), { hidden: hidden }, true).catch(function () { toast('Could not save.'); });
  }
  /* Progressive learning: every past day (up to 90 back) is read once, by whichever phone opens the book first.
     A day is claimed by creating learnlog/<date>; the rules refuse a second create, so nothing is counted twice. */
  var LEARN_DAYS = 90;
  function markLive(date) {
    if (!fb) return;
    S.marked = S.marked || {};
    if (S.marked[date]) return;
    S.marked[date] = 1;
    sset(docRef('learnlog', date), { at: Date.now(), who: 'live' }).catch(function () {});
  }
  function maybeLearn() {
    if (S.learnRan || !S.authed || !fb || S.configState !== 'ok') return;
    S.learnRan = true;
    setTimeout(autoLearn, 2500);
  }
  function autoLearn() {
    var today = ymd(new Date()), dates = [], k;
    for (k = 1; k <= LEARN_DAYS; k++) dates.push(shift(today, -k));
    S.learnState = { total: LEARN_DAYS, done: 0, running: true };
    fb.fs.getDocs(colRef('learnlog')).then(function (snap) {
      var have = {}; snap.docs.forEach(function (d) { have[d.id] = 1; });
      var todo = dates.filter(function (d) { return !have[d]; });
      S.learnState.done = LEARN_DAYS - todo.length; draw();
      learnChunk(todo, 0);
    }, function () { S.learnState = null; });
  }
  function learnChunk(todo, i) {
    if (i >= todo.length) { if (S.learnState) S.learnState.running = false; draw(); return; }
    var chunk = todo.slice(i, i + 8), f = fb.fs, p = who();
    Promise.all(chunk.map(function (d) {
      return sset(docRef('learnlog', d), { at: Date.now(), who: p ? p.name : '', kind: 'auto' }).then(function () {
        return f.getDocs(itemsCol(d)).then(function (sn) { return { d: d, items: sn.docs.map(function (x) { return x.data(); }) }; });
      }, function () { return null; });
    })).then(function (res) {
      var map = {}, known = {};
      S.learned.forEach(function (x) { known[x.id] = 1; });
      res.filter(Boolean).forEach(function (r) {
        var dow = String(parseYmd(r.d).getDay());
        r.items.forEach(function (x) {
          if (x.deleted || x.rolled || !x.text) return;
          var text = proofread(x.text).text, k = lkey(text);
          var m = map[k] = map[k] || { text: text.slice(0, 160), n: 0, dow: {}, secs: {}, last: 0, by: '' };
          m.n++; m.dow[dow] = (m.dow[dow] || 0) + 1;
          var sk = lkey(x.station || 'general'); m.secs[sk] = m.secs[sk] || { name: x.station || '', n: 0 }; m.secs[sk].n++;
          if ((x.addedAt || 0) >= m.last) { m.last = x.addedAt || 0; m.by = x.addedBy || ''; }
        });
      });
      var jobs = Object.keys(map).map(function (k) {
        var m = map[k], secs = {}, dw = {};
        Object.keys(m.secs).forEach(function (sk) { secs[sk] = { name: m.secs[sk].name, n: f.increment(m.secs[sk].n) }; });
        Object.keys(m.dow).forEach(function (d) { dw[d] = f.increment(m.dow[d]); });
        var data = { text: m.text, uses: f.increment(m.n), typed: f.increment(m.n), dow: dw, secs: secs };
        if (!known[k]) { data.lastUsed = m.last; data.lastBy = m.by; }
        return sset(docRef('learned', k), data, true);
      });
      return Promise.all(jobs).then(function () { if (S.learnState) S.learnState.done += chunk.length; draw(); learnChunk(todo, i + 8); });
    }).catch(function () { if (S.learnState) S.learnState.running = false; });
  }
  function listText() {
    var rows = S.items.filter(function (x) { return !x.deleted; }).sort(sortItems), out = [], last = null;
    out.push('Prep list, ' + dayName(S.date) + ' ' + longDate(S.date));
    rows.forEach(function (x) {
      var sec = x.station || 'General';
      if (sec !== last) { out.push('', sec.toUpperCase()); last = sec; }
      out.push((x.done ? '[x] ' : '[ ] ') + (x.urgent ? 'URGENT ' : '') + (x.rolled ? '(rolled over) ' : '') + x.text + (x.qty ? ' - ' + x.qty : ''));
    });
    return out.join('\n');
  }
  function copyList() {
    var t = listText();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta);
      toast(ok ? 'List copied. Paste it into a message.' : 'Could not copy on this device.');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast('List copied. Paste it into a message.'); }, fallback); else fallback();
  }
  function sortItems(a, b) { return (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || (b.rolled || 0) - (a.rolled || 0) || (a.addedAt || 0) - (b.addedAt || 0); }

  /* ---------- admin actions ---------- */
  function startDraft() {
    var c = S.config || { people: [] };
    S.draft = JSON.parse(JSON.stringify({ people: c.people || [], showBadges: c.showBadges !== false }));
    S.saveMsg = '';
  }
  function saveConfig(cfg) {
    var clean = {
      people: cfg.people.filter(function (p) { return String(p.name).trim(); }).map(function (p) {
        return { id: p.id, name: String(p.name).trim().slice(0, 40), role: p.role || 'staff', add: !!p.add, tick: !!p.tick, del: !!p.del, active: p.active !== false };
      }),
      stations: [], showBadges: cfg.showBadges !== false,
      sousIds: S.user ? cfg.people.filter(function (p) { return p.role === 'sous' && p.active !== false && String(p.name).trim(); }).map(function (p) { return p.id; }) : ((S.config && S.config.sousIds) || []),
      updated: Date.now(), updatedBy: (S.user && S.user.email) || (who() ? who().name : '')
    };
    return sdk().then(function () { return S.user ? fb.fs.setDoc(cfgDoc(), clean) : sset(cfgDoc(), clean); }).then(function () { return clean; });
  }
  function adminSave() {
    S.busy = true; S.saveMsg = 'Saving...'; draw();
    saveConfig(S.draft).then(function () { S.busy = false; startDraft(); S.saveMsg = 'Saved. Everyone sees the changes now.'; draw(); },
      function (e) { S.busy = false; S.saveMsg = e && e.code === 'permission-denied' ? 'Not allowed to change these settings.' : 'Could not save. Check the connection.'; draw(); });
  }
  function resetPin(id) {
    if (S.resetId !== id) { S.resetId = id; draw(); return; }
    S.resetId = '';
    var rb = fb.fs.writeBatch(fb.db); rb.delete(docRef('staffpins', id)); rb.delete(docRef('pinset', id));
    rb.commit().then(function () { toast('PIN reset. They set a new one next time they sign in.'); }, function () { toast('Could not reset. Sign in as the admin.'); });
  }
  function hideSection(id, hidden) {
    sset(docRef('sections', id), { hidden: hidden }, true).catch(function () { toast('Could not save.'); });
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
  function signOut() { if (fb) fb.au.signOut(fb.auth); S.draft = null; S.level = ''; S.adminsFor = ''; S.stats = null; if (unsubAct) { unsubAct(); unsubAct = null; } S.activity = []; }

  /* ---------- recognising recipes in hand-written lines ---------- */
  var STOP = { and: 1, the: 1, for: 1, with: 1, of: 1, a: 1, in: 1, to: 1, on: 1, fresh: 1, more: 1 };
  function toks(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean)
      .filter(function (w) { return !STOP[w]; })
      .map(function (w) { return w.length > 3 && /s$/.test(w) && !/ss$/.test(w) ? w.slice(0, -1) : w; });
  }
  var RIDX = null, RCACHE = {};
  function recipeIndex() {
    if (RIDX) return RIDX;
    RIDX = [];
    D.recipes.forEach(function (r) {
      var seen = {};
      [r.name, r.short].forEach(function (c) {
        var t = toks(c), k = t.join(' ');
        if (!t.length || seen[k]) return;
        if (t.length === 1 && t[0].length < 4) return;
        seen[k] = 1; RIDX.push({ r: r, t: t });
      });
    });
    return RIDX;
  }
  function matchRecipe(text) {
    // a line links to a recipe card when every word of the card's name (or short name) is in the line.
    // The most specific card wins, batch and component cards win ties. Otherwise a line that is only part of
    // one card's name links to it, when that is the only card it could mean.
    var key = String(text || '').toLowerCase();
    if (RCACHE.hasOwnProperty(key)) return RCACHE[key];
    var tt = toks(text), res = null;
    if (tt.length) {
      var set = {}, best = null;
      tt.forEach(function (w) { set[w] = 1; });
      recipeIndex().forEach(function (c) {
        if (!c.t.every(function (w) { return set[w]; })) return;
        var pri = (c.r.kind === 'batch' || c.r.kind === 'component') ? 0 : 1, bp = best ? ((best.r.kind === 'batch' || best.r.kind === 'component') ? 0 : 1) : 0;
        if (!best || c.t.length > best.t.length || (c.t.length === best.t.length && pri < bp)) best = c;
      });
      if (best) res = best.r;
      else {
        var hits = {}, n = 0, one = null;
        recipeIndex().forEach(function (c) {
          if (tt.every(function (w) { return c.t.indexOf(w) >= 0; }) && c.t.length <= tt.length + 2 && !hits[c.r.id]) { hits[c.r.id] = 1; n++; one = c.r; }
        });
        if (n === 1) res = one;
      }
    }
    RCACHE[key] = res;
    return res;
  }
  function recipeById(id) { return D.recipes.filter(function (r) { return r.id === id; })[0] || null; }

  /* ---------- who is the owner: only the owner's Google account may read config/admins, so a successful read proves it ---------- */
  function adminsRef() { return docRef('config', 'admins'); }
  function loadAdmins() {
    if (!S.user || !fb || S.configState !== 'ok') return;
    var em = S.user.email || '';
    if (S.adminsFor === em) return;
    S.adminsFor = em; S.level = '';
    fb.fs.getDoc(adminsRef()).then(function () { S.level = 'owner'; seedSous(); draw(); }, function () { S.level = 'none'; draw(); });
  }
  /* the rules let a sous chef edit the staff list only if listed in sousIds, so the owner keeps that list in step */
  function seedSous() {
    var c = S.config; if (!c || !c.people) return;
    var want = c.people.filter(function (p) { return p.role === 'sous' && p.active !== false; }).map(function (p) { return p.id; }).sort().join(',');
    if ((c.sousIds || []).slice().sort().join(',') === want) return;
    saveConfig({ people: c.people, showBadges: c.showBadges }).catch(function () {});
  }
  /* ---------- the last 14 days, read once a day per phone ----------
     Past days hardly change, so they are read once a day and kept on the phone. Today comes from the live list.
     The weekly badges, usual amounts, Start here, Due today, the pace card and the close-out nudge all work from this. */
  var PAST_DAYS = 14, PAST_KEYS = ['text', 'station', 'qty', 'addedBy', 'addedById', 'addedAt', 'done', 'doneBy', 'doneById', 'doneAt', 'rolled', 'deleted', 'urgent'];
  function loadPast() {
    var today = ymd(new Date()), tag = S.pin + '|' + today;
    if (!fb || S.pastBusy || S.pastFor === tag) return;
    try { var c = JSON.parse(lsGet('lk.past') || 'null'); if (c && c.tag === tag && c.days) { S.past = c.days; S.pastFor = tag; pastDerive(); return; } } catch (e) {}
    S.pastBusy = true;
    var dates = [], i;
    for (i = 1; i <= PAST_DAYS; i++) dates.push(shift(today, -i));
    Promise.all(dates.map(function (d) { return fb.fs.getDocs(itemsCol(d)).then(function (sn) { return [d, sn.docs.map(function (x) { var v = x.data(), o = {}; PAST_KEYS.forEach(function (k) { if (v[k] != null && v[k] !== '' && v[k] !== false && v[k] !== 0) o[k] = v[k]; }); return o; })]; }, function () { return [d, null]; }); })).then(function (res) {
      var days = {}, ok = true;
      res.forEach(function (r) { if (r[1] === null) ok = false; else days[r[0]] = r[1]; });
      S.past = days; S.pastFor = tag; S.pastBusy = false;
      if (ok) lsSet('lk.past', JSON.stringify({ tag: tag, days: days }));
      pastDerive(); draw();
    });
  }
  function pastDays(n) { var today = ymd(new Date()), out = [], i; for (i = 1; i <= n; i++) { var d = shift(today, -i); if (S.past && S.past[d]) out.push([d, S.past[d]]); } return out; }
  function pastDerive() {
    // amounts and time to tick per line
    var hist = {};
    pastDays(PAST_DAYS).forEach(function (e) { e[1].forEach(function (x) {
      if (x.deleted || !x.text) return;
      var h = hist[lkey(x.text)] = hist[lkey(x.text)] || { q: {}, tt: [] };
      if (!x.rolled && x.qty) { var qk = lkey(x.qty).slice(0, 40); h.q[qk] = h.q[qk] || { q: x.qty, n: 0 }; h.q[qk].n++; }
      if (!x.rolled && x.done && x.doneAt && x.addedAt && x.doneAt > x.addedAt) h.tt.push(Math.min(x.doneAt - x.addedAt, 16 * 3600000));
    }); });
    Object.keys(hist).forEach(function (k) { var t = hist[k].tt.sort(function (a, b) { return a - b; }); hist[k].med = t.length >= 2 ? t[Math.floor(t.length / 2)] : 0; });
    S.hist = hist;
    // the usual time of the last tick of the day (minutes after midnight)
    var lasts = [];
    pastDays(PAST_DAYS).forEach(function (e) { var mx = 0; e[1].forEach(function (x) { if (x.done && x.doneAt && !x.deleted) mx = Math.max(mx, x.doneAt); }); if (mx) { var dt = new Date(mx); lasts.push(dt.getHours() * 60 + dt.getMinutes()); } });
    lasts.sort(function (a, b) { return a - b; });
    S.closeMin = lasts.length >= 3 ? lasts[Math.floor(lasts.length / 2)] : 0;
  }
  /* Weekly badges: ticks over the last 7 days, today included (from the live list). */
  function weekRanks() {
    var counts = {}, start = new Date(); start.setHours(0, 0, 0, 0); start = start.getTime() - 6 * 86400000;
    var lists = pastDays(6).map(function (e) { return e[1]; }).concat([S.date === ymd(new Date()) ? S.items : []]);
    lists.forEach(function (l) { l.forEach(function (x) { if (x.done && !x.deleted && x.doneBy && (x.doneAt || 0) >= start) counts[x.doneBy] = (counts[x.doneBy] || 0) + 1; }); });
    var arr = Object.keys(counts).map(function (n) { return { name: n, n: counts[n] }; }).sort(function (a, b) { return b.n - a.n || a.name.localeCompare(b.name); });
    var rank = 0, prev = -1;
    arr.forEach(function (x, k) { if (x.n !== prev) { rank = k + 1; prev = x.n; } x.rank = rank; });
    return arr;
  }
  /* Due today: made on 3 or more of the last 14 days, about every 4 days or more often, and the usual gap has passed. */
  function dueList() {
    var m = {}, today = ymd(new Date()), have = onList();
    pastDays(PAST_DAYS).forEach(function (e) { e[1].forEach(function (x) {
      if (x.deleted || x.rolled || !x.text) return;
      var k = lkey(x.text), o = m[k] = m[k] || { text: x.text, days: {}, sec: {} };
      o.days[e[0]] = 1; if (x.station) o.sec[x.station] = (o.sec[x.station] || 0) + 1;
    }); });
    var hidden = {}; S.learned.forEach(function (x) { if (x.hidden) hidden[x.id] = 1; });
    return Object.keys(m).filter(function (k) { return !have[k] && !hidden[k]; }).map(function (k) {
      var o = m[k], ds = Object.keys(o.days).sort(), gaps = [], i;
      if (ds.length < 3) return null;
      for (i = 1; i < ds.length; i++) gaps.push(Math.round((parseYmd(ds[i]) - parseYmd(ds[i - 1])) / 86400000));
      gaps.sort(function (a, b) { return a - b; });
      var g = gaps[Math.floor(gaps.length / 2)], last = ds[ds.length - 1], since = Math.round((parseYmd(today) - parseYmd(last)) / 86400000);
      if (g > 4 || since < g) return null;
      var sec = Object.keys(o.sec).sort(function (a, b) { return o.sec[b] - o.sec[a]; })[0] || '';
      return { k: k, text: o.text, gap: g, last: last, since: since, sec: sec, over: since - g };
    }).filter(Boolean).sort(function (a, b) { return b.over - a.over || a.gap - b.gap; }).slice(0, 10);
  }
  /* Pace: how much of the list is usually ticked by this time of day, against today. */
  function pace() {
    var now = new Date(), mins = now.getHours() * 60 + now.getMinutes(), dn = now.getDay(), all = [], same = [];
    pastDays(PAST_DAYS).forEach(function (e) {
      var l = e[1].filter(function (x) { return !x.deleted; }); if (l.length < 5) return;
      var by = l.filter(function (x) { if (!x.done || !x.doneAt) return false; var t = new Date(x.doneAt); return t.getHours() * 60 + t.getMinutes() <= mins; }).length;
      var share = by / l.length; all.push(share); if (parseYmd(e[0]).getDay() === dn) same.push(share);
    });
    var src = same.length >= 2 ? same : all;
    if (src.length < 3 && !(same.length >= 2)) return null;
    src.sort(function (a, b) { return a - b; });
    var usual = src[Math.floor(src.length / 2)], live = S.items.filter(function (x) { return !x.deleted; }), done = live.filter(function (x) { return x.done; }).length;
    if (live.length < 3) return null;
    return { usual: usual, today: done / live.length, done: done, n: live.length, sameDay: same.length >= 2 };
  }
  function hhmm(m) { return (m < 600 ? '0' : '') + Math.floor(m / 60) + ':' + (m % 60 < 10 ? '0' : '') + (m % 60); }
  function closeoutHTML(live) {
    var today = ymd(new Date());
    if (S.date !== today || !S.closeMin || !can('add') || lsGet('lk.closeout') === today) return '';
    var now = new Date(), mins = now.getHours() * 60 + now.getMinutes(), open = live.filter(function (x) { return !x.done; }).length;
    if (mins < S.closeMin - 60 || !open) return '';
    return '<div class="nb-flag nb-close"><span class="nb-sl">Closing soon</span><p>The last tick is usually around ' + hhmm(S.closeMin) + '. ' + open + (open === 1 ? ' line is' : ' lines are') + ' still open and will roll to tomorrow. Mark what matters urgent, and log any waste before you go.</p>' +
      '<div class="btn-row"><a class="btn" href="#/waste">Log waste</a><button type="button" class="btn" data-p="close-hide">Hide for today</button></div></div>';
  }
  var MEDAL = { 1: '#C9971C', 2: '#8E959C', 3: '#A8693A' };
  function isSous() { var p = me(); return !!(p && p.role === 'sous'); }
  function ordinal(n) { return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'); }
  function medal(rank) {
    return '<svg class="nb-medal" viewBox="0 0 26 26" width="26" height="26" aria-hidden="true"><circle cx="13" cy="13" r="12" fill="' + (MEDAL[rank] || '#8E959C') + '"/><circle cx="13" cy="13" r="9" fill="none" stroke="#fff" stroke-width="1.5" opacity=".8"/><text x="13" y="17.5" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" font-family="Barlow Condensed, sans-serif">' + rank + '</text></svg>';
  }
  function badgesOn() { return !S.config || S.config.showBadges !== false; }
  function badgeStrip() {
    if (!badgesOn() || !S.week || !S.week.length) return '';
    var top = S.week.filter(function (x) { return x.rank <= 3; }).slice(0, 5);
    return '<div class="nb-badges" aria-label="Top tickers this week"><span class="nb-bl">Top tickers, last 7 days</span>' +
      top.map(function (x) { return '<span class="nb-bd">' + medal(x.rank) + '<span><strong>' + esc(x.name) + '</strong> <span class="nb-bn">' + ordinal(x.rank) + ', ' + x.n + (x.n === 1 ? ' tick' : ' ticks') + '</span></span></span>'; }).join('') + '</div>';
  }
  function myRank() {
    var p = who();
    if (!p || !badgesOn() || !S.week) return '';
    var r = S.week.filter(function (x) { return x.name === p.name; })[0];
    return r ? ' · ' + ordinal(r.rank) + ' for ticks this week' : '';
  }

  /* ---------- insights for the owner: numbers and charts from the last 30 days of lines ---------- */
  function loadStats(force) {
    if (!fb || S.configState !== 'ok') return;
    if (S.stats && (S.stats.loading || !force)) return;
    S.stats = { loading: true, days: {} };
    var today = ymd(new Date()), dates = [], i;
    for (i = 0; i < 60; i++) dates.push(shift(today, -i));
    Promise.all(dates.map(function (d) { return fb.fs.getDocs(itemsCol(d)).then(function (s) { return [d, s.docs.map(function (x) { return x.data(); })]; }, function () { return [d, []]; }); })).then(function (res) {
      var days = {}; res.forEach(function (r) { days[r[0]] = r[1]; });
      S.stats = { loading: false, days: days, at: Date.now() };
      draw();
    });
  }
  /* ---------- admin filters: time range, section, person, weekday (reason on the Waste tab) ---------- */
  function AF() {
    if (!S.af) { try { var a = JSON.parse(lsGet('lk.prep.af') || '{}'); S.af = { sec: a.sec || '', who: a.who || '', dow: a.dow || '', reason: a.reason || '' }; } catch (e) { S.af = { sec: '', who: '', dow: '', reason: '' }; } }
    return S.af;
  }
  function afSave() { lsSet('lk.prep.af', JSON.stringify(AF())); }
  function afDates(n, offset) {
    var today = ymd(new Date()), out = [], i, dw = AF().dow;
    for (i = n - 1 + offset; i >= offset; i--) { var d = shift(today, -i); if (dw === '' || String(parseYmd(d).getDay()) === dw) out.push(d); }
    return out;
  }
  function afItems(d) { var sec = AF().sec; return ((S.stats && S.stats.days[d]) || []).filter(function (x) { return !x.deleted && (!sec || (x.station || 'General') === sec); }); }
  function personName(id) { var p = ((S.config && S.config.people) || []).filter(function (x) { return x.id === id; })[0]; return p ? p.name : ''; }
  function afSections() {
    var m = {};
    if (S.stats && S.stats.days) Object.keys(S.stats.days).forEach(function (d) { S.stats.days[d].forEach(function (x) { if (!x.deleted) m[x.station || 'General'] = 1; }); });
    if (S.wStats && S.wStats.lines) S.wStats.lines.forEach(function (x) { if (!x.deleted) m[x.station || 'General'] = 1; });
    return Object.keys(m).sort();
  }
  function filtersHTML(kind) {
    var a = AF(), n = S.statsRange;
    function sel(k, label, val, opts) { return '<label class="a-f"><span>' + label + '</span><select data-k="' + k + '">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === val ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>'; }
    var out = '<div class="a-filters" role="group" aria-label="Filters"><div class="a-range">' + [7, 14, 30].map(function (k) { return '<button type="button" class="chip" data-p="range" data-v="' + k + '" aria-pressed="' + (n === k) + '">' + k + ' days</button>'; }).join('') +
      '<button type="button" class="chip" data-p="' + (kind === 'waste' ? 'w-refresh' : 'stats-refresh') + '">Refresh</button></div>';
    if (kind !== 'team') {
      out += sel('af-sec', 'Section', a.sec, [['', 'All sections']].concat(afSections().map(function (x) { return [x, x]; })));
      if (kind === 'insights') out += sel('af-who', 'Person', a.who, [['', 'Everyone']].concat(((S.config && S.config.people) || []).map(function (p) { return [p.id, p.name]; })));
      if (kind === 'waste') out += sel('af-reason', 'Reason', a.reason, [['', 'All reasons']].concat(REASONS.map(function (r) { return [r[0], r[1]]; })));
      out += sel('af-dow', 'Weekday', a.dow, [['', 'Every day']].concat(DOW.map(function (d, i) { return [String(d), DOWN[i]]; })));
      if (a.sec || a.dow || (kind === 'insights' && a.who) || (kind === 'waste' && a.reason)) out += '<button type="button" class="chip a-reset" data-p="af-reset">Clear filters</button>';
    }
    return out + '</div>';
  }
  function filterNote(kind) {
    var a = AF(), bits = [];
    if (a.sec) bits.push(a.sec);
    if (kind === 'insights' && a.who) bits.push(personName(a.who) || 'one person');
    if (kind === 'waste' && a.reason) bits.push(reasonName(a.reason));
    if (a.dow !== '') bits.push(DOWN[DOW.indexOf(+a.dow)] + 's only');
    return bits.length ? '<p class="a-fnote">Showing: ' + esc(bits.join(', ')) + '.</p>' : '';
  }
  function aggregate(n, offset) {
    var a = AF(), who = a.who, whoName = who ? personName(who) : '', dates = afDates(n, offset || 0), h;
    var agg = { dates: dates, perDay: {}, people: {}, sections: {}, wHour: [], tHour: [], times: [], written: 0, ticked: 0, rolled: 0, lines: 0, rollKeys: {}, fixes: [] };
    for (h = 0; h < 24; h++) { agg.wHour.push(0); agg.tHour.push(0); }
    dates.forEach(function (d) {
      var pd = agg.perDay[d] = { w: 0, t: 0, r: 0, n: 0 };
      afItems(d).forEach(function (x) {
        var mine = !who || (x.rolled ? x.origBy === whoName : x.addedById === who);
        if (x.rolled) {
          if (mine) {
            pd.r++; agg.rolled++;
            var k = String(x.text || '').trim().toLowerCase(), rk = agg.rollKeys[k] = agg.rollKeys[k] || { text: String(x.text || '').trim(), n: 0, max: 0 };
            rk.n++; if (x.rolled > rk.max) rk.max = x.rolled;
          }
        } else if (mine) {
          pd.w++; agg.written++;
          var nm = x.addedBy || 'Unknown', pp = agg.people[nm] = agg.people[nm] || { w: 0, t: 0 };
          pp.w++;
          if (x.station) agg.sections[x.station] = (agg.sections[x.station] || 0) + 1;
          if (x.addedAt) agg.wHour[new Date(x.addedAt).getHours()]++;
          if (x.orig && x.orig !== x.text) agg.fixes.push({ d: d, from: x.orig, to: x.text, by: x.addedBy || '' });
        }
        if (!who) pd.n++;
        if (x.done && (!who || x.doneById === who)) {
          pd.t++; agg.ticked++;
          var tn = x.doneBy || 'Unknown', tp = agg.people[tn] = agg.people[tn] || { w: 0, t: 0 };
          tp.t++;
          if (x.doneAt) { agg.tHour[new Date(x.doneAt).getHours()]++; if (!x.rolled && x.addedAt && x.doneAt > x.addedAt) agg.times.push(x.doneAt - x.addedAt); }
        }
      });
      agg.lines += pd.n;
    });
    agg.times.sort(function (a, b) { return a - b; });
    return agg;
  }
  function dur(ms) {
    if (!ms) return 'n/a';
    var m = Math.round(ms / 60000);
    if (m < 60) return m + ' min';
    var h = Math.floor(m / 60), r = m % 60;
    return h + ' h' + (r ? ' ' + r + ' min' : '');
  }
  var CW = '#2a78d6', CT = '#eb6834';
  function niceMax(v) { if (v <= 4) return 4; var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
  function barPath(x, y, w, h, r, horiz) {
    // 4px rounded data-end, square at the baseline
    r = Math.max(0, Math.min(r, horiz ? Math.min(w, h / 2) : Math.min(h, w / 2)));
    if (horiz) return 'M' + x + ' ' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + 'V' + (y + h - r) + 'Q' + (x + w) + ' ' + (y + h) + ' ' + (x + w - r) + ' ' + (y + h) + 'H' + x + 'Z';
    return 'M' + x + ' ' + (y + h) + 'V' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + 'V' + (y + h) + 'Z';
  }
  function legend(items) { return '<div class="a-legend">' + items.map(function (i) { return '<span><i style="background:' + i[1] + '"></i>' + esc(i[0]) + '</span>'; }).join('') + '</div>'; }
  function yGrid(W, l, r, t, ph, max, fmt) {
    var out = '';
    for (var g = 0; g <= 4; g++) {
      var y = t + ph - ph * g / 4, v = max * g / 4;
      out += '<line class="ch-grid" x1="' + l + '" x2="' + (W - r) + '" y1="' + y + '" y2="' + y + '"/><text class="ch-ax" x="' + (l - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + (fmt ? fmt(v) : (Math.round(v * 10) / 10)) + '</text>';
    }
    return out;
  }
  function dailyChart(agg) {
    var W = 720, H = 250, l = 34, r = 8, t = 12, b = 30, ph = H - t - b, pw = W - l - r, n = agg.dates.length, band = pw / n, bw = Math.min(12, band * 0.34), max = 0;
    agg.dates.forEach(function (d) { max = Math.max(max, agg.perDay[d].w, agg.perDay[d].t); });
    max = niceMax(max);
    var out = '<svg class="ch" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Lines written and ticked each day">' + yGrid(W, l, r, t, ph, max, function (v) { return Math.round(v); });
    agg.dates.forEach(function (d, i) {
      var pd = agg.perDay[d], cx = l + band * i + band / 2, hw = pd.w / max * ph, ht = pd.t / max * ph;
      var dn = parseYmd(d).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
      out += '<g><title>' + esc(dn + ': ' + pd.w + ' written, ' + pd.t + ' ticked') + '</title><rect x="' + (cx - band / 2) + '" y="' + t + '" width="' + band + '" height="' + ph + '" fill="transparent"/>' +
        (pd.w ? '<path d="' + barPath(cx - bw - 1, t + ph - hw, bw, hw, 4) + '" fill="' + CW + '"/>' : '') +
        (pd.t ? '<path d="' + barPath(cx + 1, t + ph - ht, bw, ht, 4) + '" fill="' + CT + '"/>' : '') + '</g>';
      if (n <= 14 || i % 3 === 0 || i === n - 1) out += '<text class="ch-ax" x="' + cx + '" y="' + (H - 10) + '" text-anchor="middle">' + parseYmd(d).getDate() + '</text>';
    });
    return out + '</svg>';
  }
  function peopleChart(agg) {
    var rows = Object.keys(agg.people).map(function (n) { return { n: n, w: agg.people[n].w, t: agg.people[n].t }; }).filter(function (x) { return x.w || x.t; })
      .sort(function (a, b) { return (b.t - a.t) || (b.w - a.w); }).slice(0, 12);
    if (!rows.length) return '<p class="hint">Nothing written in this time yet.</p>';
    var W = 720, l = 112, r = 44, rh = 34, H = rows.length * rh + 8, pw = W - l - r, max = niceMax(Math.max.apply(null, rows.map(function (x) { return Math.max(x.w, x.t); })));
    var out = '<svg class="ch" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Lines written and ticked by each person">';
    rows.forEach(function (x, i) {
      var y = 4 + i * rh, ww = Math.max(x.w ? 4 : 0, x.w / max * pw), tw = Math.max(x.t ? 4 : 0, x.t / max * pw);
      out += '<g><title>' + esc(x.n + ': ' + x.w + ' written, ' + x.t + ' ticked') + '</title><rect x="0" y="' + y + '" width="' + W + '" height="' + rh + '" fill="transparent"/>' +
        '<text class="ch-lb" x="' + (l - 10) + '" y="' + (y + 21) + '" text-anchor="end">' + esc(x.n) + '</text>' +
        (x.w ? '<path d="' + barPath(l, y + 3, ww, 12, 4, true) + '" fill="' + CW + '"/>' : '') + '<text class="ch-val" x="' + (l + ww + 6) + '" y="' + (y + 13) + '">' + x.w + '</text>' +
        (x.t ? '<path d="' + barPath(l, y + 17, tw, 12, 4, true) + '" fill="' + CT + '"/>' : '') + '<text class="ch-val" x="' + (l + tw + 6) + '" y="' + (y + 27) + '">' + x.t + '</text></g>';
    });
    return out + '</svg>';
  }
  function hoursChart(agg) {
    var lo = 24, hi = -1, h;
    for (h = 0; h < 24; h++) if (agg.wHour[h] || agg.tHour[h]) { lo = Math.min(lo, h); hi = Math.max(hi, h); }
    if (hi < 0) return '<p class="hint">Nothing written in this time yet.</p>';
    lo = Math.max(0, Math.min(lo, hi - 5)); hi = Math.min(23, Math.max(hi, lo + 5));
    var W = 720, H = 230, l = 34, r = 14, t = 14, b = 28, ph = H - t - b, pw = W - l - r, n = hi - lo + 1, max = 0;
    for (h = lo; h <= hi; h++) max = Math.max(max, agg.wHour[h], agg.tHour[h]);
    max = niceMax(max);
    function pt(arr) { var out = []; for (var k = lo; k <= hi; k++) out.push([l + pw * (k - lo) / (n - 1), t + ph - arr[k] / max * ph]); return out; }
    var out = '<svg class="ch" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Lines written and ticked by hour of the day">' + yGrid(W, l, r, t, ph, max, function (v) { return Math.round(v); });
    for (h = lo; h <= hi; h++) out += '<text class="ch-ax" x="' + (l + pw * (h - lo) / (n - 1)) + '" y="' + (H - 8) + '" text-anchor="middle">' + (h < 10 ? '0' : '') + h + '</text>';
    [[agg.wHour, CW, 'written'], [agg.tHour, CT, 'ticked']].forEach(function (s) {
      var p = pt(s[0]);
      out += '<polyline points="' + p.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + '" fill="none" stroke="' + s[1] + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
      p.forEach(function (q, k) { out += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="4" fill="' + s[1] + '" stroke="#fff" stroke-width="2"><title>' + esc((lo + k < 10 ? '0' : '') + (lo + k) + ':00, ' + s[0][lo + k] + ' ' + s[2]) + '</title></circle>'; });
    });
    return out + '</svg>';
  }
  function sectionsChart(agg, label) {
    var rows = Object.keys(agg.sections).map(function (n) { return { n: n, v: agg.sections[n] }; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 10);
    if (!rows.length) return '<p class="hint">No sections used in this time yet.</p>';
    var W = 720, l = 150, r = 44, rh = 28, H = rows.length * rh + 8, pw = W - l - r, max = niceMax(rows[0].v), out = '<svg class="ch" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label || 'Lines per section') + '">';
    rows.forEach(function (x, i) {
      var y = 4 + i * rh, w = Math.max(4, x.v / max * pw);
      out += '<g><title>' + esc(x.n + ': ' + x.v + ' lines') + '</title><rect x="0" y="' + y + '" width="' + W + '" height="' + rh + '" fill="transparent"/><text class="ch-lb" x="' + (l - 10) + '" y="' + (y + 18) + '" text-anchor="end">' + esc(x.n.length > 20 ? x.n.slice(0, 19) + '…' : x.n) + '</text><path d="' + barPath(l, y + 5, w, 14, 4, true) + '" fill="' + CW + '"/><text class="ch-val" x="' + (l + w + 6) + '" y="' + (y + 17) + '">' + x.v + '</text></g>';
    });
    return out + '</svg>';
  }
  function fixesHTML(agg) {
    if (!agg.fixes.length) return '<h3 class="a-ch-h">Proofreader</h3><p class="hint">No lines needed correcting in this time.</p>';
    var rows = agg.fixes.slice(-15).reverse().map(function (f) { return '<tr><th scope="row">' + esc(f.from) + '</th><td>' + esc(f.to) + '</td><td>' + esc(f.by) + '</td><td>' + esc(parseYmd(f.d).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })) + '</td></tr>'; }).join('');
    return '<h3 class="a-ch-h">Proofreader</h3><span class="hint">The latest corrections. Anyone can tap Undo straight after, and that word is then left alone on their device.</span><div class="a-scroll"><table class="a-table"><thead><tr><th scope="col">Typed</th><th scope="col">Saved as</th><th scope="col">By</th><th scope="col">Day</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function rollChart(agg) {
    var rows = Object.keys(agg.rollKeys).map(function (k) { return agg.rollKeys[k]; }).sort(function (a, b) { return b.n - a.n || b.max - a.max; }).slice(0, 10);
    if (!rows.length) return '<p class="hint">Nothing has rolled over in this time. That is a good sign.</p>';
    var W = 720, l = 190, r = 44, rh = 28, H = rows.length * rh + 8, pw = W - l - r, max = niceMax(rows[0].n), out = '<svg class="ch" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Lines that rolled over most often">';
    rows.forEach(function (x, i) {
      var y = 4 + i * rh, w = Math.max(4, x.n / max * pw);
      out += '<g><title>' + esc(x.text + ': rolled over ' + x.n + (x.n === 1 ? ' time' : ' times') + ', longest run ' + x.max + (x.max === 1 ? ' day' : ' days')) + '</title><rect x="0" y="' + y + '" width="' + W + '" height="' + rh + '" fill="transparent"/><text class="ch-lb" x="' + (l - 10) + '" y="' + (y + 18) + '" text-anchor="end">' + esc(x.text.length > 26 ? x.text.slice(0, 25) + '…' : x.text) + '</text><path d="' + barPath(l, y + 5, w, 14, 4, true) + '" fill="' + CT + '"/><text class="ch-val" x="' + (l + w + 6) + '" y="' + (y + 17) + '">' + x.n + '</text></g>';
    });
    return out + '</svg>';
  }
  var DOWS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];
  function learnedHTML() {
    var L = S.learned.filter(function (x) { return x.text; });
    var head = '<section class="set-block"><span class="label">What the prep list has learned</span><span class="hint">Every line written or picked is counted per item, weekday and section. An item becomes a regular after ' + REGULAR + ' uses.</span>';
    var ls = S.learnState, btn = '<p class="hint">' + (ls && ls.running ? 'Reading past lists: ' + ls.done + ' of ' + ls.total + ' days so far.' : 'It reads past lists by itself, up to ' + LEARN_DAYS + ' days back' + (ls ? ' (' + ls.done + ' days read)' : '') + ', and keeps learning from every new line.') + '</p>';
    if (!L.length) return head + '<p class="hint">Nothing learned yet. It reads past lists by itself the next time the prep book is opened, and learns from every new line.</p>' + btn + '</section>';
    var regs = L.filter(isRegular), picked = 0, typed = 0;
    L.forEach(function (x) { picked += x.picked || 0; typed += x.typed || 0; });
    var top = L.slice().sort(function (a, b) { return (b.uses || 0) - (a.uses || 0); });
    var tiles = [[L.length, 'items learned'], [regs.length, 'regulars'], [picked + typed ? Math.round(picked / (picked + typed) * 100) + '%' : 'n/a', 'added by tapping a suggestion'], [top[0].text, 'most written item']];
    var sec = {}; top.slice(0, 10).forEach(function (x) { sec[x.text] = x.uses || 0; });
    var heat = top.slice(0, 12).map(function (x) {
      var mx = Math.max.apply(null, DOWS.map(function (d) { return (x.dow || {})[d[0]] || 0; })) || 1;
      return '<tr><th scope="row">' + esc(x.text) + (x.hidden ? ' <span class="a-badge off">hidden</span>' : '') + '</th>' + DOWS.map(function (d) { var n = (x.dow || {})[d[0]] || 0; return '<td class="a-heat" style="background:rgba(235,104,52,' + (n ? (0.15 + 0.7 * n / mx).toFixed(2) : 0) + ')">' + (n || '') + '</td>'; }).join('') + '</tr>';
    }).join('');
    var manage = top.slice(0, 40).map(function (x) {
      return '<tr><th scope="row">' + esc(x.text) + (x.hidden ? ' <span class="a-badge off">hidden</span>' : '') + (isRegular(x) ? ' <span class="a-badge">regular</span>' : '') + '</th><td>' + (x.uses || 0) + '</td><td>' + (x.typed || 0) + '/' + (x.picked || 0) + '</td><td>' + esc(bestSection(x)) + '</td><td>' + esc(ago(x.lastUsed)) + '</td>' +
        '<td><button type="button" class="p-x" data-p="learn-hide" data-id="' + esc(x.id) + '" data-hide="' + (x.hidden ? '0' : '1') + '">' + (x.hidden ? 'Show in suggestions' : 'Hide from suggestions') + '</button></td></tr>';
    }).join('');
    return head + btn + '<div class="a-tiles">' + tiles.map(function (x) { return '<div class="a-tile"><strong>' + esc(String(x[0])) + '</strong><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div>' +
      '<h3 class="a-ch-h">Most written items</h3>' + sectionsChart({ sections: sec }, 'Most written prep items') +
      '<h3 class="a-ch-h">Which days each item is written</h3><span class="hint">Number of times written on each weekday. Darker is more.</span>' +
      '<div class="a-scroll"><table class="a-table"><thead><tr><th scope="col">Item</th>' + DOWS.map(function (d) { return '<th scope="col">' + d[1] + '</th>'; }).join('') + '</tr></thead><tbody>' + heat + '</tbody></table></div>' +
      '<h3 class="a-ch-h">Manage learned items</h3><span class="hint">Hide a typo or a one-off so it stops showing as a suggestion. Typed and picked counts show as typed/picked.</span>' +
      '<div class="a-scroll"><table class="a-table"><thead><tr><th scope="col">Item</th><th scope="col">Uses</th><th scope="col">Typed/picked</th><th scope="col">Usual section</th><th scope="col">Last used</th><th scope="col"></th></tr></thead><tbody>' + manage + '</tbody></table></div>' + '</section>';
  }
  var DOW = [1, 2, 3, 4, 5, 6, 0], DOWN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var HB = { w: ['#FFFFFF', '#E3EEFA', '#C4DAF4', '#97BEEC', '#6CA2E4'], r: SK };
  function heatHTML(n) {
    var occ = {}, cell = {}, tot = {}, secT = {}, mode = S.heat === 'r' ? 'r' : 'w', who = AF().who;
    afDates(n, 0).forEach(function (d) { var dw = parseYmd(d).getDay(); occ[dw] = (occ[dw] || 0) + 1;
      afItems(d).forEach(function (x) {
        if (mode === 'w' ? x.rolled : !x.rolled) return;
        if (who && mode === 'w' && x.addedById !== who) return;
        var k = x.station || 'General', c = cell[k] = cell[k] || {};
        c[dw] = (c[dw] || 0) + 1; tot[dw] = (tot[dw] || 0) + 1; secT[k] = (secT[k] || 0) + 1;
      });
    });
    var secs = Object.keys(secT).sort(function (a, b) { return secT[b] - secT[a]; }).slice(0, 8), max = 0;
    function avg(v, dw) { return occ[dw] ? v / occ[dw] : 0; }
    secs.forEach(function (k) { DOW.forEach(function (dw) { max = Math.max(max, avg((cell[k] || {})[dw] || 0, dw)); }); });
    function td(v, dw, label) {
      var a = avg(v || 0, dw), lv = !a ? 0 : Math.min(4, 1 + Math.floor(a / (max || 1) * 3.999));
      return '<td class="sk-c" style="background:' + HB[mode][lv] + '" title="' + esc(label + ', ' + DOWN[DOW.indexOf(dw)] + ': ' + (Math.round(a * 10) / 10) + ' a day') + '">' + (a ? Math.round(a * 10) / 10 : '<span class="sk-0">0</span>') + '</td>';
    }
    var chips = '<div class="chips"><button type="button" class="chip" data-p="heat" data-v="w" aria-pressed="' + (mode === 'w') + '">Lines written</button><button type="button" class="chip" data-p="heat" data-v="r" aria-pressed="' + (mode === 'r') + '">Rolled over</button></div>';
    if (!secs.length) return chips + '<p class="hint">Nothing to show in this time.</p>';
    var busiest = DOW.slice().sort(function (a, b) { return avg(tot[b] || 0, b) - avg(tot[a] || 0, a); })[0];
    return chips + '<div class="a-tablewrap"><table class="a-table a-plain sk-t"><thead><tr><th scope="col">Section</th>' + DOWN.map(function (x) { return '<th scope="col">' + x + '</th>'; }).join('') + '</tr></thead><tbody>' +
      secs.map(function (k) { return '<tr><th scope="row">' + esc(k) + '</th>' + DOW.map(function (dw) { return td((cell[k] || {})[dw], dw, k); }).join('') + '</tr>'; }).join('') +
      '<tr class="sk-tot"><th scope="row">All sections</th>' + DOW.map(function (dw) { var a = avg(tot[dw] || 0, dw); return '<td>' + (Math.round(a * 10) / 10) + '</td>'; }).join('') + '</tr></tbody></table></div>' +
      '<p class="hint">Average ' + (mode === 'w' ? 'lines written' : 'lines rolled over') + ' per day, by weekday. ' + (tot[busiest] ? 'Heaviest day: ' + DOWN[DOW.indexOf(busiest)] + '.' : '') + (n < 14 ? ' Pick 14 or 30 days for steadier averages.' : '') + '</p>';
  }
  function stickyHTML(n) {
    var m = {}, all = [];
    afDates(n, 0).forEach(function (d) { all = all.concat(((S.stats && S.stats.days[d]) || []).filter(function (x) { var sec = AF().sec; return !sec || (x.station || 'General') === sec; })); });
    all.forEach(function (x) {
      var k = okey(x.text); if (!k) return;
      var e = m[k] = m[k] || { text: String(x.text).trim(), w: 0, tt: [], r: 0, del: 0 };
      if (x.rolled) { if (!x.deleted) e.r++; return; }
      if (x.deleted) { e.del++; return; }
      e.w++;
      if (x.done && x.doneAt && x.addedAt && x.doneAt > x.addedAt) e.tt.push(x.doneAt - x.addedAt);
    });
    var rows = Object.keys(m).map(function (k) {
      var e = m[k], t = e.tt.sort(function (a, b) { return a - b; }), med = t.length >= 2 ? t[Math.floor(t.length / 2)] : 0, tips = [], score = 0;
      if (e.r >= 3) { tips.push('Rolls over a lot: start it earlier or split it into smaller jobs.'); score += e.r * 2; }
      if (med >= 4 * 3600000) { tips.push('Slow to finish: start it earlier in the day.'); score += 3; }
      if (e.del >= 2 && e.del / (e.w + e.del) >= 0.3) { tips.push('Often removed: check it is still needed.'); score += e.del; }
      return { e: e, med: med, tips: tips, score: score };
    }).filter(function (x) { return x.tips.length; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 10);
    if (!rows.length) return '<p class="hint">Nothing slow or sticky in this time.</p>';
    return '<div class="a-tablewrap"><table class="a-table a-plain"><thead><tr><th scope="col">Line</th><th scope="col">Written</th><th scope="col">Typical time to tick</th><th scope="col">Rolled over</th><th scope="col">Removed</th><th scope="col">Suggestion</th></tr></thead><tbody>' +
      rows.map(function (x) { return '<tr><th scope="row">' + esc(x.e.text) + '</th><td>' + x.e.w + '</td><td>' + (x.med ? dur(x.med) : 'n/a') + '</td><td>' + x.e.r + '</td><td>' + x.e.del + '</td><td>' + x.tips.map(function (t) { return '<span class="a-flag">' + esc(t) + '</span>'; }).join(' ') + '</td></tr>'; }).join('') +
      '</tbody></table></div>';
  }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
  function delta(cur, prev, n, lowIsGood, unit) {
    if (prev == null || !isFinite(prev)) return '';
    if (unit === 'pts') { var dp = Math.round(cur - prev); return '<em class="a-d">' + (dp === 0 ? 'same as' : (dp > 0 ? 'up ' : 'down ') + Math.abs(dp) + ' points on') + ' the ' + n + ' days before</em>'; }
    if (!prev) return cur ? '<em class="a-d">none in the ' + n + ' days before</em>' : '';
    var d = Math.round((cur - prev) / prev * 100);
    return '<em class="a-d' + (d && (d > 0) === !!lowIsGood ? ' is-worse' : '') + '">' + (d === 0 ? 'same as' : (d > 0 ? 'up ' : 'down ') + Math.abs(d) + '% on') + ' the ' + n + ' days before</em>';
  }
  function tileHTML(x) { return '<div class="a-tile"><strong>' + esc(String(x[0])) + '</strong><span>' + esc(x[1]) + '</span>' + (x[2] || '') + '</div>'; }
  function card(inner, cls) { return '<div class="a-card' + (cls ? ' ' + cls : '') + '">' + inner + '</div>'; }
  /* Every day at a glance: a calendar, darker means more. Tap a day to open it in the prep book. */
  function calHTML(n) {
    var a = AF(), m = S.calM || 'done', today = ymd(new Date()), agg = aggregate(n, 0), first = shift(today, -(n - 1)), start = first, i;
    while (parseYmd(start).getDay() !== 1) start = shift(start, -1);
    var vals = {}, max = 0;
    agg.dates.forEach(function (d) { var pd = agg.perDay[d], v = m === 'done' ? (pd.n ? pd.t / pd.n : null) : m === 'w' ? pd.w : pd.r; vals[d] = v; if (v != null && m !== 'done') max = Math.max(max, v); });
    var ramp = m === 'w' ? HB.w : SK;
    function lv(v) { if (v == null || v === 0) return 0; if (m === 'done') return v >= 0.9 ? 4 : v >= 0.7 ? 3 : v >= 0.4 ? 2 : 1; return Math.min(4, 1 + Math.floor(v / (max || 1) * 3.999)); }
    var rows = '', d = start;
    while (d <= today) {
      rows += '<tr>';
      for (i = 0; i < 7; i++) {
        if (d < first || d > today) rows += '<td class="cal-off"></td>';
        else if (!(d in vals)) rows += '<td class="cal-x" title="' + esc(dayShort(d) + ': filtered out') + '"><span class="cal-n">' + parseYmd(d).getDate() + '</span></td>';
        else {
          var v = vals[d], txt = v == null ? '' : m === 'done' ? Math.round(v * 100) + '%' : String(v), pd = agg.perDay[d];
          rows += '<td class="cal-c" style="background:' + ramp[lv(v)] + '"><button type="button" data-p="cal-day" data-d="' + d + '" title="' + esc(dayShort(d) + ': ' + pd.w + ' written, ' + pd.t + ' ticked' + (pd.r ? ', ' + pd.r + ' rolled over' : '') + '. Tap to open this day.') + '"><span class="cal-n">' + parseYmd(d).getDate() + '</span><span class="cal-v">' + esc(txt) + '</span></button></td>';
        }
        d = shift(d, 1);
      }
      rows += '</tr>';
    }
    var chips = '<div class="chips">' + [['done', 'Share ticked'], ['w', 'Lines written'], ['r', 'Rolled over']].map(function (c) { return '<button type="button" class="chip" data-p="calm" data-v="' + c[0] + '" aria-pressed="' + (m === c[0]) + '"' + (c[0] === 'done' && a.who ? ' disabled' : '') + '>' + c[1] + '</button>'; }).join('') + '</div>';
    var key = '<div class="a-legend sk-key"><span>' + (m === 'done' ? 'Ticked:' : 'Fewer to more:') + '</span>' + (m === 'done' ? [['under 40%', 1], ['40 to 69%', 2], ['70 to 89%', 3], ['90% or more', 4]] : [['few', 1], ['', 2], ['', 3], ['most', 4]]).map(function (k) { return '<span><i style="background:' + ramp[k[1]] + '"></i>' + k[0] + '</span>'; }).join('') + '</div>';
    return '<h3 class="a-ch-h">Every day at a glance</h3><span class="hint">Tap a day to open it in the prep book.</span>' + chips + key +
      '<div class="a-tablewrap cal-wrap"><table class="a-table a-plain cal"><thead><tr>' + DOWN.map(function (x) { return '<th scope="col">' + x + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  /* When the work happens: weekday by hour, average per day. The busiest hour is outlined. */
  function hourHTML(n) {
    var m = S.hrM === 'w' ? 'w' : 't', who = AF().who, occ = {}, cnt = {}, lo = 24, hi = -1, max = 0, peak = null;
    afDates(n, 0).forEach(function (d) {
      var dw = parseYmd(d).getDay(); occ[dw] = (occ[dw] || 0) + 1;
      afItems(d).forEach(function (x) {
        var t = m === 't' ? (x.done && (!who || x.doneById === who) ? x.doneAt : 0) : (!x.rolled && (!who || x.addedById === who) ? x.addedAt : 0);
        if (!t) return;
        var dt = new Date(t), h = dt.getHours(), k = dw + ':' + h;
        cnt[k] = (cnt[k] || 0) + 1; lo = Math.min(lo, h); hi = Math.max(hi, h);
      });
    });
    var chips = '<div class="chips"><button type="button" class="chip" data-p="hrm" data-v="t" aria-pressed="' + (m === 't') + '">Ticked</button><button type="button" class="chip" data-p="hrm" data-v="w" aria-pressed="' + (m === 'w') + '">Written</button></div>';
    var head = '<h3 class="a-ch-h">When the work happens</h3><span class="hint">Average lines ' + (m === 't' ? 'ticked' : 'written') + ' per day, by weekday and hour. The busiest slot is outlined.</span>' + chips;
    if (hi < 0) return head + '<p class="hint">Nothing in this time yet.</p>';
    var hrs = [], h, rows = DOW.filter(function (d) { return occ[d]; });
    for (h = lo; h <= hi; h++) hrs.push(h);
    rows.forEach(function (d) { hrs.forEach(function (h) { var v = (cnt[d + ':' + h] || 0) / occ[d]; if (v > max) { max = v; peak = d + ':' + h; } }); });
    var ramp = m === 't' ? SK : HB.w;
    var body = rows.map(function (d) {
      return '<tr><th scope="row">' + DOWN[DOW.indexOf(d)] + '</th>' + hrs.map(function (h) {
        var v = (cnt[d + ':' + h] || 0) / occ[d], lv = !v ? 0 : Math.min(4, 1 + Math.floor(v / (max || 1) * 3.999));
        return '<td class="hr-c' + (peak === d + ':' + h ? ' is-peak' : '') + '" style="background:' + ramp[lv] + '" title="' + esc(DOWN[DOW.indexOf(d)] + ' ' + (h < 10 ? '0' : '') + h + ':00: ' + (Math.round(v * 10) / 10) + ' a day') + '">' + (v ? Math.round(v * 10) / 10 : '') + '</td>';
      }).join('') + '</tr>';
    }).join('');
    var pk = peak ? peak.split(':') : null;
    return head + '<div class="a-tablewrap"><table class="a-table a-plain hr"><thead><tr><th scope="col"></th>' + hrs.map(function (h) { return '<th scope="col">' + (h < 10 ? '0' : '') + h + '</th>'; }).join('') + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      (pk ? '<p class="hint">Busiest: ' + DOWN[DOW.indexOf(+pk[0])] + ' ' + (+pk[1] < 10 ? '0' : '') + pk[1] + ':00 to ' + (+pk[1] + 1 < 10 ? '0' : '') + (+pk[1] + 1) + ':00, about ' + (Math.round(max * 10) / 10) + ' lines ' + (m === 't' ? 'ticked' : 'written') + '.</p>' : '');
  }
  /* A few plain sentences worked out from the same numbers. */
  function smartHTML(agg, prev, n) {
    var out = [], a = AF();
    var byDow = {}, occ = {};
    agg.dates.forEach(function (d) { var dw = parseYmd(d).getDay(); occ[dw] = (occ[dw] || 0) + 1; byDow[dw] = (byDow[dw] || 0) + agg.perDay[d].w + agg.perDay[d].r; });
    var hd = Object.keys(byDow).sort(function (x, y) { return byDow[y] / occ[y] - byDow[x] / occ[x]; })[0];
    if (hd != null && a.dow === '' && byDow[hd]) out.push(DOWN[DOW.indexOf(+hd)] + ' is the heaviest day: about ' + Math.round(byDow[hd] / occ[hd]) + ' lines on the list.');
    var bh = -1, bm = 0, h; for (h = 0; h < 24; h++) if (agg.tHour[h] > bm) { bm = agg.tHour[h]; bh = h; }
    if (bh >= 0) out.push('Most lines get ticked between ' + (bh < 10 ? '0' : '') + bh + ':00 and ' + (bh + 1 < 10 ? '0' : '') + (bh + 1) + ':00.');
    if (!a.sec) {
      var sr = {};
      agg.dates.forEach(function (d) { afItems(d).forEach(function (x) { var k = x.station || 'General', e = sr[k] = sr[k] || { n: 0, r: 0 }; e.n++; if (x.rolled) e.r++; }); });
      var worst = Object.keys(sr).filter(function (k) { return sr[k].n >= 8; }).sort(function (x, y) { return sr[y].r / sr[y].n - sr[x].r / sr[x].n; })[0];
      if (worst && sr[worst].r) out.push(worst + ' rolls over most: ' + pct(sr[worst].r, sr[worst].n) + '% of its lines were carried from an earlier day.');
    }
    if (!a.who && prev && prev.lines && agg.lines) {
      var c = pct(agg.ticked, agg.lines), p = pct(prev.ticked, prev.lines);
      if (Math.abs(c - p) >= 5) out.push('The share of lines ticked off is ' + (c > p ? 'up' : 'down') + ' from ' + p + '% to ' + c + '% compared with the ' + n + ' days before.');
    }
    var slow = {};
    agg.dates.forEach(function (d) { afItems(d).forEach(function (x) { if (!x.rolled && x.done && x.doneAt && x.addedAt && x.doneAt > x.addedAt) { var k = okey(x.text); (slow[k] = slow[k] || { t: x.text, v: [] }).v.push(x.doneAt - x.addedAt); } }); });
    var sl = Object.keys(slow).filter(function (k) { return slow[k].v.length >= 3; }).map(function (k) { var v = slow[k].v.sort(function (x, y) { return x - y; }); return { t: slow[k].t, m: v[Math.floor(v.length / 2)] }; }).sort(function (x, y) { return y.m - x.m; })[0];
    if (sl && sl.m >= 3600000) out.push(sl.t + ' takes longest to get ticked: usually ' + dur(sl.m) + ' after it is written.');
    if (S.wStats && !S.wStats.loading) {
      var from = shift(ymd(new Date()), -(n - 1)), wm = {};
      S.wStats.lines.forEach(function (x) { if (!x.deleted && x.date >= from && (!a.sec || (x.station || 'General') === a.sec)) { var k = okey(x.text); (wm[k] = wm[k] || { t: x.text, n: 0 }).n++; } });
      var tw = Object.keys(wm).sort(function (x, y) { return wm[y].n - wm[x].n; })[0];
      if (tw && wm[tw].n >= 2) out.push(wm[tw].t + ' is the most wasted item: logged ' + wm[tw].n + ' times.');
    }
    return out.length ? card('<h3 class="a-ch-h">What stands out</h3><ul class="a-list a-smart">' + out.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>', 'full') : '';
  }
  function insightsHTML() {
    var st = S.stats, n = S.statsRange, a = AF();
    var head = '<section class="set-block a-ins"><span class="label">Insights</span><span class="hint">Worked out from the lines themselves. Compared with the same number of days before.</span>' + filtersHTML('insights') + filterNote('insights');
    if (!st || st.loading) return head + '<p class="hint">Loading the last 60 days...</p></section>';
    loadWStats(false);
    var agg = aggregate(n, 0), prev = aggregate(n, n);
    var med = agg.times.length ? agg.times[Math.floor(agg.times.length / 2)] : 0, pmed = prev.times.length ? prev.times[Math.floor(prev.times.length / 2)] : 0;
    var tiles = [
      [agg.written, 'lines written', delta(agg.written, prev.written, n)],
      [agg.ticked, 'lines ticked off', delta(agg.ticked, prev.ticked, n)],
      [a.who ? 'n/a' : pct(agg.ticked, agg.lines) + '%', 'of the list ticked off', a.who ? '' : delta(pct(agg.ticked, agg.lines), pct(prev.ticked, prev.lines), n, false, 'pts')],
      [agg.rolled, 'lines rolled over', delta(agg.rolled, prev.rolled, n, true)],
      [dur(med), 'typical time to tick', med && pmed ? delta(med, pmed, n, true) : ''],
      [agg.fixes.length, 'lines corrected by the proofreader', '']
    ];
    var tbl = '<details class="a-details"><summary>Show the daily numbers as a table</summary><div class="a-scroll"><table class="a-table"><thead><tr><th scope="col">Day</th><th scope="col">Written</th><th scope="col">Ticked</th><th scope="col">Rolled over</th></tr></thead><tbody>' +
      agg.dates.slice().reverse().map(function (d) { return '<tr><th scope="row">' + esc(dayShort(d)) + '</th><td>' + agg.perDay[d].w + '</td><td>' + agg.perDay[d].t + '</td><td>' + agg.perDay[d].r + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
    return head + '<div class="a-tiles">' + tiles.map(tileHTML).join('') + '</div>' +
      '<div class="a-grid">' + smartHTML(agg, prev, n) +
      card(calHTML(n)) + card(hourHTML(n)) +
      card('<h3 class="a-ch-h">Lines each day</h3>' + legend([['Written', CW], ['Ticked off', CT]]) + dailyChart(agg) + tbl, 'full') +
      card('<h3 class="a-ch-h">By person</h3>' + legend([['Written', CW], ['Ticked off', CT]]) + peopleChart(agg)) +
      card('<h3 class="a-ch-h">Sections</h3>' + sectionsChart(agg)) +
      card('<h3 class="a-ch-h">Load by weekday and section</h3><span class="hint">Which sections are busy on which days. Useful for the roster.</span>' + heatHTML(n), 'full') +
      card('<h3 class="a-ch-h">Slow and sticky lines</h3><span class="hint">Roll over 3 or more times, usually take 4 hours or more to tick, or keep being removed.</span>' + stickyHTML(n), 'full') +
      card('<h3 class="a-ch-h">Rolled over most often</h3><span class="hint">Lines that were not finished and moved onto the next day.</span>' + rollChart(agg)) +
      card(missesHTML()) + card(viewsHTML()) + card(fixesHTML(agg)) + '</div></section>';
  }


  /* ---------- drawing ---------- */
  var TICK = '<svg viewBox="0 0 26 26" width="26" height="26" aria-hidden="true"><path d="M5 14 L11 20 L22 5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function gateHTML() {
    return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Kitchen PIN</h2><p class="hint">Enter the kitchen PIN to open the prep book. This phone remembers it.</p>' +
      '<div class="field"><label class="label" for="p-pin">PIN</label>' + pinField('p-pin', 'p-pin', S.pinInput) + '</div>' +
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
      '<div class="field"><label class="label" for="pf1">' + (setting ? 'New PIN' : 'PIN') + '</label>' + pinField('pf1', 'pf1', S.pf1) + '</div>' +
      (setting ? '<div class="field"><label class="label" for="pf2">Type it again</label>' + pinField('pf2', 'pf2', S.pf2) + '</div>' : '') +
      (S.pinMsg ? '<p class="p-err" role="alert">' + esc(S.pinMsg) + '</p>' : '') +
      '<div class="btn-row"><button type="submit" class="btn dark">' + (setting ? 'Save my PIN' : 'Open the prep book') + '</button><button type="button" class="btn" data-p="who-change">Not me</button></div></form>';
  }

  var BOX = '<svg viewBox="0 0 26 26" width="26" height="26" aria-hidden="true"><rect x="2.5" y="2.5" width="21" height="21" rx="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  function rowHTML(x, date, readonly) {
    var tickOk = can('tick') && !x.deleted && (!x.done || canUntick(x)), delOk = can('del');
    var by = x.done && x.doneBy ? esc(x.doneBy) + (x.doneAt ? ' ' + clock(x.doneAt) : '') : (x.rolled ? (x.origBy ? 'from ' + esc(x.origBy) : '') : (x.addedBy ? esc(x.addedBy) : ''));
    var marks = (x.urgent ? '<span class="nb-urg">Urgent</span>' : '') + (x.rolled ? '<span class="nb-roll" title="Not finished earlier, so it rolled over">Rolled' + (x.rolled > 1 ? ' x' + x.rolled : '') + '</span>' : '');
    var star = can('add') && !x.deleted && !readonly ? '<button type="button" class="nb-star" data-p="urgent" data-id="' + esc(x.id) + '" aria-pressed="' + !!x.urgent + '" aria-label="' + esc((x.urgent ? 'Not urgent: ' : 'Mark urgent: ') + x.text) + '">!</button>' : '';
    var rid = x.recipe || ((matchRecipe(x.text) || {}).id || ''), rr = rid ? recipeById(rid) : null;
    var link = rid ? '<a class="nb-go" href="#/r/' + encodeURIComponent(rid) + '" title="' + esc(rr ? 'Open the ' + rr.name + ' card' : 'Open the recipe') + '">recipe</a>' : '';
    return '<li id="nbr-' + esc(x.id) + '" class="nb-row' + (x.done ? ' is-done' : '') + (x.rolled && !x.done ? ' is-rolled' : '') + (x.urgent && !x.done ? ' is-urgent' : '') + (x.deleted ? ' is-removed' : '') + '">' +
      '<button type="button" class="nb-box" data-p="tick" data-id="' + esc(x.id) + '" data-d="' + esc(date) + '" aria-pressed="' + !!x.done + '" aria-label="' + esc((x.done ? 'Untick ' : 'Tick ') + x.text) + '"' + (tickOk ? '' : ' disabled') + '>' + (x.done ? TICK : BOX) + '</button>' +
      '<span class="nb-t"' + (x.orig ? ' title="' + esc('Corrected from: ' + x.orig) + '"' : '') + '>' + esc(x.text) + (x.qty ? ' <span class="nb-q">' + esc(x.qty) + '</span>' : '') + '</span>' + marks +
      '<span class="nb-by">' + by + '</span>' + star + link +
      (delOk ? '<button type="button" class="nb-x" data-p="' + (x.deleted ? 'restore' : 'del') + '" data-id="' + esc(x.id) + '" data-d="' + esc(date) + '" aria-label="' + (x.deleted ? 'Put back ' : 'Remove ') + esc(x.text) + '">' + (x.deleted ? 'put back' : 'remove') + '</button>' : '') + '</li>';
  }
  function pageBody(items, date) {
    var shown = items.filter(function (x) { return (S.showRemoved || !x.deleted) && (!S.tab || (x.station || '') === S.tab); });
    shown.sort(sortItems);
    var order = [], seen = {};
    shown.forEach(function (x) { var k = x.station || ''; if (!seen[k]) { seen[k] = 1; order.push(k); } });
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
  function wasteFor(t, reasons) {
    var k = okey(t); if (k.length < 3 || !S.wRecent) return null;
    var n = 0, r = {};
    S.wRecent.forEach(function (x) { var wk = okey(x.text); if (!wk || (reasons && reasons.indexOf(x.reason) < 0)) return; if (wk === k || (wk.length >= 4 && (' ' + k + ' ').indexOf(' ' + wk + ' ') >= 0)) { n++; r[x.reason] = (r[x.reason] || 0) + 1; } });
    if (!n) return null;
    var top = Object.keys(r).sort(function (a, b) { return r[b] - r[a]; })[0];
    return { n: n, top: top };
  }
  function hintText(t) {
    var m = t && t.trim().length > 2 ? matchRecipe(t) : null, out = m ? 'Links to the ' + m.name + ' card.' : '';
    var w = t && t.trim().length > 2 ? wasteFor(t, ['excess', 'expired']) : null;
    if (w && w.n >= 2) out += (out ? ' ' : '') + 'Logged as waste ' + w.n + ' times in 14 days (mostly ' + reasonName(w.top).toLowerCase() + '). Think about a smaller batch.';
    return out;
  }
  function oHintText(t) {
    var w = t && t.trim().length > 2 ? wasteFor(t, ['expired']) : null;
    return w ? 'Expired stock logged ' + w.n + (w.n === 1 ? ' time' : ' times') + ' in 14 days. Order a little less?' : '';
  }
  function sideHTML(today) {
    var live = S.items.filter(function (x) { return !x.deleted; });
    var rolled = live.filter(function (x) { return x.rolled && !x.done; }), urg = live.filter(function (x) { return x.urgent && !x.done; });
    var secs = {}, order = [];
    live.forEach(function (x) { var k = x.station || 'General'; if (!secs[k]) { secs[k] = { n: 0, d: 0 }; order.push(k); } secs[k].n++; if (x.done) secs[k].d++; });
    var startShown = can('tick') && S.date === ymd(new Date()) && live.filter(function (x) { return !x.done; }).length >= 4;
    var prio = !startShown && (rolled.length || urg.length) ? '<div class="nb-prio"><strong>Do these first</strong><span>' + (urg.length ? urg.length + ' urgent' : '') + (urg.length && rolled.length ? ', ' : '') + (rolled.length ? rolled.length + ' rolled over from earlier' : '') + '. They sit at the top of each section.</span></div>' : '';
    var meters = order.length ? '<h3 class="nb-sh">Progress by section</h3>' + order.map(function (k) {
      var m = secs[k], pc = m.n ? Math.round(m.d / m.n * 100) : 0;
      return '<div class="nb-meter"><span class="nb-ml">' + esc(k) + '</span><span class="nb-mb" role="img" aria-label="' + esc(k + ': ' + m.d + ' of ' + m.n + ' done') + '"><i style="width:' + pc + '%"></i></span><span class="nb-mn">' + m.d + '/' + m.n + '</span></div>';
    }).join('') : '';
    var have = onList(), dn = String(parseYmd(S.date).getDay()), dname = parseYmd(S.date).toLocaleDateString('en-AU', { weekday: 'long' });
    var today2 = S.learned.filter(function (x) { return !x.hidden && !have[x.id] && x.text && ((x.dow || {})[dn] || 0) >= 2; }).sort(function (a, b) { return ((b.dow || {})[dn] || 0) - ((a.dow || {})[dn] || 0) || (b.uses || 0) - (a.uses || 0); }).slice(0, 12);
    var shownK = {}; today2.forEach(function (x) { shownK[x.id] = 1; });
    var regs = S.learned.filter(function (x) { return isRegular(x) && !have[x.id] && !shownK[x.id] && x.text; }).sort(function (a, b) { return (b.uses || 0) - (a.uses || 0); }).slice(0, 14);
    S.quick = [];
    function chip(x, note) { var uq = usualQty(x.text); S.quick.push({ text: x.text, section: bestSection(x) }); return '<button type="button" class="chip sq" data-p="quick" data-i="' + (S.quick.length - 1) + '">' + esc(x.text) + (uq ? ' <span class="nb-uq">' + esc(uq) + '</span>' : '') + (note ? ' <span class="nb-us">' + esc(note) + '</span>' : '') + '</button>'; }
    var due = can('add') && S.date === ymd(new Date()) && S.past ? dueList() : [];
    S.due = due;
    due.forEach(function (x) { shownK[x.k] = 1; });
    today2 = today2.filter(function (x) { return !due.some(function (d) { return d.k === x.id; }); });
    var dueHTML = due.length ? '<h3 class="nb-sh">Due today</h3><p class="nb-sd">Made every few days and the usual gap has passed. Tap to add.</p><div class="nb-usual">' + due.map(function (x, i) {
      var uq = usualQty(x.text);
      return '<button type="button" class="chip sq" data-p="due" data-i="' + i + '">' + esc(x.text) + (uq ? ' <span class="nb-uq">' + esc(uq) + '</span>' : '') + ' <span class="nb-us">' + esc((x.gap === 1 ? 'daily' : 'every ' + x.gap + ' days') + ', last ' + parseYmd(x.last).toLocaleDateString('en-AU', { weekday: 'short' })) + '</span></button>';
    }).join('') + '</div>' : '';
    var pc = canBrowse() && S.date === ymd(new Date()) && S.past ? pace() : null;
    var paceHTML = pc ? '<div class="nb-pace' + (pc.today + 0.1 < pc.usual ? ' is-behind' : '') + '"><span class="nb-sl">Pace</span><p><strong>' + Math.round(pc.today * 100) + '%</strong> ticked now (' + pc.done + ' of ' + pc.n + '). By ' + clock(Date.now()) + ' it is usually <strong>' + Math.round(pc.usual * 100) + '%</strong>' + (pc.sameDay ? ' on a ' + esc(dname) : '') + '.</p><span class="nb-sw">' + (pc.today + 0.1 < pc.usual ? 'Behind the usual pace. Check who needs a hand.' : 'On pace.') + ' Only the head chef and sous chefs see this.</span></div>' : '';
    var stuck = canBrowse() && S.date === ymd(new Date()) ? live.filter(function (x) { return !x.done && (x.rolled || 0) >= 3; }) : [];
    var stuckHTML = stuck.length ? '<h3 class="nb-sh">Stuck lines</h3><p class="nb-sd">Rolled over 3 or more times. Make it urgent, split it into smaller jobs, or remove it if it is not needed.</p><ul class="nb-stuck">' + stuck.map(function (x) {
      return '<li><span>' + esc(x.text) + ' <span class="nb-us">x' + x.rolled + '</span></span>' + (x.urgent ? '' : '<button type="button" class="p-x" data-p="stuck-urgent" data-id="' + esc(x.id) + '">Urgent</button>') + (can('del') ? '<button type="button" class="p-x" data-p="del" data-id="' + esc(x.id) + '" data-d="' + esc(S.date) + '">Remove</button>' : '') + '</li>';
    }).join('') + '</ul>' : '';
    var usual = can('add') && today2.length ? '<h3 class="nb-sh">Usual for a ' + esc(dname) + '</h3><p class="nb-sd">Written on at least two ' + esc(dname) + 's. Tap to add.</p><div class="nb-usual">' + today2.map(function (x) { return chip(x, ((x.dow || {})[dn] || 0) + 'x'); }).join('') + '</div>' : '';
    usual += can('add') && regs.length ? '<h3 class="nb-sh">Regulars</h3><p class="nb-sd">Written or picked ' + REGULAR + ' or more times. Tap to add.</p><div class="nb-usual">' + regs.map(function (x) { return chip(x, x.uses + 'x'); }).join('') + '</div>' : '';
    var tools = '<h3 class="nb-sh">Tools</h3><div class="nb-tools">' +
      '<button type="button" class="nb-btn" data-p="copy">Copy the list</button>' +
      '<button type="button" class="nb-btn" data-p="print">Print the list</button>' +
      (isSous() ? '<button type="button" class="nb-btn" data-p="staff-open">Manage staff</button>' : '') + '</div>';
    var dl = live.filter(function (x) { return x.done; }).sort(function (a, b) { return (b.doneAt || 0) - (a.doneAt || 0); });
    var donebox = '<h3 class="nb-sh">Done today (' + dl.length + ')</h3>' + (dl.length ? '<ul class="nb-done">' + dl.map(function (x) {
      return '<li><span class="nb-dt">' + (x.doneAt ? clock(x.doneAt) : '') + '</span><span class="nb-dx">' + esc(x.text) + (x.qty ? ' <em>' + esc(x.qty) + '</em>' : '') + '</span><span class="nb-dw">' + esc(x.doneBy || '') + '</span></li>';
    }).join('') + '</ul>' : '<p class="nb-sd">Nothing ticked yet.</p>');
    return paceHTML + prio + stuckHTML + donebox + meters + dueHTML + usual + tools;
  }
  function listHTML() {
    var p = me(), today = ymd(new Date());
    if (S.date !== today && !canBrowse() && !S.user) { S.date = today; S.tab = ''; watchItems(); }
    if (S.authed && fb) { loadPast(); loadWRecent(false); }
    S.week = S.past ? weekRanks() : null;
    maybeRoll(); maybeLearn(); loadWNote();
    var live = S.items.filter(function (x) { return !x.deleted; }), doneN = live.filter(function (x) { return x.done; }).length;
    var removed = S.items.filter(function (x) { return x.deleted; });
    var secs = {}, tabs = [];
    S.items.forEach(function (x) { if (x.station && !x.deleted && !secs[x.station]) { secs[x.station] = 1; tabs.push(x.station); } });
    var tabHTML = tabs.length ? '<nav class="nb-tabs" aria-label="Sections"><button type="button" class="nb-tab" data-p="tab" data-v="" aria-pressed="' + !S.tab + '">All</button>' +
      tabs.map(function (t) { return '<button type="button" class="nb-tab" data-p="tab" data-v="' + esc(t) + '" aria-pressed="' + (S.tab === t) + '">' + esc(t) + '</button>'; }).join('') + '</nav>' : '';
    var sug = suggestions();
    var add = can('add') ?
      '<form class="nb-add" data-p-form="add"><datalist id="p-sections">' + sug.map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join('') + '</datalist>' +
      '<div class="nb-add-row"><label class="visually-hidden" for="p-section">Section</label><input id="p-section" class="nb-in nb-in-sec" data-k="p-section" list="p-sections" autocomplete="off" placeholder="Section" maxlength="40" value="' + esc(S.section) + '">' +
      '<label class="visually-hidden" for="p-text">Prep item</label><input id="p-text" class="nb-in nb-in-text" data-k="p-text" autocomplete="off" placeholder="Write a new line..." maxlength="160" value="' + esc(S.text) + '">' +
      '<label class="visually-hidden" for="p-qty">Amount</label><input id="p-qty" class="nb-in nb-in-qty" data-k="p-qty" autocomplete="off" placeholder="Amount" maxlength="40" value="' + esc(S.qty) + '">' +
      '<button type="submit" class="nb-addbtn">Add</button></div><div class="nb-sugg" id="p-sugg">' + suggestHTML() + '</div><div class="nb-sugg nb-qs" id="p-qsugg">' + qtyChipsHTML() + '</div><p class="nb-hint" id="p-hint" aria-live="polite">' + esc(hintText(S.text)) + '</p>' + recipePicker() + '</form>' : '<p class="hint">You can read the book but not write in it. Ask the admin if that is wrong.</p>';
    var todayEmpty = !live.length && S.itemsState === 'ok' ? '<p class="nb-empty">Nothing written for ' + esc(dayName(S.date).toLowerCase()) + ' yet.</p>' : '';
    var left = '<section class="nb-page nb-left"><header class="nb-ph"><div><h2 class="nb-title" id="rtitle" tabindex="-1">' + esc(dayName(S.date)) + '</h2><span class="nb-date">' + esc(longDate(S.date)) + '</span></div>' +
      '<div class="nb-prog" role="status">' + doneN + ' of ' + live.length + ' done</div></header>' +
      (S.itemsState === 'error' ? '<p class="p-err">Could not load this page. Check the connection.</p>' : '') +
      '<div class="nb-body">' + closeoutHTML(live) + wNoteHTML() + startHTML(live) + pageBody(S.items, S.date) + todayEmpty + '</div>' +
      '<div class="nb-foot">' + add + (removed.length && can('del') ? '<button type="button" class="nb-link" data-p="removed">' + (S.showRemoved ? 'Hide' : 'Show') + ' removed (' + removed.length + ')</button>' : '') + '</div></section>';
    var right = '<section class="nb-page nb-right"><header class="nb-ph"><div><h2 class="nb-title nb-dim">Handy</h2><span class="nb-date">Priorities, progress and tools</span></div></header>' +
      '<div class="nb-body nb-side">' + sideHTML(today) + '</div></section>';
    return '<div class="nb-top"><span>' + (p ? 'Writing as <strong>' + esc(p.name) + '</strong>' + (can('tick') ? '' : ' (read only)') + esc(myRank()) : '') + '</span><span class="p-links"><button type="button" class="p-link" data-p="who-change">Not you?</button>' + '' + '</span></div>' +
      (canBrowse() ? '<div class="nb-nav"><button type="button" class="chip" data-p="day" data-d="-1" aria-label="Back one day">&lsaquo;</button>' +
      '<button type="button" class="chip" data-p="today" aria-pressed="' + (S.date === today) + '">Today</button>' +
      '<label class="visually-hidden" for="p-day">Pick a date</label><input id="p-day" type="date" class="p-dateinput" data-k="p-day" value="' + esc(S.date) + '">' +
      '<button type="button" class="chip" data-p="day" data-d="1" aria-label="Forward one day">&rsaquo;</button></div>' : '') +
      badgeStrip() + '<div class="nb-wrap"><div class="nb">' + left + '<div class="nb-spine" aria-hidden="true"></div>' + right + '</div>' + tabHTML + '</div>';
  }
  function ago(ms) {
    if (!ms) return 'never';
    var m = Math.round((Date.now() - ms) / 60000);
    if (m < 2) return 'just now';
    if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60);
    if (h < 24) return h + ' h ago';
    var dd = Math.round(h / 24); return dd + (dd === 1 ? ' day ago' : ' days ago');
  }
  function statsHTML(part) {
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
    var people = '<section class="set-block"><span class="label">Who is writing and ticking</span><span class="hint">Counted in the background since this feature started. Ticks that are taken back are taken off.</span>' +
      '<div class="a-scroll"><table class="a-table"><thead><tr><th scope="col">Name</th><th scope="col">Lines written</th><th scope="col">Ticked off</th><th scope="col">Sign-ins</th><th scope="col">Last seen</th></tr></thead><tbody>' + (rows || '<tr><td colspan="5">No people yet.</td></tr>') + '</tbody></table></div></section>';
    var secs = '<section class="set-block"><span class="label">Sections people have written</span><span class="hint">Sections appear by themselves when someone types a new one. Hide one to stop it showing as a suggestion.</span>' +
      '<div class="a-scroll"><table class="a-table"><thead><tr><th scope="col">Section</th><th scope="col">Lines</th><th scope="col">Last written by</th><th scope="col">Last used</th><th scope="col"></th></tr></thead><tbody>' + (secRows || '<tr><td colspan="5">No sections yet.</td></tr>') + '</tbody></table></div></section>';
    return part === 'sections' ? secs : people;
  }
  /* ---------- team: who writes where, who writes rarely, order tracking (owner) ---------- */
  function loadOrdStats(force) {
    if (!fb || S.configState !== 'ok') return;
    if (S.ordStats && (S.ordStats.loading || !force)) return;
    S.ordStats = { loading: true, lines: [] };
    var today = ymd(new Date()), dates = [], i;
    for (i = 0; i < 30; i++) dates.push(shift(today, -i));
    Promise.all(dates.map(function (d) { return fb.fs.getDocs(ordCol(d)).then(function (s) { return s.docs.map(function (x) { var v = x.data(); v.date = d; return v; }); }, function () { return []; }); })).then(function (l) {
      S.ordStats = { loading: false, lines: [].concat.apply([], l) }; draw();
    });
  }
  function blankRec(id) { return { id: id, w: 0, days: {}, secDay: {}, secs: {}, t: 0, tdays: {}, tsecs: {}, tsecDay: {}, last: '' }; }
  function teamData(n) {
    var today = ymd(new Date()), dates = [], i, names = {}, per = {}, secTotal = {}, tickSec = {}, activeDays = {};
    for (i = n - 1; i >= 0; i--) dates.push(shift(today, -i));
    (S.config.people || []).forEach(function (p) { names[p.id] = p.name; });
    function rec(x) {
      var id = x.addedById || ('n:' + (x.addedBy || 'Unknown'));
      if (!names[id] && x.addedBy) names[id] = x.addedBy;
      return per[id] = per[id] || blankRec(id);
    }
    dates.forEach(function (d) {
      (S.stats.days[d] || []).forEach(function (x) {
        if (x.deleted) return;
        if (!x.rolled) {
          var r = rec(x); r.w++; r.days[d] = 1; activeDays[d] = 1; if (!r.last || d > r.last) r.last = d;
          if (x.station) { r.secs[x.station] = (r.secs[x.station] || 0) + 1; secTotal[x.station] = (secTotal[x.station] || 0) + 1; (r.secDay[d] = r.secDay[d] || {})[x.station] = ((r.secDay[d] || {})[x.station] || 0) + 1; }
        }
        if (x.done && x.doneById) {
          var tr = per[x.doneById] = per[x.doneById] || blankRec(x.doneById); tr.t++; tr.tdays[d] = 1;
          if (x.station) { tr.tsecs[x.station] = (tr.tsecs[x.station] || 0) + 1; tickSec[x.station] = (tickSec[x.station] || 0) + 1; var td2 = tr.tsecDay[d] = tr.tsecDay[d] || {}; td2[x.station] = (td2[x.station] || 0) + 1; }
        }
      });
    });
    return { dates: dates, names: names, per: per, secTotal: secTotal, tickSec: tickSec, nActive: Object.keys(activeDays).length };
  }
  function habit(r, td) {
    // Ticks show where someone actually worked, so they come first. Writing is the fallback for people who rarely tick.
    var tTot = 0; Object.keys(r.tsecs || {}).forEach(function (k) { tTot += r.tsecs[k]; });
    var useT = tTot >= 8, by = useT ? r.tsecs : r.secs, byDay = useT ? r.tsecDay : r.secDay, totals = useT ? td.tickSec : td.secTotal;
    var secs = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }), tot = 0;
    secs.forEach(function (k) { tot += by[k]; });
    if (!tot) return { top: '', share: 0, streak: 0, tot: 0, also: [], suggest: '', flag: false, basis: '' };
    var top = secs[0], share = by[top] / tot, streak = 0, i;
    // consecutive days (newest first) whose busiest section is the same as the top one
    var wd = Object.keys(byDay).sort().reverse();
    for (i = 0; i < wd.length; i++) {
      var m = byDay[wd[i]], best = Object.keys(m).sort(function (a, b) { return m[b] - m[a]; })[0];
      if (best === top) streak++; else break;
    }
    var alt = Object.keys(totals).filter(function (k) { return k !== top && totals[k] >= 5; }).sort(function (a, b) { return (by[a] || 0) - (by[b] || 0) || totals[b] - totals[a]; })[0] || '';
    var flag = tot >= 8 && ((share >= 0.7 && wd.length >= 5) || streak >= 5);
    return { top: top, share: share, streak: streak, tot: tot, also: secs.slice(1, 3), suggest: flag ? alt : '', flag: flag, basis: useT ? 'ticks' : 'writing' };
  }
  /* Skills matrix: how many lines each person ticked in each section. Gaps are cross-training chances. */
  var SK = ['#FFFFFF', '#FCE3D5', '#F8C3A4', '#F29A6A', '#EB6834'];
  function skLevel(v) { return !v ? 0 : v <= 2 ? 1 : v <= 5 ? 2 : v <= 10 ? 3 : 4; }
  function skillsHTML(rows, td) {
    var secs = Object.keys(td.tickSec).sort(function (a, b) { return td.tickSec[b] - td.tickSec[a]; }).slice(0, 8);
    var ppl = rows.filter(function (x) { return x.r.t || x.r.w; });
    if (!secs.length || !ppl.length) return '<p class="hint">No ticked lines with a section in this time yet.</p>';
    var head = '<tr><th scope="col">Person</th>' + secs.map(function (k) { return '<th scope="col">' + esc(k) + '</th>'; }).join('') + '<th scope="col">Sections</th></tr>';
    var body = ppl.sort(function (a, b) { return b.r.t - a.r.t; }).map(function (x) {
      var have = secs.filter(function (k) { return (x.r.tsecs || {})[k]; }).length;
      return '<tr><th scope="row">' + esc(x.p.name) + '</th>' + secs.map(function (k) {
        var v = (x.r.tsecs || {})[k] || 0;
        return '<td class="sk-c" style="background:' + SK[skLevel(v)] + '" title="' + esc(x.p.name + ', ' + k + ': ' + v + (v === 1 ? ' line ticked' : ' lines ticked')) + '">' + (v || '<span class="sk-0">never</span>') + '</td>';
      }).join('') + '<td>' + have + ' of ' + secs.length + '</td></tr>';
    }).join('');
    var key = '<div class="a-legend sk-key"><span>Lines ticked:</span>' + [['never', 0], ['1 to 2', 1], ['3 to 5', 2], ['6 to 10', 3], ['over 10', 4]].map(function (k) { return '<span><i style="background:' + SK[k[1]] + '"></i>' + k[0] + '</span>'; }).join('') + '</div>';
    var gaps = secs.filter(function (k) { return td.tickSec[k] >= 5; }).map(function (k) {
      var pros = ppl.filter(function (x) { return ((x.r.tsecs || {})[k] || 0) >= 3; }).sort(function (a, b) { return b.r.tsecs[k] - a.r.tsecs[k]; }).slice(0, 2);
      var never = ppl.filter(function (x) { return x.r.t >= 5 && !(x.r.tsecs || {})[k]; });
      if (!never.length || !pros.length) return '';
      return '<li><strong>' + esc(k) + ':</strong> ' + esc(never.map(function (x) { return x.p.name; }).join(', ')) + (never.length === 1 ? ' has' : ' have') + ' not ticked a line here. Pair them with ' + esc(pros.map(function (x) { return x.p.name + ' (' + x.r.tsecs[k] + ')'; }).join(' or ')) + '.</li>';
    }).filter(Boolean).join('');
    return key + '<div class="a-tablewrap"><table class="a-table a-plain sk-t"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
      '<h3 class="a-ch-h">Cross-training chances</h3><span class="hint">Sections with at least 5 ticked lines, people with 5 or more ticks overall who have never ticked one there, and who has done that section most.</span>' +
      (gaps ? '<ul class="a-list">' + gaps + '</ul>' : '<p class="hint">No gaps worth flagging in this time.</p>');
  }
  function teamHTML() {
    var st = S.stats;
    if (!st || st.loading) return '<section class="set-block"><span class="label">Team</span><p class="hint">Loading the last 30 days...</p></section>';
    loadOrdStats(false);
    var n = S.statsRange, td = teamData(n), people = (S.config.people || []).filter(function (p) { return p.active !== false; });
    var rows = people.map(function (p) { var r = td.per[p.id] || blankRec(p.id); return { p: p, r: r, h: habit(r, td), wd: Object.keys(r.days).length, tdN: Object.keys(r.tdays).length }; });
    var chips = filtersHTML('team');
    var hab = rows.filter(function (x) { return x.h.tot; }).sort(function (a, b) { return (b.h.flag ? 1 : 0) - (a.h.flag ? 1 : 0) || b.h.streak - a.h.streak; }).map(function (x) {
      return '<tr><th scope="row">' + esc(x.p.name) + '</th><td>' + x.h.tot + ' <span class="o-who-i">' + (x.h.basis === 'ticks' ? 'ticked' : 'written') + '</span></td><td>' + esc(x.h.top) + ' <span class="o-who-i">' + Math.round(x.h.share * 100) + '%</span></td><td>' + esc(x.h.also.join(', ') || 'none') + '</td><td>' + x.h.streak + (x.h.streak === 1 ? ' day' : ' days') + '</td><td>' +
        (x.h.flag ? '<span class="a-flag">Consider rotating' + (x.h.suggest ? ' to ' + esc(x.h.suggest) : '') + '</span>' : '<span class="o-who-i">Fine for now</span>') + '</td></tr>';
    }).join('');
    var act = rows.slice().sort(function (a, b) { return a.wd - b.wd || a.r.w - b.r.w; }).map(function (x) {
      var share = td.nActive ? x.wd / td.nActive : 0, quiet = td.nActive >= 3 && share < 0.3;
      return '<tr><th scope="row">' + esc(x.p.name) + '</th><td>' + x.r.w + '</td><td>' + x.wd + ' of ' + td.nActive + '</td><td>' + x.r.t + ' (' + x.tdN + ' days)</td><td>' + (x.r.last ? esc(dayShort(x.r.last)) : 'none in this time') + '</td><td>' + (quiet ? '<span class="a-flag">Writes rarely</span>' : '<span class="o-who-i">OK</span>') + '</td></tr>';
    }).join('');
    return '<section class="set-block"><span class="label">Team</span><span class="hint">Worked out from the section each line sits under, who ticked it and who wrote it. Ticks show where someone actually worked, so they count first. Use it as a prompt for a chat, not a verdict.</span>' + chips +
      '<h3 class="a-ch-h">Skills matrix</h3><span class="hint">Lines each person ticked in each section (the 8 busiest sections).</span>' + skillsHTML(rows, td) +
      '<h3 class="a-ch-h">Section habits</h3><span class="hint">Based on ticks for anyone with 8 or more ticked lines, otherwise on the lines they wrote. Flagged when 70% or more of them over 5 or more days, or the last 5 or more days, were in one section. The suggestion is the section they have done least.</span>' +
      (hab ? '<div class="a-tablewrap"><table class="a-table a-plain"><thead><tr><th scope="col">Person</th><th scope="col">Lines</th><th scope="col">Main section</th><th scope="col">Also</th><th scope="col">In a row</th><th scope="col">Rotation</th></tr></thead><tbody>' + hab + '</tbody></table></div>' : '<p class="hint">No lines with a section in this time.</p>') +
      '<h3 class="a-ch-h">Who writes, and who does not</h3><span class="hint">Days written is out of the ' + td.nActive + ' days in this time that had any lines written. Fewest first. Ticks are shown so you can tell someone who works but does not write.</span>' +
      (act ? '<div class="a-tablewrap"><table class="a-table a-plain"><thead><tr><th scope="col">Person</th><th scope="col">Lines</th><th scope="col">Days written</th><th scope="col">Ticks</th><th scope="col">Last wrote</th><th scope="col">Note</th></tr></thead><tbody>' + act + '</tbody></table></div>' : '<p class="hint">No people on the list.</p>') + '</section>' + orderStatsHTML(td, n);
  }
  /* Items that keep coming back onto the order list in the last 14 days: candidates for a standing order. */
  function standingHTML(all) {
    var from = shift(ymd(new Date()), -13), m = {};
    all.filter(function (x) { return !x.deleted && x.date >= from; }).forEach(function (x) {
      var k = okey(x.text); if (!k) return;
      var e = m[k] = m[k] || { text: x.text, days: {}, dow: {}, q: {} };
      if (!e.days[x.date]) { e.days[x.date] = 1; var dw = parseYmd(x.date).getDay(); e.dow[dw] = (e.dow[dw] || 0) + 1; }
      if (x.qty) e.q[x.qty] = (e.q[x.qty] || 0) + 1;
    });
    var rows = Object.keys(m).map(function (k) { return m[k]; }).filter(function (e) { return Object.keys(e.days).length >= 3; })
      .sort(function (a, b) { return Object.keys(b.days).length - Object.keys(a.days).length; }).slice(0, 12);
    var head = '<h3 class="a-ch-h">Standing order candidates</h3><span class="hint">On the order list on 3 or more different days in the last 14 days. A standing order with the supplier saves writing them every time.</span>';
    if (!rows.length) return head + '<p class="hint">Nothing comes back often enough yet.</p>';
    return head + '<div class="a-tablewrap"><table class="a-table a-plain"><thead><tr><th scope="col">Item</th><th scope="col">Days on the list</th><th scope="col">Usual amount</th><th scope="col">Suggestion</th></tr></thead><tbody>' + rows.map(function (e) {
      var nd = Object.keys(e.days).length, dows = DOW.filter(function (d) { return (e.dow[d] || 0) >= 2; }).map(function (d) { return DOWN[DOW.indexOf(d)]; });
      var uq = Object.keys(e.q).sort(function (a, b) { return e.q[b] - e.q[a]; })[0] || '';
      return '<tr><th scope="row">' + esc(e.text) + '</th><td>' + nd + ' of 14</td><td>' + esc(uq || 'not written') + '</td><td><span class="a-flag">' + esc(dows.length ? 'Standing order on ' + dows.join(' and ') : 'Standing order about every ' + Math.max(1, Math.round(14 / nd)) + ' days') + '</span></td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function orderStatsHTML(td, n) {
    var os = S.ordStats;
    if (!os || os.loading) return '<section class="set-block"><span class="label">Order list</span><p class="hint">Loading...</p></section>';
    var from = shift(ymd(new Date()), -(n - 1)), lines = os.lines.filter(function (x) { return !x.deleted && x.date >= from; });
    var byDay = {}, byPerson = {}, items = {}, ordered = 0;
    lines.forEach(function (x) {
      var d = byDay[x.date] = byDay[x.date] || { n: 0, who: {} }; d.n++; d.who[x.addedBy || 'Unknown'] = 1;
      var p = byPerson[x.addedBy || 'Unknown'] = byPerson[x.addedBy || 'Unknown'] || { n: 0, days: {}, last: '' }; p.n++; p.days[x.date] = 1; if (!p.last || x.date > p.last) p.last = x.date;
      var k = okey(x.text); if (k) { var it = items[k] = items[k] || { text: x.text, n: 0, days: {} }; it.n++; it.days[x.date] = 1; }
      if (x.ordered) ordered++;
    });
    var dayRows = Object.keys(byDay).sort().reverse().map(function (d) { return '<tr><th scope="row">' + esc(dayShort(d)) + '</th><td>' + byDay[d].n + '</td><td>' + esc(Object.keys(byDay[d].who).join(', ')) + '</td></tr>'; }).join('');
    var perRows = Object.keys(byPerson).sort(function (a, b) { return byPerson[b].n - byPerson[a].n; }).map(function (k) { var p = byPerson[k]; return '<tr><th scope="row">' + esc(k) + '</th><td>' + p.n + '</td><td>' + Object.keys(p.days).length + '</td><td>' + esc(dayShort(p.last)) + '</td></tr>'; }).join('');
    var itemRows = Object.keys(items).sort(function (a, b) { return items[b].n - items[a].n; }).slice(0, 10).map(function (k) { var it = items[k]; return '<tr><th scope="row">' + esc(it.text) + '</th><td>' + it.n + '</td><td>' + Object.keys(it.days).length + '</td></tr>'; }).join('');
    var lag = lines.filter(function (x) { return x.ordered && x.orderedAt && x.addedAt && x.orderedAt > x.addedAt; }).map(function (x) { return x.orderedAt - x.addedAt; }).sort(function (a, b) { return a - b; });
    var old = lines.filter(function (x) { return !x.ordered && x.addedAt && Date.now() - x.addedAt > 3 * 86400000; }).length;
    return '<section class="set-block"><span class="label">Order list</span><span class="hint">Who put what on the order list and on which days, over the same time range. No scores, just a record.</span>' +
      '<div class="a-tiles"><div class="a-tile"><strong>' + lines.length + '</strong><span>lines written</span></div><div class="a-tile"><strong>' + ordered + '</strong><span>ticked as ordered</span></div><div class="a-tile"><strong>' + (lines.length - ordered) + '</strong><span>not yet ordered</span></div>' +
      '<div class="a-tile"><strong>' + (lag.length ? dur(lag[Math.floor(lag.length / 2)]) : 'n/a') + '</strong><span>typical time from written to ordered</span></div><div class="a-tile"><strong>' + old + '</strong><span>waiting more than 3 days</span></div></div>' +
      standingHTML(os.lines) +
      (lines.length ? '<h3 class="a-ch-h">By day</h3><div class="a-tablewrap"><table class="a-table a-plain"><thead><tr><th scope="col">Day</th><th scope="col">Lines</th><th scope="col">Written by</th></tr></thead><tbody>' + dayRows + '</tbody></table></div>' +
        '<h3 class="a-ch-h">By person</h3><div class="a-tablewrap"><table class="a-table a-plain"><thead><tr><th scope="col">Person</th><th scope="col">Lines</th><th scope="col">Days</th><th scope="col">Last</th></tr></thead><tbody>' + perRows + '</tbody></table></div>' +
        '<h3 class="a-ch-h">Ordered most often</h3><div class="a-tablewrap"><table class="a-table a-plain"><thead><tr><th scope="col">Item</th><th scope="col">Lines</th><th scope="col">Days</th></tr></thead><tbody>' + itemRows + '</tbody></table></div>' : '<p class="hint">Nothing has been written on the order list in this time.</p>') + '</section>';
  }

  function adminHTML() {
    if (S.authState !== 'ready' && !S.user) {
      return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Admin panel</h2><p class="hint">Loading...</p></section>';
    }
    if (!S.user) {
      return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Admin panel</h2><p class="hint">The admin panel is for the head chef. Sign in with the head chef\'s Google account. Staff and sous chefs use their own PIN in the prep book instead.</p>' +
        (S.saveMsg ? '<p class="p-err">' + esc(S.saveMsg) + '</p>' : '') +
        '<div class="btn-row"><button type="button" class="btn dark" data-p="signin">Sign in with Google</button><a class="btn" href="#/prep">Back to the prep book</a></div></section>';
    }
    loadAdmins();
    if (!S.level) return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Admin panel</h2><p class="hint">Checking your access...</p></section>';
    if (S.level === 'none') return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Admin panel</h2><p class="p-err">' + esc(S.user.email) + ' is not an admin here. Ask the head chef to add this Google account.</p><div class="btn-row"><button type="button" class="btn dark" data-p="signout">Sign out</button><a class="btn" href="#/prep">Back to the prep book</a></div></section>';
    if (!S.draft) startDraft();
    var d = S.draft, owner = S.level === 'owner';
    if (owner) { watchActivity(); loadStats(false); }
    var bar = '<div class="p-bar"><span>Signed in as <strong>' + esc(S.user.email) + '</strong> (' + 'head chef' + ')</span><span class="p-links"><button type="button" class="p-link" data-p="signout">Sign out</button><a class="p-link" href="#/prep">Prep book</a></span></div>';
    var bulk = '<div class="field"><label class="label" for="a-bulk">Add several names</label><textarea id="a-bulk" class="p-bulk" data-k="a-bulk" rows="3" placeholder="One name per line"></textarea></div><div class="btn-row"><button type="button" class="btn" data-p="a-bulk-add">Add these names as Staff</button></div>';
    var saveBlock = '<section class="set-block"><div class="btn-row"><button type="button" class="btn dark" data-p="a-save"' + (S.busy ? ' disabled' : '') + '>Save changes</button><button type="button" class="btn" data-p="a-reset">Undo unsaved changes</button></div><span class="saved" role="status">' + esc(S.saveMsg) + '</span></section>';
    var rows = d.people.map(function (p, i) {
      var cb = function (kind, perm, on, label) { return '<td class="a-c" data-l="' + label + '"><input type="checkbox" aria-label="' + label + ' for ' + esc(p.name) + '" data-a="' + kind + '"' + (perm ? ' data-perm="' + perm + '"' : '') + ' data-i="' + i + '"' + (on ? ' checked' : '') + '></td>'; };
      return '<tr class="' + (p.active === false ? 'is-off' : '') + '"><th scope="row"><label class="visually-hidden" for="a-n' + i + '">Name</label><input id="a-n' + i + '" class="search a-name" data-k="a-n' + i + '" data-a="name" data-i="' + i + '" value="' + esc(p.name) + '" maxlength="40"></th>' +
        '<td><label class="visually-hidden" for="a-r' + i + '">Role</label><select id="a-r' + i + '" class="p-select" data-k="a-r' + i + '" data-a="role" data-i="' + i + '">' + Object.keys(ROLES).map(function (k) { return '<option value="' + k + '"' + (p.role === k ? ' selected' : '') + '>' + ROLES[k].name + '</option>'; }).join('') + '</select></td>' +
        cb('perm', 'add', p.add, 'Write') + cb('perm', 'tick', p.tick, 'Tick') + cb('perm', 'del', p.del, 'Remove') + cb('active', '', p.active !== false, 'On list') +
        '<td class="a-act"><button type="button" class="p-x" data-p="a-reset-pin" data-id="' + esc(p.id) + '">' + (S.resetId === p.id ? 'Tap again' : 'Reset PIN') + '</button>' +
        '<button type="button" class="p-x" data-p="a-remove-person" data-i="' + i + '">Delete</button></td></tr>';
    }).join('');
    var at = S.atab || 'insights';
    var tabsBar = '<nav class="a-tabs" aria-label="Admin sections">' + [['insights', 'Insights'], ['team', 'Team'], ['waste', 'Waste'], ['learning', 'Learning'], ['people', 'People'], ['tools', 'Tools']].map(function (t) {
      return '<button type="button" class="a-tab" data-p="a-tab" data-t="' + t[0] + '" aria-pressed="' + (at === t[0]) + '">' + t[1] + '</button>';
    }).join('') + '</nav>';
    var pane = at === 'insights' ? insightsHTML() : at === 'team' ? (teamHTML() + statsHTML('people')) : at === 'waste' ? wasteStatsHTML() : at === 'learning' ? (learnedHTML() + statsHTML('sections')) : at === 'people' ? (
      '<section class="set-block"><span class="label">People</span><span class="hint">Pick a role to set the usual permissions (Sous chef can also add and remove people from the prep book itself), then adjust the ticks for one person if you need to. Reset PIN lets that person choose a new one. Removing someone from the list keeps their name on old lines.</span>' +
      (rows ? '<p class="a-swipe">Swipe the table sideways to see every column.</p><div class="a-tablewrap"><table class="a-table"><thead><tr><th scope="col">Name</th><th scope="col">Role</th><th scope="col" class="a-c">Write</th><th scope="col" class="a-c">Tick</th><th scope="col" class="a-c">Remove</th><th scope="col" class="a-c">On list</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="hint">No names yet.</p>') + '<div class="btn-row"><button type="button" class="btn" data-p="a-add-person">Add a person</button></div>' + bulk + '</section>' +
      '<section class="set-block"><span class="label">Badges</span><label class="a-check"><input type="checkbox" data-a="badges"' + (d.showBadges !== false ? ' checked' : '') + '> Show the weekly top tickers to everyone on the prep book</label></section>' + saveBlock
    ) : (
      '<section class="set-block"><span class="label">Backup</span><span class="hint">Saves everything the prep book holds (people, lines from the last 400 days, learned items, tallies) as one file on this device. People\'s PIN fingerprints are left out. Do this now and then.</span><div class="btn-row"><button type="button" class="btn" data-p="export"' + (S.exporting ? ' disabled' : '') + '>' + (S.exporting ? esc(S.exporting) : 'Download a backup') + '</button></div></section>' +
      '<section class="set-block"><span class="label">Kitchen PIN</span><span class="hint">The kitchen PIN is the lock on the whole book, so keep it to staff only. Writing needs a person\'s own PIN as well.</span>' +
      '<div class="field"><label class="label" for="a-newpin">Move to a new 4 digit kitchen PIN</label><input id="a-newpin" class="search" inputmode="numeric" maxlength="4" autocomplete="off" data-k="a-newpin" placeholder="4 digits" value="' + esc(S.newPin) + '"></div>' +
      '<div class="btn-row"><button type="button" class="btn" data-p="move-pin"' + (S.moving ? ' disabled' : '') + '>Copy everything to the new PIN</button></div><span class="saved" role="status">' + esc(S.moveMsg) + '</span><span class="hint">Ask for the new PIN to be added to the security rules first. The old PIN keeps working until its rules are removed.</span></section></div>');
    return '<div class="p-admin">' + bar + '<h2 class="p-h" id="rtitle" tabindex="-1">Admin panel</h2>' + tabsBar + '<div class="a-pane">' + pane + '</div></div>';
  }
  function staffHTML() {
    var d = S.draft || (startDraft(), S.draft);
    var srows = d.people.map(function (p, i) {
      return '<li class="a-person"><div class="a-top">' + (p.isNew ? '<label class="visually-hidden" for="a-n' + i + '">Name</label><input id="a-n' + i + '" class="search a-name" data-k="a-n' + i + '" data-a="name" data-i="' + i + '" value="' + esc(p.name) + '" maxlength="40">' : '<span class="a-name-ro">' + esc(p.name) + '</span>') +
        '<button type="button" class="p-x" data-p="a-remove-person" data-i="' + i + '">Remove</button></div></li>';
    }).join('');
    var bulk = '<div class="field"><label class="label" for="a-bulk">Add several names</label><textarea id="a-bulk" class="p-bulk" data-k="a-bulk" rows="3" placeholder="One name per line"></textarea></div><div class="btn-row"><button type="button" class="btn" data-p="a-bulk-add">Add these names as Staff</button></div>';
    return '<div class="p-admin"><div class="p-bar"><span>Staff list</span><span class="p-links"><button type="button" class="p-link" data-p="staff-close">Back to the prep book</button></span></div><h2 class="p-h" id="rtitle" tabindex="-1">Staff</h2>' +
      '<section class="set-block"><span class="hint">Add a person or remove one, then save. New people start as Staff. Removing someone keeps their name on old lines. Roles and PINs are looked after by the head chef.</span><ul class="a-list">' + (srows || '<li class="hint">No names yet.</li>') + '</ul><div class="btn-row"><button type="button" class="btn" data-p="a-add-person">Add a person</button></div>' + bulk + '</section>' +
      '<section class="set-block"><div class="btn-row"><button type="button" class="btn dark" data-p="a-save"' + (S.busy ? ' disabled' : '') + '>Save changes</button><button type="button" class="btn" data-p="a-reset">Undo unsaved changes</button></div><span class="saved" role="status">' + esc(S.saveMsg) + '</span></section></div>';
  }
  /* While connecting, show the page that is opening (not a generic prep book card), so nothing flashes. */
  var PAGE_NAME = { prep: 'Prep list', orders: 'Order list', waste: 'Wastage', admin: 'Admin panel' };
  function loadingHTML() {
    var t = PAGE_NAME[S.name] || 'Prep book';
    if (S.name === 'admin') return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">' + t + '</h2><p class="hint">Loading...</p></section>';
    return '<section class="nb-page o-page is-loading"><header class="nb-ph"><div><h2 class="nb-title" id="rtitle" tabindex="-1">' + t + '</h2><span class="nb-date">' + esc(longDate(ymd(new Date()))) + '</span></div></header>' +
      '<div class="nb-body"><p class="nb-empty">Loading...</p></div></section>';
  }
  function bodyHTML() {
    if (!S.pin) return gateHTML();
    if (S.configState === 'error') return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Prep book</h2><p class="p-err">Could not connect. Check the connection and try again.</p><div class="btn-row"><button type="button" class="btn dark" data-p="retry">Try again</button></div></section>';
    if (S.configState !== 'ok') return loadingHTML();
    if (S.name === 'admin') return adminHTML();
    if (!who()) return whoHTML();
    if (!S.authed) return ownPinHTML();
    flushMisses(); flushViews();
    if (S.name === 'orders') return ordersHTML();
    if (S.name === 'waste') return wasteHTML();
    if (S.staffOpen && isSous()) return staffHTML();
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
    S.root.innerHTML = bodyHTML() + (S.toast ? '<div class="p-toast" role="status">' + esc(S.toast) + (S.toastAct ? ' <button type="button" class="p-toast-btn" data-p="toast-act">' + esc(S.toastAct.label) + '</button>' : '') + '</div>' : '');
    S.root.classList.toggle('is-book', S.name === 'prep' && !!S.root.querySelector('.nb'));
    if (scrolls.length) Array.prototype.forEach.call(S.root.querySelectorAll('.nb-body'), function (b, i) { if (scrolls[i] != null) b.scrollTop = scrolls[i]; });
    if (key) { var el = S.root.querySelector('[data-k="' + key + '"]'); if (el) { el.focus({ preventScroll: true }); if (start != null && el.setSelectionRange) { try { el.setSelectionRange(start, end); } catch (e) {} } } }
    rendering = false;
  }

  /* ---------- the order list ----------
     Everyone writes today's order list. The head chef and sous chefs see what is still to order across the last 14 days,
     or any single day, and tick lines off as ordered. Lines whose name matches a recipe ingredient link to those recipes. */
  var ORD_DAYS = 14;
  function ordCol(date) { return fb.fs.collection.apply(null, [fb.db].concat(base(), ['orders', date, 'lines'])); }
  function ordRef(date, id) { return fb.fs.doc.apply(null, [fb.db].concat(base(), ['orders', date, 'lines', id])); }
  function okey(t) { return String(t || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  var ingIdx = null;
  function ingIndex() {
    if (ingIdx) return ingIdx;
    ingIdx = {};
    D.recipes.forEach(function (r) {
      (r.ingredients || []).forEach(function (g) {
        var n = okey(g && g.name); if (!n || n.length < 3) return;
        var e = ingIdx[n] = ingIdx[n] || { name: g.name, ids: [] };
        if (e.ids.indexOf(r.id) < 0 && e.ids.length < 6) e.ids.push(r.id);
      });
    });
    return ingIdx;
  }
  function watchOrders() {
    if (S.configState !== 'ok' || !fb) return;
    var key = S.pin + '|' + S.ordDate;
    if (key === ordKey && unsubOrd) return;
    if (unsubOrd) unsubOrd();
    ordKey = key; S.ordState = 'loading';
    unsubOrd = fb.fs.onSnapshot(ordCol(S.ordDate), function (snap) {
      S.ordLines = snap.docs.map(function (d) { var x = d.data(); x.id = d.id; x.date = S.ordDate; return x; });
      S.ordState = 'ok'; draw();
    }, function () { S.ordState = 'error'; draw(); });
  }
  function loadOrdAll(force) {
    if (!fb || S.ordBusy || S.configState !== 'ok') return;
    if (!force && Date.now() - S.ordAllAt < 60000) return;
    S.ordBusy = true; S.ordAllAt = Date.now();
    var today = ymd(new Date()), dates = [], i;
    for (i = 0; i < ORD_DAYS; i++) dates.push(shift(today, -i));
    Promise.all(dates.map(function (d) { return fb.fs.getDocs(ordCol(d)).then(function (s) { return s.docs.map(function (x) { var v = x.data(); v.id = x.id; v.date = d; return v; }); }, function () { return []; }); })).then(function (lists) {
      S.ordAll = [].concat.apply([], lists); S.ordBusy = false; draw();
    });
  }
  function ordReload() { S.ordAllAt = 0; if (S.ordView === 'all') loadOrdAll(true); }
  function addOrder() {
    var t = S.otext.trim();
    if (!t || !can('add')) return;
    var typed = t, pr = proofread(t); t = (pr.text || t).slice(0, 120);
    var hit = ingredientFor(t), p = me(), ref = fb.fs.doc(ordCol(S.ordDate));
    S.otext = ''; var q = S.oqty.trim().slice(0, 40); S.oqty = ''; draw();
    sset(ref, { text: t, qty: q, recipes: hit ? hit.ids : [], addedBy: p ? p.name : '', addedById: p ? p.id : '', addedAt: Date.now(), ordered: false, deleted: false, orig: t !== typed ? typed.slice(0, 120) : '' })
      .then(function () { ordReload(); }, function () { toast('Could not save. Check the connection.'); });
    var el = S.root && S.root.querySelector('[data-k="o-text"]'); if (el) el.focus();
  }
  function ingredientFor(text) { return ingIndex()[okey(text)] || null; }
  function setOrdered(date, id, on) {
    if (!canBrowse()) return;
    var p = me();
    return supd(ordRef(date, id), { ordered: on, orderedBy: on ? p.name : '', orderedAt: on ? Date.now() : 0 });
  }
  function tickOrderLine(date, id, on) {
    setOrdered(date, id, on).then(ordReload, function () { toast('Could not save. Check the connection.'); });
  }
  function tickOrderGroup(key) {
    var jobs = (S.ordAll || []).filter(function (x) { return !x.deleted && !x.ordered && okey(x.text) === key; }).map(function (x) { return setOrdered(x.date, x.id, true); });
    Promise.all(jobs).then(function () { toast('Marked as ordered.'); ordReload(); }, function () { toast('Could not save. Check the connection.'); });
  }
  function removeOrderLine(date, id) {
    if (!canBrowse() || !can('del')) return;
    supd(ordRef(date, id), { deleted: true, deletedBy: (me() || {}).name || '', deletedAt: Date.now() }).then(ordReload, function () { toast('Could not save. Check the connection.'); });
  }
  function ordSuggest() {
    var q = okey(S.otext); if (q.length < 2) return [];
    var seen = {}, out = [];
    function add(t) { var k = okey(t); if (k && !seen[k] && k !== q && (k.indexOf(q) === 0 || k.indexOf(' ' + q) >= 0)) { seen[k] = 1; out.push(t); } }
    (S.ordLines || []).concat(S.ordAll || []).forEach(function (x) { add(x.text); });
    var idx = ingIndex(); Object.keys(idx).forEach(function (k) { add(idx[k].name); });
    return out.slice(0, 6);
  }
  function ordSuggHTML() {
    var l = ordSuggest(); S.osugg = l;
    return l.map(function (t, i) { return '<button type="button" class="chip sq nb-sg" data-p="osugg" data-i="' + i + '">' + esc(t) + '</button>'; }).join('');
  }
  function recipeChips(x) {
    var ids = x.recipes && x.recipes.length ? x.recipes : ((ingredientFor(x.text) || {}).ids || []);
    if (!ids.length) return '';
    return '<span class="o-used">Used in ' + ids.slice(0, 3).map(function (id) { var r = recipeById(id); return r ? '<a href="#/r/' + encodeURIComponent(id) + '">' + esc(r.name) + '</a>' : ''; }).join(', ') + (ids.length > 3 ? ' +' + (ids.length - 3) : '') + '</span>';
  }
  function ordRow(x) {
    var canTick = canBrowse() && !x.deleted;
    var by = x.ordered && x.orderedBy ? 'Ordered by ' + esc(x.orderedBy) : esc(x.addedBy || '');
    return '<li class="nb-row' + (x.ordered ? ' is-done' : '') + (x.deleted ? ' is-removed' : '') + '">' +
      '<button type="button" class="nb-box" data-p="otick" data-id="' + esc(x.id) + '" data-d="' + esc(x.date) + '" aria-pressed="' + !!x.ordered + '" aria-label="' + esc((x.ordered ? 'Not ordered: ' : 'Ordered: ') + x.text) + '"' + (canTick ? '' : ' disabled') + '>' + (x.ordered ? TICK : BOX) + '</button>' +
      '<span class="nb-t"' + (x.orig ? ' title="' + esc('Corrected from: ' + x.orig) + '"' : '') + '>' + esc(x.text) + (x.qty ? ' <span class="nb-q">' + esc(x.qty) + '</span>' : '') + recipeChips(x) + '</span>' +
      '<span class="nb-by">' + by + '</span>' +
      (canBrowse() && can('del') && !x.deleted && !x.ordered ? '<button type="button" class="p-x" data-p="odel" data-id="' + esc(x.id) + '" data-d="' + esc(x.date) + '" aria-label="' + esc('Remove ' + x.text) + '">Remove</button>' : '') + '</li>';
  }
  function ordGroups() {
    var map = {}, order = [];
    (S.ordAll || []).filter(function (x) { return !x.deleted && !x.ordered; }).sort(function (a, b) { return (a.addedAt || 0) - (b.addedAt || 0); }).forEach(function (x) {
      var k = okey(x.text); if (!k) return;
      if (!map[k]) { map[k] = { key: k, text: x.text, lines: [] }; order.push(k); }
      map[k].lines.push(x); map[k].text = x.text;
    });
    return order.map(function (k) { return map[k]; }).sort(function (a, b) { return a.text.localeCompare(b.text); });
  }
  function ordAllHTML() {
    if (S.ordBusy && !(S.ordAll || []).length) return '<p class="hint">Loading the last ' + ORD_DAYS + ' days...</p>';
    var gs = ordGroups();
    if (!gs.length) return '<p class="nb-empty">Nothing waiting to be ordered. Anything written in the last ' + ORD_DAYS + ' days has been ticked off.</p>';
    return '<p class="hint">' + gs.length + ' item' + (gs.length === 1 ? '' : 's') + ' still to order from the last ' + ORD_DAYS + ' days. Tick one to mark every line for it as ordered.</p><ul class="nb-rows">' + gs.map(function (g) {
      var first = g.lines[0];
      return '<li class="nb-row o-group"><button type="button" class="nb-box" data-p="ogroup" data-k2="' + esc(g.key) + '" aria-label="' + esc('Ordered: ' + g.text) + '">' + BOX + '</button>' +
        '<span class="nb-t">' + esc(g.text) + (g.lines.length > 1 ? ' <span class="o-n">x' + g.lines.length + '</span>' : '') +
        '<span class="o-who">' + g.lines.map(function (x) { return esc((x.qty ? x.qty + ' ' : '') + '(' + (x.addedBy || '?') + ', ' + dayShort(x.date) + ')'); }).join(' &middot; ') + '</span>' + recipeChips(first) + '</span></li>';
    }).join('') + '</ul>';
  }
  function dayShort(s) { return parseYmd(s).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }); }
  function loadOrdHist() {
    var today = ymd(new Date());
    if (!fb || S.ordHistBusy || S.ordHistFor === today) return;
    S.ordHistBusy = true;
    var dates = [], i; for (i = 1; i <= 14; i++) dates.push(shift(today, -i));
    Promise.all(dates.map(function (d) { return fb.fs.getDocs(ordCol(d)).then(function (sn) { return sn.docs.map(function (x) { var v = x.data(); v.date = d; return v; }); }, function () { return []; }); })).then(function (l) {
      S.ordHist = [].concat.apply([], l).filter(function (x) { return !x.deleted; }); S.ordHistFor = today; S.ordHistBusy = false; draw();
    });
  }
  function oRegsHTML() {
    if (!S.ordHist || S.ordDate !== ymd(new Date())) return '';
    var dn = new Date().getDay(), dname = new Date().toLocaleDateString('en-AU', { weekday: 'long' }), m = {}, have = {};
    (S.ordLines || []).forEach(function (x) { if (!x.deleted) have[okey(x.text)] = 1; });
    S.ordHist.forEach(function (x) {
      var k = okey(x.text); if (!k || have[k]) return;
      var e = m[k] = m[k] || { text: x.text, days: {}, q: {} };
      e.days[x.date] = 1;
      if (x.qty) e.q[x.qty] = (e.q[x.qty] || 0) + 1;
    });
    var list = Object.keys(m).map(function (k) {
      var e = m[k], same = Object.keys(e.days).filter(function (d) { return parseYmd(d).getDay() === dn; }).length, nd = Object.keys(e.days).length;
      return { text: e.text, same: same, nd: nd, q: Object.keys(e.q).sort(function (a, b) { return e.q[b] - e.q[a]; })[0] || '' };
    }).filter(function (e) { return e.same >= 2 || e.nd >= 5; }).sort(function (a, b) { return b.same - a.same || b.nd - a.nd; }).slice(0, 10);
    S.oregs = list;
    if (!list.length) return '';
    return '<div class="w-often"><span class="nb-ql">Usually ordered on a ' + esc(dname) + ' or often</span>' + list.map(function (e, i) { return '<button type="button" class="chip sq" data-p="oreg" data-i="' + i + '">' + esc(e.text) + (e.q ? ' <span class="nb-uq">' + esc(e.q) + '</span>' : '') + '</button>'; }).join('') + '</div>';
  }
  function ordersHTML() {
    if (can('add')) { loadOrdHist(); loadWRecent(false); }
    var p = me(), br = canBrowse(), view = br ? (S.ordView || 'day') : 'day', today = ymd(new Date());
    if (!br && S.ordDate !== today) { S.ordDate = today; watchOrders(); }
    if (view === 'all') loadOrdAll(false);
    var live = (S.ordLines || []).filter(function (x) { return !x.deleted; });
    var nOrd = live.filter(function (x) { return x.ordered; }).length;
    var tabs = br ? '<div class="nb-nav o-nav"><button type="button" class="chip" data-p="oview" data-v="day" aria-pressed="' + (view === 'day') + '">By day</button><button type="button" class="chip" data-p="oview" data-v="all" aria-pressed="' + (view === 'all') + '">Everything to order</button>' +
      (view === 'day' ? '<button type="button" class="chip" data-p="oday" data-d="-1" aria-label="Back one day">&lsaquo;</button><button type="button" class="chip" data-p="otoday" aria-pressed="' + (S.ordDate === today) + '">Today</button><button type="button" class="chip" data-p="oday" data-d="1" aria-label="Forward one day">&rsaquo;</button>' : '') + '</div>' : '';
    var add = can('add') && S.ordDate === today ?
      '<form class="nb-add" data-p-form="oadd"><div class="nb-add-row"><label class="visually-hidden" for="o-text">Item to order</label><input id="o-text" class="nb-in nb-in-text" data-k="o-text" autocomplete="off" placeholder="What do we need to order?" maxlength="120" value="' + esc(S.otext) + '">' +
      '<label class="visually-hidden" for="o-qty">Amount</label><input id="o-qty" class="nb-in nb-in-qty" data-k="o-qty" autocomplete="off" placeholder="Amount" maxlength="40" value="' + esc(S.oqty) + '"><button type="submit" class="nb-addbtn">Add</button></div>' +
      '<div class="nb-sugg" id="o-sugg">' + ordSuggHTML() + '</div><p class="nb-hint" id="o-hint" aria-live="polite">' + esc(oHintText(S.otext)) + '</p>' + oRegsHTML() + '</form>' : (S.ordDate === today ? '<p class="hint">You can read the order list but not write in it.</p>' : '');
    var body = view === 'all' ? ordAllHTML() :
      (S.ordState === 'error' ? '<p class="p-err">Could not load this page. Check the connection.</p>' :
        (live.length ? '<ul class="nb-rows">' + live.slice().sort(function (a, b) { return (a.ordered ? 1 : 0) - (b.ordered ? 1 : 0) || (a.addedAt || 0) - (b.addedAt || 0); }).map(ordRow).join('') + '</ul>' : (S.ordState === 'ok' ? '<p class="nb-empty">Nothing on the order list for ' + esc(dayName(S.ordDate).toLowerCase()) + ' yet.</p>' : '<p class="nb-empty">Loading...</p>')));
    return '<div class="nb-top"><span>' + (p ? 'Writing as <strong>' + esc(p.name) + '</strong>' : '') + '</span><span class="p-links"><a class="p-link" href="#/prep">Prep list</a>' + '' + '</span></div>' + tabs +
      '<section class="nb-page o-page"><header class="nb-ph"><div><h2 class="nb-title" id="rtitle" tabindex="-1">' + (view === 'all' ? 'To order' : 'Order list') + '</h2><span class="nb-date">' + (view === 'all' ? 'Across the last ' + ORD_DAYS + ' days' : esc(longDate(S.ordDate))) + '</span></div>' +
      (view === 'day' ? '<div class="nb-prog" role="status">' + nOrd + ' of ' + live.length + ' ordered</div>' : '') + '</header><div class="nb-body">' + body + '</div><div class="nb-foot">' + (view === 'day' ? add : '') + '</div></section>';
  }


  /* ---------- the wastage log ----------
     The Daily Wastage Sheet, on the phone: section, item, amount and unit, reason, what to do to stop it happening again,
     and who wrote it (time and name are added by themselves). The end-of-day review is saved per day and its
     "change for the next shift" shows on the next prep list. Staff add; the head chef and sous chefs can remove. */
  var UNITS = ['g', 'kg', 'L', 'portions', 'pieces'];
  var REASONS = [['prep', 'Prep waste'], ['expired', 'Expired stock'], ['fault', 'Cooking fault'], ['returned', 'Returned'], ['excess', 'Excess production']];
  function reasonName(k) { var r = REASONS.filter(function (x) { return x[0] === k; })[0]; return r ? r[1] : k; }
  function wCol(date) { return fb.fs.collection.apply(null, [fb.db].concat(base(), ['waste', date, 'lines'])); }
  function wRef(date, id) { return fb.fs.doc.apply(null, [fb.db].concat(base(), ['waste', date, 'lines', id])); }
  function wDay(date) { return fb.fs.doc.apply(null, [fb.db].concat(base(), ['waste', date])); }
  var unsubW = null, wKey = '';
  function watchWaste() {
    if (S.configState !== 'ok' || !fb) return;
    var key = S.pin + '|' + S.wDate;
    if (key === wKey && unsubW) return;
    if (unsubW) unsubW();
    wKey = key; S.wState = 'loading'; S.wReview = null; S.wrA = null; S.wrC = null;
    unsubW = fb.fs.onSnapshot(wCol(S.wDate), function (snap) {
      S.wLines = snap.docs.map(function (d) { var x = d.data(); x.id = d.id; x.date = S.wDate; return x; });
      S.wState = 'ok'; draw();
    }, function () { S.wState = 'error'; draw(); });
    var dd = S.wDate;
    fb.fs.getDoc(wDay(dd)).then(function (sn) { if (S.wDate === dd) { S.wReview = sn.exists() ? sn.data() : {}; draw(); } }, function () { S.wReview = {}; });
    loadWRecent(false);
  }
  function loadWRecent(force) {
    if (!fb || S.wRecentBusy || (S.wRecent && !force)) return;
    S.wRecentBusy = true;
    var today = ymd(new Date()), dates = [], i;
    for (i = 1; i <= 14; i++) dates.push(shift(today, -i));
    Promise.all(dates.map(function (d) { return fb.fs.getDocs(wCol(d)).then(function (sn) { return sn.docs.map(function (x) { var v = x.data(); v.date = d; return v; }); }, function () { return []; }); })).then(function (l) {
      S.wRecent = [].concat.apply([], l).filter(function (x) { return !x.deleted; }); S.wRecentBusy = false; draw();
    });
  }
  function wTotals(lines) {
    var t = { kg: 0, L: 0, portions: 0, pieces: 0 };
    lines.forEach(function (x) { var a = +x.amount || 0; if (x.unit === 'g') t.kg += a / 1000; else if (x.unit === 'kg') t.kg += a; else if (x.unit === 'L') t.L += a; else if (t[x.unit] != null) t[x.unit] += a; });
    return t;
  }
  function num(v) { return String(Math.round(v * 100) / 100); }
  function totalsText(t) {
    var out = [];
    if (t.kg) out.push(num(t.kg) + ' kg'); if (t.L) out.push(num(t.L) + ' L'); if (t.portions) out.push(num(t.portions) + ' portions'); if (t.pieces) out.push(num(t.pieces) + ' pieces');
    return out.join(', ');
  }
  function wSuggest() {
    var q = okey(S.wf.text); if (q.length < 2) return [];
    var seen = {}, out = [];
    function add(t) { var k = okey(t); if (k && !seen[k] && k !== q && (k.indexOf(q) === 0 || k.indexOf(' ' + q) >= 0)) { seen[k] = 1; out.push(t); } }
    (S.wRecent || []).forEach(function (x) { add(x.text); });
    S.learned.forEach(function (x) { if (!x.hidden && x.text) add(x.text); });
    D.recipes.forEach(function (r) { add(r.short || r.name); });
    var idx = ingIndex(); Object.keys(idx).forEach(function (k) { add(idx[k].name); });
    return out.slice(0, 6);
  }
  function wSuggHTML() {
    var l = wSuggest(); S.wsugg = l;
    return l.map(function (t, i) { return '<button type="button" class="chip sq nb-sg" data-p="wsugg" data-i="' + i + '">' + esc(t) + '</button>'; }).join('');
  }
  function wOften() {
    var m = {};
    (S.wRecent || []).forEach(function (x) {
      var k = okey(x.text); if (!k) return;
      var e = m[k] = m[k] || { text: x.text, n: 0, unit: {}, reason: {}, sec: {} };
      e.n++; e.unit[x.unit] = (e.unit[x.unit] || 0) + 1; e.reason[x.reason] = (e.reason[x.reason] || 0) + 1; if (x.station) e.sec[x.station] = (e.sec[x.station] || 0) + 1;
    });
    function top(o) { return Object.keys(o).sort(function (a, b) { return o[b] - o[a]; })[0] || ''; }
    return Object.keys(m).map(function (k) { var e = m[k]; return { text: e.text, n: e.n, unit: top(e.unit), reason: top(e.reason), sec: top(e.sec) }; })
      .filter(function (e) { return e.n >= 2; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 8);
  }
  function addWaste() {
    var f = S.wf, p = me();
    if (!can('add')) return;
    var t = (proofread(f.text.trim()).text || '').slice(0, 80), amt = parseFloat(String(f.amt).replace(',', '.'));
    if (!t) { toast('Write what was wasted.'); return; }
    if (!(amt > 0) || amt >= 100000) { toast('Write the amount as a number.'); return; }
    if (UNITS.indexOf(f.unit) < 0) { toast('Pick a unit.'); return; }
    if (!REASONS.some(function (r) { return r[0] === f.reason; })) { toast('Pick a reason.'); return; }
    var sec = cleanSection(f.sec), rm = matchRecipe(t), ref = fb.fs.doc(wCol(S.wDate));
    sset(ref, { text: t, amount: amt, unit: f.unit, reason: f.reason, action: f.act.trim().slice(0, 120), station: sec, recipe: rm ? rm.id : '',
      addedBy: p ? p.name : '', addedById: p ? p.id : '', addedAt: Date.now(), deleted: false }).catch(function () { toast('Could not save. Check the connection.'); });
    if (sec) noteSection(sec);
    S.wf = { text: '', amt: '', unit: f.unit, reason: '', sec: sec, act: '' };
    toast('Logged ' + t);
  }
  function removeWaste(date, id) {
    if (!canBrowse() || !can('del')) return;
    supd(wRef(date, id), { deleted: true, deletedBy: (me() || {}).name || '', deletedAt: Date.now() }).catch(function () { toast('Could not save. Check the connection.'); });
  }
  function saveReview() {
    if (!can('add')) return;
    var p = me(), r = S.wReview || {};
    var a = (S.wrA != null ? S.wrA : r.avoidable || '').trim().slice(0, 300), c = (S.wrC != null ? S.wrC : r.change || '').trim().slice(0, 300);
    sset(wDay(S.wDate), { avoidable: a, change: c, reviewBy: p ? p.name : '', reviewAt: Date.now() }, true).then(function () {
      S.wReview = { avoidable: a, change: c, reviewBy: p ? p.name : '', reviewAt: Date.now() }; S.wrA = S.wrC = null; toast('Review saved'); 
    }, function () { toast('Could not save. Check the connection.'); });
  }
  function wRow(x) {
    var del = canBrowse() && can('del') && !x.deleted;
    return '<li class="nb-row w-row' + (x.deleted ? ' is-removed' : '') + '"><span class="w-time">' + (x.addedAt ? clock(x.addedAt) : '') + (x.station ? '<br><span class="w-sec">' + esc(x.station) + '</span>' : '') + '</span>' +
      '<span class="nb-t"><strong>' + esc(x.text) + '</strong> <span class="w-amt">' + esc(num(+x.amount || 0) + ' ' + x.unit) + '</span> <span class="w-rs w-' + esc(x.reason) + '">' + esc(reasonName(x.reason)) + '</span>' +
      (x.action ? '<span class="w-act">' + esc(x.action) + '</span>' : '') + '</span><span class="nb-by">' + esc(x.addedBy || '') + '</span>' +
      (del ? '<button type="button" class="p-x" data-p="wdel" data-id="' + esc(x.id) + '" data-d="' + esc(x.date) + '" aria-label="' + esc('Remove ' + x.text) + '">Remove</button>' : '') + '</li>';
  }
  function wasteHTML() {
    var p = me(), br = canBrowse(), today = ymd(new Date());
    if (!br && S.wDate !== today) { S.wDate = today; watchWaste(); }
    var f = S.wf, live = (S.wLines || []).filter(function (x) { return !x.deleted; }).sort(function (a, b) { return (a.addedAt || 0) - (b.addedAt || 0); });
    var shown = (S.wLines || []).filter(function (x) { return br || !x.deleted; }).sort(function (a, b) { return (a.addedAt || 0) - (b.addedAt || 0); });
    var view = br ? (S.wView || 'day') : 'day';
    var nav = br ? '<div class="nb-nav o-nav"><button type="button" class="chip" data-p="wview" data-v="day" aria-pressed="' + (view === 'day') + '">By day</button><button type="button" class="chip" data-p="wview" data-v="week" aria-pressed="' + (view === 'week') + '">Last 7 days</button>' +
      (view === 'day' ? '<button type="button" class="chip" data-p="wday" data-d="-1" aria-label="Back one day">&lsaquo;</button><button type="button" class="chip" data-p="wtoday" aria-pressed="' + (S.wDate === today) + '">Today</button><button type="button" class="chip" data-p="wday" data-d="1" aria-label="Forward one day">&rsaquo;</button>' : '') + '</div>' : '';
    if (view === 'week') return '<div class="nb-top"><span>' + (p ? 'Writing as <strong>' + esc(p.name) + '</strong>' : '') + '</span><span class="p-links"><a class="p-link" href="#/prep">Prep list</a></span></div>' + nav + wasteWeekHTML();
    var often = wOften();
    var add = can('add') && S.wDate === today ?
      '<form class="nb-add w-add" data-p-form="wadd">' + (often.length ? '<div class="w-often"><span class="nb-ql">Logged often</span>' + often.map(function (e, i) { return '<button type="button" class="chip sq" data-p="woften" data-i="' + i + '">' + esc(e.text) + '</button>'; }).join('') + '</div>' : '') +
      '<datalist id="w-sections">' + suggestions().map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join('') + '</datalist>' +
      '<div class="nb-add-row"><label class="visually-hidden" for="w-sec">Section</label><input id="w-sec" class="nb-in nb-in-sec" data-k="w-sec" list="w-sections" autocomplete="off" placeholder="Section" maxlength="40" value="' + esc(f.sec) + '">' +
      '<label class="visually-hidden" for="w-text">Item</label><input id="w-text" class="nb-in nb-in-text" data-k="w-text" autocomplete="off" placeholder="What was wasted?" maxlength="80" value="' + esc(f.text) + '">' +
      '<label class="visually-hidden" for="w-amt">Amount</label><input id="w-amt" class="nb-in nb-in-qty" data-k="w-amt" inputmode="decimal" autocomplete="off" placeholder="Amount" maxlength="8" value="' + esc(f.amt) + '"></div>' +
      '<div class="nb-sugg" id="w-sugg">' + wSuggHTML() + '</div>' +
      '<div class="w-pick" role="group" aria-label="Unit"><span class="nb-ql">Unit</span>' + UNITS.map(function (u) { return '<button type="button" class="chip" data-p="wunit" data-v="' + u + '" aria-pressed="' + (f.unit === u) + '">' + u + '</button>'; }).join('') + '</div>' +
      '<div class="w-pick" role="group" aria-label="Reason"><span class="nb-ql">Reason</span>' + REASONS.map(function (r) { return '<button type="button" class="chip" data-p="wreason" data-v="' + r[0] + '" aria-pressed="' + (f.reason === r[0]) + '">' + r[1] + '</button>'; }).join('') + '</div>' +
      '<div class="nb-add-row"><label class="visually-hidden" for="w-act">Action or how to stop it happening again</label><input id="w-act" class="nb-in nb-in-text" data-k="w-act" autocomplete="off" placeholder="Action or how to stop it happening again (optional)" maxlength="120" value="' + esc(f.act) + '">' +
      '<button type="submit" class="nb-addbtn">Log it</button></div></form>' : (S.wDate === today ? '<p class="hint">You can read the wastage log but not write in it.</p>' : '');
    var r = S.wReview || {}, ra = S.wrA != null ? S.wrA : (r.avoidable || ''), rc = S.wrC != null ? S.wrC : (r.change || '');
    var review = '<section class="set-block w-review"><span class="label">End-of-day review</span>' +
      (can('add') ? '<div class="field"><label class="label" for="w-ra">Main avoidable waste today</label><textarea id="w-ra" class="w-ta" data-k="w-ra" maxlength="300" rows="2">' + esc(ra) + '</textarea></div>' +
        '<div class="field"><label class="label" for="w-rc">Prep or ordering change for the next shift</label><textarea id="w-rc" class="w-ta" data-k="w-rc" maxlength="300" rows="2">' + esc(rc) + '</textarea><span class="hint">This shows at the top of the next prep list.</span></div>' +
        '<div class="btn-row"><button type="button" class="btn dark" data-p="wreview">Save the review</button></div>' :
        '<p>' + esc(r.avoidable || 'Not written yet.') + '</p><p>' + esc(r.change || '') + '</p>') +
      (r.reviewBy ? '<span class="hint">Last saved by ' + esc(r.reviewBy) + (r.reviewAt ? ' at ' + clock(r.reviewAt) : '') + '.</span>' : '') + '</section>';
    var tot = totalsText(wTotals(live));
    var body = S.wState === 'error' ? '<p class="p-err">Could not load this page. Check the connection.</p>' :
      (shown.length ? '<ul class="nb-rows">' + shown.map(wRow).join('') + '</ul>' : (S.wState !== 'ok' ? '<p class="nb-empty">Loading...</p>' : '<p class="nb-empty">Nothing logged for ' + esc(dayName(S.wDate).toLowerCase()) + ' yet. Log waste when it happens: prep waste, expired stock, cooking faults, returns and excess production.</p>'));
    return '<div class="nb-top"><span>' + (p ? 'Writing as <strong>' + esc(p.name) + '</strong>' : '') + '</span><span class="p-links"><a class="p-link" href="#/prep">Prep list</a>' + '' + '</span></div>' + nav +
      '<section class="nb-page o-page"><header class="nb-ph"><div><h2 class="nb-title" id="rtitle" tabindex="-1">Wastage</h2><span class="nb-date">' + esc(longDate(S.wDate)) + (tot ? ' &middot; ' + esc(tot) : '') + '</span></div>' +
      '<div class="nb-prog" role="status">' + live.length + (live.length === 1 ? ' entry' : ' entries') + '</div></header>' +
      '<p class="w-rule">Write the actual amount and unit, not a dollar value. Unsafe food must never be reused to avoid logging waste.</p>' +
      '<div class="nb-body">' + body + '</div><div class="nb-foot">' + add + '</div></section>' + review;
  }
  /* The last 7 days on one page, grouped by day, for the head chef and sous chefs. */
  function wasteWeekHTML() {
    var today = ymd(new Date()), from = shift(today, -6);
    if (!S.wRecent && S.wRecentBusy) return '<p class="hint">Loading the last 7 days...</p>';
    var todayL = S.wDate === today ? (S.wLines || []).filter(function (x) { return !x.deleted; }) : [];
    var lines = todayL.concat((S.wRecent || []).filter(function (x) { return x.date >= from && x.date < today; }));
    var m = {}, r = {};
    lines.forEach(function (x) { var k = okey(x.text), e = m[k] = m[k] || { text: x.text, n: 0, l: [] }; e.n++; e.l.push(x); r[x.reason] = (r[x.reason] || 0) + 1; });
    var top = Object.keys(m).sort(function (a, b) { return m[b].n - m[a].n; }).slice(0, 5);
    var sum = '<div class="w-sum"><p><strong>' + lines.length + (lines.length === 1 ? ' entry' : ' entries') + '</strong>' + (lines.length ? ': ' + esc(totalsText(wTotals(lines))) : '') + '</p>' +
      (top.length ? '<p><span class="nb-ql">Most often</span> ' + top.map(function (k) { return esc(m[k].text) + ' <span class="nb-us">x' + m[k].n + ', ' + esc(totalsText(wTotals(m[k].l))) + '</span>'; }).join(' &middot; ') + '</p>' : '') +
      (lines.length ? '<p><span class="nb-ql">Reasons</span> ' + REASONS.filter(function (x) { return r[x[0]]; }).map(function (x) { return esc(x[1]) + ' ' + r[x[0]]; }).join(' &middot; ') + '</p>' : '') + '</div>';
    var days = [], i;
    for (i = 0; i < 7; i++) days.push(shift(today, -i));
    var body = days.map(function (d) {
      var l = lines.filter(function (x) { return x.date === d; }).sort(function (a, b) { return (a.addedAt || 0) - (b.addedAt || 0); });
      return '<div class="nb-hd"><span>' + esc(d === today ? 'Today' : dayShort(d)) + '</span><span>' + (l.length ? l.length + ' &middot; ' + esc(totalsText(wTotals(l))) : 'nothing logged') + '</span></div>' +
        (l.length ? '<ul class="nb-rows">' + l.map(wRow).join('') + '</ul>' : '');
    }).join('');
    return '<section class="nb-page o-page"><header class="nb-ph"><div><h2 class="nb-title" id="rtitle" tabindex="-1">Wastage</h2><span class="nb-date">Last 7 days</span></div><div class="nb-prog" role="status">' + lines.length + '</div></header>' +
      '<div class="nb-body">' + sum + body + '</div></section>';
  }
  /* Last night's "change for the next shift" note, shown on the prep list (the latest of the last 3 days). */
  function loadWNote() {
    var today = ymd(new Date());
    if (!fb || S.wNoteFor === today) return;
    S.wNoteFor = today;
    var ds = [1, 2, 3].map(function (k) { return shift(today, -k); });
    Promise.all(ds.map(function (d) { return fb.fs.getDoc(wDay(d)).then(function (sn) { return sn.exists() ? Object.assign({ date: d }, sn.data()) : null; }, function () { return null; }); })).then(function (l) {
      S.wNote = l.filter(function (x) { return x && x.change; })[0] || null; draw();
    });
  }
  function wNoteHTML() {
    var n = S.wNote; if (!n || S.date !== ymd(new Date())) return '';
    return '<div class="nb-flag"><span class="nb-sl">' + (n.date === shift(ymd(new Date()), -1) ? 'From yesterday\'s waste review' : 'From the ' + esc(parseYmd(n.date).toLocaleDateString('en-AU', { weekday: 'long' })) + ' waste review') + '</span><p>' + esc(n.change) + '</p>' + (n.reviewBy ? '<span class="nb-sw">' + esc(n.reviewBy) + '</span>' : '') + '</div>';
  }

  /* ---------- wastage insights (admin) ---------- */
  function loadWStats(force) {
    if (!fb || S.configState !== 'ok') return;
    if (S.wStats && (S.wStats.loading || !force)) return;
    S.wStats = { loading: true, lines: [], reviews: [] };
    var today = ymd(new Date()), dates = [], i;
    for (i = 0; i < 60; i++) dates.push(shift(today, -i));
    Promise.all(dates.map(function (d) {
      return Promise.all([
        fb.fs.getDocs(wCol(d)).then(function (sn) { return sn.docs.map(function (x) { var v = x.data(); v.date = d; return v; }); }, function () { return []; }),
        fb.fs.getDoc(wDay(d)).then(function (sn) { return sn.exists() ? Object.assign({ date: d }, sn.data()) : null; }, function () { return null; })
      ]);
    })).then(function (res) {
      S.wStats = { loading: false, lines: [].concat.apply([], res.map(function (r) { return r[0]; })), reviews: res.map(function (r) { return r[1]; }).filter(Boolean) }; draw();
    });
  }
  var WTIP = { excess: 'Prep smaller batches or less often.', expired: 'Order less or use it sooner. Check stock rotation.', fault: 'Check the method on the recipe card and run a quick refresher.', prep: 'Check trimming and yield.', returned: 'Check the dish against the recipe card and talk to front of house.' };
  function eachDay(n, lines, reviews) {
    var out = '', i, rv = {}; reviews.forEach(function (r) { rv[r.date] = r; });
    for (i = 0; i < n; i++) {
      var d = shift(ymd(new Date()), -i), l = lines.filter(function (x) { return x.date === d; }), r = rv[d];
      out += '<tr><th scope="row">' + esc(dayShort(d)) + '</th><td>' + (l.length || '<span class="o-who-i">none</span>') + '</td><td>' + esc(totalsText(wTotals(l))) + '</td><td>' + (r && (r.avoidable || r.change) ? esc((r.reviewBy || '') + ': ' + (r.change || r.avoidable)) : '<span class="o-who-i">not written</span>') + '</td></tr>';
    }
    return out;
  }
  /* Waste calendar: entries per day, darker is more. Days nobody logged anything are marked. */
  function wasteCalHTML(n, lines) {
    var today = ymd(new Date()), first = shift(today, -(n - 1)), start = first, i, by = {}, max = 0, inF = {};
    afDates(n, 0).forEach(function (d) { inF[d] = 1; });
    lines.forEach(function (x) { by[x.date] = (by[x.date] || []).concat([x]); });
    Object.keys(by).forEach(function (d) { max = Math.max(max, by[d].length); });
    while (parseYmd(start).getDay() !== 1) start = shift(start, -1);
    var rows = '', d = start;
    while (d <= today) {
      rows += '<tr>';
      for (i = 0; i < 7; i++) {
        if (d < first || d > today) rows += '<td class="cal-off"></td>';
        else if (!inF[d]) rows += '<td class="cal-x"><span class="cal-n">' + parseYmd(d).getDate() + '</span></td>';
        else { var l = by[d] || [], lv = !l.length ? 0 : Math.min(4, 1 + Math.floor(l.length / (max || 1) * 3.999));
          rows += '<td class="cal-c' + (l.length ? '' : ' cal-none') + '" style="background:' + SK[lv] + '" title="' + esc(dayShort(d) + ': ' + (l.length ? l.length + (l.length === 1 ? ' entry, ' : ' entries, ') + totalsText(wTotals(l)) : 'nothing logged')) + '"><span class="cal-n">' + parseYmd(d).getDate() + '</span><span class="cal-v">' + (l.length || '') + '</span></td>'; }
        d = shift(d, 1);
      }
      rows += '</tr>';
    }
    return '<h3 class="a-ch-h">Every day at a glance</h3><span class="hint">Entries per day. A blank day means nothing was logged, which may mean nobody logged it.</span>' +
      '<div class="a-tablewrap cal-wrap"><table class="a-table a-plain cal"><thead><tr>' + DOWN.map(function (x) { return '<th scope="col">' + x + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  /* Reasons by weekday: which kind of waste happens on which day. */
  function reasonDowHTML(lines, n) {
    var occ = {}, c = {}, max = 0;
    afDates(n, 0).forEach(function (d) { var dw = parseYmd(d).getDay(); occ[dw] = (occ[dw] || 0) + 1; });
    lines.forEach(function (x) { var k = x.reason + ':' + parseYmd(x.date).getDay(); c[k] = (c[k] || 0) + 1; });
    var rs = REASONS.filter(function (r) { return lines.some(function (x) { return x.reason === r[0]; }); });
    if (!rs.length) return '';
    rs.forEach(function (r) { DOW.forEach(function (d) { if (occ[d]) max = Math.max(max, (c[r[0] + ':' + d] || 0) / occ[d]); }); });
    return '<h3 class="a-ch-h">Reasons by weekday</h3><span class="hint">Average entries per day. Darker is more.</span><div class="a-tablewrap"><table class="a-table a-plain sk-t"><thead><tr><th scope="col">Reason</th>' + DOWN.map(function (x) { return '<th scope="col">' + x + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rs.map(function (r) { return '<tr><th scope="row">' + esc(r[1]) + '</th>' + DOW.map(function (d) { var v = occ[d] ? (c[r[0] + ':' + d] || 0) / occ[d] : 0, lv = !v ? 0 : Math.min(4, 1 + Math.floor(v / (max || 1) * 3.999)); return '<td class="sk-c" style="background:' + SK[lv] + '">' + (v ? Math.round(v * 10) / 10 : '<span class="sk-0">0</span>') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function wasteStatsHTML() {
    loadWStats(false); loadStats(false);
    var ws = S.wStats, n = S.statsRange;
    var chips = filtersHTML('waste') + filterNote('waste');
    var head = '<section class="set-block"><span class="label">Wastage</span><span class="hint">From the wastage log on the phones. Amounts are what people wrote, in kg, L, portions and pieces (grams are counted as kg).</span>' +
      '<div class="btn-row"><a class="btn dark" href="#/waste">Open the wastage log</a></div>' + chips;
    if (!ws || ws.loading) return head + '<p class="hint">Loading the last 60 days...</p></section>';
    var af = AF(), from = shift(ymd(new Date()), -(n - 1));
    function wfilter(off) { var ds = {}; afDates(n, off).forEach(function (d) { ds[d] = 1; }); return ws.lines.filter(function (x) { return !x.deleted && ds[x.date] && (!af.sec || (x.station || 'General') === af.sec) && (!af.reason || x.reason === af.reason); }); }
    var lines = wfilter(0), plines = wfilter(n);
    var days = {}; lines.forEach(function (x) { days[x.date] = 1; });
    var t = wTotals(lines), pt = wTotals(plines), nd = afDates(n, 0).length;
    var tiles = [[lines.length, lines.length === 1 ? 'entry' : 'entries', delta(lines.length, plines.length, n, true)], [num(t.kg), 'kg', delta(t.kg, pt.kg, n, true)], [num(t.L), 'L', delta(t.L, pt.L, n, true)], [num(t.portions), 'portions', delta(t.portions, pt.portions, n, true)], [num(t.pieces), 'pieces', delta(t.pieces, pt.pieces, n, true)], [Object.keys(days).length + ' of ' + nd, 'days with something logged', '']];
    if (!lines.length) return head + '<div class="a-tiles">' + tiles.map(tileHTML).join('') + '</div><p class="hint">Nothing logged in this time yet.</p></section>';
    var byR = {}; lines.forEach(function (x) { var e = byR[x.reason] = byR[x.reason] || []; e.push(x); });
    var rRows = REASONS.filter(function (r) { return byR[r[0]]; }).sort(function (a, b) { return byR[b[0]].length - byR[a[0]].length; }).map(function (r) {
      var l = byR[r[0]]; return '<tr><th scope="row">' + esc(r[1]) + '</th><td>' + l.length + '</td><td>' + Math.round(l.length / lines.length * 100) + '%</td><td>' + esc(totalsText(wTotals(l))) + '</td></tr>';
    }).join('');
    // link waste to the prep list: how often the same item was written on the prep list in the same time
    var prepN = {};
    if (S.stats && !S.stats.loading) Object.keys(S.stats.days).forEach(function (d) { if (d < from) return; S.stats.days[d].forEach(function (x) { if (!x.deleted && !x.rolled && x.text) { var k = okey(x.text); prepN[k] = (prepN[k] || 0) + 1; } }); });
    var m = {};
    lines.forEach(function (x) { var k = okey(x.text), e = m[k] = m[k] || { text: x.text, l: [], r: {} }; e.l.push(x); e.r[x.reason] = (e.r[x.reason] || 0) + 1; });
    var iRows = Object.keys(m).map(function (k) { return { k: k, e: m[k] }; }).sort(function (a, b) { return b.e.l.length - a.e.l.length; }).slice(0, 12).map(function (o) {
      var e = o.e, mr = Object.keys(e.r).sort(function (a, b) { return e.r[b] - e.r[a]; })[0], pn = prepN[o.k] || 0;
      var tip = (WTIP[mr] || '') + (mr === 'excess' && pn >= 3 ? ' It was on the prep list ' + pn + ' times.' : '');
      if (mr === 'fault' || mr === 'returned') { loadViews(false); var rid = (e.l.filter(function (x) { return x.recipe; })[0] || {}).recipe || ((matchRecipe(e.text) || {}).id || ''); if (rid && S.views) tip += ' Card opened ' + ((S.views[rid] || {}).n || 0) + ' times so far.'; }
      return '<tr><th scope="row">' + esc(e.text) + '</th><td>' + e.l.length + '</td><td>' + esc(totalsText(wTotals(e.l))) + '</td><td>' + esc(reasonName(mr)) + '</td><td>' + (pn || '') + '</td><td>' + (e.l.length >= 2 ? '<span class="a-flag">' + esc(tip) + '</span>' : '<span class="o-who-i">Once so far</span>') + '</td></tr>';
    }).join('');
    var dw = {}, occ = {}, i;
    for (i = 0; i < n; i++) { var dd = parseYmd(shift(ymd(new Date()), -i)).getDay(); occ[dd] = (occ[dd] || 0) + 1; }
    lines.forEach(function (x) { var d = parseYmd(x.date).getDay(); dw[d] = (dw[d] || 0) + 1; });
    var who = {}; lines.forEach(function (x) { var k = x.addedBy || 'Unknown'; who[k] = (who[k] || 0) + 1; });
    var revs = ws.reviews.filter(function (r) { return r.date >= from && (r.avoidable || r.change); }).sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 10);
    return head + '<div class="a-tiles">' + tiles.map(tileHTML).join('') + '</div>' + wasteCalHTML(n, lines) + reasonDowHTML(lines, n) +
      '<h3 class="a-ch-h">By reason</h3><div class="a-tablewrap"><table class="a-table a-plain"><thead><tr><th scope="col">Reason</th><th scope="col">Entries</th><th scope="col">Share</th><th scope="col">Amount</th></tr></thead><tbody>' + rRows + '</tbody></table></div>' +
      '<h3 class="a-ch-h">Wasted most often</h3><span class="hint">"On the prep list" counts how many times the same item was written on the prep list in this time, so you can see over-prepping.</span><div class="a-tablewrap"><table class="a-table a-plain"><thead><tr><th scope="col">Item</th><th scope="col">Entries</th><th scope="col">Amount</th><th scope="col">Main reason</th><th scope="col">On the prep list</th><th scope="col">Suggestion</th></tr></thead><tbody>' + iRows + '</tbody></table></div>' +
      '<h3 class="a-ch-h">Each day</h3>' + (n > 7 ? '<details class="a-details"><summary>Show all ' + n + ' days</summary>' : '') + '<div class="a-tablewrap"><table class="a-table a-plain"><thead><tr><th scope="col">Day</th><th scope="col">Entries</th><th scope="col">Amount</th><th scope="col">Review</th></tr></thead><tbody>' + eachDay(n, lines, ws.reviews) + '</tbody></table></div>' + (n > 7 ? '</details>' : '') +
      '<h3 class="a-ch-h">By weekday</h3><div class="a-tablewrap"><table class="a-table a-plain sk-t"><thead><tr><th scope="col"></th>' + DOWN.map(function (x) { return '<th scope="col">' + x + '</th>'; }).join('') + '</tr></thead><tbody><tr><th scope="row">Entries a day</th>' + DOW.map(function (d) { return '<td>' + (occ[d] ? num((dw[d] || 0) / occ[d]) : '0') + '</td>'; }).join('') + '</tr></tbody></table></div>' +
      '<h3 class="a-ch-h">Who logs waste</h3><span class="hint">A record, not a score: someone who never logs may just not know about the log.</span><div class="a-tablewrap"><table class="a-table a-plain"><thead><tr><th scope="col">Person</th><th scope="col">Entries</th></tr></thead><tbody>' + Object.keys(who).sort(function (a, b) { return who[b] - who[a]; }).map(function (k) { return '<tr><th scope="row">' + esc(k) + '</th><td>' + who[k] + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<h3 class="a-ch-h">End-of-day reviews</h3>' + (revs.length ? '<ul class="a-list">' + revs.map(function (r) { return '<li><strong>' + esc(dayShort(r.date)) + (r.reviewBy ? ', ' + esc(r.reviewBy) : '') + ':</strong> ' + esc(r.avoidable || '') + (r.change ? ' <em>Change: ' + esc(r.change) + '</em>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="hint">No reviews written in this time.</p>') + '</section>';
  }

  /* ---------- recipe searches that found nothing (queued by the recipe book, sent once someone is signed in) ---------- */
  var flushing = false;
  function flushMisses() {
    if (flushing || !fb || !S.authed || !S.who || !S.tok) return;
    var q; try { q = JSON.parse(localStorage.getItem('lk.miss') || '[]'); } catch (e) { q = []; }
    if (!q.length) return;
    flushing = true;
    var f = fb.fs, p = me();
    Promise.all(q.slice(0, 20).map(function (x) {
      var t = String(x.q || '').trim().slice(0, 60); if (!t) return null;
      return sset(docRef('misses', lkey(t).slice(0, 60)), { q: t, n: f.increment(1), last: x.at || Date.now(), lastBy: p ? p.name : '' }, true);
    })).then(function () { try { localStorage.setItem('lk.miss', JSON.stringify(q.slice(20))); } catch (e) {} flushing = false; }, function () { flushing = false; });
  }
  var flushingV = false;
  function flushViews() {
    if (flushingV || !fb || !S.authed || !S.who || !S.tok) return;
    var v; try { v = JSON.parse(localStorage.getItem('lk.views') || '{}'); } catch (e) { v = {}; }
    var ids = Object.keys(v).filter(function (id) { return recipeById(id); }).slice(0, 20);
    if (!ids.length) { if (Object.keys(v).length) lsSet('lk.views', '{}'); return; }
    flushingV = true;
    var f = fb.fs;
    Promise.all(ids.map(function (id) { var r = recipeById(id); return sset(docRef('views', id), { name: r.name.slice(0, 80), n: f.increment(Math.min(v[id], 500)), last: Date.now() }, true); })).then(function () {
      var cur; try { cur = JSON.parse(localStorage.getItem('lk.views') || '{}'); } catch (e) { cur = {}; }
      ids.forEach(function (id) { cur[id] = Math.max(0, (cur[id] || 0) - v[id]); if (!cur[id]) delete cur[id]; });
      Object.keys(cur).forEach(function (id) { if (!recipeById(id)) delete cur[id]; });
      lsSet('lk.views', JSON.stringify(cur)); flushingV = false;
    }, function () { flushingV = false; });
  }
  function loadViews(force) {
    if (!fb || S.configState !== 'ok' || S.viewBusy || (S.views && !force)) return;
    S.viewBusy = true;
    fb.fs.getDocs(colRef('views')).then(function (sn) { var m = {}; sn.docs.forEach(function (d) { m[d.id] = d.data(); }); S.views = m; S.viewBusy = false; draw(); }, function () { S.views = {}; S.viewBusy = false; });
  }
  function viewsHTML() {
    loadViews(false);
    if (!S.views) return '';
    var vm = S.views, ids = Object.keys(vm).filter(function (id) { return recipeById(id); }).sort(function (a, b) { return (vm[b].n || 0) - (vm[a].n || 0); });
    var dishes = D.recipes.filter(function (r) { return !vm[r.id]; });
    var total = 0; ids.forEach(function (id) { total += vm[id].n || 0; });
    return '<h3 class="a-ch-h">Recipe cards opened</h3><span class="hint">Counted on phones where someone is signed in to the prep book, no names. Cards nobody opens may need a walk-through with the team; cards opened a lot may need to be clearer or printed for the section.</span>' +
      (ids.length ? '<div class="a-tablewrap"><table class="a-table a-plain"><thead><tr><th scope="col">Card</th><th scope="col">Opened</th><th scope="col">Last</th></tr></thead><tbody>' + ids.slice(0, 15).map(function (id) {
        return '<tr><th scope="row"><a href="#/r/' + encodeURIComponent(id) + '">' + esc(recipeById(id).name) + '</a></th><td>' + (vm[id].n || 0) + '</td><td>' + esc(ago(vm[id].last)) + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="hint">' + total + ' opens counted so far.</p>' : '<p class="hint">No card opens counted yet.</p>') +
      (ids.length ? '<details class="a-details"><summary>Not opened yet (' + dishes.length + ' cards)</summary><p>' + dishes.map(function (r) { return esc(r.name); }).join(', ') + '</p></details>' : '');
  }
  function loadMisses(force) {
    if (!fb || S.configState !== 'ok' || S.missBusy || (S.misses && !force)) return;
    S.missBusy = true;
    fb.fs.getDocs(colRef('misses')).then(function (sn) { S.misses = sn.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }); S.missBusy = false; draw(); }, function () { S.misses = []; S.missBusy = false; });
  }
  function missesHTML() {
    loadMisses(false);
    var l = (S.misses || []).filter(function (x) { return !x.hidden && x.q; }).sort(function (a, b) { return (b.n || 0) - (a.n || 0) || (b.last || 0) - (a.last || 0); }).slice(0, 20);
    return '<h3 class="a-ch-h">Searched for, not in the book</h3><span class="hint">Recipe book searches that found nothing, sent from phones where someone is signed in to the prep book. These are the cards people are looking for. Hide one once the card is written.</span>' +
      (l.length ? '<div class="a-tablewrap"><table class="a-table a-plain"><thead><tr><th scope="col">Searched for</th><th scope="col">Times</th><th scope="col">Last</th><th scope="col"></th></tr></thead><tbody>' + l.map(function (x) {
        return '<tr><th scope="row">' + esc(x.q) + '</th><td>' + (x.n || 1) + '</td><td>' + esc(ago(x.last)) + (x.lastBy ? ', ' + esc(x.lastBy) : '') + '</td><td><button type="button" class="p-x" data-p="miss-hide" data-id="' + esc(x.id) + '">Hide</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="hint">No empty searches yet.</p>');
  }

  /* ---------- events ---------- */
  function onClick(e) {
    var el = e.target.closest('[data-p]');
    if (!el || !S.root || !S.root.contains(el)) return;
    var a = el.getAttribute('data-p'), id = el.getAttribute('data-id'), i = +el.getAttribute('data-i'), dt = el.getAttribute('data-d');
    if (el.tagName === 'SUMMARY') { S.recipeOpen = !S.recipeOpen; return; }
    if (a === 'pin-go') { var v = S.pinInput.trim(); if (!/^\d{4}$/.test(v)) { S.pinError = 'The kitchen PIN is 4 digits.'; draw(); return; } S.pin = v; S.pinError = ''; S.pinInput = ''; lsSet('lk.prep.pin', v); connect(); return; }
    if (a === 'pin-forget') { S.pin = ''; lsSet('lk.prep.pin', ''); S.config = null; S.configState = 'idle'; if (unsubCfg) unsubCfg(); if (unsubItems) unsubItems(); if (unsubSec) unsubSec(); if (unsubLrn) unsubLrn(); unsubCfg = unsubItems = unsubSec = unsubLrn = null; cfgKey = itemsKey = ''; draw(); return; }
    if (a === 'retry') { cfgKey = ''; connect(); return; }
    if (a === 'otick') { tickOrderLine(el.getAttribute('data-d'), id, el.getAttribute('aria-pressed') !== 'true'); return; }
    if (a === 'odel') { removeOrderLine(el.getAttribute('data-d'), id); return; }
    if (a === 'ogroup') { tickOrderGroup(el.getAttribute('data-k2')); return; }
    if (a === 'oview') { S.ordView = el.getAttribute('data-v'); if (S.ordView === 'all') loadOrdAll(true); draw(); return; }
    if (a === 'oday') { S.ordDate = shift(S.ordDate, +el.getAttribute('data-d')); watchOrders(); draw(); return; }
    if (a === 'otoday') { S.ordDate = ymd(new Date()); watchOrders(); draw(); return; }
    if (a === 'osugg') { var st = (S.osugg || [])[i]; if (st) { S.otext = st; draw(); var oe = S.root.querySelector('[data-k="o-text"]'); if (oe) { oe.focus(); try { oe.setSelectionRange(oe.value.length, oe.value.length); } catch (x) {} } } return; }
    if (a === 'who') { pickName(id); return; }
    if (a === 'who-change') { leave(); return; }
    if (a === 'day') { S.date = shift(S.date, +el.getAttribute('data-d')); S.tab = ''; watchItems(); draw(); return; }
    if (a === 'today') { S.date = ymd(new Date()); S.tab = ''; watchItems(); draw(); return; }
    if (a === 'tab') { S.tab = el.getAttribute('data-v') || ''; draw(); return; }
    if (a === 'tick') { tick(dt || S.date, id); return; }
    if (a === 'del') { removeItem(dt || S.date, id, false); return; }
    if (a === 'restore') { removeItem(dt || S.date, id, true); return; }
    if (a === 'removed') { S.showRemoved = !S.showRemoved; draw(); return; }
    if (a === 'urgent') { toggleUrgent(id); return; }
    if (a === 'toast-act') { var ta = S.toastAct; S.toast = ''; S.toastAct = null; if (ta && ta.fn) ta.fn(); draw(); return; }
    if (a === 'export') { exportAll(); return; }
    if (a === 'move-pin') { movePin(); return; }
    if (a === 'sugg') { pickSugg(i); return; }
    if (a === 'quick') { quickAdd(i); return; }
    if (a === 'heat') { S.heat = el.getAttribute('data-v'); draw(); return; }
    if (a === 'calm') { S.calM = el.getAttribute('data-v'); draw(); return; }
    if (a === 'hrm') { S.hrM = el.getAttribute('data-v'); draw(); return; }
    if (a === 'af-reset') { S.af = { sec: '', who: '', dow: '', reason: '' }; afSave(); draw(); return; }
    if (a === 'cal-day') { S.date = el.getAttribute('data-d'); S.tab = ''; watchItems(); location.hash = '#/prep'; return; }
    if (a === 'close-hide') { lsSet('lk.closeout', ymd(new Date())); draw(); return; }
    if (a === 'due') { var du = (S.due || [])[i]; if (du && can('add')) { var rmd = matchRecipe(du.text), uqd = usualQty(du.text); newItem({ text: du.text.slice(0, 160), station: du.sec, recipe: rmd ? rmd.id : '', qty: uqd }).catch(function () { toast('Could not save. Check the connection.'); }); noteSection(du.sec); bump({ added: 1, lastAdded: Date.now() }); learn(du.text, du.sec, 'pick', uqd); } return; }
    if (a === 'stuck-urgent') { toggleUrgent(id); return; }
    if (a === 'oreg') { var orr = (S.oregs || [])[i]; if (orr) { S.otext = orr.text; S.oqty = orr.q || ''; addOrder(); } return; }
    if (a === 'wview') { S.wView = el.getAttribute('data-v'); if (S.wView === 'week') loadWRecent(true); draw(); return; }
    if (a === 'wunit') { S.wf.unit = el.getAttribute('data-v'); draw(); return; }
    if (a === 'wreason') { S.wf.reason = el.getAttribute('data-v'); draw(); return; }
    if (a === 'wsugg') { var wt = (S.wsugg || [])[i]; if (wt) { S.wf.text = wt; draw(); var wa = S.root.querySelector('[data-k="w-amt"]'); if (wa) wa.focus(); } return; }
    if (a === 'woften') { var wo = wOften()[i]; if (wo) { S.wf.text = wo.text; if (wo.unit) S.wf.unit = wo.unit; if (wo.reason) S.wf.reason = wo.reason; if (wo.sec && !S.wf.sec) S.wf.sec = wo.sec; draw(); var wa2 = S.root.querySelector('[data-k="w-amt"]'); if (wa2) wa2.focus(); } return; }
    if (a === 'wdel') { removeWaste(dt, id); return; }
    if (a === 'wday') { S.wDate = shift(S.wDate, +el.getAttribute('data-d')); watchWaste(); draw(); return; }
    if (a === 'wtoday') { S.wDate = ymd(new Date()); watchWaste(); draw(); return; }
    if (a === 'wreview') { saveReview(); return; }
    if (a === 'w-refresh') { loadWStats(true); loadStats(true); draw(); return; }
    if (a === 'miss-hide') { sset(docRef('misses', id), { hidden: true, q: ((S.misses || []).filter(function (x) { return x.id === id; })[0] || {}).q || id }, true).then(function () { loadMisses(true); }, function () { toast('Could not save. Check the connection.'); }); return; }
    if (a === 'qset') { S.qty = el.getAttribute('data-v') || ''; draw(); var tq = S.root.querySelector('[data-k="p-text"]'); if (tq) tq.focus(); return; }
    if (a === 'goto') { gotoRow(id); return; }
    if (a === 'learn-hide') { hideLearned(id, el.getAttribute('data-hide') === '1'); return; }
    if (a === 'copy') { copyList(); return; }
    if (a === 'print') { window.print(); return; }
    if (a === 'a-tab') { S.atab = el.getAttribute('data-t'); lsSet('lk.prep.atab', S.atab); draw(); window.scrollTo(0, 0); return; }
    if (a === 'staff-open') { if (isSous()) { startDraft(); S.staffOpen = true; draw(); } return; }
    if (a === 'staff-close') { S.staffOpen = false; S.draft = null; draw(); return; }
    if (a === 'add-recipe') { addRecipe(id); return; }
    if (a === 'signin') { signIn(); return; }
    if (a === 'signout') { signOut(); draw(); return; }
    if (a === 'sec-hide') { hideSection(id, el.getAttribute('data-hide') === '1'); return; }
    if (a === 'a-reset-pin') { resetPin(id); return; }
    if (a === 'range') { S.statsRange = +el.getAttribute('data-v'); draw(); return; }
    if (a === 'stats-refresh') { loadStats(true); draw(); return; }
    if (!S.draft) return;
    var d = S.draft;
    if (a === 'a-add-person') { d.people.push({ id: slug('person') + '-' + Date.now().toString(36), name: '', role: 'staff', add: true, tick: true, del: false, active: true, isNew: true }); draw(); var n = S.root.querySelector('[data-k="a-n' + (d.people.length - 1) + '"]'); if (n) n.focus(); return; }
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
    if (k === 'p-pin') { S.pinInput = el.value.replace(/\D/g, '').slice(0, 4); el.value = S.pinInput; pinCells(el); return; }
    if (k === 'a-newpin') { S.newPin = el.value.replace(/\D/g, '').slice(0, 4); el.value = S.newPin; return; }
    if (k === 'pf1') { S.pf1 = el.value.replace(/\D/g, '').slice(0, 4); el.value = S.pf1; pinCells(el); return; }
    if (k === 'pf2') { S.pf2 = el.value.replace(/\D/g, '').slice(0, 4); el.value = S.pf2; pinCells(el); return; }
    if (k === 'p-text') { S.text = el.value; var hn = S.root.querySelector('#p-hint'); if (hn) hn.textContent = hintText(S.text); var sg = S.root.querySelector('#p-sugg'); if (sg) sg.innerHTML = suggestHTML(); var qs = S.root.querySelector('#p-qsugg'); if (qs) qs.innerHTML = qtyChipsHTML(); return; }
    if (k === 'o-text') { S.otext = el.value; var og = S.root.querySelector('#o-sugg'); if (og) og.innerHTML = ordSuggHTML(); var oh = S.root.querySelector('#o-hint'); if (oh) oh.textContent = oHintText(S.otext); return; }
    if (k === 'o-qty') { S.oqty = el.value; return; }
    if (k === 'w-text') { S.wf.text = el.value; var wg = S.root.querySelector('#w-sugg'); if (wg) wg.innerHTML = wSuggHTML(); return; }
    if (k === 'w-amt') { S.wf.amt = el.value.replace(/[^0-9.,]/g, ''); if (el.value !== S.wf.amt) el.value = S.wf.amt; return; }
    if (k === 'w-sec') { S.wf.sec = el.value; return; }
    if (k === 'w-act') { S.wf.act = el.value; return; }
    if (k === 'w-ra') { S.wrA = el.value; return; }
    if (k === 'w-rc') { S.wrC = el.value; return; }
    if (k === 'p-qty') { S.qty = el.value; var qs2 = S.root.querySelector('#p-qsugg'); if (qs2) qs2.innerHTML = qtyChipsHTML(); return; }
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
    if (k === 'af-sec' || k === 'af-who' || k === 'af-dow' || k === 'af-reason') { AF()[k.slice(3)] = el.value; afSave(); draw(); return; }
    var a = el.getAttribute && el.getAttribute('data-a');
    if (!a || !S.draft) return;
    if (a === 'badges') { S.draft.showBadges = el.checked; return; }
    var i = +el.getAttribute('data-i'), p = S.draft.people[i];
    if (a === 'role') { p.role = el.value; var r = ROLES[el.value]; p.add = r.add; p.tick = r.tick; p.del = r.del; draw(); }
    else if (a === 'perm') { p[el.getAttribute('data-perm')] = el.checked; }
    else if (a === 'active') { p.active = el.checked; draw(); }
  }
  function onSubmit(e) {
    var f = e.target.getAttribute && e.target.getAttribute('data-p-form');
    if (f === 'add') { e.preventDefault(); addTyped(); }
    else if (f === 'oadd') { e.preventDefault(); addOrder(); }
    else if (f === 'wadd') { e.preventDefault(); addWaste(); }
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
      if (S.pin) { connect(); if (name === 'admin') sdk(); if (name === 'orders') { S.ordDate = ymd(new Date()); watchOrders(); } if (name === 'waste') { S.wDate = ymd(new Date()); watchWaste(); } }
    },
    warm: function () { if (S.pin && S.configState !== 'ok' && S.configState !== 'loading') connect(); },
    saveConfig: saveConfig,
    proofread: proofread,
    state: S
  };
})();
