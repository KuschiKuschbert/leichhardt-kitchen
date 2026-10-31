/* Loaded only in the verified admin workspace. Private records stay in memory. */
(function () {
  'use strict';
  var api, context = '', state;
  var labels = { prep: 'Prep lines', orders: 'Staff order lines', waste: 'Waste entries', transfers: 'Transfer entries', supplierOrders: 'Supplier order lines', deliveries: 'Delivery receipts', functions: 'Confirmed functions' };
  function reset() { context = ''; state = { cache: {}, loading: {}, errors: {}, request: 0, range: 30, query: '', referenceQuery: '', referenceSearchDraft: '', referenceLimit: 20, confirmedLimit: 20, item: '', evidence: null, draft: null, message: '', busy: false }; }
  reset();
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function button(action, text, value) { return '<button type="button" class="btn" data-ai="' + action + '" data-value="' + esc(value || '') + '">' + esc(text) + '</button>'; }
  function block(title, body, cls) { return '<section class="set-block' + (cls ? ' ' + esc(cls) : '') + '"><h3 class="label">' + esc(title) + '</h3>' + body + '</section>'; }
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
  function field(name, label, value, opts) { return '<div class="field"><label class="label" for="ai-' + name + '">' + esc(label) + '</label>' + (opts ? '<select class="search" id="ai-' + name + '" data-k="ai-' + name + '" data-ai-field="' + name + '">' + options(opts, value, ['personId', 'assessorId', 'section'].indexOf(name) >= 0 ? 'Choose ' + label.toLowerCase() : 'Not linked') + '</select>' : '<input class="search" id="ai-' + name + '" data-k="ai-' + name + '" data-ai-field="' + name + '" maxlength="160" value="' + esc(value) + '">') + '</div>'; }
  function linked(r) {
    if (!r) return '';
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
  function overview() {
    var current = data('analysis/current'), health = data('analysis/health'), s = summary();
    if (current === undefined) return block('Analysis health', waiting('analysis/current'));
    var body = freshness(current, health) + '<p class="hint">Analysis runs beside the existing learning. Staff suggestions retain their current behaviour while the new evidence is compared.</p>';
    if (current && current.inventory) body += '<h4>Available infrastructure</h4>' + metrics(current.inventory);
    if (s) body += metrics(s.counts) + '<h4>Data to review</h4>' + metrics(s.quality) + '<p class="hint">Unmatched entries need a confirmed reference before they can be compared across sources. Missing records are not proof of no activity.</p>';
    return block('Overview', filters() + body) + block('Start here', '<div class="btn-row">' + button('page', 'Explore item evidence', 'analysis') + button('page', 'Review item references', 'references') + button('page', 'Open staff training', 'training') + '</div>');
  }
  function itemDetail(s) {
    var item = s.items.filter(function (x) { return x.id === state.item; })[0];
    if (!item) return '';
    var refs = data('references', true) || [], r = refs.filter(function (x) { return window.LK_ANALYSIS.identity(x) === item.ref; })[0];
    if (!r && item.ref && item.ref.indexOf('recipe:') === 0) r = { recipeId: item.ref.slice(7) };
    return block(item.text, '<p class="hint">' + (item.ref ? 'Confirmed or explicit source reference.' : 'Unconfirmed name. Kept separate from other sources.') + ' Recorded on ' + item.sample + ' days.</p>' + metrics(item.counts) +
      '<h4>Recorded amounts, kept by source and unit</h4>' + metrics(item.amounts) + '<h4>Typed quantity patterns</h4>' + metrics(item.quantities) + '<h4>Waste reasons</h4>' + metrics(item.reasons) +
      '<h4>Weekday evidence</h4>' + Object.keys(item.weekdays || {}).map(function (source) { var days = {}; Object.keys(item.weekdays[source]).forEach(function (n) { days[['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][+n]] = item.weekdays[source][n]; }); return '<p>' + esc(labels[source]) + '</p>' + metrics(days); }).join('') +
      (item.routine ? '<p class="hint">Routine prep: ' + item.routine.recent + ' lines in the last ' + s.comparison.recentDays + ' days; ' + item.routine.previous + ' in the preceding ' + s.comparison.previousDays + ' days. Function-related lines are excluded from this comparison.</p>' : '') +
      (item.ref && item.counts.prep && item.counts.waste ? '<p role="note">Review this item before repeating usual prep quantities: matching waste was recorded in this period. Check the waste reasons and source amounts below.</p>' : '') +
      '<p class="hint">Function-related prep and order lines: ' + item.functionLines + '. Counts do not measure consumption or stock.</p>' + linked(r) +
      '<h4>Open recorded evidence</h4><div class="btn-row">' + item.examples.map(function (e) { return button('evidence', e.day + ': ' + (labels[e.source] || e.source), e.day); }).join('') + '</div>' +
      button('map', 'Confirm a reference for this item', item.text));
  }
  function evidence(s) {
    if (!state.evidence) return '';
    var path = 'analysisDaily/' + s.generation + '_' + state.evidence, d = data(path);
    if (d === undefined) return block('Source evidence', waiting(path));
    if (!d) return block('Source evidence', '<p class="hint">This generation has expired. Refresh to read current evidence.</p>');
    var selected = s.items.filter(function (x) { return x.id === state.item; })[0];
    var entries = d.entries.filter(function (e) { return !selected || (selected.ref ? e.ref === selected.ref : e.source + ':' + window.LK_ANALYSIS.key(e.text) === selected.id); });
    var limit = state.evidenceLimit || 40;
    return block('Source evidence: ' + d.day, '<p class="hint">' + entries.length + ' eligible records. ' + esc(JSON.stringify(d.excluded)) + ' excluded by source.</p><ul class="ai-list">' + entries.slice(0, limit).map(function (e) { return '<li><strong>' + esc(labels[e.source]) + '</strong>: ' + esc(e.text) + ' ' + esc(e.qty || (e.amount == null ? '' : e.amount + ' ' + (e.unit || '(unit not set)'))) + '<br><small>' + esc(e.section) + ' ' + esc(e.reason) + ' Record: ' + esc(e.id) + (e.fn ? '. Function demand' : '') + '</small>' + (e.text && !e.ref ? button('map', 'Confirm reference', e.text) : '') + '</li>'; }).join('') + '</ul>' + (entries.length > limit ? button('more-evidence', 'Show more records') : ''));
  }
  function analysis() {
    var s = summary(), current = data('analysis/current'), health = data('analysis/health');
    if (s === undefined) return block('Item analysis', waiting('analysis/range-' + state.range));
    if (!s) return overview();
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
    var list = s.items.filter(function (x) { return window.LK_ANALYSIS.key(x.text).indexOf(window.LK_ANALYSIS.key(state.query)) >= 0; });
    return block('Item analysis', filters() + freshness(current, health) + changedGeneration + '<p class="hint">Search the most active ' + s.items.length + ' of ' + s.totalItems + ' item groups. ' + (s.truncated ? 'The full source data remains in daily evidence.' : '') + ' These completed-day reports are separate from the existing live Insights filters.</p>' +
      '<label class="label" for="ai-section-filter">Section</label><select class="search" id="ai-section-filter" data-ai-section>' + options(sectionOptions, state.section, 'All sections') + '</select><p class="hint">A selected section includes only records explicitly tagged with that section. Source coverage and quality counts cover the whole period.</p>' +
      '<form data-ai-search><label class="label" for="ai-search">Find an item</label><div class="btn-row"><input class="search" id="ai-search" name="q" value="' + esc(state.query) + '"><button class="btn" type="submit">Search</button></div></form>' +
      '<ul class="ai-list">' + list.slice(0, 40).map(function (x) { return '<li>' + button('item', x.text, x.id) + '<span class="hint">' + x.sample + ' days. ' + (x.ref ? 'Confirmed or explicit reference' : 'Needs a reference') + '</span></li>'; }).join('') + '</ul>' +
      (list.length > 40 ? '<p class="hint">Showing 40 matches. Refine the search.</p>' : list.length ? '' : '<p class="hint">No matching recorded items.</p>')) + itemDetail(s) + evidence(s) +
      block('Data coverage', '<p class="hint">Days with at least one eligible record, out of ' + s.days + '. An empty day is not proof that nothing happened.</p>' + metrics(s.coverage) + '<h4>Data quality</h4>' + metrics(s.quality) + '<h4>Browse daily records</h4><div class="btn-row">' + (s.dates || []).map(function (d) { return button('day-evidence', d.day, d.day); }).join('') + '</div>');
  }
  function editor(kind) {
    var d = state.draft;
    if (!d || d.kind !== kind) return '';
    var recipes = api.recipes(), guides = api.guides(), suppliers = data('suppliers', true) || [];
    var body = kind === 'references' ? field('alias', 'Typed name or alias', d.alias) + field('label', 'Reference name', d.label) + field('recipeId', 'Recipe', d.recipeId, recipes) + field('supplierId', 'Supplier', d.supplierId, suppliers) + field('itemId', 'Supplier item', d.itemId, (suppliers.filter(function (s) { return s.id === d.supplierId; })[0] || {}).items || []) + field('guideId', 'Guide', d.guideId, guides) :
      field('personId', 'Person', d.personId, api.people()) + field('section', 'Section', d.section, api.sections().map(function (s) { return { id: s, name: s }; })) + field('recipeId', 'Recipe', d.recipeId, recipes) + field('guideId', 'Guide', d.guideId, guides) +
      field('status', 'Training status', d.status, [{ id: 'not-assessed', name: 'Not assessed' }, { id: 'in-training', name: 'In training' }, { id: 'confirmed', name: 'Confirmed' }]) + field('assessorId', 'Assessor', d.assessorId, api.people()) +
      '<div class="field"><label class="label" for="ai-day">Assessment date</label><input type="date" class="search" id="ai-day" data-k="ai-day" data-ai-field="day" value="' + esc(d.day) + '" max="' + api.day() + '"></div>';
    var help = kind === 'references' ? '<p class="hint">Keep the recorded name in Typed name or alias. Choose the recipe or supplier item it means, then save to confirm the link. A guide is optional.</p>' : '<p class="hint">Record what you have checked with this person. Choose a section for a whole-station assessment, or a recipe for that dish only. Pick the person who assessed them and the date it happened.</p>';
    return block(kind === 'references' ? 'Confirm reference' : 'Training record', '<div class="ai-editor">' + help + (d.reviewNote ? '<p class="hint" role="note">' + esc(d.reviewNote) + '</p>' : '') + body + '<div class="btn-row"><button type="button" class="btn dark" data-ai="save"' + (state.busy ? ' disabled' : '') + '>' + (state.busy ? 'Saving...' : 'Save record') + '</button>' + button('cancel', 'Cancel') + '</div><p class="hint">Changes are saved with a revision history. Original operational records stay intact.</p></div>');
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
  function references() {
    var refs = data('references', true), s = data('analysis/range-90'); data('suppliers', true);
    var intro = '<p>Help the book recognise the same item across prep, orders and waste. Review a recorded name, check its recipe or supplier item, then save the link.</p>' +
      '<p class="hint">Recorded items below come from kitchen activity. Confirmed references are links you have saved. Confirming one item does not remove the others.</p>' +
      '<div class="btn-row">' + button('new-reference', 'Add a reference') + button('refresh', 'Refresh') + '</div>' +
      '<form data-ai-reference-search><label class="label" for="ai-reference-query">Find a recorded item or confirmed reference</label><div class="btn-row"><input class="search" type="search" id="ai-reference-query" data-k="ai-reference-query" data-ai-reference-query name="q" value="' + esc(state.referenceSearchDraft) + '"><button class="btn" type="submit">Search</button>' + button('clear-reference-search', 'Clear search') + '</div></form>';
    if (refs === undefined) return block('Item references', intro) + block('Confirmed references', waiting('references'));
    var candidates = s ? referenceItems(s, refs) : [], query = window.LK_ANALYSIS.key(state.referenceQuery);
    var saved = refs.filter(function (r) { return window.LK_ANALYSIS.key(r.alias + ' ' + r.label).indexOf(query) >= 0; });
    var available = candidates.filter(function (item) { return window.LK_ANALYSIS.key(item.text).indexOf(query) >= 0; });
    intro += '<p class="ai-summary" role="status"><strong>' + refs.length + ' confirmed ' + (refs.length === 1 ? 'reference' : 'references') + '</strong>' + (s ? ' and <strong>' + candidates.length + ' recorded item ' + (candidates.length === 1 ? 'group' : 'groups') + ' to review</strong> in the published 90-day summary.' : '. Recorded items are shown separately below.') + '</p>';
    var queue = s === undefined ? waiting('analysis/range-90') : !s ? '<p class="hint">No recorded-item summary is available yet. Your confirmed references are still shown below. Items appear after the nightly analysis succeeds.</p>' :
      '<p class="hint">' + esc(s.from) + ' to ' + esc(s.to) + '. This page always uses the published 90-day summary, even if you choose fewer days in Training or Analysis. Related names may be grouped together; original names remain in daily evidence.</p>' +
      (s.truncated ? '<p class="hint">The summary contains the ' + (s.items || []).length + ' most active groups out of ' + s.totalItems + '. Open Item evidence for daily records beyond this list.</p>' : '') +
      '<ul class="ai-list">' + available.slice(0, state.referenceLimit).map(function (item) {
        return '<li><strong>' + esc(item.text) + '</strong><span class="hint">' + (item.ref ? 'Linked in the source record. Review the link before confirming it here.' : 'Name not linked yet. Choose what this item refers to.') + '</span>' +
          '<span class="hint">' + esc(Object.keys(item.counts || {}).map(function (source) { return labels[source] || source; }).join(', ')) + '. Recorded on ' + item.sample + (item.sample === 1 ? ' day.' : ' days.') + '</span>' + button('review-reference', 'Review reference', item.id) + '</li>';
      }).join('') + '</ul>' + (!available.length ? '<p class="hint">' + (query ? 'No recorded items match this search. Clear search to see the full review list.' : 'All item groups in this summary already have a saved reference, or no eligible items were recorded. This does not cover records outside the summary.') + '</p>' : '<p class="hint">Showing ' + Math.min(available.length, state.referenceLimit) + ' of ' + available.length + ' matching item groups.</p>') +
      (available.length > state.referenceLimit ? button('more-references', 'Show more recorded items') : '');
    var confirmed = '<p class="hint">Saved links stay here regardless of the activity period. They are separate from the items waiting for review. Changes enter the next nightly analysis; published evidence keeps its earlier links until then.</p>' +
      '<ul class="ai-list">' + saved.slice(0, state.confirmedLimit).map(function (r) { return '<li><strong>' + esc(r.alias) + '</strong> → ' + esc(r.label) + referenceTarget(r) + linked(r) + button('edit-reference', 'Change reference', r.id) + button('history', 'Revision history', 'references/' + r.id + '/hist') + '</li>'; }).join('') + '</ul>' +
      (!saved.length ? '<p class="hint">' + (query ? 'No confirmed references match this search.' : 'No references have been confirmed yet. Review a recorded item above to create the first link.') + '</p>' : '') + (saved.length > state.confirmedLimit ? button('more-confirmed', 'Show more confirmed references') : '');
    return block('Item references', intro) + editor('references') + block('Recorded items to review', queue + '<div class="btn-row">' + button('page', 'Open Item evidence', 'analysis') + '</div>', 'ai-reference-candidates') + block('Confirmed references (' + refs.length + ')', confirmed, 'ai-reference-confirmed');
  }
  function reviewReference(id) {
    if (state.draft) { state.message = 'Save or cancel your record first.'; redraw(); return; }
    var s = state.cache['analysis/range-90'], item = s && (s.items || []).filter(function (x) { return x.id === id; })[0];
    if (!item) { state.message = 'This recorded item is no longer in the loaded summary. Refresh and try again.'; redraw(); return; }
    var record = { alias: item.text, label: item.text, recipeId: '', supplierId: '', itemId: '', reviewNote: 'This is a draft link. Check the target before saving; opening this form does not confirm anything.' };
    if (item.ref && item.ref.indexOf('recipe:') === 0 && api.recipes().some(function (r) { return 'recipe:' + r.id === item.ref; })) record.recipeId = item.ref.slice(7);
    if (item.ref && item.ref.indexOf('supplier:') === 0) {
      var suppliers = state.cache.suppliers;
      if (suppliers === undefined) { state.message = 'The supplier catalogue is not available yet. Wait for it to load or refresh, then review this item again.'; redraw(); return; }
      suppliers.forEach(function (supplier) { (supplier.items || []).forEach(function (entry) {
        if (window.LK_ANALYSIS.identity({ supplierId: supplier.id, itemId: entry.id }) === item.ref) { record.supplierId = supplier.id; record.itemId = entry.id; }
      }); });
    }
    start('references', record);
  }
  function training() {
    var records = data('training', true), s = summary(), people = api.people(), names = {};
    people.forEach(function (p) { names[p.id] = p.name; });
    var intro = block('Training opportunities', '<p>Use this page to decide who to assess, what to practise next and which recipe or guide to use.</p>' +
      '<ol class="a-list"><li><strong>Review a person and section.</strong> Start with an opportunity below, or choose a person to see every section.</li><li><strong>Check and practise together.</strong> Open the saved recipe or guide, agree a task and choose an assessor.</li><li><strong>Record the outcome.</strong> Save the status and assessment date. Update that record after the next check.</li></ol>' +
      '<p class="hint">Prep ticks show recorded work. They do not confirm skill or training. No recorded activity does not mean someone is untrained.</p>' +
      '<details><summary>What the training statuses mean</summary><dl class="ai-metrics"><div><dt>Not assessed</dt><dd>No assessment has been recorded for this section or recipe. Check what the person already knows.</dd></div><div><dt>In training</dt><dd>Practice is in progress. Agree the next task and a follow-up check.</dd></div><div><dt>Confirmed</dt><dd>An assessor has confirmed this section or recipe. Confirmation of one recipe does not confirm the whole section.</dd></div></dl></details>');
    if (!records) return intro + block('Training records', waiting('training'));
    var selected = records.filter(function (r) { return !state.person || r.personId === state.person; }).slice().sort(trainingRecent);
    var recipes = api.recipes(), visiblePeople = state.person ? people.filter(function (p) { return p.id === state.person; }) : people;
    var activityNote = s === undefined ? waiting('analysis/range-' + state.range) : !s ? '<p class="hint">No activity analysis has been published yet. Saved assessments are still available.</p>' : '<p class="hint">Recorded prep ticks: ' + esc(s.from) + ' to ' + esc(s.to) + '. Today is excluded. The dates change the activity counts, not your saved assessments.</p>';
    var opportunities = trainingOpportunities(s, records, visiblePeople);
    var saved = selected.length ? '<ul class="ai-list">' + selected.map(function (r) {
      var recipe = recipes.filter(function (x) { return x.id === r.recipeId; })[0];
      var subject = r.recipeId ? (recipe ? recipe.name : r.recipeId) + (r.section ? ' (' + r.section + ')' : '') : r.section;
      return '<li><strong>' + esc(names[r.personId] || 'Former team member') + ': ' + esc(subject) + '</strong><p>' + trainingStatus(r.status) + '. ' + esc(r.recipeId ? 'Recipe assessment' : 'Section assessment') + '.</p><small>' + esc(r.day) + ', assessor: ' + esc(names[r.assessorId] || 'Former team member') + '</small>' + linked(r) + button('edit-training', 'Change training record', r.id) + button('history', 'Revision history', 'training/' + r.id + '/hist') + '</li>';
    }).join('') + '</ul>' : '<p class="hint">No training records saved' + (state.person ? ' for this person' : '') + ' yet. Choose an opportunity above or add a record below.</p>';
    return intro + block('People and sections to review', filters() + activityNote +
      '<div class="btn-row" aria-label="Choose a person">' + button('person', 'Everyone', '') + people.map(function (p) { return '<button type="button" class="btn" data-ai="person" data-value="' + esc(p.id) + '" aria-pressed="' + (state.person === p.id) + '">' + esc(p.name) + '</button>'; }).join('') + '</div>' +
      '<p class="hint">These are prompts for a conversation, based on saved section assessments. A person with no section assessment may already know the work.</p>' + opportunities +
      (state.person ? '<h4>All sections for ' + esc(names[state.person] || 'this person') + '</h4>' + stationGaps(s, records, state.person) : '')) +
      block('Training records', '<p class="hint">Your saved assessments stay here when the activity dates change. Recipe assessments and section assessments are shown separately.</p>' + button('new-training', 'Add training record') + saved) + editor('training');
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
    return related.length ? '<details><summary>Saved recipes and guides for this section</summary>' + related.slice(0, 3).map(function (r) {
      var recipe = recipes.filter(function (x) { return x.id === r.recipeId; })[0];
      return '<p>' + esc(recipe ? recipe.name : r.recipeId ? r.recipeId : 'Section guide') + ': ' + trainingStatus(r.status) + '.</p>' + linked(r);
    }).join('') + (related.length > 3 ? '<p class="hint">More references are in the training records below.</p>' : '') + '</details>' : '';
  }
  function trainingOpportunities(s, records, people) {
    var sections = trainingSections(s), opportunities = [];
    people.forEach(function (p) { sections.forEach(function (section) {
      var assessment = sectionAssessment(records, p.id, section);
      if (!assessment || assessment.status !== 'confirmed') opportunities.push({ person: p, section: section, assessment: assessment, ticks: trainingTicks(s, p.id, section) });
    }); });
    opportunities.sort(function (a, b) { return (a.assessment && a.assessment.status === 'in-training' ? 0 : 1) - (b.assessment && b.assessment.status === 'in-training' ? 0 : 1) || b.ticks - a.ticks || a.person.name.localeCompare(b.person.name) || a.section.localeCompare(b.section); });
    if (!sections.length) return '<div class="ai-training-opportunities"><p class="hint">No sections are available yet. You can still add a recipe assessment in Training records.</p></div>';
    if (!people.length) return '<div class="ai-training-opportunities"><p class="hint">No active people are available for this view.</p></div>';
    if (!opportunities.length) return '<div class="ai-training-opportunities"><p class="hint">Every listed person has a confirmed section assessment for these sections. Review their saved records when tasks or responsibilities change.</p></div>';
    return '<div class="ai-training-opportunities"><p>' + opportunities.length + (opportunities.length === 1 ? ' person and section to review.' : ' person and section combinations to review.') + (opportunities.length > 12 ? ' Showing the first 12. Choose a person above to narrow the list.' : '') + '</p><ul class="ai-list">' + opportunities.slice(0, 12).map(function (o) {
      var status = o.assessment ? o.assessment.status : 'not-assessed';
      var reason = status === 'in-training' ? 'Practice is already in progress. Agree the next task and a follow-up check.' : o.assessment ? 'The section is marked Not assessed. Start with a supervised check.' : 'No section assessment is saved. Check what this person already knows before planning training.';
      return '<li><strong>' + esc(o.person.name) + ': ' + esc(o.section) + '</strong><p>' + trainingStatus(status) + '. ' + esc(reason) + '</p><p class="hint">' + esc(trainingActivity(s, o.person.id, o.section)) + '</p>' +
        (o.assessment ? button('edit-training', 'Review assessment', o.assessment.id) : button('training-opportunity', 'Start an assessment', JSON.stringify({ personId: o.person.id, section: o.section }))) + trainingMaterials(records, o.person.id, o.section) + '</li>';
    }).join('') + '</ul></div>';
  }
  function stationGaps(s, records, person) {
    return '<ul class="ai-list">' + trainingSections(s).map(function (section) {
      var assessment = sectionAssessment(records, person, section);
      return '<li><strong>' + esc(section) + '</strong><p>Section assessment: ' + trainingStatus(assessment ? assessment.status : 'not-assessed') + '.</p><p class="hint">' + esc(trainingActivity(s, person, section)) + '</p>' +
        (assessment ? button('edit-training', 'Review assessment', assessment.id) : button('assess-section', 'Start an assessment', section)) + trainingMaterials(records, person, section) + '</li>';
    }).join('') + '</ul>';
  }
  function start(kind, record) {
    if (state.draft) { state.message = 'Save or cancel your record first.'; redraw(); return; }
    state.draft = Object.assign({ kind: kind, id: 'ai-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8), v: 0,
      alias: '', label: '', recipeId: '', supplierId: '', itemId: '', guideId: '', personId: '', section: '', status: 'not-assessed', assessorId: '', day: api.day() }, record || {});
    state.message = ''; redraw();
    // Focus during the opening click, before the user can choose another field or start typing.
    // data-k on the fields lets the parent preserve focus and selection during later data redraws.
    var input = document.querySelector('.ai-editor input, .ai-editor select');
    if (input) { input.focus({ preventScroll: true }); input.scrollIntoView({ block: 'center' }); }
  }
  function save() {
    var d = state.draft; if (!d || state.busy || !api.allowed()) return;
    var fields = d.kind === 'references' ? ['alias', 'label', 'recipeId', 'supplierId', 'itemId', 'guideId'] : ['personId', 'section', 'recipeId', 'guideId', 'status', 'assessorId', 'day'];
    var record = {}; fields.forEach(function (k) { record[k] = String(d[k] || '').trim(); });
    if (d.kind === 'references') {
      if (!record.alias || !record.label || (!record.recipeId && !record.itemId)) { state.message = 'Set a name, reference name and a recipe or supplier item.'; redraw(); return; }
      if ((state.cache.references || []).some(function (r) { return r.id !== d.id && window.LK_ANALYSIS.key(r.alias) === window.LK_ANALYSIS.key(record.alias); })) { state.message = 'This alias already has a reference. Change that reference instead.'; redraw(); return; }
      if (!!record.supplierId !== !!record.itemId) { state.message = 'Select both supplier and supplier item.'; redraw(); return; }
    } else if (!record.personId || (!record.section && !record.recipeId) || !record.status || !record.assessorId || !/^\d{4}-\d{2}-\d{2}$/.test(record.day) || !Number.isFinite(Date.parse(record.day + 'T12:00:00Z')) || new Date(record.day + 'T12:00:00Z').toISOString().slice(0, 10) !== record.day || record.day > api.day()) { state.message = 'Choose a person, section or recipe, status, assessor and a valid date.'; redraw(); return; }
    record.v = d.v + 1; record.at = d.saveAt || api.now(); d.saveAt = record.at;
    state.busy = true; state.message = ''; var savedState = state, c = context;
    api.save(d.kind, d.id, record).then(function () {
      if (state !== savedState || c !== api.context() || !api.allowed()) return;
      state.busy = false; state.draft = null; state.message = 'Record saved.'; delete state.cache[d.kind]; delete state.cache[d.kind + '/' + d.id + '/hist']; redraw();
    }, function () {
      if (state !== savedState || c !== api.context() || !api.allowed()) return;
      state.busy = false; state.message = 'Could not save. Your entries are kept. If someone changed this record, cancel and refresh before editing again.'; redraw();
    });
    redraw();
  }
  document.addEventListener('input', function (e) {
    if (api && api.allowed() && e.target.matches('[data-ai-reference-query]')) { state.referenceSearchDraft = e.target.value; return; }
    if (!api || !api.allowed() || !state.draft || !e.target.matches('[data-ai-field]')) return;
    state.draft[e.target.getAttribute('data-ai-field')] = e.target.value; delete state.draft.saveAt;
  });
  document.addEventListener('change', function (e) {
    if (api && api.allowed() && e.target.matches('[data-ai-section]')) { state.section = e.target.value; state.item = ''; state.evidence = null; redraw(); return; }
    if (api && api.allowed() && state.draft && e.target.matches('[data-ai-field="supplierId"]')) { state.draft.supplierId = e.target.value; state.draft.itemId = ''; redraw(); }
  });
  document.addEventListener('submit', function (e) {
    if (e.target.matches('[data-ai-reference-search]') && api && api.allowed()) {
      e.preventDefault(); state.referenceQuery = state.referenceSearchDraft = e.target.querySelector('[name="q"]').value.trim(); state.referenceLimit = state.confirmedLimit = 20; redraw(); return;
    }
    if (!e.target.matches('[data-ai-search]') || !api || !api.allowed()) return;
    e.preventDefault(); state.query = e.target.querySelector('[name="q"]').value; state.item = ''; state.evidence = null; redraw();
  });
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-ai]'); if (!el || !api || !api.allowed() || api.context() !== context) return;
    var a = el.getAttribute('data-ai'), v = el.getAttribute('data-value');
    if (state.busy) return;
    if (a === 'range') { state.range = +v; state.item = ''; state.evidence = null; }
    if (a === 'page') { api.page(v); return; }
    if (a === 'refresh') { if (state.draft) { state.message = 'Save or cancel your record before refreshing.'; } else { state.request++; state.cache = {}; state.loading = {}; state.errors = {}; } }
    if (a === 'review-reference') { reviewReference(v); return; }
    if (a === 'more-references') state.referenceLimit += 20;
    if (a === 'more-confirmed') state.confirmedLimit += 20;
    if (a === 'clear-reference-search') { state.referenceQuery = state.referenceSearchDraft = ''; state.referenceLimit = state.confirmedLimit = 20; }
    if (a === 'retry') { delete state.errors[v]; delete state.cache[v]; }
    if (a === 'item') { state.item = v; state.evidence = null; }
    if (a === 'evidence') { state.evidence = v; state.evidenceLimit = 40; }
    if (a === 'day-evidence') { state.item = ''; state.evidence = v; state.evidenceLimit = 40; }
    if (a === 'more-evidence') state.evidenceLimit = (state.evidenceLimit || 40) + 40;
    if (a === 'clear-section') state.section = '';
    if (a === 'history') state.history = v;
    if (a === 'person') state.person = v;
    if (a === 'new-reference') { start('references'); return; }
    if (a === 'map') { api.page('references'); start('references', { alias: v, label: v }); return; }
    if (a === 'new-training') { start('training'); return; }
    if (a === 'training-opportunity') {
      if (state.draft) { state.message = 'Save or cancel your record first.'; redraw(); return; }
      var opportunity; try { opportunity = JSON.parse(v); } catch (err) { return; }
      if (!api.people().some(function (p) { return p.id === opportunity.personId; })) return;
      state.person = opportunity.personId;
      start('training', { personId: opportunity.personId, section: opportunity.section }); return;
    }
    if (a === 'assess-section') { start('training', { personId: state.person, section: v }); return; }
    if (a === 'edit-reference' || a === 'edit-training') { var kind = a === 'edit-reference' ? 'references' : 'training'; if (state.draft) { state.message = 'Save or cancel your record first.'; } else { start(kind, (state.cache[kind] || []).filter(function (r) { return r.id === v; })[0]); return; } }
    if (a === 'cancel') { state.draft = null; state.message = ''; }
    if (a === 'save') { save(); return; }
    redraw();
  });
  window.LK_INTELLIGENCE = {
    API: 2,
    reset: reset, dirty: function () { return !!state.draft; },
    html: function (page, adapter) {
      api = adapter; if (!api.allowed()) { reset(); return ''; }
      if (context !== api.context()) { reset(); context = api.context(); }
      // Guides use the app's existing audience-aware reader, including bundled guides.
      api.loadGuides();
      var history = '';
      if (state.history) { var revisions = data(state.history, true); history = block('Revision history', revisions ? (revisions.length ? '<ul class="ai-list">' + revisions.map(function (r) { return '<li>Revision ' + r.v + ': ' + esc(r.label || r.status) + ', ' + esc(api.clock(r.at)) + '</li>'; }).join('') + '</ul>' : '<p class="hint">No earlier revisions.</p>') : waiting(state.history)); }
      var content = page === 'overview' ? overview() : page === 'analysis' ? analysis() : page === 'references' ? references() : training();
      return '<div class="ai-workspace">' + (state.message ? '<p class="ai-message" role="status">' + esc(state.message) + '</p>' : '') + content + history + '</div>';
    }
  };
})();
