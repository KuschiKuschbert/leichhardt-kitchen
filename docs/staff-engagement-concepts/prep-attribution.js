/* Proposed workshop flow only. Synthetic names, sessions and records stay in RAM. */
(() => {
  'use strict';
  const root = document.getElementById('pa-root');
  const {esc,icon} = window.Study;
  const TODAY = '2026-11-01', TOMORROW = '2026-11-02';
  const staff = [{id:'alex',name:'Alex',active:true},{id:'jamie',name:'Jamie',active:true},{id:'sam',name:'Sam',active:true},{id:'taylor',name:'Taylor',active:true},{id:'casey',name:'Casey',active:true},{id:'morgan',name:'Morgan',active:false}];
  const active = () => staff.filter(person=>person.active);
  const name = id => staff.find(person=>person.id===id)?.name || 'Unknown example';
  const destinations = [['recipes','Recipes','book'],['prep','Prep','prep'],['orders','Orders','prep'],['waste','Wastage','waste'],['transfers','Transfers','arrow']];
  const newItems = () => ({
    [TODAY]: [{id:'onions',text:'Slice onions',qty:'2 tubs',section:'Larder',urgent:true},{id:'carrots',text:'Prep carrots',qty:'1 kg',section:'Larder'},{id:'leaves',text:'Portion salad leaves',qty:'1 tub',section:'Larder'},{id:'dressing',text:'Mix house dressing',qty:'500 mL',section:'Larder'},{id:'grill',text:'Portion grill prep',qty:'12 portions',section:'Grill'},{id:'dessert',text:'Set up dessert prep',qty:'1 tray',section:'Dessert'}],
    [TOMORROW]: [{id:'tom-onions',text:'Slice onions',qty:'1 tub',section:'Larder'},{id:'tom-carrots',text:'Prep carrots',qty:'2 kg',section:'Larder'}],
    functions: [{id:'fn-salad',text:'Salad prep',qty:'2 tubs',section:'Larder'},{id:'fn-grill',text:'Grill prep',qty:'20 portions',section:'Grill'}]
  });
  const state = {mode:'shared',recorder:'alex',recent:[{id:'alex',sequence:2,time:'10:10'},{id:'jamie',sequence:1,time:'09:20'}],sequence:2,page:'prep',date:TODAY,list:'date',section:'Larder',items:newItems(),picking:null,others:false,addOpen:false,doneOpen:true,sessionOpen:false,sessionChoice:'sam',receipt:'',addDraft:{text:'',qty:'',section:'Larder'},wasteDraft:{item:'',amount:'',unit:'',reason:'',section:'Larder',action:''},wasteRecords:[],error:'',counter:0};
  const dayKey = () => state.list==='functions' ? 'functions' : state.date;
  const list = () => state.items[dayKey()] || [];
  const button = (action,label,cls='btn',attrs='') => `<button type="button" class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
  const nav = cls => `<nav class="${cls}" aria-label="Kitchen navigation">${destinations.map(([id,label,symbol])=>button('navigate',`${cls==='book-nav'?icon(symbol,21):''}<span>${label}</span>${!['prep','waste'].includes(id)?'<span class="sr-only">, preview only</span>':''}`,'',`data-page="${id}"${state.page===id?' aria-current="page"':''}`)).join('')}</nav>`;
  const selected = (value,current) => value===current?' selected':'';

  function render(focusId) {
    root.innerHTML=`<aside aria-label="Outside-app preview controls"><div class="preview-note">Proposed flow · All names and records are examples · No real sign-in or saves</div><div class="pa-mode-controls"><span>Preview mode</span><div class="pa-mode-options" role="group" aria-label="Example device mode">${button('mode',`${icon('team',15)} Shared screen`,'pill',`data-mode="shared" aria-pressed="${state.mode==='shared'}"`)}${button('mode',`${icon('phone',15)} My phone`,'pill',`data-mode="phone" aria-pressed="${state.mode==='phone'}"`)}</div>${button('reset','Reset demo','quiet')}</div></aside>
      <header class="book-header"><a class="book-brand" href="#" data-action="home"><img src="../../icon.svg" alt=""><span><small>Leichhardt Hotel</small><strong>Kitchen Book</strong></span></a><div class="pa-top-user"><span>${name(state.recorder)}</span>${button('session-controls',icon('user',21),'',`aria-label="Example session: ${name(state.recorder)}"`)}</div></header>
      <main class="pa-app" id="pa-main" tabindex="-1">${nav('pa-desktop-nav')}${state.page==='prep'?prep():state.page==='waste'?waste():preview()}
        <footer class="pa-demo-footer"><details class="pa-session-demo"${state.sessionOpen?' open':''}><summary>Example sign-ins and session controls</summary><p>Only this simulated successful sign-in changes the names shown first. Selecting a doer in the prep sheet does not sign that person in or change the recorder.</p><div class="row"><label class="sr-only" for="pa-sim-person">Example person to sign in</label><select id="pa-sim-person">${active().map(person=>`<option value="${person.id}"${selected(person.id,state.sessionChoice)}>${person.name}</option>`).join('')}</select>${button('simulate-signin','Simulate successful sign-in','btn')}</div><p>Signed in on this example device today: ${state.recent.slice().sort((a,b)=>b.sequence-a.sequence).map(person=>`${name(person.id)} (${person.time})`).join(', ')}.</p></details><p>This is a reduced synthetic sample, not a replacement for the normal sheets. The proposed separation of doer and recorder would need an agreed production data and permission design. The current app is unchanged. No names, sign-ins or work are sent or stored.</p><div class="pa-demo-links"><a href="https://kuschikuschbert.github.io/leichhardt-kitchen/#/prep" target="_blank" rel="noopener">Current live Prep ↗</a><a href="https://kuschikuschbert.github.io/leichhardt-kitchen/#/waste" target="_blank" rel="noopener">Current live Wastage ↗</a><a href="encouragement.html">Earlier encouragement concepts</a></div></footer>
      </main>${nav('book-nav')}`;
    if(focusId)document.getElementById(focusId)?.focus({preventScroll:true});
  }

  function title(text,action='') { return `<header class="pa-title"><div><span class="eyebrow">LEICHHARDT KITCHEN</span><h1 id="pa-title" tabindex="-1">${text}</h1></div>${action}</header>`; }
  function prep() {
    const rows=list().filter(item=>!state.section||item.section===state.section),open=rows.filter(item=>!item.done),done=rows.filter(item=>item.done);
    return `${title('Prep list',button('toggle-add',`${icon('plus',17)} Add`,'btn primary',`aria-expanded="${state.addOpen}" aria-controls="pa-add"`))}
      <div class="pa-sheet-tools"><div class="pa-date-tabs" aria-label="Prep list">${button('today','Today','pill',`aria-pressed="${state.list==='date'&&state.date===TODAY}"`)}${button('tomorrow','Tomorrow','pill',`aria-pressed="${state.list==='date'&&state.date===TOMORROW}"`)}${button('functions','Functions','pill',`aria-pressed="${state.list==='functions'}"`)}</div><label class="pa-date">${state.list==='functions'?'Example function':'List date'}<input type="date" id="pa-date" aria-label="Prep list date" value="${esc(state.date)}"></label></div>
      <div class="pa-section-row"><label class="pa-section-filter">Section<select id="pa-section"><option value="">All sections</option>${['Larder','Grill','Dessert'].map(section=>`<option value="${section}"${selected(section,state.section)}>${section}</option>`).join('')}</select></label><div class="pa-session-label">Current name: <strong>${name(state.recorder)}</strong><br>${state.mode==='shared'?'Choose the doer when ticking.':'Ticks use your current name.'}</div></div>
      ${state.addOpen?addForm():''}${state.receipt?`<p class="pa-receipt" role="status">${esc(state.receipt)}</p>`:''}
      <section class="pa-sheet" aria-label="Open prep items"><div class="pa-list-head"><span>Done</span><span>Prep item</span><span>Quantity</span></div><ul class="pa-rows">${open.map(item=>`<li class="pa-row" data-item="${item.id}"><div class="pa-row-main"><button type="button" class="pa-tick" id="pa-tick-${item.id}" data-action="tick" data-id="${item.id}" role="checkbox" aria-checked="false" aria-label="Mark ${esc(item.text)} done" aria-expanded="${state.picking?.id===item.id}" aria-controls="pa-picker-${item.id}"><span aria-hidden="true"></span></button><div><h2 class="pa-item-title">${esc(item.text)}</h2><span class="pa-item-section">${item.urgent?'<span class="pa-urgent">Priority</span>':''}${esc(item.section)}</span></div><span class="pa-qty">${esc(item.qty||'To come')}</span></div>${state.picking?.id===item.id?picker(item):''}</li>`).join('')}</ul>${!open.length?'<p class="pa-empty">No open example items in this view. Use Add or choose another section or date.</p>':''}</section>
      <details class="pa-done"${state.doneOpen?' open':''}><summary id="pa-done-summary"><span>${state.list==='date'&&state.date===TODAY?'Done today':'Done on this list'} <small>${done.length} ${done.length===1?'item':'items'}</small></span>${icon('chevron',17)}</summary>${done.length?done.map(item=>`<article class="pa-done-row" data-done-item="${item.id}" data-doer="${item.doer}" data-recorder="${item.recordedBy}">${icon('check',20)}<div class="pa-done-copy"><strong>${esc(item.text)} · ${esc(item.qty||'To come')}</strong><p>Done by <b>${name(item.doer)}</b><br>Recorded by ${name(item.recordedBy)} · ${item.recordedAt}</p></div>${button('undo','Undo','quiet',`data-id="${item.id}" aria-label="Undo example tick for ${esc(item.text)}"`)}</article>`).join(''):'<p class="pa-done-empty">Nothing ticked on this example list yet.</p>'}</details>`;
  }

  function picker(item) {
    const recent=state.recent.slice().sort((a,b)=>b.sequence-a.sequence).filter(entry=>active().some(person=>person.id===entry.id)),others=active().filter(person=>!recent.some(entry=>entry.id===person.id));
    const choice=(person,isRecent)=>button('choose-doer',esc(person.name),'pa-name',`data-person="${person.id}" data-name-group="${isRecent?'recent':'others'}"`);
    return `<fieldset class="pa-picker" id="pa-picker-${item.id}" aria-describedby="pa-picker-help-${item.id}"><legend id="pa-picker-title-${item.id}" tabindex="-1">Who did this?</legend><div class="pa-picker-content"><p id="pa-picker-help-${item.id}">Signed in on this screen today, most recent first.</p><div class="pa-names" data-recent-names>${recent.map(entry=>choice(active().find(person=>person.id===entry.id),true)).join('')}</div><div class="pa-picker-footer">${others.length?button('others','Others…','quiet',`aria-expanded="${state.others}" aria-controls="pa-other-names-${item.id}"`):''}${button('cancel-picker','Cancel','quiet')}</div>${state.others?`<div class="pa-others" id="pa-other-names-${item.id}"><p class="pa-other-label">Other active people. Selecting a name does not sign them in.</p><div class="pa-names">${others.map(person=>choice(person,false)).join('')}</div></div>`:''}</div></fieldset>`;
  }

  function addForm() {
    const d=state.addDraft;
    return `<section class="pa-add" id="pa-add"><h2>Add prep</h2><form id="pa-add-form"><div class="pa-add-fields"><label class="field"><span>Item</span><input id="pa-add-text" name="text" data-add-field="text" value="${esc(d.text)}" maxlength="160" required autocomplete="off" placeholder="What needs doing?"></label><label class="field"><span>Quantity</span><input name="qty" data-add-field="qty" value="${esc(d.qty)}" maxlength="60" placeholder="e.g. 1 tub"></label><label class="field"><span>Section</span><select name="section" data-add-field="section">${['Larder','Grill','Dessert'].map(section=>`<option${selected(section,d.section)}>${section}</option>`).join('')}</select></label></div><div class="pa-add-actions"><button class="btn primary" type="submit">Add item</button>${button('cancel-add','Cancel','quiet')}</div></form></section>`;
  }

  function waste() {
    const d=state.wasteDraft;
    return `${title('Wastage',button('navigate','Prep list','btn','data-page="prep"'))}<section class="pa-waste"><form id="pa-waste-form" novalidate><label class="field"><span>Item</span><input id="pa-waste-item" data-waste-field="item" name="item" value="${esc(d.item)}" required maxlength="160" placeholder="e.g. Carrot trimmings"></label><div class="pa-waste-pair"><label class="field"><span>Amount</span><input id="pa-waste-amount" data-waste-field="amount" name="amount" type="number" min="0" step="any" value="${esc(d.amount)}" required inputmode="decimal"></label><label class="field"><span>Unit</span><select id="pa-waste-unit" data-waste-field="unit" name="unit" required><option value="">Choose unit</option>${['kg','g','L','mL','each'].map(unit=>`<option${selected(unit,d.unit)}>${unit}</option>`).join('')}</select></label></div><label class="field"><span>Reason</span><select id="pa-waste-reason" data-waste-field="reason" name="reason" required><option value="">Choose reason</option>${['Prep trimmings','Quality','Made too much','Other'].map(reason=>`<option${selected(reason,d.reason)}>${reason}</option>`).join('')}</select></label><label class="field"><span>Section</span><select data-waste-field="section" name="section">${['Larder','Grill','Dessert'].map(section=>`<option${selected(section,d.section)}>${section}</option>`).join('')}</select></label><label class="field"><span>Action <span class="muted">(optional)</span></span><textarea data-waste-field="action" name="action" rows="2" maxlength="300">${esc(d.action)}</textarea></label>${state.error?`<p class="error" role="alert">${esc(state.error)}</p>`:''}<p class="hint">Recorded as ${name(state.recorder)}. This is a separate example waste entry.</p><div class="pa-waste-save"><button class="btn primary" type="submit">${icon('check',18)} Log waste</button></div></form><section class="pa-waste-records"><h2>Today’s log</h2>${state.wasteRecords.length?state.wasteRecords.map(record=>`<article class="pa-waste-record"><strong>${esc(record.item)} · ${esc(record.amount)} ${esc(record.unit)}</strong><p>${esc(record.reason)} · ${esc(record.section)}<br>Recorded by ${name(record.recordedBy)} · ${record.at}</p>${record.action?`<p>Action: ${esc(record.action)}</p>`:''}</article>`).join(''):'<p class="hint">No entries in this example log yet.</p>'}</section></section>`;
  }

  function preview() {const destination=destinations.find(([id])=>id===state.page)?.[1]||'Kitchen Book';return `${title(destination)}<section class="pa-preview-only"><h2>Preview-only destination</h2><p>The normal ${destination.toLowerCase()} page stays available in the real book. This focused example includes working Prep and Wastage sheets.</p><div class="row">${button('navigate','Back to prep','btn dark','data-page="prep"')}${button('navigate','Open Wastage','btn','data-page="waste"')}</div></section>`;}

  function cancelPicker(focus=true) {const id=state.picking?.id;state.picking=null;state.others=false;render(focus&&id?'pa-tick-'+id:undefined);}
  function complete(id,doer,recordedBy) {
    const item=list().find(entry=>entry.id===id);if(!item||item.done||!active().some(person=>person.id===doer)||!active().some(person=>person.id===recordedBy))return;
    item.done=true;item.doer=doer;item.recordedBy=recordedBy;item.recordedAt='10:25';state.picking=null;state.others=false;
    state.receipt=`${item.text}: done by ${name(doer)}. Recorded by ${name(recordedBy)}.`;const next=list().find(entry=>!entry.done&&(!state.section||entry.section===state.section));render(next?'pa-tick-'+next.id:'pa-done-summary');
  }
  function navigate(page) {state.page=page;state.picking=null;state.others=false;state.receipt='';state.error='';render('pa-title');window.scrollTo(0,0);}
  function reset() {state.mode='shared';state.recorder='alex';state.recent=[{id:'alex',sequence:2,time:'10:10'},{id:'jamie',sequence:1,time:'09:20'}];state.sequence=2;state.page='prep';state.date=TODAY;state.list='date';state.section='Larder';state.items=newItems();state.picking=null;state.others=false;state.addOpen=false;state.doneOpen=true;state.receipt='';state.error='';state.addDraft={text:'',qty:'',section:'Larder'};state.wasteDraft={item:'',amount:'',unit:'',reason:'',section:'Larder',action:''};state.wasteRecords=[];render('pa-title');window.scrollTo(0,0);}

  root.addEventListener('click',event=>{
    const target=event.target.closest('[data-action]');
    if(!target){if(state.picking&&!event.target.closest('.pa-picker,input,select,label,summary,a'))cancelPicker();return;}
    event.preventDefault();const action=target.dataset.action;
    if(action==='navigate')navigate(target.dataset.page);
    else if(action==='home')navigate('prep');
    else if(action==='mode'){state.mode=target.dataset.mode==='phone'?'phone':'shared';state.picking=null;state.others=false;state.receipt='';render();}
    else if(action==='reset')reset();
    else if(action==='tick'){
      const item=list().find(entry=>entry.id===target.dataset.id);if(!item||item.done)return;
      if(state.mode==='phone')complete(item.id,state.recorder,state.recorder);
      else if(state.picking?.id===item.id)cancelPicker();
      else{state.picking={id:item.id,recorder:state.recorder};state.others=false;state.receipt='';render('pa-picker-title-'+item.id);document.getElementById('pa-picker-'+item.id)?.scrollIntoView({block:'nearest'});}
    }
    else if(action==='choose-doer'&&state.picking)complete(state.picking.id,target.dataset.person,state.picking.recorder);
    else if(action==='others'){state.others=!state.others;render();if(state.others){root.querySelector('[data-name-group="others"]')?.focus({preventScroll:true});root.querySelector('.pa-others')?.scrollIntoView({block:'nearest'});}}
    else if(action==='cancel-picker')cancelPicker();
    else if(action==='undo'){const item=list().find(entry=>entry.id===target.dataset.id);if(item){item.done=false;delete item.doer;delete item.recordedBy;delete item.recordedAt;state.receipt='Example tick undone.';render('pa-tick-'+item.id);}}
    else if(['today','tomorrow','functions'].includes(action)){state.list=action==='functions'?'functions':'date';if(action==='today')state.date=TODAY;if(action==='tomorrow')state.date=TOMORROW;state.picking=null;state.others=false;state.receipt='';render();}
    else if(action==='toggle-add'){state.addOpen=!state.addOpen;state.picking=null;render(state.addOpen?'pa-add-text':undefined);}
    else if(action==='cancel-add'){state.addOpen=false;render();}
    else if(action==='session-controls'){state.sessionOpen=true;state.picking=null;render();root.querySelector('.pa-session-demo summary')?.focus();root.querySelector('.pa-session-demo')?.scrollIntoView({block:'center'});}
    else if(action==='simulate-signin'){
      if(!active().some(person=>person.id===state.sessionChoice))return;
      state.sequence++;state.recorder=state.sessionChoice;state.recent=state.recent.filter(entry=>entry.id!==state.recorder).concat({id:state.recorder,sequence:state.sequence,time:'10:25'});state.picking=null;state.others=false;state.receipt='';state.wasteDraft={item:'',amount:'',unit:'',reason:'',section:'Larder',action:''};render('pa-title');window.scrollTo(0,0);
    }
  });
  root.addEventListener('input',event=>{if(event.target.dataset.addField&&Object.hasOwn(state.addDraft,event.target.dataset.addField))state.addDraft[event.target.dataset.addField]=event.target.value;if(event.target.dataset.wasteField&&Object.hasOwn(state.wasteDraft,event.target.dataset.wasteField))state.wasteDraft[event.target.dataset.wasteField]=event.target.value;});
  root.addEventListener('change',event=>{
    const id=event.target.id;
    if(id==='pa-date'){state.date=event.target.value;state.list='date';state.picking=null;state.receipt='';render();}
    else if(id==='pa-section'){state.section=event.target.value;state.picking=null;state.receipt='';render();}
    else if(id==='pa-sim-person')state.sessionChoice=event.target.value;
    if(event.target.dataset.addField&&Object.hasOwn(state.addDraft,event.target.dataset.addField))state.addDraft[event.target.dataset.addField]=event.target.value;
    if(event.target.dataset.wasteField&&Object.hasOwn(state.wasteDraft,event.target.dataset.wasteField))state.wasteDraft[event.target.dataset.wasteField]=event.target.value;
  });
  root.addEventListener('submit',event=>{
    if(event.target.id==='pa-add-form'){event.preventDefault();const d=state.addDraft;if(!d.text.trim())return;const key=dayKey();if(!state.items[key])state.items[key]=[];state.items[key].push({id:'added-'+(++state.counter),text:d.text.trim(),qty:d.qty.trim(),section:d.section});state.addOpen=false;state.section=d.section;state.addDraft={text:'',qty:'',section:d.section};state.receipt='Prep item added to this example list.';render();}
    if(event.target.id==='pa-waste-form'){event.preventDefault();const d=state.wasteDraft;if(!d.item.trim()||!Number.isFinite(Number(d.amount))||Number(d.amount)<=0||!d.unit||!d.reason){state.error='Add an item, a positive amount, unit and reason.';render();return;}state.wasteRecords.unshift({...d,item:d.item.trim(),recordedBy:state.recorder,at:'10:25'});state.wasteDraft={item:'',amount:'',unit:'',reason:'',section:d.section,action:''};state.error='';state.receipt='';render();root.querySelector('.pa-waste-records')?.scrollIntoView({block:'center'});}
  });
  root.addEventListener('toggle',event=>{if(!root.contains(event.target))return;if(event.target.matches('.pa-done'))state.doneOpen=event.target.open;if(event.target.matches('.pa-session-demo'))state.sessionOpen=event.target.open;},true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&state.picking){event.preventDefault();cancelPicker();}});
  document.addEventListener('click',event=>{if(state.picking&&!event.composedPath().includes(root))cancelPicker();});
  render();
})();
