(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  var state = { design: /^[abc]$/.test(params.get('design')) ? params.get('design') : 'a', role: params.get('role') === 'head' ? 'head' : 'sous', mail: params.get('mail') === '1', fn: params.get('fn') === '1', task: params.get('task') || '', detail: !!params.get('task') };
  var root = document.getElementById('stage'), dialog = document.getElementById('preview-dialog');
  if (params.get('capture') === '1') document.body.classList.add('capture');
  var icons = {
    team: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2 21v-3a6 6 0 0 1 12 0v3m1-7a5 5 0 0 1 7 5v2"/>',
    todo: '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2m-7 8 2 2 5-5m-6 9h6"/>',
    pings: '<path d="M5 16h14l-2-3V9a5 5 0 0 0-10 0v4Zm4 4a3 3 0 0 0 6 0"/>',
    delivery: '<path d="M10 14V4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0Z"/><path d="M12 9v8m6-11h3m-3 4h3"/>',
    supplier: '<path d="M2 6h12v12H2zm12 5h4l4 4v3h-8"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
    functions: '<rect x="3" y="5" width="18" height="17" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-13 5h2m4 0h2"/>',
    minutes: '<path d="M5 2h10l4 4v16H5zm9 0v6h5M8 12h8m-8 4h8"/>',
    mail: '<rect x="2" y="5" width="20" height="15" rx="2"/><path d="m3 6 9 8 9-8"/>',
    recipes: '<path d="M3 3q5-2 9 2 4-4 9-2v17q-5-2-9 2-4-4-9-2Zm9 2v17"/>',
    history: '<path d="M3 11a9 9 0 1 1 2 7M3 5v6h6m3-5v7l4 2"/>',
    owner: '<rect x="5" y="10" width="14" height="12" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v3"/>',
    settings: '<circle cx="12" cy="12" r="4"/><path d="m10 2 4 0 1 4 4 1 3 4-3 3-1 4-4 1-3 3-3-3-4-1-1-4L1 9l4-3 4-1Z"/>'
  };
  function esc(s) { return String(s).replace(/[&<>"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function icon(id) { return '<span class="tool-icon" aria-hidden="true"><svg viewBox="0 0 24 24">' + (icons[id] || icons.history) + '</svg></span>'; }
  function role() { return state.role === 'head' ? 'Head chef' : 'Sous chef'; }
  function name() { return state.role === 'head' ? 'Ann' : 'Sam'; }
  function person() { return '<div class="role-strip"><span class="avatar" aria-hidden="true">' + name()[0] + '</span><span><b>' + name() + ' · ' + role() + '</b>Example personal PIN session</span></div>'; }
  function tools() {
    return [
      {id:'team',group:'Today',title:"Today’s team",sub:'Set shifts, sections and breaks',text:'Plan who is on each shift, give them a section and check their breaks. This opens the existing roster notebook.',where:"Today’s team"},
      {id:'todo',group:'Today',title:'Chef to-do',sub:'The jobs shared by the chefs',text:'Add, change and tick off the jobs shared by the Head chef and Sous chefs. The existing notebook keeps its draft and filters.',where:'Chef to-do'},
      {id:'pings',group:'Today',title:'Shift pings',sub:'Write a message for the shift',text:'Write or manage a shift ping. The existing page keeps the recipients, time and save confirmation.',where:'Shift pings'},
      {id:'delivery',group:'Today',title:'Delivery received',sub:'Record today’s temperatures',text:'Record a delivery and its temperatures, or check today’s arrivals. Older delivery reports remain in owner administration.',where:'Delivery received'},
      {id:'supplier',group:'Today',title:'Supplier order',sub:state.role === 'head' ? 'Place orders and change the catalogue' : 'Read the catalogue and place an order',text:state.role === 'head' ? 'Open the supplier workspace to read the catalogue, place an order or check an earlier order. The Head chef can also change the catalogue.' : 'Open the supplier workspace to read the catalogue, place an order or check an earlier order. Catalogue changes stay with the Head chef or admin.',where:'Supplier order'},
      {id:'functions',group:'Today',title:state.fn ? 'Manage functions' : 'View functions',sub:state.fn ? 'Book and change functions' : 'Read the bookings and service view',text:state.fn ? 'The example person has the Functions tick, so this opens the existing booking editor. The tick remains separate from the chef role.' : 'Read the bookings and service rounds. Creating or changing a booking needs the separate Functions tick; a chef can still cancel a function under the current rules.',where:state.fn ? 'Manage functions' : 'Functions'},
      {id:'staff',icon:'team',group:'Team',title:'Manage staff',sub:'Keep the roster; request permission changes',text:'Add or update people using the existing staff page. Changes to active permissions need admin approval. Resetting a personal PIN remains an admin action.',where:'Manage staff'},
      {id:'minutes',group:'Team',title:'Meeting minutes',sub:'Read minutes and check who has signed',text:'Read published minutes and open the sign-off register. Writing or publishing minutes remains in owner administration.',where:'Meeting minutes'},
      {id:'mail',group:'Team',title:state.mail ? 'Read kitchen mail' : 'Send kitchen mail',sub:state.mail ? 'Shared with the chefs by the admin' : 'Shared reading is switched off',text:state.mail ? 'The admin has enabled shared kitchen mail. Both PIN chef roles may read and triage it. The switch still controls access.' : 'Send a message to the Head chef. Shared reading is switched off, so this example does not offer the incoming mail list.',where:'Kitchen mail'},
      {id:'recipes',group:'Book',title:'Recipes & drawings',sub:'Change the recipe book',text:'Open the current recipe and drawing editor. It uses the same saved recipes, permissions and draft handling as today.',where:'Manage Recipes & Drawings'},
      {id:'prep',icon:'history',group:'Book',title:'Prep history',sub:'Open prep and choose a day',text:'Open Prep and use its date picker for an earlier day. Current chef permissions and individual Add, Tick and Delete capabilities still apply.',where:'Prep'},
      {id:'orders',icon:'history',group:'Book',title:'Order history',sub:'Open orders and choose a day',text:'Open Orders and use its date picker for an earlier day. Current permissions still apply; this is not the admin analysis report.',where:'Orders'}
    ];
  }
  function toolRow(t, extra) { return '<button type="button" class="tool-row ' + (extra || '') + '" data-open="' + t.id + '">' + icon(t.icon || t.id) + '<span class="tool-copy"><span class="tool-title">' + esc(t.title) + '</span><span class="tool-sub">' + esc(t.sub) + '</span></span><span class="chevron" aria-hidden="true">›</span></button>'; }
  function owner() { return state.role === 'head' ? toolRow({id:'owner',title:'Owner admin',sub:'Verify Google on this Head chef session'},'owner-row') : ''; }
  function boundary() { return '<p class="boundary">Your personal PIN opens the chef tools you already have. Admin approval is still needed for permission changes. Owner reports, kitchen settings, security and backups stay in Owner admin.</p>'; }
  function desk(list) {
    return '<div class="panel-layout"><nav class="rail" aria-label="Chef panel sections"><p class="eyebrow">Chef desk</p>' + ['Today','Team','Book'].map(function(g,i){return '<a href="#group-' + g.toLowerCase() + '"><small>0' + (i+1) + '</small>' + g + '</a>';}).join('') + (state.role==='head' ? '<div class="rail-foot">' + owner() + '</div>':'') + '</nav><div class="panel-main">' + person() + '<header class="panel-heading"><p class="eyebrow">The chef’s desk</p><h1>' + role() + ' panel</h1><p>The shift, the team and the book. Choose the job you need.</p></header>' + ['Today','Team','Book'].map(function(g){return '<section class="tool-group" id="group-' + g.toLowerCase() + '"><h2 class="group-title">' + g + '<span>' + ({Today:'Run the shift',Team:'Look after the people',Book:'Keep the book useful'})[g] + '</span></h2><div class="tool-grid">' + list.filter(function(t){return t.group===g;}).map(function(t){return toolRow(t);}).join('') + '</div></section>';}).join('') + (state.role==='head' ? '<div class="phone-owner">'+owner()+'</div>':'') + boundary() + '</div></div>';
  }
  function notebook(list) {
    var selected = list.find(function(t){return t.id===state.task;}) || list[0];
    return '<div class="notebook-wrap"><header class="notebook-heading"><div><p class="eyebrow">' + role() + ' panel</p><h1>The shift notebook</h1><p>Choose a job. Open its page when you are ready.</p></div>' + person() + '</header><div class="notebook' + (state.detail ? ' is-detail':'') + '"><div class="notebook-list">' + ['Today','Team','Book'].map(function(g){return '<h2 class="group-title">'+g+'</h2>' + list.filter(function(t){return t.group===g;}).map(function(t){return '<button type="button" class="task" data-task="'+t.id+'" aria-pressed="'+(t.id===selected.id)+'"><span class="task-no" aria-hidden="true">'+(list.indexOf(t)+1)+'</span><span class="tool-title">'+esc(t.title)+'</span><span class="chevron" aria-hidden="true">›</span></button>';}).join('');}).join('') + '</div><section class="notebook-detail" aria-label="Selected job"><button type="button" class="detail-back" data-back>‹ All jobs</button>' + icon(selected.icon || selected.id) + '<p class="eyebrow">'+selected.group+'</p><h2 tabindex="-1">'+esc(selected.title)+'</h2><p>'+esc(selected.text)+'</p><button type="button" class="primary" data-open="'+selected.id+'">Open '+esc(selected.where)+'</button><p class="detail-where">Opens the existing page. Nothing is saved by choosing a job.</p></section></div>' + (state.role==='head' ? owner() : '') + boundary() + '</div>';
  }
  function menu(list) {
    var chefIds = ['team','todo','pings','staff','recipes','supplier','prep','orders'];
    return '<div class="menu-scene"><div class="scene-note"><p class="eyebrow">C · Menu only</p><h1>One familiar place.<br>Clearer groups.</h1><p>The hat stays the way in. Chef tools are together, with no extra panel between you and the job.</p><p>This is the open menu. From a closed hat, the existing task links still take two taps.</p><div class="scene-mini"><h2>Prep stays Prep</h2><p>The work page keeps its space.</p><div class="fake-line"><span class="fake-check"></span><b>Portion rump</b></div><div class="fake-line"><span class="fake-check"></span><b>Make gravy</b></div><div class="fake-line"><span class="fake-check"></span><b>Slice onions</b></div></div></div><nav class="menu-card" aria-label="Example chef hat menu"><div class="menu-role"><span class="avatar" aria-hidden="true">'+name()[0]+'</span><div><b>'+name()+'</b><p>'+role()+' · Example PIN session</p></div></div><button type="button" class="menu-signout" data-open="signout">Not '+name()+'? Sign out</button><h2>Chef tools</h2>'+list.filter(function(t){return chefIds.indexOf(t.id)>=0;}).map(function(t){return toolRow(t);}).join('')+'<h2>Kitchen pages</h2>'+toolRow({id:'section',icon:'team',title:'My section',sub:'Your section for today'})+list.filter(function(t){return chefIds.indexOf(t.id)<0;}).map(function(t){return toolRow(t);}).join('')+toolRow({id:'drinks',icon:'supplier',title:'Drinks run',sub:'The team’s usual drinks'})+owner()+'<div class="menu-footer"><button type="button" data-open="settings">Settings</button></div><p class="menu-inline-help">Existing permissions apply. Staff permission changes still need admin approval.</p></nav></div>';
  }
  function syncURL() { var q = new URLSearchParams(location.search); q.set('design',state.design); q.set('role',state.role); q.set('mail',state.mail?'1':'0'); q.set('fn',state.fn?'1':'0'); if(state.task)q.set('task',state.task);else q.delete('task'); history.replaceState(null,'',location.pathname+'?'+q.toString()); }
  function render() {
    document.querySelectorAll('button[data-design]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.design===state.design));});
    document.getElementById('role').value=state.role;document.getElementById('mail').checked=state.mail;document.getElementById('fn').checked=state.fn;
    document.getElementById('tradeoff').textContent={a:'A gives the chefs a named panel with the tools grouped by job. A tool takes three taps through the desk; the existing direct hat links stay at two.',b:'B makes the next step explicit, with one job beside the list on a laptop and one focused job on a phone. Selecting then opening a job takes four taps from a closed hat.',c:'C changes the least: clearer groups in the existing hat, and no extra panel page. Tools stay two taps away; there is less room to explain each one.'}[state.design];
    root.innerHTML = ({a:desk,b:notebook,c:menu})[state.design](tools());
    document.body.dataset.design=state.design; syncURL();
  }
  function openPreview(id) {
    var t = tools().find(function(x){return x.id===id;});
    var other = {signout:['Sign out','The existing handover waits for unsent work and clears private drafts. This example does not sign anyone out.'],section:['My section','Keep the current section picker and access rules.'],drinks:['Drinks run','Open the current team drinks notebook.']};
    var title = t ? t.title : other[id] ? other[id][0] : id==='owner' ? 'Owner admin' : 'Settings';
    var text = t ? t.text : other[id] ? other[id][1] : id==='owner' ? 'The real admin panel still requires verified owner Google, this device’s live Head chef PIN session and its matching grant. This preview does not sign in.' : 'The real Settings page keeps the existing device, personal and permitted kitchen controls.';
    document.getElementById('dialog-title').textContent=title; document.getElementById('dialog-text').textContent=text+' This example opens no live page and changes no kitchen data.';
    dialog.showModal();
  }
  document.addEventListener('click',function(e){var b=e.target.closest('button[data-design],[data-open],[data-task],[data-back]');if(!b)return;if(b.hasAttribute('data-design')){state.design=b.dataset.design;state.detail=false;state.task='';render();}else if(b.hasAttribute('data-open'))openPreview(b.dataset.open);else if(b.hasAttribute('data-task')){state.task=b.dataset.task;state.detail=true;render();if(innerWidth<=600){var h=root.querySelector('.notebook-detail h2');if(h)h.focus({preventScroll:true});root.querySelector('.notebook').scrollIntoView({block:'start'});}}else{state.detail=false;state.task='';render();var f=root.querySelector('[data-task]');if(f)f.focus({preventScroll:true});}});
  document.querySelectorAll('#role,#mail,#fn').forEach(function(el){el.addEventListener('change',function(){state.role=document.getElementById('role').value;state.mail=document.getElementById('mail').checked;state.fn=document.getElementById('fn').checked;render();});});
  dialog.addEventListener('click',function(e){if(e.target===dialog){var r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  window.LK_CHEF_PREVIEW = { state:function(){return Object.assign({},state);}, tools:function(){return tools().map(function(t){return t.id;});} };
  render();
})();
