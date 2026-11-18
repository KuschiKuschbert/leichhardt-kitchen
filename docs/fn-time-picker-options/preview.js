/* Preview only (18 Nov 2026): the "when" parts of the New function form in three designs for the time boxes.
   Not loaded by the book. Synthetic data. The page frame, the top bar and the platter lines are left out. */
(function () {
  var D = document.body.getAttribute('data-design'), S = location.hash.slice(1);
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  // the one reader: never guesses morning or evening
  function read(v) {
    var t = String(v || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!t) return { k: 'empty' };
    var ap = /(am|pm|a|p)$/.exec(t); if (ap) t = t.slice(0, -ap[1].length);
    var m = /^(\d{1,2})(?:[:.h]?(\d{2}))?$/.exec(t);
    if (!m) return { k: 'bad', v: v };
    var lead0 = /^0\d/.test(m[1]), h = +m[1], mi = m[2] == null ? 0 : +m[2];
    if (m[2] == null && m[1].length > 2) return { k: 'bad', v: v };
    if (h > 23 || mi > 59) return { k: 'bad', v: v };
    if (ap) { if (h < 1 || h > 12) return { k: 'bad', v: v }; var pm = ap[1][0] === 'p'; h = h % 12 + (pm ? 12 : 0); return { k: 'ok', t: pad(h) + ':' + pad(mi) }; }
    if (h >= 1 && h <= 11 && !lead0) return { k: 'amb', a: pad(h) + ':' + pad(mi), p: pad(h + 12) + ':' + pad(mi) };
    return { k: 'ok', t: pad(h) + ':' + pad(mi) };
  }
  function part(t) { var h = +t.slice(0, 2); return h < 5 ? 'after midnight' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; }
  function sayHTML(r, small) {
    if (r.k === 'ok') return MIX ? '' : '<span class="pv-say"><b>' + r.t + '</b> ' + part(r.t) + '</span>';
    if (r.k === 'amb') return '<span class="pv-say is-ask">Morning or evening?</span><span class="pv-amb"><button type="button" class="chip" data-pick="' + r.a + '">' + r.a + ' morning</button><button type="button" class="chip" data-pick="' + r.p + '">' + r.p + ' evening</button></span>';
    if (r.k === 'bad') return '<span class="pv-say is-bad" role="alert">Can\'t read "' + esc(r.v) + '". Type it like 1830.</span>';
    return small || MIX ? '' : '<span class="pv-say">Type it like 1830 or 6:30pm</span>';
  }
  // A: the device's own clock box, no drop-down forced on a click, the 24-hour time said under it
  function nativeBox(id, v, label, hidden) {
    return (hidden ? '<label class="visually-hidden" for="' + id + '">' + label + '</label>' : '') + '<input id="' + id + '" class="search fe-time" type="time" step="60" value="' + v + '">' +
      '<span class="pv-say pv-kit">Kitchen sees <b>' + (v || 'nothing yet') + '</b></span>';
  }
  // B and C: a typed box with the time said back beside it
  function typedBox(id, v, label, hidden) {
    var r = read(v);
    return (hidden ? '<label class="visually-hidden" for="' + id + '">' + label + '</label>' : '') + '<span class="pv-tbox"><input id="' + id + '" class="search fe-time pv-typed' + (r.k === 'amb' ? ' is-ask' : r.k === 'bad' ? ' is-bad' : '') + '" type="text" inputmode="numeric" autocomplete="off" placeholder="1830" value="' + esc(v) + '"' + (r.k === 'bad' ? ' aria-invalid="true"' : '') + '>' +
      '<span class="pv-out" aria-live="polite">' + sayHTML(r, hidden) + '</span></span>';
  }
  var box = D === 'a' ? nativeBox : typedBox;
  var MIX = D === 'm', LIST = D === 'd' || MIX;
  var start = S === 'amb' ? '630' : S === 'bad' ? '183' : S === 'empty' ? '' : '18:00';
  var rounds = [['18:00', 2, 2], ['18:30', 2, 2], ['19:00', 2, 2]];
  function grid(hand) {
    var rows = rounds.map(function (r, i) {
      var t = D === 'c' && !hand ? '<span class="pv-rt"><b>' + r[0] + '</b></span>' : box('fe-rt' + i, r[0], 'Round ' + (i + 1) + ' time', true);
      return '<tr><th scope="row"><span class="fe-rn">' + (i + 1) + '</span>' + t +
        '<label class="visually-hidden" for="fe-rn' + i + '">Round ' + (i + 1) + ' note</label><input id="fe-rn' + i + '" class="search fe-rnote" placeholder="Note (optional)" maxlength="80"></th>' +
        '<td><input class="search fe-num" type="number" value="' + r[1] + '" aria-label="Pizza, round ' + (i + 1) + '"></td><td><input class="search fe-num" type="number" value="' + r[2] + '" aria-label="Antipasto, round ' + (i + 1) + '"></td><td><b>4</b></td></tr>';
    }).join('');
    return '<div class="fn-tw"><table class="fn-table fe-grid"><thead><tr><th scope="col">Round</th><th scope="col">Pizza</th><th scope="col">Antipasto</th><th scope="col">Total</th></tr></thead><tbody>' + rows +
      '<tr class="fn-tot"><th scope="row">Placed of booked</th><td class="is-ok"><b>6 of 6</b></td><td class="is-ok"><b>6 of 6</b></td><td></td></tr></tbody></table></div>';
  }
  function field(id, label, inner, hint) { return '<div class="field fe-f"><label class="label" for="' + id + '">' + label + '</label>' + inner + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>'; }
  var startF = field('fe-startT', 'Event start', '<div class="fe-gu pv-gu">' + box('fe-startT', start, 'Event start') + '<label class="a-check"><input type="checkbox"> TBC</label></div>');
  var when;
  if (D === 'c') {
    var hand = S === 'hand';
    when = '<div class="fe-row2">' + field('fe-foodDate', 'First round on', '<input id="fe-foodDate" class="search" type="date" value="2026-11-21">') +
      '<div class="field fe-f"><span class="label">First round at</span><p class="pv-follow"><b>18:00</b>, with the event start. <button type="button" class="linkish">Different time</button></p></div></div>' +
      '<div class="fe-row2">' + field('fe-n', 'Rounds', '<input id="fe-n" class="search" type="number" value="3" min="2" max="8">') +
      '<div class="field fe-f"><span class="label" id="pv-every">Every</span><div class="pv-chips" role="group" aria-labelledby="pv-every">' + ['15', '20', '30', '45'].map(function (g) { return '<button type="button" class="chip" aria-pressed="' + (g === '30') + '">' + g + ' min</button>'; }).join('') + '<button type="button" class="chip">Other</button></div></div></div>' +
      '<p class="hint">Rounds at 18:00, 18:30 and 19:00. ' + (hand ? 'Times set by hand: changing the first round or Every asks before it moves them. <button type="button" class="linkish">Work them out again</button>' : '<button type="button" class="linkish" data-hand="1">Change a round\'s time</button>') + '</p>' + grid(hand);
  } else {
    when = '<div class="fe-row2">' + field('fe-foodDate', 'First round on', '<input id="fe-foodDate" class="search" type="date" value="2026-11-21">') +
      field('fe-foodT', 'First round at', box('fe-foodT', '18:00', 'First round at'), 'Same as the event start until you change it.') + '</div>' +
      '<div class="fe-row2">' + field('fe-n', 'Rounds', '<input id="fe-n" class="search" type="number" value="3">') + field('fe-gap', 'Minutes between rounds', '<input id="fe-gap" class="search" type="number" value="30">') + '</div>' +
      '<p class="hint">Split evenly, earlier rounds first (5 over 3 is 2, 2, 1). Type in the grid to split by hand. <button type="button" class="linkish">Split evenly again</button></p>' + grid(false);
  }
  var names = { a: 'A. Keep the clock, say the time', b: 'B. Type it, the book reads it', c: 'C. One time, the rounds follow', d: 'D. Type it or pick from a list', m: 'Mix. B trimmed, with D\'s list' };
  document.getElementById('fe-root').innerHTML = '<div class="fe-wrap"><p class="pv-banner">Preview ' + names[D] + '. Synthetic data; the top bar and platter lines are left out.</p>' +
    '<div class="fe-head"><h2 id="rtitle">New function</h2><div class="btn-row"><span class="fn-tag">Draft: the kitchen does not see it</span><button type="button" class="btn">Print function</button></div></div>' +
    '<section class="set-block"><span class="label">The function</span>' + field('fe-name', 'Name or reference', '<input id="fe-name" class="search" value="Smith 50th">') +
    '<div class="fe-row2">' + field('fe-date', 'Date', '<input id="fe-date" class="search" type="date" value="2026-11-21">') + startF + '</div>' +
    '<div class="fe-row2">' + field('fe-guests', 'Guests', '<div class="fe-gu"><input id="fe-guests" class="search fe-num" type="number" value="60"><label class="a-check"><input type="checkbox"> Not known yet</label></div>') + field('fe-loc', 'Room, area or table (optional)', '<input id="fe-loc" class="search" value="Beer garden">') + '</div></section>' +
    '<section class="set-block"><span class="label">Platters</span><p class="hint">6 Pizza Platter, 6 Antipasto Platter (unchanged, left out of the preview).</p></section>' +
    '<section class="set-block"><span class="label">When the platters go out</span><div class="seg fe-mode" role="radiogroup" aria-label="How the platters go out"><button type="button" class="seg-b" role="radio" aria-checked="false">All at once</button><button type="button" class="seg-b" role="radio" aria-checked="true">Staggered</button></div>' + when + '</section>' +
    '<div class="fe-bar"><div class="fe-bar-t"><b>12 platters</b> · 3 rounds' + (read(start).k === 'ok' ? ' from 18:00' : ', start time to come') + ' · 60 guests</div></div><div class="btn-row fe-btns"><button type="button" class="btn dark">Check and confirm</button><button type="button" class="btn">Save draft</button></div></div>';
  // live: say the time back as it is typed, set it on leaving the box, take a morning or evening pick
  document.addEventListener('input', function (e) {
    if (!e.target.classList.contains('pv-typed')) return;
    var r = read(e.target.value), out = e.target.parentNode.querySelector('.pv-out');
    if (MIX) { e.target.classList.remove('is-ask', 'is-bad'); e.target.removeAttribute('aria-invalid'); var lst = (e.target.id === 'fe-startT' || e.target.id === 'fe-foodT') && window.matchMedia('(min-width: 768px)').matches;
      out.innerHTML = lst || !e.target.value.trim() ? '' : '<span class="pv-say">' + (r.k === 'ok' ? '<b>' + r.t + '</b> ' + part(r.t) : r.k === 'amb' ? r.a + ' or ' + r.p + '?' : 'Keep typing, like 1830') + '</span>'; return; }
    e.target.classList.toggle('is-ask', r.k === 'amb'); e.target.classList.remove('is-bad'); e.target.removeAttribute('aria-invalid');
    out.innerHTML = r.k === 'bad' ? '<span class="pv-say">Keep typing, like 1830</span>' : sayHTML(r, e.target.id !== 'fe-startT' && e.target.id !== 'fe-foodT');
  });
  document.addEventListener('focusout', function (e) {
    if (!e.target.classList.contains('pv-typed')) return;
    var r = read(e.target.value), out = e.target.parentNode.querySelector('.pv-out');
    if (r.k === 'ok') e.target.value = r.t;
    e.target.classList.toggle('is-bad', r.k === 'bad'); e.target.classList.toggle('is-ask', r.k === 'amb'); if (r.k === 'bad') e.target.setAttribute('aria-invalid', 'true');
    out.innerHTML = sayHTML(r, e.target.id !== 'fe-startT' && e.target.id !== 'fe-foodT');
  });
  // keep the box focused while a morning or evening chip is pressed, so leaving the box does not redraw the chip away
  document.addEventListener('mousedown', function (e) { if (e.target.closest('[data-pick]')) e.preventDefault(); });
  document.addEventListener('focusout', function (e) { if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-pick]')) e.stopImmediatePropagation(); }, true);
  document.addEventListener('click', function (e) {
    var p = e.target.closest('[data-pick]');
    if (p) { var tb = p.closest('.pv-tbox'), i = tb.querySelector('input'); i.value = p.getAttribute('data-pick'); i.classList.remove('is-ask'); i.dispatchEvent(new Event('change', { bubbles: true })); tb.querySelector('.pv-out').innerHTML = sayHTML(read(i.value)); i.focus(); return; }
    if (e.target.closest('[data-hand]')) { location.hash = 'hand'; location.reload(); }
    var c = e.target.closest('.pv-chips .chip'); if (c) [].forEach.call(c.parentNode.children, function (x) { x.setAttribute('aria-pressed', String(x === c)); });
  });
  // D: B's box with a list of times under it while it has focus, every 15 minutes, narrowed by what is typed
  if (LIST) {
    var all = []; for (var q = 0; q < 96; q++) all.push(pad(Math.floor(q / 4)) + ':' + pad(q % 4 * 15));
    var pop = null, cur = -1;
    function close() { if (pop) { pop.remove(); pop = null; } }
    function listy(inp) { return (inp.id === 'fe-startT' || inp.id === 'fe-foodT') && window.matchMedia('(min-width: 768px)').matches; }
    function show(inp) {
      if (!listy(inp)) { close(); return; }
      var v = inp.value, r = read(v), d = v.replace(/\D/g, ''), items, near = '';
      if (r.k === 'amb') items = [r.a, r.p];
      else if (r.k === 'ok') { items = all; near = r.t.slice(0, 3) + pad(Math.floor(+r.t.slice(3) / 15) * 15); }
      else if (d) items = all.filter(function (t) { var h = +t.slice(0, 2), k = t.replace(':', ''), k12 = String(h % 12 || 12) + t.slice(3); return k.indexOf(d) === 0 || k12.indexOf(d) === 0; });
      else { items = all; near = ''; }
      if (!items.length) { close(); return; }
      if (!pop) { pop = document.createElement('div'); pop.className = 'pv-list'; pop.setAttribute('role', 'listbox'); inp.parentNode.appendChild(pop); }
      pop.innerHTML = items.map(function (t) { return '<button type="button" role="option" class="pv-li' + (t === near ? ' is-near' : '') + '" data-pick="' + t + '" tabindex="-1"><b>' + t + '</b><span>' + part(t) + '</span></button>'; }).join('');
      cur = -1; var n = pop.querySelector('.is-near') || (!d && pop.querySelector('[data-pick="18:00"]')); if (n) pop.scrollTop = n.offsetTop - pop.clientHeight / 2 + n.offsetHeight / 2; else pop.scrollTop = 0;
    }
    document.addEventListener('focusin', function (e) { if (e.target.classList.contains('pv-typed')) show(e.target); });
    document.addEventListener('input', function (e) { if (e.target.classList.contains('pv-typed')) show(e.target); });
    document.addEventListener('focusout', function (e) { if (e.target.classList.contains('pv-typed') && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.pv-list'))) close(); });
    document.addEventListener('keydown', function (e) {
      if (!pop || !e.target.classList.contains('pv-typed')) return;
      var o = pop.querySelectorAll('.pv-li');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (cur < 0) { var n = pop.querySelector('.is-near'); cur = n ? [].indexOf.call(o, n) : 0; } else cur = Math.max(0, Math.min(o.length - 1, cur + (e.key === 'ArrowDown' ? 1 : -1))); [].forEach.call(o, function (x, i) { x.classList.toggle('is-cur', i === cur); }); o[cur].scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter' && cur >= 0) { e.preventDefault(); o[cur].click(); }
      else if (e.key === 'Escape') close();
    });
    document.addEventListener('click', function (e) { if (e.target.closest('.pv-list [data-pick]')) setTimeout(close, 0); }, true);
  }
})();
