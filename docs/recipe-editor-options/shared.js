/* Recipe editor design options (3 Nov 2026): helpers shared by the two example pages (a.html, b.html).
   Example only: the recipe is the public Chicken Burger card from js/data.js, the drawings come from js/art.js and
   js/lib. Nothing is read from or written to the book; Save only says what would happen. */
(function () {
  'use strict';
  var ART = window.RX_ART;
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---------- the example recipe ---------- */
  function start() {
    var r = clone(ART.burger);
    r.hand = !!(r.contains || r.check);
    r.show = true; r.special = false; r.done = false; r.short = ''; r.menu = ''; r.aka = ''; r.labelNote = '';
    r.tip = { title: '', text: '' }; r.safety = { title: '', text: '' };
    r.menuSec = 'Hand Held'; r.after = 'Chickpea Mushroom Burger';
    r.ingredients.forEach(function (i) { i.tags = i.tags || []; i.note = i.note || ''; i.link = i.link || ''; });
    r.pins = r.pins.map(function (p) { return { label: p.label, note: p.note || '', x: p.x, y: p.y }; });
    return r;
  }
  // what the card shows: hand-set allergens, or the ingredients' tags rolled up
  function allergens(r) {
    if (r.hand) return (r.contains || []).map(function (x) { return { a: x.allergen, may: false, from: x.from }; }).concat((r.check || []).map(function (x) { return { a: x.allergen, may: true, from: x.from }; }));
    var seen = {}, out = [];
    r.ingredients.forEach(function (i) { (i.tags || []).forEach(function (t) { var may = /\?$/.test(t), a = t.replace('?', ''); if (!seen[a]) { seen[a] = { a: a, may: may, from: i.name.toLowerCase() }; out.push(seen[a]); } else if (seen[a].from.indexOf(i.name.toLowerCase()) < 0) seen[a].from += ', ' + i.name.toLowerCase(); }); });
    return out;
  }
  function tagsHTML(list) {
    return list.length ? list.map(function (x) { return '<span class="tag' + (x.may ? ' maybe' : '') + '">' + esc(x.a) + (x.may ? '?' : '') + '</span>'; }).join(' ') : '<span class="hint">No allergens</span>';
  }
  // which part of the recipe changed, by what each design calls it
  var GROUPS = {
    ing: ['ingredients'], method: ['sections'], alg: ['hand', 'contains', 'check', 'labelNote'], draw: ['art', 'side', 'diagram', 'pins'],
    card: ['name', 'no', 'kind', 'forLine', 'yield', 'show', 'special', 'done', 'short', 'menu', 'avc', 'aka', 'tip', 'safety', 'menuSec', 'after']
  };
  function changed(r, o) {
    var out = {};
    Object.keys(GROUPS).forEach(function (g) { out[g] = GROUPS[g].some(function (k) { return JSON.stringify(r[k]) !== JSON.stringify(o[k]); }); });
    out.any = Object.keys(GROUPS).some(function (g) { return out[g]; });
    return out;
  }
  function changeCount(r, o) {
    var n = 0;
    Object.keys(GROUPS).forEach(function (g) { GROUPS[g].forEach(function (k) {
      if (k === 'ingredients') { var a = r[k], b = o[k]; for (var i = 0; i < Math.max(a.length, b.length); i++) if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) n++; }
      else if (JSON.stringify(r[k]) !== JSON.stringify(o[k])) n++;
    }); });
    return n;
  }

  /* ---------- the book's frame: top bar, phone tab bar, example note ---------- */
  var BACK = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  function frame(note) {
    var top = document.createElement('header');
    top.className = 'bk-top';
    top.innerHTML = '<div class="bk-top-in"><button type="button" class="bk-back" data-rx="nav-back" aria-label="Back">' + BACK + '</button><div class="bk-brand"><small>Leichhardt Hotel Kitchen</small><b>Kitchen Book</b></div>' +
      '<div class="bk-tabs" aria-hidden="true"><span>Recipes</span><span>Prep</span><span>Orders</span><span>Wastage</span><span>Transfers</span><span>Guides</span></div>' +
      '<div class="bk-icons" aria-hidden="true"><span>&#9711;</span><span class="on">&#9673;</span></div></div><div class="demo-note">' + esc(note) + '</div>';
    document.body.insertBefore(top, document.body.firstChild);
    var nav = document.createElement('nav');
    nav.className = 'bk-nav'; nav.setAttribute('aria-label', 'Kitchen Book (example)');
    nav.innerHTML = ['Recipes', 'Prep', 'Orders', 'Wastage', 'Transfers', 'Guides'].map(function (t) { return '<span><i aria-hidden="true"></i>' + t + '</span>'; }).join('');
    document.body.appendChild(nav);
    document.body.classList.add('has-nav');
  }

  /* ---------- toast ---------- */
  var tEl, tTimer;
  function toast(msg) {
    if (!tEl) { tEl = document.createElement('div'); tEl.className = 'toast'; tEl.setAttribute('role', 'status'); document.body.appendChild(tEl); }
    tEl.hidden = false; tEl.textContent = msg; clearTimeout(tTimer); tTimer = setTimeout(function () { tEl.hidden = true; }, 3600);
  }

  /* ---------- one sheet at a time, appended to the body ---------- */
  var sheetEl = null, sheetBack = null, sheetFrom = null;
  function sheet(html, o) {
    o = o || {};
    closeSheet(true);
    sheetFrom = document.activeElement;
    sheetBack = document.createElement('div');
    sheetBack.className = 'sheet-back' + (o.side ? ' side' : '');
    sheetBack.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-h" tabindex="-1">' + html + '</div>';
    sheetBack.addEventListener('click', function (e) { if (e.target === sheetBack) closeSheet(); });
    document.body.appendChild(sheetBack);
    sheetEl = sheetBack.firstChild;
    var f = sheetEl.querySelector('[autofocus]') || sheetEl;
    f.focus();
    if (o.onClose) sheetBack._close = o.onClose;
    return sheetEl;
  }
  function closeSheet(quiet) {
    if (!sheetBack) return;
    var cb = sheetBack._close;
    sheetBack.remove(); sheetBack = null; sheetEl = null;
    if (cb && !quiet) cb();
    if (!quiet && sheetFrom && document.body.contains(sheetFrom)) sheetFrom.focus();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sheetBack) { e.preventDefault(); closeSheet(); return; }
    if (e.key === 'Tab' && sheetEl) {   // keep Tab inside the open sheet
      var f = $$('button, input, select, textarea, a[href], [tabindex="0"]', sheetEl).filter(function (x) { return !x.disabled && x.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* ---------- the drawing: the book's own plate, parts that can be picked, moved and labelled ---------- */
  function parts0() {
    return ART.parts.map(function (p, k) { return { id: 'p' + k, ing: p.ing, svg: p.svg, box: p.box.slice(), dx: 0, dy: 0 }; });
  }
  function libItem(id) { return ART.lib.filter(function (x) { return x.id === id; })[0]; }
  // a library piece as a part: its own picture, 56 units across, at a free spot
  function pieceFor(id, n) {
    var it = libItem(id); if (!it) return null;
    var spots = [[-70, 40], [20, -80], [-90, -40], [40, 52], [-30, -92], [60, -20]], s = spots[n % spots.length];
    var svg = it.svg.replace('<svg ', '<svg x="' + s[0] + '" y="' + s[1] + '" width="48" height="48" ');
    return { id: 'n' + Date.now().toString(36) + n, ing: '', name: it.name, svg: svg, box: [s[0], s[1], 48, 48], dx: 0, dy: 0 };
  }
  function centre(p) { return [p.box[0] + p.box[2] / 2 + p.dx, p.box[1] + p.box[3] / 2 + p.dy]; }
  function canvasSVG(d, o) {
    o = o || {};
    var vb = ART.vb.split(' ').map(Number), pad = 4;
    var out = '<svg viewBox="' + (vb[0] - pad) + ' ' + (vb[1] - pad) + ' ' + (vb[2] + pad * 2) + ' ' + (vb[3] + pad * 2) + '" tabindex="0" role="application" aria-roledescription="drawing" aria-label="' + esc(d.title + '. ' + d.parts.length + ' parts' + (d.sel >= 0 ? ', ' + nameOf(d.parts[d.sel]) + ' picked' : '') + '. Arrow keys move the picked part.') + '">' +
      '<g>' + ART.surf + '</g>';
    d.parts.forEach(function (p, k) {
      out += '<g class="part' + (d.sel === k ? ' on' : '') + '" data-part="' + k + '" transform="translate(' + p.dx + ' ' + p.dy + ')">' + p.svg + '</g>';
    });
    if (d.sel >= 0 && d.parts[d.sel]) { var p = d.parts[d.sel]; out += '<rect class="selbox" x="' + (p.box[0] + p.dx - 2) + '" y="' + (p.box[1] + p.dy - 2) + '" width="' + (p.box[2] + 4) + '" height="' + (p.box[3] + 4) + '" rx="3"/>'; }
    if (o.pins) d.parts.forEach(function (p, k) { if (!p.ing) return; var c = centre(p); out += '<g class="pin"><circle cx="' + c[0] + '" cy="' + c[1] + '" r="7"/><text x="' + c[0] + '" y="' + c[1] + '">' + (k + 1) + '</text></g>'; });
    return out + '</svg>';
  }
  function nameOf(p) { return p ? (p.ing || p.name || 'Part') : ''; }
  // pick, drag and the arrow keys; calls back to redraw
  function bindCanvas(host, d, redraw) {
    var drag = null;
    host.addEventListener('pointerdown', function (e) {
      var g = e.target.closest && e.target.closest('[data-part]'), svg = host.querySelector('svg');
      if (!svg) return;
      if (!g) { if (d.sel >= 0) { d.sel = -1; redraw(); } return; }
      var k = +g.getAttribute('data-part'), m = svg.getScreenCTM(), was = d.sel;
      if (was !== k) {   // the box moves now; the page redraws once the finger lifts, so the drag keeps its element
        d.sel = k;
        var old = host.querySelector('.selbox'); if (old) old.remove();
        var p0 = d.parts[k], NS = 'http://www.w3.org/2000/svg', rc = document.createElementNS(NS, 'rect');
        rc.setAttribute('class', 'selbox'); rc.setAttribute('rx', 3); rc.setAttribute('x', p0.box[0] + p0.dx - 2); rc.setAttribute('y', p0.box[1] + p0.dy - 2); rc.setAttribute('width', p0.box[2] + 4); rc.setAttribute('height', p0.box[3] + 4);
        svg.appendChild(rc);
      }
      drag = { k: k, x: e.clientX, y: e.clientY, dx: d.parts[k].dx, dy: d.parts[k].dy, s: m ? m.a : 1, moved: false, picked: was !== k };
      host.setPointerCapture && host.setPointerCapture(e.pointerId);
    });
    host.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var p = d.parts[drag.k]; if (!p) return;
      var nx = drag.dx + (e.clientX - drag.x) / drag.s, ny = drag.dy + (e.clientY - drag.y) / drag.s;
      if (Math.abs(nx - p.dx) + Math.abs(ny - p.dy) < .5) return;
      if (!drag.moved) snap(d);
      p.dx = Math.round(nx); p.dy = Math.round(ny); drag.moved = true;
      var g = host.querySelector('[data-part="' + drag.k + '"]'), sb = host.querySelector('.selbox');
      if (g) g.setAttribute('transform', 'translate(' + p.dx + ' ' + p.dy + ')');
      if (sb) { sb.setAttribute('x', p.box[0] + p.dx - 2); sb.setAttribute('y', p.box[1] + p.dy - 2); }
    });
    function end() { var dr = drag; drag = null; if (dr && dr.moved) { d.dirty = true; redraw(true); } else if (dr && dr.picked) redraw(true); }
    host.addEventListener('pointerup', end); host.addEventListener('pointercancel', end);
    host.addEventListener('keydown', function (e) {
      if (!e.target.matches || !e.target.matches('svg')) return;
      var p = d.parts[d.sel], mv = { ArrowLeft: [-3, 0], ArrowRight: [3, 0], ArrowUp: [0, -3], ArrowDown: [0, 3] }[e.key];
      if (mv && p) { e.preventDefault(); p.dx += mv[0]; p.dy += mv[1]; d.dirty = true; redraw(true); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && p) { e.preventDefault(); d.parts.splice(d.sel, 1); d.sel = -1; d.dirty = true; redraw(true); }
      else if (e.key === 'Escape' && d.sel >= 0) { e.preventDefault(); d.sel = -1; redraw(true); }
    });
  }
  function drawing(title) { return { title: title, parts: parts0(), sel: -1, dirty: false, undo: [], redo: [], n: 0 }; }
  function snap(d) { d.undo.push(JSON.stringify(d.parts)); if (d.undo.length > 40) d.undo.shift(); d.redo = []; }
  function undo(d) { if (!d.undo.length) return; d.redo.push(JSON.stringify(d.parts)); d.parts = JSON.parse(d.undo.pop()); d.sel = -1; d.dirty = true; }
  function redo(d) { if (!d.redo.length) return; d.undo.push(JSON.stringify(d.parts)); d.parts = JSON.parse(d.redo.pop()); d.sel = -1; d.dirty = true; }
  // what the check finds: recipe ingredients with no part on the plate
  function missing(r, d) {
    var on = {}; d.parts.forEach(function (p) { if (p.ing) on[p.ing.toLowerCase()] = 1; });
    var inBurger = ['sliced cheese', 'ranch', 'oak leaf', 'tomato', 'crumbed chicken thigh', 'burger bun'];
    return r.ingredients.filter(function (i) { var n = i.name.toLowerCase(); return !on[n] && !(on['burger bun'] && inBurger.indexOf(n) >= 0); }).map(function (i) { return i.name; });
  }
  function libTiles(q) {
    q = (q || '').trim().toLowerCase();
    var list = ART.lib.filter(function (x) { return !q || x.name.toLowerCase().indexOf(q) >= 0; });
    return list.length ? '<div class="lib">' + list.map(function (x) { return '<button type="button" class="tile" data-rx="lib-add" data-v="' + esc(x.id) + '">' + x.svg + '<span>' + esc(x.name) + '</span></button>'; }).join('') + '</div>' : '<p class="hint">No drawing matches. Try another word, or Import a drawing (SVG).</p>';
  }

  window.RX = {
    esc: esc, clone: clone, $: $, $$: $$, ART: ART, start: start, allergens: allergens, tagsHTML: tagsHTML, changed: changed, changeCount: changeCount,
    frame: frame, toast: toast, sheet: sheet, closeSheet: closeSheet, BACK: BACK,
    drawing: drawing, canvasSVG: canvasSVG, bindCanvas: bindCanvas, nameOf: nameOf, pieceFor: pieceFor, snap: snap, undo: undo, redo: redo, missing: missing, libTiles: libTiles, libItem: libItem
  };
})();
