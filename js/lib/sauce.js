/* The drawing library: sauces and purées (see js/library.js for the fields). Drawn around 0,0, 1 unit is about 1.5 mm. */
(function () {
  'use strict';
  var L = window.LK_LIB, C = L.P.C;

  /* Every shape helper takes a colour ('#7A5634') or options { c: colour, bits: [['pepper', 30]], ... } and returns
     draw(P, rnd). "Draw it for me" can call them with L.sauceColour(name), or use byName(name, shape) below. */
  var lastC = '';
  function opt(o, def) { o = typeof o === 'string' ? { c: o } : Object.assign({}, o || {}); if (!/^#[0-9A-F]{6}$/i.test(o.c || '')) o.c = def; lastC = o.c; return o; }
  // each helper's draw function carries the colour it draws in (draw.c), for the item's side view
  function keep(h) { return function (o) { var f = h(o); f.c = lastC; return f; }; }
  function lum(c) { var h = c.replace('#', ''); return (0.299 * parseInt(h.slice(0, 2), 16) + 0.587 * parseInt(h.slice(2, 4), 16) + 0.114 * parseInt(h.slice(4, 6), 16)) / 255; }
  // the lighter top of a sauce: pale sauces get a touch of shade instead (white on white does not show)
  function top(P, c, f) { return lum(c) > 0.82 ? P.shade(c, -0.04) : P.shade(c, f || 0.12); }
  // a point on a quadratic curve, k + 1 points from p0 to p2
  function curve(p0, p1, p2, k) {
    var out = [];
    for (var i = 0; i <= k; i++) { var t = i / k, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t; out.push([a * p0[0] + b * p1[0] + d * p2[0], a * p0[1] + b * p1[1] + d * p2[1]]); }
    return out;
  }
  function normal(pts, i) {
    var m = pts.length, a = pts[Math.max(0, i - 1)], b = pts[Math.min(m - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l, dx / l, dy / l];
  }
  // a ribbon round a centre line: half widths ws, a round cap where the width is more than 0.8
  function ribbonPts(pts, ws) {
    var m = pts.length, lf = [], rt = [], out = [];
    for (var i = 0; i < m; i++) { var nm = normal(pts, i); lf.push([pts[i][0] + nm[0] * ws[i], pts[i][1] + nm[1] * ws[i]]); rt.push([pts[i][0] - nm[0] * ws[i], pts[i][1] - nm[1] * ws[i]]); }
    function cap(i, dir) {
      var w = ws[i], nm = normal(pts, i), res = [];
      if (w < 0.8) return res;
      for (var k = 1; k < 4; k++) {
        var a = k / 4 * Math.PI, cs = Math.cos(a), sn = Math.sin(a);
        res.push([pts[i][0] + dir * nm[0] * w * cs + dir * nm[2] * w * sn, pts[i][1] + dir * nm[1] * w * cs + dir * nm[3] * w * sn]);
      }
      return res;
    }
    out = out.concat(lf, cap(m - 1, 1), rt.reverse(), cap(0, -1));
    return out;
  }
  function ribbon(P, pts, ws) { return P.smooth(ribbonPts(pts, ws)); }
  // a line offset from the centre line by f times the half width (a highlight or a ridge)
  function offsetLine(P, pts, ws, f, from, to) {
    var o = [];
    for (var i = from; i <= to; i++) { var nm = normal(pts, i); o.push([pts[i][0] + nm[0] * ws[i] * f, pts[i][1] + nm[1] * ws[i] * f]); }
    return P.smooth(o, true);
  }
  // several shapes as one: the outline drawn under every part first, then the fills, so no lines show inside
  function solid(P, ds, fill, edge, sw, x) {
    var o = '';
    ds.forEach(function (d) { o += P.path(d, edge, edge, sw * 2, { 'stroke-linejoin': 'round' }); });
    ds.forEach(function (d) { o += P.path(d, fill, null, 0); });
    return x ? P.g('', o, x) : o;
  }
  // a line of sauce from a squeeze bottle: an edge, the sauce, a thin shine
  function piped(P, d, c, sw) {
    var r = { 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    return P.path(d, 'none', P.shade(c, -0.26), sw + 1.1, r) + P.path(d, 'none', c, sw, r) + P.path(d, 'none', '#FFFFFF', Math.max(0.5, sw * 0.28), Object.assign({ opacity: '0.4', transform: 'translate(-0.4 -0.5)' }, r));
  }
  function dot(P, x, y, r, c) {
    return P.circle(x, y, r, c, P.shade(c, -0.24), 0.6) + P.hl(x - r * 0.3, y - r * 0.36, r * 0.36, r * 0.22, '#FFFFFF', 0.55, -30);
  }

  /* ---------- what is in the sauce (cracked pepper, herbs, capers ...) ---------- */
  function rot(P, q, x, y) { return 'rotate(' + Math.round(q() * 180) + ' ' + P.n(x) + ' ' + P.n(y) + ')'; }
  var BITS = {
    pepper: function (P, q, x, y) { return P.circle(x, y, 0.4 + q() * 0.5, q() < 0.6 ? '#2A1E16' : '#5A4632'); },
    herb: function (P, q, x, y) { return P.path(P.blob(q, 0.8 + q() * 0.9, 0.5 + q() * 0.5, 0.3, 5, x, y, q() * 180), q() < 0.6 ? '#3F6E26' : '#5E8C3A'); },
    chive: function (P, q, x, y) { var a = q() * Math.PI; return P.line(x - Math.cos(a) * 1.3, y - Math.sin(a) * 1.3, x + Math.cos(a) * 1.3, y + Math.sin(a) * 1.3, '#4F7F2F', 0.9); },
    basil: function (P, q, x, y) { return P.leaf(4 + q() * 2.5, 2.4 + q(), '#4F7F2F', x, y, q() * 360, { vein: false }); },
    mushroom: function (P, q, x, y) { return P.g(P.at(x, y, q() * 360), P.path('M-3.4 0.4 Q-3.4 -3 0 -3 Q3.4 -3 3.4 0.4 L1.2 0.4 L1.2 2.8 L-1.2 2.8 L-1.2 0.4 Z', '#D9C2A0', '#8A6A4A', 0.4)); },
    bacon: function (P, q, x, y) { return P.g(P.at(x, y, q() * 180), P.rect(-1.9, -1.1, 3.8, 2.2, 0.6, '#B5503F', '#8A3426', 0.3) + P.line(-1.4, 0.1, 1.4, 0.1, '#F0D8D0', 0.6)); },
    seeds: function (P, q, x, y) { return P.circle(x, y, 0.7 + q() * 0.35, q() < 0.72 ? '#D9B04A' : '#7A4A1A', '#8A6A2A', 0.25); },
    chilli: function (P, q, x, y) { return q() < 0.65 ? P.path(P.blob(q, 0.9 + q() * 0.6, 0.6 + q() * 0.4, 0.3, 5, x, y, q() * 180), '#B5301F') : P.ellipse(x, y, 0.75, 0.45, '#F2D27A', null, 0, { transform: rot(P, q, x, y) }); },
    caper: function (P, q, x, y) { var k = q(); return k < 0.4 ? P.circle(x, y, 1.1 + q() * 0.4, '#6E7A3A', '#4F5A2A', 0.3) : k < 0.75 ? P.rect(x - 0.9, y - 0.9, 1.8, 1.8, 0.3, '#8DA44A', '#6E8A3A', 0.3) : P.path(P.blob(q, 0.9, 0.5, 0.3, 5, x, y, q() * 180), '#4F7F2F'); },
    mince: function (P, q, x, y) { return P.path(P.blob(q, 1.4 + q() * 1.2, 1.1 + q() * 0.9, 0.35, 6, x, y), q() < 0.6 ? '#6B3420' : '#8A4526', null, 0); },
    shallot: function (P, q, x, y) { return P.rect(x - 1, y - 1, 2, 2, 0.3, '#EAD6E6', '#A86A96', 0.3, { transform: rot(P, q, x, y) }); },
    cucumber: function (P, q, x, y) { return q() < 0.7 ? P.rect(x - 1.1, y - 1.1, 2.2, 2.2, 0.4, '#CFE3A0', '#6E9A3E', 0.35, { transform: rot(P, q, x, y) }) : P.path(P.blob(q, 0.9, 0.4, 0.3, 5, x, y, q() * 180), '#4F7F2F'); },
    peanut: function (P, q, x, y) { return P.path(P.blob(q, 0.9 + q() * 0.8, 0.7 + q() * 0.6, 0.3, 6, x, y), q() < 0.6 ? '#D9B07A' : '#A8743A', null, 0); },
    chunk: function (P, q, x, y, o) { var c = o.chunk || P.shade(o.c, -0.2); return P.path(P.blob(q, 1.4 + q() * 1.4, 1.1 + q(), 0.3, 6, x, y), q() < 0.6 ? c : P.shade(c, 0.2), P.shade(c, -0.25), 0.3); },
    salt: function (P, q, x, y) { return P.rect(x - 0.8, y - 0.6, 1.6, 1.2, 0.2, '#FFFFFF', '#D9D3C6', 0.25, { transform: rot(P, q, x, y) }); },
    passion: function (P, q, x, y) { return P.ellipse(x, y, 1.4, 1.1, '#E8C44A', null, 0, { opacity: '0.8' }) + P.ellipse(x, y, 0.9, 0.7, '#1E1A14', null, 0); },
    figseed: function (P, q, x, y) { return P.circle(x, y, 0.4 + q() * 0.3, '#E9C9A0'); },
    onion: function (P, q, x, y, o) { var a = q() * Math.PI * 2; return P.path('M' + P.n(x - Math.cos(a) * 3) + ' ' + P.n(y - Math.sin(a) * 3) + ' Q' + P.n(x + Math.sin(a) * 2) + ' ' + P.n(y - Math.cos(a) * 2) + ' ' + P.n(x + Math.cos(a) * 3) + ' ' + P.n(y + Math.sin(a) * 3), 'none', P.shade(o.c, 0.3), 0.9, { 'stroke-linecap': 'round' }); },
    xo: function (P, q, x, y) { var k = q(); return P.path(P.blob(q, 1 + q() * 1.1, 0.8 + q() * 0.6, 0.35, 6, x, y), k < 0.4 ? '#C2502E' : k < 0.75 ? '#E8A07A' : '#6B2A16', null, 0); },
    sesame: function (P, q, x, y) { return P.ellipse(x, y, 0.85, 0.45, '#F4E8C8', '#C9B48A', 0.2, { transform: rot(P, q, x, y) }); },
    paprika: function (P, q, x, y) { return P.circle(x, y, 0.35 + q() * 0.4, q() < 0.7 ? '#C2451A' : '#9E2B20'); },
    zaatar: function (P, q, x, y) { return P.circle(x, y, 0.35 + q() * 0.35, q() < 0.6 ? '#4F5A2A' : '#9E2B3A'); },
    vanilla: function (P, q, x, y) { return P.circle(x, y, 0.25 + q() * 0.25, '#2A1E16'); },
    oil: function (P, q, x, y) { var r = 0.8 + q() * 1.6; return P.circle(x, y, r, '#E8A23A', '#C9801E', 0.3, { opacity: '0.75' }); },
    redoil: function (P, q, x, y) { var r = 0.8 + q() * 1.8; return P.circle(x, y, r, '#D9502A', '#B5301F', 0.3, { opacity: '0.7' }); },
    brownbits: function (P, q, x, y) { return P.circle(x, y, 0.4 + q() * 0.5, q() < 0.6 ? '#6B4420' : '#8E5A22'); },
    jalapeno: function (P, q, x, y) { return P.circle(x, y, 1.8, '#5E8C3A', '#4F7F2F', 0.4) + P.circle(x, y, 0.8, '#DCEBB8'); }
  };
  // bits of each kind in o.bits ([kind, count]), spread over an ellipse (cx, cy, rx, ry)
  function bits(P, rnd, o, rx, ry, cx, cy) {
    var out = '';
    (o.bits || []).forEach(function (b) {
      var f = BITS[b[0]]; if (!f) return;
      out += P.g(P.at(cx || 0, cy || 0), P.scatter(rnd, b[1], rx, ry, function (x, y, i, q) { return f(P, q, x, y, o); }));
    });
    return out;
  }
  // bits along a ribbon (swoosh, smear, tear), from t0 to t1 of the way along
  function bitsAlong(P, rnd, o, pts, ws, t0, t1) {
    var out = '', m = pts.length;
    (o.bits || []).forEach(function (b) {
      var f = BITS[b[0]]; if (!f) return;
      var list = [];
      for (var k = 0; k < b[1]; k++) {
        var i = Math.min(m - 1, Math.round((t0 + (t1 - t0) * rnd()) * (m - 1))), nm = normal(pts, i), s = (rnd() * 2 - 1) * ws[i] * 0.65;
        list.push([pts[i][0] + nm[0] * s, pts[i][1] + nm[1] * s]);
      }
      list.sort(function (a, c) { return a[1] - c[1]; }).forEach(function (p) { out += f(P, rnd, p[0], p[1], o); });
    });
    return out;
  }

  /* ---------- the shapes ---------- */
  // a pool: round (rx only) or oval (rx and ry), a lighter top and a shine
  function pool(o) {
    o = opt(o, '#8A5A34');
    return function (P, rnd) {
      var c = o.c, rx = o.rx || 28, ry = o.ry || rx * 0.94, d = P.blob(rnd, rx, ry, 0.05, 12), out = '';
      out += P.path(d, c, P.shade(c, -0.22), 0.9);
      out += P.path(d, 'none', P.shade(c, -0.1), 2.4, { opacity: '0.5', transform: 'scale(0.95)' });
      out += P.path(P.blob(rnd, rx * 0.78, ry * 0.72, 0.07, 10, -rx * 0.05, -ry * 0.07), top(P, c), null, 0, { opacity: '0.55' });
      out += bits(P, rnd, o, rx * 0.78, ry * 0.74);
      out += P.hl(-rx * 0.36, -ry * 0.46, rx * 0.3, ry * 0.08, '#FFFFFF', 0.45, -22) + P.hl(rx * 0.36, ry * 0.4, rx * 0.07, ry * 0.045, '#FFFFFF', 0.35, -22);
      return out;
    };
  }
  function ovalPool(o) { o = opt(o, '#C9862E'); o.rx = o.rx || 38; o.ry = o.ry || 24; return pool(o); }
  // a swoosh: a fat round start drawn out with the back of a spoon to a fine point
  function swoosh(o) {
    o = opt(o, '#A8476B');
    return function (P, rnd) {
      var c = o.c, k = 18, pts = curve([-42, 8], [-2, -17], [48, 2], k), ws = pts.map(function (p, i) { var t = i / k; return 0.4 + 8.6 * Math.pow(1 - t, 1.05); }), d = ribbon(P, pts, ws);
      var out = P.path(d, c, P.shade(c, -0.24), 0.9);
      out += P.path(ribbon(P, pts.slice(0, 13), ws.slice(0, 13).map(function (w) { return w * 0.55; })), top(P, c, 0.1), null, 0, { opacity: '0.5' });
      out += bitsAlong(P, rnd, o, pts, ws, 0.02, 0.7);
      out += P.path(offsetLine(P, pts, ws, -0.5, 1, 10), 'none', '#FFFFFF', 1.6, { opacity: '0.4', 'stroke-linecap': 'round' });
      return out;
    };
  }
  // a brush stroke: an even band that breaks up into dry bristle streaks at the end
  function brush(o) {
    o = opt(o, '#C99A22');
    return function (P, rnd) {
      var c = o.c, k = 16, pts = curve([-46, 3], [-6, -6], [26, 0], k), ws = pts.map(function (p, i) { return 9.5 + (rnd() - 0.5) * 1.6 - (i === 0 ? 1 : 0); });
      var parts = [ribbon(P, pts, ws)], end = pts[k];
      for (var b = 0; b < 6; b++) {
        var y0 = end[1] - 8 + b * 3.2 + (rnd() - 0.5), len = 8 + rnd() * 18, bw = 0.9 + rnd() * 0.9, bp = [[end[0] - 6, y0], [end[0] + len * 0.5, y0 - 0.6 + rnd()], [end[0] + len, y0 + (rnd() - 0.5) * 1.5]];
        parts.push(ribbon(P, bp, [bw, bw * 0.8, 0.15]));
      }
      var out = solid(P, parts, c, P.shade(c, -0.24), 0.5);
      for (var s = 0; s < 4; s++) {
        var yy = -6 + s * 4 + rnd() * 1.5, x0 = -30 + rnd() * 20;
        out += P.path('M' + P.n(x0) + ' ' + P.n(yy) + ' Q' + P.n(x0 + 25) + ' ' + P.n(yy - 1.5) + ' ' + P.n(x0 + 50 + rnd() * 10) + ' ' + P.n(yy - 0.5), 'none', P.shade(c, lum(c) > 0.82 ? -0.06 : 0.18), 0.8, { opacity: '0.6', 'stroke-linecap': 'round' });
      }
      out += bitsAlong(P, rnd, o, pts, ws, 0.05, 0.95);
      out += P.path(offsetLine(P, pts, ws, -0.6, 1, 12), 'none', '#FFFFFF', 1.2, { opacity: '0.3', 'stroke-linecap': 'round' });
      return out;
    };
  }
  // dots in a row, the same size (or getting smaller with o.grade)
  function dots(o) {
    o = opt(o, '#5E8C3A');
    return function (P, rnd) {
      var k = o.k || 7, r = o.r || 3.6, gap = o.gap || 11, out = '';
      for (var i = 0; i < k; i++) { var rr = o.grade ? r * (1 - 0.55 * i / (k - 1)) : r * (0.92 + rnd() * 0.16); out += dot(P, (i - (k - 1) / 2) * gap, (rnd() - 0.5) * 0.8, rr, o.c); }
      return out;
    };
  }
  // dots along an arc, large to small
  function arcDots(o) {
    o = opt(o, '#E8A23A');
    return function (P) {
      var k = o.k || 9;
      return P.fan(k, 46, 110, function (x, y, a, i) { return dot(P, x, y - 10, 5 - 3.2 * i / (k - 1), o.c); });
    };
  }
  function scatterDots(o) {
    o = opt(o, '#C0392B');
    return function (P, rnd) {
      return P.scatter(rnd, o.k || 12, 32, 22, function (x, y, i, q) { return dot(P, x, y, 1.6 + q() * 3.2, o.c); }, 9);
    };
  }
  // a zigzag drizzle from a squeeze bottle
  function drizzle(o) {
    o = opt(o, '#8A5A2A');
    return function (P, rnd) {
      var pts = [];
      for (var i = 0; i < 9; i++) pts.push([-40 + i * 10 + (rnd() - 0.5) * 3 + (i % 2 ? 6 : -6), (i % 2 ? 1 : -1) * (18 + rnd() * 4)]);
      var d = 'M' + pts.map(function (p) { return P.n(p[0]) + ' ' + P.n(p[1]); }).join(' L');
      return piped(P, d, o.c, o.sw || 2.6) + bits(P, rnd, o, 30, 20);
    };
  }
  // a dressing: loose glossy strands and drops, as when it is spooned over leaves
  function dressing(o) {
    o = opt(o, '#C9A33A');
    return function (P, rnd) {
      var c = o.c, out = '';
      for (var s = 0; s < 3; s++) {
        var y0 = -14 + s * 13, pts = [];
        for (var i = 0; i < 6; i++) pts.push([-38 + i * 15 + (rnd() - 0.5) * 6, y0 + (rnd() - 0.5) * 14]);
        var d = P.smooth(pts, true), w = 1.6 + rnd() * 1.4;
        out += P.path(d, 'none', P.shade(c, -0.25), w + 0.9, { 'stroke-linecap': 'round', opacity: '0.9' }) + P.path(d, 'none', c, w, { 'stroke-linecap': 'round', opacity: '0.9' }) + P.path(d, 'none', '#FFFFFF', 0.6, { opacity: '0.45', 'stroke-linecap': 'round', transform: 'translate(-0.3 -0.5)' });
      }
      out += P.scatter(rnd, 12, 40, 26, function (x, y, i, q) { var r = 0.9 + q() * 1.8; return P.circle(x, y, r, c, P.shade(c, -0.25), 0.4, { opacity: '0.9' }) + P.circle(x - r * 0.35, y - r * 0.35, r * 0.35, '#FFFFFF', null, 0, { opacity: '0.6' }); });
      return out + bits(P, rnd, o, 36, 22);
    };
  }
  // a jus: a thin glossy pool, a few beads of fat on it
  function jus(o) {
    o = opt(o, C.jus);
    return function (P, rnd) {
      var c = o.c, rx = o.rx || 30, ry = o.ry || 23, d = P.blob(rnd, rx, ry, 0.13, 12), out = '';
      out += P.path(d, c, P.shade(c, -0.3), 0.8, { 'fill-opacity': '0.94' });
      out += P.path(P.blob(rnd, rx * 0.66, ry * 0.56, 0.16, 10, -rx * 0.1, -ry * 0.14), top(P, c, 0.16), null, 0, { opacity: '0.45' });
      out += bits(P, rnd, o, rx * 0.74, ry * 0.68);
      out += P.scatter(rnd, o.beads === undefined ? 10 : o.beads, rx * 0.74, ry * 0.68, function (x, y, i, q) {
        var r = 0.7 + q() * 2.2;
        return P.circle(x, y, r, P.mix(c, '#E8B04A', 0.55), P.mix(c, '#F2D27A', 0.5), 0.4, { opacity: '0.8' }) + (r > 1.5 ? P.circle(x - r * 0.3, y - r * 0.3, r * 0.3, '#FFFFFF', null, 0, { opacity: '0.6' }) : '');
      });
      out += P.hl(-rx * 0.3, -ry * 0.42, rx * 0.34, ry * 0.08, '#FFFFFF', 0.4, -18);
      return out;
    };
  }
  // a cream sauce, ladled: thick, so the edge stands up round a smooth top
  function cream(o) {
    o = opt(o, C.cream);
    return function (P, rnd) {
      var c = o.c, rx = o.rx || 34, ry = o.ry || 30, d = P.blob(rnd, rx, ry, 0.06, 12), out = '';
      out += P.path(d, P.shade(c, -0.09), P.shade(c, -0.26), 1.1);
      out += P.path(P.blob(rnd, rx * 0.86, ry * 0.84, 0.05, 12, -1, -1.4), c, null, 0);
      out += P.path('M' + P.n(-rx * 0.5) + ' ' + P.n(ry * 0.25) + ' Q' + P.n(-rx * 0.1) + ' ' + P.n(ry * 0.45) + ' ' + P.n(rx * 0.4) + ' ' + P.n(ry * 0.2), 'none', P.shade(c, -0.1), 1.1, { opacity: '0.7', 'stroke-linecap': 'round' });
      out += P.path('M' + P.n(-rx * 0.2) + ' ' + P.n(-ry * 0.05) + ' Q' + P.n(rx * 0.15) + ' ' + P.n(ry * 0.08) + ' ' + P.n(rx * 0.45) + ' ' + P.n(-ry * 0.12), 'none', P.shade(c, -0.08), 0.9, { opacity: '0.6', 'stroke-linecap': 'round' });
      out += bits(P, rnd, o, rx * 0.74, ry * 0.7);
      out += P.hl(-rx * 0.34, -ry * 0.44, rx * 0.3, ry * 0.08, '#FFFFFF', 0.6, -22) + P.hl(rx * 0.2, -ry * 0.55, rx * 0.06, ry * 0.04, '#FFFFFF', 0.5);
      return out;
    };
  }
  // herb oil: beads of oil, bigger in the middle
  function herbOil(o) {
    o = opt(o, '#5E8C3A');
    return function (P, rnd) {
      var c = o.c, out = '';
      P.spots(rnd, o.k || 18, 26, 18, 5).forEach(function (p) {
        var f = 1 - Math.min(1, Math.hypot(p[0] / 26, p[1] / 18)), r = 1 + 3.4 * f * (0.5 + rnd() * 0.5);
        out += P.circle(p[0], p[1], r, c, P.shade(c, -0.28), 0.5, { 'fill-opacity': '0.9' }) + P.circle(p[0] - r * 0.32, p[1] - r * 0.35, r * 0.3, '#FFFFFF', null, 0, { opacity: '0.65' });
      });
      return out + bits(P, rnd, o, 22, 14);
    };
  }
  // a purée smear: a spoonful swiped across, a groove down the middle and raised edges
  function smear(o) {
    o = opt(o, '#E8964A');
    return function (P, rnd) {
      var c = o.c, k = 16, pts = curve([-36, 4], [0, -6], [44, 0], k), ws = pts.map(function (p, i) { var t = i / k; return 11.5 * (t < 0.5 ? 1 - t * 0.12 : 0.94 - Math.pow((t - 0.5) / 0.5, 1.3) * 0.84); });
      var out = P.path(ribbon(P, pts, ws), c, P.shade(c, -0.24), 0.9);
      out += P.path(offsetLine(P, pts, ws, -0.62, 1, 13), 'none', P.shade(c, -0.12), 2.2, { opacity: '0.7', 'stroke-linecap': 'round' });
      out += P.path(offsetLine(P, pts, ws, 0.62, 1, 13), 'none', P.shade(c, -0.14), 2.2, { opacity: '0.7', 'stroke-linecap': 'round' });
      out += P.path(ribbon(P, pts.slice(1, 14), ws.slice(1, 14).map(function (w) { return w * 0.42; })), lum(c) > 0.82 ? P.shade(c, -0.05) : P.mix(c, '#FFFFFF', 0.3), null, 0, { opacity: '0.85' });
      out += P.path(offsetLine(P, pts, ws, -0.86, 0, 11), 'none', '#FFFFFF', 1, { opacity: '0.55', 'stroke-linecap': 'round' });
      out += bitsAlong(P, rnd, o, pts, ws, 0, 0.75);
      out += P.hl(pts[1][0] - 3, pts[1][1] - ws[1] * 0.5, 5, 1.6, '#FFFFFF', 0.45, -20);
      return out;
    };
  }
  // a dollop off a spoon, with its little curl on top
  function dollop(o) {
    o = opt(o, '#F6EED6');
    return function (P, rnd) {
      var c = o.c, r = o.r || 14, d = P.blob(rnd, r, r * 0.92, 0.08, 10), out = P.shadow(d, 1.5, 2);
      out += P.path(d, c, P.shade(c, -0.24), 1);
      out += P.path(P.blob(rnd, r * 0.68, r * 0.6, 0.1, 9, -r * 0.12, -r * 0.14), top(P, c, 0.14), null, 0, { opacity: '0.75' });
      out += P.path('M' + P.n(r * 0.5) + ' ' + P.n(r * 0.25) + ' Q' + P.n(r * 0.35) + ' ' + P.n(-r * 0.5) + ' ' + P.n(-r * 0.2) + ' ' + P.n(-r * 0.32) + ' Q' + P.n(-r * 0.52) + ' ' + P.n(-r * 0.1) + ' ' + P.n(-r * 0.22) + ' ' + P.n(r * 0.12), 'none', P.shade(c, -0.17), 1, { opacity: '0.8', 'stroke-linecap': 'round' });
      out += bits(P, rnd, o, r * 0.72, r * 0.64);
      out += P.hl(-r * 0.32, -r * 0.42, r * 0.3, r * 0.13, '#FFFFFF', 0.6, -20);
      return out;
    };
  }
  // a quenelle of purée: three faces shaped between two spoons
  function quenelle(o) {
    o = opt(o, '#EDE6D2');
    return function (P, rnd) {
      var c = o.c, d = 'M-22 1 C-19 -9 -6 -12.5 3 -12 C14 -11.5 21 -6 22 -1 C20 7 10 12 -1 12 C-12 12 -21 8 -22 1 Z', out = '';
      out += P.shadow(d, 1.5, 2.5) + P.path(d, c, P.shade(c, -0.24), 1);
      out += P.path('M-19.5 3 C-8 1.8 8 1.2 20.5 0.4 C17 7 9 10.6 -1 10.6 C-10 10.6 -17 7.6 -19.5 3 Z', P.shade(c, -0.12), null, 0, { opacity: '0.75' });
      out += P.path('M-20 0 C-16 -8 -5 -10.6 3 -10.2 C12 -9.8 18 -5.2 20.4 -1.6 C10 -4.6 -6 -4.2 -20 0 Z', top(P, c, 0.18), null, 0, { opacity: '0.8' });
      out += bits(P, rnd, o, 14, 7);
      out += P.hl(-3, -7.4, 8, 1.5, '#FFFFFF', 0.6, -3);
      return P.g(P.at(0, 0, -8), out);
    };
  }
  // gravy poured over the top: a pool that runs off the sides in drips
  function pour(o) {
    o = opt(o, C.gravy);
    return function (P, rnd) {
      var c = o.c, R = o.r || 26, ds = [P.blob(rnd, R, R * 0.86, 0.12, 14)], drops = [], k = 5, a0 = rnd() * Math.PI * 2;
      for (var i = 0; i < k; i++) {
        var a = a0 + i / k * Math.PI * 2 + (rnd() - 0.5) * 0.7, ext = 5 + rnd() * 13, cs = Math.cos(a), sn = Math.sin(a);
        var p0 = [cs * R * 0.7, sn * R * 0.6], p2 = [cs * (R + ext), sn * (R * 0.86 + ext)], bend = (rnd() - 0.5) * 5, p1 = [(p0[0] + p2[0]) / 2 - sn * bend, (p0[1] + p2[1]) / 2 + cs * bend];
        ds.push(ribbon(P, curve(p0, p1, p2, 5), [9, 6.5, 4.4, 3.2, 2.9, 3.6 + rnd()]));
        drops.push(p2);
      }
      var out = solid(P, ds, c, P.shade(c, -0.26), 0.9);
      out += P.path(P.blob(rnd, R * 0.7, R * 0.56, 0.12, 10, -R * 0.08, -R * 0.12), top(P, c, 0.14), null, 0, { opacity: '0.5' });
      out += bits(P, rnd, o, R * 0.7, R * 0.6);
      drops.forEach(function (p) { out += P.circle(p[0] - 1, p[1] - 1, 1, '#FFFFFF', null, 0, { opacity: '0.5' }); });
      out += P.hl(-R * 0.32, -R * 0.42, R * 0.32, R * 0.08, '#FFFFFF', 0.45, -20);
      return out;
    };
  }
  // a glaze splash: a splat with spikes and flung drops
  function splash(o) {
    o = opt(o, '#C99A22');
    return function (P, rnd) {
      var c = o.c, R = 14, ds = [P.blob(rnd, R, R * 0.9, 0.18, 10)], drops = '', k = 9, a0 = rnd() * Math.PI;
      for (var i = 0; i < k; i++) {
        var a = a0 + i / k * Math.PI * 2 + (rnd() - 0.5) * 0.4, len = R * (1.35 + rnd() * 0.9), cs = Math.cos(a), sn = Math.sin(a);
        ds.push(ribbon(P, [[cs * R * 0.5, sn * R * 0.5], [cs * (R + len) / 2, sn * (R + len) / 2], [cs * len, sn * len]], [4.2, 2.2, 0.2]));
        if (rnd() < 0.75) { var dd = len + 3 + rnd() * 5, rr = 0.8 + rnd() * 1.8; drops += P.circle(cs * dd, sn * dd, rr, c, P.shade(c, -0.26), 0.5); }
      }
      var out = solid(P, ds, c, P.shade(c, -0.26), 0.6) + drops;
      out += P.path(P.blob(rnd, R * 0.6, R * 0.5, 0.15, 8, -2, -2), top(P, c, 0.14), null, 0, { opacity: '0.5' });
      return out + P.hl(-R * 0.35, -R * 0.4, R * 0.36, R * 0.12, '#FFFFFF', 0.5, -25);
    };
  }
  // a wave: a sauce line that swings side to side, thin at both ends
  function wave(o) {
    o = opt(o, '#E8A23A');
    return function (P, rnd) {
      var c = o.c, k = 30, pts = [], ws = [];
      for (var i = 0; i <= k; i++) { var t = i / k, x = -44 + 88 * t; pts.push([x, 7 * Math.sin(t * Math.PI * 4.5)]); ws.push(0.4 + 2.4 * Math.pow(Math.sin(Math.PI * t), 0.5)); }
      var out = solid(P, [ribbon(P, pts, ws)], c, P.shade(c, -0.26), 0.5);
      out += bitsAlong(P, rnd, o, pts, ws, 0.1, 0.9);
      out += P.path(offsetLine(P, pts, ws, -0.4, 3, k - 3), 'none', '#FFFFFF', 0.7, { opacity: '0.45', 'stroke-linecap': 'round' });
      return out;
    };
  }
  // a ramekin from above: the white rim, its inside wall and the sauce
  function ramekin(o) {
    o = opt(o, '#7E4726');
    return function (P, rnd) {
      var c = o.c, R = o.r || 22, s = R * 0.76, out = P.circle(2, 2.5, R, '#000000', null, 0, { opacity: '0.12' });
      out += P.circle(0, 0, R, '#FFFFFF', '#CFC9BE', 1.2) + P.circle(0, 0, R * 0.86, '#EFEBE4', '#DDD7CC', 0.8);
      out += P.circle(0, 0.8, s, c, P.shade(c, -0.25), 0.8);
      out += P.path('M' + P.n(-s) + ' 0.8 A' + P.n(s) + ' ' + P.n(s) + ' 0 0 1 ' + P.n(s) + ' 0.8', 'none', '#000000', 1.6, { opacity: '0.1' });
      out += bits(P, rnd, o, s * 0.78, s * 0.74, 0, 1);
      out += P.hl(-s * 0.35, -s * 0.3, s * 0.32, s * 0.1, '#FFFFFF', 0.45, -30);
      out += P.path('M' + P.n(-R * 0.68) + ' ' + P.n(-R * 0.68) + ' A' + P.n(R * 0.96) + ' ' + P.n(R * 0.96) + ' 0 0 1 ' + P.n(R * 0.2) + ' ' + P.n(-R * 0.94), 'none', '#FFFFFF', 1.4, { opacity: '0.9', 'stroke-linecap': 'round' });
      return out;
    };
  }
  // a small plastic takeaway tub: a lip, a clear wall the sauce shows through
  function tub(o) {
    o = opt(o, '#F6EED6');
    return function (P, rnd) {
      var c = o.c, R = o.r || 20, out = P.circle(1.5, 2, R, '#000000', null, 0, { opacity: '0.1' });
      out += P.circle(0, 0, R, '#F7F8F9', '#B4BCC4', 1) + P.circle(0, 0, R * 0.9, 'none', '#D0D6DB', 0.8);
      for (var i = 0; i < 24; i++) { var a = i / 24 * Math.PI * 2; out += P.line(Math.cos(a) * R * 0.91, Math.sin(a) * R * 0.91, Math.cos(a) * R * 0.98, Math.sin(a) * R * 0.98, '#D0D6DB', 0.5); }
      out += P.circle(0, 0, R * 0.84, P.mix(c, '#FFFFFF', 0.55), '#C3CAD0', 0.6);
      out += P.circle(0, 0.8, R * 0.72, c, P.shade(c, -0.25), 0.7);
      out += bits(P, rnd, o, R * 0.55, R * 0.52, 0, 1);
      out += P.hl(-R * 0.25, -R * 0.28, R * 0.26, R * 0.09, '#FFFFFF', 0.45, -30);
      out += P.path('M' + P.n(-R * 0.66) + ' ' + P.n(-R * 0.6) + ' A' + P.n(R * 0.9) + ' ' + P.n(R * 0.9) + ' 0 0 1 ' + P.n(R * 0.1) + ' ' + P.n(-R * 0.9), 'none', '#FFFFFF', 1.6, { opacity: '0.95', 'stroke-linecap': 'round' });
      return out;
    };
  }
  // a gravy boat from above, filled, spout to the right and the handle on the left
  function boat(o) {
    o = opt(o, C.gravy);
    return function (P, rnd) {
      var c = o.c, d = 'M-44 -18 Q-10 -30 28 -21 Q48 -15 60 0 Q48 15 28 21 Q-10 30 -44 18 Q-54 0 -44 -18 Z', out = '';
      out += P.path('M-46 -8 Q-63 -11 -63 0 Q-63 11 -46 8', 'none', '#CFC9BE', 5.2, { 'stroke-linecap': 'round' }) + P.path('M-46 -8 Q-63 -11 -63 0 Q-63 11 -46 8', 'none', '#FFFFFF', 3, { 'stroke-linecap': 'round' });
      out += P.shadow(d) + P.path(d, '#FFFFFF', '#CFC9BE', 1.3);
      var w = 'M-38 -12 Q-8 -22 25 -14 Q40 -9 50 0 Q40 9 25 14 Q-8 22 -38 12 Q-46 0 -38 -12 Z';
      out += P.path(w, c, P.shade(c, -0.25), 0.9);
      out += P.path('M-36 -10 Q-8 -19 24 -12', 'none', '#000000', 1.6, { opacity: '0.1', 'stroke-linecap': 'round' });
      out += bits(P, rnd, o, 30, 10, -4, 0);
      out += P.hl(-12, -8, 16, 2.4, '#FFFFFF', 0.45, -6);
      out += P.path('M-40 -20 Q-10 -29 22 -22', 'none', '#FFFFFF', 1.4, { opacity: '0.9', 'stroke-linecap': 'round' });
      return out;
    };
  }
  // broth poured round the food: a wide, clear pool with beads of fat
  function broth(o) {
    o = opt(o, '#C99A4A');
    return function (P, rnd) {
      var c = o.c, rx = 66, ry = 58, d = P.blob(rnd, rx, ry, 0.03, 14), out = '';
      out += P.path(d, c, P.shade(c, -0.2), 1, { 'fill-opacity': '0.8' });
      out += P.path(d, 'none', P.shade(c, -0.1), 4, { opacity: '0.35', transform: 'scale(0.96)' });
      out += P.path(P.blob(rnd, rx * 0.72, ry * 0.7, 0.05, 12), top(P, c, 0.12), null, 0, { opacity: '0.35' });
      out += bits(P, rnd, o, rx * 0.86, ry * 0.84);
      out += P.scatter(rnd, o.beads || 18, rx * 0.86, ry * 0.84, function (x, y, i, q) { var r = 1 + q() * 2.8; return P.circle(x, y, r, P.mix(c, '#F2C04A', 0.5), P.mix(c, '#F2D27A', 0.4), 0.4, { opacity: '0.75' }) + P.circle(x - r * 0.3, y - r * 0.3, r * 0.3, '#FFFFFF', null, 0, { opacity: '0.5' }); }, 12);
      out += P.path('M' + P.n(-rx * 0.62) + ' ' + P.n(-ry * 0.5) + ' Q' + P.n(-rx * 0.2) + ' ' + P.n(-ry * 0.82) + ' ' + P.n(rx * 0.3) + ' ' + P.n(-ry * 0.72), 'none', '#FFFFFF', 2, { opacity: '0.35', 'stroke-linecap': 'round' });
      return out;
    };
  }
  // a foam: a light cluster of bubbles
  function foam(o) {
    o = opt(o, '#F3EEDF');
    return function (P, rnd) {
      var c = o.c, d = P.blob(rnd, 18, 13, 0.15, 10), out = P.shadow(d, 1, 1.5);
      out += P.path(d, P.shade(c, -0.05), P.shade(c, -0.18), 0.6);
      P.spots(rnd, 36, 17, 12, 2.5).forEach(function (p) {
        var r = 1.1 + rnd() * 2.6;
        out += P.circle(p[0], p[1], r, c, P.shade(c, -0.16), 0.5) + P.circle(p[0] - r * 0.35, p[1] - r * 0.35, r * 0.28, '#FFFFFF', null, 0, { opacity: '0.85' });
      });
      return out;
    };
  }
  // gel dots: firm glossy domes of different sizes
  function gel(o) {
    o = opt(o, '#E8A23A');
    return function (P, rnd) {
      var c = o.c, out = '';
      P.spots(rnd, o.k || 7, 22, 14, 10).forEach(function (p) {
        var x = p[0], y = p[1], r = 2.6 + rnd() * 2.8;
        out += P.circle(x + 0.8, y + 1.1, r, '#000000', null, 0, { opacity: '0.14' }) + P.circle(x, y, r, c, P.shade(c, -0.3), 0.7);
        out += P.circle(x + r * 0.12, y + r * 0.16, r * 0.8, P.shade(c, -0.12), null, 0, { opacity: '0.5' }) + P.circle(x - r * 0.1, y - r * 0.12, r * 0.62, top(P, c, 0.1), null, 0, { opacity: '0.8' });
        out += P.hl(x - r * 0.34, y - r * 0.4, r * 0.3, r * 0.18, '#FFFFFF', 0.85, -30);
      });
      return out;
    };
  }
  // a tight zigzag of mayo from a squeeze bottle
  function zigzag(o) {
    o = opt(o, '#F6EED6');
    return function (P, rnd) {
      var pts = [];
      for (var i = 0; i < 10; i++) { var y = -18 + i * 4; pts.push([(i % 2 ? 1 : -1) * (29 + rnd() * 3) + y * 0.25, y + (rnd() - 0.5)]); }
      return piped(P, P.smooth(pts, true), o.c, o.sw || 2);
    };
  }
  // a spoon tear: a drop pulled out to a tail with the tip of a spoon
  function tear(o) {
    o = opt(o, '#A8476B');
    return function (P, rnd) {
      var c = o.c, k = 14, pts = curve([-22, 0], [2, -4], [30, 3], k), ws = pts.map(function (p, i) { var t = i / k; return 0.2 + 7.6 * Math.pow(1 - t, 1.5); });
      var out = P.path(ribbon(P, pts, ws), c, P.shade(c, -0.25), 0.9);
      out += P.path(P.blob(rnd, 4.4, 3.4, 0.1, 8, -21, -0.8), top(P, c, 0.14), null, 0, { opacity: '0.6' });
      out += bitsAlong(P, rnd, o, pts, ws, 0, 0.4);
      out += P.hl(-23, -3.4, 3.2, 1.4, '#FFFFFF', 0.6, -20) + P.path(offsetLine(P, pts, ws, -0.45, 3, 9), 'none', '#FFFFFF', 0.8, { opacity: '0.4', 'stroke-linecap': 'round' });
      return out;
    };
  }
  // a split dressing: oil with beads of darker vinegar sitting in it
  function split(o) {
    o = opt(o, '#D9B84A');
    var c2 = o.c2 || '#3A1E1A';
    return function (P, rnd) {
      var c = o.c, d = P.blob(rnd, 28, 22, 0.1, 12), out = P.path(d, c, P.shade(c, -0.25), 0.8, { 'fill-opacity': '0.88' });
      out += P.path(P.blob(rnd, 18, 13, 0.15, 9, -3, -3), P.shade(c, 0.15), null, 0, { opacity: '0.4' });
      out += P.scatter(rnd, 8, 20, 15, function (x, y, i, q) { var r = 1.4 + q() * 3.4; return P.circle(x, y, r, c2, P.shade(c2, -0.3), 0.5) + P.circle(x - r * 0.3, y - r * 0.35, r * 0.3, '#FFFFFF', null, 0, { opacity: '0.55' }); }, 7);
      return out + bits(P, rnd, o, 20, 15) + P.hl(-9, -12, 9, 2, '#FFFFFF', 0.45, -15);
    };
  }
  // a dip in a small bowl, swirled with the back of a spoon, oil in the groove and a dusting on top
  function dipBowl(o) {
    o = opt(o, '#E3C99A');
    return function (P, rnd) {
      var c = o.c, R = 38, s = R * 0.8, out = P.circle(2.5, 3.5, R, '#000000', null, 0, { opacity: '0.12' });
      out += P.circle(0, 0, R, '#FFFFFF', '#CFC9BE', 1.4) + P.circle(0, 0, R * 0.88, '#EFEBE4', '#DDD7CC', 0.8);
      out += P.path(P.blob(rnd, s, s, 0.025, 12), c, P.shade(c, -0.2), 0.9);
      var sp = [];
      for (var i = 0; i <= 28; i++) { var t = i / 28, a = t * Math.PI * 3.2, r = 3 + t * s * 0.66; sp.push([Math.cos(a) * r, Math.sin(a) * r]); }
      var d = P.smooth(sp, true);
      out += P.path(d, 'none', P.shade(c, -0.14), 4, { 'stroke-linecap': 'round' });
      out += P.path(d, 'none', o.oil || '#B9A23A', 2.2, { opacity: '0.8', 'stroke-linecap': 'round', 'stroke-dasharray': '22 9' });
      out += P.path(d, 'none', lum(c) > 0.82 ? '#FFFFFF' : P.shade(c, 0.22), 1.1, { 'stroke-linecap': 'round', transform: 'translate(-1.6 -1.6)', opacity: '0.85' });
      out += P.circle(0, 0, 4, o.oil || '#B9A23A', P.shade(o.oil || '#B9A23A', -0.2), 0.5, { opacity: '0.85' });
      out += bits(P, rnd, o, s * 0.7, s * 0.7);
      out += P.path('M' + P.n(-R * 0.68) + ' ' + P.n(-R * 0.68) + ' A' + P.n(R * 0.96) + ' ' + P.n(R * 0.96) + ' 0 0 1 ' + P.n(R * 0.2) + ' ' + P.n(-R * 0.94), 'none', '#FFFFFF', 1.6, { opacity: '0.9', 'stroke-linecap': 'round' });
      return out;
    };
  }
  /* dessert plates */
  // a spiral from a squeeze bottle
  function spiral(o) {
    o = opt(o, '#C99A22');
    return function (P) {
      var pts = [];
      for (var i = 0; i <= 44; i++) { var t = i / 44, a = t * Math.PI * 5, r = 3 + t * 24; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
      return piped(P, P.smooth(pts, true), o.c, o.sw || 2.3);
    };
  }
  // streaks flicked across the plate from a spoon, thin at both ends, a few flung drops
  function streaks(o) {
    o = opt(o, C.chocolate);
    return function (P, rnd) {
      var c = o.c, ds = [], drops = '';
      for (var s = 0; s < 5; s++) {
        var y0 = -20 + s * 10 + (rnd() - 0.5) * 3, x0 = (rnd() - 0.5) * 12, len = 70 + rnd() * 22, mw = 1.2 + rnd() * 1.6, pts = curve([x0 - len / 2, y0 + 12], [x0, y0 - 3 + (rnd() - 0.5) * 6], [x0 + len / 2, y0 - 10], 12);
        ds.push(ribbon(P, pts, pts.map(function (p, i) { return 0.15 + mw * Math.pow(Math.sin(Math.PI * i / 12), 0.6); })));
        if (rnd() < 0.6) drops += P.circle(x0 + len / 2 + 3 + rnd() * 4, y0 - 12 - rnd() * 2, 0.7 + rnd() * 0.9, c);
      }
      return solid(P, ds, c, P.shade(c, -0.25), 0.35) + drops + bits(P, rnd, o, 36, 18);
    };
  }
  // a heart shape pointing along the drag (angle a in degrees)
  function heart(P, x, y, s, a, c) {
    return P.g(P.at(x, y, a - 90, s), P.path('M0 4.5 C-2 3 -5 1 -5 -1.5 C-5 -4 -2.2 -4.6 0 -2.2 C2.2 -4.6 5 -4 5 -1.5 C5 1 2 3 0 4.5 Z', c, P.shade(c, -0.25), 0.6 / s) + P.hl(-2.4, -2, 1.4, 0.8, '#FFFFFF', 0.5, -30));
  }
  // dots of sauce dragged through with a skewer into a row of hearts
  function hearts(o) {
    o = opt(o, '#C02A4A');
    return function (P) {
      var c = o.c, k = o.k || 6, R = 80, spread = 58, out = '', pts = [];
      P.fan(k + 2, R, spread * (k + 1) / (k - 1), function (x, y) { pts.push([x, y - 6]); });
      out += P.path(P.smooth(pts, true), 'none', c, 0.9, { 'stroke-linecap': 'round' });
      P.fan(k, R, spread, function (x, y, a) { out += heart(P, x, y - 6, 1.25, a, c); });
      return out;
    };
  }
  // feathered: a pool of custard with a ring of coulis dots dragged into hearts
  function feathered(o) {
    o = opt(o, '#F2D27A');
    var c2 = o.c2 || '#C02A4A';
    return function (P, rnd) {
      var c = o.c, d = P.blob(rnd, 33, 31, 0.04, 12), out = P.path(d, c, P.shade(c, -0.22), 0.9);
      out += P.path(P.blob(rnd, 26, 24, 0.05, 10, -2, -2), top(P, c, 0.12), null, 0, { opacity: '0.5' });
      out += bits(P, rnd, o, 26, 24);
      out += P.circle(0, 0, 19, 'none', c2, 0.8);
      for (var i = 0; i < 8; i++) { var a = i / 8 * 360, r = a * Math.PI / 180; out += heart(P, Math.cos(r) * 19, Math.sin(r) * 19, 0.75, a + 90, c2); }
      return out + P.hl(-11, -18, 9, 2.2, '#FFFFFF', 0.45, -20);
    };
  }

  var SHAPES = { pool: pool, ovalPool: ovalPool, swoosh: swoosh, brush: brush, dots: dots, arcDots: arcDots, scatterDots: scatterDots, drizzle: drizzle, dressing: dressing, jus: jus, cream: cream, herbOil: herbOil, smear: smear, dollop: dollop, quenelle: quenelle, pour: pour, splash: splash, wave: wave, ramekin: ramekin, tub: tub, boat: boat, broth: broth, foam: foam, gel: gel, zigzag: zigzag, tear: tear, split: split, dipBowl: dipBowl, spiral: spiral, streaks: streaks, hearts: hearts, feathered: feathered };

  Object.keys(SHAPES).forEach(function (k) { SHAPES[k] = keep(SHAPES[k]); });

  /* ---------- the items ---------- */
  var items = [], byId = {};
  function side(s, h, c) { return { s: s, h: h, c: c }; }
  // a shape: its helper (fn), the options it is drawn with, and the item fields
  function shape(fn, o, it) { var f = SHAPES[fn](o); it.draw = f; it.side = it.side || side('sauce', 2, f.c); byId[it.id] = { fn: fn, o: o, it: it }; items.push(it); }
  // a named sauce on a shape: same helper and size, its own colour and bits
  function vary(base, id, name, sub, kw, o, x) {
    var b = byId[base], oo = Object.assign({}, b.o, typeof o === 'string' ? { c: o } : o), it = { id: id, name: name, sub: sub, kw: kw, form: b.it.form, role: b.it.role, of: base, w: b.it.w, h: b.it.h };
    if (b.it.g) it.g = b.it.g; if (b.it.n) it.n = b.it.n; if (b.it.cook) it.cook = b.it.cook;
    Object.assign(it, x || {});
    it.side = side(b.it.side.s, b.it.side.h, oo.c);
    it.draw = SHAPES[b.fn](oo);
    items.push(it);
  }
  var S = L.SAUCE;

  /* Shapes */
  shape('pool', {}, { id: 'sauce-pool', name: 'Sauce pool, round', sub: 'Shapes', kw: 'puddle round pool sauce under', form: 'pool', role: 'sauce', g: 50, w: 58, h: 56 });
  shape('ovalPool', {}, { id: 'sauce-pool-oval', name: 'Sauce pool, oval', sub: 'Shapes', kw: 'puddle oval pool long sauce under', form: 'pool', role: 'sauce', g: 60, w: 80, h: 50 });
  shape('swoosh', {}, { id: 'sauce-swoosh', name: 'Sauce swoosh', sub: 'Shapes', kw: 'swoosh swipe swish comma spoon drag', form: 'swoosh', role: 'sauce', g: 30, w: 100, h: 30 });
  shape('brush', {}, { id: 'sauce-brush-stroke', name: 'Brush stroke of sauce', sub: 'Shapes', kw: 'brush stroke paint swipe dry edge pastry brush', form: 'swoosh', role: 'sauce', g: 25, w: 100, h: 24 });
  shape('dots', {}, { id: 'sauce-dots-row', name: 'Sauce dots, a row', sub: 'Shapes', kw: 'dots dot line row squeeze bottle', form: 'dots', role: 'sauce', g: 10, w: 74, h: 8 });
  shape('arcDots', {}, { id: 'sauce-dots-arc', name: 'Sauce dots, an arc', sub: 'Shapes', kw: 'dots dot arc curve graded big small', form: 'dots', role: 'sauce', g: 10, w: 86, h: 30 });
  shape('scatterDots', {}, { id: 'sauce-dots-scattered', name: 'Sauce dots, scattered', sub: 'Shapes', kw: 'dots dot scattered random spots', form: 'dots', role: 'sauce', g: 12, w: 74, h: 52 });
  shape('drizzle', {}, { id: 'sauce-drizzle', name: 'Sauce drizzle, zigzag', sub: 'Shapes', kw: 'drizzle zigzag zig zag lines squeeze', form: 'drizzle', role: 'sauce', g: 20, w: 90, h: 50 });
  shape('dressing', {}, { id: 'sauce-dressing', name: 'Dressing drizzle', sub: 'Shapes', kw: 'dressing vinaigrette french dressing drizzle over salad leaves glossy oil', form: 'drizzle', role: 'topping', g: 20, w: 86, h: 58 });
  shape('jus', {}, { id: 'sauce-jus', name: 'Jus, glossy pool', sub: 'Shapes', kw: 'jus juice glossy thin pool reduction demi glace beef jus', form: 'pool', role: 'sauce', g: 40, w: 66, h: 52 });
  shape('cream', {}, { id: 'sauce-cream', name: 'Cream sauce, ladled', sub: 'Shapes', kw: 'cream sauce white sauce bechamel ladled thick creamy', form: 'pool', role: 'sauce', g: 80, w: 70, h: 62 });
  shape('herbOil', {}, { id: 'sauce-herb-oil', name: 'Herb oil', sub: 'Shapes', kw: 'herb oil green oil beads drops basil oil parsley oil', form: 'dots', role: 'sauce', g: 10, w: 56, h: 40, side: side('sauce', 1, '#5E8C3A') });
  shape('smear', {}, { id: 'sauce-puree-smear', name: 'Purée smear', sub: 'Shapes', kw: 'puree smear swipe spoon swipe sweet potato', form: 'smear', role: 'sauce', g: 40, w: 92, h: 34, side: side('sauce', 4, '#E8964A') });
  shape('dollop', {}, { id: 'sauce-dollop', name: 'Sauce dollop', sub: 'Shapes', kw: 'dollop spoonful blob mayo mayonnaise', form: 'dollop', role: 'sauce', g: 30, w: 30, h: 28, side: side('mound', 9, '#F6EED6') });
  shape('quenelle', {}, { id: 'sauce-puree-quenelle', name: 'Purée quenelle', sub: 'Shapes', kw: 'quenelle rocher puree two spoons celeriac parsnip', form: 'quenelle', role: 'sauce', g: 40, w: 44, h: 26, side: side('mound', 12, '#EDE6D2') });
  shape('pour', {}, { id: 'sauce-gravy-pour', name: 'Gravy pour', sub: 'Shapes', kw: 'gravy poured over the top runs drips brown gravy smothered', form: 'pool', role: 'topping', g: 80, w: 92, h: 82 });
  shape('splash', {}, { id: 'sauce-glaze-splash', name: 'Glaze splash', sub: 'Shapes', kw: 'splash splat splatter glaze honey glaze flick', form: 'smear', role: 'sauce', g: 20, w: 80, h: 74 });
  shape('wave', {}, { id: 'sauce-wave', name: 'Sauce wave', sub: 'Shapes', kw: 'wave squiggle wiggle line s line', form: 'line', role: 'sauce', g: 15, w: 92, h: 22 });
  shape('foam', {}, { id: 'sauce-foam', name: 'Sauce foam', sub: 'Shapes', kw: 'foam espuma air bubbles froth', form: 'cluster', role: 'sauce', g: 15, w: 40, h: 30, side: side('mound', 6, '#F3EEDF') });
  shape('gel', {}, { id: 'sauce-gel-dots', name: 'Gel dots', sub: 'Shapes', kw: 'gel dots fluid gel domes glossy beads', form: 'dots', role: 'sauce', g: 10, w: 54, h: 38, side: side('sauce', 3, '#E8A23A') });
  shape('zigzag', {}, { id: 'sauce-mayo-zigzag', name: 'Mayo zigzag', sub: 'Shapes', kw: 'zigzag zig zag mayo mayonnaise squeeze thin lines over the top', form: 'drizzle', role: 'topping', g: 15, w: 70, h: 38 });
  shape('tear', {}, { id: 'sauce-spoon-tear', name: 'Spoon tear', sub: 'Shapes', kw: 'tear drop teardrop comma spoon tear dragged dot', form: 'smear', role: 'sauce', g: 15, w: 60, h: 18 });
  shape('split', {}, { id: 'sauce-split-dressing', name: 'Split dressing', sub: 'Shapes', kw: 'split dressing oil and vinegar balsamic beads olive oil broken vinaigrette', form: 'pool', role: 'sauce', g: 30, w: 58, h: 46 });
  shape('broth', {}, { id: 'sauce-poured-broth', name: 'Poured broth', sub: 'Shapes', kw: 'broth stock poured around consomme soup bowl', form: 'pool', role: 'sauce', g: 250, w: 136, h: 120, side: side('sauce', 6, '#C99A4A') });

  /* Dips and sides */
  shape('ramekin', {}, { id: 'sauce-ramekin', name: 'Sauce in a ramekin', sub: 'Dips and sides', kw: 'ramekin pot side sauce on the side dish', form: 'bowlful', role: 'sidedish', g: 60, w: 46, h: 46, side: side('cup', 26, '#7E4726') });
  shape('tub', {}, { id: 'sauce-tub', name: 'Sauce tub', sub: 'Dips and sides', kw: 'tub takeaway container plastic pot dipping sauce side', form: 'bowlful', role: 'sidedish', g: 50, w: 42, h: 42, side: side('cup', 24, '#F6EED6') });
  shape('boat', {}, { id: 'sauce-gravy-boat', name: 'Gravy boat', sub: 'Dips and sides', kw: 'gravy boat jug sauce boat pourer roast', form: 'bowlful', role: 'sidedish', g: 150, w: 128, h: 62, side: side('cup', 40, C.gravy) });
  shape('dipBowl', {}, { id: 'sauce-dip-bowl', name: 'Swirled dip, small bowl', sub: 'Dips and sides', kw: 'dip bowl swirl hummus houmous oil paprika', form: 'bowlful', role: 'sidedish', g: 120, w: 80, h: 80, side: side('cup', 26, '#E3C99A') });

  /* Dessert shapes */
  shape('spiral', {}, { id: 'dsauce-spiral', name: 'Sauce spiral', sub: 'Dessert', kw: 'spiral swirl caramel squeeze dessert plate', form: 'drizzle', role: 'dsauce', g: 20, w: 58, h: 58, side: side('sauce', 1, '#C99A22') });
  shape('streaks', {}, { id: 'dsauce-streaks', name: 'Sauce streaks', sub: 'Dessert', kw: 'streaks flicked lines chocolate sauce thrown spoon', form: 'drizzle', role: 'dsauce', g: 20, w: 100, h: 50, side: side('sauce', 1, C.chocolate) });
  shape('hearts', {}, { id: 'dsauce-hearts', name: 'Dragged dots, hearts', sub: 'Dessert', kw: 'hearts dragged dots skewer coulis feathered line', form: 'dots', role: 'dsauce', g: 15, w: 96, h: 28, side: side('sauce', 1, '#C02A4A') });
  shape('feathered', {}, { id: 'dsauce-feathered', name: 'Feathered custard, coulis hearts', sub: 'Dessert', kw: 'feathered creme anglaise custard pool coulis hearts ring', form: 'pool', role: 'dsauce', g: 60, w: 68, h: 64, side: side('sauce', 2, '#F2D27A') });

  /* Savoury: the sauces by name */
  vary('sauce-pool', 'pepper-sauce-pool', 'Pepper sauce, pool', 'Savoury', 'pepper sauce peppercorn green peppercorn steak sauce', { c: S.pepper, bits: [['pepper', 46]] });
  vary('sauce-pool', 'mushroom-sauce-pool', 'Mushroom sauce, pool', 'Savoury', 'mushroom sauce creamy mushroom steak sauce', { c: S.mushroom, bits: [['mushroom', 7], ['pepper', 10]] });
  vary('sauce-pool', 'diane-sauce-pool', 'Diane sauce, pool', 'Savoury', 'diane sauce steak diane brandy', { c: S.diane, bits: [['herb', 16], ['mushroom', 3]] });
  vary('sauce-pool', 'bolognese-spoonful', 'Bolognese, spoonful', 'Savoury', 'bolognese bolognaise bolog spag bol ragu mince meat sauce', { c: S.bolognese, bits: [['mince', 46], ['herb', 6]] });
  vary('sauce-pool', 'curry-sauce-pool', 'Curry sauce, pool', 'Savoury', 'curry sauce chip shop curry gravy', { c: S.curry, bits: [['herb', 6]] });
  vary('sauce-pool', 'satay-sauce-pool', 'Satay sauce, pool', 'Savoury', 'satay peanut sauce sate', { c: S.satay, bits: [['peanut', 26], ['redoil', 4]] });
  vary('sauce-pool-oval', 'napoli-pool', 'Napoli, pool', 'Savoury', 'napoli napolitana tomato sauce passata pizza sauce marinara', { c: S.napoli, bits: [['basil', 4], ['herb', 10]] });
  vary('sauce-pool-oval', 'beurre-blanc-pool', 'Beurre blanc, pool', 'Savoury', 'beurre blanc butter sauce white wine fish sauce', { c: S['beurre blanc'], bits: [['chive', 14]] });
  vary('sauce-pool-oval', 'romesco-pool', 'Romesco, pool', 'Savoury', 'romesco capsicum almond sauce', { c: '#C2502E', bits: [['peanut', 12]] });
  vary('sauce-cream', 'garlic-cream', 'Garlic cream, ladled', 'Savoury', 'garlic cream garlic sauce creamy garlic', { c: S['garlic cream'], bits: [['herb', 18]] });
  vary('sauce-cream', 'bacon-sauce', 'Bacon sauce, ladled', 'Savoury', 'bacon sauce creamy bacon carbonara', { c: S.bacon, bits: [['bacon', 14], ['herb', 6]] });
  vary('sauce-cream', 'cheese-sauce', 'Cheese sauce, ladled', 'Savoury', 'cheese sauce mornay cheesy sauce', { c: '#F2CE6A', bits: [['pepper', 6]] });
  vary('sauce-jus', 'red-wine-jus', 'Red wine jus', 'Savoury', 'red wine jus bordelaise wine sauce reduction', { c: '#5A1A28' });
  vary('sauce-jus', 'chicken-jus', 'Chicken jus', 'Savoury', 'chicken jus roast chicken juices pan juices', { c: '#9A6A30' });
  vary('sauce-jus', 'brown-butter', 'Brown butter, spooned', 'Savoury', 'brown butter beurre noisette nut brown butter', { c: S['brown butter'], bits: [['brownbits', 24]], beads: 4 });
  vary('sauce-jus', 'chimichurri', 'Chimichurri', 'Savoury', 'chimichurri chimi churri argentinian herb sauce', { c: '#7A8A3A', bits: [['herb', 60], ['chilli', 10]], beads: 6 });
  vary('sauce-jus', 'salsa-verde', 'Salsa verde', 'Savoury', 'salsa verde green sauce herb sauce capers', { c: '#4F7F2F', bits: [['herb', 50], ['caper', 6]], beads: 6 });
  vary('sauce-herb-oil', 'chilli-oil', 'Chilli oil', 'Savoury', 'chilli oil chili oil chilli crisp lao gan ma la you', { c: S['chilli oil'], bits: [['chilli', 26], ['sesame', 6]] });
  vary('sauce-gravy-pour', 'hollandaise-poured', 'Hollandaise, poured', 'Savoury', 'hollandaise hollandaise eggs benedict benny', { c: S.hollandaise, bits: [['chive', 8]] });
  vary('sauce-gravy-pour', 'mushroom-gravy-poured', 'Mushroom gravy, poured', 'Savoury', 'mushroom gravy mushroom sauce poured over', { c: S.mushroom, bits: [['mushroom', 8]] });
  vary('sauce-gravy-pour', 'pepper-gravy-poured', 'Pepper gravy, poured', 'Savoury', 'pepper gravy peppercorn poured over', { c: S.pepper, bits: [['pepper', 40]] });
  vary('sauce-gravy-pour', 'queso-poured', 'Queso, poured', 'Savoury', 'queso cheese sauce nacho cheese poured', { c: S.queso, bits: [['jalapeno', 4], ['paprika', 12]] });
  vary('sauce-dollop', 'tartare-dollop', 'Tartare, dollop', 'Savoury', 'tartare tartar sauce fish sauce capers gherkin', { c: S.tartare, bits: [['caper', 16]] });
  vary('sauce-dollop', 'aioli-dollop', 'Aioli, dollop', 'Savoury', 'aioli garlic mayo garlic aioli', { c: S.aioli, bits: [['herb', 3]] });
  vary('sauce-dollop', 'wholegrain-mustard-dollop', 'Wholegrain mustard, dollop', 'Savoury', 'wholegrain mustard seeded mustard grain mustard', { c: S.wholegrain, bits: [['seeds', 36]] });
  vary('sauce-dollop', 'dijon-dollop', 'Dijon mustard, dollop', 'Savoury', 'dijon mustard french mustard hot mustard', { c: '#D9B03A' });
  vary('sauce-dollop', 'horseradish-cream-dollop', 'Horseradish cream, dollop', 'Savoury', 'horseradish cream roast beef', { c: '#F4F0E2', bits: [['figseed', 10]] });
  vary('sauce-dollop', 'chilli-jam-dollop', 'Chilli jam, dollop', 'Savoury', 'chilli jam chili jam sweet chilli jam', { c: S['chilli jam'], bits: [['chilli', 18]] });
  vary('sauce-dollop', 'tomato-relish-dollop', 'Tomato relish, dollop', 'Savoury', 'relish tomato relish chutney burger relish', { c: S.relish, bits: [['chunk', 10], ['seeds', 6]], chunk: '#C0392B' });
  vary('sauce-dollop', 'xo-sauce-spoonful', 'XO sauce, spoonful', 'Savoury', 'xo sauce dried scallop shrimp chilli', { c: S.xo, bits: [['xo', 30]] });
  vary('sauce-dollop', 'mango-chutney-dollop', 'Mango chutney, dollop', 'Savoury', 'mango chutney curry pickle', { c: S['mango chutney'], bits: [['chunk', 8], ['seeds', 4]], chunk: '#F2B84A' });
  vary('sauce-dollop', 'fig-jam-dollop', 'Fig jam, dollop', 'Savoury', 'fig jam fig paste cheese board', { c: S['fig jam'], bits: [['figseed', 30]] });
  vary('sauce-dollop', 'onion-jam-dollop', 'Onion jam, dollop', 'Savoury', 'onion jam caramelised onion onion marmalade burger', { c: S['onion jam'], bits: [['onion', 9]] });
  vary('sauce-dollop', 'tomato-sauce-dollop', 'Tomato sauce, dollop', 'Savoury', 'tomato sauce dead horse ketchup sauce', { c: S.tomato });
  vary('sauce-dollop', 'ssamjang-dollop', 'Ssamjang, dollop', 'Savoury', 'ssamjang korean bean paste gochujang ssam', { c: S.ssamjang, bits: [['sesame', 10], ['herb', 4]] });
  vary('sauce-puree-smear', 'pea-puree-smear', 'Pea purée, smear', 'Savoury', 'pea puree mushy peas green puree', { c: S.pea });
  vary('sauce-puree-smear', 'cauliflower-puree-smear', 'Cauliflower purée, smear', 'Savoury', 'cauliflower puree cauli white puree', { c: S.cauliflower });
  vary('sauce-puree-smear', 'beetroot-puree-smear', 'Beetroot purée, smear', 'Savoury', 'beetroot puree beet purple', { c: S.beetroot });
  vary('sauce-puree-smear', 'tahini-yoghurt-smear', 'Tahini yoghurt, smear', 'Savoury', 'tahini yoghurt yogurt tahini sauce sesame', { c: '#EEE2C4', bits: [['zaatar', 10]] });
  vary('sauce-puree-quenelle', 'pumpkin-puree-quenelle', 'Pumpkin purée, quenelle', 'Savoury', 'pumpkin puree butternut', { c: S.pumpkin });
  vary('sauce-puree-quenelle', 'pea-puree-quenelle', 'Pea purée, quenelle', 'Savoury', 'pea puree green', { c: S.pea });
  vary('sauce-swoosh', 'romesco-swoosh', 'Romesco, swoosh', 'Savoury', 'romesco red pepper almond', { c: '#C2502E' });
  vary('sauce-swoosh', 'pumpkin-puree-swoosh', 'Pumpkin purée, swoosh', 'Savoury', 'pumpkin puree butternut orange', { c: S.pumpkin });
  vary('sauce-brush-stroke', 'hoisin-brush-stroke', 'Hoisin, brush stroke', 'Savoury', 'hoisin plum sauce duck sauce', { c: S.hoisin });
  vary('sauce-brush-stroke', 'black-garlic-brush-stroke', 'Black garlic, brush stroke', 'Savoury', 'black garlic puree squid ink', { c: '#2E2420' });
  vary('sauce-dots-row', 'hoisin-dots', 'Hoisin, dots', 'Savoury', 'hoisin dots plum sauce', { c: S.hoisin });
  vary('sauce-dots-scattered', 'sriracha-dots', 'Sriracha, dots', 'Savoury', 'sriracha hot sauce chilli dots rooster', { c: S.sriracha });
  vary('sauce-dots-arc', 'pea-puree-dots', 'Pea purée, dots', 'Savoury', 'pea puree dots green', { c: S.pea });
  vary('sauce-drizzle', 'bbq-sauce-drizzle', 'BBQ sauce, drizzle', 'Savoury', 'bbq barbecue barbeque sauce ribs drizzle', { c: S.bbq });
  vary('sauce-drizzle', 'hot-honey-drizzle', 'Hot honey, drizzle', 'Savoury', 'hot honey chilli honey drizzle', { c: S['hot honey'], bits: [['chilli', 8]] });
  vary('sauce-drizzle', 'teriyaki-drizzle', 'Teriyaki, drizzle', 'Savoury', 'teriyaki sweet soy kecap manis drizzle', { c: S.teriyaki });
  vary('sauce-drizzle', 'sriracha-drizzle', 'Sriracha, drizzle', 'Savoury', 'sriracha hot sauce chilli drizzle rooster', { c: S.sriracha });
  vary('sauce-dressing', 'nam-jim-dressing', 'Nam jim, dressing', 'Savoury', 'nam jim namjim thai dressing lime chilli', { c: S['nam jim'], bits: [['chilli', 12], ['herb', 10]] });
  vary('sauce-dressing', 'ponzu-dressing', 'Ponzu, dressing', 'Savoury', 'ponzu citrus soy dressing', { c: S.ponzu, bits: [['sesame', 8]] });
  vary('sauce-dressing', 'caesar-dressing', 'Caesar dressing, drizzle', 'Savoury', 'caesar dressing anchovy', { c: '#EFE3C4', bits: [['pepper', 10]] });
  vary('sauce-dressing', 'ranch-dressing', 'Ranch dressing, drizzle', 'Savoury', 'ranch dressing buttermilk', { c: S.ranch, bits: [['herb', 10]] });
  vary('sauce-glaze-splash', 'balsamic-glaze-splash', 'Balsamic glaze, splash', 'Savoury', 'balsamic glaze reduction', { c: '#3A1E1A' });
  vary('sauce-wave', 'sweet-chilli-wave', 'Sweet chilli, wave', 'Savoury', 'sweet chilli sauce sweet chili', { c: S['sweet chilli'], bits: [['chilli', 10]] });
  vary('sauce-wave', 'piri-piri-wave', 'Piri piri sauce, wave', 'Savoury', 'piri piri peri peri perinaise hot sauce portuguese', { c: S['piri piri'], bits: [['chilli', 8]] });
  vary('sauce-mayo-zigzag', 'japanese-mayo-zigzag', 'Japanese mayo, zigzag', 'Savoury', 'japanese mayo kewpie kewpie mayo mayonnaise zigzag', { c: '#F4E7BE' });
  vary('sauce-mayo-zigzag', 'sriracha-mayo-zigzag', 'Sriracha mayo, zigzag', 'Savoury', 'sriracha mayo spicy mayo chilli mayo zigzag', { c: '#EE8A5A' });
  vary('sauce-mayo-zigzag', 'american-mustard-zigzag', 'American mustard, zigzag', 'Savoury', 'american mustard yellow mustard hot dog zigzag', { c: S['american mustard'] });
  vary('sauce-mayo-zigzag', 'okonomi-sauce-zigzag', 'Okonomi sauce, zigzag', 'Savoury', 'okonomi sauce okonomiyaki tonkatsu bulldog zigzag', { c: '#4A2416' });
  vary('sauce-mayo-zigzag', 'ranch-drizzle', 'Ranch, drizzle', 'Savoury', 'ranch drizzle creamy ranch zigzag over the top nachos', { c: S.ranch, sw: 1.4 });
  vary('sauce-dollop', 'buffalo-mayo-dollop', 'Buffalo mayo, dollop', 'Savoury', 'buffalo mayo spicy mayo chilli mayo hot mayo dollop', { c: S['buffalo mayo'], bits: [['chilli', 6]] });
  vary('sauce-brush-stroke', 'chilli-jalapeno-butter', 'Chilli jalapeño butter, brushed', 'Savoury', 'chilli jalapeno butter chili butter jalapeno butter melted butter brushed corn', { c: S['chilli butter'], bits: [['chilli', 10], ['herb', 6]] });
  vary('sauce-brush-stroke', 'buffalo-bbq-glaze', 'Buffalo BBQ sauce, brushed', 'Savoury', 'buffalo bbq sauce buffalo sauce hot sauce wings glaze brushed', { c: S.buffalo });
  vary('sauce-poured-broth', 'laksa-broth', 'Laksa broth, poured', 'Savoury', 'laksa broth coconut curry soup', { c: S.laksa, bits: [['redoil', 10]] });
  vary('sauce-poured-broth', 'dashi-broth', 'Dashi, poured', 'Savoury', 'dashi broth japanese stock ramen', { c: '#D9B87A' });

  /* Dips and sides */
  vary('sauce-ramekin', 'bearnaise-ramekin', 'Béarnaise, ramekin', 'Dips and sides', 'bearnaise bernaise tarragon steak sauce', { c: S.bearnaise, bits: [['herb', 14]] });
  vary('sauce-ramekin', 'cocktail-sauce-ramekin', 'Cocktail sauce, ramekin', 'Dips and sides', 'cocktail sauce seafood sauce marie rose prawn cocktail', { c: S.cocktail });
  vary('sauce-ramekin', 'mignonette-ramekin', 'Mignonette, ramekin', 'Dips and sides', 'mignonette shallot vinegar oysters', { c: S.mignonette, bits: [['shallot', 16], ['pepper', 6]] });
  vary('sauce-ramekin', 'toum-ramekin', 'Garlic dip (toum), ramekin', 'Dips and sides', 'toum garlic dip garlic sauce lebanese kebab', { c: S.toum });
  vary('sauce-ramekin', 'queso-ramekin', 'Queso, ramekin', 'Dips and sides', 'queso cheese dip nacho cheese', { c: S.queso, bits: [['paprika', 10], ['jalapeno', 2]] });
  vary('sauce-ramekin', 'pepper-sauce-ramekin', 'Pepper sauce, ramekin', 'Dips and sides', 'pepper sauce peppercorn steak sauce on the side', { c: S.pepper, bits: [['pepper', 26]] });
  vary('sauce-ramekin', 'aioli-ramekin', 'Aioli, ramekin', 'Dips and sides', 'aioli garlic mayo on the side', { c: S.aioli });
  vary('sauce-ramekin', 'tartare-ramekin', 'Tartare, ramekin', 'Dips and sides', 'tartare tartar sauce fish and chips', { c: S.tartare, bits: [['caper', 12]] });
  vary('sauce-ramekin', 'raita-ramekin', 'Raita, ramekin', 'Dips and sides', 'raita yoghurt cucumber mint curry side', { c: S.raita, bits: [['cucumber', 12], ['herb', 6]] });
  vary('sauce-ramekin', 'tzatziki-ramekin', 'Tzatziki, ramekin', 'Dips and sides', 'tzatziki tsatsiki yoghurt cucumber dill greek', { c: S.tzatziki, bits: [['cucumber', 10], ['herb', 8], ['oil', 3]] });
  vary('sauce-ramekin', 'hollandaise-ramekin', 'Hollandaise, ramekin', 'Dips and sides', 'hollandaise on the side', { c: S.hollandaise });
  vary('sauce-tub', 'tomato-sauce-tub', 'Tomato sauce, tub', 'Dips and sides', 'tomato sauce ketchup dead horse sauce tub kids', { c: S.tomato });
  vary('sauce-tub', 'bbq-sauce-tub', 'BBQ sauce, tub', 'Dips and sides', 'bbq barbecue sauce tub', { c: S.bbq });
  vary('sauce-tub', 'sweet-chilli-tub', 'Sweet chilli, tub', 'Dips and sides', 'sweet chilli sauce tub wedges', { c: S['sweet chilli'], bits: [['chilli', 10]] });
  vary('sauce-tub', 'gravy-tub', 'Gravy, tub', 'Dips and sides', 'gravy tub chips and gravy', { c: S.gravy });
  vary('sauce-tub', 'honey-mustard-tub', 'Honey mustard, tub', 'Dips and sides', 'honey mustard tub nuggets', { c: '#E0B03A' });
  vary('sauce-tub', 'garlic-sauce-tub', 'Garlic sauce, tub', 'Dips and sides', 'garlic sauce garlic dip kebab tub', { c: '#F7F1E0', bits: [['herb', 4]] });
  vary('sauce-gravy-boat', 'mushroom-sauce-boat', 'Mushroom sauce, gravy boat', 'Dips and sides', 'mushroom sauce boat jug roast', { c: S.mushroom, bits: [['mushroom', 6]] });
  vary('sauce-dip-bowl', 'labneh-swirled', 'Labneh, swirled', 'Dips and sides', 'labneh labne yoghurt cheese olive oil zaatar za atar', { c: S.labneh, bits: [['zaatar', 30]] });
  vary('sauce-dip-bowl', 'muhammara-swirled', 'Muhammara, swirled', 'Dips and sides', 'muhammara red pepper walnut dip', { c: S.muhammara, bits: [['peanut', 10]] });

  /* Dessert sauces by name */
  vary('sauce-pool', 'chocolate-sauce-pool', 'Chocolate sauce, pool', 'Dessert', 'chocolate sauce choc fudge sauce ganache', { c: S.chocolate }, { role: 'dsauce' });
  vary('sauce-pool', 'berry-coulis-pool', 'Berry coulis, pool', 'Dessert', 'berry coulis mixed berry sauce', { c: S.coulis }, { role: 'dsauce' });
  vary('sauce-pool', 'butterscotch-pool', 'Butterscotch sauce, pool', 'Dessert', 'butterscotch sauce', { c: '#C98A2E' }, { role: 'dsauce' });
  vary('sauce-pool-oval', 'creme-anglaise-pool', 'Crème anglaise, pool', 'Dessert', 'creme anglaise custard sauce vanilla', { c: '#F4E2A6', bits: [['vanilla', 26]] }, { role: 'dsauce' });
  vary('sauce-pool-oval', 'passionfruit-sauce-pool', 'Passionfruit sauce, pool', 'Dessert', 'passionfruit passion fruit sauce pulp', { c: '#E8B02A', bits: [['passion', 18]] }, { role: 'dsauce' });
  vary('sauce-cream', 'custard-poured', 'Custard, poured', 'Dessert', 'custard pouring custard hot custard', { c: S.custard }, { role: 'dsauce' });
  vary('sauce-drizzle', 'chocolate-sauce-drizzle', 'Chocolate sauce, drizzle', 'Dessert', 'chocolate sauce choc drizzle', { c: S.chocolate }, { role: 'dsauce' });
  vary('sauce-drizzle', 'caramel-sauce-drizzle', 'Caramel sauce, drizzle', 'Dessert', 'caramel sauce drizzle', { c: S.caramel }, { role: 'dsauce' });
  vary('sauce-drizzle', 'maple-syrup-drizzle', 'Maple syrup, drizzle', 'Dessert', 'maple syrup pancakes', { c: '#A8621E' }, { role: 'dsauce' });
  vary('sauce-drizzle', 'honey-drizzle', 'Honey, drizzle', 'Dessert', 'honey drizzle', { c: S.honey }, { role: 'dsauce' });
  vary('sauce-swoosh', 'salted-caramel-swoosh', 'Salted caramel, swoosh', 'Dessert', 'salted caramel sauce swoosh', { c: S['salted caramel'], bits: [['salt', 10]] }, { role: 'dsauce' });
  vary('sauce-swoosh', 'chocolate-swoosh', 'Chocolate, swoosh', 'Dessert', 'chocolate ganache swoosh', { c: S.chocolate }, { role: 'dsauce' });
  vary('sauce-dots-arc', 'raspberry-coulis-dots', 'Raspberry coulis, dots', 'Dessert', 'raspberry coulis dots', { c: S.raspberry }, { role: 'dsauce' });
  vary('sauce-dots-row', 'mango-coulis-dots', 'Mango coulis, dots', 'Dessert', 'mango coulis dots', { c: '#F0A830' }, { role: 'dsauce' });
  vary('sauce-gravy-pour', 'toffee-sauce-poured', 'Toffee sauce, poured', 'Dessert', 'toffee sauce sticky date sticky toffee caramel poured', { c: '#9A5A1E' }, { role: 'dsauce' });
  vary('sauce-spoon-tear', 'chocolate-spoon-tear', 'Chocolate, spoon tear', 'Dessert', 'chocolate tear ganache', { c: S.chocolate }, { role: 'dsauce' });
  vary('sauce-gel-dots', 'raspberry-gel-dots', 'Raspberry gel dots', 'Dessert', 'raspberry gel fluid gel dots', { c: S.raspberry }, { role: 'dsauce' });
  vary('sauce-dollop', 'lemon-curd-dollop', 'Lemon curd, dollop', 'Dessert', 'lemon curd lemon butter', { c: '#F2D04A' }, { role: 'dsauce' });
  vary('dsauce-streaks', 'hazelnut-spread-streaks', 'Hazelnut spread drizzle', 'Dessert', 'hazelnut spread chocolate hazelnut nutella', { c: S['hazelnut spread'] });
  vary('dsauce-streaks', 'white-chocolate-streaks', 'White chocolate, streaks', 'Dessert', 'white chocolate drizzle', { c: '#F4EEDC' });
  vary('dsauce-spiral', 'strawberry-sauce-spiral', 'Strawberry sauce, spiral', 'Dessert', 'strawberry sauce topping', { c: S.strawberry });
  vary('dsauce-hearts', 'chocolate-hearts', 'Chocolate dots, hearts', 'Dessert', 'chocolate dragged dots hearts', { c: S.chocolate });

  L.add('sauce', items);

  // any sauce by name on a shape: byName('Pepper sauce', 'pool') -> draw(P, rnd)
  function byName(name, fn, o) { var c = L.sauceColour(name) || '#8A5A34'; return (SHAPES[fn] || pool)(Object.assign({ c: c }, o || {})); }
  L.SAUCE_D = Object.assign({ bits: BITS, ribbon: ribbon, curve: curve, piped: piped, byName: byName }, SHAPES);
})();
