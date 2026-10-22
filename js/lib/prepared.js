/* The drawing library: prepared components (see js/library.js for the fields). Drawn around 0,0, 1 unit is about 1.5 mm. */
(function () {
  'use strict';
  var L = window.LK_LIB, C = L.P.C, N = L.P.n;

  /* ---------- shapes ---------- */
  // a log with round ends (spring roll, taquito), l long and w wide
  function logD(l, w) {
    var r = w / 2, s = Math.max(0, l / 2 - r);
    return 'M' + N(-s) + ' ' + N(-r) + ' H' + N(s) + ' A' + N(r) + ' ' + N(r) + ' 0 0 1 ' + N(s) + ' ' + N(r) + ' H' + N(-s) + ' A' + N(r) + ' ' + N(r) + ' 0 0 1 ' + N(-s) + ' ' + N(-r) + ' Z';
  }
  // the same log with a lumpy outline (crumbs, batter): points round it pushed in or out by wob
  function lumpyLog(rnd, l, w, wob, k) {
    k = k || 20;
    var r = w / 2, s = Math.max(0, l / 2 - r), per = 4 * s + 2 * Math.PI * r, pts = [];
    for (var i = 0; i < k; i++) {
      var t = i / k * per, x, y, a, nx, ny;
      if (t < 2 * s) { x = -s + t; y = -r; nx = 0; ny = -1; }
      else if (t < 2 * s + Math.PI * r) { a = (t - 2 * s) / r; x = s + Math.sin(a) * r; y = -Math.cos(a) * r; nx = Math.sin(a); ny = -Math.cos(a); }
      else if (t < 4 * s + Math.PI * r) { x = s - (t - 2 * s - Math.PI * r); y = r; nx = 0; ny = 1; }
      else { a = (t - 4 * s - Math.PI * r) / r; x = -s - Math.sin(a) * r; y = Math.cos(a) * r; nx = -Math.sin(a); ny = Math.cos(a); }
      var j = (rnd() * 2 - 1) * (wob || 0) * r;
      pts.push([x + nx * j, y + ny * j]);
    }
    return L.P.smooth(pts);
  }
  // a polygon with its corners rounded off by r (samosa, corn chips, cut squares)
  function roundPoly(pts, r) {
    var m = pts.length, d = '';
    for (var i = 0; i < m; i++) {
      var p = pts[i], a = pts[(i - 1 + m) % m], b = pts[(i + 1) % m];
      var la = Math.hypot(a[0] - p[0], a[1] - p[1]) || 1, lb = Math.hypot(b[0] - p[0], b[1] - p[1]) || 1;
      var ra = Math.min(r, la / 2), rb = Math.min(r, lb / 2);
      var s = [p[0] + (a[0] - p[0]) * ra / la, p[1] + (a[1] - p[1]) * ra / la], e = [p[0] + (b[0] - p[0]) * rb / lb, p[1] + (b[1] - p[1]) * rb / lb];
      d += (i ? ' L' : 'M') + N(s[0]) + ' ' + N(s[1]) + ' Q' + N(p[0]) + ' ' + N(p[1]) + ' ' + N(e[0]) + ' ' + N(e[1]);
    }
    return d + ' Z';
  }
  // a point on a cubic curve, and the curve's angle there (degrees)
  function bez(p, t) {
    var u = 1 - t, x = u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0];
    var y = u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1];
    var dx = 3 * u * u * (p[1][0] - p[0][0]) + 6 * u * t * (p[2][0] - p[1][0]) + 3 * t * t * (p[3][0] - p[2][0]);
    var dy = 3 * u * u * (p[1][1] - p[0][1]) + 6 * u * t * (p[2][1] - p[1][1]) + 3 * t * t * (p[3][1] - p[2][1]);
    return [x, y, Math.atan2(dy, dx) * 180 / Math.PI];
  }
  // a spiral (the swirl in a dip), open
  function spiralD(r0, r1, turns, a0) {
    var pts = [], k = Math.round(turns * 14);
    for (var i = 0; i <= k; i++) { var t = i / k, a = (a0 || 0) + t * turns * Math.PI * 2, r = r0 + (r1 - r0) * t; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    return L.P.smooth(pts, true);
  }

  /* ---------- coatings and small parts ---------- */
  // crumbs, batter or pastry over an outline: shadow, base, a lighter middle, crumbs and a shine
  function coat(P, rnd, d, rx, ry, col, o) {
    o = o || {};
    var out = (o.shadow === false ? '' : P.shadow(d)) + P.path(d, col, P.shade(col, -0.3), o.sw || 1);
    out += P.path(P.blob(rnd, rx * 0.8, ry * 0.7, 0.08, 10, -rx * 0.05, -ry * 0.08), P.shade(col, o.lift || 0.14), null, 0, { opacity: '0.8' });
    if (o.crumbs !== false) out += P.crumbs(rnd, o.count || Math.max(6, Math.round(rx * ry / 16)), rx * 0.86, ry * 0.8, o.cc || [P.shade(col, -0.25), P.shade(col, 0.32), C.crumbDark], o.cr || 0.75);
    out += P.hl(-rx * 0.3, -ry * 0.38, rx * 0.34, ry * 0.16, '#FFFFFF', o.shine === undefined ? 0.3 : o.shine, -8);
    return out;
  }
  // a round crumbed or fried ball (arancini, falafel) with a darker side away from the light
  function ball(o) {
    return function (P, rnd) {
      var r = o.r, col = o.col, d = P.blob(rnd, r, r, o.wob || 0.05, o.k || 10);
      var out = coat(P, rnd, d, r, r, col, { count: o.count, cr: o.cr, cc: o.cc, shine: 0.35 });
      out += P.path('M' + N(-r * 0.8) + ' ' + N(r * 0.45) + ' Q' + N(r * 0.5) + ' ' + N(r * 1.15) + ' ' + N(r * 0.92) + ' ' + N(-r * 0.25) + ' Q' + N(r * 0.55) + ' ' + N(r * 0.62) + ' ' + N(-r * 0.8) + ' ' + N(r * 0.45) + ' Z', P.shade(col, -0.3), null, 0, { opacity: '0.3' });
      if (o.extra) out += o.extra(P, rnd, r);
      return out;
    };
  }
  // a crumbed or battered log (croqueta, cheese stick, the crumbed vegetable roll)
  function crumbedLog(o) {
    return function (P, rnd) {
      var d = lumpyLog(rnd, o.l, o.w, o.wob || 0.06, o.k || 22), out = '';
      if (o.under) out += o.under(P, rnd);
      out += coat(P, rnd, d, o.l / 2, o.w / 2, o.col, { count: Math.round(o.l * o.w / (o.per || 14)), cr: o.cr || 0.7, crumbs: o.crumbs });
      if (o.extra) out += o.extra(P, rnd);
      return out;
    };
  }
  // small herb leaves (coriander, parsley, mint)
  function herbs(P, rnd, count, rx, ry, cols, size) {
    return P.scatter(rnd, count, rx, ry, function (x, y, i, q) { return P.leaf((size || 6) * (0.8 + q() * 0.4), (size || 6) * 0.55, cols[i % cols.length], x, y, q() * 360, { vein: false }); });
  }
  // blisters on fried pastry
  function blisters(P, rnd, count, rx, ry, col, cx, cy) {
    return P.scatter(rnd, count, rx, ry, function (x, y, i, q) { return P.circle(x + (cx || 0), y + (cy || 0), 0.7 + q() * 1.2, col, null, 0, { opacity: '0.75' }); });
  }
  // a tortilla chip, rounded triangle
  function cornChip(P, q, x, y, s, col) {
    var k = 0.85 + q() * 0.3, pts = [[0, -s * 0.58 * k], [s * 0.5 * k, s * 0.3 * k], [-s * 0.5 * k, s * 0.3 * k]], d = roundPoly(pts, 3.2);
    var c = P.shade(col || '#E9BC4C', (q() - 0.5) * 0.12);
    return P.g(P.at(x, y, q() * 360), P.shadow(d, 1, 1.4) + P.path(d, c, P.shade(c, -0.28), 0.8) + P.path(roundPoly(pts.map(function (p) { return [p[0] * 0.55, p[1] * 0.55 + 1]; }), 2), P.shade(c, 0.16), null, 0, { opacity: '0.6' }) + P.circle(-s * 0.08, 0, 0.7, P.shade(c, -0.25), null, 0, { opacity: '0.7' }));
  }
  // a dollop (sour cream, guacamole): a soft blob with a lighter top
  function dollop(P, rnd, x, y, r, col) {
    var d = P.blob(rnd, r, r * 0.9, 0.12, 9, x, y);
    return P.shadow(d, 1, 1.5) + P.path(d, col, P.shade(col, -0.2), 0.8) + P.path(P.blob(rnd, r * 0.55, r * 0.45, 0.2, 7, x - r * 0.15, y - r * 0.2), P.shade(col, 0.2), null, 0, { opacity: '0.8' });
  }
  // a jalapeno ring
  function jalapeno(P, x, y, r) { return P.circle(x, y, r, '#5E8C3A', '#3F6A26', 0.6) + P.circle(x, y, r * 0.62, '#CFE3A0', null, 0) + P.circle(x - r * 0.2, y, r * 0.14, '#F4F0D8') + P.circle(x + r * 0.2, y + r * 0.1, r * 0.14, '#F4F0D8'); }

  /* ---------- fried bites ---------- */
  function aranciniHalf(P, rnd) {
    var out = '';
    [[-16, 1, -10], [17, -1, 14]].forEach(function (h) {
      var r = 15, d = P.blob(rnd, r, r * 0.95, 0.04, 10), s = P.shadow(d) + P.path(d, '#D39A4C', P.shade('#D39A4C', -0.3), 1.1);
      s += P.crumbs(rnd, 10, r * 0.95, r * 0.9, ['#B97A36', '#E8BE78'], 0.7);
      s += P.path(P.blob(rnd, r * 0.8, r * 0.76, 0.05, 10), '#F1DE9E', '#DCC27A', 0.7);
      s += P.scatter(rnd, 18, r * 0.7, r * 0.66, function (x, y, i, q) { return P.ellipse(x, y, 1.5, 0.8, i % 3 ? '#FAF0CC' : '#E3CB86', null, 0, { transform: 'rotate(' + N(q() * 180) + ' ' + N(x) + ' ' + N(y) + ')' }); });
      s += P.path(P.blob(rnd, r * 0.36, r * 0.32, 0.18, 8), '#FBF6E6', '#EDE3C4', 0.6) + P.circle(r * 0.16, r * 0.12, 1.6, '#A3402A') + P.circle(-r * 0.16, -r * 0.04, 1.3, '#A3402A') + P.circle(r * 0.04, -r * 0.18, 1.3, '#7EA453');
      s += P.hl(-r * 0.4, -r * 0.5, r * 0.3, r * 0.1, '#FFFFFF', 0.35, -20);
      out += P.g(P.at(h[0], h[1], h[2]), s);
    });
    return out;
  }
  function tempura(P, rnd) {
    var bat = '#F2DFA6', edge = P.shade(bat, -0.3), out = '';
    function piece(x, y, rot, rx, ry, inner) {
      var d = P.blob(rnd, rx, ry, 0.16, 16);
      return P.g(P.at(x, y, rot), P.shadow(d) + P.path(d, bat, edge, 0.9) + inner + P.path(P.blob(rnd, rx * 0.86, ry * 0.84, 0.18, 14), '#FFF8E4', null, 0, { opacity: '0.35' }) + P.crumbs(rnd, Math.round(rx * ry / 18), rx * 0.8, ry * 0.8, ['#E3C277', '#FFFFFF'], 0.7));
    }
    var broc = ''; for (var i = 0; i < 6; i++) broc += P.circle(-6 + (i % 3) * 6 + (i > 2 ? 3 : 0), -3 + (i > 2 ? 5 : 0), 4, i % 2 ? '#5E8C3A' : '#6E9A3E', '#4F7F2F', 0.5);
    out += piece(-2, -24, 0, 15, 12, broc);
    out += piece(25, -15, 10, 15, 14, P.circle(0, 0, 11, '#EFE3C0', '#5E2A4A', 2.2));
    out += piece(-24, -13, 0, 17, 16, P.circle(0, 0, 12.5, '#E8964A', '#C9702A', 0.8) + P.circle(0, 0, 8, '#EEA35A', null, 0));
    out += piece(5, 7, -15, 27, 8, P.path(logD(42, 10), '#7EA453', '#5E8C3A', 0.6) + P.line(-17, 0, 17, 0, '#CFE3A0', 2));
    out += piece(-28, 18, 20, 20, 7, P.path(logD(32, 8), '#D9473B', '#A8302A', 0.6));
    out += piece(27, 17, 0, 13, 12, P.circle(0, 0, 9.5, '#9A7048', '#6E4A2A', 0.6) + P.circle(-2, -2, 4, '#B98E5E', null, 0));
    return out;
  }
  function samosa(P, rnd) {
    var col = '#D9A45A', pts = [[0, -26], [31, 20], [-31, 20]], d = roundPoly(pts, 8), out = P.shadow(d) + P.path(d, col, P.shade(col, -0.3), 1.1);
    out += P.path(roundPoly([[0, -15], [21, 15], [-21, 15]], 6), P.shade(col, 0.15), null, 0, { opacity: '0.7' });
    // the folded seam down one side, and fork marks along the base
    out += P.path('M3 -20 L26 15', 'none', P.shade(col, -0.25), 1.6, { 'stroke-linecap': 'round', opacity: '0.75' }) + P.path('M0 -17 L22 17', 'none', P.shade(col, 0.35), 1.2, { 'stroke-linecap': 'round', opacity: '0.7' });
    for (var x = -20; x <= 20; x += 5) out += P.line(x, 15.5, x, 18.5, P.shade(col, -0.22), 0.9, { opacity: '0.7' });
    out += P.scatter(rnd, 16, 20, 16, function (x, y, i, q) { var yy = y + 3; if (Math.abs(x) > (yy + 26) / 46 * 31 - 5 || yy > 14) return ''; return P.circle(x, yy, 0.9 + q() * 1.3, '#F2D59A', null, 0, { opacity: '0.75' }); });
    return out + P.hl(-7, -2, 9, 3, '#FFFFFF', 0.3, -60);
  }
  function sambousek(P, rnd) {
    var col = '#D9A24E', cv = [[-27, 12], [-27, -22], [27, -22], [27, 12]], d = 'M-27 12 C-27 -22 27 -22 27 12 Q0 16 -27 12 Z', out = P.shadow(d) + P.path(d, col, P.shade(col, -0.3), 1.1);
    out += P.path('M-19 9 C-19 -12 19 -12 19 9 Q0 12 -19 9 Z', P.shade(col, 0.14), null, 0, { opacity: '0.75' });
    // the twisted edge along the curve
    for (var i = 1; i < 17; i++) {
      var b = bez(cv, i / 17), a = (b[2] + 90) * Math.PI / 180;
      out += P.ellipse(b[0] + Math.cos(a) * 2.6, b[1] + Math.sin(a) * 2.6, 3, 1.7, P.shade(col, 0.08), P.shade(col, -0.3), 0.6, { transform: 'rotate(' + N(b[2] + 50) + ' ' + N(b[0] + Math.cos(a) * 2.6) + ' ' + N(b[1] + Math.sin(a) * 2.6) + ')' });
    }
    out += blisters(P, rnd, 10, 12, 5, '#F2D59A', 0, 1);
    return out + P.hl(-6, -6, 9, 2.5, '#FFFFFF', 0.3, -10);
  }
  function kebbe(P, rnd) {
    var col = '#8A5428', d = 'M-24 0 Q-13 -13 0 -12.5 Q13 -13 24 0 Q13 13 0 12.5 Q-13 13 -24 0 Z', out = P.shadow(d) + P.path(d, col, P.shade(col, -0.32), 1.1);
    out += P.path('M-17 0 Q-9 -8 0 -8 Q9 -8 17 0 Q9 6 0 6 Q-9 6 -17 0 Z', P.shade(col, 0.12), null, 0, { opacity: '0.8' });
    ['M-19 -3 Q0 -12 19 -3', 'M-21 1 Q0 -4 21 1', 'M-19 5 Q0 9 19 5'].forEach(function (p, i) { out += P.path(p, 'none', P.shade(col, -0.3), 1.2, { opacity: '0.7', 'stroke-linecap': 'round' }) + P.path(p, 'none', P.shade(col, 0.3), 0.8, { opacity: '0.6', transform: 'translate(0 -1.2)' }); });
    out += P.crumbs(rnd, 10, 16, 7, [P.shade(col, -0.35), P.shade(col, 0.3)], 0.6);
    return out + P.hl(-5, -6, 9, 2.2, '#FFFFFF', 0.3, -8);
  }
  function falafelHalf(P, rnd) {
    var out = '';
    [[-12, 0, -15], [13, 1, 20]].forEach(function (h) {
      var d = P.blob(rnd, 12, 11.5, 0.1, 11), s = P.shadow(d) + P.path(d, '#7A4A1E', '#4F2E12', 1);
      s += P.path(P.blob(rnd, 9.2, 8.8, 0.1, 10), '#7EA453', '#5E7F34', 0.6);
      s += P.crumbs(rnd, 16, 7.5, 7, ['#5E8C3A', '#B9D27A', '#E9DDB0', '#4F7F2F'], 0.8);
      out += P.g(P.at(h[0], h[1], h[2]), s);
    });
    return out;
  }
  function dagwood(sauce) {
    return function (P, rnd) {
      var col = '#C47F34', out = '', stick = 'M14 -2.6 H58 Q60 -2.6 60 0 Q60 2.6 58 2.6 H14 Z';
      out += P.shadow(stick, 1, 1.5) + P.path(stick, '#ECD6A8', '#C9A97A', 0.8);
      var d = lumpyLog(rnd, 82, 24, 0.07, 24);
      out += P.g(P.at(-18, 0), coat(P, rnd, d, 41, 12, col, { crumbs: false, shine: 0.35 }) + blisters(P, rnd, 18, 34, 7, '#E6B266') + P.path('M30 -9 Q36 0 30 9', 'none', P.shade(col, -0.25), 2.4, { opacity: '0.5', 'stroke-linecap': 'round' }));
      if (sauce) out += P.path('M-52 -2 Q-46 -7 -40 -2 T-28 -2 T-16 -2 T-4 -2 T8 -2 T18 -2', 'none', C.sauceRed, 3.2, { 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }) + P.path('M-50 -3.5 Q-46 -6 -42 -3.5', 'none', '#EC6A5C', 1, { 'stroke-linecap': 'round' });
      return out;
    };
  }
  function moneyBag(P, rnd) {
    var col = '#D9A24E', d = P.blob(rnd, 15, 15, 0.06, 12), out = P.shadow(d) + P.path(d, col, P.shade(col, -0.3), 1);
    out += P.path(P.blob(rnd, 12, 12, 0.08, 10, -1, -1), P.shade(col, 0.12), null, 0, { opacity: '0.7' });
    for (var i = 0; i < 10; i++) { var a = i / 10 * Math.PI * 2 + rnd() * 0.3; out += P.path('M' + N(Math.cos(a) * 13.5) + ' ' + N(Math.sin(a) * 13.5) + ' Q' + N(Math.cos(a + 0.4) * 8) + ' ' + N(Math.sin(a + 0.4) * 8) + ' ' + N(Math.cos(a) * 5) + ' ' + N(Math.sin(a) * 5), 'none', P.shade(col, -0.3), 1, { 'stroke-linecap': 'round', opacity: '0.75' }); }
    out += P.circle(0, 0, 5.4, 'none', '#5E8C3A', 1.6);
    out += P.path(P.blob(rnd, 6, 6, 0.4, 10), P.shade(col, 0.22), P.shade(col, -0.25), 0.8) + P.circle(0, 0, 1.6, P.shade(col, -0.2));
    return out + P.hl(-6, -7, 4, 1.8, '#FFFFFF', 0.35, -30);
  }

  /* ---------- dumplings and buns ---------- */
  function dimSim(o) {
    return function (P, rnd) {
      var r = 18, col = o.col, d = P.blob(rnd, r, r, 0.05, 12), out = P.shadow(d) + P.path(d, col, P.shade(col, -0.25), 1);
      // the folds up the side, gathered round the open top
      for (var i = 0; i < 14; i++) { var a = i / 14 * Math.PI * 2 + rnd() * 0.15; out += P.path('M' + N(Math.cos(a) * r * 0.93) + ' ' + N(Math.sin(a) * r * 0.93) + ' Q' + N(Math.cos(a + 0.2) * r * 0.76) + ' ' + N(Math.sin(a + 0.2) * r * 0.76) + ' ' + N(Math.cos(a + 0.12) * r * 0.6) + ' ' + N(Math.sin(a + 0.12) * r * 0.6), 'none', P.shade(col, -0.22), 0.9, { opacity: '0.8' }); }
      if (o.blister) out += blisters(P, rnd, 14, r * 0.85, r * 0.85, P.shade(col, 0.3));
      out += P.path(P.blob(rnd, r * 0.6, r * 0.6, 0.12, 14), P.shade(col, 0.15), P.shade(col, -0.22), 0.8);
      out += P.path(P.blob(rnd, r * 0.44, r * 0.44, 0.08, 10), o.fill, P.shade(o.fill, -0.25), 0.8);
      out += P.crumbs(rnd, 8, r * 0.32, r * 0.32, [P.shade(o.fill, -0.22), P.shade(o.fill, 0.25), '#EE8A2E'], 0.8);
      return out + P.hl(-r * 0.45, -r * 0.55, r * 0.22, r * 0.1, '#FFFFFF', 0.45, -35);
    };
  }
  // a dumpling standing on its base, seen from above: a plump crescent with the pleated seam along the top
  function jiaozi(P, rnd) {
    var col = '#F3EDDD', d = 'M-17 3 Q-9 -11 0 -10 Q9 -11 17 3 Q9 8 0 7.5 Q-9 8 -17 3 Z', out = P.shadow(d) + P.path(d, col, '#D3C7AA', 1);
    out += P.path(P.blob(rnd, 10, 3.5, 0.1, 8, 0, 2), '#E6D7B5', null, 0, { opacity: '0.6' });
    out += P.path('M-14 1.5 Q0 -7 14 1.5', 'none', '#FFFFFF', 2.2, { 'stroke-linecap': 'round', opacity: '0.8' }) + P.path('M-14 2.5 Q0 -6 14 2.5', 'none', '#D9CDB0', 0.9);
    for (var i = 0; i < 6; i++) { var x = -9 + i * 3.6, y = -2.4 + Math.pow(x / 14, 2) * 4; out += P.path('M' + N(x - 1) + ' ' + N(y - 2.2) + ' Q' + N(x + 1.2) + ' ' + N(y) + ' ' + N(x + 0.4) + ' ' + N(y + 3), 'none', '#CFC2A3', 0.8, { 'stroke-linecap': 'round' }); }
    return out + P.hl(-6, -5, 5, 1.6, '#FFFFFF', 0.5, -10);
  }
  // a gyoza with its seared, crisp bottom turned up
  function gyozaBody(P, rnd) {
    var d = 'M-18 4 Q-10 -9 0 -9 Q10 -9 18 4 Q9 9 0 9 Q-9 9 -18 4 Z', out = P.shadow(d, 1.5, 2) + P.path(d, '#F1E6CA', '#CDBE98', 1);
    out += P.path(P.blob(rnd, 13, 5.5, 0.1, 10, 0, 1.5), '#C98A3A', null, 0, { opacity: '0.95' }) + P.path(P.blob(rnd, 8.5, 3.2, 0.15, 9, 0, 2), '#A8642A', null, 0, { opacity: '0.85' });
    out += P.crumbs(rnd, 6, 10, 4, ['#E0B060', '#8A4A1E'], 0.6);
    for (var i = 0; i < 5; i++) { var x = -11 + i * 5.5; out += P.path('M' + N(x) + ' ' + N(-6.5 + Math.abs(x) * 0.18) + ' q1.5 -1.6 3 0', 'none', '#D9CBA8', 0.8); }
    return out + P.hl(-4, -5, 6, 1.2, '#FFFFFF', 0.4);
  }
  function gyozaRow(P, rnd) {
    var col = '#E2B566', skirt = P.blob(rnd, 50, 26, 0.1, 18), holes = '';
    for (var i = 0; i < 16; i++) { var p = P.inEllipse(rnd, 46, 22); if (Math.abs(p[1]) < 16 && Math.abs(p[0]) < 40) continue; holes += ' ' + P.blob(rnd, 2 + rnd() * 2.5, 1.5 + rnd() * 1.5, 0.3, 6, p[0], p[1]); }
    var out = P.path(skirt, '#000000', null, 0, { opacity: '0.1', transform: 'translate(2 2.5)' }) + P.path(skirt + holes, col, P.shade(col, -0.3), 0.9, { 'fill-rule': 'evenodd', opacity: '0.95' });
    out += P.crumbs(rnd, 30, 46, 23, ['#C98A3A', '#F0CC86'], 0.8);
    for (var k = 0; k < 5; k++) out += P.g(P.at(-32 + k * 16, (rnd() - 0.5) * 2, 90 + (rnd() - 0.5) * 6, 0.92), gyozaBody(P, rnd));
    return out;
  }
  function harGow(P, rnd) {
    var d = 'M-14 6 Q-16 -6 -6 -11 Q0 -13 6 -11 Q16 -6 14 6 Q0 10 -14 6 Z', out = P.shadow(d, 1.5, 2);
    out += P.path(P.blob(rnd, 9, 5.5, 0.1, 9, 0, 1), '#F2A08A', '#E0805A', 0.6) + P.path('M-5 -2 Q-3 2 -5 5 M0 -3 Q2 1 0 5 M5 -2 Q7 1 5 4', 'none', '#E0704A', 0.9, { opacity: '0.8' });
    out += P.path(d, '#F6F2EA', '#CFC6B2', 1, { 'fill-opacity': '0.72' });
    // fine pleats fanned along the crest
    for (var i = 0; i < 9; i++) { var t = i / 8, x = -10 + t * 20, y = -9.2 + Math.pow((x / 11), 2) * 4.5; out += P.path('M' + N(x) + ' ' + N(y) + ' Q' + N(x * 0.9 + 0.5) + ' ' + N(y + 2.5) + ' ' + N(x * 0.75) + ' ' + N(y + 5), 'none', '#DCD3C0', 0.8, { 'stroke-linecap': 'round' }); }
    return out + P.hl(-6, -6, 4.5, 1.8, '#FFFFFF', 0.7, -25) + P.hl(7, 3, 2.5, 1, '#FFFFFF', 0.5, 20);
  }
  function xlb(P, rnd, x, y, r) {
    var d = P.blob(rnd, r, r * 0.97, 0.04, 12, x, y), out = P.shadow(d, 1.4, 1.8) + P.path(d, '#F4EEE0', '#D2C7AE', 1);
    out += P.path('M' + N(x - r * 0.7) + ' ' + N(y + r * 0.5) + ' Q' + N(x + r * 0.4) + ' ' + N(y + r * 1.1) + ' ' + N(x + r * 0.9) + ' ' + N(y - r * 0.2) + ' Q' + N(x + r * 0.5) + ' ' + N(y + r * 0.6) + ' ' + N(x - r * 0.7) + ' ' + N(y + r * 0.5) + ' Z', '#D9CDB2', null, 0, { opacity: '0.35' });
    var a0 = rnd() * 6.3;
    for (var i = 0; i < 12; i++) {
      var a = a0 + i / 12 * Math.PI * 2;
      out += P.path('M' + N(x + Math.cos(a) * r * 0.18) + ' ' + N(y + Math.sin(a) * r * 0.18) + ' Q' + N(x + Math.cos(a + 0.5) * r * 0.5) + ' ' + N(y + Math.sin(a + 0.5) * r * 0.5) + ' ' + N(x + Math.cos(a + 0.95) * r * 0.82) + ' ' + N(y + Math.sin(a + 0.95) * r * 0.82), 'none', i % 2 ? '#D8CDB4' : '#E2D8C2', 0.9, { 'stroke-linecap': 'round' });
    }
    return out + P.circle(x, y, r * 0.17, '#E6DCC6', '#CFC3A8', 0.6) + P.hl(x - r * 0.4, y - r * 0.45, r * 0.25, r * 0.1, '#FFFFFF', 0.55, -35);
  }
  function steamerXlb(P, rnd) {
    var out = P.circle(0, 0, 52, '#000000', null, 0, { opacity: '0.12', transform: 'translate(2.5 3.5)' }) + P.circle(0, 0, 52, '#D9B98A', '#B9946A', 2.2) + P.circle(0, 0, 47, '#E8D2A6', '#C9A97A', 1);
    for (var i = -4; i <= 4; i++) { var x = i * 10, h = Math.sqrt(Math.max(0, 47 * 47 - x * x)); out += P.line(x, -h + 1, x, h - 1, '#D6BC8E', 1.1); }
    out += P.circle(0, 0, 44, '#F6EFDD', '#E3D6B8', 0.8) + P.crumbs(rnd, 26, 40, 40, ['#E3D6B8'], 0.8);
    var spots = [[0, 0]]; for (var k = 0; k < 6; k++) { var a = k / 6 * Math.PI * 2 + 0.3; spots.push([Math.cos(a) * 28, Math.sin(a) * 28]); }
    spots.sort(function (a, b) { return a[1] - b[1]; }).forEach(function (s) { out += xlb(P, rnd, s[0], s[1], 13); });
    return out;
  }
  // a half moon with a ruffled edge (Korean mandu): the bumps first, the body over their inner half
  function mandu(P, rnd) {
    var col = '#F2E6C8', cv = [[-20, 8], [-20, -18], [20, -18], [20, 8]], body = 'M-20 8 C-20 -18 20 -18 20 8 Q0 12 -20 8 Z', out = P.shadow('M-22 8 C-22 -21 22 -21 22 8 Q0 13 -22 8 Z');
    for (var i = 0; i <= 14; i++) { var b = bez(cv, i / 14); out += P.circle(b[0], b[1], 2.8, col, '#CDBE98', 0.8); }
    out += P.path(body, col, null, 0) + P.path('M-20 8 Q0 12 20 8', 'none', '#CDBE98', 1);
    for (var j = 1; j < 14; j++) { var c = bez(cv, j / 14), a = (c[2] + 90) * Math.PI / 180; out += P.line(c[0] + Math.cos(a) * 1.5, c[1] + Math.sin(a) * 1.5, c[0] + Math.cos(a) * 4.5, c[1] + Math.sin(a) * 4.5, '#D9CCAA', 0.8); }
    out += P.path(P.blob(rnd, 8, 4, 0.2, 8, -6, 1), '#D9A24E', null, 0, { opacity: '0.7' }) + P.path(P.blob(rnd, 6, 3, 0.2, 8, 8, 3), '#D9A24E', null, 0, { opacity: '0.6' });
    return out + P.hl(-6, -6, 6, 2, '#FFFFFF', 0.5, -10);
  }
  function wontonsChilli(P, rnd) {
    var oil = P.blob(rnd, 54, 44, 0.06, 16), out = P.path(oil, '#B5301F', '#8E2418', 0.8);
    out += P.path(P.blob(rnd, 46, 36, 0.12, 14, 3, 2), '#D9552F', null, 0, { opacity: '0.45' }) + P.crumbs(rnd, 40, 50, 40, ['#7A1A10', '#E0703A'], 0.9);
    out += P.scatter(rnd, 6, 30, 22, function (x, y, i, q) {
      var d = P.blob(q, 15, 11, 0.25, 10, x, y, q() * 180), s = P.shadow(d, 1, 1.5) + P.path(d, '#F3EAD8', '#D3C6A8', 0.8, { opacity: '0.95' });
      s += P.path('M' + N(x - 9) + ' ' + N(y + 2) + ' Q' + N(x - 4) + ' ' + N(y - 4) + ' ' + N(x + 2) + ' ' + N(y - 2) + ' M' + N(x + 3) + ' ' + N(y + 6) + ' Q' + N(x + 8) + ' ' + N(y + 1) + ' ' + N(x + 10) + ' ' + N(y + 4), 'none', '#E2D6BC', 0.9);
      s += P.path(P.blob(q, 5.5, 4.5, 0.15, 8, x + 1, y), '#E8C7AE', '#C9A48A', 0.6) + P.hl(x - 3, y - 4, 4, 1.4, '#FFFFFF', 0.5, -20);
      s += P.path(P.blob(q, 6, 2.5, 0.3, 7, x + 4, y + 5, q() * 180), '#C2402A', null, 0, { opacity: '0.55' });
      return s;
    }, 18);
    out += P.scatter(rnd, 9, 40, 32, function (x, y, i, q) { return P.circle(x, y, 2.1, '#9CC067', '#4F7F2F', 1); });
    out += P.crumbs(rnd, 18, 40, 32, ['#F4E9C8'], 0.7);
    return out;
  }
  // bao, folded and laid on its side: the filling pokes out of the open side, the soft bun over it
  function bao(fill) {
    return function (P, rnd) {
      var out = P.g(P.at(0, 3), fill(P, rnd)), d = 'M-33 3 C-33 -33 33 -33 33 3 Q0 7 -33 3 Z';
      out += P.shadow(d) + P.path(d, '#FAF6EC', '#DDD2BB', 1.1);
      out += P.path('M-28 0 C-27 -25 27 -25 28 0', 'none', '#EEE6D4', 4, { opacity: '0.85' }) + P.path('M-30 1 Q0 4 30 1', 'none', '#E6DCC6', 1.2);
      return out + P.hl(-8, -15, 14, 4, '#FFFFFF', 0.75, -8);
    };
  }
  function baoPork(P, rnd) {
    var out = P.g(P.at(-2, 7, -4), P.path(roundPoly([[-24, -5], [22, -6], [23, 6], [-23, 6]], 3), '#8A4A22', '#5E2E14', 0.9) + P.path('M-22 1 L21 0', 'none', '#F0D9A8', 2.2) + P.path('M-22 -3 L21 -4', 'none', '#B9662A', 1.4, { opacity: '0.8' }));
    [[-19, 11], [-1, 13], [17, 11]].forEach(function (c, i) { out += P.g(P.at(c[0], c[1], (i - 1) * 15), P.path('M-7 0 A7 7 0 0 0 7 0 Z', '#D6E8A8', '#5E8C3A', 1)); });
    out += P.g(P.at(0, 9), herbs(P, rnd, 5, 22, 3, ['#4F7F2F', '#5E8C3A'], 6));
    out += P.g(P.at(0, 10), P.crumbs(rnd, 10, 20, 3, ['#D9B07A', '#B98A55'], 1.1));
    return out + P.path('M-18 5 Q-8 9 2 5 T20 5', 'none', '#4A2416', 1.4, { 'stroke-linecap': 'round' });
  }
  function baoChicken(P, rnd) {
    var out = P.g(P.at(-1, 7, -3), coat(P, rnd, P.blob(rnd, 25, 7, 0.1, 12), 25, 7, C.golden, { shadow: false, cr: 0.8 }));
    out += P.g(P.at(0, 12), P.scatter(rnd, 16, 22, 3, function (x, y, i, q) { return P.path('M' + N(x - 3) + ' ' + N(y) + ' q3 ' + N(q() * 3 - 1.5) + ' 6 0', 'none', i % 3 ? '#F4F1E4' : '#8E3A66', 1.4, { 'stroke-linecap': 'round' }); }));
    out += herbs(P, rnd, 3, 22, 3, ['#4F7F2F'], 6);
    return out + P.path('M-18 4 L-12 8 L-6 4 L0 8 L6 4 L12 8 L18 4', 'none', '#E8743A', 1.6, { 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  }
  function charSiuBao(P, rnd) {
    var r = 22, d = P.blob(rnd, r, r * 0.97, 0.03, 12), out = P.shadow(d) + P.path(d, '#FBF7EE', '#DDD3BE', 1.1);
    out += P.path('M' + N(-r * 0.75) + ' ' + N(r * 0.5) + ' Q' + N(r * 0.4) + ' ' + N(r * 1.1) + ' ' + N(r * 0.92) + ' ' + N(-r * 0.2) + ' Q' + N(r * 0.5) + ' ' + N(r * 0.65) + ' ' + N(-r * 0.75) + ' ' + N(r * 0.5) + ' Z', '#E9E1CF', null, 0, { opacity: '0.6' });
    // the top splits three ways and shows the red pork
    for (var i = 0; i < 3; i++) {
      var a = -Math.PI / 2 + i * Math.PI * 2 / 3 + 0.2, c = Math.cos(a), s = Math.sin(a), L0 = r * 0.66, w = 6;
      var crack = 'M0 0 Q' + N(c * L0 * 0.5 - s * w) + ' ' + N(s * L0 * 0.5 + c * w) + ' ' + N(c * L0) + ' ' + N(s * L0) + ' Q' + N(c * L0 * 0.5 + s * w) + ' ' + N(s * L0 * 0.5 - c * w) + ' 0 0 Z';
      out += P.path(crack, '#9E3B22', '#E6DCC8', 2) + P.path('M' + N(c * 3) + ' ' + N(s * 3) + ' L' + N(c * L0 * 0.6) + ' ' + N(s * L0 * 0.6), 'none', '#C8603E', 1.4, { 'stroke-linecap': 'round' });
    }
    return out + P.hl(-r * 0.4, -r * 0.5, r * 0.25, r * 0.1, '#FFFFFF', 0.7, -35);
  }

  /* ---------- rolls and wraps ---------- */
  function springRoll(P, rnd) {
    var l = 66, w = 17, col = '#D9A04A', d = lumpyLog(rnd, l, w, 0.04, 22), out = P.shadow(d) + P.path(d, col, P.shade(col, -0.3), 1.1);
    out += P.path(lumpyLog(rnd, l - 10, w - 8, 0.05, 18), P.shade(col, 0.16), null, 0, { opacity: '0.75' });
    // the wrapper's folded ends and the last turn of the wrapper
    out += P.path('M-28 -6 Q-23 0 -27 6 M-22 -8 Q-17 -1 -21 7 M28 -6 Q23 0 27 6 M22 -8 Q17 -1 21 7', 'none', P.shade(col, -0.28), 1, { opacity: '0.7', 'stroke-linecap': 'round' });
    out += P.path('M-16 6.5 Q0 3 16 6.8', 'none', P.shade(col, -0.2), 1, { opacity: '0.6' });
    out += blisters(P, rnd, 18, l * 0.4, w * 0.3, '#F0CC86');
    return out + P.hl(-4, -4.5, 20, 1.8, '#FFFFFF', 0.4);
  }
  function ricePaperRoll(P, rnd) {
    var l = 80, w = 28, d = logD(l, w), out = P.shadow(d, 1.5, 2) + P.path(d, '#F1EDE3', null, 0);
    out += P.path(lumpyLog(rnd, l - 12, 10, 0.2, 18), '#A9C96E', null, 0, { transform: 'translate(0 6)' });
    for (var i = 0; i < 16; i++) { var x = -34 + rnd() * 58, y = -10 + rnd() * 18; out += P.path('M' + N(x) + ' ' + N(y) + ' q5 ' + N(rnd() * 4 - 2) + ' 10 0 t10 0', 'none', '#FFFFFF', 1.1, { opacity: '0.9' }); }
    out += P.scatter(rnd, 6, 30, 3, function (x, y) { return P.line(x - 5, y + 2, x + 5, y + 1, '#EE8A2E', 1.4); });
    [-22, 0, 22].forEach(function (x, i) {
      out += P.g(P.at(x, -4, (i - 1) * 6), P.path('M-9 3 Q-8 -6 0 -6 Q8 -6 9 3 Q5 -1 0 -1 Q-5 -1 -9 3 Z', '#F4A585', '#E07A5A', 0.6) + P.path('M-5 -4.5 Q-4 -2 -6 1 M0 -5.5 Q1 -3 0 -1 M5 -4.5 Q6 -2 6 1', 'none', '#E0704A', 0.8));
    });
    out += herbs(P, rnd, 7, 30, 6, ['#4F7F2F', '#3E6A24'], 7);
    out += P.path(d, '#FFFFFF', '#CFC7B5', 1, { 'fill-opacity': '0.42' });
    out += P.path('M-30 -11 Q-10 -9 8 -12 M-18 10 Q2 12 24 9', 'none', '#FFFFFF', 0.9, { opacity: '0.8' });
    return out + P.hl(-6, -9, 22, 2, '#FFFFFF', 0.6);
  }
  function ricePaperHalves(P, rnd) {
    var out = '';
    [[-15, 0, -12], [15, 2, 16]].forEach(function (h) {
      var s = P.shadow(P.blob(rnd, 14, 13, 0.04, 10), 1.5, 2) + P.ellipse(0, 0, 14, 13, '#EFEAE0', '#CFC7B5', 1);
      s += P.ellipse(0, 0, 11.6, 10.6, '#F7F4EC', null, 0);
      for (var i = 0; i < 9; i++) { var p = P.inEllipse(rnd, 8, 7); s += P.path('M' + N(p[0] - 2) + ' ' + N(p[1]) + ' q1 -1.5 2 0 t2 0', 'none', '#E3DCCC', 0.7); }
      s += P.path(P.blob(rnd, 6, 4, 0.2, 8, -4, 4), '#8DB255', null, 0) + P.leaf(5, 3, '#4F7F2F', -6, 2, 30, { vein: false }) + P.leaf(5, 3, '#3E6A24', -2, 6, -20, { vein: false });
      s += P.path('M-7 -7 Q0 -11 7 -7', 'none', '#F09A78', 3.2, { 'stroke-linecap': 'round' }) + P.path('M-6 -6.4 Q0 -9.8 6 -6.4', 'none', '#F8C8B4', 1, { 'stroke-linecap': 'round' });
      s += P.circle(5, 2, 1.4, '#EE8A2E') + P.circle(7, 5, 1.2, '#EE8A2E') + P.circle(3, 6, 1.1, '#EE8A2E');
      s += P.ellipse(0, 0, 14, 13, 'none', '#FFFFFF', 1.5, { opacity: '0.6' }) + P.hl(-6, -8, 4, 1.4, '#FFFFFF', 0.6, -30);
      out += P.g(P.at(h[0], h[1], h[2]), s);
    });
    return out;
  }
  function dolma(P, rnd) {
    var col = '#6E7A36', d = lumpyLog(rnd, 40, 16, 0.03, 18), out = P.shadow(d) + P.path(d, col, '#4A5222', 1);
    ['M-12 -7 Q-8 0 -12 7', 'M-3 -8 Q1 0 -3 8', 'M6 -8 Q10 0 6 8'].forEach(function (p) { out += P.path(p, 'none', '#55602A', 1.2, { opacity: '0.8' }) + P.path(p, 'none', '#9AA65A', 0.7, { transform: 'translate(1.2 0)', opacity: '0.7' }); });
    out += P.path('M-16 0 Q0 -2 16 1', 'none', '#8E9A50', 0.6, { opacity: '0.7' });
    return out + P.hl(-4, -4, 12, 1.8, '#FFFFFF', 0.45);
  }
  function sanChoyBow(P, rnd) {
    var leaf = P.blob(rnd, 33, 30, 0.08, 20), out = P.shadow(leaf) + P.path(leaf, '#CFE29A', '#8DB255', 1.1);
    for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2; out += P.path('M' + N(Math.cos(a) * 20) + ' ' + N(Math.sin(a) * 18) + ' Q' + N(Math.cos(a + 0.15) * 27) + ' ' + N(Math.sin(a + 0.15) * 25) + ' ' + N(Math.cos(a + 0.1) * 31) + ' ' + N(Math.sin(a + 0.1) * 28), 'none', '#A9C96E', 1, { opacity: '0.8' }); }
    out += P.path(P.blob(rnd, 25, 22, 0.06, 14), '#B7D27A', '#9CC067', 0.8);
    out += P.path(P.blob(rnd, 21, 18, 0.12, 14), '#7E5034', '#5E3A24', 0.8) + P.crumbs(rnd, 40, 19, 16, ['#5E3A24', '#9A6A4A', '#6B4228'], 1.2);
    out += P.scatter(rnd, 7, 16, 13, function (x, y, i, q) { return P.rect(x - 1.6, y - 1.6, 3.2, 3.2, 0.6, i % 2 ? '#EE8A2E' : '#F4F0E4', null, 0, { transform: 'rotate(' + N(q() * 90) + ' ' + N(x) + ' ' + N(y) + ')' }); });
    out += P.scatter(rnd, 6, 16, 12, function (x, y) { return P.circle(x, y, 1.8, '#9CC067', '#4F7F2F', 0.8); });
    out += P.scatter(rnd, 7, 14, 10, function (x, y, i, q) { return P.path('M' + N(x - 4) + ' ' + N(y) + ' q2 -2 4 0 t4 0', 'none', '#F2E3B8', 1.3, { 'stroke-linecap': 'round' }); });
    return out + P.hl(-18, -20, 8, 2.5, '#FFFFFF', 0.4, -40);
  }

  /* ---------- skewers ---------- */
  // one cube of meat or cheese on the stick: rounded, turned a little, with grill lines or char spots
  function cube(P, rnd, x, s, col, o) {
    o = o || {};
    var d = P.slab(rnd, s / 2, s / 2 * (o.ry || 0.92), 0.55, 0.07, 12), r = (rnd() - 0.5) * 24, y = (rnd() - 0.5) * 2;
    var b = P.shadow(d, 1.3, 1.8) + P.path(d, col, P.shade(col, -0.3), 0.9) + P.path(P.slab(rnd, s * 0.34, s * 0.3, 0.5, 0.1, 10), P.shade(col, o.lift || 0.12), null, 0, { opacity: '0.8' });
    if (o.char) b += P.grill(s * 0.42, s * 0.38, 55, o.gap || 7, o.char, 2.2);
    if (o.spots) b += P.crumbs(rnd, o.spots, s * 0.38, s * 0.34, [o.spotCol || P.shade(col, -0.4)], 1.1);
    b += P.hl(-s * 0.14, -s * 0.2, s * 0.2, s * 0.07, '#FFFFFF', 0.28);
    return P.g(P.at(x, y, r), b);
  }
  // a piece seen edge on (capsicum, onion, zucchini threaded through the middle)
  function edge(P, rnd, x, w, h, col, o) {
    o = o || {};
    var d = 'M' + N(-w / 2) + ' ' + N(-h / 2 + 2) + ' Q0 ' + N(-h / 2 - 2) + ' ' + N(w / 2) + ' ' + N(-h / 2 + 2) + ' L' + N(w / 2) + ' ' + N(h / 2 - 2) + ' Q0 ' + N(h / 2 + 2) + ' ' + N(-w / 2) + ' ' + N(h / 2 - 2) + ' Z';
    var b = P.shadow(d, 1, 1.5) + P.path(d, col, P.shade(col, -0.3), 0.8);
    if (o.inner) b += P.path('M0 ' + N(-h / 2 + 2) + ' L0 ' + N(h / 2 - 2), 'none', o.inner, w * 0.35, { 'stroke-linecap': 'round' });
    if (o.layers) b += P.path('M' + N(-w * 0.18) + ' ' + N(-h / 2 + 2) + ' V' + N(h / 2 - 2) + ' M' + N(w * 0.18) + ' ' + N(-h / 2 + 2) + ' V' + N(h / 2 - 2), 'none', o.layers, 0.9);
    if (o.char) b += P.line(-w / 2 + 1, -2, w / 2 - 1, -4, o.char, 1.6, { opacity: '0.7' });
    b += P.line(-w * 0.2, -h / 2 + 3, -w * 0.2, h / 2 - 5, '#FFFFFF', 1, { opacity: '0.35' });
    return P.g(P.at(x, (rnd() - 0.5) * 2, (rnd() - 0.5) * 14), b);
  }
  var PART = {
    chicken: { w: 20, draw: function (P, rnd, x) { return cube(P, rnd, x, 21, '#E2AE62', { char: '#8A5A22' }); } },
    beef: { w: 20, draw: function (P, rnd, x) { return cube(P, rnd, x, 20, '#7A4A26', { char: '#3F2812', lift: 0.1 }); } },
    haloumi: { w: 22, draw: function (P, rnd, x) { return cube(P, rnd, x, 22, '#F4ECD2', { char: '#C98A3A', ry: 0.8, gap: 6 }); } },
    paneer: { w: 19, draw: function (P, rnd, x) { return cube(P, rnd, x, 19, '#E07A34', { spots: 5, spotCol: '#6E2410', lift: 0.18 }); } },
    capR: { w: 8, draw: function (P, rnd, x) { return edge(P, rnd, x, 7, 22, '#C8382B', { char: '#5E1A10' }); } },
    capG: { w: 8, draw: function (P, rnd, x) { return edge(P, rnd, x, 7, 22, '#5E8C3A', { char: '#2E4A1A' }); } },
    capY: { w: 8, draw: function (P, rnd, x) { return edge(P, rnd, x, 7, 22, '#F2C14E', { char: '#8A5A1A' }); } },
    onion: { w: 8, draw: function (P, rnd, x) { return edge(P, rnd, x, 7, 20, '#F1E4EC', { layers: '#9B4A86' }); } },
    zucchini: { w: 8, draw: function (P, rnd, x) { return edge(P, rnd, x, 7, 22, '#5E8C3A', { inner: '#D6E8A8', char: '#2E4A1A' }); } },
    tomato: { w: 17, draw: function (P, rnd, x) { return P.circle(x + 1, 1.5, 8.5, '#000000', null, 0, { opacity: '0.12' }) + P.circle(x, 0, 8.5, '#D9473B', '#A8302A', 0.8) + P.circle(x + 2, 2, 3, '#B5301F', null, 0, { opacity: '0.5' }) + P.hl(x - 3, -3.5, 2.6, 1.4, '#FFFFFF', 0.6, -30); } },
    mushroom: { w: 16, draw: function (P, rnd, x) { return P.circle(x + 1, 1.5, 8, '#000000', null, 0, { opacity: '0.12' }) + P.circle(x, 0, 8, '#B98E5E', '#7A5A3A', 0.8) + P.path('M' + N(x - 6) + ' 3 Q' + N(x) + ' 8 ' + N(x + 6) + ' 3', 'none', '#7A5A3A', 1.4, { opacity: '0.7' }) + P.hl(x - 2, -3, 3, 1.4, '#FFFFFF', 0.4); } }
  };
  // a skewer: the stick, then the pieces threaded on it, the handle end on the left
  function skewer(o) {
    return function (P, rnd) {
      var len = o.len || 130, a = len / 2, gap = o.gap === undefined ? 1 : o.gap, out = '';
      var stick = 'M' + N(-a) + ' -1.9 L' + N(a - 8) + ' -1.6 L' + N(a) + ' 0 L' + N(a - 8) + ' 1.6 L' + N(-a) + ' 1.9 Z';
      out += P.shadow(stick, 1, 1.5) + P.path(stick, '#E6CC9C', '#B9946A', 0.7);
      if (o.draw) return out + o.draw(P, rnd);
      var total = -gap; o.parts.forEach(function (p) { total += PART[p].w + gap; });
      var x = -a + (o.lead || 26) + (len - (o.lead || 26) - (o.tail || 12) - total) / 2;
      o.parts.forEach(function (p) { var pw = PART[p].w; out += PART[p].draw(P, rnd, x + pw / 2); x += pw + gap; });
      if (o.sprinkle) out += o.sprinkle(P, rnd);
      return out;
    };
  }
  function kofta(P, rnd) {
    var col = '#8A5232', d = lumpyLog(rnd, 92, 20, 0.06, 24), b = coat(P, rnd, d, 46, 10, col, { crumbs: false, shine: 0.25 });
    for (var x = -36; x <= 36; x += 12) b += P.path('M' + N(x) + ' -8.5 Q' + N(x + 2.5) + ' 0 ' + N(x) + ' 8.5', 'none', P.shade(col, -0.3), 1.6, { opacity: '0.6', 'stroke-linecap': 'round' });
    b += P.crumbs(rnd, 18, 40, 7, ['#3F2812', '#4F7F2F', '#6E9A3E'], 0.8);
    return P.g(P.at(6, 0), b);
  }
  function satay(P, rnd) {
    var col = '#D49A3A', top = [], bot = [], out = '';
    for (var i = 0; i <= 12; i++) { var x = -32 + i * 6.5, s = Math.sin(i * 1.3) * 2.5; top.push([x, -7 + s]); bot.unshift([x, 7 + s]); }
    var d = L.P.smooth(top.concat(bot));
    out += P.shadow(d) + P.path(d, col, P.shade(col, -0.32), 1) + P.path(L.P.smooth(top.map(function (p) { return [p[0], p[1] + 4]; }).concat(bot.map(function (p) { return [p[0], p[1] - 4]; }))), P.shade(col, 0.12), null, 0, { opacity: '0.8' });
    for (var k = 0; k < 5; k++) { var fx = -24 + k * 13; out += P.path('M' + N(fx) + ' -7 Q' + N(fx + 3) + ' 0 ' + N(fx) + ' 7', 'none', P.shade(col, -0.35), 1.4, { opacity: '0.7' }); }
    out += P.crumbs(rnd, 14, 34, 5, ['#8A4A1A', '#6E3A12'], 1);
    return out + P.hl(-6, -4, 18, 1.4, '#FFFFFF', 0.35);
  }

  /* ---------- patties and fritters ---------- */
  function patty(o) {
    return function (P, rnd) {
      var r = o.r, d = P.blob(rnd, r, r * 0.97, o.wob || 0.035, 16), out = P.shadow(d) + P.path(d, o.col, P.shade(o.col, -0.3), 1.2);
      out += P.path(P.blob(rnd, r * 0.86, r * 0.83, 0.05, 14), o.top, null, 0);
      out += P.crumbs(rnd, Math.round(r * r / 28), r * 0.8, r * 0.78, o.specks, 0.8);
      if (o.marks) out += P.grill(r * 0.8, r * 0.78, 40, 13, o.marks, 3);
      if (o.bits) out += o.bits(P, rnd, r);
      return out + P.hl(-r * 0.3, -r * 0.4, r * 0.3, r * 0.12, '#FFFFFF', 0.2, -15);
    };
  }
  function fritter(o) {
    return function (P, rnd) {
      var r = o.r, d = P.blob(rnd, r, r * 0.92, o.wob || 0.1, 14), out = P.shadow(d) + P.path(d, o.edge, P.shade(o.edge, -0.28), 1.1);
      out += P.path(P.blob(rnd, r * 0.84, r * 0.76, 0.12, 12), o.col, null, 0);
      out += P.crumbs(rnd, Math.round(r * r / 45), r * 0.78, r * 0.7, [P.shade(o.col, -0.28)], 1.6);
      out += o.bits(P, rnd, r);
      return out + P.hl(-r * 0.3, -r * 0.38, r * 0.3, r * 0.1, '#FFFFFF', 0.25, -15);
    };
  }
  function pineFritter(P, rnd) {
    var col = '#DDA24A', ring = P.blob(rnd, 30, 29, 0.08, 16) + ' ' + P.blob(rnd, 8.5, 8.5, 0.1, 9), out = '';
    out += P.path(ring, '#000000', null, 0, { opacity: '0.12', transform: 'translate(2 2.5)', 'fill-rule': 'evenodd' });
    out += P.path(ring, col, P.shade(col, -0.3), 1.1, { 'fill-rule': 'evenodd' });
    out += P.path(P.blob(rnd, 22, 21, 0.06, 14) + ' ' + P.blob(rnd, 13, 13, 0.08, 10), '#F2CB55', null, 0, { 'fill-rule': 'evenodd', opacity: '0.55' });
    out += P.scatter(rnd, 30, 27, 26, function (x, y, i, q) { var rr = Math.hypot(x, y); if (rr < 12 || rr > 26) return ''; return P.circle(x, y, 0.9 + q() * 1.6, i % 3 ? '#F0CC86' : '#B9802F', null, 0, { opacity: '0.8' }); });
    return out + P.hl(-12, -18, 10, 3, '#FFFFFF', 0.3, -30);
  }
  function bhaji(P, rnd) {
    var col = '#C98A3A', d = P.blob(rnd, 20, 19, 0.17, 16), out = P.shadow(d) + P.path(d, col, P.shade(col, -0.32), 1.1);
    out += P.path(P.blob(rnd, 15, 14, 0.15, 12), P.shade(col, 0.1), null, 0, { opacity: '0.8' });
    for (var i = 0; i < 14; i++) {
      var p = P.inEllipse(rnd, 14, 13), a = rnd() * 6.3, rr = 4 + rnd() * 4, a2 = a + 1.6 + rnd();
      var arc = 'M' + N(p[0] + Math.cos(a) * rr) + ' ' + N(p[1] + Math.sin(a) * rr) + ' A' + N(rr) + ' ' + N(rr) + ' 0 0 1 ' + N(p[0] + Math.cos(a2) * rr) + ' ' + N(p[1] + Math.sin(a2) * rr);
      out += P.path(arc, 'none', i % 3 ? '#E6BE72' : '#8A5422', i % 3 ? 1.5 : 1.1, { 'stroke-linecap': 'round' });
    }
    out += P.crumbs(rnd, 8, 15, 14, ['#6B3A12'], 0.9);
    return out + P.hl(-6, -8, 6, 2, '#FFFFFF', 0.3, -20);
  }
  function okonomiyaki(P, rnd) {
    var r = 54, d = P.blob(rnd, r, r * 0.96, 0.03, 16), out = P.shadow(d) + P.path(d, '#C98A3A', '#9E6A2A', 1.2);
    out += P.path(P.blob(rnd, r * 0.92, r * 0.88, 0.04, 16), '#D9A24E', null, 0);
    out += P.path(P.blob(rnd, r * 0.84, r * 0.8, 0.07, 16), '#5E2A12', '#4A2010', 0.8) + P.hl(-r * 0.3, -r * 0.38, r * 0.3, r * 0.07, '#FFFFFF', 0.18, -20);
    // the mayonnaise zigzag
    var pts = [];
    for (var x = -38; x <= 38; x += 7.6) { var lim = Math.sqrt(Math.max(0, 42 * 42 - x * x)) * 0.9, k = Math.round((x + 38) / 7.6); pts.push(N(x) + ' ' + N(k % 2 ? lim : -lim)); }
    out += P.path('M' + pts.join(' L'), 'none', '#FBF6E4', 2.2, { 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    // bonito flakes, seaweed and pickled ginger
    out += P.scatter(rnd, 16, r * 0.62, r * 0.58, function (x, y, i, q) { return P.path(P.blob(q, 4 + q() * 2.5, 2 + q() * 1.4, 0.35, 7, x, y, q() * 180), i % 2 ? '#EBC6AA' : '#D69A7A', '#B9785A', 0.4); });
    out += P.crumbs(rnd, 34, r * 0.72, r * 0.7, ['#3E6A24', '#5E8C3A'], 0.6);
    out += P.scatter(rnd, 4, 8, 8, function (x, y, i, q) { return P.path('M' + N(x - 3) + ' ' + N(y) + ' q3 -2 6 0', 'none', '#E0506A', 1.6, { 'stroke-linecap': 'round' }); });
    return out;
  }
  function pajeon(P, rnd) {
    var R = 58, cell = 38, h = cell / 2 - 1.6, out = '';
    for (var j = -1; j <= 1; j++) for (var i = -1; i <= 1; i++) {
      var cx = i * cell, cy = j * cell, corners = [[cx - h, cy - h], [cx + h, cy - h], [cx + h, cy + h], [cx - h, cy + h]], pts = [], sx = 0, sy = 0;
      for (var s = 0; s < 4; s++) for (var t = 0; t < 8; t++) {
        var a = corners[s], b = corners[(s + 1) % 4], px = a[0] + (b[0] - a[0]) * t / 8, py = a[1] + (b[1] - a[1]) * t / 8, m = Math.hypot(px, py);
        if (m > R) { px *= R / m; py *= R / m; }
        pts.push(N(px) + ' ' + N(py)); sx += px; sy += py;
      }
      sx /= 32; sy /= 32;
      var d = 'M' + pts.join(' L') + ' Z', piece = P.shadow(d, 1.5, 2) + P.path(d, '#E2B45A', '#B9802F', 1, { 'stroke-linejoin': 'round' });
      var span = (i && j) ? 7 : 12;
      piece += P.crumbs(rnd, 5, span, span, ['#C98A3A', '#B9772E'], 1.6);
      for (var g = 0; g < 2; g++) { var gx = sx + (rnd() - 0.5) * span, gy = sy + (rnd() - 0.5) * span; piece += P.g(P.at(gx, gy, 25 + (rnd() - 0.5) * 20), P.rect(-span * 0.9, -1.8, span * 1.8, 3.6, 1.8, g ? '#9CC067' : '#5E8C3A', '#4F7F2F', 0.5)); }
      piece += P.circle(sx + (rnd() - 0.5) * span, sy + (rnd() - 0.5) * span, 1.6, 'none', '#C0392B', 1);
      out += P.g(P.at(i * 2.5, j * 2.5), piece);
    }
    return out + P.hl(-20, -24, 12, 3, '#FFFFFF', 0.25, -30);
  }

  /* ---------- dips (in a small dish from above) ---------- */
  function swirl(P, r, col, a0) {
    var d = spiralD(r * 0.14, r * 0.82, 1.5, a0 || 0);
    return P.path(d, 'none', P.shade(col, -0.16), 3, { 'stroke-linecap': 'round' }) + P.path(d, 'none', P.shade(col, 0.3), 1.1, { 'stroke-linecap': 'round', transform: 'translate(-1 -1)' });
  }
  function oil(P, rnd, x, y, rx, ry, col) { return P.path(P.blob(rnd, rx, ry, 0.2, 9, x, y), col || '#C9A93A', null, 0, { opacity: '0.55' }) + P.hl(x - rx * 0.3, y - ry * 0.3, rx * 0.3, ry * 0.15, '#FFFFFF', 0.5); }
  function dip(o) {
    return function (P, rnd) {
      var R = o.R || 38, ware = o.ware || '#FFFFFF', wedge = ware === '#FFFFFF' ? '#D3CEC4' : P.shade(ware, -0.3), out = '';
      out += P.circle(0, 0, R, '#000000', null, 0, { opacity: '0.12', transform: 'translate(2 3)' }) + P.circle(0, 0, R, ware, wedge, 1.4);
      if (o.stone) out += P.crumbs(rnd, 50, R * 0.96, R * 0.96, [P.shade(ware, 0.25), P.shade(ware, -0.25)], 0.7);
      out += P.circle(0, 0, R * 0.86, P.shade(ware, ware === '#FFFFFF' ? -0.04 : 0.08), P.shade(ware, -0.12), 0.8);
      var r = R * 0.8;
      out += P.path(P.blob(rnd, r, r, 0.03, 14), o.col, P.shade(o.col, -0.14), 0.8);
      return out + o.top(P, rnd, r, o.col);
    };
  }
  var DIPS = {
    hummus: function (P, rnd, r, col) {
      return swirl(P, r, col, 0.4) + oil(P, rnd, 1, 1, 9, 7) + P.crumbs(rnd, 22, r * 0.55, r * 0.55, ['#C2502E', '#A83A22'], 0.6) +
        [[-3, -2], [3, 2], [-1, 4]].map(function (c) { return P.circle(c[0], c[1], 2.8, '#E8CB8A', '#C9A660', 0.6) + P.circle(c[0] - 0.8, c[1] - 0.8, 0.8, '#FFFFFF', null, 0, { opacity: '0.6' }); }).join('') +
        P.crumbs(rnd, 8, r * 0.5, r * 0.5, ['#4F7F2F'], 0.8);
    },
    baba: function (P, rnd, r, col) {
      return swirl(P, r, col, 1.2) + P.crumbs(rnd, 30, r * 0.85, r * 0.85, ['#5A4636', '#7A6450'], 0.7) + P.path('M-14 -6 Q-4 -12 6 -6 T20 -4 M-16 8 Q-6 4 4 9', 'none', '#C9A93A', 1.6, { opacity: '0.6', 'stroke-linecap': 'round' }) +
        P.scatter(rnd, 10, r * 0.6, r * 0.6, function (x, y, i, q) { return P.ellipse(x, y, 1.9, 1.5, '#B5203A', '#8A1428', 0.4, { transform: 'rotate(' + N(q() * 180) + ' ' + N(x) + ' ' + N(y) + ')' }) + P.circle(x - 0.5, y - 0.5, 0.5, '#FFFFFF', null, 0, { opacity: '0.7' }); }) + herbs(P, rnd, 4, r * 0.4, r * 0.4, ['#4F7F2F'], 5);
    },
    muhammara: function (P, rnd, r, col) {
      return P.crumbs(rnd, 40, r * 0.9, r * 0.9, [P.shade(col, 0.2), P.shade(col, -0.25)], 0.9) + oil(P, rnd, -3, -2, 10, 7, '#D9A23A') +
        P.scatter(rnd, 6, r * 0.6, r * 0.6, function (x, y, i, q) { return P.path(P.blob(q, 3.4, 2.6, 0.3, 7, x, y), '#C9A06A', '#8A6A3A', 0.6) + P.line(x - 1.5, y, x + 1.5, y - 0.5, '#8A6A3A', 0.6); }) +
        P.path('M-10 10 Q0 6 12 10', 'none', '#5E1A1A', 1.4, { 'stroke-linecap': 'round', opacity: '0.8' }) + P.crumbs(rnd, 10, r * 0.5, r * 0.5, ['#4F7F2F'], 0.8);
    },
    tzatziki: function (P, rnd, r, col) {
      var out = swirl(P, r, col, 2) + P.scatter(rnd, 26, r * 0.85, r * 0.85, function (x, y, i, q) { return P.line(x, y, x + 2 + q() * 2, y + (q() - 0.5) * 2, i % 2 ? '#7EA453' : '#B9D27A', 1.2); });
      [[-8, -4, 20], [7, 5, -40]].forEach(function (f) { var s = P.line(-8, 0, 8, 0, '#4F7F2F', 0.8); for (var k = -6; k <= 6; k += 2.4) s += P.line(k, 0, k + 2, -2.6, '#4F7F2F', 0.6) + P.line(k, 0, k + 2, 2.6, '#4F7F2F', 0.6); out += P.g(P.at(f[0], f[1], f[2]), s); });
      return out + oil(P, rnd, 2, -1, 6, 4);
    },
    beetroot: function (P, rnd, r, col) {
      return swirl(P, r, col, 0.8) + P.scatter(rnd, 6, r * 0.55, r * 0.55, function (x, y, i, q) { return P.path(P.blob(q, 2.6, 2.2, 0.3, 7, x, y), '#FBF8EE', '#E6E0D2', 0.5); }) +
        P.crumbs(rnd, 24, r * 0.6, r * 0.6, ['#C9A06A', '#8A6A3A', '#E3C99A'], 0.7) + P.leaf(9, 5, '#4F7F2F', 4, -6, 30) + P.leaf(8, 4.5, '#5E8C3A', 9, -2, 80);
    },
    tarama: function (P, rnd, r, col) {
      return swirl(P, r, col, 1.6) + oil(P, rnd, -2, 2, 8, 6) + P.ellipse(3, -3, 4.6, 3.4, '#4A2A3A', '#2E1824', 0.6, { transform: 'rotate(-20 3 -3)' }) + P.hl(2, -4.5, 1.6, 0.8, '#FFFFFF', 0.6) +
        P.crumbs(rnd, 10, r * 0.5, r * 0.5, ['#C2502E'], 0.6) + P.leaf(9, 3, '#4F7F2F', -6, -8, -30, { vein: false });
    },
    labneh: function (P, rnd, r, col) {
      return P.path(P.blob(rnd, r * 0.5, r * 0.44, 0.15, 10, 1, 1), '#B9A23A', '#9A8A2E', 0.5, { opacity: '0.7' }) + P.crumbs(rnd, 34, r * 0.42, r * 0.36, ['#6E7A3A', '#8A7A3A', '#4F5A2A'], 0.7) +
        P.crumbs(rnd, 12, r * 0.85, r * 0.85, ['#8E2A2A'], 0.6) + P.hl(-4, -4, 5, 2, '#FFFFFF', 0.5) + P.leaf(9, 5, '#4F7F2F', r * 0.55, -r * 0.4, 50) + P.leaf(8, 4.5, '#5E8C3A', r * 0.62, -r * 0.22, 100);
    },
    queso: function (P, rnd, r, col) {
      return swirl(P, r, col, 0.2) + P.crumbs(rnd, 14, r * 0.7, r * 0.7, ['#A8402A', '#7A2A1A'], 1.6) + jalapeno(P, -8, 6, 3.6) + jalapeno(P, 9, -4, 3.4) + jalapeno(P, 2, 10, 3.2) + herbs(P, rnd, 4, r * 0.5, r * 0.5, ['#4F7F2F'], 6);
    },
    pico: function (P, rnd, r) {
      return P.scatter(rnd, 38, r * 0.86, r * 0.86, function (x, y, i, q) { var c = i % 5 === 0 ? '#F4F0E4' : i % 7 === 0 ? '#5E8C3A' : i % 2 ? '#D9473B' : '#C0392B'; return P.rect(x - 2.4, y - 2.4, 4.8, 4.8, 1, c, P.shade(c, -0.2), 0.4, { transform: 'rotate(' + N(q() * 90) + ' ' + N(x) + ' ' + N(y) + ')' }); }) + herbs(P, rnd, 6, r * 0.7, r * 0.7, ['#4F7F2F', '#5E8C3A'], 6);
    },
    guac: function (P, rnd, r, col) {
      return P.scatter(rnd, 14, r * 0.8, r * 0.8, function (x, y, i, q) { return P.path(P.blob(q, 4 + q() * 3, 3 + q() * 2, 0.3, 7, x, y), i % 2 ? '#B9D27A' : '#6E9A3E', null, 0, { opacity: '0.85' }); }) +
        P.scatter(rnd, 10, r * 0.6, r * 0.6, function (x, y, i, q) { var c = i % 3 ? '#D9473B' : '#F4F0E4'; return P.rect(x - 2, y - 2, 4, 4, 0.8, c, null, 0, { transform: 'rotate(' + N(q() * 90) + ' ' + N(x) + ' ' + N(y) + ')' }); }) + herbs(P, rnd, 4, r * 0.5, r * 0.5, ['#4F7F2F'], 6);
    }
  };

  /* ---------- Mexican ---------- */
  function nachos(P, rnd) {
    // a flat layer of chips spread to the edge, then a heap in the middle
    var out = P.scatter(rnd, 26, 58, 48, function (x, y, i, q) { return cornChip(P, q, x, y, 28); }) + P.pile(rnd, 16, 38, 30, function (x, y, i, q) { return cornChip(P, q, x, y, 28); });
    out += P.scatter(rnd, 11, 48, 38, function (x, y, i, q) { var d = P.blob(q, 10 + q() * 7, 7 + q() * 5, 0.3, 10, x, y); return P.path(d, '#F2B33D', '#D9922A', 0.6, { opacity: '0.93' }) + P.g(P.at(x, y), P.crumbs(q, 3, 6, 4, ['#C9802A'], 1.1)); });
    out += P.crumbs(rnd, 28, 34, 26, ['#D9473B', '#C0392B', '#F4F0E4', '#5E8C3A'], 2);
    out += dollop(P, rnd, 14, -6, 14, '#8DB255') + P.g(P.at(14, -6), P.crumbs(rnd, 6, 8, 7, ['#B9D27A', '#6E9A3E'], 1.4));
    out += dollop(P, rnd, -14, 8, 11, '#FAF7EE');
    out += [[-30, -14], [32, 12], [-4, 22], [26, -26], [-34, 18]].map(function (c) { return jalapeno(P, c[0], c[1], 4); }).join('');
    return out + herbs(P, rnd, 5, 40, 30, ['#4F7F2F', '#5E8C3A'], 7);
  }
  function fajitas(meat) {
    return function (P, rnd) {
      var caps = ['#C8382B', '#5E8C3A', '#F2C14E'], out = P.scatter(rnd, 40, 46, 28, function (x, y, i, q) {
        var r = (q() < 0.5 ? 0 : 180) + (q() - 0.5) * 70, k = i % 7;
        if (k < 3) { var d = lumpyLog(q, 28 + q() * 6, 7, 0.08, 12), c = P.shade(meat, (q() - 0.5) * 0.15); return P.g(P.at(x, y, r), P.shadow(d, 1, 1.4) + P.path(d, c, P.shade(c, -0.32), 0.8) + P.line(-6, -3, -4, 3, '#3F2812', 1.4, { opacity: '0.7' }) + P.line(4, -3, 6, 3, '#3F2812', 1.4, { opacity: '0.7' }) + P.hl(-4, -1.6, 6, 0.9, '#FFFFFF', 0.3)); }
        if (k < 6) { var cc = caps[(i + k) % 3], dd = 'M-14 -1 Q0 -6 14 -1 L14 3 Q0 -1.5 -14 3 Z'; return P.g(P.at(x, y, r), P.shadow(dd, 1, 1.4) + P.path(dd, cc, P.shade(cc, -0.3), 0.8) + P.path('M-10 -1.4 Q0 -4.8 10 -1.4', 'none', '#FFFFFF', 0.9, { opacity: '0.45' })); }
        return P.g(P.at(x, y, r), P.path('M-12 2 Q0 -6 12 2', 'none', '#9B4A86', 3.6, { 'stroke-linecap': 'round' }) + P.path('M-12 2 Q0 -6 12 2', 'none', '#F1E4EC', 2, { 'stroke-linecap': 'round' }));
      });
      return out + P.crumbs(rnd, 10, 40, 24, ['#2E1A0C'], 1) + herbs(P, rnd, 4, 34, 20, ['#4F7F2F'], 7);
    };
  }
  function tostada(P, rnd) {
    var pts = [], out = '';
    for (var i = 0; i < 28; i++) { var a = i / 28 * Math.PI * 2, r = (i % 2 ? 44 : 51) + (rnd() - 0.5) * 3; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    var shell = L.P.smooth(pts);
    out += P.shadow(shell) + P.path(shell, '#E5B552', '#B9802F', 1.2) + blisters(P, rnd, 36, 48, 48, '#F2D08A');
    out += P.path(P.blob(rnd, 40, 39, 0.05, 14), '#C98A3A', '#A8702A', 0.8, { opacity: '0.9' });
    out += P.path(P.blob(rnd, 36, 35, 0.1, 16), '#B7D27A', '#8DB255', 0.8);
    out += P.scatter(rnd, 30, 32, 31, function (x, y, i, q) { return P.path('M' + N(x - 4) + ' ' + N(y) + ' q4 ' + N(q() * 4 - 2) + ' 8 0', 'none', i % 2 ? '#E2EDB8' : '#8DB255', 1.6, { 'stroke-linecap': 'round' }); });
    out += P.path(P.blob(rnd, 18, 15, 0.2, 12, -4, 2), '#7A4A2A', '#5E3420', 0.8) + P.g(P.at(-4, 2), P.crumbs(rnd, 14, 14, 11, ['#5E3420', '#9A6A4A'], 1.2));
    out += P.scatter(rnd, 22, 26, 24, function (x, y, i, q) { return P.line(x - 3, y, x + 3, y + (q() - 0.5) * 3, '#F2B53A', 1.4); });
    out += P.crumbs(rnd, 14, 22, 20, ['#D9473B', '#F4F0E4'], 1.8);
    out += dollop(P, rnd, 12, -8, 8, '#FAF7EE') + dollop(P, rnd, -14, -10, 8, '#8DB255');
    return out + herbs(P, rnd, 3, 20, 18, ['#4F7F2F'], 6);
  }
  function taquito(P, rnd) {
    var col = '#D39A42', d = logD(78, 14), out = P.shadow(d) + P.path(d, col, P.shade(col, -0.3), 1.1);
    out += P.path(logD(68, 6), P.shade(col, 0.16), null, 0, { opacity: '0.7', transform: 'translate(0 -1)' }) + blisters(P, rnd, 16, 32, 4, '#F0CC86');
    out += P.path('M-26 6.5 L28 4.5', 'none', P.shade(col, -0.25), 1, { opacity: '0.7' });
    out += P.circle(33, 0, 5, '#7A4A2A', P.shade(col, -0.3), 0.8) + P.path('M33 0 m-3 0 a3 3 0 1 1 3 3 a2 2 0 1 1 -1.6 -2', 'none', col, 1.2);
    return out + P.hl(-6, -4, 18, 1.4, '#FFFFFF', 0.35);
  }
  function popper(P, rnd) {
    var col = '#D49B55', d = 'M-17 -9 Q-22 0 -17 9 Q0 11 14 6 Q22 2 22 0 Q22 -2 14 -6 Q0 -11 -17 -9 Z', out = P.path('M-28 -1.6 Q-23 -3 -18 -1.6 L-18 1.6 Q-23 3 -28 1.8 Z', '#5E8C3A', '#3F6A26', 0.8);
    out += coat(P, rnd, d, 20, 9, col, { count: 22, cr: 0.75 });
    return out + P.path('M-19 -5 Q-21 0 -19 5', 'none', '#5E8C3A', 1.4, { opacity: '0.7' });
  }

  /* ---------- other ---------- */
  function camembert(P, rnd) {
    var out = P.circle(0, 0, 42, '#000000', null, 0, { opacity: '0.12', transform: 'translate(2.5 3.5)' }) + P.circle(0, 0, 42, '#E2C79A', '#B9946A', 1.6) + P.circle(0, 0, 38.5, '#D6B886', '#B9946A', 0.8);
    for (var i = 0; i < 5; i++) out += P.circle(0, 0, 39.5 + i * 0.5, 'none', '#C9A97A', 0.3);
    var d = P.blob(rnd, 36, 36, 0.02, 14);
    out += P.path(d, '#F4EEDC', '#DCD0B4', 1) + P.path(P.blob(rnd, 22, 18, 0.25, 10, -6, -4), '#EAD9A8', null, 0, { opacity: '0.6' }) + P.path(P.blob(rnd, 14, 12, 0.25, 9, 12, 10), '#E6CF96', null, 0, { opacity: '0.5' });
    // scored across, the molten middle showing in the cuts
    [[-45, 0], [-45, 13], [-45, -13], [45, 0], [45, 13], [45, -13]].forEach(function (s) {
      var a = s[0] * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a), px = -sn * s[1], py = c * s[1], half = Math.sqrt(Math.max(0, 31 * 31 - s[1] * s[1]));
      out += P.line(px - c * half, py - sn * half, px + c * half, py + sn * half, '#F6DE96', 2.6) + P.line(px - c * half, py - sn * half, px + c * half, py + sn * half, '#E8C26A', 0.8, { opacity: '0.7' });
    });
    out += P.scatter(rnd, 5, 22, 22, function (x, y, i, q) { return P.ellipse(x, y, 2.8, 1.5, '#FBF6E8', '#D9CDB4', 0.5, { transform: 'rotate(' + N(q() * 180) + ' ' + N(x) + ' ' + N(y) + ')' }); });
    [[-10, -14, 30], [12, 8, -50]].forEach(function (s) { var r = P.line(-9, 0, 9, 0, '#5E6A3A', 0.8); for (var k = -7; k <= 7; k += 2) r += P.line(k, 0, k - 1.5, -3, '#4F6A2A', 0.9) + P.line(k + 1, 0, k - 0.5, 3, '#4F6A2A', 0.9); out += P.g(P.at(s[0], s[1], s[2]), r); });
    out += P.path('M-20 6 Q-6 -2 8 4 T26 0', 'none', '#E2A93A', 1.8, { opacity: '0.65', 'stroke-linecap': 'round' });
    return out + P.hl(-14, -20, 10, 3, '#FFFFFF', 0.45, -30);
  }
  function shepherds(P, rnd) {
    var pts = [[-35, -33], [35, -33], [35, 33], [-35, 33]], d = roundPoly(pts, 6), out = P.shadow(d) + P.path(d, '#7A3F22', '#4F2814', 1.2);
    out += P.crumbs(rnd, 14, 34, 32, ['#EE8A2E', '#7EA453', '#9E5A3A'], 1.3);
    out += P.path(roundPoly([[-31, -29], [31, -30], [31, 29], [-30, 30]], 5), '#EFDDB0', '#D9C28A', 0.8);
    for (var y = -24; y <= 24; y += 6) {
      var p = 'M-28 ' + N(y) + ' Q-21 ' + N(y - 3) + ' -14 ' + N(y) + ' T0 ' + N(y) + ' T14 ' + N(y) + ' T28 ' + N(y);
      out += P.path(p, 'none', '#C98A3A', 2.2, { 'stroke-linecap': 'round', opacity: '0.85' }) + P.path(p, 'none', '#F8EDCF', 1, { transform: 'translate(0 2)', opacity: '0.9' });
    }
    out += P.crumbs(rnd, 14, 26, 24, ['#A8642A', '#8A4A1E'], 1.6);
    return out + P.hl(-14, -18, 12, 3, '#FFFFFF', 0.3, -15);
  }


  // a crispy beetroot bite (the book's beetroot bites): deep purple, a red glow, a pink highlight
  function beetBite(P) {
    return P.ellipse(1.5, 2.5, 11, 9.5, '#000000', null, 0, { opacity: '0.15' }) + P.path('M-11 0 Q-10 -9 0 -9.5 Q10 -9 11 0 Q10 9 0 9.5 Q-10 9 -11 0 Z', '#7A1F45', '#561230', 1) +
      P.path('M-9 0 Q-8 -7 0 -7.5 Q8 -7 9 0 Q8 7 0 7.5 Q-8 7 -9 0 Z', '#B02A1E', null, 0, { opacity: '0.62' }) + P.ellipse(-3, -3.5, 3.6, 1.5, '#F0907A', null, 0, { opacity: '0.7' }) + P.circle(4, 2, 1, '#F0907A', null, 0, { opacity: '0.6' });
  }
  function beetBites(P, rnd) {
    return [[-16, -9], [16, -7], [0, 13]].map(function (c) { return P.g(P.at(c[0], c[1], (rnd() - 0.5) * 30, 1.4), beetBite(P)); }).join('');
  }

  L.add('prepared', [
    // fried bites
    { id: 'arancini', name: 'Arancini ball', sub: 'Fried bites', kw: 'arancini arancino rice ball risotto ball crumbed fried', form: 'piece', cook: 'crumbed', role: 'main', n: 1, w: 31, h: 31, side: { s: 'scoop', h: 28, c: '#D39A4C' }, draw: ball({ r: 15, col: '#D39A4C', count: 16 }) },
    { id: 'arancini-halved', name: 'Arancini, halved', sub: 'Fried bites', kw: 'arancini cut open halves cheese centre mozzarella ragu rice ball', form: 'half', cook: 'crumbed', role: 'main', n: 1, w: 64, h: 33, side: { s: 'scoop', h: 15, c: '#F1DE9E' }, draw: aranciniHalf },
    { id: 'croqueta', name: 'Croqueta', sub: 'Fried bites', kw: 'croquetas croquette croquettes ham jamon bechamel crumbed tapas', form: 'piece', cook: 'crumbed', role: 'main', n: 1, w: 41, h: 18, side: { s: 'slab', h: 16, c: '#D39A4C' }, draw: crumbedLog({ l: 40, w: 17, col: '#D39A4C' }) },
    { id: 'cheese-stick-crumbed', name: 'Crumbed cheese stick', sub: 'Fried bites', kw: 'mozzarella sticks mozz stick cheese stick crumbed fried', form: 'stick', cook: 'crumbed', role: 'main', n: 1, w: 58, h: 14, side: { s: 'stick', h: 13, c: '#C98A3A' }, draw: crumbedLog({ l: 52, w: 13, col: '#C98A3A', extra: function (P, rnd) { return P.path(P.blob(rnd, 5, 3.4, 0.2, 8, 27, 0.5), '#F6E7B0', '#E0C77E', 0.6) + P.path('M29 0 Q31 -1 32 1', 'none', '#FBF3D2', 1, { 'stroke-linecap': 'round' }); } }) },
    { id: 'tempura-vegetables', name: 'Tempura vegetables', sub: 'Fried bites', kw: 'tempura veg vegetables battered sweet potato broccoli eggplant zucchini japanese', form: 'cluster', cook: 'battered', role: 'sidedish', g: 120, w: 96, h: 74, side: { s: 'pile', h: 22, c: '#F2DFA6' }, draw: tempura },
    { id: 'samosa', name: 'Samosa', sub: 'Fried bites', kw: 'samosa samoosa samosas pastry potato pea indian triangle', form: 'piece', cook: 'fried', role: 'main', n: 1, w: 64, h: 48, side: { s: 'wedge', h: 22, c: '#D9A45A' }, draw: samosa },
    { id: 'sambousek', name: 'Sambousek', sub: 'Fried bites', kw: 'sambousek sambusak sambusa fatayer curry puff half moon pastry lebanese', form: 'piece', cook: 'fried', role: 'main', n: 1, w: 58, h: 32, side: { s: 'slab', h: 14, c: '#D9A24E' }, draw: sambousek },
    { id: 'kebbe', name: 'Kebbe', sub: 'Fried bites', kw: 'kibbeh kibbe kubba kebbeh lamb burghul torpedo lebanese', form: 'piece', cook: 'fried', role: 'main', n: 1, w: 48, h: 26, side: { s: 'slab', h: 22, c: '#8A5428' }, draw: kebbe },
    { id: 'falafel-ball', name: 'Falafel', sub: 'Fried bites', kw: 'falafel felafel chickpea ball fried vegan', form: 'piece', cook: 'fried', role: 'main', n: 1, w: 26, h: 26, side: { s: 'scoop', h: 20, c: '#8A5A26' }, draw: ball({ r: 12, col: '#8A5A26', wob: 0.12, k: 12, count: 18, cr: 0.7, cc: ['#5E3A14', '#B9864A', '#6B4218'], extra: function (P, rnd, r) { return P.scatter(rnd, 6, r * 0.7, r * 0.7, function (x, y, i, q) { return P.ellipse(x, y, 1.2, 0.6, '#F2E6C4', null, 0, { transform: 'rotate(' + N(q() * 180) + ' ' + N(x) + ' ' + N(y) + ')' }); }); } }) },
    { id: 'falafel-halved', name: 'Falafel, halved', sub: 'Fried bites', kw: 'falafel felafel broken open green inside herbs', form: 'half', cook: 'fried', role: 'main', n: 1, w: 50, h: 26, side: { s: 'scoop', h: 12, c: '#7EA453' }, draw: falafelHalf },
    { id: 'battered-sausage-stick', name: 'Battered sausage on a stick', sub: 'Fried bites', kw: 'dagwood dog dagwood pluto pup dippy dog corn dog battered sav show bag', form: 'stick', cook: 'battered', role: 'main', n: 1, w: 120, h: 26, side: { s: 'stick', h: 24, c: '#C47F34' }, draw: dagwood(false) },
    { id: 'battered-sausage-stick-sauce', name: 'Battered sausage on a stick, with sauce', sub: 'Fried bites', kw: 'dagwood dog pluto pup corn dog tomato sauce dipped', form: 'stick', cook: 'battered', role: 'main', n: 1, w: 120, h: 26, of: 'battered-sausage-stick', side: { s: 'stick', h: 25, c: '#C47F34' }, draw: dagwood(true) },
    { id: 'money-bag', name: 'Money bag', sub: 'Fried bites', kw: 'money bags wonton purse pouch fried dim sum yum cha thai', form: 'parcel', cook: 'fried', role: 'main', n: 1, w: 31, h: 31, side: { s: 'mound', h: 22, c: '#D9A24E' }, draw: moneyBag },
    // dumplings and buns
    { id: 'dim-sim-steamed', name: 'Dim sim, steamed', sub: 'Dumplings and buns', kw: 'dim sim dimmy dimmies siu mai shumai pork dumpling steamed yum cha', form: 'piece', cook: 'steamed', role: 'main', n: 1, w: 37, h: 37, side: { s: 'cup', h: 26, c: '#EFE6CC' }, draw: dimSim({ col: '#EFE6CC', fill: '#C9866A' }) },
    { id: 'dim-sim-fried', name: 'Dim sim, fried', sub: 'Dumplings and buns', kw: 'dim sim dimmy dimmies fried deep fried chip shop', form: 'piece', cook: 'fried', role: 'main', n: 1, w: 37, h: 37, of: 'dim-sim-steamed', side: { s: 'cup', h: 26, c: '#C98A3A' }, draw: dimSim({ col: '#C98A3A', fill: '#A8644A', blister: true }) },
    { id: 'dumpling-pleated', name: 'Pleated dumpling', sub: 'Dumplings and buns', kw: 'dumpling dumplings jiaozi pleated steamed boiled pork chive momo', form: 'piece', cook: 'steamed', role: 'main', n: 1, w: 35, h: 20, side: { s: 'mound', h: 16, c: '#F3EDDD' }, draw: jiaozi },
    { id: 'gyoza', name: 'Gyoza, seared side up', sub: 'Dumplings and buns', kw: 'gyoza potsticker potstickers pan fried dumpling seared japanese', form: 'piece', cook: 'fried', role: 'main', n: 1, w: 37, h: 19, side: { s: 'mound', h: 14, c: '#C98A3A' }, draw: gyozaBody },
    { id: 'gyoza-skirt', name: 'Gyoza with crispy skirt', sub: 'Dumplings and buns', kw: 'gyoza potstickers row of five lace skirt hane crispy wing pan fried', form: 'portion', cook: 'fried', role: 'main', n: 5, w: 102, h: 56, side: { s: 'layer', h: 14, c: '#E2B566' }, draw: gyozaRow },
    { id: 'har-gow', name: 'Har gow', sub: 'Dumplings and buns', kw: 'har gow ha gow har gau prawn dumpling crystal translucent yum cha dim sum', form: 'piece', cook: 'steamed', role: 'main', n: 1, w: 30, h: 22, side: { s: 'mound', h: 16, c: '#F6F2EA' }, draw: harGow },
    { id: 'xiao-long-bao', name: 'Xiao long bao', sub: 'Dumplings and buns', kw: 'xiao long bao xlb soup dumpling pleated twist shanghai', form: 'piece', cook: 'steamed', role: 'main', n: 1, w: 28, h: 28, side: { s: 'mound', h: 18, c: '#F4EEE0' }, draw: function (P, rnd) { return xlb(P, rnd, 0, 0, 14); } },
    { id: 'xiao-long-bao-steamer', name: 'Xiao long bao in a steamer', sub: 'Dumplings and buns', kw: 'xiao long bao xlb soup dumplings bamboo steamer basket yum cha', form: 'portion', cook: 'steamed', role: 'main', n: 7, w: 106, h: 106, side: { s: 'cup', h: 40, c: '#D9B98A' }, draw: steamerXlb },
    { id: 'mandu', name: 'Mandu', sub: 'Dumplings and buns', kw: 'mandu gun mandu korean dumpling pan fried ruffled half moon', form: 'piece', cook: 'fried', role: 'main', n: 1, w: 46, h: 30, side: { s: 'mound', h: 15, c: '#F2E6C8' }, draw: mandu },
    { id: 'wontons-chilli-oil', name: 'Wontons in chilli oil', sub: 'Dumplings and buns', kw: 'wontons wonton chilli oil red oil sichuan spring onion sesame', form: 'portion', cook: 'poached', role: 'main', n: 6, w: 110, h: 90, side: { s: 'layer', h: 14, c: '#B5301F' }, draw: wontonsChilli },
    { id: 'bao-pork-belly', name: 'Bao, pork belly', sub: 'Dumplings and buns', kw: 'bao bun gua bao steamed bun folded pork belly cucumber coriander peanut hoisin', form: 'piece', cook: 'steamed', role: 'main', n: 1, w: 68, h: 46, side: { s: 'slab', h: 30, c: '#FAF6EC' }, draw: bao(baoPork) },
    { id: 'bao-fried-chicken', name: 'Bao, fried chicken', sub: 'Dumplings and buns', kw: 'bao bun gua bao steamed bun folded fried chicken slaw sriracha mayo', form: 'piece', cook: 'steamed', role: 'main', n: 1, w: 68, h: 44, of: 'bao-pork-belly', side: { s: 'slab', h: 30, c: '#FAF6EC' }, draw: bao(baoChicken) },
    { id: 'char-siu-bao', name: 'Char siu bao', sub: 'Dumplings and buns', kw: 'char siu bao cha siu bao bbq pork bun steamed bun round yum cha', form: 'piece', cook: 'steamed', role: 'main', n: 1, w: 45, h: 44, side: { s: 'mound', h: 30, c: '#FBF7EE' }, draw: charSiuBao },
    // rolls and wraps
    { id: 'spring-roll', name: 'Spring roll', sub: 'Rolls and wraps', kw: 'spring roll spring rolls springroll vegetable pastry fried', form: 'piece', cook: 'fried', role: 'main', n: 1, w: 67, h: 18, side: { s: 'stick', h: 17, c: '#D9A04A' }, draw: springRoll },
    { id: 'rice-paper-roll', name: 'Rice paper roll', sub: 'Rolls and wraps', kw: 'rice paper roll rice paper rolls summer roll fresh spring roll goi cuon prawn vietnamese', form: 'piece', cook: 'fresh', role: 'main', n: 1, w: 81, h: 29, side: { s: 'stick', h: 26, c: '#F1EDE3' }, draw: ricePaperRoll },
    { id: 'rice-paper-roll-halved', name: 'Rice paper roll, halved', sub: 'Rolls and wraps', kw: 'rice paper roll cut halves on the end cross section summer roll', form: 'half', cook: 'fresh', role: 'main', n: 1, w: 64, h: 34, side: { s: 'stick', h: 34, c: '#F1EDE3' }, draw: ricePaperHalves },
    { id: 'vegetable-roll-crumbed', name: 'Vegetable roll, crumbed', sub: 'Rolls and wraps', kw: 'chiko roll chicko chico chiko roll vegetable roll crumbed fried roll chip shop', form: 'piece', cook: 'crumbed', role: 'main', n: 1, w: 101, h: 33, side: { s: 'stick', h: 30, c: '#D9AE68' }, draw: crumbedLog({ l: 100, w: 32, col: '#D9AE68', wob: 0.04, k: 30, per: 22, extra: function (P) { var s = ''; for (var x = -32; x <= 32; x += 8) s += P.line(x - 5, -12, x + 5, 12, '#B98A48', 1.6, { opacity: '0.55' }) + P.line(x - 3.6, -12, x + 6.4, 12, '#F0D498', 0.9, { opacity: '0.55' }); return s + P.path('M-44 -9 Q-41 0 -44 9 M44 -9 Q41 0 44 9', 'none', '#B98A48', 1.2, { opacity: '0.7' }); } }) },
    { id: 'dolmades', name: 'Dolmades', sub: 'Rolls and wraps', kw: 'dolmades dolma dolmas stuffed vine leaves grape leaves warak enab greek', form: 'piece', cook: 'braised', role: 'sidedish', n: 1, w: 41, h: 17, side: { s: 'stick', h: 15, c: '#6E7A36' }, draw: dolma },
    { id: 'san-choy-bow', name: 'San choy bow', sub: 'Rolls and wraps', kw: 'san choy bow san choi bau lettuce cup lettuce wrap pork mince', form: 'piece', cook: 'fried', role: 'main', n: 1, w: 68, h: 62, side: { s: 'cup', h: 22, c: '#CFE29A' }, draw: sanChoyBow },
    // skewers
    { id: 'skewer-chicken', name: 'Chicken skewer', sub: 'Skewers', kw: 'chicken skewer kebab kebob souvlaki shish grilled', form: 'skewer', cook: 'grilled', role: 'main', n: 1, w: 130, h: 26, side: { s: 'stick', h: 20, c: '#E2AE62' }, draw: skewer({ parts: ['chicken', 'chicken', 'chicken', 'chicken', 'chicken'] }) },
    { id: 'skewer-beef', name: 'Beef skewer', sub: 'Skewers', kw: 'beef skewer kebab kebob shish capsicum onion grilled', form: 'skewer', cook: 'grilled', role: 'main', n: 1, w: 136, h: 26, side: { s: 'stick', h: 20, c: '#7A4A26' }, draw: skewer({ len: 136, parts: ['beef', 'onion', 'capR', 'beef', 'onion', 'capG', 'beef'] }) },
    { id: 'skewer-vegetable', name: 'Vegetable skewer', sub: 'Skewers', kw: 'vegetable skewer veg kebab capsicum zucchini mushroom tomato onion vegan', form: 'skewer', cook: 'grilled', role: 'main', n: 1, w: 130, h: 26, side: { s: 'stick', h: 20, c: '#C8382B' }, draw: skewer({ parts: ['capR', 'zucchini', 'onion', 'tomato', 'capY', 'zucchini', 'mushroom', 'capG'] }) },
    { id: 'skewer-haloumi', name: 'Haloumi skewer', sub: 'Skewers', kw: 'haloumi halloumi skewer kebab grilled cheese tomato zucchini vegetarian', form: 'skewer', cook: 'grilled', role: 'main', n: 1, w: 130, h: 26, side: { s: 'stick', h: 20, c: '#F4ECD2' }, draw: skewer({ parts: ['haloumi', 'tomato', 'haloumi', 'zucchini', 'haloumi'] }) },
    { id: 'skewer-paneer-tikka', name: 'Paneer tikka skewer', sub: 'Skewers', kw: 'paneer tikka skewer tandoori indian cheese capsicum onion vegetarian', form: 'skewer', cook: 'grilled', role: 'main', n: 1, w: 130, h: 26, side: { s: 'stick', h: 20, c: '#E07A34' }, draw: skewer({ parts: ['paneer', 'onion', 'capG', 'paneer', 'onion', 'capR', 'paneer'] }) },
    { id: 'skewer-lamb-kofta', name: 'Lamb kofta skewer', sub: 'Skewers', kw: 'lamb kofta kofte kafta kebab skewer mince grilled', form: 'skewer', cook: 'grilled', role: 'main', n: 1, w: 130, h: 24, side: { s: 'stick', h: 20, c: '#8A5232' }, draw: skewer({ draw: kofta }) },
    { id: 'skewer-chicken-satay', name: 'Chicken satay skewer', sub: 'Skewers', kw: 'satay sate chicken skewer stick peanut turmeric threaded strip', form: 'skewer', cook: 'grilled', role: 'main', n: 1, w: 110, h: 22, side: { s: 'stick', h: 12, c: '#D49A3A' }, draw: skewer({ len: 110, draw: satay }) },
    // patties and fritters
    { id: 'plant-based-patty', name: 'Plant-based patty', sub: 'Patties and fritters', kw: 'plant based patty vegan burger patty meat free beyond burger impossible v2 vegetarian', form: 'piece', cook: 'grilled', role: 'main', n: 1, w: 74, h: 72, side: { s: 'slab', h: 14, c: '#5E3424' }, draw: patty({ r: 36, col: '#5E3424', top: '#7A4532', specks: ['#4A281A', '#9A5E46'], marks: '#2E1A10' }) },
    { id: 'chickpea-patty', name: 'Chickpea patty', sub: 'Patties and fritters', kw: 'chickpea patty chickpea burger falafel patty veggie patty vegan vegetarian', form: 'piece', cook: 'fried', role: 'main', n: 1, w: 66, h: 64, side: { s: 'slab', h: 16, c: '#D9AC62' }, draw: patty({ r: 32, col: '#B9823A', top: '#D9AC62', specks: ['#A8702A', '#EBC98A'], bits: function (P, rnd, r) { return P.scatter(rnd, 9, r * 0.7, r * 0.7, function (x, y) { return P.circle(x, y, 2.6, '#EAD3A0', '#C9A66A', 0.6); }) + P.crumbs(rnd, 14, r * 0.75, r * 0.75, ['#4F7F2F', '#6E9A3E', '#C8382B'], 1); } }) },
    { id: 'fritter-corn', name: 'Corn fritter', sub: 'Patties and fritters', kw: 'corn fritter corn fritters sweetcorn fritter brunch', form: 'piece', cook: 'fried', role: 'main', n: 1, w: 58, h: 54, side: { s: 'slab', h: 10, c: '#E3B455' }, draw: fritter({ r: 28, edge: '#C98A3A', col: '#E3B455', bits: function (P, rnd, r) { return P.scatter(rnd, 26, r * 0.78, r * 0.7, function (x, y, i, q) { return P.ellipse(x, y, 2.4, 1.9, '#F7D24E', '#D9A62A', 0.5, { transform: 'rotate(' + N(q() * 180) + ' ' + N(x) + ' ' + N(y) + ')' }); }) + P.scatter(rnd, 8, r * 0.7, r * 0.6, function (x, y) { return P.line(x - 1.5, y, x + 1.5, y - 0.5, '#4F7F2F', 1.2); }); } }) },
    { id: 'fritter-zucchini', name: 'Zucchini fritter', sub: 'Patties and fritters', kw: 'zucchini fritter courgette fritter feta kolokithokeftedes vegetarian', form: 'piece', cook: 'fried', role: 'main', n: 1, w: 54, h: 50, side: { s: 'slab', h: 10, c: '#D4B868' }, draw: fritter({ r: 26, edge: '#B9903A', col: '#D4B868', bits: function (P, rnd, r) { return P.scatter(rnd, 28, r * 0.78, r * 0.7, function (x, y, i, q) { return P.path('M' + N(x - 3) + ' ' + N(y) + ' q3 ' + N(q() * 3 - 1.5) + ' 6 0', 'none', i % 2 ? '#6E9A3E' : '#A6C46A', 1.4, { 'stroke-linecap': 'round' }); }) + P.scatter(rnd, 5, r * 0.6, r * 0.55, function (x, y, i, q) { return P.path(P.blob(q, 2.6, 2.2, 0.3, 7, x, y), '#FBF8EE', '#E6E0D2', 0.5); }); } }) },
    { id: 'fritter-pineapple', name: 'Pineapple fritter', sub: 'Patties and fritters', kw: 'pineapple fritter battered pineapple ring chip shop fish and chips', form: 'ring', cook: 'battered', role: 'sidedish', n: 1, w: 62, h: 60, side: { s: 'disc', h: 12, c: '#DDA24A' }, draw: pineFritter },
    { id: 'onion-bhaji', name: 'Onion bhaji', sub: 'Patties and fritters', kw: 'onion bhaji bhajee bhajia pakora pakoda fritter indian', form: 'piece', cook: 'fried', role: 'main', n: 1, w: 44, h: 42, side: { s: 'mound', h: 18, c: '#C98A3A' }, draw: bhaji },
    { id: 'okonomiyaki', name: 'Okonomiyaki', sub: 'Patties and fritters', kw: 'okonomiyaki japanese pancake cabbage kewpie mayo bonito flakes okonomi sauce aonori', form: 'piece', cook: 'fried', role: 'main', g: 300, w: 108, h: 104, side: { s: 'slab', h: 16, c: '#5E2A12' }, draw: okonomiyaki },
    { id: 'korean-pancake', name: 'Korean pancake, cut', sub: 'Patties and fritters', kw: 'korean pancake pajeon haemul pajeon kimchi pancake jeon buchimgae spring onion cut squares', form: 'piece', cook: 'fried', role: 'main', g: 250, w: 122, h: 122, side: { s: 'slab', h: 8, c: '#E2B45A' }, draw: pajeon },
    // dips
    { id: 'hummus-dish', name: 'Hummus in a dish', sub: 'Dips', kw: 'hummus houmous hommus humus chickpea dip swirl olive oil paprika', form: 'bowlful', cook: 'fresh', role: 'sidedish', g: 100, w: 80, h: 80, side: { s: 'cup', h: 26, c: '#E3C99A' }, draw: dip({ col: '#E3C99A', top: DIPS.hummus }) },
    { id: 'baba-ganoush-dish', name: 'Baba ganoush in a dish', sub: 'Dips', kw: 'baba ganoush baba ghanoush babaganoush eggplant dip smoky pomegranate', form: 'bowlful', cook: 'fresh', role: 'sidedish', g: 100, w: 80, h: 80, side: { s: 'cup', h: 26, c: '#C9B08A' }, draw: dip({ col: '#C9B08A', top: DIPS.baba }) },
    { id: 'muhammara-dish', name: 'Muhammara in a dish', sub: 'Dips', kw: 'muhammara mhammara red capsicum walnut dip pomegranate molasses', form: 'bowlful', cook: 'fresh', role: 'sidedish', g: 100, w: 80, h: 80, side: { s: 'cup', h: 26, c: '#C2502E' }, draw: dip({ col: '#C2502E', top: DIPS.muhammara }) },
    { id: 'tzatziki-dish', name: 'Tzatziki in a dish', sub: 'Dips', kw: 'tzatziki tsatsiki yoghurt cucumber dill garlic dip greek', form: 'bowlful', cook: 'fresh', role: 'sidedish', g: 100, w: 80, h: 80, side: { s: 'cup', h: 26, c: '#EEF0E4' }, draw: dip({ col: '#EEF0E4', top: DIPS.tzatziki }) },
    { id: 'beetroot-dip-dish', name: 'Beetroot dip in a dish', sub: 'Dips', kw: 'beetroot dip beet dip feta dukkah mint pink', form: 'bowlful', cook: 'fresh', role: 'sidedish', g: 100, w: 80, h: 80, side: { s: 'cup', h: 26, c: '#A8476B' }, draw: dip({ col: '#A8476B', top: DIPS.beetroot }) },
    { id: 'taramasalata-dish', name: 'Taramasalata in a dish', sub: 'Dips', kw: 'taramasalata tarama fish roe dip pink greek kalamata olive', form: 'bowlful', cook: 'fresh', role: 'sidedish', g: 100, w: 80, h: 80, side: { s: 'cup', h: 26, c: '#F2B9B0' }, draw: dip({ col: '#F2B9B0', top: DIPS.tarama }) },
    { id: 'labneh-dish', name: 'Labneh with za\'atar oil', sub: 'Dips', kw: 'labneh labna lebnah strained yoghurt zaatar za atar olive oil sumac mint', form: 'bowlful', cook: 'fresh', role: 'sidedish', g: 100, w: 80, h: 80, side: { s: 'cup', h: 26, c: '#F4F0E4' }, draw: dip({ col: '#F6F2E6', top: DIPS.labneh }) },
    // Mexican
    { id: 'nachos', name: 'Nachos', sub: 'Mexican', kw: 'nachos nacho corn chips melted cheese salsa sour cream guacamole jalapeno', form: 'portion', cook: 'baked', role: 'main', g: 350, w: 150, h: 128, side: { s: 'pile', h: 40, c: '#E9BC4C' }, draw: nachos },
    { id: 'fajitas-chicken', name: 'Chicken fajitas', sub: 'Mexican', kw: 'fajitas fajita chicken strips capsicum peppers onion sizzling sizzle', form: 'pile', cook: 'grilled', role: 'main', g: 250, w: 118, h: 74, side: { s: 'pile', h: 18, c: '#D49A4A' }, draw: fajitas('#D49A4A') },
    { id: 'fajitas-beef', name: 'Beef fajitas', sub: 'Mexican', kw: 'fajitas fajita beef steak strips capsicum peppers onion sizzling', form: 'pile', cook: 'grilled', role: 'main', g: 250, w: 118, h: 74, of: 'fajitas-chicken', side: { s: 'pile', h: 18, c: '#7A4A26' }, draw: fajitas('#7A4A26') },
    { id: 'tostada-basket', name: 'Tostada basket', sub: 'Mexican', kw: 'tostada basket tortilla bowl taco salad bowl fried shell fluted', form: 'bowlful', cook: 'fried', role: 'main', n: 1, w: 104, h: 104, side: { s: 'cup', h: 40, c: '#E5B552' }, draw: tostada },
    { id: 'corn-chips-pile', name: 'Corn chips', sub: 'Mexican', kw: 'corn chips tortilla chips totopos nacho chips crisps doritos', form: 'pile', cook: 'fried', role: 'sidedish', g: 60, w: 86, h: 70, side: { s: 'pile', h: 20, c: '#E9BC4C' }, draw: function (P, rnd) { return P.scatter(rnd, 10, 26, 20, function (x, y, i, q) { return cornChip(P, q, x, y, 30); }) + P.pile(rnd, 5, 14, 10, function (x, y, i, q) { return cornChip(P, q, x, y, 30); }) + P.crumbs(rnd, 20, 30, 22, ['#FFFFFF'], 0.6); } },
    { id: 'taquito', name: 'Taquito', sub: 'Mexican', kw: 'taquito taquitos flautas rolled taco rolled tortilla fried', form: 'piece', cook: 'fried', role: 'main', n: 1, w: 80, h: 15, side: { s: 'stick', h: 14, c: '#D39A42' }, draw: taquito },
    { id: 'jalapeno-popper', name: 'Jalapeño popper', sub: 'Mexican', kw: 'jalapeno popper poppers crumbed stuffed cream cheese chilli', form: 'piece', cook: 'crumbed', role: 'main', n: 1, w: 51, h: 22, side: { s: 'stick', h: 18, c: '#D49B55' }, draw: popper },
    { id: 'queso-dish', name: 'Queso dip', sub: 'Mexican', kw: 'queso dip cheese dip chile con queso melted cheese chorizo jalapeno', form: 'bowlful', cook: 'baked', role: 'sidedish', g: 100, w: 80, h: 80, side: { s: 'cup', h: 26, c: '#F0B83A' }, draw: dip({ col: '#F0B83A', ware: '#2E3034', top: DIPS.queso }) },
    { id: 'pico-de-gallo-dish', name: 'Pico de gallo', sub: 'Mexican', kw: 'pico de gallo salsa fresca salsa tomato onion coriander jalapeno', form: 'bowlful', cook: 'fresh', role: 'sidedish', g: 100, w: 80, h: 80, side: { s: 'cup', h: 26, c: '#D9473B' }, draw: dip({ col: '#E26A5A', top: DIPS.pico }) },
    { id: 'guacamole-molcajete', name: 'Guacamole in a stone bowl', sub: 'Mexican', kw: 'guacamole guac avocado dip molcajete stone bowl', form: 'bowlful', cook: 'fresh', role: 'sidedish', g: 120, w: 86, h: 86, side: { s: 'cup', h: 30, c: '#8DB255' }, draw: dip({ R: 41, col: '#8DB255', ware: '#55534F', stone: true, top: DIPS.guac }) },
    // other
    { id: 'baked-camembert-box', name: 'Baked camembert in its box', sub: 'Other', kw: 'baked camembert brie whole cheese box scored garlic rosemary honey sharing', form: 'whole', cook: 'baked', role: 'main', n: 1, w: 86, h: 86, side: { s: 'disc', h: 24, c: '#F4EEDC' }, draw: camembert },
    { id: 'shepherds-pie-portion', name: 'Shepherd\'s pie portion', sub: 'Other', kw: 'shepherds pie cottage pie mince mash top browned portion square tray bake', form: 'portion', cook: 'baked', role: 'main', g: 350, w: 72, h: 70, side: { s: 'slab', h: 40, c: '#EFDDB0' }, draw: shepherds },
    { id: 'beetroot-bites', name: 'Beetroot bites, crispy', sub: 'Fried bites', kw: 'beetroot bites crispy beetroot balls beet bites plant based vegan rissoles crumbed', form: 'pile', cook: 'fried', role: 'main', n: 3, w: 66, h: 56, side: { s: 'pile', h: 22, c: '#7A1F45' }, draw: beetBites },
  ]);
  // the helpers, for the other category files (a skewer of anything, a dip in a dish, a coated log)
  L.PREPARED = { logD: logD, lumpyLog: lumpyLog, roundPoly: roundPoly, coat: coat, ball: ball, crumbedLog: crumbedLog, skewer: skewer, cube: cube, dip: dip, dips: DIPS, swirl: swirl, cornChip: cornChip, dollop: dollop, jalapeno: jalapeno, herbs: herbs, patty: patty, fritter: fritter };
})();
