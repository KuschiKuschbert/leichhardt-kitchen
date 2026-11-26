/* Cleaning: the staff daily notebook and the approved M1 chef groups and repeat-task editor. Lazy on #/cleaning.
   Opening, choosing a week or Refresh requests one bounded range through the shared kitchen bridge. No polling,
   startup read, private persistent cache or guessed task schedule. See docs/cleaning-options/brief.md. */
(function () {
  'use strict';
  var P = window.LK_PREP, T = window.LK_TIME, B = P.book(), C = P.cleaning(), esc = window.LK_APP.esc;
  // how a cleaning day reads (js/cleaning-core.js): loaded just before this page; shared with the nightly Records count
  var K = window.LK_CLEANING_CORE;
  var OPEN = 253402178400000, DAYS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];
  var AREAS = ['Coldroom', 'Freezer', 'Dry store', 'Oven', 'Fryers', 'Behind equipment', 'Pass', 'Shelves'];
  var M = blank(), generation = 0, recorder = '', context = '', picker = null, popup = null, savedTimer = null, boundaryTimer = null;
  function blank() { return { root: null, view: 'today', today: T.day(), week: monday(T.day()), selected: T.day(), tasks: [], done: [], state: 'idle', error: '', readAt: 0, readAgain: false, cache: Object.create(null), range: '', pending: Object.create(null), tickErrors: Object.create(null), editor: false, draft: null, original: '', editId: '', saveBusy: false, saveState: '', saveError: '', savedText: '', archiveBusy: '', suspended: false, expanded: Object.create(null), workDrafts: Object.create(null), flowErrors: Object.create(null), flowSaved: Object.create(null), importBusy: false, importError: '', importText: '', temperatureOpen: false, lead: null, leadStale: false, workGroup: '', workPage: 0, workQuery: '', workFilter: 'all', repeatPage: 0, repeatQuery: '', repeatGroup: 'all', plan: { state: 'idle', w: {}, k: {}, d: null, error: '' }, weights: false, wDraft: {}, kDraft: {}, wBusy: false, wError: '', wSaved: 0, wFilter: 'all', daysOpen: false, dDraft: null, dBusy: false, dError: '', dSaved: 0, staff: { state: 'idle' }, sug: null, sugNote: '', newW: 0, newK: '', addLoad: '' }; }
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
  function dirty() { return dirtyDraft() || weighDirty() || daysDirty() || sugDirty() || !!(M.sug && M.sug.saving) || M.wBusy || M.dBusy || M.saveBusy || M.importBusy || !!M.archiveBusy || Object.keys(M.pending).length > 0 || Object.keys(M.workDrafts).some(function (key) { return workDirty(M.workDrafts[key]); }) || !!(picker && (picker.busy || picker.selected)); }
  function busy() { return M.wBusy || M.dBusy || !!(M.sug && M.sug.saving) || M.saveBusy || M.importBusy || !!M.archiveBusy || Object.keys(M.pending).length > 0; }
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
    // The section the page opens on (25 Nov 2026): worked out when the list is read (open, Refresh, a save's reload), never
    // on a redraw, so the list cannot reorder under a thumb. An older book without the bridge gives none.
    M.lead = leadNow();
    if (M.view === 'setup' && C.chef()) loadPlan();
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
      M.state = 'error'; M.error = clnErrWords(error); draw();
      // a failed read tries once more by itself after 5 minutes or when the signal is back, whichever is first
      // (the consistency sweep, step 2, 20 Nov 2026); a refusal for size waits for a chef instead
      if (!error || error.code !== 'too-many') clnRetryArm(gen);
    });
  }
  /* The words for a failed cleaning read (the consistency sweep, step 2, 20 Nov 2026): never the database's own
     English, and No signal only when the signal is the cause, as the rest of the book (docs/design-patterns.md). */
  function clnErrWords(error) {
    var code = error && error.code;
    if (code === 'too-many') return 'Cleaning list is too large to show safely. Ask a chef to review the schedule.';
    if (navigator.onLine === false || code === 'unavailable' || code === 'deadline-exceeded') return 'No signal. Could not check the cleaning list.';
    return 'Could not load the cleaning list. Check the connection.';
  }
  var clnRetryT = 0, clnRetryOn = null;
  function clnRetryArm(gen) {
    clearTimeout(clnRetryT); if (clnRetryOn) window.removeEventListener('online', clnRetryOn);
    var go = function () { clearTimeout(clnRetryT); window.removeEventListener('online', clnRetryOn); clnRetryOn = null; if (gen === generation && M.state === 'error' && M.root && document.body.contains(M.root)) load(true); };
    clnRetryOn = function () { setTimeout(go, 1500); };
    clnRetryT = setTimeout(go, 5 * 60000); window.addEventListener('online', clnRetryOn);
  }
  // the failed-read line, the same on every page (js/prep.js readErr): Try again is the page's own Refresh
  function clnFailLine() { return window.LK_PREP && window.LK_PREP.readErr ? window.LK_PREP.readErr(M.error, null, 'data-cln="refresh"') : '<p class="p-err p-readerr" role="status">' + esc(M.error) + ' <button type="button" class="p-link" data-cln="refresh">Try again</button></p>'; }
  function due(task, day) { return C.due(task, day); }
  function tasksOn(day) { return M.tasks.filter(function (task) { return due(task, day); }); }
  function record(task, day) { return K.record(task, day, M.done); }
  function taskById(id) { return M.tasks.filter(function (task) { return task.id === id; })[0]; }
  function occurrence(task, day) { return day + '_' + task.id; }
  function hasPlan(task) { return !!(task && task.plan); }
  function flowKey(task, day, slot) { return occurrence(task, day) + '_' + slot; }
  // a planned job's checks that day (fixed, recorded, then unsaved drafts) and their counts: the shared core
  function flowList(task, day) { return K.slots(task, day, M.done, Object.keys(M.workDrafts).map(function (key) { return M.workDrafts[key]; })); }
  function flowRecord(task, day, slot) { var item = flowList(task, day).filter(function (entry) { return entry.slot === slot; })[0]; return item ? item.record : null; }
  function flowSummary(task, day) { return K.summary(task, flowList(task, day)); }
  function workTotals(tasks, day) {
    var total = 0, complete = 0, events = 0, awaiting = 0, blocked = 0;
    tasks.forEach(function (task) { if (hasPlan(task)) { var s = flowSummary(task, day); total += s.total; complete += s.complete; events += s.events ? 1 : 0; awaiting += s.awaiting; blocked += s.blocked; } else { total++; var r = record(task, day); if (r && r.done) complete++; } });
    return { total: total, complete: complete, events: events, awaiting: awaiting, blocked: blocked };
  }
  // the words for a planned job: the core's outcome, then Not sent, Due and To do from this phone and the day
  function flowState(task, day) {
    var s = flowSummary(task, day), outcome = K.outcome(s);
    if (M.pending[occurrence(task, day)]) return 'Not sent';
    if (outcome === 'blocked') return 'Unable to complete';
    if (outcome === 'awaiting') return 'Awaiting Pass check';
    if (outcome === 'done') return 'Done';
    if (day > T.day()) return 'Due';
    if (outcome === 'event') return s.complete + '/' + s.total + ' recorded; record each ' + (task.plan.timing === 'use' ? 'use' : task.plan.timing === 'service' ? 'service' : task.plan.timing === 'food' ? 'prep' : 'prep and service');
    return day < T.day() ? 'Missed' : 'To do';
  }
  function workDraft(task, day, item) {
    var key = flowKey(task, day, item.slot), d = M.workDrafts[key], r = item.record;
    if (!d) { var checked = r && r.flow ? r.flow.checked.slice() : [], note = r && r.flow ? r.flow.note : ''; d = M.workDrafts[key] = { task: task.id, day: day, slot: item.slot, kind: item.kind, checked: checked, note: note, original: JSON.stringify([checked, note]) }; }
    return d;
  }
  function flowLabel(item, index) { return { daily: 'Daily clean', start: 'Start of day', close: 'End of day', service: 'After service', prep: 'After prep', use: 'After use' }[item.kind] + (['service', 'prep', 'use'].indexOf(item.kind) >= 0 ? ' ' + (index + 1) : ''); }
  function workEnabled(task, day) { return day === T.day() && C.canTick() && M.state === 'ok' && due(task, day) && !M.pending[occurrence(task, day)]; }
  var FLOW_BUTTONS = {
    perform: { style: 'btn dark', label: 'Record done', pending: 'Recording...' },
    save: { style: 'p-link', label: 'Save checks', pending: 'Saving checks...' },
    block: { style: 'p-link', label: 'Unable to complete', pending: 'Saving reason...' },
    verify: { style: 'btn dark', label: 'Verify Pass check', pending: 'Saving Pass check...' },
    reopen: { style: 'p-link', label: 'Reopen with reason', pending: 'Reopening...' }
  };
  function flowWaiting(label, words) {
    return ' aria-busy="true" data-cln-ready-label="' + esc(label) + '"><span>' + esc(words) + '</span>';
  }
  function flowButton(action, attrs, enabled, waiting) {
    var button = FLOW_BUTTONS[action];
    return '<button type="button" class="' + button.style + '" data-cln="flow-' + action + '"' + attrs + (enabled ? '' : ' disabled') +
      (waiting === action ? flowWaiting(button.label, button.pending) : '>' + button.label) + '</button>';
  }
  function flowPanel(task, day, item, index) {
    var key = flowKey(task, day, item.slot), r = item.record, state = r && r.flow.status || 'pending', d = workDraft(task, day, item), enabled = workEnabled(task, day), editable = enabled && state !== 'complete' && state !== 'awaiting', pending = M.pending[occurrence(task, day)], checked = d.checked, all = task.plan.checks.every(function (label) { return checked.indexOf(label) >= 0; });
    var waiting = pending && pending.slot === item.slot ? pending.control : '';
    var attrs = ' data-id="' + esc(task.id) + '" data-day="' + esc(day) + '" data-slot="' + esc(item.slot) + '" data-kind="' + esc(item.kind) + '"';
    var verify = state === 'awaiting' && (C.canVerify ? C.canVerify(task) : task.plan.verifiers.indexOf(B.who()) >= 0 && C.canTick()) && (enabled || pending), statusText = { pending: 'Checks pending', blocked: 'Unable to complete', awaiting: 'Awaiting Pass check', complete: 'Complete' }[state];
    var reopen = enabled && (C.chef() || r && r.doneById === B.who() && r.doneAt > 0 && T.now() >= r.doneAt && T.now() - r.doneAt < 120000);
    var checker = r && r.flow.verifiedBy ? C.workers().filter(function (person) { return person.id === r.flow.verifiedBy; })[0] : null;
    return '<section class="cln-occurrence" data-cln-occurrence="' + esc(key) + '"><h4>' + esc(flowLabel(item, index)) + '<span>' + esc(waiting ? 'Not sent' : statusText) + '</span></h4>' +
      '<div class="cln-checks">' + task.plan.checks.map(function (label, n) { return '<label><input type="checkbox" data-cln-check="' + n + '"' + attrs + (checked.indexOf(label) >= 0 ? ' checked' : '') + (editable ? '' : ' disabled') + '><span>' + esc(label) + '</span></label>'; }).join('') + '</div>' +
      '<label class="field cln-work-note"><span class="label">' + (state === 'complete' || state === 'awaiting' ? 'Reason to reopen' : 'Note or reason unable to complete') + '</span><textarea data-cln-note' + attrs + ' maxlength="500" rows="2"' + (enabled ? '' : ' disabled') + '>' + esc(d.note) + '</textarea></label>' +
      (r && r.doneAt ? '<p class="hint cln-performer">Recorded by ' + esc(completionText(r)) + (r.flow.verifiedBy ? '. Pass check: ' + esc(checker ? checker.name : 'Recorded checker') + ' at ' + esc(T.clock(r.flow.verifiedAt)) : '') + '</p>' : '') +
      (task.plan.verification && !task.plan.verifiers.length ? '<p class="hint">Pass checker not set. A chef can choose the checker in Repeat tasks.</p>' : '') +
      (day === T.day() ? '<div class="btn-row cln-work-actions">' + (state === 'complete' || state === 'awaiting' ?
        (verify ? flowButton('verify', attrs, enabled, waiting) : '') + flowButton('reopen', attrs, reopen, waiting) :
        flowButton('perform', attrs, editable && all, waiting) + flowButton('save', attrs, editable && workDirty(d), waiting) + flowButton('block', attrs, editable, waiting)) +
        (workDirty(d) && !pending ? '<button type="button" class="p-link" data-cln="flow-discard"' + attrs + '>Undo unsaved checks</button>' : '') + '</div>' : '') +
      (M.flowErrors[key] ? '<p class="p-err" role="alert">' + esc(M.flowErrors[key]) + ' <button type="button" class="p-link" data-cln="refresh">Refresh to check</button></p>' : '') +
      (M.flowSaved[key] ? '<p class="lk-stamp" role="status">' + esc(M.flowSaved[key]) + '</p>' : '') + '</section>';
  }
  function planDetails(task, day) {
    var plan = task.plan, list = flowList(task, day), key = occurrence(task, day), kinds = plan.timing === 'service' ? ['service'] : plan.timing === 'prep-service' ? ['prep', 'service'] : plan.timing === 'food' ? ['prep'] : plan.timing === 'use' ? ['use'] : [];
    var waiting = M.pending[key], canAdd = workEnabled(task, day);
    return '<div class="cln-detail" id="cln-detail-' + esc(key) + '">' + (plan.method ? '<p class="cln-method"><b>Method</b> ' + esc(plan.method) + '</p>' : '') + '<p class="hint"><b>Responsible:</b> ' + esc(plan.responsibility) + '</p>' +
      (plan.review ? '<p class="cln-review"><b>Check the procedure:</b> ' + esc(plan.review) + '</p>' : '') +
      (kinds.length ? '<p class="hint">Record every ' + (plan.timing === 'prep-service' ? 'prep and service' : plan.timing === 'food' ? 'prep, plus opening and closing checks' : kinds[0]) + '. Counts cover recorded occurrences only.</p>' : '') +
      (task.guide && P.featOn('guides') ? '<a class="p-link cln-guide-link" href="#/guides/' + encodeURIComponent(task.guide) + '">How to: ' + esc(task.text) + '</a>' : '') +
      list.map(function (item, index) { return flowPanel(task, day, item, list.slice(0, index).filter(function (prior) { return prior.kind === item.kind; }).length); }).join('') +
      (day === T.day() && kinds.length ? '<div class="btn-row cln-add-occurrence">' + kinds.map(function (kind) {
        var adding = waiting && waiting.control === 'add' && waiting.kind === kind;
        return '<button type="button" class="btn" data-cln="flow-add" data-id="' + esc(task.id) + '" data-day="' + esc(day) + '" data-kind="' + kind + '"' +
          (canAdd ? '' : ' disabled') + (adding ? flowWaiting('Add ' + kind + ' clean', 'Adding ' + kind + ' clean...') : '>Add ' + kind + ' clean') + '</button>';
      }).join('') + '</div>' : '') + '</div>';
  }
  function planRow(task, day) {
    var key = occurrence(task, day), open = !!M.expanded[key], summary = flowSummary(task, day), completed = summary.done && flowList(task, day)[0].record, stateText = completed ? completionText(completed) : flowState(task, day), how = rhythm(task), meta = (how ? how + ' · ' : '') + task.area + (C.chef() && !task.shared ? ' · ' + owner(task, day) : '') + (task.plan.responsibility.toLowerCase() === task.area.toLowerCase() ? '' : ' · ' + task.plan.responsibility) + ' · ' + stateText, quick = !task.plan.checks.length && !task.plan.verification && !summary.events, slot = task.plan.timing === 'close' ? 'close' : 'daily', quickRecord = quick && flowRecord(task, day, slot), quickUndo = quickRecord && quickRecord.done && C.canUndo(quickRecord);
    var quickPending = quick && M.pending[key] && M.pending[key].control === 'quick';
    return '<li class="nb-row cln-row cln-plan-row' + (summary.done ? ' is-done' : '') + (M.pending[key] ? ' is-pending' : '') + '" data-id="' + esc(task.id) + '" data-cln-row="' + esc(key) + '">' +
      '<button type="button" class="nb-box" data-cln="' + (quick ? 'flow-quick' : 'details') + '" data-id="' + esc(task.id) + '" data-day="' + esc(day) + '"' + (quick ? ' data-slot="' + slot + '" data-kind="' + slot + '" aria-pressed="' + summary.done + '"' + (workEnabled(task, day) && (!summary.done || quickUndo) ? '' : ' disabled') : ' aria-expanded="' + open + '" aria-controls="cln-detail-' + esc(key) + '"') + (quickPending ? ' aria-busy="true"' : '') + ' aria-label="' + esc((quick ? summary.done ? quickUndo ? 'Undo: ' : 'Done: ' : 'Mark done: ' : open ? 'Close checks: ' : 'Open checks: ') + task.text + '. ' + flowState(task, day)) + '">' + C.box(summary.done) + '</button>' +
      '<button type="button" class="nb-main cln-task-detail" data-cln="details" data-id="' + esc(task.id) + '" data-day="' + esc(day) + '" aria-expanded="' + open + '" aria-controls="cln-detail-' + esc(key) + '" aria-label="' + esc((open ? 'Close checks and method: ' : 'Open checks and method: ') + task.text) + '"><span class="nb-t">' + esc(task.text) + '</span><span ' + metaAttrs(task) + ' title="' + esc(meta) + '">' + esc(meta) + '</span><span class="cln-detail-cue" aria-hidden="true">' + (open ? '▴' : '▾') + '</span></button>' + (open ? planDetails(task, day) : '') + '</li>';
  }
  function owner(task, day) {
    if (task.shared) return 'Shared kitchen';
    var section = C.sections().filter(function (s) { return s.id === task.section; })[0];
    return day < T.day() ? task.sectionName || section && section.name || 'Section to assign' : section && section.name || (task.sectionName ? task.sectionName + ' (reassign)' : 'Section to assign');
  }
  /* How often a job comes round, for its small line: nothing for a nightly job, "Every Monday" for one weekday, "Mon, Wed,
     Fri" for several, "Every 4 weeks" or "Every 2 days" for a repeat. templateLabel() below is the chef's setup line (every
     day listed, with the first date); this is the short form a cook reads on the row (25 Nov 2026). */
  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function rhythm(task) {
    var repeat = task.plan && task.plan.repeat, days = Array.isArray(task.dows) ? task.dows : [];
    if (repeat) return repeat.days % 7 ? 'Every ' + repeat.days + ' days' : repeat.days === 7 ? 'Every week' : 'Every ' + repeat.days / 7 + ' weeks';
    if (days.length >= 7 || !days.length) return '';
    if (days.length === 1) return 'Every ' + (DAY_NAMES[days[0]] || '');
    return DAYS.filter(function (day) { return days.indexOf(day[0]) >= 0; }).map(function (day) { return day[1]; }).join(', ');
  }
  /* The small line's class. A line that says how often may wrap, so its state is never cut off. The style repeats
     .cln-often from css/app.css on purpose: this page is lazy and can be newer than the saved stylesheet on a phone. */
  function metaAttrs(task) { return rhythm(task) ? 'class="nb-meta cln-often" style="white-space:normal;overflow:visible;text-overflow:clip"' : 'class="nb-meta"'; }
  function packSection(task) { var id = task.plan && task.plan.template || ''; return id.indexOf('pd-hot-') === 0 ? 'Hot larder' : id.indexOf('pd-grill-') === 0 ? 'Grill' : id.indexOf('pd-pans-') === 0 ? 'Pans' : ''; }
  var PACK_GROUPS = [['hot', 'Hot larder'], ['grill', 'Grill'], ['pans', 'Pans']];
  /* Which section the page opens on: the one this shared kitchen screen is set to (step 3, 26 Nov 2026), else the one this
     person is on today. own keeps the person's own section beside a screen's, for the words and the Pack down link. */
  function leadNow() {
    var own = C.section ? C.section() : null, screen = C.screenSection ? C.screenSection() : null;
    return screen ? { id: screen.id, name: screen.name, screen: true, own: own } : own;
  }
  /* What leads a cook's page that day, from the day's groups: the leading section (first), its groups (mine), the words
     beside its name (why), and on a station screen the Pack down group tied to the cook's own section when that is
     another one (mate: Go to Pack down names that group and goes there). The order comes from what was fixed when the
     list was read (M.lead); the words and the link follow the cook's section as it is now, since they move nothing.
     A screen's section with no cleaning that day, or one since taken off the kitchen's list, gives way to the cook's
     own, as on a screen with none set. No section, or no work for it: no first, and the page keeps its usual order. */
  function leadPlan(grouped) {
    var live = function (x) { return !!x && C.sections().some(function (section) { return section.id === x.id; }); };
    var has = function (x) { return grouped.filter(function (group) { return (group.own || group.pack) && group.sec === x.id; }); };
    var lead = C.chef() ? null : M.lead, first = live(lead) ? lead : null, mine = first ? has(first) : [], why = 'Your section today', mate = null;
    if (first && first.screen && mine.length) {
      var mateNow = C.section ? C.section() : null;
      if (live(mateNow) && mateNow.id !== first.id) { why = 'This screen. You are on ' + mateNow.name + ' today'; mate = grouped.filter(function (group) { return group.pack && group.sec === mateNow.id; })[0] || null; }
      else why = 'This screen';
    } else if (lead && lead.screen && live(lead.own) && lead.own.id !== lead.id) { first = lead.own; mine = has(first); }
    return { first: mine.length ? first : null, mine: mine, why: why, mate: mate };
  }
  /* Which kitchen section a Pack down group belongs to (25 Nov 2026, step 2, docs/cleaning-schedule.md). Never by name: it
     is the section a chef chose for that group's section cleaning jobs at Load (the sc-hot-, sc-grill- and sc-pans- jobs),
     and only while every one of those jobs in force that day is saved to the same live section. One job moved, the group
     left on Shared kitchen, or the section removed: no link, and Pack down stays where it was. No read: the loaded tasks. */
  function packLinks(day) {
    var at = T.at(day), live = C.sections().map(function (section) { return section.id; }), out = {};
    PACK_GROUPS.forEach(function (group) {
      var ids = M.tasks.filter(function (task) { return task.from <= at && task.until > at && task.plan && String(task.plan.template || '').indexOf('sc-' + group[0] + '-') === 0; }).map(function (task) { return task.shared ? '' : task.section; });
      if (ids.length && ids[0] && live.indexOf(ids[0]) >= 0 && ids.every(function (id) { return id === ids[0]; })) out[group[1]] = ids[0];
    });
    return out;
  }
  function groups(tasks, day) {
    var out = [], ids = [], pack = tasks.filter(function (task) { return !!packSection(task); }), floors = [], links = packLinks(day);
    tasks.forEach(function (task) { if (packSection(task)) return; if (pack.length && task.plan && task.plan.template === 'c03') { floors.push(task); return; } var id = task.shared ? '_shared' : task.section, i = ids.indexOf(id); if (i < 0) { ids.push(id); out.push({ name: owner(task, day), own: !task.shared, sec: task.shared ? '' : task.section, tasks: [] }); i = out.length - 1; } out[i].tasks.push(task); });
    out.sort(function (a, b) { return a.name === 'Shared kitchen' ? 1 : b.name === 'Shared kitchen' ? -1 : a.name.localeCompare(b.name); });
    PACK_GROUPS.forEach(function (info) {
      var name = info[1], list = pack.filter(function (task) { return packSection(task) === name; }).sort(function (a, b) { return a.plan.template.localeCompare(b.plan.template); });
      if (!list.length) return;
      /* One place per job, whoever is looking: a section's own nightly jobs follow its Pack down steps (so the kick oven
         door is wiped after the oven is turned off), and its section clean keeps the jobs that come round. Only where the
         group is tied to that section; otherwise they stay under the section's own heading. */
      var sec = links[name] || '', own = sec && out.filter(function (group) { return group.own && group.sec === sec; })[0];
      if (own) { list = list.concat(own.tasks.filter(function (task) { return !rhythm(task); })); own.tasks = own.tasks.filter(function (task) { return !!rhythm(task); }); if (!own.tasks.length) out.splice(out.indexOf(own), 1); }
      out.push({ name: name, pack: true, sec: sec, tasks: list });
    });
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
    var how = rhythm(task), meta = (how ? how + ' · ' : '') + task.area + (C.chef() ? ' · ' + owner(task, day) : '') + ' · ' + (p ? 'Not sent' : r && r.done ? completionText(r) : day === T.day() ? 'To do today' : state);
    var label = (r && r.done ? C.canUndo(r) && day === T.day() ? 'Undo: ' : 'Done: ' : 'Mark done: ') + task.text + '. ' + meta;
    return '<li class="nb-row cln-row' + (complete ? ' is-done' : '') + (p ? ' is-pending' : '') + '" data-id="' + esc(task.id) + '" data-cln-row="' + esc(key) + '">' +
      '<button type="button" class="nb-box" data-cln="tick" data-id="' + esc(task.id) + '" data-day="' + esc(day) + '" aria-pressed="' + complete + '" aria-label="' + esc(label) + '"' + (can ? '' : ' disabled') + (p ? ' aria-busy="true"' : '') + '>' + C.box(complete) + '</button>' +
      '<div class="nb-main"><span class="nb-t">' + esc(task.text) + '</span><span ' + metaAttrs(task) + ' title="' + esc(meta) + '">' + esc(meta) + '</span>' +
      (error ? '<span class="cln-row-error" role="alert">' + esc(error) + ' <button type="button" class="p-link" data-cln="refresh">Refresh</button></span>' : '') + '</div>' +
      (task.guide && P.featOn('guides') ? '<a class="nb-go cln-how" href="#/guides/' + encodeURIComponent(task.guide) + '" aria-label="How to: ' + esc(task.text) + '">How to</a>' : '') + '</li>';
  }
  // grouped and plan: the day's groups and what leads, when draw() has already worked them out for the read line
  function daily(day, grouped, plan) {
    var tasks = tasksOn(day);
    if (!tasks.length) return '<div class="cln-empty"><p class="nb-empty">' + (M.tasks.length ? 'No cleaning tasks due on this day.' : 'No cleaning tasks set yet.') + '</p><p class="hint">' + (C.chef() ? 'Set the actual jobs, sections and repeat days in Repeat tasks.' : 'Your chef can set the jobs and repeat days.') + '</p>' + (C.chef() ? '<button type="button" class="btn" data-cln="setup">Set repeat tasks</button>' : '') + '</div>';
    var jump = 'cln-packdown-' + day, jumped = false;
    grouped = grouped || groups(tasks, day); plan = plan || leadPlan(grouped);
    // one group: its heading, its count and its rows. title is the heading's words; the first Pack down heading takes the
    // id that Go to Pack down moves to when there is no one Pack down block (the leading section's layout)
    function groupHTML(group, i, title, tag, note) {
      var count = workTotals(group.tasks, day), heading = tag || (group.pack ? 'h4' : 'h3'), id = 'cln-group-' + i + '-' + day;
      if (note !== undefined && group.pack && !jumped && (!plan.mate || group === plan.mate)) { jumped = true; id = jump; }
      return '<section' + (group.pack ? ' class="cln-packdown-group" data-cln-packdown-group="' + esc(group.name) + '"' : '') + ' aria-labelledby="' + id + '"><' + heading + ' class="nb-hd" id="' + id + '"' + (id === jump ? ' tabindex="-1"' : '') + '><span>' + esc(title || group.name + (group.own ? ': section clean' : '')) + '</span><span class="cln-group-count">' + count.complete + '/' + count.total + (count.events ? ' + repeats' : '') + '</span></' + heading + '>' + (note ? '<p class="hint">' + esc(note) + '</p>' : '') + '<ul class="nb-rows">' + group.tasks.map(function (task) { return row(task, day); }).join('') + '</ul></section>';
    }
    /* Your section first (head chef, 25 Nov 2026, design D): the page opens on the section this person is on today, with
       its section clean and then its Pack down. Shared kitchen follows, then the rest of the kitchen, all open; floors stay
       last. For a cook only, and only when that section has work today: a chef, a cook with no section and a section with
       no cleaning list keep the page's usual order below. */
    var lead = plan.first, mine = plan.mine;
    if (lead) {
      var at = function (group) { return grouped.indexOf(group); }, html = '<section class="cln-mine" aria-labelledby="cln-mine-' + day + '"><h3 class="cln-mine-title" id="cln-mine-' + day + '"><span>' + esc(lead.name) + '</span><small>' + esc(plan.why) + '</small></h3>';
      mine.filter(function (group) { return group.own; }).forEach(function (group) { html += groupHTML(group, at(group), 'Section clean', 'h4', ''); });
      mine.filter(function (group) { return group.pack; }).forEach(function (group) { html += groupHTML(group, at(group), 'Pack down', 'h4', 'Overhead shelves and frames first. Floors are last.'); });
      html += '</section>';
      grouped.filter(function (group) { return !group.own && !group.pack && !group.floors; }).forEach(function (group) { html += groupHTML(group, at(group)); });
      // the rest: each Pack down group in its usual order with its own section's clean above it, then any other section
      var rest = [], others = grouped.filter(function (group) { return mine.indexOf(group) < 0 && (group.own || group.pack); });
      others.filter(function (group) { return group.pack; }).forEach(function (group) { var own = group.sec && others.filter(function (other) { return other.own && other.sec === group.sec; })[0]; if (own) rest.push(own); rest.push(group); });
      others.forEach(function (group) { if (rest.indexOf(group) < 0) rest.push(group); });
      if (rest.length) html += '<h3 class="cln-rest-title">Rest of the kitchen</h3>' + rest.map(function (group) { return groupHTML(group, at(group), group.name + (group.pack ? ': pack down' : ': section clean'), 'h4', ''); }).join('');
      return html + grouped.filter(function (group) { return group.floors; }).map(function (group) { return groupHTML(group, at(group)); }).join('');
    }
    var regular = '', pack = '', floors = '';
    grouped.forEach(function (group, i) { var html = groupHTML(group, i); if (group.pack) pack += html; else if (group.floors) floors += html; else regular += html; });
    return regular + (pack ? '<section class="cln-packdown" aria-labelledby="cln-packdown-' + day + '"><h3 class="cln-packdown-title" id="cln-packdown-' + day + '" tabindex="-1">Pack down</h3><p class="hint">Finish overhead shelves and frames before the final floor clean. Keep each after-service floor check separate.' + (floors ? ' Floor checks follow this list.' : '') + '</p>' + pack + '</section>' : '') + floors;
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
    var tasks = tasksOn(day), grouped = chefGroups(tasks), active = M.workQuery.trim() || M.workFilter !== 'all', html = firstDateNotice() + attention(tasks, day) + workSearch(), notices = workNotices(tasks, day);
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
    // the ‹ and › are the book's step chips, as on Prep's day control (the consistency sweep, step 3, 20 Nov 2026)
    return '<div class="cln-week-nav"><button type="button" class="chip nav-step" data-cln="previous" aria-label="Previous week">‹</button><span>' + esc('Week commencing ' + shortDay(M.week)) + '</span><button type="button" class="chip nav-step" data-cln="next" aria-label="Next week">›</button><button type="button" class="p-link" data-cln="this-week">This week</button></div>' +
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
      (M.importError ? '<p class="p-err" role="alert">' + esc(M.importError) + '</p>' : '') + (M.importText ? '<p class="lk-stamp" role="status">' + esc(M.importText) + '</p>' : '') + '</details>' + packImportPanel() + sectionImportPanel();
  }
  function packImportPanel() {
    var source = window.LK_CLEANING_SCHEDULE;
    if (!source || !source.packDownDrafts || !C.importTasks) return '';
    return '<details class="cln-import cln-pack-import"' + (M.packImportOpen ? ' open' : '') + '><summary>Pack down: Hot larder, Grill and Pans</summary><p class="hint">Load ' + source.packDown.length + ' ordered pack down tasks. Review methods and responsibility in Repeat tasks. Existing tasks and completed records stay as recorded.</p><p class="hint">Clean overhead shelves and frames before the final floor clean. Review repeat intervals and their first due date in Repeat tasks.</p><button type="button" class="btn" data-cln="import-packdown"' + (busy() || dirtyDraft() || M.state !== 'ok' ? ' disabled' : '') + '>' + (M.importBusy && M.importKind === 'packdown' ? 'Loading pack down...' : 'Load pack down schedule') + '</button>' + (M.packImportError ? '<p class="p-err" role="alert">' + esc(M.packImportError) + '</p>' : '') + (M.packImportText ? '<p class="lk-stamp" role="status">' + esc(M.packImportText) + '</p>' : '') + '</details>';
  }
  /* Section cleaning (25 Nov 2026): the head chef's own jobs for each section. The chef says which kitchen section each
     group belongs to. The section with the same name is offered first and can be changed; a group left on Shared kitchen
     loads as shared. The choice is by section id, never by matching names later. */
  function sectionChoice(group) {
    var chosen = M.importSections && M.importSections[group.id], sections = C.sections();
    if (chosen !== undefined) return chosen === '_shared' || sections.some(function (s) { return s.id === chosen; }) ? chosen : '_shared';
    var same = sections.filter(function (s) { return String(s.name).trim().toLowerCase() === group.name.toLowerCase(); })[0];
    return same ? same.id : '_shared';
  }
  // Setup says which section each Pack down opens with for a cook on that section, and when one is not tied (packLinks())
  function packLinkLine() {
    if (!M.tasks.some(function (task) { return task.until === OPEN && task.plan && /^sc-(hot|grill|pans)-/.test(task.plan.template || ''); })) return '';
    var links = packLinks(T.day()), sections = C.sections();
    return '<p class="hint cln-pack-links">' + PACK_GROUPS.map(function (group) {
      var section = sections.filter(function (item) { return item.id === links[group[1]]; })[0];
      return esc(group[1]) + ' pack down ' + (section ? 'opens with ' + esc(section.name) : 'is not tied to a section');
    }).join('. ') + '. A Pack down is tied to a section only while all of that group\'s loaded jobs are in that one section.</p>';
  }
  function sectionImportPanel() {
    var source = window.LK_CLEANING_SCHEDULE;
    if (!source || !source.sectionDrafts || !C.importTasks) return '';
    var sections = C.sections(), monthly = source.sectionClean.filter(function (entry) { return entry.plan.repeat; }).length;
    return '<details class="cln-import cln-section-import"' + (M.sectionImportOpen ? ' open' : '') + '><summary>Section cleaning: ' + source.sectionClean.length + ' jobs</summary>' +
      '<p class="hint">Load the weekly, monthly and extra daily jobs for each section. Jobs already in Pack down are not in this list. Each job is one tap and comes up on its own days. Loading it again adds only missing jobs.</p>' +
      '<p class="hint">Choose the kitchen section each group belongs to. A group left on Shared kitchen is listed under Shared kitchen.</p><div class="cln-fields">' +
      source.sectionGroups.map(function (group) {
        var chosen = sectionChoice(group);
        return '<label class="field" for="cln-import-section-' + group.id + '"><span class="label">' + esc(group.name) + '</span><select id="cln-import-section-' + group.id + '" data-cln-import-section="' + group.id + '"' + (M.importBusy ? ' disabled' : '') + '><option value="_shared"' + (chosen === '_shared' ? ' selected' : '') + '>Shared kitchen</option>' +
          sections.map(function (s) { return '<option value="' + esc(s.id) + '"' + (chosen === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></label>';
      }).join('') + '</div>' + packLinkLine() + '<p class="hint">' + monthly + ' monthly jobs repeat every 4 weeks. They come up only after a chef sets their first date in Repeat tasks.</p>' +
      '<button type="button" class="btn" data-cln="import-section"' + (busy() || dirtyDraft() || M.state !== 'ok' ? ' disabled' : '') + '>' + (M.importBusy && M.importKind === 'section' ? 'Loading section cleaning...' : 'Load section cleaning') + '</button>' +
      (M.sectionImportError ? '<p class="p-err" role="alert">' + esc(M.sectionImportError) + '</p>' : '') + (M.sectionImportText ? '<p class="lk-stamp" role="status">' + esc(M.sectionImportText) + '</p>' : '') + '</details>';
  }
  /* A repeat job with no first date is never due and never counted, so a chef is told and taken to its date (25 Nov 2026). */
  function needFirstDate() { return M.tasks.filter(function (task) { return task.until === OPEN && task.plan && task.plan.repeat && !task.plan.repeat.anchor; }); }
  function firstDateNotice() {
    var list = C.chef() && M.state === 'ok' ? needFirstDate() : [];
    if (!list.length) return '';
    return '<div class="cln-attention cln-first-date" role="status"><b>' + list.length + (list.length === 1 ? ' repeat job needs' : ' repeat jobs need') + ' a first date</b><span class="hint">Not due until a chef sets it. Choose tomorrow or later: changes start tomorrow.</span>' +
      list.slice(0, 6).map(function (task) { return '<button type="button" class="p-link" data-cln="first-date" data-id="' + esc(task.id) + '">' + esc(task.text) + '</button>'; }).join('') + '</div>';
  }
  function earlierDrafts() { return Object.keys(M.workDrafts).filter(function (key) { return M.workDrafts[key].day < T.day() && workDirty(M.workDrafts[key]); }); }
  function earlierNotice() {
    if (!earlierDrafts().length) return M.earlierCleared ? '<p class="lk-stamp cln-earlier-status" role="status" tabindex="-1">' + esc(M.earlierCleared) + '</p>' : '';
    return '<div class="cln-earlier" role="status"><p class="hint">Unsaved cleaning checks from an earlier date are still kept on this screen. They have not been recorded or backdated.</p><button type="button" class="p-link' + (B.armed && B.armed('cln-discard-earlier') ? ' lk-del' : '') + '" data-cln="discard-earlier">' + (B.armed && B.armed('cln-discard-earlier') ? 'Tap again to undo earlier checks' : 'Undo earlier unsaved checks') + '</button></div>';
  }
  function saveButton() { var changed = dirtyDraft(), state = M.saveBusy ? 'busy' : M.saveState, text = state === 'busy' ? 'Saving...' : state === 'done' ? 'Saved' : state === 'error' ? 'Try again' : 'Save cleaning task'; return '<button type="submit" class="btn dark sv-btn" data-cln="save" data-idle="Save cleaning task" data-wide="Saving..."' + (state ? ' data-sv="' + state + '"' : '') + (M.saveBusy || !changed || M.state !== 'ok' || M.editId && !taskById(M.editId) ? ' disabled' : '') + (M.saveBusy ? ' aria-busy="true"' : '') + '><span class="sv-now">' + (state === 'busy' || state === 'done' ? ink(text, state === 'done' ? 'done' : 'busy') : text) + '</span></button>'; }
  function editorForm() {
    var d = M.draft, guides = C.guides(); if (!d) return '';
    return '<form id="cln-form" class="cln-form" novalidate><fieldset' + (M.saveBusy ? ' disabled' : '') + '><legend>' + (M.editId ? 'Edit cleaning task' : 'New cleaning task') + '</legend>' +
      '<label class="field" for="cln-text"><span class="label">What needs cleaning?</span><input id="cln-text" data-cln-field="text" type="text" maxlength="160" value="' + esc(d.text) + '" required></label>' +
      '<div class="cln-fields"><label class="field" for="cln-area"><span class="label">Area or equipment</span><input id="cln-area" data-cln-field="area" type="text" list="cln-areas" maxlength="80" value="' + esc(d.area) + '" required><datalist id="cln-areas">' + AREAS.map(function (area) { return '<option value="' + esc(area) + '">'; }).join('') + '</datalist></label>' +
      '<label class="field" for="cln-section"><span class="label">Responsible section</span><select id="cln-section" data-cln-field="section" required><option value="">Choose a section</option><option value="_shared"' + (d.shared ? ' selected' : '') + '>Shared kitchen</option>' + C.sections().map(function (s) { return '<option value="' + esc(s.id) + '"' + (!d.shared && d.section === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></label></div>' +
      addDayBlock(d) +
      planEditor(d) + (P.featOn('guides') && (guides.length || d.guide) ? '<label class="field" for="cln-guide"><span class="label">How-to guide (optional)</span><select id="cln-guide" data-cln-field="guide"><option value="">No guide</option>' + (d.guide && !guides.some(function (g) { return g.id === d.guide; }) ? '<option value="' + esc(d.guide) + '" selected>Current linked guide</option>' : '') + guides.map(function (g) { return '<option value="' + esc(g.id) + '"' + (d.guide === g.id ? ' selected' : '') + '>' + esc(g.title) + '</option>'; }).join('') + '</select></label>' : '') + '</fieldset>' +
      '<p class="cln-save-note' + (M.saveError ? ' p-err' : ' hint') + '" role="' + (M.saveError ? 'alert' : 'status') + '">' + esc(M.saveError || (M.saveBusy ? 'Saving cleaning task. Not saved yet.' : M.savedText)) + '</p><div class="btn-row">' + saveButton() + '<button type="button" class="btn" data-cln="revert"' + (M.saveBusy || !dirtyDraft() ? ' disabled' : '') + '>Undo unsaved changes</button><button type="button" class="p-link' + (B.armed && B.armed('cln-cancel') ? ' lk-del' : '') + '" data-cln="cancel-edit"' + (M.saveBusy ? ' disabled' : '') + '>' + (B.armed && B.armed('cln-cancel') ? 'Tap again to discard' : 'Cancel') + '</button></div></form>';
  }
  function repeatTasks() { return chefGroups(M.tasks.filter(function (task) { return task.until === OPEN; })).reduce(function (list, group) { return list.concat(group.tasks); }, []); }
  function repeatMatches() { return repeatTasks().filter(function (task) { return (M.repeatQuery.trim() || M.repeatGroup === 'all' || chefGroupId(task) === M.repeatGroup) && matchesWords(task, M.repeatQuery, T.day()); }); }
  function editorBlock(outside) { return '<div class="cln-editor">' + (outside ? '<p class="hint cln-editor-context">Your selected task is outside this search or page. Its changes are kept here.</p>' : '') + '<h3 class="cln-editor-title">' + esc(M.editId ? M.draft.text || 'Edit cleaning task' : 'New cleaning task') + '</h3>' + editorForm() + '</div>'; }
  /* A new job's day (head chef, 26 Nov 2026, results by section, step 4c; docs/cleaning-schedule.md, A new job's day).
     Only in the Add form and only once Cleaning is on for the team: the council chose no offers on a job that already
     has a day (m5), and while Cleaning is off Suggest the days does it in bulk. The chef gives the weight (and a kind);
     the planner (js/cleaning-plan.js, lazy) suggests a day from the saved weights, kinds and what each day takes. The
     suggestion is a default the chef sees and presses, never saved on its own (c3: no day is chosen until pressed). A
     new job starts the day it is saved, so today's chip says so: pressed, the job is due at tonight's close. The weight
     saves in the job's own batch (cleaningSave in js/prep.js). No reads: the weights are the ones read with Repeat tasks. */
  function addOn() { return !!(M.draft && !M.editId && !M.draft.plan && C.chef() && teamOn() === true); }
  function addPlanner() {
    var Pl = window.LK_CLEANING_PLAN; if (Pl && Pl.api === 1) return Pl;
    if (M.addLoad) return null;   // loading, or failed until Try again
    var model = M; M.addLoad = 'loading';
    window.LK_APP.load('js/cleaning-plan.js?v=1').then(function () { if (M !== model) return; M.addLoad = window.LK_CLEANING_PLAN && window.LK_CLEANING_PLAN.api === 1 ? '' : 'error'; patchAddDay(); },
      function () { if (M !== model) return; M.addLoad = 'error'; patchAddDay(); });
    return null;
  }
  function addSecName(d) { var sec = C.sections().filter(function (x) { return x.id === d.section; })[0]; return d.shared ? '' : sec ? sec.name : null; }
  // the section's points each night before this job (light 1, medium 2, heavy 3; no weight counts medium), and the
  // suggestion for the new job: two runs of the pure planner over the jobs already in memory
  function addPlan(d) {
    var Pl = window.LK_CLEANING_PLAN, name = addSecName(d);
    if (!Pl || Pl.api !== 1 || M.plan.state !== 'ok' || name === null || d.dows.length >= 7) return null;
    var lv = M.plan.d || LEVEL_DEFAULT, opts = { level: lv, order: 'fewest', even: false, only: 'new', needWeight: true, twoHeavy: true, cap: 5 };
    var jobs = function () { return Pl.jobsFrom(weighJobs(), { w: M.plan.w, k: M.plan.k, key: jobKey, sec: function (task) { return task.shared ? '' : owner(task, T.day()); }, clock: sugClock() }); };
    var base = Pl.plan(jobs(), opts), has = name ? (base.load.sections[name] || [0, 0, 0, 0, 0, 0, 0]).slice() : null, out = { has: has, name: name };
    if (!M.newW || d.dows.length > 3) return out;
    var list = jobs(), job = { id: '_new', key: '_new', text: d.text, sec: name, kind: M.newK, w: M.newW, per: Math.max(1, d.dows.length), days: [], every: 0, move: true };
    list.push(job);
    var r = Pl.plan(list, opts), why = r.why._new || '';
    out.noFit = /No day fits/.test(why) || !(r.days._new || []).length;
    out.days = out.noFit ? [] : r.days._new.slice().sort(function (a, b) { return DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b); });
    out.why = why; out.heaviest = (r.heaviest || []).indexOf('_new') >= 0;
    // c3: name the sections that clean the same kind that night ("Hot larder cleans its fridges on a Monday too")
    out.mates = M.newK && out.days.length ? list.filter(function (j) { return j.id !== '_new' && j.kind === M.newK && j.sec && j.sec !== name && (r.days[j.id] || j.days || []).indexOf(out.days[0]) >= 0; }).map(function (j) { return j.sec; }).filter(function (x, i, a) { return a.indexOf(x) === i; }) : [];
    return out;
  }
  function addTag(dow, p, lv, today) {
    if (p && p.days && p.days.indexOf(dow) >= 0) return 'suggested';
    if (dow === today) return 'today';
    if (lv[dow] === 1) return 'light only';
    return p && p.has ? 'has ' + p.has[dow] : '';
  }
  function levelWords(lv) {
    var at = function (n) { return DAY_ORDER.filter(function (d) { return lv[d] === n; }).map(function (d) { return DAY_NAME[d]; }); }, light = at(1), mid = at(2), and = function (a) { return a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : a[0]; };
    return (light.length ? and(light) + (light.length > 1 ? ' take' : ' takes') + ' light jobs only. ' : '') + (mid.length ? and(mid) + (mid.length > 1 ? ' take' : ' takes') + ' up to medium. ' : '');
  }
  function addDayBlock(d) {
    var on = addOn(), p = null, lv = M.plan.d || LEVEL_DEFAULT, today = T.dow(T.at(T.day()));
    if (on && M.plan.state === 'ok' && addPlanner()) p = addPlan(d);
    var chips = DAYS.map(function (day) {
      var tag = on ? addTag(day[0], p, lv, today) : '';
      return '<button type="button" class="chip' + (on ? ' cln-day-chip' : '') + '" data-cln="repeat" data-dow="' + day[0] + '" aria-pressed="' + (d.dows.indexOf(day[0]) >= 0) + '"' + (M.saveBusy ? ' disabled' : '') + '>' + (on ? '<span>' + day[1] + '</span><small>' + esc(tag || ' ') + '</small>' : day[1]) + '</button>';
    }).join('');
    return '<div class="cln-add-day"><div><span class="label" id="cln-repeat-label">Repeat on</span><div class="chips cln-repeat" role="group" aria-labelledby="cln-repeat-label">' + chips + '</div></div>' + (on ? addDayMore(d, p, lv, today) : '') + '</div>';
  }
  function addDayMore(d, p, lv, today) {
    var n = d.dows.length, todayName = DAY_NAME[today], box = [], tonight;
    if (M.plan.state === 'error') return '<p class="hint cln-add-note" role="status">Could not read the weights, so the book cannot suggest a day. The job still saves; give it a weight later in Weights and days.</p>';
    if (M.plan.state !== 'ok') return '<p class="hint cln-add-note" role="status">' + ink('Reading the weights...') + '</p>';
    if (n >= 7) return '<p class="hint cln-add-note">A job on every day needs no weight. Weights are for weekly and monthly jobs.</p>';
    if (M.addLoad === 'error') box.push('<span class="hint">Could not open the day planner. Choose the days yourself. <button type="button" class="p-link" data-cln="add-planner">Try again</button></span>');
    else if (!window.LK_CLEANING_PLAN) box.push('<span class="hint">' + ink('Opening the day planner...') + '</span>');
    else if (!p) box.push('<span class="hint">Choose the responsible section, and the book suggests a day.</span>');
    else if (!M.newW) box.push('<span class="hint">Choose how long it takes, and the book suggests a day.</span>');
    else if (n > 3) box.push('<span class="hint">On 4 or more days a week the book does not suggest one.</span>');
    else if (p.noFit) box.push('<b>No day fits</b><span class="hint">No ' + (n > 1 ? 'set of days' : 'day') + ' takes a ' + WEIGHTS[M.newW].toLowerCase() + ' job here under the rules. Choose ' + (n > 1 ? 'the days' : 'a day') + ' yourself.</span>');
    else {
      var same = n > 0 && d.dows.slice().sort().join() === p.days.slice().sort().join();
      box.push('<b>Suggested: ' + esc(dayWords(p.days)) + '</b><span class="hint">' + esc(sentence(p.why)) + (p.mates.length && /of its kind/.test(p.why) ? ' ' + esc(p.mates.join(' and ') + (p.mates.length > 1 ? ' clean their ' : ' cleans its ') + M.newK.toLowerCase() + ' on a ' + DAY_NAME[p.days[0]] + ' too.') : '') + (p.heaviest ? ' Pick another day if that is too much.' : '') + ' ' + (same ? 'Chosen.' : n ? 'You chose ' + esc(dayWords(d.dows.slice().sort(function (a, b) { return DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b); }))) + '.' : 'No day is chosen until you press one.') + '</span>');
    }
    // a new job starts the day it is saved: today's chip pressed makes it due at tonight's close
    tonight = d.dows.indexOf(today) >= 0 ? '<b class="cln-add-tonight">' + todayName + ' is today: saved now, this job is due at tonight\'s close.</b>' : '<span class="hint">' + todayName + ' is today: a new job starts the day it is saved, so pressing ' + DAYS.filter(function (x) { return x[0] === today; })[0][1] + ' makes it due tonight.</span>';
    box.push(tonight);
    if (p && p.has) box.push('<span class="hint">Under each day: the points ' + esc(p.name) + ' already has that night (light 1, medium 2, heavy 3).</span>');
    var weight = '<div class="cln-add-weight"><span class="label" id="cln-weight-label">How long it takes</span><div class="chips" role="group" aria-labelledby="cln-weight-label">' + [1, 2, 3].map(function (w) { return '<button type="button" class="chip" data-cln="add-weight" data-w="' + w + '" aria-pressed="' + (M.newW === w) + '"' + (M.saveBusy ? ' disabled' : '') + '>' + WEIGHTS[w] + '</button>'; }).join('') + '</div>' +
      '<p class="hint">' + (M.newW ? 'Your call. ' + esc(levelWords(lv)) : 'Your call. The book needs it to suggest a day.') + '</p></div>';
    var kind = '<label class="field cln-add-kind" for="cln-add-kind"><span class="label">Kind of job (optional)</span><select id="cln-add-kind" data-cln-field="addkind"' + (M.saveBusy ? ' disabled' : '') + '><option value="">None</option>' + KINDS.map(function (x) { return '<option' + (x === M.newK ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select></label>';
    return '<div class="cln-sug cln-add-sug" aria-live="polite">' + box.join('') + '</div>' + weight + kind;
  }
  // the new job's day block drawn again in place, focus kept on the control in hand
  function patchAddDay() {
    var at = M.root && M.root.querySelector('.cln-add-day'); if (!at || !M.draft) return;
    var a = document.activeElement, had = a && at.contains(a) ? a.id || a.getAttribute('data-cln') : '', dow = had && a.getAttribute('data-dow'), w = had && a.getAttribute('data-w');
    at.outerHTML = addDayBlock(M.draft);
    if (!had) return;
    var back = [].filter.call(M.root.querySelectorAll('.cln-add-day [data-cln], .cln-add-day select'), function (el) { return (el.id === had || el.getAttribute('data-cln') === had) && (!dow || el.getAttribute('data-dow') === dow) && (!w || el.getAttribute('data-w') === w); })[0];
    if (back) back.focus({ preventScroll: true });
  }
  // what a new job's save carries: its weight and kind, only for a job that comes round weekly (1 to 6 days)
  function addWeigh() { return addOn() && M.newW && M.plan.state === 'ok' && M.draft.dows.length >= 1 && M.draft.dows.length <= 6 ? { w: M.newW, k: M.newK } : null; }
  /* Weights and days (head chef, 26 Nov 2026, results by section, step 3; docs/cleaning-schedule.md, Weights and days).
     Every weekly and monthly job (K.round(): the jobs whose row says how often) as one row by section, with Light,
     Medium and Heavy and an optional kind, and one Save. The weights live in one record keyed by each job's root id,
     so a job moved to another day keeps its weight: C.planRead (1 read when a chef opens Repeat tasks, and Refresh)
     and C.planSave (one merged write of the jobs changed). A failed read is never "no weight yet": the count waits and
     Save stays off. Unsaved weights are this page's work: they count as unsent, and go with a lock or a handover. */
  var WEIGHTS = ['', 'Light', 'Medium', 'Heavy'], KINDS = ['Shelves', 'Fridges', 'Behind equipment', 'Floors', 'Drawers', 'Equipment'];
  function jobKey(task) { return typeof task.root === 'string' && task.root ? task.root : task.id; }
  function weighJobs() { return K && K.round ? M.tasks.filter(function (task) { return task.until === OPEN && K.round(task); }) : []; }
  // only the values this page knows: a weight of 1 to 3, a kind from the list. Anything else in the record is left alone
  function planClean(data) {
    var w = {}, k = {}, dw = data && data.w && typeof data.w === 'object' ? data.w : {}, dk = data && data.k && typeof data.k === 'object' ? data.k : {};
    Object.keys(dw).forEach(function (key) { if ([1, 2, 3].indexOf(dw[key]) >= 0) w[key] = dw[key]; });
    Object.keys(dk).forEach(function (key) { if (KINDS.indexOf(dk[key]) >= 0) k[key] = dk[key]; });
    var d = data && Array.isArray(data.d) && data.d.length === 7 && data.d.every(function (v) { return v === 1 || v === 2 || v === 3; }) ? data.d.slice() : null;
    return { w: w, k: k, d: d };
  }
  function weightOf(task) { var key = jobKey(task); return M.wDraft[key] || M.plan.w[key] || 0; }
  function kindOf(task) { var key = jobKey(task); return key in M.kDraft ? M.kDraft[key] : M.plan.k[key] || ''; }
  function weighChanges() {
    var w = {}, k = {}, n = {};
    Object.keys(M.wDraft).forEach(function (key) { if (M.wDraft[key] !== (M.plan.w[key] || 0)) { w[key] = M.wDraft[key]; n[key] = 1; } });
    Object.keys(M.kDraft).forEach(function (key) { if (M.kDraft[key] !== (M.plan.k[key] || '')) { k[key] = M.kDraft[key]; n[key] = 1; } });
    return { w: w, k: k, jobs: Object.keys(n).length };
  }
  function weighDirty() { return weighChanges().jobs > 0; }
  function loadPlan(force) {
    if (!C.chef() || !C.planRead || M.plan.state === 'loading' || M.plan.again || (M.plan.state === 'ok' && !force)) return;
    var gen = generation, again = M.plan.state === 'ok';
    // read again (Refresh): the list and its unsaved changes stay on screen until the answer
    if (again) { M.plan.again = true; C.planRead().then(function (data) { if (gen !== generation) return; var c = planClean(data); M.plan = { state: 'ok', w: c.w, k: c.k, d: c.d, error: '' }; if (M.weights) draw(); else { patchNotice(); patchAddDay(); } },
      function () { if (gen !== generation) return; M.plan.again = false; if (M.weights) { M.wError = 'Could not check the weights again. These are the ones read before.'; patchWeigh(); } }); return; }
    M.plan.state = 'loading'; M.plan.error = '';
    // On Repeat tasks only the one line changes (patchNotice), so the page is not drawn again under the chef's hand
    C.planRead().then(function (data) { if (gen !== generation) return; var c = planClean(data); M.plan = { state: 'ok', w: c.w, k: c.k, d: c.d, error: '' }; if (M.weights) draw(); else { patchNotice(); patchAddDay(); } },
      function (error) { if (gen !== generation) return; M.plan.state = 'error'; M.plan.error = error && error.code === 'permission-denied' ? 'Only the head chef and the sous chefs can read the weights.' : navigator.onLine === false || error && (error.code === 'unavailable' || error.code === 'deadline-exceeded') ? 'No signal.' : 'Check the connection.'; if (M.weights) draw(); else { patchNotice(); patchAddDay(); } });
  }
  function patchNotice() {
    var at = M.root && M.root.querySelector('.cln-weights-notice, .cln-weights-link'); if (!at) return;   // no line on the page: nothing to show
    var had = at.contains(document.activeElement), html = weightsNotice();
    if (!html) { at.remove(); return; }
    at.outerHTML = html; if (had) { var link = M.root.querySelector('[data-cln="weights"]'); if (link) link.focus({ preventScroll: true }); }
  }
  // the line on Repeat tasks that opens the list: how many jobs still have no weight, once the weights are read
  function weightsNotice() {
    if (!C.planRead || M.state !== 'ok') return '';
    var jobs = weighJobs(); if (!jobs.length) return '';
    var link = '<button type="button" class="p-link" data-cln="weights">Weights and days</button>';
    var none = M.plan.state === 'ok' ? jobs.filter(function (task) { return !M.plan.w[jobKey(task)]; }).length : -1;
    if (none > 0) return '<div class="cln-attention cln-weights-notice" role="status"><b>' + none + (none === 1 ? ' weekly or monthly job has' : ' weekly and monthly jobs have') + ' no weight yet</b><span class="hint">Say how long each takes at close: light, medium or heavy.</span>' + link + '</div>';
    return '<p class="hint cln-weights-link">' + (M.plan.state === 'error' ? 'Could not read the weights. ' : M.plan.state === 'ok' ? 'Every weekly and monthly job has a weight. ' : '') + link + '</p>';
  }
  function weighRow(task) {
    var w = weightOf(task), kind = kindOf(task), id = esc(task.id), name = esc(task.text);
    return '<li class="cln-template-item cln-weigh-row" role="listitem" data-template="' + id + '"><div class="cln-template-summary"><div><b>' + name + '</b><small class="cln-weigh-meta">' + esc(rhythm(task)) + (w ? '' : ' · No weight yet') + '</small></div></div>' +
      '<div class="cln-weigh-ctl"><span class="chips" role="group" aria-label="How long ' + name + ' takes">' + [1, 2, 3].map(function (n) { return '<button type="button" class="chip" data-cln="weigh" data-id="' + id + '" data-w="' + n + '" aria-pressed="' + (w === n) + '"' + (M.wBusy ? ' disabled' : '') + '>' + WEIGHTS[n] + '</button>'; }).join('') + '</span>' +
      '<label class="cln-kind"><span class="visually-hidden">Kind of job, optional: ' + name + '</span><select data-cln-kind="' + id + '"' + (M.wBusy ? ' disabled' : '') + '><option value="">Kind (optional)</option>' + KINDS.map(function (x) { return '<option' + (x === kind ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select></label></div></li>';
  }
  function weighDock() {
    var c = weighChanges(), none = weighJobs().filter(function (task) { return !M.plan.w[jobKey(task)]; }).length;   // saved, like the No weight filter
    var say = M.wError ? '<span class="cln-weigh-err" role="alert">' + esc(M.wError) + '</span>' : M.wBusy ? 'Saving ' + c.jobs + (c.jobs === 1 ? ' job...' : ' jobs...') : c.jobs ? '<b>' + c.jobs + ' not saved.</b>' + (none ? ' ' + none + ' with no weight saved yet.' : '') : M.wSaved ? '<span class="lk-stamp">Saved</span> ' + esc(T.clock(M.wSaved)) + '.' + (none ? ' ' + none + ' with no weight yet.' : '') : none ? none + ' with no weight yet.' : 'Every job has a weight.';
    return '<div class="cln-weigh-dock sv-dock"><span class="hint" role="status">' + say + '</span><span class="btn-row">' + (c.jobs && !M.wBusy ? '<button type="button" class="btn" data-cln="weights-undo">Undo changes</button>' : '') +
      '<button type="button" class="btn dark" data-cln="weights-save"' + (c.jobs && !M.wBusy && M.plan.state === 'ok' ? '' : ' disabled') + '>' + (M.wBusy ? ink('Saving...') : 'Save ' + (c.jobs || '') + (c.jobs === 1 ? ' job' : ' jobs')) + '</button></span></div>';
  }
  function weightsPage() {
    var jobs = weighJobs(), st = M.plan.state;
    var head = '<section class="nb-page cln-plan cln-weights" aria-labelledby="rtitle"><header class="nb-ph"><div><h2 class="nb-title" id="rtitle" tabindex="-1">Cleaning</h2><p class="nb-date" id="cln-plan-title" tabindex="-1">Weights and days' + (M.state === 'ok' ? ' · ' + jobs.length + ' weekly and monthly jobs' : '') + '</p></div><button type="button" class="p-link" data-cln="weights-back">Back to Repeat tasks</button></header><div class="cln-plan-body">' + readLine();
    if (M.state === 'error') return head + clnFailLine() + '</div></section>';
    if (M.state !== 'ok' || st === 'loading' || st === 'idle') return head + loading() + '</div></section>';
    if (st === 'error') return head + '<div class="p-err" role="alert">Could not read the weights. ' + esc(M.plan.error) + ' <button type="button" class="chip" data-cln="weights-retry">Try again</button></div></div></section>';
    if (!jobs.length) return head + '<p class="hint" role="status">No weekly or monthly jobs yet. Add one, or load the section cleaning list in Repeat tasks.</p></div></section>';
    if (M.wFilter === 'changes' && !(M.sug && M.sug.state === 'ready')) M.wFilter = 'all';
    var none = jobs.filter(function (task) { return !M.plan.w[jobKey(task)]; }).length, shown = M.wFilter === 'none' ? jobs.filter(function (task) { return !M.plan.w[jobKey(task)]; }) : jobs;
    var groupsOf = {}, order = [];
    shown.forEach(function (task) { var name = owner(task, T.day()); if (!groupsOf[name]) { groupsOf[name] = []; order.push(name); } groupsOf[name].push(task); });
    order.sort(function (a, b) { return (a === 'Shared kitchen' ? 1 : 0) - (b === 'Shared kitchen' ? 1 : 0) || (a < b ? -1 : a > b ? 1 : 0); });
    var sugOn = !!(M.sug && M.sug.state === 'ready'), nChanges = sugOn ? sugPending().length + M.sug.saved.length : 0;
    return head + '<p class="hint">How long each weekly or monthly job takes at close: light, medium or heavy. Nightly jobs and the numbered Pack down steps are not here.</p>' + daysBlock() + sugBlock() +
      '<div class="chips cln-weigh-filter" role="group" aria-label="Show"><button type="button" class="chip" data-cln="weights-filter" data-f="all" aria-pressed="' + (M.wFilter === 'all') + '">All ' + jobs.length + '</button>' + (sugOn ? '<button type="button" class="chip" data-cln="weights-filter" data-f="changes" aria-pressed="' + (M.wFilter === 'changes') + '">Changes ' + nChanges + '</button>' : '') + '<button type="button" class="chip" data-cln="weights-filter" data-f="none" aria-pressed="' + (M.wFilter === 'none') + '">No weight ' + none + '</button></div>' +
      (M.wFilter === 'changes' ? sugRows() + sugDock() + '</div></section>' : (shown.length ? order.map(function (name) { return '<h3 class="nb-hd cln-weigh-h">' + esc(name) + '<span>' + groupsOf[name].length + (groupsOf[name].length === 1 ? ' job' : ' jobs') + '</span></h3><ul class="cln-templates cln-weigh-list" role="list">' + groupsOf[name].map(weighRow).join('') + '</ul>'; }).join('')
        : '<p class="hint" role="status">Every weekly and monthly job has a weight.</p>') +
      weighDock() + '</div></section>');
  }
  /* What each day takes (head chef, 26 Nov 2026: "sunday Monday Wednesday and Thursday are the heavy days in my pub but
     we can let the admin decide which days are heavy load days and learn then based on what days we have more staff
     on"). Each weekday takes jobs up to light, medium or heavy; Friday and Saturday light only (his rule, 26 Nov).
     Kept in the same record as d, Sunday first. Until it is saved, the page shows his days. The chefs who set the
     weights set the days too (head chef, 26 Nov 2026: "admin, headchef or sous chef of that venue, they will know best
     when their busy days are"), each venue its own. The book suggests from staffing: how many people were on
     each weekday in the last 30 days of plans and picks (C.staffing()). Busier days with more people take heavier
     jobs; Friday and Saturday stay light whatever the roster says. A suggestion is never saved on its own. */
  var LEVEL_DEFAULT = [3, 3, 2, 3, 3, 1, 1], DAY_ORDER = [1, 2, 3, 4, 5, 6, 0], QUIET = [5, 6], DAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function dayLevels() { return M.dDraft || M.plan.d || LEVEL_DEFAULT; }
  function daysDirty() { return !!M.dDraft && JSON.stringify(M.dDraft) !== JSON.stringify(M.plan.d || LEVEL_DEFAULT); }
  function canDays() { return !!(C.chef && C.chef()); }
  // a suggestion for Sunday to Thursday: a day with as many people as the middle day, or more, takes heavy; fewer, medium
  function daySuggest(s) {
    if (!s || !s.fresh || !s.avg) return null;
    var days = [0, 1, 2, 3, 4].filter(function (d) { return s.n[d] >= 3 && s.avg[d] != null; });
    if (days.length < 3) return null;
    var sorted = days.map(function (d) { return s.avg[d]; }).sort(function (a, b) { return a - b; }), mid = sorted[Math.floor(sorted.length / 2)];
    var out = [null, null, null, null, null, 1, 1];
    days.forEach(function (d) { out[d] = s.avg[d] >= mid ? 3 : 2; });
    return out;
  }
  function loadStaff() {
    if (!canDays() || !C.staffing || M.staff.state === 'loading' || M.staff.state === 'ok') return;
    var model = M; M.staff = { state: 'loading' };
    C.staffing().then(function (s) { if (M !== model) return; M.staff = Object.assign({ state: 'ok' }, s); patchDays(); },
      function () { if (M !== model) return; M.staff = { state: 'error' }; patchDays(); });
  }
  // in one short line, heaviest first: "Heavy: Mon, Wed, Thu, Sun. Medium: Tue. Light: Fri, Sat."
  function daysSummary() { var lv = dayLevels(); return [3, 2, 1].map(function (n) { var on = DAY_ORDER.filter(function (d) { return lv[d] === n; }).map(function (d) { return DAY_NAME[d].slice(0, 3); }); return on.length ? WEIGHTS[n] + ': ' + on.join(', ') + '.' : ''; }).filter(Boolean).join(' '); }
  function daysBlock() {
    if (M.plan.state !== 'ok') return '';   // drawn only from a record read from the server, never from no answer
    var lv = dayLevels(), saved = !!M.plan.d, open = M.daysOpen;
    var html = '<div class="cln-days">' + '<button type="button" class="tm-fold cln-days-fold" data-cln="days-fold" aria-expanded="' + open + '">What each day takes' + (saved ? '' : ' (not saved yet)') + '</button>';
    if (!open) return html + '<p class="hint cln-days-sum">' + esc(daysSummary()) + '</p></div>';
    var s = M.staff, sug = s.state === 'ok' ? daySuggest(s) : null;
    var staffWords = function (d) {
      if (QUIET.indexOf(d) >= 0) return 'Light only.';
      if (s.state === 'loading' || s.state === 'idle') return 'Reading the team.';
      if (s.state === 'error') return 'Could not read the team.';
      if (s.none) return 'No team count yet.';
      if (!s.fresh) return 'The team count is not up to date.';
      if (!s.n[d] || s.n[d] < 3) return 'Not enough weeks yet.';
      return 'About ' + Math.round(s.avg[d]) + ' on' + (sug && sug[d] ? '. Suggests ' + WEIGHTS[sug[d]].toLowerCase() + '.' : '.');
    };
    html += '<p class="hint">Each day takes jobs up to that weight. The book suggests from how many people were on each day in the last 30 days of Today\'s team: a day with more people takes heavier jobs. Friday and Saturday stay light.</p>' +
      '<ul class="cln-day-list" role="list">' + DAY_ORDER.map(function (d) {
        var quiet = QUIET.indexOf(d) >= 0;
        return '<li class="cln-day-row"><b>' + DAY_NAME[d] + '</b>' +
          (quiet ? '<span class="cln-day-fixed">Light</span>' : '<span class="chips" role="group" aria-label="What ' + DAY_NAME[d] + ' takes">' + [1, 2, 3].map(function (n) { return '<button type="button" class="chip" data-cln="day-level" data-dow="' + d + '" data-w="' + n + '" aria-pressed="' + (lv[d] === n) + '"' + (M.dBusy ? ' disabled' : '') + '>' + WEIGHTS[n] + '</button>'; }).join('') + '</span>') +
          '<small class="cln-day-staff">' + esc(staffWords(d)) + '</small></li>';
      }).join('') + '</ul>';
    var useful = sug && [0, 1, 2, 3, 4].some(function (d) { return sug[d] && sug[d] !== lv[d]; });
    var say = M.dError ? '<span class="cln-weigh-err" role="alert">' + esc(M.dError) + '</span>' : M.dBusy ? 'Saving the days...' : daysDirty() ? '<b>Not saved.</b>' : M.dSaved ? '<span class="lk-stamp">Saved</span> ' + esc(T.clock(M.dSaved)) + '.' : saved ? '' : 'Not saved yet: these are the starting days.';
    return html + '<div class="cln-days-save"><span class="hint" role="status">' + say + '</span><span class="btn-row">' +
      (useful && !M.dBusy ? '<button type="button" class="btn" data-cln="days-suggest">Use the suggestions</button>' : '') +
      (daysDirty() && !M.dBusy ? '<button type="button" class="btn" data-cln="days-undo">Undo</button>' : '') +
      '<button type="button" class="btn dark" data-cln="days-save"' + ((daysDirty() || !saved) && !M.dBusy && M.plan.state === 'ok' ? '' : ' disabled') + '>' + (M.dBusy ? ink('Saving...') : 'Save the days') + '</button></span></div></div>';
  }
  function patchDays() { var at = M.root && M.root.querySelector('.cln-days'); if (at) { var had = at.contains(document.activeElement) && document.activeElement.getAttribute('data-cln'), dw = document.activeElement && document.activeElement.getAttribute('data-dow'), wv = document.activeElement && document.activeElement.getAttribute('data-w'); at.outerHTML = daysBlock(); if (had) { var back = [].filter.call(M.root.querySelectorAll('.cln-days [data-cln="' + had + '"]'), function (b) { return !b.disabled && (!dw || b.getAttribute('data-dow') === dw) && (!wv || b.getAttribute('data-w') === wv); })[0] || M.root.querySelector('.cln-days [data-cln="days-save"]:not([disabled])') || M.root.querySelector('[data-cln="days-fold"]'); if (back) back.focus({ preventScroll: true }); } } patchSug(); }
  function saveDays() {
    if (!canDays() || M.dBusy || M.plan.state !== 'ok' || !C.planSave) return;
    var d = dayLevels().slice(), model = M; M.dBusy = true; M.dError = ''; patchDays();
    C.planSave(null, null, d).then(function () { if (M !== model) return; M.plan.d = d; M.dDraft = null; M.dBusy = false; M.dSaved = T.now(); patchDays(); },
      function (error) { if (M !== model) return; M.dBusy = false; M.dError = error && error.code === 'unauthenticated' ? 'Not saved: unlock with your PIN, then press Save the days. Your change is kept here.' : error && error.code === 'permission-denied' ? 'Refused: only the head chef and the sous chefs set the days. Nothing was saved.' : 'Not saved. ' + (navigator.onLine === false ? 'No signal. ' : '') + 'Press Save the days again.'; patchDays(); });
  }
  // a weight or a kind changes this page's work without drawing it again, so nothing moves under the thumb
  function patchWeigh() { var dock = M.root && M.root.querySelector('.cln-weigh-dock'); if (dock) dock.outerHTML = weighDock(); patchSug(); }
  // the Suggest block after a weight or a kind changed: a suggestion made from the old weights is dropped, in words
  function patchSug() {
    if (!M.root) return;
    var was = M.wFilter === 'changes', had = !!M.sug;
    if (M.sug && !M.sug.saving && (weighDirty() || daysDirty() || M.sug.levels && M.sug.levels !== JSON.stringify(M.plan.d || LEVEL_DEFAULT))) { sugDrop(M.sug.saved.length ? 'A weight or a day changed: saved changes stay. Save the weight, then press Suggest the days again.' : 'A weight or a day changed: save it, then press Suggest the days again.'); var chg = M.root.querySelector('[data-cln="weights-filter"][data-f="changes"]'); if (chg) chg.remove(); }
    if (was && had && !M.sug) { draw(); var sf = M.root.querySelector('.cln-sug-wrap [role="status"]'); if (sf) { sf.setAttribute('tabindex', '-1'); sf.focus({ preventScroll: true }); } return; }
    var at = M.root.querySelector('.cln-sug-wrap'); if (at) at.outerHTML = sugBlock();
  }
  function saveWeights() {
    var c = weighChanges(); if (!c.jobs || M.wBusy || M.plan.state !== 'ok' || !C.planSave) return;
    var model = M; M.wBusy = true; M.wError = ''; draw();
    C.planSave(c.w, c.k).then(function () {
      if (M !== model) return;
      Object.keys(c.w).forEach(function (key) { M.plan.w[key] = c.w[key]; }); Object.keys(c.k).forEach(function (key) { if (c.k[key]) M.plan.k[key] = c.k[key]; else delete M.plan.k[key]; });
      M.wDraft = {}; M.kDraft = {}; M.wBusy = false; M.wSaved = T.now(); draw();
    }, function (error) {
      if (M !== model) return;
      M.wBusy = false; M.wError = error && error.code === 'unauthenticated' ? 'Not saved: unlock with your PIN, then press Save. Your changes are kept here.' : error && error.code === 'permission-denied' ? 'Refused: only the head chef and the sous chefs change the weights. Nothing was saved.' : 'Not saved. ' + (navigator.onLine === false ? 'No signal. ' : '') + 'Your changes are kept here: press Save again.'; draw();
    });
  }
  /* Suggest the days (head chef, 26 Nov 2026, results by section, step 4b; docs/cleaning-schedule.md, Suggest the days).
     Only while Cleaning is off for the team (C.teamOn() false): after switch-on a job's day changes one at a time in
     Repeat tasks. The planner (js/cleaning-plan.js) is lazy, loaded on the press. Fewest moves (the council's m3): a dated
     job moves when its day breaks a rule that is on, or to make its section's heaviest night lighter; a monthly job with
     no first date gets one, and Pick a date sets it by hand. It plans from the saved weights
     and the saved days only, never a guessed weight. Each change sits in its row with the old day and the reason, Keep
     (not where the old day breaks a day's level) and Another day; both plan the rest again. Nothing moves until Save:
     5 jobs at a time through C.moveTasks, each row saying Saved, Refused, Not sent or Waiting to send. No reads. */
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function teamOn() { return C.teamOn ? C.teamOn() : null; }
  function sugPending() { return M.sug && M.sug.changes ? M.sug.changes.filter(function (c) { var r = M.sug.rows[c.id]; return !r || r.st !== 'saved'; }) : []; }
  function sugDirty() { return !!(M.sug && M.sug.changes && sugPending().length); }
  function sugClock() { return { at: function (day) { return T.at(day); }, dow: function (ms) { return T.dow(ms); }, day: function (ms) { return T.day(ms); } }; }
  function sugRun() {
    var Pl = window.LK_CLEANING_PLAN, s = M.sug; if (!Pl || !s) return;
    var tasks = weighJobs(), jobs = Pl.jobsFrom(tasks, { w: M.plan.w, k: M.plan.k, key: jobKey, sec: function (task) { return task.shared ? '' : owner(task, T.day()); }, clock: sugClock() });
    // a monthly date the chef picked is his: it only counts toward that weekday, and is saved as picked
    jobs.forEach(function (j) { if (s.keep[j.id]) j.move = false; if (s.pick[j.id]) { j.move = false; j.days = [T.dow(T.at(s.pick[j.id]))]; } });
    s.levels = JSON.stringify(M.plan.d || LEVEL_DEFAULT);
    // fewest moves as the council chose it (m3): a dated job moves when its day breaks a rule, or to make its section's
    // heaviest night lighter (each with Keep where its old day takes it); planning again after a save moves nothing
    var opts = { level: M.plan.d || LEVEL_DEFAULT, order: 'fewest', even: true, needWeight: true, twoHeavy: s.twoHeavy, cap: s.cap ? 5 : false, avoid: s.avoid }, out = Pl.plan(jobs, opts);
    s.jobs = jobs; s.out = out; s.state = 'ready'; s.day = T.day();
    // what the plan as it stands still breaks, in words: a kept day, a night over 5 points, a job left where it was
    s.notes = Pl.check(jobs, out.days, opts);
    s.changes = Pl.changes(jobs, out, sugClock(), T.day());
    Object.keys(s.pick).forEach(function (id) { s.changes.push({ id: id, days: [T.dow(T.at(s.pick[id]))], was: [], anchor: s.pick[id], picked: true }); });
    s.noFit = jobs.filter(function (j) { return j.move && /No day fits/.test(out.why[j.id] || ''); }).map(function (j) { return j.id; });
  }
  function sugStart() {
    if (!C.chef() || teamOn() !== false || weighDirty() || daysDirty() || M.plan.state !== 'ok') return;
    M.sug = { state: 'loading', twoHeavy: true, cap: true, keep: {}, avoid: {}, pick: {}, rows: {}, saved: [], saving: false, error: '' }; M.sugNote = ''; draw();
    var model = M, go = function () { if (M !== model || !M.sug) return; sugRun(); M.wFilter = 'changes'; draw(); var h = M.root.querySelector('.cln-sug-sum'); if (h) h.focus({ preventScroll: true }); };
    if (window.LK_CLEANING_PLAN && window.LK_CLEANING_PLAN.api === 1) { go(); return; }
    window.LK_APP.load('js/cleaning-plan.js?v=1').then(function () { if (!window.LK_CLEANING_PLAN || window.LK_CLEANING_PLAN.api !== 1) throw new Error('planner'); go(); },
      function () { if (M !== model || !M.sug) return; M.sug.state = 'error'; draw(); });
  }
  function sugDrop(note) { M.sug = null; M.sugNote = note || ''; if (M.wFilter === 'changes') M.wFilter = 'all'; }
  function dayWords(days) { return days.map(function (d) { return DAY_NAME[d]; }).join(' and '); }
  function dateWords(day) { var p = day.split('-'); return DAY_NAME[T.dow(T.at(day))] + ' ' + (+p[2]) + ' ' + MONTHS[+p[1] - 1]; }
  function sentence(text) { return text ? text.charAt(0).toUpperCase() + text.slice(1) + '.' : ''; }
  // the block under What each day takes: the button, or why there is none
  function sugBlock() { return '<div class="cln-sug-wrap">' + sugInner() + '</div>'; }
  function sugInner() {
    var on = teamOn(); if (on === null || M.plan.state !== 'ok') return '';
    if (on) return '<p class="hint cln-sug-off">Cleaning is on for the team, so the book no longer suggests days in bulk. Change a job\'s day in Repeat tasks, one at a time.</p>';
    var s = M.sug, wait = weighDirty() || daysDirty();
    if (!s) return '<div class="cln-sug-start">' + (M.sugNote ? '<p class="hint" role="status">' + esc(M.sugNote) + '</p>' : '') + '<p class="hint">Cleaning is off for the team, so the book can suggest a day for each weekly and monthly job. It moves as few as it can. Nothing moves until you save.</p>' +
      '<button type="button" class="btn" data-cln="sug-start"' + (wait ? ' disabled' : '') + '>Suggest the days</button>' + (wait ? '<p class="hint" role="status">Save the weights and the days first.</p>' : '') + '</div>';
    if (s.state === 'loading') return '<div class="cln-sug-start" role="status">' + ink('Working out the days...') + '</div>';
    if (s.state === 'error') return '<div class="cln-sug-start"><p class="p-err" role="alert">Could not open the day planner. Check the connection.</p><button type="button" class="btn" data-cln="sug-start">Try again</button></div>';
    var pend = sugPending(), moves = pend.filter(function (c) { return c.was.length; }).length, firsts = pend.length - moves, noW = s.out.noWeight.length;
    var head = s.saved.length ? s.saved.length + ' of ' + (s.saved.length + pend.length) + ' changes saved' : pend.length ? 'The book suggests ' + pend.length + (pend.length === 1 ? ' change' : ' changes') : 'Every weighed job\'s day already fits';
    var bits = [];
    if (moves) bits.push(moves + (moves === 1 ? ' job moves' : ' jobs move') + ' to another day.');
    if (firsts) bits.push(firsts + (firsts === 1 ? ' monthly job gets' : ' monthly jobs get') + ' a first date.');
    if (s.noFit.length) bits.push(s.noFit.length + (s.noFit.length === 1 ? ' job has' : ' jobs have') + ' no day that fits.');
    bits.push(s.saved.length ? 'A saved day starts tomorrow.' : 'Nothing is saved yet. A saved day starts tomorrow.');
    return '<div class="cln-attention cln-sug-sum" tabindex="-1" role="status"><b>' + esc(head) + '</b><span class="hint">' + esc(bits.join(' ')) + '</span>' +
      (s.notes.length ? '<span class="hint cln-sug-notes"><b>Still against a rule:</b> ' + esc(s.notes.slice(0, 4).join('. ') + '.' + (s.notes.length > 4 ? ' And ' + (s.notes.length - 4) + ' more.' : '')) + '</span>' : '') +
      (noW ? '<span class="hint">' + noW + (noW === 1 ? ' job has' : ' jobs have') + ' no weight yet, so ' + (noW === 1 ? 'it is' : 'they are') + ' not planned. The book never guesses a weight. <button type="button" class="p-link" data-cln="weights-filter" data-f="none">Weigh ' + (noW === 1 ? 'it' : 'them') + ' first</button></span>' : '') + '</div>' +
      '<div class="cln-sug-rules"><span class="label" id="cln-sug-rules-l">Suggested rules, yours to keep or drop</span><span class="chips" role="group" aria-labelledby="cln-sug-rules-l">' +
      '<button type="button" class="chip" data-cln="sug-rule" data-rule="twoHeavy" aria-pressed="' + s.twoHeavy + '"' + (s.saving ? ' disabled' : '') + '>No section gets two heavy jobs on one night</button>' +
      '<button type="button" class="chip" data-cln="sug-rule" data-rule="cap" aria-pressed="' + s.cap + '"' + (s.saving ? ' disabled' : '') + '>A section\'s night over 5 points is too heavy</button></span></div>';
  }
  function sugTag(r) {
    if (!r) return '';
    if (r.st === 'saved') return '<p class="cln-sug-state"><span class="lk-stamp">Saved</span> ' + esc(T.clock(r.at)) + '. Starts tomorrow.</p>';
    if (r.st === 'wait') return '<p class="cln-sug-state hint">Waiting to send.</p>';
    if (r.st === 'busy') return '<p class="cln-sug-state hint">' + ink('Sending...') + '</p>';
    if (r.st === 'unsent') return '<p class="cln-sug-state"><b>Not sent.</b> ' + esc(r.msg) + '</p>';
    return '<p class="cln-sug-state cln-weigh-err" role="alert">Refused. ' + esc(r.msg) + '</p>';
  }
  function sugRowFor(task, inner, state) {
    var w = weightOf(task), kind = kindOf(task);
    return '<li class="cln-template-item cln-sug-row" role="listitem" data-template="' + esc(task.id) + '"><div class="cln-template-summary"><div><b>' + esc(task.text) + '</b><small class="cln-weigh-meta">' + esc([owner(task, T.day()), rhythm(task), WEIGHTS[w] || 'No weight', kind].filter(Boolean).join(' · ')) + '</small></div></div>' +
      '<div class="cln-sug">' + inner + '</div>' + state + '</li>';
  }
  function sugRows() {
    var s = M.sug, Pl = s, busyNow = s.saving, rows = [];
    s.saved.forEach(function (x) { var task = taskById(x.taskId) || x.task; rows.push(sugRowFor(task, '<b>' + esc(x.title) + '</b><p class="hint">' + esc(sentence(x.why)) + '</p>', sugTag(s.rows[x.id]))); });
    s.changes.forEach(function (c) {
      var r = s.rows[c.id]; if (r && r.st === 'saved') return;
      var task = taskById(c.id); if (!task) return;
      var why = c.picked ? 'you picked this date' : Pl.out.why[c.id] || '', breaks = /^\w+ takes up to /.test(why), every = task.plan && task.plan.repeat ? task.plan.repeat.days : 0;
      var title = c.anchor ? dateWords(c.anchor) + ', then every ' + (every % 7 ? every + ' days' : every / 7 + ' weeks') : dayWords(c.days) + ', was ' + dayWords(c.was);
      // a monthly job: Pick a date (from tomorrow) as drawn in m3; a picked date offers Suggest again
      var pick = c.anchor ? '<label class="cln-sug-pick"><span class="label">Pick a date</span><input type="date" data-cln-sugdate="' + esc(c.id) + '" min="' + esc(shift(T.day(), 1)) + '" value="' + esc(c.anchor) + '"></label>' : '';
      var ctl = busyNow || r && r.st === 'busy' ? '' : pick + '<span class="btn-row">' + (c.was.length && !breaks ? '<button type="button" class="btn" data-cln="sug-keep" data-id="' + esc(c.id) + '">Keep ' + esc(dayWords(c.was)) + '</button>' : '') + (c.picked ? '<button type="button" class="btn" data-cln="sug-reset" data-id="' + esc(c.id) + '">Suggest again</button>' : '<button type="button" class="btn" data-cln="sug-other" data-id="' + esc(c.id) + '">Another day</button>') + '</span>';
      rows.push(sugRowFor(task, '<b>' + esc(title) + '</b><p class="hint">' + esc(sentence(why)) + '</p>' + ctl, sugTag(r)));
    });
    s.jobs.filter(function (j) { return s.keep[j.id] || s.noFit.indexOf(j.id) >= 0; }).forEach(function (j) {
      var task = taskById(j.id); if (!task) return;
      var title = s.keep[j.id] ? 'Stays on ' + dayWords(j.days) + '. You kept it.' : j.days.length ? 'No day fits. Left on ' + dayWords(j.days) + '.' : 'No day fits yet.';
      var why = s.keep[j.id] ? '' : (s.avoid[j.id] ? 'Every other day the rules allow was taken out with Another day.' : 'Every day breaks one of the rules that are on. Drop a suggested rule above, or change what each day takes.');
      rows.push(sugRowFor(task, '<b>' + esc(title) + '</b>' + (why ? '<p class="hint">' + esc(why) + '</p>' : '') + (busyNow ? '' : '<span class="btn-row"><button type="button" class="btn" data-cln="sug-reset" data-id="' + esc(j.id) + '">Suggest again</button></span>'), ''));
    });
    return rows.length ? '<ul class="cln-templates cln-weigh-list cln-sug-list" role="list">' + rows.join('') + '</ul>' : '<p class="hint" role="status">Nothing to change.</p>';
  }
  function sugDock() {
    var s = M.sug, pend = sugPending(), left = pend.filter(function (c) { var r = s.rows[c.id]; return !r || r.st !== 'refused'; }).length, failed = pend.length - left;
    var tried = pend.some(function (c) { return s.rows[c.id]; });
    var say = s.error ? '<span class="cln-weigh-err" role="alert">' + esc(s.error) + '</span>' : s.saving ? 'Saving ' + pend.length + (pend.length === 1 ? ' change' : ' changes') + ', 5 at a time...' : !pend.length ? (s.saved.length ? '<span class="lk-stamp">Saved</span> every change. They start tomorrow.' : 'Nothing to save.') : tried ? '<b>' + pend.length + ' not saved yet.</b>' + (failed ? ' ' + failed + ' refused: refresh, then suggest again.' : '') : '<b>Nothing is saved yet.</b>';
    var label = tried ? 'Send the rest' : 'Save ' + pend.length + (pend.length === 1 ? ' day' : ' days');
    return '<div class="cln-weigh-dock cln-sug-dock sv-dock"><span class="hint" role="status">' + say + '</span><span class="btn-row">' + (!s.saving ? '<button type="button" class="btn" data-cln="sug-drop">' + (pend.length ? 'Drop the suggestion' : 'Close') + '</button>' : '') +
      (pend.length ? '<button type="button" class="btn dark" data-cln="sug-save"' + (s.saving || !left ? ' disabled' : '') + '>' + (s.saving ? ink('Saving...') : esc(label)) + '</button>' : '') + '</span></div>';
  }
  // Save: 5 jobs at a time, one after another. A batch lands whole or not at all; a refused batch is tried one job at a
  // time to find the job the rules refuse. A lost answer stops here: Send the rest checks what landed first.
  function sugSave() {
    var s = M.sug; if (!s || s.saving || !C.moveTasks) return;
    if (s.day !== T.day()) { sugDrop('A new day began, so the suggestion was dropped. Press Suggest the days again.'); draw(); return; }
    if (teamOn() !== false) { s.error = 'Cleaning is on for the team now, so the book no longer moves days in bulk. Nothing more was saved.'; draw(); return; }
    var list = sugPending().filter(function (c) { var r = s.rows[c.id]; return !r || r.st !== 'refused'; }), model = M;
    if (!list.length) return;
    s.saving = true; s.error = ''; list.forEach(function (c) { s.rows[c.id] = { st: 'wait' }; }); draw();
    var title = function (c, task) { var every = task.plan && task.plan.repeat ? task.plan.repeat.days : 0; return c.anchor ? dateWords(c.anchor) + ', then every ' + (every % 7 ? every + ' days' : every / 7 + ' weeks') : dayWords(c.days) + ', was ' + dayWords(c.was); };
    var done = function (r, c) { var task = taskById(c.id); if (r.closed) putTask(r.closed); putTask(r.task); s.rows[c.id] = { st: 'saved', at: T.now() }; s.saved.push({ id: c.id, taskId: r.task.id, task: r.task, title: title(c, task || r.task), why: s.out.why[c.id] || '' }); };
    var stop = function (msg, st, from) { list.slice(from).forEach(function (c) { if (s.rows[c.id].st === 'wait' || s.rows[c.id].st === 'busy') s.rows[c.id] = { st: st, msg: msg }; }); };
    var send = function (batch) {
      batch.forEach(function (c) { s.rows[c.id] = { st: 'busy' }; }); draw();
      return C.moveTasks(batch.map(function (c) { var old = taskById(c.id); return { old: old, dows: c.anchor ? old.dows.slice() : c.days.slice(), anchor: c.anchor }; }))
        .then(function (results) { if (M !== model) return; results.forEach(function (r) { done(r, batch.filter(function (c) { return c.id === r.id; })[0]); }); });
    };
    var step = function (i) {
      if (M !== model) return null;
      if (i >= list.length) return null;
      // a job read again since (Refresh, or the page's own reload) may show this save already landed: its closed
      // revision names the new one, which came from the server, so it is Saved, never sent twice
      var batch = list.slice(i, i + 5).filter(function (c) {
        var t = taskById(c.id), n = t && t.until !== OPEN && t.next ? taskById(t.next) : null;
        if (t && t.until === OPEN) return true;
        if (n && n.prev === c.id && n.until === OPEN && (c.anchor ? n.plan && n.plan.repeat && n.plan.repeat.anchor === c.anchor : n.dows.slice().sort().join() === c.days.join())) { done({ task: n, closed: null }, c); return false; }
        s.rows[c.id] = { st: 'refused', msg: 'This job changed. Refresh, then suggest again.' }; return false;
      });
      if (!batch.length) return step(i + 5);
      return send(batch).then(function () { return step(i + 5); }, function (error) {
        if (M !== model) return null;
        (error && error.saved || []).forEach(function (r) { done(r, batch.filter(function (c) { return c.id === r.id; })[0]); });
        var code = error && error.code, ids = error && error.ids || [];
        if (ids.length && (code === 'stale' || code === 'invalid-argument')) {
          batch.forEach(function (c) { if (ids.indexOf(c.id) >= 0) s.rows[c.id] = { st: 'refused', msg: code === 'stale' ? 'This job changed. Refresh, then suggest again.' : 'This job cannot be saved as it is. Open it in Repeat tasks.' }; });
          var rest = batch.filter(function (c) { return ids.indexOf(c.id) < 0 && s.rows[c.id].st !== 'saved'; });
          return (rest.length ? send(rest) : Promise.resolve()).then(function () { return step(i + 5); }, function () { stop('Press Send the rest.', 'unsent', i); return null; });
        }
        if (code === 'permission-denied' && batch.length > 1) {
          // one at a time, to find the job the rules refuse; the others still save
          // every job of the batch is tried; one not sent stops the batches after it, which wait
          var lostOne = false, one = function (k) { if (k >= batch.length || M !== model) return Promise.resolve(); var c = batch[k]; if (s.rows[c.id].st === 'saved') return one(k + 1);
            return send([c]).then(function () { return one(k + 1); }, function (e) { if (M !== model) return null; if (e && e.code === 'permission-denied') s.rows[c.id] = { st: 'refused', msg: 'Refresh, then suggest again. Someone may have changed this job on another phone.' }; else { lostOne = true; s.rows[c.id] = { st: 'unsent', msg: (navigator.onLine === false ? 'No signal. ' : '') + 'Your choice is kept on this phone. Send the rest checks what landed first.' }; } return one(k + 1); }); };
          return one(0).then(function () { if (!lostOne) return step(i + 5); stop('Press Send the rest.', 'wait', i + 5); return null; });
        }
        if (code === 'permission-denied') { s.rows[batch[0].id] = { st: 'refused', msg: 'Refresh, then suggest again. Someone may have changed this job on another phone.' }; return step(i + 5); }
        if (code === 'cleaning-on') { s.error = 'Cleaning is on for the team now, so the book no longer moves days in bulk. Nothing more was saved.'; stop('Cleaning is on for the team.', 'refused', i); return null; }
        if (code === 'unauthenticated') { stop('Unlock with your PIN, then press Send the rest.', 'unsent', i); return null; }
        if (code === 'cancelled') { s.error = 'The day or the person on this phone changed. Nothing more was saved: press Send the rest.'; stop('Press Send the rest.', 'unsent', i); return null; }
        batch.forEach(function (c) { if (s.rows[c.id].st !== 'saved') s.rows[c.id] = { st: 'unsent', msg: (navigator.onLine === false ? 'No signal. ' : '') + 'Your choice is kept on this phone. Send the rest checks what landed first.' }; });
        return null;
      });
    };
    Promise.resolve(step(0)).then(function () { if (M !== model || !M.sug) return; s.saving = false; draw(); var st = M.root.querySelector('.cln-sug-dock [role="status"]'); if (st) { st.setAttribute('tabindex', '-1'); st.focus({ preventScroll: true }); } },
      function () { if (M !== model || !M.sug) return; s.saving = false; draw(); });
  }
  function editor() {
    if (!C.chef() || !M.editor) return '';
    if (M.weights) return weightsPage();
    var current = repeatTasks(), matching = repeatMatches(), d = M.draft; M.repeatPage = Math.max(0, Math.min(M.repeatPage, Math.ceil(matching.length / 6) - 1));
    var shownTasks = matching.slice(M.repeatPage * 6, M.repeatPage * 6 + 6), inline = d && M.editId && shownTasks.some(function (task) { return task.id === M.editId; });
    var items = shownTasks.map(function (task, i) { return '<li class="cln-template-item" role="listitem" data-template="' + esc(task.id) + '"><div class="cln-template-summary" style="--cln-row:' + (i + 1) + '"><div><b>' + esc(task.text) + '</b><small>' + esc(task.area + ' · ' + owner(task, T.day())) + '</small><small>' + esc(templateLabel(task)) + (task.from > T.at(T.day()) ? ' · Starts ' + esc(shortDay(T.day(task.from))) : '') + '</small></div><div class="cln-template-actions"><button type="button" class="p-link" data-cln="edit" data-id="' + esc(task.id) + '"' + (M.saveBusy || M.archiveBusy ? ' disabled' : '') + '>Edit</button><button type="button" class="p-link" data-cln="archive" data-id="' + esc(task.id) + '"' + (M.saveBusy || M.archiveBusy ? ' disabled' : '') + '>' + (M.archiveBusy === task.id ? ink('Archiving...') : B.armed && B.armed('cln-archive-' + task.id) ? 'Tap again to archive' : 'Archive') + '</button></div></div>' + (d && M.editId === task.id ? editorBlock(false) : '') + '</li>'; }).join('');
    if (d && !inline) items = '<li class="cln-template-item cln-new-editor" role="listitem">' + editorBlock(!!M.editId) + '</li>' + items;
    if (!d) items += '<li class="cln-template-item cln-new-editor" role="listitem"><div class="cln-editor"><p class="hint">Choose Edit beside a task, or Add cleaning task. One editor opens here.</p></div></li>';
    return '<section class="nb-page cln-plan" aria-labelledby="rtitle"><header class="nb-ph"><div><h2 class="nb-title" id="rtitle" tabindex="-1">Cleaning</h2><p class="nb-date" id="cln-plan-title" tabindex="-1">Repeat tasks' + (M.state === 'ok' ? ' · ' + current.length + ' current tasks' : '') + '</p></div><button type="button" class="p-link" data-cln="hide-setup">Back to Today</button></header><div class="cln-plan-body">' + readLine() + earlierNotice() +
      '<p class="hint">New tasks start today. Changes and archiving start tomorrow. Earlier cleaning records stay as recorded.</p>' + firstDateNotice() + weightsNotice() + workNotices(tasksOn(T.day()), T.day()) +
      (M.state === 'error' ? clnFailLine() : M.state !== 'ok' ? loading() : '') +
      (M.saveError && !d ? '<p class="p-err" role="alert">' + esc(M.saveError) + '</p>' : '') +
      '<div class="cln-repeat-browser"><div class="cln-searchbar"><label class="visually-hidden" for="cln-repeat-search">Find a repeat task in all groups</label><input type="search" class="search" id="cln-repeat-search" data-cln-control="repeat-query" placeholder="Find a repeat task or area" value="' + esc(M.repeatQuery) + '"><button type="button" class="btn dark" data-cln="add"' + (M.state !== 'ok' || M.saveBusy || M.archiveBusy ? ' disabled' : '') + '>Add cleaning task</button></div><label class="field" for="cln-repeat-group"><span class="label">Work group</span><select id="cln-repeat-group" data-cln-control="repeat-group"><option value="all">All groups</option>' + CHEF_GROUPS.map(function (group) { return '<option value="' + group[0] + '"' + (M.repeatGroup === group[0] ? ' selected' : '') + '>' + esc(group[1]) + '</option>'; }).join('') + '</select></label>' + (M.repeatQuery.trim() ? '<p class="hint cln-repeat-scope" role="status">Searching all groups. Clear search to use the selected work group.</p>' : '') + pager(matching.length, M.repeatPage, 'repeat-page', M.repeatGroup) +
      (!matching.length ? '<p class="hint" role="status">' + (current.length ? 'No tasks match this search or group.' : M.state === 'ok' ? 'No repeat tasks set yet. Add a task or load a schedule below.' : 'The task list is not available yet. Your draft is kept.') + '</p>' : '') + '<ul class="cln-templates cln-repeat-layout" role="list">' + items + '</ul></div><div class="cln-setup-imports">' + importPanel() + '</div></div></section>';
  }
  function readLine(packDown, own) {
    return '<div class="cln-readline"><span class="hint">' + (M.state === 'ok' ? 'Checked ' + esc(T.clock(M.readAt)) : 'Cleaning, with who and when') + '</span>' +
      (packDown ? '<button type="button" class="p-link" data-cln="pack-down-jump" aria-controls="cln-packdown-' + T.day() + '">Go to ' + (own ? esc(own) + ' pack down' : 'Pack down') + '</button>' : '') +
      '<button type="button" class="p-link" data-cln="refresh"' + (M.state === 'loading' || busy() ? ' disabled' : '') + '>Refresh</button></div>';
  }
  function draw() {
    if (!shown()) return;
    if (!C.allowed()) { M.root.innerHTML = ''; return; }
    if (M.readAgain && !busy()) { M.readAgain = false; load(true); return; }
    /* A section that becomes known after the list was read is taken once: the cook answers Your section today, or the
       Today's team plan arrives. It never replaces a section already leading, and never while a tick is sending, so the
       list cannot reorder under a thumb (docs/cleaning-schedule.md, Your section first). */
    if (M.state === 'ok' && !busy()) { if (M.leadStale || !M.lead) M.lead = leadNow(); else if (M.lead.screen && !M.lead.own && C.section) M.lead.own = C.section(); M.leadStale = false; }
    var active = document.activeElement, focusAttribute = active && ['data-cln-field', 'data-cln-plan', 'data-cln-repeat', 'data-cln-control'].filter(function (attribute) { return active.hasAttribute(attribute); })[0], field = focusAttribute && active.getAttribute(focusAttribute), action = active && M.root.contains(active) && active.getAttribute('data-cln');
    var focusAttrs = {}; if (action) ['data-id', 'data-day', 'data-dow', 'data-group', 'data-page', 'data-cln-direction'].forEach(function (attribute) { if (active.hasAttribute(attribute)) focusAttrs[attribute] = active.getAttribute(attribute); }); if (action === 'group-page' || action === 'repeat-page') delete focusAttrs['data-page'];
    var pos = focusAttribute && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;
    var today = tasksOn(T.day()), totals = workTotals(today, T.day()), chef = C.chef(), week = chef && M.view === 'week', setup = chef && M.view === 'setup';
    // a cook's day: its groups and what leads, worked out once for the read line and the list
    var staffGroups = !chef && M.state === 'ok' && today.length ? groups(today, T.day()) : null, staffPlan = staffGroups ? leadPlan(staffGroups) : null;
    var toolbar = chef ? '<div class="cln-toolbar"><div class="chips" role="group" aria-label="Cleaning view"><button type="button" class="chip" data-cln="today" aria-pressed="' + (!week && !setup) + '">Today</button><button type="button" class="chip" data-cln="week" aria-pressed="' + week + '">Week</button><button type="button" class="chip" data-cln="setup" aria-pressed="' + setup + '" aria-expanded="' + setup + '" aria-controls="cln-plan-title">Repeat tasks</button></div>' + (!setup && M.draft ? '<button type="button" class="p-link cln-draft-return" data-cln="setup">' + (dirtyDraft() ? 'Unsaved repeat task' : 'Return to repeat task') + '</button>' : '') + '</div>' : '';
    M.root.innerHTML = '<div class="nb-wrap cln-page' + (chef ? ' cln-chef-page' : '') + '" data-cln-view="' + (setup ? 'setup' : week ? 'week' : 'today') + '">' + toolbar + (setup ? editor() :
      '<section class="nb-page cln-book" aria-labelledby="rtitle"><header class="nb-ph"><div><h2 class="nb-title" id="rtitle" tabindex="-1">Cleaning</h2><span class="nb-date">' + esc(week ? 'Week commencing ' + longDay(M.week) : longDay(T.day())) + '</span></div>' + (!week && M.state === 'ok' && today.length ? '<div class="nb-prog cln-progress">' + totals.complete + '/' + totals.total + '<small>' + (totals.events ? 'recorded; repeats apply' : 'done today') + '</small></div>' : '') + '</header>' + readLine(!chef && M.state === 'ok' && today.some(packSection), staffPlan && staffPlan.mate && staffPlan.mate.name) +
      '<div class="cln-temperature"><button type="button" class="p-link" data-cln="temperature" aria-expanded="' + M.temperatureOpen + '">Temperature logs: morning and before dinner service</button>' + (M.temperatureOpen ? '<p class="hint">Temperature logs must be completed first thing in the morning and before dinner service. The temperature log is not connected here. Record readings in the venue\'s temperature log. Cleaning checks do not record or validate temperatures.</p>' : '') + '</div>' + earlierNotice() +
      (!week && M.state === 'ok' && (totals.events || totals.awaiting || totals.blocked) ? '<p class="hint cln-coverage">' + (totals.events ? 'Record every required service, prep or use. The count covers known occurrences; repeat coverage is not configured. ' : '') + (totals.awaiting ? totals.awaiting + ' awaiting Pass check. ' : '') + (totals.blocked ? totals.blocked + ' unable to complete.' : '') + '</p>' : '') +
      '<div class="nb-body cln-body">' + (M.state === 'error' ? clnFailLine() : M.state !== 'ok' ? loading() : week ? weekly() : chef ? chefDaily(T.day()) : daily(T.day(), staffGroups, staffPlan)) + '</div></section>') + '</div>';
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
    var model = M, pack = kind === 'packdown', section = kind === 'section', source = window.LK_CLEANING_SCHEDULE, templates = pack ? source.packDownDrafts() : section ? source.sectionDrafts() : source.drafts();
    // which panel this load reports in: M.importError and so on, M.packImport..., M.sectionImport...
    var slot = pack ? 'packImport' : section ? 'sectionImport' : 'import';
    templates.forEach(function (task) { if (task.plan.verification) task.plan.verifiers = (M.importVerifiers || []).slice(); });
    if (section) templates.forEach(function (task) {
      var id = source.sectionGroupOf(task), group = source.sectionGroups.filter(function (item) { return item.id === id; })[0], chosen = group ? sectionChoice(group) : '_shared';
      if (chosen !== '_shared') { task.shared = false; task.section = chosen; }
    });
    M.importBusy = true; M.importKind = kind || 'cleaning'; M[slot + 'Error'] = M[slot + 'Text'] = ''; M[slot + 'Open'] = true; draw();
    C.importTasks(templates).then(function (data) {
      if (M !== model) return; M.importBusy = false; M.cache = Object.create(null); M.range = data.from + '|' + data.to; useData(data); M.importVerifiers = [];
      var waiting = section ? needFirstDate().length : 0;
      var message = 'Loaded ' + (pack ? 'pack down schedule' : section ? 'section cleaning' : 'cleaning schedule') + ': ' + data.imported + ' added, ' + data.skipped + ' already present. ' + (waiting ? waiting + (waiting === 1 ? ' repeat job needs' : ' repeat jobs need') + ' a first date in Repeat tasks. ' : '') + 'Review responsibilities and procedures before releasing it to the team.';
      M[slot + 'Text'] = message; draw();
      if (M.view === 'week') load(true);
    }, function (error) { if (M !== model) return; M.importBusy = false; M[slot + 'Error'] = error && error.message || 'Could not load the schedule. Your choices are kept. Try again.'; draw(); });
  }
  function flowAction(task, day, slot, kind, action, workerId, control) {
    if (!hasPlan(task) || !workEnabled(task, day)) return;
    var item = flowList(task, day).filter(function (entry) { return entry.slot === slot; })[0] || { slot: slot, kind: kind, record: null }, d = workDraft(task, day, item), key = flowKey(task, day, slot), model = M;
    if (action === 'perform' && !task.plan.checks.every(function (label) { return d.checked.indexOf(label) >= 0; })) { M.flowErrors[key] = 'Finish every required check before recording this clean.'; draw(); return; }
    if ((action === 'block' || action === 'reopen') && !d.note.trim()) { M.flowErrors[key] = action === 'block' ? 'Write why this clean cannot be completed.' : 'Write a reason before reopening this clean.'; draw(); return; }
    if (action === 'perform' && C.shared() && !workerId) { openPicker(task, day, { slot: slot, kind: kind, control: control }); return; }
    var sheet = picker, options = { slot: slot, kind: kind, checked: d.checked.slice(), note: d.note.trim() };
    M.pending[occurrence(task, day)] = { slot: slot, kind: kind, control: control || action }; delete M.flowErrors[key]; delete M.flowSaved[key];
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
    flowAction(task, day, slot, kind, 'save', null, 'add');
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
    M.editor = true; M.view = 'setup'; M.editId = task ? task.id : ''; if (task) { var selectedIndex = repeatMatches().map(function (item) { return item.id; }).indexOf(task.id); if (selectedIndex >= 0) M.repeatPage = Math.floor(selectedIndex / 6); } M.draft = draftFor(task); M.original = JSON.stringify(M.draft); M.newW = 0; M.newK = ''; M.saveError = M.savedText = M.saveState = ''; draw();
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
    if (key === 'addkind') { if (M.newK !== input.value) { M.newK = KINDS.indexOf(input.value) >= 0 ? input.value : ''; patchAddDay(); } return; }
    if (key === 'section') { M.draft.shared = input.value === '_shared'; M.draft.section = M.draft.shared ? '' : input.value; }
    else M.draft[key] = input.value;
    M.saveError = M.savedText = M.saveState = ''; clearTimeout(savedTimer); patchSave();
    if (key === 'section' && addOn()) patchAddDay();
  }
  function save() {
    if (!C.chef() || !M.draft || !dirtyDraft() || M.saveBusy) return;
    if (M.state !== 'ok' || M.editId && !taskById(M.editId)) { M.saveError = 'Refresh cleaning before saving this task. Your changes are kept.'; draw(); return; }
    var d = M.draft, error = !d.text.trim() ? 'Write the cleaning task.' : !d.area.trim() ? 'Choose or write the area or equipment.' : !d.shared && !C.sections().some(function (s) { return s.id === d.section; }) ? 'Choose the responsible section.' : !d.dows.length ? 'Choose at least one repeat day.' : d.plan && d.plan.repeat && !(Number.isInteger(d.plan.repeat.days) && d.plan.repeat.days >= 2 && d.plan.repeat.days <= 30) ? 'Repeat every 2 to 30 days, whole days only.' : d.plan && d.plan.verification && cannotCheck(d.plan.verifiers).length ? cannotCheck(d.plan.verifiers).map(checkerName).join(', ') + ' cannot do the Pass check. Untick them, or give them Tick in Staff.' : '';
    if (error) { M.saveError = error; M.saveState = 'error'; draw(); return; }
    var model = M, old = M.editId ? taskById(M.editId) : null, weigh = old ? null : addWeigh(), today = T.dow(T.at(T.day())); M.saveBusy = true; M.saveError = M.savedText = ''; M.saveState = 'busy'; draw();
    // a new job's weight goes in the job's own batch (step 4c): both land, or neither
    C.saveTask(Object.assign({}, d, { text: d.text.trim(), area: d.area.trim(), dows: d.dows.slice() }), old, weigh).then(function (result) {
      if (M !== model) return; M.saveBusy = false; if (result.closed) putTask(result.closed); putTask(result.task); M.editId = result.task.id;
      var root = jobKey(result.task), landed = result.weighed, note = '';
      if (landed) { M.plan.w[root] = landed.w; if (landed.k) M.plan.k[root] = landed.k; }
      // an earlier send landed after its answer was lost, with another weight or none: the weight chosen now is sent apart
      if (result.recovered && weigh && (!landed || landed.w !== weigh.w || landed.k !== weigh.k) && C.planSave) {
        var w1 = {}, k1 = {}; w1[root] = weigh.w; k1[root] = weigh.k;
        C.planSave(w1, k1).then(function () { M.plan.w[root] = weigh.w; if (weigh.k) M.plan.k[root] = weigh.k; else delete M.plan.k[root]; },
          function () { if (M !== model) return; M.savedText += ' Its weight did not save: set it in Weights and days.'; patchSave(); });
      }
      M.newW = 0; M.newK = '';
      if (landed && !result.recovered) note = ' ' + WEIGHTS[landed.w] + (landed.k ? ', ' + landed.k.toLowerCase() : '') + ': its weight is saved.';
      if (result.recovered) { M.original = JSON.stringify(draftFor(result.task)); M.saveState = ''; M.savedText = 'Earlier save confirmed. Your further changes are kept; save them to apply from tomorrow.'; draw(); return; }
      var tonight = !old && result.task.from <= T.at(T.day()) && result.task.dows.indexOf(today) >= 0;
      M.draft = draftFor(result.task); M.original = JSON.stringify(M.draft); M.saveState = 'done'; M.savedText = 'Saved ' + result.task.text + '. ' + (result.task.from > T.at(T.day()) ? 'Starts tomorrow.' : tonight ? 'Starts today: due at tonight\'s close.' : 'Starts today.') + note; draw();
      savedTimer = setTimeout(function () { if (M === model && M.saveState === 'done') { M.saveState = ''; patchSave(); } }, 1400);
    }, function (error) { if (M !== model) return; M.saveBusy = false; M.saveState = 'error'; M.saveError = error && error.code === 'stale' ? 'This repeat task changed. Refresh and choose its current version. Your changes are kept.' : weigh && error && error.code === 'permission-denied' ? 'Refused: nothing was saved, neither the job nor its weight. Your changes are kept.' : error && error.message || 'Could not save. Your changes are kept. Try again.'; draw(); });
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
    if (busy() && ['refresh', 'today', 'week', 'setup', 'first-date', 'previous', 'next', 'this-week'].indexOf(action) >= 0) { P.toast('Wait for the cleaning change to save.'); return; }
    if (M.weights && weighDirty() && ['weights-back', 'today', 'week', 'setup', 'hide-setup'].indexOf(action) >= 0) { M.wError = 'Save your weight changes, or Undo changes, before leaving.'; patchWeigh(); var sv = M.root.querySelector('[data-cln="weights-save"]'); if (sv) sv.focus(); }
    else if (M.weights && (sugDirty() || M.sug && M.sug.saving) && ['weights-back', 'today', 'week', 'setup', 'hide-setup'].indexOf(action) >= 0) { M.sug.error = M.sug.saving ? 'Wait for the save to finish.' : 'Save the days, or Drop the suggestion, before leaving.'; M.wFilter = 'changes'; draw(); var sb = M.root.querySelector('[data-cln="sug-save"]:not([disabled])') || M.root.querySelector('.cln-sug-dock [role="status"]'); if (sb) { sb.setAttribute('tabindex', sb.tagName === 'BUTTON' ? '0' : '-1'); sb.focus(); } }
    else if (M.weights && daysDirty() && ['weights-back', 'today', 'week', 'setup', 'hide-setup'].indexOf(action) >= 0) { M.dError = 'Save the days, or Undo, before leaving.'; patchDays(); var sd = M.root.querySelector('[data-cln="days-save"]'); if (sd) sd.focus(); }
    else if (action === 'tick' && task) tick(task, button.getAttribute('data-day'));
    else if (action === 'details' && hasPlan(task)) { var detailDay = button.getAttribute('data-day'), detailKey = occurrence(task, detailDay); M.expanded[detailKey] = !M.expanded[detailKey]; draw(); }
    else if (action === 'week-details' && hasPlan(task) && C.chef()) { M.selected = button.getAttribute('data-day'); M.expanded[occurrence(task, M.selected)] = true; draw(); var detail = M.root.querySelector('#cln-detail-' + occurrence(task, M.selected)); if (detail) { detail.setAttribute('tabindex', '-1'); detail.focus({ preventScroll: true }); } }
    else if (action === 'group' && C.chef()) { var group = button.getAttribute('data-group'); M.workGroup = M.workGroup === group ? '' : group; M.workPage = 0; draw(); }
    else if (action === 'group-page' && C.chef()) { M.workPage = Math.max(0, +button.getAttribute('data-page') || 0); draw(); }
    else if (action === 'repeat-page' && C.chef()) { M.repeatPage = Math.max(0, +button.getAttribute('data-page') || 0); draw(); }
    else if (action === 'clear-work' && C.chef()) { M.workQuery = ''; M.workFilter = 'all'; M.workPage = 0; draw(); }
    else if (action === 'exception' && C.chef() && task) { var exceptionDay = button.getAttribute('data-day'); if (M.view === 'setup') { M.view = exceptionDay === T.day() ? 'today' : 'week'; M.selected = exceptionDay; M.week = monday(exceptionDay); } M.workQuery = ''; M.workFilter = 'all'; M.workGroup = chefGroupId(task); var exceptionGroup = chefGroups(tasksOn(exceptionDay)).filter(function (group) { return group.id === M.workGroup; })[0]; M.workPage = exceptionGroup ? Math.max(0, Math.floor(exceptionGroup.tasks.map(function (item) { return item.id; }).indexOf(task.id) / 6)) : 0; M.expanded[occurrence(task, exceptionDay)] = true; if (M.range !== range().join('|') || M.state === 'idle' || M.state === 'error') load(); draw(); var target = M.root.querySelector('#cln-detail-' + occurrence(task, exceptionDay)) || Array.prototype.filter.call(M.root.querySelectorAll('[data-cln-row]'), function (element) { return element.getAttribute('data-cln-row') === occurrence(task, exceptionDay); })[0]; if (target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'nearest' }); } }
    else if (action === 'temperature') { M.temperatureOpen = !M.temperatureOpen; draw(); }
    else if (action === 'pack-down-jump') {
      var packHeading = M.root.querySelector('#cln-packdown-' + T.day()) || M.root.querySelector('.cln-packdown-title');
      if (packHeading) { packHeading.focus({ preventScroll: true }); packHeading.scrollIntoView({ block: 'start' }); }
    }
    else if (action === 'discard-earlier') { if (!earlierDrafts().length || B.arm && !B.arm('cln-discard-earlier', draw)) return; earlierDrafts().forEach(function (key) { delete M.workDrafts[key]; delete M.flowErrors[key]; delete M.flowSaved[key]; }); M.earlierCleared = 'Undone: earlier unsaved cleaning checks. Saved records were kept.'; draw(); var confirmation = M.root.querySelector('.cln-earlier-status'); if (confirmation) confirmation.focus({ preventScroll: true }); P.toast('Undone: earlier unsaved cleaning checks'); }
    else if (action === 'import-schedule') importSchedule();
    else if (action === 'import-packdown') importSchedule('packdown');
    else if (action === 'import-section') importSchedule('section');
    else if (action === 'first-date' && C.chef() && task) { M.repeatQuery = ''; M.repeatGroup = 'all'; startEditor(task); var firstDate = M.root.querySelector('#cln-repeat-anchor'); if (firstDate) firstDate.focus(); }
    else if (action === 'flow-add' && hasPlan(task)) addFlow(task, button.getAttribute('data-day'), button.getAttribute('data-kind'));
    else if (action === 'flow-discard' && hasPlan(task)) { var discardKey = flowKey(task, button.getAttribute('data-day'), button.getAttribute('data-slot')); delete M.workDrafts[discardKey]; delete M.flowErrors[discardKey]; draw(); }
    else if (action === 'flow-quick' && hasPlan(task)) { var quickDay = button.getAttribute('data-day'), quickSlot = button.getAttribute('data-slot'), quickKind = button.getAttribute('data-kind'), quickCurrent = flowRecord(task, quickDay, quickSlot); if (quickCurrent && quickCurrent.done) { if (!C.canUndo(quickCurrent)) return; workDraft(task, quickDay, { slot: quickSlot, kind: quickKind, record: quickCurrent }).note = 'Undo by recorder'; flowAction(task, quickDay, quickSlot, quickKind, 'reopen', null, 'quick'); } else flowAction(task, quickDay, quickSlot, quickKind, 'perform', null, 'quick'); }
    else if (hasPlan(task) && ['flow-save', 'flow-block', 'flow-perform', 'flow-verify', 'flow-reopen'].indexOf(action) >= 0) flowAction(task, button.getAttribute('data-day'), button.getAttribute('data-slot'), button.getAttribute('data-kind'), action.slice(5));
    else if (action === 'refresh') { if (M.sug && !M.sug.saving) sugDrop('Refreshed: the jobs were read again, so press Suggest the days again.'); load(true); if (M.view === 'setup' && C.chef() && !M.wBusy) loadPlan(true); }
    else if (action === 'weights' && C.chef()) { M.weights = true; M.wError = ''; draw(); loadPlan(); var wh = M.root.querySelector('#cln-plan-title'); if (wh) wh.focus(); }
    else if (action === 'weights-back' && C.chef()) { M.weights = false; draw(); var wb = M.root.querySelector('[data-cln="weights"]'); if (wb) wb.focus(); else { var rh = M.root.querySelector('#cln-plan-title'); if (rh) rh.focus(); } }
    else if (action === 'weights-retry' && C.chef()) { M.plan.state = 'idle'; loadPlan(); draw(); }
    else if (action === 'weights-filter' && C.chef()) { var wf = button.getAttribute('data-f'); M.wFilter = wf === 'none' ? 'none' : wf === 'changes' && M.sug ? 'changes' : 'all'; draw(); var fc = M.root.querySelector('.cln-weigh-filter [data-f="' + M.wFilter + '"]'); if (fc) fc.focus({ preventScroll: true }); }
    else if (action === 'weights-undo' && C.chef() && !M.wBusy) { M.wDraft = {}; M.kDraft = {}; M.wError = ''; draw(); }
    else if (action === 'weights-save' && C.chef()) saveWeights();
    else if (action === 'sug-start' && C.chef()) sugStart();
    else if (action === 'sug-save' && C.chef()) sugSave();
    else if (action === 'sug-drop' && C.chef() && M.sug && !M.sug.saving) { var had = M.sug.saved.length; sugDrop(had ? 'Saved changes stay. The rest was dropped.' : 'Suggestion dropped. Nothing was saved.'); draw(); var ss = M.root.querySelector('[data-cln="sug-start"]'); if (ss) ss.focus(); }
    else if (['sug-rule', 'sug-keep', 'sug-other', 'sug-reset'].indexOf(action) >= 0 && C.chef() && M.sug && M.sug.state === 'ready' && !M.sug.saving) {
      var sid = button.getAttribute('data-id'), sg2 = M.sug, focusId = sid;
      if (action === 'sug-rule') { var rule = button.getAttribute('data-rule'); if (rule === 'twoHeavy' || rule === 'cap') sg2[rule] = !sg2[rule]; }
      else if (action === 'sug-keep') sg2.keep[sid] = true;
      else if (action === 'sug-other') { var ch2 = sg2.changes.filter(function (c) { return c.id === sid; })[0]; if (ch2) sg2.avoid[sid] = (sg2.avoid[sid] || []).concat(ch2.days); }
      else { delete sg2.keep[sid]; delete sg2.avoid[sid]; delete sg2.pick[sid]; }
      sg2.error = ''; sugRun(); draw();
      // focus stays with the job that was changed, or the rule pressed
      var back2 = action === 'sug-rule' ? M.root.querySelector('[data-cln="sug-rule"][data-rule="' + button.getAttribute('data-rule') + '"]') : Array.prototype.filter.call(M.root.querySelectorAll('.cln-sug-row'), function (row) { return row.getAttribute('data-template') === focusId; })[0];
      if (back2) { var bt = back2.matches('button') ? back2 : back2.querySelector('button') || back2; if (!bt.matches('button')) bt.setAttribute('tabindex', '-1'); bt.focus({ preventScroll: true }); }
    }
    else if (action === 'days-fold' && C.chef()) { M.daysOpen = !M.daysOpen; patchDays(); if (M.daysOpen) loadStaff(); var df = M.root.querySelector('[data-cln="days-fold"]'); if (df) df.focus({ preventScroll: true }); }
    else if (action === 'day-level' && canDays() && !M.dBusy) { var dl = dayLevels().slice(), dd = +button.getAttribute('data-dow'); if (QUIET.indexOf(dd) < 0) { dl[dd] = +button.getAttribute('data-w'); M.dDraft = dl; M.dError = ''; M.dSaved = 0; patchDays(); } }
    else if (action === 'days-suggest' && canDays() && !M.dBusy) { var sg = daySuggest(M.staff), dn = dayLevels().slice(); if (sg) { [0, 1, 2, 3, 4].forEach(function (x) { if (sg[x]) dn[x] = sg[x]; }); M.dDraft = dn; M.dError = ''; M.dSaved = 0; patchDays(); } }
    else if (action === 'days-undo' && canDays() && !M.dBusy) { M.dDraft = null; M.dError = ''; patchDays(); }
    else if (action === 'days-save' && canDays()) saveDays();
    else if (action === 'weigh' && C.chef() && task && !M.wBusy) {
      var wk = jobKey(task), wv = +button.getAttribute('data-w');
      M.wDraft[wk] = wv; M.wError = ''; M.wSaved = 0;
      Array.prototype.forEach.call(button.parentNode.querySelectorAll('[data-cln="weigh"]'), function (chip) { chip.setAttribute('aria-pressed', String(+chip.getAttribute('data-w') === wv)); });
      var meta = button.closest('.cln-weigh-row').querySelector('.cln-weigh-meta'); if (meta) meta.textContent = rhythm(task);
      patchWeigh();
    }
    else if (action === 'today' || action === 'week') { M.view = action === 'week' && C.chef() ? 'week' : 'today'; draw(); load(); }
    else if (C.chef() && (action === 'previous' || action === 'next' || action === 'this-week')) { M.week = action === 'this-week' ? monday(T.day()) : shift(M.week, action === 'previous' ? -7 : 7); M.selected = M.week <= T.day() && T.day() <= shift(M.week, 6) ? T.day() : M.week; draw(); load(); }
    else if (action === 'day' && C.chef()) { M.selected = button.getAttribute('data-day'); M.workPage = 0; draw(); }
    else if (action === 'setup' && C.chef()) { M.editor = true; M.view = 'setup'; M.weights = false; draw(); if (M.state === 'idle') load(); else loadPlan(); var heading = M.root.querySelector('#cln-plan-title'); if (heading) heading.focus(); }
    else if (action === 'hide-setup' && C.chef()) { if (dirtyDraft() || M.saveBusy) { M.saveError = 'Save or undo your unsaved changes before closing.'; draw(); } else { M.editor = false; M.view = 'today'; draw(); load(); } }
    else if (action === 'add') startEditor(null);
    else if (action === 'edit' && task) startEditor(task);
    else if (action === 'archive' && task) archive(task);
    else if (action === 'repeat' && M.draft && !M.saveBusy) { var dow = +button.getAttribute('data-dow'), i = M.draft.dows.indexOf(dow); if (i < 0) M.draft.dows.push(dow); else M.draft.dows.splice(i, 1); M.draft.dows.sort(); M.saveError = M.savedText = M.saveState = ''; if (addOn()) patchAddDay(); else button.setAttribute('aria-pressed', String(i < 0)); patchSave(); }
    else if (action === 'add-weight' && M.draft && !M.saveBusy && addOn()) { var wv = +button.getAttribute('data-w'); M.newW = M.newW === wv ? 0 : wv; patchAddDay(); }
    else if (action === 'add-planner' && addOn()) { M.addLoad = ''; patchAddDay(); }
    else if (action === 'revert' && !M.saveBusy) { if (C.discardAttempt) C.discardAttempt(); M.draft = JSON.parse(M.original); M.newW = 0; M.newK = ''; M.saveError = M.savedText = M.saveState = ''; draw(); }
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
    if (M.sug && !M.sug.saving) sugDrop('A new day began, so the suggestion was dropped. Press Suggest the days again.');
    M.today = T.day(); M.selected = T.day(); M.week = monday(T.day()); closePicker(true, true); clearReads(); draw(); load(); return true;
  }
  function mount(root) { if (!C.act || !C.importTasks || !C.due || !window.LK_CLEANING_SCHEDULE || !K || K.api !== 1) { root.innerHTML = '<p class="hint" role="status">Reload the book to use the current cleaning schedule.</p><button type="button" class="btn dark" data-act="reload">Reload</button>'; return; } access(); M.root = root; checkDay(); draw(); load(); }
  function unmount() { closePicker(true, true); clearTimeout(boundaryTimer); M.root = null; generation++; if (M.state === 'loading') M.state = 'idle'; }
  document.addEventListener('click', click);
  document.addEventListener('input', function (event) { if (M.root && M.root.contains(event.target) && event.target.hasAttribute('data-cln-field')) changeField(event.target); });
  document.addEventListener('change', function (event) { if (M.root && M.root.contains(event.target) && event.target.hasAttribute('data-cln-field')) changeField(event.target); });
  document.addEventListener('input', function (event) { if (!M.root || !M.root.contains(event.target)) return; if (event.target.hasAttribute('data-cln-note') || event.target.hasAttribute('data-cln-check')) changeWork(event.target); else if (event.target.hasAttribute('data-cln-plan') || event.target.hasAttribute('data-cln-repeat')) changePlan(event.target); });
  document.addEventListener('change', function (event) {
    if (!M.root || !M.root.contains(event.target)) return;
    if (event.target.hasAttribute('data-cln-check')) changeWork(event.target);
    else if (event.target.hasAttribute('data-cln-verifier') || event.target.hasAttribute('data-cln-plan') || event.target.hasAttribute('data-cln-repeat')) changePlan(event.target);
    else if (event.target.hasAttribute('data-cln-import-section') && !M.importBusy) (M.importSections || (M.importSections = {}))[event.target.getAttribute('data-cln-import-section')] = event.target.value;
    else if (event.target.hasAttribute('data-cln-import-verifier') && !M.importBusy) { var id = event.target.getAttribute('data-cln-import-verifier'), ids = M.importVerifiers || (M.importVerifiers = []), at = ids.indexOf(id); if (event.target.checked && at < 0) ids.push(id); else if (!event.target.checked && at >= 0) ids.splice(at, 1); }
  });
  document.addEventListener('toggle', function (event) { if (event.target.classList && event.target.classList.contains('cln-import')) { if (event.target.classList.contains('cln-pack-import')) M.packImportOpen = event.target.open; else if (event.target.classList.contains('cln-section-import')) M.sectionImportOpen = event.target.open; else M.importOpen = event.target.open; } }, true);
  document.addEventListener('input', function (event) { if (M.root && M.root.contains(event.target) && event.target.hasAttribute('data-cln-control') && event.target.tagName === 'INPUT') changeControl(event.target); });
  document.addEventListener('change', function (event) { if (M.root && M.root.contains(event.target) && event.target.hasAttribute('data-cln-control') && event.target.tagName === 'SELECT') changeControl(event.target); });
  // Pick a date on a monthly job's suggestion: a real date from tomorrow; the rest is planned again around it
  document.addEventListener('change', function (event) {
    var el = event.target; if (!M.root || !M.root.contains(el) || !el.hasAttribute('data-cln-sugdate') || !C.chef() || !M.sug || M.sug.state !== 'ready' || M.sug.saving) return;
    var id = el.getAttribute('data-cln-sugdate'), v = el.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || T.day(T.at(v)) !== v || v <= T.day()) { M.sug.error = 'Pick a date from tomorrow.'; draw(); return; }
    M.sug.pick[id] = v; delete M.sug.avoid[id]; M.sug.error = ''; sugRun(); draw();
    var back = M.root.querySelector('[data-cln-sugdate="' + id + '"]'); if (back) back.focus({ preventScroll: true });
  });
  // a job's kind on Weights and days: kept as this page's work, no redraw (see patchWeigh)
  document.addEventListener('change', function (event) {
    var el = event.target; if (!M.root || !M.root.contains(el) || !el.hasAttribute('data-cln-kind') || !C.chef() || M.wBusy) return;
    var task = taskById(el.getAttribute('data-cln-kind')); if (!task) return;
    M.kDraft[jobKey(task)] = KINDS.indexOf(el.value) >= 0 ? el.value : ''; M.wError = ''; M.wSaved = 0; patchWeigh();
  });
  document.addEventListener('submit', function (event) { if (event.target.id === 'cln-form') { event.preventDefault(); save(); } });
  document.addEventListener('click', function (event) {
    if (!popup || !popup.contains(event.target)) return; var button = event.target.closest('[data-cln-person], [data-cln-picker]'); if (!button || button.disabled) return; event.preventDefault();
    var action = button.getAttribute('data-cln-picker'), person = button.getAttribute('data-cln-person');
    if (action === 'cancel') closePicker();
    else if (action === 'others' && picker && !picker.busy) { picker.others = !picker.others; drawPicker(); var first = popup.querySelector('.cln-others button'); if (first) first.focus({ preventScroll: true }); }
    else if (action === 'refresh') { closePicker(); load(true); }
    else if (person && pickerValid() && !picker.busy && !picker.failed) { if (picker.flow) flowAction(picker.task, picker.day, picker.flow.slot, picker.flow.kind, 'perform', person, picker.flow.control); else tick(picker.task, picker.day, person); }
  });
  document.addEventListener('keydown', function (event) { if (!popup) return; if (event.key === 'Escape') { event.preventDefault(); closePicker(); } if (event.key === 'Tab') { var pane = popup.querySelector('.pt-sheet'); if (picker.busy) { event.preventDefault(); pane.focus({ preventScroll: true }); } else B.trapTab(event, pane, 'button:not([disabled]), input:not([disabled])'); } });
  ['lk-access', 'lk-who', 'lk-admin', 'lk-cfg', 'lk-feat'].forEach(function (name) { window.addEventListener(name, function () { var open = access(); draw(); if (open && shown()) { drawPicker(); load(); } }); });
  window.addEventListener('lk-clock', checkDay);
  window.addEventListener('focus', function () { if (shown()) checkDay(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && shown()) checkDay(); });
  window.addEventListener('beforeunload', function (event) { if (dirty() && !(window.LK_UPDATE && window.LK_UPDATE.letGo && window.LK_UPDATE.letGo())) { event.preventDefault(); event.returnValue = ''; } });
  // This screen's section was changed, here or in another tab on this device: take it at the next draw that is not
  // waiting on a tick (draw() reads M.leadStale), so the change is never dropped and never lands mid-tick
  window.addEventListener('lk-device-section', function () { M.leadStale = true; if (shown() && M.state === 'ok') draw(); });
  window.LK_CLEANING = { api: 2, mount: mount, unmount: unmount, reset: reset, dirty: dirty, busy: busy, overlay: function () { return !!popup; } };
})();
