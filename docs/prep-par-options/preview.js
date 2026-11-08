(function () {
  'use strict';
  const view = new URLSearchParams(location.search).get('view') || 'b';
  const app = document.getElementById('pp-app');
  const items = [
    { id: 'onions', name: 'Sliced onions', section: 'Larder', target: 6, unit: 'kg', count: 2, existing: 2 },
    { id: 'slaw', name: 'Slaw', section: 'Larder', target: 3, unit: 'kg', count: 3, done: true },
    { id: 'cucumber', name: 'Pickled cucumber', section: 'Larder', target: 2, unit: 'kg', count: null },
    { id: 'dressing', name: 'Herb dressing', section: 'Larder', target: null, unit: 'L', count: null },
    { id: 'lemons', name: 'Lemon wedges', section: 'Larder', target: 0, unit: 'portions', count: null },
    { id: 'salsa', name: 'Tomato salsa', section: 'Larder', target: 4, unit: 'L', count: 1 }
  ];
  let selected = 'onions', review = false, added = [], lastAddition = [], role = 'head', query = '', tab = 'pars', manual = false, manualQty = '', cOpen = false, addingItem = false;
  const cDrafts = {};
  const units = ['g', 'kg', 'L', 'tubs', 'batch', 'portions', 'pieces'];
  items.forEach(x => { if (x.existing) x.existingUnit = x.unit; });
  const requestedItem = new URLSearchParams(location.search).get('item');
  if (items.some(x => x.id === requestedItem)) { selected = requestedItem; cOpen = true; }
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const item = id => items.find(x => x.id === id);
  const amount = (n, unit) => n === null ? 'To come' : n + ' ' + unit;
  const need = x => x.target === 0 ? 0 : x.target === null || x.count === null ? null : Math.max(0, Math.round((x.target - x.count) * 1000) / 1000);
  const matches = () => items.filter(x => (x.name + ' ' + x.section).toLowerCase().includes(query.toLowerCase()));
  const eligible = () => items.filter(x => need(x) > 0 && !x.existing && !added.includes(x.id));
  const button = (action, label, cls, extra) => '<button type="button" class="pp-btn ' + (cls || '') + '" data-act="' + action + '" ' + (extra || '') + '>' + label + '</button>';
  function top() { return '<header class="pp-top"><a class="pp-link" href="current.html">← Back to prep list</a><strong>Kitchen Book</strong></header>'; }
  function feedback(text, undo) { document.getElementById('pp-feedback').innerHTML = esc(text) + (undo ? button('undo', 'Undo', '') : ''); }
  function row(x) {
    const n = need(x), isAdded = added.includes(x.id);
    const result = isAdded ? '<span class="pp-good">Added in preview</span>' : x.target === null ? 'Target to come' : x.target === 0 ? 'No routine prep' : n === null ? 'Count first' : n === 0 ? '<span class="pp-good">Enough for the target</span>' : n + ' ' + esc(x.unit) + '<small>Still to prepare</small>';
    return '<article class="pp-row"><div class="pp-rowhead"><h3>' + esc(x.name) + '</h3></div><p class="pp-target">Target (par) ' + amount(x.target, x.unit) + (x.done ? ' · Ticked today, stock not assumed' : '') + '</p><div class="pp-countrow">' + (x.target !== 0 && x.target !== null ? '<div class="pp-count"><label for="count-' + x.id + '">Counted now</label><input id="count-' + x.id + '" data-count="' + x.id + '" type="number" min="0" step="any" inputmode="decimal" value="' + (x.count === null ? '' : x.count) + '" placeholder="Count"><span>' + esc(x.unit) + '</span></div>' : '<span class="pp-note">' + (x.target === 0 ? 'Target explicitly set to 0' : 'No confirmed target yet') + '</span>') + '<div class="pp-result">' + result + '</div></div>' + (x.existing ? '<div class="pp-conflict"><span class="pp-alert">Already on today’s list: ' + amount(x.existing, x.existingUnit || x.unit) + '</span>' + button('existing:' + x.id, 'Review existing', 'quiet') + '</div>' : '') + '</article>';
  }
  function check() {
    const ready = eligible();
    app.innerHTML = top() + '<main class="pp-wrap"><header class="pp-heading"><p class="pp-eyebrow">B · Check the section</p><h1>Check Larder’s prep</h1><p class="pp-lead">Count usable prep, then review what needs making. These counts stay in this check only.</p></header><div class="pp-book"><section class="pp-page"><div class="pp-pagehead"><h2>Larder</h2><span class="pp-badge">6 prep items</span></div>' + items.map(row).join('') + '</section><aside class="pp-page" id="pp-review"><p class="pp-eyebrow">' + (review ? 'Review before adding' : 'For today’s prep list') + '</p><h2>' + (review ? 'Add these lines?' : 'Check, then add') + '</h2><p class="pp-note">A target is what should be ready. It is not an amount to make every day.</p>' + (review ? ready.map(x => '<div class="pp-reviewrow"><span><b>' + esc(x.name) + '</b><small>' + esc(x.section) + ' · Target ' + amount(x.target, x.unit) + ' − counted ' + amount(x.count, x.unit) + '</small></span><b>' + amount(need(x), x.unit) + '</b></div>').join('') + '<p class="pp-note">Only counted items with a target and no existing open prep are included. Nothing else will be added.</p>' + button('confirm-b', 'Add ' + ready.length + ' line' + (ready.length === 1 ? '' : 's') + ' to prep', 'main full', ready.length ? '' : 'disabled') + button('back-review', 'Back to counting', 'quiet') : '<div class="pp-summary"><strong>' + ready.length + ' ready to review</strong><p>Counted, below target and not already open.</p></div><div class="pp-summary"><b>Review Sliced onions separately</b><p class="pp-note">4 kg still to prepare. There is already a 2 kg job on the list. Check that job before adding more.</p></div><p class="pp-note">Uncounted items stay unknown. A completed prep task does not count what remains.</p>' + button('review-b', 'Review needed prep', 'main full', ready.length ? '' : 'disabled')) + '<div class="pp-actions"><a class="pp-link" href="preview.html?view=editor">View section targets</a></div></aside></div></main>';
  }
  function detail(x) {
    const n = need(x), quantity = manual ? manualQty : n, valid = quantity !== null && quantity !== '' && Number(quantity) > 0;
    return '<section class="pp-detail"><h2>' + esc(x.name) + '</h2><p class="pp-note">' + esc(x.section) + ' · Unit: ' + esc(x.unit) + '</p><dl class="pp-stats"><div><dt>Target (par)</dt><dd>' + amount(x.target, x.unit) + '</dd></div><div><dt>Counted now</dt><dd>' + (x.count === null ? 'Not counted' : amount(x.count, x.unit)) + '</dd></div><div><dt>To prepare</dt><dd>' + (manual ? 'Manual' : n === null ? 'Unknown' : amount(n, x.unit)) + '</dd></div></dl><label class="pp-field"><span>Count usable prep now (' + esc(x.unit) + ')</span><input data-count="' + x.id + '" aria-label="Count usable ' + esc(x.name) + ' now" type="number" min="0" step="any" inputmode="decimal" placeholder="Not counted" value="' + (x.count === null ? '' : x.count) + '"></label>' + (x.done ? '<p class="pp-note">A job was ticked today. Count what is here now.</p>' : '') + (x.target === null ? '<p class="pp-note">Target to come. A usual amount is not a confirmed target.</p>' : x.target === 0 ? '<p class="pp-note">Target is explicitly 0. No routine prep is suggested.</p>' : '') + button('manual', manual ? 'Use count and target' : 'Enter amount manually', 'quiet') + (manual ? '<label class="pp-field"><span>Manual amount to prepare (' + esc(x.unit) + ')</span><input id="pp-manual" type="number" min="0" step="any" inputmode="decimal" value="' + esc(manualQty) + '"></label><p class="pp-note">Manual amount. This is your request, not a stock calculation.</p>' : '') + (x.existing ? '<div class="pp-conflict"><span class="pp-alert">Already on today’s list: ' + amount(x.existing, x.existingUnit || x.unit) + '</span>' + button('existing:' + x.id, 'Review existing', '') + '</div><p class="pp-note">Resolve the existing job before adding another line.</p>' : '<div class="pp-actions">' + button('add-c:' + x.id, valid ? 'Add ' + amount(Number(quantity), x.unit) + ' to ' + esc(x.section) : 'Add to prep', 'main full', valid && !added.includes(x.id) ? '' : 'disabled') + '</div>') + (added.includes(x.id) ? '<p class="pp-status">Added ' + esc(x.name) + ' to Larder in this preview.</p>' : '') + '</section>';
  }
  function addSheet() {
    app.innerHTML = '<main class="pp-sheet-scene"><div class="pp-underlay" aria-hidden="true"><p>Today’s prep list</p></div><section class="pp-sheet" aria-label="Add a line design"><div class="pp-sheethead"><div><p class="pp-eyebrow">C · Pars in Add a line</p><h1>Add a line</h1></div><a class="pp-link" href="current.html">Close</a></div><div class="pp-tabs"><button class="pp-tab" data-act="tab:write" aria-pressed="' + (tab === 'write') + '">Write a line</button><button class="pp-tab" data-act="tab:pars" aria-pressed="' + (tab === 'pars') + '">Section pars</button></div>' + (tab === 'write' ? '<section class="pp-detail"><h2>Write a line</h2><p class="pp-note">The current free-entry form stays here, one tap from Prep. Section pars is an optional way to choose an item.</p>' + button('tab:pars', 'View section pars', 'main') + '</section>' : cOpen ? '<div class="pp-change">' + button('change-item', '← Change item', 'quiet') + '</div>' + detail(item(selected)) : '<p class="pp-note">Larder · Every configured item, including items absent from today’s list or already ticked.</p><input id="pp-search" class="pp-search" type="search" aria-label="Find a prep item" placeholder="Find a prep item" value="' + esc(query) + '"><div id="pp-catalogue">' + catalogue() + '</div>') + '<p class="pp-note">Sample actions only. Closing this preview saves nothing.</p></section></main>';
  }
  function catalogue() { return matches().map(x => '<button class="pp-itempick" data-act="pick:' + x.id + '" aria-pressed="' + (selected === x.id) + '"><span><strong>' + esc(x.name) + '</strong><small>' + esc(x.section) + ' · Target ' + amount(x.target, x.unit) + (x.done ? ' · Ticked today' : '') + '</small></span><span>Choose →</span></button>').join('') || '<p class="pp-note">No matching prep items.</p>'; }
  function editRows() { return matches().map(x => '<div class="pp-catalogue-row"><span><b>' + esc(x.name) + '</b><small>' + esc(x.section) + '</small></span><span>' + amount(x.target, x.unit) + '</span>' + button('edit:' + x.id, role === 'head' ? 'Edit' : 'View', 'quiet') + '</div>').join('') || '<p>No matching prep items.</p>'; }
  function targetForm(x) {
    return '<form id="pp-target-form"><label class="pp-field"><span>Item name</span><input name="name" value="' + esc(x.name) + '" required></label><p class="pp-note">Renaming keeps this item’s identity.</p><label class="pp-field"><span>Section</span><input value="' + esc(x.section) + '" readonly></label><div class="pp-pair"><label class="pp-field"><span>Target (par)</span><input name="target" type="number" min="0" step="any" inputmode="decimal" value="' + (x.target === null ? '' : x.target) + '" placeholder="To come"></label><label class="pp-field"><span>Confirmed unit</span><select name="unit" aria-label="Confirmed unit">' + units.map(u => '<option value="' + u + '" ' + (u === x.unit ? 'selected' : '') + '>' + u + '</option>').join('') + '</select></label></div><p id="pp-unit-note" class="pp-note">Changing the unit clears the count. No automatic conversion.</p><p class="pp-note">Blank means To come. Zero means no routine prep. A learned usual never sets this target.</p><button id="pp-save-target" class="pp-btn main full" type="submit" disabled>Save sample target</button><p id="pp-saved" class="pp-status" role="status"></p></form>';
  }
  function newItemExample() {
    return '<p class="pp-eyebrow">Catalogue membership</p><h2>Add prep item</h2><p class="pp-note">Choose an existing recipe, or write a prep item name. This also works for prep without a recipe.</p><label class="pp-field"><span>Prep item name</span><input placeholder="Write an item name" aria-label="New sample prep item name"></label><label class="pp-field"><span>Section</span><select aria-label="New sample item section"><option>Larder</option><option>Grill</option><option>Sauce</option></select></label><div class="pp-pair"><label class="pp-field"><span>Target (par)</span><input type="number" min="0" placeholder="To come" aria-label="New sample target"></label><label class="pp-field"><span>Confirmed unit</span><select aria-label="New sample item unit"><option value="">Choose unit</option>' + units.map(u => '<option>' + u + '</option>').join('') + '</select></label></div><p class="pp-note">A new item would get its own identity in this section’s catalogue. It need not be on today’s list. This example does not create or save an item.</p>' + button('close-new', 'Back to target editor', '');
  }
  function editor() {
    const x = item(selected), editable = role === 'head';
    app.innerHTML = top() + '<main class="pp-panel"><aside class="pp-rail" aria-label="Existing panel rooms"><strong>Chef panel</strong><span>Today</span><span>Reports</span><span>Team</span><span class="selected">Kitchen</span></aside><section class="pp-panelcontent"><div class="pp-role"><p>' + (editable ? 'Head chef example · target editing is proposed' : 'Sous chef example · targets are read only') + '</p><label><span class="pp-note">Example role </span><select id="pp-role" aria-label="Example role"><option value="head" ' + (editable ? 'selected' : '') + '>Head chef</option><option value="sous" ' + (!editable ? 'selected' : '') + '>Sous chef</option></select></label></div><header class="pp-heading"><p class="pp-eyebrow">Kitchen · Proposed workspace</p><h1>Section prep targets</h1><p class="pp-lead">Set what each section should have ready. The same item can have its own target in another section.</p></header><div class="pp-book"><section class="pp-page"><div class="pp-pagehead"><h2>Larder</h2><span class="pp-badge">6 items</span></div>' + (editable ? '<div class="pp-actions">' + button('new-item', 'Add prep item', '') + '</div>' : '') + '<input id="pp-search" class="pp-search" type="search" aria-label="Find an item or section" placeholder="Find an item or section" value="' + esc(query) + '"><div id="pp-catalogue">' + editRows() + '</div></section><section class="pp-page" id="pp-editor">' + (addingItem && editable ? newItemExample() : '<p class="pp-eyebrow">' + (editable ? 'Change this target' : 'Confirmed target') + '</p><h2>' + esc(x.name) + '</h2>' + (editable ? targetForm(x) : '<div class="pp-readonly"><p>Larder · Target ' + amount(x.target, x.unit) + '</p><p class="pp-note">Read only in this proposed role. Ask the head chef to change a target.</p></div>')) + '<p class="pp-note">Owner and head-chef editing are proposed. This role switch is a preview, not sign-in.</p></section></div></section></main>';
  }
  function updateTargetSave() {
    const form = document.getElementById('pp-target-form');
    if (!form) return;
    const x = item(selected), data = new FormData(form), name = String(data.get('name')).trim(), raw = String(data.get('target')).trim(), unit = String(data.get('unit'));
    const changed = name !== x.name || raw !== (x.target === null ? '' : String(x.target)) || unit !== x.unit;
    document.getElementById('pp-save-target').disabled = !changed || !name || !units.includes(unit) || raw !== '' && (!Number.isFinite(Number(raw)) || Number(raw) < 0);
    const saved = document.getElementById('pp-saved'); if (saved) saved.textContent = '';
  }
  function render() { if (view === 'c') addSheet(); else if (view === 'editor') editor(); else check(); }
  app.addEventListener('input', e => {
    if (e.target.id === 'pp-search') { query = e.target.value; document.getElementById('pp-catalogue').innerHTML = view === 'editor' ? editRows() : catalogue(); }
    if (e.target.closest('#pp-target-form')) updateTargetSave();
    if (e.target.id === 'pp-manual') { manualQty = e.target.value; const add = app.querySelector('[data-act^="add-c:"]'); if (add) { add.disabled = !(Number(manualQty) > 0); add.textContent = Number(manualQty) > 0 ? 'Add ' + amount(Number(manualQty), item(selected).unit) + ' to ' + item(selected).section : 'Add to prep'; } }
  });
  app.addEventListener('change', e => {
    if (e.target.dataset.count) {
      const value = e.target.value.trim(), n = Number(value);
      if (value !== '' && (!Number.isFinite(n) || n < 0)) { feedback('Enter zero or a positive count. A blank count stays unknown.'); e.target.focus(); return; }
      item(e.target.dataset.count).count = value === '' ? null : n; render();
    }
    if (e.target.name === 'unit' && e.target.closest('#pp-target-form')) {
      const form = e.target.closest('form'); form.elements.target.value = '';
      document.getElementById('pp-unit-note').textContent = 'Unit changed. Enter a target in this unit or leave it To come. Saving clears the count; nothing is converted.';
      updateTargetSave();
    }
    if (e.target.id === 'pp-role') { role = e.target.value; addingItem = false; render(); }
  });
  app.addEventListener('submit', e => {
    if (e.target.id !== 'pp-target-form') return;
    e.preventDefault(); if (document.getElementById('pp-save-target').disabled || role !== 'head') return;
    const form = new FormData(e.target), x = item(selected), name = String(form.get('name')).trim(), raw = String(form.get('target')).trim(), unit = String(form.get('unit'));
    if (!name || !units.includes(unit) || raw !== '' && (!Number.isFinite(Number(raw)) || Number(raw) < 0)) return;
    if (unit !== x.unit) x.count = null;
    x.name = name; x.unit = unit; x.target = raw === '' ? null : Number(raw); render();
    document.getElementById('pp-saved').textContent = 'Sample saved: ' + x.name + ', ' + x.section + ', target ' + amount(x.target, x.unit) + '. Nothing was sent.';
  });
  app.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const [action, id] = el.dataset.act.split(':');
    if (action === 'review-b') { review = true; render(); document.getElementById('pp-review').scrollIntoView({ block: 'start' }); }
    else if (action === 'back-review') { review = false; render(); }
    else if (action === 'confirm-b') { const ready = eligible(); lastAddition = ready.map(x => x.id); added.push(...lastAddition); review = false; render(); feedback('Preview: added ' + ready.map(x => x.name + ' ' + amount(need(x), x.unit)).join(', ') + ' to Larder. Nothing was sent.', true); }
    else if (action === 'existing') { feedback('Existing sample job: ' + item(id).name + ', ' + amount(item(id).existing, item(id).existingUnit || item(id).unit) + ', still open. Review it on Prep; this preview will not add a duplicate.'); }
    else if (action === 'pick') {
      cDrafts[selected] = { manual, manualQty }; selected = id;
      const draft = cDrafts[id] || {}; manual = !!draft.manual; manualQty = draft.manualQty || '';
      cOpen = true; render();
    }
    else if (action === 'change-item') { cDrafts[selected] = { manual, manualQty }; cOpen = false; render(); }
    else if (action === 'edit') { selected = id; addingItem = false; render(); document.getElementById('pp-editor').scrollIntoView({ block: 'nearest' }); }
    else if (action === 'new-item') { addingItem = true; render(); document.getElementById('pp-editor').scrollIntoView({ block: 'nearest' }); }
    else if (action === 'close-new') { addingItem = false; render(); }
    else if (action === 'tab') { tab = id; render(); }
    else if (action === 'manual') { manual = !manual; render(); }
    else if (action === 'add-c') { lastAddition = [id]; added.push(id); feedback('Preview: added ' + item(id).name + ' ' + amount(manual ? Number(manualQty) : need(item(id)), item(id).unit) + ' to Larder. Nothing was sent.', true); render(); }
  });
  document.getElementById('pp-feedback').addEventListener('click', e => { if (e.target.closest('[data-act="undo"]')) { const names = lastAddition.map(id => item(id).name); added = added.filter(id => !lastAddition.includes(id)); lastAddition = []; render(); feedback('Undone in preview: ' + (names.join(', ') || 'sample addition') + '.'); } });
  render();
})();
