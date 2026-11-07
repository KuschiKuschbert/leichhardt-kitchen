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
  /* The Review desk's two queues, shared with the nightly job so the admin Dashboard counts them the same way. */
  // Item links: recorded names in a summary that no saved reference covers yet.
  function linkQueue(summary, refs) {
    refs = refs || [];
    return ((summary && summary.items) || []).filter(function (item) {
      return !refs.some(function (r) { return key(r.alias) === key(item.text) || (item.ref && identity(r) === item.ref && key(r.label) === key(item.text)); });
    });
  }
  function trainingRecent(a, b) { return String(b.day || '').localeCompare(String(a.day || '')) || (+b.at || 0) - (+a.at || 0) || String(a.id || '').localeCompare(String(b.id || '')); }
  // The head chef's sections (config/main kitSecs), else the sections in the summary.
  function trainingSections(configured, summary) {
    var sections = (configured || []).slice();
    if (!sections.length && summary) sections = Object.keys(summary.sections || {});
    return sections.filter(function (section, index) { return section && sections.indexOf(section) === index; }).sort(function (a, b) { return a.localeCompare(b); });
  }
  function sectionAssessment(records, person, section) {
    // A recipe belongs to a section, but assessing that recipe does not assess the whole section.
    return (records || []).filter(function (r) { return r.personId === person && r.section === section && !r.recipeId; }).sort(trainingRecent)[0];
  }
  function trainingTicks(summary, person, section) { return summary && summary.people && summary.people[person] ? (+summary.people[person][section] || 0) : 0; }
  // Training: every active person and section without a confirmed whole-section assessment, in training first. With
  // shiftCounts (teamShiftCounts(), Today's team), each row also has the shifts that person worked on that section.
  function trainingQueue(summary, records, people, configured, shiftCounts) {
    var out = [], sections = trainingSections(configured, summary);
    (people || []).forEach(function (p) { sections.forEach(function (section) {
      var assessment = sectionAssessment(records, p.id, section);
      if (!assessment || assessment.status !== 'confirmed') out.push({ person: p, section: section, assessment: assessment, ticks: trainingTicks(summary, p.id, section), shifts: teamShiftsOn(shiftCounts, p.id, section) });
    }); });
    return out.sort(function (a, b) { return (a.assessment && a.assessment.status === 'in-training' ? 0 : 1) - (b.assessment && b.assessment.status === 'in-training' ? 0 : 1) || b.ticks - a.ticks || b.shifts - a.shifts || String(a.person.name || '').localeCompare(String(b.person.name || '')) || a.section.localeCompare(b.section); });
  }
  /* Today's team, step 4 (head chef, 7 Nov 2026: every section allocated or worked counts for training). Built by the
     nightly job into teamsum/main, read by the chefs' pages. A stint, { p: person, sec: section name, sh: shift }, is one
     person on one section on one shift of one day: from the chef's plan (team/<day>) and from the person's own picks and moves (shifts/<day>_<id>: its log, or,
     with no log, the day's pick when the plan did not have them on). Sections by their name now (a renamed section
     counts under its new name). Shifts worked are activity, never competence. */
  function teamId(v) { return typeof v === 'string' && v.length > 0 && v.length <= 80 && v !== '__proto__' ? v : ''; }
  function teamSecName(secs, id) { var s = (secs || []).filter(function (x) { return x && x.id === id; })[0]; return s && typeof s.name === 'string' ? s.name.replace(/\s+/g, ' ').trim().slice(0, 40) : ''; }
  function teamStints(team, shifts, secs, from, to) {
    var days = map(), planned = map();
    function add(day, id, sec, sh) {
      if (typeof day !== 'string' || day < from || day > to || !teamId(id) || !sec) return;
      var d = days[day] = days[day] || { s: [], k: map() }, k = id + '|' + sh + '|' + sec;
      if (d.k[k]) return; d.k[k] = 1; d.s.push({ p: id, sec: sec, sh: sh });
    }
    (team || []).forEach(function (t) {
      if (!t || typeof t.day !== 'string' || !Array.isArray(t.on)) return;
      t.on.forEach(function (o) { if (!o || !teamId(o.id)) return; planned[t.day + '|' + o.id] = 1; add(t.day, o.id, teamSecName(secs, o.sec), teamId(o.sh)); });
    });
    (shifts || []).forEach(function (x) {
      if (!x || typeof x.day !== 'string' || !teamId(x.by)) return;
      var log = Array.isArray(x.log) ? x.log : [], own = typeof x.name === 'string' ? x.name.replace(/\s+/g, ' ').trim().slice(0, 40) : '';
      log.forEach(function (l) { if (l && typeof l.sec === 'string') add(x.day, x.by, teamSecName(secs, l.sec) || (l.sec === x.sec ? own : ''), teamId(l.sh)); });
      // the head chef and the sous chefs are given their role, not a section
      if (!log.length && typeof x.sec === 'string' && x.sec && x.sec !== 'head' && x.sec !== 'sous' && !planned[x.day + '|' + x.by]) add(x.day, x.by, teamSecName(secs, x.sec) || own, teamId(x.sh));
    });
    return Object.keys(days).sort().map(function (day) { return { day: day, s: days[day].s }; });
  }
  // shifts per person and section from teamStints() days, those from 'from' on: { person: { section: n } }
  function teamShiftCounts(days, from) {
    var out = map();
    (days || []).forEach(function (d) {
      if (!d || typeof d.day !== 'string' || (from && d.day < from) || !Array.isArray(d.s)) return;
      d.s.forEach(function (x) { if (!x || !teamId(x.p) || typeof x.sec !== 'string' || !x.sec) return; var p = out[x.p] = out[x.p] || map(); count(p, x.sec); });
    });
    return out;
  }
  function teamShiftsOn(counts, person, section) { return counts && counts[person] ? (+counts[person][section] || 0) : 0; }
  /* Each person's usual section on a weekday's shift, from the chef's plans on the last 'weeks' same weekdays before
     today: { '<weekday>|<shift>': { person: [section id, times, of] } }, of being how many of those weekdays had a plan.
     Only a section given at least twice; a tie goes to the more recent. */
  function teamUsual(team, today, weeks) {
    weeks = weeks || 8;
    var out = map(), byDow = map();
    (team || []).filter(function (t) { return t && typeof t.day === 'string' && t.day < today && Array.isArray(t.on) && t.on.length; })
      .sort(function (a, b) { return a.day < b.day ? 1 : a.day > b.day ? -1 : 0; })
      .forEach(function (t) { var dow = new Date(t.day + 'T12:00:00Z').getUTCDay(), l = byDow[dow] = byDow[dow] || []; if (l.length < weeks) l.push(t); });
    Object.keys(byDow).forEach(function (dow) {
      var list = byDow[dow], tally = map();
      list.forEach(function (t, i) { t.on.forEach(function (o) {
        if (!o || !teamId(o.id) || !teamId(o.sh) || !teamId(o.sec)) return;
        var a = tally[o.sh] = tally[o.sh] || map(), b = a[o.id] = a[o.id] || map(), c = b[o.sec] = b[o.sec] || { n: 0, last: weeks };
        c.n++; if (i < c.last) c.last = i;
      }); });
      Object.keys(tally).forEach(function (sh) { Object.keys(tally[sh]).forEach(function (id) {
        var secs = tally[sh][id], best = Object.keys(secs).sort(function (x, y) { return secs[y].n - secs[x].n || secs[x].last - secs[y].last || (x < y ? -1 : 1); })[0];
        if (secs[best].n >= 2) { var k = dow + '|' + sh; (out[k] = out[k] || map())[id] = [best, secs[best].n, list.length]; }
      }); });
    });
    return out;
  }
  // who is In training on a whole section (their latest section assessment): { person: [section names] }
  function teamLearning(records, people, sections) {
    var out = map();
    (people || []).forEach(function (p) { (sections || []).forEach(function (section) {
      var a = sectionAssessment(records, p.id, section);
      if (teamId(p.id) && a && a.status === 'in-training') (out[p.id] = out[p.id] || []).push(section);
    }); });
    return out;
  }
  var api = { key: key, daily: daily, aggregate: aggregate, resolve: resolve, identity: identity, sources: sources,
    prepPerson: prepPerson, linkQueue: linkQueue, trainingRecent: trainingRecent, trainingSections: trainingSections, sectionAssessment: sectionAssessment, trainingTicks: trainingTicks, trainingQueue: trainingQueue,
    teamStints: teamStints, teamShiftCounts: teamShiftCounts, teamShiftsOn: teamShiftsOn, teamUsual: teamUsual, teamLearning: teamLearning };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.LK_ANALYSIS = api;
})();
