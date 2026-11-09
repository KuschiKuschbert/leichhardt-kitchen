'use strict';

// Standalone design fixture. No app imports, requests, storage or saved state.
(() => {
  const params = new URLSearchParams(location.search);
  const designs = {
    a: { name: 'Compact rows', description: 'All supplier deadlines stay above the shared requests. One tap to confirm an order placed. More deadlines take more list space.' },
    b: { name: 'Requests first', description: 'A nearest-deadline strip leads to the full block after the requests on a phone, or beside them on a laptop. Two taps via View on a phone; one on a laptop.' },
    c: { name: 'One-line fold', description: 'One closed disclosure keeps the next deadline, total due and overdue count in sight. Open it to see every deadline and confirm an order placed.' }
  };
  const allowedStates = ['normal', 'overdue', 'offline', 'failed', 'none', 'all-done', 'many', 'tomorrow'];
  let design = Object.hasOwn(designs, params.get('design')) ? params.get('design') : 'a';
  let role = params.get('role') === 'staff' ? 'staff' : 'chef';
  let example = allowedStates.includes(params.get('state')) ? params.get('state') : 'normal';
  let view = params.get('view') === 'compare' ? 'compare' : 'full';
  const shot = params.get('shot') === '1';
  let items = [];
  let suppliers = [];
  let sequence = 0;
  let editingId = '';
  let foldOpen = false;
  let notice = '';
  let notificationOpen = false;
  const app = document.getElementById('app');
  const dialog = document.getElementById('add-dialog');
  const form = document.getElementById('add-form');
  const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const iconPaths = {
    back: '<path d="m14 5-7 7 7 7"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    team: '<circle cx="8" cy="7" r="2.5"/><circle cx="16" cy="7" r="2.5"/><path d="M3 19v-3c0-4 10-4 10 0v3M15 13c4 0 6 1 6 4v2"/>',
    bell: '<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zM10 21h4"/>',
    chef: '<path d="M7 11a4 4 0 1 1 2-7 4 4 0 0 1 6 0 4 4 0 1 1 2 7v8H7zM7 15h10"/>',
    recipes: '<circle cx="13" cy="12" r="7"/><path d="M2 3v7h3V3M3.5 10v11M22 3v18"/>',
    prep: '<rect x="6" y="4" width="13" height="17" rx="2"/><path d="M9 2h7v4H9zM9 11l2 2 4-4M9 17h7"/>',
    orders: '<path d="m3 7 9-5 9 5v11l-9 4-9-4zM3 7l9 5 9-5M12 12v10"/>',
    waste: '<path d="M4 5h16M9 2h6M6 5l1 16h10l1-16M10 8v9M14 8v9"/>',
    transfers: '<path d="M3 7h17l-4-4M21 17H4l4 4M20 7l-4 4M4 17l4-4"/>',
    cleaning: '<path d="M12 2v12M9 2h6M9 14h6l4 8H5zM10 17l-1 5M14 17l1 5"/>',
    tick: '<path d="m5 12 4 4L19 6"/>'
  };
  const svg = key => `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[key] || iconPaths.orders}</svg>`;
  const navEntries = [['recipes', 'Recipes'], ['prep', 'Prep'], ['orders', 'Orders'], ['waste', 'Wastage'], ['transfers', 'Transfers'], ['cleaning', 'Cleaning']];

  function makeFixture() {
    items = [
      { id: 'baseline-0', name: 'Milk', amount: '6 L', time: '13:00' },
      { id: 'baseline-1', name: 'Brioche buns', amount: '4 packs', time: '13:01' },
      { id: 'baseline-2', name: 'Coriander', amount: '2 bunches', time: '13:02' },
      { id: 'baseline-3', name: 'Eggs', amount: '2 trays', urgency: 'Out', time: '13:03', recipes: ['Skillet Cookie Dough Prep', 'Cornbread'] },
      { id: 'baseline-4', name: 'Plain flour', amount: '5 kg', time: '13:04', recipes: ['Cornbread'] },
      { id: 'baseline-5', name: 'Cream', amount: '2 L', urgency: 'Out', time: '13:05', recipes: ['Creamy Garlic Sauce'] },
      { id: 'baseline-6', name: 'Tomatoes', amount: '3 kg', time: '13:06' },
      { id: 'baseline-7', name: 'Butter', amount: '2 kg', urgency: 'Low', time: '14:00', old: true, recipes: ['Cowboy Butter'] }
    ].map(item => ({ author: 'Ann', urgency: '', done: false, removed: false, feedback: '', ...item }));
    if (role === 'chef') items.sort((left, right) => {
      const priority = item => item.urgency === 'Out' ? 0 : item.old ? 1 : 2;
      return priority(left) - priority(right) || left.time.localeCompare(right.time);
    });
    suppliers = example === 'none' ? [] : [
      { id: 'northside', name: 'Northside Test Foods', time: '15:00', delivery: 'Tue 10 Nov', overdue: example === 'overdue' || example === 'many', placed: example === 'all-done' },
      { id: 'west-bay', name: 'West Bay Test Supply', time: '16:00', delivery: 'Tue 10 Nov', overdue: example === 'overdue', placed: example === 'all-done' }
    ];
    if (example === 'many') suppliers.push(
      { id: 'harbour', name: 'Harbour Test Produce', time: '16:30', delivery: 'Tue 10 Nov' },
      { id: 'ridge', name: 'Ridge Test Dairy', time: '17:00', delivery: 'Tue 10 Nov' },
      { id: 'river', name: 'River Test Seafood', time: '17:30', delivery: 'Wed 11 Nov' },
      { id: 'market', name: 'Market Test Pantry', time: '18:00', delivery: 'Wed 11 Nov' }
    );
    if (example === 'tomorrow') suppliers = [
      { id: 'northside', name: 'Northside Test Foods', time: '15:00', delivery: 'Tue 10 Nov', placed: true },
      { id: 'west-bay', name: 'West Bay Test Supply', time: '16:00', delivery: 'Wed 11 Nov', tomorrow: true }
    ];
    foldOpen = false;
    notificationOpen = false;
    sequence = 0;
    notice = '';
  }

  function announce(message) {
    document.getElementById('announcement').textContent = message;
  }

  function navMarkup(mobile) {
    return navEntries.map(([key, label]) => `<button type="button" data-action="navigation" data-name="${label}" class="${key === 'orders' ? 'active' : ''}" ${key === 'orders' ? 'aria-current="page"' : ''}>${mobile ? svg(key) : ''}<span>${label}</span></button>`).join('');
  }

  function headerMarkup() {
    return `<header class="topbar"><button type="button" class="back-button" data-action="navigation" data-name="Home" aria-label="Back to Home">${svg('back')}</button><div class="brand"><span class="brand-small">KB</span><span class="brand-full"><span class="eyebrow">Leichhardt Hotel Kitchen</span><strong>Kitchen Book</strong></span></div><nav class="desktop-nav" aria-label="Kitchen pages">${navMarkup(false)}</nav><div class="top-tools"><button class="top-tool" type="button" data-action="navigation" data-name="Cooling timer" aria-label="Cooling timer">${svg('clock')}</button><button class="top-tool team" type="button" data-action="navigation" data-name="Today's team" aria-label="Today's team">${svg('team')}</button><button class="top-tool" type="button" data-action="navigation" data-name="Pings" aria-label="Pings">${svg('bell')}</button><button class="top-tool" type="button" data-action="navigation" data-name="Chef menu" aria-label="${role === 'chef' ? 'Chef' : 'Staff'} menu">${svg('chef')}<span class="role-dot">${role === 'chef' ? 'S' : 'A'}</span></button></div></header>`;
  }

  function deadlineSummary() {
    if (example === 'failed') return { main: 'Deadlines could not be checked', counts: 'Last known: 2 due · check again online' };
    if (!suppliers.length) return { main: 'No supplier deadlines today', counts: 'Checked for Mon 9 Nov' };
    const pending = suppliers.filter(supplier => !supplier.placed);
    const overdue = pending.filter(supplier => supplier.overdue).length;
    const next = pending.find(supplier => supplier.overdue) || pending[0];
    if (!next) return { main: `${suppliers.length} supplier orders placed`, counts: 'Requests stay separate · view to undo' };
    const prefix = next.tomorrow ? 'Tomorrow: ' : '';
    const counts = `${pending.length} supplier orders due${overdue ? ` · ${overdue} overdue` : ''}${example === 'offline' ? ' · offline' : ''}`;
    return { main: `${prefix}${next.name} · ${next.tomorrow ? 'Tue ' : 'by '}${next.time}`, counts };
  }

  function supplierMarkup(supplier) {
    const unavailable = example === 'offline' || example === 'failed';
    const time = supplier.tomorrow ? `Tomorrow, Tue 10 Nov · by ${supplier.time}` : `By ${supplier.time}`;
    return `<div class="deadline-row${supplier.overdue && !supplier.placed ? ' is-overdue' : ''}" data-id="${supplier.id}"><div class="deadline-copy"><button type="button" class="supplier-link" data-action="supplier-link" data-id="${supplier.id}">${escape(supplier.name)}</button><p class="deadline-meta"><strong>${supplier.placed ? `Placed · ${time}` : supplier.overdue ? `Overdue · ${time}` : time}</strong><br class="deadline-break">For ${supplier.delivery}${supplier.tomorrow ? ' · early order' : ''}</p></div><button type="button" class="supplier-place${supplier.placed ? ' is-placed' : ''}" data-action="supplier-place" data-id="${supplier.id}" ${unavailable ? 'disabled' : ''} aria-label="${supplier.placed ? 'Undo order placed for' : 'Confirm order placed for'} ${escape(supplier.name)}${supplier.tomorrow ? ', tomorrow Tue 10 Nov' : ''}">${supplier.placed ? '✓ Order placed<span class="undo-word">Undo</span>' : supplier.tomorrow ? 'Order placed<span class="undo-word">For tomorrow</span>' : 'Order placed'}</button>${supplier.feedback ? `<p class="deadline-note">${escape(supplier.feedback)}</p>` : ''}</div>`;
  }

  function deadlinesMarkup(extraClass = '') {
    return `<section id="supplier-deadlines" class="deadline-area ${extraClass}" tabindex="-1" aria-labelledby="deadlines-heading"><div class="deadline-heading"><h2 id="deadlines-heading">Supplier deadlines</h2><span>${example === 'tomorrow' ? 'Today & tomorrow' : 'Mon 9 Nov'}</span></div>${suppliers.length ? suppliers.map(supplierMarkup).join('') : '<p class="deadline-empty">No supplier deadlines today. Your shared requests stay below.</p>'}${design === 'b' ? '<p class="deadline-caption">Confirm only after placing the order elsewhere.</p>' : ''}</section>`;
  }

  function deadlineLeadMarkup() {
    if (role !== 'chef') return '';
    if (design === 'a') return deadlinesMarkup();
    const summary = deadlineSummary();
    const text = `<span><span class="strip-main">${escape(summary.main)}</span><span class="strip-count${suppliers.some(supplier => supplier.overdue && !supplier.placed) ? ' strip-overdue' : ''}">${escape(summary.counts)}</span></span>`;
    if (design === 'b') return `<div class="cutoff-strip">${text}<button type="button" class="strip-view" data-action="view-deadlines">View</button></div>`;
    return `<details class="deadline-fold" ${foldOpen ? 'open' : ''}><summary aria-label="Supplier deadlines. ${escape(summary.main)}. ${escape(summary.counts)}">${text}</summary>${deadlinesMarkup()}</details>`;
  }

  function requestMarkup(item) {
    const metadata = item.pending ? `${item.author} ${item.time} · Not sent` : item.done ? `${item.author} ${item.time} · Ordered` : `${item.author} ${item.time}`;
    const recipeText = item.recipes?.length ? `<p class="recipe-line">Used in ${item.recipes.map(recipe => `<a href="#recipe-preview" data-action="recipe" data-id="${item.id}" data-name="${escape(recipe)}">${escape(recipe)}</a>`).join(', ')}</p>` : '';
    return `<li class="request-row${item.done ? ' is-ordered' : ''}${item.removed ? ' is-removed' : ''}" data-id="${item.id}">${role === 'chef' ? `<button type="button" class="item-tick" data-action="${item.removed ? 'restore-item' : 'item-tick'}" data-id="${item.id}" aria-pressed="${item.done}" aria-label="${item.removed ? 'Restore' : item.done ? 'Undo ordered' : 'Mark ordered:'} ${escape(item.name)}"><span class="tick-box">${item.done ? svg('tick') : item.removed ? '↶' : ''}</span></button>` : ''}<div class="item-text"><div class="item-line"><span class="item-name">${escape(item.name)}</span><span class="item-amount">${escape(item.amount)}</span>${item.urgency ? `<span class="urgency ${item.urgency === 'Low' ? 'low' : ''}">${item.urgency}</span>` : ''}</div>${recipeText}<div class="item-meta"><span>${item.removed ? 'Removed in this example · restore with the arrow' : escape(metadata)}</span>${item.old ? '<span class="age-badge">Since Sun 8 Nov</span>' : ''}</div></div><details class="item-menu"><summary aria-label="Options for ${escape(item.name)}">⋯</summary><div class="menu-options"><p>${escape(item.name)} · added by ${item.author}${item.old ? ' on Sun 8 Nov' : ''} at ${item.time}</p><button type="button" data-action="edit-item" data-id="${item.id}">Change amount</button>${role === 'chef' ? `<button type="button" data-action="${item.removed ? 'restore-item' : 'remove-item'}" data-id="${item.id}">${item.removed ? 'Undo remove' : item.removeArmed ? 'Tap again to remove' : 'Remove'}</button>` : ''}${item.done ? `<button type="button" data-action="item-tick" data-id="${item.id}">Undo ordered</button>` : ''}</div></details>${item.feedback ? `<p class="row-feedback">${escape(item.feedback)}</p>` : ''}</li>`;
  }

  function connectionMarkup() {
    if (example === 'offline') return '<p class="connection-note"><strong>Offline · showing the last known list</strong>Requests are kept here. Supplier confirmations need a connection.</p>';
    if (example === 'failed') return '<p class="connection-note failed"><strong>Could not check the latest list</strong>Last known requests and deadlines remain visible. Nothing is confirmed.</p>';
    return '';
  }

  function requestSectionMarkup() {
    const completed = items.filter(item => item.done && !item.removed);
    return `<section class="request-section" aria-labelledby="request-heading"><div class="book-topline"><h2 class="request-label" id="request-heading">Shared requests</h2><span class="section-label">${role === 'chef' ? 'Out first' : 'Added by the team'}</span></div><ul class="request-list">${items.map(requestMarkup).join('')}</ul>${completed.length ? `<details class="ordered-fold"><summary>✓ Ordered today · ${completed.length}</summary><p>Kept in place above so a tap never moves another request.</p><ul>${completed.map(item => `<li>${escape(item.name)} · ${escape(item.amount)}</li>`).join('')}</ul></details>` : ''}</section>`;
  }

  function helpMarkup() {
    return `<details class="help-wrap"><summary>${role === 'chef' ? 'Requests and supplier orders' : 'About this list'}</summary><p class="help-copy">${role === 'chef' ? 'Tick a request when that item is ordered. Use Order placed only after placing that supplier order by phone, email or its site. Neither action completes the other.' : 'Add what the kitchen needs. Low and Out help the chef spot urgency. The chef marks requests ordered.'}</p></details>${role === 'chef' ? `<div class="deadline-footer"><span>Supplier order reminders</span><button type="button" class="text-button" data-action="notifications" aria-expanded="${notificationOpen}">Notification settings</button></div>${notificationOpen ? '<p class="notification-note">Simulation only. Existing notification controls stay in the book. This preview does not request permission, subscribe or send notifications.</p>' : ''}` : ''}`;
  }

  function renderApp() {
    const focus = document.activeElement;
    const focusAction = focus?.dataset.action;
    const focusId = focus?.dataset.id;
    const scrollPosition = window.scrollY;
    const completed = items.filter(item => item.done && !item.removed).length;
    const total = items.filter(item => !item.removed).length;
    app.innerHTML = `<div class="app-shell design-${design} ${role}">${headerMarkup()}<main class="content"><div class="page-tools">${role === 'chef' ? '<input class="date-control" type="date" value="2026-11-09" aria-label="View order requests by date">' : '<span class="section-label">Monday · 9 November</span>'}${role === 'chef' ? '<button type="button" class="delivery-button" data-action="delivery">Delivery received</button>' : ''}</div>${notice ? `<p class="app-notice">${escape(notice)}</p>` : ''}<article class="book"><header class="book-head"><div><h1 class="book-title">Order list</h1><p class="book-date">9 November 2026</p></div><div class="head-actions"><p class="head-count">${completed} of ${total} ordered</p><div class="add-dock"><button type="button" class="primary-button" data-action="add"><span class="add-plus" aria-hidden="true">+</span>Add request</button></div></div></header>${connectionMarkup()}${deadlineLeadMarkup()}<div class="book-columns">${requestSectionMarkup()}${role === 'chef' && design === 'b' ? deadlinesMarkup('after-requests') : ''}</div>${helpMarkup()}</article></main><nav class="bottom-tabs" aria-label="Kitchen pages">${navMarkup(true)}</nav></div>`;
    const fold = app.querySelector('.deadline-fold');
    if (fold) fold.addEventListener('toggle', () => { foldOpen = fold.open; });
    if (focusAction) {
      const replacement = [...app.querySelectorAll('[data-action]')].find(element => element.dataset.action === focusAction && element.dataset.id === focusId);
      if (replacement) replacement.focus({ preventScroll: true });
    }
    window.scrollTo({ top: scrollPosition, behavior: 'instant' });
  }

  function syncReview() {
    document.body.classList.toggle('shot', shot);
    document.querySelectorAll('[data-design]').forEach(button => button.setAttribute('aria-pressed', button.dataset.design === design));
    document.getElementById('role-select').value = role;
    document.getElementById('state-select').value = example;
    document.getElementById('view-select').value = view;
    document.getElementById('design-description').textContent = `${design.toUpperCase()} · ${designs[design].description}`;
    const comparison = document.getElementById('comparison');
    comparison.hidden = view !== 'compare' || shot;
    app.hidden = view === 'compare' && !shot;
    if (!comparison.hidden) comparison.innerHTML = Object.entries(designs).map(([key, value]) => `<section class="compare-card"><h2>${key.toUpperCase()} · ${value.name}</h2><p>Fictional examples. Nothing saves.</p><iframe title="Design ${key.toUpperCase()}: ${value.name}" src="${escape(location.pathname)}?shot=1&design=${key}&role=${role}&state=${example}"></iframe></section>`).join('');
    else comparison.innerHTML = '';
  }

  function reset() {
    makeFixture();
    renderApp();
    syncReview();
  }

  function openAdd(item) {
    editingId = item?.id || '';
    document.getElementById('add-heading').textContent = item ? `Change ${item.name}` : 'Add request';
    form.reset();
    form.elements.namedItem('item').value = item?.name || '';
    form.elements.amount.value = item?.amount || '';
    form.elements.urgency.value = item?.urgency || '';
    form.querySelector('.urgency-picker').hidden = Boolean(item);
    form.elements.namedItem('item').readOnly = Boolean(item);
    form.querySelector('[type="submit"]').textContent = item ? 'Change amount' : 'Add request';
    document.getElementById('form-message').textContent = '';
    dialog.showModal();
    (item ? form.elements.amount : form.elements.namedItem('item')).focus();
    if (item) form.elements.amount.select();
  }

  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    const item = items.find(record => record.id === target.dataset.id);
    const supplier = suppliers.find(record => record.id === target.dataset.id);
    if (target.tagName === 'A') event.preventDefault();
    if (action === 'close-dialog') { dialog.close(); return; }
    if (action === 'add') { openAdd(); return; }
    if (action === 'edit-item' && item) { openAdd(item); return; }
    if (action === 'view-deadlines') {
      const block = document.getElementById('supplier-deadlines');
      block.scrollIntoView({ behavior: 'instant', block: 'start' });
      block.focus({ preventScroll: true });
      return;
    }
    if (action === 'item-tick' && item && role === 'chef') {
      item.done = !item.done;
      item.pending = example === 'offline' || example === 'failed';
      if (item.pending) { item.done = false; item.feedback = 'Not sent. This example keeps the request here until a connection returns.'; }
      announce(item.pending ? `${item.name}: not sent.` : `${item.name} ${item.done ? 'marked ordered' : 'restored to requests'} in this example. Supplier orders unchanged.`);
    } else if (action === 'supplier-place' && supplier && role === 'chef' && example !== 'offline' && example !== 'failed') {
      supplier.placed = !supplier.placed;
      supplier.feedback = '';
      announce(`${supplier.name}: ${supplier.placed ? 'order placed' : 'order placed undone'}${supplier.tomorrow ? ' for tomorrow' : ''} in this example. Requests unchanged.`);
    } else if (action === 'supplier-link' && supplier) {
      supplier.feedback = `Simulation only. This opens ${supplier.name}'s separate order sheet in the book. Requests are not copied or assigned here.`;
      announce(supplier.feedback);
    } else if (action === 'recipe' && item) {
      item.feedback = `Simulation only. Used in ${target.dataset.name} opens the existing recipe in the book.`;
      announce(item.feedback);
    } else if (action === 'urgency' && item) {
      item.urgency = item.urgency === target.dataset.value ? '' : target.dataset.value;
      announce(`${item.name}: ${item.urgency || 'stock mark cleared'} in this example. Its position stays put.`);
    } else if (action === 'remove-item' && item && role === 'chef') {
      if (!item.removeArmed) {
        item.removeArmed = true;
        target.textContent = 'Tap again to remove';
        announce(`Tap again to remove ${item.name}.`);
        return;
      }
      item.removed = true;
      item.removeArmed = false;
      announce(`${item.name} removed in this example. Undo remains on its row.`);
    } else if (action === 'restore-item' && item && role === 'chef') {
      item.removed = false;
      announce(`${item.name} restored in this example.`);
    } else if (action === 'notifications') {
      notificationOpen = !notificationOpen;
      announce('Simulation only. No notification permission is requested.');
    } else if (action === 'delivery') {
      notice = 'Simulation only. Delivery received opens the existing delivery record page. It does not mark requests or supplier orders.';
      announce(notice);
    } else if (action === 'navigation') {
      notice = `Simulation only. ${target.dataset.name} stays in the existing Kitchen Book navigation.`;
      announce(notice);
    } else return;
    renderApp();
  });

  app.addEventListener('change', event => {
    if (!event.target.matches('.date-control')) return;
    notice = 'Simulation only. Chefs retain previous-day access. These examples always show the eight fictional requests from 9 November.';
    announce(notice);
    renderApp();
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const name = form.elements.namedItem('item').value.trim();
    const amount = form.elements.amount.value.trim();
    if (!name) return;
    const urgency = form.elements.urgency.value;
    const item = items.find(record => record.id === editingId);
    const pending = example === 'offline' || example === 'failed';
    if (item) { item.amount = amount; item.pending = pending; }
    else items.push({ id: `synthetic-${++sequence}`, name, amount, urgency, author: 'You', time: '14:00', done: false, pending });
    renderApp();
    const message = document.getElementById('form-message');
    message.classList.toggle('unsent', pending);
    message.textContent = pending ? `${name} · Not sent. Kept only in this example.` : `${name} ${item ? 'changed' : 'added'} in this example. Nothing saves.`;
    if (!item) { form.elements.namedItem('item').value = ''; form.elements.amount.value = ''; form.elements.urgency.value = ''; form.elements.namedItem('item').focus(); }
  });

  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    const target = editingId ? [...app.querySelectorAll('[data-action="edit-item"]')].find(element => element.dataset.id === editingId) : app.querySelector('[data-action="add"]');
    const fallback = editingId ? [...app.querySelectorAll('.item-menu summary')].find(element => element.closest('.request-row')?.dataset.id === editingId) : null;
    (target?.checkVisibility() ? target : fallback || app.querySelector('[data-action="add"]'))?.focus({ preventScroll: true });
  });
  document.querySelectorAll('[data-design]').forEach(button => button.addEventListener('click', () => { design = button.dataset.design; reset(); }));
  document.getElementById('role-select').addEventListener('change', event => { role = event.target.value; reset(); });
  document.getElementById('state-select').addEventListener('change', event => { example = event.target.value; reset(); });
  document.getElementById('view-select').addEventListener('change', event => { view = event.target.value; syncReview(); });
  document.getElementById('reset-preview').addEventListener('click', () => { reset(); announce('Example reset. Nothing was saved.'); });
  window.ORDER_PREVIEW = {
    reset,
    getState: () => ({ design, role, example, items: structuredClone(items), suppliers: structuredClone(suppliers) })
  };
  reset();
})();
