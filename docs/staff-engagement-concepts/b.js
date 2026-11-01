(() => {
  'use strict';
  const {esc, icon} = window.Study;
  const app = document.querySelector('#sb-app');
  const live = document.querySelector('#sb-live');
  const sections = ['Larder', 'Grill', 'Dessert'];
  const people = {cook:{name:'Example cook',section:'Larder'}, chef:{name:'Example chef',section:'Grill'}};
  const freshPerson = () => ({check:null,followup:false,usefulDetail:false,setup:false});
  const defaultDraft = section => ({item:'Carrot trimmings',amount:'0.5',unit:'kg',reason:'prep',section:section || 'Larder'});
  const fresh = () => ({page:'prep',person:'cook',device:'personal',large:false,hidden:false,pocketDismissed:false,dialog:'',followupDone:false,phase:'idle',error:'',failNext:false,notice:'',records:[],board:{Larder:false,Grill:true,Dessert:false},personal:{cook:freshPerson(),chef:freshPerson()},draft:defaultDraft('Larder'),lastRecord:null});
  let state = fresh();
  let returnFocus = null;
  let saveVersion = 0;
  const own = () => state.personal[state.person];
  const person = () => people[state.person];
  const pending = () => state.phase === 'pending';
  function setPerson(next) {
    next = people[next] ? next : null;
    if (next === state.person) return false;
    saveVersion++;
    state.person = next;
    state.page = 'prep';
    state.phase = 'idle';
    state.error = ''; state.notice = ''; state.failNext = false;
    state.records = []; state.lastRecord = null;
    state.personal = {cook:freshPerson(),chef:freshPerson()};
    state.pocketDismissed = false;
    state.draft = defaultDraft(next ? people[next].section : 'Larder');
    return true;
  }
  const reasonName = value => ({prep:'Preparation trimmings',spoiled:'Spoilage',excess:'Over-prepped',other:'Other'}[value] || '');
  const button = (action, label, cls = 'btn', extra = '') => `<button type="button" class="${cls}" data-action="${action}"${pending() ? ' disabled' : ''} ${extra}>${label}</button>`;
  function announce(message) { live.textContent = message; }
  function nav(className) {
    return `<nav class="${className}" aria-label="Kitchen navigation">${[['Recipes','book'],['Prep','prep'],['Orders','prep'],['Wastage','waste'],['Transfers','arrow']].map(([label,type]) => button(`nav:${label}`, `${icon(type,21)}<span>${label}</span>`, '', `aria-current="${(state.page === 'prep' && label === 'Prep') || (state.page === 'waste' && label === 'Wastage') ? 'page' : 'false'}"`)).join('')}</nav>`;
  }
  function shell() {
    return `<div class="preview-note">Design B · Section Board · Illustrative content. Saves stay in this preview.</div><header class="book-header"><a href="#" class="book-brand" data-action="nav:Prep"><img src="../../icon.svg" alt=""><span><small>Leichhardt Hotel</small><strong>Kitchen Book</strong></span></a>${nav('sb-desktop-nav')}<button type="button" data-action="person" aria-label="Change example person"${pending() ? ' disabled' : ''}>${icon('user',22)}</button></header>`;
  }
  function identity() {
    return `<div class="sb-person"><div class="sb-person-name">${icon('user',23)}<div><strong>${esc(person().name)}</strong><span>${esc(person().section)} section</span></div></div>${button('person','Change person','quiet','id="sb-person-trigger"')}</div>`;
  }
  function board() {
    if (state.hidden) return `<aside class="sb-hidden"><p>Encouragement hidden. Your work controls stay available.</p>${button('show','Show encouragement','quiet')}</aside>`;
    const count = Math.min(3, sections.filter(section => state.board[section]).length);
    return `<aside><section class="sb-board" aria-labelledby="sb-board-title"><div class="sb-board-label">${icon('team',18)}<span class="eyebrow">The section board</span></div><div class="sb-board-title"><div><h2 id="sb-board-title">Checks shared</h2><p>Illustrative planned sections</p></div><div class="sb-board-count" aria-label="${count} of 3 sections have a shared check">${count}<span> / 3</span></div></div><ul class="sb-section-list">${sections.map(section => `<li class="sb-section-row${section === person().section ? ' is-own' : ''}"><span class="sb-section-mark${state.board[section] ? ' shared' : ''}" aria-hidden="true">${state.board[section] ? icon('check',16) : ''}</span><div><h3>${section}</h3><p>${state.board[section] ? 'A personal check shared' : 'No check shared yet'}</p></div>${section === person().section ? button('check',own().check ? 'My check' : 'Share mine','quiet') : ''}</li>`).join('')}</ul><p class="sb-board-note">Each mark is a personal check. It does not mean all waste in a section has been captured.</p><div class="sb-board-links">${button('contribution','My contribution','quiet')}${button('hide','Hide encouragement','quiet')}</div></section>${!state.pocketDismissed && !own().setup ? `<section class="sb-pocket"><p class="eyebrow">Optional · Pocket book</p><h3>A place on your home screen.</h3><p>Keep the book handy and use your own name on either device.</p><div class="row">${button('setup',`${icon('phone',18)} Set up Pocket book`)}${button('pocket-later','Not now','quiet')}</div></section>` : ''}</aside>`;
  }
  function prep() {
    return `<div class="sb-page-head"><div><p class="eyebrow">Today · ${esc(person().section)}</p><h1 tabindex="-1" data-heading>Prep list</h1></div><p class="hand">A small check.<br>A little shared care.</p></div><div class="sb-columns"><section class="sb-work" aria-labelledby="sb-prep-title"><header class="sb-work-head"><h2 id="sb-prep-title">On the bench</h2><span>${state.followupDone ? 'Follow-up done' : '1 example job'}</span></header><div class="sb-work-actions">${button('log',`${icon('waste',19)} Log waste`,'btn primary')}${button('check','My section check')}</div><ul class="sb-prep-list"><li class="sb-prep-item${state.followupDone ? ' is-done' : ''}"><button type="button" class="sb-tick" data-action="followup" aria-label="${state.followupDone ? 'Example follow-up done' : 'Mark example prep follow-up done'}" aria-pressed="${state.followupDone}"${state.followupDone ? ' disabled' : ''}>${state.followupDone ? icon('check',24) : ''}</button><div><div class="eyebrow">Example chef follow-up</div><h3>Example prep follow-up</h3><p class="hint">Check the labelled prep item with Example chef.</p></div></li></ul>${state.notice ? `<p class="sb-ack" role="status">${esc(state.notice)}</p>` : ''}<div class="sb-work-foot"><p class="hint">Your current prep work stays here.</p></div></section>${board()}</div>`;
  }
  function wasteForm() {
    const f = state.draft;
    return `<form id="sb-waste-form" class="sb-form"><fieldset class="sb-form"${pending() ? ' disabled' : ''} style="border:0;padding:0;margin:0;min-width:0"><legend class="sr-only">Example waste details</legend><div class="field"><label for="sb-item">Item</label><input id="sb-item" name="item" value="${esc(f.item)}" maxlength="80" required autocomplete="off"></div><div class="sb-form-pair"><div class="field"><label for="sb-amount">Amount</label><input id="sb-amount" name="amount" type="number" inputmode="decimal" step="any" min="0" value="${esc(f.amount)}" required></div><div class="field"><label for="sb-unit">Unit</label><select id="sb-unit" name="unit" required>${['kg','g','L'].map(unit => `<option${f.unit === unit ? ' selected' : ''}>${unit}</option>`).join('')}</select></div></div><div class="field"><label for="sb-reason">Reason</label><select id="sb-reason" name="reason" required>${Object.entries({prep:'Preparation trimmings',spoiled:'Spoilage',excess:'Over-prepped',other:'Other'}).map(([value,label]) => `<option value="${value}"${f.reason === value ? ' selected' : ''}>${label}</option>`).join('')}</select></div><div class="field"><label for="sb-section">Section <small>if known</small></label><select id="sb-section" name="section"><option value="">Not set</option>${sections.map(section => `<option${f.section === section ? ' selected' : ''}>${section}</option>`).join('')}</select></div></fieldset>${state.error ? `<div class="error" role="alert"><b>Not saved.</b> ${esc(state.error)}</div>` : ''}${pending() ? '<p class="sb-pending" role="status">Saving example entry. Your check stays open.</p>' : ''}<div class="sb-form-actions"><span class="hint">Useful details, rather than more entries.</span><button type="submit" class="btn primary"${pending() ? ' disabled' : ''}>${icon('check',19)} ${pending() ? 'Saving example...' : state.phase === 'failed' ? 'Retry save' : 'Save waste entry'}</button></div></form>`;
  }
  function receipt() {
    const r = state.lastRecord;
    return `<section class="sb-receipt"><div class="sb-receipt-mark">${icon('check',25)}</div><p class="eyebrow">Example save acknowledged</p><h2 tabindex="-1" data-heading>Waste entry saved</h2><p>${r.firstDetail ? 'Useful detail noted. Thank you for giving the next review something clear to work with.' : 'Entry recorded. Useful detail is recognised once in this example, rather than once per entry.'}</p><dl class="sb-record"><div><dt>Saved as</dt><dd>${esc(people[r.person].name)}</dd></div><div><dt>Item</dt><dd>${esc(r.item)}</dd></div><div><dt>Amount</dt><dd>${esc(r.amount)} ${esc(r.unit)}</dd></div><div><dt>Reason</dt><dd>${esc(reasonName(r.reason))}</dd></div><div><dt>Section</dt><dd>${esc(r.section || 'Not set')}</dd></div></dl><div class="sb-open-check"><p><b>Your ${esc(person().section)} check ${own().check ? 'is already shared' : 'is still open'}.</b><br>A waste entry does not finish your personal section check.</p>${!own().check ? button('check','Finish my section check','btn primary') : ''}</div><div class="row">${button('nav:Prep','Back to Prep','btn dark')}${button('another','Log another entry','quiet')}</div></section>`;
  }
  function waste() {
    return `<div class="sb-back">${button('nav:Prep',`${icon('arrow',17)} Back to Prep`,'quiet')}</div><div class="sb-page-head"><div><p class="eyebrow">Today · example entry</p><h1 tabindex="-1" data-heading>Wastage</h1></div></div><div class="sb-columns"><section class="sb-waste-work">${state.phase === 'saved' ? receipt() : wasteForm()}</section>${board()}</div>`;
  }
  function demoControls() {
    return `<details class="sb-preview"><summary>Preview controls · examples only</summary><div class="study-controls" aria-label="Example simulation controls"><label>Device <select data-demo="device"><option value="personal"${state.device === 'personal' ? ' selected' : ''}>My phone</option><option value="shared"${state.device === 'shared' ? ' selected' : ''}>Shared screen</option></select></label><label>Example session <select data-demo="identity"><option value="cook"${state.person === 'cook' ? ' selected' : ''}>Example cook</option><option value="chef"${state.person === 'chef' ? ' selected' : ''}>Example chef</option><option value=""${!state.person ? ' selected' : ''}>No name selected</option></select></label><label>Reading size <select data-demo="size"><option value="normal"${!state.large ? ' selected' : ''}>Standard</option><option value="large"${state.large ? ' selected' : ''}>Larger</option></select></label>${button('fail-next',state.failNext ? 'Next waste save will fail' : 'Fail next waste save','pill',`aria-pressed="${state.failNext}"`)}${button('reset','Reset preview','quiet')}</div><p class="hint">Device, identity and failures are simulated here. Named sessions receive the same recognition on My phone and Shared screen. No PIN is collected and nothing is sent.</p></details>`;
  }
  function render(focus = false) {
    const previousAction = document.activeElement?.dataset.action;
    const previousDemo = document.activeElement?.dataset.demo;
    const demoOpen = !!document.querySelector('.sb-preview')?.open;
    document.documentElement.classList.toggle('sb-book-large', state.large);
    document.body.classList.toggle('sb-waste-view', state.person && state.page === 'waste' && state.phase !== 'saved');
    app.innerHTML = `${shell()}<main id="sb-main" class="sb-main">${state.person ? `${identity()}${state.page === 'waste' ? waste() : prep()}` : `<section class="sb-gate"><p class="eyebrow">Simulated session</p><h1 tabindex="-1" data-heading>Choose your example name.</h1><p>The work opens after a name is selected. This draft collects no PIN.</p>${button('person','Choose name','btn primary')}</section>`}<footer class="sb-footer"><span>Leichhardt Hotel · Kitchen Book</span><span>Good detail. Shared care.</span></footer></main>${demoControls()}${nav('book-nav')}`;
    app.querySelector('.sb-preview').open = demoOpen;
    if (focus) {
      app.querySelector('[data-heading]')?.focus({preventScroll:true});
      window.scrollTo(0,0);
    } else if (previousDemo) {
      [...app.querySelectorAll('[data-demo]')].find(el => el.dataset.demo === previousDemo)?.focus({preventScroll:true});
    } else if (previousAction) {
      const target = [...app.querySelectorAll('[data-action]')].find(el => el.dataset.action === previousAction && el.getClientRects().length && !el.disabled);
      (target || app.querySelector('[data-heading]'))?.focus({preventScroll:true});
    }
  }
  function rememberForm() {
    const form = document.querySelector('#sb-waste-form');
    if (form && !pending()) state.draft = Object.fromEntries(new FormData(form));
  }
  function closeDialog(restore = true) {
    state.dialog = '';
    document.querySelector('#sb-overlay')?.remove();
    document.documentElement.classList.remove('sb-modal-open');
    app.inert = false;
    if (restore) (document.contains(returnFocus) ? returnFocus : app.querySelector('#sb-person-trigger') || app.querySelector('[data-heading]'))?.focus({preventScroll:true});
  }
  function openDialog(kind, from) {
    rememberForm();
    closeDialog(false);
    state.dialog = kind;
    returnFocus = from || document.activeElement;
    let title = '', content = '';
    if (kind === 'person') {
      title = 'Use your own name';
      content = `<p>Choose a simulated name for this draft. No PIN is collected.</p>${Object.entries(people).map(([id,p]) => button(`choose-person:${id}`,`<span><strong>${p.name}</strong><small>${p.section} section</small></span>${state.person === id ? icon('check',20) : icon('chevron',18)}`,'sb-dialog-choice')).join('')}<p class="hint" style="margin-top:18px">A named session on either device receives the same recognition. It does not prove who is holding the screen.</p>`;
    } else if (kind === 'check') {
      title = `My ${person().section} check`;
      content = own().check ? `<p><b>Your personal check is shared.</b></p><p class="hint">This is your declaration only. It is not a zero-waste record, a whole-kitchen completion or a chef’s daily review.</p><div class="sb-dialog-actions">${button('close','Back to the work','btn dark')}</div>` : `<p>Share that you have checked your part of ${esc(person().section)}.</p><p class="hint">A personal declaration only. It does not confirm all waste was captured, and is not a zero-waste record or a chef’s daily review.</p><div class="sb-dialog-actions">${own().usefulDetail ? button('share-check:after-entry',`${icon('check',19)} Share my check`,'btn primary') : button('check-log',`${icon('waste',19)} Log something to add`,'btn primary')}${button('share-check:nothing','Checked; nothing to add')}${own().usefulDetail ? button('check-log','Log something else','quiet') : ''}${button('close','Not yet','quiet')}</div>`;
    } else if (kind === 'contribution') {
      title = 'My contribution';
      const contributions = [['Your name',person().name,true],['My section check',own().check ? 'Personal check shared' : 'Not shared yet',!!own().check],['Follow-up done',own().followup ? 'Example prep follow-up recorded' : 'No follow-up recorded for this session',own().followup]];
      content = `<p>For <b>${person().name}</b> only. Your own-name session counts equally on either device.</p><ul class="sb-private-list">${contributions.map(([label,description,done]) => `<li><span class="sb-section-mark${done ? ' shared' : ''}" aria-hidden="true">${done ? icon('check',16) : ''}</span><div><strong>${label}</strong><small>${description}</small></div></li>`).join('')}</ul>${own().usefulDetail ? '<p class="sb-ack">Useful waste details noted once in this example.</p>' : ''}<p class="hint">No ranks or raw-log points. A saved name is an app session, not proof of attendance or phone ownership.</p><div class="sb-dialog-actions">${button('close','Back to the work','btn dark')}</div>`;
    } else if (kind === 'setup') {
      title = 'Your Pocket book';
      content = `<span class="sb-example-only">Example only</span><p style="margin-top:18px">An optional shortcut to the existing Kitchen Book.</p><ol class="sb-setup-list"><li>Open the Kitchen Book in your phone’s browser.</li><li>From the browser menu, choose Add to Home Screen.</li><li>Use your own name when you open the book.</li></ol><p class="hint">This draft does not install the app. A setup mark does not prove phone ownership. Shared-screen use receives the same recognition.</p><div class="sb-dialog-actions">${button('setup-done','Mark setup in this example','btn primary')}${button('pocket-later','Not now','quiet')}</div>`;
    } else {
      title = `${state.dialog} preview only`;
      content = `<p>This comparison focuses on Prep and Wastage. The ${esc(state.dialog)} destination is a preview-only navigation example.</p><div class="sb-dialog-actions">${button('close','Back to the work','btn dark')}</div>`;
    }
    const overlay = document.createElement('div');
    overlay.id = 'sb-overlay'; overlay.className = 'sb-overlay';
    overlay.innerHTML = `<button class="sb-backdrop" tabindex="-1" data-action="close" aria-label="Close dialog"></button><section class="sb-dialog" role="dialog" aria-modal="true" aria-labelledby="sb-dialog-title"><button type="button" class="sb-dialog-close" data-action="close" aria-label="Close">${icon('close',22)}</button><h2 id="sb-dialog-title" tabindex="-1">${esc(title)}</h2>${content}</section>`;
    document.body.appendChild(overlay);
    app.inert = true;
    document.documentElement.classList.add('sb-modal-open');
    overlay.querySelector('h2').focus({preventScroll:true});
  }
  function navigate(page) {
    if (!state.person) { openDialog('person'); return; }
    rememberForm(); closeDialog(false);
    if (page === 'Prep') state.page = 'prep';
    else if (page === 'Wastage') { state.page = 'waste'; if (state.phase === 'saved') state.phase = 'idle'; }
    else { openDialog(page); return; }
    render(true);
  }
  function saveWaste() {
    if (pending() || !state.person) return;
    rememberForm();
    const f = state.draft, amount = Number(f.amount);
    if (!String(f.item).trim() || !Number.isFinite(amount) || amount <= 0 || !['kg','g','L'].includes(f.unit) || !reasonName(f.reason)) {
      state.error = 'Enter an item, a positive amount, a unit and a reason.'; state.phase = 'failed'; render(); return;
    }
    const actor = state.person, shouldFail = state.failNext, version = ++saveVersion;
    state.phase = 'pending'; state.failNext = false; state.error = ''; render(); announce('Saving example waste entry.');
    window.setTimeout(() => {
      if (version !== saveVersion) return;
      if (shouldFail) {
        state.phase = 'failed'; state.error = 'This example save failed. Your details are kept. Retry when you are ready.'; render(); announce('Example entry not saved. Details kept for retry.'); return;
      }
      const firstDetail = !state.personal[actor].usefulDetail;
      state.personal[actor].usefulDetail = true;
      const record = {...f,item:f.item.trim(),amount:String(amount),person:actor,firstDetail};
      state.records.push(record); state.lastRecord = record; state.phase = 'saved'; render(true); announce('Example waste entry saved. Your personal check has not changed.');
    }, 700);
  }
  document.addEventListener('click', event => {
    const el = event.target.closest('[data-action]');
    if (!el || el.disabled) return;
    event.preventDefault();
    const [action,value] = el.dataset.action.split(':');
    if (!pending()) rememberForm();
    if (action === 'close') { closeDialog(); return; }
    if (action === 'reset') { saveVersion++; closeDialog(false); state = fresh(); render(true); announce('Example reset.'); return; }
    if (pending()) return;
    if (action === 'nav') { navigate(value); return; }
    if (action === 'person') { openDialog('person',el); return; }
    if (action === 'choose-person') {
      closeDialog(false); setPerson(value); render(true); announce(`${person().name} selected in this example.`); return;
    }
    if (!state.person && !['fail-next','show'].includes(action)) { openDialog('person',el); return; }
    if (action === 'log' || action === 'check-log' || action === 'another') {
      rememberForm(); closeDialog(false); state.page = 'waste'; state.phase = 'idle'; state.error = ''; render(true); return;
    }
    if (['check','contribution','setup'].includes(action)) { openDialog(action,el); return; }
    if (action === 'share-check') {
      const wasShared = !!own().check;
      own().check = own().check || value;
      state.board[person().section] = true;
      state.notice = 'Your personal section check is shared. Thank you.';
      closeDialog(false); render();
      if (!wasShared) announce('Your personal check is shared in this example.');
      app.querySelector('#sb-person-trigger')?.focus({preventScroll:true}); return;
    }
    if (action === 'followup' && !state.followupDone) {
      state.followupDone = true; own().followup = true; state.notice = 'Follow-up recorded. Thank you for closing the loop.'; render(); announce(state.notice); return;
    }
    if (action === 'hide' || action === 'show') { state.hidden = action === 'hide'; render(); announce(state.hidden ? 'Encouragement hidden. Work controls stay available.' : 'Encouragement shown.'); return; }
    if (action === 'pocket-later') { state.pocketDismissed = true; closeDialog(false); render(); announce('Pocket book setup set aside.'); return; }
    if (action === 'setup-done') { own().setup = true; closeDialog(false); render(); announce('Example only. Pocket book setup marked on this screen.'); return; }
    if (action === 'fail-next') { state.failNext = !state.failNext; render(); }
  });
  document.addEventListener('change', event => {
    const control = event.target;
    if (!control.matches('[data-demo]')) return;
    rememberForm();
    if (control.dataset.demo === 'device') state.device = control.value;
    if (control.dataset.demo === 'size') state.large = control.value === 'large';
    if (control.dataset.demo === 'identity') { closeDialog(false); setPerson(control.value); announce('Example session changed. Previous private work has been cleared.'); }
    render();
  });
  document.addEventListener('submit', event => {
    if (event.target.id !== 'sb-waste-form') return;
    event.preventDefault(); saveWaste();
  });
  document.addEventListener('keydown', event => {
    const dialog = document.querySelector('#sb-overlay [role="dialog"]');
    if (!dialog) return;
    if (event.key === 'Escape') { event.preventDefault(); closeDialog(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')].filter(el => el.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) { event.preventDefault(); first?.focus(); }
  });
  render();
})();
