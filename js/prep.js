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
    kitchens/<PIN>/proofs/<personId>           { tok }   write only: sent with each write so the rules can check the writer's PIN
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
    sections: [], activity: [], resetId: '', hideDone: false, rolledFor: '', learned: [], pickedText: '', staffOpen: false, exporting: '', moving: false, moveMsg: '', newPin: '', atab: lsGet('lk.prep.atab') || 'insights',
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
        S.configState = 'ok'; watchItems(); watchSections(); watchLearned(); resume(); draw();
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
    if (pf) b.set(docRef('proofs', S.who), { tok: S.tok });
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
    noteSection(sec); bump({ added: 1, lastAdded: Date.now() }); learn(t, sec, t === S.pickedText ? 'pick' : 'type');
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
    noteSection(sec); bump({ added: 1, lastAdded: Date.now() }); learn(r.short || r.name, sec, 'pick');
    S.qty = ''; S.recipeSearch = ''; S.recipeOpen = false; toast('Added ' + (r.short || r.name));
  }
  function tick(date, id) {
    var it = S.items.filter(function (x) { return x.id === id; })[0], p = me();
    if (!it || !can('tick')) return;
    var done = !it.done;
    supd(itemRef(date, id), { done: done, doneBy: done ? p.name : '', doneById: done ? p.id : '', doneAt: done ? Date.now() : 0 }).catch(function () { toast('Could not save. Check the connection.'); });
    if (done) bump({ ticked: 1 });
    else if (it.doneById && fb) sset(docRef('activity', it.doneById), { name: it.doneBy || '', ticked: fb.fs.increment(-1) }, true).catch(function () {});
  }
  function removeItem(date, id, restore) {
    var p = me();
    if (!can('del')) return;
    supd(itemRef(date, id), { deleted: !restore, deletedBy: restore ? '' : p.name }).catch(function () { toast('Could not save. Check the connection.'); });
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
    supd(itemRef(S.date, id), { urgent: !it.urgent }).catch(function () { toast('Could not save. Check the connection.'); });
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
  function learn(text, sec, how) {
    if (!fb || !text) return;
    var p = who(), f = fb.fs, dow = String(parseYmd(S.date).getDay()), sk = lkey(sec || 'general');
    var secs = {}; secs[sk] = { name: sec || '', n: f.increment(1) };
    var data = { text: String(text).trim().slice(0, 160), uses: f.increment(1), lastUsed: Date.now(), lastBy: p ? p.name : '', dow: {}, secs: secs };
    data.dow[dow] = f.increment(1);
    data[how === 'pick' ? 'picked' : 'typed'] = f.increment(1);
    sset(docRef('learned', lkey(text)), data, true).catch(function () {});
    markLive(S.date);
  }
  function learnedFor(text) { var k = lkey(text); return S.learned.filter(function (x) { return x.id === k; })[0] || null; }
  function bestSection(x) {
    var best = '', n = 0;
    Object.keys(x.secs || {}).forEach(function (k) { var v = x.secs[k]; if (v && v.name && v.n > n) { n = v.n; best = v.name; } });
    return best;
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
    var rm = matchRecipe(x.text);
    newItem({ text: x.text.slice(0, 160), station: x.section, recipe: rm ? rm.id : '' }).catch(function () { toast('Could not save. Check the connection.'); });
    noteSection(x.section); bump({ added: 1, lastAdded: Date.now() }); learn(x.text, x.section, 'pick');
  }
  /* Owner backup: everything the book holds, as one JSON file (PIN fingerprints left out). */
  function exportAll() {
    if (!fb || S.exporting) return;
    S.exporting = 'Reading the data...'; draw();
    var f = fb.fs, out = { exportedAt: new Date().toISOString(), config: null, days: {}, activity: [], sections: [], learned: [], learnlog: [], pins: [] };
    function all(name) { return f.getDocs(colRef(name)).then(function (sn) { return sn.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }); }); }
    var today = ymd(new Date()), dates = [], k;
    for (k = 0; k < 400; k++) dates.push(shift(today, -k));
    f.getDoc(cfgDoc()).then(function (sn) { out.config = sn.exists() ? sn.data() : null; })
      .then(function () { return all('activity'); }).then(function (r) { out.activity = r; })
      .then(function () { return all('sections'); }).then(function (r) { out.sections = r; })
      .then(function () { return all('learned'); }).then(function (r) { out.learned = r; })
      .then(function () { return all('learnlog'); }).then(function (r) { out.learnlog = r; })
      .then(function () { return all('pinset'); }).then(function (r) { out.pins = r.map(function (x) { return { id: x.id, name: x.name, setAt: x.setAt }; }); })
      .then(function () {
        var i = 0, n = 0;
        function next() {
          if (i >= dates.length) return;
          var chunk = dates.slice(i, i + 20); i += 20;
          S.exporting = 'Reading days ' + Math.min(i, dates.length) + ' of ' + dates.length + '...'; draw();
          return Promise.all(chunk.map(function (d) { return f.getDocs(itemsCol(d)).then(function (sn) { if (sn.docs.length) { out.days[d] = sn.docs.map(function (x) { var y = x.data(); y.id = x.id; return y; }); n += sn.docs.length; } }); })).then(next);
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
      .then(function () { return copyCol('learned'); }).then(function () { return copyCol('learnlog'); })
      .then(function () {
        var i = 0;
        function next() {
          if (i >= dates.length) return;
          var chunk = dates.slice(i, i + 20); i += 20;
          S.moveMsg = 'Copying days ' + Math.min(i, dates.length) + ' of ' + dates.length + '...'; draw();
          return Promise.all(chunk.map(function (d) {
            return f.getDocs(f.collection(fb.db, 'kitchens', old, 'days', d, 'items')).then(function (sn) { n += sn.docs.length; return Promise.all(sn.docs.map(function (x) { return f.setDoc(f.doc(fb.db, 'kitchens', np, 'days', d, 'items', x.id), x.data()); })); });
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
  /* ---------- the weekly ticking badges (shown to everyone) ---------- */
  function loadWeek() {
    if (!fb || S.weekBusy) return;
    S.weekBusy = true; S.weekAt = Date.now();
    var today = ymd(new Date()), dates = [], i, start = new Date();
    start.setHours(0, 0, 0, 0); start = start.getTime() - 6 * 86400000;
    for (i = 0; i < 7; i++) dates.push(shift(today, -i));
    Promise.all(dates.map(function (d) { return fb.fs.getDocs(itemsCol(d)).then(function (s) { return s.docs.map(function (x) { return x.data(); }); }, function () { return []; }); })).then(function (lists) {
      var counts = {};
      lists.forEach(function (l) { l.forEach(function (x) { if (x.done && !x.deleted && x.doneBy && (x.doneAt || 0) >= start) counts[x.doneBy] = (counts[x.doneBy] || 0) + 1; }); });
      var arr = Object.keys(counts).map(function (n) { return { name: n, n: counts[n] }; }).sort(function (a, b) { return b.n - a.n || a.name.localeCompare(b.name); });
      var rank = 0, prev = -1;
      arr.forEach(function (x, k) { if (x.n !== prev) { rank = k + 1; prev = x.n; } x.rank = rank; });
      S.week = arr; S.weekBusy = false; draw();
    });
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
    for (i = 0; i < 30; i++) dates.push(shift(today, -i));
    Promise.all(dates.map(function (d) { return fb.fs.getDocs(itemsCol(d)).then(function (s) { return [d, s.docs.map(function (x) { return x.data(); })]; }, function () { return [d, []]; }); })).then(function (res) {
      var days = {}; res.forEach(function (r) { days[r[0]] = r[1]; });
      S.stats = { loading: false, days: days, at: Date.now() };
      draw();
    });
  }
  function aggregate(n) {
    var today = ymd(new Date()), dates = [], i, h;
    for (i = n - 1; i >= 0; i--) dates.push(shift(today, -i));
    var agg = { dates: dates, perDay: {}, people: {}, sections: {}, wHour: [], tHour: [], times: [], written: 0, ticked: 0, rolled: 0, rollKeys: {}, fixes: [] };
    for (h = 0; h < 24; h++) { agg.wHour.push(0); agg.tHour.push(0); }
    dates.forEach(function (d) {
      var all = (S.stats.days[d] || []).filter(function (x) { return !x.deleted; });
      var items = all.filter(function (x) { return !x.rolled; });
      var pd = agg.perDay[d] = { w: items.length, t: 0, r: all.length - items.length };
      agg.rolled += pd.r;
      all.forEach(function (x) {
        if (!x.rolled) return;
        var k = String(x.text || '').trim().toLowerCase(), rk = agg.rollKeys[k] = agg.rollKeys[k] || { text: String(x.text || '').trim(), n: 0, max: 0 };
        rk.n++; if (x.rolled > rk.max) rk.max = x.rolled;
      });
      all.forEach(function (x) {
        if (x.orig && x.orig !== x.text) agg.fixes.push({ d: d, from: x.orig, to: x.text, by: x.addedBy || '' });
        if (!x.rolled) {
          agg.written++;
          var nm = x.addedBy || 'Unknown', pp = agg.people[nm] = agg.people[nm] || { w: 0, t: 0 };
          pp.w++;
          if (x.station) agg.sections[x.station] = (agg.sections[x.station] || 0) + 1;
          if (x.addedAt) agg.wHour[new Date(x.addedAt).getHours()]++;
        }
        if (x.done) {
          pd.t++; agg.ticked++;
          var tn = x.doneBy || 'Unknown', tp = agg.people[tn] = agg.people[tn] || { w: 0, t: 0 };
          tp.t++;
          if (x.doneAt) { agg.tHour[new Date(x.doneAt).getHours()]++; if (x.addedAt && x.doneAt > x.addedAt) agg.times.push(x.doneAt - x.addedAt); }
        }
      });
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
  function insightsHTML() {
    var st = S.stats;
    var head = '<section class="set-block"><span class="label">Insights</span><span class="hint">Worked out from the lines themselves, the last 30 days at most.</span>';
    if (!st || st.loading) return head + '<p class="hint">Loading the last 30 days...</p></section>';
    var n = S.statsRange, agg = aggregate(n);
    var med = agg.times.length ? agg.times[Math.floor(agg.times.length / 2)] : 0;
    var bh = -1, bm = 0, hh;
    for (hh = 0; hh < 24; hh++) if (agg.wHour[hh] > bm) { bm = agg.wHour[hh]; bh = hh; }
    var best = null; agg.dates.forEach(function (d) { if (!best || agg.perDay[d].w > agg.perDay[best].w) best = d; });
    var tiles = [
      [agg.written, 'lines written'], [agg.ticked, 'lines ticked off'],
      [agg.written ? Math.round(agg.ticked / agg.written * 100) + '%' : 'n/a', 'ticked off'],
      [agg.fixes.length, 'lines corrected by the proofreader'],
      [agg.rolled, 'lines rolled over'],
      [agg.written ? Math.round(agg.rolled / (agg.written + agg.rolled) * 100) + '%' : 'n/a', 'of each list was rolled over'],
      [dur(med), 'typical time to tick'],
      [bh >= 0 ? (bh < 10 ? '0' : '') + bh + ':00' : 'n/a', 'busiest writing hour'],
      [best && agg.perDay[best].w ? parseYmd(best).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) : 'n/a', 'busiest day']
    ];
    var tbl = '<details class="a-details"><summary>Show the daily numbers as a table</summary><div class="a-scroll"><table class="a-table"><thead><tr><th scope="col">Day</th><th scope="col">Written</th><th scope="col">Ticked</th><th scope="col">Rolled over</th></tr></thead><tbody>' +
      agg.dates.slice().reverse().map(function (d) { return '<tr><th scope="row">' + esc(parseYmd(d).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })) + '</th><td>' + agg.perDay[d].w + '</td><td>' + agg.perDay[d].t + '</td><td>' + agg.perDay[d].r + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
    return head + '<div class="chips">' + [7, 14, 30].map(function (k) { return '<button type="button" class="chip" data-p="range" data-v="' + k + '" aria-pressed="' + (n === k) + '">' + k + ' days</button>'; }).join('') +
      '<button type="button" class="chip" data-p="stats-refresh">Refresh</button></div>' +
      '<div class="a-tiles">' + tiles.map(function (x) { return '<div class="a-tile"><strong>' + esc(String(x[0])) + '</strong><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div>' +
      '<h3 class="a-ch-h">Lines each day</h3>' + legend([['Written', CW], ['Ticked off', CT]]) + dailyChart(agg) + tbl +
      '<h3 class="a-ch-h">By person</h3>' + legend([['Written', CW], ['Ticked off', CT]]) + peopleChart(agg) +
      '<h3 class="a-ch-h">Time of day</h3>' + legend([['Written', CW], ['Ticked off', CT]]) + hoursChart(agg) +
      '<h3 class="a-ch-h">Rolled over most often</h3><span class="hint">Lines that were not finished and moved onto the next day. Longest runs show when you hover a bar.</span>' + rollChart(agg) +
      fixesHTML(agg) +
      '<h3 class="a-ch-h">Sections</h3>' + sectionsChart(agg) + '</section>';
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
    var tickOk = can('tick') && !x.deleted, delOk = can('del');
    var by = x.done && x.doneBy ? esc(x.doneBy) + (x.doneAt ? ' ' + clock(x.doneAt) : '') : (x.rolled ? (x.origBy ? 'from ' + esc(x.origBy) : '') : (x.addedBy ? esc(x.addedBy) : ''));
    var marks = (x.urgent ? '<span class="nb-urg">Urgent</span>' : '') + (x.rolled ? '<span class="nb-roll" title="Not finished earlier, so it rolled over">Rolled' + (x.rolled > 1 ? ' x' + x.rolled : '') + '</span>' : '');
    var star = can('add') && !x.deleted && !readonly ? '<button type="button" class="nb-star" data-p="urgent" data-id="' + esc(x.id) + '" aria-pressed="' + !!x.urgent + '" aria-label="' + esc((x.urgent ? 'Not urgent: ' : 'Mark urgent: ') + x.text) + '">!</button>' : '';
    var rid = x.recipe || ((matchRecipe(x.text) || {}).id || ''), rr = rid ? recipeById(rid) : null;
    var link = rid ? '<a class="nb-go" href="#/r/' + encodeURIComponent(rid) + '" title="' + esc(rr ? 'Open the ' + rr.name + ' card' : 'Open the recipe') + '">recipe</a>' : '';
    return '<li class="nb-row' + (x.done ? ' is-done' : '') + (x.rolled && !x.done ? ' is-rolled' : '') + (x.urgent && !x.done ? ' is-urgent' : '') + (x.deleted ? ' is-removed' : '') + '">' +
      '<button type="button" class="nb-box" data-p="tick" data-id="' + esc(x.id) + '" data-d="' + esc(date) + '" aria-pressed="' + !!x.done + '" aria-label="' + esc((x.done ? 'Untick ' : 'Tick ') + x.text) + '"' + (tickOk ? '' : ' disabled') + '>' + (x.done ? TICK : BOX) + '</button>' +
      '<span class="nb-t"' + (x.orig ? ' title="' + esc('Corrected from: ' + x.orig) + '"' : '') + '>' + esc(x.text) + (x.qty ? ' <span class="nb-q">' + esc(x.qty) + '</span>' : '') + '</span>' + marks +
      '<span class="nb-by">' + by + '</span>' + star + link +
      (delOk ? '<button type="button" class="nb-x" data-p="' + (x.deleted ? 'restore' : 'del') + '" data-id="' + esc(x.id) + '" data-d="' + esc(date) + '" aria-label="' + (x.deleted ? 'Put back ' : 'Remove ') + esc(x.text) + '">' + (x.deleted ? 'put back' : 'remove') + '</button>' : '') + '</li>';
  }
  function pageBody(items, date) {
    var shown = items.filter(function (x) { return (S.showRemoved || !x.deleted) && (!S.tab || (x.station || '') === S.tab) && !(S.hideDone && x.done && !x.deleted); });
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
  function hintText(t) { var m = t && t.trim().length > 2 ? matchRecipe(t) : null; return m ? 'Links to the ' + m.name + ' card' : ''; }
  function sideHTML(today) {
    var live = S.items.filter(function (x) { return !x.deleted; });
    var rolled = live.filter(function (x) { return x.rolled && !x.done; }), urg = live.filter(function (x) { return x.urgent && !x.done; });
    var secs = {}, order = [];
    live.forEach(function (x) { var k = x.station || 'General'; if (!secs[k]) { secs[k] = { n: 0, d: 0 }; order.push(k); } secs[k].n++; if (x.done) secs[k].d++; });
    var prio = rolled.length || urg.length ? '<div class="nb-prio"><strong>Do these first</strong><span>' + (urg.length ? urg.length + ' urgent' : '') + (urg.length && rolled.length ? ', ' : '') + (rolled.length ? rolled.length + ' rolled over from earlier' : '') + '. They sit at the top of each section.</span></div>' : '';
    var meters = order.length ? '<h3 class="nb-sh">Progress by section</h3>' + order.map(function (k) {
      var m = secs[k], pc = m.n ? Math.round(m.d / m.n * 100) : 0;
      return '<div class="nb-meter"><span class="nb-ml">' + esc(k) + '</span><span class="nb-mb" role="img" aria-label="' + esc(k + ': ' + m.d + ' of ' + m.n + ' done') + '"><i style="width:' + pc + '%"></i></span><span class="nb-mn">' + m.d + '/' + m.n + '</span></div>';
    }).join('') : '';
    var have = onList(), dn = String(parseYmd(S.date).getDay()), dname = parseYmd(S.date).toLocaleDateString('en-AU', { weekday: 'long' });
    var today2 = S.learned.filter(function (x) { return !x.hidden && !have[x.id] && x.text && ((x.dow || {})[dn] || 0) >= 2; }).sort(function (a, b) { return ((b.dow || {})[dn] || 0) - ((a.dow || {})[dn] || 0) || (b.uses || 0) - (a.uses || 0); }).slice(0, 12);
    var shownK = {}; today2.forEach(function (x) { shownK[x.id] = 1; });
    var regs = S.learned.filter(function (x) { return isRegular(x) && !have[x.id] && !shownK[x.id] && x.text; }).sort(function (a, b) { return (b.uses || 0) - (a.uses || 0); }).slice(0, 14);
    S.quick = [];
    function chip(x, note) { S.quick.push({ text: x.text, section: bestSection(x) }); return '<button type="button" class="chip sq" data-p="quick" data-i="' + (S.quick.length - 1) + '">' + esc(x.text) + (note ? ' <span class="nb-us">' + esc(note) + '</span>' : '') + '</button>'; }
    var usual = can('add') && today2.length ? '<h3 class="nb-sh">Usual for a ' + esc(dname) + '</h3><p class="nb-sd">Written on at least two ' + esc(dname) + 's. Tap to add.</p><div class="nb-usual">' + today2.map(function (x) { return chip(x, ((x.dow || {})[dn] || 0) + 'x'); }).join('') + '</div>' : '';
    usual += can('add') && regs.length ? '<h3 class="nb-sh">Regulars</h3><p class="nb-sd">Written or picked ' + REGULAR + ' or more times. Tap to add.</p><div class="nb-usual">' + regs.map(function (x) { return chip(x, x.uses + 'x'); }).join('') + '</div>' : '';
    var tools = '<h3 class="nb-sh">Tools</h3><div class="nb-tools">' +
      '<button type="button" class="nb-btn" data-p="hide-done" aria-pressed="' + S.hideDone + '">' + (S.hideDone ? 'Show ticked lines' : 'Hide ticked lines') + '</button>' +
      '<button type="button" class="nb-btn" data-p="copy">Copy the list</button>' +
      '<button type="button" class="nb-btn" data-p="print">Print the list</button>' +
      (isSous() ? '<button type="button" class="nb-btn" data-p="staff-open">Manage staff</button>' : '') + '</div>';
    return prio + meters + usual + tools;
  }
  function listHTML() {
    var p = me(), today = ymd(new Date());
    if (S.date !== today && !canBrowse() && !S.user) { S.date = today; S.tab = ''; watchItems(); }
    if (S.authed && fb && !S.weekBusy && Date.now() - S.weekAt > 300000) loadWeek();
    maybeRoll(); maybeLearn();
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
      '<button type="submit" class="nb-addbtn">Add</button></div><div class="nb-sugg" id="p-sugg">' + suggestHTML() + '</div><p class="nb-hint" id="p-hint" aria-live="polite">' + esc(hintText(S.text)) + '</p>' + recipePicker() + '</form>' : '<p class="hint">You can read the book but not write in it. Ask the admin if that is wrong.</p>';
    var todayEmpty = !live.length && S.itemsState === 'ok' ? '<p class="nb-empty">Nothing written for ' + esc(dayName(S.date).toLowerCase()) + ' yet.</p>' : '';
    var left = '<section class="nb-page nb-left"><header class="nb-ph"><div><h2 class="nb-title" id="rtitle" tabindex="-1">' + esc(dayName(S.date)) + '</h2><span class="nb-date">' + esc(longDate(S.date)) + '</span></div>' +
      '<div class="nb-prog" role="status">' + doneN + ' of ' + live.length + ' done</div></header>' +
      (S.itemsState === 'error' ? '<p class="p-err">Could not load this page. Check the connection.</p>' : '') +
      '<div class="nb-body">' + pageBody(S.items, S.date) + todayEmpty + '</div>' +
      '<div class="nb-foot">' + add + (removed.length && can('del') ? '<button type="button" class="nb-link" data-p="removed">' + (S.showRemoved ? 'Hide' : 'Show') + ' removed (' + removed.length + ')</button>' : '') + '</div></section>';
    var right = '<section class="nb-page nb-right"><header class="nb-ph"><div><h2 class="nb-title nb-dim">Handy</h2><span class="nb-date">Priorities, progress and tools</span></div></header>' +
      '<div class="nb-body nb-side">' + sideHTML(today) + '</div></section>';
    return '<div class="nb-top"><span>' + (p ? 'Writing as <strong>' + esc(p.name) + '</strong>' + (can('tick') ? '' : ' (read only)') + esc(myRank()) : '') + '</span><span class="p-links"><button type="button" class="p-link" data-p="who-change">Not you?</button>' + (canBrowse() || S.user ? '<a class="p-link" href="#/admin">Admin</a>' : '') + '</span></div>' +
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
      return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Admin panel</h2><p class="hint">Sign in with your Google account to open the admin panel.</p>' +
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
    var tabsBar = '<nav class="a-tabs" aria-label="Admin sections">' + [['insights', 'Insights'], ['learning', 'Learning'], ['people', 'People'], ['tools', 'Tools']].map(function (t) {
      return '<button type="button" class="a-tab" data-p="a-tab" data-t="' + t[0] + '" aria-pressed="' + (at === t[0]) + '">' + t[1] + '</button>';
    }).join('') + '</nav>';
    var pane = at === 'insights' ? (insightsHTML() + statsHTML()) : at === 'learning' ? learnedHTML() : at === 'people' ? (
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
  function bodyHTML() {
    if (!S.pin) return gateHTML();
    if (S.configState === 'error') return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Prep book</h2><p class="p-err">Could not connect. Check the connection and try again.</p><div class="btn-row"><button type="button" class="btn dark" data-p="retry">Try again</button></div></section>';
    if (S.configState !== 'ok') return '<section class="p-card"><h2 class="p-h" id="rtitle" tabindex="-1">Prep book</h2><p class="hint">Connecting...</p></section>';
    if (S.name === 'admin') return adminHTML();
    if (!who()) return whoHTML();
    if (!S.authed) return ownPinHTML();
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

  /* ---------- events ---------- */
  function onClick(e) {
    var el = e.target.closest('[data-p]');
    if (!el || !S.root || !S.root.contains(el)) return;
    var a = el.getAttribute('data-p'), id = el.getAttribute('data-id'), i = +el.getAttribute('data-i'), dt = el.getAttribute('data-d');
    if (el.tagName === 'SUMMARY') { S.recipeOpen = !S.recipeOpen; return; }
    if (a === 'pin-go') { var v = S.pinInput.trim(); if (!/^\d{4}$/.test(v)) { S.pinError = 'The kitchen PIN is 4 digits.'; draw(); return; } S.pin = v; S.pinError = ''; S.pinInput = ''; lsSet('lk.prep.pin', v); connect(); return; }
    if (a === 'pin-forget') { S.pin = ''; lsSet('lk.prep.pin', ''); S.config = null; S.configState = 'idle'; if (unsubCfg) unsubCfg(); if (unsubItems) unsubItems(); if (unsubSec) unsubSec(); if (unsubLrn) unsubLrn(); unsubCfg = unsubItems = unsubSec = unsubLrn = null; cfgKey = itemsKey = ''; draw(); return; }
    if (a === 'retry') { cfgKey = ''; connect(); return; }
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
    if (a === 'learn-hide') { hideLearned(id, el.getAttribute('data-hide') === '1'); return; }
    if (a === 'hide-done') { S.hideDone = !S.hideDone; draw(); return; }
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
    if (k === 'p-text') { S.text = el.value; var hn = S.root.querySelector('#p-hint'); if (hn) hn.textContent = hintText(S.text); var sg = S.root.querySelector('#p-sugg'); if (sg) sg.innerHTML = suggestHTML(); return; }
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
    if (a === 'badges') { S.draft.showBadges = el.checked; return; }
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
    proofread: proofread,
    state: S
  };
})();
