/* Standalone design exploration. Fictional jobs, days, people and completion records.
   Nothing is sent to the kitchen, persisted on this device or read from Firebase. */
(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  const design = ['a', 'b', 'c'].includes(params.get('design')) ? params.get('design') : 'a';
  const state = { role: params.get('role') === 'chef' ? 'chef' : 'staff', day: 2, view: 'today', section: 'Grill', feedback: '', undo: null, done: {}, focus: null };
  const names = { a: 'Week sheet', b: 'My section', c: 'Daily cleaning list' };
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const jobs = [
    { id: 'oven', title: 'Clean the oven', area: 'Oven', owner: 'Grill', days: [0,1,2,3,4,5,6] },
    { id: 'behind', title: 'Clean behind equipment', area: 'Behind equipment', owner: 'Grill', days: [2,6] },
    { id: 'fryers', title: 'Clean the fryers', area: 'Fryers', owner: 'Fryers', days: [0,2,4] },
    { id: 'pass', title: 'Clean the pass', area: 'Pass', owner: 'Pass', days: [0,1,2,3,4,5,6] },
    { id: 'coldroom', title: 'Clean coldroom shelves', area: 'Coldroom', owner: 'Prep', shared: true, days: [0,2,4] },
    { id: 'drystore', title: 'Clean dry store floor', area: 'Dry store', owner: 'Prep', shared: true, days: [2,5] },
    { id: 'freezer', title: 'Clean freezer storage', area: 'Freezer', owner: 'Prep', shared: true, days: [1,3] },
    { id: 'shelves', title: 'Clean kitchen shelves', area: 'Shelves', owner: 'Pass', shared: true, days: [1,4,6] }
  ];
  const iconPaths = {
    chef:'<path d="M7 14a5 5 0 0 1-1-10 6 6 0 0 1 12 0 5 5 0 0 1-1 10v6H7z"/><path d="M7 16h10"/>',
    bell:'<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5z"/><path d="M10 20h4"/>',
    recipes:'<path d="M4 4v7m3-7v7M2 8h7M5.5 11v10M15 4v8h5V4M17.5 12v9"/>',
    prep:'<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2M8 10l2 2 4-4M8 17h8"/>',
    orders:'<path d="m3 7 9-5 9 5v11l-9 5-9-5zM3 7l9 5 9-5M12 12v11M8 4l9 5"/>',
    waste:'<path d="M4 6h16M9 3h6M7 6l1 15h8l1-15M10 9v8M14 9v8"/>',
    transfers:'<path d="M3 7h17l-4-4M20 17H3l4 4M20 7l-4 4M3 17l4-4"/>',
    cleaning:'<path d="m14 3-5 9M5 11l9 5-4 6-8-5zM6 15l-2 4M9 17l-2 4M19 4v6M16 7h6M19 15v4M17 17h4"/>',
    guides:'<path d="M12 5C9 3 5 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 1zM12 5v16M5 8l4 1M15 9l4-1"/>',
    settings:'<circle cx="12" cy="12" r="4"/><path d="m10 2 4 0 1 3 3 1 3 3-1 3 1 3-3 3-3 1-1 3h-4l-1-3-3-1-3-3 1-3-1-3 3-3 3-1z"/>'
  };
  function icon(name) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (iconPaths[name] || iconPaths.prep) + '</svg>'; }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function due(day) { return jobs.filter(j => j.days.includes(day)); }
  function completed(j, day) { return !!state.done[j.id + ':' + day]; }
  function total(list, day) { return list.filter(j => completed(j, day)).length; }
  function repeat(j) { return j.days.length === 7 ? 'Every day' : j.days.map(d => days[d]).join(', '); }
  function nav() { return [['recipes','Recipes'],['prep','Prep'],['orders','Orders'],['waste','Wastage'],['transfers','Transfers'],['cleaning','Cleaning']].map(([k,n]) => '<button class="cl-navitem" data-nav="'+k+'"'+(k === 'cleaning' ? ' aria-current="page"' : '')+'>'+icon(k)+'<span>'+n+'</span></button>').join(''); }
  function heading() { return '<div class="cl-pagehead"><div><p class="cl-eyebrow">'+design.toUpperCase()+' · '+names[design]+'</p><h1>Kitchen cleaning</h1><p class="cl-subtitle">Wednesday 11 November · Example day</p></div><div class="cl-headcount"><div class="cl-count">'+total(due(2),2)+' of '+due(2).length+' done</div><small>Today · Whole kitchen</small></div></div>'; }
  function feedback() { return '<div class="cl-feedback" role="status" aria-live="polite"><span>'+esc(state.feedback || 'Ticks here are a demo. Nothing is saved.')+'</span>'+(state.undo ? '<button data-undo>Undo</button>' : '')+'</div>'; }
  function row(j, day) {
    const done = completed(j,day), current = day === 2;
    const subtitle = done ? 'Done · Demo cook · 14:10 (example)' : 'Owner: '+j.owner+' · '+j.area;
    return '<div class="cl-task'+(done ? ' is-done' : '')+'" data-job="'+j.id+'"><button class="cl-tick" data-tick="'+j.id+'" data-day="'+day+'" aria-pressed="'+done+'" aria-label="'+(done ? 'Undo: ' : 'Mark done: ')+esc(j.title)+'"'+(!current ? ' disabled' : '')+'><span class="cl-box" aria-hidden="true">'+(done ? '✓' : '')+'</span></button><div><h3>'+esc(j.title)+'</h3><p class="cl-taskmeta">'+esc(current ? subtitle : (day < 2 ? 'Example past record · View only' : 'Planned · '+j.owner))+'</p></div><button class="cl-help" data-guide="'+j.id+'">'+icon('guides')+'<span>How to</span></button></div>';
  }
  function rows(list,day) { return list.length ? list.map(j=>row(j,day)).join('') : '<p class="cl-empty">No example jobs on this day.</p>'; }
  function daypicker() { return '<div class="cl-daypicker" aria-label="Choose a day">'+days.map((d,i)=>'<button data-daypick="'+i+'" aria-pressed="'+(state.day===i)+'"><span>'+d+'</span><b>'+(i+9)+'</b></button>').join('')+'</div>'; }
  function week() {
    return '<div class="cl-wideweek"><table class="cl-weektable"><caption class="cl-eyebrow" style="text-align:left;padding:0 0 10px">Chef view · 9 to 15 November · Example schedule</caption><thead><tr><th scope="col">Area and job</th>'+days.map((d,i)=>'<th scope="col"'+(i===2?' class="cl-today"':'')+'>'+d+' '+(i+9)+'</th>').join('')+'</tr></thead><tbody>'+jobs.map(j=>'<tr><td><span class="cl-mtitle">'+esc(j.title)+'</span><small>'+esc(j.area)+' · '+esc(j.owner)+'</small></td>'+days.map((d,i)=>'<td'+(i===2?' class="cl-today"':'')+'>'+(j.days.includes(i) ? (i===2 ? '<button class="cl-cell'+(completed(j,i)?' done':'')+'" data-tick="'+j.id+'" data-day="2" aria-pressed="'+completed(j,i)+'" aria-label="'+(completed(j,i)?'Undo: ':'Mark done: ')+esc(j.title)+' on Wed 11 November">'+(completed(j,i)?'✓':'□')+'</button><small class="cl-cellwho">'+(completed(j,i)?'Demo cook<br>14:10 (example)':'&nbsp;<br>&nbsp;')+'</small>' : '<span class="cl-cell-static'+(i<2?' missed':'')+'" aria-label="'+(i<2?'Not recorded':'Planned')+'">'+(i<2?'Not done':'○')+'</span>') : '<span aria-label="Not scheduled">·</span>')+'</td>').join('')+'</tr>').join('')+'</tbody></table><div class="cl-key"><span><b>✓</b> Done</span><span>□ Due today</span><span>○ Planned</span><span>Not done = no completion recorded</span><span>· Not scheduled</span></div></div><div class="cl-phoneweek">'+daypicker()+'<div class="cl-bookhead"><h2>'+days[state.day]+' '+(state.day+9)+' November</h2><small>'+(state.day===2?'Today':state.day<2?'Past · View only':'Plan · View only')+'</small></div>'+rows(due(state.day),state.day)+'</div>';
  }
  function schedule() { return '<details class="cl-schedule"><summary>Repeat days · Chef setup</summary><p class="cl-weeknote">Example schedule only. Confirm jobs, owners and days before using it.</p>'+jobs.map(j=>'<div class="cl-schedrow"><b>'+esc(j.title)+'</b><span>'+esc(repeat(j))+' · '+esc(j.owner)+'</span></div>').join('')+'</details>'; }
  function layoutA() {
    return '<section class="cl-book">'+(state.role==='chef' ? week() : '<div class="cl-bookhead"><h2>Today’s jobs</h2><small>All areas</small></div>'+rows(due(2),2))+feedback()+(state.role==='chef'?schedule():'')+'</section><p class="cl-caption">'+(state.role==='chef' ? 'A weekly sheet on a wide screen, one day at a time on a phone.' : 'Staff see today. The chef view holds the week and repeat days.')+'</p>';
  }
  function layoutB() {
    const sectionJobs = due(2).filter(j=>!j.shared&&(state.section==='All sections'||j.owner===state.section)), shared = due(2).filter(j=>j.shared);
    const controls = state.role==='chef' ? '<div class="cl-controls"><button class="cl-chip" data-view="today" aria-pressed="'+(state.view==='today')+'">Today</button><button class="cl-chip" data-view="week" aria-pressed="'+(state.view==='week')+'">Week</button></div>' : '';
    if(state.role==='chef' && state.view==='week') return controls+'<section class="cl-book">'+week()+feedback()+schedule()+'</section>';
    return controls+'<div class="cl-sectionlayout"><section class="cl-book"><div class="cl-yoursection"><label>Working on<select class="cl-section" aria-label="Kitchen section">'+['Grill','Fryers','Pass','Prep','All sections'].map(s=>'<option'+(s===state.section?' selected':'')+'>'+s+'</option>').join('')+'</select></label><span class="cl-littlecount">'+total(sectionJobs,2)+' / '+sectionJobs.length+' done</span></div><div class="cl-bookhead"><h2>Your section</h2><small>Today</small></div>'+rows(sectionJobs,2)+'</section><section><div class="cl-sharedhead"><div><h2>Shared kitchen</h2><p>Keep these in view, whatever your section.</p></div><span class="cl-littlecount">'+total(shared,2)+' / '+shared.length+'</span></div>'+rows(shared,2)+'<p class="cl-other">Helping another section? <button data-all>Show all sections</button></p><p class="cl-caption">Shared areas have a named owner. Anyone helping can record the work they did.</p></section></div>'+feedback();
  }
  function layoutC() {
    const list=due(2), groups=[['Cooking line',list.filter(j=>!j.shared)],['Shared areas',list.filter(j=>j.shared)]];
    return '<div class="cl-c-list"><section class="cl-book"><div class="cl-bookhead"><h2>Today’s cleaning</h2><small>Tick as you finish</small></div>'+groups.map(([name,list])=>'<div class="cl-grouphead">'+name+'<span>'+list.length+' jobs</span></div>'+rows(list,2)).join('')+feedback()+'</section>'+(state.role==='chef'?schedule():'<p class="cl-caption">One list for the whole kitchen. Repeat days are set by the chef.</p>')+'</div>';
  }
  function render() {
    document.title='Design '+design.toUpperCase()+': '+names[design]+' · Kitchen cleaning';
    document.getElementById('cl-app').innerHTML='<header class="cl-top"><a class="cl-brand" href="index.html"><span class="cl-back" aria-hidden="true">‹</span>Kitchen Book</a><nav class="cl-topnav" aria-label="Kitchen pages">'+nav()+'</nav><div class="cl-icons"><button class="cl-round" data-notes aria-label="Shift pings">'+icon('bell')+'</button><button class="cl-round" data-menu aria-label="Chef hat menu">'+icon('chef')+'</button></div></header><div class="cl-demo"><div><a href="index.html">Compare designs</a><span class="cl-demo-label">Design preview · Example jobs and days</span></div><label><span class="cl-demo-label">Preview as</span><select class="cl-role" aria-label="Preview role"><option value="staff"'+(state.role==='staff'?' selected':'')+'>Staff</option><option value="chef"'+(state.role==='chef'?' selected':'')+'>Chef</option></select></label></div><main class="cl-main cl-'+design+'">'+heading()+(design==='a'?layoutA():design==='b'?layoutB():layoutC())+'</main><nav class="cl-bottom" aria-label="Kitchen pages">'+nav()+'</nav>';
  }
  function closeDialog() { const modal=document.querySelector('.cl-modalwrap');if(modal)modal.remove();if(state.focus&&state.focus.isConnected)state.focus.focus(); }
  function dialog(title, body) {
    const existing=document.querySelector('.cl-modalwrap');
    if(!existing)state.focus=document.activeElement;
    if(existing)existing.remove();
    const wrap=document.createElement('div');wrap.className='cl-modalwrap';
    wrap.innerHTML='<section class="cl-dialog" role="dialog" aria-modal="true" aria-labelledby="cl-dialog-title"><div class="cl-dialog-head"><h2 id="cl-dialog-title">'+esc(title)+'</h2><button class="cl-close" data-close aria-label="Close">×</button></div>'+body+'</section>';
    document.body.appendChild(wrap);wrap.querySelector('button').focus();wrap.addEventListener('click',e=>{if(e.target===wrap)closeDialog();});
  }
  function menu() { dialog('Kitchen menu','<div class="cl-person"><span class="cl-avatar">D</span><div><b>Demo cook</b><small>Synthetic person · '+(state.role==='chef'?'Chef':'Staff')+' preview</small></div></div><p class="cl-menuheading">Every day</p><button class="cl-menurow" data-cleaning>'+icon('cleaning')+'<span>Kitchen cleaning</span><span>›</span></button><button class="cl-menurow" data-menu-other="Functions">'+icon('prep')+'<span>Functions</span><span>›</span></button><p class="cl-menuheading">More</p><button class="cl-menurow" data-guide="all">'+icon('guides')+'<span>Guides</span><span>How to · ›</span></button><button class="cl-menurow" data-menu-other="Settings">'+icon('settings')+'<span>Settings</span><span>›</span></button><p class="cl-caption">Menu excerpt. Other existing entries keep their current permissions and order.</p>'); }
  function guide(id) { const j=jobs.find(j=>j.id===id);dialog(j?j.area+' · How to':'Guides','<div class="cl-guide"><p>'+(j?'The cleaning task would open its existing guide here.':'Guides moves here from the navigation bar. Existing equipment, cleaning, food safety and cooking guides stay available.')+'</p><div class="cl-guideplaceholder"><strong>Method to come</strong><p>The head chef confirms the procedure. This preview does not prescribe cleaning products, temperatures, equipment handling or contact times.</p></div><button data-close>Back to cleaning</button></div>'); }
  document.addEventListener('change',e=>{
    if(e.target.matches('.cl-role')) {state.role=e.target.value;state.day=2;state.view='today';render();document.querySelector('.cl-role').focus();}
    if(e.target.matches('.cl-section')) {state.section=e.target.value;render();document.querySelector('.cl-section').focus();}
  });
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-tick')) {
      const j=jobs.find(j=>j.id===b.dataset.tick),day=Number(b.dataset.day);if(!j||day!==2)return;
      const key=j.id+':'+day,was=!!state.done[key];state.undo={key,was};state.done[key]=!was;
      state.feedback=j.title+(was?' reopened in this demo.':' marked done by Demo cook, 14:10 (example).');
      render();[...document.querySelectorAll('[data-tick="'+j.id+'"][data-day="2"]')].find(el=>el.getClientRects().length)?.focus({preventScroll:true});
    }else if(b.hasAttribute('data-undo')) {state.done[state.undo.key]=state.undo.was;state.undo=null;state.feedback='Last change undone in this demo.';render();}
    else if(b.hasAttribute('data-menu'))menu();
    else if(b.hasAttribute('data-close')||b.hasAttribute('data-cleaning'))closeDialog();
    else if(b.hasAttribute('data-guide'))guide(b.dataset.guide);
    else if(b.hasAttribute('data-daypick')){state.day=Number(b.dataset.daypick);render();document.querySelector('[data-daypick="'+state.day+'"]')?.focus({preventScroll:true});}
    else if(b.hasAttribute('data-view')){state.view=b.dataset.view;render();document.querySelector('[data-view="'+state.view+'"]')?.focus({preventScroll:true});}
    else if(b.hasAttribute('data-all')){state.section='All sections';render();document.querySelector('.cl-section')?.focus({preventScroll:true});}
    else if(b.dataset.nav==='cleaning'){window.scrollTo({top:0});}
    else if(b.hasAttribute('data-nav')||b.hasAttribute('data-menu-other')||b.hasAttribute('data-notes'))dialog('Design preview','<div class="cl-guide"><p>This comparison demonstrates Kitchen cleaning and the Guides move. The other kitchen pages continue to work as they do today.</p><button data-close>Back to cleaning</button></div>');
  });
  document.addEventListener('keydown',e=>{
    const wrap=document.querySelector('.cl-modalwrap');if(!wrap)return;
    if(e.key==='Escape'){e.preventDefault();closeDialog();}
    if(e.key==='Tab'){const focus=[...wrap.querySelectorAll('button,a,select')].filter(el=>!el.disabled),first=focus[0],last=focus[focus.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  });
  render();
}());
