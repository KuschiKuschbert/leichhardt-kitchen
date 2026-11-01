/* Loaded only in the verified admin workspace. Private records stay in memory. */
(function () {
  'use strict';
  var api, context = '', state;
  var labels = { prep: 'Prep lines', orders: 'Staff order lines', waste: 'Waste entries', transfers: 'Transfer entries', supplierOrders: 'Supplier order lines', deliveries: 'Delivery receipts', functions: 'Confirmed functions' };
  function reset() { context = ''; state = { cache: {}, loading: {}, errors: {}, request: 0, range: 30, query: '', referenceQuery: '', referenceSearchDraft: '', referenceLimit: 20, confirmedLimit: 20, item: '', evidence: null, draft: null, message: '', busy: false, page: '', draftOpen: false, draftPage: '', origin: null, disclosures: {}, selectedRef: '', selectedTraining: '', trainingLimit: 12, savedTrainingLimit: 20, reviewedTraining: [] }; }
  reset();
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function button(action, text, value, disabled) { return '<button type="button" class="btn" data-ai="' + action + '" data-value="' + esc(value || '') + '"' + (disabled ? ' disabled' : '') + '>' + esc(text) + '</button>'; }
  function block(title, body, cls) { return '<section class="set-block' + (cls ? ' ' + esc(cls) : '') + '"><h3 class="label">' + esc(title) + '</h3>' + body + '</section>'; }
  function help(title, body, key, cls) {
    return '<details class="ai-help' + (cls ? ' ' + esc(cls) : '') + '"' + (key ? ' data-ai-disclosure="' + key + '"' + (state.disclosures[key] ? ' open' : '') : '') + '><summary>' + esc(title) + '</summary>' + body + '</details>';
  }
  function heading(title, note, kicker) { return '<header class="ai-task-header">' + (kicker ? '<p class="eyebrow ai-task-kicker">' + esc(kicker) + '</p>' : '') + '<h3 class="ai-task-heading" data-k="ai-task-heading" tabindex="-1">' + esc(title) + '</h3>' + (note ? '<p class="hint ai-task-note">' + esc(note) + '</p>' : '') + '</header>'; }
  function queueHeading(title, count, kicker) { return '<header class="ai-queue-head"><div>' + (kicker ? '<p class="eyebrow ai-queue-kicker">' + esc(kicker) + '</p>' : '') + '<h3 class="ai-queue-title">' + esc(title) + '</h3></div>' + (count ? '<span class="ai-queue-count">' + esc(count) + '</span>' : '') + '</header>'; }
  function idleContext(title, note, body) { return '<aside class="ai-idle-context ai-detail-context"><p class="eyebrow">Before you begin</p><h3>' + esc(title) + '</h3><p class="hint">' + esc(note) + '</p>' + (body || '') + '</aside>'; }
  function desk(queue, detail, active) { return '<div class="ai-desk' + (active ? ' has-detail' : '') + '"><section class="ai-queue">' + queue + '</section><section class="ai-detail" aria-label="Current review">' + detail + '</section></div>'; }
  function validContext() { return api && api.allowed() && api.context() === context; }
  function draftVisible(page) { return !!state.draft && state.draftOpen && state.draftPage === (page || state.page); }
  function resumeHTML(page) {
    if (!validContext() || !state.draft || draftVisible(page)) return '';
    var d = state.draft, subject = d.kind === 'references' ? d.alias || 'item link' : (api.people().filter(function (p) { return p.id === d.personId; })[0] || {}).name || 'training assessment';
    return '<aside class="ai-resume" role="status"><strong>' + (state.busy ? 'Saving ' : 'Unfinished review: ') + esc(subject) + '</strong><p class="hint">Your entries are kept in this tab.</p>' + button('resume', state.busy ? 'Return to saving record' : 'Resume review') + '</aside>';
  }
  function focusTask() {
    var el = document.querySelector('.ai-detail .ai-task-heading'), detail = document.querySelector('.ai-detail');
    if (el) {
      el.focus({ preventScroll: true });
      if (window.innerWidth < 1100) window.scrollTo(0, 0);
      else if (detail) detail.scrollIntoView({ block: 'start' });
    }
  }
  function origin(action, value) { return { page: state.page, y: window.scrollY || 0, action: action || '', value: value || '' }; }
  function returnTo(from) {
    if (!from) return;
    if (state.page !== from.page) api.page(from.page); else redraw();
    var buttons = document.querySelectorAll('[data-ai]'), found;
    Array.prototype.some.call(buttons, function (el) { if (el.getAttribute('data-ai') === from.action && el.getAttribute('data-value') === from.value) { found = el; return true; } return false; });
    if (found) found.focus({ preventScroll: true });
    if (window.scrollTo) window.scrollTo(0, from.y || 0);
  }
  function backLabel() {
    if (!validContext()) return '';
    if (state.history && state.historyPage === state.page) return 'Back to saved records';
    if (draftVisible()) return state.origin && state.origin.page === 'analysis' ? 'Back to item evidence' : 'Back to review list';
    if (state.page === 'analysis' && (state.item || state.evidence)) return 'Back to item list';
    return '';
  }
  function back() {
    if (!validContext()) return false;
    if (state.busy) return true;
    if (state.history && state.historyPage === state.page) { state.history = ''; redraw(); return true; }
    if (draftVisible()) { state.draftOpen = false; returnTo(state.origin); return true; }
    if (state.page === 'analysis' && (state.item || state.evidence)) { state.item = ''; state.evidence = null; returnTo(state.analysisOrigin); return true; }
    return false;
  }
  function sourceDraft(item) {
    var d = { alias: item.text, label: item.text, recipeId: '', supplierId: '', itemId: '', sourceId: item.id || '' };
    if (item.ref && item.ref.indexOf('recipe:') === 0 && api.recipes().some(function (r) { return 'recipe:' + r.id === item.ref; })) d.recipeId = item.ref.slice(7);
    if (item.ref && item.ref.indexOf('supplier:') === 0) {
      var suppliers = state.cache.suppliers;
      if (suppliers === undefined) return null;
      suppliers.forEach(function (supplier) { (supplier.items || []).forEach(function (entry) {
        if (window.LK_ANALYSIS.identity({ supplierId: supplier.id, itemId: entry.id }) === item.ref) { d.supplierId = supplier.id; d.itemId = entry.id; }
      }); });
    }
    return d;
  }
  function redraw() { if (api && api.allowed() && api.context() === context) api.draw(); }
  function load(name, list) {
    if (state.cache[name] !== undefined || state.loading[name] || state.errors[name]) return;
    var s = state, c = context, request = s.request; s.loading[name] = true;
    (list ? api.list(name) : api.get(name)).then(function (data) {
      if (state !== s || request !== s.request || c !== api.context() || !api.allowed()) return;
      s.cache[name] = data; s.loading[name] = false; redraw();
    }, function () { if (state !== s || request !== s.request || c !== api.context() || !api.allowed()) return; s.loading[name] = false; s.errors[name] = true; redraw(); });
  }
  function data(name, list) { load(name, list); return state.cache[name]; }
  function waiting(name) {
    return state.errors[name] ? '<p class="p-err" role="status">Could not load this data. Check the connection and try again.</p>' + button('retry', 'Try again', name) : '<p class="hint" role="status">Loading...</p>';
  }
  function options(list, value, empty) { return '<option value="">' + esc(empty || 'Not linked') + '</option>' + list.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === value ? ' selected' : '') + '>' + esc(x.name || x.title || x.id) + '</option>'; }).join(''); }
  function field(name, label, value, opts) { return '<div class="field"><label class="label" for="ai-' + name + '">' + esc(label) + '</label>' + (opts ? '<select class="search" id="ai-' + name + '" data-k="ai-field-' + name + '" data-ai-field="' + name + '">' + options(opts, value, ['personId', 'assessorId', 'section'].indexOf(name) >= 0 ? 'Choose ' + label.toLowerCase() : 'Not linked') + '</select>' : '<input class="search" id="ai-' + name + '" data-k="ai-field-' + name + '" data-ai-field="' + name + '" maxlength="160" value="' + esc(value) + '">') + '</div>'; }
  function linked(r) {
    if (!r || state.busy && draftVisible()) return '';
    return '<div class="btn-row">' + (r.recipeId ? '<a class="btn" href="#/r/' + encodeURIComponent(r.recipeId) + '">Recipe</a>' : '') +
      (r.guideId ? '<a class="btn" href="#/guides/' + encodeURIComponent(r.guideId) + '">Guide</a>' : '') +
      (r.supplierId ? '<a class="btn" href="#/suppliers/' + encodeURIComponent(r.supplierId) + '">Supplier catalogue</a>' : '') + '</div>';
  }
  function metrics(o) { return '<dl class="ai-metrics">' + Object.keys(o || {}).map(function (k) { return '<div><dt>' + esc(labels[k] || k.replace(/([A-Z])/g, ' $1').toLowerCase()) + '</dt><dd>' + esc(o[k]) + '</dd></div>'; }).join('') + '</dl>'; }
  function summary() { return data('analysis/range-' + state.range); }
  function filters() { return '<div class="btn-row" aria-label="Completed days">' + [7, 30, 90].map(function (n) { return '<button type="button" class="chip" data-ai="range" data-value="' + n + '" aria-pressed="' + (state.range === n) + '">' + n + ' days</button>'; }).join('') + button('refresh', 'Refresh') + '</div>'; }
  function freshness(current, health) {
    if (!current) return '<p class="hint">No analysis has been published yet. The nightly job builds the first 90 completed days.</p>';
    var stale = api.day() !== api.day(current.at);
    return '<p class="' + (stale ? 'p-err' : 'hint') + '" role="status">' + (stale ? 'Older analysis. ' : 'Updated ') + esc(api.clock(current.at)) + '. Coverage ' + esc(current.from) + ' to ' + esc(current.to) + ', ' + current.days + ' completed days. Today is excluded.</p>' +
      (health && health.status === 'failed' ? '<p class="p-err" role="status">The latest analysis run failed. These are the last successful results.</p>' : '');
  }
  function overview() { return references(); }
  function analysisHealth(s) {
    var current = data('analysis/current'), health = data('analysis/health');
    if (current === undefined) return waiting('analysis/current');
    return freshness(current, health) + (current && current.inventory ? '<h4>Available infrastructure</h4>' + metrics(current.inventory) : '') + (s ? '<h4>Source counts</h4>' + metrics(s.counts) + '<h4>Data quality</h4>' + metrics(s.quality) : '') + '<p class="hint">Staff suggestions retain their current behaviour while this evidence is reviewed.</p>';
  }

  function itemDetail(s) {
    var item = s.items.filter(function (x) { return x.id === state.item; })[0];
    if (!item) return '';
    if (item.ref && item.ref.indexOf('supplier:') === 0) data('suppliers', true);
    var refs = data('references', true) || [], r = refs.filter(function (x) { return window.LK_ANALYSIS.identity(x) === item.ref; })[0];
    if (!r && item.ref && item.ref.indexOf('recipe:') === 0) r = { recipeId: item.ref.slice(7) };
    return block('Recorded evidence', '<p class="hint">' + (item.ref ? 'Confirmed or explicit source reference.' : 'Unconfirmed name. Kept separate from other sources.') + ' Recorded on ' + item.sample + ' days.</p>' + metrics(item.counts) +
      '<h4>Recorded amounts, kept by source and unit</h4>' + metrics(item.amounts) + '<h4>Typed quantity patterns</h4>' + metrics(item.quantities) + '<h4>Waste reasons</h4>' + metrics(item.reasons) +
      '<h4>Weekday evidence</h4>' + Object.keys(item.weekdays || {}).map(function (source) { var days = {}; Object.keys(item.weekdays[source]).forEach(function (n) { days[['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][+n]] = item.weekdays[source][n]; }); return '<p>' + esc(labels[source]) + '</p>' + metrics(days); }).join('') +
      (item.routine ? '<p class="hint">Routine prep: ' + item.routine.recent + ' lines in the last ' + s.comparison.recentDays + ' days; ' + item.routine.previous + ' in the preceding ' + s.comparison.previousDays + ' days. Function-related lines are excluded from this comparison.</p>' : '') +
      (item.ref && item.counts.prep && item.counts.waste ? '<p role="note">Review this item before repeating usual prep quantities: matching waste was recorded in this period. Check the waste reasons and source amounts below.</p>' : '') +
      '<p class="hint">Function-related prep and order lines: ' + item.functionLines + '. Counts do not measure consumption or stock.</p>' + linked(r) +
      '<h4>Open recorded evidence</h4><div class="btn-row">' + item.examples.map(function (e) { return button('evidence', e.day + ': ' + (labels[e.source] || e.source), e.day); }).join('') + '</div>' +
      button('map', 'Review reference for this item', JSON.stringify({ itemId: item.id }), !!(item.ref && item.ref.indexOf('supplier:') === 0 && state.cache.suppliers === undefined)) + (state.errors.suppliers ? waiting('suppliers') : ''));
  }
  function evidence(s) {
    if (!state.evidence) return '';
    var path = 'analysisDaily/' + s.generation + '_' + state.evidence, d = data(path);
    if (d === undefined) return block('Source evidence', waiting(path));
    if (!d) return block('Source evidence', '<p class="hint">This generation has expired. Refresh to read current evidence.</p>');
    var selected = s.items.filter(function (x) { return x.id === state.item; })[0];
    var entries = d.entries.filter(function (e) { return !selected || (selected.ref ? e.ref === selected.ref : e.source + ':' + window.LK_ANALYSIS.key(e.text) === selected.id); });
    var limit = state.evidenceLimit || 40;
    return block('Source evidence: ' + d.day, '<p class="hint">' + entries.length + ' eligible records. ' + esc(JSON.stringify(d.excluded)) + ' excluded by source.</p><ul class="ai-list">' + entries.slice(0, limit).map(function (e) { return '<li><strong>' + esc(labels[e.source]) + '</strong>: ' + esc(e.text) + ' ' + esc(e.qty || (e.amount == null ? '' : e.amount + ' ' + (e.unit || '(unit not set)'))) + '<br><small>' + esc(e.section) + ' ' + esc(e.reason) + ' Record: ' + esc(e.id) + (e.fn ? '. Function demand' : '') + '</small>' + (e.text && !e.ref ? button('map', 'Review reference', JSON.stringify({ text: e.text, ref: e.ref || '' })) : '') + '</li>'; }).join('') + '</ul>' + (entries.length > limit ? button('more-evidence', 'Show more records') : ''));
  }
  function analysis() {
    var s = summary(), current = data('analysis/current'), health = data('analysis/health');
    if (s === undefined) return block('Item analysis', waiting('analysis/range-' + state.range));
    if (!s) return block('Item evidence', '<p class="hint">No completed-day analysis is available yet.</p>' + help('Analysis health', analysisHealth()));
    var changedGeneration = current && current.generation !== s.generation ? '<p class="hint" role="status">Newer analysis is available. Refresh to update this report.</p>' : '';
    var sectionOptions = Object.keys(s.sections || {}).map(function (name) { return { id: name, name: name }; });
    if (state.section) {
      var cacheKey = 'section:' + s.generation + ':' + state.range + ':' + state.section;
      if (!state.cache[cacheKey] && !state.loading[cacheKey] && !state.errors[cacheKey]) {
        var st = state, original = s, chosen = state.section, ctx = context, request = st.request; st.loading[cacheKey] = true;
        Promise.all(s.dates.map(function (d) { return api.get('analysisDaily/' + original.generation + '_' + d.day); })).then(function (days) {
          if (state !== st || request !== st.request || ctx !== api.context() || !api.allowed()) return;
          if (days.some(function (d) { return !d; })) throw new Error('expired');
          st.cache[cacheKey] = window.LK_ANALYSIS.aggregate(days, chosen); st.loading[cacheKey] = false; redraw();
        }).catch(function () { if (state === st && request === st.request && ctx === api.context() && api.allowed()) { st.loading[cacheKey] = false; st.errors[cacheKey] = true; redraw(); } });
      }
      if (!state.cache[cacheKey]) return block('Section evidence', filters() + button('clear-section', 'All sections') + waiting(cacheKey));
      var filtered = state.cache[cacheKey];
      s = Object.assign({}, s, filtered, { items: filtered.items.slice(0, 200), totalItems: filtered.items.length, truncated: filtered.items.length > 200 });
    }
    state.analysisData = s;
    var list = s.items.filter(function (x) { return window.LK_ANALYSIS.key(x.text).indexOf(window.LK_ANALYSIS.key(state.query)) >= 0; });
    var queue = queueHeading('Recorded items', list.length + ' matches', 'Source evidence') + filters() + '<p class="hint">' + esc(s.from) + ' to ' + esc(s.to) + '. Today is excluded.</p>' +
      '<label class="label" for="ai-section-filter">Section</label><select class="search" id="ai-section-filter" data-k="ai-analysis-section" data-ai-section>' + options(sectionOptions, state.section, 'All sections') + '</select>' +
      '<form class="ai-queue-search" data-ai-search><label class="label" for="ai-search">Find an item</label><div class="btn-row"><input class="search" id="ai-search" data-k="ai-analysis-search" name="q" value="' + esc(state.query) + '"><button class="btn" type="submit">Search</button></div></form>' +
      '<ul class="ai-list">' + list.slice(0, 40).map(function (x) { return '<li><button type="button" class="ai-review-row" data-ai="item" data-value="' + esc(x.id) + '"' + (state.item === x.id ? ' aria-current="true"' : '') + '><span class="eyebrow ai-row-kind">Recorded evidence</span><strong class="ai-row-title">' + esc(x.text) + '</strong><span class="hint ai-row-meta">' + x.sample + (x.sample === 1 ? ' day. ' : ' days. ') + (x.ref ? 'Source link available' : 'Needs a reference') + '</span></button></li>'; }).join('') + '</ul>' +
      '<p class="hint">' + (list.length ? 'Showing ' + Math.min(list.length, 40) + ' of ' + list.length + ' matches.' : 'No matching recorded items.') + '</p>' +
      help('Coverage and daily records', '<p class="hint">Most active ' + s.items.length + ' of ' + s.totalItems + ' item groups. Original daily evidence remains available. Section filters include only explicitly tagged records.</p>' + metrics(s.coverage) + metrics(s.quality) + '<div class="btn-row">' + (s.dates || []).map(function (d) { return button('day-evidence', d.day, d.day); }).join('') + '</div>');
    var selected = (s.items || []).filter(function (x) { return x.id === state.item; })[0];
    var detail = selected ? heading(selected.text, 'Review its recorded evidence and linked material.') + itemDetail(s) + evidence(s) : state.evidence ? heading('Daily source evidence') + evidence(s) : idleContext('Read with the sources.', 'Choose an item to open its recorded evidence here.', '<p class="hint">Amounts stay separate by source and unit. Recorded activity does not measure consumption or training competence.</p>');
    return changedGeneration + desk(queue, detail, !!selected || !!state.evidence) + help('Analysis health and source coverage', analysisHealth(s));
  }
  function ready(d) {
    if (state.cache[d.kind] === undefined) return false;
    return d.kind === 'references' ? !!(String(d.alias || '').trim() && String(d.label || '').trim() && (d.linkType === 'supplier' ? d.supplierId && d.itemId : d.linkType === 'recipe' && d.recipeId) && (!!d.supplierId === !!d.itemId)) : !!(d.personId && (d.assessType === 'recipe' ? d.recipeId : d.assessType === 'section' && d.section) && d.status && d.assessorId && d.day);
  }
  function rememberDisclosures() {
    if (!document.querySelectorAll) return;
    Array.prototype.forEach.call(document.querySelectorAll('.ai-workspace [data-ai-disclosure]'), function (el) { state.disclosures[el.getAttribute('data-ai-disclosure')] = el.open; });
  }
  function editor(kind) {
    var d = state.draft;
    if (!draftVisible() || d.kind !== kind) return '';
    var recipes = api.recipes(), guides = api.guides(), suppliers = kind === 'references' ? data('suppliers', true) || [] : [], body, evidence = '';
    if (kind === 'references') {
      body = field('alias', 'Recorded name or alias', d.alias) + field('linkType', 'Link this name to', d.linkType, [{ id: 'recipe', name: 'Recipe' }, { id: 'supplier', name: 'Supplier item' }]);
      body += d.linkType === 'supplier' ? field('supplierId', 'Supplier', d.supplierId, suppliers) + field('itemId', 'Supplier item', d.itemId, (suppliers.filter(function (s) { return s.id === d.supplierId; })[0] || {}).items || []) : field('recipeId', 'Recipe', d.recipeId, recipes);
      body += help('Reference name and guide', field('label', 'Reference name', d.label) + field('guideId', 'Guide', d.guideId, guides) + (d.linkType === 'supplier' ? field('recipeId', 'Related recipe, optional', d.recipeId, recipes) : ''), 'reference-options');
      if (d.sourceItem) evidence = help('Recorded context', '<p class="hint">' + esc(d.sourceItem.text) + (Number.isFinite(d.sourceItem.sample) ? '. Recorded on ' + d.sourceItem.sample + (d.sourceItem.sample === 1 ? ' completed day.' : ' completed days.') : '. Original recorded name.') + '</p>' + metrics(d.sourceItem.counts) + linked(d), 'reference-context', 'ai-task-context');
    } else {
      var person = api.people().filter(function (p) { return p.id === d.personId; })[0];
      evidence = help('Activity and saved learning material', '<strong>' + esc(person ? person.name : 'Choose a person') + (d.section ? ': ' + esc(d.section) : '') + '</strong><p class="hint">' + (d.assessType === 'recipe' ? 'Recipe assessment only.' : 'Whole-section assessment.') + ' ' + esc(trainingActivity(state.cache['analysis/range-' + state.range], d.personId, d.section)) + '</p>' + (!state.busy ? trainingMaterials(state.cache.training || [], d.personId, d.section) : ''), 'training-context', 'ai-task-context');
      body = field('personId', 'Person', d.personId, api.people()) + field('assessType', 'What was assessed?', d.assessType, [{ id: 'section', name: 'Whole section' }, { id: 'recipe', name: 'One recipe' }]) +
        field('section', d.assessType === 'recipe' ? 'Section, optional' : 'Section', d.section, api.sections().map(function (section) { return { id: section, name: section }; })) + (d.assessType === 'recipe' ? field('recipeId', 'Recipe', d.recipeId, recipes) : '') +
        field('status', 'Training status', d.status, [{ id: 'not-assessed', name: 'Not assessed' }, { id: 'in-training', name: 'In training' }, { id: 'confirmed', name: 'Confirmed' }]) +
        field('assessorId', 'Assessor', d.assessorId, api.people()) + '<div class="field"><label class="label" for="ai-day">Assessment date</label><input type="date" class="search" id="ai-day" data-k="ai-field-day" data-ai-field="day" value="' + esc(d.day) + '" max="' + api.day() + '"></div>' +
        help('Learning material', field('guideId', 'Guide', d.guideId, guides), 'training-materials');
    }
    var next = !!d.sourceId && state.origin && ['overview', 'references', 'training'].indexOf(state.origin.page) >= 0;
    var recipe = recipes.filter(function (r) { return r.id === d.recipeId; })[0];
    var title = kind === 'references' ? d.alias || 'Item link' : d.assessType === 'recipe' ? (recipe ? recipe.name : 'Recipe assessment') : d.section || 'Training assessment';
    var note = kind === 'references' ? 'Check the recorded name and its target. Saving confirms this link.' : (person ? person.name + '. ' : '') + 'Record an explicit assessment. Prep ticks do not confirm skill.';
    return '<div class="ai-editor">' + (state.cache[kind] === undefined ? waiting(kind) : '') + heading(title, note, kind === 'references' ? 'Review the link' : 'Record an assessment') + evidence +
      '<fieldset class="ai-fields" aria-label="Review fields"' + (state.busy ? ' disabled' : '') + '>' + body + '</fieldset>' +
      '<p class="hint ai-save-note">' + (ready(d) ? 'Save records this decision with revision history.' : kind === 'references' ? 'Choose a recipe or a complete supplier item before confirming.' : 'Choose the person, section or recipe, assessor and assessment date.') + '</p>' +
      '<div class="btn-row ai-actions ai-task-actions" role="group" aria-label="Review actions"><button type="button" class="btn dark" data-ai="save"' + (state.busy || !ready(d) ? ' disabled' : '') + '>' + (state.busy ? 'Saving...' : 'Save and return') + '</button>' +
      (next ? '<button type="button" class="btn" data-ai="save-next"' + (state.busy || !ready(d) ? ' disabled' : '') + '>' + (state.busy ? 'Saving...' : 'Save and next') + '</button>' : '') + '</div><div class="ai-task-secondary">' + button('cancel', 'Cancel changes', '', state.busy) + '</div></div>';
  }

  function referenceItems(s, refs) {
    return (s.items || []).filter(function (item) {
      return !refs.some(function (r) {
        return window.LK_ANALYSIS.key(r.alias) === window.LK_ANALYSIS.key(item.text) ||
          (item.ref && window.LK_ANALYSIS.identity(r) === item.ref && window.LK_ANALYSIS.key(r.label) === window.LK_ANALYSIS.key(item.text));
      });
    });
  }
  function referenceTarget(r) {
    var parts = [], recipe = api.recipes().filter(function (x) { return x.id === r.recipeId; })[0];
    if (r.recipeId) parts.push('Recipe: ' + (recipe ? recipe.name : r.recipeId));
    var supplier = (state.cache.suppliers || []).filter(function (s) { return s.id === r.supplierId; })[0];
    var item = supplier && (supplier.items || []).filter(function (x) { return x.id === r.itemId; })[0];
    if (r.itemId) parts.push('Supplier item: ' + (item ? item.name : r.itemId) + (supplier ? ' (' + supplier.name + ')' : ''));
    var guide = api.guides().filter(function (g) { return g.id === r.guideId; })[0];
    if (r.guideId) parts.push('Guide: ' + (guide ? guide.title : r.guideId));
    return '<span class="hint">' + esc(parts.join('. ')) + '</span>';
  }
  function referenceSearch() {
    return '<form class="ai-queue-search" data-ai-reference-search><label class="label" for="ai-reference-query">Find an item link</label><div class="btn-row"><input class="search" type="search" id="ai-reference-query" data-k="ai-reference-query" data-ai-reference-query name="q" value="' + esc(state.referenceSearchDraft) + '"><button class="btn" type="submit">Search</button>' + button('clear-reference-search', 'Clear') + '</div></form>';
  }
  function references() {
    // On opening this queue, reuse the same once-per-session reference, supplier and 90-day summary reads.
    var refs = data('references', true), s = data('analysis/range-90'); data('suppliers', true);
    var intro = '<p class="hint">Choose a recorded name, check its recipe or supplier item, then confirm the link.</p>';
    // One health document on first queue open, reused until Refresh. No polling or staff reads.
    var health = data('analysis/health'), healthNotice = '';
    if (health && health.status === 'failed') healthNotice = '<p class="p-err" role="status">The latest analysis run failed. The queue uses the last successful results.</p>';
    var query = window.LK_ANALYSIS.key(state.referenceQuery), candidates = refs && s ? referenceItems(s, refs) : [];
    var available = candidates.filter(function (item) { return window.LK_ANALYSIS.key(item.text).indexOf(query) >= 0; });
    var queue = queueHeading('Ready for a closer look', refs && s ? candidates.length + ' to review' : '', 'Item links') + intro + referenceSearch() + '<div class="btn-row">' + button('new-reference', 'Add a link') + button('refresh', 'Refresh') + '</div>';
    if (refs === undefined) queue += waiting('references');
    else if (s === undefined) queue += waiting('analysis/range-90');
    else if (!s) queue += '<p class="hint">No item summary is available yet. Confirmed links are available in Saved records.</p>';
    else queue += '<p class="hint" role="status">' + candidates.length + ' item groups to review. ' + esc(s.from) + ' to ' + esc(s.to) + '.</p><ul class="ai-list">' + available.slice(0, state.referenceLimit).map(function (item) {
      return '<li><button type="button" class="ai-review-row" data-ai="review-reference" data-value="' + esc(item.id) + '"' + (state.selectedRef === item.id ? ' aria-current="true"' : '') + '><span class="eyebrow ai-row-kind">' + (item.ref && item.ref.indexOf('supplier:') === 0 ? 'Supplier item' : item.ref ? 'Source reference' : 'Recorded name') + '</span><strong class="ai-row-title">' + esc(item.text) + '</strong><span class="hint ai-row-meta">' + (item.ref ? 'Check the recorded link' : 'Choose a recipe or supplier item') + '. ' + item.sample + (item.sample === 1 ? ' day.' : ' days.') + '</span></button></li>';
    }).join('') + '</ul>' + (!available.length ? '<p class="hint">' + (query ? 'No items match. Clear search to see the review list.' : 'No further item groups need a link in this summary.') + '</p>' : '<p class="hint">Showing ' + Math.min(available.length, state.referenceLimit) + ' of ' + available.length + ' matches.</p>') +
      (available.length > state.referenceLimit ? button('more-references', 'Show more items') : '');
    queue += '<div class="btn-row">' + button('page', 'Confirmed links' + (refs ? ' (' + refs.length + ')' : ''), 'reference-records') + button('page', 'Explore evidence', 'analysis') + '</div>' +
      help('About this review list', '<p class="hint">This queue always uses the published 90-day summary, regardless of dates in Reports or Training. Related names may be grouped. The summary includes up to 200 active groups; original daily records stay in Reports. Confirming one link leaves other items available.</p>');
    var detail = editor('references') || idleContext('A clear starting point.', 'Select an item to review its recipe or supplier link.', '<p class="hint">Confirmed links have their own Saved records page. A link keeps the original source entry intact.</p>');
    return healthNotice + desk('<div class="ai-reference-queue ai-reference-candidates">' + queue + '</div>', detail, draftVisible() && state.draft.kind === 'references');
  }
  function referenceRecords() {
    var refs = data('references', true); data('suppliers', true);
    var body = queueHeading('Confirmed links', refs ? refs.length + ' saved' : '', 'Saved records') + referenceSearch() + button('new-reference', 'Add a link') + button('refresh', 'Refresh');
    if (refs === undefined) return block('Confirmed links', body + waiting('references'), 'ai-saved-library ai-reference-confirmed');
    var query = window.LK_ANALYSIS.key(state.referenceQuery), saved = refs.filter(function (r) { return window.LK_ANALYSIS.key(r.alias + ' ' + r.label).indexOf(query) >= 0; });
    body += '<p class="hint">' + refs.length + ' saved links. These remain available regardless of activity dates. Changes enter the next nightly analysis.</p><ul class="ai-list">' + saved.slice(0, state.confirmedLimit).map(function (r) { return '<li><strong>' + esc(r.alias) + '</strong> → ' + esc(r.label) + referenceTarget(r) + linked(r) + button('edit-reference', 'Change reference', r.id) + button('history', 'Revision history', 'references/' + r.id + '/hist') + '</li>'; }).join('') + '</ul>' +
      (!saved.length ? '<p class="hint">No saved links match this view.</p>' : '') + (saved.length > state.confirmedLimit ? button('more-confirmed', 'Show more confirmed links') : '') + button('page', 'Review item links', 'references');
    return desk('<div class="ai-saved-library ai-reference-confirmed">' + body + '</div>', editor('references') || idleContext('Decisions kept clear.', 'Choose a saved link to edit it.', '<p class="hint">Confirmed links stay available independently of report dates. Earlier revisions remain in the history.</p>'), draftVisible() && state.draft.kind === 'references');
  }
  function reviewReference(id, from) {
    if (state.draft) { state.message = 'Resume or cancel your unfinished review first.'; redraw(); return; }
    var s = state.cache['analysis/range-90'], item = s && (s.items || []).filter(function (x) { return x.id === id; })[0];
    if (!item) { state.message = 'This item is no longer in the loaded summary. Refresh and try again.'; redraw(); return; }
    var record = sourceDraft(item);
    if (!record) { state.message = 'The supplier catalogue is still loading. Try this item again when it is ready.'; redraw(); return; }
    state.selectedRef = id; record.sourceItem = item;
    start('references', record, from || origin('review-reference', id));
  }

  function training() {
    var records = data('training', true), s = summary(), people = api.people();
    var queue = queueHeading('Ready for an assessment', '', 'Training') + '<p class="hint">Review a section with the person, then record what was assessed.</p>' + filters() + '<p class="hint">Prep ticks show recorded work. They do not confirm skill or training.</p>' +
      '<label class="label" for="ai-person-filter">Person</label><select class="search" id="ai-person-filter" data-k="ai-person-filter" data-ai-person>' + options(people, state.person, 'Everyone') + '</select>';
    if (s) queue += '<p class="hint">Activity: ' + esc(s.from) + ' to ' + esc(s.to) + '. Today is excluded.</p>';
    else queue += s === undefined ? waiting('analysis/range-' + state.range) : '<p class="hint">No activity summary is available. Saved assessments remain available.</p>';
    queue += records === undefined ? waiting('training') : trainingOpportunities(s, records, state.person ? people.filter(function (p) { return p.id === state.person; }) : people);
    queue += '<div class="btn-row">' + button('new-training', 'Add assessment') + button('page', 'Saved assessments', 'training-records') + '</div>' +
      help('How to use training reviews', '<p class="hint">Choose a person and section, check the work together, then save the assessor, date and outcome. No recorded activity does not mean someone is untrained.</p><p class="hint">Not assessed: no assessment is saved. In training: agree practice and a follow-up. Confirmed: an assessor checked this section or recipe. One recipe never confirms a whole section.</p>') +
      (state.person && records ? help('All sections for this person', stationGaps(s, records, state.person)) : '');
    return desk(queue, editor('training') || idleContext('An explicit decision.', 'Choose a person and section to open an assessment here.', '<p class="hint">Completed jobs describe activity. Training status comes from an assessment, and one recipe never confirms a whole section.</p>'), draftVisible() && state.draft.kind === 'training');
  }
  function trainingRecords() {
    var records = data('training', true), names = {}, recipes = api.recipes(); api.people().forEach(function (p) { names[p.id] = p.name; });
    if (!records) return block('Saved assessments', waiting('training'));
    var selected = records.filter(function (r) { return !state.person || r.personId === state.person; }).slice().sort(trainingRecent);
    var body = queueHeading('Saved assessments', selected.length + ' records', 'Saved records') + '<label class="label" for="ai-person-filter">Person</label><select class="search" id="ai-person-filter" data-k="ai-person-filter" data-ai-person>' + options(api.people(), state.person, 'Everyone') + '</select>' + button('new-training', 'Add assessment') + '<p class="hint">Saved assessments remain available when activity dates change. Recipe and section assessments are distinct.</p><ul class="ai-list">' + selected.slice(0, state.savedTrainingLimit).map(function (r) {
      var recipe = recipes.filter(function (x) { return x.id === r.recipeId; })[0], subject = r.recipeId ? (recipe ? recipe.name : r.recipeId) : r.section;
      return '<li><strong>' + esc(names[r.personId] || 'Former team member') + ': ' + esc(subject) + '</strong><p>' + trainingStatus(r.status) + '. ' + (r.recipeId ? 'Recipe' : 'Section') + ' assessment.</p><small>' + esc(r.day) + ', assessor: ' + esc(names[r.assessorId] || 'Former team member') + '</small>' + linked(r) + button('edit-training', 'Change assessment', r.id) + button('history', 'Revision history', 'training/' + r.id + '/hist') + '</li>';
    }).join('') + '</ul>' + (!selected.length ? '<p class="hint">No assessments match this view.</p>' : '') + (selected.length > state.savedTrainingLimit ? button('more-training-records', 'Show more assessments') : '') + button('page', 'Review training', 'training');
    return desk('<div class="ai-saved-library">' + body + '</div>', editor('training') || idleContext('Learning on record.', 'Choose an assessment to edit it.', '<p class="hint">Recipe and whole-section assessments remain distinct. Each saved outcome keeps its assessor, day and revision history.</p>'), draftVisible() && state.draft.kind === 'training');
  }

  function trainingStatus(status) { return { 'not-assessed': 'Not assessed', 'in-training': 'In training', confirmed: 'Confirmed' }[status] || 'Not assessed'; }
  function trainingRecent(a, b) { return String(b.day || '').localeCompare(String(a.day || '')) || (+b.at || 0) - (+a.at || 0) || String(a.id || '').localeCompare(String(b.id || '')); }
  function trainingSections(s) {
    var sections = api.sections();
    if (!sections.length && s) sections = Object.keys(s.sections || {});
    return sections.filter(function (section, index) { return section && sections.indexOf(section) === index; }).sort(function (a, b) { return a.localeCompare(b); });
  }
  function sectionAssessment(records, person, section) {
    // A recipe belongs to a section, but assessing that recipe does not assess the whole section.
    return records.filter(function (r) { return r.personId === person && r.section === section && !r.recipeId; }).sort(trainingRecent)[0];
  }
  function trainingTicks(s, person, section) { return s && s.people && s.people[person] ? (+s.people[person][section] || 0) : 0; }
  function trainingActivity(s, person, section) {
    if (s === undefined) return state.errors['analysis/range-' + state.range] ? 'Activity counts could not be loaded. Saved assessments are still shown.' : 'Activity counts are not available while analysis is loading.';
    if (!s) return 'No activity analysis has been published yet.';
    var n = trainingTicks(s, person, section);
    return n ? n + (n === 1 ? ' prep line ticked' : ' prep lines ticked') + ' in this period.' : 'No prep ticks recorded for this section in this period.';
  }
  function trainingMaterials(records, person, section) {
    var seen = {}, recipes = api.recipes();
    var related = records.filter(function (r) { return r.personId === person && r.section === section && (r.recipeId || r.guideId); }).sort(trainingRecent).filter(function (r) {
      var key = JSON.stringify([r.recipeId || '', r.guideId || '']); if (seen[key]) return false; seen[key] = true; return true;
    });
    return related.length ? '<details class="ai-help"><summary>Saved recipes and guides for this section</summary>' + related.slice(0, 3).map(function (r) {
      var recipe = recipes.filter(function (x) { return x.id === r.recipeId; })[0];
      return '<p>' + esc(recipe ? recipe.name : r.recipeId ? r.recipeId : 'Section guide') + ': ' + trainingStatus(r.status) + '.</p>' + linked(r);
    }).join('') + (related.length > 3 ? '<p class="hint">More references are in the training records below.</p>' : '') + '</details>' : '';
  }
  function trainingQueue(s, records, people) {
    var opportunities = [];
    people.forEach(function (p) { trainingSections(s).forEach(function (section) {
      var assessment = sectionAssessment(records, p.id, section);
      if (!assessment || assessment.status !== 'confirmed') opportunities.push({ person: p, section: section, assessment: assessment, ticks: trainingTicks(s, p.id, section) });
    }); });
    return opportunities.sort(function (a, b) { return (a.assessment && a.assessment.status === 'in-training' ? 0 : 1) - (b.assessment && b.assessment.status === 'in-training' ? 0 : 1) || b.ticks - a.ticks || a.person.name.localeCompare(b.person.name) || a.section.localeCompare(b.section); });
  }
  function trainingOpportunities(s, records, people) {
    var opportunities = trainingQueue(s, records, people);
    if (!trainingSections(s).length) return '<div class="ai-training-opportunities"><p class="hint">No sections are available. You can still add a recipe assessment.</p></div>';
    if (!opportunities.length) return '<div class="ai-training-opportunities"><p class="hint">No further section assessments need review in this view. Saved assessments remain available.</p></div>';
    return '<div class="ai-training-opportunities"><p class="hint">' + opportunities.length + ' person and section combinations to review.</p><ul class="ai-list">' + opportunities.slice(0, state.trainingLimit).map(function (o) {
      var value = { personId: o.person.id, section: o.section, recordId: o.assessment ? o.assessment.id : '' };
      return '<li><button type="button" class="ai-review-row" data-ai="training-opportunity" data-value="' + esc(JSON.stringify(value)) + '"' + (state.selectedTraining === o.person.id + ':' + o.section ? ' aria-current="true"' : '') + '><span class="eyebrow ai-row-kind">Explicit assessment</span><strong class="ai-row-title">' + esc(o.person.name) + ': ' + esc(o.section) + '</strong><span class="hint ai-row-meta">' + trainingStatus(o.assessment ? o.assessment.status : 'not-assessed') + '. ' + esc(trainingActivity(s, o.person.id, o.section)) + '</span></button></li>';
    }).join('') + '</ul>' + (opportunities.length > state.trainingLimit ? button('more-opportunities', 'Show more opportunities') : '') + '</div>';
  }
  function stationGaps(s, records, person) {
    return '<ul class="ai-list">' + trainingSections(s).map(function (section) {
      var assessment = sectionAssessment(records, person, section);
      return '<li><strong>' + esc(section) + '</strong><p>Section assessment: ' + trainingStatus(assessment ? assessment.status : 'not-assessed') + '.</p><p class="hint">' + esc(trainingActivity(s, person, section)) + '</p>' +
        (assessment ? button('edit-training', 'Review assessment', assessment.id) : button('assess-section', 'Start an assessment', section)) + trainingMaterials(records, person, section) + '</li>';
    }).join('') + '</ul>';
  }
  function start(kind, record, from, targetPage) {
    if (state.draft) { state.message = 'Resume or cancel your unfinished review first.'; redraw(); return; }
    state.origin = from || origin();
    state.draft = Object.assign({ kind: kind, id: 'ai-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8), v: 0,
      alias: '', label: '', recipeId: '', supplierId: '', itemId: '', guideId: '', personId: '', section: '', status: 'not-assessed', assessorId: '', day: api.day() }, record || {});
    state.draft.linkType = state.draft.supplierId ? 'supplier' : 'recipe';
    state.draft.assessType = state.draft.recipeId ? 'recipe' : 'section';
    if (kind === 'training') state.selectedTraining = state.draft.personId + ':' + state.draft.section;
    state.draftOpen = true; state.draftPage = targetPage || state.page; state.history = ''; state.message = '';
    if (targetPage && targetPage !== state.page) api.page(targetPage); else redraw();
    focusTask();
  }
  function nextReview(d, from) {
    if (d.kind === 'references') {
      var summary = state.cache['analysis/range-90'];
      var items = summary ? referenceItems(summary, state.cache.references || []).filter(function (x) { return window.LK_ANALYSIS.key(x.text).indexOf(window.LK_ANALYSIS.key(state.referenceQuery)) >= 0; }) : [];
      if (items.length) { reviewReference(items[0].id, from); return true; }
    } else {
      var rows = trainingQueue(state.cache['analysis/range-' + state.range], state.cache.training || [], api.people()).filter(function (o) { return (!state.person || state.person === o.person.id) && state.reviewedTraining.indexOf(o.person.id + ':' + o.section) < 0; });
      if (rows.length) {
        var o = rows[0], next = Object.assign({}, o.assessment || {}, { personId: o.person.id, section: o.section, sourceId: o.person.id + ':' + o.section });
        start('training', next, from); return true;
      }
    }
    return false;
  }
  function save(advance) {
    var d = state.draft; if (!d || state.busy || !validContext()) return;
    if (!ready(d)) { state.message = 'Complete the required fields and wait for the saved records to load.'; redraw(); return; }
    var fields = d.kind === 'references' ? ['alias', 'label', 'recipeId', 'supplierId', 'itemId', 'guideId'] : ['personId', 'section', 'recipeId', 'guideId', 'status', 'assessorId', 'day'];
    var record = {}; fields.forEach(function (k) { record[k] = String(d[k] || '').trim(); });
    if (d.kind === 'references') {
      if (!record.alias || !record.label || (!record.recipeId && !record.itemId)) { state.message = 'Set a name, reference name and a recipe or supplier item.'; redraw(); return; }
      if ((state.cache.references || []).some(function (r) { return r.id !== d.id && window.LK_ANALYSIS.key(r.alias) === window.LK_ANALYSIS.key(record.alias); })) { state.message = 'This alias already has a reference. Change that reference in Saved records.'; redraw(); return; }
      if (!!record.supplierId !== !!record.itemId) { state.message = 'Select both supplier and supplier item.'; redraw(); return; }
    } else if (!record.personId || (!record.section && !record.recipeId) || !record.status || !record.assessorId || !/^\d{4}-\d{2}-\d{2}$/.test(record.day) || !Number.isFinite(Date.parse(record.day + 'T12:00:00Z')) || new Date(record.day + 'T12:00:00Z').toISOString().slice(0, 10) !== record.day || record.day > api.day()) { state.message = 'Choose a person, section or recipe, status, assessor and a valid date.'; redraw(); return; }
    record.v = d.v + 1; record.at = d.saveAt || api.now(); d.saveAt = record.at;
    state.busy = true; state.message = ''; var savedState = state, c = context, from = state.origin;
    api.save(d.kind, d.id, record).then(function () {
      if (state !== savedState || c !== api.context() || !api.allowed()) return;
      // Apply this acknowledged revision to the loaded list. Refresh still rereads other admins' changes.
      state.cache[d.kind] = (state.cache[d.kind] || []).filter(function (r) { return r.id !== d.id; }).concat([Object.assign({}, record, { id: d.id })]);
      delete state.cache[d.kind + '/' + d.id + '/hist']; state.history = ''; state.busy = false; state.draft = null; state.draftOpen = false;
      state.message = (d.kind === 'references' ? 'Link confirmed: ' + record.alias : 'Assessment saved') + '.';
      if (advance && d.kind === 'training') state.reviewedTraining.push(d.personId + ':' + d.section);
      if (advance && nextReview(d, from)) { state.message = 'Record saved. The next review is ready.'; redraw(); return; }
      if (advance) state.message += ' No further matching reviews in this pass.';
      returnTo(from);
    }, function () {
      if (state !== savedState || c !== api.context() || !api.allowed()) return;
      state.busy = false; state.message = 'Could not save. Your entries are kept. If someone changed this record, cancel and refresh before editing again.'; redraw();
    });
    redraw();
  }

  document.addEventListener('toggle', function (e) {
    if (validContext() && e.target.matches && e.target.matches('[data-ai-disclosure]')) state.disclosures[e.target.getAttribute('data-ai-disclosure')] = e.target.open;
  }, true);
  document.addEventListener('input', function (e) {
    if (!validContext() || state.busy) return;
    if (e.target.matches('[data-ai-reference-query]')) { state.referenceSearchDraft = e.target.value; return; }
    if (!draftVisible() || !e.target.matches('[data-ai-field]')) return;
    rememberDisclosures();
    var key = e.target.getAttribute('data-ai-field');
    // A new link can be completed using its visible name and target. A custom reference name stays explicit.
    if (key === 'alias' && state.draft.kind === 'references' && !state.draft.v && !state.draft.labelEdited) {
      state.draft.label = e.target.value;
      var label = document.getElementById && document.getElementById('ai-label'); if (label) label.value = e.target.value;
    }
    if (key === 'label') state.draft.labelEdited = true;
    state.draft[key] = e.target.value; delete state.draft.saveAt;
    var buttons = document.querySelectorAll('[data-ai="save"], [data-ai="save-next"]');
    Array.prototype.forEach.call(buttons, function (b) { b.disabled = state.busy || !ready(state.draft); });
  });
  document.addEventListener('change', function (e) {
    if (!validContext() || state.busy) return;
    if (e.target.matches('[data-ai-section]')) { state.section = e.target.value; state.item = ''; state.evidence = null; redraw(); return; }
    if (e.target.matches('[data-ai-person]')) { state.reviewedTraining = []; state.person = e.target.value; redraw(); return; }
    if (!draftVisible()) return;
    if (e.target.matches('[data-ai-field="assessType"]')) { state.draft.assessType = e.target.value; if (e.target.value === 'section') state.draft.recipeId = ''; redraw(); return; }
    if (e.target.matches('[data-ai-field="supplierId"]')) { state.draft.supplierId = e.target.value; state.draft.itemId = ''; redraw(); }
    if (e.target.matches('[data-ai-field="linkType"]')) { state.draft.linkType = e.target.value; state.draft.recipeId = ''; state.draft.supplierId = ''; state.draft.itemId = ''; redraw(); }
  });
  document.addEventListener('submit', function (e) {
    if (!validContext()) return;
    if (e.target.matches('[data-ai-reference-search], [data-ai-search]')) e.preventDefault();
    if (state.busy) return;
    if (e.target.matches('[data-ai-reference-search]')) { e.preventDefault(); state.referenceQuery = state.referenceSearchDraft = e.target.querySelector('[name="q"]').value.trim(); state.referenceLimit = state.confirmedLimit = 20; redraw(); return; }
    if (e.target.matches('[data-ai-search]')) { e.preventDefault(); state.query = e.target.querySelector('[name="q"]').value; state.item = ''; state.evidence = null; redraw(); }
  });
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-ai]'); if (!el || !validContext()) return;
    var a = el.getAttribute('data-ai'), v = el.getAttribute('data-value');
    if (a === 'resume') { state.draftOpen = true; api.page(state.draftPage); focusTask(); return; }
    if (state.busy) return;
    if (a === 'back') { back(); return; }
    if (a === 'range') { state.reviewedTraining = []; state.range = +v; state.item = ''; state.evidence = null; }
    if (a === 'page') { state.history = ''; api.page(v); return; }
    if (a === 'refresh') { if (state.draft) state.message = 'Resume or cancel your unfinished review before refreshing.'; else { state.request++; state.reviewedTraining = []; state.cache = {}; state.loading = {}; state.errors = {}; state.item = ''; state.evidence = null; } }
    if (a === 'review-reference') { reviewReference(v); return; }
    if (a === 'more-opportunities') state.trainingLimit += 12;
    if (a === 'more-references') state.referenceLimit += 20;
    if (a === 'more-confirmed') state.confirmedLimit += 20;
    if (a === 'more-training-records') state.savedTrainingLimit += 20;
    if (a === 'clear-reference-search') { state.referenceQuery = state.referenceSearchDraft = ''; state.referenceLimit = state.confirmedLimit = 20; }
    if (a === 'retry') { delete state.errors[v]; delete state.cache[v]; }
    if (a === 'item') { state.analysisOrigin = origin('item', v); state.item = v; state.evidence = null; redraw(); focusTask(); return; }
    if (a === 'evidence') { state.evidence = v; state.evidenceLimit = 40; }
    if (a === 'day-evidence') { state.analysisOrigin = origin('day-evidence', v); state.item = ''; state.evidence = v; state.evidenceLimit = 40; redraw(); focusTask(); return; }
    if (a === 'more-evidence') state.evidenceLimit = (state.evidenceLimit || 40) + 40;
    if (a === 'clear-section') state.section = '';
    if (a === 'history') { state.history = v; state.historyPage = state.page; }
    if (a === 'person') state.person = v;
    if (a === 'new-reference') { start('references'); return; }
    if (a === 'map') {
      var request; try { request = JSON.parse(v); } catch (err) { request = { text: v }; }
      var item = request.itemId && state.analysisData && state.analysisData.items.filter(function (x) { return x.id === request.itemId; })[0];
      item = item || (request.text ? { text: request.text, ref: request.ref || '' } : null);
      if (!item) { state.message = 'The source item is no longer available. Refresh the evidence.'; redraw(); return; }
      data('suppliers', true); var record = sourceDraft(item);
      if (!record) { state.message = 'The supplier catalogue is loading. Try again when it is ready.'; redraw(); return; }
      record.sourceItem = item; start('references', record, origin('map', v), 'references'); return;
    }
    if (a === 'new-training') { start('training', { personId: state.person || '' }); return; }
    if (a === 'training-opportunity') {
      var opportunity; try { opportunity = JSON.parse(v); } catch (err) { return; }
      if (!api.people().some(function (p) { return p.id === opportunity.personId; })) return;
      if (state.draft) { state.message = 'Resume or cancel your unfinished review first.'; redraw(); return; }
      state.reviewedTraining = [];
      var assessed = opportunity.recordId && (state.cache.training || []).filter(function (r) { return r.id === opportunity.recordId && r.personId === opportunity.personId && r.section === opportunity.section && !r.recipeId; })[0];
      opportunity = Object.assign({}, assessed || {}, { personId: opportunity.personId, section: opportunity.section, sourceId: opportunity.personId + ':' + opportunity.section });
      state.selectedTraining = opportunity.sourceId; start('training', opportunity, origin(a, v)); return;
    }
    if (a === 'assess-section') { start('training', { personId: state.person, section: v, sourceId: state.person + ':' + v }); return; }
    if (a === 'edit-reference' || a === 'edit-training') {
      var kind = a === 'edit-reference' ? 'references' : 'training', record = (state.cache[kind] || []).filter(function (r) { return r.id === v; })[0];
      if (!record) return;
      start(kind, record, origin(a, v)); return;
    }
    if (a === 'cancel') { var from = state.origin; state.draft = null; state.draftOpen = false; state.message = ''; returnTo(from); return; }
    if (a === 'save' || a === 'save-next') { save(a === 'save-next'); return; }
    redraw();
  });

  window.LK_INTELLIGENCE = {
    API: 3,
    reset: reset, dirty: function () { return !!state.draft; },
    busy: function () { return validContext() && state.busy; }, back: back, backLabel: backLabel, resumeHTML: resumeHTML,
    html: function (page, adapter) {
      api = adapter; if (!api.allowed()) { reset(); return ''; }
      if (context !== api.context()) { reset(); context = api.context(); }
      rememberDisclosures();
      if (state.page !== page) state.history = '';
      state.page = page;
      // Reuse the audience-aware guide reader; private data and drafts stay in the access context's memory.
      api.loadGuides();
      var content = page === 'overview' ? overview() : page === 'analysis' ? analysis() : page === 'references' ? references() : page === 'reference-records' ? referenceRecords() : page === 'training-records' ? trainingRecords() : training();
      var history = '';
      if (state.history && state.historyPage === page) { var revisions = data(state.history, true); history = block('Revision history', revisions ? (revisions.length ? '<ul class="ai-list">' + revisions.map(function (r) { return '<li>Revision ' + r.v + ': ' + esc(r.label || r.status) + ', ' + esc(api.clock(r.at)) + '</li>'; }).join('') + '</ul>' : '<p class="hint">No earlier revisions.</p>') : waiting(state.history)); }
      return '<div class="ai-workspace">' + resumeHTML(page) + (state.message ? '<p class="ai-message ai-outcome" role="status">' + esc(state.message) + '</p>' : '') + content + history + '</div>';
    }
  };
})();
