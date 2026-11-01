(function(){
  'use strict';
  var paths={
    'arrow-right':'<path d="M4 12h15m-6-6 6 6-6 6"/>',
    'arrow-left':'<path d="M20 12H5m6-6-6 6 6 6"/>',
    'arrow-up-right':'<path d="M5 19 19 5M7 5h12v12"/>',
    'chevron-down':'<path d="m6 9 6 6 6-6"/>',
    'chevron-right':'<path d="m9 6 6 6-6 6"/>',
    check:'<path d="m5 12 4 4L20 5"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',plus:'<path d="M12 5v14M5 12h14"/>',
    book:'<path d="M12 5c-3-2-7-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-3-1-7-1-10 1Zm0 0v15"/><path d="M5 8h3M5 12h3m8-4h3m-3 4h3"/>',
    clipboard:'<path d="M9 4H5v18h14V4h-4M9 2h6v5H9zM8 12h8M8 16h6"/>',
    link:'<path d="m9 15 6-6m-7 3-2 2a4 4 0 0 0 6 6l3-3m-2-10 2-2a4 4 0 0 1 6 6l-3 3"/>',
    chart:'<path d="M4 3v17h17M8 16v-5m5 5V6m5 10V9"/>',
    archive:'<path d="M3 3h18v5H3zM5 8v13h14V8m-10 4h6"/>',
    settings:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    people:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4m1-17a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5v2"/>',
    bell:'<path d="M4 17h16l-2-4V9a6 6 0 0 0-12 0v4Zm6 3a2 2 0 0 0 4 0"/>',
    chef:'<path d="M6 14a5 5 0 0 1-1-10 5 5 0 0 1 8-2 5 5 0 0 1 7 7c0 2-1 4-3 5v7H6Zm0 3h11M9 8v5m5-5v5"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    orders:'<path d="M5 2h14v20l-3-2-4 2-4-2-3 2Zm3 5h8m-8 4h8m-8 4h5"/>',
    waste:'<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15m-8 4v7m4-7v7"/>',
    transfers:'<path d="M3 7h17l-4-4m5 14H4l4 4M20 7l-4 4M4 17l4-4"/>',
    guides:'<path d="M5 3h15v18H5a3 3 0 0 1 0-6h15M5 3a3 3 0 0 0-3 3v12m6-10h7m-7 4h5"/>',
    inbox:'<path d="M5 4h14l3 15H2Zm-2 9h6l1 3h4l1-3h6"/>',
    plate:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6"/><path d="M10 7c4-1 6 2 5 5"/>',
    note:'<path d="M4 3h16v18H4zm4 5h8m-8 4h8m-8 4h5"/>',
    shield:'<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Zm-4 9 3 3 5-6"/>'
  };
  paths.report=paths.chart;paths.recipe=paths.book;paths.training=paths.people;
  function icon(name,size){return '<svg width="'+(size||22)+'" height="'+(size||22)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.note)+'</svg>';}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  var timer;
  function toast(message){var el=document.getElementById('design-toast');if(!el){el=document.createElement('div');el.id='design-toast';el.className='design-toast';el.setAttribute('role','status');document.body.appendChild(el);}el.textContent=message;el.hidden=false;clearTimeout(timer);timer=setTimeout(function(){el.hidden=true;},3300);}
  window.Design={icon:icon,toast:toast,esc:esc};
  var top=document.getElementById('book-top');
  if(top)top.innerHTML='<header class="book-top"><div class="book-top-inner"><a href="#" class="book-brand" data-global="Kitchen home"><img src="../../icon.svg" alt=""><span><small>Leichhardt Hotel</small><strong>Kitchen Book</strong></span></a><div class="book-top-actions"><span class="book-top-place">Chef’s corner</span><button class="book-round notice" aria-label="Shift pings" data-global="Shift pings">'+icon('bell',21)+'</button><button class="book-round current" aria-label="Chef menu" aria-pressed="true" data-global="Chef menu">'+icon('chef',23)+'</button></div></div></header>';
  if(top){var note=document.createElement('div');note.className='design-study-note';note.setAttribute('role','note');note.textContent='Interactive design study · Example data · Changes stay in this tab';top.prepend(note);}
  var nav=document.getElementById('book-nav');if(nav)nav.innerHTML='<nav class="book-nav" aria-label="Kitchen navigation">'+[['book','Recipes'],['clipboard','Prep'],['orders','Orders'],['waste','Waste'],['transfers','Transfers'],['guides','Guides']].map(function(x){return '<button data-global="'+x[1]+'">'+icon(x[0],22)+'<span>'+x[1]+'</span></button>';}).join('')+'</nav>';
  document.addEventListener('click',function(e){var el=e.target.closest('[data-global]');if(!el)return;e.preventDefault();toast(el.getAttribute('data-global')+' · navigation preview');});
})();
