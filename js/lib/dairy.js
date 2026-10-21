/* The drawing library: eggs and dairy (see js/library.js for the fields). Drawn around 0,0, 1 unit is about 1.5 mm. */
(function () {
  'use strict';
  var L = window.LK_LIB, C = L.P.C, N = L.P.n;
  var ROUND = { 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  var EGG_WHITE = '#FBF9F3', WHITE_EDGE = '#DCD5C4', YOLK = '#F2B23A', YOLK_EDGE = '#D9952A', HARD_YOLK = '#F6D873';
  var BUTTER = '#F6DC84', CHEDDAR = '#F2B33A', CREAM = '#F7F3E8', CREAM_EDGE = '#D3CDBE';

  /* ---------- shared bits ---------- */
  function sc(pts, sx, sy, dx, dy) { if (sy === undefined) sy = sx; return pts.map(function (p) { return [p[0] * sx + (dx || 0), p[1] * sy + (dy || 0)]; }); }
  function poly(pts) { return 'M' + pts.map(function (p) { return N(p[0]) + ' ' + N(p[1]); }).join(' L') + ' Z'; }
  function circD(r, cx, cy) { cx = cx || 0; cy = cy || 0; return 'M' + N(cx - r) + ' ' + N(cy) + ' A' + N(r) + ' ' + N(r) + ' 0 1 0 ' + N(cx + r) + ' ' + N(cy) + ' A' + N(r) + ' ' + N(r) + ' 0 1 0 ' + N(cx - r) + ' ' + N(cy) + ' Z'; }
  // pieces placed one by one: [x, y, turn, size, draw(P, rnd)], drawn in the order given (back to front)
  function group(list) { return function (P, rnd) { return list.map(function (it) { return P.g(P.at(it[0], it[1], it[2] || 0, it[3] || 1), it[4](P, rnd)); }).join(''); }; }
  // count points inside a triangle a, b, c, back to front: fn(x, y, i, rnd)
  function inTri(rnd, count, a, b, c, fn) {
    var pts = [];
    for (var i = 0; i < count; i++) { var u = rnd(), v = rnd(); if (u + v > 1) { u = 1 - u; v = 1 - v; } pts.push([a[0] + (b[0] - a[0]) * u + (c[0] - a[0]) * v, a[1] + (b[1] - a[1]) * u + (c[1] - a[1]) * v]); }
    pts.sort(function (p, q) { return p[1] - q[1]; });
    return pts.map(function (p, i) { return fn(p[0], p[1], i, rnd); }).join('');
  }
  // a cube seen from above, its lower side showing (feta, paneer)
  function cube(P, rnd, s, top, side, o) {
    o = o || {};
    var d = P.slab(rnd, s / 2, s / 2, 0.8, o.wob || 0.04, 10), out = P.path(d, side, P.shade(side, -0.25), 0.7, { transform: 'translate(1.4 1.8)' });
    out += P.path(d, top, P.shade(side, -0.2), 0.7);
    if (o.sear) out += P.path(P.slab(rnd, s * 0.36, s * 0.34, 0.6, 0.15, 9), o.sear, null, 0, { opacity: '0.75' });
    return out + P.hl(-s * 0.15, -s * 0.2, s * 0.22, s * 0.08, '#FFFFFF', 0.5);
  }

  /* ---------- eggs ---------- */
  // a poached egg: a soft white with a few wisps, the yolk showing faintly through
  function poached(P, rnd, r) {
    r = r || 1;
    var d = P.blob(rnd, 23 * r, 20 * r, 0.12, 11), out = '';
    for (var i = 0; i < 6; i++) { var a = i / 6 * Math.PI * 2 + rnd() * 0.5; out += P.path(P.blob(rnd, 4.5 * r, 2.6 * r, 0.3, 7, Math.cos(a) * 19.5 * r, Math.sin(a) * 16.5 * r, a * 57.3), EGG_WHITE, WHITE_EDGE, 0.6); }
    out += P.shadow(d, 1.5, 2.2) + P.path(d, EGG_WHITE, WHITE_EDGE, 0.9);
    out += P.path(P.blob(rnd, 13 * r, 11 * r, 0.1, 9, r, -r), '#F7E2A0', null, 0, { opacity: '0.8' }) + P.path(P.blob(rnd, 8 * r, 7 * r, 0.12, 8, r, -r), '#F3CC66', null, 0, { opacity: '0.55' });
    out += P.path('M' + N(-16 * r) + ' ' + N(6 * r) + ' Q' + N(-8 * r) + ' ' + N(14 * r) + ' ' + N(6 * r) + ' ' + N(13 * r), 'none', '#E6DFCF', 1, { opacity: '0.8', 'stroke-linecap': 'round' });
    return out + P.hl(-6 * r, -8 * r, 8 * r, 3 * r, '#FFFFFF', 0.8, -20);
  }
  // fried egg, sunny side up: a lacy crisp edge, the white, a raised yolk
  function fried(P, rnd) {
    var rx = 40, ry = 34, k = 28, edge = [], out = '';
    var a0 = rnd() * Math.PI * 2;
    for (var i = 0; i < k; i++) { var a = a0 + i / k * Math.PI * 2, j = (i % 2 ? 1.03 : 0.97) + (rnd() - 0.5) * 0.12; edge.push([Math.cos(a) * rx * j, Math.sin(a) * ry * j]); }
    var de = P.smooth(edge);
    out += P.shadow(de, 1.2, 1.6) + P.path(de, '#D9A55E', '#A87A3A', 0.8);
    var w = P.blob(rnd, rx * 0.9, ry * 0.88, 0.1, 13);
    out += P.path(w, '#F7F4EC', '#E6DCC6', 0.6);
    out += P.scatter(rnd, 7, rx * 0.8, ry * 0.78, function (x, y, i, q) { return Math.hypot(x / rx, y / ry) > 0.6 ? P.path(P.blob(q, 3 + q() * 3, 2 + q() * 2, 0.3, 6, x, y), '#E2BC80', null, 0, { opacity: '0.55' }) : ''; });
    out += P.path(P.blob(rnd, 20, 18, 0.08, 10, 3, -2), '#FFFFFF', '#ECE6DA', 0.6);
    out += P.circle(3, -2, 11.5, '#000000', null, 0, { opacity: '0.08', transform: 'translate(1 1.5)' }) + P.circle(3, -2, 11.5, YOLK, YOLK_EDGE, 1) + P.circle(4.5, -0.5, 7, P.shade(YOLK, 0.12), null, 0, { opacity: '0.6' });
    return out + P.hl(-0.5, -6, 4, 2, '#FFFFFF', 0.75, -25) + P.hl(-14, -14, 10, 3, '#FFFFFF', 0.5, -20);
  }
  // half a boiled egg (o.jammy: a soft orange middle; otherwise set and pale)
  function eggHalf(o) {
    return function (P, rnd) {
      var d = P.blob(rnd, 18, 13, 0.03, 10), out = P.shadow(d, 1.2, 1.8) + P.path(d, '#FFFFFF', '#D2CBBA', 0.9) + P.path(P.blob(rnd, 15.5, 11, 0.03, 10), 'none', '#EFEAE0', 1.4);
      if (o.jammy) out += P.circle(1, 0, 8.5, '#F4BE4A', '#D99A2A', 0.8) + P.path(P.blob(rnd, 6, 5.5, 0.1, 8, 1.5, 0.5), '#EE8A22', null, 0) + P.hl(-0.5, -1.5, 2.6, 1.4, '#FFFFFF', 0.7, -20);
      else out += P.circle(1, 0, 8, HARD_YOLK, '#E2B850', 0.8) + P.g('translate(1 0)', P.crumbs(rnd, 8, 5.5, 5.5, ['#FAE9A6', '#EBC65A'], 0.8));
      return out + P.hl(-9, -6, 5, 1.6, '#FFFFFF', 0.6, -20);
    };
  }
  // a soft-boiled egg in its cup, from above: the cup rim, the shell cut open, the runny yolk
  function eggInCup(P, rnd) {
    var out = P.shadow(circD(23), 2, 2.5) + P.circle(0, 0, 23, '#FFFFFF', '#D3CEC4', 1.4) + P.circle(0, 0, 20, '#F4F1EA', '#E0DBCF', 0.8);
    out += P.circle(0, 0, 16, '#E3C49A', '#B9946A', 1);
    var jag = [];
    for (var i = 0; i < 22; i++) { var a = i / 22 * Math.PI * 2, r = (i % 2 ? 12.6 : 14.2) + (rnd() - 0.5) * 0.8; jag.push([Math.cos(a) * r, Math.sin(a) * r]); }
    out += P.path(poly(jag), '#FFFFFF', '#F2E9D8', 0.8, ROUND) + P.path(poly(sc(jag, 0.99)), 'none', '#F6EEDD', 1.4);
    out += P.path(P.blob(rnd, 8.5, 8, 0.08, 9, 0.5, 0.5), YOLK, YOLK_EDGE, 0.9) + P.path('M5 5.5 Q7.5 8 7.6 10.6', 'none', YOLK, 2.4, { 'stroke-linecap': 'round' });
    return out + P.hl(-2, -3, 3, 1.6, '#FFFFFF', 0.75, -25) + P.path('M-19 -8 A20 20 0 0 1 -8 -19', 'none', '#FFFFFF', 1.6, { opacity: '0.8' });
  }
  function slicedEgg(P, rnd) {
    var out = '', yolks = [4.5, 6.5, 7.4, 6.5, 4.5];
    for (var i = 0; i < 5; i++) {
      var d = P.blob(rnd, 13.5, 11.5, 0.03, 10), s = P.shadow(d, 1, 1.5) + P.path(d, '#FFFFFF', '#D2CBBA', 0.8) + P.circle(0, 0, yolks[i], HARD_YOLK, '#E2B850', 0.7) + P.circle(-yolks[i] * 0.25, -yolks[i] * 0.25, yolks[i] * 0.45, '#FAE59A', null, 0, { opacity: '0.7' });
      out += P.g(P.at(-24 + i * 12, Math.abs(i - 2) * 1.2, -4 + i * 2), s);
    }
    return out;
  }
  function scrambled(P, rnd) {
    var col = '#F6DC7A', d = P.blob(rnd, 40, 30, 0.12, 12), out = P.shadow(d, 2, 2.5) + P.path(d, col, P.shade(col, -0.25), 1);
    out += P.scatter(rnd, 24, 34, 24, function (x, y, i, q) { var b = P.blob(q, 6 + q() * 5, 4 + q() * 3, 0.3, 8, x, y); return P.path(b, i % 3 ? '#F9E7A0' : '#EFCB5E', P.shade(col, -0.16), 0.6) + P.hl(x - 1, y - 1.5, 3, 1, '#FFFFFF', 0.45); }, 8);
    return out + P.crumbs(rnd, 12, 30, 22, ['#3A342E'], 0.45);
  }
  // a folded omelette: a half moon, golden with a few browned patches, the fold along the front
  function omelette(P, rnd) {
    var d = 'M-58 8 Q-56 -30 0 -34 Q56 -30 58 8 Q30 20 0 20 Q-30 20 -58 8 Z', col = '#F4D36A', out = P.shadow(d) + P.path(d, col, P.shade(col, -0.28), 1.1);
    out += P.path('M-48 4 Q-46 -24 0 -27 Q46 -24 48 4 Q24 12 0 12 Q-24 12 -48 4 Z', P.shade(col, 0.15), null, 0, { opacity: '0.7' });
    out += P.scatter(rnd, 9, 40, 14, function (x, y, i, q) { return P.path(P.blob(q, 5 + q() * 6, 3 + q() * 3, 0.3, 8, x, y - 8), '#E2AA44', null, 0, { opacity: '0.45' }); });
    out += P.path('M-54 9 Q0 26 54 9', 'none', P.shade(col, -0.2), 1.4, { 'stroke-linecap': 'round' }) + P.path('M-50 6 Q0 21 50 6', 'none', '#FFF4C8', 1.2, { opacity: '0.7' });
    return out + P.hl(-16, -20, 20, 4, '#FFFFFF', 0.4, -6);
  }
  // eggs Benedict (or Florentine): the English muffin, ham or spinach, a poached egg, hollandaise over
  function benny(o) {
    return function (P, rnd) {
      var m = P.blob(rnd, 30, 29, 0.03, 12), out = P.shadow(m) + P.path(m, '#D9B07A', '#A87E48', 1) + P.path(m, 'none', '#EBD3A6', 2, { transform: 'scale(0.9)', opacity: '0.7' });
      out += P.crumbs(rnd, 14, 28, 27, ['#C99A62', '#F1DFBC'], 0.9);
      if (o.spinach) for (var i = 0; i < 8; i++) { var a = i * 45 + 10, r = a * Math.PI / 180; out += P.leaf(17, 10, i % 2 ? '#3E6A2A' : '#4F7F2F', Math.cos(r) * 17, Math.sin(r) * 17, a, { edge: '#2F5A22', ew: 0.5, vc: '#6E9A3E' }); }
      else out += P.path(P.blob(rnd, 27, 26, 0.1, 12), '#E8A3A0', '#C9827E', 0.9) + P.path(P.blob(rnd, 20, 18, 0.2, 9, -4, 3), '#F0B8B4', null, 0, { opacity: '0.6' });
      out += poached(P, rnd, 0.92);
      var h = P.blob(rnd, 19, 16, 0.28, 12, 1, 0);
      out += P.path(h, '#F2D27A', '#D9B050', 0.8) + P.path(P.blob(rnd, 11, 9, 0.15, 9, 0, -2), '#F6DE96', null, 0, { opacity: '0.85' });
      out += P.crumbs(rnd, 7, 10, 8, ['#C0392B'], 0.6) + P.scatter(rnd, 5, 12, 9, function (x, y, i, q) { var t = q() * Math.PI; return P.line(x - Math.cos(t) * 2.2, y - Math.sin(t) * 2.2, x + Math.cos(t) * 2.2, y + Math.sin(t) * 2.2, C.herb, 0.9); });
      return out + P.hl(-4, -7, 5, 2, '#FFFFFF', 0.6, -20);
    };
  }
  // a wedge of frittata: golden top, browned at the pan edge, bits of veg and feta through it
  function frittata(P, rnd) {
    var A = [-38, 0], B = [27.8, -29.3], Cc = [27.8, 29.3], d = 'M-38 0 L27.8 -29.3 A72 72 0 0 1 27.8 29.3 Z', col = '#EDC45E';
    var out = P.shadow(d) + P.path(d, col, P.shade(col, -0.3), 1.1, ROUND) + P.path('M29.5 -25 A68 68 0 0 1 29.5 25', 'none', '#C98A3A', 4.5, { opacity: '0.8', 'stroke-linecap': 'round' });
    out += inTri(rnd, 8, [-24, 0], [22, -22], [22, 22], function (x, y, i, q) { return P.path(P.blob(q, 4 + q() * 4, 2.5 + q() * 2, 0.3, 7, x, y), '#D9A24A', null, 0, { opacity: '0.45' }); });
    out += inTri(rnd, 18, [-26, 0], [24, -24], [24, 24], function (x, y, i, q) {
      var t = q() * 180, k = i % 4;
      if (k === 0) return P.g(P.at(x, y, t), P.rect(-3, -1.4, 6, 2.8, 1, '#C9402A', '#9E2B20', 0.5));
      if (k === 1) return P.g(P.at(x, y, t), P.path(P.leafD(6, 3.4), '#4F7F2F', '#2F5A22', 0.4));
      if (k === 2) return P.g(P.at(x, y, t), P.rect(-2.4, -2.4, 4.8, 4.8, 1, '#F3E1A6', '#D9C27A', 0.5));
      return P.path(P.blob(q, 2.4, 2, 0.3, 6, x, y), '#FBF9F1', '#DDD6C6', 0.5);
    });
    return out + P.hl(-4, -8, 14, 3, '#FFFFFF', 0.3, -20);
  }

  /* ---------- butter and cream ---------- */
  // a quenelle: rugby-ball shape with the ridge the spoons leave (o.grain: ricotta; o.flakes: smoked salt)
  function quenelle(o) {
    return function (P, rnd) {
      var l = o.len / 2, w = o.wid / 2, col = o.col;
      var d = P.smooth([[-l, 0], [-l * 0.8, -w * 0.6], [-l * 0.38, -w * 1.02], [l * 0.3, -w * 0.98], [l * 0.8, -w * 0.52], [l, 0], [l * 0.8, w * 0.56], [l * 0.32, w * 1.02], [-l * 0.36, w * 0.98], [-l * 0.8, w * 0.55]]), out = P.shadow(d, 1.5, 2) + P.path(d, col, P.shade(col, o.edge || -0.2), 0.9);
      out += P.path('M' + N(-l * 0.86) + ' ' + N(w * 0.2) + ' Q' + N(-l * 0.1) + ' ' + N(-w * 0.5) + ' ' + N(l * 0.88) + ' ' + N(-w * 0.05) + ' Q' + N(l * 0.1) + ' ' + N(w * 0.95) + ' ' + N(-l * 0.86) + ' ' + N(w * 0.2) + ' Z', P.shade(col, -0.06), null, 0, { opacity: '0.8' });
      out += P.path('M' + N(-l * 0.86) + ' ' + N(w * 0.2) + ' Q' + N(-l * 0.1) + ' ' + N(-w * 0.5) + ' ' + N(l * 0.88) + ' ' + N(-w * 0.05), 'none', P.shade(col, -0.15), 0.9, { 'stroke-linecap': 'round' });
      if (o.grain) out += P.crumbs(rnd, Math.round(l * w / 6), l * 0.8, w * 0.7, [P.shade(col, -0.1), '#FFFFFF'], 0.55);
      if (o.flakes) out += P.scatter(rnd, o.flakes, l * 0.7, w * 0.55, function (x, y, i, q) { return P.g(P.at(x, y, q() * 180), P.path('M-1.6 -1 L1.4 -1.3 L1.8 1 L-1.2 1.2 Z', i % 2 ? '#5A4632' : '#8A7E70', null, 0)); });
      return out + P.hl(-l * 0.2, -w * 0.45, l * 0.42, w * 0.16, '#FFFFFF', 0.65, -5);
    };
  }
  function butterPat(P) {
    var d = 'M-8 -10 H8 Q10 -10 10 -8 V8 Q10 10 8 10 H-8 Q-10 10 -10 8 V-8 Q-10 -10 -8 -10 Z', out = P.shadow(d, 1.6, 2);
    out += P.path(d, P.shade(BUTTER, -0.12), P.shade(BUTTER, -0.3), 0.8, { transform: 'translate(1.2 1.6)' }) + P.path(d, BUTTER, P.shade(BUTTER, -0.25), 0.8);
    out += P.path('M-7 -6 Q0 -8 7 -6', 'none', P.shade(BUTTER, 0.35), 1.2, { opacity: '0.7', 'stroke-linecap': 'round' });
    return out + P.hl(-4, -5, 4, 1.6, '#FFFFFF', 0.5, -15);
  }
  function butterCurl(P) {
    var d = 'M-14 -6 Q0 -10 13 -6 Q17 0 13 6 Q0 10 -14 6 Q-17 0 -14 -6 Z', out = P.shadow(d, 1.4, 1.8) + P.path(d, BUTTER, P.shade(BUTTER, -0.26), 0.9);
    [-4, -1.3, 1.4, 4].forEach(function (y) { out += P.path('M-13 ' + N(y) + ' Q0 ' + N(y - 2.5) + ' 12 ' + N(y), 'none', P.shade(BUTTER, -0.12), 0.8) + P.path('M-12 ' + N(y - 0.9) + ' Q0 ' + N(y - 3.3) + ' 11 ' + N(y - 0.9), 'none', P.shade(BUTTER, 0.4), 0.7, { opacity: '0.8' }); });
    out += P.ellipse(12.5, 0, 3.6, 6.4, P.shade(BUTTER, 0.12), P.shade(BUTTER, -0.26), 0.8) + P.path('M12.5 -4 Q15.5 0 12.5 3.2 Q10.5 1 12.5 -1', 'none', P.shade(BUTTER, -0.2), 0.7);
    return out;
  }
  function compoundButter(P, rnd) {
    var col = '#F3D47E', out = P.shadow(circD(12), 1.4, 1.8) + P.circle(0, 0, 12, col, P.shade(col, -0.28), 0.9) + P.circle(0, 0, 10.4, 'none', P.shade(col, 0.3), 0.9, { opacity: '0.7' });
    out += P.scatter(rnd, 18, 9.5, 9.5, function (x, y, i, q) { return P.g(P.at(x, y, q() * 180), P.path('M-1.4 -0.6 L1.2 -0.9 L1.5 0.6 L-1 0.9 Z', i % 3 ? C.herb : '#6E9A3E', null, 0)); });
    return out + P.hl(-4, -5, 4, 1.6, '#FFFFFF', 0.5, -25);
  }
  // yoghurt: a soft round dollop with the spiral the spoon leaves
  function yoghurt(P, rnd) {
    var col = '#F6F4EC', d = P.blob(rnd, 21, 19, 0.07, 11), out = P.shadow(d, 1.4, 1.8) + P.path(d, col, CREAM_EDGE, 0.9);
    var sp = 'M2 0 Q6 -5 0 -8 Q-9 -8 -10 1 Q-9 11 3 11 Q13 9 13 0';
    out += P.path(sp, 'none', P.shade(col, -0.1), 1.6, { 'stroke-linecap': 'round' }) + P.path(sp, 'none', '#FFFFFF', 1.1, { transform: 'translate(-0.9 -0.9)', 'stroke-linecap': 'round' });
    return out + P.hl(-8, -10, 5, 2, '#FFFFFF', 0.7, -20);
  }
  // sour cream: a peaked dollop with a curl on top
  function sourCream(P, rnd) {
    var col = '#F8F3E2', d = P.blob(rnd, 18, 16.5, 0.08, 10), out = P.shadow(d, 1.4, 1.8) + P.path(d, col, CREAM_EDGE, 0.9);
    out += P.path(P.blob(rnd, 12, 11, 0.1, 9, 1, -1), P.shade(col, 0.4), P.shade(col, -0.09), 0.9) + P.path(P.blob(rnd, 6.5, 6, 0.12, 8, 2, -2), '#FFFFFF', P.shade(col, -0.08), 0.8);
    out += P.path('M2 -2 Q5 -6 1 -7 Q-2 -6 0 -3', 'none', P.shade(col, -0.14), 1, { 'stroke-linecap': 'round' });
    return out + P.hl(-7, -7, 4, 1.6, '#FFFFFF', 0.7, -25);
  }
  // cream cheese spread in a swoosh
  function creamCheese(P) {
    var col = '#F8F5EC', d = 'M-30 4 Q-29 -8 -12 -9 Q12 -10 30 -2 Q32 2 28 3 Q10 2 -10 8 Q-26 12 -30 4 Z', out = P.path(d, col, CREAM_EDGE, 0.9);
    out += P.path('M-26 2 Q-6 -5 26 -1', 'none', P.shade(col, -0.08), 1.6, { 'stroke-linecap': 'round' }) + P.path('M-25 -1 Q-6 -8 24 -3', 'none', '#FFFFFF', 1.2, { 'stroke-linecap': 'round' });
    return out + P.hl(-18, -4, 7, 1.6, '#FFFFFF', 0.6, -10);
  }
  function labneh(P, rnd) {
    var out = P.path(P.blob(rnd, 30, 23, 0.08, 12), '#D9C25A', '#C2A83E', 0.7, { opacity: '0.45' });
    [[-15, -9], [4, -12], [17, 0], [-7, 6], [9, 12]].forEach(function (p) {
      var r = 9 + rnd() * 1.2;
      out += P.shadow(circD(r, p[0], p[1]), 1.2, 1.8) + P.circle(p[0], p[1], r, CREAM, CREAM_EDGE, 0.9);
      out += P.g('translate(' + N(p[0]) + ' ' + N(p[1]) + ')', P.crumbs(rnd, 12, r * 0.8, r * 0.8, ['#7A8A3A', '#5E6A2E', '#A88A4A', '#C9A44A'], 0.6));
      out += P.hl(p[0] - r * 0.35, p[1] - r * 0.4, r * 0.35, r * 0.18, '#FFFFFF', 0.7, -25);
    });
    return out + P.scatter(rnd, 5, 26, 20, function (x, y) { return P.ellipse(x, y, 2, 1.2, '#FFFFFF', null, 0, { opacity: '0.4' }); });
  }

  /* ---------- cheese ---------- */
  // a slice gone soft on top of something: corners drooping, a drip on the side, glossy
  function meltedSlice(P, rnd) {
    // walk round the square; here and there the edge runs down in a drip
    var col = '#F2B33A', pts = [], drips = [2, 7, 12, 16];
    for (var i = 0; i < 20; i++) {
      var t = i / 20 * 4, side = Math.floor(t), f = t - side, x, y, s = 27;
      if (side === 0) { x = -s + f * 2 * s; y = -s; } else if (side === 1) { x = s; y = -s + f * 2 * s; } else if (side === 2) { x = s - f * 2 * s; y = s; } else { x = -s; y = s - f * 2 * s; }
      var k = drips.indexOf(i) >= 0 ? 1.22 + rnd() * 0.1 : f === 0 ? 1.07 : 0.97 + rnd() * 0.04;
      pts.push([x * k, y * k]);
    }
    var d = P.smooth(pts), out = P.shadow(d, 1, 1.4) + P.path(d, col, P.shade(col, -0.26), 1);
    out += P.rect(-23, -23, 46, 46, 6, 'none', P.shade(col, -0.14), 1.2, { opacity: '0.6' });
    out += P.path(P.smooth(sc(pts, 0.72, 0.72)), P.shade(col, 0.18), null, 0, { opacity: '0.75' });
    out += P.path('M-16 -14 Q-4 -18 12 -13', 'none', '#FFFFFF', 2, { opacity: '0.4', 'stroke-linecap': 'round' }) + P.path('M-12 10 Q2 6 14 11', 'none', '#FFFFFF', 1.4, { opacity: '0.25', 'stroke-linecap': 'round' });
    return out;
  }
  function squareSlice(P) {
    var col = '#F4C24A', out = P.rect(-28, -28, 56, 56, 1.6, '#000000', null, 0, { opacity: '0.1', transform: 'translate(1 1.4)' }) + P.rect(-28, -28, 56, 56, 1.6, col, P.shade(col, -0.24), 1);
    out += P.rect(-24, -24, 48, 48, 1, P.shade(col, 0.14), null, 0, { opacity: '0.7' });
    out += P.path('M16 -28 L28 -28 L28 -16 Z', P.shade(col, 0.3), P.shade(col, -0.2), 0.8, ROUND) + P.path('M16 -28 L28 -16', 'none', P.shade(col, -0.25), 0.9);
    return out + P.hl(-10, -14, 12, 2.4, '#FFFFFF', 0.4, -10);
  }
  // a wedge from above, lying on its cut face; the rind on the back edge (o.kind: hard, blue or brie)
  function wedge(o) {
    return function (P, rnd) {
      var A = [-32, 0], B = [30, -22], Cc = [30, 22], out = '';
      if (o.kind === 'brie') {
        var fr = poly([[-32, 0], [30, 22], [30, 29], [-32, 7]]);
        out += P.shadow(poly([A, B, [30, 29], [-32, 7]])) + P.path(fr, '#F2DFA2', '#C9B37A', 0.9, ROUND) + P.path('M-30 4 Q-6 18 26 26', 'none', '#F7EBC0', 1.6, { opacity: '0.8' });
        out += P.path(poly([A, B, Cc]), '#F8F5EC', '#D2CAB6', 1, ROUND);
        out += inTri(rnd, 26, [-26, 0], [27, -19], [27, 19], function (x, y, i, q) { return P.path(P.blob(q, 1.6 + q() * 2.2, 1.2 + q() * 1.4, 0.3, 6, x, y), i % 2 ? '#EFEADC' : '#FFFFFF', null, 0, { opacity: '0.9' }); });
        return out + P.hl(-4, -6, 12, 2, '#FFFFFF', 0.6, -18);
      }
      var face = o.kind === 'blue' ? '#EFEAD9' : '#F2DC9A', rind = o.kind === 'blue' ? '#C9BC98' : '#C99A4A', d = poly([A, B, Cc]);
      out += P.shadow(d) + P.path(d, face, P.shade(rind, -0.15), 1, ROUND) + P.path(poly([[24, -18], B, Cc, [24, 18]]), rind, P.shade(rind, -0.25), 0.8, ROUND);
      if (o.kind === 'blue') {
        out += inTri(rnd, 18, [-26, 0], [22, -17], [22, 17], function (x, y, i, q) { return P.path(P.blob(q, 1.4 + q() * 2.4, 1 + q() * 1.4, 0.4, 6, x, y), i % 3 ? '#6E8A98' : '#45606E', null, 0, { opacity: '0.85' }); });
        out += P.path('M-18 2 Q-6 -6 4 -2 T20 -8 M-6 8 Q4 4 18 10', 'none', '#7F98A4', 1, { opacity: '0.6', 'stroke-linecap': 'round' }) + P.g('translate(27 0)', P.crumbs(rnd, 8, 2, 17, ['#8A9A8A'], 0.7));
      } else {
        out += inTri(rnd, 22, [-26, 0], [22, -17], [22, 17], function (x, y, i, q) { return P.circle(x, y, 0.5 + q() * 0.6, i % 2 ? '#FFF8E0' : '#E3C474', null, 0); });
        out += P.path('M27 -16 V16', 'none', P.shade(rind, -0.2), 0.8, { 'stroke-dasharray': '1.5 2.5' });
      }
      return out + P.hl(-6, -6, 12, 2, '#FFFFFF', 0.4, -18);
    };
  }
  function grated(P, rnd) {
    var cols = ['#F2C14E', '#F6D27A', '#E8B23A'];
    return P.pile(rnd, 52, 28, 21, function (x, y, i, q) {
      var t = q() * Math.PI, l = 3 + q() * 3, x1 = x - Math.cos(t) * l, y1 = y - Math.sin(t) * l, x2 = x + Math.cos(t) * l, y2 = y + Math.sin(t) * l, c = cols[i % 3];
      return P.line(x1, y1, x2, y2, P.shade(c, -0.25), 3) + P.line(x1, y1, x2, y2, c, 1.9);
    });
  }
  function shavings(P, rnd) {
    // thin angular sheets, a little see-through, one edge curled over
    return P.scatter(rnd, 8, 22, 15, function (x, y, i, q) {
      var l = 8 + q() * 4, w = 3 + q() * 1.6, c = 2 + q() * 2;
      // a curled ribbon: the far edge rolls over, so it shows as a darker band along one side
      var d = 'M' + N(-l) + ' ' + N(-w + c) + ' Q0 ' + N(-w - c) + ' ' + N(l) + ' ' + N(-w + c * 0.6) + ' L' + N(l - 1.5) + ' ' + N(w + c * 0.4) + ' Q0 ' + N(w - c * 1.2) + ' ' + N(-l + 1) + ' ' + N(w + c) + ' Z';
      return P.g(P.at(x, y, q() * 180), P.path(d, '#F5E8BE', '#D2B878', 0.6, { opacity: '0.92' }) + P.path('M' + N(-l + 1) + ' ' + N(-w + c + 0.4) + ' Q0 ' + N(-w - c + 1.2) + ' ' + N(l - 1) + ' ' + N(-w + c * 0.6 + 0.6), 'none', '#E2CC8E', 1.8, { opacity: '0.9', 'stroke-linecap': 'round' }) + P.crumbs(q, 2, l * 0.5, w * 0.4, ['#FFFBEA'], 0.5));
    }, 9);
  }
  function fetaCubes(P, rnd) {
    var out = P.scatter(rnd, 8, 22, 16, function (x, y, i, q) { return P.g(P.at(x, y, q() * 40 - 20), cube(P, q, 8.5 + q() * 2, '#FBF9F1', '#E3DDCC', { wob: 0.1 })); }, 11);
    return out + P.scatter(rnd, 8, 24, 18, function (x, y, i, q) { return P.path(P.blob(q, 1.4 + q(), 1.2 + q() * 0.8, 0.3, 6, x, y), '#FBF9F1', '#D9D2C0', 0.4); });
  }
  // whipped feta spread with a swirl, a thread of olive oil in the groove
  function whippedFeta(P, rnd) {
    var col = '#F7F5EE', d = P.blob(rnd, 40, 30, 0.05, 14), out = P.path(d, col, '#CFCABD', 1), sp = [];
    for (var i = 0; i <= 26; i++) { var t = i / 26, a = t * Math.PI * 3.2, r = 4 + 27 * t; sp.push([Math.cos(a) * r, Math.sin(a) * r * 0.74]); }
    var s = P.smooth(sp, true);
    out += P.path(s, 'none', '#E4E0D4', 4, { 'stroke-linecap': 'round' }) + P.path(s, 'none', '#D2B848', 1.6, { opacity: '0.65', 'stroke-linecap': 'round' }) + P.path(s, 'none', '#FFFFFF', 1.2, { transform: 'translate(-1.6 -1.8)', 'stroke-linecap': 'round', opacity: '0.9' });
    return out + P.crumbs(rnd, 8, 26, 18, ['#B5301F'], 0.7) + P.crumbs(rnd, 6, 24, 16, ['#3A342E'], 0.45);
  }
  // burrata torn open: the smooth ball gathered at the top, the creamy middle spilling out the front
  function burrata(P, rnd) {
    var ball = P.blob(rnd, 28, 27, 0.04, 12), out = P.path(P.blob(rnd, 30, 9, 0.2, 10, 6, 24), '#C9B04A', null, 0, { opacity: '0.4' }) + P.shadow(ball, 2, 3) + P.path(ball, '#F9F7F0', '#D6D0C0', 1);
    [[-20, -4], [-12, -16], [4, -21], [16, -12], [20, -2]].forEach(function (p) { out += P.path('M-2 -15 Q' + N(p[0] * 0.5) + ' ' + N(p[1] * 0.6 - 6) + ' ' + N(p[0]) + ' ' + N(p[1]), 'none', '#E8E2D4', 1.2, { 'stroke-linecap': 'round' }); });
    out += P.path(P.blob(rnd, 4, 3, 0.2, 7, -2, -15), '#F2EEE4', '#D6D0C0', 0.7);
    // the opening, then the stracciatella spilling out of it, shreds of cream through it
    out += P.path(P.blob(rnd, 16, 9, 0.12, 10, 5, 6), '#EADFBF', '#D6CCAE', 0.8);
    var spill = P.blob(rnd, 21, 12, 0.2, 12, 9, 15);
    out += P.path(spill, '#F4ECD3', '#DCCFAE', 0.8);
    out += P.path('M-11 2 Q-4 -3 4 -1 Q12 -3 20 3', 'none', '#D2CAB8', 1.3, { 'stroke-linecap': 'round' });
    out += P.scatter(rnd, 8, 15, 7, function (x, y, i, q) { var t = q() * Math.PI, l = 2.4 + q() * 2; return P.path('M' + N(x - Math.cos(t) * l) + ' ' + N(y + 13 - Math.sin(t) * l) + ' Q' + N(x + 1.5) + ' ' + N(y + 12) + ' ' + N(x + Math.cos(t) * l) + ' ' + N(y + 13 + Math.sin(t) * l), 'none', i % 2 ? '#FFFFFF' : '#E6DBBC', 1.3, { 'stroke-linecap': 'round' }); });
    out += P.g('translate(8 15)', P.crumbs(rnd, 8, 18, 10, ['#3A342E'], 0.5));
    return out + P.hl(-10, -10, 9, 4, '#FFFFFF', 0.7, -25);
  }
  function bocconcini(P, rnd) {
    var out = '';
    [[-17, -10, 9.5], [4, -14, 9], [19, 1, 9.5], [-6, 6, 10], [10, 15, 9]].forEach(function (p) {
      out += P.shadow(circD(p[2], p[0], p[1]), 1.2, 1.8) + P.circle(p[0], p[1], p[2], '#FAF8F2', '#D6D0C0', 0.9);
      out += P.path('M' + N(p[0] + p[2] * 0.2) + ' ' + N(p[1] + p[2] * 0.85) + ' A' + N(p[2] * 0.9) + ' ' + N(p[2] * 0.9) + ' 0 0 0 ' + N(p[0] + p[2] * 0.85) + ' ' + N(p[1] + p[2] * 0.2), 'none', '#ECE6D8', 1.6, { opacity: '0.9' });
      out += P.hl(p[0] - p[2] * 0.3, p[1] - p[2] * 0.35, p[2] * 0.35, p[2] * 0.2, '#FFFFFF', 0.85, -30);
    });
    return out;
  }
  function haloumiSlice(P, rnd) {
    var col = '#F2E6C4', out = P.rect(-28, -13, 56, 26, 4, '#000000', null, 0, { opacity: '0.12', transform: 'translate(1.6 2)' }) + P.rect(-28, -13, 56, 26, 4, col, '#C9B48A', 1);
    out += P.path(P.slab(rnd, 23, 9.5, 0.7, 0.06, 12), '#E2B86A', null, 0, { opacity: '0.75' }) + P.grill(26, 12, 50, 9, '#7A5A2A', 2.4);
    out += P.crumbs(rnd, 5, 22, 9, ['#FBF6E6'], 0.7);
    return out + P.hl(-12, -8, 10, 1.6, '#FFFFFF', 0.4, -4);
  }
  // melted mozzarella: a soft sheet, bubbles and browned blisters
  function mozzarella(P, rnd) {
    var col = '#F7EEC9', d = P.blob(rnd, 48, 35, 0.12, 16), out = P.shadow(d, 1, 1.4) + P.path(d, col, '#DCCB96', 1);
    out += P.path(P.blob(rnd, 40, 28, 0.15, 13), '#FBF5DD', null, 0, { opacity: '0.7' });
    out += P.scatter(rnd, 12, 40, 28, function (x, y, i, q) { var r = 1.6 + q() * 2.4; return P.circle(x, y, r, '#FFFCEE', null, 0, { opacity: '0.9' }) + P.path('M' + N(x - r * 0.6) + ' ' + N(y + r * 0.5) + ' Q' + N(x) + ' ' + N(y + r * 1.1) + ' ' + N(x + r * 0.6) + ' ' + N(y + r * 0.5), 'none', '#E6D8A8', 0.7); });
    out += P.scatter(rnd, 9, 38, 26, function (x, y, i, q) { return P.path(P.blob(q, 3 + q() * 4, 2.4 + q() * 3, 0.3, 7, x, y), '#D9A050', null, 0, { opacity: '0.75' }) + P.circle(x, y, 1 + q(), '#B97A36', null, 0, { opacity: '0.8' }); });
    return out + P.hl(-16, -14, 14, 3, '#FFFFFF', 0.45, -12);
  }
  // baked camembert in its wooden box: bloomy rind, the top scored and melting, rosemary and garlic
  function bakedCamembert(P, rnd) {
    var out = P.shadow(circD(42), 2, 3) + P.circle(0, 0, 42, '#D9B98A', '#A88A5E', 1.2) + P.circle(0, 0, 39, '#E6CDA0', '#C9A97A', 0.8);
    out += P.circle(0, 0, 35, '#F3EEE0', '#D6CDB8', 1) + P.crumbs(rnd, 30, 32, 32, ['#E6DFCF', '#FFFFFF'], 0.9);
    // the top scored in a criss-cross: two sets of cuts at right angles, the soft middle showing in them
    var cut = '', R = 26, s2 = Math.SQRT1_2;
    [-13, 0, 13].forEach(function (o) {
      var h = Math.sqrt(R * R - o * o);
      [[s2, s2, -s2, s2], [s2, -s2, s2, s2]].forEach(function (v) { var cx = o * v[2], cy = o * v[3]; cut += 'M' + N(cx - v[0] * h) + ' ' + N(cy - v[1] * h) + ' L' + N(cx + v[0] * h) + ' ' + N(cy + v[1] * h) + ' '; });
    });
    out += P.path(cut, 'none', '#E3BC56', 4, { 'stroke-linecap': 'round' }) + P.path(cut, 'none', '#F6DE8A', 1.8, { 'stroke-linecap': 'round' });
    out += P.scatter(rnd, 4, 22, 22, function (x, y, i, q) { var t = q() * 180; return P.leaf(7, 1.8, '#3E6A2A', x, y, t, { vein: false }) + P.leaf(6, 1.6, '#4F7F2F', x + 1.5, y + 1, t + 40, { vein: false }) + P.leaf(6, 1.6, '#3E6A2A', x - 1, y + 1.5, t - 40, { vein: false }); }, 14);
    out += P.scatter(rnd, 3, 20, 20, function (x, y, i, q) { return P.ellipse(x, y, 3, 1.8, '#F6EBCB', '#D9C9A0', 0.5, { transform: 'rotate(' + N(q() * 180) + ' ' + N(x) + ' ' + N(y) + ')' }); });
    return out + P.hl(-14, -18, 10, 3, '#FFFFFF', 0.5, -30);
  }
  function blueCrumble(P, rnd) {
    return P.scatter(rnd, 10, 22, 15, function (x, y, i, q) {
      var rx = 3.6 + q() * 2.4, ry = 3 + q() * 1.6, d = P.blob(q, rx, ry, 0.3, 7, x, y), out = P.shadow(d, 0.8, 1.2) + P.path(d, '#EEE8D6', '#BFB497', 0.7);
      for (var k = 0; k < 3; k++) out += P.path(P.blob(q, 0.9 + q() * 0.9, 0.7 + q() * 0.6, 0.3, 6, x + (q() - 0.5) * rx, y + (q() - 0.5) * ry), ['#5E7A8A', '#3E5A6A', '#7C9AA0'][k], null, 0);
      return out;
    }, 8);
  }
  function provolone(P, rnd) {
    var col = '#F4E2A8', d = P.blob(rnd, 30, 29.5, 0.02, 14), out = P.shadow(d, 1, 1.4) + P.path(d, col, '#C9A050', 2.2);
    out += P.path(P.blob(rnd, 26, 25.5, 0.03, 12), P.shade(col, 0.2), null, 0, { opacity: '0.6' });
    out += P.scatter(rnd, 5, 20, 20, function (x, y, i, q) { return P.ellipse(x, y, 1.4 + q() * 1.4, 1 + q(), '#E6CC86', null, 0); });
    return out + P.hl(-10, -12, 10, 2.4, '#FFFFFF', 0.45, -30);
  }
  function paneer(P, rnd) {
    return P.scatter(rnd, 9, 28, 22, function (x, y, i, q) {
      return P.g(P.at(x, y, q() * 40 - 20), cube(P, q, 15, '#F8F4E8', '#E3DCC8', { sear: '#E2B460', wob: 0.03 }) + P.crumbs(q, 2, 4, 4, ['#9A6A2A'], 0.8));
    }, 15);
  }
  function cheddarBlock(P, rnd) {
    var col = '#F2B940', out = P.rect(-27, -14, 54, 34, 2, '#000000', null, 0, { opacity: '0.12', transform: 'translate(2 2.5)' });
    out += P.rect(-27, 6, 54, 14, 2, '#D99A2A', '#B47E1E', 1) + P.rect(-27, -14, 54, 22, 2, col, '#C49020', 1);
    out += P.path('M16 -14 L19 -10 L17 -6', 'none', '#D9A030', 0.9) + P.crumbs(rnd, 6, 20, 7, ['#E8AA34'], 0.7);
    return out + P.hl(-10, -8, 12, 2, '#FFFFFF', 0.4, -4);
  }

  /* ---------- the items ---------- */
  var poachedOne = function (P, rnd) { return poached(P, rnd, 1); };
  var jammy = eggHalf({ jammy: true }), hard = eggHalf({});
  L.add('dairy', [
    // eggs
    { id: 'egg-fried', name: 'Fried egg, sunny side up', sub: 'Eggs', kw: 'fried egg sunny side up crispy edge burger egg brekkie breakfast', form: 'piece', cook: 'fried', role: 'topping', n: 1, w: 84, h: 72, side: { s: 'layer', h: 8, c: '#F7F4EC' }, draw: fried },
    { id: 'egg-poached', name: 'Poached egg', sub: 'Eggs', kw: 'poached egg soft runny brekkie breakfast benny', form: 'piece', cook: 'poached', role: 'topping', n: 1, w: 52, h: 46, side: { s: 'mound', h: 18, c: EGG_WHITE }, draw: poachedOne },
    { id: 'egg-jammy-halves', name: 'Boiled egg halves, jammy', sub: 'Eggs', kw: 'jammy egg soft boiled halves ramen egg halved', form: 'half', cook: 'poached', role: 'topping', n: 2, w: 74, h: 34, side: { s: 'mound', h: 14, c: '#FFFFFF' }, draw: group([[-17, 0, -8, 1, jammy], [18, 2, 10, 1, jammy]]) },
    { id: 'egg-hard-halves', name: 'Boiled egg halves, hard', sub: 'Eggs', kw: 'hard boiled egg halves halved salad egg', form: 'half', cook: 'poached', role: 'topping', n: 2, w: 74, h: 34, of: 'egg-jammy-halves', side: { s: 'mound', h: 14, c: '#FFFFFF' }, draw: group([[-17, 0, -8, 1, hard], [18, 2, 10, 1, hard]]) },
    { id: 'egg-in-cup', name: 'Soft-boiled egg in a cup', sub: 'Eggs', kw: 'soft boiled egg cup dippy egg soldiers runny', form: 'piece', cook: 'poached', role: 'main', n: 1, w: 48, h: 48, side: { s: 'cup', h: 40, c: '#FFFFFF' }, draw: eggInCup },
    { id: 'egg-sliced', name: 'Sliced egg', sub: 'Eggs', kw: 'sliced boiled egg rounds salad egg nicoise', form: 'slices', cook: 'poached', role: 'topping', n: 1, w: 78, h: 30, side: { s: 'layer', h: 6, c: '#FFFFFF' }, draw: slicedEgg },
    { id: 'scrambled-eggs', name: 'Scrambled eggs', sub: 'Eggs', kw: 'scrambled eggs scrambled soft curds brekkie breakfast', form: 'mound', cook: 'fried', role: 'main', g: 150, w: 84, h: 64, side: { s: 'mound', h: 18, c: '#F6DC7A' }, draw: scrambled },
    { id: 'omelette', name: 'Omelette, folded', sub: 'Eggs', kw: 'omelette omelet folded three egg cheese brekkie', form: 'piece', cook: 'fried', role: 'main', g: 180, w: 120, h: 58, side: { s: 'slab', h: 16, c: '#F4D36A' }, draw: omelette },
    { id: 'eggs-benedict', name: 'Eggs Benedict', sub: 'Eggs', kw: 'eggs benedict benny english muffin ham poached egg hollandaise brekkie', form: 'stack', cook: 'poached', role: 'main', n: 1, w: 62, h: 62, side: { s: 'mound', h: 34, c: '#F2D27A' }, draw: benny({}) },
    { id: 'eggs-florentine', name: 'Eggs Florentine', sub: 'Eggs', kw: 'eggs florentine spinach english muffin poached egg hollandaise brekkie', form: 'stack', cook: 'poached', role: 'main', n: 1, w: 66, h: 66, of: 'eggs-benedict', side: { s: 'mound', h: 34, c: '#F2D27A' }, draw: benny({ spinach: true }) },
    { id: 'frittata-wedge', name: 'Frittata wedge', sub: 'Eggs', kw: 'frittata wedge slice egg bake spanish tortilla vegetable', form: 'wedge', cook: 'baked', role: 'main', n: 1, w: 76, h: 62, side: { s: 'wedge', h: 22, c: '#EDC45E' }, draw: frittata },
    // butter and cream
    { id: 'butter-pat', name: 'Butter pat', sub: 'Butter and cream', kw: 'butter pat square knob portion', form: 'piece', role: 'topping', n: 1, w: 22, h: 22, side: { s: 'slab', h: 6, c: BUTTER }, draw: butterPat },
    { id: 'butter-curl', name: 'Butter curl', sub: 'Butter and cream', kw: 'butter curl roll shaving bread and butter', form: 'piece', role: 'sidedish', n: 1, w: 34, h: 20, side: { s: 'stick', h: 10, c: BUTTER }, draw: butterCurl },
    { id: 'compound-butter', name: 'Herb butter disc', sub: 'Butter and cream', kw: 'compound butter herb butter garlic butter disc cafe de paris steak butter', form: 'piece', role: 'topping', n: 1, w: 26, h: 26, side: { s: 'disc', h: 6, c: '#F3D47E' }, draw: compoundButter },
    { id: 'smoked-butter', name: 'Smoked butter', sub: 'Butter and cream', kw: 'smoked butter quenelle smoked salt whipped butter bread', form: 'quenelle', cook: 'smoked', role: 'sidedish', n: 1, w: 38, h: 22, side: { s: 'scoop', h: 12, c: '#E6C070' }, draw: quenelle({ len: 36, wid: 21, col: '#E6C070', edge: -0.26, flakes: 7 }) },
    { id: 'yoghurt-dollop', name: 'Yoghurt dollop', sub: 'Butter and cream', kw: 'yoghurt yogurt greek natural dollop spoonful', form: 'dollop', role: 'sauce', g: 40, w: 44, h: 40, side: { s: 'mound', h: 10, c: '#F6F4EC' }, draw: yoghurt },
    { id: 'sour-cream-dollop', name: 'Sour cream dollop', sub: 'Butter and cream', kw: 'sour cream dollop wedges nachos spud', form: 'dollop', role: 'sauce', g: 30, w: 38, h: 36, side: { s: 'mound', h: 12, c: '#F8F3E2' }, draw: sourCream },
    { id: 'creme-fraiche', name: 'Crème fraîche quenelle', sub: 'Butter and cream', kw: 'creme fraiche quenelle cream dessert', form: 'quenelle', role: 'dside', g: 30, w: 42, h: 26, side: { s: 'scoop', h: 14, c: '#F6EFD9' }, draw: quenelle({ len: 40, wid: 24, col: '#F6EFD9' }) },
    { id: 'mascarpone', name: 'Mascarpone quenelle', sub: 'Butter and cream', kw: 'mascarpone quenelle cream tiramisu dessert', form: 'quenelle', role: 'dside', g: 35, w: 44, h: 28, of: 'creme-fraiche', side: { s: 'scoop', h: 15, c: '#F8F3E4' }, draw: quenelle({ len: 42, wid: 25, col: '#F8F3E4' }) },
    { id: 'ricotta', name: 'Ricotta quenelle', sub: 'Butter and cream', kw: 'ricotta quenelle whipped ricotta fresh cheese hotcakes', form: 'quenelle', cook: 'fresh', role: 'topping', g: 50, w: 48, h: 30, side: { s: 'scoop', h: 16, c: '#FAF8F1' }, draw: quenelle({ len: 46, wid: 28, col: '#FAF8F1', edge: -0.16, grain: true }) },
    { id: 'cream-cheese', name: 'Cream cheese, spread', sub: 'Butter and cream', kw: 'cream cheese philly philadelphia spread swoosh smear bagel', form: 'smear', role: 'sauce', g: 30, w: 64, h: 24, side: { s: 'sauce', h: 4, c: '#F8F5EC' }, draw: creamCheese },
    { id: 'labneh-balls', name: 'Labneh balls', sub: 'Butter and cream', kw: 'labneh balls strained yoghurt zaatar olive oil', form: 'cluster', role: 'sidedish', n: 5, w: 62, h: 50, side: { s: 'pile', h: 18, c: CREAM }, draw: labneh },
    // cheese
    { id: 'cheese-slice-melted', name: 'Cheese slice, melted', sub: 'Cheese', kw: 'melted cheese slice burger cheese cheddar american processed kraft singles', form: 'layer', role: 'topping', n: 1, w: 68, h: 68, side: { s: 'layer', h: 3, c: '#F2B33A' }, draw: meltedSlice },
    { id: 'cheese-slice', name: 'Cheese slice', sub: 'Cheese', kw: 'cheese slice square tasty cheddar sandwich processed kraft singles', form: 'layer', role: 'topping', n: 1, w: 58, h: 58, side: { s: 'layer', h: 3, c: '#F4C24A' }, draw: squareSlice },
    { id: 'cheese-wedge', name: 'Hard cheese wedge', sub: 'Cheese', kw: 'cheese wedge parmesan parmigiano pecorino aged hard cheese block gruyere', form: 'wedge', role: 'main', g: 100, w: 66, h: 48, side: { s: 'wedge', h: 26, c: '#F2DC9A' }, draw: wedge({ kind: 'hard' }) },
    { id: 'cheddar-block', name: 'Cheddar block', sub: 'Cheese', kw: 'cheddar block tasty cheese board vintage', form: 'piece', role: 'main', g: 100, w: 58, h: 38, side: { s: 'slab', h: 22, c: '#F2B940' }, draw: cheddarBlock },
    { id: 'brie-wedge', name: 'Brie wedge', sub: 'Cheese', kw: 'brie wedge camembert soft cheese white mould cheese board triple cream', form: 'wedge', role: 'main', g: 80, w: 66, h: 52, side: { s: 'wedge', h: 18, c: '#F8F5EC' }, draw: wedge({ kind: 'brie' }) },
    { id: 'blue-cheese-wedge', name: 'Blue cheese wedge', sub: 'Cheese', kw: 'blue cheese wedge gorgonzola stilton roquefort cheese board', form: 'wedge', role: 'main', g: 80, w: 66, h: 48, side: { s: 'wedge', h: 22, c: '#EFEAD9' }, draw: wedge({ kind: 'blue' }) },
    { id: 'grated-cheese', name: 'Grated cheese', sub: 'Cheese', kw: 'grated cheese shredded tasty cheddar mozzarella pizza cheese', form: 'pile', role: 'topping', g: 30, w: 62, h: 48, side: { s: 'pile', h: 8, c: '#F2C14E' }, draw: grated },
    { id: 'parmesan-shavings', name: 'Parmesan shavings', sub: 'Cheese', kw: 'parmesan shavings shaved parmigiano grana padano pecorino', form: 'shard', role: 'garnish', g: 10, w: 52, h: 38, side: { s: 'layer', h: 4, c: '#F3E3B0' }, draw: shavings },
    { id: 'feta-cubes', name: 'Feta cubes', sub: 'Cheese', kw: 'feta cubes diced persian feta greek salad goats cheese', form: 'scatter', cook: 'fresh', role: 'garnish', g: 40, w: 56, h: 42, side: { s: 'pile', h: 10, c: '#FBF9F1' }, draw: fetaCubes },
    { id: 'whipped-feta', name: 'Whipped feta', sub: 'Cheese', kw: 'whipped feta swirl spread dip olive oil', form: 'smear', role: 'sauce', g: 60, w: 82, h: 62, side: { s: 'sauce', h: 8, c: '#F7F5EE' }, draw: whippedFeta },
    { id: 'burrata', name: 'Burrata, torn', sub: 'Cheese', kw: 'burrata torn stracciatella mozzarella fresh cheese', form: 'whole', cook: 'fresh', role: 'main', n: 1, w: 62, h: 64, side: { s: 'mound', h: 36, c: '#F9F7F0' }, draw: burrata },
    { id: 'bocconcini', name: 'Bocconcini', sub: 'Cheese', kw: 'bocconcini baby mozzarella balls caprese fior di latte', form: 'cluster', cook: 'fresh', role: 'salad', n: 5, w: 60, h: 50, side: { s: 'pile', h: 18, c: '#FAF8F2' }, draw: bocconcini },
    { id: 'haloumi', name: 'Haloumi, grilled', sub: 'Cheese', kw: 'haloumi halloumi grilled slices squeaky cheese', form: 'slices', cook: 'grilled', role: 'main', n: 3, w: 70, h: 66, side: { s: 'slab', h: 10, c: '#F2E6C4' }, draw: group([[-6, -18, -8, 1, haloumiSlice], [5, 0, 5, 1, haloumiSlice], [-2, 18, -3, 1, haloumiSlice]]) },
    { id: 'mozzarella-melted', name: 'Mozzarella, melted', sub: 'Cheese', kw: 'melted mozzarella blanket pizza cheese bubbling browned parmy cheese', form: 'layer', cook: 'baked', role: 'topping', g: 60, w: 100, h: 74, side: { s: 'layer', h: 4, c: '#F7EEC9' }, draw: mozzarella },
    { id: 'baked-camembert', name: 'Baked camembert', sub: 'Cheese', kw: 'baked camembert brie whole wheel box scored garlic rosemary sharing', form: 'whole', cook: 'baked', role: 'main', n: 1, w: 88, h: 88, side: { s: 'disc', h: 26, c: '#F3EEE0' }, draw: bakedCamembert },
    { id: 'blue-cheese-crumble', name: 'Blue cheese, crumbled', sub: 'Cheese', kw: 'blue cheese crumble crumbled gorgonzola danish blue', form: 'scatter', role: 'garnish', g: 20, w: 52, h: 38, side: { s: 'pile', h: 6, c: '#F1ECDD' }, draw: blueCrumble },
    { id: 'provolone-slice', name: 'Provolone slice', sub: 'Cheese', kw: 'provolone slice round cheese sandwich sub', form: 'layer', role: 'topping', n: 1, w: 62, h: 62, side: { s: 'layer', h: 3, c: '#F4E2A8' }, draw: provolone },
    { id: 'paneer-cubes', name: 'Paneer cubes', sub: 'Cheese', kw: 'paneer cubes indian cottage cheese seared tikka', form: 'scatter', cook: 'fried', role: 'main', g: 150, w: 78, h: 64, side: { s: 'pile', h: 16, c: '#F8F4E8' }, draw: paneer }
  ]);
  L.DAIRY = { poached: poached, fried: fried, eggHalf: eggHalf, quenelle: quenelle, cube: cube, meltedSlice: meltedSlice, squareSlice: squareSlice, wedge: wedge, butterPat: butterPat };
})();
