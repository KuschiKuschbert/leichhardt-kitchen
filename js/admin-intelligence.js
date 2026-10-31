/* Loaded only in the verified admin workspace. Private records stay in memory. */
(function () {
  'use strict';
  var api, context = '', state;
  var labels = { prep: 'Prep lines', orders: 'Staff order lines', waste: 'Waste entries', transfers: 'Transfer entries', supplierOrders: 'Supplier order lines', deliveries: 'Delivery receipts', functions: 'Confirmed functions' };
  function reset() { context = ''; state = { cache: {}, loading: {}, errors: {}, refs: null, training: null, suppliers: null, range: 30, query: '', item: '', evidence: null, draft: null, message: '', busy: false }; }
  reset();
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function button(action, text, value) { return '<button type="button" class="btn" data-ai="' + action + '" data-value="' + esc(value || '') + '">' + esc(text) + '</button>'; }
  function block(title, body) { return '<section class="set-block"><h3 class="label">' + esc(title) + '</h3>' + body + '</section>'; }
  function redraw() { if (api && api.allowed() && api.context() === context) api.draw(); }
  function load(name, list) {
    if (state.cache[name] !== undefined || state.loading[name] || state.errors[name]) return;
    var s = state, c = context; s.loading[name] = true;
    (list ? api.list(name) : api.get(name)).then(function (data) {
      if (state !== s || c !== api.context() || !api.allowed()) return;
      s.cache[name] = data; s.loading[name] = false; redraw();
    }, function () { if (state !== s || c !== api.context() || !api.allowed()) return; s.loading[name] = false; s.errors[name] = true; redraw(); });
  }
  function data(name, list) { load(name, list); return state.cache[name]; }
  function waiting(name) {
    return state.errors[name] ? '<p class="p-err" role="status">Could not load this data. Check the connection or deployed rules.</p>' + button('retry', 'Try again', name) : '<p class="hint" role="status">Loading...</p>';
  }
  function options(list, value, empty) { return '<option value="">' + esc(empty || 'Not linked') + '</option>' + list.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === value ? ' selected' : '') + '>' + esc(x.name || x.title || x.id) + '</option>'; }).join(''); }
  function field(name, label, value, opts) { return '<div class="field"><label class="label" for="ai-' + name + '">' + esc(label) + '</label>' + (opts ? '<select class="search" id="ai-' + name + '" data-ai-field="' + name + '">' + options(opts, value, ['personId', 'assessorId', 'section'].indexOf(name) >= 0 ? 'Choose ' + label.toLowerCase() : 'Not linked') + '</select>' : '<input class="search" id="ai-' + name + '" data-ai-field="' + name + '" maxlength="160" value="' + esc(value) + '">') + '</div>'; }
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
        var st = state, original = s, chosen = state.section, ctx = context; st.loading[cacheKey] = true;
        Promise.all(s.dates.map(function (d) { return api.get('analysisDaily/' + original.generation + '_' + d.day); })).then(function (days) {
          if (state !== st || ctx !== api.context() || !api.allowed()) return;
          if (days.some(function (d) { return !d; })) throw new Error('expired');
          st.cache[cacheKey] = window.LK_ANALYSIS.aggregate(days, chosen); st.loading[cacheKey] = false; redraw();
        }).catch(function () { if (state === st && ctx === api.context() && api.allowed()) { st.loading[cacheKey] = false; st.errors[cacheKey] = true; redraw(); } });
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
      '<div class="field"><label class="label" for="ai-day">Assessment date</label><input type="date" class="search" id="ai-day" data-ai-field="day" value="' + esc(d.day) + '" max="' + api.day() + '"></div>';
    return block(kind === 'references' ? 'Confirm reference' : 'Training record', '<div class="ai-editor">' + body + '<div class="btn-row"><button type="button" class="btn dark" data-ai="save"' + (state.busy ? ' disabled' : '') + '>' + (state.busy ? 'Saving...' : 'Save record') + '</button>' + button('cancel', 'Cancel') + '</div><p class="hint">Changes are saved with a revision history. Original operational records stay intact.</p></div>');
  }
  function references() {
    var refs = data('references', true); data('suppliers', true);
    if (!refs) return block('Item references', waiting('references'));
    return block('Item references', '<p class="hint">Confirm how a typed name connects to a recipe and supplier item. Changes enter the next nightly analysis; published evidence keeps its original mappings. Duplicate aliases are refused here. Conflicting existing mappings remain unjoined.</p>' + button('new-reference', 'Add a reference') +
      '<ul class="ai-list">' + refs.map(function (r) { return '<li><strong>' + esc(r.alias) + '</strong> → ' + esc(r.label) + linked(r) + button('edit-reference', 'Change reference', r.id) + button('history', 'Revision history', 'references/' + r.id + '/hist') + '</li>'; }).join('') + '</ul>' + (!refs.length ? '<p class="hint">No confirmed references yet. Open an item in Analysis to start with its recorded name.</p>' : '')) + editor('references');
  }
  function training() {
    var records = data('training', true), s = summary(), people = api.people(), names = {};
    people.forEach(function (p) { names[p.id] = p.name; });
    if (!records) return block('Training records', waiting('training'));
    return block('Training records', '<p class="hint">Activity is not verified competence. Only an explicit assessment records training status. A missing record means Not assessed.</p>' + button('new-training', 'Add training record') +
      '<ul class="ai-list">' + records.filter(function (r) { return !state.person || r.personId === state.person; }).map(function (r) { return '<li><strong>' + esc(names[r.personId] || 'Former team member') + '</strong>: ' + esc(r.section || r.recipeId) + '. ' + esc(r.status.replace(/-/g, ' ')) + '<br><small>' + esc(r.day) + ', assessor: ' + esc(names[r.assessorId] || 'Former team member') + '</small>' + linked(r) + button('edit-training', 'Change training record', r.id) + button('history', 'Revision history', 'training/' + r.id + '/hist') + '</li>'; }).join('') + '</ul>') + editor('training') +
      block('Recorded station activity', filters() + '<p class="hint">Completed-day prep ticks only. No recorded activity in this period does not mean untrained. Choose a person to see counts and linked learning material.</p>' +
        '<div class="btn-row">' + button('person', 'Everyone', '') + people.map(function (p) { return button('person', p.name, p.id); }).join('') + '</div>' +
        (state.person ? '<h4>' + esc(names[state.person]) + '</h4>' + (s === undefined ? waiting('analysis/range-' + state.range) : !s ? '<p class="hint">No activity analysis has been published yet.</p>' : '<p class="hint">' + esc(s.from) + ' to ' + esc(s.to) + '.</p>' + stationGaps(s, records, state.person)) + '<p class="hint">Training references for this person appear above. Recipe and guide links open the original material.</p>' : ''));
  }
  function stationGaps(s, records, person) {
    var sections = api.sections(), activity = s.people[person] || {};
    if (!sections.length) sections = Object.keys(s.sections || {});
    return '<ul class="ai-list">' + sections.map(function (section) {
      var matches = records.filter(function (r) { return r.personId === person && r.section === section; }).sort(function (a, b) { return b.day.localeCompare(a.day) || b.at - a.at; });
      var assessment = matches[0];
      return '<li><strong>' + esc(section) + '</strong><p>' + (activity[section] ? activity[section] + ' recorded ticks.' : 'No recorded activity in this period.') + ' Assessment: ' + esc(assessment ? assessment.status.replace(/-/g, ' ') : 'Not assessed') + '.</p>' + (assessment ? linked(assessment) : button('assess-section', 'Add assessment', section)) + '</li>';
    }).join('') + '</ul>';
  }
  function start(kind, record) {
    if (state.draft) { state.message = 'Save or cancel your record first.'; redraw(); return; }
    state.draft = Object.assign({ kind: kind, id: 'ai-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8), v: 0,
      alias: '', label: '', recipeId: '', supplierId: '', itemId: '', guideId: '', personId: '', section: '', status: 'not-assessed', assessorId: '', day: api.day() }, record || {});
    state.message = ''; redraw();
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
    if (!api || !api.allowed() || !state.draft || !e.target.matches('[data-ai-field]')) return;
    state.draft[e.target.getAttribute('data-ai-field')] = e.target.value; delete state.draft.saveAt;
  });
  document.addEventListener('change', function (e) {
    if (api && api.allowed() && e.target.matches('[data-ai-section]')) { state.section = e.target.value; state.item = ''; state.evidence = null; redraw(); return; }
    if (api && api.allowed() && state.draft && e.target.matches('[data-ai-field="supplierId"]')) { state.draft.supplierId = e.target.value; state.draft.itemId = ''; redraw(); }
  });
  document.addEventListener('submit', function (e) {
    if (!e.target.matches('[data-ai-search]') || !api || !api.allowed()) return;
    e.preventDefault(); state.query = e.target.querySelector('[name="q"]').value; state.item = ''; state.evidence = null; redraw();
  });
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-ai]'); if (!el || !api || !api.allowed() || api.context() !== context) return;
    var a = el.getAttribute('data-ai'), v = el.getAttribute('data-value');
    if (state.busy) return;
    if (a === 'range') { state.range = +v; state.item = ''; state.evidence = null; }
    if (a === 'page') { api.page(v); return; }
    if (a === 'refresh') { if (state.draft) { state.message = 'Save or cancel your record before refreshing.'; } else { state.cache = {}; state.errors = {}; } }
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
    if (a === 'assess-section') { start('training', { personId: state.person, section: v }); return; }
    if (a === 'edit-reference' || a === 'edit-training') { var kind = a === 'edit-reference' ? 'references' : 'training'; if (state.draft) { state.message = 'Save or cancel your record first.'; } else { start(kind, (state.cache[kind] || []).filter(function (r) { return r.id === v; })[0]); return; } }
    if (a === 'cancel') { state.draft = null; state.message = ''; }
    if (a === 'save') { save(); return; }
    redraw();
  });
  window.LK_INTELLIGENCE = {
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
