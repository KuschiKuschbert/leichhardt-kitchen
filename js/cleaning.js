/* Cleaning (8 Nov 2026, head chef): C's daily notebook and A's chef week sheet. Lazy on #/cleaning.
   Opening, choosing a week or Refresh requests one bounded range through the shared kitchen bridge. No polling,
   startup read, private persistent cache or guessed task schedule. See docs/cleaning-options/brief.md. */
(function () {
  'use strict';
  var P = window.LK_PREP, T = window.LK_TIME, B = P.book(), C = P.cleaning(), esc = window.LK_APP.esc;
  var OPEN = 253402178400000, DAYS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];
  var AREAS = ['Coldroom', 'Freezer', 'Dry store', 'Oven', 'Fryers', 'Behind equipment', 'Pass', 'Shelves'];
  var M = blank(), generation = 0, recorder = '', context = '', picker = null, popup = null, savedTimer = null, boundaryTimer = null;
  function blank() { return { root: null, view: 'today', today: T.day(), week: monday(T.day()), selected: T.day(), tasks: [], done: [], state: 'idle', error: '', readAt: 0, readAgain: false, cache: Object.create(null), range: '', pending: Object.create(null), tickErrors: Object.create(null), editor: false, draft: null, original: '', editId: '', saveBusy: false, saveState: '', saveError: '', savedText: '', archiveBusy: '', suspended: false }; }
  function shift(day, n) { return T.day(T.at(day) + n * 86400000 + 43200000); }
  function monday(day) { return shift(day, -((T.dow(T.at(day)) + 6) % 7)); }
  function dates() { return DAYS.map(function (_, i) { return shift(M.week, i); }); }
  function longDay(day) { var p = day.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }); }
  function shortDay(day) { var p = day.split('-'); return p[2].replace(/^0/, '') + '/' + p[1].replace(/^0/, ''); }
  function ink(text, state) { return window.LK_MOTION ? window.LK_MOTION.label(text, 'save', state || 'busy') : esc(text); }
  function loading() { return window.LK_MOTION ? window.LK_MOTION.status('Loading cleaning...', { icon: 'prep', state: 'busy', rows: 3 }) : '<p class="hint" role="status">Loading cleaning...</p>'; }
  function shown() { return !!(M.root && document.body.contains(M.root)); }
  function dirtyDraft() { return !!(M.draft && JSON.stringify(M.draft) !== M.original); }
  function dirty() { return dirtyDraft() || M.saveBusy || !!M.archiveBusy || Object.keys(M.pending).length > 0 || !!(picker && (picker.busy || picker.selected)); }
  function busy() { return M.saveBusy || !!M.archiveBusy || Object.keys(M.pending).length > 0; }
  function clearReads() { generation++; M.tasks = []; M.done = []; M.cache = Object.create(null); M.state = 'idle'; M.range = ''; M.error = ''; M.readAt = 0; }
  function reset() { var root = M.root; closePicker(true, true); clearTimeout(savedTimer); clearTimeout(boundaryTimer); if (C.discardAttempt) C.discardAttempt(); generation++; recorder = context = ''; M = blank(); M.root = root; }
  function access() {
    if (!C.allowed()) {
      var lock = B.workLock && B.workLock();
      if (recorder && lock && lock.identity === recorder) { if (!M.suspended) clearReads(); M.suspended = true; context = ''; closePicker(true, true); }
      else reset();
      return false;
    }
    var id = C.identity(); if (recorder && recorder !== id) reset(); recorder = id;
    var next = C.context(); if (M.suspended || context && context !== next) { clearReads(); closePicker(true, true); }
    M.suspended = false; context = next;
    if (C.permissionsReady() && !C.chef()) { M.view = 'today'; M.editor = false; M.draft = null; M.original = ''; }
    return true;
  }
  function range() { return M.view === 'week' && C.chef() ? [M.week, shift(M.week, 6)] : [T.day(), T.day()]; }
  function useData(data) { M.tasks = data.tasks; M.done = data.done; M.readAt = data.readAt; M.state = 'ok'; M.error = ''; }
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
  function due(task, day) { var at = T.at(day); return task.from <= at && at < task.until && task.dows.indexOf(T.dow(at)) >= 0; }
  function tasksOn(day) { return M.tasks.filter(function (task) { return due(task, day); }); }
  function record(task, day) { return M.done.filter(function (r) { return r.task === task.id && r.day === day; })[0] || null; }
  function taskById(id) { return M.tasks.filter(function (task) { return task.id === id; })[0]; }
  function occurrence(task, day) { return day + '_' + task.id; }
  function owner(task, day) {
    if (task.shared) return 'Shared kitchen';
    var section = C.sections().filter(function (s) { return s.id === task.section; })[0];
    return day < T.day() ? task.sectionName || section && section.name || 'Section to assign' : section && section.name || (task.sectionName ? task.sectionName + ' (reassign)' : 'Section to assign');
  }
  function groups(tasks, day) {
    var out = [], ids = [];
    tasks.forEach(function (task) { var id = task.shared ? '_shared' : task.section, i = ids.indexOf(id); if (i < 0) { ids.push(id); out.push({ name: owner(task, day), tasks: [] }); i = out.length - 1; } out[i].tasks.push(task); });
    return out.sort(function (a, b) { return a.name === 'Shared kitchen' ? 1 : b.name === 'Shared kitchen' ? -1 : a.name.localeCompare(b.name); });
  }
  function status(task, day) {
    var r = record(task, day), p = M.pending[occurrence(task, day)];
    return p ? 'Not sent' : r && r.done ? 'Done' : day < T.day() ? 'Missed' : day > T.day() ? 'Due' : 'To do';
  }
  function completionText(r) { return (r.worker || r.doneBy || 'Recorded') + ' · ' + T.clock(r.doneAt); }
  function canAct(task, day) { return day === T.day() && C.canTick() && due(task, day) && M.state === 'ok' && !M.pending[occurrence(task, day)] && !M.tickErrors[occurrence(task, day)]; }
  function row(task, day) {
    var r = record(task, day), key = occurrence(task, day), p = M.pending[key], complete = p ? !p.undo : !!(r && r.done), error = M.tickErrors[key];
    var can = canAct(task, day) && (!r || !r.done || C.canUndo(r)), state = status(task, day);
    var meta = task.area + ' · ' + (p ? 'Not sent' : r && r.done ? completionText(r) : day === T.day() ? 'To do today' : state);
    var label = (r && r.done ? C.canUndo(r) && day === T.day() ? 'Undo: ' : 'Done: ' : 'Mark done: ') + task.text + '. ' + meta;
    return '<li class="nb-row cln-row' + (complete ? ' is-done' : '') + (p ? ' is-pending' : '') + '" data-id="' + esc(task.id) + '" data-cln-row="' + esc(key) + '">' +
      '<button type="button" class="nb-box" data-cln="tick" data-id="' + esc(task.id) + '" data-day="' + esc(day) + '" aria-pressed="' + complete + '" aria-label="' + esc(label) + '"' + (can ? '' : ' disabled') + (p ? ' aria-busy="true"' : '') + '>' + C.box(complete) + '</button>' +
      '<div class="nb-main"><span class="nb-t">' + esc(task.text) + '</span><span class="nb-meta" title="' + esc(meta) + '">' + esc(meta) + '</span>' +
      (error ? '<span class="cln-row-error" role="alert">' + esc(error) + ' <button type="button" class="p-link" data-cln="refresh">Refresh</button></span>' : '') + '</div>' +
      (task.guide && P.featOn('guides') ? '<a class="nb-go cln-how" href="#/guides/' + encodeURIComponent(task.guide) + '" aria-label="How to: ' + esc(task.text) + '">How to</a>' : '') + '</li>';
  }
  function daily(day) {
    var tasks = tasksOn(day);
    if (!tasks.length) return '<div class="cln-empty"><p class="nb-empty">' + (M.tasks.length ? 'No cleaning tasks due on this day.' : 'No cleaning tasks set yet.') + '</p><p class="hint">' + (C.chef() ? 'Set the actual jobs, sections and repeat days below.' : 'Your chef can set the jobs and repeat days.') + '</p>' + (C.chef() ? '<button type="button" class="btn" data-cln="setup">Set repeat tasks</button>' : '') + '</div>';
    return groups(tasks, day).map(function (group, i) { var count = group.tasks.filter(function (t) { var r = record(t, day); return r && r.done; }).length;
      return '<section aria-labelledby="cln-group-' + i + '-' + day + '"><h3 class="nb-hd" id="cln-group-' + i + '-' + day + '"><span>' + esc(group.name) + '</span><span class="cln-group-count">' + count + '/' + group.tasks.length + '</span></h3><ul class="nb-rows">' + group.tasks.map(function (task) { return row(task, day); }).join('') + '</ul></section>';
    }).join('');
  }
  function matrix() {
    var week = dates(), tasks = M.tasks.filter(function (task) { return week.some(function (day) { return due(task, day); }); });
    if (!tasks.length) return '<div class="cln-wide-empty"><p class="nb-empty">No cleaning tasks due this week.</p><p class="hint">Set the actual jobs, sections and repeat days below.</p></div>';
    return '<div class="cln-matrix"><table><caption class="visually-hidden">Cleaning for the week of ' + esc(longDay(M.week)) + '. Only today can be ticked.</caption><thead><tr><th scope="col">Task / area</th>' + week.map(function (day, i) { return '<th scope="col"' + (day === T.day() ? ' class="is-today"' : '') + '>' + DAYS[i][1] + '<small>' + shortDay(day) + '</small></th>'; }).join('') + '</tr></thead>' +
      groups(tasks, M.week).map(function (group) { return '<tbody><tr class="cln-matrix-group"><th colspan="8" scope="rowgroup">' + esc(group.name) + '</th></tr>' + group.tasks.map(function (task) {
        return '<tr><th scope="row"><span class="cln-task-title">' + esc(task.text) + '</span><small>' + esc(task.area) + '</small></th>' + week.map(function (day) {
          if (!due(task, day)) return '<td><span class="cln-not-due" aria-label="Not due">·</span></td>';
          var r = record(task, day), p = M.pending[occurrence(task, day)], complete = p ? !p.undo : !!(r && r.done), state = status(task, day), act = canAct(task, day) && (!r || !r.done || C.canUndo(r));
          var title = task.text + ', ' + longDay(day) + ': ' + (r && r.done ? completionText(r) : state), inner = (complete ? C.box(true) : state === 'Missed' ? '<span class="cln-missed">Missed</span>' : state === 'Due' ? '<span class="cln-due">Due</span>' : C.box(false)) + '<small>' + esc(p ? 'Not sent' : r && r.done ? (r.worker || r.doneBy) : state === 'To do' ? 'To do' : '') + '</small>' + (!p && r && r.done ? '<small>' + esc(T.clock(r.doneAt)) + '</small>' : '');
          return '<td' + (day === T.day() ? ' class="is-today"' : '') + '>' + (act ? '<button type="button" class="cln-cell' + (complete ? ' is-done' : '') + '" data-cln="tick" data-id="' + esc(task.id) + '" data-day="' + esc(day) + '" aria-pressed="' + complete + '" aria-label="' + esc((complete ? 'Undo: ' : 'Mark done: ') + title) + '" title="' + esc(title) + '">' + inner + '</button>' : '<span class="cln-cell' + (complete ? ' is-done' : '') + '" title="' + esc(title) + '" aria-label="' + esc(title) + '">' + inner + '</span>') + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody>'; }).join('') + '</table></div>';
  }
  function weekly() {
    var days = dates();
    return '<div class="cln-week-nav"><button type="button" class="chip" data-cln="previous" aria-label="Previous week">‹</button><span>' + esc(shortDay(M.week) + ' to ' + shortDay(shift(M.week, 6))) + '</span><button type="button" class="chip" data-cln="next" aria-label="Next week">›</button><button type="button" class="p-link" data-cln="this-week">This week</button></div>' +
      '<p class="hint cln-legend">Tick = done · Missed = past and unticked · Due = later · Dot = not due</p>' +
      (Object.keys(M.tickErrors).length ? '<p class="p-err" role="alert">' + esc(Object.keys(M.tickErrors).map(function (key) { return M.tickErrors[key]; }).join(' ')) + ' Refresh to check the list.</p>' : '') +
      '<div class="cln-day-pick chips" role="group" aria-label="Day to view">' + days.map(function (day, i) { return '<button type="button" class="chip" data-cln="day" data-day="' + day + '" aria-pressed="' + (M.selected === day) + '">' + DAYS[i][1] + '<small>' + shortDay(day) + '</small></button>'; }).join('') + '</div>' +
      matrix() + '<div class="cln-week-day"><h3 class="cln-selected-day">' + esc(longDay(M.selected)) + '</h3>' + daily(M.selected) + '</div>';
  }
  function templateLabel(task) { return DAYS.filter(function (day) { return task.dows.indexOf(day[0]) >= 0; }).map(function (day) { return day[1]; }).join(', '); }
  function draftFor(task) { return { text: task ? task.text : '', area: task ? task.area : '', section: task ? task.section : '', shared: !!(task && task.shared), dows: task ? task.dows.slice() : [], guide: task ? task.guide || '' : '' }; }
  function saveButton() { var changed = dirtyDraft(), state = M.saveBusy ? 'busy' : M.saveState, text = state === 'busy' ? 'Saving...' : state === 'done' ? 'Saved' : state === 'error' ? 'Try again' : 'Save cleaning task'; return '<button type="submit" class="btn dark sv-btn" data-cln="save" data-idle="Save cleaning task" data-wide="Saving..."' + (state ? ' data-sv="' + state + '"' : '') + (M.saveBusy || !changed || M.state !== 'ok' || M.editId && !taskById(M.editId) ? ' disabled' : '') + (M.saveBusy ? ' aria-busy="true"' : '') + '><span class="sv-now">' + (state === 'busy' || state === 'done' ? ink(text, state === 'done' ? 'done' : 'busy') : text) + '</span></button>'; }
  function editor() {
    if (!C.chef() || !M.editor) return '';
    var current = M.tasks.filter(function (task) { return task.until === OPEN; }), d = M.draft, guides = C.guides();
    return '<section class="nb-page cln-plan" aria-labelledby="cln-plan-title"><header class="nb-ph"><div><h2 class="nb-title" id="cln-plan-title" tabindex="-1">Repeat tasks</h2><p class="nb-date">You set the jobs, the section responsible and the days.</p></div><button type="button" class="p-link" data-cln="hide-setup">Close</button></header><div class="cln-plan-body">' +
      '<p class="hint">New tasks start today. Changes and archiving start tomorrow. Earlier cleaning records stay as recorded.</p>' +
      (M.saveError && !d ? '<p class="p-err" role="alert">' + esc(M.saveError) + '</p>' : '') +
      '<ul class="cln-templates">' + current.map(function (task) { return '<li><div><b>' + esc(task.text) + '</b><small>' + esc(task.area + ' · ' + owner(task, T.day())) + '</small><small>' + esc(templateLabel(task)) + (task.from > T.at(T.day()) ? ' · Starts ' + esc(shortDay(T.day(task.from))) : '') + '</small></div><div class="cln-template-actions"><button type="button" class="p-link" data-cln="edit" data-id="' + esc(task.id) + '"' + (M.saveBusy || M.archiveBusy ? ' disabled' : '') + '>Edit</button><button type="button" class="p-link" data-cln="archive" data-id="' + esc(task.id) + '"' + (M.saveBusy || M.archiveBusy ? ' disabled' : '') + '>' + (M.archiveBusy === task.id ? ink('Archiving...') : B.armed && B.armed('cln-archive-' + task.id) ? 'Tap again to archive' : 'Archive') + '</button></div></li>'; }).join('') + '</ul>' +
      (!d ? '<button type="button" class="btn dark" data-cln="add"' + (M.state !== 'ok' || M.archiveBusy ? ' disabled' : '') + '>Add cleaning task</button>' : '<form id="cln-form" class="cln-form" novalidate><fieldset' + (M.saveBusy ? ' disabled' : '') + '><legend>' + (M.editId ? 'Edit cleaning task' : 'New cleaning task') + '</legend>' +
      '<label class="field" for="cln-text"><span class="label">What needs cleaning?</span><input id="cln-text" data-cln-field="text" type="text" maxlength="160" value="' + esc(d.text) + '" required></label>' +
      '<div class="cln-fields"><label class="field" for="cln-area"><span class="label">Area or equipment</span><input id="cln-area" data-cln-field="area" type="text" list="cln-areas" maxlength="80" value="' + esc(d.area) + '" required><datalist id="cln-areas">' + AREAS.map(function (area) { return '<option value="' + esc(area) + '">'; }).join('') + '</datalist></label>' +
      '<label class="field" for="cln-section"><span class="label">Responsible section</span><select id="cln-section" data-cln-field="section" required><option value="">Choose a section</option><option value="_shared"' + (d.shared ? ' selected' : '') + '>Shared kitchen</option>' + C.sections().map(function (s) { return '<option value="' + esc(s.id) + '"' + (!d.shared && d.section === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></label></div>' +
      '<div><span class="label" id="cln-repeat-label">Repeat on</span><div class="chips cln-repeat" role="group" aria-labelledby="cln-repeat-label">' + DAYS.map(function (day) { return '<button type="button" class="chip" data-cln="repeat" data-dow="' + day[0] + '" aria-pressed="' + (d.dows.indexOf(day[0]) >= 0) + '">' + day[1] + '</button>'; }).join('') + '</div></div>' +
      (P.featOn('guides') && (guides.length || d.guide) ? '<label class="field" for="cln-guide"><span class="label">How-to guide (optional)</span><select id="cln-guide" data-cln-field="guide"><option value="">No guide</option>' + (d.guide && !guides.some(function (g) { return g.id === d.guide; }) ? '<option value="' + esc(d.guide) + '" selected>Current linked guide</option>' : '') + guides.map(function (g) { return '<option value="' + esc(g.id) + '"' + (d.guide === g.id ? ' selected' : '') + '>' + esc(g.title) + '</option>'; }).join('') + '</select></label>' : '') + '</fieldset>' +
      '<p class="cln-save-note' + (M.saveError ? ' p-err' : ' hint') + '" role="' + (M.saveError ? 'alert' : 'status') + '">' + esc(M.saveError || (M.saveBusy ? 'Saving cleaning task. Not saved yet.' : M.savedText)) + '</p><div class="btn-row">' + saveButton() + '<button type="button" class="btn" data-cln="revert"' + (M.saveBusy || !dirtyDraft() ? ' disabled' : '') + '>Undo unsaved changes</button><button type="button" class="p-link" data-cln="cancel-edit"' + (M.saveBusy ? ' disabled' : '') + '>' + (B.armed && B.armed('cln-cancel') ? 'Tap again to discard' : 'Cancel') + '</button></div></form>') + '</div></section>';
  }
  function draw() {
    if (!shown()) return;
    if (!C.allowed()) { M.root.innerHTML = ''; return; }
    if (M.readAgain && !busy()) { M.readAgain = false; load(true); return; }
    var active = document.activeElement, field = active && active.getAttribute('data-cln-field'), action = active && M.root.contains(active) && active.getAttribute('data-cln'), id = action && (active.getAttribute('data-id') || active.getAttribute('data-day') || active.getAttribute('data-dow') || ''), pos = field && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;
    var today = tasksOn(T.day()), n = today.filter(function (task) { var r = record(task, T.day()); return r && r.done; }).length;
    var chef = C.chef(), week = chef && M.view === 'week';
    M.root.innerHTML = '<div class="nb-wrap cln-page">' + (chef ? '<div class="cln-toolbar"><div class="chips" role="group" aria-label="Cleaning view"><button type="button" class="chip" data-cln="today" aria-pressed="' + !week + '">Today</button><button type="button" class="chip" data-cln="week" aria-pressed="' + week + '">Week</button></div><button type="button" class="p-link" data-cln="setup" aria-expanded="' + M.editor + '" aria-controls="cln-plan-title">Set repeat tasks</button></div>' : '') +
      '<section class="nb-page cln-book" aria-labelledby="rtitle"><header class="nb-ph"><div><h2 class="nb-title" id="rtitle" tabindex="-1">Cleaning</h2><span class="nb-date">' + esc(week ? 'Week of ' + longDay(M.week) : longDay(T.day())) + '</span></div>' + (!week && M.state === 'ok' && today.length ? '<div class="nb-prog cln-progress">' + n + '/' + today.length + '<small>done today</small></div>' : '') + '</header>' +
      '<div class="cln-readline"><span class="hint">' + (M.state === 'ok' ? 'Checked ' + esc(T.clock(M.readAt)) : 'Today’s cleaning, with who and when') + '</span><button type="button" class="p-link" data-cln="refresh"' + (M.state === 'loading' || busy() ? ' disabled' : '') + '>Refresh</button></div>' +
      '<div class="nb-body cln-body">' + (M.state === 'error' ? '<p class="p-err" role="alert">' + esc(M.error) + '</p>' : M.state !== 'ok' ? loading() : week ? weekly() : daily(T.day())) + '</div></section>' + editor() + '</div>';
    if (busy()) Array.prototype.forEach.call(M.root.querySelectorAll('[data-cln="refresh"], [data-cln="today"], [data-cln="week"], [data-cln="previous"], [data-cln="next"], [data-cln="this-week"]'), function (button) { button.disabled = true; });
    if (window.LK_UX) window.LK_UX.enhance(M.root);
    if (field) { var el = M.root.querySelector('[data-cln-field="' + field + '"]'); if (el && !el.disabled) { el.focus({ preventScroll: true }); if (pos) el.setSelectionRange(pos[0], pos[1]); } }
    else if (action) { var button = Array.prototype.filter.call(M.root.querySelectorAll('[data-cln="' + action + '"]'), function (el) { return !id || (el.getAttribute('data-id') || el.getAttribute('data-day') || el.getAttribute('data-dow') || '') === id; })[0]; if (button && !button.disabled && button.getClientRects().length) button.focus({ preventScroll: true }); }
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
    M.editor = true; M.editId = task ? task.id : ''; M.draft = draftFor(task); M.original = JSON.stringify(M.draft); M.saveError = M.savedText = M.saveState = ''; draw();
    var field = M.root.querySelector('#cln-text'); if (field) field.focus();
  }
  function patchSave() {
    if (!shown()) return; var btn = M.root.querySelector('[data-cln="save"]'); if (btn) P.btnPatch(btn, saveButton());
    var revert = M.root.querySelector('[data-cln="revert"]'); if (revert) revert.disabled = M.saveBusy || !dirtyDraft();
    var note = M.root.querySelector('.cln-save-note'); if (note) { note.textContent = M.saveError || M.savedText; note.classList.toggle('p-err', !!M.saveError); note.setAttribute('role', M.saveError ? 'alert' : 'status'); }
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
    var d = M.draft, error = !d.text.trim() ? 'Write the cleaning task.' : !d.area.trim() ? 'Choose or write the area or equipment.' : !d.shared && !C.sections().some(function (s) { return s.id === d.section; }) ? 'Choose the responsible section.' : !d.dows.length ? 'Choose at least one repeat day.' : '';
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
    if (!force && old && shown()) { var next = M.root.querySelector('[data-cln="tick"][data-id="' + old.task.id + '"]'); if (next && !next.disabled) next.focus({ preventScroll: true }); }
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
  function openPicker(task, day) {
    if (picker || C.sheetBusy && C.sheetBusy() || !canAct(task, day)) return;
    picker = { task: task, day: day, identity: C.identity(), context: C.context(), selected: '', busy: false, error: '', failed: false, others: false };
    popup = document.createElement('div'); popup.id = 'cln-worker-sheet'; popup.innerHTML = '<div class="sheet-bg" data-cln-picker="cancel"></div><section class="sheet pt-sheet" role="dialog" aria-modal="true" aria-labelledby="cln-who-title" tabindex="-1"></section>'; document.body.appendChild(popup); B.ovPush('cleaning', pickerBack); document.documentElement.classList.add('sheet-open'); drawPicker();
    var first = popup.querySelector('[data-cln-person], button[data-cln-picker="cancel"]'); if (first) first.focus({ preventScroll: true });
  }
  function click(event) {
    var button = event.target.closest && event.target.closest('[data-cln]'); if (!button || !M.root || !M.root.contains(button) || button.disabled || !C.allowed()) return;
    if (checkDay()) { event.preventDefault(); return; }
    var action = button.getAttribute('data-cln'), id = button.getAttribute('data-id'), task = id && taskById(id); event.preventDefault();
    if (busy() && ['refresh', 'today', 'week', 'previous', 'next', 'this-week'].indexOf(action) >= 0) { P.toast('Wait for the cleaning change to save.'); return; }
    if (action === 'tick' && task) tick(task, button.getAttribute('data-day'));
    else if (action === 'refresh') load(true);
    else if (action === 'today' || action === 'week') { M.view = action === 'week' && C.chef() ? 'week' : 'today'; draw(); load(); }
    else if (C.chef() && (action === 'previous' || action === 'next' || action === 'this-week')) { M.week = action === 'this-week' ? monday(T.day()) : shift(M.week, action === 'previous' ? -7 : 7); M.selected = M.week <= T.day() && T.day() <= shift(M.week, 6) ? T.day() : M.week; draw(); load(); }
    else if (action === 'day' && C.chef()) { M.selected = button.getAttribute('data-day'); draw(); }
    else if (action === 'setup' && C.chef()) { M.editor = true; draw(); var heading = M.root.querySelector('#cln-plan-title'); if (heading) heading.focus(); }
    else if (action === 'hide-setup' && C.chef()) { if (dirtyDraft() || M.saveBusy) { M.saveError = 'Save or undo your unsaved changes before closing.'; draw(); } else { M.editor = false; draw(); } }
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
  function mount(root) { access(); M.root = root; checkDay(); draw(); load(); }
  function unmount() { closePicker(true, true); clearTimeout(boundaryTimer); M.root = null; generation++; if (M.state === 'loading') M.state = 'idle'; }
  document.addEventListener('click', click);
  document.addEventListener('input', function (event) { if (M.root && M.root.contains(event.target) && event.target.hasAttribute('data-cln-field')) changeField(event.target); });
  document.addEventListener('change', function (event) { if (M.root && M.root.contains(event.target) && event.target.hasAttribute('data-cln-field')) changeField(event.target); });
  document.addEventListener('submit', function (event) { if (event.target.id === 'cln-form') { event.preventDefault(); save(); } });
  document.addEventListener('click', function (event) {
    if (!popup || !popup.contains(event.target)) return; var button = event.target.closest('[data-cln-person], [data-cln-picker]'); if (!button || button.disabled) return; event.preventDefault();
    var action = button.getAttribute('data-cln-picker'), person = button.getAttribute('data-cln-person');
    if (action === 'cancel') closePicker();
    else if (action === 'others' && picker && !picker.busy) { picker.others = !picker.others; drawPicker(); var first = popup.querySelector('.cln-others button'); if (first) first.focus({ preventScroll: true }); }
    else if (action === 'refresh') { closePicker(); load(true); }
    else if (person && pickerValid() && !picker.busy && !picker.failed) tick(picker.task, picker.day, person);
  });
  document.addEventListener('keydown', function (event) { if (!popup) return; if (event.key === 'Escape') { event.preventDefault(); closePicker(); } if (event.key === 'Tab') { var pane = popup.querySelector('.pt-sheet'); if (picker.busy) { event.preventDefault(); pane.focus({ preventScroll: true }); } else B.trapTab(event, pane, 'button:not([disabled]), input:not([disabled])'); } });
  ['lk-access', 'lk-who', 'lk-admin', 'lk-cfg'].forEach(function (name) { window.addEventListener(name, function () { var open = access(); draw(); if (open && shown()) { drawPicker(); load(); } }); });
  window.addEventListener('lk-clock', checkDay);
  window.addEventListener('focus', function () { if (shown()) checkDay(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && shown()) checkDay(); });
  window.addEventListener('beforeunload', function (event) { if (dirty() && !(window.LK_UPDATE && window.LK_UPDATE.letGo && window.LK_UPDATE.letGo())) { event.preventDefault(); event.returnValue = ''; } });
  window.LK_CLEANING = { api: 1, mount: mount, unmount: unmount, reset: reset, dirty: dirty, busy: busy, overlay: function () { return !!popup; } };
})();
