/* The verified admin's proofreading desk. Drafts and private history stay in this access context's memory. */
(function () {
  'use strict';
  var api, context = '', state;
  function reset() {
    context = '';
    state = { tab: 'corrections', selected: null, draft: null, draftOpen: false, word: '', message: '', error: false, busy: false, saving: '', history: null, historyLoading: false, historyError: false, historyRequest: 0, origin: null };
  }
  reset();
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function valid() { return !!(api && api.allowed() && api.context() === context); }
  function bind(adapter) {
    if (adapter) api = adapter;
    if (!api || !api.allowed()) { reset(); return false; }
    if (context !== api.context()) { reset(); context = api.context(); }
    return true;
  }
  function redraw() { if (valid()) api.draw(); }
  function button(action, text, value, disabled, cls) {
    return '<button type="button" class="btn' + (cls ? ' ' + esc(cls) : '') + '" data-pr="' + esc(action) + '"' + (value != null ? ' data-value="' + esc(value) + '"' : '') + (disabled ? ' disabled' : '') + '>' + esc(text) + '</button>';
  }
  function key(row) { return row.source + '/' + row.day + '/' + row.id; }
  function source(row) { return row.source === 'orders' ? 'Staff orders' : 'Prep'; }
  function day(row) { return api.dayLabel ? api.dayLabel(row.day) : row.day; }
  function person(id) { var p = api.person && api.person(id); return p && typeof p === 'object' ? p.name || id : p || id || 'Admin'; }
  function clock(at) {
    if (api.clock) return api.clock(at);
    return new Date(at).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  }
  function normalWord(s) { return String(s || '').trim().toLowerCase(); }
  function rowsData() { return api.rows(); }
  function eligible(rows) { return (rows || []).filter(function (r) { return r.id && r.orig && r.orig !== r.text && !r.deleted && !r.fn; }); }
  function currentRows() { return eligible(rowsData().rows); }
  function notify(message, error) { state.message = message; state.error = !!error; }
  function statusHTML() {
    if (state.busy) return '<p class="hint pr-status" role="status" aria-live="polite">' + esc(state.saving) + ' Keep this page open until it is saved.</p>';
    return state.message ? '<p class="' + (state.error ? 'p-err' : 'ai-outcome') + ' pr-status" role="status" aria-live="polite">' + esc(state.message) + '</p>' : '';
  }
  function focusDetail() {
    var el = document.querySelector('.pr-detail .ai-task-heading'), detail = document.querySelector('.pr-detail');
    if (!el) return;
    el.focus({ preventScroll: true });
    if (window.innerWidth < 1100) window.scrollTo(0, 0);
    else if (detail) detail.scrollIntoView({ block: 'start' });
  }
  function returnToList() {
    redraw();
    var from = state.origin;
    if (!from) return;
    Array.prototype.some.call(document.querySelectorAll('[data-pr="review"]'), function (el) {
      if (el.getAttribute('data-value') !== from.key) return false;
      el.focus({ preventScroll: true }); return true;
    });
    window.scrollTo(0, from.y || 0);
  }
  function busy() { return valid() && state.busy; }
  function backLabel() {
    if (!valid() || !api.onPage()) return '';
    return state.selected || state.draftOpen || state.tab !== 'corrections' ? 'Back to corrections' : '';
  }
  function back() {
    if (!valid() || !api.onPage()) return false;
    if (state.busy) return true;
    if (state.selected || state.draftOpen) { state.selected = null; state.draftOpen = false; returnToList(); return true; }
    if (state.tab !== 'corrections') { state.tab = 'corrections'; redraw(); return true; }
    return false;
  }
  function resumeHTML(adapter) {
    if (!bind(adapter) || !state.draft || api.onPage() && state.tab === 'corrections' && state.draftOpen) return '';
    return '<aside class="ai-resume pr-resume" role="status"><strong>Unfinished correction</strong><p class="hint">Your wording for ' + esc(state.draft.row.text) + ' is kept in this tab.</p>' + button('resume', 'Resume correction', null, state.busy) + '</aside>';
  }
  function tabsHTML() {
    return '<div class="btn-row pr-tabs" role="group" aria-label="Proofreader pages">' + [['corrections', 'Corrections'], ['words', 'Always keep'], ['history', 'Admin history']].map(function (tab) {
      return '<button type="button" class="chip" data-pr="tab" data-value="' + tab[0] + '" aria-pressed="' + (state.tab === tab[0]) + '"' + (state.busy ? ' disabled' : '') + '>' + tab[1] + '</button>';
    }).join('') + '</div>';
  }
  function changedWords(row) {
    var saved = String(row.text || '').toLowerCase().match(/[a-z\u00c0-\u024f]+/g) || [], seen = {};
    return (String(row.orig || '').toLowerCase().match(/[a-z\u00c0-\u024f]+/g) || []).filter(function (word) {
      if (!/^[a-z]{2,40}$/.test(word) || saved.indexOf(word) >= 0 || seen[word]) return false;
      seen[word] = true; return true;
    });
  }
  function preventionHTML(row) {
    var words = changedWords(row), kept = api.words() || [];
    return '<details class="ai-help pr-prevention"><summary>Stop this word being changed again</summary><p class="hint">Always keep protects an individual word on every staff device once its settings arrive. It does not change existing lines.</p>' +
      (words.length ? '<div class="btn-row pr-suggestions">' + words.map(function (word) { return kept.indexOf(word) >= 0 ? '<span class="hint">' + esc(word) + ' is always kept.</span>' : button('keep-suggested', 'Always keep ' + word, word, state.busy); }).join('') + '</div>' : '<p class="hint">Add a word on the Always keep page.</p>') + '</details>';
  }
  function detailHTML() {
    var row = state.draftOpen && state.draft ? state.draft.row : state.selected;
    if (!row) return '<aside class="ai-idle-context"><p class="eyebrow">Before you begin</p><h3>Review a changed line</h3><p>Compare what was typed with what was saved. Restore the original or write the wording the team should see.</p><p class="hint">A correction changes one saved line. Always keep prevents a word being changed on other devices. Admin history records both actions.</p></aside>';
    var draft = state.draftOpen && state.draft, limit = row.source === 'orders' ? 120 : 160;
    var out = '<div class="ai-editor pr-editor" aria-busy="' + state.busy + '"><div class="ai-task-secondary">' + button('back', 'Back to corrections', null, state.busy) + '</div>' +
      '<header class="ai-task-header"><p class="eyebrow ai-task-kicker">' + esc(source(row) + ' · ' + day(row)) + '</p><h3 class="ai-task-heading" data-k="pr-task-heading" tabindex="-1">' + (draft ? 'Edit wording' : 'Review correction') + '</h3><p class="hint ai-task-note">Changes apply to this saved line only. Rolled copies stay as they are. Its quantity, ticks and original author stay the same.</p></header>' +
      '<dl class="pr-comparison"><div><dt>Typed originally</dt><dd>' + esc(row.orig) + '</dd></div><div><dt>Saved now</dt><dd>' + esc(row.text) + '</dd></div></dl>';
    if (draft) {
      out += '<div class="field"><label class="label" for="pr-text">Wording for the team</label><input id="pr-text" class="search" data-k="pr-field-text" data-pr-field="text" maxlength="' + limit + '" value="' + esc(draft.text) + '" autocomplete="off" spellcheck="false" aria-describedby="pr-text-note"' + (state.busy ? ' disabled' : '') + '><p class="hint" id="pr-text-note">Saved without autocorrect. Maximum ' + limit + ' characters.</p></div>' +
        '<div class="ai-task-actions">' + button('save', state.busy && state.saving === 'Saving correction.' ? 'Saving correction…' : 'Save correction', null, state.busy || !draft.text.trim() || draft.text.trim() === row.text, 'dark') + button('cancel', 'Cancel', null, state.busy) + '</div>';
    } else {
      out += '<div class="ai-task-actions">' + button('restore', 'Restore original', null, state.busy, 'dark') + button('edit', 'Edit wording', null, state.busy) + '</div>';
    }
    return out + preventionHTML(row) + '<p class="hint">Recipe links are cleared when wording changes. Original wording stays in the correction history.</p></div>';
  }
  function correctionsHTML() {
    var data = rowsData(), rows = eligible(data.rows);
    var queue = '<header class="ai-queue-head"><div><p class="eyebrow ai-queue-kicker">Review desk</p><h3 class="ai-queue-title">Changed wording</h3></div><div class="pr-queue-meta"><span class="ai-queue-count">' + rows.length + '</span>' + button('refresh', 'Refresh', null, state.busy) + '</div></header>' +
      '<p class="hint ai-queue-intro">Prep from the last 60 days and staff orders from the last 30 days. Review lines where autocorrect saved different wording.</p>';
    if (data.loading) queue += '<p class="hint" role="status">Loading saved corrections...</p>';
    if (data.miss && data.miss.length) queue += '<p class="p-err" role="status">Some days could not load. This list may be incomplete. Refresh when the connection returns.</p>';
    queue += '<div class="pr-list">' + api.listHTML({
      key: 'pr-corrections', items: rows, step: 15, tools: 6, noun: ['correction', 'corrections'], ph: 'Search typed or saved wording', empty: data.loading ? 'Waiting for saved lines.' : 'No changed lines in the loaded days.',
      find: function (r) { return r.orig + ' ' + r.text + ' ' + r.by + ' ' + source(r) + ' ' + r.day; },
      filters: [['all', 'All'], ['prep', 'Prep', function (r) { return r.source === 'prep'; }], ['orders', 'Staff orders', function (r) { return r.source === 'orders'; }]],
      sorts: [['new', 'Newest first', function (a, b) { return b.day.localeCompare(a.day) || key(a).localeCompare(key(b)); }], ['az', 'Typed A to Z', function (a, b) { return a.orig.toLowerCase().localeCompare(b.orig.toLowerCase()); }]],
      card: function (r) {
        var selected = state.draftOpen && state.draft ? state.draft.row : state.selected;
        return '<li><button type="button" class="ai-review-row" data-pr="review" data-value="' + esc(key(r)) + '" aria-current="' + (!!selected && key(selected) === key(r)) + '"' + (state.busy ? ' disabled' : '') + '><strong>Typed: ' + esc(r.orig) + '</strong><span class="hint">Saved: ' + esc(r.text) + '</span><small>' + esc(source(r) + ' · ' + day(r)) + '</small><span class="visually-hidden">Review correction</span></button></li>';
      }
    }) + '</div>';
    return '<div class="ai-desk' + (state.selected || state.draftOpen ? ' has-detail' : '') + '"><section class="ai-queue">' + queue + '</section><section class="ai-detail pr-detail" aria-label="Current proofreading review">' + detailHTML() + '</section></div>';
  }
  function wordsHTML() {
    var words = (api.words() || []).slice().sort();
    return '<section class="set-block"><h3 class="ai-queue-title">Words to always keep</h3><p class="hint">These exact words are left alone by autocorrect across the kitchen. Add one word at a time, for example brie. Uppercase and lowercase are treated alike. This does not replace wording on existing lines.</p><div class="pr-word-form"><div class="field"><label class="label" for="pr-word">Word to keep</label><input id="pr-word" class="search" data-k="pr-field-word" data-pr-field="word" maxlength="40" value="' + esc(state.word) + '" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="pr-word-note"' + (state.busy ? ' disabled' : '') + '><p class="hint" id="pr-word-note">Use 2 to 40 letters, a to z. Up to 200 shared words.</p></div>' + button('keep', state.busy ? 'Saving…' : 'Always keep this word', null, state.busy || words.length >= 200, 'dark') + '</div><p class="hint">' + words.length + ' of 200 shared words. Removing a word lets the usual autocorrect rules apply again. Immediate Undo still keeps a word only on that device.</p><div class="pr-words">' + api.listHTML({
      key: 'pr-words', items: words, step: 20, tools: 8, noun: ['word', 'words'], ph: 'Search shared words', empty: 'No shared words yet.', find: function (word) { return word; },
      cols: [{ h: 'Always keep', th: true, html: esc }, { h: '', html: function (word) { return button('release', 'Remove from shared list', word, state.busy); } }]
    }) + '</div></section>';
  }
  function loadHistory() {
    if (state.history !== null || state.historyLoading || state.historyError) return;
    var s = state, c = context, request = ++s.historyRequest;
    s.historyLoading = true;
    Promise.resolve().then(function () { if (state !== s || context !== c || request !== s.historyRequest || !valid()) return []; return api.history(); }).then(function (events) {
      if (state !== s || context !== c || request !== s.historyRequest || !valid()) return;
      s.history = events || []; s.historyLoading = false; redraw();
    }, function () {
      if (state !== s || context !== c || request !== s.historyRequest || !valid()) return;
      s.historyLoading = false; s.historyError = true; redraw();
    });
  }
  function eventLabel(event) { return event.kind === 'word' ? event.action === 'keep' ? 'Word always kept' : 'Word removed from shared list' : event.action === 'restore' ? 'Original restored' : 'Wording edited'; }
  function historyHTML() {
    loadHistory();
    var out = '<section class="set-block pr-history"><h3 class="ai-queue-title">Admin correction history</h3><p class="hint">The 100 most recent manual changes. Automatic corrections appear on the Corrections page.</p><div class="btn-row">' + button('history-refresh', 'Refresh history', null, state.busy || state.historyLoading) + '</div>';
    if (state.historyLoading) return out + '<p class="hint" role="status">Loading admin history...</p></section>';
    if (state.historyError) return out + '<p class="p-err" role="status">Could not load history. Check the connection and refresh history.</p></section>';
    return out + api.listHTML({
      key: 'pr-history', items: (state.history || []).slice().sort(function (a, b) { return b.at - a.at; }), step: 15, tools: 8, noun: ['change', 'changes'], ph: 'Search admin changes', empty: 'No manual changes yet.',
      find: function (event) { return [eventLabel(event), event.before, event.after, event.word, person(event.by), event.day].join(' '); },
      cols: [
        { h: 'Change', th: true, html: function (event) { return esc(eventLabel(event)) + '<span class="hint">' + esc(event.kind === 'line' ? source(event) + ' · ' + day(event) : 'Shared word list') + '</span>'; } },
        { h: 'Wording', html: function (event) { return event.kind === 'word' ? esc(event.word) : '<span class="hint">Before</span> ' + esc(event.before) + '<br><span class="hint">After</span> ' + esc(event.after); } },
        { h: 'Saved by', html: function (event) { return esc(person(event.by)) + '<span class="hint">' + esc(clock(event.at)) + '</span>'; } }
      ]
    }) + '</section>';
  }
  function errorText(error) {
    var code = error && error.code || '';
    if (code === 'stale') return 'This line or shared list changed elsewhere. Your entries are kept. Cancel and Refresh to review the current line, or try the word again with the latest shared list.';
    if (code === 'offline' || code === 'unavailable') return 'Could not save without a connection. Your entries are kept. Reconnect and try again.';
    if (code === 'permission-denied') return 'The change was not saved. Check that the verified admin is still signed in. Your entries are kept.';
    return 'The change was not saved. Your entries are kept. Check the connection and try again.';
  }
  function perform(message, action, success) {
    if (!valid() || state.busy) return;
    var s = state, c = context;
    s.busy = true; s.saving = message; s.message = ''; s.error = false; redraw();
    Promise.resolve().then(function () { if (state !== s || context !== c || !valid()) return; return action(); }).then(function () {
      if (state !== s || context !== c || !valid()) return;
      s.busy = false; s.saving = ''; s.historyRequest++; s.history = null; s.historyLoading = false; s.historyError = false; success(); redraw();
    }, function (error) {
      if (state !== s || context !== c || !valid()) return;
      s.busy = false; s.saving = ''; notify(errorText(error), true); redraw();
    });
  }
  function save(action) {
    var row = state.draftOpen && state.draft ? state.draft.row : state.selected;
    if (!row) return;
    var text = action === 'restore' ? row.orig : state.draft && state.draft.text.trim();
    var limit = row.source === 'orders' ? 120 : 160;
    if (!text || text.length > limit || text === row.text) { notify('Enter different wording, up to ' + limit + ' characters.', true); redraw(); return; }
    perform('Saving correction.', function () { return api.save(row, text, action); }, function () {
      state.selected = null; state.draft = null; state.draftOpen = false;
      notify(action === 'restore' ? 'Original wording restored. The saved line and admin history are updated.' : 'Correction saved. The saved line and admin history are updated.');
    });
  }
  function keep(word, keepIt) {
    word = normalWord(word);
    if (!/^[a-z]{2,40}$/.test(word)) { notify('Enter one word using 2 to 40 letters, a to z.', true); redraw(); return; }
    var words = api.words() || [];
    if (keepIt && words.indexOf(word) >= 0) { notify(word + ' is already always kept.'); redraw(); return; }
    if (keepIt && words.length >= 200) { notify('The shared list has 200 words. Remove a word before adding another.', true); redraw(); return; }
    perform(keepIt ? 'Saving shared word.' : 'Removing shared word.', function () { return api.word(word, keepIt); }, function () {
      if (normalWord(state.word) === word) state.word = '';
      notify(keepIt ? word + ' will be left alone on staff devices once their settings update.' : word + ' was removed from the shared list. Usual autocorrect can apply again.');
    });
  }
  function click(el) {
    el = el && el.closest ? el.closest('[data-pr]') : null;
    if (!el || !valid()) return false;
    var action = el.getAttribute('data-pr'), value = el.getAttribute('data-value');
    if (state.busy || el.disabled) return true;
    if (action === 'resume') {
      if (!state.draft) return true;
      state.tab = 'corrections'; state.draftOpen = true; state.selected = state.draft.row;
      api.page(); redraw(); focusDetail(); return true;
    }
    if (action === 'back') { back(); return true; }
    if (action === 'tab') { if (['corrections', 'words', 'history'].indexOf(value) >= 0) state.tab = value; state.message = ''; redraw(); return true; }
    if (action === 'review') {
      if (state.draft) { notify('Resume or cancel your unfinished correction first.'); redraw(); return true; }
      var row = currentRows().filter(function (r) { return key(r) === value; })[0];
      if (!row) { notify('This line is no longer in the loaded corrections. Refresh the list.', true); redraw(); return true; }
      state.selected = Object.assign({}, row); state.origin = { key: value, y: window.scrollY || 0 }; state.message = ''; redraw(); focusDetail(); return true;
    }
    if (action === 'edit') {
      if (!state.selected) return true;
      state.draft = { row: Object.assign({}, state.selected), text: state.selected.text }; state.draftOpen = true; state.message = ''; redraw();
      var field = document.getElementById('pr-text'); if (field) field.focus(); return true;
    }
    if (action === 'cancel') { state.draft = null; state.draftOpen = false; state.selected = null; state.message = ''; returnToList(); return true; }
    if (action === 'save' || action === 'restore') { save(action === 'restore' ? 'restore' : 'edit'); return true; }
    if (action === 'keep' || action === 'keep-suggested') { keep(action === 'keep' ? state.word : value, true); return true; }
    if (action === 'release') { keep(value, false); return true; }
    if (action === 'refresh') {
      if (state.draft) notify('Resume or cancel your unfinished correction before refreshing.');
      else { state.selected = null; state.message = ''; api.refresh(); }
      redraw(); return true;
    }
    if (action === 'history-refresh') { state.historyRequest++; state.history = null; state.historyLoading = false; state.historyError = false; redraw(); return true; }
    return false;
  }
  function input(el) {
    if (!el || !valid() || state.busy) return false;
    var field = el.getAttribute('data-pr-field');
    if (field === 'text' && state.draft) {
      state.draft.text = el.value;
      var saveButton = document.querySelector('[data-pr="save"]');
      if (saveButton) saveButton.disabled = !el.value.trim() || el.value.trim() === state.draft.row.text;
      return true;
    }
    if (field === 'word') { state.word = el.value; return true; }
    return false;
  }
  window.LK_PROOFREADER = {
    API: 1, reset: reset, click: click, input: input, busy: busy, back: back, backLabel: backLabel, resumeHTML: resumeHTML,
    dirty: function () { return valid() && (!!state.draft || !!state.word.trim()); },
    render: function (adapter) {
      if (!bind(adapter)) return '';
      return '<div class="ai-workspace pr-workspace">' + resumeHTML() + tabsHTML() + statusHTML() + (state.tab === 'words' ? wordsHTML() : state.tab === 'history' ? historyHTML() : correctionsHTML()) + '</div>';
    }
  };
})();
