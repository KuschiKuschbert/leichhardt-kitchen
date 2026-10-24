/* Supplier workspace storage. Loaded only by the supplier page, never by staff pages.
   Firestore Lite uses the existing app's Auth and App Check, with no disk cache. Every read is a server read.
   The page owns the returned data in memory and drops it when the person, kitchen or account changes. */
(function () {
  'use strict';
  var API = 1, SDK = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-lite.js', READ_MS = 8000, SAVE_MS = 20000;
  function copy(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function error(code, message, extra) { var e = new Error(message); e.code = code; if (extra) Object.keys(extra).forEach(function (k) { e[k] = extra[k]; }); return e; }
  function idOk(v, n) { return typeof v === 'string' && new RegExp('^[a-z0-9][a-z0-9_-]{0,' + ((n || 80) - 1) + '}$', 'i').test(v); }
  function core() { if (!window.LK_SUP_CORE) throw error('invalid', 'The supplier helpers could not load. Reload the book.'); return window.LK_SUP_CORE; }
  function data(sn) { return sn && sn.exists() ? Object.assign({}, copy(sn.data()), { id: sn.id }) : null; }
  function catalogueData(sn) { var value = data(sn); return value ? core().cleanSupplier(value) : null; }
  function orderData(sn) {
    var value = data(sn); if (!value) return null;
    var valid = typeof value.sid === 'string' && typeof value.supplierName === 'string' && typeof value.by === 'string'
      && typeof value.at === 'number' && Number.isFinite(value.at) && value.at >= 0 && Number.isInteger(value.v) && value.v > 0
      && Array.isArray(value.lines) && value.lines.length > 0 && value.lines.length <= 300 && value.lines.every(function (line) {
        if (!line || typeof line.itemId !== 'string' || typeof line.name !== 'string' || typeof line.pack !== 'string' || typeof line.par !== 'string' || typeof line.parUnit !== 'string' || !line.source || typeof line.source !== 'object') return false;
        var q = core().parseQuantity(line.qty); return !!q && q.amount === line.amount && q.unit === core().normaliseUnit(line.unit);
      });
    if (!valid) throw error('invalid', 'A saved supplier order has invalid details. Ask the head chef to check it. Nothing has been changed.');
    return value;
  }
  // A dropped connection must leave a usable Retry action. A timed-out commit is uncertain, never described as failed.
  function bounded(promise, ms, uncertain, expire) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        if (expire) expire();
        reject(error(uncertain ? 'uncertain' : 'unavailable', uncertain ? 'The save could not be confirmed. Your draft is kept. Check the latest order history or catalogue, then retry if needed.' : 'The supplier records did not load. Check the connection and try again.'));
      }, ms);
      Promise.resolve(promise).then(function (value) { clearTimeout(timer); resolve(value); }, function (e) { clearTimeout(timer); reject(e); });
    });
  }
  function onlineRead(promise) { return bounded(promise, READ_MS, false); }
  function withoutId(d) { var out = copy(d); delete out.id; return out; }
  function occurrenceOf(o) {
    if (!o) return null;
    var day = o.day || o.cutoffDay || '', cutoffId = o.cutoffId || o.sid || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^[a-z0-9-]{1,40}$/.test(cutoffId)) throw error('invalid', 'Choose a valid supplier cut-off.');
    return { day: day, cutoffId: cutoffId, id: day + '_' + cutoffId };
  }
  function create(B) {
    var liteP = null, generation = 0;
    function check(ctx, edit, owner) {
      if (ctx && (ctx.generation !== generation || ctx.key !== B.context())) throw error('context', 'The person on this device changed. Open Supplier order again.');
      if (!B.read() || (edit && !B.edit()) || (owner && (!B.owner || !B.owner()))) throw error('permission', 'Sign in with the right chef account to continue.');
    }
    function client() {
      if (!liteP) liteP = onlineRead(B.ready().then(function (fb) { return import(SDK).then(function (f) { return { fs: f, db: f.getFirestore(fb.app) }; }); })).catch(function (e) { liteP = null; throw e; });
      return liteP;
    }
    async function access(edit, owner) {
      var ctx = { key: B.context(), generation: generation };
      await onlineRead(B.ready()); if (B.wait) await onlineRead(B.wait()); check(ctx, edit, owner);
      var c = await client(); check(ctx, edit, owner);
      return { fs: c.fs, db: c.db, ctx: ctx };
    }
    function ref(c, parts) { return c.fs.doc.apply(null, [c.db].concat(B.base(), parts)); }
    function col(c, parts) { return c.fs.collection.apply(null, [c.db].concat(B.base(), parts)); }
    async function transaction(c, fn, edit, owner) {
      if (!B.transact) throw error('invalid', 'The supplier save connection could not load. Reload the book.');
      var active = true;
      function alive() { if (!active) throw error('uncertain', 'This save timed out. Check the latest records before retrying.'); check(c.ctx, edit, owner); }
      var pending = B.transact(c.fs, c.db, async function (tx, by) {
        alive();
        var guarded = { get: function (r) { alive(); return onlineRead(tx.get(r)); },
          set: function (r, value, opts) { alive(); return opts ? tx.set(r, value, opts) : tx.set(r, value); } };
        var value = await fn(guarded, by); alive(); return value;
      }, { preserveWriter: !!owner });
      var result = await bounded(pending, SAVE_MS, true, function () { active = false; });
      check(c.ctx, edit, owner); if (B.changed) B.changed(); return result;
    }
    // One query when Supplier order opens or Refresh is tapped. One read per supplier, at least one if empty.
    async function loadSuppliers() {
      var c = await access(), sn = await onlineRead(c.fs.getDocs(col(c, ['suppliers']))); check(c.ctx);
      return sn.docs.map(catalogueData).sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    }
    // One document when a selected supplier must be refreshed, never once per item.
    async function load(sid) {
      if (!idOk(sid)) throw error('invalid', 'Choose a supplier.');
      var c = await access(), sn = await onlineRead(c.fs.getDoc(ref(c, ['suppliers', sid]))); check(c.ctx); return catalogueData(sn);
    }
    // History and audit are fetched only on demand. Each page reads at most page size plus one, never per item.
    async function page(sid, which, size, cursor) {
      if (!idOk(sid)) throw error('invalid', 'Choose a supplier.');
      var c = await access(), n = Math.max(1, Math.min(50, Number(size) || 20));
      var args = [col(c, ['suppliers', sid, which]), c.fs.orderBy(which === 'audit' ? 'v' : 'at', 'desc')];
      if (cursor) args.push(c.fs.startAfter(cursor)); args.push(c.fs.limit(n + 1));
      var sn = await onlineRead(c.fs.getDocs(c.fs.query.apply(null, args))); check(c.ctx);
      var selected = sn.docs.slice(0, n);
      return { rows: selected.map(which === 'orders' ? orderData : data), cursor: selected.length ? selected[selected.length - 1] : null, more: sn.docs.length > n };
    }
    // One small occurrence document on selection or review. No history scan is used to decide a reminder's state.
    async function link(o) {
      var occ = occurrenceOf(o); if (!occ) return null;
      var c = await access(), sn = await onlineRead(c.fs.getDoc(ref(c, ['supplierlinks', occ.id]))); check(c.ctx); return data(sn);
    }
    function cleanSupplier(sid, old, patch) {
      var p = Array.isArray(patch) ? { items: patch } : (patch || {});
      return core().cleanSupplier({ id: sid, name: p.name == null ? (old && old.name || '') : p.name,
        cutoffId: p.cutoffId == null ? (old && old.cutoffId || '') : p.cutoffId,
        items: p.items == null ? (old && old.items || []) : p.items }, old);
    }
    // One current document read and two writes per save. A version change never overwrites another chef's edit.
    async function saveCatalogue(sid, expectedV, patch, meta) {
      if (!idOk(sid)) throw error('invalid', 'Choose a valid supplier.');
      var c = await access(true), m = meta || {};
      return transaction(c, async function (tx, by) {
        var sr = ref(c, ['suppliers', sid]), old = catalogueData(await tx.get(sr)), oldV = old ? old.v : 0;
        if (oldV !== expectedV) throw error('stale', 'The catalogue changed on another device. Refresh it before saving.', { current: old });
        var clean = cleanSupplier(sid, old, patch), at = B.now(), next = { name: clean.name, cutoffId: clean.cutoffId, v: oldV + 1, items: clean.items, at: at, by: by };
        var itemId = typeof m.itemId === 'string' ? m.itemId : '', before = old ? withoutId(old) : null, after = copy(next);
        if (itemId) {
          before = old ? (old.items || []).filter(function (x) { return x.id === itemId; })[0] || null : null;
          after = next.items.filter(function (x) { return x.id === itemId; })[0] || null;
        }
        var audit = { v: next.v, itemId: itemId, action: typeof m.action === 'string' ? m.action : (old ? 'update' : 'create'), before: copy(before), after: copy(after), at: at, by: by };
        tx.set(sr, next); tx.set(ref(c, ['suppliers', sid, 'audit', String(next.v)]), audit);
        return Object.assign({ id: sid }, copy(next));
      }, true);
    }
    // Import is a deliberate chef action. Validate all rows before the first write; existing source evidence is retained.
    async function importCatalogue(payload, mapping) {
      var validated = core().validateCatalogue(payload), maps = mapping || {}, list = validated.suppliers;
      var importContext = (await access(true)).ctx;
      var existing = await loadSuppliers(), byId = new Map(existing.map(function (s) { return [s.id, s]; })), plans = [];
      check(importContext, true);
      list.forEach(function (s) {
        var old = byId.get(s.id), cid = Object.prototype.hasOwnProperty.call(maps, s.id) ? maps[s.id] : (old ? old.cutoffId : s.cutoffId);
        var items = s.items;
        if (old) {
          var existingItems = new Map((old.items || []).map(function (i) { return [i.id, i]; }));
          items = copy(old.items || []);
          s.items.forEach(function (i) {
            var before = existingItems.get(i.id);
            if (before) core().cleanItem(i, before);
            else items.push(i);
          });
        }
        var patch = { name: old ? old.name : s.name, cutoffId: cid || '', items: items };
        cleanSupplier(s.id, old, patch);
        var unchanged = old && old.name === patch.name && old.cutoffId === patch.cutoffId && JSON.stringify(old.items) === JSON.stringify(patch.items);
        plans.push({ id: s.id, v: old ? old.v : 0, patch: patch, unchanged: unchanged ? copy(old) : null });
      });
      var saved = [];
      for (var i = 0; i < plans.length; i++) {
        check(importContext, true);
        var p = plans[i];
        if (p.unchanged) { saved.push(p.unchanged); continue; }
        try { saved.push(await saveCatalogue(p.id, p.v, p.patch, { action: 'import' })); check(importContext, true); }
        catch (e) { e.saved = saved; throw e; }
      }
      return saved;
    }
    function linesFor(items, lines) {
      if (!Array.isArray(lines) || !lines.length || lines.length > 300) throw error('invalid', 'Enter between 1 and 300 item quantities.');
      var used = new Set(), ix = new Map(items.map(function (i) { return [i.id, i]; })), quantities = Object.create(null), stocks = Object.create(null), suggestions = Object.create(null);
      lines.forEach(function (l) {
        var i = ix.get(l.itemId);
        if (!i || i.archived || used.has(i.id)) throw error('invalid', 'An ordered item is missing, repeated or archived. Refresh the catalogue.');
        used.add(i.id);
        var q = core().parseQuantity(l.qty);
        if (!q || q.amount !== l.amount || q.unit !== l.unit) throw error('invalid', 'Every ordered item needs a positive quantity and its unit.');
        quantities[i.id] = l.qty; stocks[i.id] = l.stock || ''; suggestions[i.id] = l.suggestion || '';
      });
      return core().snapshotLines(items, quantities, stocks, suggestions);
    }
    function sameOrder(prior, lines, occ, delivery) {
      if (!Array.isArray(lines) || prior.cutoffDay !== (occ ? occ.day : '') || prior.cutoffId !== (occ ? occ.cutoffId : '') || prior.deliveryDay !== delivery) return false;
      function quantities(list) { return list.map(function (l) { return [l.itemId, l.amount, core().normaliseUnit(l.unit)]; }).sort(function (a, b) { return String(a[0]).localeCompare(String(b[0])); }); }
      return JSON.stringify(quantities(prior.lines)) === JSON.stringify(quantities(lines));
    }
    // One transaction on Record order placed: existing order, catalogue and optional link reads, then history/link/tick.
    // The draft's ID is reused after a timeout. Additional orders use a new ID and the reviewed occurrence version.
    async function record(sid, expectedV, orderId, lines, occurrence, seenLinkV, additional, deliveryDay) {
      if (!idOk(sid) || !idOk(orderId, 100)) throw error('invalid', 'The order could not be identified. Open its draft again.');
      var occ = occurrenceOf(occurrence), delivery = deliveryDay || (occurrence && occurrence.deliveryDay) || '';
      if (delivery && !/^\d{4}-\d{2}-\d{2}$/.test(delivery)) throw error('invalid', 'Choose a valid delivery date.');
      var c = await access();
      return transaction(c, async function (tx, by) {
        var or = ref(c, ['suppliers', sid, 'orders', orderId]), prior = orderData(await tx.get(or));
        if (prior) {
          if (!sameOrder(prior, lines, occ, delivery)) throw error('recorded', 'This draft was already recorded with different quantities. Its saved order is unchanged. Start a new order for these changes.', { prior: prior });
          return { order: prior, link: null, replayed: true };
        }
        var sr = ref(c, ['suppliers', sid]), supplier = catalogueData(await tx.get(sr));
        if (!supplier || supplier.v !== expectedV) throw error('stale', 'The catalogue changed. Refresh it and review the order.', { current: supplier });
        var oldLink = occ ? data(await tx.get(ref(c, ['supplierlinks', occ.id]))) : null;
        if (occ && supplier.cutoffId !== occ.cutoffId) throw error('stale', 'This supplier now uses a different reminder. Refresh it before saving.');
        if (oldLink && oldLink.sid !== sid) throw error('concurrent', 'This cut-off is linked to another supplier. Check the catalogue link.', { latest: oldLink });
        if (oldLink && (!additional || oldLink.v !== Number(seenLinkV))) throw error('concurrent', 'An order was recorded for this cut-off. Review it before recording an additional order.', { latest: oldLink });
        if (!oldLink && Number(seenLinkV || 0) !== 0) throw error('concurrent', 'The cut-off changed. Review it before saving.');
        var at = B.now(), order = { sid: sid, supplierName: supplier.name, v: supplier.v, at: at, day: B.day(at), deliveryDay: delivery,
          cutoffDay: occ ? occ.day : '', cutoffId: occ ? occ.cutoffId : '', by: by, lines: linesFor(supplier.items || [], lines) };
        var nextLink = occ ? { sid: sid, cutoffId: occ.cutoffId, day: occ.day, v: oldLink ? oldLink.v + 1 : 1, orderId: orderId, at: at, by: by } : null;
        tx.set(or, order);
        if (occ) {
          tx.set(ref(c, ['supplierlinks', occ.id]), nextLink);
          tx.set(ref(c, ['cutdone', occ.id]), { day: occ.day, sid: occ.cutoffId, on: true, at: at, by: by });
        }
        return { order: Object.assign({ id: orderId }, copy(order)), link: nextLink, replayed: false };
      });
    }
    // Explicit owner backup only. Catalogue partitions need one query each for audit and orders; none are read per item.
    async function exportAll() {
      var c = await access(false, true), sn = await onlineRead(c.fs.getDocs(col(c, ['suppliers']))), suppliers = sn.docs.map(data);
      var out = { suppliers: suppliers, supplierAudit: {}, supplierOrders: {}, supplierlinks: [] };
      var tasks = suppliers.map(async function (s) {
        var reads = await Promise.all([onlineRead(c.fs.getDocs(col(c, ['suppliers', s.id, 'audit']))), onlineRead(c.fs.getDocs(col(c, ['suppliers', s.id, 'orders'])))]);
        check(c.ctx, false, true); out.supplierAudit[s.id] = reads[0].docs.map(data); out.supplierOrders[s.id] = reads[1].docs.map(data);
      });
      tasks.push(onlineRead(c.fs.getDocs(col(c, ['supplierlinks']))).then(function (links) { out.supplierlinks = links.docs.map(data); }));
      await Promise.all(tasks); check(c.ctx, false, true); return out;
    }
    // Explicit owner PIN migration only. Same online-only client; copied records retain their original author and time.
    async function copyTo(newPin) {
      if (!/^\d{4,6}$/.test(newPin) || newPin === B.base()[1]) throw error('invalid', 'Choose a different kitchen PIN.');
      var initial = { key: B.context(), generation: generation }, out = await exportAll(); check(initial, false, true);
      var c = await access(false, true), ops = [], counts = { suppliers: 0, orders: 0, audits: 0, links: 0 }; check(initial, false, true);
      function add(parts, value, kind) { ops.push({ parts: parts, value: withoutId(value) }); counts[kind]++; }
      out.suppliers.forEach(function (s) {
        add(['suppliers', s.id], s, 'suppliers');
        (out.supplierAudit[s.id] || []).forEach(function (a) { add(['suppliers', s.id, 'audit', a.id], a, 'audits'); });
        (out.supplierOrders[s.id] || []).forEach(function (o) { add(['suppliers', s.id, 'orders', o.id], o, 'orders'); });
      });
      out.supplierlinks.forEach(function (l) { add(['supplierlinks', l.id], l, 'links'); });
      for (var start = 0; start < ops.length;) {
        var chunk = [], bytes = 0;
        while (start < ops.length && chunk.length < 350) {
          var op = ops[start], cost = new TextEncoder().encode(JSON.stringify(op.value)).length + op.parts.join('/').length + 2048;
          if (cost > 6 * 1024 * 1024) throw error('invalid', 'A supplier record is too large to copy. Nothing was changed under the old PIN.');
          if (chunk.length && bytes + cost > 6 * 1024 * 1024) break;
          chunk.push(op); bytes += cost; start++;
        }
        await transaction(c, async function (tx) { chunk.forEach(function (op) { tx.set(c.fs.doc.apply(null, [c.db, 'kitchens', newPin].concat(op.parts)), op.value); }); }, false, true);
      }
      return counts;
    }
    return { loadSuppliers: loadSuppliers, load: load, history: function (sid, n, cursor) { return page(sid, 'orders', n, cursor); },
      audit: function (sid, n, cursor) { return page(sid, 'audit', n, cursor); }, saveCatalogue: saveCatalogue, importCatalogue: importCatalogue,
      record: record, link: link, exportAll: exportAll, copyTo: copyTo, reset: function () { generation++; } };
  }
  window.LK_SUP_STORE = { API: API, create: create };
})();
