/* April Fools on Home: twelve designs, each in two versions (24 jokes), for review only. Each is written as one minute
   and plays at any length from 10 to 60 s (o.length), everything scaled together.
   docs/april-fools-options/brief.md. The book never loads this file.
   Every design plays on a copy of the page laid over it (.fl-layer). The real Home underneath is never touched (it is
   only made inert while the joke plays), so ending the joke is removing the copy. The copy also hides itself after
   65 s by its own CSS, even if this script stops part way. Taps make the piece under the finger break a little more;
   holding a finger down for 1.2 s, or Escape, ends it at once. FOOLS.deal() gives every person a different joke each
   year from the staff list alone. */
(function () {
  'use strict';
  var D = document, W = window;
  var S = null;
  var GL = '█▓▒░<>/\\|#$%&@!?01';
  var END = 57500, HOLD = 1200;
  var LETTERS = 'ABCDEFGHIJKL'.split('');
  var TXT = '#rtitle, .wall-date, .hm-bt, .hm-clock, .hm-t, .hm-s, .hm-day-value, .hm-tm, .hm-pt, .hm-roster-caption, .hm-rota th, .hm-tp b, .hm-pc, .hm-sn, .hm-sl, #hm-full-team > summary, .wall-foot, .tabbar a span';

  /* ---------- small helpers ---------- */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function sgn() { return Math.random() < 0.5 ? -1 : 1; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function live(s) { return !!s && S === s && !s.over; }
  function later(ms, f) { var s = S; s.t.push(setTimeout(function () { if (live(s)) f(); }, ms * s.k)); }
  function every(ms, f) { var s = S, id = setInterval(function () { if (live(s)) f(); else clearInterval(id); }, ms * s.k); s.t.push(id); return id; }
  function mk(tag, cls, parent, text) {
    var e = D.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function one(sel, root) { return (root || S.app).querySelector(sel); }
  function all(sel, root) { return Array.prototype.slice.call((root || S.app).querySelectorAll(sel)); }
  function go(e, kf, o) {
    if (!e || !e.animate) return null;
    o = Object.assign({ fill: 'forwards' }, o || {});
    var k = S ? S.k : 1;
    if (o.duration && o.duration !== Infinity) o.duration *= k;
    if (o.delay) o.delay *= k;
    return e.animate(kf, o);
  }
  function rect(e) { return e.getBoundingClientRect(); }
  function onScreen(e) { var r = rect(e); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; }
  function hhmm(m) { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
  function pad(l, r, w) { w = w || 30; var n = Math.max(1, w - l.length - r.length - 1); return l + '.'.repeat(n) + ' ' + r; }
  function first(name) { return String(name).trim().split(/\s+/)[0]; }

  /* Letters turn to noise, then settle on the new words. */
  function scramble(e, to, ms) {
    if (!e) return;
    var s = S, from = e.textContent, n = Math.max(from.length, to.length), t0 = performance.now(), dur = (ms || 600) * s.k;
    (function step() {
      if (!live(s)) return;
      var k = Math.min(1, (performance.now() - t0) / dur), cut = Math.floor(k * n), out = '';
      for (var i = 0; i < n; i++) out += i < cut ? (to[i] || '') : (Math.random() < 0.55 ? GL[Math.floor(Math.random() * GL.length)] : (from[i] || ''));
      e.textContent = k < 1 ? out : to;
      if (k < 1) requestAnimationFrame(step);
    })();
  }

  /* Types lines into e, one letter at a time, with a block cursor. */
  function typeLines(e, lines, ms, gap, done, keep) {
    var s = S, li = 0, ci = 0, cur = mk('span', 'fl-cur'), line = mk('div', 'fl-tl', e);
    line.appendChild(cur);
    (function tick() {
      if (!live(s)) return;
      if (li >= lines.length) { if (!keep) cur.remove(); if (done) done(); return; }
      var L = lines[li];
      if (ci < L.length) { cur.before(L[ci++]); s.t.push(setTimeout(tick, ms * s.k)); return; }
      li++; ci = 0;
      if (li < lines.length) { line = mk('div', 'fl-tl', e); if (!lines[li].length) line.textContent = ' '; line.appendChild(cur); }
      s.t.push(setTimeout(tick, gap * s.k));
    })();
  }

  /* His speech bubble on the copy is the page heading. */
  function bubble(t, ms) { var h = one('#rtitle'); if (!h) return; if (ms === 0) h.textContent = t; else scramble(h, t, ms || 500); }

  /* Splits the words of el into one span per letter. block: letters can move on their own. */
  function charify(el, block) {
    var out = [];
    if (!el) return out;
    var w = D.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nodes = [];
    while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(function (n) {
      if (!n.nodeValue.trim() || !n.parentNode || n.parentNode.closest('svg') || n.parentNode.classList.contains('fl-c')) return;
      var f = D.createDocumentFragment();
      Array.prototype.forEach.call(n.nodeValue, function (ch) {
        var c = mk('span', block ? 'fl-c fl-cb' : 'fl-c', null, ch);
        f.appendChild(c);
        if (ch.trim()) out.push(c);
      });
      n.parentNode.replaceChild(f, n);
    });
    return out;
  }
  function letters(block) { var out = []; all(TXT).forEach(function (e) { out = out.concat(charify(e, block)); }); return out.filter(onScreen); }

  /* The page's pieces, top to bottom: what can fall, flee, be eaten or turn away. */
  function cards() { return all('#hm-day, #hm-with, #hm-board:not([hidden]), #hm-prep, .hm-up').filter(onScreen); }
  function tops() { return all('.wtop-brand, .wtop-icons > *').filter(onScreen); }
  function tabs() { return all('.tabbar a').filter(onScreen); }
  function heads() { return [one('.mascot'), one('#rtitle'), one('.wall-date')].filter(function (e) { return e && onScreen(e); }); }
  function foot() { return all('.wall-foot').filter(onScreen); }
  function pieces() { return tops().concat(heads(), cards(), foot(), tabs()); }
  function hit(x, y) {
    var best = null, ba = Infinity;
    pieces().forEach(function (e) { var r = rect(e), a = r.width * r.height; if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom && a < ba) { best = e; ba = a; } });
    return best;
  }
  /* Puts moved pieces back where they belong, from wherever they are now. */
  function settle(list, ms) {
    (list || []).forEach(function (e) {
      if (!e) return;
      var cs = getComputedStyle(e), cur = cs.transform, op = cs.opacity;
      e.getAnimations().forEach(function (a) { a.cancel(); });
      e.style.visibility = '';
      go(e, [{ transform: cur === 'none' ? 'none' : cur, opacity: op }, { transform: 'none', opacity: 1 }], { duration: ms || 560, easing: 'cubic-bezier(.2,1.4,.4,1)' });
    });
  }

  /* ---------- the slow start: small things are wrong, so people doubt themselves ---------- */
  function typo() {
    var c = all('.hm-t, .hm-bt, .hm-pt, .hm-sn, .tabbar a span').filter(function (e) { return e.textContent.trim().length > 3 && !e.dataset.flTypo && onScreen(e); });
    var e = pick(c);
    if (!e) return;
    e.dataset.flTypo = '1';
    var t = e.textContent, i = 1 + Math.floor(Math.random() * (t.length - 2));
    e.textContent = t.slice(0, i) + t[i + 1] + t[i] + t.slice(i + 2);
  }
  function tilt(e, deg, ms) { go(e, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(' + deg + 'deg)' }], { duration: ms || 3000, easing: 'ease-in-out', composite: 'add' }); }
  function clockTo(t) { all('#hm-time, .hm-clock').forEach(function (e) { e.textContent = t; }); }
  function stare() { var m = one('.mascot'); go(m, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(-1)', offset: 0.08 }, { transform: 'scaleX(-1)', offset: 0.92 }, { transform: 'scaleX(1)' }], { duration: 2600, fill: 'none' }); }
  function flicker(e) { go(e, [{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], { duration: 260, fill: 'none' }); }
  function opening(s, lot) {
    var steps = { typo: typo, stare: stare, tilt: function () { tilt(pick(cards()), sgn() * rnd(0.8, 1.6)); }, clock: function () { clockTo(hhmm(14 * 60 + Math.floor(rnd(3, 9)))); }, flicker: function () { flicker(pick(cards())); } };
    (lot || ['typo', 'tilt', 'typo', 'clock']).forEach(function (n, i) { later(2500 + i * 2600, steps[n]); });
  }

  /* ---------- the engine: taps, hold to stop, the hint and the reveal ---------- */
  function nudge(p) {
    if (!p) return;
    go(p, [{ transform: 'translate(0px,0px) rotate(0deg)' }, { transform: 'translate(' + rnd(-14, 14).toFixed(0) + 'px,' + rnd(14, 36).toFixed(0) + 'px) rotate(' + rnd(-9, 9).toFixed(1) + 'deg)' }],
      { duration: 380, easing: 'cubic-bezier(.2,1.5,.4,1)', composite: 'add' });
  }
  function flee(p, x, y) {
    if (!p) return;
    var r = rect(p), dx = (r.left + r.width / 2) - x, dy = (r.top + r.height / 2) - y, l = Math.hypot(dx, dy) || 1, d = rnd(80, 140);
    go(p, [{ transform: 'translate(0px,0px)' }, { transform: 'translate(' + (dx / l * d).toFixed(0) + 'px,' + (dy / l * d).toFixed(0) + 'px) rotate(' + rnd(-20, 20).toFixed(0) + 'deg)' }],
      { duration: 280, easing: 'cubic-bezier(.2,1.4,.4,1)', composite: 'add' });
  }
  function hint(s) {
    if (s.hinted || !live(s)) return;
    s.hinted = true;
    var h = mk('div', 'fl-hint', s.L, 'Press and hold to stop');
    h.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'forwards' });
  }
  function holdEnd(s) { if (!s) return; clearTimeout(s.holdT); if (s.ring) { s.ring.remove(); s.ring = null; } }
  function down(e) {
    var s = S;
    e.preventDefault(); e.stopPropagation();
    if (!live(s)) return;
    holdEnd(s);
    var r = s.ring = mk('div', 'fl-hold', s.L);
    r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
    r.animate([{ transform: 'translate(-50%,-50%) scale(.25)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], { duration: HOLD, fill: 'forwards', easing: 'linear' });
    s.holdT = setTimeout(function () { if (live(s)) reveal(); }, HOLD);
    // One break a moment, however fast the taps: frantic tapping cannot stack flashes or flips.
    var now = performance.now();
    if (now - (s.lastTap || 0) < 250) return;
    s.lastTap = now;
    s.taps++;
    var p = hit(e.clientX, e.clientY);
    if (s.tap) s.tap(p, e.clientX, e.clientY); else nudge(p);
    if (s.taps >= 3) hint(s);
  }

  function pageCopy() {
    var real = D.getElementById('app');
    var L = mk('div', 'fl-layer', D.body);
    L.setAttribute('aria-hidden', 'true');
    var stage = mk('div', 'fl-stage', L), shake = mk('div', 'fl-shake', stage);
    var app = real.cloneNode(true);
    app.setAttribute('inert', '');
    app.classList.add('fl-app');
    app.style.top = (-W.scrollY) + 'px';
    shake.appendChild(app);
    // In the book the mascot is a canvas: copy his drawing too (a clone of a canvas is blank).
    var oc = real.querySelector('.mascot canvas'), cc = app.querySelector('.mascot canvas');
    if (oc && cc) { try { cc.getContext('2d').drawImage(oc, 0, 0); } catch (e) { /* no mascot in the copy */ } }
    // Nothing under the copy can be reached with a key while the joke plays. A CSS animation hides it for 65 s and
    // then ends by itself, so a script that stops part way cannot leave Home dead (the skeptic reproduced that with inert).
    real.classList.add('fl-under');
    var say = mk('div', 'fl-sr', D.body, 'An April Fools joke is playing for one minute. Press Escape, or press and hold, to stop it.');
    say.setAttribute('role', 'status');
    S.say = say;
    S.real = real; S.L = L; S.stage = stage; S.shake = shake; S.app = app;
  }
  // Ids stay on the copies: the book's styles use them. The real page comes first, so getElementById still finds it.
  function copyOf(app) {
    var c = app.cloneNode(true);
    var a = app.querySelectorAll('canvas'), b = c.querySelectorAll('canvas');
    for (var i = 0; i < a.length; i++) { try { b[i].getContext('2d').drawImage(a[i], 0, 0); } catch (e) { /* blank */ } }
    return c;
  }
  function mascotSrc() { var im = D.querySelector('#app .mascot img'); return im ? im.src : '../../../art/mascot/welcome-still.png'; }

  /* The reveal: the copy fades, the untouched Home shows through, and the mascot owns up. */
  function reveal() {
    var s = S;
    if (!s || s.revealed) return;
    s.revealed = true; s.over = true;
    s.t.forEach(clearTimeout);
    holdEnd(s);
    if (s.raf) cancelAnimationFrame(s.raf);
    if (s.real) s.real.classList.remove('fl-under');
    if (s.say) s.say.remove();
    var f = s.L.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' });
    f.onfinish = function () { s.L.remove(); };
    card(s);
  }
  function card(s) {
    var back = mk('div', 'fl-reveal', D.body);
    back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true'); back.setAttribute('aria-labelledby', 'fl-rv-h');
    var c = mk('div', 'fl-card', back);
    var m = mk('img', 'fl-rv-m', c); m.src = mascotSrc(); m.alt = ''; m.width = 96; m.height = 128;
    var h = mk('h2', '', c, 'April Fools, ' + s.name + '!'); h.id = 'fl-rv-h';
    mk('p', 'fl-rv-p', c, 'A joke for 1 April. You did nothing wrong, and nothing is broken.');
    mk('p', 'fl-rv-p', c, 'Your prep list, orders and recipes are all safe.');
    mk('p', 'fl-rv-s', c, "April Fools' Day: on 1 April people in Australia play tricks on each other until midday. This one was from the head chef.");
    var b = mk('button', 'fl-rv-b', c, 'Back to my day'); b.type = 'button';
    var done = false, t0 = performance.now();
    function close() {
      if (done) return; done = true;
      D.removeEventListener('keydown', key); W.removeEventListener('hashchange', close);
      back.remove();
      var t = D.getElementById('rtitle');
      if (t) { t.textContent = 'Got you, ' + s.name + '.'; try { t.focus({ preventScroll: true }); } catch (e) { /* no focus */ } }
      if (S === s) S = null;
    }
    function key(e) { if (e.key === 'Escape' && performance.now() - t0 > 600) close(); }
    // The tap or hold that ended the joke must not also close the card unread: nothing closes it in its first 1.5 s
    // except its own button, and only after a fresh press on it.
    b.addEventListener('click', function () { if (performance.now() - t0 > 600) close(); });
    back.addEventListener('click', function (e) { if (e.target === back && performance.now() - t0 > 1500) close(); });
    D.addEventListener('keydown', key); W.addEventListener('hashchange', close);
    c.animate([{ transform: 'scale(.6) rotate(-6deg)', opacity: 0 }, { transform: 'scale(1.04) rotate(1deg)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }],
      { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'forwards' });
    setTimeout(function () { b.focus({ preventScroll: true }); }, 60);
    s.close = close;
  }

  /* Shared closing beats: the dark, typed words, and the clue. */
  function dark(s, from, ms) { var d = mk('div', 'fl-dark', s.L); go(d, [{ opacity: 0 }, { opacity: 0.95 }], { duration: ms || 2000, easing: 'ease-in', delay: from || 0 }); return d; }
  function lift(e, ms) { if (e) go(e, [{ opacity: getComputedStyle(e).opacity }, { opacity: 0 }], { duration: ms || 500 }); }
  function typed(s, lines, cls) { var t = mk('div', 'fl-type ' + (cls || ''), s.L); typeLines(t, lines, 55, 420, null, true); return t; }
  function april(s, parent, startText, cls) {
    var c = mk('div', 'fl-april-box ' + (cls || ''), parent || s.L), code = mk('div', 'fl-code', c, '');
    typeLines(code, [startText || 'ERROR 0x0401'], 60, 0, function () {
      s.t.push(setTimeout(function () { if (!live(s)) return; code.classList.add('fl-april'); scramble(code, '1 APRIL', 600); }, 1400 * s.k));
    });
    return c;
  }

  /* ============ A · Collapse: the page cracks and falls apart, then the dark types to you ============ */
  function crack(s) {
    var w = innerWidth, h = innerHeight, NS = 'http://www.w3.org/2000/svg';
    var svg = D.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'fl-crack'); svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('width', w); svg.setAttribute('height', h);
    s.L.appendChild(svg); s.crack = svg;
    var cx = w * rnd(0.58, 0.74), cy = h * rnd(0.24, 0.34), paths = [], i, k;
    for (i = 0; i < 10; i++) {
      var ang = (i / 10) * Math.PI * 2 + rnd(-0.25, 0.25), len = Math.max(w, h) * rnd(0.45, 1.05), d = 'M' + cx.toFixed(1) + ' ' + cy.toFixed(1);
      for (k = 1; k <= 7; k++) { var a = ang + rnd(-0.2, 0.2), r = len * k / 7; d += ' L' + (cx + Math.cos(a) * r).toFixed(1) + ' ' + (cy + Math.sin(a) * r).toFixed(1); }
      paths.push(d);
    }
    for (i = 0; i < 2; i++) {
      var R = (i + 1) * rnd(20, 32), dd = '';
      for (k = 0; k <= 11; k++) { var aa = k / 11 * Math.PI * 2, rr = R * rnd(0.75, 1.25); dd += (k ? ' L' : 'M') + (cx + Math.cos(aa) * rr).toFixed(1) + ' ' + (cy + Math.sin(aa) * rr).toFixed(1); }
      paths.push(dd);
    }
    paths.forEach(function (d, j) {
      var g = D.createElementNS(NS, 'g');
      ['fl-ck-dark', 'fl-ck-light'].forEach(function (cls) { var p = D.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('class', cls); g.appendChild(p); });
      g.style.opacity = '0';
      svg.appendChild(g);
      go(g, [{ opacity: 0 }, { opacity: 1 }], { duration: 40, delay: j * 22 });
    });
    var dot = D.createElementNS(NS, 'circle'); dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); dot.setAttribute('r', 7); dot.setAttribute('class', 'fl-ck-hit'); svg.appendChild(dot);
    go(s.stage, [{ transform: 'translate(0,0)' }, { transform: 'translate(-7px,4px)' }, { transform: 'translate(6px,-5px)' }, { transform: 'translate(-3px,2px)' }, { transform: 'translate(0,0)' }], { duration: 280, fill: 'none' });
  }
  function pins(s) {
    cards().forEach(function (c, i) {
      var r = rect(c), p = mk('div', 'fl-pin', s.L);
      p.style.left = (r.left + r.width / 2 - 7) + 'px'; p.style.top = (r.top - 6) + 'px';
      c.classList.add('fl-nopin');
      go(p, [{ transform: 'translate(0,0)' }, { transform: 'translate(' + (sgn() * rnd(20, 60)).toFixed(0) + 'px,-40px)', offset: 0.3 }, { transform: 'translate(' + (sgn() * rnd(60, 140)).toFixed(0) + 'px,' + (innerHeight - r.top + 40).toFixed(0) + 'px)' }],
        { duration: 1300, delay: i * 260, easing: 'cubic-bezier(.4,0,.9,.6)' });
    });
  }
  function drop(e, kind, delay) {
    if (!e || e.dataset.flDown || !onScreen(e)) return;
    e.dataset.flDown = '1';
    var H = innerHeight, r = rect(e), x = rnd(-36, 36), rot = rnd(-32, 32), sw = sgn() * rnd(6, 13), dy, kf, dur = rnd(1300, 1700);
    if (kind === 'tab') {
      dy = H - r.top + 40;
      kf = [{ transform: 'none' }, { transform: 'translateY(-28px) rotate(' + (sw * 2) + 'deg)', offset: 0.3 }, { transform: 'translate(' + x + 'px,' + dy + 'px) rotate(' + rot * 2 + 'deg)' }];
      dur = rnd(700, 900);
    } else {
      dy = Math.max(30, H - r.bottom - rnd(0, 120));
      e.style.transformOrigin = (sw > 0 ? '6% 4%' : '94% 4%');
      kf = [
        { transform: 'none' },
        { transform: 'rotate(' + sw + 'deg)', offset: 0.22 },
        { transform: 'translateY(6px) rotate(' + (sw * 0.7) + 'deg)', offset: 0.3, easing: 'cubic-bezier(.5,0,.9,.55)' },
        { transform: 'translate(' + x + 'px,' + dy + 'px) rotate(' + rot + 'deg)', offset: 0.84 },
        { transform: 'translate(' + x + 'px,' + (dy - 16) + 'px) rotate(' + (rot * 0.9) + 'deg)', offset: 0.92 },
        { transform: 'translate(' + x + 'px,' + dy + 'px) rotate(' + rot + 'deg)' }
      ];
    }
    go(e, kf, { duration: dur, delay: delay || 0, easing: 'linear' });
  }
  function A(s) {
    var v2 = s.v === 2, head = one('#rtitle'), was = head ? head.textContent : '', date = one('[data-home-date]'), dateWas = date ? date.textContent : '';
    var clocks = all('#hm-time, .hm-clock'), times = clocks.map(function (e) { return e.textContent; });
    opening(s, ['typo', 'tilt', 'typo', 'clock']);
    s.tap = function (p) { if (p && cards().indexOf(p) >= 0 && s.falling) drop(p, 'card'); else nudge(p); };
    later(12000, function () {
      if (head) { head.classList.add('fl-mono'); bubble('hello ' + first(s.lower) + '.', 700); }
      var m = one('.mascot');
      if (m) { m.classList.add('fl-evil'); go(m, [{ transform: 'none' }, { transform: 'translate(-3px,1px) rotate(-8deg)' }, { transform: 'translate(3px,-1px) rotate(8deg)' }, { transform: 'none' }], { duration: 160, iterations: 5, fill: 'none' }); }
    });
    later(15000, function () {
      var m = 14 * 60;
      every(150, function () { if (s.rebuilt) return; m -= 13; clocks.forEach(function (e) { e.textContent = hhmm(m); }); });
      scramble(date, 'no day · no time', 900);
    });
    later(18000, function () { if (v2) pins(s); else crack(s); });
    later(21000, function () {
      s.falling = true;
      shuffle(cards()).forEach(function (c, i) { later(i * 2400, function () { drop(c, 'card'); }); });
      heads().concat(foot()).forEach(function (e, i) { later(1200 + i * 2400, function () { drop(e, 'card'); }); });
    });
    later(33000, function () { tops().forEach(function (e, i) { drop(e, 'top', i * 160); }); });
    later(34500, function () { tabs().forEach(function (e, i) { drop(e, 'tab', i * 110); }); });
    later(37000, function () { s.dk = dark(s, 0, 2500); });
    later(40000, function () { var n = first(s.lower); s.tp = typed(s, v2 ? [n + '.', 'the book fell over.', '', 'all of it.'] : [n + '.', 'what did you press?', '', 'the book is gone.']); });
    later(49000, function () { s.ap = april(s, null, 'ERROR 0x0401'); });
    later(55000, function () {
      s.rebuilt = true;
      lift(s.tp, 300); lift(s.ap, 300); lift(s.dk, 600); lift(s.crack, 600);
      all('.fl-pin', s.L).forEach(function (p) { p.remove(); });
      cards().forEach(function (c) { c.classList.remove('fl-nopin'); });
      clocks.forEach(function (e, i) { e.textContent = times[i]; });
      if (head) { head.classList.remove('fl-mono'); bubble(was, 400); }
      if (date) scramble(date, dateWas, 400);
      settle(all('.wtop-brand, .wtop-icons > *, .mascot, #rtitle, .wall-date, #hm-day, #hm-with, #hm-board, #hm-prep, .hm-up, .wall-foot, .tabbar a'));
    });
  }

  /* ============ B · Takeover: the screen switches off and a terminal takes the book ============ */
  function tvOff(s) {
    s.L.classList.add('fl-black');
    s.off = go(s.stage, [{ transform: 'scale(1,1)' }, { transform: 'scale(1,.006)', offset: 0.55 }, { transform: 'scale(0,.006)' }], { duration: 440, easing: 'cubic-bezier(.6,0,.9,.4)' });
    var line = mk('div', 'fl-line', s.L);
    go(line, [{ transform: 'scaleX(1)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 1, offset: 0.45 }, { transform: 'scaleX(.01)', opacity: 1, offset: 0.9 }, { transform: 'scaleX(0)', opacity: 0 }], { duration: 520, delay: 160 });
  }
  function tvOn(s) {
    if (s.term) go(s.term, [{ transform: 'scale(1,1)', opacity: 1 }, { transform: 'scale(1,.006)', opacity: 1 }], { duration: 200, easing: 'ease-in' });
    if (s.off) s.off.cancel();
    s.L.classList.remove('fl-black');
    go(s.stage, [{ transform: 'scale(0,.006)' }, { transform: 'scale(1,.006)', offset: 0.4 }, { transform: 'scale(1,1)' }], { duration: 420, delay: 160, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' });
  }
  function tear(s, n) {
    for (var i = 0; i < (n || 2); i++) {
      var top = rnd(4, 86), hgt = rnd(3, 11), strip = mk('div', 'fl-strip', s.L);
      strip.style.clipPath = 'inset(' + top.toFixed(1) + '% 0 ' + Math.max(0, 100 - top - hgt).toFixed(1) + '% 0)';
      strip.appendChild(copyOf(s.app));
      var a = go(strip, [{ transform: 'translateX(0)' }, { transform: 'translateX(' + rnd(-60, 60).toFixed(0) + 'px)' }, { transform: 'translateX(' + rnd(-30, 30).toFixed(0) + 'px)' }, { transform: 'translateX(0)' }],
        { duration: rnd(220, 380), easing: 'steps(3)', fill: 'none' });
      (function (st) { if (a) a.onfinish = function () { st.remove(); }; else st.remove(); })(strip);
    }
  }
  function B(s) {
    var v2 = s.v === 2, nm = first(s.upper), nl = first(s.lower);
    var secs = all('.hm-sn').map(function (e) { return e.textContent.trim(); }).filter(Boolean).slice(0, 3);
    if (!secs.length) secs = ['Larder', 'Grill', 'Sauce'];
    var mine = ((one('.hm-day-value') || {}).textContent || 'Pans').trim();
    opening(s, ['flicker', 'typo', 'flicker', 'typo']);
    later(10000, function () { tear(s, 2); });
    later(12000, function () { tear(s, 3); });
    later(14000, function () { tvOff(s); });
    later(15500, function () {
      var t = s.term = mk('div', 'fl-term' + (v2 ? ' fl-amber' : ''), s.L), log = mk('div', 'fl-log', t);
      var lines = v2 ? [
        'MASCOT-OS 4.01', 'the mascot has taken over', '', pad('> user ', nm.slice(0, 14)), pad('> hiding the good knife ', 'OK'),
        pad('> hiding the recipes ', 'OK')].concat(secs.map(function (x) { return pad('    ' + x.toLowerCase().replace(/\s+/g, '_') + ' ', 'hidden'); }), [
        pad('> teaching the mascot to cook ', 'FAILED'), pad('> moving ' + mine.toLowerCase() + ' to the car park ', 'OK'), pad('> salt replaced with sugar ', 'OK'),
        pad('> ' + nl.slice(0, 12) + "'s settings ", 'scrambled'), pad('> installing more mascots ', '...')])
        : ['KB-OS 4.01  KITCHEN BOOK', pad('> login from the walk-in fridge ', 'OK'), pad('> user ', nm.slice(0, 14)), '> rm -rf /kitchen/recipes']
          .concat(secs.map(function (x) { return pad('    ' + x.toLowerCase().replace(/\s+/g, '_') + '.rcp ', 'gone'); }), [
            pad('    gravy.rcp ', 'gone'), pad('    the_good_knife ', 'gone'), pad('> translating prep list to pig latin ', 'done'), pad('> blaming the fryer ', 'done'),
            pad('> renaming ' + nl.slice(0, 10) + ' to banana ', 'done'), pad('> sending prep list to the moon ', 'done')]);
      var i = 0;
      (function next() {
        if (!live(s)) return;
        if (i < lines.length) { mk('div', 'fl-tl', log, lines[i++]); s.t.push(setTimeout(next, rnd(550, 900) * s.k)); return; }
        var c = mk('div', 'fl-tl', log); c.appendChild(mk('span', 'fl-cur'));
      })();
    });
    later(31000, function () {
      s.term.textContent = '';
      var big = mk('div', 'fl-big', s.term);
      typeLines(big, ['HELLO ' + nm + '.'], 90, 0, function () {
        var sub = mk('div', 'fl-sub', s.term);
        typeLines(sub, v2 ? ['the mascot is in charge now.', 'please clap.'] : ['your book belongs to the fridge now.', 'do not panic.'], 45, 500, function () {
          var bar = mk('div', 'fl-sub fl-bar', s.term), n = 0, word = v2 ? 'more mascots ' : 'restoring the book ';
          var step = every(260, function () {
            n = Math.min(99, n + Math.ceil(rnd(1, 5)));
            bar.textContent = word + '[' + '#'.repeat(Math.floor(n / 10)) + '-'.repeat(10 - Math.floor(n / 10)) + '] ' + n + '%';
            if (n >= 99) { clearInterval(step); s.t.push(setTimeout(function () { if (live(s)) { bar.textContent = word + '[----------] 1%'; mk('div', 'fl-sub', s.term, 'oops.'); } }, 2200 * s.k)); }
          });
        });
      });
    });
    later(50000, function () { s.term.textContent = ''; mk('div', 'fl-sub', s.term, 'FATAL ERROR'); april(s, s.term, '0x0401', 'fl-in-term'); });
    later(55000, function () { tvOn(s); });
  }

  /* ============ C · Possessed: the page stays, but every word turns on you ============ */
  var SWAP = [
    ['#hm-day-h', 'Your doom'], ['.hm-day-row .hm-t', 'Your sentence'], ['.hm-day-break .hm-t', 'Your breakdown'],
    ['.hm-day-break .hm-s', 'A chef has seen your knife skills'], ['.hm-tm', 'Never'], ['#hm-with .hm-pt', 'Onto you'],
    ['.hm-roster-caption', 'Lunch is you'], ['#hm-full-team > summary', "View today's full scream"], ['#hm-prep .hm-pt', 'Prep by sedation'],
    ['.hm-pc', '6 of 0 done'], ['#hm-up-h', 'Coming soon: nothing'], ['.wall-foot', 'Cook as written. Or as sung. Nobody knows any more.']
  ];
  var TABS = { Recipes: 'Regrets', Prep: 'Perp', Orders: 'Disorders', Wastage: 'Wasted', Transfers: 'Trespass', Cleaning: 'Screaming' };
  var SECS = { Pans: 'Pants', Grill: 'Grilled', Fryers: 'Friars', Larder: 'Ladder', Sauce: 'Saucy', Pass: 'Passed out' };
  function melt(e) {
    if (!e || e.dataset.flMelt) return;
    e.dataset.flMelt = '1';
    var t = e.textContent, k = S.k;
    e.textContent = '';
    Array.prototype.forEach.call(t, function (ch) {
      var c = mk('span', 'fl-ch', e, ch);
      c.style.setProperty('--dy', rnd(5, 26).toFixed(1) + 'px');
      c.style.setProperty('--sk', rnd(-16, 16).toFixed(1) + 'deg');
      c.style.setProperty('--sy', rnd(1.1, 1.8).toFixed(2));
      c.style.setProperty('--d', (rnd(0, 0.7) * k).toFixed(2) + 's');
      c.style.setProperty('--t', (rnd(3, 5.3) * k).toFixed(2) + 's');
    });
  }
  function C(s) {
    var v2 = s.v === 2, jobs = [], nm = first(s.name);
    s.step = 0;
    function invert() { if (s.step >= 1) return; s.step = 1; var v = mk('div', 'fl-inv', s.L); go(v, [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 900 }); }
    function flip() { if (s.step >= 2) return; s.step = 2; s.flipped = true; go(s.stage, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(180deg)' }], { duration: 900, easing: 'cubic-bezier(.3,1.35,.5,1)' }); }
    s.tap = function (p, x, y) {
      flee(p, x, y);
      var at = (performance.now() - s.t0) / s.k;
      if (s.taps >= 6 && s.step === 0 && at >= 30000) invert(); else if (s.taps >= 10 && s.step === 1 && at >= 40000) flip();
    };
    if (v2) {
      // Everyone and everything becomes the person.
      jobs.push(function () { bubble(nm + ', ' + nm + ', ' + nm + '.', 600); });
      all('.hm-bt, .hm-t, .hm-pt, .hm-sn, .hm-rota th, .hm-tp b, .hm-day-value, .hm-tm, .hm-roster-caption, .hm-s, .hm-sl, .hm-pc, .tabbar a span, .wtop-who-n').forEach(function (e) {
        jobs.push(function () { scramble(e, e.matches('.hm-s, .hm-sl') ? nm + ' ' + nm.toLowerCase() + ' ' + nm.toLowerCase() : nm, 500); });
      });
      jobs.push(function () { scramble(one('[data-home-date]'), nm + 'day 1 ' + nm, 500); clockTo(nm.slice(0, 2).toUpperCase() + ':' + nm.slice(0, 2).toUpperCase()); });
      jobs.push(function () { scramble(one('.wall-foot'), 'Cook as ' + nm + '. Check with ' + nm + ' before changing ' + nm + '.', 600); });
    } else {
      jobs.push(function () { bubble('I see you, ' + nm + '.', 500); });
      jobs.push(function () { scramble(one('[data-home-date]'), 'Doomsday 1 April', 500); all('#hm-time, .hm-clock').forEach(function (e) { scramble(e, '13:13', 400); }); });
      SWAP.forEach(function (p) { jobs.push(function () { all(p[0]).forEach(function (e) { scramble(e, p[1], 450); }); }); });
      jobs.push(function () { var v = one('.hm-day-value'); if (v) scramble(v, SECS[v.textContent.trim()] || v.textContent.split('').reverse().join(''), 450); });
      jobs.push(function () { all('#hm-with .hm-tp b').forEach(function (e) { scramble(e, nm, 450); }); all('.hm-sl').forEach(function (e) { scramble(e, 'no one left', 450); }); });
      jobs.push(function () { all('.tabbar a span').forEach(function (e) { var t = TABS[e.textContent.trim()]; if (t) scramble(e, t, 450); }); var w = one('.wtop-who-n'); if (w) scramble(w, nm.split('').reverse().join(''), 450); });
    }
    var gap = 21000 / jobs.length;
    jobs.forEach(function (f, i) { later(1500 + i * gap, f); });
    later(23000, function () {
      s.L.classList.add('fl-rgb');
      go(s.shake, [{ transform: 'translate(0,0)' }, { transform: 'translate(-2px,1px)' }, { transform: 'translate(1px,-1px)' }, { transform: 'translate(2px,1px)' }, { transform: 'translate(0,0)' }], { duration: 700, iterations: Infinity, easing: 'steps(1)' });
    });
    later(27000, function () {
      var m = one('.mascot');
      if (!m) return;
      m.classList.add('fl-evil');
      var r = rect(m), pts = [[0.55, 0.35], [0.15, 0.6], [0.7, 0.75], [0.35, 0.2], [0.6, 0.5]], kf = [{ transform: 'none' }];
      pts.forEach(function (p, i) { kf.push({ transform: 'translate(' + (innerWidth * p[0] - r.left).toFixed(0) + 'px,' + (innerHeight * p[1] - r.top).toFixed(0) + 'px) rotate(' + (i * 200 - 90) + 'deg) scale(' + (1.4 + i * 0.45) + ')' }); });
      go(m, kf, { duration: 14000, easing: 'steps(20)' });
    });
    later(31000, function () { all('#hm-day-h, .hm-pt, .hm-t, .tabbar a span').forEach(melt); });
    later(34000, function () { tear(s, 2); every(900, function () { if (!s.flipped) tear(s, 2); }); });
    later(37000, function () {
      s.psy = mk('div', 'fl-psy', s.L);
      go(s.psy, [{ opacity: 0, transform: 'rotate(0deg)' }, { opacity: 0.6, transform: 'rotate(120deg)', offset: 0.15 }, { opacity: 0.6, transform: 'rotate(900deg)' }], { duration: 18000 });
    });
    later(43000, invert);
    later(46000, flip);
    later(50000, function () { s.ap = april(s, null, v2 ? nm.toUpperCase() + ' 0x0401' : '0x0401', 'fl-upside'); });
    later(54500, function () {
      if (s.psy) lift(s.psy, 400);
      if (s.flipped) go(s.stage, [{ transform: 'rotate(180deg)' }, { transform: 'rotate(360deg)' }], { duration: 700, easing: 'cubic-bezier(.3,1.3,.5,1)' });
      lift(s.ap, 300);
    });
  }

  /* ============ D · Ransom note: letters are cut out of the page and glued into a note ============ */
  function Dn(s) {
    var v2 = s.v === 2, nm = first(s.upper).slice(0, 12);
    var lines = v2 ? ['WE TOOK YOUR VOWELS, ' + nm + '.', 'SAY CHEESE TO GET', 'THEM BACK.'] : ['WE HAVE YOUR SAUCES, ' + nm + '.', 'LEAVE 1 KG OF BUTTER', 'AT THE PASS.', 'OR NO GRAVY.'];
    opening(s, ['typo', 'clock', 'tilt', 'typo']);
    var src = [], note, targets = [];
    later(11000, function () {
      src = letters(false);
      // A few letters go missing first, one by one: did that word always look like that?
      shuffle(src).slice(0, 8).forEach(function (c, i) { later(i * 900, function () { c.classList.add('fl-gone'); }); });
    });
    later(20000, function () {
      s.L.classList.add('fl-dim');
      note = mk('div', 'fl-note', s.L);
      var styles = ['fl-f1', 'fl-f2', 'fl-f3', 'fl-f4', 'fl-f5'];
      lines.forEach(function (line) {
        var row = mk('div', 'fl-nl', note);
        line.split(' ').forEach(function (w) {
          var wd = mk('span', 'fl-nw', row);
          Array.prototype.forEach.call(w, function (ch) {
            var c = mk('span', 'fl-rc ' + pick(styles), wd, ch);
            c.style.transform = 'rotate(' + rnd(-9, 9).toFixed(1) + 'deg)';
            c.style.fontSize = rnd(21, 30).toFixed(0) + 'px';
            c.style.visibility = 'hidden';
            targets.push(c);
          });
          row.appendChild(D.createTextNode(' '));
        });
      });
      go(note, [{ transform: 'translateY(30px) rotate(-2deg)', opacity: 0 }, { transform: 'translateY(0) rotate(-2deg)', opacity: 1 }], { duration: 500 });
    });
    later(21500, function () {
      var free = src.filter(function (c) { return !c.classList.contains('fl-gone'); });
      var gap = 17000 / Math.max(1, targets.length);
      targets.forEach(function (t, i) {
        later(i * gap, function () {
          var ch = t.textContent.toLowerCase(), k = -1;
          for (var j = 0; j < free.length; j++) if (free[j].textContent.toLowerCase() === ch) { k = j; break; }
          if (k < 0 && free.length) k = Math.floor(Math.random() * free.length);
          var from = k >= 0 ? free.splice(k, 1)[0] : null;
          var r0 = from ? rect(from) : { left: innerWidth / 2, top: -40 }, r1 = rect(t);
          if (from) from.classList.add('fl-gone');
          var f = mk('span', 'fl-fly ' + t.className.replace('fl-rc', ''), s.L, t.textContent);
          f.style.left = r0.left + 'px'; f.style.top = r0.top + 'px'; f.style.fontSize = t.style.fontSize;
          var a = go(f, [{ transform: 'translate(0,0) scale(.5)' }, { transform: 'translate(' + ((r1.left - r0.left) / 2).toFixed(0) + 'px,' + ((r1.top - r0.top) / 2 - 70).toFixed(0) + 'px) scale(1.4) rotate(' + rnd(-90, 90).toFixed(0) + 'deg)', offset: 0.5 }, { transform: 'translate(' + (r1.left - r0.left).toFixed(0) + 'px,' + (r1.top - r0.top).toFixed(0) + 'px) scale(1) ' + t.style.transform }],
            { duration: 1100, easing: 'ease-in-out' });
          if (a) a.onfinish = function () { t.style.visibility = 'visible'; f.remove(); }; else { t.style.visibility = 'visible'; f.remove(); }
        });
      });
    });
    later(42000, function () { if (note) { var sg = mk('div', 'fl-nsign', note, 'signed,'); go(sg, [{ opacity: 0 }, { opacity: 1 }], { duration: 400 }); } });
    later(44000, function () { if (note) april(s, note, 'THE KITCHEN GANG', 'fl-in-note'); });
    later(54000, function () {
      if (note) go(note, [{ opacity: 1, transform: 'rotate(-2deg)' }, { opacity: 0, transform: 'translateY(40px) rotate(4deg)' }], { duration: 500 });
      all('.fl-fly', s.L).forEach(function (f) { f.remove(); });
      all('.fl-gone').forEach(function (c) { c.classList.remove('fl-gone'); go(c, [{ opacity: 0, transform: 'translateY(-14px)' }, { opacity: 1, transform: 'none' }], { duration: rnd(300, 900), delay: rnd(0, 900) }); });
      s.L.classList.remove('fl-dim');
    });
  }

  /* ============ E · The hungry mascot: he eats the page, one card at a time ============ */
  function E(s) {
    var v2 = s.v === 2, nm = first(s.lower), m = one('.mascot'), size = 1, eaten = [];
    var bites = v2 ? ['the prep list: chewy.', 'needs salt.', 'your break: too short.', 'crunchy.', 'the team: spicy.', 'mmm, tabs.'] : ['nom.', 'nom nom.', 'crunchy.', 'needs salt.', 'the clock was chewy.', 'mmm, tabs.'];
    opening(s, ['stare', 'typo', 'stare', 'clock']);
    later(10500, function () { bubble(v2 ? "i'm starving, " + nm + '.' : "i'm hungry, " + nm + '.', 600); });
    if (!m) return;
    var r0 = rect(m), at = { x: 0, y: 0 };
    function moveTo(x, y, ms) {
      var tx = (x - (r0.left + r0.width / 2)).toFixed(0), ty = (y - (r0.top + r0.height / 2)).toFixed(0);
      go(m, [{ transform: 'translate(' + at.x + 'px,' + at.y + 'px) scale(' + size + ')' }, { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(' + size + ')' }], { duration: ms || 600, easing: 'cubic-bezier(.4,1.4,.5,1)' });
      at = { x: tx, y: ty };
    }
    function chomp(p, word) {
      if (!p || eaten.indexOf(p) >= 0 || !onScreen(p)) return;
      eaten.push(p);
      var r = rect(p), mx = r.left + r.width / 2, my = Math.max(90, r.top - 30);
      moveTo(Math.min(innerWidth - 50, Math.max(50, mx)), my, 500);
      later(600, function () {
        var mr = rect(m), dx = (mr.left + mr.width / 2) - (r.left + r.width / 2), dy = (mr.top + mr.height * 0.55) - (r.top + r.height / 2);
        go(p, [{ transform: 'none', opacity: 1 }, { transform: 'translate(' + dx.toFixed(0) + 'px,' + dy.toFixed(0) + 'px) scale(.04) rotate(' + rnd(-60, 60).toFixed(0) + 'deg)', opacity: 0.2 }], { duration: 900, easing: 'cubic-bezier(.5,0,.8,.4)' });
        size = Math.min(3.2, size + 0.28);
        later(800, function () {
          go(m, [{ transform: 'translate(' + at.x + 'px,' + at.y + 'px) scale(' + size + ')' }, { transform: 'translate(' + at.x + 'px,' + at.y + 'px) scale(' + (size * 1.12).toFixed(2) + ',' + (size * 0.84).toFixed(2) + ')' }, { transform: 'translate(' + at.x + 'px,' + at.y + 'px) scale(' + size + ')' }], { duration: 300, iterations: 2 });
          if (word) bubble(word, 300);
        });
      });
    }
    s.tap = function (p) { if (p && p !== m && !p.matches('#rtitle') && s.eating) chomp(p, pick(['oh, a snack.', 'thank you.', 'more.'])); else if (p && !p.matches('#rtitle')) nudge(p); };
    later(13000, function () { m.classList.add('fl-loose'); moveTo(innerWidth / 2, innerHeight * 0.3, 900); });
    later(15000, function () {
      s.eating = true;
      var menu = [one('.wall-date')].concat(cards(), foot(), [all('.tabbar')[0]], tops()).filter(function (p) { return p && onScreen(p); });
      var gap = Math.min(3200, 24000 / menu.length);
      menu.forEach(function (p, i) { later(i * gap, function () { chomp(p, bites[i % bites.length]); }); });
    });
    later(40000, function () { s.eating = false; moveTo(innerWidth / 2, innerHeight * 0.45, 900); bubble(v2 ? 'delicious. who is next?' : 'delicious, ' + nm + '.', 500); });
    later(44000, function () {
      bubble("you're next.", 400);
      go(s.shake, [{ transform: 'translate(0,0)' }, { transform: 'translate(-4px,2px)' }, { transform: 'translate(3px,-2px)' }, { transform: 'translate(0,0)' }], { duration: 200, iterations: 8, fill: 'none' });
      go(m, [{ transform: 'translate(' + at.x + 'px,' + at.y + 'px) scale(' + size + ')' }, { transform: 'translate(' + at.x + 'px,' + at.y + 'px) scale(14)' }], { duration: 3000, delay: 600, easing: 'ease-in' });
    });
    later(47500, function () { s.dk = dark(s, 0, 500); });
    later(48500, function () { s.tp = typed(s, ['burp.']); });
    later(50500, function () { lift(s.tp, 200); s.ap = april(s, null, v2 ? 'only joking.' : 'it was a snack.'); });
    later(54500, function () {
      lift(s.ap, 300); lift(s.dk, 500);
      bubble(v2 ? 'here, have it back.' : 'fine. have it back.', 0);
      settle(eaten.concat([m]), 700);
    });
  }

  /* ============ F · Code rain: every letter drains down the screen, and the name lights up ============ */
  function F(s) {
    var v2 = s.v === 2, nm = first(s.upper);
    opening(s, ['typo', 'flicker', 'typo', 'clock']);
    var cv, x, drops = [], spawnTop = 0, letterQ = [], fs = 16, glyphs = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789KBPREP';
    var col = v2 ? [255, 196, 107] : [158, 246, 255];
    function frame() {
      if (!live(s)) return;
      x.clearRect(0, 0, innerWidth, innerHeight);
      x.font = '600 ' + fs + 'px ui-monospace, Menlo, Consolas, monospace';
      for (var i = drops.length - 1; i >= 0; i--) {
        var d = drops[i];
        d.y += d.v / s.k / 60;
        if (Math.random() < 0.3) d.trail.unshift(glyphs[Math.floor(Math.random() * glyphs.length)]);
        if (d.trail.length > d.n) d.trail.pop();
        for (var j = 0; j < d.trail.length; j++) {
          var a = j === 0 ? 1 : Math.max(0, 0.85 - j / d.n);
          x.fillStyle = j === 0 ? 'rgba(255,255,255,' + a + ')' : 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + a + ')';
          x.fillText(d.trail[j], d.x, d.y - j * fs);
        }
        if (d.y - d.n * fs > innerHeight) drops.splice(i, 1);
      }
      // At most 110 drops at once, so a slow phone keeps up (the rain was the heaviest joke, 522 to 579 ms a second at 4x slower).
      if (spawnTop && drops.length < 110 && Math.random() < spawnTop) drops.push({ x: Math.floor(Math.random() * innerWidth / fs) * fs, y: -fs, v: rnd(160, 420), n: Math.floor(rnd(8, 22)), trail: [] });
      for (var q = 0; q < 3 && letterQ.length && drops.length < 140; q++) {
        var c = letterQ.shift(), r = rect(c);
        c.classList.add('fl-gone');
        drops.push({ x: r.left, y: r.top + r.height * 0.8, v: rnd(90, 260), n: Math.floor(rnd(5, 14)), trail: [c.textContent] });
      }
      s.raf = requestAnimationFrame(frame);
    }
    later(11000, function () {
      cv = mk('canvas', 'fl-rain', s.L);
      var dpr = Math.min(2, W.devicePixelRatio || 1);
      cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
      x = cv.getContext('2d'); x.scale(dpr, dpr);
      s.raf = requestAnimationFrame(frame);
      var src = shuffle(letters(false));
      // First a drip now and then, then whole words drain away.
      src.slice(0, 6).forEach(function (c, i) { later(i * 1300, function () { letterQ.push(c); }); });
      later(9000, function () { src.slice(6).forEach(function (c, i) { later(i * 28, function () { letterQ.push(c); }); }); });
    });
    later(16000, function () { s.dk = mk('div', 'fl-dark', s.L); if (cv) s.L.insertBefore(s.dk, cv); go(s.dk, [{ opacity: 0 }, { opacity: 0.94 }], { duration: 14000, easing: 'ease-in' }); });
    later(24000, function () { spawnTop = 0.25; });
    later(30000, function () { spawnTop = 0.6; });
    later(38000, function () {
      var big = mk('div', 'fl-rainword' + (v2 ? ' fl-amber' : ''), s.L);
      var word = v2 ? 'WHERE IS THE BOOK, ' + nm + '?' : nm;
      Array.prototype.forEach.call(word, function (ch, i) { var c = mk('span', '', big, ch); c.style.opacity = '0'; go(c, [{ opacity: 0, transform: 'translateY(-30px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: 400 + i * (v2 ? 120 : 600) }); });
      s.word = big;
    });
    later(47000, function () { s.ap = april(s, null, v2 ? 'IT IS IN THE RAIN' : 'WAKE UP, ' + nm, 'fl-low'); });
    later(54000, function () {
      spawnTop = 0;
      lift(cv, 700); lift(s.dk, 800); lift(s.word, 400); lift(s.ap, 400);
      all('.fl-gone').forEach(function (c) { c.classList.remove('fl-gone'); go(c, [{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'none' }], { duration: rnd(300, 800), delay: rnd(0, 1200) }); });
    });
  }

  /* ============ G · Black hole: a hole opens in Your day and pulls the whole book in ============ */
  function G(s) {
    var v2 = s.v === 2, nm = first(s.upper), nl = first(s.lower), day = one('#hm-day') || cards()[0], r = day ? rect(day) : { left: 100, top: 300, width: 200, height: 100 };
    var cx = r.left + r.width * 0.62, cy = r.top + r.height * 0.55, gone = [];
    opening(s, ['typo', 'tilt', 'clock']);
    var hole = mk('div', 'fl-hole', s.L), ring = mk('div', 'fl-ring', hole);
    hole.style.left = (cx - 50) + 'px'; hole.style.top = (cy - 50) + 'px'; hole.style.transform = 'scale(0)';
    function sizeTo(k, ms, x, y) {
      var cur = getComputedStyle(hole).transform;
      hole.getAnimations().forEach(function (a) { a.cancel(); });
      var tx = (x == null ? cx : x) - cx, ty = (y == null ? cy : y) - cy;
      go(hole, [{ transform: cur === 'none' ? 'scale(0)' : cur }, { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(' + k + ')' }], { duration: ms, easing: 'ease-in-out' });
      s.hx = cx + tx; s.hy = cy + ty;
    }
    s.hx = cx; s.hy = cy;
    later(9000, function () { sizeTo(0.04, 3000); });
    later(12000, function () { sizeTo(0.15, 4000); go(ring, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 1800, iterations: Infinity, easing: 'linear' }); });
    later(16500, function () { sizeTo(0.6, 3500, innerWidth / 2, innerHeight * 0.48); });
    function pull(p) {
      if (!p || gone.indexOf(p) >= 0 || !onScreen(p)) return;
      gone.push(p);
      var pr = rect(p), px = pr.left + pr.width / 2, py = pr.top + pr.height / 2, vx = px - s.hx, vy = py - s.hy, kf = [];
      for (var i = 0; i <= 8; i++) {
        var t = i / 8, ang = t * Math.PI * 2.4, k = Math.pow(1 - t, 1.3), nx = s.hx + (vx * Math.cos(ang) - vy * Math.sin(ang)) * k, ny = s.hy + (vx * Math.sin(ang) + vy * Math.cos(ang)) * k;
        kf.push({ transform: 'translate(' + (nx - px).toFixed(0) + 'px,' + (ny - py).toFixed(0) + 'px) rotate(' + (t * 540).toFixed(0) + 'deg) scale(' + (1 - t * 0.97).toFixed(2) + ')', opacity: t > 0.9 ? 0 : 1 });
      }
      go(p, kf, { duration: 2200, easing: 'ease-in' });
    }
    s.tap = function (p) { if (s.pulling) pull(p); else nudge(p); };
    later(20000, function () {
      s.pulling = true;
      var order = tabs().concat(tops(), foot(), [one('.wall-date')], shuffle(cards()), [one('#rtitle'), one('.mascot')]).filter(Boolean);
      var gap = 17000 / order.length;
      order.forEach(function (p, i) { later(i * gap, function () { pull(p); }); });
    });
    later(28000, function () {
      var orb = s.orb = mk('div', 'fl-orbit', s.L);
      orb.style.left = s.hx + 'px'; orb.style.top = s.hy + 'px';
      Array.prototype.forEach.call(nm, function (ch, i, a) { var c = mk('span', '', orb, ch), ang = i / a.length * 360; c.style.transform = 'rotate(' + ang + 'deg) translateY(-110px) rotate(' + (-ang) + 'deg)'; });
      go(orb, [{ transform: 'rotate(0deg) scale(1)' }, { transform: 'rotate(1080deg) scale(.1)', opacity: 0.4 }], { duration: 13000, easing: 'ease-in' });
    });
    later(40000, function () { sizeTo(30, 2500, innerWidth / 2, innerHeight / 2); });
    later(43500, function () { s.tp = typed(s, v2 ? ['the prep list is past', 'the event horizon,', nl + '.'] : ['everything is in here', 'now, ' + nl + '.']); });
    later(49500, function () { lift(s.tp, 300); s.ap = april(s, null, v2 ? 'NO WAY BACK' : 'NO SIGNAL'); });
    later(54500, function () { lift(s.ap, 300); if (s.orb) s.orb.remove(); sizeTo(0, 900); settle(gone, 800); });
  }

  /* ============ H · Upside-down gravity: everything falls up ============ */
  function H(s) {
    var v2 = s.v === 2, nm = first(s.lower), up = [];
    opening(s, ['typo', 'clock', 'typo']);
    later(9000, function () { heads().concat(cards()).forEach(function (p) { go(p, [{ transform: 'translateY(0)' }, { transform: 'translateY(' + (-rnd(2, 7)).toFixed(1) + 'px)' }], { duration: 3000, easing: 'ease-in-out', composite: 'add' }); }); });
    function fallUp(p) {
      if (!p || up.indexOf(p) >= 0 || !onScreen(p)) return;
      up.push(p);
      var top = (one('.wtop') ? rect(one('.wtop')).bottom : 70), r = rect(p), dy = top + rnd(0, 110) - r.top, x = rnd(-30, 30), rot = rnd(-150, 150);
      if (dy > -10) dy = -rnd(20, 60);
      go(p, [{ transform: 'none' }, { transform: 'translateY(8px)', offset: 0.12 }, { transform: 'translate(' + x.toFixed(0) + 'px,' + dy.toFixed(0) + 'px) rotate(' + rot.toFixed(0) + 'deg)', offset: 0.85, easing: 'ease-out' }, { transform: 'translate(' + x.toFixed(0) + 'px,' + (dy + 14).toFixed(0) + 'px) rotate(' + (rot * 0.95).toFixed(0) + 'deg)', offset: 0.93 }, { transform: 'translate(' + x.toFixed(0) + 'px,' + dy.toFixed(0) + 'px) rotate(' + rot.toFixed(0) + 'deg)' }],
        { duration: rnd(1500, 2100), easing: 'cubic-bezier(.5,0,.9,.6)' });
    }
    s.tap = function (p) { if (s.upside) fallUp(p); else nudge(p); };
    later(13000, function () {
      s.upside = true;
      shuffle(cards()).concat(foot(), heads(), tabs()).forEach(function (p, i) { later(i * 900, function () { fallUp(p); }); });
    });
    later(26000, function () { s.note = mk('div', 'fl-floor', s.L, v2 ? 'gravity has been switched off, ' + nm + '.' : 'turn your phone over, ' + nm + '.'); go(s.note, [{ opacity: 0, transform: 'translate(-50%,20px)' }, { opacity: 1, transform: 'translate(-50%,0)' }], { duration: 500 }); });
    later(33000, function () { if (s.note) s.note.textContent = v2 ? 'please hold on to the bench.' : 'better?'; go(s.stage, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(180deg)' }], { duration: 2400, easing: 'cubic-bezier(.5,0,.3,1)' }); });
    later(40000, function () {
      if (s.note) s.note.textContent = v2 ? 'nothing is where it should be.' : 'no? hang on.';
      up.forEach(function (p) { go(p, [{ transform: 'translate(0px,0px) rotate(0deg)' }, { transform: 'translate(' + rnd(-20, 20).toFixed(0) + 'px,' + rnd(-25, 25).toFixed(0) + 'px) rotate(' + rnd(-25, 25).toFixed(0) + 'deg)' }], { duration: rnd(1800, 2600), iterations: Infinity, direction: 'alternate', easing: 'ease-in-out', composite: 'add' }); });
    });
    later(48000, function () { lift(s.note, 300); s.ap = april(s, null, v2 ? 'ZERO G' : 'UP IS DOWN', 'fl-low'); });
    later(54000, function () { lift(s.ap, 300); go(s.stage, [{ transform: 'rotate(180deg)' }, { transform: 'rotate(360deg)' }], { duration: 1200, easing: 'cubic-bezier(.4,0,.2,1)' }); later(400, function () { settle(up, 900); }); });
  }

  /* ============ I · Endless Home: Home inside the logo inside Home, forever ============ */
  function I(s) {
    var v2 = s.v === 2, nm = first(s.lower);
    opening(s, ['typo', 'stare', 'clock']);
    later(10500, function () { bubble('hello ' + nm + '.', 500); });
    later(13000, function () {
      var portal = v2 ? one('.mascot') : one('.wtop-brand');
      if (!portal) return;
      var l = rect(portal), r = Math.min(l.width / innerWidth, l.height / innerHeight);
      var ox = l.left + l.width / 2 - innerWidth * r / 2, oy = l.top + l.height / 2 - innerHeight * r / 2;
      // f(p) = o + r p maps the screen into the portal; its fixed point stays still while we zoom.
      var fx = ox / (1 - r), fy = oy / (1 - r);
      var zoom = mk('div', 'fl-zoom', s.L);
      zoom.style.transformOrigin = fx.toFixed(1) + 'px ' + fy.toFixed(1) + 'px';
      zoom.appendChild(s.stage);
      var words = ['hello ' + nm + '.', 'hello ' + nm + ' ' + nm + '.', nm + ' ' + nm + ' ' + nm + '.', 'deeper, ' + nm + '.'];
      for (var k = 1; k <= 3; k++) {
        var box = mk('div', 'fl-nest', zoom), c = copyOf(s.app), sc = Math.pow(r, k);
        box.style.transform = 'translate(' + (fx - fx * sc).toFixed(2) + 'px,' + (fy - fy * sc).toFixed(2) + 'px) scale(' + sc + ')';
        box.appendChild(c);
        var h = c.querySelector('.hm-say, .wall-h'); if (h) h.textContent = words[k % words.length];
      }
      s.zoomA = go(zoom, [{ transform: 'scale(1)' }, { transform: 'scale(' + (1 / r).toFixed(4) + ')' }], { duration: 4200, iterations: Infinity, easing: 'linear', fill: 'none' });
      if (s.zoomA) s.zoomA.playbackRate = 0.5;
    });
    later(20000, function () { if (s.zoomA) s.zoomA.playbackRate = 1; });
    later(28000, function () { if (s.zoomA) s.zoomA.playbackRate = 1.8; });
    later(34000, function () { if (s.zoomA) s.zoomA.playbackRate = 3; });
    s.tap = function (p) { if (s.zoomA) s.zoomA.playbackRate = Math.min(6, s.zoomA.playbackRate + 0.6); else nudge(p); };
    later(40000, function () { s.dk = dark(s, 0, 1500); });
    later(41500, function () { if (s.zoomA) s.zoomA.playbackRate = 0.4; s.tp = typed(s, v2 ? ['you are inside', 'the mascot now,', nm + '.'] : ['you went too deep,', nm + '.']); });
    later(48500, function () { lift(s.tp, 300); s.ap = april(s, null, 'LEVEL 401'); });
    later(54500, function () {
      lift(s.ap, 300); lift(s.dk, 600);
      if (s.zoomA) { s.zoomA.cancel(); s.zoomA = null; }
      all('.fl-nest', s.L).forEach(function (n) { go(n, [{ opacity: 1 }, { opacity: 0 }], { duration: 500 }); });
    });
  }

  /* ============ J · Dust: the page blows away like dust ============ */
  function dust(s, p, back) {
    var r = rect(p), cs = getComputedStyle(p), bg = cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? cs.backgroundColor : '#2B2A27', n = Math.min(22, Math.max(8, Math.round(r.width * r.height / 2600)));
    for (var i = 0; i < n; i++) {
      var d = mk('i', 'fl-dust', s.L), sz = rnd(4, 9);
      d.style.width = d.style.height = sz.toFixed(0) + 'px';
      d.style.left = (r.left + rnd(0, r.width)).toFixed(0) + 'px'; d.style.top = (r.top + rnd(0, r.height)).toFixed(0) + 'px';
      d.style.background = Math.random() < 0.7 ? bg : '#E2602A';
      var to = 'translate(' + rnd(80, 280).toFixed(0) + 'px,' + rnd(-90, 40).toFixed(0) + 'px) rotate(' + rnd(-200, 200).toFixed(0) + 'deg)';
      var a = go(d, back ? [{ transform: to, opacity: 0 }, { transform: 'none', opacity: 1, offset: 0.85 }, { transform: 'none', opacity: 0 }] : [{ transform: 'none', opacity: 1 }, { transform: to, opacity: 0 }],
        { duration: rnd(1600, 2800), delay: rnd(0, 500), easing: back ? 'ease-out' : 'ease-in' });
      (function (el) { if (a) a.onfinish = function () { el.remove(); }; })(d);
    }
    go(p, back ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], { duration: back ? 1200 : 700, delay: back ? 900 : 200 });
  }
  function J(s) {
    var v2 = s.v === 2, nm = first(s.lower), blown = [];
    opening(s, ['typo', 'flicker', 'tilt', 'typo']);
    function blow(p) {
      if (!p || blown.indexOf(p) >= 0 || !onScreen(p)) return;
      blown.push(p);
      charify(p, true).forEach(function (c, i) { go(c, [{ transform: 'none', opacity: 1 }, { transform: 'translate(' + rnd(30, 160).toFixed(0) + 'px,' + rnd(-50, 10).toFixed(0) + 'px) rotate(' + rnd(-90, 90).toFixed(0) + 'deg)', opacity: 0 }], { duration: rnd(900, 1600), delay: i * 12, easing: 'ease-in' }); });
      later(500, function () { dust(s, p); });
    }
    s.tap = function (p) { if (s.blowing) blow(p); else nudge(p); };
    later(12000, function () { var c = one('.wtop-icons > :last-child'); if (c) dust(s, c); });
    later(15000, function () {
      s.blowing = true;
      var order = tops().concat(heads(), cards(), foot(), tabs()), gap = 19000 / order.length;
      order.forEach(function (p, i) { later(i * gap, function () { blow(p); }); });
    });
    later(36000, function () { s.dk = dark(s, 0, 1500); });
    later(38000, function () { s.tp = typed(s, v2 ? [nm + ', the book', 'blew away.', '', 'it is somewhere', 'near the bins.'] : [nm + '?', 'are you still there?', '', 'the wind took the book.']); });
    later(49000, function () { lift(s.tp, 300); s.ap = april(s, null, 'WINDY DAY'); });
    later(53500, function () {
      lift(s.ap, 300); lift(s.dk, 700);
      blown.forEach(function (p) { all('.fl-cb', p).forEach(function (c) { c.getAnimations().forEach(function (a) { a.cancel(); }); }); dust(s, p, true); });
    });
  }

  /* ============ K · The book talks back: nothing falls; he just will not stop talking ============ */
  function K(s) {
    var v2 = s.v === 2, nm = first(s.name), turned = [];
    var script = v2 ? [
      [4000, nm + '.'], [8000, nm + '. Can I tell you a secret?'], [13000, 'The fridge told me everything.'], [18000, 'Who used the last of the butter?'],
      [23000, 'The sauces are not speaking to you.', '#hm-prep'], [28000, 'The tabs have gone on strike.', 'tabs'], [33000, 'Your break went home.', '#hm-day'],
      [38000, 'Fine. Be like that.', '#hm-with'], [43000, '...'], [47000, 'Still here?'], [51000, "It's 1 April, " + nm + '.'], [54500, 'We still love you.']
    ] : [
      [4000, nm + '.'], [8000, nm + ', are you there?'], [13000, "Don't look at me like that."], [18000, 'I know what you did to the jus.'],
      [23000, "The prep list doesn't want to talk to you.", '#hm-prep'], [28000, 'Neither does your break.', '#hm-day'], [33000, 'Everyone on with you has left.', '#hm-with'],
      [38000, "It's just you and me now.", 'tabs'], [43000, 'Forever.'], [47000, '...'], [51000, "Kidding. It's 1 April."], [54500, 'Got you, ' + nm + '.']
    ];
    var snaps = ['Hey!', 'Stop poking me.', 'That tickles.', 'Rude.', 'Excuse me?', 'Wet hands!'];
    later(2500, typo);
    function away(p) {
      if (!p || turned.indexOf(p) >= 0) return;
      turned.push(p);
      go(p, [{ transform: 'perspective(900px) rotateY(0deg)' }, { transform: 'perspective(900px) rotateY(' + (sgn() * 72) + 'deg) translateZ(-40px)', opacity: 0.55 }], { duration: 1400, easing: 'cubic-bezier(.4,0,.2,1)' });
    }
    s.tap = function (p) { if (p && !p.matches('.mascot, #rtitle')) away(p); bubble(pick(snaps), 200); };
    script.forEach(function (st) {
      later(st[0], function () {
        bubble(st[1], 500);
        if (st[2] === 'tabs') { tabs().forEach(function (t, i) { later(i * 150, function () { away(t); }); }); if (v2) all('.tabbar a span').forEach(function (e) { scramble(e, 'on strike', 500); }); }
        else if (st[2]) away(one(st[2]));
      });
    });
    later(43000, function () { s.dk = mk('div', 'fl-dark', s.L); go(s.dk, [{ opacity: 0 }, { opacity: 0.45 }], { duration: 2500 }); });
    later(51000, function () { lift(s.dk, 800); settle(turned, 900); turned = []; });
  }

  /* ============ L · Melt: the page melts like wax and drips into a puddle ============ */
  function Lm(s) {
    var v2 = s.v === 2, nm = first(s.lower), n = 7, strips = [];
    opening(s, ['typo', 'clock', 'tilt', 'typo']);
    later(11000, function () { var c = pick(cards()); if (c) go(c, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.04)' }], { duration: 2500, composite: 'add', easing: 'ease-in' }); });
    later(14000, function () {
      var w = innerWidth / n;
      for (var i = 0; i < n; i++) {
        var st = mk('div', 'fl-strip fl-melt', s.L);
        st.style.clipPath = 'inset(0 ' + Math.max(0, innerWidth - (i + 1) * w - 0.5).toFixed(1) + 'px 0 ' + Math.max(0, i * w - 0.5).toFixed(1) + 'px)';
        st.appendChild(copyOf(s.app));
        strips.push(st);
      }
      s.stage.style.visibility = 'hidden';
      s.L.classList.add('fl-hot');
      strips.forEach(function (st) {
        var d = rnd(0.35, 0.95) * innerHeight;
        go(st, [{ transform: 'translateY(0) scaleY(1)' }, { transform: 'translateY(' + (d * 0.15).toFixed(0) + 'px) scaleY(1.02)', offset: 0.3 }, { transform: 'translateY(' + d.toFixed(0) + 'px) scaleY(1.12)' }],
          { duration: rnd(16000, 24000), delay: rnd(0, 2500), easing: 'cubic-bezier(.6,0,.9,.7)' });
      });
      s.heat = mk('div', 'fl-heat', s.L);
      go(s.heat, [{ opacity: 0 }, { opacity: 0.55 }], { duration: 20000 });
    });
    s.tap = function (p, x) { var st = strips[Math.floor(x / (innerWidth / n))]; if (st) go(st, [{ transform: 'translateY(0px)' }, { transform: 'translateY(' + rnd(30, 70).toFixed(0) + 'px)' }], { duration: 500, composite: 'add', easing: 'ease-in' }); else nudge(p); };
    later(38000, function () { s.pd = mk('div', 'fl-puddle', s.L); go(s.pd, [{ transform: 'scaleY(0)', opacity: 0 }, { transform: 'scaleY(1)', opacity: 1 }], { duration: 2500, easing: 'ease-out' }); });
    later(41000, function () { s.tp = typed(s, v2 ? ['who left the book', 'on the stove,', nm + '?'] : ['too hot,', nm + '.'], 'fl-on-puddle'); });
    later(48500, function () { lift(s.tp, 300); s.ap = april(s, null, v2 ? 'MEDIUM WELL' : '401 DEGREES', 'fl-low'); });
    later(54000, function () {
      lift(s.ap, 300); lift(s.pd, 600); lift(s.heat, 800);
      strips.forEach(function (st) { var cur = getComputedStyle(st).transform; st.getAnimations().forEach(function (a) { a.cancel(); }); go(st, [{ transform: cur === 'none' ? 'none' : cur }, { transform: 'none' }], { duration: 1400, easing: 'cubic-bezier(.3,1.2,.5,1)' }); });
    });
  }

  var DESIGNS = {
    A: { name: 'Collapse', run: A }, B: { name: 'Takeover', run: B }, C: { name: 'Possessed', run: C }, D: { name: 'Ransom note', run: Dn },
    E: { name: 'Hungry mascot', run: E }, F: { name: 'Code rain', run: F }, G: { name: 'Black hole', run: G }, H: { name: 'Gravity', run: H },
    I: { name: 'Endless Home', run: I }, J: { name: 'Dust', run: J }, K: { name: 'Talks back', run: K }, L: { name: 'Melt', run: Lm }
  };

  /* ---------- a different joke for everyone, every year, from the staff list alone ---------- */
  function fnv(t) { var h = 2166136261; for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  // Each person's place comes from their staff id, so it mostly stays put when others join or leave.
  // Slot = place + 5 a year, out of 24: no two people share a slot while the team is 24 or fewer, and a person
  // moves 5 slots (another design) each year.
  function deal(ids, year) {
    var order = ids.slice().sort(function (a, b) { return (fnv(a) - fnv(b)) || (a < b ? -1 : a > b ? 1 : 0); }), out = {};
    order.forEach(function (id, i) {
      var v = (((i + (year - 2027) * 5) % 24) + 24) % 24;
      out[id] = { slot: v, design: LETTERS[v % 12], version: v < 12 ? 1 : 2 };
    });
    return out;
  }

  function stop() {
    var s = S;
    if (!s) return;
    s.over = true;
    s.t.forEach(clearTimeout);
    holdEnd(s);
    if (s.raf) cancelAnimationFrame(s.raf);
    if (s.real) s.real.classList.remove('fl-under');
    if (s.say) s.say.remove();
    if (s.L) s.L.remove();
    if (s.close) s.close();
    D.removeEventListener('keydown', s.key);
    D.removeEventListener('visibilitychange', s.vis);
    S = null;
  }

  function play(design, o) {
    stop();
    D.querySelectorAll('.fl-reveal').forEach(function (e) { e.remove(); });
    o = o || {};
    var name = (String(o.name || 'Ann').normalize ? String(o.name || 'Ann').normalize('NFC') : String(o.name || 'Ann')).trim() || 'Ann';
    S = { t: [], taps: 0, t0: performance.now(), name: name, lower: name.toLowerCase(), upper: name.toUpperCase(), design: design, v: o.version === 2 ? 2 : 1, k: o.length ? Math.max(10, Math.min(60, o.length)) / 60 : (o.quick ? 0.25 : 1) };
    // The preview's own Reduced motion box can override the device setting (o.force), so a reviewer can watch.
    if (o.reduced || (!o.force && W.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      var t = D.getElementById('rtitle');
      if (t) t.textContent = 'April Fools, ' + name + '. Nothing is broken today.';
      S = null;
      return;
    }
    pageCopy();
    var s = S;
    s.L.addEventListener('pointerdown', down);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { s.L.addEventListener(ev, function () { holdEnd(s); }); });
    s.key = function (e) { if (e.key === 'Escape') reveal(); };
    D.addEventListener('keydown', s.key);
    // A hidden screen ends it: the reveal is waiting when they come back.
    s.vis = function () { if (D.hidden) reveal(); };
    D.addEventListener('visibilitychange', s.vis);
    later(15000, function () { hint(s); });
    later(END, reveal);
    DESIGNS[design].run(s);
  }

  W.FOOLS = { play: play, stop: stop, deal: deal, designs: DESIGNS, letters: LETTERS };
})();
