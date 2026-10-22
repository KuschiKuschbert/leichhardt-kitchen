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
    kitchens/<PIN>/staffpins/<personId>        { hash }   each person's own PIN (hashed). Nobody can read it; the rules compare a PIN try with it
    kitchens/<PIN>/pinset/<personId>           { at }   only says that a PIN has been chosen, and when (a session names that time)
    kitchens/<PIN>/tries/<personId>            { tok, at, uid } write only: the last PIN try, one every 20 seconds per person
    kitchens/<PIN>/sessions/<uid>              { by, pinAt, exp, at } who this phone writes as, opened by a right try; read only by that phone
    kitchens/<PIN>/proofs/<personId>           { tok, at } write only, the older way: sent with each write from a phone with no session yet (at = server time, so an old proof cannot be reused)
    kitchens/<PIN>/activity/<personId>         { name, added, ticked, visits, lastSeen }   tallies shown in the admin panel
    kitchens/<PIN>/sections/<slug>             { name, uses, lastUsed }   sections people have written, offered as suggestions
    kitchens/<PIN>/orders/<date>/lines/<id>    one order line (rolls over until ordered)
    kitchens/<PIN>/waste/<date>, .../lines/<id> the end-of-day waste review, and one wastage entry each (past days: head chef's Google only)
    kitchens/<PIN>/summary/waste               what was wasted in the last 14 days, written each night by the server
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
    /* Functions (21 Oct 2026): someone who books functions. The role only ticks Functions for them; what counts is the tick,
       which only the head chef's Google account can save (config/main fnIds). It gives no other rights. */
    fnc: { name: 'Functions coordinator', add: false, tick: false, del: false, ping: false, fn: true },
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
    retryAt: {}, wDate: dayNow(), wLines: [], wState: 'idle', rvDate: '', wReview: null, wReviewFor: '', wrA: null, wrC: null, wf: { text: '', amt: '', unit: 'kg', reason: '', sec: '', act: '' }, wSum: null, wsugg: [], wNote: null, wNoteFor: '', wStats: null, misses: null, heat: 'w', hist: {}, notes: null, notesFor: '', notesAt: 0, notesBusy: false, notesOpen: false, nf: null, nMsg: '', nSaving: false,
    mins: null, minsFor: '', minsAt: 0, minsBusy: false, mmine: {}, msigns: {}, mSel: '', mf: null, mMsg: '', mSaving: false, mSigning: false, minOpen: false, mErr: '',
    guides: null, guidesFor: '', guidesAt: 0, gBusy: false, gRetry: 0, gq: '', gcat: 'all', gSel: '', gf: null, gfSnap: '', gMsg: '',
    adminsFor: '', level: '', stats: null, statsRange: 14, week: null, weekAt: 0, weekBusy: false,
    user: null, authState: 'idle', draft: null, saveMsg: '', busy: false, toast: '', toastAct: null
  };
  var fb = null, sdkP = null, unsubCfg = null, unsubItems = null, unsubSec = null, unsubAct = null;
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
  // App Check: Fraud Defense (reCAPTCHA Enterprise, appCheckEnterpriseKey) or the older reCAPTCHA v3 (appCheckKey)
  function sdkNames() { return ['firebase-app.js', 'firebase-firestore.js', 'firebase-auth.js'].concat(FB.appCheckEnterpriseKey || FB.appCheckKey ? ['firebase-app-check.js'] : []); }
  function sdkFiles() {
    var n = sdkNames();
    return Promise.all([import(SDK + n[0]), import(SDK + n[1]), import(SDK + n[2]), n[3] ? import(SDK + n[3]) : Promise.resolve(null)]);
  }
  /* The kitchen PIN screen downloads the Firebase files while the PIN is typed (21 Oct 2026), so the list opens sooner
     after Open: sdk() then finds them in the browser's cache. A plain fetch, not import(): a failed import is
     remembered for the rest of the page, and weak wifi on the PIN screen must not stop the real start later. */
  var sdkPre = false;
  function sdkEarly() {
    if (sdkP || sdkPre || navigator.onLine === false) return;
    sdkPre = true;
    sdkNames().forEach(function (n) { fetch(SDK + n, { mode: 'cors', credentials: 'omit' }).catch(function () {}); });
  }
  function sdk() {
    if (sdkP) return sdkP;
    var ack = FB.appCheckEnterpriseKey || FB.appCheckKey;
    sdkP = sdkFiles().then(function (m) {
      var app = m[0].initializeApp(FB), fs = m[1], au = m[2], db;
      if (ack && m[3]) { try { m[3].initializeAppCheck(app, { provider: FB.appCheckEnterpriseKey ? new m[3].ReCaptchaEnterpriseProvider(FB.appCheckEnterpriseKey) : new m[3].ReCaptchaV3Provider(FB.appCheckKey), isTokenAutoRefreshEnabled: true }); } catch (e) {} }
      try { db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) }); }
      catch (e) { db = fs.getFirestore(app); }
      var auth = au.getAuth(app);
      fb = { app: app, fs: fs, au: au, db: db, auth: auth };
      au.onAuthStateChanged(auth, function (u) {
        // PIN sessions (22 Oct 2026): every phone signs in anonymously; only a Google account is the head chef's (S.user)
        S.user = u && !u.isAnonymous ? u : null; S.uid = u ? u.uid : '';
        if (!u) anonIn(); else { S.authState = 'ready'; sessCatchUp(); }
        if (!S.user) admMark(false); featSync(); loadAdmins(); draw();
        if (S.authState === 'ready' && S.configState === 'ok') resume();
      });
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
        S.configState = 'ok'; pastCheck(); featSync(); refreshDraft(); watchItems(); watchSections(); loadLearned();
        // the first PIN windows, once the settings are in (does nothing once everyone has one)
        if (S.level === 'owner') seedPinOpen();
        if (S.name === 'orders') watchOrders(); if (S.name === 'waste') watchWaste(); resume(); if (S.authed) ksCheck(); loadAdmins(); loadNotes(); loadMinutes(); draw();
        if (whoHead() !== headSeen) whoSync();   // the Head chef role was given or taken while this person is signed in
        try { window.dispatchEvent(new Event('lk-cfg')); } catch (e) {}   // js/app.js: who may manage the recipes (bookEdit)
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
    [unsubCfg, unsubItems, unsubSec, unsubAct, unsubOrd, unsubW].forEach(function (u) { if (u) u(); });
    unsubCfg = unsubItems = unsubSec = unsubAct = unsubOrd = unsubW = null; cfgKey = itemsKey = ordKey = wKey = '';
  }
  var itemsSig = '';
  function patchUnsent() {
    S.items.forEach(function (x) {
      var row = document.getElementById('nbr-' + x.id), by = row && row.querySelector('.nb-by'), mark = by && by.querySelector('.nb-unsent');
      if (!by) return;
      if (x._unsent && !mark) by.insertAdjacentHTML('afterbegin', '<span class="nb-unsent">Not sent</span> ');
      if (!x._unsent && mark) { var sp = mark.nextSibling; mark.remove(); if (sp && sp.nodeType === 3 && sp.nodeValue === ' ') sp.remove(); }
    });
  }
  function watchItems() {
    if (S.configState !== 'ok' || !fb) return;
    var key = S.pin + '|' + S.date;
    if (key === itemsKey && unsubItems) return;
    if (unsubItems) unsubItems();
    itemsKey = key; S.itemsState = 'loading'; itemsSig = '';
    unsubItems = fb.fs.onSnapshot(itemsCol(S.date), { includeMetadataChanges: true }, function (snap) {
      // when the server confirms a change only the "Not sent" marks differ: those are patched, not the whole page drawn
      var sig = JSON.stringify(snap.docs.map(function (d) { return [d.id, d.data()]; })), same = sig === itemsSig && S.itemsState === 'ok';
      itemsSig = sig;
      S.items = snap.docs.map(function (d) { var x = d.data(); x.id = d.id; x._unsent = !!(d.metadata && d.metadata.hasPendingWrites); return x; });
      if (same && S.root && document.body.contains(S.root) && !holdDraw) { patchUnsent(); return; }
      S.itemsState = 'ok'; draw();
    }, function () { S.itemsState = 'error'; draw(); });
  }
  /* What the prep list learned, for suggestions, Quick add and the Learning tab: the 500 most used items. The collection
     gains a record for every distinct line ever written and nothing prunes it, so the read is bounded here (the
     order list's copy is bounded the same way, at 300). It only changes overnight (the server counts the day) and when
     the head chef hides an item, so it is read once a day per phone (up to 500 reads) and kept in lk.learned until the
     kitchen day changes; a hide is patched on the phone that made it (22 Oct 2026: it was a live listener, read again in
     full on every reload and every 04:00 refresh). A failed read keeps nothing and tries again after 5 minutes. */
  var LEARN_N = 500;
  function loadLearned() {
    var tag = S.pin + '|' + dayNow();
    if (!fb || S.learnBusy || waiting('learned') || S.learnFor === tag) return;
    try { var c = JSON.parse(lsGet('lk.learned') || 'null'); if (c && c.tag === tag && Array.isArray(c.list)) { S.learned = foldLearned(c.list); S.lists = listsOf(c.lists); S.learnFor = tag; return; } } catch (e) {}
    S.learnBusy = true;
    // the nightly summary first: 1 read instead of up to 500 (22 Oct 2026); the old read when it is missing or old.
    // The same record holds when tomorrow's list is written (lists, see cutFor()), so that costs no read of its own.
    sumList('learned').then(function (sum) {
      S.lists = listsOf(sum && sum.lists);
      return sum ? sum.items : fb.fs.getDocs(fb.fs.query(colRef('learned'), fb.fs.orderBy('uses', 'desc'), fb.fs.limit(LEARN_N))).then(function (snap) {
        return snap.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
      });
    }).then(function (list) {
      S.learned = foldLearned(list);
      S.learnFor = tag; S.learnBusy = false; learnSave(); draw();
    }, function () { S.learnBusy = false; retryLater('learned'); });
  }
  /* summary/learned and summary/ordlearned (scripts/nightly-learn.mjs, 03:00): one read each, once a day per phone. The
     record, or null when it is missing, unreadable or older than yesterday (a night the job did not run), so the caller
     reads the collection as before; a failed read is never taken as "nothing learned". */
  function sumList(name) {
    return fb.fs.getDoc(docRef('summary', name)).then(function (sn) {
      var d = sn.exists() ? sn.data() : null;
      return d && Array.isArray(d.items) && d.day >= shift(dayNow(), -1) ? d : null;
    }, function () { return null; });
  }
  // lk.learned also keeps lists, so it is out of date at the next kitchen day like the list itself
  function learnSave() { lsSet('lk.learned', JSON.stringify({ tag: S.learnFor, list: S.learned, lists: S.lists })); }
  /* When tomorrow's list was written (summary/learned lists, js/learn.js), checked by type before it is used: a night's
     start and the usual times are whole minutes in the day or -1, line counts are small whole numbers. null when the
     server has not clocked anything yet. */
  function listsOf(v) {
    if (!v || typeof v !== 'object') return null;
    function min(m) { return typeof m === 'number' && m >= 0 && m < 1440 ? Math.floor(m) : -1; }
    var out = { days: {}, dow: {}, usual: min(v.usual), n: typeof v.n === 'number' && v.n >= 0 && v.n <= 100 ? Math.floor(v.n) : 0 };
    Object.keys(v.days || {}).forEach(function (d) {
      var e = v.days[d];
      if (/^\d{4}-\d\d-\d\d$/.test(d) && e && typeof e === 'object') out.days[d] = { m: min(e.m), n: typeof e.n === 'number' && e.n >= 0 && e.n < 1000 ? Math.floor(e.n) : 0 };
    });
    Object.keys(v.dow || {}).forEach(function (k) { if (/^[0-6]$/.test(k) && min(v.dow[k]) >= 0) out.dow[k] = min(v.dow[k]); });
    return out;
  }
  /* "Slice onion" and "Slice onions" are learned as two records (their ids are the typed words), but they are one item
     (22 Oct 2026). The phone shows them as one: counts, weekdays, amounts and sections added up, the most used
     spelling as the name, every record id in ids (Hide writes to each). Nothing in Firestore changes. */
  function foldLearned(list) {
    var by = {}, out = [];
    (list || []).forEach(function (x) {
      var k = dupKey(x.text) || x.id, e = by[k];
      if (!e) { e = by[k] = Object.assign({}, x, { ids: (x.ids || [x.id]).slice(), dow: Object.assign({}, x.dow || {}), qtys: Object.assign({}, x.qtys || {}), secs: Object.assign({}, x.secs || {}) }); out.push(e); return; }
      if ((x.uses || 0) > (e.uses || 0)) { e.id = x.id; e.text = x.text; }
      e.ids = e.ids.concat(x.ids || [x.id]);
      ['uses', 'typed', 'picked'].forEach(function (f) { if (x[f] != null) e[f] = (e[f] || 0) + x[f]; });
      Object.keys(x.dow || {}).forEach(function (d) { e.dow[d] = (e.dow[d] || 0) + x.dow[d]; });
      Object.keys(x.qtys || {}).forEach(function (q) { var v = x.qtys[q]; if (!v) return; var w = e.qtys[q]; e.qtys[q] = w ? { q: w.n >= v.n ? w.q : v.q, n: (w.n || 0) + (v.n || 0) } : v; });
      Object.keys(x.secs || {}).forEach(function (q) { var v = x.secs[q]; if (!v) return; var w = e.secs[q]; e.secs[q] = w ? { name: w.name || v.name, n: (w.n || 0) + (v.n || 0) } : v; });
      e.lastUsed = Math.max(e.lastUsed || 0, x.lastUsed || 0);
      e.hidden = !!(e.hidden && x.hidden);
    });
    return out.sort(function (a, b) { return (b.uses || 0) - (a.uses || 0); });
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
  function canBrowse() { return (S.level === 'owner' && ownerHere()) || isSous(); }
  function can(what) { if (guest()) return what === 'add' || what === 'tick'; var p = me(); return !!(p && p[what]); }
  /* ---------- new pages the head chef can hold back from staff ----------
     Guides, Shift pings and Meeting minutes always show for the head chef, sous chefs and leads. Staff and View only see each one unless the head chef unticks it under New pages in the People
     tab (config/main staffSee, missing means shown). It only hides the links and skips the reads: it is not a lock.
     What this phone may see is kept in lk.feat, so the landing page and the top bar are right before the book connects. */
  var FEATS = [['guides', 'Guides'], ['pings', 'Shift pings'], ['minutes', 'Meeting minutes']];
  var featHave = (function () { try { return JSON.parse(lsGet('lk.feat') || 'null') || {}; } catch (e) { return {}; } })();
  /* Marks this phone or computer as the head chef's (lk.admin) once the owner probe has passed, and clears the mark on sign out
     or when the probe fails. js/app.js listens for lk-admin to show or drop Admin in the chef hat's menu. */
  function admMark(on) {
    var was = lsGet('lk.admin') === '1';
    lsSet('lk.admin', on ? '1' : '');
    if (was !== !!on) { try { window.dispatchEvent(new Event('lk-admin')); } catch (e) {} }
  }
  /* the head chef's own device: the owner probe has passed on it (lk.admin), or is passing now. A Google account that is not the
     head chef's does not count, so held-back pages stay held back and the admin links stay hidden on that phone. */
  function admDev() { return (S.level === 'owner' || (S.level !== 'none' && lsGet('lk.admin') === '1')) && ownerHere(); }
  /* The head chef's Google sign-in stays on a device, so on a shared kitchen tablet it opened the head chef's tools for
     whoever picked it up (20 Oct 2026). The head chef's tools (Admin link and panel, reports, editing guides, minutes and
     pings, kitchen mail) now show only while a chef (head chef or sous chef) is the person signed in on this device, or,
     on a personal device (not ticked "Shared kitchen device"), while nobody is. Staff signed in get their own view. */
  function ownerHere() { var p = who(); return p ? chefP(p) : !shared(); }
  function featCalc(k) {
    var p = who();
    return admDev() || (S.config.staffSee || {})[k] !== false || !!(p && (chefP(p) || p.role === 'lead' || (k === 'pings' && canPingP(p))));
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
    if (!got.pings && !got.minutes && npop && npop.getAttribute('data-pv') !== '1') noteClose('shut'); else noteRefresh();
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
  /* One live region that is never redrawn (outside the prep root), so screen readers hear every toast: a region added
     together with its text, as a redrawn toast is, is often not read out. */
  function liveSay(t) {
    var el = document.getElementById('lk-live');
    if (!el) { el = document.createElement('div'); el.id = 'lk-live'; el.className = 'visually-hidden'; el.setAttribute('aria-live', 'polite'); el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = ''; setTimeout(function () { el.textContent = t; }, 60);
  }
  function toast(msg, act, ms) {
    liveSay(msg + (act && act.label ? '. ' + act.label + ' is on screen.' : ''));
    if (S.toast && S.toastAct && S.toastAct !== act) { S.toastOld = { msg: S.toast, act: S.toastAct }; clearTimeout(toastOldTimer); toastOldTimer = setTimeout(function () { S.toastOld = null; draw(); }, 6000); }
    toastAt = Date.now(); toastScroll = document.scrollingElement ? { el: document.scrollingElement, y: document.scrollingElement.scrollTop } : null;
    S.toast = msg; S.toastAct = act || null; draw(); clearTimeout(toastTimer); toastTimer = setTimeout(function () { S.toast = ''; S.toastAct = null; draw(); }, ms || (act ? 9000 : 3500));
  }
  /* Small toasts (21 Oct 2026): the older Undo is a chip above the new toast ("Undo removed Pick coriander"). A swipe
     down or a tap on the words puts a toast away early, and a toast without a button goes once the page is scrolled. */
  var toastAt = 0, toastScroll = null, toastSwipe = null, toastSwiped = 0;
  function toastChip(o) {
    return o.act.label === 'Undo' ? 'Undo ' + (/^[A-Z][a-z]/.test(o.msg) ? o.msg.charAt(0).toLowerCase() + o.msg.slice(1) : o.msg) : o.act.label + ': ' + o.msg;
  }
  function toastHTML() {
    if (!S.toast) return '';
    var o = S.toastOld;
    // the new toast comes first (screen readers and the tests meet it first); the stack shows the chip above it
    return '<div class="p-toasts"><div class="p-toast' + (S.toastAct ? '' : ' p-toast-plain') + '" data-toast="new" data-p="toast-hide"><span class="p-toast-msg">' + esc(S.toast) + '</span>' +
      (S.toastAct ? '<button type="button" class="p-toast-btn" data-p="toast-act">' + esc(S.toastAct.label) + '</button>' : '') + '</div>' +
      (o ? '<div class="p-toast p-toast-old" data-toast="old"><button type="button" class="p-toast-btn p-toast-chip" data-p="toast-old">' + esc(toastChip(o)) + '</button></div>' : '') + '</div>';
  }
  function toastAway(which) {
    clearTimeout(toastOldTimer); S.toastOld = null;
    if (which !== 'old') { clearTimeout(toastTimer); S.toast = ''; S.toastAct = null; }
    draw();
  }
  function toastDown(e) {
    var t = e.target.closest && e.target.closest('[data-toast]');
    toastSwipe = t && S.root && S.root.contains(t) ? { el: t, id: e.pointerId, y: e.clientY } : null;
  }
  function toastMove(e) {
    var w = toastSwipe;
    if (!w || w.id !== e.pointerId) return;
    var dy = Math.max(0, e.clientY - w.y);
    w.el.style.transform = dy ? 'translateY(' + dy + 'px)' : ''; w.el.style.opacity = dy ? String(Math.max(0.3, 1 - dy / 120)) : '';
  }
  function toastUp(e) {
    var w = toastSwipe; toastSwipe = null;
    if (!w || w.id !== e.pointerId) return;
    if (e.type === 'pointerup' && e.clientY - w.y > 30) { toastSwiped = Date.now(); toastAway(w.el.getAttribute('data-toast')); return; }
    w.el.style.transform = ''; w.el.style.opacity = '';
  }
  function toastScrolled(e) {
    if (!S.toast || S.toastAct) return;
    var el = e.target === document ? document.scrollingElement : e.target;
    if (!el || typeof el.scrollTop !== 'number') return;
    // the page moving to the box the toast is about (in its first moment) does not count
    if (!toastScroll || toastScroll.el !== el || Date.now() - toastAt < 800) { toastScroll = { el: el, y: el.scrollTop }; return; }
    if (Math.abs(el.scrollTop - toastScroll.y) > 60) { toastScroll = null; toastAway('new'); }
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
      var p = who(), kept = typeof restore === 'function' ? ' Your text is still in the box.' : '';
      toast('Not saved. Checking your PIN...', null, 12000);
      sset(docRef('activity', S.who), { name: p ? p.name : '', lastSeen: now() }, true).then(function () {
        toast('Not saved. Ask the head chef.' + kept, { label: 'OK', fn: function () {} }, 12000);
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
  /* Every write carries the writer's id (by), and the security rules check this phone's PIN session for that person (see
     PIN sessions below), so only people who know a personal PIN can write. While a session is being opened (a PIN just
     typed, a phone moving from the older proof), a write waits for it, so it reaches the server after the session. */
  function W(ops) {
    if (sessP) return track(sessP.then(function () { return W(ops); }, function () { return W(ops); }));
    var b = fb.fs.writeBatch(fb.db), as = canW();
    ops.forEach(function (o) {
      if (o[0] === 'del') { b.delete(o[1]); return; }
      var data = as ? Object.assign({ by: S.who }, o[2]) : o[2];
      if (o[0] === 'upd') b.update(o[1], data); else if (o[3]) b.set(o[1], data, { merge: true }); else b.set(o[1], data);
    });
    return track(b.commit());
  }
  /* A long list of writes (a rollover, a big merge) goes in batches of 400, one after the other, so nothing past the
     first 400 is dropped (a Firestore batch holds 500 writes). */
  function Wall(ops) {
    var p = Promise.resolve(), k;
    for (k = 0; k < ops.length; k += 400) (function (part) { p = p.then(function () { return W(part); }); })(ops.slice(k, k + 400));
    return p;
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
  /* ---------- PIN sessions (22 Oct 2026, review S8) ----------
     The phone signs in to Firebase anonymously (its own uid). A PIN is checked by writing a try (tries/<id>: the PIN's
     hash, the time, this phone's uid; the rules allow one per person every 20 seconds, so a PIN cannot be guessed by
     script), then opening a session (sessions/<uid>: who, the PIN's time from pinset, an end 30 days on), which the
     rules allow only after a right try from this phone. Writes then carry only who wrote them: no proof, and nothing
     secret is kept on the phone. Since phase 2 (22 Oct 2026) the rules accept nothing else: a phone with no session cannot
     write, and a phone with no Firebase sign-in cannot open one (the PIN screen says so and tries the sign-in again).
     A running session moves its end forward once a day; Sign out and the idle lock end it;
     Reset PIN and Stopped working here stop it in the rules. lk.prep.sess (who, the end, this phone's uid and the PIN's
     time; nothing secret) lets a phone with no signal open as before; it is out of date at that end, when the phone's
     sign-in changes (the head chef signing in or out with Google) and when the PIN is reset (the first write is refused
     and the PIN is asked again). The older proof (lk.prep.tok, on a phone that signed in before sessions) is used once,
     as a PIN try, to open a session, then dropped. */
  var SESS_DAYS = 30, TRY_MS = 20000, sessRenewed = '', lastTry = {}, tryTimer = 0, sessP = null;
  var NO_SIGNIN = 'This phone could not sign in to the book. Check the connection, then type your PIN again.';
  function sessOn() { return !!S.who && S.sessFor === S.who && !!S.uid && S.sessUid === S.uid; }
  // this phone may write as the person signed in: their session
  function canW() { return sessOn(); }
  function anonIn() {
    if (!fb || !fb.au.signInAnonymously || S.anonBusy) { if (!S.anonBusy) S.authState = 'ready'; return; }
    S.anonBusy = true;
    fb.au.signInAnonymously(fb.auth).then(function () { S.anonBusy = false; }, function () {
      // no signal on a first start, or anonymous sign-in off in the console: the PIN screen says so, and typing the PIN
      // tries the sign-in again
      S.anonBusy = false; S.authState = 'ready'; if (S.configState === 'ok') resume();
    });
  }
  /* The phone's sign-in is in, or changed (the head chef signed in or out with Google), while someone is signed in with
     their PIN but has no session for this sign-in: one is opened from the PIN this page already checked. A session made
     under the old sign-in is dropped. With no PIN in hand (the page opened with its session), the next write is refused
     and failed() asks for the PIN. */
  function sessCatchUp() {
    if (!S.uid || !S.authed || !S.who || sessOn()) return;
    if (S.sessFor) { S.sessFor = ''; S.sessUid = ''; lsSet('lk.prep.sess', ''); }
    var id = S.who, h = S.tok;
    if (h) sessOpenRetry(id, h).catch(function () {});   // the PIN went in under 20 seconds ago: once more after the 20 seconds
  }
  function sessRef() { return docRef('sessions', S.uid); }
  function sessKeep(id, exp, at) { S.sessFor = id; S.sessExp = exp; S.sessUid = S.uid; S.sessPinAt = at; lsSet('lk.prep.sess', [id, exp, S.uid, at].join(':')); lsSet('lk.prep.tok', ''); }
  // also a session only kept on the phone (a shared device asking who it is at the start of a new day)
  function sessDrop() {
    if (fb && S.uid && (S.sessUid === S.uid || (lsGet('lk.prep.sess') || '').split(':')[2] === S.uid)) fb.fs.deleteDoc(sessRef()).catch(function () {});
    S.sessFor = ''; S.sessExp = 0; S.sessUid = ''; lsSet('lk.prep.sess', '');
  }
  function pinAtOf(id) {
    // one read, only when the PIN screen did not read it already (a phone moving from the older proof)
    return fb.fs.getDoc(docRef('pinset', id)).then(function (sn) { var d = sn.exists() ? sn.data() : null; if (!d || typeof d.at !== 'number') throw { code: 'permission-denied' }; return d.at; });
  }
  // the PIN check: a try, then the session. Rejects { code: 'wait' } when the last try was under 20 seconds ago,
  // { code: 'permission-denied' } for a wrong PIN, { code: 'no-session' } when this phone has no anonymous sign-in
  function sessTry(id, h, pinAt) {
    if (!S.uid) return Promise.reject({ code: 'no-session' });
    var f = fb.fs, exp = now() + SESS_DAYS * 86400000, uid = S.uid;
    return (typeof pinAt === 'number' ? Promise.resolve(pinAt) : pinAtOf(id)).then(function (at) {
      lastTry[id] = Date.now();
      return track(f.setDoc(docRef('tries', id), { tok: h, at: f.serverTimestamp(), uid: uid })).then(function () {
        return track(f.setDoc(docRef('sessions', uid), { by: id, pinAt: at, exp: exp, at: f.serverTimestamp() })).then(function () { if (S.uid === uid && S.who === id) sessKeep(id, exp, at); });
      }, function (e) { throw e && e.code === 'permission-denied' ? { code: 'wait' } : e; });
    });
  }
  // writes made while a session is being opened wait for it (W), so they reach the server after it
  function sessHold(p) {
    var mine = sessP = p.then(function (v) { if (sessP === mine) sessP = null; return v; }, function (e) { if (sessP === mine) sessP = null; throw e; });
    return mine;
  }
  function sessOpen(id, h, pinAt) { return sessHold(sessTry(id, h, pinAt)); }
  // the same, once more after the 20 seconds when the last try for this person was a moment ago (another phone, or this
  // one just before): a phone moving from the older proof, or a first PIN, needs no second typing. Writes wait throughout.
  function sessOpenRetry(id, h, pinAt) {
    return sessHold(sessTry(id, h, pinAt).catch(function (e) {
      if (!e || e.code !== 'wait') throw e;
      return new Promise(function (ok) { setTimeout(ok, TRY_MS + 1000); }).then(function () { return sessTry(id, h, pinAt); });
    }));
  }
  // once a day: a running session moves its end forward (one write, no read); the rules allow it only while it still
  // runs. The end kept in lk.prep.sess is what makes it once a day across reloads.
  function sessRenew() {
    if (!sessOn() || typeof S.sessPinAt !== 'number' || sessRenewed === dayNow() || S.sessExp - now() > (SESS_DAYS - 1) * 86400000) return;
    sessRenewed = dayNow();
    var exp = now() + SESS_DAYS * 86400000, id = S.who, at = S.sessPinAt, uid = S.uid;
    fb.fs.setDoc(sessRef(), { by: id, pinAt: at, exp: exp, at: fb.fs.serverTimestamp() }).then(function () { if (sessOn() && S.uid === uid) sessKeep(id, exp, at); }).catch(function () {});
  }
  function pickName(id) {
    noteClose('shut'); ksClose(); sessDrop();   // a sheet for the person before stays off the PIN screen
    S.who = id; lsSet('lk.prep.who', id); lsSet('lk.prep.tok', ''); S.authed = false; S.tok = ''; S.pf1 = S.pf2 = ''; S.pinMsg = ''; S.pinStep = 'checking'; featSync(); draw(); whoSync();
    fb.fs.getDoc(docRef('pinset', id)).then(function (s) {
      var d = s.exists() ? s.data() : null;
      S.pinStep = d ? 'enter' : 'set'; S.pinAt = d && typeof d.at === 'number' ? { id: id, at: d.at } : null; draw();   // the session names the PIN's time
      if (/^\d{4}$/.test(S.pf1)) { if (S.pinStep === 'enter') submitPin(); else focusK('pf2'); }
    }, function () { S.pinStep = 'error'; draw(); });
  }
  function signedIn(id, hash) {
    setTimeout(dailyFlush, 3000);   // yesterday's counts, once someone is signed in (W writes as them)
    S.authed = true; S.tok = hash; S.pf1 = S.pf2 = ''; S.pinMsg = ''; S.pinStep = '';
    lsSet('lk.prep.tok', ''); lsSet('lk.prep.seen', String(Date.now())); lsSet('lk.prep.day', dayNow()); lastAct = Date.now(); startIdle();
    hereAdd(id);
    var pend = S.pending; S.pending = null; S.picking = false;
    // signed in on a shared device only to tick or add: no start of shift sheet (see noteMaybePop). Sign in from the
    // chef hat (back) is a real start
    S.guestIn = !!(pend && !pend.back);
    lsSet('lk.prep.guest', S.guestIn ? id + ':' + dayNow() : '');   // kept for a reload; out of date for another person or day
    draw(); whoSync(true);   // a real sign-in: the chef mark flips in
    if (pend) guestReplay(pend);
    dkCheck(); ksCheck(); noteMaybePop();
  }
  /* Who signed in on this device today, newest first: "Who are you?" lists them first (lk.prep.here). */
  function hereGet() { try { var h = JSON.parse(lsGet('lk.prep.here') || 'null'); return h && h.d === dayNow() ? h.ids : []; } catch (e) { return []; } }
  function hereAdd(id) { var ids = hereGet().filter(function (x) { return x !== id; }); ids.unshift(id); lsSet('lk.prep.here', JSON.stringify({ d: dayNow(), ids: ids.slice(0, 12) })); }
  /* ---------- a shared kitchen device with nobody signed in (20 Oct 2026) ----------
     After the 10 minute lock, the prep list, orders and wastage still show. A tap that writes (tick, add, urgent, order,
     log waste) asks "Who are you?" first, then does that same thing once the PIN is right, so nobody taps twice. What was
     typed in the add boxes stays. Reading needs only the kitchen PIN, as before; every write still needs a person's PIN. */
  var GUEST_WRITES = { oreg: 1, tick: 1, urgent: 1, del: 1, restore: 1, 'add-recipe': 1, quick: 1, fnneed: 1, 'toast-act': 1, ogroup: 1, otick: 1, odel: 1, orestore: 1, wdel: 1, wrestore: 1, wreview: 1 };
  function guest() { return shared() && !S.authed && !S.picking && !S.who && (S.name === 'prep' || S.name === 'orders' || S.name === 'waste'); }
  function guestAsk(pend) { S.pending = pend; S.picking = true; S.who = ''; draw(); window.scrollTo(0, 0); }
  function guestSel(el) {
    return ['data-p', 'data-id', 'data-d', 'data-i', 'data-v', 'data-k2'].filter(function (k) { return el.hasAttribute(k); })
      .map(function (k) { return '[' + k + '="' + String(el.getAttribute(k)).replace(/["\\]/g, '\\$&') + '"]'; }).join('');
  }
  function guestReplay(pend) {
    if (pend.back) { location.hash = pend.back; return; }   // Sign in from the chef hat: back to the page the person was on
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
        var setAt = now();
        b.set(docRef('pinset', id), { at: setAt, name: p.name });
        return track(b.commit()).then(function () {
          return sessOpenRetry(id, h, setAt).then(function () { S.drinkAsk = 'first'; dkEdit(); signedIn(id, h); S.tok = h; bump({ visits: 1, lastSeen: now() }); }, function (e) {
            // the PIN is saved, but this phone could not sign in yet (no Firebase sign-in, or no signal): type it again
            S.pinStep = 'enter'; S.pinAt = { id: id, at: setAt }; S.pf1 = S.pf2 = '';
            S.pinMsg = e && e.code === 'no-session' ? NO_SIGNIN : 'Your PIN is saved. Type it again to sign in.';
            if (e && e.code === 'no-session') anonIn();
            draw();
          });
        });
      }).catch(function () { S.pinMsg = 'Could not save your PIN. If someone already set one for this name, pick the name again. Otherwise ask the head chef to reset your PIN, then set it within 30 minutes.'; draw(); });
      return;
    }
    if (S.pinStep === 'enter') {
      if (lockLeft() > 0) { S.pinMsg = lockWait(lockLeft()); S.pf1 = ''; draw(); return; }
      // no Firebase sign-in on this phone (no signal on its first start): it cannot open a session, so say so and try again
      if (!S.uid) { S.pinMsg = NO_SIGNIN; S.pf1 = ''; anonIn(); draw(); return; }
      // one try every 20 seconds (the rules): a PIN typed again straight after a wrong one goes in by itself once it may
      var gap = TRY_MS + 1000 - (Date.now() - (lastTry[id] || 0));
      clearTimeout(tryTimer);
      if (gap > 0) {
        S.pinMsg = 'One try every 20 seconds. Your PIN goes in by itself in ' + Math.ceil(gap / 1000) + ' seconds.'; draw();
        tryTimer = setTimeout(function () { if (S.who === id && S.pinStep === 'enter' && !S.authed && /^\d{4}$/.test(S.pf1)) submitPin(); }, gap);
        return;
      }
      // the check is a write, which waits for the server: say so, and say when there is no signal (the write waits in
      // the queue and the person is signed in by itself once the signal is back)
      S.pinMsg = 'Checking your PIN...'; draw();
      var slow = setTimeout(function () { if (S.pinMsg === 'Checking your PIN...') { S.pinMsg = 'No signal. Your PIN cannot be checked until the phone is back online. Keep the book open: it signs you in by itself when the signal is back.'; draw(); } }, 8000);
      pinHash(id, S.pf1).then(function (h) {
        S.who = id; S.tok = h;
        // the try and the session: the rules compare the try with the stored PIN
        var check = sessOpen(id, h, S.pinAt && S.pinAt.id === id ? S.pinAt.at : null).then(function () { bump({ visits: 1, lastSeen: now() }); });
        return check.then(function () { clearTimeout(slow); lsSet(lockKey(), ''); signedIn(id, h); },
          function (e) {
            clearTimeout(slow); S.tok = '';
            if (e && e.code === 'wait') { lastTry[id] = Date.now(); S.pinMsg = 'One try every 20 seconds. Wait a moment, then type it again.'; S.pf1 = ''; }
            else if (e && e.code === 'permission-denied') { S.pinAt = null; lockFail(); S.pinMsg = lockLeft() > 0 ? lockWait(lockLeft()) : 'That PIN is not right.'; S.pf1 = ''; }
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
    if (fb && S.authState !== 'ready') return;   // the phone's sign-in first (anonymous or Google): it calls resume() again
    resumed = true;
    if (!S.who) return;
    var tok = (lsGet('lk.prep.tok') || '').split(':'), sv = (lsGet('lk.prep.sess') || '').split(':');
    var hasTok = tok[0] === S.who && !!tok[1], hasSess = sv[0] === S.who && +sv[1] > now() && !!S.uid && sv[2] === S.uid;
    if (dayExpired()) { leave(); startIdle(); return; }
    // with no session, a phone that signed in before sessions opens one with its kept proof; with no Firebase sign-in it
    // cannot, so the PIN is asked (and the PIN screen says why)
    if ((!hasSess && !(hasTok && S.uid)) || idleExpired()) { if (S.who) { if (shared()) leave(); else pickName(S.who); } startIdle(); return; }
    startIdle();
    if (hasSess) { S.sessFor = S.who; S.sessExp = +sv[1]; S.sessUid = sv[2]; S.sessPinAt = +sv[3]; }
    // a phone that signed in before sessions: its kept proof opens one session, once (then the proof is dropped). The
    // writes below wait for it; if the PIN was reset since, the first write is refused and the PIN is asked
    else sessOpenRetry(S.who, tok[1]).catch(function () {});
    S.authed = true; S.tok = hasTok ? tok[1] : ''; hereAdd(S.who); draw(); whoSync(); dkCheck();
    var gi = (lsGet('lk.prep.guest') || '').split(':'); S.guestIn = gi[0] === S.who && gi[1] === dayNow();   // signed in just to tick, before a reload
    ksCheck(); noteMaybePop(); setTimeout(dailyFlush, 3000);   // the section first, then the pings
    // the first write checks it on the server: a reset PIN, a session that ran out or someone off the list asks again
    sset(docRef('activity', S.who), { name: (who() || {}).name || '', visits: fb.fs.increment(1), lastSeen: now() }, true).then(sessRenew, function (e) {
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
  /* the next person never lands in the last person's staff draft, minutes register or ping editor */
  function leave() { sessDrop(); ksClose(); noteClose('shut'); S.guestIn = false; lsSet('lk.prep.guest', ''); S.drinkAsk = ''; S.who = ''; S.authed = false; S.pinStep = ''; S.staffOpen = false; S.minOpen = false; S.notesOpen = false; S.draft = null; S.nf = null; S.nOpen = false; S.mf = null; lsSet('lk.prep.who', ''); lsSet('lk.prep.tok', ''); resumed = true; featSync(); draw(); whoSync(); }
  /* The chef mark's menu (js/app.js) asks what to show: Meeting minutes for everyone (when the page is on), and for the
     head chef and sous chefs Shift pings and Manage staff (22 Oct 2026: the Minutes register is "See who has signed" at
     the top of Meeting minutes). head: no Kitchen mail, the head chef's mail is read in the admin panel. tab: the head
     chef on their own Google device, where Shift pings opens the admin tab and Manage staff is People in the admin
     panel, so the menu leaves Manage staff out. A key that is missing shows the row. */
  // the head chef on their own Google device: the chef hat's chef items open the matching admin tab
  function adminTabs() { return admDev() && whoHead(); }
  // Meeting minutes shows for staff only once there is something published to read (chefs always, for the register)
  function chefMenu() { return { minutes: featOn('minutes') && (isSous() || mnPub().length > 0), toSign: featOn('minutes') ? mnUnsigned().length : 0, chef: isSous(), head: whoHead(), tab: adminTabs(), sec: ksPicks(me()) ? (mySec() || 'Pick one for today') : '', book: bookEdit(), fn: fnOK() }; }
  /* Functions (21 Oct 2026): who may enter and change function bookings. The person signed in with their own PIN and
     ticked for Functions (config/main fnIds, which only the head chef's Google account saves), or the head chef's Google
     device with nobody signed in. Being Head chef or Functions coordinator is not enough without the tick. The rules
     check the same on every save (fnBy() in firestore.rules), so this only decides what the page shows; the
     config/main listener redraws the page the moment the tick is taken away. */
  function fnOK() {
    if (!S.pin || S.configState !== 'ok' || !S.config) return false;
    var p = me();
    if (p) return (S.config.fnIds || []).indexOf(p.id) >= 0;
    return admDev() && !!S.user;
  }
  // 'yes', 'no', 'wait' while who is signed in is still being read, or 'nopin'
  function fnState() {
    if (fnOK()) return 'yes';
    if (S.pin && (S.configState === 'idle' || S.configState === 'loading' || (S.configState === 'ok' && !resumed && !!S.who))) return 'wait';
    return S.pin ? 'no' : 'nopin';
  }
  function chefOpen(k) {
    if (!isSous()) return;
    if (adminTabs()) { S.atab = k === 'pings' ? 'notes' : k === 'register' ? 'minutes' : 'people'; lsSet('lk.prep.atab', S.atab); if (location.hash === '#/admin') draw(); else location.hash = '#/admin'; return; }
    // a ping with words not saved yet stays open behind the register (drawn first), like a staff draft, so Back finds it
    S.minOpen = false; if (!(k === 'register' && nfDirty())) S.notesOpen = false; if (S.staffOpen && !draftDirty()) { S.staffOpen = false; S.draft = null; }
    if (k === 'pings') { S.notesOpen = true; S.nf = null; S.nOpen = false; S.nMsg = ''; loadNotes(); }
    else if (k === 'register') { S.minOpen = true; S.mMsg = ''; S.mf = null; loadMinutes(true); }
    else { if (!S.staffOpen) startDraft(); S.staffOpen = true; seedPinOpen(); }
    if (location.hash === '#/prep') { draw(); window.scrollTo(0, 0); } else location.hash = '#/prep';
  }
  /* Sign out from the chef mark: back to Who are you? on this device (the kitchen PIN stays, so recipes and guides stay
     open). Something not saved yet: false, and the menu asks for a second tap first. */
  /* Sign out on a shared kitchen device: what this person left on it goes (22 Oct 2026). Function drafts hold a
     customer's phone and email, recipe and drawing drafts are the head chef's, and the mail they sent is theirs. Only on
     Sign out: the idle lock keeps them, so nothing typed is lost to a pause. */
  function forgetMine(id) {
    try {
      Object.keys(LS || {}).forEach(function (k) { if (/^lk\.(fe|mg|dw)\.draft\./.test(k)) lsSet(k, ''); });
      var l = mlSentAll(); if (l.some(function (x) { return x && x.w === id; })) mlSentSave(l.filter(function (x) { return x && x.w !== id; }));
    } catch (e) {}
  }
  function signOutPerson(force) {
    if (!S.authed) return true;
    if (!force && window.LK_PREP.unsaved()) return false;
    if (shared()) forgetMine(S.who);
    S.picking = shared(); S.pending = null; leave(); toast('Signed out. Hand the phone over.');
    return true;
  }
  /* Manage Recipes & Drawings (#/manage, 21 Oct 2026): the head chef only. With their own PIN as Head chef on any device,
     or on the head chef's Google device while nobody else is signed in with a PIN. The rules check the same on the
     server (bookBy() in firestore.rules), so this only decides what the page shows. */
  function bookEdit() { return !!S.pin && (whoHead() || (admDev() && !(S.authed && who()))); }
  // 'yes', 'no', or 'wait' while the kitchen settings (who is Head chef) are still being read
  function bookState() {
    if (bookEdit()) return 'yes';
    if (S.pin && (S.configState === 'idle' || S.configState === 'loading' || (S.configState === 'ok' && !resumed && !!S.who))) return 'wait';
    return S.pin ? 'no' : 'nopin';
  }
  /* What js/manage.js needs to read and write the head chef's book: the same write path (W, with the PIN proof) and
     helpers as the prep pages, so the rules and the "Not sent" handling are the same. */
  function bookApi() {
    return {
      ready: function () { return sdk().then(function () { return fb; }); },
      W: W, docRef: docRef, colRef: colRef,
      fs: function () { return fb.fs; }, db: function () { return fb.db; },
      now: now, dayShort: function (t) { return dayShort(T.day(t)); }, clock: function (t) { return T.clock(t); },
      say: liveSay, trapTab: trapTab, ovPush: ovPush, ovDone: ovDone,
      pin: function () { return S.pin; }, who: function () { var p = S.authed ? who() : null; return p ? p.id : ''; },
      nameOf: function (id) { var p = (S.config && S.config.people || []).filter(function (x) { return x.id === id; })[0]; return p ? p.name : ''; },
      edit: bookEdit, changed: rxChanged, fromServer: fromServer
    };
  }
  /* A read that must come from the server (the version check before a recipe, drawing or function save). On a slow or
     half-dropped connection getDocFromServer can wait a long time without failing, and the save never even went into the
     queue although the page said it would (22 Oct 2026). After 6 s it gives up like a read with no signal, so the caller
     takes its no-signal path: the save goes into Firestore's queue and is sent when the signal is back. */
  function fromServer(ref, ms) {
    return Promise.race([fb.fs.getDocFromServer(ref), new Promise(function (res, rej) { setTimeout(function () { rej({ code: 'slow' }); }, ms || 6000); })]);
  }
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
    amtOn(data); practiceOn(data);
    var pr = sset(ref, data); pr.id = ref.id; return pr;
  }
  /* The amount read into a number and one unit (js/amounts.js), saved next to the typed text so amounts can be added up
     later (22 Oct 2026): qn and qu, or nothing when it cannot be read for sure. */
  /* Practice on this device (22 Oct 2026, Settings, the head chef's device): lines written while it is on are marked tst,
     so the nightly learning and the wastage summary leave them out. A strip on the prep pages says it is on. */
  function practice() { try { return !!(JSON.parse(lsGet('lk.settings.v1') || '{}') || {}).practice; } catch (e) { return false; } }
  function practiceOn(data) { if (practice()) data.tst = true; return data; }
  function practiceHTML() { return practice() && S.pin ? '<div class="p-practice" role="status"><strong>Practice mode.</strong> What is written on this device is marked as practice and not learned. Turn it off in Settings.</div>' : ''; }
  function amtOn(data) {
    var a = window.LK_AMT && data.qty ? window.LK_AMT.parse(data.qty) : null;
    if (a) { data.qn = a.n; data.qu = a.u; }
    return data;
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
    if (!sec) sec = mySec();
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
    var secInfo = {}, sec = cleanSection(S.section, secInfo) || mySec();
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
  function tick(date, id) { batch(function () { tickNow(date, id); }); }
  function tickNow(date, id) {
    var it = S.items.filter(function (x) { return x.id === id; })[0], p = me();
    if (!it || !can('tick')) return;
    var done = !it.done;
    if (!done && !canUntick(it)) { toast('Ticked lines stay ticked. Ask the head chef or sous chef to undo it.'); return; }
    supd(itemRef(date, id), { done: done, doneBy: done ? p.name : '', doneById: done ? p.id : '', doneAt: done ? now() : 0 }).then(function () { markPast('p', date); }, failed);
    if (done) { bump({ ticked: 1 }); toast('Ticked', { label: 'Undo', fn: function () { tick(date, id); } }); setTimeout(draw, LINGER + 100); }
    else if (it.doneById && fb) sset(docRef('activity', it.doneById), { name: it.doneBy || '', ticked: fb.fs.increment(-1) }, true).catch(function () {});
  }
  function removeItem(date, id, restore) {
    var p = me(), it = S.items.filter(function (x) { return x.id === id; })[0];
    if (!can('del')) return;
    // a merged double up that is put back is kept apart, so it is not merged again
    supd(itemRef(date, id), Object.assign({ deleted: !restore, deletedBy: restore ? '' : p.name, deletedAt: restore ? 0 : now() }, restore && it && it.mergedInto ? { mergedInto: '', dupOk: true } : {})).then(function () { markPast('p', date); }, failed);
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
  // a line that makes its day the last written day: anything not removed, apart from a function's platter lines
  function rollSource(x) { return !x.deleted && !x.fn; }
  function maybeRoll() {
    var today = dayNow();
    // lk.prep.rolled: the kitchen day this phone last rolled the prep list over (22 Oct 2026; it was kept in memory only,
    // so every reload read today and the last day again). Out of date at the next kitchen day.
    if (lsGet('lk.prep.rolled') === today) S.rolledFor = today;
    if (!T.ready() || !S.authed || !fb || !can('add') || S.date !== today || S.itemsState !== 'ok' || S.rolledFor === today || waiting('roll')) return;
    if (S.pastFor !== pastTag() || !learnedIn()) return; // the cut (cutFor) comes from the past days and summary/learned, so wait for them
    repairAhead();
    S.rolledFor = today;
    var dates = [], k;
    for (k = 1; k <= 7; k++) dates.push(shift(today, -k));
    // the past days already on the phone say which day was written last, so only that day is read from the server (for
    // its ticks as they are now), with today: one day of lines instead of seven (22 Oct 2026). A day missing from the
    // copy (a read that failed) means all seven are read, as before.
    // A day that holds only a function's platter lines (written by the function's booking, js/fnedit.js) is not a
    // written day: those lines never roll, so the day before it is the one to roll from (22 Oct 2026).
    if (dates.every(function (d) { return S.past && S.past[d]; })) {
      var last = dates.filter(function (d) { return S.past[d].some(rollSource); })[0];
      if (!last) { lsSet('lk.prep.rolled', today); return; }
      dates = [last];
    }
    Promise.all([fb.fs.getDocs(itemsCol(today))].concat(dates.map(function (d) { return fb.fs.getDocs(itemsCol(d)); }))).then(function (res) {
      var have = {};
      res[0].docs.forEach(function (d) { have[d.id] = true; });
      var src = null, j;
      for (j = 1; j < res.length && !src; j++) {
        var docs = res[j].docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }).filter(function (x) { return !x.deleted; });
        if (docs.some(rollSource)) src = { date: dates[j - 1], items: docs };
      }
      if (!src) { lsSet('lk.prep.rolled', today); return; }
      // when that day's night list started, from its lines as they are on the server now
      var jobs = [], cut = cutFor(src.date, src.items);
      src.items.forEach(function (x) {
        if (x.done || x.fn) return;   // a function's platters belong to its day (js/fnedit.js), they never roll over
        var root = x.root || x.id, id = 'r' + today.replace(/-/g, '') + '-' + root;
        if (have[id]) return;
        have[id] = true;
        jobs.push(['set', itemRef(today, id), {
          text: x.text, station: x.station || '', qty: x.qty || '', recipe: x.recipe || '',
          addedBy: 'Rolled over', addedById: '', addedAt: now(), done: false, deleted: false,
          rolled: (x.rolled || 0) + 1, root: root, from: x.id, rolledFrom: src.date, origBy: x.origBy || x.addedBy || '', origAt: x.origAt || (x.rolled ? 0 : x.addedAt || 0), urgent: !!x.urgent,
          ahead: !!(x.ahead || writtenLate(x, src.date, cut))
        }]);
      });
      if (!jobs.length) { lsSet('lk.prep.rolled', today); return; }
      return Wall(jobs).then(function () { lsSet('lk.prep.rolled', today); toast(jobs.length + (jobs.length === 1 ? ' line' : ' lines') + ' rolled over from ' + dayName(src.date).toLowerCase()); });
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
  function learnedFor(text) { var k = lkey(text), d = dupKey(text); return S.learned.filter(function (x) { return x.id === k || (x.ids || []).indexOf(k) >= 0 || (d && dupKey(x.text) === d); })[0] || null; }
  function bestSection(x) {
    var best = '', n = 0;
    Object.keys(x.secs || {}).forEach(function (k) { var v = x.secs[k]; if (v && v.name && v.n > n) { n = v.n; best = v.name; } });
    return best;
  }
  /* Amounts written for a line before: the learned record (kept for good) and the last 7 days, most used first. */
  function qtyList(text) {
    var k = lkey(String(text || '').trim()), out = {}, lx = learnedFor(text);
    if (!k) return [];
    Object.keys((lx && lx.qtys) || {}).forEach(function (q) { var v = lx.qtys[q]; if (v && v.q) amtAdd(out, v.q, v.n || 0); });
    // the last days: a count of its own, the larger of the two wins (the learned record already holds the older days)
    var recent = {};
    ((lx && lx.ids) || []).concat([k]).forEach(function (hk) { var h = (S.hist || {})[hk]; Object.keys((h && h.q) || {}).forEach(function (q) { var v = h.q[q]; if (v && v.q) amtAdd(recent, v.q, v.n || 0); }); });
    Object.keys(recent).forEach(function (g) { if (!out[g] || out[g].n < recent[g].n) out[g] = recent[g]; });
    return Object.keys(out).map(function (q) { return out[q]; }).sort(function (a, b) { return b.n - a.n; });
  }
  // adds n uses of an amount, grouped by the amount as read (js/amounts.js): the most used spelling is the one shown
  function amtAdd(out, q, n) {
    var g = window.LK_AMT ? window.LK_AMT.key(q) : String(q).toLowerCase(), e = out[g];
    if (!e) { out[g] = { q: q, n: n, top: n }; return; }
    if (n > e.top) { e.q = q; e.top = n; }
    e.n += n;
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
    sg('usual', 's');
    return '<span class="nb-ql">Usual amount</span>' + l.map(function (x) { return '<button type="button" class="chip sq nb-qc" data-p="qset" data-v="' + esc(x.q) + '" aria-label="' + esc('Add ' + S.text.trim() + ', ' + x.q) + '">Add ' + esc(x.q) + '</button>'; }).join('');
  }
  /* Start here: up to three open lines to do first, across all sections. */
  function startHere(live) {
    var open = live.filter(function (x) { return !x.done && !x.fn; }), picked = [], seen = {};
    function take(list, why) { list.forEach(function (x) { if (picked.length < 3 && !seen[x.id]) { seen[x.id] = 1; picked.push({ x: x, why: why(x) }); } }); }
    take(open.filter(function (x) { return x.urgent; }).sort(function (a, b) { return (a.addedAt || 0) - (b.addedAt || 0); }), function () { return 'Urgent'; });
    take(open.filter(function (x) { return rolledN(x); }).sort(function (a, b) { return rolledN(b) - rolledN(a); }), function (x) { return 'Rolled over' + (rolledN(x) > 1 ? ' x' + rolledN(x) : ''); });
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
    if (dupTimer || !S.authed || !fb || !fb.fs.getDocsFromServer || !can('add') || S.date !== dayNow() || S.itemsState !== 'ok' || !dupTodo(S.items).length) return;
    dupTimer = setTimeout(function () {
      dupTimer = null;
      var dte = S.date, ids = [];
      if (dte !== dayNow() || !can('add')) return;
      dupTodo(S.items).forEach(function (g) { dupTried[dupSig(g)] = 1; g.forEach(function (x) { ids.push(x.id); }); });
      if (!ids.length) return;
      // read the lines as the server has them now: one query per 30 lines (an "in" query takes up to 30 ids), on the
      // first double up the page finds each load. Costs one read per line, as before, without a read per line in a loop.
      var parts = [], k;
      for (k = 0; k < ids.length; k += 30) parts.push(ids.slice(k, k + 30));
      Promise.all(parts.map(function (part) { return fb.fs.getDocsFromServer(fb.fs.query(itemsCol(dte), fb.fs.where(fb.fs.documentId(), 'in', part))); })).then(function (res) {
        var fresh = [];
        res.forEach(function (r) { r.docs.forEach(function (d) { var x = d.data(); x.id = d.id; fresh.push(x); }); });
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
        return Wall(ops).then(function () {
          var msg = gs.length === 1 ? last.keep.text + ' was on the list ' + (gs[0].length === 2 ? 'twice' : gs[0].length + ' times') + '. Now it is on once' + (last.sec ? ', under ' + last.sec : '') + '.'
            : gs.length + ' double ups merged: ' + gs.map(function (g) { return g[0].text; }).join(', ') + '.';
          toast(msg, { label: 'Undo', fn: function () { Wall(undo).catch(failed); } });
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
    toast('On the list: ' + tw.text + (up.qty || tw.qty ? ', ' + (up.qty || tw.qty) : '') + '.', { label: 'Add anyway', fn: function () {
      if (changed) supd(itemRef(dte, tw.id), prev).catch(failed);
      var made = newItem(Object.assign({}, data, { dupOk: true }));
      made.catch(failed);
      if (after) after();
      addedToast(data.station, dte, made.id);
    } });
  }
  /* Functions (22 Oct 2026): a function's platter lines (fn, written by js/fnedit.js) sit on their own highlighted tab,
     never mixed into All or the day's count, so the daily prep reads as before. FN_TAB is that tab (no section has an @). */
  var FN_TAB = '@fn';
  function inTab(x) { if (S.tab === FN_TAB) return !!x.fn; if (x.fn) return false; return !S.tab || (x.station || '') === S.tab || (x.also || []).indexOf(S.tab) >= 0; }
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
    if (!S.section.trim() && x.section && !mySec()) S.section = x.section;
    draw();
    var el = S.root && S.root.querySelector('[data-k="p-text"]'); if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {} }
  }
  /* ---------- usage and speed counts (22 Oct 2026, review: measure whether the smart features help) ----------
     Each phone counts, for today only: per smart feature, whether it had something to show (s: 0 or 1), how often it was
     taken (t) and how often it was put away (d, Not needed or Hide); and the speed of this phone (pf: how long the first
     page took, and the slowest tap of each visit, in buckets). No names, no text, no screens: counts only. Kept in
     lk.daily (out of date at the next kitchen day: then it is sent as one record daily/<day>_<phone tag> through W(),
     and started again). The nightly job adds the records into summary/usage and deletes them after 7 days.
     A count that cannot be sent waits on the phone for the next open (at most 7 days, then it is dropped). */
  var DAILY_FEATS = ['quick', 'usual', 'ordfill', 'fnneed', 'checks'];
  var LCP_B = [500, 1000, 2500, 4000], TAP_B = [50, 100, 200, 500];   // the third edge is Google's target: 2.5 s, 200 ms
  var dailyMem = null;
  function dailyGet() {
    if (dailyMem && dailyMem.day === dayNow()) return dailyMem;
    var d = null; try { d = JSON.parse(lsGet('lk.daily') || 'null'); } catch (e) {}
    if (!d || typeof d !== 'object' || !d.tag) d = { tag: Math.random().toString(36).slice(2, 10), day: dayNow(), sg: {}, pf: {} };
    if (d.day !== dayNow()) { if (d.day >= shift(dayNow(), -7) && (Object.keys(d.sg || {}).length || Object.keys(d.pf || {}).length)) { try { lsSet('lk.daily.out', JSON.stringify(d)); } catch (e) {} } d = { tag: d.tag, day: dayNow(), sg: {}, pf: {} }; lsSet('lk.daily', JSON.stringify(d)); }
    dailyMem = d; return d;
  }
  function dailySave() { if (dailyMem) lsSet('lk.daily', JSON.stringify(dailyMem)); }
  // s: had something to show today (once a day), t: taken, d: put away
  function sg(f, k) {
    if (DAILY_FEATS.indexOf(f) < 0) return;
    var d = dailyGet(), e = d.sg[f] = d.sg[f] || { s: 0, t: 0, d: 0 };
    if (k === 's') { if (e.s) return; e.s = 1; } else e[k] = (e[k] || 0) + 1;
    dailySave();
  }
  function bucket(v, edges) { var i = 0; while (i < edges.length && v >= edges[i]) i++; return i; }
  function pfAdd(name, v, edges) {
    var d = dailyGet(), a = d.pf[name] = d.pf[name] || edges.concat([0]).map(function () { return 0; });
    a[bucket(v, edges)]++; dailySave();
  }
  // yesterday's (or older, up to 7 days) counts go out once, through W(), when someone is signed in
  function dailyFlush() {
    var out = null; try { out = JSON.parse(lsGet('lk.daily.out') || 'null'); } catch (e) {}
    if (!out || !S.authed || !fb || !/^\d{4}-\d{2}-\d{2}$/.test(out.day || '') || waiting('daily')) return;
    if (out.day < shift(dayNow(), -7)) { lsSet('lk.daily.out', ''); return; }
    var id = out.day + '_' + String(out.tag).replace(/[^a-z0-9]/g, '').slice(0, 12);
    W([['set', docRef('daily', id), { day: out.day, tag: String(out.tag).slice(0, 12), sg: out.sg || {}, pf: out.pf || {}, at: now() }]])
      .then(function () { lsSet('lk.daily.out', ''); }, function () { retryLater('daily'); });
  }
  // the speed of this phone: the first page's largest paint, and the slowest tap of each visit (Event Timing)
  (function () {
    if (!window.PerformanceObserver) return;
    var worst = 0, sent = false;
    try { new PerformanceObserver(function (l) { var es = l.getEntries(), e = es[es.length - 1]; if (e && !sent) { sent = true; pfAdd('lcp', e.startTime, LCP_B); } }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}
    try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { if (e.interactionId && e.duration > worst) worst = e.duration; }); }).observe({ type: 'event', durationThreshold: 16, buffered: true }); } catch (e) {}
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && worst) { pfAdd('tap', worst, TAP_B); worst = 0; } });
  })();
  function quickAdd(i) {
    var x = (S.quick || [])[i];
    if (!x || !can('add')) return;
    sg('quick', 't');
    oneTap(x.text, mySec() || x.section);
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
  /* The book's own records: book/index and book/matches. The rules allow them by name only, so a query on the whole
     book collection is refused; read the two by name instead (2 reads, on a tap). Missing ones are left out. */
  var BOOK_DOCS = ['index', 'matches'];
  function bookDocs(pin) {
    var f = fb.fs;
    return Promise.all(BOOK_DOCS.map(function (id) { return f.getDoc(f.doc(fb.db, 'kitchens', pin, 'book', id)); }))
      .then(function (l) { return l.filter(function (sn) { return sn.exists(); }); });
  }
  /* Owner backup: everything the book holds, as one JSON file (PIN fingerprints left out). */
  function exportAll() {
    if (!fb || S.exporting) return;
    S.exporting = 'Reading the data...'; draw();
    var f = fb.fs, out = { exportedAt: new Date(now()).toISOString(), config: null, days: {}, orders: {}, waste: {}, wasteReviews: {}, activity: [], sections: [], learned: [], ordlearned: [], learnlog: [], misses: [], notes: [], notesSeen: {}, minutes: [], minutesHist: {}, minutesSigns: {}, pins: [], book: [], recipes: [], recipesHist: {}, drawings: [], drawingsHist: {}, drawtpl: [], drawlib: [] };
    function grab(sn) { return sn.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }); }
    // a refused or failed read names its part, so the message says what could not be read
    var part = '', left = [];
    /* A part the rules refuse (permission denied) is left out and named in the message, so one part that is not
       published yet (summary, 22 Oct 2026) does not stop the whole backup. Any other failure (no signal) still stops it. */
    function all(name) {
      part = name;
      return f.getDocs(colRef(name)).then(grab, function (e) { if (e && e.code === 'permission-denied') { left.push(name); return []; } throw e; });
    }
    /* the records under each note (who has seen it) and each minutes (earlier versions, sign-offs): one small query each, kept by the note's or the minutes' id */
    function subs(list, top, name, into) {
      part = top + ' ' + name;
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
      .then(function () { return all('summary'); }).then(function (r) { out.summary = r; })
      .then(function () { return all('daily'); }).then(function (r) { out.daily = r; })
      .then(function () { return all('misses'); }).then(function (r) { out.misses = r; })
      .then(function () { return all('views'); }).then(function (r) { out.views = r; })
      .then(function () { return all('guides'); }).then(function (r) { out.guides = r; })
      .then(function () { return all('mail'); }).then(function (r) { out.mail = r; return all('mailstat'); }).then(function (r) { out.mailstat = r; })
      .then(function () { return all('drinks'); }).then(function (r) { out.drinks = r; })
      .then(function () { return all('shifts'); }).then(function (r) { out.shifts = r; })
      .then(function () { part = 'book'; return bookDocs(S.pin); }).then(function (l) { out.book = l.map(function (d) { var x = d.data(); x.id = d.id; return x; }); return all('recipes'); }).then(function (r) { out.recipes = r; return subs(r, 'recipes', 'hist', out.recipesHist); })
      .then(function () { return all('drawings'); }).then(function (r) { out.drawings = r; return subs(r, 'drawings', 'hist', out.drawingsHist); })
      .then(function () { return all('drawtpl'); }).then(function (r) { out.drawtpl = r; return all('drawlib'); }).then(function (r) { out.drawlib = r; })
      .then(function () { out.functionsHist = {}; return all('functions'); }).then(function (r) { out.functions = r; return subs(r, 'functions', 'hist', out.functionsHist); })
      .then(function () { return all('fncontact'); }).then(function (r) { out.fncontact = r; return all('fnsent'); }).then(function (r) { out.fnsent = r; })
      .then(function () { S.exporting = 'Reading shift pings and minutes...'; draw(); return all('notes'); }).then(function (r) { out.notes = r; return subs(r, 'notes', 'seen', out.notesSeen); })
      .then(function () { return all('minutes'); }).then(function (r) { out.minutes = r; return Promise.all([subs(r, 'minutes', 'hist', out.minutesHist), subs(r, 'minutes', 'signs', out.minutesSigns)]); })
      .then(function () { return all('pinset'); }).then(function (r) { out.pins = r.map(function (x) { return { id: x.id, name: x.name, setAt: x.setAt }; }); })
      .then(function () {
        var i = 0, n = 0;
        function next() {
          if (i >= dates.length) return;
          var chunk = dates.slice(i, i + 20); i += 20;
          part = 'past days'; S.exporting = 'Reading days ' + Math.min(i, dates.length) + ' of ' + dates.length + '...'; draw();
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
        S.exporting = ''; toast('Backup saved: ' + n + (n === 1 ? ' line' : ' lines') + ' from ' + dn + (dn === 1 ? ' day, ' : ' days, ') + nn + (nn === 1 ? ' shift ping' : ' shift pings') + ' and minutes from ' + mn + (mn === 1 ? ' meeting.' : ' meetings.') + (left.length ? ' Left out, the rules do not allow it yet: ' + left.join(', ') + '.' : ''), null, left.length ? 10000 : undefined);
      }).catch(function () { S.exporting = ''; toast('Could not read everything' + (part ? ' (stopped at ' + part + ')' : '') + '. Check the connection and try again.', null, 8000); });
  }
  /* Owner only: copy everything under the current kitchen PIN to a new one, then switch this device over.
     The security rules must already allow the new PIN (see firestore.rules) or the copy is refused. */
  function movePin() {
    var box = S.root.querySelector('#a-newpin'), np = box ? box.value.trim() : '';
    /* only the head chef (Google account) changes the kitchen PIN; the admin panel is for the head chef only, and this checks again */
    if (S.moving || !fb || S.level !== 'owner' || !S.user) return;
    if (!/^\d{4}$/.test(np)) { S.moveMsg = 'The new PIN is exactly 4 digits.'; draw(); return; }
    if (np === S.pin) { S.moveMsg = 'That is the PIN already in use.'; draw(); return; }
    var box2 = S.root.querySelector('#a-newpin2');
    if (!box2 || box2.value.trim() !== np) { S.moveMsg = 'The two PINs do not match. Type the new PIN again.'; draw(); return; }
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
      .then(function () { return copyCol('learned'); }).then(function () { return copyCol('ordlearned'); }).then(function () { return copyCol('learnlog'); }).then(function () { return copyCol('summary'); }).then(function () { return copyCol('daily'); }).then(function () { return copyCol('misses'); }).then(function () { return copyCol('views'); })
      .then(function () { return copyCol('notes'); }).then(function () { return copyCol('minutes'); }).then(function () { return copySub('minutes', 'hist'); })
      .then(function () { return copySub('minutes', 'signs', true); }).then(function () { return copySub('notes', 'seen', true); })
      .then(function () { return copyCol('guides'); }).then(function () { return copySub('guides', 'pages'); })
      .then(function () { return copyCol('mail'); }).then(function () { return copyCol('mailstat'); }).then(function () { return copyCol('drinks'); }).then(function () { return copyCol('shifts'); })
      .then(function () { return bookDocs(old).then(function (l) { n += l.length; return Promise.all(l.map(function (d) { return f.setDoc(nd('book', d.id), d.data()); })); }); }).then(function () { return copyCol('recipes'); }).then(function () { return copySub('recipes', 'hist'); })
      .then(function () { return copyCol('drawings'); }).then(function () { return copySub('drawings', 'hist'); })
      .then(function () { return copyCol('drawtpl'); }).then(function () { return copyCol('drawlib'); })
      .then(function () { return copyCol('functions'); }).then(function () { return copySub('functions', 'hist'); }).then(function () { return copyCol('fncontact'); }).then(function () { return copyCol('fnsent'); })
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
        S.pin = np; lsSet('lk.prep.pin', np); S.items = []; S.learned = []; S.lists = null; S.learnFor = ''; S.sections = []; S.activity = []; gForget();
        stopLive(); S.rolledFor = ''; lsSet('lk.prep.rolled', ''); S.learnRan = false; S.weekAt = 0; S.stats = null;
        connect();
      }).catch(function (e) { S.moving = false; S.moveMsg = e && e.code === 'permission-denied' ? 'The rules do not allow the new PIN yet. Nothing was changed on the old PIN.' : 'Stopped part way. Nothing was changed on the old PIN, so it is safe to try again.'; draw(); });
  }
  function hideLearned(id, hidden) {
    var e = S.learned.filter(function (x) { return x.id === id; })[0], ids = (e && e.ids) || [id];
    W(ids.map(function (i) { return ['set', docRef('learned', i), { hidden: hidden }, true]; })).catch(failed);
    // the list is kept for the day, so this phone's copy is patched (other phones see it from tomorrow's read)
    S.learned.forEach(function (x) { if (x.id === id) x.hidden = hidden; }); if (S.learnFor) learnSave(); draw();
  }
  var LEARN_DAYS = 90;   // how far back the nightly learning reads
  /* Tab and Shift+Tab stay inside an open popup: from the last control back to the first and the other way, and focus
     that has slipped outside comes back in. Only controls that can be seen count. */
  function trapTab(e, box, sel) {
    var f = Array.prototype.filter.call(box.querySelectorAll(sel || 'button:not([disabled]), a[href]'), function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1], out = !box.contains(document.activeElement);
    if (e.shiftKey && (document.activeElement === first || out)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || out)) { e.preventDefault(); first.focus(); }
  }
  /* A line written once tomorrow's list was being written is meant for the next day. When it moves onto that day it is
     marked ahead and does not count as rolled; only if it is still open after that day does it show as rolled. rolled
     stays the number of copies, so a copy is never counted twice.
     The cut (head chef, 22 Oct 2026): when the night list started that day, the minute after midnight. Clocked from the
     day's own lines when the caller has them (js/learn.js: the biggest batch of 6 or more lines from 15:00), else the
     night the server clocked (summary/learned lists), else the usual time for that weekday, then for any night, else
     the usual time of the last tick, else 20:00. */
  function cutFor(day, lines) {
    var own = lines && window.LK_LEARN ? window.LK_LEARN.listStart(lines, day, T) : null, L = S.lists;
    if (own && own.m >= 0) return own.m;
    if (L) {
      var e = L.days[day], w = L.dow[String(parseYmd(day).getDay())];
      if (e && e.m >= 0) return e.m;
      if (typeof w === 'number') return w;
      if (L.usual >= 0) return L.usual;
    }
    return S.closeMin || 20 * 60;
  }
  function writtenLate(x, day, cut) {
    if (x.rolled || !x.addedAt || T.day(x.addedAt) !== day) return false;
    return T.mins(x.addedAt) >= cut;
  }
  // the rollovers wait for summary/learned (or for its read to fail), so they know when the night list was written
  function learnedIn() { return S.learnFor === S.pin + '|' + dayNow() || waiting('learned'); }
  /* Lines that rolled over before the written-for-tomorrow rule (19 Oct 2026), or on a phone with older code: a copy
     that rolled once is checked against the time its original was written, and marked ahead for everyone if it was
     written after the cut. Once a day per phone, only today's list, no extra reads (the past days are cached). */
  function repairAhead() {
    var today = dayNow();
    if (S.aheadFixed === today || !S.authed || !fb || !can('add') || S.date !== today || S.itemsState !== 'ok' || S.pastFor !== pastTag() || waiting('ahead')) return;
    S.aheadFixed = today;
    var ops = [], cuts = {};
    S.items.forEach(function (x) {
      if (x.rolled !== 1 || x.ahead || x.deleted || !x.from || !x.rolledFrom) return;
      var day = (S.past || {})[x.rolledFrom] || [], src = day.filter(function (y) { return y.id === x.from; })[0];
      if (!(x.rolledFrom in cuts)) cuts[x.rolledFrom] = cutFor(x.rolledFrom, day);
      if (src && writtenLate(src, x.rolledFrom, cuts[x.rolledFrom])) ops.push(['upd', itemRef(today, x.id), { ahead: true, origAt: src.addedAt }]);
    });
    if (ops.length) Wall(ops).catch(function () { S.aheadFixed = ''; retryLater('ahead'); });
  }
  function rolledN(x) { return Math.max(0, (x.rolled || 0) - (x.ahead ? 1 : 0)); }
  /* when a line was first written: a rolled copy keeps it in origAt (0 if it rolled before origAt was kept) */
  function firstAt(x) { return x.rolled ? x.origAt || 0 : x.addedAt || 0; }
  /* the day a rolled line was first written, short: "yesterday", "Mon" within the week, "12 Oct" before that.
     Lines that rolled before origAt was kept only know it when they rolled once. */
  function firstDay(x) {
    var d = x.origAt ? T.day(x.origAt) : x.rolled === 1 ? x.rolledFrom || '' : '', t = dayNow();
    if (!d || d >= t) return '';
    if (d === shift(t, -1)) return 'yesterday';
    return parseYmd(d).toLocaleDateString('en-AU', d >= shift(t, -6) ? { weekday: 'short' } : { day: 'numeric', month: 'short' });
  }
  function sortItems(a, b) { return (urgOf(b) ? 1 : 0) - (urgOf(a) ? 1 : 0) || rolledN(b) - rolledN(a) || (a.addedAt || 0) - (b.addedAt || 0); }

  /* ---------- admin actions ---------- */
  function startDraft() {
    var c = S.config || { people: [] };
    S.draft = JSON.parse(JSON.stringify(draftOf(c)));
    S.draftSnap = JSON.stringify(S.draft);
    S.saveMsg = '';
  }
  /* The staff list changed on another phone while a draft is open (the People tab, or a sous chef's Manage staff).
     A draft with nothing changed yet follows it. One with changes keeps them: when it is saved, only the rows and fields
     this draft touched are carried onto the list as it is now (mergeDraft), so a copy taken when the page opened never
     wipes what someone else saved in the meantime. */
  function draftOf(c) { return { people: c.people || [], showBadges: c.showBadges !== false, staffSee: staffSee(c), kitSecs: c.kitSecs || [] }; }
  function draftBase() { try { return JSON.parse(S.draftSnap || 'null'); } catch (e) { return null; } }
  function refreshDraft() { if (S.draft && !draftDirty()) { var msg = S.saveMsg; startDraft(); S.saveMsg = msg; } }
  function draftStale() {
    var was = draftBase(), c = S.config; if (!S.draft || !was || !c) return false;
    return JSON.stringify(draftOf(c)) !== S.draftSnap;
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
    var m = { people: out, showBadges: d.showBadges !== was.showBadges ? d.showBadges : c.showBadges !== false, staffSee: {}, kitSecs: JSON.stringify(d.kitSecs) !== JSON.stringify(was.kitSecs) ? d.kitSecs : (c.kitSecs || []) }, see = staffSee(c);
    FEATS.forEach(function (f) { var k = f[0]; m.staffSee[k] = (d.staffSee || {})[k] !== (was.staffSee || {})[k] ? d.staffSee[k] : see[k]; });
    return m;
  }
  function staleHint() { return draftStale() && draftDirty() ? '<p class="hint a-stale">The staff list changed on another phone while you were here. Only what you changed is saved on top of it.</p>' : ''; }
  /* sousIds and pingIds are what the rules check. Only the head chef and sous chefs write shift pings (20 Oct 2026: the
     Pings tick for other staff is gone), so pingIds is the same people as sousIds. Everyone else only reads them. */
  function idsFor(people, fn) { return people.filter(function (p) { return p.active !== false && String(p.name).trim() && fn(p); }).map(function (p) { return p.id; }); }
  function isSousP(p) { return p.role === 'sous' || p.role === 'head'; }
  /* A chef for what the page lets this person do: the rules decide from sousIds and headId, so the page asks the same
     lists. A role a sous chef changed that the head chef has not kept yet does not count (22 Oct 2026; before, it opened
     the head chef's tools on the Google device). A book whose lists were never seeded goes by the role. */
  function chefP(p) {
    var c = S.config || {};
    if (!p) return false;
    if (c.headId && p.id === c.headId) return true;
    return c.sousIds ? c.sousIds.indexOf(p.id) >= 0 : isSousP(p);
  }
  function canPingP(p) { return isSousP(p); }
  /* Manage functions: the tick in the People tab, nothing else (not the role, not being head chef) */
  function fnP(p) { return !!p.fn; }
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
  /* When a person may set their first PIN (22 Oct 2026, config/main pinOpen: { id: until, kitchen clock ms }). The rules
     let a PIN be set only before that time, so nobody can take a new person's name by setting a PIN first. A person on
     the list with no entry yet (someone just added, or everyone already on the list when this came in) gets 7 days, so a
     new starter sets theirs on their first shift. An entry is never given again by itself once it has run out: Reset PIN
     (30 minutes) opens it again. Entries for people taken off the list are dropped. */
  var PIN_OPEN_DAYS = 7, PIN_RESET_MIN = 30;
  function pinOpenFor(ids) {
    var old = (S.config && S.config.pinOpen) || {}, out = {};
    ids.forEach(function (id) { out[id] = typeof old[id] === 'number' ? old[id] : now() + PIN_OPEN_DAYS * 86400000; });
    return out;
  }
  // a chef opening the admin panel or Manage staff writes the windows of anyone on the list without one (one small write)
  function seedPinOpen() {
    var c = S.config, ids = (c && c.staffIds) || [];
    if (!c || !ids.length || !(S.user || isSous()) || ids.every(function (id) { return typeof (c.pinOpen || {})[id] === 'number'; })) return;
    var po = pinOpenFor(ids);
    (S.user ? track(fb.fs.setDoc(cfgDoc(), { pinOpen: po }, { merge: true })) : sset(cfgDoc(), { pinOpen: po }, true)).catch(function () {});
  }
  function saveConfig(cfg, hold) {
    var clean = {
      people: cfg.people.filter(function (p) { return String(p.name).trim(); }).map(function (p) {
        return { id: p.id, name: String(p.name).trim().slice(0, 40), role: p.role || 'staff', add: !!p.add, tick: !!p.tick, del: !!p.del, ping: !!p.ping, fn: !!p.fn, active: p.active !== false };
      }),
      kitSecs: ksClean(cfg.kitSecs !== undefined ? cfg.kitSecs : ((S.config && S.config.kitSecs) || [])), showBadges: cfg.showBadges !== false, staffSee: staffSee(cfg),
      sousIds: hold ? (hold.sousIds || []) : idsFor(cfg.people, isSousP), pingIds: hold ? (hold.pingIds || []) : idsFor(cfg.people, canPingP),
      fnIds: hold ? (hold.fnIds || []) : idsFor(cfg.people, fnP),
      staffIds: idsFor(cfg.people, anyP), headId: headIdOf(cfg.people), pinOpen: pinOpenFor(idsFor(cfg.people, anyP)),
      updated: now(), updatedBy: S.user ? 'Head chef' : (who() ? who().name : '')   // never the Google email: anyone with the kitchen PIN can read this record
    };
    /* a sous chef may only change the people list and who may set a PIN, so only those are sent (merged): the rules refuse any other field */
    return sdk().then(function () { return S.user ? track(fb.fs.setDoc(cfgDoc(), clean)) : sset(cfgDoc(), { people: clean.people, staffIds: clean.staffIds, pinOpen: clean.pinOpen, updated: clean.updated, updatedBy: clean.updatedBy }, true); }).then(function () { return clean; });
  }
  function adminSave() {
    S.busy = true; S.saveMsg = 'Saving...'; draw();
    saveConfig(mergeDraft()).then(function () { S.busy = false; startDraft(); S.saveMsg = 'Saved. Everyone sees the changes now.'; draw(); },
      function (e) { S.busy = false; S.saveMsg = e && e.code === 'permission-denied' ? 'Not allowed to change these settings.' : 'Could not save. Check the connection.'; draw(); });
  }
  function resetPin(id) {
    if (!arm('pin:' + id)) return;
    var rb = fb.fs.writeBatch(fb.db); rb.delete(docRef('staffpins', id)); rb.delete(docRef('pinset', id));
    var po = {}; po[id] = now() + PIN_RESET_MIN * 60000; rb.set(cfgDoc(), { pinOpen: po }, { merge: true });   // they may set a new one for 30 minutes
    var who2 = (people().filter(function (x) { return x.id === id; })[0] || {}).name || 'Their';
    track(rb.commit()).then(function () { toast(who2 + (who2 === 'Their' ? ' PIN is reset.' : '\'s PIN is reset.') + ' They set a new one next time they sign in.'); }, function (e) { toast(e && e.code === 'permission-denied' ? 'Could not reset. Sign in as the admin.' : 'Could not reset. Check the connection and try again.', { label: 'OK', fn: function () {} }, 12000); });
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
     them in step with the roles when the admin panel opens. A sous chef can change a role in the people
     list (the rules cannot tell one field of a person from another), so when the roles and the lists disagree the
     panel shows what changed and asks (idChanges, the card at the top of the admin panel) instead of saving it quietly.
     staffIds follows the people list by itself: a sous chef's staff page sends it too. */
  function sameIds(c, have, fn) { return (have || []).slice().sort().join(',') === idsFor(c.people, fn).sort().join(','); }
  function idChanges(c) {
    var out = [];
    if (!c || !c.people) return out;
    c.people.forEach(function (p) {
      if (p.active === false || !String(p.name).trim()) return;
      if (c.sousIds && c.pingIds) {   // a list never seeded yet: nothing to ask about
        var sous = c.sousIds.indexOf(p.id) >= 0;
        if (isSousP(p) !== sous) out.push({ p: p, sous: isSousP(p), what: isSousP(p) ? 'is now marked Sous chef' : 'is no longer marked Sous chef' });
      }
      // Manage functions is given only by the head chef's Google account: a tick changed anywhere else is asked about
      var fn = (c.fnIds || []).indexOf(p.id) >= 0;
      if (fnP(p) !== fn) out.push({ p: p, fn: fnP(p), what: fnP(p) ? 'is now ticked for Functions' : 'is no longer ticked for Functions' });
    });
    return out;
  }
  function seedIds() {
    var c = S.config; if (!c || !c.people) return;
    seedPinOpen();
    if (sameIds(c, c.sousIds, isSousP) && sameIds(c, c.pingIds, canPingP) && sameIds(c, c.staffIds, anyP) && sameIds(c, c.fnIds, fnP)) return;
    var asking = idChanges(c).length > 0;
    if (asking && sameIds(c, c.staffIds, anyP)) return;
    saveConfig({ people: c.people, showBadges: c.showBadges, staffSee: c.staffSee }, asking ? { sousIds: c.sousIds || [], pingIds: c.pingIds || [], fnIds: c.fnIds || [] } : null).catch(function () {});
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
      if ('fn' in x) { p.fn = !x.fn; return; }
      p.role = x.sous ? 'staff' : 'sous'; var r = ROLES[p.role]; p.add = r.add; p.tick = r.tick; p.del = r.del; p.ping = r.ping;
    });
    S.idBusy = true; S.idMsg = 'Saving...'; draw();
    saveConfig({ people: people, showBadges: c.showBadges, staffSee: c.staffSee }).then(function () { S.idBusy = false; S.idMsg = ''; startDraft(); draw(); },
      function () { S.idBusy = false; S.idMsg = 'Could not save. Check the connection.'; draw(); });
  }
  /* ---------- the last 14 days, read once a day per phone ----------
     Past days hardly change, so they are read once a day and kept on the phone. Today comes from the live list.
     The weekly badges, usual amounts, Start here, Due today, the pace card and the close-out nudge all work from this. */
  var PAST_DAYS = 14, PAST_KEYS = ['text', 'station', 'qty', 'addedBy', 'addedById', 'addedAt', 'done', 'doneBy', 'doneById', 'doneAt', 'rolled', 'ahead', 'deleted', 'urgent', 'fn'];
  function pastTag() { return S.pin + '|' + dayNow() + '|3'; }   // |3: copies keep fn (22 Oct 2026), so older copies are read again once
  /* A change to a past day reaches the other phones (coding rules, 22 Oct 2026). Past days are kept on each phone for the
     day (lk.past, lk.ord.hist, the admin's lk.st.got). When the head chef or a sous chef ticks, unticks, removes or puts
     back a line on a past day, the book stamps config/main.pastEdit (p for prep, o for orders) with the time. Every phone
     already listens to config/main, so this costs no new reads; a phone whose copy is older than the stamp reads the past
     days again when it next needs them (prep: up to 14 days of lines). */
  var pastMarkAt = {};
  function markPast(kind, date) {
    if (!fb || date >= dayNow() || !canBrowse() || Date.now() - (pastMarkAt[kind] || 0) < 5000) return;
    pastMarkAt[kind] = Date.now();
    var v = {}; v[kind] = now();
    sset(cfgDoc(), { pastEdit: v }, true).catch(function () {});   // before the rules allow it (or no signal) it is only a hint lost
  }
  function pastStamp(kind) { var pe = (S.config && S.config.pastEdit) || {}; return +pe[kind] || 0; }
  /* A ping for today was saved, changed or removed (22 Oct 2026): the book stamps config/main.pastEdit.n, so the other
     phones read the pings again now (one pings query each, on the config listener every phone already has) instead of
     after 30 minutes away. A ping set at 13:00 for 15:00 then pops up on time on a tablet that read its pings at 06:00.
     Only for today's pings, so a ping for next week costs nothing. */
  var pingMarkAt = 0;
  function markPings() {
    if (!fb || Date.now() - pingMarkAt < 5000) return;
    pingMarkAt = Date.now();
    var v = { n: now() }; S.nMine = v.n;
    sset(cfgDoc(), { pastEdit: v }, true).catch(function () {});   // before the rules allow it (or no signal) it is only a hint lost
  }
  function pastCheck() {
    // once per stamp, so a phone whose clock is a little behind never reads again on every config change
    var ns = pastStamp('n');
    if (S.notesFor && ns > (S.notesRead || 0) && ns !== S.nMine && ns !== S.nStampDone) { S.nStampDone = ns; loadNotes(true); }
    if (S.pastFor && pastStamp('p') > (S.pastAt || 0)) { S.pastFor = ''; lsSet('lk.past', ''); draw(); }
    if (S.ordHistFor && pastStamp('o') > (S.ordHistAt || 0)) { S.ordHistFor = ''; lsSet('lk.ord.hist', ''); draw(); }
  }
  function loadPast() {
    var today = dayNow(), tag = pastTag();
    if (!fb || S.pastBusy || S.pastFor === tag) return;
    try { var c = JSON.parse(lsGet('lk.past') || 'null'); if (c && c.tag === tag && c.days && (c.at || 0) >= pastStamp('p')) { S.past = c.days; S.pastFor = tag; S.pastAt = c.at || 0; pastDerive(); return; } } catch (e) {}
    S.pastBusy = true;
    var at = now();
    var dates = [], i;
    for (i = 1; i <= PAST_DAYS; i++) dates.push(shift(today, -i));
    Promise.all(dates.map(function (d) { return fb.fs.getDocs(itemsCol(d)).then(function (sn) { return [d, sn.docs.map(function (x) { var v = x.data(), o = { id: x.id }; PAST_KEYS.forEach(function (k) { if (v[k] != null && v[k] !== '' && v[k] !== false && v[k] !== 0) o[k] = v[k]; }); return o; })]; }, function () { return [d, null]; }); })).then(function (res) {
      var days = {}, ok = true;
      res.forEach(function (r) { if (r[1] === null) ok = false; else days[r[0]] = r[1]; });
      S.past = days; S.pastFor = tag; S.pastAt = at; S.pastBusy = false;
      if (ok) lsSet('lk.past', JSON.stringify({ tag: tag, days: days, at: at }));
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
  /* Pace: how much of the list is usually ticked by this time of day, against today. The day's own lines only, like the
     header's "1 of 8 done": a function's platter lines are on their own tab. */
  function pace() {
    var mins = T.mins(), dn = T.dow(), all = [], same = [];
    pastDays(PAST_DAYS).forEach(function (e) {
      var l = e[1].filter(function (x) { return !x.deleted && !x.fn; }); if (l.length < 5) return;
      var by = l.filter(function (x) { if (!x.done || !x.doneAt) return false; return T.mins(x.doneAt) <= mins; }).length;
      var share = by / l.length; all.push(share); if (parseYmd(e[0]).getDay() === dn) same.push(share);
    });
    var src = same.length >= 2 ? same : all;
    if (src.length < 3 && !(same.length >= 2)) return null;
    src.sort(function (a, b) { return a - b; });
    var usual = src[Math.floor(src.length / 2)], live = S.items.filter(function (x) { return !x.deleted && !x.fn; }), done = live.filter(function (x) { return x.done; }).length;
    if (live.length < 3) return null;
    return { usual: usual, today: done / live.length, done: done, n: live.length, sameDay: same.length >= 2 };
  }
  function hhmm(m) { return (m < 600 ? '0' : '') + Math.floor(m / 60) + ':' + (m % 60 < 10 ? '0' : '') + (m % 60); }
  /* When the kitchen usually closes, for Closing soon: when tomorrow's list is usually written on this weekday, then on
     any night (summary/learned, which every page reads, so the order list has it too), else the usual time of the last
     tick (the past days, read on the prep list), else 0: the book does not know yet. */
  function closingMin() {
    var L = S.lists, w = L ? L.dow[String(T.dow())] : null;
    if (typeof w === 'number') return w;
    if (L && L.usual >= 0) return L.usual;
    return S.closeMin || 0;
  }
  /* Closing soon, on today's prep list and order list (head chef, 22 Oct 2026: Log waste comes up on both) from an hour
     before closingMin(). live: the prep list's lines, to say what will roll over; none on the order list. One Hide for
     today (lk.closeout) hides it on both. The prep list draws it twice, above the lines and at the top of Handy (listHTML(),
     CSS shows one), so it has no id and every copy uses the same close-hide tap. */
  function closeoutHTML(live, date) {
    var today = dayNow(), at = closingMin();
    if (date !== today || !at || !can('add') || lsGet('lk.closeout') === today || T.mins() < at - 60) return '';
    var open = live ? live.filter(function (x) { return !x.done; }).length : 0;
    return '<div class="nb-flag nb-close"><span class="nb-sl">Closing soon</span><p>' + (open ? open + (open === 1 ? ' line is' : ' lines are') + ' still open and will roll to tomorrow. Mark what matters urgent, and log' : 'Log') + ' any waste before you go.</p>' +
      '<div class="btn-row"><a class="btn" href="#/waste">Log waste</a><button type="button" class="btn" data-p="close-hide">Hide for today</button></div></div>';
  }
  var MEDAL = { 1: '#C9971C', 2: '#8E959C', 3: '#A8693A' };
  function isSous() { var p = me(); return !!(p && chefP(p)); }
  /* shift pings: the head chef and sous chefs write them, everyone else reads them (20 Oct 2026) */
  function canPing() { var p = me(); return !!(p && canPingP(p)); }
  function ordinal(n) { return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'); }
  function medal(rank) {
    return '<svg class="nb-medal" viewBox="0 0 26 26" width="26" height="26" aria-hidden="true"><circle cx="13" cy="13" r="12" fill="' + (MEDAL[rank] || '#8E959C') + '"/><circle cx="13" cy="13" r="9" fill="none" stroke="#fff" stroke-width="1.5" opacity=".8"/><text x="13" y="17.5" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" font-family="Barlow Condensed, sans-serif">' + rank + '</text></svg>';
  }
  function badgesOn() { return !S.config || S.config.showBadges !== false; }
  /* The top 3 for ticks over the last 7 days, and the person on the phone's own place when they are not among them
     (23 Oct 2026: it was on the "Writing as" line as well, under another name). */
  function badgeStrip() {
    if (!badgesOn() || !S.week || !S.week.length) return '';
    var top = S.week.filter(function (x) { return x.rank <= 3; }).slice(0, 5), p = me();
    var mine = p ? S.week.filter(function (x) { return x.name === p.name; })[0] : null;
    function n(x) { return ordinal(x.rank) + ', ' + x.n + (x.n === 1 ? ' tick' : ' ticks'); }
    return '<div class="nb-badges" aria-label="Top tickers, last 7 days"><span class="nb-bl">Top tickers, last 7 days</span>' +
      top.map(function (x) { return '<span class="nb-bd">' + medal(x.rank) + '<span><strong>' + esc(x.name) + '</strong> <span class="nb-bn">' + n(x) + '</span></span></span>'; }).join('') +
      (mine && top.indexOf(mine) < 0 ? '<span class="nb-bd nb-bme"><span><strong>You:</strong> <span class="nb-bn">' + n(mine) + '</span></span></span>' : '') + '</div>';
  }

  /* ---------- insights for the owner: numbers and charts from the last 30 days of lines ---------- */
  function loadStats(force) {
    if (!fb || S.configState !== 'ok') return;
    if (S.stats && (S.stats.loading || !force)) return;
    S.stats = { loading: true, days: {} };
    var today = dayNow(), dates = [], i;
    for (i = 0; i < 60; i++) dates.push(shift(today, -i));
    Promise.all(dates.map(function (d) { return pastRead(itemsCol(d), 'd/' + d, d, false, force).then(function (s) { return [d, s.docs.map(function (x) { return x.data(); })]; }, function () { return [d, []]; }); })).then(function (res) {
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
  /* When tomorrow's list is written (head chef, 22 Oct 2026): what the server clocked (summary/learned lists, read with
     the learned list, no read of its own), so the head chef can see the time the rollover goes by. */
  function listTimesHTML() {
    var L = S.lists, n = window.LK_LEARN || { MIN: 6, FROM: 900 };
    var head = '<section class="set-block"><span class="label">When tomorrow\'s list is written</span><span class="hint">Every night at 03:00 the book clocks when the team wrote the next day\'s prep list: the biggest batch of ' + n.MIN + ' or more lines written close together, from ' + hhmm(n.FROM) + '. Lines written before it roll over and show Rolled. Lines written from then on are tomorrow\'s list and look like normal lines. The order list goes by the same time.</span>';
    var fall = S.closeMin ? 'the usual last tick, ' + hhmm(S.closeMin) : '20:00';
    if (!L || L.usual < 0) return head + '<p class="hint">Not clocked yet: it needs 3 nights with a list' + (L ? ' (' + L.n + ' so far)' : '') + '. Until then the book goes by the list it finds in each night\'s lines, or ' + fall + '.</p></section>';
    var nights = Object.keys(L.days).sort().reverse().slice(0, 7).map(function (d) {
      var e = L.days[d];
      return '<tr><th scope="row">' + esc(dayShort(d)) + '</th><td>' + (e.m >= 0 ? esc(hhmm(e.m)) : 'No list found') + '</td><td>' + (e.m >= 0 ? e.n + (e.n === 1 ? ' line' : ' lines') : '') + '</td></tr>';
    }).join('');
    return head + '<div class="a-tiles"><div class="a-tile"><strong>' + esc(hhmm(L.usual)) + '</strong><span>usual start, ' + L.n + ' of the last ' + Object.keys(L.days).length + ' nights</span></div></div>' +
      '<h3 class="a-ch-h">Each weekday</h3><span class="hint">The night the list is written on. A weekday shows once it has 2 nights with a list.</span>' +
      '<div class="a-scroll"><table class="a-table"><thead><tr>' + DOWS.map(function (d) { return '<th scope="col">' + d[1] + '</th>'; }).join('') + '</tr></thead><tbody><tr>' +
      DOWS.map(function (d) { var m = L.dow[String(d[0])]; return '<td>' + (typeof m === 'number' ? esc(hhmm(m)) : '') + '</td>'; }).join('') + '</tr></tbody></table></div>' +
      (nights ? '<h3 class="a-ch-h">The last nights</h3><div class="a-scroll"><table class="a-table"><thead><tr><th scope="col">Night</th><th scope="col">List started</th><th scope="col">Lines in it</th></tr></thead><tbody>' + nights + '</tbody></table></div>' : '') + '</section>';
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
    return chips + '<div class="a-tablewrap" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table class="a-table a-plain sk-t"><thead><tr><th scope="col">Section</th>' + DOWN.map(function (x) { return '<th scope="col">' + x + '</th>'; }).join('') + '</tr></thead><tbody>' +
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
    var lim = Math.max(step, s.shown), shown = rows.slice(0, lim), left = all - shown.length, body;
    if (c.card) body = '<ul class="lv-cards nt-rows">' + shown.map(c.card).join('') + '</ul>';
    else {
      body = '<div class="a-tablewrap lv-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table class="a-table a-plain lv-table' + (c.table ? ' ' + esc(c.table) : '') + '"><thead><tr>' + c.cols.map(function (x) {
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
    else if (shown.length > step) more = '<div class="btn-row lv-more"><button type="button" class="btn" data-p="lv-less" data-lv="' + esc(c.key) + '">Show fewer</button></div>';
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
      '<div class="a-tablewrap cal-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table class="a-table a-plain cal"><thead><tr>' + DOWN.map(function (x) { return '<th scope="col">' + x + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
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
    return head + '<div class="a-tablewrap" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table class="a-table a-plain hr"><thead><tr><th scope="col"></th>' + hrs.map(function (h) { return '<th scope="col">' + (h < 10 ? '0' : '') + h + '</th>'; }).join('') + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
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
  /* ---------- export (Insights, Team, Waste) ---------- */
  function rangeText(n) { var t = dayNow(); return n + ' days, ' + dayShort(shift(t, -(n - 1))) + ' to ' + dayShort(t); }
  function toolsHTML(kind, title) {
    var n = S.statsRange;
    return '<div class="a-tools"><div><h3 class="a-title">' + esc(title) + '</h3><span class="hint">' + esc(rangeText(n)) + ', compared with the ' + n + ' days before.</span></div>' +
      // the export buttons fold into one Export menu, so the first screen is the numbers, not the buttons
      '<details class="a-tbtns a-export"><summary class="btn">Export</summary><div class="btn-row"><button type="button" class="btn" data-p="csv" data-v="' + kind + '">Download CSV</button></div></details></div>' +
      (S.stats && S.stats.at ? '<p class="hint a-upd">Updated ' + esc(clock(S.stats.at)) + '. Refresh reads the newest.</p>' : '');
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
    return '<h3 class="a-ch-h">Time to tick by section</h3><span class="hint">From writing a line to ticking it. "Slow days" is how long the slowest 1 in 10 took.</span><div class="a-tablewrap" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table class="a-table a-plain"><thead><tr><th scope="col">Section</th><th scope="col">Lines</th><th scope="col">Typical</th><th scope="col">Slow days</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><th scope="row">' + esc(r.k) + '</th><td>' + r.n + '</td><td>' + dur(r.med) + '</td><td>' + dur(r.p90) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  var INS_SECS = [['ins-overview', 'Overview'], ['ins-days', 'Days'], ['ins-timing', 'Timing'], ['ins-sections', 'Sections and people'], ['ins-problems', 'Problem lines'], ['ins-book', 'Recipe book'], ['ins-usage', 'Smart features and speed']];
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
    return head +
      '<section class="a-sec">' + secHead(0) + '<div class="a-grid">' + smartHTML(agg, prev, n) + '</div><div class="a-tiles">' + tiles.filter(function (x) { return !(x[0] === 'n/a' || ((x[0] === 0 || x[0] === '0' || x[0] === dur(0)) && !x[2])); }).map(tileHTML).join('') + '</div></section>' +
      '<section class="a-sec">' + secHead(1) + '<div class="a-grid">' + card(calHTML(n), 'full') + card('<h3 class="a-ch-h">Lines each day</h3>' + legend([['Written', CW], ['Ticked off', CT]]) + dailyChart(agg) + tbl, 'full') + '</div></section>' +
      '<section class="a-sec">' + secHead(2) + '<div class="a-grid">' + card(hourHTML(n), 'full') + card(tickBySectionHTML(n)) + card('<h3 class="a-ch-h">Time of day</h3>' + legend([['Written', CW], ['Ticked off', CT]]) + hoursChart(agg)) + '</div></section>' +
      '<section class="a-sec">' + secHead(3) + '<div class="a-grid">' + card('<h3 class="a-ch-h">Load by weekday and section</h3><span class="hint">Which sections are busy on which days. Useful for the roster.</span>' + heatHTML(n), 'full') +
        card('<h3 class="a-ch-h">Sections</h3>' + sectionsChart(agg)) + card('<h3 class="a-ch-h">By person</h3>' + legend([['Written', CW], ['Ticked off', CT]]) + peopleChart(agg) + '<p class="hint">More on people in the Team tab.</p>') + '</div></section>' +
      '<section class="a-sec">' + secHead(4) + '<div class="a-grid">' + card('<h3 class="a-ch-h">Slow and sticky lines</h3><span class="hint">Roll over 3 or more times, usually take 4 hours or more to tick, or keep being removed.</span>' + stickyHTML(n), 'full') +
        card('<h3 class="a-ch-h">Rolled over most often</h3><span class="hint">Lines that were not finished and moved onto the next day.</span>' + rollChart(agg)) + card(fixesHTML(agg)) + '</div></section>' +
      '<section class="a-sec">' + secHead(5) + '<p class="hint a-fnote">Recipe book counts are for everyone and every day: the filters above do not apply here.</p><div class="a-grid">' + card(missesHTML()) + card(viewsHTML()) + '</div></section>' +
      '<section class="a-sec">' + secHead(6) + '<p class="hint a-fnote">From all phones, the last 28 days (summed each night). The filters above do not apply here.</p><div class="a-grid">' + card(usageHTML(), 'full') + '</div></section></section>';
  }
  /* summary/usage (scripts/nightly-learn.mjs): one read when Insights opens, kept for the day in lk.use (out of date at
     the next kitchen day; the head chef's Google account only). */
  var USE_NAMES = { quick: 'Quick add chips', usual: 'Usual amount chips', ordfill: 'Usual order amount filled in', fnneed: 'For the functions (Handy)', checks: 'To check before the functions' };
  function loadUsage() {
    if (S.useFor === dayNow() || S.useBusy || !fb || S.level !== 'owner') return;
    try { var c = JSON.parse(lsGet('lk.use') || 'null'); if (c && c.day === dayNow() && c.data) { S.use = c.data; S.useFor = c.day; return; } } catch (e) {}
    S.useBusy = true;
    fb.fs.getDoc(docRef('summary', 'usage')).then(function (sn) {
      S.use = sn.exists() ? sn.data() : { days: {} }; S.useFor = dayNow(); S.useBusy = false;
      lsSet('lk.use', JSON.stringify({ day: dayNow(), data: S.use })); draw();
    }, function () { S.useBusy = false; });
  }
  function usageHTML() {
    loadUsage();
    var u = S.use, days = u && u.days ? Object.keys(u.days) : [];
    if (!u) return '<p class="hint">Loading...</p>';
    if (!days.length) return '<p class="hint">Nothing counted yet. Phones send their counts once a day, and the nightly job adds them up.</p>';
    var f = {}, lcp = null, tap = null;
    days.forEach(function (d) {
      var x = u.days[d] || {};
      Object.keys(x.sg || {}).forEach(function (k) { var e = x.sg[k] || {}, o = f[k] = f[k] || { s: 0, t: 0, d: 0 }; o.s += +e.s || 0; o.t += +e.t || 0; o.d += +e.d || 0; });
      ['lcp', 'tap'].forEach(function (k) { var a = (x.pf || {})[k]; if (!Array.isArray(a)) return; var o = k === 'lcp' ? (lcp = lcp || a.map(function () { return 0; })) : (tap = tap || a.map(function () { return 0; })); a.forEach(function (v, i) { if (i < o.length) o[i] += +v || 0; }); });
    });
    function share(a, upto) { if (!a) return ''; var t = 0, g = 0; a.forEach(function (v, i) { t += v; if (i < upto) g += v; }); return t ? Math.round(100 * g / t) + '% of ' + t : ''; }
    var rows = Object.keys(USE_NAMES).filter(function (k) { return f[k]; }).map(function (k) { return '<tr><th scope="row">' + esc(USE_NAMES[k]) + '</th><td>' + f[k].s + '</td><td>' + f[k].t + '</td><td>' + f[k].d + '</td></tr>'; }).join('');
    return '<h3 class="a-ch-h">Smart features</h3><span class="hint">Phone-days it had something to show, times it was taken, times it was put away.</span>' +
      (rows ? '<div class="a-tablewrap" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table class="a-table a-plain"><thead><tr><th scope="col">Feature</th><th scope="col">Shown on</th><th scope="col">Taken</th><th scope="col">Put away</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="hint">No smart feature had anything to show yet.</p>') +
      '<h3 class="a-ch-h">Speed on the phones</h3><span class="hint">Field numbers: the first page on screen within 2.5 s, and the slowest tap of a visit within 200 ms (Google\'s targets).</span>' +
      '<p>' + (share(lcp, 3) ? 'First page within 2.5 s: <strong>' + esc(share(lcp, 3)) + '</strong> opens.' : 'No page speeds yet.') + ' ' + (share(tap, 3) ? 'Slowest tap within 200 ms: <strong>' + esc(share(tap, 3)) + '</strong> visits.' : '') + '</p>';
  }



  /* ---------- drawing ---------- */
  var TICK = '<svg viewBox="0 0 26 26" width="26" height="26" aria-hidden="true"><path d="M5 14 L11 20 L22 5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function openLabel() { return { orders: 'Open the order list', waste: 'Open the wastage log', minutes: 'Open the minutes', guides: 'Open the guides', mail: 'Open kitchen mail', admin: 'Open the admin panel' }[S.name] || 'Open the prep list'; }
  function gateHTML() {
    return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Kitchen PIN</h2><p class="hint">' + (S.name === 'admin' ? 'The admin panel needs the kitchen PIN on this device once, then the head chef\'s Google sign-in.' : 'Enter the kitchen PIN to open the prep list, orders, wastage, minutes and guides. This device remembers it.') + '</p>' +
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
    return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Who are you?</h2><p class="hint">' + (S.pending && S.pending.back ? 'Pick your name and type your PIN. Then the book goes back to where you were.' : S.pending ? 'Pick your name and type your PIN. Then it is done for you.' : 'Pick your name. The first time, you choose your own 4-digit PIN to go with it.') + '</p>' +
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
    var by = x.done && x.doneBy ? esc(x.doneBy) + (x.doneAt ? ' ' + clock(x.doneAt) : '') : (rolledN(x) ? (x.origBy ? 'from ' + esc(x.origBy) + (firstDay(x) ? ', ' + firstDay(x) : '') : '') : x.rolled ? esc(x.origBy || '') : (x.addedBy ? esc(x.addedBy) : ''));
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
      '<span class="nb-by">' + (x._unsent ? '<span class="nb-unsent">Not sent</span> ' : '') + '<span class="nb-wrote">' + by + '</span></span>' + (star || link || del ? '<span class="nb-acts">' + star + link + del + (del && !readonly ? moreBtn(x) : '') + '</span>' : '') + '</li>';
  }
  /* The line menu (22 Oct 2026, Option B): on a phone, Remove (or Put back) and who wrote the line move behind a ⋯ on
     the line, so the item and the amount lead. On a laptop everything stays in the line and the ⋯ is not shown. The sheet
     is appended to document.body (redraws of #prep-root leave it alone), dims the page, and closes on the backdrop,
     Cancel and Escape; its clicks use data-lm. Remove in the sheet taps the line's own Remove, so Undo works as before. */
  function moreBtn(x) { return '<button type="button" class="nb-more" data-lm="open" data-id="' + esc(x.id) + '" aria-haspopup="dialog" aria-label="' + esc('More for ' + x.text) + '">⋯</button>'; }
  var lmOpenFrom = null;
  function lmClose() {
    var s0 = document.getElementById('lm-sheet'); if (!s0) return;
    s0.remove(); document.documentElement.classList.remove('sheet-open');
    if (lmOpenFrom && document.body.contains(lmOpenFrom)) lmOpenFrom.focus(); lmOpenFrom = null;
  }
  function lmOpen(btn) {
    lmClose();
    var row = btn.closest('.nb-row'); if (!row) return;
    var act = row.querySelector('.nb-x, .p-x[data-p="odel"], .p-x[data-p="orestore"]');
    var who = (row.querySelector('.nb-wrote') || {}).textContent || '', t = row.querySelector('.nb-t'), name = t ? t.textContent.replace(/\s+/g, ' ').trim() : '';
    var box = document.createElement('div');
    box.id = 'lm-sheet';
    box.innerHTML = '<div class="sheet-bg" data-lm="close"></div><div class="sheet lm-sheet" role="dialog" aria-modal="true" aria-labelledby="lm-h"><div class="sheet-grip" aria-hidden="true"></div>' +
      '<h3 id="lm-h">' + esc(name) + '</h3>' + (who.trim() ? '<p class="lm-who">' + esc(/^(from|Ordered by) /.test(who.trim()) ? who.trim() : 'Written by ' + who.trim()) + '</p>' : '') +
      (act ? '<button type="button" class="sheet-o lm-act" data-lm="act"><strong>' + esc(act.textContent.trim() === 'Remove' ? 'Remove line' : act.textContent.trim()) + '</strong></button>' : '') +
      '<button type="button" class="btn sheet-x" data-lm="close">Cancel</button></div>';
    lmOpenFrom = btn; box._act = act;
    document.body.appendChild(box); document.documentElement.classList.add('sheet-open');
    var f = box.querySelector('.lm-act') || box.querySelector('.sheet-x'); if (f) f.focus();
  }
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-lm]') : null; if (!el) return;
    var a = el.getAttribute('data-lm');
    if (a === 'open') { e.preventDefault(); lmOpen(el); return; }
    var box = document.getElementById('lm-sheet');
    if (a === 'act') { var act = box && box._act; lmOpenFrom = null; lmClose(); if (act && document.body.contains(act)) act.click(); return; }
    if (a === 'close') lmClose();
  });
  document.addEventListener('keydown', function (e) {
    var box = document.getElementById('lm-sheet'); if (!box) return;
    if (e.key === 'Escape') { e.preventDefault(); lmClose(); return; }
    if (e.key === 'Tab') trapTab(e, box.querySelector('.sheet'), 'button');
  });
  window.addEventListener('hashchange', lmClose);
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
    function secOf(x) { return S.tab === FN_TAB ? 'Function platters' : S.tab || x.station || ''; }
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
  /* how often an item (or a longer line holding it) was wasted in the last 14 days, for the given reasons */
  function wasteFor(t, reasons) {
    var k = okey(t); if (k.length < 3 || !S.wSum) return null;
    var n = 0, r = {};
    S.wSum.forEach(function (x) {
      var wk = okey(x.t); if (!wk || !(wk === k || (wk.length >= 4 && (' ' + k + ' ').indexOf(' ' + wk + ' ') >= 0))) return;
      Object.keys(x.r || {}).forEach(function (rs) { if (reasons && reasons.indexOf(rs) < 0) return; var c = +x.r[rs] || 0; n += c; r[rs] = (r[rs] || 0) + c; });
    });
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
  /* The usual order amount (22 Oct 2026, review F2): when the name typed is an item the order list knows and its usual
     amount is clear (the same amount at least twice, and half the times or more), the amount box fills with it and the
     hint says so. Typing in the amount box, or a name that no longer matches, takes the filled amount away again; an
     amount someone typed is never changed. The box is selected on tap (FILLED), so typing replaces it. */
  function oUsual(t) {
    if (!t || t.trim().length < 3 || !ordLearnedFor(t)) return '';
    var l = ordQtyList(t), tot = 0;
    l.forEach(function (x) { tot += x.n; });
    return l.length && l[0].n >= 2 && l[0].n / tot >= 0.5 ? l[0].q : '';
  }
  function oAutoQty() {
    var box = S.root && S.root.querySelector('[data-k="o-qty"]'), oh = S.root && S.root.querySelector('#o-hint');
    // typed by a person: left alone
    if (!S.oqty.trim() || S.oqty === S.oqtyAuto) {
      var want = oUsual(S.otext) || '';
      if (want !== S.oqty) { S.oqty = want; if (box) box.value = want; if (want) sg('ordfill', 's'); }
      S.oqtyAuto = want;
    }
    if (oh) oh.textContent = oHintFull();
  }
  function oHintFull() { return (S.oqtyAuto && S.oqty === S.oqtyAuto ? 'Usual amount filled in: ' + S.oqtyAuto + '. ' : '') + oHintText(S.otext); }
  function oHintText(t) {
    var w = t && t.trim().length > 2 ? wasteFor(t, ['expired']) : null;
    return w ? 'Expired stock logged ' + w.n + (w.n === 1 ? ' time' : ' times') + ' in 14 days. Order a little less?' : '';
  }
  /* flags: Closing soon and the waste review note, as listHTML() draws them above the lines; Handy draws them again at
     its top for big screens (.nb-rc) */
  function sideHTML(today, flags) {
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
    if (chips) sg('quick', 's');
    // on phones and tablets the same chips are in the add box (.nb-qadd), so this copy shows on big screens only (.nb-quick)
    var quick = chips ? '<div class="nb-quick"><h3 class="nb-sh">Quick add</h3><p class="nb-sd">Due today, usual for a ' + esc(dname) + ' and regulars. Tap to add.</p><div class="nb-usual">' + chips + '</div></div>' : '';
    var pc = canBrowse() && S.date === dayNow() && S.past ? pace() : null;
    var paceHTML = pc ? '<div class="nb-pace' + (pc.today + 0.1 < pc.usual ? ' is-behind' : '') + '"><span class="nb-sl">Pace</span><p><strong>' + Math.round(pc.today * 100) + '%</strong> ticked now (' + pc.done + ' of ' + pc.n + '). By ' + clock(now()) + ' it is usually <strong>' + Math.round(pc.usual * 100) + '%</strong>' + (pc.sameDay ? ' on a ' + esc(dname) : '') + '.</p><span class="nb-sw">' + (pc.today + 0.1 < pc.usual ? 'Behind the usual pace. Check who needs a hand.' : 'On pace.') + ' Only the head chef and sous chefs see this.</span></div>' : '';
    var stuck = canBrowse() && S.date === dayNow() ? live.filter(function (x) { return !x.done && rolledN(x) >= 3; }) : [];
    var stuckHTML = stuck.length ? '<h3 class="nb-sh">Stuck lines</h3><p class="nb-sd">Rolled over 3 or more times. Make it urgent, split it into smaller jobs, or remove it if it is not needed.</p><ul class="nb-stuck">' + stuck.map(function (x) {
      return '<li><span>' + esc(x.text) + ' <span class="nb-us">x' + rolledN(x) + '</span></span>' + (x.urgent ? '' : '<button type="button" class="p-x" data-p="urgent" data-id="' + esc(x.id) + '">Urgent</button>') + (can('del') ? '<button type="button" class="p-x" data-p="del" data-id="' + esc(x.id) + '" data-d="' + esc(S.date) + '">Remove</button>' : '') + '</li>';
    }).join('') + '</ul>' : '';
    var dl = live.filter(function (x) { return x.done; }).sort(function (a, b) { return (b.doneAt || 0) - (a.doneAt || 0); });
    var donebox = '<h3 class="nb-sh" id="nb-donebox">' + (onToday ? 'Done today' : 'Done on ' + esc(dayShort(S.date))) + ' (' + dl.length + ')</h3>' + (dl.length ? '<ul class="nb-done">' + dl.map(function (x) {
      return '<li><span class="nb-dt">' + (x.doneAt ? clock(x.doneAt) : '') + '</span><span class="nb-dx">' + esc(x.text) + (x.qty ? ' <em>' + esc(x.qty) + '</em>' : '') + '</span><span class="nb-dw">' + esc(x.doneBy || '') + '</span>' + (can('tick') && canUntick(x) ? '<button type="button" class="p-x nb-undo" data-p="tick" data-id="' + esc(x.id) + '" data-d="' + esc(S.date) + '" aria-label="' + esc('Undo the tick on ' + x.text) + '">Undo</button>' : '') + '</li>';
    }).join('') + '</ul>' : '<p class="nb-sd">' + (onToday ? 'Nothing ticked yet.' : 'Nothing was ticked.') + '</p>');
    return (flags ? '<div class="nb-rc">' + flags + '</div>' : '') + startHTML(live, true) + paceHTML + stuckHTML + fnNeedsHTML() + donebox + quick;
  }
  /* For the functions (22 Oct 2026, review F1): what today's and tomorrow's confirmed function platters need, every item
     on the platter cards added up across the platters (5 Aussie platters at 10 party pies each: Party pies 50 pieces).
     An amount the card does not give for sure ([Qty], "handful") shows as "amount to come". Add puts it on the prep list
     as a normal line with that amount (Undo as usual); a line already open for it shows "On the list". Not needed hides
     it for that day on this phone (lk.fnneed: { day: [keys] }, out of date the next day). No reads: today's platter lines
     are on the list already, tomorrow's come from the functions listener (js/functions.js). */
  function fnNeeds() {
    var today = dayNow(), tmr = shift(today, 1), A = window.LK_AMT, days = {}, hid = fnNeedHidden();
    if (!A) return [];
    function addPlatter(day, fname, rid, plat) {
      var r = recipeById(rid); if (!r || !(plat > 0)) return;
      var d = days[day] = days[day] || { day: day, items: {} };
      (r.ingredients || []).forEach(function (i) {
        if (!i || !i.name) return;
        var a = A.parse(i.q), k = dupKey(i.name) + '|' + (a ? a.u : '?');
        if (hid[day] && hid[day].indexOf(k) >= 0) return;
        var e = d.items[k] = d.items[k] || { k: k, name: i.name, link: i.link || '', u: a ? a.u : '', n: 0, read: !!a, fns: {} };
        if (a) e.n += a.n * plat;
        e.fns[fname] = (e.fns[fname] || 0) + plat;
      });
    }
    S.items.filter(function (x) { return x.fn && !x.deleted && x.recipe; }).forEach(function (x) {
      var a = A.parse(x.qty), f = window.LK_FN ? (window.LK_FN.list() || []).filter(function (y) { return y.id === x.fn; })[0] : null;
      addPlatter(today, f ? f.name : 'Function', x.recipe, a ? a.n : 0);
    });
    if (window.LK_FN) (window.LK_FN.list() || []).filter(function (f) { return f.status === 'confirmed' && f.date === tmr; }).forEach(function (f) {
      (f.lines || []).forEach(function (l) { addPlatter(tmr, f.name, l.rid, +l.qty || 0); });
    });
    return [today, tmr].filter(function (d) { return days[d]; }).map(function (d) {
      var xs = Object.keys(days[d].items).map(function (k) { return days[d].items[k]; }).sort(function (a, b) { return a.name < b.name ? -1 : 1; });
      return { day: d, items: xs };
    });
  }
  // the functions listener (js/functions.js) can answer after the prep list is drawn: draw again only when this block
  // would show something different, so a new booking or tomorrow's functions appear without a reload
  var fnNeedSig = '';
  window.addEventListener('lk-fn', function () {
    if (S.name !== 'prep' || !S.root || !document.body.contains(S.root)) return;
    var sig = JSON.stringify(fnNeeds());
    if (sig !== fnNeedSig) { fnNeedSig = sig; draw(); }
  });
  function fnNeedHidden() { try { var h = JSON.parse(lsGet('lk.fnneed') || '{}'), out = {}, t = dayNow(); Object.keys(h).forEach(function (d) { if (d >= t && Array.isArray(h[d])) out[d] = h[d]; }); return out; } catch (e) { return {}; } }
  function fnNeedsHTML() {
    if (!can('add') || S.date !== dayNow()) return '';
    var ds = fnNeeds();
    fnNeedSig = JSON.stringify(ds);
    S.fnNeed = [];
    if (!ds.length) return '';
    var count = ds.map(function (d) { return d.items.length + ' ' + (d.day === dayNow() ? 'today' : 'tomorrow'); }).join(', ');
    sg('fnneed', 's');
    // folded under one line (the list can be long), open while someone works through it (S.fnnOpen)
    return '<h3 class="nb-sh">For the functions</h3><button type="button" class="fnn-sum" data-p="fnneed-fold" aria-expanded="' + !!S.fnnOpen + '">What the platters need: ' + esc(count) + ' <span aria-hidden="true">' + (S.fnnOpen ? '▴' : '▾') + '</span></button>' +
      (S.fnnOpen ? '<div class="fnn-box">' + ds.map(function (d) {
      return '<p class="fnn-day">' + (d.day === dayNow() ? 'Today' : 'Tomorrow') + '</p><ul class="fnn">' + d.items.map(function (e) {
        var qty = e.read ? window.LK_AMT.say(e.n, e.u) : '', i = S.fnNeed.push({ text: e.name, qty: qty, recipe: e.link, k: e.k, day: d.day }) - 1;
        var who = Object.keys(e.fns).map(function (f) { return f + ': ' + e.fns[f] + (e.fns[f] === 1 ? ' platter' : ' platters'); }).join(', ');
        var on = openTwin(e.name, qty);
        return '<li><span class="fnn-t"><strong>' + esc(e.name) + '</strong> ' + (qty ? '<span class="fnn-q">' + esc(qty) + '</span>' : '<span class="fnn-tc">amount to come</span>') + '<span class="fnn-w">' + esc(who) + '</span></span>' +
          (on ? '<span class="fnn-on">On the list</span>' : '<button type="button" class="nb-btn fnn-add" data-p="fnneed" data-i="' + i + '" aria-label="' + esc('Add ' + e.name + (qty ? ', ' + qty : '')) + '">Add</button>') +
          '<button type="button" class="p-x" data-p="fnneed-hide" data-i="' + i + '" aria-label="' + esc('Not needed: ' + e.name) + '">Not needed</button></li>';
      }).join('') + '</ul>';
    }).join('') + '</div>' : '');
  }
  function fnNeedAdd(i) {
    var x = (S.fnNeed || [])[i];
    if (!x || !can('add')) return;
    sg('fnneed', 't');
    var sec = mySec() || 'Functions', dte = S.date, tw = openTwin(x.text, x.qty);
    if (tw) { addToTwin(tw, { text: x.text.slice(0, 160), station: sec, recipe: x.recipe, qty: x.qty }, function () { noteSection(sec); bump({ added: 1, lastAdded: now() }); }); return; }
    var made = newItem({ text: x.text.slice(0, 160), station: sec, recipe: x.recipe || (matchRecipe(x.text) || {}).id || '', qty: x.qty });
    made.catch(failed);
    noteSection(sec); bump({ added: 1, lastAdded: now() });
    addedToast(sec, dte, made.id);
  }
  function fnNeedHide(i) {
    var x = (S.fnNeed || [])[i]; if (!x) return;
    sg('fnneed', 'd');
    var h = fnNeedHidden(); h[x.day] = (h[x.day] || []).concat([x.k]).slice(-200);
    lsSet('lk.fnneed', JSON.stringify(h)); draw();
  }
  /* The line above the prep list, the order list and wastage: who is writing and "Not you?" (22 Oct 2026). One helper, so
     the three pages say it the same way. tail: what follows the name on that page (HTML, already escaped). The tab bar
     or the pill menu is always on screen, so the line has no link to the prep list (23 Oct 2026). */
  function whoTopHTML(tail) {
    var p = me();
    return '<div class="nb-top"><span>' + (p ? 'Writing as <strong>' + esc(p.name) + '</strong>' + (tail || '') : '') + '</span><span class="p-links"><button type="button" class="p-link" data-p="who-change">Not you?</button></span></div>';
  }
  function listHTML() {
    var today = dayNow();
    if (S.date !== today && !canBrowse() && !S.user) { S.date = today; S.tab = ''; watchItems(); }
    if (S.authed && fb) { loadPast(); loadWSum(); loadLearned(); }
    S.week = S.past ? weekRanks() : null;
    maybeRoll(); mergeDups(); ordRoll(); loadOrdLearned(); loadWNote();
    // the day's own lines and a function's platter lines (their own tab) are counted apart
    var fnLive = S.items.filter(function (x) { return !x.deleted && x.fn; }), fnOpen = fnLive.filter(function (x) { return !x.done; }).length;
    var daily = S.items.filter(function (x) { return !x.deleted && !x.fn; });
    if (S.tab === FN_TAB && !fnLive.length) S.tab = '';
    var live = S.tab === FN_TAB ? fnLive : daily, doneN = live.filter(function (x) { return x.done; }).length;
    var removed = S.items.filter(function (x) { return x.deleted; });
    var secs = {}, tabs = [];
    daily.forEach(function (x) { [x.station].concat(x.also || []).forEach(function (n) { if (n && !secs[n]) { secs[n] = 1; tabs.push(n); } }); });
    var fnTab = fnLive.length ? '<button type="button" class="nb-tab nb-tab-fn" data-p="tab" data-v="' + FN_TAB + '" aria-pressed="' + (S.tab === FN_TAB) + '">Functions' + (fnOpen ? ' <span class="nb-tab-n">' + fnOpen + '</span>' : '') + '</button>' : '';
    var tabHTML = tabs.length || fnTab ? '<nav class="nb-tabs" aria-label="Sections"><button type="button" class="nb-tab" data-p="tab" data-v="" aria-pressed="' + !S.tab + '">All</button>' +
      tabs.map(function (t) { return '<button type="button" class="nb-tab" data-p="tab" data-v="' + esc(t) + '" aria-pressed="' + (S.tab === t) + '">' + esc(t) + '</button>'; }).join('') + fnTab + '</nav>' : '';
    // Closing soon and the waste review note: above the lines on phones and tablets (.nb-lc), at the top of Handy on big
    // screens (.nb-rc), so they do not push the lines down; CSS shows one of the two, like Start here
    var flags = closeoutHTML(daily, S.date) + wNoteHTML();
    var sug = suggestions(), sideH = sideHTML(today, flags);
    var add = can('add') && S.date === today ?
      '<form class="nb-add" data-p-form="add"><datalist id="p-sections">' + sug.map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join('') + '</datalist>' +
      '<div class="nb-add-row"><label class="visually-hidden" for="p-text">Prep item</label><input id="p-text" class="nb-in nb-in-text" data-k="p-text" enterkeyhint="done" autocomplete="off" autocapitalize="sentences" placeholder="Write a new line..." maxlength="160" value="' + esc(S.text) + '">' +
      '<label class="visually-hidden" for="p-section">Section</label><input id="p-section" class="nb-in nb-in-sec" data-k="p-section" list="p-sections" enterkeyhint="next" autocomplete="off" placeholder="Section" maxlength="40" value="' + esc(S.section || (S.secTyped ? '' : mySec())) + '">' +
      '<label class="visually-hidden" for="p-qty">Amount</label><input id="p-qty" class="nb-in nb-in-qty" data-k="p-qty" enterkeyhint="done" autocomplete="off" placeholder="Amount" maxlength="40" value="' + esc(S.qty) + '">' +
      '<button type="submit" class="nb-addbtn">Add</button></div><div class="nb-sugg" id="p-sugg">' + suggestHTML() + '</div><div class="nb-sugg nb-qs" id="p-qsugg">' + qtyChipsHTML() + '</div><p class="nb-hint" id="p-hint" aria-live="polite">' + esc(hintText(S.text)) + '</p>' + recipePicker() + (S.quickChips ? '<div class="nb-qadd"><span class="nb-ql">Quick add</span><div class="nb-usual">' + S.quickChips + '</div></div>' : '') + '</form>' : (S.date !== today ? '<p class="hint">You are looking at ' + esc(dayName(S.date)) + '. Lines are added on Today only.</p>' : '<p class="hint">You can read the book but not write in it. Ask the head chef if that is wrong.</p>');
    var todayEmpty = !live.length && S.itemsState === 'ok' ? '<p class="nb-empty">Nothing written for ' + esc(dayName(S.date).toLowerCase()) + ' yet.</p>' : '';
    if (live.length && doneN === live.length && !S.tab) todayEmpty = '<p class="nb-empty">Everything on this list is ticked off. See Done today under Handy.</p>';
    if (S.tab && !live.some(function (x) { return inTab(x) && (!x.done || lingers(x)); })) todayEmpty = '<p class="nb-empty">Nothing left to do in ' + esc(S.tab === FN_TAB ? 'Functions' : S.tab) + '. Ticked lines are under Done today in Handy.</p>';
    if (!S.tab && !daily.length && fnLive.length && S.itemsState === 'ok') todayEmpty = '<p class="nb-empty">Nothing written for ' + esc(dayName(S.date).toLowerCase()) + ' yet. Function platters are on the Functions tab.</p>';
    var left = '<section class="nb-page nb-left"><header class="nb-ph"><div><h2 class="nb-title" id="rtitle" tabindex="-1">' + esc(dayName(S.date)) + '</h2><span class="nb-date">' + esc(longDate(S.date)) + '</span></div>' +
      '<div class="nb-prog">' + doneN + ' of ' + live.length + ' done</div>' + (can('add') ? '<button type="button" class="nb-jump" data-p="write">Write a line</button>' : '') + (doneN ? '<button type="button" class="nb-jump nb-donejump" data-p="donejump">Done today (' + doneN + ')</button>' : '') + '</header>' +
      (S.itemsState === 'error' ? '<p class="p-err">Could not load this page. Check the connection.</p>' : '') +
      '<div class="nb-body">' + (flags ? '<div class="nb-lc">' + flags + '</div>' : '') + (S.tab === FN_TAB ? '' : startHTML(daily)) + pageBody(S.items, S.date) + todayEmpty + '</div>' +
      '<div class="nb-foot">' + add + (add && !can('del') ? '<p class="hint nb-who">Wrote the wrong thing? Undo it straight away, or ask the head chef or a sous chef to remove it.</p>' : '') +
      (removed.length && can('del') ? '<button type="button" class="nb-link" data-p="removed">' + (S.showRemoved ? 'Hide' : 'Show') + ' removed (' + removed.length + ')</button>' : '') + '</div></section>';
    var right = '<section class="nb-page nb-right"><header class="nb-ph"><div><h2 class="nb-title nb-dim">Handy</h2><span class="nb-date">' + (S.date === today ? 'Done today<span class="nb-qsub"> and quick add</span>' : 'Done on ' + esc(dayShort(S.date))) + '</span></div></header>' +
      '<div class="nb-body nb-side">' + sideH + '</div></section>';
    return whoTopHTML(ksTagHTML() + (can('tick') ? '' : ' (read only)')) +
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
    Promise.all(dates.map(function (d) { return pastRead(ordCol(d), 'o/' + d, d, false, force).then(function (s) { return s.docs.map(function (x) { var v = x.data(); v.id = x.id; v.date = d; return v; }); }, function () { return []; }); })).then(function (l) {
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
    return key + '<div class="a-tablewrap" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table class="a-table a-plain sk-t"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
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
        ['staff', 'Staff', function (o) { return o.p.role === 'staff'; }], ['view', 'View only', function (o) { return o.p.role === 'view'; }], ['fn', 'Functions', function (o) { return !!o.p.fn; }], ['off', 'Off the list', function (o) { return o.p.active === false; }]],
      sorts: [['order', 'Order added', function (a, b) { return a.i - b.i; }],
        ['name', 'Name A to Z', function (a, b) { return (b.p.isNew ? 1 : 0) - (a.p.isNew ? 1 : 0) || nm(a).localeCompare(nm(b)); }],
        ['role', 'Role', function (a, b) { return Object.keys(ROLES).indexOf(a.p.role) - Object.keys(ROLES).indexOf(b.p.role) || nm(a).localeCompare(nm(b)); }]],
      cols: [
        { h: 'Name', th: true, html: function (o) { return '<label class="visually-hidden" for="a-n' + o.i + '">Name</label><input id="a-n' + o.i + '" class="search a-name" data-k="a-n' + o.i + '" data-a="name" data-i="' + o.i + '" value="' + esc(o.p.name) + '" maxlength="40">'; } },
        { h: 'Role', wide: true, html: function (o) { return '<label class="visually-hidden" for="a-r' + o.i + '">Role</label><select id="a-r' + o.i + '" class="p-select" data-k="a-r' + o.i + '" data-a="role" data-i="' + o.i + '">' + Object.keys(ROLES).map(function (k) { return '<option value="' + k + '"' + (o.p.role === k ? ' selected' : '') + '>' + ROLES[k].name + '</option>'; }).join('') + '</select>'; } },
        { h: 'Write', cls: 'a-c', html: function (o) { return cb(o, 'perm', 'add', o.p.add, 'Write', isHeadP(o.p)); } },
        { h: 'Tick', cls: 'a-c', html: function (o) { return cb(o, 'perm', 'tick', o.p.tick, 'Tick', isHeadP(o.p)); } },
        { h: 'Remove', cls: 'a-c', html: function (o) { return cb(o, 'perm', 'del', o.p.del, 'Remove', isHeadP(o.p)); } },
        { h: 'Functions', cls: 'a-c', html: function (o) { return cb(o, 'perm', 'fn', o.p.fn, 'Manage functions', false); } },
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
    if (!ownerHere()) {
      var op = who();
      return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Admin panel</h2><p class="hint">' + (op ? esc(op.name) + ' is signed in on this device. ' : 'Nobody is signed in on this shared device. ') + 'The admin panel opens only while a chef is signed in with their PIN.</p>' +
        '<div class="btn-row"><a class="btn dark" href="#/prep" data-p="who-change">' + (op ? 'Not ' + esc(op.name.split(' ')[0]) + '? Change person' : 'Sign in') + '</a><button type="button" class="btn" data-p="signout">Sign out of Google</button></div></section>';
    }
    if (!S.draft) startDraft();
    var d = S.draft, owner = S.level === 'owner';
    if (owner) { watchActivity(); loadStats(false); }
    var bar = '<div class="p-bar"><span>Signed in as <strong>' + esc(S.user.email) + '</strong> (' + 'head chef' + ')</span><span class="p-links"><button type="button" class="p-link" data-p="signout">Sign out</button><a class="p-link" href="#/prep">Prep list</a></span></div>';
    var bulk = '<div class="field"><label class="label" for="a-bulk">Add several names</label><textarea id="a-bulk" class="p-bulk" data-k="a-bulk" rows="3" placeholder="One name per line">' + esc(S.bulk || '') + '</textarea></div><div class="btn-row"><button type="button" class="btn" data-p="a-bulk-add">Add these names as Staff</button></div>';
    var saveBlock = saveBarHTML();
    var at = S.atab || 'insights';
    // Head chef decision D4 (20 Oct 2026): five groups on top, the pages of the open group underneath (the page ids
    // stay the same, so lk.prep.atab and every link into a page still work)
    var mlN = mlInfo().n, ag = adminGroupOf(at);
    // 21 Oct 2026: groups, pages and "On this page" sit in one nav that stays at the top of the screen (adminJumps() fills
    // the last row from the page's headings after each draw, adminScroll() tucks it up while scrolling down)
    var tabsBar = '<div class="a-navtop"></div><div class="a-nav' + (S.anavMin ? ' is-min' : '') + '"><nav class="a-groups" aria-label="Admin sections">' + A_GROUPS.map(function (g) {
      return '<button type="button" class="a-group" data-p="a-group" data-g="' + g[0] + '" aria-current="' + (ag[0] === g[0] ? 'page' : 'false') + '">' + g[1] + (g[0] === 'today' && mlN ? ' (' + mlN + ')' : '') + '</button>';
    }).join('') + '</nav>' + (ag[2].length > 1 ? '<nav class="a-tabs" aria-label="' + esc(ag[1]) + ' pages">' + ag[2].map(function (t) {
      return '<button type="button" class="a-tab" data-p="a-tab" data-t="' + t + '" aria-pressed="' + (at === t) + '">' + A_TAB_NAMES[t] + (t === 'mail' && mlN ? ' (' + mlN + ')' : '') + '</button>';
    }).join('') + '</nav>' : '') + '<nav class="a-onpage" aria-label="On this page" hidden></nav></div>';
    if (at === 'notes') loadNotes();
    if (at === 'minutes') loadMinutes();
    if (at === 'guides') loadGuides();
    var pane = at === 'mail' ? mailAdminHTML() : at === 'guides' ? guidesAdminHTML() : at === 'minutes' ? minAdminHTML() : at === 'insights' ? insightsHTML() : at === 'team' ? (teamHTML() + statsHTML('people')) : at === 'waste' ? wasteStatsHTML() : at === 'learning' ? (listTimesHTML() + learnedHTML() + statsHTML('sections')) : at === 'notes' ? notesEditorHTML() : at === 'people' ? (
      '<section class="set-block"><span class="label">People</span><details class="a-how"><summary>How roles and ticks work</summary><p class="hint">Pick a role to set the usual permissions (Sous chef can also add and remove people from the prep book itself), then adjust the ticks for one person if you need to. Pings lets that person write shift pings from the prep book (sous chefs always can). Functions lets that person enter and change function bookings (Functions coordinator ticks it for you); only your save here gives it or takes it away, and nothing else comes with it. Reset PIN lets that person choose a new one: do it with them there, as whoever signs in with that name next sets the PIN. Removing someone from the list keeps their name on old lines, and their PIN stops working for anything. Head chef is for your own name: it always has every permission and the sous chef pages, and a sous chef cannot change or remove it.</p></details>' +
      (headIdOf(d.people) ? '' : '<p class="hint a-nohead" role="note">No one is marked Head chef yet. Set your own name to Head chef and save, so your PIN has full rights on the kitchen devices.</p>') +
      peopleListHTML(d) + '<div class="btn-row"><button type="button" class="btn" data-p="a-add-person">Add a person</button></div>' + bulk + '</section>' + ksAdminHTML(d) +
      '<section class="set-block"><span class="label">Badges</span><label class="a-check"><input type="checkbox" data-a="badges"' + (d.showBadges !== false ? ' checked' : '') + '> Show the weekly top tickers to everyone on the prep book</label></section>' +
      '<section class="set-block a-feats"><span class="label">New pages</span><span class="hint">You, sous chefs and leads always see these. Untick one to hide it from Staff and View only until the team is ready.</span>' +
      FEATS.map(function (f) { return '<label class="a-check"><input type="checkbox" data-a="staffsee" data-f="' + f[0] + '"' + (d.staffSee[f[0]] ? ' checked' : '') + '> Staff see ' + f[1] + '</label>'; }).join('') + '</section>' + saveBlock
    ) : (
      '<section class="set-block"><span class="label">Backup</span><span class="hint">Saves everything the prep book holds (people, prep lines, orders and wastage from the last 400 days, shift pings and who has seen them, meeting minutes with earlier versions and sign-offs, function bookings with their contacts and earlier versions, what the prep and order lists have learned, tallies and the guides\' words) as one file on this device. People\'s PIN fingerprints and the guides\' page pictures are left out (keep the original files). The book is also backed up on the server every night at 03:30; download one here when you want a copy on this computer.</span><div class="btn-row"><button type="button" class="btn" data-p="export"' + (S.exporting ? ' disabled' : '') + '>' + (S.exporting ? esc(S.exporting) : 'Download a backup') + '</button></div></section>' +
      '<section class="set-block"><span class="label">Kitchen PIN</span><span class="hint">The kitchen PIN is the lock on the whole book, so keep it to staff only. Writing needs a person\'s own PIN as well.</span>' +
      '<p class="hint a-step"><strong>Step 1.</strong> Ask for the new PIN to be added to the security rules. <strong>Step 2.</strong> Type it twice below and copy everything to it. The old PIN keeps working until its rules are removed.</p>' +
      '<div class="field"><label class="label" for="a-newpin">New 4 digit kitchen PIN</label><input id="a-newpin" class="search" inputmode="numeric" maxlength="4" autocomplete="off" data-k="a-newpin" placeholder="4 digits" value="' + esc(S.newPin) + '"></div>' +
      '<div class="field"><label class="label" for="a-newpin2">Type it again</label><input id="a-newpin2" class="search" inputmode="numeric" maxlength="4" autocomplete="off" data-k="a-newpin2" placeholder="4 digits" value="' + esc(S.newPin2 || '') + '"></div>' +
      '<div class="btn-row"><button type="button" class="btn" data-p="move-pin"' + (S.moving ? ' disabled' : '') + '>' + (armed('move-pin') ? 'Tap again to copy everything' : 'Copy everything to the new PIN') + '</button></div><span class="saved" role="status">' + esc(S.moveMsg) + '</span>' +
      '<div class="btn-row a-forget"><button type="button" class="btn" data-p="pin-forget">' + (armed('pin-forget') ? 'Tap again: this device forgets the kitchen PIN' : 'Use a different kitchen PIN on this device') + '</button></div><span class="hint">Forgets the kitchen PIN on this device only and asks for one again. Staff phones pick up a new PIN by themselves once the old rules are removed.</span></section></div>');
    return '<div class="p-admin">' + bar + '<h2 class="p-h" id="rtitle" tabindex="-1">Admin panel</h2>' + tabsBar + '<div class="a-pane">' + (owner ? idCardHTML() : '') + pane + '</div></div>';
  }
  /* the same Remove button on the admin People tab and the sous chef's staff list, with a second tap to be sure */
  /* Head chef decision D6 (20 Oct 2026): someone who leaves is taken off the list, not deleted, so their name stays on
     old lines and they can be put back. Only a new row that was never saved is really removed. */
  function removePersonBtn(p, i) {
    if (isHeadP(p) && S.level !== 'owner') return '<span class="a-head">Head chef</span>';
    if (p.active === false && !p.isNew) return '<button type="button" class="p-x" data-p="a-remove-person" data-i="' + i + '" aria-label="' + esc('Put ' + (p.name || 'this person') + ' back on the list') + '">Put back</button>';
    var lab = p.isNew ? 'Remove' : 'Stopped working here';
    return '<button type="button" class="p-x" data-p="a-remove-person" data-i="' + i + '" aria-label="' + esc(lab + ': ' + (p.name || 'this person')) + '">' + (armed('rm:' + p.id) ? 'Tap again: ' + lab.toLowerCase() : lab) + '</button>';
  }
  /* what the draft changes, counted per person and per setting, for the Save bar */
  function draftChanges() {
    if (!S.draft || !S.draftSnap) return 0;
    var old; try { old = JSON.parse(S.draftSnap); } catch (e) { return draftDirty() ? 1 : 0; }
    var n = 0, before = {}, now2 = {};
    (old.people || []).forEach(function (p) { before[p.id] = JSON.stringify(p); });
    (S.draft.people || []).forEach(function (p) { now2[p.id] = 1; if (before[p.id] !== JSON.stringify(p)) n++; });
    Object.keys(before).forEach(function (id) { if (!now2[id]) n++; });
    Object.keys(S.draft).forEach(function (k) { if (k !== 'people' && JSON.stringify(S.draft[k]) !== JSON.stringify(old[k])) n++; });
    return n || (draftDirty() ? 1 : 0);
  }
  /* Ticks and names change the draft without a redraw (so the cursor stays put); the Save bar follows straight after. */
  function saveBarRefresh() { var sb = S.root && S.root.querySelector('.a-savebar'); if (sb && S.draft) sb.outerHTML = saveBarHTML(); }
  ['change', 'input'].forEach(function (ev) { document.addEventListener(ev, function (e) { if (e.target && e.target.getAttribute && e.target.getAttribute('data-a')) setTimeout(saveBarRefresh, 0); }, true); });
  function saveBarHTML() {
    var n = draftChanges();
    return '<section class="set-block a-savebar">' + staleHint() + '<div class="btn-row"><button type="button" class="btn dark" data-p="a-save"' + (S.busy || !n ? ' disabled' : '') + '>Save changes</button>' +
      '<button type="button" class="btn" data-p="a-reset"' + (n ? '' : ' disabled') + '>' + (armed('a-reset') ? 'Tap again to undo ' + (n === 1 ? 'it' : 'all ' + n) : 'Undo unsaved changes') + '</button>' +
      (n ? '<span class="a-unsaved">' + n + ' unsaved change' + (n === 1 ? '' : 's') + '</span>' : '') + '</div><span class="saved" role="status">' + esc(S.saveMsg) + '</span></section>';
  }
  var A_TAB_NAMES = { mail: 'Kitchen mail', notes: 'Shift pings', insights: 'Insights', team: 'Team', waste: 'Wastage', learning: 'Learning', people: 'People', minutes: 'Minutes', guides: 'Guides', tools: 'Backup and PIN' };
  var A_GROUPS = [['today', 'Today', ['mail', 'notes']], ['reports', 'Reports', ['insights', 'team', 'waste', 'learning']], ['people', 'People', ['people']], ['content', 'Content', ['minutes', 'guides']], ['settings', 'Settings', ['tools']]];
  function adminGroupOf(t) { return A_GROUPS.filter(function (g) { return g[2].indexOf(t) >= 0; })[0] || A_GROUPS[1]; }
  /* "On this page": one chip per heading of the open page (the numbered Insights sections, otherwise each block's label
     and the chart headings in it), so a long page is one tap from any part. Built from the page after each draw, so a
     new block on any admin page gets its chip by itself. Hidden when a page has fewer than two parts. */
  function adminHeads() {
    var pane = S.root && S.root.querySelector('.a-pane');
    if (!pane) return [];
    var hs = pane.querySelectorAll('.a-sh');
    if (!hs.length) hs = pane.querySelectorAll(':scope > .set-block > .label:first-child, :scope > .set-block > h3.a-ch-h');
    return Array.prototype.filter.call(hs, function (h) { return h.offsetParent && h.textContent.trim(); });
  }
  function adminJumps() {
    var nav = S.root && S.root.querySelector('.a-nav'), row = nav && nav.querySelector('.a-onpage');
    if (!row) return;
    var hs = adminHeads();
    if (hs.length < 2) { row.hidden = true; row.innerHTML = ''; } else {
      row.innerHTML = '<span class="a-op-l" aria-hidden="true">On this page</span>' + hs.map(function (h, i) {
        if (!h.id) h.id = 'aj-' + i;
        var sn = h.querySelector('.a-sn'), t = h.textContent.trim();
        if (sn) t = t.slice(sn.textContent.length).trim();
        return '<button type="button" class="chip" data-p="jump" data-v="' + esc(h.id) + '">' + (sn ? '<span class="a-sn">' + esc(sn.textContent) + '</span>' : '') + esc(t) + '</button>';
      }).join('') +
        // on a phone the row is one button that lists the parts (22 Oct 2026, Option B); a laptop keeps the row
        '<button type="button" class="a-jumpbtn" data-p="aj-open" aria-haspopup="dialog">On this page: <b class="a-jumpcur"></b> <span aria-hidden="true">▾</span></button>';
      row.hidden = false;
    }
    adminScroll(true);
  }
  /* how far the nav moves up when tucked away: everything above its last row */
  function navHide(nav) { var rows = Array.prototype.filter.call(nav.children, function (x) { return !x.hidden; }); return rows.length > 1 ? rows[rows.length - 1].offsetTop - 4 : 0; }
  var navY = 0, navTick = false, navOn = '', navJump = '', navJumpAt = 0;
  function adminScroll(redraw) {
    var nav = S.name === 'admin' && S.root && S.root.querySelector('.a-nav');
    var y = window.scrollY, dy = y - navY;
    // a redraw starts the count again, unless a scroll is still waiting for its frame: that scroll is real and counts
    if (redraw ? !navTick : Math.abs(dy) > 6) navY = y;
    if (!nav) return;
    var mark = S.root.querySelector('.a-navtop'), stuck = !!mark && mark.getBoundingClientRect().top < (parseFloat(getComputedStyle(nav).top) || 0) - 2;
    var hide = navHide(nav);
    nav.style.setProperty('--a-nav-hide', hide + 'px');
    var ae = document.activeElement, focusIn = !!ae && nav.contains(ae) && !(ae.closest && ae.closest('.a-onpage'));
    if (!stuck || !hide || focusIn || (!redraw && dy < -6)) S.anavMin = false;
    else if (!redraw && dy > 6) S.anavMin = true;
    nav.classList.toggle('is-min', !!S.anavMin);
    // the part of the page on screen: the last heading that has reached the bottom of the nav
    var row = nav.querySelector('.a-onpage');
    if (!row || row.hidden) return;
    var edge = nav.getBoundingClientRect().bottom + 24, on = '';
    adminHeads().forEach(function (h) { if (h.getBoundingClientRect().top <= edge) on = h.id; });
    // near the end of a page the last parts cannot reach the nav: a part just jumped to stays marked while it is on screen
    var jt = navJump && document.getElementById(navJump), jr = jt && jt.getBoundingClientRect();
    var jOn = jr && jr.top >= nav.getBoundingClientRect().bottom - 4 && jr.top < window.innerHeight;
    if (jOn) on = navJump; else if (Date.now() - navJumpAt > 1500) navJump = '';
    if (!on && row.querySelector('.chip')) on = row.querySelector('.chip').getAttribute('data-v');
    // the row follows only when the part on screen changes, so a swipe along the row is not undone by the next scroll
    var moved = redraw || on !== navOn;
    navOn = on;
    Array.prototype.forEach.call(row.querySelectorAll('.chip'), function (c) {
      var cur = c.getAttribute('data-v') === on;
      if (cur) { var jc = row.querySelector('.a-jumpcur'); if (jc) jc.textContent = c.textContent.replace(/^\d+\s*/, ''); c.setAttribute('aria-current', 'true'); if (moved && (c.offsetLeft < row.scrollLeft || c.offsetLeft + c.offsetWidth > row.scrollLeft + row.clientWidth)) row.scrollLeft = c.offsetLeft - 40; }
      else c.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', function () {
    if (navTick || S.name !== 'admin') return;
    navTick = true;
    requestAnimationFrame(function () { navTick = false; adminScroll(false); });
  }, { passive: true });
  document.addEventListener('focusin', function (e) { if (S.name === 'admin' && e.target.closest && e.target.closest('.a-nav')) adminScroll(false); });
  /* a jump lands the heading just under the nav (only its last row stays when the page moves down) */
  /* The jump list on a phone: a sheet on document.body (dims, closes on the backdrop, Cancel and Escape), clicks data-aj. */
  function ajOpen(from) {
    ajClose();
    var row = S.root && S.root.querySelector('.a-onpage'); if (!row) return;
    var box = document.createElement('div'); box.id = 'aj-sheet';
    box.innerHTML = '<div class="sheet-bg" data-aj="close"></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="aj-h"><div class="sheet-grip" aria-hidden="true"></div><h3 id="aj-h">On this page</h3><div class="sheet-list">' +
      Array.prototype.map.call(row.querySelectorAll('.chip[data-p="jump"]'), function (c) { return '<button type="button" class="sheet-o" data-aj="go" data-v="' + esc(c.getAttribute('data-v')) + '"' + (c.getAttribute('aria-current') === 'true' ? ' aria-current="true"' : '') + '><strong>' + esc(c.textContent.replace(/^\d+\s*/, '')) + '</strong></button>'; }).join('') +
      '</div><button type="button" class="btn sheet-x" data-aj="close">Cancel</button></div>';
    box._from = from; document.body.appendChild(box); document.documentElement.classList.add('sheet-open');
    var f = box.querySelector('[aria-current="true"]') || box.querySelector('.sheet-o'); if (f) f.focus();
  }
  function ajClose(keep) {
    var box = document.getElementById('aj-sheet'); if (!box) return;
    box.remove(); document.documentElement.classList.remove('sheet-open');
    if (!keep && box._from && document.body.contains(box._from)) box._from.focus();
  }
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-aj]') : null; if (!el) return;
    if (el.getAttribute('data-aj') === 'go') { var id = el.getAttribute('data-v'); ajClose(true); adminJumpTo(id); return; }
    ajClose();
  });
  document.addEventListener('keydown', function (e) {
    var box = document.getElementById('aj-sheet'); if (!box) return;
    if (e.key === 'Escape') { e.preventDefault(); ajClose(); return; }
    if (e.key === 'Tab') trapTab(e, box.querySelector('.sheet'), 'button');
  });
  window.addEventListener('hashchange', function () { ajClose(true); });
  function adminJumpTo(id) {
    var tg = document.getElementById(id), nav = S.root && S.root.querySelector('.a-nav');
    if (!tg) return;
    navJump = id; navJumpAt = Date.now();
    var top = tg.getBoundingClientRect().top, h = nav ? nav.offsetHeight : 0;
    if (nav && top > h) h -= navHide(nav);
    if (nav) h += parseFloat(getComputedStyle(nav).top) || 0; // under the update strip when it shows
    window.scrollTo({ top: Math.max(0, window.scrollY + top - h - 10), behavior: 'smooth' });
  }
  /* a new page starts just under the panel's title: the nav stays where it was, nothing jumps back above it */
  function adminToTop() {
    var mark = S.root && S.root.querySelector('.a-navtop');
    S.anavMin = false;
    if (!mark) { window.scrollTo(0, 0); return; }
    var y = mark.getBoundingClientRect().top + window.scrollY;
    if (window.scrollY > y) window.scrollTo(0, y);
    adminScroll(true);
  }
  function draftDirty() { return !!S.draft && JSON.stringify(S.draft) !== S.draftSnap; }
  window.addEventListener('beforeunload', function (e) { if ((S.name === 'admin' || S.staffOpen) && draftDirty()) { e.preventDefault(); e.returnValue = ''; } });
  function staffHTML() {
    var d = S.draft || (startDraft(), S.draft);
    var bulk = '<div class="field"><label class="label" for="a-bulk">Add several names</label><textarea id="a-bulk" class="p-bulk" data-k="a-bulk" rows="3" placeholder="One name per line">' + esc(S.bulk || '') + '</textarea></div><div class="btn-row"><button type="button" class="btn" data-p="a-bulk-add">Add these names as Staff</button></div>';
    return '<div class="p-admin"><div class="p-bar"><span>Staff list</span><span class="p-links"><button type="button" class="p-link" data-p="staff-close">' + (armed('staff-close') ? 'Tap again to leave without saving' : 'Back to the prep book') + '</button></span></div><h2 class="p-h" id="rtitle" tabindex="-1">Staff</h2>' +
      '<section class="set-block"><span class="hint">Add a person or remove one, then save. New people start as Staff. Removing someone keeps their name on old lines. Roles and PINs are looked after by the head chef.</span>' + staffListHTML(d) + '<div class="btn-row"><button type="button" class="btn" data-p="a-add-person">Add a person</button></div>' + bulk + '</section>' +
      saveBarHTML() + '</div>';
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
    if (!S.pin) { sdkEarly(); return gateHTML(); }
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
    if (!S.authed && !resumed) return loadingHTML();   // still finding out whether this phone is signed in (resume)
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
  /* One redraw for a tap that changes several things (22 Oct 2026): tick() draws once at the end instead of once for
     the change and once for its toast. Measured on an 80-line day, a phone 4 times slower: 136 ms in the tap before. */
  var holdDraw = 0, heldDraw = false;
  function batch(fn) { holdDraw++; try { fn(); } finally { if (--holdDraw === 0 && heldDraw) { heldDraw = false; draw(); } } }
  function draw() {
    if (holdDraw) { heldDraw = true; return; }
    noteRefresh();
    if (S.mins) { loadMine(); minCard(); }
    if (!S.root || !document.body.contains(S.root) || rendering) return;
    rendering = true;
    var ae = document.activeElement, key = ae && ae.getAttribute && ae.getAttribute('data-k'), start = null, end = null;
    var btnSel = !key && ae && S.root.contains(ae) && ae.getAttribute && ae.getAttribute('data-p') ? guestSel(ae) : '', tickAt = -1;
    if (btnSel && ae.getAttribute('data-p') === 'tick') tickAt = Array.prototype.indexOf.call(S.root.querySelectorAll('.nb-box[data-p="tick"]'), ae);
    if (key && ae.selectionStart != null) { try { start = ae.selectionStart; end = ae.selectionEnd; } catch (e) {} }
    var bodyEl = S.root.querySelector('.nb-body'), keepScroll = bodyEl ? S.root.querySelectorAll('.nb-body') : null, scrolls = [];
    if (keepScroll) Array.prototype.forEach.call(keepScroll, function (b) { scrolls.push(b.scrollTop); });
    S.root.innerHTML = syncHTML() + practiceHTML() + bodyHTML() + toastHTML();
    S.root.classList.toggle('is-book', S.name === 'prep' && !!S.root.querySelector('.nb'));
    document.documentElement.classList.toggle('sheet-open', !!S.root.querySelector('.sheet'));
    if (scrolls.length) Array.prototype.forEach.call(S.root.querySelectorAll('.nb-body'), function (b, i) { if (scrolls[i] != null) b.scrollTop = scrolls[i]; });
    if (key) { var el = S.root.querySelector('[data-k="' + key + '"]'); if (el) { el.focus({ preventScroll: true }); if (start != null && el.setSelectionRange) { try { el.setSelectionRange(start, end); } catch (e) {} } } }
    else if (btnSel) {
      var back = S.root.querySelector(btnSel);
      if (!back && tickAt >= 0) { var ticks2 = S.root.querySelectorAll('.nb-box[data-p="tick"]:not([disabled])'); back = ticks2[Math.min(tickAt, ticks2.length - 1)]; }
      if (back) back.focus({ preventScroll: true }); else focusPin();
    }
    else focusPin();
    if (S.name === 'admin') adminJumps();
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
    if (!T.ready() || !S.authed || !fb || !can('add') || S.configState !== 'ok' || S.ordRolling || lsGet('lk.ord.rolled') === today || waiting('ordroll') || !learnedIn()) return;
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
      // the order list goes by the prep list's night list (head chef, 22 Oct 2026): that day's prep lines when this phone
      // has them (the past days on the phone), else the time the server clocked or the usual time
      var jobs = [], cut = src ? cutFor(src.date, S.past && S.past[src.date]) : 0;
      (src ? src.items : []).forEach(function (x) {
        if (x.ordered) return;
        var root = x.root || x.id, id = 'r' + today.replace(/-/g, '') + '-' + root;
        if (have[id]) return;
        have[id] = true;
        jobs.push(['set', ordRef(today, id), {
          text: x.text, qty: x.qty || '', recipes: x.recipes || [], addedBy: 'Rolled over', addedById: '', addedAt: now(), ordered: false, deleted: false,
          rolled: (x.rolled || 0) + 1, root: root, from: x.id, rolledFrom: src.date, origBy: x.origBy || x.addedBy || '', origAt: x.origAt || (x.rolled ? 0 : x.addedAt || 0),
          ahead: !!(x.ahead || writtenLate(x, src.date, cut)), since: x.since || (writtenLate(x, src.date, cut) ? today : src.date)
        }]);
      });
      if (!jobs.length) { S.ordRolling = false; lsSet('lk.ord.rolled', today); return; }
      return Wall(jobs).then(function () {
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
    try { var c = JSON.parse(lsGet('lk.ord.learned') || 'null'); if (c && c.tag === tag && c.list) { S.ordLearned = foldLearned(c.list); S.ordLearnFor = tag; S.ordLearnOk = true; return; } } catch (e) {}
    S.ordLearnBusy = true;
    // the nightly summary first: 1 read instead of up to 300 (22 Oct 2026); the old read when it is missing or old
    sumList('ordlearned').then(function (sum) {
      return sum ? sum.items : fb.fs.getDocs(fb.fs.query(colRef('ordlearned'), fb.fs.orderBy('uses', 'desc'), fb.fs.limit(ORD_LEARN_N))).then(function (sn) {
        return sn.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
      });
    }).then(function (list) {
      S.ordLearned = foldLearned(list.map(function (x) { return { id: x.id, text: x.text || '', uses: x.uses || 0, dow: x.dow || {}, qtys: x.qtys || {}, hidden: !!x.hidden }; }));
      S.ordLearnFor = tag; S.ordLearnOk = true; S.ordLearnBusy = false; ordLearnSave(); draw();
    }, function () {
      // no signal, or rules without ordlearned (a new kitchen PIN): suggest from the last 14 days only, try again tomorrow
      S.ordLearned = S.ordLearned || []; S.ordLearnFor = tag; S.ordLearnOk = false; S.ordLearnBusy = false;
    });
  }
  function ordLearnSave() { lsSet('lk.ord.learned', JSON.stringify({ tag: S.ordLearnFor, list: S.ordLearned || [] })); }
  function ordLearnedFor(text) { var k = lkey(text), d = dupKey(text); return (S.ordLearned || []).filter(function (x) { return x.id === k || (x.ids || []).indexOf(k) >= 0 || (d && dupKey(x.text) === d); })[0] || null; }
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
    Object.keys((lx && lx.qtys) || {}).forEach(function (q) { var v = lx.qtys[q]; if (v && v.q) amtAdd(out, v.q, v.n || 0); });
    var d = dupKey(text);
    (S.ordHist || []).forEach(function (x) { if ((lkey(x.text) === k || (d && dupKey(x.text) === d)) && x.qty) amtAdd(out, x.qty, lx ? 0 : 1); });
    return Object.keys(out).map(function (q) { return out[q]; }).sort(function (a, b) { return b.n - a.n; });
  }
  function oQtyChipsHTML() {
    if (S.oqty.trim() || S.otext.trim().length < 3) return '';
    var l = ordQtyList(S.otext).slice(0, 3);
    if (!l.length) return '';
    sg('usual', 's');
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
    if (S.oqtyAuto && S.oqty === S.oqtyAuto) sg('ordfill', 't');   // added with the filled-in amount as it was
    S.otext = ''; var q = S.oqty.trim().slice(0, 40); S.oqty = ''; S.oqtyAuto = ''; draw();
    ordLearn(t, q);
    sset(ref, practiceOn(amtOn({ text: t, qty: q, recipes: hit ? hit.ids : [], addedBy: p ? p.name : '', addedById: p ? p.id : '', addedAt: now(), ordered: false, deleted: false, orig: t !== typed ? typed.slice(0, 120) : '' })))
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
    supd(ordRef(date, id), { deleted: !restore, deletedBy: restore ? '' : (me() || {}).name || '', deletedAt: restore ? 0 : now() }).then(function () { ordPatch(date, id, { deleted: !restore }); markPast('o', date); }, failed);
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
      '<span class="nb-by"><span class="nb-wrote">' + by + '</span></span>' +
      (canBrowse() && can('del') && (x.deleted || !x.ordered) ? moreBtn(x) : '') +
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
        '<span class="o-who">' + g.lines.map(function (x) {
          // a rolled copy: who first wrote it and the day it was first written, as By day shows it (23 Oct 2026; it said
          // "Rolled over" and today). A very old copy with no origBy keeps "Rolled over".
          var who = x.rolled ? (x.origBy || 'Rolled over') : (x.addedBy || '?'), day = x.rolled ? (x.since || x.rolledFrom || x.date) : x.date;
          return esc((x.qty ? x.qty + ' ' : '') + '(' + who + ', ' + dayShort(day) + ')');
        }).join(' &middot; ') + '</span>' + recipeChips(first) + '</span></li>';
    }).join('') + '</ul>';
  }
  function dayShort(s) { return parseYmd(s).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }); }
  function loadOrdHist() {
    var today = dayNow();
    if (!fb || S.ordHistBusy || waiting('ordHist') || S.ordHistFor === today) return;
    var tag = S.pin + '|' + today, c = dayCache('lk.ord.hist', tag);
    if (c && (+lsGet('lk.ord.hist.at') || 0) >= pastStamp('o')) { S.ordHist = c; S.ordHistFor = today; S.ordHistAt = +lsGet('lk.ord.hist.at') || 0; return; }
    S.ordHistBusy = true;
    var at = now();
    var dates = [], i; for (i = 1; i <= 14; i++) dates.push(shift(today, -i));
    var miss = 0;
    Promise.all(dates.map(function (d) { return fb.fs.getDocs(ordCol(d)).then(function (sn) { return sn.docs.map(function (x) { var v = x.data(); v.date = d; return v; }); }, function () { miss++; return []; }); })).then(function (l) {
      S.ordHist = [].concat.apply([], l).filter(function (x) { return !x.deleted && !x.rolled; }).map(function (x) { return { text: x.text, qty: x.qty || '', date: x.date }; });
      S.ordHistBusy = false;
      // a day that could not be read is not cached as empty: the hints use what came in, and the book tries again later
      if (miss) retryLater('ordHist'); else { S.ordHistFor = today; S.ordHistAt = at; dayCacheSet('lk.ord.hist', tag, S.ordHist); lsSet('lk.ord.hist.at', String(at)); }
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
     first written, with one line on what to do. The block is the first thing under the add box, so there is no separate
     nudge card any more (23 Oct 2026), and its rows leave out their own "Since" badge: the day heading says it. */
  var ORD_LATE = 3;
  function ordWait(x, today) { return Math.round((parseYmd(today) - parseYmd(x.since || x.date)) / 86400000); }
  function ordOverdueHTML(list, today) {
    if (!list.length) return '';
    var by = {}, days = [];
    list.forEach(function (x) { var d = x.since || x.date; if (!by[d]) { by[d] = []; days.push(d); } by[d].push(x); });
    days.sort();
    return '<div class="o-od" id="o-overdue"><h3 class="nb-sh">Waiting more than ' + ORD_LATE + ' days (' + list.length + ')</h3>' +
      '<p class="hint o-od-tip">' + (canBrowse() ? 'Order them today, or remove what is not needed any more.' : 'Tell the head chef or a sous chef.') + '</p>' + days.map(function (d) {
      var n = ordWait(by[d][0], today);
      return '<h4 class="o-od-h">Written ' + esc(dayShort(d)) + ', ' + n + ' days ago</h4><ul class="nb-rows">' + by[d].map(ordRow).join('') + '</ul>';
    }).join('') + '</div>';
  }
  function ordersHTML() {
    // loadLearned: the order rollover and Closing soon need when tomorrow's list is written (summary/learned, once a day)
    if (can('add')) { loadOrdHist(); loadWSum(); loadOrdLearned(); loadLearned(); }
    var br = canBrowse(), view = br ? (S.ordView || 'day') : 'day', today = dayNow();
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
      '<div class="nb-sugg" id="o-sugg">' + ordSuggHTML() + '</div><p class="nb-hint" id="o-hint" aria-live="polite">' + esc(oHintFull()) + '</p>' + oRegsHTML() + '</form>' : (S.ordDate === today ? '<p class="hint">You can read the order list but not write in it.</p>' : '');
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
    return whoTopHTML('') + tabs +
      '<section class="nb-page o-page' + (view === 'all' ? ' o-all' : '') + '"><header class="nb-ph"><div><h2 class="nb-title" id="rtitle" tabindex="-1">' + (view === 'all' ? 'To order' : 'Order list') + '</h2><span class="nb-date">' + (view === 'all' ? 'Across the last ' + ORD_DAYS + ' days' : esc(longDate(S.ordDate))) + '</span></div>' +
      (view === 'day' ? '<div class="nb-prog">' + nOrd + ' of ' + live.length + ' ordered</div>' : '') + '</header>' +
      /* the add box is at the top, so it is always in reach; on big screens the list and the ordered-today list sit side by side below it */
      (view === 'day' && add ? '<div class="nb-foot o-add">' + add + (canBrowse() ? '' : '<p class="hint nb-who">Only the head chef or a sous chef ticks a line as ordered or removes it. Wrote the wrong thing? Undo it straight away, or ask them.</p>') + '</div>' : '') +
      (view === 'day' ? closeoutHTML(null, S.ordDate) : '') +
      '<div class="o-cols"><div class="nb-body o-main">' + body + removedBox + '</div>' + (orderedBox ? '<div class="o-ordered">' + orderedBox + '</div>' : '') + '</div></section>';
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
    wKey = key; S.wState = 'loading';
    unsubW = fb.fs.onSnapshot(wCol(S.wDate), function (snap) {
      S.wLines = snap.docs.map(function (d) { var x = d.data(); x.id = d.id; x.date = S.wDate; return x; });
      S.wState = 'ok'; draw();
    }, function () { S.wState = 'error'; draw(); });
    loadWSum();
  }
  /* Past days hardly change, so these reads are kept on the phone for the day (like lk.past): tag is kitchen PIN and day. */
  function dayCache(k, tag) { try { var c = JSON.parse(lsGet(k) || 'null'); return c && c.tag === tag ? c.v : null; } catch (e) { return null; } }
  function dayCacheSet(k, tag, v) { lsSet(k, JSON.stringify({ tag: tag, v: v })); }
  /* The admin reports' past days (coding rules, 22 Oct 2026): a past day read from the server today is read again from
     this device's own Firestore copy, which costs nothing, until the kitchen day changes. lk.st.got lists the days read
     today and how many records came back, so a copy the browser has thrown away (fewer records) is read from the server
     again. Today, and Refresh (force), always read the server, and so does a past prep or order day read before another phone
     changed one (config/main.pastEdit, see markPast). */
  var gotM = null;
  function gotKeep() {
    var tag = S.pin + '|' + dayNow();
    if (!gotM || gotM.tag !== tag) { try { gotM = JSON.parse(lsGet('lk.st.got') || 'null'); } catch (e) { gotM = null; } if (!gotM || gotM.tag !== tag || !gotM.c) gotM = { tag: tag, c: {} }; }
    return gotM;
  }
  function pastRead(ref, k, d, isDoc, force) {
    var g = gotKeep(), n = g.c[k], live = d >= dayNow(), fs = fb.fs;
    function count(sn) { return isDoc ? (sn.exists() ? 1 : 0) : sn.docs.length; }
    var at = now();
    function server() { return (isDoc ? fs.getDoc(ref) : fs.getDocs(ref)).then(function (sn) { if (!live) { g.c[k] = [count(sn), at]; lsSet('lk.st.got', JSON.stringify(g)); } return sn; }); }
    var fromCache = isDoc ? fs.getDocFromCache : fs.getDocsFromCache;
    // a past prep or order day changed on another phone since this copy was read (config/main.pastEdit): read it again
    var stale = !Array.isArray(n) || n[1] < pastStamp(k.charAt(0) === 'o' ? 'o' : k.charAt(0) === 'd' ? 'p' : '');
    if (live || force || stale || !fromCache) return server();
    return fromCache(ref).then(function (sn) { return count(sn) === n[0] ? sn : server(); }, server);
  }
  function sumDoc() { return fb.fs.doc.apply(null, [fb.db].concat(base(), ['summary', 'waste'])); }
  /* What was wasted in the last 14 days (summary/waste), worked out each night by the server (22 Oct 2026), so staff
     phones never read past wastage lines. One read once a day per phone (on opening the prep list, orders or wastage),
     kept in lk.w.sum until the kitchen day changes. A summary made for an earlier day (the night job has not run yet)
     is used but not kept, so the next page load reads again. A failed read keeps nothing and tries again after 5 minutes. */
  function loadWSum() {
    var today = dayNow(), tag = S.pin + '|' + today;
    if (!fb || S.wSumBusy || waiting('wSum') || (S.wSum && S.wSumFor === today)) return;
    var c = dayCache('lk.w.sum', tag);
    if (c) { S.wSum = c; S.wSumFor = today; return; }
    S.wSumBusy = true;
    fb.fs.getDoc(sumDoc()).then(function (sn) {
      var v = sn.exists() ? sn.data() : null;
      S.wSumBusy = false; S.wSum = v && Array.isArray(v.items) ? v.items : []; S.wSumFor = today;
      if (v && v.day === today) dayCacheSet('lk.w.sum', tag, S.wSum);
      draw();
    }, function () { S.wSumBusy = false; retryLater('wSum'); });
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
    (S.wSum || []).forEach(function (x) { add(x.t); });
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
    return (S.wSum || []).filter(function (x) { return x.n >= 2 && x.t; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 8)
      .map(function (x) { return { text: x.t, n: x.n, unit: x.unit || '', reason: x.reason || '', sec: x.sec || '', amt: wAmt(x.amt) }; });
  }
  // an amount read from summary/waste goes into the box only as a plain number in range (coding rules, text on screen)
  function wAmt(v) { return typeof v === 'number' && v > 0 && v < 100000 ? String(Math.round(v * 100) / 100) : ''; }
  /* A box the book filled in (the usual amount, the section) is selected on the first tap, so typing replaces it
     (coding rules, forms). Only a tap selects: draw() gives focus back after a live change, and that must keep the
     cursor where it was. */
  var FILLED = { 'w-amt': 1, 'w-sec': 1, 'o-qty': 1, 'p-qty': 1, 'p-section': 1 };
  function fillTapDown(e) { var el = e.target; if (el && el.getAttribute && FILLED[el.getAttribute('data-k')] && document.activeElement !== el && el.value) el.setAttribute('data-sel', '1'); }
  function fillTap(e) { var el = e.target; if (el && el.getAttribute && el.getAttribute('data-sel')) { el.removeAttribute('data-sel'); try { el.select(); } catch (x) {} } }
  function focusFilled(k) { var el = S.root && S.root.querySelector('[data-k="' + k + '"]'); if (!el) return; el.focus(); try { el.select(); } catch (x) {} }
  /* the last time this item was logged (the last 14 days): a suggestion fills its unit, reason and section too, and
     the usual amount (the one logged most, else the last one) */
  function wLast(t) {
    var k = okey(t), x = (S.wSum || []).filter(function (e) { return okey(e.t) === k; })[0], l = x && x.last;
    return l ? { unit: l.unit || '', reason: l.reason || '', station: l.sec || '', amt: wAmt(x.amt) || wAmt(l.amt) } : null;
  }
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
    var secInfo = {}, sec = cleanSection(f.sec, secInfo) || mySec(), rm = matchRecipe(t), ref = fb.fs.doc(wCol(S.wDate));
    sset(ref, practiceOn({ text: t, amount: amt, unit: f.unit, reason: f.reason, action: f.act.trim().slice(0, 120), station: sec, recipe: rm ? rm.id : '',
      addedBy: p ? p.name : '', addedById: p ? p.id : '', addedAt: now(), deleted: false })).catch(function (e) { failed(e, function () { if (!S.wf.text.trim()) S.wf = f; }); });
    if (sec) noteSection(sec);
    S.wf = { text: '', amt: '', unit: f.unit, reason: '', sec: sec, act: '' };
    draw(); focusK('w-text');
    /* Undo like the other lists. The rules let only the head chef or a sous chef change a wastage entry, so staff are told who can fix it. */
    var wmsg = 'Logged' + (wpr.changes.length ? ', corrected ' + wpr.changes.map(function (c) { return c[0] + ' to ' + c[1]; }).join(', ') : '') + (secInfo.from ? ' under ' + sec + ' (typed ' + secInfo.from + ')' : '');
    if (canBrowse()) toast(wmsg, { label: 'Undo', fn: function () { supd(ref, { deleted: true, deletedBy: (me() || {}).name || '', deletedAt: now() }).catch(failed); } });
    else toast(wmsg + '. Wrong? Ask the head chef.', null, 6000);
  }
  function focusK(k) { var el = S.root && S.root.querySelector('[data-k="' + k + '"]'); if (el) el.focus(); }
  function focusSel(sel) { var el = S.root && S.root.querySelector(sel); if (el && el.offsetParent !== null) el.focus(); }
  /* Remove or put back a wastage entry: today's on the wastage page (head chef and sous chefs), any day in the admin log.
     Today's lines come from the live list; the admin log's 60 days are patched here (no read), so the change shows at once. */
  function removeWaste(date, id, restore) {
    if (!wAll()) return;
    var mine = (S.wStats && S.wStats.lines) || [], it = (S.wLines || []).concat(mine).filter(function (x) { return x.id === id && x.date === date; })[0];
    var by = restore ? '' : (me() || {}).name || '', at = restore ? 0 : now();
    mine.forEach(function (x) { if (x.id === id && x.date === date) { x.deleted = !restore; x.deletedBy = by; x.deletedAt = at; } });
    supd(wRef(date, id), { deleted: !restore, deletedBy: by, deletedAt: at }).catch(failed);
    if (!restore) toast('Removed ' + (it ? it.text : 'the entry') + ' from the wastage log', { label: 'Undo', fn: function () { removeWaste(date, id, true); } });
    draw();
  }
  /* The end-of-day review lives in the admin panel's wastage log (22 Oct 2026): the head chef writes it for any day of
     the last 60. The known review comes from the log's own reads (loadWStats), so opening it costs nothing more. */
  function rvOf(d) { return ((S.wStats && S.wStats.reviews) || []).filter(function (r) { return r.date === d; })[0] || {}; }
  function rvSet(d, v) {
    if (!S.wStats || !S.wStats.reviews) return;
    S.wStats.reviews = S.wStats.reviews.filter(function (r) { return r.date !== d; }).concat([Object.assign({ date: d }, v)]);
  }
  /* Today's review on the wastage page for the head chef and sous chefs (head chef decision, 22 Oct 2026): one read of
     waste/<today> when a chef opens the page, again on a new day. */
  function rvChef() { return wAll() || isSous(); }
  /* the saved review the typing started from: the wastage page's today, or the admin form's day */
  function rvBase() { return S.wrWhere === 'page' ? S.wReview || {} : rvOf(S.rvDate || dayNow()); }
  function loadPageReview() {
    var today = dayNow();
    if (!fb || S.wReviewFor === today) return;
    S.wReviewFor = today; S.wReview = null;
    fb.fs.getDoc(wDay(today)).then(function (sn) { if (S.wReviewFor === today) { S.wReview = sn.exists() ? sn.data() : {}; draw(); } }, function () { S.wReviewFor = ''; retryLater('wReview'); });
  }
  function saveReview(where) {
    if (where === 'page' ? !rvChef() : !wAll()) return;
    var page = where === 'page', d = page ? dayNow() : S.rvDate || dayNow(), p = me(), name = p ? p.name : 'Head chef', r = page ? S.wReview || {} : rvOf(d);
    // someone else may have saved a review since the log was read: one small read on Save, and a second tap to replace it
    if (!S.wrChecked && fb.fs.getDocFromServer) {
      S.wrChecked = true;
      fb.fs.getDocFromServer(wDay(d)).then(function (sn) {
        var v = sn.exists() ? sn.data() : {};
        if ((v.reviewAt || 0) > (r.reviewAt || 0) && v.reviewBy && v.reviewBy !== name) {
          if (page) S.wReview = v; else rvSet(d, v); arm('wreview'); draw();
          toast(v.reviewBy + ' saved a review at ' + clock(v.reviewAt) + '. Tap Save again to replace it with yours.', null, 8000);
          S.wrChecked = false; return;
        }
        saveReview(where); S.wrChecked = false;
      }, function () { saveReview(where); S.wrChecked = false; });
      return;
    }
    if (armKey === 'wreview') arm('wreview');
    var a = (S.wrA != null ? S.wrA : r.avoidable || '').trim().slice(0, 300), c = (S.wrC != null ? S.wrC : r.change || '').trim().slice(0, 300);
    var v = { avoidable: a, change: c, reviewBy: name, reviewAt: now() };
    sset(wDay(d), v, true).then(function () { if (page) S.wReview = v; rvSet(d, v); S.wrA = S.wrC = null; if (d >= shift(dayNow(), -3)) { S.wNoteFor = ''; lsSet('lk.w.note', ''); } toast('Review saved'); draw(); }, failed);
  }
  /* the head chef's Google account: the only one the rules let read past wastage (22 Oct 2026) */
  function wAll() { return S.level === 'owner' && ownerHere(); }
  function wRow(x) {
    // 22 Oct 2026: entries are removed and put back by the head chef only (the admin log, or this page on the Google device)
    var del = wAll() && !x.deleted;
    return '<li class="nb-row w-row' + (x.deleted ? ' is-removed' : '') + '"><span class="w-time">' + (x.addedAt ? clock(x.addedAt) : '') + (x.station ? '<br><span class="w-sec">' + esc(x.station) + '</span>' : '') + '</span>' +
      '<span class="nb-t"><strong>' + esc(x.text) + '</strong> <span class="w-amt">' + esc(num(+x.amount || 0) + ' ' + x.unit) + '</span> <span class="w-rs w-' + esc(x.reason) + '">' + esc(reasonName(x.reason)) + '</span>' +
      (x.action ? '<span class="w-act">' + esc(x.action) + '</span>' : '') + '</span><span class="nb-by">' + esc(x.addedBy || '') + '</span>' +
      (del ? '<button type="button" class="p-x" data-p="wdel" data-id="' + esc(x.id) + '" data-d="' + esc(x.date) + '" aria-label="' + esc('Remove ' + x.text) + '">Remove</button>' : '') +
      (x.deleted && wAll() ? '<button type="button" class="p-x" data-p="wrestore" data-id="' + esc(x.id) + '" data-d="' + esc(x.date) + '" aria-label="' + esc('Put back ' + x.text) + '">Put back</button>' : '') + '</li>';
  }
  /* Bottom sheet for picking one thing on a phone (the waste reason). Big rows, a hint under each, Cancel or tap outside to close. */
  var REASON_HINT = { prep: 'Trim, peel and offcuts', expired: 'Past its date or gone off', fault: 'Burnt, dropped or done wrong', returned: 'Sent back by a guest', excess: 'Made more than was needed' };
  function sheetHTML() {
    if (S.sheet !== 'reason') return '';
    return '<div class="sheet-bg" data-p="sheet-close"></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-h"><div class="sheet-grip" aria-hidden="true"></div><h3 id="sheet-h">Why was it wasted?</h3><div class="sheet-list" role="radiogroup" aria-labelledby="sheet-h">' +
      REASONS.map(function (r) { return '<button type="button" class="sheet-o" role="radio" data-p="wreason" data-v="' + r[0] + '" aria-checked="' + (S.wf.reason === r[0]) + '"><strong>' + esc(r[1]) + '</strong><span>' + esc(REASON_HINT[r[0]] || '') + '</span></button>'; }).join('') +
      '</div><button type="button" class="btn sheet-x" data-p="sheet-close">Cancel</button></div>';
  }
  /* The wastage page is for logging (head chef decision, 22 Oct 2026): the form and today's entries from the whole team.
     Past days, the end-of-day review and corrections to past days are in the admin panel (Reports, Wastage). */
  function wasteHTML() {
    var today = dayNow();
    if (S.wDate !== today) { S.wDate = today; watchWaste(); }
    var f = S.wf, live = (S.wLines || []).filter(function (x) { return !x.deleted; }).sort(function (a, b) { return (a.addedAt || 0) - (b.addedAt || 0); });
    var shown = (S.wLines || []).filter(function (x) { return wAll() || !x.deleted; }).sort(function (a, b) { return (a.addedAt || 0) - (b.addedAt || 0); });
    var often = wOften();
    var add = can('add') ?
      '<form class="nb-add w-add" data-p-form="wadd">' + (often.length ? '<div class="w-often"><span class="nb-ql">Logged often</span><div class="chiprow">' + often.map(function (e, i) { return '<button type="button" class="chip sq" data-p="woften" data-i="' + i + '">' + esc(e.text) + '</button>'; }).join('') + '</div></div>' : '') +
      '<datalist id="w-sections">' + suggestions().map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join('') + '</datalist>' +
      '<div class="nb-add-row"><label class="visually-hidden" for="w-sec">Section</label><input id="w-sec" class="nb-in nb-in-sec" data-k="w-sec" list="w-sections" enterkeyhint="next" autocomplete="off" placeholder="Section" maxlength="40" value="' + esc(f.sec || mySec()) + '">' +
      '<label class="visually-hidden" for="w-text">Item</label><input id="w-text" class="nb-in nb-in-text" data-k="w-text" enterkeyhint="next" autocomplete="off" placeholder="What was wasted?" maxlength="80" value="' + esc(f.text) + '">' +
      '<label class="visually-hidden" for="w-amt">Amount</label><input id="w-amt" class="nb-in nb-in-qty" data-k="w-amt" inputmode="decimal" enterkeyhint="next" autocomplete="off" placeholder="Amount (' + esc(f.unit || 'unit') + ')" maxlength="8" value="' + esc(f.amt) + '"></div>' +
      '<div class="nb-sugg" id="w-sugg">' + wSuggHTML() + '</div>' +
      '<div class="w-pick"><span class="nb-ql" id="w-unit-l">Unit</span><div class="seg" role="radiogroup" aria-labelledby="w-unit-l">' + UNITS.map(function (u) { return '<button type="button" class="seg-b" role="radio" data-p="wunit" data-v="' + u + '" aria-checked="' + (f.unit === u) + '">' + u + '</button>'; }).join('') + '</div></div>' +
      '<div class="w-pick"><span class="nb-ql" id="w-reason-l">Reason</span><div class="w-rchips" role="radiogroup" aria-labelledby="w-reason-l">' + REASONS.map(function (r) { return '<button type="button" class="chip" role="radio" data-p="wreason" data-v="' + r[0] + '" aria-checked="' + (f.reason === r[0]) + '">' + r[1] + '</button>'; }).join('') + '</div>' +
      '<button type="button" class="w-rbtn' + (f.reason ? '' : ' is-empty') + '" data-p="sheet" data-v="reason" aria-haspopup="dialog">' + (f.reason ? esc(reasonName(f.reason)) : 'Pick a reason') + '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>' +
      // the action is optional, so it folds until wanted (22 Oct 2026, Option B); a chip that fills it opens it
      '<div class="nb-add-row">' + (f.act || f.actOpen ? '<label class="visually-hidden" for="w-act">Action or how to stop it happening again</label><input id="w-act" class="nb-in nb-in-text" data-k="w-act" autocomplete="off" placeholder="Action or how to stop it happening again (optional)" maxlength="120" value="' + esc(f.act) + '">'
        : '<button type="button" class="w-actbtn" data-p="w-act-open">+ Add an action (optional)</button>') +
      '<button type="submit" class="nb-addbtn">Log it</button></div></form>' : '<p class="hint">You can read the wastage log but not write in it.</p>';
    var tot = totalsText(wTotals(live));
    var body = S.wState === 'error' ? '<p class="p-err">Could not load this page. Check the connection.</p>' :
      (shown.length ? '<ul class="nb-rows">' + shown.map(wRow).join('') + '</ul>' : (S.wState !== 'ok' ? '<p class="nb-empty">Loading...</p>' : '<p class="nb-empty">Nothing logged for ' + esc(dayName(S.wDate).toLowerCase()) + ' yet. Log waste when it happens: prep waste, expired stock, cooking faults, returns and excess production.</p>'));
    return whoTopHTML(ksTagHTML()) +
      '<section class="nb-page o-page"><header class="nb-ph"><div><h2 class="nb-title" id="rtitle" tabindex="-1">Wastage</h2><span class="nb-date">' + esc(longDate(S.wDate)) + (tot ? ' &middot; ' + esc(tot) : '') + '</span></div>' +
      '<div class="nb-prog">' + live.length + (live.length === 1 ? ' entry' : ' entries') + '</div></header>' +
      '<p class="w-rule">Write the actual amount and unit, not a dollar value. Unsafe food must never be reused to avoid logging waste.</p>' +
      // the form sits at the top, like the order list, so logging waste on a busy day never means scrolling past every entry
      (add ? '<div class="nb-foot w-addtop">' + add + '</div>' : '') + '<div class="nb-body">' + body + '</div></section>' +
      (rvChef() ? pageReviewHTML() : '') +
      (wAll() ? '<p class="hint w-past">Past days and earlier reviews are in the <a href="#/admin" data-p="a-go-waste">admin panel, Wastage</a>.</p>' : '') + sheetHTML();
  }
  function pageReviewHTML() {
    loadPageReview();
    if (!S.wReview) return '<section class="set-block w-review"><span class="label">End-of-day review</span><p class="hint">Loading...</p></section>';
    var r = S.wReview, ra = S.wrA != null ? S.wrA : (r.avoidable || ''), rc = S.wrC != null ? S.wrC : (r.change || '');
    return '<section class="set-block w-review"><span class="label">End-of-day review</span>' +
      '<div class="field"><label class="label" for="w-ra">Main avoidable waste today</label><textarea id="w-ra" class="w-ta" data-k="w-ra" maxlength="300" rows="2">' + esc(ra) + '</textarea></div>' +
      '<div class="field"><label class="label" for="w-rc">Prep or ordering change for the next shift</label><textarea id="w-rc" class="w-ta" data-k="w-rc" maxlength="300" rows="2">' + esc(rc) + '</textarea><span class="hint">This shows at the top of the next prep list.</span></div>' +
      '<div class="btn-row"><button type="button" class="btn dark" data-p="wreview" data-v="page">Save the review</button></div>' +
      (r.reviewBy ? '<span class="hint">Last saved by ' + esc(r.reviewBy) + (r.reviewAt ? ' at ' + clock(r.reviewAt) : '') + '.</span>' : '') + '</section>';
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
     The head chef or a sous chef writes short pings for the shift (Shift pings tab in the admin panel; Shift pings in
     the chef mark menu for sous chefs). Everyone else only reads them. In the code and the data they are still called notes.
     The first time the book is opened after 10:30 on a day with a ping, the pings show once as a popup. The bell in the top bar opens them again.
     A ping can have its own time of day instead (tm, 22 Oct 2026): it stays out of sight until then and pops up at that time,
     from the local check once a minute (no reads).
     Data: kitchens/<PIN>/notes/<id> { text, tag, start, until, dows, tm, removed, at, upd }. A note shows from start to until (YYYY-MM-DD),
     on the weekdays in dows when there are any (0 is Sunday). Notes are only flagged as removed, never deleted.
     Reads stay small: one query for notes that have not ended yet, once a phone opens each day (and again after 30 minutes away, or at 10:30
     if the book was already open, or when a ping for today was saved: config/main.pastEdit.n, see markPings). No live listener, no
     polling. "Got it" is remembered on the phone only (lk.note.seen). */
  var NOTE_TAGS = [['none', 'Ping'], ['off', 'Off today'], ['special', 'Special'], ['function', 'Function'], ['delivery', 'Delivery'], ['safety', 'Safety'], ['allergen', 'Allergen alert']];
  var NOTE_RANK = { safety: 0, allergen: 1, off: 2, special: 3, function: 4, delivery: 5, none: 6 };
  var NOTE_MIN = 10 * 60 + 30, NOTE_FAR = '2099-12-31', NOTE_STALE = 30 * 60000;
  var npop = null, nprev = null, nTick = null, n1030 = '', nSnooze = null;   // nSnooze: { k: whose Later (noteSeenKey), at }
  function noteTagName(t) { var x = NOTE_TAGS.filter(function (n) { return n[0] === t; })[0]; return x ? x[1] : 'Ping'; }
  function noteOn(n, day) {
    if (!n || n.removed || !n.text || !n.start || !n.until || n.start > day || n.until < day) return false;
    return !(n.dows && n.dows.length) || n.dows.indexOf(parseYmd(day).getDay()) >= 0;
  }
  function noteRank(n) { return NOTE_RANK[n.tag] == null ? 6 : NOTE_RANK[n.tag]; }
  // a ping's own time of day: minutes after midnight in kitchen time, or null for the usual 10:30 popup (checked by type:
  // it comes from Firestore)
  function noteTm(n) { var m = n && n.tm; return typeof m === 'number' && m >= 0 && m < 1440 && Math.floor(m) === m ? m : null; }
  function tmText(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  // today's pings that are showing: a ping with its own time only once that time has come
  function todaysNotes() {
    var t = dayNow(), mins = T.mins();
    if (!featOn('pings')) return [];
    return (S.notes || []).filter(function (n) { var tm = noteTm(n); return noteOn(n, t) && (tm == null || mins >= tm); }).sort(function (a, b) { return noteRank(a) - noteRank(b) || (a.at || 0) - (b.at || 0); });
  }
  function noteSig(list) { return list.map(function (n) { return n.id + ':' + (n.upd || n.at || 0); }).join('|'); }
  /* Got it is kept for each person (23 Oct 2026), so on a shared tablet the first cook's Got it no longer hides the pings
     from the cooks after them: lk.note.seen.<id> while someone is signed in, lk.note.seen with nobody. Out of date when the
     kitchen day changes or today's pings change (d and sig). On a personal phone the first person signed in after the update
     takes over the phone's old mark once (lk.note.mig), so nobody sees today's pings twice. */
  function noteSeenKey() { var p = me(); return p ? 'lk.note.seen.' + p.id : 'lk.note.seen'; }
  function noteSeen() {
    var k = noteSeenKey();
    // not on a shared device: there the phone's mark may be a Got it from someone else, after the update
    if (k !== 'lk.note.seen' && !lsGet('lk.note.mig')) { var old = lsGet('lk.note.seen'); if (old && !lsGet(k) && !shared()) lsSet(k, old); lsSet('lk.note.mig', '1'); }
    try { return JSON.parse(lsGet(k) || '{}') || {}; } catch (e) { return {}; }
  }
  /* a ping the person on this phone saved last (by) is never new to them, so a chef's own 15:00 ping does not pop up at them.
     The head chef's Google device with nobody signed in saves with no by. */
  function noteMine(n) { var p = me(); return p ? n.by === p.id : admDev() && !n.by; }
  function noteTheirs() { return todaysNotes().filter(function (n) { return !noteMine(n); }); }
  function noteUnread() { var l = noteTheirs(), s = noteSeen(); return !!l.length && !(s.d === dayNow() && s.sig === noteSig(l)); }
  /* what the bell shows: on (pings or minutes are on for this phone), today's pings, an unread one, minutes to sign */
  function noteInfo() {
    var on = /^\d{4,6}$/.test(S.pin) && (featOn('pings') || featOn('minutes'));
    return { on: on, n: todaysNotes().length, unread: noteUnread(), sign: featOn('minutes') ? mnUnsigned().length : 0 };
  }
  function noteBellLabel(i) { return i.n + ' shift ping' + (i.n === 1 ? '' : 's') + ' today' + (i.unread ? ', new' : '') + (i.sign ? '. Minutes to sign: ' + i.sign : ''); }
  /* The bell in the top bar (23 Oct 2026): there every day while pings or minutes are on, so the top bar keeps one shape.
     It has a dot while a ping is unread or minutes are waiting to be signed, and opens the same sheet at any time. */
  function noteBell() {
    var i = noteInfo();
    Array.prototype.forEach.call(document.querySelectorAll('.nbell'), function (b) {
      b.hidden = !i.on; b.classList.toggle('has-new', i.unread || i.sign > 0);
      b.setAttribute('aria-label', noteBellLabel(i));
    });
  }
  function notesInit() {
    if (!/^\d{4,6}$/.test(S.pin)) return;
    sdk().then(function () { loadNotes(); loadMinutes(); loadGuides(); rxSync(); startNoteTick(); }, function () {});
  }
  function loadNotes(force) {
    var today = dayNow();
    if (!fb || !/^\d{4,6}$/.test(S.pin) || S.notesBusy || !featOn('pings')) return;
    if (!force && S.notes && S.notesFor === today && Date.now() - S.notesAt < NOTE_STALE) return;
    S.notesBusy = true;
    var readAt = now();
    fb.fs.getDocs(fb.fs.query(colRef('notes'), fb.fs.where('until', '>=', today))).then(function (snap) {
      S.notes = snap.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
      S.notesFor = today; S.notesAt = Date.now(); S.notesRead = readAt; S.notesBusy = false;
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
  // isNew: not in what was last seen on this phone today (a ping with its own time pops up again with the others)
  function noteRowHTML(n, isNew) {
    var tm = noteTm(n);
    return '<li class="nt-i t-' + esc(n.tag || 'none') + '"><span class="nt-tags">' + (isNew ? '<span class="nt-tag nt-new">New</span> ' : '') + '<span class="nt-tag">' + esc(noteTagName(n.tag) + (tm != null ? ' ' + tmText(tm) : '')) + '</span></span><p>' + linkNote(n.text) + '</p></li>';
  }
  /* The pings sheet (23 Oct 2026). One sheet for what the team is told: today's pings, then the minutes this person still
     has to sign. It slides up from the bottom on a phone and a tablet, and sits in the middle on a laptop. It opens:
       'start'  once a day per person, at the start of their shift (their PIN, or the first open of the day): pings and minutes
       'due'    at 10:30, at a ping's own time, or when a ping for today was saved: pings only
       'tap'    from the bell, any time: everything, also "No pings today."
     With unread pings it goes in two steps: the pings with Got it, then the minutes to sign, so Read and sign never skips
     a ping. Only Got it (or a link in a ping) marks pings read; Later, Escape, a tap outside and Back put them off. */
  var NOTE_URGENT = { safety: 1, allergen: 1, off: 1 };
  // a ping is due to pop up: from 10:30, or once a ping's own time has come
  function noteDueTime() { return T.mins() >= NOTE_MIN || todaysNotes().some(function (n) { return noteTm(n) != null; }); }
  // the pings this person has not seen yet today (by id and version)
  function noteNew() {
    var s = noteSeen(), was = s.d === dayNow() && s.sig ? String(s.sig).split('|') : [];
    return noteTheirs().filter(function (n) { return was.indexOf(n.id + ':' + (n.upd || n.at || 0)) < 0; });
  }
  function mnMineN(m) { return (m.acts || []).filter(function (a) { return a && a.what && (!a.st || a.st === 'open') && (a.who === S.who || a.who === 'all'); }).length; }
  function noteMins() { return featOn('minutes') ? mnUnsigned() : []; }
  function mnRowHTML(m) {
    var n = mnMineN(m), icon = window.LK_APP && window.LK_APP.icon ? window.LK_APP.icon('doc') : '';
    return '<a class="nt-a" href="#/minutes" data-note="mn" data-id="' + esc(m.id) + '">' + icon + '<span><b>Kitchen meeting, ' + esc(dayShort(m.date)) + '</b><small>Read and sign' + (n ? '. Your actions: ' + n : '') + ((m.v || 1) > 1 ? '. Changed, sign again' : '') + '</small></span></a>';
  }
  function noteInHTML(el) {
    var pv = el.lkPv, why = el.lkWhy, p = me(), t = dayNow();
    var list = pv ? pv.list : todaysNotes(), mins = pv || why === 'due' ? [] : noteMins();
    if (!pv && el.lkStep === 'pings' && !noteUnread()) el.lkStep = 'rest';   // read on another tab, or the pings changed
    var step = pv ? 'pings' : el.lkStep, showPings = step === 'pings' || why === 'tap';
    var editor = pv ? '' : admDev() ? '<a class="nt-edit" href="#/admin" data-note="edit">Write or edit pings</a>' : (canPing() ? '<a class="nt-edit" href="#/prep" data-note="edit-sous">Write or edit pings</a>' : '');
    var h = pv ? 'Preview' : showPings || !mins.length ? 'Today\'s shift pings' : 'Minutes to sign';
    var out = '<header class="nt-head"><span class="nt-eb">' + esc(p ? p.name : 'Leichhardt Hotel Kitchen') + '</span><h2 class="nt-h" id="nt-h">' + h + '</h2><span class="nt-date">' + esc(pv ? pv.label : parseYmd(t).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })) + '</span></header><div class="nt-body">';
    if (showPings && list.length) {
      out += '<ul class="nt-list">' + list.map(function (n) { return noteRowHTML(n, step === 'pings' && !pv && !!el.lkWas && el.lkWas.indexOf(n.id + ':' + (n.upd || n.at || 0)) < 0 && !noteMine(n)); }).join('') + '</ul>';
      if (!pv) out += '<div class="nt-sum" id="nt-sum"></div>';   // filled in by noteDraw, so a tick elsewhere does not redraw the sheet
    } else if (showPings && !mins.length) out += '<p class="nt-none">No pings today.</p>';
    if (step === 'pings' && mins.length) out += '<p class="nt-next">Next: ' + (mins.length === 1 ? 'minutes to sign' : 'minutes from ' + mins.length + ' meetings to sign') + '</p>';
    else if (mins.length) out += '<h3 class="nt-sh">To sign</h3><div class="nt-mn">' + mins.map(mnRowHTML).join('') + '</div>';
    out += '</div><footer class="nt-foot">';
    if (pv) out += '<button type="button" class="nt-got" data-note="close">Close preview</button>';
    else if (step === 'pings') out += '<button type="button" class="nt-got" data-note="close">Got it</button><button type="button" class="nt-later" data-note="dismiss">Later</button>';
    else out += '<button type="button" class="nt-later" data-note="dismiss">' + (mins.length ? 'Later' : 'Close') + '</button>';
    return out + editor + '</footer>';
  }
  /* draws the sheet again when what it shows changed (a read came in, a ping was read on another tab), keeping the place
     it was scrolled to and the focus. The prep line under the pings changes with every tick, so it is filled in on its own. */
  function noteDraw(focusFirst) {
    var box = npop && npop.querySelector('.nt-in');
    if (!box) return;
    var h = noteInHTML(npop);
    if (box.lkH !== h || focusFirst) {
      var ae = document.activeElement, all = box.querySelectorAll('[data-note]'), ix = ae && box.contains(ae) ? Array.prototype.indexOf.call(all, ae) : -1;
      var k = ix >= 0 ? ae.getAttribute('data-note') + '|' + (ae.getAttribute('data-id') || '') : '', sb = box.querySelector('.nt-body'), st = sb ? sb.scrollTop : 0;
      box.innerHTML = h; box.lkH = h;
      var nb = box.querySelector('.nt-body'); if (nb && !focusFirst) nb.scrollTop = st;
      var f = null;
      if (focusFirst) f = box.querySelector('.nt-a, .nt-got, .nt-later');
      else if (k) {
        // the same control, by its place among the sheet's controls, else the first with the same click name
        var now2 = box.querySelectorAll('[data-note]'), same = function (el) { return el && el.getAttribute('data-note') + '|' + (el.getAttribute('data-id') || '') === k; };
        f = same(now2[ix]) ? now2[ix] : Array.prototype.filter.call(now2, same)[0] || null;
      }
      if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} }
    }
    var sum = box.querySelector('#nt-sum');
    if (sum) { var sh = noteSummary(); if (sum.lkH !== sh) { sum.innerHTML = sh; sum.lkH = sh; } }
  }
  /* an open sheet that came up by itself and has nothing left to show (its ping removed, read on another tab, the page
     held back) closes without marking anything */
  function noteRefresh() {
    if (!npop || npop.lkClosing) return;
    if (!npop.lkPv && npop.lkWhy !== 'tap' && !(npop.lkStep === 'pings' && noteUnread()) && !(npop.lkWhy !== 'due' && noteMins().length)) { noteClose('shut'); return; }
    noteDraw(false);
  }
  // pv: the ping editor's Preview ({ list, label }); why: 'start', 'due' or 'tap' (see above)
  function noteOpen(pv, why) {
    if (npop) return;
    why = pv ? 'pv' : why || 'tap';
    var unread = !pv && noteUnread();
    if (why === 'due' && !unread) return;
    if (why === 'start' && !(unread && noteDueTime()) && !noteMins().length) return;
    if (pv && !pv.list.length) return;
    var s = noteSeen();
    nprev = document.activeElement;
    var el = document.createElement('div');
    el.className = 'nt-wrap';
    el.lkPv = pv || null; el.lkWhy = why;
    el.lkStep = pv || (unread && (why !== 'start' || noteDueTime())) ? 'pings' : 'rest';
    el.lkWas = s.d === dayNow() && s.sig ? String(s.sig).split('|') : null;   // New marks only what came since the last Got it today
    el.innerHTML = '<div class="nt-bg" data-note="dismiss"></div><section class="nt" role="dialog" aria-modal="true" aria-labelledby="nt-h" tabindex="-1"><div class="nt-grip" aria-hidden="true"></div><div class="nt-in"></div></section>';
    if (pv) el.setAttribute('data-pv', '1');
    npop = el;
    noteDraw(false);
    document.body.appendChild(el);
    ovPush('note');
    document.documentElement.classList.add('note-open');
    loadWNote();
    var got = el.querySelector('.nt-got') || el.querySelector('.nt-a') || el.querySelector('.nt-later'); if (got) got.focus({ preventScroll: true });
  }
  /* how: 'got' (Got it: the pings are read; with minutes to sign the sheet goes on to them), 'read' (a link in a ping or
     Write or edit pings: read, and close), 'later' (Later, Escape, a tap outside, Back: put off, the pings come back by
     themselves in 15 minutes) or 'shut' (signed out, or the page held back: neither). A stray tap never reads a safety ping. */
  function noteClose(how, noBack) {
    if (!npop || npop.lkClosing) return;
    var pv = npop.lkPv, why = npop.lkWhy, pings = npop.lkStep === 'pings';
    if (!pv && pings && how === 'got' && why !== 'due' && noteMins().length) {
      noteMarkSeen(); noteWriteSeen(noteTheirs());
      npop.lkStep = 'rest'; noteDraw(true); liveSay('Pings read. Minutes to sign are below.'); return;
    }
    npop.lkClosing = true;   // the seen record below can redraw the page, which must not close the sheet a second time
    if (!pv && pings && (how === 'got' || how === 'read')) { noteMarkSeen(); noteWriteSeen(noteTheirs()); }
    if (!pv && pings && how === 'later' && noteUnread()) nSnooze = { k: noteSeenKey(), at: Date.now() };   // Later is that person's only
    // the bell's sheet shows all the start would: closed with the reads in, it is today's start for that person
    if (why === 'tap' && how !== 'shut') { var bp = me(); if (bp && !S.guestIn && noteReads() === 'in') lsSet('lk.board.' + bp.id, dayNow()); }
    ovDone('note', noBack);
    npop.parentNode.removeChild(npop); npop = null;
    document.documentElement.classList.remove('note-open');
    if (nprev && nprev.focus && document.body.contains(nprev)) { try { nprev.focus({ preventScroll: true }); } catch (e) {} }
    nprev = null;
    // closed by a link or by Back: hand on once the page has changed (the mail nudge never lands on a recipe it led to)
    if (noBack) setTimeout(sheetNext, 0); else sheetNext();
  }
  function noteMarkSeen() { lsSet(noteSeenKey(), JSON.stringify({ d: dayNow(), sig: noteSig(noteTheirs()) })); noteBell(); }
  /* The start of a shift waits for the day's pings, minutes and this person's sign-offs, so the sheet opens once with
     everything. A read that failed is not waited for (it tries again later; the 10:30 pings still pop up). */
  function noteReads() {
    var t = dayNow(), pings = !featOn('pings') || S.notesFor === t, mins = !featOn('minutes') || (S.minsFor === t && mnOpenList().every(function (m) { var v = S.mmine[mnKey(m)]; return v !== undefined && v !== 'loading'; }));
    var busy = S.notesBusy || S.minsBusy || mnOpenList().some(function (m) { return S.mmine[mnKey(m)] === 'loading'; });
    return pings && mins ? 'in' : busy ? 'busy' : 'failed';
  }
  /* Pops up by itself, one sheet at a time (sheetBusy): at the start of a person's shift, once a day on this phone
     (lk.board.<id>: out of date when the kitchen day changes), and after 10:30 or a ping's own time while a ping is
     unread. A person signed in on a shared device only to tick or add (S.guestIn) gets no start of shift, and only an
     unread Safety, Allergen alert or Off today ping pops up for them; the others wait on the bell. */
  function noteMaybePop() {
    // a person picked but not signed in yet (their PIN screen, a desktop idle lock) gets it after their PIN, as themselves
    if (npop || sheetBusy() || (S.who && !S.authed)) return;
    if (ksWant) { ksWant = false; ksOpen(); if (ksPop) return; }   // the section first, then the pings
    var p = me(), t = dayNow();
    if (p && !S.guestIn && lsGet('lk.board.' + p.id) !== t) {
      var r = noteReads();
      if (r === 'busy') return;
      if (r === 'in') {
        lsSet('lk.board.' + p.id, t);
        if ((noteUnread() && noteDueTime()) || noteMins().length) { noteOpen(null, 'start'); return; }
      }
    }
    if ((nSnooze && nSnooze.k === noteSeenKey() && Date.now() - nSnooze.at < 15 * 60000) || !noteUnread() || !noteDueTime()) return;
    if (S.guestIn && !noteNew().some(function (n) { return NOTE_URGENT[n.tag]; })) return;
    noteOpen(null, 'due');
  }
  /* A local check once a minute (no reads): pops the note when 10:30 or a ping's own time arrives or typing stops (the bell
     counts a timed ping from its time), and fetches once at 10:30 and when a new day starts. */
  function startNoteTick() {
    if (nTick) return;
    if (T.mins() >= NOTE_MIN) n1030 = dayNow();
    nTick = setInterval(function () {
      var t = dayNow();
      if (S.guidesFor && S.guidesFor !== t) loadGuides();
      if (S.notesFor && S.notesFor !== t) { loadNotes(true); return; }
      if (n1030 !== t && T.mins() >= NOTE_MIN) { n1030 = t; loadNotes(true); return; }
      noteBell(); sheetNext();
    }, 60000);
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && /^\d{4,6}$/.test(S.pin) && fb) { loadNotes(); noteMaybePop(); rxSync(); } });
  window.addEventListener('lk-clock', function () { draw(); });
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-note]');
    if (!el) return;
    var a = el.getAttribute('data-note');
    if (a === 'open') { noteOpen(null, 'tap'); return; }
    if (a === 'close') { noteClose('got'); return; }
    if (a === 'dismiss') { noteClose('later'); return; }
    if (a === 'link') { noteClose('read', true); return; }
    // Read and sign: the minutes the row names (the sheet sits outside the prep root), then on to #/minutes by its link
    if (a === 'mn') { S.mSel = el.getAttribute('data-id'); S.mErr = ''; noteClose('later', true); if (location.hash === '#/minutes') draw(); return; }
    if (a === 'edit') { S.atab = 'notes'; lsSet('lk.prep.atab', 'notes'); noteClose('read', true); if (location.hash === '#/admin') draw(); return; }
    if (a === 'edit-sous') { S.notesOpen = true; S.nf = null; noteClose('read', true); if (location.hash === '#/prep') draw(); return; }
  });
  document.addEventListener('keydown', function (e) {
    if (!npop) return;
    if (e.key === 'Escape') { e.preventDefault(); noteClose('later'); return; }
    if (e.key === 'Tab') trapTab(e, npop);
  });
  /* One sheet at a time (23 Oct 2026). The section picker, the pings sheet and the head chef's mail nudge open by
     themselves; each waits while another sheet, the chef hat menu, a big guide page or a first PIN's One more thing is
     open, while the page is hidden and while someone is typing, and the one that closes hands on with sheetNext(). A
     closing sheet takes its history entry off with Back (ovDone), so the next one waits for that Back to land first. */
  var ksWant = false, ksWait = false, nextWait = false;
  // every sheet or popup over the page: these, the function sheet, the wastage reason sheet and the other bottom sheets
  function sheetOpen() { return !!(ksPop || npop || mlPop || gz || S.sheet || document.querySelector('.wm-wrap, .fn-pop, .sheet-bg')); }
  function typing() { var ae = document.activeElement; return !!(ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && ae.type !== 'button'); }
  // a first PIN's One more thing, while it is on the screen (it shows only on the prep list)
  function dkFirstUp() { return S.drinkAsk === 'first' && S.name === 'prep' && !!(S.root && document.body.contains(S.root) && S.root.querySelector('.dr-first')); }
  function sheetBusy() { return sheetOpen() || ksWait || ovBack || dkFirstUp() || document.visibilityState === 'hidden' || typing(); }
  function sheetNext() {
    if (ovBack) { nextWait = true; return; }
    nextWait = false;
    if (ksWant && !sheetOpen() && !dkFirstUp()) { ksWant = false; ksOpen(); if (ksPop) return; }
    noteMaybePop();
    mlMaybePop();
  }

  /* writing shift pings: the Shift pings tab of the admin panel (head chef) and Shift pings in the prep book (sous chefs, from the chef mark menu).
     The list comes first (showing today, coming up, past notes on request). The editor opens beside it on a
     big screen and above it on a phone. Days are picked on a five week grid and every tap can be undone. */
  var NOTE_START = { off: 'Off today: ', special: 'Special: ', 'function': 'Function: ', delivery: 'Delivery: ', safety: 'Safety: ', allergen: 'Allergen alert: ' };
  /* a note being written counts as unsaved once it differs from what the editor opened with (or has any text, if that is unknown) */
  function nfDirty() { var f = S.nf; if (!f || !S.nOpen) return false; return S.nfSnap ? JSON.stringify(f) !== S.nfSnap : !!f.text.trim(); }
  function nfNew() { return { id: '', text: '', tag: 'none', start: dayNow(), until: '', dows: [], run: false, tm: '' }; }
  function nfFrom(n) {
    var rep = n.dows && n.dows.length, until = n.until === NOTE_FAR || (n.until === n.start && !rep) ? '' : n.until, tm = noteTm(n);
    return { id: n.id, text: n.text, tag: n.tag || 'none', start: n.start, until: until, dows: (n.dows || []).slice(), run: !!until, tm: tm == null ? '' : tmText(tm) };
  }
  // the editor's time box (HH:MM) as minutes after midnight, or null when empty or not a time
  function nfTm(f) { var m = /^(\d{2}):(\d{2})$/.exec(f.tm || ''); return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null; }
  function noteDay(s, t) { return s === t ? 'today' : s === shift(t, 1) ? 'tomorrow' : dayShort(s); }
  function noteWhen(n) {
    var t = dayNow(), rep = n.dows && n.dows.length, out;
    if (rep) {
      var names = DOW.filter(function (d) { return n.dows.indexOf(d) >= 0; }).map(function (d) { return DOWN[DOW.indexOf(d)]; }).join(', ');
      out = 'Every ' + names + ' from ' + noteDay(n.start, t) + (n.until === NOTE_FAR ? '' : ' until ' + noteDay(n.until, t));
    } else out = n.until === n.start ? noteDay(n.start, t) : noteDay(n.start, t) + ' to ' + noteDay(n.until, t);
    if (noteTm(n) != null) out += ', from ' + tmText(noteTm(n));
    return out.charAt(0).toUpperCase() + out.slice(1);
  }
  function nfUntil(f) { return f.until || (f.dows.length ? NOTE_FAR : f.start); }
  function nfDraft(f) { return { id: 'draft', text: f.text.replace(/^\s+|\s+$/g, ''), tag: f.tag, start: f.start, until: nfUntil(f), dows: f.dows.slice(), tm: nfTm(f) }; }
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
    var when = f.start && until >= f.start ? 'Shows: ' + noteWhen({ start: f.start, until: until, dows: f.dows, tm: nfTm(f) }) + '.' : 'The last day cannot be before the first day.';
    var single = !f.run && !f.until;
    return '<section class="set-block n-edit"><span class="label">' + (f.id ? 'Edit this ping' : 'Write a ping') + '</span>' +
      '<span class="hint">Short and plain. It pops up the first time the book is opened after 10:30, or at the time you set below, and shows from the bell. No prices, PINs or staff names. A recipe name links to its card.</span>' +
      '<div class="field"><label class="label" for="n-text">Ping</label><textarea id="n-text" class="p-bulk" data-k="n-text" rows="4" maxlength="400" placeholder="For example: Barramundi is off until Thursday.">' + esc(f.text) + '</textarea><span class="hint" id="n-count">' + f.text.length + ' of 400. Ctrl+Enter saves.</span></div>' +
      '<div class="field"><span class="label">Tag (starts the ping for you)</span><div class="nt-chips" role="group" aria-label="Tag">' + tags + '</div></div>' +
      '<div class="field"><span class="label">How it will look</span><div id="n-prev" class="n-prev">' + draftPreviewHTML(f) + '</div></div>' +
      '<div class="field"><span class="label">Show on</span><div class="nt-chips"><button type="button" class="chip" data-p="n-quick" data-v="0" aria-pressed="' + (f.start === t && single && !f.dows.length) + '">Today</button><button type="button" class="chip" data-p="n-quick" data-v="1" aria-pressed="' + (f.start === shift(t, 1) && single && !f.dows.length) + '">Tomorrow</button>' +
      '<button type="button" class="chip" data-p="n-mode" data-v="one" aria-pressed="' + (!f.run && !f.until) + '">One day</button><button type="button" class="chip" data-p="n-mode" data-v="run" aria-pressed="' + (f.run || !!f.until) + '">Several days</button></div>' +
      '<span class="hint">' + (f.run || f.until ? 'Tap the first day, then the last day. Tap the last day again to take it back.' : 'Tap a day to schedule the ping ahead of time.') + '</span>' + dayGridHTML(f) +
      '<details class="n-more"' + (f.start > shift(t, 34) || (f.until && f.until > shift(t, 34)) ? ' open' : '') + '><summary>A date further ahead</summary><div class="nt-dates"><label class="nt-dl">From<input type="date" class="p-dateinput" data-k="n-start" value="' + esc(f.start) + '"' + (f.id ? '' : ' min="' + t + '"') + '></label><label class="nt-dl">Until (optional)<input type="date" class="p-dateinput" data-k="n-until" value="' + esc(f.until) + '"' + (f.start ? ' min="' + esc(f.start) + '"' : '') + '></label></div></details></div>' +
      '<div class="field"><span class="label">Repeat every week on (optional)</span><div class="nt-chips" role="group" aria-label="Weekdays">' + dows + (f.dows.length ? '<button type="button" class="chip" data-p="n-dowclr">Clear weekdays</button>' : '') + '</div><span class="hint">With weekdays picked and no last day, the ping comes back every week until you remove it.</span></div>' +
      '<div class="field"><label class="label" for="n-tm">Pop up at (optional)</label><div class="nt-chips"><input id="n-tm" type="time" class="p-dateinput" data-k="n-tm" value="' + esc(f.tm || '') + '">' + (f.tm ? '<button type="button" class="chip" data-p="n-tmclr">No set time</button>' : '') + '</div><span class="hint">Empty: it pops up at 10:30 with the day\'s other pings. With a time, it stays out of sight until then and pops up on every phone at that time.</span></div>' +
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
    if (f.tm && nfTm(f) == null) { S.nMsg = 'Pick a time, or tap No set time.'; draw(); return; }
    // tm is always written (null for no set time), so an edit that takes the time away clears it
    var data = { text: text.slice(0, 400), tag: f.tag, start: start, until: until, dows: f.dows.slice().sort(), tm: nfTm(f), removed: false, upd: now() };
    // author is who wrote the ping and never changes; by is who saved it last (the rules need by to be the writer)
    if (!f.id) { data.at = now(); data.author = S.who || ''; }
    var ref = f.id ? docRef('notes', f.id) : fb.fs.doc(colRef('notes')), when = noteWhen({ start: start, until: until, dows: data.dows, tm: data.tm });
    var was = f.id ? (S.notes || []).filter(function (x) { return x.id === f.id; })[0] : null, t = dayNow();
    // the head chef's Google device with nobody signed in: saved by nobody, so the change is new to the ping's writer
    // (W() adds no by there, and a merge would keep theirs). An older ping with no author keeps its writer.
    if (!canW()) { data.by = ''; if (was && !was.author && was.by) data.author = was.by; }
    S.nSaving = true; S.nMsg = ''; draw();
    sset(ref, data, !!f.id).then(function () {
      if (noteOn(data, t) || (was && noteOn(was, t))) markPings();
      S.nSaving = false; S.nf = nfNew(); S.nOpen = false; S.nMsg = 'Saved. Shows: ' + when + '.'; loadNotes(true); draw();
    }, function (e) {
      S.nSaving = false; S.nMsg = e && e.code === 'permission-denied' ? 'Not allowed. Ask the head chef to tick Pings for you in the admin panel.' : 'Could not save. Check the connection and try again.'; draw();
    });
  }
  function removeNote(id) {
    if (!arm('n-del:' + id)) return;
    var was = (S.notes || []).filter(function (x) { return x.id === id; })[0], today = !!was && noteOn(was, dayNow());
    sset(docRef('notes', id), { removed: true, upd: now() }, true).then(function () {
      if (today) markPings();
      if (S.nf && S.nf.id === id) { S.nf = nfNew(); S.nOpen = false; }
      S.nMsg = 'Removed.'; loadNotes(true); draw();
      toast('Ping removed.', { label: 'Undo', fn: function () { sset(docRef('notes', id), { removed: false, upd: now() }, true).then(function () { if (today) markPings(); S.nMsg = ''; loadNotes(true); draw(); }, failed); } });
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
    var tm = noteTm(n);
    S.nf = nfNew(); S.nf.text = n.text; S.nf.tag = n.tag || 'none'; S.nf.tm = tm == null ? '' : tmText(tm); S.nfSnap = ''; S.nOpen = true; S.nMsg = '';
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
    if (!fb || !canW() || !list.length) return;
    var day = dayNow(), rec; try { rec = JSON.parse(lsGet('lk.note.sw') || '{}') || {}; } catch (e) { rec = {}; }
    if (rec.d !== day || rec.w !== S.who) rec = { d: day, w: S.who, ids: [] };
    list.forEach(function (n) {
      if (rec.ids.indexOf(n.id) >= 0) return;
      rec.ids.push(n.id); lsSet('lk.note.sw', JSON.stringify(rec));
      sset(fb.fs.doc.apply(null, [fb.db].concat(base(), ['notes', n.id, 'seen', day + '_' + S.who])), { day: day, at: now() }).catch(function () {});
    });
  }

  /* ---------- kitchen meeting minutes ----------
     The head chef (admin panel, Minutes tab) writes the minutes after a meeting and publishes them. Sous chefs only see the register ("See who has signed" at the top of #/minutes).
     Staff read them at #/minutes in one fixed layout and sign with their own PIN. A card on the landing page and a nudge on the prep list show until a person has signed; Meeting minutes in the chef hat menu opens them any time.
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
  function mnCanWrite() { return S.level === 'owner' && ownerHere(); }
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
  /* Minutes to sign show in the pings sheet at the start of each shift, on the bell's dot and as "1 to sign" in the chef
     hat menu (23 Oct 2026). The landing page (js/app.js draws the empty slot) adds a slim row only once they are late, more
     than MN_LATE days after publishing (the register's late mark), until the person signs. Nothing on the prep list. */
  function minCard() {
    var h = minNudgeHTML();
    Array.prototype.forEach.call(document.querySelectorAll('.wall-mn'), function (el) { if (el.lkMn !== h) { el.innerHTML = h; el.lkMn = h; } });
    noteBell();
  }
  // when minutes count as late: MN_LATE days after they were published (pubAt, else saved; numbers only, from Firestore)
  function mnLateAt(m) { var t = typeof m.pubAt === 'number' ? m.pubAt : typeof m.at === 'number' ? m.at : now(); return t + MN_LATE * 86400000; }
  function minNudgeHTML() {
    var t = now(), u = featOn('minutes') ? mnUnsigned().filter(function (m) { return t >= mnLateAt(m); }) : [];
    if (!u.length) return '';
    var days = Math.max(1, Math.floor((t - mnLateAt(u[0])) / 86400000) + MN_LATE);
    return '<div class="mn-nudge" role="status"><span><b>Minutes not signed yet</b> Kitchen meeting, ' + esc(dayShort(u[0].date)) + (u.length > 1 ? ' and ' + (u.length - 1) + ' more' : '') + ', ' + ((u[0].v || 1) > 1 ? 'changed ' : 'published ') + days + ' days ago</span><a class="mn-nudge-btn" href="#/minutes" data-mn="' + esc(u[0].id) + '">Read and sign</a></div>';
  }
  // "Read and sign" opens the minutes the card names, not just the newest published ones (the card sits outside the prep root)
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('.mn-nudge-btn[data-mn]'); if (a) { S.mSel = a.getAttribute('data-mn'); S.mErr = ''; } }, true);
  function loadMinutes(force) {
    var today = dayNow(), all = S.level === 'owner';
    if (!fb || !/^\d{4,6}$/.test(S.pin) || S.minsBusy || !featOn('minutes')) return;
    if (!force && S.mins && S.minsFor === today && S.minsAll === all && Date.now() - S.minsAt < MN_STALE) return;
    S.minsBusy = true;
    // one query when the book opens, again after 30 minutes: one read per minutes in the last 90 days. The head chef's
    // Google account lists them by meeting date, drafts too; everyone else asks only for published ones, by when they were
    // published (pubAt, which a draft never has), because that is all the rules let them list (22 Oct 2026, review S9)
    var q = all ? fb.fs.where('date', '>=', shift(today, -MN_DAYS)) : fb.fs.where('pubAt', '>=', now() - MN_DAYS * 86400000);
    fb.fs.getDocs(fb.fs.query(colRef('minutes'), q)).then(function (snap) {
      S.mins = snap.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
      S.minsFor = today; S.minsAll = all; S.minsAt = Date.now(); S.minsBusy = false;
      loadMine(); minCard(); draw(); noteMaybePop();
    }, function () {
      // no signal, or the minutes rules are not published yet: carry on without them and try again in about 5 minutes
      S.minsBusy = false; S.minsAt = Date.now() - MN_STALE + 5 * 60000; if (!S.mins) S.mins = [];
      minCard(); draw(); noteMaybePop();
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
    if (jobs.length) Promise.all(jobs).then(function () { minCard(); draw(); noteMaybePop(); });
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
    var mineN = mnMineN(m);
    return '<section class="mn-sign mn-noprint"><h3 class="mn-bh">Sign off</h3>' +
      ((m.v || 1) > 1 ? '<p class="mn-changed">These minutes were changed after they were first published (version ' + m.v + '). If you signed before, read them again and sign this version.</p>' : '') +
      (mineN ? '<p class="mn-mine">Your actions: ' + mineN + ', marked Yours above.</p>' : '') +
      '<p>' + (st === 'present' ? 'I attended and have read and understood these minutes.' : 'I have read and understood these minutes.') + '</p>' +
      '<button type="button" class="btn dark mn-signbtn" data-p="mn-sign" data-id="' + esc(m.id) + '"' + (S.mSigning ? ' disabled' : '') + '>Sign as ' + esc(p.name) + '</button>' +
      '<span class="mn-err" role="status" id="mn-pinmsg">' + esc(S.mErr) + '</span><p class="hint">Your name, the version and the time are recorded. Apology and absent staff sign too.</p></section>';
  }
  /* the way to the register for a chef: the admin Minutes tab on the head chef's Google device (where minutes are
     written too), the sous chef page elsewhere. short: the top bar's words, which fit beside "Not you?" on a phone */
  function mnRegLink(short) {
    return admDev() ? '<button type="button" class="p-link" data-p="mn-admin">' + (short ? 'See who has signed' : 'Write minutes and see who has signed') + '</button>' : (isSous() ? '<button type="button" class="p-link" data-p="mn-sous">See who has signed</button>' : '');
  }
  function mnWriteLink() {
    var l = mnRegLink();
    return l ? '<p class="mn-noprint mn-wl">' + l + '</p>' : '';
  }
  function minutesPageHTML() {
    loadMinutes();
    var p = me(), list = mnPub();
    // with minutes to read, the register link sits in the top bar (22 Oct 2026: it replaced the Minutes register in the chef hat menu)
    var top = '<div class="nb-top mn-noprint"><span>' + (p ? 'Signing as <strong>' + esc(p.name) + '</strong>' : '') + '</span><span class="p-links">' + (list.length ? mnRegLink(true) : '') + '<button type="button" class="p-link" data-p="who-change">Not you?</button></span></div>';
    // loading and nothing published yet: the same notebook card as the order list and wastage
    function card(msg) {
      return top + '<section class="nb-page o-page mn-empty"><header class="nb-ph"><div><h2 class="nb-title" id="rtitle" tabindex="-1">Meeting minutes</h2><span class="nb-date">Last ' + MN_DAYS + ' days</span></div></header>' +
        '<div class="nb-body"><p class="nb-empty">' + msg + '</p>' + mnWriteLink() + '</div></section>';
    }
    if (S.mins == null) return card('Loading...');
    if (!list.length) return card('No meeting minutes yet. When Chef publishes them, they show here to read and sign.');
    var m = list.filter(function (x) { return x.id === S.mSel; })[0] || list[0], older = list.filter(function (x) { return x.id !== m.id; }).slice(0, 12);
    // minutes this person still has to sign come first among the earlier ones, marked To sign
    function toSign(x) { return S.mmine[mnKey(x)] === null; }
    older = older.filter(toSign).concat(older.filter(function (x) { return !toSign(x); }));
    return top + '<section class="mn">' + mnDocHTML(m, true) +
      '<div class="mn-noprint">' +
      (older.length ? '<h3 class="mn-eh">Earlier minutes (last ' + MN_DAYS + ' days)</h3><div class="mn-earlier">' + older.map(function (x) { return '<button type="button" class="chip' + (toSign(x) ? ' mn-tosign' : '') + '" data-p="mn-pickdoc" data-id="' + esc(x.id) + '">' + pad(x.no || 0) + ' &middot; ' + esc(dayShort(x.date)) + (toSign(x) ? ' &middot; <b>To sign</b>' : '') + '</button>'; }).join('') + '</div>' : '') + '</div></section>';
  }
  function signMinutes(id) {
    var m = mnById(id), p = who();
    if (!m || !p || !fb || !S.authed || !canW() || S.mSigning) return;
    var my = (m.att || []).filter(function (x) { return x.id === S.who; })[0], st = my ? my.st : 'absent', k = mnKey(m);
    var ref = fb.fs.doc.apply(null, [fb.db].concat(base(), ['minutes', m.id, 'signs', m.v + '_' + S.who])), data = { v: m.v, st: st, at: now(), name: p.name };
    S.mSigning = true; S.mErr = ''; draw();
    sset(ref, data, false).then(function () {
      S.mSigning = false; S.mmine[k] = data; minCard(); toast('Signed. Thank you.'); draw();
    }, function (e) {
      S.mSigning = false; delete S.mmine[k];
      if (e && e.code === 'permission-denied') {
        /* refused: this version is already signed (the record is there), the minutes moved on to a new version (read again),
           or this phone's PIN no longer counts (the head chef reset it), which is what failed() handles */
        fb.fs.getDoc(ref).then(function (sn) {
          if (sn.exists()) { S.mmine[k] = sn.data(); S.mErr = ''; minCard(); draw(); return; }
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
    var t = now(), lateAt = mnLateAt(m), att = {}, rows = [];
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
      '<div class="btn-row mn-noprint"><button type="button" class="btn" data-p="mn-csv" data-id="' + esc(m.id) + '">Download CSV</button><button type="button" class="btn" data-p="mn-refresh">Refresh</button>' + (mnCanWrite() ? '<button type="button" class="btn" data-p="mn-edit" data-id="' + esc(m.id) + '">Change as a new version</button><button type="button" class="btn" data-p="mn-remove" data-id="' + esc(m.id) + '">' + (armed('mn-del:' + m.id) ? 'Tap again to remove' : 'Remove') + '</button>' : '') + '</div></section>';
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
        pastRead(wCol(d), 'w/' + d, d, false, force).then(function (sn) { return sn.docs.map(function (x) { var v = x.data(); v.id = x.id; v.date = d; return v; }); }, function () { return []; }),
        pastRead(wDay(d), 'r/' + d, d, true, force).then(function (sn) { return sn.exists() ? Object.assign({ date: d }, sn.data()) : null; }, function () { return null; })
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
      '<div class="a-tablewrap cal-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table class="a-table a-plain cal"><thead><tr>' + DOWN.map(function (x) { return '<th scope="col">' + x + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  /* Reasons by weekday: which kind of waste happens on which day. */
  function reasonDowHTML(lines, n) {
    var occ = {}, c = {}, max = 0;
    afDates(n, 0).forEach(function (d) { var dw = parseYmd(d).getDay(); occ[dw] = (occ[dw] || 0) + 1; });
    lines.forEach(function (x) { var k = x.reason + ':' + parseYmd(x.date).getDay(); c[k] = (c[k] || 0) + 1; });
    var rs = REASONS.filter(function (r) { return lines.some(function (x) { return x.reason === r[0]; }); });
    if (!rs.length) return '';
    rs.forEach(function (r) { DOW.forEach(function (d) { if (occ[d]) max = Math.max(max, (c[r[0] + ':' + d] || 0) / occ[d]); }); });
    return '<h3 class="a-ch-h">Reasons by weekday</h3><span class="hint">Average entries per day. Darker is more.</span><div class="a-tablewrap" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table class="a-table a-plain sk-t"><thead><tr><th scope="col">Reason</th>' + DOWN.map(function (x) { return '<th scope="col">' + x + '</th>'; }).join('') + '</tr></thead><tbody>' +
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
    var log = wLogHTML(n, af) + wReviewFormHTML();
    if (!lines.length) return head + '<div class="a-tiles">' + tiles.map(tileHTML).join('') + '</div><p class="hint">Nothing logged in this time yet.</p>' + log + '</section>';
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
      '<h3 class="a-ch-h">By reason</h3><div class="a-tablewrap" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table class="a-table a-plain"><thead><tr><th scope="col">Reason</th><th scope="col">Entries</th><th scope="col">Share</th><th scope="col">Amount</th></tr></thead><tbody>' + rRows + '</tbody></table></div>' +
      '<h3 class="a-ch-h">Wasted most often</h3><span class="hint">"On the prep list" counts how many times the same item was written on the prep list in this time, so you can see over-prepping.</span>' + itemsList +
      '<h3 class="a-ch-h">Each day</h3>' + dayList +
      '<h3 class="a-ch-h">By weekday</h3><div class="a-tablewrap" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table class="a-table a-plain sk-t"><thead><tr><th scope="col"></th>' + DOWN.map(function (x) { return '<th scope="col">' + x + '</th>'; }).join('') + '</tr></thead><tbody><tr><th scope="row">Entries a day</th>' + DOW.map(function (d) { return '<td>' + (occ[d] ? num((dw[d] || 0) / occ[d]) : '0') + '</td>'; }).join('') + '</tr></tbody></table></div>' +
      '<h3 class="a-ch-h">Who logs waste</h3><span class="hint">A record, not a score: someone who never logs may just not know about the log.</span>' + whoList +
      log + '<h3 class="a-ch-h">End-of-day reviews</h3>' + revList + '</section>';
  }
  /* Every wastage entry in the time picked, removed ones too, with Remove and Put back (22 Oct 2026: past days are
     corrected here, not on the wastage page). Uses the 60 days loadWStats already read. */
  function wLogHTML(n, af) {
    var ds = {}; afDates(n, 0).forEach(function (d) { ds[d] = 1; });
    var l = S.wStats.lines.filter(function (x) { return ds[x.date] && (!af.sec || (x.station || 'General') === af.sec) && (!af.reason || x.reason === af.reason); });
    var del = wAll();
    return '<h3 class="a-ch-h">Every entry</h3><span class="hint">Remove an entry that was logged by mistake. Removed entries stay here, so you can put them back.</span>' + lvHTML({
      key: 'waste-log', items: l, step: 15, tools: 8, noun: ['entry', 'entries'], ph: 'Search entries', empty: 'Nothing logged in this time.',
      find: function (x) { return x.text + ' ' + (x.station || '') + ' ' + (x.addedBy || '') + ' ' + reasonName(x.reason) + ' ' + (x.action || ''); },
      filters: [['all', 'All'], ['live', 'Logged', function (x) { return !x.deleted; }], ['gone', 'Removed', function (x) { return !!x.deleted; }]],
      sorts: [['new', 'Newest first', function (a, b) { return (b.addedAt || 0) - (a.addedAt || 0); }], ['old', 'Oldest first', function (a, b) { return (a.addedAt || 0) - (b.addedAt || 0); }], ['az', 'A to Z', function (a, b) { return String(a.text).toLowerCase().localeCompare(String(b.text).toLowerCase()); }]],
      cols: [
        { h: 'Day', html: function (x) { return esc(dayShort(x.date)) + (x.addedAt ? ' ' + clock(x.addedAt) : ''); } },
        { h: 'Item', th: true, html: function (x) { return esc(x.text) + (x.deleted ? ' <span class="o-who-i">Removed' + (x.deletedBy ? ' by ' + esc(x.deletedBy) : '') + '</span>' : ''); } },
        { h: 'Amount', html: function (x) { return esc(num(+x.amount || 0) + ' ' + x.unit); } },
        { h: 'Reason', html: function (x) { return esc(reasonName(x.reason)); } },
        { h: 'Section', html: function (x) { return esc(x.station || ''); } },
        { h: 'Who', html: function (x) { return esc(x.addedBy || ''); } },
        { h: 'Action', wide: true, html: function (x) { return esc(x.action || ''); } },
        { h: '', html: function (x) {
          if (!del || !x.id) return '';
          return x.deleted ? '<button type="button" class="p-x" data-p="wrestore" data-id="' + esc(x.id) + '" data-d="' + esc(x.date) + '" aria-label="' + esc('Put back ' + x.text) + '">Put back</button>'
            : '<button type="button" class="p-x" data-p="wdel" data-id="' + esc(x.id) + '" data-d="' + esc(x.date) + '" aria-label="' + esc('Remove ' + x.text) + '">Remove</button>';
        } }
      ]
    });
  }
  /* The end-of-day review for one day (today by default, back up to 60 days): main avoidable waste and the change for the
     next shift, which shows at the top of the next prep list for everyone. */
  function wReviewFormHTML() {
    var today = dayNow(), d = S.rvDate || today, r = rvOf(d), ra = S.wrA != null ? S.wrA : (r.avoidable || ''), rc = S.wrC != null ? S.wrC : (r.change || '');
    return '<h3 class="a-ch-h">End-of-day review</h3><div class="w-review a-rvform"><div class="nb-nav o-nav"><span class="o-days">' +
      '<button type="button" class="chip" data-p="rv-day" data-d="-1" aria-label="Back one day">&lsaquo;</button><span class="a-rvday">' + esc(d === today ? 'Today' : dayShort(d)) + '</span>' +
      '<button type="button" class="chip" data-p="rv-day" data-d="1" aria-label="Forward one day"' + (d >= today ? ' disabled' : '') + '>&rsaquo;</button></span></div>' +
      '<div class="field"><label class="label" for="w-ra">Main avoidable waste</label><textarea id="w-ra" class="w-ta" data-k="w-ra" maxlength="300" rows="2">' + esc(ra) + '</textarea></div>' +
      '<div class="field"><label class="label" for="w-rc">Prep or ordering change for the next shift</label><textarea id="w-rc" class="w-ta" data-k="w-rc" maxlength="300" rows="2">' + esc(rc) + '</textarea><span class="hint">This shows at the top of the next prep list.</span></div>' +
      '<div class="btn-row"><button type="button" class="btn dark" data-p="wreview" data-v="admin">Save the review</button></div>' +
      (r.reviewBy ? '<span class="hint">Last saved by ' + esc(r.reviewBy) + (r.reviewAt ? ' at ' + clock(r.reviewAt) : '') + '.</span>' : '') + '</div>';
  }

  /* ---------- recipe searches that found nothing (queued by the recipe book, sent once someone is signed in) ---------- */
  var flushing = false;
  function flushMisses() {
    if (flushing || !fb || !S.authed || !canW()) return;
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
    if (flushingV || !fb || !S.authed || !canW()) return;
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
  var PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/';   // the security header in index.html allows only this folder: change both together
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
  // the guides (and the recipe changes, below) kept on this phone belong to the kitchen PIN: a new or wrong PIN drops them
  function gForget() { S.guides = null; S.guidesFor = ''; S.guidesAt = 0; S.gRetry = 0; lsSet('lk.guides', ''); rxForget(); }
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

  /* ---------- the head chef's recipe changes (#/manage), laid over js/data.js by js/overlay.js (21 Oct 2026) ----------
     book/index lists every changed recipe with its version, so one read says what is new; then only the recipes whose
     version changed are read. It runs when the book connects, when someone comes back after 30 minutes away and when
     the recipes are opened, each time only if the last check is 30 minutes old. No listener, no polling. */
  var RX_STALE = 30 * 60000, rxBusy = false, rxRetry = 0;
  function rxDue() { return !!window.LK_RX && Date.now() - window.LK_RX.syncedAt() > RX_STALE; }
  function rxSync(force) {
    var X = window.LK_RX;
    if (!X || !fb || !/^\d{4,6}$/.test(S.pin) || rxBusy || Date.now() < rxRetry || !(force || rxDue())) return Promise.resolve(false);
    var pin = S.pin, have = X.pin() === pin ? X.versions() : {}, haveArt = {};
    rxBusy = true;
    // the drawings kept on this phone are read from IndexedDB first, so only the ones that changed are read
    return X.artReady().then(function () { haveArt = X.pin() === pin ? X.artVersions() : {}; return fb.fs.getDoc(docRef('book', 'index')); }).then(function (sn) {
      var idx = sn.exists() ? sn.data() : {}, ir = idx.r && typeof idx.r === 'object' ? idx.r : {}, id2 = idx.d && typeof idx.d === 'object' ? idx.d : {};
      var need = Object.keys(ir).filter(function (id) { return have[id] !== ir[id]; });
      var needArt = Object.keys(id2).filter(function (id) { return haveArt[id] !== id2[id]; });
      return Promise.all(need.map(function (id) {
        return fb.fs.getDoc(docRef('recipes', id)).then(function (d) { return [id, d.exists() ? d.data() : null]; });
      }).concat(needArt.map(function (id) {
        return fb.fs.getDoc(docRef('drawings', id)).then(function (d) { return ['@' + id, d.exists() ? d.data() : null]; });
      }))).then(function (got) {
        rxBusy = false;
        if (pin !== S.pin) return false;
        var recs = got.filter(function (g) { return g[0].charAt(0) !== '@'; }), arts = got.filter(function (g) { return g[0].charAt(0) === '@'; }).map(function (g) { return [g[0].slice(1), g[1]]; });
        var changed = X.take(pin, idx, recs);
        X.takeArt(pin, id2, arts);
        if (changed) rxChanged();
        return changed;
      });
    }).catch(function () {
      // no signal, or rules not published yet: keep the changes on this phone and try again in a minute
      rxBusy = false; rxRetry = Date.now() + 60000; return false;
    });
  }
  // the recipe lists this file works out from js/data.js (spelling, recipe links, guides on cards) are worked out again
  function rxReset() { baseCache = null; vocabCache = null; RIDX = null; RCACHE = {}; ingIdx = null; NOTE_RN = null; gCardsText = null; gIdx = null; }
  function rxChanged() { rxReset(); try { window.dispatchEvent(new Event('lk-rx')); } catch (e) {} if (S.root && document.body.contains(S.root)) draw(); }
  function rxForget() { if (!window.LK_RX) return; var had = Object.keys(window.LK_RX.changes()).length || window.LK_RX.menu(); window.LK_RX.forget(); if (had) rxChanged(); }

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
  function gAdminLink() { return admDev() ? '<p class="g-wl g-noprint"><button type="button" class="p-link" data-p="g-admin">Add or change guides</button></p>' : ''; }
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
    var admin = admDev();
    return back + '<article class="g-doc"><header class="g-dh"><span class="g-eb">' + esc(gCatName(g.cat)) + ' guide</span><h2 class="g-title" id="rtitle" tabindex="-1">' + esc(g.title) + '</h2>' +
      (g.sum ? '<p class="g-lead">' + esc(g.sum) + '</p>' : '') + '<p class="g-meta">' + esc(gMeta(g)) + '</p></header>' +
      (steps.length ? '<section class="g-steps"><h3 class="g-h3">Steps</h3><ol class="g-ol">' + steps.map(function (t) { return '<li><span class="g-c" aria-hidden="true"></span><span>' + linkNote(t) + '</span></li>'; }).join('') + '</ol></section>' : '') +
      (n ? '<section class="g-pages" aria-label="Pages"><p class="hint g-noprint">' + (n > 1 ? n + ' pages. ' : '') + 'Tap a page to open it big.</p>' +
        (n > 2 ? '<div class="g-thumbs g-noprint">' + pv.urls.slice(0, n).map(function (u, k) { return u ? '<button type="button" class="g-thumb" data-p="g-zoom" data-i="' + k + '" aria-label="' + esc('Open page ' + (k + 1) + ' big') + '"><img src="' + esc(u) + '" alt=""><span>' + (k + 1) + '</span></button>' : ''; }).join('') + '</div>' : '') + figs +
        (pv.state === 'error' ? '<p class="p-err g-noprint">Could not load the pages. Check the connection. <button type="button" class="p-x" data-p="g-retry">Try again</button></p>' : '') + '</section>' : '') +
      (cards.length ? '<section class="g-rec g-noprint"><h3 class="g-h3">On these recipe cards</h3><div class="g-rchips">' + cards.map(function (r) { return '<a class="g-rchip" href="#/r/' + esc(r.id) + '">' + esc(r.name) + '</a>'; }).join('') + '</div></section>' : '') +
      (admin ? '<div class="btn-row g-noprint"><button type="button" class="btn" data-p="g-change" data-id="' + esc(g.id) + '">Change this guide</button></div>' : '') + '</article>';
  }

  /* A page opened big: over everything (appended to the body, so page redraws leave it alone), Previous and Next, Fit or Full size.
     Its clicks use data-gz. Escape or Close shuts it. Pinching zooms further on a phone. */
  var gz = null;
  /* ---------- the phone's Back button closes what is open on top (20 Oct 2026) ----------
     Opening the big guide page or the pings popup adds a history entry for the same address. Back closes it (pings count
     as put off, not read), and closing it any other way takes that entry off again, so Back never leaves the page by
     surprise. A close that comes with a move to another page (a link) leaves the entry. */
  var ovOn = '', ovBack = false, ovBackT = null;
  function ovPush(k) { ovOn = k; try { history.pushState({ lkOv: k }, '', location.href); } catch (e) {} }
  // ovBack: our own Back is on its way; the next sheet waits for it (sheetNext), or that Back would close the new sheet
  function ovDone(k, noBack) {
    if (ovOn !== k) return; ovOn = ''; if (noBack) return;
    try {
      if (history.state && history.state.lkOv === k) {
        ovBack = true; history.back();
        clearTimeout(ovBackT); ovBackT = setTimeout(ovLanded, 600);   // in case the Back never reports back
      }
    } catch (e) { ovBack = false; }
  }
  function ovLanded() { clearTimeout(ovBackT); var w = ovBack; ovBack = false; if (w && nextWait) sheetNext(); }
  window.addEventListener('popstate', function () {
    if (ovBack) { ovLanded(); return; }
    var k = ovOn; ovOn = '';
    if (k === 'gz' && gz) gzClose(true);
    else if (k === 'note' && npop) noteClose('later', true);
    else if (k === 'ks' && ksPop) ksClose(true);
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
    if (e.key === 'Tab') trapTab(e, gz.el, 'button:not([disabled])');
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
     Each person picks a coffee or hot drink, a soft drink or water, or both, and can add a few words.
     #/drinks (the chef mark menu) is for looking at, nothing is sent: everyone in the book
     today is in by themselves, the rest wait behind a note, and the order counts the same drinks together. The team's
     drinks and when each person last opened the book are read once when the page opens, again only after 30 minutes,
     and kept on the phone (lk.drinks). Nobody ticks anyone: the page only shows. */
  // id, label, and what to ask: s size, m milk, e strength (espresso drinks)
  var DK_KINDS = [['flat', 'Flat white', 'sme'], ['latte', 'Latte', 'sme'], ['cap', 'Cappuccino', 'sme'], ['long', 'Long black', 'se'], ['short', 'Short black', 'e'], ['esp', 'Espresso', 'e'],
    ['picc', 'Piccolo', 'me'], ['mac', 'Macchiato', 'me'], ['mocha', 'Mocha', 'sme'], ['icedl', 'Iced latte', 'sme'], ['icedc', 'Iced coffee', 'sm'],
    ['chai', 'Chai latte', 'sm'], ['hotc', 'Hot chocolate', 'sm'], ['tea', 'Tea', 'sm'], ['none', 'No hot drink', '']];
  var DK_SIZE = [['small', 'Small'], ['reg', 'Regular'], ['large', 'Large']];
  var DK_MILK = [['full', 'Full cream'], ['skim', 'Skim'], ['lf', 'Lactose free'], ['oat', 'Oat'], ['almond', 'Almond'], ['soy', 'Soy'], ['none', 'No milk']];
  var DK_SHOT = [['extra', 'Extra shot'], ['half', 'Half strength'], ['decaf', 'Decaf']];
  var DK_COLD = [['water', 'Water'], ['sparkling', 'Sparkling water'], ['coke', 'Coke'], ['cokens', 'Coke No Sugar'], ['diet', 'Diet Coke'], ['lemonade', 'Lemonade'],
    ['llb', 'Lemon lime and bitters'], ['ginger', 'Ginger beer'], ['oj', 'Orange juice'], ['icedtea', 'Iced tea'], ['energy', 'Energy drink']];
  var DK_SUGAR = [['none', 'No sugar'], ['1', '1 sugar'], ['2', '2 sugars'], ['3', '3 sugars'], ['sweet', 'Sweetener']];
  var DK_NOTE = 40, DK_OTHER = 60, DK_STALE = 30 * 60000;
  var dkf = null, dkEditing = false, dkMsg = '', dkBusy = false, dkList = null, dkAt = 0, dkLoading = false, dkErr = false, dkSeen = {}, dkAll = false, dkOpen = '';
  (function () { try { var c = JSON.parse(lsGet('lk.drinks') || 'null'); if (c && c.pin === S.pin && c.by) { dkList = c.by; dkSeen = c.seen || {}; dkAt = 0; } } catch (e) {} })();
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
  /* the cold drink and anything else, together: "Coke No Sugar, no ice" */
  function dkCold(d) { return d ? [dkLabel(DK_COLD, d.cold), d.other || ''].filter(Boolean).join(', ') : ''; }
  function dkSum(d) {
    var c = dkCoffee(d), o = dkCold(d);
    return c && o ? c + '. Also ' + o : c || o;
  }
  function dkMine() { return dkList && S.who ? dkList[S.who] || null : null; }
  function dkEdit() {
    var m = dkMine() || {};
    dkf = { kind: m.kind || '', size: m.size || 'reg', milk: m.milk || '', shot: m.shot || '', sugar: m.sugar || '', note: m.note || '', cold: m.cold || '', other: m.other || '' };
    dkEditing = true; dkMsg = ''; dkOpen = m.kind || m.cold || m.other ? '' : 'kind';
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
  /* the drinks, and when each person last opened the book (activity/<id>.lastSeen): two small reads together */
  function dkLoad(force) {
    if (!fb || !/^\d{4,6}$/.test(S.pin) || dkLoading || (!force && dkAt && Date.now() - dkAt < DK_STALE)) return;
    dkLoading = true;
    Promise.all([fb.fs.getDocs(colRef('drinks')), fb.fs.getDocs(colRef('activity'))]).then(function (r) {
      var by = {}, seen = {};
      r[0].docs.forEach(function (d) { by[d.id] = d.data(); });
      r[1].docs.forEach(function (d) { var t = d.data().lastSeen; if (typeof t === 'number') seen[d.id] = t; });
      dkList = by; dkSeen = seen; dkAt = Date.now(); dkLoading = false; dkErr = false;
      lsSet('lk.drinks', JSON.stringify({ pin: S.pin, by: by, seen: seen }));
      if (S.who && by[S.who]) dkFlag('set');
      draw();
    }, function () { dkLoading = false; dkErr = true; dkAt = Date.now() - DK_STALE + 5 * 60000; draw(); });
  }
  /* in the book today: opened it with their PIN today, or the person on this phone */
  function dkToday(id) { return id === S.who || (!!dkSeen[id] && T.day(dkSeen[id]) === dayNow()); }
  function dkSave() {
    var p = who(), f = dkf;
    if (dkBusy || !fb || !p || !f) return;
    f.note = f.note.replace(/^\s+|\s+$/g, ''); f.other = f.other.replace(/^\s+|\s+$/g, '');
    if (!f.kind && !f.cold && !f.other) { dkMsg = 'Pick a coffee or a cold drink first, or write something else you like.'; draw(); return; }
    var k = f.kind, data = { kind: k, size: dkAsks(k, 's') ? f.size : '', milk: dkAsks(k, 'm') ? f.milk : '', shot: dkAsks(k, 'e') ? f.shot : '',
      sugar: k && k !== 'none' ? f.sugar : '', note: k && k !== 'none' ? f.note.slice(0, DK_NOTE) : '', cold: f.cold, other: f.other.slice(0, DK_OTHER), at: now() };
    var id = S.who, old = dkList ? dkList[id] : undefined;
    dkBusy = true; dkMsg = ''; draw();
    sset(docRef('drinks', id), data).then(function () {
      dkBusy = false; dkList = dkList || {}; dkList[id] = data; lsSet('lk.drinks', JSON.stringify({ pin: S.pin, by: dkList }));
      dkFlag('set'); dkEditing = false; dkf = null;
      var first = S.drinkAsk === 'first'; S.drinkAsk = '';
      toast(first ? 'Saved. Welcome to the Kitchen Book.' : 'Saved. That is your usual on the drinks run.');
      if (first) sheetNext();   // the section, then the pings, once One more thing is done
    }, function (e) {
      dkBusy = false; if (dkList) { if (old) dkList[id] = old; else delete dkList[id]; }
      failed(e); draw();
    });
  }
  function dkClick(a, el) {
    var v = el.getAttribute('data-v');
    if (a === 'dk-pick') { var fk = el.getAttribute('data-f'); if (dkf) { dkf[fk] = dkf[fk] === v && fk !== 'size' ? '' : v; dkMsg = ''; if (fk !== 'size' && dkf[fk]) dkOpen = dkNext(fk); draw(); } return; }
    if (a === 'dk-save') { dkSave(); return; }
    if (a === 'dk-edit') { dkEdit(); draw(); focusSel('.dr-form'); return; }
    if (a === 'dk-cancel') { dkEditing = false; dkf = null; dkMsg = ''; draw(); return; }
    if (a === 'dk-skip') { S.drinkAsk = ''; dkEditing = false; dkf = null; dkFlag('skip'); draw(); toast('No worries. Set it any time from the chef hat at the top.'); sheetNext(); return; }
    if (a === 'dk-later') { S.drinkAsk = ''; dkFlag('later'); draw(); return; }
    if (a === 'dk-set') { S.drinkAsk = ''; dkFlag('later'); dkEdit(); return; }   // the link goes on to #/drinks with the form open
    if (a === 'dk-all') { dkAll = !dkAll; draw(); return; }
    if (a === 'dk-open') { dkOpen = dkOpen === el.getAttribute('data-f') ? '' : el.getAttribute('data-f'); draw(); return; }
    if (a === 'dk-retry') { dkErr = false; dkLoad(true); draw(); }
  }
  /* one group of chips open at a time; the others fold to one line with what is picked, so the form fits a phone */
  var DK_GROUPS = ['kind', 'milk', 'shot', 'sugar', 'cold'];
  function dkHas(f) {
    var k = dkf.kind, hot = !!k && k !== 'none';
    return f === 'kind' || f === 'cold' || (f === 'milk' && dkAsks(k, 'm')) || (f === 'shot' && dkAsks(k, 'e')) || (f === 'sugar' && hot);
  }
  function dkNext(f) {
    var l = DK_GROUPS.slice(DK_GROUPS.indexOf(f) + 1).filter(function (g) { return dkHas(g) && !dkf[g]; });
    return l[0] || '';
  }
  function dkChips(f, list, label, empty, hint) {
    if (dkOpen !== f) return '<div class="field"><button type="button" class="dr-fold" data-p="dk-open" data-f="' + f + '" aria-expanded="false"><span class="label">' + label + '</span>' +
      '<span class="dr-val">' + esc(dkLabel(list, dkf[f]) || empty) + '</span><span class="dr-chg">Change</span></button></div>';
    return '<div class="field"><button type="button" class="dr-fold is-open" data-p="dk-open" data-f="' + f + '" aria-expanded="true"><span class="label" id="dk-l-' + f + '">' + label + (hint ? ' (' + hint + ')' : '') + '</span><span class="dr-chg">Close</span></button>' +
      '<div class="chips dr-chips" role="group" aria-labelledby="dk-l-' + f + '">' + list.map(function (c) {
      return '<button type="button" class="chip" data-p="dk-pick" data-f="' + f + '" data-v="' + c[0] + '" aria-pressed="' + (dkf[f] === c[0]) + '">' + esc(c[1]) + '</button>';
    }).join('') + '</div></div>';
  }
  function dkFormHTML(first) {
    if (!dkf) dkEdit();
    var k = dkf.kind, hot = k && k !== 'none', prev = dkSum({ kind: k, size: dkf.size, milk: dkf.milk, shot: dkf.shot, sugar: dkf.sugar, note: hot ? dkf.note.trim() : '', cold: dkf.cold, other: dkf.other.trim() });
    return '<div class="dr-form" tabindex="-1">' + dkChips('kind', DK_KINDS, 'Coffee or hot drink', 'Pick one') +
      (dkAsks(k, 's') ? '<div class="field"><span class="label" id="dk-l-size">Size</span><div class="ml-seg" role="group" aria-labelledby="dk-l-size">' + DK_SIZE.map(function (c) {
        return '<button type="button" class="ml-sb" data-p="dk-pick" data-f="size" data-v="' + c[0] + '" aria-pressed="' + (dkf.size === c[0]) + '">' + c[1] + '</button>';
      }).join('') + '</div></div>' : '') +
      (dkAsks(k, 'm') ? dkChips('milk', DK_MILK, 'Milk', 'Not picked') : '') +
      (dkAsks(k, 'e') ? dkChips('shot', DK_SHOT, 'Strength', 'Normal', 'tap again for normal') : '') +
      (hot ? dkChips('sugar', DK_SUGAR, 'Sugar', 'None') : '') +
      (hot ? '<div class="field"><label class="label" for="dk-note">Anything else about it?</label><input id="dk-note" class="search" data-k="dk-note" maxlength="' + DK_NOTE + '" autocomplete="off" placeholder="Extra hot, honey, Earl Grey" value="' + esc(dkf.note) + '"></div>' : '') +
      dkChips('cold', DK_COLD, 'Soft drink or water', 'None') +
      '<div class="field"><label class="label" for="dk-other">Anything else for the run</label><input id="dk-other" class="search" data-k="dk-other" maxlength="' + DK_OTHER + '" autocomplete="off" placeholder="No ice, a banana bread" value="' + esc(dkf.other) + '"><span class="hint">Leave it empty if there is nothing.</span></div>' +
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
  function dkTeam() { return people().slice().sort(function (a, b) { return a.name.localeCompare(b.name); }); }
  /* one short line per person: "Reg oat flat white, 1 sugar. Coke No Sugar" */
  function dkLine(d) { return [dkCoffee(d).replace(/^Regular /, 'Reg '), dkCold(d)].filter(Boolean).join('. '); }
  /* a list to read, nobody is ticked by hand: a tick means the person opened the book with their PIN today */
  function dkListHTML(l, ticked) {
    var none = [], rows = l.map(function (p) {
      var line = dkLine(dkList ? dkList[p.id] : null), nm = esc(p.name) + (p.id === S.who ? ' (you)' : '');
      if (!line) { none.push(nm); return ''; }
      return '<li class="dr-row"><span class="dr-tick" aria-hidden="true">' + (ticked ? '✓' : '') + '</span><span class="dr-who">' + nm + '</span><span class="dr-what">' + esc(line) + '</span></li>';
    }).join('');
    return '<ul class="dr-team">' + rows + '</ul>' + (none.length ? '<p class="hint dr-none"><b>No usual yet:</b> ' + none.join(', ') + '. Ask them.</p>' : '');
  }
  function dkCount(h, n) { return '<h3 class="ml-h3 dr-h">' + h + '<span class="dr-n">' + n + '</span></h3>'; }
  /* who is on today, the order, then everyone else behind a note */
  function dkTeamHTML() {
    var all = dkTeam(), on = all.filter(function (p) { return dkToday(p.id); }), off = all.filter(function (p) { return !dkToday(p.id); });
    return dkCount('On today', on.length) + dkListHTML(on, true) + dkRunHTML() +
      (!off.length ? '' : dkAll ? dkCount('Not signed in today', off.length) + dkListHTML(off, false) + '<button type="button" class="dr-more" data-p="dk-all" aria-expanded="true">Hide them</button>'
        : '<button type="button" class="dr-more" data-p="dk-all" aria-expanded="false">Not signed in today: ' + off.length + ' more. Show them</button>');
  }
  /* the order: everyone on today with a usual, the same drinks counted together */
  function dkRunList() { return dkTeam().filter(function (p) { return dkToday(p.id) && dkSum(dkList ? dkList[p.id] : null); }); }
  function dkGroups(l) {
    var g = {}, order = [];
    l.forEach(function (p) {
      var d = dkList[p.id];
      [dkCoffee(d), dkCold(d)].forEach(function (t) { if (!t) return; var key = t.toLowerCase(); if (!g[key]) { g[key] = { t: t, n: 0 }; order.push(key); } g[key].n++; });
    });
    return order.map(function (k) { return g[k]; });
  }
  function dkRunHTML() {
    var l = dkRunList();
    if (!l.length) return '';
    return '<div class="dr-run"><h3 class="ml-h3">The order</h3><ul class="dr-order">' + dkGroups(l).map(function (x) {
      return '<li><b>' + x.n + ' x</b> ' + esc(x.t) + '</li>';
    }).join('') + '</ul></div>';
  }
  function drinksPageHTML() {
    dkLoad();
    var mine = dkMine(), sum = dkSum(mine);
    var top = dkEditing ? dkFormHTML(false)
      : '<div class="dr-mine"><span class="dr-txt"><span class="label">Your usual</span><span class="dr-what">' + (sum ? esc(sum) : dkList ? 'Not set yet.' : 'Loading...') + '</span></span>' +
        '<button type="button" class="dr-chg" data-p="dk-edit">' + (sum ? 'Change' : 'Set my usual') + '</button></div>';
    var team = !dkList ? (dkErr ? '<p class="p-err">Could not load the team\'s drinks. Check the connection.</p><div class="btn-row"><button type="button" class="btn" data-p="dk-retry">Try again</button></div>' : '<p class="hint">Loading...</p>')
      : dkTeamHTML();
    return '<section class="p-card dr-page"><h2 class="p-h" id="rtitle" tabindex="-1">Drinks run</h2>' + top + (dkEditing ? '' : team) + '</section>';
  }

  /* ---------- kitchen sections: where each person works today (21 Oct 2026) ----------
     The head chef sets the kitchen's sections in the admin panel's People tab (config/main kitSecs: id, name, off).
     Staff and leads pick one straight after their PIN, once a day, in a bottom sheet appended to document.body (clicks use
     data-ks, classes ks-). That is their default section for the day: a prep line, a Quick add or a wastage entry with
     the section box left alone goes under it. The head chef and sous chefs are not asked: their section is their role.
     Each pick is one small record, shifts/<day>_<person id> { day, sec, name, auto, at }, so the admin panel can show
     who worked where. The phone keeps today's pick (lk.sec.<id>), so it is read at most once a day per person. */
  var KS_USUAL = ['Grill', 'Pass', 'Pans', 'Fryers', 'Hot larder', 'Salads and dessert', 'Prep'];
  var KS_AUTO = { head: 'Head chef', sous: 'Sous chef' };
  var ksPop = null, ksPrev = null, ksAsked = {};
  function kitSecs() { return ((S.config && S.config.kitSecs) || []).filter(function (x) { return x && x.id && String(x.name || '').trim() && !x.off; }); }
  /* who picks a section: staff and leads, once the head chef has set some up */
  function ksPicks(p) { return !!p && (p.role === 'staff' || p.role === 'lead') && kitSecs().length > 0; }
  function ksGet(id) { try { var v = JSON.parse(lsGet('lk.sec.' + id) || 'null'); return v && v.d === dayNow() ? v : null; } catch (e) { return null; } }
  function ksPut(id, sec, name) { lsSet('lk.sec.' + id, JSON.stringify({ d: dayNow(), sec: sec, name: name })); }
  /* the section a line goes under when the box is left alone. Staff and leads only: a sous chef writes for every section. */
  function mySec() {
    var p = me(); if (!ksPicks(p)) return '';
    var v = ksGet(p.id); if (!v || !v.sec) return '';
    var s = kitSecs().filter(function (x) { return x.id === v.sec; })[0];
    return s ? s.name : '';   // renamed today: the new name; taken off the list: none
  }
  /* "Writing as Ann" on the prep list and wastage: the section next to it, a tap changes it */
  function ksTagHTML() {
    var p = me(); if (!ksPicks(p)) return '';
    var n = mySec();
    return ' <button type="button" class="p-link ks-tag" data-ks="change" aria-label="' + esc(n ? 'Your section today: ' + n + '. Change it' : 'Pick your section for today') + '">' + esc(n || 'Pick a section') + '</button>';
  }
  /* after the PIN (and when the book opens on a new day): staff and leads are asked once a day, chefs are given their role */
  function ksCheck() {
    var p = me(); if (!fb || !p || !kitSecs().length || ksGet(p.id)) return;
    var day = dayNow(), id = p.id, ref = docRef('shifts', day + '_' + id);
    if (isSousP(p)) {
      var role = isHeadP(p) ? 'head' : 'sous';
      ksPut(id, role, KS_AUTO[role]);
      sset(ref, { day: day, sec: role, name: KS_AUTO[role], auto: true, at: now() }).catch(function () {});
      return;
    }
    if (!ksPicks(p) || ksAsked[day + id]) return;
    ksAsked[day + id] = 1;
    // picked on another device today: no need to ask again. The pings sheet waits for the answer (ksWait), so the
    // section comes first and the pings straight after it
    ksWait = true;
    var waitT = setTimeout(ksDone, 8000);
    function ksDone() { clearTimeout(waitT); if (!ksWait) return; ksWait = false; sheetNext(); }
    fb.fs.getDoc(ref).then(function (s) {
      var x = s.exists() ? s.data() : null;
      if (x && x.sec) { ksPut(id, x.sec, x.name || ''); draw(); }
      else if (S.who === id && S.authed) ksWant = true;
      ksDone();
    }, function () { if (S.who === id && S.authed) ksWant = true; ksDone(); });
  }
  function ksOpen(change) {
    var p = me(); if (ksPop || !ksPicks(p)) return;
    if (!change && ksGet(p.id)) return;   // asked by itself: picked (or skipped) in the meantime
    var cur = ksGet(p.id), out = change ? 'close' : 'skip';
    ksPrev = document.activeElement;
    var el = document.createElement('div');
    el.className = 'ks-wrap';
    el.innerHTML = '<div class="ks-bg" data-ks="' + out + '"></div><section class="ks" role="dialog" aria-modal="true" aria-labelledby="ks-h" tabindex="-1">' +
      '<div class="ks-grip" aria-hidden="true"></div><header class="ks-head"><span class="ks-eb">' + esc(p.name) + '</span><h2 class="ks-h" id="ks-h">Your section today</h2></header>' +
      '<p class="ks-hint">Your prep lines and wastage go under it, unless you write another section.</p>' +
      '<div class="ks-grid" role="group" aria-labelledby="ks-h">' + kitSecs().map(function (s) {
        return '<button type="button" class="ks-b" data-ks="pick" data-v="' + esc(s.id) + '" aria-pressed="' + (!!cur && cur.sec === s.id) + '">' + esc(s.name) + '</button>';
      }).join('') + '</div>' +
      '<footer class="ks-foot"><button type="button" class="ks-out" data-ks="' + out + '">' + (change ? 'Close' : 'Not on a section today') + '</button></footer></section>';
    document.body.appendChild(el);
    ksPop = el;
    ovPush('ks');
    document.documentElement.classList.add('ks-open');
    var f = el.querySelector('.ks-b[aria-pressed="true"]') || el.querySelector('.ks-b'); if (f) f.focus({ preventScroll: true });
  }
  function ksClose(noBack) {
    if (!ksPop) return;
    ovDone('ks', noBack);
    ksPop.parentNode.removeChild(ksPop); ksPop = null;
    document.documentElement.classList.remove('ks-open');
    if (ksPrev && ksPrev.focus && document.body.contains(ksPrev)) { try { ksPrev.focus({ preventScroll: true }); } catch (e) {} }
    ksPrev = null;
    sheetNext();
  }
  /* Skip (or Escape, or a tap outside, on the first ask): no section today, and no asking again today on this phone */
  function ksSkip() { var p = me(); if (p && !ksGet(p.id)) ksPut(p.id, '', ''); ksClose(); draw(); }
  function ksPick(sid) {
    var p = me(), s = kitSecs().filter(function (x) { return x.id === sid; })[0];
    if (!p || !s) return;
    var day = dayNow();
    ksPut(p.id, s.id, s.name);
    // kept on the phone first, so a lost signal never loses the default section
    sset(docRef('shifts', day + '_' + p.id), { day: day, sec: s.id, name: s.name, auto: false, at: now() }).catch(function () {});
    ksClose(); draw();
    toast('You are on ' + s.name + ' today.');
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-ks]');
    if (!el) return;
    var a = el.getAttribute('data-ks');
    if (a === 'pick') { ksPick(el.getAttribute('data-v')); return; }
    if (a === 'skip') { ksSkip(); return; }
    if (a === 'close') { ksClose(); return; }
    if (a === 'change') { ksOpen(true); return; }
  });
  document.addEventListener('keydown', function (e) {
    if (!ksPop) return;
    if (e.key === 'Escape') { e.preventDefault(); if (ksPop.querySelector('[data-ks="skip"]')) ksSkip(); else ksClose(); return; }
    if (e.key === 'Tab') trapTab(e, ksPop);
  });

  /* The admin People tab: the sections themselves (part of the staff draft, saved with Save changes), who is on which
     today and who worked where over the last 14 days (one small query when the tab opens, once a day per page load). */
  function ksClean(list) {
    var on = {};
    var out = (list || []).map(function (x) { return { id: String(x.id || ''), name: String(x.name || '').replace(/\s+/g, ' ').trim().slice(0, 40), off: !!x.off }; })
      .filter(function (x) { if (!x.id || !x.name) return false; if (x.off) return true; var k = x.name.toLowerCase(); if (on[k]) return false; on[k] = 1; return true; });
    return out.filter(function (x) { return !x.off || !on[x.name.toLowerCase()]; }).slice(0, 30);
  }
  var shiftsFor = '', shiftsBusy = false;
  function loadShifts(force) {
    if (!fb || shiftsBusy || (!force && shiftsFor === dayNow())) return;
    shiftsBusy = true;
    var f = fb.fs;
    f.getDocs(f.query(colRef('shifts'), f.where('day', '>=', shift(dayNow(), -13)))).then(function (sn) {
      shiftsBusy = false; shiftsFor = dayNow();
      S.shifts = sn.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }); draw();
    }, function () { shiftsBusy = false; S.shifts = S.shifts || []; draw(); });
  }
  function ksName(id) { var p = ((S.config && S.config.people) || []).filter(function (x) { return x.id === id; })[0]; return p ? p.name : ''; }
  function ksAdminHTML(d) {
    var list = d.kitSecs || [], t = dayNow();
    var rows = list.map(function (s, i) {
      return '<li class="a-ks-row' + (s.off ? ' is-off' : '') + '"><label class="visually-hidden" for="a-ks' + i + '">Section name</label><input id="a-ks' + i + '" class="search" data-k="a-ks' + i + '" data-a="ksec" data-i="' + i + '" maxlength="40" autocomplete="off" placeholder="Section name" value="' + esc(s.name) + '"' + (s.off ? ' disabled' : '') + '>' +
        '<button type="button" class="p-x" data-p="ks-rm" data-i="' + i + '" aria-label="' + esc((s.off ? 'Put back: ' : 'Remove: ') + (s.name || 'this section')) + '">' + (s.off ? 'Put back' : 'Remove') + '</button></li>';
    }).join('');
    var out = '<section class="set-block a-ks"><span class="label">Kitchen sections</span><span class="hint">Staff and leads pick one of these straight after their PIN, once a day. Their prep lines and wastage go under it unless they write another section. You and the sous chefs are not asked: your section is your role. Renaming a section keeps its history. Save changes at the bottom to put them live.</span>' +
      (rows ? '<ul class="a-ks-list">' + rows + '</ul>' : '<p class="hint">No sections yet, so nobody is asked.</p>') +
      '<div class="btn-row"><button type="button" class="btn" data-p="ks-add">Add a section</button>' + (list.length ? '' : '<button type="button" class="btn" data-p="ks-usual">Add ' + esc(KS_USUAL.join(', ')) + '</button>') + '</div>';
    if (!kitSecs().length && !(S.shifts || []).length) return out + '</section>';
    loadShifts();
    if (!S.shifts) return out + '<p class="hint">Reading who is on today...</p></section>';
    var today = S.shifts.filter(function (x) { return x.day === t && x.sec; }), by = {};
    today.forEach(function (x) { (by[x.name] = by[x.name] || []).push(ksName(x.by) || x.by); });
    var names = kitSecs().map(function (s) { return s.name; }).concat([KS_AUTO.head, KS_AUTO.sous]);
    Object.keys(by).forEach(function (n) { if (names.indexOf(n) < 0) names.push(n); });
    out += '<h3 class="a-ks-h">On today</h3><ul class="a-ks-today">' + names.filter(function (n) { return by[n] || (n !== KS_AUTO.head && n !== KS_AUTO.sous); }).map(function (n) {
      return '<li><span class="a-ks-sec">' + esc(n) + '</span><span class="a-ks-who">' + (by[n] ? esc(by[n].sort().join(', ')) : '<span class="a-ks-none">Nobody yet</span>') + '</span></li>';
    }).join('') + '</ul>';
    // who worked where: one row per person, days on each section over the last 14 days
    var per = {};
    S.shifts.forEach(function (x) {
      if (!x.sec) return;
      var r = per[x.by] = per[x.by] || { id: x.by, name: ksName(x.by) || x.by, days: 0, secs: {}, last: '' };
      r.days++; r.secs[x.name] = (r.secs[x.name] || 0) + 1; if (x.day > r.last) r.last = x.day;
    });
    var items = Object.keys(per).map(function (k) { return per[k]; });
    out += '<h3 class="a-ks-h">Who worked where, last 14 days</h3>' + lvHTML({
      key: 'ks-days', items: items, step: 15, noun: ['person', 'people'], ph: 'Search names or sections', empty: 'Nobody has picked a section yet.',
      find: function (r) { return r.name + ' ' + Object.keys(r.secs).join(' '); },
      sorts: [['days', 'Most days', function (a, b) { return b.days - a.days || a.name.localeCompare(b.name); }], ['az', 'A to Z', function (a, b) { return a.name.localeCompare(b.name); }]],
      cols: [
        { h: 'Name', th: true, html: function (r) { return esc(r.name); } },
        { h: 'Days', html: function (r) { return String(r.days); } },
        { h: 'Sections', wide: true, html: function (r) { return esc(Object.keys(r.secs).sort(function (a, b) { return r.secs[b] - r.secs[a]; }).map(function (n) { return n + ' ' + r.secs[n]; }).join(', ')); } },
        { h: 'Last', html: function (r) { return esc(dayShort(r.last)); } }
      ]
    });
    return out + '</section>';
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
    if (a === 'n-tmclr') { S.nf.tm = ''; draw(); return; }
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
    // the register from #/minutes, the same as the old Minutes register in the chef hat menu: on a tap, one small minutes query
    if (a === 'mn-sous') { chefOpen('register'); return; }
    if (a === 'mn-pickdoc') { S.mSel = id; S.mErr = ''; draw(); window.scrollTo(0, 0); return; }
    if (a === 'mn-sign') { signMinutes(id); return; }
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
    if ((a === 'toast-old' || a === 'toast-act' || a === 'toast-hide') && Date.now() - toastSwiped < 500) return;
    if (a === 'toast-hide') { toastAway('new'); return; }
    if (a === 'toast-old') { var to = S.toastOld; S.toastOld = null; clearTimeout(toastOldTimer); if (to && to.act && to.act.fn) to.act.fn(); draw(); return; }
    if (a === 'toast-act') { var ta = S.toastAct; S.toast = ''; S.toastAct = null; if (ta && ta.fn) ta.fn(); draw(); return; }
    if (a === 'export') { exportAll(); return; }
    if (a === 'move-pin') { movePin(); return; }
    if (a === 'sugg') { pickSugg(i); return; }
    if (a === 'quick') { quickAdd(i); return; }
    if (a === 'fnneed') { fnNeedAdd(i); return; }
    if (a === 'fnneed-hide') { fnNeedHide(i); return; }
    if (a === 'fnneed-fold') { S.fnnOpen = !S.fnnOpen; draw(); focusSel('[data-p="fnneed-fold"]'); return; }
    if (a === 'heat') { S.heat = el.getAttribute('data-v'); draw(); return; }
    if (a === 'calm') { S.calM = el.getAttribute('data-v'); draw(); return; }
    if (a === 'jump') { adminJumpTo(el.getAttribute('data-v')); return; }
    if (a === 'aj-open') { ajOpen(el); return; }
    if (a === 'csv') { exportCSV(el.getAttribute('data-v')); return; }
    if (a === 'hrm') { S.hrM = el.getAttribute('data-v'); draw(); return; }
    if (a === 'af-reset') { S.af = { sec: '', who: '', dow: '', reason: '' }; afSave(); draw(); return; }
    if (a === 'cal-day') { S.date = el.getAttribute('data-d'); S.tab = ''; watchItems(); location.hash = '#/prep'; return; }
    if (a === 'close-hide') { lsSet('lk.closeout', dayNow()); draw(); return; }
    if (a === 'oreg') { var orr = (S.oregs || [])[i]; if (orr) { S.otext = orr.text; S.oqty = orr.q || ''; addOrder(true); } return; }
    // Last 7 days always counts today from the live list, whatever day was being browsed; the past days come from the day cache
    if (a === 'wunit') { S.wf.unit = el.getAttribute('data-v'); draw(); return; }
    if (a === 'w-act-open') { S.wf.actOpen = true; draw(); focusSel('#w-act'); return; }
    if (a === 'wreason') { S.wf.reason = el.getAttribute('data-v'); var fromSheet = S.sheet === 'reason'; S.sheet = ''; draw(); if (fromSheet) { var rb = S.root.querySelector('.w-rbtn'); if (rb) rb.focus(); } return; }
    if (a === 'sheet') { S.sheet = el.getAttribute('data-v'); draw(); var so = S.root.querySelector('.sheet-o[aria-checked="true"]') || S.root.querySelector('.sheet-o'); if (so) so.focus(); return; }
    if (a === 'sheet-close') { S.sheet = ''; draw(); var rb2 = S.root.querySelector('.w-rbtn'); if (rb2) rb2.focus(); return; }
    if (a === 'wsugg') { var wt = (S.wsugg || [])[i]; if (wt) { S.wf.text = wt; var wl = wLast(wt); if (wl) { if (wl.unit) S.wf.unit = wl.unit; if (wl.reason && !S.wf.reason) S.wf.reason = wl.reason; if (wl.station && !S.wf.sec && !mySec()) S.wf.sec = wl.station; if (wl.amt && (S.wf.amtAuto || !String(S.wf.amt).trim())) { S.wf.amt = wl.amt; S.wf.amtAuto = true; } } draw(); focusFilled('w-amt'); } return; }
    if (a === 'woften') { var wo = wOften()[i]; if (wo) { S.wf.text = wo.text; if (wo.unit) S.wf.unit = wo.unit; if (wo.reason) S.wf.reason = wo.reason; if (wo.sec && !S.wf.sec && !mySec()) S.wf.sec = wo.sec; if (wo.amt && (S.wf.amtAuto || !String(S.wf.amt).trim())) { S.wf.amt = wo.amt; S.wf.amtAuto = true; } draw(); focusFilled('w-amt'); } return; }
    if (a === 'wdel') { removeWaste(dt, id); return; }
    if (a === 'wrestore') { removeWaste(dt, id, true); return; }
    if (a === 'rv-day') { var rd = shift(S.rvDate || dayNow(), +el.getAttribute('data-d')); if (rd <= dayNow() && rd > shift(dayNow(), -60)) { S.rvDate = rd; S.wrA = S.wrC = null; } draw(); return; }
    if (a === 'a-go-waste') { S.atab = 'waste'; lsSet('lk.prep.atab', 'waste'); return; }
    if (a === 'wreview') { saveReview(el.getAttribute('data-v')); return; }
    if (a === 'w-refresh') { loadWStats(true); loadStats(true); draw(); return; }
    if (a === 'miss-hide') { sset(docRef('misses', id), { hidden: true, q: ((S.misses || []).filter(function (x) { return x.id === id; })[0] || {}).q || id }, true).then(function () { loadMisses(true); }, failed); return; }
    if (a === 'oqset') { S.oqty = el.getAttribute('data-v') || ''; draw(); var to = S.root.querySelector('[data-k="o-text"]'); if (to) to.focus(); return; }
    // "Add 5 L": the usual amount goes in and the line is added in the same tap
    if (a === 'qset' || a === 'oqset') sg('usual', 't');
    if (a === 'qset') { S.qty = el.getAttribute('data-v') || ''; if (S.text.trim()) addTyped(); else { draw(); var tq = S.root.querySelector('[data-k="p-text"]'); if (tq) tq.focus(); } return; }
    if (a === 'goto') { gotoRow(id); return; }
    if (a === 'start-toggle') { e.preventDefault(); S.startOpen = !S.startOpen; draw(); return; }
    if (a === 'donejump') { var dj = S.root.querySelector('#nb-donebox'); if (dj) dj.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
    if (a === 'write') { var wt = S.root.querySelector('[data-k="p-text"]'); if (wt) { wt.scrollIntoView({ block: 'center', behavior: 'smooth' }); wt.focus({ preventScroll: true }); } return; }
    if (a === 'learn-hide') { hideLearned(id, el.getAttribute('data-hide') === '1'); return; }
    if (a === 'a-group') { var gg = A_GROUPS.filter(function (g) { return g[0] === el.getAttribute('data-g'); })[0]; if (gg) { S.atab = (S.agLast || {})[gg[0]] || gg[2][0]; lsSet('lk.prep.atab', S.atab); draw(); adminToTop(); } return; }
    if (a === 'a-tab') { S.atab = el.getAttribute('data-t'); S.agLast = S.agLast || {}; S.agLast[adminGroupOf(S.atab)[0]] = S.atab; lsSet('lk.prep.atab', S.atab); draw(); adminToTop(); return; }
    if (a === 'staff-open') { if (isSous()) { startDraft(); S.staffOpen = true; draw(); seedPinOpen(); } return; }
    if (a === 'staff-close') { if (draftDirty() && !arm('staff-close')) return; S.staffOpen = false; S.draft = null; draw(); return; }
    if (a === 'add-recipe') { addRecipe(id); return; }
    if (a === 'signin') { signIn(); return; }
    if (a === 'signout') { if (draftDirty() && !arm('signout')) { toast('Unsaved staff changes. Tap Sign out again to drop them.'); return; } signOut(); draw(); return; }
    if (a === 'sec-hide') { hideSection(id, el.getAttribute('data-hide') === '1'); return; }
    if (a === 'a-reset-pin') { resetPin(id); return; }
    if (a === 'range') { S.statsRange = +el.getAttribute('data-v'); draw(); return; }
    if (a === 'stats-refresh') { loadStats(true); draw(); return; }
    if (!S.draft) return;
    var d = S.draft;
    if (a === 'a-add-person') { lvReveal('people'); lvReveal('staff'); d.people.push({ id: slug('person') + '-' + Date.now().toString(36), name: '', role: 'staff', add: true, tick: true, del: false, active: true, isNew: true }); draw(); var n = S.root.querySelector('[data-k="a-n' + (d.people.length - 1) + '"]'); if (n) n.focus(); return; }
    if (a === 'ks-add') { d.kitSecs = d.kitSecs || []; d.kitSecs.push({ id: 'ks-' + Date.now().toString(36), name: '', off: false, isNew: true }); draw(); var kn = S.root.querySelector('[data-k="a-ks' + (d.kitSecs.length - 1) + '"]'); if (kn) kn.focus(); return; }
    if (a === 'ks-usual') { d.kitSecs = KS_USUAL.map(function (n) { return { id: slug(n), name: n, off: false }; }); draw(); return; }
    if (a === 'ks-rm') { var ks = (d.kitSecs || [])[i]; if (!ks) return; if (ks.isNew) d.kitSecs.splice(i, 1); else ks.off = !ks.off; draw(); return; }
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
      if (!rp) return;
      if (rp.active === false && !rp.isNew) { rp.active = true; draw(); return; }   // Put back
      // a row just added and still blank goes in one tap; anyone else needs a second tap
      if (!(rp.isNew && !String(rp.name).trim()) && !arm('rm:' + rp.id)) return;
      if (rp.isNew) d.people.splice(i, 1); else rp.active = false;
      draw(); return;
    }
    if (a === 'a-save') { adminSave(); return; }
    if (a === 'a-ids-keep') { idDecide(true); return; }
    if (a === 'a-ids-undo') { idDecide(false); return; }
    if (a === 'a-reset') { if (draftDirty() && !arm('a-reset')) return; startDraft(); draw(); return; }
  }
  function onInput(e) {
    var el = e.target, k = el.getAttribute && el.getAttribute('data-k');
    if (!S.root || !S.root.contains(el)) return;
    if (k && k.indexOf('lv-q:') === 0) { var lk = k.slice(5), lc = LVR[lk]; if (lc) { var ls0 = lvState(lc); ls0.q = el.value; ls0.shown = lc.step || 15; lvRefresh(lk); } return; }
    // a PIN goes in by itself the moment the fourth digit is typed (only when it reaches four, so it cannot send twice)
    if (k === 'p-pin') { var pp = S.pinInput.length; S.pinInput = el.value.replace(/\D/g, '').slice(0, 4); el.value = S.pinInput; pinCells(el); if (pp < 4 && S.pinInput.length === 4) submitKitchenPin(); return; }
    if (k === 'a-bulk') { S.bulk = el.value; return; }
    if (k === 'dk-note' || k === 'dk-other') { dkf[k.slice(3)] = el.value.slice(0, k === 'dk-note' ? DK_NOTE : DK_OTHER); return; }
    if (k === 'ml-text') { mlf.text = el.value.slice(0, ML_MAX); mlMsg = ''; var mll = S.root.querySelector('#ml-left'), mln = ML_MAX - mlf.text.length; if (mll) mll.textContent = mln < 100 ? mln + ' characters left' : ''; return; }
    if (k === 'a-newpin') { S.newPin = el.value.replace(/\D/g, '').slice(0, 4); el.value = S.newPin; return; }
    if (k === 'a-newpin2') { S.newPin2 = el.value.replace(/\D/g, '').slice(0, 4); el.value = S.newPin2; return; }
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
    if (k === 'o-text') { S.otext = el.value; var og = S.root.querySelector('#o-sugg'); if (og) og.innerHTML = ordSuggHTML(); oAutoQty(); return; }
    if (k === 'o-qty') { S.oqty = el.value; S.oqtyAuto = ''; return; }
    if (k === 'g-q') { S.gq = el.value; var gl = S.root.querySelector('#g-list'); if (gl) gl.innerHTML = gListHTML(); return; }
    if (k === 'g-title' || k === 'g-sum' || k === 'g-steps' || k === 'g-kw') {
      if (!S.gf) return;
      S.gf[k.slice(2)] = el.value;
      var gln = S.root.querySelector('#g-links'); if (gln) gln.textContent = gLinksText(S.gf);
      return;
    }
    if (k === 'n-text') { if (S.nf) S.nf.text = el.value; var nc = S.root.querySelector('#n-count'); if (nc) nc.textContent = el.value.length + ' of 400. Ctrl+Enter saves.'; var npv = S.root.querySelector('#n-prev'); if (npv && S.nf) npv.innerHTML = draftPreviewHTML(S.nf); return; }
    if (k === 'w-text') { S.wf.text = el.value; var wg = S.root.querySelector('#w-sugg'); if (wg) wg.innerHTML = wSuggHTML(); return; }
    if (k === 'w-amt') { S.wf.amt = el.value.replace(/[^0-9.,]/g, ''); S.wf.amtAuto = false; if (el.value !== S.wf.amt) el.value = S.wf.amt; return; }
    if (k === 'w-sec') { S.wf.sec = el.value; return; }
    if (k === 'w-act') { S.wf.act = el.value; return; }
    if (k === 'w-ra' || k === 'w-rc') { S.wrWhere = el.closest('.a-rvform') ? 'admin' : 'page'; if (k === 'w-ra') S.wrA = el.value; else S.wrC = el.value; return; }
    if (k === 'p-qty') { S.qty = el.value; var qs2 = S.root.querySelector('#p-qsugg'); if (qs2) qs2.innerHTML = qtyChipsHTML(); return; }
    if (k === 'p-section') { S.section = el.value; S.secTyped = !!el.value.trim(); return; }
    if (k === 'p-rs') { S.recipeSearch = el.value; S.recipeOpen = true; draw(); return; }
    var a = el.getAttribute && el.getAttribute('data-a');
    if (!a || !S.draft) return;
    var i = +el.getAttribute('data-i'), d = S.draft;
    if (a === 'name') d.people[i].name = el.value;
    if (a === 'ksec' && d.kitSecs && d.kitSecs[i]) d.kitSecs[i].name = el.value;
  }
  function onChange(e) {
    var el = e.target, k = el.getAttribute && el.getAttribute('data-k');
    if (!S.root || !S.root.contains(el)) return;
    if (k && k.indexOf('lv-s:') === 0) { var sk = k.slice(5), sc = LVR[sk]; if (sc) { var ss = lvState(sc); ss.sort = el.value; ss.shown = sc.step || 15; lvRefresh(sk); } return; }
    if (k && k.indexOf('ml-pri:') === 0) { mlSetPri(k.slice(7), el.value); return; }
    if (k === 'g-file') { var gfl = el.files; gReadFiles(gfl); try { el.value = ''; } catch (x) {} return; }
    if (k === 'mn-older') { S.mSel = el.value; loadSigns(el.value, true); draw(); return; }
    if (k && k.indexOf('mn-') === 0) { mfSet(k, el); return; }
    if (k === 'p-day') { if (el.value) { S.date = el.value; S.tab = ''; watchItems(); draw(); } return; }
    if (k === 'n-start') { if (S.nf && el.value) { S.nf.start = el.value; if (S.nf.until && S.nf.until < el.value) S.nf.until = ''; draw(); } return; }
    if (k === 'n-until') { if (S.nf) { S.nf.until = el.value; S.nf.run = !!el.value; draw(); } return; }
    if (k === 'n-tm') { if (S.nf) { S.nf.tm = el.value; draw(); } return; }
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
      p.role = el.value; var r = ROLES[el.value]; p.add = r.add; p.tick = r.tick; p.del = r.del; p.ping = r.ping; p.fn = !!r.fn || (p.fn && el.value !== 'view'); draw();
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
      var sh = S.root.querySelector('.sheet'); if (sh) trapTab(e, sh, 'button');
      return;
    }
    if (e.key === 'Escape' && S.recipeOpen) { S.recipeOpen = false; S.recipeSearch = ''; S.recipeAll = false; draw(); focusSel('.p-pickbtn'); return; }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.getAttribute && e.target.getAttribute('data-k') === 'n-text') { e.preventDefault(); saveNote(); return; }
    if (e.key === 'Enter' && e.target.getAttribute && e.target.getAttribute('data-k') === 'p-pin') { e.preventDefault(); var b = S.root.querySelector('[data-p="pin-go"]'); if (b) b.click(); }
  }
  var wired = false;
  function wire() {
    if (wired) return; wired = true;
    var app = document.getElementById('app');
    app.addEventListener('click', onClick);
    app.addEventListener('pointerdown', toastDown);
    app.addEventListener('pointerdown', fillTapDown, true);
    app.addEventListener('click', fillTap, true);
    app.addEventListener('pointermove', toastMove);
    app.addEventListener('pointerup', toastUp);
    app.addEventListener('pointercancel', toastUp);
    document.addEventListener('scroll', toastScrolled, { capture: true, passive: true });
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
     30 minutes away (no listener, no polling). It drives the count on the chef hat and the "Mail waiting" popup:
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
  function mlOwner() { return S.level === 'owner' && ownerHere() && !!fb && /^\d{4,6}$/.test(S.pin); }
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
  /* not over a recipe or the service view: the head chef is cooking from it. It comes on the next page instead. */
  function onService() { return /^#\/(recipes|r\/|fn\/now)/.test(location.hash || ''); }
  function mlMaybePop() {
    if (mlPop || sheetBusy() || onService() || !mlNudgeDue()) return;
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
    sheetNext();
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-ml]');
    if (!el) return;
    var a = el.getAttribute('data-ml');
    if (a === 'later') { lsSet('lk.mail.later', String(now() + ML_NUDGE)); mlPopClose(); return; }
    if (a === 'open') {
      // the page changes first, so a pings sheet handed on by the close opens on the Mail tab (a hash change closes an open one)
      S.atab = 'mail'; lsSet('lk.prep.atab', 'mail'); mlOpened = now();   // no nudge again before the Mail tab is drawn (mlSeenAll saves the real time)
      if (location.hash === '#/admin') { mlPopClose(); draw(); mlSeenAll(); } else { location.hash = '#/admin'; mlPopClose(); }
    }
  });
  document.addEventListener('keydown', function (e) {
    if (!mlPop) return;
    if (e.key === 'Escape') { e.preventDefault(); lsSet('lk.mail.later', String(now() + ML_NUDGE)); mlPopClose(); return; }
    if (e.key === 'Tab') trapTab(e, mlPop, 'button');
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { loadMail(); mlMaybePop(); } });

  /* ---------- public bits used by app.js ---------- */
  window.LK_PREP = {
    sg: sg,
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
      return pending > 0 || !!(window.LK_MG && window.LK_MG.dirty()) || !!(window.LK_FE && window.LK_FE.dirty()) || !!mlf.text.trim() || mfDirty() || nfDirty() || gfDirty() || draftDirty() || !!String(S.bulk || '').trim() || !!S.sheet || !!S.recipeOpen ||
        !!(S.text.trim() || S.qty.trim() || S.otext.trim() || S.oqty.trim() || S.wf.text.trim() || String(S.wf.amt).trim() || S.wf.act.trim() || (S.wrA != null && S.wrA !== (rvBase().avoidable || '')) || (S.wrC != null && S.wrC !== (rvBase().change || '')));
    },
    noteInfo: noteInfo, noteBellLabel: noteBellLabel,
    noteOpen: noteOpen,
    // the recipes were opened: look for the head chef's recipe changes when the last look is 30 minutes old
    rxCheck: function () { rxSync(); },
    rxSync: rxSync,
    guidesFor: function (rid) { try { return guidesFor(rid); } catch (e) { return []; } },
    guideSearch: function (q) { try { return guideSearch(q); } catch (e) { return []; } },
    featOn: featOn,
    ownerHere: ownerHere,
    whoName: whoName,
    // Sign in from the chef hat with nobody signed in: "Who are you?" on the prep list, then back to the page it came from
    signIn: function (back) {
      if (whoName()) return;
      S.picking = true; S.who = ''; S.pending = back && back !== '#/prep' && back.indexOf('#/') === 0 ? { back: back } : null;
      if (location.hash === '#/prep') draw(); else location.hash = '#/prep';
      window.scrollTo(0, 0);
    },
    headPin: whoHead,
    bookEdit: bookEdit,
    bookState: bookState,
    fnOK: fnOK,
    fnState: fnState,
    book: bookApi,
    chefMenu: chefMenu,
    chefOpen: chefOpen,
    secOpen: function () { ksOpen(true); },
    signOut: signOutPerson,
    minNudge: minNudgeHTML,
    mailInfo: mlInfo,
    saveConfig: saveConfig,
    proofread: proofread,
    state: S
  };
})();
