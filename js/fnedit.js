/*
  Leichhardt Kitchen Book: Manage functions (#/functions), for function managers only (21 Oct 2026)
  ===================================================================================================
  Loaded by js/app.js the first time the page opens for someone ticked for Functions (staff phones never download it).
  A function manager enters a function once: the date, the event start, the guests, the platters from the book's
  Functions section, when they go out (all at once or in rounds), notes and a kitchen comment. Confirmed functions
  show in the kitchen's band under the top bar (js/functions.js).

  Pages: #/functions (the list), #/functions/new (a new function), #/functions/<id> (change one).
  Clicks use data-fe, typing data-ff (the field it changes), classes fe-.

  Saving: one batch through the prep book's W() (the writer's id and PIN proof): functions/<id>, its earlier version in
  functions/<id>/hist/<v>, and the contact in fncontact/<id>. The version on the server is read first, so two managers
  never overwrite each other without saying so, and a double tap cannot make a second copy (the rules refuse a
  version that is not the next one). What is typed is kept on this device (lk.fe.draft.<id>) until the save is confirmed.
*/
(function () {
  'use strict';

  var API = 2;
  var FN = window.LK_FN, M = FN.M, P = window.LK_PREP, esc = FN.esc, T = window.LK_TIME;
  function B() { return P.book(); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null || v === '') localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function now() { return T.now(); }
  function today() { return T.day(); }
  var E = { root: null, sub: [], list: null, listErr: false, q: '', chip: 'up', ed: null, pending: {}, armed: '', armTimer: null };
  function arm(k) {
    if (E.armed === k) { E.armed = ''; clearTimeout(E.armTimer); return true; }
    E.armed = k; clearTimeout(E.armTimer); E.armTimer = setTimeout(function () { E.armed = ''; draw(); }, 4000);
    draw(); return false;
  }
  function armed(k) { return E.armed === k; }
  var toastEl = null, toastTimer = null;
  function toast(msg) {
    B().say(msg);
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'p-toasts fe-toasts'; document.body.appendChild(toastEl); }
    toastEl.innerHTML = '<div class="p-toast p-toast-plain" role="presentation">' + esc(msg) + '</div>';
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { if (toastEl) toastEl.innerHTML = ''; }, 4000);
  }
  function newId(name) {
    var s = String(name || 'function').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'function';
    return s + '-' + now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
  }
  function stamp(ms) { return ms ? M.dayName(M.kday(ms)) + ' ' + M.kclock(ms) : ''; }
  function draftKey(k) { return 'lk.fe.draft.' + k; }

  /* ---------- the form's model: what is typed (strings), and the saved shape worked out from it ---------- */
  function blank() {
    return { name: '', date: '', startT: '', loc: '', guests: '', gu: false, st: false, cname: '', phone: '', email: '', mode: 'all', foodDate: '', foodT: '', foodSet: false,
      n: '3', gap: '30', rounds: [], lines: [], notes: '', kc: '', custom: false };
  }
  // a saved function (and its contact) back into the form
  function fromDoc(f, c) {
    var d = blank(), n = (f.rounds || []).length;
    d.name = f.name || ''; d.date = f.date || ''; d.startT = f.start ? M.kclock(f.start) : ''; d.st = !!f.st; d.loc = f.loc || ''; d.guests = f.guests ? String(f.guests) : ''; d.gu = !!f.gu;
    d.cname = (c && c.cname) || ''; d.phone = (c && c.phone) || ''; d.email = (c && c.email) || '';
    d.mode = f.mode || 'all'; d.notes = f.notes || ''; d.kc = f.kc || '';
    d.rounds = (f.rounds || []).map(function (r) { return { d: M.kday(r.at), t: M.kclock(r.at), note: r.note || '' }; });
    if (d.rounds.length) { d.foodDate = d.rounds[0].d; d.foodT = d.rounds[0].t; d.foodSet = f.rounds[0].at !== f.start; }
    d.n = String(Math.max(2, n)); d.gap = n > 1 ? String(Math.max(1, Math.round((f.rounds[1].at - f.rounds[0].at) / M.MIN))) : '30';
    d.lines = (f.lines || []).map(function (l) { return { rid: l.rid, name: l.name, unit: l.unit || 'platter', spec: l.spec || '', fp: l.fp || '', qty: String(l.qty), a: M.fromU(l.u, Math.max(1, n)) }; });
    d.custom = d.mode === 'stag' && d.lines.some(function (l) { return JSON.stringify(l.a) !== JSON.stringify(M.even(+l.qty || 0, n)); });
    return d;
  }
  // times are typed 24-hour: "1830", "18.30", "6:30" and "18:30" all mean what they say; anything else stays as typed
  var T24 = ' inputmode="numeric" maxlength="5" placeholder="18:30" autocomplete="off"';
  function normT(v) {
    var t = String(v || '').trim().replace(/[.h ]/g, ':'), m = /^(\d{1,2}):?(\d{2})$/.exec(t);
    if (!m || +m[1] > 23 || +m[2] > 59) return String(v || '').trim();
    return (m[1].length === 1 ? '0' : '') + m[1] + ':' + m[2];
  }
  function atOf(ymd, hm) { var m = M.hmMin(hm); return M.isYmd(ymd) && m === m ? M.kat(ymd, m) : 0; }
  function int(s) { var t = String(s == null ? '' : s).trim(); return /^\d+$/.test(t) ? +t : (t === '' ? 0 : NaN); }
  // the saved shape (without who and when): what the rules and the kitchen read
  function toDoc(e) {
    var d = e.d, n = d.rounds.length;
    var f = {
      status: e.status, name: d.name.trim().slice(0, 80), date: M.isYmd(d.date) ? d.date : '', start: d.st ? 0 : atOf(d.date, d.startT), st: !!d.st, loc: d.loc.trim().slice(0, 60),
      guests: d.gu ? 0 : int(d.guests), gu: !!d.gu, mode: d.mode, notes: d.notes.trim().slice(0, 1000), kc: d.kc.replace(/\s+$/, '').slice(0, 2000),
      rounds: d.rounds.map(function (r) { return { at: atOf(r.d, r.t), note: String(r.note || '').trim().slice(0, 80) }; }),
      lines: d.lines.map(function (l) { return { rid: l.rid, name: l.name, unit: l.unit, spec: l.spec, fp: l.fp, qty: int(l.qty), u: M.toU(l.a.slice(0, n).map(function (x) { var v = int(x); return v >= 0 ? v : 0; })) }; })
    };
    return M.derive(f);
  }
  // everything wrong for confirming: the schedule's problems, the typed numbers and the contact
  function check(e) {
    var d = e.d, f = toDoc(e), out = M.problems(f);
    if (!d.gu && int(d.guests) !== int(d.guests) && String(d.guests).trim()) out.push({ k: 'guests', t: 'Guests: a whole number.' });
    d.lines.forEach(function (l, i) {
      if (int(l.qty) !== int(l.qty)) out.push({ k: 'qty' + i, t: M.short(l.name) + ': whole platters only.' });
      l.a.forEach(function (x, r) { var v = int(x); if (r < d.rounds.length && (v !== v || v < 0)) out.push({ k: 'a' + i + '_' + r, t: M.short(l.name) + ', round ' + (r + 1) + ': a whole number, 0 or more.' }); });
    });
    d.rounds.forEach(function (r, i) { if (!atOf(r.d, r.t) && !(d.st && d.mode === 'all' && !String(r.t).trim())) out.push({ k: 'round' + i, t: 'Round ' + (i + 1) + ': set its date and time.' }); });
    if (d.mode === 'stag' && !(int(d.gap) >= 1)) out.push({ k: 'gap', t: 'The gap between rounds is 1 minute or more.' });
    return out.concat(contactProblems(d));
  }
  function contactProblems(d) {
    var out = [];
    if (d.phone.trim() && !/^[0-9 +()-]{6,20}$/.test(d.phone.trim())) out.push({ k: 'phone', t: 'Phone: numbers, spaces, + ( ) and - only.' });
    if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) out.push({ k: 'email', t: 'Email: that does not look like an email address.' });
    return out;
  }

  /* ---------- the schedule: worked out again when what it is made from changes, never over a grid set by hand ---------- */
  function retime(e) {
    var d = e.d;
    if (!d.foodSet) { d.foodDate = d.date; d.foodT = d.startT; }
    if (d.mode === 'all') {
      d.rounds = [{ d: d.foodDate, t: d.foodT, note: (d.rounds[0] || {}).note || '' }];
      d.lines.forEach(function (l) { l.a = [Math.max(0, int(l.qty) || 0)]; });
      return;
    }
    var n = Math.min(M.MAX_ROUNDS, Math.max(2, int(d.n) || 2)), gap = int(d.gap) >= 1 ? int(d.gap) : 30, first = atOf(d.foodDate, d.foodT), old = d.rounds;
    d.rounds = [];
    for (var i = 0; i < n; i++) {
      var at = first ? first + i * gap * M.MIN : 0;
      d.rounds.push({ d: at ? M.kday(at) : d.foodDate, t: at ? M.kclock(at) : '', note: (old[i] || {}).note || '' });
    }
    realloc(e);
  }
  function realloc(e) {
    var d = e.d, n = d.rounds.length;
    d.lines.forEach(function (l) {
      if (!e.d.custom) l.a = M.even(Math.max(0, int(l.qty) || 0), n);
      else { var a = l.a.slice(0, n); while (a.length < n) a.push(0); l.a = a; }
    });
  }
  // the date moved: every time on the function moves with it, so 18:30 stays 18:30 (a reschedule)
  function moveDate(e, to) {
    var d = e.d, from = d.date;
    if (!M.isYmd(to)) { d.date = to; return; }
    var shift = M.isYmd(from) ? Math.round((M.kat(to, 0) - M.kat(from, 0)) / M.DAY) : 0;
    d.date = to;
    d.foodDate = M.isYmd(d.foodDate) && shift ? M.addDays(d.foodDate, shift) : (M.isYmd(d.foodDate) && M.isYmd(from) ? d.foodDate : to);
    d.rounds.forEach(function (r) { r.d = M.isYmd(r.d) && M.isYmd(from) ? M.addDays(r.d, shift) : to; });
  }

  /* ---------- the list (#/functions) ---------- */
  function loadList() {
    E.list = E.list || 'loading'; E.listErr = false; draw();
    var api = B();
    api.ready().then(function () {
      var fs = api.fs();
      return fs.getDocs(fs.query(api.colRef('functions'), fs.orderBy('date', 'desc'), fs.limit(400)));
    }).then(function (sn) {
      E.list = sn.docs.map(function (x) { return M.derive(Object.assign({ id: x.id }, x.data())); }); E.listAt = now(); draw();
    }, function () { E.listErr = true; if (E.list === 'loading') E.list = null; draw(); });
  }
  var CHIPS = [['up', 'Coming up'], ['draft', 'Drafts'], ['past', 'Past'], ['cancelled', 'Cancelled'], ['all', 'All']];
  function inChip(f, c) {
    var t = today(), done = f.date && f.date < t;
    if (c === 'up') return f.status !== 'cancelled' && (!f.date || !done);
    if (c === 'draft') return f.status === 'draft';
    if (c === 'past') return f.status !== 'cancelled' && !!done;
    if (c === 'cancelled') return f.status === 'cancelled';
    return true;
  }
  function listHTML() {
    var head = '<div class="fe-head"><h2 id="rtitle" tabindex="-1">Functions</h2><div class="btn-row"><a class="btn dark" href="#/functions/new">New function</a><a class="btn" href="#/fn">Kitchen view</a></div></div>';
    if (E.list === 'loading' || (!E.list && !E.listErr)) return head + '<p role="status">Loading functions...</p>';
    if (!E.list) return head + '<p class="p-err" role="alert">Could not load the functions. Check the signal.</p><div class="btn-row"><button type="button" class="btn" data-fe="reload">Try again</button></div>';
    var drafts = Object.keys(localStorage || {}).filter(function (k) { return k.indexOf('lk.fe.draft.') === 0; });
    var ov = M.overlaps(E.list), q = E.q.trim().toLowerCase();
    var rows = E.list.filter(function (f) { return inChip(f, E.chip) && (!q || (f.name + ' ' + f.loc).toLowerCase().indexOf(q) >= 0); });
    rows.sort(function (a, b) { return E.chip === 'past' ? (b.date || '').localeCompare(a.date || '') || b.first - a.first : (a.date || '9').localeCompare(b.date || '9') || a.first - b.first; });
    var byName = {}; E.list.forEach(function (f) { byName[f.id] = f.name; });
    var groups = {}, order = [];
    rows.forEach(function (f) { var k = f.date || ''; if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(f); });
    var body = order.map(function (k) {
      var tot = M.dayTotals(groups[k])[k] || [];
      return '<section class="fe-day"><h3>' + esc(k ? M.dayName(k) + (k === today() ? ' (today)' : '') : 'No date yet') + '</h3><ul class="fe-rows">' + groups[k].map(function (f) {
        var st = f.status === 'draft' ? '<span class="fn-tag">Draft</span>' : f.status === 'cancelled' ? '<span class="fn-tag fn-t-off">Cancelled</span>' : '<span class="fn-tag fn-t-ok">Confirmed</span>';
        var o = (ov[f.id] || []).map(function (id) { return byName[id]; });
        return '<li><a class="fe-row" href="#/functions/' + encodeURIComponent(f.id) + '"><span class="fe-r1"><b>' + esc(f.name || 'No name yet') + '</b> ' + st + (lsGet(draftKey(f.id)) ? ' <span class="fn-tag">Not saved</span>' : '') + '</span>' +
          '<span class="fe-r2">' + (f.start || f.st ? 'Event ' + esc(M.when(f.start, f.date)) + ' · food ' + esc(M.when(f.first, f.date)) : 'No times yet') + (f.loc ? ' · ' + esc(f.loc) : '') + (f.gu || f.guests ? ' · ' + M.guestsText(f) : '') + ' · ' + M.totalQty(f) + ' platters' + (f.mode === 'stag' ? ', ' + (f.rounds || []).length + ' rounds' : '') + '</span>' +
          (o.length ? '<span class="fe-ov">Food times overlap with ' + esc(o.join(', ')) + '</span>' : '') + '</a></li>';
      }).join('') + '</ul>' + (tot.length ? '<p class="fe-dtot">Confirmed for the day: ' + tot.map(function (r) { return r.qty + ' ' + esc(M.short(r.name)); }).join(', ') + '</p>' : '') + '</section>';
    }).join('');
    return head + (drafts.indexOf(draftKey('new')) >= 0 ? '<p class="fe-note">A new function you started is not saved yet. <a href="#/functions/new">Carry on with it</a>.</p>' : '') +
      '<div class="field"><label class="label" for="fe-q">Search</label><input id="fe-q" class="search" data-ff="q" value="' + esc(E.q) + '" placeholder="Name or place" autocomplete="off"></div>' +
      '<div class="chips scroll" role="group" aria-label="Show">' + CHIPS.map(function (c) { return '<button type="button" class="chip" data-fe="chip" data-v="' + c[0] + '" aria-pressed="' + (E.chip === c[0]) + '">' + c[1] + ' <span class="lv-n">' + E.list.filter(function (f) { return inChip(f, c[0]); }).length + '</span></button>'; }).join('') + '</div>' +
      (body || '<p class="hint">No functions here.</p>') + (E.listAt ? '<p class="hint">Read ' + esc(stamp(E.listAt)) + '. <button type="button" class="linkish" data-fe="reload">Read again</button></p>' : '');
  }

  /* ---------- open a function in the form ---------- */
  function openNew(copyOf) {
    var kept = lsGet(draftKey('new')), e = null;
    if (kept && !copyOf) { try { e = JSON.parse(kept); } catch (x) { e = null; } }
    if (!e) {
      e = { id: newId(''), isNew: true, v: 0, status: 'draft', saved: null, savedC: null, d: blank() };
      if (copyOf) {
        e.d = clone(copyOf); e.d.date = ''; e.d.foodDate = ''; e.d.rounds.forEach(function (r) { r.d = ''; }); e.d.kc = copyOf.kc; e.d.name = copyOf.name + ' (copy)';
        toast('Copied as a new draft. Pick its date, then confirm.');
      }
    }
    e.restored = !!kept && !copyOf;
    E.ed = e; keep(); draw();
    focusF('name');
  }
  function openId(id) {
    var kept = lsGet(draftKey(id)), api = B();
    E.ed = { id: id, loading: true }; draw();
    api.ready().then(function () {
      var fs = api.fs();
      var g = function (ref) { return fs.getDocFromServer(ref).catch(function () { return fs.getDoc(ref); }); };
      return Promise.all([g(api.docRef('functions', id)), g(api.docRef('fncontact', id)).catch(function () { return null; })]);
    }).then(function (r) {
      if (!E.ed || E.ed.id !== id) return;
      if (!r[0].exists()) { E.ed = { id: id, missing: true }; draw(); return; }
      var f = M.derive(Object.assign({ id: id }, r[0].data())), c = r[1] && r[1].exists() ? r[1].data() : {};
      // cMiss: the contact could not be read on this phone (no PIN session for a function manager, or no signal)
      var e = { id: id, isNew: false, v: f.v, status: f.status, saved: f, savedC: c, cMiss: r[1] === null, d: fromDoc(f, c) };
      if (kept) { try { var k = JSON.parse(kept); if (k && k.d) { e.d = k.d; e.status = k.status || e.status; e.restored = true; e.keptV = k.v; } } catch (x) {} }
      E.ed = e; draw();
    }, function () { if (E.ed && E.ed.id === id) { E.ed = { id: id, failed: true }; draw(); } });
  }
  function keep() { var e = E.ed; if (!e || !e.d) return; lsSet(draftKey(e.isNew ? 'new' : e.id), JSON.stringify({ id: e.id, isNew: e.isNew, v: e.v, status: e.status, d: e.d, saved: e.isNew ? null : undefined })); }
  function forget(e) { lsSet(draftKey(e.isNew ? 'new' : e.id), ''); }
  function dirty() {
    var e = E.ed; if (!e || !e.d) return false;
    if (e.isNew) return !!(e.d.name || e.d.date || e.d.lines.length || e.d.kc || e.d.notes);
    return JSON.stringify(e.d) !== JSON.stringify(fromDoc(e.saved, e.savedC)) || e.status !== e.saved.status;
  }

  /* ---------- the form ---------- */
  function fieldErr(k) { var e = E.ed, p = (e.shown || []).filter(function (x) { return x.k === k; })[0]; return p ? '<span class="fe-err" id="fe-e-' + k + '">' + esc(p.t) + '</span>' : ''; }
  function inp(k, label, val, attrs, hint) {
    var err = (E.ed.shown || []).some(function (x) { return x.k === k; });
    return '<div class="field fe-f"><label class="label" for="fe-' + k + '">' + label + '</label><input id="fe-' + k + '" class="search" data-ff="' + k + '" value="' + esc(val) + '"' + (attrs || '') +
      (err ? ' aria-invalid="true" aria-describedby="fe-e-' + k + '"' : '') + '>' + (hint ? '<span class="hint">' + hint + '</span>' : '') + fieldErr(k) + '</div>';
  }
  // guests: a number, or ticked Not known yet (the box empties and waits until it is unticked)
  // the event start: a 24-hour time, or ticked TBC (the food times then wait too, unless one is typed)
  function startHTML(d) {
    var err = (E.ed.shown || []).some(function (x) { return x.k === 'startT' || x.k === 'start'; });
    return '<div class="field fe-f"><label class="label" for="fe-startT">Event start (24-hour)</label><div class="fe-gu"><input id="fe-startT" class="search fe-time" data-ff="startT"' + T24 + ' value="' + esc(d.st ? '' : d.startT) + '"' + (d.st ? ' disabled' : '') +
      (err ? ' aria-invalid="true" aria-describedby="fe-e-start"' : '') + '><label class="a-check"><input type="checkbox" data-ff="st"' + (d.st ? ' checked' : '') + '> TBC</label></div>' +
      (d.st ? '<span class="hint">The kitchen sees "TBC" and the function shows all day. It can still be confirmed (all at once); fill the time in when it is known.</span>' : '') + fieldErr('start') + '</div>';
  }
  function guestsHTML(d) {
    var err = (E.ed.shown || []).some(function (x) { return x.k === 'guests'; });
    return '<div class="field fe-f"><label class="label" for="fe-guests">Guests</label><div class="fe-gu"><input id="fe-guests" class="search fe-num" data-ff="guests" type="number" inputmode="numeric" min="1" step="1" value="' + esc(d.gu ? '' : d.guests) + '"' + (d.gu ? ' disabled' : '') +
      (err ? ' aria-invalid="true" aria-describedby="fe-e-guests"' : '') + '><label class="a-check"><input type="checkbox" data-ff="gu"' + (d.gu ? ' checked' : '') + '> Not known yet</label></div>' +
      fieldErr('guests') + '</div>';
  }
  function linesHTML(e) {
    var d = e.d, cat = FN.catalogue(), have = {}, q = (e.pq || '').trim().toLowerCase();
    d.lines.forEach(function (l) { have[l.rid] = 1; });
    var out = '<ul class="fe-lines">' + d.lines.map(function (l, i) {
      var r = FN.recipeOf(l.rid), now_ = cat.filter(function (c) { return c.rid === l.rid; })[0];
      var flag = !r ? '<span class="fe-flag">No longer in the book. Check with the head chef.</span>' : now_ && l.fp && now_.fp !== l.fp ? '<span class="fe-flag">Changed in the book since it was booked: ' + esc(now_.name) + '. Check it still suits.</span>' : '';
      return '<li class="fe-line"><div class="fe-ln"><b>' + esc(l.name) + '</b><small>' + esc(l.spec) + '</small>' + flag + '</div>' +
        '<div class="fe-lq"><label class="visually-hidden" for="fe-qty' + i + '">How many ' + esc(l.name) + '</label><input id="fe-qty' + i + '" class="search fe-num" type="number" inputmode="numeric" min="1" max="' + M.MAX_QTY + '" step="1" data-ff="qty' + i + '" value="' + esc(l.qty) + '"' + ((e.shown || []).some(function (x) { return x.k === 'qty' + i; }) ? ' aria-invalid="true"' : '') + '><span>' + esc(M.unitOf(l, +l.qty)) + '</span></div>' +
        '<button type="button" class="p-x" data-fe="rmline" data-i="' + i + '" aria-label="Take ' + esc(l.name) + ' off">' + (armed('rm' + i) ? 'Tap again' : 'Take off') + '</button>' + fieldErr('qty' + i) + '</li>';
    }).join('') + '</ul>';
    var left = cat.filter(function (c) { return !have[c.rid] && (!q || c.name.toLowerCase().indexOf(q) >= 0); });
    if (d.lines.length < M.MAX_LINES) {
      out += '<div class="fe-pick"><label class="label" for="fe-pq">Add a platter</label><input id="fe-pq" class="search" data-ff="pq" value="' + esc(e.pq || '') + '" placeholder="Search the Functions platters" autocomplete="off">' +
        '<div class="fe-picks">' + (left.length ? left.map(function (c) { return '<button type="button" class="chip" data-fe="addline" data-v="' + esc(c.rid) + '">+ ' + esc(c.name) + '</button>'; }).join('') : '<span class="hint">' + (cat.length ? 'No other platter matches.' : 'The book has no Functions platters yet.') + '</span>') + '</div></div>';
    } else out += '<p class="hint">At most ' + M.MAX_LINES + ' kinds of platter on one function.</p>';
    return out + fieldErr('lines');
  }
  function gridHTML(e) {
    var d = e.d, n = d.rounds.length;
    if (!d.lines.length || !n) return '';
    var head = '<tr><th scope="col">Round</th>' + d.lines.map(function (l) { return '<th scope="col">' + esc(M.short(l.name)) + '</th>'; }).join('') + '<th scope="col">Total</th></tr>';
    var rows = d.rounds.map(function (r, ri) {
      var t = d.lines.reduce(function (s, l) { return s + (int(l.a[ri]) || 0); }, 0), nextDay = d.date && r.d && r.d !== d.date;
      return '<tr' + (t ? '' : ' class="is-empty"') + '><th scope="row"><span class="fe-rn">' + (ri + 1) + '</span>' +
        '<label class="visually-hidden" for="fe-rt' + ri + '">Round ' + (ri + 1) + ' time</label><input id="fe-rt' + ri + '" class="search fe-time"' + T24 + ' data-ff="rt' + ri + '" value="' + esc(r.t) + '">' +
        (nextDay ? '<small class="fe-nd">' + esc(M.dayName(r.d)) + (r.d === M.addDays(d.date, 1) ? ' (next day)' : '') + '</small>' : '') +
        '<label class="visually-hidden" for="fe-rn' + ri + '">Round ' + (ri + 1) + ' note</label><input id="fe-rn' + ri + '" class="search fe-rnote" data-ff="rn' + ri + '" value="' + esc(r.note) + '" placeholder="Note (optional)" maxlength="80">' +
        (t ? '' : '<button type="button" class="p-x" data-fe="rmround" data-i="' + ri + '">Remove round</button>') + '</th>' +
        d.lines.map(function (l, li) { return '<td><label class="visually-hidden" for="fe-a' + li + '_' + ri + '">' + esc(M.short(l.name)) + ', round ' + (ri + 1) + '</label><input id="fe-a' + li + '_' + ri + '" class="search fe-num" type="number" inputmode="numeric" min="0" step="1" data-ff="a' + li + '_' + ri + '" value="' + esc(l.a[ri] == null ? 0 : l.a[ri]) + '"></td>'; }).join('') +
        '<td><b>' + t + '</b></td></tr>';
    }).join('');
    var foot = '<tr class="fn-tot"><th scope="row">Placed of booked</th>' + d.lines.map(function (l) {
      var placed = l.a.slice(0, n).reduce(function (s, x) { return s + (int(x) || 0); }, 0), q = int(l.qty) || 0;
      return '<td class="' + (placed === q ? 'is-ok' : 'is-bad') + '"><b>' + placed + ' of ' + q + '</b>' + (placed < q ? '<small>' + (q - placed) + ' to place</small>' : placed > q ? '<small>' + (placed - q) + ' too many</small>' : '') + '</td>';
    }).join('') + '<td></td></tr>';
    return '<div class="fn-tw"><table class="fn-table fe-grid"><caption class="visually-hidden">Platters in each round</caption><thead>' + head + '</thead><tbody>' + rows + foot + '</tbody></table></div>';
  }
  function serviceHTML(e) {
    var d = e.d, out = '<div class="seg fe-mode" role="radiogroup" aria-label="How the platters go out">' + [['all', 'All at once'], ['stag', 'Staggered']].map(function (m) {
      return '<button type="button" class="seg-b" role="radio" data-fe="mode" data-v="' + m[0] + '" aria-checked="' + (d.mode === m[0]) + '">' + m[1] + '</button>';
    }).join('') + '</div>';
    out += '<div class="fe-row2">' + inp('foodDate', d.mode === 'all' ? 'Food goes out on' : 'First round on', d.foodDate, ' type="date"') + inp('foodT', d.mode === 'all' ? 'Food goes out at' : 'First round at', d.foodT, T24, d.foodSet ? '' : 'Same as the event start until you change it.') + '</div>';
    if (d.mode === 'stag') {
      out += '<div class="fe-row2">' + inp('n', 'Rounds', d.n, ' type="number" inputmode="numeric" min="2" max="' + M.MAX_ROUNDS + '" step="1"') + inp('gap', 'Minutes between rounds', d.gap, ' type="number" inputmode="numeric" min="1" max="600" step="5"') + '</div>' +
        '<p class="hint">' + (d.custom ? 'Split by hand. Changing the rounds keeps your numbers; ' : 'Split evenly, earlier rounds first (5 over 3 is 2, 2, 1). Type in the grid to split by hand. ') + '<button type="button" class="linkish" data-fe="even">Split evenly again</button></p>' + gridHTML(e);
    } else if (d.lines.length) {
      out += '<p class="fe-allline">All at ' + esc(d.foodT || '?') + ': ' + esc(d.lines.map(function (l) { return (int(l.qty) || 0) + ' ' + M.short(l.name); }).join(', ')) + '</p>';
    }
    var f = toDoc(e);
    if (f.start && f.first && f.first !== f.start) out += '<p class="hint">Event starts ' + esc(M.when(f.start, f.date)) + '; food from ' + esc(M.when(f.first, f.date)) + '. The kitchen sees both.</p>';
    return out + fieldErr('rounds') + fieldErr('gap');
  }
  function liveHTML(e) {
    var f = toDoc(e), probs = check(e), tot = M.totalQty(f);
    return '<div class="fe-bar-t"><b>' + tot + ' ' + (tot === 1 ? 'platter' : 'platters') + '</b>' + (f.rounds.length ? ' · ' + (f.mode === 'all' ? 'all at ' + esc(M.when(f.first, f.date)) : f.rounds.length + ' rounds from ' + esc(M.when(f.first, f.date))) : '') +
      (f.gu || f.guests ? ' · ' + M.guestsText(f) : '') + (probs.length ? ' · <span class="fe-bad">' + probs.length + ' to fix before confirming</span>' : e.status !== 'confirmed' ? ' · <span class="fe-good">Ready to confirm</span>' : '') + '</div>';
  }
  function reviewHTML(e) {
    var f = toDoc(e);
    f.id = e.id; f.kcBy = B().who(); f.kcAt = now(); f.by = B().who(); f.upd = now(); f.chg = [];
    return '<section class="set-block fe-review" aria-labelledby="fe-rv-h"><h3 id="fe-rv-h" tabindex="-1">Check before confirming</h3><p class="hint">This is what the kitchen will see. Confirming puts it in the band under the top bar from 00:00 on ' + esc(M.dayName(f.date)) + '.</p>' +
      FN.sheetHTML(f, false).replace(/<div class="btn-row">[\s\S]*?<\/div>$/, '') +
      '<div class="btn-row"><button type="button" class="btn dark" data-fe="confirm"' + (e.saving ? ' disabled' : '') + '>' + (e.status === 'cancelled' ? 'Put it back on' : 'Confirm function') + '</button><button type="button" class="btn" data-fe="review-x">Back to the form</button></div></section>';
  }
  function editHTML() {
    var e = E.ed;
    var back = '<div class="btn-row"><a class="btn" data-fe-back="1" href="#/functions">Back to all functions</a></div>';
    if (e.loading) return back + '<p role="status">Opening the function...</p>';
    if (e.missing) return '<section class="set-block"><h2 id="rtitle" tabindex="-1">Function not found</h2><p>It may have a different link.</p><div class="btn-row"><a class="btn" href="#/functions">All functions</a></div></section>';
    if (e.failed) return '<section class="set-block"><h2 id="rtitle" tabindex="-1">Could not open the function</h2><p>Check the signal and try again.</p><div class="btn-row"><button type="button" class="btn dark" data-fe="reopen">Try again</button><a class="btn" href="#/functions">All functions</a></div></section>';
    var d = e.d, s = e.saved, st = e.status;
    if (e.review) return '<div class="btn-row"><button type="button" class="btn" data-fe="review-x">Back to the form</button></div><div class="fe-head"><h2 id="rtitle" tabindex="-1">' + esc(d.name || 'New function') + '</h2></div>' + msgHTML(e) + reviewHTML(e);
    var stTag = st === 'draft' ? '<span class="fn-tag">Draft: the kitchen does not see it</span>' : st === 'cancelled' ? '<span class="fn-tag fn-t-off">Cancelled</span>' : '<span class="fn-tag fn-t-ok">Confirmed: in the kitchen\'s band on the day</span>';
    var out = back + '<div class="fe-head"><h2 id="rtitle" tabindex="-1">' + esc(e.isNew ? 'New function' : (s.name || 'Function')) + '</h2>' + stTag + '</div>' +
      (e.restored ? '<p class="fe-note">Changes not saved yet were kept on this device and are back in the form. <button type="button" class="linkish" data-fe="drop">' + (armed('drop') ? 'Tap again to drop them' : 'Drop them') + '</button></p>' : '') +
      (!e.isNew ? '<p class="hint">Last changed by ' + esc(FN.nameOf(s.by)) + ', ' + esc(stamp(s.upd)) + '. Version ' + s.v + '.</p>' : '') + msgHTML(e) +
      '<section class="set-block"><span class="label">The function</span>' + inp('name', 'Name or reference', d.name, ' maxlength="80" autocomplete="off" placeholder="Smith birthday"') +
      '<div class="fe-row2">' + inp('date', 'Date', d.date, ' type="date"') + startHTML(d) + '</div>' +
      '<div class="fe-row2">' + guestsHTML(d) + inp('loc', 'Room, area or table (optional)', d.loc, ' maxlength="60" list="fe-locs" autocomplete="off"') + '</div>' +
      '<datalist id="fe-locs">' + locs().map(function (l) { return '<option value="' + esc(l) + '">'; }).join('') + '</datalist></section>' +
      // the contact folds away once it is filled in (only function managers see it, never the kitchen)
      '<details class="set-block fe-contact"' + (d.cname || d.phone || d.email ? '' : ' open') + ((e.shown || []).some(function (x) { return x.k === 'phone' || x.k === 'email'; }) ? ' open' : '') + '><summary><span class="label">Booking contact</span> <span class="fe-sum">' + esc([d.cname, d.phone].filter(Boolean).join(', ') || 'Only function managers see this') + '</span></summary>' +
      (e.cMiss ? '<p class="hint fe-cmiss">The contact could not be read on this phone. It stays as it is unless you type a new one. Sign out and in again with your PIN to see it.</p>' : '') +
      inp('cname', 'Contact name', d.cname, ' maxlength="80" autocomplete="off"') + '<div class="fe-row2">' + inp('phone', 'Phone (optional)', d.phone, ' type="tel" maxlength="30" autocomplete="off"') + inp('email', 'Email (optional)', d.email, ' type="email" maxlength="120" autocomplete="off"') + '</div></details>' +
      '<section class="set-block"><span class="label">Platters</span><span class="hint">Whole platters, as booked. Guests never change them.</span>' + linesHTML(e) + '</section>' +
      '<section class="set-block"><span class="label">When the platters go out</span>' + serviceHTML(e) + '</section>' +
      '<section class="set-block"><span class="label">Service and dietary notes</span><label class="visually-hidden" for="fe-notes">Service and dietary notes</label><textarea id="fe-notes" class="search fe-ta" data-ff="notes" maxlength="1000" rows="3" placeholder="Two guests coeliac: keep their platter apart.">' + esc(d.notes) + '</textarea></section>' +
      '<section class="set-block fe-kcb"><span class="label">Kitchen comment</span><span class="hint">The kitchen reads this with your name and the time. No phone numbers or emails.</span>' +
      '<label class="visually-hidden" for="fe-kc">Kitchen comment</label><textarea id="fe-kc" class="search fe-ta" data-ff="kc" maxlength="2000" rows="4">' + esc(d.kc) + '</textarea>' +
      (s && s.kc ? '<span class="hint">Saved comment by ' + esc(FN.nameOf(s.kcBy)) + ', ' + esc(stamp(s.kcAt)) + '.</span>' : '') + '</section>' +
      '<div class="fe-bar" id="fe-live">' + liveHTML(e) + '</div>' + problemsHTML(e) + buttonsHTML(e) + (e.isNew ? '' : histHTML(e));
    return out;
  }
  function msgHTML(e) {
    var out = '';
    if (e.conflict) {
      var c = e.conflict;
      out += '<div class="fe-conflict" role="alert"><p><b>Someone else saved this function</b> (' + esc(c.who || 'another device') + ', ' + esc(stamp(c.when)) + ', version ' + c.v + ') after you opened it. Saving now would put your copy over theirs.</p>' +
        '<div class="btn-row"><button type="button" class="btn" data-fe="theirs">Load theirs (yours here go)</button><button type="button" class="btn dark" data-fe="mine">Keep mine and save over theirs</button></div></div>';
    }
    if (e.saving) out += '<p class="fe-saving" role="status">' + esc(e.saving) + '</p>';
    if (e.msg) out += '<p class="p-err" role="alert">' + esc(e.msg) + '</p>';
    return out;
  }
  function problemsHTML(e) {
    if (!e.shown || !e.shown.length) return '';
    return '<div class="fe-probs" role="alert"><b>Before it can be confirmed:</b><ul>' + e.shown.map(function (p) { return '<li><button type="button" class="linkish" data-fe="goto" data-v="' + esc(p.k) + '">' + esc(p.t) + '</button></li>'; }).join('') + '</ul></div>';
  }
  function buttonsHTML(e) {
    var st = e.status, dis = e.saving ? ' disabled' : '', b = [];
    if (st === 'draft') { b.push('<button type="button" class="btn dark" data-fe="review"' + dis + '>Check and confirm</button>'); b.push('<button type="button" class="btn" data-fe="save"' + dis + '>Save draft</button>'); }
    else if (st === 'confirmed') b.push('<button type="button" class="btn dark" data-fe="save"' + dis + '>Save changes</button>');
    else b.push('<button type="button" class="btn dark" data-fe="review"' + dis + '>Put it back on</button>');
    var more = [];
    if (!e.isNew) more.push('<button type="button" class="btn" data-fe="dup">Duplicate</button>');
    if (st === 'confirmed') more.push('<button type="button" class="btn fe-cancel" data-fe="cancel"' + dis + '>' + (armed('cancel') ? 'Tap again to cancel the function' : 'Cancel the function') + '</button>');
    if (dirty()) more.push('<button type="button" class="btn" data-fe="drop">' + (armed('drop') ? 'Tap again to drop your changes' : 'Drop my changes') + '</button>');
    more.push('<a class="btn" href="#/functions">All functions</a>');
    return '<div class="btn-row fe-btns">' + b.join('') + '</div><div class="btn-row">' + more.join('') + '</div>';
  }
  function histHTML(e) {
    var h = e.hist;
    if (!h) return '<section class="set-block"><span class="label">History</span><div class="btn-row"><button type="button" class="btn" data-fe="hist">Show every change</button></div></section>';
    if (h === 'loading') return '<section class="set-block"><span class="label">History</span><p role="status">Loading...</p></section>';
    if (h === 'error') return '<section class="set-block"><span class="label">History</span><p class="p-err">Could not load the history.</p></section>';
    var rows = [{ v: e.saved.v, by: e.saved.by, at: e.saved.upd, what: ((e.saved.chg || [])[0] || {}).what || '' }].concat(h);
    return '<section class="set-block"><span class="label">History</span><ul class="fn-chg">' + rows.map(function (x) { return '<li><span>Version ' + x.v + ', ' + esc(stamp(x.at)) + ', ' + esc(FN.nameOf(x.by)) + '</span> ' + esc(x.what || (x.v === 1 ? 'Started' : '')) + '</li>'; }).join('') + '</ul></section>';
  }
  function locs() { var s = {}; (Array.isArray(E.list) ? E.list : FN.list()).forEach(function (f) { if (f.loc) s[f.loc] = 1; }); return Object.keys(s).sort(); }
  function loadHist() {
    var e = E.ed, api = B(); e.hist = 'loading'; draw();
    api.ready().then(function () { var fs = api.fs(); return fs.getDocs(fs.collection(api.db(), 'kitchens', api.pin(), 'functions', e.id, 'hist')); }).then(function (sn) {
      if (E.ed !== e) return;
      // each record is the version before a save: who made that version and what the next save changed
      e.hist = sn.docs.map(function (x) { var r = x.data(), w = r.was || {}; return { v: w.v || +x.id, by: w.by, at: w.upd, what: ((w.chg || [])[0] || {}).what || '' }; }).sort(function (a, b) { return b.v - a.v; });
      draw();
    }, function () { if (E.ed === e) { e.hist = 'error'; draw(); } });
  }

  /* ---------- saving ---------- */
  function save(kind) {
    var e = E.ed;
    if (!e || e.saving) return;
    e.msg = ''; keep();
    if (!P.fnOK()) { e.msg = 'Not saved: you are not ticked for Functions any more. Your changes are kept on this device.'; draw(); return; }
    var next = kind === 'confirm' ? 'confirmed' : kind === 'cancel' ? 'cancelled' : e.status;
    var probs = check({ d: e.d, status: next });
    var contactBad = contactProblems(e.d);
    if ((next === 'confirmed' && probs.length) || contactBad.length) { e.shown = next === 'confirmed' ? probs : contactBad; e.review = false; draw(); goto(e.shown[0].k); return; }
    var api = B(), id = e.id, me = api.who();
    e.saving = 'Saving...'; e.shown = []; draw();
    var slow = setTimeout(function () { if (E.ed === e && e.saving) { e.saving = 'Waiting for the signal. Your changes are kept on this device.'; draw(); } }, 5000);
    api.ready().then(function () {
      var fs = api.fs();
      return (api.fromServer ? api.fromServer(api.docRef('functions', id)) : fs.getDocFromServer(api.docRef('functions', id))).then(function (sn) { return sn.exists() ? Object.assign({ id: id }, sn.data()) : null; }, function () { return 'offline'; });
    }).then(function (server) {
      var sv = server === 'offline' ? e.v : (server ? server.v : 0);
      if (server !== 'offline' && sv !== e.v) {
        clearTimeout(slow); e.saving = '';
        e.conflict = { v: sv, who: server ? FN.nameOf(server.by) : '', when: server && server.upd, doc: server };
        draw(); return null;
      }
      var prev = server === 'offline' ? e.saved : server, t = now();
      var f = toDoc({ d: e.d, status: next });
      f.v = sv + 1; f.upd = t;
      f.cBy = prev ? prev.cBy || '' : me; f.cAt = prev ? prev.cAt || 0 : t;
      if (prev && prev.confAt) { f.confBy = prev.confBy || ''; f.confAt = prev.confAt; }
      if (next === 'confirmed' && !(prev && prev.status === 'confirmed')) { f.confBy = me; f.confAt = t; }
      if (next === 'cancelled') { f.canBy = me; f.canAt = t; }
      // the kitchen comment keeps its own author: only a change to it says who and when
      if (prev && (prev.kc || '') === f.kc) { f.kcBy = prev.kcBy || ''; f.kcAt = prev.kcAt || 0; } else { f.kcBy = f.kc ? me : ''; f.kcAt = f.kc ? t : 0; if (!f.kc) f.kcBy = me; }
      // a confirmed function moved to another time: the kitchen gets a notice in the old window, and counts it once
      f.was = {};
      if (prev && prev.status === 'confirmed' && next === 'confirmed' && (prev.from !== f.from || prev.until !== f.until) && prev.date !== f.date) f.was = { date: prev.date, start: prev.start, first: prev.first, from: prev.from, until: prev.until };
      else if (prev && prev.was && prev.was.until && next === 'confirmed' && prev.date !== prev.was.date) f.was = prev.was;
      M.derive(f);
      // the order day: kept while the date stays, worked out again when it moves. A function confirmed before ordering
      // came in (no od) and not moved gets none, so nothing old is ordered twice.
      if (f.status === 'confirmed' && M.isYmd(f.date)) f.od = prev && prev.status === 'confirmed' && prev.date === f.date ? (prev.od || '') : M.orderOn(f.date, today());
      else f.od = '';
      var what = M.changes(prev && prev.status ? prev : null, f).join('; ').slice(0, 300);
      f.chg = (prev && prev.chg || []).slice(0, 7);
      if (what && (f.status !== 'draft' || (prev && prev.status !== 'draft'))) f.chg.unshift({ at: t, by: me, what: what });
      var ops = [['set', api.docRef('functions', id), f]];
      if (prev && prev.v) {
        var was = clone(prev); delete was.id;
        ops.push(['set', api.fs().doc(api.db(), 'kitchens', api.pin(), 'functions', id, 'hist', String(prev.v)), { was: was, at: t, what: what }]);
      }
      // the contact is written only when it changed (22 Oct 2026, review S9), so a phone that could not read it never
      // saves blanks over it
      var con = { cname: e.d.cname.trim().slice(0, 80), phone: e.d.phone.trim().slice(0, 30), email: e.d.email.trim().slice(0, 120) }, conWas = e.savedC || {};
      if (con.cname !== (conWas.cname || '') || con.phone !== (conWas.phone || '') || con.email !== (conWas.email || '')) ops.push(['set', api.docRef('fncontact', id), Object.assign(con, { upd: t })]);
      return api.W(ops.concat(prepOps(api, prev, f, id, t), orderOps(api, prev, f, id, t))).then(function () { return f; });
    }).then(function (f) {
      clearTimeout(slow);
      if (!f) return;
      f.id = id; if (me) f.by = me;
      var wasNew = e.isNew;
      forget(e);
      e.isNew = false; e.v = f.v; e.status = f.status; e.saved = f; e.savedC = { cname: e.d.cname.trim(), phone: e.d.phone.trim(), email: e.d.email.trim() }; e.d = fromDoc(f, e.savedC);
      e.saving = ''; e.conflict = null; e.review = false; e.restored = false; e.hist = null;
      if (Array.isArray(E.list)) { E.list = E.list.filter(function (x) { return x.id !== id; }).concat([f]); }
      toast(kind === 'confirm' ? 'Confirmed. The kitchen sees it on the day.' : kind === 'cancel' ? 'Cancelled. The kitchen is told.' : f.status === 'confirmed' ? 'Saved. The kitchen sees the change now.' : 'Draft saved. The kitchen does not see it yet.');
      if (wasNew) { history.replaceState(history.state, '', '#/functions/' + encodeURIComponent(id)); if (window.LK_APP && window.LK_APP.noteRoute) window.LK_APP.noteRoute(true); E.sub = [id]; }
      if (E.ed === e) { draw(); var h = E.root && E.root.querySelector('#rtitle'); if (h) h.focus({ preventScroll: true }); window.scrollTo(0, 0); }
    }).catch(function (err) {
      clearTimeout(slow); e.saving = '';
      var code = err && err.code;
      e.msg = code === 'permission-denied' ? 'Not saved: the book refused it. You may not be ticked for Functions any more, or someone saved it just now. Your changes are kept on this device.' : 'Not saved. Check the signal and try again. Your changes are kept on this device.';
      if (E.ed === e) draw();
    });
  }
  /* The platters on the prep list (22 Oct 2026): a confirmed function puts one prep line per platter on its day, under the
     section Functions, linked to the recipe card: "Pizza Platter: Smith 50th, from 18:30", "5 platters". The line id is
     fn-<function>-<platter>, so a second save changes the same line instead of adding another. Only a line that is new or
     changed is written, so a line the kitchen removed stays removed until the booking changes. A cancelled function, a
     platter taken off, or a function moved to another day removes its old lines. Ticks are never touched (done is never
     sent), lines never roll over and never merge with the kitchen's own lines (fn, dupOk). */
  function prepText(f, l) {
    var n = (f.rounds || []).length, a = M.counts(l, n), i = a.findIndex(function (x) { return x > 0; }), r = i >= 0 ? f.rounds[i] : f.rounds[0];
    var at = r && r.at ? (f.mode === 'stag' ? 'from ' : 'at ') + M.when(r.at, f.date) : 'times TBC';
    return (l.name + ': ' + (f.name || 'function') + ', ' + at).slice(0, 160);
  }
  function prepOps(api, prev, f, id, t) {
    var fs = api.fs(), ops = [], who = P.whoName() || 'Head chef';
    function ref(day, rid) { return fs.doc(api.db(), 'kitchens', api.pin(), 'days', day, 'items', ('fn-' + id + '-' + rid).slice(0, 120)); }
    function line(g, l) { return { text: prepText(g, l), qty: (l.qty + ' ' + M.unitOf(l, l.qty)).slice(0, 40), station: 'Functions', recipe: l.rid, fn: id, dupOk: true }; }
    var had = {}, want = {};
    if (prev && prev.status === 'confirmed' && M.isYmd(prev.date)) (prev.lines || []).forEach(function (l) { had[prev.date + '|' + l.rid] = line(prev, l); });
    if (f.status === 'confirmed' && M.isYmd(f.date)) f.lines.forEach(function (l) { want[f.date + '|' + l.rid] = line(f, l); });
    Object.keys(had).forEach(function (k) {
      if (want[k]) return;
      var p = k.split('|');
      ops.push(['set', ref(p[0], p[1]), Object.assign({}, had[k], { deleted: true, deletedBy: who, deletedAt: t }), true]);
    });
    Object.keys(want).forEach(function (k) {
      var w = want[k], h = had[k], p = k.split('|');
      if (h && h.text === w.text && h.qty === w.qty) return;   // the same as before: leave the kitchen's line alone
      ops.push(['set', ref(p[0], p[1]), Object.assign({}, w, { deleted: false, addedBy: who, addedById: api.who(), addedAt: t }), true]);
    });
    return ops;
  }
  /* The order reminder (22 Oct 2026): a confirmed function puts one line on the order list on its order day (the latest
     Sunday 4 days or more before it, or today when booked later): "Function stock: Smith 50th, Sat 31 Oct: 3 Antipasto,
     4 Aussie, 5 Pizza", "12 platters". It rolls over until someone ticks it ordered, like any order line, and ordered is
     never sent from here. A change before the order day changes the line; a move takes it off the old day; a change or a
     cancel after the order day adds a line today, so whoever ordered can change the order. */
  function orderOps(api, prev, f, id, t) {
    var fs = api.fs(), ops = [], who = P.whoName() || 'Head chef', day = today();
    function ref(d, suffix) { return fs.doc(api.db(), 'kitchens', api.pin(), 'orders', d, 'lines', ('fn-' + id + (suffix || '')).slice(0, 120)); }
    function line(g, pre) {
      var txt = (pre || 'Function stock') + ': ' + (g.name || 'function') + ', ' + M.dayName(g.date) + ': ' + (g.lines || []).map(function (l) { return l.qty + ' ' + M.short(l.name); }).join(', ');
      return { text: txt.slice(0, 120), qty: (M.totalQty(g) + ' platters').slice(0, 40), recipes: (g.lines || []).map(function (l) { return l.rid; }), fn: id, dupOk: true };
    }
    var had = prev && prev.status === 'confirmed' && prev.od ? { day: prev.od, l: line(prev) } : null;
    var want = f.od ? { day: f.od, l: line(f) } : null;
    if (had && (!want || want.day !== had.day) && had.day >= day) ops.push(['set', ref(had.day), Object.assign({}, had.l, { deleted: true, deletedBy: who, deletedAt: t }), true]);
    if (want && !(had && had.day === want.day && had.l.text === want.l.text && had.l.qty === want.l.qty)) {
      var late = had && had.day < day;   // the first line is already in the past (maybe ordered): a new line today says what changed
      ops.push(['set', late ? ref(day, '-' + day.replace(/-/g, '')) : ref(want.day), Object.assign({}, late ? line(f, 'Function stock changed') : want.l, { deleted: false, addedBy: who, addedById: api.who(), addedAt: t }), true]);
    }
    if (had && !want && had.day < day && prev.date >= day) ops.push(['set', ref(day, '-x' + day.replace(/-/g, '')), Object.assign({}, line(prev, 'Function cancelled, check the order'), { deleted: false, addedBy: who, addedById: api.who(), addedAt: t }), true]);
    return ops;
  }
  function goto(k) {
    var el = E.root && (E.root.querySelector('[data-ff="' + k + '"]') || E.root.querySelector('#fe-e-' + k));
    if (!el && /^alloc\d+$/.test(k)) el = E.root.querySelector('[data-ff^="a' + k.slice(5) + '_"]');
    if (!el && /^round\d+$/.test(k)) el = E.root.querySelector('[data-ff="rt' + k.slice(5) + '"]');
    if (!el && (k === 'lines' || k === 'rounds')) el = E.root.querySelector(k === 'lines' ? '#fe-pq' : '[data-fe="mode"]');
    if (!el) return;
    el.scrollIntoView({ block: 'center' }); if (el.focus) el.focus({ preventScroll: true });
  }

  /* ---------- drawing and events ---------- */
  function draw() {
    if (!E.root || E.drawing) return;
    E.drawing = true;
    try { drawNow(); } finally { E.drawing = false; }
  }
  function drawNow() {
    var a = document.activeElement, k = a && E.root.contains(a) && a.getAttribute('data-ff'), ss = k && a.selectionStart, se = k && a.selectionEnd;
    var html = E.sub.length ? (E.ed ? editHTML() : '') : listHTML();
    E.root.innerHTML = '<div class="fe-wrap">' + html + '</div>';
    if (k) { var el = E.root.querySelector('[data-ff="' + k + '"]'); if (el) { el.focus({ preventScroll: true }); try { if (ss != null) el.setSelectionRange(ss, se); } catch (x) {} } }
  }
  function live() { var el = E.root && E.root.querySelector('#fe-live'); if (el && E.ed && E.ed.d) el.innerHTML = liveHTML(E.ed); }
  function setField(k, v, structural, quiet) {
    if (k === 'q') { E.q = v; draw(); return; }
    var e = E.ed; if (!e || !e.d) return;
    var d = e.d, m;
    if (k === 'pq') { e.pq = v; draw(); return; }
    if (k === 'startT' || k === 'foodT' || /^rt\d+$/.test(k)) v = normT(v);
    if (k === 'date') { moveDate(e, v); if (!d.foodSet) retime(e); else if (d.mode === 'stag') realloc(e); }
    else if (k === 'startT') { d.startT = v; if (!d.foodSet) retime(e); }
    else if (k === 'foodDate' || k === 'foodT') { d[k] = v; d.foodSet = true; retime(e); }
    else if (k === 'n' || k === 'gap') { d[k] = v; if (structural) retime(e); }
    else if ((m = /^qty(\d+)$/.exec(k))) { d.lines[+m[1]].qty = v; if (structural || d.mode === 'all') { if (d.mode === 'all') retime(e); else realloc(e); } }
    else if ((m = /^a(\d+)_(\d+)$/.exec(k))) { d.lines[+m[1]].a[+m[2]] = v; d.custom = true; }
    else if ((m = /^rt(\d+)$/.exec(k))) { d.rounds[+m[1]].t = v; if (+m[1] === 0) { d.foodT = v; d.foodSet = true; } }
    else if ((m = /^rn(\d+)$/.exec(k))) { d.rounds[+m[1]].note = v; }
    else if (k === 'st') { d.st = !!v; if (v) d.startT = ''; retime(e); }
    else if (k === 'gu') { d.gu = !!v; if (v) d.guests = ''; }
    else if (k in d) d[k] = v;
    if (e.shown && e.shown.length) e.shown = check({ d: d, status: 'confirmed' }).filter(function (p) { return e.shown.some(function (s) { return s.k === p.k; }); });
    keep();
    if (!quiet) { if (structural) draw(); else live(); }
  }
  function onInput(ev) {
    if (!E.root || !E.root.contains(ev.target)) return;
    var k = ev.target.getAttribute('data-ff'); if (!k) return;
    // a box that loses focus while the page redraws sends its change late: take it once the redraw is done
    if (ev.target.type === 'checkbox') { if (ev.type === 'change') setField(k, ev.target.checked, true); return; }
    if (E.drawing) { var v = ev.target.value; setTimeout(function () { setField(k, v, true); }, 0); return; }
    // what changes the page's shape waits for the change event (so typing "12" does not redraw at "1")
    var shape = /^(date|startT|foodDate|foodT|n|gap|qty\d+|a\d+_\d+|rt\d+)$/.test(k);
    if (ev.type === 'input' && shape) { if (/^(a\d+_\d+|qty\d+)$/.test(k)) { setField(k, ev.target.value, false); } else E.pending[k] = ev.target.value; return; }
    delete E.pending[k];
    setField(k, ev.target.value, ev.type === 'change' && shape);
  }
  // Browser Back can leave a date or time box before its change event. Keep that last entry too.
  function flushPending() {
    var pending = E.pending; E.pending = {};
    Object.keys(pending).forEach(function (k) { setField(k, pending[k], true, true); });
  }
  document.addEventListener('input', onInput);
  document.addEventListener('change', onInput);
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest && ev.target.closest('[data-fe]');
    if (!el || !E.root || !E.root.contains(el)) return;
    var a = el.getAttribute('data-fe'), v = el.getAttribute('data-v'), i = +el.getAttribute('data-i'), e = E.ed;
    if (a === 'chip') { E.chip = v; draw(); return; }
    if (a === 'reload') { loadList(); return; }
    if (a === 'reopen') { openId(e.id); return; }
    if (!e || !e.d) return;
    var d = e.d;
    if (a === 'addline') {
      var c = FN.catalogue().filter(function (x) { return x.rid === v; })[0]; if (!c || d.lines.length >= M.MAX_LINES) return;
      d.lines.push({ rid: c.rid, name: c.name, unit: c.unit, spec: c.spec, fp: c.fp, qty: '1', a: [] }); e.pq = '';
      retime(e); keep(); draw(); var q = E.root.querySelector('[data-ff="qty' + (d.lines.length - 1) + '"]'); if (q) { q.focus(); q.select(); } return;
    }
    if (a === 'rmline') { if (!arm('rm' + i)) return; d.lines.splice(i, 1); keep(); draw(); return; }
    if (a === 'mode') { d.mode = v; if (v === 'stag' && int(d.n) < 2) d.n = '3'; d.custom = false; retime(e); keep(); draw(); return; }
    if (a === 'even') { d.custom = false; realloc(e); keep(); draw(); return; }
    if (a === 'rmround') { d.rounds.splice(i, 1); d.lines.forEach(function (l) { l.a.splice(i, 1); }); d.n = String(d.rounds.length); d.custom = true; if (d.rounds.length < 2) { d.mode = 'all'; retime(e); } keep(); draw(); return; }
    if (a === 'goto') { goto(v); return; }
    if (a === 'save') { save('save'); return; }
    if (a === 'review') {
      var probs = check({ d: d, status: 'confirmed' });
      if (probs.length) { e.shown = probs; draw(); goto(probs[0].k); return; }
      e.review = true; e.shown = []; draw(); var h = E.root.querySelector('#fe-rv-h'); if (h) { h.focus({ preventScroll: true }); h.scrollIntoView({ block: 'start' }); } return;
    }
    if (a === 'review-x') { e.review = false; draw(); return; }
    if (a === 'confirm') { save('confirm'); return; }
    if (a === 'cancel') { if (!arm('cancel')) return; save('cancel'); return; }
    if (a === 'dup') { var src = clone(d); history.pushState(null, '', '#/functions/new'); if (window.LK_APP && window.LK_APP.noteRoute) window.LK_APP.noteRoute(false); E.sub = ['new']; openNew(src); return; }
    if (a === 'drop') { if (!arm('drop')) return; forget(e); if (e.isNew) { E.ed = null; location.hash = '#/functions'; return; } e.d = fromDoc(e.saved, e.savedC); e.status = e.saved.status; e.restored = false; e.shown = []; draw(); return; }
    if (a === 'theirs') { forget(e); E.ed = null; openId(e.id); return; }
    if (a === 'mine') { e.v = e.conflict.v; e.saved = e.conflict.doc; e.conflict = null; save(e.status === 'confirmed' ? 'save' : 'save'); return; }
    if (a === 'hist') { loadHist(); return; }
  });
  function focusF(k) { var el = E.root && E.root.querySelector('[data-ff="' + k + '"]'); if (el) el.focus({ preventScroll: true }); }
  window.addEventListener('beforeunload', function (ev) { flushPending(); if (dirty()) { ev.preventDefault(); ev.returnValue = ''; } });

  function mount(root, route) {
    var sub = route.sub || [], same = E.root === root && JSON.stringify(sub) === JSON.stringify(E.sub);
    if (!same) flushPending();
    E.root = root;
    if (same && (E.ed || !sub.length)) { draw(); return; }
    E.sub = sub;
    if (!sub.length) { E.ed = null; loadList(); return; }
    if (!Array.isArray(E.list)) loadList();
    if (sub[0] === 'new') openNew(); else openId(sub[0]);
  }
  function unmount() { flushPending(); E.root = null; E.sub = []; E.ed = null; }
  window.LK_FE = {
    api: API, mount: mount, unmount: unmount, dirty: function () { return !!E.root && dirty(); },
    hasDraft: function () { return Object.keys(localStorage || {}).some(function (k) { return k.indexOf('lk.fe.draft.') === 0; }); },
    // the kitchen's functions changed (another manager saved): the list follows; an open form keeps what is typed
    changed: function () { if (E.root && !E.sub.length) loadList(); }
  };
})();
