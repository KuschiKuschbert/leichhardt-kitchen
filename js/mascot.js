/* The kitchen mascot on Home (owner, 9 Nov 2026; docs/kitchen-mascot.md).
   Loaded by js/app.js only when a named person opens Home. Not in the saved shell.
   Each person has their own shuffled set of all 11 actions, kept on this device. On the first Home view
   of the kitchen day where it can play, today's action plays once, then the mascot rests on the Welcome pose.
   A tap replays today's action and never draws a new one. No reads, no writes, nothing over a list.
   Since 17 Nov 2026 he says the welcome: he stands left of the heading, which js/app.js draws as his speech bubble.
   Where that cannot be (an older js/app.js, no room under the top bar) he takes his older places: the right end
   of the Welcome row, then the Your day card, then room kept in the heading; only a name that cannot wrap leaves
   him out.
   Since 10 Nov 2026 js/prep.js also loads this file for the finished prep list: sprite() below is a still mascot
   that can play one action once.
   Since 17 Nov 2026 he wears a festive hat on Home on a few celebration days (Festive hats on Home, below). */
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
  // His art failed to load on this page: js/app.js then draws the plain welcome until the signal comes back.
  var artOff = false;
  window.addEventListener('online', function () { artOff = false; });

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

  /* Festive hats on Home (head chef, 17 Nov 2026; docs/kitchen-mascot.md, Festive hats on Home). js/app.js says which
     hat today wears, by the welcome's own rule for the day; only the mascot on Home wears it, from the first frame of
     his play to his rest pose. Under a finished prep list (Sprite, below) he keeps his work clothes. Each hat is a small
     pixel map drawn here, 4 px a pixel like his art, so there is no file to fail; it sits on the top point of his star
     as HEAD measured it for each picture, leans with him and keeps inside his frame. */
  var INK = { k: '#141418', r: '#ce2030', R: '#961422', w: '#faf8f0', W: '#d6d2c8', y: '#fac828', o: '#f08214' };
  var HATS = {
    // Christmas Eve, Christmas Day and Boxing Day: a Santa hat flopping to the left, away from his chimney
    santa: { seat: [36, 48], drop: 24, rows: ['......kkkkk.....', '....kkrrrrrkk...', '...krrrrrrrrrk..', '..krrrrrrrrrrk..', 'kkkrrkrrrrrrrrk.',
      'kwwkk.krrrrrrrk.', 'kwwwk.krrrrrrRk.', '.kkk.krrrrrrrRk.', '...kkwwwwwwwwwkk', '..kwwwwwwwwwwwwk', '..kwwWwwwWwwwWwk', '...kkkkkkkkkkkk.'] },
    // New Year's Eve and New Year's Day: a striped party cone with a pompom
    party: { seat: [36, 48], drop: 22, rows: ['.......kk.......', '......kyyk......', '.......kk.......', '......kook......', '......kyyk......', '.....kooook.....',
      '.....kyyyyk.....', '....koooooook...', '....kyyyyyyyk...', '...kooooooooook.', '...kyyyyyyyyyyk.', '....kkkkkkkkkk..'] }
  };
  // The art's version HEAD was measured on: art with a new ?v= wears no hat until the script measures it again.
  var HEAD_ART = '?v=1';
  // HEAD points start: made by scripts/mascot-head-points.py from the art, never by hand. Per action, frames 0 to 7
  // of its sheet, then its still: his size against the Welcome still, then [x, y of his star's top point, lean].
  var HEAD_SUM = 'd3212a96b513fc14dc62a6ab197a9e9f31f29fc4552b3beb6f554ec62189e4f1', HEAD = {
    'idle': [1,[99.4,26,0.6],[99.2,25,0.6],[99.2,25,0.5],[99.4,26,1],[99.2,26,0.5],[99.5,26,-0.1],[98.9,26,0],[99.2,26,0.4],[99.4,26,0.6]],
    'welcome': [1,[98.7,27,-0.5],[99.4,27,-0.8],[99.4,27,-3.1],[99.4,27,-2.1],[99.2,27,-3],[99.2,27,-2.5],[99.4,27,-1],[99.4,27,0.1],[98.7,27,-0.5]],
    'look-around': [1,[99.5,26,0.3],[98.4,26,-0.7],[99.2,26,-4.6],[99.5,26,0.4],[98.8,26,0],[99.6,26,5.9],[98.7,26,-0.2],[99.4,26,0.3],[99.5,26,0.3]],
    'recipe-reading': [1,[98.4,26,0.3],[98,26,0.2],[98.3,26,-0.2],[98.6,26,1],[98.8,26,0.9],[98.3,26,2.3],[98.6,26,0.6],[98.6,26,0.5],[98.4,26,0.3]],
    'ready-to-cook': [1,[99.5,28,0.8],[100.5,27,1.4],[100.8,27,0.8],[99.6,27,-0.8],[100.6,27,0.4],[98.8,32,-3.6],[99.4,27,0.2],[99.2,27,0.2],[99.5,28,0.8]],
    'smash': [1,[87.8,28,3.3],[87.9,29,4.6],[88.3,30,3.4],[87.7,38,2],[87.4,36,1.2],[88.1,29,2.8],[87,27,2.7],[85.9,30,1.4],[87.8,28,3.3]],
    'flip': [0.95,[85.8,30,2.5],[85.5,30,3.1],[85.8,30,3.5],[85.4,30,1.7],[86.1,30,3.7],[85.7,30,3.4],[85.3,30,1.7],[86,30,2.6],[85.8,30,2.5]],
    'build': [1,[99.4,27,1.1],[97,26,-0.1],[96.8,26,0.2],[97.5,24,0.3],[98.3,24,1.3],[98.2,24,0.7],[97.7,24,0.1],[98.2,24,-0.3],[99.4,27,1.1]],
    'burger': [1,[98,27,0],[97.9,29,-0.4],[98.5,26,0.2],[97.2,22,-2.1],[98.3,22,-0.6],[99,25,-1.1],[98,25,-1.2],[98.3,27,0.2],[98,27,0]],
    'walk': [0.9,[89.7,34,1.5],[89.7,34,-0.5],[74,35,-1.9],[74.3,34,-1.5],[100.6,34,-0.6],[102.8,34,-1.2],[88.6,34,-0.4],[90,33,-0.5],[89.7,34,1.5]],
    'smoker': [0.7,[56.3,60,0.7],[56.1,61,0.7],[56.4,61,3.8],[54.8,61,0.7],[56.4,60,1.6],[56.5,60,3.6],[55.7,60,0.7],[56,60,2],[56.3,60,0.7]]
  };
  // HEAD points end
  var hatArt = {};
  function hatPic(name) {
    if (hatArt[name]) return hatArt[name];
    var h = HATS[name], c = document.createElement('canvas'), x = c.getContext('2d'), i, j;
    c.width = h.rows[0].length * 4; c.height = h.rows.length * 4;
    if (x) for (j = 0; j < h.rows.length; j++) for (i = 0; i < h.rows[j].length; i++) if (INK[h.rows[j][i]]) { x.fillStyle = INK[h.rows[j][i]]; x.fillRect(i * 4, j * 4, 4, 4); }
    return (hatArt[name] = c);
  }
  // The hat on picture f (0 to 7 of the action's sheet, 8 its still). A picture HEAD does not know wears none.
  function hatDraw(ctx, name, action, f) {
    var h = HATS[name], row = HEAD[action], p = row && row[f + 1];
    if (!h || !p || V !== HEAD_ART) return;
    var s = row[0], seatY = p[1] + h.drop * s, top = seatY - h.seat[1] * s;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.translate(p[0], seatY - Math.min(0, Math.floor(top)));
    ctx.rotate(p[2] * Math.PI / 180); ctx.scale(s, s);
    ctx.drawImage(hatPic(name), -h.seat[0], -h.seat[1]);
    ctx.restore();
  }
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
  /* Saying the welcome (owner, 17 Nov 2026): js/app.js draws the named heading as his speech bubble (.hm-say), with
     room kept on its left. He stands in that room, his feet on the date line, the largest of 72 x 96, 64 x 85 or
     48 x 64 px that fits the room and stays under the top bar. When none does, the heading goes back to the plain
     welcome and the places below are tried as before. */
  function say(host) {
    var h = host.querySelector('#rtitle.hm-welcome.hm-say'), d = host.querySelector('.wall-date');
    if (!h || !d) return null;
    var hb = h.getBoundingClientRect(), db = d.getBoundingClientRect(), mb = host.getBoundingClientRect();
    var bar = document.querySelector('.wtop'), roof = bar ? bar.getBoundingClientRect().bottom + 4 : mb.top;
    var left = mb.left + (parseFloat(getComputedStyle(host).paddingLeft) || 0), sizes = [72, 64, 48], i, w, ht;
    for (i = 0; i < sizes.length; i++) {
      w = sizes[i]; ht = w * 4 / 3;
      if (left + w > hb.left - 8 || db.bottom - ht < roof) continue;
      return { w: w, left: left - mb.left, top: db.bottom - ht - mb.top, spot: 'say' };
    }
    return null;
  }
  function plain(host) { var h = host.querySelector('#rtitle.hm-say'); if (h) h.classList.remove('hm-say'); }
  function fit(host) {
    var f;
    room(host, false);
    f = say(host);
    if (f) return f;
    plain(host);
    f = corner(host) || onCard(host);
    if (f || !host.querySelector('#rtitle.hm-welcome')) return f;
    room(host, true);
    f = corner(host);
    if (f) { f.spot = 'room'; return f; }
    room(host, false);
    return null;
  }

  function Mascot(host, id, hat) {
    var self = this, btn = document.createElement('button'), cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    var timer = null, sheets = {}, rests = {}, playing = false, busy = false, frame = 0, clip = '', plays = 0, gone = false, holdTimer = null, io = null, ro = null;
    var wear = HATS[hat] ? hat : '';
    btn.type = 'button'; btn.className = 'mascot'; btn.setAttribute('aria-label', 'Kitchen mascot, play again');
    cv.width = 192; cv.height = 256; btn.appendChild(cv);
    // name: the action whose sheet (frame f) or still (no f) this is, for today's hat
    function paintImg(img, f, name) {
      if (gone || !ctx) return;
      ctx.clearRect(0, 0, 192, 256); ctx.imageSmoothingEnabled = false;
      if (f == null) ctx.drawImage(img, 0, 0, 192, 256); else ctx.drawImage(img, (f % 4) * 192, Math.floor(f / 4) * 256, 192, 256, 0, 0, 192, 256);
      if (wear) hatDraw(ctx, wear, name, f == null ? 8 : f);
      btn.setAttribute('data-frame', f == null ? 'rest' : String(f));
    }
    function stop() { if (timer) clearTimeout(timer); timer = null; }
    function rest() { stop(); playing = false; btn.setAttribute('data-state', 'rest'); if (rests.welcome) paintImg(rests.welcome, null, 'welcome'); }
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
        frame++; paintImg(sheets[clip], frame, clip); tick();
      }, CLIPS[clip][frame]);
    }
    // One pass of today's action. Reduced motion shows its pose for a moment instead (on a tap only).
    function play(name, tapped) {
      if (gone || playing || busy) return;
      if (reduced.matches) {
        if (!tapped) return;
        clearTimeout(holdTimer); still(name, function (i) { if (!i || gone) return; paintImg(i, null, name); btn.setAttribute('data-state', 'still');
          holdTimer = setTimeout(function () { if (!playing) rest(); }, 2000); });
        return;
      }
      if (document.hidden) return;
      busy = true;
      function go(sheet) {
        busy = false; if (gone || !sheet) return;
        sheets[name] = sheet; clip = name; frame = 0; playing = true; plays++; btn.setAttribute('data-state', 'playing'); paintImg(sheet, 0, name); tick();
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
        // no art: Home is the plain welcome, and the next Home draw on this page does not keep his room (artOff)
        if (!i) { artOff = true; self.dispose(); return; }
        artOff = false;
        paintImg(i, null, 'welcome'); btn.setAttribute('data-state', 'rest');
        if (btn.hidden) return;
        var d = today(), r = load(id);
        if (r.day !== d) { r = draw(id, d, r); save(id, r); }
        if (!r.played) play(r.today, false);
      });
    };
    /* A new day, Off, or the clock coming ready changes the hat where he stands. At rest he is drawn again at once;
       in a play the next frame wears it, so a play is never cut or started again. */
    this.wear = function (h) {
      h = HATS[h] ? h : '';
      if (h === wear) return;
      wear = h;
      if (!playing && rests.welcome && btn.getAttribute('data-state') === 'rest') paintImg(rests.welcome, null, 'welcome');
    };
    this.state = function () { return { id: id, clip: clip, frame: frame, playing: playing, plays: plays, scheduled: !!timer, hidden: btn.hidden, mounted: btn.isConnected, rest: btn.getAttribute('data-state'), hat: wear }; };
    this.dispose = function () {
      gone = true; stop(); clearTimeout(holdTimer); if (io) io.disconnect(); if (ro) ro.disconnect();
      document.removeEventListener('visibilitychange', onVis); btn.removeEventListener('click', onTap);
      if (btn.parentNode) btn.parentNode.removeChild(btn); host.classList.remove('mascot-host');
      room(host, false); plain(host);
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

  // person.hat: today's festive hat on Home (since 17 Nov 2026), or none
  function mount(app, person) {
    var host = app.querySelector('#main.wall-main');
    if (!person || !person.id || !host || !host.querySelector('#rtitle.hm-welcome')) { unmount(); return; }
    if (cur && cur.id === person.id && cur.host === host && cur.state().mounted) { cur.place(); cur.wear(person.hat); return; }
    unmount(); cur = new Mascot(host, person.id, person.hat); cur.start();
  }
  function unmount() { if (cur) cur.dispose(); cur = null; }
  window.LK_MASCOT = {
    api: API, mount: mount, unmount: unmount,
    // Since 17 Nov 2026 he can stand beside the welcome and say it (js/app.js asks before drawing the bubble).
    say: 1, artOff: function () { return artOff; },
    // Since 17 Nov 2026 the hats he can wear on Home (mount()'s person.hat).
    hats: Object.keys(HATS),
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
