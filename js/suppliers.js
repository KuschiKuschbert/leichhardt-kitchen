/* Supplier order: a private, lazy-loaded chef workspace. Catalogue data, history and drafts stay in memory.
   Catalogue reads run on entry and Refresh. One latest order is read when a supplier opens; history and audit
   read at most 20 records on a tap. No polling, per-item reads, public goods file or second persistent cache. */
(function () {
  'use strict';
  var API = 5, A = window.LK_APP, P = window.LK_PREP, T = window.LK_TIME, esc = A.esc;
  var C, store, loadingCode = null, contextKey = '', generation = 0;
  var M = blank();
  function blank() {
    var collapsed = false; try { collapsed = localStorage.getItem('lk.sup.sidebar') === 'hide'; } catch (e) {}
    return { root: null, route: {}, routeKey: '', openItems: Object.create(null), suppliers: null, sid: '', mode: 'order', busy: false, err: '', msg: '', validation: null,
      sidebar: !collapsed, q: '', group: '', page: 0, drafts: Object.create(null), history: Object.create(null),
      audit: Object.create(null), historyOpen: false, historyId: '', historyQ: '', smart: false, requests: null,
      requestsBusy: false, requestsError: '', requestsDay: '', cutQ: '', ed: null, supplierEd: null, review: null, additional: '',
      archive: '', reuse: '', importing: null, importMap: Object.create(null), importQ: '',
      includeArchived: false, auditOpen: false, armedLeave: '', saving: false };
  }
  function B() { return P.supplier(); }
  function canRead() { try { return !!B().read(); } catch (e) { return false; } }
  function canEdit() { try { return !!B().edit(); } catch (e) { return false; } }
  function ctx() { try { return String(B().context()); } catch (e) { return ''; } }
  function epoch() { return B().now(); }
  function day(ms) { return B().day(ms); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function uuid(prefix) {
    if (window.crypto && window.crypto.randomUUID) return prefix + '-' + window.crypto.randomUUID();
    var bytes = new Uint8Array(16); window.crypto.getRandomValues(bytes);
    return prefix + '-' + Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function supplier() { return (M.suppliers || []).filter(function (x) { return x.id === M.sid; })[0] || null; }
  function draft(sid) {
    sid = sid || M.sid;
    if (!M.drafts[sid]) M.drafts[sid] = { id: uuid('o'), qty: Object.create(null), stock: Object.create(null), suggestions: Object.create(null), dismissed: Object.create(null) };
    return M.drafts[sid];
  }
  function draftHas(d) { return !!d && [d.qty, d.stock].some(function (o) { return Object.keys(o).some(function (k) { return String(o[k]).trim(); }); }); }
  function hasDraft(sid) { return sid ? draftHas(M.drafts[sid]) : Object.keys(M.drafts).some(function (k) { return draftHas(M.drafts[k]); }); }
  function formDirty() { return !!(M.ed && JSON.stringify(M.ed.value) !== M.ed.start) || !!(M.supplierEd && JSON.stringify(M.supplierEd.value) !== M.supplierEd.start); }
  function editorHere() { return !!(M.ed && M.ed.sid === M.sid); }
  function supplierEditorHere() { return !!(M.supplierEd && M.supplierEd.originSid === M.sid); }
  // Retained tasks belong to their supplier and mode. Hidden work never controls the current page's Back action.
  function activeTask() {
    if (!canRead()) return '';
    if (M.mode === 'manage') return canEdit() ? editorHere() ? 'editor' : supplierEditorHere() ? 'supplier' : M.importing ? 'import' : 'catalogue' : '';
    if (M.mode !== 'order') return '';
    if (M.review && M.review.sid === M.sid) return 'review';
    return M.historyOpen ? M.reuse ? 'reuse' : 'history' : '';
  }
  function dirty() { return formDirty() || hasDraft() || !!M.importing || M.saving; }
  function items(all) { var s = supplier(); return s ? s.items.filter(function (i) { return all || !i.archived; }) : []; }
  function item(id) { return items(true).filter(function (i) { return i.id === id; })[0] || null; }
  function hist(sid) { sid = sid || M.sid; return M.history[sid] || (M.history[sid] = { rows: null, busy: false, err: '', more: false, cursor: null, full: false }); }
  function latest() { var h = hist(); return h.rows && h.rows[0] || null; }
  function lastLine(id) { var order = latest(); return order ? order.lines.filter(function (l) { return l.itemId === id; })[0] || null : null; }
  function dateText(ms) {
    if (typeof ms !== 'number' || !isFinite(ms)) return 'Time unavailable';
    return new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Brisbane', weekday: 'long', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms)) + ' AEST';
  }
  function occurrences() { try { return B().occurrences(); } catch (e) { return []; } }
  function occurrence() {
    var s = supplier(); if (!s || !s.cutoffId) return null;
    var list = occurrences().filter(function (o) { return o.cutoffId === s.cutoffId; });
    if (M.route.cutoffId && M.route.cutoffDay) return list.filter(function (o) { return o.cutoffId === M.route.cutoffId && o.day === M.route.cutoffDay; })[0] || { cutoffId: M.route.cutoffId, day: M.route.cutoffDay, label: 'Selected order cut-off', done: false, deliveryDay: '' };
    return list.filter(function (o) { return o.day === day(); })[0] || list.filter(function (o) { return o.at >= epoch(); })[0] || null;
  }
  function occurrenceKey(o) { return o ? o.day + '_' + o.cutoffId : ''; }
  function occurrenceLabel(o) { return o && (o.label || (typeof o.at === 'number' ? dateText(o.at) : o.day)) || ''; }
  function message(msg) { M.msg = msg; draw(); }
  function errorText(e) {
    var code = e && e.code || '';
    if (code === 'recorded') return 'This draft ID already has a recorded order. Its saved quantities are unchanged. Your current quantities are kept. Check history, or start a new draft for an additional order.';
    if (code === 'uncertain') return e.message || 'The save could not be confirmed. Keep this draft and retry the same recording to check it safely.';
    if (code === 'stale') return 'The catalogue changed on another device. Refresh it, check your changes and try again. Your draft is kept.';
    if (code === 'concurrent') return 'Another chef recorded an order for this cut-off. Refresh, check its history, then choose Additional order if one is still needed.';
    if (code === 'permission' || code === 'permission-denied' || code === 'context') return 'This save was refused. Sign in as an authorised chef and check that the supplier rules have been published. Your draft is kept.';
    if (code === 'unavailable' || code === 'offline' || navigator.onLine === false) return 'No signal. Supplier data needs a connection. Your current draft is kept while this page stays open.';
    if (code === 'version') return 'The supplier tools on this device need an update. Connect, reload the book and open Supplier order again.';
    if (code === 'invalid') return e.message || 'Check the item names, quantities and units before saving.';
    return 'Could not finish. Check the connection and try again. Your draft is kept.';
  }
  function rememberSupplier(s) {
    var at = (M.suppliers || []).findIndex(function (x) { return x.id === s.id; });
    if (at < 0) M.suppliers.push(s); else M.suppliers[at] = s;
    M.suppliers.sort(function (a, b) { return a.name.localeCompare(b.name); });
    if (M.drafts[s.id]) M.drafts[s.id].suggestions = Object.create(null);
  }
  function deps() {
    if (window.LK_SUP_CORE && window.LK_SUP_CORE.API === 2 && window.LK_SUP_STORE && window.LK_SUP_STORE.API === 1) return Promise.resolve();
    if (!loadingCode) loadingCode = Promise.all([
      window.LK_SUP_CORE && window.LK_SUP_CORE.API === 2 ? null : A.load('js/supplier-core.js?v=2'),
      window.LK_SUP_STORE && window.LK_SUP_STORE.API === 1 ? null : A.load('js/supplier-store.js')
    ]).then(function () {
      if (!window.LK_SUP_CORE || window.LK_SUP_CORE.API !== 2 || !window.LK_SUP_STORE || window.LK_SUP_STORE.API !== 1) throw { code: 'version' };
    }).catch(function (e) { loadingCode = null; throw e; });
    return loadingCode;
  }
  function load(force) {
    if (M.busy || (!force && M.suppliers)) return Promise.resolve();
    if (!canRead()) { draw(); return Promise.resolve(); }
    var g = generation, key = ctx(); M.busy = true; M.err = ''; M.validation = null; draw();
    return deps().then(function () { return B().ready(); }).then(function () {
      if (g !== generation || key !== ctx() || !canRead()) throw { code: 'context' };
      C = window.LK_SUP_CORE; if (!store) store = window.LK_SUP_STORE.create(B());
      return store.loadSuppliers().then(function (list) { return list.map(function (s) { return C.cleanSupplier(s); }); });
    }).then(function (list) {
      if (g !== generation || key !== ctx()) return;
      M.suppliers = list.sort(function (a, b) { return a.name.localeCompare(b.name); }); M.busy = false; if (force) { M.history = Object.create(null); M.audit = Object.create(null); M.requests = null; if (M.review && !M.review.uncertain && !M.review.recorded) M.review = null; }
      if (M.route.cutoffId) { var linked = list.filter(function (s) { return s.cutoffId === M.route.cutoffId; }); if (linked.length === 1) M.sid = linked[0].id; }
      if (!supplier()) M.sid = M.suppliers.length ? M.suppliers[0].id : '';
      draw(); if (M.sid) loadHistory(M.historyOpen, false); if (M.smart) loadRequests();
    }, function (e) { if (g === generation && key === ctx()) { M.busy = false; M.err = errorText(e); draw(); } });
  }
  function loadHistory(full, more) {
    if (!M.sid || !store || !canRead()) return Promise.resolve();
    var sid = M.sid, h = hist(sid), g = generation;
    if (h.busy || (!more && h.rows && (!full || h.full))) return Promise.resolve();
    h.busy = true; h.err = ''; draw();
    return store.history(sid, full ? 20 : 1, more ? h.cursor : null).then(function (r) {
      if (g !== generation || !canRead()) return;
      h.rows = more ? (h.rows || []).concat(r.rows).filter(function (o, i, a) { return a.findIndex(function (v) { return v.id === o.id; }) === i; }) : r.rows;
      h.cursor = r.cursor; h.more = r.more; h.full = full || h.full; h.busy = false; draw();
    }, function (e) { if (g === generation) { h.busy = false; h.err = errorText(e); draw(); } });
  }
  function loadRequests() {
    if ((M.requests !== null && M.requestsDay === day()) || M.requestsBusy) return;
    var g = generation; M.requestsBusy = true; M.requestsError = ''; draw();
    Promise.resolve().then(function () { return B().requests(); }).then(function (r) {
      if (g !== generation) return; M.requests = Array.isArray(r) ? r : r && r.lines || []; M.requestsDay = day(); M.requestsBusy = false; draw();
    }, function (e) { if (g === generation) { M.requestsBusy = false; M.requestsError = errorText(e); draw(); } });
  }
  function loadAudit() {
    var sid = M.sid, a = M.audit[sid]; if (a && (a.busy || a.rows)) return;
    a = M.audit[sid] = { rows: null, busy: true, err: '' }; var g = generation; draw();
    store.audit(sid, 20).then(function (r) { if (g === generation) { a.rows = r.rows; a.busy = false; draw(); } }, function (e) { if (g === generation) { a.busy = false; a.err = errorText(e); draw(); } });
  }
  function button(cmd, text, extra, primary) { return '<button type="button" class="btn' + (primary ? ' dark' : '') + '" data-su="' + cmd + '"' + (extra || '') + '>' + text + '</button>'; }
  function smallButton(cmd, text, extra) { return '<button type="button" class="p-x" data-su="' + cmd + '"' + (extra || '') + '>' + text + '</button>'; }
  function field(name, label, value, options) {
    options = options || {}; var iid = 'su-' + name;
    return '<label class="field" for="' + iid + '"><span class="label">' + label + '</span><input class="search" id="' + iid + '" data-sf="' + name + '" value="' + esc(value == null ? '' : value) + '"' + (options.readonly ? ' readonly' : '') + (options.type ? ' type="' + options.type + '"' : '') + (options.placeholder ? ' placeholder="' + esc(options.placeholder) + '"' : '') + (options.max ? ' maxlength="' + options.max + '"' : '') + (options.decimal ? ' inputmode="decimal"' : '') + '></label>';
  }
  function supplierSelect() { return '<label class="field su-mobile-pick"><span class="label">Supplier</span><select class="search" data-sf="supplier">' + (M.suppliers || []).map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === M.sid ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></label>'; }
  function statusHTML() {
    var task = activeTask(), note = M.armedLeave && (task === 'editor' || task === 'supplier' || task === 'import'), msg = M.armedLeave && !note ? '' : M.msg;
    var pending = M.review && task !== 'review' && (M.saving || M.review.uncertain) ? '<p id="su-recording-status" class="su-status" role="status">Recording for ' + esc(M.review.supplierName) + (M.saving ? ' is still in progress. ' : ' needs confirmation. ') + '<a href="#/suppliers/' + encodeURIComponent(M.review.sid) + '" data-su-recovery>Return to review</a>' + (M.saving ? ' to check its outcome.' : ' to retry safely.') + '</p>' : '';
    return (M.err ? '<div id="su-order-error" class="su-error" role="alert">' + esc(M.err) + (M.validation || pending ? '' : '<div class="btn-row">' + button('retry', 'Try again') + '</div>') + '</div>' : '') + pending + (msg ? '<p class="su-status' + (note ? ' su-leave-note' : '') + '"' + (note ? ' id="su-leave-note"' : '') + ' role="status">' + esc(msg) + '</p>' : '') + (navigator.onLine === false ? '<p class="su-error" role="status">No signal. Supplier reads and saves need a connection. Do not close a draft you still need.</p>' : '');
  }
  function headerHTML() {
    return '<div class="su-head"><div><span class="eyebrow">Chef tools</span><h2 id="rtitle" tabindex="-1">' + (M.mode === 'manage' ? 'Suppliers &amp; pars' : 'Supplier order') + '</h2><p class="hint">' + (M.mode === 'manage' ? 'Current pars and manual items. Original PDF records and past orders stay unchanged.' : 'Choose a supplier, check its last order and build the next one.') + '</p></div><div class="btn-row">' + button('refresh', 'Refresh', M.busy ? ' disabled' : '') + '</div></div>' +
      (canEdit() ? '<nav class="chips su-tools" aria-label="Supplier tools"><button type="button" class="chip" data-su="order-mode" aria-pressed="' + (M.mode === 'order') + '">Supplier order</button><button type="button" class="chip" data-su="manage" aria-pressed="' + (M.mode === 'manage') + '">Manage catalogue</button></nav>' : '');
  }
  function sidebarHTML() {
    return '<aside class="su-side"><span class="label">Suppliers</span><nav aria-label="Suppliers">' + (M.suppliers || []).map(function (s) { return '<button type="button" class="chip su-pick" data-su="pick" data-sid="' + esc(s.id) + '" aria-pressed="' + (s.id === M.sid) + '"><span>' + esc(s.name) + '</span><small>' + s.items.filter(function (i) { return !i.archived; }).length + '</small></button>'; }).join('') + '</nav>' + (canEdit() ? '<div class="su-side-bottom">' + smallButton('add-supplier', 'Add supplier') + '</div>' : '') + '</aside>';
  }
  function emptyHTML() { return '<div class="empty"><h3 class="h3">No supplier catalogue yet</h3><p>Supplier goods and pars are private. The head chef can import the checked catalogue or add a supplier here.</p>' + (canEdit() ? '<div class="btn-row">' + button('import', 'Import catalogue', '', true) + button('add-supplier', 'Add supplier') + '</div>' : '<p class="hint">Ask the head chef to import the supplier sheets.</p>') + '</div>'; }
  function currentPar(i) { return i.par === '' ? 'Not set' : i.par; }
  function cutoffHTML() {
    var o = occurrence(); if (!o) return '<p class="hint">No order cut-off linked to this draft.</p>';
    var already = !!o.done, key = occurrenceKey(o);
    return '<section class="su-cutoff"><div><b>' + (already ? 'An order is marked as placed' : 'Order cut-off') + '</b><span>' + esc(occurrenceLabel(o)) + '</span>' + (o.deliveryDay ? '<small>Delivery: ' + esc(o.deliveryDay) + '</small>' : '') + '</div>' + (already ? smallButton('additional', M.additional === key ? 'Additional order selected' : 'Additional order') : '') + '</section>';
  }
  function latestHTML() {
    var h = hist(), o = latest();
    if (h.busy && !h.rows) return '<p class="hint" role="status">Reading the latest supplier order...</p>';
    if (h.err) return '<p class="su-error">' + esc(h.err) + ' ' + smallButton('history-retry', 'Try again') + '</p>';
    return '<div class="su-latest"><b>' + (o ? 'Last order: ' + esc(dateText(o.at)) : 'No order recorded for this supplier yet') + '</b><span class="hint">' + (o ? o.lines.length + ' items. The Last order column refers to this one order.' : 'Last order quantities appear after an order is recorded here.') + '</span></div>';
  }
  function matchInfo() { try { return C.matchRequests(items(), M.requests || []); } catch (e) { return { matches: [], unmatched: [] }; } }
  function validationAttrs(field, id) {
    return M.validation && M.validation.field === field && M.validation.id === id ? ' aria-invalid="true" aria-describedby="su-order-error"' : '';
  }
  function entryError(field, i) {
    if (!validationAttrs(field, i.id)) return '';
    var unit = (field === 'qty' ? i.orderUnit : i.parUnit) || 'kg';
    return '<small class="su-entry-error" data-su-entry-error>' + esc(field === 'qty' ? (i.orderUnit ? 'Use a quantity above 0, e.g. 2 ' + unit + '.' : 'Enter a positive quantity with a unit, e.g. 2 kg.') : (i.parUnit ? 'Use zero or more, e.g. 0 ' + unit + '.' : 'Enter zero or more with a unit, e.g. 0 kg.')) + '</small>';
  }
  function entryInput(field, id) {
    return M.root && Array.prototype.filter.call(M.root.querySelectorAll('[data-sf="' + field + '"]'), function (el) { return el.getAttribute('data-i') === id; })[0];
  }
  function clearEntryError(field, id, value) {
    if (M.validation) {
      if (M.validation.field !== field || M.validation.id !== id) return;
      var i = item(id), valid = !String(value).trim() || (i && (field === 'qty' ? C.parseQuantity(value, i.orderUnit) : C.parseStock(value, i.parUnit)));
      if (!valid) return;
    }
    M.err = ''; M.validation = null;
    var alert = M.root.querySelector('#su-order-error'); if (alert) alert.remove();
    Array.prototype.forEach.call(M.root.querySelectorAll('[data-su-entry-error]'), function (el) { el.remove(); });
    Array.prototype.forEach.call(M.root.querySelectorAll('[data-sf][aria-invalid="true"]'), function (el) { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); });
  }
  function reviewError(e) {
    M.err = e.message || 'Check each order quantity and unit.';
    var all = items(), index = all.findIndex(function (i) { return i.id === e.field; });
    if ((e.code === 'quantity' || e.code === 'stock') && index >= 0) {
      M.validation = { id: e.field, field: e.code === 'stock' ? 'stock' : 'qty' };
      M.q = ''; M.group = ''; M.page = Math.floor(index / 20);
      if (e.code === 'stock') M.openItems[e.field] = true;
    }
    draw();
    if (M.validation) { var el = entryInput(M.validation.field, M.validation.id); if (el) { el.scrollIntoView({ block: 'center' }); el.focus({ preventScroll: true }); } }
  }
  function rowHTML(i) {
    var d = draft(), l = lastLine(i.id), h = hist(), source = i.source || {}, match = matchInfo().matches.filter(function (m) { return m.itemId === i.id; })[0];
    return '<div class="su-row" data-item="' + esc(i.id) + '"><details class="su-item"' + (M.openItems[i.id] ? ' open' : '') + '><summary><b>' + esc(i.name) + '</b><span class="hint">Pack: ' + esc(i.pack || 'Not set') + ' · Details</span>' + (match ? '<span class="su-request">Staff request to check</span>' : '') + '</summary><div class="su-item-more"><dl><dt>Source</dt><dd>' + (i.manual ? 'Added manually' : esc(source.file) + ' · page ' + esc(source.page)) + '</dd><dt>Original PDF par</dt><dd>' + esc(i.manual ? 'Not applicable' : source.par === '' ? 'Not set' : source.par) + '</dd><dt>Par unit</dt><dd>' + esc(i.parUnit || 'Unconfirmed') + '</dd><dt>Order unit</dt><dd>' + esc(i.orderUnit || 'Unconfirmed') + '</dd></dl><label class="field"><span class="label">Stock counted for this order' + (i.parUnit ? ' (' + esc(i.parUnit) + ')' : '') + '</span><input class="search" data-sf="stock" data-i="' + esc(i.id) + '" aria-label="Stock count: ' + esc(i.name) + '" placeholder="' + (i.parUnit ? 'e.g. 4' : 'e.g. 4 kg') + '" value="' + esc(d.stock[i.id] || '') + '" maxlength="40"' + validationAttrs('stock', i.id) + '>' + entryError('stock', i) + '</label><p class="hint">Only compatible confirmed units or a verified pack conversion can produce a top-up.</p>' + (match ? '<p class="hint">Matched by the exact item name or an explicit alias. Check the staff order list before deciding the quantity.</p>' : '') + '</div></details><div class="su-par"><span class="su-mobile-label">Par</span><b>' + esc(currentPar(i)) + '</b><small>' + esc(i.parUnit || 'To confirm') + '</small></div><div class="su-last"><span class="su-mobile-label">Last order</span>' + esc(l ? l.qty : !h.rows ? 'Loading' : latest() ? 'Not ordered' : 'No order yet') + '</div><label class="su-qty"><span class="su-mobile-label">To order</span><input class="search" data-sf="qty" data-i="' + esc(i.id) + '" aria-label="To order: ' + esc(i.name) + '" placeholder="' + (i.orderUnit ? 'e.g. 2' : 'e.g. 2 bags') + '" value="' + esc(d.qty[i.id] || '') + '" maxlength="40"' + validationAttrs('qty', i.id) + '><small class="hint">' + esc(i.orderUnit ? 'Order unit: ' + i.orderUnit : 'Include a unit, e.g. kg or cartons') + '</small>' + entryError('qty', i) + '</label></div>';
  }
  function suggestionsHTML() {
    var d = draft(), suggestions = items().map(function (i) { var p = C.suggestQuantity(i, latest(), d.stock[i.id] || ''); return p ? { item: i, pick: p } : null; }).filter(function (s) { return s && !d.dismissed[s.item.id] && !String(d.qty[s.item.id] || '').trim(); });
    var body = '<p class="hint">Suggestions need Apply. Previous quantities are a reference, not a demand forecast.</p>';
    if (M.requestsBusy) body += '<p class="hint">Reading staff requests...</p>';
    if (M.requestsError) body += '<p class="hint">' + esc(M.requestsError) + ' ' + smallButton('requests-retry', 'Try again') + '</p>';
    if (!suggestions.length) body += '<p class="hint">' + (latest() ? 'No further suggestions. Review the quantities you need.' : 'Learning, no recommendation yet. Record an order or enter a stock count with compatible confirmed units.') + '</p>';
    body += suggestions.slice(0, 12).map(function (s) { return '<div class="su-suggestion"><div><b>' + esc(s.pick.qty) + ' · ' + esc(s.item.name) + '</b><p class="hint">' + esc(s.pick.reason) + '</p></div><div class="btn-row">' + button('apply', 'Apply', ' data-i="' + esc(s.item.id) + '"') + smallButton('dismiss', 'Dismiss', ' data-i="' + esc(s.item.id) + '"') + '</div></div>'; }).join('');
    var matched = matchInfo();
    if (M.requests) body += '<p class="hint">' + matched.matches.length + ' catalogue items matched to outstanding staff requests. Unmatched requests stay on the staff order list. Nothing is ticked off here.</p>';
    if (hist().full) { var same = (hist().rows || []).filter(function (o) { return T.dow(o.at) === T.dow(epoch()); }); body += '<p class="hint">Loaded history includes ' + same.length + ' previous orders on this weekday. Open their dated sheets to compare quantities.</p>'; }
    return '<section class="su-disclosure"><button type="button" class="su-disclosure-button" data-su="smart" aria-expanded="' + M.smart + '">Suggestions <span class="hint">' + (M.smart ? 'Hide' : 'Show') + '</span></button>' + (M.smart ? '<div class="su-disclosure-body">' + body + '</div>' : '') + '</section>';
  }
  function filterItems(manage) {
    var words = M.q.toLowerCase().trim().split(/\s+/); return items(manage && M.includeArchived).filter(function (i) { return (!M.group || i.group === M.group) && words.every(function (w) { return (i.name + ' ' + i.pack + ' ' + (i.aliases || []).join(' ')).toLowerCase().indexOf(w) >= 0; }); });
  }
  function pager(list) {
    var pages = Math.ceil(list.length / 20); if (pages <= 1) return '';
    return '<div class="su-pager"><span class="hint">' + (M.page * 20 + 1) + ' to ' + Math.min(list.length, (M.page + 1) * 20) + ' of ' + list.length + ' items</span><div class="btn-row">' + button('previous', 'Previous', M.page ? '' : ' disabled') + button('next', 'Next', M.page + 1 < pages ? '' : ' disabled') + '</div></div>';
  }
  function toolbarHTML() {
    var groups = []; items(M.mode === 'manage').forEach(function (i) { if (i.group && groups.indexOf(i.group) < 0) groups.push(i.group); });
    return '<div class="su-toolbar">' + supplierSelect() + field('q', 'Find an item', M.q, { type: 'search', placeholder: 'Item name or alias', max: 180 }) + (M.mode === 'manage' ? button('add', 'Add item', '', true) : '') + '</div>' + (groups.length > 1 ? '<div class="chips su-groups"><button type="button" class="chip" data-su="group" data-group="" aria-pressed="' + !M.group + '">All items</button>' + groups.map(function (g) { return '<button type="button" class="chip" data-su="group" data-group="' + esc(g) + '" aria-pressed="' + (M.group === g) + '">' + esc(g) + '</button>'; }).join('') + '</div>' : '');
  }
  function linesHTML(lines) { return '<div class="su-lines">' + lines.map(function (l) { return '<div><span><b>' + esc(l.name) + '</b><small class="hint">Pack: ' + esc(l.pack || 'Not set') + '</small></span><strong>' + esc(l.qty) + '</strong></div>'; }).join('') + '</div>'; }
  function reviewHTML() {
    var r = M.review;
    return '<section class="su-review"><h2 id="rtitle" tabindex="-1">Review order</h2>' + statusHTML() + '<p>' + esc(r.supplierName) + ' · ' + r.lines.length + ' items</p>' + linesHTML(r.lines) + '<p>Record this only after you have placed the supplier order. This page sends nothing to the supplier.</p>' + (r.occurrence ? '<p class="hint">' + (r.additional ? 'Additional order for ' : 'Completes only ') + esc(r.occurrence.label || r.occurrence.day) + '.</p>' : '<p class="hint">No reminder linked. This records the supplier history only.</p>') + '<div class="btn-row">' + button('record', M.saving ? 'Recording...' : r.checking ? 'Checking cut-off...' : r.uncertain ? 'Confirm recording again' : 'Record order placed', M.saving || r.checking || r.recorded ? ' disabled' : '', true) + (r.recorded ? button('new-draft', 'Start new draft', M.saving ? ' disabled' : '') : '') + button('copy-review', 'Copy order text', M.saving ? ' disabled' : '') + '</div></section>';
  }
  function historyHTML() {
    var h = hist(), rows = h.rows || [], selected = rows.filter(function (o) { return o.id === M.historyId; })[0] || rows[0];
    var body = ''; if (h.busy) body += '<p class="hint" role="status">Reading order history...</p>';
    if (h.err) body += '<p class="su-error">' + esc(h.err) + ' ' + smallButton('history-retry', 'Try again') + '</p>';
    if (selected) {
      body += field('historyQ', 'Find an order', M.historyQ, { type: 'search', placeholder: 'Date or item name' }) + '<div class="su-history-dates">' + rows.filter(function (o) { return (dateText(o.at) + ' ' + o.lines.map(function (l) { return l.name; }).join(' ')).toLowerCase().indexOf(M.historyQ.toLowerCase()) >= 0; }).map(function (o) { return '<button type="button" class="chip" data-su="history-order" data-id="' + esc(o.id) + '" aria-pressed="' + (o.id === selected.id) + '">' + esc(dateText(o.at)) + '</button>'; }).join('') + '</div><h4>' + esc(dateText(selected.at)) + '</h4><p class="hint">' + selected.lines.length + ' items · Recorded by ' + esc(B().name(selected.by) || 'Chef') + '</p>' + linesHTML(selected.lines) + '<div class="btn-row">' + button('reuse', 'Use quantities again', ' data-id="' + esc(selected.id) + '"') + button('copy-history', 'Copy this order', ' data-id="' + esc(selected.id) + '"') + '</div>';
    } else if (!h.busy && !h.err) body += '<p class="hint">No orders recorded for this supplier.</p>';
    if (M.reuse) body += '<div class="su-confirm"><p>Replace the quantities in this supplier draft with the selected order? Other supplier drafts stay as they are.</p><div class="btn-row">' + button('reuse-confirm', 'Replace draft quantities', ' data-id="' + esc(M.reuse) + '"', true) + button('reuse-cancel', 'Cancel') + '</div></div>';
    if (h.more) body += '<div class="btn-row">' + button('history-more', 'Older orders', h.busy ? ' disabled' : '') + '</div>';
    return '<section class="su-disclosure"><button type="button" class="su-disclosure-button" data-su="history" aria-expanded="' + M.historyOpen + '">Order history <span class="hint">' + (M.historyOpen ? 'Hide' : 'Show') + '</span></button>' + (M.historyOpen ? '<div class="su-disclosure-body">' + body + '</div>' : '') + '</section>';
  }
  function orderHTML() {
    var s = supplier(), list = filterItems(false), last = '', d = draft(); M.page = Math.max(0, Math.min(M.page, Math.ceil(list.length / 20) - 1));
    if (activeTask() === 'review') return reviewHTML();
    var table = list.slice(M.page * 20, M.page * 20 + 20).map(function (i) { var title = i.category !== last ? '<div class="su-category">' + esc(i.category || 'Other items') + '</div>' : ''; last = i.category; return title + rowHTML(i); }).join('');
    return toolbarHTML() + '<div class="su-supplier-title"><h3 class="h3">' + esc(s.name) + '</h3><span class="hint">' + items().length + ' items</span></div>' + cutoffHTML() + latestHTML() + suggestionsHTML() + '<p class="hint">Current par from the catalogue. Blank is Not set; 0 stays 0. Enter a number when the order unit is shown, or include its unit, e.g. 2 kg or 2 cartons.</p><div class="su-table-head"><span>Item / pack</span><span>Par</span><span>Last order</span><span>To order</span></div>' + (table || '<p class="empty">No items match.</p>') + pager(list) + '<div class="su-order-actions"><span class="hint">' + Object.keys(d.qty).filter(function (k) { return String(d.qty[k]).trim(); }).length + ' items in this supplier draft</span>' + button('review', 'Review order', Object.keys(d.qty).some(function (k) { return String(d.qty[k]).trim(); }) ? '' : ' disabled', true) + '</div>' + historyHTML();
  }
  function sourceHTML(i) { return '<details class="su-source"><summary>Original record</summary><dl><dt>Item name</dt><dd>' + esc(i.manual ? 'Added manually' : i.source.name) + '</dd><dt>PDF par</dt><dd>' + esc(i.manual ? 'Not applicable' : i.source.par === '' ? 'Not set' : i.source.par) + '</dd><dt>Source</dt><dd>' + esc(i.manual ? 'Manual item' : i.source.file + ', page ' + i.source.page) + '</dd></dl></details>'; }
  function unitField(k, label, value) { return '<label class="field"><span class="label">' + label + '</span><input class="search" data-sf="' + k + '" value="' + esc(value || '') + '" list="su-unit-list" maxlength="40" placeholder="Unconfirmed"></label>'; }
  function editorHTML() {
    var e = M.ed, i = e.value, old = e.original, manual = !old || old.manual;
    return '<div class="su-editor"><h2 id="rtitle" tabindex="-1">' + (old ? manual ? 'Edit item' : 'Edit par' : 'Add item') + '</h2><p class="hint">' + esc(supplier().name) + '</p>' + statusHTML() + '<p class="hint">' + (manual ? 'Item name is required. A par is optional.' : 'Imported names and original PDF records stay unchanged.') + '</p><div class="su-form-grid">' + field('name', 'Item name', i.name, { readonly: !manual, max: 180 }) + field('par', 'Current par', i.par, { placeholder: 'Not set', decimal: true, max: 40 }) + '</div><p class="hint">Leave par blank for Not set. Save 0 to keep an explicit zero.</p><details class="su-more"' + (e.more ? ' open' : '') + '><summary>More item details</summary><div class="su-form-grid">' + field('pack', 'Pack description', i.pack, { max: 120 }) + field('category', 'Category', i.category, { max: 80 }) + field('group', 'Source group', i.group, { max: 80 }) + unitField('parUnit', 'Par unit', i.parUnit) + unitField('orderUnit', 'Order unit', i.orderUnit) + field('factor', 'Par units in one order unit', i.factor || '', { placeholder: 'Unconfirmed', decimal: true, max: 30 }) + '</div><p class="hint">Only enter a conversion after verifying it. For example, 5 kg per carton means 5, with kg as the par unit and carton as the order unit. Blank leaves stock-based conversions off.</p>' + field('aliases', 'Other names used on staff requests', (i.aliases || []).join(', '), { placeholder: 'Separate exact aliases with commas', max: 1500 }) + '<p class="hint">Aliases help match staff requests. Matching never uses a spelling guess.</p></details>' + (old ? sourceHTML(old) : '') + (M.archive ? archiveHTML() : '') + '<div class="btn-row su-editor-actions">' + button('save-item', M.saving ? 'Saving...' : 'Save changes', M.saving ? ' disabled' : '', true) + (old ? old.archived ? smallButton('restore', 'Restore item', ' data-i="' + esc(old.id) + '"') : smallButton('archive', 'Archive item', ' data-i="' + esc(old.id) + '"') : '') + '</div>' + (e.stale ? '<div class="btn-row">' + button('reload-form', 'Load latest catalogue and keep these edits') + '</div>' : '') + '<datalist id="su-unit-list">' + ['kg', 'g', 'L', 'mL', 'each', 'pack', 'bag', 'carton', 'case', 'bunch', 'dozen', 'tray', 'tub'].map(function (u) { return '<option value="' + u + '"></option>'; }).join('') + '</datalist></div>';
  }
  function archiveHTML() { var i = item(M.archive); return i ? '<div class="su-confirm"><h4>Archive ' + esc(i.name) + '?</h4><p>It leaves new order sheets. Its original record and past orders stay.' + (String(draft().qty[i.id] || '').trim() ? ' This also removes its quantity from the current draft.' : '') + '</p><div class="btn-row">' + button('archive-confirm', 'Archive item', ' data-i="' + esc(i.id) + '"', true) + button('archive-cancel', 'Cancel') + '</div></div>' : ''; }
  function auditHTML() {
    var a = M.audit[M.sid] || {}, body = a.busy ? '<p class="hint">Reading changes...</p>' : a.err ? '<p class="su-error">' + esc(a.err) + '</p>' : (a.rows || []).length ? a.rows.map(function (r) { return '<article class="su-audit-row"><b>' + esc(r.action) + '</b><span class="hint">' + esc(dateText(r.at)) + ' · ' + esc(B().name(r.by) || 'Chef') + '</span><p class="hint">Before: ' + esc(JSON.stringify(r.before)) + '</p><p class="hint">After: ' + esc(JSON.stringify(r.after)) + '</p></article>'; }).join('') : '<p class="hint">No changes recorded yet.</p>';
    return '<section class="su-disclosure"><button type="button" class="su-disclosure-button" data-su="audit" aria-expanded="' + M.auditOpen + '">Changes <span class="hint">' + (M.auditOpen ? 'Hide' : 'Show') + '</span></button>' + (M.auditOpen ? '<div class="su-disclosure-body">' + body + '</div>' : '') + '</section>';
  }
  function manageHTML() {
    if (!canEdit()) return '<p class="empty">Only the head chef or verified owner manages the supplier catalogue. You can use Supplier order and history.</p>';
    var task = activeTask();
    if (task === 'editor') return editorHTML();
    if (task === 'supplier') return supplierEditorHTML();
    if (task === 'import') return importHTML();
    var list = filterItems(true); M.page = Math.max(0, Math.min(M.page, Math.ceil(list.length / 20) - 1));
    return '<p class="hint su-breadcrumb">Content / Suppliers &amp; pars</p><div class="su-manage-links"><div class="btn-row">' + button('import', 'Import catalogue') + smallButton('supplier-settings', 'Supplier settings') + '</div><button type="button" class="p-x" data-su="cutoff-settings">Order cut-offs in Admin settings</button></div>' + toolbarHTML() + '<div class="su-catalogue-options"><span class="hint">' + esc(supplier().name) + ' · revision ' + supplier().v + '</span><label><input type="checkbox" data-sf="includeArchived"' + (M.includeArchived ? ' checked' : '') + '> Include archived</label></div>' + (M.archive ? archiveHTML() : '') + '<div class="su-catalogue-head"><span>Item / source</span><span>Current par</span><span>PDF par</span><span></span></div>' + list.slice(M.page * 20, M.page * 20 + 20).map(function (i) { return '<div class="su-catalogue-row' + (i.archived ? ' is-archived' : '') + '"><div><b>' + esc(i.name) + '</b><span class="hint">Pack: ' + esc(i.pack || 'Not set') + ' · ' + (i.manual ? 'Manual item' : esc(i.source.file) + ' · page ' + esc(i.source.page)) + (i.archived ? ' · Archived' : '') + '</span></div><div><span class="su-mobile-label">Current par</span><b>' + esc(currentPar(i)) + '</b></div><div><span class="su-mobile-label">PDF par</span>' + esc(i.manual ? 'Manual' : i.source.par === '' ? 'Not set' : i.source.par) + '</div><div class="btn-row">' + button('edit', i.manual ? 'Edit item' : 'Edit par', ' data-i="' + esc(i.id) + '"') + (i.archived ? smallButton('restore', 'Restore', ' data-i="' + esc(i.id) + '"') : '') + '</div></div>'; }).join('') + (!list.length ? '<p class="empty">No items match.</p>' : '') + pager(list) + auditHTML();
  }
  function supplierEditorHTML() {
    var e = M.supplierEd, allCuts = B().cuts(), cuts = allCuts.filter(function (c) { return !M.cutQ || c.name.toLowerCase().indexOf(M.cutQ.toLowerCase()) >= 0 || c.id === e.value.cutoffId; }).filter(function (c, i) { return i < 12 || c.id === e.value.cutoffId; });
    return '<section class="su-editor"><h2 id="rtitle" tabindex="-1">' + (e.existing ? 'Supplier settings' : 'Add supplier') + '</h2>' + statusHTML() + (allCuts.length > 12 ? field('cutQ', 'Find an existing reminder', M.cutQ, { type: 'search', placeholder: 'Reminder name' }) : '') + '<div class="su-form-grid">' + field('supplierName', 'Supplier name', e.value.name, { max: 80 }) + '<label class="field"><span class="label">Existing order reminder</span><select class="search" data-sf="supplierCutoff"><option value="">No reminder linked</option>' + cuts.map(function (c) { return '<option value="' + esc(c.id) + '"' + (e.value.cutoffId === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></label></div><p class="hint">This links the existing reminder. Delivery days and cut-off times stay in Admin settings.</p><div class="btn-row">' + button('save-supplier', M.saving ? 'Saving...' : 'Save supplier', M.saving ? ' disabled' : '', true) + '</div></section>';
  }
  function importHTML() {
    var n = M.importing.suppliers.reduce(function (a, s) { return a + s.items.length; }, 0), words = M.importQ.toLowerCase(), cuts = B().cuts().filter(function (c) { return !words || c.name.toLowerCase().indexOf(words) >= 0; });
    return '<section class="su-editor"><h2 id="rtitle" tabindex="-1">Review catalogue import</h2>' + statusHTML() + '<p>' + M.importing.suppliers.length + ' suppliers · ' + n + ' items. Check each existing reminder link before importing.</p>' + field('importQ', 'Find an existing reminder', M.importQ, { type: 'search', placeholder: 'Reminder name' }) + M.importing.suppliers.map(function (s) { var selected = M.importMap[s.id] || '', options = cuts.slice(0, 12), keep = B().cuts().filter(function (c) { return c.id === selected; })[0]; if (keep && !options.some(function (c) { return c.id === selected; })) options.push(keep); return '<div class="su-import-row"><b>' + esc(s.name) + '</b><span class="hint">' + s.items.length + ' items</span><label class="field"><span class="label">Existing reminder</span><select class="search" data-sf="import-cutoff" data-sid="' + esc(s.id) + '"><option value="">No reminder linked</option>' + options.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === selected ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></label></div>'; }).join('') + '<p class="hint">Names, original pars and source records are kept. Import data goes to the private kitchen catalogue.</p><div class="btn-row">' + button('import-apply', M.saving ? 'Importing...' : 'Import catalogue', M.saving ? ' disabled' : '', true) + '</div></section>';
  }
  function mainHTML() {
    if (!canRead()) return '<section class="su-wrap"><h2 id="rtitle" tabindex="-1">Supplier order</h2><p class="empty">Sign in as the head chef, a sous chef or the verified owner to open supplier orders.</p></section>';
    // Focused tasks replace the workspace heading and tools. One header arrow returns to their parent.
    var task = activeTask();
    // Until a recording is confirmed, another route offers recovery only. Workspace edits must not replace its ID.
    if (M.review && (M.saving || M.review.uncertain) && task !== 'review') return '<section class="su-wrap"><h2 id="rtitle" tabindex="-1">Confirm order recording</h2>' + statusHTML() + '</section>';
    if (M.suppliers && (task === 'editor' || task === 'supplier' || task === 'import' || task === 'review')) return '<section class="su-wrap">' + (task === 'editor' ? editorHTML() : task === 'supplier' ? supplierEditorHTML() : task === 'import' ? importHTML() : reviewHTML()) + '</section>';
    var html = headerHTML() + statusHTML();
    if (M.busy && !M.suppliers) return '<section class="su-wrap">' + html + '<p class="hint" role="status">Reading the supplier catalogue...</p></section>';
    if (!M.suppliers) return '<section class="su-wrap">' + html + '</section>';
    if (!M.suppliers.length) return '<section class="su-wrap">' + html + emptyHTML() + importInputHTML() + '</section>';
    return '<section class="su-wrap">' + html + '<div class="su-workspace-tools">' + button('collapse', M.sidebar ? 'Hide suppliers' : 'Show suppliers', ' aria-expanded="' + M.sidebar + '"') + '</div><div class="su-layout' + (M.sidebar ? '' : ' is-collapsed') + '">' + sidebarHTML() + '<div class="su-content">' + (M.mode === 'manage' ? manageHTML() : orderHTML()) + '</div></div>' + importInputHTML() + '</section>';
  }
  function importInputHTML() { return canEdit() ? '<input class="visually-hidden" type="file" accept="application/json,.json" data-sf="import" aria-label="Import private supplier catalogue">' : ''; }
  function draw() {
    if (!M.root || !document.body.contains(M.root)) return;
    var active = document.activeElement, keep = active && M.root.contains(active) ? { field: active.getAttribute('data-sf'), id: active.getAttribute('data-i'), start: active.selectionStart, end: active.selectionEnd } : null;
    var y = window.scrollY; M.root.innerHTML = mainHTML(); if (M.saving) Array.prototype.forEach.call(M.root.querySelectorAll('input,select,textarea,button'), function (n) { n.disabled = true; }); window.scrollTo(0, y);
    if (keep && keep.field) {
      var candidates = M.root.querySelectorAll('[data-sf]'), found = Array.prototype.filter.call(candidates, function (n) { return n.getAttribute('data-sf') === keep.field && n.getAttribute('data-i') === keep.id; })[0];
      if (found) { found.focus({ preventScroll: true }); if (typeof keep.start === 'number') try { found.setSelectionRange(keep.start, keep.end); } catch (e) {} }
    }
    window.dispatchEvent(new Event('lk-nav'));
  }
  function leaveForm(key) { if (!formDirty() || M.armedLeave === key) { M.ed = null; M.supplierEd = null; M.armedLeave = ''; return true; } M.armedLeave = key; message('These changes are not saved. Save them, or press Back again to discard them.'); return false; }
  function disarmLeave() {
    if (!M.armedLeave) return;
    M.armedLeave = ''; M.msg = '';
    var status = M.root.querySelector('.su-status'); if (status) status.remove();
    window.dispatchEvent(new Event('lk-nav'));
  }
  function focusTask() {
    window.scrollTo(0, 0);
    var el = M.root && M.root.querySelector('#rtitle'); if (el) el.focus({ preventScroll: true });
  }
  function focusBack(selector) {
    var el = M.root && M.root.querySelector(selector);
    if (el) { el.scrollIntoView({ block: 'center' }); el.focus({ preventScroll: true }); }
  }
  function closeEditor(cmd) {
    var id = M.ed && M.ed.original && M.ed.original.id;
    if (!leaveForm(cmd)) return;
    M.archive = ''; M.err = ''; M.msg = ''; draw();
    focusBack(cmd === 'supplier-close' ? '[data-su="supplier-settings"]' : id ? '[data-su="edit"][data-i="' + id + '"]' : '[data-su="add"]');
  }
  function closeImport() {
    if (M.importing && M.armedLeave !== 'import-cancel') { M.armedLeave = 'import-cancel'; message('This import is not saved. Import the catalogue, or press Back again to discard it.'); return; }
    M.importing = null; M.armedLeave = ''; M.err = ''; M.msg = ''; draw(); focusBack('[data-su="import"]');
  }
  function closeReview() {
    if (M.saving || M.review && M.review.uncertain) return;
    M.review = null; M.err = ''; draw(); focusBack('[data-su="review"]');
  }
  function closeHistory() { M.historyOpen = false; M.reuse = ''; draw(); focusBack('[data-su="review"]'); }
  function backLabel() {
    if (!M.root) return '';
    var task = activeTask();
    if ((task === 'editor' || task === 'catalogue') && M.archive && item(M.archive)) return 'Back to item details';
    if (task === 'editor' || task === 'supplier' || task === 'import') return 'Back to catalogue';
    if (task === 'review' || task === 'history') return 'Back to draft';
    if (task === 'reuse') return 'Back to order history';
    if (task === 'catalogue' && M.auditOpen) return 'Back to catalogue';
    return M.mode === 'manage' ? 'Back to supplier order' : '';
  }
  // The shared Back control unwinds the visible task before changing its address. Draft quantities stay in memory.
  function back() {
    if (!M.root) return false;
    if (M.saving || M.review && M.review.uncertain) return true;
    if (!canRead()) return false;
    var task = activeTask();
    if ((task === 'editor' || task === 'catalogue') && M.archive && item(M.archive)) { M.archive = ''; draw(); return true; }
    if (task === 'editor' || task === 'supplier') { closeEditor(task === 'editor' ? 'editor-close' : 'supplier-close'); return true; }
    if (task === 'import') { closeImport(); return true; }
    if (task === 'review') { closeReview(); return true; }
    if (task === 'reuse') { M.reuse = ''; draw(); return true; }
    if (task === 'history') { closeHistory(); return true; }
    if (task === 'catalogue' && M.auditOpen) { M.auditOpen = false; draw(); focusBack('[data-su="audit"]'); return true; }
    if (M.mode === 'manage') { orderMode(); return true; }
    return false;
  }
  function orderMode() {
    M.mode = 'order'; M.q = ''; M.group = ''; M.page = 0;
    if (M.route.mode === 'manage') A.returnTo('#/suppliers' + (M.route.sid && M.sid ? '/' + encodeURIComponent(M.sid) : ''));
    else draw();
  }
  function pick(sid) {
    if (!leaveForm('pick:' + sid)) return;
    M.sid = sid; M.route.cutoffId = ''; M.route.cutoffDay = ''; M.q = ''; M.group = ''; M.page = 0; M.review = null; M.additional = ''; M.historyOpen = false; M.auditOpen = false; M.historyId = ''; M.err = ''; M.msg = ''; M.validation = null; M.archive = ''; M.reuse = ''; draw(); loadHistory(false, false);
  }
  function beginReview() {
    if (!canRead() || M.saving) return;
    var s = supplier(), d = draft(), lines;
    M.validation = null;
    try { lines = C.snapshotLines(s.items, d.qty, d.stock, d.suggestions); } catch (e) { reviewError(e); return; }
    var o = occurrence(), key = occurrenceKey(o);
    if (o && o.done && M.additional !== key) { M.err = 'An order is already marked for this cut-off. Check history, or choose Additional order before recording another.'; draw(); return; }
    M.err = ''; M.review = { id: d.id, sid: s.id, supplierName: s.name, catalogueV: s.v, lines: lines, occurrence: o, linkV: 0, checking: !!o, additional: !!(o && M.additional === key) }; draw(); focusTask();
    if (o) {
      var r = M.review, g = generation;
      store.link({ day: o.day, cutoffId: o.cutoffId }).then(function (link) { if (g !== generation || M.review !== r) return; r.checking = false; r.linkV = link ? link.v : 0; if (link && !r.additional) { M.review = null; M.err = 'Another order is recorded for this cut-off. Check history and choose Additional order if needed.'; } draw(); }, function (e) { if (g === generation && M.review === r) { M.review = null; M.err = errorText(e); draw(); } });
    }
  }
  function record() {
    if (!M.review || M.review.checking || M.review.recorded || M.saving || !canRead()) return;
    var r = M.review, g = generation; M.saving = true; M.err = ''; draw();
    store.record(r.sid, r.catalogueV, r.id, r.lines, r.occurrence ? { day: r.occurrence.day, cutoffId: r.occurrence.cutoffId } : null, r.linkV, r.additional, r.occurrence && r.occurrence.deliveryDay || '').then(function (result) {
      if (g !== generation) return;
      var h = hist(r.sid); h.rows = [result.order].concat((h.rows || []).filter(function (o) { return o.id !== result.order.id; }));
      delete M.drafts[r.sid]; M.review = null; M.saving = false; M.additional = ''; M.historyId = result.order.id; M.msg = result.replayed ? 'This order was already recorded. No duplicate was made.' : 'Order recorded. Nothing was sent to the supplier.'; draw();
    }, function (e) { if (g === generation) { M.saving = false; if (e.code === 'uncertain') r.uncertain = true; if (e.code === 'recorded') { r.recorded = true; r.uncertain = false; if (e.prior) { var h = hist(r.sid); h.rows = [e.prior].concat((h.rows || []).filter(function (o) { return o.id !== e.prior.id; })); } } M.err = errorText(e); draw(); } });
  }
  function openEditor(id) {
    if (!canEdit() || !leaveForm('edit:' + id)) return;
    var i = id ? item(id) : null, s = supplier();
    var value = i ? clone(i) : { id: uuid('i'), name: '', pack: '', group: 'Manual items', category: 'Manual items', par: '', parUnit: '', orderUnit: '', factor: 0, aliases: [], archived: false, manual: true, source: { file: '', page: 0, row: 0, name: '', par: '' } };
    M.ed = { sid: s.id, routeKey: M.routeKey, original: i ? clone(i) : null, value: value, start: JSON.stringify(value), baseV: s.v, more: false, stale: false }; M.err = ''; M.msg = ''; M.archive = ''; draw(); focusTask();
  }
  function saveItem() {
    if (!editorHere() || M.saving || !canEdit()) return;
    var ed = M.ed, s = supplier(), value;
    try {
      value = C.cleanItem(ed.value, ed.original || undefined);
      var dup = C.duplicateItems(s.items, value).filter(function (i) { return !value.pack.trim() || C.normaliseName(i.pack) === C.normaliseName(value.pack); });
      if (dup.length) throw { code: 'invalid', message: 'This item name and pack already exist for this supplier. Edit the existing item, or give a distinct pack variant its correct pack description.' };
    } catch (e) { M.err = e.message || 'Check the item details.'; draw(); return; }
    var list = s.items.filter(function (i) { return i.id !== value.id; }); if (ed.original) list = s.items.map(function (i) { return i.id === value.id ? value : i; }); else list.push(value);
    M.saving = true; M.err = ''; M.msg = ''; M.armedLeave = ''; draw(); var g = generation;
    store.saveCatalogue(s.id, ed.baseV, { items: list }, { itemId: value.id, action: ed.original ? 'edit' : 'add' }).then(function (saved) {
      if (g !== generation) return; rememberSupplier(saved); M.ed = null; M.saving = false; M.msg = 'Catalogue saved. Current pars are updated; past order sheets are unchanged.'; M.page = 0; draw();
    }, function (e) { if (g === generation) { M.saving = false; if (e.code === 'stale') ed.stale = true; M.err = errorText(e); draw(); } });
  }
  function archiveItem(id, restore) {
    if (!canEdit() || M.saving) return;
    var s = supplier(), i = item(id); if (!i) return;
    var next = s.items.map(function (x) { return x.id === id ? Object.assign({}, x, { archived: !restore }) : x; });
    M.saving = true; M.err = ''; M.msg = ''; M.armedLeave = ''; draw(); var g = generation;
    store.saveCatalogue(s.id, s.v, { items: next }, { itemId: id, action: restore ? 'restore' : 'archive' }).then(function (saved) {
      if (g !== generation) return; rememberSupplier(saved); if (!restore) { var d = draft(); delete d.qty[id]; delete d.stock[id]; delete d.suggestions[id]; } M.ed = null; M.archive = ''; M.saving = false; M.msg = restore ? 'Item restored.' : 'Item archived. Past orders are unchanged.'; draw();
    }, function (e) { if (g === generation) { M.saving = false; M.err = errorText(e); draw(); } });
  }
  function reuseOrder(id, confirmed) {
    var order = (hist().rows || []).filter(function (o) { return o.id === id; })[0]; if (!order) return;
    if (hasDraft(M.sid) && !confirmed) { M.reuse = id; draw(); return; }
    var d = draft(); d.qty = Object.create(null); d.stock = Object.create(null); d.suggestions = Object.create(null);
    order.lines.forEach(function (l) { var i = item(l.itemId); if (i && !i.archived) d.qty[i.id] = l.qty; }); M.reuse = ''; M.msg = 'Previous quantities copied into this draft. Review them before ordering.'; draw();
  }
  function copyOrder(lines, name) {
    var text = name + '\n' + lines.map(function (l) { return l.qty + ' | ' + l.name; }).join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { message('Order text copied. Nothing was sent.'); }, function () { copyFallback(text); }); else copyFallback(text);
  }
  function copyFallback(text) { M.msg = 'Copy is unavailable here. Select the order text below.'; draw(); var area = document.createElement('textarea'); area.className = 'search su-copy'; area.readOnly = true; area.value = text; area.setAttribute('aria-label', 'Order text to copy'); if (M.root) { M.root.appendChild(area); area.focus(); area.select(); } }
  function openSupplierEditor(existing) {
    if (!canEdit() || !leaveForm('supplier-settings')) return;
    var s = existing ? supplier() : null, value = { name: s ? s.name : '', cutoffId: s ? s.cutoffId : '' };
    M.mode = 'manage'; M.supplierEd = { id: s ? s.id : uuid('s'), originSid: M.sid, routeKey: M.routeKey, existing: !!s, v: s ? s.v : 0, value: value, start: JSON.stringify(value) }; M.err = ''; M.msg = ''; draw(); focusTask();
  }
  function saveSupplier() {
    if (!supplierEditorHere() || M.saving || !canEdit()) return;
    var e = M.supplierEd; if (!e.value.name.trim()) { message('Enter the supplier name.'); return; }
    var duplicate = (M.suppliers || []).some(function (s) { return s.id !== e.id && C.normaliseName(s.name) === C.normaliseName(e.value.name); });
    if (duplicate) { message('That supplier already exists. Open its supplier settings.'); return; }
    if (e.value.cutoffId && (M.suppliers || []).some(function (s) { return s.id !== e.id && s.cutoffId === e.value.cutoffId; })) { message('That reminder is already linked to another supplier. Keep one catalogue supplier per reminder.'); return; }
    M.saving = true; M.err = ''; M.msg = ''; M.armedLeave = ''; draw(); var g = generation, patch = { name: e.value.name.trim(), cutoffId: e.value.cutoffId };
    if (!e.existing) patch.items = [];
    store.saveCatalogue(e.id, e.v, patch, { itemId: '', action: e.existing ? 'settings' : 'add-supplier' }).then(function (saved) { if (g === generation) { rememberSupplier(saved); M.sid = saved.id; M.supplierEd = null; M.saving = false; M.msg = 'Supplier saved.'; draw(); } }, function (x) { if (g === generation) { M.saving = false; M.err = errorText(x); draw(); } });
  }
  function importFile(file) {
    if (!canEdit() || !file) return;
    if (file.size > 3000000) { message('This catalogue file is too large. Use a JSON catalogue under 3 MB.'); return; }
    var g = generation;
    file.text().then(function (text) { if (g !== generation || !canEdit()) return; var payload = C.validateCatalogue(JSON.parse(text)); M.importing = payload; M.importMap = Object.create(null); payload.suppliers.forEach(function (s) { var current = (M.suppliers || []).filter(function (x) { return x.id === s.id; })[0], cut = current ? current.cutoffId : s.cutoffId; M.importMap[s.id] = B().cuts().some(function (c) { return c.id === cut; }) ? cut : ''; }); M.mode = 'manage'; M.err = ''; M.msg = ''; M.ed = null; draw(); focusTask(); }).catch(function (e) { if (g === generation) { M.err = e.message || 'Could not read this catalogue. Use the checked JSON import file.'; draw(); } });
  }
  function applyImport() {
    if (!M.importing || M.saving || !canEdit()) return;
    var used = Object.create(null), imported = M.importing.suppliers.map(function (s) { return s.id; }), conflict = false;
    (M.suppliers || []).filter(function (s) { return imported.indexOf(s.id) < 0; }).forEach(function (s) { if (s.cutoffId) used[s.cutoffId] = s.id; });
    M.importing.suppliers.forEach(function (s) { var cid = M.importMap[s.id]; if (cid && used[cid] && used[cid] !== s.id) conflict = true; if (cid) used[cid] = s.id; });
    if (conflict) { message('Each order reminder can link to only one catalogue supplier. Check the selected links before importing.'); return; }
    M.saving = true; M.err = ''; M.msg = ''; M.armedLeave = ''; draw(); var payload = M.importing, map = clone(M.importMap), g = generation;
    store.importCatalogue(payload, map).then(function (saved) { if (g !== generation) return; saved.forEach(rememberSupplier); M.importing = null; M.saving = false; if (!supplier()) M.sid = saved.length ? saved[0].id : ''; M.msg = 'Private catalogue imported. Check each supplier before the first order.'; draw(); if (M.sid) loadHistory(false, false); }, function (e) { if (g === generation) { M.saving = false; M.err = errorText(e); if (e.saved && e.saved.length) { e.saved.forEach(rememberSupplier); M.msg = e.saved.length + ' suppliers were saved before the import stopped. The remaining import is kept. Check the connection, then retry.'; draw(); store.loadSuppliers().then(function (list) { if (g === generation) { M.suppliers = list.sort(function (a, b) { return a.name.localeCompare(b.name); }); draw(); } }, function () { if (g === generation) draw(); }); } else draw(); } });
  }
  function reset() { var root = M.root; generation++; if (store) store.reset(); store = null; contextKey = ''; M = blank(); M.root = root; }
  function mount(root, route) {
    if (contextKey && contextKey !== ctx()) reset(); contextKey = ctx(); M.root = root;
    var routeKey = [route && route.sid || '', route && route.mode || 'order', route && route.cutoffId || '', route && route.cutoffDay || ''].join('|');
    if (routeKey !== M.routeKey) { M.route = Object.assign({}, route || {}); M.routeKey = routeKey; M.mode = route && route.mode === 'manage' ? 'manage' : 'order'; if (route && route.sid) M.sid = route.sid; }
    if (editorHere() && M.ed.routeKey === routeKey || supplierEditorHere() && M.supplierEd.routeKey === routeKey) M.mode = 'manage';
    if (M.route.cutoffId && M.suppliers) { var linked = M.suppliers.filter(function (s) { return s.cutoffId === M.route.cutoffId; }); if (linked.length === 1) M.sid = linked[0].id; }
    draw(); load(false);
    if (M.suppliers && M.sid) loadHistory(false, false);
  }
  function unmount() { M.root = null; }
  document.addEventListener('click', function (ev) {
    if (!M.root || !M.root.contains(ev.target)) return;
    var el = ev.target.closest('[data-su]'); if (!el || el.disabled) return;
    var cmd = el.getAttribute('data-su'), id = el.getAttribute('data-i');
    if (M.saving) return;
    if (!canRead()) { reset(); draw(); return; }
    if (cmd === 'retry' || cmd === 'refresh') { load(true); return; }
    if (cmd === 'collapse') { M.sidebar = !M.sidebar; try { localStorage.setItem('lk.sup.sidebar', M.sidebar ? 'show' : 'hide'); } catch (e) {} draw(); }
    if (cmd === 'pick') pick(el.getAttribute('data-sid'));
    if (cmd === 'group') { M.group = el.getAttribute('data-group'); M.page = 0; draw(); }
    if (cmd === 'previous') { M.page--; draw(); } if (cmd === 'next') { M.page++; draw(); }
    if (cmd === 'manage' && canEdit() && leaveForm('manage')) { M.mode = 'manage'; M.review = null; M.q = ''; M.group = ''; M.page = 0; draw(); }
    if (cmd === 'order-mode' && leaveForm('order-mode')) orderMode();
    if (cmd === 'smart') { M.smart = !M.smart; draw(); if (M.smart) loadRequests(); }
    if (cmd === 'requests-retry') { M.requests = null; loadRequests(); }
    if (cmd === 'apply') { var d = draft(), i = item(id), suggestion = i && C.suggestQuantity(i, latest(), d.stock[id] || ''); if (suggestion && !String(d.qty[id] || '').trim()) { d.qty[id] = suggestion.qty; d.suggestions[id] = suggestion; M.review = null; message('Suggestion added. Check its quantity and unit before ordering.'); } }
    if (cmd === 'dismiss') { draft().dismissed[id] = true; draw(); }
    if (cmd === 'additional') { M.additional = occurrenceKey(occurrence()); M.review = null; message('An additional order will keep the same cut-off link. Previous orders stay in history.'); }
    if (cmd === 'new-draft' && M.review && M.review.recorded) { draft().id = uuid('o'); M.additional = occurrenceKey(M.review.occurrence); M.review = null; M.err = ''; message('New draft started. The earlier order stays in history. Review this as an additional order.'); }
    if (cmd === 'cutoff-settings') { if (B().openCutoffs) B().openCutoffs(); else location.hash = '#/admin'; }
    if (cmd === 'review') beginReview(); if (cmd === 'record') record(); if (cmd === 'review-close') closeReview();
    if (cmd === 'copy-review' && M.review) copyOrder(M.review.lines, M.review.supplierName);
    if (cmd === 'history') { M.historyOpen = !M.historyOpen; draw(); if (M.historyOpen) loadHistory(true, false); }
    if (cmd === 'history-close') closeHistory();
    if (cmd === 'history-retry') { hist().rows = null; loadHistory(M.historyOpen, false); }
    if (cmd === 'history-more') loadHistory(true, true);
    if (cmd === 'history-order') { M.historyId = el.getAttribute('data-id'); draw(); }
    if (cmd === 'reuse') reuseOrder(el.getAttribute('data-id'), false); if (cmd === 'reuse-confirm') reuseOrder(el.getAttribute('data-id'), true); if (cmd === 'reuse-cancel') { M.reuse = ''; draw(); }
    if (cmd === 'copy-history') { var o = (hist().rows || []).filter(function (x) { return x.id === el.getAttribute('data-id'); })[0]; if (o) copyOrder(o.lines, o.supplierName); }
    if (cmd === 'edit') openEditor(id); if (cmd === 'add') openEditor(''); if (cmd === 'save-item') saveItem();
    if (cmd === 'editor-close') closeEditor('editor-close');
    if (cmd === 'archive' && canEdit()) { M.archive = id; draw(); } if (cmd === 'archive-cancel') { M.archive = ''; draw(); } if (cmd === 'archive-confirm') archiveItem(id, false); if (cmd === 'restore') archiveItem(id, true);
    if (cmd === 'reload-form' && M.ed) { var ed = M.ed, g = generation; store.load(M.sid).then(function (s) { if (g !== generation || M.ed !== ed) return; rememberSupplier(s); var current = s.items.filter(function (i) { return i.id === ed.value.id; })[0] || null, before = JSON.parse(ed.start), merged = current ? clone(current) : clone(ed.value); Object.keys(ed.value).forEach(function (f) { if (JSON.stringify(ed.value[f]) !== JSON.stringify(before[f])) merged[f] = clone(ed.value[f]); }); ed.baseV = s.v; ed.original = current ? clone(current) : null; ed.value = merged; ed.start = JSON.stringify(current || before); ed.stale = false; M.err = ''; message('Latest catalogue loaded. Your edits are still here. Check them before saving.'); }, function (e) { M.err = errorText(e); draw(); }); }
    if (cmd === 'audit') { M.auditOpen = !M.auditOpen; draw(); if (M.auditOpen) loadAudit(); }
    if (cmd === 'supplier-settings') openSupplierEditor(true); if (cmd === 'add-supplier') openSupplierEditor(false); if (cmd === 'save-supplier') saveSupplier(); if (cmd === 'supplier-close') closeEditor('supplier-close');
    if (cmd === 'import' && canEdit() && leaveForm('import')) { var file = M.root.querySelector('[data-sf="import"]'); if (file) file.click(); }
    if (cmd === 'import-cancel') closeImport(); if (cmd === 'import-apply') applyImport();
  });
  document.addEventListener('input', function (ev) {
    if (!M.root || !M.root.contains(ev.target) || !canRead() || M.saving) return;
    var el = ev.target, f = el.getAttribute('data-sf'), id = el.getAttribute('data-i'); if (!f) return;
    if (f === 'q') { M.q = el.value; M.page = 0; draw(); return; }
    if (f === 'cutQ') { M.cutQ = el.value; draw(); return; }
    if (f === 'historyQ') { M.historyQ = el.value; draw(); return; } if (f === 'importQ') { M.importQ = el.value; draw(); return; }
    if (f === 'qty' || f === 'stock') { draft()[f][id] = el.value; if (f === 'qty') delete draft().suggestions[id]; M.review = null; clearEntryError(f, id, el.value); if (M.smart || f === 'stock') draw(); else { var count = M.root.querySelector('.su-order-actions > .hint'); if (count) count.textContent = Object.keys(draft().qty).filter(function (k) { return String(draft().qty[k]).trim(); }).length + ' items in this supplier draft'; var reviewButton = M.root.querySelector('[data-su="review"]'); if (reviewButton) reviewButton.disabled = !Object.keys(draft().qty).some(function (k) { return String(draft().qty[k]).trim(); }); } return; }
    if (M.ed && canEdit() && Object.prototype.hasOwnProperty.call(M.ed.value, f)) { disarmLeave(); M.ed.value[f] = f === 'aliases' ? el.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : f === 'factor' ? (el.value.trim() === '' ? 0 : Number(el.value)) : el.value; M.ed.more = !!(M.root.querySelector('.su-more') && M.root.querySelector('.su-more').open); }
    if (M.supplierEd && canEdit() && f === 'supplierName') { disarmLeave(); M.supplierEd.value.name = el.value; }
  });
  document.addEventListener('toggle', function (ev) { if (!M.root || !M.root.contains(ev.target) || !ev.target.classList.contains('su-item')) return; var row = ev.target.closest('[data-item]'); if (row) M.openItems[row.getAttribute('data-item')] = ev.target.open; }, true);
  document.addEventListener('change', function (ev) {
    if (!M.root || !M.root.contains(ev.target) || !canRead() || M.saving) return;
    var el = ev.target, f = el.getAttribute('data-sf');
    if (f === 'supplier') pick(el.value); if (f === 'includeArchived') { M.includeArchived = el.checked; M.page = 0; draw(); }
    if (f === 'import') importFile(el.files && el.files[0]);
    if (f === 'import-cutoff') { disarmLeave(); M.importMap[el.getAttribute('data-sid')] = el.value; }
    if (f === 'supplierCutoff' && M.supplierEd) { disarmLeave(); M.supplierEd.value.cutoffId = el.value; }
  });
  ['lk-who', 'lk-admin', 'lk-cfg'].forEach(function (event) { window.addEventListener(event, function () { if (contextKey && contextKey !== ctx() || !canRead()) { reset(); draw(); } else if (M.root) draw(); }); });
  window.addEventListener('online', function () { if (M.root) draw(); }); window.addEventListener('offline', function () { if (M.root) draw(); });
  window.LK_SUP = { api: API, mount: mount, unmount: unmount, dirty: dirty, reset: reset, hasDraft: hasDraft, back: back, backLabel: backLabel, backDescription: function () { return M.root && M.root.querySelector('#su-leave-note') ? 'su-leave-note' : M.root && M.root.querySelector('#su-recording-status') ? 'su-recording-status' : ''; }, backDisabled: function () { return M.saving || !!(M.review && M.review.uncertain); }, open: function () { return !!M.root; } };
})();
