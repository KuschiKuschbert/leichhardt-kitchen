/* Cleaning: the staff daily notebook and the approved M1 chef groups and repeat-task editor. Lazy on #/cleaning.
   Opening, choosing a week or Refresh requests one bounded range through the shared kitchen bridge. No polling,
   startup read, private persistent cache or guessed task schedule. See docs/cleaning-options/brief.md. */
(function () {
  'use strict';
  var P = window.LK_PREP, T = window.LK_TIME, B = P.book(), C = P.cleaning(), esc = window.LK_APP.esc;
  var OPEN = 253402178400000, DAYS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];
  var AREAS = ['Coldroom', 'Freezer', 'Dry store', 'Oven', 'Fryers', 'Behind equipment', 'Pass', 'Shelves'];
  var M = blank(), generation = 0, recorder = '', context = '', picker = null, popup = null, savedTimer = null, boundaryTimer = null;
  function blank() { return { root: null, view: 'today', today: T.day(), week: monday(T.day()), selected: T.day(), tasks: [], done: [], state: 'idle', error: '', readAt: 0, readAgain: false, cache: Object.create(null), range: '', pending: Object.create(null), tickErrors: Object.create(null), editor: false, draft: null, original: '', editId: '', saveBusy: false, saveState: '', saveError: '', savedText: '', archiveBusy: '', suspended: false, expanded: Object.create(null), workDrafts: Object.create(null), flowErrors: Object.create(null), flowSaved: Object.create(null), importBusy: false, importError: '', importText: '', temperatureOpen: false, workGroup: '', workPage: 0, workQuery: '', workFilter: 'all', repeatPage: 0, repeatQuery: '', repeatGroup: 'all' }; }
  function shift(day, n) { return T.day(T.at(day) + n * 86400000 + 43200000); }
  function monday(day) { return shift(day, -((T.dow(T.at(day)) + 6) % 7)); }
  function dates() { return DAYS.map(function (_, i) { return shift(M.week, i); }); }
  function longDay(day) { var p = day.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }); }
  function shortDay(day) { var p = day.split('-'); return p[2].replace(/^0/, '') + '/' + p[1].replace(/^0/, ''); }
  function ink(text, state) { return window.LK_MOTION ? window.LK_MOTION.label(text, 'save', state || 'busy') : esc(text); }
  function loading() { return window.LK_MOTION ? window.LK_MOTION.status('Loading cleaning...', { icon: 'prep', state: 'busy', rows: 3 }) : '<p class="hint" role="status">Loading cleaning...</p>'; }
  function shown() { return !!(M.root && document.body.contains(M.root)); }
  function dirtyDraft() { return !!(M.draft && JSON.stringify(M.draft) !== M.original); }
  function workDirty(draft) { return !!(draft && (draft.newEvent || JSON.stringify([draft.checked, draft.note]) !== draft.original)); }
  function dirty() { return dirtyDraft() || M.saveBusy || M.importBusy || !!M.archiveBusy || Object.keys(M.pending).length > 0 || Object.keys(M.workDrafts).some(function (key) { return workDirty(M.workDrafts[key]); }) || !!(picker && (picker.busy || picker.selected)); }
  function busy() { return M.saveBusy || M.importBusy || !!M.archiveBusy || Object.keys(M.pending).length > 0; }
  function clearReads() { generation++; M.tasks = []; M.done = []; M.cache = Object.create(null); M.state = 'idle'; M.range = ''; M.error = ''; M.readAt = 0; }
  function reset() { var root = M.root; closePicker(true, true); clearTimeout(savedTimer); clearTimeout(boundaryTimer); if (C.discardAttempt) C.discardAttempt(); generation++; recorder = context = ''; M = blank(); M.root = root; }
  function access() {
    if (!C.allowed()) {
      var lock = B.workLock && B.workLock();
      // The sign-in roster arrives before private settings on unlock. Keep the same recorder's draft hidden
      // until those settings can decide access; a confirmed disabled switch still clears a staff view.
      if (recorder && (lock && lock.identity === recorder || C.identity() === recorder && !C.permissionsReady())) { if (!M.suspended) clearReads(); M.suspended = true; context = ''; closePicker(true, true); }
      else reset();
      return false;
    }
    var id = C.identity(); if (recorder && recorder !== id) reset(); recorder = id;
    var next = C.context(); if (M.suspended || context && context !== next) { clearReads(); closePicker(true, true); }
    M.suspended = false; context = next;
    if (C.permissionsReady() && !C.chef()) { M.view = 'today'; M.editor = false; M.draft = null; M.original = ''; }
    return true;
  }
  function range() {
    // Setup reuses the loaded programme and its bounded range, including an existing post-save refresh.
    // A cleared permission/date context has no range and opens today's normal pair instead.
    if (M.view === 'setup' && C.chef() && M.range) return M.range.split('|');
    return M.view === 'week' && C.chef() ? [M.week, shift(M.week, 6)] : [T.day(), T.day()];
  }
  function useData(data) {
    M.tasks = data.tasks; M.done = data.done; M.readAt = data.readAt; M.state = 'ok'; M.error = '';
    Object.keys(M.workDrafts).forEach(function (key) { var d = M.workDrafts[key], r = M.done.filter(function (value) { return value.task === d.task && value.day === d.day && value.flow && value.flow.slot === d.slot; })[0]; if (r && JSON.stringify([d.checked.slice().sort(), d.note.trim()]) === JSON.stringify([r.flow.checked.slice().sort(), r.flow.note])) { if (M.flowErrors[key]) { var task = M.tasks.filter(function (value) { return value.id === d.task; })[0]; M.flowSaved[key] = 'Earlier save confirmed for ' + (task ? task.text : 'this clean') + '. Checked ' + T.clock(data.readAt) + '.'; } delete M.workDrafts[key]; delete M.flowErrors[key]; } });
  }
  function load(force) {
    if (!shown() || !C.allowed() || !C.permissionsReady()) return;
    // A requested refresh/unlock waits for this device's writes, so an older response cannot hide a new acknowledgement.
    if (busy()) { M.readAgain = true; return; }
    var r = range(), key = r.join('|');
    if (!force && M.range === key && (M.state === 'loading' || M.state === 'ok')) return;
    M.range = key;
    if (!force && M.cache[key]) { useData(M.cache[key]); draw(); return; }
    var gen = ++generation, who = C.identity(); M.state = 'loading'; M.error = ''; draw();
    // One explicit server range read on opening/selection/Refresh. The bridge enforces the role and document limits.
    C.load(r[0], r[1]).then(function (data) {
      if (gen !== generation || !C.allowed() || C.identity() !== who) return;
      M.cache[key] = data; useData(data); M.tickErrors = Object.create(null); draw();
    }, function (error) {
      if (gen !== generation || !C.allowed() || C.identity() !== who) return;
      M.state = 'error'; M.error = error && error.code === 'too-many' ? 'Cleaning list is too large to show safely. Ask a chef to review the schedule.' : error && error.message || 'Could not load cleaning. Check the connection and tap Refresh.'; draw();
    });
  }
  function due(task, day) { return C.due(task, day); }
  function tasksOn(day) { return M.tasks.filter(function (task) { return due(task, day); }); }
  function record(task, day) { return M.done.filter(function (r) { return r.task === task.id && r.day === day; })[0] || null; }
  function taskById(id) { return M.tasks.filter(function (task) { return task.id === id; })[0]; }
  function occurrence(task, day) { return day + '_' + task.id; }
  function hasPlan(task) { return !!(task && task.plan); }
  function flowKey(task, day, slot) { return occurrence(task, day) + '_' + slot; }
  function flowRecord(task, day, slot) { return M.done.filter(function (r) { return r.task === task.id && r.day === day && r.flow && r.flow.slot === slot; })[0] || null; }
  function flowList(task, day) {
    var timing = task.plan.timing, out = [], slots = [];
    function add(slot, kind) { if (slots.indexOf(slot) < 0) { slots.push(slot); out.push({ slot: slot, kind: kind, record: flowRecord(task, day, slot) }); } }
    if (timing === 'daily') add('daily', 'daily');
    if (timing === 'close') add('close', 'close');
    if (timing === 'food') { add('start', 'start'); add('close', 'close'); }
    M.done.forEach(function (r) { if (r.task === task.id && r.day === day && r.flow) add(r.flow.slot, r.flow.kind); });
    Object.keys(M.workDrafts).forEach(function (key) { var d = M.workDrafts[key]; if (d.task === task.id && d.day === day) add(d.slot, d.kind); });
    return out;
  }
  function flowSummary(task, day) {
    var list = flowList(task, day), complete = 0, awaiting = 0, blocked = 0, pending = 0;
    list.forEach(function (item) { var r = item.record, state = r && r.flow.status || 'pending'; if (state === 'complete') complete++; else if (state === 'awaiting') awaiting++; else if (state === 'blocked') blocked++; else pending++; });
    var events = ['service', 'prep-service', 'food', 'use'].indexOf(task.plan.timing) >= 0;
    return { total: list.length, complete: complete, awaiting: awaiting, blocked: blocked, pending: pending, events: events, done: !events && list.length > 0 && complete === list.length };
  }
  function workTotals(tasks, day) {
    var total = 0, complete = 0, events = 0, awaiting = 0, blocked = 0;
    tasks.forEach(function (task) { if (hasPlan(task)) { var s = flowSummary(task, day); total += s.total; complete += s.complete; events += s.events ? 1 : 0; awaiting += s.awaiting; blocked += s.blocked; } else { total++; var r = record(task, day); if (r && r.done) complete++; } });
    return { total: total, complete: complete, events: events, awaiting: awaiting, blocked: blocked };
  }
  function flowState(task, day) {
    var s = flowSummary(task, day);
    if (M.pending[occurrence(task, day)]) return 'Not sent';
    if (s.blocked) return 'Unable to complete';
    if (s.awaiting) return 'Awaiting Pass check';
    if (s.done) return 'Done';
    if (day > T.day()) return 'Due';
    if (s.events) return s.complete + '/' + s.total + ' recorded; record each ' + (task.plan.timing === 'use' ? 'use' : task.plan.timing === 'service' ? 'service' : task.plan.timing === 'food' ? 'prep' : 'prep and service');
    return day < T.day() ? 'Missed' : 'To do';
  }
  function workDraft(task, day, item) {
    var key = flowKey(task, day, item.slot), d = M.workDrafts[key], r = item.record;
    if (!d) { var checked = r && r.flow ? r.flow.checked.slice() : [], note = r && r.flow ? r.flow.note : ''; d = M.workDrafts[key] = { task: task.id, day: day, slot: item.slot, kind: item.kind, checked: checked, note: note, original: JSON.stringify([checked, note]) }; }
    return d;
  }
  function flowLabel(item, index) { return { daily: 'Daily clean', start: 'Start of day', close: 'End of day', service: 'After service', prep: 'After prep', use: 'After use' }[item.kind] + (['service', 'prep', 'use'].indexOf(item.kind) >= 0 ? ' ' + (index + 1) : ''); }
  function workEnabled(task, day) { return day === T.day() && C.canTick() && M.state === 'ok' && due(task, day) && !M.pending[occurrence(task, day)]; }
  function flowPanel(task, day, item, index) {
    var key = flowKey(task, day, item.slot), r = item.record, state = r && r.flow.status || 'pending', d = workDraft(task, day, item), editable = workEnabled(task, day) && state !== 'complete' && state !== 'awaiting', pending = M.pending[occurrence(task, day)], checked = d.checked, all = task.plan.checks.every(function (label) { return checked.indexOf(label) >= 0; });
    var attrs = ' data-id="' + esc(task.id) + '" data-day="' + esc(day) + '" data-slot="' + esc(item.slot) + '" data-kind="' + esc(item.kind) + '"';
    var verify = state === 'awaiting' && (C.canVerify ? C.canVerify(task) : task.plan.verifiers.indexOf(B.who()) >= 0 && C.canTick()) && workEnabled(task, day), statusText = { pending: 'Checks pending', blocked: 'Unable to complete', awaiting: 'Awaiting Pass check', complete: 'Complete' }[state];
    var reopen = workEnabled(task, day) && (C.chef() || r && r.doneById === B.who() && r.doneAt > 0 && T.now() >= r.doneAt && T.now() - r.doneAt < 120000);
    var checker = r && r.flow.verifiedBy ? C.workers().filter(function (person) { return person.id === r.flow.verifiedBy; })[0] : null;
    return '<section class="cln-occurrence" data-cln-occurrence="' + esc(key) + '"><h4>' + esc(flowLabel(item, index)) + '<span>' + esc(pending ? 'Not sent' : statusText) + '</span></h4>' +
      '<div class="cln-checks">' + task.plan.checks.map(function (label, n) { return '<label><input type="checkbox" data-cln-check="' + n + '"' + attrs + (checked.indexOf(label) >= 0 ? ' checked' : '') + (editable ? '' : ' disabled') + '><span>' + esc(label) + '</span></label>'; }).join('') + '</div>' +
      '<label class="field cln-work-note"><span class="label">' + (state === 'complete' || state === 'awaiting' ? 'Reason to reopen' : 'Note or reason unable to complete') + '</span><textarea data-cln-note' + attrs + ' maxlength="500" rows="2"' + (workEnabled(task, day) ? '' : ' disabled') + '>' + esc(d.note) + '</textarea></label>' +
      (r && r.doneAt ? '<p class="hint cln-performer">Recorded by ' + esc(completionText(r)) + (r.flow.verifiedBy ? '. Pass check: ' + esc(checker ? checker.name : 'Recorded checker') + ' at ' + esc(T.clock(r.flow.verifiedAt)) : '') + '</p>' : '') +
      (task.plan.verification && !task.plan.verifiers.length ? '<p class="hint">Pass checker not set. A chef can choose the checker in Repeat tasks.</p>' : '') +
      (day === T.day() ? '<div class="btn-row cln-work-actions">' + (state === 'complete' || state === 'awaiting' ?
        (verify ? '<button type="button" class="btn dark" data-cln="flow-verify"' + attrs + '>Verify Pass check</button>' : '') + '<button type="button" class="p-link" data-cln="flow-reopen"' + attrs + (reopen ? '' : ' disabled') + '>Reopen with reason</button>' :
        '<button type="button" class="btn dark" data-cln="flow-perform"' + attrs + (editable && all ? '' : ' disabled') + '>' + (pending ? 'Saving...' : 'Record done') + '</button><button type="button" class="p-link" data-cln="flow-save"' + attrs + (editable && workDirty(d) ? '' : ' disabled') + '>Save checks</button><button type="button" class="p-link" data-cln="flow-block"' + attrs + (editable ? '' : ' disabled') + '>Unable to complete</button>') +
        (workDirty(d) && !pending ? '<button type="button" class="p-link" data-cln="flow-discard"' + attrs + '>Undo unsaved checks</button>' : '') + '</div>' : '') +
      (M.flowErrors[key] ? '<p class="p-err" role="alert">' + esc(M.flowErrors[key]) + ' <button type="button" class="p-link" data-cln="refresh">Refresh to check</button></p>' : '') +
      (M.flowSaved[key] ? '<p class="lk-stamp" role="status">' + esc(M.flowSaved[key]) + '</p>' : '') + '</section>';
  }
  function planDetails(task, day) {
    var plan = task.plan, list = flowList(task, day), key = occurrence(task, day), kinds = plan.timing === 'service' ? ['service'] : plan.timing === 'prep-service' ? ['prep', 'service'] : plan.timing === 'food' ? ['prep'] : plan.timing === 'use' ? ['use'] : [];
    return '<div class="cln-detail" id="cln-detail-' + esc(key) + '"><p class="cln-method"><b>Method</b> ' + esc(plan.method) + '</p><p class="hint"><b>Responsible:</b> ' + esc(plan.responsibility) + '</p>' +
      (plan.review ? '<p class="cln-review"><b>Check the procedure:</b> ' + esc(plan.review) + '</p>' : '') +
      (kinds.length ? '<p class="hint">Record every ' + (plan.timing === 'prep-service' ? 'prep and service' : plan.timing === 'food' ? 'prep, plus opening and closing checks' : kinds[0]) + '. Counts cover recorded occurrences only.</p>' : '') +
      (task.guide && P.featOn('guides') ? '<a class="p-link cln-guide-link" href="#/guides/' + encodeURIComponent(task.guide) + '">How to: ' + esc(task.text) + '</a>' : '') +
      list.map(function (item, index) { return flowPanel(task, day, item, list.slice(0, index).filter(function (prior) { return prior.kind === item.kind; }).length); }).join('') +
      (day === T.day() && kinds.length ? '<div class="btn-row cln-add-occurrence">' + kinds.map(function (kind) { return '<button type="button" class="btn" data-cln="flow-add" data-id="' + esc(task.id) + '" data-day="' + esc(day) + '" data-kind="' + kind + '"' + (workEnabled(task, day) ? '' : ' disabled') + '>Add ' + kind + ' clean</button>'; }).join('') + '</div>' : '') + '</div>';
  }
  function planRow(task, day) {
    var key = occurrence(task, day), open = !!M.expanded[key], summary = flowSummary(task, day), completed = summary.done && flowList(task, day)[0].record, stateText = completed ? completionText(completed) : flowState(task, day), meta = task.area + (C.chef() && !task.shared ? ' · ' + owner(task, day) : '') + (task.plan.responsibility.toLowerCase() === task.area.toLowerCase() ? '' : ' · ' + task.plan.responsibility) + ' · ' + stateText, quick = !task.plan.checks.length && !task.plan.verification && !summary.events, slot = task.plan.timing === 'close' ? 'close' : 'daily', quickRecord = quick && flowRecord(task, day, slot), quickUndo = quickRecord && quickRecord.done && C.canUndo(quickRecord);
    return '<li class="nb-row cln-row cln-plan-row' + (summary.done ? ' is-done' : '') + (M.pending[key] ? ' is-pending' : '') + '" data-id="' + esc(task.id) + '" data-cln-row="' + esc(key) + '">' +
      '<button type="button" class="nb-box" data-cln="' + (quick ? 'flow-quick' : 'details') + '" data-id="' + esc(task.id) + '" data-day="' + esc(day) + '"' + (quick ? ' data-slot="' + slot + '" data-kind="' + slot + '" aria-pressed="' + summary.done + '"' + (workEnabled(task, day) && (!summary.done || quickUndo) ? '' : ' disabled') : ' aria-expanded="' + open + '" aria-controls="cln-detail-' + esc(key) + '"') + ' aria-label="' + esc((quick ? summary.done ? quickUndo ? 'Undo: ' : 'Done: ' : 'Mark done: ' : open ? 'Close checks: ' : 'Open checks: ') + task.text + '. ' + flowState(task, day)) + '">' + C.box(summary.done) + '</button>' +
      '<button type="button" class="nb-main cln-task-detail" data-cln="details" data-id="' + esc(task.id) + '" data-day="' + esc(day) + '" aria-expanded="' + open + '" aria-controls="cln-detail-' + esc(key) + '" aria-label="' + esc((open ? 'Close checks and method: ' : 'Open checks and method: ') + task.text) + '"><span class="nb-t">' + esc(task.text) + '</span><span class="nb-meta" title="' + esc(meta) + '">' + esc(meta) + '</span><span class="cln-detail-cue" aria-hidden="true">' + (open ? '▴' : '▾') + '</span></button>' + (open ? planDetails(task, day) : '') + '</li>';
  }
  function owner(task, day) {
    if (task.shared) return 'Shared kitchen';
    var section = C.sections().filter(function (s) { return s.id === task.section; })[0];
    return day < T.day() ? task.sectionName || section && section.name || 'Section to assign' : section && section.name || (task.sectionName ? task.sectionName + ' (reassign)' : 'Section to assign');
  }
  function packSection(task) { var id = task.plan && task.plan.template || ''; return id.indexOf('pd-hot-') === 0 ? 'Hot larder' : id.indexOf('pd-grill-') === 0 ? 'Grill' : id.indexOf('pd-pans-') === 0 ? 'Pans' : ''; }
  function groups(tasks, day) {
    var out = [], ids = [], pack = tasks.filter(function (task) { return !!packSection(task); }), floors = [];
    tasks.forEach(function (task) { if (packSection(task)) return; if (pack.length && task.plan && task.plan.template === 'c03') { floors.push(task); return; } var id = task.shared ? '_shared' : task.section, i = ids.indexOf(id); if (i < 0) { ids.push(id); out.push({ name: owner(task, day), tasks: [] }); i = out.length - 1; } out[i].tasks.push(task); });
    out.sort(function (a, b) { return a.name === 'Shared kitchen' ? 1 : b.name === 'Shared kitchen' ? -1 : a.name.localeCompare(b.name); });
    ['Hot larder', 'Grill', 'Pans'].forEach(function (name) { var list = pack.filter(function (task) { return packSection(task) === name; }).sort(function (a, b) { return a.plan.template.localeCompare(b.plan.template); }); if (list.length) out.push({ name: name, pack: true, tasks: list }); });
    if (floors.length) out.push({ name: 'Floors after shelving', floors: true, tasks: floors });
    return out;
  }
  function status(task, day) {
    if (hasPlan(task)) return flowState(task, day);
    var r = record(task, day), p = M.pending[occurrence(task, day)];
    return p ? 'Not sent' : r && r.done ? 'Done' : day < T.day() ? 'Missed' : day > T.day() ? 'Due' : 'To do';
  }
  function completionText(r) { return (r.worker || r.doneBy || 'Recorded') + ' · ' + T.clock(r.doneAt); }
  function canAct(task, day) { return day === T.day() && C.canTick() && due(task, day) && M.state === 'ok' && !M.pending[occurrence(task, day)] && !M.tickErrors[occurrence(task, day)]; }
  function row(task, day) {
    if (hasPlan(task)) return planRow(task, day);
    var r = record(task, day), key = occurrence(task, day), p = M.pending[key], complete = p ? !p.undo : !!(r && r.done), error = M.tickErrors[key];
    var can = canAct(task, day) && (!r || !r.done || C.canUndo(r)), state = status(task, day);
    var meta = task.area + (C.chef() ? ' · ' + owner(task, day) : '') + ' · ' + (p ? 'Not sent' : r && r.done ? completionText(r) : day === T.day() ? 'To do today' : state);
    var label = (r && r.done ? C.canUndo(r) && day === T.day() ? 'Undo: ' : 'Done: ' : 'Mark done: ') + task.text + '. ' + meta;
    return '<li class="nb-row cln-row' + (complete ? ' is-done' : '') + (p ? ' is-pending' : '') + '" data-id="' + esc(task.id) + '" data-cln-row="' + esc(key) + '">' +
      '<button type="button" class="nb-box" data-cln="tick" data-id="' + esc(task.id) + '" data-day="' + esc(day) + '" aria-pressed="' + complete + '" aria-label="' + esc(label) + '"' + (can ? '' : ' disabled') + (p ? ' aria-busy="true"' : '') + '>' + C.box(complete) + '</button>' +
      '<div class="nb-main"><span class="nb-t">' + esc(task.text) + '</span><span class="nb-meta" title="' + esc(meta) + '">' + esc(meta) + '</span>' +
      (error ? '<span class="cln-row-error" role="alert">' + esc(error) + ' <button type="button" class="p-link" data-cln="refresh">Refresh</button></span>' : '') + '</div>' +
      (task.guide && P.featOn('guides') ? '<a class="nb-go cln-how" href="#/guides/' + encodeURIComponent(task.guide) + '" aria-label="How to: ' + esc(task.text) + '">How to</a>' : '') + '</li>';
  }
  function daily(day) {
    var tasks = tasksOn(day);
    if (!tasks.length) return '<div class="cln-empty"><p class="nb-empty">' + (M.tasks.length ? 'No cleaning tasks due on this day.' : 'No cleaning tasks set yet.') + '</p><p class="hint">' + (C.chef() ? 'Set the actual jobs, sections and repeat days in Repeat tasks.' : 'Your chef can set the jobs and repeat days.') + '</p>' + (C.chef() ? '<button type="button" class="btn" data-cln="setup">Set repeat tasks</button>' : '') + '</div>';
    var grouped = groups(tasks, day);
    function groupHTML(group, i) { var count = workTotals(group.tasks, day), heading = group.pack ? 'h4' : 'h3'; return '<section' + (group.pack ? ' class="cln-packdown-group" data-cln-packdown-group="' + esc(group.name) + '"' : '') + ' aria-labelledby="cln-group-' + i + '-' + day + '"><' + heading + ' class="nb-hd" id="cln-group-' + i + '-' + day + '"><span>' + esc(group.name) + '</span><span class="cln-group-count">' + count.complete + '/' + count.total + (count.events ? ' + repeats' : '') + '</span></' + heading + '><ul class="nb-rows">' + group.tasks.map(function (task) { return row(task, day); }).join('') + '</ul></section>'; }
    var regular = '', pack = '', floors = '';
    grouped.forEach(function (group, i) { var html = groupHTML(group, i); if (group.pack) pack += html; else if (group.floors) floors += html; else regular += html; });
    return regular + (pack ? '<section class="cln-packdown" aria-labelledby="cln-packdown-' + day + '"><h3 class="cln-packdown-title" id="cln-packdown-' + day + '">Pack down</h3><p class="hint">Finish overhead shelves and frames before the final floor clean. Keep each after-service floor check separate.' + (floors ? ' Floor checks follow this list.' : '') + '</p>' + pack + '</section>' : '') + floors;
  }
  var CHEF_GROUPS = [
    ['general', 'General cleaning', 'Shared and section jobs'],
    ['hot', 'Hot larder', 'Pack down'], ['grill', 'Grill', 'Pack down'], ['pans', 'Pans', 'Pack down'],
    ['floor', 'Final floor clean', 'After overhead work; each service']
  ];
  function chefGroupId(task) { var code = task.plan && task.plan.template || ''; return code.indexOf('pd-hot-') === 0 ? 'hot' : code.indexOf('pd-grill-') === 0 ? 'grill' : code.indexOf('pd-pans-') === 0 ? 'pans' : code === 'c03' ? 'floor' : 'general'; }
  function chefGroups(tasks) { return CHEF_GROUPS.map(function (info) { var list = tasks.filter(function (task) { return chefGroupId(task) === info[0]; }); if (info[0] !== 'general' && info[0] !== 'floor') list.sort(function (a, b) { return a.plan.template.localeCompare(b.plan.template); }); return { id: info[0], name: info[1], hint: info[2], tasks: list }; }).filter(function (group) { return group.tasks.length; }); }
  function taskWords(task, day) { return [task.text, task.area, owner(task, day), task.plan && task.plan.responsibility || '', task.plan && task.plan.method || ''].join(' ').toLowerCase(); }
  function matchesWords(task, query, day) { var words = query.toLowerCase().trim().split(/\s+/).filter(Boolean), text = taskWords(task, day); return words.every(function (word) { return text.indexOf(word) >= 0; }); }
  function taskDone(task, day) { return hasPlan(task) ? flowSummary(task, day).done : !!(record(task, day) && record(task, day).done); }
  function workMatches(tasks, day) { return tasks.filter(function (task) { var summary = hasPlan(task) ? flowSummary(task, day) : null; return matchesWords(task, M.workQuery, day) && (M.workFilter === 'all' || M.workFilter === 'remaining' && !taskDone(task, day) || M.workFilter === 'done' && taskDone(task, day) || M.workFilter === 'blocked' && summary && summary.blocked || M.workFilter === 'awaiting' && summary && summary.awaiting); }); }
  function pager(total, page, action, group) { var last = Math.max(0, Math.ceil(total / 6) - 1); if (!total) return ''; return '<div class="cln-pager"><span role="status" tabindex="-1">' + (page * 6 + 1) + '–' + Math.min(total, page * 6 + 6) + ' of ' + total + ' tasks</span><div><button type="button" class="btn" data-cln="' + action + '" data-cln-direction="previous" data-page="' + Math.max(0, page - 1) + '" data-group="' + esc(group || '') + '"' + (!page ? ' disabled' : '') + '>Previous</button><button type="button" class="btn" data-cln="' + action + '" data-cln-direction="next" data-page="' + Math.min(last, page + 1) + '" data-group="' + esc(group || '') + '"' + (page >= last ? ' disabled' : '') + '>Next</button></div></div>'; }
  function workSearch() { return '<div class="cln-searchbar"><label class="visually-hidden" for="cln-search">Find a task in all groups</label><input id="cln-search" type="search" class="search" data-cln-control="work-query" placeholder="Find a task in all groups" value="' + esc(M.workQuery) + '"><label class="visually-hidden" for="cln-status-filter">Task state</label><select id="cln-status-filter" class="cln-filter" data-cln-control="work-filter">' + [['all', 'All states'], ['remaining', 'Still to review'], ['blocked', 'Unable to complete'], ['awaiting', 'Awaiting Pass check'], ['done', 'Done']].map(function (option) { return '<option value="' + option[0] + '"' + (M.workFilter === option[0] ? ' selected' : '') + '>' + option[1] + '</option>'; }).join('') + '</select></div>'; }
  function attention(tasks, day) {
    var blocked = [], awaiting = [];
    tasks.forEach(function (task) { if (!hasPlan(task)) return; var s = flowSummary(task, day); if (s.blocked) blocked.push(task); if (s.awaiting) awaiting.push(task); });
    if (!blocked.length && !awaiting.length) return '';
    function link(list, text) { return !list.length ? '' : '<button type="button" class="p-link" data-cln="exception" data-id="' + esc(list[0].id) + '" data-day="' + esc(day) + '">' + list.length + ' ' + text + '</button>'; }
    return '<div class="cln-attention"><b>Needs attention · ' + esc(longDay(day)) + '</b>' + link(blocked, 'unable to complete') + link(awaiting, 'awaiting Pass check') + '</div>';
  }
  function workNotices(tasks, day) {
    var changed = [], pending = [], failed = [];
    tasks.forEach(function (task) { var key = occurrence(task, day); if (Object.keys(M.workDrafts).some(function (id) { var draft = M.workDrafts[id]; return draft.task === task.id && draft.day === day && workDirty(draft); })) changed.push(task); if (M.pending[key]) pending.push(task); if (M.tickErrors[key] || Object.keys(M.flowErrors).some(function (id) { return id.indexOf(key + '_') === 0 && M.flowErrors[id]; })) failed.push(task); });
    if (!changed.length && !pending.length && !failed.length) return '';
    function link(list, label) { return !list.length ? '' : '<button type="button" class="p-link" data-cln="exception" data-id="' + esc(list[0].id) + '" data-day="' + esc(day) + '">' + list.length + ' ' + label + ': ' + esc(list[0].text) + '</button>'; }
    return '<div class="cln-work-notices" role="status"><b>Work kept on this device</b>' + link(changed, 'with unsaved checks') + link(pending, 'not sent') + link(failed, 'to retry') + '</div>';
  }
  function chefDaily(day) {
    var tasks = tasksOn(day), grouped = chefGroups(tasks), active = M.workQuery.trim() || M.workFilter !== 'all', html = attention(tasks, day) + workSearch(), notices = workNotices(tasks, day);
    if (!tasks.length) return html + daily(day);
    if (active) {
      var matching = workMatches(grouped.reduce(function (list, group) { return list.concat(group.tasks); }, []), day); M.workPage = Math.max(0, Math.min(M.workPage, Math.ceil(matching.length / 6) - 1));
      return html + '<p class="hint cln-filter-note" role="status">Across all groups · ' + matching.length + ' matching tasks. <button type="button" class="p-link" data-cln="clear-work">Show all groups</button></p>' + (matching.length ? '<ul class="nb-rows">' + matching.slice(M.workPage * 6, M.workPage * 6 + 6).map(function (task) { return row(task, day); }).join('') + '</ul>' + pager(matching.length, M.workPage, 'group-page', '') : '<p class="hint">No tasks match. Clear search or choose All states.</p>') + notices;
    }
    return html + '<div class="cln-work-groups">' + grouped.map(function (group) {
      var count = workTotals(group.tasks, day), open = M.workGroup === group.id, id = 'cln-fold-' + group.id, label = day > T.day() ? group.tasks.length + ' due' : count.events ? group.tasks.length + (group.tasks.length === 1 ? ' task' : ' tasks') : Math.max(0, count.total - count.complete) + ' left';
      var hint = group.hint + (count.events ? ' · ' + count.complete + '/' + count.total + ' recorded; repeats apply' : '') + (count.blocked ? ' · ' + count.blocked + ' unable to complete' : '') + (count.awaiting ? ' · ' + count.awaiting + ' awaiting Pass check' : '');
      var page = open ? Math.max(0, Math.min(M.workPage, Math.ceil(group.tasks.length / 6) - 1)) : 0; if (open) M.workPage = page;
      return '<section class="cln-fold' + (group.id !== 'general' && group.id !== 'floor' ? ' cln-packdown-group' : '') + '" data-cln-group="' + group.id + '"' + (group.id !== 'general' && group.id !== 'floor' ? ' data-cln-packdown-group="' + esc(group.name) + '"' : '') + '><h3 class="nb-hd"><button type="button" class="cln-fold-toggle" data-cln="group" data-group="' + group.id + '" aria-expanded="' + open + '" aria-controls="' + id + '"><span class="cln-fold-main"><strong>' + esc(group.name) + '</strong><small>' + esc(hint) + '</small></span><span class="cln-fold-count">' + esc(label) + '</span><span class="cln-fold-cue" aria-hidden="true">' + (open ? 'Close' : 'Open tasks') + '</span></button></h3><div class="cln-fold-body" id="' + id + '"' + (open ? '' : ' hidden') + '>' + (open ? '<ul class="nb-rows">' + group.tasks.slice(page * 6, page * 6 + 6).map(function (task) { return row(task, day); }).join('') + '</ul>' + pager(group.tasks.length, page, 'group-page', group.id) : '') + '</div></section>';
    }).join('') + '</div>' + notices + (grouped.some(function (group) { return group.id === 'hot' || group.id === 'grill' || group.id === 'pans'; }) ? '<p class="hint">Pack down: Hot larder, Grill, then Pans. Finish overhead shelves and frames before the final floor clean. Keep each after-service floor check separate.</p>' : '');
  }
  function weekly() {
    var days = dates();
    return '<div class="cln-week-nav"><button type="button" class="chip" data-cln="previous" aria-label="Previous week">‹</button><span>' + esc('Week commencing ' + shortDay(M.week)) + '</span><button type="button" class="chip" data-cln="next" aria-label="Next week">›</button><button type="button" class="p-link" data-cln="this-week">This week</button></div>' +
      '<p class="hint cln-legend">Review one day at a time. Only today can be recorded. Repeated service, prep and use coverage is not configured.</p>' +
      (Object.keys(M.tickErrors).length ? '<p class="p-err" role="alert">' + esc(Object.keys(M.tickErrors).map(function (key) { return M.tickErrors[key]; }).join(' ')) + ' Refresh to check the list.</p>' : '') +
      '<div class="cln-day-pick chips" role="group" aria-label="Day to view">' + days.map(function (day, i) { return '<button type="button" class="chip" data-cln="day" data-day="' + day + '" aria-pressed="' + (M.selected === day) + '">' + DAYS[i][1] + '<small>' + shortDay(day) + '</small></button>'; }).join('') + '</div><div class="cln-week-day"><h3 class="cln-selected-day">' + esc(longDay(M.selected)) + '</h3>' + chefDaily(M.selected) + '</div>';
  }
  function templateLabel(task) { var label = DAYS.filter(function (day) { return task.dows.indexOf(day[0]) >= 0; }).map(function (day) { return day[1]; }).join(', '), repeat = task.plan && task.plan.repeat; return label + (repeat ? ' · Every ' + repeat.days + ' days' + (repeat.anchor ? ' from ' + shortDay(repeat.anchor) : '; start date not set') : ''); }
  function draftFor(task) { var draft = { text: task ? task.text : '', area: task ? task.area : '', section: task ? task.section : '', shared: !!(task && task.shared), dows: task ? task.dows.slice() : [], guide: task ? task.guide || '' : '' }; if (hasPlan(task)) draft.plan = JSON.parse(JSON.stringify(task.plan)); return draft; }
  /* Only people who can do the Pass check are offered. A saved checker who can no longer do it stays listed, ticked
     and marked, so the chef can untick them; Save says so until they do. */
  function checkerName(id) { var person = C.workers().filter(function (p) { return p.id === id; })[0]; return person ? person.name : 'A person no longer on the team'; }
  function cannotCheck(ids) { return C.canCheck ? ids.filter(function (id) { return !C.canCheck(id); }) : []; }
  function verifierChoices(ids, attribute) {
    var offered = (C.checkers ? C.checkers() : C.workers()).map(function (person) { return { id: person.id, name: person.name, ok: true }; });
    offered = offered.concat(ids.filter(function (id) { return !offered.some(function (person) { return person.id === id; }); }).map(function (id) { return { id: id, name: checkerName(id), ok: false }; }));
    return '<div class="cln-checks cln-verifiers">' + offered.map(function (person) { return '<label><input type="checkbox" ' + attribute + '="' + esc(person.id) + '"' + (ids.indexOf(person.id) >= 0 ? ' checked' : '') + (M.saveBusy || M.importBusy ? ' disabled' : '') + '><span>' + esc(person.name) + (person.ok ? '' : ' · cannot do the Pass check') + '</span></label>'; }).join('') + '</div>';
  }
  function planEditor(draft) {
    if (!draft.plan) return '';
    var plan = draft.plan, timings = [['daily', 'Once each day'], ['service', 'After each service'], ['prep-service', 'After prep and each service'], ['food', 'Start of day, end of night and after prep'], ['use', 'After each use'], ['close', 'End of day']];
    return '<label class="field" for="cln-method"><span class="label">Method</span><textarea id="cln-method" data-cln-plan="method" maxlength="1000" rows="3">' + esc(plan.method) + '</textarea></label>' +
      '<label class="field" for="cln-responsibility"><span class="label">Responsible role</span><input id="cln-responsibility" data-cln-plan="responsibility" maxlength="120" value="' + esc(plan.responsibility) + '"></label>' +
      '<label class="field" for="cln-checks"><span class="label">Required checks, one per line</span><textarea id="cln-checks" data-cln-plan="checks" rows="4">' + esc(plan.checks.join('\n')) + '</textarea><span class="hint">Up to 12 checks, 160 characters each.</span></label>' +
      '<label class="field" for="cln-timing"><span class="label">When to record</span><select id="cln-timing" data-cln-plan="timing">' + timings.map(function (item) { return '<option value="' + item[0] + '"' + (plan.timing === item[0] ? ' selected' : '') + '>' + item[1] + '</option>'; }).join('') + '</select></label>' +
      (plan.repeat ? '<div class="cln-fields"><label class="field" for="cln-repeat-days"><span class="label">Repeat every how many days?</span><input type="number" id="cln-repeat-days" data-cln-repeat="days" min="2" max="30" value="' + esc(String(plan.repeat.days)) + '"></label><label class="field" for="cln-repeat-anchor"><span class="label">First due date</span><input type="date" id="cln-repeat-anchor" data-cln-repeat="anchor" value="' + esc(plan.repeat.anchor) + '"><span class="hint">No due dates are generated until this date is set. Schedule edits start tomorrow.</span></label></div>' : '') +
      '<label class="field" for="cln-review"><span class="label">Procedure clarification</span><textarea id="cln-review" data-cln-plan="review" maxlength="500" rows="2">' + esc(plan.review) + '</textarea></label>' +
      (plan.verification ? '<div><span class="label">Pass checkers</span><p class="hint">Choose the people responsible for the Pass check. Other chefs are not added automatically.</p>' + verifierChoices(plan.verifiers, 'data-cln-verifier') + '</div>' : '');
  }
  function importPanel() {
    if (!window.LK_CLEANING_SCHEDULE || !C.importTasks) return '';
    return '<details class="cln-import"' + (M.importOpen ? ' open' : '') + '><summary>Cleaning schedule: 26 tasks</summary><p class="hint">Load the cleaning schedule, then review responsibilities and procedures. Existing tasks and completed records stay as recorded. Loading it again adds only missing tasks.</p><span class="label">Pass checkers for food labelling</span><p class="hint">Choose the people who check food labelling. If none are selected, checks wait for the checker to be configured.</p>' + verifierChoices(M.importVerifiers || [], 'data-cln-import-verifier') +
      '<button type="button" class="btn" data-cln="import-schedule"' + (busy() || dirtyDraft() || M.state !== 'ok' ? ' disabled' : '') + '>' + (M.importBusy ? 'Loading schedule...' : 'Load cleaning schedule') + '</button>' +
      (M.importError ? '<p class="p-err" role="alert">' + esc(M.importError) + '</p>' : '') + (M.importText ? '<p class="lk-stamp" role="status">' + esc(M.importText) + '</p>' : '') + '</details>' + packImportPanel();
  }
  function packImportPanel() {
    var source = window.LK_CLEANING_SCHEDULE;
    if (!source || !source.packDownDrafts || !C.importTasks) return '';
    return '<details class="cln-import cln-pack-import"' + (M.packImportOpen ? ' open' : '') + '><summary>Pack down: Hot larder, Grill and Pans</summary><p class="hint">Load ' + source.packDown.length + ' ordered pack down tasks. Review methods and responsibility in Repeat tasks. Existing tasks and completed records stay as recorded.</p><p class="hint">Clean overhead shelves and frames before the final floor clean. Review repeat intervals and their first due date in Repeat tasks.</p><button type="button" class="btn" data-cln="import-packdown"' + (busy() || dirtyDraft() || M.state !== 'ok' ? ' disabled' : '') + '>' + (M.importBusy && M.importKind === 'packdown' ? 'Loading pack down...' : 'Load pack down schedule') + '</button>' + (M.packImportError ? '<p class="p-err" role="alert">' + esc(M.packImportError) + '</p>' : '') + (M.packImportText ? '<p class="lk-stamp" role="status">' + esc(M.packImportText) + '</p>' : '') + '</details>';
  }
  function earlierDrafts() { return Object.keys(M.workDrafts).filter(function (key) { return M.workDrafts[key].day < T.day() && workDirty(M.workDrafts[key]); }); }
  function earlierNotice() {
    if (!earlierDrafts().length) return M.earlierCleared ? '<p class="lk-stamp cln-earlier-status" role="status" tabindex="-1">' + esc(M.earlierCleared) + '</p>' : '';
    return '<div class="cln-earlier" role="status"><p class="hint">Unsaved cleaning checks from an earlier date are still kept on this screen. They have not been recorded or backdated.</p><button type="button" class="p-link" data-cln="discard-earlier">' + (B.armed && B.armed('cln-discard-earlier') ? 'Tap again to undo earlier checks' : 'Undo earlier unsaved checks') + '</button></div>';
  }
  function saveButton() { var changed = dirtyDraft(), state = M.saveBusy ? 'busy' : M.saveState, text = state === 'busy' ? 'Saving...' : state === 'done' ? 'Saved' : state === 'error' ? 'Try again' : 'Save cleaning task'; return '<button type="submit" class="btn dark sv-btn" data-cln="save" data-idle="Save cleaning task" data-wide="Saving..."' + (state ? ' data-sv="' + state + '"' : '') + (M.saveBusy || !changed || M.state !== 'ok' || M.editId && !taskById(M.editId) ? ' disabled' : '') + (M.saveBusy ? ' aria-busy="true"' : '') + '><span class="sv-now">' + (state === 'busy' || state === 'done' ? ink(text, state === 'done' ? 'done' : 'busy') : text) + '</span></button>'; }
  function editorForm() {
    var d = M.draft, guides = C.guides(); if (!d) return '';
    return '<form id="cln-form" class="cln-form" novalidate><fieldset' + (M.saveBusy ? ' disabled' : '') + '><legend>' + (M.editId ? 'Edit cleaning task' : 'New cleaning task') + '</legend>' +
      '<label class="field" for="cln-text"><span class="label">What needs cleaning?</span><input id="cln-text" data-cln-field="text" type="text" maxlength="160" value="' + esc(d.text) + '" required></label>' +
      '<div class="cln-fields"><label class="field" for="cln-area"><span class="label">Area or equipment</span><input id="cln-area" data-cln-field="area" type="text" list="cln-areas" maxlength="80" value="' + esc(d.area) + '" required><datalist id="cln-areas">' + AREAS.map(function (area) { return '<option value="' + esc(area) + '">'; }).join('') + '</datalist></label>' +
      '<label class="field" for="cln-section"><span class="label">Responsible section</span><select id="cln-section" data-cln-field="section" required><option value="">Choose a section</option><option value="_shared"' + (d.shared ? ' selected' : '') + '>Shared kitchen</option>' + C.sections().map(function (s) { return '<option value="' + esc(s.id) + '"' + (!d.shared && d.section === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></label></div>' +
      '<div><span class="label" id="cln-repeat-label">Repeat on</span><div class="chips cln-repeat" role="group" aria-labelledby="cln-repeat-label">' + DAYS.map(function (day) { return '<button type="button" class="chip" data-cln="repeat" data-dow="' + day[0] + '" aria-pressed="' + (d.dows.indexOf(day[0]) >= 0) + '">' + day[1] + '</button>'; }).join('') + '</div></div>' +
      planEditor(d) + (P.featOn('guides') && (guides.length || d.guide) ? '<label class="field" for="cln-guide"><span class="label">How-to guide (optional)</span><select id="cln-guide" data-cln-field="guide"><option value="">No guide</option>' + (d.guide && !guides.some(function (g) { return g.id === d.guide; }) ? '<option value="' + esc(d.guide) + '" selected>Current linked guide</option>' : '') + guides.map(function (g) { return '<option value="' + esc(g.id) + '"' + (d.guide === g.id ? ' selected' : '') + '>' + esc(g.title) + '</option>'; }).join('') + '</select></label>' : '') + '</fieldset>' +
      '<p class="cln-save-note' + (M.saveError ? ' p-err' : ' hint') + '" role="' + (M.saveError ? 'alert' : 'status') + '">' + esc(M.saveError || (M.saveBusy ? 'Saving cleaning task. Not saved yet.' : M.savedText)) + '</p><div class="btn-row">' + saveButton() + '<button type="button" class="btn" data-cln="revert"' + (M.saveBusy || !dirtyDraft() ? ' disabled' : '') + '>Undo unsaved changes</button><button type="button" class="p-link" data-cln="cancel-edit"' + (M.saveBusy ? ' disabled' : '') + '>' + (B.armed && B.armed('cln-cancel') ? 'Tap again to discard' : 'Cancel') + '</button></div></form>';
  }
  function repeatTasks() { return chefGroups(M.tasks.filter(function (task) { return task.until === OPEN; })).reduce(function (list, group) { return list.concat(group.tasks); }, []); }
  function repeatMatches() { return repeatTasks().filter(function (task) { return (M.repeatQuery.trim() || M.repeatGroup === 'all' || chefGroupId(task) === M.repeatGroup) && matchesWords(task, M.repeatQuery, T.day()); }); }
  function editorBlock(outside) { return '<div class="cln-editor">' + (outside ? '<p class="hint cln-editor-context">Your selected task is outside this search or page. Its changes are kept here.</p>' : '') + '<h3 class="cln-editor-title">' + esc(M.editId ? M.draft.text || 'Edit cleaning task' : 'New cleaning task') + '</h3>' + editorForm() + '</div>'; }
  function editor() {
    if (!C.chef() || !M.editor) return '';
    var current = repeatTasks(), matching = repeatMatches(), d = M.draft; M.repeatPage = Math.max(0, Math.min(M.repeatPage, Math.ceil(matching.length / 6) - 1));
    var shownTasks = matching.slice(M.repeatPage * 6, M.repeatPage * 6 + 6), inline = d && M.editId && shownTasks.some(function (task) { return task.id === M.editId; });
    var items = shownTasks.map(function (task, i) { return '<li class="cln-template-item" role="listitem" data-template="' + esc(task.id) + '"><div class="cln-template-summary" style="--cln-row:' + (i + 1) + '"><div><b>' + esc(task.text) + '</b><small>' + esc(task.area + ' · ' + owner(task, T.day())) + '</small><small>' + esc(templateLabel(task)) + (task.from > T.at(T.day()) ? ' · Starts ' + esc(shortDay(T.day(task.from))) : '') + '</small></div><div class="cln-template-actions"><button type="button" class="p-link" data-cln="edit" data-id="' + esc(task.id) + '"' + (M.saveBusy || M.archiveBusy ? ' disabled' : '') + '>Edit</button><button type="button" class="p-link" data-cln="archive" data-id="' + esc(task.id) + '"' + (M.saveBusy || M.archiveBusy ? ' disabled' : '') + '>' + (M.archiveBusy === task.id ? ink('Archiving...') : B.armed && B.armed('cln-archive-' + task.id) ? 'Tap again to archive' : 'Archive') + '</button></div></div>' + (d && M.editId === task.id ? editorBlock(false) : '') + '</li>'; }).join('');
    if (d && !inline) items = '<li class="cln-template-item cln-new-editor" role="listitem">' + editorBlock(!!M.editId) + '</li>' + items;
    if (!d) items += '<li class="cln-template-item cln-new-editor" role="listitem"><div class="cln-editor"><p class="hint">Choose Edit beside a task, or Add cleaning task. One editor opens here.</p></div></li>';
    return '<section class="nb-page cln-plan" aria-labelledby="rtitle"><header class="nb-ph"><div><h2 class="nb-title" id="rtitle" tabindex="-1">Cleaning</h2><p class="nb-date" id="cln-plan-title" tabindex="-1">Repeat tasks' + (M.state === 'ok' ? ' · ' + current.length + ' current tasks' : '') + '</p></div><button type="button" class="p-link" data-cln="hide-setup">Back to Today</button></header><div class="cln-plan-body">' + readLine() + earlierNotice() +
      '<p class="hint">New tasks start today. Changes and archiving start tomorrow. Earlier cleaning records stay as recorded.</p>' + workNotices(tasksOn(T.day()), T.day()) +
      (M.state === 'error' ? '<p class="p-err" role="alert">' + esc(M.error) + '</p>' : M.state !== 'ok' ? loading() : '') +
      (M.saveError && !d ? '<p class="p-err" role="alert">' + esc(M.saveError) + '</p>' : '') +
      '<div class="cln-repeat-browser"><div class="cln-searchbar"><label class="visually-hidden" for="cln-repeat-search">Find a repeat task in all groups</label><input type="search" class="search" id="cln-repeat-search" data-cln-control="repeat-query" placeholder="Find a repeat task or area" value="' + esc(M.repeatQuery) + '"><button type="button" class="btn dark" data-cln="add"' + (M.state !== 'ok' || M.saveBusy || M.archiveBusy ? ' disabled' : '') + '>Add cleaning task</button></div><label class="field" for="cln-repeat-group"><span class="label">Work group</span><select id="cln-repeat-group" data-cln-control="repeat-group"><option value="all">All groups</option>' + CHEF_GROUPS.map(function (group) { return '<option value="' + group[0] + '"' + (M.repeatGroup === group[0] ? ' selected' : '') + '>' + esc(group[1]) + '</option>'; }).join('') + '</select></label>' + (M.repeatQuery.trim() ? '<p class="hint cln-repeat-scope" role="status">Searching all groups. Clear search to use the selected work group.</p>' : '') + pager(matching.length, M.repeatPage, 'repeat-page', M.repeatGroup) +
      (!matching.length ? '<p class="hint" role="status">' + (current.length ? 'No tasks match this search or group.' : M.state === 'ok' ? 'No repeat tasks set yet. Add a task or load a schedule below.' : 'The task list is not available yet. Your draft is kept.') + '</p>' : '') + '<ul class="cln-templates cln-repeat-layout" role="list">' + items + '</ul></div><div class="cln-setup-imports">' + importPanel() + '</div></div></section>';
  }
  function readLine() { return '<div class="cln-readline"><span class="hint">' + (M.state === 'ok' ? 'Checked ' + esc(T.clock(M.readAt)) : 'Cleaning, with who and when') + '</span><button type="button" class="p-link" data-cln="refresh"' + (M.state === 'loading' || busy() ? ' disabled' : '') + '>Refresh</button></div>'; }
  function draw() {
    if (!shown()) return;
    if (!C.allowed()) { M.root.innerHTML = ''; return; }
    if (M.readAgain && !busy()) { M.readAgain = false; load(true); return; }
    var active = document.activeElement, focusAttribute = active && ['data-cln-field', 'data-cln-plan', 'data-cln-repeat', 'data-cln-control'].filter(function (attribute) { return active.hasAttribute(attribute); })[0], field = focusAttribute && active.getAttribute(focusAttribute), action = active && M.root.contains(active) && active.getAttribute('data-cln');
    var focusAttrs = {}; if (action) ['data-id', 'data-day', 'data-dow', 'data-group', 'data-page', 'data-cln-direction'].forEach(function (attribute) { if (active.hasAttribute(attribute)) focusAttrs[attribute] = active.getAttribute(attribute); }); if (action === 'group-page' || action === 'repeat-page') delete focusAttrs['data-page'];
    var pos = focusAttribute && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;
    var today = tasksOn(T.day()), totals = workTotals(today, T.day()), chef = C.chef(), week = chef && M.view === 'week', setup = chef && M.view === 'setup';
    var toolbar = chef ? '<div class="cln-toolbar"><div class="chips" role="group" aria-label="Cleaning view"><button type="button" class="chip" data-cln="today" aria-pressed="' + (!week && !setup) + '">Today</button><button type="button" class="chip" data-cln="week" aria-pressed="' + week + '">Week</button><button type="button" class="chip" data-cln="setup" aria-pressed="' + setup + '" aria-expanded="' + setup + '" aria-controls="cln-plan-title">Repeat tasks</button></div>' + (!setup && M.draft ? '<button type="button" class="p-link cln-draft-return" data-cln="setup">' + (dirtyDraft() ? 'Unsaved repeat task' : 'Return to repeat task') + '</button>' : '') + '</div>' : '';
    M.root.innerHTML = '<div class="nb-wrap cln-page' + (chef ? ' cln-chef-page' : '') + '" data-cln-view="' + (setup ? 'setup' : week ? 'week' : 'today') + '">' + toolbar + (setup ? editor() :
      '<section class="nb-page cln-book" aria-labelledby="rtitle"><header class="nb-ph"><div><h2 class="nb-title" id="rtitle" tabindex="-1">Cleaning</h2><span class="nb-date">' + esc(week ? 'Week commencing ' + longDay(M.week) : longDay(T.day())) + '</span></div>' + (!week && M.state === 'ok' && today.length ? '<div class="nb-prog cln-progress">' + totals.complete + '/' + totals.total + '<small>' + (totals.events ? 'recorded; repeats apply' : 'done today') + '</small></div>' : '') + '</header>' + readLine() +
      '<div class="cln-temperature"><button type="button" class="p-link" data-cln="temperature" aria-expanded="' + M.temperatureOpen + '">Temperature logs: morning and before dinner service</button>' + (M.temperatureOpen ? '<p class="hint">Temperature logs must be completed first thing in the morning and before dinner service. The temperature log is not connected here. Record readings in the venue\'s temperature log. Cleaning checks do not record or validate temperatures.</p>' : '') + '</div>' + earlierNotice() +
      (!week && M.state === 'ok' && (totals.events || totals.awaiting || totals.blocked) ? '<p class="hint cln-coverage">' + (totals.events ? 'Record every required service, prep or use. The count covers known occurrences; repeat coverage is not configured. ' : '') + (totals.awaiting ? totals.awaiting + ' awaiting Pass check. ' : '') + (totals.blocked ? totals.blocked + ' unable to complete.' : '') + '</p>' : '') +
      '<div class="nb-body cln-body">' + (M.state === 'error' ? '<p class="p-err" role="alert">' + esc(M.error) + '</p>' : M.state !== 'ok' ? loading() : week ? weekly() : chef ? chefDaily(T.day()) : daily(T.day())) + '</div></section>') + '</div>';
    if (busy()) Array.prototype.forEach.call(M.root.querySelectorAll('[data-cln="refresh"], [data-cln="today"], [data-cln="week"], [data-cln="setup"], [data-cln="previous"], [data-cln="next"], [data-cln="this-week"]'), function (button) { button.disabled = true; });
    if (window.LK_UX) window.LK_UX.enhance(M.root);
    if (focusAttribute) { var el = Array.prototype.filter.call(M.root.querySelectorAll('input, textarea, select'), function (element) { return element.getAttribute(focusAttribute) === field; })[0]; if (el && !el.disabled) { el.focus({ preventScroll: true }); if (pos && el.setSelectionRange) el.setSelectionRange(pos[0], pos[1]); } }
    else if (action) { var button = Array.prototype.filter.call(M.root.querySelectorAll('[data-cln="' + action + '"]'), function (element) { return Object.keys(focusAttrs).every(function (attribute) { return element.getAttribute(attribute) === focusAttrs[attribute]; }); })[0]; if (button && !button.disabled && button.getClientRects().length) button.focus({ preventScroll: true }); else if (button && (action === 'group-page' || action === 'repeat-page')) { var count = button.closest('.cln-pager').querySelector('[role="status"]'); if (count) count.focus({ preventScroll: true }); } }
    armBoundary();
  }
  function putDone(value) {
    function put(list) { var index = list.map(function (r) { return r.id; }).indexOf(value.id); if (index < 0) list.push(value); else list[index] = value; }
    put(M.done); Object.keys(M.cache).forEach(function (key) { var data = M.cache[key]; if (data.done !== M.done && value.day >= data.from && value.day <= data.to) put(data.done); });
  }
  function putTask(value) {
    var index = M.tasks.map(function (task) { return task.id; }).indexOf(value.id); if (index < 0) M.tasks.push(value); else M.tasks[index] = value;
    M.cache = Object.create(null);
  }
  function importSchedule(kind) {
    if (!C.chef() || !C.importTasks || busy() || dirtyDraft() || M.state !== 'ok') return;
    var model = M, pack = kind === 'packdown', templates = pack ? window.LK_CLEANING_SCHEDULE.packDownDrafts() : window.LK_CLEANING_SCHEDULE.drafts();
    templates.forEach(function (task) { if (task.plan.verification) task.plan.verifiers = (M.importVerifiers || []).slice(); });
    M.importBusy = true; M.importKind = kind || 'cleaning'; if (pack) { M.packImportError = M.packImportText = ''; M.packImportOpen = true; } else { M.importError = M.importText = ''; M.importOpen = true; } draw();
    C.importTasks(templates).then(function (data) {
      if (M !== model) return; M.importBusy = false; M.cache = Object.create(null); M.range = data.from + '|' + data.to; useData(data); M.importVerifiers = [];
      var message = 'Loaded ' + (pack ? 'pack down schedule' : 'cleaning schedule') + ': ' + data.imported + ' added, ' + data.skipped + ' already present. Review responsibilities and procedures before releasing it to the team.';
      if (pack) M.packImportText = message; else M.importText = message; draw();
      if (M.view === 'week') load(true);
    }, function (error) { if (M !== model) return; M.importBusy = false; var message = error && error.message || 'Could not load the schedule. Your choices are kept. Try again.'; if (pack) M.packImportError = message; else M.importError = message; draw(); });
  }
  function flowAction(task, day, slot, kind, action, workerId) {
    if (!hasPlan(task) || !workEnabled(task, day)) return;
    var item = flowList(task, day).filter(function (entry) { return entry.slot === slot; })[0] || { slot: slot, kind: kind, record: null }, d = workDraft(task, day, item), key = flowKey(task, day, slot), model = M;
    if (action === 'perform' && !task.plan.checks.every(function (label) { return d.checked.indexOf(label) >= 0; })) { M.flowErrors[key] = 'Finish every required check before recording this clean.'; draw(); return; }
    if ((action === 'block' || action === 'reopen') && !d.note.trim()) { M.flowErrors[key] = action === 'block' ? 'Write why this clean cannot be completed.' : 'Write a reason before reopening this clean.'; draw(); return; }
    if (action === 'perform' && C.shared() && !workerId) { openPicker(task, day, { slot: slot, kind: kind }); return; }
    var sheet = picker, options = { slot: slot, kind: kind, checked: d.checked.slice(), note: d.note.trim() };
    M.pending[occurrence(task, day)] = { flow: true }; delete M.flowErrors[key]; delete M.flowSaved[key];
    if (sheet) { sheet.selected = workerId; sheet.busy = true; sheet.error = ''; drawPicker(); }
    draw();
    C.act(task, day, item.record, action, workerId || B.who(), options).then(function (value) {
      if (M !== model) return; delete M.pending[occurrence(task, day)]; if (M.workDrafts[key]) M.workDrafts[key].newEvent = false; if (!value.recovered || !value.changed) delete M.workDrafts[key]; putDone(value);
      var words = action === 'perform' ? value.flow.status === 'awaiting' ? 'Recorded ' + task.text + '. Awaiting Pass check.' : 'Recorded ' + task.text + ' done.' : action === 'verify' ? 'Pass check saved for ' + task.text + '.' : action === 'block' ? 'Recorded unable to complete: ' + task.text + '.' : action === 'reopen' ? 'Reopened ' + task.text + '.' : 'Saved checks for ' + task.text + '.';
      if (value.recovered && value.changed) words = 'Earlier save confirmed for ' + task.text + '. Your further changes are kept.';
      if (value.advanced) { words = 'Earlier save confirmed for ' + task.text + '. This clean has changed again.'; M.flowErrors[key] = 'Refresh to check before continuing. Your further changes are kept.'; }
      M.flowSaved[key] = words + ' Saved ' + T.clock(T.now()) + '.'; draw();
      if (picker === sheet && sheet) { sheet.busy = false; closePicker(); }
      if (C.allowed()) P.toast(words);
    }, function (error) {
      if (M !== model) return; delete M.pending[occurrence(task, day)]; M.flowErrors[key] = error && error.code === 'stale' ? 'This clean changed on another screen. Refresh before trying again. Your checks are kept.' : error && error.message || 'Could not save this clean. Your checks are kept. Try again.';
      if (picker === sheet && sheet) { sheet.busy = false; sheet.error = M.flowErrors[key]; sheet.failed = true; drawPicker(); }
      draw();
    });
  }
  function addFlow(task, day, kind) {
    if (!workEnabled(task, day)) return;
    var slot = C.newSlot(kind); M.expanded[occurrence(task, day)] = true; workDraft(task, day, { slot: slot, kind: kind, record: null }).newEvent = true;
    flowAction(task, day, slot, kind, 'save');
  }
  function patchWork(task, day, item) {
    var key = flowKey(task, day, item.slot), panel = M.root && M.root.querySelector('[data-cln-occurrence="' + key + '"]'); if (!panel) return;
    var d = workDraft(task, day, item), all = task.plan.checks.every(function (label) { return d.checked.indexOf(label) >= 0; }), perform = panel.querySelector('[data-cln="flow-perform"]'), saveChecks = panel.querySelector('[data-cln="flow-save"]');
    if (perform) perform.disabled = !workEnabled(task, day) || !all;
    if (saveChecks) saveChecks.disabled = !workEnabled(task, day) || !workDirty(d);
    delete M.flowErrors[key]; delete M.flowSaved[key];
    Array.prototype.forEach.call(panel.querySelectorAll('.p-err, .lk-stamp'), function (el) { el.remove(); });
    var discard = panel.querySelector('[data-cln="flow-discard"]'), actions = panel.querySelector('.cln-work-actions');
    if (workDirty(d) && !discard && actions) actions.insertAdjacentHTML('beforeend', '<button type="button" class="p-link" data-cln="flow-discard" data-id="' + esc(task.id) + '" data-day="' + esc(day) + '" data-slot="' + esc(item.slot) + '" data-kind="' + esc(item.kind) + '">Undo unsaved checks</button>');
    else if (!workDirty(d) && discard) discard.remove();
  }
  function changeWork(input) {
    var task = taskById(input.getAttribute('data-id')), day = input.getAttribute('data-day'), slot = input.getAttribute('data-slot');
    if (!hasPlan(task) || !workEnabled(task, day)) return;
    var item = flowList(task, day).filter(function (entry) { return entry.slot === slot; })[0]; if (!item) return;
    var d = workDraft(task, day, item);
    if (input.hasAttribute('data-cln-note')) d.note = input.value;
    else { var label = task.plan.checks[+input.getAttribute('data-cln-check')], at = d.checked.indexOf(label); if (input.checked && at < 0) d.checked.push(label); else if (!input.checked && at >= 0) d.checked.splice(at, 1); }
    patchWork(task, day, item);
  }
  function changePlan(input) {
    if (!M.draft || !M.draft.plan || M.saveBusy) return;
    if (input.hasAttribute('data-cln-verifier')) { var id = input.getAttribute('data-cln-verifier'), ids = M.draft.plan.verifiers, at = ids.indexOf(id); if (input.checked && at < 0) ids.push(id); else if (!input.checked && at >= 0) ids.splice(at, 1); }
    else if (input.hasAttribute('data-cln-repeat')) { var repeatKey = input.getAttribute('data-cln-repeat'); M.draft.plan.repeat[repeatKey] = repeatKey === 'days' ? +input.value : input.value; }
    else { var key = input.getAttribute('data-cln-plan'); M.draft.plan[key] = key === 'checks' ? input.value.split('\n').map(function (line) { return line.trim(); }).filter(Boolean) : input.value; }
    M.saveError = M.savedText = M.saveState = ''; patchSave();
  }
  function tick(task, day, workerId) {
    if (!canAct(task, day)) return;
    var before = record(task, day); if (before && before.done) { if (C.canUndo(before)) undo(before, task.text); else { P.toast('This tick can no longer be undone.'); draw(); } return; }
    if (C.shared() && !workerId) { openPicker(task, day); return; }
    var key = occurrence(task, day), model = M, sheet = picker; M.pending[key] = { undo: false }; delete M.tickErrors[key];
    if (sheet) { sheet.selected = workerId; sheet.busy = true; sheet.error = ''; drawPicker(); }
    draw();
    C.tick(task, day, before, workerId || B.who()).then(function (value) {
      if (M !== model) return; delete M.pending[key]; putDone(value);
      draw(); if (picker === sheet && sheet) { sheet.busy = false; closePicker(); }
      if (C.allowed()) P.toast('Marked ' + task.text + ' done', C.canUndo(value) ? { label: 'Undo', fn: function () { undo(value, task.text); } } : null);
    }, function (error) {
      if (M !== model) return; delete M.pending[key]; var message = error && error.message || 'Could not confirm this tick. Refresh to check before trying again.';
      M.tickErrors[key] = message;
      if (picker === sheet && sheet) { sheet.busy = false; sheet.error = message; sheet.failed = true; drawPicker(); }
      draw();
    });
  }
  function undo(value, text) {
    if (!C.allowed() || !C.canUndo(value)) { P.toast('This tick can no longer be undone. Refresh to check the list.', null, 0, 'bad'); return; }
    var key = value.day + '_' + value.task, model = M; if (M.pending[key]) return; M.pending[key] = { undo: true }; delete M.tickErrors[key]; draw();
    C.undo(value).then(function (next) { if (M !== model) return; delete M.pending[key]; putDone(next); draw(); if (C.allowed()) P.toast('Undone: ' + text); }, function (error) { if (M !== model) return; delete M.pending[key]; M.tickErrors[key] = error && error.message || 'Could not undo this tick. Refresh to check the list.'; draw(); });
  }
  function startEditor(task) {
    if (!C.chef() || M.saveBusy || M.archiveBusy) return;
    if (dirtyDraft()) { M.saveError = 'Save or undo your unsaved changes before choosing another task.'; draw(); return; }
    M.editor = true; M.view = 'setup'; M.editId = task ? task.id : ''; if (task) { var selectedIndex = repeatMatches().map(function (item) { return item.id; }).indexOf(task.id); if (selectedIndex >= 0) M.repeatPage = Math.floor(selectedIndex / 6); } M.draft = draftFor(task); M.original = JSON.stringify(M.draft); M.saveError = M.savedText = M.saveState = ''; draw();
    var field = M.root.querySelector('#cln-text'); if (field) field.focus();
  }
  function patchSave() {
    if (!shown()) return; var btn = M.root.querySelector('[data-cln="save"]'); if (btn) P.btnPatch(btn, saveButton());
    var revert = M.root.querySelector('[data-cln="revert"]'); if (revert) revert.disabled = M.saveBusy || !dirtyDraft();
    var note = M.root.querySelector('.cln-save-note'); if (note) { note.textContent = M.saveError || M.savedText; note.classList.toggle('p-err', !!M.saveError); note.setAttribute('role', M.saveError ? 'alert' : 'status'); }
  }
  function changeControl(input) {
    if (!C.chef()) return; var key = input.getAttribute('data-cln-control');
    if (key === 'work-query') { M.workQuery = input.value; M.workPage = 0; }
    else if (key === 'work-filter') { M.workFilter = input.value; M.workPage = 0; }
    else if (key === 'repeat-query') { M.repeatQuery = input.value; M.repeatPage = 0; }
    else if (key === 'repeat-group') { M.repeatGroup = input.value; M.repeatPage = 0; }
    draw();
  }
  function changeField(input) {
    if (!M.draft || M.saveBusy) return; var key = input.getAttribute('data-cln-field');
    if (key === 'section') { M.draft.shared = input.value === '_shared'; M.draft.section = M.draft.shared ? '' : input.value; }
    else M.draft[key] = input.value;
    M.saveError = M.savedText = M.saveState = ''; clearTimeout(savedTimer); patchSave();
  }
  function save() {
    if (!C.chef() || !M.draft || !dirtyDraft() || M.saveBusy) return;
    if (M.state !== 'ok' || M.editId && !taskById(M.editId)) { M.saveError = 'Refresh cleaning before saving this task. Your changes are kept.'; draw(); return; }
    var d = M.draft, error = !d.text.trim() ? 'Write the cleaning task.' : !d.area.trim() ? 'Choose or write the area or equipment.' : !d.shared && !C.sections().some(function (s) { return s.id === d.section; }) ? 'Choose the responsible section.' : !d.dows.length ? 'Choose at least one repeat day.' : d.plan && d.plan.repeat && !(Number.isInteger(d.plan.repeat.days) && d.plan.repeat.days >= 2 && d.plan.repeat.days <= 30) ? 'Repeat every 2 to 30 days, whole days only.' : d.plan && d.plan.verification && cannotCheck(d.plan.verifiers).length ? cannotCheck(d.plan.verifiers).map(checkerName).join(', ') + ' cannot do the Pass check. Untick them, or give them Tick in Staff.' : '';
    if (error) { M.saveError = error; M.saveState = 'error'; draw(); return; }
    var model = M, old = M.editId ? taskById(M.editId) : null; M.saveBusy = true; M.saveError = M.savedText = ''; M.saveState = 'busy'; draw();
    C.saveTask(Object.assign({}, d, { text: d.text.trim(), area: d.area.trim(), dows: d.dows.slice() }), old).then(function (result) {
      if (M !== model) return; M.saveBusy = false; if (result.closed) putTask(result.closed); putTask(result.task); M.editId = result.task.id;
      if (result.recovered) { M.original = JSON.stringify(draftFor(result.task)); M.saveState = ''; M.savedText = 'Earlier save confirmed. Your further changes are kept; save them to apply from tomorrow.'; draw(); return; }
      M.draft = draftFor(result.task); M.original = JSON.stringify(M.draft); M.saveState = 'done'; M.savedText = 'Saved ' + result.task.text + '. ' + (result.task.from > T.at(T.day()) ? 'Starts tomorrow.' : 'Starts today.'); draw();
      savedTimer = setTimeout(function () { if (M === model && M.saveState === 'done') { M.saveState = ''; patchSave(); } }, 1400);
    }, function (error) { if (M !== model) return; M.saveBusy = false; M.saveState = 'error'; M.saveError = error && error.code === 'stale' ? 'This repeat task changed. Refresh and choose its current version. Your changes are kept.' : error && error.message || 'Could not save. Your changes are kept. Try again.'; draw(); });
  }
  function archive(task) {
    if (!C.chef() || dirtyDraft() || busy()) { if (dirtyDraft()) { M.saveError = 'Save or undo your unsaved changes before archiving.'; draw(); } return; }
    if (B.arm && !B.arm('cln-archive-' + task.id, draw)) return;
    var model = M; M.archiveBusy = task.id; M.saveError = ''; draw();
    C.archiveTask(task).then(function (closed) { if (M !== model) return; M.archiveBusy = ''; putTask(closed); if (M.editId === task.id) { M.draft = null; M.original = ''; M.editId = ''; } draw(); if (C.allowed()) P.toast('Archived ' + task.text + ' from tomorrow'); }, function (error) { if (M !== model) return; M.archiveBusy = ''; M.saveError = error && error.message || 'Could not archive this task. Try again.'; draw(); });
  }
  function pickerValid() { return !!(picker && C.allowed() && C.context() === picker.context && C.identity() === picker.identity && T.day() === picker.day && shown() && C.canTick()); }
  function closePicker(noBack, force) {
    if (!popup || picker && picker.busy && !force) return;
    var old = picker; picker = null; popup.remove(); popup = null; B.ovDone('cleaning', noBack); document.documentElement.classList.toggle('sheet-open', !!document.querySelector('.sheet'));
    if (!force && old && shown()) { var next = M.root.querySelector('[data-cln="tick"][data-id="' + old.task.id + '"], [data-cln="details"][data-id="' + old.task.id + '"], [data-cln="flow-quick"][data-id="' + old.task.id + '"]'); if (next && !next.disabled) next.focus({ preventScroll: true }); }
    if (!force && C.sheetNext) C.sheetNext();
  }
  function pickerBack() { if (picker && picker.busy) { B.ovPush('cleaning', pickerBack); B.say('The cleaning tick is still saving.'); } else closePicker(true); }
  function drawPicker() {
    if (!popup || !picker) return; if (!pickerValid()) { closePicker(true, true); return; }
    var all = C.workers(), recent = C.recent(), first = [], rest;
    recent.forEach(function (id) { var p = all.filter(function (person) { return person.id === id; })[0]; if (p && first.indexOf(p) < 0) first.push(p); }); rest = all.filter(function (p) { return first.indexOf(p) < 0; });
    var off = picker.busy || picker.failed;
    function names(people, cls) { return '<div class="pt-names ' + cls + '">' + people.map(function (p) { return '<button type="button" class="chip" data-cln-person="' + esc(p.id) + '"' + (off ? ' disabled' : '') + '>' + (picker.busy && picker.selected === p.id ? ink(p.name) : esc(p.name)) + '</button>'; }).join('') + '</div>'; }
    var active = document.activeElement, personFocus = active && popup.contains(active) && active.getAttribute('data-cln-person'), actionFocus = active && popup.contains(active) && active.getAttribute('data-cln-picker');
    var pane = popup.querySelector('.pt-sheet'), html = '<div class="sheet-grip" aria-hidden="true"></div><h3 id="cln-who-title">Who did this?</h3><p class="pt-item">' + esc(picker.task.text) + ' <span>' + esc(picker.task.area) + '</span></p>' +
      (first.length ? '<p class="hint">Signed in on this device today</p>' + names(first, 'cln-recent') : '') + (rest.length ? (first.length ? '<button type="button" class="p-link pt-others-button" data-cln-picker="others" aria-expanded="' + picker.others + '"' + (off ? ' disabled' : '') + '>Others...</button>' : '') + (picker.others || !first.length ? names(rest, 'cln-others') : '') : '') +
      (!all.length ? '<p class="p-err" role="status">No eligible kitchen names are available. Close and check the staff list.</p>' : '') +
      (picker.busy ? '<p class="pt-status" role="status">' + ink('Recording... Not saved yet.') + '</p>' : '') + (picker.error ? '<p class="p-err pt-status" role="alert">' + esc(picker.error) + '</p><button type="button" class="btn" data-cln-picker="refresh">Close and refresh</button>' : '') +
      '<button type="button" class="btn sheet-x" data-cln-picker="cancel"' + (picker.busy ? ' disabled' : '') + '>Cancel</button>';
    if (pane.lkHTML !== html) { pane.innerHTML = html; pane.lkHTML = html; }
    pane.setAttribute('aria-busy', String(picker.busy)); if (picker.busy) pane.focus({ preventScroll: true });
    else if (personFocus || actionFocus) { var next = Array.prototype.filter.call(pane.querySelectorAll('[data-cln-person], [data-cln-picker]'), function (el) { return personFocus ? el.getAttribute('data-cln-person') === personFocus : el.getAttribute('data-cln-picker') === actionFocus; })[0]; if (next && !next.disabled) next.focus({ preventScroll: true }); }
  }
  function openPicker(task, day, flowItem) {
    if (picker || C.sheetBusy && C.sheetBusy() || !canAct(task, day)) return;
    picker = { task: task, day: day, flow: flowItem || null, identity: C.identity(), context: C.context(), selected: '', busy: false, error: '', failed: false, others: false };
    popup = document.createElement('div'); popup.id = 'cln-worker-sheet'; popup.innerHTML = '<div class="sheet-bg" data-cln-picker="cancel"></div><section class="sheet pt-sheet" role="dialog" aria-modal="true" aria-labelledby="cln-who-title" tabindex="-1"></section>'; document.body.appendChild(popup); B.ovPush('cleaning', pickerBack); document.documentElement.classList.add('sheet-open'); drawPicker();
    var first = popup.querySelector('[data-cln-person], button[data-cln-picker="cancel"]'); if (first) first.focus({ preventScroll: true });
  }
  function click(event) {
    var button = event.target.closest && event.target.closest('[data-cln]'); if (!button || !M.root || !M.root.contains(button) || button.disabled || !C.allowed()) return;
    if (checkDay()) { event.preventDefault(); return; }
    var action = button.getAttribute('data-cln'), id = button.getAttribute('data-id'), task = id && taskById(id); event.preventDefault();
    if (busy() && ['refresh', 'today', 'week', 'setup', 'previous', 'next', 'this-week'].indexOf(action) >= 0) { P.toast('Wait for the cleaning change to save.'); return; }
    if (action === 'tick' && task) tick(task, button.getAttribute('data-day'));
    else if (action === 'details' && hasPlan(task)) { var detailDay = button.getAttribute('data-day'), detailKey = occurrence(task, detailDay); M.expanded[detailKey] = !M.expanded[detailKey]; draw(); }
    else if (action === 'week-details' && hasPlan(task) && C.chef()) { M.selected = button.getAttribute('data-day'); M.expanded[occurrence(task, M.selected)] = true; draw(); var detail = M.root.querySelector('#cln-detail-' + occurrence(task, M.selected)); if (detail) { detail.setAttribute('tabindex', '-1'); detail.focus({ preventScroll: true }); } }
    else if (action === 'group' && C.chef()) { var group = button.getAttribute('data-group'); M.workGroup = M.workGroup === group ? '' : group; M.workPage = 0; draw(); }
    else if (action === 'group-page' && C.chef()) { M.workPage = Math.max(0, +button.getAttribute('data-page') || 0); draw(); }
    else if (action === 'repeat-page' && C.chef()) { M.repeatPage = Math.max(0, +button.getAttribute('data-page') || 0); draw(); }
    else if (action === 'clear-work' && C.chef()) { M.workQuery = ''; M.workFilter = 'all'; M.workPage = 0; draw(); }
    else if (action === 'exception' && C.chef() && task) { var exceptionDay = button.getAttribute('data-day'); if (M.view === 'setup') { M.view = exceptionDay === T.day() ? 'today' : 'week'; M.selected = exceptionDay; M.week = monday(exceptionDay); } M.workQuery = ''; M.workFilter = 'all'; M.workGroup = chefGroupId(task); var exceptionGroup = chefGroups(tasksOn(exceptionDay)).filter(function (group) { return group.id === M.workGroup; })[0]; M.workPage = exceptionGroup ? Math.max(0, Math.floor(exceptionGroup.tasks.map(function (item) { return item.id; }).indexOf(task.id) / 6)) : 0; M.expanded[occurrence(task, exceptionDay)] = true; if (M.range !== range().join('|') || M.state === 'idle' || M.state === 'error') load(); draw(); var target = M.root.querySelector('#cln-detail-' + occurrence(task, exceptionDay)) || Array.prototype.filter.call(M.root.querySelectorAll('[data-cln-row]'), function (element) { return element.getAttribute('data-cln-row') === occurrence(task, exceptionDay); })[0]; if (target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'nearest' }); } }
    else if (action === 'temperature') { M.temperatureOpen = !M.temperatureOpen; draw(); }
    else if (action === 'discard-earlier') { if (!earlierDrafts().length || B.arm && !B.arm('cln-discard-earlier', draw)) return; earlierDrafts().forEach(function (key) { delete M.workDrafts[key]; delete M.flowErrors[key]; delete M.flowSaved[key]; }); M.earlierCleared = 'Undone: earlier unsaved cleaning checks. Saved records were kept.'; draw(); var confirmation = M.root.querySelector('.cln-earlier-status'); if (confirmation) confirmation.focus({ preventScroll: true }); P.toast('Undone: earlier unsaved cleaning checks'); }
    else if (action === 'import-schedule') importSchedule();
    else if (action === 'import-packdown') importSchedule('packdown');
    else if (action === 'flow-add' && hasPlan(task)) addFlow(task, button.getAttribute('data-day'), button.getAttribute('data-kind'));
    else if (action === 'flow-discard' && hasPlan(task)) { var discardKey = flowKey(task, button.getAttribute('data-day'), button.getAttribute('data-slot')); delete M.workDrafts[discardKey]; delete M.flowErrors[discardKey]; draw(); }
    else if (action === 'flow-quick' && hasPlan(task)) { var quickDay = button.getAttribute('data-day'), quickSlot = button.getAttribute('data-slot'), quickKind = button.getAttribute('data-kind'), quickCurrent = flowRecord(task, quickDay, quickSlot); if (quickCurrent && quickCurrent.done) { if (!C.canUndo(quickCurrent)) return; workDraft(task, quickDay, { slot: quickSlot, kind: quickKind, record: quickCurrent }).note = 'Undo by recorder'; flowAction(task, quickDay, quickSlot, quickKind, 'reopen'); } else flowAction(task, quickDay, quickSlot, quickKind, 'perform'); }
    else if (hasPlan(task) && ['flow-save', 'flow-block', 'flow-perform', 'flow-verify', 'flow-reopen'].indexOf(action) >= 0) flowAction(task, button.getAttribute('data-day'), button.getAttribute('data-slot'), button.getAttribute('data-kind'), action.slice(5));
    else if (action === 'refresh') load(true);
    else if (action === 'today' || action === 'week') { M.view = action === 'week' && C.chef() ? 'week' : 'today'; draw(); load(); }
    else if (C.chef() && (action === 'previous' || action === 'next' || action === 'this-week')) { M.week = action === 'this-week' ? monday(T.day()) : shift(M.week, action === 'previous' ? -7 : 7); M.selected = M.week <= T.day() && T.day() <= shift(M.week, 6) ? T.day() : M.week; draw(); load(); }
    else if (action === 'day' && C.chef()) { M.selected = button.getAttribute('data-day'); M.workPage = 0; draw(); }
    else if (action === 'setup' && C.chef()) { M.editor = true; M.view = 'setup'; draw(); if (M.state === 'idle') load(); var heading = M.root.querySelector('#cln-plan-title'); if (heading) heading.focus(); }
    else if (action === 'hide-setup' && C.chef()) { if (dirtyDraft() || M.saveBusy) { M.saveError = 'Save or undo your unsaved changes before closing.'; draw(); } else { M.editor = false; M.view = 'today'; draw(); load(); } }
    else if (action === 'add') startEditor(null);
    else if (action === 'edit' && task) startEditor(task);
    else if (action === 'archive' && task) archive(task);
    else if (action === 'repeat' && M.draft && !M.saveBusy) { var dow = +button.getAttribute('data-dow'), i = M.draft.dows.indexOf(dow); if (i < 0) M.draft.dows.push(dow); else M.draft.dows.splice(i, 1); M.draft.dows.sort(); M.saveError = M.savedText = M.saveState = ''; button.setAttribute('aria-pressed', String(i < 0)); patchSave(); }
    else if (action === 'revert' && !M.saveBusy) { if (C.discardAttempt) C.discardAttempt(); M.draft = JSON.parse(M.original); M.saveError = M.savedText = M.saveState = ''; draw(); }
    else if (action === 'cancel-edit' && !M.saveBusy) { if (dirtyDraft() && B.arm && !B.arm('cln-cancel', draw)) return; if (C.discardAttempt) C.discardAttempt(); M.draft = null; M.original = ''; M.editId = ''; M.saveError = M.savedText = M.saveState = ''; draw(); }
    else if (action === 'save') save();
  }
  // One local deadline, for midnight or the next Undo expiry. No read at an Undo expiry and no timer polling.
  // A changed Queensland date invalidates the old view once, then opens the new day's bounded range.
  function armBoundary() {
    clearTimeout(boundaryTimer); if (!shown() || !C.allowed()) return;
    var next = T.at(shift(T.day(), 1)); M.done.forEach(function (r) { if (C.canUndo(r)) next = Math.min(next, r.doneAt + 120000); });
    boundaryTimer = setTimeout(function () { if (!checkDay()) draw(); }, Math.max(25, next - T.now() + 25));
  }
  function checkDay() {
    if (M.today === T.day()) { armBoundary(); return false; }
    M.today = T.day(); M.selected = T.day(); M.week = monday(T.day()); closePicker(true, true); clearReads(); draw(); load(); return true;
  }
  function mount(root) { if (!C.act || !C.importTasks || !C.due || !window.LK_CLEANING_SCHEDULE) { root.innerHTML = '<p class="hint" role="status">Reload the book to use the current cleaning schedule.</p><button type="button" class="btn dark" data-act="reload">Reload</button>'; return; } access(); M.root = root; checkDay(); draw(); load(); }
  function unmount() { closePicker(true, true); clearTimeout(boundaryTimer); M.root = null; generation++; if (M.state === 'loading') M.state = 'idle'; }
  document.addEventListener('click', click);
  document.addEventListener('input', function (event) { if (M.root && M.root.contains(event.target) && event.target.hasAttribute('data-cln-field')) changeField(event.target); });
  document.addEventListener('change', function (event) { if (M.root && M.root.contains(event.target) && event.target.hasAttribute('data-cln-field')) changeField(event.target); });
  document.addEventListener('input', function (event) { if (!M.root || !M.root.contains(event.target)) return; if (event.target.hasAttribute('data-cln-note') || event.target.hasAttribute('data-cln-check')) changeWork(event.target); else if (event.target.hasAttribute('data-cln-plan') || event.target.hasAttribute('data-cln-repeat')) changePlan(event.target); });
  document.addEventListener('change', function (event) {
    if (!M.root || !M.root.contains(event.target)) return;
    if (event.target.hasAttribute('data-cln-check')) changeWork(event.target);
    else if (event.target.hasAttribute('data-cln-verifier') || event.target.hasAttribute('data-cln-plan') || event.target.hasAttribute('data-cln-repeat')) changePlan(event.target);
    else if (event.target.hasAttribute('data-cln-import-verifier') && !M.importBusy) { var id = event.target.getAttribute('data-cln-import-verifier'), ids = M.importVerifiers || (M.importVerifiers = []), at = ids.indexOf(id); if (event.target.checked && at < 0) ids.push(id); else if (!event.target.checked && at >= 0) ids.splice(at, 1); }
  });
  document.addEventListener('toggle', function (event) { if (event.target.classList && event.target.classList.contains('cln-import')) { if (event.target.classList.contains('cln-pack-import')) M.packImportOpen = event.target.open; else M.importOpen = event.target.open; } }, true);
  document.addEventListener('input', function (event) { if (M.root && M.root.contains(event.target) && event.target.hasAttribute('data-cln-control') && event.target.tagName === 'INPUT') changeControl(event.target); });
  document.addEventListener('change', function (event) { if (M.root && M.root.contains(event.target) && event.target.hasAttribute('data-cln-control') && event.target.tagName === 'SELECT') changeControl(event.target); });
  document.addEventListener('submit', function (event) { if (event.target.id === 'cln-form') { event.preventDefault(); save(); } });
  document.addEventListener('click', function (event) {
    if (!popup || !popup.contains(event.target)) return; var button = event.target.closest('[data-cln-person], [data-cln-picker]'); if (!button || button.disabled) return; event.preventDefault();
    var action = button.getAttribute('data-cln-picker'), person = button.getAttribute('data-cln-person');
    if (action === 'cancel') closePicker();
    else if (action === 'others' && picker && !picker.busy) { picker.others = !picker.others; drawPicker(); var first = popup.querySelector('.cln-others button'); if (first) first.focus({ preventScroll: true }); }
    else if (action === 'refresh') { closePicker(); load(true); }
    else if (person && pickerValid() && !picker.busy && !picker.failed) { if (picker.flow) flowAction(picker.task, picker.day, picker.flow.slot, picker.flow.kind, 'perform', person); else tick(picker.task, picker.day, person); }
  });
  document.addEventListener('keydown', function (event) { if (!popup) return; if (event.key === 'Escape') { event.preventDefault(); closePicker(); } if (event.key === 'Tab') { var pane = popup.querySelector('.pt-sheet'); if (picker.busy) { event.preventDefault(); pane.focus({ preventScroll: true }); } else B.trapTab(event, pane, 'button:not([disabled]), input:not([disabled])'); } });
  ['lk-access', 'lk-who', 'lk-admin', 'lk-cfg', 'lk-feat'].forEach(function (name) { window.addEventListener(name, function () { var open = access(); draw(); if (open && shown()) { drawPicker(); load(); } }); });
  window.addEventListener('lk-clock', checkDay);
  window.addEventListener('focus', function () { if (shown()) checkDay(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && shown()) checkDay(); });
  window.addEventListener('beforeunload', function (event) { if (dirty() && !(window.LK_UPDATE && window.LK_UPDATE.letGo && window.LK_UPDATE.letGo())) { event.preventDefault(); event.returnValue = ''; } });
  window.LK_CLEANING = { api: 2, mount: mount, unmount: unmount, reset: reset, dirty: dirty, busy: busy, overlay: function () { return !!popup; } };
})();
