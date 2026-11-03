/* Ping sounds (3 Nov 2026, head chef). When the pings sheet pops up by itself with a new ping, the phone plays the
   sound the head chef picked in the admin panel (config/main.pingSound, checked against SOUNDS here). Five short
   sounds, made on the phone with Web Audio: no sound files, nothing downloaded or saved, nothing for the security
   header. js/prep.js decides when (noteChime()); this file only knows how each sound goes.

   Browsers let a page make a sound only after someone has touched it, so the first tap or key on the page wakes the
   sound (wake()). A phone nobody has touched since the book opened stays quiet; the sheet still pops up. Between
   sounds it goes back to sleep, so a tablet on the pass does not hold its speaker open all shift. Other sound on the
   phone (music) keeps playing, and a phone on silent stays silent. Read docs/ping-sound.md before changing it. */
(function () {
  'use strict';
  // id, name, what it sounds like (the admin panel shows these). An id is saved in config/main: never rename one.
  var SOUNDS = [
    ['bell', 'Pass bell', 'One ring of the bell on the pass. Clear and short.'],
    ['order', 'Order up', 'Two quick rings of the pass bell. Hard to miss on a loud line.'],
    ['chime', 'Soft chime', 'Two gentle notes going up. Good for a quieter kitchen.'],
    ['marimba', 'Marimba', 'Three warm wooden notes. Friendly, never shrill.'],
    ['timer', 'Oven timer', 'Three short beeps, like a timer going off. The sharpest of the five.']
  ];
  var FIRST = 'bell';   // when nothing (or something unknown) is picked
  var ctx = null, out = null, woke = false, sleepT = 0;
  var taps = 0;   // taps and keys on the page so far: a sound still waiting when one comes is never played (play())

  function has(id) { return SOUNDS.some(function (s) { return s[0] === id; }); }
  function maker() { return window.AudioContext || window.webkitAudioContext || null; }
  // made on the first tap, never before (a page may not start sound by itself)
  function context() {
    if (ctx) return ctx;
    var A = maker();
    if (!A) return null;
    try {
      // a short notification over other sound: music on the phone keeps playing, a phone on silent stays silent (Safari)
      if (navigator.audioSession) { try { navigator.audioSession.type = 'transient'; } catch (e) {} }
      ctx = new A();
      // a gentle limiter, so the notes of a ring never clip on a small phone speaker
      var lim = ctx.createDynamicsCompressor();
      lim.threshold.value = -10; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.002; lim.release.value = 0.2;
      out = ctx.createGain(); out.gain.value = 0.9;
      out.connect(lim); lim.connect(ctx.destination);
    } catch (e) { ctx = null; out = null; }
    return ctx;
  }
  // back to sleep once the last sound has rung out (ms from now: time passing on the phone)
  function sleepSoon(ms) {
    clearTimeout(sleepT);
    sleepT = setTimeout(function () { if (ctx && ctx.state === 'running') { try { ctx.suspend().catch(function () {}); } catch (e) {} } }, ms);
  }
  /* The first tap or key wakes the sound for the rest of the visit: one silent sample from inside the tap (Safari needs
     that), then asleep again. A phone that had a call or locked its screen can come back 'interrupted', which only a
     tap mends, so a tap then wakes it again. */
  function wake() {
    taps++;
    if (woke && (!ctx || ctx.state !== 'interrupted')) return;
    var c = context();
    if (!c) return;
    try { var r = c.resume(); if (r && r.catch) r.catch(function () {}); } catch (e) {}
    try { var s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0); } catch (e) {}
    woke = true;
    sleepSoon(1500);
  }

  /* ---- how each sound goes. t is when it starts (seconds on the sound clock); each returns when it has rung out ---- */
  // one note: a quick rise to peak, then dying away to nothing over d seconds
  function note(c, t, f, peak, a, d, type) {
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + a + d + 0.02);
    return t + a + d;
  }
  // a held beep with soft edges, so it never clicks
  function beep(c, t, f, peak, len) {
    var o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.008);
    g.gain.setValueAtTime(peak, t + len - 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + len + 0.02);
    return t + len;
  }
  // one ring of a pass bell (E6): a bright strike that rings on, with a real bell's slightly out-of-tune partials. The
  // second voice a hair sharp gives the slow shimmer of a struck bell.
  function ring(c, t, v) {
    var end = t;
    [[1, 1, 1.5], [1.0035, 0.45, 1.3], [2.76, 0.3, 0.55], [5.4, 0.12, 0.22], [8.93, 0.05, 0.1]].forEach(function (p) {
      end = Math.max(end, note(c, t, 1318.5 * p[0], 0.38 * v * p[1], 0.002, p[2]));
    });
    return end;
  }
  // a soft bell note: the note, a little of its octave and a touch of the twelfth
  function bellNote(c, t, f) {
    note(c, t, f * 2, 0.05, 0.015, 0.6); note(c, t, f * 3, 0.02, 0.015, 0.3);
    return note(c, t, f, 0.3, 0.015, 1.1);
  }
  // a marimba bar: a round note with a quick knock two octaves up (where a marimba bar's first overtone is tuned)
  function bar(c, t, f) {
    note(c, t, f * 4, 0.08, 0.002, 0.08); note(c, t, f * 9.9, 0.02, 0.002, 0.03);
    return note(c, t, f, 0.35, 0.003, 0.5);
  }
  // levels set so all five are about as loud as each other (loudest 50 ms near -12 dB before the phone's volume)
  var SHAPES = {
    bell: function (c, t) { return ring(c, t, 1); },
    // the second ring lands on the first still ringing, so both are softer: as loud as the others, not twice as loud
    order: function (c, t) { ring(c, t, 0.45); return ring(c, t + 0.17, 0.39); },
    chime: function (c, t) { bellNote(c, t, 784); return bellNote(c, t + 0.26, 1046.5); },   // G5 up to C6
    marimba: function (c, t) { bar(c, t, 784); bar(c, t + 0.12, 987.8); return bar(c, t + 0.24, 1174.7); },   // G, B, D
    timer: function (c, t) { beep(c, t, 1480, 0.29, 0.12); beep(c, t + 0.2, 1480, 0.29, 0.12); return beep(c, t + 0.4, 1480, 0.29, 0.12); }
  };

  /* Plays one sound now. False when it cannot: an unknown sound, no Web Audio, or the sound could not be woken (nobody
     has touched the page yet). A sound that is still waiting when someone taps the page, or once the screen is off,
     is dropped: the browser was holding it back for a tap, so it would ring late. A slow phone still rings (no time
     limit: a limit timed by the phone's clock dropped sounds on a busy phone, and in the tests' fast-forwarded clock). */
  function play(id) {
    if (!has(id)) return false;
    var c = context();
    if (!c) return false;
    function go() {
      if (c.state !== 'running') return;
      var end = SHAPES[id](c, c.currentTime + 0.03);
      sleepSoon(Math.max(0, end - c.currentTime) * 1000 + 400);
    }
    clearTimeout(sleepT);
    var at = taps;
    try {
      // always through resume(): it also waits for a sleep already on its way, so a sound never starts frozen and
      // rings late when the sound wakes next
      var r = c.resume();
      if (!r || !r.then) { go(); return c.state === 'running'; }
      r.then(function () { if (taps === at && document.visibilityState !== 'hidden') go(); }, function () { woke = false; });
    } catch (e) { woke = false; return false; }
    return true;
  }

  ['pointerup', 'touchend', 'mousedown', 'keydown'].forEach(function (k) { document.addEventListener(k, wake, { capture: true, passive: true }); });
  window.LK_CHIME = {
    list: SOUNDS.map(function (s) { return { id: s[0], name: s[1], say: s[2] }; }),
    first: FIRST, has: has, play: play, wake: wake
  };
})();
