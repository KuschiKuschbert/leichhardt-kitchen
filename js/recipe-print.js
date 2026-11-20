/* Print cards (head chef 19 Nov 2026, docs/print-cards-options/brief.md, the chosen mix): paper copies of the recipe
   cards for the head chef, sous chefs and admin. Lazy: js/manage.js loads it for #/manage/print and
   #/manage/print/<recipe id>; never in the saved shell.
   Reads nothing from Firestore: the recipes, drawings and allergens are the ones the book already holds, with the head
   chef's changes laid over (js/overlay.js). Writes nothing. The ticked cards stay in memory only; the paper choice is
   kept on this device (lk.rcp.paper, a preference: it never goes out of date).
   Every page repeats the card number, name, page x of y, the allergens in a boxed band, and "Printed <time>. Amounts as
   written in the book (x1). Check the book for the latest." A card that is just over a page takes slightly smaller type
   (92 %, never under 8.5 pt on A4 or 7.9 pt on A5) before it splits; a list never breaks through a row or a step, a
   short method section moves whole, the plate key stays with its drawing, and each card starts on a new page. */
(function () {
  'use strict';
  var A = window.LK_APP, X = window.LK_RX, ART = window.LK_ART, D = window.LK_DATA, T = window.LK_TIME;
  // a search box as the Recipes pill (the consistency sweep, step 3, 20 Nov 2026); an older js/app.js draws the plain box
  function findPill(input) { return A && A.findWrap ? A.findWrap(input) : input; }
  var esc = A.esc;
  var PAPERS = [['a4p', 'A4 upright', 210, 297], ['a4l', 'A4 sideways', 297, 210], ['a5l', 'A5 sideways', 210, 148]];
  var KEY = 'lk.rcp.paper';
  var S = { root: null, ticked: {}, q: '', paper: 'a4p', status: '', busy: false, run: 0, counts: {}, counting: '' };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  (function () { var p = lsGet(KEY); if (PAPERS.some(function (x) { return x[0] === p; })) S.paper = p; })();
  function paperOf(k) { return PAPERS.filter(function (x) { return x[0] === k; })[0] || PAPERS[0]; }

  /* ---------- the cards ---------- */
  function all() { return A.recipes().filter(function (r) { return r && r.id; }).slice().sort(function (a, b) { return (parseInt(a.no, 10) || 9999) - (parseInt(b.no, 10) || 9999) || String(a.name).localeCompare(b.name); }); }
  // [square brackets] are unconfirmed: on paper they say "[To come]" once, then what is to come
  function txt(s) {
    return esc(s).replace(/\[([^\]]*)\]/g, function (m, x) {
      x = x.replace(/\s*to come\s*$/i, '');
      return '<span class="rcp-tc">To come</span>' + (!x || /^qty$/i.test(x) ? '' : ' <i>' + x.charAt(0).toLowerCase() + x.slice(1) + '</i>');
    });
  }
  // the book's own allergens (js/app.js works them out from the ingredients and the recipes they use): definite first,
  // then "May contain:" as its own sentence, so a "may" never reads onto a definite allergen
  function allergenLine(r) {
    var t = A.tags(r.id), yes = t.filter(function (a) { return !/\?$/.test(a); }), may = t.filter(function (a) { return /\?$/.test(a); }).map(function (a) { return a.slice(0, -1); });
    // unk: parts nobody checked for allergens (19 Nov 2026): never "None" on paper while one is left
    var unk = A.unchecked ? A.unchecked(r.id) : [];
    var s = t.length ? (yes.length ? 'Contains: ' + yes.join(', ') + '.' : '') + (may.length ? (yes.length ? ' ' : '') + 'May contain: ' + may.join(', ') + '.' : '') : unk.length ? '' : 'None in the ingredients.';
    var miss = A.missing(r.id);
    if (miss.length) s += ' Not complete: ' + miss.join(', ') + (miss.length === 1 ? ' has' : ' have') + ' no card yet, so treat it as possibly any allergen.';
    if (unk.length) s += ' Allergens not checked yet: ' + unk.join(', ') + '. Do not tell a guest it is free from anything.';
    return s.trim();
  }
  // a drawing made in the book ('@<id>') is cleaned again here, every time it is drawn; its frame must be four numbers
  function body(k, raw) { return k && k.charAt(0) === '@' ? X.clean(raw) : raw; }
  function frame(vb, dflt) { return typeof vb === 'string' && /^-?[\d.]+( -?[\d.]+){3}$/.test(vb.trim()) ? vb.trim() : dflt; }
  function plateSVG(r) {
    var pl = r.art && ART.plates[r.art], pan = r.art && ART.pans[r.art];
    if (!pl && !pan) return '';
    var vb = frame(ART.vb && ART.vb[r.art], pl ? '2 16 212 212' : '0 0 200 140'), f = vb.split(' ').map(Number), pins = '';
    if (pl && r.pins && r.pins.length) pins = r.pins.map(function (p, n) {
      var x = +p.x, y = +p.y;
      if (!isFinite(x) || !isFinite(y)) return '';
      x = f[0] + Math.max(0, Math.min(100, x)) / 100 * f[2]; y = f[1] + Math.max(0, Math.min(100, y)) / 100 * f[3];
      var rr = f[2] / 21;
      return '<circle cx="' + x + '" cy="' + y + '" r="' + rr + '" fill="#1c1d1f"/><text x="' + x + '" y="' + (y + rr * 0.45) + '" text-anchor="middle" font-size="' + (rr * 1.35) + '" font-weight="700" fill="#fff" font-family="Barlow, sans-serif">' + (n + 1) + '</text>';
    }).join('');
    return '<svg class="rcp-art" viewBox="' + esc(vb) + '" aria-hidden="true">' + body(r.art, pl || pan) + pins + '</svg>';
  }
  function sideOf(r) { var k = r.side && r.side.charAt(0) === '@' ? r.side : r.id, v = ART.sides && ART.sides[k]; return v ? { k: k, v: v } : null; }
  /* A card as blocks. lane side: drawing with its plate key, safety, tip. lane main: ingredients, side view, method.
     lane full: an extra-wide side view that needs the whole page width. items: a list that may break between rows. */
  function blocks(r) {
    var b = [], drawing = plateSVG(r);
    var key = (r.pins || []).map(function (p, n) { return '<div class="rcp-pin"><b>' + (n + 1) + '</b><span><b>' + esc(p.label || '') + '</b>' + (p.note ? ' ' + txt(p.note) : '') + '</span></div>'; });
    if (drawing) b.push({ lane: 'side', key: 'art', top: '<div class="rcp-h">' + (ART.plates[r.art] ? 'On the plate' : 'In the pan') + '</div>' + drawing, head: 'Plate key', items: key });
    else if (key.length) b.push({ lane: 'side', key: 'pins', head: 'Plate key', items: key });
    b.push({ lane: 'main', key: 'ing', head: 'Ingredients', items: (r.ingredients || []).map(function (i) {
      var linked = i.link && A.byId(i.link);
      return '<div class="rcp-ing"><span class="rcp-q">' + (i.q === '[Qty]' ? '<span class="rcp-tc">To come</span>' : txt(i.q)) + '</span><span class="rcp-n">' + txt(i.name) +
        (linked ? ' <span class="rcp-ref">card ' + esc(linked.no) + '</span>' : i.link ? ' <span class="rcp-ref">card to come</span>' : '') +
        (i.note ? '<span class="rcp-note">' + txt(i.note) + '</span>' : '') + '</span></div>';
    }) });
    var sv = sideOf(r);
    if (sv) {
      var vb = frame(sv.v.viewBox, '0 0 232 176'), w = +vb.split(' ')[2] || 232;
      b.push({ lane: w > 300 ? 'full' : 'main', key: 'sideview', html: '<div class="rcp-blk rcp-side"><div class="rcp-h">From the side</div><svg viewBox="' + esc(vb) + '" style="--vbw:' + w + '" aria-hidden="true">' + body(sv.k, sv.v.body) + '</svg></div>' });
    }
    if (r.safety) b.push({ lane: 'side', key: 'safety', html: '<div class="rcp-blk rcp-safety"><div class="rcp-h">Safety: ' + esc(r.safety.title || '') + '</div>' + txt(r.safety.text || '') + '</div>' });
    if (r.tip) b.push({ lane: 'side', key: 'tip', html: '<div class="rcp-blk rcp-tip"><div class="rcp-h">' + esc(r.tip.title || 'Tip') + '</div>' + txt(r.tip.text || '') + '</div>' });
    if (!(r.sections || []).length) b.push({ lane: 'main', key: 'm', html: '<div class="rcp-blk"><div class="rcp-h">Method</div>Not written up yet. Ask the head chef or sous chef.</div>' });
    (r.sections || []).forEach(function (s, si) {
      b.push({ lane: 'main', key: 'm' + si, head: s.title || 'Method', items: (s.steps || []).map(function (t, n) { return '<div class="rcp-st"><b>' + (n + 1) + '</b><span>' + txt(t) + '</span></div>'; }) });
    });
    return b;
  }
  function stampOf(ms) {
    var d = T.day(ms).split('-'), mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+d[1] - 1];
    return +d[2] + ' ' + mon + ' ' + d[0] + ', ' + T.clock(ms);
  }
  function sheetHTML(r, o, first, n, of, inner) {
    var P = paperOf(o.paper), K = A.KIND || {};
    return '<section class="rcp-sheet rcp-' + o.paper + (o.fit ? ' rcp-fit' : '') + '" style="width:' + P[2] + 'mm;height:' + P[3] + 'mm">' +
      '<header class="rcp-run"><span class="rcp-no">' + esc(r.no || '-') + '</span><div class="rcp-ttl' + (first ? ' rcp-big' : '') + '"><div class="rcp-eb">' + esc((K[r.kind] || '') + (r.forLine ? ' · ' + r.forLine : '')) + '</div><div class="rcp-nm">' + esc(r.name) + '</div>' +
      (first ? '<div class="rcp-yl">' + txt(r.yield || '') + '</div>' + (r.menu ? '<div class="rcp-mn"><b>On the menu:</b> ' + esc(r.menu) + '</div>' : '') : '') + '</div><span class="rcp-pg">Page ' + n + ' of ' + of + '</span></header>' +
      '<div class="rcp-alg"><b>Allergens</b> ' + esc(allergenLine(r)) + '</div>' +
      '<div class="rcp-body">' + inner + '</div>' +
      '<footer class="rcp-foot">Printed ' + esc(o.when) + '. Amounts as written in the book (x1). Check the book for the latest.</footer></section>';
  }
  function regionsFor(first, o) {
    var land = o.paper !== 'a4p';
    // page 1: the drawing, plate key and boxes in a side column, the ingredients then the method in the wide one;
    // later pages: one region, two text columns (an extra-wide side view takes the full width first)
    return first ? [{ cls: 'rcp-sidecol', lanes: ['side'] }, { cls: 'rcp-wide' + (land ? ' rcp-cols' : ''), lanes: ['main'] }] : [{ cls: 'rcp-main rcp-cols', lanes: ['full', 'side', 'main'] }];
  }
  function over(el, room) {
    if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) return true;
    var last = el.lastElementChild; if (!last) return false;
    if (parseInt(getComputedStyle(el).columnCount, 10) > 1) return false;
    return last.getBoundingClientRect().bottom > el.getBoundingClientRect().bottom - room;
  }
  function listHTML(b, items, cont, withTop) {
    return '<div class="rcp-blk rcp-lst">' + (withTop && b.top ? b.top : '') + (items.length ? '<div class="rcp-h">' + esc(b.head) + (cont ? ' <i>(continued)</i>' : '') + '</div>' + items.join('') : '') + '</div>';
  }
  /* Lay one card out in the measuring host. Returns the page bodies, and whether the ingredients split. */
  function paginate(r, o, host, room) {
    var q = blocks(r), pages = [], guard = 0, splitIng = false;
    while (q.length && guard++ < 30) {
      var first = !pages.length, regs = regionsFor(first, o);
      host.innerHTML = sheetHTML(r, o, first, 1, 1, regs.map(function (g) { return '<div class="rcp-reg ' + g.cls + '"></div>'; }).join(''));
      var els = host.querySelectorAll('.rcp-reg');
      regs.forEach(function (g, gi) {
        var el = els[gi];
        for (var k = 0; k < q.length; k++) {
          var b = q[k];
          if (g.lanes.indexOf(b.lane) < 0) continue;
          var before = el.innerHTML;
          if (!b.items) {
            el.insertAdjacentHTML('beforeend', b.html);
            if (over(el, room) && before) { el.innerHTML = before; continue; }
            q.splice(k--, 1); continue;
          }
          var withTop = !!b.top && !b.cont, fit = -1;
          for (var n = 0; n <= b.items.length; n++) {
            if (!n && !withTop) continue;
            el.innerHTML = before + listHTML(b, b.items.slice(0, n), b.cont, withTop);
            if (over(el, room)) break; fit = n;
          }
          // a short method section (4 steps or fewer) moves whole rather than splitting; the plate key stays with its drawing
          if (before && fit < b.items.length && (/^m\d/.test(b.key) && b.items.length <= 4 || b.key === 'art') && !b.cont) fit = -1;
          if (fit < 0 && before) { el.innerHTML = before; continue; }
          if (fit < 0) fit = withTop ? 0 : 1;
          el.innerHTML = before + listHTML(b, b.items.slice(0, fit), b.cont, withTop);
          if (fit < b.items.length) { if (b.key === 'ing') splitIng = true; b.items = b.items.slice(fit); b.cont = true; b.top = ''; }
          else q.splice(k--, 1);
        }
      });
      pages.push(Array.prototype.map.call(els, function (el) { return el.innerHTML ? el.outerHTML : ''; }).join(''));
    }
    return { pages: pages, splitIng: splitIng };
  }
  /* One card: normal type, or the one smaller step if that makes it one page (or keeps the ingredients together). */
  function layCard(r, o, host, room) {
    var best = null;
    [0, 1].some(function (fit) {
      var oo = Object.assign({}, o, { fit: fit }), res = paginate(r, oo, host, room), c = { o: oo, pages: res.pages, whole: !res.splitIng };
      if (!best || c.pages.length < best.pages.length && (c.whole || !best.whole) || c.whole && !best.whole) best = c;
      return c.pages.length === 1;
    });
    return best;
  }
  function cardSheets(r, best) { return best.pages.map(function (b, i) { return sheetHTML(r, best.o, i === 0, i + 1, best.pages.length, b); }).join(''); }
  /* Build the chosen cards into root, a few at a time so a phone stays responsive. After each card is drawn its pages are
     checked where they will print; a page that came out taller than measured is laid out again with more room. */
  function build(ids, o, root, progress) {
    var host = document.createElement('div'); host.className = 'rcp-measure'; root.appendChild(host);
    var out = document.createElement('div'); root.appendChild(out);
    var i = 0, pages = 0, my = ++S.run;
    return new Promise(function (done, fail) {
      function step() {
        if (my !== S.run) { fail(new Error('stopped')); return; }
        var end = Math.min(ids.length, i + 6);
        for (; i < end; i++) {
          var r = A.byId(ids[i]); if (!r) continue;
          var room = 6, best = layCard(r, o, host, room), wrap = document.createElement('div');
          wrap.innerHTML = cardSheets(r, best); out.appendChild(wrap);
          for (var tries = 0; tries < 2 && Array.prototype.some.call(wrap.querySelectorAll('.rcp-reg'), function (el) { return over(el, 0); }); tries++) {
            room += 18; best = layCard(r, o, host, room); wrap.innerHTML = cardSheets(r, best);
          }
          pages += best.pages.length; S.counts[o.paper + ':' + r.id] = best.pages.length;
        }
        if (progress) progress(i, ids.length);
        if (i < ids.length) setTimeout(step, 0); else { host.remove(); done({ cards: ids.length, pages: pages }); }
      }
      step();
    });
  }

  /* ---------- the page in Manage ---------- */
  function groups() {
    var have = {}, out = [];
    all().forEach(function (r) { have[r.id] = true; });
    (D.menuOrder || []).forEach(function (s) { var ids = (s.ids || []).filter(function (id) { return have[id]; }); if (ids.length) out.push({ k: 'm:' + s.title, t: s.title, ids: ids }); });
    var batch = all().filter(function (r) { return r.kind === 'batch' || r.kind === 'component'; }).map(function (r) { return r.id; });
    if (batch.length) out.push({ k: 'batch', t: 'Batch recipes', ids: batch });
    out.push({ k: 'all', t: 'Every card', ids: all().map(function (r) { return r.id; }) });
    return out;
  }
  function ticked() { return all().filter(function (r) { return S.ticked[r.id]; }).map(function (r) { return r.id; }); }
  function known() {
    var ids = ticked(), n = 0;
    for (var i = 0; i < ids.length; i++) { var c = S.counts[S.paper + ':' + ids[i]]; if (!c) return 0; n += c; }
    return n;
  }
  function printLabel() {
    var n = ticked().length, p = known();
    if (!n) return 'Tick a card to print';
    return 'Print ' + n + (n === 1 ? ' card' : ' cards') + (p ? ', ' + p + (p === 1 ? ' page' : ' pages') : '');
  }
  function rowsHTML() {
    var words = S.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var rows = all().filter(function (r) { var h = [r.name, r.no, r.forLine].join(' ').toLowerCase(); return words.every(function (w) { return h.indexOf(w) >= 0; }); });
    return rows.length ? '<ul class="rcp-list">' + rows.map(function (r) {
      var on = !!S.ticked[r.id];
      return '<li><button type="button" class="rcp-row" data-rcp="tick" data-v="' + esc(r.id) + '" aria-pressed="' + on + '"><span class="rcp-box" aria-hidden="true">' + (on ? '✓' : '') + '</span><span class="rcp-cn">' + esc(r.no || '-') + '</span><span class="rcp-rn">' + esc(r.name) + '</span></button></li>';
    }).join('') + '</ul>' : '<p class="hint">No card matches.</p>';
  }
  function html() {
    var n = ticked().length, gs = groups();
    return '<div class="mg-wrap rcp-page"><div class="mg-head"><h2 id="rtitle" tabindex="-1">Print cards</h2>' +
      '<p class="hint">Paper copies of the recipe cards, as they are in the book now. Each card starts on a new page.</p></div>' +
      '<div class="field"><span class="label" id="rcp-gl">Add a group</span><div class="chips scroll" role="group" aria-labelledby="rcp-gl">' + gs.map(function (g) {
        var full = g.ids.every(function (id) { return S.ticked[id]; });
        return '<button type="button" class="chip" data-rcp="group" data-v="' + esc(g.k) + '" aria-pressed="' + full + '">' + esc(g.t) + ' ' + g.ids.length + '</button>';
      }).join('') + '</div></div>' +
      '<p class="rcp-ticked" role="status">' + (n ? n + (n === 1 ? ' card' : ' cards') + ' ticked. <button type="button" class="p-x" data-rcp="none">Untick all</button>' : 'No cards ticked yet. Add a group, or find a card and tick it.') + '</p>' +
      '<div class="field"><label class="visually-hidden" for="rcp-q">Find a card</label>' + findPill('<input id="rcp-q" class="search" type="search" data-rcp-q autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Name or card number" value="' + esc(S.q) + '">') + '</div>' +
      '<div id="rcp-rows">' + rowsHTML() + '</div>' +
      '<div class="rcp-bar sv-dock"><div class="rcp-papers" role="group" aria-label="Paper">' + PAPERS.map(function (p) {
        return '<button type="button" class="rcp-paper rcp-pp-' + p[0] + '" data-rcp="paper" data-v="' + p[0] + '" aria-pressed="' + (S.paper === p[0]) + '"><i aria-hidden="true"></i>' + esc(p[1]) + '</button>';
      }).join('') + '</div>' +
      '<button type="button" class="btn dark rcp-go" data-rcp="print"' + (n && !S.busy ? '' : ' disabled') + '>' + esc(S.busy ? 'Laying out the pages...' : printLabel()) + '</button>' +
      '<p class="rcp-status" role="status" aria-live="polite">' + esc(S.status) + '</p></div></div>';
  }
  function draw() {
    if (!S.root || !S.root.isConnected) return;
    var f = document.activeElement && document.activeElement.id === 'rcp-q', pos = f ? document.activeElement.selectionStart : 0;
    S.root.innerHTML = html();
    if (f) { var q = S.root.querySelector('#rcp-q'); if (q) { q.focus({ preventScroll: true }); try { q.setSelectionRange(pos, pos); } catch (e) {} } }
    count();
  }
  // the page count on Print comes from laying the cards out, not a guess: work out the ones not counted yet, quietly
  function count() {
    var ids = ticked().filter(function (id) { return !S.counts[S.paper + ':' + id]; }), key = S.paper + '|' + ids.join(',');
    if (!ids.length || S.busy || S.counting === key) return;
    S.counting = key;
    var host = document.createElement('div'); host.className = 'rcp-measure rcp-scratch'; document.body.appendChild(host);
    build(ids, { paper: S.paper, when: stampOf(T.now()) }, host).then(function () { host.remove(); if (S.counting === key) { S.counting = ''; var b = S.root && S.root.querySelector('[data-rcp="print"]'); if (b && !S.busy) b.textContent = printLabel(); } },
      function () { host.remove(); if (S.counting === key) S.counting = ''; });
  }
  function say(t) { S.status = t; var el = S.root && S.root.querySelector('.rcp-status'); if (el) el.textContent = t; }
  function print(button) {
    var ids = ticked(); if (!ids.length || S.busy) return;
    var P = paperOf(S.paper), when = stampOf(T.now()), paper = S.paper;
    var root = document.createElement('div'); root.id = 'rc-print'; root.setAttribute('aria-hidden', 'true');
    document.body.appendChild(root);
    S.busy = true; S.counting = ''; say('Laying out ' + ids.length + (ids.length === 1 ? ' card...' : ' cards...')); button.disabled = true; button.textContent = 'Laying out the pages...';
    build(ids, { paper: paper, when: when }, root, function (i, n) { if (n > 12) say('Laying out the cards: ' + i + ' of ' + n + '...'); }).then(function (res) {
      S.busy = false;
      if (!S.root || !S.root.isConnected) { root.remove(); return; }
      var b = S.root.querySelector('[data-rcp="print"]') || button;
      b.textContent = printLabel();
      var started = window.LK_PRINT && window.LK_PRINT.run(root, {
        cls: 'rc-printing', button: b, pageCss: '@page { size: ' + P[2] + 'mm ' + P[3] + 'mm; margin: 0; }',
        title: (ids.length === 1 ? A.byId(ids[0]).name : ids.length + ' recipe cards') + ' - Print cards',
        onError: function (m) { say(m); }
      });
      if (started) say('Print dialog open: ' + res.cards + (res.cards === 1 ? ' card, ' : ' cards, ') + res.pages + (res.pages === 1 ? ' page, ' : ' pages, ') + P[1] + '.' + (paper === 'a5l' ? ' Set the printer\'s paper to A5 in the dialog.' : ''));
      else { root.remove(); if (!S.status || /^Laying/.test(S.status)) say('Another print is still open. Close it, then try again.'); }
    }, function () { S.busy = false; root.remove(); if (S.root && S.root.isConnected) { say('Not printed. Try again.'); draw(); } });
  }
  function click(ev) {
    if (!S.root || !S.root.contains(ev.target)) return;
    var el = ev.target.closest('[data-rcp]'); if (!el) return;
    var a = el.getAttribute('data-rcp'), v = el.getAttribute('data-v');
    if (a === 'tick') { if (S.ticked[v]) delete S.ticked[v]; else S.ticked[v] = true; S.status = ''; draw(); var again = S.root.querySelector('[data-rcp="tick"][data-v="' + CSS.escape(v) + '"]'); if (again) again.focus({ preventScroll: true }); return; }
    if (a === 'group') {
      var g = groups().filter(function (x) { return x.k === v; })[0]; if (!g) return;
      var full = g.ids.every(function (id) { return S.ticked[id]; });
      g.ids.forEach(function (id) { if (full) delete S.ticked[id]; else S.ticked[id] = true; });
      S.status = full ? 'Unticked ' + g.t + '.' : 'Ticked ' + g.t + ': ' + g.ids.length + (g.ids.length === 1 ? ' card.' : ' cards.'); draw(); return;
    }
    if (a === 'none') { S.ticked = {}; S.status = 'Every card unticked.'; draw(); return; }
    if (a === 'paper') { if (paperOf(v)[0] !== v) return; S.paper = v; lsSet(KEY, v); S.status = paperOf(v)[1] + ' picked.'; draw(); return; }
    if (a === 'print') print(el);
  }
  function input(ev) {
    if (!S.root || ev.target.id !== 'rcp-q') return;
    S.q = ev.target.value; var box = S.root.querySelector('#rcp-rows'); if (box) box.innerHTML = rowsHTML();
  }
  document.addEventListener('click', click);
  document.addEventListener('input', input);

  /* #/manage/print: the list as it was this visit. #/manage/print/<id> (Print this card on a recipe): a fresh list with
     only that card ticked, so cards ticked earlier never ride along. */
  function mount(root, sub) {
    var id = sub[1] || '';
    if (id) { S.ticked = {}; if (A.byId(id)) S.ticked[id] = true; S.q = ''; S.status = ''; }
    S.counts = {};   // page counts are worked out again each visit: a recipe may have changed since
    S.root = root; draw();
  }
  function unmount() { S.root = null; S.run++; S.busy = false; S.counting = ''; }
  // a hand-over (Sign out, Not you?, the idle lock) takes the ticked cards with the person
  function drop() { unmount(); S.ticked = {}; S.q = ''; S.status = ''; }
  window.LK_RCP = { api: 1, mount: mount, unmount: unmount, drop: drop, build: build, PAPERS: PAPERS };
})();
