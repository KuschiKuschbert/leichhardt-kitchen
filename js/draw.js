/*
  Leichhardt Kitchen Book: the drawing editor (Manage Recipes & Drawings, 21 Oct 2026)
  ====================================================================================
  The head chef draws a recipe's plate, pan, side view or build drawing from the library (js/library.js and js/lib/).
  Loaded by js/manage.js only when a drawing opens, on the head chef's device. Pages:
    #/manage/draw/<drawing id>              change a drawing
    #/manage/draw/new/<recipe id>/<slot>    a new drawing for a recipe: slot plate, pan, side or build

  A drawing is one servingware surface and a list of elements, drawn around 0,0 at real size (1 unit is about
  1.5 mm, a 30 cm plate is 200 units across):
    item   a library piece: a (id@version), x, y, sx, sy, r (degrees), flip, cm (colour swaps), op, ing (the
           ingredient it shows), fixed (moved by hand, so Tidy up leaves it), pick (the piece
           the head chef picked for its ingredient, so the book keeps it when it draws the plate again)
    raw    a picture that is not in the library (a book drawing, or a piece of one after Split into pieces): a
           (raw:<key>, its drawing in defs), bx (its box, "x0 y0 x1 y1"), and the rest as for an item
    text   a label: s, sub, x, y, size, anchor, lx, ly (where its leader line points), ing
    line   pts ("x,y x,y"), col, w, arrow
    rect, ellipse   x, y, w, h, r, fill, stroke
  Saved to drawings/<id> with a copy of every library piece it uses (defs, so a later change to the library never
  changes it) and the flat SVG the book shows (svgS for the servingware, svgF for the food and labels). A plate or
  pan drawing makes the recipe's Pass labels from its parts (each part's ingredient), so they follow the plate; a
  label the head chef wrote by hand in the recipe form is kept as written.
  Clicks use data-dw, classes dw-. It draws into the manage page's root (#mg-root).
*/
(function () {
  'use strict';

  var API = 1;
  var D = window.LK_DATA, X = window.LK_RX, A = window.LK_APP, P = window.LK_PREP, LIB = window.LK_LIB;
  var esc = A.esc;
  function B() { return P.book(); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function n1(x) { return Math.round(x * 10) / 10; }
  function f(x) { return String(n1(x)); }
  var LS = (function () { try { localStorage.getItem('x'); return localStorage; } catch (e) { return null; } })();
  function lsGet(k) { try { return LS ? LS.getItem(k) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { if (LS) { if (v == null || v === '') LS.removeItem(k); else LS.setItem(k, v); } } catch (e) {} }

  var SLOT_NAME = { plate: 'On the plate', pan: 'In the pan', side: 'From the side', build: 'Build' };
  // side and build drawings have no servingware surface of their own: a fixed frame like the book's own (js/art.js)
  var FRAME = { side: '-120 -140 240 170', build: '-172 -123 344 246' };
  var LABEL = { font: 'Barlow, Arial, sans-serif', ink: '#1C1D1F', sub: '#55585E', head: '#C2451A' };
  var ROLE_LAYER = { sauce: 0, dsauce: 0, starch: 1, bread: 1, veg: 1, salad: 1, sidedish: 1, main: 2, dessert: 2, dside: 2, topping: 3, garnish: 4 };

  /* ---------- state ---------- */
  // W.d: the drawing being edited; W.sel: selected element indexes; W.view: the zoom and pan
  var W = { root: null, key: '', d: null, sel: [], undo: [], redo: [], view: { z: 1, x: 0, y: 0 }, panel: '', msg: '', saving: '', many: false, q: '', cat: '', sub: '', more: 0, stretch: false, check: null, conflict: null };

  /* ---------- the library pieces a drawing uses ---------- */
  function libKey(id) { var it = LIB.get(id); return it ? it.id + '@' + it.v : ''; }
  function itemOf(a) { return LIB.get(String(a).split('@')[0]); }
  // the piece's drawing: the copy saved with the drawing first, then the library's
  function bodyOf(a) {
    var d = W.d;
    if (d && d.defs[a] !== undefined) return d.defs[a];
    var it = itemOf(a);
    return it && it.id + '@' + it.v === a ? LIB.body(it.id) : '';
  }
  function sizeOf(a) { var it = itemOf(a); return it ? [it.w, it.h] : [40, 40]; }
  function isPiece(el) { return !!el && (el.t === 'item' || el.t === 'raw'); }
  function nameOfEl(el) {
    if (el.t === 'item') { var it = itemOf(el.a); return el.ing || (it ? it.name : 'Piece'); }
    if (el.t === 'raw') return el.ing || 'Part of a drawing';
    if (el.t === 'text') return 'Label: ' + (el.s || '');
    return { line: 'Line', rect: 'Box', ellipse: 'Oval' }[el.t] || 'Part';
  }

  /* ---------- colours: swap a colour in a piece, or move a whole sauce to a new colour ---------- */
  function hex2hsl(h) {
    var r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, s = 0, hu = 0, dd = mx - mn;
    if (dd) { s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn); hu = mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; hu *= 60; }
    return [hu, s, l];
  }
  function hsl2hex(hu, s, l) {
    s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((hu / 60) % 2 - 1)), m = l - c / 2, rgb;
    hu = ((hu % 360) + 360) % 360;
    rgb = hu < 60 ? [c, x, 0] : hu < 120 ? [x, c, 0] : hu < 180 ? [0, c, x] : hu < 240 ? [0, x, c] : hu < 300 ? [x, 0, c] : [c, 0, x];
    return '#' + rgb.map(function (v) { return ('0' + Math.round((v + m) * 255).toString(16)).slice(-2); }).join('').toUpperCase();
  }
  function coloursIn(body) { var s = {}; (body.match(/#[0-9A-Fa-f]{6}/g) || []).forEach(function (h) { h = h.toUpperCase(); s[h] = (s[h] || 0) + 1; }); return Object.keys(s).sort(function (a, b) { return s[b] - s[a]; }); }
  // a colour map that moves every colour near "from" (the piece's main colour) to "to", keeping each one's light and dark
  function tintMap(body, from, to) {
    var F = hex2hsl(from), T = hex2hsl(to), out = {};
    coloursIn(body).forEach(function (h) {
      if (h === '#FFFFFF' || h === '#000000') return;
      var H = hex2hsl(h), dh = Math.abs(((H[0] - F[0]) + 540) % 360 - 180);
      if (F[1] > 0.12 && (dh > 35 || H[1] < 0.08)) return;
      out[h.slice(1)] = hsl2hex(T[0], T[1] * (F[1] ? Math.min(1.4, H[1] / F[1]) : 1), T[2] + (H[2] - F[2]));
    });
    return out;
  }
  /* A saved drawing comes from Firestore (or a draft on this device), and its colours and anchors go into SVG attributes,
     so each is checked by type first (coding rules, 22 Oct 2026): a colour is #rgb, #rrggbb or a plain colour word, an
     anchor one of three words. Anything else falls back to the default, so a damaged record can never add markup. */
  function okCol(v, d) { return typeof v === 'string' && /^(#[0-9A-Fa-f]{3}|#[0-9A-Fa-f]{6}|[a-zA-Z]{3,20})$/.test(v) ? v : d; }
  function okAnchor(v) { return v === 'middle' || v === 'end' ? v : 'start'; }
  function recolour(body, cm) {
    if (!cm || !Object.keys(cm).length) return body;
    return body.replace(/#([0-9A-Fa-f]{6})/g, function (m, h) { return okCol(cm[h.toUpperCase()], m); });
  }

  /* ---------- drawing the elements ---------- */
  function escT(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tf(el) { return 'translate(' + f(el.x) + ' ' + f(el.y) + ')' + (el.r ? ' rotate(' + f(el.r) + ')' : '') + ' scale(' + f((el.flip ? -1 : 1) * (el.sx || 1)) + ' ' + f(el.sy || 1) + ')'; }
  function arrowHead(x1, y1, x2, y2, w, col) {
    var a = Math.atan2(y2 - y1, x2 - x1), L = 5 + w * 2.5;
    var p1 = [x2 - Math.cos(a - 0.45) * L, y2 - Math.sin(a - 0.45) * L], p2 = [x2 - Math.cos(a + 0.45) * L, y2 - Math.sin(a + 0.45) * L];
    return '<path d="M' + f(p1[0]) + ' ' + f(p1[1]) + ' L' + f(x2) + ' ' + f(y2) + ' L' + f(p2[0]) + ' ' + f(p2[1]) + ' Z" fill="' + col + '"/>';
  }
  function pts(el) { return String(el.pts || '').split(' ').map(function (p) { var q = p.split(','); return [+q[0], +q[1]]; }).filter(function (p) { return isFinite(p[0]) && isFinite(p[1]); }); }
  function elSVG(el) {
    if (isPiece(el)) return '<g transform="' + tf(el) + '"' + (el.op != null && el.op < 1 ? ' opacity="' + f(el.op) + '"' : '') + '>' + recolour(bodyOf(el.a), el.cm) + '</g>';
    if (el.t === 'text') {
      var sz = el.size || 10, anc = okAnchor(el.anchor), lead = '';
      if (el.lx != null && el.ly != null) {
        // the leader line starts at the label's near side and ends in a dot on the part
        // a label above its part (anchor middle): the line leaves from under the amount line
        var sx0 = anc === 'end' ? el.x + 3 : anc === 'middle' ? el.x : el.x - 3, sy0 = anc === 'middle' ? el.y + (el.sub ? sz * 1.05 : 0) + 3 : el.y - sz * 0.35;
        lead = '<path d="M' + f(sx0) + ' ' + f(sy0) + ' L' + f(el.lx) + ' ' + f(el.ly) + '" fill="none" stroke="' + LABEL.ink + '" stroke-width="0.9"/><circle cx="' + f(el.lx) + '" cy="' + f(el.ly) + '" r="1.6" fill="' + LABEL.ink + '"/>';
      }
      // a white edge under the words, drawn as its own text (no paint-order), so a label reads over food
      var line = function (t, y, size, wt, col) {
        var at = ' x="' + f(el.x) + '" y="' + f(y) + '" font-family="' + LABEL.font + '" font-weight="' + wt + '" font-size="' + f(size) + '" text-anchor="' + anc + '"';
        return (el.lx != null ? '<text' + at + ' fill="#FFFFFF" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round">' + escT(t) + '</text>' : '') + '<text' + at + ' fill="' + col + '">' + escT(t) + '</text>';
      };
      return lead + line(el.s, el.y, sz, 700, okCol(el.col, LABEL.ink)) + (el.sub ? line(el.sub, el.y + sz * 1.05, sz * 0.85, 500, LABEL.sub) : '');
    }
    if (el.t === 'line') {
      var p = pts(el); if (p.length < 2) return '';
      var col = okCol(el.col, LABEL.ink), w = el.w || 1.2;
      return '<polyline points="' + p.map(function (q) { return f(q[0]) + ',' + f(q[1]); }).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="' + f(w) + '" stroke-linecap="round" stroke-linejoin="round"' + (el.dash ? ' stroke-dasharray="4 4"' : '') + '/>' +
        (el.arrow ? arrowHead(p[p.length - 2][0], p[p.length - 2][1], p[p.length - 1][0], p[p.length - 1][1], w, col) : '');
    }
    if (el.t === 'rect') return '<rect x="' + f(-el.w / 2) + '" y="' + f(-el.h / 2) + '" width="' + f(el.w) + '" height="' + f(el.h) + '" rx="' + f(el.rr || 0) + '" fill="' + okCol(el.fill, 'none') + '" stroke="' + okCol(el.stroke, LABEL.ink) + '" stroke-width="' + f(el.sw == null ? 1.2 : el.sw) + '" transform="translate(' + f(el.x) + ' ' + f(el.y) + ')' + (el.r ? ' rotate(' + f(el.r) + ')' : '') + '"/>';
    if (el.t === 'ellipse') return '<ellipse cx="0" cy="0" rx="' + f(el.w / 2) + '" ry="' + f(el.h / 2) + '" fill="' + okCol(el.fill, 'none') + '" stroke="' + okCol(el.stroke, LABEL.ink) + '" stroke-width="' + f(el.sw == null ? 1.2 : el.sw) + '" transform="translate(' + f(el.x) + ' ' + f(el.y) + ')' + (el.r ? ' rotate(' + f(el.r) + ')' : '') + '"/>';
    return '';
  }
  function rawBox(el) { var b = String(el.bx || '').split(' ').map(Number); return b.length === 4 && b.every(isFinite) ? b : [-20, -20, 20, 20]; }
  // the servingware (none for side and build drawings)
  function surface(d) { return d.surf && d.surf.fam && d.surf.fam !== 'none' ? LIB.surface(d.surf) : null; }
  // the box an element covers, in drawing units: [x0, y0, x1, y1]
  function bbox(el) {
    var w, h;
    if (isPiece(el)) {
      // the piece's own box (a side or build piece stands on its 0,0), scaled, flipped and turned with it
      var it = el.t === 'item' ? itemOf(el.a) : null, lb = el.t === 'raw' ? rawBox(el) : it ? LIB.box(it) : [-20, -20, 20, 20], sx = (el.flip ? -1 : 1) * (el.sx || 1), sy = el.sy || 1, ra = (el.r || 0) * Math.PI / 180, ca = Math.cos(ra), sa = Math.sin(ra), xs = [], ys = [];
      [[lb[0], lb[1]], [lb[2], lb[1]], [lb[2], lb[3]], [lb[0], lb[3]]].forEach(function (p) { var x = p[0] * sx, y = p[1] * sy; xs.push(el.x + x * ca - y * sa); ys.push(el.y + x * sa + y * ca); });
      return [Math.min.apply(0, xs), Math.min.apply(0, ys), Math.max.apply(0, xs), Math.max.apply(0, ys)];
    }
    else if (el.t === 'text') { var sz = el.size || 10, tw = String(el.s || '').length * sz * 0.52; var x0 = el.anchor === 'end' ? el.x - tw : el.anchor === 'middle' ? el.x - tw / 2 : el.x; return [x0, el.y - sz, x0 + tw, el.y + (el.sub ? sz : sz * 0.3)]; }
    else if (el.t === 'line') { var p = pts(el), xs = p.map(function (q) { return q[0]; }), ys = p.map(function (q) { return q[1]; }); return [Math.min.apply(0, xs) - 2, Math.min.apply(0, ys) - 2, Math.max.apply(0, xs) + 2, Math.max.apply(0, ys) + 2]; }
    else { w = el.w; h = el.h; }
    var a = (el.r || 0) * Math.PI / 180, c = Math.abs(Math.cos(a)), sn = Math.abs(Math.sin(a)), bw = w * c + h * sn, bh = w * sn + h * c;
    return [el.x - bw / 2, el.y - bh / 2, el.x + bw / 2, el.y + bh / 2];
  }
  // the frame the drawing is shown in: the servingware and everything on it, with room for the shadow
  function viewBoxOf(d) {
    if (FRAME[d.slot]) return FRAME[d.slot];
    var s = surface(d), b = s ? [-s.w / 2, -s.h / 2, s.w / 2, s.h / 2] : [-100, -100, 100, 100];
    d.els.forEach(function (el) { var e = bbox(el); b = [Math.min(b[0], e[0]), Math.min(b[1], e[1]), Math.max(b[2], e[2]), Math.max(b[3], e[3])]; });
    var m = 6;
    return f(b[0] - m) + ' ' + f(b[1] - m) + ' ' + f(b[2] - b[0] + 2 * m + 4) + ' ' + f(b[3] - b[1] + 2 * m + 6);
  }
  function svgS(d) { var s = surface(d); return s ? s.body : ''; }
  function svgF(d) { return d.els.map(elSVG).join(''); }

  /* ---------- the words for screen readers ---------- */
  function wareName(d) {
    var s = d.surf || {}, name = '';
    (LIB.WARE || []).forEach(function (fam) { fam.list.forEach(function (x) { if (!name && JSON.stringify(x.p) === JSON.stringify(s)) name = x.name.toLowerCase(); }); });
    if (name) return name;
    if (s.fam === 'plate') return (s.shape && s.shape !== 'round' ? s.shape + ' ' : 'round ') + (s.col && s.col !== 'white' ? s.col + ' ' : 'white ') + 'plate';
    if (s.fam === 'bowl') return 'bowl'; if (s.fam === 'board') return 'board';
    return String(s.shape || 'dish').replace(/-/g, ' ');
  }
  function placeWords(el, area) {
    var rx = (area && area.rx) || 100, ry = (area && area.ry) || 100, x = el.x / rx, y = el.y / ry;
    if (Math.abs(x) < 0.3 && Math.abs(y) < 0.3) return 'in the middle';
    var v = y < -0.3 ? 'at the back' : y > 0.3 ? 'at the front' : '', h = x < -0.3 ? 'left' : x > 0.3 ? 'right' : '';
    return v && h ? v + ' ' + h : v ? v : 'on the ' + h;
  }
  function altText(d, rname) {
    var s = surface(d), parts = [], seen = {};
    d.els.forEach(function (el) {
      if (el.t !== 'item' && !(el.t === 'raw' && el.ing)) return;
      var nm = (el.ing || nameOfEl(el)).toLowerCase(), more = ingsOf(el).slice(1); if (seen[nm]) return; seen[nm] = 1;
      parts.push(nm + (more.length ? ' (with ' + more.join(', ').toLowerCase() + ')' : '') + ' ' + placeWords(el, s && s.area));
    });
    var what = d.slot === 'side' ? 'Side view' : d.slot === 'build' ? 'Build drawing' : 'Top-down drawing';
    var on = d.slot === 'plate' || d.slot === 'pan' ? ' on a ' + wareName(d) : '';
    return (what + ' of ' + rname + on + (parts.length ? ': ' + parts.slice(0, 12).join(', ') : '') + '.').slice(0, 600);
  }

  /* ---------- the recipe the drawing belongs to ---------- */
  function recipeOf(rid) { return A.byId(rid) || (X.change(rid) || {}).r || X.pristine(rid) || null; }
  function ingName(i) { return String(i.name || '').replace(/\s*\([^)]*\)/g, '').trim(); }
  // the ingredients that would show on the plate (not salt, oil, water and the like)
  var HIDDEN = /^(salt|pepper|cracked pepper|black pepper|oil|olive oil|canola oil|vegetable oil|cooking oil|water|flour|plain flour|sugar|seasoning|spray|butter for the pan|stock|batter mix)$/i;
  function plateIngs(r) { return (r && r.ingredients || []).filter(function (i) { return i.name && !HIDDEN.test(ingName(i)); }); }

  /* ---------- making a new drawing ---------- */
  function defaultSurf(r, slot) {
    if (slot === 'side' || slot === 'build') return { fam: 'none' };
    if (slot === 'pan') return { fam: 'other', shape: 'gn', gn: '1/3' };
    var t = ((r && (r.name + ' ' + (r.forLine || ''))) || '').toLowerCase();
    if (/board|platter|share/.test(t)) return { fam: 'board', shape: 'rect', size: 45, tone: 'medium', finish: 'straight', edge: 'rounded' };
    if (/pasta|spaghetti|carbonara|bolognese|risotto/.test(t)) return { fam: 'bowl', shape: 'round', size: 28, rim: 'flat', depth: 'shallow', col: 'white' };
    if (/salad|bowl|curry|poke|laksa|soup/.test(t)) return { fam: 'bowl', shape: 'round', size: 26, rim: 'rolled', depth: 'deep', col: 'white' };
    if (r && r.kind === 'side') return { fam: 'bowl', shape: 'round', size: 20, rim: 'rolled', depth: 'deep', col: 'white' };
    if (r && r.kind === 'dessert') return { fam: 'plate', shape: 'round', size: 24, rim: 'wide', finish: 'gloss', col: 'white' };
    if (/kids|junior/.test(t)) return { fam: 'plate', shape: 'round', size: 24, rim: 'narrow', finish: 'gloss', col: 'white', divided: true };
    if (/senior/.test(t)) return { fam: 'plate', shape: 'round', size: 27, rim: 'wide', finish: 'gloss', col: 'white' };
    return { fam: 'plate', shape: 'round', size: 30, rim: 'wide', finish: 'gloss', col: 'white' };
  }
  function newId(rid, slot) {
    var base = (rid + '-' + slot).slice(0, 56), id = base, k = 2, have = X.artVersions();
    while (have[id]) id = base + '-' + (k++);
    return id;
  }
  function blank(rid, slot) {
    var r = recipeOf(rid);
    return { id: newId(rid, slot), isNew: true, rid: rid, slot: slot, name: (r ? r.name : rid) + ', ' + SLOT_NAME[slot].toLowerCase(), surf: defaultSurf(r, slot), els: [], defs: {}, layout: null, from: '', meta: { v: 0, removed: false } };
  }

  /* ---------- undo, redo and drafts ---------- */
  function snapNow() { return JSON.stringify({ surf: W.d.surf, els: W.d.els, name: W.d.name }); }
  function before() { W.undo.push(snapNow()); if (W.undo.length > 100) W.undo.shift(); W.redo = []; }
  function restore(s) { var o = JSON.parse(s); W.d.surf = o.surf; W.d.els = o.els; W.d.name = o.name; W.sel = W.sel.filter(function (i) { return i < W.d.els.length; }); }
  function undo() { if (!W.undo.length) return; W.redo.push(snapNow()); restore(W.undo.pop()); changed(); }
  function redo() { if (!W.redo.length) return; W.undo.push(snapNow()); restore(W.redo.pop()); changed(); }
  function draftKey() { return 'lk.dw.draft.' + (W.d.isNew ? 'new-' + W.d.rid + '-' + W.d.slot : W.d.id); }
  function dirty() { return !!(W.d && W.d.saved !== snapNow()); }
  var keepT = null;
  function keepNow() {
    clearTimeout(keepT);
    if (!W.d || W.d.kept) return;
    if (!dirty()) { lsSet(draftKey(), ''); return; }
    var used = {}; W.d.els.forEach(function (el) { if (isPiece(el)) used[el.a] = W.d.defs[el.a] !== undefined ? W.d.defs[el.a] : bodyOf(el.a); });
    lsSet(draftKey(), JSON.stringify({ at: B().now(), surf: W.d.surf, els: W.d.els, name: W.d.name, defs: used }));
  }
  // every change: kept on this device, the page drawn again (soft: only the canvas, so a tap that is half done on a
  // button, while a typed box loses the focus, still lands)
  function changed(soft) { clearTimeout(keepT); keepT = setTimeout(keepNow, 400); W.check = null; if (soft) drawCanvas(); else draw(); }

  /* ---------- where a new piece goes ---------- */
  function area() { var s = surface(W.d); return s ? s.area : { shape: 'box', cx: 0, cy: 0, rx: 100, ry: 60 }; }
  function inArea(x, y, a) { a = a || area(); var dx = (x - a.cx) / a.rx, dy = (y - a.cy) / a.ry; return a.shape === 'box' ? Math.abs(dx) <= 1 && Math.abs(dy) <= 1 : dx * dx + dy * dy <= 1; }
  function overlap(a, b) { var w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]); return w > 0 && h > 0 ? w * h : 0; }
  // the spot on the servingware where a piece w by h covers the least of what is there already
  function freeSpot(w, h) {
    var a = area(), best = null, bs = Infinity, step = Math.max(8, Math.min(a.rx, a.ry) / 6);
    var boxes = W.d.els.filter(function (el) { return el.t === 'item'; }).map(bbox);
    for (var y = a.cy - a.ry; y <= a.cy + a.ry; y += step) {
      for (var x = a.cx - a.rx; x <= a.cx + a.rx; x += step) {
        if (!inArea(x, y, { shape: a.shape, cx: a.cx, cy: a.cy, rx: Math.max(4, a.rx - w / 2), ry: Math.max(4, a.ry - h / 2) })) continue;
        var b = [x - w / 2, y - h / 2, x + w / 2, y + h / 2], s = 0;
        boxes.forEach(function (o) { s += overlap(b, o); });
        s += Math.hypot(x - a.cx, y - a.cy) * 0.5;
        if (s < bs) { bs = s; best = [x, y]; }
      }
    }
    return best || [a.cx, a.cy];
  }
  function layerOf(el) { if (el.t === 'raw') return el.role && ROLE_LAYER[el.role] != null ? ROLE_LAYER[el.role] : 2; if (el.t !== 'item') return 5; var it = itemOf(el.a); return it ? (ROLE_LAYER[it.role] == null ? 2 : ROLE_LAYER[it.role]) : 2; }
  // sauce goes under the food, garnish and toppings over it: the index a new piece of this layer is put at
  function insertAt(layer) { var i = W.d.els.length; while (i > 0 && layerOf(W.d.els[i - 1]) > layer) i--; return i; }
  // how big to draw a piece for an amount like "150 g", "2 slices" or "100 ml" (its area follows the weight)
  function amount(q) {
    var s = String(q || '').toLowerCase().replace(',', '.'), m;
    if ((m = s.match(/([\d.]+)\s*kg\b/))) return { g: +m[1] * 1000 };
    if ((m = s.match(/([\d.]+)\s*(g|gm|gram|grams|ml)\b/))) return { g: +m[1] };
    if ((m = s.match(/([\d.]+)\s*(l|litre|litres)\b/))) return { g: +m[1] * 1000 };
    if ((m = s.match(/^\s*([\d.]+)\b/))) return { n: +m[1] };
    return null;
  }
  function scaleFor(it, q) {
    var a = amount(q);
    if (!a || !it) return 1;
    if (a.g && it.g) return Math.max(0.45, Math.min(2.4, Math.sqrt(a.g / it.g)));
    return 1;
  }
  function countFor(it, q) { var a = amount(q); return a && a.n && it && it.n && a.n > it.n ? Math.min(12, Math.round(a.n / it.n)) : 1; }
  function addItem(id, o) {
    o = o || {};
    var it = LIB.get(id); if (!it) return;
    var key = libKey(id), s = o.scale || 1, w = it.w * s, h = it.h * s, at, onto = W.sel.length === 1 ? W.d.els[W.sel[0]] : null;
    // a sauce, topping or garnish added while a part is picked goes on that part
    if (o.x != null) at = [o.x, o.y];
    else if (isPiece(onto) && /^(sauce|dsauce|topping|garnish)$/.test(it.role)) at = [onto.x + (it.role === 'sauce' ? 6 : 0), onto.y + (it.role === 'sauce' ? 6 : 0)];
    else at = freeSpot(w, h);
    W.d.defs[key] = LIB.body(id);
    var el = { t: 'item', a: key, x: n1(at[0]), y: n1(at[1]), sx: n1(s * 100) / 100, sy: n1(s * 100) / 100, r: 0 };
    if (o.ing) { el.ing = o.ing; el.ii = ingIndex(o.ing); }
    // a sauce takes its colour from its name (pepper, mushroom, diane, hollandaise...)
    var col = (it.role === 'sauce' || it.role === 'dsauce') && o.ing ? LIB.sauceColour(o.ing) : '';
    if (col && it.side && it.side.c) el.cm = tintMap(W.d.defs[key], it.side.c, col);
    var k = insertAt(ROLE_LAYER[it.role] == null ? 2 : ROLE_LAYER[it.role]), count = o.count || 1, added = [];
    for (var c = 0; c < count; c++) {
      var e2 = clone(el);
      if (c) { var a2 = (c / count) * Math.PI * 2; e2.x = n1(el.x + Math.cos(a2) * w * 0.55); e2.y = n1(el.y + Math.sin(a2) * h * 0.55); e2.r = Math.round(a2 * 57) % 360; }
      W.d.els.splice(k + c, 0, e2); added.push(k + c);
    }
    W.sel = added;
    return added;
  }
  // a piece the head chef picked for an ingredient (from the library or Swap): the book keeps it when it draws the plate
  // again (js/smart.js drawIt), and Tidy up may still move it
  function picked(added) { (added || []).forEach(function (i) { var e = W.d.els[i]; if (e && e.ing) e.pick = true; }); return added; }
  // Swap: the new piece goes where the old part was, about as wide, with its ingredient, layer, turn and flip; a part
  // moved by hand stays marked as moved
  // the search Swap starts with: the ingredient's name, or its last word that finds drawings ("Double-smoked BBQ sauce"
  // finds nothing, "sauce" does)
  function swapWords(name) {
    if (LIB.search(name).length) return name;
    var w = String(name).split(/\s+/).filter(function (x) { return x.length > 3; });
    for (var k = w.length - 1; k >= 0; k--) if (LIB.search(w[k]).length) return w[k];
    return '';
  }
  function swapTo(id) {
    var old = W.swap, it = LIB.get(id); W.swap = null; W.pendingIng = ''; W.q = ''; W.panel = '';
    var k = W.d.els.indexOf(old);
    if (k < 0 || !it) { W.sel = []; return; }
    var b = bbox(old), s = Math.max(0.3, Math.min(3, ((b[2] - b[0]) || it.w) / it.w));
    W.sel = [];
    var added = addItem(id, { x: old.x, y: old.y, ing: old.ing, scale: s });
    if (!added || !added.length) return;
    var nw = W.d.els.splice(added[0], 1)[0];
    k = W.d.els.indexOf(old);
    ['r', 'flip', 'fixed'].forEach(function (f) { if (old[f] != null) nw[f] = old[f]; });
    // the new piece takes over every name the old part carried (a part drawn for two ingredients)
    if (old.also) { nw.also = old.also; if (old.ai != null) nw.ai = old.ai; }
    nw.pick = true;
    W.d.els.splice(k, 1, nw);
    W.sel = [k];
    say(old.ing + ': swapped for ' + it.name);
  }

  /* ---------- the recipe's ingredients and the parts on the plate ---------- */
  function rec() { return recipeOf(W.d.rid); }
  // "Chips and salad" is drawn as two parts, Chips and Salad: each half finds its ingredient
  function halves(name) { return String(name || '').toLowerCase().split(/\s+(?:and|&|with)\s+/); }
  function ingIndex(name) { var r = rec(), ns = (r && r.ingredients || []).map(ingName), k = ns.indexOf(name); return k >= 0 ? k : ns.map(halves).findIndex(function (h) { return h.length > 1 && h.indexOf(String(name).toLowerCase()) >= 0; }); }
  function ingOf(name) { var r = rec(), k = ingIndex(name); return k >= 0 ? (r.ingredients || [])[k] : null; }
  // the ingredients a part shows: its own (ing) and any drawn inside it (also, "Sliced cheese|Ranch" under a burger bun)
  function ingsOf(el) { return (el.ing ? [el.ing] : []).concat(el.also ? String(el.also).split('|').filter(Boolean) : []); }
  function onPlate() { var s = {}; W.d.els.forEach(function (el) { ingsOf(el).forEach(function (k) { s[k] = 1; }); }); return s; }
  function missingIngs() {
    if (W.d.slot === 'side' || W.d.slot === 'build') return [];
    var have = onPlate(), low = {}; Object.keys(have).forEach(function (k) { low[k.toLowerCase()] = 1; });
    return plateIngs(rec()).filter(function (i) { var h = halves(ingName(i)); return !have[ingName(i)] && !(h.length > 1 && h.every(function (x) { return low[x]; })); });
  }
  // the library piece for an ingredient: what the head chef picked before, else the best search match (js/smart.js makes this smarter)
  function matchIng(i) {
    if (window.LK_SMART && window.LK_SMART.match) { var m = window.LK_SMART.match(i, W.d); if (m) return m; }
    var name = ingName(i), hit = LIB.search(name)[0];
    if (!hit) { var w = name.split(/\s+/).filter(function (x) { return x.length > 3; }); for (var k = w.length - 1; k >= 0 && !hit; k--) hit = LIB.search(w[k])[0]; }
    return hit ? hit.id : '';
  }
  function addIng(name) {
    var i = ingOf(name); if (!i) return;
    var id = matchIng(i), S = window.LK_SMART;
    // the ingredient has its own recipe card: drawn from what it is made of and how it is prepped (js/compose.js)
    var mk = S && S.made ? S.made(i, W.d) : null;
    if (mk) { W.sel = []; before(); addMade(mk, name, scaleFor(mk, i.q)); changed(); say(name + ' added, drawn from its recipe'); return; }
    if (!id) { W.panel = 'lib'; W.q = name; W.pendingIng = name; W.more = 0; draw(); say('No drawing found for ' + name + '. Pick one from the library.'); return; }
    var it = LIB.get(id);
    // each ingredient gets its own spot (a part added while another is picked would sit on it)
    W.sel = [];
    before(); addItem(id, { ing: name, scale: scaleFor(it, i.q), count: countFor(it, i.q) }); changed();
    say(name + ' added');
  }
  // a piece drawn from an ingredient's own recipe card (js/compose.js): a raw part with its drawing kept in defs
  function addMade(mk, name, s) {
    var key = mk.key, at = freeSpot(mk.w * s, mk.h * s);
    W.d.defs[key] = mk.body;
    var el = { t: 'raw', a: key, bx: mk.box.map(n1).join(' '), role: mk.role, made: mk.made, ms: mk.ms, x: n1(at[0]), y: n1(at[1]), sx: n1(s * 100) / 100, sy: n1(s * 100) / 100, r: 0, ing: name, ii: ingIndex(name) };
    var k = insertAt(layerOf(el));
    W.d.els.splice(k, 0, el); W.sel = [k];
  }
  // the Pass labels for a plate or pan drawing, one for each ingredient on it, where its parts are
  function autoPins(d, r, vb) {
    var v = vb.split(' ').map(Number), groups = {}, order = [];
    d.els.forEach(function (el) {
      if (!isPiece(el)) return;
      // what is drawn inside a part gets its own label, spread over the part so the lines do not meet in one point
      var b = el.also ? bbox(el) : null, more = ingsOf(el);
      more.forEach(function (k, j) {
        var at = { x: el.x, y: el.y };
        if (j) { var ang = -Math.PI / 2 + (j - 1) / (more.length - 1) * Math.PI * 2; at = { x: el.x + Math.cos(ang) * (b[2] - b[0]) * 0.22, y: el.y + Math.sin(ang) * (b[3] - b[1]) * 0.22 }; }
        if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(at);
      });
    });
    var own = (r.pins || []).filter(function (p) { return p.own; }), ownIng = {};
    own.forEach(function (p) { if (p.ing) ownIng[p.ing] = 1; });
    return own.concat(order.filter(function (k) { return !ownIng[k]; }).map(function (k) {
      var g = groups[k], cx = 0, cy = 0;
      g.forEach(function (el) { cx += el.x; cy += el.y; }); cx /= g.length; cy /= g.length;
      var i = (r.ingredients || []).filter(function (x) { return ingName(x) === k; })[0] || (r.ingredients || []).filter(function (x) { var h = halves(ingName(x)); return h.length > 1 && h.indexOf(k.toLowerCase()) >= 0; })[0] || {}, p = { label: k.slice(0, 60), x: n1((cx - v[0]) / v[2] * 100), y: n1((cy - v[1]) / v[3] * 100), ing: k };
      if (i.link) p.link = i.link; else p.tags = (i.tags || []).slice();
      var note = [i.q, i.note].filter(Boolean).join(', '); if (note) p.note = note.slice(0, 400);
      return p;
    }));
  }

  /* ---------- check the drawing ---------- */
  function check() {
    var out = [], a = area(), d = W.d;
    missingIngs().forEach(function (i) { out.push({ msg: ingName(i) + ' is in the recipe but not on the ' + (d.slot === 'pan' ? 'pan' : 'plate') + '.', ing: ingName(i) }); });
    d.els.forEach(function (el, k) {
      if (!isPiece(el)) return;
      if ((d.slot === 'plate' || d.slot === 'pan') && !el.ing) out.push({ msg: nameOfEl(el) + ' has no label (which ingredient it is).', i: k });
      if (surface(d) && !inArea(el.x, el.y, a)) out.push({ msg: nameOfEl(el) + ' is off the ' + (d.slot === 'pan' ? 'pan' : 'servingware') + '.', i: k });
      var b = bbox(el);
      for (var j = k + 1; j < d.els.length; j++) {
        var o = d.els[j]; if (!isPiece(o) || layerOf(o) === 0) continue;
        var c = bbox(o);
        if (c[0] <= b[0] && c[1] <= b[1] && c[2] >= b[2] && c[3] >= b[3]) { out.push({ msg: nameOfEl(el) + ' is hidden under ' + nameOfEl(o) + '.', i: k }); break; }
      }
    });
    return out;
  }
  /* Labels on the drawing itself (side and build drawings): one per ingredient, in a column on each side, sorted top
     to bottom so the leader lines do not cross. Earlier labels made this way go first. */
  function labelAll() {
    var d = W.d, v = viewBoxOf(d).split(' ').map(Number), parts = {}, list = [];
    if (d.slot === 'side') return labelAbove();
    d.els = d.els.filter(function (el) { return !(el.t === 'text' && el.auto); });
    d.els.forEach(function (el) {
      // the servingware from the side needs no label
      if (el.t !== 'item' && !(el.t === 'raw' && el.ing) || (!el.ing && /^side-ware-/.test(el.a))) return;
      var k = el.ing || nameOfEl(el), b = bbox(el);
      if (!parts[k]) { parts[k] = { k: k, x: el.x, y: (b[1] + b[3]) / 2, n: 1 }; list.push(parts[k]); } else { parts[k].x += el.x; parts[k].n++; }
    });
    list.forEach(function (p) { p.x /= p.n; });
    var mid = v[0] + v[2] / 2, left = list.filter(function (p) { return p.x < mid; }).sort(function (a, b) { return a.y - b.y; }), right = list.filter(function (p) { return p.x >= mid; }).sort(function (a, b) { return a.y - b.y; });
    // one column of labels: in the order of the parts from top to bottom (so no two lines cross), each far enough below
    // the one above for its amount line, and the whole column moved up when it would run off the bottom
    function col(ps, x, anchor) {
      var top = v[1] + 14, bottom = v[1] + v[3] - 14, last = -Infinity, ys = [];
      ps.forEach(function (p) {
        var i = ingOf(p.k), sub = i && i.q ? i.q : '';
        var y = Math.max(p.y + 3, last + (ys.length && ys[ys.length - 1].sub ? 24 : 15), top); last = y;
        ys.push({ p: p, y: y, sub: sub });
      });
      var over = ys.length ? ys[ys.length - 1].y - bottom : 0;
      if (over > 0) ys.forEach(function (o) { o.y = Math.max(top, o.y - over); });
      ys.forEach(function (o) { d.els.push({ t: 'text', s: o.p.k, sub: o.sub, x: n1(x), y: n1(o.y), size: 10, anchor: anchor, lx: n1(o.p.x + (anchor === 'end' ? -6 : 6)), ly: n1(o.p.y), auto: true }); });
    }
    col(left, v[0] + 4, 'start'); col(right, v[0] + v[2] - 4, 'end');
  }

  /* The side view's labels, like the book's own: each above its part, centred on it, in rows that step up so no two
     labels meet, with a short line down to the part. */
  function labelAbove() {
    var d = W.d, v = viewBoxOf(d).split(' ').map(Number), parts = {}, list = [];
    d.els = d.els.filter(function (el) { return !(el.t === 'text' && el.auto); });
    d.els.forEach(function (el) {
      if (el.t !== 'item' && !(el.t === 'raw' && el.ing) || (!el.ing && /^side-ware-/.test(el.a))) return;
      var k = el.ing || nameOfEl(el), b = bbox(el);
      if (!parts[k]) { parts[k] = { k: k, x: el.x, top: b[1] }; list.push(parts[k]); } else parts[k].top = Math.min(parts[k].top, b[1]);
    });
    var lo = v[0] + 2, hi = v[0] + v[2] - 2, top = v[1] + 13, rows = [], nRows = Math.max(1, Math.floor((v[3] - 30) / 25));
    // the nearest free place in a row for a label w wide that wants to be at x
    function free(row, x, w) {
      var c = [x].concat(row.reduce(function (m, o) { return m.concat([o[0] - (o[1] + w) / 2 - 6, o[0] + (o[1] + w) / 2 + 6]); }, []));
      return c.map(function (cx) { return Math.max(lo + w / 2, Math.min(hi - w / 2, cx)); })
        .filter(function (cx) { return !row.some(function (o) { return Math.abs(o[0] - cx) < (o[1] + w) / 2 + 5; }); })
        .sort(function (a, b) { return Math.abs(a - x) - Math.abs(b - x); })[0];
    }
    // the parts nearest the middle first; each label in the lowest row still above its own part, near it, sliding
    // along the row when it is taken
    list.sort(function (a, b) { return Math.abs(a.x) - Math.abs(b.x); }).forEach(function (p) {
      var i = ingOf(p.k), sub = i && i.q ? i.q : '', w = Math.max(p.k.length * 5.8, sub.length * 4.9) + 6, best = null;
      var low = Math.max(0, Math.min(nRows - 1, Math.floor((p.top - 8 - (sub ? 12 : 3) - top) / 25)));
      for (var r = 0; r < nRows; r++) {
        var x = free(rows[r] = rows[r] || [], p.x, w);
        if (x == null) continue;
        var cost = Math.abs(low - r) * 34 + (r > low ? 200 : 0) + Math.abs(x - p.x);
        if (!best || cost < best.cost) best = { r: r, x: x, cost: cost };
      }
      if (!best) best = { r: 0, x: Math.max(lo + w / 2, Math.min(hi - w / 2, p.x)) };
      rows[best.r].push([best.x, w]);
      d.els.push({ t: 'text', s: p.k, sub: sub, x: n1(best.x), y: n1(top + best.r * 25), size: 10, anchor: 'middle', lx: n1(p.x), ly: n1(p.top + 3), auto: true });
    });
  }

  /* ---------- the page ---------- */
  function say(m) { try { B().say(m); } catch (e) {} }
  var toastEl = null, toastT = null;
  function toast(m) {
    say(m);
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'p-toasts mg-toasts'; document.body.appendChild(toastEl); }
    toastEl.innerHTML = '<div class="p-toast p-toast-plain" role="presentation">' + esc(m) + '</div>';
    clearTimeout(toastT); toastT = setTimeout(function () { if (toastEl) toastEl.innerHTML = ''; }, 4000);
  }
  function viewBox() {
    var v = viewBoxOf(W.d).split(' ').map(Number), z = W.view.z, w = v[2] / z, h = v[3] / z;
    var cx = v[0] + v[2] / 2 + W.view.x, cy = v[1] + v[3] / 2 + W.view.y;
    return f(cx - w / 2) + ' ' + f(cy - h / 2) + ' ' + f(w) + ' ' + f(h);
  }
  function selOverlay() {
    if (!W.sel.length) return '';
    var out = '', vbw = Number(viewBox().split(' ')[2]), hs = Math.max(4, vbw / 45);
    W.sel.forEach(function (i) {
      var el = W.d.els[i]; if (!el) return;
      if (el.t === 'line') { pts(el).forEach(function (p, k) { out += '<circle class="dw-h" data-h="p' + k + '" cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="' + f(hs) + '"/>'; }); return; }
      var b = bbox(el);
      out += '<rect class="dw-box" x="' + f(b[0]) + '" y="' + f(b[1]) + '" width="' + f(b[2] - b[0]) + '" height="' + f(b[3] - b[1]) + '"/>';
      if (W.sel.length === 1 && el.t !== 'text') {
        out += '<line class="dw-stem" x1="' + f((b[0] + b[2]) / 2) + '" y1="' + f(b[1]) + '" x2="' + f((b[0] + b[2]) / 2) + '" y2="' + f(b[1] - hs * 3) + '"/>' +
          '<circle class="dw-h dw-turn" data-h="turn" cx="' + f((b[0] + b[2]) / 2) + '" cy="' + f(b[1] - hs * 3) + '" r="' + f(hs) + '"/>' +
          '<rect class="dw-h dw-size" data-h="size" x="' + f(b[2] - hs) + '" y="' + f(b[3] - hs) + '" width="' + f(hs * 2) + '" height="' + f(hs * 2) + '"/>';
      }
    });
    return out;
  }
  function canvasHTML() {
    var d = W.d;
    return '<div class="dw-stage"><svg class="dw-svg" viewBox="' + viewBox() + '" tabindex="0" role="application" aria-roledescription="drawing canvas" aria-label="' + esc(d.name + '. ' + d.els.length + (d.els.length === 1 ? ' part' : ' parts') + (W.sel.length ? ', ' + W.sel.length + ' picked' : '') + '. Arrow keys move the picked part, Delete removes it.') + '">' +
      '<g class="dw-surf" data-surf="1">' + svgS(d) + '</g><g class="dw-els">' + d.els.map(function (el, k) { return '<g class="dw-el' + (W.sel.indexOf(k) >= 0 ? ' on' : '') + '" data-i="' + k + '">' + elSVG(el) + '</g>'; }).join('') + '</g>' +
      '<g class="dw-ovl">' + selOverlay() + '</g></svg>' +
      '<div class="dw-zoom" role="group" aria-label="Zoom"><button type="button" class="p-x" data-dw="zout" aria-label="Zoom out">-</button><button type="button" class="p-x" data-dw="fit">Fit</button><button type="button" class="p-x" data-dw="zin" aria-label="Zoom in">+</button></div></div>';
  }
  function btn(a, label, o) { o = o || {}; return '<button type="button" class="' + (o.cls || 'p-x') + '" data-dw="' + a + '"' + (o.v != null ? ' data-v="' + esc(o.v) + '"' : '') + (o.on != null ? ' aria-pressed="' + !!o.on + '"' : '') + (o.dis ? ' disabled' : '') + (o.aria ? ' aria-label="' + esc(o.aria) + '"' : '') + '>' + esc(label) + '</button>'; }
  function toolsHTML() {
    var side = W.d.slot === 'side' || W.d.slot === 'build';
    return '<div class="dw-tools" role="toolbar" aria-label="Drawing tools">' +
      btn('panel', 'Add from the library', { v: 'lib', on: W.panel === 'lib', cls: 'p-x dw-add' }) + btn('text', 'Text') + btn('line', 'Line') + btn('arrow', 'Arrow') + btn('rect', 'Box') + btn('ellipse', 'Oval') +
      (side ? '' : btn('panel', 'Servingware', { v: 'ware', on: W.panel === 'ware' })) + btn('panel', 'Parts', { v: 'parts', on: W.panel === 'parts' }) +
      btn('undo', 'Undo', { dis: !W.undo.length }) + btn('redo', 'Redo', { dis: !W.redo.length }) +
      btn('many', 'Pick several', { on: W.many }) + btn('snap', 'Snap to centre', { on: W.snap !== false }) +
      (side ? btn('labels', 'Label everything') : '') + btn('check', 'Check the drawing') + smart('tools') +
      btn('panel', 'Save as a template', { v: 'tpl', on: W.panel === 'tpl' }) + (W.d.isNew ? '' : btn('panel', 'Use for another recipe', { v: 'reuse', on: W.panel === 'reuse' })) + '</div>';
  }
  function selHTML() {
    if (!W.sel.length) return '';
    var one = W.sel.length === 1 ? W.d.els[W.sel[0]] : null;
    return '<div class="dw-selbar" role="toolbar" aria-label="The picked part"><span class="dw-selname">' + esc(one ? nameOfEl(one) : W.sel.length + ' parts picked') + '</span>' +
      btn('dup', 'Duplicate') + btn('del', 'Delete') + btn('front', 'Front') + btn('fwd', 'Forward') + btn('bwd', 'Backward') + btn('back', 'Back') +
      (isPiece(one) && one.ing && (W.d.slot === 'plate' || W.d.slot === 'pan') ? btn('swap', 'Swap') : '') +
      (isPiece(one) ? btn('flip', 'Flip') + btn('panel', 'Colours', { v: 'colour', on: W.panel === 'colour' }) + btn('stretch', 'Stretch', { on: W.stretch }) : '') +
      (one && one.t === 'raw' ? btn('split', 'Split into pieces') : '') +
      (W.sel.some(function (i) { return isPiece(W.d.els[i]); }) ? btn('piece', 'Save as a library piece') : '') +
      (isPiece(one) && (W.d.slot === 'plate' || W.d.slot === 'pan' || W.d.slot === 'side' || W.d.slot === 'build') ? btn('panel', one.ing ? 'Label: ' + one.ing : 'Which ingredient?', { v: 'label', on: W.panel === 'label' }) : '') +
      (one && one.t !== 'item' ? btn('panel', 'Change it', { v: 'edit', on: W.panel === 'edit' }) : '') +
      btn('none', 'Done') + '</div>';
  }
  function missingHTML() {
    var m = missingIngs();
    if (!m.length) return '';
    return '<div class="dw-miss"><span class="label">In this recipe, not on the ' + (W.d.slot === 'pan' ? 'pan' : 'plate') + ' yet</span><div class="chips">' + m.map(function (i) {
      return '<button type="button" class="chip" data-dw="ing" data-v="' + esc(ingName(i)) + '">+ ' + esc(ingName(i)) + '</button>';
    }).join('') + '</div></div>';
  }
  function checkHTML() {
    if (!W.check) return '';
    return '<div class="box beige dw-check" role="status"><span class="label">Check the drawing</span>' + (W.check.length ? '<ul>' + W.check.map(function (c, k) {
      return '<li>' + (c.i != null ? '<button type="button" class="dw-link" data-dw="pick" data-v="' + c.i + '">' + esc(c.msg) + '</button>' : c.ing ? '<button type="button" class="dw-link" data-dw="ing" data-v="' + esc(c.ing) + '">' + esc(c.msg) + ' Add it</button>' : esc(c.msg)) + '</li>';
    }).join('') + '</ul>' : '<div>All good: every ingredient is on it, every part has its label and sits on the servingware.</div>') + '</div>';
  }

  /* ---------- the panels under the canvas ---------- */
  function thumb(it) {
    var b = LIB.box(it), s = Math.max(b[2] - b[0], b[3] - b[1], 24) / 2 + 4, cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
    return '<svg viewBox="' + f(cx - s) + ' ' + f(cy - s) + ' ' + f(2 * s) + ' ' + f(2 * s) + '" aria-hidden="true" focusable="false">' + LIB.body(it.id) + '</svg>';
  }
  function libHTML() {
    var cats = LIB.cats, o = {}, list;
    if (W.cat) o.cat = W.cat; if (W.sub) o.sub = W.sub;
    if (W.q.trim()) list = LIB.search(W.q, o);
    else list = LIB.items.filter(function (it) { return (!o.cat || it.cat === o.cat) && (!o.sub || it.sub === o.sub); });
    if (!W.q.trim() && !W.cat) list = list.filter(function (it) { return !it.of; });
    var shown = list.slice(0, 36 + W.more);
    return '<section class="dw-panel" aria-labelledby="dw-h-lib"><h3 class="h3" id="dw-h-lib">Library</h3>' +
      (W.swap ? '<p class="hint">Pick the drawing to swap in for <b>' + esc(W.pendingIng) + '</b>. It takes the part\'s place and stays when the book draws the plate again.</p>' : W.pendingIng ? '<p class="hint">Pick the drawing for <b>' + esc(W.pendingIng) + '</b>. It is labelled with that ingredient.</p>' : '') +
      '<div class="field"><label class="label" for="dw-q">Find a drawing</label><input id="dw-q" class="search" type="search" data-dwf="q" autocomplete="off" spellcheck="false" placeholder="For example: chips, pepper sauce, lemon wedge" value="' + esc(W.q) + '"></div>' +
      '<div class="chips scroll" role="group" aria-label="Category">' + btn('cat', 'All', { v: '', on: !W.cat, cls: 'chip' }) + cats.map(function (c) { return btn('cat', c.name, { v: c.id, on: W.cat === c.id, cls: 'chip' }); }).join('') + '</div>' +
      (W.cat ? '<div class="chips scroll" role="group" aria-label="Kind">' + btn('sub', 'All ' + (cats.filter(function (c) { return c.id === W.cat; })[0] || {}).name.toLowerCase(), { v: '', on: !W.sub, cls: 'chip' }) + LIB.subs(W.cat).map(function (s) { return btn('sub', s, { v: s, on: W.sub === s, cls: 'chip' }); }).join('') + '</div>' : '') +
      '<div class="btn-row"><label class="btn dw-imp">Import a drawing (SVG)<input type="file" class="dw-file" accept=".svg,image/svg+xml" data-dwf="svgfile"></label></div>' +
      '<p class="hint" role="status">' + list.length + (list.length === 1 ? ' drawing' : ' drawings') + '. Tap one to put it on the ' + (W.d.slot === 'pan' ? 'pan' : W.d.slot === 'plate' ? 'plate' : 'drawing') + ', or drag it there.</p>' +
      '<div class="dw-lib">' + shown.map(function (it) {
        return '<button type="button" class="dw-tile" data-dw="add" data-v="' + esc(it.id) + '" aria-label="' + esc(it.name) + '">' + thumb(it) + '<span>' + esc(it.name) + '</span></button>';
      }).join('') + '</div>' + (list.length > shown.length ? '<div class="btn-row">' + btn('more', 'Show more', { cls: 'btn' }) + '</div>' : '') + '</section>';
  }
  function wareHTML() {
    var s = W.d.surf || {}, fam = s.fam === 'other' ? (LIB.WARE.filter(function (x) { return x.list.some(function (y) { return y.p.shape === s.shape; }); })[0] || {}).fam || 'other' : s.fam;
    var famSel = W.wareFam || fam || 'plate', group = LIB.WARE.filter(function (x) { return x.fam === famSel; })[0] || LIB.WARE[0], opts = LIB.WARE_OPTS[s.fam] || null;
    return '<section class="dw-panel" aria-labelledby="dw-h-ware"><h3 class="h3" id="dw-h-ware">Servingware</h3><p class="hint">Swap the plate, bowl or board. The food stays where it is.</p>' +
      '<div class="chips scroll" role="group" aria-label="Kind of servingware">' + LIB.WARE.map(function (x) { return btn('wfam', x.name, { v: x.fam, on: x.fam === famSel, cls: 'chip' }); }).join('') + '</div>' +
      '<div class="dw-lib dw-ware">' + group.list.map(function (x, k) {
        var su = LIB.surface(x.p), m = 6, on = JSON.stringify(x.p) === JSON.stringify(s);
        return '<button type="button" class="dw-tile' + (on ? ' on' : '') + '" data-dw="ware" data-v="' + k + '" aria-pressed="' + on + '"><svg viewBox="' + f(-su.w / 2 - m) + ' ' + f(-su.h / 2 - m) + ' ' + f(su.w + 2 * m + 4) + ' ' + f(su.h + 2 * m + 6) + '" aria-hidden="true" focusable="false">' + su.body + '</svg><span>' + esc(x.name) + '</span></button>';
      }).join('') + '</div>' +
      (opts ? '<div class="dw-opts">' + Object.keys(opts).map(function (k) {
        var nm = { shape: 'Shape', size: 'Size (cm)', rim: 'Rim', finish: k === 'finish' && s.fam === 'board' ? 'Grain' : 'Finish', col: 'Colour', depth: 'Depth', tone: 'Wood', edge: 'Edge' }[k] || k;
        return '<label class="field"><span class="label">' + nm + '</span><select class="search" data-dwf="surf.' + k + '">' + opts[k].map(function (v) { return '<option value="' + esc(v) + '"' + (String(s[k]) === String(v) ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('') + '</select></label>';
      }).join('') + '</div>' : '') +
      '<label class="mg-check"><input type="checkbox" data-dwf="fitfood"' + (W.fitFood !== false ? ' checked' : '') + '> Fit the food to a new size</label>' +
      (W.wsave ? '<div class="dw-wsave"><label class="field"><span class="label">Name for this servingware</span><input class="search" data-dwf="wname" maxlength="60" value="' + esc(W.wname || '') + '" placeholder="For example: Pub oval, wide rim"></label><div class="btn-row">' + btn('ware-save-go', 'Save it', { cls: 'btn dark', dis: !!W.busy }) + btn('ware-save-no', 'Cancel', { cls: 'btn' }) + '</div></div>'
        : '<div class="btn-row">' + btn('ware-save', 'Save this servingware', { cls: 'btn' }) + '</div>') + '</section>';
  }
  function colourHTML() {
    var el = W.d.els[W.sel[0]]; if (!isPiece(el)) return '';
    var body = bodyOf(el.a), cols = coloursIn(body).filter(function (h) { return h !== '#000000'; }).slice(0, 10), cm = el.cm || {};
    var quick = ['#C0392B', '#E2A93A', '#F2C14E', '#7EA453', '#4F7F2F', '#7E4726', '#5E2010', '#F3E6C2', '#FFFFFF', '#3F2812', '#A3304F', '#E8964A'];
    return '<section class="dw-panel" aria-labelledby="dw-h-col"><h3 class="h3" id="dw-h-col">Colours</h3><p class="hint">Change any colour in this piece. A sauce can take its colour from its name.</p>' +
      '<div class="dw-cols">' + cols.map(function (h) {
        var now = cm[h.slice(1)] || h;
        return '<label class="dw-col"><span class="dw-sw" style="background:' + now + '"></span><input type="color" data-dwf="col.' + h.slice(1) + '" value="' + now.toLowerCase() + '" aria-label="Colour ' + h + '"></label>';
      }).join('') + '</div>' +
      '<div class="field"><label class="label" for="dw-tint">Colour the whole piece like a sauce</label><input id="dw-tint" class="search" data-dwf="tint" placeholder="For example: pepper, mushroom, hollandaise" autocomplete="off"></div>' +
      '<div class="chips" role="group" aria-label="Quick colours">' + quick.map(function (c) { return '<button type="button" class="dw-swb" data-dw="tintc" data-v="' + c + '" style="background:' + c + '" aria-label="' + c + '"></button>'; }).join('') + '</div>' +
      '<div class="btn-row">' + btn('cmreset', 'Back to its own colours') + '</div>' +
      '<label class="field"><span class="label">See-through</span><input type="range" min="20" max="100" step="5" data-dwf="op" value="' + Math.round((el.op == null ? 1 : el.op) * 100) + '"></label></section>';
  }
  function labelHTML() {
    var el = W.d.els[W.sel[0]], r = rec(); if (!el) return '';
    var ings = (r && r.ingredients || []).map(ingName).filter(Boolean);
    return '<section class="dw-panel" aria-labelledby="dw-h-lab"><h3 class="h3" id="dw-h-lab">Which ingredient is this?</h3><p class="hint">The Pass label for this part is made from it: the name, the amount and its allergens.</p>' +
      '<div class="chips">' + ings.map(function (k) { return btn('setIng', k, { v: k, on: el.ing === k, cls: 'chip' }); }).join('') + btn('setIng', 'No label', { v: '', on: !el.ing, cls: 'chip' }) + '</div></section>';
  }
  function partsHTML() {
    return '<section class="dw-panel" aria-labelledby="dw-h-parts"><h3 class="h3" id="dw-h-parts">Parts</h3><p class="hint">Top of the list is at the back. Pick a part here to move it with the arrow keys.</p><ol class="dw-parts">' +
      W.d.els.map(function (el, k) { return '<li><button type="button" class="dw-link" data-dw="pick" data-v="' + k + '" aria-pressed="' + (W.sel.indexOf(k) >= 0) + '">' + esc(nameOfEl(el)) + '</button></li>'; }).join('') + '</ol></section>';
  }
  function editHTML() {
    var el = W.d.els[W.sel[0]]; if (!el) return '';
    var fld = function (k, label, v, o) { o = o || {}; return '<label class="field"><span class="label">' + label + '</span><input class="search" ' + (o.type ? 'type="' + o.type + '" ' : '') + 'data-dwf="el.' + k + '" value="' + esc(v) + '"' + (o.max ? ' maxlength="' + o.max + '"' : '') + '></label>'; };
    var out = '<section class="dw-panel" aria-labelledby="dw-h-ed"><h3 class="h3" id="dw-h-ed">' + esc(nameOfEl(el)) + '</h3>';
    if (el.t === 'text') {
      out += fld('s', 'Words', el.s || '', { max: 60 }) + fld('sub', 'Small line under it (amount)', el.sub || '', { max: 60 }) +
        '<div class="mg-two"><label class="field"><span class="label">Size</span><select class="search" data-dwf="el.size">' + [8, 9, 10, 12, 14, 18].map(function (z) { return '<option' + ((el.size || 10) === z ? ' selected' : '') + '>' + z + '</option>'; }).join('') + '</select></label>' +
        '<label class="field"><span class="label">Lines up</span><select class="search" data-dwf="el.anchor"><option value="start"' + ((el.anchor || 'start') === 'start' ? ' selected' : '') + '>Left</option><option value="middle"' + (el.anchor === 'middle' ? ' selected' : '') + '>Middle</option><option value="end"' + (el.anchor === 'end' ? ' selected' : '') + '>Right</option></select></label></div>' +
        '<label class="mg-check"><input type="checkbox" data-dwf="el.lead"' + (el.lx != null ? ' checked' : '') + '> A line to the part it names</label>';
    } else if (el.t === 'line') {
      out += '<div class="mg-two">' + fld('col', 'Colour', el.col || '#1C1D1F', { type: 'color' }) + '<label class="field"><span class="label">Thickness</span><select class="search" data-dwf="el.w">' + [0.8, 1.2, 2, 3, 5].map(function (z) { return '<option' + ((el.w || 1.2) === z ? ' selected' : '') + '>' + z + '</option>'; }).join('') + '</select></label></div>' +
        '<label class="mg-check"><input type="checkbox" data-dwf="el.arrow"' + (el.arrow ? ' checked' : '') + '> Arrow at the end</label><label class="mg-check"><input type="checkbox" data-dwf="el.dash"' + (el.dash ? ' checked' : '') + '> Dashed</label>';
    } else {
      out += '<div class="mg-two">' + fld('fill', 'Fill', el.fill && el.fill !== 'none' ? el.fill : '#FFFFFF', { type: 'color' }) + fld('stroke', 'Outline', el.stroke || '#1C1D1F', { type: 'color' }) + '</div>' +
        '<label class="mg-check"><input type="checkbox" data-dwf="el.nofill"' + (!el.fill || el.fill === 'none' ? ' checked' : '') + '> No fill</label>';
    }
    return out + '</section>';
  }
  // what js/smart.js adds to the page when it is loaded (its tools, its panel), or nothing
  function smart(part) { var S = window.LK_SMART; return S && S.ui && S.ui[part] ? S.ui[part](W, btn) : ''; }
  function panelHTML() {
    var p = W.panel;
    if (p === 'lib') return libHTML(); if (p === 'ware') return wareHTML(); if (p === 'colour') return colourHTML();
    if (p === 'label') return labelHTML(); if (p === 'parts') return partsHTML(); if (p === 'edit') return editHTML();
    if (p === 'piece') return pieceHTML(); if (p === 'tpl') return tplHTML(); if (p === 'reuse') return reuseHTML();
    return '';
  }
  function pageHTML() {
    var d = W.d, r = rec();
    var crumbs = '<nav class="crumbs" aria-label="Breadcrumb"><a href="#/manage">Manage Recipes &amp; Drawings</a><span class="sep" aria-hidden="true">/</span>' + (r ? '<a href="#/manage/r/' + encodeURIComponent(d.rid) + '">' + esc(r.name) + '</a><span class="sep" aria-hidden="true">/</span>' : '') + '<span aria-current="page">' + esc(SLOT_NAME[d.slot]) + '</span></nav>';
    var kept = d.kept ? '<div class="box beige mg-kept" role="note"><span class="label">Changes not saved yet</span><div>This device kept changes to this drawing from ' + esc(B().dayShort(d.kept.at) + ' ' + B().clock(d.kept.at)) + '.</div><div class="btn-row">' + btn('kept-use', 'Keep editing them', { cls: 'btn dark' }) + btn('kept-drop', 'Throw them away', { cls: 'btn' }) + '</div></div>' : '';
    var conflict = W.conflict ? '<div class="warn" role="alert"><span class="label">Changed on another device</span><span>Version ' + esc(W.conflict.v) + ' of this drawing was saved after you opened it.</span><div class="btn-row">' + btn('theirs', 'Open theirs', { cls: 'btn' }) + btn('mine', 'Save mine over it', { cls: 'btn dark' }) + '</div></div>' : '';
    var newer = d.els.some(function (el) { var it = el.t === 'item' && itemOf(el.a); return it && it.id + '@' + it.v !== el.a; }) ? '<div class="box beige" role="note"><span class="label">Newer library drawings</span><div>Some pieces have a newer drawing in the library. This drawing keeps its own copy until you ask.</div><div class="btn-row">' + btn('newer', 'Use the newer drawings', { cls: 'btn' }) + '</div></div>' : '';
    var state = W.saving || (dirty() ? 'Not saved yet. Kept on this device.' : d.isNew ? 'New drawing.' : 'Saved. Version ' + d.meta.v + '.');
    return '<div class="dw">' + crumbs + '<div class="mg-head"><h2 id="rtitle" tabindex="-1">' + esc((r ? r.name : d.rid) + ': ' + SLOT_NAME[d.slot].toLowerCase()) + '</h2></div>' + kept + conflict + newer +
      '<div class="dw-main"><div class="dw-left">' + canvasHTML() + toolsHTML() + selHTML() + '</div><div class="dw-right">' + smart('panel') + startHTML() + missingHTML() + checkHTML() + panelHTML() + '</div></div>' +
      '<div class="mg-bar dw-bar"><span class="mg-state" role="status">' + esc(state) + '</span>' + (W.msg ? '<span class="p-err" role="alert">' + esc(W.msg) + '</span>' : '') +
      '<div class="btn-row"><button type="button" class="btn dark" data-dw="save"' + (W.saving ? ' disabled' : '') + '>' + (W.saving ? 'Saving...' : 'Save') + '</button><a class="btn" href="#/manage/r/' + encodeURIComponent(d.rid) + '">Back to the recipe</a></div></div></div>';
  }
  // drawing the page takes a typed box away, and its change event can ask for another draw while this one runs: that
  // one is left out (the page drawn now already has the change)
  var drawing = false;
  function draw() {
    if (drawing || !W.root || !document.body.contains(W.root) || !W.d) return;
    drawing = true;
    try { drawPage(); } finally { drawing = false; }
  }
  function drawPage() {
    var a = document.activeElement, keep = a && W.root.contains(a) ? (a.getAttribute('data-dwf') ? '[data-dwf="' + a.getAttribute('data-dwf') + '"]' : a.classList.contains('dw-svg') ? '.dw-svg' : a.getAttribute('data-dw') ? '[data-dw="' + a.getAttribute('data-dw') + '"]' + (a.getAttribute('data-v') != null ? '[data-v="' + a.getAttribute('data-v') + '"]' : '') : '') : '';
    var y = window.scrollY, ps = a && a.selectionStart;
    W.root.innerHTML = pageHTML();
    window.scrollTo(0, y);
    if (keep) { var el = W.root.querySelector(keep); if (el) { el.focus({ preventScroll: true }); if (ps != null && el.setSelectionRange) try { el.setSelectionRange(ps, ps); } catch (e) {} } }
  }
  function drawCanvas() {
    if (drawing) return;
    var st = W.root && W.root.querySelector('.dw-stage');
    if (!st) return draw();
    var svg = st.querySelector('.dw-svg'), had = document.activeElement === svg;
    var tmp = document.createElement('div'); tmp.innerHTML = canvasHTML();
    st.parentNode.replaceChild(tmp.firstChild, st);
    if (had) W.root.querySelector('.dw-svg').focus({ preventScroll: true });
  }

  /* ---------- commands ---------- */
  function centre() { var a = area(); return [a.cx, a.cy]; }
  function addShape(el) { before(); W.d.els.push(el); W.sel = [W.d.els.length - 1]; if (el.t !== 'item') W.panel = 'edit'; changed(); }
  function reorder(how) {
    var els = W.d.els, sel = W.sel.slice().sort(function (a, b) { return a - b; }), picked = sel.map(function (i) { return els[i]; }), rest = els.filter(function (x, i) { return sel.indexOf(i) < 0; }), at;
    if (how === 'front') at = rest.length;
    else if (how === 'back') at = 0;
    else if (how === 'fwd') at = Math.min(rest.length, sel[0] + 1);
    else at = Math.max(0, sel[0] - 1);
    W.d.els = rest.slice(0, at).concat(picked, rest.slice(at));
    W.sel = picked.map(function (x, k) { return at + k; });
  }
  function cmd(a, v, el0) {
    var d = W.d, one = W.sel.length === 1 ? d.els[W.sel[0]] : null, c = centre();
    switch (a) {
      case 'panel': W.panel = W.panel === v ? '' : v; if (v !== 'lib' || !W.panel) { W.pendingIng = ''; W.swap = null; } draw(); return;
      case 'undo': undo(); return;
      case 'redo': redo(); return;
      case 'many': W.many = !W.many; draw(); return;
      case 'snap': W.snap = W.snap === false; draw(); return;
      case 'stretch': W.stretch = !W.stretch; draw(); return;
      case 'none': W.sel = []; if (/colour|label|edit/.test(W.panel)) W.panel = ''; draw(); return;
      case 'zin': W.view.z = Math.min(6, W.view.z * 1.4); drawCanvas(); return;
      case 'zout': W.view.z = Math.max(0.5, W.view.z / 1.4); if (W.view.z <= 1) W.view.x = W.view.y = 0; drawCanvas(); return;
      case 'fit': W.view = { z: 1, x: 0, y: 0 }; drawCanvas(); return;
      case 'text': addShape({ t: 'text', s: 'Label', x: n1(c[0] - 20), y: n1(c[1]), size: 10, anchor: 'start' }); return;
      case 'line': addShape({ t: 'line', pts: f(c[0] - 30) + ',' + f(c[1]) + ' ' + f(c[0] + 30) + ',' + f(c[1]), w: 1.2 }); return;
      case 'arrow': addShape({ t: 'line', pts: f(c[0] - 30) + ',' + f(c[1]) + ' ' + f(c[0] + 30) + ',' + f(c[1]), w: 1.2, arrow: true }); return;
      case 'rect': addShape({ t: 'rect', x: n1(c[0]), y: n1(c[1]), w: 60, h: 40, rr: 4, fill: 'none', stroke: '#1C1D1F' }); return;
      case 'ellipse': addShape({ t: 'ellipse', x: n1(c[0]), y: n1(c[1]), w: 60, h: 40, fill: 'none', stroke: '#1C1D1F' }); return;
      case 'labels': before(); labelAll(); changed(); say('Labels added'); return;
      case 'check': W.check = check(); draw(); return;
      case 'cat': W.cat = v; W.sub = ''; W.more = 0; draw(); return;
      case 'sub': W.sub = v; W.more = 0; draw(); return;
      case 'more': W.more += 36; draw(); return;
      case 'add':
        // a drawing picked for an ingredient is remembered for the next recipe (js/smart.js, book/matches)
        if (W.pendingIng && window.LK_SMART && window.LK_SMART.teach) window.LK_SMART.teach(W.pendingIng, v);
        before();
        if (W.swap) { swapTo(v); changed(); return; }
        picked(addItem(v, { ing: W.pendingIng || '' })); if (W.pendingIng) { W.pendingIng = ''; W.q = ''; }
        changed(); say(LIB.get(v).name + ' added'); return;
      case 'swap': {
        // Swap: the library opens on the part's ingredient, and the piece tapped there takes the part's place
        var sw = W.sel.length === 1 ? d.els[W.sel[0]] : null;
        if (!sw || !sw.ing) return;
        W.swap = sw; W.panel = 'lib'; W.q = swapWords(sw.ing); W.pendingIng = sw.ing; W.cat = ''; W.sub = ''; W.more = 0; draw(); return;
      }
      case 'ing': addIng(v); return;
      case 'wfam': W.wareFam = v; draw(); return;
      case 'ware': setSurf(clone((LIB.WARE.filter(function (x) { return x.fam === (W.wareFam || famOf(d.surf)); })[0] || LIB.WARE[0]).list[+v].p)); return;
      case 'start-open': W.startOpen = !W.startOpen; return;
      case 'from': startFrom(v); return;
      case 'from-sel': if (W.fromSel) startFrom(W.fromSel); else { W.msg = 'Pick a drawing first.'; draw(); } return;
      case 'split': if (one) splitRaw(W.sel[0]); return;
      case 'piece': pieceFromSel(); return;
      case 'pc-save': savePiece(); return;
      case 'pc-cancel': W.piece = null; W.panel = ''; W.msg = ''; draw(); return;
      case 'tpl-save': saveTemplate(); return;
      case 'reuse-go': reuseGo(); return;
      case 'ware-save': W.wsave = true; draw(); var wn = W.root.querySelector('[data-dwf="wname"]'); if (wn) wn.focus(); return;
      case 'ware-save-no': W.wsave = false; draw(); return;
      case 'ware-save-go': saveWare(); return;
      case 'pick': {
        var i = +v;
        if (W.many) { var k = W.sel.indexOf(i); if (k >= 0) W.sel.splice(k, 1); else W.sel.push(i); } else W.sel = [i];
        draw(); var s = W.root.querySelector('.dw-svg'); if (s && el0 && el0.closest('.dw-check')) s.focus({ preventScroll: true }); return;
      }
    }
    if (window.LK_SMART && window.LK_SMART.ui && window.LK_SMART.ui.cmd && window.LK_SMART.ui.cmd(a, v, W)) return;
    if (!W.sel.length) return;
    before();
    if (a === 'dup') { var add = W.sel.map(function (i) { var e = clone(d.els[i]); e.x = n1((e.x || 0) + 8); e.y = n1((e.y || 0) + 8); if (e.t === 'line') e.pts = pts(e).map(function (p) { return f(p[0] + 8) + ',' + f(p[1] + 8); }).join(' '); delete e.fixed; return e; }); d.els = d.els.concat(add); W.sel = add.map(function (x, k) { return d.els.length - add.length + k; }); }
    else if (a === 'del') { d.els = d.els.filter(function (x, i) { return W.sel.indexOf(i) < 0; }); W.sel = []; if (/colour|label|edit/.test(W.panel)) W.panel = ''; }
    else if (/^(front|back|fwd|bwd)$/.test(a)) reorder(a);
    else if (a === 'flip') W.sel.forEach(function (i) { d.els[i].flip = !d.els[i].flip; });
    else if (a === 'tintc' && isPiece(one)) { var it = itemOf(one.a); one.cm = tintMap(bodyOf(one.a), (it && it.side && it.side.c) || coloursIn(bodyOf(one.a))[0], v); }
    else if (a === 'cmreset' && one) delete one.cm;
    else if (a === 'setIng' && one) {
      var si0 = itemOf(one.a);
      if (v) { one.ing = v; one.ii = ingIndex(v); one.pick = true; } else { delete one.ing; delete one.ii; delete one.pick; }
      if (v && si0 && window.LK_SMART && window.LK_SMART.teach) window.LK_SMART.teach(v, si0.id);
      // a sauce labelled with its name takes that sauce's colour (pepper, mushroom, hollandaise...)
      var si = itemOf(one.a), sc = v && si && (si.role === 'sauce' || si.role === 'dsauce') ? LIB.sauceColour(v) : '';
      if (sc && !one.cm && si.side && si.side.c) one.cm = tintMap(bodyOf(one.a), si.side.c, sc);
    }
    else { W.undo.pop(); return; }
    changed();
  }
  function famOf(s) { if (!s) return 'plate'; if (s.fam !== 'other') return s.fam; var g = LIB.WARE.filter(function (x) { return x.list.some(function (y) { return y.p.shape === s.shape; }); })[0]; return g ? g.fam : 'other'; }
  // a new servingware: the food stays, moved in or out with the new size when asked
  function setSurf(p) {
    var d = W.d, a0 = surface(d) ? area() : null;
    before(); d.surf = p;
    var a1 = surface(d) ? area() : null;
    if (a0 && a1 && W.fitFood !== false) {
      var kx = a1.rx / a0.rx, ky = a1.ry / a0.ry, k = Math.min(kx, ky);
      d.els.forEach(function (el) {
        if (el.x == null) return;
        el.x = n1(a1.cx + (el.x - a0.cx) * kx); el.y = n1(a1.cy + (el.y - a0.cy) * ky);
        if (el.t === 'item' && k < 0.98) { el.sx = n1(el.sx * Math.max(k, 0.5) * 100) / 100; el.sy = n1(el.sy * Math.max(k, 0.5) * 100) / 100; }
      });
    }
    changed();
  }
  function setField(k, val, ev) {
    var d = W.d, one = W.sel.length === 1 ? d.els[W.sel[0]] : null;
    if (k === 'q') { W.q = val; W.more = 0; draw(); return; }
    if (k === 'fitfood') { W.fitFood = !!val; return; }
    // reuse: the boxes keep what is typed, without drawing the page again
    if (k === 'fromsel') { W.fromSel = val; return; }
    if (k === 'tplname') { W.tplName = val; return; }
    if (k === 'reuse') { W.reuse = val; return; }
    if (k === 'wname') { W.wname = val; return; }
    if (k.indexOf('pc.') === 0) { if (W.piece) W.piece[k.slice(3)] = val; return; }
    if (k.indexOf('surf.') === 0) { var p = clone(d.surf), kk = k.slice(5); p[kk] = kk === 'size' ? Number(val) : val; setSurf(p); return; }
    if (!one) return;
    if (k.indexOf('col.') === 0) { if (ev.type !== 'change') return; before(); one.cm = one.cm || {}; one.cm[k.slice(4)] = String(val).toUpperCase(); changed(); return; }
    if (k === 'tint') { if (ev.type !== 'change') return; var col = LIB.sauceColour(val); if (!col) { say('No sauce colour for ' + val); return; } var it = itemOf(one.a); before(); one.cm = tintMap(bodyOf(one.a), (it && it.side && it.side.c) || coloursIn(bodyOf(one.a))[0], col); changed(true); say('Coloured like ' + val); return; }
    if (k === 'op') { if (ev.type !== 'change') { one.op = Number(val) / 100; drawCanvas(); return; } before(); one.op = Number(val) / 100; changed(); return; }
    if (k.indexOf('el.') === 0) {
      var f0 = k.slice(3);
      // typed words: one undo step per box, the canvas follows each letter
      if (/^(s|sub)$/.test(f0)) { if (W.typing !== W.sel[0] + f0) { before(); W.typing = W.sel[0] + f0; } one[f0] = val; changed(true); if (ev.type === 'change') W.typing = ''; return; }
      if (ev.type !== 'change') return;
      before();
      if (f0 === 'size' || f0 === 'w') one[f0] = Number(val);
      else if (f0 === 'lead') { if (val) { one.lx = n1(one.x + 30); one.ly = n1(one.y + 10); } else { delete one.lx; delete one.ly; } }
      else if (f0 === 'arrow' || f0 === 'dash') { if (val) one[f0] = true; else delete one[f0]; }
      else if (f0 === 'nofill') one.fill = val ? 'none' : '#FFFFFF';
      else if (f0 === 'fill' || f0 === 'stroke' || f0 === 'col') one[f0] = String(val).toUpperCase();
      else one[f0] = val;
      changed();
    }
  }

  /* ---------- moving, sizing and turning with a finger, pen or mouse ---------- */
  var drag = null, ptrs = {};
  function toSvg(svg, x, y) { var m = svg.getScreenCTM(); if (!m) return [0, 0]; var p = svg.createSVGPoint(); p.x = x; p.y = y; p = p.matrixTransform(m.inverse()); return [p.x, p.y]; }
  function liveEl(i) {
    var g = W.root.querySelector('.dw-el[data-i="' + i + '"]'); if (g) g.innerHTML = elSVG(W.d.els[i]);
    var o = W.root.querySelector('.dw-ovl'); if (o) o.innerHTML = selOverlay() + guides();
  }
  function guides() {
    if (!drag || !drag.guide) return '';
    var v = viewBox().split(' ').map(Number), a = area(), out = '';
    if (drag.guide.x) out += '<line class="dw-guide" x1="' + f(a.cx) + '" y1="' + f(v[1]) + '" x2="' + f(a.cx) + '" y2="' + f(v[1] + v[3]) + '"/>';
    if (drag.guide.y) out += '<line class="dw-guide" x1="' + f(v[0]) + '" y1="' + f(a.cy) + '" x2="' + f(v[0] + v[2]) + '" y2="' + f(a.cy) + '"/>';
    return out;
  }
  function onDown(ev) {
    var svg = ev.target.closest && ev.target.closest('.dw-svg');
    if (!svg || !W.root || !W.root.contains(svg) || !W.d) return;
    ptrs[ev.pointerId] = [ev.clientX, ev.clientY];
    try { svg.setPointerCapture(ev.pointerId); } catch (e) {}
    var ids = Object.keys(ptrs);
    if (ids.length === 2) {
      // two fingers: pinch and turn the picked part, or zoom the view
      var p0 = ptrs[ids[0]], p1 = ptrs[ids[1]], one = W.sel.length === 1 ? W.d.els[W.sel[0]] : null;
      drag = { pinch: true, d0: Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1, a0: Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), el: one ? clone(one) : null, z0: W.view.z, snap: snapNow(), moved: false };
      return;
    }
    var p = toSvg(svg, ev.clientX, ev.clientY), h = ev.target.closest('[data-h]'), g = ev.target.closest('.dw-el');
    if (h && W.sel.length) {
      var i0 = W.sel[0], el = W.d.els[i0];
      drag = { h: h.getAttribute('data-h'), i: i0, el0: clone(el), p0: p, snap: snapNow(), moved: false };
    } else if (g) {
      var i = +g.getAttribute('data-i');
      if (W.many || ev.shiftKey) { var k = W.sel.indexOf(i); if (k >= 0 && !ev.shiftKey) W.sel.splice(k, 1); else if (k < 0) W.sel.push(i); }
      else if (W.sel.indexOf(i) < 0) W.sel = [i];
      drag = { move: true, p0: p, start: W.sel.map(function (j) { return clone(W.d.els[j]); }), snap: snapNow(), moved: false };
      var o = W.root.querySelector('.dw-ovl'); if (o) o.innerHTML = selOverlay();
      W.root.querySelectorAll('.dw-el').forEach(function (x) { x.classList.toggle('on', W.sel.indexOf(+x.getAttribute('data-i')) >= 0); });
    } else {
      drag = { pan: W.view.z > 1, c0: [ev.clientX, ev.clientY], v0: clone(W.view), moved: false, empty: true };
    }
    ev.preventDefault();
  }
  function onMove(ev) {
    if (!ptrs[ev.pointerId] || !drag) return;
    ptrs[ev.pointerId] = [ev.clientX, ev.clientY];
    var svg = W.root && W.root.querySelector('.dw-svg'); if (!svg) return;
    if (drag.pinch) {
      var ids = Object.keys(ptrs); if (ids.length < 2) return;
      var p0 = ptrs[ids[0]], p1 = ptrs[ids[1]], k = (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1) / drag.d0, da = (Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) - drag.a0) * 180 / Math.PI;
      drag.moved = true;
      if (drag.el) {
        var e = W.d.els[W.sel[0]];
        if (e.t === 'item') { e.sx = n1(drag.el.sx * k * 100) / 100; e.sy = n1(drag.el.sy * k * 100) / 100; } else if (e.w) { e.w = n1(drag.el.w * k); e.h = n1(drag.el.h * k); }
        if (e.t !== 'text' && e.t !== 'line') e.r = Math.round((drag.el.r || 0) + da);
        liveEl(W.sel[0]);
      } else { W.view.z = Math.max(0.5, Math.min(6, drag.z0 * k)); svg.setAttribute('viewBox', viewBox()); }
      return;
    }
    if (drag.empty) {
      if (!drag.pan) return;
      var r = svg.getBoundingClientRect(), v = viewBox().split(' ').map(Number);
      W.view.x = drag.v0.x - (ev.clientX - drag.c0[0]) / r.width * v[2]; W.view.y = drag.v0.y - (ev.clientY - drag.c0[1]) / r.height * v[3];
      drag.moved = true; svg.setAttribute('viewBox', viewBox()); return;
    }
    var p = toSvg(svg, ev.clientX, ev.clientY), dx = p[0] - drag.p0[0], dy = p[1] - drag.p0[1];
    if (!drag.moved && Math.hypot(dx, dy) < 1.5) return;
    drag.moved = true;
    if (drag.move) {
      var a = area();
      drag.guide = null;
      W.sel.forEach(function (i, k) {
        var s0 = drag.start[k], e = W.d.els[i];
        if (e.t === 'line') { e.pts = pts(s0).map(function (q) { return f(q[0] + dx) + ',' + f(q[1] + dy); }).join(' '); }
        else {
          e.x = n1(s0.x + dx); e.y = n1(s0.y + dy);
          if (s0.lx != null) { e.lx = n1(s0.lx + dx); e.ly = n1(s0.ly + dy); }
          if (W.sel.length === 1 && W.snap !== false) {
            drag.guide = { x: Math.abs(e.x - a.cx) < 3, y: Math.abs(e.y - a.cy) < 3 };
            if (drag.guide.x) e.x = n1(a.cx); if (drag.guide.y) e.y = n1(a.cy);
          }
        }
        liveEl(i);
      });
      return;
    }
    var el = W.d.els[drag.i], e0 = drag.el0;
    if (drag.h === 'turn') {
      var ang = Math.atan2(p[1] - e0.y, p[0] - e0.x) * 180 / Math.PI + 90, sn = Math.round(ang / 15) * 15;
      el.r = Math.round(Math.abs(ang - sn) < 4 ? sn : ang);
    } else if (drag.h === 'size') {
      var rad = -(e0.r || 0) * Math.PI / 180, lx0 = (drag.p0[0] - e0.x) * Math.cos(rad) - (drag.p0[1] - e0.y) * Math.sin(rad), ly0 = (drag.p0[0] - e0.x) * Math.sin(rad) + (drag.p0[1] - e0.y) * Math.cos(rad);
      var lx = (p[0] - e0.x) * Math.cos(rad) - (p[1] - e0.y) * Math.sin(rad), ly = (p[0] - e0.x) * Math.sin(rad) + (p[1] - e0.y) * Math.cos(rad);
      var kx = Math.max(0.1, Math.abs(lx) / (Math.abs(lx0) || 1)), ky = Math.max(0.1, Math.abs(ly) / (Math.abs(ly0) || 1)), kk = Math.max(0.1, Math.hypot(lx, ly) / (Math.hypot(lx0, ly0) || 1));
      if (!W.stretch) kx = ky = kk;
      if (el.t === 'item') { el.sx = n1(e0.sx * kx * 100) / 100; el.sy = n1(e0.sy * ky * 100) / 100; }
      else if (el.t === 'text') el.size = Math.max(6, Math.min(40, n1((e0.size || 10) * kk)));
      else { el.w = Math.max(4, n1(e0.w * kx)); el.h = Math.max(4, n1(e0.h * ky)); }
    } else if (/^p\d+$/.test(drag.h)) {
      var q = pts(e0), j = +drag.h.slice(1); q[j] = [q[j][0] + dx, q[j][1] + dy];
      el.pts = q.map(function (z) { return f(z[0]) + ',' + f(z[1]); }).join(' ');
    }
    liveEl(drag.i);
  }
  function onUp(ev) {
    if (!ptrs[ev.pointerId]) return;
    delete ptrs[ev.pointerId];
    if (!drag) return;
    var dd = drag;
    if (Object.keys(ptrs).length) return;   // a finger is still down
    drag = null;
    if (!dd.moved) { if (dd.empty && !W.many) { W.sel = []; if (/colour|label|edit/.test(W.panel)) W.panel = ''; } draw(); return; }
    if (dd.snap) {
      W.undo.push(dd.snap); if (W.undo.length > 100) W.undo.shift(); W.redo = [];
      // a part moved by hand stays where it is when "Tidy up" lays the plate out again
      if (dd.move) W.sel.forEach(function (i) { if (isPiece(W.d.els[i])) W.d.els[i].fixed = true; });
      changed();
    } else drawCanvas();
  }
  document.addEventListener('pointerdown', onDown);
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onUp);
  document.addEventListener('wheel', function (ev) {
    var svg = ev.target.closest && ev.target.closest('.dw-svg');
    if (!svg || !W.d || !(ev.ctrlKey || ev.metaKey)) return;
    ev.preventDefault();
    W.view.z = Math.max(0.5, Math.min(6, W.view.z * (ev.deltaY < 0 ? 1.12 : 1 / 1.12)));
    if (W.view.z <= 1) W.view.x = W.view.y = 0;
    svg.setAttribute('viewBox', viewBox());
  }, { passive: false });
  // a piece dragged from the library onto the drawing lands where it is let go
  var carry = null;
  document.addEventListener('pointerdown', function (ev) {
    var t = ev.target.closest && ev.target.closest('.dw-tile[data-dw="add"]');
    if (!t || !W.root || !W.root.contains(t)) return;
    carry = { id: t.getAttribute('data-v'), x: ev.clientX, y: ev.clientY, moved: false };
  });
  document.addEventListener('pointermove', function (ev) { if (carry && Math.hypot(ev.clientX - carry.x, ev.clientY - carry.y) > 12) carry.moved = true; });
  document.addEventListener('pointerup', function (ev) {
    var c = carry; carry = null;
    if (!c || !c.moved || !W.root) return;
    var svg = W.root.querySelector('.dw-svg'), r = svg && svg.getBoundingClientRect();
    if (!r || ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) return;
    var p = toSvg(svg, ev.clientX, ev.clientY);
    before(); picked(addItem(c.id, { x: p[0], y: p[1], ing: W.pendingIng || '' })); W.pendingIng = ''; W.swap = null; changed();
    suppressClick = true; setTimeout(function () { suppressClick = false; }, 0);
  });
  var suppressClick = false;

  /* ---------- clicks, typing and keys ---------- */
  document.addEventListener('click', function (ev) {
    if (!W.root || !W.d || !W.root.contains(ev.target)) return;
    var el = ev.target.closest('[data-dw]');
    if (!el) return;
    if (suppressClick && el.getAttribute('data-dw') === 'add') return;
    var a = el.getAttribute('data-dw'), v = el.getAttribute('data-v');
    if (a === 'save') { save(false); return; }
    if (a === 'mine') { save(true); return; }
    if (a === 'theirs') { var t = W.conflict && W.conflict.rec; W.conflict = null; if (t) { W.d = fromDoc(W.d.id, t); W.d.saved = snapNow(); } lsSet(draftKey(), ''); draw(); return; }
    if (a === 'kept-use') { var k = W.d.kept; before(); W.d.surf = k.surf; W.d.els = k.els; W.d.name = k.name || W.d.name; Object.keys(k.defs || {}).forEach(function (x) { if (W.d.defs[x] === undefined) W.d.defs[x] = k.defs[x]; }); W.d.kept = null; changed(); return; }
    if (a === 'kept-drop') { W.d.kept = null; lsSet(draftKey(), ''); draw(); return; }
    if (a === 'newer') { before(); W.d.els.forEach(function (e) { if (e.t !== 'item') return; var it = itemOf(e.a); if (it && it.id + '@' + it.v !== e.a) { e.a = it.id + '@' + it.v; W.d.defs[e.a] = LIB.body(it.id); } }); changed(); return; }
    cmd(a, v, el);
  });
  function onInput(ev) {
    if (!W.root || !W.d || !W.root.contains(ev.target)) return;
    var k = ev.target.getAttribute('data-dwf'); if (!k) return;
    if (k === 'svgfile') { if (ev.type === 'change') { importSvg(ev.target.files && ev.target.files[0]); ev.target.value = ''; } return; }
    var val = ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value;
    if (ev.type === 'input' && (ev.target.tagName === 'SELECT' || ev.target.type === 'checkbox' || ev.target.type === 'color')) return;
    setField(k, val, ev);
  }
  document.addEventListener('input', onInput);
  document.addEventListener('change', onInput);
  document.addEventListener('keydown', function (ev) {
    if (!W.root || !W.d || !W.root.contains(ev.target)) return;
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName), mod = ev.ctrlKey || ev.metaKey, k = ev.key;
    if (mod && !typing && (k === 'z' || k === 'Z')) { ev.preventDefault(); if (ev.shiftKey) redo(); else undo(); return; }
    if (mod && !typing && (k === 'y' || k === 'Y')) { ev.preventDefault(); redo(); return; }
    if (!ev.target.classList.contains('dw-svg')) return;
    if (mod && (k === 'd' || k === 'D')) { ev.preventDefault(); cmd('dup'); return; }
    if (k === 'Delete' || k === 'Backspace') { ev.preventDefault(); cmd('del'); return; }
    if (k === 'Escape') { W.sel = []; draw(); return; }
    var step = ev.shiftKey ? 10 : 1, mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[k];
    if (mv && W.sel.length) {
      ev.preventDefault(); before();
      W.sel.forEach(function (i) { var e = W.d.els[i]; if (e.t === 'line') e.pts = pts(e).map(function (q) { return f(q[0] + mv[0]) + ',' + f(q[1] + mv[1]); }).join(' '); else { e.x = n1(e.x + mv[0]); e.y = n1(e.y + mv[1]); if (e.lx != null) { e.lx = n1(e.lx + mv[0]); e.ly = n1(e.ly + mv[1]); } } if (isPiece(e)) e.fixed = true; });
      clearTimeout(keepT); keepT = setTimeout(keepNow, 400); drawCanvas();
    }
  });
  window.addEventListener('beforeunload', function (ev) { if (W.root && dirty()) { ev.preventDefault(); ev.returnValue = ''; } });

  /* ---------- reuse (21 Oct 2026): start from a copy, templates, the head chef's own pieces and servingware ----------
     A new drawing can start from a copy of a template, another drawing or the book's own drawing; the original never
     changes. Templates (drawtpl) and the head chef's own pieces and servingware (drawlib) are read with one query each
     when the editor opens. Everything read from the book is cleaned like the book's own drawings. */
  var SVGNS = 'http://www.w3.org/2000/svg';
  var MINE = { tpl: [], lib: [], loaded: false, p: null };
  function vbOk(v) { return typeof v === 'string' && /^-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+$/.test(v) ? v : ''; }
  function tplRec(id, x) {
    if (!x || !Array.isArray(x.els) || !SLOT_NAME[x.slot]) return null;
    var defs = {}; try { defs = JSON.parse(x.defs || '{}') || {}; } catch (e) {}
    Object.keys(defs).forEach(function (k) { defs[k] = typeof defs[k] === 'string' ? X.clean(defs[k]) : ''; });
    return { id: id, name: String(x.name || '').slice(0, 80), slot: x.slot, surf: x.surf || { fam: 'none' }, els: x.els, defs: defs, vb: vbOk(x.vb), svgS: X.clean(x.svgS), svgF: X.clean(x.svgF), v: x.v || 1, removed: !!x.removed };
  }
  // the head chef's pieces and saved servingware, into the library (js/library.js LK_LIB.mine)
  function mineToLib() {
    LIB.mine(MINE.lib.filter(function (x) { return x.type === 'item' && typeof x.body === 'string' && x.w > 0 && x.h > 0; }).map(function (x) {
      return { id: 'my-' + x.id, v: x.v, name: String(x.name || '').slice(0, 60), cat: x.cat, kw: x.kw, role: x.role, form: x.form, g: x.g, n: x.n, w: x.w, h: x.h, side: x.side, body: X.clean(x.body) };
    }), MINE.lib.filter(function (x) { return x.type === 'surf' && x.p && x.p.fam; }).map(function (x) { return { name: String(x.name || '').slice(0, 60), p: x.p }; }));
  }
  function loadMine(force) {
    if (MINE.p && !force) return MINE.p;
    var api = B();
    MINE.p = api.ready().then(function () {
      var fs = api.fs();
      return Promise.all([fs.getDocs(api.colRef('drawtpl')), fs.getDocs(api.colRef('drawlib'))]);
    }).then(function (r) {
      MINE.tpl = r[0].docs.map(function (sn) { return tplRec(sn.id, sn.data()); }).filter(function (t) { return t && !t.removed; });
      MINE.lib = r[1].docs.map(function (sn) { var x = sn.data(); x.id = sn.id; return x; }).filter(function (x) { return !x.removed; });
      mineToLib(); MINE.loaded = true;
      if (W.d) draw();
    }, function () { MINE.p = null; MINE.loaded = true; if (W.d) draw(); });
    return MINE.p;
  }
  function slug(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 36) || 'piece'; }
  function freshId(name) { return slug(name) + '-' + Math.floor(B().now()).toString(36); }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + s.length.toString(36); }
  function refused(err, what) { return err && err.code === 'permission-denied' ? 'Not saved: the book refused it. Only the head chef can save ' + what + '.' : 'Not saved. Check the signal and try again.'; }

  // the book's own drawing for a slot, as one picture. Where the book's standard plate or GN pan is under the food, that
  // part becomes real servingware (it can be swapped) and the food stays a picture on it.
  var BOOK_VB = { plate: '2 16 212 212', pan: '0 0 200 140' };
  function bookSource(slot, key) {
    var ART = window.LK_ART || {}, pl = (ART.plates || {})[key], pn = (ART.pans || {})[key], svg = '', vb = '';
    if (!key || key.charAt(0) === '@') return null;
    if ((slot === 'plate' || slot === 'pan') && (pl || pn)) { svg = pl || pn; vb = pl ? BOOK_VB.plate : BOOK_VB.pan; }
    else if (slot === 'side' && ART.sides && ART.sides[key]) { svg = ART.sides[key].body; vb = ART.sides[key].viewBox; }
    else if (slot === 'build' && ART.diagrams && ART.diagrams[key]) { svg = ART.diagrams[key].body; vb = ART.diagrams[key].viewBox; }
    var v = String(vb).split(' ').map(Number);
    if (!svg || v.length !== 4) return null;
    var doc = new DOMParser().parseFromString('<svg xmlns="' + SVGNS + '">' + svg + '</svg>', 'image/svg+xml'), kids = Array.prototype.slice.call(doc.documentElement.children);
    var at = function (el, k, n) { return Math.abs(Number(el.getAttribute(k)) - n) < 0.5; };
    var surf = { fam: 'none' }, tx = -(v[0] + v[2] / 2), ty = -(v[1] + v[3] / 2), k = 1, y0 = 0;
    if (pl && kids.length > 3 && kids[1].localName === 'circle' && at(kids[1], 'cx', 106) && at(kids[1], 'cy', 120) && at(kids[1], 'r', 100) && kids[2].localName === 'circle' && at(kids[2], 'r', 82)) {
      // the book's 30 cm dinner plate (shadow, plate, rim) is the editor's own: the same size and scale
      kids.splice(0, 3); surf = { fam: 'plate', shape: 'round', size: 30, rim: 'wide', finish: 'gloss', col: 'white' }; tx = -106; ty = -120;
    } else if (pn && kids.length > 2 && kids[0].localName === 'rect' && at(kids[0], 'width', 192) && kids[1].localName === 'rect' && at(kids[1], 'width', 168)) {
      // the book's GN pan: its food is fitted into a real GN 1/2
      kids.splice(0, 2); surf = { fam: 'other', shape: 'gn', gn: '1/2' }; tx = -100; ty = -70;
      var a = LIB.surface(surf).area; k = Math.round(Math.min(a.rx * 2 / 160, a.ry * 2 / 96) * 100) / 100;
    } else if (slot === 'side') { k = Math.round(Math.min(1, 236 / v[2], 166 / v[3]) * 100) / 100; y0 = -55; }
    else if (slot === 'build') k = Math.round(Math.min(1, 340 / v[2], 242 / v[3]) * 100) / 100;
    var inner = X.clean(kids.map(function (c) { return new XMLSerializer().serializeToString(c); }).join(''));
    if (!inner) return null;
    var body = '<g transform="translate(' + f(tx) + ' ' + f(ty) + ')">' + inner + '</g>', a2 = 'raw:' + hash(body), defs = {};
    defs[a2] = body;
    return { surf: surf, defs: defs, els: [{ t: 'raw', a: a2, x: 0, y: y0, sx: k, sy: k, r: 0, bx: f(v[0] + tx) + ' ' + f(v[1] + ty) + ' ' + f(v[0] + v[2] + tx) + ' ' + f(v[1] + v[3] + ty) }] };
  }
  // parts copied from another drawing keep their label only where this recipe has that ingredient; labels written on a
  // side or build drawing are left to Label everything
  function adaptEls(els) {
    return els.filter(function (el) { return !(el.t === 'text' && el.auto); }).map(function (el) {
      delete el.fixed; delete el.pick;
      if (el.ing && ingIndex(el.ing) < 0) { delete el.ing; delete el.ii; } else if (el.ing) el.ii = ingIndex(el.ing);
      if (el.also) {
        var keep = String(el.also).split('|').filter(function (k) { return ingIndex(k) >= 0; });
        if (keep.length) { el.also = keep.join('|'); el.ai = keep.map(ingIndex).join('|'); } else { delete el.also; delete el.ai; }
      }
      return el;
    });
  }
  // tpl:<id>, d:<drawing id> or book:<key>: the drawing to start from, as a promise of { surf, els, defs } (or null)
  function sourceOf(code) {
    var d = W.d, m = /^(tpl|d|book):(.+)$/.exec(code || ''), api = B();
    if (!m) return Promise.resolve(null);
    if (m[1] === 'book') return Promise.resolve(bookSource(d.slot, m[2]));
    if (m[1] === 'tpl') return loadMine().then(function () { var t = MINE.tpl.filter(function (x) { return x.id === m[2]; })[0]; return t ? { surf: t.surf, els: clone(t.els), defs: t.defs } : null; });
    return api.ready().then(function () { return api.fs().getDoc(api.docRef('drawings', m[2])); }).then(function (sn) {
      if (!sn.exists()) return null;
      var o = fromDoc(m[2], sn.data());
      return { surf: o.surf, els: o.els, defs: o.defs };
    });
  }
  function startFrom(code) {
    var d = W.d;
    return sourceOf(code).then(function (src) {
      if (W.d !== d) return false;
      if (!src) { W.msg = 'Could not open that drawing. Check the signal and try again.'; draw(); return false; }
      before();
      d.surf = clone(src.surf || d.surf);
      d.els = adaptEls(clone(src.els || []));
      Object.keys(src.defs || {}).forEach(function (k) { d.defs[k] = src.defs[k]; });
      d.from = code.slice(0, 80); W.started = true; W.sel = []; W.panel = ''; W.msg = '';
      changed(); say('Started from a copy. The original stays as it is.');
      return true;
    }, function () { if (W.d === d) { W.msg = 'Could not open that drawing. Check the signal and try again.'; draw(); } return false; });
  }
  function bookKeys(slot) {
    var ART = window.LK_ART || {}, m = slot === 'plate' ? ART.plates : slot === 'pan' ? ART.pans : slot === 'side' ? ART.sides : ART.diagrams;
    return Object.keys(m || {}).filter(function (k) { return k.charAt(0) !== '@'; });
  }
  function bookThumb(slot, key) {
    var ART = window.LK_ART || {};
    if (slot === 'plate' || slot === 'pan') { var pl = (ART.plates || {})[key]; return '<svg viewBox="' + (pl ? BOOK_VB.plate : BOOK_VB.pan) + '" aria-hidden="true" focusable="false">' + (pl || (ART.pans || {})[key] || '') + '</svg>'; }
    var o = (slot === 'side' ? ART.sides : ART.diagrams || {})[key];
    return o ? '<svg viewBox="' + esc(o.viewBox) + '" aria-hidden="true" focusable="false">' + o.body + '</svg>' : '';
  }
  function tplThumb(t) { return '<svg viewBox="' + esc(t.vb || '-110 -110 220 220') + '" aria-hidden="true" focusable="false"><g data-surf="1">' + t.svgS + '</g>' + t.svgF + '</svg>'; }
  // a new, empty drawing: start blank (the library is below), or from a copy
  function startHTML() {
    var d = W.d, r = rec();
    if (!d.isNew || d.els.length || W.started) return '';
    var own = d.slot === 'side' ? (bookKeys('side').indexOf(d.rid) >= 0 ? d.rid : '') : d.slot === 'build' ? (r && r.diagram && r.diagram.charAt(0) !== '@' ? r.diagram : '') : (r && r.art && r.art.charAt(0) !== '@' ? r.art : '');
    var tpls = MINE.tpl.filter(function (t) { return t.slot === d.slot; }), others = X.arts().filter(function (x) { return x.slot === d.slot && !x.removed; });
    var tile = function (code, label, pic) { return '<button type="button" class="dw-tile" data-dw="from" data-v="' + esc(code) + '">' + pic + '<span>' + esc(label) + '</span></button>'; };
    // one line until it is opened, so the library stays where it is
    return '<details class="dw-panel dw-start"' + (W.startOpen ? ' open' : '') + '><summary data-dw="start-open">Start from a copy' + (own ? ' of the book\'s drawing' : '') + (tpls.length ? ', a template' : '') + ' or another drawing</summary><p class="hint">Draw from blank with the library below, or start from a copy. What you start from stays as it is.</p>' +
      (own || tpls.length ? '<div class="dw-lib">' + (own ? tile('book:' + own, 'The book\'s drawing of ' + (r ? r.name : d.rid), bookThumb(d.slot, own)) : '') + tpls.map(function (t) { return tile('tpl:' + t.id, 'Template: ' + t.name, tplThumb(t)); }).join('') + '</div>' : '') +
      (!MINE.loaded ? '<p class="hint">Looking for templates...</p>' : '') +
      '<div class="field"><label class="label" for="dw-from">Or a copy of another drawing</label><select id="dw-from" class="search" data-dwf="fromsel"><option value="">Pick a drawing</option>' +
      (others.length ? '<optgroup label="Drawn in the book">' + others.map(function (x) { return '<option value="d:' + esc(x.id) + '"' + (W.fromSel === 'd:' + x.id ? ' selected' : '') + '>' + esc(x.name || x.id) + '</option>'; }).join('') + '</optgroup>' : '') +
      '<optgroup label="The book\'s own">' + bookKeys(d.slot).map(function (k) { var rr = A.byId(k); return '<option value="book:' + esc(k) + '"' + (W.fromSel === 'book:' + k ? ' selected' : '') + '>' + esc(rr ? rr.name : k) + '</option>'; }).join('') + '</optgroup></select></div>' +
      '<div class="btn-row">' + btn('from-sel', 'Start from a copy of it', { cls: 'btn' }) + '</div></details>';
  }

  // Split into pieces: each shape of a picture becomes a part of its own (shapes, not named ingredients)
  function splitRaw(i) {
    var el = W.d.els[i]; if (!el || el.t !== 'raw') return;
    var host = document.createElementNS(SVGNS, 'svg');
    host.setAttribute('style', 'position:absolute;left:-10000px;top:0;width:10px;height:10px;overflow:hidden');
    host.innerHTML = bodyOf(el.a);
    document.body.appendChild(host);
    var top = host, tx = 0, ty = 0, g = host.firstElementChild, m;
    // the picture's own offset: one group that only moves it
    if (host.children.length === 1 && g.localName === 'g' && (m = /^translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\s*\)$/.exec(String(g.getAttribute('transform') || '').trim()))) { tx = +m[1]; ty = +m[2]; top = g; }
    while (top.children.length === 1 && top.firstElementChild.localName === 'g' && !top.firstElementChild.getAttribute('transform')) top = top.firstElementChild;
    var kids = Array.prototype.slice.call(top.children);
    if (kids.length < 2 || W.d.els.length + kids.length > 600) { document.body.removeChild(host); say(kids.length < 2 ? 'This part is one shape already.' : 'Too many shapes to split here.'); return; }
    var fx = (el.flip ? -1 : 1) * (el.sx || 1), sy = el.sy || 1, ra = (el.r || 0) * Math.PI / 180, ca = Math.cos(ra), sa = Math.sin(ra);
    var pieces = kids.map(function (c) {
      var wrap = document.createElementNS(SVGNS, 'g'); top.insertBefore(wrap, c); wrap.appendChild(c);
      var bb = wrap.getBBox(), cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
      var body = X.clean('<g transform="translate(' + f(-cx) + ' ' + f(-cy) + ')">' + new XMLSerializer().serializeToString(c) + '</g>'), key = 'raw:' + hash(body);
      W.d.defs[key] = body;
      var px = fx * (cx + tx), py = sy * (cy + ty), w2 = Math.max(1, bb.width) / 2, h2 = Math.max(1, bb.height) / 2;
      var p = { t: 'raw', a: key, x: n1(el.x + px * ca - py * sa), y: n1(el.y + px * sa + py * ca), sx: el.sx || 1, sy: sy, r: el.r || 0, bx: f(-w2) + ' ' + f(-h2) + ' ' + f(w2) + ' ' + f(h2) };
      if (el.flip) p.flip = true; if (el.cm) p.cm = clone(el.cm); if (el.op != null) p.op = el.op;
      return p;
    });
    document.body.removeChild(host);
    before(); W.d.els.splice.apply(W.d.els, [i, 1].concat(pieces)); W.sel = []; changed();
    say('Split into ' + pieces.length + ' pieces');
  }

  // a new library piece: from the parts picked on the drawing (a recoloured piece, a piece of a book drawing, several
  // parts together), or from an SVG file
  var PIECE_ROLE = { meat: 'main', seafood: 'main', veg: 'veg', potato: 'starch', grains: 'starch', bread: 'bread', prepared: 'main', sauce: 'sauce', garnish: 'garnish', sweet: 'dessert', dairy: 'topping', build: 'main' };
  function pieceFromSel() {
    var els = W.sel.map(function (i) { return W.d.els[i]; }).filter(function (el) { return el && el.t !== 'text'; });
    if (!els.length) return;
    var b = els.map(bbox).reduce(function (m, e) { return [Math.min(m[0], e[0]), Math.min(m[1], e[1]), Math.max(m[2], e[2]), Math.max(m[3], e[3])]; }), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
    var first = els.filter(function (el) { return el.t === 'item'; })[0], it = first && itemOf(first.a);
    W.piece = { inner: '<g transform="translate(' + f(-cx) + ' ' + f(-cy) + ')">' + els.map(elSVG).join('') + '</g>', w: Math.max(1, n1(b[2] - b[0])), h: Math.max(1, n1(b[3] - b[1])), name: els.length === 1 ? (first && (first.ing || (it && it.name)) || '') : '', cat: W.d.slot === 'side' || W.d.slot === 'build' ? 'build' : it ? it.cat : 'prepared', kw: '', from: 'sel' };
    W.panel = 'piece'; W.msg = ''; draw();
  }
  function svgPiece(text) {
    var doc = new DOMParser().parseFromString(text, 'image/svg+xml'), root = doc.documentElement;
    if (!root || root.localName !== 'svg' || doc.getElementsByTagName('parsererror').length) return null;
    var v = String(root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    if (v.length !== 4 || !v.every(isFinite) || v[2] <= 0 || v[3] <= 0) { var w = parseFloat(root.getAttribute('width')), h = parseFloat(root.getAttribute('height')); v = [0, 0, w > 0 ? w : 100, h > 0 ? h : 100]; }
    var inner = X.clean(Array.prototype.map.call(root.childNodes, function (c) { return c.nodeType === 1 ? new XMLSerializer().serializeToString(c) : ''; }).join(''));
    if (!inner || !/<(path|circle|ellipse|rect|line|polyline|polygon)\b/.test(inner)) return null;
    // about 9 cm across to start with; it can be sized on the drawing
    var k = 60 / Math.max(v[2], v[3]);
    return { inner: '<g transform="translate(' + f(-(v[0] + v[2] / 2) * k) + ' ' + f(-(v[1] + v[3] / 2) * k) + ') scale(' + Math.round(k * 10000) / 10000 + ')">' + inner + '</g>', w: n1(v[2] * k), h: n1(v[3] * k), cat: W.d.slot === 'side' || W.d.slot === 'build' ? 'build' : 'prepared', kw: '', from: 'svg' };
  }
  function importSvg(file) {
    if (!file) return;
    if (file.size > 100000) { W.msg = 'That file is too big: 100 kB at most.'; draw(); return; }
    var rd = new FileReader();
    rd.onload = function () {
      var pc = svgPiece(String(rd.result || ''));
      if (!pc) { W.msg = 'Nothing in that file could be used. Only plain shapes are kept: no pictures, styles or effects.'; draw(); return; }
      pc.name = String(file.name || '').replace(/\.svg$/i, '').replace(/[-_]+/g, ' ').trim().slice(0, 60);
      W.piece = pc; W.panel = 'piece'; W.msg = ''; draw();
    };
    rd.onerror = function () { W.msg = 'That file could not be read.'; draw(); };
    rd.readAsText(file);
  }
  function pieceHTML() {
    var pc = W.piece; if (!pc) return '';
    var m = 4, vb = f(-pc.w / 2 - m) + ' ' + f(-pc.h / 2 - m) + ' ' + f(pc.w + 2 * m) + ' ' + f(pc.h + 2 * m);
    return '<section class="dw-panel" aria-labelledby="dw-h-pc"><h3 class="h3" id="dw-h-pc">New library piece</h3><p class="hint">It goes in the library under its category, as ' + esc(LIB.MINE) + '. Drawings that use it keep their own copy, so changing the library never changes them.</p>' +
      '<div class="dw-pc-prev"><svg viewBox="' + vb + '" aria-hidden="true" focusable="false">' + pc.inner + '</svg></div>' +
      '<label class="field"><span class="label">Name</span><input class="search" data-dwf="pc.name" maxlength="60" value="' + esc(pc.name) + '" placeholder="For example: Leichhardt slaw, house side"></label>' +
      '<label class="field"><span class="label">Category</span><select class="search" data-dwf="pc.cat">' + LIB.cats.map(function (c) { return '<option value="' + c.id + '"' + (pc.cat === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></label>' +
      '<label class="field"><span class="label">Other words to find it by</span><input class="search" data-dwf="pc.kw" maxlength="300" value="' + esc(pc.kw) + '"></label>' +
      '<div class="btn-row">' + btn('pc-save', 'Save to the library', { cls: 'btn dark', dis: !!W.busy }) + btn('pc-cancel', 'Cancel', { cls: 'btn' }) + '</div></section>';
  }
  function savePiece() {
    var pc = W.piece, api = B();
    if (!pc || W.busy) return;
    var name = String(pc.name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!name) { W.msg = 'Give the piece a name.'; draw(); return; }
    // a side or build piece stands on its base (y = 0), every other piece sits around its middle
    var body = pc.cat === 'build' ? '<g transform="translate(0 ' + f(-pc.h / 2) + ')">' + pc.inner + '</g>' : pc.inner;
    if (body.length > 100000) { W.msg = 'Not saved: this piece is too big for the library (100 kB at most). Pick fewer parts.'; draw(); return; }
    var col = coloursIn(body).filter(function (h) { return h !== '#FFFFFF' && h !== '#000000'; })[0] || '#C98A45';
    var id = freshId(name), out = { type: 'item', name: name, cat: pc.cat, kw: String(pc.kw || '').slice(0, 300), role: PIECE_ROLE[pc.cat] || 'main', form: 'piece', n: 1, w: pc.w, h: pc.h, body: body, side: { s: 'mound', h: Math.max(4, n1(pc.h * 0.3)), c: col }, v: 1, upd: api.now(), removed: false };
    W.busy = true; W.msg = ''; draw();
    api.ready().then(function () { return api.W([['set', api.docRef('drawlib', id), out]]); }).then(function () {
      W.busy = false; out.id = id; MINE.lib.push(out); mineToLib();
      if (pc.from === 'svg' && W.d) { before(); addItem('my-' + id, {}); changed(); }
      W.piece = null; W.panel = 'lib'; W.q = name; W.cat = ''; W.sub = '';
      toast('Saved to the library: ' + name + '.'); draw();
    }, function (err) { W.busy = false; W.msg = refused(err, 'library pieces'); draw(); });
  }

  // the servingware on this drawing, kept as a preset (the family Saved)
  function saveWare() {
    var api = B(), name = String(W.wname || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (W.busy) return;
    if (!name) { W.msg = 'Give the servingware a name.'; draw(); return; }
    var id = freshId(name), out = { type: 'surf', name: name, p: clone(W.d.surf), v: 1, upd: api.now(), removed: false };
    W.busy = true; W.msg = ''; draw();
    api.ready().then(function () { return api.W([['set', api.docRef('drawlib', id), out]]); }).then(function () {
      W.busy = false; out.id = id; MINE.lib.push(out); mineToLib(); W.wsave = false; W.wname = ''; W.wareFam = 'saved';
      toast('Servingware saved: ' + name + '.'); draw();
    }, function (err) { W.busy = false; W.msg = refused(err, 'servingware'); draw(); });
  }

  // Save as a template: the plating without its labels, for any recipe to start from
  function tplHTML() {
    return '<section class="dw-panel" aria-labelledby="dw-h-tpl"><h3 class="h3" id="dw-h-tpl">Save as a template</h3><p class="hint">New drawings can start from a copy of it. The ingredient labels are left off, so it fits any recipe. This drawing stays as it is.</p>' +
      '<label class="field"><span class="label">Template name</span><input class="search" data-dwf="tplname" maxlength="80" value="' + esc(W.tplName == null ? W.d.name : W.tplName) + '"></label>' +
      '<div class="btn-row">' + btn('tpl-save', 'Save the template', { cls: 'btn dark', dis: !!W.busy }) + '</div></section>';
  }
  function saveTemplate() {
    var d = W.d, api = B(), name = String(W.tplName == null ? d.name : W.tplName).replace(/\s+/g, ' ').trim().slice(0, 80);
    if (W.busy) return;
    if (!name) { W.msg = 'Give the template a name.'; draw(); return; }
    if (!d.els.length) { W.msg = 'Put something on the drawing first.'; draw(); return; }
    var els = clone(d.els).filter(function (el) { return !(el.t === 'text' && el.auto); }).map(function (el) { delete el.ing; delete el.ii; delete el.also; delete el.ai; delete el.fixed; delete el.pick; return el; }), used = {};
    els.forEach(function (el) { if (isPiece(el)) used[el.a] = bodyOf(el.a); });
    var out = { name: name, slot: d.slot, surf: clone(d.surf), els: els, defs: JSON.stringify(used), vb: viewBoxOf({ slot: d.slot, surf: d.surf, els: els }), svgS: svgS(d), svgF: els.map(elSVG).join(''), v: 1, upd: api.now(), removed: false };
    if (out.defs.length > 300000 || out.svgF.length > 300000) { W.msg = 'Not saved: this drawing is too big for a template.'; draw(); return; }
    var id = freshId(name);
    W.busy = true; W.msg = ''; draw();
    api.ready().then(function () { return api.W([['set', api.docRef('drawtpl', id), out]]); }).then(function () {
      W.busy = false; MINE.tpl.push(tplRec(id, out)); W.panel = ''; W.tplName = null;
      toast('Saved as a template: ' + name + '. New drawings can start from it.'); draw();
    }, function (err) { W.busy = false; W.msg = refused(err, 'templates'); draw(); });
  }

  // Use for another recipe: a copy of this drawing opens for the recipe picked
  function reuseHTML() {
    var d = W.d, dish = /^(main|snack|side|dessert)$/, list = (D.recipes || []).filter(function (r) { return r.id !== d.rid && (d.slot === 'pan' ? !dish.test(r.kind) : dish.test(r.kind)); }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    return '<section class="dw-panel" aria-labelledby="dw-h-re"><h3 class="h3" id="dw-h-re">Use for another recipe</h3><p class="hint">A copy of this drawing opens for the recipe you pick. This drawing stays as it is. Parts keep their label where the other recipe has that ingredient.</p>' +
      '<label class="field"><span class="label">Recipe</span><select class="search" data-dwf="reuse"><option value="">Pick a recipe</option>' + list.map(function (r) { return '<option value="' + esc(r.id) + '"' + (W.reuse === r.id ? ' selected' : '') + '>' + esc(r.name) + '</option>'; }).join('') + '</select></label>' +
      '<div class="btn-row">' + btn('reuse-go', 'Make the copy', { cls: 'btn dark' }) + '</div></section>';
  }
  function reuseGo() {
    var d = W.d;
    if (d.isNew || dirty()) { W.msg = 'Save this drawing first, then use it for another recipe.'; draw(); return; }
    if (!W.reuse) { W.msg = 'Pick the recipe first.'; draw(); return; }
    location.hash = '#/manage/draw/new/' + encodeURIComponent(W.reuse) + '/' + d.slot + '/d:' + d.id;
  }

  /* ---------- saving ---------- */
  function fromDoc(id, x) {
    var defs = {}; try { defs = JSON.parse(x.defs || '{}') || {}; } catch (e) {}
    // every piece's drawing read from the book is cleaned like the book's own (plain shapes and text only)
    Object.keys(defs).forEach(function (k) { defs[k] = typeof defs[k] === 'string' ? X.clean(defs[k]) : ''; });
    return { id: id, isNew: false, rid: x.rid || '', slot: x.slot, name: x.name || '', surf: x.surf || { fam: 'none' }, els: Array.isArray(x.els) ? x.els : [], defs: defs, layout: x.layout || null, from: x.from || '', meta: { v: x.v || 0, removed: !!x.removed, by: x.by || '', upd: x.upd || 0 } };
  }
  // the record a drawing is saved as: its parts, a copy of each piece it uses, the flat SVG the book shows (run with the
  // drawing as W.d, see withDrawing)
  function outOf(d) {
    var r = recipeOf(d.rid), vb = viewBoxOf(d), used = {};
    d.els.forEach(function (el) { if (isPiece(el)) used[el.a] = bodyOf(el.a); });
    var out = { rid: d.rid, slot: d.slot, name: String(d.name || '').slice(0, 80), vb: vb, k: 1, surf: d.surf, els: clone(d.els), defs: JSON.stringify(used), svgS: svgS(d), svgF: svgF(d), alt: altText(d, r ? r.name : d.rid), from: d.from || '', upd: 0, v: 0, removed: false };
    if (d.layout) out.layout = d.layout;
    if (d.slot === 'build') out.title = 'How it is built';
    return { out: out, vb: vb, big: out.defs.length > 300000 || out.svgF.length > 300000 || out.els.length > 600 };
  }
  /* One batch, as for every drawing: the drawing, its earlier version, the index, and the recipe's link and Pass labels.
     The version is read from the server first; a version saved on another device meanwhile comes back as { conflict }
     unless force. picks: the head chef's picks for the matcher ride along (the open drawing only). */
  function commit(d, o, force, picks) {
    var api = B(), fs, out = o.out, vb = o.vb;
    return api.ready().then(function () {
      fs = api.fs();
      return fs.getDocFromServer(api.docRef('drawings', d.id)).then(function (sn) { return sn.exists() ? sn.data() : null; }, function () { return 'offline'; });
    }).then(function (server) {
      var sv = server === 'offline' ? d.meta.v : (server ? server.v : 0);
      if (server !== 'offline' && sv !== d.meta.v && !force) return { conflict: { v: sv, rec: server } };
      var v = sv + 1, prev = server === 'offline' ? null : server;
      out.v = v; out.upd = api.now();
      var ops = [['set', api.docRef('drawings', d.id), out]], idx = { d: {}, upd: api.now() };
      idx.d[d.id] = v;
      if (prev && prev.v) { var was = {}; Object.keys(prev).forEach(function (k) { if (k !== 'by') was[k] = prev[k]; }); ops.push(['set', fs.doc(api.db(), 'kitchens', api.pin(), 'drawings', d.id, 'hist', String(prev.v)), { was: was, at: api.now() }]); }
      // the recipe points to the drawing ('@id'); a plate or pan drawing also makes its Pass labels
      var field = d.slot === 'plate' || d.slot === 'pan' ? 'art' : d.slot === 'side' ? 'side' : 'diagram';
      return window.LK_MG.patchRecipe(d.rid, function (rr) {
        rr[field] = '@' + d.id;
        if (field === 'art') rr.pins = autoPins(d, rr, vb);
      }).then(function (rp) {
        if (rp) { ops = ops.concat(rp.ops); idx.r = {}; idx.r[d.rid] = rp.v; }
        ops.push(['set', api.docRef('book', 'index'), idx, true]);
        // js/smart.js: the matches the head chef picked, kept for the next recipe (book/matches)
        if (picks && window.LK_SMART && window.LK_SMART.pendingOps) ops = ops.concat(window.LK_SMART.pendingOps());
        return api.W(ops).then(function () { if (picks && window.LK_SMART && window.LK_SMART.saved) window.LK_SMART.saved(); return { v: v, rp: rp, idx: idx }; });
      });
    }).then(function (done) {
      if (!done || done.conflict) return done;
      X.putArt(api.pin(), d.id, out);
      if (done.rp) X.put(api.pin(), d.rid, done.rp.rec, { r: done.idx.r });
      api.changed();
      d.meta.v = done.v;
      return done;
    });
  }
  function save(force) {
    var d = W.d;
    if (!d || W.saving) return;
    W.msg = '';
    if (!P.bookEdit()) { W.msg = 'Not saved: only the head chef can change drawings. Sign in with your PIN as Head chef.'; draw(); return; }
    keepNow();
    W.saving = 'Saving...'; draw();
    var slow = setTimeout(function () { if (W.d === d && W.saving) { W.saving = 'Waiting for the signal. Your drawing is kept on this device.'; var s = W.root && W.root.querySelector('.mg-state'); if (s) s.textContent = W.saving; } }, 4000);
    var o = outOf(d);
    if (o.big) { clearTimeout(slow); W.saving = ''; W.msg = 'Not saved: this drawing is too big for the book. Take some parts off.'; draw(); return; }
    commit(d, o, force, true).then(function (done) {
      clearTimeout(slow);
      if (!done) return;
      if (done.conflict) { W.saving = ''; W.conflict = done.conflict; draw(); return; }
      W.saving = ''; W.conflict = null; var wasNew = d.isNew, oldKey = draftKey(); d.isNew = false; d.saved = snapNow();
      lsSet(oldKey, ''); lsSet(draftKey(), '');
      toast('Saved. Version ' + done.v + '.' + (done.rp ? ' The recipe shows it.' : ''));
      if (wasNew && W.d === d) { W.key = 'draw/' + d.id; history.replaceState(null, '', '#/manage/draw/' + encodeURIComponent(d.id)); }
      if (W.d === d) draw();
    }).catch(function (err) {
      clearTimeout(slow); W.saving = '';
      W.msg = err && err.code === 'permission-denied' ? 'Not saved: the book refused it. Only the head chef can change drawings, and it may have changed on another device. Try again.' : 'Not saved. Check the signal and try again. Your drawing is kept on this device.';
      if (W.d === d) draw();
    });
  }
  /* A drawing the book makes away from the editor (drawn when its recipe is saved, or drawn again when a card it is
     drawn from changes, head chef 21 Oct 2026): fn runs with d as the drawing, so the editor's helpers work on it, and
     the editor's own drawing is back after. persist() saves it the same way as the Save button, over the version on the
     server. */
  function withDrawing(d, fn) {
    var keep = [W.d, W.sel, W.smart, W.styleChoice, W.seed];
    W.d = d; W.sel = []; W.smart = null; W.styleChoice = null;
    try { return fn(); } finally { W.d = keep[0]; W.sel = keep[1]; W.smart = keep[2]; W.styleChoice = keep[3]; W.seed = keep[4]; }
  }
  function persist(d) {
    var o = withDrawing(d, function () { return outOf(d); });
    if (o.big || !d.els.length) return Promise.resolve(null);
    return commit(d, o, true, false).then(function (done) { if (done && !done.conflict) d.isNew = false; return done; });
  }

  /* ---------- opening a drawing ---------- */
  /* An ingredient renamed in the recipe since the drawing was saved: its parts follow it by their place in the list
     (ii), when the old name is gone and the new one is not on the plate yet. */
  function followRenames() {
    var r = rec(); if (!r) return;
    var names = (r.ingredients || []).map(ingName), have = {};
    W.d.els.forEach(function (el) { ingsOf(el).forEach(function (k) { have[k] = 1; }); });
    W.d.els.forEach(function (el) {
      if (!el.ing || names.indexOf(el.ing) >= 0 || el.ii == null || ingIndex(el.ing) >= 0) return;
      var nw = names[el.ii];
      if (nw && !have[nw]) { var old = el.ing; W.d.els.forEach(function (e2) { if (e2.ing === old) e2.ing = nw; }); have[nw] = 1; }
    });
    W.d.els.forEach(function (el) {
      if (!el.also || el.ai == null) return;
      var ai = String(el.ai).split('|');
      el.also = String(el.also).split('|').map(function (k, j) { var nw = names[+ai[j]]; return names.indexOf(k) < 0 && ingIndex(k) < 0 && nw && !have[nw] ? (have[nw] = 1, nw) : k; }).join('|');
    });
  }
  function finishOpen() {
    var d = W.d;
    followRenames();
    d.saved = snapNow();
    try {
      var k = JSON.parse(lsGet(draftKey()) || 'null');
      if (k && JSON.stringify({ surf: k.surf, els: k.els, name: k.name }) !== d.saved) d.kept = k;
    } catch (e) {}
    W.panel = d.els.length ? '' : 'lib';
    if (!d.els.length && (d.slot === 'side' || d.slot === 'build')) W.cat = 'build';
    draw();
    var t = W.root.querySelector('#rtitle'); if (t) t.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  function note(title, text) { return '<div class="mg-wrap"><h2 id="rtitle" tabindex="-1">' + esc(title) + '</h2><p>' + esc(text) + '</p><div class="btn-row"><a class="btn" href="#/manage">All recipes</a></div></div>'; }
  function mount(root, sub) {
    var key = sub.join('/');
    W.root = root;
    if (W.key === key && W.d) { draw(); return; }
    W.key = key; W.d = null; W.sel = []; W.undo = []; W.redo = []; W.view = { z: 1, x: 0, y: 0 }; W.panel = ''; W.msg = ''; W.saving = ''; W.check = null; W.conflict = null; W.q = ''; W.cat = ''; W.sub = ''; W.more = 0; W.pendingIng = ''; W.swap = null; W.wareFam = '';
    W.started = false; W.startOpen = false; W.piece = null; W.fromSel = ''; W.tplName = null; W.reuse = ''; W.wsave = false; W.wname = ''; W.busy = false;
    // read again each time a drawing opens, so a template hidden on the manage page is not offered
    loadMine(true);
    if (sub[1] === 'new') {
      var rid = sub[2] || '', slot = sub[3] || '';
      if (!recipeOf(rid) || !SLOT_NAME[slot]) { root.innerHTML = note('Drawing not found', 'There is no recipe "' + rid + '" or no drawing slot "' + slot + '".'); return; }
      // #/manage/draw/new/<recipe>/<slot>/<from>: a copy of a template, a drawing or the book's own drawing
      W.d = blank(rid, slot); finishOpen();
      if (sub[4]) startFrom(sub.slice(4).join('/'));
      return;
    }
    var id = sub[1] || '', api = B();
    root.innerHTML = note('Opening the drawing', 'Reading it from the book...');
    api.ready().then(function () { return api.fs().getDoc(api.docRef('drawings', id)); }).then(function (sn) {
      if (W.key !== key) return;
      if (!sn.exists()) { root.innerHTML = note('Drawing not found', 'There is no drawing "' + id + '" in the book.'); return; }
      W.d = fromDoc(id, sn.data()); finishOpen();
    }, function () { if (W.key === key) root.innerHTML = note('Could not open the drawing', 'Check the signal and try again.'); });
  }
  function unmount() {
    if (W.d && dirty()) { keepNow(); toast('Your drawing is kept as a draft on this device.'); }
    W.root = null; W.key = ''; W.d = null; drag = null; ptrs = {};
  }

  window.LK_DRAW = {
    api: API,
    mount: mount,
    unmount: unmount,
    open: function () { return !!(W.root && W.d); },
    dirty: function () { return !!(W.root && dirty()); },
    // for js/smart.js and the tests
    state: function () { return W; },
    addItem: function (id, o) { before(); var r = addItem(id, o); changed(); return r; },
    // js/smart.js changes the drawing in one step: before() for undo, then redraw()
    before: function () { before(); },
    redraw: function () { changed(); },
    say: say,
    autoPins: autoPins, altText: altText, check: check, labelAll: labelAll, amount: amount, scaleFor: scaleFor,
    // reuse, for the tests: the book's own drawing as a starting point, and the head chef's templates and pieces
    bookSource: bookSource, mine: function () { return MINE; },
    render: { elSVG: elSVG, svgS: svgS, svgF: svgF, viewBoxOf: viewBoxOf, bbox: bbox, surface: surface, area: area, inArea: inArea, insertAt: insertAt, layerOf: layerOf, freeSpot: freeSpot, recipeOf: recipeOf, plateIngs: plateIngs, ingName: ingName, tintMap: tintMap },
    changed: function () { if (W.d) { before(); changed(); } },
    // drawings made away from the editor (js/smart.js autoDraw): a blank one for a slot, one read from the book, and the save
    withDrawing: withDrawing, persist: persist, blank: blank, fromDoc: fromDoc
  };
})();
