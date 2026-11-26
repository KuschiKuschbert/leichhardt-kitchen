/* The mix's form, as the build would draw it in js/fnedit.js: three plain wrappers in the page's own order (The function,
   then Platters and When the platters go out, then the notes and the kitchen comment), so two rows hold both columns and no
   gap opens. Below 1150 px the wrappers take no room (display: contents), so phones and the tablet are as today. A preview
   step only: it runs once after the page draws, and the pictures and checks are taken before any redraw. */
(() => {
  const w = document.querySelector('#fe-root .fe-wrap'); if (!w || !w.querySelector(':scope > .fe-bar') || w.querySelector(':scope > .fe-body')) return;
  const kid = t => [...w.children].find(e => e.matches('.set-block') && t(e));
  const fn = kid(e => e.querySelector('#fe-name')), plat = kid(e => e.querySelector('.fe-lines')), when = kid(e => e.querySelector('.fe-mode')),
    notes = kid(e => e.querySelector('#fe-notes')), kc = kid(e => e.matches('.fe-kcb'));
  if (!fn || !plat || !when || !notes || !kc) return;
  const div = c => { const d = document.createElement('div'); d.className = c; return d; }, body = div('fe-body'), out = div('fe-out'), side = div('fe-side');
  w.insertBefore(body, fn); out.append(plat, when); side.append(notes, kc); body.append(fn, out, side);
})();
