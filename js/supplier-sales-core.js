/* Confirmed POS portion links and sales-based supplier suggestions. No reads or writes. */
(function (root, make) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = make(require('./supplier-core.js'));
  else root.LK_SUP_SALES_CORE = make(root.LK_SUP_CORE, root.LK_TIME);
})(typeof window === 'object' ? window : this, function (C, T) {
  'use strict';
  var MAX_ROWS = 1000, MAX_PARTS = 8, MAX_SALES = 1000000, MAX_AMOUNT = 100000;
  var DAY_MS = 86400000;

  function invalid(field, message) {
    var error = new Error(message);
    error.code = 'invalid';
    error.field = field;
    throw error;
  }

  function fields(value, allowed, field) {
    if (!value || typeof value !== 'object' || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
      || Object.keys(value).some(function (key) { return allowed.indexOf(key) < 0; })) {
      invalid(field, 'Check the fields for ' + field + '.');
    }
  }

  function sortedKeys(map) { return Array.from(map.keys()).sort(); }
  function nameKey(name) { return C.normaliseName(name); }
  function itemKey(sid, iid) { return sid + ':' + iid; }

  function cleanName(value) {
    if (typeof value !== 'string' || /[\u0000-\u001f\u007f-\u009f]/.test(value)) invalid('name', 'Check the sales item name.');
    var name = value.trim().replace(/\s+/g, ' ');
    if (!name || name.length > 180) invalid('name', 'Use a sales item name of 1 to 180 characters.');
    return name;
  }

  function dateValue(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    var ms = Date.parse(value + 'T00:00:00.000Z');
    return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value ? ms : NaN;
  }

  function validateReport(report, today) {
    fields(report, ['start', 'end', 'rows'], 'sales report');
    var start = dateValue(report.start), end = dateValue(report.end);
    if (end - start !== 6 * DAY_MS) invalid('dates', 'Choose exactly seven calendar days for the sales report.');
    if (today == null && T) today = T.day();
    if (today != null && !(end <= dateValue(today))) invalid('dates', 'The sales week must end today or earlier.');
    if (!Array.isArray(report.rows) || !report.rows.length || report.rows.length > MAX_ROWS) {
      invalid('rows', 'Use a report with 1 to ' + MAX_ROWS + ' sales rows.');
    }
    var names = new Map();
    for (var row of report.rows) {
      fields(row, ['name', 'qty'], 'sales row');
      var name = cleanName(row.name), key = nameKey(name);
      if (!Number.isFinite(row.qty) || row.qty < 0 || row.qty > MAX_SALES) invalid('qty', 'Check the sales quantity for ' + name + '.');
      if (!names.has(key)) names.set(key, { name: name, counts: [] });
      var entry = names.get(key);
      if (name < entry.name) entry.name = name;
      entry.counts.push(row.qty);
    }
    var rows = sortedKeys(names).map(function (key) {
      var entry = names.get(key);
      var qty = entry.counts.sort(function (a, b) { return a - b; }).reduce(function (sum, count) { return sum + count; }, 0);
      if (qty > MAX_SALES) invalid('qty', 'Check the combined sales quantity for ' + entry.name + '.');
      return { name: entry.name, qty: qty };
    });
    return { start: report.start, end: report.end, rows: rows };
  }

  function catalogKey(item) {
    return JSON.stringify([C.normaliseUnit(item.orderUnit), C.normaliseName(item.pack), item.factor || 0, C.normaliseUnit(item.parUnit)]);
  }

  function cleanId(value) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value)) {
      invalid('item', 'Choose a saved supplier item.');
    }
    return value;
  }

  function cleanUnit(value) {
    var unit = C.normaliseUnit(value);
    if (!unit) invalid('unit', 'Confirm both the portion unit and the order unit.');
    return unit;
  }

  function cleanAmount(value, field) {
    if (!Number.isFinite(value) || value < 0.000001 || value >= MAX_AMOUNT) {
      invalid(field, 'Enter a positive amount below ' + MAX_AMOUNT + ' for ' + field + '.');
    }
    return value;
  }

  function sameAmount(a, b) { return Math.abs(a - b) <= Math.max(a, b) * 1e-12; }

  function validateLink(link) {
    fields(link, ['name', 'parts'], 'sales link');
    var name = cleanName(link.name);
    if (!Array.isArray(link.parts) || link.parts.length > MAX_PARTS) {
      invalid('parts', 'Use up to ' + MAX_PARTS + ' supplier items per sales item.');
    }
    var items = new Map();
    for (var part of link.parts) {
      fields(part, ['sid', 'iid', 'amount', 'unit', 'perOrder', 'orderUnit', 'catalogueKey'], 'sales portion');
      var sid = cleanId(part.sid), iid = cleanId(part.iid), key = itemKey(sid, iid);
      if (items.has(key)) invalid('item', 'Combine portions for the same supplier item into one line.');
      var unit = cleanUnit(part.unit), orderUnit = cleanUnit(part.orderUnit);
      var amount = cleanAmount(part.amount, 'portion per sale');
      var known = C.convert(1, orderUnit, unit);
      var perOrder = part.perOrder == null && known !== null ? known : cleanAmount(part.perOrder, 'portion units per order unit');
      if (known !== null && !sameAmount(perOrder, known)) invalid('perOrder', 'The conversion does not match those units.');
      if (typeof part.catalogueKey !== 'string' || !part.catalogueKey || part.catalogueKey.length > 400
        || /[\u0000-\u001f\u007f-\u009f]/.test(part.catalogueKey)) {
        invalid('catalogueKey', 'Confirm the supplier item and its current order details.');
      }
      items.set(key, { sid: sid, iid: iid, amount: amount, unit: unit, perOrder: known === null ? perOrder : known,
        orderUnit: orderUnit, catalogueKey: part.catalogueKey });
    }
    return { name: name, parts: sortedKeys(items).map(function (key) { return items.get(key); }) };
  }

  function checkLinkList(links) {
    if (!Array.isArray(links) || links.length > MAX_ROWS) invalid('links', 'Use up to ' + MAX_ROWS + ' sales links.');
  }

  function validateSales(report, links, today) {
    checkLinkList(links);
    var names = new Map();
    for (var link of links) {
      var linked = validateLink(link), key = nameKey(linked.name);
      if (names.has(key)) invalid('links', 'Confirm just one link for ' + linked.name + '.');
      names.set(key, linked);
    }
    return {
      report: report == null ? null : validateReport(report, today),
      links: sortedKeys(names).map(function (key) { return names.get(key); })
    };
  }

  function catalogueItems(catalogue) {
    var items = new Map();
    for (var supplier of catalogue) {
      for (var item of supplier.items) {
        var key = itemKey(supplier.id, item.id);
        items.set(key, items.has(key) ? null : item);
      }
    }
    return items;
  }

  function checkPart(part, item) {
    if (!item || item.archived) return 'A linked supplier item is missing or archived.';
    if (catalogKey(item) !== part.catalogueKey) return 'A linked item’s pack or conversion changed. Confirm the link again.';
    var orderUnit = C.normaliseUnit(item.orderUnit);
    if (orderUnit && orderUnit !== part.orderUnit) return 'The linked order unit differs from the supplier catalogue.';
    var known = item.factor > 0 ? C.convert(item.factor, item.parUnit, part.unit) : null;
    if (known !== null && !sameAmount(known, part.perOrder)) return 'The linked conversion differs from the supplier catalogue.';
    return '';
  }

  function inspectRow(row, links, items) {
    var matches = links.get(nameKey(row.name));
    var entry = { row: row, link: matches && matches.length === 1 ? matches[0] : undefined, uses: [], reason: '' };
    if (!matches) entry.reason = 'Confirm a portion and supplier item.';
    else if (!entry.link) entry.reason = 'More than one sales link matches. Confirm one link.';
    else {
      try { entry.link = validateLink(entry.link); }
      catch (error) { entry.reason = error.message; return entry; }
      for (var part of entry.link.parts) {
        var key = itemKey(part.sid, part.iid);
        entry.reason = checkPart(part, items.get(key));
        if (entry.reason) break;
        entry.uses.push({ key: key, part: part, total: row.qty * part.amount });
      }
    }
    return entry;
  }

  function quantityBuckets(entries) {
    var items = new Map();
    for (var entry of entries) {
      if (entry.reason) continue;
      for (var use of entry.uses) {
        if (!items.has(use.key)) items.set(use.key, []);
        items.get(use.key).push(use);
      }
    }
    return items;
  }

  function conflicting(uses) {
    var factors = new Map(), orderUnit = uses[0].part.orderUnit;
    return uses.some(function (use) {
      var part = use.part;
      if (part.orderUnit !== orderUnit) return true;
      var unit = part.unit === 'kg' ? 'g' : part.unit === 'L' ? 'ml' : part.unit;
      var factor = C.convert(part.perOrder, part.unit, unit);
      if (!factors.has(unit)) factors.set(unit, factor);
      return !sameAmount(factors.get(unit), factor);
    });
  }

  function displayAmount(amount, unit) { return Number(amount.toPrecision(12)) + ' ' + unit; }

  function makeSuggestion(uses, report) {
    var orderUnit = uses[0].part.orderUnit;
    var step = ['g', 'kg', 'ml', 'L'].indexOf(orderUnit) < 0 ? 1 : 1000;
    var orderAmount = uses.reduce(function (sum, use) { return sum + use.total / use.part.perOrder; }, 0);
    var steps = orderAmount * step;
    // Leave exact boundaries alone when division and addition introduce floating-point noise.
    var amount = Math.max(1, Math.ceil(steps - steps * Number.EPSILON * 8)) / step;
    var qty = amount + ' ' + orderUnit;
    var parsed = C.parseQuantity(qty);
    if (!parsed || parsed.amount !== amount || parsed.unit !== orderUnit) return null;
    var groups = new Map();
    for (var use of uses) {
      var part = use.part;
      if (!groups.has(part.unit)) groups.set(part.unit, { total: 0, perOrder: part.perOrder });
      groups.get(part.unit).total += use.total;
    }
    var usage = sortedKeys(groups).slice(0, 3).map(function (unit) {
      return displayAmount(groups.get(unit).total, unit);
    }).join(' + ');
    if (groups.size > 3) usage += ' and other confirmed portions';
    var reason = 'Matched sales, ' + report.start + ' to ' + report.end + ', used ' + usage + '.';
    if (groups.size === 1) {
      var unit = groups.keys().next().value;
      if (unit !== orderUnit) reason += ' Each order unit contains ' + displayAmount(groups.get(unit).perOrder, unit) + '.';
    }
    if (!sameAmount(amount, orderAmount)) reason += ' Rounded up from ' + displayAmount(orderAmount, orderUnit) + '.';
    return { amount: amount, unit: orderUnit, qty: qty, reason: reason };
  }

  function holdAffected(entries, reasons) {
    for (var entry of entries) {
      if (entry.reason) continue;
      var held = entry.uses.find(function (use) { return reasons.has(use.key); });
      if (held) entry.reason = reasons.get(held.key);
    }
  }

  function suggest(report, links, catalogue) {
    var suggestions = new Map(), review = [];
    if (report == null) return { suggestions: suggestions, review: review };
    var checked = validateReport(report);
    checkLinkList(links);
    var byName = new Map(), items = catalogueItems(catalogue);
    for (var link of links) {
      var key = link && typeof link.name === 'string' ? nameKey(link.name) : '';
      if (!key) continue;
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(link);
    }
    var entries = checked.rows.filter(function (row) { return row.qty > 0; }).map(function (row) {
      return inspectRow(row, byName, items);
    });
    var reasons = new Map();
    quantityBuckets(entries).forEach(function (uses, key) {
      if (conflicting(uses)) reasons.set(key, 'Sales links disagree on a supplier item’s unit or conversion.');
    });
    holdAffected(entries, reasons);
    quantityBuckets(entries).forEach(function (uses, key) {
      if (!makeSuggestion(uses, checked)) reasons.set(key, 'The suggested amount or unit cannot be entered in the order form.');
    });
    holdAffected(entries, reasons);
    quantityBuckets(entries).forEach(function (uses, key) {
      var suggestion = makeSuggestion(uses, checked);
      if (suggestion) suggestions.set(key, suggestion);
    });
    for (var entry of entries) {
      if (!entry.reason) continue;
      var row = { name: entry.row.name, qty: entry.row.qty, reason: entry.reason };
      if (entry.link) row.link = entry.link;
      review.push(row);
    }
    return { suggestions: suggestions, review: review };
  }

  return { API: 1, nameKey: nameKey, itemKey: itemKey, catalogKey: catalogKey, validateReport: validateReport,
    validateLink: validateLink, validateSales: validateSales, suggest: suggest };
});
