/* The drawing library: meat and poultry (see js/library.js for the fields). Drawn around 0,0, 1 unit is about 1.5 mm. */
(function () {
  'use strict';
  var L = window.LK_LIB, C = L.P.C;
  // colours used all through this file: bones, fat, the grill char, skewers
  var BONE = '#F4EBD8', BONE_ED = '#D9CDB4', FAT = '#F2E3C4', FATG = '#E2BE7E', FATG_ED = '#B98E4A', CHAR = '#3F2812';
  var WOOD = '#C99A62', WOOD_ED = '#9A7240', LAMB = '#6E4020', LAMB_SEAR = '#9A6232';

  /* ---------- outlines ---------- */
  function circD(P, cx, cy, rx, ry) { ry = ry || rx; return 'M' + P.n(cx - rx) + ' ' + P.n(cy) + ' A' + P.n(rx) + ' ' + P.n(ry) + ' 0 1 0 ' + P.n(cx + rx) + ' ' + P.n(cy) + ' A' + P.n(rx) + ' ' + P.n(ry) + ' 0 1 0 ' + P.n(cx - rx) + ' ' + P.n(cy) + ' Z'; }
  // a rounded bar along x, l long and w wide (sausages, bones, logs)
  function bar(P, l, w) {
    var r = w / 2, a = -l / 2 + r, b = l / 2 - r;
    return 'M' + P.n(a) + ' ' + P.n(-r) + ' H' + P.n(b) + ' A' + P.n(r) + ' ' + P.n(r) + ' 0 0 1 ' + P.n(b) + ' ' + P.n(r) + ' H' + P.n(a) + ' A' + P.n(r) + ' ' + P.n(r) + ' 0 0 1 ' + P.n(a) + ' ' + P.n(-r) + ' Z';
  }
  function rrD(P, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    return 'M' + P.n(x + r) + ' ' + P.n(y) + ' H' + P.n(x + w - r) + ' Q' + P.n(x + w) + ' ' + P.n(y) + ' ' + P.n(x + w) + ' ' + P.n(y + r) + ' V' + P.n(y + h - r) + ' Q' + P.n(x + w) + ' ' + P.n(y + h) + ' ' + P.n(x + w - r) + ' ' + P.n(y + h) + ' H' + P.n(x + r) + ' Q' + P.n(x) + ' ' + P.n(y + h) + ' ' + P.n(x) + ' ' + P.n(y + h - r) + ' V' + P.n(y + r) + ' Q' + P.n(x) + ' ' + P.n(y) + ' ' + P.n(x + r) + ' ' + P.n(y) + ' Z';
  }
  // a slice outline, w across and len long, the sides bowed a little
  function sliceD(P, w, len) {
    var a = w / 2, h = len / 2, r = Math.min(a, h) * 0.5, b = Math.min(w, len) * 0.06;
    return 'M' + P.n(-a + r) + ' ' + P.n(-h) + ' Q0 ' + P.n(-h - b) + ' ' + P.n(a - r) + ' ' + P.n(-h) + ' Q' + P.n(a) + ' ' + P.n(-h) + ' ' + P.n(a) + ' ' + P.n(-h + r) +
      ' Q' + P.n(a + b) + ' 0 ' + P.n(a) + ' ' + P.n(h - r) + ' Q' + P.n(a) + ' ' + P.n(h) + ' ' + P.n(a - r) + ' ' + P.n(h) + ' Q0 ' + P.n(h + b) + ' ' + P.n(-a + r) + ' ' + P.n(h) +
      ' Q' + P.n(-a) + ' ' + P.n(h) + ' ' + P.n(-a) + ' ' + P.n(h - r) + ' Q' + P.n(-a - b) + ' 0 ' + P.n(-a) + ' ' + P.n(-h + r) + ' Q' + P.n(-a) + ' ' + P.n(-h) + ' ' + P.n(-a + r) + ' ' + P.n(-h) + ' Z';
  }
  // a ribbon along a centre line: w wide (or w(t) for t 0 to 1); gives the outline and both edges
  function ribbon(P, pts, w) {
    var l = [], r = [], m = pts.length;
    for (var i = 0; i < m; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(m - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, ww = (typeof w === 'function' ? w(i / (m - 1)) : w) / 2;
      l.push([pts[i][0] + dy / len * ww, pts[i][1] - dx / len * ww]); r.push([pts[i][0] - dy / len * ww, pts[i][1] + dx / len * ww]);
    }
    return { d: P.smooth(l.concat(r.slice().reverse())), l: l, r: r };
  }

  /* ---------- bones ---------- */
  // a bone from x1,y1 (the meat end, tucked under the meat) to x2,y2; knob gives it a knuckle at the far end (ed: its outline)
  function bone(P, x1, y1, x2, y2, w, knob, ed) {
    var dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy), a = Math.atan2(dy, dx) * 180 / Math.PI, h = w / 2, e = l / 2;
    var d = knob ? P.smooth([[-e, -h], [e - w * 1.4, -h], [e - w * 0.5, -w * 0.92], [e + w * 0.3, -w * 0.62], [e + w * 0.12, 0], [e + w * 0.3, w * 0.62], [e - w * 0.5, w * 0.92], [e - w * 1.4, h], [-e, h], [-e - h, 0]]) : bar(P, l, w);
    var out = P.shadow(d, 1.4, 1.8) + P.path(d, BONE, ed || BONE_ED, 1);
    out += P.line(-e + w * 0.5, -h * 0.38, e - w * (knob ? 1.2 : 0.6), -h * 0.38, '#FFFFFF', Math.max(0.8, w * 0.2), { opacity: '0.6' });
    return P.g(P.at((x1 + x2) / 2, (y1 + y2) / 2, a), out);
  }

  /* ---------- beef ---------- */
  // a steak from above: a seared slab, grill marks, a lighter middle and a strip of fat on one edge.
  // o.under draws under it (a fat cap past the edge), o.over over the sear and under the grill marks (fat seams)
  function steak(o) {
    return function (P, rnd) {
      var cr = o.crust || C.beefCrust, d = P.slab(rnd, o.rx, o.ry, o.sq === undefined ? 0.35 : o.sq, 0.05, 14), out = o.under ? o.under(P, rnd) : '';
      out += P.shadow(d) + P.path(d, cr, P.shade(cr, -0.3), 1.2);
      if (o.fat) out += P.path('M' + P.n(-o.rx * 0.7) + ' ' + P.n(-o.ry * 0.92) + ' Q0 ' + P.n(-o.ry * 1.12) + ' ' + P.n(o.rx * 0.75) + ' ' + P.n(-o.ry * 0.86), 'none', '#E9D3A6', o.ry * 0.16, { 'stroke-linecap': 'round' });
      out += P.path(P.slab(rnd, o.rx * 0.84, o.ry * 0.8, 0.3, 0.06, 12), o.sear || C.beef, null, 0);
      if (o.over) out += o.over(P, rnd);
      if (o.marks !== false) out += P.grill(o.rx * 0.82, o.ry * 0.78, o.ang === undefined ? 35 : o.ang, o.gap || 14, C.charred, o.mw || 3.2);
      out += P.hl(-o.rx * 0.3, -o.ry * 0.35, o.rx * 0.28, o.ry * 0.12, '#FFFFFF', 0.16, -15);
      if (o.bone) out += P.path(o.bone, '#F4EBD8', '#D9CDB4', 1.2);
      return out;
    };
  }
  // the fat seams of a rib eye (the kernel between the eye and the cap)
  function kernel(rx, ry) {
    return function (P) {
      var f = { 'stroke-linecap': 'round', opacity: '0.9' };
      return P.path('M' + P.n(-rx * 0.62) + ' ' + P.n(ry * 0.12) + ' Q' + P.n(-rx * 0.2) + ' ' + P.n(-ry * 0.62) + ' ' + P.n(rx * 0.52) + ' ' + P.n(-ry * 0.34), 'none', '#E8D0A0', Math.max(2.4, rx * 0.075), f) +
        P.path('M' + P.n(-rx * 0.08) + ' ' + P.n(-ry * 0.4) + ' Q0 ' + P.n(-ry * 0.05) + ' ' + P.n(rx * 0.2) + ' ' + P.n(ry * 0.14), 'none', '#E8D0A0', 1.6, f) +
        P.path('M' + P.n(-rx * 0.3) + ' ' + P.n(ry * 0.38) + ' Q' + P.n(rx * 0.05) + ' ' + P.n(ry * 0.22) + ' ' + P.n(rx * 0.42) + ' ' + P.n(ry * 0.42), 'none', '#E8D0A0', 1.2, { opacity: '0.55', 'stroke-linecap': 'round' });
    };
  }
  // a grilled fat cap showing past the edge of the meat (rib eye, sirloin, pork chop)
  function cap(rx, ry, dx, dy, sq) {
    return function (P, rnd) {
      var d = P.slab(rnd, rx, ry, sq === undefined ? 0.3 : sq, 0.03, 14);
      return P.g(P.at(dx, dy), P.shadow(d) + P.path(d, FATG, FATG_ED, 1.1) + P.path(P.slab(rnd, rx - 3, ry - 3, sq === undefined ? 0.3 : sq, 0.03, 12), '#EDD3A0', null, 0));
    };
  }
  // sliced steak fanned out: each slice shows its crust and pink middle
  function slicedSteak(o) {
    return function (P) {
      var out = '', k = o.n || 6, sw = o.sw || 13, len = o.len || 46;
      for (var i = 0; i < k; i++) {
        var x = (i - (k - 1) / 2) * sw * 0.78, y = Math.abs(i - (k - 1) / 2) * 1.6, r = (i - (k - 1) / 2) * 4;
        var d = 'M' + P.n(-sw / 2) + ' ' + P.n(-len / 2 + 3) + ' Q0 ' + P.n(-len / 2 - 3) + ' ' + P.n(sw / 2) + ' ' + P.n(-len / 2 + 3) + ' L' + P.n(sw / 2) + ' ' + P.n(len / 2 - 3) + ' Q0 ' + P.n(len / 2 + 3) + ' ' + P.n(-sw / 2) + ' ' + P.n(len / 2 - 3) + ' Z';
        var inner = P.rect(-sw / 2 + 2.2, -len / 2 + 3.5, sw - 4.4, len - 7, 4, '#9A6040', null, 0) + P.rect(-sw / 2 + 3.4, -len / 2 + 5, sw - 6.8, len - 10, 3.5, o.pink || C.beefPink, null, 0) + P.rect(-sw / 2 + 5, -len / 2 + 9, sw - 10, len - 18, 3, P.shade(o.pink || C.beefPink, 0.18), null, 0, { opacity: '0.8' });
        out += P.g(P.at(x, y, r), P.shadow(d, 1.5, 2) + P.path(d, o.crust || C.beefCrust, P.shade(o.crust || C.beefCrust, -0.3), 1) + inner);
      }
      return out;
    };
  }
  // one slice lying on its cut face, w across by len (top end at -len/2). o: crust (the edge), top and bot (layers at
  // the two ends, [colour, depth]), band (the cooked ring) and bw, core (the middle), grain (lines across every so
  // many units), fibre (lines along), marble (white flecks, needs rnd)
  function slice(P, w, len, o, rnd) {
    var d = sliceD(P, w, len), cr = o.crust || C.beefCrust, e = o.e === undefined ? 2.2 : o.e;
    var out = (o.shadow === false ? '' : P.shadow(d, 1.5, 2)) + P.path(d, cr, P.shade(cr, -0.3), 1);
    var x0 = -w / 2 + e, x1 = w / 2 - e, y0 = -len / 2 + 1.1, y1 = len / 2 - 1.1;
    (o.top || []).forEach(function (t) { out += P.rect(-w / 2 + 1.1, y0, w - 2.2, t[1], 1.5, t[0], null, 0); y0 += t[1]; });
    (o.bot || []).forEach(function (t) { out += P.rect(-w / 2 + 1.1, y1 - t[1], w - 2.2, t[1], 1.5, t[0], null, 0); y1 -= t[1]; });
    if (!o.top) y0 += e - 1.1;
    if (!o.bot) y1 -= e - 1.1;
    var bw = o.band ? (o.bw || 2.2) : 0;
    if (o.band) out += P.rect(x0, y0, x1 - x0, y1 - y0, 2.5, o.band, null, 0);
    var cx0 = x0 + bw, cx1 = x1 - bw, cy0 = y0 + (o.top ? bw * 0.4 : bw), cy1 = y1 - (o.bot ? bw * 0.4 : bw);
    out += P.rect(cx0, cy0, cx1 - cx0, cy1 - cy0, 2.5, o.core, null, 0);
    if (o.glow !== false && cx1 - cx0 > 6 && cy1 - cy0 > 7) out += P.rect(cx0 + 2, cy0 + 2.5, cx1 - cx0 - 4, cy1 - cy0 - 5, 2, P.shade(o.core, 0.16), null, 0, { opacity: '0.75' });
    var y, x, i;
    if (o.grain) for (y = cy0 + o.grain; y < cy1 - 1; y += o.grain) out += P.line(cx0 + 0.6, y, cx1 - 0.6, y + 0.8, P.shade(o.core, -0.3), 0.7, { opacity: '0.6' });
    if (o.fibre) for (x = cx0 + o.fibre; x < cx1 - 1; x += o.fibre) out += P.line(x, cy0 + 1, x + 0.8, cy1 - 1, P.shade(o.core, -0.22), 0.7, { opacity: '0.55' });
    if (o.marble && rnd) for (i = 0; i < o.marble; i++) {
      var ml = 2 + rnd() * Math.min(4, (cx1 - cx0) * 0.6), mx = cx0 + ml / 2 + rnd() * Math.max(0.1, cx1 - cx0 - ml), my = cy0 + 1 + rnd() * (cy1 - cy0 - 2);
      out += P.path('M' + P.n(mx - ml / 2) + ' ' + P.n(my) + ' Q' + P.n(mx) + ' ' + P.n(my - 1.4) + ' ' + P.n(mx + ml / 2) + ' ' + P.n(my + 0.6), 'none', '#F6E8E0', 0.9, { opacity: '0.85', 'stroke-linecap': 'round' });
    }
    return out;
  }
  // slices in a row, each over the last; fn(i) draws slice i around 0,0
  function shingle(P, k, step, fn, o) {
    o = o || {};
    var out = '';
    for (var i = 0; i < k; i++) { var m = i - (k - 1) / 2; out += P.g(P.at(m * step, (o.arc || 0) * m * m + (o.dy || 0) * m + (o.zig ? (i % 2 ? o.zig : -o.zig) : 0), (o.tilt || 0) * m), fn(i)); }
    return out;
  }
  // a round slice showing its middle (loin slices, medallions)
  function medal(P, rx, ry, o) {
    var d = circD(P, 0, 0, rx, ry);
    return P.shadow(d, 1.4, 2) + P.path(d, o.crust, P.shade(o.crust, -0.3), 1) + P.ellipse(0, 0, rx - 2.2, ry - 2.2, o.band) + P.ellipse(0, 0, rx - 4, ry - 4, o.core) +
      P.ellipse(-0.5, -0.5, rx - 7, ry - 7, P.shade(o.core, 0.14), null, 0, { opacity: '0.7' }) + P.hl(-rx * 0.35, -ry * 0.45, rx * 0.3, ry * 0.12, '#FFFFFF', 0.25, -20);
  }
  // a T-bone: the strip on the left, the fillet on the right, the T between
  function tbone(o) {
    return function (P, rnd) {
      var s = o.s || 1, cr = o.crust || C.beefCrust, se = o.sear || C.beef, out = '';
      function S(v) { return P.n(v * s); }
      function lobe(cx, cy, rx, ry) {
        var d = P.slab(rnd, rx * s, ry * s, 0.3, 0.05, 14);
        return P.g(P.at(cx * s, cy * s), P.shadow(d) + P.path(d, cr, P.shade(cr, -0.3), 1.2) + P.path(P.slab(rnd, rx * s * 0.82, ry * s * 0.8, 0.3, 0.06, 12), se, null, 0) +
          P.grill(rx * s * 0.8, ry * s * 0.76, 35, 13 * s, C.charred, 3 * s) + P.hl(-rx * s * 0.3, -ry * s * 0.35, rx * s * 0.28, ry * s * 0.1, '#FFFFFF', 0.16, -15));
      }
      out += P.path('M' + S(-56) + ' ' + S(-36) + ' Q' + S(-88) + ' ' + S(4) + ' ' + S(-54) + ' ' + S(46), 'none', FATG, 10 * s, { 'stroke-linecap': 'round' });
      out += lobe(-26, 4, 44, 44) + lobe(40, 12, 28, 32);
      out += bone(P, 13 * s, -40 * s, 15 * s, 44 * s, 7 * s, false) + bone(P, -30 * s, -45 * s, 46 * s, -41 * s, 10 * s, false);
      return P.g(P.at(4 * s, 0), out);
    };
  }
  function tomahawk(P, rnd) {
    var eye = steak({ rx: 54, ry: 46, sq: 0.2, ang: 30, gap: 15, under: cap(57, 48, -5, -4), over: kernel(54, 46) });
    var out = bone(P, -40, 4, 94, -3, 20, false);
    out += P.g(P.at(14, 1, -3), P.line(-8, -6, 0, -6, C.charred, 2.4, { opacity: '0.45' }) + P.line(2, 4, 12, 4, C.charred, 2.4, { opacity: '0.35' }));
    return P.g('translate(6 0)', out + P.g(P.at(-60, 0), eye(P, rnd)));
  }
  // a burger patty, a smash patty, a rissole: a round with a seared crust (o.lace: the thin crisp edge of a smash patty)
  function patty(o) {
    return function (P, rnd) {
      var r = o.r || 36, sq = o.sq || 0.97, col = o.col || '#6B4022', d = P.blob(rnd, r, r * sq, o.wob || 0.04, o.k || 16), out = P.shadow(d);
      out += P.path(d, o.lace ? '#3F2412' : P.shade(col, -0.2), P.shade(col, -0.45), 1.2);
      out += P.path(P.blob(rnd, r * (o.lace ? 0.8 : 0.88), r * sq * (o.lace ? 0.78 : 0.86), o.lace ? 0.09 : 0.05, o.lace ? 16 : 14), col, null, 0);
      out += P.scatter(rnd, o.lace ? 7 : 5, r * 0.62, r * sq * 0.6, function (x, y, j, q) { return P.path(P.blob(q, 5 + q() * 6, 4 + q() * 4, 0.3, 7, x, y), P.shade(col, -0.3), null, 0, { opacity: '0.45' }); });
      out += P.crumbs(rnd, Math.round(r * r / 40), r * 0.78, r * sq * 0.76, [P.shade(col, 0.16), P.shade(col, -0.26)], 0.9);
      if (o.flecks) out += P.crumbs(rnd, 7, r * 0.7, r * sq * 0.68, ['#E8D9B8', '#4F7F2F'], 1);
      if (o.grill) out += P.grill(r * 0.8, r * 0.78, 30, 13, C.charred, 3);
      return out + P.hl(-r * 0.3, -r * 0.38, r * 0.3, r * 0.1, '#FFFFFF', 0.2, -20);
    };
  }
  function meatballs(o) {
    return function (P, rnd) {
      var out = '', col = o.col || '#7A4224', r = o.r || 13, pts = [[-20, -12], [8, -15], [-4, 6], [24, 4], [-26, 14], [12, 18]].slice(0, o.n || 5).sort(function (a, b) { return a[1] - b[1]; });
      pts.forEach(function (p) {
        var d = circD(P, p[0], p[1], r);
        out += P.shadow(d) + P.path(d, col, P.shade(col, -0.38), 1) + P.circle(p[0] - r * 0.18, p[1] - r * 0.2, r * 0.7, P.shade(col, 0.14), null, 0, { opacity: '0.75' });
        out += P.g(P.at(p[0], p[1]), P.crumbs(rnd, 7, r * 0.7, r * 0.7, [P.shade(col, -0.3), P.shade(col, 0.3)], 0.8));
        out += P.hl(p[0] - r * 0.35, p[1] - r * 0.42, r * 0.32, r * 0.16, '#FFFFFF', 0.35, -30);
      });
      return out;
    };
  }
  // a braised piece: dark and glossy, the fibres showing
  function braise(o) {
    return function (P, rnd) {
      var col = o.col || '#5A2814', d = P.blob(rnd, o.rx, o.ry, 0.1, 11), out = P.shadow(d) + P.path(d, col, P.shade(col, -0.4), 1.2);
      out += P.path(P.blob(rnd, o.rx * 0.8, o.ry * 0.74, 0.12, 10, -o.rx * 0.05, -o.ry * 0.08), P.shade(col, 0.14), null, 0, { opacity: '0.8' });
      for (var i = 0; i < 5; i++) { var y = -o.ry * 0.52 + i * o.ry * 0.26; out += P.path('M' + P.n(-o.rx * 0.6) + ' ' + P.n(y) + ' Q0 ' + P.n(y + (rnd() - 0.5) * 8) + ' ' + P.n(o.rx * 0.6) + ' ' + P.n(y + (rnd() - 0.5) * 4), 'none', P.shade(col, -0.32), 0.9, { opacity: '0.55' }); }
      return out + P.hl(-o.rx * 0.25, -o.ry * 0.4, o.rx * 0.3, o.ry * 0.09, '#FFFFFF', 0.4, -12) + P.hl(o.rx * 0.25, -o.ry * 0.1, o.rx * 0.14, o.ry * 0.06, '#FFFFFF', 0.3, -12);
    };
  }
  function shortRib(P, rnd) {
    var col = '#5A2814', d = P.slab(rnd, 38, 25, 0.65, 0.04, 14), out = bone(P, 16, 2, 48, 3, 15, false), s = '';
    s += P.shadow(d) + P.path(d, col, P.shade(col, -0.4), 1.2) + P.path(P.slab(rnd, 32, 19, 0.6, 0.06, 12), '#6E3420', null, 0);
    for (var x = -26; x <= 26; x += 9) s += P.path('M' + P.n(x) + ' -18 Q' + P.n(x + (rnd() - 0.5) * 6) + ' 0 ' + P.n(x + 1) + ' 18', 'none', '#3E1A0A', 0.9, { opacity: '0.5' });
    s += P.hl(-12, -12, 14, 2.6, '#FFFFFF', 0.4, -6) + P.hl(14, 4, 8, 1.8, '#FFFFFF', 0.3, -6);
    return out + P.g(P.at(-10, 0), s);
  }
  function laRibs(P, rnd) {
    var out = '';
    [-14, 14].forEach(function (y, j) {
      var col = '#6B3418', d = P.slab(rnd, 66, 13, 0.7, 0.03, 16), s = P.shadow(d) + P.path(d, col, P.shade(col, -0.4), 1.1) + P.path(P.slab(rnd, 62, 9.5, 0.7, 0.05, 14), '#7E4220', null, 0);
      s += P.grill(60, 11, 72, 11, C.charred, 2.2);
      [-40, 0, 40].forEach(function (x) { s += P.ellipse(x + j * 6, 0, 6.5, 8.5, BONE, BONE_ED, 1) + P.ellipse(x + j * 6, 0.5, 2.8, 4, '#C9905E', null, 0); });
      s += P.hl(-20, -7, 18, 1.4, '#FFFFFF', 0.35);
      out += P.g(P.at(j ? 3 : -3, y, j ? 2 : -2), s);
    });
    out += P.crumbs(rnd, 14, 56, 24, ['#F4EBCB'], 0.9) + P.scatter(rnd, 7, 50, 22, function (x, y) { return P.circle(x, y, 2, 'none', '#7EA453', 1.1); });
    return out;
  }
  function beefRibs(P, rnd) {
    var out = '';
    [[-21, -3], [21, 2]].forEach(function (p, j) {
      var bark = '#2E2016', d = P.slab(rnd, 56, 18, 0.6, 0.06, 16), s = bone(P, 44, 0, 74, -1, 13, true);
      s += P.shadow(d) + P.path(d, bark, '#160E08', 1.2) + P.path(P.slab(rnd, 52, 14, 0.6, 0.08, 14), '#3E2A1C', null, 0);
      s += P.crumbs(rnd, 46, 50, 14, ['#6B5038', '#160E08', '#8A6A48'], 0.9);
      s += P.path('M-50 15.6 Q0 17.6 50 15.6', 'none', '#B5402E', 1.6, { opacity: '0.75' });
      s += P.hl(-14, -9, 24, 2.2, '#FFFFFF', 0.16);
      out += P.g(P.at(j ? -2 : -14, p[0], p[1]), s);
    });
    return out;
  }
  function crumbedSteak(P, rnd) {
    var col = '#C88A40', out = '';
    // cut in two on the slant and pulled apart: each half shows a thin layer of beef at the cut
    function half(pts, cx, cy, edge) {
      var d = P.smooth(pts), s = P.shadow(d) + P.path(d, col, P.shade(col, -0.3), 1.2);
      s += P.g(P.at(cx, cy), P.path(P.blob(rnd, 22, 28, 0.1, 10), P.shade(col, 0.12), null, 0, { opacity: '0.85' }) + P.crumbs(rnd, 40, 24, 30, [P.shade(col, -0.22), P.shade(col, 0.3), C.crumbDark], 1.1));
      s += P.path(edge, 'none', '#8E5A3A', 3.2, { 'stroke-linecap': 'round' }) + P.path(edge, 'none', '#C46A5A', 1.2, { 'stroke-linecap': 'round' });
      return s + P.hl(cx - 6, cy - 16, 10, 3, '#FFFFFF', 0.22, -20);
    }
    out += half([[-56, -4], [-50, -30], [-26, -38], [0, -38], [8, -37], [5, -18], [1, 0], [-3, 18], [-6, 36], [-24, 38], [-48, 30]], -26, 0, 'M6.4 -33 Q3 0 -4.4 32');
    out += half([[14, -36], [32, -38], [52, -32], [60, -6], [56, 24], [36, 38], [12, 39], [4, 38], [7, 20], [11, 0], [15, -18]], 34, 2, 'M15.4 -32 Q10 0 6 34');
    return out;
  }
  function tartare(P, rnd) {
    var d = circD(P, 0, 0, 28), out = P.shadow(d) + P.path(d, '#A8302E', '#7A1E1E', 1);
    out += P.scatter(rnd, 70, 25, 25, function (x, y, i, q) { return P.rect(x - 1.8, y - 1.8, 3.4 + q() * 1.4, 3.2 + q() * 1.4, 0.8, ['#C0392B', '#9E2B26', '#D9574A', '#B5403A'][i % 4]); });
    out += P.scatter(rnd, 14, 23, 23, function (x, y, i) { return i % 2 ? P.circle(x, y, 1.9, '#6E8A3A', '#3E5A1E', 0.5) : P.rect(x - 1.2, y - 1.2, 2.4, 2.4, 0.5, '#EAD6E2'); });
    out += P.circle(2, -2, 9, '#F2B13A', '#D98A1E', 1) + P.circle(3, -1, 6, '#F6C04A', null, 0, { opacity: '0.8' }) + P.hl(-1, -5, 3.5, 2.2, '#FFFFFF', 0.65);
    return out + P.path('M-24 -12 A27 27 0 0 1 -6 -26', 'none', '#FFFFFF', 1.4, { opacity: '0.35', 'stroke-linecap': 'round' });
  }
  function roastSlice(P, rnd, rx, ry, o) {
    var d = P.blob(rnd, rx, ry, 0.08, 11), out = P.shadow(d, 1.5, 2) + P.path(d, o.crust, P.shade(o.crust, -0.3), 1);
    out += P.path(P.blob(rnd, rx - 3, ry - 3, 0.08, 10), o.band, null, 0) + P.path(P.blob(rnd, rx - 6.5, ry - 6, 0.1, 10), o.core, null, 0);
    out += P.path(P.blob(rnd, rx - 12, ry - 10, 0.12, 9), P.shade(o.core, 0.14), null, 0, { opacity: '0.7' });
    if (o.seam) out += P.path('M' + P.n(-rx * 0.6) + ' ' + P.n(ry * 0.15) + ' Q' + P.n(-rx * 0.1) + ' ' + P.n(-ry * 0.45) + ' ' + P.n(rx * 0.5) + ' ' + P.n(-ry * 0.1), 'none', o.seam, 1.6, { opacity: '0.8', 'stroke-linecap': 'round' });
    if (o.fold) out += P.path('M' + P.n(rx * 0.15) + ' ' + P.n(-ry * 0.9) + ' Q' + P.n(rx * 0.4) + ' 0 ' + P.n(rx * 0.1) + ' ' + P.n(ry * 0.9), 'none', P.shade(o.core, -0.3), 1.4, { opacity: '0.7', 'stroke-linecap': 'round' }) +
      P.path('M' + P.n(rx * 0.22) + ' ' + P.n(-ry * 0.7) + ' Q' + P.n(rx * 0.48) + ' 0 ' + P.n(rx * 0.2) + ' ' + P.n(ry * 0.7), 'none', '#FFFFFF', 2, { opacity: '0.25', 'stroke-linecap': 'round' });
    if (o.herb) for (var i = 0; i < 18; i++) { var a = rnd() * Math.PI * 2; out += P.circle(Math.cos(a) * (rx - 1.6), Math.sin(a) * (ry - 1.6), 0.8 + rnd() * 0.6, i % 2 ? '#4F7F2F' : '#7EA453'); }
    return out;
  }
  // deli slices folded loosely into a heap (pastrami): deep pink, a peppered black edge, a streak of fat
  function pastrami(P, rnd) {
    return P.pile(rnd, 6, 20, 15, function (x, y, i, q) {
      var l = 19 + q() * 5, b = 3 + q() * 2, rb = ribbon(P, [[-l, b * 0.5], [-l / 2, -b], [0, b], [l / 2, -b], [l, b * 0.5]], 17 + q() * 4);
      var s = P.shadow(rb.d, 1.2, 1.8) + P.path(rb.d, i % 2 ? '#B0404A' : '#A33640', '#6E1E26', 0.9);
      s += P.path(P.smooth(rb.r.map(function (p) { return [p[0], p[1] - 3]; }), true), 'none', '#EBC0BC', 1.8, { opacity: '0.8', 'stroke-linecap': 'round' }) + P.path(P.smooth(rb.l, true), 'none', '#3A2418', 1.8, { 'stroke-linecap': 'round', opacity: '0.9' });
      s += P.crumbs(q, 8, l * 0.8, 4, ['#2E1A12', '#4A2A1E'], 0.6);
      return P.g(P.at(x, y, q() * 120 - 60), s);
    });
  }

  /* ---------- crumbed and fried ---------- */
  // crumbed (schnitzel, crumbed steak): a golden slab with crumbs and a darker edge
  function crumbed(o) {
    return function (P, rnd) {
      var d = P.blob(rnd, o.rx, o.ry, 0.09, 14), out = P.shadow(d);
      out += P.path(d, o.col || C.golden, P.shade(o.col || C.golden, -0.3), 1.2);
      out += P.path(P.blob(rnd, o.rx * 0.82, o.ry * 0.78, 0.1, 12), P.shade(o.col || C.golden, 0.12), null, 0, { opacity: '0.85' });
      out += P.crumbs(rnd, Math.round(o.rx * o.ry / 40), o.rx * 0.9, o.ry * 0.86, [P.shade(o.col || C.golden, -0.22), P.shade(o.col || C.golden, 0.3), C.crumbDark], 1.1);
      out += P.hl(-o.rx * 0.3, -o.ry * 0.4, o.rx * 0.3, o.ry * 0.1, '#FFFFFF', 0.25, -12);
      return out;
    };
  }
  // a parmy: the schnitzel, then the topper layers over it (napoli, ham, cheese and the rest). o.col changes the
  // crumb colour, o.base draws a different base (crumbed eggplant)
  function parmy(layers, o) {
    o = o || {};
    var base = o.base || crumbed({ rx: 66, ry: 46, col: o.col });
    return function (P, rnd) {
      var out = base(P, rnd);
      layers.forEach(function (l) {
        if (l === 'napoli') out += P.path(P.blob(rnd, 50, 32, 0.12, 12), C.sauceRed, P.shade(C.sauceRed, -0.2), 0.8) + P.crumbs(rnd, 10, 40, 24, ['#9E2B20', '#E05A3F'], 1.3);
        if (l === 'bbqbase') out += P.path(P.blob(rnd, 50, 32, 0.12, 12), '#5E2A12', '#3F1A08', 0.8);
        if (l === 'ham') out += P.path(P.blob(rnd, 44, 28, 0.14, 11), '#E8A3A0', '#C9827E', 0.8) + P.path(P.blob(rnd, 30, 18, 0.2, 9, 8, 4), '#F0B8B4', null, 0, { opacity: '0.7' });
        if (l === 'cheese') {
          out += P.path(P.blob(rnd, 52, 34, 0.18, 14), C.cheeseLight, P.shade(C.cheese, -0.15), 0.8, { opacity: '0.95' });
          out += P.scatter(rnd, 9, 40, 24, function (x, y, i, q) { return P.path(P.blob(q, 3 + q() * 4, 2 + q() * 3, 0.3, 7, x, y), '#C98A3A', null, 0, { opacity: '0.75' }); });
        }
        if (l === 'pineapple') out += P.scatter(rnd, 5, 36, 20, function (x, y) { return P.g(P.at(x, y), P.path('M-7 -5 L7 -5 L5 5 L-5 5 Z', '#F2CB55', '#D9A62A', 0.7)); });
        if (l === 'bacon') out += P.scatter(rnd, 4, 34, 18, function (x, y, i, q) { return P.g(P.at(x, y, q() * 180), P.path('M-14 -4 Q-7 -8 0 -4 T14 -4 L14 4 Q7 0 0 4 T-14 4 Z', '#B5503F', '#8A3426', 0.7) + P.path('M-12 0 Q-6 -3 0 0 T12 0', 'none', '#F0D8D0', 1.6)); });
        if (l === 'egg') out += P.path(P.blob(rnd, 22, 18, 0.18, 10, -14, -4), '#FFFFFF', '#E6E0D2', 0.8) + P.circle(-12, -4, 7, C.yolk, '#D9A62A', 0.8) + P.hl(-14, -6, 2.5, 1.5, '#FFFFFF', 0.6);
        if (l === 'avocado') out += P.scatter(rnd, 5, 34, 18, function (x, y, i, q) { return P.g(P.at(x, y, q() * 180), P.path(P.leafD(20, 9), '#B9D27A', '#8DB255', 0.8)); });
        if (l === 'prawns') out += P.scatter(rnd, 4, 30, 16, function (x, y, i, q) { return P.g(P.at(x, y, q() * 360), P.path('M-8 -6 Q4 -10 8 0 Q4 8 -4 6 Q2 2 0 -2 Q-4 -4 -8 -6 Z', C.prawn, '#C9622A', 0.7)); });
        if (l === 'hollandaise') out += P.path('M-40 -6 Q-20 -18 0 -6 T40 -6', 'none', '#F2D27A', 7, { 'stroke-linecap': 'round' });
        if (l === 'bbq') out += P.path('M-44 -10 L-24 6 L-4 -10 L16 6 L36 -10', 'none', '#5E2A12', 3.5, { 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
        if (l === 'jalapeno') out += P.scatter(rnd, 6, 34, 18, function (x, y) { return P.circle(x, y, 4, '#5E8C3A', '#4F7F2F', 0.6) + P.circle(x, y, 1.6, '#DCEBB8'); });
        if (l === 'sourcream') out += P.path(P.blob(rnd, 12, 10, 0.2, 8, 16, 2), '#F7F4EA', '#E6E0D2', 0.8);
        if (l === 'guac') out += P.path(P.blob(rnd, 13, 11, 0.22, 9, -18, 6), '#8DB255', '#5E8C3A', 0.8) + P.g(P.at(-18, 6), P.crumbs(rnd, 6, 9, 7, ['#5E8C3A', '#C9DC8A'], 0.9));
        if (l === 'salsa') out += P.crumbs(rnd, 18, 30, 16, ['#D9473B', '#EC6A5C', '#5E8C3A', '#F2F0E8'], 2);
        if (l === 'brisket') out += P.scatter(rnd, 7, 34, 18, function (x, y, i, q) { return P.path(P.blob(q, 7, 4, 0.3, 7, x, y), '#6B4420', '#3F2812', 0.6); });
        if (l === 'brie') out += P.scatter(rnd, 3, 30, 14, function (x, y, i, q) { return P.g(P.at(x, y, q() * 60 - 30), P.path('M-10 -7 L10 -7 L10 7 L-10 7 Z', '#F6EDD2', '#E6D6A8', 1.5)); });
        if (l === 'pepperoni') out += P.scatter(rnd, 6, 36, 20, function (x, y) { return P.circle(x, y, 6.5, '#B5302A', '#7A1E18', 0.8) + P.circle(x - 1, y - 1, 2.6, '#D9574A', null, 0, { opacity: '0.6' }); });
        if (l === 'sausage') out += P.scatter(rnd, 6, 34, 18, function (x, y) { return P.ellipse(x, y, 4.6, 3.6, '#8A4A2A', '#5E2E18', 0.6) + P.circle(x - 1, y - 0.8, 1.2, '#C98A6A'); });
      });
      return out;
    };
  }
  // eggplant parmy: three crumbed rounds of eggplant (the purple skin at the rim), each with napoli and cheese
  function eggplantParmy(P, rnd) {
    var cr = crumbed({ rx: 30, ry: 26, col: '#D9A050' }), out = '';
    [[-36, 6], [36, 4], [0, -6]].forEach(function (p) {
      var s = P.path(circD(P, 1.6, 1.8, 30.5, 26.5), '#4A2A4A', '#2E1A2E', 0.8) + cr(P, rnd);
      s += P.path(P.blob(rnd, 22, 18, 0.15, 10), C.sauceRed, P.shade(C.sauceRed, -0.2), 0.8) + P.path(P.blob(rnd, 19, 15, 0.2, 11, 1, -1), C.cheeseLight, P.shade(C.cheese, -0.15), 0.8);
      s += P.scatter(rnd, 4, 13, 9, function (x, y, i, q) { return P.path(P.blob(q, 2.5 + q() * 2.5, 2 + q() * 1.5, 0.3, 7, x, y), '#C98A3A', null, 0, { opacity: '0.75' }); });
      out += P.g(P.at(p[0], p[1]), s);
    });
    return out;
  }
  // a craggy fried piece (southern fried, tenders, karaage): a bumpy outline and lumps of coating
  function craggy(P, rnd, rx, ry, col, k) {
    var d = P.blob(rnd, rx, ry, 0.1, k || 20), out = P.shadow(d) + P.path(d, col, P.shade(col, -0.32), 1.1);
    out += P.path(P.blob(rnd, rx * 0.8, ry * 0.72, 0.12, 12), P.shade(col, 0.1), null, 0, { opacity: '0.8' });
    // the lumps of coating: each a lighter bump with a soft shade under it
    out += P.scatter(rnd, Math.max(5, Math.round(rx * ry / 22)), rx * 0.86, ry * 0.8, function (x, y, i, q) {
      var r = 1.4 + q() * Math.min(2.6, ry * 0.2), b = P.blob(q, r * 1.3, r, 0.35, 6, x, y);
      return P.path(b, P.shade(col, -0.2), null, 0, { opacity: '0.55', transform: 'translate(0.7 0.9)' }) + P.path(b, P.shade(col, i % 4 ? 0.16 : 0.06), null, 0);
    });
    return out + P.hl(-rx * 0.3, -ry * 0.4, rx * 0.28, ry * 0.12, '#FFFFFF', 0.22, -12);
  }
  function nugget(P, rnd, rx, ry, col) {
    var d = P.blob(rnd, rx, ry, 0.16, 7), out = P.shadow(d, 1.5, 2) + P.path(d, col, P.shade(col, -0.3), 1);
    out += P.path(P.blob(rnd, rx * 0.7, ry * 0.62, 0.15, 7), P.shade(col, 0.14), null, 0, { opacity: '0.8' });
    out += P.crumbs(rnd, 9, rx * 0.8, ry * 0.75, [P.shade(col, -0.22), P.shade(col, 0.3)], 0.7);
    return out + P.hl(-rx * 0.3, -ry * 0.4, rx * 0.3, ry * 0.12, '#FFFFFF', 0.3, -12);
  }
  function kiev(P, rnd) {
    var col = '#D49B55', out = '';
    // the garlic butter running out between the two halves
    out += P.path(P.blob(rnd, 24, 13, 0.25, 10, 0, 14), '#F2D27A', '#D9B04A', 0.8, { opacity: '0.95' }) + P.g(P.at(0, 14), P.crumbs(rnd, 12, 18, 9, ['#5E8C3A', '#7EA453'], 0.8));
    function half(cx, cy, face) {
      var d = P.blob(rnd, 25, 22, 0.08, 12, cx, cy), s = P.shadow(d) + P.path(d, col, P.shade(col, -0.3), 1.2);
      s += P.path(P.blob(rnd, 19, 16, 0.1, 10, cx - face * 3, cy - 2), P.shade(col, 0.12), null, 0, { opacity: '0.85' }) + P.g(P.at(cx - face * 3, cy), P.crumbs(rnd, 16, 18, 16, [P.shade(col, -0.22), P.shade(col, 0.3), C.crumbDark], 1));
      // the cut face: crumb ring, white chicken, the green butter in the middle
      var fx = cx + face * 17;
      s += P.ellipse(fx, cy, 9, 18, col, P.shade(col, -0.3), 1) + P.ellipse(fx, cy, 7, 15.5, '#F6EEDC', '#E2D2B4', 0.6) + P.ellipse(fx + face * 0.6, cy, 3.4, 7.5, '#9CB45A', '#7A9440', 0.6);
      return s + P.hl(cx - face * 8, cy - 12, 8, 2.6, '#FFFFFF', 0.25, -20);
    }
    return out + half(-28, -4, 1) + half(28, -2, -1);
  }

  /* ---------- lamb ---------- */
  // one lamb cutlet: the eye with its fat cap on the outer side, the frenched bone out to the right
  function cutlet(P, rnd) {
    var out = bone(P, 4, 0, 56, 0, 7.5, false);
    var fc = P.blob(rnd, 19, 15.5, 0.05, 11, -11.5, -0.5), tail = P.smooth([[-10, -12], [10, -7.5], [21, -3.6], [21, 3.6], [10, 7.5], [-10, 12]]), eye = P.blob(rnd, 17.5, 14, 0.05, 10, -9, 1.5);
    out += P.shadow(fc) + P.path(fc, FATG, FATG_ED, 1) + P.path(tail, LAMB, P.shade(LAMB, -0.3), 1) + P.path(eye, LAMB, P.shade(LAMB, -0.3), 1);
    out += P.path(P.blob(rnd, 14, 11, 0.07, 9, -9, 1.5), LAMB_SEAR, null, 0) + P.g(P.at(-9, 1.5), P.grill(13, 10, 35, 8, C.charred, 2.2));
    return out + P.hl(-14, -4, 6, 2.2, '#FFFFFF', 0.25, -20);
  }
  // a cutlet placed so its eye sits at ex, ey with the bone pointing at angle th
  function cutletAt(P, rnd, ex, ey, th) {
    var a = th * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return P.g(P.at(ex - (c * -9 - s * 1.5), ey - (s * -9 + c * 1.5), th), cutlet(P, rnd));
  }
  // a rack of lamb, crust up: the loin as a rounded log with its herb crust, the frenched bones curving out below
  function lambRack(P, rnd) {
    var out = '';
    [-30, -10, 10, 30].forEach(function (x) {
      var c = 8 + x * 0.3, rb = ribbon(P, [[x, -6], [x + c * 0.25, 12], [x + c * 0.7, 26], [x + c, 37]], 7.5);
      out += P.shadow(rb.d, 1.4, 1.8) + P.path(rb.d, BONE, BONE_ED, 1) + P.path(P.smooth([[x + 1, 6], [x + c * 0.25 - 1.6, 14], [x + c * 0.7 - 1.6, 26], [x + c - 1.4, 33]], true), 'none', '#FFFFFF', 1.6, { opacity: '0.55', 'stroke-linecap': 'round' });
      out += P.circle(x + c, 37, 3.2, '#B9884A', null, 0, { opacity: '0.5' });
    });
    var d = P.blob(rnd, 47, 20, 0.04, 14), s = P.shadow(d, 2.5, 3) + P.path(d, '#5E3A1C', '#3E2410', 1.2) + P.path(P.blob(rnd, 42, 15, 0.05, 12, 0, -1), '#6E4A24', null, 0);
    s += P.crumbs(rnd, 60, 40, 14, ['#5E8C3A', '#4F7F2F', '#6E9A3E', '#C9A04A', '#3E5A22'], 1.2);
    [-20, 0, 20].forEach(function (x) { s += P.path('M' + P.n(x) + ' -16 Q' + P.n(x + 2) + ' 0 ' + P.n(x) + ' 17', 'none', '#3E2410', 1, { opacity: '0.45' }); });
    out += P.g(P.at(0, -16), s + P.hl(-12, -9, 20, 3, '#FFFFFF', 0.2, -3));
    return P.g(P.at(-3, 6, -12), out);
  }
  // a strand of slow-cooked meat (pulled pork, pulled lamb)
  function shred(P, x, y, q, col) {
    var a = q() * Math.PI, l = 6 + q() * 10, c = Math.cos(a) * l / 2, s = Math.sin(a) * l / 2, b = (q() - 0.5) * 6, w = 2.2 + q() * 1.8;
    var d = 'M' + P.n(x - c) + ' ' + P.n(y - s) + ' Q' + P.n(x - Math.sin(a) * b) + ' ' + P.n(y + Math.cos(a) * b) + ' ' + P.n(x + c) + ' ' + P.n(y + s);
    return P.path(d, 'none', P.shade(col, -0.28), w + 0.9, { 'stroke-linecap': 'round' }) + P.path(d, 'none', col, w, { 'stroke-linecap': 'round' });
  }
  function pulled(o) {
    return function (P, rnd) {
      var d = P.blob(rnd, o.rx * 0.82, o.ry * 0.78, 0.12, 12), out = P.shadow(d) + P.path(d, o.base, P.shade(o.base, -0.25), 0.8);
      out += P.pile(rnd, o.count || 44, o.rx * 0.95, o.ry * 0.9, function (x, y, i, q) { return shred(P, x, y, q, o.cols[i % o.cols.length]); });
      if (o.bark) out += P.scatter(rnd, 8, o.rx * 0.8, o.ry * 0.75, function (x, y, i, q) { return P.path(P.blob(q, 2.5 + q() * 2, 1.6 + q(), 0.3, 6, x, y), o.bark, null, 0); });
      return out + P.hl(-o.rx * 0.3, -o.ry * 0.4, o.rx * 0.3, o.ry * 0.1, '#FFFFFF', 0.25, -12);
    };
  }
  function lambShoulder(P, rnd) {
    var col = '#6E3E1E', d = P.blob(rnd, 46, 34, 0.12, 12), out = '';
    out += P.shadow(d) + P.path(d, col, '#40220E', 1.2) + P.path(P.blob(rnd, 40, 28, 0.12, 11, -4, -3), '#8A5228', null, 0);
    out += P.g(P.at(14, 8), P.path(P.blob(rnd, 24, 17, 0.15, 10), '#A8684A', null, 0) + P.pile(rnd, 24, 21, 14, function (x, y, i, q) { return shred(P, x, y, q, ['#B97A58', '#C98A68', '#A8684A', '#D9A080'][i % 4]); }));
    out += P.scatter(rnd, 12, 34, 20, function (x, y, i, q) { var a = q() * Math.PI; return P.line(x - 14, y - 6, x - 14 + Math.cos(a) * 5, y - 6 + Math.sin(a) * 5, '#3E5A22', 1.1); });
    out += P.crumbs(rnd, 10, 30, 18, ['#F4F1EA'], 0.8);
    return out + P.hl(-18, -16, 16, 5, '#FFFFFF', 0.22, -15);
  }
  // a lamb loin chop: one outline with the eye, the little fillet past the T-bone and the tail curling down, fat round the outside
  function loinChop(P, rnd) {
    var d = P.smooth([[-28, -14], [-16, -22], [0, -21], [10, -20], [22, -19], [32, -9], [33, 7], [26, 16], [12, 18], [4, 24], [-4, 34], [-16, 38], [-23, 31], [-27, 18], [-32, 4]]);
    var out = P.shadow(d) + P.path(d, LAMB, P.shade(LAMB, -0.3), 1.1);
    out += P.path('M-15 -21 Q-34 -14 -31 4 Q-29 22 -18 36', 'none', FATG, 5, { 'stroke-linecap': 'round' }) + P.path('M-8 23 Q-12 32 -17 35', 'none', FATG, 3, { 'stroke-linecap': 'round' });
    function lobe(cx, cy, rx, ry) { return P.path(P.blob(rnd, rx, ry, 0.06, 10, cx, cy), LAMB_SEAR, null, 0) + P.g(P.at(cx, cy), P.grill(rx * 0.9, ry * 0.86, 35, 8, C.charred, 2.2)); }
    out += lobe(-9, 0, 16, 15) + lobe(21, 0, 8.5, 12);
    out += P.line(10.5, -17, 11.5, 15, '#B9A27E', 4) + P.line(10.5, -17, 11.5, 15, '#EADCC0', 2.6) + P.line(0, -19.5, 22, -18, '#B9A27E', 4.4) + P.line(0, -19.5, 22, -18, '#EADCC0', 3);
    return P.g('translate(0 -8)', out + P.hl(-14, -8, 7, 2.4, '#FFFFFF', 0.25, -20));
  }
  function shank(P, rnd) {
    var col = '#5A2A16', out = bone(P, 28, -3, 62, -8, 14, true);
    var d = P.smooth([[-60, 2], [-52, -24], [-24, -32], [10, -24], [32, -12], [38, -3], [32, 6], [10, 20], [-24, 32], [-52, 26]]);
    out += P.shadow(d, 3, 4) + P.path(d, col, '#361608', 1.3) + P.path(P.blob(rnd, 40, 21, 0.1, 11, -14, -2), '#6E3620', null, 0, { opacity: '0.9' });
    for (var i = 0; i < 4; i++) { var y = -16 + i * 10; out += P.path('M-50 ' + P.n(y + 2) + ' Q-14 ' + P.n(y - 4 + rnd() * 6) + ' 26 ' + P.n(y * 0.4), 'none', '#3E1A0A', 0.9, { opacity: '0.5' }); }
    return out + P.hl(-26, -18, 20, 3.4, '#FFFFFF', 0.4, -8) + P.hl(4, 6, 12, 2, '#FFFFFF', 0.3, -12);
  }

  /* ---------- skewers ---------- */
  // a skewer: the stick (wood, or a flat metal one), then the pieces along it
  function skewer(o) {
    return function (P, rnd) {
      var l = o.len || 150, out = '', sh = { opacity: '0.12', transform: 'translate(2 2.5)' };
      if (o.flat) out += P.rect(-l / 2, -2.6, l, 5.2, 1.5, '#000000', null, 0, sh) + P.rect(-l / 2, -2.6, l, 5.2, 1.5, C.steel, C.steelDark, 0.8) + P.circle(-l / 2 - 5, 0, 5, 'none', C.steelDark, 2.2);
      else out += P.line(-l / 2, 0, l / 2 - 4, 0, '#000000', 3.4, sh) + P.line(-l / 2, 0, l / 2 - 4, 0, WOOD_ED, 3.8) + P.line(-l / 2, 0, l / 2 - 4, 0, WOOD, 2.4) + P.path('M' + P.n(l / 2 - 5) + ' -1.8 L' + P.n(l / 2 + 2) + ' 0 L' + P.n(l / 2 - 5) + ' 1.8 Z', WOOD, WOOD_ED, 0.6);
      return out + o.pieces(P, rnd);
    };
  }
  function koftaPieces(P, rnd) {
    var out = '';
    [-29, 27].forEach(function (x) {
      var d = bar(P, 52, 17), col = '#7A4626', s = P.shadow(d) + P.path(d, col, P.shade(col, -0.35), 1.1) + P.rect(-22, -5, 44, 8, 4, '#8E5A32', null, 0, { opacity: '0.8' });
      for (var k = -18; k <= 18; k += 9) s += P.line(k + 2, -6.5, k - 2, 6.5, C.charred, 2.4, { opacity: '0.75' });
      s += P.crumbs(rnd, 10, 22, 6, ['#4F7F2F', '#7EA453', '#E8DCC0'], 0.8) + P.hl(-8, -4.5, 14, 1.6, '#FFFFFF', 0.3);
      out += P.g(P.at(x, 0, x > 0 ? 2 : -2), s);
    });
    return out;
  }
  function kaftaPieces(P, rnd) {
    var top = [], bot = [], col = '#7E4A2A';
    for (var i = 0; i <= 12; i++) { var x = -60 + i * 10; top.push([x, -10 - (i % 2 ? 1.8 : 0)]); bot.push([x, 10 + (i % 2 ? 1.8 : 0)]); }
    var d = P.smooth([[-66, 0]].concat(top, [[66, 0]], bot.reverse())), out = P.shadow(d) + P.path(d, col, P.shade(col, -0.35), 1.1) + P.rect(-56, -5, 112, 8, 4, '#946038', null, 0, { opacity: '0.75' });
    for (var k = -50; k <= 50; k += 10) out += P.path('M' + P.n(k) + ' -8 Q' + P.n(k + 3) + ' 0 ' + P.n(k) + ' 8', 'none', '#5A3018', 1.1, { opacity: '0.7' });
    out += P.grill(58, 9, 60, 16, C.charred, 2.6) + P.crumbs(rnd, 22, 54, 7, ['#4F7F2F', '#7EA453'], 0.8);
    return out + P.hl(-20, -5, 28, 1.6, '#FFFFFF', 0.25);
  }
  // chunks along a stick (tawook, satay, kangaroo): col, and a char at the edges
  function chunks(o) {
    return function (P, rnd) {
      var out = '', k = o.k || 5, gap = o.gap || 22;
      if (o.onion) for (var j = 0; j < k - 1; j++) { var ox = (j - (k - 2) / 2) * gap; out += P.path('M' + P.n(ox - 3) + ' -10 Q' + P.n(ox + 5) + ' 0 ' + P.n(ox - 3) + ' 10 Q' + P.n(ox + 1) + ' 0 ' + P.n(ox - 3) + ' -10 Z', '#C9A0C0', '#9A6E92', 0.7); }
      for (var i = 0; i < k; i++) {
        var x = (i - (k - 1) / 2) * gap, d = P.blob(rnd, o.rx || 10.5, o.ry || 10, 0.18, 8, x, 0, rnd() * 90);
        out += P.shadow(d) + P.path(d, o.col, P.shade(o.col, -0.35), 1) + P.path(P.blob(rnd, (o.rx || 10.5) * 0.62, (o.ry || 10) * 0.55, 0.2, 7, x - 1, -1.5), P.shade(o.col, 0.16), null, 0, { opacity: '0.8' });
        out += P.path(P.blob(rnd, 3 + rnd() * 2, 2 + rnd() * 1.5, 0.3, 6, x + 4, 4), o.char || C.charred, null, 0, { opacity: '0.6' }) + P.line(x - 5, -4, x + 2, 5, o.char || C.charred, 1.8, { opacity: '0.55' });
        out += P.hl(x - 3, -4.5, 3.4, 1.4, '#FFFFFF', 0.3, -20);
      }
      // satay: a spoon of peanut sauce over each piece, crushed peanuts on top
      if (o.satay) for (i = 0; i < k; i++) {
        var sx = (i - (k - 1) / 2) * gap;
        out += P.path(P.blob(rnd, 7 + rnd() * 2, 4.5 + rnd() * 1.5, 0.25, 8, sx + 1, 1), '#C08A3E', '#8A5420', 0.7) + P.g(P.at(sx + 1, 1), P.crumbs(rnd, 4, 5, 3, ['#EAD2A2', '#B9864A'], 0.9));
      }
      return out;
    };
  }

  /* ---------- pork ---------- */
  // a sausage from above: a rounded log, grill marks across
  function sausage(o) {
    return function (P) {
      var l = o.len || 70, w = o.w || 15, d = 'M' + P.n(-l / 2 + w / 2) + ' ' + P.n(-w / 2) + ' H' + P.n(l / 2 - w / 2) + ' A' + P.n(w / 2) + ' ' + P.n(w / 2) + ' 0 0 1 ' + P.n(l / 2 - w / 2) + ' ' + P.n(w / 2) + ' H' + P.n(-l / 2 + w / 2) + ' A' + P.n(w / 2) + ' ' + P.n(w / 2) + ' 0 0 1 ' + P.n(-l / 2 + w / 2) + ' ' + P.n(-w / 2) + ' Z';
      var out = P.shadow(d) + P.path(d, o.col || '#A34A26', P.shade(o.col || '#A34A26', -0.3), 1.2);
      for (var x = -l / 2 + 12; x < l / 2 - 8; x += 13) out += P.line(x, -w / 2 + 3, x - 5, w / 2 - 3, P.shade(o.col || '#A34A26', -0.45), 2.6, { opacity: '0.85' });
      return out + P.hl(-l * 0.1, -w * 0.22, l * 0.3, w * 0.12, '#FFFFFF', 0.3);
    };
  }
  // a rasher of bacon: a wavy strip with fat stripes
  function rasher(P, rnd) {
    var d = 'M-38 -8 Q-28 -15 -18 -8 T2 -8 T22 -8 T40 -9 L38 7 Q28 0 20 7 T0 7 T-20 7 T-40 7 Z';
    return P.shadow(d) + P.path(d, '#B5503F', '#8A3426', 1) + P.path('M-36 -1 Q-27 -7 -18 -1 T2 -1 T22 -1 T38 -2', 'none', '#F0D8D0', 3.2) + P.path('M-33 4 Q-26 0 -18 4', 'none', '#E8B4A8', 1.4);
  }
  // blistered crackling over an ellipse: many small puffed bubbles, a few darker ones
  function crackle(P, rnd, count, rx, ry) {
    return P.scatter(rnd, count, rx, ry, function (x, y, i, q) {
      var r = 0.8 + q() * 1.4;
      return i % 5 ? P.circle(x, y, r, '#F4D894', null, 0, { opacity: '0.85' }) + (i % 3 ? '' : P.circle(x - r * 0.3, y - r * 0.3, r * 0.4, '#FFF8E4', null, 0, { opacity: '0.8' })) : P.circle(x, y, r * 0.7, '#B9782E', null, 0, { opacity: '0.5' });
    });
  }
  // pork belly from above: a slab with blistered, scored crackling
  function belly(o) {
    return function (P, rnd) {
      var w = o.w || 64, h = o.h || 44, d = P.slab(rnd, w / 2, h / 2, 0.75, 0.02, 16), out = P.shadow(d);
      out += P.path(d, '#D9A04A', '#9A6424', 1.2) + P.path(P.slab(rnd, w / 2 - 3.5, h / 2 - 3.5, 0.75, 0.02, 14), '#E9C27A', null, 0);
      for (var x = -w / 2 + 9; x < w / 2 - 4; x += 9) out += P.line(x, -h / 2 + 4, x - 6, h / 2 - 4, '#C08A3E', 1, { opacity: '0.7' });
      out += crackle(P, rnd, Math.round(w * h / 26), w / 2 - 5, h / 2 - 5);
      return out + P.hl(-w * 0.2, -h * 0.28, w * 0.2, h * 0.07, '#FFFFFF', 0.3, -6);
    };
  }
  function bellyBites(P, rnd) {
    var out = '';
    P.spots(rnd, 6, 26, 15, 19).forEach(function (p, i) {
      var d = rrD(P, -10.5, -10.5, 21, 21, 4), s;
      if (i % 2) {
        s = P.shadow(d) + P.path(d, '#D9A04A', '#9A6424', 1) + P.rect(-8, -8, 16, 16, 3, '#EBC77E');
        for (var k = 0; k < 7; k++) s += P.circle(-6 + rnd() * 12, -6 + rnd() * 12, 1 + rnd() * 1.6, k % 3 ? '#F6E2A8' : '#C98A3A');
      } else {
        s = P.shadow(d) + P.path(d, '#C98A3A', '#9A6424', 1) + P.rect(-9.5, -5.5, 19, 4, 0, '#F6EADA') + P.rect(-9.5, -1.5, 19, 4.5, 0, '#D9A07A') + P.rect(-9.5, 3, 19, 2, 0, '#F3E3CC') + P.rect(-9.5, 5, 19, 4.4, 1.5, '#CF9670');
        s += P.circle(-5, -8, 1.2, '#F2CB7A') + P.circle(1, -8.4, 1, '#F2CB7A') + P.circle(6, -7.8, 1.3, '#F2CB7A');
      }
      out += P.g(P.at(p[0], p[1], (rnd() - 0.5) * 50), s + P.hl(-4, -6, 4, 1.4, '#FFFFFF', 0.3));
    });
    return out;
  }
  // a pork chop: the eye with its rind of fat along the top, the rib bone out at the side
  function porkChop(P, rnd) {
    var out = bone(P, 30, 10, 58, 18, 11, false), rind = 'M-46 -6 Q-44 -36 -6 -38 Q32 -36 48 -10';
    out += P.path(rind, 'none', '#000000', 10, { opacity: '0.12', transform: 'translate(2 2.5)', 'stroke-linecap': 'round' }) + P.path(rind, 'none', '#B98440', 10, { 'stroke-linecap': 'round' }) + P.path(rind, 'none', '#EFD29A', 6.5, { 'stroke-linecap': 'round' });
    var eye = P.smooth([[-46, -6], [-40, -28], [-6, -32], [28, -28], [46, -10], [46, 10], [32, 26], [4, 32], [-26, 30], [-44, 16]]);
    out += P.shadow(eye) + P.path(eye, '#B9783A', '#7E4E22', 1.1) + P.path(P.blob(rnd, 37, 23, 0.06, 12, 0, 0), '#D9A266', null, 0);
    out += P.grill(36, 23, 35, 13, '#5E3A18', 3) + P.hl(-14, -14, 14, 3.4, '#FFFFFF', 0.25, -10);
    return P.g('translate(-5 3)', out);
  }
  function ribs(o) {
    return function (P, rnd) {
      var w = o.w || 140, h = o.h || 74, k = o.k || 8, gl = o.col || '#7A2E1A', out = '', i, x;
      for (i = 0; i < k; i++) { x = -w / 2 + (i + 0.5) * w / k; out += bone(P, x, h * 0.25, x + 1, h / 2 + 4 - Math.abs(x) * 0.04, 7.5, false); }
      var pts = [[-w / 2, -h * 0.26], [-w * 0.3, -h * 0.42], [w * 0.3, -h / 2], [w / 2, -h * 0.34], [w / 2 + 2, h * 0.32], [w * 0.3, h / 2], [-w * 0.3, h * 0.44], [-w / 2 - 2, h * 0.28]];
      var d = P.smooth(pts), out2 = P.shadow(d) + P.path(d, gl, P.shade(gl, -0.4), 1.2) + P.path(P.blob(rnd, w * 0.42, h * 0.32, 0.06, 12, 0, 0), P.shade(gl, 0.12), null, 0, { opacity: '0.85' });
      for (i = 1; i < k; i++) { x = -w / 2 + i * w / k; out2 += P.path('M' + P.n(x) + ' ' + P.n(-h * 0.4) + ' Q' + P.n(x + 2) + ' 0 ' + P.n(x + 1) + ' ' + P.n(h * 0.42), 'none', P.shade(gl, -0.45), 1.6, { opacity: '0.7' }); }
      out2 += P.scatter(rnd, 12, w * 0.42, h * 0.34, function (x0, y0, j, q) { return P.path(P.blob(q, 2.5 + q() * 3, 2 + q() * 2, 0.3, 6, x0, y0), C.charred, null, 0, { opacity: '0.5' }); });
      out2 += P.hl(-w * 0.2, -h * 0.22, w * 0.18, 2.6, '#FFFFFF', 0.35, -4) + P.hl(w * 0.18, -h * 0.05, w * 0.12, 2, '#FFFFFF', 0.28, -4);
      if (o.sesame) out2 += P.crumbs(rnd, 20, w * 0.4, h * 0.3, ['#F4EBCB'], 0.9);
      return out + out2;
    };
  }
  function kbbq(P, rnd) {
    var out = '';
    for (var i = 0; i < 4; i++) {
      var d = rrD(P, -50, -9, 100, 18, 6), s = P.shadow(d) + P.path(d, '#C98A52', '#8E5A2E', 1);
      s += P.rect(-48, -7.4, 96, 3, 1.4, '#F0D9A8') + P.rect(-48, -4.4, 96, 3.8, 0, '#C9845A') + P.rect(-48, -0.6, 96, 2.4, 0, '#F0D9A8') + P.rect(-48, 1.8, 96, 3.6, 0, '#C9845A') + P.rect(-48, 5.4, 96, 2, 1, '#EBCF98');
      s += P.grill(48, 9, 78, 12, '#6B3A1A', 2.4) + P.hl(-20, -6, 18, 1.2, '#FFFFFF', 0.3);
      out += P.g(P.at(i % 2 ? 4 : -4, -27 + i * 18, (i - 1.5) * 2), s);
    }
    return out;
  }
  function sausageSliced(o) {
    return function (P, rnd) {
      var skin = o.skin || '#8E3E1E', inside = o.inside || '#C98A6A';
      return P.pile(rnd, o.n || 9, 26, 13, function (x, y, i, q) {
        var d = circD(P, 0, 0, 9.5, 7.5);
        return P.g(P.at(x, y, q() * 60 - 30), P.shadow(d, 1.2, 1.6) + P.path(d, skin, P.shade(skin, -0.3), 1) + P.ellipse(0, 0, 7.6, 5.8, inside) + P.crumbs(q, 5, 5.6, 3.8, [P.shade(inside, 0.4), P.shade(inside, -0.2)], 0.8) + P.hl(-2, -2.5, 3.5, 1.2, '#FFFFFF', 0.35));
      });
    };
  }
  function chipolatas(P) {
    var s = sausage({ len: 58, w: 11, col: '#B5583A' });
    return P.g(P.at(0, -14, -4), s(P)) + P.g(P.at(3, 0, 3), s(P)) + P.g(P.at(-2, 14, -2), s(P));
  }
  function knuckle(P, rnd) {
    var out = bone(P, 34, -4, 66, -10, 18, true), col = '#D49444';
    var d = P.smooth([[-62, 0], [-56, -34], [-24, -48], [12, -42], [40, -24], [50, -6], [42, 14], [12, 38], [-24, 46], [-54, 30]]);
    out += P.shadow(d, 3, 4) + P.path(d, '#C08236', '#7E4A18', 1.4) + P.path(P.blob(rnd, 46, 36, 0.08, 12, -8, -2), col, null, 0) + P.path(P.blob(rnd, 30, 22, 0.1, 10, -14, -8), '#E2AE5E', null, 0, { opacity: '0.8' });
    out += P.g('translate(-8 -2)', crackle(P, rnd, 200, 44, 34));
    for (var i = 0; i < 7; i++) { var x = -44 + rnd() * 70, y = -30 + rnd() * 56; out += P.path('M' + P.n(x) + ' ' + P.n(y) + ' l4 3 l3 -2 l5 4', 'none', '#8E541C', 1.1, { opacity: '0.7' }); }
    return P.g('translate(-2 0)', out + P.hl(-22, -26, 20, 6, '#FFFFFF', 0.3, -20));
  }
  function hamSlice(P, rnd) {
    var d = P.blob(rnd, 54, 36, 0.08, 13), out = P.shadow(d, 1.5, 2) + P.path(d, '#C98A3A', '#9A6424', 1.1);
    out += P.path(P.blob(rnd, 51, 33, 0.08, 12), '#F6EADC', null, 0) + P.path(P.blob(rnd, 45, 28, 0.1, 12, 4, 3), '#E8A3A0', '#D98E8A', 0.6);
    out += P.path(P.blob(rnd, 22, 14, 0.15, 9, -12, 0), '#EEB6B2', null, 0, { opacity: '0.8' }) + P.path(P.blob(rnd, 16, 12, 0.15, 9, 22, 8), '#E39A96', null, 0, { opacity: '0.7' });
    out += P.path('M-30 18 Q-10 6 2 -22', 'none', '#F6D8D0', 1.6, { opacity: '0.9' }) + P.path('M6 -4 Q24 -2 40 12', 'none', '#F6D8D0', 1.4, { opacity: '0.9' });
    out += P.scatter(rnd, 6, 50, 33, function (x, y) { return Math.hypot(x / 50, y / 33) > 0.85 ? P.circle(x, y, 1.1, '#4A2A1A') : ''; });
    return out + P.hl(-16, -18, 18, 4, '#FFFFFF', 0.3, -12);
  }
  function shards(P, rnd) {
    return P.pile(rnd, 7, 30, 17, function (x, y, i, q) {
      var k = 5 + Math.floor(q() * 2), pts = [], rx = 12 + q() * 6, ry = 7 + q() * 4;
      for (var j = 0; j < k; j++) { var a = j / k * Math.PI * 2 + q() * 0.5, r = 0.7 + q() * 0.45; pts.push([Math.cos(a) * rx * r, Math.sin(a) * ry * r]); }
      var d = 'M' + pts.map(function (p) { return P.n(p[0]) + ' ' + P.n(p[1]); }).join(' L') + ' Z';
      var s = P.shadow(d, 1.2, 1.6) + P.path(d, '#E3B262', '#A8702A', 1, { 'stroke-linejoin': 'round' });
      for (var b = 0; b < 10; b++) s += P.circle((q() - 0.5) * rx * 1.1, (q() - 0.5) * ry, 0.8 + q() * 1.4, b % 3 ? '#F6E2A8' : '#C98A3A');
      return P.g(P.at(x, y, q() * 360), s);
    });
  }

  /* ---------- chicken ---------- */
  function breastD(P, s) { s = s || 1; return P.smooth([[-60, 2], [-54, -18], [-30, -28], [4, -27], [36, -18], [58, -6], [62, 4], [44, 16], [10, 26], [-28, 27], [-52, 18]].map(function (p) { return [p[0] * s, p[1] * s]; })); }
  function breast(P, rnd) {
    var d = breastD(P), col = '#D9A050', out = P.shadow(d) + P.path(d, col, P.shade(col, -0.32), 1.2);
    out += P.path(P.blob(rnd, 46, 18, 0.08, 12, -4, 0), '#E8BE78', null, 0, { opacity: '0.9' });
    out += P.grill(50, 20, 40, 13, '#6B3E18', 3);
    return out + P.hl(-20, -12, 22, 4, '#FFFFFF', 0.25, -6);
  }
  // a grilled breast sliced on the bias and pushed over a little: each cut shows a strip of white meat
  function slicedBreast(P) {
    // the breast's half height at x: thick end to the left
    function H(x) { return Math.sqrt(Math.max(0, 1 - Math.pow(x / 62, 2))) * (28 - 6 * (x + 62) / 124); }
    var cuts = [-40, -24, -8, 8, 24, 40], out = '';
    for (var i = 0; i <= cuts.length; i++) {
      var c0 = i ? cuts[i - 1] : null, c1 = i < cuts.length ? cuts[i] : null, k, x;
      var xt0 = c0 === null ? -62 : c0 - 0.3 * H(c0), xb0 = c0 === null ? -62 : c0 + 0.3 * H(c0), xt1 = c1 === null ? 62 : c1 - 0.3 * H(c1), xb1 = c1 === null ? 62 : c1 + 0.3 * H(c1);
      var pts = [];
      for (k = 0; k <= 8; k++) { x = xt0 + (xt1 - xt0) * k / 8; pts.push([x, -H(x)]); }
      for (k = 8; k >= 0; k--) { x = xb0 + (xb1 - xb0) * k / 8; pts.push([x, H(x)]); }
      var d = 'M' + pts.map(function (p) { return P.n(p[0]) + ' ' + P.n(p[1]); }).join(' L') + ' Z', mx = (xt0 + xt1 + xb0 + xb1) / 4;
      var s = P.shadow(d, 1.5, 2) + P.path(d, '#D9A050', '#9A6A2A', 1, { 'stroke-linejoin': 'round' }) + P.ellipse(mx, 0, Math.max(2, (xt1 - xt0) * 0.32), H(mx) * 0.6, '#E8BE78', null, 0, { opacity: '0.8' });
      // the cut face of this slice, white, on its left side
      if (c0 !== null) s += P.line(xt0 + 2, -H(xt0) + 2, xb0 + 2, H(xb0) - 2, '#F4E6CC', 3.6) + P.line(xt0 + 0.6, -H(xt0) + 2, xb0 + 0.6, H(xb0) - 2, '#B9824A', 0.8);
      // the grill marks on its top
      [-9, 7].forEach(function (y) { if (H(mx) > Math.abs(y) + 5) s += P.line(mx - 4.5, y - 4, mx + 3.5, y + 4, '#6B3E18', 2.6, { opacity: '0.8' }); });
      out += P.g('translate(' + P.n(i * 2.4) + ' ' + P.n(Math.abs(i - 3) * 0.8) + ')', s);
    }
    return P.g('translate(-7 -1)', out + P.hl(-30, -14, 14, 3, '#FFFFFF', 0.25, -6));
  }
  function thigh(P, rnd) {
    var col = '#C98A3A', d = P.blob(rnd, 40, 30, 0.2, 9), out = P.shadow(d) + P.path(d, col, P.shade(col, -0.35), 1.2);
    out += P.path(P.blob(rnd, 32, 22, 0.2, 9, 0, -2), '#DDA458', null, 0, { opacity: '0.9' });
    out += P.scatter(rnd, 6, 32, 22, function (x, y, i, q) { return P.path(P.blob(q, 3 + q() * 4, 2 + q() * 3, 0.3, 7, x, y), '#5E3A18', null, 0, { opacity: '0.55' }); });
    out += P.grill(34, 24, 35, 12, '#5E3A18', 2.8);
    return out + P.hl(-12, -12, 14, 4, '#FFFFFF', 0.22, -12);
  }
  function crumbedThigh(P, rnd) {
    var col = '#D9A04A', d = P.blob(rnd, 44, 32, 0.2, 9), out = P.shadow(d) + P.path(d, col, P.shade(col, -0.32), 1.2);
    out += P.path(P.blob(rnd, 36, 25, 0.2, 9), P.shade(col, 0.12), null, 0, { opacity: '0.8' });
    out += P.scatter(rnd, 50, 40, 28, function (x, y, i, q) { var a = q() * Math.PI, l = 2.4 + q() * 2.6; return P.line(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, i % 3 ? '#F2D08E' : '#B07428', 1.3); });
    return out + P.hl(-14, -12, 14, 4, '#FFFFFF', 0.25, -12);
  }
  // a drumstick along x from the thick end to the knuckle, centred on 0,0
  function drum(P, x, y, a, l, w, skin, rnd) {
    var h = w / 2, d = P.smooth([[-h * 0.6, 0], [-h * 0.5, -h * 0.9], [l * 0.3, -h * 1.05], [l * 0.65, -h * 0.55], [l * 0.92, -h * 0.32], [l, 0], [l * 0.92, h * 0.32], [l * 0.65, h * 0.55], [l * 0.3, h * 1.05], [-h * 0.5, h * 0.9]]);
    var out = bone(P, l * 0.8, 0, l + w * 0.45, 0, w * 0.32, true) + P.shadow(d) + P.path(d, skin, P.shade(skin, -0.32), 1.1);
    out += P.path(P.smooth([[0, -h * 0.55], [l * 0.35, -h * 0.72], [l * 0.6, -h * 0.4], [l * 0.35, -h * 0.1]]), P.shade(skin, 0.22), null, 0, { opacity: '0.6' });
    for (var i = 0; i < 4; i++) out += P.circle(rnd() * l * 0.6, (rnd() - 0.5) * h, 1 + rnd() * 1.6, P.shade(skin, -0.2), null, 0, { opacity: '0.5' });
    return P.g(P.at(x, y, a), P.g('translate(' + P.n(-l * 0.45) + ' 0)', out));
  }
  function flatWing(P, skin) {
    var d = P.smooth([[-18, -6], [-6, -9.5], [6, -8], [18, -6.5], [21, 0], [18, 6.5], [6, 8], [-6, 9.5], [-18, 6], [-21, 0]]);
    return P.circle(-20, -2.2, 2.4, BONE, BONE_ED, 0.6) + P.circle(20, 2, 2.2, BONE, BONE_ED, 0.6) + P.shadow(d) + P.path(d, skin, P.shade(skin, -0.32), 1) + P.path('M-14 -2 Q0 -6 14 -3', 'none', P.shade(skin, 0.25), 2.4, { opacity: '0.6', 'stroke-linecap': 'round' });
  }
  function wings(o) {
    return function (P, rnd) {
      var sk = o.col || '#B5502A', out = '';
      P.spots(rnd, o.n || 6, 30, 20, 20).forEach(function (p, i) {
        var a = rnd() * 360;
        out += i % 2 ? drum(P, p[0], p[1], a, 30, 21, sk, rnd) : P.g(P.at(p[0], p[1], a), flatWing(P, sk));
      });
      if (o.seeds) out += P.crumbs(rnd, 16, 34, 22, ['#F4EBCB'], 0.9) + P.scatter(rnd, 6, 30, 20, function (x, y) { return P.circle(x, y, 1.8, 'none', '#7EA453', 1); });
      return out;
    };
  }
  // a roast chicken from above, breast up, the neck end to the left: whole, half (cut along the breastbone) or the
  // leg quarter. o.skin, o.char (grill marks and burnt patches), o.chop (cut through into pieces), o.crackle
  function bird(o) {
    return function (P, rnd) {
      var sk = o.skin || '#D4943E', ed = P.shade(sk, -0.32), out = '', part = o.part || 'whole';
      function piece(d) { return P.shadow(d) + P.path(d, sk, ed, 1.1); }
      function wingAt(x, y, a, m) { return P.g(P.at(x, y, a, [1, m]), piece(P.smooth([[-22, 0], [-14, -9], [8, -10], [22, -5], [26, 2], [12, 8], [-10, 9]])) + P.path('M-6 -2 Q6 2 18 -1', 'none', ed, 0.9, { opacity: '0.6' })); }
      function thighAt(x, y, a) { return P.g(P.at(x, y, a), piece(P.blob(rnd, 30, 19, 0.05, 10))); }
      function skin(rx, ry, cx, cy) {
        var s = P.g(P.at(cx, cy), P.scatter(rnd, 10, rx, ry, function (x, y, i, q) { return P.path(P.blob(q, 2 + q() * 3, 1.5 + q() * 2, 0.3, 6, x, y), P.shade(sk, -0.16), null, 0, { opacity: '0.5' }); }));
        if (o.char) s += P.g(P.at(cx, cy), P.g('', P.grill(rx, ry, 40, 13, C.charred, 2.6), { opacity: '0.7' }) + P.scatter(rnd, 6, rx * 0.9, ry * 0.9, function (x, y, i, q) { return P.path(P.blob(q, 3 + q() * 4, 2 + q() * 2.5, 0.35, 7, x, y), C.charred, null, 0, { opacity: '0.55' }); }));
        if (o.chilli) s += P.g(P.at(cx, cy), P.crumbs(rnd, 30, rx, ry, ['#8E1F14', '#E0602A', '#5E8C3A'], 0.9));
        if (o.crackle) s += P.g(P.at(cx, cy), P.crumbs(rnd, 40, rx, ry, [P.shade(sk, 0.35), P.shade(sk, 0.2)], 0.8));
        if (o.herb) s += P.g(P.at(cx, cy), P.crumbs(rnd, 10, rx * 0.8, ry * 0.8, ['#4F7F2F', '#7EA453'], 0.8));
        return s;
      }
      if (part === 'whole') {
        out += wingAt(-34, -38, -18, 1) + wingAt(-34, 38, 18, -1) + thighAt(24, -28, 18) + thighAt(24, 28, -18);
        out += piece(P.smooth([[-62, 0], [-56, -30], [-30, -46], [10, -46], [44, -34], [60, -12], [62, 12], [44, 34], [10, 46], [-30, 46], [-56, 30]]));
        out += skin(50, 36, -4, 0) + P.path('M-54 0 Q0 -2 44 0', 'none', P.shade(sk, -0.18), 1.2, { opacity: '0.6' });
        out += P.hl(-8, -18, 30, 9, '#FFFFFF', 0.25, -4) + P.hl(-8, 18, 30, 8, '#FFFFFF', 0.15, 4);
        out += drum(P, 50, -15, 22, 44, 28, sk, rnd) + drum(P, 50, 15, -22, 44, 28, sk, rnd);
        return P.g('translate(-6 0)', out);
      }
      if (part === 'half') {
        out += wingAt(-38, 40, 22, -1) + thighAt(30, 34, -10);
        out += piece(P.smooth([[-48, -3], [-62, -2], [-60, 28], [-32, 48], [10, 50], [40, 40], [58, 18], [58, -3], [30, -4], [-10, -4]]));
        out += skin(46, 20, -6, 24) + P.line(-48, 0, 46, 0, '#F3E3C4', 2.4) + P.hl(-8, 14, 30, 7, '#FFFFFF', 0.22, 4);
        if (o.chop) [-34, -10, 14, 36].forEach(function (x) { var y2 = 46 - Math.abs(x) * 0.2; out += P.line(x + 1, 1.5, x + 4, y2, '#F3E3C4', 1.2, { opacity: '0.9' }) + P.line(x, 1.5, x + 3, y2, P.shade(sk, -0.45), 1.3, { opacity: '0.8' }); });
        out += drum(P, 56, 34, -6, 44, 28, sk, rnd);
        if (o.chop) out += P.line(54, 24, 57, 44, P.shade(sk, -0.45), 1.3, { opacity: '0.8' });
        return P.g('translate(-12 -28)', out);
      }
      // the leg quarter: thigh with a piece of the back, the drumstick out to the right
      out += piece(P.smooth([[-56, -6], [-50, -24], [-28, -30], [-4, -26], [10, -12], [12, 8], [0, 24], [-26, 30], [-48, 22], [-58, 8]]));
      out += P.path('M-55 -10 Q-60 4 -53 18', 'none', '#F3E3C4', 2.4, { 'stroke-linecap': 'round' }) + skin(28, 20, -22, 0) + P.hl(-28, -14, 16, 5, '#FFFFFF', 0.22, -10);
      out += drum(P, 26, 8, 10, 50, 30, sk, rnd);
      return P.g('translate(-4 -2)', out);
    };
  }
  function supreme(P, rnd) {
    var sk = '#D9A050', d = breastD(P, 0.82), out = bone(P, -36, -4, -74, -10, 7, true);
    out += P.shadow(d) + P.path(d, sk, P.shade(sk, -0.32), 1.2) + P.path(P.blob(rnd, 36, 15, 0.08, 12, -4, -1), '#E6B46A', null, 0, { opacity: '0.85' });
    out += P.crumbs(rnd, 26, 38, 16, ['#F2CB7A', '#B9782E'], 0.9) + P.hl(-16, -10, 18, 3.4, '#FFFFFF', 0.3, -6);
    return P.g('translate(12 2)', out);
  }
  // a spatchcocked bird, flattened: breast in the middle, wings out at the top, legs splayed at the bottom
  function flatBird(o) {
    return function (P, rnd) {
      var sk = o.skin, ed = P.shade(sk, -0.32), out = '', mk = o.char;
      function piece(d, rx, ry, cx, cy) {
        var s = P.shadow(d) + P.path(d, sk, ed, 1.1);
        if (mk) s += P.g(P.at(cx || 0, cy || 0), P.g('', P.grill(rx, ry, 45, 13, C.charred, 2.6), { opacity: '0.7' }));
        return s;
      }
      [-1, 1].forEach(function (m) {
        out += P.g(P.at(m * 50, -40, m * -28, [m, 1]), piece(P.smooth([[-24, 0], [-14, -10], [10, -11], [26, -5], [30, 3], [12, 9], [-12, 9]]), 22, 8));
        out += P.g(P.at(m * 38, 30, m * 32), piece(P.blob(rnd, 28, 21, 0.05, 10), 24, 17));
      });
      out += piece(P.smooth([[0, -60], [30, -54], [48, -32], [50, 0], [44, 30], [26, 50], [0, 56], [-26, 50], [-44, 30], [-50, 0], [-48, -32], [-30, -54]]), 44, 50);
      out += P.path('M0 -52 Q-2 0 0 48', 'none', ed, 1.2, { opacity: '0.5' }) + P.hl(-20, -22, 14, 22, '#FFFFFF', 0.18, 10) + P.hl(20, -22, 14, 22, '#FFFFFF', 0.12, -10);
      if (mk) out += P.scatter(rnd, 9, 42, 48, function (x, y, i, q) { return P.path(P.blob(q, 3 + q() * 4, 2 + q() * 3, 0.35, 7, x, y), C.charred, null, 0, { opacity: '0.5' }); });
      if (o.chilli) out += P.crumbs(rnd, 50, 44, 50, ['#8E1F14', '#E0602A', '#5E8C3A'], 1);
      out += drum(P, 58, 54, 50, 40, 26, sk, rnd) + drum(P, -58, 54, 130, 40, 26, sk, rnd);
      if (o.skewers) out += P.line(-58, -50, 58, 62, WOOD_ED, 6) + P.line(-58, -50, 58, 62, WOOD, 4) + P.line(58, -50, -58, 62, WOOD_ED, 6) + P.line(58, -50, -58, 62, WOOD, 4);
      return P.g(P.at(0, -9, 0, o.s || 1), out);
    };
  }
  function roulade(P, rnd) {
    var out = '';
    [[-34, 2], [0, -2], [34, 2]].forEach(function (p, i) {
      var d = P.blob(rnd, 21, 19, 0.05, 12), s = P.shadow(d) + P.path(d, '#C98A3A', '#9A6024', 1.1) + P.path(P.blob(rnd, 17.5, 15.5, 0.05, 11), '#F4E8D0', null, 0);
      var sp = [];
      for (var t = 0; t <= 1.001; t += 0.04) { var a = t * Math.PI * 2 * 2.2 + i, r = 1.5 + t * 12; sp.push([Math.cos(a) * r, Math.sin(a) * r * 0.9]); }
      s += P.path(P.smooth(sp, true), 'none', '#4F7F2F', 3.2, { 'stroke-linecap': 'round' }) + P.path(P.smooth(sp, true), 'none', '#C0392B', 1.1, { 'stroke-linecap': 'round', opacity: '0.85' });
      out += P.g(P.at(p[0], p[1]), s + P.hl(-6, -10, 6, 2, '#FFFFFF', 0.4, -20));
    });
    return out;
  }
  // thin shaved slices off the spit (yiros, souvlaki), each with a crisp edge
  function shavings(o) {
    return function (P, rnd) {
      var d = P.blob(rnd, o.rx * 0.78, o.ry * 0.72, 0.12, 11), out = P.shadow(d) + P.path(d, P.shade(o.col, -0.15), null, 0);
      out += P.pile(rnd, o.count || 30, o.rx, o.ry, function (x, y, i, q) {
        var l = 8 + q() * 5, b = 1.5 + q() * 2.5, rb = ribbon(P, [[-l, 0], [-l / 2, -b], [0, b * 0.6], [l / 2, -b], [l, 0]], 6 + q() * 2.5), col = [o.col, P.shade(o.col, 0.16), P.shade(o.col, -0.1)][i % 3];
        return P.g(P.at(x, y, q() * 180), P.path(rb.d, col, P.shade(o.col, -0.3), 0.6) + P.path(P.smooth(rb.l, true), 'none', o.edge || '#5E3418', 1, { 'stroke-linecap': 'round', opacity: '0.8' }) + P.path(P.smooth(rb.r, true), 'none', P.shade(o.col, 0.3), 0.9, { opacity: '0.7' }));
      });
      return out;
    };
  }

  /* ---------- duck and game ---------- */
  function confitLeg(P, rnd) {
    var sk = '#A8642A', out = bone(P, 26, 6, 58, 10, 9, true);
    var dr = P.smooth([[-4, -13], [18, -9], [32, 0], [34, 8], [28, 14], [12, 15], [-4, 13]]), th = P.blob(rnd, 34, 27, 0.08, 11, -20, 0);
    out += P.shadow(dr) + P.path(dr, sk, P.shade(sk, -0.35), 1.1) + P.shadow(th) + P.path(th, sk, P.shade(sk, -0.35), 1.2);
    out += P.path(P.blob(rnd, 26, 19, 0.1, 10, -22, -3), P.shade(sk, 0.14), null, 0, { opacity: '0.8' });
    out += P.scatter(rnd, 40, 30, 22, function (x, y, i, q) { return P.circle(x - 20, y, 0.9 + q() * 1.8, i % 3 ? '#D9944A' : '#7A4418', null, 0, { opacity: '0.8' }); });
    out += P.crumbs(rnd, 8, 24, 16, ['#FFFFFF'], 0.7);
    return P.g('translate(4 -1)', out + P.hl(-30, -12, 14, 4, '#FFFFFF', 0.28, -15));
  }
  function pekingRolls(P, rnd) {
    var out = '';
    [[-4, -13, -4], [4, 13, 5]].forEach(function (p) {
      var d = bar(P, 64, 22), s = P.g('translate(-4 0)', P.shadow(d) + P.path(d, '#F3E6CC', '#D3BF96', 1) + P.path('M-28 5 Q0 2 28 6', 'none', '#D3BF96', 1) + P.crumbs(rnd, 10, 26, 7, ['#E0C690'], 1.2));
      s += P.ellipse(28, 0, 4, 10.5, '#EADBB8', '#D3BF96', 0.8) + P.ellipse(28.5, 0, 2.4, 8, '#4A2416');
      s += P.line(28, -2, 46, -6, '#7EA453', 1.6) + P.line(28, 3, 44, 7, '#C9DC8A', 1.4);
      s += P.g(P.at(36, -4, -8), P.rect(-7, -2, 14, 4, 1, '#5E8C3A', '#3E6A22', 0.6) + P.rect(-6, -0.8, 12, 1.6, 0.5, '#DCEBB8'));
      s += P.g(P.at(36, 3, 6), P.rect(-6.5, -3, 13, 6, 2, '#7A3418', '#4A1E0C', 0.6) + P.rect(-6, 1.2, 12, 1.4, 0.5, FAT));
      out += P.g(P.at(p[0] - 6, p[1], p[2]), s);
    });
    return out;
  }
  function duckPieces(P, rnd) {
    var out = '';
    [[-36, -11, -8], [-12, -13, -4], [12, -12, 4], [36, -10, 8], [-24, 11, -6], [0, 13, 0], [24, 11, 6]].forEach(function (p, i) {
      var d = rrD(P, -14, -9, 28, 18, 5), s = P.shadow(d) + P.path(d, '#7E3218', '#4E1C0A', 1.1);
      s += P.rect(-13, 3.4, 26, 2.6, 1, FAT) + P.rect(-13, 6, 26, 2.4, 1, '#B5706A');
      if (i % 3 === 1) s += P.ellipse(4, 6.5, 2.6, 1.6, BONE, BONE_ED, 0.5);
      s += P.path('M-10 -5 Q0 -8 10 -4', 'none', '#FFFFFF', 1.6, { opacity: '0.35', 'stroke-linecap': 'round' }) + P.circle(-4 + rnd() * 8, -1, 1.2, '#5E2410', null, 0, { opacity: '0.6' });
      out += P.g(P.at(p[0], p[1], p[2]), s);
    });
    return out;
  }
  function venison(P, rnd) {
    var out = '';
    [[-38, 2], [-4, -6]].forEach(function (p) {
      var d = P.blob(rnd, 20, 19, 0.04, 12, p[0], p[1]);
      out += P.shadow(d) + P.path(d, '#3A2216', '#22140C', 1.2) + P.path(P.blob(rnd, 16, 15, 0.06, 11, p[0], p[1]), '#5A3420', null, 0) + P.g(P.at(p[0], p[1]), P.crumbs(rnd, 10, 13, 12, ['#2A1A10', '#7A5236'], 0.8)) + P.hl(p[0] - 6, p[1] - 7, 6, 2, '#FFFFFF', 0.25, -20);
    });
    function cut(x, y, a) { return P.g(P.at(x, y, a), slice(P, 38, 17, { crust: '#3A2216', top: [['#3A2216', 1.4]], bot: [['#3A2216', 1.4]], band: '#7A2A2A', bw: 1.6, core: '#A02A34' })); }
    return out + cut(34, -8, -6) + cut(38, 12, 5);
  }
  function crocBites(P, rnd) {
    return P.pile(rnd, 7, 26, 18, function (x, y, i, q) {
      var d = P.slab(q, 10, 9, 0.6, 0.08, 10), s = P.shadow(d, 1.4, 2) + P.path(d, '#EFE4CC', '#C9B08A', 1);
      s += P.path(P.blob(q, 5 + q() * 2, 3 + q() * 2, 0.3, 7, 2, 1), '#D9B07A', null, 0, { opacity: '0.8' }) + P.line(-5, -3, 3, 5, '#B98A4A', 1.6, { opacity: '0.6' }) + P.crumbs(q, 3, 6, 5, ['#4A3A2A'], 0.5);
      return P.g(P.at(x, y, q() * 90), s + P.hl(-3, -4, 3, 1.2, '#FFFFFF', 0.4));
    });
  }

  /* ---------- deli ---------- */
  // prosciutto: thin slices draped loosely, rose with lighter patches where it is thin, the white fat along one edge, soft folds
  function prosciutto(P, rnd) {
    var out = '';
    [[-18, -10, -12], [20, -6, 10], [-2, 14, -2]].forEach(function (s0) {
      var d = P.blob(rnd, 30, 17, 0.12, 12), s = P.shadow(d, 1.2, 1.8) + P.path(d, '#CF5C64', '#A23A44', 0.9);
      s += P.path(P.blob(rnd, 12, 6, 0.3, 8, -8, 3), '#E2858C', null, 0, { opacity: '0.6' }) + P.path(P.blob(rnd, 9, 5, 0.3, 8, 12, -2), '#E2858C', null, 0, { opacity: '0.5' });
      s += P.path('M-26 -6 Q-12 -19 4 -15 Q18 -13 27 -5', 'none', '#F7ECE6', 5, { 'stroke-linecap': 'round' }) + P.path('M-24 -3.6 Q-12 -15 4 -11.6 Q18 -10 25 -3', 'none', '#E8B8B8', 1, { opacity: '0.8' });
      s += P.path('M-6 -13 Q-1 0 -8 14', 'none', '#A23A44', 1.1, { opacity: '0.6', 'stroke-linecap': 'round' }) + P.path('M-4 -12 Q1 0 -6 13', 'none', '#F4C0C4', 1.4, { opacity: '0.6', 'stroke-linecap': 'round' });
      s += P.path('M12 -11 Q17 2 13 14', 'none', '#A23A44', 1.1, { opacity: '0.55', 'stroke-linecap': 'round' });
      out += P.g(P.at(s0[0], s0[1], s0[2]), s);
    });
    return out;
  }
  function shavedHam(P, rnd) {
    return P.pile(rnd, 24, 30, 20, function (x, y, i, q) {
      var a = q() * 360, l = 9 + q() * 6, b = (q() - 0.5) * 8;
      var rb = ribbon(P, [[-l, b * 0.4], [-l / 2, -b], [0, b], [l / 2, -b], [l, b * 0.4]], 8 + q() * 3), col = i % 3 ? '#EBA9A4' : '#E39690';
      return P.g(P.at(x, y, a), P.shadow(rb.d, 1, 1.4) + P.path(rb.d, col, '#C9827E', 0.7) + P.path(P.smooth(rb.l, true), 'none', '#F8DAD4', 1.4, { opacity: '0.9' }));
    });
  }
  function salami(o) {
    return function (P, rnd) {
      var r = o.r || 17, skin = o.skin || '#6E2A2E';
      return P.fan(o.n || 6, o.rad || 70, o.spread || 70, function (x, y) {
        var d = circD(P, 0, 0, r), s = P.shadow(d, 1.2, 1.6) + P.path(d, skin, P.shade(skin, -0.3), 1) + P.circle(0, 0, r - 1.8, o.col || '#A8303A');
        s += P.scatter(rnd, o.fat || 11, r - 4, r - 4, function (fx, fy, j, q) { return P.path(P.blob(q, 1.2 + q(), 1 + q() * 0.8, 0.3, 6, fx, fy), '#F4DCD4', null, 0); });
        s += P.crumbs(rnd, 4, r - 5, r - 5, ['#2E1A1A'], 0.6) + P.hl(-r * 0.35, -r * 0.4, r * 0.3, r * 0.1, '#FFFFFF', 0.3, -30);
        return P.g(P.at(x, y - (o.dy || 8)), s);
      });
    };
  }
  function pepperoni(P, rnd) {
    var out = '';
    [[-30, -10], [-8, -14], [14, -10], [34, -12], [-22, 10], [2, 8], [24, 12]].forEach(function (p) {
      var r = 11, d = circD(P, p[0], p[1], r);
      out += P.shadow(d, 1, 1.4) + P.path(d, '#8A2A1A', '#5E1A10', 1) + P.circle(p[0], p[1], r - 2.4, '#C0402A') + P.circle(p[0] + 0.5, p[1] + 0.5, r - 5.5, '#D9573A', null, 0, { opacity: '0.85' });
      out += P.circle(p[0] + 1, p[1] + 1, 2.6, '#F08A4A', null, 0, { opacity: '0.7' }) + P.g(P.at(p[0], p[1]), P.crumbs(rnd, 4, 6, 6, ['#F2C8B0'], 0.6)) + P.hl(p[0] - 4, p[1] - 5, 3.4, 1.2, '#FFFFFF', 0.4, -30);
    });
    return out;
  }
  function frankfurt(P) {
    var pts = [];
    for (var i = 0; i <= 10; i++) { var t = i / 10; pts.push([-46 + t * 92, -Math.sin(t * Math.PI) * 8 + 4]); }
    var rb = ribbon(P, pts, function (t) { return 15 * (t < 0.06 || t > 0.94 ? 0.7 : 1); }), out = P.shadow(rb.d) + P.path(rb.d, '#C9503A', '#8E3020', 1.1);
    out += P.path(P.smooth(pts.slice(1, -1).map(function (p) { return [p[0], p[1] - 3.4]; }), true), 'none', '#FFFFFF', 2.2, { opacity: '0.35', 'stroke-linecap': 'round' });
    return out + P.circle(-48.5, 4, 2.2, '#A8402A', '#8E3020', 0.8) + P.circle(48.5, 4, 2.2, '#A8402A', '#8E3020', 0.8);
  }
  function kabana(P) {
    var out = '';
    [[-4, -10, 6], [6, 0, -4], [-2, 10, 3]].forEach(function (p) {
      var d = bar(P, 50, 9), s = P.shadow(d, 1.2, 1.6) + P.path(d, '#7A2A1E', '#4E1810', 1) + P.line(-21, -1.8, 20, -1.8, '#FFFFFF', 1.2, { opacity: '0.3' });
      s += P.ellipse(22, 0, 3.2, 4.3, '#B5504A', '#7A2A1E', 0.8) + P.circle(22.6, -1.2, 0.7, '#F2DCD0') + P.circle(21.6, 1.3, 0.6, '#F2DCD0');
      out += P.g(P.at(p[0], p[1], p[2]), s);
    });
    return out;
  }
  function terrine(P, rnd) {
    var d = rrD(P, -33, -21, 66, 42, 5), out = P.shadow(d) + P.path(d, '#B5484E', '#8A3036', 1);
    out += P.rect(-31.4, -19.4, 62.8, 38.8, 4, 'none', '#F0D0C8', 0.8, { opacity: '0.7' }) + P.rect(-29, -17, 58, 34, 3, '#D9A894');
    out += P.scatter(rnd, 8, 24, 13, function (x, y, i, q) { return P.path(P.blob(q, 4 + q() * 2.5, 3 + q() * 1.5, 0.3, 7, x, y), '#A8545A', null, 0); });
    out += P.scatter(rnd, 7, 24, 13, function (x, y) { return P.ellipse(x, y, 2.4, 1.7, '#8DB255', '#5E8C3A', 0.5); });
    out += P.scatter(rnd, 6, 24, 13, function (x, y) { return P.rect(x - 1.3, y - 1.3, 2.6, 2.6, 0.6, '#F4EBDD'); }) + P.crumbs(rnd, 12, 25, 14, ['#3A2A24'], 0.6);
    return out + P.hl(-14, -12, 14, 2.2, '#FFFFFF', 0.3);
  }

  /* ---------- curries and braises ---------- */
  // a piece sitting in the sauce: the bottom edge under it
  function dip(P, x, y, rx, ry, sc) { return P.path('M' + P.n(x - rx) + ' ' + P.n(y + ry * 0.15) + ' Q' + P.n(x) + ' ' + P.n(y + ry * 1.5) + ' ' + P.n(x + rx) + ' ' + P.n(y + ry * 0.15) + ' Q' + P.n(x) + ' ' + P.n(y + ry * 0.8) + ' ' + P.n(x - rx) + ' ' + P.n(y + ry * 0.15) + ' Z', sc, null, 0, { opacity: '0.6' }); }
  function chunk(col, rx, ry) {
    return function (P, q, x, y, sc) {
      var a = rx * (0.85 + q() * 0.3), b = ry * (0.85 + q() * 0.3);
      return P.path(P.blob(q, a, b, 0.2, 8, x, y, q() * 180), col, P.shade(col, -0.35), 0.9) + P.hl(x - a * 0.3, y - b * 0.35, a * 0.35, b * 0.15, '#FFFFFF', 0.3, -15) + dip(P, x, y, a, b, sc);
    };
  }
  var BITS = {
    beef: chunk('#6B3A1E', 11, 9), lamb: chunk('#7A4026', 10.5, 9), chicken: chunk('#F0D6A6', 11, 9), tandoori: chunk('#C9622E', 11, 9.5), rendang: chunk('#4E2412', 13, 11),
    beefslice: function (P, q, x, y, sc) { return P.g(P.at(x, y, q() * 180), P.path(P.blob(q, 11, 3.4, 0.3, 10), '#7A4428', '#40200C', 0.8)) + dip(P, x, y, 8, 3, sc); },
    potato: function (P, q, x, y) { return P.g(P.at(x, y, q() * 90), P.path(rrD(P, -7, -6.5, 14, 13, 3.5), '#F2D27A', '#C9A04A', 0.8) + P.rect(-4, -4, 6, 5, 2, '#F8E4A8', null, 0, { opacity: '0.8' })); },
    peaegg: function (P, q, x, y) { return P.circle(x, y, 3.6, '#7EA453', '#4F7F2F', 0.7) + P.circle(x - 1, y - 1, 1.2, '#CFE3A0') + P.circle(x + 6, y + 2, 3.4, '#7EA453', '#4F7F2F', 0.7) + P.circle(x + 5, y + 1, 1.1, '#CFE3A0'); },
    bamboo: function (P, q, x, y) { return P.g(P.at(x, y, q() * 180), P.rect(-7, -2.2, 14, 4.4, 1.5, '#F2E6C4', '#D3C090', 0.6) + P.line(-5, 0, 5, 0, '#E0D0A0', 0.6)); },
    capsicum: function (P, q, x, y) { return P.g(P.at(x, y, q() * 180), P.path('M-8 -1 Q0 -5 8 -1 L8 2 Q0 -2 -8 2 Z', '#D9473B', '#A8302A', 0.6)); },
    onion: function (P, q, x, y) { return P.g(P.at(x, y, q() * 180), P.path('M-8 2 Q0 -7 8 2 Q0 -3 -8 2 Z', '#F1E4CC', '#D3C0A0', 0.6)); },
    carrot: function (P, q, x, y) { return P.circle(x, y, 6, '#EE8A2E', '#C96A1E', 0.8) + P.circle(x, y, 3.4, '#F4A04A', null, 0); },
    mushroom: function (P, q, x, y) { return P.g(P.at(x, y, q() * 60 - 30), P.path('M-8 2 Q-8 -8 0 -8 Q8 -8 8 2 L3 2 L3 7 L-3 7 L-3 2 Z', '#E2D2B4', '#7A5A3A', 1.2)); },
    pearl: function (P, q, x, y) { return P.circle(x, y, 5.5, '#E8D4A8', '#B99A6A', 0.8) + P.path('M' + P.n(x - 2) + ' ' + P.n(y - 4.6) + ' Q' + P.n(x - 4) + ' ' + P.n(y) + ' ' + P.n(x - 2) + ' ' + P.n(y + 4.6), 'none', '#C9AA7A', 0.7) + P.hl(x - 1.5, y - 2, 2, 1.2, '#FFFFFF', 0.5); },
    bacon: function (P, q, x, y) { return P.g(P.at(x, y, q() * 180), P.rect(-4.5, -3, 9, 6, 1.2, '#B5503F', '#7A3426', 0.6) + P.rect(-4.5, -0.8, 9, 1.6, 0, '#F0D8D0')); }
  };
  var GARN = {
    coriander: function (P, q, x, y) { var s = ''; for (var k = 0; k < 3; k++) { var a = k * 2.1 + q(); s += P.circle(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 2.6, '#4F8F2F', '#3A6A22', 0.4); } return s; },
    basil: function (P, q, x, y) { return P.leaf(13, 6.5, '#3F7A2A', x, y, q() * 360, { edge: '#2E5A1E', ew: 0.5 }); },
    chilli: function (P, q, x, y) { return P.circle(x, y, 2.8, '#F4D9B8', '#C0392B', 1.5) + P.circle(x + 0.4, y, 0.7, '#F2CB55'); },
    peanut: function (P, q, x, y) { return P.g(P.at(x, y, q() * 180), P.ellipse(0, 0, 3.1, 2.2, '#D9A86A', '#A8763A', 0.6) + P.line(-2, 0, 2, 0, '#B9864A', 0.5)); },
    kaffir: function (P, q, x, y) { var a = q() * Math.PI; return P.line(x, y, x + Math.cos(a) * 8, y + Math.sin(a) * 8, '#3E6A22', 1.1); },
    shallot: function (P, q, x, y) { return P.path('M' + P.n(x - 3) + ' ' + P.n(y) + ' Q' + P.n(x) + ' ' + P.n(y - 4) + ' ' + P.n(x + 3) + ' ' + P.n(y), 'none', '#9A5A26', 1.5, { 'stroke-linecap': 'round' }); },
    parsley: function (P, q, x, y) { return P.rect(x - 1.1, y - 1, 2.2, 2, 0.5, q() > 0.5 ? '#4F7F2F' : '#6E9A3E'); },
    coconut: function (P, q, x, y) { return P.circle(x, y, 0.9 + q() * 0.9, q() > 0.5 ? '#8A5A2A' : '#B08050'); },
    cream: function (P, q, x, y) { var sp = []; for (var t = 0; t <= 1.001; t += 0.05) { var a = t * Math.PI * 5, r = 2 + t * 16; sp.push([x + Math.cos(a) * r, y + Math.sin(a) * r * 0.85]); } return P.path(P.smooth(sp, true), 'none', '#F7F1E3', 3, { opacity: '0.9', 'stroke-linecap': 'round' }); },
    yoghurt: function (P, q, x, y) { return P.path(P.blob(q, 11, 9, 0.2, 8, x, y), '#F6F4EC', '#E0DDD2', 0.8) + P.hl(x - 3, y - 3, 4, 1.6, '#FFFFFF', 0.7); }
  };
  // a curry or a braise in its bowl, contents only: a round of sauce, the pieces half in it, the garnish on top.
  // o.bits [[kind, count]], o.garnish [[kind, count]], o.dry for a thick paste (rendang)
  function curry(o) {
    return function (P, rnd) {
      var R = o.r || 68, sc = o.sauce, out = '', kinds = [], i;
      out += P.path(P.blob(rnd, R, R * 0.98, o.dry ? 0.07 : 0.025, 16), sc, P.shade(sc, -0.25), 1);
      if (o.dry) out += P.scatter(rnd, 18, R * 0.85, R * 0.85, function (x, y, j, q) { return P.path(P.blob(q, 5 + q() * 6, 4 + q() * 4, 0.3, 7, x, y), j % 2 ? P.shade(sc, 0.12) : P.shade(sc, -0.15), null, 0); });
      else {
        out += P.path(P.blob(rnd, R * 0.84, R * 0.82, 0.05, 14), P.shade(sc, 0.1), null, 0, { opacity: '0.55' });
        out += P.scatter(rnd, 14, R * 0.86, R * 0.86, function (x, y, j, q) { return P.circle(x, y, 1.2 + q() * 2.4, P.shade(o.oil || sc, 0.3), null, 0, { opacity: '0.55' }); });
      }
      (o.bits || []).forEach(function (b) { for (var k = 0; k < b[1]; k++) kinds.push(b[0]); });
      for (i = kinds.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = kinds[i]; kinds[i] = kinds[j]; kinds[j] = t; }
      P.spots(rnd, kinds.length, R * 0.7, R * 0.7, 15).forEach(function (p, k) { out += BITS[kinds[k]](P, rnd, p[0], p[1], sc); });
      (o.garnish || []).forEach(function (gn) {
        if (gn[1] === 1) { out += GARN[gn[0]](P, rnd, gn[2] || 0, gn[3] || 0); return; }
        P.spots(rnd, gn[1], R * 0.72, R * 0.72).forEach(function (p) { out += GARN[gn[0]](P, rnd, p[0], p[1]); });
      });
      return out;
    };
  }
  function ossoBuco(P, rnd) {
    var d = P.blob(rnd, 42, 38, 0.08, 12), out = P.shadow(d) + P.path(d, '#6B3418', '#40200C', 1.2) + P.path(P.blob(rnd, 36, 32, 0.1, 11), '#7E4220', null, 0);
    for (var i = 0; i < 7; i++) { var a = i / 7 * Math.PI * 2 + 0.3; out += P.path('M' + P.n(Math.cos(a) * 12) + ' ' + P.n(Math.sin(a) * 11) + ' Q' + P.n(Math.cos(a + 0.25) * 24) + ' ' + P.n(Math.sin(a + 0.25) * 22) + ' ' + P.n(Math.cos(a) * 34) + ' ' + P.n(Math.sin(a) * 30), 'none', '#4E2410', 1, { opacity: '0.6' }); }
    out += P.circle(2, -1, 11, BONE, BONE_ED, 1.2) + P.circle(2, -1, 6.5, '#D9A85A', '#B98A3A', 0.8) + P.hl(0, -3, 2.5, 1.4, '#FFFFFF', 0.5);
    out += P.crumbs(rnd, 30, 30, 26, ['#4F7F2F', '#7EA453', '#F2CB55'], 1);
    return out + P.hl(-16, -18, 12, 4, '#FFFFFF', 0.25, -20);
  }

  /* ---------- more cuts (21 Oct 2026) ---------- */
  var ROUND = { 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  // points round the top edge of an rx by ry ellipse, from angle a0 to a1 (degrees, 270 is straight up), pulled in by k
  function arcPts(rx, ry, a0, a1, k) { var out = []; for (var a = a0; a <= a1 + 0.1; a += (a1 - a0) / 6) out.push([Math.cos(a * Math.PI / 180) * rx * k, Math.sin(a * Math.PI / 180) * ry * k]); return out; }
  // a shape's points scaled by sx, sy and moved down by dy (a layer inside the one before, thicker at the top)
  function inset(pts, sx, sy, dy) { return pts.map(function (p) { return [p[0] * sx, p[1] * sy + dy]; }); }
  // a slice of roast turkey breast lying flat: the roast skin along the top edge, pale meat, faint fibres
  function turkeySlice(P, rnd, rx, ry) {
    var meat = '#F0E0C4', skin = '#C98A42', pts = P.blobPts(rnd, rx, ry, 0.05, 12), d = P.smooth(pts), out = P.shadow(d, 1.5, 2) + P.path(d, skin, P.shade(skin, -0.26), 0.9);
    out += P.path(P.smooth(inset(pts, 0.95, 0.84, ry * 0.15)), meat, P.shade(meat, -0.26), 0.7);
    out += P.path(P.blob(rnd, rx * 0.72, ry * 0.52, 0.1, 10, rx * 0.05, ry * 0.24), P.shade(meat, 0.35), null, 0, { opacity: '0.8' });
    var f = '';
    for (var i = -2; i <= 2; i++) f += 'M' + P.n(i * rx * 0.3 - 2) + ' ' + P.n(-ry * 0.4) + ' Q' + P.n(i * rx * 0.3 + 3) + ' ' + P.n(ry * 0.15) + ' ' + P.n(i * rx * 0.3 - 1) + ' ' + P.n(ry * 0.68);
    out += P.path(f, 'none', P.shade(meat, -0.12), 0.7, { opacity: '0.7', 'stroke-linecap': 'round' });
    out += P.path(P.smooth(arcPts(rx, ry, 220, 320, 0.93), true), 'none', P.shade(skin, 0.45), 1.2, { opacity: '0.8', 'stroke-linecap': 'round' });
    return out + P.hl(-rx * 0.25, 0, rx * 0.25, ry * 0.1, P.shade(meat, 0.6), 0.8, -10);
  }
  // chicken livers, pan fried: glossy lobes, browned at the edges
  function livers(P, rnd) {
    var col = '#7A3626';
    return P.pile(rnd, 6, 26, 19, function (x, y, i, q) {
      var rx = 13 + q() * 3, ry = 8.5 + q() * 2, d = P.blob(q, rx, ry, 0.12, 10), s = P.shadow(d, 1.5, 2) + P.path(d, '#8E4A30', P.shade('#8E4A30', -0.26), 0.9);
      s += P.path(P.blob(q, rx * 0.84, ry * 0.76, 0.12, 9, -rx * 0.04, -ry * 0.04), col, null, 0);
      if (i % 2) s += P.path('M' + P.n(rx * 0.1) + ' ' + P.n(-ry * 0.7) + ' Q' + P.n(-rx * 0.1) + ' 0 ' + P.n(rx * 0.15) + ' ' + P.n(ry * 0.7), 'none', P.shade(col, -0.26), 0.9, { 'stroke-linecap': 'round' });
      s += P.path(P.blob(q, rx * 0.4, ry * 0.3, 0.3, 7, rx * 0.3, ry * 0.25), '#5A2416', null, 0, { opacity: '0.5' });
      return P.g(P.at(x, y, q() * 180), s + P.hl(-rx * 0.3, -ry * 0.35, rx * 0.32, ry * 0.15, P.shade(col, 0.45), 0.8, -10));
    });
  }
  // a braised rabbit hind leg: the thigh, the slim bone out to the right, glossy with the braise
  function rabbitLeg(P, rnd) {
    var col = '#A2683E', out = bone(P, 18, 2, 50, 5, 6.5, true, P.shade(BONE, -0.26));
    var d = P.smooth([[-46, 0], [-40, -15], [-20, -21], [4, -16], [20, -7], [25, 2], [19, 10], [2, 15], [-20, 19], [-40, 13]]);
    out += P.shadow(d) + P.path(d, col, P.shade(col, -0.26), 1.1) + P.path(P.blob(rnd, 28, 12, 0.1, 10, -12, -2), P.shade(col, 0.14), null, 0, { opacity: '0.8' });
    var f = '';
    for (var i = 0; i < 4; i++) { var y = -10 + i * 6.5; f += 'M-38 ' + P.n(y + 1) + ' Q-12 ' + P.n(y - 3 + rnd() * 5) + ' 16 ' + P.n(y * 0.5); }
    out += P.path(f, 'none', P.shade(col, -0.26), 0.8, { opacity: '0.5' });
    out += P.path(P.blob(rnd, 10, 4, 0.3, 8, -26, 9), '#6E3A1E', null, 0, { opacity: '0.45' });
    return P.g('translate(-5 0)', out + P.hl(-20, -11, 14, 3, P.shade(col, 0.45), 0.8, -6) + P.hl(8, -6, 6, 1.6, P.shade(col, 0.45), 0.75, -12));
  }
  // a piece of braised oxtail cut across: the round of meat, the vertebra in the middle, glossy
  function oxtailPiece(P, rnd, r) {
    var col = '#5E2C16', d = P.blob(rnd, r, r * 0.94, 0.08, 11), out = P.shadow(d) + P.path(d, col, P.shade(col, -0.26), 1.1);
    out += P.path(P.blob(rnd, r * 0.84, r * 0.78, 0.1, 10), P.shade(col, 0.12), null, 0, { opacity: '0.85' });
    var f = '';
    for (var i = 0; i < 6; i++) { var a = i / 6 * Math.PI * 2 + rnd() * 0.5; f += 'M' + P.n(Math.cos(a) * r * 0.36) + ' ' + P.n(Math.sin(a) * r * 0.34) + ' Q' + P.n(Math.cos(a + 0.3) * r * 0.6) + ' ' + P.n(Math.sin(a + 0.3) * r * 0.58) + ' ' + P.n(Math.cos(a) * r * 0.82) + ' ' + P.n(Math.sin(a) * r * 0.76); }
    out += P.path(f, 'none', P.shade(col, -0.26), 0.9, { opacity: '0.6' });
    var b = '#E6D2B0', bd = P.smooth([[0, -r * 0.34], [r * 0.16, -r * 0.2], [r * 0.34, -r * 0.08], [r * 0.24, r * 0.12], [r * 0.12, r * 0.3], [-r * 0.12, r * 0.3], [-r * 0.24, r * 0.12], [-r * 0.34, -r * 0.08], [-r * 0.16, -r * 0.2]]);
    out += P.path(bd, b, P.shade(b, -0.26), 0.9) + P.circle(0, 0, r * 0.11, '#C9A070', P.shade('#C9A070', -0.26), 0.6);
    return out + P.hl(-r * 0.4, -r * 0.5, r * 0.3, r * 0.1, P.shade(col, 0.45), 0.8, -25) + P.hl(r * 0.45, r * 0.2, r * 0.12, r * 0.06, P.shade(col, 0.45), 0.7, -60);
  }
  // a round slice of roast pork tenderloin: the browned edge, the cooked ring, the pale pink middle
  function porkMedal(P, rx, ry) {
    var cr = '#A86A38', d = circD(P, 0, 0, rx, ry);
    return P.shadow(d, 1.4, 2) + P.path(d, cr, P.shade(cr, -0.26), 1) + P.ellipse(0, 0, rx - 2, ry - 2, '#E2B48E') + P.ellipse(0, 0, rx - 3.6, ry - 3.6, '#F0D0BC') +
      P.ellipse(-0.5, -0.5, rx - 7, ry - 7, '#F6DECE', null, 0, { opacity: '0.8' }) + P.hl(-rx * 0.3, -ry * 0.42, rx * 0.3, ry * 0.12, '#FBEDE4', 0.8, -20);
  }
  // a slice of roast pork loin lying flat: the crackling along the top, a band of fat under it, the pale eye
  function loinSlice(P, rnd) {
    var cr = '#E0AE5E', fat = '#F4E6CC', meat = '#F0DCC8', pts = P.blobPts(rnd, 30, 21, 0.05, 12), d = P.smooth(pts), out = P.shadow(d, 1.5, 2) + P.path(d, cr, P.shade(cr, -0.26), 1);
    out += P.path(P.smooth(inset(pts, 0.96, 0.8, 4)), fat, P.shade(fat, -0.26), 0.6) + P.path(P.smooth(inset(pts, 0.88, 0.6, 7)), meat, P.shade(meat, -0.26), 0.6);
    out += P.path(P.blob(rnd, 17, 7, 0.1, 10, -1, 8), '#F6E6D8', null, 0, { opacity: '0.85' });
    out += arcPts(30, 21, 200, 340, 0.88).map(function (p, i) { return P.circle(p[0] + (rnd() - 0.5) * 2, p[1] + 0.5, 0.9 + (i % 2) * 0.5, '#F6E2A8', null, 0, { opacity: '0.9' }); }).join('');
    return out + P.hl(-8, 5, 8, 2, '#FBF1E8', 0.8, -8);
  }
  // a whole smoked ham hock: the glossy wrinkled skin, the cut end showing the meat and bone, the knuckle bone out the other end
  function hamHock(P, rnd) {
    var col = '#8E4426', out = bone(P, 30, -2, 62, -6, 15, true, P.shade(BONE, -0.26));
    var d = P.smooth([[-58, 0], [-54, -28], [-28, -38], [6, -33], [32, -20], [42, -6], [36, 10], [8, 28], [-26, 38], [-52, 27]]);
    out += P.shadow(d, 3, 4) + P.path(d, col, P.shade(col, -0.26), 1.2) + P.path(P.blob(rnd, 40, 26, 0.08, 12, -8, -3), P.shade(col, 0.12), null, 0, { opacity: '0.85' });
    var w = '';
    for (var i = 0; i < 6; i++) { var x = -40 + i * 13 + rnd() * 4; w += 'M' + P.n(x) + ' ' + P.n(-26 + i * 2) + ' Q' + P.n(x + 6) + ' ' + P.n(rnd() * 6 - 3) + ' ' + P.n(x - 2) + ' ' + P.n(26 - i * 3); }
    out += P.path(w, 'none', P.shade(col, -0.26), 1, { opacity: '0.6', 'stroke-linecap': 'round' });
    out += P.ellipse(-55, 0, 7, 25, '#D98A80', P.shade('#D98A80', -0.26), 1) + P.ellipse(-55, 0, 4.4, 20, '#E8A49A', null, 0, { opacity: '0.8' }) + P.ellipse(-54, 4, 3, 6, BONE, P.shade(BONE, -0.26), 0.7);
    return P.g('translate(-2 0)', out + P.hl(-22, -24, 18, 5, P.shade(col, 0.45), 0.8, -15) + P.hl(14, -16, 9, 2.6, P.shade(col, 0.45), 0.75, -25));
  }

  /* ---------- the items ---------- */
  var cutlets3 =function (P, rnd) { return cutletAt(P, rnd, -27, 16, -40) + cutletAt(P, rnd, 27, 16, -140) + cutletAt(P, rnd, 2, 28, -78); };
  var shredPork = { rx: 36, ry: 27, count: 64, base: '#A8683A', cols: ['#C98A5A', '#D9A070', '#B97A48', '#E6BC8E'], bark: '#5E3418' };

  L.add('meat', [
    // beef
    { id: 'rump', name: 'Rump steak', sub: 'Beef', kw: 'steak beef grilled char rump', form: 'piece', cook: 'grilled', role: 'main', g: 250, w: 96, h: 70, side: { s: 'slab', h: 14, c: C.beefCrust }, draw: steak({ rx: 46, ry: 33, fat: true }) },
    { id: 'rump-500', name: 'Rump steak, 500 g', sub: 'Beef', kw: 'steak beef grilled large', form: 'piece', cook: 'grilled', role: 'main', g: 500, w: 128, h: 92, of: 'rump', side: { s: 'slab', h: 18, c: C.beefCrust }, draw: steak({ rx: 62, ry: 44, fat: true, gap: 16 }) },
    { id: 'eye-fillet', name: 'Eye fillet', sub: 'Beef', kw: 'steak beef tenderloin filet mignon medallion', form: 'piece', cook: 'grilled', role: 'main', g: 200, w: 62, h: 58, side: { s: 'slab', h: 26, c: C.beefCrust }, draw: steak({ rx: 30, ry: 28, sq: 0, ang: 40, gap: 12 }) },
    { id: 'scotch-fillet', name: 'Scotch fillet', sub: 'Beef', kw: 'rib fillet rib eye ribeye scotch steak beef marbled', form: 'piece', cook: 'grilled', role: 'main', g: 300, w: 88, h: 78, side: { s: 'slab', h: 18, c: C.beefCrust }, draw: steak({ rx: 40, ry: 34, sq: 0.2, ang: 30, gap: 12, under: cap(42, 35, -4, -4), over: kernel(40, 34) }) },
    { id: 'sirloin', name: 'Sirloin steak', sub: 'Beef', kw: 'porterhouse new york strip striploin sirloin steak beef fat cap', form: 'piece', cook: 'grilled', role: 'main', g: 300, w: 106, h: 70, side: { s: 'slab', h: 16, c: C.beefCrust }, draw: steak({ rx: 52, ry: 27, sq: 0.55, ang: 30, gap: 14, under: cap(50, 30, 0, -9, 0.6) }) },
    { id: 'sirloin-sliced', name: 'Sirloin, sliced', sub: 'Beef', kw: 'porterhouse sliced steak strip fat cap medium rare', form: 'slices', cook: 'grilled', role: 'main', g: 250, w: 92, h: 62, side: { s: 'slab', h: 14, c: C.beefCrust }, draw: function (P, rnd) { return shingle(P, 6, 13, function () { return slice(P, 16, 52, { top: [[FATG, 2], [FAT, 6]], band: '#8E5A3A', bw: 1.5, e: 1.7, core: C.beefPink }, rnd); }, { arc: 0.9, tilt: 3 }); } },
    { id: 't-bone', name: 'T-bone steak', sub: 'Beef', kw: 'tbone t bone steak beef bone in porterhouse', form: 'piece', cook: 'grilled', role: 'main', g: 500, w: 146, h: 100, side: { s: 'slab', h: 18, c: C.beefCrust }, draw: tbone({}) },
    { id: 'tomahawk', name: 'Tomahawk steak', sub: 'Beef', kw: 'tomahawk bone in rib eye ribeye cowboy steak beef share', form: 'piece', cook: 'grilled', role: 'main', g: 1200, w: 226, h: 96, side: { s: 'slab', h: 30, c: C.beefCrust }, draw: tomahawk },
    { id: 'sliced-steak', name: 'Sliced steak, fanned', sub: 'Beef', kw: 'steak beef sliced fan medium rare pink', form: 'slices', cook: 'grilled', role: 'main', g: 200, w: 76, h: 56, side: { s: 'slab', h: 12, c: C.beefCrust }, draw: slicedSteak({ n: 6 }) },
    { id: 'flank-sliced', name: 'Flank steak, sliced', sub: 'Beef', kw: 'flank bavette skirt hanger steak sliced against the grain', form: 'slices', cook: 'grilled', role: 'main', g: 200, w: 86, h: 66, side: { s: 'slab', h: 10, c: '#5E3A1C' }, draw: function (P, rnd) { return shingle(P, 7, 11, function () { return slice(P, 12, 58, { crust: '#5E3A1C', band: '#8E5A3A', bw: 1.6, core: '#C24A3C', grain: 3.6 }, rnd); }, { zig: 3, tilt: -2 }); } },
    { id: 'wagyu-rump-cap', name: 'Wagyu rump cap, sliced', sub: 'Beef', kw: 'wagyu picanha rump cap marbled sliced beef', form: 'fan', cook: 'grilled', role: 'main', g: 150, w: 90, h: 56, side: { s: 'slab', h: 9, c: '#D46A60' }, draw: function (P, rnd) { return P.fan(7, 62, 56, function (x, y, a) { return P.g(P.at(x, y - 4, a), slice(P, 11, 44, { top: [[FATG, 1.6], [FAT, 6]], band: '#B5655A', bw: 1.4, core: '#D46A60', marble: 7 }, rnd)); }); } },
    { id: 'crumbed-steak', name: 'Crumbed steak', sub: 'Beef', kw: 'crumbed steak beef schnitzel cut', form: 'piece', cook: 'crumbed', role: 'main', g: 250, w: 122, h: 82, side: { s: 'slab', h: 10, c: '#C88A40' }, draw: crumbedSteak },
    { id: 'beef-schnitzel', name: 'Beef schnitzel', sub: 'Beef', kw: 'schnitty schnitzel crumbed beef veal wiener', form: 'piece', cook: 'crumbed', role: 'main', g: 250, w: 136, h: 96, of: 'chicken-schnitzel', side: { s: 'slab', h: 8, c: '#C88A40' }, draw: crumbed({ rx: 66, ry: 46, col: '#C88A40' }) },
    { id: 'beef-patty', name: 'Beef patty', sub: 'Beef', kw: 'burger patty hamburger mince beef pattie', form: 'piece', cook: 'grilled', role: 'main', g: 150, w: 74, h: 74, side: { s: 'disc', h: 12, c: '#6B4022' }, draw: patty({ r: 36 }) },
    { id: 'smash-patty', name: 'Smash patty', sub: 'Beef', kw: 'smash burger smashed patty thin crispy lacy beef', form: 'piece', cook: 'grilled', role: 'main', g: 90, w: 82, h: 80, side: { s: 'disc', h: 5, c: '#5E3418' }, draw: patty({ r: 39, col: '#7A4626', wob: 0.1, k: 30, lace: true }) },
    { id: 'rissoles', name: 'Rissoles', sub: 'Beef', kw: 'rissole beef mince patties onion', form: 'piece', cook: 'fried', role: 'main', n: 2, w: 112, h: 56, side: { s: 'disc', h: 18, c: '#7A4A28' }, draw: function (P, rnd) { var r = patty({ r: 26, sq: 0.8, col: '#7A4A28', flecks: true }); return P.g(P.at(-27, -3), r(P, rnd)) + P.g(P.at(27, 4), r(P, rnd)); } },
    { id: 'meatballs', name: 'Meatballs', sub: 'Beef', kw: 'meatball polpette beef pork mince balls', form: 'pile', cook: 'baked', role: 'main', n: 5, w: 80, h: 62, side: { s: 'pile', h: 26, c: '#7A4224' }, draw: meatballs({ n: 5 }) },
    { id: 'braised-beef-cheek', name: 'Braised beef cheek', sub: 'Beef', kw: 'beef cheek braised slow cooked red wine glossy', form: 'piece', cook: 'braised', role: 'main', g: 200, w: 70, h: 54, side: { s: 'mound', h: 30, c: '#5A2814' }, draw: braise({ rx: 34, ry: 25 }) },
    { id: 'oxtail-braised', name: 'Oxtail, braised', sub: 'Beef', kw: 'oxtail ox tail braised slow cooked pieces bone in red wine stew', form: 'piece', cook: 'braised', role: 'main', g: 400, w: 86, h: 74, side: { s: 'mound', h: 30, c: '#5E2C16' }, draw: function (P, rnd) { return P.g(P.at(-22, -12), oxtailPiece(P, rnd, 19)) + P.g(P.at(20, -14), oxtailPiece(P, rnd, 17)) + P.g(P.at(0, 14), oxtailPiece(P, rnd, 20)); } },
    { id: 'braised-short-rib', name: 'Beef short rib, braised', sub: 'Beef', kw: 'short rib braised beef rib bone in slow cooked', form: 'piece', cook: 'braised', role: 'main', g: 400, w: 106, h: 56, side: { s: 'slab', h: 36, c: '#5A2814' }, draw: shortRib },
    { id: 'la-short-ribs', name: 'LA-style short ribs', sub: 'Beef', kw: 'la galbi kalbi korean bbq flanken short ribs cross cut', form: 'piece', cook: 'grilled', role: 'main', g: 300, w: 136, h: 60, side: { s: 'slab', h: 8, c: '#6B3418' }, draw: laRibs },
    { id: 'smoked-beef-ribs', name: 'Beef ribs, smoked', sub: 'Beef', kw: 'beef ribs dino rib smoked bark low and slow bbq', form: 'piece', cook: 'smoked', role: 'main', g: 700, w: 146, h: 84, side: { s: 'slab', h: 34, c: '#2E2016' }, draw: beefRibs },
    { id: 'brisket-slices', name: 'Brisket, sliced', sub: 'Beef', kw: 'brisket smoked bark smoke ring bbq low and slow', form: 'slices', cook: 'smoked', role: 'main', g: 200, w: 110, h: 70, side: { s: 'slab', h: 12, c: '#8E5E3E' }, draw: function (P, rnd) { var out = ''; for (var i = 0; i < 4; i++) out += P.g(P.at((i - 1.5) * 3, (i - 1.5) * 14), slice(P, 100, 26, { crust: '#2E2016', top: [['#241810', 3.5], ['#C0503B', 2.2]], bot: [[FAT, 4.5]], core: '#8E5E3E', fibre: 6, e: 2.6 }, rnd) + P.g('translate(0 -11)', P.crumbs(rnd, 8, 44, 1.2, ['#6B5038'], 0.6))); return out; } },
    { id: 'corned-beef', name: 'Corned beef, sliced', sub: 'Beef', kw: 'corned beef silverside sliced pink', form: 'slices', cook: 'poached', role: 'main', g: 200, w: 110, h: 70, of: 'brisket-slices', side: { s: 'slab', h: 12, c: '#D9837A' }, draw: function (P, rnd) { var out = ''; for (var i = 0; i < 4; i++) out += P.g(P.at((i - 1.5) * 3, (i - 1.5) * 14), slice(P, 100, 26, { crust: '#B5605A', top: [[FAT, 4]], core: '#D9837A', fibre: 7 }, rnd)); return out; } },
    { id: 'pulled-beef', name: 'Pulled beef', sub: 'Beef', kw: 'pulled beef shredded brisket slow cooked', form: 'pile', cook: 'braised', role: 'main', g: 150, w: 74, h: 58, of: 'pulled-pork', side: { s: 'pile', h: 24, c: '#6B3A1E' }, draw: pulled({ rx: 36, ry: 27, count: 64, base: '#4E2A14', cols: ['#7A4A2A', '#8E5A34', '#6B3A1E', '#A06A40'], bark: '#2E1A0E' }) },
    { id: 'roast-beef-slices', name: 'Roast beef, sliced', sub: 'Beef', kw: 'roast beef carvery sliced topside sirloin pink', form: 'slices', cook: 'roasted', role: 'main', g: 150, w: 96, h: 72, side: { s: 'layer', h: 6, c: '#C9655A' }, draw: function (P, rnd) { var o = { crust: '#7A4A2A', band: '#A8705A', core: '#C9655A' }; return P.g(P.at(-16, -10, -10), roastSlice(P, rnd, 32, 22, o)) + P.g(P.at(18, 0, 8), roastSlice(P, rnd, 30, 22, Object.assign({ fold: true }, o))) + P.g(P.at(-6, 14, 4), roastSlice(P, rnd, 30, 20, Object.assign({ fold: true }, o))); } },
    { id: 'beef-tartare', name: 'Beef tartare', sub: 'Beef', kw: 'steak tartare tartar raw beef yolk capers', form: 'portion', cook: 'raw', role: 'main', g: 120, w: 58, h: 58, side: { s: 'disc', h: 22, c: '#A8302E' }, draw: tartare },
    { id: 'pastrami', name: 'Pastrami, sliced', sub: 'Beef', kw: 'pastrami deli sliced peppered brisket reuben', form: 'pile', cook: 'smoked', role: 'main', g: 120, w: 84, h: 60, side: { s: 'pile', h: 16, c: '#A8343E' }, draw: pastrami },
    // lamb
    { id: 'lamb-cutlets', name: 'Lamb cutlets', sub: 'Lamb', kw: 'lamb cutlets chops frenched bone grilled', form: 'stack', cook: 'grilled', role: 'main', n: 3, w: 116, h: 92, side: { s: 'pile', h: 22, c: LAMB }, draw: cutlets3 },
    { id: 'lamb-cutlet', name: 'Lamb cutlet, one', sub: 'Lamb', kw: 'lamb cutlet chop frenched bone single', form: 'piece', cook: 'grilled', role: 'main', n: 1, w: 92, h: 40, of: 'lamb-cutlets', side: { s: 'slab', h: 14, c: LAMB }, draw: function (P, rnd) { return P.g('translate(-12 0)', cutlet(P, rnd)); } },
    { id: 'lamb-rack', name: 'Lamb rack', sub: 'Lamb', kw: 'rack of lamb frenched herb crust roast', form: 'piece', cook: 'roasted', role: 'main', g: 400, w: 96, h: 100, side: { s: 'slab', h: 40, c: '#5E3A1C' }, draw: lambRack },
    { id: 'lamb-shoulder-pulled', name: 'Slow-roast lamb shoulder', sub: 'Lamb', kw: 'lamb shoulder slow roast pulled 12 hour rosemary', form: 'piece', cook: 'roasted', role: 'main', g: 250, w: 110, h: 76, side: { s: 'mound', h: 40, c: '#6E3E1E' }, draw: lambShoulder },
    { id: 'lamb-loin-chops', name: 'Lamb loin chops', sub: 'Lamb', kw: 'lamb loin chops tbone grilled', form: 'piece', cook: 'grilled', role: 'main', n: 2, w: 124, h: 78, side: { s: 'slab', h: 18, c: LAMB }, draw: function (P, rnd) { return P.g(P.at(-30, -6, -8), loinChop(P, rnd)) + P.g(P.at(32, 0, 12), loinChop(P, rnd)); } },
    { id: 'lamb-kofta', name: 'Lamb koftas on a skewer', sub: 'Lamb', kw: 'kofta kofte lamb mince skewer grilled', form: 'skewer', cook: 'grilled', role: 'main', n: 1, w: 154, h: 22, side: { s: 'stick', h: 18, c: '#7A4626' }, draw: skewer({ len: 148, pieces: koftaPieces }) },
    { id: 'kafta-skewer', name: 'Kafta skewer', sub: 'Lamb', kw: 'kafta kefta lebanese mince skewer parsley flat', form: 'skewer', cook: 'grilled', role: 'main', n: 1, w: 176, h: 26, side: { s: 'stick', h: 16, c: '#7E4A2A' }, draw: skewer({ len: 160, flat: true, pieces: kaftaPieces }) },
    { id: 'lamb-shank', name: 'Lamb shank', sub: 'Lamb', kw: 'lamb shank braised slow cooked bone', form: 'piece', cook: 'braised', role: 'main', g: 450, w: 128, h: 68, side: { s: 'mound', h: 50, c: '#5A2A16' }, draw: shank },
    { id: 'roast-lamb-slices', name: 'Roast lamb, sliced', sub: 'Lamb', kw: 'roast lamb leg sliced pink herb crust carvery', form: 'slices', cook: 'roasted', role: 'main', g: 180, w: 114, h: 70, side: { s: 'layer', h: 8, c: '#D9867A' }, draw: function (P, rnd) { var o = { crust: '#6E4020', band: '#A8786A', core: '#D9867A', seam: '#F0DCC8', herb: true }, out = ''; [[-30, -14], [-10, -5], [10, 4], [30, 13]].forEach(function (p) { out += P.g(P.at(p[0], p[1], -12), roastSlice(P, rnd, 26, 18, o)); }); return out; } },
    // pork
    { id: 'pork-belly', name: 'Pork belly slab', sub: 'Pork', kw: 'pork belly crackling roast', form: 'piece', cook: 'roasted', role: 'main', g: 200, w: 64, h: 44, side: { s: 'slab', h: 30, c: '#E3B262' }, draw: belly({}) },
    { id: 'pork-belly-bites', name: 'Pork belly bites', sub: 'Pork', kw: 'pork belly bites cubes crackling sticky', form: 'pile', cook: 'roasted', role: 'main', n: 6, w: 80, h: 56, side: { s: 'pile', h: 24, c: '#D9A04A' }, draw: bellyBites },
    { id: 'pork-chop', name: 'Pork chop', sub: 'Pork', kw: 'pork cutlet chop bone in cutlet grilled', form: 'piece', cook: 'grilled', role: 'main', g: 300, w: 116, h: 78, side: { s: 'slab', h: 20, c: '#C98A4A' }, draw: porkChop },
    { id: 'pork-schnitzel', name: 'Pork schnitzel', sub: 'Pork', kw: 'schnitty schnitzel crumbed pork', form: 'piece', cook: 'crumbed', role: 'main', g: 250, w: 136, h: 96, of: 'chicken-schnitzel', side: { s: 'slab', h: 8, c: '#E2B266' }, draw: crumbed({ rx: 66, ry: 46, col: '#E2B266' }) },
    { id: 'pulled-pork', name: 'Pulled pork', sub: 'Pork', kw: 'pulled pork shredded smoked bbq shoulder', form: 'pile', cook: 'smoked', role: 'main', g: 150, w: 74, h: 58, side: { s: 'pile', h: 24, c: '#D9A86A' }, draw: pulled(shredPork) },
    { id: 'pork-ribs', name: 'Pork ribs', sub: 'Pork', kw: 'pork ribs rack sticky bbq glazed baby back spare ribs', form: 'piece', cook: 'smoked', role: 'main', g: 600, w: 148, h: 84, side: { s: 'slab', h: 30, c: '#7A2E1A' }, draw: ribs({}) },
    { id: 'kbbq-pork-belly', name: 'Korean BBQ pork belly', sub: 'Pork', kw: 'samgyeopsal korean bbq pork belly slices strips grilled', form: 'slices', cook: 'grilled', role: 'main', g: 200, w: 108, h: 80, side: { s: 'layer', h: 6, c: '#C98A52' }, draw: kbbq },
    { id: 'sausage', name: 'Sausage, grilled', sub: 'Pork', kw: 'snag banger thick sausage', form: 'piece', cook: 'grilled', role: 'main', n: 1, w: 70, h: 15, side: { s: 'stick', h: 15, c: '#A34A26' }, draw: sausage({}) },
    { id: 'sausage-sliced', name: 'Sausage, sliced', sub: 'Pork', kw: 'snag sausage sliced coins rounds', form: 'pile', cook: 'grilled', role: 'main', n: 9, w: 74, h: 44, side: { s: 'pile', h: 10, c: '#8E3E1E' }, draw: sausageSliced({}) },
    { id: 'chorizo-sliced', name: 'Chorizo, sliced', sub: 'Pork', kw: 'chorizo sliced grilled spanish sausage', form: 'pile', cook: 'grilled', role: 'main', n: 9, w: 74, h: 44, of: 'sausage-sliced', side: { s: 'pile', h: 10, c: '#8E2A1A' }, draw: sausageSliced({ skin: '#8E2A1A', inside: '#C0442E' }) },
    { id: 'chipolatas', name: 'Chipolatas', sub: 'Pork', kw: 'chipolata thin sausages snags breakfast', form: 'piece', cook: 'grilled', role: 'main', n: 3, w: 66, h: 44, side: { s: 'stick', h: 11, c: '#B5583A' }, draw: chipolatas },
    { id: 'pork-knuckle', name: 'Pork knuckle', sub: 'Pork', kw: 'pork knuckle hock schweinshaxe crackling crispy', form: 'whole', cook: 'roasted', role: 'main', g: 1100, w: 136, h: 98, side: { s: 'mound', h: 80, c: '#D49444' }, draw: knuckle },
    { id: 'ham-leg-slice', name: 'Leg ham, sliced', sub: 'Pork', kw: 'ham leg glazed christmas ham slice off the bone', form: 'slices', cook: 'baked', role: 'main', g: 150, w: 112, h: 76, side: { s: 'layer', h: 4, c: '#E8A3A0' }, draw: hamSlice },
    { id: 'pork-tenderloin-medallions', name: 'Pork tenderloin, sliced medallions', sub: 'Pork', kw: 'pork tenderloin pork fillet medallions sliced roast pork loin fillet', form: 'slices', cook: 'roasted', role: 'main', g: 180, w: 104, h: 42, side: { s: 'slab', h: 12, c: '#F0D0BC' }, draw: function (P) { return shingle(P, 6, 14, function (i) { return P.g(P.at(0, 0, i % 2 ? 6 : -4), porkMedal(P, 15, 16.5)); }, { arc: 0.6 }); } },
    { id: 'pork-loin-roast', name: 'Pork loin, roast slices', sub: 'Pork', kw: 'pork loin roast pork sliced carvery crackling rind on boneless loin', form: 'slices', cook: 'roasted', role: 'main', g: 180, w: 112, h: 72, side: { s: 'layer', h: 8, c: '#F0DCC8' }, draw: function (P, rnd) { return [[-24, -12, -10], [0, 0, -4], [24, 12, 2]].map(function (p) { return P.g(P.at(p[0], p[1], p[2]), loinSlice(P, rnd)); }).join(''); } },
    { id: 'ham-hock', name: 'Ham hock, smoked', sub: 'Pork', kw: 'ham hock smoked hock pork hock braised whole', form: 'whole', cook: 'braised', role: 'main', g: 900, w: 128, h: 84, side: { s: 'mound', h: 60, c: '#8E4426' }, draw: hamHock },
    { id: 'bacon', name: 'Bacon rasher', sub: 'Pork', kw: 'bacon rasher streaky middle', form: 'piece', cook: 'fried', role: 'topping', n: 1, w: 80, h: 18, side: { s: 'layer', h: 4, c: '#B5503F' }, draw: rasher },
    { id: 'bacon-bits', name: 'Bacon bits', sub: 'Pork', kw: 'bacon bits lardons diced bacon pieces speck', form: 'scatter', cook: 'fried', role: 'topping', g: 30, w: 70, h: 46, side: { s: 'pile', h: 6, c: '#B5503F' }, draw: function (P, rnd) { return P.scatter(rnd, 16, 28, 16, function (x, y, i, q) { return BITS.bacon(P, q, x, y); }); } },
    { id: 'crackling', name: 'Crackling shards', sub: 'Pork', kw: 'crackling crackle pork rind chicharron shards', form: 'shard', cook: 'roasted', role: 'topping', g: 40, w: 76, h: 52, side: { s: 'pile', h: 12, c: '#E3B262' }, draw: shards },
    // chicken
    { id: 'chicken-breast', name: 'Chicken breast, grilled', sub: 'Chicken', kw: 'chicken breast fillet grilled chargrilled', form: 'piece', cook: 'grilled', role: 'main', g: 200, w: 124, h: 58, side: { s: 'slab', h: 22, c: '#D9A050' }, draw: breast },
    { id: 'chicken-breast-sliced', name: 'Chicken breast, sliced', sub: 'Chicken', kw: 'chicken breast sliced grilled', form: 'slices', cook: 'grilled', role: 'main', g: 200, w: 140, h: 60, side: { s: 'slab', h: 16, c: '#F4E6CC' }, draw: slicedBreast },
    { id: 'chicken-thigh', name: 'Chicken thigh, grilled', sub: 'Chicken', kw: 'chicken thigh fillet grilled chargrilled', form: 'piece', cook: 'grilled', role: 'main', n: 1, w: 84, h: 64, side: { s: 'slab', h: 14, c: '#C98A3A' }, draw: thigh },
    { id: 'crumbed-chicken-thigh', name: 'Crumbed chicken thigh', sub: 'Chicken', kw: 'crumbed chicken thigh panko katsu', form: 'piece', cook: 'crumbed', role: 'main', n: 1, w: 92, h: 68, side: { s: 'slab', h: 18, c: '#D9A04A' }, draw: crumbedThigh },
    { id: 'chicken-schnitzel', name: 'Chicken schnitzel', sub: 'Chicken', kw: 'schnitty schnitzel crumbed chicken breast', form: 'piece', cook: 'crumbed', role: 'main', g: 250, w: 136, h: 96, side: { s: 'slab', h: 9, c: C.golden }, draw: crumbed({ rx: 66, ry: 46 }) },
    { id: 'southern-fried-chicken', name: 'Southern fried chicken fillet', sub: 'Chicken', kw: 'southern fried chicken fillet crispy buttermilk fried', form: 'piece', cook: 'fried', role: 'main', n: 1, w: 104, h: 64, side: { s: 'slab', h: 20, c: '#C9872F' }, draw: function (P, rnd) { return craggy(P, rnd, 50, 30, '#C9872F'); } },
    { id: 'chicken-nuggets', name: 'Chicken nuggets', sub: 'Chicken', kw: 'nuggets chicken nuggies kids', form: 'pile', cook: 'crumbed', role: 'main', n: 6, w: 82, h: 60, side: { s: 'pile', h: 16, c: C.golden }, draw: function (P, rnd) { return P.pile(rnd, 6, 26, 17, function (x, y, i, q) { return P.g(P.at(x, y, q() * 360), nugget(P, q, 15, 12, i % 2 ? C.golden : '#D9A04A')); }); } },
    { id: 'chicken-tenders', name: 'Chicken tenders', sub: 'Chicken', kw: 'tenders tenderloins strips crispy fried chicken', form: 'pile', cook: 'fried', role: 'main', n: 3, w: 86, h: 62, side: { s: 'pile', h: 16, c: '#C9872F' }, draw: function (P, rnd) { return P.g(P.at(0, -18, -6), craggy(P, rnd, 38, 11, '#C9872F', 16)) + P.g(P.at(4, 0, 4), craggy(P, rnd, 38, 11, '#D08E36', 16)) + P.g(P.at(-2, 18, -3), craggy(P, rnd, 37, 11, '#C9872F', 16)); } },
    { id: 'karaage', name: 'Karaage chicken', sub: 'Chicken', kw: 'karaage japanese fried chicken bites popcorn chicken', form: 'pile', cook: 'fried', role: 'main', g: 180, w: 80, h: 64, side: { s: 'pile', h: 26, c: '#B9732E' }, draw: function (P, rnd) { return P.pile(rnd, 7, 26, 20, function (x, y, i, q) { return P.g(P.at(x, y, q() * 360), craggy(P, q, 13, 11, i % 2 ? '#B9732E' : '#C4823A', 9)); }); } },
    { id: 'chicken-wings', name: 'Chicken wings', sub: 'Chicken', kw: 'wings buffalo hot wings bbq wings drumettes', form: 'pile', cook: 'fried', role: 'main', n: 6, w: 104, h: 78, side: { s: 'pile', h: 24, c: '#B5502A' }, draw: wings({}) },
    { id: 'chicken-wings-soy', name: 'Chicken wings, honey soy', sub: 'Chicken', kw: 'wings honey soy sticky sesame korean', form: 'pile', cook: 'fried', role: 'main', n: 6, w: 104, h: 78, of: 'chicken-wings', side: { s: 'pile', h: 24, c: '#8A4A20' }, draw: wings({ col: '#8A4A20', seeds: true }) },
    { id: 'drumsticks', name: 'Chicken drumsticks', sub: 'Chicken', kw: 'drumstick drummies chicken legs roast', form: 'pile', cook: 'roasted', role: 'main', n: 2, w: 98, h: 64, side: { s: 'pile', h: 30, c: '#C98A3A' }, draw: function (P, rnd) { return drum(P, -4, -13, 8, 64, 34, '#C98A3A', rnd) + drum(P, 4, 14, 188, 64, 34, '#C98A3A', rnd); } },
    { id: 'chicken-kiev', name: 'Chicken kiev, cut', sub: 'Chicken', kw: 'kiev kyiv garlic butter crumbed chicken', form: 'piece', cook: 'crumbed', role: 'main', n: 1, w: 110, h: 66, side: { s: 'slab', h: 40, c: '#D49B55' }, draw: kiev },
    { id: 'roast-chicken', name: 'Roast chicken, whole', sub: 'Chicken', kw: 'roast chook whole chicken rotisserie bbq chicken', form: 'whole', cook: 'roasted', role: 'main', g: 1600, w: 160, h: 112, side: { s: 'mound', h: 70, c: '#D4943E' }, draw: bird({ part: 'whole', herb: true }) },
    { id: 'roast-chicken-half', name: 'Roast chicken, half', sub: 'Chicken', kw: 'half chicken roast chook rotisserie', form: 'half', cook: 'roasted', role: 'main', g: 700, w: 158, h: 66, side: { s: 'mound', h: 50, c: '#D4943E' }, draw: bird({ part: 'half', herb: true }) },
    { id: 'roast-chicken-quarter', name: 'Roast chicken, quarter', sub: 'Chicken', kw: 'quarter chicken leg quarter maryland roast chook', form: 'portion', cook: 'roasted', role: 'main', g: 350, w: 120, h: 64, side: { s: 'mound', h: 34, c: '#D4943E' }, draw: bird({ part: 'quarter' }) },
    { id: 'chicken-supreme', name: 'Chicken supreme', sub: 'Chicken', kw: 'supreme airline chicken breast wing bone frenched skin on', form: 'piece', cook: 'roasted', role: 'main', g: 220, w: 128, h: 56, side: { s: 'slab', h: 28, c: '#D9A050' }, draw: supreme },
    { id: 'charcoal-chicken', name: 'Charcoal chicken, whole', sub: 'Chicken', kw: 'charcoal chicken flattened butterflied spatchcock charcoal chook', form: 'whole', cook: 'grilled', role: 'main', g: 1400, w: 168, h: 142, side: { s: 'mound', h: 34, c: '#B5682E' }, draw: flatBird({ skin: '#B5682E', char: true }) },
    { id: 'charcoal-chicken-half', name: 'Charcoal chicken, half', sub: 'Chicken', kw: 'charcoal chicken half chook', form: 'half', cook: 'grilled', role: 'main', g: 650, w: 158, h: 66, of: 'roast-chicken-half', side: { s: 'mound', h: 40, c: '#B5682E' }, draw: bird({ part: 'half', skin: '#B5682E', char: true }) },
    { id: 'charcoal-chicken-quarter', name: 'Charcoal chicken, quarter', sub: 'Chicken', kw: 'charcoal chicken quarter leg chook', form: 'portion', cook: 'grilled', role: 'main', g: 330, w: 120, h: 64, of: 'roast-chicken-quarter', side: { s: 'mound', h: 30, c: '#B5682E' }, draw: bird({ part: 'quarter', skin: '#B5682E', char: true }) },
    { id: 'piri-piri-chicken', name: 'Piri piri chicken', sub: 'Chicken', kw: 'piri piri peri peri portuguese chicken chilli flattened charcoal nandos', form: 'whole', cook: 'grilled', role: 'main', g: 1400, w: 168, h: 142, of: 'charcoal-chicken', side: { s: 'mound', h: 34, c: '#C9502A' }, draw: flatBird({ skin: '#C9502A', char: true, chilli: true }) },
    { id: 'chicken-roulade', name: 'Chicken roulade, sliced', sub: 'Chicken', kw: 'roulade ballotine rolled stuffed chicken spinach sliced', form: 'slices', cook: 'roasted', role: 'main', n: 3, w: 112, h: 46, side: { s: 'slab', h: 12, c: '#F4E8D0' }, draw: roulade },
    { id: 'yiros-meat', name: 'Yiros meat, shaved', sub: 'Chicken', kw: 'yiros gyros yeeros doner kebab souvlaki shawarma shaved meat lamb chicken', form: 'pile', cook: 'roasted', role: 'main', g: 150, w: 84, h: 62, side: { s: 'pile', h: 20, c: '#A8642E' }, draw: shavings({ rx: 36, ry: 26, col: '#B9783A' }) },
    { id: 'chicken-tawook', name: 'Chicken tawook skewer', sub: 'Chicken', kw: 'tawook shish taouk chicken skewer kebab garlic lebanese', form: 'skewer', cook: 'grilled', role: 'main', n: 1, w: 160, h: 26, side: { s: 'stick', h: 20, c: '#E0A040' }, draw: skewer({ len: 156, pieces: chunks({ k: 6, gap: 21, col: '#E0A040', char: '#7A4418', onion: true }) }) },
    { id: 'crispy-skin-chicken', name: 'Crispy skin chicken, chopped', sub: 'Chicken', kw: 'crispy skin chicken cantonese chopped fried chicken half', form: 'half', cook: 'fried', role: 'main', g: 600, w: 162, h: 66, side: { s: 'mound', h: 36, c: '#D99A3A' }, draw: bird({ part: 'half', skin: '#D99A3A', chop: true, crackle: true }) },
    { id: 'chicken-livers', name: 'Chicken livers, pan fried', sub: 'Chicken', kw: 'chicken livers liver pan fried seared offal pate', form: 'pile', cook: 'fried', role: 'main', g: 150, w: 64, h: 54, side: { s: 'pile', h: 14, c: '#7A3626' }, draw: livers },
    // parmy
    { id: 'parmy', name: 'Chicken parmy', sub: 'Parmy', kw: 'parmigiana parma parmi schnitzel napoli cheese', form: 'piece', cook: 'crumbed', role: 'main', g: 300, w: 136, h: 96, side: { s: 'slab', h: 14, c: C.golden }, draw: parmy(['napoli', 'cheese']) },
    { id: 'parmy-ham', name: 'Parmy with ham', sub: 'Parmy', kw: 'parmigiana ham napoli cheese classic', form: 'piece', cook: 'crumbed', role: 'main', g: 330, w: 136, h: 96, of: 'parmy', side: { s: 'slab', h: 15, c: C.golden }, draw: parmy(['napoli', 'ham', 'cheese']) },
    { id: 'parmy-mexican', name: 'Mexican parmy', sub: 'Parmy', kw: 'parmigiana mexican jalapeno salsa sour cream guacamole', form: 'piece', cook: 'crumbed', role: 'main', g: 360, w: 136, h: 96, of: 'parmy', side: { s: 'slab', h: 18, c: C.golden }, draw: parmy(['napoli', 'cheese', 'salsa', 'jalapeno', 'guac', 'sourcream']) },
    { id: 'parmy-hawaiian', name: 'Hawaiian parmy', sub: 'Parmy', kw: 'parmigiana hawaiian ham pineapple', form: 'piece', cook: 'crumbed', role: 'main', g: 360, w: 136, h: 96, of: 'parmy', side: { s: 'slab', h: 16, c: C.golden }, draw: parmy(['napoli', 'ham', 'cheese', 'pineapple']) },
    { id: 'parmy-aussie', name: 'Aussie parmy', sub: 'Parmy', kw: 'parmigiana aussie bacon egg', form: 'piece', cook: 'crumbed', role: 'main', g: 380, w: 136, h: 96, of: 'parmy', side: { s: 'slab', h: 18, c: C.golden }, draw: parmy(['napoli', 'cheese', 'bacon', 'egg']) },
    { id: 'parmy-mariner', name: 'Mariner parmy', sub: 'Parmy', kw: 'parmigiana mariner surf prawns hollandaise seafood', form: 'piece', cook: 'crumbed', role: 'main', g: 380, w: 136, h: 96, of: 'parmy', side: { s: 'slab', h: 18, c: C.golden }, draw: parmy(['napoli', 'cheese', 'prawns', 'hollandaise']) },
    { id: 'parmy-bbq-brisket', name: 'BBQ brisket parmy', sub: 'Parmy', kw: 'parmigiana bbq brisket barbecue smoked', form: 'piece', cook: 'crumbed', role: 'main', g: 380, w: 136, h: 96, of: 'parmy', side: { s: 'slab', h: 18, c: C.golden }, draw: parmy(['bbqbase', 'cheese', 'brisket', 'bbq']) },
    { id: 'parmy-french', name: 'French parmy', sub: 'Parmy', kw: 'parmigiana french brie', form: 'piece', cook: 'crumbed', role: 'main', g: 360, w: 136, h: 96, of: 'parmy', side: { s: 'slab', h: 16, c: C.golden }, draw: parmy(['napoli', 'cheese', 'brie']) },
    { id: 'parmy-meat-lovers', name: 'Meat lovers parmy', sub: 'Parmy', kw: 'parmigiana meat lovers pepperoni sausage bacon bbq', form: 'piece', cook: 'crumbed', role: 'main', g: 400, w: 136, h: 96, of: 'parmy', side: { s: 'slab', h: 18, c: C.golden }, draw: parmy(['napoli', 'cheese', 'pepperoni', 'sausage', 'bacon', 'bbq']) },
    { id: 'pork-parmy', name: 'Pork parmy', sub: 'Parmy', kw: 'parmigiana pork schnitzel napoli cheese', form: 'piece', cook: 'crumbed', role: 'main', g: 320, w: 136, h: 96, of: 'parmy', side: { s: 'slab', h: 14, c: '#E2B266' }, draw: parmy(['napoli', 'cheese'], { col: '#E2B266' }) },
    { id: 'eggplant-parmy', name: 'Eggplant parmy', sub: 'Parmy', kw: 'eggplant parmigiana aubergine vegetarian crumbed napoli cheese', form: 'piece', cook: 'crumbed', role: 'main', g: 300, w: 134, h: 66, side: { s: 'slab', h: 16, c: '#D9A050' }, draw: eggplantParmy },
    // duck and game
    { id: 'duck-breast-fan', name: 'Duck breast, sliced', sub: 'Duck and game', kw: 'duck breast magret sliced pink crispy skin fan', form: 'fan', cook: 'roasted', role: 'main', g: 180, w: 94, h: 58, side: { s: 'slab', h: 12, c: '#C4505A' }, draw: function (P, rnd) { return P.fan(7, 64, 56, function (x, y, a) { return P.g(P.at(x, y - 4, a), slice(P, 12, 44, { crust: '#9A5A2A', top: [['#8A4A20', 3], [FAT, 4]], band: '#A84650', bw: 1.6, core: '#C4505A' }, rnd)); }); } },
    { id: 'confit-duck-leg', name: 'Confit duck leg', sub: 'Duck and game', kw: 'duck leg confit crispy skin', form: 'piece', cook: 'roasted', role: 'main', n: 1, w: 116, h: 60, side: { s: 'mound', h: 30, c: '#A8642A' }, draw: confitLeg },
    { id: 'peking-duck-pancakes', name: 'Peking duck pancakes', sub: 'Duck and game', kw: 'peking duck pancakes rolled hoisin cucumber shallot', form: 'stick', cook: 'roasted', role: 'main', n: 2, w: 94, h: 58, side: { s: 'stick', h: 18, c: '#F3E6CC' }, draw: pekingRolls },
    { id: 'roast-duck-pieces', name: 'Roast duck, chopped', sub: 'Duck and game', kw: 'cantonese roast duck chopped lacquered chinese bbq duck', form: 'pile', cook: 'roasted', role: 'main', g: 250, w: 104, h: 50, side: { s: 'pile', h: 20, c: '#7E3218' }, draw: duckPieces },
    { id: 'quail', name: 'Quail, spatchcocked', sub: 'Duck and game', kw: 'quail spatchcock butterflied grilled skewered', form: 'whole', cook: 'grilled', role: 'main', n: 1, w: 86, h: 72, side: { s: 'mound', h: 24, c: '#A85A2A' }, draw: flatBird({ skin: '#A85A2A', char: true, s: 0.48, skewers: true }) },
    { id: 'roast-turkey-breast', name: 'Roast turkey breast, sliced', sub: 'Duck and game', kw: 'roast turkey breast sliced christmas carvery roast turkey', form: 'slices', cook: 'roasted', role: 'main', g: 150, w: 104, h: 76, side: { s: 'layer', h: 6, c: '#F0E0C4' }, draw: function (P, rnd) { return P.g(P.at(-16, -12, -10), turkeySlice(P, rnd, 34, 23)) + P.g(P.at(18, -2, 8), turkeySlice(P, rnd, 32, 22)) + P.g(P.at(-6, 14, 3), turkeySlice(P, rnd, 32, 21)); } },
    { id: 'rabbit-leg-braised', name: 'Rabbit leg, braised', sub: 'Duck and game', kw: 'rabbit leg braised hind leg game slow cooked', form: 'piece', cook: 'braised', role: 'main', n: 1, w: 104, h: 48, side: { s: 'mound', h: 24, c: '#A2683E' }, draw: rabbitLeg },
    { id: 'kangaroo-loin', name: 'Kangaroo loin, sliced', sub: 'Duck and game', kw: 'kangaroo roo loin fillet sliced rare game native', form: 'slices', cook: 'grilled', role: 'main', g: 180, w: 104, h: 42, side: { s: 'slab', h: 10, c: '#6E1620' }, draw: function (P) { return shingle(P, 7, 12.5, function (i) { return P.g(P.at(0, 0, i % 2 ? 6 : -4), medal(P, 13, 15.5, { crust: '#2A160E', band: '#4E1418', core: '#6E1620' })); }, { arc: 0.6 }); } },
    { id: 'lamb-backstrap', name: 'Lamb backstrap, sliced', sub: 'Lamb', kw: 'lamb backstrap loin sliced pink', form: 'slices', cook: 'grilled', role: 'main', g: 180, w: 104, h: 42, of: 'kangaroo-loin', side: { s: 'slab', h: 10, c: '#D27A6E' }, draw: function (P) { return shingle(P, 7, 12.5, function (i) { return P.g(P.at(0, 0, i % 2 ? 6 : -4), medal(P, 13, 15.5, { crust: '#6B4420', band: '#A0705E', core: '#D27A6E' })); }, { arc: 0.6 }); } },
    { id: 'kangaroo-satay', name: 'Kangaroo satay skewer', sub: 'Duck and game', kw: 'kangaroo roo satay skewer peanut sauce', form: 'skewer', cook: 'grilled', role: 'main', n: 1, w: 144, h: 26, side: { s: 'stick', h: 18, c: '#4A1A16' }, draw: skewer({ len: 140, pieces: chunks({ k: 5, gap: 19, col: '#4A1A16', char: '#1E0C08', satay: true }) }) },
    { id: 'chicken-satay', name: 'Chicken satay skewer', sub: 'Chicken', kw: 'chicken satay skewer peanut sauce sate', form: 'skewer', cook: 'grilled', role: 'main', n: 1, w: 144, h: 26, of: 'kangaroo-satay', side: { s: 'stick', h: 18, c: '#D9A050' }, draw: skewer({ len: 140, pieces: chunks({ k: 5, gap: 19, col: '#D9A050', char: '#7A4418', satay: true }) }) },
    { id: 'crocodile-bites', name: 'Crocodile bites', sub: 'Duck and game', kw: 'crocodile croc bites game native pale grilled', form: 'pile', cook: 'grilled', role: 'main', n: 7, w: 80, h: 60, side: { s: 'pile', h: 18, c: '#EFE4CC' }, draw: crocBites },
    { id: 'venison-medallions', name: 'Venison medallions', sub: 'Duck and game', kw: 'venison deer medallions game seared rare', form: 'piece', cook: 'grilled', role: 'main', n: 3, w: 118, h: 50, side: { s: 'disc', h: 26, c: '#3A2216' }, draw: venison },
    // deli
    { id: 'prosciutto', name: 'Prosciutto', sub: 'Deli', kw: 'prosciutto parma ham jamon cured ham draped', form: 'layer', cook: 'cured', role: 'topping', g: 40, w: 96, h: 66, side: { s: 'layer', h: 6, c: '#C64F57' }, draw: prosciutto },
    { id: 'salami-slices', name: 'Salami, sliced', sub: 'Deli', kw: 'salami sopressa hungarian deli sliced', form: 'slices', cook: 'cured', role: 'topping', g: 50, w: 110, h: 50, side: { s: 'layer', h: 4, c: '#A8303A' }, draw: salami({}) },
    { id: 'pepperoni', name: 'Pepperoni, sliced', sub: 'Deli', kw: 'pepperoni cupped pizza topping sliced', form: 'scatter', cook: 'baked', role: 'topping', n: 7, w: 92, h: 48, side: { s: 'layer', h: 4, c: '#C0402A' }, draw: pepperoni },
    { id: 'frankfurt', name: 'Frankfurt', sub: 'Deli', kw: 'frankfurt frankfurter hot dog sav saveloy wiener', form: 'piece', cook: 'steamed', role: 'main', n: 1, w: 102, h: 24, side: { s: 'stick', h: 15, c: '#C9503A' }, draw: frankfurt },
    { id: 'kabana', name: 'Kabana', sub: 'Deli', kw: 'kabana cabanossi kabanos smoked sausage sticks', form: 'stick', cook: 'smoked', role: 'main', n: 3, w: 62, h: 34, side: { s: 'stick', h: 9, c: '#7A2A1E' }, draw: kabana },
    { id: 'terrine-slice', name: 'Terrine slice', sub: 'Deli', kw: 'terrine pate en croute pork terrine pistachio slice', form: 'slices', cook: 'baked', role: 'main', n: 1, w: 70, h: 46, side: { s: 'slab', h: 10, c: '#D9A894' }, draw: terrine },
    { id: 'shaved-ham', name: 'Shaved ham', sub: 'Deli', kw: 'shaved ham leg ham deli sandwich', form: 'pile', cook: 'smoked', role: 'topping', g: 80, w: 82, h: 60, side: { s: 'pile', h: 18, c: '#EBA9A4' }, draw: shavedHam },
    // curries and braises (the contents of a bowl, to sit inside a bowl surface)
    { id: 'curry-red-beef', name: 'Red curry, beef', sub: 'Curries and braises', kw: 'red curry thai beef coconut bamboo basil', form: 'bowlful', cook: 'braised', role: 'main', g: 350, w: 140, h: 140, side: { s: 'sauce', h: 18, c: '#C9562E' }, draw: curry({ sauce: '#C9562E', oil: '#E0602A', bits: [['beefslice', 9], ['bamboo', 5], ['capsicum', 3]], garnish: [['basil', 5], ['chilli', 4], ['kaffir', 5]] }) },
    { id: 'curry-green-chicken', name: 'Green curry, chicken', sub: 'Curries and braises', kw: 'green curry thai chicken coconut pea eggplant basil', form: 'bowlful', cook: 'braised', role: 'main', g: 350, w: 140, h: 140, side: { s: 'sauce', h: 18, c: '#A9B85E' }, draw: curry({ sauce: '#A9B85E', oil: '#C8C060', bits: [['chicken', 8], ['peaegg', 6], ['bamboo', 4]], garnish: [['basil', 5], ['chilli', 4]] }) },
    { id: 'curry-yellow-chicken', name: 'Yellow curry, chicken', sub: 'Curries and braises', kw: 'yellow curry chicken potato thai coconut', form: 'bowlful', cook: 'braised', role: 'main', g: 350, w: 140, h: 140, side: { s: 'sauce', h: 18, c: '#E2A93A' }, draw: curry({ sauce: '#E2A93A', bits: [['chicken', 7], ['potato', 5], ['onion', 4]], garnish: [['shallot', 9], ['coriander', 4]] }) },
    { id: 'curry-butter-chicken', name: 'Butter chicken', sub: 'Curries and braises', kw: 'butter chicken murgh makhani tikka masala indian curry', form: 'bowlful', cook: 'braised', role: 'main', g: 350, w: 140, h: 140, side: { s: 'sauce', h: 18, c: '#E07A3A' }, draw: curry({ sauce: '#E07A3A', oil: '#F0A040', bits: [['tandoori', 10]], garnish: [['cream', 1, -6, 4], ['coriander', 5]] }) },
    { id: 'curry-massaman-beef', name: 'Massaman beef curry', sub: 'Curries and braises', kw: 'massaman beef curry potato peanut thai', form: 'bowlful', cook: 'braised', role: 'main', g: 380, w: 140, h: 140, side: { s: 'sauce', h: 20, c: '#B9772E' }, draw: curry({ sauce: '#B9772E', bits: [['beef', 7], ['potato', 5], ['onion', 3]], garnish: [['peanut', 10], ['shallot', 6], ['coriander', 3]] }) },
    { id: 'curry-lamb', name: 'Lamb curry', sub: 'Curries and braises', kw: 'lamb curry rogan josh korma indian', form: 'bowlful', cook: 'braised', role: 'main', g: 350, w: 140, h: 140, side: { s: 'sauce', h: 18, c: '#9E3B22' }, draw: curry({ sauce: '#9E3B22', oil: '#C9562E', bits: [['lamb', 10], ['onion', 3]], garnish: [['yoghurt', 1, 14, -10], ['coriander', 6]] }) },
    { id: 'curry-beef-rendang', name: 'Beef rendang', sub: 'Curries and braises', kw: 'rendang beef curry dry malaysian indonesian coconut', form: 'bowlful', cook: 'braised', role: 'main', g: 350, w: 140, h: 140, side: { s: 'mound', h: 24, c: '#5E2A12' }, draw: curry({ sauce: '#5A2A12', dry: true, r: 62, bits: [['rendang', 11]], garnish: [['coconut', 30], ['kaffir', 6], ['chilli', 3]] }) },
    { id: 'beef-bourguignon', name: 'Beef bourguignon', sub: 'Curries and braises', kw: 'beef bourguignon stew casserole red wine braise mushroom', form: 'bowlful', cook: 'braised', role: 'main', g: 380, w: 140, h: 140, side: { s: 'sauce', h: 20, c: '#5A2018' }, draw: curry({ sauce: '#5A2018', bits: [['beef', 7], ['carrot', 5], ['mushroom', 4], ['pearl', 4], ['bacon', 5]], garnish: [['parsley', 16]] }) },
    { id: 'osso-buco', name: 'Osso buco', sub: 'Curries and braises', kw: 'osso buco veal shank braised marrow gremolata', form: 'piece', cook: 'braised', role: 'main', g: 400, w: 88, h: 80, side: { s: 'slab', h: 30, c: '#6B3418' }, draw: ossoBuco }
  ]);
  // the helpers, for the other category files that draw meat on something (burgers, pizzas, skewers, bowls)
  L.MEAT = {
    steak: steak, slicedSteak: slicedSteak, crumbed: crumbed, parmy: parmy, sausage: sausage, rasher: rasher, belly: belly,
    bone: bone, slice: slice, patty: patty, meatballs: meatballs, pulled: pulled, skewer: skewer, chunks: chunks, drum: drum, bird: bird,
    salami: salami, pepperoni: pepperoni, curry: curry, craggy: craggy, nugget: nugget, shavings: shavings
  };
})();
