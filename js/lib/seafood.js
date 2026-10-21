/* The drawing library: fish and seafood (see js/library.js for the fields). Drawn around 0,0, 1 unit is about 1.5 mm. */
(function () {
  'use strict';
  var L = window.LK_LIB, C = L.P.C, N = L.P.n;
  var ROUND = { 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  var FLESH = '#F3E6CA', WHITE_FISH = '#F4ECDC', BATTER = '#E0A445', PRAWN = '#F6C6A2', PRAWN_RED = '#E5673A', TAIL = '#D9542A';
  var SHELL = '#D4512C', SALMON = '#F27B4E', TUNA = '#B8283A', RICE = '#F7F4EC', TIP = '#2E2420';

  /* ---------- shared bits ---------- */
  function sc(pts, sx, sy, dx, dy) { if (sy === undefined) sy = sx; return pts.map(function (p) { return [p[0] * sx + (dx || 0), p[1] * sy + (dy || 0)]; }); }
  function poly(pts) { return 'M' + pts.map(function (p) { return N(p[0]) + ' ' + N(p[1]); }).join(' L') + ' Z'; }
  function circD(r, cx, cy) { cx = cx || 0; cy = cy || 0; return 'M' + N(cx - r) + ' ' + N(cy) + ' A' + N(r) + ' ' + N(r) + ' 0 1 0 ' + N(cx + r) + ' ' + N(cy) + ' A' + N(r) + ' ' + N(r) + ' 0 1 0 ' + N(cx - r) + ' ' + N(cy) + ' Z'; }
  // pieces placed one by one: [x, y, turn, size, draw(P, rnd)], drawn in the order given (back to front)
  function group(list) { return function (P, rnd) { return list.map(function (it) { return P.g(P.at(it[0], it[1], it[2] || 0, it[3] || 1), it[4](P, rnd)); }).join(''); }; }

  /* ---------- fish fillets ---------- */
  // a fillet: a blunt head end on the left, finer to the tail on the right, the belly side fuller
  function filletPts(rnd, len, wid, o) {
    o = o || {};
    var k = o.k || 20, a = len / 2, b = wid / 2, tail = o.tail === undefined ? 0.55 : o.tail, out = [];
    for (var i = 0; i < k; i++) {
      var t = i / k * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
      var x = (c < 0 ? -Math.pow(-c, 0.7) : Math.pow(c, 1.15)) * a, u = (x / a + 1) / 2;
      var j = 1 + (rnd() * 2 - 1) * (o.wob === undefined ? 0.025 : o.wob) + (o.bump ? (i % 2 ? o.bump : -o.bump * 0.6) : 0);
      var y = s * b * (1 - tail * Math.pow(u, 1.8)) * (s > 0 ? 1.08 : 0.92) * j;
      out.push([x * (o.bump ? 1 + (j - 1) * 0.4 : 1), y + (o.bend || 0) * (x / a) * (x / a) * b]);
    }
    return out;
  }
  // the half height of a fillet at x, and how far its middle bends there
  function edgeH(len, wid, x, o) {
    var a = len / 2, tail = o && o.tail !== undefined ? o.tail : 0.55, r = Math.min(1, Math.abs(x) / a), c = x < 0 ? Math.pow(r, 1 / 0.7) : Math.pow(r, 1 / 1.15), u = Math.max(0, Math.min(1, (x / a + 1) / 2));
    return wid / 2 * (1 - tail * Math.pow(u, 1.8)) * Math.sqrt(Math.max(0, 1 - c * c));
  }
  function bendY(len, wid, x, o) { var a = len / 2; return (o && o.bend || 0) * (x / a) * (x / a) * wid / 2; }
  // count spots inside a fillet, back to front: fn(x, y, i, rnd)
  function inFillet(rnd, count, len, wid, o, fn, m) {
    var a = len / 2, pts = [];
    for (var i = 0; i < count; i++) { var x = (rnd() * 2 - 1) * a * 0.8, h = edgeH(len, wid, x, o) * (m || 0.72); pts.push([x, (rnd() * 2 - 1) * h + bendY(len, wid, x, o)]); }
    pts.sort(function (p, q) { return p[1] - q[1]; });
    return pts.map(function (p, i) { return fn(p[0], p[1], i, rnd); }).join('');
  }
  // the flake lines across cooked fish
  function flakes(P, len, wid, o, col, gap) {
    var out = '', a = len / 2;
    for (var x = -a * 0.7; x < a * 0.72; x += gap) {
      var h = edgeH(len, wid, x, o) * 0.8, by = bendY(len, wid, x, o);
      out += P.path('M' + N(x) + ' ' + N(-h * 0.9 + by) + ' Q' + N(x + gap * 0.55) + ' ' + N(by) + ' ' + N(x) + ' ' + N(h + by), 'none', col, 0.8, { opacity: '0.55', 'stroke-linecap': 'round' });
    }
    return out;
  }
  // grilled or pan-seared fillet, flesh side up (o.rim: the skin showing round the edge; o.marks false: no grill marks)
  function grilledFillet(o) {
    return function (P, rnd) {
      var pts = filletPts(rnd, o.len, o.wid, o), d = P.smooth(pts), col = o.col || FLESH, out = P.shadow(d);
      if (o.rim) out += P.path(d, o.rim, P.shade(o.rim, -0.3), 1.1) + P.path(P.smooth(sc(pts, 0.95, 0.84)), col, null, 0);
      else out += P.path(d, col, P.shade(col, -0.3), 1.1);
      out += P.path(P.smooth(sc(pts, 0.84, 0.7, -o.len * 0.02)), o.sear || '#E8C68A', null, 0, { opacity: o.rim ? '0.55' : '0.7' });
      out += flakes(P, o.len, o.wid, o, P.shade(col, -0.24), o.len / 9);
      if (o.marks !== false) out += P.g(P.at(-o.len * 0.05, bendY(o.len, o.wid, 0, o)), P.grill(o.len * 0.36, o.wid * 0.32, 35, o.gap || 13, '#8E5E2E', 2.6));
      out += P.hl(-o.len * 0.12, -o.wid * 0.2, o.len * 0.22, o.wid * 0.07, '#FFFFFF', 0.35, -6);
      return out;
    };
  }
  // golden puffs and dark specks over batter
  function batterTex(P, rnd, rx, ry, col) {
    return P.scatter(rnd, Math.max(5, Math.round(rx * ry / 50)), rx, ry, function (x, y, i, q) { return P.path(P.blob(q, 2.5 + q() * 3.5, 2 + q() * 2.5, 0.3, 7, x, y), P.shade(col, 0.32), null, 0, { opacity: '0.75' }); }) +
      P.crumbs(rnd, Math.max(3, Math.round(rx * ry / 70)), rx, ry, [P.shade(col, -0.24)], 0.8);
  }
  // battered fillet: a bumpy golden coat
  function battered(o) {
    return function (P, rnd) {
      var pts = filletPts(rnd, o.len, o.wid, { k: o.k || 30, bump: 0.045, wob: 0.035, tail: o.tail === undefined ? 0.45 : o.tail, bend: o.bend }), d = P.smooth(pts), col = o.col || BATTER, out = P.shadow(d);
      out += P.path(d, col, P.shade(col, -0.3), 1.1);
      out += P.path(P.smooth(sc(pts, 0.84, 0.72)), P.shade(col, 0.14), null, 0, { opacity: '0.8' });
      out += P.g(P.at(-o.len * 0.06, 0), batterTex(P, rnd, o.len * 0.34, o.wid * 0.28, col));
      out += P.hl(-o.len * 0.14, -o.wid * 0.22, o.len * 0.22, o.wid * 0.07, '#FFFFFF', 0.3, -6);
      return out;
    };
  }
  // crumbed fillet: golden with crumbs
  function crumbedFillet(o) {
    return function (P, rnd) {
      var oo = { k: 22, wob: 0.05, tail: o.tail === undefined ? 0.45 : o.tail }, pts = filletPts(rnd, o.len, o.wid, oo), d = P.smooth(pts), col = o.col || C.golden, out = P.shadow(d);
      out += P.path(d, col, P.shade(col, -0.3), 1.1);
      out += P.path(P.smooth(sc(pts, 0.84, 0.72)), P.shade(col, 0.12), null, 0, { opacity: '0.85' });
      out += inFillet(rnd, Math.round(o.len * o.wid / 40), o.len, o.wid, oo, function (x, y, i, q) { return P.circle(x, y, 0.7 + q() * 0.8, [P.shade(col, -0.24), P.shade(col, 0.32), C.crumbDark][i % 3]); }, 0.82);
      out += P.hl(-o.len * 0.14, -o.wid * 0.22, o.len * 0.22, o.wid * 0.07, '#FFFFFF', 0.28, -6);
      return out;
    };
  }
  // skin side up: the flesh shows round the edge; crispy blisters, scores, speckles or spots on the skin
  function skinFillet(o) {
    return function (P, rnd) {
      var pts = filletPts(rnd, o.len, o.wid, o), d = P.smooth(pts), out = P.shadow(d), a = o.len / 2, so = { tail: o.tail };
      out += P.path(d, o.flesh, P.shade(o.flesh, -0.3), 1.1);
      out += P.path(P.smooth(sc(pts, 0.94, 0.84)), o.skin, P.shade(o.skin, -0.25), 0.7);
      out += P.path(P.smooth(sc(pts, 0.82, 0.36, -a * 0.04, -o.wid * 0.2)), P.shade(o.skin, -0.2), null, 0, { opacity: '0.4' });
      if (o.blister) out += inFillet(rnd, o.blister, o.len * 0.92, o.wid * 0.84, so, function (x, y, i, q) { return P.path(P.blob(q, 2 + q() * 3, 1.5 + q() * 2, 0.3, 6, x, y), P.shade(o.skin, 0.3), null, 0, { opacity: '0.6' }); });
      if (o.speck) out += inFillet(rnd, o.speck, o.len * 0.92, o.wid * 0.84, so, function (x, y, i, q) { return P.circle(x, y, 0.6 + q() * 0.9, o.speckCol || '#3A342E', null, 0, { opacity: '0.8' }); });
      if (o.spots) out += inFillet(rnd, o.spots, o.len * 0.92, o.wid * 0.84, so, function (x, y, i, q) { return P.circle(x, y, 0.9 + q() * 0.6, o.spotCol || '#3E78B4', null, 0, { opacity: '0.9' }); });
      (o.scores || []).forEach(function (f) {
        var x = f * a, h = edgeH(o.len, o.wid, x, o) * 0.68;
        out += P.line(x + h * 0.35, -h, x - h * 0.35, h, P.shade(o.skin, -0.45), 3.2) + P.line(x + h * 0.3, -h * 0.85, x - h * 0.3, h * 0.85, o.flesh, 1.2);
      });
      out += P.hl(-a * 0.1, -o.wid * 0.22, a * 0.5, o.wid * 0.06, '#FFFFFF', 0.4, -4);
      return out;
    };
  }
  // salmon or trout portion, flesh side up: orange with white fat lines, a seared top
  function salmonPortion(o) {
    return function (P, rnd) {
      var rx = o.rx, ry = o.ry, col = o.col || '#F0905E', d = P.slab(rnd, rx, ry, 0.55, 0.03, 16), out = P.shadow(d);
      out += P.path(d, col, P.shade(col, -0.28), 1.1);
      for (var x = -rx + 7; x < rx - 3; x += o.gap || 8.5) {
        var h = ry * 0.9 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x) / rx, 4.2)), 1 / 4.2);
        out += P.path('M' + N(x) + ' ' + N(-h) + ' Q' + N(x + 7) + ' 0 ' + N(x) + ' ' + N(h), 'none', '#FCE6D8', 1.4, { opacity: '0.85', 'stroke-linecap': 'round' });
      }
      if (o.sear) out += P.path(P.slab(rnd, rx * 0.76, ry * 0.68, 0.5, 0.08, 14), o.sear, null, 0, { opacity: '0.6' }) + P.crumbs(rnd, 14, rx * 0.6, ry * 0.5, [P.shade(o.sear, -0.25)], 1);
      out += P.hl(-rx * 0.3, -ry * 0.4, rx * 0.35, ry * 0.1, '#FFFFFF', 0.3, -8);
      return out;
    };
  }
  // a whole fish lying on its side: tail, fins, head with eye and gill, scored and grilled
  function wholeFish(o) {
    return function (P, rnd) {
      var a = o.len / 2, H = o.ht / 2, skin = o.skin || '#C49A60', dk = P.shade(skin, -0.32), fin = P.shade(skin, -0.12), out = '';
      var tail = 'M' + N(a - 8) + ' ' + N(-H * 0.14) + ' L' + N(a + 24) + ' ' + N(-H * 0.86) + ' Q' + N(a + 14) + ' 0 ' + N(a + 24) + ' ' + N(H * 0.86) + ' L' + N(a - 8) + ' ' + N(H * 0.14) + ' Z';
      var dorsal = 'M' + N(-a * 0.42) + ' ' + N(-H * 0.86) + ' Q' + N(-a * 0.1) + ' ' + N(-H * 1.3) + ' ' + N(a * 0.5) + ' ' + N(-H * 0.6) + ' Z';
      var anal = 'M' + N(a * 0.1) + ' ' + N(H * 0.8) + ' Q' + N(a * 0.32) + ' ' + N(H * 1.15) + ' ' + N(a * 0.56) + ' ' + N(H * 0.48) + ' Z';
      var pts = [[-a, H * 0.06], [-a * 0.9, -H * 0.55], [-a * 0.6, -H * 0.95], [-a * 0.05, -H], [a * 0.45, -H * 0.7], [a * 0.82, -H * 0.3], [a, -H * 0.15], [a, H * 0.15], [a * 0.82, H * 0.32], [a * 0.45, H * 0.74], [-a * 0.05, H], [-a * 0.6, H * 0.88], [-a * 0.9, H * 0.5]];
      var d = P.smooth(pts);
      out += P.shadow(d) + P.path(tail, fin, dk, 1) + P.path(dorsal, fin, dk, 0.9) + P.path(anal, fin, dk, 0.9);
      for (var i = -2; i <= 2; i++) out += P.line(a - 4, i * H * 0.04, a + 21, i * H * 0.32, dk, 0.6, { opacity: '0.6' });
      out += P.path(d, skin, dk, 1.2);
      out += P.hl(-a * 0.05, -H * 0.55, a * 0.72, H * 0.26, P.shade(skin, -0.3), 0.4) + P.hl(-a * 0.1, H * 0.48, a * 0.6, H * 0.22, '#F4E6C8', 0.5);
      out += P.g('', P.grill(a * 0.62, H * 0.62, 40, 15, '#5A3A1E', 2.6), { opacity: '0.7' });
      [-0.25, 0.08, 0.38].forEach(function (f) { var x = f * a, h = H * (0.72 - Math.abs(f) * 0.3); out += P.line(x + h * 0.3, -h, x - h * 0.3, h, P.shade(skin, -0.5), 3.4) + P.line(x + h * 0.26, -h * 0.85, x - h * 0.26, h * 0.85, WHITE_FISH, 1.3); });
      out += P.path('M' + N(-a * 0.6) + ' ' + N(-H * 0.78) + ' Q' + N(-a * 0.46) + ' 0 ' + N(-a * 0.62) + ' ' + N(H * 0.74), 'none', dk, 1.5, { 'stroke-linecap': 'round' });
      out += P.g(P.at(-a * 0.48, H * 0.22, 18), P.path(P.leafD(16, 7), fin, dk, 0.8));
      out += P.line(-a, H * 0.06, -a * 0.88, H * 0.14, dk, 1.2);
      out += P.circle(-a * 0.8, -H * 0.22, H * 0.15, '#F4EEE2', dk, 0.9) + P.circle(-a * 0.8, -H * 0.22, H * 0.07, '#2E2A26');
      return out;
    };
  }
  // a Spanish mackerel cutlet: a round steak with the skin round it, the belly notch and the centre bone
  function cutlet(P, rnd) {
    var pts = [[0, -31], [21, -27], [33, -12], [34, 6], [27, 22], [14, 31], [5, 25], [0, 15], [-5, 25], [-14, 31], [-27, 22], [-34, 6], [-33, -12], [-21, -27]].map(function (p) { return [p[0] + (rnd() - 0.5) * 1.5, p[1] + (rnd() - 0.5) * 1.5]; });
    var d = P.smooth(pts), skin = '#7A848F', flesh = '#ECD9BA', out = P.shadow(d);
    out += P.path(d, skin, P.shade(skin, -0.3), 1.1);
    // the dark bars on the skin, across the rim
    pts.forEach(function (p, i) {
      var a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length], m1 = [(a[0] + p[0]) / 2, (a[1] + p[1]) / 2], m2 = [(p[0] + b[0]) / 2, (p[1] + b[1]) / 2];
      [m2, [m1[0] * 0.25 + p[0] * 0.5 + m2[0] * 0.25, m1[1] * 0.25 + p[1] * 0.5 + m2[1] * 0.25]].forEach(function (r) { if (r[1] < 12) out += P.line(r[0] * 0.9, r[1] * 0.9 - 0.4, r[0] * 0.975, r[1] * 0.975 - 0.2, '#3E4650', 2, { opacity: '0.75' }); });
    });
    out += P.path(P.smooth(sc(pts, 0.88, 0.88, 0, 0.6)), flesh, null, 0);
    out += P.ellipse(0, -4, 11, 9, 'none', P.shade(flesh, -0.16), 0.9) + P.ellipse(0, -5, 21, 17, 'none', P.shade(flesh, -0.13), 0.9, { opacity: '0.75' });
    out += P.line(0, -9, 0, -25, P.shade(flesh, -0.16), 0.9) + P.line(-27, -4, 27, -4, P.shade(flesh, -0.1), 0.8, { opacity: '0.7' }) + P.line(-2, 0, -3, 12, P.shade(flesh, -0.14), 0.8) + P.line(2, 0, 3, 12, P.shade(flesh, -0.14), 0.8);
    out += P.g(P.at(0, -2), P.grill(25, 20, 35, 12, '#8E5E2E', 2.6));
    out += P.circle(0, -4, 4.5, '#F6F1E6', '#C9BCA4', 1) + P.circle(0, -4, 1.6, '#D9CDB8');
    out += P.hl(-12, -18, 9, 3, '#FFFFFF', 0.3, -20);
    return out;
  }
  // a small golden nugget (fish bites, popcorn prawns, battered scallops)
  function nugget(o) {
    return function (P, q) {
      var col = o.col || BATTER, d = P.blob(q, o.rx, o.ry, o.wob || 0.16, 11), out = P.shadow(d, 1.5, 2);
      out += P.path(d, col, P.shade(col, -0.3), 0.9) + P.path(P.blob(q, o.rx * 0.7, o.ry * 0.62, 0.2, 8, -o.rx * 0.1, -o.ry * 0.12), P.shade(col, 0.18), null, 0, { opacity: '0.8' });
      out += P.crumbs(q, 3, o.rx * 0.6, o.ry * 0.5, [P.shade(col, 0.4)], o.rx / 6) + P.crumbs(q, 3, o.rx * 0.6, o.ry * 0.5, [P.shade(col, -0.25)], 0.7);
      return out;
    };
  }
  function nuggetPile(o) {
    var one = nugget(o);
    return function (P, rnd) { return P.scatter(rnd, o.count, o.prx, o.pry, function (x, y, i, q) { return P.g(P.at(x, y, q() * 180), one(P, q)); }, Math.max(o.rx, o.ry) * 1.5); };
  }
  // smoked salmon: ribbons folded into a loose rose
  function ribbon(P, len, wid, col) {
    var l = len / 2, w = wid / 2;
    var d = 'M' + N(-l) + ' ' + N(-w + 2) + ' Q' + N(-l / 2) + ' ' + N(-w - 3) + ' 0 ' + N(-w) + ' T' + N(l) + ' ' + N(-w + 1) + ' L' + N(l - 2) + ' ' + N(w) + ' Q' + N(l / 2) + ' ' + N(w + 3) + ' 0 ' + N(w) + ' T' + N(-l + 2) + ' ' + N(w - 1) + ' Z';
    var out = P.shadow(d, 1.2, 1.6) + P.path(d, col, P.shade(col, -0.25), 0.8);
    for (var x = -l + 5; x < l - 3; x += 6) out += P.line(x + 2.5, -w + 2.5, x - 2.5, w - 2.5, '#FCE3D6', 1.1, { opacity: '0.75' });
    out += P.path('M' + N(-l * 0.2) + ' ' + N(-w) + ' Q' + N(-l * 0.05) + ' 0 ' + N(-l * 0.25) + ' ' + N(w), 'none', P.shade(col, -0.22), 2, { opacity: '0.5' });
    return out;
  }
  function smokedSalmon(P, rnd) {
    var out = '', col = '#F28A64';
    [[-8, -9, -24], [9, -6, 38], [-4, 6, 82], [8, 9, -8]].forEach(function (r, i) { out += P.g(P.at(r[0], r[1], r[2]), ribbon(P, 44 - i * 3, 15, i % 2 ? P.shade(col, 0.06) : col)); });
    return out + P.hl(-4, -8, 10, 2, '#FFFFFF', 0.35, -20);
  }
  // hot smoked trout broken into flakes: pink flesh in layers, a golden smoked edge on some
  function troutFlakes(P, rnd) {
    return P.scatter(rnd, 16, 26, 18, function (x, y, i, q) {
      var rx = 5 + q() * 4, ry = 3.4 + q() * 2, rot = q() * 180, d = P.blob(q, rx, ry, 0.22, 7, 0, 0), smoked = i % 4 === 0, s = '';
      s += P.shadow(d, 1, 1.4) + P.path(d, ['#ECA888', '#F2BC9E', '#E39A78'][i % 3], smoked ? '#C98A52' : '#BF7A5C', smoked ? 1.2 : 0.7);
      for (var k = -1; k <= 1; k++) s += P.line(k * rx * 0.42 - 0.8, -ry * 0.55, k * rx * 0.42 + 0.8, ry * 0.55, '#F8D6C2', 1, { opacity: '0.85' });
      return P.g(P.at(x, y, rot), s);
    }, 8);
  }
  // Thai fish cake: a flat browned disc with snake bean and lime leaf
  function thaiCake(P, q) {
    var col = '#C98C48', d = P.blob(q, 18, 16, 0.1, 11), out = P.shadow(d) + P.path(d, col, P.shade(col, -0.3), 1);
    out += P.path(P.blob(q, 14, 12, 0.18, 9), '#DBA661', null, 0, { opacity: '0.85' }) + P.crumbs(q, 7, 13, 11, ['#A86A2E'], 1.3);
    out += P.scatter(q, 4, 11, 9, function (x, y) { return P.circle(x, y, 1.9, '#6E9A3E', '#4F7F2F', 0.5) + P.circle(x, y, 0.7, '#C9DE98'); });
    out += P.scatter(q, 3, 10, 8, function (x, y, i, r) { var t = r() * Math.PI; return P.line(x - Math.cos(t) * 3, y - Math.sin(t) * 3, x + Math.cos(t) * 3, y + Math.sin(t) * 3, '#2F5A22', 0.9); });
    return out + P.hl(-5, -6, 6, 2, '#FFFFFF', 0.3, -15);
  }
  function crumbedCake(P, rnd) {
    var col = C.golden, d = P.blob(rnd, 27, 25, 0.06, 12), out = P.shadow(d) + P.path(d, col, P.shade(col, -0.3), 1.1);
    out += P.path(P.blob(rnd, 22, 20, 0.1, 10), P.shade(col, 0.12), null, 0, { opacity: '0.85' }) + P.crumbs(rnd, 34, 22, 20, [P.shade(col, -0.24), P.shade(col, 0.32), C.crumbDark], 1);
    return out + P.hl(-8, -10, 9, 3, '#FFFFFF', 0.28, -15);
  }
  // fish pakora: knobbly orange pieces with spice and curry leaf
  function pakoraPiece(P, q) {
    var col = '#D98A34', d = P.blob(q, 11 + q() * 3, 7 + q() * 2, 0.24, 10), out = P.shadow(d, 1.5, 2) + P.path(d, col, P.shade(col, -0.3), 0.9);
    out += P.path(P.blob(q, 7, 4.5, 0.3, 8, -1, -1), P.shade(col, 0.2), null, 0, { opacity: '0.8' }) + P.crumbs(q, 6, 8, 5, ['#9E4A1E', '#7A3A16'], 0.7);
    return out;
  }

  /* ---------- prawns ---------- */
  // a peeled prawn curled into a C: pale flesh, orange-red stripes on the back, a red tail fan (about 30 across)
  function prawnCurl(P, o) {
    o = o || {};
    var Rc = 9, a0 = 205, sw = 262, k = 12, outer = [], inner = [], back = [], w0 = 12, w1 = 5, col = o.col || PRAWN, out = '';
    for (var i = 0; i <= k; i++) {
      var t = i / k, a = (a0 + sw * t) * Math.PI / 180, w = w0 + (w1 - w0) * t;
      outer.push([Math.cos(a) * (Rc + w / 2), Math.sin(a) * (Rc + w / 2)]);
      inner.push([Math.cos(a) * (Rc - w / 2), Math.sin(a) * (Rc - w / 2)]);
      back.push([Math.cos(a) * (Rc + w / 2 - 1.3), Math.sin(a) * (Rc + w / 2 - 1.3)]);
    }
    var d = P.smooth(outer.concat(inner.slice().reverse())), a1 = a0 + sw, ex = Math.cos(a1 * Math.PI / 180) * Rc, ey = Math.sin(a1 * Math.PI / 180) * Rc;
    if (o.shadow !== false) out += P.shadow(d, 1.2, 1.6);
    out += P.g(P.at(ex, ey, a1 + 90), P.path('M-1 -2.2 L7 -5.5 Q10 0 7 5.5 L-1 2.2 Z', TAIL, P.shade(TAIL, -0.3), 0.8) + P.line(0, 0, 8.5, 0, P.shade(TAIL, -0.3), 0.6));
    out += P.path(d, col, P.shade(PRAWN_RED, -0.15), 0.9);
    out += P.path(P.smooth(back, true), 'none', PRAWN_RED, 2.2, { opacity: '0.65', 'stroke-linecap': 'round' });
    for (var m = 1; m <= 6; m++) {
      var t2 = m / 7.4, a2 = (a0 + sw * t2) * Math.PI / 180, w2 = w0 + (w1 - w0) * t2, cs = Math.cos(a2), sn = Math.sin(a2);
      out += P.line(cs * (Rc - w2 * 0.2), sn * (Rc - w2 * 0.2), cs * (Rc + w2 / 2 - 0.5), sn * (Rc + w2 / 2 - 0.5), o.char && m % 2 ? '#6B3A1E' : PRAWN_RED, o.char && m % 2 ? 2.4 : 1.6, { opacity: '0.85' });
    }
    return out + P.hl(Math.cos(4.4) * Rc, Math.sin(4.4) * Rc, 3.6, 1.3, '#FFFFFF', 0.5, 20);
  }
  // a whole cooked prawn, head on the left: feelers, legs, the shell bands and the tail fan
  function wholePrawn(P) {
    var col = '#EC7438', hc = '#E0632E', dk = P.shade(col, -0.32), out = '', cap = { 'stroke-linecap': 'round' };
    out += P.path('M-50 -5 C-72 -16 -64 -30 -30 -28 S30 -22 56 -32', 'none', dk, 0.8, cap) + P.path('M-50 -3 C-80 -6 -84 -24 -66 -36', 'none', dk, 0.7, cap);
    for (var x = -42; x <= -18; x += 6) out += P.line(x, 7, x - 5, 17, dk, 0.9);
    for (var x2 = -8; x2 <= 24; x2 += 8) out += P.line(x2, 8, x2 - 3, 13, dk, 0.8);
    out += P.path('M30 -4 L46 -11 Q51 0 46 11 L30 4 Z', TAIL, P.shade(TAIL, -0.3), 0.8) + P.path('M31 0 L49 0 M31 -1 L47 -7 M31 1 L47 7', 'none', P.shade(TAIL, -0.3), 0.6);
    var ab = P.smooth([[-18, -11], [-2, -11], [14, -9.5], [26, -7], [34, -3.5], [34, 3.5], [26, 7], [14, 9.5], [-2, 11], [-18, 10.5]]);
    out += P.shadow(ab) + P.path(ab, col, dk, 1);
    [-8, 1, 10, 18, 26].forEach(function (s, i) {
      var h = 10 - i * 1.3;
      out += P.path('M' + N(s) + ' ' + N(-h) + ' Q' + N(s + 3.5) + ' 0 ' + N(s) + ' ' + N(h), 'none', dk, 0.8) + P.path('M' + N(s + 2) + ' ' + N(-h + 1) + ' Q' + N(s + 5) + ' 0 ' + N(s + 2) + ' ' + N(h - 1), 'none', '#F7B489', 1.4, { opacity: '0.8' });
    });
    var head = 'M-16 -12 Q-10 0 -16 11 L-40 10 Q-52 6 -52 -2 Q-50 -10 -40 -12 Z';
    out += P.shadow(head) + P.path(head, hc, P.shade(hc, -0.3), 1) + P.path('M-52 -4 L-66 -8 L-52 -1 Z', hc, P.shade(hc, -0.3), 0.7);
    out += P.path('M-42 -7 Q-30 -10 -20 -7', 'none', '#F4A070', 1.4, { opacity: '0.7' }) + P.circle(-46, -5, 2.2, TIP);
    return out + P.hl(2, -6, 14, 2, '#FFFFFF', 0.35);
  }
  function prawnSkewer(P) {
    var out = P.line(-68, 1.5, 68, 1.5, '#000000', 3, { opacity: '0.12' }) + P.line(-70, 0, 70, 0, '#A87A44', 3.4) + P.line(-70, 0, 70, 0, '#D9B582', 2);
    [-42, -14, 14, 42].forEach(function (x, i) { out += P.g(P.at(x, 0, -60 + i * 17), prawnCurl(P, { char: true })); });
    return out;
  }
  // butterflied prawn cutlet, crumbed, red tail on
  function prawnCutlet(P, rnd) {
    var col = C.golden, pts = [[-24, -1], [-22, -11], [-12, -17], [0, -15], [10, -9], [16, -4], [16, 4], [10, 9], [0, 15], [-12, 17], [-22, 11], [-24, 1], [-19, 0]], d = P.smooth(pts);
    var out = P.path('M13 -3 L27 -9 Q31 0 27 9 L13 3 Z', TAIL, P.shade(TAIL, -0.3), 0.8) + P.line(15, 0, 29, 0, P.shade(TAIL, -0.3), 0.6);
    out += P.shadow(d) + P.path(d, col, P.shade(col, -0.3), 1) + P.path(P.smooth(sc(pts, 0.78, 0.74, -1)), P.shade(col, 0.14), null, 0, { opacity: '0.85' });
    out += P.crumbs(rnd, 26, 16, 12, [P.shade(col, -0.24), P.shade(col, 0.32), C.crumbDark], 0.9);
    return out + P.hl(-8, -8, 8, 2.5, '#FFFFFF', 0.3, -15);
  }
  // tempura: a lacy pale batter with frilly bits round the edge (o.tail: the red prawn tail out of one end)
  function tempura(o) {
    return function (P, rnd) {
      var l = o.len / 2, w = o.wid / 2, col = '#EDD38C', out = '';
      if (o.tail) out += P.g(P.at(l - 3, 0), P.path('M0 -3 L13 -8 Q17 0 13 8 L0 3 Z', TAIL, P.shade(TAIL, -0.3), 0.8) + P.line(1, 0, 15, 0, P.shade(TAIL, -0.3), 0.6));
      var d = P.smooth(P.slabPts(rnd, l, w, 0.3, 0.08, 26));
      out += P.shadow(d) + P.path(d, col, P.shade(col, -0.28), 0.9);
      for (var i = 0; i < 16; i++) { var a = i / 16 * Math.PI * 2 + rnd() * 0.3, x = Math.cos(a) * l * 0.98, y = Math.sin(a) * w * 1.04; if (o.tail && x > l * 0.8) continue; out += P.path(P.blob(rnd, 2 + rnd() * 1.6, 1.6 + rnd() * 1.2, 0.3, 6, x, y), P.shade(col, 0.2), P.shade(col, -0.22), 0.6); }
      out += P.path(P.smooth(P.slabPts(rnd, l * 0.78, w * 0.62, 0.3, 0.12, 14)), '#F6E6B8', null, 0, { opacity: '0.85' });
      out += P.crumbs(rnd, Math.round(l * w / 30), l * 0.75, w * 0.6, [P.shade(col, -0.18), '#FFF6DC'], 0.9);
      return out + P.hl(-l * 0.2, -w * 0.4, l * 0.4, w * 0.14, '#FFFFFF', 0.4);
    };
  }
  function prawnCocktail(P, rnd) {
    var out = P.shadow(circD(37), 2, 2.5) + P.circle(0, 0, 37, '#EEF3F6', '#B9C4CC', 1.6) + P.circle(0, 0, 33, '#F7FAFB', '#D6DEE3', 0.8);
    out += P.scatter(rnd, 30, 27, 27, function (x, y, i, q) { return P.g(P.at(x, y, q() * 180), P.path(P.leafD(9 + q() * 5, 2.6), ['#9CC067', '#7EA453', '#C9DE98'][i % 3], '#6E9A3E', 0.4)); });
    for (var i = 0; i < 5; i++) { var a = i * 72 - 90, r = a * Math.PI / 180; out += P.g(P.at(Math.cos(r) * 20, Math.sin(r) * 20, a + 120, 0.82), prawnCurl(P)); }
    var s = P.blob(rnd, 12, 11, 0.12, 9);
    out += P.path(s, '#EE8A6A', P.shade('#EE8A6A', -0.25), 0.9) + P.hl(-3, -4, 4, 1.6, '#FFFFFF', 0.45, -20) + P.crumbs(rnd, 6, 6, 5, ['#B5301F'], 0.6);
    return out + P.path('M-30 -20 A36 36 0 0 1 -8 -35', 'none', '#FFFFFF', 3, { opacity: '0.85', 'stroke-linecap': 'round' });
  }
  // curried prawns as they sit in the bowl: sauce, a cream swirl, prawns, coriander and chilli
  function curryPrawns(P, rnd) {
    var col = '#D8922E', d = P.blob(rnd, 58, 54, 0.025, 16), out = P.path(d, col, P.shade(col, -0.25), 1.1);
    out += P.path(P.blob(rnd, 46, 42, 0.12, 12), P.shade(col, 0.12), null, 0, { opacity: '0.6' });
    out += P.scatter(rnd, 12, 48, 44, function (x, y, i, q) { return P.circle(x, y, 1.5 + q() * 2.2, '#EDB64E', null, 0, { opacity: '0.85' }); });
    out += P.path('M-26 -4 Q-14 -20 4 -12 Q16 -4 8 8 Q-4 16 -14 6', 'none', '#F6EEDA', 2.4, { opacity: '0.85', 'stroke-linecap': 'round' });
    out += P.scatter(rnd, 7, 36, 32, function (x, y, i, q) { return P.g(P.at(x, y, q() * 360, 0.9), prawnCurl(P)); }, 20);
    out += P.scatter(rnd, 7, 40, 36, function (x, y, i, q) { return P.leaf(7, 5, '#5E8C3A', x, y, q() * 360, { edge: '#4F7F2F', ew: 0.4 }); });
    return out + P.scatter(rnd, 4, 40, 36, function (x, y) { return P.circle(x, y, 2.2, '#C9302A', '#9E2B20', 0.5) + P.circle(x, y, 0.8, '#F2D2A6'); });
  }
  function garlicPrawns(P, rnd) {
    var col = '#E3B850', d = P.blob(rnd, 52, 44, 0.035, 15), out = P.path(d, col, P.shade(col, -0.28), 1.1, { opacity: '0.9' });
    out += P.path(P.blob(rnd, 42, 34, 0.1, 11), P.shade(col, 0.18), null, 0, { opacity: '0.6' });
    out += P.scatter(rnd, 8, 36, 28, function (x, y, i, q) { return P.g(P.at(x, y, q() * 360, 0.95), prawnCurl(P)); }, 18);
    out += P.scatter(rnd, 10, 40, 32, function (x, y, i, q) { return P.ellipse(x, y, 2.4, 1.6, '#F6EBCB', '#D9C9A0', 0.5, { transform: 'rotate(' + N(q() * 180) + ' ' + N(x) + ' ' + N(y) + ')' }); });
    out += P.crumbs(rnd, 30, 42, 34, [C.herb, '#3E6A2A'], 0.9) + P.crumbs(rnd, 8, 40, 32, ['#C0392B'], 0.8);
    return out + P.hl(-18, -18, 14, 4, '#FFFFFF', 0.3, -20);
  }
  // prawn toast: a triangle of fried bread, prawn paste and sesame on top, crust along the long side
  function prawnToast(P, rnd) {
    var d = poly([[-26, 10], [26, 10], [0, -16]]), out = P.shadow(d) + P.path(d, '#C98A3A', '#9A6428', 1.4, ROUND);
    out += P.path(poly([[-21.5, 6], [21.5, 6], [0, -14]]), '#E7A47A', P.shade('#E7A47A', -0.15), 0.6, ROUND);
    out += P.path(P.blob(rnd, 10, 4, 0.2, 8, -2, 0), '#D9965A', null, 0, { opacity: '0.6' });
    out += P.scatter(rnd, 14, 13, 4.5, function (x, y, i, q) { return P.ellipse(x, y + 0.5, 1.4, 0.8, '#FBF3DC', '#D9C9A0', 0.3, { transform: 'rotate(' + N(q() * 180) + ' ' + N(x) + ' ' + N(y + 0.5) + ')' }); });
    return out + P.hl(-4, -4, 7, 1.6, '#FFFFFF', 0.3, -10);
  }
  // prawn twister: a prawn wrapped in a spiral of pastry, the red tail out of one end
  function twister(P) {
    var col = '#E2AE5C', dk = P.shade(col, -0.3), d = 'M-28 -6 Q0 -9 27 -5 Q30 0 27 5 Q0 9 -28 6 Q-31 0 -28 -6 Z';
    var out = P.g(P.at(26, 0), P.path('M0 -2.5 L11 -7 Q14 0 11 7 L0 2.5 Z', TAIL, P.shade(TAIL, -0.3), 0.8)) + P.path('M-27 -2 L-37 -6 L-34 0 L-37 6 L-27 2 Z', col, dk, 0.8, ROUND);
    out += P.shadow(d) + P.path(d, col, dk, 1);
    for (var x = -22; x < 24; x += 7) out += P.path('M' + N(x) + ' -7 Q' + N(x + 5) + ' 0 ' + N(x + 2) + ' 7', 'none', dk, 1, { opacity: '0.7' }) + P.path('M' + N(x + 2.2) + ' -6.5 Q' + N(x + 7) + ' 0 ' + N(x + 4.2) + ' 6.5', 'none', '#F4D394', 1.4, { opacity: '0.7' });
    return out + P.hl(-4, -4, 16, 1.4, '#FFFFFF', 0.3);
  }

  /* ---------- shellfish ---------- */
  // a scallop from above (o.sear: the golden sear ring; o.roe: the orange roe curled round one side)
  function scallop(o) {
    o = o || {};
    return function (P, rnd) {
      var r = o.r || 13, d = P.blob(rnd, r, r * 0.95, 0.04, 10), out = '';
      if (o.roe) {
        var pts = [];
        for (var a = 100; a <= 260; a += 20) pts.push([Math.cos(a * Math.PI / 180) * r * (1 + 0.55 * Math.sin(Math.PI * (a - 100) / 160)), Math.sin(a * Math.PI / 180) * r * (1 + 0.55 * Math.sin(Math.PI * (a - 100) / 160))]);
        for (var b = 260; b >= 100; b -= 40) pts.push([Math.cos(b * Math.PI / 180) * r * 0.85, Math.sin(b * Math.PI / 180) * r * 0.85]);
        var rd = P.smooth(pts);
        out += P.shadow(rd, 1.2, 1.8) + P.path(rd, '#EE8636', P.shade('#EE8636', -0.28), 0.9) + P.hl(-r * 1.15, -r * 0.2, r * 0.12, r * 0.35, '#FFFFFF', 0.35);
      }
      out += P.shadow(d, 1.2, 1.8) + P.path(d, '#F3E8D2', '#C9B596', 0.9);
      if (o.sear) out += P.path(P.blob(rnd, r * 0.8, r * 0.76, 0.06, 9), o.sear, null, 0) + P.path(P.blob(rnd, r * 0.48, r * 0.44, 0.15, 8), P.shade(o.sear, 0.22), null, 0, { opacity: '0.85' });
      return out + P.hl(-r * 0.3, -r * 0.35, r * 0.3, r * 0.12, '#FFFFFF', 0.45, -20);
    };
  }
  function scallopShell(P, rnd) {
    var pts = [], ribs = '', k = 22, col = '#E7C3A0', dk = P.shade(col, -0.3);
    for (var i = 0; i <= k; i++) { var a = (200 + i / k * 140) * Math.PI / 180, r = i % 2 ? 31 : 33; pts.push([Math.cos(a) * r, Math.sin(a) * r + 8]); }
    pts = pts.concat([[15, 18], [20, 22], [20, 28], [-20, 28], [-20, 22], [-15, 18]]);
    var d = poly(pts), out = P.shadow(d) + P.path(d, col, dk, 1, ROUND);
    out += P.path(poly(sc(pts, 0.84, 0.82, 0, 2)), '#F3DEC8', P.shade(col, -0.12), 0.6, ROUND);
    for (var j = 1; j < k; j += 2) ribs += 'M0 ' + N(24) + ' L' + N(pts[j][0] * 0.94) + ' ' + N(pts[j][1] * 0.94 + 0.5) + ' ';
    out += P.path(ribs, 'none', P.shade(col, -0.14), 0.8, { opacity: '0.7' });
    out += scallop({ r: 12, roe: true })(P, rnd);
    out += P.path(P.blob(rnd, 12, 9, 0.2, 8, 2, -2), '#F2D27A', null, 0, { opacity: '0.45' }) + P.crumbs(rnd, 10, 10, 8, [C.herb], 0.9);
    return out;
  }
  // an open mussel: two blue-black shells hinged at one end, pearly inside, the orange mussel in one
  var VALVE = [[0, 0], [5, -6], [14, -9.5], [25, -9.5], [33, -5], [35, 1], [31, 6.5], [20, 8.5], [9, 6.5], [3, 3.5]];
  function mussel(P) {
    var d = P.smooth(VALVE), out = '';
    [[-24, 1], [24, 0]].forEach(function (v) {
      var s = P.shadow(d, 1.2, 1.6) + P.path(d, '#2C2A36', '#15141B', 1) + P.path(P.smooth(sc(VALVE, 0.84, 0.74, 3.5, 0.5)), '#A7B0C0', null, 0) + P.hl(19, -3, 8, 2, '#FFFFFF', 0.45);
      if (v[1]) { var m = P.smooth(sc(VALVE, 0.66, 0.6, 6.5, 0.5)); s += P.path(m, '#EA9440', '#C46E2A', 0.8) + P.path(m, 'none', '#6A3E22', 0.9, { 'stroke-dasharray': '1.4 1.6', opacity: '0.7' }) + P.hl(17, -2, 5, 1.6, '#FFFFFF', 0.4); }
      out += P.g('rotate(' + v[0] + ')', s);
    });
    return P.g('translate(-16 0)', out);
  }
  function mussels(count, rx, ry, broth) {
    return function (P, rnd) {
      var out = broth ? P.path(P.blob(rnd, rx + 18, ry + 16, 0.06, 13), '#EADDB8', P.shade('#EADDB8', -0.2), 1, { opacity: '0.95' }) : '';
      out += broth ? P.scatter(rnd, count, rx, ry, function (x, y, i, q) { return P.g(P.at(x, y, q() * 360), mussel(P)); }, 20) : P.pile(rnd, count, rx, ry, function (x, y, i, q) { return P.g(P.at(x, y, q() * 360), mussel(P)); });
      if (broth) out += P.crumbs(rnd, 40, rx + 4, ry + 4, [C.herb, '#3E6A2A'], 1) + P.crumbs(rnd, 10, rx, ry, ['#F6EBCB'], 1.4);
      return out;
    };
  }
  // an oyster on the half shell (o.top: kilpatrick or mignonette)
  function oyster(o) {
    o = o || {};
    return function (P, rnd) {
      var pts = [[-31, -2], [-23, -14], [-6, -21], [12, -19], [26, -10], [31, 2], [24, 14], [6, 20], [-12, 18], [-26, 10]].map(function (p) { return [p[0] * (0.94 + rnd() * 0.1), p[1] * (0.94 + rnd() * 0.1)]; });
      var d = P.smooth(pts), shell = '#A39A87', out = P.shadow(d) + P.path(d, shell, P.shade(shell, -0.32), 1.1);
      // the rough layered lip of the shell
      out += P.path(P.blob(rnd, 27, 18, 0.07, 16, 0.5, 0), '#B6AD99', P.shade(shell, -0.18), 0.7) + P.path(P.blob(rnd, 25, 16.5, 0.05, 15, 0.5, 0), 'none', P.shade(shell, -0.1), 0.7);
      out += P.path(P.smooth(sc(pts, 0.74, 0.68, 1)), '#EEEDE6', '#CFCBC0', 0.8);
      // the oyster: grey-cream with a darker frilly edge, wet and glossy
      out += P.path(P.blob(rnd, 17, 11.5, 0.08, 18, 0, 0), '#B5AC92', '#6E6858', 0.9) + P.path(P.blob(rnd, 13.5, 8.6, 0.06, 12, -0.5, -0.3), '#DAD3BF', null, 0);
      out += P.path(P.blob(rnd, 7, 4.4, 0.1, 9, 3, 1), '#C9C0A6', null, 0, { opacity: '0.7' });
      if (o.top === 'kilpatrick') {
        out += P.path(P.blob(rnd, 14, 9, 0.1, 10), '#5A2E1A', null, 0, { opacity: '0.45' });
        out += P.scatter(rnd, 10, 12, 7, function (x, y, i, q) { var b = P.blob(q, 2.4 + q() * 1.2, 1.8 + q(), 0.3, 6, x, y); return P.path(b, '#A8452F', '#7A2E1E', 0.5) + P.circle(x + 0.6, y - 0.4, 0.8, '#F0D2C2'); }) + P.crumbs(rnd, 6, 10, 6, [C.herb], 0.7);
      } else if (o.top === 'mignonette') {
        out += P.path(P.blob(rnd, 10, 6, 0.2, 8), '#9E4A6A', null, 0, { opacity: '0.3' }) + P.crumbs(rnd, 18, 11, 7, ['#9E4A6A', '#C98AA0', '#7A3452'], 0.9);
      }
      return out + P.hl(-7, -6, 7, 2, '#FFFFFF', 0.55, -15);
    };
  }
  // pippies (vongole): small open clams in a little white wine sauce
  var CLAM = [[0, 0], [-6, -3], [-10, -9], [-7, -15], [0, -17], [7, -15], [10, -9], [6, -3]];
  function clam(P, q) {
    var d = P.smooth(CLAM), out = '';
    [-52, 52].forEach(function (r, i) {
      var s = P.shadow(d, 1, 1.4) + P.path(d, '#C9A87A', '#8E7048', 0.8) + P.path(P.smooth(sc(CLAM, 0.8, 0.8, 0, -1.8)), '#F6EFE4', null, 0) + P.path(P.smooth(sc(CLAM, 0.42, 0.36, 0, -0.4)), '#B98AA6', null, 0, { opacity: '0.75' });
      if (i) s += P.path(P.blob(q, 5, 4, 0.2, 7, 0, -9.5), '#F0C890', '#C9965A', 0.6) + P.hl(-1, -11, 2, 0.8, '#FFFFFF', 0.5);
      out += P.g('rotate(' + r + ')', s);
    });
    return out + P.circle(0, 0, 1.4, '#6A5034');
  }
  // a shut clam, the outside of the shell: growth rings and a darker band
  function shutClam(P) {
    var pts = [[0, -11], [9, -8], [13, 0], [9, 7], [0, 9], [-9, 7], [-13, 0], [-9, -8]], d = P.smooth(pts), out = P.shadow(d, 1, 1.4) + P.path(d, '#CDB088', '#8E7048', 0.8);
    out += P.path(P.smooth(sc(pts, 0.72, 0.7, 0, 1.5)), 'none', '#A88A62', 0.8) + P.path(P.smooth(sc(pts, 0.45, 0.42, 0, 3)), 'none', '#A88A62', 0.8) + P.path(P.smooth(sc(pts, 0.86, 0.85, 0, 0.8)), 'none', '#9A7AA0', 1.2, { opacity: '0.5' });
    return out + P.circle(0, -9.5, 1.3, '#6A5034') + P.hl(-3, -4, 4, 1.3, '#FFFFFF', 0.4, -15);
  }
  function pippies(P, rnd) {
    var out = P.path(P.blob(rnd, 58, 46, 0.06, 13), '#F1E6C6', P.shade('#F1E6C6', -0.18), 1, { opacity: '0.9' });
    out += P.scatter(rnd, 14, 44, 34, function (x, y, i, q) { return P.g(P.at(x, y + 6, q() * 70 - 35), i % 3 === 1 ? P.g('translate(0 -6)', shutClam(P)) : clam(P, q)); }, 16);
    return out + P.crumbs(rnd, 30, 50, 40, [C.herb, '#3E6A2A'], 0.9) + P.crumbs(rnd, 8, 46, 36, ['#C0392B'], 0.8);
  }

  /* ---------- squid and octopus ---------- */
  function calamariRing(P, q) {
    var col = '#EBC781', d = P.ringD(q, 15 + q() * 2, 8.5 + q() * 1.5, 0.07), out = P.path(d, '#000000', null, 0, { opacity: '0.12', transform: 'translate(1.5 2)', 'fill-rule': 'evenodd' });
    out += P.path(d, col, P.shade(col, -0.3), 0.9, { 'fill-rule': 'evenodd' });
    out += P.circle(0, 0, 10.5, 'none', '#F6EFE0', 1.6, { opacity: '0.85' });
    for (var i = 0; i < 9; i++) { var a = i / 9 * Math.PI * 2 + q() * 0.4, r = 13 + q() * 1.5; out += P.path(P.blob(q, 2 + q() * 1.5, 1.6 + q(), 0.3, 6, Math.cos(a) * r, Math.sin(a) * r), P.shade(col, 0.25), null, 0, { opacity: '0.8' }); }
    return out + P.crumbs(q, 5, 13, 13, [P.shade(col, -0.25)], 0.6);
  }
  // salt and pepper squid: curled scored pieces, white pepper dust and black pepper, chilli and shallot
  function squidPiece(P, q) {
    var l = 11 + q() * 4, w = 5 + q() * 2, c = (q() - 0.5) * 8, col = '#ECD196';
    var d = 'M' + N(-l) + ' ' + N(-w + c * 0.3) + ' Q0 ' + N(-w - c) + ' ' + N(l) + ' ' + N(-w + c * 0.3) + ' Q' + N(l + 3) + ' 0 ' + N(l) + ' ' + N(w + c * 0.3) + ' Q0 ' + N(w - c) + ' ' + N(-l) + ' ' + N(w + c * 0.3) + ' Q' + N(-l - 3) + ' 0 ' + N(-l) + ' ' + N(-w + c * 0.3) + ' Z';
    var out = P.shadow(d, 1.2, 1.6) + P.path(d, col, P.shade(col, -0.3), 0.9);
    for (var x = -l + 4; x < l - 2; x += 5) out += P.line(x, -w * 0.5 - c * 0.3, x + 3, w * 0.5 - c * 0.3, P.shade(col, -0.14), 0.7, { opacity: '0.7' });
    return out + P.crumbs(q, 6, l * 0.8, w * 0.6, ['#2E2A26'], 0.5) + P.hl(-l * 0.2, -w * 0.4, l * 0.4, 1.2, '#FFFFFF', 0.35);
  }
  function tentacles(P, q) {
    var col = '#E6C48A', out = '';
    for (var i = 0; i < 4; i++) { var a = i * 0.5 - 0.75; out += P.path('M0 0 Q' + N(Math.cos(a) * 8) + ' ' + N(Math.sin(a) * 8 - 6) + ' ' + N(Math.cos(a) * 12 + 2) + ' ' + N(Math.sin(a) * 12 + 2), 'none', P.shade(col, -0.3), 3.6, ROUND) + P.path('M0 0 Q' + N(Math.cos(a) * 8) + ' ' + N(Math.sin(a) * 8 - 6) + ' ' + N(Math.cos(a) * 12 + 2) + ' ' + N(Math.sin(a) * 12 + 2), 'none', col, 2.2, ROUND); }
    return out + P.circle(0, 0, 4, col, P.shade(col, -0.3), 0.8) + P.crumbs(q, 3, 6, 6, ['#2E2A26'], 0.5);
  }
  function saltPepperSquid(P, rnd) {
    var out = P.pile(rnd, 11, 34, 26, function (x, y, i, q) { return P.g(P.at(x, y, q() * 180), i % 5 === 2 ? tentacles(P, q) : squidPiece(P, q)); });
    out += P.scatter(rnd, 5, 34, 26, function (x, y) { return P.circle(x, y, 2.3, '#C9302A', '#9E2B20', 0.5) + P.circle(x, y, 0.9, '#F2D2A6'); });
    return out + P.scatter(rnd, 6, 36, 28, function (x, y) { return P.circle(x, y, 2, '#7EA453', '#5E8C3A', 0.6) + P.circle(x, y, 0.9, '#DCEBB8'); });
  }
  // a chargrilled octopus tentacle curled in on itself, suckers along the inside
  function tentacle(P, rnd) {
    var k = 28, left = [], right = [], mid = [], col = '#97463F', out = '';
    function c(t) { var r = 38 * Math.pow(1 - t, 0.85) + 3, a = Math.PI * 0.95 + t * Math.PI * 1.7; return [Math.cos(a) * r * 1.15 + 6, Math.sin(a) * r]; }
    for (var i = 0; i <= k; i++) {
      var t = i / k, p = c(t), p2 = c(Math.min(1, t + 0.01)), p1 = c(Math.max(0, t - 0.01)), dx = p2[0] - p1[0], dy = p2[1] - p1[1], ln = Math.hypot(dx, dy) || 1, nx = -dy / ln, ny = dx / ln, w = 16 * Math.pow(1 - t, 0.8) + 1.8;
      left.push([p[0] + nx * w / 2, p[1] + ny * w / 2]); right.push([p[0] - nx * w / 2, p[1] - ny * w / 2]); mid.push([p[0], p[1], nx, ny, w]);
    }
    var d = P.smooth(left.concat(right.slice().reverse()));
    out += P.shadow(d) + P.path(d, col, P.shade(col, -0.32), 1.1);
    // the suckers sit on the side towards the middle of the curl
    for (var s = 2; s < k - 3; s += 2) {
      var m = mid[s], toC = (6 - m[0]) * m[2] + (0 - m[1]) * m[3] > 0 ? 1 : -1, r0 = Math.max(0.9, m[4] * 0.17);
      out += P.circle(m[0] + m[2] * toC * m[4] * 0.3, m[1] + m[3] * toC * m[4] * 0.3, r0, '#EBC9B4', '#B98A78', 0.5);
    }
    for (var g2 = 3; g2 < k - 4; g2 += 4) { var mm = mid[g2]; out += P.line(mm[0] + mm[2] * mm[4] * 0.42 - mm[3] * 2, mm[1] + mm[3] * mm[4] * 0.42 + mm[2] * 2, mm[0] - mm[2] * mm[4] * 0.1, mm[1] - mm[3] * mm[4] * 0.1, C.charred, 2.4, { opacity: '0.7' }); }
    out += P.path(P.smooth(mid.slice(0, 18).map(function (m) { return [m[0] - m[2] * m[4] * 0.2, m[1] - m[3] * m[4] * 0.2]; }), true), 'none', '#C77A6E', 1.6, { opacity: '0.5', 'stroke-linecap': 'round' });
    // charred spots on the outside of the curl
    for (var cs = 1; cs < k - 6; cs += 3) { var mc = mid[cs], f = (rnd() - 0.2) * 0.3; out += P.path(P.blob(rnd, 1.4 + mc[4] * 0.12, 1 + mc[4] * 0.08, 0.3, 6, mc[0] - mc[2] * mc[4] * f, mc[1] - mc[3] * mc[4] * f), C.charred, null, 0, { opacity: '0.7' }); }
    return out;
  }
  function cuttlefishStrips(P, rnd) {
    // scored strips that curl as they cook: a bent band, fine scoring across, golden char at the edges
    return P.scatter(rnd, 8, 30, 20, function (x, y, i, q) {
      var l = 14 + q() * 4, w = 5, b = 3 + q() * 2.5, col = '#F3E6CC', s = '';
      var d = 'M' + N(-l) + ' ' + N(-w + b) + ' Q0 ' + N(-w - b) + ' ' + N(l) + ' ' + N(-w + b) + ' L' + N(l) + ' ' + N(w + b) + ' Q0 ' + N(w - b) + ' ' + N(-l) + ' ' + N(w + b) + ' Z';
      for (var xx = -l + 3; xx < l - 1; xx += 3.6) { var yy = b * xx * xx / (l * l); s += P.line(xx - 2.4, yy - w + 1.2, xx + 2.4, yy + w - 1.2, P.shade(col, -0.16), 0.6, { opacity: '0.6' }) + P.line(xx + 2.4, yy - w + 1.2, xx - 2.4, yy + w - 1.2, P.shade(col, -0.16), 0.6, { opacity: '0.6' }); }
      s += P.path('M' + N(-l + 1) + ' ' + N(-w + b - 0.6) + ' Q0 ' + N(-w - b + 1.4) + ' ' + N(l - 1) + ' ' + N(-w + b - 0.6), 'none', '#C9893A', 1.6, { opacity: '0.7', 'stroke-linecap': 'round' });
      return P.g(P.at(x, y, q() * 180), P.shadow(d, 1.2, 1.6) + P.path(d, col, P.shade(col, -0.3), 0.8) + s + P.path('M' + N(-l + 1) + ' ' + N(w + b - 0.6) + ' Q' + N(-l * 0.5) + ' ' + N(w + b * 0.1) + ' ' + N(-l * 0.1) + ' ' + N(w - 0.4), 'none', '#C9893A', 1.4, { opacity: '0.55', 'stroke-linecap': 'round' }));
    }, 16);
  }

  /* ---------- crab and lobster ---------- */
  // a cooked crab claw pointing right: the palm, the two fingers with black tips, the meat at the broken end
  function claw(P, o) {
    o = o || {};
    var col = o.col || SHELL, dk = P.shade(col, -0.3), out = '';
    var palm = 'M-30 -4 Q-30 -12 -20 -14 Q-2 -19 12 -10 Q18 -4 14 6 Q4 14 -14 12 Q-28 10 -30 4 Z';
    var dact = 'M8 -10 Q24 -18 36 -8 Q38 -5 35 -4 Q24 -10 12 -3 Z', poll = 'M12 4 Q26 2 34 -1 Q36 2 33 4 Q24 10 12 9 Z';
    out += P.path(poll, col, dk, 0.9) + P.path(dact, col, dk, 0.9);
    out += P.path('M28 -9.6 Q34 -9 36 -7.2 Q38 -5 35 -4 Q32 -6 27.5 -7 Z', TIP) + P.path('M29 -0.4 Q32 -0.8 34 -1 Q36 2 33 4 L29 5 Z', TIP);
    if (o.fingers) return out;
    out += P.shadow(palm) + P.path(palm, col, dk, 1.1) + P.path('M-26 6 Q-8 12 10 5 Q4 12 -14 12 Q-26 10 -26 6 Z', '#F2B07E', null, 0, { opacity: '0.85' });
    out += P.circle(-14, -6, 1.2, '#F2B07E') + P.circle(-4, -9, 1, '#F2B07E') + P.circle(-20, -2, 0.9, '#F2B07E') + P.circle(2, -3, 1.1, '#F2B07E');
    out += P.ellipse(-30, 0, 2.6, 4.6, '#F6F0E6', '#D9CDB8', 0.6);
    return out + P.hl(-8, -11, 10, 2.4, '#FFFFFF', 0.35, -8);
  }
  function crumbedClaw(P, rnd) {
    var col = '#D99A4A', d = P.blob(rnd, 19, 13.5, 0.08, 11, -4, 0), out = claw(P, { fingers: true });
    out += P.shadow(d) + P.path(d, col, P.shade(col, -0.3), 1) + P.path(P.blob(rnd, 14, 9.5, 0.12, 9, -6, -1), P.shade(col, 0.14), null, 0, { opacity: '0.85' });
    out += P.g('translate(-4 0)', P.crumbs(rnd, 18, 15, 10, [P.shade(col, -0.24), P.shade(col, 0.32), C.crumbDark], 0.9));
    return out + P.hl(-8, -6, 7, 2, '#FFFFFF', 0.3, -10);
  }
  // a whole cooked mud crab from above (o.chilli: in chilli sauce with shallot and coriander)
  function mudCrab(o) {
    return function (P, rnd) {
      var col = '#D0502E', dk = P.shade(col, -0.32), out = '';
      if (o.chilli) out += P.path(P.blob(rnd, 96, 70, 0.08, 14, 0, -12), '#C33A26', P.shade('#C33A26', -0.2), 1, { opacity: '0.9' });
      function leg(pts, w) { var d = 'M' + pts.map(function (p) { return N(p[0]) + ' ' + N(p[1]); }).join(' L'); return P.path(d, 'none', dk, w + 2.2, ROUND) + P.path(d, 'none', col, w, ROUND) + P.path(d, 'none', P.shade(col, 0.25), w * 0.3, { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: '0.6' }); }
      [-1, 1].forEach(function (s) {
        [-8, 4, 15].forEach(function (y0, i) { out += leg([[s * 48, y0], [s * (72 + i * 2), y0 - 6 + i * 5], [s * (84 + i), y0 + 14 + i * 6]], 6 - i * 0.6); });
        out += leg([[s * 38, 24], [s * 56, 32], [s * 62, 42]], 4.6) + P.ellipse(s * 64, 46, 5, 7, col, dk, 1, { transform: 'rotate(' + (s * -30) + ' ' + (s * 64) + ' 46)' });
        out += leg([[s * 42, -22], [s * 56, -46]], 11);
      });
      out += P.g(P.at(-32, -62, -20), claw(P)) + P.g(P.at(32, -62, 200, [1, -1]), claw(P));
      var cp = [];
      for (var i = 0; i <= 18; i++) { var a = Math.PI * (1.04 + i / 18 * 0.92), r = i % 2 ? 0.92 : 1; cp.push([Math.cos(a) * 60 * r, Math.sin(a) * 40 * r + 8]); }
      for (var j = 1; j < 16; j++) { var b = Math.PI * (1.96 + j / 16 * 1.08); cp.push([Math.cos(b) * 58 * (1 - 0.18 * Math.sin(b)), Math.sin(b) * 34 + 8]); }
      var d = poly(cp);
      out += P.shadow(d) + P.path(d, col, dk, 1.2, ROUND);
      out += P.path(P.blob(rnd, 40, 22, 0.15, 10, 0, 6), P.shade(col, -0.12), null, 0, { opacity: '0.5' }) + P.path(P.blob(rnd, 22, 10, 0.2, 8, 0, -12), P.shade(col, 0.22), null, 0, { opacity: '0.5' });
      out += P.path('M-16 -6 Q-8 6 -14 22 M16 -6 Q8 6 14 22 M-11 8 L11 8', 'none', dk, 1, { opacity: '0.45' });
      out += P.circle(-8, -30, 2.8, TIP) + P.circle(8, -30, 2.8, TIP) + P.hl(-20, -16, 16, 4, '#FFFFFF', 0.3, -10);
      if (o.chilli) {
        out += P.scatter(rnd, 7, 42, 22, function (x, y, i, q) { return P.path(P.blob(q, 7 + q() * 6, 5 + q() * 4, 0.25, 8, x, y + 6), '#C33A26', P.shade('#C33A26', -0.2), 0.6, { opacity: '0.9' }); });
        out += P.scatter(rnd, 10, 80, 56, function (x, y) { return P.circle(x, y - 12, 2.4, '#7EA453', '#5E8C3A', 0.6) + P.circle(x, y - 12, 1, '#DCEBB8'); });
        out += P.scatter(rnd, 7, 70, 48, function (x, y, i, q) { return P.leaf(8, 6, '#5E8C3A', x, y - 8, q() * 360, { edge: '#4F7F2F', ew: 0.4 }); });
      }
      return out;
    };
  }
  function crabMeat(P, rnd) {
    var d = P.blob(rnd, 24, 18, 0.12, 11), out = P.shadow(d, 1.5, 2) + P.path(d, '#F2EBDD', '#D9CDB8', 0.8);
    // flaky clumps, some with the red-orange of the spanner crab's skin on them
    out += P.scatter(rnd, 26, 20, 14, function (x, y, i, q) {
      var rx = 3.4 + q() * 2.4, ry = 2.2 + q() * 1.4, t = q() * 180, s = P.path(P.blob(q, rx, ry, 0.3, 7), i % 2 ? '#FBF7F0' : '#F2EADC', '#D9CDB8', 0.5) + P.line(-rx * 0.5, -ry * 0.2, rx * 0.5, ry * 0.1, '#FFFFFF', 0.8, { opacity: '0.9' });
      if (i % 3 === 0) s += P.path('M' + N(-rx * 0.7) + ' ' + N(-ry * 0.5) + ' Q0 ' + N(-ry * 1.1) + ' ' + N(rx * 0.7) + ' ' + N(-ry * 0.4), 'none', '#EE8F70', 1.4, { opacity: '0.85', 'stroke-linecap': 'round' });
      return P.g(P.at(x, y, t), s);
    }, 5);
    return out + P.crumbs(rnd, 6, 18, 12, [C.herb], 0.7) + P.hl(-6, -7, 8, 2.4, '#FFFFFF', 0.35, -15);
  }
  // soft shell crab, fried whole: body, splayed legs and small claws, all in a crisp golden coat
  function softShellCrab(P, rnd) {
    var col = '#D9A050', dk = P.shade(col, -0.32), out = '';
    function leg(pts, w) { var d = 'M' + pts.map(function (p) { return N(p[0]) + ' ' + N(p[1]); }).join(' L'); return P.path(d, 'none', dk, w + 2, ROUND) + P.path(d, 'none', col, w, ROUND) + P.path(d, 'none', P.shade(col, 0.3), w * 0.3, { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: '0.6' }); }
    [-1, 1].forEach(function (s) {
      [-6, 3, 11, 18].forEach(function (y0, i) { out += leg([[s * 24, y0], [s * (36 + i), y0 - 3 + i * 3], [s * (41 + i), y0 + 7 + i * 3]], 6.4); });
      out += leg([[s * 18, -12], [s * 24, -22]], 7) + P.path(P.blob(rnd, 8.5, 6.5, 0.15, 9, s * 20, -29), col, dk, 1) + P.line(s * 20, -34, s * 18, -27, dk, 1.2);
    });
    var d = P.blob(rnd, 30, 20, 0.12, 14);
    out += P.shadow(d) + P.path(d, col, dk, 1.1) + P.path(P.blob(rnd, 24, 14, 0.15, 11), P.shade(col, 0.14), null, 0, { opacity: '0.8' });
    out += batterTex(P, rnd, 22, 13, col) + P.circle(-6, -18, 1.8, TIP) + P.circle(6, -18, 1.8, TIP);
    return out + P.hl(-8, -8, 10, 3, '#FFFFFF', 0.3, -10);
  }
  // lobster tail, the shell split and the meat sat up on top
  function lobsterTail(P, rnd) {
    var shell = '#D2442A', dk = P.shade(shell, -0.3), out = '';
    out += P.path('M28 -10 L50 -18 Q57 0 50 18 L28 10 Z', P.shade(shell, 0.1), dk, 0.9) + P.path('M30 0 L55 0 M30 -2 L52 -12 M30 2 L52 12', 'none', dk, 0.7);
    var sp = [[-46, -20], [-30, -22], [-14, -21], [2, -19], [18, -17], [30, -14], [34, 0], [30, 14], [18, 17], [2, 19], [-14, 21], [-30, 22], [-46, 20], [-49, 0]], d = P.smooth(sp);
    out += P.shadow(d) + P.path(d, shell, dk, 1.1);
    [-32, -18, -4, 10, 22].forEach(function (x) { out += P.path('M' + N(x) + ' -21 Q' + N(x + 4) + ' -16 ' + N(x + 1) + ' -12 M' + N(x) + ' 21 Q' + N(x + 4) + ' 16 ' + N(x + 1) + ' 12', 'none', dk, 0.9); });
    var mp = [[-44, -12], [-20, -14], [6, -12], [24, -8], [30, 0], [24, 8], [6, 12], [-20, 14], [-44, 12], [-47, 0]], m = P.smooth(mp);
    out += P.path(m, '#F7ECE2', '#D9B8A8', 0.8);
    out += P.path('M-40 -8 Q-10 -12 20 -6 M-40 7 Q-10 11 20 6 M-36 0 Q-6 -2 22 0', 'none', '#E8794A', 1.4, { opacity: '0.55', 'stroke-linecap': 'round' });
    return out + P.hl(-14, -5, 18, 2.6, '#FFFFFF', 0.45);
  }
  // half a lobster from above, cut side up: tail meat, the head with its legs and feelers, half a tail fan
  function halfLobster(o) {
    o = o || {};
    return function (P, rnd) {
      var shell = '#D2442A', dk = P.shade(shell, -0.3), out = '', cap = { 'stroke-linecap': 'round' };
      out += P.path('M-66 -6 Q-92 -20 -100 0 Q-104 12 -96 22', 'none', dk, 2.6, cap) + P.path('M-66 -6 Q-92 -20 -100 0 Q-104 12 -96 22', 'none', shell, 1.6, cap) + P.path('M-68 -2 Q-84 -4 -88 8', 'none', shell, 1.2, cap);
      [-56, -46, -36, -26].forEach(function (x, i) { var d0 = 'M' + N(x) + ' 14 L' + N(x - 6) + ' ' + N(26 + i) + ' L' + N(x - 2) + ' ' + N(34 + i); out += P.path(d0, 'none', dk, 3.4, ROUND) + P.path(d0, 'none', shell, 2, ROUND); });
      out += P.path('M54 -14 L74 -18 Q78 -4 72 6 L54 6 Z', P.shade(shell, 0.1), dk, 0.9) + P.path('M56 -4 L76 -6 M56 -10 L74 -14', 'none', dk, 0.6);
      var d = 'M-70 -16 L56 -14 L56 8 Q30 16 -8 18 Q-40 20 -62 16 Q-74 10 -72 -4 Z';
      out += P.shadow(d) + P.path(d, shell, dk, 1.2, ROUND);
      [-4, 12, 28, 42].forEach(function (x) { out += P.line(x, 11, x + 1, 17, dk, 0.9); });
      var meat = 'M-8 -12 L52 -11 L52 4 Q28 11 -8 13 Z';
      out += P.path(meat, '#F7EEE4', '#D9B8A8', 0.8) + P.path('M-6 -9 L50 -8', 'none', '#E8794A', 1.4, { opacity: '0.6' });
      out += P.g('translate(22 0)', P.grill(28, 9, 60, 10, '#8E5E2E', 2.2));
      out += P.path('M-66 -13 L-10 -12 L-10 12 Q-40 15 -60 12 Q-68 6 -66 -13 Z', '#D9A060', null, 0) + P.path(P.blob(rnd, 14, 6, 0.2, 8, -40, -2), '#A8A262', null, 0, { opacity: '0.85' }) + P.path(P.blob(rnd, 8, 4, 0.2, 7, -22, 4), '#EE8636', null, 0, { opacity: '0.8' });
      if (o.butter) out += P.path(P.blob(rnd, 34, 8, 0.2, 10, 18, -1), '#F2D27A', null, 0, { opacity: '0.45' }) + P.crumbs(rnd, 16, 50, 8, [C.herb], 0.8);
      return out + P.hl(20, -6, 22, 2, '#FFFFFF', 0.4);
    };
  }
  // Moreton Bay bug half, cut side up: the flat shovel at the front, head, tail meat and tail fan
  function bugHalf(o) {
    o = o || {};
    return function (P, rnd) {
      var shell = '#D9602A', dk = P.shade(shell, -0.3), out = '';
      // the flat shovel at the front: wider than the body, toothed along its front edge
      var sh = 'M-30 -12 L-50 -12';
      for (var y = -8.4; y <= 10; y += 3.6) sh += ' L-55 ' + N(y - 1.8) + ' L-51.5 ' + N(y);
      sh += ' Q-44 17 -30 11 Z';
      out += P.shadow(sh) + P.path(sh, P.shade(shell, 0.12), dk, 1, ROUND) + P.g('translate(-44 0)', P.crumbs(rnd, 9, 5, 8, [P.shade(shell, -0.22)], 0.9));
      // the shell, cut along the top edge, the tail edge in segments, the tail fan
      var edge = [[40, -12], [45, -5], [46, 5], [40, 12], [33, 12], [30, 10], [24, 12.5], [18, 11.5], [12, 13], [6, 11.5], [0, 13], [-6, 12], [-14, 15.5], [-26, 15.5], [-34, 10]];
      var d = 'M-34 -12 ' + P.smooth(edge, true).replace(/^M/, 'L') + ' Z';
      out += P.shadow(d) + P.path(d, shell, dk, 1.1, ROUND);
      out += P.path(P.smooth([[-32, -10], [-18, -10.5], [-8, -10], [-7, 0], [-9, 9], [-20, 12], [-30, 8], [-33, 0]]), '#D9A060', null, 0) + P.path(P.blob(rnd, 6, 4, 0.2, 7, -20, -1), '#A8A262', null, 0, { opacity: '0.8' });
      out += P.path(P.smooth([[-4, -10], [14, -10.5], [30, -10], [31, -2], [29, 6], [13, 9.5], [-3, 9], [-6, 0]]), '#F7EEE4', '#D9B8A8', 0.7) + P.g('translate(12 -1)', P.grill(17, 8.5, 60, 9, '#8E5E2E', 2));
      [3, 9, 15, 21, 27].forEach(function (x) { out += P.line(x, 9.8, x + 0.6, 12.6, dk, 0.8); });
      out += P.path('M34 -2 L45 -4 M34 4 L43 9', 'none', dk, 0.7);
      if (o.butter) out += P.path(P.blob(rnd, 18, 5, 0.2, 9, 12, -2), '#F2D27A', null, 0, { opacity: '0.5' }) + P.g('translate(8 -2)', P.crumbs(rnd, 12, 22, 6, [C.herb], 0.7));
      return out + P.hl(8, -6, 14, 1.6, '#FFFFFF', 0.4);
    };
  }

  /* ---------- raw and cured ---------- */
  function rawSlice(P, col, fat) {
    var d = 'M-15 -8 Q-4 -10 14 -8 Q17 -7 16 -3 L14 7 Q13 9 10 9 L-14 9 Q-17 8 -16 4 Z', out = P.shadow(d, 1.2, 1.5) + P.path(d, col, P.shade(col, -0.25), 0.8);
    if (fat) out += P.path('M-9 -8.5 Q-12 0 -9 8.5 M-2 -9 Q-5 0 -2 9 M5 -8.6 Q2 0 5 8.6 M11 -8 Q9 0 11 8', 'none', '#FCE3D2', 1.3, { opacity: '0.85' });
    else out += P.path('M-12 -2 Q0 -5 13 -1 M-12 4 Q0 1 12 5', 'none', P.shade(col, 0.2), 1, { opacity: '0.6' });
    return out + P.hl(-4, -5, 8, 1.4, '#FFFFFF', 0.45, -4);
  }
  function sashimi(P) {
    var out = '';
    [[SALMON, true, -15], [TUNA, false, 15]].forEach(function (row) { for (var i = 0; i < 3; i++) out += P.g(P.at(-22 + i * 19, row[2] + i * 0.8, -6), rawSlice(P, row[0], row[1])); });
    return out;
  }
  function crudo(P, rnd) {
    var out = '';
    // thin slices laid round like petals, the pink bloodline down one side of each
    for (var i = 0; i < 8; i++) {
      var a = i * 45 + 10, r = a * Math.PI / 180, d = P.shadow('M-17 0 Q-8 -9 15 -4.5 Q19 0 15 4.5 Q-8 9 -17 0 Z', 1, 1.4) + P.path('M-17 0 Q-8 -9 15 -4.5 Q19 0 15 4.5 Q-8 9 -17 0 Z', '#F4DED2', '#D2AA9C', 0.7) + P.path('M-13 3.5 Q0 6.5 15 3', 'none', '#D98A8A', 1.6, { opacity: '0.8' }) + P.hl(0, -2.5, 8, 1.2, '#FFFFFF', 0.4);
      out += P.g(P.at(Math.cos(r) * 16, Math.sin(r) * 16, a), d);
    }
    out += P.scatter(rnd, 10, 30, 30, function (x, y, i, q) { return P.circle(x, y, 1.6 + q() * 2, '#C9B84A', null, 0, { opacity: '0.5' }); });
    out += P.scatter(rnd, 6, 26, 26, function (x, y) { return P.circle(x, y, 2, '#C9302A', '#9E2B20', 0.5) + P.circle(x, y, 0.8, '#F2D2A6'); });
    return out + P.crumbs(rnd, 12, 28, 28, [C.herb, '#9CC067'], 1.1) + P.crumbs(rnd, 8, 26, 26, ['#2E2A26'], 0.5);
  }
  function tartare(P, rnd) {
    var out = P.shadow(circD(24)) + P.circle(0, 0, 24, '#A82432', '#7A1822', 1.1);
    out += P.scatter(rnd, 46, 21, 21, function (x, y, i, q) { var s = 2.2 + q() * 1.6; return P.g(P.at(x, y, q() * 90), P.rect(-s, -s, s * 2, s * 2, 0.8, ['#B8283A', '#C93848', '#9E2030', '#D04A58'][i % 4], null, 0)); }, 4);
    out += P.scatter(rnd, 8, 18, 18, function (x, y, i, q) { var t = q() * Math.PI; return P.line(x - Math.cos(t) * 2.5, y - Math.sin(t) * 2.5, x + Math.cos(t) * 2.5, y + Math.sin(t) * 2.5, '#5E8C3A', 1.1); });
    return out + P.crumbs(rnd, 10, 18, 18, ['#F4EBCB', '#F7F1DE'], 0.8) + P.hl(-8, -10, 8, 2.4, '#FFFFFF', 0.35, -25);
  }
  function cube(P, s, col) {
    return P.rect(-s / 2 + 1.2, -s / 2 + 1.6, s, s, 1.4, P.shade(col, -0.25), null, 0) + P.rect(-s / 2, -s / 2, s, s, 1.4, col, P.shade(col, -0.3), 0.7) + P.line(-s / 2 + 1.6, -s / 2 + 1.4, s / 2 - 2, -s / 2 + 1.4, '#FFFFFF', 0.8, { opacity: '0.4' });
  }
  function poke(P, rnd) {
    var out = P.scatter(rnd, 15, 30, 24, function (x, y, i, q) { return P.g(P.at(x, y, q() * 40 - 20), cube(P, 8.5 + q() * 1.5, i % 2 ? TUNA : SALMON) + (i % 2 ? '' : P.line(-3, -1, 3, 2, '#FCE3D2', 0.9, { opacity: '0.7' }))); }, 9);
    out += P.crumbs(rnd, 18, 30, 24, ['#F7F1DE', '#2E2A26'], 0.7);
    return out + P.scatter(rnd, 6, 30, 24, function (x, y) { return P.circle(x, y, 1.8, '#7EA453', '#5E8C3A', 0.5) + P.circle(x, y, 0.8, '#DCEBB8'); });
  }
  function nigiri(col, fat) {
    return function (P, rnd) {
      var rice = 'M-19 -7 Q-19 -9 -15 -9 L15 -9 Q19 -9 19 -5 L19 5 Q19 9 15 9 L-15 9 Q-19 9 -19 5 Z', out = P.shadow(rice) + P.path(rice, RICE, '#D9D2C2', 0.9);
      out += P.scatter(rnd, 10, 17, 8, function (x, y, i, q) { return P.ellipse(x, y, 1.6, 0.8, '#FFFFFF', '#E3DCCC', 0.4, { transform: 'rotate(' + N(q() * 180) + ' ' + N(x) + ' ' + N(y) + ')' }); });
      var fish = 'M-22 -6 Q-10 -9 20 -7 Q24 -4 22 1 Q10 6 -20 6 Q-24 2 -22 -6 Z';
      out += P.path(fish, col, P.shade(col, -0.25), 0.8);
      if (fat) out += P.path('M-14 -7 Q-17 0 -14 5.5 M-6 -7.6 Q-9 0 -6 6 M2 -7.6 Q-1 0 2 5.6 M10 -7.4 Q7 0 10 4.6', 'none', '#FCE3D2', 1.2, { opacity: '0.85' });
      else out += P.path('M-18 -1 Q0 -4 20 -2', 'none', P.shade(col, 0.2), 1, { opacity: '0.6' });
      return out + P.hl(-4, -4, 10, 1.4, '#FFFFFF', 0.5);
    };
  }
  function maki(P, rnd, fill) {
    var out = P.shadow(circD(10)) + P.circle(0, 0, 10, '#1F2A24', '#121815', 0.9) + P.circle(0, 0, 8.4, RICE, '#E3DCCC', 0.5);
    out += P.scatter(rnd, 6, 6.4, 6.4, function (x, y, i, q) { return P.ellipse(x, y, 1.4, 0.7, '#FFFFFF', '#E3DCCC', 0.3, { transform: 'rotate(' + N(q() * 180) + ' ' + N(x) + ' ' + N(y) + ')' }); });
    if (fill === 'salmon') out += P.rect(-3, -3, 6, 6, 1, SALMON, P.shade(SALMON, -0.25), 0.5);
    else if (fill === 'tuna') out += P.rect(-3, -3, 6, 6, 1, TUNA, P.shade(TUNA, -0.25), 0.5);
    else out += P.rect(-3.4, -2.6, 3.4, 5.2, 0.8, '#7EA453', '#5E8C3A', 0.4) + P.rect(0, -2.6, 3.2, 5.2, 0.8, '#C9DE98', '#9CC067', 0.4);
    return out + P.path('M-7 -6 A9.4 9.4 0 0 1 0 -9.4', 'none', '#FFFFFF', 0.9, { opacity: '0.35' });
  }
  function makiSet(P, rnd) {
    var out = '', f = ['salmon', 'cucumber', 'tuna'];
    for (var i = 0; i < 6; i++) out += P.g(P.at(-22 + (i % 3) * 22, i < 3 ? -11 : 11), maki(P, rnd, f[(i + (i < 3 ? 0 : 1)) % 3]));
    return out;
  }
  function roe(o) {
    return function (P, rnd) {
      var out = P.path(P.blob(rnd, o.rx, o.rx * 0.85, 0.1, 10), P.shade(o.col, -0.3), null, 0);
      out += P.scatter(rnd, o.count, o.rx - o.r * 0.6, (o.rx - o.r * 0.6) * 0.82, function (x, y, i, q) { return P.circle(x, y, o.r * (0.9 + q() * 0.2), o.col, P.shade(o.col, -0.35), 0.4) + P.circle(x - o.r * 0.35, y - o.r * 0.35, o.r * 0.32, '#FFFFFF', null, 0, { opacity: o.hiOp || '0.75' }); }, o.r * 1.6);
      return out;
    };
  }
  function seafoodStick(P) {
    var d = 'M-32 -5 Q-33 0 -32 5 L32 5 Q33 0 32 -5 Z', out = P.shadow(d) + P.path(d, '#F7F1E6', '#D9CDB8', 0.8);
    out += P.path('M-32 -5 L32 -5 L32 -0.5 Q16 0.8 0 -0.4 T-32 -0.6 Z', '#E0502E', null, 0) + P.line(-30, 2.5, 30, 2.5, '#E9DFCF', 0.7) + P.line(-30, -3, 30, -3, P.shade('#E0502E', 0.25), 0.8, { opacity: '0.7' });
    return out + P.path(d, 'none', P.shade('#E0502E', -0.15), 0.6, { opacity: '0.5' });
  }
  // seafood chowder: creamy, with potato, fish, prawns, a mussel or two and parsley
  function chowder(P, rnd) {
    var col = '#F0E2C0', out = P.path(P.blob(rnd, 60, 57, 0.04, 14), col, P.shade(col, -0.22), 1.1);
    out += P.path(P.blob(rnd, 48, 44, 0.12, 12), P.shade(col, 0.3), null, 0, { opacity: '0.6' });
    out += P.scatter(rnd, 10, 46, 44, function (x, y, i, q) { return P.g(P.at(x, y, q() * 60), P.rect(-3.8, -3.8, 7.6, 7.6, 1.6, '#F3E1A6', '#D9C27A', 0.6)); }, 10);
    out += P.scatter(rnd, 6, 42, 40, function (x, y, i, q) { return P.path(P.blob(q, 6, 4.5, 0.25, 8, x, y), '#FAF6EC', '#DCD3BE', 0.6); }, 14);
    out += P.scatter(rnd, 4, 34, 32, function (x, y, i, q) { return P.g(P.at(x, y, q() * 360, 0.7), prawnCurl(P)); }, 24);
    out += P.g(P.at(24, -26, 40, 0.6), mussel(P)) + P.g(P.at(-30, 22, -120, 0.6), mussel(P));
    return out + P.crumbs(rnd, 30, 50, 48, [C.herb, '#3E6A2A'], 1) + P.crumbs(rnd, 14, 48, 46, ['#3A342E'], 0.5);
  }

  /* ---------- the items ---------- */
  var thai = function (P, rnd) { return thaiCake(P, rnd); };
  var pakora = function (P, rnd) { return P.scatter(rnd, 7, 26, 20, function (x, y, i, q) { return P.g(P.at(x, y, q() * 180), pakoraPiece(P, q)) + (i % 3 === 0 ? P.leaf(6, 3, '#3E6A2A', x + 4, y - 3, q() * 360, { vein: false }) : ''); }); };
  L.add('seafood', [
    // fish
    { id: 'fish-fillet-grilled', name: 'Grilled fish fillet', sub: 'Fish', kw: 'fish fillet grilled white fish snapper barra hake dory market fish catch of the day', form: 'piece', cook: 'grilled', role: 'main', g: 180, w: 110, h: 50, side: { s: 'slab', h: 16, c: FLESH }, draw: grilledFillet({ len: 108, wid: 50 }) },
    { id: 'barramundi-fillet', name: 'Barramundi fillet, crispy skin', sub: 'Fish', kw: 'barra barramundi crispy skin pan fried skin on scored fish fillet snapper', form: 'piece', cook: 'fried', role: 'main', g: 200, w: 106, h: 56, side: { s: 'slab', h: 18, c: '#C99C58' }, draw: skinFillet({ len: 106, wid: 56, flesh: WHITE_FISH, skin: '#C99C58', blister: 18, speck: 8, speckCol: '#8A5A2A', scores: [-0.45, -0.15, 0.15, 0.42] }) },
    { id: 'salmon-fillet', name: 'Salmon fillet, seared', sub: 'Fish', kw: 'salmon fillet atlantic tassie tasmanian seared pan fried portion fish', form: 'piece', cook: 'fried', role: 'main', g: 200, w: 82, h: 52, side: { s: 'slab', h: 26, c: '#F0905E' }, draw: salmonPortion({ rx: 41, ry: 26, sear: '#C9783A' }) },
    { id: 'ocean-trout', name: 'Ocean trout, crispy skin', sub: 'Fish', kw: 'ocean trout steelhead crispy skin skin on fish fillet pink', form: 'piece', cook: 'fried', role: 'main', g: 180, w: 90, h: 48, side: { s: 'slab', h: 20, c: '#B09670' }, draw: skinFillet({ len: 90, wid: 48, flesh: '#EE8A5E', skin: '#B09670', blister: 14, speck: 20, tail: 0.5 }) },
    { id: 'whole-fish-grilled', name: 'Whole fish, grilled', sub: 'Fish', kw: 'whole fish snapper baby barra bream plate size scored grilled head and tail', form: 'whole', cook: 'grilled', role: 'main', g: 500, w: 188, h: 72, side: { s: 'slab', h: 32, c: '#C49A60' }, draw: wholeFish({ len: 150, ht: 60 }) },
    { id: 'whiting-fillets', name: 'Whiting fillets, pan fried', sub: 'Fish', kw: 'whiting fillets butterflied king george sand whiting pan fried floured', form: 'piece', cook: 'fried', role: 'main', n: 3, w: 92, h: 72, side: { s: 'slab', h: 8, c: '#E6B866' }, draw: group([[-6, -18, -6, 1, whitingFillet], [8, 0, 4, 1, whitingFillet], [-2, 18, -2, 1, whitingFillet]]) },
    { id: 'coral-trout', name: 'Coral trout fillet', sub: 'Fish', kw: 'coral trout reef fish red skin skin on fillet', form: 'piece', cook: 'fried', role: 'main', g: 200, w: 100, h: 52, side: { s: 'slab', h: 18, c: '#D7473A' }, draw: skinFillet({ len: 100, wid: 52, flesh: WHITE_FISH, skin: '#D7473A', spots: 40, blister: 6 }) },
    { id: 'red-emperor', name: 'Red emperor fillet', sub: 'Fish', kw: 'red emperor reef fish fillet pan seared pink skin snapper', form: 'piece', cook: 'fried', role: 'main', g: 200, w: 102, h: 54, side: { s: 'slab', h: 18, c: WHITE_FISH }, draw: grilledFillet({ len: 102, wid: 54, col: WHITE_FISH, rim: '#E0606A', marks: false, sear: '#E2B872' }) },
    { id: 'mackerel-cutlet', name: 'Spanish mackerel cutlet', sub: 'Fish', kw: 'spanish mackerel cutlet steak macko narrow barred bone in grilled', form: 'piece', cook: 'grilled', role: 'main', g: 220, w: 70, h: 64, side: { s: 'slab', h: 20, c: '#ECD9BA' }, draw: cutlet },
    { id: 'smoked-salmon', name: 'Smoked salmon', sub: 'Fish', kw: 'smoked salmon lox ribbons slices cold smoked', form: 'slices', cook: 'smoked', role: 'topping', g: 50, w: 66, h: 50, side: { s: 'layer', h: 8, c: '#F28A64' }, draw: smokedSalmon },
    { id: 'smoked-trout', name: 'Smoked trout, flaked', sub: 'Fish', kw: 'smoked trout flakes flaked hot smoked', form: 'scatter', cook: 'smoked', role: 'topping', g: 40, w: 58, h: 42, side: { s: 'pile', h: 8, c: '#E9A585' }, draw: troutFlakes },
    { id: 'thai-fish-cakes', name: 'Thai fish cakes', sub: 'Fish', kw: 'thai fish cakes tod man pla red curry snake bean kaffir lime', form: 'piece', cook: 'fried', role: 'main', n: 3, w: 78, h: 66, side: { s: 'disc', h: 10, c: '#C98C48' }, draw: group([[-18, -14, 0, 1, thai], [18, -10, 40, 1, thai], [0, 16, 80, 1, thai]]) },
    // fried
    { id: 'fish-battered', name: 'Battered fish fillet', sub: 'Fried', kw: 'battered fish beer batter fish and chips flake hake barra dory fried', form: 'piece', cook: 'battered', role: 'main', g: 200, w: 124, h: 56, side: { s: 'slab', h: 22, c: BATTER }, draw: battered({ len: 122, wid: 54 }) },
    { id: 'fish-crumbed', name: 'Crumbed fish fillet', sub: 'Fried', kw: 'crumbed fish panko breadcrumbed fillet fried', form: 'piece', cook: 'crumbed', role: 'main', g: 180, w: 112, h: 52, side: { s: 'slab', h: 18, c: C.golden }, draw: crumbedFillet({ len: 110, wid: 50 }) },
    { id: 'flathead-battered', name: 'Battered flathead tails', sub: 'Fried', kw: 'flathead tails fillets battered beer batter fish and chips', form: 'piece', cook: 'battered', role: 'main', n: 3, w: 80, h: 64, side: { s: 'slab', h: 14, c: BATTER }, draw: group([[-4, -20, -8, 1, battered({ len: 68, wid: 21 })], [4, 0, 5, 1, battered({ len: 70, wid: 22 })], [-2, 20, -3, 1, battered({ len: 66, wid: 21 })]]) },
    { id: 'fish-bites', name: 'Fish bites', sub: 'Fried', kw: 'fish bites goujons nuggets battered fish pieces kids', form: 'pile', cook: 'battered', role: 'main', g: 150, w: 76, h: 60, side: { s: 'pile', h: 20, c: BATTER }, draw: nuggetPile({ count: 7, prx: 24, pry: 18, rx: 12, ry: 8.5 }) },
    { id: 'fishcake-crumbed', name: 'Fishcake, crumbed', sub: 'Fried', kw: 'fishcake fish cake crumbed salmon potato patty', form: 'piece', cook: 'crumbed', role: 'main', n: 1, w: 56, h: 52, side: { s: 'disc', h: 16, c: C.golden }, draw: crumbedCake },
    { id: 'fish-pakora', name: 'Fish pakora', sub: 'Fried', kw: 'fish pakora pakoda besan chickpea batter indian fried curry leaf', form: 'pile', cook: 'fried', role: 'main', g: 150, w: 78, h: 60, side: { s: 'pile', h: 20, c: '#D98A34' }, draw: pakora },
    // prawns
    { id: 'prawns-peeled', name: 'Prawns, peeled', sub: 'Prawns', kw: 'prawns peeled cooked king prawns tiger shrimp shrimps tail on', form: 'cluster', cook: 'poached', role: 'main', n: 5, w: 82, h: 56, side: { s: 'pile', h: 14, c: PRAWN }, draw: function (P, rnd) { return P.scatter(rnd, 5, 24, 13, function (x, y, i, q) { return P.g(P.at(x, y, q() * 360), prawnCurl(P)); }, 22); } },
    { id: 'prawns-whole', name: 'Prawns, whole', sub: 'Prawns', kw: 'whole prawns head on shell on king prawns banana tiger cooked shrimp', form: 'whole', cook: 'poached', role: 'main', n: 3, w: 124, h: 80, side: { s: 'pile', h: 18, c: '#EC7438' }, draw: group([[6, -22, -6, 0.85, wholePrawn], [2, 2, 3, 0.85, wholePrawn], [8, 26, 9, 0.85, wholePrawn]]) },
    { id: 'prawn-skewer', name: 'Prawn skewer', sub: 'Prawns', kw: 'prawn skewer kebab grilled bbq prawns stick', form: 'skewer', cook: 'grilled', role: 'main', n: 1, w: 140, h: 34, side: { s: 'stick', h: 16, c: PRAWN }, draw: prawnSkewer },
    { id: 'prawn-cutlets', name: 'Prawn cutlets, crumbed', sub: 'Prawns', kw: 'prawn cutlets butterflied crumbed panko fried tail on', form: 'piece', cook: 'crumbed', role: 'main', n: 3, w: 74, h: 78, side: { s: 'slab', h: 10, c: C.golden }, draw: group([[-6, -22, -10, 0.9, prawnCutlet], [6, 0, 8, 0.9, prawnCutlet], [-4, 22, -4, 0.9, prawnCutlet]]) },
    { id: 'popcorn-prawns', name: 'Popcorn prawns', sub: 'Prawns', kw: 'popcorn prawns battered fried bites shrimp', form: 'pile', cook: 'battered', role: 'main', g: 120, w: 70, h: 56, side: { s: 'pile', h: 18, c: '#E6AE52' }, draw: nuggetPile({ count: 14, prx: 26, pry: 20, rx: 7, ry: 5.5, col: '#E6AE52', wob: 0.22 }) },
    { id: 'tempura-prawns', name: 'Tempura prawns', sub: 'Prawns', kw: 'tempura prawns battered japanese fried tail on ebi', form: 'piece', cook: 'battered', role: 'main', n: 3, w: 92, h: 62, side: { s: 'slab', h: 14, c: '#EDD38C' }, draw: group([[-6, -20, -8, 1, tempura({ len: 64, wid: 17, tail: true })], [2, 0, 4, 1, tempura({ len: 66, wid: 18, tail: true })], [-4, 20, -2, 1, tempura({ len: 62, wid: 17, tail: true })]]) },
    { id: 'prawn-cocktail', name: 'Prawn cocktail', sub: 'Prawns', kw: 'prawn cocktail marie rose seafood sauce glass lettuce retro entree', form: 'portion', cook: 'poached', role: 'main', n: 1, w: 76, h: 76, side: { s: 'cup', h: 60, c: '#EE8A6A' }, draw: prawnCocktail },
    { id: 'curried-prawns', name: 'Curried prawns', sub: 'Prawns', kw: 'curried prawns prawn curry malabar coconut sauce bowl', form: 'bowlful', cook: 'braised', role: 'main', g: 300, w: 118, h: 110, side: { s: 'mound', h: 26, c: '#D8922E' }, draw: curryPrawns },
    { id: 'garlic-prawns', name: 'Garlic prawns', sub: 'Prawns', kw: 'garlic prawns sizzling garlic butter chilli gambas pil pil', form: 'bowlful', cook: 'fried', role: 'main', g: 200, w: 106, h: 90, side: { s: 'mound', h: 18, c: '#E3B850' }, draw: garlicPrawns },
    { id: 'prawn-toast', name: 'Prawn toast', sub: 'Prawns', kw: 'prawn toast sesame toast triangles yum cha fried', form: 'piece', cook: 'fried', role: 'main', n: 4, w: 64, h: 64, side: { s: 'slab', h: 10, c: '#E7A47A' }, draw: group([[0, -21, 180, 0.9, prawnToast], [-21, 0, 90, 0.9, prawnToast], [21, 0, 270, 0.9, prawnToast], [0, 21, 0, 0.9, prawnToast]]) },
    { id: 'prawn-twisters', name: 'Prawn twisters', sub: 'Prawns', kw: 'prawn twisters pastry wrapped prawns spring roll pastry fried', form: 'piece', cook: 'fried', role: 'main', n: 4, w: 84, h: 62, side: { s: 'stick', h: 12, c: '#E2AE5C' }, draw: group([[-2, -22, -8, 1, twister], [4, -7, 4, 1, twister], [-4, 8, -3, 1, twister], [2, 23, 7, 1, twister]]) },
    // shellfish
    { id: 'scallops-seared', name: 'Scallops, seared', sub: 'Shellfish', kw: 'scallops seared pan seared caramelised scallop', form: 'piece', cook: 'fried', role: 'main', n: 5, w: 126, h: 40, side: { s: 'disc', h: 14, c: '#F3E8D2' }, draw: function (P, rnd) { return P.fan(5, 160, 40, function (x, y) { return P.g(P.at(x, y - 6), scallop({ sear: '#C98A3A' })(P, rnd)); }); } },
    { id: 'scallop-half-shell', name: 'Scallop in the half shell', sub: 'Shellfish', kw: 'scallop half shell roe on baked garlic butter', form: 'half', cook: 'baked', role: 'main', n: 1, w: 70, h: 58, side: { s: 'cup', h: 16, c: '#E7C3A0' }, draw: scallopShell },
    { id: 'scallops-roe-on', name: 'Scallops, roe on', sub: 'Shellfish', kw: 'roe on scallops hervey bay coral seared', form: 'piece', cook: 'fried', role: 'main', n: 4, w: 108, h: 48, side: { s: 'disc', h: 14, c: '#F3E8D2' }, draw: function (P, rnd) { return P.fan(4, 150, 34, function (x, y) { return P.g(P.at(x, y - 4), scallop({ roe: true, sear: '#D9A55A', r: 12 })(P, rnd)); }); } },
    { id: 'scallops-battered', name: 'Scallops, battered', sub: 'Shellfish', kw: 'battered scallops fish and chip shop scallop fried', form: 'pile', cook: 'battered', role: 'main', n: 5, w: 78, h: 60, side: { s: 'pile', h: 18, c: BATTER }, draw: nuggetPile({ count: 5, prx: 22, pry: 16, rx: 14, ry: 12.5, wob: 0.12 }) },
    { id: 'mussels', name: 'Mussels, open', sub: 'Shellfish', kw: 'mussels black mussels open shells steamed moules', form: 'cluster', cook: 'steamed', role: 'main', n: 6, w: 100, h: 84, side: { s: 'pile', h: 22, c: '#2C2A36' }, draw: mussels(6, 28, 22, false) },
    { id: 'mussel-pot', name: 'Mussel pot, 1 kg', sub: 'Shellfish', kw: 'mussel pot kilo pot moules white wine garlic broth steamed bowl', form: 'bowlful', cook: 'steamed', role: 'main', g: 1000, w: 156, h: 144, side: { s: 'pile', h: 50, c: '#2C2A36' }, draw: mussels(18, 54, 48, true) },
    { id: 'oysters-natural', name: 'Oyster natural', sub: 'Shellfish', kw: 'oyster natural half shell raw sydney rock pacific shucked', form: 'half', cook: 'raw', role: 'main', n: 1, w: 64, h: 44, side: { s: 'cup', h: 14, c: '#A39A87' }, draw: oyster({}) },
    { id: 'oysters-kilpatrick', name: 'Oyster Kilpatrick', sub: 'Shellfish', kw: 'oyster kilpatrick bacon worcestershire grilled half shell', form: 'half', cook: 'grilled', role: 'main', n: 1, w: 64, h: 44, of: 'oysters-natural', side: { s: 'cup', h: 16, c: '#A39A87' }, draw: oyster({ top: 'kilpatrick' }) },
    { id: 'oysters-mignonette', name: 'Oyster with mignonette', sub: 'Shellfish', kw: 'oyster mignonette red wine vinegar shallot half shell raw', form: 'half', cook: 'raw', role: 'main', n: 1, w: 64, h: 44, of: 'oysters-natural', side: { s: 'cup', h: 14, c: '#A39A87' }, draw: oyster({ top: 'mignonette' }) },
    { id: 'pippies', name: 'Pippies', sub: 'Shellfish', kw: 'pippies pipis vongole clams white wine chilli garlic', form: 'cluster', cook: 'steamed', role: 'main', g: 250, w: 118, h: 96, side: { s: 'pile', h: 14, c: '#E6D3AE' }, draw: pippies },
    // squid and octopus
    { id: 'calamari-rings', name: 'Calamari rings', sub: 'Squid and octopus', kw: 'calamari rings squid rings battered fried', form: 'pile', cook: 'battered', role: 'main', g: 150, w: 86, h: 70, side: { s: 'pile', h: 20, c: '#EBC781' }, draw: function (P, rnd) { return P.pile(rnd, 9, 28, 22, function (x, y, i, q) { return P.g(P.at(x, y), calamariRing(P, q)); }); } },
    { id: 'salt-pepper-squid', name: 'Salt and pepper squid', sub: 'Squid and octopus', kw: 'salt and pepper squid calamari s and p chilli dusted fried tentacles', form: 'pile', cook: 'fried', role: 'main', g: 150, w: 92, h: 72, side: { s: 'pile', h: 18, c: '#ECD196' }, draw: saltPepperSquid },
    { id: 'octopus-tentacle', name: 'Octopus tentacle, chargrilled', sub: 'Squid and octopus', kw: 'octopus tentacle chargrilled grilled charred polpo', form: 'piece', cook: 'grilled', role: 'main', n: 1, w: 92, h: 82, side: { s: 'stick', h: 16, c: '#97463F' }, draw: tentacle },
    { id: 'cuttlefish-strips', name: 'Cuttlefish strips', sub: 'Squid and octopus', kw: 'cuttlefish strips scored grilled chargrilled squid', form: 'pile', cook: 'grilled', role: 'main', g: 120, w: 90, h: 64, side: { s: 'pile', h: 12, c: '#F2EBDC' }, draw: cuttlefishStrips },
    // crab and lobster
    { id: 'crab-claw', name: 'Crab claw', sub: 'Crab and lobster', kw: 'crab claw pincer mud crab blue swimmer cooked', form: 'piece', cook: 'steamed', role: 'main', n: 1, w: 70, h: 36, side: { s: 'slab', h: 20, c: SHELL }, draw: function (P) { return claw(P); } },
    { id: 'crab-claws-crumbed', name: 'Crab claws, crumbed', sub: 'Crab and lobster', kw: 'crumbed crab claws crab balls fried', form: 'piece', cook: 'crumbed', role: 'main', n: 4, w: 84, h: 70, side: { s: 'slab', h: 18, c: '#D99A4A' }, draw: group([[-8, -24, -10, 0.8, crumbedClaw], [10, -8, 8, 0.8, crumbedClaw], [-10, 8, -4, 0.8, crumbedClaw], [8, 24, 12, 0.8, crumbedClaw]]) },
    { id: 'mud-crab', name: 'Mud crab, whole', sub: 'Crab and lobster', kw: 'mud crab muddie whole crab cooked steamed', form: 'whole', cook: 'steamed', role: 'main', n: 1, w: 180, h: 130, side: { s: 'mound', h: 50, c: '#D0502E' }, draw: mudCrab({}) },
    { id: 'chilli-mud-crab', name: 'Chilli mud crab', sub: 'Crab and lobster', kw: 'chilli mud crab singapore chilli sauce whole crab', form: 'whole', cook: 'braised', role: 'main', n: 1, w: 196, h: 150, of: 'mud-crab', side: { s: 'mound', h: 50, c: '#C33A26' }, draw: mudCrab({ chilli: true }) },
    { id: 'spanner-crab-meat', name: 'Spanner crab meat, picked', sub: 'Crab and lobster', kw: 'spanner crab meat picked crab blue swimmer crabmeat', form: 'mound', cook: 'steamed', role: 'topping', g: 60, w: 50, h: 38, side: { s: 'mound', h: 14, c: '#F1EADC' }, draw: crabMeat },
    { id: 'soft-shell-crab', name: 'Soft shell crab, fried', sub: 'Crab and lobster', kw: 'soft shell crab fried tempura crispy whole', form: 'whole', cook: 'fried', role: 'main', n: 1, w: 96, h: 68, side: { s: 'slab', h: 16, c: '#D9A050' }, draw: softShellCrab },
    { id: 'lobster-tail', name: 'Lobster tail, split', sub: 'Crab and lobster', kw: 'lobster tail crayfish cray split shell piggyback rock lobster', form: 'piece', cook: 'grilled', role: 'main', n: 1, w: 106, h: 46, side: { s: 'slab', h: 26, c: '#D2442A' }, draw: lobsterTail },
    { id: 'half-lobster', name: 'Half lobster, grilled', sub: 'Crab and lobster', kw: 'half lobster grilled crayfish cray rock lobster thermidor mornay garlic butter', form: 'half', cook: 'grilled', role: 'main', n: 1, w: 180, h: 58, side: { s: 'slab', h: 24, c: '#D2442A' }, draw: halfLobster({ butter: true }) },
    { id: 'bug-halves', name: 'Moreton Bay bug halves', sub: 'Crab and lobster', kw: 'moreton bay bugs bug halves balmain bug grilled split', form: 'half', cook: 'grilled', role: 'main', n: 2, w: 102, h: 60, side: { s: 'slab', h: 16, c: '#D9602A' }, draw: group([[0, -14, 0, [1, -1], bugHalf({})], [0, 14, 0, 1, bugHalf({})]]) },
    { id: 'slipper-lobster-half', name: 'Slipper lobster half, garlic butter', sub: 'Crab and lobster', kw: 'slipper lobster bay lobster balmain bug half garlic butter grilled', form: 'half', cook: 'grilled', role: 'main', n: 1, w: 132, h: 38, of: 'bug-halves', side: { s: 'slab', h: 18, c: '#D9602A' }, draw: group([[0, 0, 0, 1.3, bugHalf({ butter: true })]]) },
    { id: 'tempura-bug', name: 'Tempura bug tails', sub: 'Crab and lobster', kw: 'tempura bugs moreton bay bug meat battered fried', form: 'piece', cook: 'battered', role: 'main', n: 3, w: 76, h: 62, side: { s: 'slab', h: 16, c: '#EDD38C' }, draw: group([[-8, -18, -10, 1, tempura({ len: 44, wid: 22 })], [12, 0, 12, 1, tempura({ len: 46, wid: 22 })], [-6, 19, -4, 1, tempura({ len: 42, wid: 21 })]]) },
    // raw and cured
    { id: 'sashimi', name: 'Sashimi, salmon and tuna', sub: 'Raw and cured', kw: 'sashimi salmon tuna raw slices sushi grade', form: 'slices', cook: 'raw', role: 'main', n: 6, w: 80, h: 52, side: { s: 'layer', h: 8, c: SALMON }, draw: sashimi },
    { id: 'crudo', name: 'Crudo', sub: 'Raw and cured', kw: 'crudo kingfish hiramasa raw sliced olive oil chilli carpaccio', form: 'fan', cook: 'raw', role: 'main', g: 80, w: 76, h: 76, side: { s: 'layer', h: 4, c: '#F4DED2' }, draw: crudo },
    { id: 'tuna-tartare', name: 'Tuna tartare', sub: 'Raw and cured', kw: 'tuna tartare tartar raw diced ring moulded', form: 'portion', cook: 'raw', role: 'main', g: 80, w: 50, h: 50, side: { s: 'disc', h: 22, c: '#A82432' }, draw: tartare },
    { id: 'poke-cubes', name: 'Salmon and tuna poke', sub: 'Raw and cured', kw: 'poke cubes salmon tuna raw diced sesame poke bowl', form: 'scatter', cook: 'raw', role: 'main', g: 120, w: 72, h: 60, side: { s: 'pile', h: 10, c: SALMON }, draw: poke },
    { id: 'sushi-nigiri', name: 'Sushi nigiri', sub: 'Raw and cured', kw: 'sushi nigiri salmon tuna rice', form: 'piece', cook: 'raw', role: 'main', n: 2, w: 52, h: 48, side: { s: 'slab', h: 18, c: RICE }, draw: group([[0, -12, -4, 1, nigiri(SALMON, true)], [2, 12, 3, 1, nigiri(TUNA, false)]]) },
    { id: 'sushi-maki', name: 'Sushi rolls, maki', sub: 'Raw and cured', kw: 'sushi roll maki hand roll pieces nori salmon tuna cucumber', form: 'piece', cook: 'raw', role: 'main', n: 6, w: 66, h: 44, side: { s: 'disc', h: 16, c: '#1F2A24' }, draw: makiSet },
    { id: 'roe-pearls', name: 'Salmon roe', sub: 'Raw and cured', kw: 'salmon roe ikura roe pearls fish eggs caviar trout roe', form: 'mound', cook: 'cured', role: 'garnish', g: 10, w: 22, h: 19, side: { s: 'mound', h: 8, c: '#F07A2A' }, draw: roe({ rx: 11, r: 1.9, count: 22, col: '#F07A2A' }) },
    { id: 'caviar', name: 'Caviar', sub: 'Raw and cured', kw: 'caviar black roe sturgeon lumpfish', form: 'mound', cook: 'cured', role: 'garnish', g: 10, w: 20, h: 17, of: 'roe-pearls', side: { s: 'mound', h: 6, c: '#2A2A2E' }, draw: roe({ rx: 10, r: 1.2, count: 40, col: '#2E2E34', hiOp: '0.45' }) },
    { id: 'seafood-stick', name: 'Seafood stick', sub: 'Raw and cured', kw: 'seafood stick crab stick seafood extender surimi kani', form: 'stick', role: 'main', n: 3, w: 72, h: 44, side: { s: 'stick', h: 12, c: '#E0502E' }, draw: group([[-2, -14, -4, 1, seafoodStick], [2, 0, 2, 1, seafoodStick], [0, 14, -2, 1, seafoodStick]]) },
    // bowls
    { id: 'seafood-chowder', name: 'Seafood chowder', sub: 'Bowls', kw: 'seafood chowder creamy soup potato bacon fish prawns mussels bowl', form: 'bowlful', cook: 'braised', role: 'main', g: 350, w: 122, h: 116, side: { s: 'sauce', h: 30, c: '#F0E2C0' }, draw: chowder }
  ]);
  // a butterflied whiting fillet: two lobes from the tail, pan fried golden
  function whitingFillet(P, rnd) {
    var col = '#E6B866', pts = [[-34, -3], [-30, -12], [-16, -16], [4, -13], [22, -6], [34, -2], [38, 0], [34, 2], [22, 6], [4, 13], [-16, 16], [-30, 12], [-34, 3], [-29, 0]], d = P.smooth(pts);
    var out = P.shadow(d) + P.path(d, col, P.shade(col, -0.3), 1) + P.path(P.smooth(sc(pts, 0.8, 0.7, -2)), P.shade(col, 0.16), null, 0, { opacity: '0.8' });
    out += P.scatter(rnd, 5, 22, 9, function (x, y, i, q) { return P.path(P.blob(q, 4 + q() * 3, 2 + q() * 2, 0.3, 7, x - 4, y), '#C98A3A', null, 0, { opacity: '0.45' }); });
    out += P.path('M-28 0 Q0 1 34 0', 'none', P.shade(col, -0.2), 0.9, { opacity: '0.6' });
    return out + P.hl(-8, -7, 12, 2, '#FFFFFF', 0.3, -6);
  }
  L.SEAFOOD = { filletPts: filletPts, grilledFillet: grilledFillet, battered: battered, crumbedFillet: crumbedFillet, skinFillet: skinFillet, salmonPortion: salmonPortion, prawnCurl: prawnCurl, wholePrawn: wholePrawn, scallop: scallop, mussel: mussel, oyster: oyster, calamariRing: calamariRing, claw: claw, nugget: nugget, tempura: tempura, rawSlice: rawSlice, maki: maki };
})();
