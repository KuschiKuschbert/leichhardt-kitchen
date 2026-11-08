/* Section prep standards. Loaded on demand; private records and drafts stay in this person's tab. */
(function () {
  'use strict';
  var api, identity = '', state, generation = 0;
  var PAGE = 100, STAFF_LIMIT = 1000, AWAY = 30 * 60 * 1000, SAVE = 'ps';
  function reset() {
    generation += 1; identity = '';
    state = { cache: Object.create(null), staff: Object.create(null), section: '', reference: '', referenceDefault: '', selected: '', draft: null, base: null, editToken: 0, busy: false, message: '', bad: false, picked: null, hintSection: '', hintText: '', rowMessage: '', rowId: '' };
  }
  reset();
  function bind(adapter) {
    if (adapter) api = adapter;
    if (!api) return false;
    var key = api.identity();
    if (key !== identity) { reset(); identity = key; }
    return !!(key && api.canRead());
  }
  function valid() { return !!(api && identity && api.identity() === identity && api.canRead()); }
  function samePerson(key, gen) { return !!(api && key === identity && key === api.identity() && gen === generation); }
  function esc(value) { return api.esc(value == null ? '' : String(value)); }
  function normal(value) { return String(value || '').trim().toLowerCase().replace(/\s+/g, ' '); }
  function sectionById(id) { return (api.sections() || []).filter(function (s) { return s.id === id; })[0] || null; }
  function redraw() { if (valid()) { api.draw(); api.refreshHint(); } }
  function message(text, bad) { state.message = text; state.bad = !!bad; }
  function recordValid(x, id) {
    function words(v, max, blank) { return typeof v === 'string' && v.length <= max && (blank || !!v.trim()); }
    return x && typeof x.id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(x.id) && x.sectionId === id && words(x.name, 160, false) &&
      Array.isArray(x.aliases) && x.aliases.length <= 12 && x.aliases.every(function (a) { return words(a, 160, false); }) &&
      (x.minimum === null || typeof x.minimum === 'number' && Number.isFinite(x.minimum) && x.minimum >= 0 && x.minimum <= 1000000) &&
      words(x.unit, 40, false) && words(x.instruction, 500, true) && words(x.recipe, 160, true) && (!x.recipe || /^[A-Za-z0-9_-]+$/.test(x.recipe)) &&
      typeof x.archived === 'boolean' && Number.isInteger(x.v) && x.v >= 1;
  }
  function cleanRecord(x) {
    return { id: x.id, sectionId: x.sectionId, name: x.name, aliases: x.aliases.slice(), minimum: x.minimum, unit: x.unit, instruction: x.instruction, recipe: x.recipe, archived: x.archived, v: x.v, at: x.at, by: x.by };
  }
  function entry(id, audience) {
    var cache = audience === 'staff' ? state.staff : state.cache;
    return cache[id] || (cache[id] = { items: null, next: '', status: 'idle', readAt: 0, day: '', touched: 0, error: '', request: 0 });
  }
  /* Reads start on first use, a new day, reopening after 30 minutes away, or Refresh. Each server page reads at most
     101 documents: 100 records and one continuation sentinel. Staff read active pages to completion, capped at
     1,000 active items; incomplete results never feed matching. Management loads another page only on a tap, so it
     can archive excess items even when the staff cap is reached. Typing and filtering use these memory copies. */
  function ensure(id, force, audience, more) {
    if (!valid() || !sectionById(id)) return null;
    audience = audience === 'staff' ? 'staff' : 'manage';
    var c = entry(id, audience), at = api.now(), away = c.touched && at - c.touched >= AWAY, newDay = c.day && c.day !== api.day();
    c.touched = at;
    if (state.busy && state.draft && state.draft.sectionId === id) return c;
    if (c.status === 'loading') return c;
    if (more) { if (audience !== 'manage' || !c.next) return c; }
    else if (!force && c.status !== 'idle' && !(away || newDay)) return c;
    c.status = 'loading'; c.error = ''; c.day = api.day();
    var key = identity, gen = generation, request = ++c.request, after = more ? c.next : '', previous = more && c.items ? c.items.slice() : [];
    function page(cursor, loaded) {
      if (!samePerson(key, gen) || request !== c.request || !api.canRead()) return Promise.reject({ code: 'cancelled' });
      return api.read(id, { audience: audience, after: cursor }).then(function (result) {
        if (!samePerson(key, gen) || request !== c.request) return null;
        if (!result || !Array.isArray(result.items) || result.items.length > PAGE || typeof result.next !== 'string' ||
            result.next && (!/^[A-Za-z0-9_-]{1,80}$/.test(result.next) || result.items.length !== PAGE || result.items[PAGE - 1].id !== result.next || result.next <= cursor)) throw { code: 'standards-data' };
        var ids = Object.create(null);
        if (!result.items.every(function (r) { if (!recordValid(r, id) || audience === 'staff' && r.archived || ids[r.id]) return false; ids[r.id] = true; return true; })) throw { code: 'standards-data' };
        result.items.forEach(function (record) {
          var x = cleanRecord(record), index = loaded.findIndex(function (old) { return old.id === x.id; });
          if (index < 0) loaded.push(x); else if (loaded[index].v <= x.v) loaded[index] = x;
        });
        if (audience === 'staff' && result.next) {
          if (loaded.length >= STAFF_LIMIT) throw { code: 'standards-limit' };
          return page(result.next, loaded);
        }
        return { items: loaded, next: result.next };
      });
    }
    Promise.resolve().then(function () { return page(after, previous); }).then(function (result) {
      if (!result || !samePerson(key, gen) || c.request !== request) return;
      c.items = result.items; c.next = result.next; c.readAt = api.now(); c.day = api.day(); c.status = 'ok'; c.error = '';
      // A page arriving never replaces the open editor's draft or its original revision.
      state.picked = null; redraw();
    }).catch(function (error) {
      if (!samePerson(key, gen) || c.request !== request) return;
      c.status = 'error';
      c.error = error && error.code === 'standards-limit' ? 'This section has more than 1,000 active standards. Its complete reference could not be loaded, so minimum matching is paused. The head chef can archive old items in the Prep room.' : error && error.code === 'standards-data' ? 'Some standards could not be read. Minimum matching is paused. Ask the head chef to check this section.' : 'Standards unavailable. Check the connection and try again.';
      state.picked = null; redraw();
    });
    return c;
  }
  function button(action, label, value, disabled, cls, extra) {
    return '<button type="button" class="' + (cls || 'btn') + '" data-ps="' + esc(action) + '"' + (value ? ' data-id="' + esc(value) + '"' : '') + (disabled ? ' disabled' : '') + (extra || '') + '>' + esc(label) + '</button>';
  }
  function minimum(x) { return x.minimum === null ? 'To come' : String(x.minimum) + ' ' + x.unit; }
  function readStatus(id, c, audience) {
    if (!c) return '';
    var label = sectionById(id), name = label ? label.name : 'this section';
    var refresh = button('refresh', c.status === 'error' ? 'Try again' : 'Refresh', '', c.status === 'loading' || state.busy, 'p-link', ' data-section="' + esc(id) + '" data-audience="' + (audience === 'staff' ? 'staff' : 'manage') + '"');
    if (c.status === 'loading') return api.inkWait('Reading ' + name + ' standards...', 'prep', 0);
    if (c.status === 'error') return '<p class="p-err" role="alert">' + esc(c.error) + ' ' + refresh + '</p>' + (c.items ? '<p class="hint">' + (audience === 'staff' ? 'Showing the last complete copy, read ' : 'Showing previously loaded standards, read ') + esc(api.clock(c.readAt)) + '. ' + (audience === 'staff' ? 'It may be out of date. Add from this reference is paused.' : 'They may be out of date. Search covers those items.') + '</p>' : '');
    return '<p class="hint ps-read" role="status">Read ' + esc(api.clock(c.readAt)) + '. ' + refresh + '</p>' + (audience !== 'staff' && c.next ? '<p class="hint">' + c.items.length + ' standards loaded. More are available. Search covers the loaded items.</p>' : '');
  }
  function sectionPicker(value, field, disabled) {
    return '<div class="field ps-section"><label class="label" for="ps-' + field + '">Section</label><select class="p-select" id="ps-' + field + '" data-k="ps-' + field + '" data-ps-field="' + field + '"' + (disabled ? ' disabled' : '') + '>' + (api.sections() || []).map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === value ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></div>';
  }
  function initialSection() {
    var requested = api.defaultSection(), sections = api.sections();
    return sectionById(requested) ? requested : sections.length ? sections[0].id : '';
  }
  function active(c) { return c && c.items ? c.items.filter(function (x) { return !x.archived; }) : []; }
  function getItem(id, sec, audience) {
    var c = (audience === 'staff' ? state.staff : state.cache)[sec];
    return c && c.items ? c.items.filter(function (x) { return x.id === id; })[0] || null : null;
  }
  function near(a, b) {
    if (Math.abs(a.length - b.length) > 1 || a.length < 3 || b.length < 3) return false;
    if (a.length === b.length) {
      var at = [];
      for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) at.push(i);
      return at.length === 1 || at.length === 2 && at[1] === at[0] + 1 && a[at[0]] === b[at[1]] && a[at[1]] === b[at[0]];
    }
    var short = a.length < b.length ? a : b, long = a.length < b.length ? b : a, skipped = false, p = 0, q = 0;
    while (p < short.length && q < long.length) { if (short[p] === long[q]) { p++; q++; } else if (skipped) return false; else { skipped = true; q++; } }
    return true;
  }
  function matchState(sec, text) {
    var c = state.staff[sec], q = normal(text), chosen = state.picked;
    if (!valid() || !sectionById(sec) || !c || c.status !== 'ok' || !q) return { item: null, kind: 'none', rows: [] };
    var rows = active(c), selected = chosen && chosen.sectionId === sec && chosen.text === q && rows.filter(function (x) { return x.id === chosen.id; })[0];
    if (selected) return { item: selected, kind: 'chosen', rows: [] };
    var exact = rows.filter(function (x) { return [x.name].concat(x.aliases).some(function (name) { return normal(name) === q; }); });
    if (exact.length === 1) return { item: exact[0], kind: 'exact', rows: [] };
    if (exact.length > 1) return { item: null, kind: 'ambiguous', rows: exact };
    var suggestions = rows.filter(function (x) { return [x.name].concat(x.aliases).some(function (name) { var n = normal(name); return q.length >= 2 && (n.indexOf(q) >= 0 || near(q, n)); }); });
    return { item: null, kind: 'possible', rows: suggestions };
  }
  function match(sec, text) { return matchState(sec, text).item; }
  function hint(adapter, sec, text) {
    if (!bind(adapter)) return '';
    state.hintSection = sec; state.hintText = String(text || '');
    if (state.picked && (state.picked.sectionId !== sec || state.picked.text !== normal(text))) state.picked = null;
    if (!normal(text)) return '';
    if (!sectionById(sec)) return '<p class="hint ps-hint">Choose a configured section to see its minimum.</p>';
    var c = ensure(sec, false, 'staff'), m = matchState(sec, text), name = sectionById(sec).name;
    if (c.status !== 'ok') return '<div class="ps-hint">' + readStatus(sec, c, 'staff') + '<p class="hint">You can still add an ordinary prep line.</p></div>';
    if (m.item) return '<div class="ps-minimum" data-ps-match="' + esc(m.item.id) + '"><span class="label">Minimum ready before service</span><p><strong>' + esc(m.item.name) + '</strong> <b>' + esc(minimum(m.item)) + '</b></p><p class="hint">' + esc(name) + ' · Set by the head chef. Amount to make stays as you enter it.</p><p class="hint">Read ' + esc(api.clock(c.readAt)) + '. ' + button('refresh', 'Refresh', '', state.busy, 'p-link', ' data-section="' + esc(sec) + '" data-audience="staff"') + '</p></div>';
    if (!m.rows.length) return '<p class="hint ps-hint">No section standard linked in ' + esc(name) + '. This stays an ordinary prep line.</p>';
    return '<div class="ps-hint"><p class="nb-sgh">' + (m.kind === 'ambiguous' ? 'More than one standard matches. Choose the item.' : 'Possible section item. Choose it to see the minimum.') + '</p><div class="nb-sugg nb-sgl">' + m.rows.slice(0, 6).map(function (x) {
      return '<div class="nb-sgr"><button type="button" class="nb-sg" data-ps="choose" data-id="' + esc(x.id) + '" data-section="' + esc(sec) + '"><span class="nb-sgt">' + esc(x.name) + '</span><span class="nb-us">' + esc(name) + ' · Choose this item</span></button></div>';
    }).join('') + '</div>' + (m.rows.length > 6 ? '<p class="hint">' + m.rows.length + ' possible items. Keep typing the full item name to narrow the choices.</p>' : '') + '</div>';
  }
  function draftFrom(x) {
    return { id: x ? x.id : '', sectionId: x ? x.sectionId : state.section, name: x ? x.name : '', minimum: x && x.minimum !== null ? String(x.minimum) : '', unit: x ? x.unit : '', aliases: x ? x.aliases.join('\n') : '', instruction: x ? x.instruction : '', recipe: x ? x.recipe : '', archived: x ? x.archived : false, v: x ? x.v : 0 };
  }
  function payload(d) {
    if (!d) return null;
    return { id: d.id, sectionId: d.sectionId, name: d.name.trim(), minimum: d.minimum.trim() === '' ? null : Number(d.minimum), unit: d.unit.trim(), aliases: d.aliases.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean), instruction: d.instruction.trim(), recipe: d.recipe, archived: d.archived, v: d.v };
  }
  function formValid() {
    var x = payload(state.draft);
    return !!(x && sectionById(x.sectionId) && recordValid(Object.assign({}, x, { id: x.id || 'new', v: x.v || 1 }), x.sectionId));
  }
  function formProblem() {
    var x = payload(state.draft);
    if (!x) return '';
    if (!sectionById(x.sectionId)) return 'This section is no longer active. Your draft is kept. Cancel it when you are ready to choose another section.';
    if (!x.name) return 'Enter an item name.';
    if (!x.unit) return 'Enter the confirmed unit for this item.';
    if (x.minimum !== null && (!Number.isFinite(x.minimum) || x.minimum < 0 || x.minimum > 1000000)) return 'Use a minimum from 0 to 1,000,000, or leave it blank for To come.';
    if (x.aliases.length > 12) return 'Use no more than 12 approved matching names.';
    if (x.aliases.some(function (a) { return a.length > 160; })) return 'Keep each matching name within 160 characters.';
    if (!formValid()) return 'Check the item name, unit, instruction and recipe before saving.';
    return '';
  }
  function dirty() { return !!(state.draft && JSON.stringify(state.draft) !== JSON.stringify(state.base)); }
  function draft() { return state.draft; }
  function unsaved() { return state.busy || dirty(); }
  function busy() { return state.busy; }
  function cancelKey() { return 'ps-cancel-' + generation + '-' + state.editToken; }
  function archiveKey() { var d = state.draft; return 'ps-archive-' + generation + '-' + state.editToken + '-' + (d ? d.id + '-' + d.v : ''); }
  function staleDraft() {
    var d = state.draft, saved = d && d.id && getItem(d.id, d.sectionId);
    return !!(d && d.id && (!saved || saved.v !== d.v));
  }
  function saveOff() {
    var c = state.cache[state.section];
    return !api.canEdit() || state.busy || !dirty() || !formValid() || staleDraft() || !c || c.status !== 'ok';
  }
  function saveButton() {
    return api.saveButton({ k: SAVE, p: 'ps-save', idle: 'Save standard', busy: state.busy, off: saveOff() }).replace('data-p="ps-save"', 'data-ps="save"');
  }
  function statusHTML() {
    return '<div id="ps-status" class="ps-notice">' + api.saveLine(SAVE, state.busy, state.bad ? api.errMsg(state.message) : state.message, '', 'Not sent yet. Keep the book open until this standard is saved.') + '</div>';
  }
  function patchEditor() {
    if (!valid()) return;
    var buttonEl = document.querySelector('[data-ps="save"]'), msg = document.getElementById('ps-status');
    if (buttonEl) api.btnPatch(buttonEl, saveButton());
    if (msg) msg.innerHTML = api.saveLine(SAVE, state.busy, state.bad ? api.errMsg(state.message) : state.message);
    var cancel = document.querySelector('[data-ps="cancel"]');
    if (cancel) cancel.textContent = dirty() ? 'Cancel changes' : 'Close editor';
    var validation = document.getElementById('ps-validation'); if (validation) validation.textContent = dirty() ? formProblem() : '';
    var select = document.querySelector('[data-ps-field="section"]'); if (select) select.disabled = state.busy || api.canEdit() && dirty();
  }
  function startEdit(x) {
    state.editToken += 1; state.selected = x ? x.id : ''; state.draft = draftFrom(x); state.base = Object.assign({}, state.draft); state.message = ''; state.bad = false;
    api.saveStop(SAVE); redraw();
    var field = document.getElementById('ps-name'); if (field) field.focus();
  }
  function holdDraft() {
    if (!state.busy && !dirty()) return false;
    message(state.busy ? 'This standard is not sent yet. Keep the book open.' : 'Save or cancel your changes before choosing another standard.', true); patchEditor(); return true;
  }
  function field(name, label, value, attrs, textarea) {
    var id = 'ps-' + name, shared = ' id="' + id + '" data-k="' + id + '" data-ps-field="' + name + '" class="search"' + (attrs || '') + (state.busy ? ' disabled' : '');
    return '<div class="field"><label class="label" for="' + id + '">' + label + '</label>' + (textarea ? '<textarea' + shared + '>' + esc(value) + '</textarea>' : '<input' + shared + ' value="' + esc(value) + '">') + '</div>';
  }
  function readonlyDetail(x) {
    return '<section class="ps-editor set-block"><h3 class="a-ch-h">' + esc(x.name) + '</h3><p><span class="label">Minimum ready before service</span> <strong>' + esc(minimum(x)) + '</strong></p><p class="hint">' + esc(x.instruction || 'Instructions: To come') + '</p>' + recipeLink(x) + '<p class="hint">Matching names: ' + esc(x.aliases.join(', ') || 'None set') + '</p><p class="hint">' + (x.archived ? 'Archived. This is not shown in staff guidance.' : 'Read only. Ask the head chef to change this standard.') + '</p></section>';
  }
  function editorHTML() {
    var d = state.draft, x = getItem(state.selected, state.section);
    if (!api.canEdit()) return x ? readonlyDetail(x) : '<section class="ps-editor"><h3 class="a-ch-h">Section standards</h3><p class="hint">Choose an item to read the head chef’s instructions.</p></section>';
    if (!d) return '<section class="ps-editor"><h3 class="a-ch-h">Set the section standard</h3><p class="hint">Choose an item or add a new standard. A minimum is the usable prep to have ready before service.</p></section>';
    var recipes = (api.recipes() || []).filter(function (r) { return r.id && /^[A-Za-z0-9_-]{1,160}$/.test(r.id); });
    if (d.recipe && !recipes.some(function (r) { return r.id === d.recipe; })) recipes.push({ id: d.recipe, name: 'Current recipe: ' + d.recipe });
    return '<section class="ps-editor set-block" aria-label="Prep standard editor"><h3 class="a-ch-h">' + (d.id ? 'Edit standard' : 'New standard') + '</h3><p class="hint">' + esc((sectionById(d.sectionId) || {}).name || '') + ' · Head-chef minimum ready before service</p>' +
      (staleDraft() ? '<p class="p-err" role="alert">This standard changed or is not in the loaded page. Your draft is kept. Load the remaining standards to compare it, or cancel this draft to edit the saved version.</p>' + (x ? '<p class="hint">Saved now: ' + esc(x.name) + ' · Minimum ' + esc(minimum(x)) + ' · ' + esc(x.instruction || 'Instructions: To come') + '</p>' : '') : '') +
      '<div class="ps-fields">' + field('name', 'Item name', d.name, ' maxlength="160" autocomplete="off"') + '<div class="ps-form-grid">' + field('minimum', 'Minimum ready', d.minimum, ' type="number" min="0" max="1000000" step="any" inputmode="decimal" placeholder="To come"') + field('unit', 'Unit', d.unit, ' maxlength="40"') + '</div><p class="hint">Leave the minimum blank for To come. For a tub or batch, include its agreed size in the unit.</p>' + field('aliases', 'Approved matching names', d.aliases, ' maxlength="1931" rows="3"', true) + '<p class="hint">One name per line, up to 12. Shared names ask staff to choose the item.</p>' + field('instruction', 'Before service instruction', d.instruction, ' maxlength="500" rows="3"', true) + '<div class="field"><label class="label" for="ps-recipe">Recipe</label><select id="ps-recipe" class="p-select" data-k="ps-recipe" data-ps-field="recipe"' + (state.busy ? ' disabled' : '') + '><option value="">No recipe linked</option>' + recipes.map(function (r) { return '<option value="' + esc(r.id) + '"' + (d.recipe === r.id ? ' selected' : '') + '>' + esc(r.name) + '</option>'; }).join('') + '</select></div></div><p id="ps-validation" class="hint" role="status">' + esc(dirty() || !sectionById(d.sectionId) ? formProblem() : '') + '</p><div class="btn-row ps-actions">' + saveButton() + button('cancel', api.armed(cancelKey()) ? 'Tap again to discard' : dirty() ? 'Cancel changes' : 'Close editor', '', state.busy) + '</div>' + statusHTML() + (d.id ? '<div class="ps-archive"><p class="hint">' + (d.archived ? 'Restore this item to staff guidance.' : 'Archive removes this item from staff guidance. It keeps the standard for later.') + '</p>' + button(d.archived ? 'restore' : 'archive', api.armed(archiveKey()) ? 'Tap again to archive ' + d.name : d.archived ? 'Restore standard' : 'Archive standard', '', state.busy || dirty() || staleDraft(), 'btn') + '</div>' : '') + '</section>';
  }
  function render(adapter) {
    if (!bind(adapter)) return '';
    var sections = api.sections();
    if (!sections.length) return '<section class="set-block ps-manager"><h3 class="a-ch-h">Section prep standards</h3><p class="hint">Set up the kitchen’s sections first. Standards belong to a configured section.</p>' + (state.draft && api.canEdit() ? editorHTML() : '') + '</section>';
    // A revoked head may keep reading without replacing the retained draft. Restored edit authority resumes its section.
    if (api.canEdit() && state.draft && (dirty() || state.busy)) { state.section = state.draft.sectionId; state.selected = state.draft.id; }
    if (!sectionById(state.section) && !dirty()) { state.section = initialSection(); state.selected = ''; state.draft = null; state.base = null; }
    var c = ensure(state.section), items = c && c.items || [];
    return '<section class="set-block ps-manager"><h3 class="a-ch-h">Section prep standards</h3><p class="hint">' + (api.canEdit() ? 'Set each item’s minimum and what the section must check before service.' : 'Read the head chef’s standards for each section.') + '</p>' + (!api.canEdit() && dirty() ? '<p class="hint" role="status">Your unfinished head-chef draft is kept for you. You can read the saved standards here.</p>' : '') + sectionPicker(state.section, 'section', state.busy || api.canEdit() && dirty()) + readStatus(state.section, c) + '<div class="ps-grid"><section class="ps-catalogue" aria-label="Section standards">' + (api.canEdit() ? '<div class="btn-row">' + button('new', 'Add standard', '', state.busy || !c || c.status !== 'ok') + '</div>' : '') + (c && c.items ? api.listHTML({ key: 'ps-manage-' + state.section, items: items, step: 12, tools: 0, noun: ['standard', 'standards'], ph: 'Find a loaded prep item', empty: 'No standards in this loaded page.', find: function (r) { return r.name + ' ' + r.aliases.join(' '); }, filters: [['active', 'Active', function (r) { return !r.archived; }], ['archived', 'Archived', function (r) { return r.archived; }], ['all', 'All']], sorts: [['az', 'A to Z', function (a, b) { return a.name.localeCompare(b.name); }]], card: function (r) { return '<li class="ps-catalogue-row"><div><strong>' + esc(r.name) + '</strong><p class="hint">Minimum ready: ' + esc(minimum(r)) + (r.archived ? ' · Archived' : '') + '</p></div>' + button('edit', api.canEdit() ? 'Edit' : 'View', r.id, state.busy, 'btn', ' aria-pressed="' + (state.selected === r.id) + '"') + '</li>'; } }) : '') + (c && c.next ? '<div class="btn-row">' + button('more', 'Load next 100 standards', '', c.status === 'loading' || state.busy, 'btn', ' data-section="' + esc(state.section) + '"') + '</div>' : '') + '</section>' + editorHTML() + '</div></section>';
  }
  function recipeLink(x) { return x.recipe ? '<a class="p-link ps-recipe" href="#/r/' + encodeURIComponent(x.recipe) + '">Recipe<span class="visually-hidden"> for ' + esc(x.name) + '</span></a>' : ''; }
  function referenceRow(x, readable) {
    var work = api.openWork(x) || [], existing = work.length ? '<p class="hint ps-existing">Already on today’s prep: ' + work.map(function (w) { return esc(w.text + (w.qty ? ' · ' + w.qty : '')); }).join('; ') + '. Check that work before adding another line.</p>' : '';
    return '<li class="ps-standard" data-ps-standard="' + esc(x.id) + '"><h3 class="ps-standard-name">' + esc(x.name) + '</h3><p class="ps-minline"><span class="label">Minimum ready</span> <strong>' + esc(minimum(x)) + '</strong></p><p class="hint">' + esc(x.instruction || 'Instructions: To come') + '</p>' + existing + '<div class="btn-row">' + (api.canAdd() ? button('add', 'Add to prep', x.id, !readable, 'nb-btn', ' data-section="' + esc(x.sectionId) + '"') : '') + recipeLink(x) + '</div>' + (state.rowId === x.id && state.rowMessage ? '<p class="p-err" role="alert">' + esc(state.rowMessage) + '</p>' : '') + '</li>';
  }
  function reference(adapter, defaultId) {
    if (!bind(adapter)) return '';
    if (defaultId !== state.referenceDefault) { state.referenceDefault = defaultId; if (sectionById(defaultId)) state.reference = defaultId; }
    if (!sectionById(state.reference)) state.reference = sectionById(defaultId) ? defaultId : initialSection();
    var sec = sectionById(state.reference);
    if (!sec) return '<p class="hint">No configured sections yet. Ask the head chef to set them up.</p>';
    var c = ensure(sec.id, false, 'staff'), items = active(c);
    return '<section class="ps-reference"><h3 class="nb-sh">Before service</h3><p class="nb-sd">Check every item against the head chef’s minimum. This includes prep absent from today’s list and work already ticked.</p>' + sectionPicker(sec.id, 'reference-section', false) + readStatus(sec.id, c, 'staff') + (c && c.items ? api.listHTML({ key: 'ps-reference-' + sec.id, items: items, step: 100, tools: 12, noun: ['item to check', 'items to check'], ph: 'Find a prep item', empty: 'No active standards set for this section.', find: function (r) { return r.name + ' ' + r.aliases.join(' ') + ' ' + r.instruction; }, sorts: [['az', 'A to Z', function (a, b) { return a.name.localeCompare(b.name); }]], card: function (x) { return referenceRow(x, c.status === 'ok'); } }) : '') + '</section>';
  }
  function save(archived) {
    if (!valid() || !api.canEdit() || state.busy || api.saveHeld(SAVE)) return;
    var d = state.draft, c = d && state.cache[d.sectionId];
    if (!d || !c || c.status !== 'ok' || staleDraft() || !formValid() || archived === undefined && !dirty()) return;
    var data = payload(d); data.v += 1; data.at = api.now(); if (archived !== undefined) data.archived = archived;
    var key = identity, gen = generation;
    var staffCopy = state.staff[d.sectionId]; if (staffCopy) { staffCopy.request += 1; staffCopy.status = 'idle'; }
    state.busy = true; state.message = ''; state.bad = false; api.saveStart(SAVE); redraw();
    Promise.resolve().then(function () { return api.save(data); }).then(function (saved) {
      if (!samePerson(key, gen)) return;
      if (!saved || !recordValid(saved, d.sectionId)) throw { code: 'standards-save' };
      var result = cleanRecord(saved), index = c.items.findIndex(function (x) { return x.id === result.id; });
      c.request += 1;
      if (index >= 0) c.items[index] = result; else c.items.push(result);
      state.busy = false; state.selected = result.id; state.draft = draftFrom(result); state.base = Object.assign({}, state.draft); state.picked = null;
      state.message = (archived === true ? 'Archived ' : archived === false ? 'Restored ' : 'Saved ') + result.name + ' at ' + api.clock(api.now()) + '.'; state.bad = false;
      api.saveDone(SAVE, true, function () {}); redraw();
    }).catch(function (error) {
      if (!samePerson(key, gen)) return;
      state.busy = false;
      message(error && (error.code === 'permission-denied' || error.code === 'conflict' || error.code === 'failed-precondition') ? 'Not saved. Your access or this standard may have changed. Refresh the section to compare it. Your draft is kept.' : 'Could not save ' + (d.name || 'this standard') + '. Check the connection and try again. Your draft is kept.', true);
      api.saveFail(SAVE, true, function () { state.message = ''; state.bad = false; }); redraw();
    });
  }
  function click(el) {
    if (!valid()) return;
    var action = el.getAttribute('data-ps'), id = el.getAttribute('data-id') || '', sec = el.getAttribute('data-section') || state.section, item;
    if (action === 'refresh') { if (!state.busy) { state.picked = null; ensure(sec, true, el.getAttribute('data-audience')); redraw(); } return; }
    if (action === 'more') { if (!state.busy) { ensure(sec, false, 'manage', true); redraw(); } return; }
    if (action === 'choose') {
      item = getItem(id, sec, 'staff');
      if (!item || item.archived || !state.staff[sec] || state.staff[sec].status !== 'ok' || state.hintSection !== sec) return;
      var options = matchState(sec, state.hintText);
      if (!options.rows.some(function (x) { return x.id === id; })) return;
      state.picked = { id: item.id, sectionId: sec, text: normal(item.name) }; api.pick(item); return;
    }
    if (action === 'add') {
      item = getItem(id, sec, 'staff'); if (!item || item.archived || !api.canAdd() || state.staff[sec].status !== 'ok') return;
      state.rowId = id; state.rowMessage = '';
      if (api.add(item) === false) { state.rowMessage = 'Finish or clear your current prep line before starting this one. Your typed work is kept.'; redraw(); }
      return;
    }
    if (action === 'edit') {
      item = getItem(id, state.section); if (!item) return;
      if (!api.canEdit()) { state.selected = id; redraw(); return; }
      if (holdDraft()) return;
      startEdit(item);
      return;
    }
    if (action === 'new') { if (!api.canEdit() || holdDraft() || !state.cache[state.section] || state.cache[state.section].status !== 'ok') return; startEdit(null); return; }
    if (action === 'cancel') {
      if (state.busy || dirty() && !api.arm(cancelKey(), redraw)) return;
      state.draft = null; state.base = null; state.selected = ''; state.message = ''; state.bad = false; api.saveStop(SAVE); redraw(); return;
    }
    if (action === 'save') { save(); return; }
    if (action === 'archive' || action === 'restore') {
      if (!api.canEdit() || state.busy || dirty() || !state.draft || !state.draft.id || staleDraft()) return;
      if (action === 'archive' && !api.arm(archiveKey(), redraw)) return;
      save(action === 'archive');
    }
  }
  function input(el) {
    if (!valid()) return;
    var name = el.getAttribute('data-ps-field');
    if (name === 'reference-section') { if (sectionById(el.value)) { state.reference = el.value; state.rowMessage = ''; redraw(); } return; }
    if (name === 'section') {
      if (!api.canEdit()) { if (sectionById(el.value)) { state.section = el.value; state.selected = ''; redraw(); } return; }
      if (holdDraft()) { el.value = state.section; return; }
      if (sectionById(el.value)) { state.section = el.value; state.selected = ''; state.draft = null; state.base = null; state.message = ''; state.bad = false; api.saveStop(SAVE); redraw(); }
      return;
    }
    if (!api.canEdit() || state.busy || !state.draft || ['name', 'minimum', 'unit', 'aliases', 'instruction', 'recipe'].indexOf(name) < 0) return;
    var value = name === 'minimum' && el.validity && el.validity.badInput ? 'invalid' : el.value;
    if (state.draft[name] !== value) state.editToken += 1;
    state.draft[name] = value;
    state.message = ''; state.bad = false; api.saveStop(SAVE); patchEditor();
  }
  function availabilityChanged() {
    Object.keys(state.staff).forEach(function (id) { state.staff[id].request += 1; });
    state.staff = Object.create(null); state.picked = null;
  }
  window.LK_PREP_STANDARDS = { API: 1, render: render, reference: reference, hint: hint, match: match, click: click, input: input, reset: reset, draft: draft, unsaved: unsaved, busy: busy, availabilityChanged: availabilityChanged };
})();
