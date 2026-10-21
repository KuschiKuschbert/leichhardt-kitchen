/* The drawing library: herbs and garnishes (see js/library.js for the fields). Drawn around 0,0, 1 unit is about 1.5 mm. */
(function () {
  'use strict';
  var L = window.LK_LIB, P = L.P, n = P.n, PI = Math.PI;

  /* ---------- shared bits ---------- */
  function ed(c, f) { return P.shade(c, f === undefined ? -0.28 : f); }
  function pick(q, list) { return list[Math.min(list.length - 1, Math.floor(q() * list.length))]; }
  function tr(x, y) { return 'translate(' + n(x) + ' ' + n(y) + ')'; }
  function rot(a, x, y) { return 'rotate(' + n(a) + ' ' + n(x) + ' ' + n(y) + ')'; }
  // the soft shadow of a path drawn under a transform, always cast down and to the right
  function sh(d, tf, dx, dy) { return P.path(d, '#000000', null, 0, { opacity: '0.12', transform: tr(dx === undefined ? 0.8 : dx, dy === undefined ? 1.1 : dy) + (tf ? ' ' + tf : '') }); }
  // pieces spread evenly over an ellipse, centred, drawn back to front
  function heap(q, count, rx, ry, fn) {
    var pts = P.spots(q, count, rx, ry), mx = 0, my = 0;
    pts.forEach(function (p) { mx += p[0] / pts.length; my += p[1] / pts.length; });
    return pts.map(function (p, i) { return fn(p[0] - mx, p[1] - my, i, q); }).join('');
  }
  function stem(pts, col, w) { return P.path(P.smooth(pts, true), 'none', col, w, { 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }); }

  /* ---------- scatters, dusts and seeds ---------- */
  // a tiny irregular flake (dried herbs, chilli flakes, crumbs)
  function flakeAt(q, x, y, s, col) {
    var a = q() * 2 * PI, k = q() < 0.5 ? 3 : 4, d = '';
    for (var i = 0; i < k; i++) { var b = a + i / k * 2 * PI + (q() - 0.5) * 0.8, r = s * (0.6 + q() * 0.6); d += (i ? ' L' : 'M') + n(x + Math.cos(b) * r) + ' ' + n(y + Math.sin(b) * r); }
    return P.path(d + ' Z', col);
  }
  // a loose scatter of flakes over an ellipse (heavier in the middle when dense is set)
  function flakes(q, count, rx, ry, cols, s, dense) { var f = function (x, y, i, qq) { return flakeAt(qq, x, y, s * (0.6 + qq() * 0.8), pick(qq, cols)); }; return dense ? P.pile(q, count, rx, ry, f) : P.scatter(q, count, rx, ry, f); }
  // fine dust: little dots, heavier in the middle
  function dust(q, count, rx, ry, cols, r) { return P.pile(q, count, rx, ry, function (x, y, i, qq) { return P.circle(x, y, r * (0.5 + qq() * 0.8), pick(qq, cols)); }); }
  // a seed: a teardrop, round at -len/2, pointed at +len/2
  function seedD(len, wid) { var l = len / 2, w = wid / 2; return 'M' + n(-l) + ' 0 Q' + n(-l) + ' ' + n(-w) + ' 0 ' + n(-w) + ' Q' + n(l * 0.8) + ' ' + n(-w * 0.6) + ' ' + n(l) + ' 0 Q' + n(l * 0.8) + ' ' + n(w * 0.6) + ' 0 ' + n(w) + ' Q' + n(-l) + ' ' + n(w) + ' ' + n(-l) + ' 0 Z'; }
  function seedAt(x, y, a, len, wid, col, edgeCol, sw) { return P.path(seedD(len, wid), col, edgeCol || ed(col), sw || 0.3, { transform: P.at(x, y, a) }); }
  function seeds(q, count, rx, ry, len, wid, cols, o) {
    o = o || {};
    return P.scatter(q, count, rx, ry, function (x, y, i, qq) { var c = pick(qq, cols); return seedAt(x, y, qq() * 360, len * (0.85 + qq() * 0.3), wid, c, o.edge || ed(c, -0.3), o.sw) + (o.hl ? P.circle(x - 0.2, y - 0.2, wid * 0.18, '#FFFFFF', null, 0, { opacity: '0.5' }) : ''); });
  }
  // a small irregular nut or crumb piece with a lighter middle
  function bitAt(q, x, y, s, col, inner) {
    var d = P.blob(q, s, s * (0.65 + q() * 0.3), 0.25, 6, x, y, q() * 180);
    return P.path(d, '#000000', null, 0, { opacity: '0.12', transform: tr(0.5, 0.7) }) + P.path(d, col, ed(col), 0.4) + (inner ? P.circle(x - s * 0.15, y - s * 0.15, s * 0.4, inner, null, 0, { opacity: '0.85' }) : '');
  }

  /* ---------- herbs ---------- */
  // a flat parsley or coriander leaflet along +x from its base: three toothed lobes
  function leafletD(s, round) {
    var r = round ? 0.12 : 0;
    return P.smooth([[0, 0], [s * 0.33, -s * (0.3 + r)], [s * 0.5, -s * (0.56 + r)], [s * 0.7, -s * 0.34], [s * 0.9, -s * (0.44 + r)], [s * 1.04, -s * 0.12], [s * 1.06, s * 0.14], [s * 0.88, s * (0.44 + r)], [s * 0.68, s * 0.34], [s * 0.5, s * (0.56 + r)], [s * 0.33, s * (0.3 + r)]]);
  }
  function leaflet(x, y, a, s, col, round) {
    var tf = P.at(x, y, a), d = leafletD(s, round);
    return sh(d, tf, 0.5, 0.7) + P.g(tf, P.path(d, col, ed(col, -0.3), 0.5) + P.path('M0 0 L' + n(s * 0.85) + ' 0 M' + n(s * 0.3) + ' 0 L' + n(s * 0.55) + ' ' + n(-s * 0.4) + ' M' + n(s * 0.3) + ' 0 L' + n(s * 0.55) + ' ' + n(s * 0.4), 'none', P.shade(col, 0.3), 0.4));
  }
  function parsleySprig(q, x, y, a, s) {
    var c = '#3F7F2A', st = '#6E9A3E', out = stem([[-12, 7], [-8, 4.5], [-4, 2]], st, 1) + stem([[-4, 2], [0, -1], [3, -3]], st, 0.8) + stem([[-4, 2], [1, 3], [5, 4]], st, 0.8) + stem([[-6, 3.4], [-6, 0], [-4, -4]], st, 0.7);
    out += leaflet(-6, 3, -150, 5.5, '#4A8A32') + leaflet(-4, -4, -105, 7.5, c) + leaflet(5, 4, 22, 8, c) + leaflet(3, -3, -42, 8.5, c) + leaflet(-1, 0.5, -15, 6, '#4A8A32');
    return P.g(P.at(x, y, a, s), out);
  }
  function corianderSprig(q, x, y, a, s) {
    var c = '#4FA03A', st = '#8DB255', out = stem([[-14, 6], [-6, 3], [2, -1]], st, 0.8) + stem([[-6, 3], [-3, 7], [1, 9]], st, 0.6) + stem([[2, -1], [6, -4], [8, -7]], st, 0.6) + stem([[2, -1], [6, 0], [10, 1]], st, 0.6);
    out += leaflet(-2, 6, 70, 5.5, '#5EAE44', true) + leaflet(1, 9, 30, 7, c, true) + leaflet(8, -7, -60, 7.5, c, true) + leaflet(10, 1, 0, 7.5, c, true) + leaflet(4, -2, -25, 6, '#5EAE44', true);
    return P.g(P.at(x, y, a, s), out);
  }
  // a smooth pointed leaf (basil, lemon myrtle), along x from its stalk end
  function ovateD(l, w) { return P.smooth([[-l / 2, 0], [-l * 0.38, -w * 0.42], [-l * 0.05, -w * 0.55], [l * 0.3, -w * 0.38], [l * 0.53, 0], [l * 0.3, w * 0.38], [-l * 0.05, w * 0.55], [-l * 0.38, w * 0.42]]); }
  function ovateAt(x, y, a, l, w, col, o) {
    o = o || {};
    var tf = P.at(x, y, a), d = o.d || ovateD(l, w), vc = o.vc || P.shade(col, 0.35);
    var b = P.path(d, col, ed(col, -0.3), 0.6) + P.path('M' + n(-l / 2 - (o.stalk || 0)) + ' 0 Q0 ' + n(w * 0.04) + ' ' + n(l * 0.42) + ' 0', 'none', vc, 0.6, { 'stroke-linecap': 'round' });
    for (var i = 1; i <= (o.veins === undefined ? 3 : o.veins); i++) { var vx = -l / 2 + l * i / 4.2; b += P.path('M' + n(vx) + ' 0 Q' + n(vx + l * 0.08) + ' ' + n(-w * 0.2) + ' ' + n(vx + l * 0.17) + ' ' + n(-w * 0.34) + ' M' + n(vx) + ' 0 Q' + n(vx + l * 0.08) + ' ' + n(w * 0.2) + ' ' + n(vx + l * 0.17) + ' ' + n(w * 0.34), 'none', vc, 0.4, { opacity: '0.8' }); }
    return sh(d, tf) + P.g(tf, b + P.hl(-l * 0.05, -w * 0.2, l * 0.22, w * 0.08, '#FFFFFF', o.shine || 0.3));
  }
  // a serrated leaf (mint): the edge a run of small teeth, narrowing to the tip
  function serratedD(l, w) {
    var d = '', k = 26;
    for (var i = 0; i < k; i++) { var a = PI + i / k * 2 * PI, c = Math.cos(a), s = Math.sin(a), t = 1 - 0.3 * (c + 1) / 2, j = i % 2 ? 0.9 : 1; d += (i ? ' L' : 'M') + n(c * l / 2 * (c > 0.85 ? 1 : j)) + ' ' + n(s * w / 2 * t * j); }
    return d + ' Z';
  }
  function dillFrond(q, x, y, a, len) {
    var col = '#5E9A3A', out = stem([[-len / 2, 1], [0, -0.6], [len / 2, 0]], '#6E9A3E', 0.7);
    for (var i = 0; i < 6; i++) {
      var t = -len / 2 + 3 + i * (len - 4) / 6, sd = i % 2 ? 1 : -1, bl = 9 - i * 0.8, bx = t + bl * 0.6, by = sd * bl * 0.8;
      out += P.line(t, 0, bx, by, col, 0.5);
      for (var j = 1; j <= 4; j++) { var px = t + (bx - t) * j / 4.3, py = by * j / 4.3, nl = 3.6 - j * 0.4; out += P.line(px, py, px + nl * 0.8, py - nl * 0.6 * sd + sd * 0.3, col, 0.4) + P.line(px, py, px + nl * 0.3, py + nl * sd, col, 0.4) + P.line(px, py, px - nl * 0.5, py + nl * 0.7 * sd, col, 0.4); }
    }
    for (var k = 0; k < 3; k++) out += P.line(len / 2, 0, len / 2 + 3, (k - 1) * 1.6, col, 0.4);
    return P.g(P.at(x, y, a), out);
  }
  function rosemarySprig(q, x, y, a, len) {
    var out = stem([[-len / 2, 0.5], [0, -0.6], [len / 2, 0]], '#7A6E4A', 1.2);
    for (var t = -len / 2 + 2.5; t < len / 2 - 1; t += 2.4) {
      var k = (t + len / 2) / len, nl = 8 - k * 3.5;
      [-1, 1].forEach(function (sd) { var ang = sd * (48 + q() * 16), ar = ang * PI / 180; out += P.g(P.at(t + Math.cos(ar) * nl / 2, Math.sin(ar) * nl / 2, ang), P.path(P.leafD(nl, 1.8), '#3E5E3A', '#2A4228', 0.3) + P.line(-nl / 2 + 0.8, 0, nl / 2 - 1, 0, '#9AAE8A', 0.4)); });
    }
    return P.g(P.at(x, y, a), P.path(P.smooth([[-len / 2, 2], [0, 1.4], [len / 2, 1.8]], true), 'none', '#000000', 6, { opacity: '0.08' }) + out);
  }
  function thymeSprig(q, x, y, a, len) {
    var out = stem([[-len / 2, 0.6], [0, -0.4], [len / 2, 0]], '#7A6A4A', 0.7);
    [[-len * 0.15, -1], [len * 0.12, 1]].forEach(function (b) { out += P.line(b[0], 0, b[0] + 7, b[1] * 5, '#7A6A4A', 0.5); for (var u = 1; u <= 2; u++) { var px = b[0] + 7 * u / 2.4, py = b[1] * 5 * u / 2.4; out += P.ellipse(px - 0.9, py - 0.8, 1.3, 0.75, '#7E9466', '#56704A', 0.25) + P.ellipse(px + 0.9, py + 0.8, 1.3, 0.75, '#8AA070', '#56704A', 0.25); } });
    for (var t = -len / 2 + 3, sd = 1; t < len / 2; t += 3.4, sd = -sd) out += P.ellipse(t, -sd * 1.4, 1.4, 0.8, '#7E9466', '#56704A', 0.25, { transform: rot(-sd * 30, t, -sd * 1.4) }) + P.ellipse(t + 0.6, sd * 1.4, 1.3, 0.75, '#8AA070', '#56704A', 0.25, { transform: rot(sd * 30, t + 0.6, sd * 1.4) });
    return P.g(P.at(x, y, a), out);
  }
  function mintTip(q, x, y, a, s) {
    var out = stem([[0, 14], [0, 4], [0, -10]], '#6E8A44', 1), c = '#4F9A3A';
    [[0, 6, 1, 15, 10], [0, -3, -1, 12, 8], [0, -10, 1, 7, 5]].forEach(function (p, i) {
      [-1, 1].forEach(function (sd) { var ang = -90 + sd * (i === 2 ? 30 : 62), ar = ang * PI / 180, l = p[3], w = p[4], d = serratedD(l, w), tf = P.at(p[0] + Math.cos(ar) * l / 2, p[1] + Math.sin(ar) * l / 2, ang); out += sh(d, tf, 0.6, 0.8) + P.g(tf, P.path(d, sd > 0 ? c : '#5EA444', '#2E6A24', 0.5) + P.line(-l / 2, 0, l * 0.4, 0, '#2E6A24', 0.5) + P.line(-l * 0.15, 0, l * 0.05, -w * 0.32, '#3A7A2A', 0.4) + P.line(-l * 0.15, 0, l * 0.05, w * 0.32, '#3A7A2A', 0.4) + P.line(l * 0.1, 0, l * 0.28, -w * 0.25, '#3A7A2A', 0.4) + P.line(l * 0.1, 0, l * 0.28, w * 0.25, '#3A7A2A', 0.4)); });
    });
    return P.g(P.at(x, y, a, s), out);
  }
  function seedlingAt(q, x, y, a, col) {
    var ar = a * PI / 180, ex = x + Math.cos(ar) * 4, ey = y + Math.sin(ar) * 4;
    return P.line(x, y, ex, ey, '#D6E2B0', 0.6) + P.g(P.at(ex, ey, a), P.ellipse(1, -1.6, 2.2, 1.2, col, ed(col), 0.3, { transform: 'rotate(-40 1 -1.6)' }) + P.ellipse(1, 1.6, 2.2, 1.2, col, ed(col), 0.3, { transform: 'rotate(40 1 1.6)' }));
  }
  function curlAt(q, x, y, col, s) {
    var pts = [], turns = 1.2 + q() * 0.6, a0 = q() * 2 * PI;
    for (var i = 0; i <= 14; i++) { var t = i / 14, a = a0 + t * turns * 2 * PI, r = (1.2 + t * 5) * s; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
    var d = P.smooth(pts, true);
    return P.path(d, 'none', ed(col, -0.25), 1.8 * s, { 'stroke-linecap': 'round' }) + P.path(d, 'none', col, 1.1 * s, { 'stroke-linecap': 'round' });
  }

  /* ---------- flowers ---------- */
  function violaAt(q, x, y, r, a, cols) {
    cols = cols || ['#4A2E7A', '#8A6AC0', '#D6CAF0'];
    var tf = P.at(x, y, a), b = '';
    [-1, 1].forEach(function (s) { b += P.ellipse(s * r * 0.32, -r * 0.42, r * 0.42, r * 0.55, cols[0], ed(cols[0], -0.3), 0.5, { transform: rot(s * 22, s * r * 0.32, -r * 0.42) }); });
    [-1, 1].forEach(function (s) { b += P.ellipse(s * r * 0.52, r * 0.12, r * 0.42, r * 0.32, cols[1], ed(cols[1], -0.3), 0.5, { transform: rot(s * 20, s * r * 0.52, r * 0.12) }); });
    b += P.ellipse(0, r * 0.45, r * 0.5, r * 0.42, cols[2], ed(cols[1], -0.2), 0.5);
    [-0.18, 0, 0.18].forEach(function (k) { b += P.line(0, r * 0.18, k * r, r * 0.62, '#3A2460', 0.4); });
    return P.circle(x + 0.8, y + 1.1, r * 0.85, '#000000', null, 0, { opacity: '0.1' }) + P.g(tf, b + P.circle(0, r * 0.12, r * 0.15, '#F2C94C', '#C99A22', 0.3));
  }
  function petalAt(x, y, a, col, l, w) { var d = P.smooth([[0, 0], [l * 0.3, -w * 0.5], [l * 0.85, -w * 0.45], [l, 0], [l * 0.85, w * 0.45], [l * 0.3, w * 0.5]]); return P.path(d, col, ed(col, -0.22), 0.4, { transform: P.at(x, y, a) }); }
  function lavenderSprig(q, x, y, a, len) {
    var out = stem([[-len / 2, 0.4], [-len * 0.1, -0.3], [len * 0.2, 0]], '#7E8E6A', 0.8);
    for (var t = len * 0.12; t < len / 2; t += 2.4) { var w = 2.6 - (t - len * 0.12) / len * 2.6; [-1, 1].forEach(function (s) { out += P.ellipse(t, s * w * 0.6, 1.5, 1.1, s > 0 ? '#8A6AB5' : '#6E4E9E', '#4E3478', 0.3); }); out += P.ellipse(t + 1.2, 0, 1.4, 1, '#9E80C8', '#4E3478', 0.3); }
    return P.g(P.at(x, y, a), out);
  }

  /* ---------- citrus ---------- */
  var CIT = {
    lemon: { rind: '#F2CB55', edge: '#C99A22', pith: '#FBF3D6', flesh: '#F6DE72', ves: '#EFC94A', seed: '#F4ECC8' },
    lime: { rind: '#5E9A3A', edge: '#3F6E26', pith: '#E8F0C8', flesh: '#BCD66E', ves: '#9CC055', seed: '#E8EEC8' },
    orange: { rind: '#F29A2E', edge: '#C26A14', pith: '#FCEBD2', flesh: '#F6B04A', ves: '#E8922A', seed: '#FBEBCF' }
  };
  // a wedge lying on its side: the cut core along the top, the rind along the curve below
  function wedgeD(l, h, sx, sy) { sx = sx || 1; sy = sy || 1; var a = -h * 0.3, x = l / 2 * sx; return 'M' + n(-x) + ' ' + n(a) + ' Q0 ' + n(a - h * 0.22) + ' ' + n(x) + ' ' + n(a) + ' Q0 ' + n(a + h * 1.6 * sy) + ' ' + n(-x) + ' ' + n(a) + ' Z'; }
  function citrusWedge(kind, l, h) {
    var k = CIT[kind] || CIT.lemon;
    return function (P) {
      var d = wedgeD(l, h), out = P.shadow(d, 1.6, 2) + P.path(d, k.rind, k.edge, 0.9) + P.path(wedgeD(l, h, 0.9, 0.86), k.pith, null, 0) + P.path(wedgeD(l, h, 0.84, 0.72), k.flesh, null, 0);
      for (var i = -4; i <= 4; i++) { var tx = i * l * 0.085; out += P.path('M' + n(tx * 0.6) + ' ' + n(-h * 0.3) + ' Q' + n(tx * 1.05) + ' ' + n(h * 0.0) + ' ' + n(tx * 1.15) + ' ' + n(h * 0.28 - Math.abs(i) * h * 0.04), 'none', k.ves, 0.6, { 'stroke-linecap': 'round' }); }
      out += P.ellipse(-l * 0.12, h * 0.02, l * 0.04, h * 0.07, k.seed, ed(k.seed, -0.2), 0.3) + P.path('M' + n(-l * 0.42) + ' ' + n(h * 0.02) + ' Q0 ' + n(h * 0.62) + ' ' + n(l * 0.42) + ' ' + n(h * 0.02), 'none', '#FFFFFF', 0.9, { opacity: '0.35' });
      return out + P.hl(-l * 0.15, -h * 0.28, l * 0.2, h * 0.05, '#FFFFFF', 0.5);
    };
  }
  function citrusSliceAt(kind, x, y, r, a) {
    var k = CIT[kind] || CIT.lemon, segs = 9, out = P.circle(x + 1.2, y + 1.6, r, '#000000', null, 0, { opacity: '0.12' }) + P.circle(x, y, r, k.rind, k.edge, 0.9) + P.circle(x, y, r * 0.88, k.pith) + P.circle(x, y, r * 0.82, k.flesh), a0 = (a || 0) * PI / 180;
    for (var i = 0; i < segs; i++) {
      var b = a0 + i / segs * 2 * PI, m = b + PI / segs;
      out += P.line(x + Math.cos(b) * r * 0.12, y + Math.sin(b) * r * 0.12, x + Math.cos(b) * r * 0.82, y + Math.sin(b) * r * 0.82, k.pith, Math.max(0.8, r * 0.05));
      out += P.line(x + Math.cos(m) * r * 0.35, y + Math.sin(m) * r * 0.35, x + Math.cos(m) * r * 0.68, y + Math.sin(m) * r * 0.68, k.ves, Math.max(0.6, r * 0.04), { opacity: '0.8' });
    }
    return out + P.circle(x, y, r * 0.13, k.pith) + P.ellipse(x + r * 0.25, y - r * 0.18, r * 0.07, r * 0.04, k.seed, ed(k.seed, -0.2), 0.3, { transform: rot(-40, x + r * 0.25, y - r * 0.18) }) + P.hl(x - r * 0.35, y - r * 0.45, r * 0.3, r * 0.08, '#FFFFFF', 0.5, -30);
  }
  function segmentAt(q, x, y, a, l, w, col) {
    var tf = P.at(x, y, a), d = 'M' + n(-l / 2) + ' 0 Q0 ' + n(-w * 1.4) + ' ' + n(l / 2) + ' 0 Q0 ' + n(w * 0.5) + ' ' + n(-l / 2) + ' 0 Z', b = P.path(d, col, ed(col, -0.22), 0.6);
    for (var i = -2; i <= 2; i++) b += P.path('M' + n(-l * 0.38 + Math.abs(i) * 2) + ' ' + n(-w * 0.1 + i * 0.4) + ' Q0 ' + n(-w * 0.6 + i * w * 0.18) + ' ' + n(l * 0.38 - Math.abs(i) * 2) + ' ' + n(-w * 0.1 + i * 0.4), 'none', P.shade(col, 0.22), 0.5, { opacity: '0.8' });
    return sh(d, tf, 1, 1.4) + P.g(tf, b + P.hl(-l * 0.1, -w * 0.4, l * 0.2, w * 0.1, '#FFFFFF', 0.5));
  }

  /* ---------- nuts, crunch and the rest ---------- */
  function walnutAt(q, x, y, a, s) {
    var tf = P.at(x, y, a, s), d = P.smooth([[-7, 0], [-6.5, -4], [-3, -5.6], [0, -4.6], [3, -5.8], [6.5, -4], [7.2, 0], [6.5, 4], [3, 5.8], [0, 4.6], [-3, 5.6], [-6.5, 4]]);
    var b = P.path(d, '#B9844A', '#7A5228', 0.7) + P.path('M-6 0 Q0 -0.8 6.5 0', 'none', '#7A5228', 0.9);
    [-1, 1].forEach(function (sd) { b += P.path('M-5 ' + n(sd * 2.4) + ' q1.5 ' + n(-sd * 1.4) + ' 3 0 t3 0 t3 0', 'none', '#8E6034', 0.5); b += P.path('M-3.5 ' + n(sd * 4) + ' q1.4 ' + n(-sd * 1) + ' 2.8 0 t2.8 0', 'none', '#9A6A38', 0.45); });
    return sh(d, tf) + P.g(tf, b + P.hl(-2, -3, 2.4, 0.9, '#FFFFFF', 0.3));
  }
  function nutAt(x, y, a, l, w, col, o) {
    o = o || {};
    var tf = P.at(x, y, a), d = seedD(l, w), b = P.path(d, col, ed(col, -0.3), 0.5);
    if (o.lines) for (var i = -1; i <= 1; i++) b += P.path('M' + n(-l * 0.38) + ' ' + n(i * w * 0.18) + ' Q0 ' + n(i * w * 0.26) + ' ' + n(l * 0.38) + ' ' + n(i * w * 0.08), 'none', ed(col, -0.18), 0.4);
    if (o.skin) b += P.path('M' + n(-l / 2) + ' 0 Q' + n(-l / 2) + ' ' + n(-w / 2) + ' 0 ' + n(-w / 2) + ' Q' + n(l * 0.4) + ' ' + n(-w * 0.3) + ' ' + n(l / 2) + ' 0', 'none', o.skin, 0.9);
    return sh(d, tf, 0.6, 0.8) + P.g(tf, b + P.hl(-l * 0.1, -w * 0.18, l * 0.18, w * 0.1, '#FFFFFF', 0.4));
  }
  function croutonAt(q, x, y, s, a) {
    var h = s / 2, rr = s * 0.24;
    return P.g(P.at(x, y, a), P.rect(-h + s * 0.14, -h + s * 0.18, s, s, rr, '#000000', null, 0, { opacity: '0.14' }) + P.rect(-h, -h, s, s, rr, '#D99A4A', '#9A6428', 0.6) + P.rect(-h + s * 0.14, -h + s * 0.14, s * 0.72, s * 0.72, rr * 0.7, '#EFC782', null, 0) + P.crumbs(q, 4, s * 0.26, s * 0.26, ['#D99A4A', '#F8E2B0'], s * 0.06) + P.circle(-h * 0.4, -h * 0.4, s * 0.06, '#5E8C3A'));
  }
  function chilliRing(q, x, y, r, col) {
    col = col || '#C9302A';
    var out = P.circle(x + 0.5, y + 0.7, r, '#000000', null, 0, { opacity: '0.12' }) + P.circle(x, y, r, col, ed(col, -0.3), 0.5) + P.circle(x, y, r * 0.62, '#F4D8C0') + P.circle(x, y, r * 0.48, '#E8A88A', null, 0, { opacity: '0.5' });
    for (var i = 0; i < 3; i++) { var a = i * 2.1 + q(); out += P.ellipse(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, r * 0.17, r * 0.11, '#FBF1D6', '#D9C48E', 0.2, { transform: rot(a * 57.3, x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3) }); }
    return out;
  }
  function gingerSlice(q, x, y, a, s) {
    var tf = P.at(x, y, a), d = P.blob(q, 8 * s, 5.4 * s, 0.1, 10, 4 * s, 0);
    return sh(d, tf, 0.6, 0.8) + P.g(tf, P.path(d, '#F2B6AC', '#D98A80', 0.5, { 'fill-opacity': '0.92' }) + P.path(P.blob(q, 5 * s, 3 * s, 0.12, 8, 4.4 * s, 0), '#F8D2CA', null, 0, { opacity: '0.8' }) + P.line(-2 * s, 0, 9 * s, -0.5 * s, '#E8A49A', 0.4));
  }
  function quandongAt(q, x, y, r) {
    var d = P.blob(q, r, r * 0.9, 0.08, 9, x, y), out = P.shadow(d, 0.8, 1.1) + P.path(d, '#C8302A', '#8A1A14', 0.7) + P.path(P.blob(q, r * 0.6, r * 0.5, 0.1, 8, x + r * 0.05, y + r * 0.05), '#E8745A', '#B03A28', 0.5) + P.path(P.blob(q, r * 0.36, r * 0.28, 0.15, 7, x + r * 0.1, y + r * 0.1), '#F29A80', null, 0);
    for (var i = 0; i < 4; i++) { var a = q() * 2 * PI; out += P.path('M' + n(x + Math.cos(a) * r * 0.7) + ' ' + n(y + Math.sin(a) * r * 0.7) + ' q' + n(Math.cos(a + 1.5) * 2) + ' ' + n(Math.sin(a + 1.5) * 2) + ' ' + n(Math.cos(a + 0.4) * 2.6) + ' ' + n(Math.sin(a + 0.4) * 2.6), 'none', '#9A221C', 0.5); }
    return out + P.hl(x - r * 0.4, y - r * 0.5, r * 0.3, r * 0.1, '#FFFFFF', 0.45, -30);
  }
  function plumHalf(q, x, y, r, a) {
    var tf = P.at(x, y, a), d = P.blob(q, r, r * 0.92, 0.04, 10);
    return sh(d, tf) + P.g(tf, P.path(d, '#3A1A3A', '#200A20', 0.7) + P.path(P.blob(q, r * 0.86, r * 0.78, 0.04, 10), '#A8203A', null, 0) + P.path(P.blob(q, r * 0.5, r * 0.42, 0.06, 9), '#C23A52', null, 0, { opacity: '0.8' }) + P.ellipse(-r * 0.18, 0, r * 0.12, r * 0.3, '#EAD2B4', '#B9926A', 0.3) + P.ellipse(r * 0.18, 0, r * 0.12, r * 0.3, '#EAD2B4', '#B9926A', 0.3) + P.hl(-r * 0.35, -r * 0.45, r * 0.3, r * 0.1, '#FFFFFF', 0.45, -30));
  }
  function marshmallowAt(q, x, y, col) {
    var side = q() < 0.35, out;
    if (side) { var tf = P.at(x, y, q() * 180); out = P.rect(-4.6 + 0.8, -3.8 + 1, 9.2, 7.6, 2.6, '#000000', null, 0, { opacity: '0.1', transform: tf }) + P.g(tf, P.rect(-4.6, -3.8, 9.2, 7.6, 2.6, col, ed(col, -0.14), 0.5) + P.line(-2.6, -3.2, -2.6, 3.2, ed(col, -0.06), 0.5) + P.hl(0.5, -1.5, 2.6, 0.9, '#FFFFFF', 0.6)); }
    else out = P.circle(x + 0.8, y + 1, 4.6, '#000000', null, 0, { opacity: '0.1' }) + P.circle(x, y, 4.6, col, ed(col, -0.14), 0.5) + P.circle(x, y, 3.5, P.shade(col, 0.35), null, 0) + P.hl(x - 1.4, y - 1.6, 1.6, 0.9, '#FFFFFF', 0.7, -30);
    return out;
  }
  function arilAt(q, x, y, s) {
    var tf = P.at(x, y, q() * 360), d = P.blob(q, 2.4 * s, 1.9 * s, 0.2, 5);
    return sh(d, tf, 0.5, 0.7) + P.g(tf, P.path(d, '#B5203A', '#7A0E22', 0.4, { 'fill-opacity': '0.95' }) + P.ellipse(0.2 * s, 0.2 * s, 0.9 * s, 0.6 * s, '#F2E2E0', null, 0, { opacity: '0.45' }) + P.circle(-0.8 * s, -0.7 * s, 0.6 * s, '#FFFFFF', null, 0, { opacity: '0.7' }));
  }

  /* ---------- whole spices, more nuts and herbs ---------- */
  // the outline the book gives a fill (its own hue at 0.74 of its lightness) and a lighter tint of it for a shine
  function ol(c) { return P.shade(c, -0.26); }
  function tint(c, f) { return P.shade(c, f || 0.55); }
  // a star anise from above: eight boat-shaped pods round a small middle, most split open on a shiny seed
  function starAniseAt(q, x, y, a, s) {
    var col = '#8E4A28', seed = '#C08A4A', b = '', sb = '';
    for (var i = 0; i < 8; i++) {
      var ang = i * 45 + (q() - 0.5) * 10, l = 8.6 + (q() - 0.5) * 1.2, tf = 'rotate(' + n(ang) + ')';
      var d = 'M0.8 0 Q' + n(l * 0.4) + ' -2.7 ' + n(l) + ' -0.3 Q' + n(l + 0.4) + ' 0 ' + n(l) + ' 0.3 Q' + n(l * 0.4) + ' 2.7 0.8 0 Z';
      sb += P.path(d, '#000000', null, 0, { transform: tf });
      var pod = P.path(d, col, ol(col), 0.45) + P.path('M1.6 -0.2 Q' + n(l * 0.42) + ' -2 ' + n(l - 0.5) + ' -0.3 Q' + n(l * 0.45) + ' -0.7 1.6 -0.2 Z', '#A65E34', null, 0);
      if (q() < 0.75) pod += P.ellipse(l * 0.56, 0, 2, 1, '#4E2614', null, 0) + P.ellipse(l * 0.56, 0, 1.45, 0.72, seed, ol(seed), 0.25) + P.ellipse(l * 0.52, -0.22, 0.5, 0.2, tint(seed), null, 0, { opacity: '0.8' });
      b += P.g(tf, pod);
    }
    b += P.circle(0, 0, 1.6, '#6E3A1E', ol('#6E3A1E'), 0.4) + P.circle(-0.4, -0.4, 0.5, tint('#6E3A1E', 0.4), null, 0, { opacity: '0.75' });
    return P.g(P.at(x + 0.8, y + 1.1, a, s), sb, { opacity: '0.12' }) + P.g(P.at(x, y, a, s), b);
  }
  // a green cardamom pod: a ribbed oval, pointed at the tip, a few split open on their dark seeds
  function cardamomAt(q, x, y, a, open) {
    var col = q() < 0.5 ? '#A3B46E' : '#98AA62', tf = P.at(x, y, a), d = seedD(10, 5.8);
    var b = P.path(d, col, ol(col), 0.45) + P.path(seedD(7.6, 3.2), P.shade(col, 0.14), null, 0, { transform: 'translate(-0.4 -0.6)' });
    b += P.path('M-4.4 -1.2 Q0 -2.4 4.2 -0.5 M-4.6 1 Q0 1.8 4.3 0.4', 'none', ol(col), 0.35, { 'stroke-linecap': 'round' }) + P.circle(-5.1, 0, 0.6, '#7E8A4E', ol('#7E8A4E'), 0.2);
    if (open) b += P.path('M-2.6 -0.2 Q0.4 -2.2 3 -0.4 Q0.4 0.9 -2.6 -0.2 Z', '#3A2A1E', null, 0) + P.circle(-1, -0.5, 0.55, '#5A4430') + P.circle(0.6, -0.8, 0.55, '#4A3626') + P.circle(1.9, -0.6, 0.5, '#5A4430');
    return sh(d, tf) + P.g(tf, b + P.hl(-1.2, -1.5, 1.8, 0.5, tint(col), 0.75));
  }
  // a peppercorn: a wrinkled ball, or a cracked half showing its pale middle
  function peppercornAt(q, x, y, r, col) {
    if (q() < 0.28) {
      var tf = P.at(x, y, q() * 360), d = 'M' + n(-r) + ' 0 A' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(r) + ' 0 Z';
      return sh(d, tf, 0.4, 0.55) + P.g(tf, P.path(d, col, ol(col), 0.3) + P.ellipse(0, -0.1, r * 0.78, r * 0.32, '#D2BE92', null, 0));
    }
    return P.circle(x + 0.4, y + 0.55, r, '#000000', null, 0, { opacity: '0.12' }) + P.circle(x, y, r, col, ol(col), 0.3) +
      P.path('M' + n(x - r * 0.6) + ' ' + n(y + r * 0.1) + ' q' + n(r * 0.3) + ' ' + n(-r * 0.4) + ' ' + n(r * 0.6) + ' ' + n(-r * 0.05) + ' M' + n(x - r * 0.1) + ' ' + n(y + r * 0.55) + ' q' + n(r * 0.3) + ' ' + n(-r * 0.4) + ' ' + n(r * 0.6) + ' ' + n(-r * 0.1), 'none', P.shade(col, 0.25), 0.25) +
      P.circle(x - r * 0.35, y - r * 0.38, r * 0.26, tint(col, 0.45), null, 0, { opacity: '0.75' });
  }
  // a pink peppercorn: a papery pink shell, a few cracked on the brown seed inside
  function pinkPepperAt(q, x, y, r) {
    var col = pick(q, ['#D4566A', '#C8485C', '#DE6A7A']), d = P.blob(q, r, r * 0.92, 0.08, 6, x, y);
    var out = P.path(d, '#000000', null, 0, { opacity: '0.12', transform: tr(0.45, 0.6) }) + P.path(d, col, ol(col), 0.3) + P.circle(x - r * 0.12, y - r * 0.14, r * 0.62, P.shade(col, 0.14));
    if (q() < 0.3) out += P.ellipse(x + r * 0.22, y + r * 0.18, r * 0.5, r * 0.4, '#6A4430', ol('#6A4430'), 0.2);
    return out + P.circle(x - r * 0.38, y - r * 0.4, r * 0.22, tint(col, 0.6), null, 0, { opacity: '0.8' });
  }
  // a Sichuan peppercorn: a rough reddish husk split open on its dark hollow
  function sichuanAt(q, x, y, r) {
    var col = pick(q, ['#9A4A30', '#8A3E28', '#A85A3A']), a = q() * 2 * PI, d = P.blob(q, r, r * 0.9, 0.15, 6, x, y);
    var out = P.path(d, '#000000', null, 0, { opacity: '0.12', transform: tr(0.45, 0.6) }) + P.path(d, col, ol(col), 0.3) + P.path(P.blob(q, r * 0.55, r * 0.45, 0.15, 5, x + Math.cos(a) * r * 0.25, y + Math.sin(a) * r * 0.25), '#4A2016', null, 0);
    for (var i = 0; i < 2; i++) { var b = a + PI * (0.8 + i * 0.4); out += P.circle(x + Math.cos(b) * r * 0.62, y + Math.sin(b) * r * 0.62, r * 0.13, P.shade(col, 0.25)); }
    if (q() < 0.3) out += P.line(x - Math.cos(a) * r * 0.9, y - Math.sin(a) * r * 0.9, x - Math.cos(a) * r * 1.6, y - Math.sin(a) * r * 1.6, '#7A4A2E', 0.35);
    return out;
  }
  // an allspice berry: a rough brown ball with the little crown where the flower was
  function allspiceAt(q, x, y, r) {
    var col = pick(q, ['#7A4A2E', '#6E4228', '#86523A']), a = q() * 2 * PI, cx = x + Math.cos(a) * r * 0.35, cy = y + Math.sin(a) * r * 0.35;
    var out = P.circle(x + 0.5, y + 0.7, r, '#000000', null, 0, { opacity: '0.12' }) + P.circle(x, y, r, col, ol(col), 0.35) + P.circle(x - r * 0.15, y - r * 0.15, r * 0.7, P.shade(col, 0.1));
    out += P.scatter(q, 4, r * 0.6, r * 0.6, function (dx, dy) { return P.circle(x + dx, y + dy, 0.2, P.shade(col, -0.2)); });
    return out + P.circle(cx, cy, r * 0.32, P.shade(col, 0.12), ol(P.shade(col, 0.12)), 0.25) + P.circle(cx, cy, r * 0.12, P.shade(col, -0.4)) + P.circle(x - r * 0.4, y - r * 0.42, r * 0.2, tint(col, 0.45), null, 0, { opacity: '0.75' });
  }
  // a marjoram sprig: pairs of small rounded grey-green leaves up a thin stem, a knot of buds at the tip
  function marjoramSprig(q, x, y, a, len) {
    var col = '#7E9A5C', out = stem([[-len / 2, 0.6], [0, -0.5], [len / 2, 0]], '#8A8A5A', 0.7);
    for (var t = -len / 2 + 3.5; t < len / 2 - 6; t += 5) {
      var k = (t + len / 2) / len, l = 6.6 - k * 2.4, w = l * 0.64;
      [-1, 1].forEach(function (sd) {
        var ang = sd * (52 + q() * 14), ar = ang * PI / 180, tf = P.at(t + Math.cos(ar) * l / 2, Math.sin(ar) * l / 2, ang), d = ovateD(l, w), c = sd > 0 ? col : '#8AA468';
        out += sh(d, tf, 0.5, 0.7) + P.g(tf, P.path(d, c, ol(c), 0.35) + P.line(-l * 0.45, 0, l * 0.32, 0, tint(c, 0.3), 0.35));
      });
    }
    for (var b = 0; b < 7; b++) { var bx = len / 2 - 2.5 + (q() - 0.5) * 4, by = (q() - 0.5) * 3.6, c2 = b % 2 ? '#C9D6A6' : '#B4C68E'; out += P.circle(bx, by, 0.9 + q() * 0.4, c2, ol(c2), 0.25); }
    return P.g(P.at(x, y, a), out);
  }
  // a chervil sprig: fine stems and small, deeply cut light green leaflets
  function chervilSprig(q, x, y, a, s) {
    var st = '#8DBE6A', c = '#64A846', out = stem([[-14, 8], [-7, 4], [0, 0]], st, 0.6);
    [[0, 0, -48, 12], [0, 0, -4, 14], [-7, 4, 58, 10], [-3.5, 2, -100, 8]].forEach(function (br) {
      var ar = br[2] * PI / 180, ex = br[0] + Math.cos(ar) * br[3], ey = br[1] + Math.sin(ar) * br[3];
      out += P.line(br[0], br[1], ex, ey, st, 0.45);
      [0.42, 0.76].forEach(function (f, i) { var px = br[0] + Math.cos(ar) * br[3] * f, py = br[1] + Math.sin(ar) * br[3] * f; [-1, 1].forEach(function (sd) { out += leaflet(px, py, br[2] + sd * (58 - i * 10), 3 - i * 0.4, (i + sd) % 2 ? '#6EB24E' : c); }); });
      out += leaflet(ex, ey, br[2], 3.4, c);
    });
    return P.g(P.at(x, y, a, s), out);
  }
  // a whole cashew lying on its side: a fat curved kernel, the round back up, rounded ends (one a little bigger), a lighter body
  var CASHEW = [[-6.2, 2], [-7, -1.2], [-5.6, -4.4], [-2.2, -6], [1.6, -5.9], [4.8, -4.3], [6.5, -1.5], [6.3, 1.7], [4.6, 3.4], [3, 2.5], [1.5, 0.6], [0, 0], [-1.6, 0.6], [-3.3, 2.7], [-5, 3.6]];
  function cashewAt(q, x, y, a, s) {
    var col = q() < 0.5 ? '#E2B46A' : '#E8BE78', tf = P.at(x, y, a, s), d = P.smooth(CASHEW);
    var b = P.path(d, col, ol(col), 0.45) + P.path(d, P.shade(col, 0.16), null, 0, { transform: 'translate(-0.2 -1.5) scale(0.64)' }) + P.path('M-5.2 -2.2 Q0 -6.2 5 -2.4', 'none', P.shade(col, -0.1), 0.35, { 'stroke-linecap': 'round' });
    return sh(d, tf) + P.g(tf, b + P.hl(-2.4, -4, 2, 0.6, tint(col), 0.75, -14));
  }
  // a roasted chestnut: in its glossy shell, scored and opened in a cross on the golden nut, or peeled
  function chestnutAt(q, x, y, a, peeled) {
    var tf = P.at(x, y, a), b, d;
    if (peeled) {
      var nut = '#D9AE62';
      d = P.smooth([[0, -9], [1.6, -7.6], [6.4, -5.4], [8.6, 0.6], [6.2, 6.8], [0.6, 8.2], [-6.4, 7], [-8.8, 0.4], [-6.4, -5.6], [-1.6, -7.6]]);
      b = P.path(d, nut, ol(nut), 0.6) + P.path(P.blob(q, 5, 4, 0.12, 8, -1.4, -1.6), P.shade(nut, 0.14), null, 0);
      b += P.path('M-6.6 -1.6 Q-3 0 -4.4 5 M-1.6 -6.4 Q1.6 -2 -0.4 1.6 Q-1.4 4 0.6 7 M4.6 -4.4 Q2.4 -0.4 5.6 3.6 M-2.4 1 Q-0.6 2.6 1.8 1.4', 'none', P.shade(nut, -0.24), 0.8, { 'stroke-linecap': 'round' });
      b += P.path(P.blob(q, 2.4, 1.3, 0.2, 6, 5.2, 4.4, 40), '#8A4E2C', null, 0) + P.path(P.blob(q, 1.6, 0.9, 0.2, 5, -5.6, 3.2), '#8A4E2C', null, 0) + P.path('M-1.6 -7.6 Q0 -9.6 1.6 -7.6', 'none', '#8A4E2C', 1, { 'stroke-linecap': 'round' });
      return sh(d, tf) + P.g(tf, b + P.hl(-3, -3.8, 2, 0.7, tint(nut), 0.75, -25));
    }
    var shell = '#6E3A22', kern = '#DDB46A';
    d = P.smooth([[0, -10.6], [1.4, -9.4], [7.6, -6.6], [10.2, 1], [7.2, 8.2], [0, 9.8], [-7.2, 8.2], [-10.2, 1], [-7.6, -6.6], [-1.4, -9.4]]);
    b = P.path(d, shell, ol(shell), 0.7) + P.path(P.blob(q, 6.4, 2.4, 0.08, 8, 0, 6.6), '#C8A27A', ol('#C8A27A'), 0.4) + P.path(P.blob(q, 5, 4.6, 0.1, 8, 0, -0.6), kern, ol(kern), 0.5);
    b += P.path('M-6.4 -6.6 L-2.4 -2.6 M6.4 -6.6 L2.4 -2.6 M-6 5.2 L-2.6 1.8 M6 5.2 L2.6 1.8', 'none', ol(shell), 0.9, { 'stroke-linecap': 'round' }) + P.path('M-1.6 -2.4 Q0 -0.6 1.6 -2.4', 'none', P.shade(kern, -0.2), 0.5);
    return sh(d, tf) + P.g(tf, b + P.hl(-6, -2.6, 0.8, 2.6, tint(shell, 0.4), 0.75, 25) + P.hl(-1.6, -2.6, 1.4, 0.5, tint(kern), 0.75));
  }
  // a cacao nib: a small angular dark brown piece with a lighter facet
  function nibAt(q, x, y, s) {
    var col = pick(q, ['#4E2A1A', '#5E3422', '#43231A']), a0 = q() * 2 * PI, pts = [];
    for (var i = 0; i < 5; i++) { var b = a0 + i / 5 * 2 * PI + (q() - 0.5) * 0.6, r = s * (0.6 + q() * 0.5); pts.push([x + Math.cos(b) * r, y + Math.sin(b) * r]); }
    var d = 'M' + pts.map(function (p) { return n(p[0]) + ' ' + n(p[1]); }).join(' L') + ' Z';
    return P.path(d, '#000000', null, 0, { opacity: '0.12', transform: tr(0.5, 0.7) }) + P.path(d, col, ol(col), 0.3, { 'stroke-linejoin': 'round' }) + P.path('M' + n(pts[0][0]) + ' ' + n(pts[0][1]) + ' L' + n(pts[1][0]) + ' ' + n(pts[1][1]) + ' L' + n(x) + ' ' + n(y) + ' Z', P.shade(col, 0.2), null, 0);
  }
  // a strip cut from a nori sheet: a long dark green ribbon with its fibres and a dull sheen
  function noriStrip(q, x, y, a, l, w) {
    var col = '#26362A', tf = P.at(x, y, a), d = 'M' + n(-l / 2) + ' ' + n(-w / 2) + ' L' + n(l / 2) + ' ' + n(-w / 2 + (q() - 0.5) * 0.6) + ' L' + n(l / 2) + ' ' + n(w / 2) + ' L' + n(-l / 2) + ' ' + n(w / 2 + (q() - 0.5) * 0.6) + ' Z';
    var b = P.path(d, col, ol(col), 0.5, { 'stroke-linejoin': 'round' });
    for (var i = 0; i < 4; i++) { var fx = -l / 2 + 4 + q() * (l - 10), fy = (q() - 0.5) * w * 0.7; b += P.line(fx, fy, fx + 3 + q() * 4, fy + (q() - 0.5) * 1.2, '#3A4C3E', 0.45, { opacity: '0.9' }); }
    return sh(d, tf, 0.9, 1.2) + P.g(tf, b + P.line(-l * 0.38, -w * 0.22, l * 0.2, -w * 0.26, '#4C6252', 0.7, { opacity: '0.75' }));
  }
  // a fenugreek seed: a small rounded box, yellow brown, with the furrow across one corner
  function fenugreekAt(q, x, y) {
    var c = pick(q, ['#C99A44', '#B88A3A', '#D4A852']), tf = P.at(x, y, q() * 180);
    return P.g(tf, P.rect(-1.15, -0.8, 2.3, 1.6, 0.45, c, ol(c), 0.25) + P.line(-0.6, 0.55, 0.15, -0.25, P.shade(c, -0.2), 0.25) + P.circle(-0.45, -0.35, 0.22, tint(c, 0.5), null, 0, { opacity: '0.75' }));
  }

  /* ---------- items ---------- */
  var HERB = '#3F7F2A';
  L.add('garnish', [
    // herbs
    { id: 'parsley-sprig', name: 'Parsley sprig', sub: 'Herbs', kw: 'parsley flat leaf continental italian parsley sprig herb', form: 'sprig', cook: 'fresh', role: 'garnish', n: 1, w: 26, h: 22, side: { s: 'leafy', h: 3, c: HERB }, draw: function (P, rnd) { return parsleySprig(rnd, 0, 0, 0, 1); } },
    { id: 'parsley-chopped', name: 'Parsley, chopped', sub: 'Herbs', kw: 'chopped parsley finely chopped herbs sprinkle', form: 'scatter', cook: 'fresh', role: 'garnish', g: 2, w: 50, h: 42, side: { s: 'layer', h: 1, c: HERB }, draw: function (P, rnd) { return flakes(rnd, 80, 26, 21, ['#3F7F2A', '#2E6A24', '#4F8F2F', '#5EA03A'], 1.1); } },
    { id: 'basil-leaves', name: 'Basil leaves', sub: 'Herbs', kw: 'basil leaves sweet basil fresh basil tip', form: 'leaf', cook: 'fresh', role: 'garnish', n: 3, w: 29, h: 28, side: { s: 'leafy', h: 3, c: '#3F8F2E' }, draw: function (P) { return ovateAt(-7, 2, -150, 17, 11, '#4A9A34', { stalk: 2 }) + ovateAt(7, 2, -30, 17, 11, '#4A9A34', { stalk: 2 }) + ovateAt(0, -3, -90, 22, 14, '#3F8F2E', { stalk: 3, shine: 0.4 }) + ovateAt(0, -14, -90, 6, 4, '#5EAE44', { veins: 0 }); } },
    { id: 'dill-fronds', name: 'Dill fronds', sub: 'Herbs', kw: 'dill fronds fresh dill herb fish', form: 'sprig', cook: 'fresh', role: 'garnish', n: 2, w: 33, h: 25, side: { s: 'leafy', h: 2, c: '#5E9A3A' }, draw: function (P, rnd) { return dillFrond(rnd, -2, -4, -15, 28) + dillFrond(rnd, 2, 5, 10, 24); } },
    { id: 'rosemary-sprig', name: 'Rosemary sprig', sub: 'Herbs', kw: 'rosemary sprig fresh rosemary herb lamb', form: 'sprig', cook: 'fresh', role: 'garnish', n: 1, w: 47, h: 14, side: { s: 'leafy', h: 3, c: '#3E5E3A' }, draw: function (P, rnd) { return rosemarySprig(rnd, 0, 0, 0, 46); } },
    { id: 'thyme-sprigs', name: 'Thyme sprigs', sub: 'Herbs', kw: 'thyme sprigs fresh thyme lemon thyme herb', form: 'sprig', cook: 'fresh', role: 'garnish', n: 2, w: 30, h: 22, side: { s: 'leafy', h: 2, c: '#6E8A4E' }, draw: function (P, rnd) { return thymeSprig(rnd, 0, -4, -8, 30) + thymeSprig(rnd, 2, 5, 6, 26); } },
    { id: 'coriander-sprig', name: 'Coriander sprig', sub: 'Herbs', kw: 'coriander cilantro sprig fresh herb', form: 'sprig', cook: 'fresh', role: 'garnish', n: 1, w: 33, h: 30, side: { s: 'leafy', h: 3, c: '#4FA03A' }, draw: function (P, rnd) { return corianderSprig(rnd, 1, 0, 0, 1); } },
    { id: 'chives-snipped', name: 'Chives, snipped', sub: 'Herbs', kw: 'chives snipped chopped chive rings', form: 'scatter', cook: 'fresh', role: 'garnish', g: 2, w: 40, h: 34, side: { s: 'layer', h: 1, c: '#4F8F2F' }, draw: function (P, rnd) { return P.scatter(rnd, 34, 21, 17, function (x, y, i, q) { var a = q() * 180; return P.g(P.at(x, y, a), P.rect(-1.5, -0.8, 3, 1.6, 0.7, '#4F8F2F', '#2E6A24', 0.3) + P.line(-1, -0.2, 1, -0.2, '#8DC060', 0.4)); }); } },
    { id: 'chive-batons', name: 'Chive batons', sub: 'Herbs', kw: 'chives long chive batons chive sticks', form: 'stick', cook: 'fresh', role: 'garnish', n: 5, w: 57, h: 12, side: { s: 'stick', h: 1, c: '#4F8F2F' }, draw: function (P, rnd) { var out = ''; for (var i = 0; i < 5; i++) { var y = (i - 2) * 2.4, x = (rnd() - 0.5) * 6, a = (rnd() - 0.5) * 8, tf = P.at(x, y, a); out += P.g(tf, P.line(-27, 0.8, 27, 0.8, '#000000', 1.8, { opacity: '0.1' }) + P.line(-27, 0, 27, 0, '#2E6A24', 2.1) + P.line(-27, 0, 27, 0, '#4F8F2F', 1.4) + P.line(-24, -0.3, 22, -0.3, '#8DC060', 0.4)); } return out; } },
    { id: 'mint-leaves', name: 'Mint leaves', sub: 'Herbs', kw: 'mint leaves mint sprig tip spearmint fresh mint', form: 'sprig', cook: 'fresh', role: 'garnish', n: 1, w: 27, h: 31, side: { s: 'leafy', h: 3, c: '#4F9A3A' }, draw: function (P, rnd) { return mintTip(rnd, 0, 0, 0, 1); } },
    { id: 'micro-herbs', name: 'Micro herbs', sub: 'Herbs', kw: 'micro herbs microgreens micro greens shoots red amaranth cress', form: 'pile', cook: 'fresh', role: 'garnish', g: 3, w: 32, h: 28, side: { s: 'leafy', h: 4, c: '#6EAE4A' }, draw: function (P, rnd) { return heap(rnd, 20, 12, 9, function (x, y, i, q) { return seedlingAt(q, x, y, q() * 360, i % 4 === 0 ? '#9E2A52' : i % 3 === 0 ? '#8DC060' : '#5EA03A'); }); } },
    { id: 'spring-onion-curls', name: 'Spring onion curls', sub: 'Herbs', kw: 'spring onion curls scallion curls shredded shallots asian garnish', form: 'pile', cook: 'fresh', role: 'garnish', g: 5, w: 40, h: 33, side: { s: 'leafy', h: 4, c: '#5EA43A' }, draw: function (P, rnd) { return heap(rnd, 10, 16, 12, function (x, y, i, q) { return curlAt(q, x, y, i % 3 ? '#5EA43A' : '#E6F0C8', 1); }); } },
    { id: 'marjoram-sprig', name: 'Marjoram sprig', sub: 'Herbs', kw: 'marjoram sprig sweet marjoram fresh herb', form: 'sprig', cook: 'fresh', role: 'garnish', n: 1, w: 36, h: 18, side: { s: 'leafy', h: 3, c: '#7E9A5C' }, draw: function (P, rnd) { return marjoramSprig(rnd, 0, 0, -6, 34); } },
    { id: 'chervil-sprig', name: 'Chervil sprig', sub: 'Herbs', kw: 'chervil sprig french parsley fresh herb fines herbes', form: 'sprig', cook: 'fresh', role: 'garnish', n: 1, w: 32, h: 30, side: { s: 'leafy', h: 3, c: '#64A846' }, draw: function (P, rnd) { return chervilSprig(rnd, -2, -2, 0, 1); } },
    // flowers
    { id: 'viola-flowers', name: 'Viola flowers', sub: 'Flowers', kw: 'violas pansy edible flowers purple viola', form: 'cluster', cook: 'fresh', role: 'garnish', n: 3, w: 37, h: 29, side: { s: 'leafy', h: 2, c: '#5A3A8A' }, draw: function (P, rnd) { return violaAt(rnd, -11, -4, 8.5, -10) + violaAt(rnd, 11, -3, 8, 12, ['#6E3E9E', '#B29ADF', '#EEE6FA']) + violaAt(rnd, 0, 8, 8.5, 4, ['#3A2A6A', '#F2C94C', '#F6E08A']); } },
    { id: 'nasturtium-leaf', name: 'Nasturtium leaf', sub: 'Flowers', kw: 'nasturtium leaf round leaf peppery edible leaf', form: 'leaf', cook: 'fresh', role: 'garnish', n: 1, w: 31, h: 30, side: { s: 'leafy', h: 2, c: '#7EA453' }, draw: function (P, rnd) {
      var pts = []; for (var k = 0; k < 18; k++) { var b = k / 18 * 2 * PI, rr = (k % 2 ? 14.6 : 16) * (1 + (rnd() - 0.5) * 0.05); pts.push([Math.cos(b) * rr, Math.sin(b) * rr * 0.95]); }
      var d = P.smooth(pts), out = P.shadow(d, 1, 1.4) + P.path(d, '#5E8E36', '#3F6A26', 0.8) + P.path(P.blob(rnd, 9, 8, 0.1, 10, -4, -4), '#74A446', null, 0, { opacity: '0.6' });
      for (var i = 0; i < 9; i++) { var a = i / 9 * 2 * PI + 0.2, ex = Math.cos(a) * 14, ey = Math.sin(a) * 13, mx = 3 + Math.cos(a + 0.15) * 9, my = 2 + Math.sin(a + 0.15) * 8.6; out += P.path('M3 2 Q' + n(3 + Math.cos(a + 0.25) * 5) + ' ' + n(2 + Math.sin(a + 0.25) * 5) + ' ' + n(ex) + ' ' + n(ey) + ' M' + n(mx) + ' ' + n(my) + ' L' + n(mx + Math.cos(a + 0.7) * 3.4) + ' ' + n(my + Math.sin(a + 0.7) * 3.4), 'none', '#B9D48C', 0.5); }
      return out + P.circle(3, 2, 1, '#C9DE9A') + P.hl(-6, -7, 5, 1.6, '#FFFFFF', 0.25, -30);
    } },
    { id: 'nasturtium-flower', name: 'Nasturtium flower', sub: 'Flowers', kw: 'nasturtium flower orange edible flower', form: 'piece', cook: 'fresh', role: 'garnish', n: 1, w: 32, h: 31, side: { s: 'leafy', h: 3, c: '#E8762A' }, draw: function (P, rnd) {
      var out = P.circle(1, 1.4, 14, '#000000', null, 0, { opacity: '0.1' });
      for (var i = 0; i < 5; i++) { var a = -90 + i * 72, ar = a * PI / 180, cx = Math.cos(ar) * 8, cy = Math.sin(ar) * 8, col = i % 2 ? '#E8762A' : '#EE8A2E'; out += P.path(P.blob(rnd, 8.5, 7.5, 0.06, 10, cx, cy, a), col, '#B9501A', 0.6); for (var j = -1; j <= 1; j++) out += P.line(Math.cos(ar) * 2.5, Math.sin(ar) * 2.5, Math.cos(ar + j * 0.22) * 9, Math.sin(ar + j * 0.22) * 9, '#B9301A', 0.5, { opacity: '0.8' }); }
      return out + P.circle(0, 0, 3.4, '#F2B53A', '#C98A1E', 0.5) + P.circle(0, 0, 1.2, '#9E2B20') + P.hl(-5, -6, 3, 1.2, '#FFFFFF', 0.4, -30);
    } },
    { id: 'lavender-sprigs', name: 'Lavender sprigs', sub: 'Flowers', kw: 'lavender sprigs flowers culinary lavender purple', form: 'sprig', cook: 'fresh', role: 'garnish', n: 2, w: 42, h: 15, side: { s: 'leafy', h: 3, c: '#8A6AB5' }, draw: function (P, rnd) { return lavenderSprig(rnd, 0, -3, -6, 40) + lavenderSprig(rnd, -2, 4, 5, 36); } },
    { id: 'flower-petals', name: 'Edible flower petals', sub: 'Flowers', kw: 'edible petals rose petals cornflower calendula marigold confetti', form: 'scatter', cook: 'fresh', role: 'garnish', g: 1, w: 39, h: 37, side: { s: 'layer', h: 1, c: '#E86A8A' }, draw: function (P, rnd) { return P.scatter(rnd, 22, 20, 15, function (x, y, i, q) { var k = i % 3; return petalAt(x, y, q() * 360, ['#E86A8A', '#4A6AC8', '#F2A02A'][k], k === 0 ? 6 : 4.5, k === 0 ? 4.4 : 2.4); }); } },
    // citrus
    { id: 'lemon-wedge', name: 'Lemon wedge', sub: 'Citrus', kw: 'lemon wedge lemon slice wedge citrus', form: 'wedge', cook: 'fresh', role: 'garnish', n: 1, w: 41, h: 20, side: { s: 'wedge', h: 14, c: '#F2CB55' }, draw: citrusWedge('lemon', 40, 21) },
    { id: 'lime-wedge', name: 'Lime wedge', sub: 'Citrus', kw: 'lime wedge citrus fresh lime', form: 'wedge', cook: 'fresh', role: 'garnish', n: 1, w: 35, h: 17, of: 'lemon-wedge', side: { s: 'wedge', h: 12, c: '#5E9A3A' }, draw: citrusWedge('lime', 34, 18) },
    { id: 'lemon-slice', name: 'Lemon slice', sub: 'Citrus', kw: 'lemon slice wheel round citrus', form: 'piece', cook: 'fresh', role: 'garnish', n: 1, w: 41, h: 41, side: { s: 'disc', h: 3, c: '#F2CB55' }, draw: function (P) { return citrusSliceAt('lemon', 0, 0, 20, 8); } },
    { id: 'lime-slice', name: 'Lime slice', sub: 'Citrus', kw: 'lime slice wheel round citrus', form: 'piece', cook: 'fresh', role: 'garnish', n: 1, w: 35, h: 35, of: 'lemon-slice', side: { s: 'disc', h: 3, c: '#5E9A3A' }, draw: function (P) { return citrusSliceAt('lime', 0, 0, 17, 14); } },
    { id: 'lemon-cheek', name: 'Lemon cheek', sub: 'Citrus', kw: 'lemon cheek lemon half seedless cheek citrus', form: 'piece', cook: 'fresh', role: 'garnish', n: 1, w: 40, h: 27, side: { s: 'mound', h: 14, c: '#F2CB55' }, draw: function (P, rnd) {
      var k = CIT.lemon, d = P.blob(rnd, 20, 13.5, 0.02, 14), out = P.shadow(d, 1.6, 2) + P.path(d, k.rind, k.edge, 0.9) + P.ellipse(0, 0, 18, 11.6, k.pith) + P.ellipse(0, 0, 16.8, 10.4, k.flesh);
      [-6.5, -2.2, 2.2, 6.5].forEach(function (yy) { out += P.path('M-15 ' + n(yy * 0.7) + ' Q0 ' + n(yy * 1.25) + ' 15 ' + n(yy * 0.7), 'none', k.pith, 0.9); });
      for (var i = 0; i < 10; i++) { var x = -12 + i * 2.6, y = (i % 3 - 1) * 4.2; out += P.line(x, y, x + 2.4, y + 0.3, k.ves, 0.6); }
      return out + P.hl(-6, -6, 6, 1.4, '#FFFFFF', 0.5, -8);
    } },
    { id: 'orange-segments', name: 'Orange segments', sub: 'Citrus', kw: 'orange segments supremes orange pieces citrus segments', form: 'piece', cook: 'fresh', role: 'garnish', n: 3, w: 39, h: 28, side: { s: 'layer', h: 6, c: '#F29A2E' }, draw: function (P, rnd) { return segmentAt(rnd, -3, -8, -12, 32, 10, '#F29A2E') + segmentAt(rnd, 3, 1, 8, 32, 10, '#F4A23A') + segmentAt(rnd, -2, 10, -4, 30, 9.5, '#EE922A'); } },
    { id: 'lemon-zest', name: 'Lemon zest', sub: 'Citrus', kw: 'lemon zest zested grated rind citrus peel strips', form: 'scatter', cook: 'fresh', role: 'garnish', g: 2, w: 38, h: 29, side: { s: 'layer', h: 1, c: '#F2C230' }, draw: function (P, rnd) { return P.scatter(rnd, 22, 17, 12, function (x, y, i, q) { var a = q() * PI, l = 3 + q() * 4, b = (q() - 0.5) * 6, d = 'M' + n(x - Math.cos(a) * l) + ' ' + n(y - Math.sin(a) * l) + ' Q' + n(x - Math.sin(a) * b) + ' ' + n(y + Math.cos(a) * b) + ' ' + n(x + Math.cos(a) * l) + ' ' + n(y + Math.sin(a) * l); return P.path(d, 'none', '#C99A22', 1.5, { 'stroke-linecap': 'round' }) + P.path(d, 'none', '#F2C230', 0.9, { 'stroke-linecap': 'round' }); }); } },
    // nuts and seeds
    { id: 'walnuts', name: 'Walnut halves', sub: 'Nuts and seeds', kw: 'walnuts walnut halves pieces toasted nuts', form: 'scatter', cook: 'roasted', role: 'garnish', n: 5, w: 33, h: 25, side: { s: 'pile', h: 6, c: '#B9844A' }, draw: function (P, rnd) { return heap(rnd, 5, 11, 8, function (x, y, i, q) { return walnutAt(q, x, y, q() * 360, 0.95 + q() * 0.15); }); } },
    { id: 'almonds-flaked', name: 'Flaked almonds', sub: 'Nuts and seeds', kw: 'flaked almonds sliced almonds toasted almond flakes slivered', form: 'scatter', cook: 'roasted', role: 'garnish', g: 5, w: 40, h: 30, side: { s: 'layer', h: 2, c: '#F2DEB4' }, draw: function (P, rnd) { return P.scatter(rnd, 18, 18, 13, function (x, y, i, q) { var c = q() < 0.4 ? '#E8C88A' : '#F4E6C8'; return nutAt(x, y, q() * 360, 8.5, 5.4, c, { skin: '#B9824A' }); }); } },
    { id: 'almonds-whole', name: 'Almonds, whole', sub: 'Nuts and seeds', kw: 'almonds whole roasted almonds nuts', form: 'scatter', cook: 'roasted', role: 'garnish', n: 6, w: 32, h: 23, side: { s: 'pile', h: 6, c: '#A86A3A' }, draw: function (P, rnd) { return heap(rnd, 6, 12, 8, function (x, y, i, q) { return nutAt(x, y, q() * 360, 14, 8.6, '#A86A3A', { lines: true }); }); } },
    { id: 'pine-nuts', name: 'Pine nuts, toasted', sub: 'Nuts and seeds', kw: 'pine nuts pinenuts pignoli toasted', form: 'scatter', cook: 'roasted', role: 'garnish', g: 5, w: 35, h: 27, side: { s: 'layer', h: 2, c: '#EEDDB0' }, draw: function (P, rnd) { return P.scatter(rnd, 24, 17, 12, function (x, y, i, q) { return nutAt(x, y, q() * 360, 6, 3.2, q() < 0.4 ? '#E2C07A' : '#F0E0B4') + P.circle(x, y, 0.4, '#B98A4A'); }); } },
    { id: 'macadamias', name: 'Macadamias', sub: 'Nuts and seeds', kw: 'macadamia nuts macadamias australian native nut roasted', form: 'scatter', cook: 'roasted', role: 'garnish', n: 5, w: 29, h: 23, side: { s: 'pile', h: 9, c: '#F1E2BC' }, draw: function (P, rnd) { return heap(rnd, 5, 11, 7, function (x, y, i, q) { if (i % 3 === 1) { var tf = P.at(x, y, q() * 360), d = 'M-6 0 A6 6 0 0 1 6 0 Z'; return sh(d, tf) + P.g(tf, P.path(d, '#F6EAC8', '#C9B080', 0.5) + P.line(-5.6, 0, 5.6, 0, '#E2CC98', 0.8)); } return P.circle(x + 0.7, y + 0.9, 6, '#000000', null, 0, { opacity: '0.12' }) + P.circle(x, y, 6, '#F1E2BC', '#C9B080', 0.6) + P.circle(x + 1, y + 1, 3.6, '#E8D4A6', null, 0, { opacity: '0.7' }) + P.hl(x - 2, y - 2.2, 2, 1.1, '#FFFFFF', 0.6, -30); }); } },
    { id: 'sesame-white', name: 'Sesame seeds, white', sub: 'Nuts and seeds', kw: 'sesame seeds white toasted sesame', form: 'scatter', cook: 'roasted', role: 'garnish', g: 1, w: 44, h: 35, side: { s: 'layer', h: 1, c: '#F2E6C4' }, draw: function (P, rnd) { return seeds(rnd, 52, 23, 18, 2.4, 1.4, ['#F4E8C8', '#EEDDB0'], { edge: '#BFA978' }); } },
    { id: 'sesame-black', name: 'Sesame seeds, black', sub: 'Nuts and seeds', kw: 'black sesame seeds', form: 'scatter', cook: 'roasted', role: 'garnish', g: 1, w: 46, h: 36, of: 'sesame-white', side: { s: 'layer', h: 1, c: '#2E2A28' }, draw: function (P, rnd) { return seeds(rnd, 52, 23, 18, 2.4, 1.4, ['#2E2A28', '#3A3430'], { edge: '#141210', hl: true }); } },
    { id: 'pepitas', name: 'Pepitas', sub: 'Nuts and seeds', kw: 'pepitas pumpkin seeds toasted seeds', form: 'scatter', cook: 'roasted', role: 'garnish', g: 5, w: 39, h: 36, side: { s: 'layer', h: 2, c: '#6E8A3A' }, draw: function (P, rnd) { return P.scatter(rnd, 15, 20, 15, function (x, y, i, q) { var a = q() * 360; return seedAt(x, y, a, 8.5, 4.6, '#A8BC6A', '#4E6A26', 0.4) + seedAt(x, y, a, 7, 3.4, '#6E8A3A', null, 0.01); }); } },
    { id: 'crushed-peanuts', name: 'Crushed peanuts', sub: 'Nuts and seeds', kw: 'crushed peanuts chopped peanuts roasted peanuts satay', form: 'scatter', cook: 'roasted', role: 'garnish', g: 8, w: 40, h: 30, side: { s: 'layer', h: 2, c: '#D9B07A' }, draw: function (P, rnd) { return P.scatter(rnd, 28, 19, 15, function (x, y, i, q) { return bitAt(q, x, y, 1.4 + q() * 1.6, i % 6 ? '#D9B07A' : '#A86A4A', i % 6 ? '#EED8A8' : ''); }); } },
    { id: 'pistachios-chopped', name: 'Pistachios, chopped', sub: 'Nuts and seeds', kw: 'pistachio pistachios chopped crushed green nuts', form: 'scatter', cook: 'roasted', role: 'garnish', g: 5, w: 39, h: 31, side: { s: 'layer', h: 2, c: '#9CB45A' }, draw: function (P, rnd) { return P.scatter(rnd, 26, 20, 15, function (x, y, i, q) { return bitAt(q, x, y, 1.2 + q() * 1.4, i % 5 ? (i % 2 ? '#9CB45A' : '#B9CC6A') : '#8A5A6A', i % 5 ? '#C9DA8A' : ''); }); } },
    { id: 'coconut-flakes', name: 'Coconut flakes, toasted', sub: 'Nuts and seeds', kw: 'coconut flakes toasted coconut chips shaved coconut', form: 'scatter', cook: 'roasted', role: 'garnish', g: 5, w: 42, h: 33, side: { s: 'layer', h: 2, c: '#E8C88A' }, draw: function (P, rnd) { return P.scatter(rnd, 15, 20, 15, function (x, y, i, q) { var tf = P.at(x, y, q() * 360), c = pick(q, ['#F4ECD8', '#EED8A8', '#E2BA78']), d = 'M-5 1 Q0 -3.4 5 0.6 Q0 -1 -5 1 Z'; return sh(d, tf, 0.5, 0.7) + P.g(tf, P.path(d, c, '#B98A4A', 0.6) + P.path('M-5 1 Q0 -3.4 5 0.6', 'none', '#C9944E', 0.6)); }); } },
    { id: 'cashews', name: 'Cashews, whole', sub: 'Nuts and seeds', kw: 'cashews cashew nuts whole toasted cashews roasted', form: 'scatter', cook: 'roasted', role: 'garnish', n: 6, w: 42, h: 32, side: { s: 'pile', h: 6, c: '#E2B46A' }, draw: function (P, rnd) { return heap(rnd, 6, 15, 10, function (x, y, i, q) { return cashewAt(q, x, y, q() * 360, 0.95 + q() * 0.1); }); } },
    { id: 'chestnuts-roasted', name: 'Chestnuts, roasted', sub: 'Nuts and seeds', kw: 'chestnuts roasted chestnut peeled scored winter', form: 'cluster', cook: 'roasted', role: 'garnish', n: 3, w: 46, h: 38, side: { s: 'pile', h: 13, c: '#6E3A22' }, draw: function (P, rnd) { return chestnutAt(rnd, -11, -3, -8, false) + chestnutAt(rnd, 11, -7, 30, true) + chestnutAt(rnd, 7, 9, -20, true); } },
    // crunch
    { id: 'pangrattato', name: 'Pangrattato', sub: 'Crunch', kw: 'pangrattato toasted breadcrumbs crumbs garlic herb crumb poor mans parmesan', form: 'scatter', cook: 'fried', role: 'garnish', g: 8, w: 47, h: 36, side: { s: 'layer', h: 2, c: '#D49B55' }, draw: function (P, rnd) { return P.scatter(rnd, 54, 23, 18, function (x, y, i, q) { return i % 9 === 0 ? P.circle(x, y, 0.7, '#4F8F2F') : bitAt(q, x, y, 0.8 + q() * 1.4, pick(q, ['#D49B55', '#E0AA58', '#C98A45', '#E8C27A'])); }); } },
    { id: 'croutons', name: 'Croutons', sub: 'Crunch', kw: 'croutons toasted bread cubes caesar', form: 'scatter', cook: 'baked', role: 'garnish', n: 8, w: 40, h: 31, side: { s: 'pile', h: 9, c: '#D99A4A' }, draw: function (P, rnd) { return heap(rnd, 8, 15, 11, function (x, y, i, q) { return croutonAt(q, x, y, 9 + q() * 2, q() * 90); }); } },
    { id: 'bacon-crumb', name: 'Bacon crumb', sub: 'Crunch', kw: 'bacon crumb crispy bacon crumble bacon bits fine', form: 'scatter', cook: 'fried', role: 'garnish', g: 10, w: 41, h: 32, side: { s: 'layer', h: 2, c: '#A8463A' }, draw: function (P, rnd) { return P.scatter(rnd, 30, 20, 15, function (x, y, i, q) { return bitAt(q, x, y, 1 + q() * 1.6, pick(q, ['#A8463A', '#8E3428', '#B9583E']), i % 3 ? '' : '#EBC8B8'); }); } },
    { id: 'corn-chip-shards', name: 'Corn chips, broken', sub: 'Crunch', kw: 'corn chips tortilla chips crushed broken nacho shards', form: 'scatter', cook: 'fried', role: 'garnish', g: 10, w: 33, h: 31, side: { s: 'layer', h: 3, c: '#E8BB5A' }, draw: function (P, rnd) { return heap(rnd, 6, 14, 10, function (x, y, i, q) { var tf = P.at(x, y, q() * 360), s = 0.8 + q() * 0.5, d = 'M' + [[-8, 5], [-6, -5.5], [8, 3], [4, 3.4], [2.6, 5], [0.6, 4.4], [-1, 6]].map(function (p) { return n(p[0] * s) + ' ' + n(p[1] * s); }).join(' L') + ' Z'; return sh(d, tf) + P.g(tf, P.path(d, '#EBC45A', '#B9862A', 0.6, { 'stroke-linejoin': 'round' }) + P.crumbs(q, 6, 4 * s, 3 * s, ['#C98A3A', '#F6DC96'], 0.6) + P.path('M' + n(-6 * s) + ' ' + n(-3 * s) + ' L' + n(-2 * s) + ' ' + n(2 * s), 'none', '#C98A3A', 0.5)); }); } },
    { id: 'noodle-crisps', name: 'Crispy noodles', sub: 'Crunch', kw: 'crispy noodles fried noodles noodle crisps crunchy wonton strips', form: 'pile', cook: 'fried', role: 'garnish', g: 8, w: 39, h: 34, side: { s: 'pile', h: 8, c: '#E8C070' }, draw: function (P, rnd) { return heap(rnd, 18, 12, 10, function (x, y, i, q) { var pts = [], a = q() * PI, l = 16 + q() * 8, c = Math.cos(a), s = Math.sin(a); for (var j = 0; j <= 8; j++) { var t = j / 8 - 0.5, w = (j % 2 ? 1 : -1) * 1.6; pts.push([x + c * t * l - s * w, y + s * t * l + c * w]); } var d = P.smooth(pts, true); return P.path(d, 'none', '#B98A3A', 1.8, { 'stroke-linecap': 'round' }) + P.path(d, 'none', pick(q, ['#EBC97A', '#E2B860', '#F2D894']), 1.1, { 'stroke-linecap': 'round' }); }); } },
    { id: 'wasabi-peas', name: 'Wasabi peas', sub: 'Crunch', kw: 'wasabi peas crunchy coated peas japanese snack', form: 'scatter', cook: 'fried', role: 'garnish', n: 10, w: 32, h: 22, side: { s: 'pile', h: 7, c: '#B9CC7A' }, draw: function (P, rnd) { return heap(rnd, 10, 13, 9, function (x, y, i, q) { return P.circle(x + 0.6, y + 0.8, 4.2, '#000000', null, 0, { opacity: '0.12' }) + P.path(P.blob(q, 4.2, 4, 0.06, 8, x, y), '#BCCF7E', '#7E9440', 0.6) + P.path('M' + n(x - 1.5) + ' ' + n(y + 0.5) + ' l1.2 -1 l1 1.4 M' + n(x + 0.6) + ' ' + n(y + 2.2) + ' l1.4 -0.6', 'none', '#98AE58', 0.5) + P.hl(x - 1.4, y - 1.6, 1.4, 0.8, '#FFFFFF', 0.6, -30); }); } },
    { id: 'crispy-shallots', name: 'Crispy shallots', sub: 'Crunch', kw: 'crispy shallots fried shallots asian shallots crunchy onion', form: 'scatter', cook: 'fried', role: 'garnish', g: 5, w: 38, h: 30, side: { s: 'layer', h: 2, c: '#B9772E' }, draw: function (P, rnd) { return P.scatter(rnd, 26, 18, 13, function (x, y, i, q) { var r = 2 + q() * 1.8, a0 = q() * 2 * PI, a1 = a0 + 1.6 + q() * 2.4, col = pick(q, ['#C98A3A', '#E0A858', '#B9772E']), d = 'M' + n(x + Math.cos(a0) * r) + ' ' + n(y + Math.sin(a0) * r) + ' A' + n(r) + ' ' + n(r) + ' 0 ' + (a1 - a0 > PI ? 1 : 0) + ' 1 ' + n(x + Math.cos(a1) * r) + ' ' + n(y + Math.sin(a1) * r); return P.path(d, 'none', '#8A5420', 1.5, { 'stroke-linecap': 'round' }) + P.path(d, 'none', col, 0.9, { 'stroke-linecap': 'round' }); }); } },
    { id: 'crisp-garlic', name: 'Garlic chips', sub: 'Crunch', kw: 'garlic chips crisp garlic fried garlic slices', form: 'scatter', cook: 'fried', role: 'garnish', g: 3, w: 40, h: 32, side: { s: 'layer', h: 1, c: '#EBCB82' }, draw: function (P, rnd) { return P.scatter(rnd, 16, 19, 14, function (x, y, i, q) { var d = P.blob(q, 2.8, 2.3, 0.08, 7, x, y, q() * 180); return P.path(d, '#000000', null, 0, { opacity: '0.1', transform: tr(0.4, 0.6) }) + P.path(d, '#EBCB82', '#B9853A', 0.6) + P.circle(x, y, 0.9, '#F6E2AE'); }); } },
    { id: 'nori-strips', name: 'Nori strips', sub: 'Crunch', kw: 'nori strips shredded seaweed kizami nori', form: 'scatter', cook: 'fresh', role: 'garnish', g: 1, w: 40, h: 31, side: { s: 'layer', h: 1, c: '#22301F' }, draw: function (P, rnd) { return P.scatter(rnd, 18, 18, 13, function (x, y, i, q) { var tf = P.at(x, y, q() * 180), l = 8 + q() * 6; return P.g(tf, P.path('M' + n(-l / 2) + ' 0 Q0 ' + n((q() - 0.5) * 3) + ' ' + n(l / 2) + ' 0', 'none', '#22301F', 1.1) + P.line(-l / 2 + 1, -0.2, l / 2 - 2, -0.2, '#4A5A44', 0.25)); }); } },
    { id: 'nori-sheet-strips', name: 'Nori, sheet strips', sub: 'Crunch', kw: 'nori sheets nori sheet strips seaweed sheet cut ribbons sushi onigiri', form: 'stack', cook: 'fresh', role: 'garnish', g: 2, w: 48, h: 34, side: { s: 'layer', h: 1, c: '#26362A' }, draw: function (P, rnd) { return noriStrip(rnd, -2, -10, -8, 40, 6.6) + noriStrip(rnd, 2, -2, 4, 40, 6.6) + noriStrip(rnd, -3, 5, -3, 38, 6.6) + noriStrip(rnd, 3, 11, 9, 40, 6.6); } },
    // heat and pickle
    { id: 'chilli-sliced', name: 'Chilli, sliced', sub: 'Heat and pickle', kw: 'chilli sliced fresh red chilli rings birdseye long red chili', form: 'scatter', cook: 'fresh', role: 'garnish', n: 10, w: 33, h: 26, side: { s: 'layer', h: 2, c: '#C9302A' }, draw: function (P, rnd) { return P.scatter(rnd, 10, 14, 10, function (x, y, i, q) { return chilliRing(q, x, y, 3.4 + q() * 0.6); }, 6); } },
    { id: 'chilli-flakes', name: 'Chilli flakes', sub: 'Heat and pickle', kw: 'chilli flakes dried chilli crushed red pepper flakes chili', form: 'scatter', cook: 'fresh', role: 'garnish', g: 1, w: 41, h: 32, side: { s: 'layer', h: 1, c: '#C9402A' }, draw: function (P, rnd) { return flakes(rnd, 46, 20, 16, ['#C9402A', '#E0602A', '#9E2B20', '#C9402A', '#F2DDA0'], 0.9); } },
    { id: 'wasabi-dollop', name: 'Wasabi', sub: 'Heat and pickle', kw: 'wasabi paste dollop sushi japanese horseradish', form: 'dollop', cook: 'fresh', role: 'garnish', g: 5, w: 15, h: 12, side: { s: 'mound', h: 6, c: '#9CB45A' }, draw: function (P, rnd) { var d = P.blob(rnd, 7.6, 6.2, 0.12, 9); return P.shadow(d, 0.8, 1.1) + P.path(d, '#9CB45A', '#6E8A3A', 0.7) + P.path('M-4 1 Q-1 -4 3 -1 Q1 1.6 -1 0.4', 'none', '#B9CC7A', 1.2, { 'stroke-linecap': 'round' }) + P.crumbs(rnd, 6, 5, 4, ['#88A048', '#B4C878'], 0.5) + P.hl(-2.6, -2.4, 2, 0.9, '#FFFFFF', 0.45, -20); } },
    { id: 'horseradish-grated', name: 'Horseradish, grated', sub: 'Heat and pickle', kw: 'horseradish fresh grated horseradish beef', form: 'mound', cook: 'fresh', role: 'garnish', g: 8, w: 22, h: 18, side: { s: 'mound', h: 5, c: '#F4F0E0' }, draw: function (P, rnd) { var d = P.blob(rnd, 11.5, 8.6, 0.15, 10); return P.shadow(d, 0.8, 1.1) + P.path(d, '#ECE6D2', '#C9C2A8', 0.6) + P.pile(rnd, 44, 10.5, 7.6, function (x, y, i, q) { var a = q() * PI, l = 2 + q() * 2.4; return P.line(x - Math.cos(a) * l, y - Math.sin(a) * l, x + Math.cos(a) * l, y + Math.sin(a) * l, q() < 0.3 ? '#D9D2BA' : '#FBF8EE', 0.9); }); } },
    { id: 'pickled-ginger', name: 'Pickled ginger', sub: 'Heat and pickle', kw: 'pickled ginger gari sushi ginger pink', form: 'cluster', cook: 'cured', role: 'garnish', g: 10, w: 23, h: 25, side: { s: 'leafy', h: 5, c: '#F2B6AC' }, draw: function (P, rnd) { var out = ''; for (var i = 0; i < 6; i++) out += gingerSlice(rnd, 0, 0, i * 60 + rnd() * 20, 0.95 + rnd() * 0.15); return out + gingerSlice(rnd, 0, 0, 200, 0.6) + P.circle(0, 0, 2, '#F8D2CA'); } },
    // spice and dust
    { id: 'dukkah', name: 'Dukkah', sub: 'Spice and dust', kw: 'dukkah dukka egyptian nut spice mix hazelnut sesame coriander', form: 'scatter', cook: 'roasted', role: 'garnish', g: 5, w: 52, h: 37, side: { s: 'layer', h: 1, c: '#C9A06A' }, draw: function (P, rnd) { return P.pile(rnd, 80, 30, 24, function (x, y, i, q) { var k = i % 5; return k === 0 ? seedAt(x, y, q() * 360, 2.2, 1.3, '#F2E6C4', '#BFA978') : k === 1 ? P.circle(x, y, 0.9, '#B9925A', '#8A6A3A', 0.3) : flakeAt(q, x, y, 0.8 + q() * 0.9, pick(q, ['#C9A06A', '#8A5A2E', '#A87A44'])); }); } },
    { id: 'parmesan-grated', name: 'Parmesan, finely grated', sub: 'Spice and dust', kw: 'parmesan grated parmigiano dust snow microplane cheese', form: 'scatter', cook: 'fresh', role: 'garnish', g: 5, w: 48, h: 42, side: { s: 'layer', h: 1, c: '#F4E3A8' }, draw: function (P, rnd) { return P.pile(rnd, 80, 30, 24, function (x, y, i, q) { var a = q() * PI, l = 0.8 + q() * 1.6, c = pick(q, ['#EED890', '#F2E2A8', '#DCC27A']); return i % 3 ? P.line(x - Math.cos(a) * l, y - Math.sin(a) * l, x + Math.cos(a) * l, y + Math.sin(a) * l, c, 1) : P.circle(x, y, 0.6, c); }); } },
    { id: 'mustard-seeds', name: 'Mustard seeds, whole', sub: 'Nuts and seeds', kw: 'mustard seeds whole yellow brown mustard seed pickling spice', form: 'scatter', cook: 'fresh', role: 'garnish', g: 1, w: 44, h: 34, side: { s: 'layer', h: 1, c: '#C9962E' }, draw: function (P, rnd) { return P.scatter(rnd, 46, 22, 17, function (x, y, i, q) { var c = pick(q, ['#C9962E', '#B07A22', '#D9AE48', '#9E6A1E']), r = 0.9 + q() * 0.35; return P.circle(x, y, r, c, ed(c, -0.3), 0.3) + P.circle(x - r * 0.3, y - r * 0.3, r * 0.35, '#F2D98A', null, 0, { opacity: '0.7' }); }); } },
    { id: 'fenugreek-seeds', name: 'Fenugreek seeds', sub: 'Nuts and seeds', kw: 'fenugreek seeds methi whole spice curry', form: 'scatter', cook: 'fresh', role: 'garnish', g: 1, w: 42, h: 32, side: { s: 'layer', h: 1, c: '#C99A44' }, draw: function (P, rnd) { return P.scatter(rnd, 38, 20, 15, function (x, y, i, q) { return fenugreekAt(q, x, y); }); } },
    { id: 'spice-flecks', name: 'Spice rub flecks', sub: 'Spice and dust', kw: 'spice rub dry rub bbq rub seasoning flecks cajun jerk five spice crust', form: 'scatter', cook: 'roasted', role: 'garnish', g: 1, w: 46, h: 36, side: { s: 'layer', h: 1, c: '#7A3A1C' }, draw: function (P, rnd) { return P.pile(rnd, 70, 26, 20, function (x, y, i, q) { return i % 3 ? flakeAt(q, x, y, 0.5 + q() * 0.7, pick(q, ['#7A3A1C', '#9E4A22', '#5E2A14', '#B5652E'])) : P.circle(x, y, 0.45 + q() * 0.3, pick(q, ['#3A2416', '#C98A45'])); }); } },
    { id: 'sumac', name: 'Sumac', sub: 'Spice and dust', kw: 'sumac dust spice middle eastern red', form: 'scatter', cook: 'fresh', role: 'garnish', g: 1, w: 50, h: 39, side: { s: 'layer', h: 1, c: '#8E2A3A' }, draw: function (P, rnd) { return dust(rnd, 130, 30, 24, ['#8E2A3A', '#A8384A', '#6E1E2E', '#9E3048'], 0.75); } },
    { id: 'zaatar', name: 'Za\'atar', sub: 'Spice and dust', kw: 'zaatar za atar zatar thyme sesame sumac spice mix', form: 'scatter', cook: 'fresh', role: 'garnish', g: 2, w: 50, h: 40, side: { s: 'layer', h: 1, c: '#7A7A3A' }, draw: function (P, rnd) { return dust(rnd, 95, 30, 24, ['#7A7A3A', '#5E6A2E', '#9A8A4A', '#6E7438'], 0.8) + seeds(rnd, 16, 24, 18, 2.2, 1.3, ['#F2E6C4'], { edge: '#BFA978' }) + dust(rnd, 10, 20, 15, ['#8E2A3A'], 0.6); } },
    { id: 'salt-flakes', name: 'Sea salt flakes', sub: 'Spice and dust', kw: 'salt flakes sea salt flaky salt pyramid salt', form: 'scatter', cook: 'fresh', role: 'garnish', g: 1, w: 42, h: 31, side: { s: 'layer', h: 1, c: '#FFFFFF' }, draw: saltFlakes('#FFFFFF', '#AEB6BE') },
    { id: 'smoked-salt-flakes', name: 'Smoked salt flakes', sub: 'Spice and dust', kw: 'smoked salt flakes', form: 'scatter', cook: 'smoked', role: 'garnish', g: 1, w: 40, h: 31, of: 'salt-flakes', side: { s: 'layer', h: 1, c: '#9A8470' }, draw: saltFlakes('#A8927C', '#6E5A48') },
    { id: 'rosemary-salt', name: 'Rosemary salt', sub: 'Spice and dust', kw: 'rosemary salt herb salt chips salt', form: 'scatter', cook: 'fresh', role: 'garnish', g: 1, w: 43, h: 33, of: 'salt-flakes', side: { s: 'layer', h: 1, c: '#FFFFFF' }, draw: saltFlakes('#FFFFFF', '#AEB6BE', true) },
    { id: 'oregano-dried', name: 'Oregano, dried', sub: 'Spice and dust', kw: 'oregano dried oregano rigani herb sprinkle', form: 'scatter', cook: 'fresh', role: 'garnish', g: 1, w: 40, h: 31, side: { s: 'layer', h: 1, c: '#7A8A4A' }, draw: function (P, rnd) { return flakes(rnd, 60, 20, 15, ['#7A8A4A', '#6A7A3A', '#8E9A5A', '#5E6E34'], 0.8); } },
    { id: 'furikake', name: 'Furikake', sub: 'Spice and dust', kw: 'furikake japanese rice seasoning nori sesame bonito', form: 'scatter', cook: 'fresh', role: 'garnish', g: 2, w: 41, h: 35, side: { s: 'layer', h: 1, c: '#2E2A28' }, draw: function (P, rnd) { return P.scatter(rnd, 60, 21, 17, function (x, y, i, q) { var k = i % 5; return k === 0 ? P.rect(x - 1.4, y - 0.9, 2.8, 1.8, 0.3, '#22301F', null, 0, { transform: rot(q() * 180, x, y) }) : k === 1 ? seedAt(x, y, q() * 360, 2.2, 1.3, '#F2E6C4', '#BFA978') : k === 2 ? seedAt(x, y, q() * 360, 2.2, 1.3, '#2E2A28', '#141210') : flakeAt(q, x, y, 0.8, pick(q, ['#E8823A', '#C9402A', '#F2B86A'])); }); } },
    { id: 'star-anise', name: 'Star anise', sub: 'Spice and dust', kw: 'star anise whole spice chinese five spice pho aniseed', form: 'cluster', cook: 'fresh', role: 'garnish', n: 2, w: 42, h: 30, side: { s: 'pile', h: 3, c: '#8E4A28' }, draw: function (P, rnd) { return starAniseAt(rnd, -10, -3, 10, 1) + starAniseAt(rnd, 10, 4, 32, 0.9); } },
    { id: 'cardamom-pods', name: 'Cardamom pods, green', sub: 'Spice and dust', kw: 'cardamom pods green cardamom whole spice elaichi chai', form: 'scatter', cook: 'fresh', role: 'garnish', n: 6, w: 32, h: 24, side: { s: 'pile', h: 4, c: '#A3B46E' }, draw: function (P, rnd) { return P.g('translate(-2 1.8)', heap(rnd, 6, 11, 8, function (x, y, i, q) { return cardamomAt(q, x, y, q() * 360, i % 3 === 1); })); } },
    { id: 'peppercorns-black', name: 'Black peppercorns', sub: 'Spice and dust', kw: 'black peppercorns cracked pepper black pepper whole pepper coarse', form: 'scatter', cook: 'fresh', role: 'garnish', g: 2, w: 42, h: 32, side: { s: 'layer', h: 2, c: '#3A302A' }, draw: function (P, rnd) { return P.scatter(rnd, 40, 20, 15, function (x, y, i, q) { return peppercornAt(q, x, y, 1.5 + q() * 0.4, pick(q, ['#3A302A', '#463A30', '#30282A'])); }); } },
    { id: 'peppercorns-pink', name: 'Pink peppercorns', sub: 'Spice and dust', kw: 'pink peppercorns pink pepper baies roses', form: 'scatter', cook: 'fresh', role: 'garnish', g: 1, w: 40, h: 30, side: { s: 'layer', h: 2, c: '#D4566A' }, draw: function (P, rnd) { return P.scatter(rnd, 26, 19, 14, function (x, y, i, q) { return pinkPepperAt(q, x, y, 1.9 + q() * 0.4); }); } },
    { id: 'peppercorns-sichuan', name: 'Sichuan peppercorns', sub: 'Spice and dust', kw: 'sichuan peppercorns szechuan pepper prickly ash numbing mala', form: 'scatter', cook: 'fresh', role: 'garnish', g: 1, w: 40, h: 30, side: { s: 'layer', h: 2, c: '#9A4A30' }, draw: function (P, rnd) { return P.scatter(rnd, 21, 19, 14, function (x, y, i, q) { return sichuanAt(q, x, y, 1.75 + q() * 0.4); }); } },
    { id: 'allspice-berries', name: 'Allspice berries', sub: 'Spice and dust', kw: 'allspice berries pimento whole spice jamaican pepper', form: 'scatter', cook: 'fresh', role: 'garnish', n: 10, w: 28, h: 22, side: { s: 'pile', h: 4, c: '#7A4A2E' }, draw: function (P, rnd) { return P.scatter(rnd, 10, 13, 10, function (x, y, i, q) { return allspiceAt(q, x, y, 2.4 + q() * 0.3); }, 5); } },
    { id: 'cayenne-dusting', name: 'Cayenne pepper, dusted', sub: 'Spice and dust', kw: 'cayenne pepper cayenne chilli powder dusting dust ground red pepper', form: 'scatter', cook: 'fresh', role: 'garnish', g: 1, w: 46, h: 38, side: { s: 'layer', h: 1, c: '#C8442A' }, draw: function (P, rnd) { return dust(rnd, 160, 27, 21, ['#C8442A', '#D8562E', '#A83420', '#E06A3A'], 0.55); } },
    { id: 'garam-masala-dusting', name: 'Garam masala, dusted', sub: 'Spice and dust', kw: 'garam masala indian spice mix dusting dust ground spice', form: 'scatter', cook: 'fresh', role: 'garnish', g: 1, w: 50, h: 38, side: { s: 'layer', h: 1, c: '#8A5A32' }, draw: function (P, rnd) { return dust(rnd, 150, 27, 21, ['#8A5A32', '#7A4A28', '#A06A3A', '#5E3A20'], 0.6); } },
    { id: 'herbes-de-provence', name: 'Herbes de Provence', sub: 'Spice and dust', kw: 'herbes de provence herbs de provence dried herbs french herb mix thyme rosemary savory lavender', form: 'scatter', cook: 'fresh', role: 'garnish', g: 1, w: 46, h: 36, side: { s: 'layer', h: 1, c: '#7A8A4A' }, draw: function (P, rnd) { return P.scatter(rnd, 70, 22, 17, function (x, y, i, q) { var k = i % 7, b = q() * PI; if (k === 0) { var c = pick(q, ['#7E66A6', '#6E5896']); return P.ellipse(x, y, 0.9, 0.5, c, ol(c), 0.2, { transform: rot(b * 57.3, x, y) }); } if (k < 3) return P.line(x - Math.cos(b) * 1.7, y - Math.sin(b) * 1.7, x + Math.cos(b) * 1.7, y + Math.sin(b) * 1.7, pick(q, ['#5A6E3E', '#4E6236']), 0.7); return flakeAt(q, x, y, 0.6 + q() * 0.6, pick(q, ['#7A8A4A', '#8E9A5A', '#6A7A42', '#9AA266'])); }); } },
    // native
    { id: 'finger-lime-pearls', name: 'Finger lime pearls', sub: 'Native', kw: 'finger lime pearls caviar lime citrus caviar native bush tucker', form: 'cluster', cook: 'fresh', role: 'garnish', g: 3, w: 25, h: 21, side: { s: 'pile', h: 3, c: '#CFE08E' }, draw: function (P, rnd) { return P.pile(rnd, 46, 15, 12, function (x, y, i, q) { var c = i % 4 === 0 ? '#F2B0BE' : '#CFE08E'; return P.circle(x, y, 1.4, c, ed(c, -0.3), 0.3, { 'fill-opacity': '0.9' }) + P.circle(x - 0.45, y - 0.45, 0.45, '#FFFFFF', null, 0, { opacity: '0.85' }); }); } },
    { id: 'wattleseed', name: 'Wattleseed, ground', sub: 'Native', kw: 'wattleseed wattle seed roasted ground native spice bush tucker', form: 'scatter', cook: 'roasted', role: 'garnish', g: 1, w: 46, h: 35, side: { s: 'layer', h: 1, c: '#5E3A1E' }, draw: function (P, rnd) { return dust(rnd, 105, 26, 20, ['#5E3A1E', '#7A4E2A', '#3E2614', '#6A4424'], 0.75) + seeds(rnd, 9, 21, 16, 2.6, 1.6, ['#4A2C16'], { edge: '#2A180A', hl: true }); } },
    { id: 'quandong-halves', name: 'Quandong halves', sub: 'Native', kw: 'quandong native peach desert quandong bush tucker red fruit', form: 'half', cook: 'fresh', role: 'garnish', n: 4, w: 27, h: 26, side: { s: 'cup', h: 5, c: '#C8302A' }, draw: function (P, rnd) { return heap(rnd, 4, 9, 7, function (x, y, i, q) { return quandongAt(q, x, y, 7.4 + q()); }); } },
    { id: 'davidson-plum', name: 'Davidson plum halves', sub: 'Native', kw: 'davidson plum davidsons native plum sour plum bush tucker', form: 'half', cook: 'fresh', role: 'garnish', n: 3, w: 36, h: 30, side: { s: 'mound', h: 8, c: '#A8203A' }, draw: function (P, rnd) { return plumHalf(rnd, -9, -5, 9, -10) + plumHalf(rnd, 10, -3, 8.5, 20) + plumHalf(rnd, 0, 8, 8.8, 100); } },
    { id: 'lemon-myrtle-leaves', name: 'Lemon myrtle leaves', sub: 'Native', kw: 'lemon myrtle leaves native herb bush tucker', form: 'leaf', cook: 'fresh', role: 'garnish', n: 3, w: 38, h: 28, side: { s: 'leafy', h: 2, c: '#3F6E2E' }, draw: function (P) { var lance = function (l, w) { return P.smooth([[-l / 2, 0], [-l * 0.3, -w * 0.45], [l * 0.1, -w * 0.5], [l * 0.38, -w * 0.3], [l * 0.56, 0], [l * 0.38, w * 0.3], [l * 0.1, w * 0.5], [-l * 0.3, w * 0.45]]); }; return ovateAt(0, -8, -14, 30, 7.4, '#3F6E2E', { d: lance(30, 7.4), veins: 4, vc: '#8DB46A', shine: 0.4 }) + ovateAt(3, 0, -4, 32, 7.8, '#46762F', { d: lance(32, 7.8), veins: 4, vc: '#8DB46A', shine: 0.4 }) + ovateAt(-1, 8, 8, 28, 7.2, '#3A6A2A', { d: lance(28, 7.2), veins: 4, vc: '#8DB46A', shine: 0.45 }); } },
    // sweet garnish
    { id: 'candied-citrus', name: 'Candied citrus peel', sub: 'Sweet garnish', kw: 'candied orange peel candied citrus lemon peel glace strips', form: 'scatter', cook: 'cured', role: 'garnish', n: 5, w: 34, h: 31, side: { s: 'layer', h: 2, c: '#E8822A' }, draw: function (P, rnd) { return heap(rnd, 5, 6, 8, function (x, y, i, q) { var tf = P.at(x, y, (q() - 0.5) * 70), c = i % 3 ? '#E8822A' : '#EBC23A', d = 'M-14 -1.6 Q0 -4.2 14 -1.2 L14 2.2 Q0 -0.6 -14 2.4 Z'; return sh(d, tf) + P.g(tf, P.path(d, c, ed(c, -0.3), 0.6, { 'fill-opacity': '0.95' }) + P.path('M-12 -0.2 Q0 -2.4 12 0', 'none', P.shade(c, 0.4), 0.8, { opacity: '0.8' }) + P.crumbs(q, 6, 12, 1.4, ['#FFFFFF'], 0.45)); }); } },
    { id: 'hundreds-and-thousands', name: 'Hundreds and thousands', sub: 'Sweet garnish', kw: 'hundreds and thousands sprinkles nonpareils fairy bread rainbow', form: 'scatter', cook: 'fresh', role: 'garnish', g: 2, w: 40, h: 32, side: { s: 'layer', h: 1, c: '#E8506A' }, draw: function (P, rnd) { return P.scatter(rnd, 80, 20, 16, function (x, y, i, q) { var c = ['#E8506A', '#F2C94C', '#5EB04A', '#4A8AD8', '#FFFFFF', '#F28A2A', '#B05AC8'][i % 7]; return P.circle(x, y, 0.85, c, ed(c, -0.25), 0.25); }); } },
    { id: 'mini-marshmallows', name: 'Mini marshmallows', sub: 'Sweet garnish', kw: 'mini marshmallows marshmallow pastel', form: 'scatter', cook: 'fresh', role: 'garnish', n: 12, w: 35, h: 27, side: { s: 'pile', h: 7, c: '#F8C8D8' }, draw: function (P, rnd) { return heap(rnd, 12, 14, 10, function (x, y, i, q) { return marshmallowAt(q, x, y, ['#FFFFFF', '#F8C8D8', '#F8EDB0', '#CDEBC4'][i % 4]); }); } },
    { id: 'pomegranate-seeds', name: 'Pomegranate seeds', sub: 'Sweet garnish', kw: 'pomegranate seeds arils jewels', form: 'scatter', cook: 'fresh', role: 'garnish', g: 10, w: 35, h: 28, side: { s: 'layer', h: 3, c: '#B5203A' }, draw: function (P, rnd) { return P.scatter(rnd, 22, 18, 13, function (x, y, i, q) { return arilAt(q, x, y, 1 + q() * 0.25); }); } },
    { id: 'cacao-nibs', name: 'Cacao nibs', sub: 'Sweet garnish', kw: 'cacao nibs cocoa nibs chocolate crunch', form: 'scatter', cook: 'roasted', role: 'garnish', g: 3, w: 42, h: 30, side: { s: 'layer', h: 2, c: '#4E2A1A' }, draw: function (P, rnd) { return P.scatter(rnd, 26, 19, 14, function (x, y, i, q) { return nibAt(q, x, y, 1.4 + q() * 1); }); } }
  ]);
  // salt flakes: little pyramids seen from above (green rosemary bits when herb is set)
  function saltFlakes(col, edgeCol, herb) {
    return function (P, rnd) {
      var out = P.scatter(rnd, 22, 19, 14, function (x, y, i, q) { var s = 1.4 + q() * 1.6, tf = P.at(x, y, q() * 90); return P.g(tf, P.rect(-s, -s, 2 * s, 2 * s, 0.3, col, edgeCol, 0.4) + P.path('M' + n(-s) + ' ' + n(-s) + ' L' + n(s * 0.1) + ' ' + n(s * 0.1) + ' L' + n(s) + ' ' + n(-s) + ' M' + n(s * 0.1) + ' ' + n(s * 0.1) + ' L' + n(-s) + ' ' + n(s), 'none', edgeCol, 0.3, { opacity: '0.7' })); });
      if (herb) out += P.scatter(rnd, 18, 18, 13, function (x, y, i, q) { var a = q() * PI; return P.line(x - Math.cos(a) * 1.8, y - Math.sin(a) * 1.8, x + Math.cos(a) * 1.8, y + Math.sin(a) * 1.8, i % 2 ? '#3E5E3A' : '#5E7A44', 0.9); });
      return out;
    };
  }

  // the helpers, for the other category files that put a garnish on something
  L.GARNISH = {
    parsley: parsleySprig, coriander: corianderSprig, leaflet: leaflet, basilLeaf: function (x, y, a, s) { return ovateAt(x, y, a, 22 * (s || 1), 14 * (s || 1), '#3F8F2E'); }, ovate: ovateAt,
    dill: dillFrond, rosemary: rosemarySprig, thyme: thymeSprig, mint: mintTip, seedling: seedlingAt, curl: curlAt, viola: violaAt, petal: petalAt, lavender: lavenderSprig,
    wedge: citrusWedge, citrusSlice: citrusSliceAt, segment: segmentAt, CIT: CIT,
    flakes: flakes, flake: flakeAt, dust: dust, seeds: seeds, seed: seedAt, seedD: seedD, bit: bitAt, nut: nutAt, walnut: walnutAt,
    crouton: croutonAt, chilli: chilliRing, ginger: gingerSlice, aril: arilAt, marshmallow: marshmallowAt, salt: saltFlakes, heap: heap
  };
})();
