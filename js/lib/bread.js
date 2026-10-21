/* The drawing library: bread and pastry (see js/library.js for the fields). Drawn around 0,0, 1 unit is about 1.5 mm. */
(function () {
  'use strict';
  var L = window.LK_LIB, C = L.P.C;

  // the bread colours, next to the shared palette
  var B = {
    crumb: '#F2E6C8', cutCrumb: '#F1DDB0', toast: '#DDA052', toastLight: '#E8B96A', toastCrust: '#9A5A22',
    tortilla: '#F1E2BC', nigella: '#2A2420', cream: '#FBF6E8', jam: '#B5243A', choc: '#4A2416'
  };

  /* ---------- shapes for this file ---------- */
  function nn(P, x, y) { return P.n(x) + ' ' + P.n(y); }
  function area(a) { var s = 0; for (var i = 0; i < a.length; i++) { var p = a[i], q = a[(i + 1) % a.length]; s += p[0] * q[1] - q[0] * p[1]; } return s / 2; }
  // a polygon with its corners rounded by r (one number, or one per corner)
  function roundPoly(P, a, r) {
    var m = a.length, d = '';
    for (var i = 0; i < m; i++) {
      var p = a[(i + m - 1) % m], b = a[i], q = a[(i + 1) % m], rr = typeof r === 'number' ? r : r[i];
      var l1 = Math.hypot(p[0] - b[0], p[1] - b[1]) || 1, l2 = Math.hypot(q[0] - b[0], q[1] - b[1]) || 1;
      var k1 = Math.min(rr, l1 / 2) / l1, k2 = Math.min(rr, l2 / 2) / l2;
      d += (i ? ' L' : 'M') + nn(P, b[0] + (p[0] - b[0]) * k1, b[1] + (p[1] - b[1]) * k1) + ' Q' + nn(P, b[0], b[1]) + ' ' + nn(P, b[0] + (q[0] - b[0]) * k2, b[1] + (q[1] - b[1]) * k2);
    }
    return d + ' Z';
  }
  // a convex polygon moved in by d on every side (out when d is below 0)
  function inset(a, d) {
    var m = a.length, sg = area(a) > 0 ? 1 : -1, ln = [], out = [], i;
    for (i = 0; i < m; i++) {
      var p = a[i], q = a[(i + 1) % m], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
      ln.push([p[0] - dy / l * sg * d, p[1] + dx / l * sg * d, dx, dy]);
    }
    for (i = 0; i < m; i++) {
      var A = ln[(i + m - 1) % m], Bq = ln[i], cr = A[2] * Bq[3] - A[3] * Bq[2];
      if (Math.abs(cr) < 1e-9) { out.push([Bq[0], Bq[1]]); continue; }
      var t = ((Bq[0] - A[0]) * Bq[3] - (Bq[1] - A[1]) * Bq[2]) / cr;
      out.push([A[0] + A[2] * t, A[1] + A[3] * t]);
    }
    return out;
  }
  // points turned by deg round 0,0, then moved
  function shift(a, dx, dy, deg) {
    var r = (deg || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    return a.map(function (p) { return [p[0] * c - p[1] * s + dx, p[0] * s + p[1] * c + dy]; });
  }
  function centre(a) { var x = 0, y = 0; a.forEach(function (p) { x += p[0]; y += p[1]; }); return [x / a.length, y / a.length]; }
  function grow(a, k) { var c = centre(a); return a.map(function (p) { return [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k]; }); }
  function inPoly(a, x, y) {
    var sg = area(a) > 0 ? 1 : -1;
    for (var i = 0; i < a.length; i++) { var p = a[i], q = a[(i + 1) % a.length]; if (((q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0])) * sg < 0) return false; }
    return true;
  }
  // count points inside a convex polygon, back to front
  function spotsIn(rnd, count, a) {
    var xs = a.map(function (p) { return p[0]; }), ys = a.map(function (p) { return p[1]; }), out = [];
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    for (var t = 0; out.length < count && t < count * 40; t++) { var x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0); if (inPoly(a, x, y)) out.push([x, y]); }
    return out.sort(function (p, q) { return p[1] - q[1]; });
  }
  // parallel lines at ang degrees, gap apart, inside a convex polygon (grill marks, scoring), each trimmed at the ends
  function hatch(a, ang, gap, trim) {
    var r = ang * Math.PI / 180, dx = Math.cos(r), dy = Math.sin(r), nx = -dy, ny = dx, m = a.length, sg = area(a) > 0 ? 1 : -1, out = [];
    var pr = a.map(function (p) { return p[0] * nx + p[1] * ny; }), lo = Math.min.apply(null, pr), hi = Math.max.apply(null, pr);
    var k = Math.floor((hi - lo) / gap), first = (lo + hi) / 2 - (k - 1) / 2 * gap;
    for (var j = 0; j < k; j++) {
      var o = first + j * gap, bx = nx * o, by = ny * o, t0 = -1e9, t1 = 1e9, ok = true;
      for (var i = 0; i < m; i++) {
        var p = a[i], q = a[(i + 1) % m], mx = -(q[1] - p[1]) * sg, my = (q[0] - p[0]) * sg;
        var num = (bx - p[0]) * mx + (by - p[1]) * my, den = dx * mx + dy * my;
        if (Math.abs(den) < 1e-9) { if (num < 0) ok = false; continue; }
        var t = -num / den;
        if (den > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
      }
      t0 += trim || 0; t1 -= trim || 0;
      if (ok && t1 > t0) out.push([bx + dx * t0, by + dy * t0, bx + dx * t1, by + dy * t1]);
    }
    return out;
  }
  // the edge of a polygon as close points, each with its outward normal
  function edgePts(a, step) {
    var m = a.length, sg = area(a) > 0 ? 1 : -1, out = [];
    function nrm(i) { var p = a[i], q = a[(i + 1) % m], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; return [dy / l * sg, -dx / l * sg]; }
    for (var i = 0; i < m; i++) {
      var p = a[i], q = a[(i + 1) % m], n0 = nrm((i + m - 1) % m), n1 = nrm(i), cx = n0[0] + n1[0], cy = n0[1] + n1[1], cl = Math.hypot(cx, cy) || 1;
      out.push([p[0], p[1], cx / cl, cy / cl]);
      var len = Math.hypot(q[0] - p[0], q[1] - p[1]), k = Math.max(1, Math.round(len / step));
      for (var j = 1; j < k; j++) out.push([p[0] + (q[0] - p[0]) * j / k, p[1] + (q[1] - p[1]) * j / k, n1[0], n1[1]]);
    }
    return out;
  }
  // a filling peeking out past a polygon: out by d at most, wavy, tucked in here and there
  function peek(P, rnd, a, d, col, o) {
    o = o || {};
    var ph = rnd() * 6.28, f = o.freq || 0.45, pts = edgePts(a, o.step || 6).map(function (p, i) {
      var k = o.even ? 1 : 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(ph + i * f)), dd = d * k + (o.wave ? (i % 2 ? o.wave : -o.wave) : 0) + (rnd() - 0.5) * 0.8;
      return [p[0] + p[2] * dd, p[1] + p[3] * dd];
    });
    return P.path(P.smooth(pts), col, o.edge || P.shade(col, -0.25), o.sw || 0.7);
  }
  // a cubic bezier: the point at t, its direction, and the path
  function bez(c, t) { var u = 1 - t; return [u * u * u * c[0][0] + 3 * u * u * t * c[1][0] + 3 * u * t * t * c[2][0] + t * t * t * c[3][0], u * u * u * c[0][1] + 3 * u * u * t * c[1][1] + 3 * u * t * t * c[2][1] + t * t * t * c[3][1]]; }
  function bezDir(c, t) { var u = 1 - t, x = 3 * u * u * (c[1][0] - c[0][0]) + 6 * u * t * (c[2][0] - c[1][0]) + 3 * t * t * (c[3][0] - c[2][0]), y = 3 * u * u * (c[1][1] - c[0][1]) + 6 * u * t * (c[2][1] - c[1][1]) + 3 * t * t * (c[3][1] - c[2][1]); return Math.atan2(y, x) * 180 / Math.PI; }
  function bezD(P, c) { return 'M' + nn(P, c[0][0], c[0][1]) + ' C' + nn(P, c[1][0], c[1][1]) + ' ' + nn(P, c[2][0], c[2][1]) + ' ' + nn(P, c[3][0], c[3][1]); }
  function rrD(P, x, y, w, h, r) { return roundPoly(P, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], r); }
  function circleD(P, x, y, r) { return 'M' + nn(P, x - r, y) + ' A' + nn(P, r, r) + ' 0 1 0 ' + nn(P, x + r, y) + ' A' + nn(P, r, r) + ' 0 1 0 ' + nn(P, x - r, y) + ' Z'; }
  function lensD(P, l, w) { return 'M' + nn(P, -l / 2, 0) + ' Q0 ' + P.n(-w) + ' ' + nn(P, l / 2, 0) + ' Q0 ' + P.n(w) + ' ' + nn(P, -l / 2, 0) + ' Z'; }
  // angles in degrees, 0 to the right, turning clockwise on screen
  function polar(r, a, cx, cy) { var t = a * Math.PI / 180; return [(cx || 0) + Math.cos(t) * r, (cy || 0) + Math.sin(t) * r]; }
  function sectorD(P, r, a0, a1, cx, cy) { var p = polar(r, a0, cx, cy), q = polar(r, a1, cx, cy); return 'M' + nn(P, cx || 0, cy || 0) + ' L' + nn(P, p[0], p[1]) + ' A' + nn(P, r, r) + ' 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + nn(P, q[0], q[1]) + ' Z'; }
  function sectorPts(r, a0, a1, cx, cy, k) { var out = [[cx || 0, cy || 0]]; k = k || 8; for (var i = 0; i <= k; i++) out.push(polar(r, a0 + (a1 - a0) * i / k, cx, cy)); return out; }
  function arcD(P, r, a0, a1, cx, cy) { var p = polar(r, a0, cx, cy), q = polar(r, a1, cx, cy); return 'M' + nn(P, p[0], p[1]) + ' A' + nn(P, r, r) + ' 0 0 1 ' + nn(P, q[0], q[1]); }
  function inSector(rnd, r0, r1, a0, a1, cx, cy) { return polar(r0 + Math.sqrt(rnd()) * (r1 - r0), a0 + rnd() * (a1 - a0), cx, cy); }
  // a wavy edge round an ellipse (lettuce frill, crimped pastry)
  function frillD(P, rnd, rx, ry, k, amp, cx, cy) {
    var pts = [];
    for (var i = 0; i < k; i++) { var a = i / k * Math.PI * 2, f = (i % 2 ? 1 : -1) * amp * (0.6 + rnd() * 0.7); pts.push([(cx || 0) + Math.cos(a) * (rx + f), (cy || 0) + Math.sin(a) * (ry + f)]); }
    return P.smooth(pts);
  }
  function fluteD(P, r, k, amp) {
    var pts = [];
    for (var i = 0; i < k * 2; i++) { var a = i / (k * 2) * Math.PI * 2, rr = r - amp + (i % 2 ? -amp : amp); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    return P.smooth(pts);
  }
  function shadowEO(P, d, dx, dy) { return P.path(d, '#000000', null, 0, { opacity: '0.12', transform: 'translate(' + P.n(dx || 2) + ' ' + P.n(dy || 2.5) + ')', 'fill-rule': 'evenodd' }); }
  function seed(P, x, y, a, col, s) { s = s || 1; return P.ellipse(x, y, 1.9 * s, 1 * s, col, P.shade(col, -0.2), 0.3, { transform: 'rotate(' + P.n(a) + ' ' + P.n(x) + ' ' + P.n(y) + ')' }); }
  function seedsIn(P, rnd, count, rx, ry, cols, s, cx, cy) {
    return P.spots(rnd, count, rx, ry).map(function (p, i) { return seed(P, (cx || 0) + p[0], (cy || 0) + p[1], rnd() * 180, cols[i % cols.length], s); }).join('');
  }
  function dust(P, rnd, count, rx, ry, op, r) { return P.g('', P.crumbs(rnd, count, rx, ry, ['#FFFFFF'], r || 1), { opacity: String(op || 0.6) }); }
  function lines(P, segs, col, sw, x) { return segs.map(function (s) { return P.line(s[0], s[1], s[2], s[3], col, sw, x); }).join(''); }

  /* ---------- buns and rolls ---------- */
  // a bun top from above: a dome, lighter on top, seeds, a glaze for brioche, a cross for a hot cross bun
  function bunTop(o) {
    o = o || {};
    return function (P, rnd) {
      var r = o.r || 36, ry = r * (o.sy || 0.96), col = o.col || C.bun, top = o.top || C.bunTop, hi = o.hi || C.bunHi;
      var d = P.blob(rnd, r, ry, 0.025, 14), out = o.noShadow ? '' : P.shadow(d, 2.5, 3);
      out += P.path(d, col, P.shade(col, -0.3), 1.2);
      out += P.path(P.blob(rnd, r * 0.85, ry * 0.83, 0.03, 12, -r * 0.04, -r * 0.06), top, null, 0);
      out += P.path(P.blob(rnd, r * 0.5, ry * 0.44, 0.06, 10, -r * 0.15, -r * 0.2), hi, null, 0, { opacity: '0.7' });
      if (o.currants) out += P.scatter(rnd, o.currants, r * 0.72, ry * 0.7, function (x, y, i, q) { return P.path(P.blob(q, 1.7 + q(), 1.3 + q() * 0.8, 0.3, 6, x, y), '#3A1E14', null, 0); });
      if (o.cross !== undefined) { var cw = r * 0.17, cl = r * 0.84; out += P.g(P.at(0, 0, o.cross), P.rect(-cl, -cw / 2, cl * 2, cw, cw / 2, '#F4E9CF', null, 0) + P.rect(-cw / 2, -cl, cw, cl * 2, cw / 2, '#F4E9CF', null, 0) + P.path('M' + nn(P, -cl, cw / 2) + ' H' + P.n(cl) + ' M' + nn(P, cw / 2, -cl) + ' V' + P.n(cl), 'none', '#D9C49A', 0.6, { opacity: '0.7' })); }
      out += P.hl(-r * 0.3, -ry * 0.4, r * 0.26, r * 0.09, '#FFFFFF', o.gloss ? 0.6 : 0.28, -30);
      if (o.gloss) out += P.hl(r * 0.25, r * 0.3, r * 0.14, r * 0.05, '#FFFFFF', 0.25, -30);
      if (o.seeds) out += seedsIn(P, rnd, o.seeds, r * 0.7, ry * 0.68, o.seedCols || [C.sesame], o.ss || 1);
      if (o.flour) out += dust(P, rnd, o.flour, r * 0.75, ry * 0.72, 0.55, 1.3);
      return out;
    };
  }
  // a bun base, cut side up and toasted (the start of a burger build)
  function bunBase(o) {
    o = o || {};
    return function (P, rnd) {
      var r = o.r || 36, col = o.col || C.bun, crumb = o.crumb || B.cutCrumb, d = P.blob(rnd, r, r * 0.97, 0.02, 14);
      var out = P.shadow(d, 2, 2.5) + P.path(d, col, P.shade(col, -0.3), 1.1);
      out += P.path(P.blob(rnd, r - 3, r * 0.97 - 3, 0.02, 14), crumb, P.shade(crumb, -0.12), 0.6);
      if (o.toast !== false) out += P.path(P.blob(rnd, r * 0.7, r * 0.66, 0.1, 11), '#D9A55A', null, 0, { opacity: '0.5' });
      out += P.scatter(rnd, Math.round(r / 2), r * 0.78, r * 0.75, function (x, y, i, q) { return P.ellipse(x, y, 0.8 + q() * 1.4, 0.6 + q() * 0.8, P.shade(crumb, -0.18), null, 0, { opacity: '0.8' }); });
      return out;
    };
  }
  // one filling under a bun top of radius r, peeking out round the edge (towards angle a, in degrees)
  function under(P, rnd, k, r, a) {
    a = a || 0;
    var at = function (dist) { return polar(dist, a); }, p, i, s = '';
    if (k === 'lettuce') return P.path(frillD(P, rnd, r + 6, r + 5.5, 30, 2.4), C.lettuce, C.greenDark, 0.8) + P.path(frillD(P, rnd, r + 3, r + 2.5, 26, 1.2), C.greenLight, null, 0, { opacity: '0.7' });
    if (k === 'patty') {
      s = P.path(P.blob(rnd, r + 3.5, r + 3, 0.04, 14), C.beefCrust, P.shade(C.beefCrust, -0.35), 1.1);
      for (i = 0; i < 18; i++) { p = polar(r + 0.5 + rnd() * 2.5, rnd() * 360); s += P.circle(p[0], p[1], 0.7 + rnd() * 0.7, i % 2 ? '#4A2E14' : '#9A6430', null, 0); }
      return s;
    }
    if (k === 'schnitzel') return (L.MEAT && L.MEAT.crumbed) ? L.MEAT.crumbed({ rx: r + 8, ry: r + 4 })(P, rnd) : P.path(P.blob(rnd, r + 8, r + 4, 0.08, 14), C.golden, P.shade(C.golden, -0.3), 1.1);
    if (k === 'cheese') { var h = (r + 7) / Math.SQRT2; return P.g(P.at(0, 0, a), P.path(roundPoly(P, [[-h, -h], [h, -h], [h, h], [-h, h]], 3), C.cheese, P.shade(C.cheese, -0.2), 0.8)); }
    if (k === 'beet') { var rb = r * 0.72; p = at(r + 6 - rb); return P.circle(p[0], p[1], rb, C.beet, P.shade(C.beet, -0.3), 0.9) + P.circle(p[0], p[1], rb - 2.5, 'none', P.shade(C.beet, 0.25), 0.8); }
    if (k === 'tomato') { var rt = r * 0.62; p = at(r + 4 - rt); return P.circle(p[0], p[1], rt, C.tomato, P.shade(C.tomato, -0.25), 0.8) + P.circle(p[0], p[1], rt - 2.2, C.tomatoLight, null, 0, { opacity: '0.6' }); }
    if (k === 'pineapple') { var rp = r * 0.7; p = at(r + 5 - rp); return P.g(P.at(p[0], p[1]), P.path(P.ringD(rnd, rp, rp * 0.3, 0.02), '#F2CB55', '#C9A030', 0.8, { 'fill-rule': 'evenodd' }) + P.circle(0, 0, rp - 2, 'none', '#F7DE8A', 1)); }
    if (k === 'egg') { var re = r * 0.8; p = at(r + 7 - re); return P.path(P.blob(rnd, re, re * 0.92, 0.12, 12, p[0], p[1]), '#FFFFFF', '#D9B07A', 1.3); }
    if (k === 'onion') { p = at(r - 4); return P.circle(p[0], p[1], 9, 'none', C.onion, 1.6) + P.circle(p[0] + 3, p[1] - 2, 7, 'none', '#B86AA6', 1.2); }
    if (k === 'bacon') { p = at(3); return P.g(P.at(p[0], p[1], a + 90), (L.MEAT && L.MEAT.rasher) ? L.MEAT.rasher(P, rnd) : P.path('M-40 -8 Q-20 -14 0 -8 T40 -8 L40 7 Q20 1 0 7 T-40 7 Z', '#B5503F', '#8A3426', 1)); }
    return '';
  }
  // a burger from above: the fillings peeking out round the bun top. layers: [kind, angle] from the bottom up
  function burger(o) {
    o = o || {};
    var top = bunTop({ r: o.r || 36, seeds: o.seeds === undefined ? 24 : o.seeds, ss: o.ss, col: o.col, top: o.top, hi: o.hi, gloss: o.gloss });
    return function (P, rnd) {
      var r = o.r || 36, out = P.shadow(P.blob(rnd, r + 6, r + 5, 0.04, 12), 3, 4);
      (o.layers || [['lettuce'], ['patty'], ['cheese', 20]]).forEach(function (l) { out += under(P, rnd, l[0], r, l[1]); });
      return out + top(P, rnd);
    };
  }
  // one band of a cut face or side view, from x0 to x1 and y0 (top) to y1
  function bandD(P, rnd, x0, x1, y0, y1, wav, k) {
    var pts = [], i, ym = (y0 + y1) / 2, b = (y1 - y0) * 0.4;
    k = k || 9;
    for (i = 0; i <= k; i++) pts.push([x0 + (x1 - x0) * i / k, y0 + (wav ? (i % 2 ? wav : -wav) * (0.5 + rnd() * 0.5) : 0)]);
    pts.push([x1 + b, ym]);
    for (i = k; i >= 0; i--) pts.push([x0 + (x1 - x0) * i / k, y1 + (wav ? (i % 2 ? -wav : wav) * (0.5 + rnd() * 0.5) : 0)]);
    pts.push([x0 - b, ym]);
    return P.smooth(pts);
  }
  function band(P, rnd, k, x0, x1, y0, y1) {
    var h = y1 - y0, d, s = '';
    if (k === 'bun') {
      d = 'M' + nn(P, x0, y1) + ' L' + nn(P, x0, y1 - h * 0.35) + ' C' + nn(P, x0, y0 - h * 0.2) + ' ' + nn(P, x1, y0 - h * 0.2) + ' ' + nn(P, x1, y1 - h * 0.35) + ' L' + nn(P, x1, y1) + ' Z';
      var di = 'M' + nn(P, x0 + 2.4, y1) + ' L' + nn(P, x0 + 2.4, y1 - h * 0.33) + ' C' + nn(P, x0 + 2.4, y0 - h * 0.05) + ' ' + nn(P, x1 - 2.4, y0 - h * 0.05) + ' ' + nn(P, x1 - 2.4, y1 - h * 0.33) + ' L' + nn(P, x1 - 2.4, y1) + ' Z';
      s = P.path(d, C.bun, P.shade(C.bun, -0.3), 1.1) + P.path(di, B.cutCrumb, null, 0);
      s += P.scatter(rnd, 9, (x1 - x0) * 0.36, h * 0.25, function (x, y, i, q) { return P.ellipse(x, y1 - h * 0.35 + y, 0.8 + q(), 0.6 + q() * 0.6, '#D9BF8A', null, 0); });
      for (var i = 0; i < 5; i++) { var t = 0.15 + i * 0.17, p = bez([[x0, y1 - h * 0.35], [x0, y0 - h * 0.2], [x1, y0 - h * 0.2], [x1, y1 - h * 0.35]], t); s += seed(P, p[0], p[1] - 0.6, 0, C.sesame, 0.9); }
      return s;
    }
    if (k === 'base') {
      d = roundPoly(P, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], [1, 1, 5, 5]);
      return P.path(d, C.bun, P.shade(C.bun, -0.3), 1.1) + P.path(roundPoly(P, [[x0 + 2.2, y0], [x1 - 2.2, y0], [x1 - 2.2, y1 - 2.2], [x0 + 2.2, y1 - 2.2]], [1, 1, 4, 4]), B.cutCrumb, null, 0) + P.path(roundPoly(P, [[x0 + 3, y0], [x1 - 3, y0], [x1 - 3, y0 + 1.6], [x0 + 3, y0 + 1.6]], 0.6), '#D9A55A', null, 0, { opacity: '0.6' });
    }
    var T = {
      lettuce: [C.lettuce, -3.5, 3.5, 1.4], tomato: [C.tomato, 2, -1, 0.3], cheese: [C.cheese, -1, 2, 0.2], patty: [C.beefCrust, -2, 2, 0.5],
      sauce: [C.aioli, 1, 1, 0.5], ketchup: [C.sauceRed, 1, 1, 0.5], bacon: ['#B5503F', -2, 3, 1], beet: [C.beet, 1, -1, 0.3], egg: ['#FFFFFF', -1, -1, 0.6],
      pineapple: ['#F2CB55', 1, 0, 0.2], onion: ['#B98A4A', 0, 1, 0.8], schnitzel: [C.golden, -4, 4, 0.6], steak: [C.beefCrust, -2, -1, 0.6]
    }[k];
    if (!T) return '';
    s = P.path(bandD(P, rnd, x0 - T[1], x1 + T[2], y0, y1, T[3]), T[0], P.shade(T[0], -0.25), 0.7);
    if (k === 'patty' || k === 'steak') s += P.path(bandD(P, rnd, x0 + 2, x1 - 2, y0 + h * 0.3, y1 - h * 0.3, 0.4), '#8E5A2E', null, 0, { opacity: '0.7' }) + P.g(P.at(0, (y0 + y1) / 2), P.crumbs(rnd, 10, (x1 - x0) * 0.42, h * 0.3, ['#4A2E14'], 0.6));
    if (k === 'tomato') s += P.g(P.at(0, (y0 + y1) / 2), P.crumbs(rnd, 6, (x1 - x0) * 0.4, 0.5, ['#F2B8A8'], 0.7));
    if (k === 'cheese') s += P.path('M' + nn(P, x1 - 2, y1 - 0.5) + ' Q' + nn(P, x1 + 1, y1 + 4) + ' ' + nn(P, x1 - 1, y1 + 5) + ' Q' + nn(P, x1 - 3, y1 + 3) + ' ' + nn(P, x1 - 5, y1 - 0.5) + ' Z', C.cheese, null, 0);
    if (k === 'bacon') s += P.path(bandD(P, rnd, x0, x1 + 1, y0 + h * 0.4, y1 - h * 0.4, 0.8), '#F0D8D0', null, 0, { opacity: '0.8' });
    if (k === 'egg') s += P.ellipse((x0 + x1) / 2 + 4, (y0 + y1) / 2, (x1 - x0) * 0.18, h * 0.4, C.yolk, '#D9A62A', 0.6);
    if (k === 'lettuce') s += P.path(bandD(P, rnd, x0, x1 + 1, y0 + h * 0.15, y0 + h * 0.4, 0.8), C.greenLight, null, 0, { opacity: '0.7' });
    return s;
  }
  // a burger's cut face from bun top to bun base (a half lying cut side up, or the side view); layers [kind, height]
  function burgerSection(o) {
    o = o || {};
    return function (P, rnd) {
      var w = o.w || 72, x = w / 2, ls = o.layers || [['bun', 16], ['sauce', 2], ['lettuce', 4], ['tomato', 4], ['cheese', 3], ['patty', 11], ['base', 9]];
      var H = ls.reduce(function (s, l) { return s + l[1]; }, 0), y = -H / 2, bands = [];
      ls.forEach(function (l) { bands.push({ k: l[0], y0: y, y1: y + l[1] }); y += l[1]; });
      var out = o.noShadow ? '' : P.shadow(rrD(P, -x, -H / 2 + 3, w, H - 3, 8), 2, 3);
      bands.reverse().forEach(function (b) { out += band(P, rnd, b.k, -x, x, b.y0, b.y1); });
      return out;
    };
  }
  // a burger cut in half: one half from above, the other lying on its side to show the layers
  function burgerHalved(o) {
    o = o || {};
    var sec = burgerSection({ layers: o.layers });
    return function (P, rnd) {
      var r = 36, half = function (rr, cy) { return 'M' + nn(P, -rr, cy || 0) + ' A' + nn(P, rr, rr) + ' 0 0 1 ' + nn(P, rr, cy || 0) + ' Z'; };
      var fr = [], i;
      for (i = 0; i <= 18; i++) { var a = Math.PI + Math.PI * i / 18, rr = r + 6 + (i % 2 ? 1.8 : -1.8); fr.push([Math.cos(a) * rr, Math.min(0, Math.sin(a) * rr)]); }
      var top = P.shadow(half(r + 5), 2.5, 3) + P.path(P.smooth(fr, true) + ' Z', C.lettuce, C.greenDark, 0.8) + P.path(half(r + 3), C.beefCrust, P.shade(C.beefCrust, -0.35), 1);
      top += P.path(half(r), C.bun, P.shade(C.bun, -0.3), 1.2) + P.path(half(r * 0.84, -1), C.bunTop, null, 0) + P.hl(-r * 0.32, -r * 0.5, r * 0.24, r * 0.08, '#FFFFFF', 0.3, -25);
      top += seedsIn(P, rnd, 12, r * 0.62, r * 0.26, [C.sesame], 1, 0, -r * 0.45);
      // the cut edge, tipped a little towards us
      top += P.rect(-r, 0, r * 2, 2, 0.8, B.cutCrumb, null, 0) + P.rect(-r - 2, 2, r * 2 + 4, 1.6, 0.8, C.lettuce, null, 0) + P.rect(-r - 1, 3.6, r * 2 + 2, 3, 1.2, C.beefCrust, null, 0);
      return P.g(P.at(0, -12), top) + P.g(P.at(0, 25), sec(P, rnd));
    };
  }
  // a long roll split along the top (hot dog bun); dog: true adds the sausage, mustard and sauce
  function hotDog(o) {
    o = o || {};
    return function (P, rnd) {
      var l = o.len || 120, w = o.w || 40, gap = o.dog ? 9 : 5, lh = (w - gap) / 2 - 1, out = '';
      var d = P.slab(rnd, l / 2, w / 2, 0.55, 0.015, 16);
      out += P.shadow(d, 2.5, 3) + P.path(d, C.bun, P.shade(C.bun, -0.3), 1.2);
      out += P.path(P.slab(rnd, l / 2 - 5, gap / 2 + 1.5, 0.6, 0.02, 12), B.cutCrumb, P.shade(B.cutCrumb, -0.2), 0.6);
      if (o.dog) out += (L.MEAT && L.MEAT.sausage) ? L.MEAT.sausage({ len: l + 8, w: 15, col: '#B5503A' })(P) : P.path(rrD(P, -l / 2 - 4, -7.5, l + 8, 15, 7.5), '#B5503A', '#7E3424', 1.2);
      [-1, 1].forEach(function (sy) {
        var cy = sy * (gap / 2 + lh / 2 + 0.5);
        out += P.g(P.at(0, cy), P.path(P.slab(rnd, l / 2 - 4, lh / 2, 0.5, 0.02, 14), C.bunTop, P.shade(C.bun, -0.12), 0.7));
        out += P.hl(-l * 0.1, cy - lh * 0.15, l * 0.3, lh * 0.18, '#FFFFFF', 0.28);
      });
      if (o.dog) {
        var zz = 'M' + nn(P, -l / 2 + 10, 0), i;
        for (i = 1; i <= 14; i++) zz += ' L' + nn(P, -l / 2 + 10 + i * (l - 20) / 14, i % 2 ? -3.5 : 3.5);
        out += P.path(zz, 'none', '#E8C22A', 2.4, { 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
        out += P.path('M' + nn(P, -l / 2 + 14, 2) + ' Q' + nn(P, -l / 4, -6) + ' 0 1 T' + nn(P, l / 2 - 14, 0), 'none', C.sauceRed, 2.4, { 'stroke-linecap': 'round' });
      }
      return out;
    };
  }
  // a Turkish bread top on a polygon: golden, a pressed lattice, sesame and nigella seeds
  function turkTop(P, rnd, a, rr, o) {
    o = o || {};
    var d = roundPoly(P, a, rr), inner = inset(a, 3.5), out = (o.noShadow ? '' : P.shadow(d, 2.5, 3)) + P.path(d, '#C2803A', P.shade('#C2803A', -0.3), 1.2);
    out += P.path(roundPoly(P, inner, typeof rr === 'number' ? rr * 0.8 : rr.map(function (x) { return x * 0.8; })), '#DCA458', null, 0);
    var lat = inset(a, 9);
    [40, -40].forEach(function (ang) { out += lines(P, hatch(lat, ang, 17, 2), '#B9772E', 2.2, { opacity: '0.5' }) + lines(P, hatch(lat, ang, 17, 3).map(function (s) { return [s[0] + 1.2, s[1] + 1.2, s[2] + 1.2, s[3] + 1.2]; }), '#EBC07A', 1, { opacity: '0.7' }); });
    var c = centre(a);
    out += P.hl(c[0] - 8, c[1] - 10, 14, 3, '#FFFFFF', 0.28, -10);
    out += spotsIn(rnd, o.seeds || 22, inset(a, 6)).map(function (p, i) { return seed(P, p[0], p[1], rnd() * 180, i % 3 === 2 ? B.nigella : C.sesame, 0.85); }).join('');
    return out;
  }
  // a crusty roll: a dome with a slash (or two) showing the crumb, and a dusting of flour
  function roll(o) {
    o = o || {};
    return function (P, rnd) {
      var rx = o.rx || 31, ry = o.ry || 28, col = o.col || '#C68A48', top = o.top || '#D9A35E';
      var d = P.blob(rnd, rx, ry, 0.04, 12), out = P.shadow(d, 2.5, 3) + P.path(d, col, P.shade(col, -0.3), 1.2);
      out += P.path(P.blob(rnd, rx * 0.84, ry * 0.8, 0.05, 11, -1, -1.5), top, null, 0);
      out += P.path(P.blob(rnd, rx * 0.45, ry * 0.36, 0.08, 9, -rx * 0.2, -ry * 0.25), P.shade(top, 0.25), null, 0, { opacity: '0.6' });
      (o.cuts || [[-18, 0]]).forEach(function (c) {
        out += P.g(P.at(0, c[1], c[0]), P.path('M' + nn(P, -rx * 0.62, 0) + ' Q0 ' + P.n(-ry * 0.22) + ' ' + nn(P, rx * 0.62, 0) + ' Q0 ' + P.n(ry * 0.14) + ' ' + nn(P, -rx * 0.62, 0) + ' Z', '#EED8A8', P.shade(col, -0.2), 0.9) + P.path('M' + nn(P, -rx * 0.5, ry * 0.02) + ' Q0 ' + P.n(ry * 0.12) + ' ' + nn(P, rx * 0.5, ry * 0.02), 'none', P.shade(col, -0.1), 1, { opacity: '0.7' }));
      });
      if (o.flour) out += dust(P, rnd, o.flour, rx * 0.8, ry * 0.75, 0.55, 1.2);
      return out + P.hl(-rx * 0.3, -ry * 0.42, rx * 0.25, ry * 0.08, '#FFFFFF', 0.3, -20);
    };
  }
  function ciabatta(P, rnd) {
    var d = P.slab(rnd, 50, 30, 0.6, 0.07, 16), out = P.shadow(d, 2.5, 3) + P.path(d, '#C99A5E', '#9E7240', 1.2);
    out += P.path(P.slab(rnd, 45, 26, 0.6, 0.08, 14), '#DDB47A', null, 0);
    out += P.path('M-30 -6 Q-14 -12 2 -5 M8 8 Q20 3 32 9', 'none', '#B98A50', 1.4, { 'stroke-linecap': 'round', opacity: '0.8' });
    out += P.scatter(rnd, 7, 36, 18, function (x, y, i, q) { return P.path(P.blob(q, 6 + q() * 9, 4 + q() * 5, 0.25, 8, x, y), '#FFFFFF', null, 0, { opacity: '0.5' }); });
    return out + dust(P, rnd, 24, 42, 24, 0.7, 0.9) + P.hl(-20, -16, 16, 3, '#FFFFFF', 0.3, -8);
  }
  // spots on a ring between r0 and r1 (bagels)
  function ringSpots(rnd, count, r0, r1) { var out = []; for (var i = 0; i < count; i++) out.push(polar(r0 + rnd() * (r1 - r0), rnd() * 360)); return out.sort(function (p, q) { return p[1] - q[1]; }); }
  function bagel(P, rnd) {
    var top = P.ringD(rnd, 31, 8.5, 0.03), cut = P.ringD(rnd, 31, 8.5, 0.03), face = P.ringD(rnd, 28.5, 10.8, 0.03), eo = { 'fill-rule': 'evenodd' };
    var t = shadowEO(P, top) + P.path(top, '#B5753A', '#7E4A1E', 1.1, eo) + P.circle(0, 0, 20, 'none', '#C98A4A', 9, { opacity: '0.7' }) + P.path(arcD(P, 22, 200, 260, 0, 0), 'none', '#FFFFFF', 3, { opacity: '0.35', 'stroke-linecap': 'round' });
    t += ringSpots(rnd, 20, 13, 27).map(function (p) { return seed(P, p[0], p[1], rnd() * 180, C.sesame, 0.9); }).join('');
    var c = shadowEO(P, cut) + P.path(cut, '#B5753A', '#7E4A1E', 1.1, eo) + P.path(face, '#F1E2C0', '#D9C49A', 0.6, eo);
    c += ringSpots(rnd, 6, 14, 24).map(function (p) { return P.path(P.blob(rnd, 3 + rnd() * 3, 2 + rnd() * 2, 0.3, 7, p[0], p[1]), '#E3C48A', null, 0, { opacity: '0.7' }); }).join('');
    c += ringSpots(rnd, 16, 13, 26).map(function (p) { return P.ellipse(p[0], p[1], 0.8 + rnd() * 1.2, 0.6 + rnd() * 0.6, '#D9C49A', null, 0); }).join('');
    return P.g(P.at(22, 6), t) + P.g(P.at(-20, -4), c);
  }
  function pretzel(P, rnd) {
    var b1 = [[-17, 25], [-56, 22], [-48, -33], [0, -31]], b2 = [[0, -31], [48, -33], [56, 22], [17, 25]];
    var a1 = [[-17, 25], [-2, 19], [16, 4], [40, -1]], a2 = [[17, 25], [2, 19], [-16, 4], [-40, -1]];
    var dB = bezD(P, b1) + ' C' + nn(P, b2[1][0], b2[1][1]) + ' ' + nn(P, b2[2][0], b2[2][1]) + ' ' + nn(P, b2[3][0], b2[3][1]), out = '', rc = { 'stroke-linecap': 'round' };
    var ds = [dB, bezD(P, a2), bezD(P, a1)];
    ds.forEach(function (d) { out += P.path(d, 'none', '#000000', 12, { opacity: '0.12', transform: 'translate(2 2.5)', 'stroke-linecap': 'round' }); });
    ds.forEach(function (d) { out += P.path(d, 'none', '#5E3012', 12.5, rc) + P.path(d, 'none', '#94501F', 10, rc) + P.path(d, 'none', '#C27A3E', 2.6, { 'stroke-linecap': 'round', opacity: '0.55', transform: 'translate(-0.8 -1.6)' }); });
    [b1, b2, a1, a2].forEach(function (c) {
      for (var t = 0.1; t < 0.95; t += 0.15 + rnd() * 0.1) { var p = bez(c, t), x = p[0] + (rnd() - 0.5) * 5, y = p[1] + (rnd() - 0.5) * 5; out += P.rect(x - 1.1, y - 0.9, 2.2, 1.8, 0.4, '#FFFFFF', '#D9D2C2', 0.3, { transform: 'rotate(' + P.n(rnd() * 90) + ' ' + P.n(x) + ' ' + P.n(y) + ')' }); }
    });
    return out;
  }
  // a steamed bao folded over its filling, the open edge at the top
  function guaBao(P, rnd) {
    var out = P.g(P.at(-3, -9, -5), P.rect(-21, -5, 42, 10, 3, '#8A4A22', '#5E2E14', 0.8) + P.rect(-20, -1.8, 40, 2.6, 1, '#F0D8B0', null, 0));
    [[-18, -14], [-6, -16], [8, -15], [20, -12]].forEach(function (p, i) { out += i % 2 ? P.leaf(9, 6, C.herb, p[0], p[1], -60 + i * 30, { edge: '#3A6A22' }) : P.ellipse(p[0], p[1], 5, 3.2, '#8DB255', '#5E8C3A', 0.6, { transform: 'rotate(-10 ' + p[0] + ' ' + p[1] + ')' }) + P.ellipse(p[0], p[1], 3, 1.6, '#DCEBB8', null, 0); });
    out += P.g(P.at(0, -9), P.crumbs(rnd, 8, 20, 3, ['#C99A5A', '#E3C08A'], 1.1));
    var d = 'M-35 -6 C-35 30 35 30 35 -6 Q0 -2 -35 -6 Z';
    out += P.shadow(d, 2, 2.5) + P.path(d, '#F8F3E6', '#DDD3BE', 1) + P.path('M-31 -3 Q0 1.5 31 -3', 'none', '#E9E0CC', 1.2) + P.hl(-10, 8, 14, 3.5, '#FFFFFF', 0.8, -5);
    return out;
  }

  /* ---------- sliced bread and toast ---------- */
  // a sandwich loaf slice: straight sides and base, the crown a little wider with two soft shoulders
  function sliceD(P, w, h, cx, cy) {
    cx = cx || 0; cy = cy || 0;
    var x = w / 2, y = h / 2, k = 4, f = function (a, b) { return nn(P, cx + a, cy + b); };
    return 'M' + f(-x + k, y) + ' L' + f(x - k, y) + ' Q' + f(x, y) + ' ' + f(x, y - k) + ' L' + f(x, -h * 0.14) +
      ' C' + f(x + w * 0.08, -h * 0.24) + ' ' + f(x + w * 0.04, -y) + ' ' + f(w * 0.22, -y) +
      ' Q' + f(0, -y + h * 0.05) + ' ' + f(-w * 0.22, -y) +
      ' C' + f(-x - w * 0.04, -y) + ' ' + f(-x - w * 0.08, -h * 0.24) + ' ' + f(-x, -h * 0.14) +
      ' L' + f(-x, y - k) + ' Q' + f(-x, y) + ' ' + f(-x + k, y) + ' Z';
  }
  // a slice of a tin loaf (toast, white, multigrain, French toast)
  function slice(o) {
    o = o || {};
    return function (P, rnd) {
      var w = o.w || 70, h = o.h || 74, crust = o.crust || B.toastCrust, crumb = o.crumb || B.toast, d = sliceD(P, w, h);
      var out = (o.noShadow ? '' : P.shadow(d, 2, 2.5)) + P.path(d, crust, P.shade(crust, -0.3), 1) + P.path(sliceD(P, w - 7, h - 7, 0, 0.5), crumb, null, 0);
      if (o.light) out += P.path(P.blob(rnd, w * 0.3, h * 0.28, 0.12, 10, 0, h * 0.04), o.light, null, 0, { opacity: '0.7' });
      if (o.patches) out += P.scatter(rnd, o.patches, w * 0.34, h * 0.32, function (x, y, i, q) { return P.path(P.blob(q, 3 + q() * 5, 2 + q() * 3, 0.3, 7, x, y), o.patchCol || P.shade(crumb, -0.15), null, 0, { opacity: '0.55' }); });
      if (o.seeds) out += seedsIn(P, rnd, o.seeds, w * 0.38, h * 0.36, ['#C9A26A', '#6B4A2A', '#E6D2A0'], 0.8);
      out += P.scatter(rnd, 16, w * 0.38, h * 0.36, function (x, y, i, q) { return P.circle(x, y, 0.5 + q() * 0.8, P.shade(crumb, -0.14), null, 0, { opacity: '0.8' }); });
      if (o.butter) out += P.path(P.blob(rnd, w * 0.24, h * 0.2, 0.2, 9, -2, 2), '#F2D27A', null, 0, { opacity: '0.55' });
      if (o.sugar) out += dust(P, rnd, o.sugar, w * 0.4, h * 0.38, 0.85, 0.9);
      return out + P.hl(-w * 0.22, -h * 0.28, w * 0.2, h * 0.06, '#FFFFFF', 0.22, -10);
    };
  }
  // a slice of a sourdough loaf: an oval with a thick dark crust and an open crumb
  function sourdough(o) {
    o = o || {};
    return function (P, rnd) {
      var rx = o.rx || 54, ry = o.ry || 36, crust = o.crust || '#8A5527', crumb = o.crumb || '#EFE2C2';
      var d = P.blob(rnd, rx, ry, 0.04, 14), out = P.shadow(d, 2, 2.5) + P.path(d, crust, P.shade(crust, -0.3), 1);
      out += P.path(P.blob(rnd, rx - 4.5, ry - 4.5, 0.045, 14), crumb, null, 0);
      if (o.toast) out += P.path(P.blob(rnd, rx * 0.72, ry * 0.66, 0.1, 12), o.toast, null, 0, { opacity: '0.55' });
      out += P.scatter(rnd, o.holes || 22, rx * 0.8, ry * 0.74, function (x, y, i, q) { var s = q(); s *= s; return P.path(P.blob(q, 1.4 + s * 6, 1 + s * 3, 0.25, 7, x, y, q() * 180), P.shade(crumb, -0.12), P.shade(crumb, -0.22), 0.4); });
      if (o.grill) out += P.grill(rx * 0.8, ry * 0.74, 30, 14, '#6B4420', 3);
      return out + P.hl(-rx * 0.3, -ry * 0.4, rx * 0.3, ry * 0.08, '#FFFFFF', 0.25, -10);
    };
  }
  // one oval slice of a stick loaf (baguette, garlic bread, bruschetta, crostini)
  function stickSlice(P, rnd, o) {
    var rx = o.rx || 28, ry = o.ry || 17, crust = o.crust || '#C08040', crumb = o.crumb || B.crumb;
    var d = P.blob(rnd, rx, ry, 0.04, 11), out = P.shadow(d, 1.5, 2) + P.path(d, crust, P.shade(crust, -0.3), 0.9);
    out += P.path(P.blob(rnd, rx - 2.8, ry - 2.6, 0.05, 11), crumb, null, 0);
    if (o.toast) out += P.path(P.blob(rnd, rx * 0.7, ry * 0.6, 0.15, 9), o.toast, null, 0, { opacity: '0.55' });
    out += P.scatter(rnd, Math.round(rx * ry / 45), rx * 0.72, ry * 0.65, function (x, y, i, q) { return P.ellipse(x, y, 0.8 + q() * 1.8, 0.6 + q(), P.shade(crumb, -0.13), null, 0); });
    if (o.butter) out += P.path(P.blob(rnd, rx * 0.68, ry * 0.6, 0.18, 9), '#F2CF6A', null, 0, { opacity: '0.6' }) + P.crumbs(rnd, Math.round(rx / 2), rx * 0.66, ry * 0.58, ['#3F7A2A', '#6E9A3E'], 0.9) + P.crumbs(rnd, 4, rx * 0.5, ry * 0.45, ['#F7EBC4'], 1.1);
    if (o.top === 'tomato') {
      out += P.scatter(rnd, 9, rx * 0.6, ry * 0.5, function (x, y, i, q) { return P.g(P.at(x, y, q() * 90), P.rect(-2.8, -2.4, 5.6, 4.8, 1, '#C8352A', '#9A2418', 0.5) + P.rect(-1.8, -1.6, 2.4, 1.6, 0.6, '#E8685A', null, 0)); });
      out += P.crumbs(rnd, 4, rx * 0.5, ry * 0.4, ['#9B4A86', '#F2E6EE'], 1.1);
      out += P.leaf(11, 7, '#3F7A2A', rx * 0.1, -ry * 0.1, rnd() * 360, { edge: '#2F5E1F', vc: '#6A9E48' });
      out += P.path('M' + nn(P, -rx * 0.6, ry * 0.3) + ' Q' + nn(P, -rx * 0.2, -ry * 0.3) + ' ' + nn(P, rx * 0.1, ry * 0.2) + ' T' + nn(P, rx * 0.6, -ry * 0.2), 'none', '#3A1E1E', 1, { opacity: '0.8', 'stroke-linecap': 'round' });
    }
    return out + P.hl(-rx * 0.3, -ry * 0.4, rx * 0.25, ry * 0.12, '#FFFFFF', 0.3, -10);
  }
  // several stick loaf slices: at = [[x, y, angle], ...]
  function stickSlices(o) { return function (P, rnd) { return o.at.map(function (a) { return P.g(P.at(a[0], a[1], a[2] || 0), stickSlice(P, rnd, o)); }).join(''); }; }
  function focaccia(P, rnd) {
    var d = P.slab(rnd, 31, 30, 0.85, 0.03, 16), out = P.shadow(d, 2.5, 3) + P.path(d, '#C08A3E', '#8E6028', 1.2), i, j;
    out += P.path(P.slab(rnd, 28, 27, 0.85, 0.04, 16), '#E0AE5C', null, 0);
    out += P.scatter(rnd, 4, 18, 18, function (x, y, i, q) { return P.path(P.blob(q, 4 + q() * 4, 3 + q() * 3, 0.2, 7, x, y), '#F2D27A', null, 0, { opacity: '0.45' }); });
    for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) { var x = (i - 1) * 16 + (rnd() - 0.5) * 4, y = (j - 1) * 16 + (rnd() - 0.5) * 4; out += P.ellipse(x, y, 3.4, 2.8, '#C99446', '#B07A34', 0.6) + P.ellipse(x + 0.6, y + 0.8, 1.8, 1.2, '#E9C27A', null, 0, { opacity: '0.7' }); }
    out += P.scatter(rnd, 5, 19, 19, function (x, y, i, q) { var s = P.line(-6, 0, 6, 0, '#5E7A3A', 0.8); for (var k = -2; k <= 2; k++) s += P.line(k * 2.4, 0, k * 2.4 + 1.6, -3.6, '#3F6A2A', 1) + P.line(k * 2.4, 0, k * 2.4 + 1.6, 3.6, '#3F6A2A', 1); return P.g(P.at(x, y, q() * 180), s); });
    return out + P.crumbs(rnd, 10, 24, 24, ['#FFFFFF'], 0.9) + P.hl(-12, -14, 9, 2.5, '#FFFFFF', 0.35, -20);
  }
  // a round loaf: cob (crosshatched) or damper (cut in wedges, floury)
  function cob(o) {
    o = o || {};
    return function (P, rnd) {
      var r = o.r || 58, col = o.col || '#A86A2E', top = o.top || '#C08040', d = P.blob(rnd, r, r * 0.97, 0.03, 14), out = P.shadow(d, 3, 4) + P.path(d, col, P.shade(col, -0.3), 1.3);
      out += P.path(P.blob(rnd, r * 0.88, r * 0.85, 0.04, 12, -1, -2), top, null, 0);
      out += P.path(P.blob(rnd, r * 0.5, r * 0.44, 0.08, 10, -r * 0.18, -r * 0.22), P.shade(top, 0.2), null, 0, { opacity: '0.7' });
      var cuts = [], R = r * 0.78;
      if (o.wedges) for (var i = 0; i < o.wedges; i++) { var p = polar(R, i * 180 / o.wedges + 15); cuts.push([-p[0], -p[1], p[0], p[1]]); }
      else [45, -45].forEach(function (ang) {
        var a = ang * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), g = o.gap || 24;
        for (var off = -g; off <= g + 0.1; off += g) { var hl = Math.sqrt(Math.max(0, R * R - off * off)) * 0.92; cuts.push([-s * off - c * hl, c * off - s * hl, -s * off + c * hl, c * off + s * hl]); }
      });
      out += lines(P, cuts, P.shade(col, -0.25), 4.4) + lines(P, cuts, '#EBD3A2', 2);
      if (o.flour) out += P.scatter(rnd, 6, r * 0.6, r * 0.6, function (x, y, i, q) { return P.path(P.blob(q, 8 + q() * 10, 6 + q() * 8, 0.25, 8, x, y), '#FFFFFF', null, 0, { opacity: '0.35' }); });
      return out + dust(P, rnd, o.flour || 20, r * 0.8, r * 0.8, 0.6, 1.1) + P.hl(-r * 0.32, -r * 0.42, r * 0.25, r * 0.07, '#FFFFFF', 0.3, -25);
    };
  }
  function breadBowl(P, rnd) {
    var r = 50, d = P.blob(rnd, r, r, 0.03, 14), out = P.shadow(d, 3, 4) + P.path(d, '#A86A2E', '#74461C', 1.3);
    out += P.path(P.blob(rnd, r - 4, r - 4, 0.03, 14), '#C08040', null, 0) + P.path(arcD(P, r - 5, 195, 265, 0, 0), 'none', '#E0A860', 3, { opacity: '0.6', 'stroke-linecap': 'round' });
    out += P.path(P.blob(rnd, r - 9, r - 9, 0.04, 14), '#EBD3A2', '#C8A06A', 0.8);
    out += P.circle(0, 0, r - 15, '#C9A46A', null, 0) + P.circle(2.5, 3, r - 18, '#DDBF88', null, 0);
    out += ringSpots(rnd, 14, r - 14, r - 10).map(function (p) { return P.ellipse(p[0], p[1], 0.9 + rnd(), 0.7, '#C8A06A', null, 0); }).join('');
    return out;
  }
  function soldiers(P, rnd) {
    var out = '';
    for (var i = 0; i < 5; i++) {
      var d = rrD(P, -6.5, -30, 13, 60, 2.5);
      var s = P.shadow(d, 1.5, 2) + P.path(d, B.toastCrust, P.shade(B.toastCrust, -0.3), 0.9) + P.path(rrD(P, -5.6, -26.5, 11.2, 53, 1.5), B.toast, null, 0) + P.path(rrD(P, -3, -18, 6, 34, 2), B.toastLight, null, 0, { opacity: '0.7' });
      s += P.path(P.blob(rnd, 3, 9, 0.2, 7, 0, -4 + rnd() * 8), '#F2D27A', null, 0, { opacity: '0.5' });
      out += P.g(P.at((i - 2) * 15, Math.abs(i - 2) * 2.5, (i - 2) * 8), s);
    }
    return out;
  }
  // bread on a polygon: the crust, the top, a lighter middle (toast), toasted spots, seeds
  function breadPoly(P, rnd, a, o) {
    var rr = o.r === undefined ? 4 : o.r, d = roundPoly(P, a, rr), sm = typeof rr === 'number' ? rr * 0.7 : rr.map(function (x) { return x * 0.7; });
    var out = (o.noShadow ? '' : P.shadow(d, 2, 2.5)) + P.path(d, o.crust, P.shade(o.crust, -0.3), 1) + P.path(roundPoly(P, inset(a, o.cw || 3.2), sm), o.top, null, 0);
    if (o.light) out += P.path(P.smooth(grow(inset(a, 3.2), 0.55)), o.light, null, 0, { opacity: '0.6' });
    if (o.spots) out += spotsIn(rnd, o.spots, inset(a, 6)).map(function (p) { return P.path(P.blob(rnd, 2 + rnd() * 4, 1.5 + rnd() * 2.5, 0.3, 7, p[0], p[1]), o.spotCol || P.shade(o.top, -0.18), null, 0, { opacity: '0.55' }); }).join('');
    if (o.grill) out += lines(P, hatch(inset(a, 4), o.grill, 11, 1.5), '#5A3416', 2.8, { opacity: '0.75' });
    if (o.caraway) out += spotsIn(rnd, o.caraway, inset(a, 5)).map(function (p) { return seed(P, p[0], p[1], rnd() * 180, '#3A2614', 0.6); }).join('');
    if (o.turk) out += turkTop(P, rnd, a, rr, { noShadow: true, seeds: o.turk });
    var c = centre(a);
    return out + (o.turk ? '' : P.hl(c[0] - 4, c[1] - 6, 8, 2, '#FFFFFF', 0.22, -15));
  }
  // cheese (or a filling) bulging out along edge i of a polygon
  function ooze(P, rnd, a, i, count, col, size) {
    var p = a[i], q = a[(i + 1) % a.length], sg = area(a) > 0 ? 1 : -1, dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy), nx = dy / l * sg, ny = -dx / l * sg, ang = Math.atan2(dy, dx) * 180 / Math.PI, out = '';
    for (var k = 0; k < count; k++) {
      var t = (k + 0.5 + (rnd() - 0.5) * 0.5) / count, s = (size || 6) * (0.7 + rnd() * 0.5), x = p[0] + dx * t + nx * 1.2, y = p[1] + dy * t + ny * 1.2;
      out += P.ellipse(x, y, s, s * 0.6, col, P.shade(col, -0.2), 0.6, { transform: 'rotate(' + P.n(ang) + ' ' + P.n(x) + ' ' + P.n(y) + ')' });
    }
    return out;
  }
  var TOAST = { crust: '#A8642A', top: '#D9963E', light: '#E6B060', r: 5 };
  // a toastie cut corner to corner, the cheese oozing at the cut
  function toastie(P, rnd) {
    var s = 38, a = shift([[-s, -s], [s, -s], [-s, s]], -3, -3, -2), b = shift([[s, -s], [s, s], [-s, s]], 3, 3, 2), out = '';
    [[a, 1], [b, 2]].forEach(function (t) {
      out += P.shadow(roundPoly(P, t[0], 6), 2, 2.5) + ooze(P, rnd, t[0], t[1], 4, '#E8A3A0', 5) + ooze(P, rnd, t[0], t[1], 5, C.cheese, 6);
      out += breadPoly(P, rnd, t[0], { crust: '#A8642A', top: '#D9963E', light: '#E6B060', r: 6, noShadow: true, spots: 6, spotCol: '#B9772E' });
    });
    return out;
  }
  function croque(P, rnd) {
    var out = slice({ w: 70, h: 74, crust: '#9A5A22', crumb: '#D9963E' })(P, rnd);
    out += P.path(P.blob(rnd, 29, 27, 0.12, 14, 0, 4), '#F2D27A', '#D9B04E', 0.8);
    out += P.scatter(rnd, 12, 22, 20, function (x, y, i, q) { return P.path(P.blob(q, 2 + q() * 5, 1.6 + q() * 3, 0.3, 7, x, y + 4), i % 3 ? '#C98A3A' : '#A8642A', null, 0, { opacity: '0.75' }); });
    out += P.scatter(rnd, 8, 22, 20, function (x, y, i, q) { return P.circle(x, y + 4, 1 + q() * 1.5, 'none', '#E6BC5A', 0.7); });
    return out + P.hl(-8, -6, 8, 2.5, '#FFFFFF', 0.4, -15);
  }
  function panini(P, rnd) {
    var w = 58, h = 27, a = shift([[-w, -h], [6, -h], [-6, h], [-w, h]], -3, 0), b = shift([[6, -h], [w, -h], [w, h], [-6, h]], 3, 0), out = '';
    [[a, 1, [10, 2, 2, 10]], [b, 3, [2, 10, 10, 2]]].forEach(function (t) {
      out += P.shadow(roundPoly(P, t[0], t[2]), 2, 2.5) + ooze(P, rnd, t[0], t[1], 3, C.lettuce, 5) + ooze(P, rnd, t[0], t[1], 4, C.cheese, 5.5);
      out += breadPoly(P, rnd, t[0], { crust: '#B07436', top: '#D9A456', r: t[2], noShadow: true, grill: 62 });
    });
    return out;
  }

  /* ---------- flatbreads and wraps ---------- */
  // bits of filling spread over an ellipse at cx, cy (the cut face of a wrap, a burrito, a taco)
  var BIT = {
    lettuce: ['#8DB255', '#5E8C3A'], chicken: ['#E3B66E', '#B98A44'], tomato: ['#D9473B', '#A8302A'], cheese: ['#F2C14E', '#C99A2A'], rice: ['#F4EFDE', '#D9D0B4'],
    bean: ['#3A2A26', '#1E1410'], beef: ['#8E5A2E', '#5E3A1E'], guac: ['#9CC067', '#6E9A3E'], salsa: ['#C8352A', '#8E2216'], onion: ['#B86AA6', '#8A3A78'],
    lamb: ['#8A5A2E', '#5E3A1E'], pork: ['#D98A7A', '#A8604E'], carrot: ['#EE8A2E', '#C2661A'], cucumber: ['#9CC067', '#5E8C3A'], coriander: ['#4F7F2F', '#3A6A22'],
    sauce: ['#F7F1E0', '#D9D0BC'], corn: ['#F2C94C', '#C9A02A'], cabbage: ['#8A3A78', '#5E2050']
  };
  function bits(P, rnd, kinds, count, rx, ry, cx, cy, s) {
    return P.spots(rnd, count, rx, ry).map(function (p, i) {
      var k = BIT[kinds[i % kinds.length]], x = (cx || 0) + p[0], y = (cy || 0) + p[1], z = (s || 1) * (0.8 + rnd() * 0.5);
      return P.path(P.blob(rnd, 2.6 * z, 1.9 * z, 0.3, 6, x, y, rnd() * 180), k[0], k[1], 0.4);
    }).join('');
  }
  // a rolled wrap or burrito lying on its side, the cut face at the right end: { len, w, col, spots, grill, fill: [kinds] }
  function rolled(o) {
    return function (P, rnd) {
      var l = o.len, r = o.w / 2, x0 = -l / 2, x1 = l / 2, fr = o.fr || r * 0.42, col = o.col || B.tortilla;
      var d = 'M' + nn(P, x1, -r) + ' L' + nn(P, x0 + r * 0.8, -r) + ' Q' + nn(P, x0 - r * 0.15, -r) + ' ' + nn(P, x0 - r * 0.15, 0) + ' Q' + nn(P, x0 - r * 0.15, r) + ' ' + nn(P, x0 + r * 0.8, r) + ' L' + nn(P, x1, r) + ' Z';
      var out = P.shadow(d, 2, 3) + P.path(d, col, P.shade(col, -0.25), 1);
      out += P.path(rrD(P, x0 + 3, -r * 0.62, l - 6, r * 0.5, r * 0.25), P.shade(col, 0.3), null, 0, { opacity: '0.6' });
      if (o.spots) out += P.scatter(rnd, o.spots, l * 0.4, r * 0.75, function (x, y, i, q) { return P.path(P.blob(q, 2 + q() * 4, 1.5 + q() * 2, 0.3, 7, x, y), '#C99A5A', null, 0, { opacity: '0.5' }); });
      if (o.grill) out += lines(P, hatch([[x0 + 4, -r + 2], [x1 - 4, -r + 2], [x1 - 4, r - 2], [x0 + 4, r - 2]], 105, 12, 1), '#8A5527', 2.6, { opacity: '0.6' });
      out += P.path('M' + nn(P, x0 + l * 0.12, r * 0.95) + ' Q' + nn(P, x0 + l * 0.42, -r * 0.1) + ' ' + nn(P, x1 - l * 0.16, -r * 0.96), 'none', P.shade(col, -0.2), 1);
      out += P.ellipse(x1, 0, fr, r, P.shade(col, 0.15), P.shade(col, -0.25), 1);
      out += P.ellipse(x1, 0, fr - 2, r - 2.2, o.base || '#E3D3A8', null, 0);
      out += bits(P, rnd, o.fill, o.n || 12, (fr - 2.5) * 0.85, (r - 3) * 0.85, x1, 0, o.bs || 1);
      out += P.path(arcD(P, r * 0.5, 120, 330, 0, 0).replace(/^M/, 'M'), 'none', P.shade(col, 0.1), 1.4, { transform: 'translate(' + P.n(x1) + ' 0) scale(' + P.n(fr / r) + ' 1)', opacity: '0.9' });
      return out;
    };
  }
  // two halves of a roll: each [x, y, angle]
  function halves(fn, at) { return function (P, rnd) { return at.map(function (a) { return P.g(P.at(a[0], a[1], a[2]), fn(P, rnd)); }).join(''); }; }
  function hardTaco(P, rnd) {
    var dO = 'M-48 0 C-30 -27 30 -27 48 0 C30 27 -30 27 -48 0 Z', dI = 'M-41 1 C-25 -17 25 -17 41 1 C25 17 -25 17 -41 1 Z';
    var out = P.shadow(dO, 2.5, 3) + P.path(dO, '#E8B54A', '#B9862A', 1.1) + P.crumbs(rnd, 18, 40, 15, ['#D29A32', '#F2CE6E'], 0.9);
    out += P.path(dI, '#7A4A26', '#5E3418', 0.8);
    out += P.scatter(rnd, 12, 34, 9, function (x, y, i, q) { return P.path(P.blob(q, 2.5, 1.8, 0.3, 6, x, y), '#5E3418', null, 0); });
    out += P.scatter(rnd, 16, 38, 11, function (x, y, i, q) { var a = q() * 180; return P.g(P.at(x, y, a), P.path('M-5 0 Q0 -1.6 5 0', 'none', i % 2 ? '#8DB255' : '#B9D27A', 2, { 'stroke-linecap': 'round' })); });
    out += P.scatter(rnd, 12, 34, 9, function (x, y, i, q) { return P.g(P.at(x, y, q() * 180), P.line(-3, 0, 3, 0, '#F2B83A', 1.4)); });
    out += P.scatter(rnd, 6, 30, 8, function (x, y) { return P.rect(x - 2, y - 2, 4, 4, 0.8, '#D9473B', '#A8302A', 0.4); });
    out += P.path(P.blob(rnd, 7, 4.5, 0.2, 8, 8, -1), '#F7F4EA', '#E0D8C4', 0.6);
    return out + P.path('M-44 -2 C-28 -24 28 -24 44 -2', 'none', '#F2CE6E', 1.6, { opacity: '0.8' });
  }
  function softTaco(P, rnd) {
    var d = P.blob(rnd, 47, 34, 0.03, 14), out = P.shadow(d, 2, 2.5) + P.path(d, B.tortilla, '#C9B07A', 1);
    out += P.scatter(rnd, 12, 40, 28, function (x, y, i, q) { return P.path(P.blob(q, 2 + q() * 3, 1.4 + q() * 2, 0.3, 7, x, y), '#C99A5A', null, 0, { opacity: '0.45' }); });
    var lens = 'M-40 0 C-24 -18 24 -18 40 0 C24 18 -24 18 -40 0 Z';
    out += P.path(lens, '#A8704A', '#7E4A2E', 0.8);
    out += bits(P, rnd, ['beef', 'cabbage', 'beef', 'onion', 'cabbage'], 22, 30, 10, 0, 0, 1);
    out += P.scatter(rnd, 5, 26, 8, function (x, y, i, q) { return P.leaf(7, 4.5, C.herb, x, y, q() * 360, { vein: false }); });
    out += P.path('M-28 -3 Q-20 4 -12 -3 T4 -3 T20 -3 T32 -2', 'none', '#F7F1E0', 1.8, { 'stroke-linecap': 'round' });
    return out + P.path('M-40 0 C-24 -18 24 -18 40 0', 'none', '#FBF2D8', 2, { opacity: '0.9' }) + P.path('M-40 0 C-24 18 24 18 40 0', 'none', '#FBF2D8', 2, { opacity: '0.9' });
  }
  // a half moon cut into three wedges, the fold along the bottom
  function quesadilla(P, rnd) {
    var R = 62, out = '';
    for (var i = 0; i < 3; i++) {
      var a0 = -180 + i * 60, a1 = a0 + 60, mid = polar(4, (a0 + a1) / 2), cx = mid[0], cy = mid[1] + 30, d = sectorD(P, R, a0, a1, cx, cy), w = sectorPts(R, a0, a1, cx, cy, 6);
      out += P.shadow(d, 2, 2.5);
      [a0, a1].forEach(function (a) { for (var k = 0; k < 4; k++) { var p = polar(12 + k * 13 + rnd() * 4, a + (a === a0 ? -2 : 2), cx, cy); out += P.ellipse(p[0], p[1], 5.5, 3, k % 3 === 2 ? '#C8352A' : C.cheese, '#C99A2A', 0.5, { transform: 'rotate(' + P.n(a) + ' ' + P.n(p[0]) + ' ' + P.n(p[1]) + ')' }); } });
      out += P.path(d, '#E3BC70', '#A8763E', 1) + lines(P, hatch(inset(w, 3), 20, 12, 1), '#9E6428', 2.6, { opacity: '0.6' });
      out += spotsIn(rnd, 5, inset(w, 5)).map(function (p) { return P.path(P.blob(rnd, 2 + rnd() * 3, 1.5 + rnd() * 2, 0.3, 7, p[0], p[1]), '#C99A5A', null, 0, { opacity: '0.5' }); }).join('');
    }
    return out;
  }
  function flatRound(o) {
    o = o || {};
    return function (P, rnd) {
      var r = o.r || 52, d = P.blob(rnd, r, r * (o.sy || 0.96), o.wob || 0.03, 16), col = o.col || '#E3BE82', top = o.top || '#EED3A0';
      var out = P.shadow(d, 1.5, 2) + P.path(d, col, P.shade(col, -0.22), 1) + P.path(P.blob(rnd, r - 3, r * (o.sy || 0.96) - 3, o.wob || 0.03, 16), top, null, 0);
      if (o.puffs) out += P.scatter(rnd, o.puffs, r * 0.55, r * 0.5, function (x, y, i, q) { return P.path(P.blob(q, 10 + q() * 10, 7 + q() * 7, 0.2, 9, x, y), P.shade(top, 0.35), null, 0, { opacity: '0.8' }); });
      if (o.swirl) { var pts = []; for (var t = 0; t <= Math.PI * 2 * 3; t += 0.5) { var rr = 6 + t / (Math.PI * 6) * (r - 12); pts.push([Math.cos(t) * rr, Math.sin(t) * rr]); } out += P.path(P.smooth(pts, true), 'none', P.shade(top, -0.14), 1.2) + P.path(P.smooth(pts.map(function (p) { return [p[0] - 1, p[1] - 1]; }), true), 'none', P.shade(top, 0.3), 0.8, { opacity: '0.8' }); }
      if (o.spots) out += P.scatter(rnd, o.spots, r * 0.82, r * 0.8, function (x, y, i, q) { return P.path(P.blob(q, 1.6 + q() * 3.5, 1.2 + q() * 2.4, 0.3, 7, x, y), o.spotCol || '#C08A4A', null, 0, { opacity: '0.6' }); });
      if (o.bubbles) out += P.scatter(rnd, o.bubbles, r - 5, r - 5, function (x, y, i, q) { return P.circle(x, y, 1.2 + q() * 2.6, P.shade(top, 0.4), P.shade(top, -0.12), 0.5); }, 5);
      if (o.specks) out += P.crumbs(rnd, o.specks, r - 6, r - 6, ['#7A5A3A', '#A8823A'], 0.6);
      if (o.flour) out += dust(P, rnd, o.flour, r * 0.8, r * 0.8, 0.5, 1);
      return out + P.hl(-r * 0.3, -r * 0.4, r * 0.3, r * 0.07, '#FFFFFF', 0.25, -20);
    };
  }
  function lebanese(P, rnd) {
    var out = '';
    for (var i = 0; i < 4; i++) {
      var d = sectorD(P, 70, -112, -68, 0, 0), s = P.shadow(d, 1.5, 2) + P.path(d, '#F2E4C6', '#D2BC90', 0.9) + P.path(arcD(P, 67, -110, -70, 0, 0), 'none', '#E3CDA0', 2.4);
      for (var k = 0; k < 7; k++) { var p = inSector(rnd, 16, 62, -108, -72, 0, 0); s += P.path(P.blob(rnd, 1.5 + rnd() * 3, 1.2 + rnd() * 2, 0.3, 7, p[0], p[1]), '#C9A06A', null, 0, { opacity: '0.5' }); }
      out += P.g(P.at(0, 34, -30 + i * 20), s);
    }
    return out;
  }
  function naan(o) {
    o = o || {};
    return function (P, rnd) {
      var pts = [[-70, -4], [-58, -34], [-18, -45], [30, -36], [68, -8], [66, 10], [32, 36], [-16, 45], [-58, 32]];
      var d = P.smooth(pts), out = P.shadow(d, 2, 2.5) + P.path(d, '#E3BC78', '#B98F52', 1) + P.path(P.smooth(grow(pts, 0.93)), '#EED09A', null, 0);
      out += P.scatter(rnd, 15, 54, 32, function (x, y, i, q) { var rx = 4 + q() * 6, ry = 3 + q() * 4; return P.ellipse(x, y, rx, ry, '#F4DFAE', '#D9B57A', 0.6) + P.path(P.blob(q, rx * 0.6, ry * 0.55, 0.3, 7, x - rx * 0.2, y - ry * 0.25), '#5E3A1E', null, 0, { opacity: '0.8' }); }, 12);
      out += P.hl(-12, -14, 30, 8, '#F2D27A', 0.35, -12);
      if (o.garlic) out += P.crumbs(rnd, 30, 52, 30, ['#3F7A2A', '#6E9A3E', '#F7EBC4'], 1.1);
      return out;
    };
  }
  function shallotPancake(P, rnd) {
    var R = 56, out = '';
    for (var i = 0; i < 6; i++) {
      var a0 = i * 60 - 90, a1 = a0 + 60, m = polar(2.5, a0 + 30), d = sectorD(P, R, a0 + 1, a1 - 1, m[0], m[1]);
      out += P.shadow(d, 1.5, 2) + P.path(d, '#DDAE5E', '#A8763E', 0.9);
      for (var rr = 16; rr < R - 4; rr += 11) out += P.path(arcD(P, rr, a0 + 5, a1 - 5, m[0], m[1]), 'none', '#C9944A', 1);
      for (var k = 0; k < 10; k++) { var p = inSector(rnd, 8, R - 5, a0 + 5, a1 - 5, m[0], m[1]); out += k < 4 ? P.path(P.blob(rnd, 2 + rnd() * 3, 1.5 + rnd() * 2, 0.3, 7, p[0], p[1]), '#A8682A', null, 0, { opacity: '0.6' }) : P.g(P.at(p[0], p[1], rnd() * 180), P.line(-2, 0, 2, 0, k % 2 ? '#5E8C3A' : '#9CC067', 1.6)); }
    }
    return out;
  }
  function flatbread(P, rnd) {
    var d = P.slab(rnd, 70, 42, 0.45, 0.05, 18), out = P.shadow(d, 2, 2.5) + P.path(d, '#DDB474', '#A8803E', 1) + P.path(P.slab(rnd, 66, 38, 0.45, 0.06, 16), '#EAC88A', null, 0);
    out += P.grill(62, 34, 28, 15, '#5E3A1E', 3.4);
    out += P.scatter(rnd, 6, 54, 28, function (x, y, i, q) { return P.ellipse(x, y, 3 + q() * 4, 2 + q() * 3, '#F2DCAA', '#D9B57A', 0.5); });
    out += P.crumbs(rnd, 26, 56, 30, ['#3F7A2A', '#6E9A3E', '#FFFFFF'], 0.9);
    return out + P.hl(-20, -14, 28, 6, '#F2D27A', 0.35, -8);
  }
  function yiros(P, rnd) {
    var body = 'M58 -25 L-58 -25 Q-72 -25 -72 0 Q-72 25 -58 25 L58 25 Z', out = P.shadow(body, 2.5, 3) + P.path(body, '#E3BE82', '#B98F52', 1);
    out += P.scatter(rnd, 6, 20, 18, function (x, y, i, q) { return P.path(P.blob(q, 2 + q() * 3, 1.5 + q() * 2, 0.3, 7, x + 36, y), '#C08A4A', null, 0, { opacity: '0.6' }); });
    var paper = 'M-75 -27 L14 -27 L-2 27 L-75 27 Z';
    out += P.path(paper, '#F4EFE2', '#D2C8B2', 1) + P.path('M-40 -27 L-46 27 M-14 -27 L-22 27', 'none', '#E2D9C4', 1) + P.path('M14 -27 L-2 27', 'none', '#FFFFFF', 2, { opacity: '0.8' });
    // the open end, the filling showing and poking out
    out += P.path(frillD(P, rnd, 9, 22, 16, 2, 66, 0), C.lettuce, C.greenDark, 0.7);
    out += P.ellipse(58, 0, 11, 25, '#EED3A0', '#B98F52', 1) + P.ellipse(58, 0, 9, 22.5, '#F2EEDC', null, 0);
    out += bits(P, rnd, ['lamb', 'tomato', 'lamb', 'onion', 'lettuce', 'lamb'], 14, 7.5, 19, 58, 0, 1);
    return out + P.path('M60 -8 Q66 -4 63 3 M58 6 Q64 10 62 16', 'none', C.onion, 1.2, { 'stroke-linecap': 'round' });
  }
  // half a banh mi: a pointed roll split along one side, the filling showing there and at the cut end
  function banhMiHalf(P, rnd) {
    var out = '', i;
    for (i = 0; i < 9; i++) {
      var x = -30 + i * 8 + rnd() * 3, k = i % 3;
      out += P.g(P.at(x, 15, 70 + rnd() * 40), k === 0 ? P.line(-7, 0, 7, 0, C.carrot, 1.8) + P.line(-6, 2.4, 6, 2.4, '#F2A85A', 1.4) : k === 1 ? P.rect(-7, -1.6, 14, 3.2, 1, '#9CC067', '#5E8C3A', 0.4) : P.leaf(9, 6, C.herb, 2, 2, 0, { edge: '#3A6A22' }));
    }
    out += P.circle(-12, 16, 2.2, 'none', C.sauceRed, 1) + P.circle(14, 17, 2.2, 'none', C.sauceRed, 1);
    var d = 'M42 -16 C0 -19 -30 -17 -44 -4 Q-47 2 -40 6 C-28 15 0 16 42 15 Z';
    out += P.shadow(d, 2, 2.5) + P.path(d, '#C98A3E', '#94602A', 1.1) + P.path('M40 -12 C0 -15 -26 -13 -38 -3 C-26 6 0 8 40 7 Z', '#DCA458', null, 0);
    for (i = 0; i < 3; i++) out += P.g(P.at(-20 + i * 20, -3, -25), P.path(lensD(P, 16, 3), '#EED3A0', '#B98A4A', 0.6));
    out += P.ellipse(42, 0, 7, 15.5, '#EED3A0', '#94602A', 1) + P.ellipse(42, 0, 5.2, 13, '#F4E6C4', null, 0);
    out += bits(P, rnd, ['pork', 'carrot', 'cucumber', 'coriander', 'pork'], 7, 3.5, 10, 42, 0, 0.9);
    return out + P.hl(-6, -11, 18, 2.5, '#FFFFFF', 0.3, -4);
  }
  // a half moon of pastry or dough with a rolled, crimped edge (calzone, empanada)
  function halfMoon(o) {
    return function (P, rnd) {
      var w = o.w / 2, h = o.h, base = o.base || 0, c = [[-w, base], [-w, base - h * 1.33], [w, base - h * 1.33], [w, base]];
      var d = bezD(P, c) + ' Q0 ' + P.n(base + o.h * 0.14) + ' ' + nn(P, -w, base) + ' Z', out = P.shadow(d, 2.5, 3) + P.path(d, o.col, P.shade(o.col, -0.3), 1.1);
      var ci = [[-w + 6, base - 1], [-w + 6, base - h * 1.15], [w - 6, base - h * 1.15], [w - 6, base - 1]];
      out += P.path(bezD(P, ci) + ' Q0 ' + P.n(base + o.h * 0.08) + ' ' + nn(P, -w + 6, base - 1) + ' Z', o.top, null, 0);
      out += P.path(P.blob(rnd, w * 0.4, h * 0.25, 0.1, 10, -w * 0.15, base - h * 0.55), P.shade(o.top, 0.2), null, 0, { opacity: '0.6' });
      for (var t = 0.03; t < 0.98; t += o.step) { var p = bez(c, t), a = bezDir(c, t), q = polar(o.bump * 0.55, a + 90, p[0], p[1]); out += P.ellipse(q[0], q[1], o.bump, o.bump * 0.62, P.shade(o.col, 0.08), P.shade(o.col, -0.3), 0.7, { transform: 'rotate(' + P.n(a + 50) + ' ' + P.n(q[0]) + ' ' + P.n(q[1]) + ')' }); }
      if (o.blisters) out += P.scatter(rnd, o.blisters, w * 0.6, h * 0.35, function (x, y, i, q) { return P.path(P.blob(q, 2 + q() * 3, 1.5 + q() * 2, 0.3, 7, x, y + base - h * 0.45), '#8A5527', null, 0, { opacity: '0.55' }); });
      if (o.slits) for (var i = 0; i < o.slits; i++) { var x = (i - (o.slits - 1) / 2) * w * 0.45; out += P.g(P.at(x, base - h * 0.5, 80), P.path(lensD(P, 12, 2.6), '#B5301F', '#8E5A22', 0.8)); }
      if (o.herbs) out += P.g(P.at(0, base - h * 0.5), P.crumbs(rnd, o.herbs, w * 0.6, h * 0.35, ['#4F7F2F', '#F4EFE0'], 0.8));
      return out + P.hl(-w * 0.3, base - h * 0.75, w * 0.25, h * 0.06, '#FFFFFF', 0.35, -10);
    };
  }

  /* ---------- pizza ---------- */
  // one topping at x, y
  var PZ = {
    basil: function (P, q, x, y) { return P.leaf(12 + q() * 5, 8, '#3F7A2A', x, y, q() * 360, { edge: '#2F5E1F', vc: '#6A9E48' }); },
    bocconcini: function (P, q, x, y) { return P.path(P.blob(q, 8 + q() * 3, 7 + q() * 2, 0.15, 8, x, y), '#FBF6E6', '#E6DCC0', 0.7) + P.hl(x - 2, y - 2, 3, 1.6, '#FFFFFF', 0.8); },
    ham: function (P, q, x, y) { return P.g(P.at(x, y, q() * 360), P.path(roundPoly(P, [[-6, -5], [7, -6], [6, 6], [-7, 5]], 2), '#E8A3A0', '#C9827E', 0.7) + P.line(-3, -1, 3, -2, '#F4C4C0', 1.2)); },
    pineapple: function (P, q, x, y) { return P.g(P.at(x, y, q() * 360), P.path('M-5 -4 L5 -4 L4 4 L-4 4 Z', '#F2CB55', '#C9A030', 0.7) + P.line(-3, 0, 3, 0, '#F7DE8A', 1)); },
    pepperoni: function (P, q, x, y) { return P.circle(x, y, 8.5, '#A82A1C', '#7E1E12', 0.8) + P.circle(x - 1, y - 1, 6.5, '#C0402A', null, 0) + P.circle(x + 2, y - 2, 1, '#E08A6A') + P.circle(x - 3, y + 2, 0.9, '#E08A6A') + P.hl(x - 3, y - 3.5, 3, 1.2, '#FFFFFF', 0.3, -30); },
    cap: function (P, q, x, y) { var c = q() < 0.5 ? '#4F8A2F' : '#C0392B'; return P.g(P.at(x, y, q() * 360), P.path('M-8 -1.5 Q0 -6 8 -1.5 L8 1.5 Q0 -3 -8 1.5 Z', c, P.shade(c, -0.25), 0.6)); },
    olive: function (P, q, x, y) { return P.circle(x, y, 3.6, '#2E2A2A', null, 0) + P.circle(x, y, 1.5, '#8A7A6A'); },
    mush: function (P, q, x, y) { return P.g(P.at(x, y, q() * 360), P.path('M-6 1 Q-6 -6 0 -6 Q6 -6 6 1 Z', '#D9C2A0', '#A88A6A', 0.6) + P.rect(-1.8, 0.6, 3.6, 5, 1, '#E6D4B6', '#A88A6A', 0.5)); },
    onion: function (P, q, x, y) { return P.g(P.at(x, y, q() * 360), P.path('M-7 2 Q0 -6 7 2', 'none', '#9B4A86', 1.8, { 'stroke-linecap': 'round' })); },
    mince: function (P, q, x, y) { return P.path(P.blob(q, 3.5 + q() * 2, 2.8 + q() * 1.5, 0.3, 6, x, y), '#7A4A26', '#5A3418', 0.5); },
    bacon: function (P, q, x, y) { return P.g(P.at(x, y, q() * 360), P.path(roundPoly(P, [[-7, -3.5], [7, -4], [6, 4], [-6, 3.5]], 1.5), '#B5503F', '#8A3426', 0.6) + P.line(-5, 0, 5, 0, '#F0D8D0', 1.4)); },
    chicken: function (P, q, x, y) { return P.g(P.at(x, y, q() * 360), P.path(roundPoly(P, [[-6, -4], [6, -5], [5, 4], [-6, 4]], 2), '#E9CC92', '#B98A44', 0.6) + P.line(-4, -1, 3, 2, '#9E6A2A', 1.2, { opacity: '0.7' })); },
    chilli: function (P, q, x, y) { return P.circle(x, y, 2.6, 'none', '#C0392B', 1.2); },
    parsley: function (P, q, x, y) { return P.circle(x, y, 1.2, '#3F7A2A', null, 0); },
    garlic: function (P, q, x, y) { return P.path(P.blob(q, 1.6, 1.2, 0.3, 6, x, y), '#F7EBC4', '#D9C49A', 0.3); }
  };
  // the toppings for a list of [kind, count], mixed up and spread over the spots
  function pizzaBits(P, rnd, list, pts) {
    var kinds = [], i;
    list.forEach(function (t) { for (var k = 0; k < t[1]; k++) kinds.push(t[0]); });
    for (i = kinds.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = kinds[i]; kinds[i] = kinds[j]; kinds[j] = t; }
    return pts.slice(0, kinds.length).map(function (p, i) { return PZ[kinds[i]] ? PZ[kinds[i]](P, rnd, p[0], p[1]) : ''; }).join('');
  }
  function count(list) { return (list || []).reduce(function (s, t) { return s + t[1]; }, 0); }
  // a whole pizza: { r, base: tomato | bbq | garlic, cheese: false | 'fior', bits: [[kind, count]], cut }
  function pizza(o) {
    o = o || {};
    return function (P, rnd) {
      var r = o.r || 98, d = P.blob(rnd, r, r, 0.012, 24), out = P.shadow(d, 2.5, 3), i, a, base = o.base || 'tomato', sr = r - 12;
      out += P.path(d, '#C98A3A', '#94602A', 1.2) + P.path(P.blob(rnd, r - 2.5, r - 2.5, 0.012, 24), '#E3AE5C', null, 0);
      for (i = 0; i < 26; i++) { a = rnd() * 360; var p = polar(r - 5 - rnd() * 3, a); out += P.path(P.blob(rnd, 2 + rnd() * 3.5, 1.5 + rnd() * 1.8, 0.3, 7, p[0], p[1], a + 90), '#A8642A', null, 0, { opacity: '0.55' }); }
      out += P.path(arcD(P, r - 6, 190, 260, 0, 0), 'none', '#F2CC88', 2.5, { opacity: '0.6', 'stroke-linecap': 'round' });
      out += P.path(P.blob(rnd, sr, sr, 0.025, 22), base === 'garlic' ? '#EED08A' : base === 'bbq' ? '#5E2A12' : C.sauceRed, base === 'garlic' ? '#D9B060' : '#7E2414', 0.8);
      if (o.cheese !== false && o.cheese !== 'fior') {
        out += P.path(P.blob(rnd, sr - 5, sr - 5, 0.07, 22), '#F4CF6E', null, 0);
        out += P.scatter(rnd, 10, sr - 16, sr - 16, function (x, y, i, q) { return P.path(P.blob(q, 6 + q() * 8, 5 + q() * 6, 0.25, 8, x, y), '#F8DE96', null, 0, { opacity: '0.7' }); });
        out += P.scatter(rnd, 14, sr - 10, sr - 10, function (x, y, i, q) { return P.path(P.blob(q, 2 + q() * 4, 1.5 + q() * 3, 0.3, 7, x, y), '#D29A46', null, 0, { opacity: '0.6' }); });
      }
      if (base === 'garlic') out += P.path(P.blob(rnd, sr - 8, sr - 8, 0.1, 18), '#F4DC96', null, 0, { opacity: '0.6' });
      if (o.bits) out += pizzaBits(P, rnd, o.bits, P.spots(rnd, count(o.bits), sr - 13, sr - 13, 18));
      if (o.cheese === 'fior' && o.bits) out += P.path(P.blob(rnd, sr * 0.3, sr * 0.2, 0.2, 10, -sr * 0.3, -sr * 0.35), '#E86A50', null, 0, { opacity: '0.35' });
      var cut = o.cut === undefined ? 8 : o.cut;
      for (i = 0; i < cut; i++) { var e = polar(r - 2, (i / cut + 1 / 16) * 360); out += P.line(0, 0, e[0], e[1], '#8A5A2A', 1, { opacity: '0.4' }); }
      return out;
    };
  }
  // a slice of pizza, the crust at the top, the point at the bottom
  function pizzaSlice(o) {
    o = o || {};
    return function (P, rnd) {
      var R = 98, a0 = -112.5, a1 = -67.5, cy = 50, d = sectorD(P, R, a0, a1, 0, cy), out = P.shadow(d, 2, 2.5) + P.path(d, '#C98A3A', '#94602A', 1.1), i;
      var ring = 'M' + nn(P, polar(R - 1.5, a0 + 0.6, 0, cy)[0], polar(R - 1.5, a0 + 0.6, 0, cy)[1]) + ' A' + nn(P, R - 1.5, R - 1.5) + ' 0 0 1 ' + nn(P, polar(R - 1.5, a1 - 0.6, 0, cy)[0], polar(R - 1.5, a1 - 0.6, 0, cy)[1]) + ' L' + nn(P, polar(R - 13, a1 - 0.6, 0, cy)[0], polar(R - 13, a1 - 0.6, 0, cy)[1]) + ' A' + nn(P, R - 13, R - 13) + ' 0 0 0 ' + nn(P, polar(R - 13, a0 + 0.6, 0, cy)[0], polar(R - 13, a0 + 0.6, 0, cy)[1]) + ' Z';
      out += P.path(ring, '#E3AE5C', null, 0);
      for (i = 0; i < 6; i++) { var p = polar(R - 5 - rnd() * 3, a0 + 4 + i * 7 + rnd() * 3, 0, cy); out += P.path(P.blob(rnd, 2 + rnd() * 3, 1.5 + rnd() * 1.6, 0.3, 7, p[0], p[1], -90), '#A8642A', null, 0, { opacity: '0.55' }); }
      out += P.path(arcD(P, R - 6, a0 + 4, a0 + 22, 0, cy), 'none', '#F2CC88', 2.2, { opacity: '0.6', 'stroke-linecap': 'round' });
      out += P.path(sectorD(P, R - 12, a0 + 0.5, a1 - 0.5, 0, cy - 0.5), C.sauceRed, '#7E2414', 0.6);
      var ch = inset(sectorPts(R - 15, a0, a1, 0, cy, 8), 1.2).map(function (p) { return [p[0] + (rnd() - 0.5) * 2.4, p[1] + (rnd() - 0.5) * 2.4]; });
      out += P.path(P.smooth(ch), '#F4CF6E', null, 0);
      for (i = 0; i < 5; i++) { var s = inSector(rnd, 16, R - 24, a0 + 6, a1 - 6, 0, cy); out += P.path(P.blob(rnd, 2 + rnd() * 3, 1.5 + rnd() * 2.5, 0.3, 7, s[0], s[1]), '#D29A46', null, 0, { opacity: '0.6' }); }
      var pts = [];
      for (i = 0; i < count(o.bits); i++) { var rr = 18 + (i + rnd() * 0.8) / count(o.bits) * (R - 40), m = 9 / rr * 180 / Math.PI; pts.push(polar(rr, a0 + m + rnd() * Math.max(0, a1 - a0 - 2 * m), 0, cy)); }
      return out + pizzaBits(P, rnd, o.bits || [], pts.sort(function (p, q) { return p[1] - q[1]; }));
    };
  }

  /* ---------- pies and pastry ---------- */
  function slit(P, l) { return P.path(lensD(P, l, l * 0.2), '#6B3A14', '#F0C98A', 0.9); }
  // a pie top: a crimped rim (fork, rope or flute), a domed egg-washed lid, steam vents (slits, hole, cross)
  function pieTop(o) {
    o = o || {};
    return function (P, rnd) {
      var r = o.r || 40, col = o.col || '#C9883A', top = o.top || '#DDA04A', rim = r - (o.rim === undefined ? 6 : o.rim), i, a, k;
      var d = o.edge === 'flute' ? fluteD(P, r + 1.5, Math.round(r / 2.4), 1.6) : P.blob(rnd, r, r, 0.02, 16);
      var out = (o.noShadow ? '' : P.shadow(d, 2.5, 3)) + P.path(d, col, P.shade(col, -0.32), 1.1);
      if (o.edge === 'fork') { k = Math.round(r * 1.1); for (i = 0; i < k; i++) { var p0 = polar(rim + 1, i / k * 360), p1 = polar(r - 1.2, i / k * 360); out += P.line(p0[0], p0[1], p1[0], p1[1], P.shade(col, -0.28), 0.9); } }
      if (o.edge === 'rope') { k = Math.round(r * 0.75); for (i = 0; i < k; i++) { var q0 = polar(rim + 0.8, i / k * 360), q1 = polar(r - 1, i / k * 360 + 7); out += P.line(q0[0], q0[1], q1[0], q1[1], P.shade(col, -0.3), 1.4) + P.line(q0[0] + 0.8, q0[1] - 0.8, q1[0] + 0.8, q1[1] - 0.8, P.shade(col, 0.25), 0.7); } }
      if (o.edge === 'flute') out += P.circle(0, 0, rim + 1.5, 'none', P.shade(col, 0.2), 1);
      out += P.path(P.blob(rnd, rim, rim, 0.025, 14), top, P.shade(col, -0.18), 0.8);
      out += P.path(P.blob(rnd, rim * 0.68, rim * 0.62, 0.06, 10, -rim * 0.12, -rim * 0.15), P.shade(top, 0.22), null, 0, { opacity: '0.65' });
      if (o.puff) for (i = 0; i < 3; i++) out += P.path(arcD(P, rim * (0.55 + i * 0.14), 150 + i * 70, 230 + i * 70, 0, 0), 'none', P.shade(top, 0.3), 1.2, { opacity: '0.7', 'stroke-linecap': 'round' });
      out += P.g('', P.crumbs(rnd, Math.round(r / 2), rim * 0.82, rim * 0.82, [P.shade(top, -0.2), P.shade(top, 0.25)], 0.9), { opacity: '0.8' });
      var nv = o.nv || 4;
      if (o.vents === 'slits') for (i = 0; i < nv; i++) { a = i * 360 / nv + 45; var v = polar(rim * 0.42, a); out += P.g(P.at(v[0], v[1], a), slit(P, rim * 0.28)); }
      if (o.vents === 'hole' || o.vents === 'slits') out += P.circle(0, 0, rim * 0.07 + 1.2, '#6B3A14', P.shade(top, 0.25), 1.2);
      if (o.vents === 'cross') out += P.g(P.at(0, 0, 45), slit(P, rim * 0.45)) + P.g(P.at(0, 0, -45), slit(P, rim * 0.45));
      return out + P.hl(-rim * 0.34, -rim * 0.42, rim * 0.3, rim * 0.09, '#FFFFFF', 0.4, -30);
    };
  }
  function partyPie(P, rnd) {
    var out = P.shadow(P.blob(rnd, 22, 22, 0.02, 12), 2, 2.5), k = 30;
    out += P.path(fluteD(P, 22.5, 15, 0.9), '#C9CDD2', '#8E959E', 0.9);
    for (var i = 0; i < k; i++) { var p = polar(17, i / k * 360), q = polar(21.5, i / k * 360); out += P.line(p[0], p[1], q[0], q[1], i % 2 ? '#E3E6EA' : '#A9AFB6', 0.8); }
    return out + pieTop({ r: 18, rim: 3, edge: 'fork', vents: 'hole', noShadow: true })(P, rnd);
  }
  function potatoTop(P, rnd) {
    var r = 40, d = P.blob(rnd, r, r, 0.02, 16), out = P.shadow(d, 2.5, 3) + P.path(d, '#C9883A', '#8A5527', 1.1);
    for (var i = 0; i < 44; i++) { var p0 = polar(r - 4.5, i / 44 * 360), p1 = polar(r - 1.2, i / 44 * 360); out += P.line(p0[0], p0[1], p1[0], p1[1], '#9E6428', 0.9); }
    out += P.circle(0, 0, r - 5, '#EADCB2', '#C9A870', 0.8);
    var pts = [[0, 0]];
    [[6, 10.5], [12, 21], [17, 30]].forEach(function (ring, j) { for (var k = 0; k < ring[0]; k++) pts.push(polar(ring[1], k / ring[0] * 360 + j * 10)); });
    pts.sort(function (a, b) { return a[1] - b[1]; }).forEach(function (p) {
      var x = p[0], y = p[1];
      out += P.circle(x + 0.8, y + 1, 5.4, '#C9B080', null, 0, { opacity: '0.6' }) + P.circle(x, y, 5.3, '#F4E8C6', '#D9C58F', 0.6);
      out += P.path('M' + nn(P, x + 3.6, y) + ' Q' + nn(P, x + 3.2, y - 3.6) + ' ' + nn(P, x, y - 3.6) + ' Q' + nn(P, x - 3.4, y - 3.2) + ' ' + nn(P, x - 3.4, y) + ' Q' + nn(P, x - 3, y + 2.6) + ' ' + nn(P, x, y + 2.4), 'none', '#D9C58F', 0.7);
      out += P.circle(x - 0.8, y - 1, 2.2, '#D9A24E', null, 0, { opacity: '0.85' }) + P.circle(x - 1.2, y - 1.6, 1, '#A8682A', null, 0);
    });
    return out;
  }
  // a pie sitting on mushy peas, gravy poured over the top
  function pieFloater(o) {
    o = o || {};
    return function (P, rnd) {
      var out = P.path(P.blob(rnd, 60, 55, 0.07, 14), '#7EA453', '#5E8C3A', 1) + P.path(P.blob(rnd, 52, 47, 0.1, 12), '#8DB255', null, 0, { opacity: '0.6' }) + P.crumbs(rnd, 50, 56, 50, ['#6E9A3E', '#9CC067', '#5E8C3A'], 1.6);
      out += P.g(P.at(-3, -2), o.pastie ? pastie({})(P, rnd) : pieTop({ r: 38, edge: 'fork', vents: 'hole' })(P, rnd));
      var gd = o.pastie ? P.blob(rnd, 20, 30, 0.22, 12, 2, 0) : P.blob(rnd, 25, 22, 0.25, 12, 3, 0);
      out += P.path(gd, C.gravy, P.shade(C.gravy, -0.25), 0.8);
      (o.pastie ? [[30, 18], [-150, 22]] : [[40, 34], [165, 33], [100, 32]]).forEach(function (dr) { var c = polar(dr[1], dr[0], 3, 0); out += P.path(P.blob(rnd, 5, 11, 0.15, 8, c[0], c[1], dr[0] + 90), C.gravy, P.shade(C.gravy, -0.25), 0.8); });
      out += P.path(gd, C.gravy, null, 0) + P.hl(-4, -8, 9, 3, '#FFFFFF', 0.35, -20) + P.hl(10, 6, 4, 1.5, '#FFFFFF', 0.25, -20);
      if (o.sauce) out += P.path('M-12 -4 Q-4 -12 4 -4 T20 -4', 'none', C.sauceRed, 3, { 'stroke-linecap': 'round' });
      return out;
    };
  }
  // a pastie on its back, the crimp along the top
  function pastie(o) {
    o = o || {};
    return function (P, rnd) {
      var l = o.l || 50, w = o.w || 29, pts = [[-l, 2], [-l * 0.7, -w * 0.85], [0, -w * 1.05], [l * 0.7, -w * 0.85], [l, 0], [l * 0.7, w * 0.88], [0, w * 1.02], [-l * 0.7, w * 0.86]];
      var d = P.smooth(pts), out = P.shadow(d, 2.5, 3) + P.path(d, '#C9883A', '#8E5A22', 1.2) + P.path(P.smooth(grow(pts, 0.86)), '#DDA04A', null, 0);
      out += P.path(P.blob(rnd, l * 0.5, w * 0.3, 0.1, 10, -l * 0.1, -w * 0.45), '#EBC074', null, 0, { opacity: '0.6' });
      out += P.path('M' + nn(P, -l * 0.8, 1.5) + ' Q0 ' + P.n(w * 0.2) + ' ' + nn(P, l * 0.8, 1.5), 'none', '#000000', 4, { opacity: '0.1' });
      for (var x = -l * 0.8; x <= l * 0.8; x += 5) { var t = x / l, s = 1 - t * t * 0.55; out += P.ellipse(x, 0, 3.4 * s, 5.6 * s, '#D99A45', '#9E6428', 0.8, { transform: 'rotate(35 ' + P.n(x) + ' 0)' }) + P.ellipse(x - 0.8, -1.4, 1.2 * s, 2.4 * s, '#F0CC86', null, 0, { transform: 'rotate(35 ' + P.n(x - 0.8) + ' -1.4)' }); }
      return out + P.hl(-l * 0.4, -w * 0.62, l * 0.22, w * 0.08, '#FFFFFF', 0.4, -8);
    };
  }
  function sausageRoll(o) {
    o = o || {};
    return function (P, rnd) {
      var l = o.l || 82, w = o.w || 34, d = rrD(P, -l / 2, -w / 2, l, w, w * 0.32), out = P.shadow(d, 2.5, 3), i;
      out += P.ellipse(-l / 2 + 1, 0, 3, w * 0.28, '#B07A5A', '#7E4A34', 0.6) + P.ellipse(l / 2 - 1, 0, 3, w * 0.28, '#B07A5A', '#7E4A34', 0.6);
      out += P.path(d, '#C98A3A', '#8E5A22', 1.2) + P.path(rrD(P, -l / 2 + 3, -w / 2 + 3, l - 6, w - 7.5, w * 0.26), '#DDA04A', null, 0);
      out += P.line(-l / 2 + 6, w / 2 - 3.5, l / 2 - 6, w / 2 - 3.5, '#EBC074', 1.2, { opacity: '0.8' }) + P.line(-l / 2 + 7, w / 2 - 1.8, l / 2 - 7, w / 2 - 1.8, '#B9772E', 0.8) + P.line(-l / 2 + 6, -w / 2 + 2.4, l / 2 - 6, -w / 2 + 2.4, '#EBC074', 0.9, { opacity: '0.7' });
      var n0 = Math.max(2, Math.round(l / 20));
      for (i = 0; i < n0; i++) { var x = (i - (n0 - 1) / 2) * (l - 18) / n0; out += P.line(x - 3, -w * 0.24, x + 3, w * 0.18, '#8E5A22', 2.2) + P.line(x - 1.8, -w * 0.24, x + 4.2, w * 0.18, '#F0CC86', 0.8); }
      if (o.seeds) out += seedsIn(P, rnd, o.seeds, l * 0.4, w * 0.3, [C.sesame], 0.9);
      return out + P.hl(-l * 0.2, -w * 0.22, l * 0.25, w * 0.08, '#FFFFFF', 0.4);
    };
  }
  function pithivier(P, rnd) {
    var r = 44, d = fluteD(P, r + 2, 14, 2.4), out = P.shadow(d, 2.5, 3) + P.path(d, '#D9A04A', '#9E6428', 1.1) + P.circle(0, 0, 36.5, 'none', '#EBC074', 1.2);
    out += P.circle(0, 0, 34, '#C98236', '#9E6428', 0.9) + P.path(P.blob(rnd, 22, 19, 0.08, 10, -6, -8), '#D99A45', null, 0, { opacity: '0.6' });
    for (var i = 0; i < 14; i++) { var a = i / 14 * 360, m = polar(19, a - 32), e = polar(33, a); out += P.path('M0 0 Q' + nn(P, m[0], m[1]) + ' ' + nn(P, e[0], e[1]), 'none', '#7E4A1E', 1.1) + P.path('M1 1 Q' + nn(P, m[0] + 1, m[1] + 1) + ' ' + nn(P, e[0] + 0.8, e[1] + 0.8), 'none', '#EBB866', 0.7, { opacity: '0.7' }); }
    return out + P.circle(0, 0, 2.4, '#5E2E10') + P.hl(-12, -16, 10, 3, '#FFFFFF', 0.45, -30);
  }
  function tartCase(o) {
    o = o || {};
    return function (P, rnd) {
      var r = o.r || 34, d = fluteD(P, r + 1, 24, 0.9), out = P.shadow(d, 2, 2.5) + P.path(d, '#D9A55A', '#A8763E', 1);
      out += P.circle(0, 0, r - 4, '#C99450', '#B07E40', 0.6) + P.path(arcD(P, r - 5.5, 160, 290, 0, 0), 'none', '#A8763E', 2.5, { opacity: '0.5', 'stroke-linecap': 'round' });
      out += P.circle(1, 1, r - 8, '#E8BE78', null, 0);
      out += P.scatter(rnd, 12, r - 13, r - 13, function (x, y) { return P.circle(x, y, 0.8, '#B9884A', null, 0); }, 6);
      return out + P.path(arcD(P, r - 1.5, 195, 255, 0, 0), 'none', '#F2D08E', 1.6, { 'stroke-linecap': 'round' });
    };
  }
  function quiche(P, rnd) {
    var R = 78, a0 = -117, a1 = -63, cy = 40, d = sectorD(P, R, a0, a1, 0, cy), out = P.shadow(d, 2, 2.5) + P.path(d, '#D9A55A', '#A8763E', 1.1), i;
    for (i = 0; i <= 12; i++) { var b = polar(R - 1, a0 + 1.5 + i * (a1 - a0 - 3) / 12, 0, cy); out += P.circle(b[0], b[1], 2.4, '#E2B46A', '#A8763E', 0.5); }
    out += P.path(sectorD(P, R - 7, a0 + 0.8, a1 - 0.8, 0, cy - 0.8), '#F2D27A', '#D9B04E', 0.6);
    for (i = 0; i < 9; i++) { var p = inSector(rnd, 14, R - 14, a0 + 5, a1 - 5, 0, cy); out += P.path(P.blob(rnd, 3 + rnd() * 5, 2 + rnd() * 3, 0.3, 7, p[0], p[1]), '#D9A24E', null, 0, { opacity: '0.6' }); }
    for (i = 0; i < 16; i++) { var s = inSector(rnd, 10, R - 12, a0 + 5, a1 - 5, 0, cy); out += P.path(P.blob(rnd, 1.8, 1.3, 0.3, 6, s[0], s[1], rnd() * 180), ['#4F7F2F', '#C9706A', '#F7EBC4'][i % 3], null, 0); }
    return out + P.hl(-6, -16, 8, 2.5, '#FFFFFF', 0.35, -10);
  }
  function spanakopita(P, rnd) {
    var T = [[-33, 22], [33, 22], [0, -34]], out = P.shadow(roundPoly(P, T, 6), 2.5, 3) + P.path(roundPoly(P, T, 6), '#C98A3A', '#8E5A22', 1.1);
    ['#D99A45', '#E2AA55', '#EBBE6E', '#E6B060'].forEach(function (c, i) { out += P.path(roundPoly(P, shift(inset(T, 2 + i * 2.4), (rnd() - 0.5) * 2, (rnd() - 0.5) * 2, (rnd() - 0.5) * 4), 5), c, '#B9803F', 0.6); });
    out += P.scatter(rnd, 9, 13, 10, function (x, y, i, q) { return P.g(P.at(x, y + 4, q() * 180), P.path('M-4 -2 L3 -3 L5 1 L-2 3 Z', '#F4D08A', '#C99A50', 0.5)); });
    return out + seedsIn(P, rnd, 5, 10, 8, [C.sesame], 0.8, 0, 6) + P.hl(-6, -6, 8, 2.5, '#FFFFFF', 0.4, -50);
  }
  function volAuVent(P, rnd) {
    var d = P.blob(rnd, 25, 25, 0.03, 12), out = P.shadow(d, 2, 2.5) + P.path(d, '#D9A04A', '#9E6428', 1.1) + P.circle(0, 0, 22, 'none', '#EBC074', 1.2) + P.circle(0, 0, 19, 'none', '#C98A3A', 0.8);
    out += P.circle(0, 0, 14, '#B9803F', null, 0) + P.path(P.blob(rnd, 12.5, 12, 0.1, 9, 0, -0.5), '#F1E2BE', '#D9C49A', 0.6);
    out += P.scatter(rnd, 4, 8, 8, function (x, y, i, q) { return P.g(P.at(x, y, q() * 360), P.path('M-3.5 0.5 Q-3.5 -3.5 0 -3.5 Q3.5 -3.5 3.5 0.5 Z', '#C9A880', '#8A6A4A', 0.5)); }) + P.crumbs(rnd, 8, 9, 9, ['#3F7A2A'], 0.8);
    var lid = P.ellipse(0, 0, 10, 9, '#000000', null, 0, { opacity: '0.12', transform: 'translate(1.5 2)' }) + P.ellipse(0, 0, 10, 9, '#D9A04A', '#9E6428', 0.9) + P.ellipse(0, 0, 7, 6.2, 'none', '#EBC074', 0.9) + P.hl(-3, -3, 3.5, 1.2, '#FFFFFF', 0.5, -30);
    return out + P.g(P.at(19, -19, 20), lid) + P.hl(-12, -14, 6, 2, '#FFFFFF', 0.4, -40);
  }
  function puffLid(P, rnd) {
    var r = 44, d = P.blob(rnd, r, r, 0.02, 16), out = P.shadow(d, 2.5, 3) + P.path(d, '#C98A3A', '#8E5A22', 1.1) + P.path(P.blob(rnd, r - 4, r - 4, 0.02, 16), '#DFA24C', null, 0);
    out += P.circle(0, 0, r - 1.8, 'none', '#EBC074', 1, { opacity: '0.8' });
    var oct = []; for (var i = 0; i < 16; i++) oct.push(polar(r - 9, i * 22.5));
    [45, -45].forEach(function (ang) { out += lines(P, hatch(oct, ang, 11, 0), '#B07A34', 1.2); });
    out += P.path(P.blob(rnd, r * 0.55, r * 0.45, 0.08, 10, -8, -10), '#EBB866', null, 0, { opacity: '0.4' });
    return out + P.circle(0, 0, 2.6, '#6B3A14', '#F0C98A', 1) + P.hl(-14, -18, 12, 3, '#FFFFFF', 0.4, -30);
  }

  /* ---------- sandwiches ---------- */
  // fillings that peek out past the bread: [colour, how far out, wave]
  var FILL = {
    lettuce: [C.lettuce, 5.5, 1.4], tomato: [C.tomato, 3.8, 0], bacon: ['#B5503F', 4.5, 0.6], cheese: [C.cheese, 3, 0], ham: ['#E8A3A0', 3.8, 0.4],
    egg: ['#F6E08A', 3.4, 0.3], chicken: ['#E9CC92', 3.6, 0.3], beef: ['#C9706A', 4, 0.5], kraut: ['#E6DCA0', 5, 1.2], steak: [C.beefCrust, 3.6, 0.4],
    beet: [C.beet, 4.2, 0], onion: ['#B98A4A', 3.2, 0.8], aioli: [C.aioli, 2.4, 0], cucumber: ['#9CC067', 3.4, 0], dressing: ['#E8955A', 2.2, 0]
  };
  // one piece of a sandwich: the fillings peeking out (first in the list is the furthest out), then the bread
  function sandPiece(P, rnd, a, fills, bread) {
    var out = P.shadow(roundPoly(P, a, bread.r === undefined ? 4 : bread.r), 2.5, 3);
    fills.forEach(function (k) { var f = FILL[k]; out += peek(P, rnd, a, f[1], f[0], { wave: f[2] }); });
    return out + breadPoly(P, rnd, a, Object.assign({ noShadow: true }, bread));
  }
  function sandwich(pieces) { return function (P, rnd) { return pieces.map(function (p) { return sandPiece(P, rnd, shift(p[0], p[1], p[2], p[3]), p[4], p[5]); }).join(''); }; }
  var S = 37, TRI = [[[-S, -S], [S, -S], [-S, S]], [[S, -S], [S, S], [-S, S]]];
  var QUAD = [[[-S, -S], [S, -S], [0, 0]], [[S, -S], [S, S], [0, 0]], [[S, S], [-S, S], [0, 0]], [[-S, S], [-S, -S], [0, 0]]];
  var WHITE = { crust: '#C9965A', top: '#F6EEDA', r: 4 }, RYE = { crust: '#4A3020', top: '#8A6440', spots: 6, spotCol: '#6E4A2E', caraway: 18, r: 4 };
  // a club sandwich: four toasted quarters, each with a toothpick and frill
  function club(P, rnd) {
    var out = '', cols = ['#C0392B', '#3F7A2A', '#E8C22A', '#2E6AA8'];
    QUAD.forEach(function (q, i) {
      var c = centre(q), l = Math.hypot(c[0], c[1]), a = shift(q, c[0] / l * 7, c[1] / l * 7, 0), m = centre(a);
      out += sandPiece(P, rnd, a, ['lettuce', 'tomato', 'bacon', 'chicken'], TOAST);
      var fr = '';
      for (var k = 0; k < 10; k++) { var p = polar(4.2, k * 36, m[0], m[1]); fr += P.line(m[0], m[1], p[0], p[1], cols[i], 1.3); }
      out += P.circle(m[0] + 1.5, m[1] + 2, 4.2, '#000000', null, 0, { opacity: '0.15' }) + fr + P.circle(m[0], m[1], 1.6, '#D9B98A', '#A8865A', 0.5);
    });
    return out;
  }

  /* ---------- breakfast and baked ---------- */
  function croissant(o) {
    o = o || {};
    return function (P, rnd) {
      var R = o.R || 40, cy = o.cy || 30, k = 7, segs = [], out = '';
      for (var i = 0; i < k; i++) {
        var t = i / (k - 1), m = 1 - Math.abs(t - 0.5) * 2, p = polar(R, -90 + (t - 0.5) * 128, 0, cy);
        segs.push({ x: p[0], y: p[1], rot: (t - 0.5) * 128, rx: 8 + m * 4.5, ry: 7.5 + m * 13, m: m });
      }
      segs.forEach(function (s) { out += P.ellipse(s.x + 2, s.y + 2.5, s.rx + 1, s.ry, '#000000', null, 0, { opacity: '0.1', transform: 'rotate(' + P.n(s.rot) + ' ' + P.n(s.x + 2) + ' ' + P.n(s.y + 2.5) + ')' }); });
      segs.slice().sort(function (a, b) { return a.m - b.m; }).forEach(function (s) {
        var col = P.mix('#A8582A', '#D9963E', s.m), tr = 'rotate(' + P.n(s.rot) + ' ' + P.n(s.x) + ' ' + P.n(s.y) + ')';
        out += P.ellipse(s.x, s.y, s.rx, s.ry, col, P.shade(col, -0.32), 1, { transform: tr }) + P.ellipse(s.x - s.rx * 0.2, s.y - s.ry * 0.15, s.rx * 0.5, s.ry * 0.62, P.shade(col, 0.25), null, 0, { transform: tr, opacity: '0.6' });
      });
      return out + P.hl(-6, -18, 6, 2.2, '#FFFFFF', 0.5, -10);
    };
  }
  function painChoc(P, rnd) {
    var out = P.shadow(rrD(P, -38, -23, 76, 46, 14), 2.5, 3);
    [-1, 1].forEach(function (sx) { [-8, 8].forEach(function (y) { out += P.rect(sx * 38 - 4, y - 3, 8, 6, 1.5, B.choc, '#2E160C', 0.6); }); });
    [[-22, 0.35], [22, 0.35], [0, 1]].forEach(function (b) { var x = b[0], col = P.mix('#A8582A', '#D9963E', b[1]); out += P.path(rrD(P, x - 16, -23, 32, 46, 12), col, P.shade(col, -0.32), 1) + P.path(rrD(P, x - 10, -18, 17, 30, 8), P.shade(col, 0.22), null, 0, { opacity: '0.55' }); });
    return out + P.hl(-6, -12, 10, 3, '#FFFFFF', 0.4, -10);
  }
  function cruffin(P, rnd) {
    var r = 27, d = P.blob(rnd, r, r, 0.03, 14), out = P.shadow(d, 2.5, 3) + P.path(d, '#C98A3A', '#8E5A22', 1.1) + P.path(P.blob(rnd, r - 3, r - 3, 0.04, 12), '#DDA04A', null, 0), pts = [];
    for (var t = 0; t <= Math.PI * 2 * 2.6; t += 0.45) { var rr = 6 + t / (Math.PI * 2 * 2.6) * (r - 8); pts.push([Math.cos(t) * rr, Math.sin(t) * rr]); }
    out += P.path(P.smooth(pts, true), 'none', '#9E6428', 1.6, { 'stroke-linecap': 'round' }) + P.path(P.smooth(pts.map(function (p) { return [p[0] - 0.9, p[1] - 0.9]; }), true), 'none', '#EBC074', 0.9, { opacity: '0.7' });
    out += dust(P, rnd, 34, r - 3, r - 3, 0.9, 0.8);
    return out + P.path(P.blob(rnd, 8, 7.5, 0.12, 9), '#F2D27A', '#D9B04E', 0.8) + P.hl(-2.5, -2.5, 3, 1.5, '#FFFFFF', 0.6);
  }
  function scone(P, rnd) {
    var out = '';
    [[-25, 2, 0], [25, -2, 1]].forEach(function (h) {
      var x = h[0], y = h[1], d = P.blob(rnd, 24, 23, 0.06, 12, x, y);
      out += P.shadow(d, 2, 2.5) + P.path(d, '#C98A3A', '#8E5A22', 1.1) + P.path(P.blob(rnd, 21, 20, 0.07, 12, x, y), '#F2DCAA', '#E0C084', 0.6);
      out += P.g(P.at(x, y), P.crumbs(rnd, 8, 17, 16, ['#E0C084'], 0.8));
      var jam = function (rx, dx, dy) { return P.path(P.blob(rnd, rx, rx * 0.92, 0.2, 10, x + dx, y + dy), B.jam, '#8A1A2A', 0.8) + P.hl(x + dx - rx * 0.3, y + dy - rx * 0.3, rx * 0.3, rx * 0.15, '#FFFFFF', 0.45, -30); };
      var cream = function (rx, dx, dy) { return P.path(P.blob(rnd, rx, rx * 0.9, 0.18, 9, x + dx, y + dy), B.cream, '#E0D6BE', 0.8) + P.path('M' + nn(P, x + dx - rx * 0.5, y + dy) + ' Q' + nn(P, x + dx, y + dy - rx * 0.6) + ' ' + nn(P, x + dx + rx * 0.5, y + dy), 'none', '#E6DCC4', 0.9); };
      out += h[2] ? cream(13, 1, 1) + jam(7, -1, -2) : jam(13, 1, 1) + cream(9, -1, -2);
    });
    return out;
  }
  function pancakes(P, rnd) {
    var r = 42, d0 = P.blob(rnd, r, r * 0.98, 0.04, 14), out = P.shadow(d0, 3, 4);
    out += P.path(P.blob(rnd, r, r * 0.98, 0.05, 14, 3, 5), '#B9772E', '#8A5527', 1) + P.path(P.blob(rnd, r, r * 0.98, 0.05, 14, 1.5, 2.5), '#C98A3A', '#8A5527', 1);
    out += P.path(d0, '#E3B46A', '#8A5527', 1.1) + P.path(P.blob(rnd, r - 5, r - 5, 0.05, 14), '#C98838', null, 0) + P.path(P.blob(rnd, r * 0.5, r * 0.45, 0.1, 10, -8, -10), '#D9A050', null, 0, { opacity: '0.6' });
    var sy = P.blob(rnd, 27, 23, 0.22, 12, 5, 4);
    out += P.path(P.blob(rnd, 6, 13, 0.15, 8, 30, 26, -45), '#A8601E', '#7E4414', 0.8) + P.path(P.blob(rnd, 5, 11, 0.15, 8, -12, 37, 10), '#A8601E', '#7E4414', 0.8);
    out += P.path(sy, '#A8601E', '#7E4414', 0.8, { opacity: '0.9' }) + P.hl(10, 10, 8, 2.5, '#FFFFFF', 0.35, -30);
    out += P.path(P.blob(rnd, 11, 10, 0.2, 9, -3, -5), '#F2D27A', null, 0, { opacity: '0.7' }) + P.g(P.at(-4, -6, 18), P.rect(-7.5, -6.5, 15, 13, 2, '#F6E08A', '#D9BF5A', 0.8) + P.rect(-5.5, -4.5, 7, 3, 1, '#FFF4C2', null, 0));
    return out;
  }
  function waffle(P, rnd) {
    var s = 36, d = rrD(P, -s, -s, s * 2, s * 2, 9), out = P.shadow(d, 2.5, 3) + P.path(d, '#C98A3A', '#8E5A22', 1.2) + P.path(rrD(P, -s + 2.5, -s + 2.5, s * 2 - 5, s * 2 - 5, 7), '#E0AA58', null, 0);
    var k = 5, cell = (s * 2 - 10) / k;
    for (var i = 0; i < k; i++) for (var j = 0; j < k; j++) {
      var x = -s + 5 + i * cell, y = -s + 5 + j * cell;
      out += P.rect(x + 1.7, y + 1.7, cell - 3.4, cell - 3.4, 1.5, '#B9772E', '#9E6428', 0.5) + P.rect(x + 2.4, y + 2.4, cell - 4.8, (cell - 4.8) * 0.35, 1, '#9E6428', null, 0, { opacity: '0.6' });
    }
    return out + P.hl(-16, -24, 14, 3, '#FFFFFF', 0.35, -10);
  }
  function crepe(P, rnd) {
    var R = 74, cy = 36, d = sectorD(P, R, -135, -45, 0, cy), out = P.shadow(d, 2, 2.5) + P.path(d, '#EED29A', '#C9A060', 1);
    out += P.path(sectorD(P, R - 5, -131, -49, 0, cy - 4), '#F2DCA8', '#E0C084', 0.7);
    for (var i = 0; i < 46; i++) { var p = inSector(rnd, 10, R - 4, -132, -48, 0, cy); out += P.path(P.blob(rnd, 1 + rnd() * 2.6, 0.8 + rnd() * 1.6, 0.3, 6, p[0], p[1]), i % 4 ? '#C98A3A' : '#A8682A', null, 0, { opacity: '0.45' }); }
    return out + P.path(arcD(P, R - 2.5, -128, -60, 0, cy), 'none', '#D9AE6A', 1.4) + P.hl(-14, -22, 12, 3, '#FFFFFF', 0.35, -20);
  }
  function poffertjes(P, rnd) {
    var out = P.pile(rnd, 11, 33, 25, function (x, y, i, q) {
      var r = 10 + q() * 1.5;
      return P.shadow(circleD(P, x, y, r), 1.5, 2) + P.circle(x, y, r, '#EBCB8A', '#B9803F', 0.9) + P.circle(x - 0.5, y - 0.5, r * 0.72, '#C98A3A', null, 0) + P.circle(x - 1, y - 1.2, r * 0.38, '#A8682A', null, 0, { opacity: '0.5' }) + P.hl(x - r * 0.3, y - r * 0.38, r * 0.3, r * 0.14, '#FFFFFF', 0.35, -30);
    });
    out += dust(P, rnd, 50, 38, 30, 0.9, 0.9);
    return out + P.g(P.at(2, -4, 15), P.rect(-6, -5, 12, 10, 2, '#F6E08A', '#D9BF5A', 0.8) + P.rect(-4, -3.5, 5, 2.4, 1, '#FFF4C2', null, 0));
  }
  function yorkshire(P, rnd) {
    var d = P.blob(rnd, 33, 31, 0.1, 13), out = P.shadow(d, 2.5, 3) + P.path(d, '#B9772E', '#7E4A1E', 1.2);
    out += P.path(P.blob(rnd, 28, 26, 0.12, 12), '#D9A050', null, 0);
    out += ringSpots(rnd, 12, 22, 29).map(function (p) { return P.path(P.blob(rnd, 2 + rnd() * 2.5, 1.5 + rnd() * 1.5, 0.3, 6, p[0], p[1]), '#8A5527', null, 0, { opacity: '0.6' }); }).join('');
    out += P.path(arcD(P, 25, 190, 260, 0, 0), 'none', '#F0CC86', 3, { opacity: '0.7', 'stroke-linecap': 'round' });
    out += P.path(P.blob(rnd, 17, 15, 0.15, 10, 1, 1), '#C99A5A', '#A8763E', 0.8) + P.path(P.blob(rnd, 13, 11, 0.15, 9, 3, 3), '#E8C890', null, 0);
    return out;
  }
  function muffinHalves(P, rnd) {
    var out = '';
    [[-31, 0], [31, 1]].forEach(function (c) {
      var d = P.blob(rnd, 30, 29, 0.03, 14, c[0], c[1]);
      out += P.shadow(d, 2, 2.5) + P.path(d, '#E8D2A0', '#C9A870', 1) + P.path(P.blob(rnd, 27, 26, 0.04, 14, c[0], c[1]), '#E6BE78', null, 0);
      out += P.g(P.at(c[0], c[1]), P.path(P.blob(rnd, 17, 15, 0.2, 10), '#D29A4E', null, 0, { opacity: '0.6' }) + P.scatter(rnd, 16, 21, 20, function (x, y, i, q) { return P.path(P.blob(q, 0.9 + q() * 1.8, 0.7 + q(), 0.3, 6, x, y), '#A8742E', null, 0, { opacity: '0.8' }); }) + ringSpots(rnd, 14, 27.5, 29).map(function (p) { return P.circle(p[0], p[1], 0.7, '#E2B85A', null, 0); }).join(''));
    });
    return out;
  }
  function crumpet(P, rnd) {
    var r = 30, d = P.blob(rnd, r, r, 0.02, 14), out = P.shadow(d, 2, 2.5) + P.path(d, '#C98A3A', '#8E5A22', 1) + P.path(P.blob(rnd, r - 2.5, r - 2.5, 0.02, 14), '#E6C484', null, 0);
    out += P.scatter(rnd, 34, r - 6, r - 6, function (x, y, i, q) { var s = 0.9 + q() * 1.3; return P.circle(x, y, s + 0.6, '#F0D8A4', null, 0) + P.circle(x, y, s, '#9E6A2E', null, 0); }, 7);
    return out + P.hl(-10, -12, 8, 2.5, '#FFFFFF', 0.3, -30);
  }
  // a slice off a loaf cake: a flat base, a domed top crust
  function loafD(P, w, h, cy) {
    var x = w / 2, y = h / 2, f = function (a, b) { return nn(P, a, b + (cy || 0)); };
    return 'M' + f(-x + 3, y) + ' L' + f(x - 3, y) + ' Q' + f(x, y) + ' ' + f(x, y - 3) + ' L' + f(x, -h * 0.18) + ' Q' + f(x, -y) + ' ' + f(0, -y) + ' Q' + f(-x, -y) + ' ' + f(-x, -h * 0.18) + ' L' + f(-x, y - 3) + ' Q' + f(-x, y) + ' ' + f(-x + 3, y) + ' Z';
  }
  function bananaBread(P, rnd) {
    var d = loafD(P, 78, 58), out = P.shadow(d, 2, 2.5) + P.path(d, '#5E3418', '#3E220E', 1) + P.path(loafD(P, 72, 52, 0.8), '#B9803F', null, 0);
    out += P.scatter(rnd, 9, 28, 18, function (x, y, i, q) { return P.path('M' + nn(P, x - 4, y) + ' Q' + nn(P, x, y - 2) + ' ' + nn(P, x + 4, y + 0.5), 'none', '#7E4A22', 1.3, { opacity: '0.7', 'stroke-linecap': 'round' }); });
    out += P.scatter(rnd, 5, 26, 16, function (x, y, i, q) { return P.path(P.blob(q, 2.4, 1.8, 0.3, 6, x, y), '#D9B07A', '#A8803A', 0.5); });
    out += P.crumbs(rnd, 18, 30, 20, ['#A06A30'], 0.6);
    return out + P.hl(-14, -18, 12, 2.5, '#FFFFFF', 0.25, -5);
  }

  /* @@ITEMS@@ */
})();
