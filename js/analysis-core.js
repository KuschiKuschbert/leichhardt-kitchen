/* Private analysis: recorded activity is evidence, never consumption or competence. Shared with node. */
(function () {
  'use strict';
  var sources = ['prep', 'orders', 'waste', 'transfers', 'supplierOrders', 'deliveries', 'functions'];
  function key(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function map() { return Object.create(null); }
  function count(o, k, n) { o[k] = (o[k] || 0) + (n == null ? 1 : n); }
  function active(x) { return x && !x.deleted && !x.removed && !x.tst; }
  function prepPerson(x) {
    if (!x.done) return '';
    // Older clients can leave prepared fields after Undo. Credit them only for their original tick cycle.
    var prepared = x.done === true && typeof x.preparedById === 'string' && x.preparedById.trim() && x.preparedById.length <= 80
      && typeof x.preparedBy === 'string' && x.preparedBy.trim() && x.preparedBy.length <= 80
      && typeof x.preparedAt === 'number' && Number.isFinite(x.preparedAt) && x.preparedAt > 0 && x.preparedAt === x.doneAt;
    return prepared ? x.preparedById : (x.doneById || '');
  }
  function identity(r) { return r.itemId ? 'supplier:' + r.supplierId + ':' + r.itemId : 'recipe:' + r.recipeId; }
  function resolve(e, refs) {
    var matches = e.itemId ? refs.filter(function (r) { return r.itemId === e.itemId && r.supplierId === e.supplierId; }) : [];
    // A supplier ingredient's related recipe is a reference link, not proof that the ingredient is that dish.
    if (!matches.length && e.recipe) matches = refs.filter(function (r) { return !r.itemId && r.recipeId === e.recipe; });
    if (!matches.length) matches = refs.filter(function (r) { return key(r.alias) === key(e.text); });
    var ids = matches.map(identity).filter(function (id, i, all) { return all.indexOf(id) === i; });
    return ids.length === 1 ? matches[0] : null;
  }
  function daily(day, input, refs) {
    refs = refs || [];
    var signatures = map();
    var out = { v: 1, day: day, counts: {}, excluded: {}, quality: { missingText: 0, missingSection: 0, unknownUnit: 0, unmatched: 0, ambiguous: 0, possibleDuplicates: 0 }, entries: [] };
    sources.forEach(function (source) {
      out.counts[source] = 0; out.excluded[source] = 0;
      (input[source] || []).forEach(function (x) {
        if (!active(x) || ((source === 'prep' || source === 'orders') && x.rolled) || (source === 'functions' && x.status !== 'confirmed')) { out.excluded[source]++; return; }
        var e = { source: source, id: x.id || '', text: String(x.text || x.name || x.supplier || '').trim().slice(0, 160),
          section: String(x.station || '').slice(0, 80), person: source === 'prep' ? prepPerson(x) : x.done ? (x.doneById || '') : '',
          recipe: x.recipe || '', supplierId: x.sid || '', itemId: x.itemId || '', qty: String(x.qty == null ? '' : x.qty).slice(0, 80),
          amount: typeof x.amount === 'number' && Number.isFinite(x.amount) ? x.amount : null,
          unit: String(x.unit || '').slice(0, 40), reason: String(x.reason || '').slice(0, 80),
          dir: x.dir || '', fn: !!x.fn, done: !!x.done };
        if (!e.text) out.quality.missingText++;
        if (source === 'prep' && !e.section) out.quality.missingSection++;
        if ((source === 'waste' || source === 'transfers' || source === 'supplierOrders') && !e.unit) out.quality.unknownUnit++;
        var r = resolve(e, refs);
        e.ref = r ? identity(r) : e.itemId && e.supplierId ? 'supplier:' + e.supplierId + ':' + e.itemId : e.recipe ? 'recipe:' + e.recipe : '';
        e.label = r ? r.label : e.text;
        if (['prep', 'orders', 'waste', 'transfers', 'supplierOrders'].indexOf(source) >= 0 && e.text) {
          if (!e.ref) out.quality.unmatched++;
          if (!r && refs.filter(function (a) { return key(a.alias) === key(e.text); }).length > 1) out.quality.ambiguous++;
        }
        var signature = JSON.stringify([source, key(e.text), e.section, e.qty, e.amount, e.unit, e.dir, e.fn]);
        if (signatures[signature]) out.quality.possibleDuplicates++;
        signatures[signature] = true;
        out.entries.push(e); out.counts[source]++;
      });
    });
    return out;
  }
  function aggregate(days, section) {
    var items = map(), sections = map(), people = map(), quality = {}, counts = {}, coverage = {};
    var lastDays = days.slice(-14).map(function (d) { return d.day; }), previousDays = days.slice(-28, -14).map(function (d) { return d.day; });
    days.forEach(function (d) {
      Object.keys(d.quality).forEach(function (k) { count(quality, k, d.quality[k]); });
      sources.forEach(function (s) { if (d.counts[s]) count(coverage, s); });
      d.entries.forEach(function (e) {
        if (section && e.section !== section) return;
        count(counts, e.source);
        if (e.section) count(sections, e.section);
        if (e.person && e.source === 'prep') { var p = people[e.person] = people[e.person] || map(); count(p, e.section || 'Section not recorded'); }
        if (!e.text || ['deliveries', 'functions'].indexOf(e.source) >= 0) return;
        // Unconfirmed names stay separated by source. A confirmed reference is the only cross-source join.
        var id = e.ref ? 'ref:' + e.ref : e.source + ':' + key(e.text);
        var a = items[id] = items[id] || { id: id, ref: e.ref, text: e.label, counts: {}, days: {}, weekdays: {}, amounts: {}, quantities: {}, reasons: {}, routine: { recent: 0, previous: 0 }, functionLines: 0, examples: [] };
        a.text = e.label;
        count(a.counts, e.source); a.days[d.day] = true;
        var dw = new Date(d.day + 'T12:00:00Z').getUTCDay();
        var wd = a.weekdays[e.source] = a.weekdays[e.source] || {}; count(wd, String(dw));
        if (e.fn) a.functionLines++;
        if (e.source === 'prep' && !e.fn) { if (lastDays.indexOf(d.day) >= 0) a.routine.recent++; else if (previousDays.indexOf(d.day) >= 0) a.routine.previous++; }
        if (e.amount != null) count(a.amounts, e.source + '|' + (e.unit || 'unit not set') + (e.dir ? '|' + e.dir : ''), e.amount);
        if (e.qty) count(a.quantities, e.source + '|' + e.qty);
        if (e.reason) count(a.reasons, e.reason);
        if (a.examples.length < 6) a.examples.push({ day: d.day, source: e.source, id: e.id, supplierId: e.supplierId });
      });
    });
    return { counts: counts, quality: quality, coverage: coverage, sections: sections, people: people, comparison: { recentDays: lastDays.length, previousDays: previousDays.length },
      items: Object.keys(items).map(function (k) { var a = items[k]; a.sample = Object.keys(a.days).length; delete a.days; return a; }).sort(function (a, b) { return b.sample - a.sample || a.text.localeCompare(b.text); }) };
  }
  var api = { key: key, daily: daily, aggregate: aggregate, resolve: resolve, identity: identity, sources: sources };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.LK_ANALYSIS = api;
})();
