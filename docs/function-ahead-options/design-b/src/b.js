/* Design B preview only: opens a day's run-up card in place, and folds the Prep This week line. No reads, no writes. */
document.addEventListener('click', function (e) {
  var day = e.target.closest('.ru-fn');
  if (day) {
    var id = day.getAttribute('aria-controls'), card = document.getElementById(id), open = day.getAttribute('aria-expanded') === 'true';
    document.querySelectorAll('.ru-fn').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    document.querySelectorAll('.ru-card').forEach(function (c) { c.hidden = true; });
    if (!open && card) { card.hidden = false; day.setAttribute('aria-expanded', 'true'); }
    return;
  }
  var close = e.target.closest('.ru-close');
  if (close) {
    var c = close.closest('.ru-card'); c.hidden = true;
    var b = document.querySelector('.ru-fn[aria-controls="' + c.id + '"]');
    if (b) { b.setAttribute('aria-expanded', 'false'); b.focus(); }
    return;
  }
  var sum = e.target.closest('.ru-wsum');
  if (sum) {
    var w = sum.closest('.ru-week'), on = sum.getAttribute('aria-expanded') !== 'true';
    sum.setAttribute('aria-expanded', String(on));
    w.querySelectorAll('[data-ru-fold]').forEach(function (x) { x.hidden = !on; });
    var cue = sum.querySelector('.ru-wcue'); if (cue) cue.textContent = on ? 'Hide' : 'Show';
  }
});
