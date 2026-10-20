/*
  Leichhardt Kitchen prep book: prep list, order list, wastage log, shift pings, meeting minutes, guides and the admin panel.
  Staff add and tick on any phone. Everything syncs through Firebase (Cloud Firestore, free plan).

  Pages:   #/prep     the daily prep list         #/orders   the order list       #/waste   the wastage log
           #/minutes  meeting minutes to sign     #/admin    admin panel, Google sign-in for the head chef only
           #/guides   how-to guides (the head chef uploads them in the admin panel's Guides tab)
           #/mail     kitchen mail: write to the head chef (from the chef mark in the top bar)
           #/drinks   the drinks run: everyone's usual coffee or drink (from the chef mark in the top bar)

  Data (the kitchen PIN is part of the path, so only people who know it can reach the data):
    kitchens/<PIN>/config/main                 { people: [...] }                    read by staff, written by the admin only
    kitchens/<PIN>/days/<YYYY-MM-DD>/items/<id> one prep item per document (removed items are only flagged, never erased)
    kitchens/<PIN>/staffpins/<personId>        { hash }   each person's own PIN (hashed). Nobody can read it; the rules compare it on every write
    kitchens/<PIN>/pinset/<personId>           { at }   only says that a PIN has been chosen
    kitchens/<PIN>/proofs/<personId>           { tok, at } write only: sent with each write so the rules can check the writer's PIN (at = server time, so an old proof cannot be reused)
    kitchens/<PIN>/activity/<personId>         { name, added, ticked, visits, lastSeen }   tallies shown in the admin panel
    kitchens/<PIN>/sections/<slug>             { name, uses, lastUsed }   sections people have written, offered as suggestions
    kitchens/<PIN>/orders/<date>/lines/<id>    one order line (rolls over until ordered)
    kitchens/<PIN>/waste/<date>, .../lines/<id> the end-of-day waste review, and one wastage entry each
    kitchens/<PIN>/notes/<id>, .../seen/<id>   shift pings and who has seen them
    kitchens/<PIN>/minutes/<id>, .../hist, .../signs   meeting minutes, earlier versions and sign-offs
    kitchens/<PIN>/learned/<item>, ordlearned/<item>   what the prep and order lists have learned
    kitchens/<PIN>/learnlog/<id>               days already learned (create only)
    kitchens/<PIN>/misses/<slug>, views/<id>   recipe searches that found nothing, and card opens
    kitchens/<PIN>/guides/<id>, .../pages/<n>   how-to guides, and each page as a picture (see the guides section)
    kitchens/<PIN>/mail/<id>, mailstat/<id>    kitchen mail to the head chef (only the head chef reads it), and its seen and done
    kitchens/<PIN>/drinks/<personId>           each person's usual coffee or drink, for the drinks run (written only by that person)

  Who is allowed to add, tick or remove is set in the admin panel. Those permissions guide the page. The security
  rules in the Firebase console are what really lock the data: the kitchen PIN to read, a person's own PIN to write,
  the admin's Google account for settings.
*/
(function () {
  'use strict';

  var FB = window.LK_FIREBASE, D = window.LK_DATA || { recipes: [] };
  var SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
  /* head: the head chef's own name on the list. Only the head chef's Google account can give it (config/main headId),
     and that person always has every permission and the sous chef pages on any device, whatever the list says. */
  var ROLES = {
    head: { name: 'Head chef', add: true, tick: true, del: true, ping: true },
    lead: { name: 'Lead', add: true, tick: true, del: true, ping: false },
    sous: { name: 'Sous chef', add: true, tick: true, del: true, ping: true },
    staff: { name: 'Staff', add: true, tick: true, del: false, ping: false },
    view: { name: 'View only', add: false, tick: false, del: false, ping: false }
  };

  /* ---------- small helpers ---------- */
  var LS = (function () { try { localStorage.getItem('x'); return localStorage; } catch (e) { return null; } })();
  function lsGet(k) { try { return LS ? LS.getItem(k) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { if (LS) { if (v == null || v === '') LS.removeItem(k); else LS.setItem(k, v); } } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  /* Time is the server's, in kitchen time (LK_TIME in index.html). now() is for anything saved on a line or compared with
     a saved time; dayNow() is the kitchen's date. Date.now() is only for time passing on this phone (timers, the lock). */
  var T = window.LK_TIME;
  function now() { return T.now(); }
  function dayNow() { return T.day(); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0); }
  function shift(s, days) { var d = parseYmd(s); d.setDate(d.getDate() + days); return ymd(d); }
  function dayName(s) {
    var t = dayNow();
    if (s === t) return 'Today';
    if (s === shift(t, -1)) return 'Yesterday';
    if (s === shift(t, 1)) return 'Tomorrow';
    return parseYmd(s).toLocaleDateString('en-AU', { weekday: 'long' });
  }
  function longDate(s) { return parseYmd(s).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function clock(ms) { return T.clock(ms); }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'person'; }

    /* ---------- state ---------- */
  var S = {
    name: 'prep', root: null,
    pin: lsGet('lk.prep.pin') || '', pinInput: '', pinError: '',
    who: lsGet('lk.prep.who') || '',
    date: dayNow(),
    config: null, configState: 'idle',   // idle, loading, ok, badpin, error
    items: [], itemsState: 'idle', showRemoved: false,
    section: '', text: '', qty: '', recipeSearch: '', recipeOpen: false, recipeAll: false, tab: '',
    authed: false, tok: '', pinStep: '', pinData: null, pf1: '', pf2: '', pinMsg: '',
    sections: [], activity: [], hideDone: false, rolledFor: '', learned: [], pickedText: '', staffOpen: false, exporting: '', moving: false, moveMsg: '', newPin: '', atab: lsGet('lk.prep.atab') || 'insights', ordDate: dayNow(), ordLines: [], ordState: 'idle', ordView: 'day', otext: '', oqty: '', ordAll: [], ordAllAt: 0, ordBusy: false, osugg: [],
    retryAt: {}, wDate: dayNow(), wLines: [], wState: 'idle', wReview: null, wrA: null, wrC: null, wf: { text: '', amt: '', unit: 'kg', reason: '', sec: '', act: '' }, wRecent: null, wsugg: [], wNote: null, wNoteFor: '', wStats: null, misses: null, heat: 'w', hist: {}, notes: null, notesFor: '', notesAt: 0, notesBusy: false, notesOpen: false, nf: null, nMsg: '', nSaving: false,
    mins: null, minsFor: '', minsAt: 0, minsBusy: false, mmine: {}, msigns: {}, mSel: '', mf: null, mMsg: '', mSaving: false, mSigning: false, mpin: '', mpinOk: false, minOpen: false, mErr: '',
    guides: null, guidesFor: '', guidesAt: 0, gBusy: false, gRetry: 0, gq: '', gcat: 'all', gSel: '', gf: null, gfSnap: '', gMsg: '',
    adminsFor: '', level: '', stats: null, statsRange: 14, week: null, weekAt: 0, weekBusy: false,
    user: null, authState: 'idle', draft: null, saveMsg: '', busy: false, toast: '', toastAct: null
  };
  var fb = null, sdkP = null, unsubCfg = null, unsubItems = null, unsubSec = null, unsubAct = null, unsubLrn = null;
  var itemsKey = '', cfgKey = '', toastTimer = null, resumed = false;

  /* ---------- Firebase (loaded only when the prep pages are opened) ---------- */
  /* Firestore keeps an offline copy in the browser. Now and then that copy breaks ("INTERNAL ASSERTION FAILED",
     canonifyTarget) and the prep pages hang on Loading with no names. The data on the server is fine, so the phone
     throws its copy away and reloads, at most once a day (lk.fsheal) so it can never loop. */
  function healCache() {
    if (lsGet('lk.fsheal') === dayNow()) return;
    lsSet('lk.fsheal', dayNow());
    try { Object.keys(LS || {}).forEach(function (k) { if (/^firestore_/.test(k)) LS.removeItem(k); }); } catch (e) {}
    var stop = fb ? fb.fs.terminate(fb.db).catch(function () {}) : Promise.resolve();
    stop.then(function () { return indexedDB.databases ? indexedDB.databases() : [{ name: 'firestore/[DEFAULT]/' + FB.projectId + '/main' }]; }).then(function (dbs) {
      return Promise.all(dbs.filter(function (d) { return /^firestore\//.test(d.name); }).map(function (d) {
        return new Promise(function (ok) { var q = indexedDB.deleteDatabase(d.name); q.onsuccess = q.onerror = q.onblocked = function () { ok(); }; });
      }));
    }).catch(function () {}).then(function () { location.reload(); });
  }
  function brokenCache(x) { var s = x ? String(x.stack || x.message || x) : ''; return /FIRESTORE[^\n]*INTERNAL ASSERTION FAILED|canonifyTarget|IndexedDbTargetCache/.test(s); }
  window.addEventListener('error', function (e) { if (brokenCache(e.error || e.message)) healCache(); });
  window.addEventListener('unhandledrejection', function (e) { if (brokenCache(e.reason)) healCache(); });
  function sdk() {
    if (sdkP) return sdkP;
    // App Check: Fraud Defense (reCAPTCHA Enterprise, appCheckEnterpriseKey) or the older reCAPTCHA v3 (appCheckKey)
    var ack = FB.appCheckEnterpriseKey || FB.appCheckKey;
    sdkP = Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-firestore.js'), import(SDK + 'firebase-auth.js'), ack ? import(SDK + 'firebase-app-check.js') : Promise.resolve(null)]).then(function (m) {
      var app = m[0].initializeApp(FB), fs = m[1], au = m[2], db;
      if (ack && m[3]) { try { m[3].initializeAppCheck(app, { provider: FB.appCheckEnterpriseKey ? new m[3].ReCaptchaEnterpriseProvider(FB.appCheckEnterpriseKey) : new m[3].ReCaptchaV3Provider(FB.appCheckKey), isTokenAutoRefreshEnabled: true }); } catch (e) {} }
      try { db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) }); }
      catch (e) { db = fs.getFirestore(app); }
      var auth = au.getAuth(app);
      fb = { app: app, fs: fs, au: au, db: db, auth: auth };
      au.onAuthStateChanged(auth, function (u) { S.user = u; S.authState = 'ready'; if (!u) admMark(false); featSync(); loadAdmins(); draw(); });
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
    // still Loading after 25 s while online: most likely a broken offline copy (see healCache)
    setTimeout(function () { if (S.configState === 'loading' && navigator.onLine !== false) healCache(); }, 25000);
    sdk().then(function () {
      if (unsubCfg) unsubCfg();
      cfgKey = S.pin;
      unsubCfg = fb.fs.onSnapshot(cfgDoc(), function (snap) {
        S.config = snap.exists() ? snap.data() : { people: [] };
        S.config.people = S.config.people || [];
        headFix(S.config);
        S.configState = 'ok'; featSync(); refreshDraft(); watchItems(); watchSections(); watchLearned(); if (S.name === 'orders') watchOrders(); if (S.name === 'waste') watchWaste(); resume(); loadAdmins(); loadNotes(); loadMinutes(); draw();
        if (whoHead() !== headSeen) whoSync();   // the Head chef role was given or taken while this person is signed in
      }, function (err) {
        S.configState = err && err.code === 'permission-denied' ? 'badpin' : 'error';
        if (S.configState === 'badpin') { S.pinError = 'That PIN is not right.'; S.pin = ''; lsSet('lk.prep.pin', ''); cfgKey = ''; unsubCfg = null; gForget(); }
        draw();
      });
    }, function () { S.configState = 'error'; draw(); });
  }
  var unsubOrd = null, ordKey = '';
  var unsubW = null, wKey = '';
  /* Stops every live listener (kitchen PIN forgotten or moved), so nothing keeps reading the old PIN. */
  function stopLive() {
    [unsubCfg, unsubItems, unsubSec, unsubLrn, unsubAct, unsubOrd, unsubW].forEach(function (u) { if (u) u(); });
    unsubCfg = unsubItems = unsubSec = unsubLrn = unsubAct = unsubOrd = unsubW = null; cfgKey = itemsKey = ordKey = wKey = '';
  }
  function watchItems() {
    if (S.configState !== 'ok' || !fb) return;
    var key = S.pin + '|' + S.date;
    if (key === itemsKey && unsubItems) return;
    if (unsubItems) unsubItems();
    itemsKey = key; S.itemsState = 'loading';
    unsubItems = fb.fs.onSnapshot(itemsCol(S.date), { includeMetadataChanges: true }, function (snap) {
      S.items = snap.docs.map(function (d) { var x = d.data(); x.id = d.id; x._unsent = !!(d.metadata && d.metadata.hasPendingWrites); return x; });
      S.itemsState = 'ok'; draw();
    }, function () { S.itemsState = 'error'; draw(); });
  }
  /* What the prep list learned, for suggestions, Quick add and the Learning tab: the 500 most used items. The collection
     gains a record for every distinct line ever written and nothing prunes it, so the listener is bounded here (the
     order list's copy is bounded the same way, at 300). */
  var LEARN_N = 500;
  function watchLearned() {
    if (unsubLrn || !fb) return;
    unsubLrn = fb.fs.onSnapshot(fb.fs.query(colRef('learned'), fb.fs.orderBy('uses', 'desc'), fb.fs.limit(LEARN_N)), function (snap) {
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
  function can(what) { if (guest()) return what === 'add' || what === 'tick'; var p = me(); return !!(p && p[what]); }
  /* ---------- new pages the head chef can hold back from staff ----------
     Guides, Shift pings and Meeting minutes always show for the head chef, sous chefs and leads (and pings for anyone
     ticked for Pings). Staff and View only see each one unless the head chef unticks it under New pages in the People
     tab (config/main staffSee, missing means shown). It only hides the links and skips the reads: it is not a lock.
     What this phone may see is kept in lk.feat, so the landing page and the top bar are right before the book connects. */
  var FEATS = [['guides', 'Guides'], ['pings', 'Shift pings'], ['minutes', 'Meeting minutes']];
  var featHave = (function () { try { return JSON.parse(lsGet('lk.feat') || 'null') || {}; } catch (e) { return {}; } })();
  /* Marks this phone or computer as the head chef's (lk.admin) once the owner probe has passed, and clears the mark on sign out
     or when the probe fails. js/app.js listens for lk-admin to show or drop the key button in the top bar. */
  function admMark(on) {
    var was = lsGet('lk.admin') === '1';
    lsSet('lk.admin', on ? '1' : '');
    if (was !== !!on) { try { window.dispatchEvent(new Event('lk-admin')); } catch (e) {} }
  }
  /* the head chef's own device: the owner probe has passed on it (lk.admin), or is passing now. A Google account that is not the
     head chef's does not count, so held-back pages stay held back and the admin links stay hidden on that phone. */
  function admDev() { return S.level === 'owner' || (S.level !== 'none' && lsGet('lk.admin') === '1'); }
  function featCalc(k) {
    var p = who();
    return admDev() || (S.config.staffSee || {})[k] !== false || !!(p && (isSousP(p) || p.role === 'lead' || (k === 'pings' && canPingP(p))));
  }
  function featOn(k) { return S.configState === 'ok' && S.config ? featCalc(k) : admDev() || featHave[k] !== false; }
  /* run when the staff list, the person on this phone or the Google sign-in changes */
  function featSync() {
    if (S.configState !== 'ok' || !S.config) return;
    var got = {}, was = featHave;
    FEATS.forEach(function (f) { got[f[0]] = featCalc(f[0]); });
    if (JSON.stringify(got) === JSON.stringify(was)) return;
    featHave = got; lsSet('lk.feat', JSON.stringify(got));
    if (got.guides && was.guides === false) loadGuides();
    if (got.pings && was.pings === false) loadNotes();
    if (got.minutes && was.minutes === false) loadMinutes();
    if (!got.pings && npop && npop.getAttribute('data-pv') !== '1') noteClose(true);
    noteBell(); minCard();
    try { window.dispatchEvent(new Event('lk-feat')); } catch (e) {}
  }
  function notYetHTML(fk) {
    var t = fk === 'guides' ? 'Guides' : 'Meeting minutes';
    return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">' + t + '</h2><p class="hint">' + t + ' are not open to everyone yet. The head chef decides when.</p>' +
      (who() ? '' : '<p class="hint">Lead or sous chef? <a href="#/prep">Sign in on the prep list</a> first, then come back.</p>') + '<div class="btn-row"><a class="btn dark" href="#/">Back to the start</a></div></section>';
  }
  /* A new toast never wipes an Undo that is still showing: that one moves up a row and stays for 6 more seconds, so two
     quick taps in a row (remove, then tick) can both be undone. At most two show. */
  var toastOldTimer;
  function toast(msg, act, ms) {
    if (S.toast && S.toastAct && S.toastAct !== act) { S.toastOld = { msg: S.toast, act: S.toastAct }; clearTimeout(toastOldTimer); toastOldTimer = setTimeout(function () { S.toastOld = null; draw(); }, 6000); }
    S.toast = msg; S.toastAct = act || null; draw(); clearTimeout(toastTimer); toastTimer = setTimeout(function () { S.toast = ''; S.toastAct = null; draw(); }, ms || (act ? 9000 : 3500));
  }
  /* A write the server refused or could not take. Whatever was typed goes back in its box (restore). Refused
     (permission-denied) is one of two things: this phone's PIN no longer counts (the head chef reset it), so the
     person signs in again; or the PIN is fine and the rules did not allow that write for this person (a right the
     page shows but the rules do not give, or rules published behind the code), where signing in again would only
     loop. One small write any PIN holder may make (their own activity record) tells the two apart.
     Other errors stay up for 12 seconds with an OK button, so nobody misses them. */
  function failed(e, restore) {
    if (typeof restore === 'function') restore();
    if (e && e.code === 'permission-denied' && S.authed && S.who && S.name !== 'admin') {
      var p = who(), kept = typeof restore === 'function' ? ' What you wrote is still in the box.' : '';
      toast('Not saved. Checking your PIN...', null, 12000);
      sset(docRef('activity', S.who), { name: p ? p.name : '', lastSeen: now() }, true).then(function () {
        toast('Not saved: the book\'s rules did not allow that for you. Ask the head chef.' + kept, { label: 'OK', fn: function () {} }, 12000);
      }, function () {
        pickName(S.who);
        toast('Not saved: sign in again with your PIN.' + kept, { label: 'OK', fn: function () {} }, 12000);
      });
      return;
    }
    toast('Not saved. Check the connection and try again.', { label: 'OK', fn: function () {} }, 12000);
  }
  /* Writes still waiting for the server. With no signal Firestore keeps them on the phone and sends them later, so the
     page looks saved when nobody else can see the change yet. This count (and the browser's online flag) drives the
     strip at the top of the prep pages. No reads, no polling. */
  var pending = 0, pendSince = 0, offline = navigator.onLine === false, lastSync = '';
  function track(pr) {
    pending++; if (pending === 1) pendSince = Date.now();
    setTimeout(syncDraw, 3100);
    var done = function () { pending = Math.max(0, pending - 1); syncDraw(); };
    pr.then(done, done);
    return pr;
  }
  function syncState() { return offline ? 'off' : (pending && Date.now() - pendSince > 3000 ? 'wait' : ''); }
  function syncDraw() { var st = syncState(); if (st !== lastSync) { lastSync = st; draw(); } }
  window.addEventListener('online', function () { offline = false; syncDraw(); });
  window.addEventListener('offline', function () { offline = true; syncDraw(); });
  function syncHTML() {
    var st = syncState();
    if (!st || !S.pin || !S.authed) return '';
    return '<div class="p-sync" role="status">' + (st === 'off' ? '<strong>No signal.</strong> What you write is kept on this device and sent when the signal is back. Lines marked Not sent are waiting.' :
      '<strong>Not sent yet.</strong> Other devices cannot see your latest changes yet. Keep the book open.') + '</div>';
  }
  /* Two taps for anything that is hard to take back: the first tap arms the button ("Tap again..."), a second tap
     within 4 seconds does it. Left alone, the button goes back to normal by itself. */
  var armKey = '', armTimer = null;
  function armed(k) { return armKey === k; }
  function arm(k) {
    clearTimeout(armTimer);
    if (armKey === k) { armKey = ''; return true; }
    armKey = k; armTimer = setTimeout(function () { armKey = ''; draw(); }, 4000); draw();
    return false;
  }

  function sha(str) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  /* Every write carries the writer's id (by) and, in the same batch, a write-only proof of their own PIN.
     The security rules compare that proof with the stored PIN, so only people who know a personal PIN can write. */
  function W(ops) {
    var b = fb.fs.writeBatch(fb.db), pf = S.who && S.tok;
    if (pf) b.set(docRef('proofs', S.who), { tok: S.tok, at: fb.fs.serverTimestamp() });
    ops.forEach(function (o) {
      if (o[0] === 'del') { b.delete(o[1]); return; }
      var data = pf ? Object.assign({ by: S.who }, o[2]) : o[2];
      if (o[0] === 'upd') b.update(o[1], data); else if (o[3]) b.set(o[1], data, { merge: true }); else b.set(o[1], data);
    });
    return track(b.commit());
  }
  function sset(ref, data, merge) { return W([['set', ref, data, merge]]); }
  function supd(ref, data) { return W([['upd', ref, data]]); }
  function pinHash(id, pin) { return sha('lk:' + id + ':' + pin); }
  /* four drawn cells over one real input: numbers only, shown as dots */
  function pinField(id, k, val, auto) {
    var cells = '', i;
    for (i = 0; i < 4; i++) cells += '<span class="pin-cell' + (i < val.length ? ' full' : '') + (i === Math.min(val.length, 3) ? ' on' : '') + '" aria-hidden="true">' + (i < val.length ? '\u25CF' : '') + '</span>';
    return '<div class="pinbox"><div class="pin-cells">' + cells + '</div><input id="' + id + '" class="pin-in' + (auto ? ' pin-auto' : '') + '" type="password" data-k="' + k + '" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="4" aria-label="4 digit PIN" value="' + esc(val) + '"></div>';
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
    S.who = id; lsSet('lk.prep.who', id); lsSet('lk.prep.tok', ''); S.authed = false; S.tok = ''; S.pf1 = S.pf2 = ''; S.pinMsg = ''; S.pinStep = 'checking'; featSync(); draw(); whoSync();
    fb.fs.getDoc(docRef('pinset', id)).then(function (s) {
      S.pinStep = s.exists() ? 'enter' : 'set'; draw();
      if (/^\d{4}$/.test(S.pf1)) { if (S.pinStep === 'enter') submitPin(); else focusK('pf2'); }
    }, function () { S.pinStep = 'error'; draw(); });
  }
  function signedIn(id, hash) {
    S.authed = true; S.tok = hash; S.pf1 = S.pf2 = ''; S.pinMsg = ''; S.pinStep = '';
    lsSet('lk.prep.tok', id + ':' + hash); lsSet('lk.prep.seen', String(Date.now())); lsSet('lk.prep.day', dayNow()); lastAct = Date.now(); startIdle();
    hereAdd(id);
    var pend = S.pending; S.pending = null; S.picking = false;
    draw(); whoSync(true);   // a real sign-in: the chef mark flips in
    if (pend) guestReplay(pend);
    dkCheck();
  }
  /* Who signed in on this device today, newest first: "Who are you?" lists them first (lk.prep.here). */
  function hereGet() { try { var h = JSON.parse(lsGet('lk.prep.here') || 'null'); return h && h.d === dayNow() ? h.ids : []; } catch (e) { return []; } }
  function hereAdd(id) { var ids = hereGet().filter(function (x) { return x !== id; }); ids.unshift(id); lsSet('lk.prep.here', JSON.stringify({ d: dayNow(), ids: ids.slice(0, 12) })); }
  /* ---------- a shared kitchen device with nobody signed in (20 Oct 2026) ----------
     After the 10 minute lock, the prep list, orders and wastage still show. A tap that writes (tick, add, urgent, order,
     log waste) asks "Who are you?" first, then does that same thing once the PIN is right, so nobody taps twice. What was
     typed in the add boxes stays. Reading needs only the kitchen PIN, as before; every write still needs a person's PIN. */
  var GUEST_WRITES = { oreg: 1, tick: 1, urgent: 1, del: 1, restore: 1, 'add-recipe': 1, quick: 1, 'toast-act': 1, ogroup: 1, otick: 1, odel: 1, orestore: 1, wdel: 1, wrestore: 1, wreview: 1 };
  function guest() { return shared() && !S.authed && !S.picking && !S.who && (S.name === 'prep' || S.name === 'orders' || S.name === 'waste'); }
  function guestAsk(pend) { S.pending = pend; S.picking = true; S.who = ''; draw(); window.scrollTo(0, 0); }
  function guestSel(el) {
    return ['data-p', 'data-id', 'data-d', 'data-i', 'data-v', 'data-k2'].filter(function (k) { return el.hasAttribute(k); })
      .map(function (k) { return '[' + k + '="' + String(el.getAttribute(k)).replace(/["\\]/g, '\\$&') + '"]'; }).join('');
  }
  function guestReplay(pend) {
    if (pend.form === 'add') { if (S.text.trim()) addTyped(); return; }
    if (pend.form === 'oadd') { addOrder(); return; }
    if (pend.form === 'wadd') { addWaste(); return; }
    var el = pend.sel && S.root && S.root.querySelector(pend.sel);
    if (el) el.click(); else toast('That line has changed. Try again.');
  }
  function guestBarHTML() {
    return '<div class="nb-guest" role="status"><span>Nobody is signed in on this device. Tick or add and the book asks who you are.</span><button type="button" class="btn" data-p="guest-who">Sign in</button></div>';
  }
  /* After 3 wrong PINs the page makes the person wait (1, 2, 5, 15 then 30 minutes). Kept on the phone, so a reload does not skip it.
     This slows someone using the page; it cannot stop a script that talks to the database directly. */
  var WAITS = [60, 120, 300, 900, 1800];
  /* Counted per person (20 Oct 2026), so one cook's typos never make the whole team wait on a shared tablet. The old
     shared count (lk.prep.lock) goes to the first person who types a PIN after the update, once. */
  function lockKey() { return 'lk.prep.lock.' + (S.who || ''); }
  function lockGet() {
    var old = lsGet('lk.prep.lock');
    if (old && S.who && !lsGet(lockKey())) { lsSet(lockKey(), old); lsSet('lk.prep.lock', ''); }
    try { return JSON.parse(lsGet(lockKey()) || '{}'); } catch (e) { return {}; }
  }
  function lockLeft() { var l = lockGet(); return Math.max(0, Math.ceil(((l.until || 0) - Date.now()) / 1000)); }
  function lockFail() {
    var l = lockGet(); l.n = (l.n || 0) + 1; l.f = l.f || 0;
    if (l.n >= 3) { l.until = Date.now() + WAITS[Math.min(l.f, WAITS.length - 1)] * 1000; l.f++; l.n = 0; }
    lsSet(lockKey(), JSON.stringify(l)); return l;
  }
  function lockWait(sec) { return 'Too many wrong tries. Wait ' + (sec >= 60 ? Math.ceil(sec / 60) + ' minute' + (sec > 60 ? 's' : '') : sec + ' seconds') + ' and try again.'; }
  function submitKitchenPin() {
    var v = S.pinInput.trim();
    if (!/^\d{4}$/.test(v)) { S.pinError = 'The kitchen PIN is 4 digits.'; draw(); return; }
    S.pin = v; S.pinError = ''; S.pinInput = ''; lsSet('lk.prep.pin', v); connect();
  }
  function submitPin() {
    var id = S.who, p = who();
    if (!p) return;
    if (!/^\d{4}$/.test(S.pf1)) { S.pinMsg = 'Your PIN is 4 digits.'; draw(); return; }
    if (S.pinStep === 'set') {
      if (S.pf1 !== S.pf2) { S.pinMsg = 'The two PINs do not match. Type it again.'; S.pf2 = ''; draw(); focusK('pf2'); return; }
      pinHash(id, S.pf1).then(function (h) {
        var b = fb.fs.writeBatch(fb.db);
        b.set(docRef('staffpins', id), { hash: h, setAt: now(), name: p.name });
        b.set(docRef('pinset', id), { at: now(), name: p.name });
        return track(b.commit()).then(function () { S.drinkAsk = 'first'; dkEdit(); signedIn(id, h); S.tok = h; bump({ visits: 1, lastSeen: now() }); });
      }).catch(function () { S.pinMsg = 'Could not save your PIN. If someone already set one for this name, pick the name again.'; draw(); });
      return;
    }
    if (S.pinStep === 'enter') {
      if (lockLeft() > 0) { S.pinMsg = lockWait(lockLeft()); S.pf1 = ''; draw(); return; }
      // the check is a write, which waits for the server: say so, and say when there is no signal (the write waits in
      // the queue and the person is signed in by itself once the signal is back)
      S.pinMsg = 'Checking your PIN...'; draw();
      var slow = setTimeout(function () { if (S.pinMsg === 'Checking your PIN...') { S.pinMsg = 'No signal. Your PIN cannot be checked until the phone is back online. Keep the book open: it signs you in by itself when the signal is back.'; draw(); } }, 8000);
      pinHash(id, S.pf1).then(function (h) {
        S.who = id; S.tok = h;
        // a write only succeeds with the right PIN, so a visit count doubles as the PIN check
        return sset(docRef('activity', id), { name: p.name, visits: fb.fs.increment(1), lastSeen: now() }, true).then(function () { clearTimeout(slow); lsSet(lockKey(), ''); signedIn(id, h); },
          function (e) {
            clearTimeout(slow); S.tok = '';
            if (e && e.code === 'permission-denied') { lockFail(); S.pinMsg = lockLeft() > 0 ? lockWait(lockLeft()) : 'That PIN is not right.'; S.pf1 = ''; }
            else S.pinMsg = 'Could not check your PIN. Check the connection.';
            draw();
          });
      });
    }
  }
  function resume() {
    // a phone that has signed in before stays signed in, unless the admin has reset that PIN
    // once per page load, also when nobody was signed in: run later (the config listener fires again on any change) it
    // would sign out a person who is halfway through typing their PIN
    if (resumed) return;
    resumed = true;
    if (!S.who) return;
    var tok = (lsGet('lk.prep.tok') || '').split(':');
    if (dayExpired()) { leave(); startIdle(); return; }
    if (tok[0] !== S.who || !tok[1] || idleExpired()) { if (S.who) { if (shared()) leave(); else pickName(S.who); } startIdle(); return; }
    startIdle();
    S.authed = true; S.tok = tok[1]; hereAdd(S.who); draw(); whoSync(); dkCheck();
    sset(docRef('activity', S.who), { name: (who() || {}).name || '', visits: fb.fs.increment(1), lastSeen: now() }, true).catch(function (e) {
      if (e && e.code === 'permission-denied') { S.authed = false; S.tok = ''; pickName(S.who); }
    });
  }
  /* Desktop idle lock: after 7.5 minutes with no mouse, keyboard or touch, a desktop browser goes back to the person's own
     PIN screen (the kitchen PIN stays). Phones and tablets (no mouse) are left alone. No network use: a timer and a timestamp.
     Shared kitchen device (Settings, kept on the device in lk.settings.v1): a tablet or phone everyone picks up. After
     10 minutes with no touch, and when the book opens on a new kitchen day, it goes back to "Who are you?" instead, so the
     next person does not write under the last person's name or see that person's pages. The kitchen PIN stays, so the
     recipes, guides and the lists are never locked. */
  var IDLE_MS = 450000, SHARED_MS = 600000, lastAct = Date.now(), idleOn = false;
  function isDesktop() { try { return window.matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) { return false; } }
  function shared() { try { return !!JSON.parse(lsGet('lk.settings.v1') || '{}').shared; } catch (e) { return false; } }
  function idleExpired() {
    var away = Date.now() - (+lsGet('lk.prep.seen') || lastAct);
    return shared() ? away > SHARED_MS : isDesktop() && away > IDLE_MS;
  }
  /* a new kitchen day on a shared device: the person who signed in yesterday is not the person holding it today */
  function dayExpired() { var d = lsGet('lk.prep.day'); return shared() && !!d && d !== dayNow(); }
  /* the staff list draft (Manage staff) is kept: the person types their PIN again and carries on where they were */
  function idleLock() {
    if (!S.authed || !S.who || !fb) return;
    if (shared()) { S.picking = false; S.pending = null; leave(); } else pickName(S.who);
  }
  function startIdle() {
    if (idleOn) return; idleOn = true;
    var last = 0;
    function act() { var n = Date.now(); lastAct = n; if (n - last > 5000) { last = n; lsSet('lk.prep.seen', String(n)); } }
    ['pointerdown', 'keydown', 'mousemove', 'wheel', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, act, { passive: true, capture: true }); });
    setInterval(function () { if (S.authed && idleExpired()) idleLock(); }, 15000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && S.authed && idleExpired()) idleLock(); });
    lsSet('lk.prep.seen', String(Date.now()));
  }
  function leave() { S.who = ''; S.authed = false; S.pinStep = ''; lsSet('lk.prep.who', ''); lsSet('lk.prep.tok', ''); resumed = true; featSync(); draw(); whoSync(); }
  /* The top bar shows a small chef mark while a person is signed in on this phone (js/app.js draws it from whoName()). */
  function whoName() { var p = S.authed ? who() : null; return p ? p.name : ''; }
  /* the Head chef is signed in with their PIN on this phone: the top bar shows Admin, which leads to the Google sign-in.
     The PIN alone never opens the admin panel: the rules only trust the head chef's Google account. */
  function whoHead() { return !!(S.authed && isHeadP(who())); }
  var headSeen = false;
  function whoSync(signedIn) { headSeen = whoHead(); try { window.dispatchEvent(new CustomEvent('lk-who', { detail: { signedIn: !!signedIn } })); } catch (e) {} }

  /* ---------- sections: whatever people write becomes a section ---------- */
  /* Sections are spell-checked too. A section close to one already in use (one slip, two for long names) becomes that
     section, so "Fryre" goes under "Fryer" instead of starting a new section. Otherwise each word is checked like a
     line and the first letter is made a capital. Pass an object as info to learn what was changed. */
  var SEC_WORDS = 'grill fryer larder pans pastry cold hot prep sauce sauces garnish butchery pass salads salad dessert desserts bakery smoker veg vegetables sides mains entree starters breakfast functions station oven combi rational stove wok bbq barbecue deli sandwiches pizza burgers coolroom freezer dry store line hotline bench room side section walk cool cooler chiller fridge shelf back front kitchen main bar wash dish upstairs downstairs outside inside morning night lunch dinner'.split(' ');
  var KEEP_SEC = (function () { try { return JSON.parse(lsGet('lk.prep.keepsec') || '{}'); } catch (e) { return {}; } })();
  function keepSection(t) { KEEP_SEC[String(t).toLowerCase()] = 1; lsSet('lk.prep.keepsec', JSON.stringify(KEEP_SEC)); }
  function cleanSection(v, info) {
    var t = String(v || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!t) return '';
    var lt = t.toLowerCase();
    var hit = S.sections.filter(function (x) { return String(x.name).toLowerCase() === lt; })[0];
    if (hit) return hit.name;
    if (KEEP_SEC[lt]) return t;
    var known = S.sections.filter(function (x) { return x.name && !x.hidden; }), best = null, bd = 9, tie = false, maxd = lt.length >= 7 ? 2 : 1;
    // singular or plural of a section in use ("Salad" and "Salads") is the same section
    var pl = known.filter(function (x) { var c = String(x.name).toLowerCase(); return c === lt + 's' || c + 's' === lt || c === lt + 'es' || c + 'es' === lt; }).sort(function (a, b) { return (b.uses || 0) - (a.uses || 0); })[0];
    if (pl) { if (info) { info.from = t; info.to = pl.name; } return pl.name; }
    // a real word ("Pans" when "Pass" exists) is never swapped for a different section
    if (lt.length >= 4 && !realWords(lt)) known.forEach(function (x) {
      var c = String(x.name).toLowerCase();
      if (Math.abs(c.length - lt.length) > maxd) return;
      var d = osa(lt, c);
      if (d > maxd) return;
      if (!best || d < bd || (d === bd && (x.uses || 0) > (best.uses || 0))) { best = x; bd = d; tie = false; }
      else if (d === bd && (x.uses || 0) === (best.uses || 0)) tie = true;
    });
    var out = best && !tie ? best.name : t.replace(/[A-Za-z']+/g, function (w) { return w.length >= 5 ? (fixWord(w) || w) : w; });
    out = out.charAt(0).toUpperCase() + out.slice(1);
    if (info && out.toLowerCase() !== lt) { info.from = t; info.to = out; }
    return out;
  }
  /* When someone leaves the section box, a typo is put right there and then, with Undo. */
  var baseCache = null;
  function realWords(lt) {
    if (!baseCache) {
      baseCache = {};
      function add(t) { String(t || '').toLowerCase().split(/[^a-z']+/).forEach(function (x) { if (x.length >= 3) baseCache[x] = 1; }); }
      KITCHEN.forEach(add); SEC_WORDS.forEach(add);
      D.recipes.forEach(function (r) { add(r.name); add(r.short); (r.ingredients || []).forEach(function (i) { add(i.name); }); });
    }
    var ws = lt.split(/[^a-z']+/).filter(function (w) { return w.length >= 3; });
    return ws.length > 0 && ws.every(function (w) { return baseCache[w] || baseCache[w.replace(/(es|s)$/, '')]; });
  }
  function checkSectionBox(el, key) {
    var info = {}, v = cleanSection(el.value, info);
    if (!info.from) { if (v && v !== el.value) { el.value = v; if (key === 'p-section') S.section = v; else S.wf.sec = v; } return; }
    if (key === 'p-section') S.section = v; else S.wf.sec = v;
    el.value = v;
    toast('Section corrected: ' + info.from + ' to ' + v, { label: 'Undo', fn: function () { keepSection(info.from); if (key === 'p-section') S.section = info.from; else S.wf.sec = info.from; } });
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
    var data = Object.assign({ text: '', station: '', qty: '', recipe: '', addedBy: p ? p.name : '', addedById: p ? p.id : '', addedAt: now(), done: false, deleted: false }, extra);
    var pr = sset(ref, data); pr.id = ref.id; return pr;
  }
  function noteSection(name) {
    if (!name || !fb) return;
    var p = who();
    sset(docRef('sections', slug(name)), { name: name, uses: fb.fs.increment(1), lastUsed: now(), lastBy: p ? p.name : '' }, true).catch(function () {});
  }
  /* The section box after a line is added: a section the person typed or picked stays for the next line; one the book
     filled in (the usual section from a suggestion or from what it learned) is cleared, so the next line gets its own. */
  function keptSection(sec) { return S.secTyped ? sec : ''; }
  function addTyped() {
    var t = S.text.trim();
    if (!t || !can('add')) return;
    var secInfo = {}, sec = cleanSection(S.section, secInfo), typedAs = t, pr = proofread(t), fixed = pr.changes.length || pr.text !== t;
    t = pr.text;
    var rm = matchRecipe(t);
    if (!sec) { var lx = learnedFor(t); if (lx && bestSection(lx)) sec = bestSection(lx); }
    var q0 = S.qty, tw = openTwin(t, q0);
    if (tw) {
      addToTwin(tw, { text: t.slice(0, 160), qty: q0.trim().slice(0, 40), station: sec, recipe: rm ? rm.id : '' }, function () { noteSection(sec); bump({ added: 1, lastAdded: now() }); });
      S.text = ''; S.qty = ''; S.section = keptSection(sec); S.pickedText = ''; draw();
      var el0 = S.root && S.root.querySelector('[data-k="p-text"]'); if (el0) el0.focus();
      return;
    }
    var made = newItem(Object.assign({ text: t.slice(0, 160), qty: S.qty.trim().slice(0, 40), station: sec, recipe: rm ? rm.id : '' }, fixed ? { orig: typedAs.slice(0, 160) } : {}));
    made.catch(function (e) { failed(e, function () { if (!S.text.trim()) { S.text = typedAs; S.qty = q0; } }); });
    noteSection(sec); bump({ added: 1, lastAdded: now() });
    if (pr.changes.length || secInfo.from) {
      var ch = pr.changes, mid = made.id, dte = S.date, sf = secInfo.from;
      var msg = ch.map(function (c) { return c[0] + ' to ' + c[1]; }).concat(sf ? ['section ' + sf + ' to ' + sec] : []).join(', ');
      toast('Corrected ' + msg, { label: 'Undo', fn: function () {
        var undo = {};
        if (ch.length) { keepWords(ch); undo.text = typedAs.slice(0, 160); undo.orig = ''; }
        if (sf) { keepSection(sf); undo.station = sf; noteSection(sf); if (S.section === sec) S.section = sf; }
        supd(itemRef(dte, mid), undo).catch(failed);
      } });
    }
    else addedToast(sec, S.date, made.id);
    S.text = ''; S.qty = ''; S.section = keptSection(sec); S.pickedText = ''; draw();
    var el = S.root && S.root.querySelector('[data-k="p-text"]'); if (el) el.focus();
  }
  function addRecipe(id) {
    var r = D.recipes.filter(function (x) { return x.id === id; })[0];
    if (!r || !can('add')) return;
    var secInfo = {}, sec = cleanSection(S.section, secInfo);
    var q0 = S.qty, tw = openTwin(r.short || r.name, q0);
    if (tw) {
      addToTwin(tw, { text: (r.short || r.name), recipe: r.id, qty: q0.trim().slice(0, 40), station: sec }, function () { noteSection(sec); bump({ added: 1, lastAdded: now() }); });
      S.qty = ''; S.recipeSearch = ''; S.recipeOpen = false; S.recipeAll = false; S.section = sec;
      return;
    }
    var made = newItem({ text: (r.short || r.name), recipe: r.id, qty: S.qty.trim().slice(0, 40), station: sec });
    made.catch(function (e) { failed(e, function () { if (!S.qty.trim()) S.qty = q0; }); });
    noteSection(sec); bump({ added: 1, lastAdded: now() });
    S.qty = ''; S.recipeSearch = ''; S.recipeOpen = false; S.recipeAll = false;
    if (secInfo.from) { S.section = sec; var sf = secInfo.from, mid = made.id, dte = S.date; toast('Added, section ' + sf + ' corrected to ' + sec, { label: 'Undo', fn: function () { keepSection(sf); noteSection(sf); S.section = sf; supd(itemRef(dte, mid), { station: sf }).catch(failed); } }); }
    else addedToast(sec, S.date, made.id);
  }
  function canUntick(x) {
    return canBrowse() || (!!x.doneById && x.doneById === S.who && now() - (x.doneAt || 0) < 110000);
  }
  function tick(date, id) {
    var it = S.items.filter(function (x) { return x.id === id; })[0], p = me();
    if (!it || !can('tick')) return;
    var done = !it.done;
    if (!done && !canUntick(it)) { toast('Ticked lines stay ticked. Ask the head chef or sous chef to undo it.'); return; }
    supd(itemRef(date, id), { done: done, doneBy: done ? p.name : '', doneById: done ? p.id : '', doneAt: done ? now() : 0 }).catch(failed);
    if (done) { bump({ ticked: 1 }); toast('Ticked', { label: 'Undo', fn: function () { tick(date, id); } }); setTimeout(draw, LINGER + 100); }
    else if (it.doneById && fb) sset(docRef('activity', it.doneById), { name: it.doneBy || '', ticked: fb.fs.increment(-1) }, true).catch(function () {});
  }
  function removeItem(date, id, restore) {
    var p = me(), it = S.items.filter(function (x) { return x.id === id; })[0];
    if (!can('del')) return;
    // a merged double up that is put back is kept apart, so it is not merged again
    supd(itemRef(date, id), Object.assign({ deleted: !restore, deletedBy: restore ? '' : p.name, deletedAt: restore ? 0 : now() }, restore && it && it.mergedInto ? { mergedInto: '', dupOk: true } : {})).catch(failed);
    if (!restore) toast('Removed ' + (it ? it.text : 'the line'), { label: 'Undo', fn: function () { removeItem(date, id, true); } });
  }
  /* Anything not ticked on the last written day rolls onto today by itself, once the clock has been checked (see LK_TIME).
     origAt keeps the time the line was first written (0 for lines that rolled before it was kept). */
  /* Rollover, repair and sign-off checks run once a day per phone. When one fails (no signal, a refused write), it waits
     this long before trying again, instead of trying again on every redraw: a redraw can happen many times a minute,
     and each rollover attempt reads 8 days of lines (the free plan has a daily read limit). Time passing on the phone. */
  var RETRY_WAIT = 5 * 60000;
  function waiting(k) { return Date.now() < (S.retryAt[k] || 0); }
  function retryLater(k) { S.retryAt[k] = Date.now() + RETRY_WAIT; }
  function maybeRoll() {
    var today = dayNow();
    if (!T.ready() || !S.authed || !fb || !can('add') || S.date !== today || S.itemsState !== 'ok' || S.rolledFor === today || waiting('roll')) return;
    if (S.pastFor !== pastTag()) return; // the usual close time comes from the past days, so wait for them
    repairAhead();
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
        jobs.push(['set', itemRef(today, id), {
          text: x.text, station: x.station || '', qty: x.qty || '', recipe: x.recipe || '',
          addedBy: 'Rolled over', addedById: '', addedAt: now(), done: false, deleted: false,
          rolled: (x.rolled || 0) + 1, root: root, from: x.id, rolledFrom: src.date, origBy: x.origBy || x.addedBy || '', origAt: x.origAt || (x.rolled ? 0 : x.addedAt || 0), urgent: !!x.urgent,
          ahead: !!(x.ahead || writtenLate(x, src.date))
        }]);
      });
      if (!jobs.length) return;
      return W(jobs.slice(0, 400)).then(function () { toast(jobs.length + (jobs.length === 1 ? ' line' : ' lines') + ' rolled over from ' + dayName(src.date).toLowerCase()); });
    }).catch(function () { S.rolledFor = ''; retryLater('roll'); });
  }
  function toggleUrgent(id) {
    var it = S.items.filter(function (x) { return x.id === id; })[0];
    if (!it || !can('add')) return;
    var p = me(), on = !it.urgent, dt = S.date;
    // the line keeps its place for a moment, so the next line does not slide under the same finger
    S.urgHold = { id: id, was: !!it.urgent, until: Date.now() + LINGER }; setTimeout(function () { S.urgHold = null; draw(); }, LINGER + 50);
    supd(itemRef(dt, id), { urgent: on, urgentBy: on && p ? p.name : '', urgentById: on && p ? p.id : '', urgentAt: on ? now() : 0 }).catch(failed);
    toast(on ? 'Marked urgent' : 'Not urgent any more', { label: 'Undo', fn: function () { supd(itemRef(dt, id), { urgent: !on, urgentBy: !on && p ? p.name : '', urgentById: !on && p ? p.id : '', urgentAt: !on ? now() : 0 }).catch(failed); } });
  }
  function urgOf(x) { var h = S.urgHold; return h && h.id === x.id && Date.now() < h.until ? h.was : !!x.urgent; }

  /* ---------- proofreading: every new line is tidied and spell-checked before it is saved ---------- */
  var KITCHEN = ('star anise blanch julienne dice diced slice sliced marinate marinated portion portioned batch wash pick chop chopped shred shredded trim tray crumb crumbed batter gravy sauce stock reduce season seasoned mix mixed roast roasted smoke smoked pulled pull cook cooked cool chill chilled defrost thaw label date rotate fill refill restock set setup stack fold grate grated peel peeled core cut cure brine rub glaze whip whipped steam steamed fry fried grill grilled bake baked char charred toast toasted dress dressing garnish drizzle lemon lime orange tomato tomatoes onion onions garlic potato potatoes lettuce cucumber carrot carrots cabbage capsicum mushroom mushrooms bacon cheese chicken beef pork lamb barramundi calamari prawn prawns salmon rice pasta mash chips fries slaw coleslaw aioli mayo mayonnaise pickle pickles parmesan parmigiana parmy schnitzel schnitty beetroot spinach broccoli zucchini pumpkin sweet corn peas beans dough pastry pie pies brownie cookie caramel butterscotch cream ice vanilla chocolate guinness snickers laksa coconut asian greens oak leaf salad salads burger burgers patties patty bun buns brioche ribs rib wings wing steak sandwich skillet spring rolls roll roll bourbon bbq chilli chili ginger shallot shallots herbs parsley coriander basil thyme rosemary sage mint dill chives pepper salt sugar flour butter milk eggs egg oil vinegar mustard ketchup tomato relish jus beer batter fish chip sauce sides side dessert desserts entree entrees mains main kids ketchup bacon jam onion rings nachos tacos taco quesadilla wrap wraps hummus dip dips bread garlic focaccia fetta feta halloumi mozzarella cheddar swiss tasty gravy peppercorn mushroom diane creamy white red green yellow large small half full double single extra spare backup morning afternoon night lunch dinner breakfast service base bases bowl bowls sheet sheets lid lids tub tubs bag bags pack packs bit bits bin bins tin tins can cans foil film wipe wipes glove gloves towel towels cloth cloths bleach soap spray sanitiser sanitizer paper napkin napkins straw straws tong tongs whisk knife knives board boards peeler ladle ladles spoon spoons fork forks plate plates dish dishes pickled jalapeno jalapenos tortilla tortillas wonton wontons tomatoes cup cups jar jars pot pots pan pans oven rack racks jug jugs make made need needs more less last next each every both some thing things stuff work done ready first top bottom front back cold hot warm mild spicy fresh frozen dried raw plain with without from into over under before after until only also then than that this these those mince stir drain rest wrap cover covered uncover break bone bones skin skinned skinless fillet fillets cube cubes strip strips wedge wedges round rounds ring rings whole sliced thick thin fine rough coarse smooth').split(/\s+/);
  var vocabCache = null, vocabKey = '';
  function vocab() {
    var key = S.learned.length + ':' + D.recipes.length + ':' + S.sections.length + ':' + (S.ordLearned || []).length;
    if (vocabCache && vocabKey === key) return vocabCache;
    var v = {};
    function add(t, w) { String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z']+/).forEach(function (x) { if (x.length >= 3) v[x] = Math.max(v[x] || 0, w); }); }
    KITCHEN.forEach(function (w) { add(w, 1); });
    SEC_WORDS.forEach(function (w) { add(w, 1); });
    S.sections.forEach(function (x) { if (!x.hidden) add(x.name, 2 + Math.min(5, x.uses || 0)); });
    D.recipes.forEach(function (r) { add(r.name, 3); add(r.short, 3); (r.ingredients || []).forEach(function (i) { add(i.name, 2); }); });
    S.learned.forEach(function (x) { add(x.text, 2 + Math.min(5, x.uses || 0)); });
    (S.ordLearned || []).forEach(function (x) { if (!x.hidden) add(x.text, 2 + Math.min(5, x.uses || 0)); });
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
    if (lw.length < 4 || /[^\x00-\x7f]/.test(w) || v[lw] || KEEP[lw] || v[lw.replace(/(es|s|ed|ing)$/, '')] || v[lw.replace(/s$/, '')] || v[lw.replace(/d$/, '')]) return null;
    // a word that is only the singular or plural, or the past tense, of a word we know is not a slip
    if (v[lw + 's'] || v[lw + 'es'] || v[lw + 'd'] || v[lw + 'ed'] || v[lw + 'ing']) return null;
    var maxd = lw.length >= 8 ? 2 : 1, best = null, bd = 9, bw = -1, tie = false;
    Object.keys(v).forEach(function (c) {
      if (c[0] !== lw[0] || Math.abs(c.length - lw.length) > maxd) return;
      var dd = osa(lw, c);
      if (dd > maxd) return;
      if (dd < bd || (dd === bd && v[c] > bw)) { best = c; bd = dd; bw = v[c]; tie = false; }
      else if (dd === bd && v[c] === bw) tie = true;
    });
    if (!best || tie) return null;
    if (best === lw + 's' || best === lw + 'es' || best + 's' === lw || best + 'es' === lw) return null;
    if (w === w.toUpperCase() && w.length > 1) return best.toUpperCase();
    if (w[0] === w[0].toUpperCase()) return best[0].toUpperCase() + best.slice(1);
    return best;
  }
  function proofread(text) {
    var changes = [], t = String(text).replace(/\s+/g, ' ').trim().replace(/\s+([,.;:!?])/g, '$1').replace(/([,;:])(?=\S)/g, '$1 ');
    t = t.replace(/[A-Za-z\u00C0-\u024F']+/g, function (w) { var f = fixWord(w); if (f && f !== w) { changes.push([w, f]); return f; } return w; });
    if (/^[a-z]/.test(t)) t = t[0].toUpperCase() + t.slice(1);
    return { text: t, changes: changes };
  }

  /* ---------- the prep list learns: every line added is counted per item, weekday and section ----------
     The counting is done on the server every night (scripts/nightly-learn.mjs, a GitHub Action at 03:00 kitchen time):
     it reads each finished day once and adds it to learned/<item>. The phones only read learned (live) and never write it,
     apart from the head chef hiding an item. */
  var REGULAR = 4;   // typed or picked this many times and it becomes a regular
  function lkey(t) { return slug(String(t).toLowerCase()).slice(0, 80); }
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
    return '<span class="nb-ql">Usual amount</span>' + l.map(function (x) { return '<button type="button" class="chip sq nb-qc" data-p="qset" data-v="' + esc(x.q) + '" aria-label="' + esc('Add ' + S.text.trim() + ', ' + x.q) + '">Add ' + esc(x.q) + '</button>'; }).join('');
  }
  /* Start here: up to three open lines to do first, across all sections. */
  function startHere(live) {
    var open = live.filter(function (x) { return !x.done; }), picked = [], seen = {};
    function take(list, why) { list.forEach(function (x) { if (picked.length < 3 && !seen[x.id]) { seen[x.id] = 1; picked.push({ x: x, why: why(x) }); } }); }
    take(open.filter(function (x) { return x.urgent; }).sort(function (a, b) { return (a.addedAt || 0) - (b.addedAt || 0); }), function () { return 'Urgent'; });
    take(open.filter(function (x) { return rolledN(x); }).sort(function (a, b) { return rolledN(b) - rolledN(a); }), function (x) { return 'Rolled over' + (x.rolled > 1 ? ' x' + x.rolled : ''); });
    var slow = open.map(function (x) { return { x: x, m: ((S.hist || {})[lkey(x.text)] || {}).med || 0 }; }).filter(function (o) { return o.m >= 2 * 3600000; }).sort(function (a, b) { return b.m - a.m; }).map(function (o) { return o.x; });
    take(slow, function (x) { return 'Usually takes ' + dur(((S.hist || {})[lkey(x.text)] || {}).med); });
    take(open.slice().sort(function (a, b) { return (a.addedAt || 0) - (b.addedAt || 0); }), function (x) { return x.addedAt ? 'Waiting since ' + clock(x.addedAt) : 'Waiting longest'; });
    return picked;
  }
  /* Start here is drawn twice: above the lines on phones and tablets (nb-start-l), and at the top of the Handy page on big screens (nb-start-r), so it does not push the lines down. CSS shows one of the two. */
  function startHTML(live, side) {
    if (!can('tick') || S.date !== dayNow()) return '';
    if (live.filter(function (x) { return !x.done; }).length < 4) return '';
    var l = startHere(live);
    var ol = '<ol>' + l.map(function (o) {
      return '<li><button type="button" class="nb-sb" data-p="goto" data-id="' + esc(o.x.id) + '"><span class="nb-st">' + esc(o.x.text) + (o.x.qty ? ' <span class="nb-q">' + esc(o.x.qty) + '</span>' : '') + '</span><span class="nb-sw">' + esc(o.why) + (o.x.station ? ' &middot; ' + esc(o.x.station) : '') + '</span></button></li>';
    }).join('') + '</ol>';
    if (side) return '<div class="nb-start nb-start-r"><span class="nb-sl">Start here</span>' + ol + '</div>';
    // phones and tablets: one line naming the jobs, tap to open, so the list itself starts higher up
    return '<details class="nb-start nb-start-l"' + (S.startOpen ? ' open' : '') + '><summary data-p="start-toggle"><span class="nb-sl">Start here</span><span class="nb-sline">' + esc(l.map(function (o) { return o.x.text; }).join(', ')) + '</span></summary>' + ol + '</details>';
  }
  function gotoRow(id) {
    var it = S.items.filter(function (x) { return x.id === id; })[0];
    if (it && !inTab(it)) { S.tab = ''; draw(); }
    var row = S.root && S.root.querySelector('#nbr-' + CSS.escape(id));
    if (!row) return;
    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row.classList.remove('is-flash'); void row.offsetWidth; row.classList.add('is-flash');
  }
  function onList() { var h = {}; S.items.forEach(function (x) { if (!x.deleted) h[lkey(x.text)] = 1; }); return h; }

  /* ---------- double ups: the same item open twice on one page, in any section ---------- */
  /* Two lines are the same item when their words match, ignoring case, spacing, punctuation and plurals ("Slice onions"
     and "slice onion."). Amounts agree when they are the same ("2 L" and "2l") or one of them is blank. */
  function stem(w) {
    if (w.length > 3 && /[^s]s$/.test(w)) w = w.slice(0, -1);
    if (w.length > 3 && /e$/.test(w)) w = w.slice(0, -1);
    return w.replace(/([^aeiou])y$/, '$1i');
  }
  function dupKey(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(Boolean).map(stem).join(' '); }
  function qtyKey(q) { return String(q || '').toLowerCase().split(/[^a-z0-9.]+/).filter(Boolean).map(stem).join(''); }
  function byFirst(a, b) { return firstAt(a) - firstAt(b) || (a.addedAt || 0) - (b.addedAt || 0) || (a.id < b.id ? -1 : 1); }
  /* open lines grouped by item, two or more to a group, the line written first at the front */
  function dupGroups(items) {
    var m = {};
    items.forEach(function (x) { var k = !x.done && !x.deleted && dupKey(x.text); if (k) (m[k] = m[k] || []).push(x); });
    return Object.keys(m).map(function (k) { return m[k].sort(byFirst); }).filter(function (g) { return g.length > 1; });
  }
  function sameQty(g) { var q = {}; g.forEach(function (x) { if (qtyKey(x.qty)) q[qtyKey(x.qty)] = 1; }); return Object.keys(q).length <= 1; }
  /* the obvious ones: amounts agree, and no line was kept apart on purpose (dupOk, from Add anyway or Undo) */
  function obviousDups(items) { return dupGroups(items.filter(function (x) { return !x.dupOk; })).filter(sameQty); }
  var DUP_BLANK = { qty: '', urgent: false, urgentBy: '', urgentById: '', urgentAt: 0, station: '', recipe: '', also: [] };
  function prevOf(x, up) { var p = {}; Object.keys(up).forEach(function (k) { p[k] = x[k] === undefined ? DUP_BLANK[k] : x[k]; }); return p; }
  /* Merging a group: the line written first stays. It takes the amount, the urgent mark, a section and a recipe link if
     it had none, and the other sections (also), so it still shows on their tabs. The others are removed (mergedInto). */
  function foldDups(g) {
    var keep = g[0], up = {}, sec = keep.station || '', also = (keep.also || []).slice();
    g.slice(1).forEach(function (x) {
      if (!keep.qty && !up.qty && x.qty) up.qty = x.qty;
      if (!keep.urgent && !up.urgent && x.urgent) { up.urgent = true; up.urgentBy = x.urgentBy || ''; up.urgentById = x.urgentById || ''; up.urgentAt = x.urgentAt || 0; }
      if (!sec && x.station) sec = up.station = x.station;
      if (!keep.recipe && !up.recipe && x.recipe) up.recipe = x.recipe;
      [x.station || ''].concat(x.also || []).forEach(function (s) { if (s && also.indexOf(s) < 0) also.push(s); });
    });
    also = also.filter(function (s) { return s !== sec; }).slice(0, 8);
    if (also.join('|') !== (keep.also || []).join('|')) up.also = also;
    return { keep: keep, rest: g.slice(1), up: up, sec: sec };
  }
  /* Obvious double ups on today's list are merged by themselves, with Undo. Each phone waits a moment at random, so
     usually only one does it, and reads those lines from the server first (a few reads, only when there is a double
     up), so a phone with an old copy of the list never removes a line that was ticked or changed somewhere else.
     A group is tried once per page load. */
  var dupTimer = null, dupTried = {};
  function dupSig(g) { return g.map(function (x) { return x.id; }).sort().join(','); }
  function dupTodo(items) { return obviousDups(items).filter(function (g) { return !dupTried[dupSig(g)]; }); }
  function mergeDups() {
    if (dupTimer || !S.authed || !fb || !fb.fs.getDocFromServer || !can('add') || S.date !== dayNow() || S.itemsState !== 'ok' || !dupTodo(S.items).length) return;
    dupTimer = setTimeout(function () {
      dupTimer = null;
      var dte = S.date, ids = [];
      if (dte !== dayNow() || !can('add')) return;
      dupTodo(S.items).forEach(function (g) { dupTried[dupSig(g)] = 1; g.forEach(function (x) { ids.push(x.id); }); });
      if (!ids.length) return;
      Promise.all(ids.map(function (id) { return fb.fs.getDocFromServer(itemRef(dte, id)); })).then(function (snaps) {
        var fresh = snaps.filter(function (d) { return d.exists(); }).map(function (d) { var x = d.data(); x.id = d.id; return x; });
        var gs = obviousDups(fresh), ops = [], undo = [], p = me(), last = null;
        gs.forEach(function (g) {
          var f = foldDups(g);
          last = f;
          if (Object.keys(f.up).length) { ops.push(['upd', itemRef(dte, f.keep.id), f.up]); undo.push(['upd', itemRef(dte, f.keep.id), prevOf(f.keep, f.up)]); }
          f.rest.forEach(function (x) {
            ops.push(['upd', itemRef(dte, x.id), { deleted: true, deletedBy: p ? p.name : '', deletedAt: now(), mergedInto: f.keep.id }]);
            undo.push(['upd', itemRef(dte, x.id), { deleted: false, deletedBy: '', deletedAt: 0, mergedInto: '', dupOk: true }]);
          });
        });
        if (!ops.length) return;
        return W(ops.slice(0, 400)).then(function () {
          var msg = gs.length === 1 ? last.keep.text + ' was on the list ' + (gs[0].length === 2 ? 'twice' : gs[0].length + ' times') + '. Now it is on once' + (last.sec ? ', under ' + last.sec : '') + '.'
            : gs.length + ' double ups merged: ' + gs.map(function (g) { return g[0].text; }).join(', ') + '.';
          toast(msg, { label: 'Undo', fn: function () { W(undo.slice(0, 400)).catch(failed); } });
        });
      }).catch(function () {});
    }, 600 + Math.random() * 1800);
  }
  /* Writing an item that is already open on the page does not add it again. The open line takes the amount if it had
     none, and the section written (also). An amount that differs is not a double up, so that line is added as usual.
     Add anyway undoes the change and adds the line, kept apart (dupOk). */
  function openTwin(text, qty) {
    var k = dupKey(text), q = qtyKey(qty);
    if (!k) return null;
    return S.items.filter(function (x) { return !x.done && !x.deleted && dupKey(x.text) === k && (!q || !qtyKey(x.qty) || qtyKey(x.qty) === q); }).sort(byFirst)[0] || null;
  }
  function addToTwin(tw, data, after) {
    var dte = S.date, up = {};
    if (data.qty && !tw.qty) up.qty = data.qty;
    if (data.station && data.station !== (tw.station || '') && (tw.also || []).indexOf(data.station) < 0) up.also = (tw.also || []).concat([data.station]).slice(0, 8);
    var prev = prevOf(tw, up), changed = Object.keys(up).length;
    if (changed) supd(itemRef(dte, tw.id), up).catch(failed);
    toast(tw.text + ' is already on the list' + (tw.station ? ' under ' + tw.station : '') + (up.qty || tw.qty ? ', ' + (up.qty || tw.qty) : '') + '.', { label: 'Add anyway', fn: function () {
      if (changed) supd(itemRef(dte, tw.id), prev).catch(failed);
      var made = newItem(Object.assign({}, data, { dupOk: true }));
      made.catch(failed);
      if (after) after();
      addedToast(data.station, dte, made.id);
    } });
  }
  function inTab(x) { return !S.tab || (x.station || '') === S.tab || (x.also || []).indexOf(S.tab) >= 0; }
  /* "Also" on a line: the other sections it was written under, and any other open line for the same item (a different
     amount, or kept apart), so whoever does it sees both. */
  function alsoHTML(x, under, twins) {
    var out = [];
    [x.station || ''].concat(x.also || []).forEach(function (s) { if (s && s !== under && out.indexOf(s) < 0) out.push(s); });
    (twins[dupKey(x.text)] || []).forEach(function (y) { if (y.id !== x.id) out.push([(y.station || '') !== under ? y.station : '', y.qty].filter(Boolean).join(' ') || 'here'); });
    return out.length ? '<span class="nb-also">Also ' + esc(out.join(', ')) + '</span>' : '';
  }
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
    oneTap(x.text, x.section);
  }
  /* One-tap adds (Quick add in Handy): the line goes on with its usual amount, and the toast says where, with Undo. */
  function oneTap(text, sec) {
    var rm = matchRecipe(text), uq = usualQty(text), dte = S.date, tw = openTwin(text, uq);
    if (tw) { addToTwin(tw, { text: text.slice(0, 160), station: sec, recipe: rm ? rm.id : '', qty: uq }, function () { noteSection(sec); bump({ added: 1, lastAdded: now() }); }); return; }
    var made = newItem({ text: text.slice(0, 160), station: sec, recipe: rm ? rm.id : '', qty: uq });
    made.catch(failed);
    noteSection(sec); bump({ added: 1, lastAdded: now() });
    addedToast(sec, dte, made.id);
  }
  /* Undo on an add flags the new line as removed. Anyone may take back a line they just wrote (the rules let the writer update it).
     The toast does not repeat the line: it is on the list already, and on a phone a long name plus Undo covered the list. */
  function addedToast(sec, dte, mid) {
    toast('Added' + (sec ? ' to ' + sec : ''), { label: 'Undo', fn: function () { supd(itemRef(dte, mid), { deleted: true, deletedBy: (me() || {}).name || '', deletedAt: now() }).catch(failed); } });
  }
  /* Owner backup: everything the book holds, as one JSON file (PIN fingerprints left out). */
  function exportAll() {
    if (!fb || S.exporting) return;
    S.exporting = 'Reading the data...'; draw();
    var f = fb.fs, out = { exportedAt: new Date(now()).toISOString(), config: null, days: {}, orders: {}, waste: {}, wasteReviews: {}, activity: [], sections: [], learned: [], ordlearned: [], learnlog: [], misses: [], notes: [], notesSeen: {}, minutes: [], minutesHist: {}, minutesSigns: {}, pins: [] };
    function grab(sn) { return sn.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }); }
    function all(name) { return f.getDocs(colRef(name)).then(grab); }
    /* the records under each note (who has seen it) and each minutes (earlier versions, sign-offs): one small query each, kept by the note's or the minutes' id */
    function subs(list, top, name, into) {
      return Promise.all(list.map(function (x) {
        return f.getDocs(f.collection.apply(null, [fb.db].concat(base(), [top, x.id, name]))).then(function (sn) { var r = grab(sn); if (r.length) into[x.id] = r; });
      }));
    }
    var today = dayNow(), dates = [], k;
    for (k = 0; k < 400; k++) dates.push(shift(today, -k));
    f.getDoc(cfgDoc()).then(function (sn) { out.config = sn.exists() ? sn.data() : null; })
      .then(function () { return all('activity'); }).then(function (r) { out.activity = r; })
      .then(function () { return all('sections'); }).then(function (r) { out.sections = r; })
      .then(function () { return all('learned'); }).then(function (r) { out.learned = r; })
      .then(function () { return all('ordlearned'); }).then(function (r) { out.ordlearned = r; })
      .then(function () { return all('learnlog'); }).then(function (r) { out.learnlog = r; })
      .then(function () { return all('misses'); }).then(function (r) { out.misses = r; })
      .then(function () { return all('views'); }).then(function (r) { out.views = r; })
      .then(function () { return all('guides'); }).then(function (r) { out.guides = r; })
      .then(function () { return all('mail'); }).then(function (r) { out.mail = r; return all('mailstat'); }).then(function (r) { out.mailstat = r; })
      .then(function () { return all('drinks'); }).then(function (r) { out.drinks = r; })
      .then(function () { S.exporting = 'Reading shift pings and minutes...'; draw(); return all('notes'); }).then(function (r) { out.notes = r; return subs(r, 'notes', 'seen', out.notesSeen); })
      .then(function () { return all('minutes'); }).then(function (r) { out.minutes = r; return Promise.all([subs(r, 'minutes', 'hist', out.minutesHist), subs(r, 'minutes', 'signs', out.minutesSigns)]); })
      .then(function () { return all('pinset'); }).then(function (r) { out.pins = r.map(function (x) { return { id: x.id, name: x.name, setAt: x.setAt }; }); })
      .then(function () {
        var i = 0, n = 0;
        function next() {
          if (i >= dates.length) return;
          var chunk = dates.slice(i, i + 20); i += 20;
          S.exporting = 'Reading days ' + Math.min(i, dates.length) + ' of ' + dates.length + '...'; draw();
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
        var nn = out.notes.length, mn = out.minutes.length, dn = Object.keys(out.days).length;
        S.exporting = ''; toast('Backup saved: ' + n + (n === 1 ? ' line' : ' lines') + ' from ' + dn + (dn === 1 ? ' day, ' : ' days, ') + nn + (nn === 1 ? ' shift ping' : ' shift pings') + ' and minutes from ' + mn + (mn === 1 ? ' meeting.' : ' meetings.'));
      }).catch(function () { S.exporting = ''; toast('Could not read everything. Check the connection.'); });
  }
  /* Owner only: copy everything under the current kitchen PIN to a new one, then switch this device over.
     The security rules must already allow the new PIN (see firestore.rules) or the copy is refused. */
  function movePin() {
    var box = S.root.querySelector('#a-newpin'), np = box ? box.value.trim() : '';
    /* only the head chef (Google account) changes the kitchen PIN; the admin panel is for the head chef only, and this checks again */
    if (S.moving || !fb || S.level !== 'owner' || !S.user) return;
    if (!/^\d{4}$/.test(np)) { S.moveMsg = 'The new PIN is exactly 4 digits.'; draw(); return; }
    if (np === S.pin) { S.moveMsg = 'That is the PIN already in use.'; draw(); return; }
    if (!arm('move-pin')) return;
    S.moving = true; S.moveMsg = 'Copying...'; draw();
    var f = fb.fs, old = S.pin, n = 0;
    function oc(name) { return f.collection.apply(null, [fb.db, 'kitchens', old, name]); }
    function nd(name, id) { return f.doc(fb.db, 'kitchens', np, name, id); }
    var ids = {}, skipped = 0;
    function copyCol(name) { return f.getDocs(oc(name)).then(function (sn) { n += sn.docs.length; ids[name] = sn.docs.map(function (d) { return d.id; }); return Promise.all(sn.docs.map(function (d) { return f.setDoc(nd(name, d.id), d.data()); })); }); }
    /* records under a note or a minutes entry (seen, hist, signs). Sign-offs and seen records need the newer rules
       that let the head chef copy them; where the rules refuse, they are counted as left behind instead of stopping the move. */
    function copySub(top, sub, soft) {
      return Promise.all((ids[top] || []).map(function (id) {
        return f.getDocs(f.collection(fb.db, 'kitchens', old, top, id, sub)).then(function (sn) {
          return Promise.all(sn.docs.map(function (x) {
            return f.setDoc(f.doc(fb.db, 'kitchens', np, top, id, sub, x.id), x.data()).then(function () { n++; }, function (e) { if (!soft) throw e; skipped++; });
          }));
        });
      }));
    }
    var today = dayNow(), dates = [], k;
    for (k = 0; k < 400; k++) dates.push(shift(today, -k));
    f.getDoc(f.doc(fb.db, 'kitchens', old, 'config', 'main')).then(function (sn) { if (sn.exists()) { n++; return f.setDoc(f.doc(fb.db, 'kitchens', np, 'config', 'main'), sn.data()); } })
      .then(function () { return copyCol('pinset'); }).then(function () { return copyCol('staffpins'); }).then(function () { return copyCol('activity'); }).then(function () { return copyCol('sections'); })
      .then(function () { return copyCol('learned'); }).then(function () { return copyCol('ordlearned'); }).then(function () { return copyCol('learnlog'); }).then(function () { return copyCol('misses'); }).then(function () { return copyCol('views'); })
      .then(function () { return copyCol('notes'); }).then(function () { return copyCol('minutes'); }).then(function () { return copySub('minutes', 'hist'); })
      .then(function () { return copySub('minutes', 'signs', true); }).then(function () { return copySub('notes', 'seen', true); })
      .then(function () { return copyCol('guides'); }).then(function () { return copySub('guides', 'pages'); })
      .then(function () { return copyCol('mail'); }).then(function () { return copyCol('mailstat'); }).then(function () { return copyCol('drinks'); })
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
        S.moving = false; S.moveMsg = 'Copied ' + n + ' records. This device now uses the new PIN. Everyone else enters the new PIN next time they open the book.' +
          (skipped ? ' ' + skipped + ' sign-offs and seen records were left on the old PIN: the published rules do not let the head chef copy them yet.' : '');
        S.pin = np; lsSet('lk.prep.pin', np); S.items = []; S.learned = []; S.sections = []; S.activity = []; gForget();
        stopLive(); S.rolledFor = ''; S.learnRan = false; S.weekAt = 0; S.stats = null;
        connect();
      }).catch(function (e) { S.moving = false; S.moveMsg = e && e.code === 'permission-denied' ? 'The rules do not allow the new PIN yet. Nothing was changed on the old PIN.' : 'Stopped part way. Nothing was changed on the old PIN, so it is safe to try again.'; draw(); });
  }
  function hideLearned(id, hidden) {
    sset(docRef('learned', id), { hidden: hidden }, true).catch(failed);
  }
  var LEARN_DAYS = 90;   // how far back the nightly learning reads
  /* what is left to do (ticked lines are left out), and only the open section tab when one is open */
  function listText() {
    var rows = S.items.filter(function (x) { return !x.deleted && !x.done && inTab(x); }).sort(sortItems), out = [], last = null;
    out.push('Prep list' + (S.tab ? ', ' + S.tab : '') + ', ' + dayName(S.date) + ' ' + longDate(S.date));
    if (!rows.length) out.push('', 'Nothing left to do.');
    rows.forEach(function (x) {
      var sec = x.station || 'General';
      if (sec !== last) { out.push('', sec.toUpperCase()); last = sec; }
      out.push('[ ] ' + (x.urgent ? 'URGENT ' : '') + (rolledN(x) ? '(rolled over) ' : '') + x.text + (x.qty ? ' - ' + x.qty : '') + (x.also && x.also.length ? ' (also ' + x.also.join(', ') + ')' : ''));
    });
    return out.join('\n');
  }
  function copyList() { shareText(listText()); }
  /* A phone or tablet opens its share sheet (straight into a message), a computer copies. If sharing is not there or
     fails, the text is copied instead. */
  function touchy() { try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } }
  function shareLabel(what) { return (touchy() && navigator.share ? 'Share ' : 'Copy ') + what; }
  function shareText(t) {
    function copied(ok) { toast(ok ? 'Copied. Paste it into a message.' : 'Could not copy on this device.'); }
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta);
      copied(ok);
    }
    function copy() { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { copied(true); }, fallback); else fallback(); }
    if (touchy() && navigator.share) navigator.share({ text: t }).catch(function (e) { if (!e || e.name !== 'AbortError') copy(); });
    else copy();
  }
  /* Printing one part of the book: the class on <html> picks what the print rules in app.css show. */
  function printWith(cls) {
    var h = document.documentElement;
    h.classList.add(cls);
    function done() { h.classList.remove(cls); window.removeEventListener('afterprint', done); }
    window.addEventListener('afterprint', done);
    setTimeout(function () { window.print(); setTimeout(function () { if (h.classList.contains(cls) && !window.matchMedia('print').matches) done(); }, 1500); }, 50);
  }
  /* The order list as plain text for the supplier: one line per item, with the amounts asked for (Everything to order
     adds up every day still open; By day is that day's lines not ticked yet). */
  function ordText() {
    var all = S.ordView === 'all' && canBrowse(), out = [], lines = [];
    if (all) ordGroups().forEach(function (g) { var q = g.lines.map(function (x) { return x.qty; }).filter(Boolean); lines.push(g.text + (q.length ? ': ' + q.join(' + ') : '')); });
    else (S.ordLines || []).filter(function (x) { return !x.deleted && !x.ordered; }).sort(function (a, b) { return (a.addedAt || 0) - (b.addedAt || 0); }).forEach(function (x) { lines.push(x.text + (x.qty ? ': ' + x.qty : '')); });
    out.push('Order, ' + (all ? 'everything still to order' : dayName(S.ordDate) + ' ' + longDate(S.ordDate)));
    out.push('');
    return out.concat(lines.length ? lines : ['Nothing to order.']).join('\n');
  }
  /* A line written after the usual close (the time of the last tick on most days, 20:00 until the book knows) is meant
     for the next day. When it moves onto that day it is marked ahead and does not count as rolled; only if it is still
     open after that day does it show as rolled. rolled stays the number of copies, so a copy is never counted twice. */
  function lateMin() { return S.closeMin || 20 * 60; }
  function writtenLate(x, day) {
    if (x.rolled || !x.addedAt || T.day(x.addedAt) !== day) return false;
    return T.mins(x.addedAt) >= lateMin();
  }
  /* Lines that rolled over before the written-for-tomorrow rule (19 Oct 2026), or on a phone with older code: a copy
     that rolled once is checked against the time its original was written, and marked ahead for everyone if it was
     written after the usual close. Once a day per phone, only today's list, no extra reads (the past days are cached). */
  function repairAhead() {
    var today = dayNow();
    if (S.aheadFixed === today || !S.authed || !fb || !can('add') || S.date !== today || S.itemsState !== 'ok' || S.pastFor !== pastTag() || waiting('ahead')) return;
    S.aheadFixed = today;
    var ops = [];
    S.items.forEach(function (x) {
      if (x.rolled !== 1 || x.ahead || x.deleted || !x.from || !x.rolledFrom) return;
      var src = ((S.past || {})[x.rolledFrom] || []).filter(function (y) { return y.id === x.from; })[0];
      if (src && writtenLate(src, x.rolledFrom)) ops.push(['upd', itemRef(today, x.id), { ahead: true, origAt: src.addedAt }]);
    });
    if (ops.length) W(ops.slice(0, 400)).catch(function () { S.aheadFixed = ''; retryLater('ahead'); });
  }
  function rolledN(x) { return Math.max(0, (x.rolled || 0) - (x.ahead ? 1 : 0)); }
  /* when a line was first written: a rolled copy keeps it in origAt (0 if it rolled before origAt was kept) */
  function firstAt(x) { return x.rolled ? x.origAt || 0 : x.addedAt || 0; }
  function sortItems(a, b) { return (urgOf(b) ? 1 : 0) - (urgOf(a) ? 1 : 0) || rolledN(b) - rolledN(a) || (a.addedAt || 0) - (b.addedAt || 0); }

  /* ---------- admin actions ---------- */
  function startDraft() {
    var c = S.config || { people: [] };
    S.draft = JSON.parse(JSON.stringify({ people: c.people || [], showBadges: c.showBadges !== false, staffSee: staffSee(c) }));
    S.draftSnap = JSON.stringify(S.draft);
    S.saveMsg = '';
  }
  /* The staff list changed on another phone while a draft is open (the People tab, or a sous chef's Manage staff).
     A draft with nothing changed yet follows it. One with changes keeps them: when it is saved, only the rows and fields
     this draft touched are carried onto the list as it is now (mergeDraft), so a copy taken when the page opened never
     wipes what someone else saved in the meantime. */
  function draftBase() { try { return JSON.parse(S.draftSnap || 'null'); } catch (e) { return null; } }
  function refreshDraft() { if (S.draft && !draftDirty()) { var msg = S.saveMsg; startDraft(); S.saveMsg = msg; } }
  function draftStale() {
    var was = draftBase(), c = S.config; if (!S.draft || !was || !c) return false;
    return JSON.stringify({ people: c.people || [], showBadges: c.showBadges !== false, staffSee: staffSee(c) }) !== S.draftSnap;
  }
  function mergeDraft() {
    var d = S.draft, was = draftBase(), c = S.config || { people: [] };
    if (!d || !was || !draftStale()) return d;
    var cur = {}, wasBy = {}, keep = {}, out = [];
    (c.people || []).forEach(function (p) { cur[p.id] = Object.assign({}, p); out.push(cur[p.id]); });
    (was.people || []).forEach(function (p) { wasBy[p.id] = p; });
    d.people.forEach(function (p) { keep[p.id] = true; });
    // rows this draft removed go; rows another phone removed stay gone
    out = out.filter(function (p) { return !(wasBy[p.id] && !keep[p.id]); });
    d.people.forEach(function (p) {
      var w = wasBy[p.id], now_ = cur[p.id];
      if (!w) { if (!now_) out.push(p); return; }   // added in this draft
      if (!now_) return;
      Object.keys(p).forEach(function (k) { if (JSON.stringify(p[k]) !== JSON.stringify(w[k])) now_[k] = p[k]; });
    });
    var m = { people: out, showBadges: d.showBadges !== was.showBadges ? d.showBadges : c.showBadges !== false, staffSee: {} }, see = staffSee(c);
    FEATS.forEach(function (f) { var k = f[0]; m.staffSee[k] = (d.staffSee || {})[k] !== (was.staffSee || {})[k] ? d.staffSee[k] : see[k]; });
    return m;
  }
  function staleHint() { return draftStale() && draftDirty() ? '<p class="hint a-stale">The staff list changed on another phone while you were here. Only what you changed is saved on top of it.</p>' : ''; }
  /* sousIds and pingIds are what the rules check: sous chefs, and everyone who may write shift pings (sous chefs always may) */
  function idsFor(people, fn) { return people.filter(function (p) { return p.active !== false && String(p.name).trim() && fn(p); }).map(function (p) { return p.id; }); }
  function isSousP(p) { return p.role === 'sous' || p.role === 'head'; }
  function canPingP(p) { return isSousP(p) || !!p.ping; }
  function isHeadP(p) { return !!p && p.role === 'head'; }
  /* The head chef's own name (headId, which only the head chef's Google account can write) is always Head chef, on the
     list and with every permission, even if a sous chef's save changed or removed the role. Run on every config read. */
  function headFix(c) {
    var id = c && c.headId;
    (c.people || []).forEach(function (p) {
      if (id && p.id === id) { var r = ROLES.head; p.role = 'head'; p.add = r.add; p.tick = r.tick; p.del = r.del; p.ping = r.ping; p.active = true; }
      else if (p.role === 'head') { p.role = 'sous'; }   // only one head chef: anyone else marked so counts as a sous chef
    });
  }
  function headIdOf(people) { var h = people.filter(function (p) { return p.role === 'head' && p.active !== false && String(p.name).trim(); })[0]; return h ? h.id : ''; }
  function anyP() { return true; }
  function staffSee(c) { var o = {}; FEATS.forEach(function (f) { o[f[0]] = ((c && c.staffSee) || {})[f[0]] !== false; }); return o; }
  /* hold: keep these sousIds and pingIds as they are instead of working them out from the roles (see seedIds) */
  function saveConfig(cfg, hold) {
    var clean = {
      people: cfg.people.filter(function (p) { return String(p.name).trim(); }).map(function (p) {
        return { id: p.id, name: String(p.name).trim().slice(0, 40), role: p.role || 'staff', add: !!p.add, tick: !!p.tick, del: !!p.del, ping: !!p.ping, active: p.active !== false };
      }),
      stations: [], showBadges: cfg.showBadges !== false, staffSee: staffSee(cfg),
      sousIds: hold ? (hold.sousIds || []) : idsFor(cfg.people, isSousP), pingIds: hold ? (hold.pingIds || []) : idsFor(cfg.people, canPingP),
      staffIds: idsFor(cfg.people, anyP), headId: headIdOf(cfg.people),
      updated: now(), updatedBy: S.user ? 'Head chef' : (who() ? who().name : '')   // never the Google email: anyone with the kitchen PIN can read this record
    };
    /* a sous chef may only change the people list and who may set a PIN, so only those are sent (merged): the rules refuse any other field */
    return sdk().then(function () { return S.user ? track(fb.fs.setDoc(cfgDoc(), clean)) : sset(cfgDoc(), { people: clean.people, staffIds: clean.staffIds, updated: clean.updated, updatedBy: clean.updatedBy }, true); }).then(function () { return clean; });
  }
  function adminSave() {
    S.busy = true; S.saveMsg = 'Saving...'; draw();
    saveConfig(mergeDraft()).then(function () { S.busy = false; startDraft(); S.saveMsg = 'Saved. Everyone sees the changes now.'; draw(); },
      function (e) { S.busy = false; S.saveMsg = e && e.code === 'permission-denied' ? 'Not allowed to change these settings.' : 'Could not save. Check the connection.'; draw(); });
  }
  function resetPin(id) {
    if (!arm('pin:' + id)) return;
    var rb = fb.fs.writeBatch(fb.db); rb.delete(docRef('staffpins', id)); rb.delete(docRef('pinset', id));
    track(rb.commit()).then(function () { toast('PIN reset. They set a new one next time they sign in.'); }, function (e) { toast(e && e.code === 'permission-denied' ? 'Could not reset. Sign in as the admin.' : 'Could not reset. Check the connection and try again.', { label: 'OK', fn: function () {} }, 12000); });
  }
  function hideSection(id, hidden) {
    sset(docRef('sections', id), { hidden: hidden }, true).catch(failed);
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
    fb.fs.getDoc(adminsRef()).then(function (sn) { S.level = 'owner'; var mo = sn && sn.exists() ? +(sn.data().mailOpened || 0) : 0; if (mo > mlOpened) { mlOpened = mo; lsSet('lk.mail.opened', String(mo)); } admMark(true); featSync(); seedIds(); loadMail(); draw(); }, function () { S.level = 'none'; admMark(false); featSync(); draw(); });
  }
  /* The rules read three lists next to the people list: sousIds (who may edit the staff list), pingIds (who may write
     shift pings) and staffIds (who may set a PIN). Only the head chef can write sousIds and pingIds, so the owner keeps
     them in step with the roles when the admin panel opens. A sous chef can change a role or a Pings tick in the people
     list (the rules cannot tell one field of a person from another), so when the roles and the lists disagree the
     panel shows what changed and asks (idChanges, the card at the top of the admin panel) instead of saving it quietly.
     staffIds follows the people list by itself: a sous chef's staff page sends it too. */
  function sameIds(c, have, fn) { return (have || []).slice().sort().join(',') === idsFor(c.people, fn).sort().join(','); }
  function idChanges(c) {
    var out = [];
    if (!c || !c.people || !c.sousIds || !c.pingIds) return out;   // a list never seeded yet: nothing to ask about
    c.people.forEach(function (p) {
      if (p.active === false || !String(p.name).trim()) return;
      var sous = c.sousIds.indexOf(p.id) >= 0, ping = (c.pingIds || []).indexOf(p.id) >= 0;
      if (isSousP(p) !== sous) out.push({ p: p, sous: isSousP(p), what: isSousP(p) ? 'is now marked Sous chef' : 'is no longer marked Sous chef' });
      else if (canPingP(p) !== ping) out.push({ p: p, ping: canPingP(p), what: canPingP(p) ? 'is now ticked for Pings' : 'is no longer ticked for Pings' });
    });
    return out;
  }
  function seedIds() {
    var c = S.config; if (!c || !c.people) return;
    if (sameIds(c, c.sousIds, isSousP) && sameIds(c, c.pingIds, canPingP) && sameIds(c, c.staffIds, anyP)) return;
    var asking = idChanges(c).length > 0;
    if (asking && sameIds(c, c.staffIds, anyP)) return;
    saveConfig({ people: c.people, showBadges: c.showBadges, staffSee: c.staffSee }, asking ? { sousIds: c.sousIds, pingIds: c.pingIds } : null).catch(function () {});
  }
  function idCardHTML() {
    var c = S.config, ch = idChanges(c);
    if (!ch.length) return '';
    return '<section class="set-block a-ids"><span class="label">Changed from the prep book</span><span class="hint">A sous chef changed these in the people list. They only take effect once you keep them.</span>' +
      '<ul class="a-ids-list">' + ch.map(function (x) { return '<li><strong>' + esc(x.p.name) + '</strong> ' + x.what + '</li>'; }).join('') + '</ul>' +
      '<div class="btn-row"><button type="button" class="btn dark" data-p="a-ids-keep"' + (S.idBusy ? ' disabled' : '') + '>Keep these changes</button><button type="button" class="btn" data-p="a-ids-undo"' + (S.idBusy ? ' disabled' : '') + '>Undo them</button></div>' +
      (S.idMsg ? '<span class="saved" role="status">' + esc(S.idMsg) + '</span>' : '') + '</section>';
  }
  /* keep: the roles as they are become the lists. undo: the people list goes back to what the lists say. */
  function idDecide(keep) {
    var c = S.config, ch = idChanges(c); if (!ch.length || S.idBusy) return;
    var people = JSON.parse(JSON.stringify(c.people));
    if (!keep) ch.forEach(function (x) {
      var p = people.filter(function (q) { return q.id === x.p.id; })[0]; if (!p) return;
      if (x.sous !== undefined) { p.role = x.sous ? 'staff' : 'sous'; var r = ROLES[p.role]; p.add = r.add; p.tick = r.tick; p.del = r.del; p.ping = r.ping; }
      else p.ping = !x.ping;
    });
    S.idBusy = true; S.idMsg = 'Saving...'; draw();
    saveConfig({ people: people, showBadges: c.showBadges, staffSee: c.staffSee }).then(function () { S.idBusy = false; S.idMsg = ''; startDraft(); draw(); },
      function () { S.idBusy = false; S.idMsg = 'Could not save. Check the connection.'; draw(); });
  }
  /* ---------- the last 14 days, read once a day per phone ----------
     Past days hardly change, so they are read once a day and kept on the phone. Today comes from the live list.
     The weekly badges, usual amounts, Start here, Due today, the pace card and the close-out nudge all work from this. */
  var PAST_DAYS = 14, PAST_KEYS = ['text', 'station', 'qty', 'addedBy', 'addedById', 'addedAt', 'done', 'doneBy', 'doneById', 'doneAt', 'rolled', 'ahead', 'deleted', 'urgent'];
  function pastTag() { return S.pin + '|' + dayNow() + '|2'; }
  function loadPast() {
    var today = dayNow(), tag = pastTag();
    if (!fb || S.pastBusy || S.pastFor === tag) return;
    try { var c = JSON.parse(lsGet('lk.past') || 'null'); if (c && c.tag === tag && c.days) { S.past = c.days; S.pastFor = tag; pastDerive(); return; } } catch (e) {}
    S.pastBusy = true;
    var dates = [], i;
    for (i = 1; i <= PAST_DAYS; i++) dates.push(shift(today, -i));
    Promise.all(dates.map(function (d) { return fb.fs.getDocs(itemsCol(d)).then(function (sn) { return [d, sn.docs.map(function (x) { var v = x.data(), o = { id: x.id }; PAST_KEYS.forEach(function (k) { if (v[k] != null && v[k] !== '' && v[k] !== false && v[k] !== 0) o[k] = v[k]; }); return o; })]; }, function () { return [d, null]; }); })).then(function (res) {
      var days = {}, ok = true;
      res.forEach(function (r) { if (r[1] === null) ok = false; else days[r[0]] = r[1]; });
      S.past = days; S.pastFor = tag; S.pastBusy = false;
      if (ok) lsSet('lk.past', JSON.stringify({ tag: tag, days: days }));
      pastDerive(); draw();
    });
  }
  function pastDays(n) { var today = dayNow(), out = [], i; for (i = 1; i <= n; i++) { var d = shift(today, -i); if (S.past && S.past[d]) out.push([d, S.past[d]]); } return out; }
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
    pastDays(PAST_DAYS).forEach(function (e) { var mx = 0; e[1].forEach(function (x) { if (x.done && x.doneAt && !x.deleted) mx = Math.max(mx, x.doneAt); }); if (mx) { lasts.push(T.mins(mx)); } });
    lasts.sort(function (a, b) { return a - b; });
    S.closeMin = lasts.length >= 3 ? lasts[Math.floor(lasts.length / 2)] : 0;
  }
  /* Weekly badges: ticks over the last 7 days, today included (from the live list). */
  function weekRanks() {
    var counts = {}, start = T.at(shift(dayNow(), -6));
    var lists = pastDays(6).map(function (e) { return e[1]; }).concat([S.date === dayNow() ? S.items : []]);
    lists.forEach(function (l) { l.forEach(function (x) { if (x.done && !x.deleted && x.doneBy && (x.doneAt || 0) >= start) counts[x.doneBy] = (counts[x.doneBy] || 0) + 1; }); });
    var arr = Object.keys(counts).map(function (n) { return { name: n, n: counts[n] }; }).sort(function (a, b) { return b.n - a.n || a.name.localeCompare(b.name); });
    var rank = 0, prev = -1;
    arr.forEach(function (x, k) { if (x.n !== prev) { rank = k + 1; prev = x.n; } x.rank = rank; });
    return arr;
  }
  /* Due today: made on 3 or more of the last 14 days, about every 4 days or more often, and the usual gap has passed. */
  function dueList() {
    var m = {}, today = dayNow(), have = onList();
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
    var mins = T.mins(), dn = T.dow(), all = [], same = [];
    pastDays(PAST_DAYS).forEach(function (e) {
      var l = e[1].filter(function (x) { return !x.deleted; }); if (l.length < 5) return;
      var by = l.filter(function (x) { if (!x.done || !x.doneAt) return false; return T.mins(x.doneAt) <= mins; }).length;
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
    var today = dayNow();
    if (S.date !== today || !S.closeMin || !can('add') || lsGet('lk.closeout') === today) return '';
    var mins = T.mins(), open = live.filter(function (x) { return !x.done; }).length;
    if (mins < S.closeMin - 60 || !open) return '';
    return '<div class="nb-flag nb-close"><span class="nb-sl">Closing soon</span><p>The last tick is usually around ' + hhmm(S.closeMin) + '. ' + open + (open === 1 ? ' line is' : ' lines are') + ' still open and will roll to tomorrow. Mark what matters urgent, and log any waste before you go.</p>' +
      '<div class="btn-row"><a class="btn" href="#/waste">Log waste</a><button type="button" class="btn" data-p="close-hide">Hide for today</button></div></div>';
  }
  var MEDAL = { 1: '#C9971C', 2: '#8E959C', 3: '#A8693A' };
  function isSous() { var p = me(); return !!(p && isSousP(p)); }
  /* shift pings: sous chefs, and anyone the head chef ticked for Pings in the People tab */
  function canPing() { var p = me(); return !!(p && canPingP(p)); }
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
    var today = dayNow(), dates = [], i;
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
    var today = dayNow(), out = [], i, dw = AF().dow;
    for (i = n - 1 + offset; i >= offset; i--) { var d = shift(today, -i); if (dw === '' || String(parseYmd(d).getDay()) === dw) out.push(d); }
    return out;
  }
  function afItems(d) { var sec = AF().sec; return ((S.stats && S.stats.days[d]) || []).filter(function (x) { return !x.deleted && (!sec || (x.station || 'General') === sec); }); }
  /* the Person filter: a line counts when the person wrote it, or when it rolled over from a line they wrote (origBy is a
     name, since rolled copies carry no id). Every number and chart on Insights goes through this, so they agree. */
  function afMine(x) { var who = AF().who; return !who || (x.rolled ? x.origBy === personName(who) : x.addedById === who); }
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
    var a = AF(), who = a.who, dates = afDates(n, offset || 0), h;
    var agg = { dates: dates, perDay: {}, people: {}, sections: {}, wHour: [], tHour: [], times: [], written: 0, ticked: 0, rolled: 0, lines: 0, rollKeys: {}, fixes: [] };
    for (h = 0; h < 24; h++) { agg.wHour.push(0); agg.tHour.push(0); }
    dates.forEach(function (d) {
      var pd = agg.perDay[d] = { w: 0, t: 0, r: 0, n: 0 };
      afItems(d).forEach(function (x) {
        var mine = afMine(x);
        if (x.rolled) {
          if (mine && rolledN(x)) {
            pd.r++; agg.rolled++;
            var k = String(x.text || '').trim().toLowerCase(), rk = agg.rollKeys[k] = agg.rollKeys[k] || { text: String(x.text || '').trim(), n: 0, max: 0 };
            rk.n++; if (rolledN(x) > rk.max) rk.max = rolledN(x);
          }
        } else if (mine) {
          pd.w++; agg.written++;
          var nm = x.addedBy || 'Unknown', pp = agg.people[nm] = agg.people[nm] || { w: 0, t: 0 };
          pp.w++;
          if (x.station) agg.sections[x.station] = (agg.sections[x.station] || 0) + 1;
          if (x.addedAt) agg.wHour[T.hour(x.addedAt)]++;
          if (x.orig && x.orig !== x.text) agg.fixes.push({ d: d, from: x.orig, to: x.text, by: x.addedBy || '' });
        }
        if (!who) pd.n++;
        if (x.done && (!who || x.doneById === who)) {
          pd.t++; agg.ticked++;
          var tn = x.doneBy || 'Unknown', tp = agg.people[tn] = agg.people[tn] || { w: 0, t: 0 };
          tp.t++;
          if (x.doneAt) { agg.tHour[T.hour(x.doneAt)]++; if (!x.rolled && x.addedAt && x.doneAt > x.addedAt) agg.times.push(x.doneAt - x.addedAt); }
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
  /* Charts are drawn at the screen's width on a phone, so their words stay readable (a 720 wide drawing shrunk onto a
     phone made the axis about 5 px), and a tap on a bar shows its numbers under the chart (phones never show the
     hover titles). */
  function chW() { var w = window.innerWidth || 1024; return w < 600 ? Math.max(280, Math.min(720, w - 96)) : 720; }
  document.addEventListener('click', function (e) {
    var g = e.target.closest && e.target.closest('svg.ch g'); if (!g) return;
    var t = g.querySelector('title'), svg = g.closest('svg.ch'); if (!t || !svg) return;
    var rd = svg.nextElementSibling && svg.nextElementSibling.classList.contains('ch-read') ? svg.nextElementSibling : null;
    if (!rd) { rd = document.createElement('p'); rd.className = 'ch-read'; rd.setAttribute('role', 'status'); svg.parentNode.insertBefore(rd, svg.nextSibling); }
    rd.textContent = t.textContent;
  });
  function dailyChart(agg) {
    var W = chW(), H = 250, l = 34, r = 8, t = 12, b = 30, ph = H - t - b, pw = W - l - r, n = agg.dates.length, band = pw / n, bw = Math.min(12, band * 0.34), max = 0;
    agg.dates.forEach(function (d) { max = Math.max(max, agg.perDay[d].w, agg.perDay[d].t); });
    max = niceMax(max);
    var out = '<svg class="ch" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Lines written and ticked each day">' + yGrid(W, l, r, t, ph, max, function (v) { return Math.round(v); });
    agg.dates.forEach(function (d, i) {
      var pd = agg.perDay[d], cx = l + band * i + band / 2, hw = pd.w / max * ph, ht = pd.t / max * ph;
      var dn = parseYmd(d).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
      out += '<g><title>' + esc(dn + ': ' + pd.w + ' written, ' + pd.t + ' ticked') + '</title><rect x="' + (cx - band / 2) + '" y="' + t + '" width="' + band + '" height="' + ph + '" fill="transparent"/>' +
        (pd.w ? '<path d="' + barPath(cx - bw - 1, t + ph - hw, bw, hw, 4) + '" fill="' + CW + '"/>' : '') +
        (pd.t ? '<path d="' + barPath(cx + 1, t + ph - ht, bw, ht, 4) + '" fill="' + CT + '"/>' : '') + '</g>';
      if (n <= (W < 600 ? 7 : 14) || i % 3 === 0 || i === n - 1) out += '<text class="ch-ax" x="' + cx + '" y="' + (H - 10) + '" text-anchor="middle">' + parseYmd(d).getDate() + '</text>';
    });
    return out + '</svg>';
  }
  function peopleChart(agg) {
    var rows = Object.keys(agg.people).map(function (n) { return { n: n, w: agg.people[n].w, t: agg.people[n].t }; }).filter(function (x) { return x.w || x.t; })
      .sort(function (a, b) { return (b.t - a.t) || (b.w - a.w); }).slice(0, 12);
    if (!rows.length) return '<p class="hint">Nothing written in this time yet.</p>';
    var W = chW(), l = 112, r = 44, rh = 34, H = rows.length * rh + 8, pw = W - l - r, max = niceMax(Math.max.apply(null, rows.map(function (x) { return Math.max(x.w, x.t); })));
    var out = '<svg class="ch" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc('Lines written and ticked by each person. Most ticked: ' + rows[0].n + ', ' + rows[0].t + ' ticked, ' + rows[0].w + ' written') + '">';
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
    var W = chW(), H = 230, l = 34, r = 14, t = 14, b = 28, ph = H - t - b, pw = W - l - r, n = hi - lo + 1, max = 0;
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
    var W = chW(), l = 150, r = 44, rh = 28, H = rows.length * rh + 8, pw = W - l - r, max = niceMax(rows[0].v), out = '<svg class="ch" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label || 'Lines per section') + '">';
    rows.forEach(function (x, i) {
      var y = 4 + i * rh, w = Math.max(4, x.v / max * pw);
      out += '<g><title>' + esc(x.n + ': ' + x.v + ' lines') + '</title><rect x="0" y="' + y + '" width="' + W + '" height="' + rh + '" fill="transparent"/><text class="ch-lb" x="' + (l - 10) + '" y="' + (y + 18) + '" text-anchor="end">' + esc(x.n.length > 20 ? x.n.slice(0, 19) + '…' : x.n) + '</text><path d="' + barPath(l, y + 5, w, 14, 4, true) + '" fill="' + CW + '"/><text class="ch-val" x="' + (l + w + 6) + '" y="' + (y + 17) + '">' + x.v + '</text></g>';
    });
    return out + '</svg>';
  }
  function fixesHTML(agg) {
    if (!agg.fixes.length) return '<h3 class="a-ch-h">Proofreader</h3><p class="hint">No lines needed correcting in this time.</p>';
    return '<h3 class="a-ch-h">Proofreader</h3><span class="hint">The latest corrections. Anyone can tap Undo straight after, and that word is then left alone on their device.</span>' + lvHTML({
      key: 'ins-fixes', items: agg.fixes.slice().reverse(), step: 10, tools: 10, noun: ['correction', 'corrections'], ph: 'Search typed or saved words',
      find: function (f) { return f.from + ' ' + f.to + ' ' + f.by; },
      sorts: [['new', 'Newest first', function () { return 0; }], ['az', 'Typed A to Z', function (a, b) { return String(a.from).toLowerCase().localeCompare(String(b.from).toLowerCase()); }]],
      cols: [
        { h: 'Typed', th: true, html: function (f) { return esc(f.from); } },
        { h: 'Saved as', html: function (f) { return esc(f.to); } },
        { h: 'By', html: function (f) { return esc(f.by); } },
        { h: 'Day', html: function (f) { return esc(parseYmd(f.d).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })); } }
      ]
    });
  }
  function rollChart(agg) {
    var rows = Object.keys(agg.rollKeys).map(function (k) { return agg.rollKeys[k]; }).sort(function (a, b) { return b.n - a.n || b.max - a.max; }).slice(0, 10);
    if (!rows.length) return '<p class="hint">Nothing has rolled over in this time. That is a good sign.</p>';
    var W = chW(), l = 190, r = 44, rh = 28, H = rows.length * rh + 8, pw = W - l - r, max = niceMax(rows[0].n), out = '<svg class="ch" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Lines that rolled over most often">';
    rows.forEach(function (x, i) {
      var y = 4 + i * rh, w = Math.max(4, x.n / max * pw);
      out += '<g><title>' + esc(x.text + ': rolled over ' + x.n + (x.n === 1 ? ' time' : ' times') + ', longest run ' + x.max + (x.max === 1 ? ' day' : ' days')) + '</title><rect x="0" y="' + y + '" width="' + W + '" height="' + rh + '" fill="transparent"/><text class="ch-lb" x="' + (l - 10) + '" y="' + (y + 18) + '" text-anchor="end">' + esc(x.text.length > 26 ? x.text.slice(0, 25) + '…' : x.text) + '</text><path d="' + barPath(l, y + 5, w, 14, 4, true) + '" fill="' + CT + '"/><text class="ch-val" x="' + (l + w + 6) + '" y="' + (y + 17) + '">' + x.n + '</text></g>';
    });
    return out + '</svg>';
  }
  var DOWS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];
  /* Every learned item, not just the top 40: it keeps growing as lines are written. */
  function learnedListHTML(list) {
    return lvHTML({
      key: 'learned', items: list, step: 20, tools: 12, noun: ['item', 'items'], ph: 'Search items', empty: 'Nothing learned yet.',
      find: function (x) { return x.text + ' ' + bestSection(x); },
      filters: [['all', 'All items'], ['reg', 'Regulars', function (x) { return isRegular(x); }], ['hid', 'Hidden', function (x) { return !!x.hidden; }], ['one', 'Written once', function (x) { return (x.uses || 0) <= 1; }]],
      sorts: [['uses', 'Most used', function (a, b) { return (b.uses || 0) - (a.uses || 0); }], ['az', 'A to Z', function (a, b) { return String(a.text).toLowerCase().localeCompare(String(b.text).toLowerCase()); }],
        ['new', 'Last used', function (a, b) { return (b.lastUsed || 0) - (a.lastUsed || 0); }], ['few', 'Least used', function (a, b) { return (a.uses || 0) - (b.uses || 0); }]],
      cols: [
        { h: 'Item', th: true, html: function (x) { return esc(x.text) + (x.hidden ? ' <span class="a-badge off">hidden</span>' : '') + (isRegular(x) ? ' <span class="a-badge">regular</span>' : ''); } },
        { h: 'Uses', html: function (x) { return String(x.uses || 0); } },
        { h: 'Typed/picked', html: function (x) { return (x.typed || 0) + '/' + (x.picked || 0); } },
        { h: 'Usual section', html: function (x) { return esc(bestSection(x)); } },
        { h: 'Last used', html: function (x) { return esc(ago(x.lastUsed)); } },
        { h: '', cls: 'a-act', html: function (x) { return '<button type="button" class="p-x" data-p="learn-hide" data-id="' + esc(x.id) + '" data-hide="' + (x.hidden ? '0' : '1') + '">' + (x.hidden ? 'Show in suggestions' : 'Hide from suggestions') + '</button>'; } }
      ]
    });
  }
  function learnedHTML() {
    var L = S.learned.filter(function (x) { return x.text; });
    var head = '<section class="set-block"><span class="label">What the prep list has learned</span><span class="hint">Every line written or picked is counted per item, weekday and section. An item becomes a regular after ' + REGULAR + ' uses.</span>';
    var btn = '<p class="hint">The book learns every night at 03:00 from the day before (up to ' + LEARN_DAYS + ' days back), so new lines show here the next morning.</p>';
    if (!L.length) return head + '<p class="hint">Nothing learned yet. The book learns every night at 03:00 from the day before.</p>' + btn + '</section>';
    var regs = L.filter(isRegular), picked = 0, typed = 0;
    L.forEach(function (x) { picked += x.picked || 0; typed += x.typed || 0; });
    var top = L.slice().sort(function (a, b) { return (b.uses || 0) - (a.uses || 0); });
    var tiles = [[L.length, 'items learned'], [regs.length, 'regulars'], [picked + typed ? Math.round(picked / (picked + typed) * 100) + '%' : 'n/a', 'added by tapping a suggestion'], [top[0].text, 'most written item']];
    var sec = {}; top.slice(0, 10).forEach(function (x) { sec[x.text] = x.uses || 0; });
    var heat = top.slice(0, 12).map(function (x) {
      var mx = Math.max.apply(null, DOWS.map(function (d) { return (x.dow || {})[d[0]] || 0; })) || 1;
      return '<tr><th scope="row">' + esc(x.text) + (x.hidden ? ' <span class="a-badge off">hidden</span>' : '') + '</th>' + DOWS.map(function (d) { var n = (x.dow || {})[d[0]] || 0; return '<td class="a-heat" style="background:rgba(235,104,52,' + (n ? (0.15 + 0.7 * n / mx).toFixed(2) : 0) + ')">' + (n || '') + '</td>'; }).join('') + '</tr>';
    }).join('');
    return head + btn + '<div class="a-tiles">' + tiles.map(function (x) { return '<div class="a-tile"><strong>' + esc(String(x[0])) + '</strong><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div>' +
      '<h3 class="a-ch-h">Most written items</h3>' + sectionsChart({ sections: sec }, 'Most written prep items') +
      '<h3 class="a-ch-h">Which days each item is written</h3><span class="hint">Number of times written on each weekday. Darker is more.</span>' +
      '<div class="a-scroll"><table class="a-table"><thead><tr><th scope="col">Item</th>' + DOWS.map(function (d) { return '<th scope="col">' + d[1] + '</th>'; }).join('') + '</tr></thead><tbody>' + heat + '</tbody></table></div>' +
      '<h3 class="a-ch-h">Manage learned items</h3><span class="hint">Hide a typo or a one-off so it stops showing as a suggestion. Typed and picked counts show as typed/picked.</span>' + learnedListHTML(top) + '</section>';
  }
  var DOW = [1, 2, 3, 4, 5, 6, 0], DOWN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var HB = { w: ['#FFFFFF', '#E3EEFA', '#C4DAF4', '#97BEEC', '#6CA2E4'] };   // the Rolled over mode uses SK, the orange scale declared below
  function heatHTML(n) {
    var occ = {}, cell = {}, tot = {}, secT = {}, mode = S.heat === 'r' ? 'r' : 'w', who = AF().who;
    afDates(n, 0).forEach(function (d) { var dw = parseYmd(d).getDay(); occ[dw] = (occ[dw] || 0) + 1;
      afItems(d).forEach(function (x) {
        if (mode === 'w' ? x.rolled : !rolledN(x)) return;
        if (!afMine(x)) return;
        var k = x.station || 'General', c = cell[k] = cell[k] || {};
        c[dw] = (c[dw] || 0) + 1; tot[dw] = (tot[dw] || 0) + 1; secT[k] = (secT[k] || 0) + 1;
      });
    });
    var secs = Object.keys(secT).sort(function (a, b) { return secT[b] - secT[a]; }).slice(0, 8), max = 0;
    function avg(v, dw) { return occ[dw] ? v / occ[dw] : 0; }
    secs.forEach(function (k) { DOW.forEach(function (dw) { max = Math.max(max, avg((cell[k] || {})[dw] || 0, dw)); }); });
    function td(v, dw, label) {
      var a = avg(v || 0, dw), lv = !a ? 0 : Math.min(4, 1 + Math.floor(a / (max || 1) * 3.999));
      return '<td class="sk-c" style="background:' + (mode === 'w' ? HB.w : SK)[lv] + '" title="' + esc(label + ', ' + DOWN[DOW.indexOf(dw)] + ': ' + (Math.round(a * 10) / 10) + ' a day') + '">' + (a ? Math.round(a * 10) / 10 : '<span class="sk-0">0</span>') + '</td>';
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
    afDates(n, 0).forEach(function (d) { all = all.concat(((S.stats && S.stats.days[d]) || []).filter(function (x) { var sec = AF().sec; return (!sec || (x.station || 'General') === sec) && afMine(x); })); });
    all.forEach(function (x) {
      var k = okey(x.text); if (!k) return;
      var e = m[k] = m[k] || { text: String(x.text).trim(), w: 0, tt: [], r: 0, del: 0 };
      if (x.rolled) { if (!x.deleted && rolledN(x)) e.r++; return; }
      if (x.deleted) { if (!x.mergedInto) e.del++; return; }
      e.w++;
      if (x.done && x.doneAt && x.addedAt && x.doneAt > x.addedAt) e.tt.push(x.doneAt - x.addedAt);
    });
    var rows = Object.keys(m).map(function (k) {
      var e = m[k], t = e.tt.sort(function (a, b) { return a - b; }), med = t.length >= 2 ? t[Math.floor(t.length / 2)] : 0, tips = [], score = 0;
      if (e.r >= 3) { tips.push('Rolls over a lot: start it earlier or split it into smaller jobs.'); score += e.r * 2; }
      if (med >= 4 * 3600000) { tips.push('Slow to finish: start it earlier in the day.'); score += 3; }
      if (e.del >= 2 && e.del / (e.w + e.del) >= 0.3) { tips.push('Often removed: check it is still needed.'); score += e.del; }
      return { e: e, med: med, tips: tips, score: score };
    }).filter(function (x) { return x.tips.length; }).sort(function (a, b) { return b.score - a.score; });
    if (!rows.length) return '<p class="hint">Nothing slow or sticky in this time.</p>';
    return lvHTML({
      key: 'ins-sticky', items: rows, step: 8, tools: 8, noun: ['line', 'lines'], ph: 'Search lines',
      find: function (x) { return x.e.text; },
      filters: [['all', 'All lines'], ['roll', 'Rolls over', function (x) { return x.e.r >= 3; }], ['slow', 'Slow to finish', function (x) { return x.med >= 4 * 3600000; }], ['rem', 'Often removed', function (x) { return x.e.del >= 2; }]],
      sorts: [['worst', 'Worst first', function (a, b) { return b.score - a.score; }], ['az', 'A to Z', function (a, b) { return a.e.text.toLowerCase().localeCompare(b.e.text.toLowerCase()); }], ['roll', 'Most rolled over', function (a, b) { return b.e.r - a.e.r; }]],
      cols: [
        { h: 'Line', th: true, html: function (x) { return esc(x.e.text); } },
        { h: 'Written', html: function (x) { return String(x.e.w); } },
        { h: 'Typical time to tick', html: function (x) { return x.med ? dur(x.med) : 'n/a'; } },
        { h: 'Rolled over', html: function (x) { return String(x.e.r); } },
        { h: 'Removed', html: function (x) { return String(x.e.del); } },
        { h: 'Suggestion', wide: true, html: function (x) { return x.tips.map(function (t) { return '<span class="a-flag">' + esc(t) + '</span>'; }).join(' '); } }
      ]
    });
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

  /* ---------- big admin lists ----------
     One helper for every admin list that can keep growing: a search box, filter chips with counts, a sort choice,
     a count line and "Show more" instead of one long scroll. On a wide screen a list is a table; on a phone each
     row turns into a small card, so nothing needs swiping sideways. A short list gets no tools and stays plain.
     cfg: { key, items, step (rows per page, 15), tools (show the tools from this many rows, 8), noun: [one, many],
            ph (search hint), find(item) (text to search), filters: [[id, label, test(item)]] (first is the default),
            sorts: [[id, label, compare(a, b)]] (first is the default), cols: [{ h, th, cls, wide, html(item) }]
            or card(item) (a list item for rows that are cards, not table rows), rowCls(item), empty, table (extra class) }
     The page remembers search, filter, sort and how many rows are open per list key until the tab is closed. */
  var LV = {}, LVR = {}, LV_BIG = 100000;
  function lvState(c) {
    var s = LV[c.key];
    if (!s) s = LV[c.key] = { q: '', f: c.filters && c.filters.length ? c.filters[0][0] : '', sort: c.sorts && c.sorts.length ? c.sorts[0][0] : '', shown: c.step || 15 };
    return s;
  }
  function lvRows(c) {
    var s = lvState(c), q = s.q.replace(/^\s+|\s+$/g, '').toLowerCase(), l = c.items, f, so, words;
    f = (c.filters || []).filter(function (x) { return x[0] === s.f; })[0];
    if (f && f[2]) l = l.filter(f[2]);
    if (q && c.find) { words = q.split(/\s+/); l = l.filter(function (it) { var t = String(c.find(it)).toLowerCase(); return words.every(function (w) { return t.indexOf(w) >= 0; }); }); }
    so = (c.sorts || []).filter(function (x) { return x[0] === s.sort; })[0];
    return so ? l.slice().sort(so[2]) : l;
  }
  function lvBody(c) {
    var s = lvState(c), step = c.step || 15, noun = c.noun || ['item', 'items'], total = c.items.length;
    if (!total) return '<p class="hint">' + esc(c.empty || 'Nothing here yet.') + '</p>';
    var rows = lvRows(c), all = rows.length;
    if (!all) return '<p class="hint lv-none">Nothing matches' + (s.q.replace(/\s/g, '') ? ' "' + esc(s.q.trim()) + '"' : ' this filter') + '. <button type="button" class="p-x" data-p="lv-clear" data-lv="' + esc(c.key) + '">Clear search and filter</button></p>';
    var lim = S.lvAll ? all : Math.max(step, s.shown), shown = rows.slice(0, lim), left = all - shown.length, body;
    if (c.card) body = '<ul class="lv-cards nt-rows">' + shown.map(c.card).join('') + '</ul>';
    else {
      body = '<div class="a-tablewrap lv-wrap"><table class="a-table a-plain lv-table' + (c.table ? ' ' + esc(c.table) : '') + '"><thead><tr>' + c.cols.map(function (x) {
        return '<th scope="col"' + (x.cls ? ' class="' + esc(x.cls) + '"' : '') + '>' + (x.h ? esc(x.h) : '<span class="visually-hidden">Actions</span>') + '</th>';
      }).join('') + '</tr></thead><tbody>' + shown.map(function (it) {
        return '<tr' + (c.rowCls && c.rowCls(it) ? ' class="' + esc(c.rowCls(it)) + '"' : '') + '>' + c.cols.map(function (x) {
          var inner = x.html(it);
          return x.th ? '<th scope="row">' + inner + '</th>' : '<td' + (x.h ? ' data-l="' + esc(x.h) + '"' : '') + (x.cls || x.wide ? ' class="' + esc((x.cls || '') + (x.wide ? ' lv-wide' : '')) + '"' : '') + '>' + inner + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
    }
    var count = '<p class="lv-count" role="status">' + (left ? 'Showing ' + shown.length + ' of ' + all : all) + (all !== total ? ' matching' : '') + ' ' + (all === 1 ? noun[0] : noun[1]) + (all !== total ? ' (' + total + ' in all)' : '') + '</p>';
    var more = '';
    if (left > 0) more = '<div class="btn-row lv-more"><button type="button" class="btn" data-p="lv-more" data-lv="' + esc(c.key) + '">Show ' + Math.min(step, left) + ' more</button>' + (left > step ? '<button type="button" class="btn" data-p="lv-all" data-lv="' + esc(c.key) + '">Show all ' + all + '</button>' : '') + '</div>';
    else if (shown.length > step && !S.lvAll) more = '<div class="btn-row lv-more"><button type="button" class="btn" data-p="lv-less" data-lv="' + esc(c.key) + '">Show fewer</button></div>';
    return count + body + more;
  }
  function lvHTML(c) {
    LVR[c.key] = c;
    var s = lvState(c), key = esc(c.key), bar = '';
    if (c.items.length >= (c.tools == null ? 8 : c.tools)) {
      var fl = (c.filters || []).map(function (f) { return { f: f, n: f[2] ? c.items.filter(f[2]).length : c.items.length }; }).filter(function (x, i) { return i === 0 || x.n > 0 || x.f[0] === s.f; });
      bar = '<div class="lv-tools">' +
        (c.find ? '<div class="lv-qw"><label class="visually-hidden" for="lv-q-' + key + '">Search</label><input id="lv-q-' + key + '" type="search" class="search lv-q" data-k="lv-q:' + key + '" placeholder="' + esc(c.ph || 'Search') + '" value="' + esc(s.q) + '" autocomplete="off" enterkeyhint="search"></div>' : '') +
        (c.sorts && c.sorts.length > 1 ? '<label class="a-f lv-sort"><span>Sort</span><select data-k="lv-s:' + key + '" aria-label="Sort">' + c.sorts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === s.sort ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>' : '') + '</div>' +
        (fl.length > 1 ? '<div class="chips lv-chips scroll" role="group" aria-label="Filter">' + fl.map(function (x) { return '<button type="button" class="chip" data-p="lv-f" data-lv="' + key + '" data-v="' + esc(x.f[0]) + '" aria-pressed="' + (x.f[0] === s.f) + '">' + esc(x.f[1]) + ' <span class="lv-n">' + x.n + '</span></button>'; }).join('') + '</div>' : '');
    }
    return '<div class="lv" data-lv="' + key + '">' + bar + '<div class="lv-body" data-lvb="' + key + '">' + lvBody(c) + '</div></div>';
  }
  /* redraw just the rows of one list, so the search box keeps its focus while someone types */
  function lvRefresh(key) {
    var c = LVR[key], b = S.root && S.root.querySelector('[data-lvb="' + key + '"]');
    if (!c || !b) return;
    b.innerHTML = lvBody(c);
    var s = lvState(c);
    Array.prototype.forEach.call(S.root.querySelectorAll('[data-p="lv-f"][data-lv="' + key + '"]'), function (ch) { ch.setAttribute('aria-pressed', ch.getAttribute('data-v') === s.f ? 'true' : 'false'); });
  }
  function lvClick(a, el) {
    var key = el.getAttribute('data-lv'), c = LVR[key]; if (!c) return;
    var s = lvState(c), step = c.step || 15;
    if (a === 'lv-f') { s.f = el.getAttribute('data-v'); s.shown = step; }
    else if (a === 'lv-more') s.shown = Math.max(step, s.shown) + step;
    else if (a === 'lv-all') s.shown = LV_BIG;
    else if (a === 'lv-less') s.shown = step;
    else if (a === 'lv-clear') {
      s.q = ''; s.f = c.filters && c.filters.length ? c.filters[0][0] : ''; s.shown = step;
      var qi = S.root.querySelector('[data-k="lv-q:' + key + '"]'); if (qi) qi.value = '';
      Array.prototype.forEach.call(S.root.querySelectorAll('[data-p="lv-f"][data-lv="' + key + '"]'), function (ch) { ch.setAttribute('aria-pressed', ch.getAttribute('data-v') === s.f ? 'true' : 'false'); });
    }
    lvRefresh(key);
  }
  /* a row that was just added must be on screen: clear the search and filter and open every row */
  function lvReveal(key) { var s = LV[key], c = LVR[key]; if (!s) return; s.q = ''; if (c && c.filters && c.filters.length) s.f = c.filters[0][0]; s.shown = LV_BIG; }
  /* printing shows every row, not just the first page */
  function lvPrintAll(on) { S.lvAll = !!on; Object.keys(LVR).forEach(lvRefresh); }
  /* Every day at a glance: a calendar, darker means more. Tap a day to open it in the prep book. */
  function calHTML(n) {
    var a = AF(), m = S.calM || 'done', today = dayNow(), agg = aggregate(n, 0), first = shift(today, -(n - 1)), start = first, i;
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
    return '<h3 class="a-ch-h">Every day at a glance <span class="a-sub">' + (m === 'done' ? 'share ticked' : m === 'w' ? 'lines written' : 'rolled over') + '</span></h3><span class="hint">Tap a day to open it in the prep book.</span>' + chips + key +
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
        var h = T.hour(t), k = dw + ':' + h;
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
      agg.dates.forEach(function (d) { afItems(d).forEach(function (x) { if (!afMine(x)) return; var k = x.station || 'General', e = sr[k] = sr[k] || { n: 0, r: 0 }; e.n++; if (rolledN(x)) e.r++; }); });
      var worst = Object.keys(sr).filter(function (k) { return sr[k].n >= 8; }).sort(function (x, y) { return sr[y].r / sr[y].n - sr[x].r / sr[x].n; })[0];
      if (worst && sr[worst].r) out.push(worst + ' rolls over most: ' + pct(sr[worst].r, sr[worst].n) + '% of its lines were carried from an earlier day.');
    }
    if (!a.who && prev && prev.lines && agg.lines) {
      var c = pct(agg.ticked, agg.lines), p = pct(prev.ticked, prev.lines);
      if (Math.abs(c - p) >= 5) out.push('The share of lines ticked off is ' + (c > p ? 'up' : 'down') + ' from ' + p + '% to ' + c + '% compared with the ' + n + ' days before.');
    }
    var slow = {};
    agg.dates.forEach(function (d) { afItems(d).forEach(function (x) { if (afMine(x) && !x.rolled && x.done && x.doneAt && x.addedAt && x.doneAt > x.addedAt) { var k = okey(x.text); (slow[k] = slow[k] || { t: x.text, v: [] }).v.push(x.doneAt - x.addedAt); } }); });
    var sl = Object.keys(slow).filter(function (k) { return slow[k].v.length >= 3; }).map(function (k) { var v = slow[k].v.sort(function (x, y) { return x - y; }); return { t: slow[k].t, m: v[Math.floor(v.length / 2)] }; }).sort(function (x, y) { return y.m - x.m; })[0];
    if (sl && sl.m >= 3600000) out.push(sl.t + ' takes longest to get ticked: usually ' + dur(sl.m) + ' after it is written.');
    if (S.wStats && !S.wStats.loading) {
      var from = shift(dayNow(), -(n - 1)), wm = {};
      S.wStats.lines.forEach(function (x) { if (!x.deleted && x.date >= from && (!a.sec || (x.station || 'General') === a.sec) && (!a.who || x.addedById === a.who)) { var k = okey(x.text); (wm[k] = wm[k] || { t: x.text, n: 0 }).n++; } });
      var tw = Object.keys(wm).sort(function (x, y) { return wm[y].n - wm[x].n; })[0];
      if (tw && wm[tw].n >= 2) out.push(wm[tw].t + ' is the most wasted item: logged ' + wm[tw].n + ' times.');
    }
    return out.length ? card('<h3 class="a-ch-h">What stands out</h3><ul class="a-list a-smart">' + out.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>', 'full') : '';
  }
  /* ---------- export and print (Insights, Team, Waste) ---------- */
  function rangeText(n) { var t = dayNow(); return n + ' days, ' + dayShort(shift(t, -(n - 1))) + ' to ' + dayShort(t); }
  function toolsHTML(kind, title) {
    var n = S.statsRange;
    return '<div class="a-tools"><div><h3 class="a-title">' + esc(title) + '</h3><span class="hint">' + esc(rangeText(n)) + ', compared with the ' + n + ' days before.</span></div>' +
      '<div class="a-tbtns"><button type="button" class="btn dark" data-p="print-tab">Print or save as PDF</button><button type="button" class="btn" data-p="csv" data-v="' + kind + '">Download CSV</button></div></div>' +
      '<div class="a-print-h"><strong>Leichhardt Kitchen Book</strong> &middot; ' + esc(title) + ' &middot; ' + esc(rangeText(n)) + '<span>Printed ' + esc(dayShort(dayNow()) + ' ' + clock(now())) + '</span></div>';
  }
  function printTab() {
    var pane = S.root && S.root.querySelector('.a-pane'); if (!pane) return;
    var closed = [].filter.call(pane.querySelectorAll('details'), function (d) { return !d.open; });
    closed.forEach(function (d) { d.open = true; });
    lvPrintAll(true);
    document.documentElement.classList.add('print-admin');
    function done() { document.documentElement.classList.remove('print-admin'); closed.forEach(function (d) { d.open = false; }); lvPrintAll(false); window.removeEventListener('afterprint', done); }
    window.addEventListener('afterprint', done);
    setTimeout(function () { window.print(); setTimeout(function () { if (document.documentElement.classList.contains('print-admin') && !window.matchMedia('print').matches) done(); }, 1500); }, 50);
  }
  function csvCell(v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function downloadCSV(name, rows) {
    var text = '﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
    var blob = new Blob([text], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function hm(ms) { return ms ? clock(ms) : ''; }
  function exportCSV(kind) {
    var n = S.statsRange, a = AF(), tag = dayNow() + '-' + n + 'd';
    if (kind === 'insights' && S.stats && !S.stats.loading) {
      var rows = [['Date', 'Weekday', 'Section', 'Line', 'Amount', 'Written by', 'Written on', 'Written at', 'Rolled over (times)', 'Ticked', 'Ticked by', 'Ticked at', 'Minutes to tick']];
      afDates(n, 0).forEach(function (d) { afItems(d).forEach(function (x) {
        if (!afMine(x) && !(a.who && x.doneById === a.who)) return;
        rows.push([d, DOWN[DOW.indexOf(parseYmd(d).getDay())], x.station || 'General', x.text, x.qty || '', x.rolled ? (x.origBy || '') : (x.addedBy || ''), firstAt(x) ? T.day(firstAt(x)) : '', hm(firstAt(x)), rolledN(x), x.done ? 'yes' : 'no', x.doneBy || '', hm(x.doneAt), x.done && x.doneAt && x.addedAt && !x.rolled ? Math.round((x.doneAt - x.addedAt) / 60000) : '']);
      }); });
      downloadCSV('leichhardt-prep-lines-' + tag + '.csv', rows);
    } else if (kind === 'waste' && S.wStats && !S.wStats.loading) {
      var ds = {}; afDates(n, 0).forEach(function (d) { ds[d] = 1; });
      var w = [['Date', 'Weekday', 'Time', 'Section', 'Item', 'Amount', 'Unit', 'Reason', 'Action', 'Logged by']];
      S.wStats.lines.filter(function (x) { return !x.deleted && ds[x.date] && (!a.sec || (x.station || 'General') === a.sec) && (!a.reason || x.reason === a.reason); })
        .sort(function (p, q) { return (p.date + hm(p.addedAt)) < (q.date + hm(q.addedAt)) ? -1 : 1; })
        .forEach(function (x) { w.push([x.date, DOWN[DOW.indexOf(parseYmd(x.date).getDay())], hm(x.addedAt), x.station || '', x.text, x.amount, x.unit, reasonName(x.reason), x.action || '', x.addedBy || '']); });
      downloadCSV('leichhardt-wastage-' + tag + '.csv', w);
    } else if (kind === 'team' && S.stats && !S.stats.loading) {
      var td = teamData(n), t = [['Person', 'Lines written', 'Days written', 'Lines ticked', 'Days ticked', 'Main section', 'Share in main section', 'Days in a row', 'Based on', 'Rotation', 'Last wrote']];
      ((S.config && S.config.people) || []).filter(function (p) { return p.active !== false; }).forEach(function (p) {
        var r = td.per[p.id] || blankRec(p.id), h = habit(r, td);
        t.push([p.name, r.w, Object.keys(r.days).length, r.t, Object.keys(r.tdays).length, h.top, h.tot ? Math.round(h.share * 100) + '%' : '', h.streak, h.basis, h.flag ? 'Consider rotating' + (h.suggest ? ' to ' + h.suggest : '') : '', r.last]);
      });
      downloadCSV('leichhardt-team-' + tag + '.csv', t);
    } else toast('Still loading. Try again in a moment.');
  }
  /* Typical time from written to ticked, per section. */
  function tickBySectionHTML(n) {
    var m = {}, who = AF().who;
    afDates(n, 0).forEach(function (d) { afItems(d).forEach(function (x) {
      if (x.rolled || !x.done || !x.doneAt || !x.addedAt || x.doneAt <= x.addedAt || (who && x.doneById !== who)) return;
      (m[x.station || 'General'] = m[x.station || 'General'] || []).push(x.doneAt - x.addedAt);
    }); });
    var rows = Object.keys(m).filter(function (k) { return m[k].length >= 2; }).map(function (k) { var v = m[k].sort(function (a, b) { return a - b; }); return { k: k, n: v.length, med: v[Math.floor(v.length / 2)], p90: v[Math.min(v.length - 1, Math.floor(v.length * 0.9))] }; }).sort(function (a, b) { return b.med - a.med; });
    if (!rows.length) return '<h3 class="a-ch-h">Time to tick by section</h3><p class="hint">Not enough ticked lines yet.</p>';
    return '<h3 class="a-ch-h">Time to tick by section</h3><span class="hint">From writing a line to ticking it. "Slow days" is how long the slowest 1 in 10 took.</span><div class="a-tablewrap"><table class="a-table a-plain"><thead><tr><th scope="col">Section</th><th scope="col">Lines</th><th scope="col">Typical</th><th scope="col">Slow days</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><th scope="row">' + esc(r.k) + '</th><td>' + r.n + '</td><td>' + dur(r.med) + '</td><td>' + dur(r.p90) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  var INS_SECS = [['ins-overview', 'Overview'], ['ins-days', 'Days'], ['ins-timing', 'Timing'], ['ins-sections', 'Sections and people'], ['ins-problems', 'Problem lines'], ['ins-book', 'Recipe book']];
  function secHead(i) { return '<h3 class="a-sh" id="' + INS_SECS[i][0] + '"><span class="a-sn">' + (i < 9 ? '0' : '') + (i + 1) + '</span>' + esc(INS_SECS[i][1]) + '</h3>'; }
  function insightsHTML() {
    var st = S.stats, n = S.statsRange, a = AF();
    var head = '<section class="set-block a-ins">' + toolsHTML('insights', 'Insights') + filtersHTML('insights') + filterNote('insights');
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
    var jump = '<nav class="a-jump" aria-label="Jump to">' + INS_SECS.map(function (x, i) { return '<button type="button" class="chip" data-p="jump" data-v="' + x[0] + '"><span class="a-sn">' + (i < 9 ? '0' : '') + (i + 1) + '</span>' + esc(x[1]) + '</button>'; }).join('') + '</nav>';
    return head + jump +
      '<section class="a-sec">' + secHead(0) + '<div class="a-tiles">' + tiles.map(tileHTML).join('') + '</div><div class="a-grid">' + smartHTML(agg, prev, n) + '</div></section>' +
      '<section class="a-sec">' + secHead(1) + '<div class="a-grid">' + card(calHTML(n), 'full') + card('<h3 class="a-ch-h">Lines each day</h3>' + legend([['Written', CW], ['Ticked off', CT]]) + dailyChart(agg) + tbl, 'full') + '</div></section>' +
      '<section class="a-sec">' + secHead(2) + '<div class="a-grid">' + card(hourHTML(n), 'full') + card(tickBySectionHTML(n)) + card('<h3 class="a-ch-h">Time of day</h3>' + legend([['Written', CW], ['Ticked off', CT]]) + hoursChart(agg)) + '</div></section>' +
      '<section class="a-sec">' + secHead(3) + '<div class="a-grid">' + card('<h3 class="a-ch-h">Load by weekday and section</h3><span class="hint">Which sections are busy on which days. Useful for the roster.</span>' + heatHTML(n), 'full') +
        card('<h3 class="a-ch-h">Sections</h3>' + sectionsChart(agg)) + card('<h3 class="a-ch-h">By person</h3>' + legend([['Written', CW], ['Ticked off', CT]]) + peopleChart(agg) + '<p class="hint">More on people in the Team tab.</p>') + '</div></section>' +
      '<section class="a-sec">' + secHead(4) + '<div class="a-grid">' + card('<h3 class="a-ch-h">Slow and sticky lines</h3><span class="hint">Roll over 3 or more times, usually take 4 hours or more to tick, or keep being removed.</span>' + stickyHTML(n), 'full') +
        card('<h3 class="a-ch-h">Rolled over most often</h3><span class="hint">Lines that were not finished and moved onto the next day.</span>' + rollChart(agg)) + card(fixesHTML(agg)) + '</div></section>' +
      '<section class="a-sec">' + secHead(5) + '<p class="hint a-fnote">Recipe book counts are for everyone and every day: the filters above do not apply here.</p><div class="a-grid">' + card(missesHTML()) + card(viewsHTML()) + '</div></section></section>';
  }



  /* ---------- drawing ---------- */
  var TICK = '<svg viewBox="0 0 26 26" width="26" height="26" aria-hidden="true"><path d="M5 14 L11 20 L22 5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function openLabel() { return { orders: 'Open the order list', waste: 'Open the wastage log', minutes: 'Open the minutes', guides: 'Open the guides', mail: 'Open kitchen mail' }[S.name] || 'Open the prep list'; }
  function gateHTML() {
    return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Kitchen PIN</h2><p class="hint">Enter the kitchen PIN to open the prep list, orders, wastage, minutes and guides. This phone remembers it.</p>' +
      '<div class="field"><label class="label" for="p-pin">PIN</label>' + pinField('p-pin', 'p-pin', S.pinInput, true) + '</div>' +
      (S.pinError ? '<p class="p-err" role="alert">' + esc(S.pinError) + '</p>' : '') +
      '<div class="btn-row"><button type="button" class="btn dark" data-p="pin-go">' + openLabel() + '</button></div></section>';
  }
  function whoHTML() {
    var list = people(), here = hereGet(), first = [], rest = [];
    // the people who signed in on this device today come first, newest first: one tap and 4 digits on a shared tablet
    here.forEach(function (id) { var p = list.filter(function (x) { return x.id === id; })[0]; if (p) first.push(p); });
    list.forEach(function (p) { if (first.indexOf(p) < 0) rest.push(p); });
    function names(l) { return '<div class="p-names">' + l.map(function (p) { return '<button type="button" class="chip p-name" data-p="who" data-id="' + esc(p.id) + '">' + esc(p.name) + '</button>'; }).join('') + '</div>'; }
    return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Who are you?</h2><p class="hint">' + (S.pending ? 'Pick your name and type your PIN. Then it is done for you.' : 'Pick your name. The first time, you choose your own 4-digit PIN to go with it.') + '</p>' +
      (!list.length ? '<p class="p-err">No names are set up yet. The head chef adds them in the admin panel.</p>' :
        first.length ? '<p class="nb-ql p-here">Here today</p>' + names(first) + (rest.length ? '<p class="nb-ql p-here">Everyone</p>' + names(rest) : '') : names(list)) +
      (S.picking && shared() ? '<div class="btn-row"><button type="button" class="btn" data-p="who-back">Back to the list</button></div>' : '') + '</section>';
  }
  function ownPinHTML() {
    var p = who(), step = S.pinStep;
    if (!p) return whoHTML();
    if (step === 'error') return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">' + esc(p.name) + '</h2><p class="p-err">Could not check your PIN. Check the connection.</p><div class="btn-row"><button type="button" class="btn dark" data-p="who" data-id="' + esc(p.id) + '">Try again</button><button type="button" class="btn" data-p="who-change">Not me</button></div></section>';
    var setting = step === 'set', checking = step !== 'set' && step !== 'enter';
    // while the book checks whether this person has a PIN yet, the box is already there: it takes the keyboard inside
    // the tap on the name (an iPhone opens the keyboard only inside a tap), and a PIN typed early is sent once it knows
    return '<form class="p-card" data-p-form="pin"><h2 class="p-h" id="rtitle" tabindex="-1">' + (setting ? 'Hi ' + esc(p.name) + ', choose your PIN' : esc(p.name) + ', enter your PIN') + '</h2>' +
      '<p class="hint">' + (setting ? 'Pick 4 digits you will remember. You use it with your name from now on. ' + (shared() ? 'This device asks who you are again after 10 minutes.' : 'This phone stays signed in.') : checking ? 'One moment...' : 'Your own 4-digit PIN.') + '</p>' +
      '<div class="field"><label class="label" for="pf1">' + (setting ? 'New PIN' : 'PIN') + '</label>' + pinField('pf1', 'pf1', S.pf1, true) + '</div>' +
      (setting ? '<div class="field"><label class="label" for="pf2">Type it again</label>' + pinField('pf2', 'pf2', S.pf2, true) + '</div>' : '') +
      (S.pinMsg ? '<p class="p-err" role="alert">' + esc(S.pinMsg) + '</p>' : '') +
      '<div class="btn-row"><button type="submit" class="btn dark">' + (setting ? 'Save my PIN' : openLabel()) + '</button><button type="button" class="btn" data-p="who-change">Not me</button></div></form>';
  }

  var BOX = '<svg viewBox="0 0 26 26" width="26" height="26" aria-hidden="true"><rect x="2.5" y="2.5" width="21" height="21" rx="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  function rowHTML(x, date, readonly, also) {
    var tickOk = can('tick') && !x.deleted && (!x.done || canUntick(x)), delOk = can('del');
    var by = x.done && x.doneBy ? esc(x.doneBy) + (x.doneAt ? ' ' + clock(x.doneAt) : '') : (rolledN(x) ? (x.origBy ? 'from ' + esc(x.origBy) : '') : x.rolled ? esc(x.origBy || '') : (x.addedBy ? esc(x.addedBy) : ''));
    var marks = (x.urgent ? '<span class="nb-urg">Urgent</span>' : '') + (rolledN(x) ? '<span class="nb-roll" title="Not finished earlier, so it rolled over">Rolled' + (rolledN(x) > 1 ? ' x' + rolledN(x) : '') + '</span>' : '') +
      (x.deleted && x.mergedInto ? '<span class="nb-also">Double up</span>' : (also || ''));
    var star = can('add') && !x.deleted && !readonly ? '<button type="button" class="nb-star" data-p="urgent" data-id="' + esc(x.id) + '" aria-pressed="' + !!x.urgent + '" aria-label="' + esc((x.urgent ? 'Not urgent: ' : 'Mark urgent: ') + x.text) + '">!</button>' : '';
    var rid = x.recipe || ((matchRecipe(x.text) || {}).id || ''), rr = rid ? recipeById(rid) : null;
    var link = rid ? '<a class="nb-go" href="#/r/' + encodeURIComponent(rid) + '" title="' + esc(rr ? 'Open the ' + rr.name + ' card' : 'Open the recipe') + '" aria-label="' + esc(rr ? 'Open the ' + rr.name + ' card' : 'Open the recipe') + '">recipe</a>' : '';
    var del = delOk ? '<button type="button" class="nb-x" data-p="' + (x.deleted ? 'restore' : 'del') + '" data-id="' + esc(x.id) + '" data-d="' + esc(date) + '" aria-label="' + (x.deleted ? 'Put back ' : 'Remove ') + esc(x.text) + '">' + (x.deleted ? 'Put back' : 'Remove') + '</button>' : '';
    return '<li id="nbr-' + esc(x.id) + '" class="nb-row' + (x.done ? ' is-done' : '') + (rolledN(x) && !x.done ? ' is-rolled' : '') + (x.urgent && !x.done ? ' is-urgent' : '') + (x.deleted ? ' is-removed' : '') + '">' +
      '<button type="button" class="nb-box" data-p="tick" data-id="' + esc(x.id) + '" data-d="' + esc(date) + '" aria-pressed="' + !!x.done + '" aria-label="' + esc((x.done ? 'Untick ' : 'Tick ') + x.text) + '"' + (tickOk ? '' : ' disabled') + '>' + (x.done ? TICK : BOX) + '</button>' +
      // a tap on the words ticks too (the box is the button for keyboards and screen readers); Undo and the linger cover a slip
      '<span class="nb-t' + (tickOk && !readonly ? ' nb-tt' : '') + '"' + (tickOk && !readonly ? ' data-p="tick" data-id="' + esc(x.id) + '" data-d="' + esc(date) + '"' : '') + (x.orig ? ' title="' + esc('Corrected from: ' + x.orig) + '"' : '') + '>' + esc(x.text) + (x.qty ? ' <span class="nb-q">' + esc(x.qty) + '</span>' : '') + (marks ? ' <span class="nb-marks">' + marks + '</span>' : '') + '</span>' +
      '<span class="nb-by">' + (x._unsent ? '<span class="nb-unsent">Not sent</span> ' : '') + by + '</span>' + (star || link || del ? '<span class="nb-acts">' + star + link + del + '</span>' : '') + '</li>';
  }
  /* A line ticked on this phone stays where it is, struck through, for 3.5 seconds before it leaves the list. */
  var LINGER = 3500;
  function lingers(x) { return x.done && !x.deleted && x.doneById === S.who && now() - (x.doneAt || 0) < LINGER; }
  function pageBody(items, date) {
    /* ticked lines leave the list and show under Done today in Handy. Sections with nothing left to do are hidden. */
    var shown = items.filter(function (x) { return (S.showRemoved || !x.deleted) && inTab(x); });
    shown.sort(sortItems);
    var order = [], seen = {}, twins = {};
    dupGroups(items).forEach(function (g) { twins[dupKey(g[0].text)] = g; });
    // on a section's tab every line sits under that section, also a line merged into another section
    function secOf(x) { return S.tab || x.station || ''; }
    shown.forEach(function (x) { var k = secOf(x); if (!seen[k]) { seen[k] = 1; order.push(k); } });
    return order.map(function (sec) {
      var all = shown.filter(function (x) { return secOf(x) === sec; });
      var live = all.filter(function (x) { return !x.deleted; });
      var rows = all.filter(function (x) { return !(x.done && !x.deleted) || lingers(x); });
      if (!rows.length) return '';
      return (sec ? '<div class="nb-hd"><span>' + esc(sec) + '</span><span>' + live.filter(function (x) { return x.done; }).length + '/' + live.length + '</span></div>' : '') +
        '<ul class="nb-rows">' + rows.map(function (x) { return rowHTML(x, date, false, alsoHTML(x, sec, twins)); }).join('') + '</ul>';
    }).join('');
  }
  /* "Add from the recipes" opens a panel that floats over the list (it does not push the list or the add form around).
     Nothing is listed until the person types or taps Show all. The list inside scrolls. */
  function recipePicker() {
    var s = S.recipeSearch.trim().toLowerCase();
    var all = D.recipes.filter(function (r) { return r.kind === 'batch' || r.kind === 'component'; });
    var btn = '<button type="button" class="nb-btn p-pickbtn" data-p="recipe-toggle" aria-expanded="' + !!S.recipeOpen + '">Add from the recipes</button>';
    if (!S.recipeOpen) return '<div class="p-pick">' + btn + '</div>';
    var list = s ? all.filter(function (r) { return (r.name + ' ' + (r.short || '')).toLowerCase().indexOf(s) >= 0; }).slice(0, 40) : (S.recipeAll ? all : []);
    var body = list.length ? '<div class="p-recipes">' + list.map(function (r) { return '<button type="button" class="chip sq" data-p="add-recipe" data-id="' + esc(r.id) + '">' + esc(r.short || r.name) + '</button>'; }).join('') + '</div>'
      : (s ? '<p class="hint">No recipe matches.</p>' : '<p class="hint">Type a name to find a recipe.</p><button type="button" class="p-link" data-p="recipe-all">Show all ' + all.length + ' recipes</button>');
    return '<div class="p-pick is-open">' + btn + '<div class="p-pick-panel" role="dialog" aria-label="Add from the recipes">' +
      '<div class="p-pick-h"><label class="label" for="p-rs">Find a batch or component recipe</label><button type="button" class="p-link" data-p="recipe-close">Close</button></div>' +
      '<input id="p-rs" class="search" type="search" data-k="p-rs" autocomplete="off" placeholder="Start typing..." value="' + esc(S.recipeSearch) + '">' + body +
      '<p class="hint">It goes under the section written in the add box.</p></div></div>';
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
    var have = onList(), dn = String(parseYmd(S.date).getDay()), dname = parseYmd(S.date).toLocaleDateString('en-AU', { weekday: 'long' });
    /* Quick add: due today first, then usual for this weekday, then regulars. A line shows once, in the first group it fits. */
    var onToday = S.date === dayNow();
    var due = can('add') && onToday && S.past ? dueList() : [];
    var shownK = {}; due.forEach(function (x) { shownK[x.k] = 1; });
    var today2 = S.learned.filter(function (x) { return !x.hidden && !have[x.id] && !shownK[x.id] && x.text && ((x.dow || {})[dn] || 0) >= 2; }).sort(function (a, b) { return ((b.dow || {})[dn] || 0) - ((a.dow || {})[dn] || 0) || (b.uses || 0) - (a.uses || 0); }).slice(0, 12);
    today2.forEach(function (x) { shownK[x.id] = 1; });
    var regs = S.learned.filter(function (x) { return isRegular(x) && !have[x.id] && !shownK[x.id] && x.text; }).sort(function (a, b) { return (b.uses || 0) - (a.uses || 0); }).slice(0, 14);
    S.quick = [];
    function chip(text, sec, note) { var uq = usualQty(text); S.quick.push({ text: text, section: sec }); return '<button type="button" class="chip sq" data-p="quick" data-i="' + (S.quick.length - 1) + '">' + esc(text) + (uq ? ' <span class="nb-uq">' + esc(uq) + '</span>' : '') + ' <span class="nb-us">' + esc(note) + '</span></button>'; }
    var chips = can('add') && onToday ? due.map(function (x) { return chip(x.text, x.sec, (x.gap === 1 ? 'daily' : 'every ' + x.gap + ' days') + ', last ' + parseYmd(x.last).toLocaleDateString('en-AU', { weekday: 'short' })); })
      .concat(today2.map(function (x) { return chip(x.text, bestSection(x), ((x.dow || {})[dn] || 0) + ' ' + dname + 's'); }))
      .concat(regs.map(function (x) { return chip(x.text, bestSection(x), x.uses + 'x'); })).join('') : '';
    S.quickChips = chips;
    var quick = chips ? '<h3 class="nb-sh">Quick add</h3><p class="nb-sd">Due today, usual for a ' + esc(dname) + ' and regulars. Tap to add.</p><div class="nb-usual">' + chips + '</div>' : '';
    var pc = canBrowse() && S.date === dayNow() && S.past ? pace() : null;
    var paceHTML = pc ? '<div class="nb-pace' + (pc.today + 0.1 < pc.usual ? ' is-behind' : '') + '"><span class="nb-sl">Pace</span><p><strong>' + Math.round(pc.today * 100) + '%</strong> ticked now (' + pc.done + ' of ' + pc.n + '). By ' + clock(now()) + ' it is usually <strong>' + Math.round(pc.usual * 100) + '%</strong>' + (pc.sameDay ? ' on a ' + esc(dname) : '') + '.</p><span class="nb-sw">' + (pc.today + 0.1 < pc.usual ? 'Behind the usual pace. Check who needs a hand.' : 'On pace.') + ' Only the head chef and sous chefs see this.</span></div>' : '';
    var stuck = canBrowse() && S.date === dayNow() ? live.filter(function (x) { return !x.done && rolledN(x) >= 3; }) : [];
    var stuckHTML = stuck.length ? '<h3 class="nb-sh">Stuck lines</h3><p class="nb-sd">Rolled over 3 or more times. Make it urgent, split it into smaller jobs, or remove it if it is not needed.</p><ul class="nb-stuck">' + stuck.map(function (x) {
      return '<li><span>' + esc(x.text) + ' <span class="nb-us">x' + rolledN(x) + '</span></span>' + (x.urgent ? '' : '<button type="button" class="p-x" data-p="urgent" data-id="' + esc(x.id) + '">Urgent</button>') + (can('del') ? '<button type="button" class="p-x" data-p="del" data-id="' + esc(x.id) + '" data-d="' + esc(S.date) + '">Remove</button>' : '') + '</li>';
    }).join('') + '</ul>' : '';
    var tools = '<h3 class="nb-sh">Tools</h3><div class="nb-tools">' +
      '<button type="button" class="nb-btn" data-p="copy">' + shareLabel('the list') + '</button>' +
      '<button type="button" class="nb-btn" data-p="print">Print the list</button>' +
      (featOn('minutes') ? '<a class="nb-btn" href="#/minutes">Meeting minutes</a>' : '') +
      '<a class="nb-btn" href="#/drinks">Drinks run</a>' +
      (canPing() ? '<button type="button" class="nb-btn" data-p="notes-open">Shift pings</button>' : '') +
      (isSous() ? '<button type="button" class="nb-btn" data-p="mn-open">Minutes register</button><button type="button" class="nb-btn" data-p="staff-open">Manage staff</button>' : '') + '</div>';
    var dl = live.filter(function (x) { return x.done; }).sort(function (a, b) { return (b.doneAt || 0) - (a.doneAt || 0); });
    var donebox = '<h3 class="nb-sh" id="nb-donebox">' + (onToday ? 'Done today' : 'Done on ' + esc(dayShort(S.date))) + ' (' + dl.length + ')</h3>' + (dl.length ? '<ul class="nb-done">' + dl.map(function (x) {
      return '<li><span class="nb-dt">' + (x.doneAt ? clock(x.doneAt) : '') + '</span><span class="nb-dx">' + esc(x.text) + (x.qty ? ' <em>' + esc(x.qty) + '</em>' : '') + '</span><span class="nb-dw">' + esc(x.doneBy || '') + '</span>' + (can('tick') && canUntick(x) ? '<button type="button" class="p-x nb-undo" data-p="tick" data-id="' + esc(x.id) + '" data-d="' + esc(S.date) + '" aria-label="' + esc('Undo the tick on ' + x.text) + '">Undo</button>' : '') + '</li>';
    }).join('') + '</ul>' : '<p class="nb-sd">' + (onToday ? 'Nothing ticked yet.' : 'Nothing was ticked.') + '</p>');
    return startHTML(live, true) + paceHTML + stuckHTML + donebox + quick + tools;
  }
  function listHTML() {
    var p = me(), today = dayNow();
    if (S.date !== today && !canBrowse() && !S.user) { S.date = today; S.tab = ''; watchItems(); }
    if (S.authed && fb) { loadPast(); loadWRecent(false); }
    S.week = S.past ? weekRanks() : null;
    maybeRoll(); mergeDups(); ordRoll(); loadOrdLearned(); loadWNote();
    var live = S.items.filter(function (x) { return !x.deleted; }), doneN = live.filter(function (x) { return x.done; }).length;
    var removed = S.items.filter(function (x) { return x.deleted; });
    var secs = {}, tabs = [];
    S.items.forEach(function (x) { if (!x.deleted) [x.station].concat(x.also || []).forEach(function (n) { if (n && !secs[n]) { secs[n] = 1; tabs.push(n); } }); });
    var tabHTML = tabs.length ? '<nav class="nb-tabs" aria-label="Sections"><button type="button" class="nb-tab" data-p="tab" data-v="" aria-pressed="' + !S.tab + '">All</button>' +
      tabs.map(function (t) { return '<button type="button" class="nb-tab" data-p="tab" data-v="' + esc(t) + '" aria-pressed="' + (S.tab === t) + '">' + esc(t) + '</button>'; }).join('') + '</nav>' : '';
    var sug = suggestions(), sideH = sideHTML(today);
    var add = can('add') && S.date === today ?
      '<form class="nb-add" data-p-form="add"><datalist id="p-sections">' + sug.map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join('') + '</datalist>' +
      '<div class="nb-add-row"><label class="visually-hidden" for="p-text">Prep item</label><input id="p-text" class="nb-in nb-in-text" data-k="p-text" enterkeyhint="done" autocomplete="off" autocapitalize="sentences" placeholder="Write a new line..." maxlength="160" value="' + esc(S.text) + '">' +
      '<label class="visually-hidden" for="p-section">Section</label><input id="p-section" class="nb-in nb-in-sec" data-k="p-section" list="p-sections" enterkeyhint="next" autocomplete="off" placeholder="Section" maxlength="40" value="' + esc(S.section) + '">' +
      '<label class="visually-hidden" for="p-qty">Amount</label><input id="p-qty" class="nb-in nb-in-qty" data-k="p-qty" enterkeyhint="done" autocomplete="off" placeholder="Amount" maxlength="40" value="' + esc(S.qty) + '">' +
      '<button type="submit" class="nb-addbtn">Add</button></div><div class="nb-sugg" id="p-sugg">' + suggestHTML() + '</div><div class="nb-sugg nb-qs" id="p-qsugg">' + qtyChipsHTML() + '</div><p class="nb-hint" id="p-hint" aria-live="polite">' + esc(hintText(S.text)) + '</p>' + recipePicker() + (S.quickChips ? '<div class="nb-qadd"><span class="nb-ql">Quick add</span><div class="nb-usual">' + S.quickChips + '</div></div>' : '') + '</form>' : (S.date !== today ? '<p class="hint">You are looking at ' + esc(dayName(S.date)) + '. Lines are added on Today only.</p>' : '<p class="hint">You can read the book but not write in it. Ask the head chef if that is wrong.</p>');
    var todayEmpty = !live.length && S.itemsState === 'ok' ? '<p class="nb-empty">Nothing written for ' + esc(dayName(S.date).toLowerCase()) + ' yet.</p>' : '';
    if (live.length && doneN === live.length && !S.tab) todayEmpty = '<p class="nb-empty">Everything on this list is ticked off. See Done today under Handy.</p>';
    if (S.tab && !live.some(function (x) { return inTab(x) && (!x.done || lingers(x)); })) todayEmpty = '<p class="nb-empty">Nothing left to do in ' + esc(S.tab) + '. Ticked lines are under Done today in Handy.</p>';
    var left = '<section class="nb-page nb-left"><header class="nb-ph"><div><h2 class="nb-title" id="rtitle" tabindex="-1">' + esc(dayName(S.date)) + '</h2><span class="nb-date">' + esc(longDate(S.date)) + '</span></div>' +
      '<div class="nb-prog" role="status">' + doneN + ' of ' + live.length + ' done</div>' + (can('add') ? '<button type="button" class="nb-jump" data-p="write">Write a line</button>' : '') + (doneN ? '<button type="button" class="nb-jump nb-donejump" data-p="donejump">Done today (' + doneN + ')</button>' : '') + '</header>' +
      (S.itemsState === 'error' ? '<p class="p-err">Could not load this page. Check the connection.</p>' : '') +
      '<div class="nb-body">' + minNudgeHTML() + closeoutHTML(live) + wNoteHTML() + startHTML(live) + pageBody(S.items, S.date) + todayEmpty + '</div>' +
      '<div class="nb-foot">' + add + (add && !can('del') ? '<p class="hint nb-who">Wrote the wrong thing? Undo it straight away, or ask the head chef or a sous chef to remove it.</p>' : '') +
      (removed.length && can('del') ? '<button type="button" class="nb-link" data-p="removed">' + (S.showRemoved ? 'Hide' : 'Show') + ' removed (' + removed.length + ')</button>' : '') + '</div></section>';
    var right = '<section class="nb-page nb-right"><header class="nb-ph"><div><h2 class="nb-title nb-dim">Handy</h2><span class="nb-date">' + (S.date === today ? 'Done today, quick add and tools' : 'Done on ' + esc(dayShort(S.date)) + ' and tools') + '</span></div></header>' +
      '<div class="nb-body nb-side">' + sideH + '</div></section>';
    return '<div class="nb-top"><span>' + (p ? 'Writing as <strong>' + esc(p.name) + '</strong>' + (can('tick') ? '' : ' (read only)') + esc(myRank()) : '') + '</span><span class="p-links"><button type="button" class="p-link" data-p="who-change">Not you?</button>' + '' + '</span></div>' +
      (canBrowse() ? '<div class="nb-nav"><button type="button" class="chip" data-p="day" data-d="-1" aria-label="Back one day">&lsaquo;</button>' +
      '<button type="button" class="chip" data-p="today" aria-pressed="' + (S.date === today) + '">Today</button>' +
      '<label class="visually-hidden" for="p-day">Pick a date</label><input id="p-day" type="date" class="p-dateinput" data-k="p-day" value="' + esc(S.date) + '">' +
      '<button type="button" class="chip" data-p="day" data-d="1" aria-label="Forward one day">&rsaquo;</button></div>' : '') +
      badgeStrip() + '<div class="nb-wrap"><div class="nb">' + left + '<div class="nb-spine" aria-hidden="true"></div>' + right + '</div>' + tabHTML + '</div>';
  }
  function ago(ms) {
    if (!ms) return 'never';
    var m = Math.round((now() - ms) / 60000);
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
    var people = '<section class="set-block"><span class="label">Who is writing and ticking (all time)</span><span class="hint">Counted in the background since this feature started. Ticks that are taken back are taken off.</span>' + lvHTML({
      key: 'stats-people', items: peopleRows, step: 10, tools: 10, noun: ['person', 'people'], ph: 'Search names', empty: 'No people yet.',
      find: function (r) { return r.name; },
      sorts: [['busy', 'Most written and ticked', function (a, b) { return (b.added + b.ticked) - (a.added + a.ticked); }], ['seen', 'Last seen', function (a, b) { return b.lastSeen - a.lastSeen; }], ['az', 'A to Z', function (a, b) { return a.name.toLowerCase().localeCompare(b.name.toLowerCase()); }]],
      cols: [
        { h: 'Name', th: true, html: function (r) { return esc(r.name) + (topAdd && topAdd.added && r.id === topAdd.id ? ' <span class="a-badge">most written</span>' : '') + (topTick && topTick.ticked && r.id === topTick.id ? ' <span class="a-badge">most ticked</span>' : ''); } },
        { h: 'Lines written', html: function (r) { return String(r.added); } },
        { h: 'Ticked off', html: function (r) { return String(r.ticked); } },
        { h: 'Sign-ins', html: function (r) { return String(r.visits); } },
        { h: 'Last seen', html: function (r) { return esc(ago(r.lastSeen)); } }
      ]
    }) + '</section>';
    var secs = '<section class="set-block"><span class="label">Sections people have written</span><span class="hint">Sections appear by themselves when someone types a new one. Hide one to stop it showing as a suggestion.</span>' + lvHTML({
      key: 'stats-sections', items: S.sections.slice(), step: 15, noun: ['section', 'sections'], ph: 'Search sections', empty: 'No sections yet.',
      find: function (x) { return x.name; },
      filters: [['all', 'All'], ['shown', 'In suggestions', function (x) { return !x.hidden; }], ['hidden', 'Hidden', function (x) { return x.hidden; }]],
      sorts: [['uses', 'Most lines', function (a, b) { return (b.uses || 0) - (a.uses || 0); }], ['recent', 'Last used', function (a, b) { return (b.lastUsed || 0) - (a.lastUsed || 0); }], ['az', 'A to Z', function (a, b) { return String(a.name).toLowerCase().localeCompare(String(b.name).toLowerCase()); }]],
      cols: [
        { h: 'Section', th: true, html: function (x) { return esc(x.name) + (x.hidden ? ' <span class="a-badge off">hidden</span>' : ''); } },
        { h: 'Lines', html: function (x) { return String(x.uses || 0); } },
        { h: 'Last written by', html: function (x) { return esc(x.lastBy || ''); } },
        { h: 'Last used', html: function (x) { return esc(ago(x.lastUsed)); } },
        { h: '', html: function (x) { return '<button type="button" class="p-x" data-p="sec-hide" data-id="' + esc(x.id) + '" data-hide="' + (x.hidden ? '0' : '1') + '">' + (x.hidden ? 'Show in suggestions' : 'Hide from suggestions') + '</button>'; } }
      ]
    }) + '</section>';
    return part === 'sections' ? secs : people;
  }
  /* ---------- team: who writes where, who writes rarely, order tracking (owner) ---------- */
  function loadOrdStats(force) {
    if (!fb || S.configState !== 'ok') return;
    if (S.ordStats && (S.ordStats.loading || !force)) return;
    S.ordStats = { loading: true, lines: [] };
    var today = dayNow(), dates = [], i;
    for (i = 0; i < 30; i++) dates.push(shift(today, -i));
    Promise.all(dates.map(function (d) { return fb.fs.getDocs(ordCol(d)).then(function (s) { return s.docs.map(function (x) { var v = x.data(); v.id = x.id; v.date = d; return v; }); }, function () { return []; }); })).then(function (l) {
      S.ordStats = { loading: false, lines: ordNewest([].concat.apply([], l)) }; draw();
    });
  }
  function blankRec(id) { return { id: id, w: 0, days: {}, secDay: {}, secs: {}, t: 0, tdays: {}, tsecs: {}, tsecDay: {}, last: '' }; }
  function teamData(n) {
    var today = dayNow(), dates = [], i, names = {}, per = {}, secTotal = {}, tickSec = {}, activeDays = {};
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
    var chips = toolsHTML('team', 'Team') + filtersHTML('team');
    var habRows = rows.filter(function (x) { return x.h.tot; });
    var hab = habRows.length ? lvHTML({
      key: 'team-habits', items: habRows, step: 10, tools: 10, noun: ['person', 'people'], ph: 'Search names',
      find: function (x) { return x.p.name + ' ' + x.h.top; },
      filters: [['all', 'Everyone'], ['flag', 'Consider rotating', function (x) { return !!x.h.flag; }]],
      sorts: [['flag', 'Flagged first', function (a, b) { return (b.h.flag ? 1 : 0) - (a.h.flag ? 1 : 0) || b.h.streak - a.h.streak; }], ['az', 'A to Z', function (a, b) { return a.p.name.toLowerCase().localeCompare(b.p.name.toLowerCase()); }], ['streak', 'Longest in a row', function (a, b) { return b.h.streak - a.h.streak; }]],
      cols: [
        { h: 'Person', th: true, html: function (x) { return esc(x.p.name); } },
        { h: 'Lines', html: function (x) { return x.h.tot + ' <span class="o-who-i">' + (x.h.basis === 'ticks' ? 'ticked' : 'written') + '</span>'; } },
        { h: 'Main section', html: function (x) { return esc(x.h.top) + ' <span class="o-who-i">' + Math.round(x.h.share * 100) + '%</span>'; } },
        { h: 'Also', html: function (x) { return esc(x.h.also.join(', ') || 'none'); } },
        { h: 'In a row', html: function (x) { return x.h.streak + (x.h.streak === 1 ? ' day' : ' days'); } },
        { h: 'Rotation', wide: true, html: function (x) { return x.h.flag ? '<span class="a-flag">Consider rotating' + (x.h.suggest ? ' to ' + esc(x.h.suggest) : '') + '</span>' : '<span class="o-who-i">Fine for now</span>'; } }
      ]
    }) : '';
    var act = rows.length ? lvHTML({
      key: 'team-writers', items: rows.map(function (x) { x.quiet = td.nActive >= 3 && (td.nActive ? x.wd / td.nActive : 0) < 0.3; return x; }), step: 10, tools: 10, noun: ['person', 'people'], ph: 'Search names',
      find: function (x) { return x.p.name; },
      filters: [['all', 'Everyone'], ['quiet', 'Writes rarely', function (x) { return x.quiet; }]],
      sorts: [['few', 'Fewest days written', function (a, b) { return a.wd - b.wd || a.r.w - b.r.w; }], ['most', 'Most days written', function (a, b) { return b.wd - a.wd || b.r.w - a.r.w; }], ['az', 'A to Z', function (a, b) { return a.p.name.toLowerCase().localeCompare(b.p.name.toLowerCase()); }]],
      cols: [
        { h: 'Person', th: true, html: function (x) { return esc(x.p.name); } },
        { h: 'Lines', html: function (x) { return String(x.r.w); } },
        { h: 'Days written', html: function (x) { return x.wd + ' of ' + td.nActive; } },
        { h: 'Ticks', html: function (x) { return x.r.t + ' (' + x.tdN + ' days)'; } },
        { h: 'Last wrote', html: function (x) { return x.r.last ? esc(dayShort(x.r.last)) : 'none in this time'; } },
        { h: 'Note', html: function (x) { return x.quiet ? '<span class="a-flag">Writes rarely</span>' : '<span class="o-who-i">OK</span>'; } }
      ]
    }) : '';
    return '<section class="set-block">' + chips + '<span class="hint">Worked out from the section each line sits under, who ticked it and who wrote it. Ticks show where someone actually worked, so they count first. Use it as a prompt for a chat, not a verdict.</span>' +
      '<h3 class="a-ch-h">Skills matrix</h3><span class="hint">Lines each person ticked in each section (the 8 busiest sections).</span>' + skillsHTML(rows, td) +
      '<h3 class="a-ch-h">Section habits</h3><span class="hint">Based on ticks for anyone with 8 or more ticked lines, otherwise on the lines they wrote. Flagged when 70% or more of them over 5 or more days, or the last 5 or more days, were in one section. The suggestion is the section they have done least.</span>' +
      (hab || '<p class="hint">No lines with a section in this time.</p>') +
      '<h3 class="a-ch-h">Who writes, and who does not</h3><span class="hint">Days written is out of the ' + td.nActive + ' days in this time that had any lines written. Fewest first. Ticks are shown so you can tell someone who works but does not write.</span>' +
      (act || '<p class="hint">No people on the list.</p>') + '</section>' + orderStatsHTML(td, n);
  }
  /* Items that keep coming back onto the order list in the last 14 days: candidates for a standing order. */
  function standingHTML(all) {
    var from = shift(dayNow(), -13), m = {};
    all.filter(function (x) { return !x.deleted && x.date >= from; }).forEach(function (x) {
      var k = okey(x.text); if (!k) return;
      var e = m[k] = m[k] || { text: x.text, days: {}, dow: {}, q: {} };
      if (!e.days[x.date]) { e.days[x.date] = 1; var dw = parseYmd(x.date).getDay(); e.dow[dw] = (e.dow[dw] || 0) + 1; }
      if (x.qty) e.q[x.qty] = (e.q[x.qty] || 0) + 1;
    });
    var rows = Object.keys(m).map(function (k) { return m[k]; }).filter(function (e) { return Object.keys(e.days).length >= 3; })
      .sort(function (a, b) { return Object.keys(b.days).length - Object.keys(a.days).length; });
    var head = '<h3 class="a-ch-h">Standing order candidates</h3><span class="hint">On the order list on 3 or more different days in the last 14 days. A standing order with the supplier saves writing them every time.</span>';
    if (!rows.length) return head + '<p class="hint">Nothing comes back often enough yet.</p>';
    return head + lvHTML({
      key: 'ord-standing', items: rows, step: 10, tools: 8, noun: ['item', 'items'], ph: 'Search items',
      find: function (e) { return e.text; },
      sorts: [['days', 'Most days', function (a, b) { return Object.keys(b.days).length - Object.keys(a.days).length; }], ['az', 'A to Z', function (a, b) { return String(a.text).toLowerCase().localeCompare(String(b.text).toLowerCase()); }]],
      cols: [
        { h: 'Item', th: true, html: function (e) { return esc(e.text); } },
        { h: 'Days on the list', html: function (e) { return Object.keys(e.days).length + ' of 14'; } },
        { h: 'Usual amount', html: function (e) { var uq = Object.keys(e.q).sort(function (a, b) { return e.q[b] - e.q[a]; })[0] || ''; return esc(uq || 'not written'); } },
        { h: 'Suggestion', wide: true, html: function (e) { var nd = Object.keys(e.days).length, dows = DOW.filter(function (d) { return (e.dow[d] || 0) >= 2; }).map(function (d) { return DOWN[DOW.indexOf(d)]; }); return '<span class="a-flag">' + esc(dows.length ? 'Standing order on ' + dows.join(' and ') : 'Standing order about every ' + Math.max(1, Math.round(14 / nd)) + ' days') + '</span>'; } }
      ]
    });
  }
  function orderStatsHTML(td, n) {
    var os = S.ordStats;
    if (!os || os.loading) return '<section class="set-block"><span class="label">Order list</span><p class="hint">Loading...</p></section>';
    var from = shift(dayNow(), -(n - 1)), lines = os.lines.filter(function (x) { return !x.deleted && x.date >= from; });
    var byDay = {}, byPerson = {}, items = {}, ordered = 0;
    lines.forEach(function (x) {
      var d = byDay[x.date] = byDay[x.date] || { n: 0, who: {} }; d.n++; d.who[x.addedBy || 'Unknown'] = 1;
      var p = byPerson[x.addedBy || 'Unknown'] = byPerson[x.addedBy || 'Unknown'] || { n: 0, days: {}, last: '' }; p.n++; p.days[x.date] = 1; if (!p.last || x.date > p.last) p.last = x.date;
      var k = okey(x.text); if (k) { var it = items[k] = items[k] || { text: x.text, n: 0, days: {} }; it.n++; it.days[x.date] = 1; }
      if (x.ordered) ordered++;
    });
    var dayList = lvHTML({
      key: 'ord-days', items: Object.keys(byDay).map(function (d) { return { d: d, n: byDay[d].n, who: Object.keys(byDay[d].who) }; }), step: 7, tools: 10, noun: ['day', 'days'], ph: 'Search by day or name',
      find: function (o) { return dayShort(o.d) + ' ' + o.who.join(' '); },
      sorts: [['new', 'Newest first', function (a, b) { return a.d < b.d ? 1 : -1; }], ['most', 'Most lines', function (a, b) { return b.n - a.n || (a.d < b.d ? 1 : -1); }]],
      cols: [{ h: 'Day', th: true, html: function (o) { return esc(dayShort(o.d)); } }, { h: 'Lines', html: function (o) { return String(o.n); } }, { h: 'Written by', wide: true, html: function (o) { return esc(o.who.join(', ')); } }]
    });
    var perList = lvHTML({
      key: 'ord-people', items: Object.keys(byPerson).map(function (k) { var q = byPerson[k]; return { k: k, n: q.n, days: Object.keys(q.days).length, last: q.last }; }), step: 10, tools: 10, noun: ['person', 'people'], ph: 'Search names',
      find: function (o) { return o.k; },
      sorts: [['most', 'Most lines', function (a, b) { return b.n - a.n || a.k.localeCompare(b.k); }], ['az', 'A to Z', function (a, b) { return a.k.toLowerCase().localeCompare(b.k.toLowerCase()); }], ['last', 'Wrote most recently', function (a, b) { return a.last < b.last ? 1 : -1; }]],
      cols: [{ h: 'Person', th: true, html: function (o) { return esc(o.k); } }, { h: 'Lines', html: function (o) { return String(o.n); } }, { h: 'Days', html: function (o) { return String(o.days); } }, { h: 'Last', html: function (o) { return esc(dayShort(o.last)); } }]
    });
    var itemList = lvHTML({
      key: 'ord-items', items: Object.keys(items).map(function (k) { var it = items[k]; return { t: it.text, n: it.n, days: Object.keys(it.days).length }; }), step: 10, tools: 10, noun: ['item', 'items'], ph: 'Search items',
      find: function (o) { return o.t; },
      sorts: [['most', 'Most lines', function (a, b) { return b.n - a.n || a.t.toLowerCase().localeCompare(b.t.toLowerCase()); }], ['days', 'Most days', function (a, b) { return b.days - a.days || b.n - a.n; }], ['az', 'A to Z', function (a, b) { return a.t.toLowerCase().localeCompare(b.t.toLowerCase()); }]],
      cols: [{ h: 'Item', th: true, html: function (o) { return esc(o.t); } }, { h: 'Lines', html: function (o) { return String(o.n); } }, { h: 'Days', html: function (o) { return String(o.days); } }]
    });
    var lag = lines.filter(function (x) { var a = x.origAt || x.addedAt; return x.ordered && x.orderedAt && a && x.orderedAt > a; }).map(function (x) { return x.orderedAt - (x.origAt || x.addedAt); }).sort(function (a, b) { return a - b; });
    var old = lines.filter(function (x) { return !x.ordered && x.addedAt && now() - x.addedAt > 3 * 86400000; }).length;
    return '<section class="set-block"><span class="label">Order list</span><span class="hint">Who put what on the order list and on which days, over the same time range. No scores, just a record.</span>' +
      '<div class="a-tiles"><div class="a-tile"><strong>' + lines.length + '</strong><span>lines written</span></div><div class="a-tile"><strong>' + ordered + '</strong><span>ticked as ordered</span></div><div class="a-tile"><strong>' + (lines.length - ordered) + '</strong><span>not yet ordered</span></div>' +
      '<div class="a-tile"><strong>' + (lag.length ? dur(lag[Math.floor(lag.length / 2)]) : 'n/a') + '</strong><span>typical time from written to ordered</span></div><div class="a-tile"><strong>' + old + '</strong><span>waiting more than 3 days</span></div></div>' +
      standingHTML(os.lines) +
      (lines.length ? '<h3 class="a-ch-h">By day</h3>' + dayList + '<h3 class="a-ch-h">By person</h3>' + perList + '<h3 class="a-ch-h">Ordered most often</h3>' + itemList : '<p class="hint">Nothing has been written on the order list in this time.</p>') + '</section>';
  }

  /* The People tab: every person with role, permissions and PIN reset. Search, filter chips and Show more once the list is long. */
  function peopleListHTML(d) {
    var items = d.people.map(function (p, i) { return { p: p, i: i }; });
    function cb(o, kind, perm, on, label, off) { return '<label class="a-cl"><input type="checkbox" aria-label="' + label + ' for ' + esc(o.p.name) + '" data-a="' + kind + '"' + (perm ? ' data-perm="' + perm + '"' : '') + ' data-i="' + o.i + '"' + (on ? ' checked' : '') + (off ? ' disabled title="' + (isHeadP(o.p) ? 'The head chef can always do this' : 'Sous chefs can always write shift pings') + '"' : '') + '></label>'; }
    function nm(o) { return String(o.p.name || '').toLowerCase(); }
    return lvHTML({
      key: 'people', items: items, step: 15, tools: 8, noun: ['person', 'people'], ph: 'Search names', table: 'lv-people', empty: 'No names yet.',
      find: function (o) { return o.p.name + ' ' + ((ROLES[o.p.role] || {}).name || ''); },
      rowCls: function (o) { return o.p.active === false ? 'is-off' : ''; },
      filters: [['all', 'Everyone'], ['on', 'On the list', function (o) { return o.p.active !== false; }], ['sous', 'Sous chefs', function (o) { return isSousP(o.p) || o.p.role === 'lead'; }],
        ['staff', 'Staff', function (o) { return o.p.role === 'staff'; }], ['view', 'View only', function (o) { return o.p.role === 'view'; }], ['off', 'Off the list', function (o) { return o.p.active === false; }]],
      sorts: [['order', 'Order added', function (a, b) { return a.i - b.i; }],
        ['name', 'Name A to Z', function (a, b) { return (b.p.isNew ? 1 : 0) - (a.p.isNew ? 1 : 0) || nm(a).localeCompare(nm(b)); }],
        ['role', 'Role', function (a, b) { return Object.keys(ROLES).indexOf(a.p.role) - Object.keys(ROLES).indexOf(b.p.role) || nm(a).localeCompare(nm(b)); }]],
      cols: [
        { h: 'Name', th: true, html: function (o) { return '<label class="visually-hidden" for="a-n' + o.i + '">Name</label><input id="a-n' + o.i + '" class="search a-name" data-k="a-n' + o.i + '" data-a="name" data-i="' + o.i + '" value="' + esc(o.p.name) + '" maxlength="40">'; } },
        { h: 'Role', wide: true, html: function (o) { return '<label class="visually-hidden" for="a-r' + o.i + '">Role</label><select id="a-r' + o.i + '" class="p-select" data-k="a-r' + o.i + '" data-a="role" data-i="' + o.i + '">' + Object.keys(ROLES).map(function (k) { return '<option value="' + k + '"' + (o.p.role === k ? ' selected' : '') + '>' + ROLES[k].name + '</option>'; }).join('') + '</select>'; } },
        { h: 'Write', cls: 'a-c', html: function (o) { return cb(o, 'perm', 'add', o.p.add, 'Write', isHeadP(o.p)); } },
        { h: 'Tick', cls: 'a-c', html: function (o) { return cb(o, 'perm', 'tick', o.p.tick, 'Tick', isHeadP(o.p)); } },
        { h: 'Remove', cls: 'a-c', html: function (o) { return cb(o, 'perm', 'del', o.p.del, 'Remove', isHeadP(o.p)); } },
        { h: 'Pings', cls: 'a-c', html: function (o) { return cb(o, 'perm', 'ping', canPingP(o.p), 'Shift pings', isSousP(o.p)); } },
        { h: 'On list', cls: 'a-c', html: function (o) { return cb(o, 'active', '', o.p.active !== false, 'On list'); } },
        { h: '', cls: 'a-act', html: function (o) { return '<button type="button" class="p-x" data-p="a-reset-pin" data-id="' + esc(o.p.id) + '">' + (armed('pin:' + o.p.id) ? 'Tap again to reset' : 'Reset PIN') + '</button>' + removePersonBtn(o.p, o.i); } }
      ]
    });
  }
  /* The sous chef's Staff page: a short list of names with Remove. Same helper, rows as cards. */
  function staffListHTML(d) {
    var items = d.people.map(function (p, i) { return { p: p, i: i }; });
    return lvHTML({
      key: 'staff', items: items, step: 15, tools: 10, noun: ['person', 'people'], ph: 'Search names', empty: 'No names yet.',
      find: function (o) { return o.p.name; },
      sorts: [['order', 'Order added', function (a, b) { return a.i - b.i; }], ['name', 'Name A to Z', function (a, b) { return (b.p.isNew ? 1 : 0) - (a.p.isNew ? 1 : 0) || String(a.p.name).toLowerCase().localeCompare(String(b.p.name).toLowerCase()); }]],
      card: function (o) {
        return '<li class="a-person"><div class="a-top">' + (o.p.isNew ? '<label class="visually-hidden" for="a-n' + o.i + '">Name</label><input id="a-n' + o.i + '" class="search a-name" data-k="a-n' + o.i + '" data-a="name" data-i="' + o.i + '" value="' + esc(o.p.name) + '" maxlength="40">' : '<span class="a-name-ro">' + esc(o.p.name) + '</span>') +
          removePersonBtn(o.p, o.i) + '</div></li>';
      }
    });
  }
  function adminHTML() {
    if (S.authState !== 'ready' && !S.user) {
      return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Admin panel</h2><p class="hint">Loading...</p></section>';
    }
    if (!S.user) {
      return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Admin panel</h2>' + (whoHead() ? '<p class="hint a-headpin">Chef, your PIN opens the prep book. The admin panel also needs your Google account, so a PIN seen over your shoulder cannot change the book. Sign in once on this phone and it stays signed in. On a shared kitchen device, sign out when you are done.</p>' :
        '<p class="hint">The admin panel is for the head chef. Sign in with the head chef\'s Google account. Staff and sous chefs use their own PIN in the prep book instead.</p>') +
        (S.saveMsg ? '<p class="p-err">' + esc(S.saveMsg) + '</p>' : '') +
        '<div class="btn-row"><button type="button" class="btn dark" data-p="signin">Sign in with Google</button><a class="btn" href="#/prep">Back to the prep book</a></div></section>';
    }
    loadAdmins();
    if (!S.level) return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Admin panel</h2><p class="hint">Checking your access...</p></section>';
    if (S.level === 'none') return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Admin panel</h2><p class="p-err">' + esc(S.user.email) + ' is not the head chef\'s Google account, so it cannot open the admin panel. Sign out and sign in with the head chef\'s account.</p><div class="btn-row"><button type="button" class="btn dark" data-p="signout">Sign out</button><a class="btn" href="#/prep">Back to the prep book</a></div></section>';
    if (!S.draft) startDraft();
    var d = S.draft, owner = S.level === 'owner';
    if (owner) { watchActivity(); loadStats(false); }
    var bar = '<div class="p-bar"><span>Signed in as <strong>' + esc(S.user.email) + '</strong> (' + 'head chef' + ')</span><span class="p-links"><button type="button" class="p-link" data-p="signout">Sign out</button><a class="p-link" href="#/prep">Prep book</a></span></div>';
    var bulk = '<div class="field"><label class="label" for="a-bulk">Add several names</label><textarea id="a-bulk" class="p-bulk" data-k="a-bulk" rows="3" placeholder="One name per line">' + esc(S.bulk || '') + '</textarea></div><div class="btn-row"><button type="button" class="btn" data-p="a-bulk-add">Add these names as Staff</button></div>';
    var saveBlock = '<section class="set-block">' + staleHint() + '<div class="btn-row"><button type="button" class="btn dark" data-p="a-save"' + (S.busy ? ' disabled' : '') + '>Save changes</button><button type="button" class="btn" data-p="a-reset">Undo unsaved changes</button></div><span class="saved" role="status">' + esc(S.saveMsg) + '</span></section>';
    var at = S.atab || 'insights';
    var tabsBar = '<nav class="a-tabs" aria-label="Admin sections">' + [['insights', 'Insights'], ['team', 'Team'], ['waste', 'Waste'], ['learning', 'Learning'], ['notes', 'Shift pings'], ['minutes', 'Minutes'], ['guides', 'Guides'], ['mail', 'Mail' + (mlInfo().n ? ' (' + mlInfo().n + ')' : '')], ['people', 'People'], ['tools', 'Tools']].map(function (t) {
      return '<button type="button" class="a-tab" data-p="a-tab" data-t="' + t[0] + '" aria-pressed="' + (at === t[0]) + '">' + t[1] + '</button>';
    }).join('') + '</nav>';
    if (at === 'notes') loadNotes();
    if (at === 'minutes') loadMinutes();
    if (at === 'guides') loadGuides();
    var pane = at === 'mail' ? mailAdminHTML() : at === 'guides' ? guidesAdminHTML() : at === 'minutes' ? minAdminHTML() : at === 'insights' ? insightsHTML() : at === 'team' ? (teamHTML() + statsHTML('people')) : at === 'waste' ? wasteStatsHTML() : at === 'learning' ? (learnedHTML() + statsHTML('sections')) : at === 'notes' ? notesEditorHTML() : at === 'people' ? (
      '<section class="set-block"><span class="label">People</span><span class="hint">Pick a role to set the usual permissions (Sous chef can also add and remove people from the prep book itself), then adjust the ticks for one person if you need to. Pings lets that person write shift pings from the prep book (sous chefs always can). Reset PIN lets that person choose a new one. Removing someone from the list keeps their name on old lines. Head chef is for your own name: it always has every permission and the sous chef pages, and a sous chef cannot change or remove it.</span>' +
      (headIdOf(d.people) ? '' : '<p class="hint a-nohead" role="note">No one is marked Head chef yet. Set your own name to Head chef and save, so your PIN has full rights on the kitchen devices.</p>') +
      peopleListHTML(d) + '<div class="btn-row"><button type="button" class="btn" data-p="a-add-person">Add a person</button></div>' + bulk + '</section>' +
      '<section class="set-block"><span class="label">Badges</span><label class="a-check"><input type="checkbox" data-a="badges"' + (d.showBadges !== false ? ' checked' : '') + '> Show the weekly top tickers to everyone on the prep book</label></section>' +
      '<section class="set-block a-feats"><span class="label">New pages</span><span class="hint">You, sous chefs and leads always see these. Untick one to hide it from Staff and View only until the team is ready. Anyone ticked for Pings still sees shift pings.</span>' +
      FEATS.map(function (f) { return '<label class="a-check"><input type="checkbox" data-a="staffsee" data-f="' + f[0] + '"' + (d.staffSee[f[0]] ? ' checked' : '') + '> Staff see ' + f[1] + '</label>'; }).join('') + '</section>' + saveBlock
    ) : (
      '<section class="set-block"><span class="label">Backup</span><span class="hint">Saves everything the prep book holds (people, prep lines, orders and wastage from the last 400 days, shift pings and who has seen them, meeting minutes with earlier versions and sign-offs, what the prep and order lists have learned, tallies and the guides\' words) as one file on this device. People\'s PIN fingerprints and the guides\' page pictures are left out (keep the original files). Do this now and then.</span><div class="btn-row"><button type="button" class="btn" data-p="export"' + (S.exporting ? ' disabled' : '') + '>' + (S.exporting ? esc(S.exporting) : 'Download a backup') + '</button></div></section>' +
      '<section class="set-block"><span class="label">Kitchen PIN</span><span class="hint">The kitchen PIN is the lock on the whole book, so keep it to staff only. Writing needs a person\'s own PIN as well.</span>' +
      '<div class="field"><label class="label" for="a-newpin">Move to a new 4 digit kitchen PIN</label><input id="a-newpin" class="search" inputmode="numeric" maxlength="4" autocomplete="off" data-k="a-newpin" placeholder="4 digits" value="' + esc(S.newPin) + '"></div>' +
      '<div class="btn-row"><button type="button" class="btn" data-p="move-pin"' + (S.moving ? ' disabled' : '') + '>' + (armed('move-pin') ? 'Tap again to copy everything' : 'Copy everything to the new PIN') + '</button></div><span class="saved" role="status">' + esc(S.moveMsg) + '</span><span class="hint">Ask for the new PIN to be added to the security rules first. The old PIN keeps working until its rules are removed.</span>' +
      '<div class="btn-row a-forget"><button type="button" class="btn" data-p="pin-forget">' + (armed('pin-forget') ? 'Tap again: this device forgets the kitchen PIN' : 'Use a different kitchen PIN on this device') + '</button></div><span class="hint">Forgets the kitchen PIN on this device only and asks for one again. Staff phones pick up a new PIN by themselves once the old rules are removed.</span></section></div>');
    return '<div class="p-admin">' + bar + '<h2 class="p-h" id="rtitle" tabindex="-1">Admin panel</h2>' + tabsBar + '<div class="a-pane">' + (owner ? idCardHTML() : '') + pane + '</div></div>';
  }
  /* the same Remove button on the admin People tab and the sous chef's staff list, with a second tap to be sure */
  function removePersonBtn(p, i) {
    if (isHeadP(p) && S.level !== 'owner') return '<span class="a-head">Head chef</span>';
    return '<button type="button" class="p-x" data-p="a-remove-person" data-i="' + i + '" aria-label="' + esc('Remove ' + (p.name || 'this person')) + '">' + (armed('rm:' + p.id) ? 'Tap again to remove' : 'Remove') + '</button>';
  }
  function draftDirty() { return !!S.draft && JSON.stringify(S.draft) !== S.draftSnap; }
  function staffHTML() {
    var d = S.draft || (startDraft(), S.draft);
    var bulk = '<div class="field"><label class="label" for="a-bulk">Add several names</label><textarea id="a-bulk" class="p-bulk" data-k="a-bulk" rows="3" placeholder="One name per line">' + esc(S.bulk || '') + '</textarea></div><div class="btn-row"><button type="button" class="btn" data-p="a-bulk-add">Add these names as Staff</button></div>';
    return '<div class="p-admin"><div class="p-bar"><span>Staff list</span><span class="p-links"><button type="button" class="p-link" data-p="staff-close">' + (armed('staff-close') ? 'Tap again to leave without saving' : 'Back to the prep book') + '</button></span></div><h2 class="p-h" id="rtitle" tabindex="-1">Staff</h2>' +
      '<section class="set-block"><span class="hint">Add a person or remove one, then save. New people start as Staff. Removing someone keeps their name on old lines. Roles and PINs are looked after by the head chef.</span>' + staffListHTML(d) + '<div class="btn-row"><button type="button" class="btn" data-p="a-add-person">Add a person</button></div>' + bulk + '</section>' +
      '<section class="set-block">' + staleHint() + '<div class="btn-row"><button type="button" class="btn dark" data-p="a-save"' + (S.busy ? ' disabled' : '') + '>Save changes</button><button type="button" class="btn" data-p="a-reset">Undo unsaved changes</button></div><span class="saved" role="status">' + esc(S.saveMsg) + '</span></section></div>';
  }
  /* While connecting, show the page that is opening (not a generic prep book card), so nothing flashes. */
  var PAGE_NAME = { prep: 'Prep list', orders: 'Order list', waste: 'Wastage', admin: 'Admin panel', minutes: 'Meeting minutes', guides: 'Guides', mail: 'Kitchen mail', drinks: 'Drinks run' };
  function loadingHTML() {
    var t = PAGE_NAME[S.name] || 'Prep book';
    if (S.name === 'admin') return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">' + t + '</h2><p class="hint">Loading...</p></section>';
    return '<section class="nb-page o-page is-loading"><header class="nb-ph"><div><h2 class="nb-title" id="rtitle" tabindex="-1">' + t + '</h2><span class="nb-date">' + esc(longDate(dayNow())) + '</span></div></header>' +
      '<div class="nb-body"><p class="nb-empty">Loading...</p></div></section>';
  }
  function bodyHTML() {
    if (!S.pin) return gateHTML();
    // a page held back from staff: say so once it is known who is on this phone (or this phone already knows)
    var fk = S.name === 'guides' || S.name === 'minutes' ? S.name : '';
    if (fk && !featOn(fk)) { if (S.configState === 'ok' || featHave[fk] === false) return notYetHTML(fk); if (S.configState !== 'error') return loadingHTML(); }
    // guides need only the kitchen PIN (reading, like the recipes); a list kept on the phone shows straight away, even with no signal
    if (S.name === 'guides' && (S.guides || S.configState === 'ok')) return guidesPageHTML();
    if (S.configState === 'error') return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Prep book</h2><p class="p-err">Could not connect. Check the connection and try again.</p><div class="btn-row"><button type="button" class="btn dark" data-p="retry">Try again</button></div></section>';
    if (S.configState !== 'ok') return loadingHTML();
    if (S.name === 'admin') return adminHTML();
    if (guest()) return '<div class="is-guest">' + guestBarHTML() + (S.name === 'orders' ? ordersHTML() : S.name === 'waste' ? wasteHTML() : listHTML()) + '</div>';
    if (!who()) return whoHTML();
    if (!S.authed) return ownPinHTML();
    flushMisses(); flushViews();
    if (S.name === 'orders') return drinkNudgeHTML() + ordersHTML();
    if (S.name === 'waste') return drinkNudgeHTML() + wasteHTML();
    if (S.name === 'minutes') return minutesPageHTML();
    if (S.name === 'mail') return mailPageHTML();
    if (S.name === 'drinks') return drinksPageHTML();
    if (S.drinkAsk === 'first') return drinkAskHTML();
    if (S.minOpen && isSous()) return minSousPageHTML();
    if (S.notesOpen && canPing()) return notesPageHTML();
    if (S.staffOpen && isSous()) return staffHTML();
    return drinkNudgeHTML() + listHTML();
  }
  /* The PIN screens open the keyboard by themselves: the first PIN box still short of 4 digits takes focus, and inputmode
     brings up the number pad on a phone, a tablet or a Windows touch screen (virtualKeyboard asks for it where the browser
     has that). A computer with a keyboard just starts typing. Only the kitchen PIN and own PIN screens (pin-auto) do this. */
  function focusPin() {
    var ins = S.root.querySelectorAll('.pin-auto'), i;
    for (i = 0; i < ins.length; i++) if (ins[i].value.length < 4) { ins[i].focus({ preventScroll: true }); kbShow(); return; }
  }
  function kbShow() { try { if (navigator.virtualKeyboard && navigator.virtualKeyboard.show) navigator.virtualKeyboard.show(); } catch (e) {} }
  var rendering = false;
  function draw() {
    noteSummaryRefresh();
    if (S.mins) { loadMine(); minCard(); }
    if (!S.root || !document.body.contains(S.root) || rendering) return;
    rendering = true;
    var ae = document.activeElement, key = ae && ae.getAttribute && ae.getAttribute('data-k'), start = null, end = null;
    if (key && ae.selectionStart != null) { try { start = ae.selectionStart; end = ae.selectionEnd; } catch (e) {} }
    var bodyEl = S.root.querySelector('.nb-body'), keepScroll = bodyEl ? S.root.querySelectorAll('.nb-body') : null, scrolls = [];
    if (keepScroll) Array.prototype.forEach.call(keepScroll, function (b) { scrolls.push(b.scrollTop); });
    S.root.innerHTML = syncHTML() + bodyHTML() + (S.toast ? '<div class="p-toast" role="status">' + esc(S.toast) + (S.toastAct ? ' <button type="button" class="p-toast-btn" data-p="toast-act">' + esc(S.toastAct.label) + '</button>' : '') + '</div>' : '') + (S.toastOld && S.toast ? '<div class="p-toast p-toast-old" role="status">' + esc(S.toastOld.msg) + ' <button type="button" class="p-toast-btn" data-p="toast-old">' + esc(S.toastOld.act.label) + '</button></div>' : '');
    S.root.classList.toggle('is-book', S.name === 'prep' && !!S.root.querySelector('.nb'));
    document.documentElement.classList.toggle('sheet-open', !!S.root.querySelector('.sheet'));
    if (scrolls.length) Array.prototype.forEach.call(S.root.querySelectorAll('.nb-body'), function (b, i) { if (scrolls[i] != null) b.scrollTop = scrolls[i]; });
    if (key) { var el = S.root.querySelector('[data-k="' + key + '"]'); if (el) { el.focus({ preventScroll: true }); if (start != null && el.setSelectionRange) { try { el.setSelectionRange(start, end); } catch (e) {} } } }
    else focusPin();
    rendering = false;
  }

  /* ---------- the order list ----------
     Everyone writes today's order list. The head chef and sous chefs see what is still to order across the last 14 days,
     or any single day, and tick lines off as ordered. Lines whose name matches a recipe ingredient link to those recipes. */
  var ORD_DAYS = 14, ORD_HIDE = 10 * 60000, ordHideTimer = null;
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
    var today = dayNow(), dates = [], i;
    for (i = 0; i < ORD_DAYS; i++) dates.push(shift(today, -i));
    var miss = 0;
    Promise.all(dates.map(function (d) { return fb.fs.getDocs(ordCol(d)).then(function (s) { return s.docs.map(function (x) { var v = x.data(); v.id = x.id; v.date = d; return v; }); }, function () { miss++; return []; }); })).then(function (lists) {
      S.ordAll = [].concat.apply([], lists); S.ordAllMiss = miss; S.ordBusy = false; draw();
    });
  }
  /* Everything to order is read once (14 days) and then kept in step on the phone: today's lines come from the live list,
     and a tick or remove on an older line is applied to the copy here. No re-reading after every tap. */
  function ordReload() { draw(); }
  function ordPatch(date, id, ch) { (S.ordAll || []).forEach(function (x) { if (x.date === date && x.id === id) Object.assign(x, ch); }); draw(); }
  function ordAllLines() {
    var t = dayNow();
    return S.ordDate === t && S.ordState === 'ok' ? (S.ordAll || []).filter(function (x) { return x.date !== t; }).concat(S.ordLines || []) : (S.ordAll || []);
  }
  /* Like the prep list: anything not ordered on the last written day rolls onto today's order list by itself, every day
     until someone ticks it as ordered. The copy's id comes from the first line (root), so two phones rolling at once
     write the same line once. Each phone tries once a day (lk.ord.rolled), so the reads stay small. */
  function ordRoll() {
    var today = dayNow();
    if (!T.ready() || !S.authed || !fb || !can('add') || S.configState !== 'ok' || S.ordRolling || lsGet('lk.ord.rolled') === today || waiting('ordroll')) return;
    S.ordRolling = true;
    var dates = [], k;
    for (k = 1; k <= 7; k++) dates.push(shift(today, -k));
    Promise.all([fb.fs.getDocs(ordCol(today))].concat(dates.map(function (d) { return fb.fs.getDocs(ordCol(d)); }))).then(function (res) {
      var have = {};
      res[0].docs.forEach(function (d) { have[d.id] = true; });
      var src = null, j;
      for (j = 1; j < res.length && !src; j++) {
        var docs = res[j].docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }).filter(function (x) { return !x.deleted; });
        if (docs.length) src = { date: dates[j - 1], items: docs };
      }
      var jobs = [];
      (src ? src.items : []).forEach(function (x) {
        if (x.ordered) return;
        var root = x.root || x.id, id = 'r' + today.replace(/-/g, '') + '-' + root;
        if (have[id]) return;
        have[id] = true;
        jobs.push(['set', ordRef(today, id), {
          text: x.text, qty: x.qty || '', recipes: x.recipes || [], addedBy: 'Rolled over', addedById: '', addedAt: now(), ordered: false, deleted: false,
          rolled: (x.rolled || 0) + 1, root: root, from: x.id, rolledFrom: src.date, origBy: x.origBy || x.addedBy || '', origAt: x.origAt || (x.rolled ? 0 : x.addedAt || 0),
          ahead: !!(x.ahead || writtenLate(x, src.date)), since: x.since || (writtenLate(x, src.date) ? today : src.date)
        }]);
      });
      if (!jobs.length) { S.ordRolling = false; lsSet('lk.ord.rolled', today); return; }
      return W(jobs.slice(0, 400)).then(function () {
        S.ordRolling = false; lsSet('lk.ord.rolled', today); ordReload();
        if (S.name === 'orders') toast(jobs.length + (jobs.length === 1 ? ' line' : ' lines') + ' not ordered yet rolled over from ' + dayName(src.date).toLowerCase());
      });
    }).catch(function () { S.ordRolling = false; retryLater('ordroll'); });
  }
  /* ---------- order learning ----------
     Like the prep list: every order line is remembered for good in ordlearned/<key> { text, uses, dow, qtys, lastUsed,
     lastBy }. The server counts each finished day every night (scripts/nightly-learn.mjs). The list is read once a day per
     phone (lk.ord.learned) and drives the suggestions while typing, the usual amounts and the "usually ordered" chips. */
  var ORD_LEARN_N = 300;
  function loadOrdLearned() {
    var tag = S.pin + '|' + dayNow();
    if (!fb || S.ordLearnBusy || S.ordLearnFor === tag) return;
    try { var c = JSON.parse(lsGet('lk.ord.learned') || 'null'); if (c && c.tag === tag && c.list) { S.ordLearned = c.list; S.ordLearnFor = tag; S.ordLearnOk = true; return; } } catch (e) {}
    S.ordLearnBusy = true;
    fb.fs.getDocs(fb.fs.query(colRef('ordlearned'), fb.fs.orderBy('uses', 'desc'), fb.fs.limit(ORD_LEARN_N))).then(function (sn) {
      S.ordLearned = sn.docs.map(function (d) { var x = d.data(); return { id: d.id, text: x.text || '', uses: x.uses || 0, dow: x.dow || {}, qtys: x.qtys || {}, hidden: !!x.hidden }; });
      S.ordLearnFor = tag; S.ordLearnOk = true; S.ordLearnBusy = false; ordLearnSave(); draw();
    }, function () {
      // no signal, or rules without ordlearned (a new kitchen PIN): suggest from the last 14 days only, try again tomorrow
      S.ordLearned = S.ordLearned || []; S.ordLearnFor = tag; S.ordLearnOk = false; S.ordLearnBusy = false;
    });
  }
  function ordLearnSave() { lsSet('lk.ord.learned', JSON.stringify({ tag: S.ordLearnFor, list: S.ordLearned || [] })); }
  function ordLearnedFor(text) { var k = lkey(text); return (S.ordLearned || []).filter(function (x) { return x.id === k; })[0] || null; }
  /* The server counts order lines every night (scripts/nightly-learn.mjs). This only keeps this phone's copy in step,
     so the next suggestion already knows; nothing is written. */
  function ordLearn(text, qty) {
    var dw = String(T.dow()), k = lkey(text || '').slice(0, 80);
    if (!k) return;
    qty = String(qty || '').trim().slice(0, 40);
    var qk = lkey(qty).slice(0, 40), data = { text: String(text).trim().slice(0, 120) };
    // keep this phone's copy in step, so the next suggestion already knows
    var e = ordLearnedFor(text);
    if (!e) { e = { id: k, text: data.text, uses: 0, dow: {}, qtys: {} }; (S.ordLearned = S.ordLearned || []).push(e); }
    e.uses++; e.dow[dw] = (e.dow[dw] || 0) + 1;
    if (qty && qk) { e.qtys[qk] = e.qtys[qk] || { q: qty, n: 0 }; e.qtys[qk].n++; }
    if (S.ordLearnFor) ordLearnSave();
  }
  /* amounts ordered for an item before: the learned record and the last 14 days, most used first */
  function ordQtyList(text) {
    var k = lkey(String(text || '').trim()), out = {}, lx = ordLearnedFor(text);
    if (!k) return [];
    Object.keys((lx && lx.qtys) || {}).forEach(function (q) { var v = lx.qtys[q]; if (v && v.q) out[q] = { q: v.q, n: v.n || 0 }; });
    (S.ordHist || []).forEach(function (x) { if (lkey(x.text) === k && x.qty) { var q = lkey(x.qty).slice(0, 40); out[q] = out[q] || { q: x.qty, n: 0 }; if (!lx) out[q].n++; } });
    return Object.keys(out).map(function (q) { return out[q]; }).sort(function (a, b) { return b.n - a.n; });
  }
  function oQtyChipsHTML() {
    if (S.oqty.trim() || S.otext.trim().length < 3) return '';
    var l = ordQtyList(S.otext).slice(0, 3);
    if (!l.length) return '';
    return '<span class="nb-ql">Usual amount</span>' + l.map(function (x) { return '<button type="button" class="chip sq nb-qc" data-p="oqset" data-v="' + esc(x.q) + '">' + esc(x.q) + '</button>'; }).join('');
  }
  /* a line that rolled onto a later day is shown once, as its newest copy */
  function ordNewest(list) {
    var gone = {}; list.forEach(function (x) { if (x.from) gone[x.from] = 1; });
    return list.filter(function (x) { return !gone[x.id]; });
  }
  function addOrder(oneTapAdd) {
    var t = S.otext.trim();
    if (!t || !can('add')) return;
    var typed = t, pr = proofread(t); t = (pr.text || t).slice(0, 120);
    var hit = ingredientFor(t), p = me(), ref = fb.fs.doc(ordCol(S.ordDate));
    var oFix = pr.changes.map(function (c) { return c[0] + ' to ' + c[1]; }).join(', ');
    S.otext = ''; var q = S.oqty.trim().slice(0, 40); S.oqty = ''; draw();
    ordLearn(t, q);
    sset(ref, { text: t, qty: q, recipes: hit ? hit.ids : [], addedBy: p ? p.name : '', addedById: p ? p.id : '', addedAt: now(), ordered: false, deleted: false, orig: t !== typed ? typed.slice(0, 120) : '' })
      .then(ordReload, function (e) { failed(e, function () { if (!S.otext.trim()) { S.otext = typed; S.oqty = q; } }); });
    /* like the prep list: Undo takes the line back, or after a spelling fix puts back what was typed */
    if (oFix) toast('Added, corrected ' + oFix, { label: 'Undo', fn: function () { keepWords(pr.changes); supd(ref, { text: typed.slice(0, 120), orig: '' }).then(ordReload, failed); } });
    else toast('Added to the order list', { label: 'Undo', fn: function () { supd(ref, { deleted: true, deletedBy: (me() || {}).name || '', deletedAt: now() }).then(ordReload, failed); } });
    if (oneTapAdd) return;
    var el = S.root && S.root.querySelector('[data-k="o-text"]'); if (el) el.focus();
  }
  function ingredientFor(text) { return ingIndex()[okey(text)] || null; }
  function orderedOp(date, id, on) { var p = me(); return ['upd', ordRef(date, id), { ordered: on, orderedBy: on ? p.name : '', orderedAt: on ? now() : 0 }]; }
  function setOrdered(date, id, on) {
    if (!canBrowse()) return Promise.resolve();
    return W([orderedOp(date, id, on)]);
  }
  function tickOrderLine(date, id, on) {
    setOrdered(date, id, on).then(function () { ordPatch(date, id, { ordered: on }); }, failed);
    if (on) toast('Ordered', { label: 'Undo', fn: function () { tickOrderLine(date, id, false); } });
  }
  function tickOrderGroup(key) {
    var lines = ordNewest(ordAllLines()).filter(function (x) { return !x.deleted && !x.ordered && okey(x.text) === key; });
    if (!lines.length || !canBrowse()) return;
    W(lines.map(function (x) { return orderedOp(x.date, x.id, true); })).then(function () { lines.forEach(function (x) { ordPatch(x.date, x.id, { ordered: true }); }); }, failed);
    toast('Ordered' + (lines.length > 1 ? ' ' + lines.length + ' lines' : ''), { label: 'Undo', fn: function () {
      W(lines.map(function (x) { return orderedOp(x.date, x.id, false); })).then(function () { lines.forEach(function (x) { ordPatch(x.date, x.id, { ordered: false }); }); }, failed);
    } });
  }
  function removeOrderLine(date, id, restore) {
    if (!canBrowse() || !can('del')) return;
    var it = (S.ordLines || []).concat(S.ordAll || []).filter(function (x) { return x.id === id; })[0];
    supd(ordRef(date, id), { deleted: !restore, deletedBy: restore ? '' : (me() || {}).name || '', deletedAt: restore ? 0 : now() }).then(function () { ordPatch(date, id, { deleted: !restore }); }, failed);
    if (!restore) toast('Removed ' + (it ? it.text : 'the line') + ' from the order list', { label: 'Undo', fn: function () { removeOrderLine(date, id, true); } });
  }
  function ordSuggest() {
    var q = okey(S.otext); if (q.length < 2) return [];
    var seen = {}, out = [];
    function add(t) { var k = okey(t); if (k && !seen[k] && k !== q && (k.indexOf(q) === 0 || k.indexOf(' ' + q) >= 0)) { seen[k] = 1; out.push(t); } }
    (S.ordLearned || []).filter(function (x) { return !x.hidden; }).slice().sort(function (a, b) { return b.uses - a.uses; }).forEach(function (x) { add(x.text); });
    (S.ordLines || []).concat(S.ordAll || []).forEach(function (x) { add(x.text); });
    var idx = ingIndex(); Object.keys(idx).forEach(function (k) { add(idx[k].name); });
    return out.slice(0, 6);
  }
  function ordSuggHTML() {
    var l = ordSuggest(); S.osugg = l;
    return l.map(function (t, i) { var uq = (ordQtyList(t)[0] || {}).q; return '<button type="button" class="chip sq nb-sg" data-p="osugg" data-i="' + i + '">' + esc(t) + (uq ? ' <span class="nb-uq">' + esc(uq) + '</span>' : '') + '</button>'; }).join('') + oQtyChipsHTML();
  }
  function recipeChips(x) {
    var ids = x.recipes && x.recipes.length ? x.recipes : ((ingredientFor(x.text) || {}).ids || []);
    if (!ids.length) return '';
    return '<span class="o-used">Used in ' + ids.slice(0, 3).map(function (id) { var r = recipeById(id); return r ? '<a href="#/r/' + encodeURIComponent(id) + '">' + esc(r.name) + '</a>' : ''; }).join(', ') + (ids.length > 3 ? ' +' + (ids.length - 3) : '') + '</span>';
  }
  function ordRow(x) {
    var canTick = canBrowse() && !x.deleted;
    var by = x.ordered && x.orderedBy ? 'Ordered by ' + esc(x.orderedBy) : (x.rolled ? (x.origBy ? 'from ' + esc(x.origBy) : '') : esc(x.addedBy || ''));
    return '<li class="nb-row' + (x.ordered ? ' is-done' : '') + (x.deleted ? ' is-removed' : '') + '">' +
      '<button type="button" class="nb-box" data-p="otick" data-id="' + esc(x.id) + '" data-d="' + esc(x.date) + '" aria-pressed="' + !!x.ordered + '" aria-label="' + esc('Ordered: ' + x.text) + '"' + (canTick ? '' : ' disabled') + '>' + (x.ordered ? TICK : BOX) + '</button>' +
      '<span class="nb-t"' + (x.orig ? ' title="' + esc('Corrected from: ' + x.orig) + '"' : '') + '>' + esc(x.text) + (x.qty ? ' <span class="nb-q">' + esc(x.qty) + '</span>' : '') +
      (rolledN(x) ? ' <span class="nb-roll" title="Not ordered yet, so it rolled over">Since ' + esc(dayShort(x.since || x.rolledFrom || x.date)) + '</span>' : '') + recipeChips(x) + '</span>' +
      '<span class="nb-by">' + by + '</span>' +
      (canBrowse() && can('del') && !x.deleted && !x.ordered ? '<button type="button" class="p-x" data-p="odel" data-id="' + esc(x.id) + '" data-d="' + esc(x.date) + '" aria-label="' + esc('Remove ' + x.text) + '">Remove</button>' : '') +
      (canBrowse() && can('del') && x.deleted ? '<button type="button" class="p-x" data-p="orestore" data-id="' + esc(x.id) + '" data-d="' + esc(x.date) + '" aria-label="' + esc('Put back ' + x.text) + '">Put back</button>' : '') + '</li>';
  }
  function ordGroups() {
    var map = {}, order = [];
    ordNewest(ordAllLines()).filter(function (x) { return !x.deleted && !x.ordered; }).sort(function (a, b) { return (a.addedAt || 0) - (b.addedAt || 0); }).forEach(function (x) {
      var k = okey(x.text); if (!k) return;
      if (!map[k]) { map[k] = { key: k, text: x.text, lines: [] }; order.push(k); }
      map[k].lines.push(x); map[k].text = x.text;
    });
    return order.map(function (k) { return map[k]; }).sort(function (a, b) { return a.text.localeCompare(b.text); });
  }
  var MISS_TEXT = 'Could not load every day. Check the signal. The book tries again by itself in a few minutes.';
  function ordAllHTML() {
    if (S.ordBusy && !(S.ordAll || []).length) return '<p class="hint">Loading the last ' + ORD_DAYS + ' days...</p>';
    var gs = ordGroups(), miss = S.ordAllMiss ? '<p class="hint o-miss" role="alert">' + MISS_TEXT + '</p>' : '';
    if (!gs.length && miss) return miss;
    if (!gs.length) return '<p class="nb-empty">Nothing waiting to be ordered. Anything written in the last ' + ORD_DAYS + ' days has been ticked off.</p>';
    return miss + '<p class="hint">' + gs.length + ' item' + (gs.length === 1 ? '' : 's') + ' still to order from the last ' + ORD_DAYS + ' days. Tick one to mark every line for it as ordered.</p><ul class="nb-rows">' + gs.map(function (g) {
      var first = g.lines[0];
      return '<li class="nb-row o-group"><button type="button" class="nb-box" data-p="ogroup" data-k2="' + esc(g.key) + '" aria-label="' + esc('Ordered: ' + g.text) + '">' + BOX + '</button>' +
        '<span class="nb-t">' + esc(g.text) + (g.lines.length > 1 ? ' <span class="o-n">x' + g.lines.length + '</span>' : '') +
        '<span class="o-who">' + g.lines.map(function (x) { return esc((x.qty ? x.qty + ' ' : '') + '(' + (x.addedBy || '?') + ', ' + dayShort(x.date) + ')'); }).join(' &middot; ') + '</span>' + recipeChips(first) + '</span></li>';
    }).join('') + '</ul>';
  }
  function dayShort(s) { return parseYmd(s).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }); }
  function loadOrdHist() {
    var today = dayNow();
    if (!fb || S.ordHistBusy || waiting('ordHist') || S.ordHistFor === today) return;
    var tag = S.pin + '|' + today, c = dayCache('lk.ord.hist', tag);
    if (c) { S.ordHist = c; S.ordHistFor = today; return; }
    S.ordHistBusy = true;
    var dates = [], i; for (i = 1; i <= 14; i++) dates.push(shift(today, -i));
    var miss = 0;
    Promise.all(dates.map(function (d) { return fb.fs.getDocs(ordCol(d)).then(function (sn) { return sn.docs.map(function (x) { var v = x.data(); v.date = d; return v; }); }, function () { miss++; return []; }); })).then(function (l) {
      S.ordHist = [].concat.apply([], l).filter(function (x) { return !x.deleted && !x.rolled; }).map(function (x) { return { text: x.text, qty: x.qty || '', date: x.date }; });
      S.ordHistBusy = false;
      // a day that could not be read is not cached as empty: the hints use what came in, and the book tries again later
      if (miss) retryLater('ordHist'); else { S.ordHistFor = today; dayCacheSet('lk.ord.hist', tag, S.ordHist); }
      draw();
    });
  }
  function oRegsHTML() {
    if (!S.ordHist || S.ordDate !== dayNow()) return '';
    var dn = T.dow(), dname = parseYmd(dayNow()).toLocaleDateString('en-AU', { weekday: 'long' }), m = {}, have = {};
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
    // and what the book has learned is ordered on this weekday (3 or more times), beyond the last 14 days
    var inL = {}; list.forEach(function (e) { inL[okey(e.text)] = 1; });
    (S.ordLearned || []).filter(function (x) { var k = okey(x.text); return !x.hidden && k && !have[k] && !inL[k] && (x.dow[dn] || 0) >= 3; })
      .sort(function (a, b) { return (b.dow[dn] || 0) - (a.dow[dn] || 0); })
      .forEach(function (x) { if (list.length < 10) list.push({ text: x.text, same: x.dow[dn], nd: x.uses, q: (ordQtyList(x.text)[0] || {}).q || '' }); });
    S.oregs = list;
    if (!list.length) return '';
    return '<div class="w-often"><span class="nb-ql">Usually ordered on a ' + esc(dname) + ' or often. Tap to add</span><div class="chiprow">' + list.map(function (e, i) { return '<button type="button" class="chip sq" data-p="oreg" data-i="' + i + '">' + esc(e.text) + (e.q ? ' <span class="nb-uq">' + esc(e.q) + '</span>' : '') + '</button>'; }).join('') + '</div></div>';
  }
  /* Lines still not ordered after more than 3 days sit together at the top of today's list, under the day they were
     first written, and a nudge shows when the order list opens (hidden for the day with Hide for today). */
  var ORD_LATE = 3;
  function ordWait(x, today) { return Math.round((parseYmd(today) - parseYmd(x.since || x.date)) / 86400000); }
  function ordOverdueHTML(list, today) {
    if (!list.length) return '';
    var by = {}, days = [];
    list.forEach(function (x) { var d = x.since || x.date; if (!by[d]) { by[d] = []; days.push(d); } by[d].push(x); });
    days.sort();
    return '<div class="o-od" id="o-overdue"><h3 class="nb-sh">Waiting more than ' + ORD_LATE + ' days (' + list.length + ')</h3>' + days.map(function (d) {
      var n = ordWait(by[d][0], today);
      return '<h4 class="o-od-h">Written ' + esc(dayShort(d)) + ', ' + n + ' days ago</h4><ul class="nb-rows">' + by[d].map(ordRow).join('') + '</ul>';
    }).join('') + '</div>';
  }
  function ordNudgeHTML(list, today) {
    if (!list.length || lsGet('lk.ord.nudge') === today) return '';
    return '<div class="nb-flag o-nudge" role="status"><span class="nb-sl">Still not ordered</span><p>' + list.length + (list.length === 1 ? ' item has' : ' items have') + ' waited more than ' + ORD_LATE + ' days. ' +
      (canBrowse() ? 'Order them today, or remove what is not needed any more.' : 'Tell the head chef or a sous chef.') + '</p>' +
      '<div class="btn-row"><button type="button" class="btn" data-p="onudge-show">Show them</button><button type="button" class="btn" data-p="onudge-hide">Hide for today</button></div></div>';
  }
  function ordersHTML() {
    if (can('add')) { loadOrdHist(); loadWRecent(false); loadOrdLearned(); }
    var p = me(), br = canBrowse(), view = br ? (S.ordView || 'day') : 'day', today = dayNow();
    if (!br && S.ordDate !== today) { S.ordDate = today; watchOrders(); }
    if (view === 'all') loadOrdAll(false);
    if (S.ordDate === today && S.ordState === 'ok') ordRoll();
    var live = (S.ordLines || []).filter(function (x) { return !x.deleted; });
    var nOrd = live.filter(function (x) { return x.ordered; }).length;
    /* on today's list, a line that was ticked as ordered stays for 10 minutes (so a mis-tap can be undone), then leaves the list. Other days show everything. */
    var shown = live.filter(function (x) { return !(S.ordDate === today && x.ordered && x.orderedAt && now() - x.orderedAt > ORD_HIDE); });
    clearTimeout(ordHideTimer);
    var nextHide = Infinity;
    if (S.ordDate === today) live.forEach(function (x) { if (x.ordered && x.orderedAt) { var left = x.orderedAt + ORD_HIDE - now(); if (left > 0 && left < nextHide) nextHide = left; } });
    if (nextHide < Infinity) ordHideTimer = setTimeout(function () { if (S.name === 'orders') draw(); }, nextHide + 500);
    var tabs = br ? '<div class="nb-nav o-nav"><button type="button" class="chip" data-p="oview" data-v="day" aria-pressed="' + (view === 'day') + '">By day</button><button type="button" class="chip" data-p="oview" data-v="all" aria-pressed="' + (view === 'all') + '">Everything to order</button>' +
      (view === 'day' ? '<span class="o-days"><button type="button" class="chip" data-p="oday" data-d="-1" aria-label="Back one day">&lsaquo;</button><button type="button" class="chip" data-p="otoday" aria-pressed="' + (S.ordDate === today) + '">Today</button><button type="button" class="chip" data-p="oday" data-d="1" aria-label="Forward one day">&rsaquo;</button></span>' : '') + '</div>' : '';
    var add = can('add') && S.ordDate === today ?
      '<form class="nb-add" data-p-form="oadd"><div class="nb-add-row"><label class="visually-hidden" for="o-text">Item to order</label><input id="o-text" class="nb-in nb-in-text" data-k="o-text" enterkeyhint="done" autocomplete="off" placeholder="What do we need to order?" maxlength="120" value="' + esc(S.otext) + '">' +
      '<label class="visually-hidden" for="o-qty">Amount</label><input id="o-qty" class="nb-in nb-in-qty" data-k="o-qty" enterkeyhint="done" autocomplete="off" placeholder="Amount" maxlength="40" value="' + esc(S.oqty) + '"><button type="submit" class="nb-addbtn">Add</button></div>' +
      '<div class="nb-sugg" id="o-sugg">' + ordSuggHTML() + '</div><p class="nb-hint" id="o-hint" aria-live="polite">' + esc(oHintText(S.otext)) + '</p>' + oRegsHTML() + '</form>' : (S.ordDate === today ? '<p class="hint">You can read the order list but not write in it.</p>' : '');
    var overdue = view === 'day' && S.ordDate === today ? shown.filter(function (x) { return !x.ordered && ordWait(x, today) > ORD_LATE; }) : [];
    if (overdue.length) shown = shown.filter(function (x) { return overdue.indexOf(x) < 0; });
    var moved = live.filter(function (x) { return shown.indexOf(x) < 0 && overdue.indexOf(x) < 0; }).sort(function (a, b) { return (b.orderedAt || 0) - (a.orderedAt || 0); });
    var removedO = (S.ordLines || []).filter(function (x) { return x.deleted; });
    var removedBox = view === 'day' && removedO.length && canBrowse() && can('del') ? '<button type="button" class="nb-link" data-p="oremoved">' + (S.oShowRemoved ? 'Hide' : 'Show') + ' removed (' + removedO.length + ')</button>' +
      (S.oShowRemoved ? '<ul class="nb-rows">' + removedO.map(ordRow).join('') + '</ul>' : '') : '';
    var orderedBox = view === 'day' && moved.length ? '<h3 class="nb-sh">Ordered today (' + moved.length + ')</h3><ul class="nb-done">' + moved.map(function (x) {
      return '<li><span class="nb-dt">' + (x.orderedAt ? clock(x.orderedAt) : '') + '</span><span class="nb-dx">' + esc(x.text) + (x.qty ? ' <em>' + esc(x.qty) + '</em>' : '') + '</span><span class="nb-dw">' + esc(x.orderedBy || '') + '</span>' +
        (canBrowse() ? '<button type="button" class="p-x nb-undo" data-p="otick" data-id="' + esc(x.id) + '" data-d="' + esc(x.date) + '" aria-pressed="true" aria-label="' + esc('Not ordered after all: ' + x.text) + '">Undo</button>' : '') + '</li>';
    }).join('') + '</ul>' : '';
    var body = view === 'all' ? ordAllHTML() :
      (S.ordState === 'error' ? '<p class="p-err">Could not load this page. Check the connection.</p>' :
        ordOverdueHTML(overdue, today) + (shown.length ? '<ul class="nb-rows">' + shown.slice().sort(function (a, b) { return (a.addedAt || 0) - (b.addedAt || 0); }).map(ordRow).join('') + '</ul>' : (overdue.length ? '' : live.length ? '<p class="nb-empty">Everything on this list has been ordered. See Ordered today below.</p>' : S.ordState === 'ok' ? '<p class="nb-empty">Nothing on the order list for ' + esc(dayName(S.ordDate).toLowerCase()) + ' yet.</p>' : '<p class="nb-empty">Loading...</p>')));
    return '<div class="nb-top"><span>' + (p ? 'Writing as <strong>' + esc(p.name) + '</strong>' : '') + '</span><span class="p-links"><a class="p-link" href="#/prep">Prep list</a>' + '' + '</span></div>' + tabs +
      '<section class="nb-page o-page' + (view === 'all' ? ' o-all' : '') + '"><header class="nb-ph"><div><h2 class="nb-title" id="rtitle" tabindex="-1">' + (view === 'all' ? 'To order' : 'Order list') + '</h2><span class="nb-date">' + (view === 'all' ? 'Across the last ' + ORD_DAYS + ' days' : esc(longDate(S.ordDate))) + '</span></div>' +
      (view === 'day' ? '<div class="nb-prog" role="status">' + nOrd + ' of ' + live.length + ' ordered</div>' : '') + '</header>' +
      /* the add box is at the top, so it is always in reach; on big screens the list and the ordered-today list sit side by side below it */
      (view === 'day' && add ? '<div class="nb-foot o-add">' + add + (canBrowse() ? '' : '<p class="hint nb-who">Only the head chef or a sous chef ticks a line as ordered or removes it. Wrote the wrong thing? Undo it straight away, or ask them.</p>') + '</div>' : '') +
      (view === 'day' && S.ordDate === today ? ordNudgeHTML(overdue, today) : '') +
      '<div class="o-cols"><div class="nb-body o-main">' + body + removedBox + '</div>' + (orderedBox ? '<div class="o-ordered">' + orderedBox + '</div>' : '') + '</div>' +
      '<div class="nb-tools o-tools"><button type="button" class="nb-btn" data-p="ocopy">' + shareLabel('for the supplier') + '</button><button type="button" class="nb-btn" data-p="oprint">Print</button></div></section>';
  }


  /* ---------- the wastage log ----------
     The Daily Wastage Sheet, on the phone: section, item, amount and unit, reason, what to do to stop it happening again,
     and who wrote it (time and name are added by themselves). The end-of-day review is saved per day and its
     "change for the next shift" shows on the next prep list. Staff add; the head chef and sous chefs can remove. */
  var UNITS = ['g', 'kg', 'L', 'portions', 'pieces'];
  var W_BIG = { g: 2000, kg: 20, L: 20, portions: 100, pieces: 100 };
  var REASONS = [['prep', 'Prep waste'], ['expired', 'Expired stock'], ['fault', 'Cooking fault'], ['returned', 'Returned'], ['excess', 'Excess production']];
  function reasonName(k) { var r = REASONS.filter(function (x) { return x[0] === k; })[0]; return r ? r[1] : k; }
  function wCol(date) { return fb.fs.collection.apply(null, [fb.db].concat(base(), ['waste', date, 'lines'])); }
  function wRef(date, id) { return fb.fs.doc.apply(null, [fb.db].concat(base(), ['waste', date, 'lines', id])); }
  function wDay(date) { return fb.fs.doc.apply(null, [fb.db].concat(base(), ['waste', date])); }
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
  /* Past days hardly change, so these reads are kept on the phone for the day (like lk.past): tag is kitchen PIN and day. */
  function dayCache(k, tag) { try { var c = JSON.parse(lsGet(k) || 'null'); return c && c.tag === tag ? c.v : null; } catch (e) { return null; } }
  function dayCacheSet(k, tag, v) { lsSet(k, JSON.stringify({ tag: tag, v: v })); }
  function loadWRecent(force) {
    var today = dayNow(), tag = S.pin + '|' + today;
    if (!fb || S.wRecentBusy || waiting('wRecent') || (S.wRecent && S.wRecentFor === today && !force)) return;
    var c = force ? null : dayCache('lk.w.recent', tag);
    if (c) { S.wRecent = c; S.wRecentFor = today; return; }
    S.wRecentBusy = true;
    var dates = [], i;
    for (i = 1; i <= 14; i++) dates.push(shift(today, -i));
    // a day that cannot be read (bad signal) is not kept as an empty day: nothing is cached, and the book tries again later
    var miss = [];
    Promise.all(dates.map(function (d) { return fb.fs.getDocs(wCol(d)).then(function (sn) { return sn.docs.map(function (x) { var v = x.data(); v.id = x.id; v.date = d; return v; }); }, function () { miss.push(d); return []; }); })).then(function (l) {
      S.wRecent = [].concat.apply([], l).filter(function (x) { return !x.deleted; }); S.wRecentMiss = miss; S.wRecentBusy = false;
      if (miss.length) { S.wRecentFor = ''; retryLater('wRecent'); }
      else { S.wRecentFor = today; dayCacheSet('lk.w.recent', tag, S.wRecent); }
      draw();
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
  /* the last time this item was logged (the last 14 days): a suggestion fills its unit, reason and section too */
  function wLast(t) { var k = okey(t); return (S.wRecent || []).filter(function (x) { return okey(x.text) === k; }).sort(function (a, b) { return (b.addedAt || 0) - (a.addedAt || 0); })[0] || null; }
  function addWaste() {
    var f = S.wf, p = me();
    if (!can('add')) return;
    var wpr = proofread(f.text.trim()), t = (wpr.text || '').slice(0, 80), amt = parseFloat(String(f.amt).replace(',', '.'));
    if (!t) { toast('Write what was wasted.'); focusK('w-text'); return; }
    if (!(amt > 0) || amt >= 100000) { toast('Write the amount as a number.'); focusK('w-amt'); return; }
    if (UNITS.indexOf(f.unit) < 0) { toast('Pick a unit.'); focusSel('.seg-b'); return; }
    // a big number for its unit is often grams typed with kg still picked: ask once (second tap on Log it)
    if (amt > (W_BIG[f.unit] || Infinity) && !arm('wbig:' + amt + f.unit)) { toast(amt + ' ' + f.unit + '? Check the unit. Tap Log it again if it is right.', null, 4000); focusSel('.seg-b[aria-checked="true"]'); return; }
    if (!REASONS.some(function (r) { return r[0] === f.reason; })) { toast('Pick a reason.'); focusSel(window.matchMedia && window.matchMedia('(max-width: 719px)').matches ? '.w-rbtn' : '.w-rchips .chip'); return; }
    var secInfo = {}, sec = cleanSection(f.sec, secInfo), rm = matchRecipe(t), ref = fb.fs.doc(wCol(S.wDate));
    sset(ref, { text: t, amount: amt, unit: f.unit, reason: f.reason, action: f.act.trim().slice(0, 120), station: sec, recipe: rm ? rm.id : '',
      addedBy: p ? p.name : '', addedById: p ? p.id : '', addedAt: now(), deleted: false }).catch(function (e) { failed(e, function () { if (!S.wf.text.trim()) S.wf = f; }); });
    if (sec) noteSection(sec);
    S.wf = { text: '', amt: '', unit: f.unit, reason: '', sec: sec, act: '' };
    draw(); focusK('w-text');
    /* Undo like the other lists. The rules let only the head chef or a sous chef change a wastage entry, so staff are told who can fix it. */
    var wmsg = 'Logged' + (wpr.changes.length ? ', corrected ' + wpr.changes.map(function (c) { return c[0] + ' to ' + c[1]; }).join(', ') : '') + (secInfo.from ? ' under ' + sec + ' (typed ' + secInfo.from + ')' : '');
    if (canBrowse()) toast(wmsg, { label: 'Undo', fn: function () { supd(ref, { deleted: true, deletedBy: (me() || {}).name || '', deletedAt: now() }).catch(failed); } });
    else toast(wmsg + '. Wrong? Ask the head chef or a sous chef to remove it.', null, 6000);
  }
  function focusK(k) { var el = S.root && S.root.querySelector('[data-k="' + k + '"]'); if (el) el.focus(); }
  function focusSel(sel) { var el = S.root && S.root.querySelector(sel); if (el && el.offsetParent !== null) el.focus(); }
  var wGone = {};   // past entries removed on this phone, kept so Undo can put them back into the Last 7 days copy
  function removeWaste(date, id, restore) {
    if (!canBrowse() || !can('del')) return;
    var today = dayNow(), it = (S.wLines || []).concat(S.wRecent || []).filter(function (x) { return x.id === id; })[0] || wGone[id];
    // an older day changed: today's lines come from the live list, so only the copy of the last 14 days needs patching.
    // It is kept in step here (no read), so Last 7 days shows the change at once and the day cache stays right.
    if (date !== today) {
      if (S.wRecent && S.wRecentFor === today) {
        S.wRecent = S.wRecent.filter(function (x) { return x.id !== id; });
        if (restore && it) S.wRecent.push(Object.assign({}, it, { date: date, deleted: false, deletedBy: '', deletedAt: 0 }));
        dayCacheSet('lk.w.recent', S.pin + '|' + today, S.wRecent);
      } else lsSet('lk.w.recent', '');
      if (it) { if (restore) delete wGone[id]; else wGone[id] = Object.assign({}, it, { date: date }); }
    }
    supd(wRef(date, id), { deleted: !restore, deletedBy: restore ? '' : (me() || {}).name || '', deletedAt: restore ? 0 : now() }).catch(failed);
    if (!restore) toast('Removed ' + (it ? it.text : 'the entry') + ' from the wastage log', { label: 'Undo', fn: function () { removeWaste(date, id, true); } });
  }
  function saveReview() {
    if (!can('add')) return;
    var p = me(), r = S.wReview || {};
    // someone else may have saved a review since this page read it: one small read on Save, and a second tap to replace it
    if (!S.wrChecked && fb.fs.getDocFromServer) {
      S.wrChecked = true;
      fb.fs.getDocFromServer(wDay(S.wDate)).then(function (sn) {
        var v = sn.exists() ? sn.data() : {};
        if ((v.reviewAt || 0) > (r.reviewAt || 0) && v.reviewBy && v.reviewBy !== (p ? p.name : '')) {
          S.wReview = v; arm('wreview'); draw();
          toast(v.reviewBy + ' saved a review at ' + clock(v.reviewAt) + ': "' + String(v.avoidable || v.change || '').slice(0, 60) + '". Tap Save again to replace it with yours.', null, 8000);
          S.wrChecked = false; return;
        }
        saveReview(); S.wrChecked = false;
      }, function () { saveReview(); S.wrChecked = false; });
      return;
    }
    if (armKey === 'wreview') arm('wreview');
    var a = (S.wrA != null ? S.wrA : r.avoidable || '').trim().slice(0, 300), c = (S.wrC != null ? S.wrC : r.change || '').trim().slice(0, 300);
    sset(wDay(S.wDate), { avoidable: a, change: c, reviewBy: p ? p.name : '', reviewAt: now() }, true).then(function () {
      S.wReview = { avoidable: a, change: c, reviewBy: p ? p.name : '', reviewAt: now() }; S.wrA = S.wrC = null; toast('Review saved'); 
    }, failed);
  }
  function wRow(x) {
    var del = canBrowse() && can('del') && !x.deleted;
    return '<li class="nb-row w-row' + (x.deleted ? ' is-removed' : '') + '"><span class="w-time">' + (x.addedAt ? clock(x.addedAt) : '') + (x.station ? '<br><span class="w-sec">' + esc(x.station) + '</span>' : '') + '</span>' +
      '<span class="nb-t"><strong>' + esc(x.text) + '</strong> <span class="w-amt">' + esc(num(+x.amount || 0) + ' ' + x.unit) + '</span> <span class="w-rs w-' + esc(x.reason) + '">' + esc(reasonName(x.reason)) + '</span>' +
      (x.action ? '<span class="w-act">' + esc(x.action) + '</span>' : '') + '</span><span class="nb-by">' + esc(x.addedBy || '') + '</span>' +
      (del ? '<button type="button" class="p-x" data-p="wdel" data-id="' + esc(x.id) + '" data-d="' + esc(x.date) + '" aria-label="' + esc('Remove ' + x.text) + '">Remove</button>' : '') +
      (x.deleted && canBrowse() && can('del') ? '<button type="button" class="p-x" data-p="wrestore" data-id="' + esc(x.id) + '" data-d="' + esc(x.date) + '" aria-label="' + esc('Put back ' + x.text) + '">Put back</button>' : '') + '</li>';
  }
  /* Bottom sheet for picking one thing on a phone (the waste reason). Big rows, a hint under each, Cancel or tap outside to close. */
  var REASON_HINT = { prep: 'Trim, peel and offcuts', expired: 'Past its date or gone off', fault: 'Burnt, dropped or done wrong', returned: 'Sent back by a guest', excess: 'Made more than was needed' };
  function sheetHTML() {
    if (S.sheet !== 'reason') return '';
    return '<div class="sheet-bg" data-p="sheet-close"></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-h"><div class="sheet-grip" aria-hidden="true"></div><h3 id="sheet-h">Why was it wasted?</h3><div class="sheet-list" role="radiogroup" aria-labelledby="sheet-h">' +
      REASONS.map(function (r) { return '<button type="button" class="sheet-o" role="radio" data-p="wreason" data-v="' + r[0] + '" aria-checked="' + (S.wf.reason === r[0]) + '"><strong>' + esc(r[1]) + '</strong><span>' + esc(REASON_HINT[r[0]] || '') + '</span></button>'; }).join('') +
      '</div><button type="button" class="btn sheet-x" data-p="sheet-close">Cancel</button></div>';
  }
  function wasteHTML() {
    var p = me(), br = canBrowse(), today = dayNow();
    if (!br && S.wDate !== today) { S.wDate = today; watchWaste(); }
    var f = S.wf, live = (S.wLines || []).filter(function (x) { return !x.deleted; }).sort(function (a, b) { return (a.addedAt || 0) - (b.addedAt || 0); });
    var shown = (S.wLines || []).filter(function (x) { return br || !x.deleted; }).sort(function (a, b) { return (a.addedAt || 0) - (b.addedAt || 0); });
    var view = br ? (S.wView || 'day') : 'day';
    var nav = br ? '<div class="nb-nav o-nav"><button type="button" class="chip" data-p="wview" data-v="day" aria-pressed="' + (view === 'day') + '">By day</button><button type="button" class="chip" data-p="wview" data-v="week" aria-pressed="' + (view === 'week') + '">Last 7 days</button>' +
      (view === 'day' ? '<span class="o-days"><button type="button" class="chip" data-p="wday" data-d="-1" aria-label="Back one day">&lsaquo;</button><button type="button" class="chip" data-p="wtoday" aria-pressed="' + (S.wDate === today) + '">Today</button><button type="button" class="chip" data-p="wday" data-d="1" aria-label="Forward one day">&rsaquo;</button></span>' : '') + '</div>' : '';
    if (view === 'week') return '<div class="nb-top"><span>' + (p ? 'Writing as <strong>' + esc(p.name) + '</strong>' : '') + '</span><span class="p-links"><a class="p-link" href="#/prep">Prep list</a></span></div>' + nav + wasteWeekHTML();
    var often = wOften();
    var add = can('add') && S.wDate === today ?
      '<form class="nb-add w-add" data-p-form="wadd">' + (often.length ? '<div class="w-often"><span class="nb-ql">Logged often</span><div class="chiprow">' + often.map(function (e, i) { return '<button type="button" class="chip sq" data-p="woften" data-i="' + i + '">' + esc(e.text) + '</button>'; }).join('') + '</div></div>' : '') +
      '<datalist id="w-sections">' + suggestions().map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join('') + '</datalist>' +
      '<div class="nb-add-row"><label class="visually-hidden" for="w-sec">Section</label><input id="w-sec" class="nb-in nb-in-sec" data-k="w-sec" list="w-sections" enterkeyhint="next" autocomplete="off" placeholder="Section" maxlength="40" value="' + esc(f.sec) + '">' +
      '<label class="visually-hidden" for="w-text">Item</label><input id="w-text" class="nb-in nb-in-text" data-k="w-text" enterkeyhint="next" autocomplete="off" placeholder="What was wasted?" maxlength="80" value="' + esc(f.text) + '">' +
      '<label class="visually-hidden" for="w-amt">Amount</label><input id="w-amt" class="nb-in nb-in-qty" data-k="w-amt" inputmode="decimal" enterkeyhint="next" autocomplete="off" placeholder="Amount (' + esc(f.unit || 'unit') + ')" maxlength="8" value="' + esc(f.amt) + '"></div>' +
      '<div class="nb-sugg" id="w-sugg">' + wSuggHTML() + '</div>' +
      '<div class="w-pick"><span class="nb-ql" id="w-unit-l">Unit</span><div class="seg" role="radiogroup" aria-labelledby="w-unit-l">' + UNITS.map(function (u) { return '<button type="button" class="seg-b" role="radio" data-p="wunit" data-v="' + u + '" aria-checked="' + (f.unit === u) + '">' + u + '</button>'; }).join('') + '</div></div>' +
      '<div class="w-pick"><span class="nb-ql" id="w-reason-l">Reason</span><div class="w-rchips" role="radiogroup" aria-labelledby="w-reason-l">' + REASONS.map(function (r) { return '<button type="button" class="chip" role="radio" data-p="wreason" data-v="' + r[0] + '" aria-checked="' + (f.reason === r[0]) + '">' + r[1] + '</button>'; }).join('') + '</div>' +
      '<button type="button" class="w-rbtn' + (f.reason ? '' : ' is-empty') + '" data-p="sheet" data-v="reason" aria-haspopup="dialog">' + (f.reason ? esc(reasonName(f.reason)) : 'Pick a reason') + '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>' +
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
      // the form sits at the top, like the order list, so logging waste on a busy day never means scrolling past every entry
      (add ? '<div class="nb-foot w-addtop">' + add + '</div>' : '') + '<div class="nb-body">' + body + '</div></section>' + review + sheetHTML();
  }
  /* The last 7 days on one page, grouped by day, for the head chef and sous chefs. */
  function wasteWeekHTML() {
    var today = dayNow(), from = shift(today, -6);
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
      var lost = !l.length && (S.wRecentMiss || []).indexOf(d) >= 0;
      return '<div class="nb-hd"><span>' + esc(d === today ? 'Today' : dayShort(d)) + '</span><span>' + (l.length ? l.length + ' &middot; ' + esc(totalsText(wTotals(l))) : lost ? 'could not load' : 'nothing logged') + '</span></div>' +
        (l.length ? '<ul class="nb-rows">' + l.map(wRow).join('') + '</ul>' : '');
    }).join('');
    return '<section class="nb-page o-page"><header class="nb-ph"><div><h2 class="nb-title" id="rtitle" tabindex="-1">Wastage</h2><span class="nb-date">Last 7 days</span></div><div class="nb-prog" role="status">' + lines.length + '</div></header>' +
      '<div class="nb-body">' + ((S.wRecentMiss || []).length ? '<p class="hint o-miss" role="alert">' + MISS_TEXT + '</p>' : '') + sum + body + '</div></section>';
  }
  /* Last night's "change for the next shift" note, shown on the prep list (the latest of the last 3 days). */
  function loadWNote() {
    var today = dayNow();
    if (!fb || S.wNoteFor === today) return;
    S.wNoteFor = today;
    var tag = S.pin + '|' + today, c = dayCache('lk.w.note', tag);
    if (c) { S.wNote = c.n; return; }
    var ds = [1, 2, 3].map(function (k) { return shift(today, -k); });
    Promise.all(ds.map(function (d) { return fb.fs.getDoc(wDay(d)).then(function (sn) { return sn.exists() ? Object.assign({ date: d }, sn.data()) : null; }, function () { return null; }); })).then(function (l) {
      S.wNote = l.filter(function (x) { return x && x.change; })[0] || null; dayCacheSet('lk.w.note', tag, { n: S.wNote }); draw();
    });
  }
  function wNoteHTML() {
    var n = S.wNote; if (!n || S.date !== dayNow()) return '';
    return '<div class="nb-flag"><span class="nb-sl">' + (n.date === shift(dayNow(), -1) ? 'From yesterday\'s waste review' : 'From the ' + esc(parseYmd(n.date).toLocaleDateString('en-AU', { weekday: 'long' })) + ' waste review') + '</span><p>' + esc(n.change) + '</p>' + (n.reviewBy ? '<span class="nb-sw">' + esc(n.reviewBy) + '</span>' : '') + '</div>';
  }

  /* ---------- shift pings (stored as notes) ----------
     The head chef, a sous chef, or anyone ticked for Pings in the People tab writes short pings for the shift (Shift pings tab in
     the admin panel; Shift pings in the prep book for everyone else). In the code and the data they are still called notes.
     The first time the book is opened after 10:30 on a day with a ping, the pings show once as a popup. The bell in the top bar opens them again.
     Data: kitchens/<PIN>/notes/<id> { text, tag, start, until, dows, removed, at, upd }. A note shows from start to until (YYYY-MM-DD),
     on the weekdays in dows when there are any (0 is Sunday). Notes are only flagged as removed, never deleted.
     Reads stay small: one query for notes that have not ended yet, once a phone opens each day (and again after 30 minutes away, or at 10:30
     if the book was already open). No live listener, no polling. "Got it" is remembered on the phone only (lk.note.seen). */
  var NOTE_TAGS = [['none', 'Ping'], ['off', 'Off today'], ['special', 'Special'], ['function', 'Function'], ['delivery', 'Delivery'], ['safety', 'Safety'], ['allergen', 'Allergen alert']];
  var NOTE_RANK = { safety: 0, allergen: 1, off: 2, special: 3, function: 4, delivery: 5, none: 6 };
  var NOTE_MIN = 10 * 60 + 30, NOTE_FAR = '2099-12-31', NOTE_STALE = 30 * 60000;
  var npop = null, nprev = null, nTick = null, n1030 = '', nSnooze = 0;
  function noteTagName(t) { var x = NOTE_TAGS.filter(function (n) { return n[0] === t; })[0]; return x ? x[1] : 'Ping'; }
  function noteOn(n, day) {
    if (!n || n.removed || !n.text || !n.start || !n.until || n.start > day || n.until < day) return false;
    return !(n.dows && n.dows.length) || n.dows.indexOf(parseYmd(day).getDay()) >= 0;
  }
  function noteRank(n) { return NOTE_RANK[n.tag] == null ? 6 : NOTE_RANK[n.tag]; }
  function todaysNotes() {
    var t = dayNow();
    if (!featOn('pings')) return [];
    return (S.notes || []).filter(function (n) { return noteOn(n, t); }).sort(function (a, b) { return noteRank(a) - noteRank(b) || (a.at || 0) - (b.at || 0); });
  }
  function noteSig(list) { return list.map(function (n) { return n.id + ':' + (n.upd || n.at || 0); }).join('|'); }
  function noteSeen() { try { return JSON.parse(lsGet('lk.note.seen') || '{}') || {}; } catch (e) { return {}; } }
  function noteUnread() { var l = todaysNotes(), s = noteSeen(); return !!l.length && !(s.d === dayNow() && s.sig === noteSig(l)); }
  function noteInfo() { var l = todaysNotes(); return { n: l.length, unread: noteUnread() }; }
  /* the bell in the top bar: hidden until there is a ping for today, with a dot while it is unread */
  function noteBell() {
    var i = noteInfo();
    Array.prototype.forEach.call(document.querySelectorAll('.nbell'), function (b) {
      b.hidden = !i.n; b.classList.toggle('has-new', i.unread);
      b.setAttribute('aria-label', i.n + ' shift ping' + (i.n === 1 ? '' : 's') + ' today' + (i.unread ? ', new' : ''));
    });
  }
  function notesInit() {
    if (!/^\d{4,6}$/.test(S.pin)) return;
    sdk().then(function () { loadNotes(); loadMinutes(); loadGuides(); startNoteTick(); }, function () {});
  }
  function loadNotes(force) {
    var today = dayNow();
    if (!fb || !/^\d{4,6}$/.test(S.pin) || S.notesBusy || !featOn('pings')) return;
    if (!force && S.notes && S.notesFor === today && Date.now() - S.notesAt < NOTE_STALE) return;
    S.notesBusy = true;
    fb.fs.getDocs(fb.fs.query(colRef('notes'), fb.fs.where('until', '>=', today))).then(function (snap) {
      S.notes = snap.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
      S.notesFor = today; S.notesAt = Date.now(); S.notesBusy = false;
      noteBell(); noteMaybePop(); draw();
    }, function () {
      // no signal, or a wrong kitchen PIN: carry on with what is already here and try again in about 5 minutes
      S.notesBusy = false; S.notesAt = Date.now() - NOTE_STALE + 5 * 60000; if (!S.notes) S.notes = [];
      noteBell(); draw();
    });
  }
  /* a note that names a recipe links to its card (the longest card name wins, a trailing s is allowed: "pies") */
  var NOTE_RN = null;
  function noteNames() {
    if (NOTE_RN) return NOTE_RN;
    var seen = {}; NOTE_RN = [];
    D.recipes.forEach(function (r) {
      [r.name, r.short].forEach(function (n) {
        var k = String(n || '').toLowerCase().replace(/\s+/g, ' ').trim();
        if (k.length >= 5 && !seen[k]) { seen[k] = 1; NOTE_RN.push({ n: k, id: r.id }); }
      });
    });
    NOTE_RN.sort(function (a, b) { return b.n.length - a.n.length; });
    return NOTE_RN;
  }
  function linkNote(text) {
    var lt = text.toLowerCase(), spans = [], out = '', pos = 0;
    noteNames().forEach(function (c) {
      var from = 0, i;
      while ((i = lt.indexOf(c.n, from)) >= 0) {
        var e = i + c.n.length;
        from = e;
        if (i > 0 && /[a-z0-9]/.test(lt.charAt(i - 1))) continue;
        if (lt.charAt(e) === 's' && !/[a-z0-9]/.test(lt.charAt(e + 1))) e++;
        if (e < lt.length && /[a-z0-9]/.test(lt.charAt(e))) continue;
        if (spans.some(function (s) { return i < s.e && e > s.s; })) continue;
        spans.push({ s: i, e: e, id: c.id });
      }
    });
    spans.sort(function (a, b) { return a.s - b.s; });
    spans.forEach(function (s) { out += esc(text.slice(pos, s.s)) + '<a class="nt-rl" href="#/r/' + esc(s.id) + '" data-note="link">' + esc(text.slice(s.s, s.e)) + '</a>'; pos = s.e; });
    return out + esc(text.slice(pos));
  }
  /* under the notes: last night's waste review change, and how the prep list stands (both already on the phone, no extra reads) */
  function noteSummary() {
    var out = [], t = dayNow(), w = S.wNote;
    if (w && w.change) out.push('<p><span class="nt-sl">' + (w.date === shift(t, -1) ? 'From yesterday\'s waste review' : 'From the ' + esc(parseYmd(w.date).toLocaleDateString('en-AU', { weekday: 'long' })) + ' waste review') + '</span> ' + esc(w.change) + '</p>');
    if (S.itemsState === 'ok' && S.date === t) {
      var live = S.items.filter(function (x) { return !x.deleted; }), open = live.filter(function (x) { return !x.done; });
      var urg = open.filter(function (x) { return x.urgent; }).length, stuck = canBrowse() ? open.filter(function (x) { return rolledN(x) >= 3; }).length : 0;
      if (live.length) out.push('<p><span class="nt-sl">Prep list</span> ' + open.length + ' of ' + live.length + ' lines still to do' + (urg ? ', ' + urg + ' urgent' : '') + (stuck ? ', ' + stuck + ' stuck (rolled over 3 times or more)' : '') + '.</p>');
    }
    return out.join('');
  }
  function noteSummaryRefresh() {
    var s = npop && npop.querySelector('#nt-sum');
    if (s) { var h = noteSummary(); if (s.innerHTML !== h) s.innerHTML = h; }
  }
  function noteRowHTML(n) {
    return '<li class="nt-i t-' + esc(n.tag || 'none') + '"><span class="nt-tag">' + esc(noteTagName(n.tag)) + '</span><p>' + linkNote(n.text) + '</p></li>';
  }
  function noteOpen(pv) {
    var list = pv ? pv.list : todaysNotes();
    if (npop || !list.length) return;
    var t = dayNow(), admDev = lsGet('lk.admin') === '1', editor = admDev ? '<a class="nt-edit" href="#/admin" data-note="edit">Write or edit pings</a>' : (canPing() ? '<a class="nt-edit" href="#/prep" data-note="edit-sous">Write or edit pings</a>' : '');
    nprev = document.activeElement;
    var el = document.createElement('div');
    el.className = 'nt-wrap';
    el.innerHTML = '<div class="nt-bg" data-note="dismiss"></div><section class="nt" role="dialog" aria-modal="true" aria-labelledby="nt-h" tabindex="-1">' +
      '<header class="nt-head"><span class="nt-eb">Leichhardt Hotel Kitchen</span><h2 class="nt-h" id="nt-h">' + (pv ? 'Preview' : 'Today\'s shift pings') + '</h2><span class="nt-date">' + esc(pv ? pv.label : parseYmd(t).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })) + '</span></header>' +
      '<ul class="nt-list">' + list.map(noteRowHTML).join('') + '</ul>' +
      '<div class="nt-sum" id="nt-sum">' + (pv ? '' : noteSummary()) + '</div>' +
      '<footer class="nt-foot"><button type="button" class="nt-got" data-note="close">' + (pv ? 'Close preview' : 'Got it') + '</button>' + (pv ? '' : editor) + '</footer></section>';
    if (pv) el.setAttribute('data-pv', '1');
    document.body.appendChild(el);
    npop = el;
    ovPush('note');
    document.documentElement.classList.add('note-open');
    loadWNote();
    var got = el.querySelector('.nt-got'); if (got) got.focus({ preventScroll: true });
  }
  /* Only Got it (or opening a link in the note) counts as read. Tapping outside or Escape just closes it: the bell
     keeps its dot and the popup comes back by itself after 15 minutes, so a stray tap cannot dismiss a safety note. */
  function noteClose(dismiss, noBack) {
    if (!npop) return;
    ovDone('note', noBack);
    var wasPv = npop.getAttribute('data-pv') === '1';
    npop.parentNode.removeChild(npop); npop = null;
    document.documentElement.classList.remove('note-open');
    if (!wasPv && dismiss) nSnooze = Date.now();
    else if (!wasPv) { noteMarkSeen(); noteWriteSeen(todaysNotes()); }
    if (nprev && nprev.focus && document.body.contains(nprev)) { try { nprev.focus({ preventScroll: true }); } catch (e) {} }
    nprev = null;
  }
  function noteMarkSeen() { lsSet('lk.note.seen', JSON.stringify({ d: dayNow(), sig: noteSig(todaysNotes()) })); noteBell(); }
  /* pops up by itself: after 10:30, when today has a note that has not been seen on this phone, and nobody is typing */
  function noteMaybePop() {
    if (npop || !noteUnread() || document.visibilityState === 'hidden' || Date.now() - nSnooze < 15 * 60000) return;
    var ae = document.activeElement;
    if (T.mins() < NOTE_MIN) return;
    if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && ae.type !== 'button') return;
    noteOpen();
  }
  /* A local check once a minute (no reads): pops the note when 10:30 arrives or typing stops, and fetches once at 10:30 and when a new day starts. */
  function startNoteTick() {
    if (nTick) return;
    if (T.mins() >= NOTE_MIN) n1030 = dayNow();
    nTick = setInterval(function () {
      var t = dayNow();
      if (S.guidesFor && S.guidesFor !== t) loadGuides();
      if (S.notesFor && S.notesFor !== t) { loadNotes(true); return; }
      if (n1030 !== t && T.mins() >= NOTE_MIN) { n1030 = t; loadNotes(true); return; }
      noteMaybePop(); mlMaybePop();
    }, 60000);
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && /^\d{4,6}$/.test(S.pin) && fb) { loadNotes(); noteMaybePop(); } });
  window.addEventListener('lk-clock', function () { draw(); });
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-note]');
    if (!el) return;
    var a = el.getAttribute('data-note');
    if (a === 'open') { noteOpen(); return; }
    if (a === 'close') { noteClose(); return; }
    if (a === 'dismiss') { noteClose(true); return; }
    if (a === 'link') { noteClose(false, true); return; }
    if (a === 'edit') { S.atab = 'notes'; lsSet('lk.prep.atab', 'notes'); noteClose(false, true); if (location.hash === '#/admin') draw(); return; }
    if (a === 'edit-sous') { S.notesOpen = true; S.nf = null; noteClose(false, true); if (location.hash === '#/prep') draw(); return; }
  });
  document.addEventListener('keydown', function (e) {
    if (!npop) return;
    if (e.key === 'Escape') { e.preventDefault(); noteClose(true); return; }
    if (e.key !== 'Tab') return;
    var f = Array.prototype.filter.call(npop.querySelectorAll('button, a[href]'), function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !npop.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* writing shift pings: the Shift pings tab of the admin panel (head chef) and Shift pings in the prep book (sous chefs and anyone ticked for Pings).
     The list comes first (showing today, coming up, past notes on request). The editor opens beside it on a
     big screen and above it on a phone. Days are picked on a five week grid and every tap can be undone. */
  var NOTE_START = { off: 'Off today: ', special: 'Special: ', 'function': 'Function: ', delivery: 'Delivery: ', safety: 'Safety: ', allergen: 'Allergen alert: ' };
  /* a note being written counts as unsaved once it differs from what the editor opened with (or has any text, if that is unknown) */
  function nfDirty() { var f = S.nf; if (!f || !S.nOpen) return false; return S.nfSnap ? JSON.stringify(f) !== S.nfSnap : !!f.text.trim(); }
  function nfNew() { return { id: '', text: '', tag: 'none', start: dayNow(), until: '', dows: [], run: false }; }
  function nfFrom(n) {
    var rep = n.dows && n.dows.length, until = n.until === NOTE_FAR || (n.until === n.start && !rep) ? '' : n.until;
    return { id: n.id, text: n.text, tag: n.tag || 'none', start: n.start, until: until, dows: (n.dows || []).slice(), run: !!until };
  }
  function noteDay(s, t) { return s === t ? 'today' : s === shift(t, 1) ? 'tomorrow' : dayShort(s); }
  function noteWhen(n) {
    var t = dayNow(), rep = n.dows && n.dows.length, out;
    if (rep) {
      var names = DOW.filter(function (d) { return n.dows.indexOf(d) >= 0; }).map(function (d) { return DOWN[DOW.indexOf(d)]; }).join(', ');
      out = 'Every ' + names + ' from ' + noteDay(n.start, t) + (n.until === NOTE_FAR ? '' : ' until ' + noteDay(n.until, t));
    } else out = n.until === n.start ? noteDay(n.start, t) : noteDay(n.start, t) + ' to ' + noteDay(n.until, t);
    return out.charAt(0).toUpperCase() + out.slice(1);
  }
  function nfUntil(f) { return f.until || (f.dows.length ? NOTE_FAR : f.start); }
  function nfDraft(f) { return { id: 'draft', text: f.text.replace(/^\s+|\s+$/g, ''), tag: f.tag, start: f.start, until: nfUntil(f), dows: f.dows.slice() }; }
  function draftPreviewHTML(f) {
    var d = nfDraft(f);
    return d.text ? '<ul class="nt-list n-pl">' + noteRowHTML(d) + '</ul>' : '<p class="hint">Type the ping to see how it will look.</p>';
  }
  function noteRowAdmin(n, t, past) {
    var who = personName(n.author || n.by), sn = S.nSeen && S.nSeen[n.id], today = !past && noteOn(n, t), seen = '';
    if (today) {
      if (sn && sn.state === 'ok') seen = '<span class="nt-by n-seen">Seen today by ' + sn.names.length + (sn.names.length ? ': ' + esc(sn.names.join(', ')) : '') + '. <button type="button" class="p-x" data-p="n-seen" data-id="' + esc(n.id) + '">Refresh</button></span>';
      else if (sn && sn.state === 'loading') seen = '<span class="nt-by n-seen">Checking who has seen it...</span>';
      else seen = '<span class="nt-by n-seen"><button type="button" class="p-x" data-p="n-seen" data-id="' + esc(n.id) + '">Who has seen it today</button></span>';
    }
    return '<li class="nt-row t-' + esc(n.tag || 'none') + '"><div class="nt-rt"><span class="nt-tag">' + esc(noteTagName(n.tag)) + '</span><span class="nt-when">' + esc(noteWhen(n)) + '</span></div><p>' + esc(n.text) + '</p>' +
      (who ? '<span class="nt-by">Written by ' + esc(who) + '</span>' : '') + seen +
      '<div class="btn-row">' + (past ? '' : '<button type="button" class="p-x" data-p="n-edit" data-id="' + esc(n.id) + '">Edit</button>') +
      '<button type="button" class="p-x" data-p="n-reuse" data-id="' + esc(n.id) + '">Use again</button>' +
      (past ? '' : '<button type="button" class="p-x" data-p="n-del" data-id="' + esc(n.id) + '">' + (armed('n-del:' + n.id) ? 'Tap again to remove' : 'Remove') + '</button>') + '</div></li>';
  }
  function notesListHTML() {
    if (S.notes == null) return '<p class="hint">Loading...</p>';
    var t = dayNow(), live = S.notes.filter(function (n) { return !n.removed && n.until >= t; });
    var onNow = live.filter(function (n) { return noteOn(n, t); }).sort(function (a, b) { return noteRank(a) - noteRank(b) || (a.at || 0) - (b.at || 0); });
    var later = live.filter(function (n) { return !noteOn(n, t); }).sort(function (a, b) { return String(a.start).localeCompare(String(b.start)) || (a.at || 0) - (b.at || 0); });
    function grp(title, l, past) { return l.length ? '<h3 class="n-gh3">' + title + ' (' + l.length + ')</h3><ul class="nt-rows">' + l.map(function (n) { return noteRowAdmin(n, t, past); }).join('') + '</ul>' : ''; }
    /* Coming up and Past notes can both get long (weekly repeats, months of history): search, tag chips and Show more */
    function noteList(key, title, l, past, sorter) {
      if (!l.length) return '';
      return '<h3 class="n-gh3">' + title + ' (' + l.length + ')</h3>' + lvHTML({
        key: key, items: l, step: 8, tools: 6, noun: ['ping', 'pings'], ph: 'Search pings', empty: 'No pings.',
        find: function (n) { return n.text + ' ' + noteTagName(n.tag) + ' ' + (personName(n.by) || ''); },
        filters: [['all', 'All pings']].concat(NOTE_TAGS.map(function (x) { return [x[0], x[1], function (n) { return (n.tag || 'none') === x[0]; }]; })),
        sorts: sorter, card: function (n) { return noteRowAdmin(n, t, past); }
      });
    }
    var out = grp('Showing today', onNow) + noteList('notes-later', 'Coming up', later, false, [['soon', 'Soonest first', function (a, b) { return String(a.start).localeCompare(String(b.start)) || (a.at || 0) - (b.at || 0); }], ['late', 'Furthest away first', function (a, b) { return String(b.start).localeCompare(String(a.start)) || (b.at || 0) - (a.at || 0); }]]);
    if (!onNow.length && !later.length) out = '<p class="hint">No pings are set for today or the days ahead. Tap Write a ping to add one.</p>';
    var pastBtn = '<button type="button" class="btn" data-p="n-past">' + (S.nPastOpen ? 'Hide past pings' : 'Past pings') + '</button>';
    var pastList = '';
    if (S.nPastOpen) {
      if (S.nPast === 'loading') pastList = '<p class="hint">Loading...</p>';
      else if (S.nPast === 'error') pastList = '<p class="hint">Could not load past pings. Check the connection and try again.</p>';
      else if (S.nPast && S.nPast.length) {
        var moreOld = S.nPast.length >= (S.nPastN || 30);
        pastList = noteList('notes-past', 'Past pings', S.nPast, true, [['new', 'Newest first', function (a, b) { return String(b.until).localeCompare(String(a.until)) || (b.at || 0) - (a.at || 0); }], ['old', 'Oldest first', function (a, b) { return String(a.until).localeCompare(String(b.until)) || (a.at || 0) - (b.at || 0); }]]) +
          '<p class="hint">The last ' + S.nPast.length + ' pings that have finished. Use again copies one into a new ping.</p>' + (moreOld ? '<div class="btn-row"><button type="button" class="btn" data-p="n-past-more">Load 30 older pings</button></div>' : '');
      } else pastList = '<p class="hint">No finished pings yet.</p>';
    }
    return out + '<div class="btn-row n-pastrow">' + pastBtn + '</div>' + pastList;
  }
  function dayGridHTML(f) {
    var t = dayNow(), lead = (parseYmd(t).getDay() + 6) % 7, first = shift(t, -lead), end = f.until || f.start, cells = '', i;
    DOWN.forEach(function (h) { cells += '<span class="n-gh" aria-hidden="true">' + h + '</span>'; });
    for (i = 0; i < 35; i++) {
      var d = shift(first, i), dt = parseYmd(d), inr = d >= f.start && d <= end;
      if (d < t) { cells += '<span class="n-gd n-off" aria-hidden="true"></span>'; continue; }
      var dim = f.dows.length && inr && f.dows.indexOf(dt.getDay()) < 0;
      cells += '<button type="button" class="n-gd' + (inr ? ' n-in' : '') + (d === f.start ? ' n-s' : '') + (f.until && d === f.until ? ' n-e' : '') + (dim ? ' n-dim' : '') + (d === t ? ' n-today' : '') + '" data-p="n-day" data-v="' + d + '" aria-pressed="' + inr + '" aria-label="' + esc(dt.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })) + '">' +
        (dt.getDate() === 1 || i === 0 ? '<small>' + esc(dt.toLocaleDateString('en-AU', { month: 'short' })) + '</small>' : '') + dt.getDate() + '</button>';
    }
    return '<div class="n-grid" role="group" aria-label="Days">' + cells + '</div>';
  }
  function noteEditForm() {
    var f = S.nf || (S.nf = nfNew()), t = dayNow(), until = nfUntil(f);
    var tags = NOTE_TAGS.map(function (x) { return '<button type="button" class="chip" data-p="n-tag" data-v="' + x[0] + '" aria-pressed="' + (f.tag === x[0]) + '">' + esc(x[1]) + '</button>'; }).join('');
    var dows = DOW.map(function (d, i) { return '<button type="button" class="chip sq" data-p="n-dow" data-v="' + d + '" aria-pressed="' + (f.dows.indexOf(d) >= 0) + '" aria-label="' + DOWN[i] + '">' + DOWN[i] + '</button>'; }).join('');
    var when = f.start && until >= f.start ? 'Shows: ' + noteWhen({ start: f.start, until: until, dows: f.dows }) + '.' : 'The last day cannot be before the first day.';
    var single = !f.run && !f.until;
    return '<section class="set-block n-edit"><span class="label">' + (f.id ? 'Edit this ping' : 'Write a ping') + '</span>' +
      '<span class="hint">Short and plain. It pops up the first time the book is opened after 10:30, and shows from the bell. No prices, PINs or staff names. A recipe name links to its card.</span>' +
      '<div class="field"><label class="label" for="n-text">Ping</label><textarea id="n-text" class="p-bulk" data-k="n-text" rows="4" maxlength="400" placeholder="For example: Barramundi is off until Thursday.">' + esc(f.text) + '</textarea><span class="hint" id="n-count">' + f.text.length + ' of 400. Ctrl+Enter saves.</span></div>' +
      '<div class="field"><span class="label">Tag (starts the ping for you)</span><div class="nt-chips" role="group" aria-label="Tag">' + tags + '</div></div>' +
      '<div class="field"><span class="label">How it will look</span><div id="n-prev" class="n-prev">' + draftPreviewHTML(f) + '</div></div>' +
      '<div class="field"><span class="label">Show on</span><div class="nt-chips"><button type="button" class="chip" data-p="n-quick" data-v="0" aria-pressed="' + (f.start === t && single && !f.dows.length) + '">Today</button><button type="button" class="chip" data-p="n-quick" data-v="1" aria-pressed="' + (f.start === shift(t, 1) && single && !f.dows.length) + '">Tomorrow</button>' +
      '<button type="button" class="chip" data-p="n-mode" data-v="one" aria-pressed="' + (!f.run && !f.until) + '">One day</button><button type="button" class="chip" data-p="n-mode" data-v="run" aria-pressed="' + (f.run || !!f.until) + '">Several days</button></div>' +
      '<span class="hint">' + (f.run || f.until ? 'Tap the first day, then the last day. Tap the last day again to take it back.' : 'Tap a day to schedule the ping ahead of time.') + '</span>' + dayGridHTML(f) +
      '<details class="n-more"' + (f.start > shift(t, 34) || (f.until && f.until > shift(t, 34)) ? ' open' : '') + '><summary>A date further ahead</summary><div class="nt-dates"><label class="nt-dl">From<input type="date" class="p-dateinput" data-k="n-start" value="' + esc(f.start) + '"' + (f.id ? '' : ' min="' + t + '"') + '></label><label class="nt-dl">Until (optional)<input type="date" class="p-dateinput" data-k="n-until" value="' + esc(f.until) + '"' + (f.start ? ' min="' + esc(f.start) + '"' : '') + '></label></div></details></div>' +
      '<div class="field"><span class="label">Repeat every week on (optional)</span><div class="nt-chips" role="group" aria-label="Weekdays">' + dows + (f.dows.length ? '<button type="button" class="chip" data-p="n-dowclr">Clear weekdays</button>' : '') + '</div><span class="hint">With weekdays picked and no last day, the ping comes back every week until you remove it.</span></div>' +
      '<p class="nt-whenline" role="status">' + esc(when) + '</p>' +
      '<div class="btn-row"><button type="button" class="btn dark" data-p="n-save"' + (S.nSaving ? ' disabled' : '') + '>' + (f.id ? 'Save changes' : 'Save ping') + '</button><button type="button" class="btn" data-p="n-preview">Preview the popup</button><button type="button" class="btn" data-p="n-reset">Reset days</button><button type="button" class="btn" data-p="n-cancel">' + (armed('n-cancel') ? 'Tap again to discard' : f.id ? 'Cancel' : 'Close') + '</button></div>' +
      '<span class="saved" role="status">' + esc(S.nMsg) + '</span></section>';
  }
  function notesEditorHTML() {
    var open = !!S.nOpen;
    return '<div class="n-ws' + (open ? ' has-ed' : '') + '">' + (open ? '<div class="n-ed">' + noteEditForm() + '</div>' : '') +
      '<section class="set-block n-lst"><div class="n-lh"><div><span class="label">Pings set</span><span class="hint">Today first, then the days ahead.</span></div>' + (open ? '' : '<button type="button" class="btn dark" data-p="n-new">Write a ping</button>') + '</div>' +
      (open ? '' : '<span class="saved" role="status">' + esc(S.nMsg) + '</span>') + notesListHTML() + '</section></div>';
  }
  function notesPageHTML() {
    return '<div class="p-admin"><div class="p-bar"><span>Shift pings</span><span class="p-links"><button type="button" class="p-link" data-p="notes-close">Back to the prep book</button></span></div><h2 class="p-h" id="rtitle" tabindex="-1">Shift pings</h2>' + notesEditorHTML() + '</div>';
  }
  function saveNote() {
    var f = S.nf;
    if (!f || S.nSaving || !fb) return;
    var text = f.text.replace(/\s+$/g, '').replace(/^\s+/g, ''), start = f.start, until = nfUntil(f), re = /^\d{4}-\d{2}-\d{2}$/;
    if (!text) { S.nMsg = 'Write the ping first.'; draw(); return; }
    if (!re.test(start || '') || !re.test(until)) { S.nMsg = 'Pick the first day.'; draw(); return; }
    if (until < start) { S.nMsg = 'The last day cannot be before the first day.'; draw(); return; }
    var data = { text: text.slice(0, 400), tag: f.tag, start: start, until: until, dows: f.dows.slice().sort(), removed: false, upd: now() };
    // author is who wrote the ping and never changes; by is who saved it last (the rules need by to be the writer)
    if (!f.id) { data.at = now(); data.author = S.who || ''; }
    var ref = f.id ? docRef('notes', f.id) : fb.fs.doc(colRef('notes')), when = noteWhen({ start: start, until: until, dows: data.dows });
    S.nSaving = true; S.nMsg = ''; draw();
    sset(ref, data, !!f.id).then(function () {
      S.nSaving = false; S.nf = nfNew(); S.nOpen = false; S.nMsg = 'Saved. Shows: ' + when + '.'; loadNotes(true); draw();
    }, function (e) {
      S.nSaving = false; S.nMsg = e && e.code === 'permission-denied' ? 'Not allowed. Ask the head chef to tick Pings for you in the admin panel.' : 'Could not save. Check the connection and try again.'; draw();
    });
  }
  function removeNote(id) {
    if (!arm('n-del:' + id)) return;
    sset(docRef('notes', id), { removed: true, upd: now() }, true).then(function () {
      if (S.nf && S.nf.id === id) { S.nf = nfNew(); S.nOpen = false; }
      S.nMsg = 'Removed.'; loadNotes(true); draw();
      toast('Ping removed.', { label: 'Undo', fn: function () { sset(docRef('notes', id), { removed: false, upd: now() }, true).then(function () { S.nMsg = ''; loadNotes(true); draw(); }, failed); } });
    }, function () { S.nMsg = 'Could not remove. Check the connection and try again.'; draw(); });
  }
  /* finished pings: one query when asked for (30 at most) */
  function loadPastNotes(more) {
    if (!fb || S.nPast === 'loading') return;
    S.nPastN = more ? (S.nPastN || 30) + 30 : 30;
    var keep = Array.isArray(S.nPast) ? S.nPast : null;
    S.nPast = 'loading'; draw();
    fb.fs.getDocs(fb.fs.query(colRef('notes'), fb.fs.where('until', '<', dayNow()), fb.fs.orderBy('until', 'desc'), fb.fs.limit(S.nPastN))).then(function (snap) {
      S.nPast = snap.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }).filter(function (x) { return !x.removed; }); draw();
    }, function () { S.nPast = keep || 'error'; if (keep) toast('Could not load more. Check the connection.'); draw(); });
  }
  /* put the cursor in the note and bring the editor up under the sticky tabs, so the phone keyboard never hides it */
  function focusNoteText(tx) {
    tx.focus({ preventScroll: true });
    tx.scrollIntoView({ block: 'start' });
  }
  function reuseNote(id) {
    var n = (S.notes || []).concat(Array.isArray(S.nPast) ? S.nPast : []).filter(function (x) { return x.id === id; })[0];
    if (!n) return;
    S.nf = nfNew(); S.nf.text = n.text; S.nf.tag = n.tag || 'none'; S.nfSnap = ''; S.nOpen = true; S.nMsg = '';
    draw(); var tx = S.root.querySelector('[data-k="n-text"]'); if (tx) { focusNoteText(tx); }
  }
  /* who tapped Got it today for one note (one small query, only when asked) */
  function loadSeen(id) {
    if (!fb) return;
    S.nSeen = S.nSeen || {}; S.nSeen[id] = { state: 'loading', names: [] }; draw();
    fb.fs.getDocs(fb.fs.query(fb.fs.collection.apply(null, [fb.db].concat(base(), ['notes', id, 'seen'])), fb.fs.where('day', '==', dayNow()))).then(function (snap) {
      var seen = {}, names = [];
      snap.docs.forEach(function (d) { var by = d.data().by; if (by && !seen[by]) { seen[by] = 1; names.push(personName(by) || 'Someone'); } });
      S.nSeen[id] = { state: 'ok', names: names.sort() }; draw();
    }, function () { delete S.nSeen[id]; S.nMsg = 'Could not check. Try again.'; draw(); });
  }
  /* "Got it" on a phone where someone is signed in leaves one small record per person, note and day */
  function noteWriteSeen(list) {
    if (!fb || !S.who || !S.tok || !list.length) return;
    var day = dayNow(), rec; try { rec = JSON.parse(lsGet('lk.note.sw') || '{}') || {}; } catch (e) { rec = {}; }
    if (rec.d !== day || rec.w !== S.who) rec = { d: day, w: S.who, ids: [] };
    list.forEach(function (n) {
      if (rec.ids.indexOf(n.id) >= 0) return;
      rec.ids.push(n.id); lsSet('lk.note.sw', JSON.stringify(rec));
      sset(fb.fs.doc.apply(null, [fb.db].concat(base(), ['notes', n.id, 'seen', day + '_' + S.who])), { day: day, at: now() }).catch(function () {});
    });
  }

  /* ---------- kitchen meeting minutes ----------
     The head chef (admin panel, Minutes tab) writes the minutes after a meeting and publishes them. Sous chefs (Handy, "Minutes register") only see the register.
     Staff read them at #/minutes in one fixed layout and sign with their own PIN. A card on the landing page and a nudge on the prep list show until a person has signed; Meeting minutes in Handy opens them any time.
     Data: kitchens/<PIN>/minutes/<id> { no, v, status draft|published, date, start, loc, chair, taker, guests, next, decisions, menu, safety, dates, other,
       att: [{ id, st present|apology|absent }], acts: [{ what, who, by, st open|done|dropped, carried }], pubAt, removed, at, upd }.
     A change after publishing makes version v+1 and everyone signs again. Each earlier version is kept in minutes/<id>/hist/<v>.
     Sign-offs: minutes/<id>/signs/<v>_<staffId> { v, st, at, name }. Created once, never changed or deleted.
     Reads stay small: one query a day per phone for minutes of the last 90 days, plus one read per open minutes for the person's own sign-off.
     Staff ids only are stored in att and acts (names are looked up from the staff list). No listener, no polling. */
  var MN_DAYS = 90, MN_OPEN = 30, MN_LATE = 3, MN_STALE = 30 * 60000;
  var MN_ATT = [['present', 'Present'], ['apology', 'Apology'], ['absent', 'Absent']];
  var MN_ALL = { decisions: 'Decisions', menu: 'Menu changes', safety: 'Safety', dates: 'Dates ahead', other: 'Other' };
  function mnName(id) { var p = ((S.config && S.config.people) || []).filter(function (x) { return x.id === id; })[0]; return p ? p.name : (id ? 'Former staff' : ''); }
  function mnLines(t) { return String(t || '').split(/\n/).map(function (s) { return s.trim(); }).filter(Boolean); }
  /* only the head chef (Google account) writes and publishes minutes. Sous chefs read the register. */
  function mnCanWrite() { return S.level === 'owner'; }
  function mnById(id) { return (S.mins || []).filter(function (m) { return m.id === id; })[0] || null; }
  function mnPub() { return (S.mins || []).filter(function (m) { return m.status === 'published' && !m.removed; }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)) || (b.no || 0) - (a.no || 0); }); }
  function mnDrafts() { return (S.mins || []).filter(function (m) { return m.status === 'draft' && !m.removed; }).sort(function (a, b) { return (b.upd || 0) - (a.upd || 0); }); }
  function mnOpenList() { var from = shift(dayNow(), -MN_OPEN); return mnPub().filter(function (m) { return m.date >= from; }); }
  /* whose sign-off to check: the minutes the book still nags about (last MN_OPEN days), plus whatever older minutes are open on
     the page, so anything readable (MN_DAYS) can still be signed. One small read each, remembered for the day. */
  function mnMineList() {
    var list = mnOpenList(), pub = mnPub(), sel = S.name === 'minutes' ? (mnById(S.mSel) || pub[0] || null) : null;
    if (sel && sel.status === 'published' && !sel.removed && list.indexOf(sel) < 0) list = list.concat([sel]);
    return list;
  }
  function mnKey(m) { return m.id + '_' + m.v + '_' + S.who; }
  function mnUnsigned() {
    if (!S.who || !S.mins || (S.config && !who())) return [];
    return mnOpenList().filter(function (m) { return S.mmine[mnKey(m)] === null; });
  }
  /* the card on the landing page (js/app.js draws the empty slot): filled in while the person on this phone has minutes to sign */
  function minCard() {
    var h = minNudgeHTML();
    Array.prototype.forEach.call(document.querySelectorAll('.wall-mn'), function (el) { if (el.lkMn !== h) { el.innerHTML = h; el.lkMn = h; } });
  }
  function minNudgeHTML() {
    var u = featOn('minutes') ? mnUnsigned() : [];
    if (!u.length) return '';
    return '<div class="mn-nudge" role="status"><span><b>Minutes not signed yet</b> Kitchen meeting, ' + esc(dayShort(u[0].date)) + (u.length > 1 ? ' and ' + (u.length - 1) + ' more' : '') + '</span><a class="mn-nudge-btn" href="#/minutes" data-mn="' + esc(u[0].id) + '">Read and sign</a></div>';
  }
  // "Read and sign" opens the minutes the card names, not just the newest published ones (the card sits outside the prep root)
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('.mn-nudge-btn[data-mn]'); if (a) { S.mSel = a.getAttribute('data-mn'); S.mErr = ''; } }, true);
  function loadMinutes(force) {
    var today = dayNow();
    if (!fb || !/^\d{4,6}$/.test(S.pin) || S.minsBusy || !featOn('minutes')) return;
    if (!force && S.mins && S.minsFor === today && Date.now() - S.minsAt < MN_STALE) return;
    S.minsBusy = true;
    fb.fs.getDocs(fb.fs.query(colRef('minutes'), fb.fs.where('date', '>=', shift(today, -MN_DAYS)))).then(function (snap) {
      S.mins = snap.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
      S.minsFor = today; S.minsAt = Date.now(); S.minsBusy = false;
      loadMine(); minCard(); draw();
    }, function () {
      // no signal, or the minutes rules are not published yet: carry on without them and try again in about 5 minutes
      S.minsBusy = false; S.minsAt = Date.now() - MN_STALE + 5 * 60000; if (!S.mins) S.mins = [];
      minCard(); draw();
    });
  }
  /* has this person signed the current version? one small read per open minutes, remembered for the day */
  function loadMine() {
    if (!fb || !S.who || !S.mins) return;
    var w = S.who, jobs = [];
    mnMineList().forEach(function (m) {
      var k = m.id + '_' + m.v + '_' + w;
      if (S.mmine[k] !== undefined || waiting('mine:' + k)) return;
      S.mmine[k] = 'loading';
      jobs.push(fb.fs.getDoc(fb.fs.doc.apply(null, [fb.db].concat(base(), ['minutes', m.id, 'signs', m.v + '_' + w]))).then(function (sn) { S.mmine[k] = sn.exists() ? sn.data() : null; }, function () { delete S.mmine[k]; retryLater('mine:' + k); }));
    });
    if (jobs.length) Promise.all(jobs).then(function () { minCard(); draw(); });
  }
  function loadSigns(id, force) {
    if (!fb || !id) return;
    var cur = S.msigns[id];
    if (cur && (cur.loading || !force)) return;
    S.msigns[id] = { loading: true, list: (cur && cur.list) || null };
    fb.fs.getDocs(fb.fs.collection.apply(null, [fb.db].concat(base(), ['minutes', id, 'signs']))).then(function (sn) {
      S.msigns[id] = { loading: false, list: sn.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }) }; draw();
    }, function () { S.msigns[id] = { loading: false, list: [], err: true }; draw(); });
  }

  /* ---- the minutes as staff read them ---- */
  function mnBox(num, title, inner, cls) {
    return '<section class="mn-box' + (cls ? ' ' + cls : '') + '"><h3 class="mn-bh">' + (num ? '<span class="mn-bn">' + num + '</span>' : '') + esc(title) + '</h3>' + inner + '</section>';
  }
  function mnList(t, link) { return '<ul class="mn-ul">' + mnLines(t).map(function (l) { return '<li>' + (link ? linkNote(l) : esc(l)) + '</li>'; }).join('') + '</ul>'; }
  function mnDocHTML(m, sign) {
    var d = parseYmd(m.date || dayNow()), n = 0, att = m.att || [], by = { present: [], apology: [], absent: [] };
    function nx() { n++; return pad(n); }
    att.forEach(function (x) { if (by[x.st]) by[x.st].push(mnName(x.id)); });
    var cells = [['Time', m.start || ''], ['Location', m.loc || ''], ['Run by', mnName(m.chair)], ['Minutes taken by', mnName(m.taker)]].filter(function (c) { return c[1]; }).map(function (c) { return '<div class="mn-cell"><span>' + esc(c[0]) + '</span><b>' + esc(c[1]) + '</b></div>'; }).join('');
    var counts = by.present.length + ' present' + (by.apology.length ? ', ' + by.apology.length + ' apology' : '') + (by.absent.length ? ', ' + by.absent.length + ' absent' : '');
    var out = '<article class="mn-doc"><header class="mn-head"><div><span class="mn-eb">Kitchen meeting &middot; Version ' + (m.v || 1) + '</span><h2 class="mn-title" id="rtitle" tabindex="-1">' + esc(d.toLocaleDateString('en-AU', { weekday: 'long' })) + '<br>' + esc(d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })) + '</h2></div><div class="mn-no"><span>Minutes</span><b>' + pad(m.no || 0) + '</b></div></header>' +
      '<div class="mn-strip">' + cells + '<div class="mn-cell mn-wide"><span>Attendance</span><b>' + esc(counts) + '</b></div></div>';
    if (mnLines(m.safety).length) out += '<div class="mn-safety" role="note"><span class="mn-sl">Safety</span>' + mnList(m.safety, true) + '</div>';
    if (mnLines(m.decisions).length) out += mnBox(nx(), 'Decisions', '<ol class="mn-ol">' + mnLines(m.decisions).map(function (l) { return '<li><span class="mn-c">' + '</span><span>' + linkNote(l) + '</span></li>'; }).join('') + '</ol>');
    var acts = (m.acts || []).filter(function (a) { return a && a.what; });
    if (acts.length) out += mnBox(nx(), 'Actions', '<div class="mn-tw"><table class="mn-tbl"><thead><tr><th scope="col">Action</th><th scope="col">Who</th><th scope="col">By</th></tr></thead><tbody>' + acts.map(function (a) {
      var tag = a.st === 'done' ? '<span class="mn-chip">Done</span>' : a.st === 'dropped' ? '<span class="mn-chip">Dropped</span>' : a.carried ? '<span class="mn-chip">Carried over</span>' : '';
      var mine = sign && S.who && (a.who === S.who || a.who === 'all');
      return '<tr class="' + (a.st && a.st !== 'open' ? 'is-closed' : '') + (mine ? ' is-mine' : '') + '"><td>' + (mine ? '<span class="mn-chip mn-yours">Yours</span> ' : '') + linkNote(a.what) + (tag ? '<br>' + tag : '') + '</td><td>' + esc(a.who === 'all' ? 'Everyone' : mnName(a.who)) + '</td><td>' + esc(a.by ? dayShort(a.by) : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>');
    if (mnLines(m.menu).length) out += mnBox(nx(), 'Menu changes', mnList(m.menu, true));
    if (mnLines(m.dates).length) out += mnBox(nx(), 'Dates ahead', mnList(m.dates, true));
    if (mnLines(m.other).length) out += mnBox(nx(), 'Other', mnList(m.other, true));
    var who2 = MN_ATT.map(function (x) { return by[x[0]].length ? '<div class="mn-wr"><b>' + x[1] + '</b><span>' + esc(by[x[0]].join(', ')) + '</span></div>' : ''; }).join('') + (m.guests ? '<div class="mn-wr"><b>Guests</b><span>' + esc(m.guests) + '</span></div>' : '') + (m.next ? '<div class="mn-wr"><b>Next meeting</b><span>' + esc(dayShort(m.next)) + '</span></div>' : '');
    out += mnBox('', 'Who was there', who2, 'mn-who') + '</article>';
    return out + (sign ? mnSignHTML(m) : '');
  }
  function mnSignHTML(m) {
    var p = me(); if (!p) return '';
    var s = S.mmine[mnKey(m)], my = (m.att || []).filter(function (x) { return x.id === S.who; })[0], st = my ? my.st : 'absent';
    if (s && s !== 'loading') return '<section class="mn-sign is-done"><h3 class="mn-bh">Signed</h3><p>' + esc(p.name) + ' signed on ' + esc(dayShort(T.day(s.at))) + ' at ' + esc(clock(s.at)) + '. Version ' + m.v + '.</p></section>';
    if (s === undefined || s === 'loading') return '<section class="mn-sign mn-noprint"><p class="hint">Checking your sign-off...</p></section>';
    // one tap: the person already typed their own PIN to open this page (20 Oct 2026, no second PIN)
    var mineN = (m.acts || []).filter(function (a) { return a && a.what && (!a.st || a.st === 'open') && (a.who === S.who || a.who === 'all'); }).length;
    return '<section class="mn-sign mn-noprint"><h3 class="mn-bh">Sign off</h3>' +
      ((m.v || 1) > 1 ? '<p class="mn-changed">These minutes were changed after they were first published (version ' + m.v + '). If you signed before, read them again and sign this version.</p>' : '') +
      (mineN ? '<p class="mn-mine">Your actions: ' + mineN + ', marked Yours above.</p>' : '') +
      '<p>' + (st === 'present' ? 'I attended and have read and understood these minutes.' : 'I have read and understood these minutes.') + '</p>' +
      '<button type="button" class="btn dark mn-signbtn" data-p="mn-sign" data-id="' + esc(m.id) + '"' + (S.mSigning ? ' disabled' : '') + '>Sign as ' + esc(p.name) + '</button>' +
      '<span class="mn-err" role="status" id="mn-pinmsg">' + esc(S.mErr) + '</span><p class="hint">Your name, the version and the time are recorded. Apology and absent staff sign too.</p></section>';
  }
  function mnWriteLink() {
    var l = S.level === 'owner' || lsGet('lk.admin') === '1' ? '<button type="button" class="p-link" data-p="mn-admin">Write minutes and see who has signed</button>' : (isSous() ? '<button type="button" class="p-link" data-p="mn-sous">See who has signed</button>' : '');
    return l ? '<p class="mn-noprint mn-wl">' + l + '</p>' : '';
  }
  function minutesPageHTML() {
    loadMinutes();
    var p = me(), list = mnPub();
    var top = '<div class="nb-top mn-noprint"><span>' + (p ? 'Signing as <strong>' + esc(p.name) + '</strong>' : '') + '</span><span class="p-links"><button type="button" class="p-link" data-p="who-change">Not you?</button></span></div>';
    if (S.mins == null) return top + '<section class="mn"><h2 class="mn-title" id="rtitle" tabindex="-1">Meeting minutes</h2><p class="hint">Loading...</p></section>';
    if (!list.length) return top + '<section class="mn"><h2 class="mn-title" id="rtitle" tabindex="-1">Meeting minutes</h2><p class="hint">No minutes have been published in the last ' + MN_DAYS + ' days.</p>' + mnWriteLink() + '</section>';
    var m = list.filter(function (x) { return x.id === S.mSel; })[0] || list[0], older = list.filter(function (x) { return x.id !== m.id; }).slice(0, 12);
    // minutes this person still has to sign come first among the earlier ones, marked To sign
    function toSign(x) { return S.mmine[mnKey(x)] === null; }
    older = older.filter(toSign).concat(older.filter(function (x) { return !toSign(x); }));
    return top + '<section class="mn">' + mnDocHTML(m, true) +
      '<div class="mn-noprint"><div class="mn-btns"><button type="button" class="btn" data-p="mn-print">Print or save as PDF</button></div>' +
      (older.length ? '<h3 class="mn-eh">Earlier minutes (last ' + MN_DAYS + ' days)</h3><div class="mn-earlier">' + older.map(function (x) { return '<button type="button" class="chip' + (toSign(x) ? ' mn-tosign' : '') + '" data-p="mn-pickdoc" data-id="' + esc(x.id) + '">' + pad(x.no || 0) + ' &middot; ' + esc(dayShort(x.date)) + (toSign(x) ? ' &middot; <b>To sign</b>' : '') + '</button>'; }).join('') + '</div>' : '') + '</div>' + mnWriteLink() + '</section>';
  }
  function signMinutes(id) {
    var m = mnById(id), p = who();
    if (!m || !p || !fb || !S.authed || !S.tok || S.mSigning) return;
    var my = (m.att || []).filter(function (x) { return x.id === S.who; })[0], st = my ? my.st : 'absent', k = mnKey(m);
    var ref = fb.fs.doc.apply(null, [fb.db].concat(base(), ['minutes', m.id, 'signs', m.v + '_' + S.who])), data = { v: m.v, st: st, at: now(), name: p.name };
    S.mSigning = true; S.mErr = ''; draw();
    sset(ref, data, false).then(function () {
      S.mSigning = false; S.mmine[k] = data; S.mpin = ''; S.mpinOk = false; minCard(); toast('Signed. Thank you.'); draw();
    }, function (e) {
      S.mSigning = false; delete S.mmine[k];
      if (e && e.code === 'permission-denied') {
        /* refused: this version is already signed (the record is there), the minutes moved on to a new version (read again),
           or this phone's PIN no longer counts (the head chef reset it), which is what failed() handles */
        fb.fs.getDoc(ref).then(function (sn) {
          if (sn.exists()) { S.mmine[k] = sn.data(); S.mErr = ''; S.mpin = ''; S.mpinOk = false; minCard(); draw(); return; }
          S.mErr = ''; loadMinutes(true); failed(e);
        }, function () { S.mErr = 'Could not sign. Check the connection and try again.'; draw(); });
        return;
      }
      S.mErr = 'Could not sign. Check the connection and try again.';
      loadMinutes(true); draw();
    });
  }

  /* ---- writing the minutes, and the register (head chef and sous chefs) ---- */
  function mfNew() {
    var prev = mnPub()[0], nos = (S.mins || []).map(function (m) { return m.no || 0; });
    var carried = prev ? (prev.acts || []).filter(function (a) { return a.st === 'open'; }).map(function (a) { return { what: a.what, who: a.who || '', by: a.by || '', st: 'open', carried: true }; }) : [];
    return { id: '', no: (nos.length ? Math.max.apply(null, nos) : 0) + 1, v: 1, status: 'draft', date: dayNow(), start: '', loc: '', chair: S.who || '', taker: '', att: {}, guests: '', decisions: '', menu: '', safety: '', dates: '', other: '', acts: carried, next: '', orig: null, prev: false };
  }
  /* what the form held when it was opened, to tell whether Cancel would throw anything away */
  function mfSnap(f) { return f ? JSON.stringify(Object.assign({}, f, { prev: false, orig: null })) : ''; }
  function mfDirty() { return !!S.mf && mfSnap(S.mf) !== S.mfSnap; }
  function mfFrom(m) {
    var att = {}; (m.att || []).forEach(function (x) { att[x.id] = x.st; });
    return { id: m.id, no: m.no, v: m.v, status: m.status, date: m.date, start: m.start || '', loc: m.loc || '', chair: m.chair || '', taker: m.taker || '', att: att, guests: m.guests || '', decisions: m.decisions || '', menu: m.menu || '', safety: m.safety || '', dates: m.dates || '', other: m.other || '', acts: (m.acts || []).map(function (a) { return Object.assign({}, a); }), next: m.next || '', orig: m, prev: false };
  }
  function mfSet(k, el) {
    var f = S.mf; if (!f) return;
    var v = el.value, i = +el.getAttribute('data-i'), map = { 'mn-date': 'date', 'mn-start': 'start', 'mn-loc': 'loc', 'mn-chair': 'chair', 'mn-taker': 'taker', 'mn-guests': 'guests', 'mn-decisions': 'decisions', 'mn-menu': 'menu', 'mn-safety': 'safety', 'mn-dates': 'dates', 'mn-other': 'other', 'mn-next': 'next' };
    if (k === 'mn-aw' && f.acts[i]) f.acts[i].what = v;
    else if (k === 'mn-awho' && f.acts[i]) f.acts[i].who = v;
    else if (k === 'mn-aby' && f.acts[i]) f.acts[i].by = v;
    else if (map[k]) f[map[k]] = v;
  }
  function mfClip(t) { return String(t || '').replace(/^\s+|\s+$/g, '').slice(0, 1200); }
  function mfData(f, publish) {
    var att = [];
    people().forEach(function (p) { if (f.att[p.id]) att.push({ id: p.id, st: f.att[p.id] }); });
    var acts = f.acts.filter(function (a) { return String(a.what || '').trim(); }).map(function (a) { var o = { what: String(a.what).trim().slice(0, 160), who: a.who || '', by: a.by || '', st: a.st || 'open' }; if (a.carried) o.carried = true; return o; });
    return { no: f.no, v: f.v, status: publish ? 'published' : 'draft', date: f.date, start: f.start || '', loc: String(f.loc || '').trim().slice(0, 60), chair: f.chair || '', taker: f.taker || '', guests: String(f.guests || '').trim().slice(0, 120), next: f.next || '',
      decisions: mfClip(f.decisions), menu: mfClip(f.menu), safety: mfClip(f.safety), dates: mfClip(f.dates), other: mfClip(f.other), att: att, acts: acts, removed: false, upd: now() };
  }
  function personSelect(k, val, i, any) {
    return '<select class="p-select" data-k="' + k + '"' + (i != null ? ' data-i="' + i + '"' : '') + ' aria-label="' + (k === 'mn-chair' ? 'Run by' : k === 'mn-taker' ? 'Minutes taken by' : 'Who') + '"><option value="">' + (any ? 'Team' : 'Pick') + '</option>' + (any ? '<option value="all"' + (val === 'all' ? ' selected' : '') + '>Everyone</option>' : '') + people().map(function (p) { return '<option value="' + esc(p.id) + '"' + (val === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select>';
  }
  function mfTextarea(k, label, rows, hint) {
    return '<div class="field"><label class="label" for="' + k + '">' + label + '</label><textarea id="' + k + '" class="p-bulk" data-k="' + k + '" rows="' + rows + '" maxlength="1200">' + esc(S.mf[k.slice(3)]) + '</textarea>' + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>';
  }
  function mfHTML() {
    var f = S.mf, isEdit = f.status === 'published';
    if (f.prev) {
      var d = mfData(f, true); d.id = 'preview'; d.v = isEdit ? f.v + 1 : f.v;
      return '<section class="set-block"><span class="label">Preview</span><div class="mn">' + mnDocHTML(d, false) + '</div><div class="btn-row"><button type="button" class="btn" data-p="mn-prev">Back to writing</button></div></section>';
    }
    var ppl = people(), nSet = ppl.filter(function (p) { return f.att[p.id]; }).length, cnt = { present: 0, apology: 0, absent: 0 };
    ppl.forEach(function (p) { if (cnt[f.att[p.id]] != null) cnt[f.att[p.id]]++; });
    var attSum = !ppl.length ? 'No names on the staff list yet.' : !nSet ? 'Not set yet. Tap to set.' : nSet + ' of ' + ppl.length + ' set: ' + cnt.present + ' present' + (cnt.apology ? ', ' + cnt.apology + ' apology' : '') + (cnt.absent ? ', ' + cnt.absent + ' absent' : '');
    var attChips = ppl.map(function (p) {
      var st = f.att[p.id] || '', lab = st === 'present' ? 'Present' : st === 'apology' ? 'Apology' : st === 'absent' ? 'Absent' : 'Not set';
      return '<button type="button" class="chip mn-pc" data-p="mn-attc" data-id="' + esc(p.id) + '" data-st="' + st + '" aria-label="' + esc(p.name) + ', ' + lab + '. Tap to change.">' + esc(p.name) + (st === 'present' ? '' : ' <small>' + (st ? lab : '?') + '</small>') + '</button>';
    }).join('');
    var attBlock = '<div class="field mn-attblock"><button type="button" class="mn-atth" data-p="mn-attopen" aria-expanded="' + !!S.mAttOpen + '"><span class="label">Who was there</span><span class="mn-attsum' + (ppl.length && nSet < ppl.length ? ' is-open' : '') + '">' + esc(attSum) + '</span><span class="mn-attgo" aria-hidden="true">' + (S.mAttOpen ? 'Hide' : 'Set') + '</span></button>' +
      (S.mAttOpen ? '<div class="mn-attbody"><div class="btn-row"><button type="button" class="btn" data-p="mn-all">Mark all present</button></div><div class="mn-pcs" role="group" aria-label="Attendance">' + attChips + '</div><span class="hint">Tap a name to change it: Present, Apology, then Absent.</span></div>' : '') +
      '<label class="label" for="mn-guests">Guests (not signed)</label><input id="mn-guests" class="search" data-k="mn-guests" maxlength="120" placeholder="For example a supplier or manager" value="' + esc(f.guests) + '"></div>';
    var actRows = f.acts.map(function (a, i) {
      if (a.carried) return '<div class="mn-act is-carried"><span class="mn-at">' + esc(a.what) + ' <small>' + esc((a.who === 'all' ? 'Everyone' : mnName(a.who)) + (a.by ? ', by ' + dayShort(a.by) : '')) + '</small></span><div class="mn-seg" role="group" aria-label="Carried action">' + [['done', 'Done'], ['open', 'Carry over'], ['dropped', 'Drop']].map(function (x) { return '<button type="button" class="chip" data-p="mn-ast" data-i="' + i + '" data-v="' + x[0] + '" aria-pressed="' + ((a.st || 'open') === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div></div>';
      return '<div class="mn-act"><label class="visually-hidden" for="mn-aw' + i + '">Action</label><input id="mn-aw' + i + '" class="search" data-k="mn-aw" data-i="' + i + '" maxlength="160" placeholder="What needs doing" value="' + esc(a.what) + '">' +
        '<div class="mn-act2">' + personSelect('mn-awho', a.who || '', i, true) + '<label class="visually-hidden" for="mn-aby' + i + '">By</label><input id="mn-aby' + i + '" type="date" class="p-dateinput" data-k="mn-aby" data-i="' + i + '" value="' + esc(a.by || '') + '"><button type="button" class="p-x" data-p="mn-arem" data-i="' + i + '">Remove</button></div></div>';
    }).join('');
    return '<section class="set-block mn-form"><span class="label">' + (isEdit ? 'Change these minutes (becomes version ' + (f.v + 1) + ')' : f.id ? 'Draft minutes ' + pad(f.no) : 'New minutes ' + pad(f.no)) + '</span>' +
      (isEdit ? '<span class="hint">Everyone signs again after a change. The earlier version is kept.</span>' : '<span class="hint">Short lines, one per line. Spelling is yours to check. Recipe names link to their card. Leave out prices, PINs and private details. A draft is not shown to staff in the app.</span>') +
      '<div class="mn-grid"><div class="field"><label class="label" for="mn-date">Date</label><input id="mn-date" type="date" class="p-dateinput" data-k="mn-date" value="' + esc(f.date) + '"></div><div class="field"><label class="label" for="mn-start">Start time</label><input id="mn-start" type="time" class="p-dateinput" data-k="mn-start" value="' + esc(f.start) + '"></div>' +
      '<div class="field"><label class="label" for="mn-loc">Location</label><input id="mn-loc" class="search" data-k="mn-loc" maxlength="60" value="' + esc(f.loc) + '"></div><div class="field"><span class="label">Run by</span>' + personSelect('mn-chair', f.chair) + '</div><div class="field"><span class="label">Minutes taken by</span>' + personSelect('mn-taker', f.taker) + '</div></div>' +
      mfTextarea('mn-safety', 'Safety', 3, 'Shows first, in orange.') + mfTextarea('mn-decisions', 'Decisions', 4, 'One decision per line.') +
      '<div class="field"><span class="label">Actions</span>' + (actRows || '<p class="hint">No actions yet.</p>') + '<div class="btn-row"><button type="button" class="btn" data-p="mn-aadd">Add an action</button></div></div>' +
      mfTextarea('mn-menu', 'Menu changes', 3, 'What changes, and for which dish.') + mfTextarea('mn-dates', 'Dates ahead', 3, 'Deliveries, functions, events.') + mfTextarea('mn-other', 'Other', 3, '') + attBlock +
      '<div class="field"><label class="label" for="mn-next">Next meeting (optional)</label><input id="mn-next" type="date" class="p-dateinput" data-k="mn-next" value="' + esc(f.next) + '"></div>' +
      '<div class="btn-row"><button type="button" class="btn dark" data-p="mn-pub"' + (S.mSaving ? ' disabled' : '') + '>' + (armed('mn-pub') ? 'Tap again to publish to ' + people().length + ' staff' : isEdit ? 'Publish as version ' + (f.v + 1) : 'Publish and start sign-off') + '</button>' + (isEdit ? '' : '<button type="button" class="btn" data-p="mn-draft"' + (S.mSaving ? ' disabled' : '') + '>Save draft</button>') + '<button type="button" class="btn" data-p="mn-prev">Preview</button><button type="button" class="btn" data-p="mn-cancel">' + (armed('mn-cancel') ? 'Tap again to discard' : 'Cancel') + '</button></div><span class="saved" role="status">' + esc(S.mMsg) + '</span></section>';
  }
  function saveMinutes(publish) {
    var f = S.mf; if (!f || S.mSaving || !fb) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date || '')) { S.mMsg = 'Pick the meeting date.'; draw(); return; }
    var data = mfData(f, publish), wasPub = f.status === 'published';
    if (publish) {
      var missing = people().filter(function (p) { return !f.att[p.id]; });
      if (missing.length) { S.mAttOpen = true; S.mMsg = 'Set attendance for ' + missing.slice(0, 4).map(function (p) { return p.name; }).join(', ') + (missing.length > 4 ? ' and ' + (missing.length - 4) + ' more' : '') + ' (Present, Apology or Absent).'; draw(); return; }
      if (!data.decisions && !data.menu && !data.safety && !data.dates && !data.other && !data.acts.length) { S.mMsg = 'Write something in at least one section first.'; draw(); return; }
      data.pubAt = now();
      if (wasPub) data.v = f.v + 1;
    } else if (!data.decisions && !data.menu && !data.safety && !data.dates && !data.other && !data.acts.length && !data.guests) { S.mMsg = 'Nothing to save yet.'; draw(); return; }
    // publishing starts sign-off for everyone (and a change means everyone signs again), so it takes a second tap
    if (publish && !arm('mn-pub')) return;
    if (!f.id) data.at = now();
    var ref = f.id ? mnRef(f.id) : fb.fs.doc(colRef('minutes')), ops = [];
    if (publish && wasPub && f.orig) {
      var snap = Object.assign({}, f.orig); delete snap.id; delete snap.by;
      ops.push(['set', fb.fs.doc.apply(null, [fb.db].concat(base(), ['minutes', f.id, 'hist', String(f.orig.v)])), snap, false]);
    }
    ops.push(['set', ref, data, !!f.id]);
    S.mSaving = true; S.mMsg = ''; draw();
    W(ops).then(function () {
      S.mSaving = false; S.mf = null; if (publish) { S.mSel = ref.id; delete S.mmine[ref.id + '_' + data.v + '_' + S.who]; }
      S.mMsg = publish ? 'Published. Staff can read and sign it now.' : 'Draft saved.';
      loadMinutes(true); if (publish) loadSigns(ref.id, true); draw();
    }, function (e) {
      S.mSaving = false; S.mMsg = e && e.code === 'permission-denied' ? 'Not allowed. Only the head chef can write minutes, and the minutes rules must be published.' : 'Could not save. Check the connection and try again.'; draw();
    });
  }
  function mnRef(id) { return docRef('minutes', id); }
  function removeMinutes(id) {
    if (!arm('mn-del:' + id)) return;
    sset(mnRef(id), { removed: true, upd: now() }, true).then(function () {
      S.mMsg = 'Removed.'; if (S.mSel === id) S.mSel = ''; loadMinutes(true); draw();
      toast('Minutes removed.', { label: 'Undo', fn: function () { sset(mnRef(id), { removed: false, upd: now() }, true).then(function () { S.mMsg = ''; loadMinutes(true); draw(); }, failed); } });
    }, function () { S.mMsg = 'Could not remove. Check the connection and try again.'; draw(); });
  }
  /* who has signed the current version, who has not, and who is late */
  function mnRegister(m) {
    var sg = S.msigns[m.id], list = sg && sg.list ? sg.list.filter(function (s) { return s.v === m.v; }) : null;
    if (!list) return null;
    var t = now(), lateAt = (m.pubAt || m.at || t) + MN_LATE * 86400000, att = {}, rows = [];
    (m.att || []).forEach(function (x) { att[x.id] = x.st; });
    people().forEach(function (p) {
      var s = list.filter(function (x) { return x.by === p.id; })[0], st = att[p.id] || 'absent';
      rows.push({ id: p.id, name: p.name, att: st, at: s ? s.at : 0, signed: !!s, late: s ? s.at > lateAt : t > lateAt });
    });
    var chase = rows.filter(function (r) { return !r.signed; }), pubAt = m.pubAt || m.at || t;
    return { rows: rows, chase: chase, days: Math.max(0, Math.floor((t - pubAt) / 86400000)), signed: rows.length - chase.length, late: rows.filter(function (r) { return r.signed && r.late; }).length };
  }
  function mnOverdue() {
    var latest = mnPub()[0], t = dayNow();
    return latest ? (latest.acts || []).filter(function (a) { return a.st === 'open' && a.by && a.by < t; }) : [];
  }
  function mnRegisterHTML(pub) {
    if (!pub.length) return '<section class="set-block"><span class="label">Register</span><p class="hint">No minutes have been published yet.</p></section>';
    var m = pub.filter(function (x) { return x.id === S.mSel; })[0] || pub[0]; loadSigns(m.id, false);
    var reg = mnRegister(m), od = mnOverdue();
    var recent = pub.slice(0, 6), older = pub.slice(6), inOlder = older.some(function (x) { return x.id === m.id; });
    var chips = '<div class="mn-earlier mn-noprint">' + recent.map(function (x) { return '<button type="button" class="chip" data-p="mn-sel" data-id="' + esc(x.id) + '" aria-pressed="' + (x.id === m.id) + '">' + pad(x.no || 0) + ' &middot; ' + esc(dayShort(x.date)) + '</button>'; }).join('') +
      (older.length ? '<label class="a-f mn-older"><span class="visually-hidden">Older minutes</span><select data-k="mn-older" aria-label="Older minutes"><option value=""' + (inOlder ? '' : ' selected') + ' disabled>Older minutes (' + older.length + ')</option>' + older.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === m.id ? ' selected' : '') + '>' + pad(x.no || 0) + ' - ' + esc(dayShort(x.date)) + '</option>'; }).join('') + '</select></label>' : '') + '</div>';
    var body;
    if (!reg) body = '<p class="hint">' + (S.msigns[m.id] && S.msigns[m.id].err ? 'Could not load the sign-offs. Check the connection.' : 'Loading the sign-offs...') + '</p>';
    else {
      var tiles = '<div class="mn-tiles"><div class="mn-tile"><span>Signed</span><b>' + reg.signed + '<small> of ' + reg.rows.length + '</small></b></div><div class="mn-tile' + (reg.chase.length ? ' is-hot' : '') + '"><span>Not signed</span><b>' + reg.chase.length + '</b></div><div class="mn-tile"><span>Signed late</span><b>' + reg.late + '</b></div><div class="mn-tile"><span>Actions overdue</span><b>' + od.length + '</b></div></div>';
      var regList = lvHTML({
        key: 'minreg', items: reg.rows, step: 12, tools: 10, noun: ['person', 'people'], ph: 'Search names', table: 'mn-reg', empty: 'Nobody is on the staff list yet.',
        find: function (r) { return r.name; },
        filters: [['all', 'Everyone'], ['not', 'Not signed', function (r) { return !r.signed; }], ['late', 'Late', function (r) { return r.late; }], ['ok', 'Signed', function (r) { return r.signed; }]],
        sorts: [['name', 'Name A to Z', function (a, b) { return a.name.toLowerCase().localeCompare(b.name.toLowerCase()); }], ['not', 'Not signed first', function (a, b) { return (a.signed ? 1 : 0) - (b.signed ? 1 : 0) || a.name.toLowerCase().localeCompare(b.name.toLowerCase()); }]],
        cols: [
          { h: 'Person', th: true, html: function (r) { return esc(r.name); } },
          { h: 'Attendance', html: function (r) { return esc(r.att.charAt(0).toUpperCase() + r.att.slice(1)); } },
          { h: 'Signed', html: function (r) { return r.signed ? esc(dayShort(T.day(r.at)) + ', ' + clock(r.at)) : '<span class="o-who-i">Not yet</span>'; } },
          { h: 'Status', cls: 'mnst', html: function (r) { return '<span class="' + (!r.signed || r.late ? 'mn-hot' : '') + '">' + (r.signed ? (r.late ? 'Signed late' : 'Signed') : (r.late ? 'Not signed (late)' : 'Not signed')) + '</span>'; } }
        ]
      });
      var table = '<div class="mn-regtbl' + (S.mRegAll ? ' is-open' : '') + '">' + regList + '</div>';
      var chase = '<div class="mn-side"><h3 class="a-ch-h">Chase list (' + reg.chase.length + ')</h3>' + (reg.chase.length ? '<ul class="mn-chase">' + reg.chase.map(function (r) { return '<li><b>' + esc(r.name) + '</b></li>'; }).join('') + '</ul><p class="hint">Published ' + reg.days + (reg.days === 1 ? ' day' : ' days') + ' ago.</p>' : '<p class="hint">Everyone has signed this version.</p>') +
        '<h3 class="a-ch-h">Actions overdue</h3>' + (od.length ? '<ul class="mn-chase">' + od.map(function (a) { return '<li>' + esc(a.what) + ' <b>' + esc(a.who === 'all' ? 'Everyone' : mnName(a.who)) + '</b> was ' + esc(dayShort(a.by)) + '</li>'; }).join('') + '</ul>' : '<p class="hint">None. Seen by the head chef and sous chefs only.</p>') + '</div>';
      body = tiles + '<div class="mn-regrid">' + chase + '<div class="mn-regall"><button type="button" class="btn mn-noprint" data-p="mn-regall" aria-expanded="' + !!S.mRegAll + '">' + (S.mRegAll ? 'Hide the full list' : 'Show everyone (' + reg.rows.length + ')') + '</button>' + table + '</div></div>';
    }
    return '<section class="set-block mn-print"><span class="label">Sign-off register</span><span class="hint">Minutes ' + pad(m.no || 0) + ', ' + esc(longDate(m.date)) + ', version ' + m.v + (m.v > 1 ? '. Earlier versions are kept' : '') + '. Staff who have not signed within ' + MN_LATE + ' days are marked late. Everyone on the staff list signs, including apology and absent.</span>' + chips + body +
      '<div class="a-print-h"><strong>Leichhardt Kitchen Book</strong> &middot; Minutes ' + pad(m.no || 0) + ' sign-off register &middot; version ' + m.v + '<span>Printed ' + esc(dayShort(dayNow()) + ' ' + clock(now())) + '</span></div>' +
      '<div class="btn-row mn-noprint"><button type="button" class="btn dark" data-p="mn-print">Print or save as PDF</button><button type="button" class="btn" data-p="mn-csv" data-id="' + esc(m.id) + '">Download CSV</button><button type="button" class="btn" data-p="mn-refresh">Refresh</button>' + (mnCanWrite() ? '<button type="button" class="btn" data-p="mn-edit" data-id="' + esc(m.id) + '">Change as a new version</button><button type="button" class="btn" data-p="mn-remove" data-id="' + esc(m.id) + '">' + (armed('mn-del:' + m.id) ? 'Tap again to remove' : 'Remove') + '</button>' : '') + '</div></section>';
  }
  function minAdminHTML() {
    loadMinutes();
    if (S.mins == null) return '<p class="hint">Loading...</p>';
    var drafts = mnDrafts(), pub = mnPub();
    var intro = '<section class="set-block mn-noprint"><span class="label">Kitchen meeting minutes</span><span class="hint">Write the minutes after the meeting. Staff read them at Meeting minutes in the app and sign with their own PIN. A change after publishing makes a new version and everyone signs again.</span>' +
      '<div class="btn-row"><button type="button" class="btn dark" data-p="mn-new">Write new minutes</button>' + drafts.map(function (d) { return '<button type="button" class="btn" data-p="mn-draft-open" data-id="' + esc(d.id) + '">Continue draft ' + pad(d.no || 0) + ' (' + esc(dayShort(d.date)) + ')</button>'; }).join('') + '</div><span class="saved" role="status">' + (S.mf ? '' : esc(S.mMsg)) + '</span></section>';
    if (!mnCanWrite()) intro = '<section class="set-block mn-noprint"><span class="label">Kitchen meeting minutes</span><span class="hint">See who has signed the minutes and who still needs to. Only the head chef writes and publishes minutes.</span></section>';
    return intro + (S.mf && mnCanWrite() ? mfHTML() : '') + mnRegisterHTML(pub);
  }
  function minSousPageHTML() {
    return '<div class="p-admin"><div class="p-bar"><span>Meeting minutes</span><span class="p-links"><button type="button" class="p-link" data-p="mn-close">Back to the prep book</button></span></div><h2 class="p-h" id="rtitle" tabindex="-1">Meeting minutes</h2>' + minAdminHTML() + '</div>';
  }
  function printMinutes() {
    lvPrintAll(true);
    document.documentElement.classList.add('print-min');
    function done() { document.documentElement.classList.remove('print-min'); lvPrintAll(false); window.removeEventListener('afterprint', done); }
    window.addEventListener('afterprint', done);
    setTimeout(function () { window.print(); setTimeout(function () { if (document.documentElement.classList.contains('print-min') && !window.matchMedia('print').matches) done(); }, 1500); }, 50);
  }
  function csvMinutes(id) {
    var m = mnById(id), reg = m && mnRegister(m); if (!reg) return;
    var rows = [['Minutes', 'Version', 'Meeting date', 'Person', 'Attendance', 'Signed at', 'Status']];
    reg.rows.forEach(function (r) { rows.push([pad(m.no || 0), m.v, m.date, r.name, r.att, r.signed ? T.day(r.at) + ' ' + clock(r.at) : '', r.signed ? (r.late ? 'Signed late' : 'Signed') : (r.late ? 'Not signed (late)' : 'Not signed')]); });
    downloadCSV('leichhardt-minutes-' + pad(m.no || 0) + '-v' + m.v + '.csv', rows);
  }

  /* ---------- wastage insights (admin) ---------- */
  function loadWStats(force) {
    if (!fb || S.configState !== 'ok') return;
    if (S.wStats && (S.wStats.loading || !force)) return;
    S.wStats = { loading: true, lines: [], reviews: [] };
    var today = dayNow(), dates = [], i;
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
  function eachDayList(n, lines, reviews) {
    var i, rv = {}, days = []; reviews.forEach(function (r) { rv[r.date] = r; });
    for (i = 0; i < n; i++) { var d = shift(dayNow(), -i), l = lines.filter(function (x) { return x.date === d; }); days.push({ d: d, l: l, r: rv[d] && (rv[d].avoidable || rv[d].change) ? rv[d] : null }); }
    return lvHTML({
      key: 'waste-days', items: days, step: 7, tools: 14, noun: ['day', 'days'], empty: 'No days in this time.',
      filters: [['all', 'All days'], ['some', 'Something logged', function (x) { return x.l.length > 0; }], ['none', 'Nothing logged', function (x) { return !x.l.length; }], ['rev', 'Has a review', function (x) { return !!x.r; }]],
      sorts: [['new', 'Newest first', function (a, b) { return a.d < b.d ? 1 : -1; }], ['old', 'Oldest first', function (a, b) { return a.d < b.d ? -1 : 1; }], ['most', 'Most entries', function (a, b) { return b.l.length - a.l.length || (a.d < b.d ? 1 : -1); }]],
      cols: [
        { h: 'Day', th: true, html: function (x) { return esc(dayShort(x.d)); } },
        { h: 'Entries', html: function (x) { return x.l.length ? String(x.l.length) : '<span class="o-who-i">none</span>'; } },
        { h: 'Amount', html: function (x) { return esc(totalsText(wTotals(x.l))); } },
        { h: 'Review', wide: true, html: function (x) { return x.r ? esc((x.r.reviewBy || '') + ': ' + (x.r.change || x.r.avoidable)) : '<span class="o-who-i">not written</span>'; } }
      ]
    });
  }
  /* Waste calendar: entries per day, darker is more. Days nobody logged anything are marked. */
  function wasteCalHTML(n, lines) {
    var today = dayNow(), first = shift(today, -(n - 1)), start = first, i, by = {}, max = 0, inF = {};
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
    var head = '<section class="set-block">' + toolsHTML('waste', 'Wastage') + '<span class="hint">From the wastage log on the phones. Amounts are what people wrote, in kg, L, portions and pieces (grams are counted as kg). <a href="#/waste">Open the wastage log</a></span>' + chips;
    if (!ws || ws.loading) return head + '<p class="hint">Loading the last 60 days...</p></section>';
    var af = AF(), from = shift(dayNow(), -(n - 1));
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
    var iItems = Object.keys(m).map(function (k) {
      var e = m[k], mr = Object.keys(e.r).sort(function (a, b) { return e.r[b] - e.r[a]; })[0], pn = prepN[k] || 0;
      var tip = (WTIP[mr] || '') + (mr === 'excess' && pn >= 3 ? ' It was on the prep list ' + pn + ' times.' : '');
      if (mr === 'fault' || mr === 'returned') { loadViews(false); var rid = (e.l.filter(function (x) { return x.recipe; })[0] || {}).recipe || ((matchRecipe(e.text) || {}).id || ''); if (rid && S.views) tip += ' Card opened ' + ((S.views[rid] || {}).n || 0) + ' times so far.'; }
      return { e: e, mr: mr, pn: pn, tip: tip };
    });
    var itemsList = lvHTML({
      key: 'waste-items', items: iItems, step: 10, tools: 8, noun: ['item', 'items'], ph: 'Search wasted items', empty: 'Nothing logged in this time yet.',
      find: function (o) { return o.e.text + ' ' + reasonName(o.mr); },
      filters: [['all', 'All items'], ['rep', 'More than once', function (o) { return o.e.l.length >= 2; }]].concat(REASONS.map(function (r) { return [r[0], r[1], function (o) { return o.mr === r[0]; }]; })),
      sorts: [['most', 'Most entries', function (a, b) { return b.e.l.length - a.e.l.length || String(a.e.text).toLowerCase().localeCompare(String(b.e.text).toLowerCase()); }], ['az', 'A to Z', function (a, b) { return String(a.e.text).toLowerCase().localeCompare(String(b.e.text).toLowerCase()); }], ['prep', 'Most on the prep list', function (a, b) { return b.pn - a.pn; }]],
      cols: [
        { h: 'Item', th: true, html: function (o) { return esc(o.e.text); } },
        { h: 'Entries', html: function (o) { return String(o.e.l.length); } },
        { h: 'Amount', html: function (o) { return esc(totalsText(wTotals(o.e.l))); } },
        { h: 'Main reason', html: function (o) { return esc(reasonName(o.mr)); } },
        { h: 'On the prep list', html: function (o) { return o.pn ? String(o.pn) : ''; } },
        { h: 'Suggestion', wide: true, html: function (o) { return o.e.l.length >= 2 ? '<span class="a-flag">' + esc(o.tip) + '</span>' : '<span class="o-who-i">Once so far</span>'; } }
      ]
    });
    var dw = {}, occ = {}, i;
    for (i = 0; i < n; i++) { var dd = parseYmd(shift(dayNow(), -i)).getDay(); occ[dd] = (occ[dd] || 0) + 1; }
    lines.forEach(function (x) { var d = parseYmd(x.date).getDay(); dw[d] = (dw[d] || 0) + 1; });
    var who = {}; lines.forEach(function (x) { var k = x.addedBy || 'Unknown'; who[k] = (who[k] || 0) + 1; });
    var whoList = lvHTML({
      key: 'waste-who', items: Object.keys(who).map(function (k) { return { k: k, n: who[k] }; }), step: 10, tools: 10, noun: ['person', 'people'], ph: 'Search names', empty: 'Nobody has logged anything.',
      find: function (o) { return o.k; },
      sorts: [['most', 'Most entries', function (a, b) { return b.n - a.n || a.k.localeCompare(b.k); }], ['az', 'A to Z', function (a, b) { return a.k.toLowerCase().localeCompare(b.k.toLowerCase()); }]],
      cols: [{ h: 'Person', th: true, html: function (o) { return esc(o.k); } }, { h: 'Entries', html: function (o) { return String(o.n); } }]
    });
    var revs = ws.reviews.filter(function (r) { return r.date >= from && (r.avoidable || r.change); }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var revList = lvHTML({
      key: 'waste-rev', items: revs, step: 6, tools: 8, noun: ['review', 'reviews'], ph: 'Search reviews', empty: 'No reviews written in this time.',
      find: function (r) { return (r.avoidable || '') + ' ' + (r.change || '') + ' ' + (r.reviewBy || ''); },
      sorts: [['new', 'Newest first', function (a, b) { return a.date < b.date ? 1 : -1; }], ['old', 'Oldest first', function (a, b) { return a.date < b.date ? -1 : 1; }]],
      card: function (r) { return '<li class="a-rev"><strong>' + esc(dayShort(r.date)) + (r.reviewBy ? ', ' + esc(r.reviewBy) : '') + ':</strong> ' + esc(r.avoidable || '') + (r.change ? ' <em>Change: ' + esc(r.change) + '</em>' : '') + '</li>'; }
    });
    var dayList = eachDayList(n, lines, ws.reviews);
    return head + '<div class="a-tiles">' + tiles.map(tileHTML).join('') + '</div>' + wasteCalHTML(n, lines) + reasonDowHTML(lines, n) +
      '<h3 class="a-ch-h">By reason</h3><div class="a-tablewrap"><table class="a-table a-plain"><thead><tr><th scope="col">Reason</th><th scope="col">Entries</th><th scope="col">Share</th><th scope="col">Amount</th></tr></thead><tbody>' + rRows + '</tbody></table></div>' +
      '<h3 class="a-ch-h">Wasted most often</h3><span class="hint">"On the prep list" counts how many times the same item was written on the prep list in this time, so you can see over-prepping.</span>' + itemsList +
      '<h3 class="a-ch-h">Each day</h3>' + dayList +
      '<h3 class="a-ch-h">By weekday</h3><div class="a-tablewrap"><table class="a-table a-plain sk-t"><thead><tr><th scope="col"></th>' + DOWN.map(function (x) { return '<th scope="col">' + x + '</th>'; }).join('') + '</tr></thead><tbody><tr><th scope="row">Entries a day</th>' + DOW.map(function (d) { return '<td>' + (occ[d] ? num((dw[d] || 0) / occ[d]) : '0') + '</td>'; }).join('') + '</tr></tbody></table></div>' +
      '<h3 class="a-ch-h">Who logs waste</h3><span class="hint">A record, not a score: someone who never logs may just not know about the log.</span>' + whoList +
      '<h3 class="a-ch-h">End-of-day reviews</h3>' + revList + '</section>';
  }

  /* ---------- recipe searches that found nothing (queued by the recipe book, sent once someone is signed in) ---------- */
  var flushing = false;
  function flushMisses() {
    if (flushing || !fb || !S.authed || !S.who || !S.tok) return;
    var q; try { q = JSON.parse(lsGet('lk.miss') || '[]'); } catch (e) { q = []; }
    if (!q.length) return;
    flushing = true;
    var f = fb.fs, p = me(), sent = q.slice(0, 20);
    Promise.all(sent.map(function (x) {
      var t = String(x.q || '').trim().slice(0, 60); if (!t) return null;
      return sset(docRef('misses', lkey(t).slice(0, 60)), { q: t, n: f.increment(1), last: x.at || now(), lastBy: p ? p.name : '' }, true);
    })).then(function () {
      /* the recipe book may have queued more searches while these were sending: read the queue again and drop only the ones sent */
      var cur; try { cur = JSON.parse(lsGet('lk.miss') || '[]'); } catch (e) { cur = []; }
      var gone = {}; sent.forEach(function (x) { gone[x.q + '|' + x.at] = 1; });
      lsSet('lk.miss', JSON.stringify(cur.filter(function (x) { return !gone[x.q + '|' + x.at]; })));
      flushing = false;
    }, function () { flushing = false; });
  }
  var flushingV = false;
  function flushViews() {
    if (flushingV || !fb || !S.authed || !S.who || !S.tok) return;
    var v; try { v = JSON.parse(lsGet('lk.views') || '{}'); } catch (e) { v = {}; }
    var ids = Object.keys(v).filter(function (id) { return recipeById(id); }).slice(0, 20);
    if (!ids.length) { if (Object.keys(v).length) lsSet('lk.views', '{}'); return; }
    flushingV = true;
    var f = fb.fs;
    Promise.all(ids.map(function (id) { var r = recipeById(id); return sset(docRef('views', id), { name: r.name.slice(0, 80), n: f.increment(Math.min(v[id], 500)), last: now() }, true); })).then(function () {
      var cur; try { cur = JSON.parse(lsGet('lk.views') || '{}'); } catch (e) { cur = {}; }
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
      (ids.length ? lvHTML({
        key: 'ins-views', items: ids.map(function (id) { return { id: id, r: recipeById(id), n: vm[id].n || 0, last: vm[id].last || 0 }; }), step: 10, tools: 10, noun: ['card', 'cards'], ph: 'Search cards',
        find: function (o) { return o.r.name; },
        sorts: [['most', 'Most opened', function (a, b) { return b.n - a.n; }], ['few', 'Least opened', function (a, b) { return a.n - b.n; }], ['az', 'A to Z', function (a, b) { return a.r.name.toLowerCase().localeCompare(b.r.name.toLowerCase()); }], ['new', 'Opened most recently', function (a, b) { return b.last - a.last; }]],
        cols: [
          { h: 'Card', th: true, html: function (o) { return '<a href="#/r/' + encodeURIComponent(o.id) + '">' + esc(o.r.name) + '</a>'; } },
          { h: 'Opened', html: function (o) { return String(o.n); } },
          { h: 'Last', html: function (o) { return esc(ago(o.last)); } }
        ]
      }) + '<p class="hint">' + total + ' opens counted so far.</p>' : '<p class="hint">No card opens counted yet.</p>') +
      (ids.length ? '<details class="a-details"><summary>Not opened yet (' + dishes.length + ' cards)</summary><p>' + dishes.map(function (r) { return esc(r.name); }).join(', ') + '</p></details>' : '');
  }
  function loadMisses(force) {
    if (!fb || S.configState !== 'ok' || S.missBusy || (S.misses && !force)) return;
    S.missBusy = true;
    fb.fs.getDocs(colRef('misses')).then(function (sn) { S.misses = sn.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }); S.missBusy = false; draw(); }, function () { S.misses = []; S.missBusy = false; });
  }
  function missesHTML() {
    loadMisses(false);
    var l = (S.misses || []).filter(function (x) { return !x.hidden && x.q; }).sort(function (a, b) { return (b.n || 0) - (a.n || 0) || (b.last || 0) - (a.last || 0); });
    return '<h3 class="a-ch-h">Searched for, not in the book</h3><span class="hint">Recipe book searches that found nothing, sent from phones where someone is signed in to the prep book. These are the cards people are looking for. Hide one once the card is written.</span>' +
      (l.length ? lvHTML({
        key: 'ins-misses', items: l, step: 10, tools: 10, noun: ['search', 'searches'], ph: 'Search these',
        find: function (x) { return x.q + ' ' + (x.lastBy || ''); },
        sorts: [['most', 'Most often', function (a, b) { return (b.n || 0) - (a.n || 0) || (b.last || 0) - (a.last || 0); }], ['new', 'Most recent', function (a, b) { return (b.last || 0) - (a.last || 0); }], ['az', 'A to Z', function (a, b) { return String(a.q).toLowerCase().localeCompare(String(b.q).toLowerCase()); }]],
        cols: [
          { h: 'Searched for', th: true, html: function (x) { return esc(x.q); } },
          { h: 'Times', html: function (x) { return String(x.n || 1); } },
          { h: 'Last', html: function (x) { return esc(ago(x.last)) + (x.lastBy ? ', ' + esc(x.lastBy) : ''); } },
          { h: '', cls: 'a-act', html: function (x) { return '<button type="button" class="p-x" data-p="miss-hide" data-id="' + esc(x.id) + '">Hide</button>'; } }
        ]
      }) : '<p class="hint">No empty searches yet.</p>');
  }

  /* ---------- guides ----------
     How-to guides for the team at #/guides: how to programme the iCombi, clean the fryer, where the order forms are.
     The head chef adds them in the admin panel (Guides tab): a PDF or photos, a title, a category, and if wanted written steps and search words.
     The free Firebase plan has no file storage and a Firestore record holds at most 1 MB, so the head chef's own phone or computer turns
     each PDF page (drawn with pdf.js, loaded only then) or photo into one picture of under 1 MB and saves each picture as its own record.
     Data: kitchens/<PIN>/guides/<id> { title, cat, sum, steps (one per line), kw (search words), text (the words read from the PDF, for search),
       thumb (a small picture of page 1), pages, dims [{ w, h }], v (goes up when the file is replaced), file (its name), removed, at, upd }
       kitchens/<PIN>/guides/<id>/pages/<n> { img (a WebP or JPEG data URL), w, h, v, n }
     Staff need only the kitchen PIN to read them, like the recipe book. Only the head chef (Google account) writes them. Guides are never
     deleted, only flagged as removed.
     Reads stay small: the list is read once a day per phone and kept on the phone (lk.guides), so the recipe book links to guides with no
     reads; opening the Guides page reads it again after 30 minutes. A guide's pages are read the first time that version is opened on a
     phone; after that they come from the phone's own copy (Firestore's offline cache), so they open with no signal too. No listener, no polling. */
  var G_CATS = [['equipment', 'Equipment'], ['cleaning', 'Cleaning'], ['safety', 'Food safety'], ['prep', 'Prep and cooking'], ['stock', 'Orders and stock'], ['shift', 'Opening and closing'], ['other', 'Other']];
  var G_MAXP = 20, G_IMG = 950000, G_LONG = 2000, G_TEXT = 6000, G_STALE = 30 * 60000, G_NEW = 14 * 86400000;
  var PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/';
  var G_RANK = {}; G_CATS.forEach(function (c, i) { G_RANK[c[0]] = i; });
  var G_ICON = '<svg viewBox="0 0 64 64" width="40" height="40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M32 16c-6-4-14-6-24-6v38c10 0 18 2 24 6 6-4 14-6 24-6V10c-10 0-18 2-24 6z"/><path d="M32 16v38"/><path d="M14 20c4 0 8 1 12 3M14 30c4 0 8 1 12 3M38 23c4-2 8-3 12-3M38 33c4-2 8-3 12-3"/></svg>';
  function gCatName(c) { return (G_CATS.filter(function (k) { return k[0] === c; })[0] || [0, 'Other'])[1]; }
  function gRef(id) { return docRef('guides', id); }
  function gPageRef(id, n) { return fb.fs.doc.apply(null, [fb.db].concat(base(), ['guides', id, 'pages', String(n)])); }
  function gPagesCol(id) { return fb.fs.collection.apply(null, [fb.db].concat(base(), ['guides', id, 'pages'])); }
  function gById(id) { return (S.guides || []).filter(function (g) { return g.id === id; })[0] || null; }
  function gOrder(a, b) { return (G_RANK[a.cat] == null ? 99 : G_RANK[a.cat]) - (G_RANK[b.cat] == null ? 99 : G_RANK[b.cat]) || String(a.title).localeCompare(String(b.title)); }
  function gLive() { return (S.guides || []).filter(function (g) { return !g.removed && g.title; }).sort(gOrder); }
  function gSig(list) { return (list || []).map(function (g) { return g.id + ':' + (g.upd || 0) + (g.removed ? 'r' : ''); }).join('|'); }
  function gIsNew(g) { return now() - (g.at || 0) < G_NEW; }
  function gMeta(g) {
    var n = g.pages || 0, st = mnLines(g.steps).length, out = [];
    if (n) out.push(n + (n === 1 ? ' page' : ' pages'));
    if (st) out.push(st + (st === 1 ? ' step' : ' steps'));
    if (g.upd || g.at) out.push('Updated ' + dayShort(T.day(g.upd || g.at)));
    return out.join(' · ');
  }

  /* the list is kept on the phone, so the Guides page and the recipe cards have it straight away */
  (function () {
    try { var c = JSON.parse(lsGet('lk.guides') || 'null'); if (c && c.pin === S.pin && Array.isArray(c.list)) { S.guides = c.list; S.guidesFor = c.d || ''; S.guidesAt = c.at || 0; } } catch (e) {}
  })();
  function gKeep() {
    var c = { pin: S.pin, d: S.guidesFor, at: S.guidesAt, list: S.guides || [] }, t = JSON.stringify(c);
    // a very long list keeps only the start of each PDF's words and no small pictures, so the phone's storage never fills up
    if (t.length > 1500000) t = JSON.stringify(Object.assign(c, { list: c.list.map(function (g) { return Object.assign({}, g, { thumb: '', text: String(g.text || '').slice(0, 600) }); }) }));
    lsSet('lk.guides', t);
  }
  function gForget() { S.guides = null; S.guidesFor = ''; S.guidesAt = 0; S.gRetry = 0; lsSet('lk.guides', ''); }
  function loadGuides(force) {
    if (!fb || !/^\d{4,6}$/.test(S.pin) || S.gBusy || Date.now() < S.gRetry || !featOn('guides')) return;
    var today = dayNow(), pin = S.pin;
    if (!force && S.guides && S.guidesFor === today) return;
    S.gBusy = true;
    fb.fs.getDocs(colRef('guides')).then(function (snap) {
      S.gBusy = false;
      if (pin !== S.pin) return;
      var list = snap.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }), was = S.guides, changed = !was || gSig(list) !== gSig(was);
      S.guides = list; S.guidesFor = today; S.guidesAt = Date.now(); gKeep();
      if (changed) { try { window.dispatchEvent(new Event('lk-guides')); } catch (e) {} draw(); }
    }, function () {
      // no signal or a wrong PIN: carry on with the list kept on the phone and try again in a minute
      S.gBusy = false; S.gRetry = Date.now() + 60000; if (!S.guides) S.guides = []; draw();
    });
  }

  /* search: every word must be in the guide (title, what it is for, steps, search words, category or the words in the PDF); titles first */
  function gHay(g) { return [g.title, g.sum, g.steps, g.kw, gCatName(g.cat), g.text].join(' ').toLowerCase(); }
  function gWords(q) { return String(q || '').toLowerCase().replace(/[^a-z0-9À-ɏ]+/g, ' ').trim().split(' ').filter(Boolean); }
  function gMatch(list, q) {
    var ws = gWords(q);
    if (!ws.length) return list;
    return list.filter(function (g) { var h = gHay(g); return ws.every(function (w) { return h.indexOf(w) >= 0; }); }).map(function (g) {
      var top = [g.title, g.kw].join(' ').toLowerCase();
      return { g: g, n: ws.filter(function (w) { return top.indexOf(w) >= 0; }).length };
    }).sort(function (a, b) { return b.n - a.n || gOrder(a.g, b.g); }).map(function (x) { return x.g; });
  }
  /* a found word that is only inside the steps or the PDF shows with the words around it */
  function gSnip(g, q) {
    var ws = gWords(q), top = [g.title, g.sum, g.kw, gCatName(g.cat)].join(' ').toLowerCase(), src = (String(g.steps || '') + ' ' + String(g.text || '')).replace(/\s+/g, ' '), lt = src.toLowerCase(), at = -1;
    ws.some(function (w) { if (top.indexOf(w) >= 0) return false; at = lt.indexOf(w); return at >= 0; });
    if (at < 0) return '';
    var a = Math.max(0, at - 40), b = Math.min(src.length, at + 90);
    return (a ? '...' : '') + src.slice(a, b).trim() + (b < src.length ? '...' : '');
  }

  /* Which recipe cards a guide belongs on: cards it names (the same names a note links to, "Pork Belly"), and cards that mention one of
     its search words ("iCombi" puts the iCombi guide on every card with an iCombi tip or step). Worked out once per change of the list. */
  var gIdx = null;
  function gWordAt(lt, w) {
    var i = lt.indexOf(w);
    while (i >= 0) {
      var e = i + w.length;
      if (lt.charAt(e) === 's') e++;
      if (!/[a-z0-9]/.test(lt.charAt(i - 1)) && !/[a-z0-9]/.test(lt.charAt(e))) return true;
      i = lt.indexOf(w, i + 1);
    }
    return false;
  }
  function gKw(g) { return String(g.kw || '').toLowerCase().split(/[,;\n]+/).map(function (w) { return w.replace(/\s+/g, ' ').trim(); }).filter(function (w) { return w.length >= 4; }); }
  function gCardText(r) {
    return ' ' + [r.name, r.tip ? r.tip.title + ' ' + r.tip.text : '', r.safety ? r.safety.title + ' ' + r.safety.text : ''].concat((r.sections || []).map(function (s) { return s.title + ' ' + s.steps.join(' '); })).join(' ').toLowerCase().replace(/\s+/g, ' ') + ' ';
  }
  var gCardsText = null;
  function gLinkIds(g) {
    var lt = ' ' + [g.title, g.sum, g.steps, g.kw, g.text].join(' ').toLowerCase().replace(/\s+/g, ' ') + ' ', ids = [], kws = gKw(g);
    noteNames().forEach(function (c) { if (ids.indexOf(c.id) < 0 && gWordAt(lt, c.n)) ids.push(c.id); });
    if (kws.length) {
      if (!gCardsText) { gCardsText = {}; D.recipes.forEach(function (r) { gCardsText[r.id] = gCardText(r); }); }
      D.recipes.forEach(function (r) { if (ids.indexOf(r.id) < 0 && kws.some(function (w) { return gWordAt(gCardsText[r.id], w); })) ids.push(r.id); });
    }
    return ids;
  }
  function gIndex() {
    var sig = gSig(S.guides);
    if (gIdx && gIdx.sig === sig) return gIdx;
    var idx = { sig: sig, by: {}, of: {} };
    gLive().forEach(function (g) {
      var ids = gLinkIds(g);
      idx.of[g.id] = ids;
      ids.forEach(function (id) { (idx.by[id] = idx.by[id] || []).push(g.id); });
    });
    gIdx = idx;
    return idx;
  }
  function gCards(g) { return (gIndex().of[g.id] || []).map(recipeById).filter(Boolean); }
  function guidesFor(rid) { return !featOn('guides') ? [] : (gIndex().by[rid] || []).map(gById).filter(Boolean).map(function (g) { return { id: g.id, title: g.title, cat: gCatName(g.cat) }; }); }
  function guideSearch(q) { return !featOn('guides') ? [] : gWords(q).join('').length < 3 ? [] : gMatch(gLive(), q).slice(0, 4).map(function (g) { return { id: g.id, title: g.title }; }); }

  /* A guide's pages: from the phone's own copy when it has this version, otherwise one read per page. Shown through blob: links so
     a redraw of the page never copies the big pictures again. */
  var gPg = {};
  function gBlob(u) {
    try {
      var i = u.indexOf(','), bin = atob(u.slice(i + 1)), a = new Uint8Array(bin.length), k;
      for (k = 0; k < bin.length; k++) a[k] = bin.charCodeAt(k);
      return URL.createObjectURL(new Blob([a], { type: u.slice(5, i).split(';')[0] || 'image/jpeg' }));
    } catch (e) { return u; }
  }
  function gPagesFor(g) {
    var v = g.v || 1, k = g.id + ':' + v, e = gPg[k];
    if (e && (e.state !== 'error' || Date.now() < e.retry)) return e;
    e = gPg[k] = { state: 'loading', urls: [] };
    if (!g.pages) { e.state = 'ok'; return e; }
    var newer = false;
    function pick(sn) {
      var d = sn.docs.map(function (x) { return x.data(); });
      if (d.some(function (x) { return (x.v || 0) > v; })) newer = true;
      d = d.filter(function (x) { return x.v === v && x.img; });
      return d.length >= g.pages ? d : null;
    }
    sdk().then(function () {
      var col = gPagesCol(g.id), fromCache = fb.fs.getDocsFromCache ? fb.fs.getDocsFromCache(col).then(pick, function () { return null; }) : Promise.resolve(null);
      return fromCache.then(function (d) { return d || fb.fs.getDocs(col).then(pick); });
    }).then(function (d) {
      if (!d) throw new Error('pages missing');
      d.sort(function (a, b) { return (a.n || 0) - (b.n || 0); });
      Object.keys(gPg).forEach(function (o) { if (o !== k && o.indexOf(g.id + ':') === 0) { gPg[o].urls.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (x) {} }); delete gPg[o]; } });
      e.urls = d.slice(0, g.pages).map(function (x) { return gBlob(x.img); }); e.state = 'ok';
      draw(); gzDraw();
    }).catch(function () {
      e.state = 'error'; e.retry = Date.now() + 30000;
      // the head chef replaced the file since this phone read the list: read the list again
      if (newer) { S.gRetry = 0; loadGuides(true); }
      draw();
    });
    return e;
  }

  /* ---- the Guides page, as staff use it ---- */
  function gThumbHTML(g) { return '<span class="g-thumb" aria-hidden="true">' + (g.thumb ? '<img src="' + esc(g.thumb) + '" alt="">' : G_ICON) + '</span>'; }
  function gCardHTML(g, q) {
    var snip = q ? gSnip(g, q) : '';
    return '<li><a class="g-card" href="#/guides/' + encodeURIComponent(g.id) + '">' + gThumbHTML(g) + '<span class="g-cb"><span class="g-ct">' + esc(gCatName(g.cat)) + (gIsNew(g) ? '<span class="g-new">New</span>' : '') + '</span>' +
      '<b class="g-cn">' + esc(g.title) + '</b>' + (g.sum ? '<span class="g-cs">' + esc(g.sum) + '</span>' : '') + (snip ? '<span class="g-snip">' + esc(snip) + '</span>' : '') +
      '<span class="g-cm">' + esc(gMeta(g)) + '</span></span></a></li>';
  }
  function gAdminLink() { return lsGet('lk.admin') === '1' ? '<p class="g-wl g-noprint"><button type="button" class="p-link" data-p="g-admin">Add or change guides</button></p>' : ''; }
  function gListHTML() {
    var q = S.gq.trim(), list = gLive().filter(function (g) { return S.gcat === 'all' || g.cat === S.gcat; });
    if (q) {
      list = gMatch(list, q);
      if (!list.length) return '<p class="p-empty">No guide matches "' + esc(q) + '"' + (S.gcat !== 'all' ? ' in ' + esc(gCatName(S.gcat)) : '') + '. <button type="button" class="p-x" data-p="g-clear">Clear the search</button></p><p class="hint">Ask the head chef if a guide is missing.</p>';
      return '<p class="lv-count" role="status">' + list.length + (list.length === 1 ? ' guide matches' : ' guides match') + '</p><ul class="g-cards">' + list.map(function (g) { return gCardHTML(g, q); }).join('') + '</ul>';
    }
    return G_CATS.map(function (c) {
      var l = list.filter(function (g) { return g.cat === c[0]; });
      return l.length ? '<section class="g-grp" aria-label="' + esc(c[1]) + '"><h3 class="g-gh"><span>' + esc(c[1]) + '</span><span>' + l.length + '</span></h3><ul class="g-cards">' + l.map(function (g) { return gCardHTML(g, ''); }).join('') + '</ul></section>' : '';
    }).join('');
  }
  function guidesPageHTML() {
    loadGuides(Date.now() - S.guidesAt > G_STALE);
    if (S.gSel) return guideDocHTML();
    var live = gLive(), head = '<header class="g-head"><span class="g-eb">Leichhardt Hotel Kitchen</span><h2 class="g-title" id="rtitle" tabindex="-1">Guides</h2><p class="g-lead">How to work the equipment, clean it and find things. Written by the head chef.</p></header>';
    if (S.guides == null) return '<section class="g-page">' + head + '<p class="hint">Loading...</p></section>';
    if (!live.length) return '<section class="g-page">' + head + '<p class="p-empty">No guides yet. The head chef adds them in the admin panel.</p>' + gAdminLink() + '</section>';
    var cats = G_CATS.filter(function (c) { return live.some(function (g) { return g.cat === c[0]; }); });
    if (S.gcat !== 'all' && !cats.some(function (c) { return c[0] === S.gcat; })) S.gcat = 'all';
    var chips = cats.length > 1 ? '<div class="chips scroll g-cats" role="group" aria-label="Category">' + [['all', 'All']].concat(cats).map(function (c) {
      var n = c[0] === 'all' ? live.length : live.filter(function (g) { return g.cat === c[0]; }).length;
      return '<button type="button" class="chip" data-p="g-cat" data-v="' + c[0] + '" aria-pressed="' + (S.gcat === c[0]) + '">' + esc(c[1]) + ' <span class="lv-n">' + n + '</span></button>';
    }).join('') + '</div>' : '';
    return '<section class="g-page">' + head +
      '<div class="g-find"><label class="visually-hidden" for="g-q">Search the guides</label><input id="g-q" type="search" class="search" data-k="g-q" placeholder="Search: oven, fryer, cleaning" value="' + esc(S.gq) + '" autocomplete="off" enterkeyhint="search"></div>' + chips +
      '<div id="g-list" class="g-list">' + gListHTML() + '</div>' + gAdminLink() + '</section>';
  }
  function guideDocHTML() {
    var g = gById(S.gSel), back = '<nav class="g-top g-noprint" aria-label="Back"><a class="p-link" href="#/guides">All guides</a></nav>';
    if (!g || g.removed) return back + '<section class="g-page"><h2 class="g-title" id="rtitle" tabindex="-1">Guide not found</h2><p class="hint">' + (S.guides == null || S.gBusy ? 'Loading...' : 'This guide was removed or the link is old. Look for it in the list.') + '</p></section>';
    var pv = gPagesFor(g), n = g.pages || 0, steps = mnLines(g.steps), cards = gCards(g), figs = '', i;
    for (i = 0; i < n; i++) {
      var d = (g.dims || [])[i] || { w: 1414, h: 2000 }, u = pv.urls[i];
      figs += '<figure class="g-pg">' + (u ? '<button type="button" class="g-pgb" data-p="g-zoom" data-i="' + i + '" aria-label="' + esc('Open page ' + (i + 1) + ' big') + '"><img src="' + esc(u) + '" width="' + (+d.w || 1414) + '" height="' + (+d.h || 2000) + '" alt="' + esc('Page ' + (i + 1) + ' of ' + g.title) + '"></button>' :
        '<div class="g-ph" style="aspect-ratio: ' + (+d.w || 1414) + ' / ' + (+d.h || 2000) + '">' + (pv.state === 'error' ? 'Could not load this page.' : 'Loading page ' + (i + 1) + '...') + '</div>') +
        (n > 1 ? '<figcaption>Page ' + (i + 1) + ' of ' + n + '</figcaption>' : '') + '</figure>';
    }
    var admin = S.level === 'owner' || lsGet('lk.admin') === '1';
    return back + '<article class="g-doc"><header class="g-dh"><span class="g-eb">' + esc(gCatName(g.cat)) + ' guide</span><h2 class="g-title" id="rtitle" tabindex="-1">' + esc(g.title) + '</h2>' +
      (g.sum ? '<p class="g-lead">' + esc(g.sum) + '</p>' : '') + '<p class="g-meta">' + esc(gMeta(g)) + '</p></header>' +
      (steps.length ? '<section class="g-steps"><h3 class="g-h3">Steps</h3><ol class="g-ol">' + steps.map(function (t) { return '<li><span class="g-c" aria-hidden="true"></span><span>' + linkNote(t) + '</span></li>'; }).join('') + '</ol></section>' : '') +
      (n ? '<section class="g-pages" aria-label="Pages"><p class="hint g-noprint">' + (n > 1 ? n + ' pages. ' : '') + 'Tap a page to open it big.</p>' +
        (n > 2 ? '<div class="g-thumbs g-noprint">' + pv.urls.slice(0, n).map(function (u, k) { return u ? '<button type="button" class="g-thumb" data-p="g-zoom" data-i="' + k + '" aria-label="' + esc('Open page ' + (k + 1) + ' big') + '"><img src="' + esc(u) + '" alt=""><span>' + (k + 1) + '</span></button>' : ''; }).join('') + '</div>' : '') + figs +
        (pv.state === 'error' ? '<p class="p-err g-noprint">Could not load the pages. Check the connection. <button type="button" class="p-x" data-p="g-retry">Try again</button></p>' : '') + '</section>' : '') +
      (cards.length ? '<section class="g-rec g-noprint"><h3 class="g-h3">On these recipe cards</h3><div class="g-rchips">' + cards.map(function (r) { return '<a class="g-rchip" href="#/r/' + esc(r.id) + '">' + esc(r.name) + '</a>'; }).join('') + '</div></section>' : '') +
      '<div class="btn-row g-noprint"><button type="button" class="btn" data-p="g-print">Print</button>' + (admin ? '<button type="button" class="btn" data-p="g-change" data-id="' + esc(g.id) + '">Change this guide</button>' : '') + '</div></article>';
  }
  function printGuide() {
    document.documentElement.classList.add('print-guide');
    function done() { document.documentElement.classList.remove('print-guide'); window.removeEventListener('afterprint', done); }
    window.addEventListener('afterprint', done);
    setTimeout(function () { window.print(); setTimeout(function () { if (document.documentElement.classList.contains('print-guide') && !window.matchMedia('print').matches) done(); }, 1500); }, 50);
  }

  /* A page opened big: over everything (appended to the body, so page redraws leave it alone), Previous and Next, Fit or Full size.
     Its clicks use data-gz. Escape or Close shuts it. Pinching zooms further on a phone. */
  var gz = null;
  /* ---------- the phone's Back button closes what is open on top (20 Oct 2026) ----------
     Opening the big guide page or the pings popup adds a history entry for the same address. Back closes it (pings count
     as put off, not read), and closing it any other way takes that entry off again, so Back never leaves the page by
     surprise. A close that comes with a move to another page (a link) leaves the entry. */
  var ovOn = '';
  function ovPush(k) { ovOn = k; try { history.pushState({ lkOv: k }, '', location.href); } catch (e) {} }
  function ovDone(k, noBack) { if (ovOn !== k) return; ovOn = ''; if (noBack) return; try { if (history.state && history.state.lkOv === k) history.back(); } catch (e) {} }
  window.addEventListener('popstate', function () {
    var k = ovOn; ovOn = '';
    if (k === 'gz' && gz) gzClose(true);
    else if (k === 'note' && npop) noteClose(true, true);
  });
  function gzOpen(id, i) {
    if (gz) gzClose();
    var el = document.createElement('div');
    el.className = 'gz-wrap'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    gz = { id: id, i: i, full: false, el: el, prev: document.activeElement };
    document.body.appendChild(el);
    ovPush('gz');
    document.documentElement.classList.add('gz-open');
    gzDraw();
    var c = el.querySelector('[data-gz="close"]'); if (c) c.focus({ preventScroll: true });
  }
  function gzDraw() {
    if (!gz) return;
    var g = gById(gz.id), e = g && gPg[g.id + ':' + (g.v || 1)];
    if (!g || !e) { gzClose(); return; }
    var n = g.pages || 0, u = e.urls[gz.i], d = (g.dims || [])[gz.i] || {};
    gz.el.setAttribute('aria-label', 'Page ' + (gz.i + 1) + ' of ' + n + ', ' + g.title);
    gz.el.innerHTML = '<div class="gz-bar"><span class="gz-t">' + esc(g.title) + '<small>Page ' + (gz.i + 1) + ' of ' + n + '</small></span><span class="gz-btns">' +
      (n > 1 ? '<button type="button" class="gz-b" data-gz="prev"' + (gz.i ? '' : ' disabled') + '>Previous</button><button type="button" class="gz-b" data-gz="next"' + (gz.i < n - 1 ? '' : ' disabled') + '>Next</button>' : '') +
      '<button type="button" class="gz-b gz-sz" data-gz="size">' + (gz.full ? 'Fit to screen' : 'Full size') + '</button><button type="button" class="gz-b gz-x" data-gz="close">Close</button></span></div>' +
      '<div class="gz-body' + (gz.full ? ' is-full' : '') + '">' + (u ? '<img src="' + esc(u) + '" alt="' + esc('Page ' + (gz.i + 1) + ' of ' + g.title) + '"' + (d.w ? ' width="' + (+d.w) + '" height="' + (+d.h) + '"' : '') + '>' : '<p class="gz-wait">Loading...</p>') + '</div>' +
      // phones: Previous, Full size and Next sit at the bottom, in thumb reach
      (n > 1 ? '<div class="gz-foot"><button type="button" class="gz-b" data-gz="prev"' + (gz.i ? '' : ' disabled') + '>Previous</button><button type="button" class="gz-b" data-gz="size">' + (gz.full ? 'Fit' : 'Full size') + '</button><button type="button" class="gz-b" data-gz="next"' + (gz.i < n - 1 ? '' : ' disabled') + '>Next</button></div>' : '');
  }
  function gzClose(noBack) {
    if (!gz) return;
    var prev = gz.prev;
    ovDone('gz', noBack);
    if (gz.el.parentNode) gz.el.parentNode.removeChild(gz.el);
    gz = null;
    document.documentElement.classList.remove('gz-open');
    if (prev && prev.focus && document.body.contains(prev)) { try { prev.focus({ preventScroll: true }); } catch (e) {} }
  }
  document.addEventListener('click', function (e) {
    var el = gz && e.target.closest && e.target.closest('[data-gz]');
    if (!el || !gz.el.contains(el)) return;
    var a = el.getAttribute('data-gz'), g = gById(gz.id);
    if (a === 'close') { gzClose(); return; }
    if (a === 'size') { gz.full = !gz.full; gzDraw(); gz.el.querySelector('[data-gz="size"]').focus(); return; }
    if ((a === 'prev' || a === 'next') && g) { gz.i = Math.max(0, Math.min((g.pages || 1) - 1, gz.i + (a === 'next' ? 1 : -1))); gzDraw(); var b = Array.prototype.filter.call(gz.el.querySelectorAll('[data-gz="' + a + '"]:not([disabled])'), function (x) { return x.offsetParent !== null; })[0] || gz.el.querySelector('[data-gz="close"]'); if (b) b.focus(); }
  });
  document.addEventListener('keydown', function (e) {
    if (!gz) return;
    if (e.key === 'Escape') { e.preventDefault(); gzClose(); return; }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var b = gz.el.querySelector('[data-gz="' + (e.key === 'ArrowRight' ? 'next' : 'prev') + '"]:not([disabled])'); if (b) { e.preventDefault(); b.click(); } return; }
    if (e.key !== 'Tab') return;
    var f = Array.prototype.filter.call(gz.el.querySelectorAll('button:not([disabled])'), function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    if (e.shiftKey && (document.activeElement === f[0] || !gz.el.contains(document.activeElement))) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  window.addEventListener('hashchange', function () { if (gz) gzClose(true); });
  /* Swipe left or right on the page (not while it is full size, and not with two fingers) turns the page. */
  var gzSw = null;
  document.addEventListener('pointerdown', function (e) {
    if (!gz) return;
    if (!e.isPrimary) { gzSw = null; return; }
    gzSw = !gz.full && e.target.closest && e.target.closest('.gz-body') && gz.el.contains(e.target) ? { x: e.clientX, y: e.clientY } : null;
  });
  document.addEventListener('pointercancel', function () { gzSw = null; });
  document.addEventListener('pointerup', function (e) {
    if (!gzSw || !gz || !e.isPrimary) return;
    var dx = e.clientX - gzSw.x, dy = e.clientY - gzSw.y; gzSw = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) { var b = gz.el.querySelector('[data-gz="' + (dx < 0 ? 'next' : 'prev') + '"]:not([disabled])'); if (b) b.click(); }
  });

  /* ---- adding and changing guides (admin panel, Guides tab, head chef only) ---- */
  var gSeq = 0;
  function gfNew() { return { id: '', nid: '', title: '', cat: '', sum: '', steps: '', kw: '', pages: null, text: '', file: '', busy: '', msg: '', saving: false }; }
  function gfFrom(g) { return { id: g.id, nid: '', title: g.title || '', cat: g.cat || 'other', sum: g.sum || '', steps: g.steps || '', kw: g.kw || '', pages: null, text: '', file: '', busy: '', msg: '', saving: false }; }
  function gfSnap(f) { return f ? JSON.stringify([f.title, f.cat, f.sum, f.steps, f.kw, f.pages ? f.pages.map(function (p) { return p.k; }) : null]) : ''; }
  function gfDirty() { return !!S.gf && (!!S.gf.busy || !!S.gf.saving || gfSnap(S.gf) !== S.gfSnap); }
  function gOpenEditor(f) {
    S.gf = f; S.gfSnap = gfSnap(f); S.gMsg = ''; S.atab = 'guides'; lsSet('lk.prep.atab', 'guides'); draw();
    var t = S.root && S.root.querySelector('[data-k="g-title"]');
    if (t) { t.focus({ preventScroll: true }); t.scrollIntoView({ block: 'start' }); }
  }
  var pdfP = null;
  function pdfjs() {
    if (pdfP) return pdfP;
    pdfP = import(PDFJS + 'legacy/build/pdf.min.mjs').then(function (m) { m.GlobalWorkerOptions.workerSrc = PDFJS + 'legacy/build/pdf.worker.min.mjs'; return m; }, function (e) { pdfP = null; throw e; });
    return pdfP;
  }
  var WEBP = null;
  function webpOk() { if (WEBP == null) { var c = document.createElement('canvas'); c.width = c.height = 1; WEBP = c.toDataURL('image/webp').indexOf('data:image/webp') === 0; } return WEBP; }
  /* one page as a picture of under 950 kB: WebP where the browser can make it (JPEG otherwise), less sharp and then smaller until it fits */
  function gEncode(cv) {
    var src = cv, qs = [0.86, 0.76, 0.66, 0.56], url = '', t, i;
    for (t = 0; t < 4; t++) {
      for (i = 0; i < qs.length; i++) {
        url = webpOk() ? src.toDataURL('image/webp', qs[i]) : src.toDataURL('image/jpeg', qs[i]);
        if (url.length <= G_IMG) return { img: url, w: src.width, h: src.height, thumb: gThumb(src), k: ++gSeq };
      }
      var c2 = document.createElement('canvas'); c2.width = Math.round(src.width * 0.8); c2.height = Math.round(src.height * 0.8);
      c2.getContext('2d').drawImage(src, 0, 0, c2.width, c2.height); src = c2;
    }
    return { img: url, w: src.width, h: src.height, thumb: gThumb(src), k: ++gSeq };
  }
  /* the small picture on the list: 240 px on its long side, JPEG */
  function gThumb(cv) {
    var sc = 240 / Math.max(cv.width, cv.height), c = document.createElement('canvas'), x;
    c.width = Math.max(1, Math.round(cv.width * sc)); c.height = Math.max(1, Math.round(cv.height * sc));
    x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(cv, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.72);
  }
  function gCanvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); return c; }
  /* the words read from a PDF, for search: one space between words, and letter-spaced headings ("I C O M B I") joined up */
  function gTidy(t) { return String(t).replace(/\s+/g, ' ').replace(/(^|\s)((?:[A-Za-z0-9] ){2,}[A-Za-z0-9])(?=\s|$)/g, function (m, a, b) { return a + b.replace(/ /g, ''); }).trim().slice(0, G_TEXT); }
  function gPdf(file, f, label) {
    return Promise.all([pdfjs().catch(function (e) { f.noReader = true; throw e; }), file.arrayBuffer()]).then(function (r) {
      return r[0].getDocument({ data: new Uint8Array(r[1]), isEvalSupported: false, standardFontDataUrl: PDFJS + 'standard_fonts/', cMapUrl: PDFJS + 'cmaps/', cMapPacked: true }).promise;
    }).then(function (doc) {
      var room = G_MAXP - f.pages.length, n = Math.min(doc.numPages, room), i = 0, words = [];
      if (doc.numPages > room) f.cut = true;
      function next() {
        if (i >= n) { doc.destroy(); f.text = gTidy(f.text + ' ' + words.join(' ')); return; }
        i++; f.busy = 'Reading ' + label + ': page ' + i + ' of ' + n + '...'; draw();
        return doc.getPage(i).then(function (pg) {
          var v1 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: G_LONG / Math.max(v1.width, v1.height) }), cv = gCanvas(vp.width, vp.height);
          return pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise.then(function () { return pg.getTextContent(); }).then(function (tc) {
            words.push(tc.items.map(function (x) { return x.str; }).join(' '));
            f.pages.push(gEncode(cv)); pg.cleanup();
          });
        }).then(next);
      }
      return next();
    });
  }
  function gPhoto(file, f, label) {
    f.busy = 'Reading ' + label + '...'; draw();
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var sc = Math.min(1, G_LONG / Math.max(im.naturalWidth, im.naturalHeight)), cv = gCanvas(im.naturalWidth * sc, im.naturalHeight * sc);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(u); f.pages.push(gEncode(cv)); res();
      };
      im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('photo')); };
      im.src = u;
    });
  }
  /* Files chosen in the editor: each PDF page and each photo becomes one page, in the order chosen. Choosing more adds pages.
     When changing a saved guide, the new pages replace the old file once it is saved. */
  function gReadFiles(files) {
    var f = S.gf, list = Array.prototype.slice.call(files || []);
    if (!f || !list.length || f.busy || f.saving) return;
    f.pages = f.pages || []; f.msg = ''; f.cut = false; f.noReader = false;
    var bad = [], chain = Promise.resolve();
    list.forEach(function (file) {
      chain = chain.then(function () {
        if (f.pages.length >= G_MAXP) { f.cut = true; return; }
        var label = '"' + String(file.name || 'file').slice(0, 40) + '"', pdf = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name || '');
        if (!pdf && !/^image\//.test(file.type)) { bad.push(file.name); return; }
        if (!f.file) f.file = String(file.name || '').slice(0, 120);
        return (pdf ? gPdf(file, f, label) : gPhoto(file, f, label)).catch(function () { bad.push(file.name); });
      });
    });
    chain.then(function () {
      f.busy = '';
      var m = [];
      if (f.noReader) m.push('Could not load the PDF reader. Check the connection and choose the file again.');
      else if (bad.length) m.push('Could not read ' + bad.map(function (b) { return '"' + b + '"'; }).join(', ') + '. Use a PDF, or photos as JPEG or PNG.');
      if (f.cut) m.push('Only the first ' + G_MAXP + ' pages are kept. Split a longer file into two guides.');
      if (f.pages.some(function (p) { return p.img.length > G_IMG; })) m.push('A page is still too big to save. Remove it, or use a smaller photo.');
      f.msg = m.join(' ');
      if (!f.title.trim() && f.file) f.title = f.file.replace(/\.[a-z0-9]+$/i, '').replace(/[_]+/g, ' ').slice(0, 80);
      draw();
    });
  }
  function gKb(p) { return Math.round(p.img.length * 0.75 / 1024) + ' kB'; }
  function gEditHTML() {
    var f = S.gf, old = f.id ? gById(f.id) : null, pages = f.pages;
    var cats = G_CATS.map(function (c) { return '<button type="button" class="chip" data-p="g-fcat" data-v="' + c[0] + '" aria-pressed="' + (f.cat === c[0]) + '">' + esc(c[1]) + '</button>'; }).join('');
    var strip = '';
    if (pages && pages.length) {
      strip = '<ol class="g-strip">' + pages.map(function (p, i) {
        return '<li><img src="' + esc(p.thumb) + '" alt="' + esc('Page ' + (i + 1)) + '"><span>Page ' + (i + 1) + ' · ' + gKb(p) + '</span><span class="g-sbtn">' +
          (i ? '<button type="button" class="p-x" data-p="g-pup" data-i="' + i + '" aria-label="' + esc('Move page ' + (i + 1) + ' earlier') + '">Earlier</button>' : '') +
          '<button type="button" class="p-x" data-p="g-prm" data-i="' + i + '" aria-label="' + esc('Remove page ' + (i + 1)) + '">Remove</button></span></li>';
      }).join('') + '</ol>';
    }
    var pagesMsg = pages ? (pages.length ? pages.length + (pages.length === 1 ? ' page' : ' pages') + ' ready to save.' + (old && old.pages ? ' They replace the ' + old.pages + ' saved now.' : '') : 'No pages chosen.' + (old && old.pages ? ' Saving removes the ' + old.pages + ' saved now.' : '')) :
      (old && old.pages ? 'Saved now: ' + old.pages + (old.pages === 1 ? ' page' : ' pages') + (old.file ? ' from "' + old.file + '"' : '') + '. Choose a new file to replace them.' : 'No file yet.');
    return '<section class="set-block g-edit"><span class="label">' + (f.id ? 'Change this guide' : 'Add a guide') + '</span>' +
      '<span class="hint">A PDF or photos, a clear title and a category. Staff search the title, the words in the PDF and the search words. No prices, PINs or staff names.</span>' +
      '<div class="field"><label class="label" for="g-title">Title</label><input id="g-title" class="search" data-k="g-title" maxlength="80" autocomplete="off" placeholder="For example: iCombi, programme a new recipe" value="' + esc(f.title) + '"></div>' +
      '<div class="field"><span class="label">Category</span><div class="nt-chips" role="group" aria-label="Category">' + cats + '</div></div>' +
      '<div class="field"><label class="label" for="g-sum">What it is for (one line)</label><input id="g-sum" class="search" data-k="g-sum" maxlength="200" autocomplete="off" placeholder="For example: set up any new dish as a programme" value="' + esc(f.sum) + '"></div>' +
      '<div class="field"><span class="label">File</span><label class="btn g-filebtn' + (f.busy || f.saving ? ' is-off' : '') + '">' + (pages && pages.length ? 'Add more pages' : old && old.pages ? 'Choose a new file' : 'Choose a PDF or photos') +
        '<input type="file" id="g-file" class="visually-hidden" data-k="g-file" accept="application/pdf,image/*" multiple' + (f.busy || f.saving ? ' disabled' : '') + '></label>' +
        '<span class="hint">Each PDF page or photo becomes a picture staff can open big. Up to ' + G_MAXP + ' pages.</span>' +
        (f.busy ? '<p class="g-busy" role="status">' + esc(f.busy) + '</p>' : '<p class="g-now" role="status">' + esc(pagesMsg) + '</p>') + strip + '</div>' +
      '<div class="field"><label class="label" for="g-steps">Steps (optional, one per line)</label><textarea id="g-steps" class="p-bulk" data-k="g-steps" rows="5" maxlength="3000" placeholder="For example: Press the menu button, bottom right.">' + esc(f.steps) + '</textarea></div>' +
      '<div class="field"><label class="label" for="g-kw">Search words (optional)</label><input id="g-kw" class="search" data-k="g-kw" maxlength="200" autocomplete="off" placeholder="For example: iCombi, oven, programme" value="' + esc(f.kw) + '"><span class="hint">Separate them with commas. A recipe card that mentions one of these words shows a link to this guide.</span></div>' +
      '<p class="g-links" id="g-links">' + esc(gLinksText(f)) + '</p>' +
      (f.msg ? '<p class="p-err" role="alert">' + esc(f.msg) + '</p>' : '') +
      '<div class="btn-row"><button type="button" class="btn dark" data-p="g-save"' + (f.busy || f.saving ? ' disabled' : '') + '>' + (f.saving ? 'Saving...' : f.id ? 'Save changes' : 'Save guide') + '</button>' +
      '<button type="button" class="btn" data-p="g-cancel">' + (armed('g-cancel') ? 'Tap again to discard' : f.id ? 'Cancel' : 'Close') + '</button></div></section>';
  }
  /* while writing: which recipe cards the guide will show on (the same rule as gIndex) */
  function gLinksText(f) {
    var old = f.id ? gById(f.id) : null, names = gLinkIds({ title: f.title, sum: f.sum, steps: f.steps, kw: f.kw, text: f.pages ? f.text : old ? old.text : '' }).map(recipeById).filter(Boolean).map(function (r) { return r.name; });
    return names.length ? 'Shows on these recipe cards: ' + names.slice(0, 12).join(', ') + (names.length > 12 ? ' and ' + (names.length - 12) + ' more' : '') + '.' : 'Not on any recipe card yet. A recipe name or a search word puts it there.';
  }
  function gRowAdmin(g) {
    var cards = gCards(g).map(function (r) { return r.name; });
    return '<li class="nt-row g-row"><div class="g-rt">' + gThumbHTML(g) + '<div class="g-rb"><span class="nt-tag">' + esc(gCatName(g.cat)) + '</span><b>' + esc(g.title) + '</b>' + (g.sum ? '<span>' + esc(g.sum) + '</span>' : '') +
      '<span class="nt-by">' + esc(gMeta(g)) + (cards.length ? '. On ' + esc(cards.slice(0, 4).join(', ')) + (cards.length > 4 ? ' and ' + (cards.length - 4) + ' more' : '') : '') + '</span></div></div>' +
      '<div class="btn-row"><a class="p-x g-open" href="#/guides/' + encodeURIComponent(g.id) + '">Open</a><button type="button" class="p-x" data-p="g-edit" data-id="' + esc(g.id) + '">Change</button>' +
      '<button type="button" class="p-x" data-p="g-del" data-id="' + esc(g.id) + '">' + (armed('g-del:' + g.id) ? 'Tap again to remove' : 'Remove') + '</button></div></li>';
  }
  function guidesAdminHTML() {
    var open = !!S.gf, live = gLive();
    var list = S.guides == null ? '<p class="hint">Loading...</p>' : lvHTML({
      key: 'guides', items: live, step: 10, tools: 6, noun: ['guide', 'guides'], ph: 'Search guides', empty: 'No guides yet. Tap Add a guide to upload the first one.',
      find: gHay,
      filters: [['all', 'All guides']].concat(G_CATS.map(function (c) { return [c[0], c[1], function (g) { return g.cat === c[0]; }]; })),
      sorts: [['cat', 'By category', gOrder], ['new', 'Newest first', function (a, b) { return (b.upd || b.at || 0) - (a.upd || a.at || 0); }], ['az', 'A to Z', function (a, b) { return String(a.title).localeCompare(String(b.title)); }]],
      card: gRowAdmin
    });
    return '<div class="n-ws' + (open ? ' has-ed' : '') + '">' + (open ? '<div class="n-ed">' + gEditHTML() + '</div>' : '') +
      '<section class="set-block n-lst"><div class="n-lh"><div><span class="label">Guides</span><span class="hint">Staff open them from Guides in the menu, search them, and find them on the recipe cards they mention.</span></div>' +
      (open ? '' : '<button type="button" class="btn dark" data-p="g-new">Add a guide</button>') + '</div>' +
      (open ? '' : '<span class="saved" role="status">' + esc(S.gMsg) + '</span>') + list + '</section></div>';
  }
  function gClean(t, n) { return String(t || '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/^\s+|\s+$/g, '').slice(0, n); }
  /* Saving: the pages first (one record each, they are big), then old pages the new file does not need, then the guide itself,
     so a guide never shows before its pages are there. A failed save keeps everything in the editor to try again. */
  function saveGuide() {
    var f = S.gf;
    if (!f || f.saving || f.busy || !fb) return;
    var old = f.id ? gById(f.id) : null, pages = f.pages, title = gClean(f.title, 80).replace(/\s+/g, ' ');
    function stop(m) { f.msg = m; draw(); }
    if (S.level !== 'owner') return stop('Only the head chef can save guides.');
    if (!title) { stop('Give the guide a title.'); focusK('g-title'); return; }
    if (!f.cat) return stop('Pick a category.');
    if (!(pages ? pages.length : old && old.pages) && !gClean(f.steps, 3000)) return stop('Add a PDF, photos or written steps.');
    if (pages && pages.some(function (p) { return p.img.length > G_IMG; })) return stop('A page is too big to save. Remove it, or use a smaller photo.');
    var id = f.id || f.nid || (f.nid = fb.fs.doc(colRef('guides')).id), v = old ? (old.v || 1) + (pages ? 1 : 0) : 1, oldN = old ? old.pages || 0 : 0;
    f.saving = true; f.msg = ''; draw();
    var chain = Promise.resolve();
    if (pages) pages.forEach(function (p, n) {
      chain = chain.then(function () { f.busy = 'Saving page ' + (n + 1) + ' of ' + pages.length + '...'; draw(); return W([['set', gPageRef(id, n), { img: p.img, w: p.w, h: p.h, v: v, n: n }]]); });
    });
    if (pages && oldN > pages.length) chain = chain.then(function () { var ops = [], n; for (n = pages.length; n < oldN; n++) ops.push(['del', gPageRef(id, n)]); return W(ops); });
    chain.then(function () {
      var data = { title: title, cat: f.cat, sum: gClean(f.sum, 200).replace(/\s+/g, ' '), steps: gClean(f.steps, 3000), kw: gClean(f.kw, 200).replace(/\s+/g, ' '), v: v, removed: false, upd: now() };
      if (pages || !old) {
        pages = pages || [];
        data.pages = pages.length; data.dims = pages.map(function (p) { return { w: p.w, h: p.h }; });
        data.thumb = pages.length ? pages[0].thumb : ''; data.text = pages.length ? f.text.slice(0, G_TEXT) : ''; data.file = pages.length ? f.file : '';
      }
      if (!old) data.at = now();
      f.busy = 'Saving the guide...'; draw();
      return sset(gRef(id), data, !!old).then(function () { return data; });
    }).then(function (data) {
      var mine = Object.assign({}, old || {}, data, { id: id });
      S.guides = (S.guides || []).filter(function (g) { return g.id !== id; }).concat([mine]); gKeep();
      try { window.dispatchEvent(new Event('lk-guides')); } catch (e) {}
      S.gf = null; S.gfSnap = ''; S.gMsg = 'Saved "' + title + '". Staff see it under Guides.';
      lvReveal('guides'); S.gRetry = 0; draw(); loadGuides(true);
    }, function (e) {
      f.saving = false; f.busy = '';
      f.msg = e && e.code === 'permission-denied' ? 'Not saved: the security rules refused it. Sign in again with the head chef\'s Google account.' : 'Not saved. Check the connection and try again. Nothing typed or chosen is lost.';
      draw();
    });
  }
  function removeGuide(id, back) {
    var g = gById(id);
    if (!g || (!back && !arm('g-del:' + id))) return;
    sset(gRef(id), { removed: !back, upd: now() }, true).then(function () {
      g.removed = !back; g.upd = now(); gKeep();
      try { window.dispatchEvent(new Event('lk-guides')); } catch (e) {}
      if (!back) toast('Removed "' + g.title + '".', { label: 'Undo', fn: function () { removeGuide(id, true); } });
      else toast('Put back "' + g.title + '".');
      S.gRetry = 0; loadGuides(true);
    }, failed);
  }

  /* ---------- the drinks run ----------
     Each person keeps their usual coffee or drink (drinks/<personId>, written only by that person with their own PIN).
     The first time someone sets their PIN, the book asks for it straight after ("One more thing"). People who signed up
     before this see a small card on the prep list, orders and wastage once, until they set it or tap Not now
     (lk.drink.<id> on the phone, so the check is at most one small read per person per phone).
     #/drinks (the chef mark menu, and Tools on the prep list) shows everyone's usual. Whoever does the run taps who is
     in and shares the order: the same drinks counted together for the cafe, then who has what. The team's drinks are
     read with one query when the page opens, again only after 30 minutes, and kept on the phone (lk.drinks).
     Who is in today stays on the phone for the day (lk.drinks.run). */
  // id, label, and what to ask: s size, m milk, e strength (espresso drinks)
  var DK_KINDS = [['flat', 'Flat white', 'sme'], ['latte', 'Latte', 'sme'], ['cap', 'Cappuccino', 'sme'], ['long', 'Long black', 'se'], ['short', 'Short black', 'e'],
    ['picc', 'Piccolo', 'me'], ['mac', 'Macchiato', 'me'], ['mocha', 'Mocha', 'sme'], ['icedl', 'Iced latte', 'sme'], ['icedc', 'Iced coffee', 'sm'],
    ['chai', 'Chai latte', 'sm'], ['hotc', 'Hot chocolate', 'sm'], ['tea', 'Tea', 'sm'], ['none', 'No hot drink', '']];
  var DK_SIZE = [['small', 'Small'], ['reg', 'Regular'], ['large', 'Large']];
  var DK_MILK = [['full', 'Full cream'], ['skim', 'Skim'], ['lf', 'Lactose free'], ['oat', 'Oat'], ['almond', 'Almond'], ['soy', 'Soy'], ['none', 'No milk']];
  var DK_SHOT = [['extra', 'Extra shot'], ['half', 'Half strength'], ['decaf', 'Decaf']];
  var DK_SUGAR = [['none', 'No sugar'], ['1', '1 sugar'], ['2', '2 sugars'], ['3', '3 sugars'], ['sweet', 'Sweetener']];
  var DK_NOTE = 40, DK_OTHER = 60, DK_STALE = 30 * 60000;
  var dkf = null, dkEditing = false, dkMsg = '', dkBusy = false, dkQ = '', dkList = null, dkAt = 0, dkLoading = false, dkErr = false;
  (function () { try { var c = JSON.parse(lsGet('lk.drinks') || 'null'); if (c && c.pin === S.pin && c.by) { dkList = c.by; dkAt = 0; } } catch (e) {} })();
  function dkLabel(list, id) { var x = list.filter(function (k) { return k[0] === id; })[0]; return x ? x[1] : ''; }
  function dkKind(id) { return DK_KINDS.filter(function (k) { return k[0] === id; })[0] || null; }
  function dkAsks(kind, what) { var k = dkKind(kind); return !!k && k[2].indexOf(what) >= 0; }
  /* "Large decaf oat flat white, 1 sugar. Extra hot" (the coffee), and the other drink on its own */
  function dkCoffee(d) {
    if (!d || !d.kind || d.kind === 'none' || !dkKind(d.kind)) return '';
    var k = d.kind, milk = dkAsks(k, 'm') && d.milk && d.milk !== 'full' && d.milk !== 'none' ? dkLabel(DK_MILK, d.milk).toLowerCase() : '';
    var head = [dkAsks(k, 's') ? dkLabel(DK_SIZE, d.size) : '', dkAsks(k, 'e') && d.shot === 'decaf' ? 'decaf' : '', milk, dkLabel(DK_KINDS, k).toLowerCase()].filter(Boolean).join(' ');
    var extra = [dkAsks(k, 'm') && d.milk === 'none' ? 'no milk' : '', dkAsks(k, 'e') && d.shot && d.shot !== 'decaf' ? dkLabel(DK_SHOT, d.shot).toLowerCase() : '', d.sugar ? dkLabel(DK_SUGAR, d.sugar).toLowerCase() : ''].filter(Boolean);
    var t = head.charAt(0).toUpperCase() + head.slice(1) + (extra.length ? ', ' + extra.join(', ') : '');
    return t + (d.note ? '. ' + d.note : '');
  }
  function dkSum(d) {
    var c = dkCoffee(d), o = d && d.other ? d.other : '';
    return c && o ? c + '. Also ' + o : c || o;
  }
  function dkMine() { return dkList && S.who ? dkList[S.who] || null : null; }
  function dkEdit() {
    var m = dkMine() || {};
    dkf = { kind: m.kind || '', size: m.size || 'reg', milk: m.milk || '', shot: m.shot || '', sugar: m.sugar || '', note: m.note || '', other: m.other || '' };
    dkEditing = true; dkMsg = '';
  }
  function dkFlag(v) { if (S.who) lsSet('lk.drink.' + S.who, v); }
  /* someone who signed up before the drinks run: ask once, if they have no usual yet */
  function dkCheck() {
    var id = S.who;
    if (!fb || !id || !S.authed || S.drinkAsk || lsGet('lk.drink.' + id)) return;
    if (dkList && dkList[id]) { dkFlag('set'); return; }
    fb.fs.getDoc(docRef('drinks', id)).then(function (sn) {
      if (S.who !== id) return;
      if (sn.exists()) { dkFlag('set'); return; }
      if (!S.drinkAsk) { S.drinkAsk = 'again'; draw(); }
    }, function () {});
  }
  function dkLoad(force) {
    if (!fb || !/^\d{4,6}$/.test(S.pin) || dkLoading || (!force && dkAt && Date.now() - dkAt < DK_STALE)) return;
    dkLoading = true;
    fb.fs.getDocs(colRef('drinks')).then(function (sn) {
      var by = {};
      sn.docs.forEach(function (d) { by[d.id] = d.data(); });
      dkList = by; dkAt = Date.now(); dkLoading = false; dkErr = false;
      lsSet('lk.drinks', JSON.stringify({ pin: S.pin, by: by }));
      if (S.who && by[S.who]) dkFlag('set');
      draw();
    }, function () { dkLoading = false; dkErr = true; dkAt = Date.now() - DK_STALE + 5 * 60000; draw(); });
  }
  function dkRunGet() { try { var r = JSON.parse(lsGet('lk.drinks.run') || 'null'); return r && r.d === dayNow() && Array.isArray(r.ids) ? r.ids : []; } catch (e) { return []; } }
  function dkRunSet(ids) { lsSet('lk.drinks.run', ids.length ? JSON.stringify({ d: dayNow(), ids: ids }) : ''); }
  function dkSave() {
    var p = who(), f = dkf;
    if (dkBusy || !fb || !p || !f) return;
    f.note = f.note.replace(/^\s+|\s+$/g, ''); f.other = f.other.replace(/^\s+|\s+$/g, '');
    if (!f.kind && !f.other) { dkMsg = 'Pick a coffee or drink first, or write something else you like.'; draw(); return; }
    var k = f.kind, data = { kind: k, size: dkAsks(k, 's') ? f.size : '', milk: dkAsks(k, 'm') ? f.milk : '', shot: dkAsks(k, 'e') ? f.shot : '',
      sugar: k && k !== 'none' ? f.sugar : '', note: k && k !== 'none' ? f.note.slice(0, DK_NOTE) : '', other: f.other.slice(0, DK_OTHER), at: now() };
    var id = S.who, old = dkList ? dkList[id] : undefined;
    dkBusy = true; dkMsg = ''; draw();
    sset(docRef('drinks', id), data).then(function () {
      dkBusy = false; dkList = dkList || {}; dkList[id] = data; lsSet('lk.drinks', JSON.stringify({ pin: S.pin, by: dkList }));
      dkFlag('set'); dkEditing = false; dkf = null;
      var first = S.drinkAsk === 'first'; S.drinkAsk = '';
      toast(first ? 'Saved. Welcome to the Kitchen Book.' : 'Saved. That is your usual on the drinks run.');
    }, function (e) {
      dkBusy = false; if (dkList) { if (old) dkList[id] = old; else delete dkList[id]; }
      failed(e); draw();
    });
  }
  function dkClick(a, el) {
    var v = el.getAttribute('data-v');
    if (a === 'dk-pick') { var fk = el.getAttribute('data-f'); if (dkf) { dkf[fk] = dkf[fk] === v && fk !== 'size' ? '' : v; dkMsg = ''; draw(); } return; }
    if (a === 'dk-save') { dkSave(); return; }
    if (a === 'dk-edit') { dkEdit(); draw(); focusSel('.dr-form'); return; }
    if (a === 'dk-cancel') { dkEditing = false; dkf = null; dkMsg = ''; draw(); return; }
    if (a === 'dk-skip') { S.drinkAsk = ''; dkEditing = false; dkf = null; dkFlag('skip'); draw(); toast('No worries. Set it any time from the chef hat at the top.'); return; }
    if (a === 'dk-later') { S.drinkAsk = ''; dkFlag('later'); draw(); return; }
    if (a === 'dk-set') { S.drinkAsk = ''; dkFlag('later'); dkEdit(); return; }   // the link goes on to #/drinks with the form open
    if (a === 'dk-in') {
      var ids = dkRunGet(), pid = el.getAttribute('data-id'), at = ids.indexOf(pid);
      if (at >= 0) ids.splice(at, 1); else ids.push(pid);
      dkRunSet(ids); draw(); return;
    }
    if (a === 'dk-clear') { dkRunSet([]); draw(); return; }
    if (a === 'dk-share') { var t = dkRunText(); if (t) shareText(t); return; }
    if (a === 'dk-retry') { dkErr = false; dkLoad(true); draw(); }
  }
  function dkChips(f, list, label) {
    return '<div class="field"><span class="label" id="dk-l-' + f + '">' + label + '</span><div class="chips dr-chips" role="group" aria-labelledby="dk-l-' + f + '">' + list.map(function (c) {
      return '<button type="button" class="chip" data-p="dk-pick" data-f="' + f + '" data-v="' + c[0] + '" aria-pressed="' + (dkf[f] === c[0]) + '">' + esc(c[1]) + '</button>';
    }).join('') + '</div></div>';
  }
  function dkFormHTML(first) {
    if (!dkf) dkEdit();
    var k = dkf.kind, hot = k && k !== 'none', prev = dkSum({ kind: k, size: dkf.size, milk: dkf.milk, shot: dkf.shot, sugar: dkf.sugar, note: hot ? dkf.note.trim() : '', other: dkf.other.trim() });
    return '<div class="dr-form" tabindex="-1">' + dkChips('kind', DK_KINDS, 'Coffee or hot drink') +
      (dkAsks(k, 's') ? '<div class="field"><span class="label" id="dk-l-size">Size</span><div class="ml-seg" role="group" aria-labelledby="dk-l-size">' + DK_SIZE.map(function (c) {
        return '<button type="button" class="ml-sb" data-p="dk-pick" data-f="size" data-v="' + c[0] + '" aria-pressed="' + (dkf.size === c[0]) + '">' + c[1] + '</button>';
      }).join('') + '</div></div>' : '') +
      (dkAsks(k, 'm') ? dkChips('milk', DK_MILK, 'Milk') : '') +
      (dkAsks(k, 'e') ? dkChips('shot', DK_SHOT, 'Strength (tap again for normal)') : '') +
      (hot ? dkChips('sugar', DK_SUGAR, 'Sugar') : '') +
      (hot ? '<div class="field"><label class="label" for="dk-note">Anything else about it?</label><input id="dk-note" class="search" data-k="dk-note" maxlength="' + DK_NOTE + '" autocomplete="off" placeholder="Extra hot, honey, Earl Grey" value="' + esc(dkf.note) + '"></div>' : '') +
      '<div class="field"><label class="label" for="dk-other">Something else you like</label><input id="dk-other" class="search" data-k="dk-other" maxlength="' + DK_OTHER + '" autocomplete="off" placeholder="Coke No Sugar, iced water" value="' + esc(dkf.other) + '"><span class="hint">A cold drink or snack for the run. Leave it empty if there is nothing.</span></div>' +
      (prev ? '<p class="dr-prev"><span class="label">Your usual</span>' + esc(prev) + '</p>' : '') +
      (dkMsg ? '<p class="p-err" role="alert">' + esc(dkMsg) + '</p>' : '') +
      '<div class="btn-row"><button type="button" class="btn dark" data-p="dk-save"' + (dkBusy ? ' disabled' : '') + '>' + (dkBusy ? 'Saving...' : 'Save my usual') + '</button>' +
      (first ? '<button type="button" class="btn" data-p="dk-skip">Skip for now</button>' : '<button type="button" class="btn" data-p="dk-cancel">Cancel</button>') + '</div></div>';
  }
  function drinkAskHTML() {
    var p = who();
    return '<section class="p-card dr-page dr-first"><span class="dr-eb">Your PIN is set</span><h2 class="p-h" id="rtitle" tabindex="-1">One more thing' + (p ? ', ' + esc(p.name.split(' ')[0]) : '') + '</h2>' +
      '<p class="hint">What is your usual coffee or drink? When someone does a drinks run, they can see it and get it right. Change it any time from the chef hat at the top.</p>' + dkFormHTML(true) + '</section>';
  }
  function drinkNudgeHTML() {
    if (S.drinkAsk !== 'again' || !S.authed) return '';
    return '<div class="dr-nudge" role="note"><p><b>New: the drinks run.</b> Lock in your usual coffee or drink, so whoever does the run gets it right.</p>' +
      '<div class="btn-row"><a class="btn dark" href="#/drinks" data-p="dk-set">Set my usual</a><button type="button" class="btn" data-p="dk-later">Not now</button></div></div>';
  }
  function dkTeam() {
    var q = dkQ.trim().toLowerCase();
    return people().filter(function (p) { return !q || p.name.toLowerCase().indexOf(q) >= 0; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
  }
  function dkTeamHTML() {
    var run = dkRunGet(), l = dkTeam();
    return '<ul class="dr-team">' + (l.length ? l.map(function (p) {
      var d = dkList ? dkList[p.id] : null, sum = dkSum(d), on = run.indexOf(p.id) >= 0;
      if (!sum) return '<li class="dr-row is-none"><span class="dr-who">' + esc(p.name) + (p.id === S.who ? ' (you)' : '') + '</span><span class="dr-what">No usual yet. Ask them.</span></li>';
      return '<li><button type="button" class="dr-row' + (on ? ' is-in' : '') + '" data-p="dk-in" data-id="' + esc(p.id) + '" aria-pressed="' + on + '"><span class="dr-box" aria-hidden="true">' + (on ? '✓' : '') + '</span>' +
        '<span class="dr-txt"><span class="dr-who">' + esc(p.name) + (p.id === S.who ? ' (you)' : '') + '</span><span class="dr-what">' + esc(sum) + '</span></span></button></li>';
    }).join('') : '<li class="dr-row is-none">Nobody by that name.</li>') + '</ul>';
  }
  /* the order for the cafe: the same drinks counted together, then who has what */
  function dkRunList() {
    var run = dkRunGet();
    return people().filter(function (p) { return run.indexOf(p.id) >= 0 && dkSum(dkList ? dkList[p.id] : null); })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
  }
  function dkGroups(l) {
    var g = {}, order = [];
    l.forEach(function (p) {
      var d = dkList[p.id];
      [dkCoffee(d), d.other || ''].forEach(function (t) { if (!t) return; var key = t.toLowerCase(); if (!g[key]) { g[key] = { t: t, n: 0 }; order.push(key); } g[key].n++; });
    });
    return order.map(function (k) { return g[k]; });
  }
  function dkRunText() {
    var l = dkRunList();
    if (!l.length) return '';
    return 'Drinks run, ' + parseYmd(dayNow()).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) + '\n' +
      dkGroups(l).map(function (x) { return x.n + ' x ' + x.t; }).join('\n') + '\n\n' + l.map(function (p) { return p.name + ': ' + dkSum(dkList[p.id]); }).join('\n');
  }
  function dkRunHTML() {
    var l = dkRunList();
    if (!l.length) return '<p class="hint dr-runnone">Tap the people who are in on the run.</p>';
    var gr = dkGroups(l);
    return '<div class="dr-run" aria-live="polite"><h3 class="ml-h3">The order (' + l.length + (l.length === 1 ? ' person' : ' people') + ')</h3><ul class="dr-order">' + gr.map(function (x) {
      return '<li><b>' + x.n + ' x</b> ' + esc(x.t) + '</li>';
    }).join('') + '</ul><div class="btn-row"><button type="button" class="btn dark" data-p="dk-share">' + shareLabel('the order') + '</button><button type="button" class="btn" data-p="dk-clear">Start again</button></div></div>';
  }
  function drinksPageHTML() {
    dkLoad();
    var mine = dkMine(), sum = dkSum(mine);
    var top = dkEditing ? dkFormHTML(false)
      : '<div class="dr-mine"><span class="label">Your usual</span><p class="dr-what">' + (sum ? esc(sum) : dkList ? 'Not set yet.' : 'Loading...') + '</p>' +
        '<button type="button" class="btn' + (sum ? '' : ' dark') + '" data-p="dk-edit">' + (sum ? 'Change it' : 'Set my usual') + '</button></div>';
    var team = !dkList ? (dkErr ? '<p class="p-err">Could not load the team\'s drinks. Check the connection.</p><div class="btn-row"><button type="button" class="btn" data-p="dk-retry">Try again</button></div>' : '<p class="hint">Loading...</p>')
      : (people().length > 12 ? '<div class="field"><label class="label" for="dk-q">Find a name</label><input id="dk-q" class="search" data-k="dk-q" type="search" autocomplete="off" value="' + esc(dkQ) + '"></div>' : '') + dkTeamHTML() + dkRunHTML();
    return '<section class="p-card dr-page"><h2 class="p-h" id="rtitle" tabindex="-1">Drinks run</h2>' +
      '<p class="hint">Everyone\'s usual coffee or drink. Going for a run? Tap who is in, then share the order.</p>' + top + '</section>' +
      '<section class="p-card dr-runbox"><h3 class="ml-h3">Who is in</h3>' + team + '</section>';
  }

  /* ---------- events ---------- */
  function onClick(e) {
    var el = e.target.closest('[data-p]');
    if (!el || !S.root || !S.root.contains(el)) return;
    var a = el.getAttribute('data-p'), id = el.getAttribute('data-id'), i = +el.getAttribute('data-i'), dt = el.getAttribute('data-d');
    if (guest() && GUEST_WRITES[a]) { e.preventDefault(); guestAsk({ sel: guestSel(el) }); return; }
    if (a.indexOf('lv-') === 0) { lvClick(a, el); return; }
    if (a.indexOf('dk-') === 0) { dkClick(a, el); return; }
    if (a === 'ml-cat') { mlf.cat = el.getAttribute('data-v'); mlMsg = ''; draw(); return; }
    if (a === 'ml-pri') { mlf.pri = el.getAttribute('data-v'); draw(); return; }
    if (a === 'ml-send') { mlSend(); return; }
    if (a === 'ml-tick') { mlTick(id); return; }
    if (a === 'ml-donebox') { S.mlDoneOpen = !el.parentNode.open; return; }
    if (a === 'ml-goadmin') { S.atab = 'mail'; lsSet('lk.prep.atab', 'mail'); return; }
    if (a === 'recipe-toggle') { S.recipeOpen = !S.recipeOpen; if (!S.recipeOpen) { S.recipeSearch = ''; S.recipeAll = false; } draw(); if (S.recipeOpen) { var rse = S.root.querySelector('#p-rs'); if (rse) rse.focus({ preventScroll: true }); } return; }
    if (a === 'recipe-close') { S.recipeOpen = false; S.recipeSearch = ''; S.recipeAll = false; draw(); focusSel('.p-pickbtn'); return; }
    if (a === 'recipe-all') { S.recipeAll = true; draw(); var rse2 = S.root.querySelector('#p-rs'); if (rse2) rse2.focus({ preventScroll: true }); return; }
    if (a === 'pin-go') { submitKitchenPin(); return; }
    // head chef only (admin Tools tab): this device forgets the kitchen PIN and goes to the PIN screen of the prep book
    if (a === 'pin-forget') { if (!arm('pin-forget')) return; S.pin = ''; lsSet('lk.prep.pin', ''); S.config = null; S.configState = 'idle'; stopLive(); gForget(); if (location.hash === '#/admin') { location.hash = '#/prep'; return; } draw(); return; }
    if (a === 'retry') { cfgKey = ''; connect(); return; }
    if (a === 'notes-open') { if (canPing()) { S.notesOpen = true; S.nf = null; S.nOpen = false; S.nMsg = ''; loadNotes(); draw(); window.scrollTo(0, 0); } return; }
    if (a === 'notes-close') { S.notesOpen = false; draw(); return; }
    if (a === 'n-new') { S.nf = nfNew(); S.nfSnap = JSON.stringify(S.nf); S.nOpen = true; S.nMsg = ''; draw(); var ntx = S.root.querySelector('[data-k="n-text"]'); if (ntx) { focusNoteText(ntx); } return; }
    if (a === 'n-tag') {
      var tg = el.getAttribute('data-v'), ft = S.nf, old = NOTE_START[ft.tag] || '', cur = ft.text.replace(/^\s+/, '');
      if (!cur || (old && cur === old) || (old && cur.indexOf(old) === 0 && cur.length === old.length)) ft.text = NOTE_START[tg] || '';
      ft.tag = tg; draw(); var tx2 = S.root.querySelector('[data-k="n-text"]'); if (tx2) { tx2.focus(); tx2.setSelectionRange(tx2.value.length, tx2.value.length); } return;
    }
    if (a === 'n-dow') { var dv = +el.getAttribute('data-v'), dx = S.nf.dows.indexOf(dv); if (dx >= 0) S.nf.dows.splice(dx, 1); else S.nf.dows.push(dv); draw(); return; }
    if (a === 'n-dowclr') { S.nf.dows = []; draw(); return; }
    if (a === 'n-quick') { S.nf.start = shift(dayNow(), +el.getAttribute('data-v')); S.nf.until = ''; S.nf.run = false; S.nf.dows = []; draw(); return; }
    if (a === 'n-mode') { var nm = el.getAttribute('data-v'); S.nf.run = nm === 'run'; if (nm === 'one') S.nf.until = ''; draw(); return; }
    if (a === 'n-reset') { S.nf.start = dayNow(); S.nf.until = ''; S.nf.run = false; S.nf.dows = []; draw(); return; }
    if (a === 'n-day') {
      var dd = el.getAttribute('data-v'), nf = S.nf;
      if (!nf.run && !nf.until) { nf.start = dd; }
      else if (!nf.until) { if (dd > nf.start) nf.until = dd; else if (dd < nf.start) nf.start = dd; }
      else if (dd === nf.until) { nf.until = ''; }
      else if (dd === nf.start) { nf.start = shift(nf.start, 1); if (nf.start >= nf.until) { nf.start = nf.until; nf.until = ''; } }
      else if (dd > nf.start) { nf.until = dd; }
      else { nf.start = dd; }
      draw(); return;
    }
    if (a === 'n-save') { saveNote(); return; }
    if (a === 'n-cancel') { if (nfDirty() && !arm('n-cancel')) return; S.nf = nfNew(); S.nOpen = false; S.nMsg = ''; draw(); return; }
    if (a === 'n-edit') { var nn = (S.notes || []).filter(function (x) { return x.id === id; })[0]; if (nn) { S.nf = nfFrom(nn); S.nfSnap = JSON.stringify(S.nf); S.nOpen = true; S.nMsg = ''; draw(); var tx = S.root.querySelector('[data-k="n-text"]'); if (tx) { focusNoteText(tx); } } return; }
    if (a === 'n-reuse') { reuseNote(id); return; }
    if (a === 'n-past-more') { loadPastNotes(true); return; }
    if (a === 'n-past') { S.nPastOpen = !S.nPastOpen; if (S.nPastOpen && !Array.isArray(S.nPast)) loadPastNotes(); else draw(); return; }
    if (a === 'n-seen') { loadSeen(id); return; }
    if (a === 'n-del') { removeNote(id); return; }
    if (a === 'n-preview') {
      var pf = S.nf, pd = pf && pf.text.replace(/\s+/g, '') ? nfDraft(pf) : null;
      if (pd) noteOpen({ list: [pd], label: noteWhen(pd) + (pd.start > dayNow() ? ' (not saved yet)' : ' (not saved)') });
      else if (todaysNotes().length) noteOpen(); else toast('Write a ping first, or no ping is set for today yet.');
      return;
    }
    if (a === 'mn-open') { if (isSous()) { S.minOpen = true; S.mMsg = ''; S.mf = null; loadMinutes(true); draw(); window.scrollTo(0, 0); } return; }
    if (a === 'mn-close') { S.minOpen = false; S.mf = null; draw(); return; }
    if (a === 'mn-admin') { S.atab = 'minutes'; lsSet('lk.prep.atab', 'minutes'); location.hash = '#/admin'; return; }
    if (a === 'mn-sous') { S.minOpen = true; S.mf = null; location.hash = '#/prep'; return; }
    if (a === 'mn-pickdoc') { S.mSel = id; S.mpin = ''; S.mpinOk = false; S.mErr = ''; draw(); window.scrollTo(0, 0); return; }
    if (a === 'mn-sign') { signMinutes(id); return; }
    if (a === 'mn-print') { printMinutes(); return; }
    if (a === 'mn-csv') { csvMinutes(id); return; }
    if (a === 'mn-refresh') { loadMinutes(true); loadSigns(S.mSel || (mnPub()[0] || {}).id, true); draw(); return; }
    if (a === 'mn-sel') { S.mSel = id; loadSigns(id, true); draw(); return; }
    if (/^mn-(new|draft-open|edit|draft|pub|remove)$/.test(a) && !mnCanWrite()) return;
    if (a === 'mn-new') { S.mf = mfNew(); S.mfSnap = mfSnap(S.mf); S.mMsg = ''; draw(); var mfe = S.root.querySelector('.mn-form'); if (mfe) mfe.scrollIntoView({ block: 'start' }); return; }
    if (a === 'mn-draft-open' || a === 'mn-edit') { var mm = mnById(id); if (mm) { S.mf = mfFrom(mm); S.mfSnap = mfSnap(S.mf); S.mMsg = ''; draw(); var mfe2 = S.root.querySelector('.mn-form'); if (mfe2) mfe2.scrollIntoView({ block: 'start' }); } return; }
    if (a === 'mn-cancel') { if (mfDirty() && !arm('mn-cancel')) return; S.mf = null; S.mMsg = ''; draw(); return; }
    if (a === 'mn-prev') { if (S.mf) { S.mf.prev = !S.mf.prev; draw(); } return; }
    if (a === 'mn-attopen') { S.mAttOpen = !S.mAttOpen; draw(); return; }
    if (a === 'mn-attc') { if (S.mf) { var cur = S.mf.att[id]; S.mf.att[id] = cur === 'present' ? 'apology' : cur === 'apology' ? 'absent' : 'present'; draw(); } return; }
    if (a === 'mn-regall') { S.mRegAll = !S.mRegAll; draw(); return; }
    if (a === 'mn-all') { if (S.mf) { people().forEach(function (p) { S.mf.att[p.id] = 'present'; }); draw(); } return; }
    if (a === 'mn-ast') { if (S.mf && S.mf.acts[i]) { S.mf.acts[i].st = el.getAttribute('data-v'); draw(); } return; }
    if (a === 'mn-aadd') { if (S.mf) { S.mf.acts.push({ what: '', who: '', by: '', st: 'open' }); draw(); var mw = S.root.querySelector('[data-k="mn-aw"][data-i="' + (S.mf.acts.length - 1) + '"]'); if (mw) mw.focus(); } return; }
    if (a === 'mn-arem') { if (S.mf) { S.mf.acts.splice(i, 1); draw(); } return; }
    if (a === 'mn-draft') { saveMinutes(false); return; }
    if (a === 'mn-pub') { saveMinutes(true); return; }
    if (a === 'mn-remove') { removeMinutes(id); return; }
    if (a === 'g-cat') { S.gcat = el.getAttribute('data-v') || 'all'; draw(); return; }
    if (a === 'g-clear') { S.gq = ''; draw(); focusK('g-q'); return; }
    if (a === 'g-zoom') { var gzg = gById(S.gSel); if (gzg) gzOpen(gzg.id, i); return; }
    if (a === 'g-retry') { var grg = gById(S.gSel); if (grg) { delete gPg[grg.id + ':' + (grg.v || 1)]; draw(); } return; }
    if (a === 'g-print') { printGuide(); return; }
    if (a === 'g-admin') { S.atab = 'guides'; lsSet('lk.prep.atab', 'guides'); location.hash = '#/admin'; return; }
    if (a === 'g-change') { var gcg = gById(id); if (gcg) { S.gf = gfFrom(gcg); S.gfSnap = gfSnap(S.gf); S.atab = 'guides'; lsSet('lk.prep.atab', 'guides'); location.hash = '#/admin'; } return; }
    if (/^g-(new|edit|del|save|cancel|fcat|pup|prm)$/.test(a) && S.level !== 'owner') return;
    if (a === 'g-new') { gOpenEditor(gfNew()); return; }
    if (a === 'g-edit') { var geg = gById(id); if (geg) gOpenEditor(gfFrom(geg)); return; }
    if (a === 'g-del') { removeGuide(id); return; }
    if (a === 'g-save') { saveGuide(); return; }
    if (a === 'g-cancel') { if (gfDirty() && !arm('g-cancel')) return; S.gf = null; S.gfSnap = ''; draw(); return; }
    if (a === 'g-fcat') { if (S.gf) { S.gf.cat = el.getAttribute('data-v'); S.gf.msg = ''; draw(); } return; }
    if (a === 'g-pup') { var gp = S.gf && S.gf.pages; if (gp && i > 0 && gp[i]) { gp.splice(i - 1, 0, gp.splice(i, 1)[0]); draw(); } return; }
    if (a === 'g-prm') { var gp2 = S.gf && S.gf.pages; if (gp2 && gp2[i]) { gp2.splice(i, 1); S.gf.msg = ''; draw(); } return; }
    if (a === 'otick') { tickOrderLine(el.getAttribute('data-d'), id, el.getAttribute('aria-pressed') !== 'true'); return; }
    if (a === 'odel') { removeOrderLine(el.getAttribute('data-d'), id); return; }
    if (a === 'orestore') { removeOrderLine(el.getAttribute('data-d'), id, true); return; }
    if (a === 'oremoved') { S.oShowRemoved = !S.oShowRemoved; draw(); return; }
    if (a === 'ogroup') { tickOrderGroup(el.getAttribute('data-k2')); return; }
    if (a === 'oview') { S.ordView = el.getAttribute('data-v'); if (S.ordView === 'all') loadOrdAll(false); draw(); return; }
    if (a === 'oday') { S.ordDate = shift(S.ordDate, +el.getAttribute('data-d')); watchOrders(); draw(); return; }
    if (a === 'otoday') { S.ordDate = dayNow(); watchOrders(); draw(); return; }
    if (a === 'osugg') { var st = (S.osugg || [])[i]; if (st) { S.otext = st; if (!S.oqty.trim()) S.oqty = (ordQtyList(st)[0] || {}).q || ''; draw(); var oe = S.root.querySelector('[data-k="o-text"]'); if (oe) { oe.focus(); try { oe.setSelectionRange(oe.value.length, oe.value.length); } catch (x) {} } } return; }
    if (a === 'who') { pickName(id); return; }
    if (a === 'who-change') { S.picking = shared(); S.pending = null; leave(); return; }
    if (a === 'guest-who') { guestAsk(null); return; }
    if (a === 'who-back') { S.picking = false; S.pending = null; leave(); return; }
    if (a === 'day') { S.date = shift(S.date, +el.getAttribute('data-d')); S.tab = ''; watchItems(); draw(); return; }
    if (a === 'today') { S.date = dayNow(); S.tab = ''; watchItems(); draw(); return; }
    if (a === 'tab') { S.tab = el.getAttribute('data-v') || ''; draw(); return; }
    if (a === 'tick') { tick(dt || S.date, id); return; }
    if (a === 'del') { removeItem(dt || S.date, id, false); return; }
    if (a === 'restore') { removeItem(dt || S.date, id, true); return; }
    if (a === 'removed') { S.showRemoved = !S.showRemoved; draw(); return; }
    if (a === 'urgent') { toggleUrgent(id); return; }
    if (a === 'toast-old') { var to = S.toastOld; S.toastOld = null; clearTimeout(toastOldTimer); if (to && to.act && to.act.fn) to.act.fn(); draw(); return; }
    if (a === 'toast-act') { var ta = S.toastAct; S.toast = ''; S.toastAct = null; if (ta && ta.fn) ta.fn(); draw(); return; }
    if (a === 'export') { exportAll(); return; }
    if (a === 'move-pin') { movePin(); return; }
    if (a === 'sugg') { pickSugg(i); return; }
    if (a === 'quick') { quickAdd(i); return; }
    if (a === 'heat') { S.heat = el.getAttribute('data-v'); draw(); return; }
    if (a === 'calm') { S.calM = el.getAttribute('data-v'); draw(); return; }
    if (a === 'jump') { var tg = document.getElementById(el.getAttribute('data-v')); if (tg) tg.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (a === 'print-tab') { printTab(); return; }
    if (a === 'csv') { exportCSV(el.getAttribute('data-v')); return; }
    if (a === 'hrm') { S.hrM = el.getAttribute('data-v'); draw(); return; }
    if (a === 'af-reset') { S.af = { sec: '', who: '', dow: '', reason: '' }; afSave(); draw(); return; }
    if (a === 'cal-day') { S.date = el.getAttribute('data-d'); S.tab = ''; watchItems(); location.hash = '#/prep'; return; }
    if (a === 'close-hide') { lsSet('lk.closeout', dayNow()); draw(); return; }
    if (a === 'oreg') { var orr = (S.oregs || [])[i]; if (orr) { S.otext = orr.text; S.oqty = orr.q || ''; addOrder(true); } return; }
    // Last 7 days always counts today from the live list, whatever day was being browsed; the past days come from the day cache
    if (a === 'wview') { S.wView = el.getAttribute('data-v'); if (S.wView === 'week') { if (S.wDate !== dayNow()) { S.wDate = dayNow(); watchWaste(); } loadWRecent(false); } draw(); return; }
    if (a === 'wunit') { S.wf.unit = el.getAttribute('data-v'); draw(); return; }
    if (a === 'wreason') { S.wf.reason = el.getAttribute('data-v'); var fromSheet = S.sheet === 'reason'; S.sheet = ''; draw(); if (fromSheet) { var rb = S.root.querySelector('.w-rbtn'); if (rb) rb.focus(); } return; }
    if (a === 'sheet') { S.sheet = el.getAttribute('data-v'); draw(); var so = S.root.querySelector('.sheet-o[aria-checked="true"]') || S.root.querySelector('.sheet-o'); if (so) so.focus(); return; }
    if (a === 'sheet-close') { S.sheet = ''; draw(); var rb2 = S.root.querySelector('.w-rbtn'); if (rb2) rb2.focus(); return; }
    if (a === 'wsugg') { var wt = (S.wsugg || [])[i]; if (wt) { S.wf.text = wt; var wl = wLast(wt); if (wl) { if (wl.unit) S.wf.unit = wl.unit; if (wl.reason && !S.wf.reason) S.wf.reason = wl.reason; if (wl.station && !S.wf.sec) S.wf.sec = wl.station; } draw(); var wa = S.root.querySelector('[data-k="w-amt"]'); if (wa) wa.focus(); } return; }
    if (a === 'woften') { var wo = wOften()[i]; if (wo) { S.wf.text = wo.text; if (wo.unit) S.wf.unit = wo.unit; if (wo.reason) S.wf.reason = wo.reason; if (wo.sec && !S.wf.sec) S.wf.sec = wo.sec; draw(); var wa2 = S.root.querySelector('[data-k="w-amt"]'); if (wa2) wa2.focus(); } return; }
    if (a === 'wdel') { removeWaste(dt, id); return; }
    if (a === 'wrestore') { removeWaste(dt, id, true); return; }
    if (a === 'wday') { S.wDate = shift(S.wDate, +el.getAttribute('data-d')); watchWaste(); draw(); return; }
    if (a === 'wtoday') { S.wDate = dayNow(); watchWaste(); draw(); return; }
    if (a === 'wreview') { saveReview(); return; }
    if (a === 'w-refresh') { loadWStats(true); loadStats(true); draw(); return; }
    if (a === 'miss-hide') { sset(docRef('misses', id), { hidden: true, q: ((S.misses || []).filter(function (x) { return x.id === id; })[0] || {}).q || id }, true).then(function () { loadMisses(true); }, failed); return; }
    if (a === 'onudge-hide') { lsSet('lk.ord.nudge', dayNow()); draw(); return; }
    if (a === 'onudge-show') { var od = document.getElementById('o-overdue'); if (od) { od.scrollIntoView({ block: 'start' }); var ob = od.querySelector('.nb-box'); if (ob) ob.focus({ preventScroll: true }); } return; }
    if (a === 'oqset') { S.oqty = el.getAttribute('data-v') || ''; draw(); var to = S.root.querySelector('[data-k="o-text"]'); if (to) to.focus(); return; }
    // "Add 5 L": the usual amount goes in and the line is added in the same tap
    if (a === 'qset') { S.qty = el.getAttribute('data-v') || ''; if (S.text.trim()) addTyped(); else { draw(); var tq = S.root.querySelector('[data-k="p-text"]'); if (tq) tq.focus(); } return; }
    if (a === 'goto') { gotoRow(id); return; }
    if (a === 'start-toggle') { e.preventDefault(); S.startOpen = !S.startOpen; draw(); return; }
    if (a === 'donejump') { var dj = S.root.querySelector('#nb-donebox'); if (dj) dj.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
    if (a === 'write') { var wt = S.root.querySelector('[data-k="p-text"]'); if (wt) { wt.scrollIntoView({ block: 'center', behavior: 'smooth' }); wt.focus({ preventScroll: true }); } return; }
    if (a === 'learn-hide') { hideLearned(id, el.getAttribute('data-hide') === '1'); return; }
    if (a === 'copy') { copyList(); return; }
    if (a === 'print') { printWith('print-list'); return; }
    if (a === 'ocopy') { shareText(ordText()); return; }
    if (a === 'oprint') { printWith('print-orders'); return; }
    if (a === 'a-tab') { S.atab = el.getAttribute('data-t'); lsSet('lk.prep.atab', S.atab); draw(); window.scrollTo(0, 0); return; }
    if (a === 'staff-open') { if (isSous()) { startDraft(); S.staffOpen = true; draw(); } return; }
    if (a === 'staff-close') { if (draftDirty() && !arm('staff-close')) return; S.staffOpen = false; S.draft = null; draw(); return; }
    if (a === 'add-recipe') { addRecipe(id); return; }
    if (a === 'signin') { signIn(); return; }
    if (a === 'signout') { signOut(); draw(); return; }
    if (a === 'sec-hide') { hideSection(id, el.getAttribute('data-hide') === '1'); return; }
    if (a === 'a-reset-pin') { resetPin(id); return; }
    if (a === 'range') { S.statsRange = +el.getAttribute('data-v'); draw(); return; }
    if (a === 'stats-refresh') { loadStats(true); draw(); return; }
    if (!S.draft) return;
    var d = S.draft;
    if (a === 'a-add-person') { lvReveal('people'); lvReveal('staff'); d.people.push({ id: slug('person') + '-' + Date.now().toString(36), name: '', role: 'staff', add: true, tick: true, del: false, active: true, isNew: true }); draw(); var n = S.root.querySelector('[data-k="a-n' + (d.people.length - 1) + '"]'); if (n) n.focus(); return; }
    if (a === 'a-bulk-add') {
      lvReveal('people'); lvReveal('staff');
      var lines = String(S.bulk || '').split(/\n/).map(function (s) { return s.trim(); }).filter(Boolean);
      S.bulk = '';
      lines.forEach(function (nm, k) { d.people.push({ id: slug(nm) + '-' + Date.now().toString(36) + k, name: nm, role: 'staff', add: true, tick: true, del: false, active: true }); });
      draw(); return;
    }
    if (a === 'a-remove-person') {
      var rp = d.people[i];
      if (isHeadP(rp) && S.level !== 'owner') return;   // only the head chef's Google account takes the head chef off the list
      // a row just added and still blank goes in one tap; anyone else needs a second tap
      if (!rp || (!(rp.isNew && !String(rp.name).trim()) && !arm('rm:' + rp.id))) return;
      d.people.splice(i, 1); draw(); return;
    }
    if (a === 'a-save') { adminSave(); return; }
    if (a === 'a-ids-keep') { idDecide(true); return; }
    if (a === 'a-ids-undo') { idDecide(false); return; }
    if (a === 'a-reset') { startDraft(); draw(); return; }
  }
  function onInput(e) {
    var el = e.target, k = el.getAttribute && el.getAttribute('data-k');
    if (!S.root || !S.root.contains(el)) return;
    if (k && k.indexOf('lv-q:') === 0) { var lk = k.slice(5), lc = LVR[lk]; if (lc) { var ls0 = lvState(lc); ls0.q = el.value; ls0.shown = lc.step || 15; lvRefresh(lk); } return; }
    // a PIN goes in by itself the moment the fourth digit is typed (only when it reaches four, so it cannot send twice)
    if (k === 'p-pin') { var pp = S.pinInput.length; S.pinInput = el.value.replace(/\D/g, '').slice(0, 4); el.value = S.pinInput; pinCells(el); if (pp < 4 && S.pinInput.length === 4) submitKitchenPin(); return; }
    if (k === 'a-bulk') { S.bulk = el.value; return; }
    if (k === 'dk-note' || k === 'dk-other') { dkf[k.slice(3)] = el.value.slice(0, k === 'dk-note' ? DK_NOTE : DK_OTHER); return; }
    if (k === 'dk-q') { dkQ = el.value; var dkl = S.root.querySelector('.dr-team'); if (dkl) dkl.outerHTML = dkTeamHTML(); return; }
    if (k === 'ml-text') { mlf.text = el.value.slice(0, ML_MAX); mlMsg = ''; var mll = S.root.querySelector('#ml-left'), mln = ML_MAX - mlf.text.length; if (mll) mll.textContent = mln < 100 ? mln + ' characters left' : ''; return; }
    if (k === 'a-newpin') { S.newPin = el.value.replace(/\D/g, '').slice(0, 4); el.value = S.newPin; return; }
    if (k === 'mn-pin') {
      S.mpin = el.value.replace(/\D/g, '').slice(0, 4); el.value = S.mpin; pinCells(el); S.mpinOk = false; S.mErr = '';
      var sb = S.root.querySelector('.mn-signbtn'), pm = S.root.querySelector('#mn-pinmsg');
      if (sb) sb.disabled = true; if (pm) pm.textContent = '';
      if (S.mpin.length === 4) {
        var pv = S.mpin;
        sha('lk:' + S.who + ':' + pv).then(function (h) {
          if (S.mpin !== pv) return;
          S.mpinOk = h === S.tok; S.mErr = S.mpinOk ? '' : 'That PIN is not right.';
          var b2 = S.root && S.root.querySelector('.mn-signbtn'), m2 = S.root && S.root.querySelector('#mn-pinmsg');
          if (b2) b2.disabled = !S.mpinOk || S.mSigning; if (m2) m2.textContent = S.mErr;
        });
      }
      return;
    }
    if (k && k.indexOf('mn-') === 0) { mfSet(k, el); return; }
    if (k === 'pf1') {
      var p1 = S.pf1.length; S.pf1 = el.value.replace(/\D/g, '').slice(0, 4); el.value = S.pf1; pinCells(el);
      if (p1 < 4 && S.pf1.length === 4) {
        if (S.pinStep === 'enter') submitPin();
        else { var n2 = S.root.querySelector('[data-k="pf2"]'); if (n2) n2.focus(); }
      }
      return;
    }
    if (k === 'pf2') { var p2 = S.pf2.length; S.pf2 = el.value.replace(/\D/g, '').slice(0, 4); el.value = S.pf2; pinCells(el); if (p2 < 4 && S.pf2.length === 4 && /^\d{4}$/.test(S.pf1)) submitPin(); return; }
    if (k === 'p-text') { S.text = el.value; var hn = S.root.querySelector('#p-hint'); if (hn) hn.textContent = hintText(S.text); var sg = S.root.querySelector('#p-sugg'); if (sg) sg.innerHTML = suggestHTML(); var qs = S.root.querySelector('#p-qsugg'); if (qs) qs.innerHTML = qtyChipsHTML(); return; }
    if (k === 'o-text') { S.otext = el.value; var og = S.root.querySelector('#o-sugg'); if (og) og.innerHTML = ordSuggHTML(); var oh = S.root.querySelector('#o-hint'); if (oh) oh.textContent = oHintText(S.otext); return; }
    if (k === 'o-qty') { S.oqty = el.value; return; }
    if (k === 'g-q') { S.gq = el.value; var gl = S.root.querySelector('#g-list'); if (gl) gl.innerHTML = gListHTML(); return; }
    if (k === 'g-title' || k === 'g-sum' || k === 'g-steps' || k === 'g-kw') {
      if (!S.gf) return;
      S.gf[k.slice(2)] = el.value;
      var gln = S.root.querySelector('#g-links'); if (gln) gln.textContent = gLinksText(S.gf);
      return;
    }
    if (k === 'n-text') { if (S.nf) S.nf.text = el.value; var nc = S.root.querySelector('#n-count'); if (nc) nc.textContent = el.value.length + ' of 400. Ctrl+Enter saves.'; var npv = S.root.querySelector('#n-prev'); if (npv && S.nf) npv.innerHTML = draftPreviewHTML(S.nf); return; }
    if (k === 'w-text') { S.wf.text = el.value; var wg = S.root.querySelector('#w-sugg'); if (wg) wg.innerHTML = wSuggHTML(); return; }
    if (k === 'w-amt') { S.wf.amt = el.value.replace(/[^0-9.,]/g, ''); if (el.value !== S.wf.amt) el.value = S.wf.amt; return; }
    if (k === 'w-sec') { S.wf.sec = el.value; return; }
    if (k === 'w-act') { S.wf.act = el.value; return; }
    if (k === 'w-ra') { S.wrA = el.value; return; }
    if (k === 'w-rc') { S.wrC = el.value; return; }
    if (k === 'p-qty') { S.qty = el.value; var qs2 = S.root.querySelector('#p-qsugg'); if (qs2) qs2.innerHTML = qtyChipsHTML(); return; }
    if (k === 'p-section') { S.section = el.value; S.secTyped = !!el.value.trim(); return; }
    if (k === 'p-rs') { S.recipeSearch = el.value; S.recipeOpen = true; draw(); return; }
    var a = el.getAttribute && el.getAttribute('data-a');
    if (!a || !S.draft) return;
    var i = +el.getAttribute('data-i'), d = S.draft;
    if (a === 'name') d.people[i].name = el.value;
  }
  function onChange(e) {
    var el = e.target, k = el.getAttribute && el.getAttribute('data-k');
    if (!S.root || !S.root.contains(el)) return;
    if (k && k.indexOf('lv-s:') === 0) { var sk = k.slice(5), sc = LVR[sk]; if (sc) { var ss = lvState(sc); ss.sort = el.value; ss.shown = sc.step || 15; lvRefresh(sk); } return; }
    if (k && k.indexOf('ml-pri:') === 0) { mlSetPri(k.slice(7), el.value); return; }
    if (k === 'g-file') { var gfl = el.files; gReadFiles(gfl); try { el.value = ''; } catch (x) {} return; }
    if (k === 'mn-older') { S.mSel = el.value; loadSigns(el.value, true); draw(); return; }
    if (k && k.indexOf('mn-') === 0 && k !== 'mn-pin') { mfSet(k, el); return; }
    if (k === 'p-day') { if (el.value) { S.date = el.value; S.tab = ''; watchItems(); draw(); } return; }
    if (k === 'n-start') { if (S.nf && el.value) { S.nf.start = el.value; if (S.nf.until && S.nf.until < el.value) S.nf.until = ''; draw(); } return; }
    if (k === 'n-until') { if (S.nf) { S.nf.until = el.value; S.nf.run = !!el.value; draw(); } return; }
    if (k === 'p-section' || k === 'w-sec') { checkSectionBox(el, k); return; }
    if (k === 'af-sec' || k === 'af-who' || k === 'af-dow' || k === 'af-reason') { AF()[k.slice(3)] = el.value; afSave(); draw(); return; }
    var a = el.getAttribute && el.getAttribute('data-a');
    if (!a || !S.draft) return;
    if (a === 'badges') { S.draft.showBadges = el.checked; return; }
    if (a === 'staffsee') { S.draft.staffSee[el.getAttribute('data-f')] = el.checked; return; }
    var i = +el.getAttribute('data-i'), p = S.draft.people[i];
    if (a === 'role') {
      if (el.value === 'head' && S.level !== 'owner') { el.value = p.role; return; }
      if (el.value === 'head') S.draft.people.forEach(function (q) { if (q !== p && q.role === 'head') q.role = 'sous'; });   // one head chef
      p.role = el.value; var r = ROLES[el.value]; p.add = r.add; p.tick = r.tick; p.del = r.del; p.ping = r.ping; draw();
    }
    else if (a === 'perm') { p[el.getAttribute('data-perm')] = el.checked; }
    else if (a === 'active') { p.active = el.checked; draw(); }
  }
  function onSubmit(e) {
    var f = e.target.getAttribute && e.target.getAttribute('data-p-form');
    if (guest() && (f === 'add' || f === 'oadd' || f === 'wadd')) { e.preventDefault(); if (f !== 'add' || S.text.trim()) guestAsk({ form: f }); return; }
    if (f === 'add') { e.preventDefault(); if (!S.text.trim()) { var pt = S.root.querySelector('[data-k="p-text"]'); if (pt) pt.focus(); return; } addTyped(); }
    else if (f === 'oadd') { e.preventDefault(); addOrder(); }
    else if (f === 'wadd') { e.preventDefault(); addWaste(); }
    else if (f === 'pin') { e.preventDefault(); submitPin(); }
  }
  function onKey(e) {
    if (e.key === 'Escape' && S.sheet) { S.sheet = ''; draw(); focusSel('.w-rbtn'); return; }
    // Next on "What was wasted?" goes to the next empty box instead of sending the form half filled
    if (e.key === 'Enter' && e.target && e.target.getAttribute && e.target.getAttribute('data-k') === 'w-text' && S.wf.text.trim()) {
      if (!String(S.wf.amt).trim()) { e.preventDefault(); focusK('w-amt'); return; }
    }
    if (e.key === 'Tab' && S.sheet) {
      var sh = S.root.querySelector('.sheet'), fs = sh ? Array.prototype.slice.call(sh.querySelectorAll('button')) : [];
      if (fs.length) {
        var first = fs[0], last = fs[fs.length - 1];
        if (e.shiftKey && (document.activeElement === first || !sh.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || !sh.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
      }
      return;
    }
    if (e.key === 'Escape' && S.recipeOpen) { S.recipeOpen = false; S.recipeSearch = ''; S.recipeAll = false; draw(); focusSel('.p-pickbtn'); return; }
    if (e.key === 'Enter' && e.target.getAttribute && e.target.getAttribute('data-k') === 'mn-pin') { e.preventDefault(); var sgb = S.root.querySelector('.mn-signbtn'); if (sgb && !sgb.disabled) sgb.click(); return; }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.getAttribute && e.target.getAttribute('data-k') === 'n-text') { e.preventDefault(); saveNote(); return; }
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

  /* ---------- kitchen mail ----------
     Anyone signed in writes to the head chef from the chef mark in the top bar (#/mail): what it is about, how soon it
     matters and a short message. Only the head chef reads mail (the rules: the head chef's Google account), in the admin
     panel's Mail tab, as a tick-off list. mail/<id> holds the message; mailstat/<id> holds only seen and done, so the
     sender's phone can show what happened to it without being able to read anyone's mail. The phone keeps its own copy
     of what was sent from it (lk.mail.sent), shown only to the person who sent it.
     On the head chef's device the open mail is read with one small query when the book opens and again only after
     30 minutes away (no listener, no polling). It drives the count on the Admin key and the "Mail waiting" popup:
     open mail, the Mail tab not opened for 10 hours, between 10:00 and 22:00 kitchen time. "Later" holds it off 10 hours. */
  var ML_CATS = [['safety', 'Food safety'], ['equipment', 'Equipment'], ['stock', 'Stock or supplier'], ['recipe', 'Recipe or card'], ['roster', 'Roster request put in'], ['idea', 'Idea'], ['other', 'Other']];
  var ML_PRI = [['today', 'Today'], ['week', 'This week'], ['any', 'Whenever']];
  var ML_MAX = 600, ML_STALE = 30 * 60000, ML_NUDGE = 10 * 3600000, ML_DONE_DAYS = 30, ML_KEEP = 60 * 86400000, ML_SENT_MAX = 40;
  var mlf = { cat: '', pri: 'week', text: '' }, mlMsg = '', mlBusy = false, mlStatAt = 0, mlStatBusy = false;
  var mlOpen = null, mlDone = null, mlAt = 0, mlBusyR = false, mlDoneAt = 0, mlOpened = +(lsGet('lk.mail.opened') || 0), mlOpenedW = 0, mlPop = null, mlPrev = null, mlLastN = -1;
  function mlCat(id) { var c = ML_CATS.filter(function (x) { return x[0] === id; })[0]; return c ? c[1] : 'Other'; }
  function mlPri(id) { var c = ML_PRI.filter(function (x) { return x[0] === id; })[0]; return c ? c[1] : 'Whenever'; }
  function mlWhen(ms) { return dayShort(T.day(ms)) + ', ' + clock(ms); }
  function mlRef(id) { return docRef('mail', id); }
  function mlStatRef(id) { return docRef('mailstat', id); }

  /* ---- what this phone sent ---- */
  function mlSentAll() { try { var l = JSON.parse(lsGet('lk.mail.sent') || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
  function mlSentSave(l) {
    var cut = now() - ML_KEEP;
    lsSet('lk.mail.sent', JSON.stringify(l.filter(function (x) { return x && (x.at || 0) >= cut; }).slice(0, ML_SENT_MAX)));
  }
  function mlSentPatch(id, patch) { mlSentSave(mlSentAll().map(function (x) { return x.id === id ? Object.assign(x, patch) : x; })); }
  function mlMine() { return mlSentAll().filter(function (x) { return x.w === S.who; }); }
  /* what happened to each mail this person sent: one small read each, at most every 30 minutes, none once it is done */
  function mlStatLoad(force) {
    if (!fb || !S.who || mlStatBusy || (!force && Date.now() - mlStatAt < ML_STALE)) return;
    var l = mlMine().filter(function (x) { return !x.d && !x.p; });
    mlStatAt = Date.now();
    if (!l.length) return;
    mlStatBusy = true;
    Promise.all(l.map(function (x) {
      return fb.fs.getDoc(mlStatRef(x.id)).then(function (sn) { if (sn.exists()) { var d = sn.data(); mlSentPatch(x.id, { s: !!d.seen, d: !!d.done }); } }, function () {});
    })).then(function () { mlStatBusy = false; draw(); });
  }
  function mlSend() {
    var t = mlf.text.replace(/^\s+|\s+$/g, ''), p = who();
    if (mlBusy || !fb || !p) return;
    if (!mlf.cat) { mlMsg = 'Pick what it is about first.'; draw(); return; }
    if (!t) { mlMsg = 'Write a few words first.'; draw(); focusK('ml-text'); return; }
    var ref = fb.fs.doc(colRef('mail')), id = ref.id, at = now(), cat = mlf.cat, pri = mlf.pri || 'week', text = t.slice(0, ML_MAX), w = S.who;
    var all = mlSentAll(); all.unshift({ id: id, w: w, cat: cat, pri: pri, text: text, at: at, p: 1 }); mlSentSave(all);
    mlf = { cat: '', pri: 'week', text: '' }; mlBusy = true; mlMsg = ''; draw();
    W([['set', ref, { from: w, cat: cat, pri: pri, text: text, at: at, done: false, seen: false }], ['set', mlStatRef(id), { seen: false, done: false }]]).then(function () {
      mlBusy = false; mlSentPatch(id, { p: 0 }); toast('Sent. Thanks for letting Chef know.');
    }, function (e) {
      mlBusy = false; mlSentSave(mlSentAll().filter(function (x) { return x.id !== id; }));
      failed(e, function () { mlf = { cat: cat, pri: pri, text: text }; });
      draw();
    });
  }
  function mlSentHTML() {
    var l = mlMine();
    if (!l.length) return '';
    return '<section class="p-card ml-sent"><h3 class="ml-h3">What you sent</h3><p class="hint">Seen means Chef has read it. Done means it has been dealt with. Kept on this phone for 60 days.</p><ul class="ml-sl">' + l.map(function (x) {
      var st = x.p ? ['wait', 'Sending'] : x.d ? ['done', 'Done'] : x.s ? ['seen', 'Seen'] : ['sent', 'Sent'];
      return '<li class="ml-si"><div class="ml-meta"><span class="ml-cat c-' + esc(x.cat) + '">' + esc(mlCat(x.cat)) + '</span><span class="ml-when">' + esc(mlWhen(x.at)) + '</span><span class="ml-st st-' + st[0] + '">' + st[1] + '</span></div><p class="ml-text">' + esc(x.text) + '</p></li>';
    }).join('') + '</ul></section>';
  }
  function mailPageHTML() {
    mlStatLoad();
    var left = ML_MAX - mlf.text.length;
    var cats = '<div class="chips ml-cats" role="group" aria-labelledby="ml-cl">' + ML_CATS.map(function (c) {
      return '<button type="button" class="chip ml-chip c-' + c[0] + '" data-p="ml-cat" data-v="' + c[0] + '" aria-pressed="' + (mlf.cat === c[0]) + '">' + esc(c[1]) + '</button>';
    }).join('') + '</div>';
    var pris = '<div class="ml-seg" role="group" aria-labelledby="ml-pl">' + ML_PRI.map(function (c) {
      return '<button type="button" class="ml-sb" data-p="ml-pri" data-v="' + c[0] + '" aria-pressed="' + (mlf.pri === c[0]) + '">' + esc(c[1]) + '</button>';
    }).join('') + '</div>';
    return '<section class="p-card ml-page"><h2 class="p-h" id="rtitle" tabindex="-1">Kitchen mail</h2>' +
      '<p class="hint">Anything Chef should know: broken equipment, stock, a recipe card that is wrong, or an idea. Only Chef reads it.</p>' +
      '<p class="ml-urgent"><b>Something urgent?</b> Please tell the chef on shift straight away, so it gets sorted quickly.</p>' +
      (admDev() ? '<p class="hint">Chef: the mail sent to you is in the <a href="#/admin" data-p="ml-goadmin">admin panel, Mail tab</a>.</p>' : '') +
      '<div class="field"><span class="label" id="ml-cl">What is it about?</span>' + cats + '</div>' +
      (mlf.cat === 'roster' ? '<p class="ml-roster" role="note">Roster and leave requests are made in Humanforce, ideally 2 weeks ahead, so the roster can be planned around you. Once yours is in, a quick note here lets Chef know to look for it. Thank you.</p>' : '') +
      '<div class="field"><span class="label" id="ml-pl">How soon does it matter?</span>' + pris + '</div>' +
      '<div class="field"><label class="label" for="ml-text">Message</label><textarea id="ml-text" class="ml-ta" data-k="ml-text" rows="4" maxlength="' + ML_MAX + '" placeholder="' + esc(mlf.cat === 'roster' ? 'For example: I put in a leave request for 3 to 7 November.' : 'Keep it short: what, where, since when.') + '">' + esc(mlf.text) + '</textarea>' +
      '<span class="hint ml-left" id="ml-left">' + (left < 100 ? left + ' characters left' : '') + '</span></div>' +
      (mlMsg ? '<p class="p-err" role="alert">' + esc(mlMsg) + '</p>' : '') +
      '<div class="btn-row"><button type="button" class="btn dark" data-p="ml-send"' + (mlBusy ? ' disabled' : '') + '>' + (mlBusy ? 'Sending...' : 'Send to Chef') + '</button></div></section>' + mlSentHTML();
  }

  /* ---- the head chef's side ---- */
  function mlOwner() { return S.level === 'owner' && !!fb && /^\d{4,6}$/.test(S.pin); }
  function mlInfo() { return { n: mlOwner() && mlOpen ? mlOpen.length : 0 }; }
  function mlTell() { var n = mlInfo().n; if (n !== mlLastN) { mlLastN = n; try { window.dispatchEvent(new Event('lk-mail')); } catch (e) {} } }
  function mlGrab(sn) { return sn.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }); }
  function loadMail(force) {
    if (!mlOwner() || mlBusyR || (!force && mlOpen && Date.now() - mlAt < ML_STALE)) return;
    mlBusyR = true;
    fb.fs.getDocs(fb.fs.query(colRef('mail'), fb.fs.where('done', '==', false))).then(function (sn) {
      mlOpen = mlGrab(sn); mlAt = Date.now(); mlBusyR = false;
      mlTell(); mlSeenAll(); mlMaybePop(); draw();
    }, function () {
      // no signal, or the mail rules are not published yet: try again in about 5 minutes
      mlBusyR = false; mlAt = Date.now() - ML_STALE + 5 * 60000; if (!mlOpen) mlOpen = [];
      mlTell(); draw();
    });
  }
  /* the ticked mail of the last 30 days, read once when the Mail tab opens */
  function loadMailDone(force) {
    if (!mlOwner() || (!force && mlDone && Date.now() - mlDoneAt < ML_STALE)) return;
    mlDoneAt = Date.now(); if (!mlDone) mlDone = [];
    fb.fs.getDocs(fb.fs.query(colRef('mail'), fb.fs.where('doneAt', '>=', now() - ML_DONE_DAYS * 86400000))).then(function (sn) {
      mlDone = mlGrab(sn).filter(function (x) { return x.done; }); draw();
    }, function () { mlDoneAt = 0; });
  }
  function mlOnTab() { return S.name === 'admin' && (S.atab || 'insights') === 'mail' && !!S.root && document.body.contains(S.root) && document.visibilityState !== 'hidden'; }
  /* the Mail tab is open: everything on it counts as seen, and the nudge clock starts again (saved with the head chef's
     account, config/admins, so reading mail on the laptop also stops the nudge on the phone) */
  function mlSeenAll() {
    if (!mlOnTab() || !mlOpen) return;
    var t = now();
    mlOpened = t; lsSet('lk.mail.opened', String(t)); mlPopClose();
    if (t - mlOpenedW > 10 * 60000) { mlOpenedW = t; sset(docRef('config', 'admins'), { mailOpened: t }, true).catch(function () { mlOpenedW = 0; }); }
    var l = mlOpen.filter(function (x) { return !x.seen; });
    if (!l.length) return;
    var ops = [];
    l.forEach(function (x) { x.seen = true; x.seenAt = t; ops.push(['upd', mlRef(x.id), { seen: true, seenAt: t }], ['upd', mlStatRef(x.id), { seen: true, done: !!x.done }]); });
    W(ops).catch(function () { l.forEach(function (x) { x.seen = false; }); });
  }
  function mlSeenSoon() { setTimeout(mlSeenAll, 0); return ''; }
  function mlRank(x) { return (x.cat === 'safety' ? 0 : 3) + { today: 0, week: 1, any: 2 }[x.pri] * 1; }
  function mlUrgent(x) { return x.cat === 'safety' || x.pri === 'today'; }
  function mlRow(x) {
    var pri = '<select class="ml-psel" data-k="ml-pri:' + esc(x.id) + '" aria-label="How soon it matters">' + ML_PRI.map(function (c) { return '<option value="' + c[0] + '"' + (x.pri === c[0] ? ' selected' : '') + '>' + esc(c[1]) + '</option>'; }).join('') + '</select>';
    return '<li class="ml-row' + (x.done ? ' is-done' : '') + (!x.done && mlUrgent(x) ? ' is-hot' : '') + '">' +
      '<button type="button" class="ml-tick" data-p="ml-tick" data-id="' + esc(x.id) + '" aria-pressed="' + !!x.done + '" aria-label="' + esc((x.done ? 'Untick: ' : 'Tick off: ') + String(x.text || '').slice(0, 40)) + '">' + TICK + '</button>' +
      '<div class="ml-body"><div class="ml-meta"><span class="ml-cat c-' + esc(x.cat) + '">' + esc(mlCat(x.cat)) + '</span>' + (x.done ? '<span class="ml-when">' + esc(mlPri(x.pri)) + '</span>' : pri) +
      '<span class="ml-from"><b>' + esc(mnName(x.from)) + '</b> ' + esc(mlWhen(x.at)) + ' (' + esc(ago(x.at)) + ')</span></div>' +
      '<p class="ml-text">' + esc(x.text) + '</p>' + (x.done && x.doneAt ? '<span class="ml-when">Done ' + esc(mlWhen(x.doneAt)) + '</span>' : '') + '</div></li>';
  }
  function mlFind(x) { return x.text + ' ' + mnName(x.from) + ' ' + mlCat(x.cat) + ' ' + mlPri(x.pri); }
  function mlFilters() { return [['all', 'All']].concat(ML_CATS.map(function (c) { return [c[0], c[1], function (x) { return x.cat === c[0]; }]; })); }
  function mailAdminHTML() {
    loadMail(); loadMailDone();
    if (!mlOpen) return '<section class="set-block"><span class="label">Kitchen mail</span><p class="hint">Loading...</p></section>';
    var done = (mlDone || []).slice().sort(function (a, b) { return (b.doneAt || 0) - (a.doneAt || 0); });
    return '<section class="set-block ml-admin"><span class="label">Kitchen mail</span><span class="hint">What the team wrote to you, most urgent first: food safety, then Today, This week and Whenever, oldest first. Opening this list marks everything on it as seen, so the sender knows you have read it. Tick a line when it is dealt with.</span>' +
      lvHTML({ key: 'mail', items: mlOpen, step: 20, noun: ['open message', 'open messages'], ph: 'Search mail', find: mlFind, filters: mlFilters(),
        sorts: [['pri', 'Most urgent first', function (a, b) { return mlRank(a) - mlRank(b) || (a.at || 0) - (b.at || 0); }], ['new', 'Newest first', function (a, b) { return (b.at || 0) - (a.at || 0); }], ['old', 'Oldest first', function (a, b) { return (a.at || 0) - (b.at || 0); }]],
        card: mlRow, empty: 'No open mail. Everything is dealt with.' }) + mlSeenSoon() +
      '<details class="ml-donebox"' + (S.mlDoneOpen ? ' open' : '') + '><summary data-p="ml-donebox">Done in the last 30 days (' + done.length + ')</summary>' +
      lvHTML({ key: 'maildone', items: done, step: 15, noun: ['message', 'messages'], ph: 'Search done mail', find: mlFind, filters: mlFilters(), card: mlRow, empty: 'Nothing ticked off in the last 30 days.' }) + '</details></section>';
  }
  function mlTick(id) {
    var x = (mlOpen || []).concat(mlDone || []).filter(function (m) { return m.id === id; })[0];
    if (!x) return;
    var on = !x.done, t = now(), was = { done: x.done, doneAt: x.doneAt };
    x.done = on; x.doneAt = on ? t : 0;
    mlOpen = (mlOpen || []).filter(function (m) { return m.id !== id; }); mlDone = (mlDone || []).filter(function (m) { return m.id !== id; });
    (on ? mlDone : mlOpen).push(x);
    if (!on) lvReveal('mail');
    mlTell(); draw();
    W([['upd', mlRef(id), { done: on, doneAt: x.doneAt, seen: true, seenAt: x.seenAt || t }], ['upd', mlStatRef(id), { seen: true, done: on }]]).catch(function (e) {
      x.done = was.done; x.doneAt = was.doneAt;
      mlOpen = mlOpen.filter(function (m) { return m.id !== id; }); mlDone = mlDone.filter(function (m) { return m.id !== id; });
      (x.done ? mlDone : mlOpen).push(x); mlTell(); failed(e); draw();
    });
  }
  function mlSetPri(id, v) {
    var x = (mlOpen || []).filter(function (m) { return m.id === id; })[0];
    if (!x || x.pri === v || !ML_PRI.some(function (c) { return c[0] === v; })) return;
    var was = x.pri; x.pri = v; draw();
    supd(mlRef(id), { pri: v }).catch(function (e) { x.pri = was; failed(e); draw(); });
  }

  /* ---- the nudge: a popup on the head chef's device ---- */
  function mlNudgeDue() {
    if (!mlOwner() || !mlOpen || !mlOpen.length || mlOnTab()) return false;
    var h = T.hour(), t = now();
    if (h < 10 || h >= 22) return false;
    if (t - mlOpened < ML_NUDGE) return false;
    return t >= +(lsGet('lk.mail.later') || 0);
  }
  function mlMaybePop() {
    if (mlPop || npop || !mlNudgeDue() || document.visibilityState === 'hidden') return;
    var ae = document.activeElement;
    if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && ae.type !== 'button') return;
    var l = mlOpen.slice().sort(function (a, b) { return (a.at || 0) - (b.at || 0); }), hot = l.filter(mlUrgent).length;
    var old = Math.max(1, Math.round((now() - (l[0].at || now())) / 3600000));
    mlPrev = document.activeElement;
    var el = document.createElement('div');
    el.className = 'mlp-wrap';
    el.innerHTML = '<div class="mlp-bg" data-ml="later"></div><section class="mlp" role="dialog" aria-modal="true" aria-labelledby="mlp-h" tabindex="-1">' +
      '<span class="mlp-eb">Kitchen mail</span><h2 class="mlp-h" id="mlp-h">' + l.length + (l.length === 1 ? ' message waiting' : ' messages waiting') + '</h2>' +
      '<p class="mlp-p">The oldest is ' + old + ' h old' + (hot ? '. ' + hot + ' ' + (hot === 1 ? 'is' : 'are') + ' food safety or for today.' : '.') + '</p>' +
      '<footer class="mlp-foot"><button type="button" class="mlp-go" data-ml="open">Open mail</button><button type="button" class="mlp-later" data-ml="later">Later</button></footer></section>';
    document.body.appendChild(el); mlPop = el;
    var go = el.querySelector('.mlp-go'); if (go) go.focus({ preventScroll: true });
  }
  function mlPopClose() {
    if (!mlPop) return;
    mlPop.parentNode.removeChild(mlPop); mlPop = null;
    if (mlPrev && mlPrev.focus && document.body.contains(mlPrev)) { try { mlPrev.focus({ preventScroll: true }); } catch (e) {} }
    mlPrev = null;
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-ml]');
    if (!el) return;
    var a = el.getAttribute('data-ml');
    if (a === 'later') { lsSet('lk.mail.later', String(now() + ML_NUDGE)); mlPopClose(); return; }
    if (a === 'open') { mlPopClose(); S.atab = 'mail'; lsSet('lk.prep.atab', 'mail'); if (location.hash === '#/admin') { draw(); mlSeenAll(); } else location.hash = '#/admin'; }
  });
  document.addEventListener('keydown', function (e) {
    if (!mlPop) return;
    if (e.key === 'Escape') { e.preventDefault(); lsSet('lk.mail.later', String(now() + ML_NUDGE)); mlPopClose(); return; }
    if (e.key !== 'Tab') return;
    var f = mlPop.querySelectorAll('button'), first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { loadMail(); mlMaybePop(); } });

  /* ---------- public bits used by app.js ---------- */
  window.LK_PREP = {
    mount: function (name, root, sel) {
      wire();
      S.name = name; S.root = root;
      if (name === 'guides') { if ((sel || '') !== S.gSel) S.gSel = sel || ''; }
      if (name === 'admin') S.draft = S.draft || null;
      draw();
      if (S.pin) { connect(); if (name === 'admin') sdk(); if (name === 'orders') { S.ordDate = dayNow(); watchOrders(); } if (name === 'waste') { S.wDate = dayNow(); watchWaste(); } notesInit(); }
    },
    warm: function () { if (S.pin && S.configState !== 'ok' && S.configState !== 'loading') connect(); notesInit(); },
    unsaved: function () {
      return pending > 0 || !!mlf.text.trim() || mfDirty() || nfDirty() || gfDirty() || draftDirty() || !!String(S.bulk || '').trim() || !!S.sheet || !!S.recipeOpen ||
        !!(S.text.trim() || S.qty.trim() || S.otext.trim() || S.oqty.trim() || S.wf.text.trim() || String(S.wf.amt).trim() || S.wf.act.trim() || (S.wrA != null && S.wrA !== ((S.wReview || {}).avoidable || '')) || (S.wrC != null && S.wrC !== ((S.wReview || {}).change || '')) || S.mpin);
    },
    noteInfo: noteInfo,
    noteOpen: noteOpen,
    guidesFor: function (rid) { try { return guidesFor(rid); } catch (e) { return []; } },
    guideSearch: function (q) { try { return guideSearch(q); } catch (e) { return []; } },
    featOn: featOn,
    whoName: whoName,
    headPin: whoHead,
    minNudge: minNudgeHTML,
    mailInfo: mlInfo,
    saveConfig: saveConfig,
    proofread: proofread,
    state: S
  };
})();
