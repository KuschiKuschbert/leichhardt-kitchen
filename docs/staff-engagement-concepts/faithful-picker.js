/* Workshop only: inserts a picker into the real prep DOM. Native tick, roles and Undo remain unchanged. */
(function () {
  'use strict';
  var preview = window.LK_PREVIEW = window.LK_PREVIEW || {};
  if (!(preview.contributions instanceof Map)) preview.contributions = new Map();
  preview.mode = ['shared', 'phone', 'original'].indexOf(preview.mode) >= 0 ? preview.mode : 'shared';
  var picking = null, expanded = false, bypass = false, scheduled = false, restored = new Map();
  var app = document.getElementById('app') || document.body;
  function state() { return window.LK_PREP && window.LK_PREP.state; }
  function people(s) { return (s && s.config && s.config.people || []).filter(function (p) { return p.active !== false; }); }
  function person(s, id) { return people(s).filter(function (p) { return p.id === id; })[0]; }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function currentDay() { return window.LK_TIME && window.LK_TIME.day ? window.LK_TIME.day() : ''; }
  function recent(s) {
    try {
      var saved = JSON.parse(localStorage.getItem('lk.prep.here') || 'null');
      if (!saved || saved.d !== currentDay() || !Array.isArray(saved.ids)) return [];
      return saved.ids.filter(function (id, index, ids) { return ids.indexOf(id) === index && !!person(s, id); }).slice(0, 12).map(function (id) { return person(s, id); });
    } catch (e) { return []; }
  }
  function entry(s, id) { return (s && s.items || []).filter(function (item) { return item.id === id; })[0]; }
  function tickTarget(s, id, date) {
    if (!s || !s.root) return null;
    return Array.prototype.filter.call(s.root.querySelectorAll('.nb-row .nb-box[data-p="tick"]'), function (el) { return el.getAttribute('data-id') === id && el.getAttribute('data-d') === date; })[0] || null;
  }
  function close(restoreFocus) {
    var was = picking, s = state(), node = document.getElementById('lk-attribution-picker');
    if (node) node.remove();
    if (was) { var target = tickTarget(s, was.id, was.date); if (target) { target.removeAttribute('aria-expanded'); target.removeAttribute('aria-controls'); if (restoreFocus) target.focus({ preventScroll: true }); } }
    picking = null; expanded = false;
  }
  function validPicker(s) {
    var item = picking && entry(s, picking.id);
    return !!(picking && s && s.name === 'prep' && s.root && document.body.contains(s.root) && s.pin === picking.pin && s.who === picking.recorder && s.date === picking.date && item && !item.done && !item.deleted && tickTarget(s, item.id, s.date));
  }
  function choices(list, group) { return list.map(function (p) { return '<button type="button" class="lk-attribution-name" data-fp="choose" data-person="' + esc(p.id) + '" data-fp-group="' + group + '">' + esc(p.name) + '</button>'; }).join(''); }
  function insert(focus, revealOthers) {
    var s = state();
    if (!validPicker(s)) { close(false); return; }
    var target = tickTarget(s, picking.id, picking.date), row = target.closest('.nb-row'), existing = document.getElementById('lk-attribution-picker');
    if (existing && existing.previousElementSibling === row && !focus) return;
    if (existing) existing.remove();
    var first = recent(s), rest = people(s).filter(function (p) { return !first.some(function (r) { return r.id === p.id; }); });
    var picker = document.createElement('li');picker.id = 'lk-attribution-picker';picker.className = 'lk-attribution';
    picker.innerHTML = '<fieldset aria-describedby="lk-attribution-help"><legend id="lk-attribution-title" tabindex="-1">Who did this?</legend><div class="lk-attribution-body"><p id="lk-attribution-help">' + (first.length ? 'Signed in on this screen today, most recent first.' : 'Choose the person who did the work.') + '</p><div class="lk-attribution-names" data-fp-recent>' + choices(first, 'recent') + '</div><div class="lk-attribution-tools">' + (rest.length ? '<button type="button" class="lk-attribution-quiet" data-fp="others" aria-expanded="' + expanded + '" aria-controls="lk-attribution-others">Others…</button>' : '') + '<button type="button" class="lk-attribution-quiet" data-fp="cancel">Cancel</button></div>' + (expanded ? '<div class="lk-attribution-others" id="lk-attribution-others"><p>Other active people</p><div class="lk-attribution-names">' + choices(rest, 'others') + '</div></div>' : '') + '</div></fieldset>';
    row.insertAdjacentElement('afterend', picker);
    target.setAttribute('aria-expanded', 'true');target.setAttribute('aria-controls', picker.id);
    if (focus) {
      var field = revealOthers ? picker.querySelector('[data-fp-group="others"]') : picker.querySelector('legend');
      if (field) field.focus({ preventScroll: true });
      (revealOthers ? picker.querySelector('.lk-attribution-others') : picker).scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }
  function rememberContribution(s, item, doer) {
    var recorder = person(s, s.who), date = s.date, at = window.LK_TIME && window.LK_TIME.now ? window.LK_TIME.now() : 0;
    if (!recorder || !doer) return null;
    var record = { date: date, id: item.id, itemId: item.id, doer: doer.id, doerId: doer.id, doerName: doer.name, recorder: recorder.id, recorderId: recorder.id, recorderName: recorder.name, at: at, pending: true };
    preview.contributions.set(date + '/' + item.id, record);
    setTimeout(function () { var saved = preview.contributions.get(date + '/' + item.id); if (saved === record && saved.pending) { preview.contributions.delete(date + '/' + item.id); schedule(); } }, 5000);
    return record;
  }
  function choose(id) {
    var s = state();if (!validPicker(s)) { close(false); return; }
    var doer = person(s, id), item = entry(s, picking.id), target = tickTarget(s, picking.id, picking.date);
    if (!doer || !target || target.disabled) return;
    rememberContribution(s, item, doer);close(false);
    target.focus({ preventScroll: true });
    bypass = true;try { target.click(); } finally { bypass = false; }
    schedule();
  }
  function override(el, text, title) {
    if (!el) return;
    if (!restored.has(el)) restored.set(el, { text: el.textContent, title: el.getAttribute('title') });
    if (el.textContent !== text) el.textContent = text;
    if (el.getAttribute('title') !== title) el.setAttribute('title', title);
  }
  function restore(el, saved) { if (el.isConnected) { if (el.textContent !== saved.text) el.textContent = saved.text; if (saved.title == null) el.removeAttribute('title'); else el.setAttribute('title', saved.title); } restored.delete(el); }
  function sync() {
    scheduled = false;var s = state();
    if (picking) insert(false, false);
    var credited = new Set();
    if (s && s.root && s.name === 'prep') {
      preview.contributions.forEach(function (record, key) {
        if (record.date !== s.date) return;
        var item = entry(s, record.id);
        if (item && (item.deleted || !item.done && !record.pending)) { preview.contributions.delete(key); return; }
        if (!item || !item.done) return;
        record.pending = false;
        if (preview.mode === 'original') return;
        var at = window.LK_TIME && window.LK_TIME.clock && item.doneAt ? window.LK_TIME.clock(item.doneAt) : '';
        Array.prototype.forEach.call(s.root.querySelectorAll('[data-ln]'), function (row) {
          if (row.getAttribute('data-ln') !== key) return;
          var el = row.matches('.nb-row.is-done') ? row.querySelector('.nb-wrote') : row.closest('.nb-done') ? row.querySelector('.nb-dw') : null;
          if (!el) return;
          credited.add(el);override(el, record.doerName + (row.matches('.nb-row') && at ? ' ' + at : ''), 'Done by ' + record.doerName + '. Recorded by ' + record.recorderName + '. Preview attribution only.');
        });
      });
    }
    restored.forEach(function (saved, el) { if (!credited.has(el)) restore(el, saved); });
  }
  function schedule() { if (scheduled) return;scheduled = true;requestAnimationFrame(sync); }
  document.addEventListener('click', function (event) {
    var choice = event.target.closest && event.target.closest('[data-fp]');
    if (choice && choice.closest('#lk-attribution-picker')) {
      event.preventDefault();event.stopImmediatePropagation();
      if (choice.getAttribute('data-fp') === 'cancel') close(true);
      else if (choice.getAttribute('data-fp') === 'others') { expanded = !expanded;insert(true, expanded); }
      else if (choice.getAttribute('data-fp') === 'choose') choose(choice.getAttribute('data-person'));
      return;
    }
    if (bypass || preview.mode === 'original') return;
    var s = state(), target = event.target.closest && event.target.closest('[data-p="tick"]');
    if (target && s && s.name === 'prep' && s.authed && s.who && s.root && s.root.contains(target) && target.closest('.nb-row')) {
      var id = target.getAttribute('data-id'), date = target.getAttribute('data-d') || s.date, item = entry(s, id), nativeBox = tickTarget(s, id, date);
      if (item && !item.done && !item.deleted && nativeBox && !nativeBox.disabled) {
        if (preview.mode === 'phone') { close(false);rememberContribution(s, item, person(s, s.who));schedule();return; }
        event.preventDefault();event.stopImmediatePropagation();
        if (picking && picking.id === id && picking.date === date) { close(true);return; }
        close(false);picking = { id: id, date: date, pin: s.pin, recorder: s.who };insert(true, false);return;
      }
    }
    if (picking) { var picker = document.getElementById('lk-attribution-picker');if (!picker || !event.composedPath().includes(picker)) close(false); }
  }, true);
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && picking) { event.preventDefault();event.stopPropagation();close(true); } }, true);
  window.addEventListener('hashchange', function () { close(false);schedule(); });
  window.addEventListener('lk-back', schedule);
  var observer = new MutationObserver(schedule);observer.observe(app, { childList: true, subtree: true });
  window.LK_ATTRIBUTION = {
    setMode: function (mode) { preview.mode = ['shared', 'phone', 'original'].indexOf(mode) >= 0 ? mode : 'shared';close(false);schedule();return preview.mode; },
    getMode: function () { return preview.mode; },
    reset: function () { close(false);preview.contributions.clear();restored.forEach(function (saved, el) { restore(el, saved); });schedule(); },
    close: function () { close(true); }
  };
  window.addEventListener('message', function (event) {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    var data = event.data;
    if (!data || data.type !== 'kitchen-preview-mode' || ['shared', 'phone', 'original'].indexOf(data.mode) < 0) return;
    window.LK_ATTRIBUTION.setMode(data.mode);
  });
  schedule();
})();
