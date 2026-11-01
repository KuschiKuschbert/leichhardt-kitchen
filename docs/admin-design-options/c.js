(() => {
  'use strict';
  const root = document.querySelector('#kitchen-book');
  const D = window.Design;
  const icon = (name, size = 20) => D.icon(name, size);
  const esc = D.esc;
  const chapters = [
    ['items', '01', 'Item links', 'Match recorded names to the book.'],
    ['training', '02', 'Training', 'Record a clear assessment.'],
    ['reports', '03', 'Reports', 'Read the kitchen’s recorded activity.'],
    ['saved', '04', 'Saved records', 'Find confirmed links, assessments and guides.'],
    ['operations', '05', 'Operations', 'The tools for running the kitchen.'],
    ['settings', '06', 'Settings', 'Keep the book working your way.']
  ];
  const state = {
    page: 'home', mode: 'choose', error: '', linkSaved: null, assessmentSaved: null,
    linkDraft: null, trainingDraft: null, savedTab: 'links', savedDetail: '',
    report: 'prep', period: 30, daily: false, operation: '', operationTab: '',
    settings: {size: 'standard', reminders: true}, settingsMessage: false
  };
  const descriptions = {
    items: ['Match a recorded name to a recipe, one review at a time.', 'Keep the source intact', 'Confirm the recipe identity. Keep the original prep and waste records intact.'],
    training: ['Assess the person. Set the scope. Record your decision.', 'Activity is context', 'Activity never determines competence. Confirm every assessment explicitly.'],
    reports: ['Step back from today’s service. Read what has been recorded across completed kitchen days.', 'Read the measure', 'Prep is not consumption. Waste entries are not a waste rate. Quantities remain separate by source and unit.'],
    saved: ['The decisions worth keeping, all in one place. Open a record to see what was confirmed.', 'A reliable reference', 'Confirmed links and assessments live here independently of the activity reports.'],
    operations: ['Open the working tools for the day, from the recipe book to the people on the section.', 'At hand when needed', 'Keep review work separate from daily kitchen operations. Return to the contents to change chapters.'],
    settings: ['A few useful choices for the way you read and use the kitchen book.', 'Make it comfortable', 'Choose a reading size, then save your preference.']
  };
  function act(action, text, classes = 'btn', extra = '') {
    return `<button type="button" class="${classes}" data-action="${action}" ${extra}>${text}</button>`;
  }
  function back(action, text) { return act(action, `${icon('arrow-left', 17)} ${text}`, 'kb-text-link'); }
  function folio(left, number) { return `<div class="kb-folio"><span>${left}</span><span>${number}</span></div>`; }
  function steps(current) {
    return `<ol class="kb-steps" aria-label="Review progress">${['Choose', 'Review', 'Record'].map((label, i) => `<li${current === i ? ' aria-current="step"' : ''}><span class="kb-step-num">0${i + 1}</span>${label}</li>`).join('')}</ol>`;
  }
  function header(title, description, eyebrow = '') {
    return `<header class="kb-work-head">${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h2 tabindex="-1" data-focus>${title}</h2>${description ? `<p>${description}</p>` : ''}</header>`;
  }
  function preserveDraft() {
    const form = root.querySelector('form[data-form]');
    if (!form) return;
    const values = Object.fromEntries(new FormData(form));
    if (form.dataset.form === 'link') state.linkDraft = values;
    if (form.dataset.form === 'training') state.trainingDraft = values;
  }
  function unfinished() {
    if (state.linkDraft && !state.linkSaved) return ['items', 'House slaw link'];
    if (state.trainingDraft && !state.assessmentSaved) return ['training', 'Grill section assessment'];
    return null;
  }
  function resumeStrip() {
    const draft = unfinished();
    if (!draft || (state.page === draft[0] && state.mode === 'review')) return '';
    return `<aside class="kb-resume"><p><b>Unfinished review</b><br>${draft[1]}</p>${act(`resume:${draft[0]}`, 'Resume →', 'kb-text-link')}</aside>`;
  }
  function margin() {
    if (state.page === 'home') return `<aside class="kb-leaf kb-margin"><div class="kb-running"><span>Leichhardt Hotel</span><span class="kb-volume">Volume 01</span></div><h1 class="kb-cover-title" tabindex="-1" data-focus>The kitchen,<br>in good <span>order.</span></h1><p class="kb-intro">A working book for the details behind a well-run kitchen.</p><p class="kb-edition">Administration · 1 November 2026</p><div class="kb-cover-note"><p class="hand">A little order<br>before service.</p><span class="kb-small-label">On the next page</span><p>One name is ready to be matched to its recipe.</p>${act('chapter:items', `Open Item links ${icon('arrow-right', 17)}`, 'kb-text-link')}</div>${folio('Kitchen administration', '01')}</aside>`;
    const ch = chapters.find(row => row[0] === state.page);
    const desc = descriptions[state.page];
    return `<aside class="kb-leaf kb-margin"><div class="kb-running"><span>Kitchen administration</span><span class="kb-volume">Chapter ${ch[1]}</span></div>${back('contents', 'Contents')}<h1 class="kb-chapter-heading"><span class="kb-chapter-big">Chapter ${ch[1]}</span>${ch[2]}</h1><p class="kb-chapter-description">${desc[0]}</p><div class="kb-margin-note"><h3>${desc[1]}</h3><p>${desc[2]}</p></div>${folio('Leichhardt Kitchen Book', ch[1])}</aside>`;
  }
  function home() {
    return `<div class="kb-running"><span class="kb-volume">Kitchen administration</span><span>Contents</span></div><h1 class="kb-mobile-heading" tabindex="-1" data-focus>The kitchen,<br>in good order.</h1>${resumeStrip()}<h2 class="kb-contents-title">The admin book</h2><p class="kb-page-intro">Choose a chapter. Give one thing your full attention.</p><ol class="kb-index">${chapters.map(ch => `<li>${act(`chapter:${ch[0]}`, `<span class="kb-chapter-number">${ch[1]}</span><span><span class="kb-chapter-name">${ch[2]}</span><span class="kb-chapter-desc">${ch[3]}</span></span>${icon('arrow-right')}`, 'kb-chapter')}</li>`).join('')}</ol>${folio('Choose a chapter', '02')}`;
  }
  function itemChoose() {
    return `${steps(0)}${header('Names to put in order', 'Review a recorded name and choose its recipe.')}<div class="kb-task-row"><div><div class="kb-small-label">${state.linkSaved ? 'Recorded' : 'Ready for review'}</div><h3>House slaw</h3><p>${state.linkSaved ? `Linked to ${esc(state.linkSaved.recipe)}.` : 'Recorded in prep and wastage.'}</p><p>90 completed days · recorded name</p></div>${act(state.linkSaved ? 'show:link' : 'start:link', state.linkSaved ? 'View link' : state.linkDraft ? 'Resume review' : 'Review link', state.linkSaved ? 'btn' : 'btn orange')}</div><div class="kb-section"><h3>A deliberate match</h3><p class="muted">The recorded name stays as it is. You choose the recipe it belongs to.</p></div>`;
  }
  function linkReview() {
    const f = state.linkDraft || {alias:'House slaw', recipe:''};
    return `<div class="kb-back">${back('back-list', 'Back to Item links')}</div>${steps(1)}${header('House slaw', 'Check the name, then choose its recipe.', 'Recipe link review')}<dl class="kb-source"><div><dt>Recorded name</dt><dd>House slaw</dd></div><div><dt>Source</dt><dd>Prep &amp; wastage</dd></div></dl><form class="kb-form" data-form="link"><label class="field"><span>Reference name</span><input name="alias" value="${esc(f.alias)}" autocomplete="off" maxlength="80" required></label><fieldset><legend>Link to a recipe</legend><label class="kb-choice"><input type="radio" name="recipe" value="Coleslaw"${f.recipe === 'Coleslaw' ? ' checked' : ''}><span>Coleslaw<small>Recipe in the Kitchen Book</small></span></label><p class="kb-help">Choose the recipe explicitly. A similar name alone does not make a link.</p></fieldset>${state.error ? `<p class="kb-error" role="alert">${state.error}</p>` : ''}<div class="kb-actions"><button type="submit" class="btn orange">Record link ${icon('check', 18)}</button>${act('cancel-draft', 'Discard review', 'kb-text-link')}</div></form>`;
  }
  function linkRecord(fromSaved = false) {
    const link = state.linkSaved;
    return `${fromSaved ? `<div class="kb-back">${back('saved-back', 'Confirmed links')}</div>` : steps(2)}<section class="kb-outcome"><div class="kb-outcome-mark">${icon('check', 27)}</div><h2 tabindex="-1" data-focus>${fromSaved ? 'Confirmed link' : 'Link recorded'}</h2><p>In this preview, <b>${esc(link.alias)}</b> points to the <b>Coleslaw</b> recipe.</p><dl class="kb-record"><div><dt>Reference name</dt><dd>${esc(link.alias)}</dd></div><div><dt>Recipe</dt><dd>Coleslaw</dd></div><div><dt>Recorded on</dt><dd>1 November 2026</dd></div></dl><div class="kb-actions">${act(fromSaved ? 'saved-back' : 'back-list', fromSaved ? 'Back to saved records' : 'Back to Item links', 'btn ink')}${!fromSaved ? act('saved:links', 'View saved records', 'kb-text-link') : ''}</div></section>`;
  }
  function trainingChoose() {
    const saved = state.assessmentSaved;
    const sectionStatus = saved?.scope === 'section' ? saved.status : 'Not assessed';
    const detail = saved?.scope === 'recipe' ? `Recipe only: ${esc(saved.recipe)} · ${esc(saved.status)}. The Grill section is not assessed.` : saved ? 'Whole Grill section assessment on record.' : 'No section assessment has been recorded.';
    return `${steps(0)}${header('A considered assessment', 'Choose the person and section to assess.')}<div class="kb-task-row"><div><div class="kb-small-label">Section: ${esc(sectionStatus)}</div><h3>Grill section</h3><p>Example cook</p><p data-assessment-summary>${detail}</p></div>${act(saved ? 'show:assessment' : 'start:training', saved ? 'View record' : state.trainingDraft ? 'Resume assessment' : 'Assess', saved ? 'btn' : 'btn orange')}</div><p class="kb-note">Job ticks may help a conversation. They never determine an assessment.</p>`;
  }
  function trainingReview() {
    const f = state.trainingDraft || {scope:'section', recipe:'', assessor:'Example assessor', day:'2026-11-01', status:'', note:''};
    return `<div class="kb-back">${back('back-list', 'Back to Training')}</div>${steps(1)}${header('Grill section', 'Example cook', 'Training assessment')}<form class="kb-form" data-form="training"><fieldset><legend>What are you assessing?</legend><div class="kb-pills"><label class="pill"><input type="radio" name="scope" value="section"${f.scope === 'section' ? ' checked' : ''}> Whole section</label><label class="pill"><input type="radio" name="scope" value="recipe"${f.scope === 'recipe' ? ' checked' : ''}> One recipe</label></div><div data-recipe-field${f.scope === 'recipe' ? '' : ' hidden'}><label class="field"><span>Recipe</span><select name="recipe"><option value="">Choose a recipe</option><option value="Coleslaw"${f.recipe === 'Coleslaw' ? ' selected' : ''}>Coleslaw</option></select></label><p class="kb-help">This records an assessment of the recipe only.</p></div></fieldset><label class="field"><span>Assessment outcome</span><select name="status" required><option value="">Choose an outcome</option${f.status === 'Not assessed' ? ' selected' : ''}>Not assessed</option><option${f.status === 'In training' ? ' selected' : ''}>In training</option><option${f.status === 'Confirmed' ? ' selected' : ''}>Confirmed</option></select></label><div class="kb-form-pair"><label class="field"><span>Assessor</span><input name="assessor" value="${esc(f.assessor)}" required maxlength="80" autocomplete="off"></label><label class="field"><span>Assessment day</span><input name="day" type="date" value="${esc(f.day)}" required></label></div><label class="field"><span>Assessment note <small class="muted">(optional)</small></span><textarea name="note" maxlength="500">${esc(f.note)}</textarea></label>${state.error ? `<p class="kb-error" role="alert">${state.error}</p>` : ''}<div class="kb-actions"><button type="submit" class="btn orange">Record assessment ${icon('check', 18)}</button>${act('cancel-draft', 'Discard assessment', 'kb-text-link')}</div></form>`;
  }
  function trainingRecord(fromSaved = false) {
    const f = state.assessmentSaved;
    return `${fromSaved ? `<div class="kb-back">${back('saved-back', 'Assessments')}</div>` : steps(2)}<section class="kb-outcome"><div class="kb-outcome-mark">${icon('check', 27)}</div><h2 tabindex="-1" data-focus>${fromSaved ? 'Assessment record' : 'Assessment recorded'}</h2><p><b>Example cook</b> · ${f.scope === 'section' ? 'Whole Grill section' : `${esc(f.recipe)} recipe only`}</p><dl class="kb-record"><div><dt>Outcome</dt><dd>${esc(f.status)}</dd></div><div><dt>Scope</dt><dd>${f.scope === 'section' ? 'Whole Grill section' : `${esc(f.recipe)} recipe only`}</dd></div><div><dt>Assessor</dt><dd>${esc(f.assessor)}</dd></div><div><dt>Assessment day</dt><dd>${esc(f.day)}</dd></div>${f.note ? `<div><dt>Note</dt><dd>${esc(f.note)}</dd></div>` : ''}</dl><div class="kb-actions">${act(fromSaved ? 'saved-back' : 'back-list', fromSaved ? 'Back to saved records' : 'Back to Training', 'btn ink')}${!fromSaved ? act('saved:assessments', 'View saved records', 'kb-text-link') : ''}</div></section>`;
  }
  function reports() {
    const counts = {7:[21,2], 30:[84,7], 90:[247,19]}[state.period];
    return `${header('Read the kitchen', 'Recorded activity across completed days.')}<div class="kb-pills" aria-label="Report">${[['prep','Prep & waste'],['team','Team activity'],['health','Analysis health']].map(([id,label]) => act(`report:${id}`,label,'pill',`aria-pressed="${state.report === id}"`)).join('')}</div>${state.report !== 'health' ? `<div class="kb-pills" aria-label="Completed days">${[7,30,90].map(n => act(`period:${n}`,`${n} days`,'pill',`aria-pressed="${state.period === n}"`)).join('')}</div>` : ''}${state.report === 'prep' ? `<div class="kb-totals"><div><strong>${counts[0]}</strong><span>Completed prep jobs</span></div><div><strong>${counts[1]}</strong><span>Waste entries</span></div></div><p class="muted">${state.period} completed days, excluding today. These counts describe records, not a measured waste rate.</p><div class="kb-section"><h3>Read the source records</h3><ul class="kb-data-list"><li><span>House slaw<small>Prep and wastage · recorded name</small></span>${act('chapter:items','Review link →','kb-text-link')}</li></ul>${act('daily',`${state.daily ? 'Hide' : 'Browse'} daily records ${icon('chevron-down',17)}`,'kb-text-link')}${state.daily ? `<ul class="kb-data-list"><li><span>31 October<small>Prep · House slaw</small></span><span>1 job</span></li><li><span>30 October<small>Wastage · House slaw</small></span><span>1 entry</span></li></ul>` : ''}</div>` : state.report === 'team' ? `<div class="kb-section"><h3>Example cook</h3><dl class="kb-record"><div><dt>Section</dt><dd>Grill</dd></div><div><dt>Recorded jobs</dt><dd>${state.period === 7 ? '12' : state.period === 30 ? '39' : '116'}</dd></div><div><dt>Section assessment</dt><dd>${state.assessmentSaved?.scope === 'section' ? esc(state.assessmentSaved.status) : 'Not assessed'}</dd></div>${state.assessmentSaved?.scope === 'recipe' ? `<div data-recipe-assessment><dt>Recipe assessment</dt><dd>${esc(state.assessmentSaved.recipe)} · ${esc(state.assessmentSaved.status)} (recipe only)</dd></div>` : ''}</dl><p class="kb-note">Recorded activity does not establish competence.</p>${act('chapter:training','Open Training →','btn ink')}</div>` : `<dl class="kb-record"><div><dt>Example run</dt><dd>03:00 · Complete</dd></div><div><dt>Source window</dt><dd>90 completed days</dd></div><div><dt>Coverage</dt><dd>All source queries completed</dd></div><div><dt>Source quality</dt><dd>Units kept separate</dd></div></dl><p class="kb-note">The last complete analysis remains available when a later run fails.</p>${act('refresh-report','Refresh analysis health','btn')}`}`;
  }
  function saved() {
    if (state.savedDetail === 'link' && state.linkSaved) return linkRecord(true);
    if (state.savedDetail === 'assessment' && state.assessmentSaved) return trainingRecord(true);
    if (state.savedDetail === 'guide') return `<div class="kb-back">${back('saved-back','Guides')}</div>${header('Grill station handover', 'A reference for the Grill section.', 'Saved guide')}<dl class="kb-record"><div><dt>Section</dt><dd>Grill</dd></div><div><dt>Reference</dt><dd>Station guide</dd></div><div><dt>Content</dt><dd>To come</dd></div></dl><p class="muted">Confirmed methods, temperatures and times belong in the original kitchen guide.</p>${act('saved-back','Back to Guides','btn ink')}`;
    return `${header('The records you keep', 'Confirmed decisions and useful references.')}<div class="kb-pills" aria-label="Saved record type">${[['links','Confirmed links'],['assessments','Assessments'],['guides','Guides']].map(([id,label]) => act(`saved:${id}`,label,'pill',`aria-pressed="${state.savedTab === id}"`)).join('')}</div>${state.savedTab === 'links' ? state.linkSaved ? `<div class="kb-task-row"><div><h3>${esc(state.linkSaved.alias)}</h3><p>Coleslaw · confirmed recipe link</p></div>${act('show:link','Open record','btn')}</div>` : `<div class="kb-empty"><h3>No links recorded yet</h3><p>Review a recorded name and explicitly choose its recipe. The confirmed link will be kept here.</p>${act('chapter:items','Review item links →','btn ink')}</div>` : state.savedTab === 'assessments' ? state.assessmentSaved ? `<div class="kb-task-row"><div><h3>Example cook</h3><p>${state.assessmentSaved.scope === 'section' ? 'Whole Grill section' : `${esc(state.assessmentSaved.recipe)} recipe only`} · ${esc(state.assessmentSaved.status)}</p></div>${act('show:assessment','Open record','btn')}</div>` : `<div class="kb-empty"><h3>No assessment recorded yet</h3><p>An assessment records a person, a scope, an assessor, a day and an explicit outcome.</p>${act('chapter:training','Open Training →','btn ink')}</div>` : `<div class="kb-task-row"><div><h3>Grill station handover</h3><p>Grill section · reference guide</p></div>${act('show:guide','Open guide','btn')}</div>`}`;
  }
  const operationNames = {suppliers:'Supplier workspace', recipes:'Recipes & drawings', functions:'Functions', people:'Staff & sections'};
  function operations() {
    if (state.operation) {
      const id = state.operation;
      const tabs = {suppliers:['Orders','Catalogue','Cut-off sheets'],recipes:['Recipes','Drawings'],functions:['Upcoming','Past functions'],people:['Staff','Kitchen sections']}[id];
      const tab = state.operationTab || tabs[0];
      return `<div class="kb-back">${back('operations-back','Operations')}</div>${header(operationNames[id], 'Choose the part of the workspace you need.')}<div class="kb-pills">${tabs.map(t => act(`operation-tab:${t}`,t,'pill',`aria-pressed="${tab === t}"`)).join('')}</div>${id === 'recipes' && tab === 'Recipes' ? `<div class="kb-task-row"><div><h3>Coleslaw</h3><p>Recipe in the Kitchen Book</p></div>${act('chapter:items','Review its links','btn')}</div>` : id === 'people' ? `<ul class="kb-data-list"><li><span>${tab === 'Staff' ? 'Example cook' : 'Grill section'}<small>${tab === 'Staff' ? 'Assigned section · Grill' : 'Kitchen section'}</small></span>${act('chapter:training','Open Training →','kb-text-link')}</li></ul>` : `<section class="kb-empty"><h3>${tab}</h3><p>${id === 'suppliers' ? 'Supplier orders, catalogue records and cut-off sheets are organised in this workspace.' : id === 'functions' ? 'Kitchen function sheets and the service view are organised here.' : 'Recipe drawings stay beside their original recipes.'}</p>${act('operations-back','Back to Operations','btn')}</section>`}`;
    }
    return `${header('Tools for the working day', 'Open a workspace from the list.')}<ul class="kb-index kb-operation-list">${Object.entries(operationNames).map(([id,name]) => `<li>${act(`operation:${id}`,`<span><span class="kb-chapter-name">${name}</span><span class="kb-chapter-desc">${{suppliers:'Orders, catalogue and cut-off sheets',recipes:'The recipe book and its illustrations',functions:'Upcoming kitchen function sheets',people:'People, permissions and kitchen sections'}[id]}</span></span>${icon('arrow-right')}`,'kb-chapter')}</li>`).join('')}</ul>`;
  }
  function settings() {
    return `${header('Settle into the book', 'Choose your reading preferences.')}<form class="kb-form" data-form="settings"><fieldset><legend>Reading size</legend><label class="kb-choice"><input name="size" type="radio" value="standard"${state.settings.size === 'standard' ? ' checked' : ''}><span>Standard<small>The book’s usual reading size</small></span></label><label class="kb-choice"><input name="size" type="radio" value="large"${state.settings.size === 'large' ? ' checked' : ''}><span>Larger<small>A little more room for the words</small></span></label></fieldset><label class="kb-choice"><input name="reminders" type="checkbox"${state.settings.reminders ? ' checked' : ''}><span>Section reminders<small>Show the section reminder when opening the book.</small></span></label>${state.settingsMessage ? '<p role="status"><b>Preview preferences saved.</b> Your reading choice is now applied.</p>' : ''}<div class="kb-actions"><button class="btn orange" type="submit">Save preferences ${icon('check',18)}</button></div></form>`;
  }
  function workspace() {
    if (state.page === 'items') return state.mode === 'review' ? linkReview() : state.mode === 'record' && state.linkSaved ? linkRecord() : itemChoose();
    if (state.page === 'training') return state.mode === 'review' ? trainingReview() : state.mode === 'record' && state.assessmentSaved ? trainingRecord() : trainingChoose();
    if (state.page === 'reports') return reports();
    if (state.page === 'saved') return saved();
    if (state.page === 'operations') return operations();
    return settings();
  }
  function render(focus = true) {
    const previousFocus = root.contains(document.activeElement) ? document.activeElement : null;
    const previousAction = previousFocus?.dataset.action;
    const previousForm = previousFocus?.matches('[type="submit"]') ? previousFocus.closest('form')?.dataset.form : '';
    const homePage = state.page === 'home';
    const focusedTask = ['items', 'training'].includes(state.page) && state.mode === 'review';
    const ch = chapters.find(row => row[0] === state.page);
    root.classList.toggle('kb-large-text', state.settings.size === 'large');
    root.innerHTML = `<div class="kb-spread${homePage ? ' kb-home' : ''}${focusedTask ? ' kb-focused-task' : ''}">${margin()}<section class="kb-leaf kb-page">${homePage ? home() : `<div class="kb-running"><span class="kb-volume">Chapter ${ch[1]} · ${ch[2]}</span><span>Admin book</span></div><div class="kb-mobile-heading">${back('contents','Contents')}</div>${resumeStrip()}${workspace()}${folio(ch[2], String(Number(ch[1]) * 2).padStart(2,'0'))}`}</section></div><div class="kb-chapter-footer"><span>Leichhardt Hotel · Kitchen Book</span><span>Give one thing your full attention.</span></div>`;
    if (focus) {
      const heading = [...root.querySelectorAll('[data-focus]')].find(el => el.getClientRects().length);
      heading?.focus({preventScroll:true});
      window.scrollTo({top:0, behavior:'instant'});
    } else if (previousAction) {
      [...root.querySelectorAll('[data-action]')].find(el => el.dataset.action === previousAction && el.getClientRects().length)?.focus({preventScroll:true});
    } else if (previousForm) {
      [...root.querySelectorAll('form[data-form]')].find(el => el.dataset.form === previousForm)?.querySelector('[type="submit"]')?.focus({preventScroll:true});
    }
  }
  function openPage(page) {
    preserveDraft();
    state.page = page;
    state.mode = 'choose';
    state.error = '';
    state.savedDetail = '';
    state.operation = '';
    render();
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const [action, value] = button.dataset.action.split(':');
    if (action === 'chapter') return openPage(value);
    if (action === 'contents') return openPage('home');
    if (action === 'start' || action === 'resume') {
      preserveDraft();
      state.page = action === 'resume' ? value : value === 'link' ? 'items' : 'training';
      state.mode = 'review'; state.error = ''; render(); return;
    }
    if (action === 'back-list') { preserveDraft(); state.mode = 'choose'; state.error = ''; render(); return; }
    if (action === 'cancel-draft') {
      if (state.page === 'items') state.linkDraft = null;
      else state.trainingDraft = null;
      state.mode = 'choose'; state.error = ''; render(); D.toast('Unfinished review discarded.'); return;
    }
    if (action === 'show') {
      if (state.page === 'saved' || value === 'guide') { state.page = 'saved'; state.savedDetail = value; }
      else state.mode = 'record';
      render(); return;
    }
    if (action === 'saved') { preserveDraft(); state.page = 'saved'; state.savedTab = value; state.savedDetail = ''; render(); return; }
    if (action === 'saved-back') { state.savedDetail = ''; render(); return; }
    if (action === 'report') { state.report = value; render(false); return; }
    if (action === 'period') { state.period = Number(value); render(false); return; }
    if (action === 'daily') { state.daily = !state.daily; render(false); return; }
    if (action === 'refresh-report') { D.toast('Preview refreshed. Example complete run: 03:00.'); return; }
    if (action === 'operation') { state.operation = value; state.operationTab = ''; render(); return; }
    if (action === 'operation-tab') { state.operationTab = value; render(false); return; }
    if (action === 'operations-back') { state.operation = ''; render(); }
  });
  root.addEventListener('change', event => {
    if (event.target.name === 'scope') {
      preserveDraft();
      const recipeField = root.querySelector('[data-recipe-field]');
      recipeField.hidden = event.target.value !== 'recipe';
    }
  });
  root.addEventListener('submit', event => {
    const form = event.target.closest('form[data-form]');
    if (!form) return;
    event.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    if (form.dataset.form === 'link') {
      state.linkDraft = f;
      if (!f.alias.trim() || f.recipe !== 'Coleslaw') { state.error = 'Enter a reference name and choose the Coleslaw recipe.'; render(false); root.querySelector('.kb-error')?.scrollIntoView({block:'center'}); return; }
      state.linkSaved = {alias:f.alias.trim(), recipe:f.recipe}; state.linkDraft = null; state.mode = 'record'; state.error = ''; render(); D.toast('Recipe link recorded in this preview.');
    } else if (form.dataset.form === 'training') {
      state.trainingDraft = f;
      if (!f.status || !f.assessor.trim() || !f.day || (f.scope === 'recipe' && f.recipe !== 'Coleslaw')) { state.error = 'Choose the scope and outcome, then enter the assessor and day.'; render(false); root.querySelector('.kb-error')?.scrollIntoView({block:'center'}); return; }
      state.assessmentSaved = {...f, assessor:f.assessor.trim()}; state.trainingDraft = null; state.mode = 'record'; state.error = ''; render(); D.toast('Assessment recorded in this preview.');
    } else {
      state.settings = {size:f.size, reminders:f.reminders === 'on'}; state.settingsMessage = true; render(false); D.toast('Reading preferences saved in this preview.');
    }
  });
  render(false);
})();
