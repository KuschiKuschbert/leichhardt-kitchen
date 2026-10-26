/* Delivery temperatures. Loaded only on #/deliveries. One live query for today's receipts while this page is open;
   a past date costs one query on selection or Refresh. No polling, history scan or persistent private cache. */
(function () {
  'use strict';
  var P = window.LK_PREP, T = window.LK_TIME, esc = window.LK_APP.esc, B = P.book();
  var generation = 0, stop = null, watchKey = '', context = '', timer = null;
  var M = blank();
  function form() { var day = T.day(), time = T.clock(); return { day: day, time: time, initial: day + '|' + time, supplier: '', chilled: '', frozen: '', note: '' }; }
  function blank() { return { root: null, form: form(), day: T.day(), followToday: true, rows: [], state: 'idle', error: '', message: '', busy: false, attempt: null, cache: Object.create(null) }; }
  function allowed() { return P.privateAccess(); }
  function admin() { return allowed() && P.ownerHere() && P.state.level === 'owner'; }
  function key() { return allowed() ? B.pin() + '|' + (B.who() || 'owner') + '|' + (admin() ? 'admin' : 'person') : ''; }
  function dirty() { return allowed() && (!!M.attempt || M.busy || !!(M.form.supplier.trim() || M.form.chilled.trim() || M.form.frozen.trim() || M.form.note.trim() || M.form.day + '|' + M.form.time !== M.form.initial)); }
  function unwatch() { if (stop) stop(); stop = null; watchKey = ''; }
  function reset() { var root = M.root; generation++; unwatch(); clearTimeout(timer); context = ''; M = blank(); M.root = root; }
  function unmount() { M.root = null; unwatch(); clearTimeout(timer); timer = null; }
  function validDay(day) { return /^\d{4}-\d{2}-\d{2}$/.test(day) && T.day(T.at(day)) === day; }
  function temp(text) {
    var s = String(text).trim().replace(',', '.');
    if (!s) return null;
    return /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(s) && isFinite(+s) && +s >= -100 && +s <= 100 ? +s : NaN;
  }
  function validation() {
    var d = M.form, c = temp(d.chilled), f = temp(d.frozen);
    if (!d.supplier.trim() || d.supplier.trim().length > 80) return 'Enter the supplier name (up to 80 characters).';
    if (!validDay(d.day) || d.day > T.day() || !admin() && d.day !== T.day()) return 'Use today\'s date. Admin can record earlier deliveries.';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time)) return 'Enter the delivery time in 24-hour format.';
    if (receivedAt(d) > T.now() + 60000) return 'The delivery time cannot be in the future.';
    if (c === null && f === null) return 'Enter a chiller / coldroom temperature, a freezer temperature, or both.';
    if (isNaN(c) || isNaN(f)) return 'Enter a temperature from -100 to 100 °C. Negative and decimal readings are accepted.';
    if (d.note.trim().length > 300) return 'Keep the items / notes to 300 characters.';
    return '';
  }
  function receivedAt(d) { var p = d.time.split(':'); return T.at(d.day, +p[0] * 60 + +p[1]); }
  function field(name, label, type, extra) {
    return '<label class="dl-field" for="dl-' + name + '"><span class="label">' + label + '</span><input id="dl-' + name + '" data-dl-field="' + name + '" type="' + type + '" value="' + esc(M.form[name]) + '"' + (extra || '') + '></label>';
  }
  function row(r) {
    return '<li class="dl-receipt"><div class="dl-receipt-head"><b>' + esc(r.supplier) + '</b><time>' + esc(T.clock(r.receivedAt)) + '</time></div>' +
      '<dl class="dl-readings">' + (typeof r.chilled === 'number' ? '<div><dt>Chiller / coldroom</dt><dd>' + esc(r.chilled) + ' °C</dd></div>' : '') +
      (typeof r.frozen === 'number' ? '<div><dt>Freezer</dt><dd>' + esc(r.frozen) + ' °C</dd></div>' : '') + '</dl>' +
      (r.note ? '<p class="dl-note">' + esc(r.note) + '</p>' : '') + '<p class="hint">Received by ' + esc(r.receivedBy) +
      (r.pending ? ' · Waiting for connection' : '') + '</p></li>';
  }
  function draw() {
    if (!M.root || !document.body.contains(M.root)) return;
    if (!allowed()) { M.root.innerHTML = ''; return; }
    var d = M.form, old = document.activeElement, focus = old && old.getAttribute('data-dl-field');
    var pos = focus && typeof old.selectionStart === 'number' ? [old.selectionStart, old.selectionEnd] : null;
    M.root.innerHTML = '<div class="dl-page"><header class="dl-heading"><span class="eyebrow">Kitchen records</span><h1>Delivery received</h1><p class="hint">Record the measured food temperature on arrival. All times are Queensland time (AEST).</p></header>' +
      '<form id="dl-form" class="dl-form" novalidate><fieldset' + (M.busy || M.attempt ? ' disabled' : '') + '><legend class="sr-only">Delivery details</legend>' +
      field('supplier', 'Supplier', 'text', ' maxlength="80" autocomplete="organization" required') +
      '<div class="dl-pair">' + field('day', 'Date', 'date', ' max="' + T.day() + '"' + (!admin() ? ' min="' + T.day() + '" readonly' : '') + ' required') + field('time', 'Time (24-hour)', 'text', ' inputmode="text" maxlength="5" placeholder="HH:MM" required') + '</div>' +
      '<p id="dl-temp-help" class="hint">Enter either temperature, or both for a mixed delivery. Leave an unused box empty.</p><div class="dl-pair">' +
      field('chilled', 'Chiller / coldroom (°C)', 'text', ' inputmode="decimal" maxlength="8" aria-describedby="dl-temp-help" placeholder="e.g. 3.5"') +
      field('frozen', 'Freezer (°C)', 'text', ' inputmode="text" maxlength="8" aria-describedby="dl-temp-help" placeholder="e.g. -18"') + '</div>' +
      '<label class="dl-field" for="dl-note"><span class="label">Items / notes <span class="hint">(optional)</span></span><textarea id="dl-note" data-dl-field="note" maxlength="300" rows="2" placeholder="Items checked, condition or action taken">' + esc(d.note) + '</textarea></label></fieldset>' +
      '<p class="hint">Receiving as <b>' + esc(P.whoName() || 'Admin') + '</b>. Saved readings are kept as recorded.</p>' +
      '<p id="dl-save-note" class="' + (M.error ? 'dl-error' : 'dl-message') + '" role="' + (M.error ? 'alert' : 'status') + '">' + esc(M.error || M.message) + '</p>' +
      '<div class="btn-row"><button class="btn dark" type="submit"' + (M.busy ? ' disabled' : '') + '>' + (M.busy ? 'Saving...' : M.attempt ? 'Check and retry save' : 'Save delivery') + '</button>' +
      (!M.attempt ? '<button class="btn" type="button" data-dl="clear"' + (M.busy ? ' disabled' : '') + '>Clear form</button>' : '') + '</div></form>' +
      '<section class="dl-history" aria-labelledby="dl-records"><div class="dl-history-head"><h2 id="dl-records">' + (M.day === T.day() ? 'Today\'s deliveries' : 'Delivery records') + '</h2><button class="btn" type="button" data-dl="refresh">Refresh</button></div>' +
      (admin() ? '<label class="dl-field dl-filter" for="dl-view-day"><span class="label">View date</span><input type="date" id="dl-view-day" value="' + esc(M.day) + '" max="' + T.day() + '"></label>' : '') +
      '<p class="hint">' + esc(M.day) + '</p>' + (M.state === 'error' ? '<p class="dl-error" role="alert">Could not read delivery records. Check the connection and tap Refresh.</p>' : M.state !== 'ok' ? '<p role="status">Loading deliveries...</p>' :
        M.rows.length ? '<ol class="dl-receipts">' + M.rows.map(row).join('') + '</ol>' : '<p class="hint">No deliveries recorded for this date.</p>') + '</section></div>';
    if (focus) { var el = M.root.querySelector('[data-dl-field="' + focus + '"]'); if (el) { el.focus({ preventScroll: true }); if (pos) el.setSelectionRange(pos[0], pos[1]); } }
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
      var f = B.fs(), q = f.query(B.colRef('deliveries'), f.where('day', '==', date));
      var done = function (sn) { if (g !== generation || !allowed() || !M.root) return; M.rows = rows(sn); M.state = 'ok'; if (date !== T.day()) M.cache[date] = M.rows; draw(); };
      var failed = function () { if (g !== generation) return; M.rows = []; M.state = 'error'; draw(); };
      if (date === T.day()) stop = f.onSnapshot(q, { includeMetadataChanges: true }, done, failed);
      else return f.getDocsFromServer(q).then(done, failed);
    }).catch(function () { if (g === generation) { M.state = 'error'; draw(); } });
  }
  function confirmed(attempt) {
    if (M.attempt !== attempt || context !== key() || !allowed()) return;
    M.attempt = null; M.busy = false; M.form = form(); M.error = ''; M.message = 'Delivery saved.';
    delete M.cache[attempt.data.day];
    if (M.day === attempt.data.day && M.day !== T.day()) { M.rows = [Object.assign({ id: attempt.id, pending: false }, attempt.data)].concat(M.rows.filter(function (r) { return r.id !== attempt.id; })).sort(function (a, b) { return b.receivedAt - a.receivedAt || b.recordedAt - a.recordedAt; }); M.cache[M.day] = M.rows; M.state = 'ok'; }
    draw(); B.say('Delivery saved.');
    var first = M.root && M.root.querySelector('#dl-supplier'); if (first) first.focus({ preventScroll: true });
  }
  function save() {
    if (!allowed() || M.busy) return;
    M.error = M.attempt ? '' : validation(); M.message = ''; if (M.error) { draw(); return; }
    var attempt = M.attempt, ctx = key(), token = {}; M.saveToken = token; M.busy = true; draw();
    B.ready().then(function () {
      if (ctx !== key() || !allowed()) throw { code: 'context' };
      if (!attempt) {
        var by = B.who() || 'owner';
        attempt = { id: B.fs().doc(B.colRef('deliveries')).id, data: { day: M.form.day, receivedAt: receivedAt(M.form), recordedAt: T.now(), supplier: M.form.supplier.trim(),
          chilled: temp(M.form.chilled), frozen: temp(M.form.frozen), note: M.form.note.trim(), receivedBy: P.whoName() || 'Admin', receivedById: by, by: by } };
        M.attempt = attempt;
      }
      var ref = B.docRef('deliveries', attempt.id);
      // Retry checks this exact id first (one server read). A lost acknowledgement never becomes a second receipt.
      return B.fromServer(ref).then(function (sn) {
        if (ctx !== key() || !allowed()) throw { code: 'context' };
        if (sn.exists()) {
          var data = sn.data(), same = Object.keys(attempt.data).every(function (k) { return data[k] === attempt.data[k]; });
          if (!same) throw { code: 'conflict' };
          return;
        }
        return B.W([['set', ref, attempt.data]]);
      });
    }).then(function () { confirmed(attempt); }, function (e) {
      if (ctx !== key() || !allowed() || attempt && M.attempt !== attempt) return;
      M.busy = false;
      if (e && (e.code === 'permission-denied' || e.code === 'conflict')) M.attempt = null;
      M.error = e && e.code === 'permission-denied' ? 'The save was refused. Your details are kept. Sign in again or ask the head chef to check delivery access.' :
        'The save could not be confirmed. Your details are kept. Reconnect and retry to check the same delivery.';
      draw();
    });
    // Firestore can hold a write while offline. Keep its exact id and payload, and handle a late acknowledgement above.
    var hold = M;
    setTimeout(function () { if (M === hold && M.saveToken === token && M.busy && ctx === key()) { M.busy = false; M.error = 'Still waiting for confirmation. Your details are kept. Reconnect and retry to check the same delivery.'; draw(); } }, 10000);
  }
  function tick() {
    clearTimeout(timer);
    if (!M.root) return;
    if (!allowed()) { reset(); draw(); return; }
    var current = T.day();
    if (M.followToday && M.day !== current) { M.day = current; load(); }
    if (!dirty() && (M.form.day !== current || M.form.time !== T.clock())) { M.form = form(); draw(); }
    timer = setTimeout(tick, 30000);
  }
  function mount(root) {
    if (context && context !== key()) reset(); context = key(); M.root = root;
    draw(); load(); tick();
  }
  document.addEventListener('focusin', function (e) { var field = e.target.getAttribute && e.target.getAttribute('data-dl-field'); if (M.root && M.root.contains(e.target) && ['time', 'chilled', 'frozen'].indexOf(field) >= 0 && e.target.value) e.target.select(); });
  document.addEventListener('submit', function (e) { if (M.root && M.root.contains(e.target) && e.target.id === 'dl-form') { e.preventDefault(); save(); } });
  document.addEventListener('input', function (e) { var field = e.target.getAttribute('data-dl-field'); if (M.root && M.root.contains(e.target) && field && !M.busy && !M.attempt) { M.form[field] = e.target.value; M.message = ''; } });
  document.addEventListener('click', function (e) {
    if (!M.root || !M.root.contains(e.target) || !allowed()) return;
    var el = e.target.closest('[data-dl]'); if (!el) return;
    if (el.getAttribute('data-dl') === 'refresh') load(true);
    if (el.getAttribute('data-dl') === 'clear' && !M.busy && !M.attempt) { M.form = form(); M.error = ''; M.message = ''; draw(); }
  });
  document.addEventListener('change', function (e) { if (M.root && M.root.contains(e.target) && e.target.id === 'dl-view-day' && admin()) { var date = e.target.value; if (!validDay(date) || date > T.day()) { draw(); return; } M.followToday = date === T.day(); M.day = date; load(); } });
  ['lk-access', 'lk-who', 'lk-admin', 'lk-cfg'].forEach(function (name) { window.addEventListener(name, function () { if (!allowed() || context && context !== key()) { reset(); draw(); } else draw(); }); });
  window.addEventListener('lk-clock', tick);
  window.addEventListener('beforeunload', function (e) { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });
  window.LK_DELIVERY = { api: 1, mount: mount, unmount: unmount, reset: reset, dirty: dirty };
})();
