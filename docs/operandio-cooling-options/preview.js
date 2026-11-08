/* Interactive design preview only. No app scripts, accounts, database, sound or real timers. */
(function () {
  'use strict';
  const q = new URLSearchParams(location.search);
  const design = ['a', 'b', 'c', 'd'].includes(q.get('design')) ? q.get('design') : 'a';
  let stage = ['idle', 'first', 'first_due', 'second', 'second_due'].includes(q.get('stage')) ? q.get('stage') : 'idle';
  const clock = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
  const check = '<span class="oc-check" aria-hidden="true">✓</span>';
  const labels = { idle:'Ready to start',first:'Stage 1 running',first_due:'Waiting for the next tick',second:'Stage 2 running',second_due:'Both timers finished' };
  let returnFocus = null;
  const feedbackHours=stage==='first_due'?4:2;
  let pending=q.get('feedback')==='pending'?feedbackHours:0;
  let failedStage=q.get('feedback')==='error'?feedbackHours:0;
  let justStarted=0;
  let attempts=0;
  const announce=document.createElement('div');
  announce.className='oc-live';announce.setAttribute('role','status');announce.setAttribute('aria-live','polite');
  document.body.appendChild(announce);
  document.title = 'Operandio cooling: design ' + design.toUpperCase();
  document.documentElement.classList.add('oc-demo');
  document.querySelectorAll('a').forEach(a => a.addEventListener('click', e => e.preventDefault()));
  document.querySelectorAll('.p-toasts, .p-sync, #lk-live').forEach(el => el.remove());
  function action(id, text, secondary) { return '<button class="btn '+(secondary?'':'dark')+' oc-action" type="button" data-oc="'+id+'">'+(!secondary?check:'')+text+'</button>'; }
  function timeline() {
    const second = stage === 'second' || stage === 'second_due';
    return '<ol class="oc-steps"><li class="'+(second || stage === 'first_due'?'is-finished':'is-current')+'"><span class="oc-step-no">'+(second || stage === 'first_due'?'✓':'1')+'</span><div><b>First, 2 hours</b><small>'+(stage === 'idle'?'Starts when someone ticks':stage === 'first'?'Started 14:00 · due 16:00':'Time finished at 16:00')+'</small></div></li><li class="'+(second?'is-current':'')+'"><span class="oc-step-no">2</span><div><b>Then, another 4 hours</b><small>'+(stage === 'second'?'Started 16:10 · due 20:10':stage === 'second_due'?'Time finished at 20:10':'Starts with a separate tick')+'</small></div></li></ol>';
  }
  function timerContent(compact) {
    const status = labels[stage];
    if (compact) return '<div class="oc-compact"><div class="oc-batch-head"><span class="oc-symbol">'+clock+'</span><div><h3>Operandio</h3><p>Batch cooling · everyone</p></div></div><p class="oc-compact-state">'+status+'</p><div class="oc-mini-steps"><span><b>1 · 2 hours</b><small>'+(stage==='idle'?'First tick starts this':stage==='first'?'Due 16:00':'Ended 16:00')+'</small></span><span><b>2 · 4 hours</b><small>'+(stage==='second'?'Due 20:10':stage==='second_due'?'Ended 20:10':'Separate tick to start')+'</small></span></div>'+(stage==='idle'?action('start1','Start 2 hours'):stage==='first_due'?action('start2','Start 4 hours'):stage==='second_due'?action('reset','Start another batch',true):'<p class="oc-caption">'+(stage==='first'?'1 h 42 min':'3 h 50 min')+' left · started by a team member</p>')+'</div>';
    return '<div class="oc-batch"><div class="oc-batch-head"><span class="oc-symbol">'+clock+'</span><div><h3>Operandio</h3><p>Batch cooling · everyone</p></div></div><p class="oc-status">'+status+'</p>'+(!compact && (stage==='first'||stage==='second')?'<div class="oc-count"><b>'+(stage==='first'?'01:42':'03:50')+'</b><span>left in this stage</span></div>':'')+timeline()+
      (stage==='idle'?action('start1','Start 2 hours')+'<p class="oc-caption">Anyone in the kitchen can start it.</p>':stage==='first_due'?action('start2','Start 4 hours')+'<p class="oc-caption">Starts the next stage for everyone.</p>':stage==='second_due'?'<p class="oc-caption">Both elapsed-time pings have been sent.</p>'+action('reset','Start another batch',true):'<p class="oc-caption">Everyone sees the same timer. A second tick cannot restart it.</p>')+'</div>';
  }
  function close() { document.querySelector('.oc-modal')?.remove();document.documentElement.classList.remove('oc-sheet-open');document.querySelector('.oc-clock')?.setAttribute('aria-expanded','false');if(returnFocus?.isConnected)returnFocus.focus(); }
  function menuContent() {
    const firstDone=['first_due','second','second_due'].includes(stage);
    function row(hours,ready,running,done,caption) {
      const busy=pending===hours,error=failedStage===hours;
      const id=hours===2?'1':'2';
      const text=busy?'Starting…':error?'Try again':'Start';
      const right=running?'<span class="oc-menu-status"><span class="lk-stamp">Started '+(hours===2?'14:00':'16:10')+'</span><small>Due '+(hours===2?'16:00':'20:10')+'</small></span>':done?'<span class="oc-menu-done">✓ Finished</span>':'<button type="button" class="btn '+(ready||busy?'dark ':'')+'oc-menu-start" data-oc="start'+id+'" aria-label="'+(busy?'Starting':error?'Try again: start':'Start')+' Operandio '+hours+'-hour timer" aria-describedby="oc-detail-'+id+'" '+(ready&&!pending?'':'disabled')+(busy?' aria-busy="true"':'')+'>'+text+'</button>';
      return '<div class="oc-menu-entry" data-timer="'+hours+'" tabindex="-1"><div class="oc-menu-row"><span class="oc-menu-label"><b>'+hours+' hours</b><small id="oc-detail-'+id+'">'+(busy?'Waiting for confirmation':error?'Not started':caption)+'</small></span>'+right+'</div>'+(error?'<p class="p-err oc-menu-error" role="alert">Couldn’t start Operandio '+hours+'-hour timer.</p>':'')+'</div>';
    }
    return row(2,stage==='idle',stage==='first',firstDone,stage==='idle'?'':stage==='first'?(justStarted===2?'2 h left':'1 h 42 min left'):'Finished at 16:00')+row(4,stage==='first_due',stage==='second',stage==='second_due',stage==='first_due'?'Ready to start':stage==='second'?(justStarted===4?'4 h left':'3 h 50 min left'):stage==='second_due'?'Finished at 20:10':'After 2 hours')+(stage==='second_due'?'<footer class="oc-menu-foot">'+action('reset','Start another batch',true)+'</footer>':'');
  }
  function placeMenu() {
    const chip=document.querySelector('.oc-clock'),menu=document.querySelector('.oc-dropdown');
    if(!menu)return;
    const rect=chip.getBoundingClientRect();
    menu.style.top=Math.max(8,Math.min(rect.bottom+8,innerHeight-menu.offsetHeight-8))+'px';
    menu.style.left=Math.max(8,Math.min(innerWidth-menu.offsetWidth-8,rect.left+rect.width/2-menu.offsetWidth/2))+'px';
  }
  function openMenu() {
    close();returnFocus=document.querySelector('.oc-clock');
    const wrap=document.createElement('div');wrap.className='wm-wrap oc-modal';
    wrap.innerHTML='<div class="wm-bg" data-oc="close"></div><section class="oc-dropdown" role="dialog" aria-modal="true" aria-labelledby="oc-title" tabindex="-1"><header class="oc-menu-head"><h2 id="oc-title">Operandio</h2><button type="button" data-oc="close" class="btn oc-menu-close" aria-label="Close cooling timers">×</button></header><div class="oc-menu-content">'+menuContent()+'</div></section>';
    document.body.appendChild(wrap);document.documentElement.classList.add('oc-sheet-open');
    placeMenu();document.querySelector('.oc-clock').setAttribute('aria-expanded','true');wrap.querySelector('.oc-dropdown').focus();
  }
  function startPreview(hours) {
    if(pending||(hours===2?stage!=='idle':stage!=='first_due'))return;
    if(!document.querySelector('.oc-dropdown'))openMenu();
    pending=hours;failedStage=0;attempts++;
    const entry=document.querySelector('[data-timer="'+hours+'"]'),button=entry.querySelector('button');
    // Update the existing button immediately. The delayed result is a local preview, never a server response.
    button.textContent='Starting…';button.disabled=true;button.setAttribute('aria-busy','true');button.setAttribute('aria-label','Starting Operandio '+hours+'-hour timer');
    entry.querySelector('small').textContent='Waiting for confirmation';entry.querySelector('.oc-menu-error')?.remove();
    announce.textContent='Starting Operandio '+hours+'-hour timer. Waiting for confirmation.';
    placeMenu();
    if(q.get('result')==='hold')return;
    setTimeout(()=>{
      pending=0;
      const error=q.get('result')==='fail'&&attempts===1;
      if(error)failedStage=hours;
      else{stage=hours===2?'first':'second';justStarted=hours;paintCard();}
      const menu=document.querySelector('.oc-menu-content');
      if(menu){
        const hadFocus=menu.contains(document.activeElement);
        menu.innerHTML=menuContent();placeMenu();
        if(hadFocus)menu.querySelector(error?'[data-timer="'+hours+'"] button':'[data-timer="'+hours+'"]')?.focus({preventScroll:true});
      }
      announce.textContent=error?'Couldn’t start Operandio '+hours+'-hour timer. Try again.':'Started Operandio '+hours+'-hour timer. Due '+(hours===2?'16:00.':'20:10.');
    },700);
  }
  function open(kind) {
    if(design==='d'&&kind!=='ping')return openMenu();
    close();returnFocus=document.activeElement;
    const isPing=kind==='ping';
    const wrap=document.createElement('div');wrap.className='nt-wrap oc-modal';
    const hrs=stage==='second_due'?'4':'2';
    const content=isPing?'<div class="oc-ping"><span class="oc-tag">COOLING TIMER · EVERYONE</span><h3>Operandio batch cooling time '+hrs+' hours is done.</h3><p class="oc-ping-time">'+(hrs==='2'?'Stage 1 ended at 16:00.':'Stage 2 ended at 20:10.')+'</p>'+(hrs==='2'?'<div class="oc-next"><b>Next: another 4 hours</b><p>Waiting for someone to start it.</p>'+action('start2','Start 4 hours')+'<small>Starts the next stage for everyone.</small></div>':'<p class="oc-caption">Both timer stages have ended.</p>')+'</div>':timerContent(false)+(design==='c'?'<div class="oc-other"><b>Other shift pings</b><span>Your usual messages stay here.</span></div>':'');
    wrap.innerHTML='<div class="nt-bg" data-oc="close"></div><section class="nt oc-sheet" role="dialog" aria-modal="true" aria-labelledby="oc-title" tabindex="-1"><div class="nt-grip"></div><div class="nt-in"><header class="nt-head"><span class="nt-eb">'+(isPing?'New ping':design==='c'?'Cooling timer for everyone':'Shared with the kitchen')+'</span><h2 class="nt-h" id="oc-title">'+(isPing?(hrs==='2'?'First 2 hours finished':'Next 4 hours finished'):design==='c'?'Shift pings':'Cooling timer')+'</h2></header><div class="nt-body oc-body">'+content+'</div><footer class="nt-foot">'+action('close',isPing?'Got it':'Close',true)+(isPing?'<p class="oc-personal">Closes this message for you only.</p>':'')+'</footer></div></section>';
    document.body.appendChild(wrap);document.documentElement.classList.add('oc-sheet-open');wrap.querySelector('.nt').focus();
  }
  function paintCard() {
    document.querySelector('.oc-inline')?.remove();
    if(design==='b') {const card=document.createElement('section');card.className='oc-inline';card.setAttribute('aria-label','Operandio cooling');card.innerHTML='<div class="oc-inline-label">SHARED COOLING TIMER</div>'+timerContent(true);document.querySelector('.nb-left .nb-ph').after(card);}
    const chip=document.querySelector('[data-oc="open"]');if(chip)chip.classList.toggle('oc-hot',stage==='first_due'||stage==='second_due');
  }
  const icons=document.querySelector('.wtop-icons');
  if(design==='a'||design==='d') {const el=document.createElement('button');el.className='tm-chip oc-clock';el.type='button';el.setAttribute('aria-label','Operandio cooling timer');el.dataset.oc='open';el.setAttribute('aria-haspopup','dialog');el.setAttribute('aria-expanded','false');el.innerHTML=clock;icons.prepend(el);}
  const bell=document.querySelector('.nbell');if(bell){bell.hidden=false;bell.dataset.oc='open';bell.setAttribute('aria-label',design==='c'?'Shift pings and Operandio cooling':'Shift pings');}
  paintCard();
  document.addEventListener('click',e=>{const a=e.target.closest('[data-oc]')?.dataset.oc;if(!a)return;
    if(a==='close')return close();if(a==='open')return open(design!=='d'&&stage.endsWith('due')?'ping':'timer');
    if(a==='start1'&&stage==='idle'){if(design==='d')return startPreview(2);stage='first';paintCard();if(design==='b')close();else open('timer');}
    if(a==='start2'&&stage==='first_due'){if(design==='d')return startPreview(4);stage='second';paintCard();if(design==='b')close();else open('timer');}
    if(a==='reset'){pending=0;failedStage=0;justStarted=0;stage='idle';paintCard();open('timer');}
  });
  document.addEventListener('keydown',e=>{const dialog=document.querySelector('.oc-modal');if(!dialog)return;if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const f=[...dialog.querySelectorAll('button:not(:disabled)')];const first=f[0],last=f.at(-1);if(e.shiftKey&&(document.activeElement===first||!f.includes(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||!f.includes(document.activeElement))){e.preventDefault();first.focus();}}});
  window.addEventListener('resize',placeMenu);
  if(stage.endsWith('due')&&(design!=='d'||q.get('view')==='ping'))open('ping');else if(q.get('open')!=='0'&&design!=='b')open('timer');
})();
