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
  function openMenu() {
    close();returnFocus=document.querySelector('.oc-clock');
    const firstDone=['first_due','second','second_due'].includes(stage);
    const secondDone=stage==='second_due';
    function row(hours,enabled,running,done,caption) {
      return '<button type="button" class="oc-menu-row '+(enabled?'is-ready':'')+'" data-oc="start'+(hours===2?'1':'2')+'" '+(enabled?'':'disabled')+'><span class="oc-menu-tick" aria-hidden="true">'+(done?'✓':running?clock:'')+'</span><span class="oc-menu-label"><b>'+hours+' hours</b><small>'+caption+'</small></span><span class="oc-menu-state">'+(enabled?'Start':running?'':done?'Done':'Next')+'</span></button>';
    }
    const wrap=document.createElement('div');wrap.className='wm-wrap oc-modal';
    wrap.innerHTML='<div class="wm-bg" data-oc="close"></div><section class="oc-dropdown" role="dialog" aria-modal="true" aria-labelledby="oc-title" tabindex="-1"><header class="oc-menu-head"><h2 id="oc-title">Operandio</h2><button type="button" data-oc="close" class="oc-menu-close" aria-label="Close cooling timers">×</button></header>'+row(2,stage==='idle',stage==='first',firstDone,stage==='idle'?'Tick to start':stage==='first'?'1 h 42 min left · due 16:00':'Finished at 16:00')+row(4,stage==='first_due',stage==='second',secondDone,stage==='first_due'?'Tick to start':stage==='second'?'3 h 50 min left · due 20:10':secondDone?'Finished at 20:10':'After 2 hours')+(secondDone?'<footer class="oc-menu-foot">'+action('reset','Start another batch',true)+'</footer>':'')+'</section>';
    document.body.appendChild(wrap);document.documentElement.classList.add('oc-sheet-open');
    const chip=document.querySelector('.oc-clock'),rect=chip.getBoundingClientRect(),menu=wrap.querySelector('.oc-dropdown');
    menu.style.top=Math.max(8,Math.min(rect.bottom+8,innerHeight-menu.offsetHeight-8))+'px';
    menu.style.left=Math.max(8,Math.min(innerWidth-menu.offsetWidth-8,rect.left+rect.width/2-menu.offsetWidth/2))+'px';
    chip.setAttribute('aria-expanded','true');menu.focus();
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
    if(a==='start1'&&stage==='idle'){stage='first';paintCard();if(design==='b')close();else open('timer');}
    if(a==='start2'&&stage==='first_due'){stage='second';paintCard();if(design==='b')close();else open('timer');}
    if(a==='reset'){stage='idle';paintCard();open('timer');}
  });
  document.addEventListener('keydown',e=>{const dialog=document.querySelector('.oc-modal');if(!dialog)return;if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const f=[...dialog.querySelectorAll('button:not(:disabled)')];const first=f[0],last=f.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.querySelector('[role=dialog]'))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===dialog.querySelector('[role=dialog]'))){e.preventDefault();first.focus();}}});
  if(stage.endsWith('due')&&(design!=='d'||q.get('view')==='ping'))open('ping');else if(q.get('open')!=='0'&&design!=='b')open('timer');
})();
