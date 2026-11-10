/* The kitchen mascot on Home (owner, 9 Nov 2026; docs/kitchen-mascot.md).
   Loaded by js/app.js only when a named person opens Home. Not in the saved shell.
   Each person has their own shuffled set of all 11 actions, kept on this device. On the first Home view
   of the kitchen day where it can play, today's action plays once at the right end of the Welcome row,
   then the mascot rests on the Welcome pose. A tap replays today's action and never draws a new one.
   No reads, no writes, nothing over a list. The full name always wins: when the words fill the corner it stands on
   the Your day card, then the heading keeps it room; only a name that cannot wrap leaves it out.
   Since 10 Nov 2026 js/prep.js also loads this file for the finished prep list: sprite() below is a still mascot
   that can play one action once. */
(function () {
  'use strict';
  // Home and the finished prep list each ask for this file. A second run would replace LK_MASCOT and lose hold of
  // a mascot already on Home, so a copy that is already here with sprite() stays.
  if (window.LK_MASCOT && typeof window.LK_MASCOT.sprite === 'function') return;
  var API = 1, KEY = 'lk.mascot.', ART = 'art/mascot/', V = '?v=1';
  // Frame times (ms) for the 8 frames of each 4 x 2 sheet of 192 x 256 px poses.
  var CLIPS = {
    idle: [1400, 180, 160, 280, 400, 250, 180, 950], welcome: [800, 160, 200, 160, 200, 280, 200, 700],
    'look-around': [900, 230, 400, 180, 230, 400, 180, 800], 'recipe-reading': [700, 250, 450, 450, 400, 350, 250, 800],
    'ready-to-cook': [900, 200, 300, 400, 300, 250, 200, 700], smash: [650, 250, 240, 350, 350, 300, 350, 1100],
    flip: [650, 220, 120, 140, 120, 200, 230, 1000], build: [600, 350, 350, 350, 350, 350, 350, 1200],
    burger: [1000, 140, 180, 260, 420, 300, 180, 700], walk: [500, 160, 160, 160, 160, 200, 250, 900],
    smoker: [1000, 250, 250, 400, 500, 300, 250, 850]
  };
  var ALL = Object.keys(CLIPS);
  var reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var memo = {}, cur = null;

  // A seeded shuffle, so the order is the same for a person and day on any run of the page.
  function rng(seed) {
    var h = 2166136261, i;
    for (i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    return function () { h += 0x6D2B79F5; var t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffle(list, seed) { var out = list.slice(), r = rng(seed), i, j, x; for (i = out.length - 1; i > 0; i--) { j = Math.floor(r() * (i + 1)); x = out[i]; out[i] = out[j]; out[j] = x; } return out; }
  function blank() { return { bag: [], last: '', day: '', today: '', played: false }; }
  // Saved on this device, one record per staff id: the actions still to come this round, the last one shown,
  // the kitchen day it was drawn and whether it has played. Never out of date: the day stamp only gates a new draw.
  // If the phone refuses storage, the record lives in this page's memory so a return to Home stays still.
  function load(id) {
    var r = null;
    try { r = JSON.parse(localStorage.getItem(KEY + id) || 'null'); } catch (e) { r = null; }
    if (r && Array.isArray(r.bag) && r.bag.every(function (x) { return ALL.indexOf(x) >= 0; }) && (!r.today || ALL.indexOf(r.today) >= 0)) return r;
    return memo[id] ? JSON.parse(JSON.stringify(memo[id])) : blank();
  }
  function save(id, r) { memo[id] = JSON.parse(JSON.stringify(r)); try { localStorage.setItem(KEY + id, JSON.stringify(r)); } catch (e) {} }
  // Today's action: a new kitchen day takes the next one from the set. An empty set reshuffles all 11
  // and never starts with the action shown last, so no action shows two days running.
  function draw(id, day, rec) {
    if (rec.day === day && rec.today) return rec;
    if (!rec.bag.length) { var bag = shuffle(ALL, id + '|' + day); if (bag[0] === rec.last) bag.push(bag.shift()); rec.bag = bag; }
    rec.today = rec.bag.shift(); rec.last = rec.today; rec.day = day; rec.played = false;
    return rec;
  }
  function today() { return window.LK_TIME.day(); }
  function image(file, ok, no) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = no; i.src = ART + file + V; return i; }

  function textBoxes(el) {
    var out = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), t, r;
    while ((t = w.nextNode())) { if (!t.textContent.trim()) continue; r = document.createRange(); r.selectNodeContents(t); out.push.apply(out, r.getClientRects()); }
    return out;
  }
  // Where the mascot fits: the right end of the Welcome row, standing on the date line, under the top bar and
  // above the first card. The largest whole-pixel size that clears every word of the name and date.
  function clashes(words, left, w, top, bottom, gap) {
    return words.some(function (r) { return r.right > left - gap && r.left < left + w + gap && r.bottom > top && r.top < bottom; }) ||
      Array.prototype.some.call(document.querySelectorAll('.kb-hang-item'), function (e) { var r = e.getBoundingClientRect(); return r.width && r.left < left + w && r.right > left && r.top < bottom && r.bottom > top; });
  }
  function corner(host) {
    var h = host.querySelector('#rtitle.hm-welcome'), d = host.querySelector('.wall-date');
    if (!h || !d) return null;
    var next = d.nextElementSibling, hb = h.getBoundingClientRect(), db = d.getBoundingClientRect(), mb = host.getBoundingClientRect();
    var bar = document.querySelector('.wtop'), top = bar ? bar.getBoundingClientRect().bottom + 4 : mb.top;
    var bottom = Math.min(db.bottom + 4, next ? next.getBoundingClientRect().top - 4 : db.bottom + 4), words = textBoxes(h).concat(textBoxes(d));
    var sizes = [64, 48], i, w, ht, left;
    for (i = 0; i < sizes.length; i++) {
      w = sizes[i]; ht = w * 4 / 3; left = hb.right - w;
      if (bottom - ht < top) continue;
      if (!clashes(words, left, w, bottom - ht, bottom, 12)) return { w: w, left: left - mb.left, top: bottom - ht - mb.top };
    }
    return null;
  }
  /* When the welcome words fill the corner (owner, 10 Nov 2026, B): standing on the Your day card's header line,
     left of its clock, peeking over the card's top edge. Nothing on Home moves. 48 x 64 px, or 44 x 59 px, which
     stays under the date line when a long date ("Wednesday 30 September") reaches across. Clear of every word of the
     welcome, the date and the card's title, the card's pin, the top bar and seasonal ornaments. */
  function onCard(host) {
    var card = host.querySelector('#hm-day'), h = host.querySelector('#rtitle.hm-welcome'), d = host.querySelector('.wall-date');
    if (!card || card.hidden || !h || !d) return null;
    var head = card.querySelector('.hm-bh'), clock = card.querySelector('.hm-clock'), title = card.querySelector('.hm-bt');
    if (!head || !clock || !title) return null;
    var cb = card.getBoundingClientRect(), hd = head.getBoundingClientRect(), ck = clock.getBoundingClientRect(), mb = host.getBoundingClientRect();
    var bar = document.querySelector('.wtop'), words = textBoxes(h).concat(textBoxes(d), textBoxes(title)), sizes = [48, 44], i, w, ht, left, top;
    var bottom = hd.bottom + 2;
    for (i = 0; i < sizes.length; i++) {
      w = sizes[i]; ht = Math.round(w * 4 / 3); left = ck.left - 12 - w; top = bottom - ht;
      if (bar && top < bar.getBoundingClientRect().bottom + 4) continue;
      if (left < cb.left + cb.width / 2 + 24) continue;
      // 6 px, not the corner's 12: beside the card only its head can reach the date line.
      if (!clashes(words, left, w, top, bottom, 6)) return { w: w, left: left - mb.left, top: top - mb.top, spot: 'card' };
    }
    return null;
  }
  /* The corner first, then the card. When neither fits (a long date at a large text size), the heading and date keep
     room for the mascot (A): their words wrap before the corner. Only when even that fails is it left out,
     so the full name always wins. The room is checked by measuring without it, so a resize never loops. */
  function room(host, on) { Array.prototype.forEach.call(host.querySelectorAll('#rtitle, .wall-date'), function (e) { e.classList.toggle('mascot-room', on); }); }
  function fit(host) {
    var f;
    room(host, false);
    f = corner(host) || onCard(host);
    if (f || !host.querySelector('#rtitle.hm-welcome')) return f;
    room(host, true);
    f = corner(host);
    if (f) { f.spot = 'room'; return f; }
    room(host, false);
    return null;
  }

  function Mascot(host, id) {
    var self = this, btn = document.createElement('button'), cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    var timer = null, sheets = {}, rests = {}, playing = false, busy = false, frame = 0, clip = '', plays = 0, gone = false, holdTimer = null, io = null, ro = null;
    btn.type = 'button'; btn.className = 'mascot'; btn.setAttribute('aria-label', 'Kitchen mascot, play again');
    cv.width = 192; cv.height = 256; btn.appendChild(cv);
    function paintImg(img, f) {
      if (gone || !ctx) return;
      ctx.clearRect(0, 0, 192, 256); ctx.imageSmoothingEnabled = false;
      if (f == null) ctx.drawImage(img, 0, 0, 192, 256); else ctx.drawImage(img, (f % 4) * 192, Math.floor(f / 4) * 256, 192, 256, 0, 0, 192, 256);
      btn.setAttribute('data-frame', f == null ? 'rest' : String(f));
    }
    function stop() { if (timer) clearTimeout(timer); timer = null; }
    function rest() { stop(); playing = false; btn.setAttribute('data-state', 'rest'); if (rests.welcome) paintImg(rests.welcome); }
    function still(name, ok) { if (rests[name]) return ok(rests[name]); image(name + '-still.png', function (i) { rests[name] = i; ok(i); }, function () { ok(null); }); }
    function tick() {
      if (gone || !playing) return;
      if (document.hidden) { rest(); return; }
      timer = setTimeout(function () {
        if (frame >= 7) {
          rest();
          var r = load(id); if (r.today === clip && r.day === today() && !r.played) { r.played = true; save(id, r); }
          return;
        }
        frame++; paintImg(sheets[clip], frame); tick();
      }, CLIPS[clip][frame]);
    }
    // One pass of today's action. Reduced motion shows its pose for a moment instead (on a tap only).
    function play(name, tapped) {
      if (gone || playing || busy) return;
      if (reduced.matches) {
        if (!tapped) return;
        clearTimeout(holdTimer); still(name, function (i) { if (!i || gone) return; paintImg(i); btn.setAttribute('data-state', 'still');
          holdTimer = setTimeout(function () { if (!playing) rest(); }, 2000); });
        return;
      }
      if (document.hidden) return;
      busy = true;
      function go(sheet) {
        busy = false; if (gone || !sheet) return;
        sheets[name] = sheet; clip = name; frame = 0; playing = true; plays++; btn.setAttribute('data-state', 'playing'); paintImg(sheet, 0); tick();
      }
      if (sheets[name]) go(sheets[name]); else image(name + '-sheet-compact.webp', go, function () { busy = false; });
    }
    function onVis() { if (document.hidden && playing) rest(); }
    function onTap() {
      var d = today(), r = load(id);
      if (r.day !== d) { r = draw(id, d, r); save(id, r); }
      play(r.today, true);
    }
    btn.addEventListener('click', onTap);
    document.addEventListener('visibilitychange', onVis);
    this.id = id; this.host = host;
    this.place = function () {
      var f = fit(host);
      if (!f) { btn.hidden = true; if (playing) rest(); return false; }
      btn.hidden = false; btn.setAttribute('data-spot', f.spot || 'corner'); btn.style.width = f.w + 'px'; btn.style.height = (f.w * 4 / 3) + 'px'; btn.style.left = f.left + 'px'; btn.style.top = f.top + 'px';
      return true;
    };
    this.start = function () {
      host.classList.add('mascot-host'); host.appendChild(btn);
      if (!self.place()) { btn.hidden = true; }
      if ('IntersectionObserver' in window) { io = new IntersectionObserver(function (e) { if (!e[0].isIntersecting && playing) rest(); }); io.observe(btn); }
      if ('ResizeObserver' in window) { ro = new ResizeObserver(function () { self.place(); }); ro.observe(host); }
      // The rest pose comes first. Missing art leaves Home exactly as it was, with no retry from this view.
      still('welcome', function (i) {
        if (gone) return;
        if (!i) { self.dispose(); return; }
        paintImg(i); btn.setAttribute('data-state', 'rest');
        if (btn.hidden) return;
        var d = today(), r = load(id);
        if (r.day !== d) { r = draw(id, d, r); save(id, r); }
        if (!r.played) play(r.today, false);
      });
    };
    this.state = function () { return { id: id, clip: clip, frame: frame, playing: playing, plays: plays, scheduled: !!timer, hidden: btn.hidden, mounted: btn.isConnected, rest: btn.getAttribute('data-state') }; };
    this.dispose = function () {
      gone = true; stop(); clearTimeout(holdTimer); if (io) io.disconnect(); if (ro) ro.disconnect();
      document.removeEventListener('visibilitychange', onVis); btn.removeEventListener('click', onTap);
      if (btn.parentNode) btn.parentNode.removeChild(btn); host.classList.remove('mascot-host');
      room(host, false);
    };
  }

  /* A still mascot that can play one action once (the finished prep list, owner 10 Nov 2026). Not a control: a
     span with a canvas, hidden from screen readers, sized by the place it is put in. It rests on the Welcome pose.
     play() answers false, and the pose stays, under reduced motion, on a hidden tab, off the page or with no art.
     The page it stands in is redrawn often: the span is moved into the new markup, so a play is never cut or
     started again by a redraw, and it ends by itself when the span is no longer on the page. */
  var lastSprite = null;
  function Sprite() {
    var el = document.createElement('span'), cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    var timer = null, sheets = {}, restImg = null, playing = false, busy = false, frame = 0, clip = '', plays = 0, gone = false, failed = false, atEnd = null, wanted = null;
    el.className = 'mascot-still'; el.setAttribute('aria-hidden', 'true'); cv.width = 192; cv.height = 256; el.appendChild(cv);
    function paintImg(img, f) {
      if (gone || !ctx) return;
      ctx.clearRect(0, 0, 192, 256); ctx.imageSmoothingEnabled = false;
      if (f == null) ctx.drawImage(img, 0, 0, 192, 256); else ctx.drawImage(img, (f % 4) * 192, Math.floor(f / 4) * 256, 192, 256, 0, 0, 192, 256);
      el.setAttribute('data-frame', f == null ? 'rest' : String(f));
    }
    function stop() { if (timer) clearTimeout(timer); timer = null; }
    function rest() { stop(); playing = false; atEnd = null; el.setAttribute('data-state', failed ? 'no-art' : 'rest'); if (restImg) paintImg(restImg); }
    function step() {
      if (gone || !playing) return;
      if (document.hidden || !el.isConnected) { rest(); return; }
      timer = setTimeout(function () {
        if (!el.isConnected) { rest(); return; }
        if (frame >= 7) { var end = atEnd; rest(); if (end) end(); return; }
        frame++; paintImg(sheets[clip], frame); step();
      }, CLIPS[clip][frame]);
    }
    // One pass of an action, then the Welcome pose. onEnd runs only when the pass reached its last frame.
    // Asked before the Welcome pose has loaded, it waits for the pose and plays then.
    function play(name, onEnd) {
      if (gone || playing || busy || failed || wanted || !CLIPS[name] || reduced.matches || document.hidden || !el.isConnected) return false;
      if (!restImg) { wanted = [name, onEnd]; return true; }
      busy = true;
      function go(sheet) {
        busy = false; if (gone || !sheet || document.hidden || !el.isConnected) return;
        sheets[name] = sheet; clip = name; frame = 0; playing = true; plays++; atEnd = onEnd || null; el.setAttribute('data-state', 'playing'); paintImg(sheet, 0); step();
      }
      if (sheets[name]) go(sheets[name]); else image(name + '-sheet-compact.webp', go, function () { busy = false; });
      return true;
    }
    function onVis() { if (document.hidden && playing) rest(); }
    document.addEventListener('visibilitychange', onVis);
    // Missing art hides the span and leaves the words beside it as they are.
    image('welcome-still.png', function (i) { if (gone) return; restImg = i; if (!playing) rest(); if (wanted) { var w = wanted; wanted = null; play(w[0], w[1]); } },
      function () { failed = true; wanted = null; el.hidden = true; el.setAttribute('data-state', 'no-art'); });
    return {
      el: el, play: play,
      state: function () { return { clip: clip, frame: frame, playing: playing, plays: plays, scheduled: !!timer, failed: failed, mounted: el.isConnected, rest: el.getAttribute('data-state') }; },
      dispose: function () { gone = true; stop(); document.removeEventListener('visibilitychange', onVis); if (el.parentNode) el.parentNode.removeChild(el); }
    };
  }

  function mount(app, person) {
    var host = app.querySelector('#main.wall-main');
    if (!person || !person.id || !host || !host.querySelector('#rtitle.hm-welcome')) { unmount(); return; }
    if (cur && cur.id === person.id && cur.host === host && cur.state().mounted) { cur.place(); return; }
    unmount(); cur = new Mascot(host, person.id); cur.start();
  }
  function unmount() { if (cur) cur.dispose(); cur = null; }
  window.LK_MASCOT = {
    api: API, mount: mount, unmount: unmount,
    sprite: function () { lastSprite = Sprite(); return lastSprite; },
    state: function () { return cur ? cur.state() : null; },
    // For the click tests: the last still mascot made by sprite().
    stillState: function () { return lastSprite ? lastSprite.state() : null; },
    record: function (id) { return load(id); },
    // For the click tests: the order a person would see over n kitchen days, without touching saved data.
    order: function (id, n) { var r = blank(), out = [], i; for (i = 0; i < n; i++) { r = draw(id, 'd' + i, r); out.push(r.today); } return out; },
    actions: ALL.slice()
  };
})();
