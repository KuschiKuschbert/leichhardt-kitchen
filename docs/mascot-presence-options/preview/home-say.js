/* Review-only. The owner's ask (17 Nov 2026): "replace the welcome text with the mascot and keep the randomiser, so
   instead of the big welcome home message, we just have the mascot talk to you". Draws it over the real book: the
   heading (#rtitle, its words and randomiser unchanged) becomes his speech bubble, and he stands on its left, his
   feet on the date line, the largest of 72 x 96, 64 x 85 or 48 x 64 px that stays under the top bar. A build would
   do this in js/app.js (the heading's class) and js/mascot.js (his place). Nothing is saved and nothing is read. */
(() => {
  'use strict';
  if (window.LK_SAY) return;
  let on = false;
  function place() {
    const host = document.querySelector('#main.wall-main'), h = host && host.querySelector('#rtitle.hm-welcome'), d = host && host.querySelector('.wall-date'), btn = host && host.querySelector('.mascot');
    if (!h || !d) return;
    h.classList.toggle('pv-say', on); d.classList.toggle('pv-say-date', on);
    if (!on || !btn) return;
    const mb = host.getBoundingClientRect(), db = d.getBoundingClientRect(), hb = h.getBoundingClientRect(), bar = document.querySelector('.wtop');
    const roof = bar ? bar.getBoundingClientRect().bottom + 4 : mb.top, room = hb.left - mb.left - parseFloat(getComputedStyle(host).paddingLeft) - 10;
    const left = mb.left + parseFloat(getComputedStyle(host).paddingLeft);
    for (const w of [72, 64, 48]) {
      const ht = Math.round(w * 4 / 3), top = db.bottom - ht;
      if (w > room || top < roof) continue;
      btn.hidden = false; btn.style.width = w + 'px'; btn.style.height = ht + 'px'; btn.style.left = (left - mb.left) + 'px'; btn.style.top = (top - mb.top) + 'px'; btn.setAttribute('data-spot', 'say');
      return;
    }
  }
  addEventListener('resize', () => setTimeout(place, 50));
  // js/mascot.js places him again on every resize of Home: put him back beside his words each time it does
  new MutationObserver(ms => { if (on && ms.some(m => m.target.classList && m.target.classList.contains('mascot') && m.target.getAttribute('data-spot') !== 'say')) place(); })
    .observe(document.body, { attributes: true, subtree: true, attributeFilter: ['data-spot', 'style', 'hidden'] });
  window.LK_SAY = { set(x) { on = !!x; place(); }, place };
})();
