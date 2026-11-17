/* April Fools on Home: the three designs (A Collapse, B Takeover, C Possessed), for review only.
   docs/april-fools-options/brief.md. The book never loads this file.
   Every design plays on a copy of the page laid over it (.fl-layer). The real Home underneath is never touched, so
   ending the joke is removing the layer. The layer also hides itself after 10 s by its own CSS, even if this
   script stops part way. Motion is transform and opacity only; no filter or shadow is animated. */
(function () {
  'use strict';
  var D = document, W = window;
  var S = null;
  var GL = '█▓▒░<>/\\|#$%&@!?01';

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function sgn() { return Math.random() < 0.5 ? -1 : 1; }
  function later(ms, f) { var s = S; s.t.push(setTimeout(function () { if (S === s && !s.over) f(); }, ms)); }
  function every(ms, f) { var s = S; s.t.push(setInterval(function () { if (S === s && !s.over) f(); }, ms)); }
  function mk(tag, cls, parent, text) {
    var e = D.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function one(sel, root) { return (root || S.app).querySelector(sel); }
  function all(sel, root) { return Array.prototype.slice.call((root || S.app).querySelectorAll(sel)); }
  function go(e, kf, o) { return e && e.animate ? e.animate(kf, Object.assign({ fill: 'forwards' }, o || {})) : null; }
  function onScreen(e) { var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; }
  function hhmm(m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
  function pad(l, r, w) { w = w || 30; var n = Math.max(1, w - l.length - r.length - 1); return l + '.'.repeat(n) + ' ' + r; }

  /* Letters turn to noise, then settle on the new words. */
  function scramble(e, to, ms) {
    if (!e) return;
    var from = e.textContent, n = Math.max(from.length, to.length), t0 = performance.now(), s = S;
    (function step() {
      if (S !== s || s.over) return;
      var k = Math.min(1, (performance.now() - t0) / (ms || 600)), cut = Math.floor(k * n), out = '';
      for (var i = 0; i < n; i++) out += i < cut ? (to[i] || '') : (Math.random() < 0.55 ? GL[Math.floor(Math.random() * GL.length)] : (from[i] || ''));
      e.textContent = k < 1 ? out : to;
      if (k < 1) requestAnimationFrame(step);
    })();
  }

  /* Types lines into e, one letter at a time, with a block cursor. */
  function typeLines(e, lines, ms, gap, done, keep) {
    var s = S, li = 0, ci = 0, cur = mk('span', 'fl-cur');
    var line = mk('div', 'fl-tl', e); line.appendChild(cur);
    (function tick() {
      if (S !== s || s.over) return;
      if (li >= lines.length) { if (!keep) cur.remove(); if (done) done(); return; }
      var L = lines[li];
      if (ci < L.length) { cur.before(L[ci++]); s.t.push(setTimeout(tick, ms)); return; }
      li++; ci = 0;
      if (li < lines.length) { line = mk('div', 'fl-tl', e); line.appendChild(cur); if (!lines[li].length) line.textContent = ' '; }
      s.t.push(setTimeout(tick, gap));
    })();
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
    S.L = L; S.stage = stage; S.shake = shake; S.app = app;
  }

  function mascotSrc() {
    var im = D.querySelector('#app .mascot img');
    return im ? im.src : '../../../art/mascot/welcome-still.png';
  }

  /* The reveal: the copy fades and the untouched Home shows through, then the mascot owns up. */
  function reveal() {
    var s = S;
    if (!s || s.revealed) return;
    s.revealed = true; s.over = true;
    s.t.forEach(clearTimeout);
    var f = go(s.L, [{ opacity: 1 }, { opacity: 0 }], { duration: 240 });
    if (f) f.onfinish = function () { s.L.remove(); }; else s.L.remove();
    card(s);
  }

  function card(s) {
    var back = mk('div', 'fl-reveal', D.body);
    back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true'); back.setAttribute('aria-labelledby', 'fl-rv-h');
    var c = mk('div', 'fl-card', back);
    var m = mk('img', 'fl-rv-m', c); m.src = mascotSrc(); m.alt = ''; m.width = 96; m.height = 128;
    var h = mk('h2', '', c, 'April Fools, ' + s.name + '!'); h.id = 'fl-rv-h';
    mk('p', 'fl-rv-p', c, 'A joke for 1 April. Nothing is broken.');
    mk('p', 'fl-rv-p', c, 'Your prep list, orders and recipes are all safe.');
    mk('p', 'fl-rv-s', c, 'On 1 April people in Australia play tricks on each other until midday. From the head chef.');
    var b = mk('button', 'fl-rv-b', c, 'Back to my day'); b.type = 'button';
    var done = false;
    function close() {
      if (done) return; done = true;
      D.removeEventListener('keydown', key);
      back.remove();
      var t = D.getElementById('rtitle');
      if (t) t.textContent = 'Got you, ' + s.name + '.';
      if (S === s) S = null;
    }
    function key(e) { if (e.key === 'Escape') close(); }
    b.addEventListener('click', close);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    D.addEventListener('keydown', key);
    go(c, [{ transform: 'scale(.6) rotate(-6deg)', opacity: 0 }, { transform: 'scale(1.04) rotate(1deg)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }],
      { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1.2)' });
    setTimeout(function () { b.focus({ preventScroll: true }); }, 60);
    setTimeout(close, 15000);
    s.close = close;
  }

  /* ---------- A: Collapse. The page cracks and falls apart, the screen goes dark and types to you. ---------- */
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
    go(s.stage, [{ transform: 'translate(0,0)' }, { transform: 'translate(-7px,4px)' }, { transform: 'translate(6px,-5px)' }, { transform: 'translate(-3px,2px)' }, { transform: 'translate(0,0)' }],
      { duration: 280, fill: 'none' });
  }

  function collapse(s) {
    var H = innerHeight, fall = [], order = 0, tabs = 0;
    function drop(e, kind) {
      if (!e || !onScreen(e)) return;
      var r = e.getBoundingClientRect(), x = rnd(-36, 36), rot = rnd(-32, 32), sw = sgn() * rnd(6, 13), dy, kf, dur = rnd(1250, 1650);
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
      var a = go(e, kf, { duration: dur, delay: kind === 'tab' ? 450 + tabs++ * 90 : order++ * rnd(70, 130), easing: 'linear' });
      fall.push([e, a]);
    }
    all('.wtop-brand, .wtop-icons > *').forEach(function (e) { drop(e, 'top'); });
    drop(one('.mascot'), 'top');
    drop(one('#rtitle'), 'head'); drop(one('.wall-date'), 'head');
    all('#hm-day, #hm-with, #hm-board:not([hidden]), #hm-prep, .hm-up, .wall-foot').sort(function () { return Math.random() - 0.5; }).forEach(function (e) { drop(e, 'card'); });
    all('.tabbar a').forEach(function (e) { drop(e, 'tab'); });
    s.fall = fall;
  }

  function A(s) {
    var head = one('#rtitle'), was = head ? head.textContent : '';
    var clocks = all('#hm-time, .hm-clock'), times = clocks.map(function (e) { return e.textContent; });
    var date = one('[data-home-date]'), dateWas = date ? date.textContent : '';
    later(450, function () {
      if (head) { head.classList.add('fl-mono'); scramble(head, 'hello ' + s.lower + '.', 650); }
      var m = one('.mascot');
      if (m) { m.classList.add('fl-evil'); go(m, [{ transform: 'none' }, { transform: 'translate(-3px,1px) rotate(-8deg)' }, { transform: 'translate(3px,-1px) rotate(8deg)' }, { transform: 'none' }], { duration: 160, iterations: 5, fill: 'none' }); }
    });
    later(1050, function () {
      var t = times[0] && /^\d\d:\d\d$/.test(times[0]) ? times[0].split(':') : ['14', '00'], m = (+t[0]) * 60 + (+t[1]);
      every(40, function () { if (s.rebuilt) return; m = (m - 7 + 1440) % 1440; clocks.forEach(function (e) { e.textContent = hhmm(m); }); });
      scramble(date, 'no day · no time', 700);
    });
    later(1650, function () { crack(s); });
    later(2150, function () { collapse(s); });
    later(4000, function () { s.dark = mk('div', 'fl-dark', s.L); go(s.dark, [{ opacity: 0 }, { opacity: 0.95 }], { duration: 700, easing: 'ease-in' }); });
    later(4600, function () {
      s.type = mk('div', 'fl-type', s.L);
      typeLines(s.type, [s.lower + '.', 'what did you press?', '', 'the book is gone.'], 34, 260, null, true);
    });
    later(7350, function () {
      s.rebuilt = true;
      if (s.type) go(s.type, [{ opacity: 1, transform: 'translate(-50%,-50%)' }, { opacity: 0, transform: 'translate(-50%,-50%) scaleY(.02)' }], { duration: 220 });
      if (s.dark) go(s.dark, [{ opacity: 0.95 }, { opacity: 0 }], { duration: 380 });
      if (s.crack) go(s.crack, [{ opacity: 1 }, { opacity: 0 }], { duration: 380 });
      clocks.forEach(function (e, i) { e.textContent = times[i]; });
      if (head) { scramble(head, was, 380); head.classList.remove('fl-mono'); }
      if (date) scramble(date, dateWas, 380);
      (s.fall || []).forEach(function (p) {
        var cur = getComputedStyle(p[0]).transform;
        if (p[1]) p[1].cancel();
        go(p[0], [{ transform: cur === 'none' ? 'none' : cur }, { transform: 'none' }], { duration: rnd(420, 560), easing: 'cubic-bezier(.2,1.45,.4,1)' });
      });
    });
    later(8000, reveal);
  }

  /* ---------- B: Takeover. The screen switches off like an old telly and a terminal takes the book. ---------- */
  function B(s) {
    var secs = all('.hm-sn').map(function (e) { return e.textContent.trim(); }).filter(Boolean).slice(0, 3);
    if (!secs.length) secs = ['Larder', 'Grill', 'Sauce'];
    var mates = all('#hm-with .hm-tp b').map(function (e) { return e.textContent.trim(); }).filter(function (n) { return n && n !== s.name; }).slice(0, 2);
    later(350, function () {
      go(s.shake, [{ transform: 'translateZ(0)' }, { transform: 'translateX(-16px) skewX(-7deg)' }, { transform: 'translateX(12px) skewX(5deg)' }, { transform: 'translateX(-5px)' }, { transform: 'translateZ(0)' }],
        { duration: 340, fill: 'none', easing: 'steps(4)' });
    });
    later(800, function () {
      s.L.classList.add('fl-black');
      s.off = go(s.stage, [{ transform: 'scale(1,1)' }, { transform: 'scale(1,.006)', offset: 0.55 }, { transform: 'scale(.0,.006)' }], { duration: 440, easing: 'cubic-bezier(.6,0,.9,.4)' });
      var line = mk('div', 'fl-line', s.L);
      go(line, [{ transform: 'scaleX(1)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 1, offset: 0.45 }, { transform: 'scaleX(.01)', opacity: 1, offset: 0.9 }, { transform: 'scaleX(0)', opacity: 0 }], { duration: 520, delay: 160 });
    });
    later(1450, function () {
      var t = s.term = mk('div', 'fl-term', s.L), log = mk('div', 'fl-log', t);
      var lines = ['KB-OS 4.01  LEICHHARDT KITCHEN', pad('> remote session ', 'OPEN'), '> user: ' + s.upper, pad('> access ', 'HEAD CHEF'), '> rm -rf /kitchen/recipes']
        .concat(secs.map(function (x) { return pad('  ' + x.toLowerCase().replace(/\s+/g, '_') + '.rcp ', 'gone'); }))
        .concat(['> encrypting prep list']);
      var i = 0;
      (function next() {
        if (S !== s || s.over) return;
        if (i < lines.length) { mk('div', 'fl-tl', log, lines[i++]); s.t.push(setTimeout(next, i < 5 ? 150 : 110)); return; }
        var bar = mk('div', 'fl-tl fl-bar', log), n = 0;
        var iv = setInterval(function () {
          if (S !== s || s.over) { clearInterval(iv); return; }
          n = Math.min(10, n + 1);
          bar.textContent = '  [' + '#'.repeat(n) + '-'.repeat(10 - n) + '] ' + n * 10 + '%';
          if (n < 10) return;
          clearInterval(iv);
          var more = [];
          if (mates[0]) more.push(pad('> blaming ' + mates[0] + ' ', 'done'));
          if (mates[1]) more.push(pad('> telling ' + mates[1] + ' it was ' + s.name + ' ', 'done'));
          more.push(pad('> sending prep list to the internet ', 'done'));
          more.forEach(function (l, k) { s.t.push(setTimeout(function () { if (S === s && !s.over) mk('div', 'fl-tl', log, l); }, 180 + k * 220)); });
          s.t.push(setTimeout(function () { if (S === s && !s.over) { var c = mk('div', 'fl-tl', log); c.appendChild(mk('span', 'fl-cur')); } }, 180 + more.length * 220));
        }, 50);
        s.t.push(iv);
      })();
    });
    later(4500, function () {
      s.term.textContent = '';
      var big = mk('div', 'fl-big', s.term);
      typeLines(big, ['HELLO ' + s.upper + '.'], 55, 0, function () {
        var sub = mk('div', 'fl-sub', s.term);
        typeLines(sub, ['you have 3 seconds', 'to call the head chef.'], 16, 120, function () {
          var c = mk('div', 'fl-count', s.term), n = 3;
          c.textContent = n;
          var iv = setInterval(function () {
            if (S !== s || s.over) { clearInterval(iv); return; }
            n--;
            if (n > 0) { c.textContent = n; return; }
            clearInterval(iv);
            s.term.textContent = '';
            mk('div', 'fl-sub', s.term, 'FATAL ERROR');
            var code = mk('div', 'fl-big fl-code', s.term, '0x0401');
            s.t.push(setTimeout(function () { scramble(code, '04/01', 380); }, 420));
            s.t.push(setTimeout(function () { code.classList.add('fl-april'); scramble(code, '1 APRIL', 380); }, 950));
          }, 380);
          s.t.push(iv);
        });
      });
    });
    later(8300, function () {
      if (s.term) go(s.term, [{ transform: 'scale(1,1)', opacity: 1 }, { transform: 'scale(1,.006)', opacity: 1 }], { duration: 200, easing: 'ease-in' });
      if (s.off) s.off.cancel();
      s.L.classList.remove('fl-black');
      go(s.stage, [{ transform: 'scale(.0,.006)' }, { transform: 'scale(1,.006)', offset: 0.4 }, { transform: 'scale(1,1)' }], { duration: 420, delay: 160, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' });
    });
    later(8900, reveal);
  }

  /* ---------- C: Possessed. The page stays, but every word turns on you, and touching it makes it worse. ---------- */
  var SWAP = [
    ['#hm-day-h', 'Your doom'], ['.hm-day-row .hm-t', 'Your sentence'], ['.hm-day-break .hm-t', 'Your breakdown'],
    ['.hm-day-break .hm-s', 'A chef has seen what you did'], ['.hm-tm', 'Never'], ['#hm-with .hm-pt', 'Onto you'],
    ['.hm-roster-caption', 'Lunch is you'], ['#hm-full-team summary', "View today's full scream"], ['#hm-prep .hm-pt', 'Prep by sedation'],
    ['.hm-pc', '6 of 0 done'], ['#hm-up-h', 'Coming for you'], ['.wall-foot', 'Cook as written. The head chef is watching.']
  ];
  var TABS = { Recipes: 'Regrets', Prep: 'Perp', Orders: 'Disorders', Wastage: 'Wasted', Transfers: 'Trespass', Cleaning: 'Screaming' };
  var SECS = { Pans: 'Pants', Grill: 'Grilled', Fryers: 'Friars', Larder: 'Ladder', Sauce: 'Saucy', Pass: 'Passed out' };

  function melt(e) {
    if (!e || e.dataset.flMelt) return;
    e.dataset.flMelt = '1';
    var t = e.textContent; e.textContent = '';
    Array.prototype.forEach.call(t, function (ch) {
      var c = mk('span', 'fl-ch', e, ch);
      c.style.setProperty('--dy', rnd(5, 26).toFixed(1) + 'px');
      c.style.setProperty('--sk', rnd(-16, 16).toFixed(1) + 'deg');
      c.style.setProperty('--sy', rnd(1.1, 1.8).toFixed(2));
      c.style.setProperty('--d', rnd(0, 0.7).toFixed(2) + 's');
      c.style.setProperty('--t', rnd(1.8, 3.2).toFixed(2) + 's');
    });
  }

  function tear(s) {
    if (s.flipped || s.over) return;
    for (var i = 0; i < 2; i++) {
      var top = rnd(4, 86), hgt = rnd(3, 11);
      var strip = mk('div', 'fl-strip', s.L);
      strip.style.clipPath = 'inset(' + top.toFixed(1) + '% 0 ' + Math.max(0, 100 - top - hgt).toFixed(1) + '% 0)';
      var c = s.app.cloneNode(true); c.removeAttribute('inert'); c.setAttribute('inert', '');
      strip.appendChild(c);
      var a = go(strip, [{ transform: 'translateX(0)' }, { transform: 'translateX(' + rnd(-60, 60).toFixed(0) + 'px)' }, { transform: 'translateX(' + rnd(-30, 30).toFixed(0) + 'px)' }, { transform: 'translateX(0)' }],
        { duration: rnd(220, 380), easing: 'steps(3)', fill: 'none' });
      (function (st) { if (a) a.onfinish = function () { st.remove(); }; })(strip);
    }
  }

  function dodge(s, x, y) {
    var pick = null;
    all('#hm-day, #hm-with, #hm-prep, .hm-up, .mascot, #rtitle, .wall-date, .tabbar a').some(function (e) {
      var r = e.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { pick = e; return true; }
      return false;
    });
    if (!pick) return;
    var r = pick.getBoundingClientRect(), dx = (r.left + r.width / 2) - x, dy = (r.top + r.height / 2) - y, l = Math.hypot(dx, dy) || 1, d = rnd(90, 150);
    go(pick, [{ transform: 'translate(0,0)' }, { transform: 'translate(' + (dx / l * d).toFixed(0) + 'px,' + (dy / l * d).toFixed(0) + 'px) rotate(' + rnd(-20, 20).toFixed(0) + 'deg)' }],
      { duration: 260, easing: 'cubic-bezier(.2,1.4,.4,1)', composite: 'add' });
  }

  function C(s) {
    s.step = 0;
    function invert() {
      if (s.step >= 1) return; s.step = 1;
      var v = mk('div', 'fl-inv', s.L);
      go(v, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 520 });
    }
    function flip() {
      if (s.step >= 2) return; invert(); s.step = 2; s.flipped = true;
      go(s.stage, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(180deg)' }], { duration: 700, easing: 'cubic-bezier(.3,1.35,.5,1)' });
    }
    function finish() {
      if (s.step >= 3) return; s.step = 3;
      if (s.psy) go(s.psy, [{ opacity: 0.6 }, { opacity: 0 }], { duration: 300 });
      if (s.flipped) {
        go(s.stage, [{ transform: 'rotate(180deg)' }, { transform: 'rotate(360deg)' }], { duration: 460, easing: 'cubic-bezier(.3,1.3,.5,1)' });
        s.t.push(setTimeout(reveal, 520));
      } else reveal();
    }
    s.onTap = function (e) {
      dodge(s, e.clientX, e.clientY);
      if (s.step === 0) invert(); else if (s.step === 1) flip(); else finish();
    };
    later(250, function () {
      s.L.classList.add('fl-rgb');
      s.jit = go(s.shake, [{ transform: 'translate(0,0)' }, { transform: 'translate(-2px,1px)' }, { transform: 'translate(1px,-1px)' }, { transform: 'translate(2px,1px)' }, { transform: 'translate(0,0)' }],
        { duration: 700, iterations: Infinity, easing: 'steps(1)' });
    });
    var jobs = [];
    jobs.push(function () { scramble(one('#rtitle'), 'I see you, ' + s.name + '.', 500); });
    jobs.push(function () { scramble(one('[data-home-date]'), 'Doomsday 1 April', 500); all('#hm-time, .hm-clock').forEach(function (e) { scramble(e, '13:13', 400); }); });
    SWAP.forEach(function (p) { jobs.push(function () { all(p[0]).forEach(function (e) { scramble(e, p[1], 450); }); }); });
    jobs.push(function () { var v = one('.hm-day-value'); if (v) scramble(v, SECS[v.textContent.trim()] || v.textContent.split('').reverse().join(''), 450); });
    jobs.push(function () { all('#hm-with .hm-tp b, .hm-sl').forEach(function (e) { scramble(e, e.classList.contains('hm-sl') ? 'no one left' : s.name, 450); }); });
    jobs.push(function () { all('.tabbar a span').forEach(function (e) { var t = TABS[e.textContent.trim()]; if (t) scramble(e, t, 450); }); var w = one('.wtop-who-n'); if (w) scramble(w, s.name.split('').reverse().join(''), 450); });
    jobs.forEach(function (f, i) { later(550 + i * 130, f); });
    later(1500, function () { s.hint = mk('div', 'fl-hint', s.L, "don't touch anything."); go(s.hint, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 }); });
    later(2300, function () { tear(s); every(650, function () { tear(s); }); });
    later(2500, function () {
      var m = one('.mascot');
      if (!m) return;
      m.classList.add('fl-evil');
      var r = m.getBoundingClientRect(), pts = [[0.55, 0.35], [0.15, 0.6], [0.7, 0.75], [0.35, 0.2]], kf = [{ transform: 'none' }];
      pts.forEach(function (p, i) {
        kf.push({ transform: 'translate(' + (innerWidth * p[0] - r.left).toFixed(0) + 'px,' + (innerHeight * p[1] - r.top).toFixed(0) + 'px) rotate(' + (i * 200 - 90) + 'deg) scale(' + (1.4 + i * 0.5) + ')' });
      });
      go(m, kf, { duration: 3600, easing: 'steps(12)' });
    });
    later(3400, function () { all('#hm-day-h, .hm-pt, .hm-t, .tabbar a span').forEach(melt); });
    later(3100, function () {
      s.psy = mk('div', 'fl-psy', s.L);
      go(s.psy, [{ opacity: 0, transform: 'rotate(0deg)' }, { opacity: 0.6, transform: 'rotate(120deg)', offset: 0.25 }, { opacity: 0.6, transform: 'rotate(480deg)' }], { duration: 6000 });
    });
    later(4400, invert);
    later(6000, flip);
    later(7600, finish);
  }

  /* Reduced motion (or Still): no copy, no layer. The mascot only says it. */
  function quiet(s) {
    var t = D.getElementById('rtitle');
    if (t) t.textContent = 'April Fools, ' + s.name + '. Nothing is broken today.';
    S = null;
  }

  var DESIGNS = { A: A, B: B, C: C };

  function stop() {
    var s = S;
    if (!s) return;
    s.over = true;
    s.t.forEach(clearTimeout);
    if (s.L) s.L.remove();
    if (s.close) s.close();
    D.removeEventListener('keydown', s.key);
    S = null;
  }

  function play(design, o) {
    stop();
    D.querySelectorAll('.fl-reveal').forEach(function (e) { e.remove(); });
    o = o || {};
    var name = String(o.name || 'Ann').trim() || 'Ann';
    S = { t: [], name: name, lower: name.toLowerCase(), upper: name.toUpperCase(), design: design };
    if (o.reduced || W.matchMedia('(prefers-reduced-motion: reduce)').matches) { quiet(S); return; }
    pageCopy();
    var s = S;
    s.L.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); if (s.onTap) s.onTap(e); else reveal(); });
    s.key = function (e) { if (e.key === 'Escape') reveal(); };
    D.addEventListener('keydown', s.key);
    DESIGNS[design](s);
  }

  W.FOOLS = { play: play, stop: stop };
})();
