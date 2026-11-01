/* Shared progressive controls. Native fields keep values, validation and existing write handlers.
   UI state stays in memory; no new reads or persistent copies. */
(function () {
  'use strict';
  var serial = 0, activePicker = null, searches = new WeakMap(), searchMemory = new Map(), syncing = false, lastTrigger = null;
  var slice = function (nodes) { return Array.prototype.slice.call(nodes); };
  function node(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function labelText(label) { var copy = label.cloneNode(true); slice(copy.querySelectorAll('select,input,button,datalist')).forEach(function (x) { x.remove(); }); return copy.textContent.trim(); }
  function labelFor(el) {
    var id = el.getAttribute('aria-labelledby');
    if (id) return id.split(/\s+/).map(function (x) { return (document.getElementById(x) || {}).textContent || ''; }).join(' ').trim();
    return el.getAttribute('aria-label') || (el.labels && el.labels.length && labelText(el.labels[0])) ||
      ((el.closest('.field, .a-f, .w-pick, fieldset, .set-block') || el.parentNode).querySelector('.label, legend, .nb-ql') || {}).textContent || el.placeholder || 'Choose';
  }
  function identity(el) {
    if (el.id) return '#' + CSS.escape(el.id);
    var attrs = slice(el.attributes).filter(function (a) { return /^data-(k|f|fl|sf|i|sid|col|dwf|ai-field)$/.test(a.name); });
    return el.tagName.toLowerCase() + attrs.map(function (a) { return '[' + a.name + '="' + CSS.escape(a.value) + '"]'; }).join('');
  }
  function emit(el, type) { syncing = true; try { el.dispatchEvent(new Event(type, { bubbles: true })); } finally { syncing = false; } }

  // Search keeps the visible draft separate from the query delivered to the page's existing filter.
  function SmartSearchBar(input, options) {
    if (searches.has(input)) return searches.get(input);
    options = options || {};
    var key = location.hash + '|' + identity(input), old = searchMemory.get(key);
    var s = old && old.query === input.value ? old : { query: input.value.trim(), raw: input.value, blurred: false, replacing: false, timer: null };
    if (old) clearTimeout(old.timer);
    searches.set(input, s); searchMemory.set(key, s);
    if (searchMemory.size > 150) searchMemory.delete(searchMemory.keys().next().value);
    var placeholder = input.placeholder || 'Search', wrap = node('span', 'ux-search'), clear = node('button', 'ux-search-clear', '×');
    input.parentNode.insertBefore(wrap, input); wrap.appendChild(input); wrap.appendChild(clear);
    clear.type = 'button'; clear.setAttribute('aria-label', 'Clear search'); input.dataset.smartSearch = 'true';
    // Old route-specific X controls have the same job; show only the shared reset.
    slice(wrap.parentNode.querySelectorAll(':scope > .find-x, :scope > .g-qx')).forEach(function (x) { x.hidden = true; });
    function paint() {
      input.value = s.raw;
      input.placeholder = s.replacing ? "Filtering by '" + s.query + "' — type 2+ chars for new search" : placeholder;
      clear.hidden = !(s.query || s.raw); input.dataset.committedQuery = s.query;
    }
    function commit(value) {
      clearTimeout(s.timer); s.query = value.trim(); s.replacing = false; searchMemory.set(key, s);
      var raw = s.raw; input.value = s.query;
      if (options.onQuery) options.onQuery(s.query);
      else {
        emit(input, 'input');
        // The review desk's searches submit local forms rather than filtering on input.
        if (input.isConnected && input.form && input.form.matches('[data-ai-search], [data-ai-reference-search]')) input.form.requestSubmit();
      }
      s.raw = raw; if (input.isConnected) paint();
    }
    s.reset = function () { s.raw = ''; s.blurred = false; s.replacing = false; commit(''); paint(); };
    input.addEventListener('focus', function () {
      if (s.blurred && s.query.length >= 2) { clearTimeout(s.timer); s.raw = ''; s.replacing = true; }
      s.blurred = false; paint();
    });
    input.addEventListener('blur', function () {
      if (s.replacing && s.raw.trim().length < 2) s.raw = s.query;
      s.replacing = false; s.blurred = true; paint();
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); s.raw = input.value; commit(s.raw); }
    });
    input.addEventListener('compositionend', function () { input.dispatchEvent(new Event('input', { bubbles: true })); });
    clear.addEventListener('pointerdown', function (e) { e.preventDefault(); });
    clear.addEventListener('click', function () { s.reset(); input.focus(); });
    s.receive = function (e) {
      s.raw = input.value; clearTimeout(s.timer); paint();
      if (e.isComposing) return;
      if (s.raw.trim().length >= 2) { var requested = s.raw; s.timer = setTimeout(function () { if (input.isConnected) commit(requested); }, options.delay == null ? 150 : options.delay); }
      // Empty or one-character drafts leave the old results on screen. X explicitly clears them.
    };
    paint(); return s;
  }
  document.addEventListener('input', function (e) {
    if (syncing) return;
    var s = searches.get(e.target); if (!s) return;
    e.stopImmediatePropagation(); s.receive(e);
  }, true);
  document.addEventListener('change', function (e) { if (!syncing && searches.has(e.target)) e.stopImmediatePropagation(); }, true);

  function AdaptivePicker(config) {
    if (activePicker) activePicker.close();
    var dialog = node('dialog', 'ux-picker' + (config.className ? ' ' + config.className : '')), heading = node('h2', '', config.label || 'Choose');
    var header = node('header', 'ux-picker-head'), close = node('button', 'ux-picker-close', '×'), grip = node('div', 'ux-picker-grip');
    var list = node('div', 'ux-picker-options'), footer = node('footer', 'ux-picker-footer');
    var selected = (config.value || []).slice(), items = config.items || [], query = '', cursor = -1, startY;
    var compact = items.length <= (config.threshold == null ? 12 : config.threshold), rowHeight = 56;
    dialog.id = 'ux-picker-' + (++serial); heading.id = dialog.id + '-title'; dialog.setAttribute('aria-labelledby', heading.id);
    dialog.setAttribute('aria-modal', 'true'); grip.setAttribute('aria-hidden', 'true'); close.type = 'button'; close.setAttribute('aria-label', 'Close picker');
    header.appendChild(grip); header.appendChild(heading); header.appendChild(close); dialog.appendChild(header);
    list.classList.add(compact ? 'ux-picker-chips' : 'ux-picker-list'); list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', config.label || 'Choices');
    if (config.multiple) list.setAttribute('aria-multiselectable', 'true');
    var search, apply;
    cursor = items.findIndex(function (item) { return selected.indexOf(item.value) >= 0 && !item.disabled; });
    function visible() { return items.filter(function (it) { return !query || String(it.label).toLocaleLowerCase().indexOf(query.toLocaleLowerCase()) >= 0; }); }
    function choose(it) {
      if (it.disabled) return;
      if (config.multiple) {
        var at = selected.indexOf(it.value); if (at < 0) selected.push(it.value); else selected.splice(at, 1);
        render();
      } else { selected = [it.value]; finish(true); }
    }
    function render() {
      var focusIndex = document.activeElement && document.activeElement.closest('.ux-picker-options') === list ? document.activeElement.dataset.index : null;
      var rows = visible(), virtual = rows.length > 100, scroll = list.scrollTop;
      var from = virtual ? Math.max(0, Math.floor(scroll / rowHeight) - 4) : 0, to = virtual ? Math.min(rows.length, from + 24) : rows.length;
      list.replaceChildren();
      function spacer(height) { var sp = node('div'); sp.style.height = height + 'px'; sp.setAttribute('aria-hidden', 'true'); list.appendChild(sp); }
      if (virtual) spacer(from * rowHeight);
      rows.slice(from, to).forEach(function (it, offset) {
        var index = from + offset, on = selected.indexOf(it.value) >= 0, b = node('button', 'ux-picker-option' + (config.optionClass && it.value ? ' ' + config.optionClass : ''), it.label);
        b.type = 'button'; b.disabled = !!it.disabled; b.dataset.index = index; b.dataset.v = it.value; b.setAttribute('role', 'option'); b.setAttribute('aria-selected', String(on));
        b.setAttribute('aria-posinset', index + 1); b.setAttribute('aria-setsize', rows.length); b.tabIndex = index === cursor || (cursor < 0 && index === 0) ? 0 : -1;
        b.addEventListener('click', function () { cursor = index; choose(it); }); list.appendChild(b);
      });
      if (virtual) spacer((rows.length - to) * rowHeight);
      if (!rows.length) list.appendChild(node('p', 'hint', 'Nothing matches this search. Clear it to see all choices.'));
      list.scrollTop = scroll;
      if (focusIndex != null) { var focusOption = list.querySelector('[data-index="' + focusIndex + '"]'); if (focusOption) focusOption.focus({ preventScroll: true }); }
      if (apply) apply.textContent = 'Apply (' + selected.length + ')';
    }
    if (!compact) {
      search = node('input', 'search'); search.type = 'search'; search.placeholder = 'Find a choice'; search.setAttribute('aria-label', 'Find a choice'); header.appendChild(search);
      SmartSearchBar(search, { onQuery: function (q) { query = q; cursor = -1; list.scrollTop = 0; render(); } });
    }
    dialog.appendChild(list);
    if (config.multiple) {
      var clear = node('button', 'btn', 'Clear'); clear.type = 'button'; clear.addEventListener('click', function () { selected = []; render(); });
      apply = node('button', 'btn dark'); apply.type = 'button'; apply.addEventListener('click', function () { finish(true); }); footer.appendChild(clear); footer.appendChild(apply);
    }
    if (config.custom) {
      var custom = node('input', 'search'), use = node('button', 'btn', 'Use typed value'); custom.value = config.customValue || ''; custom.setAttribute('aria-label', 'Custom ' + config.label); use.type = 'button';
      use.addEventListener('click', function () { selected = [custom.value]; finish(true); }); footer.appendChild(custom); footer.appendChild(use);
    }
    if (footer.children.length) dialog.appendChild(footer);
    var trigger = config.trigger, parentDialog = trigger && trigger.closest('dialog'), wasInert = parentDialog && parentDialog.inert;
    var closeHistory = null, fromHistory = false;
    function finish(save) {
      if (!dialog.isConnected) return;
      dialog.close(); dialog.remove(); activePicker = null;
      if (closeHistory) closeHistory(fromHistory || location.hash !== openedHash);
      if (parentDialog) parentDialog.inert = wasInert;
      if (trigger && trigger.isConnected) { trigger.setAttribute('aria-expanded', 'false'); trigger.focus({ preventScroll: true }); }
      if (save && config.onChange) config.onChange(selected);
      if (!save && config.onDismiss) config.onDismiss();
    }
    close.addEventListener('click', function () { finish(false); });
    dialog.addEventListener('cancel', function (e) { e.preventDefault(); finish(false); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) { var r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) finish(false); } });
    grip.addEventListener('pointerdown', function (e) { startY = e.clientY; grip.setPointerCapture(e.pointerId); });
    grip.addEventListener('pointerup', function (e) { if (startY != null && e.clientY - startY > 65 && innerWidth < 768) finish(false); startY = null; });
    list.addEventListener('scroll', function () { if (visible().length > 100) render(); });
    dialog.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); return; }
      if (e.key === 'Tab') {
        var controls = slice(dialog.querySelectorAll('input,button')).filter(function (b) { return !b.disabled && !b.hidden && b.tabIndex >= 0; }), at = controls.indexOf(document.activeElement);
        if (e.shiftKey && at <= 0) { e.preventDefault(); controls[controls.length - 1].focus(); }
        else if (!e.shiftKey && at === controls.length - 1) { e.preventDefault(); controls[0].focus(); }
      }
      if (!/^(ArrowDown|ArrowUp|Home|End)$/.test(e.key) || (e.target.tagName === 'INPUT' && !/^Arrow/.test(e.key))) return;
      e.preventDefault(); var rows = visible(); if (!rows.length) return;
      var direction = e.key === 'ArrowUp' ? -1 : 1;
      cursor = e.key === 'Home' ? 0 : e.key === 'End' ? rows.length - 1 : Math.max(0, Math.min(rows.length - 1, cursor + direction));
      while (rows[cursor] && rows[cursor].disabled) { cursor += direction; if (cursor < 0 || cursor >= rows.length) return; }
      if (rows.length > 100) list.scrollTop = Math.max(0, (cursor - 3) * rowHeight);
      render(); var current = list.querySelector('[data-index="' + cursor + '"]'); if (current) current.focus({ preventScroll: false });
    });
    if (parentDialog) parentDialog.inert = true;
    var openedHash = location.hash;
    document.body.appendChild(dialog); render(); dialog.showModal();
    if (!config.managedOverlay && window.LK_PREP && window.LK_PREP.pickerOverlay) closeHistory = window.LK_PREP.pickerOverlay(function () { fromHistory = true; finish(false); });
    if (trigger) { trigger.setAttribute('aria-expanded', 'true'); trigger.setAttribute('aria-controls', dialog.id); }
    (search || list.querySelector('button:not([disabled])') || close).focus();
    activePicker = { close: function () { finish(false); } }; return activePicker;
  }

  function triggerFor(source, label) {
    var b = node('button', 'ux-picker-trigger'); b.type = 'button'; b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-label', label);
    if (source.id) b.id = source.id + '-picker';
    b._uxSelector = identity(source); b._uxSource = source; source._uxTrigger = b;
    b.addEventListener('focus', function () { lastTrigger = b; });
    source.parentNode.insertBefore(b, source.nextSibling); source.classList.add('ux-choice-source'); source.dataset.adaptive = 'true';
    return b;
  }
  function selectPicker(select) {
    if (select.dataset.adaptive) return;
    var label = labelFor(select), b = triggerFor(select, label);
    function update() { b.textContent = (slice(select.selectedOptions).map(function (o) { return o.textContent; }).join(', ') || 'Choose') + ' ▾'; b.disabled = select.disabled; }
    if (select.labels) slice(select.labels).forEach(function (labelNode) { labelNode.addEventListener('click', function (e) { if (e.target === labelNode || e.target.tagName === 'SPAN') { e.preventDefault(); if (!b.disabled) b.click(); } }); });
    update(); select.addEventListener('change', update); select.addEventListener('invalid', function (e) {
      e.preventDefault(); b.focus(); b.setAttribute('aria-invalid', 'true');
      if (!select._uxError) { select._uxError = node('span', 'p-err'); select._uxError.id = 'ux-choice-error-' + (++serial); select._uxError.setAttribute('role', 'alert'); b.after(select._uxError); }
      select._uxError.textContent = select.validationMessage; b.setAttribute('aria-describedby', select._uxError.id);
    });
    b.addEventListener('click', function () {
      AdaptivePicker({ label: label, trigger: b, threshold: select.dataset.threshold == null ? 12 : +select.dataset.threshold, multiple: select.multiple,
        value: slice(select.selectedOptions).map(function (o) { return o.value; }),
        items: slice(select.options).map(function (o) { return { value: o.value, label: (o.parentNode.tagName === 'OPTGROUP' ? o.parentNode.label + ': ' : '') + o.textContent, disabled: o.disabled || (o.parentNode.tagName === 'OPTGROUP' && o.parentNode.disabled) }; }),
        onChange: function (values) { slice(select.options).forEach(function (o) { o.selected = values.indexOf(o.value) >= 0; }); update(); b.removeAttribute('aria-invalid'); if (select._uxError) { select._uxError.remove(); select._uxError = null; b.removeAttribute('aria-describedby'); } emit(select, 'input'); emit(select, 'change'); }
      });
    });
    select._uxUpdate = update;
  }
  function autocompletePicker(input) {
    if (input.dataset.adaptive) return;
    var label = labelFor(input), b = triggerFor(input, label), listId = input.getAttribute('list');
    input.removeAttribute('list');
    input.classList.remove('ux-choice-source'); // Free-entry fields keep typing; suggestions open in the shared picker.
    function update() { b.textContent = 'Choose ' + label + ' ▾'; b.disabled = input.disabled || input.readOnly; }
    update(); input.addEventListener('input', update); input.addEventListener('change', update); input._uxUpdate = update;
    b.addEventListener('click', function () {
      var dl = document.getElementById(listId), items = dl ? slice(dl.options).map(function (o) { return { value: o.value, label: o.label || o.value }; }) : [];
      AdaptivePicker({ label: label, trigger: b, items: items, value: [input.value], custom: true, customValue: input.value,
        onChange: function (values) { input.value = values[0] || ''; update(); emit(input, 'input'); emit(input, 'change'); }
      });
    });
    input.addEventListener('invalid', function (e) { e.preventDefault(); b.focus(); });
  }
  // Explicit choice actions exclude command buttons such as tick, delete, add and page navigation.
  var choiceActions = {
    'data-act': 'view free lens amode kind setview settext setshared setpractice',
    'data-p': 'tr-vpick tr-ppick range heat calm hrm lv-f wunit wreason tr-dir tr-unit n-tag n-dow n-quick n-mode mn-ast g-cat g-fcat g-fwho dk-pick cut-day ml-cat ml-pri todo-for',
    'data-mg': 'chip hand', 'data-fe': 'chip mode', 'data-dw': 'sm-st cat sub wfam ware tintc setIng', 'data-ai': 'range', 'data-su': 'group history-order'
  };
  function choiceAction(b) { var found; Object.keys(choiceActions).some(function (attr) { var v = b.getAttribute(attr); if (v && choiceActions[attr].split(' ').indexOf(v) >= 0) { found = attr + ':' + v; return true; } return false; }); return found; }
  function choiceLabel(button) { var name = button.querySelector('.vo-name'); return name ? name.firstChild.textContent.trim() : button.textContent.trim() || button.getAttribute('aria-label') || 'Choice'; }
  function groupPicker(group) {
    if (group.dataset.adaptive || group.closest('.ux-choice-source, .ux-picker')) return;
    var buttons = slice(group.children).filter(function (n) { return n.tagName === 'BUTTON' && choiceAction(n); });
    if (!buttons.length) return;
    var actions = Array.from(new Set(buttons.map(choiceAction)));
    if (actions.length > 1) {
      actions.forEach(function (action) { var subset = node('span'), matching = buttons.filter(function (b) { return choiceAction(b) === action; }); subset.setAttribute('aria-label', labelFor(group)); group.insertBefore(subset, matching[0]); matching.forEach(function (b) { subset.appendChild(b); }); groupPicker(subset); }); return;
    }
    var action = choiceAction(buttons[0]), multi = /:(free|n-dow|cut-day)$/.test(action);
    var label = labelFor(group), source = node('span');
    group.insertBefore(source, buttons[0]); buttons.forEach(function (button) { source.appendChild(button); });
    var b = triggerFor(source, label);
    if (group.getAttribute('role') === 'radiogroup') group.setAttribute('role', 'group');
    b._uxSelector = 'button' + slice(buttons[0].attributes).filter(function (a) { return /^data-/.test(a.name); }).map(function (a) { return '[' + a.name + '="' + CSS.escape(a.value) + '"]'; }).join('');
    b._uxGroup = true;
    function isOn(x) { return x.getAttribute('aria-pressed') === 'true' || x.getAttribute('aria-checked') === 'true' || x.classList.contains('on'); }
    function update() { b.textContent = (buttons.filter(isOn).map(function (x) { return choiceLabel(x); }).join(', ') || 'Choose') + ' ▾'; b.disabled = buttons.every(function (x) { return x.disabled; }); }
    update(); source._uxUpdate = update;
    b.addEventListener('click', function () {
      var values = buttons.filter(isOn).map(function (x) { return buttons.indexOf(x); });
      AdaptivePicker({ label: label, trigger: b, multiple: multi, value: values,
        items: buttons.map(function (x, i) { return { value: i, label: choiceLabel(x), disabled: x.disabled }; }),
        onChange: function (next) {
          var changed = multi ? buttons.filter(function (x, i) { return (values.indexOf(i) >= 0) !== (next.indexOf(i) >= 0); }) : next.map(function (i) { return buttons[i]; });
          changed.forEach(function (original) {
            var attrs = slice(original.attributes).filter(function (a) { return /^data-/.test(a.name); });
            var selector = 'button' + attrs.map(function (a) { return '[' + a.name + '="' + CSS.escape(a.value) + '"]'; }).join('');
            var current = original.isConnected ? original : document.querySelector(selector); if (current) current.click();
          }); update();
        }
      });
    });
  }
  // Typed comparisons are shared by paginated lists and static report tables.
  function compare(a, b) {
    if (a == null || a === '') return b == null || b === '' ? 0 : 1;
    if (b == null || b === '') return -1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
    return String(a).localeCompare(String(b), 'en-AU', { numeric: true, sensitivity: 'base' });
  }
  function cellValue(html) {
    var box = document.createElement('div'); box.innerHTML = html;
    var explicit = box.querySelector('[data-sort-value]'); if (explicit) return typed(explicit.dataset.sortValue);
    var field = box.querySelector('select,input');
    if (field) return field.type === 'checkbox' ? field.checked : field.tagName === 'SELECT' ? (field.selectedOptions[0] || {}).textContent || '' : typed(field.value);
    return typed(box.textContent.trim());
  }
  function typed(text) {
    var t = String(text).trim(), n = t.replace(/,/g, '');
    if (/^-?\d+(\.\d+)?\s*%?$/.test(n)) return parseFloat(n);
    if (/^\d{4}-\d{2}-\d{2}/.test(t) || /^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}/.test(t)) { var date = Date.parse(t); if (isFinite(date)) return date; }
    if (/^(true|yes|on|active)$/i.test(t)) return true;
    if (/^(false|no|off|inactive)$/i.test(t)) return false;
    var duration = /^(?:(\d+)\s*h\s*)?(?:(\d+)\s*(?:min|m)\s*)?(?:(\d+)\s*s)?$/.exec(t);
    if (duration && t) return (+duration[1] || 0) * 3600 + (+duration[2] || 0) * 60 + (+duration[3] || 0);
    return t;
  }
  function reportTable(table) {
    if (table.dataset.uxTable || table.closest('.lv')) return;
    table.dataset.uxTable = 'true';
    var rows = slice(table.tBodies[0] ? table.tBodies[0].rows : []), heads = slice(table.querySelectorAll('thead tr:first-child > th'));
    if (!rows.length || !heads.length) return;
    var wrap = table.parentNode, tools = node('div', 'ux-table-tools'), bar = node('div', 'ux-active-filters'), q = node('input', 'search');
    q.type = 'search'; q.placeholder = 'Search this table'; q.setAttribute('aria-label', 'Search this table'); tools.appendChild(q);
    var state = { query: '', col: -1, direction: 0, filters: {} }, buttons = [], filters = [];
    function cell(row, i) { var c = row.cells[i]; return c ? c.dataset.sortValue != null ? typed(c.dataset.sortValue) : cellValue(c.innerHTML) : ''; }
    function refresh() {
      var shown = rows.filter(function (r) { return (!state.query || r.textContent.toLocaleLowerCase().indexOf(state.query.toLocaleLowerCase()) >= 0) && Object.keys(state.filters).every(function (i) { return !state.filters[i] || String(cell(r, +i)) === state.filters[i]; }); });
      if (state.direction) shown.sort(function (a, b) { return compare(cell(a, state.col), cell(b, state.col)) * state.direction; });
      rows.forEach(function (r) { r.hidden = true; }); shown.forEach(function (r) { r.hidden = false; table.tBodies[0].appendChild(r); });
      buttons.forEach(function (b, i) { if (!b) return; b.textContent = heads[i].dataset.label + (state.col === i && state.direction ? state.direction === 1 ? ' ↑' : ' ↓' : ' ↕'); heads[i].setAttribute('aria-sort', state.col === i && state.direction ? state.direction === 1 ? 'ascending' : 'descending' : 'none'); });
      bar.replaceChildren();
      function badge(text, reset) { var b = node('button', 'chip', text + ' ×'); b.type = 'button'; b.onclick = reset; bar.appendChild(b); }
      if (state.query) badge('Search: ' + state.query, function () { searches.get(q).reset(); });
      filters.forEach(function (f) { if (state.filters[f.index]) badge(f.label + ': ' + state.filters[f.index], function () { f.select.value = ''; state.filters[f.index] = ''; if (f.select._uxUpdate) f.select._uxUpdate(); refresh(); }); });
      if (state.direction) badge('Sort: ' + heads[state.col].dataset.label, function () { state.direction = 0; refresh(); });
      if (bar.children.length) badge('Reset All Filters', function () { state.direction = 0; state.filters = {}; filters.forEach(function (f) { f.select.value = ''; if (f.select._uxUpdate) f.select._uxUpdate(); }); searches.get(q).reset(); refresh(); });
    }
    // Calendar and hour-grid columns are coordinates, not sortable record attributes.
    var matrix = table.matches('.cal,.hr') || heads.every(function (h) { return /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/i.test(h.textContent.trim()); });
    heads.forEach(function (h, i) {
      var label = h.textContent.trim(); h.dataset.label = label;
      if (!matrix && label && !/^(Actions|Allow|Permissions)$/i.test(label)) {
        var b = node('button', 'ux-sort', label + ' ↕'); b.type = 'button'; h.replaceChildren(b); buttons[i] = b;
        b.addEventListener('click', function () { state.direction = state.col === i ? state.direction === 1 ? -1 : state.direction === -1 ? 0 : 1 : 1; state.col = i; refresh(); }); h.setAttribute('aria-sort', 'none');
        var values = Array.from(new Set(rows.map(function (r) { return String(cell(r, i)); }))).filter(Boolean);
        if (values.length > 1 && /status|role|category|reason|section|feature|venue|person|who/i.test(label)) {
          var select = node('select'); select.setAttribute('aria-label', 'Filter ' + label); select.appendChild(new Option('All ' + label.toLowerCase(), ''));
          values.sort().forEach(function (v) { select.appendChild(new Option(v, v)); }); tools.appendChild(select); filters.push({ index: i, select: select, label: label });
          select.addEventListener('change', function () { state.filters[i] = select.value; refresh(); });
        }
      }
    });
    wrap.parentNode.insertBefore(tools, wrap); tools.appendChild(bar); SmartSearchBar(q, { onQuery: function (query) { state.query = query; refresh(); } });
  }

  function cyclePicker(original) {
    if (original.dataset.adaptive) return;
    var attendance = original.matches('[data-p="mn-attc"]'), states = attendance ? ['present', 'apology', 'absent'] : ['', 'has', 'may'];
    var names = attendance ? ['Present', 'Apology', 'Absent'] : ['Not in it', 'Has it', 'May have it'];
    var label = original.textContent.replace(/\?$/, '').trim(), attrs = slice(original.attributes).filter(function (a) { return /^data-(mg|w|i|v|p|id)$/.test(a.name); });
    var selector = 'button' + attrs.map(function (a) { return '[' + a.name + '="' + CSS.escape(a.value) + '"]'; }).join('');
    var source = node('span'); original.parentNode.insertBefore(source, original); source.appendChild(original); original.dataset.adaptive = 'true';
    var trigger = triggerFor(source, label); trigger.disabled = original.disabled;
    function current() { var o = document.querySelector(selector); return !o ? '' : attendance ? o.dataset.st : o.classList.contains('is-may') ? 'may' : o.classList.contains('is-has') ? 'has' : ''; }
    trigger.textContent = label + ': ' + (names[states.indexOf(current())] || 'Not set') + ' ▾';
    trigger.addEventListener('click', function () {
      AdaptivePicker({ label: label, trigger: trigger, value: [current()], items: states.map(function (v, i) { return { value: v, label: names[i] }; }), onChange: function (v) {
        for (var n = 0; n < 3 && current() !== v[0]; n++) { var button = document.querySelector(selector); if (button) button.click(); }
      } });
    });
  }

  function enhance(root) {
    slice(root.querySelectorAll('button[data-mg="tag"], button[data-p="mn-attc"]')).forEach(cyclePicker);
    slice(root.querySelectorAll('.p-admin table')).forEach(reportTable);
    slice(root.querySelectorAll('select')).forEach(selectPicker);
    slice(root.querySelectorAll('input[list]')).forEach(autocompletePicker);
    slice(root.querySelectorAll('#ai-search:not([data-smart-search]), #fe-pq:not([data-smart-search])')).forEach(function (input) { SmartSearchBar(input); });
    slice(root.querySelectorAll('input[type="search"]:not([data-fl]):not(.ux-choice-source):not([data-smart-search]), input[data-ux-search]:not([data-smart-search])')).forEach(function (input) { SmartSearchBar(input); });
    var groups = new Set(); Object.keys(choiceActions).forEach(function (attr) { slice(root.querySelectorAll('button[' + attr + ']')).forEach(function (b) { if (choiceAction(b)) groups.add(b.parentNode); }); });
    groups.forEach(groupPicker);
  }
  var scheduled = false;
  function schedule() {
    if (scheduled) return; scheduled = true;
    queueMicrotask(function () {
      scheduled = false; enhance(document);
      if (lastTrigger && !lastTrigger.isConnected && document.activeElement === document.body) {
        var source = document.querySelector(lastTrigger._uxSelector), group = source && (lastTrigger._uxGroup ? source.closest('.ux-choice-source') : source);
        if (group && group._uxTrigger) group._uxTrigger.focus({ preventScroll: true });
        else lastTrigger = null;
      }
    });
  }
  new MutationObserver(function (records) {
    var added = false;
    records.forEach(function (r) {
      if (r.type === 'childList' && slice(r.addedNodes).some(function (n) { return n.nodeType === 1 && !n.classList.contains('ux-picker-trigger') && !n.closest('.ux-picker'); })) added = true;
      if (r.type === 'attributes') {
        var source = r.target._uxUpdate ? r.target : r.target.closest('.ux-choice-source'); if (source && source._uxUpdate) source._uxUpdate();
      }
    });
    if (added) schedule();
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'aria-pressed', 'aria-checked'] });
  window.addEventListener('hashchange', function () { if (activePicker) activePicker.close(); searchMemory.forEach(function (s) { clearTimeout(s.timer); }); searchMemory.clear(); });
  window.LK_UX = { close: function () { if (activePicker) activePicker.close(); }, enhance: enhance, compare: compare, cellValue: cellValue, AdaptivePicker: AdaptivePicker, SmartSearchBar: SmartSearchBar, resetSearch: function (input) { var s = searches.get(input); if (s) s.reset(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule); else schedule();
})();
