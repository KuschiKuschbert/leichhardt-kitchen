/*
  The three band designs as previews, drawn over the real book in the click tests' stand-in (19 Nov 2026,
  docs/band-options/brief.md). Not loaded by the book. scripts in the brief run it in a page that already shows the
  function band and the order cut-off bar, after the book has drawn them, and read every word from what the book drew,
  so a preview never shows a function or a supplier the book does not.
    window.bandVariant('today')  leaves the book as it is
    window.bandVariant('a')      Folded until food is close: the book's own fold, by the clock (the caller taps Hide
                                 when the next round is more than an hour away; the cut-off bar is the book's own)
    window.bandVariant('b')      One split bar: the cut-off and the functions side by side, the closer one wider
    window.bandVariant('c')      Tighter rows: each function on one 44 px line, the band's buttons beside its label,
                                 the cut-off on one line
    window.bandVariant('mix')    The council's blend: A's fold by the clock while food is more than an hour away, C's
                                 one-line rows once the band is open, and the cut-off on one labelled line, the time
                                 before the name (B's rule)
  Colours follow docs/surface-colours.md: charcoal for live bands, orange times and labels, the orange pill in a
  cut-off's last hour, red for a cancelled function. No new colour.
*/
window.bandVariant = function (v) {
  if (v === 'today' || v === 'a') return { ok: true };
  var fn = document.getElementById('fn-band'), cut = document.getElementById('cut-band');
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var txt = function (e) { return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; };
  // what the book drew: the functions (next first) and the cut-off rows
  var fns = fn && !fn.hidden ? [].slice.call(fn.querySelectorAll('.fn-row')).map(function (r) {
    var b = r.querySelector('.fn-r1 b'), due = r.querySelector('.fn-due'), r2 = r.querySelector('.fn-r2 b');
    var loc = txt(r.querySelector('.fn-r1')).split(' · ').slice(1).join(' · ');
    return { id: r.getAttribute('data-id'), time: txt(due), name: txt(b), loc: loc, what: txt(r2), off: r.classList.contains('is-cancelled') };
  }) : [];
  var label = fn && !fn.hidden ? txt(fn.querySelector('.fn-band-h')) : '';
  var moreN = fn ? +(txt(fn.querySelector('[data-fn="more"]')).match(/\d+/) || [0])[0] : 0;
  var svc = fn && fn.querySelector('a.fn-svc');
  var total = fns.length + moreN;
  var cuts = cut && !cut.hidden ? [].slice.call(cut.querySelectorAll('.cut-row')).map(function (r) {
    var a = r.querySelector('.cut-n'), t = txt(r.querySelector('.cut-t')), by = (t.match(/by (\d\d:\d\d)/) || [])[1] || '', left = (t.match(/in ([^ ]+ [hm]+)/) || [])[1] || '';
    return { name: txt(a), href: a.getAttribute('href'), by: by, left: left, soon: r.classList.contains('is-soon') };
  }) : [];
  // minutes from now to a 24-hour time today (the book's own clock is not needed: the words say it)
  var nowM = (function () { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); })();
  var mins = function (hm) { var m = /^(\d\d):(\d\d)$/.exec(hm || ''); return m ? +m[1] * 60 + +m[2] - nowM : 9999; };
  var css = document.createElement('style');
  css.textContent = [
    '.bv-bar { display: flex; max-width: 1240px; margin: 0 auto; background: var(--bar); color: var(--bar-text); }',
    '.bv-wrap { background: var(--bar); box-shadow: inset 0 -3px 0 var(--accent-ink); }',
    '.bv-half { flex: 1 1 0; min-width: 0; min-height: 52px; display: flex; flex-direction: column; justify-content: center; gap: 1px; padding: 6px 12px 8px; color: var(--bar-text); text-decoration: none; }',
    '.bv-half + .bv-half { border-left: 1px solid rgba(251, 248, 241, 0.22); }',
    '.bv-half.is-near { flex: 0 0 62%; }',
    '.bv-half.is-all { flex: 1 1 100%; }',
    '.bv-eb { font: 700 0.75rem/1.2 var(--display); letter-spacing: 0.12em; text-transform: uppercase; color: var(--bar-accent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
    '.bv-l { font-size: 0.95rem; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
    '.bv-l b { color: var(--bar-text); }',
    '.bv-t { color: var(--bar-accent); font-weight: 700; }',
    '.bv-pill { padding: 0 5px; border-radius: 4px; background: var(--bar-accent); color: var(--bar); letter-spacing: 0.04em; }',
    '.bv-half:focus-visible { outline: 3px solid var(--bar-accent); outline-offset: -3px; }',
    /* C */
    '.cv-top { display: flex; align-items: center; gap: 0.5rem; max-width: 1240px; margin: 0 auto; padding: 4px 0.75rem 0; }',
    '.cv-top .fn-band-h { flex: 1 1 auto; min-width: 0; white-space: nowrap; }',
    '.cv-btn { flex: none; display: inline-flex; align-items: center; min-height: 44px; padding: 0 0.7rem; border: 1.5px solid rgba(251, 248, 241, 0.7); border-radius: var(--r-pick); color: var(--bar-text); background: transparent; font: 600 0.875rem var(--body); text-decoration: none; }',
    '.cv-btn.is-svc { border-color: var(--bar-accent); background: var(--bar-accent); color: var(--bar); }',
    '.cv-fold { flex: none; width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; border: 1.5px solid rgba(251, 248, 241, 0.7); border-radius: 50%; color: var(--bar-text); font-size: 1.35rem; }',
    '.cv-list { list-style: none; max-width: 1240px; margin: 0 auto; padding: 0 0.75rem 6px; }',
    '.cv-row { display: flex; align-items: center; gap: 0.45rem; min-height: 44px; border-top: 1px solid rgba(251, 248, 241, 0.16); white-space: nowrap; overflow: hidden; }',
    '.cv-row:first-child { border-top: 0; }',
    '.cv-row .bv-t { flex: none; }',
    '.cv-n { flex: 0 0 auto; max-width: 60%; overflow: hidden; text-overflow: ellipsis; font-weight: 700; }',
    '.cv-w { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; color: rgba(251, 248, 241, 0.82); }',
    '.cv-cut { display: flex; align-items: center; gap: 0.45rem; max-width: 1240px; margin: 0 auto; min-height: 48px; padding: 0 0.75rem; white-space: nowrap; overflow: hidden; }',
    '.cv-pill { flex: none; margin-left: auto; font: 700 0.8rem/1.6 var(--display); letter-spacing: 0.06em; text-transform: uppercase; }',
    '.cv-left { flex: none; margin-left: auto; color: rgba(251, 248, 241, 0.82); }',
    '.cv-cut .bv-eb { flex: none; }',
    '.cv-cut .cut-n { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; color: var(--bar-text); font-weight: 700; min-height: 44px; display: inline-flex; align-items: center; }'
  ].join('\n');
  document.head.appendChild(css);
  var place = fn || cut; if (!place) return { ok: false, why: 'no bands' };
  if (v === 'b') {
    var halves = [];
    if (cuts.length) {
      var c = cuts[0], moreC = cuts.length > 1 ? ' +' + (cuts.length - 1) : '';
      halves.push({ m: mins(c.by), h: '<a class="bv-half bv-cut" href="' + esc(c.href) + '"><span class="bv-eb">' + (c.soon ? 'Order now · <span class="bv-pill">in ' + esc(c.left) + '</span>' : 'Order by') + (moreC ? ' · ' + cuts.length + ' suppliers' : '') + '</span>' +
        '<span class="bv-l"><span class="bv-t">' + esc(c.by) + '</span> <b>' + esc(c.name) + '</b></span></a>' });
    }
    if (fns.length) {
      var f = fns[0];
      halves.push({ m: mins(f.time), h: '<a class="bv-half bv-fn" href="#/fn"><span class="bv-eb">' + (cuts.length ? 'Functions · ' + total : esc(label || 'Functions') + ' · ' + total + ' on') + '</span>' +
        '<span class="bv-l"><span class="bv-t">' + esc(f.time) + '</span> <b>' + esc(f.name) + '</b>' + (cuts.length ? '' : ' · ' + esc(f.what)) + '</span></a>' });
    }
    if (halves.length === 1) halves[0].h = halves[0].h.replace('class="bv-half', 'class="bv-half is-all');
    else { var near = halves[0].m <= halves[1].m ? 0 : 1; halves[near].h = halves[near].h.replace('class="bv-half', 'class="bv-half is-near'); }
    var bar = document.createElement('div');
    bar.className = 'bv-wrap'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Now: order cut-off and functions');
    bar.innerHTML = '<div class="bv-bar">' + halves.map(function (x) { return x.h; }).join('') + '</div>';
    place.parentNode.insertBefore(bar, place);
    if (fn) fn.remove(); if (cut) cut.remove();
    return { ok: true };
  }
  if (v === 'c' || v === 'mix') {
    var folded = !!(fn && fn.querySelector('.fn-band-top.is-fold'));
    if (fn && fns.length && !(v === 'mix' && folded)) {
      var w = document.createElement('div');
      w.className = 'fn-band'; w.setAttribute('role', 'region'); w.setAttribute('aria-label', 'Functions');
      w.innerHTML = '<div class="cv-top"><h2 class="fn-band-h">Functions</h2>' + (svc ? '<a class="cv-btn is-svc" href="#/fn/now">Service view</a>' : '') +
        (moreN ? '<button type="button" class="cv-btn">+' + moreN + ' more</button>' : '') + '<span class="cv-fold" aria-hidden="true">−</span></div>' +
        '<ul class="cv-list">' + fns.map(function (x) { return '<li class="cv-row"><span class="bv-t">' + esc(x.time) + '</span><span class="cv-n">' + esc(x.name) + '</span><span class="cv-w">' + esc(x.what) + (x.loc ? ' · ' + esc(x.loc) : '') + '</span></li>'; }).join('') + '</ul>';
      fn.parentNode.insertBefore(w, fn); fn.remove();
    }
    if (cut && cuts.length && v === 'mix') {
      var km = document.createElement('div');
      km.className = 'cut-band'; km.setAttribute('role', 'region'); km.setAttribute('aria-label', 'Order cut-offs');
      km.innerHTML = cuts.map(function (c) { return '<div class="cv-cut"><span class="bv-eb">' + (c.soon ? 'Order now' : 'Order by') + '</span><span class="bv-t">' + esc(c.by) + '</span><a class="cut-n" href="' + esc(c.href) + '">' + esc(c.name) + '</a>' +
        (c.soon ? '<span class="bv-pill cv-pill">in ' + esc(c.left) + '</span>' : '<span class="cv-left">in ' + esc(c.left) + '</span>') + '</div>'; }).join('');
      cut.parentNode.insertBefore(km, cut); cut.remove();
      return { ok: true };
    }
    if (cut && cuts.length) {
      var k = document.createElement('div');
      k.className = 'cut-band'; k.setAttribute('role', 'region'); k.setAttribute('aria-label', 'Order cut-offs');
      k.innerHTML = cuts.map(function (c) { return '<div class="cv-cut"><span class="bv-t">' + esc(c.by) + '</span><a class="cut-n" href="' + esc(c.href) + '">' + esc(c.name) + '</a>' +
        '<span class="bv-pill cv-pill">' + (c.soon ? 'Order now · in ' + esc(c.left) : 'Order by') + '</span></div>'; }).join('');
      cut.parentNode.insertBefore(k, cut); cut.remove();
    }
    return { ok: true };
  }
  return { ok: false, why: 'unknown ' + v };
};
