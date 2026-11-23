/* The chalk layer for the tutorial videos (docs/tutorial-videos.md). Added to the book's page only while a video is
   filmed (scripts/tutorials/film.mjs), never part of the book. One SVG over the whole window that a tap passes through:
   chalk circles drawn round a control the way a chef rings something on the specials board, chalk underlines and
   arrows, and a ripple where a finger taps. window.__chalk.circle(sel), .underline(sel), .arrow(sel), .tap(x, y),
   .note(sel, words), .clear(). Everything is drawn in window coordinates, so marks are cleared before the page scrolls. */
(function () {
  if (window.__chalk) return;
  var NS = 'http://www.w3.org/2000/svg';
  var INK = { orange: '#E2602A', white: '#FBF8F1', green: '#2E8B57', ink: '#2B2A27' };
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483647;overflow:visible';
  // chalk: the stroke's edge wobbles a little (displacement) and a fine grain takes bits out of it, like chalk on a board
  svg.innerHTML = '<defs><filter id="lk-chalk" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="4" result="n"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="d"/>' +
    '<feTurbulence type="fractalNoise" baseFrequency="1.9" numOctaves="1" seed="9" result="g"/>' +
    '<feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.6" result="ga"/>' +
    '<feComposite in="d" in2="ga" operator="in"/></filter></defs>';
  function mount() { if (!svg.isConnected) document.documentElement.appendChild(svg); }
  function rectOf(t) {
    if (t && typeof t === 'object' && 'x' in t && 'width' in t && !(t instanceof Element)) return t;
    var el = typeof t === 'string' ? document.querySelector(t) : t;
    if (!el) throw new Error('chalk: nothing matches ' + t);
    return el.getBoundingClientRect();
  }
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    (parent || svg).appendChild(e);
    return e;
  }
  function seeded(n) { var s = n || 1; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  var count = 0;
  // draws a path on like a hand would: the dash runs from nothing to the whole line
  function drawOn(p, ms, delay) {
    var len = p.getTotalLength();
    p.style.strokeDasharray = len + ' ' + len;
    p.style.strokeDashoffset = len;
    return p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: ms, delay: delay || 0, easing: 'cubic-bezier(.3,.1,.25,1)', fill: 'forwards' }).finished;
  }
  function group(colour) {
    mount();
    var g = el('g', { fill: 'none', stroke: INK[colour] || colour || INK.orange, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', filter: 'url(#lk-chalk)' });
    g.classList.add('lk-mark');
    return g;
  }
  function width() { return innerWidth < 600 ? 4.6 : 4.2; }
  function pts(list) { return list.map(function (q, i) { return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' '); }

  // A loop round the control: a squarish ellipse for a wide bar, rounder for a small button, a little more than one turn
  // so the ends cross the way a hand-drawn ring does, tilted a touch, clamped inside the window.
  function circle(t, o) {
    o = o || {};
    var r = rectOf(t), pad = o.pad == null ? 7 : o.pad, rnd = seeded(++count * 7919);
    var cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    var a = Math.min(r.width / 2 + pad + 4, innerWidth / 2 - 3), b = Math.max(r.height / 2 + pad, 16);
    cx = Math.min(Math.max(cx, a + 3), innerWidth - a - 3);
    var aspect = a / b, n = Math.min(4.2, 2.3 + aspect * 0.35), e = 2 / n;
    var tilt = (rnd() - 0.5) * 0.06, start = -2.5 + rnd() * 0.4, turn = 2 * Math.PI * 1.1, steps = 90, list = [];
    for (var i = 0; i <= steps; i++) {
      var th = start + turn * i / steps, c = Math.cos(th), s = Math.sin(th);
      var grow = 0.97 + 0.08 * i / steps + 0.015 * Math.sin(th * 3 + rnd());
      var x = a * grow * Math.sign(c) * Math.pow(Math.abs(c), e), y = b * grow * Math.sign(s) * Math.pow(Math.abs(s), e);
      list.push([cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]);
    }
    var g = group(o.colour), w = o.width || width();
    var p = el('path', { d: pts(list), 'stroke-width': w }, g);
    // a fainter second stroke just off the first, the way chalk leaves a double edge
    var p2 = el('path', { d: pts(list.map(function (q, i) { return [q[0] + 1.1 * Math.sin(i / 7), q[1] + 1.1 * Math.cos(i / 9)]; })), 'stroke-width': w * 0.45, opacity: '.55' }, g);
    drawOn(p2, o.ms || 650, 40);
    return drawOn(p, o.ms || 650);
  }

  function underline(t, o) {
    o = o || {};
    var r = rectOf(t), rnd = seeded(++count * 104729), y = r.bottom + (o.gap == null ? 4 : o.gap), list = [], steps = 30;
    var x0 = r.x - 4, x1 = Math.min(r.right + 6, innerWidth - 3);
    for (var i = 0; i <= steps; i++) { var k = i / steps; list.push([x0 + (x1 - x0) * k, y + Math.sin(k * Math.PI) * 2.5 + (rnd() - 0.5) * 0.8 - k * 1.5]); }
    var g = group(o.colour), p = el('path', { d: pts(list), 'stroke-width': o.width || width() }, g);
    return drawOn(p, o.ms || 420);
  }

  // A curved chalk arrow that comes in from where there is most room and stops just short of the control.
  function arrow(t, o) {
    o = o || {};
    var r = rectOf(t), cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    var from = o.from || (cy > innerHeight / 2 ? 'above' : 'below'), len = o.len || 64, x0, y0, x1, y1, bend;
    if (from === 'left') { x1 = r.x - 6; y1 = cy; x0 = x1 - len; y0 = cy - len * 0.55; }
    else if (from === 'right') { x1 = r.right + 6; y1 = cy; x0 = x1 + len; y0 = cy - len * 0.55; }
    else if (from === 'above') { x1 = cx; y1 = r.y - 6; x0 = cx - len * 0.6; y0 = y1 - len; }
    else { x1 = cx; y1 = r.bottom + 6; x0 = cx - len * 0.6; y0 = y1 + len; }
    x0 = Math.min(Math.max(x0, 8), innerWidth - 8);
    bend = [(x0 + x1) / 2 + (y1 - y0) * 0.25, (y0 + y1) / 2 - (x1 - x0) * 0.25];
    var g = group(o.colour), w = o.width || width();
    var shaft = el('path', { d: 'M' + x0 + ' ' + y0 + ' Q' + bend[0] + ' ' + bend[1] + ' ' + x1 + ' ' + y1, 'stroke-width': w }, g);
    var ang = Math.atan2(y1 - bend[1], x1 - bend[0]), h = 13;
    var head = el('path', { d: 'M' + (x1 - h * Math.cos(ang - 0.5)) + ' ' + (y1 - h * Math.sin(ang - 0.5)) + ' L' + x1 + ' ' + y1 + ' L' + (x1 - h * Math.cos(ang + 0.5)) + ' ' + (y1 - h * Math.sin(ang + 0.5)), 'stroke-width': w }, g);
    head.style.opacity = 0;
    return drawOn(shaft, o.ms || 480).then(function () { head.style.opacity = 1; return drawOn(head, 160); });
  }

  // A few chalk words next to a control, in the book's handwriting font (Caveat).
  function note(t, words, o) {
    o = o || {};
    var r = rectOf(t), g = group(o.colour), size = o.size || (innerWidth < 600 ? 24 : 26);
    var tx = el('text', { x: 0, y: 0, 'font-family': 'Caveat, cursive', 'font-weight': 700, 'font-size': size, fill: INK[o.colour] || o.colour || INK.orange, stroke: 'none' }, g);
    tx.textContent = words;
    var bw = tx.getComputedTextLength(), side = o.side || (r.right + bw + 16 < innerWidth ? 'right' : r.x - bw - 16 > 0 ? 'left' : 'below');
    var x = side === 'right' ? r.right + 12 : side === 'left' ? r.x - bw - 12 : Math.min(Math.max(r.x, 8), innerWidth - bw - 8);
    var y = side === 'below' ? r.bottom + size + 2 : side === 'above' ? r.y - 10 : r.y + r.height / 2 + size * 0.32;
    if (side === 'above') x = Math.min(Math.max(r.x, 8), innerWidth - bw - 8);
    tx.setAttribute('x', x); tx.setAttribute('y', y);
    tx.setAttribute('transform', 'rotate(-2 ' + x + ' ' + y + ')');
    return g.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 300, fill: 'forwards' }).finished;
  }

  // Where a finger lands: a soft dot first (so the eye gets there), then a chalk ring that spreads and fades.
  function touch(x, y) {
    mount();
    var g = el('g', {}), dot = el('circle', { cx: x, cy: y, r: 17, fill: 'rgba(43,42,39,.28)', stroke: 'rgba(251,248,241,.9)', 'stroke-width': 2 }, g);
    g.classList.add('lk-tap');
    return dot.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 170, easing: 'ease-out', fill: 'forwards' }).finished.then(function () { return g; });
  }
  function release(g, x, y) {
    var ring = el('circle', { cx: x, cy: y, r: 16, fill: 'none', stroke: INK.orange, 'stroke-width': 3, filter: 'url(#lk-chalk)' }, g);
    ring.style.transformOrigin = x + 'px ' + y + 'px';
    var dot = g.firstChild;
    dot.style.transformOrigin = x + 'px ' + y + 'px';
    ring.animate([{ transform: 'scale(.6)', opacity: 1 }, { transform: 'scale(2.3)', opacity: 0 }], { duration: 650, easing: 'ease-out', fill: 'forwards' });
    return dot.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, delay: 120, fill: 'forwards' }).finished.then(function () { g.remove(); });
  }

  function clear(ms) {
    var marks = [].slice.call(svg.querySelectorAll('.lk-mark'));
    return Promise.all(marks.map(function (m) { return m.animate([{ opacity: getComputedStyle(m).opacity }, { opacity: 0 }], { duration: ms == null ? 260 : ms, fill: 'forwards' }).finished.then(function () { m.remove(); }); }));
  }

  window.__chalk = { circle: circle, underline: underline, arrow: arrow, note: note, touch: touch, release: release, clear: clear };
})();
