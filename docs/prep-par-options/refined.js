(function () {
  'use strict';
  const params = new URLSearchParams(location.search), requested = params.get('view');
  const view = ['panel', 'a', 'b', 'c'].includes(requested) ? requested : 'a';
  const app = document.getElementById('rp-app');
  const items = [
    { id: 'l-onions', section: 'Larder', name: 'Sliced onions', aliases: ['onions', 'slice onions'], minimum: 4, unit: 'tubs', instruction: 'Slice evenly. Keep covered and labelled.', recipe: true },
    { id: 'l-slaw', section: 'Larder', name: 'Slaw', aliases: ['coleslaw'], minimum: 2, unit: 'tubs', instruction: 'Check the dressing and label before service.', recipe: true },
    { id: 'l-cucumber', section: 'Larder', name: 'Pickled cucumber', aliases: ['pickles'], minimum: 2, unit: 'tubs', instruction: 'Check the cut and keep covered.', recipe: false },
    { id: 'l-herb', section: 'Larder', name: 'Herb sauce', aliases: ['sauce'], minimum: 1, unit: 'L', instruction: 'Check the label and stir before service.', recipe: true },
    { id: 'l-tomato', section: 'Larder', name: 'Tomato sauce', aliases: ['sauce'], minimum: 2, unit: 'L', instruction: 'Check usable quantity and label.', recipe: true },
    { id: 'l-lemons', section: 'Larder', name: 'Lemon wedges', aliases: ['lemons'], minimum: null, unit: 'tubs', instruction: 'Minimum to come from the head chef.', recipe: false },
    { id: 'g-onions', section: 'Grill', name: 'Grilled onions', aliases: ['onions'], minimum: 2, unit: 'tubs', instruction: 'Keep covered and labelled for the grill.', recipe: true },
    { id: 'g-butter', section: 'Grill', name: 'Herb butter', aliases: ['butter'], minimum: 1, unit: 'kg', instruction: 'Check portions and label.', recipe: true }
  ];
  const tasks = [
    { name: 'Sliced onions', section: 'Larder', quantity: '1 tub', itemId: 'l-onions' },
    { name: 'Pickled cucumber', section: 'Larder', quantity: '2 tubs', itemId: 'l-cucumber' },
    { name: 'Herb sauce', section: 'Larder', quantity: '1 L', itemId: 'l-herb' },
    { name: 'Wash salad leaves', section: 'Larder', quantity: '2 tubs', itemId: '' },
    { name: 'Slaw', section: 'Larder', quantity: '1 tub', itemId: 'l-slaw', done: true },
    { name: 'Grilled onions', section: 'Grill', quantity: '1 tub', itemId: 'g-onions' }
  ];
  const units = ['tubs', 'kg', 'L', 'portions', 'batch'];
  let section = 'Larder', mode = view === 'c' ? 'check' : 'work', addOpen = view === 'a';
  let text = 'onions', quantity = '', unit = 'tubs', chosen = '', role = 'head', selected = 'l-onions', status = '', recipeOpen = '', unavailable = false;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const normal = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const find = id => items.find(x => x.id === id);
  const sectionItems = () => items.filter(x => x.section === section);
  const minimum = x => x.minimum === null ? 'To come' : '[' + x.minimum + ' ' + x.unit + ']';
  const btn = (action, label, cls, attrs) => '<button type="button" class="rp-btn ' + (cls || '') + '" data-action="' + action + '" ' + (attrs || '') + '>' + label + '</button>';
  function sections(id) { return '<label class="rp-field"><span>Section</span><select id="' + id + '">' + ['Larder', 'Grill'].map(s => '<option' + (section === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></label>'; }
  function match() {
    if (unavailable) return { kind: 'unavailable', list: [] };
    const q = normal(text), picked = find(chosen);
    if (picked && picked.section === section && normal(picked.name) === q) return { kind: 'selected', item: picked };
    if (!q) return { kind: 'empty', list: [] };
    const exact = sectionItems().filter(x => [x.name].concat(x.aliases).some(n => normal(n) === q));
    if (exact.length === 1) return { kind: 'exact', item: exact[0] };
    if (exact.length > 1) return { kind: 'ambiguous', list: exact };
    let possible = sectionItems().filter(x => [x.name].concat(x.aliases).some(n => normal(n).includes(q)));
    // This explicit typo sample offers a choice only. It never resolves a standard automatically.
    if (!possible.length && q === 'oninos') possible = sectionItems().filter(x => x.aliases.includes('onions'));
    return { kind: possible.length ? 'suggestions' : 'unknown', list: possible };
  }
  function matchHTML() {
    const m = match();
    if (m.item) return '<div class="rp-minimum" data-linked-item="' + m.item.id + '"><strong>' + esc(m.item.name) + '</strong><p>Minimum ready before service: <b>' + minimum(m.item) + '</b></p><p class="rp-matchnote">' + esc(section) + ' · ' + (m.kind === 'selected' ? 'You selected this item.' : normal(text) === normal(m.item.name) ? 'Exact item name.' : 'Head-approved matching name: “' + esc(text.trim()) + '”.') + '</p></div>';
    if (m.kind === 'unavailable') return '<div class="rp-minimum"><strong>Standards unavailable</strong><p class="rp-note">The minimum could not be read. Try again, or add your ordinary prep line.</p>' + btn('retry', 'Try again') + '</div>';
    if (m.kind === 'empty') return '<p class="rp-note">Write a prep item to see its section minimum.</p>';
    if (m.kind === 'unknown') return '<p class="rp-note">No section standard linked in ' + esc(section) + '. This will stay an ordinary prep line.</p>';
    return '<div class="rp-minimum"><strong>' + (m.kind === 'ambiguous' ? 'More than one standard matches. Choose an item.' : 'Possible item. Select to show its minimum.') + '</strong><div class="rp-choices">' + m.list.map(x => btn('choose:' + x.id, '<span>' + esc(x.name) + '<br><small>' + esc(x.section) + '</small></span><span>Choose</span>', 'rp-choice')).join('') + '</div></div>';
  }
  function amountValid() { return quantity.trim() !== '' && Number.isFinite(Number(quantity)) && Number(quantity) > 0 && units.includes(unit); }
  function addHTML() {
    return '<section aria-label="Add a prep line"><div class="rp-listhead"><h2>Add a line</h2>' + btn('close-add', 'Back to work', 'quiet') + '</div><form id="rp-add-form"><label class="rp-field"><span>Prep item</span><input id="rp-text" autocomplete="off" maxlength="160" value="' + esc(text) + '" placeholder="Write a new line..."></label><div id="rp-match" aria-live="polite">' + matchHTML() + '</div><div class="rp-formgrid"><label class="rp-field"><span>Amount to make</span><input id="rp-quantity" type="number" min="0" step="any" inputmode="decimal" placeholder="Enter amount" value="' + esc(quantity) + '"></label><label class="rp-field"><span>Unit</span><select id="rp-unit">' + units.map(u => '<option' + (u === unit ? ' selected' : '') + '>' + u + '</option>').join('') + '</select></label></div><p class="rp-note">The minimum is what should be ready. Enter how much you want made.</p><button id="rp-add" class="rp-btn main" type="submit"' + (!amountValid() || !text.trim() ? ' disabled' : '') + '>Add to ' + esc(section) + '</button><p id="rp-add-status" class="rp-status" role="status">' + esc(status) + '</p></form><details class="rp-exampletools"><summary>Try matching examples</summary><div class="rp-actions">' + btn('example:onions', 'Approved alias') + btn('example:on', 'Partial name') + btn('example:oninos', 'Typo') + btn('example:sauce', 'Ambiguous name') + btn('example:Clean bench', 'Unlisted prep') + btn('unavailable', 'Unavailable standards') + '</div></details></section>';
  }
  function workHTML() {
    const rows = tasks.map((x, i) => ({ x, i })).filter(y => y.x.section === section && !y.x.done);
    const done = tasks.filter(x => x.section === section && x.done).length;
    return '<section aria-label="Today’s work"><div class="rp-listhead"><h2>Today’s prep</h2><span class="rp-note">' + done + ' done</span></div>' + rows.map(({ x, i }) => '<article class="rp-workrow">' + btn('tick:' + i, '○', 'rp-tick', 'aria-label="Tick ' + esc(x.name) + ' as done"') + '<span><b>' + esc(x.name) + '</b>' + (view === 'b' && x.itemId ? '<small>Minimum ready: ' + minimum(find(x.itemId)) + '</small>' : '') + '</span><span class="rp-taskqty">[' + esc(x.quantity) + ']</span></article>').join('') + (rows.length ? '' : '<p class="rp-note">No open tasks for this section.</p>') + '<div class="rp-actions rp-adddock">' + btn('open-add', 'Add a line', 'main') + '</div><p class="rp-status" role="status">' + esc(status) + '</p><p class="rp-note">Task amounts are amounts to make. Done tasks stay separate from the Before service reference.</p></section>';
  }
  function checkHTML() {
    return '<section aria-label="Before service reference"><h2>Before service</h2><p class="rp-lead">Check every item against the head chef’s minimum.</p><p class="rp-note">' + sectionItems().length + ' items · Includes absent and ticked prep</p>' + sectionItems().map(x => '<article class="rp-reference" data-standard="' + x.id + '"><h3>' + esc(x.name) + '</h3><p class="rp-minline">Minimum ready: ' + minimum(x) + '</p><p class="rp-note">[' + esc(x.instruction) + ']</p><div class="rp-actions">' + btn('prep:' + x.id, 'Add to prep') + (x.recipe ? '<a class="rp-link" href="#recipe-' + x.id + '" data-recipe="' + x.id + '">Recipe</a>' : '') + '</div>' + (recipeOpen === x.id ? '<div class="rp-recipe" id="recipe-' + x.id + '"><b>' + esc(x.name) + ' recipe</b><p>[Recipe details to come.] In the book, this opens the linked recipe.</p></div>' : '') + '</article>').join('') + '</section>';
  }
  function staffHTML() {
    const label = { a: 'A · Smart Add', b: 'B · Minimums beside work', c: 'C · Before service' }[view];
    return '<header class="rp-top"><strong>Kitchen Book</strong><span>Prep · Sample staff view</span></header><main class="rp-wrap"><p class="rp-eyebrow">' + label + '</p><div class="rp-notebook"><div class="rp-toolbar">' + sections('rp-section') + '<div class="rp-mode" role="group" aria-label="Prep view">' + btn('mode:work', 'Work', '', 'aria-pressed="' + (mode === 'work') + '"') + btn('mode:check', 'Before service', '', 'aria-pressed="' + (mode === 'check') + '"') + '</div></div>' + (mode === 'check' ? checkHTML() : addOpen ? addHTML() : workHTML()) + '</div></main>';
  }
  function editHTML() {
    const x = find(selected), editable = role !== 'sous';
    return '<section class="rp-editor" aria-label="Selected standard"><p class="rp-eyebrow">' + (editable ? 'Edit standard' : 'Read only') + '</p><h2>' + esc(x.name) + '</h2>' + (!editable ? '<p class="rp-note">Ask the head chef to change a standard.</p>' : '') + '<form id="rp-edit-form"><fieldset' + (!editable ? ' disabled' : '') + '><label class="rp-field"><span>Item name</span><input name="name" maxlength="160" value="' + esc(x.name) + '"></label><div class="rp-formgrid"><label class="rp-field"><span>Minimum ready</span><input name="minimum" type="number" min="0" step="any" value="' + (x.minimum === null ? '' : x.minimum) + '" placeholder="To come"></label><label class="rp-field"><span>Unit</span><select name="unit">' + units.map(u => '<option' + (u === x.unit ? ' selected' : '') + '>' + u + '</option>').join('') + '</select></label></div><label class="rp-field"><span>Approved matching names</span><input name="aliases" value="' + esc(x.aliases.join(', ')) + '"></label><p class="rp-note">Separate names with commas. Shared names require staff to choose.</p><label class="rp-field"><span>Before service instruction</span><textarea name="instruction" maxlength="300">' + esc(x.instruction) + '</textarea></label></fieldset><p class="rp-note">Example values only. Blank minimum means To come; zero is an explicit minimum.</p>' + (editable ? '<button id="rp-save" type="submit" class="rp-btn main" disabled>Save sample standard</button>' : '') + '<p id="rp-save-status" class="rp-status" role="status">' + esc(status) + '</p></form></section>';
  }
  function panelHTML() {
    return '<header class="rp-top"><strong>Kitchen Book</strong><span>' + (role === 'admin' ? 'Admin' : role === 'head' ? 'Head chef' : 'Sous chef') + ' panel</span></header><main class="rp-panel"><aside class="rp-rail" aria-label="Panel rooms"><strong>Chef panel</strong>' + ['Today', 'Reports', 'Team', 'Kitchen', 'Prep'].map(s => '<span class="rp-room' + (s === 'Prep' ? ' current' : '') + '"' + (s === 'Prep' ? ' aria-current="page"' : '') + '>' + s + '</span>').join('') + '</aside><section class="rp-panelcontent"><div class="rp-rolebar"><p class="rp-note">' + (role === 'sous' ? 'Sous chefs read the section standards.' : 'Head chef and verified admin set the standards.') + '</p><label class="rp-field"><span>Sample role</span><select id="rp-role"><option value="head"' + (role === 'head' ? ' selected' : '') + '>Head chef</option><option value="admin"' + (role === 'admin' ? ' selected' : '') + '>Verified admin</option><option value="sous"' + (role === 'sous' ? ' selected' : '') + '>Sous chef</option></select></label></div><p class="rp-eyebrow">Prep room</p><h1>Section prep standards</h1><p class="rp-lead">The permanent list of prep each section should have ready before service.</p>' + sections('rp-section') + '<div class="rp-panelgrid"><section aria-label="Section standards"><div class="rp-listhead"><h2>' + esc(section) + '</h2><span class="rp-note">' + sectionItems().length + ' items</span></div><div class="rp-catalogue">' + sectionItems().map(x => '<article class="rp-catalogue-row' + (selected === x.id ? ' selected' : '') + '"><h3>' + esc(x.name) + '</h3><p>Minimum ready: <b>' + minimum(x) + '</b></p><p class="rp-note">Matching names: ' + esc(x.aliases.join(', ') || 'None') + '</p><p class="rp-note">[' + esc(x.instruction) + ']</p>' + btn('edit:' + x.id, role === 'sous' ? 'View standard' : 'Edit standard', 'quiet', 'aria-label="' + (role === 'sous' ? 'View ' : 'Edit ') + esc(x.name) + '"') + '</article>').join('') + '</div><a class="rp-link" href="refined.html?view=c">Open Before service example</a></section>' + editHTML() + '</div></section></main>';
  }
  function render() { app.innerHTML = view === 'panel' ? panelHTML() : staffHTML(); }
  function updateAdd() {
    const box = document.getElementById('rp-match'); if (box) box.innerHTML = matchHTML();
    const button = document.getElementById('rp-add'); if (button) button.disabled = !text.trim() || !amountValid();
    const message = document.getElementById('rp-add-status'); if (message) message.textContent = status;
  }
  function editDraft() {
    const form = document.getElementById('rp-edit-form'); if (!form) return null;
    const data = new FormData(form), raw = String(data.get('minimum') || '').trim();
    return { name: String(data.get('name') || '').trim(), minimum: raw === '' ? null : Number(raw), unit: String(data.get('unit') || ''), aliases: String(data.get('aliases') || '').split(',').map(s => s.trim()).filter(Boolean), instruction: String(data.get('instruction') || '').trim() };
  }
  function editValid(d) { return d && d.name && units.includes(d.unit) && (d.minimum === null || Number.isFinite(d.minimum) && d.minimum >= 0); }
  function changed(d) { const x = find(selected); return ['name', 'minimum', 'unit', 'aliases', 'instruction'].some(k => JSON.stringify(x[k]) !== JSON.stringify(d[k])); }
  app.addEventListener('input', e => {
    if (e.target.id === 'rp-text') { text = e.target.value; chosen = ''; status = ''; updateAdd(); }
    if (e.target.id === 'rp-quantity') { quantity = e.target.value; status = ''; updateAdd(); }
    if (e.target.closest('#rp-edit-form') && role !== 'sous') { const d = editDraft(); document.getElementById('rp-save').disabled = !editValid(d) || !changed(d); document.getElementById('rp-save-status').textContent = ''; }
  });
  app.addEventListener('change', e => {
    if (e.target.id === 'rp-section') { section = e.target.value; chosen = ''; status = ''; recipeOpen = ''; selected = sectionItems()[0].id; render(); }
    if (e.target.id === 'rp-unit') { unit = e.target.value; updateAdd(); }
    if (e.target.id === 'rp-role') { role = e.target.value; status = ''; render(); }
    if (e.target.closest('#rp-edit-form') && role !== 'sous') { const d = editDraft(); document.getElementById('rp-save').disabled = !editValid(d) || !changed(d); }
  });
  app.addEventListener('click', e => {
    const recipe = e.target.closest('[data-recipe]');
    if (recipe) { e.preventDefault(); recipeOpen = recipeOpen === recipe.dataset.recipe ? '' : recipe.dataset.recipe; render(); return; }
    const button = e.target.closest('[data-action]'); if (!button) return;
    const action = button.dataset.action;
    if (action.startsWith('mode:')) { mode = action.slice(5); status = ''; }
    if (action === 'open-add') { addOpen = true; status = ''; }
    if (action === 'close-add') { addOpen = false; status = ''; }
    if (action.startsWith('choose:') || action.startsWith('prep:')) {
      const x = find(action.split(':')[1]);
      chosen = x.id; text = x.name; section = x.section;
      // A new request from the reference starts blank. Selecting a typing suggestion keeps entered work and its unit.
      if (action.startsWith('prep:')) { quantity = ''; unit = x.unit; }
      else if (!quantity.trim()) unit = x.unit;
      mode = 'work'; addOpen = true; status = ''; unavailable = false;
    }
    if (action.startsWith('example:')) { text = action.slice(8); chosen = ''; status = ''; unavailable = false; }
    if (action === 'unavailable') { unavailable = true; chosen = ''; }
    if (action === 'retry') unavailable = false;
    if (action.startsWith('tick:')) { const x = tasks[Number(action.slice(5))]; x.done = true; status = 'Ticked ' + x.name + ' in this sample. Its standard remains in Before service.'; }
    if (action.startsWith('edit:')) { selected = action.slice(5); status = ''; }
    render();
  });
  app.addEventListener('submit', e => {
    e.preventDefault();
    if (e.target.id === 'rp-add-form') {
      if (!amountValid() || !text.trim()) return;
      const m = match(), name = m.item ? m.item.name : text.trim(), amount = Number(quantity) + ' ' + unit;
      tasks.push({ name, section, quantity: amount, itemId: m.item ? m.item.id : '' });
      status = 'Added ' + name + ', [' + amount + '], to ' + section + ' in this sample.';
      quantity = ''; render();
    }
    if (e.target.id === 'rp-edit-form' && role !== 'sous') {
      const d = editDraft(); if (!editValid(d) || !changed(d)) return;
      Object.assign(find(selected), d); status = 'Saved sample standard for ' + d.name + '. Nothing was sent to the book.'; render();
    }
  });
  render();
})();
