/* The drawing library: potatoes and sides (see js/library.js for the fields). Drawn around 0,0, 1 unit is about 1.5 mm. */
(function () {
  'use strict';
  var L = window.LK_LIB, C = L.P.C;
  var SKIN = '#9A6A3A', ROAST = '#DFA24A', ROAST_EDGE = '#A86F22', GEM = '#E2A94C', GEM_EDGE = '#B07828';
  var SWEET = '#E5813A', SWEET_EDGE = '#AE5A1E', SWEET_SKIN = '#7E3A36', CHIVE = '#4F7F2F', SC = '#F7F4EA', SC_EDGE = '#E2DCCB';
  function rc(x) { return Object.assign({ 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, x || {}); }

  /* ---------- heaps ---------- */
  // a heap: a bottom layer spread evenly over rx by ry, then a smaller top layer bunched in the middle, each drawn back
  // to front. piece(P, q, x, y, i, top) draws one piece. o: n pieces, rx and ry the spread, top the share on the top layer
  function heap(P, rnd, o, piece) {
    var n = o.n || 20, nt = Math.round(n * (o.top === undefined ? 0.4 : o.top));
    return P.scatter(rnd, n - nt, o.rx, o.ry, function (x, y, i, q) { return piece(P, q, x, y, i, false); }) +
      P.pile(rnd, nt, o.rx * 0.6, o.ry * 0.6, function (x, y, i, q) { return piece(P, q, x, y - o.ry * 0.08, i, true); });
  }

  /* ---------- chips ---------- */
  // one chip: a rounded stick, golden with a darker outline, a shaded underside, a light stripe and (o.ends) browner ends
  function chip(P, x, y, rot, len, wid, o) {
    o = o || {};
    var col = o.col || C.chip, edge = o.edge || C.chipEdge, r = Math.min(wid * 0.3, 3), l2 = len / 2, w2 = wid / 2;
    var s = P.rect(-l2 + 0.8, -w2 + 1.5, len, wid, r, '#000000', null, 0, { opacity: '0.13' });
    s += P.rect(-l2, -w2, len, wid, r, col, edge, o.sw || 0.9);
    s += P.rect(-l2 + 0.8, w2 * 0.1, len - 1.6, w2 * 0.8, r * 0.6, P.shade(col, -0.13), null, 0, { opacity: '0.55' });
    if (o.ends) {
      var e = Math.min(4.5, len * 0.12);
      s += P.path('M' + P.n(-l2 + 0.6) + ' ' + P.n(-w2 + 0.8) + ' h' + P.n(e) + ' v' + P.n(wid - 1.6) + ' h' + P.n(-e) + ' Z M' + P.n(l2 - 0.6) + ' ' + P.n(-w2 + 0.8) + ' h' + P.n(-e) + ' v' + P.n(wid - 1.6) + ' h' + P.n(e) + ' Z', P.shade(col, -0.22), null, 0, { opacity: '0.5' });
    }
    s += P.line(-l2 + 2.5, -w2 * 0.42, l2 - 3.5, -w2 * 0.42, '#FFFFFF', Math.max(0.8, wid * 0.17), { opacity: '0.42' });
    return P.g(P.at(x, y, rot), s);
  }
  // a pile of chips. o: n chips, rx and ry the heap, len [shortest, longest], wid, col, edge, rot (the most a chip turns
  // from level; leave it out for any way), ends (browner ends), dust (seasoning colours over the top), piece (another chip drawer)
  function chipsSvg(P, rnd, o) {
    o = o || {};
    var len = o.len || [36, 48], wid = o.wid || 7.5, col = o.col || C.chip, top = P.shade(col, 0.08), draw = o.piece || chip;
    var out = heap(P, rnd, { n: o.n || 22, rx: o.rx || 20, ry: o.ry || 16, top: o.top }, function (P, q, x, y, i, up) {
      var rot = o.rot === undefined ? q() * 180 : (q() * 2 - 1) * o.rot;
      return draw(P, x, y, rot, len[0] + q() * (len[1] - len[0]), wid * (0.9 + q() * 0.2), { col: up ? top : col, edge: o.edge, ends: o.ends, q: q });
    });
    if (o.dust) out += P.crumbs(rnd, Math.round((o.rx || 20) * 1.8), (o.rx || 20) + 12, (o.ry || 16) + 10, o.dust, 0.75);
    return out;
  }
  function chipPile(o) { return function (P, rnd) { return chipsSvg(P, rnd, o); }; }
  // a thin fry as a round-capped line (shoestring)
  function stick(P, x, y, rot, len, wid, o) {
    var a = rot * Math.PI / 180, dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2, col = o.col || C.chip;
    return P.line(x - dx + 0.6, y - dy + 1.1, x + dx + 0.6, y + dy + 1.1, '#000000', wid, { opacity: '0.12' }) + P.line(x - dx, y - dy, x + dx, y + dy, o.edge || C.chipEdge, wid) + P.line(x - dx, y - dy, x + dx, y + dy, col, Math.max(0.8, wid - 1.4));
  }
  // a beer battered chip: a lumpy outline and batter specks
  function battered(P, x, y, rot, len, wid, o) {
    var q = o.q, col = o.col || '#E0AA4E', edge = o.edge || '#AE7C2A', d = P.slab(q, len / 2, wid / 2, 0.8, 0.07, 11);
    var s = P.rect(-len / 2 + 0.8, -wid / 2 + 1.5, len, wid, 3, '#000000', null, 0, { opacity: '0.13' }) + P.path(d, col, edge, 0.9) + P.rect(-len / 2 + 1.5, wid * 0.05, len - 3, wid * 0.36, 2, P.shade(col, -0.12), null, 0, { opacity: '0.55' });
    for (var i = 0; i < 3; i++) s += P.circle((q() - 0.5) * (len - 6), (q() - 0.6) * wid * 0.6, 0.7 + q() * 0.6, i % 2 ? P.shade(col, 0.35) : P.shade(col, -0.2));
    s += P.line(-len / 2 + 3, -wid * 0.22, len / 2 - 4, -wid * 0.22, '#FFFFFF', 1.2, { opacity: '0.35' });
    return P.g(P.at(x, y, rot), s);
  }
  // a crinkle cut chip: zigzag sides and ridges along it
  function crinkle(P, x, y, rot, len, wid, o) {
    var col = o.col || C.chip, edge = o.edge || C.chipEdge, l2 = len / 2, w2 = wid / 2, k = Math.max(4, Math.round(len / 4.4)), st = len / k, a = 1.4;
    var d = 'M' + P.n(-l2) + ' ' + P.n(-w2), i;
    for (i = 0; i < k; i++) d += ' L' + P.n(-l2 + i * st + st / 2) + ' ' + P.n(-w2 - a) + ' L' + P.n(-l2 + (i + 1) * st) + ' ' + P.n(-w2);
    d += ' L' + P.n(l2) + ' ' + P.n(w2);
    for (i = k; i > 0; i--) d += ' L' + P.n(-l2 + i * st - st / 2) + ' ' + P.n(w2 + a) + ' L' + P.n(-l2 + (i - 1) * st) + ' ' + P.n(w2);
    d += ' Z';
    var s = P.rect(-l2 + 0.8, -w2 + 1.5, len, wid, 1, '#000000', null, 0, { opacity: '0.13' }) + P.path(d, col, edge, 0.9, { 'stroke-linejoin': 'round' });
    s += P.line(-l2 + 1.5, w2 * 0.35, l2 - 1.5, w2 * 0.35, P.shade(col, -0.2), 1.1, { opacity: '0.7' }) + P.line(-l2 + 1.5, -w2 * 0.1, l2 - 1.5, -w2 * 0.1, P.shade(col, -0.2), 0.9, { opacity: '0.5' });
    s += P.line(-l2 + 2.5, -w2 * 0.5, l2 - 3, -w2 * 0.5, '#FFFFFF', 1.2, { opacity: '0.42' });
    return P.g(P.at(x, y, rot), s);
  }
  // a waffle fry: a round with a criss-cross lattice
  function waffle(P, q, x, y, rot, col) {
    col = col || C.chip;
    var d = P.blob(q, 15, 12.5, 0.07, 10), dk = P.shade(col, -0.22);
    var s = P.shadow(d, 1, 1.6) + P.path(d, col, C.chipEdge, 1);
    s += P.grill(13.5, 11, 45, 5, dk, 1.5) + P.grill(13.5, 11, -45, 5, dk, 1.5);
    s += P.hl(-4, -4.5, 6, 2.6, '#FFFFFF', 0.32, -20);
    return P.g(P.at(x, y, rot), s);
  }
  // a curly fry: a coil lying on its side (a looped line), seasoned orange
  function curlD(P, q, turns, r, pitch) {
    var pts = [], k = Math.round(turns * 7), bend = (q() - 0.5) * 0.04, a0 = q() * Math.PI * 2, L0 = turns * pitch;
    for (var i = 0; i <= k; i++) { var t = i / k, a = a0 + t * turns * Math.PI * 2, x = -L0 / 2 + t * L0 + Math.cos(a) * r * 0.8; pts.push([x, Math.sin(a) * r + bend * x * x]); }
    return P.smooth(pts, true);
  }
  function curly(P, q, x, y, rot) {
    var d = curlD(P, q, 2.4 + q() * 1.2, 7.5, 8.5), col = '#DE9E40';
    return P.g(P.at(x, y, rot), P.path(d, 'none', '#000000', 4.6, rc({ opacity: '0.12', transform: 'translate(0.8 1.4)' })) + P.path(d, 'none', '#9E621E', 4.8, rc()) + P.path(d, 'none', col, 3.2, rc()) + P.path(d, 'none', '#F4CC78', 0.9, rc({ opacity: '0.8', transform: 'translate(-0.4 -0.6)' })));
  }
  // a wedge from above: the cut face, the skin along the curved back, seasoning specks
  function wedge(P, q, x, y, rot, o) {
    o = o || {};
    var l = (o.len || 48) / 2 * (0.9 + q() * 0.2), w = (o.wid || 15) / 2, col = o.col || '#E2A548', edge = o.edge || ROAST_EDGE;
    var d = P.smooth([[-l, 0.1 * w], [-l * 0.9, -0.45 * w], [-l * 0.5, -1.1 * w], [0, -1.3 * w], [l * 0.5, -1.1 * w], [l * 0.9, -0.45 * w], [l, 0.1 * w], [l * 0.5, 0.6 * w], [-l * 0.5, 0.6 * w]]);
    var s = P.shadow(d, 1.2, 2) + P.path(d, col, edge, 1);
    s += P.path(P.smooth([[-l * 0.88, -0.3 * w], [-l * 0.45, -1.02 * w], [0, -1.16 * w], [l * 0.45, -1.02 * w], [l * 0.88, -0.3 * w]], true), 'none', o.skin || SKIN, w * 0.34, rc());
    s += P.path('M' + P.n(-l * 0.7) + ' ' + P.n(w * 0.2) + ' Q0 ' + P.n(w * 0.6) + ' ' + P.n(l * 0.7) + ' ' + P.n(w * 0.2), 'none', P.shade(col, -0.15), w * 0.3, rc({ opacity: '0.6' }));
    s += P.hl(0, -w * 0.45, l * 0.45, w * 0.17, '#FFFFFF', 0.3);
    var sp = o.spice || ['#B5452A', '#9E3B22', '#5E7F2F'];
    for (var i = 0; i < 6; i++) s += P.circle((q() * 2 - 1) * l * 0.6, -w * 0.6 + q() * w * 0.75, 0.6 + q() * 0.5, sp[i % sp.length]);
    return P.g(P.at(x, y, rot) + ' translate(0 ' + P.n(w * 0.35) + ')', s);
  }
  // wedges piled the way they fall from the basket: spread out, criss-crossed along two directions
  function wedgePile(o) {
    return function (P, rnd) {
      var a0 = rnd() * 180;
      return P.spots(rnd, o.n, o.rx, o.ry, o.len * 0.3).map(function (p, i) { return wedge(P, rnd, p[0], p[1], a0 + (i % 2 ? 28 : -28) + (rnd() - 0.5) * 30 + (rnd() < 0.5 ? 180 : 0), o); }).join('');
    };
  }
  // a potato gem: a little rounded log of grated potato (a few stand on end and show as rounds)
  function gem(P, q, x, y, rot, o) {
    o = o || {};
    var col = o.col || GEM, edge = o.edge || GEM_EDGE, s;
    if (q() < 0.22) s = P.circle(0.8, 1.4, 6.6, '#000000', null, 0, { opacity: '0.13' }) + P.circle(0, 0, 6.6, col, edge, 0.9) + P.circle(-0.4, -0.4, 4.4, P.shade(col, 0.14), null, 0);
    else s = P.rect(-8.7, -5, 19, 13, 5.5, '#000000', null, 0, { opacity: '0.13' }) + P.rect(-9.5, -6.5, 19, 13, 5.5, col, edge, 0.9) + P.rect(-8.2, 1, 16.4, 4.2, 2, P.shade(col, -0.13), null, 0, { opacity: '0.6' }) + P.line(-6, -3, 6, -3, '#FFFFFF', 1.3, { opacity: '0.4' });
    for (var i = 0; i < 4; i++) s += P.circle((q() - 0.5) * 11, (q() - 0.5) * 7, 0.55 + q() * 0.4, i % 2 ? P.shade(col, -0.28) : P.shade(col, 0.35));
    return P.g(P.at(x, y, rot), s);
  }
  // a cube of fried potato (bravas, sautéed): a rounded square with a lighter top face
  function cube(P, q, x, y, s0, o) {
    o = o || {};
    var col = o.col || '#E3AA4C', edge = o.edge || ROAST_EDGE, h = s0 / 2, d = P.slab(q, h, h * (0.85 + q() * 0.25), 0.7, 0.07, 12);
    var s = P.shadow(d, 1, 1.8) + P.path(d, col, edge, 0.9) + P.path(P.slab(q, h * 0.62, h * 0.55, 0.6, 0.08, 10), P.shade(col, 0.2), null, 0, { opacity: '0.75', transform: 'translate(' + P.n(-h * 0.15) + ' ' + P.n(-h * 0.18) + ')' });
    if (o.brown !== false) s += P.path(P.blob(q, h * 0.35, h * 0.22, 0.2, 7, h * 0.35, h * 0.4), P.shade(col, -0.2), null, 0, { opacity: '0.5' });
    s += P.hl(-h * 0.25, -h * 0.35, h * 0.4, h * 0.14, '#FFFFFF', 0.35, -20);
    return P.g(P.at(x, y, q() * 90), s);
  }

  /* ---------- toppings for loaded heaps ---------- */
  // a sauce drizzled back and forth over an rx by ry heap
  function drizzle(P, rnd, rx, ry, col, wid, k, ang) {
    var pts = [], m = k || 7;
    for (var i = 0; i < m; i++) { var t = i / (m - 1); pts.push([(-1 + 2 * t) * rx + (rnd() - 0.5) * rx * 0.25, (i % 2 ? 1 : -1) * ry * (0.45 + rnd() * 0.55)]); }
    var d = P.smooth(pts, true), tr = ang ? 'rotate(' + P.n(ang) + ')' : '';
    return P.g(tr, P.path(d, 'none', P.shade(col, -0.25), wid + 1.4, rc()) + P.path(d, 'none', col, wid, rc()) + P.path(d, 'none', '#FFFFFF', Math.max(0.6, wid * 0.25), rc({ opacity: '0.35', transform: 'translate(-0.5 -0.8)' })));
  }
  // bits scattered over a heap: bacon, spring onion, chives, cheese, sour cream
  function bits(P, rnd, what, count, rx, ry) {
    return P.scatter(rnd, count, rx, ry, function (x, y, i, q) {
      if (what === 'bacon') return P.path(P.blob(q, 2.6 + q() * 1.4, 1.8 + q(), 0.3, 6, x, y), '#A8402F', '#7E2A1E', 0.5) + P.circle(x + 0.6, y - 0.4, 0.7, '#E8B4A8');
      if (what === 'shallot') return P.circle(x, y, 1.9, '#B9D27A', '#5E8C3A', 1);
      if (what === 'chive') { var a = q() * Math.PI; return P.line(x, y, x + Math.cos(a) * 3.5, y + Math.sin(a) * 3.5, CHIVE, 1.1); }
      if (what === 'parsley') return P.path(P.blob(q, 1.4 + q() * 0.8, 1.1 + q() * 0.6, 0.35, 6, x, y), i % 2 ? '#4F7F2F' : '#5E8C3A');
      if (what === 'cheese') return P.path(P.blob(q, 2.2, 1.4, 0.3, 6, x, y), C.cheeseLight, P.shade(C.cheese, -0.15), 0.4);
      if (what === 'salt') return P.rect(x, y, 1.4, 1.2, 0.2, '#FFFFFF', '#E6E0D2', 0.3);
      if (what === 'rosemary') { var b = q() * 180; return P.g(P.at(x, y, b), P.path(P.leafD(6, 1.2), '#4F7F2F')); }
      if (what === 'pepper') return P.circle(x, y, 0.5 + q() * 0.3, '#3A3330');
      return P.circle(x, y, 0.8, '#B5452A');
    });
  }
  // a dollop of sour cream (or aioli): a soft round with a peak and a highlight
  function dollop(P, rnd, x, y, r, col) {
    col = col || SC;
    var d = P.blob(rnd, r, r * 0.88, 0.12, 9, x, y);
    return P.shadow(d, 1, 1.5) + P.path(d, col, P.shade(col, -0.12), 0.8) + P.path('M' + P.n(x - r * 0.45) + ' ' + P.n(y + r * 0.1) + ' Q' + P.n(x) + ' ' + P.n(y - r * 0.6) + ' ' + P.n(x + r * 0.4) + ' ' + P.n(y - r * 0.05), 'none', P.shade(col, -0.1), 0.9, rc()) + P.hl(x - r * 0.25, y - r * 0.35, r * 0.35, r * 0.18, '#FFFFFF', 0.7, -20);
  }
  // a cheese sauce poured over a heap: a puddle in the middle and a thick drizzle
  function cheeseSauce(P, rnd, rx, ry, col) {
    col = col || '#F0B83A';
    var d = P.blob(rnd, rx * 0.5, ry * 0.45, 0.25, 10);
    return P.path(d, col, P.shade(col, -0.22), 0.9) + drizzle(P, rnd, rx * 0.85, ry * 0.7, col, 4.2, 6, -12) + P.hl(-rx * 0.15, -ry * 0.12, rx * 0.2, ry * 0.07, '#FFFFFF', 0.45, -10);
  }

  /* ---------- mash ---------- */
  // a spiral from radius R into the middle (turns times round), centre cx, cy, squashed by sq
  function spiralD(P, R, turns, cx, cy, sq, a0, r0) {
    var pts = [], k = Math.round(turns * 9);
    for (var i = 0; i <= k; i++) { var t = i / k, a = (a0 || 0) + t * turns * Math.PI * 2, r = R * (1 - t) + (r0 || 2) * t; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * (sq || 0.9)]); }
    return P.smooth(pts, true);
  }
  // a mound of mash: a soft round, a spoon swirl to the peak, shade low right, light high left.
  // o: r, col, flecks (colours of greens through it), gravy (a well of gravy on top), butter
  function mash(o) {
    return function (P, rnd) {
      var col = o.col || C.mash, r = o.r || 34, d = P.blob(rnd, r, r * 0.9, 0.06, 12), out = P.shadow(d, 2, 3);
      out += P.path(d, col, P.shade(col, -0.22), 1.1);
      out += P.path(P.blob(rnd, r * 0.6, r * 0.32, 0.1, 9, r * 0.25, r * 0.5), P.shade(col, -0.07), null, 0, { opacity: '0.7' });
      var sp = spiralD(P, r * 0.78, 2.1, -r * 0.06, -r * 0.08, 0.88, rnd() * 6);
      out += P.path(sp, 'none', P.shade(col, -0.14), 2.2, rc()) + P.path(sp, 'none', '#FFFFFF', 1.3, rc({ opacity: '0.6', transform: 'translate(-1 -1.3)' }));
      if (o.flecks) out += P.scatter(rnd, Math.round(r * 0.9), r * 0.8, r * 0.72, function (x, y, i, q) { return P.path(P.blob(q, 1.6 + q() * 1.6, 1 + q(), 0.35, 6, x, y), o.flecks[i % o.flecks.length]); });
      out += P.hl(-r * 0.32, -r * 0.38, r * 0.32, r * 0.15, '#FFFFFF', 0.45, -25);
      if (o.gravy) {
        // a well in the top, filled with gravy that runs over the lip on one side
        out += P.path(P.blob(rnd, r * 0.56, r * 0.5, 0.08, 10, -r * 0.04, -r * 0.08), P.shade(col, 0.4), P.shade(col, -0.12), 0.8);
        out += P.path(P.blob(rnd, r * 0.44, r * 0.38, 0.1, 10, -r * 0.04, -r * 0.06), C.gravy, P.shade(C.gravy, -0.3), 1) + P.hl(-r * 0.16, -r * 0.2, r * 0.18, r * 0.07, '#FFFFFF', 0.5, -20) + P.hl(r * 0.12, r * 0.08, r * 0.06, r * 0.03, '#FFFFFF', 0.4, -20);
      }
      if (o.butter) out += P.path('M-5 -9 L5 -10 L6 -1 L-4 0 Z', '#F6DC86', '#E2BE5A', 0.8) + P.hl(-1, -7, 3, 1, '#FFFFFF', 0.6);
      return out;
    };
  }
  // a quenelle: a smooth three sided oval with the spoon's ridge along it
  function quenelle(o) {
    return function (P, rnd) {
      var col = o.col || C.mash, l = o.len / 2, w = o.wid / 2, pts = [];
      for (var i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); pts.push([c * l * (1 - 0.1 * s * s), s * w * (1 - 0.18 * Math.abs(c) * Math.abs(c))]); }
      var d = P.smooth(pts), out = P.shadow(d, 2, 3) + P.path(d, col, P.shade(col, -0.22), 1.1);
      out += P.path('M' + P.n(-l * 0.85) + ' ' + P.n(w * 0.1) + ' Q0 ' + P.n(w * 0.65) + ' ' + P.n(l * 0.85) + ' ' + P.n(w * 0.05), 'none', P.shade(col, -0.12), 1.4, rc());
      out += P.path('M' + P.n(-l * 0.75) + ' ' + P.n(-w * 0.15) + ' Q0 ' + P.n(-w * 0.75) + ' ' + P.n(l * 0.7) + ' ' + P.n(-w * 0.25), 'none', '#FFFFFF', 2, rc({ opacity: '0.5' }));
      out += P.path(P.blob(rnd, l * 0.6, w * 0.25, 0.1, 8, l * 0.1, w * 0.55), P.shade(col, -0.07), null, 0, { opacity: '0.6' });
      return out;
    };
  }
  // a piped rosette: a ridged rope spiralling up to a peak. o: r, rope, col, edge, tip (browned tips)
  function rosette(P, rnd, x, y, o) {
    var col = o.col || C.mash, edge = o.edge || P.shade(col, -0.22), r = o.r, rope = o.rope;
    var sp = spiralD(P, r - rope / 2, o.turns || 2.2, 0, 0, 0.92, rnd() * 6, rope * 0.3), base = P.blob(rnd, r, r * 0.93, 0.05, 10);
    var s = P.shadow(base, 1.5, 2.5) + P.path(base, P.shade(col, -0.05), edge, 1);
    s += P.path(sp, 'none', edge, rope + 1.6, rc()) + P.path(sp, 'none', col, rope, rc());
    s += P.path(sp, 'none', P.shade(col, -0.16), Math.max(0.6, rope * 0.12), rc({ transform: 'translate(0.8 1)' }));
    if (o.tip) s += P.path(sp, 'none', o.tip, rope * 0.5, rc({ 'stroke-dasharray': P.n(rope * 0.5) + ' ' + P.n(rope * 0.8), opacity: '0.85', transform: 'translate(0.6 -0.6)' }));
    s += P.path(sp, 'none', '#FFFFFF', Math.max(0.6, rope * 0.16), rc({ opacity: '0.55', transform: 'translate(-0.8 -1)' }));
    s += P.circle(0, 0, rope * 0.35, o.tip || col, edge, 0.6);
    return P.g(P.at(x, y), s);
  }
  // a swoosh of purée: a dropped round dragged off into a tail by the back of a spoon
  function swooshD(P, len, wid, bend) {
    var top = [], bot = [], k = 12;
    for (var i = 0; i <= k; i++) {
      var t = i / k, x = -len / 2 + t * len, y = -Math.sin(t * Math.PI) * bend + t * bend * 0.4, w = wid / 2 * (t < 0.14 ? 0.55 + 0.45 * Math.sqrt(t / 0.14) : 1 - 0.85 * (t - 0.14) / 0.86);
      top.push([x, y - w]); bot.unshift([x, y + w]);
    }
    return P.smooth([[-len / 2 - wid * 0.35, 0]].concat(top, [[len / 2 + 2, bend * 0.4]], bot));
  }

  /* ---------- roast, baked and fried pieces ---------- */
  // a roast potato chunk: craggy golden, a lighter crisp face, darker crunchy bits
  function roastPiece(P, q, x, y, o) {
    o = o || {};
    var col = o.col || ROAST, edge = o.edge || ROAST_EDGE, rx = (o.rx || 15) * (0.9 + q() * 0.2), ry = (o.ry || 12) * (0.9 + q() * 0.2);
    var d = P.blob(q, rx, ry, 0.13, 9), s = P.shadow(d, 1.6, 2.4) + P.path(d, col, edge, 1.1);
    s += P.path(P.blob(q, rx * 0.68, ry * 0.6, 0.15, 8, -rx * 0.1, -ry * 0.12), P.shade(col, 0.22), null, 0, { opacity: '0.85' });
    for (var i = 0; i < 4; i++) { var p = P.inEllipse(q, rx * 0.8, ry * 0.75); s += P.path(P.blob(q, 1.4 + q() * 1.6, 1 + q(), 0.3, 6, p[0], p[1]), i % 2 ? P.shade(col, -0.22) : P.shade(col, 0.35), null, 0, { opacity: '0.8' }); }
    s += P.path('M' + P.n(-rx * 0.5) + ' ' + P.n(ry * 0.35) + ' q' + P.n(rx * 0.3) + ' ' + P.n(-ry * 0.25) + ' ' + P.n(rx * 0.6) + ' ' + P.n(-ry * 0.05), 'none', P.shade(col, -0.2), 0.8, rc());
    s += P.hl(-rx * 0.3, -ry * 0.38, rx * 0.3, ry * 0.13, '#FFFFFF', 0.4, -20);
    return P.g(P.at(x, y, q() * 360), s);
  }
  // a smashed potato: a flattened round with crisp cracked edges, fluffy flesh showing through, bits of skin
  function smashPiece(P, q, x, y) {
    var r = 17 * (0.9 + q() * 0.2), d = P.blob(q, r, r * 0.9, 0.16, 14), s = P.shadow(d, 1.5, 2.2) + P.path(d, '#D9A04A', '#9E6820', 1.1);
    s += P.path(P.blob(q, r * 0.78, r * 0.7, 0.2, 11), '#E8BC62', null, 0);
    s += P.path(P.blob(q, r * 0.42, r * 0.34, 0.3, 9, -r * 0.1, -r * 0.05), '#F3DC9C', null, 0) + P.path(P.blob(q, r * 0.22, r * 0.18, 0.3, 7, r * 0.3, r * 0.3), '#F0D58E', null, 0);
    for (var i = 0; i < 5; i++) { var a = q() * Math.PI * 2, r1 = r * (0.2 + q() * 0.2), r2 = r * (0.65 + q() * 0.25); s += P.path('M' + P.n(Math.cos(a) * r1) + ' ' + P.n(Math.sin(a) * r1) + ' L' + P.n(Math.cos(a + 0.2) * r2) + ' ' + P.n(Math.sin(a + 0.2) * r2), 'none', '#B9802F', 1, rc({ opacity: '0.8' })); }
    for (i = 0; i < 3; i++) { var b = q() * Math.PI * 2; s += P.path(P.blob(q, 3 + q() * 2, 2, 0.3, 6, Math.cos(b) * r * 0.75, Math.sin(b) * r * 0.68), SKIN, null, 0, { opacity: '0.85' }); }
    s += bits(P, q, 'parsley', 4, r * 0.6, r * 0.5) + bits(P, q, 'salt', 4, r * 0.6, r * 0.5);
    return P.g(P.at(x, y, q() * 360), s);
  }
  // a halved small potato lying cut side up (kipfler, chat): a long curved oval with a thin skin rim
  function halfPotato(P, q, x, y, rot, o) {
    var l = o.len / 2 * (0.9 + q() * 0.2), w = o.wid / 2, bend = (o.bend || 0) * (q() < 0.5 ? -1 : 1), pts = [];
    for (var i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2, j = 1 + (q() - 0.5) * 0.1, px = Math.cos(a) * l * j, py = Math.sin(a) * w * j * (1 - 0.15 * Math.pow(Math.abs(Math.cos(a)), 3)); pts.push([px, py + bend * (1 - (px / l) * (px / l))]); }
    // a crisp browned edge all round, the golden cut face, the thin skin showing along one side
    var col = o.col || '#E6AE4A', d = P.smooth(pts), s = P.shadow(d, 1.2, 2) + P.path(d, P.shade(col, -0.18), P.shade(col, -0.42), 1);
    s += P.path(d, col, null, 0, { transform: 'scale(0.9 0.78)' });
    s += P.path(P.smooth(pts.slice(1, 6), true), 'none', o.skin || '#B98A50', 1.6, rc({ opacity: '0.9' }));
    for (var i = 0; i < 5; i++) s += P.path(P.blob(q, 2 + q() * 4, 1.5 + q() * 1.5, 0.3, 7, (q() - 0.5) * l * 1.2, (q() - 0.5) * w * 0.7 + bend * 0.7), i % 2 ? '#C07E2C' : '#F2CF78', null, 0, { opacity: '0.7' });
    s += P.hl(-l * 0.25, -w * 0.2 + bend * 0.6, l * 0.3, w * 0.12, '#FFFFFF', 0.4, 0);
    if (o.salt) s += bits(P, q, 'salt', 2, l * 0.5, w * 0.3);
    return P.g(P.at(x, y, rot), s);
  }
  // a crumbed log (croquette): a capsule with crumbs
  function croquette(P, q, x, y, rot) {
    var l = 44, w = 19, d = P.slab(q, l / 2, w / 2, 0.15, 0.03, 16);
    var s = P.shadow(d, 1.8, 2.6) + P.path(d, C.crumb, C.crumbDark, 1.1) + P.path(P.slab(q, l / 2 - 4, w * 0.3, 0.2, 0.05, 12), P.shade(C.crumb, 0.14), null, 0, { opacity: '0.8', transform: 'translate(-1 -2)' });
    s += P.crumbs(q, 22, l / 2 - 3, w / 2 - 2.5, [P.shade(C.crumb, -0.25), P.shade(C.crumb, 0.32), C.crumbDark], 0.9);
    s += P.hl(-l * 0.12, -w * 0.25, l * 0.28, w * 0.09, '#FFFFFF', 0.3);
    return P.g(P.at(x, y, rot), s);
  }

  /* ---------- whole pieces ---------- */
  function shredded(P, rnd, rx, ry, count, cols) {
    return P.scatter(rnd, count, rx, ry, function (x, y, i, q) {
      var a = (q() - 0.5) * 1.4 + (i % 2 ? 0.6 : -0.5), l = 3 + q() * 4;
      return P.path('M' + P.n(x) + ' ' + P.n(y) + ' q' + P.n(Math.cos(a) * l * 0.5) + ' ' + P.n(Math.sin(a) * l * 0.5 - 1) + ' ' + P.n(Math.cos(a) * l) + ' ' + P.n(Math.sin(a) * l), 'none', cols[i % cols.length], 0.9, rc());
    });
  }
  function hashBrown(P, rnd) {
    var d = P.slab(rnd, 31, 20, 0.45, 0.03, 16), out = P.shadow(d, 2, 2.8) + P.path(d, '#D69A44', '#9E661E', 1.2);
    out += P.path(P.slab(rnd, 26, 15.5, 0.45, 0.06, 14), '#E5B45C', null, 0);
    out += shredded(P, rnd, 26, 15, 46, ['#B9802F', '#F2D488', '#C98E3A']);
    return out + P.hl(-10, -8, 11, 3, '#FFFFFF', 0.3, -12);
  }
  function rosti(P, rnd) {
    var d = P.blob(rnd, 34, 32, 0.045, 24), out = P.shadow(d, 2, 2.6) + P.path(d, '#C98A36', '#8E5A1E', 1.1);
    out += P.path(P.blob(rnd, 30, 28, 0.05, 18), '#DCA448', null, 0) + P.path(P.blob(rnd, 22, 20, 0.08, 12, -2, -2), '#E6B65C', null, 0, { opacity: '0.85' });
    out += shredded(P, rnd, 30, 28, 80, ['#B07626', '#F0CF7E', '#C98E3A', '#9E661E']);
    return out + P.hl(-12, -12, 12, 4, '#FFFFFF', 0.28, -25);
  }
  function scallop(P, rnd) {
    var d = P.blob(rnd, 30, 26, 0.06, 18), out = P.shadow(d, 2, 2.6) + P.path(d, '#E7BC66', '#B98A3A', 1.1);
    out += P.scatter(rnd, 16, 27, 23, function (x, y, i, q) { var a = Math.atan2(y, x), r = 28 + q() * 2; return P.path(P.blob(q, 3 + q() * 2, 2 + q(), 0.25, 6, Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.82), '#EDC97A', '#C99A4A', 0.6); });
    out += P.path(P.blob(rnd, 25, 21, 0.05, 14), '#EDC877', null, 0) + P.path(P.blob(rnd, 20, 17, 0.06, 12), 'none', '#C99A4A', 0.8, { opacity: '0.45' });
    out += P.crumbs(rnd, 14, 20, 16, ['#D2A14C', '#F6DC9A'], 1.3);
    return out + P.hl(-9, -9, 11, 4, '#FFFFFF', 0.35, -20);
  }
  function fondant(P, rnd) {
    var out = P.shadow(P.blob(rnd, 19, 19, 0.02, 12), 3, 4.5) + P.circle(0, 0, 19, '#E3B256', '#A8742A', 1.2);
    out += P.path(P.blob(rnd, 15.5, 15.5, 0.05, 12), '#B87830', null, 0) + P.path(P.blob(rnd, 11, 10, 0.12, 10, 1, 1), '#C98A36', null, 0, { opacity: '0.9' });
    out += P.hl(-5, -6, 6, 2.6, '#FFFFFF', 0.5, -30) + P.hl(4, 6, 3, 1.2, '#FFFFFF', 0.35, -30);
    // a thyme sprig
    out += P.path('M-4 3 Q4 -2 13 -9', 'none', '#6B5A3A', 0.7, rc());
    for (var i = 0; i < 5; i++) { var t = i / 5, x = -3 + t * 15, y = 2.5 - t * 10.5; out += P.g(P.at(x, y, -35 + (i % 2 ? 60 : -60)), P.path(P.leafD(3.2, 1.6), '#5E8C3A')); }
    return out;
  }
  function jacket(P, rnd) {
    var d = P.blob(rnd, 40, 27, 0.05, 14), out = P.shadow(d, 2.5, 3.5) + P.path(d, '#8E5E34', '#5E3C1E', 1.2);
    out += P.crumbs(rnd, 22, 36, 23, ['#B98A5A', '#6E4424'], 0.9) + P.hl(-18, -14, 12, 3.5, '#FFFFFF', 0.25, -12);
    // the split, pushed open, fluffy flesh, a knob of butter
    out += P.path(P.blob(rnd, 25, 14, 0.18, 14, 2, 1), '#7A4E2A', null, 0);
    out += P.path(P.blob(rnd, 22, 12, 0.22, 14, 2, 1), '#F2E0A2', '#D9C27A', 0.7) + P.crumbs(rnd, 12, 18, 9, ['#E2C878', '#FBF0C8'], 1.2);
    out += P.path(P.blob(rnd, 8, 5, 0.25, 8, -9, 2), '#F6DC86', null, 0, { opacity: '0.9' });
    out += dollop(P, rnd, 5, -1, 10, SC) + bits(P, rnd, 'chive', 14, 18, 10);
    return out;
  }
  function hasselback(P, rnd) {
    var rx = 31, ry = 20, d = P.blob(rnd, rx, ry, 0.03, 14), out = P.shadow(d, 2.5, 3.5) + P.path(d, '#D09442', '#8E5A1E', 1.2);
    out += P.path(P.blob(rnd, rx - 3, ry - 3, 0.03, 12), '#E4B05A', null, 0);
    for (var x = -rx + 6; x < rx - 4; x += 3.6) {
      var h = ry * Math.sqrt(Math.max(0, 1 - (x / rx) * (x / rx))) * 0.86;
      out += P.path('M' + P.n(x) + ' ' + P.n(-h) + ' Q' + P.n(x + 1.6) + ' 0 ' + P.n(x) + ' ' + P.n(h), 'none', '#8E5A1E', 1, rc()) + P.path('M' + P.n(x + 1.2) + ' ' + P.n(-h * 0.85) + ' Q' + P.n(x + 2.6) + ' ' + P.n(-h * 0.3) + ' ' + P.n(x + 2.2) + ' ' + P.n(h * 0.1), 'none', '#F2CF7A', 0.9, rc({ opacity: '0.85' }));
    }
    out += bits(P, rnd, 'parsley', 8, rx * 0.7, ry * 0.6) + bits(P, rnd, 'salt', 6, rx * 0.7, ry * 0.6);
    return out + P.hl(-10, -11, 13, 3, '#FFFFFF', 0.3, -6);
  }
  function chat(P, q, x, y, half) {
    var r = 12.5 * (0.88 + q() * 0.24), d = P.blob(q, r, r * 0.9, 0.06, 10), s = P.shadow(d, 1.5, 2.2) + P.path(d, '#E3C885', '#A8894A', 1);
    if (half) s += P.path(P.blob(q, r * 0.84, r * 0.76, 0.05, 10), '#F3E2A6', null, 0) + P.path(P.blob(q, r * 0.5, r * 0.42, 0.1, 8, -1, -1), '#F8ECC2', null, 0, { opacity: '0.8' });
    else s += P.circle(r * 0.3, -r * 0.2, 0.9, '#8E6A3A') + P.circle(-r * 0.4, r * 0.35, 0.8, '#8E6A3A') + P.path(P.blob(q, r * 0.5, r * 0.3, 0.1, 8, r * 0.2, r * 0.45), '#C9A764', null, 0, { opacity: '0.5' });
    s += P.hl(-r * 0.32, -r * 0.38, r * 0.34, r * 0.16, '#FFFFFF', 0.55, -25) + bits(P, q, 'parsley', 3, r * 0.6, r * 0.5);
    return P.g(P.at(x, y), s);
  }
  function skinBoat(P, q, x, y, rot) {
    var d = P.blob(q, 26, 16, 0.05, 12), s = P.shadow(d, 1.8, 2.6) + P.path(d, '#8E5E34', '#5E3C1E', 1.1);
    s += P.path(P.blob(q, 22, 12.5, 0.06, 12), '#D9A24A', null, 0);
    s += P.path(P.blob(q, 20, 11, 0.14, 12), C.cheese, P.shade(C.cheese, -0.18), 0.7) + P.scatter(q, 6, 15, 7, function (x2, y2, i, q2) { return P.path(P.blob(q2, 2 + q2() * 2, 1.4 + q2(), 0.3, 6, x2, y2), '#C98A3A', null, 0, { opacity: '0.75' }); });
    s += bits(P, q, 'bacon', 7, 15, 7) + bits(P, q, 'shallot', 5, 15, 7);
    return P.g(P.at(x, y, rot), s);
  }
  function gratin(o) {
    return function (P, rnd) {
      var w = o.w || 62, h = o.h || 58, rr = 6, out = P.shadow(P.slab(rnd, w / 2, h / 2, 0.85, 0.01, 16), 2.5, 3.5);
      // the cut face at the front: thin layers of potato and cream
      out += P.rect(-w / 2, -h / 2, w, h, rr, '#EBD7A0', '#B9944A', 1.2);
      for (var k = 0; k < 4; k++) out += P.line(-w / 2 + 2, h / 2 - 2.5 - k * 2.4, w / 2 - 2, h / 2 - 2.5 - k * 2.4, k % 2 ? '#F6EBC8' : '#E2C47A', 1.2);
      out += P.rect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 11, rr - 1, '#F0DDA6', null, 0);
      // overlapping slices on top, row by row
      for (var r0 = 0; r0 < 4; r0++) for (var c0 = 0; c0 < 5; c0++) {
        var cx = -w / 2 + 7 + c0 * (w - 12) / 4 + (r0 % 2 ? 3 : -2), cy = -h / 2 + 8 + r0 * (h - 20) / 3.2;
        if (cx > w / 2 - 6) continue;
        out += P.path('M' + P.n(cx - 7) + ' ' + P.n(cy + 3) + ' Q' + P.n(cx) + ' ' + P.n(cy - 6) + ' ' + P.n(cx + 7) + ' ' + P.n(cy + 3), 'none', '#C9A25A', 1, rc({ opacity: '0.75' }));
      }
      out += P.scatter(rnd, o.brown || 9, w / 2 - 8, h / 2 - 10, function (x, y, i, q) { return P.path(P.blob(q, 3 + q() * 4, 2 + q() * 3, 0.3, 7, x, y - 4), i % 3 ? '#C98E3A' : '#A86F22', null, 0, { opacity: '0.6' }); });
      return out + P.hl(-w * 0.2, -h * 0.3, w * 0.2, h * 0.05, '#FFFFFF', 0.4, -8) + (o.thyme ? bits(P, rnd, 'parsley', 6, w / 2 - 10, h / 2 - 14) : '');
    };
  }
  function tortilla(P, rnd) {
    var R = 66, a = 25 * Math.PI / 180, top = -R / 2, d = 'M0 ' + P.n(top) + ' L' + P.n(-R * Math.sin(a)) + ' ' + P.n(top + R * Math.cos(a)) + ' A' + R + ' ' + R + ' 0 0 0 ' + P.n(R * Math.sin(a)) + ' ' + P.n(top + R * Math.cos(a)) + ' Z';
    var out = P.shadow(d, 2.5, 3.5) + P.path(d, '#DDA948', '#8E6018', 1.2);
    // the pale cut faces along the straight sides, the browned rim along the round side, a mottled golden top
    out += P.path('M0 ' + P.n(top + 2) + ' L' + P.n(-R * Math.sin(a) * 0.97) + ' ' + P.n(top + R * Math.cos(a) * 0.97) + ' M0 ' + P.n(top + 2) + ' L' + P.n(R * Math.sin(a) * 0.97) + ' ' + P.n(top + R * Math.cos(a) * 0.97), 'none', '#F4DC92', 3, rc());
    out += P.path('M' + P.n(-R * Math.sin(a) * 0.93) + ' ' + P.n(top + R * Math.cos(a) * 0.95) + ' A' + P.n(R * 0.95) + ' ' + P.n(R * 0.95) + ' 0 0 0 ' + P.n(R * Math.sin(a) * 0.93) + ' ' + P.n(top + R * Math.cos(a) * 0.95), 'none', '#A8702A', 3.6, rc({ opacity: '0.85' }));
    out += P.scatter(rnd, 18, 14, 20, function (x, y, i, q) { var k = Math.max(0.3, (y + 26) / 46); return P.path(P.blob(q, (2.5 + q() * 4.5) * k, (2 + q() * 3) * k, 0.3, 7, x * k * 0.85, y + 8), i % 3 ? '#C08236' : '#A06A26', null, 0, { opacity: '0.55' }); });
    out += P.path('M-10 4 Q0 -1 10 4 M-14 16 Q0 10 14 16', 'none', '#F0CC78', 1.4, rc({ opacity: '0.6' }));
    return out + P.hl(-3, -2, 8, 2.5, '#FFFFFF', 0.35, -70);
  }
  // a loose salad of potato: a creamy bed, chunks, bits
  function potatoSalad(P, rnd) {
    var d = P.blob(rnd, 37, 31, 0.1, 12), out = P.shadow(d, 1.5, 2) + P.path(d, '#F3E6C2', '#D6C69A', 1);
    out += heap(P, rnd, { n: 20, rx: 26, ry: 21, top: 0.35 }, function (P, q, x, y) {
      var dd = P.slab(q, 5.5 + q() * 1.5, 4.5 + q() * 1.5, 0.55, 0.1, 10);
      return P.g(P.at(x, y, q() * 90), P.shadow(dd, 0.8, 1.2) + P.path(dd, '#EFDB9C', '#C9B06A', 0.8) + P.path(dd, '#FBF4DC', null, 0, { opacity: '0.7', transform: 'translate(-1 -1) scale(0.55)' }));
    });
    out += P.scatter(rnd, 3, 22, 16, function (x, y, i, q) { return P.path(P.blob(q, 5, 3.6, 0.15, 8, x, y), '#FFFFFF', '#E6E0D2', 0.7) + P.circle(x + 1, y, 2.2, C.yolk); });
    return out + bits(P, rnd, 'chive', 22, 28, 22) + bits(P, rnd, 'pepper', 8, 26, 20);
  }
  function germanSalad(P, rnd) {
    var out = P.path(P.blob(rnd, 36, 30, 0.1, 12), '#E9D79A', null, 0, { opacity: '0.35' });
    out += heap(P, rnd, { n: 16, rx: 22, ry: 18, top: 0.35 }, function (P, q, x, y) {
      var r = 11 + q() * 3, dd = P.blob(q, r, r * 0.85, 0.04, 10);
      return P.g(P.at(x, y, q() * 180), P.shadow(dd, 0.8, 1.2) + P.path(dd, '#E9CF78', '#B99A4A', 0.9) + P.path(dd, 'none', '#C9A86A', 1.6, { transform: 'scale(0.9)', opacity: '0.35' }) + P.hl(-r * 0.3, -r * 0.3, r * 0.3, r * 0.12, '#FFFFFF', 0.45, -20));
    });
    out += P.scatter(rnd, 6, 26, 20, function (x, y, i, q) { var a = q() * 180; return P.g(P.at(x, y, a), P.path('M-5 0 Q0 -3.5 5 0', 'none', C.onion, 1.6, rc())); });
    return out + bits(P, rnd, 'bacon', 10, 26, 20) + bits(P, rnd, 'chive', 14, 28, 22) + bits(P, rnd, 'parsley', 8, 26, 20);
  }

  /* ---------- the items ---------- */
  var CHIPS = { n: 22, rx: 24, ry: 19, len: [36, 48], wid: 7.5 };
  function o2(a, b) { return Object.assign({}, a, b); }

  L.add('potato', [
    // chips and fries
    { id: 'chips-pile', name: 'Chips', sub: 'Chips and fries', kw: 'chips hot chips chippies fries french fries frites pile side', form: 'pile', cook: 'fried', role: 'starch', g: 150, w: 78, h: 82, side: { s: 'pile', h: 24, c: C.chip }, draw: chipPile(CHIPS) },
    { id: 'chips-pile-small', name: 'Chips, small serve', sub: 'Chips and fries', kw: 'chips small side kids fries', form: 'pile', cook: 'fried', role: 'starch', g: 100, w: 76, h: 62, of: 'chips-pile', side: { s: 'pile', h: 20, c: C.chip }, draw: chipPile(o2(CHIPS, { n: 15, rx: 19, ry: 15 })) },
    { id: 'chips-pile-large', name: 'Chips, large serve', sub: 'Chips and fries', kw: 'chips bowl of chips large share fries', form: 'pile', cook: 'fried', role: 'sidedish', g: 300, w: 104, h: 96, of: 'chips-pile', side: { s: 'pile', h: 34, c: C.chip }, draw: chipPile(o2(CHIPS, { n: 40, rx: 34, ry: 27 })) },
    { id: 'chips-chicken-salt', name: 'Chips with chicken salt', sub: 'Chips and fries', kw: 'chips chicken salt seasoned fries chippies', form: 'pile', cook: 'fried', role: 'starch', g: 150, w: 84, h: 66, of: 'chips-pile', side: { s: 'pile', h: 24, c: C.chip }, draw: chipPile(o2(CHIPS, { dust: ['#E39A3A', '#D9822A', '#C9702A'] })) },
    { id: 'chips-thick-cut', name: 'Thick cut chips', sub: 'Chips and fries', kw: 'chunky chips steak fries thick cut wedges chippies', form: 'pile', cook: 'fried', role: 'starch', g: 200, w: 80, h: 68, side: { s: 'pile', h: 28, c: C.chip }, draw: chipPile({ n: 14, rx: 22, ry: 18, len: [40, 52], wid: 11.5, ends: true, col: '#E6B552' }) },
    { id: 'fries-shoestring', name: 'Shoestring fries', sub: 'Chips and fries', kw: 'shoestring fries thin fries skinny french fries matchstick', form: 'pile', cook: 'fried', role: 'starch', g: 150, w: 72, h: 64, side: { s: 'pile', h: 22, c: C.chip }, draw: chipPile({ n: 40, rx: 24, ry: 19, len: [28, 46], wid: 4, col: '#ECC264', piece: stick, top: 0.45 }) },
    { id: 'fries-sweet-potato', name: 'Sweet potato fries', sub: 'Chips and fries', kw: 'sweet potato fries kumara chips orange', form: 'pile', cook: 'fried', role: 'starch', g: 150, w: 74, h: 62, side: { s: 'pile', h: 22, c: SWEET }, draw: chipPile({ n: 18, rx: 22, ry: 18, len: [36, 50], wid: 8, col: SWEET, edge: SWEET_EDGE, ends: true, dust: ['#FFFFFF', '#F6EDE0'] }) },
    { id: 'fries-crinkle-cut', name: 'Crinkle cut chips', sub: 'Chips and fries', kw: 'crinkle cut chips crinkle fries ripple wavy', form: 'pile', cook: 'fried', role: 'starch', g: 150, w: 72, h: 70, side: { s: 'pile', h: 24, c: C.chip }, draw: chipPile({ n: 16, rx: 22, ry: 18, len: [36, 46], wid: 10, piece: crinkle }) },
    { id: 'chips-beer-battered', name: 'Beer battered chips', sub: 'Chips and fries', kw: 'beer battered chips batter fries crunchy coated', form: 'pile', cook: 'battered', role: 'starch', g: 150, w: 70, h: 70, side: { s: 'pile', h: 24, c: '#E0AA4E' }, draw: chipPile({ n: 18, rx: 22, ry: 18, len: [38, 48], wid: 9.5, piece: battered }) },
    { id: 'fries-waffle', name: 'Waffle fries', sub: 'Chips and fries', kw: 'waffle fries lattice chips criss cut', form: 'pile', cook: 'fried', role: 'starch', g: 150, w: 82, h: 72, side: { s: 'pile', h: 22, c: C.chip }, draw: function (P, rnd) { return heap(P, rnd, { n: 11, rx: 26, ry: 21, top: 0.35 }, function (P, q, x, y, i, up) { return waffle(P, q, x, y, q() * 180, up ? P.shade(C.chip, 0.08) : C.chip); }); } },
    { id: 'fries-curly', name: 'Curly fries', sub: 'Chips and fries', kw: 'curly fries spiral seasoned twister', form: 'pile', cook: 'fried', role: 'starch', g: 150, w: 68, h: 62, side: { s: 'pile', h: 24, c: '#DC9A3C' }, draw: function (P, rnd) { return heap(P, rnd, { n: 12, rx: 24, ry: 20, top: 0.4 }, function (P, q, x, y) { return curly(P, q, x, y, q() * 180); }); } },
    { id: 'potato-wedges', name: 'Potato wedges, skin on', sub: 'Chips and fries', kw: 'wedges seasoned wedges spicy potato wedge skin on', form: 'pile', cook: 'fried', role: 'starch', g: 200, w: 82, h: 80, side: { s: 'pile', h: 28, c: '#E2A548' }, draw: wedgePile({ n: 7, rx: 22, ry: 17, len: 54, wid: 21 }) },
    { id: 'potato-gems', name: 'Potato gems', sub: 'Chips and fries', kw: 'gems tater tots potato gems tots pom poms', form: 'pile', cook: 'fried', role: 'starch', g: 150, w: 72, h: 62, side: { s: 'pile', h: 22, c: GEM }, draw: function (P, rnd) { return heap(P, rnd, { n: 15, rx: 28, ry: 22, top: 0.35 }, function (P, q, x, y) { return gem(P, q, x, y, q() * 180); }); } },
    { id: 'polenta-chips', name: 'Polenta chips, stacked', sub: 'Chips and fries', kw: 'polenta chips jenga stacked fries parmesan', form: 'stack', cook: 'fried', role: 'starch', n: 6, w: 64, h: 60, side: { s: 'pile', h: 30, c: '#F0C75A' }, draw: function (P, rnd) {
      var out = '', col = '#EEC45A', edge = '#B98A2A';
      [[0, -14, 0], [0, 0, 0], [0, 14, 0], [-14, 0, 90], [0, 0, 90], [14, 0, 90]].forEach(function (p, i) {
        var len = 54 + rnd() * 6, wid = 13;
        out += P.g(P.at(p[0] + (rnd() - 0.5) * 2, p[1] + (i > 2 ? -2 : 1), p[2] + (rnd() - 0.5) * 6), P.rect(-len / 2 + 1.5, -wid / 2 + 2.5, len, wid, 2, '#000000', null, 0, { opacity: '0.14' }) + P.rect(-len / 2, -wid / 2, len, wid, 2, i > 2 ? P.shade(col, 0.06) : col, edge, 1) + P.rect(-len / 2 + 1, wid * 0.1, len - 2, wid * 0.36, 1.5, P.shade(col, -0.14), null, 0, { opacity: '0.6' }) + P.line(-len / 2 + 3, -wid * 0.28, len / 2 - 3, -wid * 0.28, '#FFFFFF', 1.6, { opacity: '0.4' }) + P.crumbs(rnd, 5, len / 2 - 4, wid / 2 - 2, ['#F8EBC2', '#D9A84A'], 0.9));
      });
      return out + bits(P, rnd, 'rosemary', 5, 22, 20);
    } },
    { id: 'halloumi-fries', name: 'Halloumi fries', sub: 'Chips and fries', kw: 'halloumi fries haloumi chips cheese sticks fried', form: 'pile', cook: 'fried', role: 'sidedish', n: 6, w: 56, h: 66, side: { s: 'pile', h: 24, c: '#F2E3B8' }, draw: function (P, rnd) {
      return heap(P, rnd, { n: 6, rx: 18, ry: 14, top: 0.34 }, function (P, q, x, y) {
        var len = 44 + q() * 6, wid = 12, col = '#F0DBA4', s = P.rect(-len / 2 + 1, -wid / 2 + 2, len, wid, 3, '#000000', null, 0, { opacity: '0.13' }) + P.rect(-len / 2, -wid / 2, len, wid, 3, col, '#BF974A', 1);
        s += P.rect(-len / 2 + 1, wid * 0.08, len - 2, wid * 0.36, 2, '#E2BE72', null, 0, { opacity: '0.7' });
        for (var i = 0; i < 4; i++) s += P.path(P.blob(q, 2.5 + q() * 4, 1.5 + q() * 1.2, 0.3, 7, (q() - 0.5) * (len - 12), (q() - 0.5) * 5), i % 2 ? '#DDB060' : '#D49E4C', null, 0, { opacity: '0.8' });
        return P.g(P.at(x, y, q() * 180), s + P.line(-len / 2 + 5, -wid * 0.24, len / 2 - 6, -wid * 0.24, '#FFFFFF', 1.6, { opacity: '0.55' }));
      });
    } },
    { id: 'loaded-fries', name: 'Loaded fries', sub: 'Chips and fries', kw: 'loaded fries dirty fries cheese sauce bacon gravy chips loaded chips', form: 'pile', cook: 'fried', role: 'sidedish', g: 300, w: 92, h: 82, side: { s: 'pile', h: 30, c: C.chip }, draw: function (P, rnd) {
      return chipsSvg(P, rnd, { n: 30, rx: 30, ry: 24 }) + drizzle(P, rnd, 30, 18, C.gravy, 3.6, 7, 20) + cheeseSauce(P, rnd, 34, 26) + bits(P, rnd, 'bacon', 16, 28, 21) + bits(P, rnd, 'shallot', 12, 28, 21);
    } },
    { id: 'loaded-gems', name: 'Loaded cheesy gems', sub: 'Chips and fries', kw: 'loaded gems cheesy gems tots bacon cheese sauce tater tots', form: 'pile', cook: 'fried', role: 'sidedish', g: 250, w: 70, h: 68, side: { s: 'pile', h: 28, c: GEM }, draw: function (P, rnd) {
      return heap(P, rnd, { n: 22, rx: 30, ry: 24, top: 0.35 }, function (P, q, x, y) { return gem(P, q, x, y, q() * 180); }) + cheeseSauce(P, rnd, 32, 25) + bits(P, rnd, 'bacon', 14, 26, 20) + dollop(P, rnd, 6, -4, 6.5) + bits(P, rnd, 'shallot', 10, 26, 20);
    } },
    { id: 'snack-pack', name: 'Snack pack in a box', sub: 'Chips and fries', kw: 'hsp halal snack pack snack pack kebab meat chips garlic chilli bbq box', form: 'portion', cook: 'fried', role: 'main', g: 450, w: 124, h: 92, side: { s: 'cup', h: 30, c: C.chip }, draw: function (P, rnd) {
      var out = P.rect(-58, -42, 120, 88, 8, '#000000', null, 0, { opacity: '0.12' }) + P.rect(-60, -44, 120, 88, 8, '#FFFFFF', '#CFC9BC', 1.6) + P.rect(-54, -38, 108, 76, 6, '#F4F1EA', '#E0DBCF', 1);
      out += chipsSvg(P, rnd, { n: 44, rx: 40, ry: 26, len: [30, 40], wid: 7, rot: 28, top: 0.3 });
      // shaved kebab meat: thin crumpled browned strips
      out += P.scatter(rnd, 18, 36, 22, function (x, y, i, q) { var d = P.blob(q, 10 + q() * 4, 3.6 + q() * 1.5, 0.32, 11); return P.g(P.at(x, y, q() * 180), P.path(d, i % 3 ? '#9A6236' : '#B07A46', '#5E3A1E', 0.7) + P.path('M-7 -0.6 L-2 0.8 L3 -0.8 L7 0.4', 'none', '#6A3E1E', 1.1, rc({ opacity: '0.55' })) + P.path('M-5 -1.8 L4 -2', 'none', '#D2A272', 0.8, rc({ opacity: '0.7' }))); }, 9);
      out += drizzle(P, rnd, 42, 22, '#F7F1E0', 2.6, 9, 8) + drizzle(P, rnd, 40, 20, '#C9302A', 2, 8, -10) + drizzle(P, rnd, 38, 18, '#5E2A12', 2, 7, 4);
      return out;
    } },

    // mash
    { id: 'mash-mound', name: 'Mash', sub: 'Mash', kw: 'mash mashed potato pomme puree creamy mash mound', form: 'mound', role: 'starch', g: 150, w: 68, h: 62, side: { s: 'mound', h: 30, c: C.mash }, draw: mash({ r: 34 }) },
    { id: 'mash-sweet-potato', name: 'Sweet potato mash', sub: 'Mash', kw: 'sweet potato mash kumara orange', form: 'mound', role: 'starch', g: 150, w: 68, h: 64, of: 'mash-mound', side: { s: 'mound', h: 30, c: '#E8964A' }, draw: mash({ r: 34, col: '#E8964A' }) },
    { id: 'colcannon', name: 'Colcannon', sub: 'Mash', kw: 'colcannon mash cabbage kale spring onion champ irish', form: 'mound', role: 'starch', g: 150, w: 66, h: 62, of: 'mash-mound', side: { s: 'mound', h: 30, c: C.mash }, draw: mash({ r: 34, flecks: ['#5E8C3A', '#7EA453', '#4F7F2F'] }) },
    { id: 'mash-gravy', name: 'Mash with gravy', sub: 'Mash', kw: 'mash gravy mashed potato well pool bangers', form: 'mound', role: 'starch', g: 200, w: 68, h: 62, side: { s: 'mound', h: 30, c: C.mash }, draw: mash({ r: 34, gravy: true }) },
    { id: 'mash-quenelle', name: 'Mash quenelle', sub: 'Mash', kw: 'quenelle mash rocher spoon shaped', form: 'quenelle', role: 'starch', g: 70, w: 58, h: 32, side: { s: 'mound', h: 20, c: C.mash }, draw: quenelle({ len: 56, wid: 30 }) },
    { id: 'mash-piped', name: 'Piped mash swirl', sub: 'Mash', kw: 'piped mash swirl rosette star nozzle', form: 'mound', role: 'starch', g: 120, w: 58, h: 54, side: { s: 'mound', h: 28, c: C.mash }, draw: function (P, rnd) { return rosette(P, rnd, 0, 0, { r: 30, rope: 9, turns: 2.4 }); } },
    { id: 'duchess-potatoes', name: 'Duchess potatoes', sub: 'Mash', kw: 'duchess potatoes piped baked rosettes pommes duchesse', form: 'cluster', cook: 'baked', role: 'starch', n: 3, w: 58, h: 54, side: { s: 'mound', h: 20, c: '#F0D9A0' }, draw: function (P, rnd) {
      return [[-13, -12], [14, -9], [0, 12]].map(function (p) { return rosette(P, rnd, p[0], p[1], { r: 14, rope: 5, turns: 2, col: '#F2DDA6', edge: '#B98A3A', tip: '#D49B48' }); }).join('');
    } },
    { id: 'potato-puree-swoosh', name: 'Potato purée swoosh', sub: 'Mash', kw: 'puree swoosh pomme puree smear swipe mash', form: 'swoosh', role: 'starch', g: 60, w: 104, h: 24, side: { s: 'sauce', h: 6, c: C.mash }, draw: function (P) {
      var d = swooshD(P, 96, 22, 6), out = P.shadow(d, 1, 1.5) + P.path(d, '#F4ECD4', '#D9CCA8', 1);
      out += P.path('M-36 -1 Q-6 -10 30 -5', 'none', '#E2D6B4', 3, rc({ opacity: '0.8' })) + P.path('M-38 -5 Q-8 -14 26 -9', 'none', '#FFFFFF', 1.6, rc({ opacity: '0.7' }));
      return out;
    } },

    // roast and baked
    { id: 'roast-potatoes', name: 'Roast potatoes', sub: 'Roast and baked', kw: 'roast potatoes roasties crispy potatoes duck fat roast spuds', form: 'cluster', cook: 'roasted', role: 'starch', n: 4, w: 66, h: 58, side: { s: 'pile', h: 26, c: ROAST }, draw: function (P, rnd) {
      return [[-13, -11], [14, -10], [-12, 12], [14, 13]].map(function (p) { return roastPiece(P, rnd, p[0], p[1]); }).join('') + bits(P, rnd, 'rosemary', 8, 24, 20) + bits(P, rnd, 'salt', 6, 24, 20);
    } },
    { id: 'roast-potatoes-duck-fat', name: 'Duck fat potatoes', sub: 'Roast and baked', kw: 'duck fat potatoes roast golden crispy', form: 'cluster', cook: 'roasted', role: 'starch', n: 4, w: 66, h: 58, of: 'roast-potatoes', side: { s: 'pile', h: 26, c: '#D69434' }, draw: function (P, rnd) {
      return [[-13, -11], [14, -10], [-12, 12], [14, 13]].map(function (p) { return roastPiece(P, rnd, p[0], p[1], { col: '#D69434', edge: '#9A6018' }); }).join('') + bits(P, rnd, 'salt', 8, 24, 20);
    } },
    { id: 'smashed-potatoes', name: 'Smashed potatoes', sub: 'Roast and baked', kw: 'smashed potatoes crushed crispy smashed chats', form: 'cluster', cook: 'roasted', role: 'starch', n: 3, w: 84, h: 74, side: { s: 'slab', h: 12, c: '#D9A04A' }, draw: function (P, rnd) {
      return [[-17, -12], [17, -10], [0, 14]].map(function (p) { return smashPiece(P, rnd, p[0], p[1]); }).join('');
    } },
    { id: 'kipfler-halves', name: 'Kipfler potato halves', sub: 'Roast and baked', kw: 'kipfler kipflers fingerling roast halves', form: 'cluster', cook: 'roasted', role: 'starch', n: 6, w: 84, h: 66, side: { s: 'pile', h: 16, c: '#E6B356' }, draw: function (P, rnd) {
      return [[-12, -18, 18], [14, -16, -14], [-18, 0, 32], [9, 1, 6], [-6, 17, -18], [19, 17, 22]].map(function (p) { return halfPotato(P, rnd, p[0], p[1], p[2], { len: 42, wid: 17, bend: 2, salt: true }); }).join('') + bits(P, rnd, 'rosemary', 6, 24, 20);
    } },
    { id: 'chat-potatoes', name: 'Chat potatoes, buttered', sub: 'Roast and baked', kw: 'chat potatoes chats baby potatoes boiled new potatoes butter parsley', form: 'cluster', cook: 'steamed', role: 'starch', n: 5, w: 58, h: 52, side: { s: 'pile', h: 22, c: '#E3C885' }, draw: function (P, rnd) {
      return [[-14, -14, 0], [12, -15, 1], [-18, 8, 0], [5, 4, 0], [16, 16, 1]].map(function (p) { return chat(P, rnd, p[0], p[1], p[2]); }).join('');
    } },
    { id: 'fondant-potato', name: 'Fondant potato', sub: 'Roast and baked', kw: 'fondant potato pomme fondant butter thyme', form: 'piece', cook: 'roasted', role: 'starch', n: 1, w: 42, h: 42, side: { s: 'disc', h: 30, c: '#E3B256' }, draw: fondant },
    { id: 'hasselback-potato', name: 'Hasselback potato', sub: 'Roast and baked', kw: 'hasselback potato accordion sliced roast', form: 'piece', cook: 'roasted', role: 'starch', n: 1, w: 64, h: 42, side: { s: 'mound', h: 28, c: '#D09442' }, draw: hasselback },
    { id: 'jacket-potato', name: 'Jacket potato with sour cream', sub: 'Roast and baked', kw: 'jacket potato baked potato spud sour cream chives split', form: 'piece', cook: 'baked', role: 'sidedish', n: 1, w: 80, h: 56, side: { s: 'mound', h: 40, c: '#8E5E34' }, draw: jacket },
    { id: 'potato-gratin', name: 'Potato gratin', sub: 'Roast and baked', kw: 'gratin dauphinoise scalloped potatoes potato bake square portion', form: 'portion', cook: 'baked', role: 'sidedish', g: 180, w: 66, h: 62, side: { s: 'layer', h: 26, c: '#EBD7A0' }, draw: gratin({ w: 62, h: 58, brown: 9 }) },
    { id: 'potato-bake', name: 'Potato bake, cheesy', sub: 'Roast and baked', kw: 'potato bake cheesy bake cream cheese square portion', form: 'portion', cook: 'baked', role: 'sidedish', g: 200, w: 66, h: 62, of: 'potato-gratin', side: { s: 'layer', h: 28, c: '#EBD7A0' }, draw: gratin({ w: 62, h: 58, brown: 18, thyme: true }) },
    { id: 'sweet-potato-wedges', name: 'Roast sweet potato wedges', sub: 'Roast and baked', kw: 'sweet potato wedges kumara roast orange', form: 'cluster', cook: 'roasted', role: 'starch', n: 5, w: 72, h: 74, side: { s: 'pile', h: 22, c: SWEET }, draw: function (P, rnd) {
      return wedgePile({ n: 5, rx: 18, ry: 14, len: 58, wid: 19, col: '#E8873A', edge: SWEET_EDGE, skin: SWEET_SKIN, spice: ['#9E3B22', '#5E7F2F', '#FFFFFF'] })(P, rnd);
    } },
    { id: 'potato-skins', name: 'Loaded potato skins', sub: 'Roast and baked', kw: 'potato skins loaded skins cheese bacon shallots', form: 'cluster', cook: 'baked', role: 'sidedish', n: 3, w: 82, h: 78, side: { s: 'pile', h: 16, c: '#8E5E34' }, draw: function (P, rnd) {
      return [[-10, -16, -20], [12, 0, 15], [-8, 18, -5]].map(function (p) { return skinBoat(P, rnd, p[0], p[1], p[2]); }).join('') + dollop(P, rnd, 18, -18, 6);
    } },

    // fried
    { id: 'hash-brown', name: 'Hash brown', sub: 'Fried', kw: 'hash brown hashbrown grated potato patty breakfast', form: 'piece', cook: 'fried', role: 'starch', n: 1, w: 66, h: 44, side: { s: 'slab', h: 9, c: '#D69A44' }, draw: hashBrown },
    { id: 'rosti', name: 'Rösti', sub: 'Fried', kw: 'rosti roesti potato rosti grated pan fried latke', form: 'piece', cook: 'fried', role: 'starch', n: 1, w: 72, h: 68, side: { s: 'disc', h: 8, c: '#DCA448' }, draw: rosti },
    { id: 'potato-croquettes', name: 'Potato croquettes', sub: 'Fried', kw: 'croquettes potato croquette crumbed croqueta', form: 'cluster', cook: 'crumbed', role: 'starch', n: 3, w: 66, h: 66, side: { s: 'stick', h: 19, c: C.crumb }, draw: function (P, rnd) {
      return [[-8, -17, -12], [8, 0, -12], [-4, 18, -12]].map(function (p) { return croquette(P, rnd, p[0], p[1], p[2]); }).join('');
    } },
    { id: 'potato-scallop', name: 'Potato scallop', sub: 'Fried', kw: 'potato scallop potato cake potato fritter battered slice fish shop', form: 'piece', cook: 'battered', role: 'starch', n: 1, w: 62, h: 54, side: { s: 'slab', h: 12, c: '#E7BC66' }, draw: scallop },
    { id: 'patatas-bravas', name: 'Patatas bravas', sub: 'Fried', kw: 'patatas bravas bravas potatoes spicy tomato aioli tapas cubes', form: 'pile', cook: 'fried', role: 'sidedish', g: 200, w: 66, h: 58, side: { s: 'pile', h: 22, c: '#E3AA4C' }, draw: function (P, rnd) {
      // a pool of bravas sauce under the potatoes, spoonfuls on top, then aioli and paprika
      var pool = P.blob(rnd, 34, 28, 0.12, 12), out = P.path(pool, '#C9452A', '#9E2E1C', 1) + P.hl(-14, -14, 10, 3, '#FFFFFF', 0.3, -20);
      out += heap(P, rnd, { n: 16, rx: 26, ry: 20, top: 0.35 }, function (P, q, x, y) { return cube(P, q, x, y, 15); });
      out += P.scatter(rnd, 3, 14, 10, function (x, y, i, q) { return P.path(P.blob(q, 5 + q() * 2, 3.5 + q(), 0.25, 8, x, y), '#C9452A', '#9E2E1C', 0.7); }, 10);
      return out + drizzle(P, rnd, 22, 12, C.aioli, 2.2, 8, 10) + bits(P, rnd, 'parsley', 12, 28, 22) + bits(P, rnd, 'dust', 10, 26, 20);
    } },
    { id: 'sauteed-potatoes', name: 'Sautéed potatoes', sub: 'Fried', kw: 'sauteed potatoes pan fried diced breakfast potatoes cubes garlic', form: 'pile', cook: 'fried', role: 'starch', g: 150, w: 66, h: 54, side: { s: 'pile', h: 18, c: '#E0A548' }, draw: function (P, rnd) {
      return heap(P, rnd, { n: 18, rx: 28, ry: 22, top: 0.3 }, function (P, q, x, y) { return cube(P, q, x, y, 12.5, { col: '#E0A548' }); }) + bits(P, rnd, 'parsley', 14, 28, 22) + bits(P, rnd, 'salt', 6, 26, 20);
    } },
    { id: 'tortilla-wedge', name: 'Tortilla wedge', sub: 'Fried', kw: 'spanish omelette tortilla espanola tortilla de patatas wedge slice tapas', form: 'wedge', cook: 'fried', role: 'sidedish', g: 150, w: 60, h: 68, side: { s: 'wedge', h: 22, c: '#E9C257' }, draw: tortilla },

    // salads
    { id: 'potato-salad', name: 'Potato salad', sub: 'Salads', kw: 'potato salad creamy mayo egg chives picnic', form: 'mound', role: 'sidedish', g: 150, w: 70, h: 60, side: { s: 'mound', h: 22, c: '#F3E6C2' }, draw: potatoSalad },
    { id: 'german-potato-salad', name: 'German potato salad', sub: 'Salads', kw: 'german potato salad warm bacon onion vinegar kartoffelsalat', form: 'pile', role: 'sidedish', g: 150, w: 74, h: 66, side: { s: 'pile', h: 18, c: '#E9CF78' }, draw: germanSalad }
  ]);
  // the helpers, for the other category files and "Draw it for me" (a pile of chips beside anything)
  L.POTATO = { chip: chip, chipPile: chipPile, chipsSvg: chipsSvg, heap: heap, stick: stick, wedge: wedge, gem: gem, cube: cube, waffle: waffle, curly: curly, drizzle: drizzle, bits: bits, dollop: dollop, cheeseSauce: cheeseSauce, mash: mash, quenelle: quenelle, rosette: rosette, spiralD: spiralD, swooshD: swooshD, roastPiece: roastPiece };
})();
