/* The drawing library: side and build pieces (see js/library.js for the fields). Drawn around 0,0, 1 unit is about 1.5 mm. */
/*
  These are seen from the side, not from above: for the "From the side" drawings (js/art.js LK_ART.sides) and the burger
  "Build" drawings (LK_ART.diagrams['burger-build']). Each piece is centred on x = 0 with its base on y = 0 and grows up
  (negative y), so pieces stack: put the next one at y = minus the height of the ones below. Melted cheese and sauce
  drips hang below y = 0, over the layer underneath. side.s is the piece's own shape and side.h its stacking height.
  Burger and stack layers are drawn at the build drawing's scale (a bun about 150 across); mains, sides and
  servingware at the "From the side" scale (a dinner plate about 220 across).
*/
(function () {
  'use strict';
  var L = window.LK_LIB, N = L.P.n;

  /* ---------- shapes ---------- */
  function pt(p) { return N(p[0]) + ' ' + N(p[1]); }
  function bez(c, t) {
    var u = 1 - t;
    return [u * u * u * c[0][0] + 3 * u * u * t * c[1][0] + 3 * u * t * t * c[2][0] + t * t * t * c[3][0], u * u * u * c[0][1] + 3 * u * u * t * c[1][1] + 3 * u * t * t * c[2][1] + t * t * t * c[3][1]];
  }
  // a bun's dome: two curves from (-a, -cut) up to the top (0, -h) and down to (a, -cut); sh is how square the shoulders are
  function dome(a, h, cut, sh) { return [[[-a, -cut], [-a, -h * sh], [-a * 0.55, -h], [0, -h]], [[0, -h], [a * 0.55, -h], [a, -h * sh], [a, -cut]]]; }
  function domeY(cv, x) {
    var c = x < 0 ? cv[0] : cv[1], lo = 0, hi = 1;
    for (var i = 0; i < 22; i++) { var m = (lo + hi) / 2; if (bez(c, m)[0] < x) lo = m; else hi = m; }
    return bez(c, (lo + hi) / 2)[1];
  }
  // points round a layer seen from the side: flat on y = 0, rounded ends of radius re, a top that can be lumpy (wob),
  // a bottom that can lift a little (bwob), and thinner towards the right (taper 0 to 1)
  function layerPts(rnd, w, h, o) {
    o = o || {};
    var a = w / 2, re = Math.min(o.re === undefined ? h / 2 : o.re, a), k = o.k || 24, top = [], bot = [];
    function e(x) { var d = Math.abs(x) - (a - re); return d <= 0 ? 1 : Math.sqrt(Math.max(0, 1 - (d / re) * (d / re))); }
    for (var i = 0; i <= k; i++) {
      var x = -a * Math.cos(Math.PI * i / k), ee = e(x), H = h * (o.taper ? 1 - o.taper * (x + a) / w : 1);
      var jt = o.wob ? (rnd() * 2 - 1) * o.wob * ee : 0, jb = o.bwob ? rnd() * o.bwob * ee : 0;
      top.push([x, -H / 2 - (H / 2) * ee + jt]);
      if (i > 0 && i < k) bot.unshift([x, -H / 2 + (H / 2) * ee - jb]);
    }
    return top.concat(bot);
  }
  function layerD(rnd, w, h, o) { return L.P.smooth(layerPts(rnd, w, h, o)); }
  // a thin melted or poured layer: its top at -t, drips ([x, length, half width]) hanging below 0, the ends drooping over the edge
  function dripD(w, t, drips, droop) {
    var a = w / 2, d = 'M' + N(-a - 2) + ' ' + N(droop) + ' Q' + N(-a - 2.5) + ' ' + N(-t) + ' ' + N(-a + 6) + ' ' + N(-t) + ' L' + N(a - 6) + ' ' + N(-t) + ' Q' + N(a + 2.5) + ' ' + N(-t) + ' ' + N(a + 2) + ' ' + N(droop);
    d += ' Q' + N(a + 0.5) + ' ' + N(droop + 3) + ' ' + N(a - 1) + ' ' + N(droop) + ' Q' + N(a - 2) + ' 0.6 ' + N(a - 9) + ' 0';
    drips.slice().sort(function (p, q) { return q[0] - p[0]; }).forEach(function (dr) {
      var x = dr[0], len = dr[1], hw = dr[2] || 2.6;
      d += ' L' + N(x + hw + 1.6) + ' 0 Q' + N(x + hw) + ' 0.4 ' + N(x + hw) + ' ' + N(len * 0.6) + ' Q' + N(x + hw) + ' ' + N(len + hw) + ' ' + N(x) + ' ' + N(len + hw) + ' Q' + N(x - hw) + ' ' + N(len + hw) + ' ' + N(x - hw) + ' ' + N(len * 0.6) + ' Q' + N(x - hw) + ' 0.4 ' + N(x - hw - 1.6) + ' 0';
    });
    return d + ' L' + N(-a + 9) + ' 0 Q' + N(-a + 2) + ' 0.6 ' + N(-a + 1) + ' ' + N(droop) + ' Q' + N(-a - 0.5) + ' ' + N(droop + 3) + ' ' + N(-a - 2) + ' ' + N(droop) + ' Z';
  }
  // parallel lines at ang degrees, gap apart, kept inside a convex polygon (the waffle on a cone, the stripes on a cup)
  function hatch(P, poly, ang, gap, col, sw, x) {
    var a = ang * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx, out = '', cx = 0, cy = 0;
    poly.forEach(function (p) { cx += p[0] / poly.length; cy += p[1] / poly.length; });
    var ds = poly.map(function (p) { return p[0] * nx + p[1] * ny; }), lo = Math.min.apply(null, ds), hi = Math.max.apply(null, ds);
    for (var o = lo + gap / 2; o < hi; o += gap) {
      var bx = nx * o, by = ny * o, t0 = -1e4, t1 = 1e4, ok = true;
      for (var i = 0; i < poly.length && ok; i++) {
        var A = poly[i], B = poly[(i + 1) % poly.length], ex = [B[0] - A[0], B[1] - A[1]], en = [ex[1], -ex[0]];
        if (en[0] * (cx - A[0]) + en[1] * (cy - A[1]) > 0) en = [-en[0], -en[1]];
        var num = en[0] * (bx - A[0]) + en[1] * (by - A[1]), den = en[0] * dx + en[1] * dy;
        if (Math.abs(den) < 1e-9) { if (num > 0) ok = false; continue; }
        var t = -num / den;
        if (den > 0) t1 = Math.min(t1, t); else t0 = Math.max(t0, t);
      }
      if (ok && t1 > t0) out += P.line(bx + dx * t0, by + dy * t0, bx + dx * t1, by + dy * t1, col, sw, x);
    }
    return out;
  }

  /* ---------- burger layers (the build drawing's scale: a bun about 150 across) ---------- */
  function bunTop(o) {
    return function (P, rnd) {
      var w = o.w || 150, h = o.h || 40, a = w / 2, cut = 5, col = o.col, cv = dome(a, h, cut, o.sh || 0.78), out = '';
      var d = 'M' + N(-a + 4) + ' 0 Q' + N(-a) + ' 0 ' + N(-a) + ' ' + N(-cut) + ' C' + cv[0].slice(1).map(pt).join(' ') + ' C' + cv[1].slice(1).map(pt).join(' ') + ' Q' + N(a) + ' 0 ' + N(a - 4) + ' 0 Z';
      out += P.path(d, col, P.shade(col, -0.3), 1.2);
      // lighter sides low down, where the buns touched on the tray
      var band = [];
      for (var i = 0; i <= 24; i++) { var x = -a + 1.2 + (w - 2.4) * i / 24; band.push(N(x) + ' ' + N(Math.max(domeY(cv, x) + 1.2, -cut - 12))); }
      out += P.path('M' + band.join(' L') + ' L' + N(a - 1.2) + ' ' + N(-cut) + ' L' + N(-a + 1.2) + ' ' + N(-cut) + ' Z', P.shade(col, 0.3), null, 0, { opacity: '0.5' });
      out += P.path('M' + N(-a * 0.55) + ' ' + N(-h * 0.7) + ' Q' + N(-a * 0.25) + ' ' + N(-h * 0.97) + ' ' + N(a * 0.15) + ' ' + N(-h * 0.94), 'none', P.shade(col, 0.45), o.gloss ? 6 : 5, { 'stroke-linecap': 'round', opacity: o.gloss ? '0.85' : '0.65' });
      if (o.gloss) out += P.hl(a * 0.35, -h * 0.82, a * 0.1, h * 0.05, '#FFFFFF', 0.6, 20);
      if (o.seeds) for (var s = 0; s < o.seeds; s++) {
        var sx = (rnd() * 2 - 1) * a * 0.84, top = domeY(cv, sx), sy = top + 2.5 + rnd() * (-cut - top) * 0.5;
        out += P.ellipse(sx, sy, 2.6, 1.3, '#F7E9CC', '#D9C091', 0.4, { transform: 'rotate(' + N((rnd() - 0.5) * 60) + ' ' + N(sx) + ' ' + N(sy) + ')' });
      }
      if (o.flour) for (var f = 0; f < o.flour; f++) { var fx = (rnd() * 2 - 1) * a * 0.6, fy = domeY(cv, fx) + 1.5 + rnd() * 5; out += P.circle(fx, fy, 0.6 + rnd() * 0.8, '#FFFFFF', null, 0, { opacity: '0.7' }); }
      out += P.rect(-a + 1.5, -cut, w - 3, cut, 2, '#F1D9A8') + P.line(-a + 3, -cut, a - 3, -cut, P.shade('#F1D9A8', -0.12), 0.6);
      return out;
    };
  }
  function bunBase(o) {
    return function (P, rnd) {
      var w = o.w || 150, h = o.h || 18, a = w / 2, col = o.col || '#D69A55';
      var d = 'M' + N(-a + 2) + ' ' + N(-h) + ' L' + N(a - 2) + ' ' + N(-h) + ' Q' + N(a) + ' ' + N(-h) + ' ' + N(a) + ' ' + N(-h + 3) + ' L' + N(a - 0.5) + ' -7 Q' + N(a - 1) + ' 0 ' + N(a - 9) + ' 0 L' + N(-a + 9) + ' 0 Q' + N(-a + 1) + ' 0 ' + N(-a + 0.5) + ' -7 L' + N(-a) + ' ' + N(-h + 3) + ' Q' + N(-a) + ' ' + N(-h) + ' ' + N(-a + 2) + ' ' + N(-h) + ' Z';
      var out = P.path(d, col, P.shade(col, -0.3), 1.2) + P.rect(-a + 4, -5, w - 8, 4.4, 2.2, P.shade(col, -0.18), null, 0, { opacity: '0.55' });
      out += P.rect(-a + 1.5, -h, w - 3, 6, 2, '#F1D9A8') + P.line(-a + 3, -h + 6, a - 3, -h + 6, P.shade('#F1D9A8', -0.15), 0.6);
      for (var i = 0; i < 9; i++) { var x = -a + 10 + rnd() * (w - 20); out += P.ellipse(x, -h + 2.5 + rnd() * 2, 1.4, 0.7, '#E2C38A'); }
      return out + P.line(-a + 6, -h + 9, -a * 0.2, -h + 8.5, P.shade(col, 0.4), 2, { opacity: '0.5' });
    };
  }
  function beefPatty(P, rnd) {
    var out = P.path(layerD(rnd, 156, 22, { wob: 1.4, k: 28 }), '#4A2E16', '#2E1A0C', 1.2);
    out += P.g(P.at(0, -3), P.path(layerD(rnd, 148, 15, { wob: 1, k: 24 }), '#7A4A26', null, 0));
    out += P.g(P.at(0, -10.5), P.crumbs(rnd, 40, 70, 6, ['#9A6236', '#B07A44', '#4A2A12'], 0.9));
    return out + P.line(-60, -19, 30, -19.5, '#FFFFFF', 1.2, { opacity: '0.18' });
  }
  function smashPatty(P, rnd) {
    var out = '';
    // the lacy, crisp edge pressed out thin
    [-1, 1].forEach(function (s) {
      for (var i = 0; i < 7; i++) out += P.path(P.blob(rnd, 2.5 + rnd() * 4.5, 1 + rnd() * 1.3, 0.45, 8, s * (72 + rnd() * 9), -2 - rnd() * 4), '#6B3E1A', '#2E1A0C', 0.5);
      out += P.path('M' + N(s * 70) + ' -3 L' + N(s * 84) + ' ' + N(-1 - rnd() * 3) + ' M' + N(s * 72) + ' -6 L' + N(s * 82) + ' -7.5', 'none', '#4A2A12', 0.9, { 'stroke-linecap': 'round' });
    });
    out += P.path(layerD(rnd, 152, 8, { wob: 0.9, k: 32, re: 3 }), '#5E3818', '#2E1A0C', 1);
    out += P.g(P.at(0, -4), P.crumbs(rnd, 30, 72, 2.4, ['#8A5A2E', '#3A220E'], 0.8));
    return out;
  }
  function crumbedFillet(P, rnd) {
    var out = P.path(layerD(rnd, 150, 22, { wob: 2.2, k: 32 }), '#D9A24E', '#B9802F', 1.2);
    out += P.g(P.at(0, -5), P.path(layerD(rnd, 138, 12, { wob: 1, k: 24 }), '#E3B466', null, 0, { opacity: '0.85' }));
    return out + P.g(P.at(0, -11), P.crumbs(rnd, 46, 70, 8, ['#C48A3A', '#B97A2C', '#EBC27A'], 1.1));
  }
  function batteredFillet(P, rnd) {
    var out = P.path(layerD(rnd, 156, 26, { wob: 3.2, k: 20, taper: 0.4 }), '#E3AE4E', '#B9802F', 1.2);
    out += P.g(P.at(-6, -11), P.scatter(rnd, 14, 56, 5, function (x, y, i, q) { return P.ellipse(x, y, 2 + q() * 2.4, 1.1 + q() * 1, '#F2CF7E', null, 0, { opacity: '0.8' }); }));
    out += P.g(P.at(-6, -10), P.crumbs(rnd, 12, 60, 6, ['#C48A3A'], 1));
    return out + P.line(-66, -20, -10, -21, '#FFFFFF', 1.4, { opacity: '0.3' });
  }
  function cheeseSlice(P) {
    return P.path(dripD(150, 4, [[-44, 7], [-6, 10], [30, 6], [58, 9]], 8), '#F2C14E', '#D9A62A', 0.8) + P.line(-66, -3, 60, -3, '#F8DA86', 1.1, { opacity: '0.9' });
  }
  function sauceLayer(col, drips) {
    return function (P) {
      return P.path(dripD(146, 3.5, drips || [[-50, 5], [-18, 8], [16, 4], [46, 9], [62, 3]], 4), col, P.shade(col, -0.2), 0.7) + P.line(-60, -2.6, 50, -2.6, '#FFFFFF', 0.9, { opacity: '0.45' });
    };
  }
  function lettuce(P, rnd) {
    function leafD(w) {
      var a = w / 2, top = [], bot = [], i = 0;
      for (var x = -a; x <= a + 0.1; x += 5, i++) { var e = Math.min(1, (a - Math.abs(x)) / 10); top.push([x, -(3.5 + 3.5 * e + rnd() * 2 * e) - (i % 2 ? 3 * e : 0)]); }
      for (var x2 = a - 4; x2 >= -a + 4; x2 -= 12) bot.push([x2, Math.abs(x2) > a - 16 ? 3 + rnd() * 1.5 : rnd() * 1.2]);
      return { d: L.P.smooth(top.concat(bot)), top: L.P.smooth(top, true) };
    }
    var back = leafD(156), front = leafD(162), out = P.g(P.at(3, -2.5), P.path(back.d, '#6E9A3E', '#4F7F2F', 0.8));
    out += P.path(front.d, '#8DB255', '#5E8C3A', 0.9) + P.path(front.top, 'none', '#C9DE8A', 1.1, { transform: 'translate(0 1)' });
    for (var i = 0; i < 9; i++) { var x = -70 + i * 17 + rnd() * 6; out += P.line(x, 0, x + 4, -4.5, '#6E9A3E', 0.9, { opacity: '0.7' }); }
    return out;
  }
  function slices(o) {
    return function (P, rnd) {
      var out = '';
      o.at.forEach(function (x) {
        var w = o.w, h = o.h, s = P.rect(-w / 2, -h, w, h, h / 2, o.col, P.shade(o.col, -0.3), 0.8) + P.rect(-w / 2 + 4, -h + 1, w - 8, o.face || 3, 1.5, o.top, null, 0);
        if (o.seeds) for (var i = 0; i < 3; i++) s += P.ellipse(-w * 0.28 + i * w * 0.28, -h + 2.5, 2.4, 0.9, o.seeds, null, 0);
        if (o.rings) s += P.line(-w / 2 + 7, -h + 2, w / 2 - 7, -h + 2, o.rings, 0.6) + P.line(-w / 2 + 12, -h + 3.2, w / 2 - 12, -h + 3.2, o.rings, 0.6);
        out += P.g(P.at(x, 0, (rnd() - 0.5) * 2), s + P.line(-w / 2 + 6, -h * 0.3, -w * 0.1, -h * 0.3, '#FFFFFF', 1, { opacity: '0.3' }));
      });
      return out;
    };
  }
  function pineappleRing(P, rnd) {
    var out = P.rect(-60, -12, 120, 12, 5, '#F2CB55', '#D9A62A', 0.9) + P.rect(-55, -11, 110, 4, 2, '#F7DE85', null, 0);
    out += P.ellipse(0, -9, 15, 1.8, '#D9A62A', null, 0, { opacity: '0.6' });
    for (var i = 0; i < 7; i++) { var x = -46 + i * 15; if (Math.abs(x) < 16) continue; out += P.line(x, -11, x + 4, -7.5, '#7A4A1A', 1.6, { opacity: '0.8' }); }
    return out + P.line(-52, -4, -10, -4, '#FFFFFF', 1, { opacity: '0.35' });
  }
  function onionRings(P, rnd) {
    var out = '';
    [-36, 36].forEach(function (x) {
      var ring = P.blob(rnd, 37, 9.5, 0.05, 16, x, -9.6) + ' ' + P.blob(rnd, 21, 3.4, 0.06, 10, x, -11.5), col = '#D9A04A';
      out += P.path(ring, col, '#A8702A', 1, { 'fill-rule': 'evenodd' }) + P.g(P.at(x, -6), P.crumbs(rnd, 18, 30, 3, ['#B97A2C', '#EBC27A'], 0.9)) + P.path('M' + N(x - 26) + ' -15.5 Q' + N(x) + ' -19.5 ' + N(x + 26) + ' -15.5', 'none', '#F0C878', 1.4, { opacity: '0.7' });
    });
    return out;
  }
  function onionRaw(P) {
    var out = '';
    [-46, 0, 46].forEach(function (x, i) {
      var y = -4 - (i % 2) * 0.8;
      out += P.path('M' + N(x - 26) + ' ' + N(y) + ' a26 3.8 0 1 0 52 0 a26 3.8 0 1 0 -52 0 Z M' + N(x - 19) + ' ' + N(y) + ' a19 2.4 0 1 0 38 0 a19 2.4 0 1 0 -38 0 Z', '#F3E8F0', '#9B4A86', 1.6, { 'fill-rule': 'evenodd' }) + P.ellipse(x, y, 22.5, 3.1, 'none', '#B97AAA', 0.8);
    });
    return out;
  }
  function pickles(P) {
    var out = '';
    [-54, -18, 18, 54].forEach(function (x) {
      out += P.ellipse(x, -4, 16, 4, '#6E8E34', '#4F6A22', 1.3, { 'stroke-dasharray': '1.6 1.1' }) + P.ellipse(x, -4.4, 12.5, 2.8, '#A8BE5A', null, 0);
      for (var i = 0; i < 6; i++) { var a = i / 6 * Math.PI * 2; out += P.circle(x + Math.cos(a) * 6.5, -4.4 + Math.sin(a) * 1.3, 0.7, '#E3E8B0'); }
    });
    return out;
  }
  function bacon(P) {
    function rasher(y0, ph) {
      var top = [], bot = [];
      for (var i = 0; i <= 20; i++) { var x = -74 + i * 7.4, wv = Math.sin(i * 0.9 + ph) * 3; top.push([x, y0 - 5 + wv]); bot.unshift([x, y0 + wv]); }
      return { d: L.P.smooth(top.concat(bot)), mid: L.P.smooth(top.map(function (p) { return [p[0], p[1] + 2.4]; }), true) };
    }
    var a = rasher(-5, 1.6), b = rasher(-3, 0), out = '';
    [a, b].forEach(function (r) { out += P.path(r.d, '#B5503F', '#8A3426', 0.9) + P.path(r.mid, 'none', '#F0D8D0', 1.4, { 'stroke-linecap': 'round' }); });
    return out;
  }
  function friedEgg(P, rnd) {
    var white = 'M-63 0 Q-64 -2 -60 -3 Q-48 -3.5 -36 -5 Q-26 -9 -14 -9 L18 -9 Q30 -9 38 -5 Q50 -3.5 60 -3 Q64 -2 63 0 Z', out = '';
    out += P.path(white, '#FFFFFF', '#DDD6C4', 1) + P.path('M-62 -1.5 Q-58 -4 -52 -3 M52 -3 Q58 -4 62 -1.5', 'none', '#C98A3A', 1.8, { 'stroke-linecap': 'round' });
    out += P.path('M-15 -8 C-15 -22 19 -22 19 -8 Z', '#F2C94C', '#D9A62A', 0.9) + P.hl(-4, -16, 6, 2, '#FFFFFF', 0.6, -10);
    return out;
  }
  function avocado(P, rnd) {
    var out = '';
    [-56, -28, 0, 28, 56].forEach(function (x, i) {
      var y = -4.5 - (i % 2) * 1.5, r = (i - 2) * 3;
      out += P.g(P.at(x, y, r), P.path(L.P.leafD(38, 7), '#C9DE8A', '#7EA453', 0.9) + P.path('M-17 -1.2 Q0 -5.6 17 -0.6', 'none', '#4F7F2F', 1.6, { 'stroke-linecap': 'round' }));
    });
    return out;
  }
  function strands(P, rnd, n, w, y0, cols, sw) {
    var out = '';
    for (var i = 0; i < n; i++) { var x = (rnd() * 2 - 1) * w / 2, y = y0 + (rnd() - 0.5) * 6, l = 6 + rnd() * 8, b = (rnd() - 0.5) * 6; out += P.path('M' + N(x - l / 2) + ' ' + N(y) + ' Q' + N(x) + ' ' + N(y + b) + ' ' + N(x + l / 2) + ' ' + N(y - b * 0.4), 'none', cols[i % cols.length], sw * (0.8 + rnd() * 0.5), { 'stroke-linecap': 'round' }); }
    return out;
  }
  function pulledPork(P, rnd) {
    return P.path(layerD(rnd, 140, 12, { wob: 1.8, k: 26 }), '#7A3F1E', '#4A2711', 1) + strands(P, rnd, 34, 136, -9, ['#8A4A26', '#A8643A', '#5E2E14', '#B5703A'], 2) + P.line(-50, -11, 20, -12, '#FFFFFF', 1, { opacity: '0.25' });
  }
  function slaw(P, rnd) {
    return P.path(layerD(rnd, 140, 10, { wob: 1.6, k: 26 }), '#EFEAD2', '#D3CAA8', 0.9) + strands(P, rnd, 56, 136, -6, ['#FBF9EE', '#8E3A66', '#DDE3B8', '#EE8A2E', '#9CC067', '#A34A6A'], 1.7);
  }

  /* ---------- stack layers ---------- */
  function turkishTop(P, rnd) {
    var d = 'M-85 -6 C-86 -24 -74 -30 -58 -30 L58 -30 C74 -30 86 -24 85 -6 L84 0 L-84 0 Z', out = P.path(d, '#DDAA5E', '#A8702A', 1.2);
    out += P.path('M-80 -18 C-80 -26 -70 -29 -58 -29 L58 -29 C70 -29 80 -26 80 -18', 'none', '#C98A45', 3, { opacity: '0.55' });
    for (var i = 0; i < 30; i++) { var x = -70 + rnd() * 140, y = -27.5 + rnd() * 4, nig = i % 3 === 0; out += P.ellipse(x, y, nig ? 1.6 : 2.2, nig ? 0.9 : 1.1, nig ? '#2E2420' : '#F7E9CC', null, 0, { transform: 'rotate(' + N((rnd() - 0.5) * 50) + ' ' + N(x) + ' ' + N(y) + ')' }); }
    out += P.rect(-82, -7, 164, 7, 2, '#F6EAD0') + P.line(-80, -7, 80, -7, '#D9B27A', 0.8);
    for (var k = 0; k < 14; k++) out += P.ellipse(-76 + rnd() * 152, -3.5 + (rnd() - 0.5) * 3, 1.6, 0.8, '#E3D0A8');
    return out + P.path('M-62 -24 Q-20 -27 30 -25', 'none', '#F2CC88', 3, { opacity: '0.6', 'stroke-linecap': 'round' });
  }
  function turkishBase(P, rnd) {
    var d = 'M-84 -24 L84 -24 L85 -18 C86 -6 76 0 62 0 L-62 0 C-76 0 -86 -6 -85 -18 Z', out = P.path(d, '#DDAA5E', '#A8702A', 1.2);
    out += P.path('M-82 -9 C-78 -3 -72 -1 -62 -1 L62 -1 C72 -1 78 -3 82 -9', 'none', '#B9802F', 3.5, { opacity: '0.45' }) + P.g(P.at(0, -4), P.crumbs(rnd, 12, 70, 2, ['#FFFFFF'], 0.6));
    out += P.rect(-83, -24, 166, 7, 2, '#F6EAD0') + P.line(-80, -17, 80, -17, '#D9B27A', 0.8);
    for (var k = 0; k < 14; k++) out += P.ellipse(-76 + rnd() * 152, -20.5 + (rnd() - 0.5) * 3, 1.6, 0.8, '#E3D0A8');
    return out;
  }
  function caramelOnion(P, rnd) {
    return P.path(layerD(rnd, 134, 5, { wob: 1, k: 24 }), '#8A4A22', '#5E2E14', 0.8) + strands(P, rnd, 26, 132, -5, ['#A8642A', '#6E3A1A', '#C98A4A'], 2) + P.g(P.at(0, -6), P.crumbs(rnd, 8, 60, 2, ['#FFFFFF'], 0.6), { opacity: '0.5' });
  }
  function minuteSteak(P, rnd) {
    var out = P.path(layerD(rnd, 150, 10, { wob: 0.8, k: 26, re: 4 }), '#7A4A26', '#3F2812', 1.1);
    out += P.g(P.at(0, -2), P.path(layerD(rnd, 142, 6, { k: 20 }), '#8E5A32', null, 0));
    for (var i = 0; i < 6; i++) { var x = -60 + i * 24; out += P.line(x, -10.3, x + 3, -8.4, '#2E1A0C', 2, { 'stroke-linecap': 'round' }); }
    return out + P.g(P.at(0, -5), P.crumbs(rnd, 20, 66, 2.4, ['#5E3818', '#A8703A'], 0.8));
  }
  // a whole build, bottom to top: [draw, height it adds]
  function stack(list) {
    return function (P, rnd) { var out = '', y = 0; list.forEach(function (l) { out += P.g(P.at(0, -y), l[0](P, rnd)); y += l[1]; }); return out; };
  }
  function muffin(P, rnd) {
    var out = P.path('M-44 -12 Q-45 -14.5 -42 -14.5 L42 -14.5 Q45 -14.5 44 -12 L43 -3 Q42 0 38 0 L-38 0 Q-42 0 -43 -3 Z', '#E0B27A', '#B9864A', 1.1);
    out += P.rect(-43, -14.5, 86, 4.5, 1.5, '#F4E6C6');
    for (var i = 0; i < 10; i++) out += P.ellipse(-38 + rnd() * 76, -12.5 + (rnd() - 0.5) * 2, 1.8, 0.8, '#DCC294');
    return out + P.g(P.at(0, -4), P.crumbs(rnd, 16, 38, 3, ['#F4ECD8', '#C9965A'], 0.6));
  }
  function ham(P) { return P.path('M-43 -1 Q-22 -6 0 -3 T43 -2 L43 1.5 Q22 -1.5 0 0.5 T-43 2 Z', '#E8A3A0', '#C9827E', 0.8, { transform: 'translate(0 -2)' }) + P.line(-36, -5, 30, -4.5, '#F2C2BE', 1, { opacity: '0.8' }); }
  function poachedEgg(P) {
    var out = P.path('M-36 0 Q-38 -4 -30 -6 C-26 -27 26 -27 30 -6 Q38 -4 36 0 Z', '#FBFAF4', '#DDD6C4', 1);
    out += P.path('M-31 -8.5 C-27 -27 27 -27 31 -8.5 Q29 -4 27 -7 Q24 -9 22 -8 Q20 -1 17 -7 Q8 -11 0 -10.5 Q-10 -11 -16 -8 Q-18 -2 -21 -8 Q-26 -9 -28 -6 Q-30 -4 -31 -8.5 Z', '#F2D27A', '#D9B04A', 0.8);
    out += P.hl(-8, -20, 8, 2, '#FFFFFF', 0.55, -8);
    for (var i = 0; i < 7; i++) out += P.line(-14 + i * 4.5, -21 + Math.abs(i - 3) * 0.6, -12 + i * 4.5, -22.5 + Math.abs(i - 3) * 0.6, '#4F7F2F', 1.2);
    return out + P.circle(6, -18, 0.8, '#C2502E') + P.circle(-4, -19, 0.7, '#C2502E') + P.circle(12, -15, 0.7, '#C2502E');
  }

  /* ---------- mains and sides from the side (the "From the side" scale: a dinner plate about 220 across) ---------- */
  function schnitzel(P, rnd) {
    var out = P.path(layerD(rnd, 136, 9, { wob: 1.4, k: 36, re: 4 }), '#D9A24E', '#B9802F', 1);
    return out + P.g(P.at(0, -4.5), P.crumbs(rnd, 34, 64, 3, ['#C48A3A', '#B97A2C', '#EBC27A'], 0.9));
  }
  function parmy(P, rnd) {
    var out = schnitzel(P, rnd);
    out += P.g(P.at(0, -9), P.path(dripD(126, 3, [[-30, 3], [22, 4]], 2), '#C0392B', '#9E2B20', 0.7));
    out += P.g(P.at(0, -12), P.path(dripD(120, 5, [[-48, 4], [-8, 6], [40, 5]], 5), '#F6D27A', '#E0B04A', 0.8));
    for (var i = 0; i < 7; i++) out += P.ellipse(-50 + i * 16 + rnd() * 6, -15.5, 3 + rnd() * 2, 1, '#C98A3A', null, 0, { opacity: '0.85' });
    return out;
  }
  function steakSide(o) {
    return function (P, rnd) {
      var w = o.w, h = o.h, re = o.re || 7, a = w / 2, out = P.path(layerD(rnd, w, h, { wob: 0.6, k: 28, re: re }), '#5A3618', '#3A220E', 1.2);
      // the cut side: a grey brown band round a pink middle
      out += P.g(P.at(0, -2.4), P.path(layerD(rnd, w - 7, h - 4.8, { k: 24, re: re - 2 }), '#9A6A4A', null, 0));
      out += P.g(P.at(0, -4.4), P.path(layerD(rnd, w - 13, h - 8.8, { k: 22, re: re - 3 }), '#C0473B', null, 0));
      out += P.g(P.at(0, -6.4), P.path(layerD(rnd, w - 24, Math.max(2, h - 12.8), { k: 20, re: Math.max(1, re - 4) }), '#D9665A', null, 0, { opacity: '0.85' }));
      if (o.fat) out += P.path('M' + N(a - 9) + ' ' + N(-h + 2) + ' Q' + N(a + 1) + ' ' + N(-h / 2) + ' ' + N(a - 9) + ' -2 Q' + N(a - 4) + ' ' + N(-h / 2) + ' ' + N(a - 9) + ' ' + N(-h + 2) + ' Z', '#E9D3A6', '#C9B07A', 0.6);
      for (var i = 0; i < Math.round(w / 22); i++) { var x = -a + 12 + i * 22; out += P.line(x, -h - 0.2, x + 3, -h + 2.2, '#1E120A', 2, { 'stroke-linecap': 'round' }); }
      return out + P.line(-a * 0.6, -h + 1.4, a * 0.2, -h + 1.2, '#FFFFFF', 1, { opacity: '0.2' });
    };
  }
  function mash(P) {
    var d = 'M-46 0 C-46 -14 -34 -26 -16 -29 Q-6 -31 -2 -34 Q2 -38 6 -33 Q10 -30 18 -29 C34 -26 46 -14 46 0 Z', out = P.path(d, '#F3EBD2', '#DCCFA8', 1.2);
    out += P.path('M-36 -12 Q-20 -22 -2 -24 M-28 -20 Q-14 -27 -3 -29 M8 -26 Q22 -24 34 -16', 'none', '#E3D6B0', 1.3, { 'stroke-linecap': 'round' });
    out += P.path('M-34 -15 Q-20 -24 -4 -26', 'none', '#FFFFFF', 1.2, { 'stroke-linecap': 'round', opacity: '0.7' });
    return out + P.ellipse(2, -32, 4, 1.4, '#F2D27A', null, 0, { opacity: '0.8' });
  }
  function chipsPile(P, rnd) {
    var out = '', rows = [[-4, 6, 14, 46], [-12, 5, 32, 38], [-21, 4, 45, 28], [-30, 2, 60, 14]];
    rows.forEach(function (r) {
      for (var i = 0; i < r[1]; i++) {
        var rot = (rnd() * 2 - 1) * r[2], ra = rot * Math.PI / 180, c = Math.abs(Math.cos(ra)), s = Math.abs(Math.sin(ra));
        var hx = 20 * c + 3.5 * s, hy = 20 * s + 3.5 * c, x = (i - (r[1] - 1) / 2) * (r[3] * 2 / r[1]) + (rnd() - 0.5) * 6, y = Math.min(r[0] + (rnd() - 0.5) * 3, -hy);
        x = Math.max(-50 + hx, Math.min(50 - hx, x));
        var col = L.P.shade('#E8BB5A', (rnd() - 0.5) * 0.12);
        out += P.g(P.at(x, y, rot), P.rect(-20, -3.5, 40, 7, 2, col, '#C38E2C', 0.8) + P.line(-16, -1.6, 12, -1.6, '#F4D88A', 0.9, { opacity: '0.8' }));
      }
    });
    return out;
  }
  function pie(P, rnd) {
    var out = P.path('M-33 0 Q-36 0 -36.5 -3 L-41 -30 L41 -30 L36.5 -3 Q36 0 33 0 Z', '#C98A45', '#9E6A2A', 1.1);
    for (var x = -32; x <= 32; x += 6.4) out += P.line(x * 41 / 36, -29, x, -1.5, '#B07430', 1.2, { opacity: '0.6' });
    out += P.path('M-45 -29 Q-46 -33 -42 -34 C-30 -50 30 -50 42 -34 Q46 -33 45 -29 Q0 -26 -45 -29 Z', '#D9A055', '#A8702A', 1.1);
    for (var k = -42; k <= 42; k += 6) out += P.circle(k, -30.5, 3, '#E0AE62', '#B9802F', 0.6);
    out += P.path('M-26 -40 Q0 -47 22 -42', 'none', '#F2CC88', 4, { opacity: '0.7', 'stroke-linecap': 'round' });
    return out + P.line(-5, -44.5, 1, -43.2, '#7A4A1E', 1.4) + P.line(4, -44.6, 9, -43.6, '#7A4A1E', 1.4);
  }
  function cakeSide(o) {
    return function (P, rnd) {
      var w = 68, a = 34, y = 0, out = '';
      o.layers.forEach(function (l, i) {
        out += P.rect(-a, -y - l[0], w, l[0], 0, l[1]);
        if (l[2]) out += P.g(P.at(0, -y - l[0] / 2), P.crumbs(rnd, Math.round(l[0] * 2), a - 3, l[0] / 2 - 1.5, [P.shade(l[1], -0.18), P.shade(l[1], 0.15)], 0.6));
        y += l[0];
      });
      // the icing over the top and down the outside (the right end)
      var t = o.icing;
      out += P.path('M' + N(-a - 1) + ' ' + N(-y + 1) + ' L' + N(-a - 1) + ' ' + N(-y - t + 1) + ' Q' + N(-a) + ' ' + N(-y - t - 1) + ' ' + N(-a + 4) + ' ' + N(-y - t - 1) + ' L' + N(a - 2) + ' ' + N(-y - t - 1) + ' Q' + N(a + 4) + ' ' + N(-y - t - 1) + ' ' + N(a + 4) + ' ' + N(-y) + ' L' + N(a + 4) + ' -1 Q' + N(a + 4) + ' 0 ' + N(a + 2) + ' 0 L' + N(a) + ' 0 L' + N(a) + ' ' + N(-y + 1) + ' Z', o.top, P.shade(o.top, -0.25), 0.8);
      out += P.path('M' + N(-a) + ' 0 L' + N(-a) + ' ' + N(-y) + ' M' + N(-a) + ' 0 L' + N(a) + ' 0', 'none', P.shade(o.layers[0][1], -0.3), 1);
      if (o.dust) out += P.g(P.at(0, -y - t - 1), P.crumbs(rnd, 18, a - 2, 1, ['#FFFFFF'], 0.8));
      if (o.rosette) out += P.path('M' + N(a - 16) + ' ' + N(-y - t) + ' C' + N(a - 16) + ' ' + N(-y - t - 10) + ' ' + N(a - 2) + ' ' + N(-y - t - 10) + ' ' + N(a - 2) + ' ' + N(-y - t) + ' Z', o.rosette, P.shade(o.rosette, -0.2), 0.8) + P.path('M' + N(a - 13) + ' ' + N(-y - t - 3) + ' Q' + N(a - 9) + ' ' + N(-y - t - 9) + ' ' + N(a - 5) + ' ' + N(-y - t - 3), 'none', P.shade(o.rosette, -0.15), 0.8);
      if (o.berry) out += P.path('M' + N(a - 24) + ' ' + N(-y - t) + ' Q' + N(a - 26) + ' ' + N(-y - t - 9) + ' ' + N(a - 19) + ' ' + N(-y - t - 10) + ' Q' + N(a - 13) + ' ' + N(-y - t - 9) + ' ' + N(a - 15) + ' ' + N(-y - t) + ' Z', '#C0392B', '#9E2B20', 0.7) + P.path('M' + N(a - 22) + ' ' + N(-y - t - 10) + ' l2 -2.5 l2 2.5', 'none', '#5E8C3A', 1.4);
      return out + P.line(-a + 3, -y + 3, -a + 3, -6, '#FFFFFF', 1, { opacity: '0.2' });
    };
  }
  function coneSide(col) {
    return function (P, rnd) {
      var top = -84, hw = 22, tri = [[-hw, top], [hw, top], [0, -0.5]], out = P.path('M' + N(-hw) + ' ' + N(top) + ' L-1.6 -1.5 Q0 0.6 1.6 -1.5 L' + N(hw) + ' ' + N(top) + ' Z', '#D9A24E', '#A8702A', 1);
      out += hatch(P, tri, 62, 8, '#B9802F', 0.9) + hatch(P, tri, 118, 8, '#B9802F', 0.9);
      out += P.rect(-hw - 2, top - 2, hw * 2 + 4, 6, 3, '#C98A3A', '#A8702A', 0.8);
      var sc = top - 15, ball = P.blob(rnd, 23, 21, 0.03, 12, 0, sc);
      out += P.path(ball, col, P.shade(col, -0.18), 1);
      for (var x = -22; x <= 22; x += 5.5) out += P.circle(x, top - 2.5 + Math.abs(x) * 0.05, 3.4, col, null, 0);
      out += P.path('M-25 ' + N(top - 2) + ' Q0 ' + N(top + 3) + ' 25 ' + N(top - 2), 'none', P.shade(col, -0.18), 0.8);
      if (col === '#F7EED6') out += P.g(P.at(0, sc), P.crumbs(rnd, 10, 14, 12, ['#3A2416'], 0.5));
      return out + P.hl(-8, sc - 9, 7, 3, '#FFFFFF', 0.55, -30);
    };
  }
  function cupSide(P, rnd) {
    var cup = [[-26, -34], [26, -34], [20, 0], [-20, 0]], col = '#F7EED6', out = P.path('M-26 -34 L26 -34 L20.5 -1.5 Q20 0 18.5 0 L-18.5 0 Q-20 0 -20.5 -1.5 Z', '#FFFFFF', '#D3CEC4', 1.2);
    out += hatch(P, cup, 96, 9, '#E8A0AA', 2.6, { opacity: '0.6' });
    out += P.path('M-25 -36 C-25 -64 25 -64 25 -36 Z', col, P.shade(col, -0.18), 1);
    for (var x = -24; x <= 24; x += 6) out += P.circle(x, -36, 3.4, col, null, 0);
    out += P.rect(-27.5, -36, 55, 4, 2, '#FFFFFF', '#D3CEC4', 1);
    out += P.g(P.at(14, -56, 25), P.rect(-4, -12, 8, 20, 1, '#E2B86A', '#B9802F', 0.8) + P.line(-4, -6, 4, -6, '#B9802F', 0.6) + P.line(-4, 0, 4, 0, '#B9802F', 0.6) + P.line(-4, 6, 4, 6, '#B9802F', 0.6));
    return out + P.hl(-8, -52, 6, 2.4, '#FFFFFF', 0.55, -25);
  }
  function pizza(P, rnd) {
    var a = 100, d = 'M' + N(-a) + ' -4 C' + N(-a) + ' -14 ' + N(-a + 5) + ' -17 ' + N(-a + 11) + ' -17 C' + N(-a + 18) + ' -17 ' + N(-a + 21) + ' -11 ' + N(-a + 24) + ' -5 L' + N(a - 24) + ' -5 C' + N(a - 21) + ' -11 ' + N(a - 18) + ' -17 ' + N(a - 11) + ' -17 C' + N(a - 5) + ' -17 ' + N(a) + ' -14 ' + N(a) + ' -4 Q' + N(a) + ' 0 ' + N(a - 4) + ' 0 L' + N(-a + 4) + ' 0 Q' + N(-a) + ' 0 ' + N(-a) + ' -4 Z';
    var out = P.path(d, '#E2B46A', '#B9802F', 1.1) + P.line(-a + 4, -0.8, a - 4, -0.8, '#C98A3A', 1.4, { opacity: '0.7' });
    out += P.rect(-a + 22, -6.8, 2 * a - 44, 2.2, 1, '#C0392B');
    var bumps = 'M' + N(-a + 22) + ' -6.5';
    for (var x = -a + 22; x < a - 22; x += 8) bumps += ' Q' + N(x + 4) + ' ' + N(-12 - rnd() * 2) + ' ' + N(x + 8) + ' -6.5';
    out += P.path(bumps + ' Z', '#F6D27A', '#E0B04A', 0.8);
    for (var k = 0; k < 8; k++) out += P.ellipse(-a + 30 + k * 20 + rnd() * 6, -10, 2.4, 1, '#C98A3A', null, 0, { opacity: '0.8' });
    [-52, -16, 22, 56].forEach(function (x) { out += P.g(P.at(x, -11.5, (rnd() - 0.5) * 8), P.path('M-9 0 Q0 3.5 9 0 L9 -1.8 Q0 1.6 -9 -1.8 Z', '#B5301F', '#7A1A10', 0.7)); });
    out += P.g(P.at(4, -13, -10), P.path(L.P.leafD(12, 5), '#4F7F2F', '#3E6A24', 0.5));
    [[-a + 6, -12], [-a + 13, -15.5], [a - 8, -14], [a - 15, -15.8], [a - 4, -8]].forEach(function (c) { out += P.ellipse(c[0], c[1], 2.4, 1.2, '#4A2E16', null, 0, { opacity: '0.8' }); });
    return out;
  }
  function saladPile(P, rnd) {
    var out = '', greens = ['#8DB255', '#6E9A3E', '#9CC067', '#5E8C3A', '#A34A6A'];
    for (var i = 0; i < 22; i++) {
      var x = -36 + 72 * ((i * 7) % 22) / 21 + (rnd() - 0.5) * 6, top = -34 * Math.sqrt(Math.max(0, 1 - (x / 48) * (x / 48))), y = Math.min(-6, top * (0.2 + rnd() * 0.65) - 4);
      out += P.leaf(24 + rnd() * 10, 9 + rnd() * 5, greens[i % greens.length], x, y, (rnd() - 0.5) * 100, { edge: L.P.shade(greens[i % greens.length], -0.25), ew: 0.6 });
    }
    [[-24, -6], [18, -14], [-4, -28]].forEach(function (c) { out += P.path('M' + N(c[0] - 6) + ' ' + N(c[1]) + ' A6 6 0 0 1 ' + N(c[0] + 6) + ' ' + N(c[1]) + ' Z', '#D9473B', '#A8302A', 0.7) + P.path('M' + N(c[0] - 4) + ' ' + N(c[1] - 0.5) + ' L' + N(c[0] + 4) + ' ' + N(c[1] - 0.5), 'none', '#F2D27A', 1); });
    [[30, -6], [8, -22]].forEach(function (c) { out += P.ellipse(c[0], c[1], 7, 2.2, '#CFE3A0', '#5E8C3A', 1); });
    return out + P.path('M-14 -18 Q-6 -24 2 -18', 'none', '#9B4A86', 1.6, { 'stroke-linecap': 'round' });
  }
  function riceDome(P, rnd) {
    var out = P.path('M-36 0 C-36 -20 -20 -30 0 -30 C20 -30 36 -20 36 0 Z', '#F4F1EA', '#D6D0C0', 1.1);
    for (var i = 0; i < 34; i++) { var x = (rnd() * 2 - 1) * 30, top = -28 * Math.sqrt(Math.max(0, 1 - (x / 34) * (x / 34))), y = top + 2 + rnd() * (-top - 4); out += P.ellipse(x, y, 1.6, 0.8, i % 2 ? '#FFFFFF' : '#E3DED0', null, 0, { transform: 'rotate(' + N(rnd() * 180) + ' ' + N(x) + ' ' + N(y) + ')' }); }
    return out + P.hl(-12, -22, 8, 2.4, '#FFFFFF', 0.6, -25);
  }
  function lasagne(P, rnd) {
    var a = 36, out = P.rect(-a, -42, 2 * a, 42, 3, '#9E3B22', '#6E2416', 1);
    out += P.g(P.at(0, -21), P.crumbs(rnd, 30, a - 3, 18, ['#7A2A16', '#B5503A'], 0.9));
    [-4, -17, -30].forEach(function (y, i) {
      var wave = function (yy) { return 'M' + N(-a) + ' ' + N(yy) + ' Q' + N(-a / 2) + ' ' + N(yy - 1.4 + i * 0.4) + ' 0 ' + N(yy) + ' T' + N(a) + ' ' + N(yy); };
      out += P.path(wave(y), 'none', '#F2D98A', 2.6) + P.path(wave(y - 3), 'none', '#F4EBCB', 3);
    });
    var top = 'M' + N(-a) + ' -38';
    for (var x = -a; x < a; x += 8) top += ' Q' + N(x + 4) + ' ' + N(-46 - rnd() * 2) + ' ' + N(x + 8) + ' -38';
    out += P.path(top + ' Z', '#E8B45A', '#B9802F', 0.9);
    for (var k = 0; k < 6; k++) out += P.ellipse(-a + 8 + k * 12 + rnd() * 4, -42 - rnd() * 2, 2.4, 1.1, '#B9772E', null, 0, { opacity: '0.85' });
    return out;
  }

  /* ---------- servingware profiles (from the side, the "From the side" scale) ---------- */
  var WARE = '#FFFFFF', WEDGE = '#D3CEC4';
  function plateSide(P) {
    return P.path('M-110 -10 Q-106 -1 -90 0 L90 0 Q106 -1 110 -10 Z', WARE, WEDGE, 1.6) + P.line(-110, -10, 110, -10, WEDGE, 1.6) + P.path('M-84 -8.6 L84 -8.6', 'none', '#EEEAE2', 1.2) + P.rect(-56, -1.5, 112, 1.5, 0.7, '#E6E1D6');
  }
  function pastaBowlSide(P) {
    return P.path('M-112 -34 Q-110 -30 -100 -29.5 L-82 -28 C-70 -26 -62 -6 -44 -1.5 L-40 0 L40 0 L44 -1.5 C62 -6 70 -26 82 -28 L100 -29.5 Q110 -30 112 -34 Z', WARE, WEDGE, 1.6) + P.line(-112, -34, 112, -34, WEDGE, 1.6) + P.path('M-74 -24 C-64 -14 -56 -6 -44 -3', 'none', '#EEEAE2', 2.2, { 'stroke-linecap': 'round' });
  }
  function deepBowlSide(P) {
    return P.path('M-75 -66 C-75 -30 -60 -6 -36 -2.5 L-32 0 L32 0 L36 -2.5 C60 -6 75 -30 75 -66 Z', WARE, WEDGE, 1.6) + P.line(-75, -66, 75, -66, WEDGE, 1.6) + P.path('M-74.4 -62 L74.4 -62', 'none', '#EEEAE2', 1.4) + P.path('M-62 -50 C-60 -30 -50 -14 -36 -8', 'none', '#EEEAE2', 2.4, { 'stroke-linecap': 'round' });
  }
  function boardSide(P, rnd) {
    var out = P.rect(-120, -14, 240, 14, 3, '#C99A62', '#8A6448', 1.4);
    for (var i = 0; i < 3; i++) { var y = -10.5 + i * 3.6, b = (rnd() - 0.5) * 2; out += P.path('M-114 ' + N(y) + ' Q-40 ' + N(y + b) + ' 20 ' + N(y) + ' T114 ' + N(y + b * 0.5), 'none', '#B98A55', 0.8, { opacity: '0.8' }); }
    return out + P.line(-114, -12.4, 100, -12.4, '#E2C08A', 1.2, { opacity: '0.7' }) + P.path('M-118 -10 Q-116 -7 -118 -4 M118 -10 Q116 -7 118 -4', 'none', '#8A6448', 0.8);
  }
  function skilletSide(P) {
    var out = P.path('M38 -25 L102 -36 Q112 -38 112 -32 Q112 -28 106 -27.5 L39 -17 Z', '#2E3034', '#1C1D1F', 1.2) + P.circle(104.5, -32, 2, '#5A5E63');
    out += P.path('M-112 -28 L38 -28 L32.5 -3 Q31.5 0 28 0 L-102 0 Q-105.5 0 -106.5 -3 Z', '#3A3D41', '#1C1D1F', 1.2);
    out += P.rect(-113.5, -31, 153, 4.5, 2.2, '#2E3034', '#1C1D1F', 1);
    return out + P.line(-100, -20, -30, -20, '#6A6F75', 1.6, { opacity: '0.7', 'stroke-linecap': 'round' }) + P.line(-104, -8, 26, -8, '#4A4E53', 1, { opacity: '0.8' });
  }
  function gnSide(P) {
    var out = P.path('M-104 -40 L104 -40 L100 -4 Q99.5 0 95 0 L-95 0 Q-99.5 0 -100 -4 Z', '#C4C9CF', '#8A9099', 1.2);
    out += P.rect(-110, -44, 220, 4.5, 1.5, '#B9BEC5', '#8A9099', 1) + P.line(-103, -34, 103, -34, '#A9AFB6', 1.2);
    [-70, -30, 20, 64].forEach(function (x) { out += P.line(x, -31, x - 2, -5, '#FFFFFF', 3, { opacity: '0.35', 'stroke-linecap': 'round' }); });
    return out;
  }
  function ramekinSide(P) {
    var out = P.path('M-30 -32 L30 -32 L29 -2 Q29 0 27 0 L-27 0 Q-29 0 -29 -2 Z', WARE, WEDGE, 1.4);
    for (var x = -25; x <= 25; x += 5) out += P.line(x, -30, x * 0.97, -2, '#E6E1D6', 1.1);
    return out + P.rect(-31.5, -35, 63, 4, 2, WARE, WEDGE, 1.2) + P.line(-24, -1.2, 24, -1.2, '#E6E1D6', 1);
  }

  var SAUCE = window.LK_LIB.SAUCE || {};
  var bunCol = '#D99A52';
  L.add('build', [
    // burger layers
    { id: 'side-bun-top-sesame', name: 'Sesame bun top, side view', sub: 'Burger layers', kw: 'bun top crown sesame seed burger bun lid side build', form: 'layer', cook: 'baked', role: 'bread', n: 1, w: 150, h: 40, side: { s: 'mound', h: 40, c: bunCol }, draw: bunTop({ col: bunCol, seeds: 18 }) },
    { id: 'side-bun-top-brioche', name: 'Brioche bun top, side view', sub: 'Burger layers', kw: 'brioche bun top glossy shiny burger bun side build', form: 'layer', cook: 'baked', role: 'bread', n: 1, w: 150, h: 44, of: 'side-bun-top-sesame', side: { s: 'mound', h: 44, c: '#C2702E' }, draw: bunTop({ col: '#C2702E', h: 44, sh: 0.86, gloss: true }) },
    { id: 'side-bun-top-milk', name: 'Milk bun top, side view', sub: 'Burger layers', kw: 'milk bun soft bun top potato bun floured burger side build', form: 'layer', cook: 'baked', role: 'bread', n: 1, w: 150, h: 36, of: 'side-bun-top-sesame', side: { s: 'mound', h: 36, c: '#E8BC80' }, draw: bunTop({ col: '#E8BC80', h: 36, sh: 0.7, flour: 26 }) },
    { id: 'side-bun-base', name: 'Bun base, side view', sub: 'Burger layers', kw: 'bun base heel bottom bun burger side build', form: 'layer', cook: 'baked', role: 'bread', n: 1, w: 150, h: 18, side: { s: 'slab', h: 18, c: '#D69A55' }, draw: bunBase({}) },
    { id: 'side-beef-patty', name: 'Beef patty, side view', sub: 'Burger layers', kw: 'beef patty burger patty pattie meat side build', form: 'layer', cook: 'grilled', role: 'main', n: 1, w: 156, h: 23, side: { s: 'slab', h: 22, c: '#6B4420' }, draw: beefPatty },
    { id: 'side-smash-patty', name: 'Smash patty, side view', sub: 'Burger layers', kw: 'smash patty smashed burger thin lacy crispy edge side build', form: 'layer', cook: 'grilled', role: 'main', n: 1, w: 170, h: 10, side: { s: 'layer', h: 8, c: '#5E3818' }, draw: smashPatty },
    { id: 'side-chicken-fillet-crumbed', name: 'Crumbed chicken fillet, side view', sub: 'Burger layers', kw: 'crumbed chicken fillet thigh schnitzel burger side build fried', form: 'layer', cook: 'crumbed', role: 'main', n: 1, w: 150, h: 24, side: { s: 'slab', h: 22, c: '#D9A24E' }, draw: crumbedFillet },
    { id: 'side-fish-fillet-battered', name: 'Battered fish fillet, side view', sub: 'Burger layers', kw: 'battered fish fillet fish burger beer batter side build', form: 'layer', cook: 'battered', role: 'main', n: 1, w: 156, h: 28, side: { s: 'slab', h: 26, c: '#E3AE4E' }, draw: batteredFillet },
    { id: 'side-cheese-slice', name: 'Cheese slice, melting, side view', sub: 'Burger layers', kw: 'cheese slice melted melting american cheese cheddar burger side build drip', form: 'layer', role: 'topping', n: 1, w: 160, h: 18, side: { s: 'layer', h: 4, c: '#F2C14E' }, draw: cheeseSlice },
    { id: 'side-lettuce-leaf', name: 'Lettuce leaf, side view', sub: 'Burger layers', kw: 'lettuce leaf cos iceberg oak leaf frilly burger side build', form: 'layer', cook: 'fresh', role: 'topping', n: 1, w: 166, h: 17, side: { s: 'layer', h: 8, c: '#8DB255' }, draw: lettuce },
    { id: 'side-tomato-slices', name: 'Tomato slices, side view', sub: 'Burger layers', kw: 'tomato slices sliced tomato burger side build', form: 'layer', cook: 'fresh', role: 'topping', n: 2, w: 146, h: 10, side: { s: 'layer', h: 9, c: '#D9473B' }, draw: slices({ at: [-37, 37], w: 70, h: 9, col: '#D9473B', top: '#EC6A5C', seeds: '#F2D27A' }) },
    { id: 'side-beetroot-slices', name: 'Beetroot slices, side view', sub: 'Burger layers', kw: 'beetroot slices beet burger aussie side build', form: 'layer', cook: 'fresh', role: 'topping', n: 2, w: 148, h: 8, side: { s: 'layer', h: 7, c: '#8E2A52' }, draw: slices({ at: [-37, 37], w: 72, h: 7, col: '#8E2A52', top: '#B5507A', face: 2.6, rings: '#D27A9E' }) },
    { id: 'side-pineapple-ring', name: 'Pineapple ring, grilled, side view', sub: 'Burger layers', kw: 'pineapple ring grilled burger aussie side build', form: 'layer', cook: 'grilled', role: 'topping', n: 1, w: 120, h: 12, side: { s: 'layer', h: 12, c: '#F2CB55' }, draw: pineappleRing },
    { id: 'side-onion-rings', name: 'Onion rings, side view', sub: 'Burger layers', kw: 'onion rings battered fried crumbed burger side build', form: 'layer', cook: 'battered', role: 'topping', n: 2, w: 148, h: 20, side: { s: 'layer', h: 19, c: '#D9A04A' }, draw: onionRings },
    { id: 'side-onion-raw', name: 'Raw onion slices, side view', sub: 'Burger layers', kw: 'raw onion red onion rings sliced onion burger side build', form: 'layer', cook: 'raw', role: 'topping', n: 3, w: 146, h: 9, side: { s: 'layer', h: 5, c: '#9B4A86' }, draw: onionRaw },
    { id: 'side-pickles', name: 'Pickles, side view', sub: 'Burger layers', kw: 'pickles pickle gherkin dill pickle crinkle cut burger side build', form: 'layer', role: 'topping', n: 4, w: 142, h: 9, side: { s: 'layer', h: 6, c: '#6E8E34' }, draw: pickles },
    { id: 'side-bacon', name: 'Bacon rashers, side view', sub: 'Burger layers', kw: 'bacon rashers streaky crispy burger side build', form: 'layer', cook: 'fried', role: 'topping', n: 2, w: 150, h: 14, side: { s: 'layer', h: 8, c: '#B5503F' }, draw: bacon },
    { id: 'side-fried-egg', name: 'Fried egg, side view', sub: 'Burger layers', kw: 'fried egg sunny side up yolk burger aussie side build', form: 'layer', cook: 'fried', role: 'topping', n: 1, w: 128, h: 20, side: { s: 'layer', h: 9, c: '#FFFFFF' }, draw: friedEgg },
    { id: 'side-sauce-layer', name: 'Sauce layer, dripping, side view', sub: 'Burger layers', kw: 'sauce layer drip aioli mayo mayonnaise ranch garlic burger side build', form: 'layer', role: 'sauce', g: 20, w: 152, h: 17, side: { s: 'layer', h: 3, c: '#F3E6C2' }, draw: sauceLayer(SAUCE.aioli || '#F3E6C2') },
    { id: 'side-sauce-tomato', name: 'Tomato sauce layer, dripping, side view', sub: 'Burger layers', kw: 'tomato sauce ketchup red sauce drip burger side build', form: 'layer', role: 'sauce', g: 20, w: 152, h: 17, of: 'side-sauce-layer', side: { s: 'layer', h: 3, c: '#C0392B' }, draw: sauceLayer(SAUCE.ketchup || '#C0392B', [[-40, 6], [-6, 9], [30, 5], [58, 7]]) },
    { id: 'side-sauce-bbq', name: 'Barbecue sauce layer, dripping, side view', sub: 'Burger layers', kw: 'bbq sauce barbecue smoky brown drip burger side build', form: 'layer', role: 'sauce', g: 20, w: 152, h: 17, of: 'side-sauce-layer', side: { s: 'layer', h: 3, c: '#5E2A12' }, draw: sauceLayer(SAUCE.bbq || '#5E2A12', [[-54, 7], [-20, 5], [12, 9], [44, 6]]) },
    { id: 'side-sauce-burger', name: 'Burger sauce layer, dripping, side view', sub: 'Burger layers', kw: 'burger sauce special sauce thousand island big mac sauce drip side build', form: 'layer', role: 'sauce', g: 20, w: 152, h: 17, of: 'side-sauce-layer', side: { s: 'layer', h: 3, c: '#EEA07A' }, draw: sauceLayer(SAUCE.thousand || '#EEA07A', [[-46, 8], [-12, 5], [22, 8], [52, 6]]) },
    { id: 'side-avocado-slices', name: 'Avocado slices, side view', sub: 'Burger layers', kw: 'avocado avo slices sliced burger side build', form: 'layer', cook: 'fresh', role: 'topping', g: 40, w: 152, h: 12, side: { s: 'layer', h: 8, c: '#C9DE8A' }, draw: avocado },
    { id: 'side-pulled-pork', name: 'Pulled pork, side view', sub: 'Burger layers', kw: 'pulled pork shredded pork bbq burger slider side build', form: 'layer', cook: 'braised', role: 'main', g: 120, w: 146, h: 18, side: { s: 'layer', h: 14, c: '#7A3F1E' }, draw: pulledPork },
    { id: 'side-slaw', name: 'Coleslaw layer, side view', sub: 'Burger layers', kw: 'coleslaw slaw cabbage carrot burger side build', form: 'layer', cook: 'fresh', role: 'topping', g: 40, w: 146, h: 16, side: { s: 'layer', h: 12, c: '#F1EEDC' }, draw: slaw },
    // stack layers
    { id: 'side-turkish-top', name: 'Turkish roll top, side view', sub: 'Stack layers', kw: 'turkish roll top turkish bread pide steak sandwich lid side build', form: 'layer', cook: 'baked', role: 'bread', n: 1, w: 172, h: 30, side: { s: 'slab', h: 30, c: '#DDAA5E' }, draw: turkishTop },
    { id: 'side-turkish-base', name: 'Turkish roll base, side view', sub: 'Stack layers', kw: 'turkish roll base turkish bread pide steak sandwich bottom side build', form: 'layer', cook: 'baked', role: 'bread', n: 1, w: 172, h: 24, side: { s: 'slab', h: 24, c: '#DDAA5E' }, draw: turkishBase },
    { id: 'side-caramelised-onion', name: 'Caramelised onion, side view', sub: 'Stack layers', kw: 'caramelised onion caramelized onion jam fried onion steak sandwich burger side build', form: 'layer', cook: 'fried', role: 'topping', g: 40, w: 140, h: 10, side: { s: 'layer', h: 6, c: '#8A4A22' }, draw: caramelOnion },
    { id: 'side-minute-steak', name: 'Minute steak, side view', sub: 'Stack layers', kw: 'minute steak thin steak sandwich steak scotch side build', form: 'layer', cook: 'grilled', role: 'main', n: 1, w: 150, h: 11, side: { s: 'layer', h: 10, c: '#7A4A26' }, draw: minuteSteak },
    { id: 'side-steak-sandwich', name: 'Steak sandwich, side view', sub: 'Stack layers', kw: 'steak sandwich steak sanga turkish roll beetroot egg lettuce tomato onion layers build', form: 'stack', role: 'main', n: 1, w: 172, h: 98, side: { s: 'slab', h: 96, c: '#DDAA5E' }, draw: stack([[turkishBase, 24], [slices({ at: [-37, 37], w: 72, h: 7, col: '#8E2A52', top: '#B5507A', face: 2.6, rings: '#D27A9E' }), 6], [slices({ at: [-37, 37], w: 70, h: 9, col: '#D9473B', top: '#EC6A5C', seeds: '#F2D27A' }), 8], [lettuce, 6], [minuteSteak, 10], [cheeseSlice, 3], [caramelOnion, 6], [sauceLayer('#F3E6C2'), 3], [turkishTop, 30]]) },
    { id: 'side-cheeseburger', name: 'Cheeseburger, side view', sub: 'Stack layers', kw: 'cheeseburger cheese burger classic burger stack assembled layers build', form: 'stack', role: 'main', n: 1, w: 166, h: 106, side: { s: 'slab', h: 104, c: bunCol }, draw: stack([[bunBase({}), 18], [sauceLayer('#EEA07A'), 3], [lettuce, 6], [beefPatty, 22], [cheeseSlice, 3], [pickles, 6], [onionRaw, 5], [bunTop({ col: bunCol, seeds: 18 }), 40]]) },
    { id: 'side-eggs-benedict', name: 'Eggs Benedict, side view', sub: 'Stack layers', kw: 'eggs benedict eggs benny poached egg hollandaise english muffin ham stack brunch', form: 'stack', role: 'main', n: 1, w: 92, h: 42, side: { s: 'mound', h: 40, c: '#F2D27A' }, draw: stack([[muffin, 14.5], [ham, 3], [poachedEgg, 22]]) },
    // mains from the side
    { id: 'side-schnitzel', name: 'Schnitzel, side view', sub: 'Mains from the side', kw: 'schnitzel schnitty chicken schnitzel crumbed side view from the side', form: 'piece', cook: 'crumbed', role: 'main', n: 1, w: 136, h: 10, side: { s: 'slab', h: 9, c: '#D9A24E' }, draw: schnitzel },
    { id: 'side-parmy', name: 'Parmy, side view', sub: 'Mains from the side', kw: 'parmy parmigiana parma schnitzel napoli cheese melted side view', form: 'piece', cook: 'crumbed', role: 'main', n: 1, w: 136, h: 22, side: { s: 'slab', h: 17, c: '#F6D27A' }, draw: parmy },
    { id: 'side-steak', name: 'Steak, side view', sub: 'Mains from the side', kw: 'steak rump sirloin porterhouse side view crust pink medium rare', form: 'piece', cook: 'grilled', role: 'main', n: 1, w: 96, h: 18, side: { s: 'slab', h: 18, c: '#5A3618' }, draw: steakSide({ w: 96, h: 18, fat: true }) },
    { id: 'side-eye-fillet', name: 'Eye fillet, side view', sub: 'Mains from the side', kw: 'eye fillet tenderloin medallion filet mignon side view pink', form: 'piece', cook: 'grilled', role: 'main', n: 1, w: 62, h: 30, of: 'side-steak', side: { s: 'slab', h: 30, c: '#5A3618' }, draw: steakSide({ w: 62, h: 30, re: 9 }) },
    { id: 'side-mash', name: 'Mash mound, side view', sub: 'Mains from the side', kw: 'mash mashed potato mound potato side view', form: 'piece', role: 'starch', g: 150, w: 92, h: 38, side: { s: 'mound', h: 36, c: '#F3EBD2' }, draw: mash },
    { id: 'side-chips', name: 'Chips pile, side view', sub: 'Mains from the side', kw: 'chips fries hot chips pile side view chippies', form: 'piece', cook: 'fried', role: 'starch', g: 150, w: 100, h: 40, side: { s: 'pile', h: 38, c: '#E8BB5A' }, draw: chipsPile },
    { id: 'side-pie', name: 'Pie, side view', sub: 'Mains from the side', kw: 'pie meat pie beef pie pastry lid crimped side view', form: 'piece', cook: 'baked', role: 'main', n: 1, w: 92, h: 47, side: { s: 'slab', h: 46, c: '#D9A055' }, draw: pie },
    { id: 'side-cake-chocolate', name: 'Chocolate cake slice, side view', sub: 'Mains from the side', kw: 'chocolate cake slice layer cake ganache dessert side view', form: 'piece', role: 'dessert', n: 1, w: 74, h: 62, side: { s: 'slab', h: 54, c: '#6B3A1E' }, draw: cakeSide({ layers: [[13, '#6B3A1E', 1], [4, '#F4EBDC'], [13, '#6B3A1E', 1], [4, '#F4EBDC'], [12, '#6B3A1E', 1]], icing: 4, top: '#3E1E10', rosette: '#F4EBDC', berry: true }) },
    { id: 'side-cake-sponge', name: 'Sponge cake slice, side view', sub: 'Mains from the side', kw: 'sponge cake victoria sponge jam cream slice dessert side view', form: 'piece', role: 'dessert', n: 1, w: 74, h: 52, of: 'side-cake-chocolate', side: { s: 'slab', h: 48, c: '#F0D49A' }, draw: cakeSide({ layers: [[20, '#F0D49A', 1], [3, '#C0392B'], [5, '#FBF6E8'], [20, '#F0D49A', 1]], icing: 1.5, top: '#E8C682', dust: true }) },
    { id: 'side-ice-cream-cone', name: 'Ice cream cone, side view', sub: 'Mains from the side', kw: 'ice cream cone waffle cone scoop vanilla gelato dessert side view', form: 'piece', role: 'dessert', n: 1, w: 50, h: 122, side: { s: 'scoop', h: 122, c: '#F7EED6' }, draw: coneSide('#F7EED6') },
    { id: 'side-ice-cream-cone-chocolate', name: 'Chocolate ice cream cone, side view', sub: 'Mains from the side', kw: 'chocolate ice cream cone scoop gelato dessert side view', form: 'piece', role: 'dessert', n: 1, w: 50, h: 122, of: 'side-ice-cream-cone', side: { s: 'scoop', h: 122, c: '#6B3A1E' }, draw: coneSide('#6B3A1E') },
    { id: 'side-ice-cream-cone-strawberry', name: 'Strawberry ice cream cone, side view', sub: 'Mains from the side', kw: 'strawberry ice cream cone pink scoop gelato dessert side view', form: 'piece', role: 'dessert', n: 1, w: 50, h: 122, of: 'side-ice-cream-cone', side: { s: 'scoop', h: 122, c: '#F2A6B0' }, draw: coneSide('#F2A6B0') },
    { id: 'side-ice-cream-cup', name: 'Ice cream in a cup, side view', sub: 'Mains from the side', kw: 'ice cream cup scoop wafer kids sundae dessert side view', form: 'piece', role: 'dessert', n: 1, w: 56, h: 72, side: { s: 'scoop', h: 66, c: '#F7EED6' }, draw: cupSide },
    { id: 'side-pizza', name: 'Pizza, side view', sub: 'Mains from the side', kw: 'pizza edge crust cornicione base profile pepperoni side view', form: 'piece', cook: 'baked', role: 'main', n: 1, w: 200, h: 18, side: { s: 'disc', h: 17, c: '#E2B46A' }, draw: pizza },
    { id: 'side-salad-pile', name: 'Salad pile, side view', sub: 'Mains from the side', kw: 'salad pile leaves garden salad side salad tomato cucumber side view', form: 'piece', cook: 'fresh', role: 'salad', g: 60, w: 96, h: 44, side: { s: 'pile', h: 40, c: '#8DB255' }, draw: saladPile },
    { id: 'side-rice-dome', name: 'Rice dome, side view', sub: 'Mains from the side', kw: 'rice dome moulded rice steamed rice jasmine side view', form: 'piece', cook: 'steamed', role: 'starch', g: 150, w: 72, h: 30, side: { s: 'mound', h: 30, c: '#F4F1EA' }, draw: riceDome },
    { id: 'side-lasagne', name: 'Lasagne slice, side view', sub: 'Mains from the side', kw: 'lasagne lasagna slice layers pasta bechamel ragu side view', form: 'piece', cook: 'baked', role: 'main', g: 350, w: 72, h: 48, side: { s: 'slab', h: 44, c: '#9E3B22' }, draw: lasagne },
    // servingware profiles
    { id: 'side-ware-dinner-plate', name: 'Dinner plate, side view', sub: 'Servingware profiles', kw: 'dinner plate plate profile side view 30 cm', form: 'piece', role: 'main', n: 1, w: 220, h: 10, side: { s: 'disc', h: 10, c: '#FFFFFF' }, draw: plateSide },
    { id: 'side-ware-pasta-bowl', name: 'Pasta bowl, side view', sub: 'Servingware profiles', kw: 'pasta bowl wide rim bowl profile side view', form: 'piece', role: 'main', n: 1, w: 224, h: 34, side: { s: 'cup', h: 34, c: '#FFFFFF' }, draw: pastaBowlSide },
    { id: 'side-ware-deep-bowl', name: 'Deep bowl, side view', sub: 'Servingware profiles', kw: 'deep bowl soup bowl salad bowl profile side view', form: 'piece', role: 'main', n: 1, w: 150, h: 66, side: { s: 'cup', h: 66, c: '#FFFFFF' }, draw: deepBowlSide },
    { id: 'side-ware-board', name: 'Board, side view', sub: 'Servingware profiles', kw: 'board wooden board serving board chopping board profile side view', form: 'piece', role: 'main', n: 1, w: 240, h: 14, side: { s: 'slab', h: 14, c: '#C99A62' }, draw: boardSide },
    { id: 'side-ware-skillet', name: 'Skillet, side view', sub: 'Servingware profiles', kw: 'skillet cast iron pan frying pan profile side view', form: 'piece', role: 'main', n: 1, w: 226, h: 38, side: { s: 'cup', h: 30, c: '#3A3D41' }, draw: skilletSide },
    { id: 'side-ware-gn-pan', name: 'GN pan, side view', sub: 'Servingware profiles', kw: 'gn pan gastronorm hotel pan bain marie tray steel profile side view', form: 'piece', role: 'main', n: 1, w: 220, h: 44, side: { s: 'cup', h: 44, c: '#C4C9CF' }, draw: gnSide },
    { id: 'side-ware-ramekin', name: 'Ramekin, side view', sub: 'Servingware profiles', kw: 'ramekin fluted ramekin sauce pot profile side view', form: 'piece', role: 'main', n: 1, w: 63, h: 35, side: { s: 'cup', h: 35, c: '#FFFFFF' }, draw: ramekinSide }
  ]);
  // the helpers, for the other category files (a bun from the side, a layer with drips, a whole stack)
  L.BUILD = { bunTop: bunTop, bunBase: bunBase, layerD: layerD, dripD: dripD, hatch: hatch, stack: stack, slices: slices, steakSide: steakSide, cakeSide: cakeSide, coneSide: coneSide };
})();
