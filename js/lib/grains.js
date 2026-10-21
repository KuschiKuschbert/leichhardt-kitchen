/* The drawing library: rice, grains and pasta (see js/library.js for the fields). Drawn around 0,0, 1 unit is about 1.5 mm. */
(function () {
  'use strict';
  var L = window.LK_LIB, C = L.P.C;
  var PASTA = '#F2D88A', PASTA_EDGE = '#C4A24E', RICE_EDGE = '#CFCAB9', RAGU = '#9E3B22', NAPOLI = '#C0392B';
  var NOODLE = '#EED27E', RICE_NOODLE = '#F4F1E8', CREAM = '#F4EBCB', SESAME = '#F4E9C8', SHALLOT = '#5E8C3A';
  function rc(x) { return Object.assign({ 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, x || {}); }
  function n(x) { return String(Math.round(x * 10) / 10); }

  /* ---------- grains ---------- */
  // count short strokes (rice or other grains) spread over an rx by ry ellipse round cx, cy, as one path (d only)
  function grainD(rnd, count, rx, ry, len, cx, cy) {
    var d = '';
    for (var i = 0; i < count; i++) {
      var p = L.P.inEllipse(rnd, rx, ry), a = rnd() * Math.PI, l = len * (0.75 + rnd() * 0.5) / 2;
      d += 'M' + n((cx || 0) + p[0] - Math.cos(a) * l) + ' ' + n((cy || 0) + p[1] - Math.sin(a) * l) + 'l' + n(Math.cos(a) * l * 2) + ' ' + n(Math.sin(a) * l * 2);
    }
    return d;
  }
  // grains with an outline: the darker stroke under, the grain colour over. o: count, rx, ry, len, wid, col, edge, cx, cy
  function grainTex(P, rnd, o) {
    var d = grainD(rnd, o.count, o.rx, o.ry, o.len || 3.6, o.cx, o.cy), w = o.wid || 1.7;
    return P.path(d, 'none', o.edge || RICE_EDGE, w + 0.9, rc()) + P.path(d, 'none', o.col || C.rice, w, rc());
  }
  // tiny dots (couscous, quinoa, crumbs) as one path of round-capped dots
  function dots(P, rnd, count, rx, ry, col, r, cx, cy) {
    var d = '';
    for (var i = 0; i < count; i++) { var p = P.inEllipse(rnd, rx, ry); d += 'M' + n((cx || 0) + p[0]) + ' ' + n((cy || 0) + p[1]) + 'h0.01'; }
    return P.path(d, 'none', col, (r || 0.6) * 2, rc());
  }
  // a mound of rice: a soft outline, shade low right, grains, a highlight. o: rx, ry, col, edge, grains (count), gcol, gedge
  function riceMoundSvg(P, rnd, o) {
    var col = o.col || C.rice, rx = o.rx || 32, ry = o.ry || 29, edge = o.edge || P.shade(col, -0.2), d = P.blob(rnd, rx, ry, o.wob || 0.07, 14);
    var out = P.shadow(d, 2, 3) + P.path(d, col, edge, 1);
    out += P.path(P.blob(rnd, rx * 0.7, ry * 0.38, 0.1, 9, rx * 0.2, ry * 0.48), P.shade(col, -0.07), null, 0, { opacity: '0.8' });
    out += grainTex(P, rnd, { count: o.grains || Math.round(rx * ry / 8), rx: rx * 0.93, ry: ry * 0.9, col: o.gcol || P.shade(col, 0.35), edge: o.gedge || P.shade(col, -0.12), len: o.len, wid: o.wid });
    return out + P.hl(-rx * 0.3, -ry * 0.35, rx * 0.3, ry * 0.14, '#FFFFFF', 0.45, -20);
  }
  function riceMound(o) { return function (P, rnd) { return riceMoundSvg(P, rnd, o); }; }
  // one layer of seeds spread evenly over an ellipse: short round-capped strokes, the outline under (o.crease: a line
  // along each seed, pearl barley)
  function seedLayer(P, rnd, count, rx, ry, col, len, wid, crease) {
    var d = '', c2 = '';
    P.spots(rnd, count, rx, ry).forEach(function (p) {
      var a = rnd() * Math.PI, l = len * (0.8 + rnd() * 0.4) / 2, c = Math.cos(a) * l, s = Math.sin(a) * l;
      d += 'M' + n(p[0] - c) + ' ' + n(p[1] - s) + 'l' + n(c * 2) + ' ' + n(s * 2);
      if (crease) c2 += 'M' + n(p[0] - c * 0.9) + ' ' + n(p[1] - s * 0.9) + 'l' + n(c * 1.8) + ' ' + n(s * 1.8);
    });
    return P.path(d, 'none', P.shade(col, -0.26), wid + 0.9, rc()) + P.path(d, 'none', col, wid, rc()) + (crease ? P.path(c2, 'none', crease, 0.5, rc({ opacity: '0.85' })) : '');
  }
  // a mound of cooked pulses or whole grains: the outline, a shade low right, the seeds in layers (each layer's outline
  // shows over the one under it), a tinted highlight. o: rx, ry, col (the mound between the seeds), seeds [[colour, count,
  // len, wid, crease]], glint (light specks on the seeds), wob
  function seedMoundSvg(P, rnd, o) {
    var col = o.col, rx = o.rx || 31, ry = o.ry || 27, d = P.blob(rnd, rx, ry, o.wob || 0.08, 14);
    var out = P.shadow(d) + P.path(d, col, P.shade(col, -0.26), 1);
    out += P.path(P.blob(rnd, rx * 0.7, ry * 0.38, 0.1, 9, rx * 0.2, ry * 0.48), P.shade(col, -0.1), null, 0, { opacity: '0.8' });
    (o.seeds || []).forEach(function (s, j) { out += seedLayer(P, rnd, s[1], rx * (0.86 - j * 0.06), ry * (0.84 - j * 0.06), s[0], s[2], s[3], s[4]); });
    if (o.glint) out += dots(P, rnd, o.glint, rx * 0.8, ry * 0.78, P.shade(o.seeds[0][0], 0.5), 0.45);
    return out + P.hl(-rx * 0.3, -ry * 0.38, rx * 0.26, ry * 0.11, P.shade(col, 0.45), 0.8, -20);
  }
  function seedMound(o) { return function (P, rnd) { return seedMoundSvg(P, rnd, o); }; }
  // beans in layers, each a short bent stroke with its outline under and a highlight along its back.
  // o: count, rx, ry, len (half length of the bend), wid, cols, layers
  function beanTex(P, rnd, o) {
    var out = '', k = o.layers || 3, per = Math.ceil(o.count / k);
    for (var j = 0; j < k; j++) {
      var col = o.cols[j % o.cols.length], d = '', h = '';
      P.spots(rnd, per, o.rx * (1 - j * 0.12), o.ry * (1 - j * 0.12)).forEach(function (p) {
        var a = rnd() * Math.PI, c = Math.cos(a), s = Math.sin(a), l = o.len * (0.85 + rnd() * 0.3), b = o.wid * (0.08 + rnd() * 0.12);
        d += 'M' + n(p[0] - c * l) + ' ' + n(p[1] - s * l) + 'Q' + n(p[0] - s * b) + ' ' + n(p[1] + c * b) + ' ' + n(p[0] + c * l) + ' ' + n(p[1] + s * l);
        h += 'M' + n(p[0] - c * l * 0.55 - o.wid * 0.12) + ' ' + n(p[1] - s * l * 0.55 - o.wid * 0.2) + 'l' + n(c * l * 1.1) + ' ' + n(s * l * 1.1);
      });
      out += P.path(d, 'none', P.shade(col, -0.26), o.wid + 1, rc()) + P.path(d, 'none', col, o.wid, rc()) + P.path(h, 'none', P.shade(col, 0.55), o.wid * 0.3, rc({ opacity: '0.8' }));
    }
    return out;
  }
  function beanPile(o) {
    return function (P, rnd) {
      var d = P.blob(rnd, o.rx, o.ry, 0.08, 12), col = o.cols[0];
      return P.shadow(d) + P.path(d, P.shade(col, -0.12), P.shade(col, -0.32), 0.9) + beanTex(P, rnd, o);
    };
  }

  /* ---------- small things that go on top ---------- */
  function friedEgg(P, rnd, x, y, r, crisp) {
    var d = P.blob(rnd, r, r * 0.86, 0.14, 11, x, y), out = P.shadow(d, 1, 1.5);
    if (crisp) out += P.path(P.blob(rnd, r * 1.06, r * 0.92, 0.16, 12, x, y), '#C98A3A', '#9E6420', 0.8);
    out += P.path(d, '#FFFFFF', '#E2DCCB', 0.9) + P.circle(x + r * 0.08, y + r * 0.05, r * 0.36, '#F2B42A', '#D9922A', 0.9);
    return out + P.hl(x - r * 0.05, y - r * 0.08, r * 0.12, r * 0.07, '#FFFFFF', 0.7, -20) + P.hl(x - r * 0.45, y - r * 0.4, r * 0.25, r * 0.08, '#FFFFFF', 0.6, -25);
  }
  // half a boiled egg, yolk up; jammy for ramen (tinted white)
  function eggHalf(P, x, y, r, rot, o) {
    o = o || {};
    var d = 'M' + n(-r) + ' 0 Q' + n(-r) + ' ' + n(-r * 0.82) + ' 0 ' + n(-r * 0.82) + ' Q' + n(r) + ' ' + n(-r * 0.82) + ' ' + n(r) + ' 0 Q' + n(r) + ' ' + n(r * 0.82) + ' 0 ' + n(r * 0.82) + ' Q' + n(-r) + ' ' + n(r * 0.82) + ' ' + n(-r) + ' 0 Z';
    return P.g(P.at(x, y, rot || 0), P.shadow(d, 1, 1.5) + P.path(d, o.white || '#FFFFFF', o.edge || '#E2DCCB', 0.9) + P.circle(r * 0.05, 0, r * 0.48, o.yolk || '#F2C14E', P.shade(o.yolk || '#F2C14E', -0.2), 0.7) + (o.jammy ? P.circle(r * 0.05, 0, r * 0.3, '#EE8A2E', null, 0, { opacity: '0.85' }) : '') + P.hl(-r * 0.4, -r * 0.4, r * 0.25, r * 0.1, '#FFFFFF', 0.6, -20));
  }
  // a curled cooked prawn, tail on (s scales it: 1 is about 3 cm across)
  function prawn(P, x, y, rot, s) {
    var arc = 'M-6 0 A6 6 0 1 1 3 5.2', out = P.path(arc, 'none', '#000000', 6.2, rc({ opacity: '0.12', transform: 'translate(1 1.5)' }));
    out += P.path(arc, 'none', '#B9502A', 7.2, rc()) + P.path(arc, 'none', C.prawn, 5.6, rc()) + P.path(arc, 'none', C.prawnStripe, 5.6, { 'stroke-dasharray': '0.9 3', opacity: '0.7' });
    out += P.path('M2 4 L8 9 L3.5 10.5 Z', '#D9502A', '#A8381A', 0.7, { 'stroke-linejoin': 'round' }) + P.circle(-6, -0.5, 3.8, '#E8763A', '#B9502A', 0.8);
    out += P.path('M-1 -4 A4.4 4.4 0 0 1 4 -1.6', 'none', '#FFFFFF', 1.2, rc({ opacity: '0.45' }));
    return P.g(P.at(x, y, rot, s || 1), out);
  }
  // an open mussel in its half shell
  function mussel(P, x, y, rot) {
    var d = 'M-11 0 Q-9 -6.5 1 -6.5 Q11 -5 12 0 Q11 5 1 6.5 Q-9 6.5 -11 0 Z';
    return P.g(P.at(x, y, rot), P.shadow(d, 1, 1.5) + P.path(d, '#2E2A3A', '#16141C', 0.9) + P.path('M-9 0 Q-7 -4.6 1 -4.8 Q9 -3.6 9.6 0 Q9 3.6 1 4.8 Q-7 4.6 -9 0 Z', '#4A4A66', null, 0) + P.path(P.blob(L.P.rng(x * 7 + y), 6.5, 3.4, 0.15, 8, 0.5, 0), '#E8904A', '#B9622A', 0.7) + P.hl(-2, -1, 3, 1, '#FFFFFF', 0.45));
  }
  // a citrus wedge from above (lemon or lime): rind on the round side, pale flesh, segment lines
  function citrus(P, x, y, rot, s, lime) {
    var rind = lime ? '#6E9A3E' : '#E8B92E', flesh = lime ? '#D2E39A' : '#F7E07A';
    var d = 'M-11 0 A11 7 0 0 0 11 0 Z', out = P.shadow(d, 1, 1.5) + P.path(d, flesh, P.shade(rind, -0.2), 0.9) + P.path('M-11 0 A11 7 0 0 0 11 0', 'none', rind, 2.2) + P.path('M-6 0.4 L-4 5 M0 0.4 L0 6.2 M6 0.4 L4 5', 'none', P.shade(flesh, 0.4), 0.8) + P.line(-10, 0, 10, 0, P.shade(flesh, -0.12), 1);
    return P.g(P.at(x, y, rot, s || 1), out);
  }
  // the little things: spring onion rings, herbs, sesame, chilli, peanuts, fried shallots, pepper, parmesan
  function bits(P, rnd, what, count, rx, ry, cx, cy) {
    cx = cx || 0; cy = cy || 0;
    return P.scatter(rnd, count, rx, ry, function (x0, y0, i, q) {
      var x = x0 + cx, y = y0 + cy;
      if (what === 'shallot') return P.circle(x, y, 2, '#C9DE8E', SHALLOT, 1);
      if (what === 'herb') return P.leaf(5 + q() * 2, 3, i % 2 ? C.herb : C.greenDark, x, y, q() * 360, { vw: 0.5 });
      if (what === 'basil') return P.leaf(10, 6, '#3F7A2E', x, y, q() * 360, { vw: 0.6 });
      if (what === 'mint') return P.leaf(8, 5, '#5E9A3E', x, y, q() * 360, { vw: 0.5 });
      if (what === 'parsley') return P.path(P.blob(q, 1.4 + q() * 0.8, 1.1 + q() * 0.6, 0.35, 6, x, y), i % 2 ? '#4F7F2F' : '#5E8C3A');
      if (what === 'sesame') return P.g(P.at(x, y, q() * 180), P.ellipse(0, 0, 1.1, 0.6, i % 4 ? SESAME : '#2E2A26', '#C9B98A', 0.2));
      if (what === 'chilli') return P.circle(x, y, 2, '#F2D8C8', '#C9302A', 1.2) + P.circle(x + 0.4, y, 0.5, '#F2E2A0');
      if (what === 'flakes') return P.rect(x, y, 1.2, 0.9, 0.2, '#C9302A');
      if (what === 'peanut') return P.path(P.blob(q, 1.6 + q() * 0.8, 1.2, 0.3, 6, x, y), i % 2 ? '#D9B07A' : '#C49A60', '#A8804A', 0.3);
      if (what === 'fried-shallot') return P.g(P.at(x, y, q() * 180), P.path('M-2.6 0 Q0 -2 2.6 0', 'none', '#A8642A', 1.2, rc()));
      if (what === 'pepper') return P.circle(x, y, 0.5 + q() * 0.3, '#3A3330');
      if (what === 'parmesan') return P.path(P.blob(q, 1.6 + q() * 0.8, 1 + q() * 0.5, 0.3, 6, x, y), '#F8EFC8', '#D9C894', 0.3);
      if (what === 'shaving') return P.g(P.at(x, y, q() * 180), P.path('M-5 -1.5 L5 -2.4 L4.4 1.8 L-4.6 2.2 Z', '#F6E9B8', '#D9C68A', 0.5));
      if (what === 'sprout') { var a = q() * 360; return P.g(P.at(x, y, a), P.path('M-6 0 Q0 -2 6 0', 'none', '#D9D2BC', 1.9, rc()) + P.path('M-6 0 Q0 -2 6 0', 'none', '#F8F5EA', 1.2, rc()) + P.circle(6, 0, 1.1, '#E6E0A8')); }
      if (what === 'pea') return P.circle(x, y, 2.2, C.green, C.greenDark, 0.6) + P.circle(x - 0.6, y - 0.6, 0.6, '#FFFFFF', null, 0, { opacity: '0.5' });
      if (what === 'carrot') return P.rect(x - 1.6, y - 1.6, 3.2, 3.2, 0.6, C.carrot, '#C96A1E', 0.5);
      if (what === 'coconut') return P.g(P.at(x, y, q() * 180), P.path('M-3 0 Q0 -1.6 3 0', 'none', i % 2 ? '#D9B47A' : '#F4EAD2', 1.3, rc()));
      return P.circle(x, y, 0.8, '#B5452A');
    });
  }
  // a sauce drizzled back and forth (mayo on a poke bowl, sauce on noodles)
  function drizzle(P, rnd, rx, ry, col, wid, k, ang) {
    var pts = [], m = k || 7;
    for (var i = 0; i < m; i++) { var t = i / (m - 1); pts.push([(-1 + 2 * t) * rx, (i % 2 ? 1 : -1) * ry * (0.5 + rnd() * 0.5)]); }
    var d = P.smooth(pts, true);
    return P.g(ang ? 'rotate(' + n(ang) + ')' : '', P.path(d, 'none', P.shade(col, -0.2), wid + 1.2, rc()) + P.path(d, 'none', col, wid, rc()));
  }

  /* ---------- pasta ---------- */
  // part of a spiral from radius r1 in to r0 over turns, round cx, cy
  function arcD(P, q, r1, r0, a0, turns, cx, cy, sq, wob) {
    var k = Math.max(4, Math.round(turns * 9)), pts = [];
    for (var i = 0; i <= k; i++) { var t = i / k, a = a0 + t * turns * Math.PI * 2, r = (r1 + (r0 - r1) * t) * (1 + (q() - 0.5) * (wob || 0)); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * (sq || 1)]); }
    return P.smooth(pts, true);
  }
  // a twirled nest of long pasta: strands spiral in, the outer ones first so the middle sits on top.
  // o: r, strands, wid (strand width), col, edge, turns
  function nestSvg(P, rnd, o) {
    var r = o.r || 30, k = o.strands || 14, wid = o.wid || 2.6, col = o.col || PASTA, edge = o.edge || PASTA_EDGE, base = P.blob(rnd, r * 0.92, r * 0.88, 0.04, 12);
    var out = P.shadow(base, 2, 3) + P.path(base, P.shade(col, -0.12), edge, 1);
    for (var i = 0; i < k; i++) {
      var t = i / (k - 1), r1 = (r - wid * 0.7) * (1 - t * 0.72), r0 = Math.max(2.5, r1 * (0.4 + rnd() * 0.3));
      var d = arcD(P, rnd, r1, r0, rnd() * Math.PI * 2, (o.turns || 0.8) + rnd() * 0.5, (rnd() - 0.5) * 3, (rnd() - 0.5) * 3, 0.94, 0.05);
      out += P.path(d, 'none', edge, wid + 1.1, rc()) + P.path(d, 'none', i % 3 ? col : P.shade(col, 0.12), wid, rc());
      if (i % 2) out += P.path(d, 'none', '#FFFFFF', Math.max(0.6, wid * 0.28), rc({ opacity: '0.45', transform: 'translate(-0.4 -0.5)' }));
    }
    return out + P.hl(-r * 0.3, -r * 0.38, r * 0.28, r * 0.1, '#FFFFFF', 0.3, -25);
  }
  function nest(o) { return function (P, rnd) { return nestSvg(P, rnd, o); }; }
  // a meat sauce on top of a nest: a mound of ragu with mince
  function ragu(P, rnd, rx, ry, col, cx, cy) {
    col = col || RAGU;
    var d = P.blob(rnd, rx, ry, 0.18, 11, cx || 0, cy || 0), out = P.path(d, col, P.shade(col, -0.3), 1);
    out += P.scatter(rnd, Math.round(rx * ry / 9), rx * 0.82, ry * 0.8, function (x, y, i, q) { return P.path(P.blob(q, 1.6 + q() * 1.4, 1.2 + q(), 0.35, 6, x + (cx || 0), y + (cy || 0)), i % 3 ? P.shade(col, -0.28) : P.shade(col, 0.2)); });
    return out + P.hl((cx || 0) - rx * 0.3, (cy || 0) - ry * 0.35, rx * 0.3, ry * 0.12, '#FFFFFF', 0.35, -20);
  }
  // short pasta pieces. kind: penne, rigatoni, fusilli, macaroni, gnocchi, tortellini. o: col, edge, sauce (a coat colour)
  function shortPasta(P, q, x, y, rot, kind, o) {
    o = o || {};
    var col = o.col || PASTA, edge = o.edge || PASTA_EDGE, dk = P.shade(col, -0.3), s = '', d;
    if (kind === 'penne' || kind === 'rigatoni') {
      var l = 15, w = kind === 'penne' ? 4.2 : 5.6, sl = kind === 'penne' ? 3.4 : 0;
      d = 'M' + n(-l) + ' ' + n(-w) + ' L' + n(l - sl) + ' ' + n(-w) + ' L' + n(l) + ' ' + n(w) + ' L' + n(-l + sl) + ' ' + n(w) + ' Z';
      s += P.shadow(d, 0.8, 1.5) + P.path(d, col, edge, 0.9, { 'stroke-linejoin': 'round' });
      s += P.path('M' + n(-l + 2) + ' ' + n(-w * 0.45) + ' H' + n(l - 2) + ' M' + n(-l + 2) + ' ' + n(w * 0.1) + ' H' + n(l - 2) + ' M' + n(-l + 2) + ' ' + n(w * 0.6) + ' H' + n(l - 2), 'none', P.shade(col, -0.18), 0.7, { opacity: '0.7' });
      s += P.ellipse(l - sl / 2 - 0.8, 0, 1.4, w * 0.8, dk, null, 0, { transform: 'rotate(' + (sl ? -18 : 0) + ' ' + n(l - sl / 2 - 0.8) + ' 0)' });
      if (kind === 'rigatoni') s += P.ellipse(-l + 0.8, 0, 1.4, w * 0.8, dk);
      if (o.sauce) s += P.path(P.blob(q, 6 + q() * 5, w * 0.8, 0.3, 8, (q() - 0.5) * 12, (q() - 0.5) * 2), o.sauce, null, 0, { opacity: '0.85' });
      s += P.line(-l + 3, -w * 0.6, l - 5, -w * 0.6, '#FFFFFF', 1, { opacity: '0.45' });
    } else if (kind === 'fusilli') {
      d = 'M-13 -4 Q-14 0 -13 4 L13 4 Q14 0 13 -4 Z';
      s += P.shadow(d, 0.8, 1.4) + P.path(d, col, edge, 0.9);
      var gd = '';
      for (var gx = -11; gx < 12; gx += 4.4) gd += 'M' + n(gx) + ' -4Q' + n(gx + 3.6) + ' 0 ' + n(gx + 1.6) + ' 4';
      s += P.path(gd, 'none', P.shade(col, -0.25), 1.1, rc());
      if (o.sauce) s += P.path(P.blob(q, 5 + q() * 4, 3, 0.3, 8, (q() - 0.5) * 10, 0), o.sauce, null, 0, { opacity: '0.8' });
      s += P.line(-10, -2.6, 9, -2.6, '#FFFFFF', 0.9, { opacity: '0.45' });
    } else if (kind === 'macaroni') {
      d = 'M-5 3 A5 5 0 0 1 5 3';
      var bt = { 'stroke-linecap': 'butt' };
      s += P.path(d, 'none', '#000000', 6.4, Object.assign({ opacity: '0.12', transform: 'translate(0.8 1.3)' }, bt)) + P.path(d, 'none', edge, 7, bt) + P.path(d, 'none', col, 5.4, bt) + P.ellipse(5, 3.2, 2.8, 1.1, dk) + P.path('M-4 -0.2 A4.2 4.2 0 0 1 2.4 -1.6', 'none', '#FFFFFF', 1, rc({ opacity: '0.5' }));
    } else if (kind === 'gnocchi') {
      d = P.slab(q, 8.5, 6, 0.45, 0.05, 10);
      s += P.shadow(d, 0.9, 1.4) + P.path(d, col, edge, 0.9);
      if (o.seared && q() < 0.6) s += P.path(P.blob(q, 4, 3, 0.25, 7, 1, 1), '#D9A452', null, 0, { opacity: '0.8' });
      s += P.path('M-4.5 -4.5 Q-3 0 -4.5 4.5 M0 -5 Q1.5 0 0 5 M4.5 -4.5 Q6 0 4.5 4.5', 'none', P.shade(col, -0.2), 0.9, rc());
      s += P.hl(-2, -3, 4, 1.2, '#FFFFFF', 0.45);
    } else if (kind === 'tortellini') {
      d = 'M-8 2 Q-9 -7 0 -7.5 Q9 -7 8 2 Q6 6 2.5 4 Q3 0 0 -0.6 Q-3 0 -2.5 4 Q-6 6 -8 2 Z';
      s += P.shadow(d, 0.9, 1.4) + P.path(d, col, edge, 0.9, { 'stroke-linejoin': 'round' }) + P.path('M-6.5 0.5 Q-6 -5 0 -5.3 Q6 -5 6.5 0.5', 'none', P.shade(col, -0.18), 0.9, rc()) + P.hl(-2, -5, 4, 1.1, '#FFFFFF', 0.5);
    }
    return P.g(P.at(x, y, rot), s);
  }
  // a heap of short pasta: a wide bottom layer and a smaller top layer, back to front
  function pastaHeap(P, rnd, o) {
    var k = o.n || 24, kt = Math.round(k * 0.35), f = function (up) { return function (x, y, i, q) { return shortPasta(P, q, x, y - (up ? o.ry * 0.08 : 0), q() * 180, o.kind, { col: up ? P.shade(o.col || PASTA, 0.08) : o.col, edge: o.edge, sauce: o.sauce && q() < (o.coat || 0.5) ? o.sauce : '', seared: o.seared }); }; };
    return P.scatter(rnd, k - kt, o.rx, o.ry, f(false)) + P.pile(rnd, kt, o.rx * 0.6, o.ry * 0.6, f(true));
  }
  // a pool of sauce under a heap (napoli, cream, brown butter)
  function pool(P, rnd, rx, ry, col, op) {
    var d = P.blob(rnd, rx, ry, 0.1, 12);
    return P.path(d, col, P.shade(col, -0.2), 0.9, op ? { opacity: String(op) } : null) + P.hl(-rx * 0.35, -ry * 0.4, rx * 0.25, ry * 0.07, '#FFFFFF', 0.35, -15);
  }

  /* ---------- noodles ---------- */
  // a loose tangle of noodles: wavy strands laid over an rx by ry heap, each with an outline. o: n, len, wid, col, edge, amp
  function tangle(P, rnd, o) {
    var out = '', k = o.n || 16, base = o.base ? P.path(P.blob(rnd, o.rx * 1.05, o.ry * 1.05, 0.08, 12), P.shade(o.col, -0.12), o.edge, 0.9) : '';
    var spots = P.spots(rnd, k, o.rx * 0.75, o.ry * 0.75);
    spots.forEach(function (p, i) {
      var l = (o.len || 50) * (0.8 + rnd() * 0.4), amp = (o.amp || 4) * (0.6 + rnd() * 0.8), waves = 2 + Math.round(rnd() * 2), pts = [];
      for (var j = 0; j <= waves * 2; j++) pts.push([-l / 2 + j * l / (waves * 2), (j % 2 ? amp : -amp) * (0.7 + rnd() * 0.6)]);
      var d = P.smooth(pts, true), tr = P.at(p[0], p[1], rnd() * 180), cap = o.cap ? { 'stroke-linecap': o.cap } : {};
      out += P.g(tr, (o.wid > 4 ? P.path(d, 'none', '#000000', o.wid, rc(Object.assign({ opacity: '0.1', transform: 'translate(0.8 1.3)' }, cap))) : '') + P.path(d, 'none', o.edge, o.wid + 1.1, rc(cap)) + P.path(d, 'none', i % 3 ? o.col : P.shade(o.col, 0.1), o.wid, rc(cap)) + (o.wid > 2.4 ? P.path(d, 'none', '#FFFFFF', o.wid * (o.cap ? 0.18 : 0.25), rc({ opacity: '0.4', transform: 'translate(-0.3 -0.5)' })) : ''));
    });
    return base + out;
  }
  // fine rice noodles: a pale nest with loops of thin strands, all strands of a tone in one path
  function vermicelli(P, rnd, rx, ry, cx, cy) {
    cx = cx || 0; cy = cy || 0;
    var out = P.path(P.blob(rnd, rx, ry, 0.1, 12, cx, cy), '#ECE8DC', '#D6D0BE', 0.8), tones = ['#D2CCBA', '#FFFFFF', '#F6F3EA'];
    tones.forEach(function (c, t) {
      var d = '';
      for (var i = 0; i < Math.round(rx * ry / 60) + 6; i++) {
        var p = P.inEllipse(rnd, rx * 0.8, ry * 0.8), r = 4 + rnd() * 7, a = rnd() * 6.3;
        d += 'M' + n(cx + p[0] + Math.cos(a) * r) + ' ' + n(cy + p[1] + Math.sin(a) * r) + ' Q' + n(cx + p[0] + Math.cos(a + 2) * r * 1.4) + ' ' + n(cy + p[1] + Math.sin(a + 2) * r * 1.4) + ' ' + n(cx + p[0] + Math.cos(a + 3.6) * r) + ' ' + n(cy + p[1] + Math.sin(a + 3.6) * r) + ' T' + n(cx + p[0] + Math.cos(a + 5.6) * r * 0.8) + ' ' + n(cy + p[1] + Math.sin(a + 5.6) * r * 0.8);
      }
      out += P.path(d, 'none', c, t ? 0.9 : 1.6, rc());
    });
    return out;
  }

  /* ---------- bowls (the contents only, to sit inside a bowl about 150 units across) ---------- */
  var BOWL_R = 72;
  // the broth or base: a round with a darker meniscus and fat droplets
  function broth(P, rnd, col, drops) {
    var out = P.circle(0, 0, BOWL_R, col, P.shade(col, -0.2), 1.4) + P.circle(0, 0, BOWL_R - 3, 'none', P.shade(col, -0.08), 3, { opacity: '0.6' });
    if (drops) out += P.scatter(rnd, drops, BOWL_R - 8, BOWL_R - 8, function (x, y, i, q) { return P.circle(x, y, 0.8 + q() * 1.8, i % 2 ? P.shade(col, 0.25) : P.shade(col, -0.12), null, 0, { opacity: '0.8' }); });
    return out;
  }
  // sectors: list of { a (start degrees), b (end), r0, r1, fn(x, y, i, q) , count } filling a wedge of the bowl
  function sector(P, rnd, s) {
    var pts = [];
    for (var i = 0; i < s.count; i++) {
      var best = null, bd = -1;
      for (var t = 0; t < 8; t++) {
        var a = (s.a + rnd() * (s.b - s.a)) * Math.PI / 180, r = Math.sqrt(s.r0 * s.r0 + rnd() * (s.r1 * s.r1 - s.r0 * s.r0)), p = [Math.cos(a) * r, Math.sin(a) * r], dd = Infinity;
        pts.forEach(function (o) { var k = Math.hypot(p[0] - o[0], p[1] - o[1]); if (k < dd) dd = k; });
        if (dd > bd) { bd = dd; best = p; }
      }
      pts.push(best);
    }
    pts.sort(function (a, b) { return a[1] - b[1]; });
    return pts.map(function (p, i) { return s.fn(p[0], p[1], i, rnd); }).join('');
  }
  // a thin slice of beef for pho: pink with a browner edge and a line of fat
  function beefSlice(P, q, x, y, rot) {
    var d = P.blob(q, 17, 10, 0.12, 12);
    return P.g(P.at(x, y, rot), P.shadow(d, 0.6, 1) + P.path(d, '#B48C80', '#8A6458', 0.8) + P.path(P.blob(q, 11, 5.5, 0.2, 9, 1, 0), '#C98078', null, 0, { opacity: '0.85' }) + P.path('M-12 5 Q0 2 13 6', 'none', '#F0DCD0', 1.2, rc({ opacity: '0.7' })) + P.hl(-4, -4, 6, 1.5, '#FFFFFF', 0.25));
  }
  function chashu(P, q, x, y, r) {
    var d = P.blob(q, r, r * 0.92, 0.06, 11);
    return P.g(P.at(x, y), P.shadow(d, 1, 1.4) + P.path(d, '#7E4A2A', '#5A3018', 1) + P.path(P.blob(q, r * 0.82, r * 0.74, 0.08, 10), '#E8C2A8', null, 0) + P.path('M' + n(-r * 0.6) + ' ' + n(-r * 0.1) + ' Q0 ' + n(r * 0.4) + ' ' + n(r * 0.6) + ' ' + n(-r * 0.2) + ' M' + n(-r * 0.4) + ' ' + n(r * 0.4) + ' Q0 ' + n(r * 0.2) + ' ' + n(r * 0.4) + ' ' + n(r * 0.5), 'none', '#F6E6D8', 1.4, rc()) + P.path(P.blob(q, r * 0.4, r * 0.3, 0.2, 7, -r * 0.2, -r * 0.25), '#D9A688', null, 0, { opacity: '0.7' }) + P.hl(-r * 0.3, -r * 0.4, r * 0.3, r * 0.1, '#FFFFFF', 0.45, -20));
  }
  function tofuPuff(P, q, x, y) {
    var d = P.slab(q, 7, 6.5, 0.6, 0.08, 10);
    return P.g(P.at(x, y, q() * 90), P.shadow(d, 1, 1.4) + P.path(d, '#D9A04A', '#9E6820', 0.8) + P.path(P.slab(q, 4.5, 4, 0.6, 0.12, 8), '#E8BC66', null, 0, { opacity: '0.8' }));
  }
  function veg(P, q, kind, x, y) {
    var a = q() * 180;
    if (kind === 'broccoli') return P.g(P.at(x, y, a), P.rect(-1.2, 0, 2.4, 6, 1, '#9CC067', '#6E9A3E', 0.5) + P.circle(-2.6, -0.5, 3, '#4F7F2F', '#3E6A24', 0.5) + P.circle(2.6, -0.5, 3, '#4F7F2F', '#3E6A24', 0.5) + P.circle(0, -2.6, 3.2, '#5E8C3A', '#3E6A24', 0.5));
    if (kind === 'capsicum') return P.g(P.at(x, y, a), P.path('M-7 -1 Q0 -3 7 -1', 'none', '#9E2418', 3.4, rc()) + P.path('M-7 -1 Q0 -3 7 -1', 'none', '#D2382A', 2.4, rc()));
    if (kind === 'carrot') return P.g(P.at(x, y, a), P.line(-6, 0, 6, 0, '#C96A1E', 2.6) + P.line(-6, 0, 6, 0, C.carrot, 1.7));
    if (kind === 'snowpea') return P.g(P.at(x, y, a), P.path('M-8 0 Q0 -4.5 8 0 Q0 2.6 -8 0 Z', '#7EA453', '#5E8C3A', 0.7) + P.path('M-6 -0.6 Q0 -2.6 6 -0.6', 'none', '#B9D27A', 0.8));
    if (kind === 'cucumber') return P.circle(x, y, 5, '#DDEBB8', '#5E8C3A', 1.2) + P.circle(x, y, 2.2, 'none', '#B9D27A', 0.8);
    if (kind === 'baton') return P.g(P.at(x, y, a), P.rect(-6, -1.4, 12, 2.8, 0.6, '#E6F0C8', '#5E8C3A', 0.8));
    if (kind === 'daikon') return P.g(P.at(x, y, a), P.line(-6, 0, 6, 0, '#D9D6CC', 2.2) + P.line(-6, 0, 6, 0, '#F8F6F0', 1.4));
    if (kind === 'lettuce') return P.path(P.blob(q, 6 + q() * 3, 3.5 + q() * 2, 0.3, 8, x, y), i2(q) ? '#8DB255' : '#9CC067', '#6E9A3E', 0.6);
    if (kind === 'edamame') return P.g(P.at(x, y, a), P.ellipse(0, 0, 2.6, 2.1, '#7EA453', '#5E8C3A', 0.6) + P.hl(-0.6, -0.6, 0.9, 0.5, '#FFFFFF', 0.4));
    if (kind === 'corn') return P.rect(x - 1.6, y - 1.5, 3.2, 3, 1, C.corn, '#D9A62A', 0.5);
    if (kind === 'cabbage') return P.g(P.at(x, y, a), P.path('M-5 0 Q0 -2 5 0', 'none', '#7A2E5E', 1.8, rc()) + P.path('M-5 0 Q0 -2 5 0', 'none', '#B96A9A', 0.8, rc()));
    if (kind === 'salmon') return P.g(P.at(x, y, a), P.rect(-4.5, -4, 9, 8, 1.2, '#F08A5A', '#C9603A', 0.7) + P.path('M-3 -4 L-1 4 M1.5 -4 L3.5 4', 'none', '#F8C2A2', 0.9));
    if (kind === 'tuna') return P.g(P.at(x, y, a), P.rect(-4.5, -4, 9, 8, 1.2, '#B8303A', '#8A2028', 0.7) + P.hl(-1, -1.5, 2.5, 1, '#FFFFFF', 0.25));
    if (kind === 'ginger') return P.g(P.at(x, y, a), P.path('M-5 0 Q0 -4 5 0 Q0 2 -5 0 Z', '#F4C2BA', '#D99A92', 0.6));
    if (kind === 'seaweed') return P.g(P.at(x, y, a), P.path('M-6 0 Q-3 -2 0 0 T6 0', 'none', '#3E8A3A', 1.6, rc()));
    if (kind === 'spinach') return P.leaf(9, 5, '#2E6A2E', x, y, a, { vc: '#4F8A3A' });
    if (kind === 'mushroom') return P.g(P.at(x, y, a), P.path('M-5 1 Q-5 -4 0 -4 Q5 -4 5 1 Z', '#6A4A32', '#4A3020', 0.6) + P.rect(-1.2, 1, 2.4, 3, 0.6, '#C9AE8A'));
    if (kind === 'zucchini') return P.g(P.at(x, y, a), P.path('M-5 0 A5 5 0 0 1 5 0 Z', '#E6EBC0', '#3E6A24', 1.1));
    if (kind === 'kimchi') return P.g(P.at(x, y, a), P.path(P.blob(q, 5, 3, 0.3, 7), '#D2452E', '#9E2A1A', 0.6) + P.line(-3, 0, 3, 0.4, '#F2B8A0', 0.9));
    if (kind === 'bulgogi') return P.g(P.at(x, y, a), P.path(P.blob(q, 6, 2.6, 0.3, 8), '#6A3A1E', '#4A2410', 0.6));
    if (kind === 'pork') return P.g(P.at(x, y, a), P.path(P.blob(q, 9, 5.5, 0.15, 9), '#B8743A', '#7A3E18', 0.7) + P.path('M-5 -3 L-2 3 M0 -3.5 L3 3 M4.5 -3 L6.5 1.5', 'none', '#5A2E10', 1.1, rc({ opacity: '0.7' })));
    if (kind === 'chicken') return P.g(P.at(x, y, a), P.path(P.blob(q, 6, 5, 0.18, 8), '#E2B070', '#B9803A', 0.7) + P.hl(-1, -1.5, 2.5, 1, '#FFFFFF', 0.35));
    if (kind === 'onion') return P.g(P.at(x, y, a), P.path('M-5 0 Q0 -3 5 0', 'none', '#F4F0F2', 1.4, rc()));
    if (kind === 'menma') return P.g(P.at(x, y, a), P.rect(-6, -1.6, 12, 3.2, 0.8, '#D2AE62', '#A8843A', 0.6) + P.line(-4.5, 0, 4.5, 0, '#E6CC8A', 0.6));
    return '';
  }
  function i2(q) { return q() < 0.5; }

  /* ---------- the items ---------- */
  L.add('grains', [
    // rice
    { id: 'rice-steamed', name: 'Steamed rice', sub: 'Rice', kw: 'rice steamed rice white rice jasmine basmati plain mound', form: 'mound', cook: 'steamed', role: 'starch', g: 150, w: 68, h: 60, side: { s: 'mound', h: 26, c: C.rice }, draw: riceMound({ rx: 32, ry: 29 }) },
    { id: 'rice-brown', name: 'Brown rice', sub: 'Rice', kw: 'brown rice wholegrain', form: 'mound', cook: 'steamed', role: 'starch', g: 150, w: 64, h: 58, of: 'rice-steamed', side: { s: 'mound', h: 26, c: '#D9C49A' }, draw: riceMound({ rx: 32, ry: 29, col: '#DCC79C' }) },
    { id: 'rice-saffron', name: 'Saffron rice', sub: 'Rice', kw: 'saffron rice yellow rice turmeric pilaf pilau', form: 'mound', cook: 'steamed', role: 'starch', g: 150, w: 70, h: 64, of: 'rice-steamed', side: { s: 'mound', h: 26, c: '#F2D272' }, draw: riceMound({ rx: 32, ry: 29, col: '#F2D272' }) },
    { id: 'rice-timbale', name: 'Rice timbale', sub: 'Rice', kw: 'timbale moulded rice dome rice ring mould cup', form: 'mound', cook: 'steamed', role: 'starch', g: 150, w: 62, h: 62, side: { s: 'mound', h: 30, c: C.rice }, draw: function (P, rnd) {
      var out = P.shadow('M-29 0 A29 29 0 1 0 29 0 A29 29 0 1 0 -29 0 Z', 2.5, 3.5) + P.circle(0, 0, 29, C.rice, RICE_EDGE, 1.2);
      out += P.circle(3, 4, 22, '#EAE6DA', null, 0, { opacity: '0.6' }) + P.circle(-2, -2, 18, '#FBFAF6', null, 0, { opacity: '0.8' });
      out += grainTex(P, rnd, { count: 70, rx: 26, ry: 26, col: '#FFFFFF', edge: '#DCD7C8', len: 3.4, wid: 1.4 });
      return out + P.circle(0, 0, 27, 'none', '#DCD7C8', 1.2, { opacity: '0.7' }) + P.hl(-9, -11, 9, 4, '#FFFFFF', 0.7, -30) + bits(P, rnd, 'sesame', 6, 8, 8);
    } },
    { id: 'rice-coconut', name: 'Coconut rice', sub: 'Rice', kw: 'coconut rice nasi lemak toasted coconut', form: 'mound', cook: 'steamed', role: 'starch', g: 150, w: 66, h: 62, side: { s: 'mound', h: 26, c: '#F6F0E0' }, draw: function (P, rnd) { return riceMoundSvg(P, rnd, { rx: 32, ry: 29, col: '#F6F0E0' }) + bits(P, rnd, 'coconut', 24, 22, 20) + bits(P, rnd, 'sesame', 8, 18, 16); } },
    { id: 'rice-fried', name: 'Fried rice', sub: 'Rice', kw: 'fried rice egg fried rice special fried rice peas carrot', form: 'mound', cook: 'fried', role: 'starch', g: 200, w: 74, h: 66, side: { s: 'mound', h: 24, c: '#E6C98C' }, draw: function (P, rnd) {
      var out = riceMoundSvg(P, rnd, { rx: 36, ry: 32, col: '#E6C98C', gcol: '#F2DEAE', gedge: '#C9A462' });
      out += P.scatter(rnd, 7, 26, 22, function (x, y, i, q) { return P.path(P.blob(q, 3.4, 2.4, 0.3, 7, x, y), '#F6D35A', '#D9A62A', 0.5); });
      return out + bits(P, rnd, 'pea', 12, 28, 24) + bits(P, rnd, 'carrot', 10, 28, 24) + bits(P, rnd, 'shallot', 10, 26, 22);
    } },
    { id: 'rice-kimchi-fried', name: 'Kimchi fried rice with egg', sub: 'Rice', kw: 'kimchi fried rice kimchi bokkeumbap korean egg', form: 'mound', cook: 'fried', role: 'main', g: 300, w: 86, h: 76, side: { s: 'mound', h: 30, c: '#E0884A' }, draw: function (P, rnd) {
      var out = riceMoundSvg(P, rnd, { rx: 42, ry: 38, col: '#E08A4C', gcol: '#F0A86E', gedge: '#C0622E' });
      out += P.scatter(rnd, 12, 32, 28, function (x, y, i, q) { return veg(P, q, 'kimchi', x, y); });
      out += friedEgg(P, rnd, 4, -2, 17) + bits(P, rnd, 'sesame', 14, 30, 26) + bits(P, rnd, 'shallot', 9, 30, 26);
      return out + P.scatter(rnd, 5, 20, 16, function (x, y, i, q) { return P.g(P.at(x + 4, y - 2, q() * 180), P.rect(-5, -0.8, 10, 1.6, 0.4, '#1E2E22')); });
    } },
    { id: 'nasi-goreng', name: 'Nasi goreng with fried egg', sub: 'Rice', kw: 'nasi goreng indonesian fried rice egg kecap manis sambal prawn cracker', form: 'mound', cook: 'fried', role: 'main', g: 350, w: 92, h: 78, side: { s: 'mound', h: 30, c: '#B8733C' }, draw: function (P, rnd) {
      var out = P.g(P.at(-6, 2), riceMoundSvg(P, rnd, { rx: 40, ry: 36, col: '#B8733C', gcol: '#D2925A', gedge: '#8A4E22' }) + bits(P, rnd, 'fried-shallot', 16, 30, 26) + bits(P, rnd, 'chilli', 5, 26, 22));
      out += friedEgg(P, rnd, -8, -4, 18, true);
      // a prawn cracker and cucumber and tomato on the side
      out += P.g(P.at(34, -26), P.path(P.blob(rnd, 13, 10, 0.18, 12), '#F6EADF', '#D9C2B4', 0.8) + P.crumbs(rnd, 8, 9, 6, ['#E6D2C2'], 1));
      out += P.circle(38, 18, 6, '#DDEBB8', '#5E8C3A', 1.2) + P.circle(32, 30, 6, '#DDEBB8', '#5E8C3A', 1.2) + P.circle(38, 18, 2.4, 'none', '#B9D27A', 0.8) + P.circle(32, 30, 2.4, 'none', '#B9D27A', 0.8);
      return out + P.path('M38 4 A7 7 0 0 1 46 10 L38 10 Z', C.tomato, '#9E2B20', 0.8);
    } },
    { id: 'biryani', name: 'Biryani', sub: 'Rice', kw: 'biryani biriyani dum rice saffron fried onion indian', form: 'mound', cook: 'steamed', role: 'main', g: 350, w: 86, h: 80, side: { s: 'mound', h: 32, c: '#F2D272' }, draw: function (P, rnd) {
      var out = riceMoundSvg(P, rnd, { rx: 43, ry: 39, col: '#F4EBD6', gcol: '#FFFFFF', gedge: '#DCD2BC' });
      out += grainTex(P, rnd, { count: 50, rx: 32, ry: 28, cx: -6, cy: -4, col: '#F2C94C', edge: '#D9A62A' }) + grainTex(P, rnd, { count: 26, rx: 18, ry: 14, cx: 12, cy: 8, col: '#E8963A', edge: '#C0702A' });
      out += bits(P, rnd, 'fried-shallot', 22, 32, 28) + P.scatter(rnd, 6, 26, 22, function (x, y, i, q) { return P.g(P.at(x, y, q() * 360), P.path('M-3.5 1 Q0 -4 3.5 1 Q0 -1 -3.5 1 Z', '#E8CFA0', '#B99A62', 0.6)); });
      out += eggHalf(P, 14, -12, 9, 20) + bits(P, rnd, 'mint', 7, 30, 26) + bits(P, rnd, 'herb', 6, 30, 26);
      return out;
    } },
    { id: 'risotto', name: 'Risotto with parmesan', sub: 'Rice', kw: 'risotto arborio creamy parmesan parmigiano rice', form: 'layer', role: 'main', g: 300, w: 98, h: 88, side: { s: 'layer', h: 12, c: '#EFE0B4' }, draw: function (P, rnd) {
      var d = P.blob(rnd, 50, 45, 0.06, 16), out = P.path(d, '#EFE0B4', '#CDB97E', 1) + P.path(P.blob(rnd, 44, 39, 0.08, 14), '#F2E6C0', null, 0);
      out += grainTex(P, rnd, { count: 230, rx: 44, ry: 39, col: '#FAF3DE', edge: '#DCCB94', len: 2.8, wid: 2.6 });
      out += P.hl(-18, -16, 14, 4, '#FFFFFF', 0.45, -20) + P.hl(12, 10, 8, 2.5, '#FFFFFF', 0.35, -20);
      return out + bits(P, rnd, 'shaving', 7, 26, 22) + bits(P, rnd, 'pepper', 16, 36, 32) + bits(P, rnd, 'parsley', 10, 30, 26);
    } },
    { id: 'risotto-mushroom', name: 'Mushroom risotto', sub: 'Rice', kw: 'mushroom risotto porcini funghi', form: 'layer', role: 'main', g: 300, w: 98, h: 92, of: 'risotto', side: { s: 'layer', h: 12, c: '#D9C49A' }, draw: function (P, rnd) {
      var d = P.blob(rnd, 50, 45, 0.06, 16), out = P.path(d, '#DCC79A', '#B39A66', 1) + P.path(P.blob(rnd, 44, 39, 0.08, 14), '#E2CFA6', null, 0);
      out += grainTex(P, rnd, { count: 230, rx: 44, ry: 39, col: '#F2E6C8', edge: '#C2AA78', len: 2.8, wid: 2.6 });
      out += P.scatter(rnd, 9, 34, 30, function (x, y, i, q) { return veg(P, q, 'mushroom', x, y); });
      return out + bits(P, rnd, 'shaving', 5, 26, 22) + bits(P, rnd, 'parsley', 12, 32, 28) + P.hl(-18, -16, 14, 4, '#FFFFFF', 0.4, -20);
    } },
    { id: 'paella', name: 'Paella', sub: 'Rice', kw: 'paella seafood paella saffron rice prawns mussels chorizo spanish', form: 'portion', cook: 'baked', role: 'main', g: 450, w: 134, h: 134, side: { s: 'layer', h: 14, c: '#E8A93A' }, draw: function (P, rnd) {
      var out = P.circle(0, 0, 66, '#B9702A', '#8E4E1A', 1.4) + P.path(P.blob(rnd, 61, 61, 0.03, 18), '#E8A93A', null, 0);
      out += grainTex(P, rnd, { count: 190, rx: 58, ry: 58, col: '#F4C25A', edge: '#C9822A', len: 3.4, wid: 1.8 });
      out += P.scatter(rnd, 8, 50, 50, function (x, y, i, q) { return veg(P, q, 'capsicum', x, y); }) + bits(P, rnd, 'pea', 16, 54, 54);
      out += P.scatter(rnd, 5, 48, 48, function (x, y) { return P.circle(x, y, 5.5, '#B5402A', '#8A2A1A', 0.8) + P.circle(x - 1.5, y + 1, 1, '#F0C8A8') + P.circle(x + 1.6, y - 1.2, 0.9, '#F0C8A8'); });
      [[-30, 6, 200], [24, 30, 40], [8, -30, 140], [-12, 34, 270]].forEach(function (m) { out += mussel(P, m[0], m[1], m[2]); });
      [[-14, -14, 20], [22, -2, 110], [-34, -24, 300], [36, -30, 60]].forEach(function (p) { out += prawn(P, p[0], p[1], p[2], 1.25); });
      return out + citrus(P, 2, 6, -20, 1.1) + citrus(P, -40, 30, 50, 1) + bits(P, rnd, 'parsley', 18, 54, 54);
    } },
    { id: 'rice-crispy-squares', name: 'Crispy rice squares', sub: 'Rice', kw: 'crispy rice squares rice cakes fried sushi rice spicy tuna base', form: 'cluster', cook: 'fried', role: 'starch', n: 4, w: 56, h: 56, side: { s: 'slab', h: 10, c: '#E3B45A' }, draw: function (P, rnd) {
      return [[-14, -14], [14, -14], [-14, 14], [14, 14]].map(function (p) {
        var s = P.rect(-12 + 1.5, -12 + 2.2, 24, 24, 3, '#000000', null, 0, { opacity: '0.13' }) + P.rect(-12, -12, 24, 24, 3, '#D9A048', '#9E6820', 1) + P.rect(-10, -10, 20, 20, 2, '#E8BC66', null, 0);
        s += grainTex(P, rnd, { count: 26, rx: 9, ry: 9, col: '#F4D68C', edge: '#C98E3A', len: 3.2, wid: 1.5 });
        return P.g(P.at(p[0] + (rnd() - 0.5) * 2, p[1] + (rnd() - 0.5) * 2, (rnd() - 0.5) * 8), s + P.hl(-4, -5, 5, 1.5, '#FFFFFF', 0.4));
      }).join('');
    } },
    { id: 'rice-sushi-base', name: 'Sushi rice, poke base', sub: 'Rice', kw: 'sushi rice poke base bowl base seasoned rice sesame', form: 'layer', cook: 'steamed', role: 'starch', g: 180, w: 124, h: 126, side: { s: 'layer', h: 15, c: C.rice }, draw: function (P, rnd) {
      var out = P.path(P.blob(rnd, 64, 64, 0.03, 18), '#F6F3EC', RICE_EDGE, 1.1) + P.circle(8, 10, 46, '#ECE8DE', null, 0, { opacity: '0.5' });
      out += grainTex(P, rnd, { count: 260, rx: 61, ry: 61, col: '#FFFFFF', edge: '#DCD7C8', len: 3.4, wid: 1.6 });
      return out + bits(P, rnd, 'sesame', 22, 54, 54) + P.hl(-24, -26, 18, 6, '#FFFFFF', 0.5, -30);
    } },

    // pasta
    { id: 'spaghetti-nest', name: 'Spaghetti, twirled nest', sub: 'Pasta', kw: 'spaghetti twirl nest pasta plain buttered', form: 'mound', role: 'starch', g: 150, w: 58, h: 56, side: { s: 'mound', h: 24, c: PASTA }, draw: nest({ r: 31, strands: 15, wid: 2.4 }) },
    { id: 'spaghetti-bolognese', name: 'Spaghetti bolognese', sub: 'Pasta', kw: 'spag bol bolognese spaghetti meat sauce ragu mince', form: 'mound', role: 'main', g: 400, w: 88, h: 84, side: { s: 'mound', h: 32, c: RAGU }, draw: function (P, rnd) {
      return nestSvg(P, rnd, { r: 46, strands: 20, wid: 2.7 }) + ragu(P, rnd, 26, 23, RAGU, 1, 1) + bits(P, rnd, 'parmesan', 16, 18, 15) + P.leaf(12, 7, '#3F7A2E', 8, -8, -30, { vw: 0.6 }) + P.leaf(10, 6, '#4F8A3A', 2, -12, 20, { vw: 0.6 });
    } },
    { id: 'spaghetti-napoli', name: 'Spaghetti napoli', sub: 'Pasta', kw: 'spaghetti napoli napolitana tomato sauce pomodoro basil', form: 'mound', role: 'main', g: 350, w: 84, h: 82, of: 'spaghetti-bolognese', side: { s: 'mound', h: 30, c: NAPOLI }, draw: function (P, rnd) {
      return nestSvg(P, rnd, { r: 46, strands: 20, wid: 2.7 }) + ragu(P, rnd, 24, 21, NAPOLI, 1, 1) + bits(P, rnd, 'parmesan', 12, 16, 13) + P.leaf(12, 7, '#3F7A2E', 6, -6, -30, { vw: 0.6 }) + P.leaf(10, 6, '#4F8A3A', 0, -10, 20, { vw: 0.6 });
    } },
    { id: 'carbonara', name: 'Spaghetti carbonara', sub: 'Pasta', kw: 'carbonara spaghetti bacon pancetta guanciale egg cream parmesan pepper', form: 'mound', role: 'main', g: 380, w: 84, h: 82, side: { s: 'mound', h: 30, c: '#F2D27A' }, draw: function (P, rnd) {
      var out = nestSvg(P, rnd, { r: 46, strands: 20, wid: 2.8, col: '#F2D27A', edge: '#C49A3E' });
      out += P.scatter(rnd, 7, 28, 26, function (x, y, i, q) { return P.path(P.blob(q, 5 + q() * 4, 3 + q() * 2, 0.3, 8, x, y), '#F6E6AE', null, 0, { opacity: '0.75' }); });
      out += P.scatter(rnd, 16, 30, 28, function (x, y, i, q) { return P.g(P.at(x, y, q() * 90), P.rect(-2.6, -2, 5.2, 4, 1, '#C9846A', '#9E5A44', 0.6) + P.rect(-2.6, -2, 2, 4, 0.8, '#F2D8C8')); });
      return out + bits(P, rnd, 'parmesan', 18, 28, 26) + bits(P, rnd, 'pepper', 26, 32, 30) + bits(P, rnd, 'parsley', 8, 24, 22);
    } },
    { id: 'linguine', name: 'Linguine, garlic and chilli', sub: 'Pasta', kw: 'linguine aglio olio garlic chilli oil parsley pasta', form: 'mound', role: 'main', g: 350, w: 82, h: 80, side: { s: 'mound', h: 28, c: '#F0D488' }, draw: function (P, rnd) {
      var out = nestSvg(P, rnd, { r: 45, strands: 18, wid: 3.3, col: '#F0D488', edge: '#C49A3E' });
      out += P.scatter(rnd, 8, 26, 24, function (x, y, i, q) { return P.g(P.at(x, y, q() * 180), P.path('M-2.4 0 Q0 -1.6 2.4 0 Q0 1.2 -2.4 0 Z', '#FBF4DC', '#D9C68A', 0.4)); });
      return out + bits(P, rnd, 'parsley', 22, 30, 28) + bits(P, rnd, 'flakes', 18, 30, 28) + P.hl(-10, -14, 12, 3, '#FFFFFF', 0.4, -20);
    } },
    { id: 'squid-ink-pasta', name: 'Squid ink pasta', sub: 'Pasta', kw: 'squid ink pasta black linguine nero di seppia spaghetti', form: 'mound', role: 'main', g: 350, w: 82, h: 80, side: { s: 'mound', h: 28, c: '#2E2E33' }, draw: function (P, rnd) {
      return nestSvg(P, rnd, { r: 45, strands: 18, wid: 3, col: '#34353B', edge: '#141418' }) + bits(P, rnd, 'parsley', 16, 28, 26) + bits(P, rnd, 'flakes', 12, 28, 26) + P.scatter(rnd, 6, 22, 20, function (x, y, i, q) { return P.g(P.at(x, y, q() * 180), P.path('M-3 0 Q0 -1.5 3 0', 'none', '#F2CB55', 0.9, rc())); }) + prawn(P, 10, -6, 30, 1.1);
    } },
    { id: 'fettuccine-creamy', name: 'Fettuccine, creamy', sub: 'Pasta', kw: 'fettuccine fettucine alfredo creamy pasta cream sauce boscaiola ribbons', form: 'mound', role: 'main', g: 380, w: 92, h: 84, side: { s: 'mound', h: 28, c: CREAM }, draw: function (P, rnd) {
      var out = pool(P, rnd, 48, 44, CREAM) + nestSvg(P, rnd, { r: 40, strands: 13, wid: 4.6, col: '#F1D88E', edge: '#C49A3E', turns: 1 });
      out += P.scatter(rnd, 6, 24, 22, function (x, y, i, q) { return P.path(P.blob(q, 5 + q() * 3, 3 + q() * 2, 0.3, 8, x, y), '#F8F0D6', null, 0, { opacity: '0.8' }); });
      return out + bits(P, rnd, 'parmesan', 14, 26, 24) + bits(P, rnd, 'pepper', 16, 30, 28) + bits(P, rnd, 'parsley', 12, 28, 26);
    } },
    { id: 'pappardelle-ragu', name: 'Pappardelle with ragù', sub: 'Pasta', kw: 'pappardelle ragu ragout wide ribbon pasta beef braise slow cooked', form: 'mound', role: 'main', g: 380, w: 78, h: 90, side: { s: 'mound', h: 30, c: '#7E2E1E' }, draw: function (P, rnd) {
      var out = P.path(P.blob(rnd, 42, 38, 0.1, 12), '#8A3422', '#5E1E12', 0.9);
      out += tangle(P, rnd, { n: 8, rx: 36, ry: 32, len: 54, wid: 12, amp: 3, col: '#F0D48A', edge: '#B98E3A', cap: 'butt' });
      out += P.scatter(rnd, 20, 30, 26, function (x, y, i, q) { return P.g(P.at(x, y, q() * 180), P.path(P.blob(q, 2.5 + q() * 3, 1.8 + q() * 1.5, 0.4, 8), i % 2 ? '#7E2E1E' : '#5E2014', '#3E120A', 0.5)); }, 6) + P.scatter(rnd, 6, 26, 22, function (x, y, i, q) { return P.path(P.blob(q, 6 + q() * 4, 4 + q() * 2, 0.3, 9, x, y), '#8A3422', null, 0, { opacity: '0.6' }); });
      return out + bits(P, rnd, 'shaving', 6, 22, 18) + bits(P, rnd, 'parsley', 12, 30, 26);
    } },
    { id: 'penne-napoli', name: 'Penne napoli', sub: 'Pasta', kw: 'penne napoli tomato pasta arrabbiata short pasta tubes', form: 'pile', role: 'main', g: 350, w: 90, h: 74, side: { s: 'pile', h: 26, c: NAPOLI }, draw: function (P, rnd) {
      return pool(P, rnd, 40, 34, NAPOLI) + pastaHeap(P, rnd, { kind: 'penne', n: 30, rx: 30, ry: 25, sauce: '#C9452E', coat: 0.6 }) + bits(P, rnd, 'parmesan', 14, 26, 22) + bits(P, rnd, 'basil', 4, 20, 16);
    } },
    { id: 'rigatoni', name: 'Rigatoni with sausage ragù', sub: 'Pasta', kw: 'rigatoni sausage ragu tubes short pasta tomato', form: 'pile', role: 'main', g: 380, w: 84, h: 80, side: { s: 'pile', h: 28, c: '#B5402A' }, draw: function (P, rnd) {
      var out = pool(P, rnd, 41, 35, '#B5402A') + pastaHeap(P, rnd, { kind: 'rigatoni', n: 22, rx: 30, ry: 25, sauce: '#C04A2E', coat: 0.55 });
      out += P.scatter(rnd, 12, 28, 24, function (x, y, i, q) { return P.path(P.blob(q, 2.4 + q() * 2, 2 + q() * 1.5, 0.3, 7, x, y), '#8A4A32', '#5E2E1E', 0.6); });
      return out + bits(P, rnd, 'parmesan', 14, 26, 22) + bits(P, rnd, 'parsley', 10, 28, 24);
    } },
    { id: 'fusilli-pesto', name: 'Fusilli with pesto', sub: 'Pasta', kw: 'fusilli spirals pesto basil pine nuts short pasta', form: 'pile', role: 'main', g: 350, w: 76, h: 72, side: { s: 'pile', h: 24, c: '#9CB45A' }, draw: function (P, rnd) {
      return pastaHeap(P, rnd, { kind: 'fusilli', n: 26, rx: 30, ry: 26, sauce: '#6E9A3E', coat: 0.6, col: '#EED98E' }) + bits(P, rnd, 'parmesan', 14, 26, 22) + P.scatter(rnd, 8, 24, 20, function (x, y, i, q) { return P.g(P.at(x, y, q() * 180), P.ellipse(0, 0, 2.2, 1.2, '#F2E2B4', '#C9B07A', 0.4)); }) + bits(P, rnd, 'basil', 3, 18, 14);
    } },
    { id: 'macaroni', name: 'Macaroni, buttered', sub: 'Pasta', kw: 'macaroni elbows elbow pasta short pasta plain kids', form: 'pile', role: 'starch', g: 150, w: 60, h: 56, side: { s: 'pile', h: 20, c: PASTA }, draw: function (P, rnd) {
      return pastaHeap(P, rnd, { kind: 'macaroni', n: 32, rx: 26, ry: 22 }) + bits(P, rnd, 'parsley', 8, 22, 18);
    } },
    { id: 'mac-and-cheese', name: 'Mac and cheese, baked', sub: 'Pasta', kw: 'mac and cheese mac n cheese macaroni cheese baked crumb top', form: 'portion', cook: 'baked', role: 'sidedish', g: 250, w: 78, h: 70, side: { s: 'layer', h: 30, c: '#F0B84A' }, draw: function (P, rnd) {
      var d = P.slab(rnd, 38, 34, 0.5, 0.04, 16), out = P.shadow(d, 2.5, 3.5) + P.path(d, '#EDB34A', '#A8742A', 1.2);
      out += P.scatter(rnd, 14, 34, 30, function (x, y, i, q) { var a = Math.atan2(y, x); return Math.hypot(x / 34, y / 30) > 0.72 ? P.g(P.at(x, y, a * 57 + 90), P.path('M-3.5 1 A4 4 0 0 1 3.5 1', 'none', '#F6DA90', 2.6, rc())) : ''; });
      out += P.path(P.slab(rnd, 30, 26, 0.45, 0.08, 14), '#E2A240', null, 0, { opacity: '0.9' });
      out += P.scatter(rnd, 14, 28, 24, function (x, y, i, q) { return P.path(P.blob(q, 2.5 + q() * 4.5, 2 + q() * 3, 0.3, 7, x, y), i % 3 ? '#C2822E' : '#9E6420', null, 0, { opacity: '0.7' }); });
      out += P.crumbs(rnd, 40, 28, 24, ['#D9A452', '#B9802F', '#F2D08A'], 0.9);
      return out + P.hl(-12, -12, 10, 3, '#FFFFFF', 0.35, -20) + bits(P, rnd, 'parsley', 8, 24, 20);
    } },
    { id: 'lasagne', name: 'Lasagne portion', sub: 'Pasta', kw: 'lasagne lasagna beef lasagne bechamel layers square portion baked', form: 'portion', cook: 'baked', role: 'main', g: 350, w: 72, h: 66, side: { s: 'layer', h: 40, c: '#E8B85A' }, draw: function (P, rnd) {
      var w = 66, h = 60, out = P.path(P.blob(rnd, 36, 33, 0.12, 12, 1, 3), RAGU, P.shade(RAGU, -0.25), 0.9);
      out += P.rect(-w / 2 + 2, -h / 2 + 3, w, h, 4, '#000000', null, 0, { opacity: '0.14' }) + P.rect(-w / 2, -h / 2, w, h, 4, '#E6B45A', '#A8742A', 1.2);
      // the cut face at the front: pasta, ragu and bechamel in layers
      var band = 14, y0 = h / 2 - band, cols = ['#F2D27A', RAGU, '#F4EBCB', '#F2D27A', RAGU, '#F4EBCB', '#F2D27A'];
      cols.forEach(function (c, i) { out += P.rect(-w / 2 + 1, y0 + i * band / cols.length, w - 2, band / cols.length + 0.2, 0, c); });
      out += P.line(-w / 2 + 1, y0, w / 2 - 1, y0, '#A8742A', 1);
      // the browned cheese top with bubbles
      out += P.path(P.slab(rnd, w / 2 - 4, (h - band) / 2 - 3, 0.7, 0.05, 14), '#ECC066', null, 0, { transform: 'translate(0 ' + n(-band / 2) + ')' });
      out += P.scatter(rnd, 14, w / 2 - 8, (h - band) / 2 - 6, function (x, y, i, q) { return P.path(P.blob(q, 2.5 + q() * 4, 2 + q() * 3, 0.3, 7, x, y - band / 2), i % 3 ? '#C98A3A' : '#A8702A', null, 0, { opacity: '0.7' }); });
      out += P.scatter(rnd, 8, w / 2 - 8, (h - band) / 2 - 6, function (x, y) { return P.circle(x, y - band / 2, 1.4, '#F6DC94', '#D9A452', 0.4); });
      return out + P.hl(-14, -18, 10, 3, '#FFFFFF', 0.35, -10) + P.leaf(12, 7, '#3F7A2E', 12, -14, -30, { vw: 0.6 });
    } },
    { id: 'ravioli', name: 'Ravioli, brown butter and sage', sub: 'Pasta', kw: 'ravioli filled pasta pillows brown butter sage ricotta spinach', form: 'cluster', role: 'main', n: 6, w: 100, h: 90, side: { s: 'pile', h: 12, c: PASTA }, draw: function (P, rnd) {
      var out = pool(P, rnd, 42, 36, '#C9922E', 0.55);
      [[-22, -18, 10], [10, -22, -8], [-28, 12, -14], [2, 4, 4], [28, 6, 16], [-2, 28, -6]].forEach(function (p) {
        var s = 16, d = '', k = 7, st = s * 2 / k, i;
        d = 'M' + n(-s) + ' ' + n(-s);
        for (i = 0; i < k; i++) d += ' Q' + n(-s + i * st + st / 2) + ' ' + n(-s - 2) + ' ' + n(-s + (i + 1) * st) + ' ' + n(-s);
        for (i = 0; i < k; i++) d += ' Q' + n(s + 2) + ' ' + n(-s + i * st + st / 2) + ' ' + n(s) + ' ' + n(-s + (i + 1) * st);
        for (i = 0; i < k; i++) d += ' Q' + n(s - i * st - st / 2) + ' ' + n(s + 2) + ' ' + n(s - (i + 1) * st) + ' ' + n(s);
        for (i = 0; i < k; i++) d += ' Q' + n(-s - 2) + ' ' + n(s - i * st - st / 2) + ' ' + n(-s) + ' ' + n(s - (i + 1) * st);
        var b = P.shadow(d + ' Z', 1.2, 2) + P.path(d + ' Z', '#F2DC98', PASTA_EDGE, 0.9) + P.rect(-s + 4, -s + 4, s * 2 - 8, s * 2 - 8, 6, '#F5E3A8', P.shade('#F2DC98', -0.12), 0.8);
        b += P.path('M' + n(-s + 1.6) + ' ' + n(-s + 1.6) + ' H' + n(s - 1.6) + ' V' + n(s - 1.6) + ' H' + n(-s + 1.6) + ' Z', 'none', P.shade('#F2DC98', -0.18), 0.8, { 'stroke-dasharray': '1 1.6' });
        out += P.g(P.at(p[0], p[1], p[2]), b + P.hl(-4, -5, 6, 2.5, '#FFFFFF', 0.55, -20));
      });
      out += P.leaf(14, 7, '#7E9A6A', -10, -4, 30, { vc: '#A8BC94' }) + P.leaf(14, 7, '#7E9A6A', 16, 20, -40, { vc: '#A8BC94' }) + P.leaf(12, 6, '#8AA676', 18, -16, 70, { vc: '#A8BC94' });
      return out + bits(P, rnd, 'parmesan', 10, 30, 26) + bits(P, rnd, 'pepper', 10, 30, 26);
    } },
    { id: 'agnolotti', name: 'Agnolotti', sub: 'Pasta', kw: 'agnolotti plin pinched filled pasta brown butter parmesan', form: 'cluster', role: 'main', n: 12, w: 66, h: 58, side: { s: 'pile', h: 10, c: PASTA }, draw: function (P, rnd) {
      var out = pool(P, rnd, 36, 30, '#C9922E', 0.5);
      out += P.scatter(rnd, 12, 28, 22, function (x, y, i, q) {
        var d = 'M-9 -6 L9 -6 L9 3', k;
        for (k = 0; k < 6; k++) d += ' L' + n(9 - k * 3 - 1.5) + ' ' + n(k % 2 ? 6.6 : 5.2);
        d += ' L-9 6 Z';
        return P.g(P.at(x, y, q() * 40 - 20), P.shadow(d, 0.9, 1.4) + P.path(d, '#F2DC98', PASTA_EDGE, 0.8, { 'stroke-linejoin': 'round' }) + P.path('M0 -6 Q-1.4 0 0 5', 'none', P.shade('#F2DC98', -0.2), 0.9, rc()) + P.ellipse(-4.4, -0.8, 3, 3.2, '#F6E6B4', null, 0) + P.ellipse(4.4, -0.8, 3, 3.2, '#F6E6B4', null, 0) + P.hl(-4.4, -2.4, 1.6, 0.8, '#FFFFFF', 0.6) + P.hl(4.4, -2.4, 1.6, 0.8, '#FFFFFF', 0.6));
      }, 10);
      return out + bits(P, rnd, 'parmesan', 12, 28, 22) + bits(P, rnd, 'herb', 5, 24, 20);
    } },
    { id: 'tortellini', name: 'Tortellini, creamy', sub: 'Pasta', kw: 'tortellini filled pasta rings cream sauce boscaiola', form: 'pile', role: 'main', g: 300, w: 72, h: 68, side: { s: 'pile', h: 20, c: PASTA }, draw: function (P, rnd) {
      return pool(P, rnd, 38, 33, CREAM) + pastaHeap(P, rnd, { kind: 'tortellini', n: 24, rx: 28, ry: 24 }) + bits(P, rnd, 'parmesan', 12, 24, 20) + bits(P, rnd, 'parsley', 14, 28, 24) + bits(P, rnd, 'pepper', 10, 26, 22);
    } },
    { id: 'gnocchi', name: 'Gnocchi', sub: 'Pasta', kw: 'gnocchi potato dumplings pan fried brown butter sage', form: 'pile', role: 'main', g: 300, w: 74, h: 68, side: { s: 'pile', h: 18, c: '#F1E2B0' }, draw: function (P, rnd) {
      return pool(P, rnd, 38, 33, '#C9922E', 0.45) + pastaHeap(P, rnd, { kind: 'gnocchi', n: 26, rx: 30, ry: 25, col: '#F1E2B0', edge: '#C9B074', seared: true }) + P.leaf(14, 7, '#7E9A6A', -8, -6, 30, { vc: '#A8BC94' }) + P.leaf(12, 6, '#8AA676', 14, 8, -50, { vc: '#A8BC94' }) + bits(P, rnd, 'parmesan', 12, 26, 22);
    } },
    { id: 'pasta-salad', name: 'Pasta salad', sub: 'Pasta', kw: 'pasta salad cold fusilli tomato olive basil feta picnic', form: 'mound', role: 'sidedish', g: 150, w: 62, h: 62, side: { s: 'mound', h: 20, c: '#EED98E' }, draw: function (P, rnd) {
      var out = pastaHeap(P, rnd, { kind: 'fusilli', n: 20, rx: 26, ry: 22, col: '#EED98E' });
      out += P.scatter(rnd, 6, 24, 20, function (x, y) { return P.circle(x, y, 4.2, C.tomato, '#9E2B20', 0.8) + P.circle(x - 0.5, y - 0.5, 2.4, '#EC6A5C', null, 0) + P.circle(x + 1, y + 0.8, 0.6, '#F2E2A0') + P.circle(x - 1.4, y + 0.6, 0.6, '#F2E2A0'); }, 8);
      out += P.scatter(rnd, 6, 24, 20, function (x, y) { return P.circle(x, y, 2.6, '#2E2A2A', '#141212', 0.6) + P.circle(x, y, 1, '#5A4E52'); });
      out += P.scatter(rnd, 5, 22, 18, function (x, y, i, q) { return P.g(P.at(x, y, q() * 90), P.rect(-2.6, -2.6, 5.2, 5.2, 0.8, '#FBFAF4', '#E2DCCB', 0.5)); });
      return out + bits(P, rnd, 'basil', 4, 20, 16) + P.scatter(rnd, 5, 22, 18, function (x, y, i, q) { return P.g(P.at(x, y, q() * 180), P.path('M-4 0 Q0 -2.6 4 0', 'none', C.onion, 1.3, rc())); });
    } },

    // noodles
    { id: 'udon', name: 'Udon noodles', sub: 'Noodles', kw: 'udon thick noodles wheat noodles japanese', form: 'pile', role: 'starch', g: 250, w: 76, h: 88, side: { s: 'pile', h: 20, c: '#F4EED8' }, draw: function (P, rnd) {
      return tangle(P, rnd, { n: 13, rx: 32, ry: 28, len: 54, wid: 5.8, amp: 3, col: '#F6F0DC', edge: '#C9BE98', base: true }) + bits(P, rnd, 'shallot', 8, 22, 18) + bits(P, rnd, 'sesame', 10, 22, 18);
    } },
    { id: 'rice-vermicelli', name: 'Rice vermicelli', sub: 'Noodles', kw: 'rice noodles vermicelli bun thin rice stick noodles', form: 'pile', role: 'starch', g: 100, w: 70, h: 64, side: { s: 'pile', h: 16, c: RICE_NOODLE }, draw: function (P, rnd) {
      return P.shadow(P.blob(rnd, 34, 31, 0.1, 12), 1.5, 2.2) + vermicelli(P, rnd, 34, 31);
    } },
    { id: 'noodle-stir-fry', name: 'Noodle stir fry with vegetables', sub: 'Noodles', kw: 'stir fry noodles hokkien egg noodles chow mein lo mein veg wok', form: 'pile', cook: 'fried', role: 'main', g: 350, w: 100, h: 90, side: { s: 'pile', h: 28, c: '#D9A84E' }, draw: function (P, rnd) {
      var out = tangle(P, rnd, { n: 22, rx: 40, ry: 35, len: 52, wid: 3, amp: 3.5, col: '#D9A84E', edge: '#9E7228', base: true });
      ['broccoli', 'capsicum', 'carrot', 'snowpea', 'broccoli', 'capsicum', 'carrot', 'snowpea', 'broccoli', 'capsicum', 'snowpea', 'carrot'].forEach(function (k) { var p = P.inEllipse(rnd, 32, 28); out += veg(P, rnd, k, p[0], p[1]); });
      return out + bits(P, rnd, 'shallot', 10, 30, 26) + bits(P, rnd, 'sesame', 16, 30, 26);
    } },
    { id: 'pad-thai', name: 'Pad thai', sub: 'Noodles', kw: 'pad thai phad thai rice noodles prawns peanuts tamarind lime bean sprouts', form: 'pile', cook: 'fried', role: 'main', g: 350, w: 100, h: 90, side: { s: 'pile', h: 26, c: '#D9A066' }, draw: function (P, rnd) {
      var out = tangle(P, rnd, { n: 20, rx: 36, ry: 32, len: 54, wid: 3.6, amp: 2, col: '#E6B87E', edge: '#B07A40', base: true });
      out += P.scatter(rnd, 6, 30, 26, function (x, y, i, q) { return P.path(P.blob(q, 3.4, 2.4, 0.3, 7, x, y), '#F6D35A', '#D9A62A', 0.5); });
      [[-16, -8, 30], [12, -14, 120], [4, 14, 250]].forEach(function (p) { out += prawn(P, p[0], p[1], p[2], 1.2); });
      out += bits(P, rnd, 'sprout', 9, 30, 26) + bits(P, rnd, 'peanut', 26, 26, 22) + P.scatter(rnd, 10, 30, 26, function (x, y, i, q) { var a = q() * Math.PI; return P.line(x, y, x + Math.cos(a) * 8, y + Math.sin(a) * 8, C.greenDark, 1.4); });
      return out + citrus(P, 38, 22, -30, 1.1, true) + bits(P, rnd, 'flakes', 10, 26, 22);
    } },
    { id: 'tteokbokki', name: 'Tteokbokki', sub: 'Noodles', kw: 'tteokbokki ddeokbokki rice cakes korean spicy gochujang fish cake', form: 'pile', cook: 'braised', role: 'main', g: 300, w: 84, h: 78, side: { s: 'pile', h: 20, c: '#D2452E' }, draw: function (P, rnd) {
      var out = pool(P, rnd, 42, 38, '#C9402A');
      out += P.scatter(rnd, 4, 28, 24, function (x, y, i, q) { return P.g(P.at(x, y, q() * 180), P.path('M-9 6 L0 -9 L9 6 Q4.5 3.6 0 6 Q-4.5 3.6 -9 6 Z', '#E2B878', '#B98A4A', 0.8) + P.path('M-5 3 L0 -5 L5 3', 'none', '#D9A462', 0.8)); });
      out += P.scatter(rnd, 14, 30, 26, function (x, y, i, q) {
        var s = P.rect(-15, -4.6, 30, 9.2, 2.2, '#000000', null, 0, { opacity: '0.12', transform: 'translate(1 1.5)' }) + P.rect(-15, -4.6, 30, 9.2, 2.2, '#F2E2D2', '#B9876A', 0.8) + P.path(P.blob(q, 11 + q() * 3, 3.6, 0.25, 9, (q() - 0.5) * 4, 1.2), '#D9502E', null, 0, { opacity: '0.8' });
        return P.g(P.at(x, y, q() * 180), s + P.line(-11, -2.6, 9, -2.6, '#FFFFFF', 1.1, { opacity: '0.7' }));
      }, 10);
      return out + eggHalf(P, 18, -14, 9, 30) + bits(P, rnd, 'shallot', 10, 30, 26) + bits(P, rnd, 'sesame', 16, 30, 26);
    } },

    // grains
    { id: 'couscous', name: 'Couscous', sub: 'Grains', kw: 'couscous cous cous moroccan pearl grain', form: 'mound', cook: 'steamed', role: 'starch', g: 150, w: 66, h: 60, side: { s: 'mound', h: 22, c: '#EAD49A' }, draw: function (P, rnd) {
      var d = P.blob(rnd, 32, 29, 0.08, 14), out = P.shadow(d, 2, 3) + P.path(d, '#EAD49A', '#C2A462', 1);
      out += P.path(P.blob(rnd, 22, 11, 0.1, 9, 7, 13), '#DCC284', null, 0, { opacity: '0.8' });
      out += dots(P, rnd, 220, 30, 27, '#D2B472', 0.75) + dots(P, rnd, 160, 28, 25, '#F6E8BE', 0.7);
      return out + bits(P, rnd, 'parsley', 12, 24, 22) + P.hl(-10, -11, 9, 3, '#FFFFFF', 0.45, -20);
    } },
    { id: 'grain-salad', name: 'Grain salad, quinoa or freekeh', sub: 'Grains', kw: 'grain salad quinoa freekeh tabouli pomegranate herbs feta ancient grains', form: 'mound', role: 'salad', g: 150, w: 76, h: 66, side: { s: 'mound', h: 18, c: '#CFB27C' }, draw: function (P, rnd) {
      var d = P.blob(rnd, 38, 33, 0.1, 14), out = P.shadow(d, 1.5, 2.2) + P.path(d, '#D2B680', '#A8884A', 1);
      out += dots(P, rnd, 240, 35, 30, '#B99A5E', 0.8) + dots(P, rnd, 180, 34, 29, '#E8D4A2', 0.75) + dots(P, rnd, 60, 32, 27, '#9E5A3A', 0.7);
      out += P.scatter(rnd, 5, 28, 24, function (x, y, i, q) { return P.g(P.at(x, y, q() * 90), P.rect(-3, -3, 6, 6, 1, '#FBFAF4', '#E2DCCB', 0.5)); });
      out += P.scatter(rnd, 14, 30, 26, function (x, y) { return P.circle(x, y, 1.8, '#B8203A', '#7E1028', 0.5) + P.circle(x - 0.5, y - 0.5, 0.5, '#FFFFFF', null, 0, { opacity: '0.5' }); });
      return out + bits(P, rnd, 'herb', 12, 30, 26) + bits(P, rnd, 'mint', 4, 26, 22);
    } },
    { id: 'polenta-soft', name: 'Soft polenta', sub: 'Grains', kw: 'polenta soft wet creamy cornmeal yellow cornmeal grits parmesan butter', form: 'mound', role: 'starch', g: 150, w: 70, h: 62, side: { s: 'mound', h: 16, c: '#F2CC58' }, draw: function (P, rnd) {
      var d = P.blob(rnd, 35, 31, 0.07, 14), out = P.shadow(d, 1.5, 2.2) + P.path(d, '#F0C850', '#C99A2A', 1);
      out += P.path(P.blob(rnd, 28, 24, 0.08, 12, -2, -1), '#F4D46A', null, 0) + P.path('M-20 6 Q-6 -8 10 -2 T24 4', 'none', '#E2B23E', 2, rc({ opacity: '0.7' }));
      out += P.path(P.blob(rnd, 9, 7, 0.15, 9, 6, 2), '#F8E08A', '#E2B23E', 0.7) + P.hl(4, 0, 4, 1.6, '#FFFFFF', 0.7);
      return out + bits(P, rnd, 'parmesan', 12, 24, 20) + bits(P, rnd, 'pepper', 12, 26, 22) + P.hl(-14, -14, 10, 3, '#FFFFFF', 0.5, -20);
    } },
    { id: 'granola', name: 'Granola', sub: 'Grains', kw: 'granola toasted muesli oats clusters nuts breakfast crunch', form: 'pile', cook: 'baked', role: 'topping', g: 60, w: 52, h: 42, side: { s: 'pile', h: 12, c: '#C99A5A' }, draw: function (P, rnd) {
      var out = P.scatter(rnd, 16, 24, 19, function (x, y, i, q) { var d = P.blob(q, 4 + q() * 3, 3 + q() * 2, 0.3, 8, x, y); return P.shadow(d, 0.8, 1.2) + P.path(d, ['#C99A5A', '#B9864A', '#D9B070'][i % 3], '#8E5E2A', 0.6) + dots(P, q, 4, 3, 2, '#E8CC94', 0.7, x, y); });
      out += P.scatter(rnd, 14, 26, 20, function (x, y, i, q) { return P.g(P.at(x, y, q() * 180), P.ellipse(0, 0, 2.6, 1.4, '#E6CC98', '#B9946A', 0.5)); });
      out += P.scatter(rnd, 5, 22, 17, function (x, y, i, q) { return P.g(P.at(x, y, q() * 180), P.path('M-4 0 Q-2 -3 3 -1 Q4 0 3 1 Q-2 3 -4 0 Z', '#A8683A', '#7A4422', 0.6) + P.line(-2, 0, 2, 0, '#C99A6A', 0.6)); });
      out += P.scatter(rnd, 5, 22, 17, function (x, y, i, q) { return P.g(P.at(x, y, q() * 180), P.ellipse(0, 0, 2.2, 1.3, '#6E9A3E', '#4F7F2F', 0.4)); });
      return out + P.scatter(rnd, 6, 22, 17, function (x, y, i, q) { return P.path(P.blob(q, 1.8, 1.4, 0.3, 6, x, y), '#B8203A', '#7E1028', 0.4); });
    } },
    { id: 'porridge', name: 'Porridge, bowlful', sub: 'Grains', kw: 'porridge oats oatmeal brown sugar honey breakfast bowl', form: 'bowlful', role: 'main', g: 300, w: 112, h: 112, side: { s: 'cup', h: 40, c: '#E9DCBC' }, draw: function (P, rnd) {
      var out = P.circle(0, 0, 55, '#E6D8B6', '#C2AE84', 1.2) + P.circle(0, 0, 52, 'none', '#D6C69E', 3, { opacity: '0.6' });
      out += P.scatter(rnd, 70, 48, 48, function (x, y, i, q) { return P.g(P.at(x, y, q() * 180), P.ellipse(0, 0, 2.6, 1.6, i % 2 ? '#F2E8CE' : '#D9C8A0', null, 0, { opacity: '0.85' })); });
      var sw = 'M-24 2 Q-24 -20 0 -20 Q22 -20 22 0 Q22 16 2 16 Q-12 16 -12 4 Q-12 -8 0 -8 Q8 -8 8 0';
      out += P.path(sw, 'none', '#C98A22', 3.6, rc({ opacity: '0.9' })) + P.path(sw, 'none', '#EDB848', 2, rc());
      out += P.crumbs(rnd, 30, 24, 20, ['#A8702A', '#8E5A1E', '#C98A3A'], 0.9);
      return out + P.hl(-24, -28, 14, 4, '#FFFFFF', 0.4, -30);
    } },
    { id: 'rolled-oats', name: 'Rolled oats', sub: 'Grains', kw: 'rolled oats old-fashioned oats quick oats steel-cut oats oat flakes raw porridge oats muesli topping', form: 'scatter', cook: 'raw', role: 'topping', g: 30, w: 54, h: 42, side: { s: 'pile', h: 6, c: '#E6D3A6' }, draw: function (P, rnd) {
      return P.scatter(rnd, 34, 23, 17, function (x, y, i, q) {
        var col = ['#EBDBB2', '#E2CC9C', '#F0E4C4'][i % 3], d = P.blob(q, 3 + q() * 1.2, 2.3 + q() * 0.8, 0.22, 6, x, y, q() * 180);
        return P.path(d, col, P.shade(col, -0.26), 0.5) + (i % 3 ? '' : P.circle(x - 0.6, y - 0.5, 0.7, P.shade(col, 0.6), null, 0, { opacity: '0.8' }));
      }, 5) + P.crumbs(rnd, 8, 22, 16, ['#C9A86E'], 0.5);
    } },
    { id: 'red-lentils', name: 'Red lentils, cooked', sub: 'Pulses', kw: 'red lentils split red lentils masoor dal dhal cooked boiled pulses legumes', form: 'mound', role: 'starch', g: 150, w: 64, h: 56, side: { s: 'mound', h: 16, c: '#E8A440' }, draw: seedMound({ rx: 30, ry: 26, col: '#E3A040', seeds: [['#EDB65A', 90, 0.5, 2.8], ['#F2C46E', 50, 0.5, 2.6], ['#E88E4A', 24, 0.5, 2.5]], glint: 20, wob: 0.06 }) },
    { id: 'green-lentils', name: 'Green lentils, cooked', sub: 'Pulses', kw: 'green lentils puy lentils french lentils du puy cooked boiled pulses legumes', form: 'mound', role: 'starch', g: 150, w: 64, h: 56, side: { s: 'mound', h: 18, c: '#6E6848' }, draw: seedMound({ rx: 30, ry: 26, col: '#5A553A', seeds: [['#7A7452', 78, 0.6, 3.2], ['#625C3E', 46, 0.6, 3.1], ['#8E8A62', 34, 0.6, 3]], glint: 26 }) },
    { id: 'brown-lentils', name: 'Brown lentils, cooked', sub: 'Pulses', kw: 'brown lentils cooked boiled pulses legumes', form: 'mound', role: 'starch', g: 150, w: 64, h: 56, of: 'green-lentils', side: { s: 'mound', h: 18, c: '#8E6640' }, draw: seedMound({ rx: 30, ry: 26, col: '#6E4C2E', seeds: [['#9A7048', 80, 0.7, 3.4], ['#84603C', 46, 0.7, 3.3], ['#B08458', 36, 0.7, 3.2]], glint: 26 }) },
    { id: 'cannellini-beans', name: 'Cannellini beans', sub: 'Pulses', kw: 'cannellini beans white beans haricot navy beans great northern cooked tinned pulses legumes', form: 'mound', role: 'starch', g: 120, w: 62, h: 52, side: { s: 'pile', h: 14, c: '#F0E8D4' }, draw: beanPile({ rx: 28, ry: 23, count: 42, len: 2.8, wid: 5, cols: ['#EFE6D0', '#F5EEDC', '#E9DFC6'] }) },
    { id: 'lima-beans', name: 'Lima beans', sub: 'Pulses', kw: 'lima beans butter beans large white beans gigantes cooked pulses legumes', form: 'mound', role: 'starch', g: 120, w: 66, h: 56, of: 'cannellini-beans', side: { s: 'pile', h: 14, c: '#E6E2BE' }, draw: beanPile({ rx: 29, ry: 24, count: 24, len: 3.6, wid: 8, cols: ['#E6E2BE', '#EEEACC', '#DCDCB0'] }) },
    { id: 'farro', name: 'Farro, cooked', sub: 'Grains', kw: 'farro emmer spelt wheat berries ancient grain cooked boiled', form: 'mound', role: 'starch', g: 150, w: 66, h: 58, side: { s: 'mound', h: 20, c: '#B48858' }, draw: seedMound({ rx: 31, ry: 27, col: '#9A7046', seeds: [['#B88C5C', 70, 2.4, 2.5], ['#C9A070', 50, 2.4, 2.4], ['#D6B484', 32, 2.2, 2.3]], glint: 24 }) },
    { id: 'pearl-barley', name: 'Pearl barley, cooked', sub: 'Grains', kw: 'pearl barley pearled barley cooked boiled grain', form: 'mound', role: 'starch', g: 150, w: 66, h: 58, side: { s: 'mound', h: 20, c: '#E2D4B2' }, draw: function (P, rnd) {
      return seedMoundSvg(P, rnd, { rx: 31, ry: 27, col: '#C9B68C', seeds: [['#E2D5B4', 66, 1.4, 3, '#A88E62'], ['#EEE5CE', 44, 1.3, 2.9, '#B39A6E']], glint: 0 });
    } },
    { id: 'buckwheat', name: 'Buckwheat, cooked', sub: 'Grains', kw: 'buckwheat groats kasha toasted buckwheat cooked grain gluten free', form: 'mound', role: 'starch', g: 150, w: 64, h: 56, side: { s: 'mound', h: 18, c: '#A8784C' }, draw: function (P, rnd) {
      var d = P.blob(rnd, 30, 26, 0.08, 14), col = '#9A7048', out = P.shadow(d) + P.path(d, col, P.shade(col, -0.26), 1);
      // the groats: little rounded pyramids, seen as triangles
      ['#A87A4C', '#BC8E5E', '#CCA272'].forEach(function (c, j) {
        var t = '';
        P.spots(rnd, [60, 44, 30][j], 26 - j * 2.5, 22 - j * 2.5).forEach(function (p) { var a = rnd() * Math.PI * 2, r = 2.5 + rnd() * 0.5; t += 'M' + n(p[0] + Math.cos(a) * r) + ' ' + n(p[1] + Math.sin(a) * r) + 'L' + n(p[0] + Math.cos(a + 2.1) * r) + ' ' + n(p[1] + Math.sin(a + 2.1) * r) + 'L' + n(p[0] + Math.cos(a + 4.2) * r) + ' ' + n(p[1] + Math.sin(a + 4.2) * r) + 'Z'; });
        out += P.path(t, c, P.shade(c, -0.26), 0.6, rc());
      });
      return out + dots(P, rnd, 30, 24, 20, '#EAD2AE', 0.45) + P.hl(-9, -10, 8, 3, P.shade(col, 0.45), 0.8, -20);
    } },
    { id: 'millet', name: 'Millet, cooked', sub: 'Grains', kw: 'millet cooked fluffy grain gluten free', form: 'mound', role: 'starch', g: 150, w: 64, h: 56, side: { s: 'mound', h: 18, c: '#EED38A' }, draw: seedMound({ rx: 30, ry: 26, col: '#DCBC66', seeds: [['#F0D68A', 86, 0.2, 1.7], ['#F6E3A8', 58, 0.2, 1.6], ['#E6C470', 32, 0.2, 1.5]], glint: 0 }) },
    { id: 'semolina', name: 'Semolina, cooked', sub: 'Grains', kw: 'semolina cooked soft semolina porridge farina sooji suji', form: 'mound', role: 'starch', g: 150, w: 68, h: 60, side: { s: 'mound', h: 14, c: '#F1E0A8' }, draw: function (P, rnd) {
      var col = '#EFDCA2', d = P.blob(rnd, 33, 29, 0.06, 14), out = P.shadow(d) + P.path(d, col, P.shade(col, -0.26), 1);
      out += P.path(P.blob(rnd, 26, 22, 0.08, 12, -2, -1), '#F5E8BE', null, 0) + P.path('M-20 6 Q-8 -10 8 -4 T22 2', 'none', P.shade(col, -0.12), 2, rc({ opacity: '0.8' }));
      out += dots(P, rnd, 90, 28, 24, '#E2CC88', 0.45) + dots(P, rnd, 50, 26, 22, '#FBF3DA', 0.45);
      return out + P.hl(-12, -12, 9, 3, '#FBF4DE', 0.8, -20);
    } },
    { id: 'bulgur', name: 'Bulgur, cooked', sub: 'Grains', kw: 'bulgur burghul bulgar bulghur cracked wheat cooked soaked pilaf', form: 'mound', role: 'starch', g: 150, w: 64, h: 56, side: { s: 'mound', h: 16, c: '#CFAA72' }, draw: seedMound({ rx: 30, ry: 26, col: '#B38E58', seeds: [['#D6B47E', 80, 1, 1.8], ['#C29C64', 55, 1, 1.7], ['#E2C696', 40, 0.9, 1.6]], glint: 0 }) },

    // bowls (contents only)
    { id: 'pho-bowlful', name: 'Pho, bowlful', sub: 'Bowls', kw: 'pho beef pho noodle soup vietnamese rare beef broth bean sprouts basil', form: 'bowlful', role: 'main', g: 600, w: 146, h: 146, side: { s: 'cup', h: 50, c: '#C99A5E' }, draw: function (P, rnd) {
      var out = broth(P, rnd, '#C99A5E', 30) + vermicelli(P, rnd, 40, 34, -8, 6).replace(/#ECE8DC/, '#E8D6B6');
      for (var i = 0; i < 5; i++) out += beefSlice(P, rnd, -30 + i * 12, -6 + Math.abs(i - 2) * 4, 70 + (i - 2) * 14);
      out += sector(P, rnd, { a: -70, b: 10, r0: 44, r1: 62, count: 9, fn: function (x, y, i, q) { return bits(P, q, 'sprout', 1, 1, 1, x, y); } });
      out += P.leaf(16, 8, '#2E6A2E', 30, -52, -30, { vc: '#5E8C3A' }) + P.leaf(14, 7, '#3F7A2E', 44, -36, 20, { vc: '#5E8C3A' }) + P.leaf(13, 7, '#2E6A2E', 22, -40, 60, { vc: '#5E8C3A' });
      out += sector(P, rnd, { a: 100, b: 260, r0: 44, r1: 64, count: 12, fn: function (x, y, i, q) { return i % 3 ? P.circle(x, y, 2.2, '#C9DE8E', SHALLOT, 1.1) : veg(P, q, 'onion', x, y); } });
      return out + citrus(P, -46, 40, 40, 1.3, true) + P.scatter(rnd, 4, 14, 10, function (x, y) { return P.circle(x + 40, y + 34, 2.4, '#F2D8C8', '#C9302A', 1.3); }) + bits(P, rnd, 'herb', 8, 40, 36);
    } },
    { id: 'laksa-bowlful', name: 'Laksa, bowlful', sub: 'Bowls', kw: 'laksa curry laksa coconut noodle soup prawns tofu puffs malaysian', form: 'bowlful', role: 'main', g: 650, w: 146, h: 146, side: { s: 'cup', h: 50, c: '#E08A3A' }, draw: function (P, rnd) {
      var out = broth(P, rnd, '#E08A3A', 0) + P.scatter(rnd, 26, 62, 62, function (x, y, i, q) { return P.circle(x, y, 1.5 + q() * 3, '#C9502A', null, 0, { opacity: '0.55' }); });
      out += tangle(P, rnd, { n: 10, rx: 36, ry: 30, len: 44, wid: 3, amp: 3, col: '#EED27E', edge: '#C49A3E' });
      out += sector(P, rnd, { a: 200, b: 300, r0: 30, r1: 58, count: 5, fn: function (x, y, i, q) { return tofuPuff(P, q, x, y); } });
      out += [[30, -24, 40], [40, 4, 130], [18, 28, 220]].map(function (p) { return prawn(P, p[0], p[1], p[2], 1.3); }).join('');
      out += eggHalf(P, -30, 22, 11, -20) + sector(P, rnd, { a: 100, b: 170, r0: 44, r1: 62, count: 7, fn: function (x, y, i, q) { return bits(P, q, 'sprout', 1, 1, 1, x, y); } });
      out += P.path(P.blob(rnd, 8, 6, 0.2, 8, 4, -40), '#9E2418', '#6E1810', 0.8) + bits(P, rnd, 'mint', 10, 50, 50) + citrus(P, 52, 36, -50, 1.2, true);
      return out + P.scatter(rnd, 3, 12, 10, function (x, y) { return P.circle(x - 6, y - 4, 4.4, '#F4EEE2', '#C9B898', 0.8) + P.circle(x - 6, y - 4, 4.4, 'none', '#E89A9A', 0.8, { 'stroke-dasharray': '1.2 1.6' }); });
    } },
    { id: 'ramen-bowlful', name: 'Ramen, bowlful', sub: 'Bowls', kw: 'ramen tonkotsu shoyu miso noodle soup chashu pork egg nori japanese', form: 'bowlful', role: 'main', g: 650, w: 146, h: 146, side: { s: 'cup', h: 50, c: '#E8D2A6' }, draw: function (P, rnd) {
      var out = broth(P, rnd, '#E8D2A6', 40) + tangle(P, rnd, { n: 14, rx: 40, ry: 34, len: 50, wid: 2.8, amp: 2.6, col: '#F0D27A', edge: '#C49A3E' });
      out += P.g(P.at(-50, -22, -18), P.rect(-12, -22, 24, 44, 1.5, '#203024', '#121C14', 1) + P.line(-8, -18, -8, 18, '#34483A', 1));
      out += chashu(P, rnd, 22, -26, 17) + chashu(P, rnd, 38, -4, 15);
      out += eggHalf(P, -16, 30, 12, -15, { white: '#E8C494', edge: '#B98E5A', yolk: '#F2B23A', jammy: true }) + eggHalf(P, 8, 40, 12, 20, { white: '#E8C494', edge: '#B98E5A', yolk: '#F2B23A', jammy: true });
      out += sector(P, rnd, { a: 200, b: 260, r0: 20, r1: 46, count: 6, fn: function (x, y, i, q) { return veg(P, q, 'menma', x, y); } });
      out += sector(P, rnd, { a: 300, b: 400, r0: 8, r1: 30, count: 16, fn: function (x, y) { return P.circle(x, y, 2.2, '#C9DE8E', SHALLOT, 1.1); } });
      return out + bits(P, rnd, 'sesame', 20, 46, 46);
    } },
    { id: 'vermicelli-salad-bowlful', name: 'Vermicelli salad bowl', sub: 'Bowls', kw: 'vermicelli salad bowl bun bun thit nuong lemongrass pork vietnamese noodle salad', form: 'bowlful', role: 'main', g: 450, w: 146, h: 146, side: { s: 'cup', h: 45, c: RICE_NOODLE }, draw: function (P, rnd) {
      var out = P.circle(0, 0, BOWL_R, '#EEEADF', '#D6D0BE', 1.2) + vermicelli(P, rnd, 66, 66);
      out += sector(P, rnd, { a: 160, b: 250, r0: 20, r1: 64, count: 9, fn: function (x, y, i, q) { return veg(P, q, 'lettuce', x, y); } });
      out += sector(P, rnd, { a: 250, b: 300, r0: 24, r1: 64, count: 7, fn: function (x, y, i, q) { return veg(P, q, 'baton', x, y); } });
      out += sector(P, rnd, { a: 300, b: 350, r0: 24, r1: 64, count: 12, fn: function (x, y, i, q) { return veg(P, q, i % 2 ? 'carrot' : 'daikon', x, y); } });
      out += sector(P, rnd, { a: -10, b: 150, r0: 18, r1: 60, count: 11, fn: function (x, y, i, q) { return veg(P, q, 'pork', x, y); } });
      out += sector(P, rnd, { a: 0, b: 360, r0: 0, r1: 18, count: 22, fn: function (x, y, i, q) { return bits(P, q, i % 3 ? 'peanut' : 'fried-shallot', 1, 1, 1, x, y); } });
      return out + bits(P, rnd, 'mint', 7, 56, 56) + bits(P, rnd, 'herb', 6, 56, 56) + citrus(P, -40, 46, 30, 1.2, true);
    } },
    { id: 'poke-bowlful', name: 'Poke bowl', sub: 'Bowls', kw: 'poke bowl poké salmon tuna sushi rice edamame avocado seaweed', form: 'bowlful', role: 'main', g: 500, w: 146, h: 146, side: { s: 'cup', h: 45, c: '#EE8A5A' }, draw: function (P, rnd) {
      var out = P.circle(0, 0, BOWL_R, '#F6F3EC', RICE_EDGE, 1.2) + grainTex(P, rnd, { count: 200, rx: 68, ry: 68, col: '#FFFFFF', edge: '#DCD7C8', len: 3.4, wid: 1.6 });
      var S = [['salmon', 9], ['edamame', 18], ['avocado', 5], ['cucumber', 6], ['ginger', 5], ['seaweed', 10], ['corn', 16], ['cabbage', 10]];
      S.forEach(function (s, k) {
        var a = k * 45 - 112;
        out += sector(P, rnd, { a: a + 4, b: a + 41, r0: 20, r1: 64, count: s[1], fn: function (x, y, i, q) {
          if (s[0] === 'avocado') return P.g(P.at(x, y, a + 22 + 90), P.path('M-11 0 Q0 -7 11 0 Q0 2 -11 0 Z', '#D2E29A', '#8DB255', 0.7) + P.path('M-11 0 Q0 -7 11 0', 'none', '#3E6A24', 1.4, rc()));
          return veg(P, q, s[0], x, y);
        } });
      });
      out += drizzle(P, rnd, 22, 6, '#F2A07A', 2.2, 6, -20) + bits(P, rnd, 'sesame', 30, 60, 60);
      return out + P.scatter(rnd, 5, 14, 12, function (x, y, i, q) { return P.g(P.at(x, y, q() * 180), P.rect(-4, -0.8, 8, 1.6, 0.4, '#1E2E22')); });
    } },
    { id: 'curry-rice-bowlful', name: 'Curry with rice, bowlful', sub: 'Bowls', kw: 'curry rice butter chicken korma massaman bowl chicken curry indian thai', form: 'bowlful', role: 'main', g: 500, w: 136, h: 136, side: { s: 'cup', h: 45, c: '#D9822E' }, draw: function (P, rnd) {
      var R = 68, out = P.circle(0, 0, R, '#D9822E', '#A8581C', 1.2) + P.circle(0, 0, R - 3, 'none', '#C9702A', 3, { opacity: '0.6' });
      out += P.scatter(rnd, 10, 34, 46, function (x, y, i, q) { return veg(P, q, 'chicken', x + 22, y); }, 12);
      out += P.scatter(rnd, 4, 30, 40, function (x, y, i, q) { return P.g(P.at(x + 24, y, q() * 90), P.rect(-4, -4, 8, 8, 2, '#F2D27A', '#C9A04A', 0.7)); });
      out += P.path('M10 -30 Q30 -40 40 -20 T34 20 Q20 34 12 22', 'none', '#F6EAD0', 2.4, rc({ opacity: '0.85' }));
      // the rice on the left half
      var rd = P.smooth([[-4, -64], [-30, -58], [-56, -38], [-64, -4], [-58, 30], [-36, 56], [-6, 62], [6, 30], [0, 0], [6, -30]]);
      out += P.shadow(rd, 1.5, 2) + P.path(rd, C.rice, RICE_EDGE, 1) + grainTex(P, rnd, { count: 140, rx: 26, ry: 52, cx: -30, cy: 0, col: '#FFFFFF', edge: '#DCD7C8', len: 3.4, wid: 1.6 });
      return out + bits(P, rnd, 'herb', 10, 30, 40, 26, 0) + P.hl(-40, -40, 10, 3, '#FFFFFF', 0.5, -40);
    } },
    { id: 'bibimbap-bowlful', name: 'Bibimbap', sub: 'Bowls', kw: 'bibimbap bibimbab korean rice bowl egg gochujang beef vegetables dolsot', form: 'bowlful', role: 'main', g: 550, w: 146, h: 146, side: { s: 'cup', h: 45, c: '#D2452E' }, draw: function (P, rnd) {
      var out = P.circle(0, 0, BOWL_R, '#F6F3EC', RICE_EDGE, 1.2) + grainTex(P, rnd, { count: 120, rx: 68, ry: 68, col: '#FFFFFF', edge: '#DCD7C8', len: 3.4, wid: 1.6 });
      var S = ['spinach', 'sprout', 'carrot', 'mushroom', 'zucchini', 'bulgogi', 'kimchi'];
      S.forEach(function (s, k) {
        var a = k * (360 / S.length) - 90;
        out += sector(P, rnd, { a: a + 3, b: a + 360 / S.length - 3, r0: 24, r1: 64, count: s === 'sprout' || s === 'carrot' ? 16 : 10, fn: function (x, y, i, q) { return s === 'sprout' ? bits(P, q, 'sprout', 1, 1, 1, x, y) : veg(P, q, s, x, y); } });
      });
      out += friedEgg(P, rnd, 0, 0, 20) + P.path(P.blob(rnd, 6, 5, 0.2, 8, 16, -16), '#B5301F', '#7E1E12', 0.8);
      return out + bits(P, rnd, 'sesame', 30, 60, 60);
    } }
  ]);
  // the helpers, for the other category files and "Draw it for me"
  L.GRAINS = { grainD: grainD, grainTex: grainTex, dots: dots, riceMound: riceMound, riceMoundSvg: riceMoundSvg, seedMound: seedMound, beanTex: beanTex, nest: nest, nestSvg: nestSvg, ragu: ragu, shortPasta: shortPasta, pastaHeap: pastaHeap, tangle: tangle, vermicelli: vermicelli, friedEgg: friedEgg, eggHalf: eggHalf, prawn: prawn, mussel: mussel, citrus: citrus, bits: bits, veg: veg, sector: sector, broth: broth, pool: pool };
})();
