/* Delivery temperatures. Loaded only on #/deliveries. One live query for today's receipts while this page is open;
   a past date costs one query on selection or Refresh. No polling, history scan or persistent private cache. */
(function () {
  'use strict';
  var P = window.LK_PREP, T = window.LK_TIME, esc = window.LK_APP.esc, B = P.book();
  var generation = 0, stop = null, watchKey = '', context = '', recorder = '', timer = null;
  var M = blank();
  // Optional in lazy files: an older saved shell keeps its existing text feedback.
  function inkLabel(text, icon, state) { return window.LK_MOTION ? window.LK_MOTION.label(text, icon || 'save', state || (navigator.onLine === false ? 'still' : 'busy')) : esc(text); }
  function loading(text, icon, rows) { return window.LK_MOTION ? window.LK_MOTION.status(text, { icon: icon, state: navigator.onLine === false ? 'still' : 'busy', rows: rows || 0 }) : '<p class="hint" role="status">' + esc(text) + '</p>'; }
  // What came in? (3 Nov 2026, head chef chose design A): Chilled, Frozen or Both. It starts on Chilled every time and
  // lives in this form's memory only. A box that is not showing saves null, exactly like an empty box before.
  var MODES = [['chilled', 'Chilled'], ['frozen', 'Frozen'], ['both', 'Both']];
  function form() { var day = T.day(), time = T.clock(); return { day: day, time: time, initial: day + '|' + time, supplier: '', chilled: '', frozen: '', note: '', mode: 'chilled' }; }
  function blank() { return { root: null, form: form(), day: T.day(), followToday: true, rows: [], state: 'idle', error: '', invalid: [], message: '', busy: false, attempt: null, suspended: false, showTime: false, showNote: false, cache: Object.create(null) }; }
  function shows(name) { return M.form.mode === 'both' || M.form.mode === name; }
  function modeName(m) { return (MODES.filter(function (x) { return x[0] === m; })[0] || MODES[0])[1]; }
  function allowed() { return P.privateAccess(); }
  function admin() { return allowed() && P.ownerHere() && P.state.level === 'owner'; }
  function identity() { return B.identity ? B.identity() : [B.pin(), P.state.uid || '', P.state.who || B.who() || 'owner'].join('|'); }
  function key() { return allowed() ? identity() + '|' + (admin() ? 'admin' : 'person') : ''; }
  // A privacy lock keeps the original person's work in memory. Permission changes still stop reads and writes.
  function dirty() { return !!M.attempt || M.busy || !!(M.form.supplier.trim() || M.form.chilled.trim() || M.form.frozen.trim() || M.form.note.trim() || M.form.day + '|' + M.form.time !== M.form.initial); }
  function retainedLock() { var lock = B.workLock && B.workLock(); return !!(recorder && lock && lock.identity === recorder); }
  // the book's one two-tap helper (js/prep.js arm()), drawing this page again; an older book acts on the first tap
  function arm(k) { return B.arm ? B.arm(k, draw) : true; }
  function armed(k) { return !!(B.armed && B.armed(k)); }
  function unwatch() { if (stop) stop(); stop = null; watchKey = ''; }
  function reset() { var root = M.root; generation++; unwatch(); clearTimeout(timer); context = recorder = ''; M = blank(); M.root = root; }
  function clearReads() { generation++; unwatch(); clearTimeout(timer); M.rows = []; M.cache = Object.create(null); M.state = 'idle'; }
  function access() {
    if (!allowed()) {
      if (retainedLock()) { if (!M.suspended) clearReads(); M.suspended = true; context = ''; }
      else reset();
      return false;
    }
    var id = identity();
    if (recorder && recorder !== id) reset();
    recorder = id;
    var next = key();
    if (M.suspended || context && context !== next) clearReads();
    M.suspended = false; context = next;
    return true;
  }
  function unmount() { M.root = null; unwatch(); clearTimeout(timer); timer = null; }
  function validDay(day) { return /^\d{4}-\d{2}-\d{2}$/.test(day) && T.day(T.at(day)) === day; }
  function temp(text) {
    var s = String(text).trim().replace(',', '.');
    if (!s) return null;
    return /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(s) && isFinite(+s) && +s >= -100 && +s <= 100 ? +s : NaN;
  }
  function validation() {
    var d = M.form, c = shows('chilled') ? temp(d.chilled) : null, f = shows('frozen') ? temp(d.frozen) : null;
    function problem(fields, message) { return { fields: fields, message: message }; }
    if (!d.supplier.trim() || d.supplier.trim().length > 80) return problem(['supplier'], 'Enter the supplier name (up to 80 characters).');
    if (!validDay(d.day) || d.day > T.day() || !admin() && d.day !== T.day()) return problem(['day'], 'Use today\'s date. Admin can record earlier deliveries.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time)) return problem(['time'], 'Enter the delivery time in 24-hour format.');
    if (receivedAt(d) > T.now() + 60000) return problem(['time'], 'The delivery time cannot be in the future.');
    if (d.mode === 'both' && (c === null || f === null)) return problem([c === null ? 'chilled' : 'frozen'], 'Enter both readings, or pick Chilled or Frozen.');
    if (c === null && f === null) return problem([d.mode === 'frozen' ? 'frozen' : 'chilled'], 'Enter the ' + (d.mode === 'frozen' ? 'frozen' : 'chilled') + ' reading.');
    if (isNaN(c) || isNaN(f)) return problem([isNaN(c) ? 'chilled' : 'frozen'], 'Enter a temperature from -100 to 100 °C. Negative and decimal readings are accepted.');
    if (d.note.trim().length > 300) return problem(['note'], 'Keep the items / notes to 300 characters.');
    return null;
  }
  function receivedAt(d) { var p = d.time.split(':'); return T.at(d.day, +p[0] * 60 + +p[1]); }
  function errorAttrs(name, help) {
    var invalid = M.invalid.indexOf(name) >= 0, described = (help || '') + (invalid ? (help ? ' ' : '') + 'dl-save-note' : '');
    return (invalid ? ' aria-invalid="true"' : '') + (described ? ' aria-describedby="' + described + '"' : '');
  }
  function field(name, label, type, extra, help) {
    return '<label class="dl-field" for="dl-' + name + '"><span class="label">' + label + '</span><input id="dl-' + name + '" data-dl-field="' + name + '" type="' + type + '" value="' + esc(M.form[name]) + '"' + (extra || '') + errorAttrs(name, help) + '></label>';
  }
  /* A temperature box with its own − key (3 Nov 2026): both boxes use the number pad, which has no minus sign on an
     iPhone. The key adds or takes away the leading minus in the box, so what is typed stays the one truth and a
     keyboard can still type it. It never starts pressed. */
  function tempField(name, label) {
    var v = M.form[name], neg = /^\s*-/.test(v);
    return '<label class="dl-field" for="dl-' + name + '"' + (shows(name) ? '' : ' hidden') + '><span class="label">' + label + '</span><span class="dl-temp">' +
      '<button type="button" class="dl-sign" data-dl="sign" data-for="' + name + '" aria-pressed="' + neg + '" aria-label="Below zero (' + label.replace(/ \(°C\)$/, '').toLowerCase() + ')">−</button>' +
      '<input id="dl-' + name + '" data-dl-field="' + name + '" type="text" inputmode="decimal" maxlength="8" placeholder="' + (name === 'frozen' ? 'e.g. 18, tap − first' : 'e.g. 3.5') + '" value="' + esc(v) + '"' + errorAttrs(name, 'dl-temp-help') + '>' +
      '<span class="dl-unit" aria-hidden="true">°C</span></span></label>';
  }
  // A frozen reading above zero says its sign plainly: a typing guard for a missed − key, not an acceptance limit.
  function signNote() { var f = temp(M.form.frozen); return shows('frozen') && typeof f === 'number' && f > 0 ? 'Reads as +' + f + ' °C. Tap − if it is below zero.' : ''; }
  // A reading typed into a box that is not showing is kept here but not saved; say so rather than drop it quietly.
  function hiddenNote() {
    var d = M.form, out = [];
    ['chilled', 'frozen'].forEach(function (n) { if (!shows(n) && d[n].trim()) out.push('The ' + n + ' reading (' + d[n].trim() + ' °C) is not saved with ' + modeName(d.mode) + '. Pick Both to keep it.'); });
    return out.join(' ');
  }
  /* Suppliers due today by the order cut-offs (config/main, already on the phone: no new read). A Functions-only login
     cannot read config/main, so it gets the plain box. A chip fills the box with the exact name, so the receipts match. */
  function due(day) {
    var list = []; try { list = B.cuts ? B.cuts() || [] : []; } catch (e) { list = []; }
    var dow = T.dow(T.at(validDay(day) ? day : T.day())), seen = Object.create(null);
    return list.filter(function (s) { return s && typeof s.name === 'string' && s.name.trim() && Array.isArray(s.dd) && s.dd.indexOf(dow) >= 0; })
      .map(function (s) { return s.name.trim(); }).filter(function (n) { var k = n.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; });
  }
  function same(a, b) { return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase(); }
  function whenText(d) { return validDay(d.day) && d.day !== T.day() ? (B.dayShort ? B.dayShort(T.at(d.day)) : d.day) + ', ' + d.time : d.time + ' today'; }
  function row(r) {
    return '<li class="dl-receipt"><div class="dl-receipt-head"><b>' + esc(r.supplier) + '</b><time>' + esc(T.clock(r.receivedAt)) + '</time></div>' +
      '<dl class="dl-readings">' + (typeof r.chilled === 'number' ? '<div><dt>Chilled</dt><dd>' + esc(r.chilled) + ' °C</dd></div>' : '') +
      (typeof r.frozen === 'number' ? '<div><dt>Frozen</dt><dd>' + esc(r.frozen) + ' °C</dd></div>' : '') + '</dl>' +
      (r.note ? '<p class="dl-note">' + esc(r.note) + '</p>' : '') + '<p class="hint">Received by ' + esc(r.receivedBy) +
      (r.pending ? ' · Waiting for connection' : '') + '</p></li>';
  }
  function draw() {
    if (!M.root || !document.body.contains(M.root)) return;
    if (!allowed()) { M.root.innerHTML = ''; return; }
    // a box keeps its focus and caret; a button too (29 Oct 2026: after the first Enter on Clear form the focus went to
    // the page, so a keyboard never reached "Tap again to clear")
    var d = M.form, old = document.activeElement, focus = old && old.getAttribute('data-dl-field'), btn = !focus && old && M.root.contains(old) && old.getAttribute('data-dl');
    // the button's own choice too (a supplier chip, a What came in? choice, a − key), so focus returns to the same one
    var btnKey = btn && (old.getAttribute('data-name') || old.getAttribute('data-mode') || old.getAttribute('data-for') || '');
    var pos = focus && typeof old.selectionStart === 'number' ? [old.selectionStart, old.selectionEnd] : null;
    var off = M.busy || M.attempt, dueNow = due(d.day), today = M.day === T.day();
    var dueTodayNames = today ? due(T.day()) : [];
    var waiting = today && M.state === 'ok' ? dueTodayNames.filter(function (n) { return !M.rows.some(function (r) { return same(r.supplier, n); }); }) : [];
    var timeOpen = M.showTime || M.invalid.indexOf('day') >= 0 || M.invalid.indexOf('time') >= 0, noteOpen = M.showNote || !!d.note.trim() || M.invalid.indexOf('note') >= 0;
    M.root.innerHTML = '<div class="dl-page"><header class="dl-heading"><span class="eyebrow">Kitchen records</span><h1>Delivery received</h1><p class="hint">Record the measured food temperature on arrival. All times are Queensland time (AEST).</p></header>' +
      '<form id="dl-form" class="dl-form" novalidate><fieldset' + (off ? ' disabled' : '') + '><legend class="sr-only">Delivery details</legend>' +
      '<div class="dl-when-line"><span><span class="visually-hidden">Receiving as </span><b>' + esc(P.whoName() || 'Admin') + '</b> · ' + esc(whenText(d)) + '</span>' +
      '<button type="button" class="p-x" data-dl="time" aria-expanded="' + timeOpen + '" aria-controls="dl-when">' + (timeOpen ? 'Hide time' : 'Change time') + '</button></div>' +
      '<div id="dl-when" class="dl-pair"' + (timeOpen ? '' : ' hidden') + '>' + field('day', 'Date', 'date', ' max="' + T.day() + '"' + (!admin() ? ' min="' + T.day() + '" readonly' : '') + ' required') + field('time', 'Time', 'time', ' step="60" required') + '</div>' +
      field('supplier', 'Supplier', 'text', ' maxlength="80" autocomplete="organization" required') +
      (dueNow.length ? '<div class="chips dl-due-pick" role="group" aria-labelledby="dl-due-l"><span class="hint" id="dl-due-l">Due ' + (d.day === T.day() ? 'today' : 'that day') + ':</span>' +
        dueNow.map(function (n) { return '<button type="button" class="chip" data-dl="sup" data-name="' + esc(n) + '" aria-pressed="' + same(d.supplier, n) + '">' + esc(n) + '</button>'; }).join('') + '</div>' : '') +
      '<div class="dl-what"><span class="label" id="dl-what-l">What came in?</span><div class="seg" role="radiogroup" aria-labelledby="dl-what-l">' +
        MODES.map(function (m) { var on = d.mode === m[0]; return '<button type="button" class="seg-b" role="radio" data-dl="mode" data-mode="' + m[0] + '" aria-checked="' + on + '" tabindex="' + (on ? 0 : -1) + '">' + m[1] + '</button>'; }).join('') + '</div>' +
        '<p id="dl-temp-help" class="hint">Use Both for a mixed delivery.</p></div>' +
      '<div class="dl-pair dl-temps' + (d.mode === 'both' ? '' : ' one') + '">' + tempField('chilled', 'Chilled (°C)') + tempField('frozen', 'Frozen (°C)') + '</div>' +
      '<p id="dl-sign-note" class="hint dl-sign-note" aria-live="polite">' + esc(signNote()) + '</p>' +
      (hiddenNote() ? '<p class="hint dl-hidden-note">' + esc(hiddenNote()) + '</p>' : '') +
      (noteOpen ? '<label class="dl-field" for="dl-note"><span class="label">Items / notes <span class="hint">(optional)</span></span><textarea id="dl-note" data-dl-field="note" maxlength="300" rows="2" placeholder="Items checked, condition or action taken"' + errorAttrs('note') + '>' + esc(d.note) + '</textarea></label>' :
        '<div><button type="button" class="p-x dl-add-note" data-dl="note" aria-expanded="false" aria-controls="dl-note">Add items or notes (optional)</button></div>') +
      '</fieldset>' +
      '<p id="dl-save-note" class="' + (M.error ? 'dl-error' : 'dl-message') + '" role="' + (M.error ? 'alert' : 'status') + '">' + (M.error ? esc(M.error) : M.busy ? 'Saving...' : M.message ? inkLabel(M.message, 'save', 'done') : '') + '</p>' +
      '<div class="btn-row dl-actions"><button class="btn dark ink-busy-button" type="submit" data-dl="save"' + (M.busy ? ' disabled aria-busy="true"' : '') + '>' + (M.busy ? inkLabel('Saving...') : M.attempt ? 'Check and retry save' : 'Save delivery') + '</button>' +
      (!M.attempt ? '<button class="btn" type="button" data-dl="clear"' + (M.busy ? ' disabled' : '') + '>' + (armed('dl-clear') ? 'Tap again to clear' : 'Clear form') + '</button>' : '') + '</div>' +
      '<p class="hint">Saved readings are kept as recorded.</p></form>' +
      '<section class="dl-history" aria-labelledby="dl-records"><div class="dl-history-head"><h2 id="dl-records">' + (today ? 'Today\'s deliveries' : 'Delivery records') + '</h2><button class="btn" type="button" data-dl="refresh">Refresh</button></div>' +
      (admin() ? '<label class="dl-field dl-filter" for="dl-view-day"><span class="label">View date</span><input type="date" id="dl-view-day" value="' + esc(M.day) + '" max="' + T.day() + '"></label>' : '') +
      '<p class="hint">' + esc(M.day) + '</p>' + (M.state === 'error' ? '<p class="dl-error" role="alert">Could not read delivery records. Check the connection and tap Refresh.</p>' :
        // no signal, not loaded yet: the note, then only this phone's receipts still waiting to send
        M.state === 'offline' ? '<p class="dl-error" role="status">No signal. Today\'s deliveries show when the phone is back online.</p>' + (M.rows.length ? '<ol class="dl-receipts">' + M.rows.map(row).join('') + '</ol>' : '') :
        M.state !== 'ok' ? loading('Loading deliveries...', 'orders', 3) :
        (M.rows.length ? '<ol class="dl-receipts">' + M.rows.map(row).join('') + '</ol>' : '<p class="hint">No deliveries recorded for this date.</p>') +
        // only once the server answered for today: a supplier due by the cut-offs with no receipt of that exact name yet
        (waiting.length ? '<p class="dl-waiting"><b>Not received yet today:</b> ' + waiting.map(esc).join(', ') + '</p>' : '')) + '</section></div>';
    if (focus) { var el = M.root.querySelector('[data-dl-field="' + focus + '"]'); if (el) { el.focus({ preventScroll: true }); if (pos) el.setSelectionRange(pos[0], pos[1]); } }
    else if (btn) {
      var bt = Array.prototype.filter.call(M.root.querySelectorAll('[data-dl="' + btn + '"]'), function (x) { return !btnKey || (x.getAttribute('data-name') || x.getAttribute('data-mode') || x.getAttribute('data-for') || '') === btnKey; })[0];
      if (bt && bt.getClientRects().length) bt.focus({ preventScroll: true });
    }
  }
  function rows(snap) {
    return snap.docs.map(function (d) { return Object.assign({}, d.data(), { id: d.id, pending: !!(d.metadata && d.metadata.hasPendingWrites) }); })
      .sort(function (a, b) { return b.receivedAt - a.receivedAt || b.recordedAt - a.recordedAt; });
  }
  function load(force) {
    if (!M.root || !allowed()) return;
    if (!admin()) M.day = T.day();
    var wk = key() + '|' + M.day;
    if (!force && watchKey === wk && M.state !== 'error') return;
    unwatch(); watchKey = wk;
    var g = ++generation, date = M.day;
    M.rows = []; M.state = 'loading'; draw();
    // Past records are immutable. Reuse a complete successful query in this sign-in only, unless Refresh is tapped.
    if (date !== T.day() && !force && M.cache[date]) { M.rows = M.cache[date]; M.state = 'ok'; draw(); return; }
    B.ready().then(function () {
      if (g !== generation || !allowed() || !M.root) return;
      var f = B.fs(), q = f.query(B.colRef('deliveries'), f.where('day', '==', date)), last = {};
      // No signal (27 Oct 2026): Today's first answer can come from the copy in memory, which holds at most this
      // phone's unsent receipts. That is not loaded yet, never "no deliveries": 'offline' until the server answers
      // (LK_PREP.book().listSnap sets last.st; an older js/prep.js without it keeps the old behaviour). Every
      // snapshot is drawn, so "Waiting for connection" goes once a receipt is sent.
      var done = function (sn) {
        if (g !== generation || !allowed() || !M.root) return;
        if (date === T.day() && B.listSnap) B.listSnap(sn, M.state, last);
        M.rows = rows(sn); M.state = last.st === 'offline' ? 'offline' : 'ok'; if (date !== T.day()) M.cache[date] = M.rows; draw();
      };
      var failed = function () { if (g !== generation) return; M.rows = []; M.state = 'error'; draw(); };
      if (date === T.day()) stop = f.onSnapshot(q, { includeMetadataChanges: true }, done, failed);
      else return f.getDocsFromServer(q).then(done, failed);
    }).catch(function () { if (g === generation) { M.state = 'error'; draw(); } });
  }
  function confirmed(attempt) {
    if (M.attempt !== attempt || recorder !== identity()) return;
    // A late acknowledgement may arrive during the PIN lock. Remember it without revealing the receipt or
    // announcing success, then finish once this same identity has a valid session again.
    attempt.acknowledged = true;
    if (!allowed()) return;
    M.attempt = null; M.busy = false; M.form = form(); M.showTime = M.showNote = false; M.error = ''; M.invalid = []; M.message = 'Delivery saved.';
    delete M.cache[attempt.data.day];
    if (M.day === attempt.data.day && M.day !== T.day()) { M.rows = [Object.assign({ id: attempt.id, pending: false }, attempt.data)].concat(M.rows.filter(function (r) { return r.id !== attempt.id; })).sort(function (a, b) { return b.receivedAt - a.receivedAt || b.recordedAt - a.recordedAt; }); M.cache[M.day] = M.rows; M.state = 'ok'; }
    draw(); B.say('Delivery saved.');
    var first = M.root && M.root.querySelector('#dl-supplier'); if (first) first.focus({ preventScroll: true });
  }
  function save() {
    if (!allowed() || M.busy) return;
    var problem = M.attempt ? null : validation();
    M.error = problem ? problem.message : ''; M.invalid = problem ? problem.fields : []; M.message = '';
    if (problem) {
      draw();
      var invalid = M.root.querySelector('[data-dl-field="' + M.invalid[0] + '"]');
      if (invalid) { invalid.focus({ preventScroll: true }); invalid.scrollIntoView({ block: 'center' }); }
      return;
    }
    var attempt = M.attempt, id = recorder, hold = M, token = {}, writeContext = B.writeContext ? B.writeContext() : null; M.saveToken = token; M.busy = true; draw();
    B.ready().then(function () {
      if (M !== hold || id !== identity() || !allowed()) throw { code: 'context' };
      if (!attempt) {
        var by = B.who() || 'owner';
        attempt = { id: B.fs().doc(B.colRef('deliveries')).id, data: { day: M.form.day, receivedAt: receivedAt(M.form), recordedAt: T.now(), supplier: M.form.supplier.trim(),
          chilled: shows('chilled') ? temp(M.form.chilled) : null, frozen: shows('frozen') ? temp(M.form.frozen) : null, note: M.form.note.trim(), receivedBy: P.whoName() || 'Admin', receivedById: by, by: by } };
        M.attempt = attempt;
      }
      var ref = B.docRef('deliveries', attempt.id);
      // Retry checks this exact id first (one server read). A lost acknowledgement never becomes a second receipt.
      return B.fromServer(ref).then(function (sn) {
        if (M !== hold || id !== identity() || !allowed()) throw { code: 'context' };
        if (sn.exists()) {
          var data = sn.data(), same = Object.keys(attempt.data).every(function (k) { return data[k] === attempt.data[k]; });
          if (!same) throw { code: 'conflict' };
          return;
        }
        return B.W([['set', ref, attempt.data]], writeContext);
      });
    }).then(function () { confirmed(attempt); }, function (e) {
      if (M !== hold || id !== identity() || attempt && M.attempt !== attempt) return;
      M.busy = false;
      if (e && (e.code === 'permission-denied' || e.code === 'conflict')) M.attempt = null;
      M.error = e && e.code === 'permission-denied' ? 'The save was refused. Your details are kept. Sign in again or ask the head chef to check delivery access.' :
        'The save could not be confirmed. Your details are kept. Reconnect and retry to check the same delivery.';
      draw();
    });
    // Firestore can hold a write while offline. Keep its exact id and payload, and handle a late acknowledgement above.
    setTimeout(function () { if (M === hold && M.saveToken === token && M.busy && id === identity()) { M.busy = false; M.error = 'Still waiting for confirmation. Your details are kept. Reconnect and retry to check the same delivery.'; draw(); } }, 10000);
  }
  function tick() {
    clearTimeout(timer);
    if (!M.root) return;
    if (!allowed()) { access(); draw(); return; }
    var current = T.day();
    if (M.followToday && M.day !== current) { M.day = current; load(); }
    // an untouched form follows the clock; the What came in? choice stays as picked
    if (!dirty() && (M.form.day !== current || M.form.time !== T.clock())) { var mode = M.form.mode; M.form = form(); M.form.mode = mode; draw(); }
    timer = setTimeout(tick, 30000);
  }
  function mount(root) {
    access(); M.root = root;
    if (M.attempt && M.attempt.acknowledged) confirmed(M.attempt);
    draw(); load(); tick();
  }
  document.addEventListener('focusin', function (e) { var field = e.target.getAttribute && e.target.getAttribute('data-dl-field'); if (M.root && M.root.contains(e.target) && ['time', 'chilled', 'frozen'].indexOf(field) >= 0 && e.target.value) e.target.select(); });
  document.addEventListener('submit', function (e) { if (M.root && M.root.contains(e.target) && e.target.id === 'dl-form') { e.preventDefault(); save(); } });
  document.addEventListener('input', function (e) {
    var field = e.target.getAttribute('data-dl-field');
    if (allowed() && M.root && M.root.contains(e.target) && field && !M.busy && !M.attempt) {
      M.form[field] = e.target.value; M.message = '';
      // Clear an identified field error only when one of its correction fields changes. Ordinary typing keeps its caret.
      if (M.invalid.indexOf(field) >= 0) { M.invalid = []; M.error = ''; draw(); }
      else if (!M.error) { var note = M.root.querySelector('#dl-save-note'); if (note) note.textContent = ''; }
      if (field === 'chilled' || field === 'frozen') {
        var key = M.root.querySelector('[data-dl="sign"][data-for="' + field + '"]'), sn = M.root.querySelector('#dl-sign-note');
        if (key) key.setAttribute('aria-pressed', /^\s*-/.test(e.target.value) ? 'true' : 'false');
        if (sn) sn.textContent = signNote();
      }
      if (field === 'supplier') Array.prototype.forEach.call(M.root.querySelectorAll('[data-dl="sup"]'), function (c) { c.setAttribute('aria-pressed', same(c.getAttribute('data-name'), e.target.value) ? 'true' : 'false'); });
    }
  });
  document.addEventListener('click', function (e) {
    if (!M.root || !M.root.contains(e.target) || !allowed()) return;
    var el = e.target.closest('[data-dl]'); if (!el) return;
    if (el.getAttribute('data-dl') === 'refresh') load(true);
    // a typed supplier, reading or note asks first (the book's two-tap helper); an untouched form clears in one tap
    if (el.getAttribute('data-dl') === 'clear' && !M.busy && !M.attempt) { if (dirty() && !arm('dl-clear')) return; M.form = form(); M.showTime = M.showNote = false; M.error = ''; M.invalid = []; M.message = ''; draw(); }
    if (M.busy || M.attempt) return;
    var act = el.getAttribute('data-dl'), d = M.form;
    // What came in? Values stay in memory when a box hides; hiddenNote() says they will not be saved
    if (act === 'mode' && d.mode !== el.getAttribute('data-mode')) {
      d.mode = el.getAttribute('data-mode'); M.message = '';
      if (M.invalid.some(function (f) { return f === 'chilled' || f === 'frozen'; })) { M.invalid = []; M.error = ''; }
      draw();
    }
    if (act === 'sup') {
      d.supplier = el.getAttribute('data-name') || ''; M.message = '';
      if (M.invalid.indexOf('supplier') >= 0) { M.invalid = []; M.error = ''; }
      draw();
    }
    if (act === 'sign') {
      var name = el.getAttribute('data-for'), v = d[name] || '';
      d[name] = /^\s*-/.test(v) ? v.replace(/^\s*-/, '') : '-' + v.replace(/^\s*\+?/, '');
      if (M.invalid.indexOf(name) >= 0) { M.invalid = []; M.error = ''; }
      M.message = ''; draw();
      // straight on to the digits: the box takes the focus with the caret at the end
      var box = M.root.querySelector('#dl-' + name); if (box) { box.focus({ preventScroll: true }); box.setSelectionRange(box.value.length, box.value.length); }
    }
    if (act === 'time') { M.showTime = !M.showTime; draw(); if (M.showTime) { var t = M.root.querySelector('#dl-time'); if (t) t.focus({ preventScroll: true }); } }
    if (act === 'note') { M.showNote = true; draw(); var n = M.root.querySelector('#dl-note'); if (n) n.focus({ preventScroll: true }); }
  });
  // What came in? is one radio group: the arrow keys move the choice, like the book's other switches
  document.addEventListener('keydown', function (e) {
    var b = e.target.closest && e.target.closest('[data-dl="mode"]');
    if (!b || !M.root || !M.root.contains(b) || !/^(ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Home|End)$/.test(e.key)) return;
    e.preventDefault();
    var all = Array.prototype.slice.call(M.root.querySelectorAll('[data-dl="mode"]')), at = all.indexOf(b);
    var next = all[e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : (at + (/^(ArrowLeft|ArrowUp)$/.test(e.key) ? -1 : 1) + all.length) % all.length];
    next.focus({ preventScroll: true }); next.click();
  });
  document.addEventListener('change', function (e) { if (M.root && M.root.contains(e.target) && e.target.id === 'dl-view-day' && admin()) { var date = e.target.value; if (!validDay(date) || date > T.day()) { draw(); return; } M.followToday = date === T.day(); M.day = date; load(); } });
  ['lk-access', 'lk-who', 'lk-admin', 'lk-cfg'].forEach(function (name) { window.addEventListener(name, function () { var open = access(); if (open && M.attempt && M.attempt.acknowledged) confirmed(M.attempt); draw(); if (open && M.root && document.body.contains(M.root)) { load(); tick(); } }); });
  window.addEventListener('lk-clock', tick);
  // Update now's second tap already said the readings may go (LK_UPDATE.letGo() in js/upkeep.js): no second question
  window.addEventListener('beforeunload', function (e) { if (dirty() && !(window.LK_UPDATE && window.LK_UPDATE.letGo && window.LK_UPDATE.letGo())) { e.preventDefault(); e.returnValue = ''; } });
  window.LK_DELIVERY = { api: 2, mount: mount, unmount: unmount, reset: reset, dirty: dirty };
})();
