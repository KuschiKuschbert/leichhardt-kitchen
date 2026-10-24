/* Supplier catalogue and order maths. No reads, writes, clock or source catalogue lives here. */
(function (root, make) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = make(require('./amounts.js'));
  else root.LK_SUP_CORE = make(root.LK_AMT);
})(typeof window === 'object' ? window : this, function (A) {
  'use strict';
  var MAX_ITEMS = 600, MAX_ORDER_LINES = 300, MAX_AMOUNT = 100000;
  var own = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  var EXTRA_UNITS = { ctn: 'cartons', ctns: 'cartons', roll: 'rolls', rolls: 'rolls', sleeve: 'sleeves', sleeves: 'sleeves', punnet: 'punnets', punnets: 'punnets', drum: 'drums', drums: 'drums', sheet: 'sheets', sheets: 'sheets', set: 'sets', sets: 'sets', unit: 'pieces', units: 'pieces' };
  var FRACTIONAL_UNITS = ['g', 'kg', 'ml', 'L'];
  function fail(code, field, message) { var e = new Error(message); e.code = code; e.field = field || ''; throw e; }
  function plain(o) { return !!o && typeof o === 'object' && !Array.isArray(o) && (Object.getPrototypeOf(o) === Object.prototype || Object.getPrototypeOf(o) === null); }
  function keys(o, allowed, field) {
    if (!plain(o)) fail('shape', field, 'Use an object for ' + field + '.');
    Object.keys(o).forEach(function (k) { if (allowed.indexOf(k) < 0) fail('field', field + '.' + k, 'This file contains an unsupported field: ' + k + '.'); });
  }
  function text(v, limit, field, required) {
    if (v == null) v = '';
    if (typeof v !== 'string' || v.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)) fail('text', field, 'Check ' + field + '.');
    if (required && !v.trim()) fail('required', field, 'Enter ' + field + '.');
    return v;
  }
  function id(v, field, optional, limit) {
    if (optional && (v == null || v === '')) return '';
    if (typeof v !== 'string' || v.length > (limit || 80) || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(v)) fail('id', field, 'Check ' + field + '.');
    return v;
  }
  function integer(v, min, max, field) {
    if (typeof v !== 'number' || !isFinite(v) || Math.floor(v) !== v || v < min || v > max) fail('number', field, 'Check ' + field + '.');
    return v;
  }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  // An empty par and the explicit zero are different values. Keep spelling such as 1.50 from the source.
  function cleanPar(v) {
    if (v == null || v === '') return '';
    if (typeof v !== 'string' && typeof v !== 'number') return null;
    var t = String(v).trim(), n = Number(t.replace(',', '.'));
    if (!t) return '';
    return t.length <= 40 && /^\d+(?:[.,]\d+)?$/.test(t) && isFinite(n) && n >= 0 && n < MAX_AMOUNT ? t : null;
  }
  function normaliseUnit(v) {
    if (typeof v !== 'string') return '';
    var t = v.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\.$/, '');
    if (A && A.UNITS && own(A.UNITS, t)) return A.UNITS[t];
    if (own(EXTRA_UNITS, t)) return EXTRA_UNITS[t];
    // Custom unit names are literal labels, not guessed plurals or pack sizes.
    return t.length <= 40 && /^[a-z]+(?:[ -][a-z]+)*$/.test(t) ? t : '';
  }
  // Reuse the book's amount parser. A carton abbreviation does not imply how much the carton contains.
  function quantity(v, zero, confirmedUnit) {
    if (!A || typeof v !== 'string') return null;
    var raw = v.trim(), parsed = A.parse(raw), unit = parsed && parsed.u, amount = parsed && parsed.n;
    if (!raw || raw.length > 40) return null;
    // A bare count may use the unit the chef already confirmed for this field. Never infer one from the pack or name.
    var confirmed = normaliseUnit(confirmedUnit);
    if (confirmed && /^[\d\s.,/½¼¾⅓⅔]+$/.test(raw) && ((parsed && !unit) || /^0+(?:[.,]0+)?$/.test(raw))) {
      raw += ' ' + confirmed;
      if (raw.length > 40) return null;
      parsed = A.parse(raw); unit = parsed && parsed.u; amount = parsed && parsed.n;
    }
    if (!parsed || !unit) {
      // A custom unit still requires one unambiguous decimal amount. The book reads the number.
      var m = raw.match(/^(\d+(?:[.,]\d+)?)\s*([a-z]+(?:[ -][a-z]+)*)\.?$/i);
      unit = m && normaliseUnit(m[2]);
      if (!unit) return null;
      var wasZero = /^0+(?:[.,]0+)?$/.test(m[1]);
      if (wasZero && !zero) return null;
      parsed = A.parse((wasZero ? '1' : m[1]) + ' packs');
      if (!parsed) return null;
      amount = wasZero ? 0 : parsed.n;
    }
    return isFinite(amount) && amount >= (zero ? 0 : 0.000001) && amount < MAX_AMOUNT ? { qty: raw, amount: amount, unit: unit } : null;
  }
  function parseQuantity(v, confirmedUnit) { return quantity(v, false, confirmedUnit); }
  function parseStock(v, confirmedUnit) { return quantity(v, true, confirmedUnit); }
  function cleanUnit(v, field) {
    if (v == null || v === '') return '';
    var n = normaliseUnit(text(v, 40, field, false));
    if (!n) fail('unit', field, 'Use a short unit name with letters, spaces or hyphens.');
    return n;
  }
  function convert(amount, from, to) {
    from = normaliseUnit(from); to = normaliseUnit(to);
    if (!from || !to || !isFinite(amount)) return null;
    if (from === to) return amount;
    var mass = { g: 1, kg: 1000 }, volume = { ml: 1, L: 1000 };
    if (own(mass, from) && own(mass, to)) return amount * mass[from] / mass[to];
    if (own(volume, from) && own(volume, to)) return amount * volume[from] / volume[to];
    return null;
  }
  function cleanSource(value, manual) {
    var s = value == null ? {} : value;
    keys(s, ['file', 'page', 'row', 'name', 'par'], 'source');
    var par = cleanPar(s.par);
    if (par === null) fail('par', 'source.par', 'Check the original par.');
    var out = { file: text(s.file, 180, 'source.file', !manual), page: integer(s.page == null ? 0 : s.page, 0, 100, 'source.page'), row: integer(s.row == null ? 0 : s.row, 0, MAX_ITEMS, 'source.row'), name: text(s.name, 180, 'source.name', !manual), par: par };
    if (manual && (out.file || out.page || out.row || out.name || out.par)) fail('source', 'source', 'A manual item has no imported source.');
    if (!manual && (!out.page || !out.row)) fail('source', 'source', 'Keep the original page and row.');
    return out;
  }
  function cleanItem(value, previous) {
    keys(value, ['id', 'name', 'pack', 'group', 'category', 'par', 'parUnit', 'orderUnit', 'factor', 'aliases', 'archived', 'manual', 'source'], 'item');
    var manual = value.manual == null ? !(value.source && value.source.file) : value.manual;
    if (typeof manual !== 'boolean' || (value.archived != null && typeof value.archived !== 'boolean')) fail('shape', 'item', 'Check the item flags.');
    var par = cleanPar(value.par);
    if (par === null) fail('par', 'par', 'Enter a par of zero or more, or leave it blank.');
    var aliases = value.aliases == null ? [] : value.aliases;
    if (!Array.isArray(aliases) || aliases.length > 12) fail('aliases', 'aliases', 'Use no more than 12 matching names.');
    var out = { id: id(value.id, 'item.id'), name: text(value.name, 180, 'name', true), pack: text(value.pack, 120, 'pack'), group: text(value.group, 80, 'group'), category: text(value.category, 80, 'category'), par: par, parUnit: cleanUnit(value.parUnit, 'parUnit'), orderUnit: cleanUnit(value.orderUnit, 'orderUnit'), factor: value.factor == null || value.factor === '' ? 0 : value.factor, aliases: aliases.map(function (a) { return text(a, 180, 'alias', true); }), archived: value.archived === true, manual: manual, source: cleanSource(value.source, manual) };
    if (typeof out.factor !== 'number' || !isFinite(out.factor) || out.factor < 0 || out.factor >= MAX_AMOUNT) fail('factor', 'factor', 'Enter a valid conversion, or leave it unconfirmed.');
    if (out.factor > 0) {
      if (!out.parUnit || !out.orderUnit) fail('factor', 'factor', 'Confirm both units before a pack conversion.');
      var known = convert(1, out.orderUnit, out.parUnit);
      if (known !== null && Math.abs(known - out.factor) > 0.0000001) fail('factor', 'factor', 'The conversion does not match those units.');
    }
    if (!manual && out.name !== out.source.name) fail('source', 'name', 'Keep the exact imported item name. Use matching names for shorthand.');
    if (previous) {
      var old = cleanItem(previous);
      if (out.id !== old.id) fail('immutable', 'id', 'Keep the saved item ID.');
      if (out.manual !== old.manual || JSON.stringify(out.source) !== JSON.stringify(old.source)) fail('immutable', 'source', 'Keep the original source unchanged.');
    }
    return out;
  }
  function cleanSupplier(value, previous) {
    keys(value, ['id', 'name', 'cutoffId', 'v', 'items', 'at', 'by'], 'supplier');
    if (!Array.isArray(value.items) || value.items.length > MAX_ITEMS) fail('items', 'items', 'Use no more than ' + MAX_ITEMS + ' items per supplier.');
    var seen = Object.create(null), old = Object.create(null);
    if (previous) (previous.items || []).forEach(function (x) { old[x.id] = x; });
    var out = { id: id(value.id, 'supplier.id'), name: text(value.name, 80, 'supplier.name', true), cutoffId: id(value.cutoffId, 'cutoffId', true, 40), v: integer(value.v == null ? 1 : value.v, 1, 1000000, 'v'), items: value.items.map(function (x) {
      var item = cleanItem(x, own(old, x.id) ? old[x.id] : null);
      if (own(seen, item.id)) fail('duplicate', 'item.id', 'Each item needs its own ID.');
      seen[item.id] = true; return item;
    }), at: value.at == null ? 0 : value.at, by: text(value.by, 80, 'by') };
    if (typeof out.at !== 'number' || !isFinite(out.at) || out.at < 0) fail('number', 'at', 'Check the saved time.');
    if (previous) {
      if (out.id !== previous.id) fail('immutable', 'supplier.id', 'Keep the saved supplier ID.');
      Object.keys(old).forEach(function (key) { if (!own(seen, key)) fail('archive', 'items', 'Archive a saved item instead of removing it.'); });
    }
    return out;
  }
  function validateCatalogue(value) {
    keys(value, ['version', 'suppliers'], 'catalogue');
    if (value.version !== 1 || !Array.isArray(value.suppliers) || value.suppliers.length > 50) fail('version', 'catalogue', 'Use supplier catalogue version 1.');
    var seen = Object.create(null), count = 0;
    var suppliers = value.suppliers.map(function (s) {
      var out = cleanSupplier(s); count += out.items.length;
      if (own(seen, out.id)) fail('duplicate', 'supplier.id', 'Each supplier needs its own ID.');
      seen[out.id] = true; return out;
    });
    if (count > MAX_ITEMS) fail('items', 'catalogue', 'Use no more than ' + MAX_ITEMS + ' items in one import.');
    return { version: 1, suppliers: suppliers };
  }
  function normaliseName(v) { return String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' '); }
  function duplicateItems(items, candidate) {
    var name = normaliseName(candidate.name);
    return (items || []).filter(function (x) { return !x.archived && x.id !== candidate.id && normaliseName(x.name) === name; });
  }
  // Only a confirmed alias or the complete item name matches. Ambiguous matches stay unassigned.
  function matchRequests(items, requests) {
    var index = Object.create(null), matches = Object.create(null), unmatched = [];
    (items || []).filter(function (x) { return !x.archived; }).forEach(function (item) {
      [item.name].concat(item.aliases || []).forEach(function (name) { var key = normaliseName(name); if (!key) return; if (!own(index, key)) index[key] = []; if (index[key].indexOf(item.id) < 0) index[key].push(item.id); });
    });
    (requests || []).filter(function (r) { return !r.deleted && !r.ordered; }).forEach(function (r) {
      var ids = index[normaliseName(r.text || r.name)] || [];
      if (ids.length !== 1) { unmatched.push(copy(r)); return; }
      var key = ids[0];
      if (!own(matches, key)) matches[key] = { itemId: key, requestIds: [], requests: [] };
      matches[key].requestIds.push(String(r.id || '')); matches[key].requests.push(copy(r));
    });
    return { matches: Object.keys(matches).map(function (key) { return matches[key]; }), unmatched: unmatched };
  }
  function snapshotLines(items, qtyMap, stockMap, suggestions) {
    var lines = [], seen = Object.create(null), map = qtyMap || {};
    (items || []).forEach(function (value) {
      var item = cleanItem(value);
      if (own(seen, item.id)) fail('duplicate', item.id, 'Each ordered item needs its own ID.');
      seen[item.id] = true;
      var raw = own(map, item.id) ? map[item.id] : '';
      if (raw == null || (typeof raw === 'string' && !raw.trim())) return;
      if (item.archived) fail('archived', item.id, 'An archived item cannot be ordered.');
      var q = parseQuantity(raw, item.orderUnit);
      if (!q) fail('quantity', item.id, 'To order for ' + item.name + ': enter a positive quantity' + (item.orderUnit ? ' in ' + item.orderUnit + ', or type the quantity and unit.' : ' with its unit, e.g. 2 kg or 2 cartons.'));
      var stock = stockMap && own(stockMap, item.id) ? stockMap[item.id] : '';
      var counted = stock ? parseStock(stock, item.parUnit) : null;
      if (stock && !counted) fail('stock', item.id, 'Stock count for ' + item.name + ': enter zero or more' + (item.parUnit ? ' in ' + item.parUnit + ', or type the count and unit.' : ' with its unit, e.g. 0 kg or 2 cartons.'));
      var suggestion = suggestions && own(suggestions, item.id) ? suggestions[item.id] : null;
      if (suggestion && typeof suggestion !== 'string') suggestion = suggestion.reason;
      lines.push({ itemId: item.id, name: item.name, pack: item.pack, qty: q.qty, amount: q.amount, unit: q.unit, par: item.par, parUnit: item.parUnit, source: copy(item.source), suggestion: text(suggestion, 500, 'suggestion'), stock: text(counted ? counted.qty : stock, 40, 'stock') });
    });
    Object.keys(map).forEach(function (key) { if (!own(seen, key) && map[key] != null && String(map[key]).trim()) fail('item', key, 'An order item is no longer in this catalogue.'); });
    if (!lines.length) fail('empty', 'lines', 'Enter at least one order quantity.');
    if (lines.length > MAX_ORDER_LINES) fail('items', 'lines', 'Use no more than ' + MAX_ORDER_LINES + ' item quantities per order.');
    return lines;
  }
  function say(n, u) { return String(Math.round(n * 1000) / 1000) + ' ' + u; }
  function suggestQuantity(value, lastOrder, stockText) {
    var item = cleanItem(value);
    if (item.archived) return null;
    if (stockText != null && String(stockText).trim()) {
      var stock = parseStock(stockText, item.parUnit), target = cleanPar(item.par), counted = stock && convert(stock.amount, stock.unit, item.parUnit);
      var factor = item.factor > 0 ? item.factor : convert(1, item.orderUnit, item.parUnit);
      if (!stock || target === '' || target === null || counted === null || !(factor > 0) || !item.orderUnit) return null;
      var needed = Math.max(0, Number(target.replace(',', '.')) - counted), amount = needed / factor;
      if (!(amount > 0)) return null;
      amount = FRACTIONAL_UNITS.indexOf(item.orderUnit) >= 0 ? Math.ceil((amount - 0.000000001) * 1000) / 1000 : Math.ceil(amount - 0.000000001);
      if (!(amount > 0) || amount >= MAX_AMOUNT) return null;
      var why = 'Top up to par: ' + target + ' ' + item.parUnit + ' - counted ' + stock.qty + ' = ' + say(needed, item.parUnit) + '.';
      if (item.orderUnit !== item.parUnit) why += ' Confirmed: each order unit contains ' + say(factor, item.parUnit) + '.';
      if (FRACTIONAL_UNITS.indexOf(item.orderUnit) < 0 && Math.abs(amount - needed / factor) > 0.000000001) why += ' Rounded up to a whole order unit.';
      return { qty: say(amount, item.orderUnit), amount: amount, unit: item.orderUnit, reason: why, kind: 'topup', sourceOrderId: '' };
    }
    if (!lastOrder || lastOrder.voided || !Array.isArray(lastOrder.lines)) return null;
    var line = lastOrder.lines.filter(function (x) { return x.itemId === item.id; })[0], previous = line && parseQuantity(line.qty || line.quantity || '');
    if (!previous || (item.orderUnit && previous.unit !== item.orderUnit)) return null;
    return { qty: previous.qty, amount: previous.amount, unit: previous.unit, reason: 'Same item in the previous supplier order. Check the current stock before using it.', kind: 'repeat', sourceOrderId: String(lastOrder.id || lastOrder.orderId || '') };
  }
  function catalogueDiff(before, after) {
    var old = before ? cleanSupplier(before) : null, next = cleanSupplier(after, old), changes = [], byId = Object.create(null);
    if (old && (old.name !== next.name || old.cutoffId !== next.cutoffId)) changes.push({ itemId: '', action: 'update_supplier', before: { name: old.name, cutoffId: old.cutoffId }, after: { name: next.name, cutoffId: next.cutoffId } });
    (old ? old.items : []).forEach(function (x) { byId[x.id] = x; });
    next.items.forEach(function (x) {
      var previous = own(byId, x.id) ? byId[x.id] : null;
      if (!previous || JSON.stringify(previous) !== JSON.stringify(x)) changes.push({ itemId: x.id, action: !previous ? 'add_item' : previous.archived !== x.archived ? (x.archived ? 'archive_item' : 'restore_item') : previous.par !== x.par ? 'change_par' : 'update_item', before: previous ? copy(previous) : null, after: copy(x) });
    });
    if (!old && !changes.length) changes.push({ itemId: '', action: 'add_supplier', before: null, after: { name: next.name, cutoffId: next.cutoffId } });
    return changes;
  }
  return { API: 2, MAX_ITEMS: MAX_ITEMS, MAX_ORDER_LINES: MAX_ORDER_LINES, cleanPar: cleanPar, normaliseUnit: normaliseUnit, parseQuantity: parseQuantity, parseStock: parseStock, convert: convert, cleanItem: cleanItem, cleanSupplier: cleanSupplier, validateCatalogue: validateCatalogue, normaliseName: normaliseName, duplicateItems: duplicateItems, matchRequests: matchRequests, snapshotLines: snapshotLines, suggestQuantity: suggestQuantity, catalogueDiff: catalogueDiff };
});
