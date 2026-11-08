(function () {
  'use strict';
  const params = new URLSearchParams(location.search), requested = params.get('view');
  const view = ['panel', 'a', 'b', 'c'].includes(requested) ? requested : 'a';
  const app = document.getElementById('rp-app');
  const shellHeader = "<header class=\"wtop has-back\"><div class=\"wtop-start\"><button type=\"button\" class=\"wtop-back\" data-action=\"context\" aria-label=\"Back to Kitchen Book\" title=\"Back to Kitchen Book\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" aria-hidden=\"true\"><path d=\"M10 3 L5 8 L10 13\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path></svg></button><a class=\"wtop-brand\" href=\"#\" data-action=\"context\" aria-label=\"Kitchen Book, home\"><span class=\"rb-text\"><span class=\"rb-eb\">Leichhardt Hotel Kitchen</span><b>Kitchen Book</b></span></a></div><nav class=\"pnav\" aria-label=\"Main\"><a href=\"#\" data-action=\"context\">Recipes</a><a href=\"#\" data-action=\"context\" aria-current=\"page\">Prep</a><a href=\"#\" data-action=\"context\">Orders</a><a href=\"#\" data-action=\"context\">Wastage</a><a href=\"#\" data-action=\"context\">Transfers</a><a href=\"#\" data-action=\"context\">Guides</a></nav><span class=\"wtop-icons\"><span class=\"tm-slot\"></span><button type=\"button\" class=\"wtop-btn nbell\" data-action=\"context\" aria-label=\"No shift pings on now\"><svg width=\"22\" height=\"22\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M32 8c-9 0-16 7-16 16v10c0 5-3 8-6 12h44c-3-4-6-7-6-12V24c0-9-7-16-16-16z\"></path><path d=\"M26 52c1 4 3 6 6 6s5-2 6-6\"></path></svg><span class=\"wtop-lbl\">Pings</span></button><button type=\"button\" class=\"wtop-btn wtop-who on\" data-action=\"context\" aria-haspopup=\"true\" aria-expanded=\"false\" title=\"Signed in as Ann\" aria-label=\"Signed in as Ann, menu and Settings\"><svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M7 14.2A3.6 3.6 0 1 1 8.6 7.4a4.6 4.6 0 0 1 6.8 0A3.6 3.6 0 1 1 17 14.2V20H7Z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linejoin=\"round\"></path><path d=\"M7 16.8h10\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linecap=\"round\"></path></svg><span class=\"wtop-av\" aria-hidden=\"true\">A</span><span class=\"wtop-lbl wtop-who-n\">Ann</span></button></span></header>";
  const shellTabs = "<nav class=\"tabbar\" aria-label=\"Main\"><a href=\"#\" data-action=\"context\"><svg width=\"26\" height=\"26\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"32\" cy=\"32\" r=\"22\"></circle><circle cx=\"32\" cy=\"32\" r=\"13\" stroke-dasharray=\"4 5\"></circle><path d=\"M6 14v14M10 14v14M14 14v14M6 28h8M10 28v22\"></path><path d=\"M58 14c-3 2-5 6-5 11v3h5v22\"></path></svg><span>Recipes</span></a><a href=\"#\" data-action=\"context\" aria-current=\"page\"><svg width=\"26\" height=\"26\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"12\" y=\"10\" width=\"40\" height=\"48\" rx=\"5\"></rect><path d=\"M24 10V7h16v3\"></path><path d=\"M20 24l3 3 5-6M20 38l3 3 5-6\"></path><path d=\"M34 25h12M34 39h12\"></path></svg><span>Prep</span></a><a href=\"#\" data-action=\"context\"><svg width=\"26\" height=\"26\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M8 20l24-12 24 12v26L32 58 8 46z\"></path><path d=\"M8 20l24 12 24-12M32 32v26\"></path><path d=\"M20 14l24 12\"></path></svg><span>Orders</span></a><a href=\"#\" data-action=\"context\"><svg width=\"26\" height=\"26\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M10 18h44\"></path><path d=\"M25 18v-6h14v6\"></path><path d=\"M15 18l3 38h28l3-38\"></path><path d=\"M27 28v18M37 28v18\"></path></svg><span>Wastage</span></a><a href=\"#\" data-action=\"context\"><svg width=\"26\" height=\"26\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M10 22h40\"></path><path d=\"M42 14l8 8-8 8\"></path><path d=\"M54 42H14\"></path><path d=\"M22 34l-8 8 8 8\"></path></svg><span>Transfers</span></a><a href=\"#\" data-action=\"context\"><svg width=\"26\" height=\"26\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M32 16c-6-4-14-6-24-6v38c10 0 18 2 24 6 6-4 14-6 24-6V10c-10 0-18 2-24 6z\"></path><path d=\"M32 16v38\"></path><path d=\"M14 21c4 0 8 1 12 3M14 31c4 0 8 1 12 3M38 24c4-2 8-3 12-3M38 34c4-2 8-3 12-3\"></path></svg><span>Guides</span></a></nav>";
  const sheetRoot = document.createElement('div'); sheetRoot.id = 'rp-sheet-root'; document.body.appendChild(sheetRoot);
  const boxIcon = '<svg viewBox="0 0 26 26" width="26" height="26" aria-hidden="true"><rect x="2.5" y="2.5" width="21" height="21" rx="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  const tickIcon = '<svg viewBox="0 0 26 26" width="26" height="26" aria-hidden="true"><path d="m4 13 6 7L23 5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const plusIcon = '<svg class="wk-plus" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v14M3 10h14"/></svg>';
  let returnAction = 'open-add', panelQuery = '';

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
  const btn = (action, label, cls, attrs) => '<button type="button" class="' + (cls || 'btn') + '" data-action="' + action + '" ' + (attrs || '') + '>' + label + '</button>';
  function sections(id, add) {
    return '<div class="field rp-section-field"><span class="label">Section</span><select hidden id="' + id + '" aria-label="Section">' + ['Larder', 'Grill'].map(s => '<option' + (section === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select><div class="' + (add ? 'nb-sugg sec-chips' : 'chips') + '" role="group" aria-label="Section">' + ['Larder', 'Grill'].map(s => btn('section:' + s, s, 'chip', 'aria-pressed="' + (section === s) + '"')).join('') + '</div></div>';
  }
  function unitPicker() {
    return '<select hidden id="rp-unit" aria-label="Unit">' + units.map(u => '<option' + (u === unit ? ' selected' : '') + '>' + u + '</option>').join('') + '</select><div class="w-pick nb-units"><span class="nb-ql" id="rp-unit-label">Unit</span><div class="seg" role="radiogroup" aria-labelledby="rp-unit-label">' + units.map(u => btn('unit:' + u, u, 'seg-b', 'role="radio" aria-checked="' + (u === unit) + '"')).join('') + '</div></div>';
  }
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
    if (m.item) return '<div class="rp-minimum" data-linked-item="' + m.item.id + '"><span class="label">Minimum ready before service</span><p><strong>' + esc(m.item.name) + '</strong> <b>' + minimum(m.item) + '</b></p><p class="hint">' + esc(section) + ' · ' + (m.kind === 'selected' ? 'You selected this item.' : normal(text) === normal(m.item.name) ? 'Exact item name.' : 'Head-approved matching name: “' + esc(text.trim()) + '”.') + '</p></div>';
    if (m.kind === 'unavailable') return '<p class="p-err" role="status">Standards unavailable. Try again, or add your ordinary prep line. ' + btn('retry', 'Try again', 'p-link') + '</p>';
    if (m.kind === 'empty') return '<p class="hint">Write a prep item to see its section minimum.</p>';
    if (m.kind === 'unknown') return '<p class="hint">No section standard linked in ' + esc(section) + '. This will stay an ordinary prep line.</p>';
    return '<p class="nb-sgh">' + (m.kind === 'ambiguous' ? 'More than one standard matches. Choose an item.' : 'Possible item. Select to show its minimum.') + '</p><div class="nb-sugg nb-sgl">' + m.list.map(x => '<div class="nb-sgr">' + btn('choose:' + x.id, '<span class="nb-sgt">' + esc(x.name) + '</span><span class="nb-us">' + esc(x.section) + ' · Choose this item</span>', 'nb-sg') + '</div>').join('') + '</div>';
  }
  function amountValid() { return quantity.trim() !== '' && Number.isFinite(Number(quantity)) && Number(quantity) > 0 && units.includes(unit); }
  function addHTML() {
    return '<div class="sheet-bg" data-action="close-add"></div><section class="sheet p-sheet" role="dialog" aria-modal="true" aria-labelledby="rp-add-title"><div class="sheet-grip" aria-hidden="true"></div><h3 id="rp-add-title" tabindex="-1">Add to prep</h3><p class="hint rp-sample-note">Design example. Approved kitchen standards: To come.</p><form id="rp-add-form" class="nb-add"><div class="field"><label class="visually-hidden" for="rp-text">Prep item</label><input id="rp-text" class="nb-in nb-in-text" autocomplete="off" maxlength="160" value="' + esc(text) + '" placeholder="Write a new line..."></div>' + sections('rp-section', true) + '<div id="rp-match" aria-live="polite">' + matchHTML() + '</div><div class="field"><label class="label" for="rp-quantity">Amount to make</label><input id="rp-quantity" class="nb-in nb-in-qty" type="number" min="0" step="any" inputmode="decimal" placeholder="Enter amount" value="' + esc(quantity) + '"></div>' + unitPicker() + '<p class="hint">The minimum is what should be ready. Enter how much you want made.</p><button id="rp-add" class="nb-addbtn" type="submit"' + (!amountValid() || !text.trim() ? ' disabled' : '') + '>Add to ' + esc(section) + '</button><p id="rp-add-status" class="rp-status" role="status">' + esc(status) + '</p></form>' + btn('close-add', 'Back to work', 'btn sheet-x') + '<details class="rp-exampletools"><summary>Preview controls: try matching examples</summary><div class="btn-row">' + btn('example:onions', 'Approved alias') + btn('example:on', 'Partial name') + btn('example:oninos', 'Typo') + btn('example:sauce', 'Ambiguous name') + btn('example:Clean bench', 'Unlisted prep') + btn('unavailable', 'Unavailable standards') + '</div></details></section>';
  }
  function rowHTML(x, i, done) {
    const flag = '<svg class="nb-ai" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V4M6 4h11l-2 4 2 4H6"/></svg>';
    const book = '<svg class="nb-ai" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6v14"/></svg>';
    const existingActions = btn('context', flag + '<span class="nb-aw">Urgent</span>', 'nb-star', 'aria-pressed="false" aria-label="Mark urgent: ' + esc(x.name) + '"') + (x.itemId && find(x.itemId).recipe ? '<a class="nb-go" href="#" data-action="context" aria-label="Recipe for ' + esc(x.name) + '">' + book + '<span class="nb-aw">Recipe</span></a>' : '') + btn('context', '⋯', 'nb-more', 'aria-label="More for ' + esc(x.name) + '"');
    return '<li class="nb-row rp-workrow' + (done ? ' is-done' : '') + '">' + btn('tick:' + i, done ? tickIcon : boxIcon, 'nb-box', 'aria-pressed="' + !!done + '" aria-label="' + (done ? 'Untick ' : 'Tick ') + esc(x.name) + '"') + '<span class="nb-main"><span class="nb-t">' + esc(x.name) + ' <span class="nb-q rp-taskqty">[' + esc(x.quantity) + ']</span></span><span class="nb-meta">' + (done ? 'Ticked in this sample' : 'Amount to make') + '</span>' + (view === 'b' && x.itemId ? '<span class="rp-row-minimum">Minimum ready: ' + minimum(find(x.itemId)) + '</span>' : '') + '</span><span class="nb-acts">' + btn('on:' + i, '<svg class="nb-ai" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M6 21v-4a6 6 0 0 1 12 0v4"/></svg><span class="nb-onp">' + (x.on ? 'On it ✓' : 'On it') + '</span>', 'nb-onbtn', 'aria-pressed="' + !!x.on + '" aria-label="On ' + esc(x.name) + '"') + existingActions + '</span></li>';
  }
  function workHTML() {
    const rows = tasks.map((x, i) => ({ x, i })).filter(y => y.x.section === section && !y.x.done);
    const all = tasks.filter(x => x.section === section), done = all.filter(x => x.done).length;
    return '<section aria-label="Today’s work"><div class="nb-hd"><span>' + esc(section) + '</span><span class="nb-hbar" aria-hidden="true"><i style="width:' + (all.length ? Math.round(done / all.length * 100) : 0) + '%"></i></span><small>' + done + '/' + all.length + '</small></div><ul class="nb-rows">' + rows.map(({ x, i }) => rowHTML(x, i, false)).join('') + '</ul>' + (rows.length ? '' : '<p class="nb-empty">No open tasks for this section.</p>') + '<p class="rp-status" role="status">' + esc(status) + '</p></section>';
  }
  function checkHTML() {
    return '<section aria-label="Before service reference"><h3 class="nb-sh">Before service · ' + esc(section) + '</h3><p class="nb-sd">Check every item against the head chef’s minimum.</p><p class="nb-sd">' + sectionItems().length + ' items · Includes absent and ticked prep</p>' + sectionItems().map(x => '<article class="rp-reference" data-standard="' + x.id + '"><h3 class="rp-reference-name">' + esc(x.name) + '</h3><p class="rp-minline"><span class="label">Minimum ready</span> <b>' + minimum(x) + '</b></p><p class="hint">[' + esc(x.instruction) + ']</p><div class="btn-row">' + btn('prep:' + x.id, 'Add to prep', 'nb-btn') + (x.recipe ? '<a class="p-link rp-recipe-link" href="#recipe-' + x.id + '" data-recipe="' + x.id + '">Recipe</a>' : '') + '</div>' + (recipeOpen === x.id ? '<div class="rp-recipe" id="recipe-' + x.id + '"><b>' + esc(x.name) + ' recipe</b><p>[Recipe details to come.] In the book, this opens the linked recipe.</p></div>' : '') + '</article>').join('') + '</section>';
  }
  function staffHTML() {
    const done = tasks.filter(x => x.section === section && x.done).length, total = tasks.filter(x => x.section === section).length;
    const doneRows = tasks.map((x, i) => ({ x, i })).filter(y => y.x.section === section && y.x.done);
    const toolbar = '<nav class="nb-tabs" aria-label="Sections">' + ['Larder', 'Grill'].map(s => btn('section:' + s, s, 'nb-tab', 'aria-pressed="' + (s === section) + '"')).join('') + '</nav>';
    const modeBar = '<div class="chips rp-mode" role="group" aria-label="Prep view">' + btn('mode:work', 'Work', 'chip', 'aria-pressed="' + (mode === 'work') + '"') + btn('mode:check', 'Before service', 'chip', 'aria-pressed="' + (mode === 'check') + '"') + '</div>';
    return '<div id="app">' + shellHeader + '<div class="page"><main class="prep"><div id="prep-root" class="is-book">' + modeBar + '<div class="nb-wrap"><div class="nb"><section class="nb-page nb-left"><header class="nb-ph"><div><h2 class="nb-title" id="rtitle" tabindex="-1">' + (mode === 'check' ? 'Before service' : 'Today') + '</h2><span class="nb-date">' + esc(section) + ' · ' + (mode === 'check' ? 'Section standards' : 'Sample service') + '</span></div><div class="nb-pw"><div class="nb-prog">' + (mode === 'check' ? sectionItems().length + ' items' : done + ' of ' + total + ' done') + '</div></div><div class="wk-dock rp-adddock">' + btn('open-add', plusIcon + 'Add a line', 'btn dark nb-addline') + '</div></header><div class="nb-body">' + (mode === 'check' ? checkHTML() : workHTML()) + '</div></section><div class="nb-spine" aria-hidden="true"></div><section class="nb-page nb-right"><header class="nb-ph"><div><h2 class="nb-title nb-dim">Handy</h2><span class="nb-date">Done today and section standards</span></div></header><div class="nb-body nb-side"><h3 class="nb-sh">Done today</h3><ul class="nb-rows">' + doneRows.map(({ x, i }) => rowHTML(x, i, true)).join('') + '</ul><h3 class="nb-sh">Before service</h3><p class="nb-sd">The full section reference includes items nobody has written today.</p>' + btn('mode:check', 'Open section standards', 'nb-btn') + '<p class="nb-sd rp-standard-note">Minimums are set by the head chef. A tick records a prep task, not a stock count.</p></div></section></div>' + toolbar + '</div></div></main></div>' + shellTabs + '</div>';
  }
  function editHTML() {
    const x = find(selected), editable = role !== 'sous';
    return '<section class="rp-editor set-block" aria-label="Selected standard"><h3 class="a-ch-h" id="rp-editor-title" tabindex="-1">' + (editable ? 'Edit standard' : 'View standard') + '</h3><p class="hint">' + esc(x.name) + ' · ' + esc(section) + (editable ? '' : ' · Read only. Ask the head chef to change a standard.') + '</p><form id="rp-edit-form"><fieldset' + (!editable ? ' disabled' : '') + '><div class="field"><label class="label" for="rp-name">Item name</label><input id="rp-name" class="search" name="name" maxlength="160" value="' + esc(x.name) + '"></div><div class="rp-formgrid"><div class="field"><label class="label" for="rp-minimum">Minimum ready</label><input id="rp-minimum" class="search" name="minimum" type="number" min="0" step="any" value="' + (x.minimum === null ? '' : x.minimum) + '" placeholder="To come"></div><div class="field"><label class="label" for="rp-edit-unit">Unit</label><select id="rp-edit-unit" class="p-select" name="unit">' + units.map(u => '<option' + (u === x.unit ? ' selected' : '') + '>' + u + '</option>').join('') + '</select></div></div><div class="field"><label class="label" for="rp-aliases">Approved matching names</label><input id="rp-aliases" class="search" name="aliases" value="' + esc(x.aliases.join(', ')) + '"></div><p class="hint">Separate names with commas. Shared names require staff to choose.</p><div class="field"><label class="label" for="rp-instruction">Before service instruction</label><textarea id="rp-instruction" class="search rp-instruction" name="instruction" maxlength="300">' + esc(x.instruction) + '</textarea></div></fieldset><p class="hint">Example values only. Blank minimum means To come; zero is an explicit minimum.</p>' + (editable ? '<div class="btn-row"><button id="rp-save" type="submit" class="btn dark" disabled>Save sample standard</button></div>' : '') + '<p id="rp-save-status" class="rp-status" role="status">' + esc(status) + '</p></form></section>';
  }
  function catalogueHTML() {
    const list = sectionItems().filter(x => normal(x.name + ' ' + x.aliases.join(' ')).includes(normal(panelQuery)));
    return '<p class="lv-count">' + list.length + ' of ' + sectionItems().length + ' items</p><div class="lv-body">' + list.map(x => '<article class="rp-catalogue-row' + (selected === x.id ? ' selected' : '') + '"><div><h4>' + esc(x.name) + '</h4><p class="hint">Minimum ready: <b>' + minimum(x) + '</b></p></div>' + btn('edit:' + x.id, role === 'sous' ? 'View' : 'Edit', 'btn', 'aria-label="' + (role === 'sous' ? 'View ' : 'Edit ') + esc(x.name) + '" aria-pressed="' + (selected === x.id) + '"') + '</article>').join('') + (!list.length ? '<p class="hint">No matching sample items.</p>' : '') + '</div>';
  }
  function panelHTML() {
    const title = role === 'admin' ? 'Admin panel' : role === 'head' ? 'Head chef panel' : 'Sous chef panel';
    const roleControl = '<label class="rp-role-control">Preview role <select id="rp-role" class="p-select"><option value="head"' + (role === 'head' ? ' selected' : '') + '>Head chef</option><option value="admin"' + (role === 'admin' ? ' selected' : '') + '>Verified admin</option><option value="sous"' + (role === 'sous' ? ' selected' : '') + '>Sous chef</option></select></label>';
    const findButton = cls => btn('find', '<span>Find</span><kbd aria-hidden="true">/</kbd>', 'a-find ' + cls, 'aria-haspopup="dialog"');
    const rail = '<aside class="a-nav">' + findButton('a-find-rail') + '<div class="a-quick-list">' + btn('context', 'Dashboard', 'a-quick') + '</div><p class="ad-nav-label">' + title + '</p><nav class="a-groups" aria-label="Panel rooms">' + ['Today', 'Reports', 'Team', 'Kitchen', 'Prep'].map(x => btn(x === 'Prep' ? 'prep-room' : 'context', '<span>' + x + '</span>', 'a-group rp-room', 'aria-current="' + (x === 'Prep' ? 'page' : 'false') + '"')).join('') + '</nav></aside>';
    const content = '<section class="set-block"><h3 class="a-ch-h">Section prep standards</h3><p class="hint">' + (role === 'sous' ? 'Read the head chef’s section standards.' : 'Set the permanent minimum and instructions for each item.') + '</p>' + sections('rp-section') + '<div class="rp-panelgrid"><section class="rp-catalogue"><div class="lv"><div class="lv-tools"><div class="lv-qw field"><label class="label" for="rp-search">Find an item</label><input id="rp-search" class="search lv-q" placeholder="Search names" value="' + esc(panelQuery) + '"></div></div><div id="rp-catalogue-body">' + catalogueHTML() + '</div></div><a class="p-link rp-preview-reference" href="refined.html?view=c">Open Before service example</a></section>' + editHTML() + '</div></section>';
    return '<div class="rp-rolebar">' + roleControl + '</div><div id="app">' + shellHeader.replace(' aria-current="page"', '') + '<div class="page"><main class="prep"><div class="p-admin ad-admin chef-panel"><div class="p-bar"><span><strong>' + title + '</strong> · Design sample</span></div><div class="ad-layout">' + rail + '<div class="ad-main"><header class="ad-heading">' + findButton('a-find-head') + '<p class="ad-eyebrow">' + title + '</p><h2 class="ad-title p-h" id="rtitle" tabindex="-1">Prep</h2><p class="ad-intro">The prep each section should have ready before service.</p></header><nav class="a-tabs" aria-label="Prep pages">' + btn('prep-room', 'Section standards', 'a-tab', 'aria-pressed="true"') + '</nav><div class="a-pane">' + content + '</div></div></div></div></main></div>' + shellTabs.replace(' aria-current="page"', '') + '</div>';
  }
  function render(focus) {
    app.innerHTML = view === 'panel' ? panelHTML() : staffHTML();
    sheetRoot.innerHTML = view !== 'panel' && addOpen ? addHTML() : '';
    document.documentElement.classList.toggle('sheet-open', view !== 'panel' && addOpen);
    if (focus && addOpen) document.getElementById('rp-text').focus({ preventScroll: true });
    if (focus && !addOpen && view !== 'panel') { const back = app.querySelector('[data-action="' + returnAction + '"]') || app.querySelector('[data-action="open-add"]'); if (back) back.focus({ preventScroll: true }); }
  }
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
  document.addEventListener('input', e => {
    if (e.target.id === 'rp-search') { panelQuery = e.target.value; document.getElementById('rp-catalogue-body').innerHTML = catalogueHTML(); }
    if (e.target.id === 'rp-text') { text = e.target.value; chosen = ''; status = ''; updateAdd(); }
    if (e.target.id === 'rp-quantity') { quantity = e.target.value; status = ''; updateAdd(); }
    if (e.target.closest('#rp-edit-form') && role !== 'sous') { const d = editDraft(); document.getElementById('rp-save').disabled = !editValid(d) || !changed(d); document.getElementById('rp-save-status').textContent = ''; }
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'rp-section') { section = e.target.value; chosen = ''; status = ''; recipeOpen = ''; selected = sectionItems()[0].id; render(); }
    if (e.target.id === 'rp-unit') { unit = e.target.value; updateAdd(); }
    if (e.target.id === 'rp-role') { role = e.target.value; status = ''; render(); }
    if (e.target.closest('#rp-edit-form') && role !== 'sous') { const d = editDraft(); document.getElementById('rp-save').disabled = !editValid(d) || !changed(d); }
  });
  document.addEventListener('click', e => {
    const recipe = e.target.closest('[data-recipe]');
    if (recipe) { e.preventDefault(); recipeOpen = recipeOpen === recipe.dataset.recipe ? '' : recipe.dataset.recipe; render(); return; }
    const button = e.target.closest('[data-action]'); if (!button) return;
    const action = button.dataset.action;
    if (action.startsWith('mode:')) { mode = action.slice(5); addOpen = false; status = ''; }
    if (action.startsWith('section:')) { section = action.slice(8); chosen = ''; status = ''; recipeOpen = ''; selected = sectionItems()[0].id; panelQuery = ''; }
    if (action.startsWith('unit:')) { unit = action.slice(5); }
    if (action === 'context') { e.preventDefault(); document.getElementById('rp-preview-status').textContent = 'The existing book navigation is shown for context. This preview stays in Prep.'; return; }
    if (action === 'find') { document.getElementById('rp-search').focus(); return; }
    if (action === 'prep-room') { document.getElementById('rtitle').focus(); return; }
    if (action.startsWith('on:')) { const x = tasks[Number(action.slice(3))]; x.on = !x.on; status = x.name + (x.on ? ': marked On it in this sample.' : ': taken off On it in this sample.'); }
    if (action === 'open-add') { returnAction = 'open-add'; addOpen = true; status = ''; }
    if (action === 'close-add') { addOpen = false; status = ''; }
    if (action.startsWith('choose:') || action.startsWith('prep:')) {
      const x = find(action.split(':')[1]);
      chosen = x.id; text = x.name; section = x.section;
      // A new request from the reference starts blank. Selecting a typing suggestion keeps entered work and its unit.
      if (action.startsWith('prep:')) { quantity = ''; unit = x.unit; returnAction = action; }
      else if (!quantity.trim()) unit = x.unit;
      mode = 'work'; addOpen = true; status = ''; unavailable = false;
    }
    if (action.startsWith('example:')) { text = action.slice(8); chosen = ''; status = ''; unavailable = false; }
    if (action === 'unavailable') { unavailable = true; chosen = ''; }
    if (action === 'retry') unavailable = false;
    if (action.startsWith('tick:')) { const x = tasks[Number(action.slice(5))]; x.done = !x.done; status = (x.done ? 'Ticked ' : 'Unticked ') + x.name + ' in this sample. Its standard remains in Before service.'; }
    if (action.startsWith('edit:')) { selected = action.slice(5); status = ''; }
    render(action === 'open-add' || action === 'close-add' || action.startsWith('prep:'));
    if (action.startsWith('edit:')) document.getElementById('rp-editor-title').focus();
  });
  document.addEventListener('submit', e => {
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
  document.addEventListener('keydown', e => {
    if (!addOpen || view === 'panel') return;
    if (e.key === 'Escape') { e.preventDefault(); addOpen = false; render(true); return; }
    if (e.key !== 'Tab') return;
    const targets = [...sheetRoot.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([hidden]):not([disabled]), summary, a[href]')].filter(x => x.getClientRects().length);
    const first = targets[0], last = targets[targets.length - 1];
    if (e.shiftKey && (document.activeElement === first || !targets.includes(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !sheetRoot.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  });
  render(view === 'a');
})();
