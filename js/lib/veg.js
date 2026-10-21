/* The drawing library: vegetables and salads (see js/library.js for the fields). Drawn around 0,0, 1 unit is about 1.5 mm. */
(function () {
  'use strict';
  var L = window.LK_LIB, P = L.P, C = P.C, n = P.n, PI = Math.PI;

  /* ---------- shared bits ---------- */
  function ed(c, f) { return P.shade(c, f === undefined ? -0.28 : f); }
  function pick(q, list) { return list[Math.min(list.length - 1, Math.floor(q() * list.length))]; }
  function tr(x, y) { return 'translate(' + n(x) + ' ' + n(y) + ')'; }
  function rot(a, x, y) { return 'rotate(' + n(a) + ' ' + n(x) + ' ' + n(y) + ')'; }
  // the soft shadow of a path drawn under a transform, always cast down and to the right
  function sh(d, tf, dx, dy) { return P.path(d, '#000000', null, 0, { opacity: '0.12', transform: tr(dx === undefined ? 1.4 : dx, dy === undefined ? 1.8 : dy) + (tf ? ' ' + tf : '') }); }
  function circD(r, cx, cy) { cx = cx || 0; cy = cy || 0; return 'M' + n(cx - r) + ' ' + n(cy) + ' A' + n(r) + ' ' + n(r) + ' 0 1 0 ' + n(cx + r) + ' ' + n(cy) + ' A' + n(r) + ' ' + n(r) + ' 0 1 0 ' + n(cx - r) + ' ' + n(cy) + ' Z'; }
  function shuffle(q, a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(q() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  // a heap of pieces spread evenly over an ellipse (no bunching to one side), drawn back to front
  function heap(q, count, rx, ry, fn) {
    var pts = P.spots(q, count, rx, ry), mx = 0, my = 0;
    pts.forEach(function (p) { mx += p[0] / pts.length; my += p[1] / pts.length; });
    return pts.map(function (p, i) { return fn(p[0] - mx, p[1] - my, i, q); }).join('');
  }
  // a tossed mix, back to front: bag lists the kinds (repeat a kind to have more of it), fns[kind](q, x, y) draws one
  function tossed(q, bag, rx, ry, fns) { var b = shuffle(q, bag); return heap(q, b.length, rx, ry, function (x, y, i, qq) { return fns[b[i]](qq, x, y); }); }
  function sprinkle(q, count, rx, ry, cols, r) { return P.scatter(q, count, rx, ry, function (x, y, i, qq) { return P.circle(x, y, r * (0.6 + qq() * 0.6), pick(qq, cols)); }); }

  /* ---------- leaves ---------- */
  // a frilled lettuce leaf along x, the stem end at -len/2
  function ruffleD(q, len, wid, frill, k) {
    k = k || 22;
    var pts = [], rx = len / 2, ry = wid / 2;
    for (var i = 0; i < k; i++) {
      var a = i / k * 2 * PI, c = Math.cos(a), s = Math.sin(a), taper = 0.38 + 0.62 * Math.sqrt((c + 1) / 2), j = 1 + (i % 2 ? -1 : 1) * frill * (0.5 + q() * 0.5);
      pts.push([c * rx * (c < -0.9 ? 1 : j), s * ry * taper * j]);
    }
    return P.smooth(pts);
  }
  // a leaf with lobes down both sides (rocket, oak leaf); grow widens it towards the tip
  function lobedD(q, len, wid, lobes, depth, grow) {
    var top = [], bot = [], k = lobes * 2;
    for (var i = 1; i < k; i++) {
      var t = i / k, x = -len / 2 + t * len, env = Math.sqrt(Math.sin(PI * (0.05 + 0.85 * t))) * (1 - grow + grow * t);
      top.push([x + (q() - 0.5) * len * 0.04, -wid / 2 * env * (i % 2 ? 1 : 1 - depth)]);
      bot.push([x + (q() - 0.5) * len * 0.04, wid / 2 * env * (i % 2 ? 1 - depth : 1)]);
    }
    return P.smooth([[-len / 2, 0]].concat(top, [[len / 2 + len * 0.04, 0]], bot.reverse()));
  }
  // the pale midrib, wide at the stem and running out towards the tip
  function ribD(len, w0, end) {
    var e = len * (end || 0.36);
    return 'M' + n(-len / 2) + ' ' + n(-w0 / 2) + ' Q' + n(-len * 0.05) + ' ' + n(-w0 * 0.35) + ' ' + n(e) + ' 0 Q' + n(-len * 0.05) + ' ' + n(w0 * 0.35) + ' ' + n(-len / 2) + ' ' + n(w0 / 2) + ' Z';
  }
  function veins(len, wid, col, k, op) {
    var out = '';
    for (var i = 1; i <= k; i++) {
      var x = -len / 2 + len * i / (k + 1.2), x2 = x + len * 0.15;
      out += P.path('M' + n(x) + ' 0 Q' + n(x + len * 0.06) + ' ' + n(-wid * 0.2) + ' ' + n(x2) + ' ' + n(-wid * 0.33) + ' M' + n(x) + ' 0 Q' + n(x + len * 0.06) + ' ' + n(wid * 0.2) + ' ' + n(x2) + ' ' + n(wid * 0.33), 'none', col, 0.6, { opacity: String(op || 0.8), 'stroke-linecap': 'round' });
    }
    return out;
  }
  // the salad leaves: each gives its outline (d, for the shadow) and its body (b), drawn along x at scale s
  var LEAF = {
    cos: function (q, s) { var l = 36 * s, w = 15 * s, d = ruffleD(q, l, w, 0.06); return { d: d, b: P.path(d, '#77A845', '#4F7F2F', 0.7) + P.path(ruffleD(q, l * 0.7, w * 0.55, 0.04), '#A6CB68', null, 0, { transform: tr(-l * 0.13, 0) }) + P.path(ribD(l, w * 0.18), '#E6F0C6', null, 0) + veins(l, w, '#E6F0C6', 3) }; },
    butter: function (q, s) { var l = 26 * s, w = 22 * s, d = ruffleD(q, l, w, 0.07); return { d: d, b: P.path(d, '#9CC463', '#6E9A3E', 0.7) + P.path(ruffleD(q, l * 0.66, w * 0.6, 0.05), '#C2DB86', null, 0, { transform: tr(-l * 0.1, 0) }) + P.path(ribD(l, w * 0.1), '#E8F1C8', null, 0) + veins(l, w, '#E2EEC0', 2) }; },
    oak: function (q, s) { var l = 30 * s, w = 22 * s, d = lobedD(q, l, w, 4, 0.4, 0.35); return { d: d, b: P.path(d, '#8E3A4A', '#5E2034', 0.7) + P.path(lobedD(q, l * 0.6, w * 0.5, 3, 0.3, 0.3), '#7EA453', null, 0, { transform: tr(-l * 0.2, 0) }) + P.path(ribD(l, w * 0.08, 0.4), '#D6E6A8', null, 0) + veins(l, w, '#C9DE8E', 2, 0.7) }; },
    rocket: function (q, s) { var l = 32 * s, w = 10 * s, d = lobedD(q, l, w, 4, 0.55, 0.6); return { d: d, b: P.path(d, '#5E8C3A', '#3F6A26', 0.7) + P.path('M' + n(-l / 2 - 3 * s) + ' 0 L' + n(l * 0.36) + ' 0', 'none', '#A9C77A', 0.8, { 'stroke-linecap': 'round' }) }; },
    spinach: function (q, s) { var l = 22 * s, w = 16 * s, d = P.smooth([[-l / 2, 0], [-l * 0.32, -w * 0.5], [l * 0.15, -w * 0.58], [l * 0.5, -w * 0.12], [l * 0.52, w * 0.1], [l * 0.15, w * 0.58], [-l * 0.32, w * 0.5]]); return { d: d, b: P.path(d, '#3F7A2E', '#2A5A1E', 0.7) + P.path('M' + n(-l / 2 - 5 * s) + ' 0 Q0 ' + n(w * 0.05) + ' ' + n(l * 0.35) + ' 0', 'none', '#8DB255', 0.8, { 'stroke-linecap': 'round' }) + P.hl(-l * 0.05, -w * 0.22, l * 0.22, w * 0.09, '#FFFFFF', 0.25) }; },
    radicchio: function (q, s) { var l = 26 * s, w = 20 * s, d = ruffleD(q, l, w, 0.09); return { d: d, b: P.path(d, '#8E2A4A', '#5E1A30', 0.7) + P.path(ribD(l, w * 0.16, 0.4), '#F2E4EA', null, 0) + veins(l, w, '#F2E4EA', 3, 0.9) }; },
    warrigal: function (q, s) { var l = 18 * s, w = 14 * s, d = P.smooth([[-l / 2, 0], [-l * 0.38, -w * 0.5], [-l * 0.05, -w * 0.48], [l * 0.52, 0], [-l * 0.05, w * 0.48], [-l * 0.38, w * 0.5]]); return { d: d, b: P.path(d, '#4F8A3A', '#2E5A22', 0.7) + P.path('M' + n(-l / 2 - 4 * s) + ' 0 L' + n(l * 0.3) + ' 0', 'none', '#9CC067', 0.7, { 'stroke-linecap': 'round' }) + P.hl(-l * 0.1, -w * 0.18, l * 0.2, w * 0.08, '#FFFFFF', 0.35) }; }
  };
  function leafAt(kind, q, x, y, a, s) { var f = LEAF[kind](q, s || 1), tf = P.at(x, y, a); return sh(f.d, tf, 1, 1.4) + P.g(tf, f.b); }
  // a heap of salad leaves (o.mix: the leaf kinds, o.count, o.rx, o.ry the spread, o.s the leaf size)
  function leafy(o) {
    o = o || {};
    return function (P, rnd) {
      var mix = o.mix || ['cos', 'oak', 'rocket', 'spinach', 'butter', 'radicchio', 'rocket', 'cos'];
      return heap(rnd, o.count || 14, o.rx || 24, o.ry || 18, function (x, y, i, q) { return leafAt(mix[i % mix.length], q, x, y, q() * 360, (o.s || 1) * (0.85 + q() * 0.3)); });
    };
  }

  /* ---------- round slices ---------- */
  function crinkleD(r) { var pts = []; for (var i = 0; i < 28; i++) { var a = i / 28 * 2 * PI, k = i % 2 ? 0.9 : 1; pts.push([Math.cos(a) * r * k, Math.sin(a) * r * k]); } return P.smooth(pts); }
  function seedAt(x, y, a, rx, ry, col, edgeCol) { return P.ellipse(x, y, rx, ry, col, edgeCol, 0.3, { transform: rot(a, x, y) }); }
  var SLICE = {
    tomato: { skin: '#D33F33', fill: function (q, r, o) {
      var f = o.flesh || '#E5574A', gel = o.gel || '#F28C68', sd = o.seed || '#F6DC8E', out = P.circle(0, 0, r * 0.88, f), m = o.loc || 5, a0 = q() * 6;
      for (var i = 0; i < m; i++) {
        var a = a0 + i / m * 2 * PI, cx = Math.cos(a) * r * 0.5, cy = Math.sin(a) * r * 0.5;
        out += P.ellipse(cx, cy, r * 0.25, r * 0.18, gel, null, 0, { transform: rot(a * 180 / PI, cx, cy) });
        out += P.circle(cx - Math.sin(a) * r * 0.08, cy + Math.cos(a) * r * 0.08, r * 0.045 + 0.3, sd) + P.circle(cx + Math.sin(a) * r * 0.08, cy - Math.cos(a) * r * 0.08, r * 0.045 + 0.3, sd);
      }
      return out + P.circle(0, 0, r * 0.2, P.shade(f, 0.22));
    } },
    cucumber: { skin: '#3E6B2E', fill: function (q, r) {
      var out = P.circle(0, 0, r * 0.84, '#E0ECB0') + P.circle(0, 0, r * 0.56, 'none', '#CADB92', 0.6);
      for (var i = 0; i < 3; i++) {
        var a = i * 2 * PI / 3 + 0.4, cx = Math.cos(a) * r * 0.22, cy = Math.sin(a) * r * 0.22, deg = a * 180 / PI;
        out += P.ellipse(cx, cy, r * 0.25, r * 0.15, '#CFE196', null, 0, { transform: rot(deg, cx, cy) }) + seedAt(cx + Math.cos(a) * r * 0.07, cy + Math.sin(a) * r * 0.07, deg, r * 0.09, r * 0.05, '#F6F8E4', '#BFD388');
      }
      return out;
    } },
    zucchini: { skin: '#2E5A26', fill: function (q, r) {
      var out = P.circle(0, 0, r * 0.86, '#ECEFC4') + P.circle(0, 0, r * 0.5, '#E2E8B4');
      for (var i = 0; i < 9; i++) { var a = i / 9 * 2 * PI + q() * 0.3, x = Math.cos(a) * r * 0.36, y = Math.sin(a) * r * 0.36; out += seedAt(x, y, a * 180 / PI, r * 0.08, r * 0.045, '#F8F8E8', '#C9D498'); }
      return out;
    } },
    radish: { skin: '#C8304A', fill: function (q, r) {
      var out = P.circle(0, 0, r * 0.87, '#FBF1F2');
      for (var i = 0; i < 8; i++) { var a = i / 8 * 2 * PI; out += P.line(Math.cos(a) * r * 0.18, Math.sin(a) * r * 0.18, Math.cos(a) * r * 0.76, Math.sin(a) * r * 0.76, '#F2CFD8', 0.5); }
      return out + P.circle(0, 0, r * 0.6, 'none', '#F2D6DE', 0.5);
    } },
    beetroot: { skin: '#5E1A30', fill: function () {
      var r = arguments[1];
      return P.circle(0, 0, r * 0.92, '#8E2A4A') + [0.3, 0.55, 0.78].map(function (k) { return P.circle(0, 0, r * k, 'none', '#B5527A', 0.8, { opacity: '0.85' }); }).join('') + P.circle(0, 0, r * 0.1, '#B5527A');
    } },
    carrot: { skin: '#D9731E', fill: function (q, r) { return P.circle(0, 0, r * 0.9, '#EE8A2E') + P.circle(0, 0, r * 0.46, '#F4A456', '#E59440', 0.5) + P.circle(0, 0, r * 0.12, '#F6B46E'); } },
    jalapeno: { skin: '#3F7A2A', fill: function (q, r) {
      var out = P.circle(0, 0, r * 0.7, '#CFE2A0') + P.circle(0, 0, r * 0.55, '#EAF1D4');
      for (var i = 0; i < 4; i++) { var a = i / 4 * 2 * PI + q(); out += seedAt(Math.cos(a) * r * 0.28, Math.sin(a) * r * 0.28, a * 57.3, r * 0.13, r * 0.09, '#F6EFCF', '#D9CC9A'); }
      return out;
    } },
    gherkin: { skin: '#6E7E2E', crinkle: true, fill: function (q, r) {
      var out = P.path(crinkleD(r * 0.82), '#C9CC72', null, 0) + P.circle(0, 0, r * 0.5, 'none', '#B9BC5E', 0.5);
      for (var i = 0; i < 5; i++) { var a = i / 5 * 2 * PI + q() * 0.4; out += seedAt(Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.32, a * 57.3, r * 0.1, r * 0.06, '#ECE9B8', '#B9B562'); }
      return out;
    } },
    eggplant: { skin: '#3A1E3A', fill: function (q, r) {
      return P.circle(0, 0, r * 0.9, '#E6D09A') + P.circle(0, 0, r * 0.6, '#EEDCAA') + P.scatter(q, 14, r * 0.55, r * 0.55, function (x, y) { return P.ellipse(x, y, 0.9, 0.6, '#B99A5A'); });
    } }
  };
  // one round slice from above (kind: tomato, cucumber, zucchini, radish, beetroot, carrot, jalapeno, gherkin, eggplant).
  // o: skin, flesh, gel, seed, loc, wob for other colours and shapes; grill for grill marks; sh false for no shadow
  function sliceAt(kind, q, x, y, r, a, o) {
    o = o || {};
    var k = SLICE[kind] || SLICE.cucumber, skin = o.skin || k.skin, tf = P.at(x, y, a || 0);
    var d = k.crinkle ? crinkleD(r) : P.blob(q, r, r * (o.oval || 0.97), o.wob || 0.025, 12);
    var b = P.path(d, skin, ed(skin), 0.8) + k.fill(q, r, o);
    if (o.grill) b += P.grill(r * 0.8, r * 0.8, 35, r * 0.6, o.grillCol || '#4A3A22', Math.max(1.2, r * 0.13));
    b += P.hl(-r * 0.3, -r * 0.38, r * 0.32, r * 0.12, '#FFFFFF', 0.28, -30);
    return (o.sh === false ? '' : sh(d, tf, 1, 1.3)) + P.g(tf, b);
  }
  // slices shingled in a row, each over the one before (arc bows the row)
  function slices(kind, count, r, o) {
    o = o || {};
    return function (P, rnd) {
      var out = '', gap = r * (o.gap || 1.15);
      for (var i = 0; i < count; i++) { var c = i - (count - 1) / 2; out += sliceAt(kind, rnd, c * gap, (o.arc || 0) * c * c + Math.sin(i * 2.3) * r * 0.08, r * (0.95 + rnd() * 0.08), rnd() * 360, o); }
      return out;
    };
  }
  // slices in a loose heap
  function slicePile(kind, count, rx, ry, r, o) {
    return function (P, rnd) { return heap(rnd, count, rx, ry, function (x, y, i, q) { return sliceAt(kind, q, x, y, r * (0.9 + q() * 0.15), q() * 360, o); }); };
  }

  /* ---------- strands, ribbons and shreds ---------- */
  function strandD(x, y, len, ang, bend, bend2) {
    var a = ang * PI / 180, c = Math.cos(a), s = Math.sin(a), hx = c * len / 2, hy = s * len / 2;
    if (bend2 !== undefined) return 'M' + n(x - hx) + ' ' + n(y - hy) + ' C' + n(x - hx / 3 - s * bend) + ' ' + n(y - hy / 3 + c * bend) + ' ' + n(x + hx / 3 - s * bend2) + ' ' + n(y + hy / 3 + c * bend2) + ' ' + n(x + hx) + ' ' + n(y + hy);
    return 'M' + n(x - hx) + ' ' + n(y - hy) + ' Q' + n(x - s * bend) + ' ' + n(y + c * bend) + ' ' + n(x + hx) + ' ' + n(y + hy);
  }
  function strand(d, col, w, edgeW) { return (edgeW === 0 ? '' : P.path(d, 'none', ed(col, -0.3), w + (edgeW || 0.9), { 'stroke-linecap': 'round' })) + P.path(d, 'none', col, w, { 'stroke-linecap': 'round' }); }
  // a heap of strands (cols picked at random: repeat a colour to make it common); curl gives S bends
  function strands(q, count, rx, ry, cols, len, w, bend, o) {
    o = o || {};
    return P.pile(q, count, rx, ry, function (x, y, i, qq) {
      var b1 = (qq() - 0.5) * 2 * bend, d = strandD(x, y, len * (0.7 + qq() * 0.6), qq() * 180, b1, o.curl ? -b1 * (0.5 + qq()) : undefined);
      return strand(d, pick(qq, cols), w * (0.8 + qq() * 0.4), o.edgeW);
    });
  }
  // shredded veg on a little bed (slaw, red cabbage, sauerkraut)
  function slaw(o) {
    o = o || {};
    return function (P, rnd) {
      var rx = o.rx || 28, ry = o.ry || 21, base = o.base || '#EEEAD2', d = P.blob(rnd, rx * 0.8, ry * 0.8, 0.1, 12);
      var out = P.shadow(d) + P.path(d, base, ed(base, -0.18), 0.8);
      out += strands(rnd, o.count || 80, rx * 1.15, ry * 1.15, o.cols || ['#EEF2D8', '#DCE8B4', '#F6F6EC', '#C9DB98', '#EEF2D8', '#7A2E6A', '#EE8A2E', '#E8EED0'], o.len || 15, o.w || 1.7, 4);
      if (o.dots) out += sprinkle(rnd, o.dots.n, rx * 0.8, ry * 0.8, o.dots.c, o.dots.r);
      return out;
    };
  }
  // a ribbon along x that twists (zucchini ribbons, seaweed)
  function ribbon(len, w, amp, k, ph) {
    var top = [], bot = [], m = Math.max(8, Math.round(k * 4));
    for (var i = 0; i <= m; i++) { var t = i / m, x = -len / 2 + t * len, y = Math.sin(t * k * 2 * PI + ph) * amp, tw = w / 2 * (0.6 + 0.4 * Math.abs(Math.cos(t * k * 2 * PI + ph))); top.push([x, y - tw]); bot.push([x, y + tw]); }
    return { top: top, bot: bot, d: P.smooth(top.concat(bot.slice().reverse())) };
  }

  /* ---------- pods, spears, strips ---------- */
  function podD(len, wid, bend, bumps, amp, flat) {
    var k = 18, top = [], bot = [];
    for (var i = 0; i <= k; i++) {
      var t = i / k, x = -len / 2 + t * len, yc = -bend * (1 - Math.pow(2 * t - 1, 2)), hw = wid / 2 * Math.pow(Math.sin(PI * t), 0.4);
      var b = bumps ? 1 + amp * (Math.abs(Math.sin(PI * t * bumps)) - 0.5) : 1;
      top.push([x, yc - hw * b]); if (i > 0 && i < k) bot.push([x, yc + hw * (flat ? 1 : b)]);
    }
    return P.smooth(top.concat(bot.reverse()));
  }
  // a pod or bean along x (o: len, wid, col, bend, bumps, amp, flat, peas: faint peas inside, seam, cap: the stem end)
  function podAt(q, x, y, a, o) {
    var d = podD(o.len, o.wid, o.bend || 0, o.bumps, o.amp || 0, o.flat), tf = P.at(x, y, a), col = o.col, bend = o.bend || 0, b = P.path(d, col, ed(col), 0.7);
    var yc = function (t) { return -bend * (1 - Math.pow(2 * t - 1, 2)); };
    if (o.peas) for (var i = 0; i < o.peas; i++) { var t = (i + 0.8) / (o.peas + 0.6); b += P.ellipse(-o.len / 2 + t * o.len, yc(t), o.wid * 0.22, o.wid * 0.2, P.shade(col, 0.2), null, 0, { opacity: '0.85' }); }
    if (o.seam) { var pts = []; for (var j = 2; j <= 16; j++) { var tt = j / 18; pts.push([-o.len / 2 + tt * o.len, yc(tt) - o.wid / 2 * Math.pow(Math.sin(PI * tt), 0.4) * 0.72]); } b += P.path(P.smooth(pts, true), 'none', ed(col, -0.15), 0.6); }
    b += P.hl(0, yc(0.5) - o.wid * 0.15, o.len * 0.26, o.wid * 0.1, '#FFFFFF', 0.32);
    if (o.cap) b += P.path('M' + n(-o.len / 2 + 1) + ' ' + n(-o.wid * 0.25) + ' L' + n(-o.len / 2 + 4.5) + ' 0 L' + n(-o.len / 2 + 1) + ' ' + n(o.wid * 0.25) + ' M' + n(-o.len / 2 + 0.5) + ' 0 L' + n(-o.len / 2 - 3) + ' ' + n(-0.6), 'none', o.cap, 1, { 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    return sh(d, tf, 1, 1.4) + P.g(tf, b);
  }
  // a strip with blunt ends (capsicum, pickled veg, batons)
  function stripD(len, w, bend) {
    var top = [], bot = [];
    for (var i = 0; i <= 6; i++) { var t = i / 6, x = -len / 2 + t * len, y = -bend * (1 - Math.pow(2 * t - 1, 2)); top.push([x, y - w / 2]); bot.push([x, y + w / 2]); }
    top.unshift([-len / 2 - w * 0.15, top[0][1] + w / 2]); bot.push([len / 2 + w * 0.15, bot[6][1] - w / 2]);
    return P.smooth(top.concat(bot.reverse()));
  }
  function stripAt(q, x, y, a, len, w, col, o) {
    o = o || {};
    var bend = o.bend === undefined ? w * 0.9 : o.bend, d = stripD(len, w, bend), tf = P.at(x, y, a);
    var b = P.path(d, col, ed(col), 0.7) + P.path('M' + n(-len * 0.38) + ' ' + n(-bend * 0.6 - w * 0.12) + ' Q0 ' + n(-bend * 1.6 - w * 0.12) + ' ' + n(len * 0.38) + ' ' + n(-bend * 0.6 - w * 0.12), 'none', o.hi || P.shade(col, 0.35), Math.max(0.6, w * 0.18), { opacity: '0.7', 'stroke-linecap': 'round' });
    if (o.core) b += P.path('M' + n(-len * 0.44) + ' ' + n(-bend * 0.5) + ' Q0 ' + n(-bend * 1.5) + ' ' + n(len * 0.44) + ' ' + n(-bend * 0.5), 'none', o.core, w * 0.3, { 'stroke-linecap': 'round' });
    return (o.sh === false ? '' : sh(d, tf, 1, 1.3)) + P.g(tf, b);
  }

  /* ---------- florets, cubes, chunks ---------- */
  // a bumpy cluster of circles with one outline round it (florets, battered bites)
  function cloud(q, r, k, col, edgeCol, sw) {
    var cs = [[0, 0, r * 0.62]];
    for (var i = 0; i < k; i++) { var a = i / k * 2 * PI + q() * 0.5, dd = r * (0.5 + q() * 0.12); cs.push([Math.cos(a) * dd, Math.sin(a) * dd, r * (0.38 + q() * 0.14)]); }
    return cs.map(function (c) { return P.circle(c[0], c[1], c[2] + sw, edgeCol); }).join('') + cs.map(function (c) { return P.circle(c[0], c[1], c[2], col); }).join('');
  }
  var FLO = {
    broc: { col: '#3F7A2E', edge: '#24501A', bud: '#5E9A3A', bud2: '#2E6A24', stem: '#9CC067' },
    cauli: { col: '#F2EAD2', edge: '#BFAE88', bud: '#FFFDF4', bud2: '#E2D6B6', stem: '#E4EBC8' },
    roast: { col: '#EBD5A0', edge: '#9A6430', bud: '#C98E44', bud2: '#F6E8C4', stem: '#E2D6A6' }
  };
  // a broccoli or cauliflower floret from above: the crown, its stalk poking out to one side
  function floretAt(q, x, y, r, a, kind) {
    var o = FLO[kind] || FLO.broc, tf = P.at(x, y, a), out = '';
    out += P.path('M' + n(r * 0.2) + ' ' + n(-r * 0.32) + ' L' + n(r * 1.3) + ' ' + n(-r * 0.2) + ' Q' + n(r * 1.42) + ' 0 ' + n(r * 1.3) + ' ' + n(r * 0.2) + ' L' + n(r * 0.2) + ' ' + n(r * 0.32) + ' Z', o.stem, ed(o.stem, -0.25), 0.8);
    out += cloud(q, r, 7, o.col, o.edge, 0.9);
    out += P.scatter(q, Math.round(r * 1.1), r * 0.72, r * 0.68, function (bx, by, i, qq) { return P.circle(bx, by, r * (0.09 + qq() * 0.06), i % 2 ? o.bud : o.bud2); });
    if (kind === 'roast') out += P.scatter(q, 4, r * 0.75, r * 0.7, function (bx, by, i, qq) { return P.path(P.blob(qq, r * (0.14 + qq() * 0.12), r * 0.12, 0.3, 6, bx, by), '#7A4A1E', null, 0, { opacity: '0.6' }); });
    out += P.hl(-r * 0.3, -r * 0.35, r * 0.32, r * 0.14, '#FFFFFF', 0.22, -30);
    return P.circle(x + 1.6, y + 2, r * 1.02, '#000000', null, 0, { opacity: '0.12' }) + P.g(tf, out);
  }
  // a diced cube from above: the top face over a darker side (o.skin: a strip of skin on one edge)
  function cubeAt(x, y, s, col, a, o) {
    o = o || {};
    var h = s / 2, rr = s * (o.round || 0.22);
    return P.g(P.at(x, y, a || 0), P.rect(-h + s * 0.12, -h + s * 0.16, s, s, rr, '#000000', null, 0, { opacity: '0.14' }) + P.rect(-h, -h, s, s, rr, col, ed(col, -0.3), o.sw || 0.6) + (o.skin ? P.rect(-h + 0.4, -h + 0.4, s - 0.8, s * 0.24, rr * 0.6, o.skin) : '') + P.rect(-h + s * 0.16, -h + s * (o.skin ? 0.34 : 0.16), s * 0.34, s * 0.16, s * 0.08, '#FFFFFF', null, 0, { opacity: '0.3' }));
  }
  function arcD(R, a) { var r = a * PI / 180; return 'M' + n(Math.cos(-r) * R) + ' ' + n(Math.sin(-r) * R) + ' A' + n(R) + ' ' + n(R) + ' 0 0 1 ' + n(Math.cos(r) * R) + ' ' + n(Math.sin(r) * R); }
  function wedgeD(R, a) { return arcD(R, a).replace(/^M/, 'M0 0 L') + ' Z'; }
  // a chunk of tomato (a wedge with skin on the round side)
  function tomChunk(q, x, y, s) {
    var R = 13 * (s || 1), tf = P.at(x, y, q() * 360) + ' ' + tr(-R * 0.55, 0), d = wedgeD(R, 34);
    var b = P.path(d, '#E5574A', '#A8301F', 0.7) + P.path(arcD(R - 0.9, 32), 'none', '#C9302A', 1.8) + P.path(wedgeD(R * 0.6, 22), '#F29A72', null, 0, { transform: tr(R * 0.14, 0) }) + P.circle(R * 0.42, -R * 0.07, 0.9, '#F6DC8E') + P.circle(R * 0.55, R * 0.1, 0.9, '#F6DC8E');
    return sh(d, tf, 1, 1.3) + P.g(tf, b);
  }
  // a thick half moon of cucumber
  function cucChunk(q, x, y, s) {
    var r = 8 * (s || 1), tf = P.at(x, y, q() * 360), arc = 'M' + n(-r) + ' 0 A' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(r) + ' 0', d = arc + ' Z';
    var b = P.path(d, '#E0ECB0', '#6E8A3E', 0.6) + P.path(arc, 'none', '#3E6B2E', 1.8) + P.ellipse(0, -r * 0.22, r * 0.46, r * 0.2, '#CFE196') + seedAt(-r * 0.2, -r * 0.22, 0, r * 0.1, r * 0.06, '#F6F8E4', '#BFD388') + seedAt(r * 0.2, -r * 0.22, 0, r * 0.1, r * 0.06, '#F6F8E4', '#BFD388');
    return sh(d, tf, 1, 1.3) + P.g(tf, b);
  }
  function oliveAt(q, x, y, col, s) {
    s = s || 1; col = col || '#4A2A3A';
    var tf = P.at(x, y, q() * 360), d = P.smooth([[-8.5 * s, 0], [-6 * s, -5.2 * s], [3 * s, -5.6 * s], [8.5 * s, -1.5 * s], [8.5 * s, 1.5 * s], [3 * s, 5.6 * s], [-6 * s, 5.2 * s]]);
    return sh(d, tf, 1, 1.3) + P.g(tf, P.path(d, col, ed(col, -0.35), 0.7) + P.circle(6.8 * s, 0, 0.9 * s, ed(col, -0.3)) + P.hl(-1.5 * s, -2.4 * s, 3.4 * s, 1.2 * s, '#FFFFFF', 0.45));
  }
  // a raw onion ring: pale flesh with the purple skin line outside
  function onionRing(x, y, r, col, pale) {
    col = col || '#8E3A7A'; pale = pale || '#F0E2EE';
    return P.circle(x + 1, y + 1.4, r, 'none', '#000000', 2.6, { opacity: '0.1' }) + P.circle(x, y, r, 'none', pale, 2.6) + P.circle(x, y, r + 1.3, 'none', col, 0.9) + P.circle(x, y, r - 1.3, 'none', P.mix(col, pale, 0.55), 0.5);
  }
  // a sliver of sliced onion: an arc with the skin colour at its edges
  function sliverAt(x, y, r, a0, span, col, pale, w) {
    var a1 = a0 * PI / 180, a2 = (a0 + span) * PI / 180;
    var d = 'M' + n(x + Math.cos(a1) * r) + ' ' + n(y + Math.sin(a1) * r) + ' A' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(x + Math.cos(a2) * r) + ' ' + n(y + Math.sin(a2) * r);
    return P.path(d, 'none', '#000000', w + 0.6, { opacity: '0.1', transform: tr(0.8, 1.2), 'stroke-linecap': 'round' }) + P.path(d, 'none', col, w + 1.3, { 'stroke-linecap': 'round' }) + P.path(d, 'none', pale, w, { 'stroke-linecap': 'round' });
  }
  function slivers(q, count, rx, ry, col, pale, w) { return heap(q, count, rx, ry, function (x, y, i, qq) { return sliverAt(x, y, 5 + qq() * 6, qq() * 360, 60 + qq() * 80, col, pale, w || 1.6); }); }
  function cherryAt(q, x, y, r, calyx) {
    var d = circD(r, x, y), b = P.shadow(d) + P.path(d, '#D9473B', '#9E2B20', 0.8) + P.hl(x - r * 0.32, y - r * 0.38, r * 0.3, r * 0.18, '#FFFFFF', 0.5, -30);
    if (calyx) { var a0 = q() * 72; for (var i = 0; i < 5; i++) { var a = (a0 + i * 72) * PI / 180; b += P.leaf(r * 0.75, r * 0.24, '#4F7F2F', x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, a0 + i * 72, { vein: false }); } b += P.circle(x, y, r * 0.14, '#5E8C3A', '#3F6A26', 0.4); }
    else b += P.circle(x + r * 0.1, y + r * 0.05, r * 0.1, '#B5342A');
    return b;
  }
  // a cherry tomato cut in half, cut side up
  function cherryHalf(q, x, y, r, a) {
    var tf = P.at(x, y, a), d = P.blob(q, r, r * 0.94, 0.03, 10);
    var b = P.path(d, '#D9473B', '#9E2B20', 0.8) + P.circle(0, 0, r * 0.84, '#E5574A');
    [-1, 1].forEach(function (k) { b += P.ellipse(k * r * 0.4, 0, r * 0.27, r * 0.44, '#F29A72') + P.circle(k * r * 0.4, -r * 0.15, r * 0.07 + 0.2, '#F6DC8E') + P.circle(k * r * 0.42, r * 0.16, r * 0.07 + 0.2, '#F6DC8E'); });
    b += P.ellipse(0, 0, r * 0.12, r * 0.5, '#EC7A6A') + P.hl(-r * 0.35, -r * 0.5, r * 0.3, r * 0.1, '#FFFFFF', 0.35, -30);
    return sh(d, tf, 1, 1.3) + P.g(tf, b);
  }
  function chickpeaAt(q, x, y, r) {
    return P.circle(x + 0.6, y + 0.8, r, '#000000', null, 0, { opacity: '0.12' }) + P.path(P.blob(q, r, r * 0.92, 0.08, 7, x, y), '#E2C48A', '#B08A52', 0.6) + P.path('M' + n(x - r * 0.2) + ' ' + n(y - r * 0.9) + ' q' + n(r * 0.5) + ' ' + n(r * 0.4) + ' ' + n(r * 0.1) + ' ' + n(r * 0.9), 'none', '#C9A066', 0.5) + P.circle(x - r * 0.35, y - r * 0.3, r * 0.25, '#F2DEB0', null, 0, { opacity: '0.8' });
  }
  function peaAt(x, y, r, col) { col = col || '#7EA453'; return P.circle(x + 0.5, y + 0.7, r, '#000000', null, 0, { opacity: '0.12' }) + P.circle(x, y, r, col, ed(col), 0.5) + P.circle(x - r * 0.35, y - r * 0.35, r * 0.3, P.shade(col, 0.45)); }
  function kernelAt(x, y, a, s, col) { col = col || '#F2C94C'; return P.g(P.at(x, y, a), P.rect(-2 * s, -2.2 * s, 4 * s, 4.4 * s, 1.4 * s, col, ed(col, -0.25), 0.5) + P.rect(-1.2 * s, -1.6 * s, 1.4 * s, 1.6 * s, 0.6 * s, '#FFFFFF', null, 0, { opacity: '0.4' })); }
  function mound(q, rx, ry, col, wob) { var d = P.blob(q, rx, ry, wob || 0.1, 12); return P.shadow(d) + P.path(d, col, ed(col), 1) + P.path(P.blob(q, rx * 0.72, ry * 0.66, 0.14, 10, -rx * 0.08, -ry * 0.12), P.shade(col, 0.12), null, 0, { opacity: '0.9' }); }
  function herbBits(q, count, rx, ry, cols) { return P.scatter(q, count, rx, ry, function (x, y, i, qq) { return P.leaf(3 + qq() * 2, 2 + qq(), pick(qq, cols || ['#4F8F2F', '#3F7A2A']), x, y, qq() * 360, { vein: false }); }); }

  /* ---------- the vegetables ---------- */
  function iceberg(P, rnd) {
    var l = 70, w = 60, d = ruffleD(rnd, l, w, 0.04, 26), out = P.shadow(d) + P.path(d, '#CFE29A', '#94B062', 1);
    out += P.path(ruffleD(rnd, l * 0.78, w * 0.74, 0.03, 20), '#BDD587', null, 0, { transform: tr(-2, 2), opacity: '0.7' }) + P.path(ruffleD(rnd, l * 0.6, w * 0.55, 0.03, 18), '#E6F0C6', null, 0, { transform: tr(-6, -1) });
    for (var i = -3; i <= 3; i++) { var a = i * 0.36; out += P.path('M-34 0 Q' + n(-10 + Math.cos(a) * 6) + ' ' + n(Math.sin(a) * 10) + ' ' + n(-34 + Math.cos(a) * 58) + ' ' + n(Math.sin(a) * 26), 'none', '#F2F7E2', i ? 0.8 : 2.4, { 'stroke-linecap': 'round', opacity: '0.9' }); }
    return out + P.hl(-6, -16, 16, 4, '#FFFFFF', 0.3, -10);
  }
  function cupAt(q, x, y, r, a) {
    var d = ruffleD(q, r * 2.1, r * 1.85, 0.05, 24), tf = P.at(x, y, a);
    var b = P.path(d, '#9CC463', '#6E9A3E', 0.9) + P.path(P.blob(q, r * 0.78, r * 0.66, 0.06, 10, r * 0.1, 0), '#BCD884', '#A2C26A', 0.6) + P.path(P.blob(q, r * 0.48, r * 0.4, 0.08, 9, r * 0.2, r * 0.04), '#D2E59E', null, 0);
    for (var i = -2; i <= 2; i++) b += P.path('M' + n(-r) + ' 0 Q' + n(-r * 0.2) + ' ' + n(i * r * 0.12) + ' ' + n(r * 0.75) + ' ' + n(i * r * 0.38), 'none', '#E6F0C8', i ? 0.6 : 1.4, { 'stroke-linecap': 'round', opacity: '0.85' });
    return sh(d, tf) + P.g(tf, b + P.hl(-r * 0.2, -r * 0.5, r * 0.4, r * 0.1, '#FFFFFF', 0.35, -10));
  }
  function pakChoyHalf(q, x, y, a) {
    var tf = P.at(x, y, a), stalk = P.smooth([[-42, 0], [-37, -5], [-14, -13], [6, -14], [12, 0], [6, 14], [-14, 13], [-37, 5]]);
    var leaf = ruffleD(q, 52, 34, 0.07, 22), b = P.path(stalk, '#E6EFC8', '#A8BE7A', 0.9);
    b += P.path(P.smooth([[-40, 0], [-34, -3], [-14, -8], [2, -9], [6, 0], [2, 9], [-14, 8], [-34, 3]]), '#F2F6E2', '#C9D8A0', 0.6) + P.ellipse(-40, 0, 2, 4.5, '#D6E2B0', '#A8BE7A', 0.5);
    b += P.g(tr(16, 0), P.path(leaf, '#3F7A2E', '#2A5A1E', 0.9) + P.path(ruffleD(q, 34, 20, 0.05), '#5E9A3A', null, 0, { transform: tr(4, 0), opacity: '0.7' }));
    b += P.path('M-8 -6 Q12 -9 34 -11 M-8 0 L38 0 M-8 6 Q12 9 34 11', 'none', '#E2EDC4', 1.6, { 'stroke-linecap': 'round' }) + P.hl(14, -8, 14, 2.4, '#FFFFFF', 0.3, -5);
    return sh(P.smooth([[-42, 0], [-30, -10], [0, -16], [30, -18], [42, 0], [30, 18], [0, 16], [-30, 10]]), tf) + P.g(tf, b);
  }
  function babyCarrot(q, x, y, a) {
    var tf = P.at(x, y, a), d = P.smooth([[-24, -3.5], [-21, -5.6], [-6, -5], [14, -3.4], [32, -1.4], [37, 0], [32, 1.4], [14, 3.4], [-6, 5], [-21, 5.6], [-24, 3.5], [-25, 0]]), b = '';
    [-0.42, -0.14, 0.14, 0.4].forEach(function (k, i) { var len = 13 + (i % 2) * 5, lx = -24 - Math.cos(k) * len, ly = Math.sin(k) * len; b += P.path('M-23 ' + n(k * 4) + ' Q-30 ' + n(ly * 0.4) + ' ' + n(lx) + ' ' + n(ly), 'none', '#4F8A2F', 1.4, { 'stroke-linecap': 'round' }) + P.leaf(6, 3.4, '#5E9A3A', lx - 1.5, ly + k * 2, 180 + k * 57, { vein: false }); });
    b += P.path(d, '#EE8A2E', '#B9601A', 0.9);
    for (var xx = -16; xx < 30; xx += 6 + q() * 3) { var hw = 5.4 - (xx + 21) * 0.075; b += P.path('M' + n(xx) + ' ' + n(-hw * 0.75) + ' q1.2 ' + n(hw * 0.5) + ' 0.4 ' + n(hw * 0.7), 'none', '#C9701E', 0.6); }
    return sh(d, tf) + P.g(tf, b + P.hl(-2, -2.4, 16, 1.2, '#FFFFFF', 0.45) + P.ellipse(-23.6, 0, 1.4, 3.6, '#B9A040'));
  }
  function batonAt(q, x, y, a) { return stripAt(q, x, y, a, 40, 7, '#EE8A2E', { bend: 0.6, core: '#F4A456', hi: '#F8C08A' }); }
  function beetWedge(q, x, y, a) {
    var tf = P.at(x, y, a) + ' ' + tr(-13, 0), d = wedgeD(22, 24), b = P.path(d, '#8E2A4A', '#4E1428', 0.9);
    [8, 13.5, 18].forEach(function (rr) { b += P.path(arcD(rr, 22), 'none', '#B5527A', 0.9); });
    return sh(d, tf) + P.g(tf, b + P.path(arcD(21.2, 23), 'none', '#4A1226', 2) + P.hl(10, -2, 6, 1.4, '#FFFFFF', 0.3));
  }
  function babyBeet(q, x, y, r, cut) {
    if (cut) return sliceAt('beetroot', q, x, y, r, q() * 360, { skin: '#4E1428' });
    var d = circD(r, x, y), b = P.shadow(d);
    b += P.path('M' + n(x) + ' ' + n(y + r * 0.9) + ' Q' + n(x + 2) + ' ' + n(y + r * 1.4) + ' ' + n(x + 1) + ' ' + n(y + r * 1.8), 'none', '#7A2A42', 0.8, { 'stroke-linecap': 'round' });
    b += P.path(d, '#5E1A34', '#3A0E20', 0.9) + P.circle(x - r * 0.15, y - r * 0.1, r * 0.75, '#6E2240', null, 0, { opacity: '0.8' }) + P.hl(x - r * 0.35, y - r * 0.4, r * 0.32, r * 0.16, '#FFFFFF', 0.35, -30);
    [-0.5, 0, 0.5].forEach(function (k, i) { b += P.path('M' + n(x + k * 1.5) + ' ' + n(y - r * 0.7) + ' L' + n(x + k * 6) + ' ' + n(y - r * 1.25), 'none', i === 1 ? '#5E8C3A' : '#9E2E56', 1.6, { 'stroke-linecap': 'round' }); });
    return b;
  }
  function pumpkinWedge(q, x, y, a) {
    var R = 40, r = 23, h = 48 * PI / 180, p = function (t, rr) { return n(Math.sin(t) * rr) + ' ' + n(-Math.cos(t) * rr); };
    var d = 'M' + p(-h, R) + ' A' + R + ' ' + R + ' 0 0 1 ' + p(h, R) + ' L' + p(h, r) + ' A' + r + ' ' + r + ' 0 0 0 ' + p(-h, r) + ' Z', tf = P.at(x, y, a) + ' ' + tr(0, 30);
    var b = P.path(d, '#E8A33A', '#B9741E', 0.9) + P.path('M' + p(-h * 0.97, R - 1.6) + ' A' + (R - 1.6) + ' ' + (R - 1.6) + ' 0 0 1 ' + p(h * 0.97, R - 1.6), 'none', '#5E6E4A', 3.2) + P.path('M' + p(-h * 0.92, R - 4) + ' A' + (R - 4) + ' ' + (R - 4) + ' 0 0 1 ' + p(h * 0.92, R - 4), 'none', '#F2C25A', 1, { opacity: '0.7' });
    b += P.path('M' + p(-h * 0.95, r + 1) + ' A' + (r + 1) + ' ' + (r + 1) + ' 0 0 1 ' + p(h * 0.95, r + 1), 'none', '#B9681A', 2.2, { opacity: '0.65' });
    b += P.scatter(q, 4, 14, 3, function (sx, sy, i, qq) { return P.path(P.blob(qq, 2.5 + qq() * 2, 1.4, 0.3, 6, sx, sy - 31), '#A8581A', null, 0, { opacity: '0.6' }); });
    return sh(d, tf) + P.g(tf, b);
  }
  function radishHalf(q, x, y, r, a) {
    var tf = P.at(x, y, a), d = P.smooth([[-r, 0], [-r * 0.8, -r * 0.8], [0, -r * 0.95], [r * 0.85, -r * 0.6], [r * 1.25, 0], [r * 0.85, r * 0.6], [0, r * 0.95], [-r * 0.8, r * 0.8]]);
    var b = P.path('M' + n(-r * 0.85) + ' -1.2 L' + n(-r * 1.3) + ' -1.6 M' + n(-r * 0.85) + ' 1.2 L' + n(-r * 1.3) + ' 1.8', 'none', '#6E9A3E', 1.8, { 'stroke-linecap': 'round' });
    b += P.path(d, '#C8304A', '#8E1E30', 0.8) + P.path(P.smooth([[-r * 0.86, 0], [-r * 0.7, -r * 0.68], [0, -r * 0.8], [r * 0.72, -r * 0.5], [r * 1.05, 0], [r * 0.72, r * 0.5], [0, r * 0.8], [-r * 0.7, r * 0.68]]), '#FBF1F2', null, 0);
    for (var i = -2; i <= 2; i++) b += P.path('M' + n(-r * 0.6) + ' 0 Q0 ' + n(i * r * 0.18) + ' ' + n(r * 0.8) + ' ' + n(i * r * 0.12), 'none', '#F2CFD8', 0.5);
    return sh(d, tf) + P.g(tf, b + P.path('M' + n(r * 1.2) + ' 0 q2 0.6 3.6 -0.4', 'none', '#D88A9A', 0.6) + P.hl(-r * 0.3, -r * 0.4, r * 0.3, r * 0.1, '#FFFFFF', 0.4, -20));
  }
  function cauliHalf(q, x, y, a, s) {
    var tf = P.at(x, y, a, s), d = P.smooth([[-14, -1], [-13, -9], [-6, -14], [3, -14.5], [11, -11], [14.5, -3], [9, 2], [4, 3], [3.5, 11], [-3, 11], [-4, 3], [-9, 2]]), b = '';
    for (var i = 0; i <= 6; i++) { var t = (200 + i * 23) * PI / 180; b += P.circle(Math.cos(t) * 12.6, Math.sin(t) * 11 - 2.5, 3, '#D9B070', '#A8743A', 0.7); }
    b += P.path(d, '#EEDFB6', '#A8743A', 0.9) + P.path('M0 10 L0 -1 M0 3 Q-5 -2 -8 -8 M0 2 Q5 -3 8 -9 M0 -1 L1 -10', 'none', '#DCC690', 1.4, { 'stroke-linecap': 'round' });
    b += P.path(P.blob(q, 7, 4, 0.3, 7, -4, -6), '#C98E44', null, 0, { opacity: '0.75' }) + P.path(P.blob(q, 5, 3, 0.3, 7, 6, -3), '#B9782E', null, 0, { opacity: '0.7' }) + P.hl(-3, -9, 5, 1.4, '#FFFFFF', 0.35);
    return sh(d, tf) + P.g(tf, b);
  }
  // a battered cauliflower bite: a knobbly golden cluster with a little white floret showing through
  function biteAt(q, x, y, r) {
    var b = cloud(q, r, 6, '#E0AA58', '#A8742E', 0.9) + P.path(P.blob(q, r * 0.6, r * 0.5, 0.2, 8, -r * 0.1, -r * 0.12), '#ECC57E', null, 0, { opacity: '0.9' }) + P.path(P.blob(q, r * 0.24, r * 0.18, 0.3, 7, r * 0.35, r * 0.3), '#F4ECD4', '#D9C79A', 0.5);
    b += P.crumbs(q, Math.round(r * 1.2), r * 0.8, r * 0.7, ['#C38E3C', '#F2D08A', '#B9772E'], 0.8) + P.hl(-r * 0.3, -r * 0.4, r * 0.3, r * 0.12, '#FFFFFF', 0.3);
    return P.circle(x + 1.5, y + 2, r * 1.05, '#000000', null, 0, { opacity: '0.12' }) + P.g(P.at(x, y, q() * 360), b);
  }
  function sproutHalf(q, x, y, r, a) {
    var tf = P.at(x, y, a), d = P.blob(q, r, r * 0.92, 0.04, 10), b = P.path(d, '#5E8C3A', '#3A6226', 0.9) + P.path(P.blob(q, r * 0.82, r * 0.74, 0.04, 10), '#D6DE92', null, 0);
    [0.66, 0.46, 0.26].forEach(function (k) { var w = r * k, h = r * k * 1.15, y0 = r * 0.55; b += P.path('M' + n(-w) + ' ' + n(y0) + ' Q' + n(-w * 1.1) + ' ' + n(-h) + ' 0 ' + n(-h) + ' Q' + n(w * 1.1) + ' ' + n(-h) + ' ' + n(w) + ' ' + n(y0), 'none', '#9EB45A', 0.8); });
    b += P.rect(-r * 0.14, r * 0.4, r * 0.28, r * 0.42, 1, '#EEF0CE') + P.path(P.blob(q, r * 0.55, r * 0.4, 0.3, 8, r * 0.15, -r * 0.1), '#A8742E', null, 0, { opacity: '0.6' });
    return sh(d, tf) + P.g(tf, b + P.hl(-r * 0.4, -r * 0.5, r * 0.25, r * 0.1, '#FFFFFF', 0.3, -30));
  }
  function avoPts() { return [[-34, 0], [-31, -9], [-21, -14], [-6, -17], [10, -22], [26, -17], [33, 0], [26, 17], [10, 22], [-6, 17], [-21, 14], [-31, 9]]; }
  function scalePts(pts, s, cx, cy) { return pts.map(function (p) { return [cx + (p[0] - cx) * s, cy + (p[1] - cy) * s]; }); }
  function avocadoHalf(P) {
    var pts = avoPts(), d = P.smooth(pts), out = P.shadow(d) + P.path(d, '#3A4A1E', '#26320F', 1);
    out += P.path(P.smooth(scalePts(pts, 0.92, 2, 0)), '#8DB255', null, 0) + P.path(P.smooth(scalePts(pts, 0.82, 3, 0)), '#B9D26A', null, 0) + P.path(P.smooth(scalePts(pts, 0.68, 5, 0)), '#D9E68C', null, 0);
    out += P.circle(10, 0, 13.2, '#C9D67A') + P.circle(11, 1, 12, '#000000', null, 0, { opacity: '0.12' }) + P.circle(10, 0, 12, '#8A5A2E', '#5E3A1A', 0.9) + P.hl(6, -4, 4.5, 2.6, '#FFFFFF', 0.4, -30);
    return out + P.hl(-16, -6, 9, 2.2, '#FFFFFF', 0.3, -10);
  }
  // one avocado slice: a crescent with the dark skin on its round side, green under the skin, pale inside
  function avoSlice() {
    var d = 'M-3 -26 Q22 0 -3 26 Q2 0 -3 -26 Z';
    return P.path(d, '#000000', null, 0, { opacity: '0.12', transform: tr(1.2, 1.4) }) + P.path(d, '#D8E68C', '#7E9A3E', 0.6) + P.path('M-1.5 -23 Q17.6 0 -1.5 23', 'none', '#A6C85E', 3.2) + P.path('M-3 -26 Q22 0 -3 26', 'none', '#3A4A1E', 1.6) + P.hl(1, -6, 1.4, 8, '#FFFFFF', 0.3);
  }
  function eggplantHalf(P, rnd) {
    var pts = [[-50, 0], [-45, -9], [-28, -15], [0, -20], [30, -22], [46, -14], [50, 0], [46, 14], [30, 22], [0, 20], [-28, 15], [-45, 9]], d = P.smooth(pts);
    var out = P.shadow(d) + P.path(d, '#3A1E3A', '#24102A', 1) + P.path(P.smooth(scalePts(pts, 0.92, 4, 0)), '#C9A06A', null, 0) + P.path(P.smooth(scalePts(pts, 0.8, 6, 0)), '#DDB880', null, 0);
    out += P.grill(36, 15, 45, 8, '#A87A3E', 1) + P.grill(36, 15, -45, 8, '#A87A3E', 1);
    out += P.path(P.blob(rnd, 12, 6, 0.3, 8, 20, -6), '#B9853E', null, 0, { opacity: '0.5' }) + P.path(P.blob(rnd, 10, 5, 0.3, 8, -12, 8), '#B9853E', null, 0, { opacity: '0.45' });
    out += P.path('M-46 -6 L-56 -10 L-52 -2 L-60 0 L-52 2 L-56 10 L-46 6 Z', '#4F6E2E', '#2E4A1E', 0.8) + P.rect(-66, -2, 9, 4, 1.5, '#6E8A4A', '#4A6A2E', 0.6);
    return out + P.hl(10, -9, 18, 2.4, '#FFFFFF', 0.25, -5);
  }
  function cobAt(q, x, y, a, len, rad, o) {
    o = o || {};
    var tf = P.at(x, y, a), h = len / 2, d = 'M' + n(-h + rad) + ' ' + n(-rad) + ' H' + n(h - rad) + ' A' + n(rad) + ' ' + n(rad) + ' 0 0 1 ' + n(h - rad) + ' ' + n(rad) + ' H' + n(-h + rad) + ' A' + n(rad) + ' ' + n(rad) + ' 0 0 1 ' + n(-h + rad) + ' ' + n(-rad) + ' Z';
    var b = P.path(d, '#E8B83A', '#B9862A', 1), rows = 6, kw = 5.2;
    for (var j = 0; j < rows; j++) {
      var ph = (j + 0.5) / rows * PI - PI / 2, yy = Math.sin(ph) * rad * 0.94, kh = rad * PI / rows * Math.cos(ph) * 0.9;
      for (var xx = -h + 3; xx <= h - 3; xx += kw) {
        var lim = h - rad + Math.sqrt(Math.max(0, rad * rad - yy * yy)) * 0.86;
        if (Math.abs(xx) > lim - 2) continue;
        var c = q() < 0.16 ? (q() < 0.5 ? '#9A5A1E' : '#C98A2E') : '#F6D660';
        b += P.rect(xx - kw * 0.44, yy - kh / 2, kw * 0.88, kh * 0.9, Math.min(kw, kh) * 0.35, c, '#D9A632', 0.4);
      }
    }
    b += P.hl(0, -rad * 0.45, h * 0.7, rad * 0.12, '#FFFFFF', 0.35);
    if (o.butter) b += P.g(P.at(-6, -2, 18), P.rect(-6, -5, 12, 10, 2.5, '#F6DF8A', '#E0BE5A', 0.6) + P.path('M5 2 Q9 6 6 9', 'none', '#F6DF8A', 2.4, { 'stroke-linecap': 'round', opacity: '0.8' }) + P.hl(-2, -2, 3, 1.4, '#FFFFFF', 0.6));
    return sh(d, tf, 2, 2.5) + P.g(tf, b);
  }
  function cornRib(q, x, y, a) {
    var tf = P.at(x, y, a), len = 50, bend = 6, yc = function (t) { return -bend * (1 - Math.pow(2 * t - 1, 2)); }, top = [], bot = [];
    for (var i = 0; i <= 10; i++) { var t = i / 10, xx = -len / 2 + t * len; top.push([xx, yc(t) - 5.5]); bot.push([xx, yc(t) + 4.5]); }
    var d = P.smooth(top.concat(bot.reverse())), b = P.path(d, '#E9D9A6', '#B9A06A', 0.8);
    for (var k = 0; k < 10; k++) {
      var tt = (k + 0.5) / 10, kx = -len / 2 + tt * len, ang = Math.atan2(bend * 4 * (2 * tt - 1) / len * 2, 1) * 180 / PI;
      [-2.6, 1.4].forEach(function (off, j) { var c = q() < 0.2 ? '#A8661E' : q() < 0.3 ? '#D9A030' : '#F2C440'; b += P.g(P.at(kx + j * 1.6, yc(tt) + off, ang), P.rect(-2.2, -2, 4.4, 4, 1.3, c, '#C9922A', 0.4)); });
    }
    b += P.crumbs(q, 8, len * 0.4, 3, ['#C9402A', '#B5301F'], 0.6);
    return sh(d, tf) + P.g(tf, b);
  }
  function spearAt(q, x, y, a, len, w) {
    var tf = P.at(x, y, a), h = len / 2, r = w / 2;
    var d = 'M' + n(-h) + ' ' + n(-r) + ' L' + n(h - 10) + ' ' + n(-r * 0.95) + ' Q' + n(h - 2) + ' ' + n(-r * 1.1) + ' ' + n(h) + ' 0 Q' + n(h - 2) + ' ' + n(r * 1.1) + ' ' + n(h - 10) + ' ' + n(r * 0.95) + ' L' + n(-h) + ' ' + n(r) + ' Z';
    var b = P.path(d, '#6E9A3E', '#4A7426', 0.8) + P.rect(-h + 0.4, -r + 0.4, 9, w - 0.8, 1, '#C9D48A', null, 0, { opacity: '0.85' });
    b += P.path('M' + n(h - 12) + ' ' + n(-r) + ' Q' + n(h - 2) + ' ' + n(-r * 1.1) + ' ' + n(h) + ' 0 Q' + n(h - 2) + ' ' + n(r * 1.1) + ' ' + n(h - 12) + ' ' + n(r) + ' Z', '#5E7A40', null, 0);
    for (var i = 0; i < 4; i++) { var sx = h - 1.5 - i * 2.8; b += P.path('M' + n(sx - 2.6) + ' ' + n(-r * 0.85) + ' L' + n(sx) + ' 0 L' + n(sx - 2.6) + ' ' + n(r * 0.85), 'none', '#3F5A2A', 0.6, { 'stroke-linejoin': 'round' }); }
    for (var bx = -h + 18, s = 1; bx < h - 16; bx += 13, s = -s) b += P.path('M' + n(bx) + ' ' + n(s * r * 0.9) + ' l3.4 ' + n(-s * 0.9) + ' l-3.4 ' + n(-s * 0.5), 'none', '#4A6A2E', 0.6);
    for (var gx = -h + 15; gx < h - 12; gx += 15) b += P.line(gx, -r * 0.75, gx + 3, r * 0.75, '#3A4A22', 1.5, { opacity: '0.7' });
    return sh(d, tf) + P.g(tf, b + P.hl(0, -r * 0.42, h * 0.6, r * 0.18, '#FFFFFF', 0.3));
  }
  function sproutAt(q, x, y, s) {
    s = s || 1;
    var len = (20 + q() * 10) * s, ang = q() * 180, bend = (q() - 0.5) * 10 * s, a = ang * PI / 180, c = Math.cos(a), sn = Math.sin(a), hx = x + c * len / 2, hy = y + sn * len / 2;
    return strand(strandD(x, y, len, ang, bend), '#F4F1E0', 2 * s, 0.7) + P.ellipse(hx, hy, 2.1 * s, 1.4 * s, '#D6DC86', '#A8B05A', 0.5, { transform: rot(ang, hx, hy) }) + P.path('M' + n(x - c * len / 2) + ' ' + n(y - sn * len / 2) + ' l' + n(-c * 4 * s) + ' ' + n(-sn * 4 * s + 1), 'none', '#C9B48A', 0.5);
  }
  // an edamame pod: three plump beans showing through, a little salt
  function edamameAt(q, x, y, a) {
    var tf = P.at(x, y, a), d = podD(33, 9.5, 1.2, 3, 0.75, false), b = P.path(d, '#8DB255', '#557F2E', 0.8);
    [-10.5, 0, 10.5].forEach(function (bx) { b += P.ellipse(bx, -0.6, 4.4, 3.4, '#A9CC6A', '#7EA453', 0.5) + P.hl(bx - 1.4, -2, 1.6, 0.8, '#FFFFFF', 0.4); });
    b += P.line(-16, -0.4, -18.5, -1.4, '#6E8A3E', 1.2) + P.crumbs(q, 3, 12, 2.5, ['#FFFFFF'], 0.6);
    return sh(d, tf, 1, 1.4) + P.g(tf, b);
  }
  // a warrigal greens tip: a short stem with arrow shaped, fleshy leaves
  function warrigalSprig(q, x, y, a) {
    var tf = P.at(x, y, a), b = P.path('M-14 0 Q-2 1 12 -0.5', 'none', '#7EA453', 1.4, { 'stroke-linecap': 'round' });
    [[-8, -1, -60, 0.75], [-2, 1, 60, 0.8], [5, -1, -55, 0.7], [12, 0, 0, 0.9]].forEach(function (l) { var f = LEAF.warrigal(q, l[3]), t2 = P.at(l[0], l[1], l[2]) + ' ' + tr(f ? 7 * l[3] : 0, 0); b += sh(f.d, t2, 0.6, 0.8) + P.g(t2, f.b); });
    return P.g(tf, b);
  }
  function mushHalfD(w, h) {
    var a = w / 2, s = w * 0.2;
    return 'M' + n(-a) + ' ' + n(h * 0.05) + ' Q' + n(-a * 1.05) + ' ' + n(-h * 0.62) + ' 0 ' + n(-h * 0.6) + ' Q' + n(a * 1.05) + ' ' + n(-h * 0.62) + ' ' + n(a) + ' ' + n(h * 0.05) + ' L' + n(s) + ' ' + n(h * 0.1) + ' L' + n(s * 1.1) + ' ' + n(h * 0.42) + ' Q0 ' + n(h * 0.5) + ' ' + n(-s * 1.1) + ' ' + n(h * 0.42) + ' L' + n(-s) + ' ' + n(h * 0.1) + ' Z';
  }
  // a mushroom cut through the middle: the cap and stem outline, the cut face pale (tan: how browned)
  function mushSlice(q, x, y, a, w, tan) {
    var h = w * 0.9, tf = P.at(x, y, a), d = mushHalfD(w, h), face = P.mix('#F3EAD6', '#D9B98A', tan || 0);
    var b = P.path(d, face, '#A8865A', 0.7) + P.path('M' + n(-w / 2) + ' ' + n(h * 0.05) + ' Q' + n(-w / 2 * 1.05) + ' ' + n(-h * 0.62) + ' 0 ' + n(-h * 0.6) + ' Q' + n(w / 2 * 1.05) + ' ' + n(-h * 0.62) + ' ' + n(w / 2) + ' ' + n(h * 0.05), 'none', P.mix('#B98E5E', '#7A5434', tan || 0), Math.max(1, w * 0.07));
    b += P.line(-w * 0.42, h * 0.02, w * 0.42, h * 0.02, '#C9AE88', Math.max(0.8, w * 0.05)) + P.hl(-w * 0.15, -h * 0.3, w * 0.18, h * 0.06, '#FFFFFF', 0.4);
    return sh(d, tf, 1, 1.3) + P.g(tf, b);
  }
  function buttonCap(q, x, y, r) {
    var d = P.blob(q, r, r * 0.95, 0.03, 9, x, y);
    return P.shadow(d) + P.path(d, '#C9A06E', '#8A6440', 0.9) + P.circle(x - r * 0.08, y - r * 0.08, r * 0.78, '#D9B98A', null, 0) + P.circle(x - r * 0.15, y - r * 0.15, r * 0.45, '#E6CCA2', null, 0) + P.hl(x - r * 0.3, y - r * 0.38, r * 0.3, r * 0.14, '#FFFFFF', 0.45, -30);
  }
  function fieldMushroom(P, rnd) {
    var R = 32, d = P.blob(rnd, R, R * 0.96, 0.03, 14), out = P.shadow(d, 2.5, 3) + P.path(d, '#8A6A4A', '#5E4430', 1.2) + P.circle(0, 0, R * 0.9, '#5A4030');
    for (var i = 0; i < 80; i++) { var a = i / 80 * 2 * PI + rnd() * 0.03, r0 = 7 + (i % 3) * 1.5; out += P.line(Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * R * 0.88, Math.sin(a) * R * 0.88, i % 2 ? '#3E2A1E' : '#7A5A44', i % 2 ? 0.55 : 0.4); }
    out += P.circle(0, 0, R * 0.94, 'none', '#A8865E', 2.4) + P.circle(1, 1.2, 7.5, '#000000', null, 0, { opacity: '0.15' }) + P.circle(0, 0, 7, '#D9C3A0', '#A88A64', 0.9) + P.circle(-1.5, -1.5, 3.5, '#EADBC0');
    out += P.scatter(rnd, 7, R * 0.6, R * 0.6, function (x, y, i, q) { return P.leaf(3, 1.6, '#5E8C3A', x, y, q() * 360, { vein: false }); });
    return out + P.hl(-12, -16, 12, 3, '#FFFFFF', 0.18, -35);
  }
  function truffleAt(q, x, y, r) {
    var d = P.blob(q, r, r * 0.85, 0.1, 9, x, y), b = P.path(d, '#4A362A', '#24180F', 0.6);
    for (var i = 0; i < 4; i++) { var y0 = y - r * 0.55 + i * r * 0.36; b += P.path('M' + n(x - r * 0.7) + ' ' + n(y0) + ' q' + n(r * 0.35) + ' ' + n(-r * 0.25 + q() * r * 0.3) + ' ' + n(r * 0.7) + ' ' + n(q() * r * 0.2) + ' t' + n(r * 0.7) + ' ' + n(q() * r * 0.2 - r * 0.1), 'none', '#CDB79C', 0.45, { opacity: '0.85' }); }
    return sh(d, '', 0.8, 1) + b + P.hl(x - r * 0.3, y - r * 0.3, r * 0.3, r * 0.1, '#FFFFFF', 0.15);
  }
  function leekHalf(q, x, y, a, len, w) {
    var tf = P.at(x, y, a), h = len / 2, r = w / 2, d = P.smooth([[-h, -r * 0.7], [-h + 4, -r], [h - 4, -r], [h, -r * 0.6], [h, r * 0.6], [h - 4, r], [-h + 4, r], [-h, r * 0.7]]);
    var b = P.path(d, '#E6EDC6', '#8A9A5A', 0.9) + P.rect(h * 0.25, -r * 0.9, h * 0.72, w * 0.9, r * 0.6, '#9CC067', null, 0, { opacity: '0.9' });
    [-0.62, -0.3, 0.3, 0.62].forEach(function (k) { b += P.line(-h + 4, k * r, h - 4, k * r, '#B9C98A', 0.6); });
    b += P.scatter(q, 5, h * 0.8, r * 0.4, function (sx, sy, i, qq) { return P.path(P.blob(qq, 6 + qq() * 6, 3 + qq() * 2, 0.25, 8, sx, sy), '#6A5232', null, 0, { opacity: '0.4' }); });
    for (var gx = -h + 12; gx < h - 8; gx += 13) b += P.line(gx, -r * 0.8, gx + 4, r * 0.8, '#3A2E1E', 2.2, { opacity: '0.75' });
    return sh(d, tf) + P.g(tf, b + P.hl(-h * 0.3, -r * 0.45, h * 0.4, r * 0.14, '#FFFFFF', 0.3));
  }
  function pineappleRing(P) {
    var R = 29, rh = 7, d = circD(R) + ' ' + circD(rh), out = P.path(d, '#000000', null, 0, { opacity: '0.12', transform: tr(2, 2.5), 'fill-rule': 'evenodd' });
    out += P.path(d, '#F2CB55', '#C9962A', 1, { 'fill-rule': 'evenodd' }) + P.circle(0, 0, R - 2.4, 'none', '#E8B23A', 3.4);
    for (var i = 0; i < 22; i++) { var a = i / 22 * 2 * PI; out += P.circle(Math.cos(a) * (R - 2.4), Math.sin(a) * (R - 2.4), 0.9, '#A8742A') + P.line(Math.cos(a) * (rh + 2), Math.sin(a) * (rh + 2), Math.cos(a) * (R - 6), Math.sin(a) * (R - 6), '#E8B84A', 0.6, { opacity: '0.7' }); }
    out += P.circle(0, 0, rh + 1.2, 'none', '#F6DC86', 2);
    var c = Math.cos(35 * PI / 180), s = Math.sin(35 * PI / 180);
    for (var o = -22; o <= 22; o += 9) {
      var ho = Math.sqrt(R * R - o * o) * 0.86, segs = Math.abs(o) < rh + 2 ? [[-ho, -Math.sqrt(Math.pow(rh + 2, 2) - o * o)], [Math.sqrt(Math.pow(rh + 2, 2) - o * o), ho]] : [[-ho, ho]];
      segs.forEach(function (sg) { out += P.line(-s * o + c * sg[0], c * o + s * sg[0], -s * o + c * sg[1], c * o + s * sg[1], '#7A4A1E', 3, { opacity: '0.8' }); });
    }
    return out + P.hl(-12, -14, 8, 2.4, '#FFFFFF', 0.35, -35);
  }
  // a piece of cabbage kimchi: the crinkled leaf stained red, most with a pale rib across one side
  function kimchiAt(q, x, y, s) {
    s = s || 1;
    var tf = P.at(x, y, q() * 360), d = ruffleD(q, 17 * s, 12 * s, 0.1, 14), b = P.path(d, '#D9603A', '#9A2A1A', 0.7);
    if (q() < 0.7) b += P.path(P.smooth([[-8.5 * s, -3 * s], [-2 * s, -4.4 * s], [6 * s, -3.4 * s], [6.4 * s, 0.4 * s], [-2 * s, 0.6 * s], [-8.5 * s, 0.8 * s]]), '#F2D2B0', '#C9805A', 0.5) + P.line(-6 * s, -1.6 * s, 4 * s, -2 * s, '#E8A882', 0.6);
    return sh(d, tf, 1, 1.3) + P.g(tf, b + P.crumbs(q, 5, 6 * s, 4 * s, ['#A8281A', '#C9402A', '#E07A4A'], 0.7 * s));
  }
  function breadChunk(q, x, y, s) {
    s = s || 1;
    var tf = P.at(x, y, q() * 360), d = P.blob(q, 8 * s, 6.5 * s, 0.18, 8);
    return sh(d, tf, 1.2, 1.6) + P.g(tf, P.path(d, '#F0D49A', '#B97A36', 1.8) + P.crumbs(q, 5, 5 * s, 4 * s, ['#E2B870', '#F8E6BC'], 0.8) + P.path(P.blob(q, 3 * s, 2 * s, 0.3, 6, 2 * s, -2 * s), '#C98A45', null, 0, { opacity: '0.5' }));
  }
  function eggHalf(q, x, y, a) {
    var tf = P.at(x, y, a), d = P.blob(q, 12, 9, 0.04, 10);
    return sh(d, tf) + P.g(tf, P.path(d, '#FFFFFF', '#DCD6C8', 0.8) + P.circle(1, 0, 5.8, '#F2A93A', '#D98A1E', 0.6) + P.circle(1.4, 0.3, 3.4, '#EE8E22') + P.hl(-6, -4, 3, 1.2, '#FFFFFF', 0.6));
  }
  function feta(q, x, y, w, h, a) {
    var tf = P.at(x, y, a), d = P.slab(q, w / 2, h / 2, 0.85, 0.03, 16);
    var b = P.path(d, '#F7F4EA', '#D2CAB4', 1) + P.scatter(q, 14, w * 0.4, h * 0.38, function (sx, sy, i, qq) { return P.ellipse(sx, sy, 0.6 + qq(), 0.5 + qq() * 0.6, '#E6E0CF'); });
    b += P.path('M' + n(-w * 0.35) + ' ' + n(-h * 0.1) + ' Q' + n(-w * 0.1) + ' ' + n(-h * 0.35) + ' ' + n(w * 0.1) + ' ' + n(-h * 0.05) + ' T' + n(w * 0.38) + ' ' + n(h * 0.05), 'none', '#E3C25A', 1.6, { opacity: '0.45', 'stroke-linecap': 'round' });
    b += sprinkle(q, 14, w * 0.4, h * 0.36, ['#6E7A3A', '#5A6A2E'], 0.5);
    return sh(d, tf, 2, 2.5) + P.g(tf, b);
  }
  function shardAt(q, x, y, s, col) {
    col = col || '#F6E7B0';
    var tf = P.at(x, y, q() * 360), d = P.smooth([[-6 * s, -2 * s], [-1 * s, -3.4 * s], [6 * s, -2.4 * s], [5 * s, 2.4 * s], [-2 * s, 3 * s], [-6.4 * s, 1.4 * s]]);
    return sh(d, tf, 0.8, 1) + P.g(tf, P.path(d, col, ed(col, -0.22), 0.6) + P.hl(-1 * s, -1 * s, 3 * s, 0.8 * s, '#FFFFFF', 0.5));
  }
  function baconBit(q, x, y, s) {
    s = s || 1;
    var tf = P.at(x, y, q() * 360), d = P.blob(q, 3.4 * s, 2.4 * s, 0.25, 6);
    return sh(d, tf, 0.6, 0.8) + P.g(tf, P.path(d, '#A8463A', '#7A2A20', 0.5) + P.line(-2 * s, 0, 2 * s, 0.4, '#EBC8B8', 0.9 * s));
  }
  function seaweedAt(q, x, y, a, len, col) {
    var pts = [], k = 5 + Math.round(q() * 3), amp = 1.4 + q();
    for (var i = 0; i <= k * 2; i++) { var t = i / (k * 2); pts.push([-len / 2 + t * len, (i % 2 ? 1 : -1) * amp]); }
    var d = P.smooth(pts, true), tf = P.at(x, y, a);
    return P.g(tf, P.path(d, 'none', '#2A6A26', 3.6, { 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }) + P.path(d, 'none', col, 2.4, { 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  }
  function rosellaAt(q, x, y, r) {
    var out = P.circle(x + 1.4, y + 1.8, r * 0.9, '#000000', null, 0, { opacity: '0.12' }), a0 = q() * 72;
    for (var i = 0; i < 10; i++) { var a = (a0 + i * 36 + 18) * PI / 180; out += P.line(x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4, x + Math.cos(a) * r * 1.02, y + Math.sin(a) * r * 1.02, '#7A1028', 0.8); }
    for (var j = 0; j < 5; j++) { var b = a0 + j * 72, br = b * PI / 180; out += P.g(P.at(x + Math.cos(br) * r * 0.48, y + Math.sin(br) * r * 0.48, b), P.path(P.leafD(r * 1.05, r * 0.62), '#A8203A', '#6E0E22', 0.7) + P.path('M' + n(-r * 0.4) + ' 0 L' + n(r * 0.42) + ' 0', 'none', '#C9405A', 0.7)); }
    return out + P.circle(x, y, r * 0.3, '#7A1028', '#5A0A1A', 0.6) + P.circle(x - r * 0.08, y - r * 0.08, r * 0.14, '#C9405A');
  }
  function samphire(P, rnd) {
    var out = '';
    function branch(x, y, ang, segs, depth) {
      for (var i = 0; i < segs; i++) {
        var a = ang * PI / 180, nx = x + Math.cos(a) * 4.4, ny = y + Math.sin(a) * 4.4, mx = (x + nx) / 2, my = (y + ny) / 2;
        out += P.ellipse(mx + 0.6, my + 0.8, 2.6, 1.7, '#000000', null, 0, { opacity: '0.1', transform: rot(ang, mx + 0.6, my + 0.8) }) + P.ellipse(mx, my, 2.6, 1.7, '#6E9A3E', '#4A7426', 0.6, { transform: rot(ang, mx, my) });
        if (i === 3 && depth < 1) branch(nx, ny, ang + (ang < 0 ? -26 : 26), segs - 4, depth + 1);
        x = nx; y = ny; ang += (rnd() - 0.5) * 10;
      }
      out += P.circle(x, y, 1.1, '#9CC067');
    }
    [[-24, -4, -12], [-25, 1, 2], [-23, 6, 15]].forEach(function (b) { branch(b[0], b[1], b[2], 10, 0); });
    return out;
  }

  /* ---------- salads ---------- */
  function caesar(P, rnd) {
    var out = heap(rnd, 12, 22, 17, function (x, y, i, q) { return leafAt('cos', q, x * 1.3, y * 1.3, Math.atan2(y, x) * 180 / PI + (q() - 0.5) * 40, 1.6 * (0.85 + q() * 0.25)); });
    out += P.path('M-30 -8 Q-16 -20 -2 -8 T26 -6 M-26 10 Q-10 0 6 12 T32 8', 'none', '#D9CB9A', 3, { 'stroke-linecap': 'round' }) + P.path('M-30 -8 Q-16 -20 -2 -8 T26 -6 M-26 10 Q-10 0 6 12 T32 8', 'none', '#F4EBCB', 2, { 'stroke-linecap': 'round' });
    out += tossed(rnd, ['cr', 'cr', 'cr', 'cr', 'cr', 'cr', 'cr', 'pa', 'pa', 'pa', 'pa', 'pa', 'ba', 'ba', 'ba', 'ba', 'ba', 'ba'], 38, 30, {
      cr: function (q, x, y) { return cubeAt(x, y, 8 + q() * 2, '#E0A552', q() * 90) + P.circle(x - 1, y - 1, 0.7, '#F6D9A0'); },
      pa: function (q, x, y) { return shardAt(q, x, y, 1.3); },
      ba: function (q, x, y) { return baconBit(q, x, y, 1.2); }
    });
    out += eggHalf(rnd, 18, -14, -20) + eggHalf(rnd, -16, 14, 25);
    return P.g(tr(2, -6), out + sprinkle(rnd, 26, 42, 30, ['#2E2A28', '#4A4440'], 0.45));
  }
  function greek(P, rnd) {
    var out = tossed(rnd, ['to', 'to', 'to', 'to', 'to', 'to', 'to', 'to', 'cu', 'cu', 'cu', 'cu', 'cu', 'cu', 'ol', 'ol', 'ol', 'ol', 'ol', 'on', 'on', 'on', 'ca', 'ca', 'ca', 'to', 'to', 'cu', 'ol'], 40, 30, {
      to: function (q, x, y) { return tomChunk(q, x, y, 1.1); },
      cu: function (q, x, y) { return cucChunk(q, x, y, 1.05); },
      ol: function (q, x, y) { return oliveAt(q, x, y); },
      on: function (q, x, y) { return sliverAt(x, y, 9 + q() * 4, q() * 360, 160 + q() * 120, '#8E3A7A', '#F0E2EE', 1.8); },
      ca: function (q, x, y) { return stripAt(q, x, y, q() * 360, 18, 5, '#4F8A2F'); }
    });
    return out + feta(rnd, 2, -2, 38, 24, -8);
  }
  function garden(P, rnd) {
    var out = leafy({ mix: ['butter', 'cos', 'oak', 'rocket', 'butter', 'cos'], count: 16, rx: 28, ry: 22, s: 1.1 })(P, rnd);
    out += tossed(rnd, ['ch', 'ch', 'ch', 'ch', 'cu', 'cu', 'cu', 'ca', 'ca', 'ca', 'ca', 'ca', 'ca', 'on', 'on'], 32, 24, {
      ch: function (q, x, y) { return cherryHalf(q, x, y, 7.5, q() * 360); },
      cu: function (q, x, y) { return sliceAt('cucumber', q, x, y, 10, q() * 360); },
      ca: function (q, x, y) { return strand(strandD(x, y, 12 + q() * 6, q() * 180, (q() - 0.5) * 6), '#EE8A2E', 1.6, 0.7); },
      on: function (q, x, y) { return sliverAt(x, y, 7 + q() * 4, q() * 360, 120 + q() * 80, '#8E3A7A', '#F0E2EE', 1.5); }
    });
    return out;
  }
  function tabbouleh(P, rnd) {
    var out = mound(rnd, 34, 28, '#5E9A3A', 0.12);
    out += P.scatter(rnd, 90, 30, 24, function (x, y, i, q) { return P.circle(x, y, 0.8 + q() * 0.8, pick(q, ['#3F7A2A', '#2E6A24', '#4F8F2F', '#7EB04A'])); });
    out += P.scatter(rnd, 40, 30, 24, function (x, y) { return P.circle(x, y, 0.75, '#EADBA8'); });
    out += P.scatter(rnd, 11, 26, 20, function (x, y, i, q) { return cubeAt(x, y, 3.8, '#D9473B', q() * 90, { sw: 0.4 }); });
    return out + herbBits(rnd, 5, 24, 18, ['#5EA43A']) + P.hl(-10, -12, 10, 3, '#FFFFFF', 0.2, -20);
  }
  function panzanella(P, rnd) {
    return tossed(rnd, ['br', 'br', 'br', 'br', 'br', 'br', 'br', 'to', 'to', 'to', 'to', 'to', 'to', 'to', 'cu', 'cu', 'cu', 'on', 'on', 'on', 'ba', 'ba', 'ba', 'ba'], 40, 30, {
      br: function (q, x, y) { return breadChunk(q, x, y, 1.15); },
      to: function (q, x, y) { return tomChunk(q, x, y, 1.05); },
      cu: function (q, x, y) { return cucChunk(q, x, y, 0.95); },
      on: function (q, x, y) { return sliverAt(x, y, 8 + q() * 4, q() * 360, 140 + q() * 80, '#8E3A7A', '#F0E2EE', 1.6); },
      ba: function (q, x, y) { return P.leaf(14, 8, '#3F8A2E', x, y, q() * 360, { edge: '#2A6A1E', vc: '#6EAE4A' }); }
    });
  }
  function papaya(P, rnd) {
    var out = strands(rnd, 84, 38, 30, ['#E8F0C4', '#D6E6A6', '#F2F5DE', '#E8F0C4', '#C9DE90', '#EE8A2E'], 22, 1.7, 5);
    out += tossed(rnd, ['to', 'to', 'to', 'be', 'be', 'be', 'be', 'be', 'ch', 'ch', 'ch'], 30, 24, {
      to: function (q, x, y) { return cherryHalf(q, x, y, 7, q() * 360); },
      be: function (q, x, y) { return stripAt(q, x, y, q() * 360, 13, 4, '#4F8F2F', { bend: 0 }); },
      ch: function (q, x, y) { return sliceAt('jalapeno', q, x, y, 3.6, 0, { skin: '#C9302A', sh: false }); }
    });
    return out + P.scatter(rnd, 18, 30, 24, function (x, y, i, q) { return P.path(P.blob(q, 1.6 + q(), 1.2 + q() * 0.6, 0.3, 6, x, y), '#D9B07A', '#A8804A', 0.4); });
  }
  function salsa(main) {
    return function (P, rnd) {
      var d = P.blob(rnd, 22, 16, 0.12, 10), out = P.path(d, main === 'corn' ? '#EFD98A' : '#F2C98A', null, 0, { opacity: '0.4' });
      var bag = main === 'corn' ? ['k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'k', 'c', 'c', 'c', 'c', 'c', 'o', 'o', 'o', 'o', 'b', 'b', 'b', 'b', 'b', 'h', 'h', 'h', 'h'] : ['m', 'm', 'm', 'm', 'm', 'm', 'm', 'm', 'm', 'm', 'm', 'm', 'm', 'm', 'c', 'c', 'c', 'c', 'c', 'o', 'o', 'o', 'o', 'o', 'h', 'h', 'h', 'h', 'h'];
      return out + tossed(rnd, bag, 22, 16, {
        k: function (q, x, y) { return kernelAt(x, y, q() * 360, 0.9); },
        m: function (q, x, y) { return cubeAt(x, y, 5 + q() * 1.4, '#F2A93A', q() * 90, { sw: 0.5 }); },
        c: function (q, x, y) { return cubeAt(x, y, 3.6, '#C9302A', q() * 90, { sw: 0.4 }); },
        o: function (q, x, y) { return cubeAt(x, y, 3.2, '#B76A9E', q() * 90, { sw: 0.4 }); },
        b: function (q, x, y) { return P.ellipse(x, y, 2.4, 1.6, '#2E2420', '#1A1410', 0.4, { transform: rot(q() * 180, x, y) }) + P.circle(x - 0.6, y - 0.5, 0.5, '#8A7A70'); },
        h: function (q, x, y) { return P.leaf(4, 3, '#4F8F2F', x, y, q() * 360, { vein: false }); }
      });
    };
  }
  function ratatouille(P, rnd) {
    var d = P.blob(rnd, 33, 27, 0.1, 12), out = P.shadow(d) + P.path(d, '#B5301F', '#8A2418', 1) + P.path(P.blob(rnd, 24, 18, 0.2, 10, -4, -4), '#C9452A', null, 0, { opacity: '0.7' });
    out += tossed(rnd, ['z', 'z', 'z', 'z', 'z', 'e', 'e', 'e', 'e', 'e', 'r', 'r', 'r', 'r', 'y', 'y', 'y', 'o', 'o', 'o'], 26, 20, {
      z: function (q, x, y) { return cubeAt(x, y, 8, '#E4E8B4', q() * 90, { skin: '#2E5A26' }); },
      e: function (q, x, y) { return cubeAt(x, y, 8.5, '#D9C08A', q() * 90, { skin: '#3A1E3A' }); },
      r: function (q, x, y) { return stripAt(q, x, y, q() * 360, 11, 6, '#C9302A', { bend: 1.4 }); },
      y: function (q, x, y) { return stripAt(q, x, y, q() * 360, 11, 6, '#F2C230', { bend: 1.4 }); },
      o: function (q, x, y) { return sliverAt(x, y, 6, q() * 360, 100, '#D9B8A0', '#F2E6D6', 1.6); }
    });
    return out + herbBits(rnd, 8, 24, 18, ['#4F6E3A', '#5E7A44']) + P.crumbs(rnd, 14, 28, 22, ['#C9402A', '#9E2B20'], 0.8);
  }
  function banchan(P, rnd) {
    var out = '';
    // kimchi, top left
    out += P.g(tr(-17, -13), heap(rnd, 7, 9, 7, function (x, y, i, q) { return kimchiAt(q, x, y, 0.85); }));
    // bean sprout namul, top right
    out += P.g(tr(18, -13), heap(rnd, 16, 9, 7, function (x, y, i, q) { return sproutAt(q, x, y, 0.7); }) + sprinkle(rnd, 6, 8, 6, ['#F2E6C4'], 0.6));
    // spinach namul, bottom left
    out += P.g(tr(-17, 14), strands(rnd, 30, 10, 8, ['#2E6A24', '#3F7A2E', '#4F8A2F'], 13, 2.4, 4, { curl: true }) + sprinkle(rnd, 12, 10, 8, ['#F2E6C4'], 0.6));
    // cubed radish kimchi, bottom right
    out += P.g(tr(18, 14), heap(rnd, 8, 9, 7, function (x, y, i, q) { return cubeAt(x, y, 7.5, '#F0B48A', q() * 90) + P.crumbs(q, 3, 2.5, 2.5, ['#B5301F'], 0.6); }));
    return out;
  }

  /* ---------- stems, bulbs, squash, roots and greens (21 Oct 2026) ---------- */
  // the highlight is a lighter tint of the piece's own colour (the book's sit at 0.7 to 0.85)
  function tint(c, f) { return P.shade(c, f === undefined ? 0.45 : f); }
  function gloss(x, y, rx, ry, col, a) { return P.hl(x, y, rx, ry, tint(col, 0.5), 0.75, a); }
  // a filled shape with its outline in its own colour, darker (the book: about 0.74 of the fill's lightness)
  function fill(d, col, sw, x) { return P.path(d, col, ed(col), sw || 0.8, x); }
  // a stalk along x, cut square at both ends: ridges down its length, the pale groove of its inside (celery, rhubarb); o.tip a blush at one end
  function stalkAt(q, x, y, a, len, w, col, o) {
    o = o || {};
    var h = len / 2, b = o.bend === undefined ? w * 0.2 : o.bend, top = [], bot = [], tf = P.at(x, y, a);
    for (var i = 0; i <= 6; i++) { var t = i / 6, yy = -b * (1 - Math.pow(2 * t - 1, 2)); top.push([-h + t * len, yy - w / 2]); bot.unshift([-h + t * len, yy + w / 2]); }
    var d = P.smooth(top, true) + ' L' + P.smooth(bot, true).slice(1) + ' Z', out = fill(d, col, 0.8);
    var along = function (k) { var yy = k * w / 2; return 'M' + n(-h + 0.8) + ' ' + n(yy) + ' Q0 ' + n(yy - 2 * b) + ' ' + n(h - 0.8) + ' ' + n(yy); };
    if (o.tip) out += P.path('M' + n(h * 0.3) + ' ' + n(-b * 0.91) + ' L' + n(h - 0.6) + ' ' + n(-b * 0.03), 'none', o.tip, w * 0.66, { opacity: '0.6' });
    if (o.groove !== false) out += P.path(along(-0.22), 'none', tint(col, 0.32), w * 0.24, { 'stroke-linecap': 'round' });
    [-0.7, -0.42, 0.18, 0.5, 0.76].forEach(function (k) { out += P.path(along(k), 'none', ed(col, -0.14), 0.5, { opacity: '0.8' }); });
    return sh(d, tf, 1.6, 2) + P.g(tf, out + gloss(-h * 0.1, -b - w * 0.3, h * 0.5, w * 0.07, col));
  }
  // a slice of celery: a shallow U, its green back with the strings in it, the pale flesh inside
  function celeryBit(q, x, y, a, s) {
    var tf = P.at(x, y, a, s), d = 'M-5.4 -0.8 Q-5.4 0.6 -4.6 1.6 Q-2.8 3.8 0 3.9 Q2.8 3.8 4.6 1.6 Q5.4 0.6 5.4 -0.8 Q4.6 -1.6 3.6 -0.9 Q2 0.9 0 1 Q-2 0.9 -3.6 -0.9 Q-4.6 -1.6 -5.4 -0.8 Z';
    var b = fill(d, '#D2E5A2', 0.6) + P.path('M-4.7 0.4 Q-3.6 2.9 0 3.1 Q3.6 2.9 4.7 0.4', 'none', '#8DB255', 1.1, { 'stroke-linecap': 'round' });
    return sh(d, tf, 0.8, 1) + P.g(tf, b + P.circle(-2.2, 1.7, 0.45, '#B9D47E') + P.circle(0, 2.1, 0.45, '#B9D47E') + P.circle(2.2, 1.7, 0.45, '#B9D47E'));
  }
  // a diced cube from above, with a strip of skin on one edge (o.skin) and a browned spot (o.tan)
  function dice(q, x, y, s, col, a, o) {
    o = o || {};
    var h = s / 2, rr = s * 0.2, b = P.rect(-h, -h, s, s, rr, col, ed(col), 0.6);
    if (o.skin) b += P.rect(-h + 0.5, -h + 0.5, s - 1, s * 0.22, rr * 0.6, o.skin);
    if (o.tan) b += P.path(P.blob(q, s * (0.14 + q() * 0.1), s * 0.11, 0.3, 6, (q() - 0.5) * s * 0.4, s * 0.16), o.tan, null, 0, { opacity: '0.55' });
    b += P.rect(-h + s * 0.14, -h + s * (o.skin ? 0.3 : 0.14), s * 0.36, s * 0.13, s * 0.06, tint(col, 0.5), null, 0, { opacity: '0.75' });
    return P.g(P.at(x + 1.2, y + 1.5, a), P.rect(-h, -h, s, s, rr, '#000000', null, 0, { opacity: '0.12' })) + P.g(P.at(x, y, a), b);
  }
  // a round slice from above (o: skin, flesh, rim, oval, ring, rings, core, seeds and seedCol round the middle, tan)
  function discAt(q, x, y, r, a, o) {
    var ov = o.oval || 0.96, k = o.rim || 0.88, tf = P.at(x, y, a), d = P.blob(q, r, r * ov, 0.03, 12);
    var b = fill(d, o.skin, 0.7) + P.ellipse(0, 0, r * k, r * k * ov, o.flesh);
    (o.rings || []).forEach(function (f) { b += P.ellipse(0, 0, r * f, r * f * ov, 'none', o.ring, 0.6, { opacity: '0.85' }); });
    for (var i = 0; i < (o.seeds || 0); i++) { var t = (i / o.seeds + q() * 0.04) * 2 * PI, sx = Math.cos(t) * r * 0.36, sy = Math.sin(t) * r * 0.36 * ov; b += P.ellipse(sx, sy, r * 0.09, r * 0.05, o.seedCol, ed(o.seedCol), 0.4, { transform: rot(t * 180 / PI, sx, sy) }); }
    if (o.core) b += P.ellipse(0, 0, r * 0.13, r * 0.13 * ov, o.core);
    if (o.tan) b += P.path(P.blob(q, r * (0.25 + q() * 0.15), r * 0.16, 0.3, 7, (q() - 0.5) * r * 0.6, (q() - 0.5) * r * 0.5), o.tan, null, 0, { opacity: '0.45' });
    return sh(d, tf, 1.2, 1.5) + P.g(tf, b + gloss(-r * 0.3, -r * 0.4 * ov, r * 0.3, r * 0.1, o.flesh, -30));
  }
  // a wedge of a round root, its point at the middle: o.flesh, o.rings (parts of R) in o.ring, o.skin along the round side, o.skin2 its lower half, o.tan
  function rootWedge(q, x, y, a, R, deg, o) {
    var tf = P.at(x, y, a) + ' ' + tr(-R * 0.55, 0), d = wedgeD(R, deg), b = fill(d, o.flesh, 0.8), R2 = R - 1.1, t = (deg - 0.5) * PI / 180;
    (o.rings || []).forEach(function (f) { b += P.path(arcD(R * f, deg - 2), 'none', o.ring, 0.8, { opacity: '0.85' }); });
    b += P.path(arcD(R2, deg - 0.5), 'none', o.skin, 2);
    if (o.skin2) b += P.path('M' + n(R2) + ' 0 A' + n(R2) + ' ' + n(R2) + ' 0 0 1 ' + n(Math.cos(t) * R2) + ' ' + n(Math.sin(t) * R2), 'none', o.skin2, 2);
    if (o.tan) b += P.path(P.blob(q, R * 0.18, R * 0.08, 0.3, 6, R * 0.6, (q() - 0.5) * R * 0.2), o.tan, null, 0, { opacity: '0.5' });
    return sh(d, tf, 1.6, 2) + P.g(tf, b + gloss(R * 0.5, -R * 0.08, R * 0.14, R * 0.04, o.flesh));
  }
  // a knob of ginger or galangal: plump lobes [x, y, rx, ry, angle] with rings across them; the last lobe cut to show the flesh
  function knobAt(q, lobes, o) {
    var ds = lobes.map(function (l) { return P.blob(q, l[2], l[3], 0.06, 10, l[0], l[1], l[4]); });
    var out = P.path(ds.join(' '), '#000000', null, 0, { opacity: '0.12', transform: tr(2, 2.5) });
    lobes.forEach(function (l, i) {
      var b = '';
      for (var xx = -l[2] + 4 + q() * 2; xx < l[2] - 3; xx += o.gap * (0.8 + q() * 0.4)) { var hh = l[3] * Math.sqrt(Math.max(0, 1 - xx * xx / (l[2] * l[2]))) * 0.8; b += P.path('M' + n(xx) + ' ' + n(-hh) + ' Q' + n(xx + 1.4) + ' 0 ' + n(xx) + ' ' + n(hh), 'none', o.ring, 0.6, { opacity: '0.8' }); }
      b += gloss(-l[2] * 0.1, -l[3] * 0.45, l[2] * 0.42, l[3] * 0.12, o.skin);
      if (o.shoot && i === 1) b += P.ellipse(l[2] - 1.2, 0, 2.4, l[3] * 0.42, o.shoot, ed(o.shoot), 0.6);
      if (i === lobes.length - 1) b += P.ellipse(l[2] - 1.6, 0, l[3] * 0.3, l[3] * 0.6, o.flesh, ed(o.flesh), 0.6) + P.ellipse(l[2] - 1.6, 0, l[3] * 0.12, l[3] * 0.3, 'none', P.shade(o.flesh, -0.1), 0.5);
      out += fill(ds[i], o.skin, 0.9) + P.g(P.at(l[0], l[1], l[4]), b);
    });
    return out;
  }
  // a tomatillo from above: the green fruit in its papery husk, peeled back into five points (open) or still closed over it
  function tomatilloAt(q, x, y, r, a, open) {
    var tf = P.at(x, y, a), husk = '#D9D49C', vein = ed(husk, -0.12), fruit = '#8DB648', out = '';
    if (open) {
      var pet = P.leafD(r * 1.5, r * 0.95), vd = 'M' + n(-r * 0.6) + ' 0 L' + n(r * 0.66) + ' 0 M' + n(-r * 0.2) + ' 0 L' + n(r * 0.3) + ' ' + n(-r * 0.24) + ' M' + n(-r * 0.2) + ' 0 L' + n(r * 0.3) + ' ' + n(r * 0.24);
      for (var i = 0; i < 5; i++) { var t = tf + ' ' + P.at(0, 0, i * 72 + q() * 12) + ' ' + tr(r * 0.95, 0); out += sh(pet, t, 1, 1.3) + P.g(t, fill(pet, husk, 0.6) + P.path(vd, 'none', vein, 0.45, { 'stroke-linecap': 'round' })); }
      return out + sh(circD(r), tf, 1.2, 1.5) + P.g(tf, fill(circD(r), fruit, 0.8) + P.circle(r * 0.08, r * 0.06, r * 0.1, ed(fruit, -0.1)) + gloss(-r * 0.32, -r * 0.4, r * 0.34, r * 0.14, fruit, -30));
    }
    var pts = [];
    for (var j = 0; j < 10; j++) { var tt = j / 10 * 2 * PI, k = j % 2 ? 0.98 : 1.22; pts.push([Math.cos(tt) * r * k, Math.sin(tt) * r * k]); }
    var d = P.smooth(pts), b = fill(d, husk, 0.7);
    for (var m = 0; m < 5; m++) { var ta = m / 5 * 2 * PI; b += P.line(Math.cos(ta) * r * 0.2, Math.sin(ta) * r * 0.2, Math.cos(ta) * r * 1.02, Math.sin(ta) * r * 1.02, vein, 0.5); }
    b += P.ellipse(r * 0.42, r * 0.36, r * 0.3, r * 0.2, fruit, ed(fruit), 0.6, { transform: rot(40, r * 0.42, r * 0.36) }) + P.circle(0, 0, r * 0.18, '#A89A62', ed('#A89A62'), 0.5);
    return sh(d, tf, 1.2, 1.5) + P.g(tf, b + gloss(-r * 0.36, -r * 0.42, r * 0.36, r * 0.12, husk, -30));
  }
  // a sprig of watercress: a pale stem with small round leaflets in pairs, the end one biggest
  function cressSprig(q, x, y, a, s) {
    var tf = P.at(x, y, a, s), col = q() < 0.5 ? '#3F7E2E' : '#4A8A34', st = '#8DB255', stem = 'M-12 0.4 Q-3 1.2 8 -0.2', lv = [[-6.4, -2.8, 2.5], [-5.6, 3, 2.4], [-0.8, -3.4, 3], [0, 3.5, 2.9], [4.6, -3, 3.2], [5.2, 3.2, 3.1], [10.4, 0, 4.2]];
    var b = P.path(stem, 'none', ed(st), 1.6, { 'stroke-linecap': 'round' }) + P.path(stem, 'none', st, 0.9, { 'stroke-linecap': 'round' });
    lv.forEach(function (l) { b += P.ellipse(l[0], l[1], l[2], l[2] * 0.8, col, ed(col), 0.6); });
    return sh(lv.map(function (l) { return circD(l[2] * 0.9, l[0], l[1]); }).join(' '), tf, 1, 1.3) + P.g(tf, b + gloss(9.4, -1.4, 1.9, 0.7, col));
  }
  // a silverbeet or chard leaf along x: the puckered blade, the broad stalk running up it as the midrib (stem: its colour)
  function chardLeaf(q, x, y, a, len, wid, stem) {
    var tf = P.at(x, y, a), h = len / 2, col = '#2F6A2A', d = ruffleD(q, len, wid, 0.05, 26), sl = len * 0.22, ws = wid * 0.12;
    var rib = 'M' + n(-h - sl) + ' ' + n(-ws) + ' L' + n(-h) + ' ' + n(-ws * 1.05) + ' Q' + n(-h * 0.2) + ' ' + n(-ws * 0.8) + ' ' + n(h * 0.5) + ' 0 Q' + n(-h * 0.2) + ' ' + n(ws * 0.8) + ' ' + n(-h) + ' ' + n(ws * 1.05) + ' L' + n(-h - sl) + ' ' + n(ws) + ' Q' + n(-h - sl - 1.2) + ' 0 ' + n(-h - sl) + ' ' + n(-ws) + ' Z';
    var b = fill(d, col, 0.8) + P.path(ruffleD(q, len * 0.74, wid * 0.66, 0.04), '#3F7E34', null, 0, { transform: tr(len * 0.08, 0), opacity: '0.85' });
    b += P.scatter(q, 7, h * 0.7, wid * 0.28, function (sx, sy, i, qq) { return P.path(P.blob(qq, 2.6 + qq() * 1.6, 1.8 + qq(), 0.3, 6, sx + h * 0.1, sy), '#4A8A3A', null, 0, { opacity: '0.7' }); });
    for (var i = 1; i <= 3; i++) { var vx = -h + len * i / 4.2; b += P.path('M' + n(vx) + ' 0 Q' + n(vx + len * 0.06) + ' ' + n(-wid * 0.18) + ' ' + n(vx + len * 0.14) + ' ' + n(-wid * 0.32) + ' M' + n(vx) + ' 0 Q' + n(vx + len * 0.06) + ' ' + n(wid * 0.18) + ' ' + n(vx + len * 0.14) + ' ' + n(wid * 0.32), 'none', tint(stem, 0.2), 0.7, { 'stroke-linecap': 'round', opacity: '0.85' }); }
    b += fill(rib, stem, 0.7) + P.line(-h - sl + 2, -ws * 0.35, h * 0.1, -ws * 0.2, tint(stem, 0.4), 0.8, { opacity: '0.8' }) + P.ellipse(-h - sl + 0.2, 0, 0.9, ws * 0.85, tint(stem, 0.3), ed(tint(stem, 0.3)), 0.5) + gloss(h * 0.15, -wid * 0.24, h * 0.3, wid * 0.05, col, -6);
    return sh(d, tf, 2, 2.5) + sh(rib, tf, 2, 2.5) + P.g(tf, b);
  }
  // a witlof leaf, a little boat: pale, its tip yellow green
  function witlofLeaf(q, x, y, a, len, wid) {
    var tf = P.at(x, y, a), h = len / 2, w = wid, col = '#F2F0D6';
    var d = P.smooth([[-h, 0], [-h * 0.8, -w * 0.26], [0, -w * 0.46], [h * 0.7, -w * 0.5], [h, -w * 0.2], [h * 1.04, 0], [h, w * 0.2], [h * 0.7, w * 0.5], [0, w * 0.46], [-h * 0.8, w * 0.26]]);
    var b = fill(d, col, 0.7) + P.path(P.smooth([[-h * 0.7, 0], [-h * 0.5, -w * 0.16], [h * 0.2, -w * 0.3], [h * 0.75, -w * 0.26], [h * 0.86, 0], [h * 0.75, w * 0.26], [h * 0.2, w * 0.3], [-h * 0.5, w * 0.16]]), '#FAF9EC', null, 0);
    b += P.path(P.smooth([[h * 0.44, -w * 0.38], [h * 0.72, -w * 0.43], [h * 0.93, -w * 0.17], [h * 0.97, 0], [h * 0.93, w * 0.17], [h * 0.72, w * 0.43], [h * 0.44, w * 0.38], [h * 0.62, 0]]), '#DCE592', null, 0, { opacity: '0.9' });
    b += P.path('M' + n(-h + 2) + ' 0 Q0 0.5 ' + n(h * 0.62) + ' 0', 'none', '#E4E4C2', 1.2, { 'stroke-linecap': 'round' }) + gloss(-h * 0.1, -w * 0.28, h * 0.32, w * 0.05, col, -4);
    return sh(d, tf, 1.6, 2) + P.g(tf, b);
  }
  // an okra pod: broad at the cap, tapering to a point, ridges down it
  function okraAt(q, x, y, a, len, w) {
    var tf = P.at(x, y, a), h = len / 2, col = '#5E9A3A', top = [], bot = [];
    for (var i = 0; i <= 10; i++) { var t = i / 10, hw = w / 2 * (t < 0.1 ? 0.82 : Math.pow((1 - t) / 0.9, 0.7)); top.push([-h + t * len, -hw]); if (i < 10) bot.unshift([-h + t * len, hw]); }
    var d = P.smooth(top.concat(bot)), b = fill(d, col, 0.8);
    [-0.55, 0, 0.55].forEach(function (k) { b += P.path('M' + n(-h + 4) + ' ' + n(k * w * 0.4) + ' Q' + n(h * 0.1) + ' ' + n(k * w * 0.36) + ' ' + n(h - 1.5) + ' 0', 'none', ed(col, -0.12), 0.6, { opacity: '0.85' }); });
    b += gloss(-h * 0.15, -w * 0.24, h * 0.45, w * 0.07, col, 1.5) + fill('M' + n(-h - 7) + ' -1.6 L' + n(-h + 1) + ' -2 L' + n(-h + 1) + ' 2 L' + n(-h - 7) + ' 1.6 Z', '#8A9A4A', 0.6);
    b += fill('M' + n(-h - 1) + ' ' + n(-w * 0.42) + ' Q' + n(-h + 4.5) + ' ' + n(-w * 0.3) + ' ' + n(-h + 5.5) + ' 0 Q' + n(-h + 4.5) + ' ' + n(w * 0.3) + ' ' + n(-h - 1) + ' ' + n(w * 0.42) + ' Q' + n(-h - 2) + ' 0 ' + n(-h - 1) + ' ' + n(-w * 0.42) + ' Z', '#7EA453', 0.6);
    return sh(d, tf, 1.4, 1.8) + P.g(tf, b);
  }
  // a round of okra: five ridges round the edge, the seeds in their chambers
  function okraRound(q, x, y, r, a) {
    var pts = [], tf = P.at(x, y, a);
    for (var i = 0; i < 10; i++) { var t = i / 10 * 2 * PI, k = i % 2 ? 0.86 : 1; pts.push([Math.cos(t) * r * k, Math.sin(t) * r * k]); }
    var d = P.smooth(pts), b = fill(d, '#5E9A3A', 0.6) + P.circle(0, 0, r * 0.74, '#D9E8A8');
    for (var j = 0; j < 5; j++) { var tt = (j + 0.5) / 5 * 2 * PI; b += P.circle(Math.cos(tt) * r * 0.46, Math.sin(tt) * r * 0.46, r * 0.18, '#F4F7E2', ed('#F4F7E2'), 0.4); }
    return sh(d, tf, 0.9, 1.1) + P.g(tf, b + P.circle(0, 0, r * 0.16, '#C9DC92') + gloss(-r * 0.3, -r * 0.5, r * 0.3, r * 0.1, '#D9E8A8', -30));
  }
  // a quarter of an artichoke heart, cut face up: the leaves layered up to a point, greener outside, the dense pale heart at the base
  function heartQuarter(q, x, y, a, s) {
    var tf = P.at(x, y, a, s), pts = [[0, -11.5], [4.6, -6.5], [8, 0], [7.4, 5.6], [3.6, 8.6], [0, 9.2], [-3.6, 8.6], [-7.4, 5.6], [-8, 0], [-4.6, -6.5]], d = P.smooth(pts);
    var b = fill(d, '#B5B868', 0.7) + fill(P.smooth(scalePts(pts, 0.8, 0, 8)), '#CCC982', 0.5) + fill(P.smooth(scalePts(pts, 0.58, 0, 8)), '#E0DA9E', 0.5);
    b += P.path(P.leafD(6, 3.2), '#8E5A7A', null, 0, { transform: 'translate(0 -8.4) rotate(90)', opacity: '0.3' }) + fill(P.blob(q, 5.4, 2.8, 0.05, 8, 0, 6), '#EEE8C2', 0.5);
    return sh(d, tf, 1, 1.3) + P.g(tf, b + gloss(-3.4, -1.4, 0.9, 2.6, '#CCC982', 15));
  }
  // a clove of garlic, peeled: the curved back, the flat inside edge, the root end
  function cloveAt(q, x, y, a, s) {
    var tf = P.at(x, y, a, s), col = '#F4ECCF', d = 'M-7.6 2.8 Q-8.6 -3 -2.4 -5.6 Q3.8 -7 8 -2 Q9 0 7.4 1.4 Q1 4 -7.6 2.8 Z';
    var b = fill(d, col, 0.7) + P.path('M-6.6 1.6 Q0.4 2.6 6.6 0.2', 'none', ed(col, -0.1), 0.5) + P.ellipse(-7.2, 1.6, 1.4, 1.6, '#DCC89A', ed('#DCC89A'), 0.5);
    return sh(d, tf, 1, 1.3) + P.g(tf, b + gloss(-1.4, -3.2, 3.6, 0.9, col, -12));
  }
  // a baton cut square (jicama): flat ends, a highlight down one side, a faint fibre line
  function batonBar(q, x, y, a, len, w, col) {
    var h = len / 2, r = w / 2;
    return P.g(P.at(x + 1.2, y + 1.5, a), P.rect(-h, -r, len, w, 1.4, '#000000', null, 0, { opacity: '0.12' })) + P.g(P.at(x, y, a), P.rect(-h, -r, len, w, 1.4, col, ed(col), 0.6) + P.line(-h * 0.8, r * 0.25, h * 0.7, r * 0.2, ed(col, -0.08), 0.5) + P.rect(-h * 0.7, -r * 0.6, len * 0.6, w * 0.2, 0.6, tint(col, 0.6), null, 0, { opacity: '0.75' }));
  }
  // a wombok leaf along x: the broad white rib from the base, crinkled across, the pale frilled green round its tip
  function wombokLeaf(q, x, y, a, len, wid) {
    var tf = P.at(x, y, a), h = len / 2, top = [], bot = [], rt = [], rb = [], col = '#CFE29A';
    for (var i = 0; i <= 12; i++) { var t = i / 12, hw = wid / 2 * (0.55 + 0.45 * Math.sin(PI / 2 * Math.min(1, t / 0.6))) * (t > 0.3 ? (i % 2 ? 1.05 : 0.95) : 1); top.push([-h + t * len, -hw]); bot.unshift([-h + t * len, hw]); }
    var pts = top.concat([[h + wid * 0.12, 0]], bot), d = P.smooth(pts), b = fill(d, col, 0.8) + P.path(P.smooth(scalePts(pts, 0.72, h * 0.35, 0)), '#DDEBB2', null, 0);
    for (var j = 0; j <= 6; j++) { var tt = j / 6, rw = wid * 0.24 * (1 - tt) * (j % 2 ? 1.06 : 0.96) + 0.6; rt.push([-h - 0.5 + tt * len * 0.78, -rw]); rb.unshift([-h - 0.5 + tt * len * 0.78, rw]); }
    for (var v = 1; v <= 4; v++) { var vx = -h + len * (0.16 + v * 0.15), vw = Math.max(0.6, wid * 0.24 * (1 - (vx + h) / (len * 0.78))); [-1, 1].forEach(function (k) { b += P.path('M' + n(vx) + ' ' + n(k * vw) + ' Q' + n(vx + len * 0.06) + ' ' + n(k * wid * 0.3) + ' ' + n(vx + len * 0.12) + ' ' + n(k * wid * 0.42), 'none', '#F2F6DC', 0.9, { 'stroke-linecap': 'round' }); }); }
    b += fill(P.smooth(rt.concat(rb)), '#F6F6E6', 0.7);
    for (var k = 1; k < 6; k++) { var kx = -h + k * len * 0.12, kw = wid * 0.24 * (1 - (kx + h) / (len * 0.78)) * 0.8; b += P.path('M' + n(kx) + ' ' + n(-kw) + ' Q' + n(kx + 1.6) + ' 0 ' + n(kx) + ' ' + n(kw), 'none', '#E2E4C8', 0.6); }
    return sh(d, tf, 2, 2.5) + P.g(tf, b + gloss(h * 0.45, -wid * 0.28, len * 0.1, wid * 0.04, '#DDEBB2', -8));
  }
  // a savoy cabbage leaf along x: deep green, blistered between the pale veins
  function savoyLeaf(q, x, y, a, len, wid) {
    var tf = P.at(x, y, a), d = ruffleD(q, len, wid, 0.09, 28), b = fill(d, '#5E8E3A', 0.8) + P.path(ruffleD(q, len * 0.74, wid * 0.66, 0.05, 22), '#6E9E44', null, 0, { transform: tr(len * 0.08, 0) });
    b += P.scatter(q, 14, len * 0.36, wid * 0.3, function (sx, sy, i, qq) { return P.path(P.blob(qq, 2.4 + qq() * 1.6, 1.6 + qq(), 0.3, 6, sx + len * 0.05, sy), '#8DB858', null, 0, { opacity: '0.75' }); });
    b += veins(len, wid, '#CFE29C', 4, 0.9) + fill(ribD(len * 0.92, wid * 0.12, 0.42), '#D6E6A6', 0.6, { transform: tr(len * 0.04 + 1, 0) });
    return sh(d, tf, 2, 2.5) + P.g(tf, b + gloss(len * 0.1, -wid * 0.26, len * 0.14, wid * 0.04, '#6E9E44', -8));
  }
  // a cavolo nero leaf: a long dark strap with a wavy edge, blistered either side of the pale rib
  function cavoloLeaf(q, x, y, a, len, wid) {
    var tf = P.at(x, y, a), col = '#2F4F3A', h = len / 2, top = [], bot = [], env = function (t) { return Math.pow(Math.sin(PI * (0.06 + 0.9 * t)), 0.6); };
    for (var i = 0; i <= 16; i++) { var t = i / 16, xx = -h + t * len, hw = wid / 2 * env(t) * (i % 2 ? 1.08 : 0.92); top.push([xx, -hw]); if (i > 0 && i < 16) bot.unshift([xx + 1, hw]); }
    var d = P.smooth(top.concat(bot)), stem = 'M' + n(-h - 9) + ' 0.4 Q0 0.8 ' + n(h * 0.8) + ' 0', b = fill(d, col, 0.8);
    for (var k = 1; k < 13; k++) { var tk = k / 13, bx = -h + tk * len, hh = wid / 2 * env(tk); b += P.ellipse(bx, -hh * 0.48, len * 0.026, hh * 0.24, '#456B54', null, 0, { opacity: '0.85' }) + P.ellipse(bx + 1, hh * 0.48, len * 0.026, hh * 0.24, '#456B54', null, 0, { opacity: '0.85' }); }
    b += P.path(stem, 'none', ed('#8FA88A'), 2.4, { 'stroke-linecap': 'round' }) + P.path(stem, 'none', '#8FA88A', 1.4, { 'stroke-linecap': 'round' });
    return sh(d, tf, 2, 2.5) + P.path(stem, 'none', '#000000', 2, { opacity: '0.12', transform: tr(2, 2.5) + ' ' + tf, 'stroke-linecap': 'round' }) + P.g(tf, b + gloss(-h * 0.2, -wid * 0.3, h * 0.36, wid * 0.05, col, -3));
  }
  // a torn piece of curly kale: a tightly frilled edge round a darker heart, a pale rib through it
  function kaleBit(q, x, y, s) {
    var tf = P.at(x, y, q() * 360), pts = [], col = '#3F7230';
    for (var i = 0; i < 28; i++) { var t = i / 28 * 2 * PI, k = (i % 2 ? 0.74 : 1) * (0.88 + q() * 0.24); pts.push([Math.cos(t) * 11 * s * k, Math.sin(t) * 8 * s * k]); }
    var d = P.smooth(pts), b = fill(d, col, 0.7) + P.path(P.blob(q, 7 * s, 4.8 * s, 0.22, 9), '#5A9040', null, 0, { opacity: '0.9' }) + P.path(P.blob(q, 3.2 * s, 2.2 * s, 0.25, 7), '#3A6A2C', null, 0);
    b += P.path('M' + n(-12 * s) + ' ' + n(s) + ' Q' + n(-3 * s) + ' ' + n(-0.6 * s) + ' ' + n(5 * s) + ' ' + n(-1.5 * s), 'none', '#A9C77A', 1.1 * s, { 'stroke-linecap': 'round' });
    return sh(d, tf, 1.2, 1.6) + P.g(tf, b + gloss(-3 * s, -4 * s, 3.4 * s, s, '#5A9040', -15));
  }
  // a stem of broccoli rabe: a thin stalk, two lobed leaves off it, a loose head of buds with a few yellow flowers
  function rabeAt(q, x, y, a, len) {
    var tf = P.at(x, y, a), st = '#7EA453', lf = '#4A8436', bud = '#4F8A34', stem = 'M0 0 Q' + n(len * 0.5) + ' ' + n((q() - 0.5) * 4) + ' ' + n(len) + ' 0', shd = '', b = '';
    shd += P.path(stem, 'none', '#000000', 2.4, { opacity: '0.12', transform: tr(1, 1.3) + ' ' + tf, 'stroke-linecap': 'round' });
    b += P.path(stem, 'none', ed(st), 3.2, { 'stroke-linecap': 'round' }) + P.path(stem, 'none', st, 2, { 'stroke-linecap': 'round' });
    [[len * (0.2 + q() * 0.12), -1, -32 - q() * 16, 24 + q() * 4], [len * (0.48 + q() * 0.12), 1, 30 + q() * 14, 20 + q() * 4]].forEach(function (l) {
      var ld = lobedD(q, l[3], l[3] * 0.46, 4, 0.42, 0.35), lt = P.at(l[0], l[1], l[2]) + ' ' + tr(l[3] / 2, 0);
      shd += sh(ld, tf + ' ' + lt, 1, 1.3);
      b += P.g(lt, fill(ld, lf, 0.6) + P.path('M' + n(-l[3] / 2) + ' 0 L' + n(l[3] * 0.36) + ' 0', 'none', tint(lf, 0.35), 0.6));
    });
    shd += sh(circD(5.4, len + 3, 0), tf, 1, 1.3);
    P.spots(q, 7, 4, 3.2).forEach(function (p) { b += P.circle(len + 3 + p[0], p[1], 1.7, bud, ed(bud), 0.5); });
    b += P.circle(len + 4.5, -1.6, 0.9, '#F2D24C', ed('#F2D24C'), 0.4) + P.circle(len + 1.4, 2, 0.9, '#F2D24C', ed('#F2D24C'), 0.4);
    return shd + P.g(tf, b);
  }
  // a fennel bulb cut in half: the stalks cut short, the layers nested down to the core at the base
  function fennelHalf(q, x, y, a, s) {
    var tf = P.at(x, y, a, s), col = '#EEF2D6', pts = [[0, -21], [8, -17.5], [16, -11], [22.5, -1], [24, 9], [19.5, 18.5], [10, 23.5], [0, 24.5], [-10, 23.5], [-19.5, 18.5], [-24, 9], [-22.5, -1], [-16, -11], [-8, -17.5]], d = P.smooth(pts), shd = '', b = '';
    [[-7, -15, -24, 15], [0, -17, 0, 17], [7, -15, 24, 15]].forEach(function (k) {
      var sd = 'M-3.6 0 L-3 ' + n(-k[3]) + ' Q0 ' + n(-k[3] - 1.4) + ' 3 ' + n(-k[3]) + ' L3.6 0 Z', st = P.at(k[0], k[1], k[2]);
      shd += sh(sd, tf + ' ' + st, 2, 2.5);
      b += P.g(st, fill(sd, '#A9C870', 0.7) + P.ellipse(0, -k[3], 3, 1.1, '#DCEAB4', ed('#DCEAB4'), 0.5) + P.line(-1.2, -2, -1, -k[3] + 2, tint('#A9C870', 0.4), 0.7, { opacity: '0.8' }));
    });
    b += fill(d, col, 0.9) + P.path(P.smooth(scalePts(pts, 0.93, 0, 24)), 'none', '#CFE29E', 2.2);
    [0.76, 0.55, 0.34].forEach(function (k) { b += P.path(P.smooth(scalePts(pts, k, 0, 24)), 'none', '#D8E4B4', 0.8); });
    b += fill('M-5 24 Q0 10 5 24 Z', '#E4EAC2', 0.6) + P.ellipse(0, 24.4, 6.5, 1.8, '#D6CCA0', ed('#D6CCA0'), 0.6);
    return shd + sh(d, tf, 2, 2.5) + P.g(tf, b + gloss(-10, -5, 5, 1.8, col, -55));
  }
  // a shaving of fennel: two thin nested arches joined at the core, and a wisp of frond
  function fennelShave(q, x, y, a, s) {
    var tf = P.at(x, y, a, s), col = '#EEF3D8', d = 'M-13 3 Q-12 -6 0 -7 Q12 -6 13 3 L11.2 3 Q10.4 -4.2 0 -5 Q-10.4 -4.2 -11.2 3 Z', d2 = 'M-7.6 3 Q-7 -2.6 0 -3.2 Q7 -2.6 7.6 3 L6 3 Q5.4 -1.2 0 -1.6 Q-5.4 -1.2 -6 3 Z';
    return sh(d, tf, 0.9, 1.1) + P.g(tf, fill(d, col, 0.5) + fill(d2, '#E4EEC4', 0.5) + fill('M-2.4 3 Q0 -1 2.4 3 Z', '#DCE8B4', 0.5) + gloss(-5, -5.6, 3, 0.5, col, -14));
  }
  function frondAt(q, x, y, a, s) {
    var col = '#5E9A3A', b = P.path('M-1 0 Q5 -0.8 11 0.4', 'none', col, 0.6, { 'stroke-linecap': 'round' });
    for (var i = 0; i < 5; i++) { var px = 1.5 + i * 2.1, k = i % 2 ? 1 : -1; b += P.path('M' + n(px) + ' 0 q1.6 ' + n(k * 1.8) + ' 3.6 ' + n(k * 2.6) + ' M' + n(px + 0.4) + ' 0 q1.4 ' + n(-k * 1.4) + ' 3 ' + n(-k * 2.2), 'none', col, 0.5, { 'stroke-linecap': 'round' }); }
    return P.g(P.at(x, y, a, s), b);
  }
  // a long roast wedge of butternut: the tan skin along its back, the scoop of the seed hollow on the pieces from the bulb (cav)
  function butternutWedge(q, x, y, a, len, cav) {
    var h = len / 2, tf = P.at(x, y, a), top = [[-h, -1.5], [-h * 0.62, -7.5], [0, -10], [h * 0.62, -7.5], [h, -2]];
    var bot = cav ? [[h, 3], [h * 0.6, 6], [h * 0.3, 2.6], [0, 0.4], [-h * 0.3, 2.6], [-h * 0.6, 6], [-h, 3]] : [[h, 3], [h * 0.5, 6.4], [-h * 0.5, 6.4], [-h, 3]];
    var pts = top.concat(bot), d = P.smooth(pts), b = fill(d, '#EE9A36', 0.9) + P.path(P.smooth(scalePts(pts, 0.8, 0, 0)), '#F3AC52', null, 0);
    b += P.path(P.smooth(top.map(function (p) { return [p[0] * 0.92, p[1] + 1.6]; }), true), 'none', '#E6C892', 2.8, { 'stroke-linecap': 'round' });
    if (cav) b += P.path(P.smooth(bot.slice(1, -1).map(function (p) { return [p[0], p[1] - 1.2]; }), true), 'none', '#E07E22', 1.4, { 'stroke-linecap': 'round', opacity: '0.8' });
    b += P.scatter(q, 3, h * 0.6, 2.5, function (sx, sy, i, qq) { return P.path(P.blob(qq, 3 + qq() * 3, 1.5, 0.3, 6, sx, sy + 1), '#B9661C', null, 0, { opacity: '0.5' }); });
    return sh(d, tf, 2, 2.5) + P.g(tf, b + gloss(-h * 0.2, -5, h * 0.3, 1.2, '#F3AC52', -2));
  }
  // half an acorn squash, cut across: the ribbed dark green skin, the orange flesh, the hollow glazed with butter
  function acornHalf(P, rnd) {
    var pts = [];
    for (var i = 0; i < 60; i++) { var t = i / 60 * 2 * PI, r = 1 - 0.07 * (1 - Math.pow(Math.abs(Math.sin(t * 5)), 0.6)); pts.push([Math.cos(t) * 37 * r, Math.sin(t) * 34 * r]); }
    var d = P.smooth(pts), out = P.shadow(d) + fill(d, '#3A5A2E', 1) + P.path(P.smooth(scalePts(pts, 0.92, 0, 0)), '#E9A23C', null, 0) + P.path(P.smooth(scalePts(pts, 0.88, 0, 0)), '#F2B44C', null, 0);
    for (var j = 0; j < 4; j++) { var ta = (j * 90 + 30) * PI / 180, fx = Math.cos(ta) * 35, fy = Math.sin(ta) * 32.2; out += P.ellipse(fx, fy, 2.4, 0.9, '#D98A2E', null, 0, { transform: rot(ta * 180 / PI + 90, fx, fy), opacity: '0.85' }); }
    out += P.path(P.blob(rnd, 25, 23, 0.03, 12), '#F6C466', null, 0, { opacity: '0.8' });
    for (var k = 0; k < 7; k++) { var tb = (k / 7 + rnd() * 0.05) * 2 * PI; out += P.path(P.blob(rnd, 3 + rnd() * 2, 1.6, 0.3, 6, Math.cos(tb) * 28, Math.sin(tb) * 26), '#C9762A', null, 0, { opacity: '0.45' }); }
    out += fill(P.blob(rnd, 15, 13.5, 0.05, 10, 0, 0.5), '#E08A2C', 0.8) + P.path(P.blob(rnd, 10, 8.5, 0.1, 9, -1, 1), '#C9702A', null, 0, { opacity: '0.6' });
    return out + gloss(-4, -4, 4, 1.4, '#E08A2C', -30) + gloss(-15, -17, 8, 2.2, '#F2B44C', -35);
  }
  // half a spaghetti squash, roasted: the pale yellow skin, the flesh raked into strands down the middle
  function spaghettiHalf(P, rnd) {
    var d = P.blob(rnd, 52, 31, 0.02, 14), out = P.shadow(d) + fill(d, '#E9C055', 1) + P.path(P.blob(rnd, 48, 27.5, 0.02, 14), '#F6DE98', null, 0);
    out += P.path(P.blob(rnd, 38, 19, 0.05, 12, 1, 0), '#EDC866', null, 0, { opacity: '0.85' });
    out += strands(rnd, 30, 33, 15, ['#F8E4A0', '#F2CE68', '#FBEFC2', '#F4D67E'], 15, 1.3, 4, { curl: true, edgeW: 0.5 });
    return out + P.path(P.blob(rnd, 6, 3, 0.3, 7, 30, 12), '#C9902E', null, 0, { opacity: '0.45' }) + gloss(-26, -18, 12, 2.4, '#F6DE98', -8);
  }
  // a whole head of garlic lying on its side, neck up: the cloves bulge through the papery skin
  function garlicHead(P, rnd) {
    var col = '#F5F1E6', pts = [[0, -25], [2.6, -20.5], [8, -15.5], [12.6, -12.2], [17.5, -6.5], [20.2, -0.5], [19.2, 3.4], [20.2, 7.6], [16.5, 13], [10, 16.3], [6.5, 16.4], [0, 17.6], [-6.5, 16.4], [-10, 16.3], [-16.5, 13], [-20.2, 7.6], [-19.2, 3.4], [-20.2, -0.5], [-17.5, -6.5], [-12.6, -12.2], [-8, -15.5], [-2.6, -20.5]];
    var d = P.smooth(pts), tf = 'rotate(-25)', b = fill(d, col, 0.9);
    ['M-1 16 Q-19 2 -1.4 -20', 'M-0.5 16 Q-8 -1 -0.6 -20', 'M0.5 16 Q8 -1 0.6 -20', 'M1 16 Q19 2 1.4 -20'].forEach(function (p) { b += P.path(p, 'none', '#DDD3C3', 0.7); });
    ['M-13 1 Q-11.6 -6 -7.4 -10.6', 'M-4.6 6 Q-5 -2 -3.4 -8', 'M10.6 4 Q11 -3 7.6 -9'].forEach(function (p) { b += P.path(p, 'none', '#B987AE', 0.7, { opacity: '0.6', 'stroke-linecap': 'round' }); });
    [-4, -1.5, 1, 3.5].forEach(function (rx) { b += P.line(rx, 17.2, rx * 1.3, 20.6, '#C9B489', 0.6); });
    b += P.ellipse(0, 16.6, 6.5, 1.8, '#D6C29C', ed('#D6C29C'), 0.6) + fill('M-1.6 -20 L0 -27.5 L1.6 -20 Z', '#E8DFCC', 0.6);
    return sh(d, tf, 2, 2.5) + P.g(tf, b + gloss(-9, -5, 4.5, 1.8, col, -62));
  }
  // a globe artichoke lying on its side, stem to the left: rows of pointed scales, purple at their tips
  function artichoke(P, rnd) {
    var cx = 5, rx = 25, ry = 23, body = P.blob(rnd, rx, ry, 0.02, 12, cx, 0), stem = 'M-40 -3.4 L-17 -4.6 L-17 4.6 L-40 3.4 Q-41.4 0 -40 -3.4 Z', sc = 'M-7 -6 Q2 -7.4 7.4 0 Q2 7.4 -7 6 Q-8.6 0 -7 -6 Z';
    var out = P.shadow(body) + P.shadow(stem) + fill(stem, '#9CAE68', 0.8) + P.line(-38, -1.2, -19, -1.6, tint('#9CAE68', 0.4), 0.8, { opacity: '0.75' }) + P.ellipse(-40, 0, 1.2, 3.2, '#DCE2B6', ed('#DCE2B6'), 0.5) + fill(body, '#5E7A44', 0.9);
    [24, 15, 6, -3, -11].forEach(function (xx, c) {
      var hh = ry * Math.sqrt(Math.max(0.05, 1 - Math.pow((xx - cx) / (rx * 1.02), 2))), rows = c % 2 ? 4 : 3, s = 0.62 + 0.38 * hh / ry;
      for (var j = 0; j < rows; j++) {
        var yy = -hh * 0.7 + j * hh * 1.4 / (rows - 1), col = (c + j) % 2 ? '#7E9A5A' : '#86A060', tf = P.at(xx, yy, yy / hh * 32, s);
        out += sh(sc, tf, 0.8, 1) + P.g(tf, fill(sc, col, 0.7) + P.path(P.leafD(5, 4), '#8E5A7A', null, 0, { transform: tr(4, 0), opacity: '0.55' }) + P.path('M-5 0 L3 0', 'none', ed(col, -0.1), 0.5));
      }
    });
    return out + gloss(10, -14, 5, 1.4, '#86A060', -20);
  }

  L.add('veg', [
    // greens and salad leaves
    { id: 'cos-leaf', name: 'Cos lettuce leaf', sub: 'Greens and salad leaves', kw: 'cos romaine lettuce leaf baby cos salad', form: 'leaf', cook: 'fresh', role: 'salad', n: 1, w: 83, h: 29, side: { s: 'leafy', h: 6, c: '#77A845' }, draw: function (P, rnd) { var l = 82, w = 34, d = ruffleD(rnd, l, w, 0.05, 26); return P.shadow(d) + P.path(d, '#77A845', '#4F7F2F', 1) + P.path(ruffleD(rnd, l * 0.72, w * 0.55, 0.04), '#A9CC6A', null, 0, { transform: tr(-l * 0.12, 0) }) + P.path(ribD(l, 6, 0.4), '#E6F0C6', null, 0) + veins(l, w, '#E6F0C6', 4) + P.hl(10, -8, 14, 2.4, '#FFFFFF', 0.3, -6); } },
    { id: 'oak-leaf-lettuce', name: 'Oak leaf lettuce', sub: 'Greens and salad leaves', kw: 'red oak leaf lettuce salad leaves coral', form: 'pile', cook: 'fresh', role: 'salad', g: 15, w: 53, h: 37, side: { s: 'leafy', h: 10, c: '#8E3A4A' }, draw: leafy({ mix: ['oak'], count: 6, rx: 12, ry: 9, s: 1.2 }) },
    { id: 'iceberg-leaf', name: 'Iceberg lettuce leaf', sub: 'Greens and salad leaves', kw: 'iceberg lettuce leaf crisp head lettuce', form: 'leaf', cook: 'fresh', role: 'salad', n: 1, w: 71, h: 52, side: { s: 'leafy', h: 8, c: '#CFE29A' }, draw: iceberg },
    { id: 'rocket', name: 'Rocket', sub: 'Greens and salad leaves', kw: 'rocket arugula roquette wild rocket leaves', form: 'pile', cook: 'fresh', role: 'salad', g: 20, w: 48, h: 40, side: { s: 'leafy', h: 12, c: '#5E8C3A' }, draw: leafy({ mix: ['rocket'], count: 16, rx: 13, ry: 10 }) },
    { id: 'baby-spinach', name: 'Baby spinach', sub: 'Greens and salad leaves', kw: 'spinach baby leaves english spinach', form: 'pile', cook: 'fresh', role: 'salad', g: 20, w: 50, h: 48, side: { s: 'leafy', h: 12, c: '#3F7A2E' }, draw: leafy({ mix: ['spinach'], count: 12, rx: 13, ry: 10 }) },
    { id: 'lettuce-cups', name: 'Lettuce cups', sub: 'Greens and salad leaves', kw: 'lettuce cups san choy bau butter lettuce baby gem wraps', form: 'cluster', cook: 'fresh', role: 'salad', n: 3, w: 131, h: 42, side: { s: 'cup', h: 14, c: '#9CC463' }, draw: function (P, rnd) { return cupAt(rnd, -42, -2, 22, 186) + cupAt(rnd, 0, 2, 23, 176) + cupAt(rnd, 42, -1, 22, 182); } },
    { id: 'watercress', name: 'Watercress', sub: 'Greens and salad leaves', kw: 'watercress cress sprigs peppery greens', form: 'sprig', cook: 'fresh', role: 'garnish', g: 10, w: 47, h: 51, side: { s: 'leafy', h: 8, c: '#3F7E2E' }, draw: function (P, rnd) { return heap(rnd, 7, 11, 9, function (x, y, i, q) { return cressSprig(q, x, y, q() * 360, 1 + q() * 0.2); }); } },
    { id: 'silverbeet-leaves', name: 'Silverbeet leaves', sub: 'Greens and salad leaves', kw: 'silverbeet silver beet swiss chard chard spinach beet leaves', form: 'leaf', cook: 'steamed', role: 'veg', n: 2, w: 78, h: 59, side: { s: 'leafy', h: 8, c: '#2F6A2A' }, draw: function (P, rnd) { return chardLeaf(rnd, 7, -9, -8, 60, 38, '#F0F0DE') + chardLeaf(rnd, -5, 10, 172, 56, 36, '#F0F0DE'); } },
    { id: 'rainbow-chard-leaves', name: 'Rainbow chard leaves', sub: 'Greens and salad leaves', kw: 'rainbow chard swiss chard rainbow silverbeet coloured stems', form: 'leaf', cook: 'steamed', role: 'veg', n: 3, w: 78, h: 66, of: 'silverbeet-leaves', side: { s: 'leafy', h: 10, c: '#2F6A2A' }, draw: function (P, rnd) { return chardLeaf(rnd, 6, -14, -10, 54, 32, '#C8304A') + chardLeaf(rnd, 0, 0, 3, 56, 34, '#EDBE2E') + chardLeaf(rnd, 7, 14, 13, 52, 32, '#D8508A'); } },
    { id: 'radicchio-leaves', name: 'Radicchio leaves', sub: 'Greens and salad leaves', kw: 'radicchio red chicory treviso chioggia bitter leaves', form: 'pile', cook: 'fresh', role: 'salad', g: 20, w: 52, h: 44, side: { s: 'leafy', h: 10, c: '#8E2A4A' }, draw: leafy({ mix: ['radicchio'], count: 6, rx: 12, ry: 9, s: 1.25 }) },
    { id: 'endive-leaves', name: 'Endive leaves, witlof', sub: 'Greens and salad leaves', kw: 'endive witlof witloof belgian endive chicory escarole leaves boats', form: 'leaf', cook: 'fresh', role: 'salad', n: 4, w: 62, h: 71, side: { s: 'leafy', h: 8, c: '#F2F0D6' }, draw: function (P, rnd) { var out = ''; [-27, -9, 9, 27].forEach(function (a) { var r = a * PI / 180; out += witlofLeaf(rnd, -27 + Math.cos(r) * 29, Math.sin(r) * 29, a, 58, 20); }); return out; } },
    // roots
    { id: 'baby-carrots', name: 'Baby carrots with tops', sub: 'Roots', kw: 'dutch carrots baby carrots roasted glazed tops', form: 'piece', cook: 'roasted', role: 'veg', n: 3, w: 86, h: 37, side: { s: 'stick', h: 10, c: '#EE8A2E' }, draw: function (P, rnd) { return babyCarrot(rnd, 4, -13, -5) + babyCarrot(rnd, 7, 0, 2) + babyCarrot(rnd, 3, 13, 7); } },
    { id: 'carrot-coins', name: 'Carrot coins', sub: 'Roots', kw: 'carrot rounds sliced carrots steamed buttered', form: 'pile', cook: 'steamed', role: 'veg', g: 80, w: 56, h: 44, side: { s: 'pile', h: 12, c: '#EE8A2E' }, draw: slicePile('carrot', 15, 20, 15, 8.5) },
    { id: 'carrot-batons', name: 'Carrot batons', sub: 'Roots', kw: 'carrot sticks batons julienne steamed', form: 'pile', cook: 'steamed', role: 'veg', g: 80, w: 56, h: 42, side: { s: 'pile', h: 14, c: '#EE8A2E' }, draw: function (P, rnd) { return heap(rnd, 10, 11, 10, function (x, y, i, q) { return batonAt(q, x, y, 20 + (q() - 0.5) * 70); }); } },
    { id: 'beetroot-wedges', name: 'Beetroot wedges, roasted', sub: 'Roots', kw: 'beetroot beet wedges roast', form: 'pile', cook: 'roasted', role: 'veg', g: 80, w: 42, h: 43, side: { s: 'wedge', h: 14, c: '#8E2A4A' }, draw: function (P, rnd) { return heap(rnd, 6, 16, 13, function (x, y, i, q) { return beetWedge(q, x, y, q() * 360); }); } },
    { id: 'beetroot-slices', name: 'Beetroot slices', sub: 'Roots', kw: 'beetroot beet sliced rounds burger beetroot', form: 'slices', cook: 'roasted', role: 'veg', n: 4, w: 83, h: 32, side: { s: 'disc', h: 3, c: '#8E2A4A' }, draw: slices('beetroot', 4, 15, { gap: 1.2, arc: 0.6 }) },
    { id: 'baby-beetroot', name: 'Baby beetroot, whole', sub: 'Roots', kw: 'baby beets whole roasted beetroot halved', form: 'whole', cook: 'roasted', role: 'veg', n: 3, w: 52, h: 51, side: { s: 'mound', h: 22, c: '#5E1A34' }, draw: function (P, rnd) { return babyBeet(rnd, -12, -8, 13) + babyBeet(rnd, 14, -6, 12) + babyBeet(rnd, 0, 13, 13, true); } },
    { id: 'pumpkin-wedges', name: 'Pumpkin wedges, roasted', sub: 'Roots', kw: 'roast pumpkin kent pumpkin wedges skin on', form: 'wedge', cook: 'roasted', role: 'veg', g: 150, w: 74, h: 59, side: { s: 'wedge', h: 22, c: '#E8A33A' }, draw: function (P, rnd) { return pumpkinWedge(rnd, -8, -18, -14) + pumpkinWedge(rnd, 8, -5, 8) + pumpkinWedge(rnd, -2, 9, 24); } },
    { id: 'pumpkin-cubes', name: 'Pumpkin cubes, roasted', sub: 'Roots', kw: 'roast pumpkin diced cubes butternut', form: 'pile', cook: 'roasted', role: 'veg', g: 120, w: 52, h: 45, side: { s: 'pile', h: 16, c: '#E8A33A' }, draw: function (P, rnd) { return heap(rnd, 11, 22, 17, function (x, y, i, q) { return cubeAt(x, y, 12 + q() * 2, '#E8A23A', q() * 90, { skin: i % 3 ? '' : '#6E7A4A' }) + P.path(P.blob(q, 2 + q() * 2, 1.4, 0.3, 6, x + 2, y + 1), '#B9681A', null, 0, { opacity: '0.6' }); }); } },
    { id: 'radish-halves', name: 'Radish halves', sub: 'Roots', kw: 'radish halved red radishes breakfast radish', form: 'half', cook: 'fresh', role: 'salad', n: 4, w: 51, h: 37, side: { s: 'mound', h: 10, c: '#C8304A' }, draw: function (P, rnd) { return radishHalf(rnd, -11, -9, 9, -10) + radishHalf(rnd, 12, -8, 8.5, 20) + radishHalf(rnd, -12, 10, 8.5, 170) + radishHalf(rnd, 11, 10, 9, 200); } },
    { id: 'radish-slices', name: 'Radish slices', sub: 'Roots', kw: 'radish sliced thin shaved radish', form: 'scatter', cook: 'fresh', role: 'salad', g: 15, w: 41, h: 35, side: { s: 'disc', h: 2, c: '#C8304A' }, draw: slicePile('radish', 10, 15, 11, 7.5) },
    { id: 'butternut-wedges', name: 'Butternut pumpkin wedges, roasted', sub: 'Roots', kw: 'butternut pumpkin butternut squash wedges roast skin on', form: 'wedge', cook: 'roasted', role: 'veg', g: 150, w: 75, h: 55, side: { s: 'wedge', h: 18, c: '#EE9A36' }, draw: function (P, rnd) { return butternutWedge(rnd, -2, -15, -6, 70, false) + butternutWedge(rnd, 3, 0, 3, 68, true) + butternutWedge(rnd, -1, 15, 9, 64, false); } },
    { id: 'butternut-cubes', name: 'Butternut pumpkin cubes, roasted', sub: 'Roots', kw: 'butternut pumpkin butternut squash diced cubes roast', form: 'pile', cook: 'roasted', role: 'veg', g: 120, w: 55, h: 46, of: 'pumpkin-cubes', side: { s: 'pile', h: 14, c: '#F0A040' }, draw: function (P, rnd) { return heap(rnd, 11, 22, 17, function (x, y, i, q) { return dice(q, x, y, 12 + q() * 2, '#F0A040', q() * 90, { skin: i % 3 ? '' : '#D9B47A', tan: '#B9661C' }); }); } },
    { id: 'acorn-squash-half', name: 'Acorn squash half, roasted', sub: 'Roots', kw: 'acorn squash halved roast winter squash pepper squash', form: 'half', cook: 'roasted', role: 'veg', n: 1, w: 72, h: 68, side: { s: 'mound', h: 24, c: '#F2B44C' }, draw: acornHalf },
    { id: 'spaghetti-squash-half', name: 'Spaghetti squash half, roasted', sub: 'Roots', kw: 'spaghetti squash halved roast vegetable spaghetti noodle squash', form: 'half', cook: 'roasted', role: 'veg', n: 1, w: 102, h: 61, side: { s: 'slab', h: 22, c: '#F6DE98' }, draw: spaghettiHalf },
    { id: 'spaghetti-squash-strands', name: 'Spaghetti squash strands', sub: 'Roots', kw: 'spaghetti squash strands noodles shredded squash zoodles', form: 'pile', cook: 'roasted', role: 'veg', g: 120, w: 45, h: 38, side: { s: 'pile', h: 12, c: '#F4D67E' }, draw: function (P, rnd) { var d = P.blob(rnd, 22, 16, 0.12, 11); return P.shadow(d) + fill(d, '#F2D47C', 0.9) + strands(rnd, 40, 22, 16, ['#F8E4A0', '#F2CE68', '#FBEFC2', '#F4D67E'], 16, 1.4, 5, { curl: true, edgeW: 0.5 }) + gloss(-7, -7, 8, 2, '#F8E4A0', -15); } },
    { id: 'golden-beetroot-wedges', name: 'Golden beetroot wedges, roasted', sub: 'Roots', kw: 'golden beetroot golden beets yellow beetroot wedges roast', form: 'pile', cook: 'roasted', role: 'veg', g: 80, w: 48, h: 37, of: 'beetroot-wedges', side: { s: 'wedge', h: 14, c: '#F0AE36' }, draw: function (P, rnd) { return heap(rnd, 6, 16, 13, function (x, y, i, q) { return rootWedge(q, x, y, q() * 360, 22, 24, { flesh: '#F0AE36', rings: [0.38, 0.62, 0.84], ring: '#F7CC6E', skin: '#B9782A' }); }); } },
    { id: 'turnip-wedges', name: 'Turnip wedges, roasted', sub: 'Roots', kw: 'turnip wedges roast purple top turnips baby turnips', form: 'wedge', cook: 'roasted', role: 'veg', g: 100, w: 42, h: 44, side: { s: 'wedge', h: 14, c: '#F4EFDC' }, draw: function (P, rnd) { return heap(rnd, 5, 15, 12, function (x, y, i, q) { return rootWedge(q, x, y, q() * 360, 21, 26, { flesh: '#F4EFDC', rings: [0.55], ring: '#E6DEC4', skin: '#9B4A86', skin2: '#E6DEC2', tan: '#D6A85A' }); }); } },
    { id: 'swede-cubes', name: 'Swede cubes, roasted', sub: 'Roots', kw: 'swede rutabaga diced cubes roast neeps', form: 'pile', cook: 'roasted', role: 'veg', g: 100, w: 48, h: 38, side: { s: 'pile', h: 14, c: '#F2C060' }, draw: function (P, rnd) { return heap(rnd, 10, 20, 15, function (x, y, i, q) { return dice(q, x, y, 11.5 + q() * 1.5, '#F2C060', q() * 90, { skin: i % 3 ? '' : '#9A6A8C', tan: '#C98A3A' }); }); } },
    { id: 'celeriac-cubes', name: 'Celeriac cubes, roasted', sub: 'Roots', kw: 'celeriac celery root diced cubes roast', form: 'pile', cook: 'roasted', role: 'veg', g: 100, w: 49, h: 43, side: { s: 'pile', h: 14, c: '#EEE5C6' }, draw: function (P, rnd) { return heap(rnd, 10, 20, 15, function (x, y, i, q) { return dice(q, x, y, 11.5 + q() * 1.5, '#EEE5C6', q() * 90, { skin: i % 4 ? '' : '#B9A684', tan: '#CFA45E' }); }); } },
    { id: 'jicama-batons', name: 'Jicama batons', sub: 'Roots', kw: 'jicama yam bean mexican turnip batons sticks julienne', form: 'pile', cook: 'fresh', role: 'salad', g: 60, w: 59, h: 45, side: { s: 'pile', h: 10, c: '#F5F2E2' }, draw: function (P, rnd) { return heap(rnd, 12, 11, 10, function (x, y, i, q) { return batonBar(q, x, y, 25 + (q() - 0.5) * 60, 38 + q() * 6, 6.4, '#F5F2E2'); }); } },
    { id: 'ginger-root', name: 'Ginger root', sub: 'Roots', kw: 'ginger root fresh ginger knob hand rhizome', form: 'piece', cook: 'fresh', role: 'garnish', g: 50, w: 46, h: 31, side: { s: 'mound', h: 14, c: '#D6B07A' }, draw: function (P, rnd) { return knobAt(rnd, [[-13, -8, 10, 6.5, -30], [12, -9, 9, 6, 35], [0, 1, 17, 10, 4], [-15, 8, 9, 6.5, 150]], { skin: '#D6B07A', ring: '#A87E4A', flesh: '#F2E0A0', gap: 4.5 }); } },
    { id: 'galangal', name: 'Galangal', sub: 'Roots', kw: 'galangal root knob thai ginger blue ginger rhizome laos', form: 'piece', cook: 'fresh', role: 'garnish', g: 60, w: 47, h: 31, side: { s: 'mound', h: 16, c: '#E8D3AC' }, draw: function (P, rnd) { return knobAt(rnd, [[-13, -5, 12, 8.5, -18], [11, -7, 11, 8, 24], [-1, 6, 17, 9.5, -6]], { skin: '#E8D3AC', ring: '#C47F66', flesh: '#F6EED8', shoot: '#E2A0A0', gap: 3.6 }); } },
    { id: 'galangal-slices', name: 'Galangal slices', sub: 'Roots', kw: 'galangal sliced thai ginger tom yum tom kha', form: 'scatter', cook: 'fresh', role: 'garnish', g: 10, w: 42, h: 26, side: { s: 'disc', h: 2, c: '#F4ECD4' }, draw: function (P, rnd) { return heap(rnd, 6, 12, 9, function (x, y, i, q) { return discAt(q, x, y, 8 + q(), q() * 360, { skin: '#DDBF96', flesh: '#F4ECD4', rim: 0.86, oval: 0.78, rings: [0.55], ring: '#E2D2B0' }); }); } },
    // brassicas
    { id: 'broccoli-florets', name: 'Broccoli florets', sub: 'Brassicas', kw: 'broccoli florets steamed brocolli brocoli green veg', form: 'pile', cook: 'steamed', role: 'veg', g: 80, w: 49, h: 47, side: { s: 'pile', h: 22, c: '#3F7A2E' }, draw: function (P, rnd) { return heap(rnd, 5, 16, 12, function (x, y, i, q) { return floretAt(q, x, y, 11 + q() * 2, q() * 360, 'broc'); }); } },
    { id: 'broccolini', name: 'Broccolini', sub: 'Brassicas', kw: 'broccolini baby broccoli tenderstem grilled', form: 'stick', cook: 'grilled', role: 'veg', n: 4, w: 81, h: 51, side: { s: 'stick', h: 8, c: '#5E9A3A' }, draw: function (P, rnd) {
      var out = '';
      [-14, -5, 4, 13].forEach(function (a, i) {
        var tf = P.at(-36, 0, a), len = 66 - i % 2 * 8, d = 'M0 -2.2 L' + n(len) + ' -1.6 L' + n(len) + ' 1.6 L0 2.2 Z';
        out += sh(d, tf) + P.g(tf, P.path(d, '#7EA453', '#557F2E', 0.7) + P.leaf(12, 5, '#4F8A2F', len * 0.45, -4, -30) + P.line(len * 0.2, -0.6, len * 0.8, -0.6, '#B9D27A', 0.6) + P.line(len * 0.3, -1.6, len * 0.3 + 2.5, 1.6, '#3A4A22', 1.2, { opacity: '0.6' }) + P.line(len * 0.6, -1.6, len * 0.6 + 2.5, 1.6, '#3A4A22', 1.2, { opacity: '0.6' })) + floretAt(rnd, -36 + Math.cos(a * PI / 180) * (len + 5), Math.sin(a * PI / 180) * (len + 5), 8.5, a + 180, 'broc');
      });
      return out;
    } },
    { id: 'cauliflower-florets', name: 'Cauliflower florets', sub: 'Brassicas', kw: 'cauliflower florets steamed cauli', form: 'pile', cook: 'steamed', role: 'veg', g: 80, w: 48, h: 37, side: { s: 'pile', h: 22, c: '#F2EAD2' }, draw: function (P, rnd) { return heap(rnd, 4, 15, 11, function (x, y, i, q) { return floretAt(q, x, y, 12 + q() * 2, q() * 360, 'cauli'); }); } },
    { id: 'cauliflower-roasted', name: 'Cauliflower, roasted', sub: 'Brassicas', kw: 'roast cauliflower florets halved charred cauli', form: 'pile', cook: 'roasted', role: 'veg', g: 100, w: 48, h: 50, side: { s: 'pile', h: 18, c: '#EEDFB6' }, draw: function (P, rnd) { return heap(rnd, 6, 17, 13, function (x, y, i, q) { return i % 2 ? cauliHalf(q, x, y, q() * 360, 0.9 + q() * 0.2) : floretAt(q, x, y, 11 + q() * 2, q() * 360, 'roast'); }); } },
    { id: 'cauliflower-bites', name: 'Cauliflower bites, battered', sub: 'Brassicas', kw: 'battered cauliflower bites fried cauli popcorn buffalo cauliflower', form: 'pile', cook: 'battered', role: 'sidedish', g: 120, w: 50, h: 40, side: { s: 'pile', h: 20, c: '#E0AA58' }, draw: function (P, rnd) { return heap(rnd, 8, 19, 14, function (x, y, i, q) { return biteAt(q, x, y, 8.5 + q() * 2.5); }); } },
    { id: 'red-cabbage-shredded', name: 'Red cabbage, shredded', sub: 'Brassicas', kw: 'red cabbage purple cabbage shredded slaw', form: 'pile', cook: 'raw', role: 'salad', g: 40, w: 51, h: 46, side: { s: 'pile', h: 12, c: '#7A2E6A' }, draw: slaw({ rx: 22, ry: 17, base: '#5E1E50', count: 54, cols: ['#7A2E6A', '#8E3A7E', '#6A2460', '#B36AA4', '#F0E4EE', '#7A2E6A'] }) },
    { id: 'pak-choy', name: 'Pak choy, halved', sub: 'Brassicas', kw: 'pak choy bok choy baby bok choi asian greens halved', form: 'half', cook: 'steamed', role: 'veg', n: 2, w: 88, h: 57, side: { s: 'leafy', h: 10, c: '#3F7A2E' }, draw: function (P, rnd) { return pakChoyHalf(rnd, -2, -13, -4) + pakChoyHalf(rnd, 2, 13, 184); } },
    { id: 'brussels-sprouts', name: 'Brussels sprouts, roasted halves', sub: 'Brassicas', kw: 'brussels sprouts brussel sprouts halved roasted', form: 'half', cook: 'roasted', role: 'veg', g: 100, w: 46, h: 37, side: { s: 'pile', h: 14, c: '#5E8C3A' }, draw: function (P, rnd) { return heap(rnd, 7, 16, 12, function (x, y, i, q) { return sproutHalf(q, x, y, 9.5 + q() * 1.5, q() * 360); }); } },
    { id: 'wombok-leaves', name: 'Wombok leaves', sub: 'Brassicas', kw: 'wombok wong bok napa cabbage chinese cabbage leaves', form: 'leaf', cook: 'fresh', role: 'salad', n: 2, w: 84, h: 69, side: { s: 'leafy', h: 8, c: '#D2E39A' }, draw: function (P, rnd) { return wombokLeaf(rnd, -3, -11, -6, 76, 40) + wombokLeaf(rnd, 3, 11, 176, 72, 38); } },
    { id: 'savoy-cabbage-leaves', name: 'Savoy cabbage leaves', sub: 'Brassicas', kw: 'savoy cabbage leaves crinkly cabbage rolls', form: 'leaf', cook: 'steamed', role: 'veg', n: 2, w: 88, h: 66, side: { s: 'leafy', h: 10, c: '#5E8E3A' }, draw: function (P, rnd) { return savoyLeaf(rnd, -12, -4, -20, 54, 48) + savoyLeaf(rnd, 13, 5, 160, 52, 46); } },
    { id: 'cavolo-nero', name: 'Cavolo nero leaves', sub: 'Brassicas', kw: 'cavolo nero tuscan kale lacinato black kale dinosaur kale', form: 'leaf', cook: 'fresh', role: 'veg', n: 3, w: 85, h: 50, side: { s: 'leafy', h: 8, c: '#2F4F3A' }, draw: function (P, rnd) { return cavoloLeaf(rnd, 4, -12, -6, 70, 17) + cavoloLeaf(rnd, 0, 0, 2, 74, 18) + cavoloLeaf(rnd, 5, 12, 8, 68, 16); } },
    { id: 'curly-kale', name: 'Curly kale', sub: 'Brassicas', kw: 'curly kale leaves torn fried kale crispy kale kale chips', form: 'pile', cook: 'fresh', role: 'veg', g: 30, w: 43, h: 42, side: { s: 'leafy', h: 12, c: '#3F7230' }, draw: function (P, rnd) { return heap(rnd, 7, 15, 11, function (x, y, i, q) { return kaleBit(q, x, y, 1 + q() * 0.2); }); } },
    { id: 'broccoli-rabe', name: 'Broccoli rabe', sub: 'Brassicas', kw: 'broccoli rabe rapini cime di rapa turnip tops broccoli raab', form: 'stick', cook: 'steamed', role: 'veg', n: 4, w: 71, h: 80, side: { s: 'stick', h: 8, c: '#4A8436' }, draw: function (P, rnd) { var out = ''; for (var i = 0; i < 4; i++) out += rabeAt(rnd, -36, (i - 1.5) * 9, (i - 1.5) * 6, 60 - (i % 2) * 6); return out; } },
    { id: 'kohlrabi-slices', name: 'Kohlrabi slices', sub: 'Brassicas', kw: 'kohlrabi sliced rounds german turnip', form: 'slices', cook: 'fresh', role: 'salad', n: 4, w: 101, h: 47, side: { s: 'disc', h: 3, c: '#E9F0CA' }, draw: function (P, rnd) { var out = ''; for (var i = 0; i < 4; i++) { var c = i - 1.5; out += discAt(rnd, c * 19, 0.6 * c * c + Math.sin(i * 2.3) * 1.5, 17 + rnd(), rnd() * 360, { skin: '#8DB255', flesh: '#E9F0CA', rim: 0.9, rings: [0.76, 0.42], ring: '#D6E2AE' }); } return out; } },
    // fruiting veg
    { id: 'cherry-tomatoes', name: 'Cherry tomatoes', sub: 'Fruiting veg', kw: 'cherry tomatoes whole truss grape tomatoes', form: 'whole', cook: 'fresh', role: 'salad', n: 5, w: 41, h: 40, side: { s: 'mound', h: 17, c: '#D9473B' }, draw: function (P, rnd) { return cherryAt(rnd, -6, -10, 8.5, true) + cherryAt(rnd, 11, -8, 8.2) + cherryAt(rnd, -13, 5, 8.4) + cherryAt(rnd, 4, 6, 8.6, true) + cherryAt(rnd, -3, 13, 8, true); } },
    { id: 'cherry-tomato-halves', name: 'Cherry tomatoes, halved', sub: 'Fruiting veg', kw: 'cherry tomatoes halved cut grape tomatoes', form: 'half', cook: 'fresh', role: 'salad', n: 6, w: 35, h: 35, side: { s: 'disc', h: 8, c: '#D9473B' }, draw: function (P, rnd) { return heap(rnd, 6, 16, 12, function (x, y, i, q) { return cherryHalf(q, x, y, 8, q() * 360); }); } },
    { id: 'tomato-slices', name: 'Tomato slices', sub: 'Fruiting veg', kw: 'tomato sliced rounds burger tomato', form: 'slices', cook: 'fresh', role: 'salad', n: 3, w: 89, h: 41, side: { s: 'disc', h: 5, c: '#D33F33' }, draw: slices('tomato', 3, 21, { arc: 0.8 }) },
    { id: 'heirloom-tomato-slices', name: 'Heirloom tomato slices', sub: 'Fruiting veg', kw: 'heirloom heritage tomatoes mixed colours yellow green zebra black russian', form: 'slices', cook: 'fresh', role: 'salad', n: 4, w: 74, h: 67, side: { s: 'disc', h: 5, c: '#D9473B' }, draw: function (P, rnd) {
      var T = [{ skin: '#E8A82A', flesh: '#F2C24A', gel: '#F6DA7E', seed: '#FBF0C0' }, { skin: '#C9302A' }, { skin: '#7E9A3A', flesh: '#A8BC5A', gel: '#CFDB8E', seed: '#EEF0C4' }, { skin: '#5E2A2E', flesh: '#8E3A3A', gel: '#B8605A', seed: '#E8B890' }];
      return [[-18, -14, 20], [18, -12, 19], [-16, 14, 18], [16, 14, 20]].map(function (p, i) { return sliceAt('tomato', rnd, p[0], p[1], p[2], rnd() * 360, Object.assign({ wob: 0.07, loc: 6 }, T[i])); }).join('');
    } },
    { id: 'zucchini-slices', name: 'Zucchini slices, grilled', sub: 'Fruiting veg', kw: 'zucchini courgette rounds grilled chargrilled zuke', form: 'pile', cook: 'grilled', role: 'veg', g: 60, w: 55, h: 45, side: { s: 'disc', h: 6, c: '#2E5A26' }, draw: slicePile('zucchini', 8, 18, 13, 11, { grill: true }) },
    { id: 'zucchini-ribbons', name: 'Zucchini ribbons', sub: 'Fruiting veg', kw: 'zucchini ribbons shaved courgette peeled', form: 'pile', cook: 'raw', role: 'salad', g: 40, w: 76, h: 36, side: { s: 'leafy', h: 8, c: '#E6EDB8' }, draw: function (P, rnd) {
      return heap(rnd, 6, 10, 10, function (x, y, i, q) { var rb = ribbon(62, 9, 3.4, 1.5 + q(), q() * 6), tf = P.at(x, y, (q() - 0.5) * 60); return sh(rb.d, tf) + P.g(tf, P.path(rb.d, '#E6EDB8', '#A8B878', 0.6) + P.path(P.smooth(rb.top, true), 'none', '#3F6E2A', 1.4) + P.path(P.smooth(rb.bot, true), 'none', '#6E9A3E', 0.9)); });
    } },
    { id: 'capsicum-strips', name: 'Capsicum strips, red', sub: 'Fruiting veg', kw: 'capsicum red pepper bell pepper strips sliced', form: 'pile', cook: 'raw', role: 'veg', g: 40, w: 49, h: 52, side: { s: 'pile', h: 10, c: '#C9302A' }, draw: function (P, rnd) { return heap(rnd, 10, 9, 8, function (x, y, i, q) { return stripAt(q, x, y, q() * 360, 42, 6, '#C9302A'); }); } },
    { id: 'capsicum-strips-green', name: 'Capsicum strips, green', sub: 'Fruiting veg', kw: 'green capsicum green pepper strips', form: 'pile', cook: 'raw', role: 'veg', g: 40, w: 54, h: 47, of: 'capsicum-strips', side: { s: 'pile', h: 10, c: '#4F8A2F' }, draw: function (P, rnd) { return heap(rnd, 10, 9, 8, function (x, y, i, q) { return stripAt(q, x, y, q() * 360, 42, 6, '#4F8A2F'); }); } },
    { id: 'capsicum-strips-yellow', name: 'Capsicum strips, yellow', sub: 'Fruiting veg', kw: 'yellow capsicum yellow pepper strips', form: 'pile', cook: 'raw', role: 'veg', g: 40, w: 55, h: 50, of: 'capsicum-strips', side: { s: 'pile', h: 10, c: '#F2C230' }, draw: function (P, rnd) { return heap(rnd, 10, 9, 8, function (x, y, i, q) { return stripAt(q, x, y, q() * 360, 42, 6, '#F2C230'); }); } },
    { id: 'capsicum-strips-mixed', name: 'Capsicum strips, mixed', sub: 'Fruiting veg', kw: 'tri colour capsicum peppers red green yellow fajita', form: 'pile', cook: 'raw', role: 'veg', g: 60, w: 60, h: 61, of: 'capsicum-strips', side: { s: 'pile', h: 12, c: '#C9302A' }, draw: function (P, rnd) { return heap(rnd, 13, 11, 10, function (x, y, i, q) { return stripAt(q, x, y, q() * 360, 42, 6, ['#C9302A', '#4F8A2F', '#F2C230'][i % 3]); }); } },
    { id: 'cucumber-slices', name: 'Cucumber slices', sub: 'Fruiting veg', kw: 'cucumber sliced rounds lebanese continental cucumber', form: 'slices', cook: 'fresh', role: 'salad', n: 6, w: 82, h: 25, side: { s: 'disc', h: 3, c: '#3E6B2E' }, draw: slices('cucumber', 6, 11.5, { gap: 1.05, arc: 0.4 }) },
    { id: 'avocado-half', name: 'Avocado half with stone', sub: 'Fruiting veg', kw: 'avocado avo half halved pit seed stone', form: 'half', cook: 'fresh', role: 'salad', n: 1, w: 65, h: 42, side: { s: 'mound', h: 20, c: '#B9D26A' }, draw: avocadoHalf },
    { id: 'avocado-fan', name: 'Avocado, sliced fan', sub: 'Fruiting veg', kw: 'avocado avo sliced fanned slices', form: 'fan', cook: 'fresh', role: 'salad', g: 80, w: 77, h: 57, side: { s: 'layer', h: 8, c: '#D2E384' }, draw: function (P) { var out = ''; for (var i = 0; i < 7; i++) out += P.g('rotate(' + n(-40 + i * 13) + ' 0 34)', avoSlice()); return P.g(tr(3, -2), out); } },
    { id: 'smashed-avocado', name: 'Smashed avocado', sub: 'Fruiting veg', kw: 'smashed avo crushed avocado smashed avocado breakfast', form: 'mound', cook: 'fresh', role: 'topping', g: 70, w: 52, h: 43, side: { s: 'mound', h: 12, c: '#A6C45E' }, draw: function (P, rnd) {
      var out = mound(rnd, 27, 22, '#A6C45E', 0.14);
      out += P.scatter(rnd, 16, 22, 17, function (x, y, i, q) { return P.path(P.blob(q, 2.4 + q() * 3, 1.8 + q() * 2, 0.3, 6, x, y), pick(q, ['#C9DC86', '#8DB255', '#D6E496', '#7E9E46']), null, 0); });
      return out + sprinkle(rnd, 10, 20, 15, ['#FFFFFF', '#2E2A28'], 0.5) + sprinkle(rnd, 5, 18, 14, ['#C9402A'], 0.7);
    } },
    { id: 'guacamole', name: 'Guacamole', sub: 'Fruiting veg', kw: 'guacamole guac avocado dip mexican', form: 'mound', cook: 'fresh', role: 'sauce', g: 50, w: 49, h: 41, side: { s: 'mound', h: 12, c: '#8DB255' }, draw: function (P, rnd) {
      var out = mound(rnd, 25, 21, '#8DB255', 0.08);
      out += P.path('M2 1 Q6 -4 1 -8 Q-8 -10 -12 -2 Q-14 8 -4 12 Q10 15 16 4', 'none', '#6E9A3E', 2.6, { 'stroke-linecap': 'round' }) + P.path('M2 0 Q5 -4 0.6 -7 Q-7 -9 -11 -2 Q-13 7 -4 11 Q9 14 15 3', 'none', '#BDD683', 1.3, { 'stroke-linecap': 'round' });
      return out + P.scatter(rnd, 12, 20, 16, function (x, y, i, q) { return i % 3 === 0 ? P.rect(x - 1.2, y - 1.2, 2.4, 2.4, 0.5, '#D9473B') : i % 3 === 1 ? P.rect(x - 1, y - 1, 2, 2, 0.5, '#F4F0E2') : P.leaf(3.4, 2.2, '#3F7A2A', x, y, q() * 360, { vein: false }); });
    } },
    { id: 'eggplant-half', name: 'Eggplant half, roasted', sub: 'Fruiting veg', kw: 'eggplant aubergine roasted halved scored miso', form: 'half', cook: 'roasted', role: 'veg', n: 1, w: 116, h: 43, side: { s: 'slab', h: 20, c: '#C9A06A' }, draw: function (P, rnd) { return P.g(tr(8, 0), eggplantHalf(P, rnd)); } },
    { id: 'eggplant-slices', name: 'Eggplant slices, grilled', sub: 'Fruiting veg', kw: 'eggplant aubergine rounds grilled chargrilled', form: 'slices', cook: 'grilled', role: 'veg', n: 3, w: 81, h: 37, side: { s: 'disc', h: 6, c: '#E6D09A' }, draw: slices('eggplant', 3, 18, { grill: true, gap: 1.3, arc: 0.6 }) },
    { id: 'corn-cob', name: 'Corn on the cob', sub: 'Fruiting veg', kw: 'corn cob sweetcorn grilled buttered maize elote', form: 'piece', cook: 'grilled', role: 'veg', n: 1, w: 85, h: 31, side: { s: 'stick', h: 30, c: '#F2C94C' }, draw: function (P, rnd) { return cobAt(rnd, 0, 0, 0, 84, 15, { butter: true }); } },
    { id: 'corn-ribs', name: 'Corn ribs', sub: 'Fruiting veg', kw: 'corn ribs riblets fried corn spiced', form: 'pile', cook: 'fried', role: 'sidedish', n: 4, w: 64, h: 54, side: { s: 'pile', h: 14, c: '#F2C440' }, draw: function (P, rnd) { return cornRib(rnd, -6, -14, -12) + cornRib(rnd, 6, -3, 10) + cornRib(rnd, -4, 8, -4) + cornRib(rnd, 6, 18, 14); } },
    { id: 'corn-kernels', name: 'Corn kernels', sub: 'Fruiting veg', kw: 'corn kernels sweetcorn niblets charred corn', form: 'scatter', cook: 'steamed', role: 'veg', g: 40, w: 47, h: 37, side: { s: 'pile', h: 6, c: '#F2C94C' }, draw: function (P, rnd) { return heap(rnd, 40, 22, 17, function (x, y, i, q) { return kernelAt(x, y, q() * 360, 1, q() < 0.12 ? '#D9A030' : '#F2C94C'); }); } },
    { id: 'pineapple-ring', name: 'Pineapple ring, grilled', sub: 'Fruiting veg', kw: 'pineapple ring slice grilled burger the lot hawaiian', form: 'ring', cook: 'grilled', role: 'topping', n: 1, w: 59, h: 59, side: { s: 'ring', h: 8, c: '#F2CB55' }, draw: pineappleRing },
    { id: 'ratatouille', name: 'Ratatouille', sub: 'Fruiting veg', kw: 'ratatouille provencal vegetable stew eggplant zucchini capsicum', form: 'mound', cook: 'braised', role: 'veg', g: 150, w: 70, h: 56, side: { s: 'mound', h: 16, c: '#B5301F' }, draw: ratatouille },
    { id: 'tomatillos', name: 'Tomatillos', sub: 'Fruiting veg', kw: 'tomatillo tomatillos husk mexican green tomato salsa verde', form: 'whole', cook: 'fresh', role: 'salad', n: 3, w: 65, h: 60, side: { s: 'mound', h: 20, c: '#8DB648' }, draw: function (P, rnd) { return tomatilloAt(rnd, -16, -10, 12, 20, false) + tomatilloAt(rnd, 15, -7, 11.5, 0, true) + tomatilloAt(rnd, -3, 14, 12, 40, true); } },
    { id: 'okra', name: 'Okra', sub: 'Fruiting veg', kw: 'okra ladies fingers bhindi gumbo whole pods', form: 'whole', cook: 'fresh', role: 'veg', n: 4, w: 64, h: 50, side: { s: 'stick', h: 12, c: '#5E9A3A' }, draw: function (P, rnd) { var out = ''; [[-2, -14, -10], [3, -4, 4], [-3, 6, -4], [2, 15, 10]].forEach(function (p) { out += okraAt(rnd, p[0], p[1], p[2], 52, 13); }); return out; } },
    { id: 'okra-sliced', name: 'Okra, sliced', sub: 'Fruiting veg', kw: 'okra sliced rounds ladies fingers bhindi gumbo', form: 'scatter', cook: 'fresh', role: 'veg', g: 40, w: 37, h: 34, side: { s: 'pile', h: 6, c: '#5E9A3A' }, draw: function (P, rnd) { return heap(rnd, 10, 15, 11, function (x, y, i, q) { return okraRound(q, x, y, 6.2 + q() * 0.8, q() * 72); }); } },
    { id: 'yellow-squash-slices', name: 'Yellow squash slices', sub: 'Fruiting veg', kw: 'yellow squash summer squash yellow zucchini golden zucchini crookneck sliced rounds sauteed', form: 'pile', cook: 'fried', role: 'veg', g: 60, w: 54, h: 43, side: { s: 'disc', h: 5, c: '#E6B42A' }, draw: function (P, rnd) { return heap(rnd, 7, 16, 12, function (x, y, i, q) { return discAt(q, x, y, 10 + q(), q() * 360, { skin: '#E6B42A', flesh: '#F6ECBE', rim: 0.86, rings: [0.52], ring: '#EEDFA2', seeds: 6, seedCol: '#FBF7E4', tan: '#D9A048' }); }); } },
    // beans, peas and shoots
    { id: 'peas', name: 'Peas', sub: 'Beans, peas and shoots', kw: 'green peas garden peas minted peas baby peas', form: 'pile', cook: 'steamed', role: 'veg', g: 60, w: 48, h: 41, side: { s: 'pile', h: 10, c: '#7EA453' }, draw: function (P, rnd) { return heap(rnd, 62, 22, 18, function (x, y, i, q) { return peaAt(x, y, 2.6); }); } },
    { id: 'green-beans', name: 'Green beans', sub: 'Beans, peas and shoots', kw: 'green beans french beans string beans steamed', form: 'stick', cook: 'steamed', role: 'veg', g: 60, w: 80, h: 40, side: { s: 'stick', h: 7, c: '#5E9A3A' }, draw: function (P, rnd) { var out = ''; for (var i = 0; i < 8; i++) out += podAt(rnd, (rnd() - 0.5) * 8, (i - 3.5) * 4.4, (rnd() - 0.5) * 10, { len: 70, wid: 6, col: '#5E9A3A', bend: 1.5 + rnd() * 2, cap: '#7EA453' }); return out; } },
    { id: 'snow-peas', name: 'Snow peas', sub: 'Beans, peas and shoots', kw: 'snow peas mange tout flat pea pods', form: 'pile', cook: 'steamed', role: 'veg', g: 40, w: 58, h: 38, side: { s: 'pile', h: 8, c: '#9CC067' }, draw: function (P, rnd) { return heap(rnd, 5, 7, 10, function (x, y, i, q) { return podAt(q, x, y, (q() - 0.5) * 80, { len: 46, wid: 13, col: '#9CC067', bend: 1.5, flat: true, peas: 5, seam: true, cap: '#5E8C3A' }); }); } },
    { id: 'sugar-snaps', name: 'Sugar snap peas', sub: 'Beans, peas and shoots', kw: 'sugar snap peas snaps pea pods', form: 'pile', cook: 'steamed', role: 'veg', g: 40, w: 52, h: 33, side: { s: 'pile', h: 9, c: '#6EA43A' }, draw: function (P, rnd) {
      var out = heap(rnd, 5, 6, 9, function (x, y, i, q) { return podAt(q, x, y, (q() - 0.5) * 70, { len: 40, wid: 11, col: '#6EA43A', bumps: 5, amp: 0.2, bend: 2, seam: true, cap: '#4F7F2F' }); });
      var tf = P.at(6, 12, -8), d = podD(38, 13, 1, 5, 0.1, false);
      return out + sh(d, tf) + P.g(tf, P.path(d, '#6EA43A', '#4A7A26', 0.7) + P.path(podD(32, 8, 1, 0, 0, false), '#D6E8A6', null, 0) + [-12, -6, 0, 6, 12].map(function (px) { return peaAt(px, -0.4, 2.8, '#8DB255'); }).join(''));
    } },
    { id: 'edamame', name: 'Edamame', sub: 'Beans, peas and shoots', kw: 'edamame soy beans soybean pods salted japanese', form: 'pile', cook: 'steamed', role: 'sidedish', g: 60, w: 48, h: 53, side: { s: 'pile', h: 10, c: '#7EA453' }, draw: function (P, rnd) { return heap(rnd, 12, 14, 12, function (x, y, i, q) { return edamameAt(q, x, y, q() * 360); }); } },
    { id: 'asparagus', name: 'Asparagus spears', sub: 'Beans, peas and shoots', kw: 'asparagus spears grilled sparrow grass asparagras', form: 'stick', cook: 'grilled', role: 'veg', n: 5, w: 108, h: 43, side: { s: 'stick', h: 7, c: '#6E9A3E' }, draw: function (P, rnd) { var out = ''; for (var i = 0; i < 5; i++) out += spearAt(rnd, (rnd() - 0.5) * 8, (i - 2) * 7.2, (i - 2) * 2.2, 100, 7); return out; } },
    { id: 'bean-sprouts', name: 'Bean sprouts', sub: 'Beans, peas and shoots', kw: 'bean sprouts mung bean shoots beansprouts', form: 'pile', cook: 'fresh', role: 'salad', g: 30, w: 57, h: 51, side: { s: 'pile', h: 8, c: '#F4F1E0' }, draw: function (P, rnd) { return heap(rnd, 28, 14, 11, function (x, y, i, q) { return sproutAt(q, x, y); }); } },
    { id: 'chickpeas', name: 'Chickpeas', sub: 'Beans, peas and shoots', kw: 'chickpeas chick peas garbanzo beans roasted chickpeas', form: 'pile', cook: 'roasted', role: 'veg', g: 50, w: 45, h: 36, side: { s: 'pile', h: 10, c: '#E2C48A' }, draw: function (P, rnd) { return heap(rnd, 40, 20, 16, function (x, y, i, q) { return chickpeaAt(q, x, y, 3); }); } },
    { id: 'mushy-peas', name: 'Mushy peas', sub: 'Beans, peas and shoots', kw: 'mushy peas crushed peas smashed peas pea mash fish and chips', form: 'mound', cook: 'steamed', role: 'veg', g: 100, w: 54, h: 45, side: { s: 'mound', h: 14, c: '#8DB255' }, draw: function (P, rnd) { return mound(rnd, 27, 22, '#8DB255') + P.scatter(rnd, 14, 22, 17, function (x, y, i, q) { return P.path(P.blob(q, 2.6, 2, 0.3, 6, x, y), i % 2 ? '#7EA453' : '#A6C46A', '#5E8C3A', 0.4); }) + P.leaf(12, 7, '#3F8A2E', 2, -4, -30, { edge: '#2A6A1E', vc: '#7EB85A' }) + P.leaf(10, 6, '#4F9A36', 10, -2, 20, { edge: '#2A6A1E', vc: '#7EB85A' }) + P.hl(-9, -9, 7, 2.4, '#FFFFFF', 0.3, -20); } },
    // onions
    { id: 'red-onion-rings', name: 'Red onion rings, raw', sub: 'Onions', kw: 'red onion rings raw sliced spanish onion burger', form: 'ring', cook: 'raw', role: 'topping', g: 20, w: 45, h: 36, side: { s: 'ring', h: 3, c: '#8E3A7A' }, draw: function (P, rnd) { return heap(rnd, 7, 12, 9, function (x, y, i, q) { return onionRing(x, y, 7 + q() * 7); }); } },
    { id: 'red-onion-slices', name: 'Red onion, thinly sliced', sub: 'Onions', kw: 'red onion sliced slivers half moons spanish onion', form: 'scatter', cook: 'raw', role: 'garnish', g: 20, w: 44, h: 38, side: { s: 'layer', h: 3, c: '#8E3A7A' }, draw: function (P, rnd) { return slivers(rnd, 20, 15, 11, '#8E3A7A', '#F0E2EE', 1.6); } },
    { id: 'pickled-red-onion', name: 'Pickled red onion', sub: 'Onions', kw: 'pickled red onion quick pickle pink onions', form: 'scatter', cook: 'cured', role: 'garnish', g: 20, w: 46, h: 33, side: { s: 'layer', h: 3, c: '#D9508A' }, draw: function (P, rnd) { return strands(rnd, 22, 17, 13, ['#D9508A', '#E86AA0', '#C23A7A'], 16, 1.6, 6, { curl: true }) + slivers(rnd, 4, 13, 10, '#C23A7A', '#F2A6C8', 1.4); } },
    { id: 'caramelised-onion', name: 'Caramelised onion', sub: 'Onions', kw: 'caramelised onion caramelized onions onion jam fried onions burger', form: 'mound', cook: 'fried', role: 'topping', g: 40, w: 49, h: 36, side: { s: 'mound', h: 8, c: '#8A4E22' }, draw: function (P, rnd) { var d = P.blob(rnd, 22, 16, 0.14, 11); return P.shadow(d) + P.path(d, '#6E3A1A', '#4A2410', 0.9) + strands(rnd, 36, 18, 13, ['#8A4E22', '#A8662E', '#5E3014', '#B9783A'], 16, 1.8, 5, { curl: true, edgeW: 0.6 }) + P.hl(-6, -6, 8, 2, '#FFFFFF', 0.25, -15); } },
    { id: 'fried-onions', name: 'Crispy fried onions', sub: 'Onions', kw: 'crispy onions fried onion strings shoestring onions crunchy', form: 'pile', cook: 'fried', role: 'topping', g: 20, w: 48, h: 46, side: { s: 'pile', h: 10, c: '#B9772E' }, draw: function (P, rnd) { return strands(rnd, 34, 21, 17, ['#B9772E', '#D99A4A', '#8A5420', '#C98A3A'], 18, 1.3, 7, { curl: true, edgeW: 0.7 }) + P.crumbs(rnd, 10, 16, 12, ['#6E3A14', '#E8B860'], 0.9); } },
    { id: 'spring-onion-slices', name: 'Spring onion, sliced', sub: 'Onions', kw: 'spring onion shallots scallions green onion sliced', form: 'scatter', cook: 'fresh', role: 'garnish', g: 5, w: 41, h: 33, side: { s: 'layer', h: 2, c: '#5E9A3A' }, draw: function (P, rnd) { return P.scatter(rnd, 30, 19, 16, function (x, y, i, q) { var g = i % 4 !== 0; return P.circle(x, y, 1.6 + q() * 0.8, g ? '#C9E09A' : '#F4F6E6', g ? '#4F8F2F' : '#C9D8A8', 0.9); }); } },
    { id: 'charred-leek', name: 'Charred leek', sub: 'Onions', kw: 'leek halved charred grilled baby leeks', form: 'half', cook: 'grilled', role: 'veg', n: 2, w: 103, h: 44, side: { s: 'stick', h: 14, c: '#E6EDC6' }, draw: function (P, rnd) { return leekHalf(rnd, -2, -11, -3, 100, 20) + leekHalf(rnd, 2, 11, 2, 96, 19); } },
    { id: 'garlic-head', name: 'Garlic, whole head', sub: 'Onions', kw: 'garlic head bulb whole garlic', form: 'whole', cook: 'fresh', role: 'garnish', n: 1, w: 42, h: 47, side: { s: 'mound', h: 30, c: '#F5F1E6' }, draw: garlicHead },
    { id: 'garlic-cloves', name: 'Garlic cloves, peeled', sub: 'Onions', kw: 'garlic cloves peeled whole cloves', form: 'scatter', cook: 'fresh', role: 'garnish', n: 7, w: 36, h: 33, side: { s: 'pile', h: 8, c: '#F4ECCF' }, draw: function (P, rnd) { return heap(rnd, 7, 14, 10, function (x, y, i, q) { return cloveAt(q, x, y, q() * 360, 0.95 + q() * 0.15); }); } },
    // stems and bulbs
    { id: 'celery-sticks', name: 'Celery sticks', sub: 'Stems and bulbs', kw: 'celery sticks stalks ribs batons crudites wings', form: 'stick', cook: 'fresh', role: 'salad', n: 3, w: 66, h: 36, side: { s: 'stick', h: 8, c: '#A6C564' }, draw: function (P, rnd) { return stalkAt(rnd, 0, -10, -4, 64, 9.5, '#A6C564') + stalkAt(rnd, 2, 0, 1, 62, 9, '#A6C564') + stalkAt(rnd, -1, 10, 5, 64, 9.5, '#A6C564'); } },
    { id: 'celery-sliced', name: 'Celery, sliced', sub: 'Stems and bulbs', kw: 'celery sliced chopped diced celery mirepoix', form: 'scatter', cook: 'fresh', role: 'salad', g: 30, w: 39, h: 30, side: { s: 'pile', h: 6, c: '#B9D47E' }, draw: function (P, rnd) { return heap(rnd, 15, 16, 12, function (x, y, i, q) { return celeryBit(q, x, y, q() * 360, 0.95 + q() * 0.2); }); } },
    { id: 'fennel-halves', name: 'Fennel bulb, halved', sub: 'Stems and bulbs', kw: 'fennel bulb halved baby fennel finocchio', form: 'half', cook: 'fresh', role: 'veg', n: 2, w: 88, h: 58, side: { s: 'mound', h: 22, c: '#EEF2D6' }, draw: function (P, rnd) { return fennelHalf(rnd, -20, 3, -14, 0.82) + fennelHalf(rnd, 21, 0, 12, 0.8); } },
    { id: 'fennel-shaved', name: 'Fennel, shaved', sub: 'Stems and bulbs', kw: 'shaved fennel thin sliced fennel salad fronds finocchio', form: 'pile', cook: 'raw', role: 'salad', g: 30, w: 52, h: 41, side: { s: 'leafy', h: 6, c: '#EEF3D8' }, draw: function (P, rnd) { return heap(rnd, 9, 14, 11, function (x, y, i, q) { return fennelShave(q, x, y, (q() - 0.5) * 70 + (i % 2) * 180, 0.95 + q() * 0.3); }) + P.scatter(rnd, 3, 12, 9, function (x, y, i, q) { return frondAt(q, x, y, q() * 360, 1); }); } },
    { id: 'rhubarb-stalks', name: 'Rhubarb stalks, roasted', sub: 'Stems and bulbs', kw: 'rhubarb stalks batons roasted poached forced rhubarb', form: 'stick', cook: 'roasted', role: 'dside', n: 4, w: 58, h: 54, side: { s: 'stick', h: 9, c: '#B8304A' }, draw: function (P, rnd) { var out = ''; [[-2, -16, -8], [3, -5, -2], [-3, 6, 4], [2, 17, 9]].forEach(function (p, i) { out += stalkAt(rnd, p[0], p[1], p[2], 52, 11, i % 2 ? '#C8405A' : '#B8304A', { groove: false }); }); return out; } },
    { id: 'globe-artichoke', name: 'Globe artichoke', sub: 'Stems and bulbs', kw: 'globe artichoke whole artichokes steamed', form: 'whole', cook: 'steamed', role: 'veg', n: 1, w: 72, h: 48, side: { s: 'mound', h: 40, c: '#7E9A5A' }, draw: artichoke },
    { id: 'artichoke-hearts', name: 'Artichoke hearts, quartered', sub: 'Stems and bulbs', kw: 'artichoke hearts quartered marinated antipasto', form: 'pile', cook: 'cured', role: 'veg', g: 60, w: 46, h: 39, side: { s: 'pile', h: 10, c: '#D6D08A' }, draw: function (P, rnd) { return heap(rnd, 6, 14, 11, function (x, y, i, q) { return heartQuarter(q, x, y, q() * 360, 1 + q() * 0.15); }); } },
    { id: 'hearts-of-palm', name: 'Hearts of palm, sliced', sub: 'Stems and bulbs', kw: 'hearts of palm palm hearts heart of palm sliced rounds palmito', form: 'scatter', cook: 'fresh', role: 'salad', g: 50, w: 52, h: 42, side: { s: 'disc', h: 6, c: '#F6F2E2' }, draw: function (P, rnd) { return heap(rnd, 8, 15, 12, function (x, y, i, q) { return discAt(q, x, y, 9 + q(), q() * 360, { skin: '#E9E2C4', flesh: '#F6F2E2', rim: 0.9, rings: [0.66, 0.4], ring: '#E4DCC0', core: '#ECE4C8' }); }); } },
    // mushrooms
    { id: 'button-mushrooms', name: 'Button mushrooms, sautéed', sub: 'Mushrooms', kw: 'button mushrooms sauteed garlic mushrooms whole champignons', form: 'pile', cook: 'fried', role: 'veg', g: 80, w: 48, h: 35, side: { s: 'pile', h: 16, c: '#D9B98A' }, draw: function (P, rnd) { return heap(rnd, 6, 15, 11, function (x, y, i, q) { return i % 3 === 1 ? mushSlice(q, x, y, q() * 360, 20, 0.5) : buttonCap(q, x, y, 10 + q() * 2); }); } },
    { id: 'sliced-mushrooms', name: 'Sliced mushrooms', sub: 'Mushrooms', kw: 'sliced mushrooms sauteed mushroom slices', form: 'pile', cook: 'fried', role: 'veg', g: 60, w: 50, h: 44, side: { s: 'pile', h: 8, c: '#D9B98A' }, draw: function (P, rnd) { return heap(rnd, 10, 17, 13, function (x, y, i, q) { return mushSlice(q, x, y, q() * 360, 16 + q() * 4, 0.3 + q() * 0.5); }); } },
    { id: 'field-mushroom', name: 'Field mushroom, roasted', sub: 'Mushrooms', kw: 'field mushroom portobello flat mushroom roasted big', form: 'whole', cook: 'roasted', role: 'veg', n: 1, w: 63, h: 63, side: { s: 'disc', h: 14, c: '#5A4030' }, draw: fieldMushroom },
    { id: 'shaved-truffle', name: 'Shaved truffle', sub: 'Mushrooms', kw: 'truffle black truffle shaved slices shavings', form: 'scatter', cook: 'fresh', role: 'garnish', g: 3, w: 36, h: 27, side: { s: 'layer', h: 1, c: '#4A362A' }, draw: function (P, rnd) { return P.scatter(rnd, 5, 16, 11, function (x, y, i, q) { return truffleAt(q, x, y, 7 + q() * 2); }); } },
    // salads
    { id: 'leafy-salad', name: 'Mixed leaf salad', sub: 'Salads', kw: 'mixed leaves mesclun side salad green salad leafy', form: 'pile', cook: 'fresh', role: 'salad', g: 60, w: 75, h: 64, side: { s: 'leafy', h: 22, c: '#7EA453' }, draw: leafy({ count: 18, rx: 26, ry: 20 }) },
    { id: 'caesar-salad', name: 'Caesar salad', sub: 'Salads', kw: 'caesar salad cos croutons parmesan bacon egg anchovy dressing ceasar', form: 'portion', cook: 'fresh', role: 'salad', g: 250, w: 109, h: 95, side: { s: 'leafy', h: 30, c: '#77A845' }, draw: caesar },
    { id: 'greek-salad', name: 'Greek salad', sub: 'Salads', kw: 'greek salad village salad horiatiki feta olives tomato cucumber', form: 'portion', cook: 'fresh', role: 'salad', g: 220, w: 94, h: 69, side: { s: 'pile', h: 26, c: '#E5574A' }, draw: greek },
    { id: 'garden-salad', name: 'Garden salad', sub: 'Salads', kw: 'garden salad side salad tomato cucumber carrot lettuce', form: 'portion', cook: 'fresh', role: 'salad', g: 120, w: 78, h: 60, side: { s: 'leafy', h: 24, c: '#9CC463' }, draw: garden },
    { id: 'tabbouleh', name: 'Tabbouleh', sub: 'Salads', kw: 'tabbouleh tabouli tabbouli parsley bulgur burghul salad lebanese', form: 'mound', cook: 'fresh', role: 'salad', g: 100, w: 66, h: 58, side: { s: 'mound', h: 14, c: '#5E9A3A' }, draw: tabbouleh },
    { id: 'panzanella', name: 'Panzanella', sub: 'Salads', kw: 'panzanella bread salad tomato basil tuscan', form: 'portion', cook: 'fresh', role: 'salad', g: 180, w: 93, h: 71, side: { s: 'pile', h: 24, c: '#E5574A' }, draw: panzanella },
    { id: 'green-papaya-salad', name: 'Green papaya salad', sub: 'Salads', kw: 'green papaya salad som tum thai salad', form: 'portion', cook: 'fresh', role: 'salad', g: 120, w: 82, h: 77, side: { s: 'pile', h: 20, c: '#E8F0C4' }, draw: papaya },
    { id: 'coleslaw', name: 'Coleslaw', sub: 'Salads', kw: 'slaw coleslaw cabbage carrot creamy slaw', form: 'pile', cook: 'raw', role: 'salad', g: 80, w: 64, h: 51, side: { s: 'pile', h: 16, c: '#EEF2D8' }, draw: slaw() },
    { id: 'wakame', name: 'Seaweed salad', sub: 'Salads', kw: 'wakame seaweed salad goma japanese', form: 'pile', cook: 'fresh', role: 'salad', g: 40, w: 43, h: 40, side: { s: 'pile', h: 10, c: '#3F9A3A' }, draw: function (P, rnd) { return heap(rnd, 22, 14, 11, function (x, y, i, q) { return seaweedAt(q, x, y, q() * 180, 18 + q() * 8, pick(q, ['#3F9A3A', '#52AE44', '#6EC05A'])); }) + P.scatter(rnd, 14, 20, 16, function (x, y, i, q) { return P.ellipse(x, y, 1, 0.6, '#F4EBCF', '#C9B88A', 0.3, { transform: rot(q() * 180, x, y) }); }) + strands(rnd, 3, 14, 10, ['#C9302A'], 10, 0.5, 2, { edgeW: 0 }); } },
    { id: 'mango-salsa', name: 'Mango salsa', sub: 'Salads', kw: 'mango salsa diced mango red onion chilli coriander', form: 'pile', cook: 'fresh', role: 'garnish', g: 50, w: 44, h: 37, side: { s: 'pile', h: 8, c: '#F2A93A' }, draw: salsa('mango') },
    { id: 'corn-salsa', name: 'Corn salsa', sub: 'Salads', kw: 'corn salsa charred corn black beans pico', form: 'pile', cook: 'fresh', role: 'garnish', g: 50, w: 44, h: 35, side: { s: 'pile', h: 8, c: '#F2C94C' }, draw: salsa('corn') },
    // pickles and ferments
    { id: 'kimchi', name: 'Kimchi', sub: 'Pickles and ferments', kw: 'kimchi kim chi korean fermented cabbage', form: 'pile', cook: 'cured', role: 'sidedish', g: 50, w: 43, h: 33, side: { s: 'pile', h: 12, c: '#D9502E' }, draw: function (P, rnd) { var d = P.blob(rnd, 18, 13, 0.14, 10); return P.path(d, '#B5301F', null, 0, { opacity: '0.5' }) + heap(rnd, 10, 15, 11, function (x, y, i, q) { return kimchiAt(q, x, y, 1); }) + sprinkle(rnd, 8, 16, 12, ['#F4EBCF'], 0.6) + P.scatter(rnd, 5, 14, 10, function (x, y) { return P.circle(x, y, 1.5, '#9CC067', '#4F8F2F', 0.6); }); } },
    { id: 'banchan', name: 'Banchan', sub: 'Pickles and ferments', kw: 'banchan korean side dishes namul kimchi kkakdugi small plates', form: 'cluster', cook: 'cured', role: 'sidedish', g: 120, w: 65, h: 60, side: { s: 'pile', h: 10, c: '#D9502E' }, draw: banchan },
    { id: 'banh-mi-pickles', name: 'Banh mi pickles', sub: 'Pickles and ferments', kw: 'pickled carrot daikon do chua banh mi vietnamese pickles julienne', form: 'pile', cook: 'cured', role: 'garnish', g: 30, w: 45, h: 36, side: { s: 'pile', h: 8, c: '#EE8A2E' }, draw: function (P, rnd) { return heap(rnd, 26, 15, 11, function (x, y, i, q) { var c = i % 2 ? '#EE8A2E' : '#F6F3E6'; return stripAt(q, x, y, q() * 360, 22, 2.4, c, { bend: 0.4, hi: '#FFFFFF' }); }); } },
    { id: 'sauerkraut', name: 'Sauerkraut', sub: 'Pickles and ferments', kw: 'sauerkraut kraut fermented cabbage german', form: 'pile', cook: 'cured', role: 'sidedish', g: 40, w: 53, h: 47, side: { s: 'pile', h: 10, c: '#E8DFA8' }, draw: slaw({ rx: 21, ry: 16, base: '#E2D69A', count: 70, w: 1.4, cols: ['#E8DFA8', '#DDD08A', '#F2ECCB', '#EDE4B4'], dots: { n: 10, c: ['#5E4A2E'], r: 0.7 } }) },
    { id: 'pickle-slices', name: 'Pickle slices, crinkle cut', sub: 'Pickles and ferments', kw: 'pickles dill pickle chips crinkle cut burger pickles gherkin', form: 'slices', cook: 'cured', role: 'topping', n: 6, w: 43, h: 37, side: { s: 'disc', h: 3, c: '#6E7E2E' }, draw: slicePile('gherkin', 6, 14, 10, 10) },
    { id: 'gherkin-slices', name: 'Gherkin slices, lengthways', sub: 'Pickles and ferments', kw: 'gherkin slices sandwich pickle lengthwise long sliced pickles', form: 'slices', cook: 'cured', role: 'topping', n: 3, w: 59, h: 37, side: { s: 'layer', h: 3, c: '#6E7E2E' }, draw: function (P, rnd) {
      return [-9, 0, 9].map(function (y, i) { var tf = P.at((i - 1) * 3, y, (i - 1) * 6), d = podD(54, 17, 0.5, 0, 0, false); return sh(d, tf) + P.g(tf, P.path(d, '#6E7E2E', '#4A5A1E', 0.8) + P.path(podD(50, 13, 0.5, 0, 0, false), '#C9CC72', null, 0) + P.path(podD(36, 4.5, 0.5, 0, 0, false), '#B9BC5E', null, 0) + [-12, -6, 0, 6, 12].map(function (x) { return P.ellipse(x, -0.4, 1.6, 1, '#ECE9B8', '#B9B562', 0.3); }).join('') + P.hl(-6, -4, 10, 1.2, '#FFFFFF', 0.3)); }).join('');
    } },
    { id: 'cornichons', name: 'Cornichons', sub: 'Pickles and ferments', kw: 'cornichons baby gherkins cocktail pickles', form: 'whole', cook: 'cured', role: 'garnish', n: 4, w: 40, h: 35, side: { s: 'stick', h: 9, c: '#5A6E2A' }, draw: function (P, rnd) { var out = ''; [[-2, -11, -8], [3, -3, 6], [-3, 5, -3], [2, 12, 10]].forEach(function (p) { out += podAt(rnd, p[0], p[1], p[2], { len: 34, wid: 9, col: '#5A6E2A', bumps: 6, amp: 0.12, bend: 1.2 }) + P.g(P.at(p[0], p[1], p[2]), P.crumbs(rnd, 6, 13, 2.2, ['#7E9440', '#3E4E1A'], 0.6)); }); return out; } },
    { id: 'jalapeno-slices', name: 'Jalapeño slices', sub: 'Pickles and ferments', kw: 'jalapeno jalapenos sliced pickled chilli rings hot', form: 'scatter', cook: 'cured', role: 'topping', n: 10, w: 42, h: 36, side: { s: 'disc', h: 2, c: '#3F7A2A' }, draw: slicePile('jalapeno', 10, 15, 11, 7.5) },
    { id: 'kalamata-olives', name: 'Kalamata olives', sub: 'Pickles and ferments', kw: 'olives kalamata black olives greek olives', form: 'whole', cook: 'cured', role: 'garnish', n: 6, w: 36, h: 26, side: { s: 'mound', h: 9, c: '#4A2A3A' }, draw: function (P, rnd) { return heap(rnd, 6, 12, 9, function (x, y, i, q) { return oliveAt(q, x, y); }); } },
    { id: 'green-olives', name: 'Green olives', sub: 'Pickles and ferments', kw: 'green olives sicilian olives', form: 'whole', cook: 'cured', role: 'garnish', n: 6, w: 35, h: 32, of: 'kalamata-olives', side: { s: 'mound', h: 10, c: '#8A9A3A' }, draw: function (P, rnd) { return heap(rnd, 6, 12, 9, function (x, y, i, q) { return oliveAt(q, x, y, '#8A9A3A', 1.08); }); } },
    // natives
    { id: 'warrigal-greens', name: 'Warrigal greens', sub: 'Natives', kw: 'warrigal greens native spinach new zealand spinach bush tucker', form: 'pile', cook: 'steamed', role: 'veg', g: 30, w: 51, h: 57, side: { s: 'leafy', h: 10, c: '#4F8A3A' }, draw: function (P, rnd) { return heap(rnd, 6, 12, 9, function (x, y, i, q) { return warrigalSprig(q, x, y, q() * 360); }); } },
    { id: 'saltbush', name: 'Saltbush leaves', sub: 'Natives', kw: 'saltbush old man saltbush native herb bush tucker fried saltbush', form: 'scatter', cook: 'fresh', role: 'garnish', g: 5, w: 43, h: 26, side: { s: 'layer', h: 2, c: '#A3B5A0' }, draw: function (P, rnd) { return P.scatter(rnd, 13, 16, 11, function (x, y, i, q) { return P.circle(x + 0.6, y + 0.8, 3, '#000000', null, 0, { opacity: '0.1' }) + P.leaf(11 + q() * 3, 6.5 + q() * 1.5, '#A3B5A0', x, y, q() * 360, { edge: '#748C76', vc: '#D8E2D4' }); }); } },
    { id: 'rosella-flowers', name: 'Rosella flowers', sub: 'Natives', kw: 'rosella wild hibiscus native flowers calyx bush tucker', form: 'cluster', cook: 'fresh', role: 'garnish', n: 3, w: 47, h: 42, side: { s: 'mound', h: 12, c: '#A8203A' }, draw: function (P, rnd) { return rosellaAt(rnd, -12, -8, 11) + rosellaAt(rnd, 13, -5, 10.5) + rosellaAt(rnd, 0, 11, 11); } },
    { id: 'samphire', name: 'Samphire', sub: 'Natives', kw: 'samphire sea asparagus glasswort native succulent', form: 'pile', cook: 'steamed', role: 'veg', g: 15, w: 46, h: 56, side: { s: 'leafy', h: 6, c: '#6E9A3E' }, draw: function (P, rnd) { return P.g(tr(2, 0), samphire(P, rnd)); } }
  ]);

  // the helpers, for the other category files that draw veg on something (burgers, bowls, wraps, plates)
  L.VEG = {
    leafy: leafy, leafAt: leafAt, LEAF: LEAF, ruffleD: ruffleD, lobedD: lobedD, slaw: slaw, strands: strands, strandD: strandD, strand: strand,
    slice: sliceAt, slices: slices, slicePile: slicePile, SLICE: SLICE, crinkleD: crinkleD, ribbon: ribbon,
    pod: podAt, podD: podD, strip: stripAt, floret: floretAt, cube: cubeAt, cloud: cloud, tossed: tossed, sprinkle: sprinkle,
    tomChunk: tomChunk, cucChunk: cucChunk, olive: oliveAt, onionRing: onionRing, sliver: sliverAt, slivers: slivers,
    cherry: cherryAt, cherryHalf: cherryHalf, pea: peaAt, kernel: kernelAt, chickpea: chickpeaAt, mound: mound, herbBits: herbBits,
    cup: cupAt, kimchi: kimchiAt, breadChunk: breadChunk, eggHalf: eggHalf, feta: feta, shard: shardAt, baconBit: baconBit, mushSlice: mushSlice, cob: cobAt
  };
})();
