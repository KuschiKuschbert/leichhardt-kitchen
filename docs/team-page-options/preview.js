/* Isolated Today's team design sketches. Fictional records, memory only, no application imports or network. */
(function () {
  'use strict';
  var root = document.getElementById('preview-root');
  if (!root) return;
  var params = new URLSearchParams(location.search), design = (params.get('design') || 'A').toUpperCase();
  if (['A', 'B', 'C'].indexOf(design) < 0) design = 'A';
  var TODAY = '2026-11-10', MINUTE = 840, pending = null, timer = null, generation = 0, state;
  var names = ['Ann', 'Sam', 'Bo', 'Cam', 'Dee', 'Eli', 'Fin', 'Gia', 'Jo', 'Kai'];
  var people = names.map(function (name) { return { id: name.toLowerCase(), name: name }; });
  var services = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320 }, { id: 'smoker', name: 'Smoker', from: 360, to: 660 }];
  var sections = [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }, { id: 'larder', name: 'Larder' }];
  var lengths = [30, 45, 60, 90, 120, 150, 180, 210, 240];
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function freeze(x) { if (x && typeof x === 'object') { Object.keys(x).forEach(function (k) { freeze(x[k]); }); Object.freeze(x); } return x; }
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function addDays(day, n) { var d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function weekStart(day) { var d = new Date(day + 'T12:00:00Z'); return addDays(day, -((d.getUTCDay() + 6) % 7)); }
  function dateWords(day, short) { return new Date(day + 'T12:00:00Z').toLocaleDateString('en-AU', short ? { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' } : { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }); }
  function timeWords(m) { var day = m >= 1440 ? ' next day' : ''; m = m % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0') + day; }
  function timeValue(m) { return timeWords(m).slice(0, 5); }
  function parseTime(v) { var a = /^(\d{2}):(\d{2})$/.exec(v); return a && +a[1] < 24 && +a[2] < 60 ? +a[1] * 60 + +a[2] : null; }
  function person(id) { return people.filter(function (p) { return p.id === id; })[0]; }
  function service(id) { return services.filter(function (s) { return s.id === id; })[0]; }
  function personName(id) { var p = person(id); return state.long && id === 'ann' ? 'Alexandria Montgomery-Sutherland' : p ? p.name : 'Unknown person'; }
  function sectionName(id) { var s = sections.filter(function (x) { return x.id === id; })[0]; return state.long && id === 'pans' ? 'Hot section and pass support' : state.long && id === 'larder' ? 'Cold preparation and shared service' : s ? s.name : 'No section'; }
  function blank(day) { return { day: day, on: [], br: [], v: 0, by: '', upd: '' }; }
  function initialPlan(day) {
    var p = blank(day);
    if (day === addDays(TODAY, 1)) {
      p.on = [{ id: 'jo', sh: 'lunch', sec: 'pans' }, { id: 'kai', sh: 'dinner', sec: 'larder' }];
    } else if (day === TODAY) {
      p.on = people.slice(0, 7).map(function (x, i) { return { id: x.id, sh: 'lunch', sec: sections[(i === 0 ? 1 : i === 1 ? 0 : i) % 3].id }; }).concat([
        { id: 'ann', sh: 'dinner', sec: 'larder' }, { id: 'sam', sh: 'dinner', sec: 'grill' }, { id: 'gia', sh: 'dinner', sec: 'pans' }, { id: 'cam', sh: 'smoker', sec: 'grill' }
      ]);
      p.br = [{ id: 'ann', sh: 'lunch', at: 825, len: 45 }, { id: 'bo', sh: 'lunch', at: 750, len: 150 }, { id: 'ann', sh: 'dinner', at: 1140, len: 30 }];
    }
    if (p.on.length) { p.v = 1; p.by = 'Sam'; p.upd = '13:00'; }
    return p;
  }
  function ensure(day) {
    if (!state.saved[day]) { state.saved[day] = initialPlan(day); state.drafts[day] = clone(state.saved[day]); state.version[day] = state.saved[day].v; }
    if (!state.rowServiceViews[day]) state.rowServiceViews[day] = {};
    if (!state.ui[day]) state.ui[day] = { open: {}, focus: '', search: '', addOpen: false, addPeople: {}, addServices: { lunch: true }, tools: false, whole: false, spread: { service: 'lunch', start: '12:00', length: 30, gap: '', groups: '1' } };
    return state.drafts[day];
  }
  function draft() { return ensure(state.selectedDate); }
  function ui() { ensure(state.selectedDate); return state.ui[state.selectedDate]; }
  function sig(p) { return JSON.stringify({ on: p.on.slice().sort(function (a, b) { return (a.id + a.sh).localeCompare(b.id + b.sh); }), br: p.br.slice().sort(function (a, b) { return (a.id + a.sh + a.at).localeCompare(b.id + b.sh + b.at); }) }); }
  function dirty(day) { ensure(day); return sig(state.drafts[day]) !== sig(state.saved[day]); }
  function readonly() { return state.readOnly || state.selectedDate < TODAY || state.readState !== 'ok'; }
  function busy() { return state.saveState.status === 'saving'; }
  function editable() { return !readonly() && !busy(); }
  function membership(p, id, sh) { return p.on.filter(function (x) { return x.id === id && x.sh === sh; })[0]; }
  function breaks(p, id, sh) { return p.br.filter(function (b) { return b.id === id && b.sh === sh; }).sort(function (a, b) { return a.at - b.at; }); }
  function selectedPeople() { var p = draft(); return people.filter(function (x) { return p.on.some(function (o) { return o.id === x.id && !!service(o.sh); }); }); }
  function rowService(id) {
    var views = state.rowServiceViews[state.selectedDate];
    if (!service(views[id])) { var first = services.filter(function (s) { return !!membership(draft(), id, s.id); })[0]; views[id] = first ? first.id : 'lunch'; }
    return views[id];
  }
  function attrs(obj) { return Object.keys(obj || {}).map(function (k) { return ' ' + k + '="' + esc(obj[k]) + '"'; }).join(''); }
  function button(action, text, data, cls, off) { return '<button type="button" data-action="' + action + '"' + attrs(data) + (cls ? ' class="' + cls + '"' : '') + (off ? ' disabled' : '') + '>' + text + '</button>'; }
  function select(action, label, values, current, data, off) {
    var visible = action === 'service' ? 'Service to edit' : action === 'section' ? 'Section' : label;
    var chosen = values.filter(function (x) { return String(x[0]) === String(current); })[0];
    return '<label class="field"><span>' + esc(visible) + '</span><select data-action="' + action + '" aria-label="' + esc(label) + '"' + attrs(data) + (off ? ' disabled' : '') + '>' + values.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (String(x[0]) === String(current) ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select>' + (chosen && chosen[1].length > 15 && (action === 'service' || action === 'section') ? '<small class="full-value">' + esc(chosen[1]) + '</small>' : '') + '</label>';
  }
  function times(sh, keep) {
    var s = service(sh), from = s ? s.from : 360, to = s ? s.to : 1425, values = [];
    for (var m = from; m <= to; m += 15) values.push(m);
    if (keep != null && values.indexOf(keep) < 0) values.push(keep);
    return values.sort(function (a, b) { return a - b; }).map(function (n) { return [n, timeWords(n)]; });
  }
  function input(action, label, value, type, data, off) { return '<label class="field"><span>' + esc(label) + '</span><input type="' + type + '" data-action="' + action + '" aria-label="' + esc(label) + '" value="' + esc(value) + '"' + (type === 'search' ? ' placeholder="Find a person"' : '') + (type === 'time' ? ' step="900"' : '') + attrs(data) + (off ? ' disabled' : '') + '></label>'; }
  function planStatus() {
    var st = state.saveState;
    if (state.readState === 'loading') return 'Checking the plan. Drafts kept.';
    if (state.readState === 'error') return 'Could not check the plan. Drafts kept.';
    if (state.readState === 'unknown') return 'Plan not checked yet.';
    if (st.day === state.selectedDate && st.status !== 'idle') return st.message;
    return dirty(state.selectedDate) ? 'Unsaved changes' : state.saved[state.selectedDate].v ? 'Saved ' + state.saved[state.selectedDate].upd + ' · ' + state.saved[state.selectedDate].by : 'No team saved yet';
  }
  function statusClass() {
    if (state.readState === 'error' || state.saveState.day === state.selectedDate && ['fail', 'conflict'].indexOf(state.saveState.status) >= 0) return 'failed';
    if (state.readState === 'unknown') return '';
    if (busy() || state.readState === 'loading' || dirty(state.selectedDate)) return 'pending';
    return state.saved[state.selectedDate].v ? 'saved' : '';
  }
  function week() {
    var start = weekStart(state.selectedDate), out = '';
    for (var i = 0; i < 7; i++) { var d = addDays(start, i); ensure(d); out += button('date', '<span>' + dateWords(d, true).split(' ')[0] + '</span><b>' + +d.slice(-2) + '</b><small>' + (dirty(d) ? 'Draft' : state.saved[d].v ? 'Saved' : 'Not set') + '</small>', { 'data-date': d, 'aria-pressed': d === state.selectedDate, 'aria-label': dateWords(d) + (d === TODAY ? ', today' : '') }, 'day', busy()); }
    return '<nav class="week" aria-label="Choose a planning date"><div class="week-nav">' + button('previous-week', '‹', { 'aria-label': 'Previous week' }, '', busy()) + '<span>' + esc(dateWords(start, true)) + ' to ' + esc(dateWords(addDays(start, 6), true)) + '</span>' + button('next-week', '›', { 'aria-label': 'Next week' }, '', busy()) + button('today', 'Today', {}, '', busy()) + '</div><div class="week-days">' + out + '</div></nav>';
  }
  function liveBoard() {
    ensure(TODAY);
    var source = state.saved[TODAY], board = state.board, invalid = board === 'malformed' || source.br.some(function (b) { return typeof b.at !== 'number' || !Number.isFinite(b.at) || typeof b.len !== 'number' || b.len <= 0; });
    if (board === 'checking') return '<aside class="live-board" data-state="checking"><strong>Checking saved breaks</strong><span>Today · saved plan</span></aside>';
    if (board === 'failed') return '<aside class="live-board" data-state="failed"><strong>Could not check saved breaks</strong><span>Try the preview read again.</span></aside>';
    if (board === 'unknown' || invalid) return '<aside class="live-board" data-state="unknown"><strong>Saved break status could not be checked</strong><span>Unknown is not nobody on break.</span></aside>';
    var active = source.br.filter(function (b) { return b.at <= MINUTE && b.at + b.len > MINUTE && membership(source, b.id, b.sh); });
    if (!active.length) return '<aside class="live-board" data-state="empty" hidden>Confirmed nobody on break in this saved example.</aside>';
    return '<aside class="live-board" data-state="saved"><div class="now-line"><div><strong>On break now</strong><p>' + active.map(function (b) { return '<span><b>' + esc(personName(b.id)) + '</b> <small>' + (b.len >= 150 ? 'Split' : 'Meal break') + '</small> <span class="returns">Until ' + timeWords(b.at + b.len) + '</span></span>'; }).join(' · ') + '</p><small>Today · saved plan · 14:00</small></div>' +
      button('toggle-board', state.boardExpanded ? 'Hide saved details' : 'Saved details', { 'aria-expanded': state.boardExpanded }, 'board-details') + '</div>' + (state.boardExpanded ? '<div class="live-details">' + source.br.map(function (b) { return '<p>' + esc(personName(b.id) + ' · ' + service(b.sh).name) + ' · ' + timeWords(b.at) + ' to ' + timeWords(b.at + b.len) + '</p>'; }).join('') + '</div>' : '') + '</aside>';
  }
  function header() {
    var titles = { A: 'Open worksheet', B: 'Plan in stages', C: 'Roster and focus' };
    return '<header class="planner-head"><div><p class="eyebrow">Today\'s team · ' + esc(titles[design]) + '</p><h1>' + esc(dateWords(state.selectedDate)) + '</h1></div><p class="status ' + statusClass() + '" role="status">' + esc(planStatus()) + '</p></header>' +
      (state.readOnly ? '<p class="notice">Read-only preview. This does not test real permissions.</p>' : state.selectedDate < TODAY ? '<p class="notice">Past date. Read-only.' + (state.seededPast === state.selectedDate ? ' This past plan is a deliberate fictional scenario.' : '') + '</p>' : '') +
      (design === 'C' ? '<div class="compact-date">' + button('toggle-dates', 'Choose date · ' + esc(dateWords(state.selectedDate, true)), { 'aria-expanded': state.datesOpen }, '', busy()) + button('today', 'Today', {}, '', busy()) + '</div>' + (state.datesOpen ? week() : '') : week()) + liveBoard() +
      (state.selectedDate !== TODAY ? '<p class="future-note">Editing ' + esc(dateWords(state.selectedDate)) + '. Today\'s saved live board stays separate.</p>' : '');
  }
  function addStaff() {
    var v = ui();
    if (!v.addOpen) return '';
    var count = Object.keys(v.addPeople).filter(function (id) { return v.addPeople[id]; }).length;
    var chosen = services.filter(function (s) { return v.addServices[s.id]; });
    return '<section class="add-staff" aria-label="Add staff to this date"><h2>Who\'s working?</h2><p>Select the people and services for this group. Add them to the draft.</p><fieldset class="service-options"><legend>Services for this group</legend>' + services.map(function (s) { return '<label class="check"><input type="checkbox" data-action="add-shift" data-service="' + s.id + '"' + (v.addServices[s.id] ? ' checked' : '') + (!editable() ? ' disabled' : '') + '><span>' + esc(s.name) + '</span></label>'; }).join('') + '</fieldset><fieldset class="staff-options"><legend>Eligible staff</legend>' + people.map(function (p) { return '<label class="check"><input type="checkbox" data-action="add-person" data-person="' + p.id + '"' + (v.addPeople[p.id] ? ' checked' : '') + (!editable() ? ' disabled' : '') + '><span>' + esc(personName(p.id)) + '</span></label>'; }).join('') + '</fieldset><p role="status">' + count + ' selected · ' + chosen.length + ' services</p>' + button('add-staff', 'Add selected staff', {}, 'primary', !editable() || !count || !chosen.length) + button('hide-add', 'Cancel', {}, '', busy()) + '</section>';
  }
  function toolbar() { return '<div class="toolbar">' + button('show-add', 'Add staff', { 'aria-expanded': ui().addOpen }, '', !editable()) + input('search', 'Find a person', ui().search, 'search', {}, false) + '</div>' + addStaff(); }
  function breakSummary(id, sh) { var on = membership(draft(), id, sh); if (!on) return 'Not on ' + service(sh).name; var bs = breaks(draft(), id, sh); return bs.length ? bs.map(function (b) { return (b.len >= 150 ? 'Split ' : 'Break ') + timeWords(b.at) + ' to ' + timeWords(b.at + b.len); }).join(' · ') : 'Break not set'; }
  function overlap(id, sh) { var bs = breaks(draft(), id, sh); return bs.some(function (b, i) { return bs.some(function (x, j) { return j > i && b.at < x.at + x.len && x.at < b.at + b.len; }); }); }
  function breakEditor(id, sh, cls) {
    var p = draft(), on = membership(p, id, sh), s = service(sh), data = { 'data-person': id, 'data-service': sh }, content = '<h3>' + esc(personName(id) + ' · ' + s.name) + '</h3><p class="context">' + esc(dateWords(state.selectedDate)) + ' · Draft</p>';
    if (!on) return '<div class="break-editor ' + (cls || '') + '">' + content + '<p>Not on ' + esc(s.name) + '. Choose Add service before assigning a section or break.</p>' + button('add-service', 'Add ' + esc(s.name), data, '', !editable()) + '</div>';
    content += '<div class="break-fields">' + breaks(p, id, sh).map(function (b, i) {
      var data_ = { 'data-person': id, 'data-service': sh, 'data-index': i };
      return '<div class="break-line fields">' + select('break-time', (b.len >= 150 ? 'Split' : 'Break') + ' starts for ' + personName(id), times(sh, b.at), b.at, data_, !editable()) +
        select('break-length', 'Length for ' + personName(id), lengths.map(function (n) { return [n, n >= 150 ? 'Split ' + n / 60 + ' h' : n + ' min']; }), b.len, data_, !editable()) + button('remove-break', 'Remove break', data_, '', !editable()) + '</div>';
    }).join('') + '</div>' + (breaks(p, id, sh).length < 3 ? button('add-break', '+ Break', data, '', !editable()) : '<p>Three breaks set for this service.</p>') +
      (overlap(id, sh) ? '<p class="overlap-warning warning-box" role="status">Review: this person\'s meal break and another break or split overlap. No automatic correction.</p>' : '') +
      '<p>Other services: ' + esc(p.on.filter(function (x) { return x.id === id && x.sh !== sh; }).map(function (x) { return service(x.sh).name + ' · ' + sectionName(x.sec); }).join(', ') || 'None set') + '</p>' + button('remove-service', 'Remove ' + esc(s.name) + ' and its breaks', data, 'remove-service', !editable());
    return '<div class="break-editor ' + (cls || '') + '">' + content + '</div>';
  }
  function row(id, mode) {
    var sh = rowService(id), s = service(sh), on = membership(draft(), id, sh), data = { 'data-person': id, 'data-service': sh };
    var fields = select('service', 'Service to edit for ' + personName(id), services.map(function (x) { return [x.id, x.name]; }), sh, { 'data-person': id }, busy()) +
      select('section', 'Section for ' + personName(id) + ' on ' + s.name, [['', 'No section']].concat(sections.map(function (x) { return [x.id, sectionName(x.id)]; })), on ? on.sec : '', data, !editable() || !on);
    var more = button('edit-breaks', mode === 'breaks' ? 'Breaks shown' : 'Edit breaks', Object.assign({ 'aria-expanded': design === 'C' ? ui().focus === id : !!ui().open[id + ':' + sh] }, data), '', busy());
    var body = '<div class="person-head"><b class="person-name">' + esc(personName(id)) + '</b><div class="row-fields">' + fields + '</div></div><div class="row-summary"><p>' + esc(breakSummary(id, sh)) + '</p>' + more + '</div>';
    if (!on) body += '<div class="membership-action membership"><span>Viewing ' + esc(s.name) + ' does not add this service.</span>' + button('add-service', 'Add ' + esc(s.name), data, '', !editable()) + '</div>';
    if (mode === 'breaks') body += breakEditor(id, sh);
    else if (design === 'A' && ui().open[id + ':' + sh]) body += breakEditor(id, sh);
    else if (design === 'C' && ui().focus === id && !matchMedia('(min-width: 1100px)').matches) body += '<section class="detail-workbench" aria-label="Selected person details">' + button('close-detail', 'Close details', {}, '', busy()) + breakEditor(id, sh) + '</section>';
    return '<article class="person-row' + (ui().focus === id ? ' is-focused' : '') + '" data-person="' + id + '">' + body + '</article>';
  }
  function roster(mode) {
    var q = ui().search.trim().toLowerCase(), ps = selectedPeople().filter(function (p) { return !q || personName(p.id).toLowerCase().indexOf(q) >= 0; });
    return '<div class="roster">' + (ps.length ? ps.map(function (p) { return row(p.id, mode); }).join('') : '<p class="empty">' + (selectedPeople().length ? 'No selected people match. Change the search.' : 'Nobody selected for this date yet. Use Add staff to choose who is working.') + '</p>') + '</div>';
  }
  function wholeDay() {
    return '<section class="whole-day"><h2>Whole day review</h2><p>' + esc(dateWords(state.selectedDate)) + ' · ' + (dirty(state.selectedDate) ? 'Draft, not saved' : 'Saved plan') + '</p>' + selectedPeople().map(function (p) {
      return '<article class="review-row"><h3>' + esc(personName(p.id)) + '</h3>' + draft().on.filter(function (o) { return o.id === p.id; }).map(function (o) { return '<p><b>' + esc(service(o.sh).name + ' · ' + sectionName(o.sec)) + '</b><br>' + esc(breakSummary(p.id, o.sh)) + (overlap(p.id, o.sh) ? '<br><span class="warning">Review overlapping breaks for this person.</span>' : '') + '</p>'; }).join('') + '</article>';
    }).join('') + '</section>';
  }
  function tools() {
    var t = ui().spread;
    var warnings = selectedPeople().filter(function (p) { return services.some(function (s) { return overlap(p.id, s.id); }); });
    return '<details class="tools"' + (ui().tools ? ' open' : '') + '><summary data-action="toggle-tools">Copy a day or spread breaks</summary><div class="tools-body"><h2>Spread breaks</h2><p>Starts can overlap. Check each person\'s meal breaks and splits before Save.</p><div class="tool-fields">' +
      select('spread-service', 'Service for Spread', services.map(function (s) { return [s.id, s.name]; }), t.service, {}, !editable()) + select('spread-start', 'First break starts', times(t.service, parseTime(t.start)), parseTime(t.start), {}, !editable()) +
      select('spread-length', 'Each break lasts', lengths.map(function (n) { return [n, n >= 150 ? 'Split ' + n / 60 + ' h' : n + ' min']; }), t.length, {}, !editable()) +
      select('spread-groups', 'Start together', [['1', 'One person'], ['2', 'Two people'], ['0', 'Everyone']], t.groups, {}, !editable()) +
      (t.groups !== '0' ? select('spread-gap', 'Start next group every', [['', 'After previous break']].concat([15].concat(lengths).map(function (n) { return [n, n + ' min']; })), t.gap, {}, !editable()) : '') + '</div>' +
      button('spread', 'Spread into draft', {}, '', !editable()) + (warnings.length ? '<p class="warning-box overlap-warning" role="status">Review overlapping breaks or splits for ' + esc(warnings.map(function (p) { return personName(p.id); }).join(', ')) + '. The draft has not been automatically corrected.</p>' : '') + '<h2>Copy last weekday</h2><p>Copies ' + esc(dateWords(addDays(state.selectedDate, -7))) + ' into this empty draft for review.</p>' + button('copy', 'Use last ' + esc(dateWords(addDays(state.selectedDate, -7)).split(' ')[0]), {}, '', !editable() || draft().on.length > 0) + '</div></details>';
  }
  function saveArea() {
    return '<div class="save-area"><p class="status ' + statusClass() + '" role="status">' + esc(planStatus()) + '</p>' + button('save', busy() ? 'Saving ' + esc(dateWords(state.saveState.day)) + '...' : 'Save ' + esc(dateWords(state.selectedDate)), {}, 'primary', !editable() || !dirty(state.selectedDate)) +
      (state.saveState.day === state.selectedDate && (state.saveState.status === 'fail' || state.saveState.status === 'conflict') ? button('refresh', state.refreshArmed ? 'Tap again to discard this date\'s draft' : 'Refresh saved plan', {}, '', busy()) : '') + '</div>';
  }
  function render(focus) {
    ensure(state.selectedDate);
    var active = document.activeElement, selection = null, activeData = focus || (root.contains(active) && active.dataset.action ? clone(active.dataset) : null);
    if (activeData && active && typeof active.selectionStart === 'number') selection = [active.selectionStart, active.selectionEnd];
    var content = header();
    if (state.readState !== 'ok') content += '<p class="notice">' + esc(planStatus()) + '</p>' + button('retry-read', 'Retry preview read', {}, '', false);
    else if (design === 'B') {
      content += '<nav class="steps" aria-label="Planning stages">' + [['assignments', 'Assignments'], ['breaks', 'Breaks'], ['review', 'Review']].map(function (x, i) { return button('stage', '<small>' + (i + 1) + '</small> ' + x[1], { 'data-stage': x[0], 'aria-pressed': state.stage === x[0] }, '', busy()); }).join('') + '</nav><section class="stage">';
      content += state.stage === 'review' ? wholeDay() + saveArea() : toolbar() + roster(state.stage === 'breaks' ? 'breaks' : '') + '<div class="stage-next">' + button('stage', state.stage === 'assignments' ? 'Check breaks' : 'Review this day', { 'data-stage': state.stage === 'assignments' ? 'breaks' : 'review' }, '', busy()) + '</div>';
      content += '</section>' + tools();
    } else {
      content += toolbar();
      if (design === 'C') {
        var focused = ui().focus && selectedPeople().some(function (p) { return p.id === ui().focus; }) ? ui().focus : '';
        content += '<div class="planner-grid">' + roster('') + (matchMedia('(min-width: 1100px)').matches ? '<aside class="detail-workbench" aria-label="Selected person details">' + (focused ? button('close-detail', 'Close details', {}, '', busy()) + breakEditor(focused, rowService(focused)) : '<h2>Service and break details</h2><p>Choose Edit breaks beside a person. Their roster stays in view.</p>') + '</aside>' : '') + '</div>' + saveArea();
      } else content += roster('') + saveArea();
      content += '<div class="review-action">' + button('whole-day', ui().whole ? 'Hide Whole day review' : 'Whole day review', { 'aria-expanded': ui().whole }, '', false) + '</div>' + (ui().whole ? wholeDay() : '') + tools();
    }
    root.innerHTML = '<section class="planner design-' + design.toLowerCase() + '" data-design="' + design + '">' + content + (state.note ? '<p class="action-note status" role="status">' + esc(state.note) + '</p>' : '') + '</section>';
    if (activeData) {
      var next = Array.prototype.filter.call(root.querySelectorAll('[data-action]'), function (el) { return Object.keys(activeData).every(function (k) { return el.dataset[k] === String(activeData[k]); }); })[0];
      if (next) { next.focus({ preventScroll: true }); if (selection && next.setSelectionRange) try { next.setSelectionRange(selection[0], selection[1]); } catch (ignore) {} }
    }
  }
  function changed(message) { state.saveState = { status: 'idle', day: state.selectedDate, message: '' }; state.note = message || 'Draft changed. Save when ready.'; state.refreshArmed = false; }
  function navigate(day) { if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || new Date(day + 'T12:00:00Z').toISOString().slice(0, 10) !== day || busy()) return; state.selectedDate = day; ensure(day); state.refreshArmed = false; render(); }
  function save() {
    if (!editable() || !dirty(state.selectedDate)) return;
    var day = state.selectedDate, ticket = { day: day, plan: clone(draft()), base: draft().v, generation: generation };
    pending = ticket; state.saveState = { status: 'saving', day: day, message: 'Saving ' + dateWords(day) + '. Waiting for preview acknowledgement.' }; render();
    if (state.saveMode !== 'hold') timer = setTimeout(function () { acknowledge(ticket, state.saveMode); }, 450);
  }
  function acknowledge(ticket, mode) {
    if (!pending || pending !== ticket || ticket.generation !== generation) return;
    pending = null; clearTimeout(timer); timer = null;
    if (mode === 'fail') state.saveState = { status: 'fail', day: ticket.day, message: 'Not saved. Your draft is kept. Retry Save when ready.' };
    else if (mode === 'conflict' || state.version[ticket.day] !== ticket.base) {
      state.version[ticket.day] = Math.max(state.version[ticket.day], ticket.base + 1); state.saved[ticket.day].v = state.version[ticket.day];
      state.saveState = { status: 'conflict', day: ticket.day, message: 'Not saved. Another chef saved a newer version in this simulation. Your draft is kept. Refresh to review theirs.' };
    } else {
      ticket.plan.v = ticket.base + 1; ticket.plan.by = 'Sam'; ticket.plan.upd = '14:00'; state.version[ticket.day] = ticket.plan.v;
      state.saved[ticket.day] = clone(ticket.plan); state.drafts[ticket.day] = clone(ticket.plan);
      state.saveState = { status: 'saved', day: ticket.day, message: 'Saved ' + dateWords(ticket.day) + ' at 14:00 in this preview.' };
    }
    render();
  }
  function spread() {
    var t = ui().spread, from = parseTime(t.start), p = draft(); if (from == null || !service(t.service)) return;
    var ids = people.filter(function (x) { return !!membership(p, x.id, t.service); }).map(function (x) { return x.id; });
    if (!ids.length) { state.note = 'Nobody is on that service. Add staff first.'; return; }
    var split = +t.length >= 150, n = +t.groups, gap = t.gap === '' ? +t.length : +t.gap;
    p.br = p.br.filter(function (b) { return b.sh !== t.service || (b.len >= 150) !== split; });
    ids.forEach(function (id, i) { var at = from + (n ? Math.floor(i / n) * gap : 0); if (at < 1440 && breaks(p, id, t.service).length < 3) p.br.push({ id: id, sh: t.service, at: at, len: +t.length }); });
    changed('Breaks filled in this draft. Review any overlap, then Save.');
  }
  root.addEventListener('click', function (event) {
    var el = event.target.closest('[data-action]'); if (!el || !root.contains(el) || el.disabled || el.tagName === 'SELECT' || el.tagName === 'INPUT') return;
    var a = el.dataset.action, id = el.dataset.person, sh = el.dataset.service;
    if (a === 'toggle-tools') { event.preventDefault(); ui().tools = !ui().tools; render(); return; }
    if (a === 'toggle-board') { state.boardExpanded = !state.boardExpanded; render(); return; }
    if (a === 'toggle-dates') { state.datesOpen = !state.datesOpen; render(); return; }
    if (a === 'date') { navigate(el.dataset.date); return; }
    if (a === 'previous-week' || a === 'next-week') { navigate(addDays(state.selectedDate, a === 'previous-week' ? -7 : 7)); return; }
    if (a === 'today') { navigate(TODAY); return; }
    if (a === 'stage') { if (!busy()) { state.stage = el.dataset.stage; render(); } return; }
    if (a === 'whole-day') { ui().whole = !ui().whole; render(); return; }
    if (a === 'retry-read') { state.readState = 'ok'; state.board = 'saved'; render(); return; }
    if (a === 'refresh') {
      if (busy()) return;
      if (dirty(state.selectedDate) && !state.refreshArmed) { state.refreshArmed = true; render(); return; }
      state.drafts[state.selectedDate] = clone(state.saved[state.selectedDate]); state.saveState = { status: 'idle', day: state.selectedDate, message: '' }; state.refreshArmed = false; render(); return;
    }
    if (a === 'save') { save(); return; }
    if (a === 'edit-breaks') {
      if (design === 'C') ui().focus = id;
      else if (design === 'B') state.stage = 'breaks';
      else ui().open[id + ':' + sh] = !ui().open[id + ':' + sh];
      render(); return;
    }
    if (a === 'close-detail') { ui().focus = ''; render(); return; }
    if (a === 'show-add' || a === 'hide-add') { if (!busy()) { ui().addOpen = a === 'show-add'; if (a === 'hide-add') ui().addPeople = {}; render(); } return; }
    if (!editable()) return;
    if (a === 'add-staff') {
      people.filter(function (p) { return ui().addPeople[p.id]; }).forEach(function (p) { services.filter(function (s) { return ui().addServices[s.id]; }).forEach(function (s) { if (!membership(draft(), p.id, s.id)) draft().on.push({ id: p.id, sh: s.id, sec: '' }); }); });
      ui().addPeople = {}; ui().addOpen = false; changed('Staff added to this draft. Set sections and breaks, then Save.');
    }
    if (a === 'add-service' && person(id) && service(sh) && !membership(draft(), id, sh)) { draft().on.push({ id: id, sh: sh, sec: '' }); changed(); }
    if (a === 'remove-service') { draft().on = draft().on.filter(function (o) { return !(o.id === id && o.sh === sh); }); draft().br = draft().br.filter(function (b) { return !(b.id === id && b.sh === sh); }); changed(); }
    if (a === 'add-break' && membership(draft(), id, sh) && breaks(draft(), id, sh).length < 3) { var bs = breaks(draft(), id, sh), last = bs[bs.length - 1], at = last ? Math.min(1425, last.at + last.len) : service(sh).from + 120; draft().br.push({ id: id, sh: sh, at: at, len: 30 }); changed(); }
    if (a === 'remove-break') { var old = breaks(draft(), id, sh)[+el.dataset.index]; if (old) draft().br.splice(draft().br.indexOf(old), 1); changed(); }
    if (a === 'copy' && !draft().on.length) { var src = state.saved[addDays(state.selectedDate, -7)]; if (src && src.on.length) { state.drafts[state.selectedDate] = Object.assign(clone(src), { day: state.selectedDate, v: state.version[state.selectedDate] }); changed('Copied the saved plan from last weekday. Check every service, then Save.'); } else state.note = 'No saved plan for that weekday in this fictional fixture. This draft is unchanged.'; }
    if (a === 'spread') spread();
    render();
  });
  function fieldChange(el) {
    var a = el.dataset.action, id = el.dataset.person, sh = el.dataset.service;
    if (a === 'search') { ui().search = el.value.slice(0, 120); render(); return; }
    if (a === 'service') { if (service(el.value) && !busy()) { state.rowServiceViews[state.selectedDate][id] = el.value; render(); } return; }
    if (!editable()) return;
    if (a === 'add-person' && person(id)) ui().addPeople[id] = el.checked;
    if (a === 'add-shift' && service(sh)) ui().addServices[sh] = el.checked;
    if (a === 'section') { var o = membership(draft(), id, sh); if (o && (el.value === '' || sections.some(function (s) { return s.id === el.value; }))) { o.sec = el.value; changed(); } }
    if (a === 'break-time' || a === 'break-length') { var b = breaks(draft(), id, sh)[+el.dataset.index]; if (b) { if (a === 'break-time') { var at = +el.value; if (Number.isInteger(at) && at >= 0 && at < 1440) b.at = at; } else if (lengths.indexOf(+el.value) >= 0) b.len = +el.value; changed(); } }
    if (a === 'spread-service' && service(el.value)) ui().spread.service = el.value;
    if (a === 'spread-start' && Number.isInteger(+el.value) && +el.value >= 0 && +el.value < 1440) ui().spread.start = timeValue(+el.value);
    if (a === 'spread-length' && lengths.indexOf(+el.value) >= 0) ui().spread.length = +el.value;
    if (a === 'spread-gap') ui().spread.gap = el.value === '' ? '' : String(+el.value);
    if (a === 'spread-groups' && ['0', '1', '2'].indexOf(el.value) >= 0) ui().spread.groups = el.value;
    render();
  }
  root.addEventListener('change', function (event) { if (event.target.dataset.action) fieldChange(event.target); });
  root.addEventListener('input', function (event) { if (event.target.dataset.action === 'search') fieldChange(event.target); });
  function reset() {
    generation++; clearTimeout(timer); timer = null; pending = null;
    state = { selectedDate: TODAY, drafts: {}, saved: {}, version: {}, rowServiceViews: {}, ui: {}, stage: 'assignments', datesOpen: false, boardExpanded: false, board: 'saved', readState: 'ok', readOnly: false, saveMode: 'ok', saveState: { status: 'idle', day: TODAY, message: '' }, long: params.get('long') === '1', note: '' };
    ensure(TODAY); render();
  }
  function setScenario(value) {
    if (typeof value === 'string') {
      if (value === 'normal') { reset(); return; }
      if (value === 'empty') { state.saved[state.selectedDate] = blank(state.selectedDate); state.drafts[state.selectedDate] = blank(state.selectedDate); state.version[state.selectedDate] = 0; state.board = 'saved'; state.readState = 'ok'; }
      else if (value === 'loading' || value === 'checking') { state.readState = 'loading'; state.board = 'checking'; }
      else if (value === 'failed-read') { state.readState = 'error'; state.board = 'failed'; }
      else if (value === 'unknown') { state.readState = 'unknown'; state.board = 'unknown'; }
      else if (value === 'malformed-breaks') { state.board = 'malformed'; }
      else if (value === 'past') { state.selectedDate = addDays(TODAY, -1); var past = Object.assign(initialPlan(TODAY), { day: state.selectedDate }); state.saved[state.selectedDate] = past; state.drafts[state.selectedDate] = clone(past); state.version[state.selectedDate] = past.v; state.seededPast = state.selectedDate; }
      else if (value === 'copy-ready') { var source = addDays(state.selectedDate, -7), last = Object.assign(initialPlan(TODAY), { day: source }); state.saved[source] = last; state.drafts[source] = clone(last); state.version[source] = last.v; state.note = 'Fictional last-weekday source added for the copy demonstration.'; }
      else if (value === 'readonly') state.readOnly = true;
      else if (value === 'held' || value === 'hold') state.saveMode = 'hold';
      else if (['fail', 'conflict', 'ok'].indexOf(value) >= 0) state.saveMode = value;
    } else if (value && typeof value === 'object') {
      if (value.date || value.selectedDate) state.selectedDate = value.date || value.selectedDate;
      if (value.board) state.board = value.board;
      if (value.readState) state.readState = value.readState;
      if (value.readOnly != null) state.readOnly = !!value.readOnly;
      if (value.saveMode) state.saveMode = value.saveMode;
      if (value.long != null) state.long = !!value.long;
    }
    ensure(state.selectedDate); render();
  }
  window.preview = Object.freeze({
    snapshot: function () { return freeze(clone({ selectedDate: state.selectedDate, rowServiceViews: state.rowServiceViews, drafts: state.drafts, saved: state.saved, saveState: state.saveState, version: state.version, scenario: { board: state.board, readState: state.readState, readOnly: state.readOnly, saveMode: state.saveMode } })); },
    reset: reset,
    setScenario: setScenario,
    setSaveMode: function (mode) { if (['hold', 'fail', 'conflict', 'ok'].indexOf(mode) >= 0) state.saveMode = mode; },
    releaseSave: function () { if (!pending) return false; acknowledge(pending, state.saveMode === 'hold' ? 'ok' : state.saveMode); return true; },
    stressLongLabels: function () { state.long = true; render(); }
  });
  document.documentElement.dataset.text = params.get('text') === 'xlarge' ? 'xlarge' : 'normal';
  document.body.dataset.design = design;
  document.body.dataset.frame = params.get('frame') === 'chef' ? 'chef' : 'team';
  matchMedia('(min-width: 1100px)').addEventListener('change', function () { if (state) render(); });
  reset();
  /* Action contract: date/data-date, previous-week, next-week, today, toggle-dates; service/data-person;
     section/data-person/data-service; edit-breaks, add-service, remove-service, add-break, remove-break,
     break-time and break-length use person/service (break fields also data-index). Add uses show-add,
     add-person/data-person, add-shift/data-service, add-staff. Tools use spread-service/start/length/gap/groups,
     spread, copy and whole-day. B uses stage/data-stage. save, refresh and the public simulation API above
     exercise isolated acknowledgements. Nothing is an authentication, server, persistence or attendance test. */
})();
