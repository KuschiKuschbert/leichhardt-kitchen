/* Draws the tutorial chalkboard (docs/tutorial-videos.md). compose.mjs calls window.stage.render(state) and takes a
   picture, or films the intro and outro while they play. state: { cut: 'desktop'|'phone', mode: 'back'|'front'|'intro'
   |'outro'|'chapter', title, sub, steps: [titles], now: index, caption, next, credit }. */
(function () {
  'use strict';
  var ART = '../../../art/mascot/';
  // Frame times (ms) of the mascot's 8-frame sheets (4 x 2 poses of 192 x 256 px), from js/mascot.js.
  var CLIPS = { welcome: [800, 160, 200, 160, 200, 280, 200, 700], 'ready-to-cook': [900, 200, 300, 400, 300, 250, 200, 700], idle: [1400, 180, 160, 280, 400, 250, 180, 950] };
  var LAYOUT = {
    desktop: {
      W: 1920, H: 1080,
      slot: { x: 224, y: 114, w: 1472, h: 828, r: 12 }, bezel: 14,   // 1280 x 720 at 1.15; both even, as H.264 needs
      caption: { x: 224, y: 958, w: 1472, h: 108, size: 31 },
      title: { x: 228, y: 22, size: 62 }, now: { right: 228, y: 30, size: 44 },
      brand: { x: 30, y: 34 }, steps: { x: 28, y: 118, w: 172 },
      mascot: { x: 1742, y: 800, s: 0.72 }
    },
    phone: {
      W: 1080, H: 1920,
      slot: { x: 207, y: 236, w: 666, h: 1440, r: 40 }, bezel: 20,
      caption: { x: 50, y: 1706, w: 980, h: 196, size: 42 },
      title: { center: true, y: 46, size: 96 }, now: { center: true, y: 158, size: 54 },
      mascot: { x: 902, y: 1508, s: 0.66 }
    }
  };

  function seeded(n) { var s = n; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  // The board: dark slate, lighter in the middle, a fine grain and the ghosts of wiped-off chalk.
  function board(W, H) {
    var c = document.getElementById('board'), x = c.getContext('2d'), r = seeded(42);
    c.width = W; c.height = H;
    var g = x.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    g.addColorStop(0, '#2B3832'); g.addColorStop(1, '#18211D');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.filter = 'blur(14px)';
    for (var i = 0; i < 26; i++) {
      x.strokeStyle = 'rgba(243,239,228,' + (0.015 + r() * 0.03) + ')';
      x.lineWidth = 30 + r() * 90;
      x.beginPath();
      var cx = r() * W, cy = r() * H, rad = 120 + r() * 420, a0 = r() * 6.28;
      x.arc(cx, cy, rad, a0, a0 + 0.6 + r() * 1.6);
      x.stroke();
    }
    x.filter = 'none';
    var img = x.getImageData(0, 0, W, H), d = img.data;
    for (var p = 0; p < d.length; p += 4) { var n = (r() - 0.5) * 14; d[p] += n; d[p + 1] += n; d[p + 2] += n; }
    x.putImageData(img, 0, 0);
  }

  function el(tag, cls, css, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (css) Object.assign(e.style, css);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function px(n) { return n + 'px'; }

  // A mascot pose: one frame of a sheet, or the sheet played through once with its own timing.
  function mascot(sheet, s, x, y, play, then) {
    var m = el('div', 'mascot', { left: px(x), top: px(y), width: px(192 * s), height: px(256 * s), backgroundImage: 'url(' + ART + sheet + '-sheet-compact.webp)', backgroundSize: px(768 * s) + ' ' + px(512 * s) });
    function show(f) { m.style.backgroundPosition = px(-(f % 4) * 192 * s) + ' ' + px(-Math.floor(f / 4) * 256 * s); }
    show(0);
    if (play) {
      var f = 0, clip = CLIPS[sheet];
      (function next() {
        if (f >= 7) { if (then) { m.style.backgroundImage = 'url(' + ART + then + '-sheet-compact.webp)'; sheet = then; clip = CLIPS[then]; f = 0; show(0); setTimeout(next, clip[0]); } return; }
        f++; show(f); setTimeout(next, clip[f]);
      })();
    }
    return m;
  }

  function back(L, s, root) {
    var sl = L.slot, b = L.bezel;
    root.appendChild(el('div', 'wood'));
    root.appendChild(el('div', s.cut === 'phone' ? 'phone' : 'screen', { left: px(sl.x - b), top: px(sl.y - b), width: px(sl.w + 2 * b), height: px(sl.h + 2 * b), borderRadius: px(sl.r + b) }));
    root.appendChild(el('div', 'slot', { left: px(sl.x), top: px(sl.y), width: px(sl.w), height: px(sl.h), borderRadius: px(sl.r) }));
    var t = el('div', 'title hand chalk', { fontSize: px(L.title.size), top: px(L.title.y) }, esc(s.title));
    if (L.title.center) Object.assign(t.style, { left: 0, right: 0, textAlign: 'center' }); else t.style.left = px(L.title.x);
    root.appendChild(t);
    var steps = s.steps || [];
    if (s.now >= 0 && steps[s.now]) {
      var n = el('div', 'step-now hand chalk', { fontSize: px(L.now.size), top: px(L.now.y) }, '<small style="font-size:' + px(Math.round(L.now.size * 0.42)) + '">STEP ' + (s.now + 1) + ' OF ' + steps.length + '</small>&ensp;' + esc(steps[s.now]));
      if (L.now.center) Object.assign(n.style, { left: 0, right: 0, textAlign: 'center' }); else n.style.right = px(L.now.right);
      root.appendChild(n);
    }
    if (L.brand) root.appendChild(el('div', 'brand', { left: px(L.brand.x), top: px(L.brand.y) }, '<b>KB</b>'));
    if (L.steps && steps.length) {
      var ol = el('ol', 'steps', { left: px(L.steps.x), top: px(L.steps.y), width: px(L.steps.w) });
      steps.forEach(function (name, i) {
        ol.appendChild(el('li', i < s.now ? 'done' : i === s.now ? 'now' : '', null, '<i><span>' + (i + 1) + '</span></i><b>' + esc(name) + '</b>'));
      });
      root.appendChild(ol);
    }
    var c = L.caption, cap = el('div', 'caption', { left: px(c.x), top: px(c.y), width: px(c.w), height: px(c.h), fontSize: px(c.size) }, s.caption ? '<span>' + esc(s.caption) + '</span>' : '');
    root.appendChild(cap);
    var m = L.mascot;
    root.appendChild(mascot('idle', m.s, m.x, m.y, false));
  }

  // The bezel round the picture, with a hole the picture shows through (taken with a clear background).
  function front(L, s, root) {
    var sl = L.slot, b = L.bezel;
    var ring = el('div', '', { position: 'absolute', overflow: 'hidden', left: px(sl.x - b), top: px(sl.y - b), width: px(sl.w + 2 * b), height: px(sl.h + 2 * b), borderRadius: px(sl.r + b), boxShadow: '0 0 0 3px rgba(243,239,228,.45)' });
    ring.appendChild(el('div', 'hole', { left: px(b), top: px(b), width: px(sl.w), height: px(sl.h), '--hole-r': px(sl.r) }));
    root.appendChild(ring);
    if (s.cut === 'phone') root.appendChild(el('div', '', { position: 'absolute', left: px(sl.x + sl.w / 2 - 55), top: px(sl.y - b + 7), width: '110px', height: '6px', borderRadius: '3px', background: '#2a2d2c' }));
  }

  // The intro (mascot waves, the page's name is written on), a chapter card, and the outro (mascot ready to cook).
  function card(L, s, root) {
    root.appendChild(el('div', 'wood'));
    var phone = s.cut === 'phone', c = el('div', 'card');
    var box = el('div', '', { display: 'grid', justifyItems: 'center', gap: phone ? '28px' : '20px', textAlign: 'center' });
    var big = el('div', 'big hand chalk write', { fontSize: phone ? '150px' : '170px', '--delay': '.5s' }, esc(s.title));
    var rule = el('div', 'rule', { width: phone ? '520px' : '640px', '--delay': '1.4s' });
    var sub = s.sub ? el('div', 'sub fade', { fontSize: phone ? '46px' : '44px', '--delay': '1.7s', maxWidth: phone ? '900px' : '1200px' }, esc(s.sub)) : null;
    var next = s.next ? el('div', 'next hand chalk fade', { fontSize: phone ? '70px' : '64px', '--delay': '1.9s' }, 'Next up: ' + esc(s.next)) : null;
    var pose = s.mode === 'outro' ? 'ready-to-cook' : 'welcome', ms = phone ? 2.3 : 2.0;
    var mas = mascot(pose, ms, 0, 0, true, 'idle');
    mas.style.position = 'relative';
    if (phone) {
      [mas, big, rule, sub, next].forEach(function (x) { if (x) box.appendChild(x); });
      c.appendChild(box);
    } else {
      var row = el('div', '', { display: 'flex', alignItems: 'center', gap: '70px' });
      var words = el('div', '', { display: 'grid', justifyItems: 'start', gap: '22px', textAlign: 'left' });
      big.style.textAlign = 'left';
      [big, rule, sub, next].forEach(function (x) { if (x) { x.style.textAlign = 'left'; words.appendChild(x); } });
      row.appendChild(mas); row.appendChild(words);
      c.appendChild(row);
    }
    if (s.credit) c.appendChild(el('div', 'credit fade', { bottom: phone ? '60px' : '40px', '--delay': '2.2s', padding: '0 60px' }, esc(s.credit)));
    root.appendChild(c);
  }

  var drawn = null;
  window.stage = {
    render: function (s) {
      var L = LAYOUT[s.cut];
      document.body.className = s.mode === 'front' ? 'transparent' : '';
      document.documentElement.style.background = s.mode === 'front' ? 'transparent' : '';
      if (drawn !== s.cut && s.mode !== 'front') { board(L.W, L.H); drawn = s.cut; }
      var root = document.getElementById('stage');
      root.innerHTML = '';
      root.style.width = px(L.W); root.style.height = px(L.H);
      if (s.mode === 'back') back(L, s, root);
      else if (s.mode === 'front') front(L, s, root);
      else if (s.mode === 'blank') root.appendChild(el('div', 'wood'));
      else card(L, s, root);
      var imgs = [].slice.call(root.querySelectorAll('.mascot')).map(function (m) {
        return new Promise(function (r) { var i = new Image(); i.onload = i.onerror = r; i.src = m.style.backgroundImage.slice(5, -2); });
      });
      return Promise.all([document.fonts.ready].concat(imgs)).then(function () {
        // a long name ("That's the Transfer list") is made smaller until it fits inside the frame
        [].slice.call(root.querySelectorAll('.big, .title')).forEach(function (t) {
          var room = s.cut === 'phone' || t.classList.contains('title') && L.title.center ? L.W - 120 : (t.classList.contains('title') ? L.slot.w * 0.6 : L.W - 760);
          var size = parseFloat(getComputedStyle(t).fontSize), words = document.createRange();
          t.style.whiteSpace = 'nowrap';
          // the width of the words themselves: a centred title's box is as wide as the frame
          words.selectNodeContents(t);
          while (words.getBoundingClientRect().width > room && size > 30) { size -= 4; t.style.fontSize = px(size); }
        });
        return L;
      });
    },
    layout: LAYOUT
  };
})();
