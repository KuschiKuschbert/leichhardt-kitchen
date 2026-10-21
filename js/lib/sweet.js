/* The drawing library: fruit and desserts (see js/library.js for the fields). Drawn around 0,0, 1 unit is about 1.5 mm. */
(function () {
  'use strict';
  var L = window.LK_LIB, C = L.P.C;

  /* ---------- small tools ---------- */
  function poly(P, pts) { return 'M' + pts.map(function (p) { return P.n(p[0]) + ' ' + P.n(p[1]); }).join(' L') + ' Z'; }
  function rot(P, a, x, y) { return 'rotate(' + P.n(a) + ' ' + P.n(x) + ' ' + P.n(y) + ')'; }
  function edge(P, c, f) { return P.shade(c, f || -0.28); }
  // a piece drawn around 0,0, put at x,y turned by r and scaled by s
  function put(P, x, y, r, s, body) { return P.g(P.at(x, y, r, s), body); }
  // icing sugar: a fine white dusting
  function dust(P, rnd, k, rx, ry, cx, cy) { return P.g(P.at(cx || 0, cy || 0), P.scatter(rnd, k, rx, ry, function (x, y, i, q) { return P.circle(x, y, 0.35 + q() * 0.5, '#FFFFFF', null, 0, { opacity: '0.85' }); })); }

  /* ---------- fruit pieces (each around 0,0) ---------- */
  var STRAW = 'M-11 -7 C-6 -12 4 -9 10 -3 C13 0 13 1 10 3 C4 9 -6 12 -11 7 C-13 3 -13 -3 -11 -7 Z';
  function calyx(P, x, y, k, s) {
    var out = '', angs = k === 2 ? [150, 210] : [118, 148, 180, 212, 242];
    angs.forEach(function (a) { var r = a * Math.PI / 180; out += P.leaf(7 * (s || 1), 3.2 * (s || 1), '#5E8C3A', x + Math.cos(r) * 3, y + Math.sin(r) * 3, a, { edge: '#3F6E26', ew: 0.4, vein: false }); });
    return out + P.circle(x, y, 1.8 * (s || 1), '#4F7F2F', '#3F6E26', 0.4);
  }
  function strawberry(P) {
    var out = P.shadow(STRAW, 1, 1.5) + P.path(STRAW, C.strawberry, '#8E2318', 0.8);
    out += P.path('M-8 -6 C-3 -9 3 -7 7 -3', 'none', '#E05A4A', 2, { opacity: '0.6', 'stroke-linecap': 'round' });
    for (var x = -7; x <= 8; x += 3.6) for (var y = -6; y <= 6; y += 3.4) {
      var yy = y + ((x + 7) / 3.6 % 2 ? 1.7 : 0);
      if ((x + 1) * (x + 1) / 110 + yy * yy / 55 < 0.75 && x < 9) out += P.circle(x, yy, 0.9, '#A82424') + P.ellipse(x, yy, 0.6, 0.45, '#F2D27A');
    }
    return out + calyx(P, -11.5, 0) + P.hl(-2, -5, 4, 1.4, '#FFFFFF', 0.45, 15);
  }
  function strawberryHalf(P) {
    var out = P.shadow(STRAW, 1, 1.5) + P.path(STRAW, '#C8302C', '#8E2318', 0.8);
    out += P.g('translate(0.6 0) scale(0.84)', P.path(STRAW, '#EE7470', null, 0));
    out += P.path('M-9 0 Q0 -4 8 0 Q0 4 -9 0 Z', '#FBD6CF', null, 0);
    [-1, 1].forEach(function (s) { out += P.path('M-3 ' + P.n(s * 1.6) + ' Q2 ' + P.n(s * 5) + ' 6 ' + P.n(s * 6), 'none', '#F8B8B0', 0.6); });
    return out + calyx(P, -11.5, 0, 2, 0.8) + P.hl(1, -5.5, 3, 1, '#FFFFFF', 0.5, 15);
  }
  function blueberry(P, x, y, r) {
    r = r || 4.2;
    return P.circle(x + 0.6, y + 0.8, r, '#000000', null, 0, { opacity: '0.14' }) + P.circle(x, y, r, '#3E4A7A', '#262D52', 0.5) + P.circle(x - r * 0.2, y - r * 0.15, r * 0.7, '#6A78A8', null, 0, { opacity: '0.35' }) +
      P.circle(x + r * 0.25, y + r * 0.1, r * 0.3, '#222842') + P.hl(x - r * 0.4, y - r * 0.45, r * 0.25, r * 0.15, '#FFFFFF', 0.5);
  }
  function raspberry(P, x, y, r, col) {
    r = r || 6.5; col = col || '#C0284A';
    var dk = P.shade(col, -0.3), lt = P.shade(col, 0.15), out = P.circle(x + 0.8, y + 1, r, '#000000', null, 0, { opacity: '0.14' }) + P.circle(x, y, r, dk, null, 0);
    for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2; out += P.circle(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.36, col, dk, 0.3); }
    for (var k = 0; k < 4; k++) { var b = k / 4 * Math.PI * 2 + 0.4; out += P.circle(x + Math.cos(b) * r * 0.26, y + Math.sin(b) * r * 0.26, r * 0.3, lt, dk, 0.3); }
    return out + P.circle(x + r * 0.05, y + r * 0.05, r * 0.14, '#5A0F1E') + P.hl(x - r * 0.45, y - r * 0.5, r * 0.22, r * 0.14, '#FFFFFF', 0.6);
  }
  function bananaSlice(P, x, y, r) {
    r = r || 10;
    var out = P.ellipse(x + 0.6, y + 0.8, r, r * 0.92, '#000000', null, 0, { opacity: '0.12' }) + P.ellipse(x, y, r, r * 0.92, '#F2DFA0', '#C9A95A', 0.8) + P.ellipse(x, y, r * 0.8, r * 0.73, '#F8EDC6', null, 0);
    for (var i = 0; i < 3; i++) { var a = i / 3 * Math.PI * 2 + 0.5; out += P.line(x, y, x + Math.cos(a) * r * 0.32, y + Math.sin(a) * r * 0.32, '#E2CC8A', 0.6) + P.circle(x + Math.cos(a) * r * 0.18, y + Math.sin(a) * r * 0.18, 0.7, '#8A6A3A'); }
    return out;
  }
  function appleSlice(P, skin) {
    var d = 'M-23 3 Q0 -20 23 3 Q0 0 -23 3 Z';
    return P.shadow(d, 1, 1.5) + P.path(d, '#F6EDCB', '#D9C99A', 0.6) + P.path('M-22.5 2.6 Q0 -19.4 22.5 2.6', 'none', skin || '#B5303A', 1.8, { 'stroke-linecap': 'round' }) +
      P.path('M-9 1 Q0 -4 9 1', 'none', '#E6D8A8', 0.8) + P.ellipse(-2, -0.6, 1.6, 0.8, '#5A3A1E', null, 0, { transform: 'rotate(-12 -2 -0.6)' }) + P.ellipse(2.4, -0.4, 1.5, 0.8, '#5A3A1E', null, 0, { transform: 'rotate(14 2.4 -0.4)' });
  }
  function cube(P, s, col, rnd) {
    var h = s / 2, d = P.smooth([[-h, -h], [0, -h - 0.4], [h, -h], [h + 0.4, 0], [h, h], [0, h + 0.4], [-h, h], [-h - 0.4, 0]]);
    return P.shadow(d, 1, 1.4) + P.path(d, col, edge(P, col, -0.25), 0.7) + P.path('M' + P.n(-h + 1.5) + ' ' + P.n(-h + 1.5) + ' L' + P.n(h - 2) + ' ' + P.n(-h + 1.5), 'none', '#FFFFFF', 1, { opacity: '0.45', 'stroke-linecap': 'round' }) + P.hl(-h * 0.2, -h * 0.2, h * 0.4, h * 0.25, '#FFFFFF', 0.2);
  }
  function kiwiSlice(P, r) {
    r = r || 15;
    var out = P.circle(0.8, 1, r, '#000000', null, 0, { opacity: '0.12' }) + P.circle(0, 0, r, '#7A5A30', '#5A4220', 0.6) + P.circle(0, 0, r * 0.92, '#7EA83E', null, 0) + P.circle(0, 0, r * 0.66, '#9CC055', null, 0);
    for (var i = 0; i < 20; i++) { var a = i / 20 * Math.PI * 2; out += P.line(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86, '#B9D27A', 0.5, { opacity: '0.7' }); }
    out += P.ellipse(0, 0, r * 0.3, r * 0.24, '#E6EDC2', null, 0);
    for (var k = 0; k < 18; k++) { var b = k / 18 * Math.PI * 2, rr = r * (0.42 + (k % 2) * 0.07); out += P.ellipse(Math.cos(b) * rr, Math.sin(b) * rr, 0.9, 0.5, '#1E1A14', null, 0, { transform: rot(P, b * 180 / Math.PI, Math.cos(b) * rr, Math.sin(b) * rr) }); }
    return out + P.hl(-r * 0.4, -r * 0.5, r * 0.25, r * 0.1, '#FFFFFF', 0.35, -30);
  }
  function orangeSlice(P, r, col) {
    r = r || 22; col = col || '#F5A23A';
    var out = P.circle(1, 1.4, r, '#000000', null, 0, { opacity: '0.12' }) + P.circle(0, 0, r, '#EE8A2E', '#C9701E', 0.8) + P.circle(0, 0, r * 0.88, '#FBE8C8', null, 0);
    for (var i = 0; i < 10; i++) {
      var a1 = (i + 0.08) / 10 * Math.PI * 2, a2 = (i + 0.92) / 10 * Math.PI * 2, rr = r * 0.82;
      out += P.path('M' + P.n(Math.cos((a1 + a2) / 2) * r * 0.1) + ' ' + P.n(Math.sin((a1 + a2) / 2) * r * 0.1) + ' L' + P.n(Math.cos(a1) * rr) + ' ' + P.n(Math.sin(a1) * rr) + ' A' + P.n(rr) + ' ' + P.n(rr) + ' 0 0 1 ' + P.n(Math.cos(a2) * rr) + ' ' + P.n(Math.sin(a2) * rr) + ' Z', col, null, 0);
    }
    return out + P.circle(0, 0, r * 0.1, '#FBE8C8') + P.hl(-r * 0.35, -r * 0.45, r * 0.3, r * 0.1, '#FFFFFF', 0.4, -30);
  }
  function passionHalf(P, rnd, r) {
    r = r || 20;
    var shell = P.blob(rnd, r, r * 0.96, 0.05, 14), out = P.shadow(shell);
    out += P.path(shell, '#5E2A4A', '#3E1A30', 1) + P.circle(0, 0, r * 0.86, '#F4EBD0', null, 0) + P.path(P.blob(rnd, r * 0.78, r * 0.76, 0.05, 12), '#E8B02A', '#C99A22', 0.6);
    out += P.scatter(rnd, 16, r * 0.62, r * 0.6, function (x, y) { return P.ellipse(x, y, 2, 1.6, '#F2CB55', null, 0, { opacity: '0.9' }) + P.ellipse(x, y, 1.3, 1, '#1E1A14', null, 0); }, 4);
    out += P.path('M' + P.n(-r * 0.9) + ' ' + P.n(-r * 0.3) + ' Q' + P.n(-r * 0.7) + ' ' + P.n(-r * 0.75) + ' ' + P.n(-r * 0.2) + ' ' + P.n(-r * 0.92), 'none', '#7A3A62', 1, { opacity: '0.8' });
    return out + P.hl(-r * 0.3, -r * 0.35, r * 0.3, r * 0.1, '#FFFFFF', 0.5, -30);
  }
  var FIG = 'M0 -19 Q4 -19 5 -14 Q6 -9 12 -3 Q17 3 15 10 Q12 18 0 19 Q-12 18 -15 10 Q-17 3 -12 -3 Q-6 -9 -5 -14 Q-4 -19 0 -19 Z';
  function figHalf(P, rnd) {
    var out = P.shadow(FIG) + P.path(FIG, '#5E2A4A', '#3E1A30', 0.9) + P.g('translate(0 0.8) scale(0.88)', P.path(FIG, '#F2E2C8', null, 0)) + P.g('translate(0 1.8) scale(0.72)', P.path(FIG, '#C8405A', null, 0));
    out += P.path('M0 -10 Q-7 2 0 10 Q7 2 0 -10 Z', '#E07A88', null, 0, { opacity: '0.8' });
    out += P.scatter(rnd, 26, 8, 10, function (x, y) { return P.line(x * 0.4, y * 0.4 + 2, x, y + 2, '#F2B8A8', 0.4) + P.circle(x, y + 2, 0.5, '#F6D8B0'); });
    return out + P.rect(-1, -22, 2, 4, 1, '#6B5A2A') + P.hl(-6, -6, 3, 1.2, '#FFFFFF', 0.35, -50);
  }
  function grape(P, x, y, r, col) { return P.circle(x, y, r, col, edge(P, col), 0.5) + P.hl(x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.18, '#FFFFFF', 0.55, -30); }

  /* ---------- more fruit: berries, dried fruit, citrus, stone fruit, melon ---------- */
  // the outline the book gives a fill (its own hue at 0.74 of its lightness) and a lighter tint of it for a shine
  function ol(P, c) { return P.shade(c, -0.26); }
  function tint(P, c, f) { return P.shade(c, f || 0.55); }
  // a round or oval berry from above (cranberry, kumquat, grape): a lighter top, the blossom end (o.end) and a shine
  function berry(P, q, x, y, rx, ry, col, o) {
    o = o || {};
    var a = o.a === undefined ? q() * 180 : o.a, tf = rot(P, a, x, y), r = Math.min(rx, ry), ar = a * Math.PI / 180;
    var out = P.ellipse(x, y, rx, ry, '#000000', null, 0, { opacity: '0.12', transform: 'translate(' + P.n(r * 0.16) + ' ' + P.n(r * 0.22) + ') ' + tf });
    out += P.ellipse(x, y, rx, ry, col, ol(P, col), Math.max(0.3, Math.min(0.8, r * 0.1)), { transform: tf }) + P.ellipse(x - rx * 0.1, y - ry * 0.14, rx * 0.74, ry * 0.68, P.shade(col, 0.12), null, 0, { transform: tf });
    if (o.dimples) out += P.scatter(q, o.dimples, rx * 0.7, ry * 0.6, function (dx, dy) { return P.circle(x + dx, y + dy, 0.3, P.shade(col, 0.3), null, 0, { opacity: '0.8' }); });
    if (o.end) out += P.circle(x + Math.cos(ar) * rx * 0.78, y + Math.sin(ar) * rx * 0.78, Math.max(0.4, r * 0.14), o.end, ol(P, o.end), 0.25);
    return out + P.hl(x - r * 0.36, y - r * 0.42, r * 0.3, r * 0.15, tint(P, col, 0.6), 0.75, -35);
  }
  // a dried fruit (raisin, sultana, dried cranberry): a flat wrinkled blob with folds and a sugary shine
  function driedBit(P, q, x, y, s, col, folds) {
    var a = q() * 180, d = P.blob(q, s, s * (0.62 + q() * 0.2), 0.2, 7, x, y, a), dk = P.shade(col, -0.2);
    var out = P.path(d, '#000000', null, 0, { opacity: '0.12', transform: 'translate(0.6 0.8)' }) + P.path(d, col, ol(P, col), 0.4) + P.path(P.blob(q, s * 0.58, s * 0.36, 0.2, 5, x - s * 0.14, y - s * 0.14, a), P.shade(col, 0.14), null, 0);
    for (var i = 0; i < folds; i++) {
      var b = (a + 90 + (q() - 0.5) * 70) * Math.PI / 180, ox = x + (q() - 0.5) * s * 0.7, oy = y + (q() - 0.5) * s * 0.5, l = s * (0.4 + q() * 0.3), c = Math.cos(b), sn = Math.sin(b);
      out += P.path('M' + P.n(ox - c * l) + ' ' + P.n(oy - sn * l) + ' Q' + P.n(ox + sn * s * 0.3) + ' ' + P.n(oy - c * s * 0.3) + ' ' + P.n(ox + c * l) + ' ' + P.n(oy + sn * l), 'none', dk, 0.4, { 'stroke-linecap': 'round' });
    }
    return out + P.hl(x - s * 0.3, y - s * 0.32, s * 0.26, s * 0.11, tint(P, col, 0.55), 0.75, a);
  }
  // a citrus half from above, cut face up: rind, pith, the segments round a pale core (grapefruit)
  function citrusHalf(P, q, r, k) {
    var d = P.blob(q, r, r * 0.97, 0.015, 16), out = P.shadow(d, 2, 2.5) + P.path(d, k.rind, ol(P, k.rind), 1) + P.circle(0, 0, r * 0.9, k.pith) + P.circle(0, 0, r * 0.84, k.mem), a0 = q() * Math.PI, segs = 12;
    for (var i = 0; i < segs; i++) {
      var a1 = a0 + (i + 0.07) / segs * Math.PI * 2, a2 = a0 + (i + 0.93) / segs * Math.PI * 2, am = (a1 + a2) / 2, rr = r * 0.81, r0 = r * 0.15;
      out += P.path('M' + P.n(Math.cos(am) * r0) + ' ' + P.n(Math.sin(am) * r0) + ' L' + P.n(Math.cos(a1) * rr) + ' ' + P.n(Math.sin(a1) * rr) + ' A' + P.n(rr) + ' ' + P.n(rr) + ' 0 0 1 ' + P.n(Math.cos(a2) * rr) + ' ' + P.n(Math.sin(a2) * rr) + ' Z', k.flesh, null, 0);
      [-0.07, 0.07].forEach(function (o, j) { var b = am + o, r1 = r * (0.34 + j * 0.08), r2 = r * (0.62 + j * 0.08); out += P.line(Math.cos(b) * r1, Math.sin(b) * r1, Math.cos(b) * r2, Math.sin(b) * r2, k.ves, r * 0.035); });
    }
    out += P.circle(0, 0, r * 0.12, k.pith) + P.ellipse(r * 0.3, -r * 0.22, r * 0.06, r * 0.035, k.pith, ol(P, k.pith), 0.3, { transform: rot(P, -40, r * 0.3, -r * 0.22) });
    return out + P.hl(-r * 0.38, -r * 0.5, r * 0.3, r * 0.08, tint(P, k.flesh, 0.6), 0.75, -32);
  }
  // one citrus segment lying on its side, the round back up (grapefruit supremes, mandarin segments; pith strands when pith is set)
  function segment(P, q, l, w, col, pith) {
    var h = l / 2, d = 'M' + P.n(-h) + ' 0 Q0 ' + P.n(-w * 1.35) + ' ' + P.n(h) + ' 0 Q0 ' + P.n(w * 0.5) + ' ' + P.n(-h) + ' 0 Z';
    var out = P.shadow(d, 0.9, 1.2) + P.path(d, col, ol(P, col), 0.6) + P.path('M' + P.n(-h * 0.8) + ' ' + P.n(-w * 0.06) + ' Q0 ' + P.n(-w * 1.05) + ' ' + P.n(h * 0.8) + ' ' + P.n(-w * 0.06) + ' Q0 ' + P.n(-w * 0.3) + ' ' + P.n(-h * 0.8) + ' ' + P.n(-w * 0.06) + ' Z', P.shade(col, 0.12), null, 0);
    for (var i = -3; i <= 3; i++) out += P.path('M' + P.n(i * h * 0.2) + ' ' + P.n(w * 0.1) + ' Q' + P.n(i * h * 0.24) + ' ' + P.n(-w * 0.2) + ' ' + P.n(i * h * 0.27) + ' ' + P.n(-w * 0.48 + Math.abs(i) * w * 0.05), 'none', P.shade(col, 0.28), 0.5, { 'stroke-linecap': 'round' });
    if (pith) for (var j = 0; j < 2; j++) { var px = (q() - 0.5) * h; out += P.path('M' + P.n(px - 2) + ' ' + P.n(w * 0.15) + ' Q' + P.n(px + 2 + q() * 2) + ' ' + P.n(-w * 0.3) + ' ' + P.n(px + (q() - 0.3) * 4) + ' ' + P.n(-w * 0.62), 'none', '#FBF1DE', 0.5, { opacity: '0.85', 'stroke-linecap': 'round' }); }
    return out + P.hl(-h * 0.2, -w * 0.48, h * 0.3, w * 0.08, tint(P, col, 0.6), 0.75, -4);
  }
  // a stone fruit half from above, cut face up: skin, flesh, the flush round the stone, and the stone or its hollow
  function stoneHalf(P, q, r, k, stone) {
    var d = P.blob(q, r, r * 0.95, 0.025, 12), out = P.shadow(d, 2, 2.5) + P.path(d, k.skin, ol(P, k.skin), 0.9);
    out += P.path(P.blob(q, r * 0.92, r * 0.87, 0.025, 12), k.flesh, null, 0) + P.path(P.blob(q, r * 0.66, r * 0.68, 0.05, 10), k.light, null, 0) + P.ellipse(0, 0, r * 0.42, r * 0.5, k.flush, null, 0);
    out += P.path('M0 ' + P.n(-r * 0.9) + ' Q' + P.n(r * 0.06) + ' ' + P.n(-r * 0.74) + ' 0 ' + P.n(-r * 0.56), 'none', ol(P, k.flesh), 0.6, { 'stroke-linecap': 'round' });
    if (stone) {
      out += P.ellipse(0, 0, r * 0.3, r * 0.38, k.stone, ol(P, k.stone), 0.6) + P.ellipse(-r * 0.04, -r * 0.05, r * 0.2, r * 0.27, P.shade(k.stone, 0.12), null, 0);
      [-1, 0, 1].forEach(function (i) { out += P.path('M' + P.n(i * r * 0.12 - r * 0.05) + ' ' + P.n(-r * 0.24) + ' q' + P.n(r * 0.08) + ' ' + P.n(r * 0.12) + ' 0 ' + P.n(r * 0.24) + ' t0 ' + P.n(r * 0.2), 'none', ol(P, k.stone), 0.5, { 'stroke-linecap': 'round' }); });
      out += P.hl(-r * 0.1, -r * 0.2, r * 0.08, r * 0.04, tint(P, k.stone, 0.5), 0.75, -40);
    } else out += P.ellipse(0, 0, r * 0.3, r * 0.38, k.pit, ol(P, k.pit), 0.6) + P.ellipse(r * 0.03, r * 0.05, r * 0.21, r * 0.28, P.shade(k.pit, 0.12), null, 0);
    return out + P.hl(-r * 0.4, -r * 0.44, r * 0.24, r * 0.08, tint(P, k.flesh, 0.6), 0.75, -40);
  }
  // a slice cut from round fruit lying flat: the skin along the curved back, the flesh, the flush on the inner edge (o.flush) and a pip (o.pip)
  function moonSlice(P, l, t, k, o) {
    o = o || {};
    var h = l / 2, y0 = t * 0.58, top = y0 - t * 2.3, d = 'M' + P.n(-h) + ' ' + P.n(y0) + ' Q0 ' + P.n(top) + ' ' + P.n(h) + ' ' + P.n(y0) + ' Q0 ' + P.n(y0 - t * 0.35) + ' ' + P.n(-h) + ' ' + P.n(y0) + ' Z';
    var out = P.shadow(d, 1, 1.4) + P.path(d, k.flesh, ol(P, k.flesh), 0.6);
    out += P.path('M' + P.n(-h * 0.7) + ' ' + P.n(y0 - t * 0.2) + ' Q0 ' + P.n(top + t * 0.9) + ' ' + P.n(h * 0.7) + ' ' + P.n(y0 - t * 0.2) + ' Q0 ' + P.n(y0 - t * 0.38) + ' ' + P.n(-h * 0.7) + ' ' + P.n(y0 - t * 0.2) + ' Z', k.light, null, 0);
    if (k.flush) out += P.path('M' + P.n(-h * 0.8) + ' ' + P.n(y0 - t * 0.08) + ' Q0 ' + P.n(y0 - t * 0.42) + ' ' + P.n(h * 0.8) + ' ' + P.n(y0 - t * 0.08), 'none', k.flush, t * 0.16, { 'stroke-linecap': 'round' });
    out += P.path('M' + P.n(-h) + ' ' + P.n(y0) + ' Q0 ' + P.n(top) + ' ' + P.n(h) + ' ' + P.n(y0) + ' Q0 ' + P.n(top + t * 0.3) + ' ' + P.n(-h) + ' ' + P.n(y0) + ' Z', k.skin, ol(P, k.skin), 0.5);
    if (k.dot) [-0.45, -0.15, 0.2, 0.5].forEach(function (f) { out += P.circle(f * h, y0 - t * 1.08 + Math.abs(f) * Math.abs(f) * t * 0.95, 0.35, k.dot); });
    if (o.pip) out += P.ellipse(o.pip, y0 - t * 0.3, 1.5, 0.8, '#6E4422', ol(P, '#6E4422'), 0.3, { transform: rot(P, o.pip > 0 ? -12 : 12, o.pip, y0 - t * 0.3) });
    return out + P.hl(-h * 0.25, y0 - t * 0.85, h * 0.22, t * 0.06, tint(P, k.flesh, 0.6), 0.75, -8);
  }
  // a melon wedge lying on its side: the skin round the back (netted for a rockmelon), the rind, the flesh, the scooped hollow along the top
  function melonWedge(k) {
    return function (P, rnd) {
      var cr = function (e, yE, yB, yT) { return 'M' + P.n(-e) + ' ' + P.n(yE) + ' C' + P.n(-e * 0.86) + ' ' + P.n(yB) + ' ' + P.n(e * 0.86) + ' ' + P.n(yB) + ' ' + P.n(e) + ' ' + P.n(yE) + ' C' + P.n(e * 0.55) + ' ' + P.n(yT) + ' ' + P.n(-e * 0.55) + ' ' + P.n(yT) + ' ' + P.n(-e) + ' ' + P.n(yE) + ' Z'; };
      // a point on the curved back between the skin and the rind, t from 0 to 1
      var back = function (t, e, yE, yB) { var u = 1 - t; return [-e * u * u * u - e * 0.86 * 3 * u * u * t + e * 0.86 * 3 * u * t * t + e * t * t * t, yE * (u * u * u + t * t * t) + yB * 3 * u * t]; };
      var skin = cr(45, -13, 28, -1), out = P.shadow(skin, 2, 2.5) + P.path(skin, k.skin, ol(P, k.skin), 0.9);
      if (k.net) for (var i = 1; i < 18; i++) { var p = back(i / 18, 43.8, -12.8, 26.4), p2 = back((i + 0.5) / 18, 43.8, -12.8, 26.4); out += P.line(p[0], p[1], p2[0], p2[1] - 0.8, k.net, 0.7) + P.line(p[0], p[1] - 0.9, p2[0], p2[1] + 0.2, k.net, 0.5); }
      out += P.path(cr(42.4, -12.3, 23.8, -1), k.rind, null, 0) + P.path(cr(41.4, -12, 22, -1), k.flesh, null, 0) + P.path(cr(37, -10.4, 9, -1), k.inner, null, 0);
      out += P.path('M-40 -11.4 C-22 -2.6 22 -2.6 40 -11.4', 'none', ol(P, k.inner), 0.8, { 'stroke-linecap': 'round' });
      for (var j = 0; j < 9; j++) { var x = -30 + j * 7.5, y = -3.4 + Math.abs(x) * Math.abs(x) * 0.0034; out += P.line(x, y + 1.2, x * 1.08, y + 7, tint(P, k.flesh, 0.25), 0.6, { 'stroke-linecap': 'round' }); }
      return P.g('translate(-1 -3.5)', out + P.hl(-12, 3.5, 11, 1.3, tint(P, k.flesh, 0.6), 0.75, 3));
    };
  }
  // a pineapple chunk from above: a wedge cut from a ring, narrow where the core was, its fibres running out to the golden outer edge
  function pineChunk(P, q, x, y, a, s) {
    var col = '#F2C74A', tf = P.at(x, y, a), ri = s * 0.35, ro = s * 1.25, sp = 0.36 + q() * 0.08, pt = function (r, t) { return [Math.cos(t) * r - (ri + ro) / 2, Math.sin(t) * r]; };
    var d = P.smooth([pt(ri, -sp), pt((ri + ro) / 2, -sp * 1.02), pt(ro, -sp), pt(ro * 1.01, 0), pt(ro, sp), pt((ri + ro) / 2, sp * 1.02), pt(ri, sp), pt(ri * 0.96, 0)]);
    var b = P.path(d, col, ol(P, col), 0.6) + P.path(P.smooth([pt(ri * 1.5, -sp * 0.7), pt(ro * 0.9, -sp * 0.8), pt(ro * 0.92, sp * 0.8), pt(ri * 1.5, sp * 0.7)]), '#F6D772', null, 0);
    for (var i = -2; i <= 2; i++) { var p1 = pt(ri * 1.3, i * sp * 0.3), p2 = pt(ro * 0.92, i * sp * 0.36); b += P.line(p1[0], p1[1], p2[0], p2[1], '#E4B23A', 0.5, { opacity: '0.85' }); }
    var o1 = pt(ro * 0.98, -sp * 0.86), o2 = pt(ro * 0.98, sp * 0.86);
    b += P.path('M' + P.n(o1[0]) + ' ' + P.n(o1[1]) + ' Q' + P.n(ro * 1.04 - (ri + ro) / 2) + ' 0 ' + P.n(o2[0]) + ' ' + P.n(o2[1]), 'none', '#E2A630', 1.2, { 'stroke-linecap': 'round' });
    if (q() < 0.4) { var e = pt(ro * 0.95, (q() - 0.5) * sp); b += P.circle(e[0], e[1], 0.6, '#A87A3A'); }
    return P.path(d, '#000000', null, 0, { opacity: '0.12', transform: 'translate(0.9 1.2) ' + tf }) + P.g(tf, b + P.hl(-s * 0.1, -s * 0.12, s * 0.2, s * 0.06, tint(P, col, 0.6), 0.75, 0));
  }
  // a kumquat cut across, from above: rind, pith, five segments and a pip
  function kumquatHalf(P, x, y, r) {
    var col = '#F08A20', out = P.circle(x + 0.7, y + 0.9, r, '#000000', null, 0, { opacity: '0.12' }) + P.circle(x, y, r, col, ol(P, col), 0.5) + P.circle(x, y, r * 0.8, '#FBE6C2') + P.circle(x, y, r * 0.72, '#F6A84A');
    for (var i = 0; i < 5; i++) { var a = i / 5 * Math.PI * 2 - 0.3; out += P.line(x, y, x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72, '#FBE6C2', 0.6); }
    return out + P.ellipse(x + r * 0.28, y - r * 0.12, r * 0.12, r * 0.07, '#F6EAC8', ol(P, '#F6EAC8'), 0.25) + P.hl(x - r * 0.35, y - r * 0.42, r * 0.26, r * 0.1, tint(P, '#F6A84A', 0.6), 0.75, -35);
  }
  // a seedless grape cut in half, from above
  function grapeHalf(P, q, x, y, rx, ry, col) {
    var a = q() * 180, tf = rot(P, a, x, y);
    return P.ellipse(x, y, rx, ry, '#000000', null, 0, { opacity: '0.12', transform: 'translate(0.8 1.1) ' + tf }) + P.ellipse(x, y, rx, ry, col, ol(P, col), 0.5, { transform: tf }) + P.ellipse(x, y, rx * 0.86, ry * 0.82, '#DCE6A4', null, 0, { transform: tf }) +
      P.ellipse(x, y, rx * 0.5, ry * 0.42, '#E8EFC2', null, 0, { transform: tf }) + P.line(x - Math.cos(a * Math.PI / 180) * rx * 0.5, y - Math.sin(a * Math.PI / 180) * rx * 0.5, x + Math.cos(a * Math.PI / 180) * rx * 0.5, y + Math.sin(a * Math.PI / 180) * rx * 0.5, '#C8D88E', 0.5) +
      P.hl(x - rx * 0.3, y - ry * 0.38, rx * 0.26, ry * 0.12, tint(P, '#DCE6A4', 0.6), 0.75, -30);
  }
  // a dried apricot: a flat round with the fold where the stone came out, and a few wrinkles
  function driedApricot(P, q, x, y, a, r) {
    var col = '#E27E26', tf = P.at(x, y, a), d = P.blob(q, r, r * 0.86, 0.07, 10);
    var b = P.path(d, col, ol(P, col), 0.6) + P.path(P.blob(q, r * 0.7, r * 0.58, 0.08, 9, -r * 0.08, -r * 0.08), '#EC9638', null, 0);
    b += P.path('M' + P.n(-r * 0.92) + ' ' + P.n(r * 0.1) + ' Q' + P.n(-r * 0.3) + ' ' + P.n(-r * 0.05) + ' ' + P.n(r * 0.1) + ' ' + P.n(r * 0.18), 'none', ol(P, col), 0.8, { 'stroke-linecap': 'round' });
    for (var i = 0; i < 3; i++) { var b0 = q() * Math.PI * 2, rr = r * (0.45 + q() * 0.3); b += P.path('M' + P.n(Math.cos(b0) * rr) + ' ' + P.n(Math.sin(b0) * rr) + ' A' + P.n(rr) + ' ' + P.n(rr) + ' 0 0 1 ' + P.n(Math.cos(b0 + 0.7) * rr) + ' ' + P.n(Math.sin(b0 + 0.7) * rr), 'none', P.shade(col, -0.14), 0.5, { 'stroke-linecap': 'round' }); }
    return P.path(d, '#000000', null, 0, { opacity: '0.12', transform: 'translate(1 1.3) ' + tf }) + P.g(tf, b + P.hl(-r * 0.3, -r * 0.4, r * 0.28, r * 0.1, tint(P, col, 0.55), 0.75, -25));
  }
  // a prune: a glossy dark oval, deeply wrinkled
  function prune(P, q, x, y, a) {
    var col = '#45222E', tf = P.at(x, y, a), d = P.blob(q, 11, 7.8, 0.08, 10), b = P.path(d, col, ol(P, col), 0.6) + P.path(P.blob(q, 8, 5.2, 0.1, 9, -1, -0.8), '#56303C', null, 0);
    for (var i = 0; i < 4; i++) { var x0 = -7 + i * 4.4 + (q() - 0.5) * 1.5; b += P.path('M' + P.n(x0) + ' ' + P.n(-5.4 + q() * 1.5) + ' Q' + P.n(x0 + 2.2) + ' ' + P.n((q() - 0.5) * 2) + ' ' + P.n(x0 + 0.4) + ' ' + P.n(5 - q() * 1.5), 'none', '#2E1620', 0.6, { 'stroke-linecap': 'round' }); }
    return P.path(d, '#000000', null, 0, { opacity: '0.12', transform: 'translate(1 1.3) ' + tf }) + P.g(tf, b + P.hl(-3, -3.4, 3.4, 1, tint(P, col, 0.45), 0.75, -10) + P.hl(3.6, -2, 1.2, 0.5, tint(P, col, 0.45), 0.75, -10));
  }
  function meringuePeak(P, x, y, r, tip) {
    var out = P.circle(x + 0.7, y + 0.9, r, '#000000', null, 0, { opacity: '0.13' }) + P.circle(x, y, r, '#FBF5E6', '#D9CBA8', 0.6);
    if (tip) out += P.circle(x - r * 0.18, y - r * 0.2, r * 0.68, tip, null, 0, { opacity: '0.5' });
    for (var i = 0; i < 7; i++) { var a = i / 7 * Math.PI * 2; out += P.path('M' + P.n(x + Math.cos(a) * r * 0.92) + ' ' + P.n(y + Math.sin(a) * r * 0.92) + ' Q' + P.n(x + Math.cos(a + 0.9) * r * 0.62) + ' ' + P.n(y + Math.sin(a + 0.9) * r * 0.62) + ' ' + P.n(x - r * 0.1) + ' ' + P.n(y - r * 0.12), 'none', '#DCCAA0', 0.7, { 'stroke-linecap': 'round' }); }
    return out + P.circle(x - r * 0.1, y - r * 0.12, r * 0.2, tip ? P.shade(tip, -0.25) : '#F2E6CC') + P.hl(x - r * 0.45, y - r * 0.1, r * 0.15, r * 0.3, '#FFFFFF', 0.7, 20);
  }

  /* ---------- cakes, tarts and slices ---------- */
  // a wedge from above, tip on the left: the top, and the cut face along the lower edge (its layers, top to bottom)
  function wedgeGeo(R, half, inset) {
    var a = half * Math.PI / 180, d0 = inset ? inset / Math.sin(a) : 0, tx = -R / 2 + d0, r = R - inset - d0;
    return { tx: tx, r: r, a: a, p1: [tx + r * Math.cos(a), -r * Math.sin(a)], p2: [tx + r * Math.cos(a), r * Math.sin(a)] };
  }
  function wedgeD(P, g) { return 'M' + P.n(g.tx) + ' 0 L' + P.n(g.p1[0]) + ' ' + P.n(g.p1[1]) + ' A' + P.n(g.r) + ' ' + P.n(g.r) + ' 0 0 1 ' + P.n(g.p2[0]) + ' ' + P.n(g.p2[1]) + ' Z'; }
  // an arc band along the back of the wedge (the crust of a tart, the edge of a cheesecake)
  function backBand(P, R, half, w, col, x) {
    var g = wedgeGeo(R, half, 0), r = R - w / 2, a = g.a;
    return P.path('M' + P.n(g.tx + r * Math.cos(a)) + ' ' + P.n(-r * Math.sin(a)) + ' A' + P.n(r) + ' ' + P.n(r) + ' 0 0 1 ' + P.n(g.tx + r * Math.cos(a)) + ' ' + P.n(r * Math.sin(a)), 'none', col, w, x);
  }
  // points along the back arc (for piping, crimping, fruit)
  function backPts(R, half, inset, k) {
    var g = wedgeGeo(R, half, 0), r = R - inset, out = [];
    for (var i = 0; i < k; i++) { var a = -g.a + (i + 0.5) / k * g.a * 2; out.push([g.tx + r * Math.cos(a), r * Math.sin(a)]); }
    return out;
  }
  function wedge(o) {
    return function (P, rnd) {
      var R = o.R || 80, half = o.half || 15, fh = o.fh === undefined ? 7 : o.fh, g = wedgeGeo(R, half, 0), out = '', tx = g.tx, p2 = g.p2;
      var whole = 'M' + P.n(tx) + ' 0 L' + P.n(g.p1[0]) + ' ' + P.n(g.p1[1]) + ' A' + P.n(R) + ' ' + P.n(R) + ' 0 0 1 ' + P.n(p2[0]) + ' ' + P.n(p2[1]) + ' L' + P.n(p2[0]) + ' ' + P.n(p2[1] + fh) + ' L' + P.n(tx) + ' ' + P.n(fh) + ' Z';
      out += P.shadow(whole, 2.5, 3);
      var y = 0, ol = edge(P, o.layers[o.layers.length - 1][0]);
      o.layers.forEach(function (l) { var h = l[1] * fh; out += P.path(poly(P, [[tx, y], [p2[0], p2[1] + y], [p2[0], p2[1] + y + h], [tx, y + h]]), l[0], null, 0); y += h; });
      out += P.path(poly(P, [[tx, 0], [p2[0], p2[1]], [p2[0], p2[1] + fh], [tx, fh]]), 'none', ol, 0.8, { 'stroke-linejoin': 'round' });
      out += P.path(wedgeD(P, g), o.side || o.top, edge(P, o.side || o.top), 0.9, { 'stroke-linejoin': 'round' });
      if (o.side) out += P.path(wedgeD(P, wedgeGeo(R, half, o.inset || 1.6)), o.top, null, 0);
      if (o.deco) out += o.deco(P, rnd, R, half, g);
      return P.g(P.at(0, -fh / 2), out);
    };
  }
  // a bar or square slice from above, with its cut face along the front showing the layers
  function bar(o) {
    return function (P, rnd) {
      var w = o.w, h = o.h, fh = o.fh === undefined ? 6 : o.fh, top = P.slab(rnd, w / 2, h / 2, o.sq === undefined ? 0.85 : o.sq, o.wob || 0.02, 16), out = '';
      var x0 = -w / 2 + 0.6, yb = h / 2 - 3;
      out += P.shadow(P.slab(rnd, w / 2, (h + fh) / 2, 0.85, 0.02, 16), 2.5, 3 + fh / 2);
      var y = yb;
      o.layers.forEach(function (l, i) { var hh = (fh + 3) * l[1]; out += P.rect(x0, y, w - 1.2, hh, i === o.layers.length - 1 ? 2 : 0, l[0], null, 0); y += hh; });
      out += P.rect(x0, yb, w - 1.2, fh + 3, 2, 'none', edge(P, o.layers[o.layers.length - 1][0]), 0.7);
      out += P.path(top, o.side || o.top, edge(P, o.side || o.top), 0.9);
      if (o.side) out += P.path(P.slab(rnd, w / 2 - (o.inset || 2), h / 2 - (o.inset || 2), o.sq === undefined ? 0.85 : o.sq, o.wob || 0.02, 16), o.top, null, 0);
      if (o.deco) out += o.deco(P, rnd, w, h);
      return P.g(P.at(0, -fh / 2), out);
    };
  }
  // a fluted pastry case from above (custard tart, fruit tart)
  function fluted(P, r, col) {
    var pts = [];
    for (var i = 0; i < 48; i++) { var a = i / 48 * Math.PI * 2, rr = r * (i % 2 ? 0.95 : 1); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    var d = P.smooth(pts);
    return P.shadow(d) + P.path(d, col, edge(P, col), 0.9) + P.circle(0, 0, r * 0.86, P.shade(col, 0.12), edge(P, col, -0.15), 0.7);
  }
  function tartRound(o) {
    return function (P, rnd) {
      var r = o.r || 30, out = fluted(P, r, o.pastry || '#D9A24E');
      out += P.path(P.blob(rnd, r * 0.8, r * 0.8, 0.02, 12), o.fill, edge(P, o.fill, -0.15), 0.6);
      if (o.deco) out += o.deco(P, rnd, r * 0.78);
      return out;
    };
  }
  // a white ramekin from above, fluted outside
  function ramekin(P, R) {
    var out = P.circle(2.5, 3.5, R, '#000000', null, 0, { opacity: '0.13' }) + P.circle(0, 0, R, '#FFFFFF', '#CFC9BE', 1.2);
    for (var i = 0; i < 36; i++) { var a = i / 36 * Math.PI * 2; out += P.line(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9, Math.cos(a) * R, Math.sin(a) * R, '#E6E1D8', 0.8); }
    return out + P.circle(0, 0, R * 0.88, '#F4F1EB', '#DDD7CC', 0.8) + P.path('M' + P.n(-R * 0.7) + ' ' + P.n(-R * 0.66) + ' A' + P.n(R * 0.96) + ' ' + P.n(R * 0.96) + ' 0 0 1 ' + P.n(R * 0.1) + ' ' + P.n(-R * 0.95), 'none', '#FFFFFF', 1.6, { opacity: '0.9', 'stroke-linecap': 'round' });
  }
  // a glass from above: a clear rim and a shine
  function glass(P, R, thick) {
    var t = thick || 2.6;
    return P.circle(2, 3, R, '#000000', null, 0, { opacity: '0.1' }) + P.circle(0, 0, R, '#EEF3F6', '#A9B6BF', 1.2) + P.circle(0, 0, R - t, '#F7FAFB', '#C9D3D9', 0.7);
  }
  function glassShine(P, R) { return P.path('M' + P.n(-R * 0.72) + ' ' + P.n(-R * 0.6) + ' A' + P.n(R * 0.94) + ' ' + P.n(R * 0.94) + ' 0 0 1 ' + P.n(-R * 0.1) + ' ' + P.n(-R * 0.94), 'none', '#FFFFFF', 2.2, { opacity: '0.85', 'stroke-linecap': 'round' }); }

  /* ---------- ice cream ---------- */
  var FLECK = {
    vanilla: function (P, q, x, y) { return P.circle(x, y, 0.3 + q() * 0.25, '#3A2A1E'); },
    choc: function (P, q, x, y) { return P.path(P.blob(q, 0.9 + q() * 0.8, 0.5 + q() * 0.4, 0.3, 5, x, y, q() * 180), '#3A1E10'); },
    berry: function (P, q, x, y) { return P.path(P.blob(q, 0.9 + q() * 0.7, 0.6 + q() * 0.4, 0.3, 5, x, y), '#C0283A', null, 0, { opacity: '0.8' }); },
    nut: function (P, q, x, y) { return P.path(P.blob(q, 0.8 + q() * 0.7, 0.6 + q() * 0.4, 0.3, 5, x, y), q() < 0.5 ? '#7E9A3E' : '#A8B868', null, 0); },
    petal: function (P, q, x, y) { return P.ellipse(x, y, 1.2, 0.6, '#C9506E', null, 0, { opacity: '0.7', transform: 'rotate(' + Math.round(q() * 180) + ' ' + P.n(x) + ' ' + P.n(y) + ')' }); },
    cookie: function (P, q, x, y) { return P.path(P.blob(q, 1 + q(), 0.8 + q() * 0.6, 0.35, 5, x, y), '#2A1E1A'); },
    coconut: function (P, q, x, y) { return P.rect(x - 0.9, y - 0.3, 1.8, 0.6, 0.2, '#FFFFFF', '#E6DCC6', 0.2, { transform: 'rotate(' + Math.round(q() * 180) + ' ' + P.n(x) + ' ' + P.n(y) + ')' }); },
    seed: function (P, q, x, y) { return P.ellipse(x, y, 0.9, 0.7, '#1E1A14'); },
    zest: function (P, q, x, y) { return P.ellipse(x, y, 0.9, 0.35, '#E8C22A', null, 0, { transform: 'rotate(' + Math.round(q() * 180) + ' ' + P.n(x) + ' ' + P.n(y) + ')' }); }
  };
  function flecks(P, rnd, kind, k, rx, ry, cx, cy) { var f = FLECK[kind]; return f ? P.g(P.at(cx || 0, cy || 0), P.scatter(rnd, k, rx, ry, function (x, y, i, q) { return f(P, q, x, y); })) : ''; }
  // one scoop from above: a frilly edge where it was pressed out, the curl of the scoop, flecks of the flavour
  function scoopBody(P, rnd, o, r) {
    var c = o.c, d = P.blob(rnd, r, r * 0.95, 0.06, 18), out = P.shadow(d, 2, 2.5);
    out += P.path(d, c, edge(P, c, -0.2), 1);
    out += P.path(P.blob(rnd, r * 0.8, r * 0.76, 0.05, 12, -r * 0.05, -r * 0.08), P.shade(c, 0.1), null, 0, { opacity: '0.6' });
    if (o.ripple) out += P.path('M' + P.n(-r * 0.6) + ' ' + P.n(r * 0.2) + ' Q' + P.n(-r * 0.1) + ' ' + P.n(-r * 0.4) + ' ' + P.n(r * 0.2) + ' ' + P.n(r * 0.1) + ' T' + P.n(r * 0.6) + ' ' + P.n(-r * 0.2), 'none', o.ripple, 2.2, { 'stroke-linecap': 'round', opacity: '0.9' });
    if (!o.smooth) {
      out += P.path('M' + P.n(-r * 0.72) + ' ' + P.n(-r * 0.05) + ' Q' + P.n(-r * 0.35) + ' ' + P.n(-r * 0.72) + ' ' + P.n(r * 0.55) + ' ' + P.n(-r * 0.5), 'none', edge(P, c, -0.14), 1.4, { 'stroke-linecap': 'round' });
      out += P.path('M' + P.n(-r * 0.68) + ' ' + P.n(-r * 0.2) + ' Q' + P.n(-r * 0.32) + ' ' + P.n(-r * 0.82) + ' ' + P.n(r * 0.45) + ' ' + P.n(-r * 0.66), 'none', P.shade(c, 0.3), 1, { 'stroke-linecap': 'round', opacity: '0.8' });
      out += P.path('M' + P.n(-r * 0.3) + ' ' + P.n(r * 0.45) + ' Q' + P.n(r * 0.1) + ' ' + P.n(r * 0.3) + ' ' + P.n(r * 0.5) + ' ' + P.n(r * 0.5), 'none', edge(P, c, -0.1), 0.8, { 'stroke-linecap': 'round', opacity: '0.7' });
    }
    if (o.fleck) out += flecks(P, rnd, o.fleck, o.fk || Math.round(r * 1.4), r * 0.75, r * 0.72);
    return out + P.hl(-r * 0.3, -r * 0.42, r * 0.28, r * 0.12, '#FFFFFF', 0.45, -20);
  }
  function scoop(o) { return function (P, rnd) { return scoopBody(P, rnd, o, o.r || 16); }; }
  // a quenelle of ice cream or sorbet, a little melt round its foot
  function quenelleBody(P, rnd, o) {
    var c = o.c, d = 'M-21 1 C-19 -8.5 -6 -12 3 -11.5 C14 -11 21 -6 22 -1 C20 7 10 11.5 -1 11.5 C-12 11.5 -20 8 -21 1 Z', out = '';
    out += P.shadow(d, 1.5, 2.5) + P.path(d, P.shade(c, -0.04), edge(P, c, -0.2), 1.6, { opacity: '0.6' }) + P.path(d, c, edge(P, c, -0.2), 0.9);
    out += P.path('M-18.5 3 C-8 1.8 8 1.2 20.5 0.4 C17 7 9 10 -1 10 C-10 10 -16.5 7.2 -18.5 3 Z', P.shade(c, -0.1), null, 0, { opacity: '0.7' });
    out += P.path('M-19 0 C-15 -7.6 -5 -10 3 -9.8 C12 -9.4 18 -5 20.4 -1.6 C10 -4.6 -6 -4.2 -19 0 Z', P.shade(c, 0.14), null, 0, { opacity: '0.85' });
    if (o.fleck) out += flecks(P, rnd, o.fleck, o.fk || 14, 15, 7);
    return P.g(P.at(0, 0, -8), out + P.hl(-3, -7.2, 8, 1.5, '#FFFFFF', 0.6, -3));
  }
  function quenelle(o) { return function (P, rnd) { return quenelleBody(P, rnd, o); }; }
  // a piped rosette of whipped cream
  function rosette(P, x, y, r, col) {
    col = col || '#FBF8F0';
    var out = P.circle(x + 1, y + 1.4, r, '#000000', null, 0, { opacity: '0.12' }) + P.circle(x, y, r, col, '#DDD5C2', 0.6);
    for (var i = 0; i < 8; i++) {
      var a = i / 8 * Math.PI * 2;
      out += P.path('M' + P.n(x + Math.cos(a) * r * 0.95) + ' ' + P.n(y + Math.sin(a) * r * 0.95) + ' Q' + P.n(x + Math.cos(a + 0.7) * r * 0.75) + ' ' + P.n(y + Math.sin(a + 0.7) * r * 0.75) + ' ' + P.n(x + Math.cos(a + 1.3) * r * 0.2) + ' ' + P.n(y + Math.sin(a + 1.3) * r * 0.2), 'none', '#D9D0BC', 0.7, { 'stroke-linecap': 'round' });
    }
    return out + P.hl(x - r * 0.3, y - r * 0.35, r * 0.25, r * 0.12, '#FFFFFF', 0.8, -30);
  }
  function crumbBits(P, rnd, k, rx, ry, cols, s) {
    return P.scatter(rnd, k, rx, ry, function (x, y, i, q) { var c = cols[i % cols.length]; return P.path(P.blob(q, (1.4 + q() * 1.8) * (s || 1), (1.1 + q() * 1.3) * (s || 1), 0.3, 6, x, y), c, edge(P, c, -0.22), 0.4); });
  }
  // a ball (loukoumades, gulab jamun, truffles, fried biscuits), lit from the top left
  function ball(P, x, y, r, col, gloss) {
    return P.circle(x + 1, y + 1.3, r, '#000000', null, 0, { opacity: '0.14' }) + P.circle(x, y, r, col, edge(P, col), 0.8) + P.circle(x - r * 0.15, y - r * 0.18, r * 0.66, P.shade(col, 0.14), null, 0, { opacity: '0.6' }) + P.hl(x - r * 0.35, y - r * 0.42, r * 0.28, r * 0.16, '#FFFFFF', gloss || 0.4, -30);
  }
  function syrup(P, rnd, rx, ry, col) { var d = P.blob(rnd, rx, ry, 0.08, 12); return P.path(d, col, edge(P, col, -0.2), 0.7, { 'fill-opacity': '0.85' }) + P.hl(-rx * 0.4, -ry * 0.55, rx * 0.25, ry * 0.06, '#FFFFFF', 0.4, -15); }

  /* ---------- the items ---------- */
  var B = { sponge: '#E9C98A', choc: '#5E2F1A', cream: '#F6EFDD', icing: '#FBF6EA', pastry: '#D9A24E', pastryLight: '#E8BC6A', biscuit: '#B98A4E', custard: '#F2D27A', caramel: '#C98A2E' };
  function side(s, h, c) { return { s: s, h: h, c: c }; }

  // cakes
  function cakeSlice(o) {
    return wedge({ top: o.icing, side: o.crumb, inset: 1.4, fh: 8, layers: [[o.icing, 0.14], [o.crumb, 0.3], [o.fill || o.icing, 0.12], [o.crumb, 0.44]],
      deco: function (P, rnd, R, half) {
        var out = '';
        backPts(R, half, 4, 6).forEach(function (p) { out += P.circle(p[0], p[1], 3.2, o.pipe || o.icing, edge(P, o.pipe || o.icing, -0.18), 0.6) + P.circle(p[0] - 0.8, p[1] - 0.9, 1, '#FFFFFF', null, 0, { opacity: '0.6' }); });
        if (o.topper) out += o.topper(P, rnd);
        return out + P.hl(-6, -2, 14, 1.6, '#FFFFFF', 0.3, -6);
      } });
  }
  var sweetItems = [];
  function add(it) { sweetItems.push(it); }

  /* Fruit */
  add({ id: 'strawberries-whole', name: 'Strawberries, whole', sub: 'Fruit', kw: 'strawberry strawberries berries fresh whole', form: 'cluster', cook: 'fresh', role: 'dside', n: 3, w: 54, h: 42, side: side('pile', 16, C.strawberry),
    draw: function (P) { return put(P, -14, -9, 20, 1, strawberry(P)) + put(P, 14, -6, -25, 1, strawberry(P)) + put(P, 0, 10, 80, 1, strawberry(P)); } });
  add({ id: 'strawberries-halved', name: 'Strawberries, halved', sub: 'Fruit', kw: 'strawberry strawberries halves halved cut berries', form: 'half', cook: 'fresh', role: 'dside', n: 4, w: 56, h: 46, side: side('pile', 10, C.strawberry),
    draw: function (P) { return put(P, -14, -10, 15, 1, strawberryHalf(P)) + put(P, 13, -10, 160, 1, strawberryHalf(P)) + put(P, -12, 10, -20, 1, strawberryHalf(P)) + put(P, 14, 11, 200, 1, strawberryHalf(P)); } });
  add({ id: 'blueberries', name: 'Blueberries', sub: 'Fruit', kw: 'blueberry blueberries berries fresh', form: 'scatter', cook: 'fresh', role: 'dside', g: 30, w: 56, h: 40, side: side('pile', 8, '#3E4A7A'),
    draw: function (P, rnd) { return P.scatter(rnd, 12, 24, 16, function (x, y, i, q) { return blueberry(P, x, y, 3.8 + q() * 0.8); }, 7); } });
  add({ id: 'raspberries', name: 'Raspberries', sub: 'Fruit', kw: 'raspberry raspberries berries fresh razz', form: 'scatter', cook: 'fresh', role: 'dside', n: 6, w: 54, h: 40, side: side('pile', 12, '#C0284A'),
    draw: function (P, rnd) { return P.scatter(rnd, 6, 20, 13, function (x, y, i, q) { return raspberry(P, x, y, 6 + q() * 0.8); }, 12); } });
  add({ id: 'mixed-berries', name: 'Mixed berries', sub: 'Fruit', kw: 'mixed berries berry medley strawberry blueberry raspberry blackberry', form: 'scatter', cook: 'fresh', role: 'dside', g: 60, w: 70, h: 52, side: side('pile', 14, '#A3304F'),
    draw: function (P, rnd) {
      return P.scatter(rnd, 13, 30, 21, function (x, y, i, q) {
        var k = i % 4;
        return k === 0 ? put(P, x, y, q() * 360, 0.8, strawberryHalf(P)) : k === 1 ? raspberry(P, x, y, 5.6) : k === 2 ? raspberry(P, x, y, 5.4, '#3A2440') : blueberry(P, x, y, 4);
      }, 10);
    } });
  add({ id: 'banana-slices', name: 'Banana slices', sub: 'Fruit', kw: 'banana slices sliced coins', form: 'slices', cook: 'fresh', role: 'dside', n: 7, w: 84, h: 24, side: side('layer', 4, '#F2DFA0'),
    draw: function (P) { var out = ''; for (var i = 0; i < 7; i++) out += bananaSlice(P, -33 + i * 11, Math.sin(i * 0.9) * 2.5, 10); return out; } });
  add({ id: 'apple-slices-fanned', name: 'Apple slices, fanned', sub: 'Fruit', kw: 'apple slices fanned red apple granny smith', form: 'fan', cook: 'fresh', role: 'dside', n: 6, w: 54, h: 50, side: side('layer', 6, '#F6EDCB'),
    draw: function (P) { var out = ''; for (var i = 0; i < 6; i++) out += P.g(P.at(-24, 12, -50 + i * 13), P.g('translate(24 0)', appleSlice(P, i % 2 ? '#B5303A' : '#C8402E'))); return out; } });
  add({ id: 'mango-cheek', name: 'Mango cheek, hedgehog', sub: 'Fruit', kw: 'mango cheek hedgehog scored cubes', form: 'half', cook: 'fresh', role: 'dside', n: 1, w: 64, h: 44, side: side('mound', 14, '#F2A830'),
    draw: function (P, rnd) {
      var d = P.blob(rnd, 31, 21, 0.03, 14), out = P.shadow(d) + P.path(d, '#7EA453', '#5E7A3A', 1) + P.path(P.blob(rnd, 30, 20, 0.03, 14, 1, 1), '#E08A3A', null, 0, { opacity: '0.6' }) + P.path(P.blob(rnd, 28, 18.5, 0.03, 14), '#D9862A', null, 0);
      for (var x = -24; x <= 24; x += 8) for (var y = -14; y <= 14; y += 8) { if (x * x / 676 + y * y / 256 > 1) continue; out += put(P, x * 1.05, y * 1.05, (x + y) * 0.4, 1, cube(P, 7, '#F5B03A')); }
      return out;
    } });
  add({ id: 'mango-cubes', name: 'Mango cubes', sub: 'Fruit', kw: 'mango cubes diced chunks', form: 'pile', cook: 'fresh', role: 'dside', g: 80, w: 52, h: 40, side: side('pile', 12, '#F2A830'),
    draw: function (P, rnd) { return P.pile(rnd, 10, 20, 14, function (x, y, i, q) { return put(P, x, y, q() * 90, 1, cube(P, 11, i % 3 ? '#F5B03A' : '#F2A030')); }); } });
  add({ id: 'kiwi-slices', name: 'Kiwi fruit slices', sub: 'Fruit', kw: 'kiwi kiwifruit slices green', form: 'slices', cook: 'fresh', role: 'dside', n: 3, w: 72, h: 36, side: side('layer', 4, '#7EA83E'),
    draw: function (P) { return put(P, -20, 2, 0, 1, kiwiSlice(P)) + put(P, 0, -2, 40, 1, kiwiSlice(P)) + put(P, 20, 2, 80, 1, kiwiSlice(P)); } });
  add({ id: 'orange-slices', name: 'Orange slices', sub: 'Fruit', kw: 'orange slices rounds citrus', form: 'slices', cook: 'fresh', role: 'dside', n: 3, w: 96, h: 48, side: side('layer', 4, '#F5A23A'),
    draw: function (P) { return put(P, -26, 2, 0, 1, orangeSlice(P)) + put(P, 0, -2, 18, 1, orangeSlice(P)) + put(P, 26, 2, 36, 1, orangeSlice(P)); } });
  add({ id: 'passionfruit-half', name: 'Passionfruit half', sub: 'Fruit', kw: 'passionfruit passion fruit half pulp', form: 'half', cook: 'fresh', role: 'dside', n: 1, w: 42, h: 42, side: side('cup', 18, '#5E2A4A'), draw: function (P, rnd) { return passionHalf(P, rnd); } });
  add({ id: 'fig-halves', name: 'Fig halves', sub: 'Fruit', kw: 'fig figs halves halved fresh', form: 'half', cook: 'fresh', role: 'dside', n: 2, w: 66, h: 46, side: side('layer', 8, '#C8405A'),
    draw: function (P, rnd) { return put(P, -15, 2, -18, 1, figHalf(P, rnd)) + put(P, 15, -1, 22, 1, figHalf(P, rnd)); } });
  add({ id: 'roasted-pear-half', name: 'Roasted pear half', sub: 'Fruit', kw: 'pear roasted poached baked caramelised half', form: 'half', cook: 'roasted', role: 'dside', n: 1, w: 70, h: 46, side: side('mound', 18, '#D9A24E'),
    draw: function (P) {
      // drawn upright, turned to lie on its side; its shadow is set off so it still falls down and right
      var d = 'M0 -31 Q9 -31 9 -19 Q9 -10 17 2 Q25 17 12 27 Q0 33 -12 27 Q-25 17 -17 2 Q-9 -10 -9 -19 Q-9 -31 0 -31 Z', out = P.shadow(d, 2.5, -2) + P.path(d, '#B9762E', '#8A5220', 1);
      out += P.g('translate(0 1) scale(0.86)', P.path(d, '#E3B062', null, 0)) + P.path('M0 -24 Q4 -10 0 6', 'none', '#C98A3A', 1.4, { 'stroke-linecap': 'round' });
      out += P.ellipse(0, 12, 7, 8.5, '#C98A3A', '#A8682A', 0.6) + P.ellipse(0, 12, 4.5, 6, '#E8BE72', null, 0) + P.ellipse(-1.6, 12, 1, 2, '#5A3A1E') + P.ellipse(1.6, 12, 1, 2, '#5A3A1E');
      out += P.path('M0 -31 Q1 -36 4 -38', 'none', '#5A3A1E', 2, { 'stroke-linecap': 'round' }) + P.hl(-6, -6, 3, 9, '#FFFFFF', 0.3, 10);
      return P.g('rotate(90)', out);
    } });
  add({ id: 'watermelon-wedge', name: 'Watermelon wedge', sub: 'Fruit', kw: 'watermelon wedge slice melon', form: 'wedge', cook: 'fresh', role: 'dside', n: 1, w: 62, h: 40, side: side('wedge', 14, '#E2505A'),
    draw: function (P, rnd) {
      var d = 'M-32 -15 Q0 -31 32 -15 L0 22 Z', out = P.shadow(d) + P.path(d, '#3F7A2A', '#2E5A1E', 0.9, { 'stroke-linejoin': 'round' });
      out += P.path('M-30.6 -13.6 Q0 -28 30.6 -13.6 L0 21 Z', '#F2F0D8', null, 0) + P.path('M-28.6 -11.4 Q0 -24.6 28.6 -11.4 L0 20.4 Z', '#E2505A', null, 0);
      out += P.scatter(rnd, 7, 12, 6, function (x, y, i, q) { return P.ellipse(x, y - 8, 1.1, 1.8, '#1E1A14', null, 0, { transform: rot(P, q() * 40 - 20, x, y - 8) }); });
      return out + P.hl(-10, -14, 8, 1.5, '#FFFFFF', 0.4, -8);
    } });
  add({ id: 'grapes-bunch', name: 'Grapes, small bunch', sub: 'Fruit', kw: 'grapes bunch red grapes green grapes cheese board', form: 'cluster', cook: 'fresh', role: 'dside', g: 80, w: 44, h: 56, side: side('pile', 16, '#7A3A5A'),
    draw: function (P, rnd) {
      var out = P.path('M0 -26 Q2 -20 0 -16', 'none', '#6B5A2A', 2, { 'stroke-linecap': 'round' }), rows = [4, 4, 3, 3, 2, 1];
      rows.forEach(function (k, j) { for (var i = 0; i < k; i++) { var x = (i - (k - 1) / 2) * 9.4 + (rnd() - 0.5) * 1.5, y = -14 + j * 8; out += grape(P, x, y, 5.4, j % 2 ? '#7A3A5A' : '#6A2E4E'); } });
      return out;
    } });
  add({ id: 'fruit-salad', name: 'Fruit salad', sub: 'Fruit', kw: 'fruit salad mixed fruit melon pineapple kiwi grapes', form: 'pile', cook: 'fresh', role: 'dside', g: 150, w: 76, h: 58, side: side('pile', 22, '#F2B05A'),
    draw: function (P, rnd) {
      var cols = ['#F2B05A', '#C9E09A', '#F2D04A', '#F5B03A', '#E8C27A'];
      return P.pile(rnd, 22, 32, 24, function (x, y, i, q) {
        var k = i % 6;
        if (k === 4) return put(P, x, y, q() * 360, 0.75, strawberryHalf(P));
        if (k === 5) return i % 12 === 5 ? blueberry(P, x, y, 4) : grape(P, x, y, 5, '#9CB45A');
        return put(P, x, y, q() * 90, 1, cube(P, 10 + q() * 2, cols[k]));
      });
    } });
  add({ id: 'cranberries-fresh', name: 'Cranberries, fresh', sub: 'Fruit', kw: 'cranberries cranberry fresh red berries', form: 'scatter', cook: 'fresh', role: 'dside', g: 15, w: 52, h: 36, side: side('pile', 8, '#B0202E'),
    draw: function (P, rnd) { return P.scatter(rnd, 13, 22, 14, function (x, y, i, q) { var r = 4.3 + q() * 0.7; return berry(P, q, x, y, r * 1.08, r * 0.94, ['#B0202E', '#A01A2A', '#C02E36', '#B0202E'][i % 4], { end: '#5E1018' }); }, 9); } });
  add({ id: 'cranberries-dried', name: 'Cranberries, dried', sub: 'Fruit', kw: 'dried cranberries craisins cranberry sweetened dried fruit', form: 'scatter', cook: 'cured', role: 'dside', g: 8, w: 40, h: 30, side: side('layer', 3, '#A21E34'),
    draw: function (P, rnd) { return P.scatter(rnd, 16, 19, 14, function (x, y, i, q) { return driedBit(P, q, x, y, 3.2 + q() * 0.8, i % 3 ? '#A21E34' : '#B42A3E', 1); }, 6); } });
  add({ id: 'raisins', name: 'Raisins', sub: 'Fruit', kw: 'raisins dried grapes currants dried fruit', form: 'scatter', cook: 'cured', role: 'dside', g: 8, w: 40, h: 30, side: side('layer', 3, '#4A2430'),
    draw: function (P, rnd) { return P.scatter(rnd, 16, 19, 13, function (x, y, i, q) { return driedBit(P, q, x, y, 3 + q() * 0.7, i % 3 ? '#4A2430' : '#5A2C34', 2); }, 6); } });
  add({ id: 'sultanas', name: 'Sultanas', sub: 'Fruit', kw: 'sultanas golden raisins dried grapes dried fruit', form: 'scatter', cook: 'cured', role: 'dside', g: 8, w: 40, h: 30, of: 'raisins', side: side('layer', 3, '#C0863A'),
    draw: function (P, rnd) { return P.scatter(rnd, 16, 19, 13, function (x, y, i, q) { return driedBit(P, q, x, y, 3 + q() * 0.7, i % 3 ? '#C0863A' : '#B07432', 2); }, 6); } });
  add({ id: 'grapefruit-half', name: 'Grapefruit half', sub: 'Fruit', kw: 'grapefruit half ruby pink grapefruit citrus breakfast bruleed', form: 'half', cook: 'fresh', role: 'dside', n: 1, w: 76, h: 74, side: side('mound', 30, '#F2C24E'),
    draw: function (P, rnd) { return citrusHalf(P, rnd, 36, { rind: '#F2C24E', pith: '#FBEFD8', mem: '#F8D6C8', flesh: '#E8645A', ves: '#F28A7C' }); } });
  add({ id: 'grapefruit-segments', name: 'Grapefruit segments', sub: 'Fruit', kw: 'grapefruit segments supremes ruby pink grapefruit citrus pieces', form: 'slices', cook: 'fresh', role: 'dside', n: 4, w: 54, h: 40, side: side('layer', 6, '#E8645A'),
    draw: function (P, rnd) { return [[-6, -10, -14], [9, -3, 22], [-9, 4, 8], [6, 12, -6]].map(function (p, i) { return put(P, p[0], p[1], p[2], 1, segment(P, rnd, 33, 10.5, i % 2 ? '#E8645A' : '#EC6E60')); }).join(''); } });
  add({ id: 'nectarine-halves', name: 'Nectarine halves', sub: 'Fruit', kw: 'nectarine halves halved stone fruit peach yellow nectarine', form: 'half', cook: 'fresh', role: 'dside', n: 2, w: 90, h: 48, side: side('mound', 16, '#F2B13E'),
    draw: function (P, rnd) { var k = { skin: '#B82E3A', flesh: '#F2B13E', light: '#F5C35E', flush: '#E4844A', stone: '#9A5A3A', pit: '#D0603E' }; return put(P, -21, -1, -12, 1, stoneHalf(P, rnd, 20, k, true)) + put(P, 21, 1, 14, 1, stoneHalf(P, rnd, 19.5, k, false)); } });
  add({ id: 'nectarine-slices', name: 'Nectarine slices', sub: 'Fruit', kw: 'nectarine slices wedges sliced stone fruit peach', form: 'fan', cook: 'fresh', role: 'dside', n: 5, w: 46, h: 52, side: side('layer', 6, '#F2B13E'),
    draw: function (P) { var out = '', k = { skin: '#B82E3A', flesh: '#F2B13E', light: '#F5C35E', flush: '#E4844A' }; for (var i = 0; i < 5; i++) out += P.g(P.at(-17, 8.3, -50 + i * 16), P.g('translate(19 0)', moonSlice(P, 38, 12, k))); return out; } });
  add({ id: 'dried-apricots', name: 'Dried apricots', sub: 'Fruit', kw: 'dried apricots apricot halves turkish apricots dried fruit', form: 'scatter', cook: 'cured', role: 'dside', n: 4, w: 46, h: 40, side: side('layer', 5, '#E27E26'),
    draw: function (P, rnd) { return driedApricot(P, rnd, -10, -8, 20, 10) + driedApricot(P, rnd, 11, -7, -35, 9.5) + driedApricot(P, rnd, -9, 10, 160, 9.6) + driedApricot(P, rnd, 11, 10, 75, 10); } });
  add({ id: 'prunes', name: 'Prunes', sub: 'Fruit', kw: 'prunes dried plums pitted prune dried fruit', form: 'scatter', cook: 'cured', role: 'dside', n: 4, w: 52, h: 38, side: side('layer', 7, '#45222E'),
    draw: function (P, rnd) { return prune(P, rnd, -12, -8, 15) + prune(P, rnd, 12, -8, -20) + prune(P, rnd, -11, 9, -10) + prune(P, rnd, 13, 9, 30); } });
  add({ id: 'rockmelon-wedge', name: 'Rockmelon wedge', sub: 'Fruit', kw: 'rockmelon cantaloupe melon wedge slice orange melon', form: 'wedge', cook: 'fresh', role: 'dside', n: 1, w: 92, h: 33, side: side('wedge', 20, '#F4A04E'),
    draw: melonWedge({ skin: '#B4A87A', net: '#E4DCBC', rind: '#C8CE80', flesh: '#F4A04E', inner: '#EE8C3C' }) });
  add({ id: 'honeydew-wedge', name: 'Honeydew wedge', sub: 'Fruit', kw: 'honeydew melon green melon wedge slice', form: 'wedge', cook: 'fresh', role: 'dside', n: 1, w: 92, h: 33, of: 'rockmelon-wedge', side: side('wedge', 20, '#CDE09A'),
    draw: melonWedge({ skin: '#E2DCA0', rind: '#B4CE76', flesh: '#CDE09A', inner: '#DAE8B0' }) });
  add({ id: 'kumquats', name: 'Kumquats', sub: 'Fruit', kw: 'kumquats cumquats kumquat whole halved citrus', form: 'cluster', cook: 'fresh', role: 'dside', n: 4, w: 48, h: 34, side: side('pile', 12, '#F08A20'),
    draw: function (P, rnd) { return berry(P, rnd, -12, -6, 9.6, 6.8, '#F08A20', { a: 20, end: '#6E8A3A', dimples: 8 }) + berry(P, rnd, 9, -8, 9.2, 6.6, '#EE8218', { a: -15, end: '#6E8A3A', dimples: 8 }) + berry(P, rnd, -4, 8, 9.4, 6.8, '#F29226', { a: 170, end: '#6E8A3A', dimples: 8 }) + kumquatHalf(P, 15, 7, 6.6); } });
  add({ id: 'mandarin-segments', name: 'Mandarin segments', sub: 'Fruit', kw: 'mandarin segments clementine tangerine imperial mandarin citrus pieces', form: 'slices', cook: 'fresh', role: 'dside', n: 5, w: 52, h: 42, side: side('layer', 8, '#F29A2E'),
    draw: function (P, rnd) { return [[-12, -8, -30], [8, -10, 20], [-14, 7, 15], [3, 2, -8], [13, 11, 35]].map(function (p, i) { return put(P, p[0], p[1], p[2], 1, segment(P, rnd, 25, 11, i % 2 ? '#F29A2E' : '#F4A23A', true)); }).join(''); } });
  add({ id: 'asian-pear-slices', name: 'Asian pear slices', sub: 'Fruit', kw: 'asian pear nashi pear slices sliced apple pear crisp', form: 'fan', cook: 'fresh', role: 'dside', n: 6, w: 46, h: 52, side: side('layer', 5, '#F6F1DC'),
    draw: function (P) { var out = '', k = { skin: '#C9A050', flesh: '#F6F1DC', light: '#FBF8EC', dot: '#EAD6A4' }; for (var i = 0; i < 6; i++) out += P.g(P.at(-19, 9, -50 + i * 13), P.g('translate(20 0)', moonSlice(P, 40, 8.5, k, { pip: i % 2 ? 3 : 0 }))); return out; } });
  add({ id: 'pineapple-chunks', name: 'Pineapple chunks', sub: 'Fruit', kw: 'pineapple chunks pieces diced fresh pineapple tidbits', form: 'pile', cook: 'fresh', role: 'dside', g: 80, w: 52, h: 50, side: side('pile', 12, '#F2C74A'),
    draw: function (P, rnd) { return P.scatter(rnd, 8, 21, 15, function (x, y, i, q) { return pineChunk(P, q, x, y, q() * 360, 17 + q() * 2); }, 14); } });
  add({ id: 'grapes-seedless', name: 'Grapes, seedless, loose', sub: 'Fruit', kw: 'seedless grapes green grapes white grapes loose halved thompson', form: 'scatter', cook: 'fresh', role: 'dside', n: 8, w: 46, h: 34, side: side('pile', 10, '#A4BC58'),
    draw: function (P, rnd) { return P.g('translate(-2.6 -2.2)', P.scatter(rnd, 8, 17, 12, function (x, y, i, q) { return i % 3 === 1 ? grapeHalf(P, q, x, y, 6.2, 5, '#A4BC58') : berry(P, q, x, y, 6.4, 5.3, i % 2 ? '#A4BC58' : '#B0C464', { end: '#8A7A4A' }); }, 11)); } });

  /* Cakes and slices */
  add({ id: 'cake-slice', name: 'Cake slice, iced', sub: 'Cakes and slices', kw: 'cake slice sponge birthday cake vanilla cake layer cake gateau', form: 'wedge', cook: 'baked', role: 'dessert', n: 1, w: 80, h: 48, side: side('wedge', 50, B.icing),
    draw: cakeSlice({ icing: B.icing, crumb: B.sponge, fill: '#E2505A', topper: function (P) { return put(P, 26, 0, 180, 0.8, strawberry(P)); } }) });
  add({ id: 'chocolate-cake-slice', name: 'Chocolate cake slice', sub: 'Cakes and slices', kw: 'chocolate cake slice choc gateau', form: 'wedge', cook: 'baked', role: 'dessert', n: 1, w: 80, h: 48, of: 'cake-slice', side: side('wedge', 50, '#6B3A22'),
    draw: cakeSlice({ icing: '#6B3A22', crumb: '#4A2416', fill: '#8A5A3A', pipe: '#7A4428', topper: function (P, rnd) { return P.g(P.at(24, 0), crumbBits(P, rnd, 6, 6, 4, ['#3A1E10', '#F4EEDC'])); } }) });
  add({ id: 'carrot-cake-slice', name: 'Carrot cake slice', sub: 'Cakes and slices', kw: 'carrot cake slice cream cheese icing walnut', form: 'wedge', cook: 'baked', role: 'dessert', n: 1, w: 80, h: 48, of: 'cake-slice', side: side('wedge', 50, '#F6EFDD'),
    draw: cakeSlice({ icing: '#F6EFDD', crumb: '#C98A4A', fill: '#F6EFDD', topper: function (P, rnd) { return P.g(P.at(22, 0), crumbBits(P, rnd, 5, 5, 4, ['#A8743A', '#8A5A2A'], 1.2)) + P.g(P.at(8, 0), P.scatter(rnd, 8, 10, 4, function (x, y) { return P.rect(x - 1.2, y - 0.4, 2.4, 0.8, 0.3, '#EE8A2E'); })); } }) });
  add({ id: 'red-velvet-slice', name: 'Red velvet cake slice', sub: 'Cakes and slices', kw: 'red velvet cake slice cream cheese', form: 'wedge', cook: 'baked', role: 'dessert', n: 1, w: 80, h: 48, of: 'cake-slice', side: side('wedge', 50, '#F6EFDD'),
    draw: cakeSlice({ icing: '#F6EFDD', crumb: '#A8282E', fill: '#F6EFDD', topper: function (P, rnd) { return P.g(P.at(20, 0), crumbBits(P, rnd, 8, 6, 4, ['#A8282E', '#C0383E'], 0.8)); } }) });
  add({ id: 'brownie', name: 'Brownie', sub: 'Cakes and slices', kw: 'brownie chocolate brownie fudge brownie square', form: 'piece', cook: 'baked', role: 'dessert', n: 1, w: 42, h: 46, side: side('slab', 18, '#4A2416'),
    draw: bar({ w: 42, h: 40, top: '#5A2E1A', side: '#4A2416', inset: 2.4, wob: 0.03, layers: [[ '#4A2416', 1 ]], deco: function (P, rnd) {
      var out = '';
      for (var i = 0; i < 6; i++) { var x = -14 + rnd() * 26, y = -14 + rnd() * 26; out += P.path('M' + P.n(x) + ' ' + P.n(y) + ' l' + P.n(4 + rnd() * 4) + ' ' + P.n(rnd() * 3 - 1.5) + ' l' + P.n(2 + rnd() * 3) + ' ' + P.n(rnd() * 4), 'none', '#8A5A3A', 0.8, { opacity: '0.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }); }
      return out + P.path(P.blob(rnd, 12, 8, 0.2, 8, -4, -6), '#6E3A22', null, 0, { opacity: '0.6' }) + P.hl(-8, -10, 9, 2, '#FFFFFF', 0.18, -10);
    } }) });
  add({ id: 'blondie', name: 'Blondie', sub: 'Cakes and slices', kw: 'blondie white chocolate brownie macadamia', form: 'piece', cook: 'baked', role: 'dessert', n: 1, w: 42, h: 46, of: 'brownie', side: side('slab', 18, '#D9A860'),
    draw: bar({ w: 42, h: 40, top: '#E2B46A', side: '#C99248', inset: 2.4, wob: 0.03, layers: [[ '#C99248', 1 ]], deco: function (P, rnd) {
      return P.scatter(rnd, 7, 15, 14, function (x, y, i, q) { return P.path(P.blob(q, 2.4, 1.8, 0.3, 6, x, y), i % 2 ? '#F6EED6' : '#E9D9B0', '#C9B48A', 0.4); }) + P.hl(-8, -10, 9, 2, '#FFFFFF', 0.25, -10);
    } }) });
  add({ id: 'cheesecake-slice', name: 'Cheesecake slice', sub: 'Cakes and slices', kw: 'cheesecake slice baked new york vanilla cheesecake', form: 'wedge', cook: 'baked', role: 'dessert', n: 1, w: 80, h: 48, side: side('wedge', 40, '#F6EBC8'),
    draw: wedge({ top: '#F6EBC8', fh: 8, layers: [['#F2E2B4', 0.72], [B.biscuit, 0.28]], deco: function (P, rnd, R, half) {
      return backBand(P, R, half, 3.4, '#D9A55A') + backBand(P, R, half, 1.4, B.biscuit) + P.hl(-6, -2, 14, 1.6, '#FFFFFF', 0.4, -6);
    } }) });
  add({ id: 'berry-cheesecake-slice', name: 'Cheesecake slice, berry top', sub: 'Cakes and slices', kw: 'cheesecake berry topping compote raspberry', form: 'wedge', cook: 'baked', role: 'dessert', n: 1, w: 80, h: 48, of: 'cheesecake-slice', side: side('wedge', 42, '#F6EBC8'),
    draw: wedge({ top: '#F6EBC8', fh: 8, layers: [['#A3304F', 0.15], ['#F2E2B4', 0.6], [B.biscuit, 0.25]], deco: function (P, rnd, R, half) {
      var g = wedgeGeo(R, half, 3.5);
      return P.path(wedgeD(P, g), '#A3304F', '#7A1F3A', 0.6, { opacity: '0.95' }) + raspberry(P, 20, -4, 4.4) + blueberry(P, 28, 5, 3.2) + raspberry(P, 8, 2, 4) + P.hl(-4, -2, 12, 1.4, '#FFFFFF', 0.4, -6);
    } }) });
  add({ id: 'burnt-basque-cheesecake', name: 'Burnt Basque cheesecake', sub: 'Cakes and slices', kw: 'basque cheesecake burnt burned san sebastian', form: 'wedge', cook: 'baked', role: 'dessert', n: 1, w: 84, h: 52, side: side('wedge', 44, '#5A3A1E'),
    draw: wedge({ top: '#4E2C16', side: '#2E1A0E', inset: 1.8, fh: 10, layers: [['#2E1A0E', 0.08], ['#F2DFA6', 0.82], ['#C99A5A', 0.1]], deco: function (P, rnd, R, half) {
      var out = P.scatter(rnd, 12, 22, 6, function (x, y, i, q) { return P.path(P.blob(q, 2 + q() * 3, 1.4 + q() * 1.6, 0.3, 7, x + 4, y), i % 3 ? '#7A4A28' : '#24140A', null, 0, { opacity: '0.75' }); });
      backPts(R, half, -2, 7).forEach(function (p, i) { out += P.path(P.blob(rnd, 3.2, 2.2, 0.35, 6, p[0] + 1.5, p[1]), '#F4EEE0', '#D9CDB4', 0.6); });
      return out + P.hl(-4, -2, 12, 1.4, '#FFFFFF', 0.2, -6);
    } }) });
  add({ id: 'mud-cake-slice', name: 'Mud cake slice', sub: 'Cakes and slices', kw: 'mud cake chocolate mud cake ganache slice', form: 'wedge', cook: 'baked', role: 'dessert', n: 1, w: 80, h: 50, side: side('wedge', 46, '#3A1E10'),
    draw: wedge({ top: '#3E1E10', side: '#2A140A', inset: 1.2, fh: 10, layers: [['#2A140A', 0.14], ['#4A2416', 0.86]], deco: function (P) {
      return P.path('M-30 1 Q0 -6 30 -3', 'none', '#6B3A22', 1.2, { opacity: '0.6' }) + P.hl(-8, -2, 16, 2, '#FFFFFF', 0.35, -6) + P.hl(18, 3, 5, 1, '#FFFFFF', 0.3, -6);
    } }) });
  add({ id: 'lamington', name: 'Lamington', sub: 'Cakes and slices', kw: 'lamington lammo chocolate coconut sponge square', form: 'piece', cook: 'baked', role: 'dessert', n: 1, w: 36, h: 40, side: side('slab', 30, '#5E2F1A'),
    draw: bar({ w: 36, h: 34, top: '#6B3A22', fh: 6, sq: 0.75, wob: 0.04, layers: [['#5E2F1A', 1]], deco: function (P, rnd) {
      return P.scatter(rnd, 70, 16, 15, function (x, y, i, q) { return P.rect(x - 0.9, y - 0.35, 1.8, 0.7, 0.3, i % 4 ? '#F7F2E6' : '#E6DCC6', null, 0, { transform: rot(P, q() * 180, x, y) }); }) +
        P.scatter(rnd, 26, 16, 3, function (x, y, i, q) { return P.rect(x - 0.9, y - 0.35, 1.8, 0.7, 0.3, '#F7F2E6', null, 0, { transform: 'translate(0 20) ' + rot(P, q() * 180, x, y) }); });
    } }) });
  add({ id: 'vanilla-slice', name: 'Vanilla slice', sub: 'Cakes and slices', kw: 'vanilla slice custard slice snot block passionfruit icing puff pastry', form: 'piece', cook: 'baked', role: 'dessert', n: 1, w: 56, h: 44, side: side('layer', 36, '#F6EBC8'),
    draw: bar({ w: 56, h: 36, top: '#FBF6EA', side: '#E0B060', inset: 2.2, fh: 10, layers: [['#FBF6EA', 0.1], ['#D9A24E', 0.14], ['#F2D27A', 0.62], ['#D9A24E', 0.14]], deco: function (P, rnd) {
      var out = '';
      for (var i = 0; i < 4; i++) out += P.path('M-22 ' + P.n(-10 + i * 6.6) + ' Q0 ' + P.n(-11.5 + i * 6.6) + ' 22 ' + P.n(-10 + i * 6.6), 'none', '#F2E8D2', 0.8);
      return out + P.hl(-10, -10, 10, 2, '#FFFFFF', 0.6, -5);
    } }) });
  add({ id: 'caramel-slice', name: 'Caramel slice', sub: 'Cakes and slices', kw: 'caramel slice millionaire shortbread chocolate caramel', form: 'piece', cook: 'baked', role: 'dessert', n: 1, w: 44, h: 34, side: side('layer', 20, '#4A2416'),
    draw: bar({ w: 44, h: 26, top: '#4A2416', fh: 9, layers: [['#3A1E10', 0.2], ['#C98A2E', 0.45], ['#D9B07A', 0.35]], deco: function (P) { return P.hl(-8, -6, 12, 2, '#FFFFFF', 0.35, -5) + P.hl(10, 4, 4, 0.8, '#FFFFFF', 0.25, -5); } }) });
  add({ id: 'toffee-popcorn-slice', name: 'Toffee popcorn slice', sub: 'Cakes and slices', kw: 'toffee popcorn slice caramel popcorn bar', form: 'piece', cook: 'baked', role: 'dessert', n: 1, w: 52, h: 42, side: side('slab', 24, '#D9A24E'),
    draw: bar({ w: 52, h: 34, top: '#C98A2E', fh: 8, sq: 0.7, wob: 0.05, layers: [['#B9772E', 0.6], ['#8A5A2A', 0.4]], deco: function (P, rnd) {
      var out = P.scatter(rnd, 16, 21, 12, function (x, y, i, q) {
        var s = '';
        for (var k = 0; k < 4; k++) { var a = k / 4 * Math.PI * 2 + q(); s += P.circle(x + Math.cos(a) * 2, y + Math.sin(a) * 2, 2 + q() * 0.8, i % 3 ? '#F6E7B8' : '#E8C27A', '#C9A25A', 0.4); }
        return s;
      }, 6);
      return out + P.path('M-22 -8 L-12 6 L-2 -8 L8 6 L18 -8', 'none', '#A8621E', 1.6, { opacity: '0.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    } }) });
  add({ id: 'mississippi-mud-slice', name: 'Mississippi mud slice', sub: 'Cakes and slices', kw: 'mississippi mud slice marshmallow chocolate slice', form: 'piece', cook: 'baked', role: 'dessert', n: 1, w: 50, h: 44, side: side('slab', 22, '#4A2416'),
    draw: bar({ w: 50, h: 36, top: '#5A2E1A', fh: 8, layers: [['#4A2416', 0.25], ['#F4EEE2', 0.3], ['#6B3A22', 0.45]], deco: function (P, rnd) {
      var out = P.scatter(rnd, 7, 18, 11, function (x, y, i, q) { return P.path(P.blob(q, 4.4, 3.4, 0.2, 8, x, y), '#F7F2EA', '#D9D0BC', 0.5) + P.hl(x - 1.4, y - 1.2, 1.6, 0.8, '#FFFFFF', 0.7); }, 8);
      return out + P.path('M-20 -10 Q-10 0 -2 -10 T16 -8 M-18 8 Q-6 -2 4 8 T20 6', 'none', '#3A1E10', 1.4, { 'stroke-linecap': 'round' });
    } }) });
  add({ id: 'rocky-road', name: 'Rocky road', sub: 'Cakes and slices', kw: 'rocky road chocolate marshmallow nuts cherries', form: 'piece', cook: 'fresh', role: 'dside', n: 1, w: 40, h: 36, side: side('slab', 20, '#5E2F1A'),
    draw: function (P, rnd) {
      var d = P.blob(rnd, 19, 16, 0.12, 10), out = P.shadow(d) + P.path(d, '#5E2F1A', '#3A1E10', 1);
      out += P.scatter(rnd, 8, 13, 10, function (x, y, i, q) { var k = i % 4; return k === 0 ? P.path(P.blob(q, 3.4, 2.8, 0.2, 7, x, y), '#F7F2EA', '#D9D0BC', 0.5) : k === 1 ? P.path(P.blob(q, 3.2, 2.6, 0.2, 7, x, y), '#F2B8C6', '#D9909E', 0.5) : k === 2 ? P.circle(x, y, 2.4, '#C0283A', '#8E1F2A', 0.4) : P.path(P.blob(q, 2.6, 1.8, 0.2, 6, x, y), '#D9B07A', '#A8743A', 0.4); }, 6);
      return out + P.hl(-6, -8, 7, 1.6, '#FFFFFF', 0.3, -15);
    } });
  add({ id: 'tiramisu', name: 'Tiramisu', sub: 'Cakes and slices', kw: 'tiramisu tiramisu mascarpone coffee cocoa square', form: 'portion', cook: 'fresh', role: 'dessert', n: 1, w: 54, h: 60, side: side('layer', 36, '#8A5A3A'),
    draw: bar({ w: 54, h: 50, top: '#8A5A3A', side: '#F2E6CC', inset: 1.8, fh: 10, sq: 0.8, wob: 0.03, layers: [['#7A4A2A', 0.08], ['#F2E6CC', 0.3], ['#9A6A3A', 0.18], ['#F2E6CC', 0.26], ['#9A6A3A', 0.18]], deco: function (P, rnd) {
      return P.scatter(rnd, 90, 24, 22, function (x, y, i, q) { return P.circle(x, y, 0.4 + q() * 0.6, i % 3 ? '#6B3A22' : '#A8744A', null, 0, { opacity: '0.85' }); });
    } }) });

  /* Tarts and pastries */
  add({ id: 'tart-slice', name: 'Tart slice, almond', sub: 'Tarts and pastries', kw: 'tart slice frangipane almond tart pear tart', form: 'wedge', cook: 'baked', role: 'dessert', n: 1, w: 80, h: 46, side: side('wedge', 22, '#D9A24E'),
    draw: wedge({ top: '#D9A860', fh: 6, layers: [['#E0B46A', 0.6], [B.pastry, 0.4]], deco: function (P, rnd, R, half) {
      var out = backBand(P, R, half, 5.5, B.pastry) + backBand(P, R, half, 1.2, B.pastryLight, { opacity: '0.8' });
      out += P.scatter(rnd, 12, 22, 6, function (x, y, i, q) { return P.ellipse(x + 4, y, 2.6, 1.3, '#F2E2B8', '#C9A86A', 0.4, { transform: rot(P, q() * 180, x + 4, y) }); });
      return out + P.hl(-8, -2, 12, 1.4, '#FFFFFF', 0.3, -6);
    } }) });
  add({ id: 'pecan-pie-slice', name: 'Pecan pie slice', sub: 'Tarts and pastries', kw: 'pecan pie slice nut tart', form: 'wedge', cook: 'baked', role: 'dessert', n: 1, w: 80, h: 46, of: 'tart-slice', side: side('wedge', 24, '#8A4A1E'),
    draw: wedge({ top: '#8A4A1E', fh: 6, layers: [['#7A3E18', 0.6], [B.pastry, 0.4]], deco: function (P, rnd, R, half) {
      var out = backBand(P, R, half, 5.5, B.pastry) + backBand(P, R, half, 1.2, B.pastryLight, { opacity: '0.8' });
      out += P.scatter(rnd, 9, 22, 6, function (x, y, i, q) { return P.g(P.at(x + 4, y, q() * 180), P.path('M-3.2 0 Q-3 -2 -1 -1.6 Q0 -2.4 1 -1.6 Q3 -2 3.2 0 Q3 2 1 1.6 Q0 2.4 -1 1.6 Q-3 2 -3.2 0 Z', '#6B3416', '#4A2410', 0.4)); });
      return out + P.hl(-8, -2, 14, 1.6, '#FFFFFF', 0.4, -6);
    } }) });
  add({ id: 'lemon-meringue-tart-slice', name: 'Lemon meringue tart slice', sub: 'Tarts and pastries', kw: 'lemon meringue pie tart slice torched', form: 'wedge', cook: 'baked', role: 'dessert', n: 1, w: 80, h: 48, side: side('wedge', 40, '#F2D04A'),
    draw: wedge({ top: '#F2D04A', fh: 8, layers: [['#FBF6EA', 0.35], ['#F2D04A', 0.4], [B.pastry, 0.25]], deco: function (P, rnd, R, half) {
      var out = backBand(P, R, half, 5, B.pastry) + P.path(wedgeD(P, wedgeGeo(R, half, 2.6)), '#FBF3E2', '#E2D0A8', 0.6), pk = [], t = Math.tan(half * Math.PI / 180);
      // the meringue piled up in swirled peaks, the tips browned under the torch
      for (var x = -28; x <= 32; x += 6) { var hw = (x + R / 2) * t - 4.5; for (var y = -hw; y <= hw + 0.1; y += 6.5) pk.push([x + (rnd() - 0.5) * 2, y + (rnd() - 0.5) * 1.6]); }
      pk.sort(function (a, b) { return a[1] - b[1]; }).forEach(function (p) {
        var x0 = p[0], y0 = p[1], r = 3.4 + rnd() * 1.2;
        out += P.circle(x0 + 0.4, y0 + 0.6, r, '#000000', null, 0, { opacity: '0.08' }) + P.circle(x0, y0, r, '#FFF8EA', '#E2D0A8', 0.5);
        if (rnd() < 0.7) out += P.circle(x0 - 0.5, y0 - 0.6, r * 0.6, '#E2B266', null, 0, { opacity: '0.6' });
        out += P.path('M' + P.n(x0 - r * 0.6) + ' ' + P.n(y0 + r * 0.3) + ' Q' + P.n(x0 - r * 0.5) + ' ' + P.n(y0 - r * 0.7) + ' ' + P.n(x0 + r * 0.4) + ' ' + P.n(y0 - r * 0.5), 'none', '#A8621E', 1, { 'stroke-linecap': 'round', opacity: '0.85' });
      });
      return out;
    } }) });
  add({ id: 'citrus-tart-slice', name: 'Citrus tart slice', sub: 'Tarts and pastries', kw: 'citrus tart lemon tart tarte au citron brulee slice', form: 'wedge', cook: 'baked', role: 'dessert', n: 1, w: 80, h: 46, side: side('wedge', 20, '#F2D04A'),
    draw: wedge({ top: '#F5D447', fh: 6, layers: [['#F2C83A', 0.6], [B.pastry, 0.4]], deco: function (P, rnd, R, half) {
      var out = backBand(P, R, half, 5.5, B.pastry) + backBand(P, R, half, 1.4, '#FFFFFF', { opacity: '0.5' });
      out += P.path(P.blob(rnd, 18, 5, 0.2, 9, 6, 0), '#D99A2A', null, 0, { opacity: '0.55' }) + P.path(P.blob(rnd, 8, 3, 0.25, 7, -14, 0), '#C9801E', null, 0, { opacity: '0.4' });
      return out + P.hl(-4, -2, 16, 1.8, '#FFFFFF', 0.55, -6) + P.hl(18, 4, 6, 1, '#FFFFFF', 0.4, -6);
    } }) });
  add({ id: 'apple-pie-slice', name: 'Apple pie slice', sub: 'Tarts and pastries', kw: 'apple pie slice crust pastry', form: 'wedge', cook: 'baked', role: 'dessert', n: 1, w: 80, h: 48, side: side('wedge', 34, '#D9A24E'),
    draw: wedge({ top: '#E0AE5E', side: '#B9802F', inset: 1.2, fh: 8, layers: [[B.pastry, 0.2], ['#EBD9A0', 0.6], [B.pastry, 0.2]], deco: function (P, rnd, R, half) {
      var out = '';
      backPts(R, half, 3, 9).forEach(function (p) { out += P.circle(p[0], p[1], 3, '#D9A24E', '#B9802F', 0.6) + P.line(p[0] - 1.6, p[1], p[0] + 1.6, p[1], '#B9802F', 0.5); });
      out += P.path('M-8 -3 Q-2 -5 4 -3 M-8 3 Q-2 5 4 3 M8 0 L18 0', 'none', '#8A5A2A', 1.2, { 'stroke-linecap': 'round' });
      out += P.scatter(rnd, 30, 24, 7, function (x, y) { return P.circle(x + 2, y, 0.5, '#FFF6E0', null, 0, { opacity: '0.9' }); });
      return out + P.path(P.blob(rnd, 16, 5, 0.2, 8, 0, 0), '#C98A3A', null, 0, { opacity: '0.35' }) + P.hl(-8, -2, 12, 1.4, '#FFFFFF', 0.3, -6);
    } }) });
  add({ id: 'custard-fruit-pie-slice', name: 'Custard fruit pie slice', sub: 'Tarts and pastries', kw: 'custard fruit pie flan peach apricot custard tart slice', form: 'wedge', cook: 'baked', role: 'dessert', n: 1, w: 80, h: 46, side: side('wedge', 26, '#F2D27A'),
    draw: wedge({ top: '#F4D97E', fh: 6, layers: [['#F2D27A', 0.6], [B.pastry, 0.4]], deco: function (P, rnd, R, half) {
      var out = backBand(P, R, half, 5.5, B.pastry);
      [[-14, 0, 0], [0, -3, 20], [2, 5, -15], [16, -6, 30], [17, 4, -10], [28, 0, 10]].forEach(function (p) { out += P.g(P.at(p[0], p[1], p[2]), P.path('M-6 0 Q-6 -3.6 0 -3.6 Q6 -3.6 6 0 Q3 1 0 1 Q-3 1 -6 0 Z', '#F0A040', '#C9701E', 0.5)); });
      out += blueberry(P, -6, 2, 2.6) + blueberry(P, 10, -1, 2.6) + blueberry(P, 23, 6, 2.6);
      return out + P.hl(-6, -2, 14, 1.6, '#FFFFFF', 0.5, -6);
    } }) });
  add({ id: 'custard-tart', name: 'Custard tart', sub: 'Tarts and pastries', kw: 'custard tart egg custard nutmeg individual', form: 'whole', cook: 'baked', role: 'dessert', n: 1, w: 62, h: 62, side: side('disc', 18, '#F2D27A'),
    draw: tartRound({ r: 30, fill: '#F4DC8A', deco: function (P, rnd, r) {
      return P.scatter(rnd, 40, r * 0.7, r * 0.7, function (x, y, i, q) { return P.circle(x, y, 0.4 + q() * 0.5, '#9A6A3A', null, 0, { opacity: '0.75' }); }) + P.path(P.blob(rnd, r * 0.3, r * 0.22, 0.3, 8, 4, 3), '#D9A24E', null, 0, { opacity: '0.4' }) + P.hl(-r * 0.3, -r * 0.4, r * 0.3, r * 0.08, '#FFFFFF', 0.5, -25);
    } }) });
  add({ id: 'caramel-tart', name: 'Caramel tart', sub: 'Tarts and pastries', kw: 'caramel tart salted caramel chocolate individual', form: 'whole', cook: 'baked', role: 'dessert', n: 1, w: 62, h: 62, of: 'custard-tart', side: side('disc', 18, '#B9772E'),
    draw: tartRound({ r: 30, fill: '#B9772E', deco: function (P, rnd, r) {
      var out = '';
      for (var i = -2; i <= 2; i++) out += P.path('M' + P.n(-r * 0.8) + ' ' + P.n(i * 8 + 4) + ' L' + P.n(r * 0.8) + ' ' + P.n(i * 8 - 4), 'none', '#3A1E10', 1.2, { 'stroke-linecap': 'round', opacity: '0.85' });
      return out + P.scatter(rnd, 8, r * 0.6, r * 0.6, function (x, y) { return P.rect(x - 0.8, y - 0.6, 1.6, 1.2, 0.2, '#FFFFFF', '#D9D3C6', 0.25); }) + P.hl(-r * 0.3, -r * 0.4, r * 0.32, r * 0.08, '#FFFFFF', 0.55, -25);
    } }) });
  add({ id: 'fruit-tart', name: 'Fruit tart, individual', sub: 'Tarts and pastries', kw: 'fruit tart berry tart creme pat custard strawberries individual', form: 'whole', cook: 'baked', role: 'dessert', n: 1, w: 62, h: 62, side: side('disc', 22, '#F2D27A'),
    draw: tartRound({ r: 30, fill: '#F4DC8A', deco: function (P, rnd) {
      var out = '';
      for (var i = 0; i < 6; i++) { var a = i / 6 * Math.PI * 2; out += put(P, Math.cos(a) * 15, Math.sin(a) * 15, a * 180 / Math.PI + 180, 0.75, strawberryHalf(P)); }
      out += raspberry(P, 0, 0, 5.2);
      for (var k = 0; k < 6; k++) { var b = (k + 0.5) / 6 * Math.PI * 2; out += blueberry(P, Math.cos(b) * 7.6, Math.sin(b) * 7.6, 2.8); }
      return out + P.hl(-10, -18, 6, 1.4, '#FFFFFF', 0.5, -25);
    } }) });
  add({ id: 'strudel-slice', name: 'Strudel slice', sub: 'Tarts and pastries', kw: 'strudel apple strudel slice filo pastry', form: 'piece', cook: 'baked', role: 'dessert', n: 1, w: 62, h: 32, side: side('slab', 22, '#D9A24E'),
    draw: function (P, rnd) {
      var d = 'M-28 -13 Q0 -16 26 -13 Q30 0 26 13 Q0 16 -28 13 Q-31 0 -28 -13 Z', out = P.shadow(d) + P.path(d, '#D9A24E', '#A8742E', 1);
      for (var i = 0; i < 8; i++) { var x = -22 + i * 6.4; out += P.path('M' + P.n(x) + ' -12 Q' + P.n(x + 3) + ' 0 ' + P.n(x) + ' 12', 'none', '#B9802F', 1, { opacity: '0.7' }) + P.path('M' + P.n(x + 1.4) + ' -11 Q' + P.n(x + 4.2) + ' 0 ' + P.n(x + 1.4) + ' 11', 'none', '#EBC27A', 0.8, { opacity: '0.8' }); }
      out += P.ellipse(27, 0, 4.4, 12, '#EBD9A0', '#A8742E', 0.8) + P.path('M27 -9 Q30 -4 27 0 Q24 5 27 9', 'none', '#C9A25A', 0.8) + P.circle(27, -3, 1, '#7A4A2A') + P.circle(26.5, 4, 1, '#7A4A2A');
      return out + dust(P, rnd, 60, 24, 10) + P.hl(-8, -8, 14, 1.8, '#FFFFFF', 0.3, -2);
    } });
  add({ id: 'apple-turnover', name: 'Apple turnover', sub: 'Tarts and pastries', kw: 'apple turnover pastry puff triangle', form: 'piece', cook: 'baked', role: 'dessert', n: 1, w: 58, h: 46, side: side('slab', 18, '#D9A24E'),
    draw: function (P, rnd) {
      var d = 'M-27 18 Q-28 14 -24 10 L-2 -19 Q2 -23 6 -19 L27 12 Q29 18 23 19 L-22 21 Q-27 21 -27 18 Z', out = P.shadow(d) + P.path(d, '#D9A24E', '#A8742E', 1);
      out += P.path('M-21 15 L-1 -12 Q2 -15 5 -12 L21 13 Z', '#E6B866', null, 0) + P.path('M-14 9 L-8 3 M-4 0 L2 -6 M6 -2 L11 4', 'none', '#8A5A2A', 1.4, { 'stroke-linecap': 'round' });
      for (var i = 0; i < 9; i++) { var t = i / 8; out += P.line(-24 + 47 * t, 19.6 - t * 0.6 + 0, -24 + 47 * t, 17 - t * 0.6, '#A8742E', 0.8); }
      return out + P.scatter(rnd, 30, 14, 9, function (x, y) { return P.circle(x, y + 5, 0.5, '#FFF6E0', null, 0, { opacity: '0.9' }); }) + P.hl(-4, -2, 8, 2, '#FFFFFF', 0.4, -50);
    } });
  add({ id: 'eclair', name: 'Éclair', sub: 'Tarts and pastries', kw: 'eclair chocolate eclair choux custard', form: 'piece', cook: 'baked', role: 'dessert', n: 1, w: 82, h: 24, side: side('stick', 20, '#D9A24E'),
    draw: function (P) {
      var d = 'M-37 -10 H37 A10 10 0 0 1 37 10 H-37 A10 10 0 0 1 -37 -10 Z', g = 'M-35 -6.5 H35 A6.5 6.5 0 0 1 35 6.5 H-35 A6.5 6.5 0 0 1 -35 -6.5 Z';
      return P.shadow(d) + P.path(d, '#D9A24E', '#A8742E', 1) + P.path('M-38 -6 Q-30 -9.4 -20 -8 M20 9 Q30 9.4 38 7', 'none', '#B9802F', 0.8) + P.path(g, '#4A2416', '#2A140A', 0.8) + P.hl(-10, -3.4, 22, 1.4, '#FFFFFF', 0.4) + P.hl(22, -3.4, 5, 0.9, '#FFFFFF', 0.3);
    } });
  add({ id: 'choux-puffs', name: 'Choux puffs', sub: 'Tarts and pastries', kw: 'choux puffs profiteroles cream puffs craquelin', form: 'cluster', cook: 'baked', role: 'dessert', n: 3, w: 64, h: 52, side: side('mound', 24, '#D9A24E'),
    draw: function (P, rnd) {
      var out = '';
      [[-15, 6], [15, 8], [0, -12]].forEach(function (p) {
        var d = P.blob(rnd, 13, 12.4, 0.06, 10, p[0], p[1]);
        out += P.shadow(d) + P.path(d, '#D9A24E', '#A8742E', 1) + P.path(P.blob(rnd, 10, 9.4, 0.08, 9, p[0] - 1, p[1] - 1), '#E2B060', null, 0);
        for (var i = 0; i < 5; i++) { var a = i / 5 * Math.PI * 2 + rnd(); out += P.path('M' + P.n(p[0] + Math.cos(a) * 2) + ' ' + P.n(p[1] + Math.sin(a) * 2) + ' L' + P.n(p[0] + Math.cos(a) * 9) + ' ' + P.n(p[1] + Math.sin(a) * 9 + 1), 'none', '#B9802F', 0.8, { 'stroke-linecap': 'round' }); }
        out += dust(P, rnd, 14, 7, 6, p[0] - 2, p[1] - 2);
      });
      return out;
    } });
  add({ id: 'baklava', name: 'Baklava', sub: 'Tarts and pastries', kw: 'baklava filo pistachio walnut honey syrup diamonds', form: 'cluster', cook: 'baked', role: 'dessert', n: 3, w: 64, h: 40, side: side('slab', 14, '#D9A24E'),
    draw: function (P, rnd) {
      var out = '';
      [[-20, 0], [0, -2], [20, 1]].forEach(function (p, j) {
        var d = poly(P, [[p[0], p[1] - 18], [p[0] + 11, p[1]], [p[0], p[1] + 18], [p[0] - 11, p[1]]]);
        out += P.shadow(d) + P.path(d, '#C98A3A', '#8E5A22', 0.9, { 'stroke-linejoin': 'round' }) + P.g(P.at(p[0], p[1], 0, 0.8), P.path(poly(P, [[0, -18], [11, 0], [0, 18], [-11, 0]]), '#E2B062', null, 0));
        out += P.path('M' + P.n(p[0] - 6) + ' ' + P.n(p[1] - 6) + ' L' + P.n(p[0] + 6) + ' ' + P.n(p[1] + 6) + ' M' + P.n(p[0] - 4) + ' ' + P.n(p[1] + 8) + ' L' + P.n(p[0] + 6) + ' ' + P.n(p[1] - 4), 'none', '#B9802F', 0.7);
        out += P.scatter(rnd, 10, 3.4, 5, function (x, y, i, q) { return P.path(P.blob(q, 1.2, 0.9, 0.3, 5, p[0] + x, p[1] + y), q() < 0.6 ? '#7E9A3E' : '#A8B868'); });
        out += P.hl(p[0] - 3, p[1] - 6, 2, 4, '#FFFFFF', 0.4, 30);
      });
      return out;
    } });

  /* Puddings */
  add({ id: 'sticky-toffee-pudding', name: 'Sticky toffee pudding', sub: 'Puddings', kw: 'sticky toffee pudding sticky date pudding stp caramel sauce', form: 'whole', cook: 'baked', role: 'dessert', n: 1, w: 80, h: 72, side: side('mound', 34, '#5E2F1A'),
    draw: function (P, rnd) {
      var out = syrup(P, rnd, 39, 34, '#9A5A1E');
      var d = P.blob(rnd, 25, 24, 0.04, 12);
      out += P.shadow(d) + P.path(d, '#5E3018', '#3A1E10', 1) + P.path(P.blob(rnd, 20, 19, 0.05, 10, -1, -1), '#6E3A1E', null, 0);
      out += P.path(P.blob(rnd, 15, 13, 0.18, 10, -2, -3), '#8A4A1E', '#6B3416', 0.6, { opacity: '0.95' });
      [40, 95, 150, 215, 320].forEach(function (a, i) { var r = a * Math.PI / 180, k = 0.8 + (i % 2) * 0.35; out += P.g(P.at(-2 + Math.cos(r) * 15, -3 + Math.sin(r) * 14, a - 90, k), P.path('M-3 -6 L-1.5 3 C-3.2 5 -2.2 8.4 0 8.4 C2.2 8.4 3.2 5 1.5 3 L3 -6 Z', '#8A4A1E', '#6B3416', 0.5) + P.circle(-0.6, 6, 0.8, '#FFFFFF', null, 0, { opacity: '0.5' })); });
      return out + P.hl(-8, -10, 7, 2, '#FFFFFF', 0.5, -20) + P.hl(-26, -20, 6, 1.4, '#FFFFFF', 0.4, -40);
    } });
  add({ id: 'bread-and-butter-pudding', name: 'Bread and butter pudding', sub: 'Puddings', kw: 'bread and butter pudding custard brioche sultanas', form: 'portion', cook: 'baked', role: 'dessert', n: 1, w: 66, h: 58, side: side('slab', 30, '#E0B060'),
    draw: function (P, rnd) {
      var d = P.slab(rnd, 32, 28, 0.6, 0.04, 16), out = P.shadow(d) + P.path(d, '#F2D27A', '#C99A3A', 1);
      [[-14, -12, 20], [6, -14, -10], [20, -2, 70], [-18, 6, -30], [0, 4, 15], [12, 14, 40], [-8, 18, -60]].forEach(function (p) {
        var t = 'M-11 7 L11 7 L0 -10 Z';
        out += P.g(P.at(p[0], p[1], p[2]), P.path(t, '#E2B060', '#A8742E', 0.8, { 'stroke-linejoin': 'round' }) + P.path('M-9 6 L0 -8', 'none', '#9A5A1E', 1.6, { 'stroke-linecap': 'round' }) + P.path('M-6 4 L6 4 L0 -4 Z', '#F2CB7A', null, 0));
      });
      out += P.scatter(rnd, 10, 26, 22, function (x, y, i, q) { return P.path(P.blob(q, 1.6, 1.1, 0.3, 6, x, y), '#5A2A1E', null, 0); });
      return out + dust(P, rnd, 40, 26, 22);
    } });
  add({ id: 'creme-brulee', name: 'Crème brûlée', sub: 'Puddings', kw: 'creme brulee burnt cream custard ramekin torched', form: 'bowlful', cook: 'baked', role: 'dessert', n: 1, w: 70, h: 70, side: side('cup', 28, '#D99A3A'),
    draw: function (P, rnd) {
      var R = 34, out = ramekin(P, R), s = R * 0.84;
      out += P.circle(0, 0, s, '#E8B04A', '#B9802F', 0.8);
      out += P.scatter(rnd, 9, s * 0.7, s * 0.7, function (x, y, i, q) { return P.path(P.blob(q, 3 + q() * 5, 2 + q() * 3, 0.35, 8, x, y), i % 3 ? '#C98A2E' : '#8A4A1E', null, 0, { opacity: '0.7' }); });
      out += P.path('M-12 -6 L-4 -2 L2 -8 L10 -4', 'none', '#FBE8B8', 0.8, { opacity: '0.9', 'stroke-linejoin': 'round' });
      return out + P.hl(-s * 0.3, -s * 0.4, s * 0.38, s * 0.1, '#FFFFFF', 0.6, -25) + P.hl(s * 0.35, s * 0.3, s * 0.12, s * 0.05, '#FFFFFF', 0.5, -25);
    } });
  add({ id: 'creme-caramel', name: 'Crème caramel', sub: 'Puddings', kw: 'creme caramel flan caramel custard turned out', form: 'whole', cook: 'baked', role: 'dessert', n: 1, w: 74, h: 66, side: side('mound', 28, '#F2D27A'),
    draw: function (P, rnd) {
      var out = syrup(P, rnd, 36, 32, '#B9661E');
      var d = P.blob(rnd, 25, 23, 0.02, 12);
      out += P.shadow(d) + P.path(d, '#E6B460', '#B9802F', 0.9);
      for (var i = 0; i < 14; i++) { var a = i / 14 * Math.PI * 2 + rnd() * 0.2; out += P.line(Math.cos(a) * 17, Math.sin(a) * 16 - 1, Math.cos(a) * (21 + rnd() * 3), Math.sin(a) * (20 + rnd() * 2.6) - 1, '#B9661E', 1.6, { opacity: '0.7' }); }
      out += P.circle(0, -1, 18, '#B9661E', '#8A4A14', 0.8) + P.circle(-1, -2, 13.5, '#C97C2A', null, 0, { opacity: '0.7' });
      return out + P.hl(-6, -9, 8, 2.2, '#FFFFFF', 0.55, -20) + P.hl(-22, -18, 6, 1.4, '#FFFFFF', 0.4, -40);
    } });
  add({ id: 'panna-cotta', name: 'Panna cotta with berries', sub: 'Puddings', kw: 'panna cotta pannacotta vanilla turned out berries', form: 'whole', cook: 'fresh', role: 'dessert', n: 1, w: 74, h: 66, side: side('mound', 30, '#F7F2E6'),
    draw: function (P, rnd) {
      var out = P.path(P.blob(rnd, 32, 27, 0.12, 12, 4, 5), '#A3304F', '#7A1F3A', 0.7) + P.hl(18, 22, 7, 1.4, '#FFFFFF', 0.4, -20);
      var d = P.blob(rnd, 23, 22, 0.02, 12, -2, -2);
      out += P.shadow(d, 2.5, 3) + P.path(d, '#F2ECDD', '#D3CBB6', 0.9) + P.circle(-1, -1, 18, '#FAF6EC', null, 0) + P.circle(-1, -1, 12, '#FFFDF7', null, 0, { opacity: '0.8' });
      out += P.scatter(rnd, 16, 12, 12, function (x, y) { return P.circle(x - 1, y - 1, 0.35, '#3A2A1E'); });
      out += raspberry(P, 0, -3, 5) + blueberry(P, 6, 3, 3.4) + raspberry(P, -18, 24, 5.4) + raspberry(P, 22, 20, 5) + blueberry(P, 0, 27, 3.8) + blueberry(P, 31, 6, 3.6) + put(P, 28, -16, 120, 0.8, strawberryHalf(P));
      return out + P.hl(-10, -12, 7, 2.4, '#FFFFFF', 0.8, -25);
    } });
  add({ id: 'souffle', name: 'Soufflé', sub: 'Puddings', kw: 'souffle risen ramekin chocolate passionfruit', form: 'bowlful', cook: 'baked', role: 'dessert', n: 1, w: 66, h: 66, side: side('cup', 44, '#D9A24E'),
    draw: function (P, rnd) {
      var R = 32, out = ramekin(P, R);
      var d = P.blob(rnd, R * 0.94, R * 0.94, 0.03, 14);
      out += P.path(d, '#C98A3A', '#A8682A', 1) + P.path(P.blob(rnd, R * 0.8, R * 0.8, 0.04, 12, -1, -1), '#E0A856', null, 0) + P.path(P.blob(rnd, R * 0.5, R * 0.48, 0.06, 10, -2, -2), '#ECC27A', null, 0);
      out += P.path('M-12 4 Q-4 -2 4 3 T16 0', 'none', '#B9762E', 1.2, { 'stroke-linecap': 'round' });
      return out + dust(P, rnd, 70, R * 0.7, R * 0.7) + P.hl(-10, -12, 8, 2.4, '#FFFFFF', 0.4, -25);
    } });
  add({ id: 'trifle-glass', name: 'Trifle in a glass', sub: 'Puddings', kw: 'trifle glass custard jelly sponge cream sherry', form: 'bowlful', cook: 'fresh', role: 'dessert', n: 1, w: 72, h: 72, side: side('cup', 60, '#F6EFDD'),
    draw: function (P, rnd) {
      var R = 36, out = glass(P, R), s = R - 3;
      out += P.circle(0, 0, s, '#C0283A', null, 0, { opacity: '0.85' }) + P.path('M' + P.n(-s * 0.98) + ' ' + P.n(s * 0.2) + ' A' + P.n(s) + ' ' + P.n(s) + ' 0 0 0 ' + P.n(s * 0.98) + ' ' + P.n(s * 0.2), 'none', '#F2D27A', 3, { opacity: '0.9' });
      out += P.path(P.blob(rnd, s * 0.9, s * 0.88, 0.04, 14, 0, -1.5), '#F8F2E4', '#E0D6C0', 0.7);
      out += rosette(P, 0, -2, 7);
      out += raspberry(P, -14, -10, 4.6) + raspberry(P, 14, 10, 4.6) + put(P, 13, -12, 40, 0.75, strawberryHalf(P)) + put(P, -13, 12, 220, 0.75, strawberryHalf(P)) + blueberry(P, -18, 3, 3) + blueberry(P, 18, -2, 3);
      out += P.scatter(rnd, 10, s * 0.75, s * 0.75, function (x, y, i, q) { return P.ellipse(x, y, 2, 1, '#E8C27A', '#B9946A', 0.3, { transform: rot(P, q() * 180, x, y) }); });
      return out + glassShine(P, R);
    } });
  add({ id: 'mousse-glass', name: 'Chocolate mousse in a glass', sub: 'Puddings', kw: 'mousse chocolate mousse glass pot', form: 'bowlful', cook: 'fresh', role: 'dessert', n: 1, w: 60, h: 60, side: side('cup', 50, '#6B3A22'),
    draw: function (P, rnd) {
      var R = 30, out = glass(P, R), s = R - 3;
      out += P.circle(0, 0, s, '#6B3A22', '#4A2416', 0.6) + P.path(P.blob(rnd, s * 0.8, s * 0.78, 0.08, 12), '#7A4428', null, 0);
      out += P.scatter(rnd, 14, s * 0.8, s * 0.8, function (x, y, i, q) { return P.circle(x, y, 0.6 + q() * 0.8, '#5A2E1A', null, 0, { opacity: '0.7' }); });
      out += rosette(P, 4, 2, 8) + P.scatter(rnd, 6, 6, 4, function (x, y, i, q) { return P.path('M' + P.n(x - 2) + ' ' + P.n(y) + ' q2 -2.4 4 0', 'none', '#3A1E10', 1.2, { 'stroke-linecap': 'round', transform: 'translate(4 2) ' + rot(P, q() * 180, x, y) }); });
      return out + glassShine(P, R);
    } });
  add({ id: 'dessert-jar', name: 'Dessert jar', sub: 'Puddings', kw: 'dessert jar mason jar layered cheesecake jar crumble curd', form: 'bowlful', cook: 'fresh', role: 'dessert', n: 1, w: 70, h: 70, side: side('cup', 64, '#F2D27A'),
    draw: function (P, rnd) {
      var R = 35, out = P.circle(2, 3, R, '#000000', null, 0, { opacity: '0.1' }) + P.circle(0, 0, R, '#E6EDF1', '#A9B6BF', 1.2) + P.circle(0, 0, R - 2, 'none', '#C9D3D9', 2.2, { 'stroke-dasharray': '3 2' }) + P.circle(0, 0, R - 4.4, '#F7FAFB', '#B9C4CC', 0.8);
      var s = R - 6;
      out += P.circle(0, 0, s, '#B98A4E', null, 0) + P.path('M' + P.n(-s * 0.98) + ' ' + P.n(s * 0.18) + ' A' + P.n(s) + ' ' + P.n(s) + ' 0 0 0 ' + P.n(s * 0.98) + ' ' + P.n(s * 0.18), 'none', '#F2D04A', 3.4);
      out += P.path(P.blob(rnd, s * 0.92, s * 0.9, 0.04, 14, 0, -1.5), '#F6EBC8', '#E0D2A8', 0.6);
      out += P.path(P.blob(rnd, 9, 8, 0.12, 9, 5, 3), '#E8B02A', '#C99A22', 0.5) + P.scatter(rnd, 7, 6, 5, function (x, y) { return P.ellipse(x + 5, y + 3, 1, 0.8, '#1E1A14'); });
      out += crumbBits(P, rnd, 14, s * 0.75, s * 0.75, ['#C98A4A', '#B9772E', '#E0B46A'], 0.9) + raspberry(P, -10, -8, 4.4) + blueberry(P, -15, 5, 3);
      return out + glassShine(P, R);
    } });
  add({ id: 'pavlova', name: 'Pavlova', sub: 'Puddings', kw: 'pavlova pav meringue cream passionfruit kiwi strawberries', form: 'whole', cook: 'baked', role: 'dessert', n: 1, w: 72, h: 70, side: side('mound', 36, '#FBF7EE'),
    draw: function (P, rnd) {
      var d = P.blob(rnd, 35, 34, 0.07, 16), out = P.shadow(d, 2.5, 3) + P.path(d, '#F4ECDC', '#D9CDB4', 1);
      out += P.path(P.blob(rnd, 31, 30, 0.06, 14), '#FBF7EE', null, 0);
      for (var i = 0; i < 9; i++) { var a = i / 9 * Math.PI * 2 + rnd() * 0.3; out += P.path('M' + P.n(Math.cos(a) * 33) + ' ' + P.n(Math.sin(a) * 32) + ' l' + P.n(-Math.cos(a) * 5 + rnd() * 2) + ' ' + P.n(-Math.sin(a) * 5 + rnd() * 2) + ' l' + P.n(rnd() * 3 - 1.5) + ' ' + P.n(rnd() * 3 - 1.5), 'none', '#D9CDB4', 0.8, { 'stroke-linecap': 'round' }); }
      out += P.path(P.blob(rnd, 24, 22, 0.1, 12), '#FFFDF7', '#E6DCC6', 0.7);
      out += put(P, -9, -8, 30, 0.6, kiwiSlice(P)) + put(P, 10, 10, -20, 0.6, kiwiSlice(P));
      out += put(P, 10, -10, 120, 0.8, strawberryHalf(P)) + put(P, -11, 10, 300, 0.8, strawberryHalf(P)) + blueberry(P, -2, 14, 3) + blueberry(P, 16, 0, 3);
      out += P.path(P.blob(rnd, 7, 5.5, 0.2, 8, 0, 0), '#E8B02A', '#C99A22', 0.5) + P.ellipse(-1.5, -1, 1, 0.8, '#1E1A14') + P.ellipse(2, 1, 1, 0.8, '#1E1A14') + P.ellipse(-0.5, 2.2, 1, 0.8, '#1E1A14');
      return out;
    } });
  add({ id: 'chocolate-fondant', name: 'Chocolate fondant', sub: 'Puddings', kw: 'chocolate fondant lava cake molten pudding volcano', form: 'whole', cook: 'baked', role: 'dessert', n: 1, w: 62, h: 52, side: side('mound', 34, '#4A2416'),
    draw: function (P, rnd) {
      var out = P.path(P.blob(rnd, 16, 9, 0.15, 10, 13, 11, 35), '#3A1A0C', '#22100A', 0.6) + P.hl(14, 12, 6, 1.2, '#FFFFFF', 0.5, 35);
      var d = P.blob(rnd, 22, 21, 0.03, 12, -6, -3);
      out += P.shadow(d) + P.path(d, '#4A2416', '#2A140A', 1) + P.path(P.blob(rnd, 17, 16, 0.05, 10, -7, -4), '#5A2E1A', null, 0);
      out += P.path('M2 4 Q10 0 14 7 Q9 14 2 4 Z', '#2A140A', null, 0) + P.path('M4 5 Q10 3 12 7', 'none', '#6B3A22', 0.8);
      return out + dust(P, rnd, 70, 14, 13, -7, -4) + P.hl(-13, -12, 6, 2, '#FFFFFF', 0.25, -25);
    } });
  add({ id: 'golden-syrup-dumplings', name: 'Golden syrup dumplings', sub: 'Puddings', kw: 'golden syrup dumplings pudding syrup', form: 'cluster', cook: 'poached', role: 'dessert', n: 3, w: 72, h: 60, side: side('mound', 22, '#D9A24E'),
    draw: function (P, rnd) {
      var out = syrup(P, rnd, 35, 29, '#D9902A');
      [[-12, -8], [13, -6], [0, 12]].forEach(function (p) { out += ball(P, p[0], p[1], 12, '#D9A24E', 0.55) + P.path('M' + P.n(p[0] - 6) + ' ' + P.n(p[1] - 3) + ' Q' + P.n(p[0]) + ' ' + P.n(p[1] + 3) + ' ' + P.n(p[0] + 7) + ' ' + P.n(p[1] - 2), 'none', '#B9762E', 1, { opacity: '0.7' }); });
      return out;
    } });

  /* Frozen */
  var IC = { r: 16 };
  add({ id: 'ice-cream-scoop', name: 'Ice cream scoop, vanilla', sub: 'Frozen', kw: 'ice cream scoop vanilla gelato icecream', form: 'scoop', cook: 'fresh', role: 'dside', n: 1, w: 34, h: 33, side: side('scoop', 26, '#F6EBC8'), draw: scoop({ c: '#F6EBC8', fleck: 'vanilla' }) });
  [['chocolate', 'Chocolate', '#6B3A22', 'choc gelato', null],
    ['strawberry', 'Strawberry', '#F2A6B0', 'strawberry gelato pink', 'berry'],
    ['pistachio', 'Pistachio', '#B9CC86', 'pistachio gelato green', 'nut'],
    ['mango-sorbet', 'Mango sorbet', '#F5B04A', 'mango sorbet sorbetto', null, true],
    ['rose', 'Rose', '#F2B8C6', 'rose rosewater pink', 'petal'],
    ['stracciatella', 'Stracciatella', '#F7F1E2', 'stracciatella choc chip chocolate chip', 'choc'],
    ['salted-caramel', 'Salted caramel', '#D9A060', 'salted caramel gelato', null, false, '#A8621E'],
    ['cookies-and-cream', 'Cookies and cream', '#EFEBE2', 'cookies and cream cookie oreo', 'cookie'],
    ['coconut', 'Coconut', '#FBF8F0', 'coconut gelato', 'coconut'],
    ['lemon-sorbet', 'Lemon sorbet', '#F6E79A', 'lemon sorbet sorbetto', 'zest', true],
    ['raspberry-sorbet', 'Raspberry sorbet', '#D6405E', 'raspberry sorbet sorbetto', 'seed', true]
  ].forEach(function (f) {
    add({ id: 'ice-cream-' + f[0], name: (f[5] ? '' : 'Ice cream scoop, ') + (f[5] ? f[1] + ', scoop' : f[1].toLowerCase()), sub: 'Frozen', kw: 'ice cream scoop ' + f[3], form: 'scoop', cook: 'fresh', role: 'dside', n: 1, w: 34, h: 33, of: 'ice-cream-scoop', side: side('scoop', 26, f[2]), draw: scoop({ c: f[2], fleck: f[4], smooth: f[5], ripple: f[6], fk: f[4] === 'seed' ? 10 : 0 }) });
  });
  add({ id: 'ice-cream-quenelle', name: 'Ice cream quenelle', sub: 'Frozen', kw: 'ice cream quenelle rocher vanilla bean', form: 'quenelle', cook: 'fresh', role: 'dside', n: 1, w: 46, h: 28, side: side('scoop', 16, '#F6EBC8'), draw: quenelle({ c: '#F6EBC8', fleck: 'vanilla', fk: 26 }) });
  add({ id: 'sorbet-quenelle', name: 'Sorbet quenelle, raspberry', sub: 'Frozen', kw: 'sorbet quenelle raspberry sorbetto', form: 'quenelle', cook: 'fresh', role: 'dside', n: 1, w: 46, h: 28, of: 'ice-cream-quenelle', side: side('scoop', 16, '#D6405E'), draw: quenelle({ c: '#D6405E' }) });
  add({ id: 'mango-sorbet-quenelle', name: 'Sorbet quenelle, mango', sub: 'Frozen', kw: 'sorbet quenelle mango sorbetto', form: 'quenelle', cook: 'fresh', role: 'dside', n: 1, w: 46, h: 28, of: 'ice-cream-quenelle', side: side('scoop', 16, '#F5B04A'), draw: quenelle({ c: '#F5B04A' }) });
  add({ id: 'kulfi', name: 'Kulfi', sub: 'Frozen', kw: 'kulfi indian ice cream pistachio saffron stick', form: 'stick', cook: 'fresh', role: 'dside', n: 1, w: 74, h: 26, side: side('stick', 22, '#F2DFA0'),
    draw: function (P, rnd) {
      var d = 'M-24 -11 Q-30 0 -24 11 L20 4 Q24 0 20 -4 Z', out = P.rect(18, -2, 20, 4, 1.6, '#D9B98A', '#A8885A', 0.6) + P.shadow(d) + P.path(d, '#F2DFA0', '#C9B06A', 1) + P.path('M-22 -7 L16 -2.6', 'none', '#FBF0C8', 2.4, { 'stroke-linecap': 'round', opacity: '0.8' });
      out += P.scatter(rnd, 12, 17, 5, function (x, y, i, q) { return i % 3 ? P.path(P.blob(q, 1.2, 0.8, 0.3, 5, x - 4, y), '#7E9A3E') : P.line(x - 5, y, x - 3.4, y + 0.6, '#D9502A', 0.6); });
      return out + P.g('', P.ellipse(-26, 0, 3, 10, '#F7E8B8', null, 0, { opacity: '0.7' }));
    } });
  add({ id: 'whipped-cream-rosette', name: 'Whipped cream rosette', sub: 'Frozen', kw: 'whipped cream chantilly piped rosette cream dollop', form: 'dollop', cook: 'fresh', role: 'dside', g: 20, w: 30, h: 30, side: side('mound', 14, '#FBF8F0'), draw: function (P) { return rosette(P, 0, 0, 13); } });
  add({ id: 'sundae-glass', name: 'Sundae in a glass', sub: 'Frozen', kw: 'sundae ice cream sundae glass chocolate sauce cherry wafer', form: 'bowlful', cook: 'fresh', role: 'dessert', n: 1, w: 84, h: 84, side: side('cup', 70, '#F6EBC8'),
    draw: function (P, rnd) {
      var R = 42, out = glass(P, R) + P.circle(0, 0, R - 3, '#DCE5EA', null, 0);
      out += P.g(P.at(-12, 8), scoopBody(P, rnd, { c: '#F6EBC8', fleck: 'vanilla' }, 14)) + P.g(P.at(13, 9), scoopBody(P, rnd, { c: '#6B3A22' }, 14)) + P.g(P.at(1, -12), scoopBody(P, rnd, { c: '#F2A6B0', fleck: 'berry' }, 14));
      out += P.path('M-24 0 Q-14 -8 -4 2 T16 0 Q22 -6 26 4 M-18 16 Q-6 8 4 18', 'none', '#4A2416', 2.4, { 'stroke-linecap': 'round' });
      out += rosette(P, 0, 4, 7) + P.circle(2, 0, 4, '#C0182A', '#8E1020', 0.6) + P.hl(0.6, -1.4, 1.4, 0.8, '#FFFFFF', 0.7) + P.path('M3 -3.4 Q6 -10 10 -12', 'none', '#5E7A3A', 1, { 'stroke-linecap': 'round' });
      out += P.g(P.at(22, -18, 30), P.rect(-4, -12, 8, 24, 1, '#E8C27A', '#B98A4E', 0.7) + P.path('M-4 -6 H4 M-4 0 H4 M-4 6 H4', 'none', '#C99A5A', 0.6));
      return out + glassShine(P, R);
    } });
  add({ id: 'affogato', name: 'Affogato', sub: 'Frozen', kw: 'affogato espresso coffee vanilla ice cream glass', form: 'bowlful', cook: 'fresh', role: 'dessert', n: 1, w: 56, h: 56, side: side('cup', 40, '#5A3420'),
    draw: function (P, rnd) {
      var R = 28, out = glass(P, R) + P.circle(0, 0, R - 3, '#4A2A18', null, 0) + P.circle(0, 0, R - 5, 'none', '#B9804A', 2.4, { opacity: '0.7' });
      out += P.path(P.blob(rnd, 17, 16, 0.08, 10, 1, 1), '#C99A6A', null, 0, { opacity: '0.6' });
      out += scoopBody(P, rnd, { c: '#F6EBC8', fleck: 'vanilla' }, 13);
      out += P.path('M-6 -4 Q0 2 6 -2', 'none', '#5A3420', 1.6, { opacity: '0.7', 'stroke-linecap': 'round' });
      return out + glassShine(P, R);
    } });
  add({ id: 'acai-bowl', name: 'Açaí bowl', sub: 'Frozen', kw: 'acai bowl acai smoothie bowl granola banana berries coconut', form: 'bowlful', cook: 'fresh', role: 'dessert', n: 1, w: 100, h: 100, side: side('cup', 40, '#5A2A4A'),
    draw: function (P, rnd) {
      var R = 50, out = P.circle(3, 4, R, '#000000', null, 0, { opacity: '0.12' }) + P.circle(0, 0, R, '#FFFFFF', '#CFC9BE', 1.4) + P.circle(0, 0, R * 0.9, '#EFEBE4', '#DDD7CC', 0.8);
      out += P.path(P.blob(rnd, R * 0.84, R * 0.84, 0.03, 14), '#5A2A4A', '#3E1A30', 0.8) + P.path(P.blob(rnd, R * 0.6, R * 0.55, 0.08, 12, -4, -4), '#6E3A5E', null, 0, { opacity: '0.6' });
      // rows across the bowl: banana, granola, strawberries, blueberries, coconut
      for (var i = 0; i < 5; i++) out += bananaSlice(P, -26 + i * 9, -24 + i * 1.5, 6.4);
      out += P.g(P.at(-6, -6), crumbBits(P, rnd, 26, 26, 6, ['#C98A4A', '#B9772E', '#E0B46A', '#8A5A2A'], 1));
      for (var k = 0; k < 4; k++) out += put(P, -18 + k * 11, 10 + (k % 2) * 2, 90, 0.7, strawberryHalf(P));
      out += P.scatter(rnd, 7, 18, 4, function (x, y) { return blueberry(P, x, y + 26, 3.2); });
      out += P.scatter(rnd, 14, 10, 14, function (x, y, i, q) { return P.rect(x + 28 - 1.4, y - 0.5, 2.8, 1, 0.4, '#FFFFFF', '#E6DCC6', 0.3, { transform: rot(P, q() * 180, x + 28, y) }); });
      return out;
    } });

  /* Small sweets */
  add({ id: 'meringue-kisses', name: 'Meringue kisses', sub: 'Small sweets', kw: 'meringue kisses mini meringues piped torched', form: 'scatter', cook: 'baked', role: 'dside', n: 5, w: 50, h: 36, side: side('mound', 10, '#FBF7EE'),
    draw: function (P, rnd) { return P.scatter(rnd, 5, 17, 11, function (x, y, i) { return meringuePeak(P, x, y, 6.5, i % 2 ? '#E8C27A' : null); }, 12); } });
  add({ id: 'honeycomb-shards', name: 'Honeycomb shards', sub: 'Small sweets', kw: 'honeycomb hokey pokey cinder toffee shards', form: 'shard', cook: 'fresh', role: 'garnish', g: 10, w: 48, h: 36, side: side('pile', 8, '#E2A93A'),
    draw: function (P, rnd) {
      return P.scatter(rnd, 4, 15, 9, function (x, y, i, q) {
        var pts = [], k = 5 + Math.floor(q() * 2), s = 6 + q() * 4;
        for (var j = 0; j < k; j++) { var a = j / k * Math.PI * 2, r = s * (0.7 + q() * 0.5); pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8]); }
        var d = poly(P, pts), o = P.shadow(d, 1, 1.4) + P.path(d, '#E2A03A', '#A8682A', 0.7, { 'stroke-linejoin': 'round' }) + P.path(poly(P, pts.map(function (p) { return [x + (p[0] - x) * 0.7, y + (p[1] - y) * 0.7]; })), '#F0BC5A', null, 0, { opacity: '0.7' });
        for (var b = 0; b < 5; b++) o += P.circle(x + (q() - 0.5) * s, y + (q() - 0.5) * s * 0.8, 0.6 + q() * 0.9, '#C9801E', null, 0, { opacity: '0.85' });
        return o + P.hl(x - s * 0.3, y - s * 0.3, s * 0.3, s * 0.1, '#FFFFFF', 0.5, -30);
      }, 10);
    } });
  add({ id: 'chocolate-shards', name: 'Chocolate shards', sub: 'Small sweets', kw: 'chocolate shards shard tuile dark chocolate garnish', form: 'shard', cook: 'fresh', role: 'garnish', g: 10, w: 50, h: 36, side: side('pile', 6, '#3A1E10'),
    draw: function (P, rnd) {
      return P.scatter(rnd, 4, 16, 9, function (x, y, i, q) {
        var a = q() * 180, l = 10 + q() * 8, w = 4 + q() * 3, pts = [[-l, -w * 0.4], [-l * 0.2, -w], [l, -w * 0.2], [l * 0.6, w * 0.8], [-l * 0.7, w * 0.6]];
        var d = poly(P, pts);
        return P.g(P.at(x, y, a), P.shadow(d, 1, 1.4) + P.path(d, '#3E2014', '#22100A', 0.7, { 'stroke-linejoin': 'round' }) + P.path('M' + P.n(-l * 0.6) + ' ' + P.n(-w * 0.3) + ' L' + P.n(l * 0.6) + ' ' + P.n(-w * 0.15), 'none', '#FFFFFF', 0.9, { opacity: '0.35', 'stroke-linecap': 'round' }));
      }, 10);
    } });
  add({ id: 'crumble-scatter', name: 'Crumble scatter', sub: 'Small sweets', kw: 'crumble streusel crumb oat crumble biscuit crumb soil spiced biscuit biscoff speculoos', form: 'scatter', cook: 'baked', role: 'garnish', g: 20, w: 56, h: 36, side: side('pile', 4, '#C98A4A'),
    draw: function (P, rnd) { return crumbBits(P, rnd, 26, 25, 15, ['#C98A4A', '#D9A55A', '#B9772E', '#E6C27A']) + P.scatter(rnd, 6, 22, 13, function (x, y, i, q) { return P.ellipse(x, y, 2.2, 1.2, '#EBD9A8', '#C9B07A', 0.3, { transform: rot(P, q() * 180, x, y) }); }); } });
  add({ id: 'anzac-biscuit', name: 'Anzac biscuit', sub: 'Small sweets', kw: 'cookie biscuit anzac oat golden syrup bikkie', form: 'piece', cook: 'baked', role: 'dside', n: 1, w: 48, h: 46, side: side('disc', 6, '#C98A3A'),
    draw: function (P, rnd) {
      var d = P.blob(rnd, 23, 22, 0.05, 14), out = P.shadow(d) + P.path(d, '#B9772E', '#8A5220', 1) + P.path(P.blob(rnd, 19, 18, 0.06, 12), '#D49A4A', null, 0);
      for (var i = 0; i < 6; i++) { var a = rnd() * Math.PI * 2, r0 = rnd() * 8; out += P.path('M' + P.n(Math.cos(a) * r0) + ' ' + P.n(Math.sin(a) * r0) + ' l' + P.n(Math.cos(a) * 6) + ' ' + P.n(Math.sin(a) * 6 + rnd() * 2) + ' l' + P.n(rnd() * 4) + ' ' + P.n(rnd() * 4 - 2), 'none', '#9A5E24', 0.8, { 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }); }
      out += P.scatter(rnd, 14, 17, 16, function (x, y, i, q) { return P.ellipse(x, y, 1.8, 0.9, '#E8C27A', '#B98A4E', 0.3, { transform: rot(P, q() * 180, x, y) }); });
      return out + P.hl(-7, -9, 7, 1.6, '#FFFFFF', 0.3, -25);
    } });
  add({ id: 'choc-chip-cookie', name: 'Chocolate chip cookie', sub: 'Small sweets', kw: 'chocolate chip cookie choc chip biscuit', form: 'piece', cook: 'baked', role: 'dside', n: 1, w: 52, h: 50, side: side('disc', 8, '#D9A55A'),
    draw: function (P, rnd) {
      var d = P.blob(rnd, 25, 24, 0.08, 14), out = P.shadow(d) + P.path(d, '#C98A3E', '#9A6226', 1) + P.path(P.blob(rnd, 21, 20, 0.1, 12), '#E0AE62', null, 0);
      out += P.path(P.blob(rnd, 10, 8, 0.25, 9, 3, 2), '#ECC27A', null, 0, { opacity: '0.7' });
      for (var i = 0; i < 4; i++) { var a = rnd() * Math.PI * 2; out += P.path('M' + P.n(Math.cos(a) * 6) + ' ' + P.n(Math.sin(a) * 6) + ' Q' + P.n(Math.cos(a + 0.4) * 12) + ' ' + P.n(Math.sin(a + 0.4) * 12) + ' ' + P.n(Math.cos(a) * 17) + ' ' + P.n(Math.sin(a) * 17), 'none', '#B9802F', 0.8); }
      out += P.scatter(rnd, 9, 17, 16, function (x, y, i, q) { return P.path(P.blob(q, 2.6, 2.1, 0.25, 6, x, y), '#3A1E10', '#22100A', 0.4) + P.circle(x - 0.8, y - 0.8, 0.6, '#FFFFFF', null, 0, { opacity: '0.35' }); }, 7);
      return out;
    } });
  add({ id: 'cookie-skillet', name: 'Cookie skillet with ice cream', sub: 'Small sweets', kw: 'cookie skillet pan cookie skillet cookie ice cream warm', form: 'whole', cook: 'baked', role: 'dessert', n: 1, w: 140, h: 100, side: side('cup', 24, '#D9A55A'),
    draw: function (P, rnd) {
      var R = 50, out = P.circle(4, 5, R, '#000000', null, 0, { opacity: '0.14' }) + P.rect(R - 6, -8, 46, 16, 7, '#2E3034', '#202225', 1) + P.circle(R + 32, 0, 3.4, '#4A4E53') + P.circle(0, 0, R, '#3A3D41', '#202225', 1.6) + P.circle(0, 0, R * 0.9, '#4A4E53', null, 0);
      out += P.path(P.blob(rnd, R * 0.86, R * 0.86, 0.02, 14), '#C98A3E', '#9A6226', 0.8) + P.path(P.blob(rnd, R * 0.72, R * 0.72, 0.05, 12), '#E0AE62', null, 0);
      out += P.scatter(rnd, 16, R * 0.7, R * 0.7, function (x, y, i, q) { return P.path(P.blob(q, 2.8, 2.2, 0.25, 6, x, y), '#3A1E10', '#22100A', 0.4); }, 9);
      out += P.path(P.blob(rnd, 18, 15, 0.15, 10, 4, 4), '#F6EBC8', null, 0, { opacity: '0.8' }) + scoopBody(P, rnd, { c: '#F6EBC8', fleck: 'vanilla' }, 15);
      out += P.path('M-30 -10 Q-18 -22 -6 -12 T20 -14 Q30 -4 22 14', 'none', '#4A2416', 2, { 'stroke-linecap': 'round' });
      return P.g(P.at(-20, 0), out);
    } });
  add({ id: 'donut-iced', name: 'Donut, iced with sprinkles', sub: 'Small sweets', kw: 'donut doughnut iced pink sprinkles hundreds and thousands', form: 'ring', cook: 'fried', role: 'dessert', n: 1, w: 56, h: 56, side: side('ring', 18, '#E2A050'),
    draw: function (P, rnd) {
      var d = P.ringD(rnd, 27, 8, 0.03), out = P.shadow(d) + P.path(d, '#D9984A', '#A8682A', 1, { 'fill-rule': 'evenodd' });
      var ice = [];
      for (var i = 0; i < 18; i++) { var a = i / 18 * Math.PI * 2, r = 22 + (i % 2 ? 2.6 : 0) + rnd() * 1.4; ice.push([Math.cos(a) * r, Math.sin(a) * r]); }
      out += P.path(P.smooth(ice) + ' ' + P.blob(rnd, 11, 11, 0.04, 10), '#F2A6C0', '#D9809E', 0.8, { 'fill-rule': 'evenodd' });
      var cols = ['#F2D04A', '#5D9ED9', '#7EC07A', '#FFFFFF', '#E05A3F', '#B98AD9'];
      for (var k = 0; k < 34; k++) { var b = rnd() * Math.PI * 2, rr = 13 + rnd() * 9, x = Math.cos(b) * rr, y = Math.sin(b) * rr; out += P.rect(x - 1.4, y - 0.45, 2.8, 0.9, 0.45, cols[k % cols.length], null, 0, { transform: rot(P, rnd() * 180, x, y) }); }
      return out + P.hl(-12, -14, 7, 2, '#FFFFFF', 0.5, -40);
    } });
  add({ id: 'donut-sugared', name: 'Donut, cinnamon sugar', sub: 'Small sweets', kw: 'donut doughnut cinnamon sugar jam donut', form: 'ring', cook: 'fried', role: 'dessert', n: 1, w: 56, h: 56, of: 'donut-iced', side: side('ring', 18, '#D9984A'),
    draw: function (P, rnd) {
      var d = P.ringD(rnd, 27, 8, 0.03), out = P.shadow(d) + P.path(d, '#D9984A', '#A8682A', 1, { 'fill-rule': 'evenodd' });
      out += P.path(P.blob(rnd, 22, 22, 0.04, 12) + ' ' + P.blob(rnd, 12, 12, 0.04, 10), '#E8B468', null, 0, { 'fill-rule': 'evenodd', opacity: '0.8' });
      out += P.scatter(rnd, 110, 24, 24, function (x, y, i, q) { var r = Math.hypot(x, y); return r < 10 ? '' : P.circle(x, y, 0.45 + q() * 0.4, i % 4 ? '#FFF8E8' : '#9A5A2A', null, 0, { opacity: '0.9' }); });
      return out + P.hl(-12, -14, 7, 2, '#FFFFFF', 0.4, -40);
    } });
  add({ id: 'churros', name: 'Churros', sub: 'Small sweets', kw: 'churros churro cinnamon sugar fried dough sticks', form: 'stick', cook: 'fried', role: 'dessert', n: 4, w: 90, h: 46, side: side('stick', 10, '#D9A24E'),
    draw: function (P, rnd) {
      var out = '';
      [[-2, -14, -6], [2, -4, 4], [-3, 6, -2], [3, 16, 8]].forEach(function (c) {
        var l = 78 + rnd() * 6, d = 'M' + P.n(-l / 2) + ' -4.5 Q' + P.n(-l / 2 - 3) + ' 0 ' + P.n(-l / 2) + ' 4.5 L' + P.n(l / 2) + ' 4.5 Q' + P.n(l / 2 + 3) + ' 0 ' + P.n(l / 2) + ' -4.5 Z';
        var s = P.shadow(d) + P.path(d, '#C98A3A', '#8E5A22', 0.9) + P.path('M' + P.n(-l / 2 + 2) + ' -2 H' + P.n(l / 2 - 2) + ' M' + P.n(-l / 2 + 2) + ' 1.6 H' + P.n(l / 2 - 2), 'none', '#E0AE62', 1.2) + P.path('M' + P.n(-l / 2 + 2) + ' 0 H' + P.n(l / 2 - 2), 'none', '#A8682A', 0.6);
        s += P.scatter(rnd, 26, l / 2 - 3, 3.5, function (x, y) { return P.circle(x, y, 0.45, '#FFF4DE', null, 0, { opacity: '0.9' }); });
        out += P.g(P.at(c[0], c[1], c[2]), s);
      });
      return out;
    } });
  add({ id: 'loukoumades', name: 'Loukoumades', sub: 'Small sweets', kw: 'loukoumades loukoumathes honey puffs greek donuts honey balls walnuts cinnamon', form: 'cluster', cook: 'fried', role: 'dessert', n: 8, w: 62, h: 50, side: side('pile', 16, '#D9A24E'),
    draw: function (P, rnd) {
      var out = syrup(P, rnd, 29, 23, '#E0A030');
      out += P.pile(rnd, 8, 20, 14, function (x, y, i, q) { return ball(P, x, y, 7 + q(), '#D49A40', 0.6); });
      out += crumbBits(P, rnd, 12, 20, 14, ['#B98A5A', '#E6CFA0'], 0.6) + P.scatter(rnd, 30, 22, 16, function (x, y) { return P.circle(x, y, 0.4, '#7A4A2A', null, 0, { opacity: '0.8' }); });
      return out;
    } });
  add({ id: 'gulab-jamun', name: 'Gulab jamun', sub: 'Small sweets', kw: 'gulab jamun indian syrup balls rose cardamom', form: 'cluster', cook: 'fried', role: 'dessert', n: 3, w: 60, h: 50, side: side('pile', 18, '#7A3A1E'),
    draw: function (P, rnd) {
      var out = syrup(P, rnd, 29, 24, '#D99A3A');
      [[-11, -6], [11, -5], [0, 10]].forEach(function (p) { out += ball(P, p[0], p[1], 10.5, '#7A3A1E', 0.7) + P.hl(p[0] + 4, p[1] + 4, 2, 1, '#FFFFFF', 0.3); });
      return out + P.scatter(rnd, 8, 16, 12, function (x, y, i, q) { return P.ellipse(x, y, 1.8, 0.6, '#9CB45A', '#6E8A3A', 0.3, { transform: rot(P, q() * 180, x, y) }); });
    } });
  add({ id: 'fried-choc-biscuits', name: 'Deep-fried chocolate sandwich biscuits', sub: 'Small sweets', kw: 'deep fried oreos fried oreo battered chocolate biscuits', form: 'cluster', cook: 'battered', role: 'dessert', n: 4, w: 60, h: 50, side: side('pile', 16, '#D9A24E'),
    draw: function (P, rnd) {
      var out = '';
      P.spots(rnd, 4, 15, 11, 14).forEach(function (p, i) {
        var d = P.blob(rnd, 11, 10, 0.12, 10, p[0], p[1]);
        out += P.shadow(d) + P.path(d, '#D9A24E', '#A8742E', 0.9) + P.path(P.blob(rnd, 8, 7, 0.15, 9, p[0] - 1, p[1] - 1), '#E8BC6A', null, 0);
        if (i % 2 === 0) out += P.path(P.blob(rnd, 6, 1.7, 0.2, 8, p[0] + 1, p[1] + 3, -20), '#2A1E1A', null, 0) + P.line(p[0] - 3, p[1] + 4.6, p[0] + 4, p[1] + 2.2, '#F4EEE0', 0.7);
      });
      return out + dust(P, rnd, 70, 24, 19);
    } });
  add({ id: 'macarons', name: 'Macarons', sub: 'Small sweets', kw: 'macarons macaroons french macaron pastel', form: 'cluster', cook: 'baked', role: 'dside', n: 3, w: 62, h: 28, side: side('disc', 12, '#F2B8C6'),
    draw: function (P, rnd) {
      var out = '';
      [['#F2B8C6', -21], ['#C9DCA0', 0], ['#F4DE8A', 21]].forEach(function (m) {
        var x = m[1], c = m[0], foot = P.blob(rnd, 10.6, 10.4, 0.07, 18, x, 0);
        out += P.shadow(foot, 1, 1.5) + P.path(foot, P.shade(c, -0.08), edge(P, c, -0.25), 0.6) + P.circle(x, 0, 9, c, edge(P, c, -0.18), 0.7) + P.circle(x - 1, -1, 6.4, P.shade(c, 0.15), null, 0, { opacity: '0.7' }) + P.hl(x - 3.4, -4, 3, 1.2, '#FFFFFF', 0.6, -30);
      });
      return out;
    } });
  add({ id: 'turkish-delight', name: 'Turkish delight cubes', sub: 'Small sweets', kw: 'turkish delight lokum rose pistachio cubes', form: 'scatter', cook: 'fresh', role: 'dside', n: 5, w: 50, h: 40, side: side('pile', 10, '#E890A8'),
    draw: function (P, rnd) {
      return P.scatter(rnd, 5, 17, 12, function (x, y, i, q) {
        var c = i % 3 ? '#E890A8' : '#F4F0E4';
        return put(P, x, y, q() * 60 - 30, 1, cube(P, 13, c) + dust(P, q, 16, 6, 6));
      }, 12);
    } });
  add({ id: 'chocolate-truffles', name: 'Chocolate truffles', sub: 'Small sweets', kw: 'truffles chocolate truffles cocoa petit fours bonbons', form: 'cluster', cook: 'fresh', role: 'dside', n: 4, w: 44, h: 34, side: side('pile', 12, '#4A2416'),
    draw: function (P, rnd) {
      var out = '';
      [[-11, -6, '#5A2E1A'], [10, -7, '#4A2416'], [-6, 8, '#7A4A2A'], [12, 8, '#F2E6CC']].forEach(function (t, i) {
        out += ball(P, t[0], t[1], 7, t[2], 0.3);
        if (i === 0) out += P.scatter(rnd, 16, 5, 5, function (x, y) { return P.circle(t[0] + x, t[1] + y, 0.45, '#8A5A3A'); });
        if (i === 2) out += P.scatter(rnd, 10, 5, 5, function (x, y, k, q) { return P.path(P.blob(q, 1, 0.7, 0.3, 5, t[0] + x, t[1] + y), '#7E9A3E'); });
      });
      return out;
    } });
  add({ id: 'fairy-floss', name: 'Fairy floss', sub: 'Small sweets', kw: 'fairy floss cotton candy candy floss pink', form: 'cluster', cook: 'fresh', role: 'dside', g: 10, w: 56, h: 44, side: side('mound', 24, '#F6C6D8'),
    draw: function (P, rnd) {
      var out = '';
      P.spots(rnd, 14, 18, 12, 4).forEach(function (p, i) { out += P.circle(p[0], p[1], 7 + rnd() * 5, i % 3 ? '#F6C6D8' : '#F9D8E4', null, 0, { opacity: '0.85' }); });
      for (var i = 0; i < 12; i++) { var a = rnd() * Math.PI * 2, r = 10 + rnd() * 10; out += P.path('M' + P.n(Math.cos(a) * r * 0.5) + ' ' + P.n(Math.sin(a) * r * 0.4) + ' Q' + P.n(Math.cos(a + 0.6) * r) + ' ' + P.n(Math.sin(a + 0.6) * r * 0.8) + ' ' + P.n(Math.cos(a + 1.1) * r * 1.1) + ' ' + P.n(Math.sin(a + 1.1) * r * 0.9), 'none', '#E89AB8', 0.6, { opacity: '0.8' }); }
      return out + P.hl(-8, -8, 8, 3, '#FFFFFF', 0.45, -20);
    } });

  // donut fries (the book's own): golden fingers with a dashed crease, cinnamon sugar over them
  function donutFry(P) { return P.rect(-27, -6.5, 54, 13, 6.5, '#D59E4C', '#B8822F', 1) + P.path('M-22 0 h44', 'none', '#B8822F', 1.2, { 'stroke-dasharray': '3 3' }); }
  add({ id: 'donut-fries', name: 'Donut fries', sub: 'Small sweets', kw: 'donut fries doughnut fries funnel fries fried dough cinnamon sugar', form: 'pile', cook: 'fried', role: 'dessert', g: 110, w: 100, h: 88, side: side('pile', 16, '#D59E4C'),
    draw: function (P, rnd) {
      var out = P.pile(rnd, 13, 24, 20, function (x, y, i, q) { return P.g(P.at(x, y, q() * 180), donutFry(P)); }), cols = ['#FFFFFF', '#F6E7C8', '#8B5A2B'];
      return out + P.scatter(rnd, 50, 30, 26, function (x, y, i) { return P.circle(x, y, 0.9, cols[i % 3]); });
    } });
  L.add('sweet', sweetItems);
  // the helpers other files or "Draw it for me" may use
  L.SWEET = {
    strawberry: strawberry, strawberryHalf: strawberryHalf, blueberry: blueberry, raspberry: raspberry, bananaSlice: bananaSlice, appleSlice: appleSlice, kiwiSlice: kiwiSlice, orangeSlice: orangeSlice,
    passionHalf: passionHalf, figHalf: figHalf, grape: grape, cube: cube, meringuePeak: meringuePeak, rosette: rosette, ball: ball, syrup: syrup, dust: dust, crumbBits: crumbBits,
    wedge: wedge, bar: bar, tartRound: tartRound, ramekin: ramekin, glass: glass, scoop: scoop, scoopBody: scoopBody, quenelle: quenelle, flecks: flecks
  };
})();
