/* This design study reads no kitchen data. All example records and drafts live in this tab. */
(() => {
  'use strict';
  const root = document.getElementById('desk-app');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const icon = (name, size = 20) => window.Design.icon(name, size);
  const chapters = [ ['review', 'Review desk'], ['reports', 'Reports'], ['records', 'Saved records'], ['operations', 'Operations'], ['settings', 'Settings'] ];
  const recipes = ['Coleslaw', 'Caesar dressing', 'Garlic aioli'];
  const tasks = [
    { id: 'slaw', kind: 'link', name: 'House slaw', description: 'Review its link to Coleslaw', recipe: 'Coleslaw', evidence: '24 prep entries · 3 waste entries', state: 'Link to review' },
    { id: 'grill', kind: 'training', name: 'Grill section', description: 'Assessment for Example cook', evidence: '18 completed jobs recorded', state: 'Not assessed' },
    { id: 'dressing', kind: 'link', name: 'Caesar dressing', description: 'Review the recorded ingredient name', recipe: 'Caesar dressing', evidence: '12 prep entries · 1 waste entry', state: 'Link to review' }
  ];
  const initialRecords = [
    { id: 'saved-slaw', kind: 'link', alias: 'Slaw prep', recipe: 'Coleslaw', day: '2026-10-31', note: 'An example of a previously confirmed name.', version: 1 },
    { id: 'saved-larder', kind: 'training', person: 'Example cook', section: 'Larder section', scope: 'section', recipe: '', status: 'In training', assessor: 'Example assessor', day: '2026-10-31', note: 'An example of an explicit assessment.', version: 1 }
  ];
  const state = { page: 'review', filter: 'all', selected: null, drafts: {}, taskPositions: {}, completed: [], records: initialRecords.map(record => ({ ...record })), recordTab: 'link', recordId: null, operation: null, period: '7', largeText: false, returnScroll: 0, reportDetail: false, outcome: '' };
  const pageMeta = {
    review: { kicker: '01 / REVIEW & DECIDE', title: 'Review desk', description: 'A place to settle the links and record the learning.' },
    reports: { kicker: '02 / THE RECORDED PICTURE', title: 'Reports', description: 'Look at what was recorded, with the sources close by.' },
    records: { kicker: '03 / KEPT IN THE BOOK', title: 'Saved records', description: 'Confirmed links and explicit assessments, in their own place.' },
    operations: { kicker: '04 / RUNNING THE KITCHEN', title: 'Operations', description: 'The practical tools, together in one chapter.' },
    settings: { kicker: '05 / YOUR WORKSPACE', title: 'Settings', description: 'A few useful controls for the book and this screen.' }
  };
  const operationData = {
    suppliers: { title: 'Suppliers', icon: 'orders', description: 'Orders, catalogue and cut-off sheets', rows: [['Supplier orders', 'View the recorded orders and their cut-off sheets.'], ['Private catalogue', 'Find a supplier item by its recorded name.'], ['Order history', 'Open dated supplier order records.']] },
    deliveries: { title: 'Delivery records', icon: 'clipboard', description: 'Recorded receipts and temperatures', rows: [['Received deliveries', 'Browse the dated delivery receipts.'], ['Chilled and frozen temperatures', 'View the temperatures recorded at receipt.'], ['Original records', 'Keep source entries beside any later review.']] },
    recipes: { title: 'Manage recipes', icon: 'book', description: 'Recipes, ingredients and drawings', rows: [['Recipe book', 'Open the existing recipe collection.'], ['Ingredients and methods', 'Review the confirmed recipe content.'], ['Drawings', 'Open the recipe drawing workspace.']] },
    people: { title: 'People & sections', icon: 'people', description: 'Kitchen sections and access', rows: [['Kitchen sections', 'Manage the named sections in the book.'], ['Access', 'Review the existing permissions for each role.'], ['Training assessments', 'Record learning from Review desk. Activity does not set a training status.']] },
    pings: { title: 'Shift pings', icon: 'bell', description: 'Messages for the kitchen team', rows: [['Current pings', 'Review the messages scheduled for the team.'], ['New ping', 'Prepare a message with an explicit time.'], ['Meeting minutes', 'Keep meeting records and sign-offs together.']] },
    functions: { title: 'Functions', icon: 'grid', description: 'The schedule and function sheets', rows: [['Function schedule', 'See the dated function list.'], ['Function sheets', 'Open the recorded function details.'], ['Service view', 'Keep the current function close during service.']] }
  };
  const chapterName = () => chapters.find(([key]) => key === state.page)[1];
  const pendingTasks = () => tasks.filter(task => !state.completed.includes(task.id));
  const filteredTasks = () => pendingTasks().filter(task => state.filter === 'all' || task.kind === state.filter);
  const dateLabel = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return 'Day not set';
    const parts = value.split('-');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${Number(parts[2])} ${months[Number(parts[1]) - 1]} ${parts[0]}`;
  };
  const button = (text, action, attributes = '', className = 'btn') => `<button type="button" class="${className}" data-action="${action}" ${attributes}>${text}</button>`;

  function shell() {
    const meta = pageMeta[state.page];
    return `<div class="desk-shell${state.largeText ? ' large-text' : ''}">
      <aside class="desk-sidebar" aria-label="Admin chapters">
        <span class="eyebrow">The admin book</span>
        <nav class="desk-chapters">${chapters.map(([key, label], index) => `<button class="desk-chapter" data-action="chapter" data-page="${key}" ${state.page === key ? 'aria-current="page"' : ''}><span>0${index + 1}</span><span>${label}</span></button>`).join('')}</nav>
        <div class="desk-sidebar-foot"><span class="hand">One thing at a time.</span>Links. Learning. The daily picture.<br>A little room to think.</div>
      </aside>
      <main class="desk-main" id="desk-main" tabindex="-1">
        <div class="desk-mobile-chapters"><span>Admin chapter</span><select id="desk-chapter" aria-label="Admin chapter">${chapters.map(([key, label]) => `<option value="${key}"${state.page === key ? ' selected' : ''}>${label}</option>`).join('')}</select></div>
        <div class="desk-breadcrumb"><span>Kitchen Book / Admin / ${chapterName()}</span><span>Sunday, 1 November</span></div>
        <header class="desk-title-row"><div><span class="eyebrow">${meta.kicker}</span><h1 id="desk-page-title" tabindex="-1">${meta.title}</h1><p>${meta.description}</p></div>${state.page === 'review' ? '<div class="desk-title-note">Make room<br>for the details.</div>' : ''}</header>
        ${draftBanner()}
        ${state.outcome && state.page === 'review' && !state.selected ? `<div class="desk-draft-banner" role="status"><span>${icon('check', 17)} ${esc(state.outcome)}</span>${button('View saved record', 'chapter', 'data-page="records"', 'quiet')}</div>` : ''}
        ${state.page === 'review' ? review() : state.page === 'reports' ? reports() : state.page === 'records' ? records() : state.page === 'operations' ? operations() : settings()}
        <footer class="desk-prototype-note"><b>A / THE CHEF’S DESK</b><span>Interactive layout study · Example data only</span></footer>
      </main>
    </div>`;
  }

  function draftBanner() {
    const draftId = Object.keys(state.drafts).find(id => id !== state.selected);
    if (!draftId) return '';
    const task = tasks.find(item => item.id === draftId);
    if (!task) return '';
    return `<div class="desk-draft-banner"><span>Unfinished review: <strong>${esc(task.name)}</strong></span>${button('Resume', 'resume', `data-id="${esc(draftId)}"`, 'quiet')}</div>`;
  }

  function review() {
    const visible = filteredTasks();
    return `<div class="desk-workspace${state.selected ? ' has-task' : ''}">
      <section class="desk-work" aria-label="Tasks to review">
        <div class="desk-work-title"><h2>Ready for a closer look</h2><span class="desk-count">${pendingTasks().length} ${pendingTasks().length === 1 ? 'task' : 'tasks'}</span></div>
        <div class="desk-filter" aria-label="Task type">${[['all', 'All tasks'], ['link', 'Item links'], ['training', 'Training']].map(([value, text]) => button(text, 'filter', `data-value="${value}" aria-pressed="${state.filter === value}"`, 'pill')).join('')}</div>
        <div class="desk-queue">${visible.length ? visible.map((task, index) => `<button class="desk-task" data-action="open-task" data-id="${task.id}" aria-pressed="${state.selected === task.id}"><span class="desk-task-number">${String(index + 1).padStart(2, '0')}</span><span class="desk-task-copy"><span class="eyebrow">${task.kind === 'link' ? 'INGREDIENT TO RECIPE' : 'EXPLICIT ASSESSMENT'}</span><span class="desk-task-title">${task.name}</span><span class="desk-task-desc">${task.description}</span><span class="desk-task-state">${state.drafts[task.id] ? 'Draft kept here' : task.state}</span></span>${icon('arrow-right', 21)}</button>`).join('') : `<div class="desk-empty"><h3>${pendingTasks().length ? 'No tasks in this view.' : 'A clear desk.'}</h3><p>${pendingTasks().length ? 'Choose another task type to keep reviewing.' : 'The example reviews are saved in the book.'}</p>${button('Open saved records', 'chapter', 'data-page="records"', 'btn ink')}</div>`}</div>
        <div class="desk-work-foot"><span>Source window: 90 completed days</span><span>Each decision stays yours.</span></div>
      </section>
      ${state.selected ? editor() : context()}
    </div>`;
  }

  function context() {
    const linkCount = pendingTasks().filter(task => task.kind === 'link').length;
    const trainingCount = pendingTasks().filter(task => task.kind === 'training').length;
    return `<aside class="desk-context" aria-label="Review overview"><span class="eyebrow">BEFORE YOU BEGIN</span><h2>A clear starting point.</h2><p>Choose a name to review its recipe link, or open an assessment to record a training decision.</p><div class="desk-tallies"><div><strong>${linkCount}</strong><span>item ${linkCount === 1 ? 'link' : 'links'} to review</span></div><div><strong>${trainingCount}</strong><span>training assessment</span></div></div>${button(`Look at the reports ${icon('arrow-up-right', 17)}`, 'chapter', 'data-page="reports"', 'desk-context-link')}${button(`Find a saved record ${icon('arrow-up-right', 17)}`, 'chapter', 'data-page="records"', 'desk-context-link')}<p class="desk-small-note">Completed jobs describe recorded activity. Training status comes from an explicit assessment.</p></aside>`;
  }

  function newDraft(task) {
    return task.kind === 'link'
      ? { alias: task.name, recipe: task.recipe, note: '' }
      : { person: 'Example cook', section: 'Grill section', scope: 'section', recipe: '', assessor: 'Example assessor', day: '2026-11-01', status: '', note: '' };
  }

  function editor() {
    const task = tasks.find(item => item.id === state.selected);
    const draft = state.drafts[task.id];
    return `<section class="desk-editor" aria-labelledby="desk-task-title">
      ${button(`${icon('arrow-left', 16)} Back to list`, 'back-task', '', 'desk-back')}
      <span class="eyebrow">${task.kind === 'link' ? 'REVIEW THE LINK' : 'RECORD AN ASSESSMENT'}</span>
      <h2 id="desk-task-title" tabindex="-1">${task.name}</h2>
      <p class="desk-editor-sub">${task.kind === 'link' ? 'Keep the recorded name connected to the right recipe.' : 'Example cook · An explicit training decision.'}</p>
      <div class="desk-source"><strong>${task.kind === 'link' ? 'Recorded activity' : 'Activity is context'}</strong><span>${task.evidence}</span><span class="muted">90 completed days · Example records</span>${task.kind === 'training' ? '<span>These counts do not set a training status.</span>' : ''}</div>
      <form id="desk-task-form">
        ${task.kind === 'link' ? linkFields(draft) : trainingFields(draft)}
        <div class="desk-editor-actions" role="group" aria-label="Review actions"><button class="btn orange" type="submit" id="desk-save" aria-label="${task.kind === 'link' ? 'Save link & return' : 'Save assessment & return'}"${validDraft(task, draft) ? '' : ' disabled'}>${icon('check', 18)}<span class="desk-action-wide">${task.kind === 'link' ? 'Save link & return' : 'Save assessment & return'}</span><span class="desk-action-phone">Save & return</span></button>${filteredTasks().length > 1 ? button('<span class="desk-action-wide">Save & review next</span><span class="desk-action-phone">Save & next</span>', 'save-next', `${validDraft(task, draft) ? '' : 'disabled'} id="desk-save-next" aria-label="Save & review next"`, 'btn') : ''}</div>
        ${button('Cancel changes', 'cancel-task', '', 'desk-cancel')}
        <p class="desk-save-help">Saves to this example only. Nothing goes to the kitchen book.</p>
      </form>
    </section>`;
  }

  function linkFields(draft) {
    return `<label class="desk-field"><span>Recorded ingredient name</span><input name="alias" data-field="alias" value="${esc(draft.alias)}" required autocomplete="off"><small>Keep the name as it appears in the source.</small></label>
      <label class="desk-field"><span>Link to recipe</span><select name="recipe" data-field="recipe" required><option value="">Choose a recipe</option>${recipes.map(recipe => `<option value="${esc(recipe)}"${draft.recipe === recipe ? ' selected' : ''}>${esc(recipe)}</option>`).join('')}</select><small>A confirmed link does not change the original entry.</small></label>
      ${optionalNote(draft, 'Note', 'A useful detail for later')}`;
  }

  function optionalNote(draft, label, placeholder) {
    return `<details class="desk-optional-note"${draft.note ? ' open' : ''}><summary><span>${label} <span class="muted">(optional)</span></span>${icon('chevron-down', 16)}</summary><label class="desk-field"><span class="sr-only">${label}</span><textarea name="note" data-field="note" rows="2" placeholder="${placeholder}">${esc(draft.note)}</textarea></label></details>`;
  }

  function trainingFields(draft) {
    return `<fieldset class="desk-fieldset"><legend>Assessment covers</legend><div class="desk-scope">${[['section', 'Whole section'], ['recipe', 'One recipe']].map(([value, label]) => `<label class="desk-choice"><input type="radio" name="scope" data-field="scope" value="${value}"${draft.scope === value ? ' checked' : ''}>${label}</label>`).join('')}</div></fieldset>
      ${draft.scope === 'recipe' ? `<label class="desk-field"><span>Recipe assessed</span><select data-field="recipe" required><option value="">Choose a recipe</option>${recipes.map(recipe => `<option value="${recipe}"${draft.recipe === recipe ? ' selected' : ''}>${recipe}</option>`).join('')}</select><small>This outcome applies to this recipe only.</small></label>` : '<div class="desk-source"><strong>Grill section</strong><span>The outcome applies to the whole named section.</span></div>'}
      <fieldset class="desk-fieldset"><legend>Assessment outcome <span class="muted">(choose one)</span></legend><div class="desk-status">${['Not assessed', 'In training', 'Confirmed'].map(status => `<label class="desk-choice"><input type="radio" name="status" data-field="status" value="${status}"${draft.status === status ? ' checked' : ''} required>${status}</label>`).join('')}</div></fieldset>
      <label class="desk-field"><span>Assessor</span><select name="assessor" data-field="assessor" required><option value="Example assessor"${draft.assessor === 'Example assessor' ? ' selected' : ''}>Example assessor</option><option value="">Choose an assessor</option></select></label>
      <label class="desk-field"><span>Assessment day</span><input type="date" name="day" data-field="day" value="${esc(draft.day)}" required></label>
      ${optionalNote(draft, 'Assessment note', 'Record what was assessed')}`;
  }

  function reports() {
    const sets = {
      '7': { jobs: 84, waste: 7, dates: '25–31 October 2026', label: 'Daily completed jobs', values: [12,14,10,13,11,15,9], days: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] },
      '30': { jobs: 346, waste: 29, dates: '2–31 October 2026', label: 'Completed jobs by week group', values: [78,82,80,84,22], days: ['1–7','8–14','15–21','22–28','29–30'] },
      '90': { jobs: 1031, waste: 83, dates: '3 August–31 October 2026', label: 'Completed jobs by 15-day group', values: [172,183,164,177,159,176], days: ['1–15','16–30','31–45','46–60','61–75','76–90'] }
    };
    const data = sets[state.period];
    const max = Math.max(...data.values);
    return `<section class="desk-page-content" aria-label="Example activity report">
      <div class="desk-report-top"><div class="desk-filter" aria-label="Completed day range">${['7','30','90'].map(period => button(`${period} days`, 'period', `data-value="${period}" aria-pressed="${state.period === period}"`, 'pill')).join('')}</div><span class="desk-period">${data.dates} · Completed Queensland days</span></div>
      <div class="desk-report-stats"><div class="desk-report-stat"><strong>${data.jobs}</strong><div><h2>Completed jobs</h2><p>Recorded prep activity</p></div></div><div class="desk-report-stat"><strong>${data.waste}</strong><div><h2>Waste entries</h2><p>Entries in the waste log</p></div></div></div>
      <div class="desk-report-body"><div><h2 class="desk-small-heading">${data.label}</h2><div class="desk-activity" role="img" aria-label="${data.days.map((day,index) => `${day}: ${data.values[index]} completed jobs`).join('; ')}" style="grid-template-columns: repeat(${data.values.length},1fr)">${data.values.map((value,index) => `<div class="desk-activity-day"><div class="desk-activity-bar" style="height:${Math.round(value/max*94)}%"><span>${value}</span></div><span>${data.days[index]}</span></div>`).join('')}</div><p class="desk-report-caption">A count of completed jobs. It does not measure consumption or training competence.</p>${button(`${state.reportDetail ? 'Hide' : 'Browse'} daily records ${icon(state.reportDetail ? 'chevron-down' : 'arrow-right', 17)}`, 'report-detail', `aria-expanded="${state.reportDetail}"`, 'btn')}${state.reportDetail ? `<ul class="desk-plain-list" style="margin-top:20px">${data.days.map((day,index) => `<li><strong>${day} · ${data.values[index]} completed jobs</strong><span>Example prep records · Source window ${state.period} days</span></li>`).join('')}</ul>` : ''}</div>
      <aside><h2 class="desk-small-heading">Read with the sources</h2><ul class="desk-plain-list"><li><strong>Prep</strong><span>Completed jobs are recorded activity, not measured consumption.</span></li><li><strong>Waste</strong><span>Entries are shown separately. This is not a measured waste rate.</span></li><li><strong>Training</strong><span>Assessment outcomes are recorded explicitly, apart from activity.</span></li></ul>${button(`Analysis health ${icon('arrow-right', 17)}`, 'health', '', 'desk-context-link')}</aside></div>
    </section>`;
  }

  function records() {
    if (state.recordId) return recordDetail();
    const records = state.records.filter(record => record.kind === state.recordTab);
    return `<section class="desk-page-content"><div class="desk-library"><div><div class="desk-filter" aria-label="Saved record type">${[['link','Confirmed links'],['training','Assessments']].map(([value,label]) => button(label, 'record-tab', `data-value="${value}" aria-pressed="${state.recordTab === value}"`, 'pill')).join('')}</div><div class="desk-queue">${records.map(record => `<button class="desk-record-row" data-action="open-record" data-id="${esc(record.id)}"><span><span class="desk-record-kind">${record.kind === 'link' ? 'Confirmed recipe link' : esc(record.status)}</span><strong>${record.kind === 'link' ? `${esc(record.alias)} → ${esc(record.recipe)}` : `${esc(record.person)} · ${esc(record.scope === 'recipe' ? record.recipe : record.section)}`}</strong><small>${dateLabel(record.day)} · Version ${record.version}</small></span>${icon('arrow-right',20)}</button>`).join('') || '<div class="desk-empty"><h3>Nothing saved here yet.</h3><p>Complete a review to keep its decision in this chapter.</p></div>'}</div></div><aside class="desk-context"><span class="eyebrow">A PLACE TO COME BACK TO</span><h2>Decisions kept clear.</h2><p>Saved links and assessments stay separate from the review queue and the reporting dates.</p><p class="desk-small-note">A recipe assessment applies to that recipe. It does not confirm an entire section.</p>${button(`Back to the review desk ${icon('arrow-right',17)}`, 'chapter', 'data-page="review"', 'desk-context-link')}</aside></div></section>`;
  }

  function recordDetail() {
    const record = state.records.find(item => item.id === state.recordId);
    if (!record) { state.recordId = null; return records(); }
    const rows = record.kind === 'link'
      ? [['Recorded name',record.alias], ['Recipe',record.recipe], ['Status','Confirmed link'], ['Saved day',dateLabel(record.day)], ['Version',String(record.version)], ['Note',record.note || 'No note recorded']]
      : [['Person',record.person], ['Assessment scope',record.scope === 'recipe' ? 'One recipe' : 'Whole section'], [record.scope === 'recipe' ? 'Recipe' : 'Section',record.scope === 'recipe' ? record.recipe : record.section], ['Outcome',record.status], ['Assessor',record.assessor], ['Assessment day',dateLabel(record.day)], ['Version',String(record.version)], ['Note',record.note || 'No note recorded']];
    return `<section class="desk-page-content">${button(`${icon('arrow-left',16)} Back to ${record.kind === 'link' ? 'confirmed links' : 'assessments'}`, 'back-record', '', 'desk-back')}<div class="desk-detail"><span class="eyebrow">${record.kind === 'link' ? 'CONFIRMED LINK' : 'SAVED ASSESSMENT'}</span><h2>${esc(record.kind === 'link' ? record.alias : `${record.person} · ${record.scope === 'recipe' ? record.recipe : record.section}`)}</h2>${rows.map(([label,value]) => `<dl class="desk-definition"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></dl>`).join('')}${button('Back to review desk', 'chapter', 'data-page="review"', 'btn ink')}</div></section>`;
  }

  function operations() {
    if (state.operation) {
      const tool = operationData[state.operation];
      return `<section class="desk-page-content">${button(`${icon('arrow-left',16)} Back to Operations`, 'back-operation', '', 'desk-back')}<div class="desk-detail"><span class="eyebrow">OPERATIONAL WORKSPACE</span><h2>${tool.title}</h2><p class="muted">${tool.description}.</p><ul class="desk-plain-list">${tool.rows.map(([title,text]) => `<li><strong>${title}</strong><span>${text}</span></li>`).join('')}</ul><p class="desk-report-caption">This is a layout preview of the Operations entry. Existing kitchen tools would open from here.</p>${button('Return to Operations', 'back-operation', '', 'btn ink')}</div></section>`;
    }
    return `<section class="desk-page-content"><div class="desk-tools">${Object.entries(operationData).map(([key,tool]) => `<button class="desk-tool" data-action="operation" data-id="${key}">${icon(tool.icon,22)}<span><strong>${tool.title}</strong><small>${tool.description}</small></span>${icon('arrow-up-right',20)}</button>`).join('')}</div></section>`;
  }

  function settings() {
    return `<section class="desk-page-content desk-settings"><div class="desk-setting"><div><h2>Text size</h2><p>A little more room for reading.</p></div><div class="desk-filter" aria-label="Text size">${button('Standard','text-size',`data-value="standard" aria-pressed="${!state.largeText}"`,'pill')}${button('Larger','text-size',`data-value="large" aria-pressed="${state.largeText}"`,'pill')}</div></div><div class="desk-setting"><div><h2>Backup</h2><p>Preview the action using example records only.</p></div>${button(`${icon('archive',18)} Export example`, 'export', '', 'btn')}</div><div class="desk-setting"><div><h2>Start the example again</h2><p>Clear this tab’s demo decisions and drafts.</p></div>${button('Reset example', 'reset', '', 'btn')}</div><p class="desk-report-caption">Preferences and records are kept in memory for this prototype. Reloading starts a fresh example.</p></section>`;
  }

  function validDraft(task, draft) {
    if (task.kind === 'link') return Boolean(draft.alias.trim() && recipes.includes(draft.recipe));
    return Boolean(draft.person && draft.section && draft.assessor && /^\d{4}-\d{2}-\d{2}$/.test(draft.day) && ['Not assessed', 'In training', 'Confirmed'].includes(draft.status) && (draft.scope === 'section' || recipes.includes(draft.recipe)));
  }

  function updateSave() {
    const task = tasks.find(item => item.id === state.selected);
    if (!task) return;
    const valid = validDraft(task, state.drafts[task.id]);
    const save = document.getElementById('desk-save');
    const next = document.getElementById('desk-save-next');
    if (save) save.disabled = !valid;
    if (next) next.disabled = !valid;
  }

  function render(focusId) {
    root.innerHTML = shell();
    if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
  }

  function navigate(page) {
    if (!chapters.some(([key]) => key === page)) return;
    state.page = page;
    state.selected = null;
    state.recordId = null;
    state.operation = null;
    render('desk-page-title');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function openTask(id, originScroll = null) {
    const task = tasks.find(item => item.id === id);
    if (!task || state.completed.includes(id)) return;
    if (!state.drafts[id]) {
      state.drafts[id] = newDraft(task);
      state.taskPositions[id] = originScroll ?? (state.page === 'review' ? window.scrollY : 0);
    }
    state.returnScroll = state.taskPositions[id] || 0;
    state.page = 'review';
    state.selected = id;
    state.outcome = '';
    render('desk-task-title');
    if (window.innerWidth < 1100) window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function backToList(discard = false) {
    if (discard) {
      delete state.drafts[state.selected];
      delete state.taskPositions[state.selected];
    }
    state.selected = null;
    render('desk-page-title');
    window.scrollTo({ top: state.returnScroll, behavior: 'instant' });
  }

  function saveTask(next) {
    const task = tasks.find(item => item.id === state.selected);
    const draft = task && state.drafts[task.id];
    if (!task || !draft || !validDraft(task,draft)) return;
    if (task.kind === 'link') {
      const duplicate = state.records.find(record => record.kind === 'link' && record.alias.trim().toLowerCase() === draft.alias.trim().toLowerCase());
      if (duplicate) { window.Design.toast('That recorded name already has a saved link. Keep a different name.'); return; }
    }
    const record = { ...draft, id: `example-${task.id}`, kind: task.kind, day: task.kind === 'link' ? '2026-11-01' : draft.day, version: 1 };
    state.records.push(record);
    state.completed.push(task.id);
    state.recordTab = task.kind;
    delete state.drafts[task.id];
    delete state.taskPositions[task.id];
    state.selected = null;
    state.outcome = `${task.kind === 'link' ? 'Link' : 'Assessment'} saved: ${task.name}.`;
    window.Design.toast(task.kind === 'link' ? 'Example link saved. The review queue is updated.' : 'Example assessment saved. The review queue is updated.');
    if (next && filteredTasks().length) openTask(filteredTasks()[0].id, state.returnScroll);
    else { render('desk-page-title'); window.scrollTo({ top: state.returnScroll, behavior: 'instant' }); }
  }

  function renderControl(action, value = '') {
    render();
    Array.from(root.querySelectorAll('[data-action]')).find(control => control.dataset.action === action && (control.dataset.value || '') === value)?.focus({ preventScroll: true });
  }

  root.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (!target || !root.contains(target) || target.disabled) return;
    const action = target.dataset.action;
    if (action === 'chapter') navigate(target.dataset.page);
    else if (action === 'filter') { state.filter = target.dataset.value; renderControl(action, target.dataset.value); }
    else if (action === 'open-task' || action === 'resume') openTask(target.dataset.id);
    else if (action === 'back-task') backToList();
    else if (action === 'cancel-task') { backToList(true); window.Design.toast('Example changes cancelled.'); }
    else if (action === 'save-next') saveTask(true);
    else if (action === 'period') { state.period = target.dataset.value; state.reportDetail = false; renderControl(action, target.dataset.value); }
    else if (action === 'report-detail') { state.reportDetail = !state.reportDetail; renderControl(action); }
    else if (action === 'record-tab') { state.recordTab = target.dataset.value; renderControl(action, target.dataset.value); }
    else if (action === 'open-record') { state.recordId = target.dataset.id; render('desk-page-title'); }
    else if (action === 'back-record') { state.recordId = null; render('desk-page-title'); }
    else if (action === 'operation') { state.operation = target.dataset.id; render('desk-page-title'); }
    else if (action === 'back-operation') { state.operation = null; render('desk-page-title'); }
    else if (action === 'text-size') { state.largeText = target.dataset.value === 'large'; renderControl(action, target.dataset.value); window.Design.toast(state.largeText ? 'Larger text is on for this example.' : 'Standard text is on for this example.'); }
    else if (action === 'health') showHealth();
    else if (action === 'export') exportExample();
    else if (action === 'reset') resetExample();
  });

  root.addEventListener('submit', event => {
    if (event.target.id !== 'desk-task-form') return;
    event.preventDefault();
    saveTask(false);
  });

  root.addEventListener('input', event => {
    const field = event.target.dataset.field;
    if (!field || !state.selected) return;
    const draft = state.drafts[state.selected];
    if (!draft || !Object.prototype.hasOwnProperty.call(draft, field)) return;
    draft[field] = event.target.value;
    updateSave();
  });

  root.addEventListener('change', event => {
    if (event.target.id === 'desk-chapter') { navigate(event.target.value); return; }
    const field = event.target.dataset.field;
    if (!field || !state.selected) return;
    const draft = state.drafts[state.selected];
    if (!draft || !Object.prototype.hasOwnProperty.call(draft, field)) return;
    draft[field] = event.target.value;
    if (field === 'scope') {
      render();
      root.querySelector(`[data-field="scope"][value="${draft.scope === 'section' ? 'section' : 'recipe'}"]`)?.focus({preventScroll:true});
    } else updateSave();
  });

  root.addEventListener('focusin', event => {
    if (event.target.matches('input[type="text"], input:not([type])')) event.target.select();
  });

  function showHealth() {
    const overlay = document.createElement('div');
    overlay.className = 'desk-health-overlay';
    overlay.innerHTML = `<section class="desk-health-dialog" role="dialog" aria-modal="true" aria-labelledby="desk-health-title"><span class="eyebrow">EXAMPLE SOURCE COVERAGE</span><h2 id="desk-health-title" tabindex="-1">Analysis health</h2><ul class="desk-plain-list"><li><strong>Completed source window</strong><span>${state.period} completed Queensland days, excluding today.</span></li><li><strong>Coverage</strong><span>Prep and waste example records are included.</span></li><li><strong>Separate measures</strong><span>Job counts and waste entry counts stay separate.</span></li></ul>${button('Close', 'close-health', '', 'btn ink')}</section>`;
    document.body.append(overlay);
    const priorFocus = document.activeElement;
    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); priorFocus?.focus(); };
    const onKey = event => {
      if (event.key === 'Escape') close();
      if (event.key === 'Tab') { event.preventDefault(); overlay.querySelector('button').focus(); }
    };
    overlay.addEventListener('click', event => { if (event.target === overlay || event.target.closest('[data-action="close-health"]')) close(); });
    document.addEventListener('keydown', onKey);
    overlay.querySelector('h2').focus();
  }

  function exportExample() {
    const blob = new Blob([JSON.stringify({ exampleDataOnly: true, concept: 'The Chef’s Desk', records: state.records }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chefs-desk-example-records.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    window.Design.toast('Example records exported. No kitchen data is included.');
  }

  function resetExample() {
    state.completed = [];
    state.drafts = {};
    state.taskPositions = {};
    state.selected = null;
    state.records = initialRecords.map(record => ({ ...record }));
    state.recordId = null;
    state.outcome = '';
    state.largeText = false;
    state.filter = 'all';
    state.period = '7';
    state.recordTab = 'link';
    state.reportDetail = false;
    navigate('review');
    window.Design.toast('The example is ready to try again.');
  }

  render();
})();
