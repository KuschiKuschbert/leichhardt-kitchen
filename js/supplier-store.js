/* Supplier workspace storage. Loaded only by the supplier page, never by staff pages.
   Firestore Lite uses the existing app's Auth and App Check, with no disk cache. Every read is a server read.
   The page owns the returned data in memory and drops it when the person, kitchen or account changes. */
(function () {
  'use strict';
  var API = 5, SDK = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-lite.js', READ_MS = 8000, SAVE_MS = 20000;
  function copy(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  // Keep a legacy omitted false flag omitted unless the replacement changes its archive state.
  function archiveCopy(value, archived) {
    var out = copy(value);
    if (typeof archived === 'boolean' && !!out.archived !== archived) out.archived = archived;
    return out;
  }
  function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
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
  function normalise(value) { return String(value == null ? '' : value).trim().toLowerCase().replace(/\s+/g, ' '); }
  function originalKey(item) { return item && item.source && normalise(item.source.name) ? JSON.stringify([normalise(item.source.name), normalise(item.pack)]) : ''; }
  // A recorded child keeps its own IDs. Only complete original names and packs can link different catalogue IDs.
  function splitHistoryItems(source, target, moved, reservedIds) {
    var parent = new Map(source.items.map(function (entry) { return [entry.id, entry]; }));
    var children = new Map((target ? target.items : []).map(function (entry) { return [entry.id, entry]; }));
    var linked = target && target.historyFrom, result = linked && own(target, 'historyItems') ? copy(target.historyItems) : Object.create(null), used = new Set(), matched = new Map();
    var reserved = new Set(reservedIds || []);
    parent.forEach(function (entry) { reserved.add(entry.id); }); children.forEach(function (entry) { reserved.add(entry.id); });
    if (!linked) moved.forEach(function (parentId) {
      var original = parent.get(parentId), key = originalKey(original);
      var candidates = key ? Array.from(children.values()).filter(function (entry) { return originalKey(entry) === key; }) : [];
      if (candidates.length > 1) throw error('invalid', 'More than one destination item has the same original name and complete pack. Resolve the duplicate before splitting.');
      if (candidates.length) {
        if (used.has(candidates[0].id)) throw error('invalid', 'More than one original item matches the same destination item. Nothing was changed.');
        matched.set(parentId, candidates[0].id); used.add(candidates[0].id);
      }
    });
    moved.forEach(function (parentId) {
      var original = parent.get(parentId), targetId;
      if (!original) throw error('invalid', 'The split must identify existing items in its original supplier.');
      if (linked) {
        targetId = own(target, 'historyItems') ? (own(result, parentId) ? result[parentId] : '') : parentId;
        if (!targetId || !children.has(targetId)) throw error('invalid', 'This supplier was already split. Move additional original items to a new separate supplier so their previous quantities keep the correct history.');
      } else {
        targetId = matched.get(parentId) || parentId;
        if (!matched.has(parentId) && (children.has(targetId) || used.has(targetId))) {
          // Independent catalogue files can number different products alike. Only a new copy receives a fresh ID.
          var base = ('split-' + source.id + '-' + parentId).slice(0, 70), suffix = 1; targetId = base;
          while (reserved.has(targetId) || used.has(targetId)) { suffix++; var ending = '-' + suffix; targetId = base.slice(0, 80 - ending.length) + ending; }
        }
      }
      if ((!matched.has(parentId) || linked) && used.has(targetId)) throw error('invalid', 'More than one original item matches the same destination item. Nothing was changed.');
      used.add(targetId); result[parentId] = targetId;
    });
    return result;
  }
  // Shared by the review's draft check and the import. It reads no documents and never changes the uploaded file.
  function previewSplit(payload, existing) {
    var resolved = core().resolveCatalogueDestinations(payload, existing), list = resolved.payload.suppliers;
    var byId = new Map(existing.map(function (supplier) { return [supplier.id, supplier]; }));
    var destinations = list.filter(function (supplier) { return !!supplier.splitFrom; });
    if (!destinations.length) return null;
    if (destinations.length > 1) throw error('invalid', 'Split one supplier at a time, then import the next split.');
    var entry = destinations[0], source = byId.get(entry.splitFrom), target = byId.get(entry.id);
    var sourceEntry = list.filter(function (supplier) { return supplier.id === entry.splitFrom; })[0];
    if (!source || !sourceEntry || source.historyFrom || entry.id === source.id) throw error('invalid', 'Include the existing original supplier and a separate destination in the split file. A split supplier cannot be split again.');
    if (target && target.historyFrom && target.historyFrom !== source.id) throw error('invalid', 'The destination supplier already exists with a different history source.');
    var originalIds = new Set(source.items.map(function (item) { return item.id; }));
    var moved = entry.items.filter(function (item) { return originalIds.has(item.id); }).map(function (item) { return item.id; });
    if (!moved.length) throw error('invalid', 'The split must identify existing items in its original supplier.');
    var reservedIds = new Set();
    existing.concat(list).forEach(function (supplier) { supplier.items.forEach(function (item) { reservedIds.add(item.id); }); });
    var movedIds = new Set(moved), historyItems = splitHistoryItems(source, target, moved, reservedIds);
    if (sourceEntry.items.some(function (item) { return movedIds.has(item.id); })) throw error('invalid', 'A split item belongs in the destination sequence only. Its archived original is retained automatically.');
    moved.forEach(function (parentId) {
      var targetId = historyItems[parentId];
      existing.forEach(function (supplier) {
        if (supplier.id === source.id || supplier.id === entry.id) return;
        if (supplier.items.some(function (item) { return item.id === parentId || item.id === targetId; }) ||
            (supplier.historyFrom === source.id && (own(supplier, 'historyItems') ? own(supplier.historyItems, parentId) : supplier.items.some(function (item) { return item.id === parentId; })))) throw error('invalid', 'A split item already belongs to a third supplier.');
      });
    });
    return { sourceId: source.id, targetId: entry.id, moved: moved, historyItems: historyItems, reservedIds: Array.from(reservedIds) };
  }
  function occurrenceOf(o) {
    if (!o) return null;
    var day = o.day || o.cutoffDay || '', cutoffId = o.cutoffId || o.sid || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^[a-z0-9-]{1,40}$/.test(cutoffId)) throw error('invalid', 'Choose a valid supplier cut-off.');
    return { day: day, cutoffId: cutoffId, id: day + '_' + cutoffId };
  }
  function create(B) {
    var liteP = null, generation = 0, catalogues = new Map();
    function remember(value) { if (value) catalogues.set(value.id, copy(value)); return value; }
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
      check(c.ctx, edit, owner); if (B.changed) B.changed({ catalogue: !!edit }); return result;
    }
    // One query when Supplier order opens or Refresh is tapped. One read per supplier, at least one if empty.
    /* A saved supplier that fails the catalogue check is left out, not the whole list (5 Nov 2026: one such record hid
       every supplier behind "Could not finish. Check the connection", and Try again could never fix it). The list carries
       bad: [{ id, name, code, field, item }] (item: "item 12, ITEM NAME", the first item that fails), so the page can
       name it. Nothing is written. The owner backup (exportAll) still reads every record as it is. */
    async function loadSuppliers() {
      var c = await access(), sn = await onlineRead(c.fs.getDocs(col(c, ['suppliers']))); check(c.ctx);
      var list = [], bad = [];
      sn.docs.forEach(function (d) {
        try { var s = catalogueData(d); if (s) list.push(s); }
        catch (e) {
          var raw = data(d) || {}, item = '';
          (Array.isArray(raw.items) ? raw.items : []).some(function (x, i) {
            try { core().cleanItem(x); return false; } catch (ie) { item = 'item ' + (i + 1) + (x && typeof x.name === 'string' && x.name ? ', ' + x.name.slice(0, 80) : ''); return true; }
          });
          bad.push({ id: d.id, name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 80) : d.id, code: e && typeof e.code === 'string' ? e.code : '', field: e && typeof e.field === 'string' ? e.field : '', item: item });
        }
      });
      catalogues = new Map(list.map(function (s) { return [s.id, copy(s)]; }));
      list.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
      list.bad = bad;
      return list;
    }
    // One document when a selected supplier must be refreshed, never once per item.
    async function load(sid) {
      if (!idOk(sid)) throw error('invalid', 'Choose a supplier.');
      var c = await access(), sn = await onlineRead(c.fs.getDoc(ref(c, ['suppliers', sid]))); check(c.ctx); var value = catalogueData(sn); if (!value) catalogues.delete(sid); return remember(value);
    }
    // History and audit are fetched only on demand. Each page reads at most page size plus one, never per item.
    async function page(sid, which, size, cursor, before) {
      if (!idOk(sid)) throw error('invalid', 'Choose a supplier.');
      var c = await access(), n = Math.max(1, Math.min(50, Number(size) || 20));
      var args = [col(c, ['suppliers', sid, which])];
      if (which === 'orders' && typeof before === 'number') args.push(c.fs.where('at', '<=', before));
      args.push(c.fs.orderBy(which === 'audit' ? 'v' : 'at', 'desc'));
      if (cursor) args.push(c.fs.startAfter(cursor)); args.push(c.fs.limit(n + 1));
      var sn = await onlineRead(c.fs.getDocs(c.fs.query.apply(null, args))); check(c.ctx);
      var selected = sn.docs.slice(0, n);
      return { rows: selected.map(which === 'orders' ? orderData : data), cursor: selected.length ? selected[selected.length - 1] : null, more: sn.docs.length > n };
    }
    /* Both histories can overlap when an existing supplier is attached. Merge two bounded pages from the start.
       Each cursor advances only past emitted records, so More re-reads any unconsumed lookahead without a scan.
       Normal suppliers retain the existing one-query path and use already loaded metadata. */
    async function history(sid, size, cursor) {
      if (!idOk(sid)) throw error('invalid', 'Choose a supplier.');
      var initial = { key: B.context(), generation: generation }, supplier = catalogues.get(sid);
      if (!supplier) supplier = await load(sid);
      check(initial);
      if (!supplier || !supplier.historyFrom) return page(sid, 'orders', size, cursor);
      if (cursor && (cursor.splitFor !== sid || cursor.source !== supplier.historyFrom || cursor.before !== supplier.historyBefore)) throw error('invalid', 'Open this supplier history again.');
      var source = supplier.historyFrom, before = supplier.historyBefore, n = Math.max(1, Math.min(50, Number(size) || 20));
      var c = await access(), ids = new Set(supplier.items.map(function (entry) { return entry.id; }));
      async function stream(streamSid, snapshot, done, inherited) {
        if (done) return [];
        var args = [col(c, ['suppliers', streamSid, 'orders'])];
        if (inherited) args.push(c.fs.where('at', '<=', before));
        args.push(c.fs.orderBy('at', 'desc'));
        if (snapshot) args.push(c.fs.startAfter(snapshot));
        args.push(c.fs.limit(n + 1));
        var sn = await onlineRead(c.fs.getDocs(c.fs.query.apply(null, args))); check(c.ctx); check(initial);
        return sn.docs.map(function (doc, index) {
          var row = orderData(doc);
          if (inherited) {
            row.id = 'from:' + source + ':' + row.id; row.inheritedFrom = source; row.sourceOrderId = doc.id;
            row.lines = row.lines.filter(function (line) {
              if (own(supplier, 'historyItems')) {
                if (!own(supplier.historyItems, line.itemId)) return false;
                line.itemId = supplier.historyItems[line.itemId]; return true;
              }
              return ids.has(line.itemId);
            });
          }
          return { row: row, snapshot: doc, inherited: inherited, index: index };
        });
      }
      var pages = await Promise.all([
        stream(sid, cursor && cursor.ownCursor, cursor && cursor.ownDone, false),
        stream(source, cursor && cursor.parentCursor, cursor && cursor.parentDone, true)
      ]); check(initial);
      var selected = pages[0].concat(pages[1]).sort(function (a, b) {
        return b.row.at - a.row.at || Number(a.inherited) - Number(b.inherited) || a.index - b.index;
      }).slice(0, n);
      var ownCount = 0, parentCount = 0, ownCursor = cursor && cursor.ownCursor || null, parentCursor = cursor && cursor.parentCursor || null;
      selected.forEach(function (entry) {
        if (entry.inherited) { parentCount++; parentCursor = entry.snapshot; }
        else { ownCount++; ownCursor = entry.snapshot; }
      });
      var ownDone = !!(cursor && cursor.ownDone) || (pages[0].length < n + 1 && ownCount === pages[0].length);
      var parentDone = !!(cursor && cursor.parentDone) || (pages[1].length < n + 1 && parentCount === pages[1].length);
      // Keep an empty projected batch. Its timestamp still belongs in the latest-order header and reuse state.
      return { rows: selected.map(function (entry) { return entry.row; }), cursor: { splitFor: sid, source: source, before: before,
        ownCursor: ownCursor, parentCursor: parentCursor, ownDone: ownDone, parentDone: parentDone }, more: !ownDone || !parentDone };
    }
    // One small occurrence document on selection or review. No history scan is used to decide a reminder's state.
    async function link(o) {
      var occ = occurrenceOf(o); if (!occ) return null;
      var c = await access(), sn = await onlineRead(c.fs.getDoc(ref(c, ['supplierlinks', occ.id]))); check(c.ctx); return data(sn);
    }
    function cleanSupplier(sid, old, patch) {
      var p = Array.isArray(patch) ? { items: patch } : (patch || {});
      var value = { id: sid, name: p.name == null ? (old && old.name || '') : p.name,
        cutoffId: p.cutoffId == null ? (old && old.cutoffId || '') : p.cutoffId,
        items: p.items == null ? (old && old.items || []) : p.items,
        v: old ? old.v : 1, at: old ? old.at : 0, by: old ? old.by : '' };
      if (old && old.historyFrom) { value.historyFrom = old.historyFrom; value.historyBefore = old.historyBefore; }
      if (old && own(old, 'historyItems')) value.historyItems = copy(old.historyItems);
      ['historyFrom', 'historyBefore', 'historyItems'].forEach(function (key) {
        if (own(p, key) && JSON.stringify(p[key]) !== JSON.stringify(old && old[key])) throw error('invalid', 'A saved supplier history source cannot be changed.');
      });
      return core().cleanSupplier(value, old);
    }
    // One current document read and two writes per save. A version change never overwrites another chef's edit.
    async function saveCatalogue(sid, expectedV, patch, meta) {
      if (!idOk(sid)) throw error('invalid', 'Choose a valid supplier.');
      var c = await access(true), m = meta || {};
      return transaction(c, async function (tx, by) {
        var sr = ref(c, ['suppliers', sid]), snapshot = await tx.get(sr), rawOld = data(snapshot), old = catalogueData(snapshot), oldV = old ? old.v : 0;
        if (oldV !== expectedV) throw error('stale', 'The catalogue changed on another device. Refresh it before saving.', { current: old });
        var clean = cleanSupplier(sid, old, patch), at = Math.max(B.now(), old ? old.at + 1 : 0), next = { name: clean.name, cutoffId: clean.cutoffId, v: oldV + 1, items: clean.items, at: at, by: by };
        if (old && old.historyFrom) { next.historyFrom = old.historyFrom; next.historyBefore = old.historyBefore; }
        if (old && own(old, 'historyItems')) next.historyItems = copy(old.historyItems);
        var sequenceOnly = m.action === 'reorder', replacing = m.action === 'replace-import', preserveItems = sequenceOnly || ((m.action === 'import' || replacing) && !!old);
        if (sequenceOnly && (!old || clean.name !== old.name || clean.cutoffId !== old.cutoffId || clean.items.length !== old.items.length)) throw error('invalid', 'A template order can only change the item sequence, not supplier details or catalogue items.');
        if (preserveItems) {
          if (clean.name !== old.name) throw error('invalid', 'A catalogue import keeps the saved supplier name. Change it in Supplier settings.');
          var canonicalItems = new Map(old.items.map(function (entry) { return [entry.id, entry]; })), rawItems = new Map(rawOld.items.map(function (entry) { return [entry.id, entry]; }));
          clean.items.forEach(function (entry) {
            var before = canonicalItems.get(entry.id), expected = before && archiveCopy(before, replacing ? entry.archived : undefined);
            if ((sequenceOnly && !before) || (before && JSON.stringify(entry) !== JSON.stringify(expected))) throw error('invalid', 'An import cannot change the saved details for ' + entry.name + '. Refresh and check the catalogue before saving.');
          });
          // Validation uses canonical units, but importing a sequence keeps legacy spelling and omitted saved fields.
          next.name = rawOld.name; next.cutoffId = sequenceOnly ? rawOld.cutoffId : clean.cutoffId;
          next.items = clean.items.map(function (entry) { return archiveCopy(rawItems.has(entry.id) ? rawItems.get(entry.id) : entry, replacing ? entry.archived : undefined); });
        }
        var itemId = preserveItems ? '' : typeof m.itemId === 'string' ? m.itemId : '', before = old ? withoutId(preserveItems ? rawOld : old) : null, after = copy(next);
        if (itemId) {
          before = old ? (old.items || []).filter(function (x) { return x.id === itemId; })[0] || null : null;
          after = next.items.filter(function (x) { return x.id === itemId; })[0] || null;
        }
        var audit = { v: next.v, itemId: itemId, action: typeof m.action === 'string' ? m.action : (old ? 'update' : 'create'), before: copy(before), after: copy(after), at: at, by: by };
        tx.set(sr, next); tx.set(ref(c, ['suppliers', sid, 'audit', String(next.v)]), audit);
        return Object.assign({ id: sid }, copy(next));
      }, true).then(remember);
    }
    // A split saves both catalogue revisions and both audits in one transaction. History is never copied or rewritten.
    async function saveSplit(sourcePlan, targetPlan, moved, historyItems, reservedIds, parentOrderAt) {
      var c = await access(true);
      return transaction(c, async function (tx, by) {
        var sourceRef = ref(c, ['suppliers', sourcePlan.id]), targetRef = ref(c, ['suppliers', targetPlan.id]);
        var sourceSnap = await tx.get(sourceRef), targetSnap = await tx.get(targetRef);
        var sourceRaw = data(sourceSnap), targetRaw = data(targetSnap), source = catalogueData(sourceSnap), target = catalogueData(targetSnap);
        if (!source || source.v !== sourcePlan.v || (target ? target.v : 0) !== targetPlan.v) throw error('stale', 'A supplier changed after the split was reviewed. Refresh the catalogue and retry.');
        if (source.historyFrom) throw error('invalid', 'A supplier already split from another catalogue cannot be split again.');
        if (target && target.historyFrom && target.historyFrom !== source.id) throw error('invalid', 'The destination supplier already exists with a different history source.');
        var firstAttachment = !target || !target.historyFrom;
        if (JSON.stringify(splitHistoryItems(source, target, moved, reservedIds)) !== JSON.stringify(historyItems)) throw error('stale', 'The destination item matches changed after the split was reviewed. Refresh before retrying.');
        var sourceClean = cleanSupplier(source.id, source, sourcePlan.patch), targetClean = cleanSupplier(targetPlan.id, target, targetPlan.patch);
        var sourceItems = new Map(source.items.map(function (entry) { return [entry.id, entry]; }));
        var sourceRawItems = new Map(sourceRaw.items.map(function (entry) { return [entry.id, entry]; }));
        var targetItems = new Map((target ? target.items : []).map(function (entry) { return [entry.id, entry]; }));
        var targetRawItems = new Map((targetRaw ? targetRaw.items : []).map(function (entry) { return [entry.id, entry]; }));
        var movedIds = new Set(moved), parentByTarget = new Map(moved.map(function (parentId) { return [historyItems[parentId], parentId]; }));
        sourceClean.items.forEach(function (entry) {
          if (!sourceItems.has(entry.id)) return;
          var expected = archiveCopy(sourceItems.get(entry.id), sourcePlan.replaceItems ? entry.archived : undefined); if (movedIds.has(entry.id)) expected.archived = true;
          if (JSON.stringify(entry) !== JSON.stringify(expected)) throw error('invalid', 'The split cannot overwrite current source item details. Refresh before retrying.');
        });
        targetClean.items.forEach(function (entry) {
          var before = targetItems.get(entry.id);
          if (!before && parentByTarget.has(entry.id)) { before = copy(sourceItems.get(parentByTarget.get(entry.id))); before.id = entry.id; }
          if (before && targetPlan.replaceItems) before = archiveCopy(before, entry.archived);
          if (before && JSON.stringify(entry) !== JSON.stringify(before)) throw error('invalid', 'The split cannot overwrite current item details. Refresh before retrying.');
        });
        var sourceChanged = source.name !== sourceClean.name || source.cutoffId !== sourceClean.cutoffId || JSON.stringify(source.items) !== JSON.stringify(sourceClean.items);
        var targetChanged = firstAttachment || target.name !== targetClean.name || target.cutoffId !== targetClean.cutoffId || JSON.stringify(target.items) !== JSON.stringify(targetClean.items);
        if (!sourceChanged && !targetChanged) return [sourceRaw, targetRaw];
        var at = Math.max(B.now(), source.at + 1, target ? target.at + 1 : 0, parentOrderAt || 0), nextSource = { name: sourceClean.name, cutoffId: sourceClean.cutoffId, v: source.v + 1, items: sourceClean.items.map(function (entry) {
          if (!sourceRawItems.has(entry.id)) return copy(entry);
          var value = archiveCopy(sourceRawItems.get(entry.id), sourcePlan.replaceItems ? entry.archived : undefined); if (movedIds.has(entry.id)) value.archived = true; return value;
        }), at: at, by: by };
        var nextTarget = { name: target ? targetRaw.name : targetClean.name, cutoffId: targetClean.cutoffId, v: target ? target.v + 1 : 1,
          items: targetClean.items.map(function (entry) {
            if (targetRawItems.has(entry.id)) return archiveCopy(targetRawItems.get(entry.id), targetPlan.replaceItems ? entry.archived : undefined);
            if (parentByTarget.has(entry.id)) { var value = archiveCopy(sourceRawItems.get(parentByTarget.get(entry.id)), targetPlan.replaceItems ? entry.archived : undefined); value.id = entry.id; return value; }
            return copy(entry);
          }),
          at: at, by: by, historyFrom: source.id, historyBefore: firstAttachment ? at : target.historyBefore };
        if (firstAttachment) nextTarget.historyItems = copy(historyItems);
        else if (own(target, 'historyItems')) nextTarget.historyItems = copy(target.historyItems);
        // Check the final stored shape, including the immutable history boundary, before the first write.
        core().cleanSupplier(Object.assign({ id: source.id }, nextSource), source);
        core().cleanSupplier(Object.assign({ id: targetPlan.id }, nextTarget), firstAttachment ? null : target);
        var sourceAudit = { v: nextSource.v, itemId: '', action: 'split-source', before: withoutId(sourceRaw), after: copy(nextSource), at: at, by: by };
        var targetAudit = { v: nextTarget.v, itemId: '', action: target ? 'split-import' : 'split-supplier',
          before: targetRaw ? withoutId(targetRaw) : { sourceSid: source.id, itemIds: moved.slice() }, after: copy(nextTarget), at: at, by: by };
        tx.set(sourceRef, nextSource); tx.set(ref(c, ['suppliers', source.id, 'audit', String(nextSource.v)]), sourceAudit);
        tx.set(targetRef, nextTarget); tx.set(ref(c, ['suppliers', targetPlan.id, 'audit', String(nextTarget.v)]), targetAudit);
        return [Object.assign({ id: source.id }, copy(nextSource)), Object.assign({ id: targetPlan.id }, copy(nextTarget))];
      }, true).then(function (saved) { saved.forEach(remember); return saved; });
    }
    // Import is a deliberate chef action. Validate every supplier and split before the first write.
    async function importCatalogue(payload, mapping, expectedVersions) {
      var validated = core().validateCatalogue(payload), maps = Object.assign({}, mapping || {});
      var importContext = (await access(true)).ctx;
      var existing = await loadSuppliers(), byId = new Map(existing.map(function (s) { return [s.id, s]; })), owners = new Map(), plans = [];
      check(importContext, true);
      if (existing.bad && existing.bad.length) throw error('invalid', 'Some supplier records could not be read. Resolve them before importing the catalogue. Nothing was changed.');
      var resolved = core().resolveCatalogueDestinations(validated, existing), list = resolved.payload.suppliers;
      // The review already has every catalogue version. Compare replacement targets in this existing read before any writes.
      if (expectedVersions != null && list.some(function (s) { return s.replaceItems; })) {
        if (typeof expectedVersions !== 'object' || Array.isArray(expectedVersions)) throw error('invalid', 'Review the current catalogue before replacing its item list.');
        list.forEach(function (s) {
          if (!s.replaceItems) return;
          var expected = own(expectedVersions, s.id) ? expectedVersions[s.id] : 0, current = byId.get(s.id);
          if (!Number.isInteger(expected) || expected < 0) throw error('invalid', 'Review the current catalogue before replacing its item list.');
          if ((current ? current.v : 0) !== expected) throw error('stale', 'The catalogue changed after this replacement was reviewed. Refresh and review it again before importing.');
        });
      }
      resolved.reuses.forEach(function (reuse) { if (!own(maps, reuse.id) && own(maps, reuse.incomingId)) maps[reuse.id] = maps[reuse.incomingId]; });
      existing.forEach(function (s) { s.items.forEach(function (entry) { if (!owners.has(entry.id)) owners.set(entry.id, new Set()); owners.get(entry.id).add(s.id); }); });
      var split = previewSplit(resolved.payload, existing);
      var splitTarget = split ? list.filter(function (s) { return s.id === split.targetId; })[0] : null;
      var splitSource = split ? byId.get(split.sourceId) : null, destination = split ? byId.get(split.targetId) : null;
      var moved = split ? split.moved : [], firstAttachment = split && (!destination || !destination.historyFrom);
      list.forEach(function (s) {
        var old = byId.get(s.id), cid = Object.prototype.hasOwnProperty.call(maps, s.id) ? maps[s.id] : (old ? old.cutoffId : s.cutoffId);
        if (s.historyFrom && (!old || s.historyFrom !== old.historyFrom || s.historyBefore !== old.historyBefore)) throw error('invalid', 'Use an explicit split file to create a supplier history source.');
        if (own(s, 'historyItems') && (!old || JSON.stringify(s.historyItems) !== JSON.stringify(old.historyItems))) throw error('invalid', 'A saved supplier history mapping cannot be changed.');
        var existingItems = new Map((old ? old.items : []).map(function (entry) { return [entry.id, entry]; })), included = new Set();
        var parentItems = s === splitTarget ? new Map(splitSource.items.map(function (entry) { return [entry.id, entry]; })) : null;
        var items = s.items.map(function (entry) {
          var fromParent = parentItems && parentItems.has(entry.id), itemId = fromParent ? split.historyItems[entry.id] : entry.id;
          if (included.has(itemId)) throw error('invalid', 'The destination sequence repeats a matched item. Nothing was changed.');
          included.add(itemId);
          var before = existingItems.get(itemId);
          if (fromParent) {
            var original = parentItems.get(entry.id); core().cleanItem(entry, original);
            var selected = archiveCopy(before || original, s.replaceItems ? entry.archived : undefined); selected.id = itemId; return selected;
          }
          if (before) { core().cleanItem(entry, before); return archiveCopy(before, s.replaceItems ? entry.archived : undefined); }
          if (owners.has(entry.id)) throw error('invalid', 'The item ' + entry.name + ' already belongs to another supplier. Keep its saved supplier and item ID.');
          owners.set(entry.id, new Set([s.id])); return copy(entry);
        });
        if (old) old.items.forEach(function (entry) { if (!included.has(entry.id)) items.push(archiveCopy(entry, s.replaceItems ? true : undefined)); });
        if (splitSource && s.id === splitSource.id) {
          var ids = new Set(moved); items.forEach(function (entry) { if (ids.has(entry.id)) entry.archived = true; });
        }
        var firstSplitSource = splitSource && s.id === splitSource.id && firstAttachment;
        var patch = { name: firstSplitSource ? s.name : old ? old.name : s.name, cutoffId: cid || '', items: items };
        cleanSupplier(s.id, old, patch);
        var unchanged = old && old.name === patch.name && old.cutoffId === patch.cutoffId && JSON.stringify(old.items) === JSON.stringify(patch.items);
        plans.push({ id: s.id, v: old ? old.v : 0, patch: patch, replaceItems: s.replaceItems === true, unchanged: unchanged ? copy(old) : null });
      });
      var sourcePlan = splitSource ? plans.filter(function (p) { return p.id === splitSource.id; })[0] : null;
      var targetPlan = splitTarget ? plans.filter(function (p) { return p.id === splitTarget.id; })[0] : null;
      if (sourcePlan && sourcePlan.patch.cutoffId && sourcePlan.patch.cutoffId === targetPlan.patch.cutoffId) throw error('invalid', 'Each separate supplier needs its own order reminder. Choose different links before importing.');
      // A previous order can be ahead of this device's clock. One bounded query (at most two orders) includes it in the first split.
      var parentOrderAt = 0;
      if (firstAttachment) {
        var latestParent = await page(splitSource.id, 'orders', 1); check(importContext, true);
        if (latestParent.rows.length) parentOrderAt = latestParent.rows[0].at;
      }
      var saved = [], splitSaved = false;
      try {
        for (var i = 0; i < plans.length; i++) {
          check(importContext, true); var p = plans[i];
          if (splitTarget && (p.id === sourcePlan.id || p.id === targetPlan.id)) {
            if (!splitSaved) { saved = saved.concat(await saveSplit(sourcePlan, targetPlan, moved, split.historyItems, split.reservedIds, parentOrderAt)); splitSaved = true; check(importContext, true); }
            continue;
          }
          if (p.unchanged) { saved.push(p.unchanged); continue; }
          saved.push(await saveCatalogue(p.id, p.v, p.patch, { action: p.replaceItems ? 'replace-import' : 'import' })); check(importContext, true);
        }
      } catch (e) { e.saved = saved; throw e; }
      return saved;
    }
    /* One catalogue query on Apply, followed by the existing guarded transaction per changed supplier (one current
       document read and two writes). Re-match every row and check every reviewed revision before the first write.
       Order history and all item fields stay untouched. A later concurrent edit can stop a partially applied set. */
    async function applyTemplateOrder(payload, expectedVersions) {
      var validated = core().validateTemplateOrder(payload), importContext = (await access(true)).ctx;
      var existing = await loadSuppliers(); check(importContext, true);
      if (existing.bad && existing.bad.length) throw error('invalid', 'Some supplier records could not be read. Resolve them before matching template items. No sequence was changed.');
      var planned = core().planTemplateOrder(validated, existing), versions = expectedVersions || {}, byId = new Map(existing.map(function (s) { return [s.id, s]; }));
      planned.plans.forEach(function (plan) {
        if (!Object.prototype.hasOwnProperty.call(versions, plan.id) || versions[plan.id] !== plan.v) throw error('stale', 'The catalogue changed after the template review. Refresh and check the template order before saving.', { current: byId.get(plan.id) });
      });
      var saved = [], unchanged = [];
      try {
        for (var i = 0; i < planned.plans.length; i++) {
          check(importContext, true);
          var plan = planned.plans[i];
          if (!plan.changed) { unchanged.push(copy(byId.get(plan.id))); continue; }
          saved.push(await saveCatalogue(plan.id, plan.v, { items: plan.items }, { action: 'reorder' })); check(importContext, true);
        }
      } catch (e) { e.saved = saved; e.unchanged = unchanged; throw e; }
      return { saved: saved, unchanged: unchanged, matched: planned.matched, total: planned.total };
    }
    function linesFor(items, lines) {
      if (!Array.isArray(lines) || !lines.length || lines.length > 300) throw error('invalid', 'Enter between 1 and 300 item quantities.');
      var used = new Set(), ix = new Map(items.map(function (i) { return [i.id, i]; })), quantities = Object.create(null), stocks = Object.create(null), suggestions = Object.create(null), units = { qty: Object.create(null), stock: Object.create(null) };
      lines.forEach(function (l) {
        var i = ix.get(l.itemId);
        if (!i || i.archived || used.has(i.id)) throw error('invalid', 'An ordered item is missing, repeated or archived. Refresh the catalogue.');
        used.add(i.id);
        var q = core().parseQuantity(l.qty);
        if (!q || q.amount !== l.amount || q.unit !== l.unit) throw error('invalid', 'Every ordered item needs a positive quantity and its unit.');
        quantities[i.id] = l.qty; stocks[i.id] = l.stock || ''; suggestions[i.id] = l.suggestion || '';
        // Review has already resolved each field's unit. Never apply a different catalogue default at save time.
        units.qty[i.id] = q.unit; units.stock[i.id] = '';
      });
      return core().snapshotLines(items, quantities, stocks, suggestions, units);
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
        // A source order recorded after a split must sort after its history boundary, even on a lagging device clock.
        var at = Math.max(B.now(), supplier.at + 1);
        var order = { sid: sid, supplierName: supplier.name, v: supplier.v, at: at, day: B.day(at), deliveryDay: delivery,
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
    // given: what exportAll() already read for Move PIN, which counts the records before it writes any (7 Nov 2026), so
    // they are read once. Without it the records are read here as before.
    async function copyTo(newPin, given) {
      if (!/^\d{4,6}$/.test(newPin) || newPin === B.base()[1]) throw error('invalid', 'Choose a different kitchen PIN.');
      var initial = { key: B.context(), generation: generation }, out = given && Array.isArray(given.suppliers) ? given : await exportAll(); check(initial, false, true);
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
    return { loadSuppliers: loadSuppliers, load: load, history: history,
      audit: function (sid, n, cursor) { return page(sid, 'audit', n, cursor); }, saveCatalogue: saveCatalogue, importCatalogue: importCatalogue, previewSplit: previewSplit, applyTemplateOrder: applyTemplateOrder,
      record: record, link: link, exportAll: exportAll, copyTo: copyTo, reset: function () { generation++; catalogues.clear(); } };
  }
  window.LK_SUP_STORE = { API: API, templateOrder: 1, catalogueOrder: 1, splitCatalogue: 1, splitHistoryItems: splitHistoryItems, create: create };
})();
