/* Design preview only. Synthetic work, declarations and recognition stay in this tab. */
(() => {
  'use strict';
  const root = document.getElementById('a-app');
  const { esc, icon } = window.Study;
  const people = { cook: { name: 'Example cook', section: 'Larder' }, chef: { name: 'Example chef', section: 'Grill' } };
  const destinations = [['recipes','Recipes','book'],['prep','Prep','prep'],['orders','Orders','prep'],['waste','Wastage','waste'],['transfers','Transfers','arrow']];
  const units = ['kg','g','L','mL','each'];
  const reasons = ['Prep trimmings','Quality','Made too much','Other'];
  let timer, toastTimer;
  const blankProfile = section => ({ section, recognised: { name: true, waste: false, section: false, followup: false }, checked: false, declaration: '', sectionSavedAs: '', followup: false, followupSavedAs: '', others: {}, records: [], pocket: false, hidden: false, receipt: null, draft: { item: '', amount: '', unit: '', reason: '', section } });
  const state = { person: 'cook', device: 'phone', page: 'prep', cardOpen: false, demoOpen: false, failNext: false, large: false, pending: null, error: null, epoch: 0, profiles: { cook: blankProfile('Larder'), chef: blankProfile('Grill') } };
  const profile = () => state.profiles[state.person];
  const currentPerson = () => people[state.person];
  const busy = () => Boolean(state.pending);
  const action = (name, label, classes = 'btn', extra = '') => `<button type="button" class="${classes}" data-action="${name}"${busy() ? ' disabled' : ''} ${extra}>${label}</button>`;
  const nav = classes => `<nav class="${classes}" aria-label="Kitchen navigation">${destinations.map(([page,label,symbol]) => `<button type="button" data-action="navigate" data-page="${page}"${busy() ? ' disabled' : ''}${(state.page === 'waste-saved' ? 'waste' : state.page) === page ? ' aria-current="page"' : ''}>${classes === 'book-nav' ? icon(symbol,21) : ''}<span>${label}</span>${!['prep','waste'].includes(page) ? '<span class="sr-only">, preview only</span>' : ''}</button>`).join('')}</nav>`;

  function render(focusId) {
    const person = currentPerson();
    root.innerHTML = `<div class="preview-note">A · Shift Card · Design study with example data only</div>
      <header class="book-header"><a class="book-brand" href="#" data-action="home"><img src="../../icon.svg" alt=""><span><small>Leichhardt Hotel</small><strong>Kitchen Book</strong></span></a>${action('pings-preview',icon('bell',22),'a-header-control','aria-label="Shift pings, preview only"')}</header>
      <main class="a-page${state.large ? ' a-large-text' : ''}" id="a-main" tabindex="-1">
        ${nav('a-desktop-nav')}
        ${!person ? signedOut() : state.page === 'prep' ? prep() : state.page === 'waste' ? waste() : state.page === 'waste-saved' ? wasteReceipt() : state.page === 'pocket' ? pocket() : previewDestination()}
        ${demoControls()}
        <footer class="a-page-footer"><strong>A / SHIFT CARD</strong><span>Example only · No live saves or tracking</span></footer>
      </main>${nav('book-nav')}`;
    if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
  }

  function heading(title, kicker, buttonHTML = '', note = '') {
    return `<header class="a-heading"><div><span class="eyebrow">${kicker}</span><h1 id="a-title" tabindex="-1">${title}</h1>${note ? `<p>${note}</p>` : ''}</div>${buttonHTML}</header>`;
  }

  function identity() {
    const person = currentPerson();
    return `<div class="a-identity"><div class="a-person">${icon('user',23)}<div><strong>${person.name}</strong><small>${person.section} · Example name selected</small></div></div>${action('change-person','Change person','quiet')}</div>`;
  }

  function prep() {
    const p = profile(), person = currentPerson();
    const next = !p.checked ? `A quick check of ${person.section}.` : !p.followup ? 'One prep follow-up to finish.' : 'The useful details are recorded.';
    return `${heading('Prep list','TODAY · EXAMPLE WORK',action('log-waste',`${icon('plus',16)} Log waste`,'btn primary'))}
      <section class="a-personal" aria-label="Your name and next step">${identity()}${!p.hidden ? `<button type="button" class="a-shift-strip" data-action="toggle-card" aria-expanded="${state.cardOpen}" aria-controls="a-shift-card"${busy() ? ' disabled' : ''}>${icon('leaf',23)}<span><span class="eyebrow">YOUR NEXT STEP</span><strong>${next}</strong></span>${icon('chevron',17)}</button>` : ''}</section>
      ${!p.hidden && state.cardOpen ? shiftCard() : ''}
      <div class="a-workspace${p.hidden ? ' a-no-encouragement' : ''}"><section aria-labelledby="a-work-heading"><div class="a-list-heading"><h2 id="a-work-heading">${person.section}</h2><span>Current prep</span></div>
        <ul class="a-prep-list">
          ${prepRow('followup','Example prep follow-up','Check the next prep batch with Example chef.',p.followup,'FROM EXAMPLE CHEF')}
          ${prepRow('set-up',`Set up ${person.section}`,'Example prep task. Use the working list as usual.',Boolean(p.others['set-up']))}
          ${prepRow('list-check','Check the prep list','Example prep task for this section.',Boolean(p.others['list-check']))}
        </ul>
        ${state.error && ['followup','other'].includes(state.error.kind) ? errorBox() : ''}
        <div class="a-list-foot"><span>Example work list</span><span>Useful work comes first.</span></div>
      </section></div>`;
  }

  function prepRow(id, title, note, done, kicker) {
    const isFollowup = id === 'followup', saving = state.pending && (state.pending.kind === 'followup' && isFollowup || state.pending.kind === 'other' && state.pending.payload.id === id);
    return `<li class="a-prep-row${done ? ' is-done' : ''}" id="a-task-${id}"><button type="button" class="a-prep-check" role="checkbox" aria-checked="${done}" aria-label="${esc(title)}" data-action="${isFollowup ? 'followup' : 'other-task'}" data-id="${id}"${busy() || done ? ' disabled' : ''}>${done ? icon('check',22) : '<span aria-hidden="true"></span>'}</button><div class="a-prep-copy">${kicker ? `<span class="eyebrow">${kicker}</span>` : ''}<h3 tabindex="-1">${title}</h3><p>${note}</p>${saving ? '<p class="a-pending" role="status">Saving this task…</p>' : done && isFollowup ? `<span class="a-prep-receipt">${icon('check',14)} Follow-up recorded. Saved as ${esc(profile().followupSavedAs)}.</span>` : done ? '<span class="a-prep-receipt">Task recorded.</span>' : ''}</div></li>`;
  }

  function shiftCard() {
    const p = profile(), person = currentPerson();
    return `<section class="a-shift-expanded" id="a-shift-card" aria-labelledby="a-card-title"><div class="a-card-head"><div><span class="eyebrow">MY SHIFT CARD</span><h2 id="a-card-title">One useful thing at a time.</h2></div>${action('hide-encouragement','Hide encouragement','quiet')}</div>
      <div class="a-recognition" aria-label="Your recorded progress">
        ${recognition('Your name','Selected',p.recognised.name)}${recognition('My section check',p.checked ? 'Recorded' : 'Open',p.recognised.section)}${recognition('Prep follow-up',p.followup ? 'Recorded' : 'To do',p.recognised.followup)}
      </div><div class="a-card-action-grid"><div><h3>My section check</h3>${p.checked ? `<div class="a-section-receipt" id="a-section-status" data-section-state="checked"><span>${icon('check',17)} Your section check is recorded.</span><small>Saved as ${esc(p.sectionSavedAs)}</small><p class="hint">${p.declaration === 'nothing' ? 'You chose “Checked; nothing to add”.' : 'You explicitly finished your check after logging.'}</p></div>` : `<p class="hint">Anything from ${person.section} to add to the wastage log?</p><div class="a-check-actions">${action('log-from-check',`${icon('plus',16)} Log something`,'btn dark')}${action('check-nothing','Checked; nothing to add','btn')}</div><span id="a-section-status" class="sr-only" data-section-state="open">Section check not yet recorded</span>`}
      ${state.pending && state.pending.kind === 'section' ? '<p class="a-pending" role="status">Saving your section check…</p>' : ''}${state.error?.kind === 'section' ? errorBox() : ''}
      <p class="a-check-footnote">Your declaration only. It does not mean zero waste, that all waste was captured, or that a chef approved the section.</p></div>
      <div class="a-pocket-mini"><h3>Pocket book <span class="muted">(optional)</span></h3><p class="hint">A shortcut to the book, with your own name selected.</p>${action('pocket',p.pocket ? `View example setup ${icon('arrow',15)}` : `See the setup ${icon('arrow',15)}`,'quiet')}${action('not-now-pocket','Not now','quiet')}<p class="a-check-footnote">Example setup only. No installation or phone ownership is verified.</p></div></div></section>`;
  }

  function recognition(title, value, recognised) {
    return `<div class="${recognised ? 'recognised' : ''}">${icon(recognised ? 'check' : 'leaf',20)}<span><strong>${title}</strong><small>${value}</small></span></div>`;
  }

  function waste() {
    const p = profile(), d = p.draft;
    const selected = (value, current) => value === current ? ' selected' : '';
    return `${action('back-prep',`${icon('arrow',16)} Back to prep`,'quiet a-back')}${heading('Log waste','WASTAGE · EXAMPLE FORM','',`${currentPerson().name} · ${currentPerson().section}`)}
      <div class="a-form-layout"><form class="a-waste-form" id="a-waste-form" novalidate><fieldset${busy() ? ' disabled' : ''}><label class="field"><span>Item <span class="muted">(required)</span></span><input id="a-item" data-field="item" name="item" value="${esc(d.item)}" maxlength="160" required autocomplete="off" placeholder="e.g. Carrot trimmings"></label>
        <div class="a-amount-fields"><label class="field"><span>Amount <span class="muted">(required)</span></span><input id="a-amount" data-field="amount" name="amount" type="number" inputmode="decimal" min="0" step="any" value="${esc(d.amount)}" required placeholder="e.g. 0.3"></label><label class="field"><span>Unit <span class="muted">(required)</span></span><select id="a-unit" data-field="unit" name="unit" required><option value="">Choose unit</option>${units.map(unit=>`<option value="${unit}"${selected(unit,d.unit)}>${unit}</option>`).join('')}</select></label></div>
        <label class="field"><span>Reason <span class="muted">(required)</span></span><select id="a-reason" data-field="reason" name="reason" required><option value="">Choose reason</option>${reasons.map(reason=>`<option value="${reason}"${selected(reason,d.reason)}>${reason}</option>`).join('')}</select></label>
        <label class="field"><span>Section <span class="muted">(when known)</span></span><select id="a-section" data-field="section" name="section"><option value="">Not set</option>${['Larder','Grill','Dessert'].map(section=>`<option value="${section}"${selected(section,d.section)}>${section}</option>`).join('')}</select><small>Filled from the selected example section. Easy to change.</small></label></fieldset>
        ${state.error?.kind === 'waste' ? errorBox(false) : ''}${state.pending?.kind === 'waste' ? '<p class="a-pending" role="status">Saving the entry. It is not recorded yet.</p>' : ''}
        <div class="a-form-actions"><button type="submit" class="btn primary" id="a-save-waste"${busy() ? ' disabled' : ''}>${icon('check',18)} ${busy() ? 'Saving…' : state.error?.kind === 'waste' && state.error.retry ? 'Try saving again' : 'Save waste entry'}</button></div>
        <p class="hint">Example only. A waste entry does not automatically finish your section check.</p></form><aside class="a-work-note"><span class="eyebrow">USEFUL DETAILS</span><h2>A clear entry is enough.</h2><p>Item, amount, unit and reason make this entry useful to read later.</p><p>Recognition is for useful details, once in this example context. Extra entries and larger amounts earn nothing extra.</p></aside></div>`;
  }

  function wasteReceipt() {
    const p = profile(), r = p.receipt;
    if (!r) { state.page = 'waste'; return waste(); }
    return `${action('back-prep',`${icon('arrow',16)} Back to prep`,'quiet a-back')}${heading('Entry recorded','WASTAGE · EXAMPLE RECEIPT')}
      <section class="a-receipt"><div class="a-receipt-mark">${icon('check',27)}</div><h2>${r.recognition ? 'Useful details, clearly recorded.' : 'The example entry is saved.'}</h2><p class="a-saved-as">Saved as <strong>${esc(r.savedAs)}</strong></p><p class="hint">${r.recognition ? 'Thanks for including the item, amount, unit and reason.' : 'This context already received its quiet acknowledgement. No extra recognition is added.'}</p><dl class="a-receipt-data">${[['Item',r.item],['Amount',`${r.amount} ${r.unit}`],['Reason',r.reason],['Section',r.section || 'Not set']].map(([key,value])=>`<div><dt>${key}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>
      ${!p.checked ? `<div class="a-finish-check"><h3>Your section check is still open.</h3><p>A saved entry does not check the whole section. You can explicitly finish your own check when ready.</p>${action('finish-check','Finish my section check','btn dark')}${state.pending?.kind === 'section' ? '<p class="a-pending" role="status">Saving your section check…</p>' : ''}${state.error?.kind === 'section' ? errorBox() : ''}</div>` : `<div class="status"><strong>Your section check is recorded separately.</strong><p class="hint">Your declaration does not confirm zero waste or a chef’s approval.</p></div>`}
      <div class="row">${action('back-prep','Return to prep','btn')}${action('new-waste','Log another item','quiet')}</div></section>`;
  }

  function pocket() {
    return `${action('back-card',`${icon('arrow',16)} Back to my shift card`,'quiet a-back')}${heading('Pocket book','OPTIONAL · EXAMPLE SETUP')}<section class="a-setup"><p>Keep a shortcut to the Kitchen Book and use your own name when you open it.</p><ol><li>Open your browser’s Share or menu.</li><li>Choose Add to Home Screen, when available.</li><li>Open the book and select your own name.</li></ol><p class="hint">Example only. This preview does not install the app, collect a PIN or verify who owns a phone.</p>${profile().pocket ? '<div class="status" role="status">Example setup marked done. This is not an installation check.</div>' : `<div class="row">${action('complete-pocket','Mark example setup done','btn primary')}${action('not-now-pocket','Not now','quiet')}</div>`}${state.pending?.kind === 'pocket' ? '<p class="a-pending" role="status">Saving the example setup mark…</p>' : ''}${state.error?.kind === 'pocket' ? errorBox() : ''}</section>`;
  }

  function signedOut() {
    return `<section class="a-sign-in"><span class="eyebrow">SIMULATED NAME SELECTION</span><h1 id="a-title" tabindex="-1">Whose book is this?</h1><p>Select an example name to open the example work list.</p><p class="hint">The real app uses its normal personal session. This preview collects no PIN and makes no identity or attendance claim.</p>${action('change-person',`${icon('user',18)} Choose example name`,'btn dark')}</section>`;
  }

  function previewDestination() {
    const name = destinations.find(([key])=>key===state.page)?.[1] || 'Kitchen Book';
    return `${heading(name,'PREVIEW-ONLY DESTINATION')}<section class="a-sign-in"><h2>The existing ${name.toLowerCase()} page would open here.</h2><p class="hint">This design study includes working example Prep and Wastage flows only.</p>${action('back-prep','Return to example prep','btn dark')}</section>`;
  }

  function demoControls() {
    return `<details class="a-demo"${state.demoOpen ? ' open' : ''}><summary><span>Preview controls · outside the app</span>${icon('chevron',15)}</summary><div class="a-demo-panel"><div class="row"><strong>Example device</strong>${action('device','My phone','pill',`data-value="phone" aria-pressed="${state.device==='phone'}"`)}${action('device','Shared screen','pill',`data-value="shared" aria-pressed="${state.device==='shared'}"`)}</div><div class="row"><label for="a-next-save"><strong>Next save</strong></label><select id="a-next-save"${busy()?' disabled':''}><option value="ok"${!state.failNext?' selected':''}>Acknowledged success</option><option value="fail"${state.failNext?' selected':''}>Connection failure</option></select></div><div class="row">${action('change-person','Simulate another name','quiet')}${action('clear-person','Simulate no person','quiet')}${action('large-text',state.large?'Standard text':'Larger text','quiet')}${action('reset','Reset preview','btn')}</div><p>All names and work are synthetic. My phone and Shared screen use the same named example session and the same capped recognition. A selected name does not establish the physical actor, attendance or phone ownership. Saves, setup and declarations are simulated in memory only.</p></div></details>`;
  }

  function errorBox(retry = true) {
    const error = state.error;
    return `<div class="error a-status-inline" role="alert"><strong>Not recorded.</strong><p class="hint">${esc(error.message)}</p>${retry && error.retry ? action('retry','Try again','quiet') : ''}</div>`;
  }

  function navigate(page) {
    if (busy()) return;
    state.page = page; state.error = null;
    render('a-title');window.scrollTo(0,0);
  }

  function validateWaste(d) {
    if (!d.item.trim()) return ['item','Enter the item you are recording.'];
    if (!Number.isFinite(Number(d.amount)) || Number(d.amount)<=0) return ['amount','Enter an amount greater than 0.'];
    if (!units.includes(d.unit)) return ['unit','Choose a unit for the amount.'];
    if (!reasons.includes(d.reason)) return ['reason','Choose the reason for this entry.'];
    return null;
  }

  function save(kind, payload = {}) {
    if (busy() || !state.person) return;
    const p = profile();
    if (kind === 'followup' && p.followup || kind === 'section' && p.checked || kind === 'pocket' && p.pocket || kind === 'other' && p.others[payload.id]) return;
    const token = state.epoch, personId = state.person, savedAs = currentPerson().name, fail = state.failNext;
    state.failNext = false; state.error = null; state.pending = { kind, payload };render();
    timer = setTimeout(()=>{
      if (token!==state.epoch || personId!==state.person) return;
      state.pending = null;
      if (fail) {
        state.error = { kind, payload, retry: true, message: kind === 'waste' ? 'The example connection failed. Your details are kept. Nothing was saved. Try again when ready.' : 'The example connection failed. This action has not been saved. Try again when ready.' };
        render(kind === 'waste' ? 'a-save-waste' : undefined);return;
      }
      if (kind === 'waste') {
        const record = { ...payload, savedAs, recognition: !p.recognised.waste };
        p.records.push(record);p.receipt=record;p.recognised.waste=true;
        p.draft={ item:'',amount:'',unit:'',reason:'',section:p.section };state.page='waste-saved';render('a-title');window.scrollTo(0,0);
      } else if (kind === 'section') {
        p.checked=true;p.declaration=payload.declaration;p.sectionSavedAs=savedAs;p.recognised.section=true;
        if(state.page!=='waste-saved'){state.page='prep';state.cardOpen=true;}
        render();announce('Your section check is recorded. Saved as '+savedAs+'.');
      } else if (kind === 'followup') {
        p.followup=true;p.followupSavedAs=savedAs;p.recognised.followup=true;render();announce('Follow-up recorded. Saved as '+savedAs+'.');
      } else if (kind === 'other') {p.others[payload.id]=true;render();announce('Example prep task recorded.');}
      else if (kind === 'pocket') {p.pocket=true;render();announce('Example setup marked done. No installation was checked.');}
    },750);
  }

  function clearAnnouncement() { clearTimeout(toastTimer); document.getElementById('a-toast')?.remove(); }

  function announce(message) {
    let el=document.getElementById('a-toast');
    if(!el){el=document.createElement('div');el.id='a-toast';el.className='a-toast';el.setAttribute('role','status');document.body.append(el);}
    el.textContent=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.remove(),3800);
  }

  function changeIdentity(next) {
    clearAnnouncement();
    if (next !== state.person) {
      clearTimeout(timer);state.epoch++;state.pending=null;
      if (state.person) state.profiles[state.person]=blankProfile(people[state.person].section);
      if (next) state.profiles[next]=blankProfile(people[next].section);
    }
    state.person=next;state.page='prep';state.error=null;state.cardOpen=false;
    render('a-title');window.scrollTo(0,0);
  }

  function openPerson() {
    if(busy()) return;
    const previous=document.activeElement, overlay=document.createElement('div');overlay.className='a-dialog-backdrop';
    overlay.innerHTML=`<section class="a-dialog" role="dialog" aria-modal="true" aria-labelledby="a-person-title"><div class="a-dialog-top"><span class="eyebrow">EXAMPLE NAME SELECTION</span><button type="button" class="quiet" data-close-person aria-label="Close">${icon('close',21)}</button></div><h2 id="a-person-title" tabindex="-1">Use your own name.</h2><p class="hint">Choose a synthetic person for this preview. No PIN is collected. Selection does not prove who is holding the screen.</p><div class="a-person-picks">${Object.entries(people).map(([id,person])=>`<button type="button" class="btn" data-pick-person="${id}"><span>${person.name}<small>${person.section}</small></span>${icon(state.person===id?'check':'arrow',18)}</button>`).join('')}</div><button type="button" class="quiet" data-pick-person="none">No person selected</button></section>`;
    document.body.append(overlay);
    function close(restore=true){overlay.remove();document.removeEventListener('keydown',keyHandler);if(restore)previous?.focus();}
    function keyHandler(event){if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){const buttons=Array.from(overlay.querySelectorAll('button'));const first=buttons[0],last=buttons.at(-1);if(!buttons.includes(document.activeElement)){event.preventDefault();(event.shiftKey?last:first).focus();}else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}}
    overlay.addEventListener('click',event=>{if(event.target===overlay||event.target.closest('[data-close-person]'))close();const pick=event.target.closest('[data-pick-person]');if(pick){const id=pick.dataset.pickPerson;close(false);changeIdentity(people[id]?id:null);}});
    document.addEventListener('keydown',keyHandler);overlay.querySelector('h2').focus();
  }

  root.addEventListener('click',event=>{
    const button=event.target.closest('[data-action]');if(!button||!root.contains(button))return;
    event.preventDefault();if(busy())return;
    const type=button.dataset.action;
    if(type==='navigate')navigate(button.dataset.page);
    else if(type==='home'||type==='back-prep')navigate('prep');
    else if(type==='change-person')openPerson();
    else if(type==='clear-person')changeIdentity(null);
    else if(type==='pings-preview')announce('Shift pings is a preview-only destination in this study.');
    else if(type==='toggle-card'){state.cardOpen=!state.cardOpen;render();}
    else if(type==='hide-encouragement'){profile().hidden=true;state.cardOpen=false;render();announce('Encouragement hidden. Prep and the waste log stay available.');}
    else if(type==='log-waste'||type==='log-from-check'||type==='new-waste')navigate('waste');
    else if(type==='check-nothing')save('section',{declaration:'nothing'});
    else if(type==='finish-check')save('section',{declaration:'logged'});
    else if(type==='followup')save('followup');
    else if(type==='other-task')save('other',{id:button.dataset.id});
    else if(type==='pocket')navigate('pocket');
    else if(type==='back-card'||type==='not-now-pocket'){state.cardOpen=true;navigate('prep');if(type==='not-now-pocket')announce('No setup needed. Carry on with prep.');}
    else if(type==='complete-pocket')save('pocket');
    else if(type==='retry'&&state.error?.retry)save(state.error.kind,state.error.payload);
    else if(type==='device'){state.device=button.dataset.value;render();}
    else if(type==='large-text'){state.large=!state.large;render();}
    else if(type==='reset'){clearAnnouncement();clearTimeout(timer);state.epoch++;state.person='cook';state.device='phone';state.page='prep';state.cardOpen=false;state.error=null;state.pending=null;state.failNext=false;state.large=false;state.profiles={cook:blankProfile('Larder'),chef:blankProfile('Grill')};render('a-title');window.scrollTo(0,0);announce('The example has been reset.');}
  });
  root.addEventListener('input',event=>{const field=event.target.dataset.field;if(field&&state.person&&Object.hasOwn(profile().draft,field))profile().draft[field]=event.target.value;});
  root.addEventListener('change',event=>{if(event.target.id==='a-next-save')state.failNext=event.target.value==='fail';const field=event.target.dataset.field;if(field&&state.person&&Object.hasOwn(profile().draft,field))profile().draft[field]=event.target.value;});
  root.addEventListener('toggle',event=>{if(event.target.matches('.a-demo')&&root.contains(event.target))state.demoOpen=event.target.open;},true);
  root.addEventListener('submit',event=>{if(event.target.id!=='a-waste-form')return;event.preventDefault();if(busy())return;const d={...profile().draft,item:profile().draft.item.trim()},invalid=validateWaste(d);if(invalid){state.error={kind:'waste',retry:false,message:invalid[1]};render('a-'+invalid[0]);return;}save('waste',d);});
  render();
})();
