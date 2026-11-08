document.addEventListener('click', function (e) {
  const button=e.target.closest('[data-stage]'); if(!button)return;
  document.querySelectorAll('[data-stage]').forEach(x=>x.setAttribute('aria-pressed',String(x===button)));
  document.querySelectorAll('iframe[data-design]').forEach(x=>x.src='preview.html?design='+x.dataset.design+'&stage='+button.dataset.stage+(button.dataset.view?'&view='+button.dataset.view:''));
});
