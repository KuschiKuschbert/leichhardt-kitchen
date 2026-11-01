(function () {
  'use strict';
  var choice = 'a', size = 'phone', sizes = { phone: [390,844], tablet: [768,1024], desktop: [1280,900] };
  var copy = {
    a: ['A / SHIFT CARD', 'Small enough for service.', 'One compact strip puts the next useful step beside your name and section. Expand it when you want the detail.', 'Best balance of encouragement and uninterrupted prep. Team context stays in the background.'],
    b: ['B / SECTION BOARD', 'A shared reason to check.', 'Three example sections share a small, cooperative check board. Open My contribution for your own detail.', 'Stronger team visibility. It needs an explicit section plan and a safe shared aggregate; individual rankings stay out.'],
    c: ['C / CRAFT BOOK', 'A private page of useful habits.', 'Prep shows one quiet link. Open your book to see useful records and follow-through, with restrained ink marks for recorded app days.', 'The calmest main screen. Progress is less visible until someone chooses to open their book.']
  };
  function fit() {
    var area = document.getElementById('frame-area'), dimensions = sizes[size], scale = Math.min(1, Math.max(240, area.clientWidth - 32) / dimensions[0]);
    document.querySelectorAll('.proposal-frame-size').forEach(function (box) { box.style.width = dimensions[0] * scale + 'px'; box.style.height = dimensions[1] * scale + 'px'; var frame=box.querySelector('iframe'); frame.style.width=dimensions[0]+'px'; frame.style.height=dimensions[1]+'px'; frame.style.transform='scale('+scale+')'; });
  }
  function select(next, focus) {
    choice = next;
    document.querySelectorAll('[data-design]').forEach(function (button) { var active=button.dataset.design===choice;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;if(active&&focus)button.focus(); });
    ['a','b','c'].forEach(function (id) {document.getElementById('panel-'+id).hidden=id!==choice;});
    var text=copy[choice];['concept-kicker','concept-heading','concept-description','concept-tradeoff'].forEach(function (id,i) {document.getElementById(id).textContent=text[i];});
    document.getElementById('full-preview').href=choice+'.html'; fit();
  }
  document.addEventListener('click',function(e){var tab=e.target.closest('[data-design]'), view=e.target.closest('[data-size]');if(tab)select(tab.dataset.design,false);if(view){size=view.dataset.size;document.querySelectorAll('[data-size]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.size===size));});fit();}});
  document.querySelector('[role=tablist]').addEventListener('keydown',function(e){var keys=['a','b','c'],i=keys.indexOf(choice),n;if(e.key==='ArrowRight')n=keys[(i+1)%3];if(e.key==='ArrowLeft')n=keys[(i+2)%3];if(e.key==='Home')n='a';if(e.key==='End')n='c';if(n){e.preventDefault();select(n,true);}});
  if(window.ResizeObserver)new ResizeObserver(fit).observe(document.getElementById('frame-area'));else window.addEventListener('resize',fit);
  select('a', false);
})();
